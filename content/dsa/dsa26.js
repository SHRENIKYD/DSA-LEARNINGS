(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  // Alternative-language versions of the Java code panes shown by the visualizers (same lines, same highlights).
  var TURN_ALT = {
    python: { code: 'c = ((b.x - a.x) * (c.y - a.y)\n     - (b.y - a.y) * (c.x - a.x))\nif c > 0: turn_left()\nelif c < 0: turn_right()\nelse: go_straight()', map: {} },
    js: { code: 'let c = (b.x - a.x) * (c.y - a.y)\n      - (b.y - a.y) * (c.x - a.x);\nif (c > 0) turnLeft();\nelse if (c < 0) turnRight();\nelse goStraight();', map: {} },
    cpp: { code: 'long long c = (long long)(b.x - a.x) * (c.y - a.y)\n           - (long long)(b.y - a.y) * (c.x - a.x);\nif (c > 0) turnLeft();\nelse if (c < 0) turnRight();\nelse goStraight();', map: {} } };
  var SEG_ALT = {
    python: { code: 'if o1 != o2 and o3 != o4: return True\nif o1 == 0 and in_box(P1, P2, Q1): return True\nif o2 == 0 and in_box(P1, P2, Q2): return True\nif o3 == 0 and in_box(Q1, Q2, P1): return True\nif o4 == 0 and in_box(Q1, Q2, P2): return True\nreturn False', map: {} },
    js: { code: 'if (o1 !== o2 && o3 !== o4) return true;\nif (o1 === 0 && inBox(P1, P2, Q1)) return true;\nif (o2 === 0 && inBox(P1, P2, Q2)) return true;\nif (o3 === 0 && inBox(Q1, Q2, P1)) return true;\nif (o4 === 0 && inBox(Q1, Q2, P2)) return true;\nreturn false;', map: {} },
    cpp: { code: 'if (o1 != o2 && o3 != o4) return true;\nif (o1 == 0 && inBox(P1, P2, Q1)) return true;\nif (o2 == 0 && inBox(P1, P2, Q2)) return true;\nif (o3 == 0 && inBox(Q1, Q2, P1)) return true;\nif (o4 == 0 && inBox(Q1, Q2, P2)) return true;\nreturn false;', map: {} } };
  var RESERVOIR_ALT = {
    python: { code: 'j = random.randint(0, i)\nif j < k: res[j] = item', map: {} },
    js: { code: 'const j = Math.floor(Math.random() * (i + 1));\nif (j < k) res[j] = item;', map: {} },
    cpp: { code: 'int j = rnd() % (i + 1);\nif (j < k) res[j] = item;', map: {} } };

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
      'Coordinates up to <code>10<sup>4</sup></code>–<code>10<sup>9</sup></code> and the word "exact" → integer cross products in 64-bit integers (<code>long</code> / <code>long long</code>).',
      '"<b>Boomerang</b>", "do three points form a valid triangle?" → cross ≠ 0.',
      'Any problem that later needs <b>convex hull, segment intersection, polygon area</b> → you will build on the orientation test, so code it first as a helper.'
    ],
    code: [{ lang: 'java', code: `
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
      }`, alt: [{ lang: 'python', code: `# Orientation toolkit. Python integers never overflow, so coordinates of any size stay exact.
def cross(ox, oy, ax, ay, bx, by):
    # (A - O) x (B - O)
    return (ax - ox) * (by - oy) - (ay - oy) * (bx - ox)

# +1 = counter-clockwise (left turn), -1 = clockwise (right turn), 0 = collinear
def orientation(o, a, b):
    c = cross(o[0], o[1], a[0], a[1], b[0], b[1])
    return (c > 0) - (c < 0)

# Twice the triangle area: stays an exact integer, divide by 2 only when printing.
def twice_triangle_area(a, b, c):
    return abs(cross(a[0], a[1], b[0], b[1], c[0], c[1]))

# Dot product of (A - O) and (B - O): sign tells acute (>0), right (0) or obtuse (<0) angle at O.
def dot(ox, oy, ax, ay, bx, by):
    return (ax - ox) * (bx - ox) + (ay - oy) * (by - oy)

# Is P on the closed segment AB? Collinear AND inside AB's bounding box.
def on_segment(a, b, p):
    if cross(a[0], a[1], b[0], b[1], p[0], p[1]) != 0:
        return False
    return (min(a[0], b[0]) <= p[0] <= max(a[0], b[0])
            and min(a[1], b[1]) <= p[1] <= max(a[1], b[1]))

# Distance from P to the infinite line through A and B = |cross| / |AB| (area / base).
def distance_to_line(a, b, p):
    area2 = abs(cross(a[0], a[1], b[0], b[1], p[0], p[1]))
    base = ((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2) ** 0.5
    return area2 / base` }, { lang: 'js', code: `// Orientation toolkit. A JS Number is exact only up to 2^53 (about 9e15): for coordinates near 1e9
// pass BigInt values instead (every operand must be BigInt; the code below works for both types).
function cross(ox, oy, ax, ay, bx, by) {
  // (A - O) x (B - O)
  return (ax - ox) * (by - oy) - (ay - oy) * (bx - ox);
}

// +1 = counter-clockwise (left turn), -1 = clockwise (right turn), 0 = collinear
function orientation(o, a, b) {
  const c = cross(o[0], o[1], a[0], a[1], b[0], b[1]);
  return (c > 0) - (c < 0);
}

// Twice the triangle area: stays an exact integer, divide by 2 only when printing.
function twiceTriangleArea(a, b, c) {
  const v = cross(a[0], a[1], b[0], b[1], c[0], c[1]);
  return v < 0 ? -v : v;
}

// Dot product of (A - O) and (B - O): sign tells acute (>0), right (0) or obtuse (<0) angle at O.
function dot(ox, oy, ax, ay, bx, by) {
  return (ax - ox) * (bx - ox) + (ay - oy) * (by - oy);
}

// Is P on the closed segment AB? Collinear AND inside AB's bounding box.
function onSegment(a, b, p) {
  if (cross(a[0], a[1], b[0], b[1], p[0], p[1]) != 0) return false;   // != so 0n counts as zero too
  const lo = (u, v) => (u < v ? u : v), hi = (u, v) => (u > v ? u : v);
  return lo(a[0], b[0]) <= p[0] && p[0] <= hi(a[0], b[0])
      && lo(a[1], b[1]) <= p[1] && p[1] <= hi(a[1], b[1]);
}

// Distance from P to the infinite line through A and B = |cross| / |AB| (area / base).
function distanceToLine(a, b, p) {
  const area2 = Math.abs(Number(cross(a[0], a[1], b[0], b[1], p[0], p[1])));
  const base = Math.hypot(Number(b[0] - a[0]), Number(b[1] - a[1]));
  return area2 / base;
}` }, { lang: 'cpp', code: `// Orientation toolkit. All arithmetic in long long: coordinates up to ~1e9 give
// products up to ~4e18, which still fits in a signed 64-bit integer (max ~9.22e18).
// Signed overflow is undefined behaviour in C++, so never go beyond that budget.
typedef long long ll;

ll cross(ll ox, ll oy, ll ax, ll ay, ll bx, ll by) {
    // (A - O) x (B - O)
    return (ax - ox) * (by - oy) - (ay - oy) * (bx - ox);
}

// +1 = counter-clockwise (left turn), -1 = clockwise (right turn), 0 = collinear
int orientation(const array<ll, 2>& o, const array<ll, 2>& a, const array<ll, 2>& b) {
    ll c = cross(o[0], o[1], a[0], a[1], b[0], b[1]);
    return (c > 0) - (c < 0);
}

// Twice the triangle area: stays an exact integer, divide by 2 only when printing.
ll twiceTriangleArea(const array<ll, 2>& a, const array<ll, 2>& b, const array<ll, 2>& c) {
    return llabs(cross(a[0], a[1], b[0], b[1], c[0], c[1]));
}

// Dot product of (A - O) and (B - O): sign tells acute (>0), right (0) or obtuse (<0) angle at O.
ll dot(ll ox, ll oy, ll ax, ll ay, ll bx, ll by) {
    return (ax - ox) * (bx - ox) + (ay - oy) * (by - oy);
}

// Is P on the closed segment AB? Collinear AND inside AB's bounding box.
bool onSegment(const array<ll, 2>& a, const array<ll, 2>& b, const array<ll, 2>& p) {
    if (cross(a[0], a[1], b[0], b[1], p[0], p[1]) != 0) return false;
    return min(a[0], b[0]) <= p[0] && p[0] <= max(a[0], b[0])
        && min(a[1], b[1]) <= p[1] && p[1] <= max(a[1], b[1]);
}

// Distance from P to the infinite line through A and B = |cross| / |AB| (area / base).
double distanceToLine(const array<ll, 2>& a, const array<ll, 2>& b, const array<ll, 2>& p) {
    double area2 = fabs((double)cross(a[0], a[1], b[0], b[1], p[0], p[1]));
    double base = hypot((double)(b[0] - a[0]), (double)(b[1] - a[1]));
    return area2 / base;
}` }, { lang: 'csharp', code: `// Orientation toolkit. All arithmetic in long: coordinates up to ~1e9 give
// products up to ~4e18, which still fits in a signed 64-bit long (max ~9.22e18).
static long Cross(long ox, long oy, long ax, long ay, long bx, long by) {
    // (A - O) x (B - O)
    return (ax - ox) * (by - oy) - (ay - oy) * (bx - ox);
}

// +1 = counter-clockwise (left turn), -1 = clockwise (right turn), 0 = collinear
static int Orientation(long[] o, long[] a, long[] b) {
    return Math.Sign(Cross(o[0], o[1], a[0], a[1], b[0], b[1]));
}

// Twice the triangle area: stays an exact integer, divide by 2 only when printing.
static long TwiceTriangleArea(long[] a, long[] b, long[] c) {
    return Math.Abs(Cross(a[0], a[1], b[0], b[1], c[0], c[1]));
}

// Dot product of (A - O) and (B - O): sign tells acute (>0), right (0) or obtuse (<0) angle at O.
static long Dot(long ox, long oy, long ax, long ay, long bx, long by) {
    return (ax - ox) * (bx - ox) + (ay - oy) * (by - oy);
}

// Is P on the closed segment AB? Collinear AND inside AB's bounding box.
static bool OnSegment(long[] a, long[] b, long[] p) {
    if (Cross(a[0], a[1], b[0], b[1], p[0], p[1]) != 0) return false;
    return Math.Min(a[0], b[0]) <= p[0] && p[0] <= Math.Max(a[0], b[0])
        && Math.Min(a[1], b[1]) <= p[1] && p[1] <= Math.Max(a[1], b[1]);
}

// Distance from P to the infinite line through A and B = |cross| / |AB| (area / base).
static double DistanceToLine(long[] a, long[] b, long[] p) {
    double area2 = Math.Abs((double)Cross(a[0], a[1], b[0], b[1], p[0], p[1]));
    double dx = b[0] - a[0], dy = b[1] - a[1];
    return area2 / Math.Sqrt(dx * dx + dy * dy);
}` }] }, { lang: 'python', run: true, code: `def cross(o, a, b):
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
    print(o, a, b, "cross =", c, "->", turn(o, a, b), "| triangle area =", abs(c) / 2)`, alt: [{ lang: 'js', run: true, code: `function cross(o, a, b) {
  // (A - O) x (B - O): > 0 left turn, < 0 right turn, 0 straight.
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

function turn(o, a, b) {
  const c = cross(o, a, b);
  if (c > 0) return 'LEFT  (counter-clockwise)';
  if (c < 0) return 'RIGHT (clockwise)';
  return 'STRAIGHT (collinear)';
}

const cases = [[[0, 0], [4, 0], [2, 3]],
               [[0, 0], [4, 0], [6, -2]],
               [[1, 1], [2, 2], [5, 5]],
               [[0, 0], [0, 5], [0, -3]]];   // vertical line: slopes would divide by zero
for (const [o, a, b] of cases) {
  const c = cross(o, a, b);
  console.log(\`(\${o}) (\${a}) (\${b}) cross = \${c} -> \${turn(o, a, b)} | triangle area = \${Math.abs(c) / 2}\`);
}` }, { lang: 'cpp', code: `#include <bits/stdc++.h>
using namespace std;
typedef array<long long, 2> P;

long long cross(const P& o, const P& a, const P& b) {
    // (A - O) x (B - O): > 0 left turn, < 0 right turn, 0 straight.
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

string turn(const P& o, const P& a, const P& b) {
    long long c = cross(o, a, b);
    if (c > 0) return "LEFT  (counter-clockwise)";
    if (c < 0) return "RIGHT (clockwise)";
    return "STRAIGHT (collinear)";
}

int main() {
    vector<array<P, 3>> cases = {{P{0, 0}, P{4, 0}, P{2, 3}},
                                 {P{0, 0}, P{4, 0}, P{6, -2}},
                                 {P{1, 1}, P{2, 2}, P{5, 5}},
                                 {P{0, 0}, P{0, 5}, P{0, -3}}};   // vertical line: slopes would divide by zero
    for (auto& [o, a, b] : cases) {
        long long c = cross(o, a, b);
        cout << "(" << o[0] << ", " << o[1] << ") (" << a[0] << ", " << a[1] << ") (" << b[0] << ", " << b[1]
             << ") cross = " << c << " -> " << turn(o, a, b) << " | triangle area = " << llabs(c) / 2.0 << endl;
    }
}` }, { lang: 'csharp', code: `using System;

class Program {
    // (A - O) x (B - O): > 0 left turn, < 0 right turn, 0 straight.
    static long Cross(long[] o, long[] a, long[] b) {
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    }

    static string Turn(long[] o, long[] a, long[] b) {
        long c = Cross(o, a, b);
        if (c > 0) return "LEFT  (counter-clockwise)";
        if (c < 0) return "RIGHT (clockwise)";
        return "STRAIGHT (collinear)";
    }

    static string P(long[] p) { return "(" + p[0] + ", " + p[1] + ")"; }

    static void Main() {
        long[][][] cases = {
            new[] { new long[] {0, 0}, new long[] {4, 0}, new long[] {2, 3} },
            new[] { new long[] {0, 0}, new long[] {4, 0}, new long[] {6, -2} },
            new[] { new long[] {1, 1}, new long[] {2, 2}, new long[] {5, 5} },
            new[] { new long[] {0, 0}, new long[] {0, 5}, new long[] {0, -3} }   // vertical line: slopes would divide by zero
        };
        foreach (var t in cases) {
            long c = Cross(t[0], t[1], t[2]);
            Console.WriteLine(P(t[0]) + " " + P(t[1]) + " " + P(t[2]) + " cross = " + c + " -> " + Turn(t[0], t[1], t[2]) + " | triangle area = " + Math.Abs(c) / 2.0);
        }
    }
}`, run: true }, { lang: 'java', code: `public class Main {
    static long cross(long[] o, long[] a, long[] b) {
        // (A - O) x (B - O): > 0 left turn, < 0 right turn, 0 straight.
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    }

    static String turn(long[] o, long[] a, long[] b) {
        long c = cross(o, a, b);
        if (c > 0) return "LEFT  (counter-clockwise)";
        if (c < 0) return "RIGHT (clockwise)";
        return "STRAIGHT (collinear)";
    }

    public static void main(String[] args) {
        long[][][] cases = {{{0, 0}, {4, 0}, {2, 3}},
                            {{0, 0}, {4, 0}, {6, -2}},
                            {{1, 1}, {2, 2}, {5, 5}},
                            {{0, 0}, {0, 5}, {0, -3}}};   // vertical line: slopes would divide by zero
        for (long[][] t : cases) {
            long c = cross(t[0], t[1], t[2]);
            System.out.println(Arrays.toString(t[0]) + " " + Arrays.toString(t[1]) + " " + Arrays.toString(t[2])
                + " cross = " + c + " -> " + turn(t[0], t[1], t[2]) + " | triangle area = " + Math.abs(c) / 2.0);
        }
    }
}` }] }],
    codeTitle: ['Orientation toolkit', 'Turn detector (runnable)'],
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
              { type: 'code', lang: 'java', label: 'line running', code: 'long c = (b.x - a.x) * (c.y - a.y)\n       - (b.y - a.y) * (c.x - a.x);\nif (c > 0) turnLeft();\nelse if (c < 0) turnRight();\nelse goStraight();', hl: c > 0 ? { 3: 'ok' } : c < 0 ? { 4: 'bad' } : { 5: 'cur' }, alt: TURN_ALT }]
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
      { title: 'Why slopes are a trap: a vertical line', html: `<p>Points (0,0), (0,5), (0,−3). Slopes: <code>(5−0)/(0−0)</code> → division by zero (floating-point division gives <code>Infinity</code>; integer division throws or crashes). Cross product: <code>(0−0)·(−3−0) − (5−0)·(0−0) = 0 − 0 = 0</code> → collinear, no special case needed.</p>
        ${H.table(['method', 'vertical line', 'huge coordinates', 'verdict'], [['slope a/b == c/d (double)', H.c('r', 'divide by 0'), H.c('r', 'rounding errors'), 'fragile'], ['cross product (long)', H.c('g', 'works'), H.c('g', 'exact up to ~1e9'), 'use this']])}` },
      { title: 'Triangle area without Heron', html: `<p>A = (1,1), B = (5,2), C = (2,6). u = (4,1), v = (1,5). cross = 4·5 − 1·1 = <b>19</b>. Area = 19/2 = <b>9.5</b>. Heron would need three square roots for side lengths and another root for the area — four chances for rounding error. The cross product needs two multiplications.</p>`, code: { lang: 'java', code: `long[] a = {1, 1}, b = {5, 2}, c = {2, 6};
long twice = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
System.out.println(twice / 2.0);   // 9.5`, alt: [{ lang: 'python', code: `a, b, c = (1, 1), (5, 2), (2, 6)
twice = abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]))
print(twice / 2)   # 9.5` }, { lang: 'js', code: `const a = [1, 1], b = [5, 2], c = [2, 6];
const twice = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
console.log(twice / 2);   // 9.5` }, { lang: 'cpp', code: `long long a[] = {1, 1}, b[] = {5, 2}, c[] = {2, 6};
long long twice = llabs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
cout << twice / 2.0 << endl;   // 9.5` }, { lang: 'csharp', code: `long[] a = { 1, 1 }, b = { 5, 2 }, c = { 2, 6 };
long twice = Math.Abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
Console.WriteLine(twice / 2.0);   // 9.5` }] } },
      { title: 'Which side of the fence is the cow on?', html: `<p>A straight fence runs from F1 = (0,0) to F2 = (10,10). Cow at (2,7): cross = 10·7 − 10·2 = 50 &gt; 0 → <span class="c-g">left side</span>. Cow at (8,3): 10·3 − 10·8 = −50 → <span class="c-r">right side</span>. Two cows are on the same side exactly when their cross products have the same sign — this is the core of segment intersection (Topic 2).</p>` },
      { title: 'Distance from a point to a line', html: `<p>Line through A=(0,0), B=(3,4) (length 5). P = (4,0). |cross| = |3·0 − 4·4| = 16 = parallelogram area. Height = area ÷ base = 16 / 5 = <b>3.2</b>. Same formula gives the distance to a segment when the projection lands inside it (check with two dot products), otherwise take the distance to the nearer endpoint.</p>` },
      { title: 'Acute or obtuse? Use the dot product', html: `<p>At O=(0,0) with A=(3,1) and B=(−1,2): dot = 3·(−1) + 1·2 = −1 &lt; 0 → the angle AOB is <b>obtuse</b> (over 90°). With B = (1,3): dot = 3 + 3 = 6 &gt; 0 → acute. Dot = 0 means a perfect right angle — handy for "is this a rectangle / right triangle?" questions.</p>` }
    ],
    deepDive: `<p><b>Where the formula comes from.</b> In 3D, <code>u × v</code> is a vector perpendicular to both; for vectors lying flat in the xy-plane it points straight up or straight down, and its z-component is exactly <code>u.x·v.y − u.y·v.x</code>. Up (positive) = counter-clockwise by the right-hand rule. It is also the 2×2 determinant <code>|u.x u.y; v.x v.y|</code>, i.e. the signed area of the parallelogram — which is why the same number gives orientation <i>and</i> area.</p>
      <p><b>Overflow budget.</b> With coordinates in <code>[−10<sup>9</sup>, 10<sup>9</sup>]</code> the differences reach <code>2·10<sup>9</sup></code>, each product <code>4·10<sup>18</sup></code>, and the difference of two products up to <code>8·10<sup>18</sup></code> — just under the signed 64-bit maximum <code>≈ 9.22·10<sup>18</sup></code> (<code>Long.MAX_VALUE</code> in Java, <code>LLONG_MAX</code> in C++). One more multiplication (for example comparing two cross products by multiplying them) overflows; compare <b>signs</b> instead (<code>Long.signum(a) != Long.signum(b)</code> in Java; <code>(a &gt; 0) != (b &gt; 0)</code> style checks elsewhere), or use wider integers: <code>BigInteger</code> / <code>Math.multiplyHigh</code> in Java, <code>__int128</code> in C++. Python integers and JavaScript <code>BigInt</code> never overflow.</p>
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
        code: { lang: 'java', code: `class Solution {
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
}`, alt: [{ lang: 'python', code: String.raw`
class Solution:
    # Brute force: every triple must be collinear. O(N^3).
    def check_straight_line(self, coordinates):
        p = coordinates
        n = len(p)
        for i in range(n):
            for j in range(i + 1, n):
                for k in range(j + 1, n):
                    c = (p[j][0] - p[i][0]) * (p[k][1] - p[i][1]) \
                        - (p[j][1] - p[i][1]) * (p[k][0] - p[i][0])
                    if c != 0:
                        return False                  # this triple bends
        return True` }, { lang: 'js', code: String.raw`
// Brute force: every triple must be collinear. O(N^3).
function checkStraightLine(p) {
  const n = p.length;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      for (let k = j + 1; k < n; k++) {
        const c = (p[j][0] - p[i][0]) * (p[k][1] - p[i][1])
                - (p[j][1] - p[i][1]) * (p[k][0] - p[i][0]);
        if (c !== 0) return false;                    // this triple bends
      }
  return true;
}` }, { lang: 'cpp', code: String.raw`
class Solution {
public:
    // Brute force: every triple must be collinear. O(N^3).
    bool checkStraightLine(const vector<vector<int>>& p) {
        int n = p.size();
        for (int i = 0; i < n; i++)
            for (int j = i + 1; j < n; j++)
                for (int k = j + 1; k < n; k++) {
                    long long c = (long long)(p[j][0] - p[i][0]) * (p[k][1] - p[i][1])
                                - (long long)(p[j][1] - p[i][1]) * (p[k][0] - p[i][0]);
                    if (c != 0) return false;         // this triple bends
                }
        return true;
    }
};` }, { lang: 'csharp', code: `public class Solution {
    // Brute force: every triple must be collinear. O(N^3).
    public bool CheckStraightLine(int[][] p) {
        int n = p.Length;
        for (int i = 0; i < n; i++)
            for (int j = i + 1; j < n; j++)
                for (int k = j + 1; k < n; k++) {
                    long c = (long)(p[j][0] - p[i][0]) * (p[k][1] - p[i][1])
                           - (long)(p[j][1] - p[i][1]) * (p[k][0] - p[i][0]);
                    if (c != 0) return false;   // this triple bends
                }
        return true;
    }
}` }] }
      },
      mcq: { q: 'Points (2,1), (2,5), (2,9). A slope-based solution computes (5−1)/(2−2). What should you do instead?', options: ['Catch the ArithmeticException and return true', 'Compute cross((2,1),(2,5),(2,9)) = 0·8 − 4·0 = 0 → collinear', 'Use Double.compare on slopes', 'Sort the points first'], answer: 1, explain: 'The cross product needs no division, so vertical lines are not special. It equals 0 here, so the points are collinear.' },
      hints: [
        `<p>Hint 1: Two distinct points already define the line. Every other point only needs to be compared against <b>those two</b>.</p>`,
        `<p>Hint 2: "Point P is on line AB" ⇔ <code>cross(A, B, P) = (B−A)×(P−A) = 0</code>. No division, so no vertical-line special case.</p>`,
        `<p>Hint 3: Recipe — let A = p[0], d = p[1] − p[0]. For i = 2..N−1: e = p[i] − A; if <code>d.x·e.y − d.y·e.x ≠ 0</code> return false. Return true. With N = 2 the loop never runs → true. Use 64-bit integers (<code>long</code> / <code>long long</code>) for safety.</p>`
      ],
      tests: {
        sig: 'int[][] -> bool',
        fn: 'checkStraightLine',
        cases: [
          [[[[1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]]], true],
          [[[[1, 1], [2, 2], [3, 4], [4, 5]]], false],
          [[[[0, 0], [1, 1]]], true],
          [[[[2, 1], [2, -5], [2, 9], [2, 0]]], true],
          [[[[-3, 4], [0, 4], [5, 4], [9, 5]]], false],
          [[[[-10000, -10000], [10000, 10000], [0, 0], [5000, 5000]]], true],
          [[[[-10000, -10000], [10000, 10000], [0, 1]]], false],
          [[[[0, 0], [3, 5], [6, 10], [-3, -5]]], true],
          [[[[0, 0], [10000, 9999], [-10000, -9999]]], true],
          [[[[0, 0], [10000, 9999], [-10000, -9998]]], false],
          [[[[10000, -10000], [-10000, 10000], [0, 0], [1, -1], [-9999, 9999]]], true],
          [[[[5, 5], [6, 5]]], true],
          [
            [
              [
                [-500, -3503], [-499, -3496], [-498, -3489], [-497, -3482], [-496, -3475], [-495, -3468],
                [-494, -3461], [-493, -3454], [-492, -3447], [-491, -3440], [-490, -3433], [-489, -3426],
                [-488, -3419], [-487, -3412], [-486, -3405], [-485, -3398], [-484, -3391], [-483, -3384],
                [-482, -3377], [-481, -3370], [-480, -3363], [-479, -3356], [-478, -3349], [-477, -3342],
                [-476, -3335], [-475, -3328], [-474, -3321], [-473, -3314], [-472, -3307], [-471, -3300],
                [-470, -3293], [-469, -3286], [-468, -3279], [-467, -3272], [-466, -3265], [-465, -3258],
                [-464, -3251], [-463, -3244], [-462, -3237], [-461, -3230], [-460, -3223], [-459, -3216],
                [-458, -3209], [-457, -3202], [-456, -3195], [-455, -3188], [-454, -3181], [-453, -3174],
                [-452, -3167], [-451, -3160], [-450, -3153], [-449, -3146], [-448, -3139], [-447, -3132],
                [-446, -3125], [-445, -3118], [-444, -3111], [-443, -3104], [-442, -3097], [-441, -3090],
                [-440, -3083], [-439, -3076], [-438, -3069], [-437, -3062], [-436, -3055], [-435, -3048],
                [-434, -3041], [-433, -3034], [-432, -3027], [-431, -3020], [-430, -3013], [-429, -3006],
                [-428, -2999], [-427, -2992], [-426, -2985], [-425, -2978], [-424, -2971], [-423, -2964],
                [-422, -2957], [-421, -2950], [-420, -2943], [-419, -2936], [-418, -2929], [-417, -2922],
                [-416, -2915], [-415, -2908], [-414, -2901], [-413, -2894], [-412, -2887], [-411, -2880],
                [-410, -2873], [-409, -2866], [-408, -2859], [-407, -2852], [-406, -2845], [-405, -2838],
                [-404, -2831], [-403, -2824], [-402, -2817], [-401, -2810], [-400, -2803], [-399, -2796],
                [-398, -2789], [-397, -2782], [-396, -2775], [-395, -2768], [-394, -2761], [-393, -2754],
                [-392, -2747], [-391, -2740], [-390, -2733], [-389, -2726], [-388, -2719], [-387, -2712],
                [-386, -2705], [-385, -2698], [-384, -2691], [-383, -2684], [-382, -2677], [-381, -2670],
                [-380, -2663], [-379, -2656], [-378, -2649], [-377, -2642], [-376, -2635], [-375, -2628],
                [-374, -2621], [-373, -2614], [-372, -2607], [-371, -2600], [-370, -2593], [-369, -2586],
                [-368, -2579], [-367, -2572], [-366, -2565], [-365, -2558], [-364, -2551], [-363, -2544],
                [-362, -2537], [-361, -2530], [-360, -2523], [-359, -2516], [-358, -2509], [-357, -2502],
                [-356, -2495], [-355, -2488], [-354, -2481], [-353, -2474], [-352, -2467], [-351, -2460],
                [-350, -2453], [-349, -2446], [-348, -2439], [-347, -2432], [-346, -2425], [-345, -2418],
                [-344, -2411], [-343, -2404], [-342, -2397], [-341, -2390], [-340, -2383], [-339, -2376],
                [-338, -2369], [-337, -2362], [-336, -2355], [-335, -2348], [-334, -2341], [-333, -2334],
                [-332, -2327], [-331, -2320], [-330, -2313], [-329, -2306], [-328, -2299], [-327, -2292],
                [-326, -2285], [-325, -2278], [-324, -2271], [-323, -2264], [-322, -2257], [-321, -2250],
                [-320, -2243], [-319, -2236], [-318, -2229], [-317, -2222], [-316, -2215], [-315, -2208],
                [-314, -2201], [-313, -2194], [-312, -2187], [-311, -2180], [-310, -2173], [-309, -2166],
                [-308, -2159], [-307, -2152], [-306, -2145], [-305, -2138], [-304, -2131], [-303, -2124],
                [-302, -2117], [-301, -2110], [-300, -2103], [-299, -2096], [-298, -2089], [-297, -2082],
                [-296, -2075], [-295, -2068], [-294, -2061], [-293, -2054], [-292, -2047], [-291, -2040],
                [-290, -2033], [-289, -2026], [-288, -2019], [-287, -2012], [-286, -2005], [-285, -1998],
                [-284, -1991], [-283, -1984], [-282, -1977], [-281, -1970], [-280, -1963], [-279, -1956],
                [-278, -1949], [-277, -1942], [-276, -1935], [-275, -1928], [-274, -1921], [-273, -1914],
                [-272, -1907], [-271, -1900], [-270, -1893], [-269, -1886], [-268, -1879], [-267, -1872],
                [-266, -1865], [-265, -1858], [-264, -1851], [-263, -1844], [-262, -1837], [-261, -1830],
                [-260, -1823], [-259, -1816], [-258, -1809], [-257, -1802], [-256, -1795], [-255, -1788],
                [-254, -1781], [-253, -1774], [-252, -1767], [-251, -1760], [-250, -1753], [-249, -1746],
                [-248, -1739], [-247, -1732], [-246, -1725], [-245, -1718], [-244, -1711], [-243, -1704],
                [-242, -1697], [-241, -1690], [-240, -1683], [-239, -1676], [-238, -1669], [-237, -1662],
                [-236, -1655], [-235, -1648], [-234, -1641], [-233, -1634], [-232, -1627], [-231, -1620],
                [-230, -1613], [-229, -1606], [-228, -1599], [-227, -1592], [-226, -1585], [-225, -1578],
                [-224, -1571], [-223, -1564], [-222, -1557], [-221, -1550], [-220, -1543], [-219, -1536],
                [-218, -1529], [-217, -1522], [-216, -1515], [-215, -1508], [-214, -1501], [-213, -1494],
                [-212, -1487], [-211, -1480], [-210, -1473], [-209, -1466], [-208, -1459], [-207, -1452],
                [-206, -1445], [-205, -1438], [-204, -1431], [-203, -1424], [-202, -1417], [-201, -1410],
                [-200, -1403], [-199, -1396], [-198, -1389], [-197, -1382], [-196, -1375], [-195, -1368],
                [-194, -1361], [-193, -1354], [-192, -1347], [-191, -1340], [-190, -1333], [-189, -1326],
                [-188, -1319], [-187, -1312], [-186, -1305], [-185, -1298], [-184, -1291], [-183, -1284],
                [-182, -1277], [-181, -1270], [-180, -1263], [-179, -1256], [-178, -1249], [-177, -1242],
                [-176, -1235], [-175, -1228], [-174, -1221], [-173, -1214], [-172, -1207], [-171, -1200],
                [-170, -1193], [-169, -1186], [-168, -1179], [-167, -1172], [-166, -1165], [-165, -1158],
                [-164, -1151], [-163, -1144], [-162, -1137], [-161, -1130], [-160, -1123], [-159, -1116],
                [-158, -1109], [-157, -1102], [-156, -1095], [-155, -1088], [-154, -1081], [-153, -1074],
                [-152, -1067], [-151, -1060], [-150, -1053], [-149, -1046], [-148, -1039], [-147, -1032],
                [-146, -1025], [-145, -1018], [-144, -1011], [-143, -1004], [-142, -997], [-141, -990], [-140, -983],
                [-139, -976], [-138, -969], [-137, -962], [-136, -955], [-135, -948], [-134, -941], [-133, -934],
                [-132, -927], [-131, -920], [-130, -913], [-129, -906], [-128, -899], [-127, -892], [-126, -885],
                [-125, -878], [-124, -871], [-123, -864], [-122, -857], [-121, -850], [-120, -843], [-119, -836],
                [-118, -829], [-117, -822], [-116, -815], [-115, -808], [-114, -801], [-113, -794], [-112, -787],
                [-111, -780], [-110, -773], [-109, -766], [-108, -759], [-107, -752], [-106, -745], [-105, -738],
                [-104, -731], [-103, -724], [-102, -717], [-101, -710], [-100, -703], [-99, -696], [-98, -689],
                [-97, -682], [-96, -675], [-95, -668], [-94, -661], [-93, -654], [-92, -647], [-91, -640],
                [-90, -633], [-89, -626], [-88, -619], [-87, -612], [-86, -605], [-85, -598], [-84, -591],
                [-83, -584], [-82, -577], [-81, -570], [-80, -563], [-79, -556], [-78, -549], [-77, -542],
                [-76, -535], [-75, -528], [-74, -521], [-73, -514], [-72, -507], [-71, -500], [-70, -493],
                [-69, -486], [-68, -479], [-67, -472], [-66, -465], [-65, -458], [-64, -451], [-63, -444],
                [-62, -437], [-61, -430], [-60, -423], [-59, -416], [-58, -409], [-57, -402], [-56, -395],
                [-55, -388], [-54, -381], [-53, -374], [-52, -367], [-51, -360], [-50, -353], [-49, -346],
                [-48, -339], [-47, -332], [-46, -325], [-45, -318], [-44, -311], [-43, -304], [-42, -297],
                [-41, -290], [-40, -283], [-39, -276], [-38, -269], [-37, -262], [-36, -255], [-35, -248],
                [-34, -241], [-33, -234], [-32, -227], [-31, -220], [-30, -213], [-29, -206], [-28, -199],
                [-27, -192], [-26, -185], [-25, -178], [-24, -171], [-23, -164], [-22, -157], [-21, -150],
                [-20, -143], [-19, -136], [-18, -129], [-17, -122], [-16, -115], [-15, -108], [-14, -101],
                [-13, -94], [-12, -87], [-11, -80], [-10, -73], [-9, -66], [-8, -59], [-7, -52], [-6, -45],
                [-5, -38], [-4, -31], [-3, -24], [-2, -17], [-1, -10], [0, -3], [1, 4], [2, 11], [3, 18], [4, 25],
                [5, 32], [6, 39], [7, 46], [8, 53], [9, 60], [10, 67], [11, 74], [12, 81], [13, 88], [14, 95],
                [15, 102], [16, 109], [17, 116], [18, 123], [19, 130], [20, 137], [21, 144], [22, 151], [23, 158],
                [24, 165], [25, 172], [26, 179], [27, 186], [28, 193], [29, 200], [30, 207], [31, 214], [32, 221],
                [33, 228], [34, 235], [35, 242], [36, 249], [37, 256], [38, 263], [39, 270], [40, 277], [41, 284],
                [42, 291], [43, 298], [44, 305], [45, 312], [46, 319], [47, 326], [48, 333], [49, 340], [50, 347],
                [51, 354], [52, 361], [53, 368], [54, 375], [55, 382], [56, 389], [57, 396], [58, 403], [59, 410],
                [60, 417], [61, 424], [62, 431], [63, 438], [64, 445], [65, 452], [66, 459], [67, 466], [68, 473],
                [69, 480], [70, 487], [71, 494], [72, 501], [73, 508], [74, 515], [75, 522], [76, 529], [77, 536],
                [78, 543], [79, 550], [80, 557], [81, 564], [82, 571], [83, 578], [84, 585], [85, 592], [86, 599],
                [87, 606], [88, 613], [89, 620], [90, 627], [91, 634], [92, 641], [93, 648], [94, 655], [95, 662],
                [96, 669], [97, 676], [98, 683], [99, 690], [100, 697], [101, 704], [102, 711], [103, 718],
                [104, 725], [105, 732], [106, 739], [107, 746], [108, 753], [109, 760], [110, 767], [111, 774],
                [112, 781], [113, 788], [114, 795], [115, 802], [116, 809], [117, 816], [118, 823], [119, 830],
                [120, 837], [121, 844], [122, 851], [123, 858], [124, 865], [125, 872], [126, 879], [127, 886],
                [128, 893], [129, 900], [130, 907], [131, 914], [132, 921], [133, 928], [134, 935], [135, 942],
                [136, 949], [137, 956], [138, 963], [139, 970], [140, 977], [141, 984], [142, 991], [143, 998],
                [144, 1005], [145, 1012], [146, 1019], [147, 1026], [148, 1033], [149, 1040], [150, 1047],
                [151, 1054], [152, 1061], [153, 1068], [154, 1075], [155, 1082], [156, 1089], [157, 1096],
                [158, 1103], [159, 1110], [160, 1117], [161, 1124], [162, 1131], [163, 1138], [164, 1145],
                [165, 1152], [166, 1159], [167, 1166], [168, 1173], [169, 1180], [170, 1187], [171, 1194],
                [172, 1201], [173, 1208], [174, 1215], [175, 1222], [176, 1229], [177, 1236], [178, 1243],
                [179, 1250], [180, 1257], [181, 1264], [182, 1271], [183, 1278], [184, 1285], [185, 1292],
                [186, 1299], [187, 1306], [188, 1313], [189, 1320], [190, 1327], [191, 1334], [192, 1341],
                [193, 1348], [194, 1355], [195, 1362], [196, 1369], [197, 1376], [198, 1383], [199, 1390],
                [200, 1397], [201, 1404], [202, 1411], [203, 1418], [204, 1425], [205, 1432], [206, 1439],
                [207, 1446], [208, 1453], [209, 1460], [210, 1467], [211, 1474], [212, 1481], [213, 1488],
                [214, 1495], [215, 1502], [216, 1509], [217, 1516], [218, 1523], [219, 1530], [220, 1537],
                [221, 1544], [222, 1551], [223, 1558], [224, 1565], [225, 1572], [226, 1579], [227, 1586],
                [228, 1593], [229, 1600], [230, 1607], [231, 1614], [232, 1621], [233, 1628], [234, 1635],
                [235, 1642], [236, 1649], [237, 1656], [238, 1663], [239, 1670], [240, 1677], [241, 1684],
                [242, 1691], [243, 1698], [244, 1705], [245, 1712], [246, 1719], [247, 1726], [248, 1733],
                [249, 1740], [250, 1747], [251, 1754], [252, 1761], [253, 1768], [254, 1775], [255, 1782],
                [256, 1789], [257, 1796], [258, 1803], [259, 1810], [260, 1817], [261, 1824], [262, 1831],
                [263, 1838], [264, 1845], [265, 1852], [266, 1859], [267, 1866], [268, 1873], [269, 1880],
                [270, 1887], [271, 1894], [272, 1901], [273, 1908], [274, 1915], [275, 1922], [276, 1929],
                [277, 1936], [278, 1943], [279, 1950], [280, 1957], [281, 1964], [282, 1971], [283, 1978],
                [284, 1985], [285, 1992], [286, 1999], [287, 2006], [288, 2013], [289, 2020], [290, 2027],
                [291, 2034], [292, 2041], [293, 2048], [294, 2055], [295, 2062], [296, 2069], [297, 2076],
                [298, 2083], [299, 2090], [300, 2097], [301, 2104], [302, 2111], [303, 2118], [304, 2125],
                [305, 2132], [306, 2139], [307, 2146], [308, 2153], [309, 2160], [310, 2167], [311, 2174],
                [312, 2181], [313, 2188], [314, 2195], [315, 2202], [316, 2209], [317, 2216], [318, 2223],
                [319, 2230], [320, 2237], [321, 2244], [322, 2251], [323, 2258], [324, 2265], [325, 2272],
                [326, 2279], [327, 2286], [328, 2293], [329, 2300], [330, 2307], [331, 2314], [332, 2321],
                [333, 2328], [334, 2335], [335, 2342], [336, 2349], [337, 2356], [338, 2363], [339, 2370],
                [340, 2377], [341, 2384], [342, 2391], [343, 2398], [344, 2405], [345, 2412], [346, 2419],
                [347, 2426], [348, 2433], [349, 2440], [350, 2447], [351, 2454], [352, 2461], [353, 2468],
                [354, 2475], [355, 2482], [356, 2489], [357, 2496], [358, 2503], [359, 2510], [360, 2517],
                [361, 2524], [362, 2531], [363, 2538], [364, 2545], [365, 2552], [366, 2559], [367, 2566],
                [368, 2573], [369, 2580], [370, 2587], [371, 2594], [372, 2601], [373, 2608], [374, 2615],
                [375, 2622], [376, 2629], [377, 2636], [378, 2643], [379, 2650], [380, 2657], [381, 2664],
                [382, 2671], [383, 2678], [384, 2685], [385, 2692], [386, 2699], [387, 2706], [388, 2713],
                [389, 2720], [390, 2727], [391, 2734], [392, 2741], [393, 2748], [394, 2755], [395, 2762],
                [396, 2769], [397, 2776], [398, 2783], [399, 2790], [400, 2797], [401, 2804], [402, 2811],
                [403, 2818], [404, 2825], [405, 2832], [406, 2839], [407, 2846], [408, 2853], [409, 2860],
                [410, 2867], [411, 2874], [412, 2881], [413, 2888], [414, 2895], [415, 2902], [416, 2909],
                [417, 2916], [418, 2923], [419, 2930], [420, 2937], [421, 2944], [422, 2951], [423, 2958],
                [424, 2965], [425, 2972], [426, 2979], [427, 2986], [428, 2993], [429, 3000], [430, 3007],
                [431, 3014], [432, 3021], [433, 3028], [434, 3035], [435, 3042], [436, 3049], [437, 3056],
                [438, 3063], [439, 3070], [440, 3077], [441, 3084], [442, 3091], [443, 3098], [444, 3105],
                [445, 3112], [446, 3119], [447, 3126], [448, 3133], [449, 3140], [450, 3147], [451, 3154],
                [452, 3161], [453, 3168], [454, 3175], [455, 3182], [456, 3189], [457, 3196], [458, 3203],
                [459, 3210], [460, 3217], [461, 3224], [462, 3231], [463, 3238], [464, 3245], [465, 3252],
                [466, 3259], [467, 3266], [468, 3273], [469, 3280], [470, 3287], [471, 3294], [472, 3301],
                [473, 3308], [474, 3315], [475, 3322], [476, 3329], [477, 3336], [478, 3343], [479, 3350],
                [480, 3357], [481, 3364], [482, 3371], [483, 3378], [484, 3385], [485, 3392], [486, 3399],
                [487, 3406], [488, 3413], [489, 3420], [490, 3427], [491, 3434], [492, 3441], [493, 3448],
                [494, 3455], [495, 3462], [496, 3469], [497, 3476], [498, 3483], [499, 3490]
              ]
            ],
            true
          ],
          [
            [
              [
                [-150, -1053], [-149, -1046], [-148, -1039], [-147, -1032], [-146, -1025], [-145, -1018],
                [-144, -1011], [-143, -1004], [-142, -997], [-141, -990], [-140, -983], [-139, -976], [-138, -969],
                [-137, -962], [-136, -955], [-135, -948], [-134, -941], [-133, -934], [-132, -927], [-131, -920],
                [-130, -913], [-129, -906], [-128, -899], [-127, -892], [-126, -885], [-125, -878], [-124, -871],
                [-123, -864], [-122, -857], [-121, -850], [-120, -843], [-119, -836], [-118, -829], [-117, -822],
                [-116, -815], [-115, -808], [-114, -801], [-113, -794], [-112, -787], [-111, -780], [-110, -773],
                [-109, -766], [-108, -759], [-107, -752], [-106, -745], [-105, -738], [-104, -731], [-103, -724],
                [-102, -717], [-101, -710], [-100, -703], [-99, -696], [-98, -689], [-97, -682], [-96, -675],
                [-95, -668], [-94, -661], [-93, -654], [-92, -647], [-91, -640], [-90, -633], [-89, -626],
                [-88, -619], [-87, -612], [-86, -605], [-85, -598], [-84, -591], [-83, -584], [-82, -577],
                [-81, -570], [-80, -563], [-79, -556], [-78, -549], [-77, -542], [-76, -535], [-75, -528],
                [-74, -521], [-73, -514], [-72, -507], [-71, -500], [-70, -493], [-69, -486], [-68, -479],
                [-67, -472], [-66, -465], [-65, -458], [-64, -451], [-63, -444], [-62, -437], [-61, -430],
                [-60, -423], [-59, -416], [-58, -409], [-57, -402], [-56, -395], [-55, -388], [-54, -381],
                [-53, -374], [-52, -367], [-51, -360], [-50, -353], [-49, -346], [-48, -339], [-47, -332],
                [-46, -325], [-45, -318], [-44, -311], [-43, -304], [-42, -297], [-41, -290], [-40, -283],
                [-39, -276], [-38, -269], [-37, -262], [-36, -255], [-35, -248], [-34, -241], [-33, -234],
                [-32, -227], [-31, -220], [-30, -213], [-29, -206], [-28, -199], [-27, -192], [-26, -185],
                [-25, -178], [-24, -171], [-23, -164], [-22, -157], [-21, -150], [-20, -143], [-19, -136],
                [-18, -129], [-17, -122], [-16, -115], [-15, -108], [-14, -101], [-13, -94], [-12, -87], [-11, -80],
                [-10, -73], [-9, -66], [-8, -59], [-7, -52], [-6, -45], [-5, -38], [-4, -31], [-3, -24], [-2, -17],
                [-1, -10], [0, -3], [1, 4], [2, 11], [3, 18], [4, 25], [5, 32], [6, 39], [7, 46], [8, 53], [9, 60],
                [10, 67], [11, 74], [12, 81], [13, 88], [14, 95], [15, 102], [16, 109], [17, 116], [18, 123],
                [19, 130], [20, 137], [21, 144], [22, 151], [23, 158], [24, 165], [25, 172], [26, 179], [27, 186],
                [28, 193], [29, 200], [30, 207], [31, 214], [32, 221], [33, 228], [34, 235], [35, 242], [36, 249],
                [37, 256], [38, 263], [39, 270], [40, 277], [41, 284], [42, 291], [43, 298], [44, 305], [45, 312],
                [46, 319], [47, 326], [48, 333], [49, 340], [50, 347], [51, 354], [52, 361], [53, 368], [54, 375],
                [55, 382], [56, 389], [57, 396], [58, 403], [59, 410], [60, 417], [61, 424], [62, 431], [63, 438],
                [64, 445], [65, 452], [66, 459], [67, 466], [68, 473], [69, 480], [70, 487], [71, 494], [72, 501],
                [73, 508], [74, 515], [75, 522], [76, 529], [77, 536], [78, 543], [79, 550], [80, 557], [81, 564],
                [82, 571], [83, 578], [84, 585], [85, 592], [86, 599], [87, 606], [88, 613], [89, 620], [90, 627],
                [91, 634], [92, 641], [93, 648], [94, 655], [95, 662], [96, 669], [97, 676], [98, 683], [99, 690],
                [100, 697], [101, 704], [102, 711], [103, 718], [104, 725], [105, 732], [106, 739], [107, 746],
                [108, 753], [109, 760], [110, 767], [111, 774], [112, 781], [113, 788], [114, 795], [115, 802],
                [116, 809], [117, 816], [118, 823], [119, 830], [120, 837], [121, 844], [122, 851], [123, 858],
                [124, 865], [125, 872], [126, 879], [127, 886], [128, 893], [129, 900], [130, 907], [131, 914],
                [132, 921], [133, 928], [134, 935], [135, 942], [136, 949], [137, 956], [138, 963], [139, 970],
                [140, 977], [141, 984], [142, 991], [143, 998], [144, 1005], [145, 1012], [146, 1019], [147, 1026],
                [148, 1033], [150, 1048]
              ]
            ],
            false
          ],
          [
            [
              [
                [0, 11], [-99, 307], [-98, 304], [-97, 301], [-96, 298], [-95, 295], [-94, 292], [-93, 289],
                [-92, 286], [-91, 283], [-90, 280], [-89, 277], [-88, 274], [-87, 271], [-86, 268], [-85, 265],
                [-84, 262], [-83, 259], [-82, 256], [-81, 253], [-80, 250], [-79, 247], [-78, 244], [-77, 241],
                [-76, 238], [-75, 235], [-74, 232], [-73, 229], [-72, 226], [-71, 223], [-70, 220], [-69, 217],
                [-68, 214], [-67, 211], [-66, 208], [-65, 205], [-64, 202], [-63, 199], [-62, 196], [-61, 193],
                [-60, 190], [-59, 187], [-58, 184], [-57, 181], [-56, 178], [-55, 175], [-54, 172], [-53, 169],
                [-52, 166], [-51, 163], [-50, 160], [-49, 157], [-48, 154], [-47, 151], [-46, 148], [-45, 145],
                [-44, 142], [-43, 139], [-42, 136], [-41, 133], [-40, 130], [-39, 127], [-38, 124], [-37, 121],
                [-36, 118], [-35, 115], [-34, 112], [-33, 109], [-32, 106], [-31, 103], [-30, 100], [-29, 97],
                [-28, 94], [-27, 91], [-26, 88], [-25, 85], [-24, 82], [-23, 79], [-22, 76], [-21, 73], [-20, 70],
                [-19, 67], [-18, 64], [-17, 61], [-16, 58], [-15, 55], [-14, 52], [-13, 49], [-12, 46], [-11, 43],
                [-10, 40], [-9, 37], [-8, 34], [-7, 31], [-6, 28], [-5, 25], [-4, 22], [-3, 19], [-2, 16], [-1, 13],
                [0, 10], [1, 7], [2, 4], [3, 1], [4, -2], [5, -5], [6, -8], [7, -11], [8, -14], [9, -17], [10, -20],
                [11, -23], [12, -26], [13, -29], [14, -32], [15, -35], [16, -38], [17, -41], [18, -44], [19, -47],
                [20, -50], [21, -53], [22, -56], [23, -59], [24, -62], [25, -65], [26, -68], [27, -71], [28, -74],
                [29, -77], [30, -80], [31, -83], [32, -86], [33, -89], [34, -92], [35, -95], [36, -98], [37, -101],
                [38, -104], [39, -107], [40, -110], [41, -113], [42, -116], [43, -119], [44, -122], [45, -125],
                [46, -128], [47, -131], [48, -134], [49, -137], [50, -140], [51, -143], [52, -146], [53, -149],
                [54, -152], [55, -155], [56, -158], [57, -161], [58, -164], [59, -167], [60, -170], [61, -173],
                [62, -176], [63, -179], [64, -182], [65, -185], [66, -188], [67, -191], [68, -194], [69, -197],
                [70, -200], [71, -203], [72, -206], [73, -209], [74, -212], [75, -215], [76, -218], [77, -221],
                [78, -224], [79, -227], [80, -230], [81, -233], [82, -236], [83, -239], [84, -242], [85, -245],
                [86, -248], [87, -251], [88, -254], [89, -257], [90, -260], [91, -263], [92, -266], [93, -269],
                [94, -272], [95, -275], [96, -278], [97, -281], [98, -284], [99, -287], [-100, 310]
              ]
            ],
            false
          ]
        ]
      },
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
    def check_straight_line(self, coordinates):
        (x0, y0), (x1, y1) = coordinates[0], coordinates[1]
        dx, dy = x1 - x0, y1 - y0               # direction of the line A -> B
        return all(dx * (y - y0) - dy * (x - x0) == 0 for x, y in coordinates[2:])` }, { lang: 'js', code: `function checkStraightLine(p) {
  const [x0, y0] = p[0];
  const dx = p[1][0] - x0, dy = p[1][1] - y0;     // direction of the line A -> B
  for (let i = 2; i < p.length; i++) {
    if (dx * (p[i][1] - y0) - dy * (p[i][0] - x0) !== 0) return false;   // off the line
  }
  return true;
}` }, { lang: 'cpp', code: `class Solution {
public:
    bool checkStraightLine(const vector<vector<int>>& p) {
        long long x0 = p[0][0], y0 = p[0][1];
        long long dx = p[1][0] - x0, dy = p[1][1] - y0;      // direction of the line A -> B
        for (size_t i = 2; i < p.size(); i++)
            if (dx * (p[i][1] - y0) - dy * (p[i][0] - x0) != 0) return false;   // off the line
        return true;
    }
};` }, { lang: 'csharp', code: `public class Solution {
    public bool CheckStraightLine(int[][] p) {
        long x0 = p[0][0], y0 = p[0][1];
        long dx = p[1][0] - x0, dy = p[1][1] - y0;    // direction of the line A -> B
        for (int i = 2; i < p.Length; i++) {
            long ex = p[i][0] - x0, ey = p[i][1] - y0; // vector A -> P_i
            if (dx * ey - dy * ex != 0) return false;  // P_i is off the line
        }
        return true;
    }
}` }],
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
    code: [{ lang: 'java', code: `
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
      }`, alt: [{ lang: 'python', code: `def cross(o, a, b):
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

def sign(x):
    return (x > 0) - (x < 0)

# p is already known to be collinear with a-b; is it inside the segment's bounding box?
def in_box(a, b, p):
    return (min(a[0], b[0]) <= p[0] <= max(a[0], b[0])
            and min(a[1], b[1]) <= p[1] <= max(a[1], b[1]))

# True if closed segments P1P2 and Q1Q2 share at least one point (touching counts).
def segments_intersect(p1, p2, q1, q2):
    o1 = sign(cross(p1, p2, q1))
    o2 = sign(cross(p1, p2, q2))
    o3 = sign(cross(q1, q2, p1))
    o4 = sign(cross(q1, q2, p2))
    if o1 != o2 and o3 != o4:
        return True                                  # proper crossing or T-touch
    if o1 == 0 and in_box(p1, p2, q1): return True   # Q1 lies on P1P2
    if o2 == 0 and in_box(p1, p2, q2): return True   # Q2 lies on P1P2
    if o3 == 0 and in_box(q1, q2, p1): return True   # P1 lies on Q1Q2
    if o4 == 0 and in_box(q1, q2, p2): return True   # P2 lies on Q1Q2
    return False                                     # separated` }, { lang: 'js', code: `function cross(o, a, b) {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

// p is already known to be collinear with a-b; is it inside the segment's bounding box?
function inBox(a, b, p) {
  return Math.min(a[0], b[0]) <= p[0] && p[0] <= Math.max(a[0], b[0])
      && Math.min(a[1], b[1]) <= p[1] && p[1] <= Math.max(a[1], b[1]);
}

// True if closed segments P1P2 and Q1Q2 share at least one point (touching counts).
// Numbers are exact up to 2^53, so this is safe for coordinates up to about 4e7.
function segmentsIntersect(p1, p2, q1, q2) {
  const o1 = Math.sign(cross(p1, p2, q1));
  const o2 = Math.sign(cross(p1, p2, q2));
  const o3 = Math.sign(cross(q1, q2, p1));
  const o4 = Math.sign(cross(q1, q2, p2));
  if (o1 !== o2 && o3 !== o4) return true;               // proper crossing or T-touch
  if (o1 === 0 && inBox(p1, p2, q1)) return true;        // Q1 lies on P1P2
  if (o2 === 0 && inBox(p1, p2, q2)) return true;        // Q2 lies on P1P2
  if (o3 === 0 && inBox(q1, q2, p1)) return true;        // P1 lies on Q1Q2
  if (o4 === 0 && inBox(q1, q2, p2)) return true;        // P2 lies on Q1Q2
  return false;                                          // separated
}` }, { lang: 'cpp', code: `typedef array<long long, 2> P;

long long cross(const P& o, const P& a, const P& b) {
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

int sgn(long long x) { return (x > 0) - (x < 0); }

// p is already known to be collinear with a-b; is it inside the segment's bounding box?
bool inBox(const P& a, const P& b, const P& p) {
    return min(a[0], b[0]) <= p[0] && p[0] <= max(a[0], b[0])
        && min(a[1], b[1]) <= p[1] && p[1] <= max(a[1], b[1]);
}

// True if closed segments P1P2 and Q1Q2 share at least one point (touching counts).
bool segmentsIntersect(const P& p1, const P& p2, const P& q1, const P& q2) {
    int o1 = sgn(cross(p1, p2, q1));
    int o2 = sgn(cross(p1, p2, q2));
    int o3 = sgn(cross(q1, q2, p1));
    int o4 = sgn(cross(q1, q2, p2));
    if (o1 != o2 && o3 != o4) return true;               // proper crossing or T-touch
    if (o1 == 0 && inBox(p1, p2, q1)) return true;       // Q1 lies on P1P2
    if (o2 == 0 && inBox(p1, p2, q2)) return true;       // Q2 lies on P1P2
    if (o3 == 0 && inBox(q1, q2, p1)) return true;       // P1 lies on Q1Q2
    if (o4 == 0 && inBox(q1, q2, p2)) return true;       // P2 lies on Q1Q2
    return false;                                        // separated
}` }, { lang: 'csharp', code: `static long Cross(long[] o, long[] a, long[] b) {
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

// p is already known to be collinear with a-b; is it inside the segment's bounding box?
static bool InBox(long[] a, long[] b, long[] p) {
    return Math.Min(a[0], b[0]) <= p[0] && p[0] <= Math.Max(a[0], b[0])
        && Math.Min(a[1], b[1]) <= p[1] && p[1] <= Math.Max(a[1], b[1]);
}

// True if closed segments P1P2 and Q1Q2 share at least one point (touching counts).
static bool SegmentsIntersect(long[] p1, long[] p2, long[] q1, long[] q2) {
    int o1 = Math.Sign(Cross(p1, p2, q1));
    int o2 = Math.Sign(Cross(p1, p2, q2));
    int o3 = Math.Sign(Cross(q1, q2, p1));
    int o4 = Math.Sign(Cross(q1, q2, p2));
    if (o1 != o2 && o3 != o4) return true;            // proper crossing or T-touch
    if (o1 == 0 && InBox(p1, p2, q1)) return true;    // Q1 lies on P1P2
    if (o2 == 0 && InBox(p1, p2, q2)) return true;    // Q2 lies on P1P2
    if (o3 == 0 && InBox(q1, q2, p1)) return true;    // P1 lies on Q1Q2
    if (o4 == 0 && InBox(q1, q2, p2)) return true;    // P2 lies on Q1Q2
    return false;                                     // separated
}` }] }, { lang: 'java', code: `
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
      }`, alt: [{ lang: 'python', code: `# Crossing point of two NON-parallel segments, or None if they do not cross.
# Exact test on integers; only the final coordinates use floats.
def crossing_point(p1, p2, q1, q2):
    rx, ry = p2[0] - p1[0], p2[1] - p1[1]            # r = P2 - P1
    sx, sy = q2[0] - q1[0], q2[1] - q1[1]            # s = Q2 - Q1
    qx, qy = q1[0] - p1[0], q1[1] - p1[1]            # Q1 - P1
    den = rx * sy - ry * sx                          # r x s
    if den == 0:
        return None                                  # parallel or collinear: handle separately
    t_num = qx * sy - qy * sx                        # (Q1 - P1) x s
    u_num = qx * ry - qy * rx                        # (Q1 - P1) x r
    if den < 0:                                      # make the denominator positive
        den, t_num, u_num = -den, -t_num, -u_num
    if not (0 <= t_num <= den and 0 <= u_num <= den):
        return None                                  # outside a segment
    t = t_num / den
    return (p1[0] + t * rx, p1[1] + t * ry)` }, { lang: 'js', code: `// Crossing point of two NON-parallel segments, or null if they do not cross.
// Exact test on integers (safe up to about 4e7 with Number); only the final coordinates are fractional.
function crossingPoint(p1, p2, q1, q2) {
  const rx = p2[0] - p1[0], ry = p2[1] - p1[1];      // r = P2 - P1
  const sx = q2[0] - q1[0], sy = q2[1] - q1[1];      // s = Q2 - Q1
  const qx = q1[0] - p1[0], qy = q1[1] - p1[1];      // Q1 - P1
  let den = rx * sy - ry * sx;                       // r x s
  if (den === 0) return null;                        // parallel or collinear: handle separately
  let tNum = qx * sy - qy * sx;                      // (Q1 - P1) x s
  let uNum = qx * ry - qy * rx;                      // (Q1 - P1) x r
  if (den < 0) { den = -den; tNum = -tNum; uNum = -uNum; }   // make the denominator positive
  if (tNum < 0 || tNum > den || uNum < 0 || uNum > den) return null;   // outside a segment
  const t = tNum / den;
  return [p1[0] + t * rx, p1[1] + t * ry];
}` }, { lang: 'cpp', code: `typedef array<long long, 2> P;

// Crossing point of two NON-parallel segments; the bool is false if they do not cross.
// Exact test on integers; only the final coordinates use doubles.
pair<bool, array<double, 2>> crossingPoint(const P& p1, const P& p2, const P& q1, const P& q2) {
    long long rx = p2[0] - p1[0], ry = p2[1] - p1[1];    // r = P2 - P1
    long long sx = q2[0] - q1[0], sy = q2[1] - q1[1];    // s = Q2 - Q1
    long long qx = q1[0] - p1[0], qy = q1[1] - p1[1];    // Q1 - P1
    long long den = rx * sy - ry * sx;                   // r x s
    if (den == 0) return {false, {0, 0}};                // parallel or collinear: handle separately
    long long tNum = qx * sy - qy * sx;                  // (Q1 - P1) x s
    long long uNum = qx * ry - qy * rx;                  // (Q1 - P1) x r
    if (den < 0) { den = -den; tNum = -tNum; uNum = -uNum; }   // make the denominator positive
    if (tNum < 0 || tNum > den || uNum < 0 || uNum > den) return {false, {0, 0}};   // outside a segment
    double t = (double)tNum / den;
    return {true, {p1[0] + t * rx, p1[1] + t * ry}};
}` }, { lang: 'csharp', code: `// Crossing point of two NON-parallel segments, or null if they do not cross.
// Exact test on integers; only the final coordinates use doubles.
static double[] CrossingPoint(long[] p1, long[] p2, long[] q1, long[] q2) {
    long rx = p2[0] - p1[0], ry = p2[1] - p1[1];      // r = P2 - P1
    long sx = q2[0] - q1[0], sy = q2[1] - q1[1];      // s = Q2 - Q1
    long qx = q1[0] - p1[0], qy = q1[1] - p1[1];      // Q1 - P1
    long den = rx * sy - ry * sx;                     // r x s
    if (den == 0) return null;                        // parallel or collinear: handle separately
    long tNum = qx * sy - qy * sx;                    // (Q1 - P1) x s
    long uNum = qx * ry - qy * rx;                    // (Q1 - P1) x r
    if (den < 0) { den = -den; tNum = -tNum; uNum = -uNum; }   // make the denominator positive
    if (tNum < 0 || tNum > den || uNum < 0 || uNum > den) return null; // outside a segment
    double t = (double)tNum / den;
    return new[] { p1[0] + t * rx, p1[1] + t * ry };
}` }] }],
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
            { type: 'code', lang: 'java', label: 'decision', code: 'if (o1 != o2 && o3 != o4) return true;\nif (o1 == 0 && inBox(P1,P2,Q1)) return true;\nif (o2 == 0 && inBox(P1,P2,Q2)) return true;\nif (o3 == 0 && inBox(Q1,Q2,P1)) return true;\nif (o4 == 0 && inBox(Q1,Q2,P2)) return true;\nreturn false;', hl: general ? { 1: 'ok' } : hit ? { 2: 'ok', 3: 'ok', 4: 'ok', 5: 'ok' } : { 6: 'bad' }, alt: SEG_ALT }] });
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
      { title: 'Parallel, never meeting', html: `<p>P1(0,0)–P2(4,0) and Q1(0,2)–Q2(4,2). o1 = o2 = + (both Q points on the left of P), so the general case fails; no orientation is 0; answer false. In the parametric form r × s = 4·0 − 0·4 = 0 signals "parallel" before any division.</p>`, code: { lang: 'java', code: `long[] p1 = {0, 0}, p2 = {4, 0}, q1 = {0, 2}, q2 = {4, 2};
long rxs = (p2[0] - p1[0]) * (q2[1] - q1[1]) - (p2[1] - p1[1]) * (q2[0] - q1[0]);
System.out.println("r x s = " + rxs + " -> parallel, never divide by this");`, alt: [{ lang: 'python', code: `p1, p2, q1, q2 = (0, 0), (4, 0), (0, 2), (4, 2)
rxs = (p2[0] - p1[0]) * (q2[1] - q1[1]) - (p2[1] - p1[1]) * (q2[0] - q1[0])
print("r x s =", rxs, "-> parallel, never divide by this")` }, { lang: 'js', code: `const p1 = [0, 0], p2 = [4, 0], q1 = [0, 2], q2 = [4, 2];
const rxs = (p2[0] - p1[0]) * (q2[1] - q1[1]) - (p2[1] - p1[1]) * (q2[0] - q1[0]);
console.log('r x s = ' + rxs + ' -> parallel, never divide by this');` }, { lang: 'cpp', code: `long long p1[] = {0, 0}, p2[] = {4, 0}, q1[] = {0, 2}, q2[] = {4, 2};
long long rxs = (p2[0] - p1[0]) * (q2[1] - q1[1]) - (p2[1] - p1[1]) * (q2[0] - q1[0]);
cout << "r x s = " << rxs << " -> parallel, never divide by this" << endl;` }, { lang: 'csharp', code: `long[] p1 = { 0, 0 }, p2 = { 4, 0 }, q1 = { 0, 2 }, q2 = { 4, 2 };
long rxs = (p2[0] - p1[0]) * (q2[1] - q1[1]) - (p2[1] - p1[1]) * (q2[0] - q1[0]);
Console.WriteLine("r x s = " + rxs + " -> parallel, never divide by this");` }] } }
    ],
    deepDive: `<p><b>Why "o1 ≠ o2 and o3 ≠ o4" is enough (with zeros).</b> If, say, o1 = 0 and o2 ≠ 0, the two lines are not parallel and meet exactly at Q1. The condition o3 ≠ o4 says P1 and P2 are on different sides of (or on) line Q1Q2, so the meeting point Q1 lies between P1 and P2 — on the segment. When both o1 and o2 are 0 the segments are collinear and the bounding-box checks take over. This is the version in CLRS (Section 33.1).</p>
      <p><b>Overflow and signs.</b> Never test <code>c1 * c2 &lt; 0</code> on raw cross products: each can be ~10<sup>18</sup>, and their product overflows a 64-bit integer. Compare the <em>signs</em> instead (<code>Long.signum</code> in Java, <code>(c &gt; 0) - (c &lt; 0)</code> elsewhere). For the crossing point keep <code>tNum</code>, <code>uNum</code> and <code>den</code> as exact integers and compare <code>0 ≤ tNum ≤ den</code> after normalising the sign; divide only at the end. If an exact rational point is required (judges sometimes want fractions), output <code>(p1.x·den + tNum·rx) / den</code> reduced by gcd.</p>
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
        code: { lang: 'java', code: `class Solution {
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
}`, alt: [{ lang: 'python', code: String.raw`
class Solution:
    # Naive slope-intercept solution: shown to illustrate the special cases it gets wrong.
    def intersection(self, start1, end1, start2, end2):
        if start1[0] == end1[0] or start2[0] == end2[0]:
            return []                                 # BUG: gives up on vertical segments
        k1 = (end1[1] - start1[1]) / (end1[0] - start1[0])
        b1 = start1[1] - k1 * start1[0]
        k2 = (end2[1] - start2[1]) / (end2[0] - start2[0])
        b2 = start2[1] - k2 * start2[0]
        if k1 == k2:
            return []                                 # BUG: collinear overlaps ignored
        x = (b2 - b1) / (k1 - k2)
        y = k1 * x + b1
        if x < min(start1[0], end1[0]) or x > max(start1[0], end1[0]):
            return []
        if x < min(start2[0], end2[0]) or x > max(start2[0], end2[0]):
            return []
        return [x, y]` }, { lang: 'js', code: String.raw`
// Naive slope-intercept solution: shown to illustrate the special cases it gets wrong.
function intersection(s1, e1, s2, e2) {
  if (s1[0] === e1[0] || s2[0] === e2[0]) return [];   // BUG: gives up on vertical segments
  const k1 = (e1[1] - s1[1]) / (e1[0] - s1[0]), b1 = s1[1] - k1 * s1[0];
  const k2 = (e2[1] - s2[1]) / (e2[0] - s2[0]), b2 = s2[1] - k2 * s2[0];
  if (k1 === k2) return [];                            // BUG: collinear overlaps ignored
  const x = (b2 - b1) / (k1 - k2), y = k1 * x + b1;
  if (x < Math.min(s1[0], e1[0]) || x > Math.max(s1[0], e1[0])) return [];
  if (x < Math.min(s2[0], e2[0]) || x > Math.max(s2[0], e2[0])) return [];
  return [x, y];
}` }, { lang: 'cpp', code: String.raw`
class Solution {
public:
    // Naive slope-intercept solution: shown to illustrate the special cases it gets wrong.
    vector<double> intersection(vector<int> s1, vector<int> e1, vector<int> s2, vector<int> e2) {
        if (s1[0] == e1[0] || s2[0] == e2[0]) return {};   // BUG: gives up on vertical segments
        double k1 = (double)(e1[1] - s1[1]) / (e1[0] - s1[0]), b1 = s1[1] - k1 * s1[0];
        double k2 = (double)(e2[1] - s2[1]) / (e2[0] - s2[0]), b2 = s2[1] - k2 * s2[0];
        if (k1 == k2) return {};                           // BUG: collinear overlaps ignored
        double x = (b2 - b1) / (k1 - k2), y = k1 * x + b1;
        if (x < min(s1[0], e1[0]) || x > max(s1[0], e1[0])) return {};
        if (x < min(s2[0], e2[0]) || x > max(s2[0], e2[0])) return {};
        return {x, y};
    }
};` }, { lang: 'csharp', code: `public class Solution {
    // Naive slope-intercept solution: shown to illustrate the special cases it gets wrong.
    public double[] Intersection(int[] s1, int[] e1, int[] s2, int[] e2) {
        if (s1[0] == e1[0] || s2[0] == e2[0]) return new double[0];   // BUG: gives up on vertical segments
        double k1 = (double)(e1[1] - s1[1]) / (e1[0] - s1[0]), b1 = s1[1] - k1 * s1[0];
        double k2 = (double)(e2[1] - s2[1]) / (e2[0] - s2[0]), b2 = s2[1] - k2 * s2[0];
        if (k1 == k2) return new double[0];                              // BUG: collinear overlaps ignored
        double x = (b2 - b1) / (k1 - k2), y = k1 * x + b1;
        if (x < Math.Min(s1[0], e1[0]) || x > Math.Max(s1[0], e1[0])) return new double[0];
        if (x < Math.Min(s2[0], e2[0]) || x > Math.Max(s2[0], e2[0])) return new double[0];
        return new[] { x, y };
    }
}` }] }
      },
      mcq: { q: 'You computed r × s = 0 for the two direction vectors. What is the next check?', options: ['Return empty — parallel segments never meet', 'Check whether (Q1 − P1) × r = 0; if so they are collinear and may overlap', 'Divide anyway; floating-point division just returns Infinity', 'Swap the segments and recompute'], answer: 1, explain: 'r × s = 0 means parallel. They can still overlap if they lie on the same line, which is exactly when Q1 − P1 is also parallel to r.' },
      hints: [
        `<p>Hint 1: Describe segment 1 as P1 + t·r (t from 0 to 1) and segment 2 as Q1 + u·s. A meeting point solves P1 + t·r = Q1 + u·s — two unknowns, two equations.</p>`,
        `<p>Hint 2: Cross both sides with s to remove u: t = ((Q1−P1)×s)/(r×s). Cross with r to get u = ((Q1−P1)×r)/(r×s). Keep numerators and denominator as 64-bit integers and check 0 ≤ num ≤ den after making den positive.</p>`,
        `<p>Hint 3: If r × s = 0: if (Q1−P1) × r ≠ 0 or (Q1−P1) × s ≠ 0 they are parallel apart (or a zero-length segment sits off the other line) → []. Otherwise collinear: the overlap (if any) starts at one of the four endpoints; collect endpoints that lie inside BOTH bounding boxes and return the lexicographically smallest.</p>`
      ],
      tests: {
        sig: 'int[] int[] int[] int[] -> double[]',
        fn: 'intersection',
        cmp: 'float',
        cases: [
          [[[0, 0], [1, 0], [1, 1], [0, -1]], [0.5, 0]],
          [[[0, 0], [3, 3], [1, 1], [2, 2]], [1, 1]],
          [[[0, 0], [1, 1], [1, 0], [2, 1]], []],
          [[[0, 0], [4, 0], [2, 0], [2, 5]], [2, 0]],
          [[[0, 0], [2, 2], [2, 2], [4, 0]], [2, 2]],
          [[[0, 0], [1, 1], [1, 1], [2, 2]], [1, 1]],
          [[[0, 0], [1, 1], [2, 2], [3, 3]], []],
          [[[3, 3], [0, 0], [2, 2], [5, 5]], [2, 2]],
          [[[1, 5], [1, 0], [1, 3], [1, 8]], [1, 3]],
          [[[1, 1], [1, 1], [0, 0], [2, 2]], [1, 1]],
          [[[1, 0], [1, 0], [0, 0], [2, 2]], []],
          [[[1, 1], [1, 1], [1, 1], [1, 1]], [1, 1]],
          [[[4, 4], [4, 4], [0, 0], [2, 2]], []],
          [[[-1000000, -1000000], [1000000, 1000000], [-1000000, 1000000], [1000000, -1000000]], [0, 0]],
          [[[0, 0], [3, 1], [0, 1], [3, 0]], [1.5, 0.5]],
          [[[0, 0], [1, 1], [0, 3], [3, 0]], []],
          [[[-5, 2], [7, 2], [0, -9], [0, 9]], [0, 2]],
          [[[5, 5], [5, 5], [5, 5], [9, 1]], [5, 5]],
          [[[0, 0], [10, 0], [10, 0], [20, 0]], [10, 0]],
          [[[2, 2], [0, 0], [0, 0], [-4, -4]], [0, 0]],
          [[[-3, -3], [3, 3], [-3, 3], [3, -3]], [0, 0]],
          [[[0, 0], [999999, 1000000], [1, 0], [0, 1]], [0.499999749999875, 0.500000250000125]],
          [[[2, -2], [2, -2], [0, 1], [1, -3]], []],
          [[[-2, 3], [3, 0], [-3, 2], [2, 1]], [1, 1.2]],
          [[[1, -2], [2, 0], [-2, 2], [0, 2]], []],
          [[[3, -2], [3, 2], [3, -3], [2, 3]], []],
          [[[-2, -2], [-2, -2], [1, 0], [3, 3]], []],
          [[[0, -1], [-2, 3], [1, -3], [-3, 2]], []],
          [[[-1, 3], [1, 1], [-3, 1], [-3, 2]], []],
          [[[-3, 0], [1, 2], [1, -1], [3, -1]], []],
          [[[3, 2], [0, 0], [3, 2], [-2, -3]], [3, 2]],
          [[[-1, -2], [1, 0], [3, 0], [1, 1]], []],
          [[[-2, -3], [-3, -3], [-2, 1], [1, 2]], []],
          [[[3, -3], [-3, 0], [-2, -1], [1, 3]], [-1.7272727272727273, -0.6363636363636364]],
          [[[-3, 3], [1, -1], [-3, 0], [3, -3]], []],
          [[[0, 2], [0, 1], [-3, -3], [-1, -3]], []],
          [[[2, -2], [3, -3], [-2, 2], [-1, -1]], []],
          [[[3, 3], [1, 3], [2, 2], [0, -1]], []],
          [[[1, 0], [1, 0], [2, -3], [-3, -2]], []],
          [[[1, -3], [1, -3], [1, 3], [2, 0]], []],
          [[[-3, 1], [-2, 3], [1, -3], [2, -3]], []],
          [[[3, 0], [-3, -1], [0, -2], [-3, -1]], [-3, -1]],
          [[[-2, -3], [-3, 1], [3, -3], [-3, 3]], []],
          [[[2, 0], [1, -3], [3, -1], [0, 3]], []],
          [[[-1, 2], [2, 1], [2, 0], [-3, -3]], []],
          [[[-3, -2], [0, -2], [-1, -2], [-2, 3]], [-1, -2]],
          [[[1, 1], [0, 0], [1, 3], [-1, 2]], []]
        ]
      },
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
            if (qx * ry - qy * rx != 0 || qx * sy - qy * sx != 0)
                return new double[0];                          // parallel, different lines (or a point off the line)
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
    def intersection(self, start1, end1, start2, end2):
        rx, ry = end1[0] - start1[0], end1[1] - start1[1]      # r = P2 - P1
        sx, sy = end2[0] - start2[0], end2[1] - start2[1]      # s = Q2 - Q1
        qx, qy = start2[0] - start1[0], start2[1] - start1[1]  # Q1 - P1
        den = rx * sy - ry * sx                                # r x s

        def in_box(a, b, p):
            return (min(a[0], b[0]) <= p[0] <= max(a[0], b[0])
                    and min(a[1], b[1]) <= p[1] <= max(a[1], b[1]))

        if den == 0:
            if qx * ry - qy * rx != 0 or qx * sy - qy * sx != 0:
                return []                                      # parallel, different lines
            shared = [c for c in (start1, end1, start2, end2)
                      if in_box(start1, end1, c) and in_box(start2, end2, c)]
            return [float(v) for v in min(shared)] if shared else []   # smallest x, then y
        t_num, u_num = qx * sy - qy * sx, qx * ry - qy * rx
        if den < 0:
            den, t_num, u_num = -den, -t_num, -u_num
        if not (0 <= t_num <= den and 0 <= u_num <= den):
            return []
        t = t_num / den
        return [start1[0] + t * rx, start1[1] + t * ry]` }, { lang: 'js', code: `function intersection(s1, e1, s2, e2) {
  const rx = e1[0] - s1[0], ry = e1[1] - s1[1];          // r = P2 - P1
  const sx = e2[0] - s2[0], sy = e2[1] - s2[1];          // s = Q2 - Q1
  const qx = s2[0] - s1[0], qy = s2[1] - s1[1];          // Q1 - P1
  let den = rx * sy - ry * sx;                           // r x s
  const inBox = (a, b, p) =>
    Math.min(a[0], b[0]) <= p[0] && p[0] <= Math.max(a[0], b[0]) &&
    Math.min(a[1], b[1]) <= p[1] && p[1] <= Math.max(a[1], b[1]);
  if (den === 0) {
    if (qx * ry - qy * rx !== 0 || qx * sy - qy * sx !== 0) return [];   // parallel, different lines
    let best = null;
    for (const c of [s1, e1, s2, e2]) {
      if (inBox(s1, e1, c) && inBox(s2, e2, c) &&
          (best === null || c[0] < best[0] || (c[0] === best[0] && c[1] < best[1]))) best = c;
    }
    return best === null ? [] : [best[0], best[1]];
  }
  let tNum = qx * sy - qy * sx, uNum = qx * ry - qy * rx;
  if (den < 0) { den = -den; tNum = -tNum; uNum = -uNum; }
  if (tNum < 0 || tNum > den || uNum < 0 || uNum > den) return [];
  const t = tNum / den;
  return [s1[0] + t * rx, s1[1] + t * ry];
}` }, { lang: 'cpp', code: `class Solution {
    static bool inBox(const vector<int>& a, const vector<int>& b, const vector<int>& p) {
        return min(a[0], b[0]) <= p[0] && p[0] <= max(a[0], b[0]) &&
               min(a[1], b[1]) <= p[1] && p[1] <= max(a[1], b[1]);
    }
public:
    vector<double> intersection(const vector<int>& s1, const vector<int>& e1,
                                const vector<int>& s2, const vector<int>& e2) {
        long long rx = e1[0] - s1[0], ry = e1[1] - s1[1];     // r = P2 - P1
        long long sx = e2[0] - s2[0], sy = e2[1] - s2[1];     // s = Q2 - Q1
        long long qx = s2[0] - s1[0], qy = s2[1] - s1[1];     // Q1 - P1
        long long den = rx * sy - ry * sx;                    // r x s
        if (den == 0) {
            if (qx * ry - qy * rx != 0 || qx * sy - qy * sx != 0) return {};   // parallel, different lines
            const vector<int>* best = nullptr;
            for (const auto* c : {&s1, &e1, &s2, &e2}) {
                if (inBox(s1, e1, *c) && inBox(s2, e2, *c) && (!best || *c < *best)) best = c;
            }
            return best ? vector<double>{(double)(*best)[0], (double)(*best)[1]} : vector<double>{};
        }
        long long tNum = qx * sy - qy * sx, uNum = qx * ry - qy * rx;
        if (den < 0) { den = -den; tNum = -tNum; uNum = -uNum; }
        if (tNum < 0 || tNum > den || uNum < 0 || uNum > den) return {};
        double t = (double)tNum / den;
        return {s1[0] + t * rx, s1[1] + t * ry};
    }
};` }, { lang: 'csharp', code: `public class Solution {
    public double[] Intersection(int[] s1, int[] e1, int[] s2, int[] e2) {
        long[] p1 = { s1[0], s1[1] }, p2 = { e1[0], e1[1] }, q1 = { s2[0], s2[1] }, q2 = { e2[0], e2[1] };
        long rx = p2[0] - p1[0], ry = p2[1] - p1[1];          // r = P2 - P1
        long sx = q2[0] - q1[0], sy = q2[1] - q1[1];          // s = Q2 - Q1
        long qx = q1[0] - p1[0], qy = q1[1] - p1[1];          // Q1 - P1
        long den = rx * sy - ry * sx;                         // r x s
        if (den == 0) {
            if (qx * ry - qy * rx != 0 || qx * sy - qy * sx != 0)
                return new double[0];                          // parallel, different lines (or a point off the line)
            double[] best = null;                              // collinear: best shared endpoint
            foreach (var c in new[] { p1, p2, q1, q2 }) {
                if (InBox(p1, p2, c) && InBox(q1, q2, c)) {
                    if (best == null || c[0] < best[0] || (c[0] == best[0] && c[1] < best[1]))
                        best = new double[] { c[0], c[1] };
                }
            }
            return best == null ? new double[0] : best;
        }
        long tNum = qx * sy - qy * sx;                        // (Q1 - P1) x s
        long uNum = qx * ry - qy * rx;                        // (Q1 - P1) x r
        if (den < 0) { den = -den; tNum = -tNum; uNum = -uNum; }
        if (tNum < 0 || tNum > den || uNum < 0 || uNum > den) return new double[0];
        double t = (double)tNum / den;
        return new[] { p1[0] + t * rx, p1[1] + t * ry };
    }

    private bool InBox(long[] a, long[] b, long[] p) {
        return Math.Min(a[0], b[0]) <= p[0] && p[0] <= Math.Max(a[0], b[0])
            && Math.Min(a[1], b[1]) <= p[1] && p[1] <= Math.Max(a[1], b[1]);
    }
}` }],
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
        complexity: `<p><b>O(1)</b> time and space. Every intermediate product is ≤ 4·10<sup>12</sup> here, far inside a 64-bit integer.</p>`,
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
    code: [{ lang: 'java', code: `
      // Andrew's monotone chain. Returns hull vertices counter-clockwise, no collinear
      // boundary points, no duplicates. O(N log N) time, O(N) extra space.
      static long cross(long[] o, long[] a, long[] b) {
          return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
      }

      static List<long[]> convexHull(long[][] input) {
          long[][] p = input.clone();
          Arrays.sort(p, (a, b) -> a[0] != b[0] ? Long.compare(a[0], b[0]) : Long.compare(a[1], b[1]));
          int n = 0;                                          // drop duplicate points (adjacent after sorting)
          for (long[] q : p) if (n == 0 || p[n - 1][0] != q[0] || p[n - 1][1] != q[1]) p[n++] = q;
          if (n < 3) return new ArrayList<>(Arrays.asList(Arrays.copyOf(p, n)));
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
          // the last point equals the first one, so leave it out
          return new ArrayList<>(Arrays.asList(Arrays.copyOf(h, k - 1)));
      }`, alt: [{ lang: 'python', code: `# Andrew's monotone chain. Returns hull vertices counter-clockwise, no collinear
# boundary points, no duplicates. O(N log N) time, O(N) extra space.
def cross(o, a, b):
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

def convex_hull(points):
    p = sorted(set(map(tuple, points)))         # sort by x, then y; drops duplicates
    if len(p) < 3:
        return p
    lower = []
    for q in p:                                 # lower hull, left -> right
        while len(lower) >= 2 and cross(lower[-2], lower[-1], q) <= 0:
            lower.pop()                         # pop dents
        lower.append(q)
    upper = []
    for q in reversed(p):                       # upper hull, right -> left
        while len(upper) >= 2 and cross(upper[-2], upper[-1], q) <= 0:
            upper.pop()
        upper.append(q)
    return lower[:-1] + upper[:-1]              # each chain ends where the other starts` }, { lang: 'js', code: `// Andrew's monotone chain. Returns hull vertices counter-clockwise, no collinear
// boundary points, no duplicates. O(N log N) time, O(N) extra space.
function cross(o, a, b) {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

function convexHull(input) {
  const sorted = input.map((q) => [q[0], q[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);   // by x, then y
  const p = sorted.filter((q, i) => i === 0 || q[0] !== sorted[i - 1][0] || q[1] !== sorted[i - 1][1]);   // drop duplicates
  const n = p.length;
  if (n < 3) return p;
  const h = [];
  for (let i = 0; i < n; i++) {                           // lower hull, left -> right
    while (h.length >= 2 && cross(h[h.length - 2], h[h.length - 1], p[i]) <= 0) h.pop();   // pop dents
    h.push(p[i]);
  }
  for (let i = n - 2, lower = h.length + 1; i >= 0; i--) {   // upper hull, right -> left
    while (h.length >= lower && cross(h[h.length - 2], h[h.length - 1], p[i]) <= 0) h.pop();
    h.push(p[i]);
  }
  h.pop();       // the last point equals the first one, so leave it out
  return h;
}` }, { lang: 'cpp', code: `// Andrew's monotone chain. Returns hull vertices counter-clockwise, no collinear
// boundary points, no duplicates. O(N log N) time, O(N) extra space.
typedef array<long long, 2> P;

long long cross(const P& o, const P& a, const P& b) {
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

vector<P> convexHull(vector<P> p) {
    sort(p.begin(), p.end());                           // by x, then y
    p.erase(unique(p.begin(), p.end()), p.end());       // drop duplicate points
    int n = p.size();
    if (n < 3) return p;
    vector<P> h(2 * n);
    int k = 0;
    for (int i = 0; i < n; i++) {                       // lower hull, left -> right
        while (k >= 2 && cross(h[k - 2], h[k - 1], p[i]) <= 0) k--;   // pop dents
        h[k++] = p[i];
    }
    for (int i = n - 2, lower = k + 1; i >= 0; i--) {   // upper hull, right -> left
        while (k >= lower && cross(h[k - 2], h[k - 1], p[i]) <= 0) k--;
        h[k++] = p[i];
    }
    h.resize(k - 1);                                    // the last point equals the first one
    return h;
}` }, { lang: 'csharp', code: `// Andrew's monotone chain. Returns hull vertices counter-clockwise, no collinear
// boundary points, no duplicates. O(N log N) time, O(N) extra space.
static long Cross(long[] o, long[] a, long[] b) {
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

static List<long[]> ConvexHull(long[][] input) {
    long[][] p = (long[][])input.Clone();
    Array.Sort(p, (a, b) => a[0] != b[0] ? a[0].CompareTo(b[0]) : a[1].CompareTo(b[1]));
    int n = 0;                                          // drop duplicate points (adjacent after sorting)
    foreach (var q in p) if (n == 0 || p[n - 1][0] != q[0] || p[n - 1][1] != q[1]) p[n++] = q;
    if (n < 3) return new List<long[]>(p.Take(n));
    long[][] h = new long[2 * n][];
    int k = 0;
    for (int i = 0; i < n; i++) {                       // lower hull, left -> right
        while (k >= 2 && Cross(h[k - 2], h[k - 1], p[i]) <= 0) k--;  // pop dents
        h[k++] = p[i];
    }
    for (int i = n - 2, lower = k + 1; i >= 0; i--) {   // upper hull, right -> left
        while (k >= lower && Cross(h[k - 2], h[k - 1], p[i]) <= 0) k--;
        h[k++] = p[i];
    }
    // the last point equals the first one, so leave it out
    return new List<long[]>(h.Take(k - 1));
}` }] }, { lang: 'java', code: `
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
      }`, alt: [{ lang: 'python', code: `# Graham scan: pivot = lowest (then leftmost) point; sort others by angle using cross.
from functools import cmp_to_key

def cross(o, a, b):
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

def dist2(a, b):
    return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2

def graham_scan(pts):
    p0 = min(pts, key=lambda q: (q[1], q[0]))
    rest = [q for q in pts if q is not p0]
    # All points are above p0 (or level and to its right), so angles lie in [0, pi)
    # and the cross-product comparator is a valid total order.
    def by_angle(a, b):
        c = cross(p0, a, b)
        if c != 0:
            return -1 if c > 0 else 1                 # a has the smaller angle
        return dist2(p0, a) - dist2(p0, b)            # same ray: nearer first
    rest.sort(key=cmp_to_key(by_angle))
    st = [p0]
    for p in rest:
        while len(st) >= 2:
            top = st.pop()
            if cross(st[-1], top, p) > 0:             # left turn: keep top
                st.append(top)
                break
        st.append(p)
    return st                                         # counter-clockwise from p0` }, { lang: 'js', code: `// Graham scan: pivot = lowest (then leftmost) point; sort others by angle using cross.
function cross(o, a, b) {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}
function dist2(a, b) {
  const dx = a[0] - b[0], dy = a[1] - b[1];
  return dx * dx + dy * dy;
}

function grahamScan(pts) {
  let piv = 0;
  for (let i = 1; i < pts.length; i++) {
    if (pts[i][1] < pts[piv][1] || (pts[i][1] === pts[piv][1] && pts[i][0] < pts[piv][0])) piv = i;
  }
  const p0 = pts[piv];
  const rest = pts.filter((_, i) => i !== piv);
  // All points are above p0 (or level and to its right), so angles lie in [0, pi)
  // and the cross-product comparator is a valid total order.
  rest.sort((a, b) => {
    const c = cross(p0, a, b);
    if (c !== 0) return c > 0 ? -1 : 1;               // a has the smaller angle
    return dist2(p0, a) - dist2(p0, b);               // same ray: nearer first
  });
  const st = [p0];
  for (const p of rest) {
    while (st.length >= 2) {
      const top = st.pop();
      if (cross(st[st.length - 1], top, p) > 0) { st.push(top); break; }   // left turn: keep top
    }
    st.push(p);
  }
  return st;                                          // counter-clockwise from p0
}` }, { lang: 'cpp', code: `// Graham scan: pivot = lowest (then leftmost) point; sort others by angle using cross.
typedef array<long long, 2> P;

long long cross(const P& o, const P& a, const P& b) {
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}
long long dist2(const P& a, const P& b) {
    long long dx = a[0] - b[0], dy = a[1] - b[1];
    return dx * dx + dy * dy;
}

vector<P> grahamScan(vector<P> pts) {
    int piv = 0;
    for (int i = 1; i < (int)pts.size(); i++)
        if (pts[i][1] < pts[piv][1] || (pts[i][1] == pts[piv][1] && pts[i][0] < pts[piv][0])) piv = i;
    P p0 = pts[piv];
    swap(pts[piv], pts[0]);
    // All points are above p0 (or level and to its right), so angles lie in [0, pi)
    // and the cross-product comparator is a valid strict weak order.
    sort(pts.begin() + 1, pts.end(), [&](const P& a, const P& b) {
        long long c = cross(p0, a, b);
        if (c != 0) return c > 0;                         // a has the smaller angle
        return dist2(p0, a) < dist2(p0, b);               // same ray: nearer first
    });
    vector<P> st = {p0};
    for (size_t i = 1; i < pts.size(); i++) {
        while (st.size() >= 2) {
            P top = st.back();
            st.pop_back();
            if (cross(st.back(), top, pts[i]) > 0) { st.push_back(top); break; }   // left turn: keep top
        }
        st.push_back(pts[i]);
    }
    return st;                                            // counter-clockwise from p0
}` }, { lang: 'csharp', code: `// Graham scan: pivot = lowest (then leftmost) point; sort others by angle using cross.
static long Cross(long[] o, long[] a, long[] b) {
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}
static long Dist2(long[] a, long[] b) {
    long dx = a[0] - b[0], dy = a[1] - b[1];
    return dx * dx + dy * dy;
}

static List<long[]> GrahamScan(long[][] pts) {
    int n = pts.Length, piv = 0;
    for (int i = 1; i < n; i++)
        if (pts[i][1] < pts[piv][1] || (pts[i][1] == pts[piv][1] && pts[i][0] < pts[piv][0])) piv = i;
    long[] p0 = pts[piv];
    var rest = new List<long[]>();
    for (int i = 0; i < n; i++) if (i != piv) rest.Add(pts[i]);
    // All points are above p0 (or level and to its right), so angles lie in [0, pi)
    // and the cross-product comparer is a valid total order.
    rest.Sort((a, b) => {
        long c = Cross(p0, a, b);
        if (c != 0) return c > 0 ? -1 : 1;            // a has the smaller angle
        return Dist2(p0, a).CompareTo(Dist2(p0, b));  // same ray: nearer first
    });
    var st = new Stack<long[]>();
    st.Push(p0);
    foreach (var p in rest) {
        while (st.Count >= 2) {
            long[] top = st.Pop();
            if (Cross(st.Peek(), top, p) > 0) { st.Push(top); break; }  // left turn: keep top
        }
        st.Push(p);
    }
    var hull = new List<long[]>(st);
    hull.Reverse();                                      // counter-clockwise from p0
    return hull;
}` }] }],
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
      { title: 'Perimeter of the fence', html: `<p>Once you have the hull, the fence length is the sum of distances between consecutive hull vertices (wrap around). For the square example: 4 + 4 + 4 + 4 = 16. Interior points never matter.</p>`, code: { lang: 'java', code: `long[][] hull = {{0, 0}, {4, 0}, {4, 4}, {0, 4}};
double per = 0;
for (int i = 0; i < hull.length; i++) {
    long[] a = hull[i], b = hull[(i + 1) % hull.length];
    per += Math.hypot(b[0] - a[0], b[1] - a[1]);
}
System.out.println(per);   // 16.0`, alt: [{ lang: 'python', code: `import math

hull = [(0, 0), (4, 0), (4, 4), (0, 4)]
per = 0.0
for i in range(len(hull)):
    a, b = hull[i], hull[(i + 1) % len(hull)]
    per += math.hypot(b[0] - a[0], b[1] - a[1])
print(per)   # 16.0` }, { lang: 'js', code: `const hull = [[0, 0], [4, 0], [4, 4], [0, 4]];
let per = 0;
for (let i = 0; i < hull.length; i++) {
  const a = hull[i], b = hull[(i + 1) % hull.length];
  per += Math.hypot(b[0] - a[0], b[1] - a[1]);
}
console.log(per);   // 16` }, { lang: 'cpp', code: `vector<array<long long, 2>> hull = {{0, 0}, {4, 0}, {4, 4}, {0, 4}};
double per = 0;
for (size_t i = 0; i < hull.size(); i++) {
    auto a = hull[i], b = hull[(i + 1) % hull.size()];
    per += hypot((double)(b[0] - a[0]), (double)(b[1] - a[1]));
}
cout << per << endl;   // 16` }, { lang: 'csharp', code: `long[][] hull = { new long[] {0, 0}, new long[] {4, 0}, new long[] {4, 4}, new long[] {0, 4} };
double per = 0;
for (int i = 0; i < hull.Length; i++) {
    long[] a = hull[i], b = hull[(i + 1) % hull.Length];
    double dx = b[0] - a[0], dy = b[1] - a[1];
    per += Math.Sqrt(dx * dx + dy * dy);
}
Console.WriteLine(per);   // 16` }] } },
      { title: 'Farthest pair (diameter) with rotating calipers', html: `<p>The two farthest points of a set are always hull vertices. After the hull (H vertices), sweep two "calipers": for each edge, advance the opposite pointer while the triangle area (|cross|) keeps growing. Each pointer moves at most H steps → O(H) after the hull, versus O(N<sup>2</sup>) for checking all pairs.</p>` }
    ],
    deepDive: `<p><b>Lower bound.</b> Any comparison-based hull algorithm needs Ω(N log N): put numbers x<sub>i</sub> on the parabola (x<sub>i</sub>, x<sub>i</sub><sup>2</sup>); all are hull vertices and the hull visits them in sorted order, so a faster hull would sort faster than possible.</p>
      <p><b>Output-sensitive algorithms.</b> <b>Jarvis march</b> (gift wrapping): from the leftmost point repeatedly pick the point that makes every other point lie to the left — O(N·H) where H = hull size; great when H is tiny. <b>Chan's algorithm</b> combines Graham and Jarvis for O(N log H), optimal. <b>QuickHull</b> recursively takes the farthest point from a dividing line — average O(N log N), worst O(N<sup>2</sup>), and it generalises well to 3D (Qhull, used in MATLAB/SciPy).</p>
      <p><b>Correctness of the pop rule.</b> Invariant: the stack is the lower hull of the points processed so far, with all turns strictly left. A new point to the right can only invalidate points at the <i>end</i> of the chain (those now above the segment to the new point), and those are exactly the ones failing the turn test; earlier points stay valid because the chain is convex. Each point is pushed once and popped at most once per chain → amortized O(1) per point.</p>
      <p><b>Degenerate inputs that break hull code:</b> duplicates (dedupe or the cross is 0), all collinear (two-point hull, or duplicates when keeping collinear points), fewer than 3 points, many points sharing the extreme x (sorting by y as the tiebreak matters). Overflow: coordinates near 10<sup>9</sup> need 64-bit cross products.</p>
      <p><b>Production reality.</b> Physics engines approximate objects by convex hulls because collision tests between convex shapes are cheap (GJK, separating axis theorem). Robotics computes reachable regions; GIS uses hulls (and concave hulls / alpha shapes) to outline point clouds; ML uses them in support vector machines and in the convex hull trick to speed up DP.</p>`,
    aiEra: `<p><b>What AI changes:</b> "write a convex hull" is a solved prompt, and assistants usually produce Andrew's algorithm correctly for the generic case. The interview signal moves to: choosing <code>&lt;</code> vs <code>≤</code> for the problem's collinear rule, handling the all-collinear and duplicate cases, and connecting a word problem ("smallest fence", "farthest towers") to the hull.</p>
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
        code: { lang: 'java', code: `class Solution {
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
}`, alt: [{ lang: 'python', code: String.raw`
class Solution:
    def outer_trees(self, trees):
        t = trees
        n = len(t)
        on = [False] * n
        if n <= 3:
            return t                                  # all of them touch the rope
        for i in range(n):
            for j in range(n):
                if i == j:
                    continue
                edge = True
                for k in range(n):
                    if self.cross(t[i], t[j], t[k]) < 0:
                        edge = False                  # someone is on the right
                        break
                if not edge:
                    continue
                for k in range(n):                    # trees on this fence stretch
                    if self.cross(t[i], t[j], t[k]) == 0 and self.between(t[i], t[j], t[k]):
                        on[k] = True
        return [t[k] for k in range(n) if on[k]]

    def cross(self, o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    def between(self, a, b, p):
        return (min(a[0], b[0]) <= p[0] <= max(a[0], b[0])
                and min(a[1], b[1]) <= p[1] <= max(a[1], b[1]))` }, { lang: 'js', code: String.raw`
function outerTrees(t) {
  const n = t.length;
  const on = new Array(n).fill(false);
  if (n <= 3) return t;                               // all of them touch the rope
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const between = (a, b, p) =>
    Math.min(a[0], b[0]) <= p[0] && p[0] <= Math.max(a[0], b[0]) &&
    Math.min(a[1], b[1]) <= p[1] && p[1] <= Math.max(a[1], b[1]);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      let edge = true;
      for (let k = 0; k < n && edge; k++)
        if (cross(t[i], t[j], t[k]) < 0) edge = false;   // someone is on the right
      if (!edge) continue;
      for (let k = 0; k < n; k++)                     // trees on this fence stretch
        if (cross(t[i], t[j], t[k]) === 0 && between(t[i], t[j], t[k])) on[k] = true;
    }
  return t.filter((_, k) => on[k]);
}` }, { lang: 'cpp', code: String.raw`
class Solution {
    int cross(const vector<int>& o, const vector<int>& a, const vector<int>& b) {
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    }
    bool between(const vector<int>& a, const vector<int>& b, const vector<int>& p) {
        return min(a[0], b[0]) <= p[0] && p[0] <= max(a[0], b[0])
            && min(a[1], b[1]) <= p[1] && p[1] <= max(a[1], b[1]);
    }

public:
    vector<vector<int>> outerTrees(vector<vector<int>> t) {
        int n = t.size();
        vector<char> on(n, 0);
        if (n <= 3) return t;                         // all of them touch the rope
        for (int i = 0; i < n; i++)
            for (int j = 0; j < n; j++) {
                if (i == j) continue;
                bool edge = true;
                for (int k = 0; k < n && edge; k++)
                    if (cross(t[i], t[j], t[k]) < 0) edge = false;   // someone is on the right
                if (!edge) continue;
                for (int k = 0; k < n; k++)           // trees on this fence stretch
                    if (cross(t[i], t[j], t[k]) == 0 && between(t[i], t[j], t[k])) on[k] = 1;
            }
        vector<vector<int>> res;
        for (int k = 0; k < n; k++) if (on[k]) res.push_back(t[k]);
        return res;
    }
};` }, { lang: 'csharp', code: `public class Solution {
    public int[][] OuterTrees(int[][] t) {
        int n = t.Length;
        bool[] on = new bool[n];
        if (n <= 3) return t;                              // all of them touch the rope
        for (int i = 0; i < n; i++)
            for (int j = 0; j < n; j++) {
                if (i == j) continue;
                bool edge = true;
                for (int k = 0; k < n && edge; k++)
                    if (Cross(t[i], t[j], t[k]) < 0) edge = false;   // someone is on the right
                if (!edge) continue;
                for (int k = 0; k < n; k++)                     // trees on this fence stretch
                    if (Cross(t[i], t[j], t[k]) == 0 && Between(t[i], t[j], t[k])) on[k] = true;
            }
        var res = new List<int[]>();
        for (int k = 0; k < n; k++) if (on[k]) res.Add(t[k]);
        return res.ToArray();
    }
    private int Cross(int[] o, int[] a, int[] b) {
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    }
    private bool Between(int[] a, int[] b, int[] p) {
        return Math.Min(a[0], b[0]) <= p[0] && p[0] <= Math.Max(a[0], b[0])
            && Math.Min(a[1], b[1]) <= p[1] && p[1] <= Math.Max(a[1], b[1]);
    }
}` }] }
      },
      mcq: { q: 'In the monotone chain, which pop condition keeps trees that lie exactly on a fence edge?', options: ['Pop while cross ≤ 0', 'Pop while cross &lt; 0', 'Pop while cross ≥ 0', 'Never pop'], answer: 1, explain: 'A tree on a straight stretch makes a zero cross product. Popping only on strictly negative (right) turns keeps it.' },
      hints: [
        `<p>Hint 1: The answer is the convex hull, <i>including</i> points on its edges. Sort points by (x, y) so the leftmost and rightmost are on the fence.</p>`,
        `<p>Hint 2: Andrew's monotone chain with the pop condition <code>cross &lt; 0</code> (only strict right turns are dents). Build the lower chain left → right and the upper chain right → left.</p>`,
        `<p>Hint 3: Collinear input makes both chains contain the same points, so de-duplicate (track indices in a boolean[]). Recipe: sort; lower pass; upper pass with stack floor = lowerSize + 1; take h[0..k−2]; skip repeated indices.</p>`
      ],
      tests: {
        sig: 'int[][] -> int[][]',
        fn: 'outerTrees',
        cmp: 'set',
        cases: [
          [[[[1, 1], [2, 2], [2, 0], [2, 4], [3, 3], [4, 2]]], [[1, 1], [2, 0], [2, 4], [3, 3], [4, 2]]],
          [[[[1, 2], [2, 2], [4, 2]]], [[1, 2], [2, 2], [4, 2]]],
          [[[[0, 0]]], [[0, 0]]],
          [[[[3, 1], [0, 7]]], [[3, 1], [0, 7]]],
          [[[[0, 0], [4, 0], [2, 3]]], [[0, 0], [4, 0], [2, 3]]],
          [[[[0, 0], [4, 0], [2, 3], [2, 1]]], [[0, 0], [4, 0], [2, 3]]],
          [
            [[[0, 0], [4, 0], [4, 4], [0, 4], [2, 0], [4, 2], [2, 4], [0, 2], [2, 2]]],
            [[0, 0], [4, 0], [4, 4], [0, 4], [2, 0], [4, 2], [2, 4], [0, 2]]
          ],
          [[[[5, 9], [5, 0], [5, 3], [5, 7], [5, 1], [5, 4]]], [[5, 9], [5, 0], [5, 3], [5, 7], [5, 1], [5, 4]]],
          [
            [
              [
                [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [1, 5],
                [2, 0], [2, 1], [2, 2], [2, 3], [2, 4], [2, 5], [3, 0], [3, 1], [3, 2], [3, 3], [3, 4], [3, 5],
                [4, 0], [4, 1], [4, 2], [4, 3], [4, 4], [4, 5], [5, 0], [5, 1], [5, 2], [5, 3], [5, 4], [5, 5]
              ]
            ],
            [
              [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [1, 0], [1, 5], [2, 0], [2, 5], [3, 0], [3, 5],
              [4, 0], [4, 5], [5, 0], [5, 1], [5, 2], [5, 3], [5, 4], [5, 5]
            ]
          ],
          [
            [
              [
                [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8], [0, 9], [0, 10], [0, 11],
                [0, 12], [0, 13], [0, 14], [0, 15], [0, 16], [0, 17], [0, 18], [0, 19], [1, 0], [1, 1], [1, 2],
                [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [1, 8], [1, 9], [1, 10], [1, 11], [1, 12], [1, 13], [1, 14],
                [1, 15], [1, 16], [1, 17], [1, 18], [1, 19], [2, 0], [2, 1], [2, 2], [2, 3], [2, 4], [2, 5], [2, 6],
                [2, 7], [2, 8], [2, 9], [2, 10], [2, 11], [2, 12], [2, 13], [2, 14], [2, 15], [2, 16], [2, 17],
                [2, 18], [2, 19], [3, 0], [3, 1], [3, 2], [3, 3], [3, 4], [3, 5], [3, 6], [3, 7], [3, 8], [3, 9],
                [3, 10], [3, 11], [3, 12], [3, 13], [3, 14], [3, 15], [3, 16], [3, 17], [3, 18], [3, 19], [4, 0],
                [4, 1], [4, 2], [4, 3], [4, 4], [4, 5], [4, 6], [4, 7], [4, 8], [4, 9], [4, 10], [4, 11], [4, 12],
                [4, 13], [4, 14], [4, 15], [4, 16], [4, 17], [4, 18], [4, 19], [5, 0], [5, 1], [5, 2], [5, 3],
                [5, 4], [5, 5], [5, 6], [5, 7], [5, 8], [5, 9], [5, 10], [5, 11], [5, 12], [5, 13], [5, 14], [5, 15],
                [5, 16], [5, 17], [5, 18], [5, 19], [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [6, 6], [6, 7],
                [6, 8], [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14], [6, 15], [6, 16], [6, 17], [6, 18],
                [6, 19], [7, 0], [7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6], [7, 7], [7, 8], [7, 9], [7, 10],
                [7, 11], [7, 12], [7, 13], [7, 14], [7, 15], [7, 16], [7, 17], [7, 18], [7, 19], [8, 0], [8, 1],
                [8, 2], [8, 3], [8, 4], [8, 5], [8, 6], [8, 7], [8, 8], [8, 9], [8, 10], [8, 11], [8, 12], [8, 13],
                [8, 14], [8, 15], [8, 16], [8, 17], [8, 18], [8, 19], [9, 0], [9, 1], [9, 2], [9, 3], [9, 4], [9, 5],
                [9, 6], [9, 7], [9, 8], [9, 9], [9, 10], [9, 11], [9, 12], [9, 13], [9, 14], [9, 15], [9, 16],
                [9, 17], [9, 18], [9, 19], [10, 0], [10, 1], [10, 2], [10, 3], [10, 4], [10, 5], [10, 6], [10, 7],
                [10, 8], [10, 9], [10, 10], [10, 11], [10, 12], [10, 13], [10, 14], [10, 15], [10, 16], [10, 17],
                [10, 18], [10, 19], [11, 0], [11, 1], [11, 2], [11, 3], [11, 4], [11, 5], [11, 6], [11, 7], [11, 8],
                [11, 9], [11, 10], [11, 11], [11, 12], [11, 13], [11, 14], [11, 15], [11, 16], [11, 17], [11, 18],
                [11, 19], [12, 0], [12, 1], [12, 2], [12, 3], [12, 4], [12, 5], [12, 6], [12, 7], [12, 8], [12, 9],
                [12, 10], [12, 11], [12, 12], [12, 13], [12, 14], [12, 15], [12, 16], [12, 17], [12, 18], [12, 19],
                [13, 0], [13, 1], [13, 2], [13, 3], [13, 4], [13, 5], [13, 6], [13, 7], [13, 8], [13, 9], [13, 10],
                [13, 11], [13, 12], [13, 13], [13, 14], [13, 15], [13, 16], [13, 17], [13, 18], [13, 19], [14, 0],
                [14, 1], [14, 2], [14, 3], [14, 4], [14, 5], [14, 6], [14, 7], [14, 8], [14, 9], [14, 10], [14, 11],
                [14, 12], [14, 13], [14, 14], [14, 15], [14, 16], [14, 17], [14, 18], [14, 19], [15, 0], [15, 1],
                [15, 2], [15, 3], [15, 4], [15, 5], [15, 6], [15, 7], [15, 8], [15, 9], [15, 10], [15, 11], [15, 12],
                [15, 13], [15, 14], [15, 15], [15, 16], [15, 17], [15, 18], [15, 19], [16, 0], [16, 1], [16, 2],
                [16, 3], [16, 4], [16, 5], [16, 6], [16, 7], [16, 8], [16, 9], [16, 10], [16, 11], [16, 12],
                [16, 13], [16, 14], [16, 15], [16, 16], [16, 17], [16, 18], [16, 19], [17, 0], [17, 1], [17, 2],
                [17, 3], [17, 4], [17, 5], [17, 6], [17, 7], [17, 8], [17, 9], [17, 10], [17, 11], [17, 12],
                [17, 13], [17, 14], [17, 15], [17, 16], [17, 17], [17, 18], [17, 19], [18, 0], [18, 1], [18, 2],
                [18, 3], [18, 4], [18, 5], [18, 6], [18, 7], [18, 8], [18, 9], [18, 10], [18, 11], [18, 12],
                [18, 13], [18, 14], [18, 15], [18, 16], [18, 17], [18, 18], [18, 19], [19, 0], [19, 1], [19, 2],
                [19, 3], [19, 4], [19, 5], [19, 6], [19, 7], [19, 8], [19, 9], [19, 10], [19, 11], [19, 12],
                [19, 13], [19, 14], [19, 15], [19, 16], [19, 17], [19, 18], [19, 19]
              ]
            ],
            [
              [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8], [0, 9], [0, 10], [0, 11],
              [0, 12], [0, 13], [0, 14], [0, 15], [0, 16], [0, 17], [0, 18], [0, 19], [1, 0], [1, 19], [2, 0],
              [2, 19], [3, 0], [3, 19], [4, 0], [4, 19], [5, 0], [5, 19], [6, 0], [6, 19], [7, 0], [7, 19], [8, 0],
              [8, 19], [9, 0], [9, 19], [10, 0], [10, 19], [11, 0], [11, 19], [12, 0], [12, 19], [13, 0], [13, 19],
              [14, 0], [14, 19], [15, 0], [15, 19], [16, 0], [16, 19], [17, 0], [17, 19], [18, 0], [18, 19],
              [19, 0], [19, 1], [19, 2], [19, 3], [19, 4], [19, 5], [19, 6], [19, 7], [19, 8], [19, 9], [19, 10],
              [19, 11], [19, 12], [19, 13], [19, 14], [19, 15], [19, 16], [19, 17], [19, 18], [19, 19]
            ]
          ],
          [
            [[[50, 0], [40, 10], [60, 10], [30, 20], [70, 20], [50, 20], [50, 10], [50, 40], [45, 30], [55, 30]]],
            [[50, 0], [40, 10], [60, 10], [30, 20], [70, 20], [50, 40]]
          ],
          [
            [[[0, 1], [10, 8], [7, 0], [7, 3], [6, 7], [10, 6], [5, 0], [10, 3], [10, 9], [8, 5], [7, 8], [2, 8]]],
            [[0, 1], [10, 8], [7, 0], [10, 6], [5, 0], [10, 3], [10, 9], [2, 8]]
          ],
          [
            [
              [
                [28, 52], [38, 84], [24, 97], [7, 47], [44, 69], [48, 3], [62, 50], [76, 82], [27, 37], [3, 43],
                [85, 88], [20, 13], [4, 60], [55, 68], [76, 36], [57, 41], [47, 88], [22, 43], [38, 67], [44, 22],
                [20, 55], [82, 82], [84, 91], [16, 97], [31, 97], [66, 70], [8, 80], [79, 3], [65, 22], [39, 61]
              ]
            ],
            [[24, 97], [48, 3], [3, 43], [85, 88], [20, 13], [4, 60], [84, 91], [16, 97], [31, 97], [8, 80], [79, 3]]
          ],
          [
            [
              [
                [69, 50], [97, 20], [18, 90], [50, 6], [69, 74], [69, 80], [67, 22], [35, 54], [10, 64], [10, 70],
                [23, 92], [16, 53], [15, 48], [32, 67], [21, 49], [65, 12], [8, 85], [22, 47], [6, 63], [1, 76],
                [77, 53], [62, 10], [26, 26], [30, 51], [21, 76], [62, 25], [77, 13], [64, 80], [21, 21], [54, 79],
                [34, 9], [59, 14], [38, 49], [63, 42], [78, 88], [63, 45], [74, 69], [63, 48], [75, 13], [34, 100],
                [33, 19], [22, 52], [92, 56], [78, 60], [94, 50], [71, 30], [100, 66], [93, 57], [71, 39], [78, 84],
                [75, 3], [46, 58], [92, 22], [76, 13], [28, 28], [90, 3], [79, 70], [11, 82], [99, 91], [15, 15]
              ]
            ],
            [[97, 20], [50, 6], [8, 85], [1, 76], [34, 9], [34, 100], [100, 66], [75, 3], [90, 3], [99, 91], [15, 15]]
          ],
          [
            [
              [
                [4, 0], [5, 1], [5, 10], [8, 9], [10, 6], [11, 5], [11, 14], [0, 14], [15, 5], [6, 2], [1, 15],
                [15, 14], [7, 10], [5, 3], [8, 2], [9, 1], [3, 15], [5, 12], [9, 10], [0, 7], [11, 7], [1, 8],
                [15, 7], [6, 13], [5, 5], [9, 3], [11, 0], [0, 0], [9, 12], [15, 0], [13, 12], [7, 5], [7, 14],
                [3, 1], [12, 13], [5, 7], [11, 2], [13, 5], [13, 14], [12, 15], [3, 12], [14, 12], [4, 11], [11, 4],
                [10, 8], [7, 0], [15, 13], [2, 13], [7, 9], [5, 2], [4, 4], [9, 0], [9, 9], [10, 10], [1, 7], [2, 6],
                [7, 2], [7, 11], [12, 1], [6, 15], [12, 10], [3, 7], [4, 6], [9, 2], [8, 6], [10, 3], [8, 15],
                [10, 12], [13, 11], [0, 11], [12, 12], [3, 9], [5, 6], [8, 8], [10, 5], [1, 2], [13, 4], [10, 14],
                [11, 13], [0, 13], [12, 5], [3, 2], [4, 1], [14, 11], [8, 10], [10, 7], [0, 6], [1, 13], [0, 15],
                [11, 15], [6, 3], [12, 7], [14, 4], [9, 11], [11, 8], [0, 8], [2, 5], [4, 14], [8, 5], [10, 2],
                [11, 1], [8, 14], [10, 11], [9, 13], [11, 10], [2, 7], [13, 13], [15, 10], [7, 6], [7, 15], [5, 8],
                [10, 4], [0, 3], [2, 0], [11, 3], [11, 12], [0, 12], [13, 6], [6, 0], [15, 12]
              ]
            ],
            [
              [4, 0], [0, 14], [15, 5], [1, 15], [15, 14], [3, 15], [0, 7], [15, 7], [11, 0], [0, 0], [15, 0],
              [12, 15], [7, 0], [15, 13], [9, 0], [6, 15], [8, 15], [0, 11], [0, 13], [0, 6], [0, 15], [11, 15],
              [0, 8], [15, 10], [7, 15], [0, 3], [2, 0], [0, 12], [6, 0], [15, 12]
            ]
          ],
          [
            [
              [
                [78, 59], [43, 37], [4, 0], [33, 45], [71, 29], [17, 58], [56, 74], [88, 54], [53, 32], [48, 100],
                [19, 73], [28, 21], [69, 22], [17, 21], [54, 49], [28, 94], [26, 60], [41, 24], [61, 91], [0, 87],
                [40, 77], [26, 87], [72, 93], [42, 59], [7, 37], [44, 56], [99, 56], [30, 11], [43, 60], [91, 27],
                [84, 43], [85, 75], [74, 20], [37, 90], [66, 16], [37, 99], [81, 62], [12, 54], [87, 2], [33, 31],
                [1, 26], [13, 92], [53, 73], [90, 46], [93, 63], [82, 51], [48, 49], [5, 23], [0, 73], [84, 54],
                [87, 50], [49, 11], [6, 61], [50, 31], [29, 63], [21, 4], [13, 21], [19, 34], [67, 1], [70, 6],
                [8, 52], [39, 85], [22, 78], [28, 9], [51, 59], [66, 48], [84, 38], [69, 83], [3, 28], [77, 96],
                [11, 75], [13, 60], [96, 85], [47, 98], [79, 78], [99, 35], [99, 99], [85, 45], [44, 44], [54, 21],
                [28, 11], [23, 79], [60, 9], [97, 92], [59, 20], [9, 16], [43, 11], [14, 94], [67, 97], [55, 95],
                [34, 39], [61, 99], [45, 57], [57, 22], [39, 71], [10, 35], [2, 31], [76, 44], [39, 89], [6, 95],
                [51, 8], [98, 59], [61, 74], [84, 51], [89, 99], [8, 77], [26, 6], [10, 19], [50, 37], [27, 35],
                [96, 89], [15, 70], [42, 97], [30, 95], [77, 57], [14, 53], [71, 87], [43, 52], [72, 88], [84, 44],
                [77, 93], [71, 53], [26, 63], [33, 14], [56, 98], [45, 43], [2, 72], [63, 58], [48, 69], [73, 13],
                [21, 6], [34, 70], [49, 86], [3, 64], [68, 99], [31, 25], [35, 41], [89, 76], [80, 73], [96, 57],
                [63, 94], [76, 69], [0, 13], [54, 48], [77, 6], [26, 95], [75, 61], [6, 37], [80, 84], [64, 33],
                [41, 77], [91, 26], [81, 3], [90, 70], [79, 79], [54, 59], [85, 92], [0, 33], [82, 84], [9, 45],
                [15, 79], [84, 14], [13, 36], [80, 68], [87, 92], [30, 21], [19, 85], [28, 33], [8, 30], [11, 17],
                [25, 80], [9, 38], [24, 84], [67, 64], [33, 96], [90, 93], [23, 18], [7, 31], [45, 15], [62, 86],
                [27, 73], [59, 23], [76, 66], [99, 68], [3, 27], [14, 91], [9, 40], [95, 73], [25, 39], [82, 36],
                [42, 0], [64, 85], [54, 29], [3, 29], [60, 81], [23, 96], [76, 22], [89, 41], [14, 47], [68, 27]
              ]
            ],
            [
              [4, 0], [48, 100], [0, 87], [99, 56], [37, 99], [87, 2], [0, 73], [67, 1], [99, 35], [99, 99],
              [6, 95], [0, 13], [0, 33], [99, 68], [42, 0]
            ]
          ],
          [
            [[[0, 0], [100, 0], [100, 100], [0, 100], [50, 50], [0, 50], [100, 50], [50, 0], [50, 100]]],
            [[0, 0], [100, 0], [100, 100], [0, 100], [0, 50], [100, 50], [50, 0], [50, 100]]
          ]
        ]
      },
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
    def outer_trees(self, trees):
        pts = sorted(map(tuple, trees))
        if len(pts) <= 3:
            return [list(p) for p in pts]

        def cross(o, a, b):
            return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

        def chain(seq):
            st = []
            for p in seq:
                while len(st) >= 2 and cross(st[-2], st[-1], p) < 0:   # pop only strict right turns
                    st.pop()
                st.append(p)
            return st

        hull = set(chain(pts)) | set(chain(pts[::-1]))    # lower + upper; the set drops duplicates
        return [list(p) for p in hull]` }, { lang: 'js', code: `function outerTrees(trees) {
  const p = trees.map((t) => [t[0], t[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length <= 3) return p;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const chain = (seq) => {
    const st = [];
    for (const q of seq) {
      while (st.length >= 2 && cross(st[st.length - 2], st[st.length - 1], q) < 0) st.pop();
      st.push(q);
    }
    return st;
  };
  const seen = new Set(), res = [];
  for (const q of chain(p).concat(chain([...p].reverse()))) {   // lower + upper chain
    const key = q[0] + ',' + q[1];
    if (!seen.has(key)) { seen.add(key); res.push(q); }
  }
  return res;
}` }, { lang: 'cpp', code: `class Solution {
    static int cross(const vector<int>& o, const vector<int>& a, const vector<int>& b) {
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    }
public:
    vector<vector<int>> outerTrees(vector<vector<int>> trees) {
        int n = trees.size();
        if (n <= 3) return trees;
        sort(trees.begin(), trees.end());
        vector<int> h(2 * n);                       // stack of indices into trees
        int k = 0;
        for (int i = 0; i < n; i++) {               // lower chain
            while (k >= 2 && cross(trees[h[k - 2]], trees[h[k - 1]], trees[i]) < 0) k--;
            h[k++] = i;
        }
        for (int i = n - 2, floor = k + 1; i >= 0; i--) {   // upper chain
            while (k >= floor && cross(trees[h[k - 2]], trees[h[k - 1]], trees[i]) < 0) k--;
            h[k++] = i;
        }
        vector<bool> used(n);
        vector<vector<int>> res;
        for (int i = 0; i < k - 1; i++)             // h[k-1] is trees[0] again
            if (!used[h[i]]) { used[h[i]] = true; res.push_back(trees[h[i]]); }
        return res;
    }
};` }, { lang: 'csharp', code: `public class Solution {
    public int[][] OuterTrees(int[][] trees) {
        int n = trees.Length;
        if (n <= 3) return trees;
        int[][] p = (int[][])trees.Clone();
        Array.Sort(p, (a, b) => a[0] != b[0] ? a[0].CompareTo(b[0]) : a[1].CompareTo(b[1]));
        int[] h = new int[2 * n];          // stack of indices into p
        int k = 0;
        for (int i = 0; i < n; i++) {                                   // lower chain
            while (k >= 2 && Cross(p[h[k - 2]], p[h[k - 1]], p[i]) < 0) k--;
            h[k++] = i;
        }
        for (int i = n - 2, floor = k + 1; i >= 0; i--) {              // upper chain
            while (k >= floor && Cross(p[h[k - 2]], p[h[k - 1]], p[i]) < 0) k--;
            h[k++] = i;
        }
        bool[] used = new bool[n];
        var res = new List<int[]>();
        for (int i = 0; i < k - 1; i++) {   // h[k-1] is p[0] again
            if (!used[h[i]]) { used[h[i]] = true; res.Add(p[h[i]]); }
        }
        return res.ToArray();
    }

    private int Cross(int[] o, int[] a, int[] b) {
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    }
}` }],
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
      '"<b>Area of a polygon</b> given its vertices in order" → shoelace, keep 2·area as a 64-bit integer.',
      '"Are the vertices given <b>clockwise or counter-clockwise</b>?" → sign of the shoelace sum.',
      '"Is the polygon <b>convex</b>?" → all consecutive cross products share one sign (ignore zeros).',
      '"How many <b>lattice / integer points</b> lie inside / on the boundary?" → Pick\'s theorem + gcd per edge.',
      '"Is the point <b>inside</b> the polygon / which region / geofence?" → ray casting (even-odd) or winding number.',
      'Area of the <b>largest triangle</b> from N points (N ≤ 50) → O(N<sup>3</sup>) triples with |cross| / 2; N large → triangle vertices lie on the convex hull.'
    ],
    code: [{ lang: 'java', code: `
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
      }`, alt: [{ lang: 'python', code: `from math import gcd

# Twice the SIGNED area: > 0 counter-clockwise, < 0 clockwise. Exact with Python integers.
def twice_signed_area(p):
    n = len(p)
    s = 0
    for i in range(n):
        a, b = p[i], p[(i + 1) % n]                  # wrap around to the first vertex
        s += a[0] * b[1] - b[0] * a[1]               # cross(P_i, P_{i+1})
    return s

def area(p):
    return abs(twice_signed_area(p)) / 2

# Convex iff all non-zero turns have the same sign (vertices in order, simple polygon).
def is_convex(p):
    n, sign = len(p), 0
    for i in range(n):
        a, b, c = p[i], p[(i + 1) % n], p[(i + 2) % n]
        cr = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
        s = (cr > 0) - (cr < 0)
        if s == 0:
            continue                                 # straight angle: fine
        if sign == 0:
            sign = s
        elif s != sign:
            return False                             # a left AND a right turn
    return True

# Pick's theorem: A = I + B/2 - 1  ->  I = (2A - B + 2) / 2. Lattice polygon required.
def lattice_counts(p):
    n = len(p)
    b = sum(gcd(abs(p[(i + 1) % n][0] - p[i][0]), abs(p[(i + 1) % n][1] - p[i][1]))
            for i in range(n))                       # lattice steps on each edge
    twice_a = abs(twice_signed_area(p))
    inside = (twice_a - b + 2) // 2
    return inside, b` }, { lang: 'js', code: `// Twice the SIGNED area: > 0 counter-clockwise, < 0 clockwise.
// Exact while the sum stays below 2^53 (about 9e15); use BigInt for coordinates near 1e9.
function twiceSignedArea(p) {
  let s = 0;
  const n = p.length;
  for (let i = 0; i < n; i++) {
    const a = p[i], b = p[(i + 1) % n];              // wrap around to the first vertex
    s += a[0] * b[1] - b[0] * a[1];                  // cross(P_i, P_{i+1})
  }
  return s;
}

function area(p) {
  return Math.abs(twiceSignedArea(p)) / 2;
}

// Convex iff all non-zero turns have the same sign (vertices in order, simple polygon).
function isConvex(p) {
  const n = p.length;
  let sign = 0;
  for (let i = 0; i < n; i++) {
    const a = p[i], b = p[(i + 1) % n], c = p[(i + 2) % n];
    const cr = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const s = Math.sign(cr);
    if (s === 0) continue;                           // straight angle: fine
    if (sign === 0) sign = s;
    else if (s !== sign) return false;               // a left AND a right turn
  }
  return true;
}

const gcd = (a, b) => (b === 0 ? Math.abs(a) : gcd(b, a % b));

// Pick's theorem: A = I + B/2 - 1  ->  I = (2A - B + 2) / 2. Lattice polygon required.
function latticeCounts(p) {
  const n = p.length;
  let b = 0;
  for (let i = 0; i < n; i++) {
    const u = p[i], v = p[(i + 1) % n];
    b += gcd(Math.abs(v[0] - u[0]), Math.abs(v[1] - u[1]));   // lattice steps on this edge
  }
  const twiceA = Math.abs(twiceSignedArea(p));
  return [(twiceA - b + 2) / 2, b];
}` }, { lang: 'cpp', code: `typedef long long ll;
typedef vector<array<ll, 2>> Poly;

// Twice the SIGNED area: > 0 counter-clockwise, < 0 clockwise. Exact in long long.
ll twiceSignedArea(const Poly& p) {
    ll s = 0;
    int n = p.size();
    for (int i = 0; i < n; i++) {
        const auto &a = p[i], &b = p[(i + 1) % n];       // wrap around to the first vertex
        s += a[0] * b[1] - b[0] * a[1];                  // cross(P_i, P_{i+1})
    }
    return s;
}

double area(const Poly& p) {
    return llabs(twiceSignedArea(p)) / 2.0;
}

// Convex iff all non-zero turns have the same sign (vertices in order, simple polygon).
bool isConvex(const Poly& p) {
    int n = p.size(), sign = 0;
    for (int i = 0; i < n; i++) {
        const auto &a = p[i], &b = p[(i + 1) % n], &c = p[(i + 2) % n];
        ll cr = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
        int s = (cr > 0) - (cr < 0);
        if (s == 0) continue;                            // straight angle: fine
        if (sign == 0) sign = s;
        else if (s != sign) return false;                // a left AND a right turn
    }
    return true;
}

// Pick's theorem: A = I + B/2 - 1  ->  I = (2A - B + 2) / 2. Lattice polygon required.
pair<ll, ll> latticeCounts(const Poly& p) {
    int n = p.size();
    ll b = 0;
    for (int i = 0; i < n; i++) {
        const auto &u = p[i], &v = p[(i + 1) % n];
        b += gcd(llabs(v[0] - u[0]), llabs(v[1] - u[1]));   // lattice steps on this edge
    }
    ll twiceA = llabs(twiceSignedArea(p));
    return {(twiceA - b + 2) / 2, b};                    // {interior, boundary}
}` }, { lang: 'csharp', code: `// Twice the SIGNED area: > 0 counter-clockwise, < 0 clockwise. Exact in long.
static long TwiceSignedArea(long[][] p) {
    long s = 0;
    int n = p.Length;
    for (int i = 0; i < n; i++) {
        long[] a = p[i], b = p[(i + 1) % n];           // wrap around to the first vertex
        s += a[0] * b[1] - b[0] * a[1];                 // cross(P_i, P_{i+1})
    }
    return s;
}

static double Area(long[][] p) {
    return Math.Abs(TwiceSignedArea(p)) / 2.0;
}

// Convex iff all non-zero turns have the same sign (vertices in order, simple polygon).
static bool IsConvex(long[][] p) {
    int n = p.Length, sign = 0;
    for (int i = 0; i < n; i++) {
        long[] a = p[i], b = p[(i + 1) % n], c = p[(i + 2) % n];
        long cr = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
        int s = Math.Sign(cr);
        if (s == 0) continue;                           // straight angle: fine
        if (sign == 0) sign = s;
        else if (s != sign) return false;               // a left AND a right turn
    }
    return true;
}

static long Gcd(long a, long b) { return b == 0 ? Math.Abs(a) : Gcd(b, a % b); }

// Pick's theorem: A = I + B/2 - 1  ->  I = (2A - B + 2) / 2. Lattice polygon required.
static long[] LatticeCounts(long[][] p) {
    int n = p.Length;
    long b = 0;
    for (int i = 0; i < n; i++) {
        long[] u = p[i], v = p[(i + 1) % n];
        b += Gcd(Math.Abs(v[0] - u[0]), Math.Abs(v[1] - u[1])); // lattice steps on this edge
    }
    long twiceA = Math.Abs(TwiceSignedArea(p));
    long inside = (twiceA - b + 2) / 2;
    return new[] { inside, b };
}` }] }, { lang: 'java', code: `
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
      }`, alt: [{ lang: 'python', code: `# Point in polygon (even-odd rule) with exact integer math.
# Returns 1 = inside, 0 = on the boundary, -1 = outside.
def point_in_polygon(poly, px, py):
    n = len(poly)
    inside = False
    for i in range(n):
        a, b = poly[i], poly[(i + 1) % n]
        cr = (b[0] - a[0]) * (py - a[1]) - (b[1] - a[1]) * (px - a[0])
        in_box = (min(a[0], b[0]) <= px <= max(a[0], b[0])
                  and min(a[1], b[1]) <= py <= max(a[1], b[1]))
        if cr == 0 and in_box:
            return 0                                  # exactly on an edge
        # Half-open rule: count edges whose y-range contains py as [low, high).
        lo, hi = (a, b) if a[1] <= b[1] else (b, a)
        if lo[1] <= py < hi[1]:
            side = (hi[0] - lo[0]) * (py - lo[1]) - (hi[1] - lo[1]) * (px - lo[0])
            if side > 0:
                inside = not inside                   # point left of the upward edge
    return 1 if inside else -1                        # = edge crosses the ray to the right` }, { lang: 'js', code: `// Point in polygon (even-odd rule) with exact integer math (Number is exact up to 2^53).
// Returns 1 = inside, 0 = on the boundary, -1 = outside.
function pointInPolygon(poly, px, py) {
  const n = poly.length;
  let inside = false;
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n];
    const cr = (b[0] - a[0]) * (py - a[1]) - (b[1] - a[1]) * (px - a[0]);
    const inBox = Math.min(a[0], b[0]) <= px && px <= Math.max(a[0], b[0])
               && Math.min(a[1], b[1]) <= py && py <= Math.max(a[1], b[1]);
    if (cr === 0 && inBox) return 0;                 // exactly on an edge
    // Half-open rule: count edges whose y-range contains py as [low, high).
    const [lo, hi] = a[1] <= b[1] ? [a, b] : [b, a];
    if (lo[1] <= py && py < hi[1]) {
      const side = (hi[0] - lo[0]) * (py - lo[1]) - (hi[1] - lo[1]) * (px - lo[0]);
      if (side > 0) inside = !inside;                // point left of the upward edge
    }                                                // = edge crosses the ray to the right
  }
  return inside ? 1 : -1;
}` }, { lang: 'cpp', code: `// Point in polygon (even-odd rule) with exact integer math.
// Returns 1 = inside, 0 = on the boundary, -1 = outside.
typedef long long ll;

int pointInPolygon(const vector<array<ll, 2>>& poly, ll px, ll py) {
    int n = poly.size();
    bool inside = false;
    for (int i = 0; i < n; i++) {
        const auto &a = poly[i], &b = poly[(i + 1) % n];
        ll cr = (b[0] - a[0]) * (py - a[1]) - (b[1] - a[1]) * (px - a[0]);
        bool inBox = min(a[0], b[0]) <= px && px <= max(a[0], b[0])
                  && min(a[1], b[1]) <= py && py <= max(a[1], b[1]);
        if (cr == 0 && inBox) return 0;                  // exactly on an edge
        // Half-open rule: count edges whose y-range contains py as [low, high).
        const auto &lo = a[1] <= b[1] ? a : b, &hi = a[1] <= b[1] ? b : a;
        if (lo[1] <= py && py < hi[1]) {
            ll side = (hi[0] - lo[0]) * (py - lo[1]) - (hi[1] - lo[1]) * (px - lo[0]);
            if (side > 0) inside = !inside;              // point left of the upward edge
        }                                                // = edge crosses the ray to the right
    }
    return inside ? 1 : -1;
}` }, { lang: 'csharp', code: `// Point in polygon (even-odd rule) with exact integer math.
// Returns 1 = inside, 0 = on the boundary, -1 = outside.
static int PointInPolygon(long[][] poly, long px, long py) {
    int n = poly.Length;
    bool inside = false;
    for (int i = 0; i < n; i++) {
        long[] a = poly[i], b = poly[(i + 1) % n];
        long cr = (b[0] - a[0]) * (py - a[1]) - (b[1] - a[1]) * (px - a[0]);
        bool inBox = Math.Min(a[0], b[0]) <= px && px <= Math.Max(a[0], b[0])
                  && Math.Min(a[1], b[1]) <= py && py <= Math.Max(a[1], b[1]);
        if (cr == 0 && inBox) return 0;                 // exactly on an edge
        // Half-open rule: count edges whose y-range contains py as [low, high).
        long[] lo = a[1] <= b[1] ? a : b, hi = a[1] <= b[1] ? b : a;
        if (lo[1] <= py && py < hi[1]) {
            long side = (hi[0] - lo[0]) * (py - lo[1]) - (hi[1] - lo[1]) * (px - lo[0]);
            if (side > 0) inside = !inside;             // point left of the upward edge
        }                                               // = edge crosses the ray to the right
    }
    return inside ? 1 : -1;
}` }] }, { lang: 'python', run: true, code: `from math import gcd

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
print("brute force interior count:", sum(strictly_inside((x, y), house) for x in range(0, 5) for y in range(0, 6)))`, alt: [{ lang: 'js', run: true, code: `function twiceSignedArea(p) {
  const n = p.length;
  let s = 0;
  for (let i = 0; i < n; i++) s += p[i][0] * p[(i + 1) % n][1] - p[(i + 1) % n][0] * p[i][1];
  return s;
}

const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));

function pick(p) {
  const n = p.length;
  let b = 0;
  for (let i = 0; i < n; i++) b += gcd(Math.abs(p[(i + 1) % n][0] - p[i][0]), Math.abs(p[(i + 1) % n][1] - p[i][1]));
  const a2 = Math.abs(twiceSignedArea(p));
  return [(a2 - b + 2) / 2, b];      // interior, boundary
}

const house = [[0, 0], [4, 0], [4, 3], [2, 5], [0, 3]];
const s = twiceSignedArea(house);
console.log('2*signed area =', s, '-> area', Math.abs(s) / 2, s > 0 ? 'CCW' : 'CW');
console.log('clockwise listing gives', twiceSignedArea([...house].reverse()));
const [inside, boundary] = pick(house);
console.log('lattice points inside:', inside, 'on boundary:', boundary);

// brute-force check of Pick's theorem for the house
function strictlyInside(pt, poly) {
  const [x, y] = pt;
  let res = false;
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % n];
    if ((x2 - x1) * (y - y1) - (y2 - y1) * (x - x1) === 0 &&
        Math.min(x1, x2) <= x && x <= Math.max(x1, x2) && Math.min(y1, y2) <= y && y <= Math.max(y1, y2)) return false;   // on the boundary
    if ((y1 > y) !== (y2 > y) && x < x1 + (y - y1) * (x2 - x1) / (y2 - y1)) res = !res;
  }
  return res;
}
let count = 0;
for (let x = 0; x <= 4; x++) for (let y = 0; y <= 5; y++) if (strictlyInside([x, y], house)) count++;
console.log('brute force interior count:', count);` }, { lang: 'cpp', code: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
typedef vector<array<ll, 2>> Poly;

ll twiceSignedArea(const Poly& p) {
    int n = p.size();
    ll s = 0;
    for (int i = 0; i < n; i++) s += p[i][0] * p[(i + 1) % n][1] - p[(i + 1) % n][0] * p[i][1];
    return s;
}

pair<ll, ll> pick(const Poly& p) {
    int n = p.size();
    ll b = 0;
    for (int i = 0; i < n; i++) b += gcd(llabs(p[(i + 1) % n][0] - p[i][0]), llabs(p[(i + 1) % n][1] - p[i][1]));
    ll a2 = llabs(twiceSignedArea(p));
    return {(a2 - b + 2) / 2, b};      // interior, boundary
}

// brute-force check of Pick's theorem for the house
bool strictlyInside(ll x, ll y, const Poly& poly) {
    bool res = false;
    int n = poly.size();
    for (int i = 0; i < n; i++) {
        auto [x1, y1] = poly[i];
        auto [x2, y2] = poly[(i + 1) % n];
        if ((x2 - x1) * (y - y1) - (y2 - y1) * (x - x1) == 0 && min(x1, x2) <= x && x <= max(x1, x2)
            && min(y1, y2) <= y && y <= max(y1, y2)) return false;      // on the boundary
        if ((y1 > y) != (y2 > y) && (double)x < x1 + (double)(y - y1) * (x2 - x1) / (y2 - y1)) res = !res;
    }
    return res;
}

int main() {
    Poly house = {{0, 0}, {4, 0}, {4, 3}, {2, 5}, {0, 3}};
    ll s = twiceSignedArea(house);
    cout << "2*signed area = " << s << " -> area " << llabs(s) / 2.0 << (s > 0 ? " CCW" : " CW") << endl;
    Poly rev(house.rbegin(), house.rend());
    cout << "clockwise listing gives " << twiceSignedArea(rev) << endl;
    auto [inside, boundary] = pick(house);
    cout << "lattice points inside: " << inside << " on boundary: " << boundary << endl;
    int count = 0;
    for (int x = 0; x <= 4; x++)
        for (int y = 0; y <= 5; y++) count += strictlyInside(x, y, house);
    cout << "brute force interior count: " << count << endl;
}` }, { lang: 'csharp', code: `using System;

class Program {
    static long Gcd(long a, long b) { return b == 0 ? a : Gcd(b, a % b); }

    static long TwiceSignedArea(long[][] p) {
        int n = p.Length;
        long s = 0;
        for (int i = 0; i < n; i++) s += p[i][0] * p[(i + 1) % n][1] - p[(i + 1) % n][0] * p[i][1];
        return s;
    }

    static long[] Pick(long[][] p) {
        int n = p.Length;
        long b = 0;
        for (int i = 0; i < n; i++) b += Gcd(Math.Abs(p[(i + 1) % n][0] - p[i][0]), Math.Abs(p[(i + 1) % n][1] - p[i][1]));
        long a2 = Math.Abs(TwiceSignedArea(p));
        return new[] { (a2 - b + 2) / 2, b };      // interior, boundary
    }

    // brute-force check of Pick's theorem for the house
    static bool StrictlyInside(long x, long y, long[][] poly) {
        bool res = false;
        int n = poly.Length;
        for (int i = 0; i < n; i++) {
            long x1 = poly[i][0], y1 = poly[i][1], x2 = poly[(i + 1) % n][0], y2 = poly[(i + 1) % n][1];
            if ((x2 - x1) * (y - y1) - (y2 - y1) * (x - x1) == 0 && Math.Min(x1, x2) <= x && x <= Math.Max(x1, x2) && Math.Min(y1, y2) <= y && y <= Math.Max(y1, y2))
                return false;                        // on the boundary
            if ((y1 > y) != (y2 > y) && x < x1 + (double)(y - y1) * (x2 - x1) / (y2 - y1))
                res = !res;
        }
        return res;
    }

    static void Main() {
        long[][] house = { new long[] {0, 0}, new long[] {4, 0}, new long[] {4, 3}, new long[] {2, 5}, new long[] {0, 3} };
        long s = TwiceSignedArea(house);
        Console.WriteLine("2*signed area = " + s + " -> area " + Math.Abs(s) / 2.0 + " " + (s > 0 ? "CCW" : "CW"));
        long[][] reversed = (long[][])house.Clone();
        Array.Reverse(reversed);
        Console.WriteLine("clockwise listing gives " + TwiceSignedArea(reversed));
        long[] pick = Pick(house);
        Console.WriteLine("lattice points inside: " + pick[0] + " on boundary: " + pick[1]);
        int count = 0;
        for (long x = 0; x < 5; x++) for (long y = 0; y < 6; y++) if (StrictlyInside(x, y, house)) count++;
        Console.WriteLine("brute force interior count: " + count);
    }
}`, run: true }, { lang: 'java', code: `public class Main {
    static long twiceSignedArea(long[][] p) {
        int n = p.length;
        long s = 0;
        for (int i = 0; i < n; i++) s += p[i][0] * p[(i + 1) % n][1] - p[(i + 1) % n][0] * p[i][1];
        return s;
    }

    static long gcd(long a, long b) { return b == 0 ? a : gcd(b, a % b); }

    static long[] pick(long[][] p) {
        int n = p.length;
        long b = 0;
        for (int i = 0; i < n; i++) b += gcd(Math.abs(p[(i + 1) % n][0] - p[i][0]), Math.abs(p[(i + 1) % n][1] - p[i][1]));
        long a2 = Math.abs(twiceSignedArea(p));
        return new long[]{(a2 - b + 2) / 2, b};      // interior, boundary
    }

    // brute-force check of Pick's theorem for the house
    static boolean strictlyInside(long x, long y, long[][] poly) {
        boolean res = false;
        int n = poly.length;
        for (int i = 0; i < n; i++) {
            long x1 = poly[i][0], y1 = poly[i][1], x2 = poly[(i + 1) % n][0], y2 = poly[(i + 1) % n][1];
            if ((x2 - x1) * (y - y1) - (y2 - y1) * (x - x1) == 0 && Math.min(x1, x2) <= x && x <= Math.max(x1, x2)
                && Math.min(y1, y2) <= y && y <= Math.max(y1, y2)) return false;      // on the boundary
            if ((y1 > y) != (y2 > y) && x < x1 + (double) (y - y1) * (x2 - x1) / (y2 - y1)) res = !res;
        }
        return res;
    }

    public static void main(String[] args) {
        long[][] house = {{0, 0}, {4, 0}, {4, 3}, {2, 5}, {0, 3}};
        long s = twiceSignedArea(house);
        System.out.println("2*signed area = " + s + " -> area " + Math.abs(s) / 2.0 + (s > 0 ? " CCW" : " CW"));
        long[][] rev = new long[house.length][];
        for (int i = 0; i < house.length; i++) rev[i] = house[house.length - 1 - i];
        System.out.println("clockwise listing gives " + twiceSignedArea(rev));
        long[] r = pick(house);
        System.out.println("lattice points inside: " + r[0] + " on boundary: " + r[1]);
        int count = 0;
        for (int x = 0; x <= 4; x++)
            for (int y = 0; y <= 5; y++) if (strictlyInside(x, y, house)) count++;
        System.out.println("brute force interior count: " + count);
    }
}` }] }],
    codeTitle: ['Shoelace, convexity and Pick', 'Point in polygon, exact', 'Shoelace + Pick check (runnable)'],
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
      { title: 'Largest triangle from a few points', html: `<p>Points (0,0), (0,1), (1,0), (0,2), (2,0). Try all triples with |cross|/2: the best is (0,0), (0,2), (2,0) → |2·2 − 0·0| / 2 = <b>2</b>. With N ≤ 50 that is only ~20 000 triples.</p>`, code: { lang: 'java', code: `int[][] p = {{0, 0}, {0, 1}, {1, 0}, {0, 2}, {2, 0}};
long best = 0;
for (int i = 0; i < p.length; i++)
    for (int j = i + 1; j < p.length; j++)
        for (int k = j + 1; k < p.length; k++) {
            long c = (long) (p[j][0] - p[i][0]) * (p[k][1] - p[i][1]) - (long) (p[j][1] - p[i][1]) * (p[k][0] - p[i][0]);
            best = Math.max(best, Math.abs(c));
        }
System.out.println(best / 2.0);   // 2.0`, alt: [{ lang: 'python', code: `p = [(0, 0), (0, 1), (1, 0), (0, 2), (2, 0)]
best = 0
for i in range(len(p)):
    for j in range(i + 1, len(p)):
        for k in range(j + 1, len(p)):
            c = (p[j][0] - p[i][0]) * (p[k][1] - p[i][1]) - (p[j][1] - p[i][1]) * (p[k][0] - p[i][0])
            best = max(best, abs(c))
print(best / 2)   # 2.0` }, { lang: 'js', code: `const p = [[0, 0], [0, 1], [1, 0], [0, 2], [2, 0]];
let best = 0;
for (let i = 0; i < p.length; i++)
  for (let j = i + 1; j < p.length; j++)
    for (let k = j + 1; k < p.length; k++) {
      const c = (p[j][0] - p[i][0]) * (p[k][1] - p[i][1]) - (p[j][1] - p[i][1]) * (p[k][0] - p[i][0]);
      best = Math.max(best, Math.abs(c));
    }
console.log(best / 2);   // 2` }, { lang: 'cpp', code: `int p[][2] = {{0, 0}, {0, 1}, {1, 0}, {0, 2}, {2, 0}};
long long best = 0;
for (int i = 0; i < 5; i++)
    for (int j = i + 1; j < 5; j++)
        for (int k = j + 1; k < 5; k++) {
            long long c = (long long)(p[j][0] - p[i][0]) * (p[k][1] - p[i][1]) - (long long)(p[j][1] - p[i][1]) * (p[k][0] - p[i][0]);
            best = max(best, llabs(c));
        }
cout << best / 2.0 << endl;   // 2` }, { lang: 'csharp', code: `int[][] p = { new[] {0, 0}, new[] {0, 1}, new[] {1, 0}, new[] {0, 2}, new[] {2, 0} };
long best = 0;
for (int i = 0; i < p.Length; i++)
    for (int j = i + 1; j < p.Length; j++)
        for (int k = j + 1; k < p.Length; k++) {
            long c = (long)(p[j][0] - p[i][0]) * (p[k][1] - p[i][1]) - (long)(p[j][1] - p[i][1]) * (p[k][0] - p[i][0]);
            best = Math.Max(best, Math.Abs(c));
        }
Console.WriteLine(best / 2.0);   // 2` }] } }
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
        code: { lang: 'java', code: `class Solution {
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
}`, alt: [{ lang: 'python', code: String.raw`
class Solution:
    def is_convex(self, points):
        n = len(points)
        for i in range(n):
            a, b = points[i], points[(i + 1) % n]
            pos = neg = 0
            for c in points:                          # every vertex vs this edge line
                cr = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
                if cr > 0:
                    pos += 1
                elif cr < 0:
                    neg += 1
            if pos > 0 and neg > 0:
                return False                          # vertices on both sides
        return True` }, { lang: 'js', code: String.raw`
function isConvex(points) {
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const a = points[i], b = points[(i + 1) % n];
    let pos = 0, neg = 0;
    for (let k = 0; k < n; k++) {                     // every vertex vs this edge line
      const c = points[k];
      const cr = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      if (cr > 0) pos++;
      else if (cr < 0) neg++;
    }
    if (pos > 0 && neg > 0) return false;             // vertices on both sides
  }
  return true;
}` }, { lang: 'cpp', code: String.raw`
class Solution {
public:
    bool isConvex(const vector<vector<int>>& points) {
        int n = points.size();
        for (int i = 0; i < n; i++) {
            const vector<int>& a = points[i];
            const vector<int>& b = points[(i + 1) % n];
            int pos = 0, neg = 0;
            for (int k = 0; k < n; k++) {             // every vertex vs this edge line
                const vector<int>& c = points[k];
                long long cr = (long long)(b[0] - a[0]) * (c[1] - a[1])
                             - (long long)(b[1] - a[1]) * (c[0] - a[0]);
                if (cr > 0) pos++;
                else if (cr < 0) neg++;
            }
            if (pos > 0 && neg > 0) return false;     // vertices on both sides
        }
        return true;
    }
};` }, { lang: 'csharp', code: `public class Solution {
    public bool IsConvex(IList<IList<int>> points) {
        int n = points.Count;
        for (int i = 0; i < n; i++) {
            IList<int> a = points[i], b = points[(i + 1) % n];
            int pos = 0, neg = 0;
            for (int k = 0; k < n; k++) {               // every vertex vs this edge line
                IList<int> c = points[k];
                long cr = (long)(b[0] - a[0]) * (c[1] - a[1])
                        - (long)(b[1] - a[1]) * (c[0] - a[0]);
                if (cr > 0) pos++;
                else if (cr < 0) neg++;
            }
            if (pos > 0 && neg > 0) return false;      // vertices on both sides
        }
        return true;
    }
}` }] }
      },
      mcq: { q: 'Walking the polygon you see turn signs: −, −, 0, −, −. Is it convex?', options: ['No — a zero means a dent', 'Yes — zeros are straight angles; all non-zero turns agree', 'Only if N is even', 'Cannot tell without the area'], answer: 1, explain: 'A zero cross product is a 180° angle (collinear vertices). Convexity only fails when both a positive and a negative turn appear.' },
      hints: [
        `<p>Hint 1: In a convex polygon you turn the same way at every corner (all left if CCW, all right if CW). A dent is a turn the other way.</p>`,
        `<p>Hint 2: For each i compute cross(P<sub>i</sub>, P<sub>i+1</sub>, P<sub>i+2</sub>) with indices mod N. Remember the first non-zero sign.</p>`,
        `<p>Hint 3: Skip zeros (straight angles). If any later non-zero sign differs from the remembered one → false. Use 64-bit integers. Don't forget the two wrap-around triples (N−2, N−1, 0) and (N−1, 0, 1).</p>`
      ],
      tests: {
        sig: 'list<list<int>> -> bool',
        fn: 'isConvex',
        cases: [
          [[[[0, 0], [0, 5], [5, 5], [5, 0]]], true],
          [[[[0, 0], [0, 10], [10, 10], [10, 0], [5, 5]]], false],
          [[[[0, 0], [4, 0], [2, 3]]], true],
          [[[[0, 0], [2, 3], [4, 0]]], true],
          [[[[0, 0], [1, 0], [2, 0], [2, 2], [0, 2]]], true],
          [[[[0, 0], [1, 0], [2, 0], [2, 2], [1, 1], [0, 2]]], false],
          [[[[0, 0], [3, 0], [3, 3], [1, 1], [0, 3]]], false],
          [[[[0, 0], [4, 0], [8, 0], [8, 4], [8, 8], [4, 8], [0, 8], [0, 4]]], true],
          [[[[-10000, -10000], [10000, -10000], [10000, 10000], [-10000, 10000]]], true],
          [[[[-10000, -10000], [10000, -10000], [10000, 10000], [0, 9999], [-10000, 10000]]], false],
          [[[[0, 0], [10, 0], [10, 10], [6, 10], [5, 3], [4, 10], [0, 10]]], false],
          [[[[0, 0], [5, -3], [10, 0], [13, 5], [10, 10], [5, 13], [0, 10], [-3, 5]]], true],
          [[[[0, 0], [5, -3], [10, 0], [13, 5], [10, 10], [5, 8], [0, 10], [-3, 5]]], false],
          [
            [
              [
                [0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0],
                [12, 0], [13, 0], [14, 0], [15, 0], [16, 0], [17, 0], [18, 0], [19, 0], [20, 0], [21, 0], [22, 0],
                [23, 0], [24, 0], [25, 0], [26, 0], [27, 0], [28, 0], [29, 0], [30, 0], [31, 0], [32, 0], [33, 0],
                [34, 0], [35, 0], [36, 0], [37, 0], [38, 0], [39, 0], [40, 0], [41, 0], [42, 0], [43, 0], [44, 0],
                [45, 0], [46, 0], [47, 0], [48, 0], [49, 0], [50, 0], [51, 0], [52, 0], [53, 0], [54, 0], [55, 0],
                [56, 0], [57, 0], [58, 0], [59, 0], [60, 0], [61, 0], [62, 0], [63, 0], [64, 0], [65, 0], [66, 0],
                [67, 0], [68, 0], [69, 0], [70, 0], [71, 0], [72, 0], [73, 0], [74, 0], [75, 0], [76, 0], [77, 0],
                [78, 0], [79, 0], [80, 0], [81, 0], [82, 0], [83, 0], [84, 0], [85, 0], [86, 0], [87, 0], [88, 0],
                [89, 0], [90, 0], [91, 0], [92, 0], [93, 0], [94, 0], [95, 0], [96, 0], [97, 0], [98, 0], [99, 0],
                [100, 0], [100, 1], [100, 2], [100, 3], [100, 4], [100, 5], [100, 6], [100, 7], [100, 8], [100, 9],
                [100, 10], [100, 11], [100, 12], [100, 13], [100, 14], [100, 15], [100, 16], [100, 17], [100, 18],
                [100, 19], [100, 20], [100, 21], [100, 22], [100, 23], [100, 24], [100, 25], [100, 26], [100, 27],
                [100, 28], [100, 29], [100, 30], [100, 31], [100, 32], [100, 33], [100, 34], [100, 35], [100, 36],
                [100, 37], [100, 38], [100, 39], [100, 40], [100, 41], [100, 42], [100, 43], [100, 44], [100, 45],
                [100, 46], [100, 47], [100, 48], [100, 49], [100, 50], [100, 51], [100, 52], [100, 53], [100, 54],
                [100, 55], [100, 56], [100, 57], [100, 58], [100, 59], [100, 60], [100, 61], [100, 62], [100, 63],
                [100, 64], [100, 65], [100, 66], [100, 67], [100, 68], [100, 69], [100, 70], [100, 71], [100, 72],
                [100, 73], [100, 74], [100, 75], [100, 76], [100, 77], [100, 78], [100, 79], [100, 80], [100, 81],
                [100, 82], [100, 83], [100, 84], [100, 85], [100, 86], [100, 87], [100, 88], [100, 89], [100, 90],
                [100, 91], [100, 92], [100, 93], [100, 94], [100, 95], [100, 96], [100, 97], [100, 98], [100, 99],
                [100, 100], [99, 100], [98, 100], [97, 100], [96, 100], [95, 100], [94, 100], [93, 100], [92, 100],
                [91, 100], [90, 100], [89, 100], [88, 100], [87, 100], [86, 100], [85, 100], [84, 100], [83, 100],
                [82, 100], [81, 100], [80, 100], [79, 100], [78, 100], [77, 100], [76, 100], [75, 100], [74, 100],
                [73, 100], [72, 100], [71, 100], [70, 100], [69, 100], [68, 100], [67, 100], [66, 100], [65, 100],
                [64, 100], [63, 100], [62, 100], [61, 100], [60, 100], [59, 100], [58, 100], [57, 100], [56, 100],
                [55, 100], [54, 100], [53, 100], [52, 100], [51, 100], [50, 100], [49, 100], [48, 100], [47, 100],
                [46, 100], [45, 100], [44, 100], [43, 100], [42, 100], [41, 100], [40, 100], [39, 100], [38, 100],
                [37, 100], [36, 100], [35, 100], [34, 100], [33, 100], [32, 100], [31, 100], [30, 100], [29, 100],
                [28, 100], [27, 100], [26, 100], [25, 100], [24, 100], [23, 100], [22, 100], [21, 100], [20, 100],
                [19, 100], [18, 100], [17, 100], [16, 100], [15, 100], [14, 100], [13, 100], [12, 100], [11, 100],
                [10, 100], [9, 100], [8, 100], [7, 100], [6, 100], [5, 100], [4, 100], [3, 100], [2, 100], [1, 100],
                [0, 100], [0, 99], [0, 98], [0, 97], [0, 96], [0, 95], [0, 94], [0, 93], [0, 92], [0, 91], [0, 90],
                [0, 89], [0, 88], [0, 87], [0, 86], [0, 85], [0, 84], [0, 83], [0, 82], [0, 81], [0, 80], [0, 79],
                [0, 78], [0, 77], [0, 76], [0, 75], [0, 74], [0, 73], [0, 72], [0, 71], [0, 70], [0, 69], [0, 68],
                [0, 67], [0, 66], [0, 65], [0, 64], [0, 63], [0, 62], [0, 61], [0, 60], [0, 59], [0, 58], [0, 57],
                [0, 56], [0, 55], [0, 54], [0, 53], [0, 52], [0, 51], [0, 50], [0, 49], [0, 48], [0, 47], [0, 46],
                [0, 45], [0, 44], [0, 43], [0, 42], [0, 41], [0, 40], [0, 39], [0, 38], [0, 37], [0, 36], [0, 35],
                [0, 34], [0, 33], [0, 32], [0, 31], [0, 30], [0, 29], [0, 28], [0, 27], [0, 26], [0, 25], [0, 24],
                [0, 23], [0, 22], [0, 21], [0, 20], [0, 19], [0, 18], [0, 17], [0, 16], [0, 15], [0, 14], [0, 13],
                [0, 12], [0, 11], [0, 10], [0, 9], [0, 8], [0, 7], [0, 6], [0, 5], [0, 4], [0, 3], [0, 2], [0, 1]
              ]
            ],
            true
          ],
          [
            [
              [
                [0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0],
                [12, 0], [13, 0], [14, 0], [15, 0], [16, 0], [17, 0], [18, 0], [19, 0], [20, 0], [21, 0], [22, 0],
                [23, 0], [24, 0], [25, 0], [26, 0], [27, 0], [28, 0], [29, 0], [30, 0], [31, 0], [32, 0], [33, 0],
                [34, 0], [35, 0], [36, 0], [37, 0], [38, 0], [39, 0], [40, 0], [41, 0], [42, 0], [43, 0], [44, 0],
                [45, 0], [46, 0], [47, 0], [48, 0], [49, 0], [50, 1], [51, 0], [52, 0], [53, 0], [54, 0], [55, 0],
                [56, 0], [57, 0], [58, 0], [59, 0], [60, 0], [61, 0], [62, 0], [63, 0], [64, 0], [65, 0], [66, 0],
                [67, 0], [68, 0], [69, 0], [70, 0], [71, 0], [72, 0], [73, 0], [74, 0], [75, 0], [76, 0], [77, 0],
                [78, 0], [79, 0], [80, 0], [81, 0], [82, 0], [83, 0], [84, 0], [85, 0], [86, 0], [87, 0], [88, 0],
                [89, 0], [90, 0], [91, 0], [92, 0], [93, 0], [94, 0], [95, 0], [96, 0], [97, 0], [98, 0], [99, 0],
                [100, 0], [100, 1], [100, 2], [100, 3], [100, 4], [100, 5], [100, 6], [100, 7], [100, 8], [100, 9],
                [100, 10], [100, 11], [100, 12], [100, 13], [100, 14], [100, 15], [100, 16], [100, 17], [100, 18],
                [100, 19], [100, 20], [100, 21], [100, 22], [100, 23], [100, 24], [100, 25], [100, 26], [100, 27],
                [100, 28], [100, 29], [100, 30], [100, 31], [100, 32], [100, 33], [100, 34], [100, 35], [100, 36],
                [100, 37], [100, 38], [100, 39], [100, 40], [100, 41], [100, 42], [100, 43], [100, 44], [100, 45],
                [100, 46], [100, 47], [100, 48], [100, 49], [100, 50], [100, 51], [100, 52], [100, 53], [100, 54],
                [100, 55], [100, 56], [100, 57], [100, 58], [100, 59], [100, 60], [100, 61], [100, 62], [100, 63],
                [100, 64], [100, 65], [100, 66], [100, 67], [100, 68], [100, 69], [100, 70], [100, 71], [100, 72],
                [100, 73], [100, 74], [100, 75], [100, 76], [100, 77], [100, 78], [100, 79], [100, 80], [100, 81],
                [100, 82], [100, 83], [100, 84], [100, 85], [100, 86], [100, 87], [100, 88], [100, 89], [100, 90],
                [100, 91], [100, 92], [100, 93], [100, 94], [100, 95], [100, 96], [100, 97], [100, 98], [100, 99],
                [100, 100], [99, 100], [98, 100], [97, 100], [96, 100], [95, 100], [94, 100], [93, 100], [92, 100],
                [91, 100], [90, 100], [89, 100], [88, 100], [87, 100], [86, 100], [85, 100], [84, 100], [83, 100],
                [82, 100], [81, 100], [80, 100], [79, 100], [78, 100], [77, 100], [76, 100], [75, 100], [74, 100],
                [73, 100], [72, 100], [71, 100], [70, 100], [69, 100], [68, 100], [67, 100], [66, 100], [65, 100],
                [64, 100], [63, 100], [62, 100], [61, 100], [60, 100], [59, 100], [58, 100], [57, 100], [56, 100],
                [55, 100], [54, 100], [53, 100], [52, 100], [51, 100], [50, 100], [49, 100], [48, 100], [47, 100],
                [46, 100], [45, 100], [44, 100], [43, 100], [42, 100], [41, 100], [40, 100], [39, 100], [38, 100],
                [37, 100], [36, 100], [35, 100], [34, 100], [33, 100], [32, 100], [31, 100], [30, 100], [29, 100],
                [28, 100], [27, 100], [26, 100], [25, 100], [24, 100], [23, 100], [22, 100], [21, 100], [20, 100],
                [19, 100], [18, 100], [17, 100], [16, 100], [15, 100], [14, 100], [13, 100], [12, 100], [11, 100],
                [10, 100], [9, 100], [8, 100], [7, 100], [6, 100], [5, 100], [4, 100], [3, 100], [2, 100], [1, 100],
                [0, 100], [0, 99], [0, 98], [0, 97], [0, 96], [0, 95], [0, 94], [0, 93], [0, 92], [0, 91], [0, 90],
                [0, 89], [0, 88], [0, 87], [0, 86], [0, 85], [0, 84], [0, 83], [0, 82], [0, 81], [0, 80], [0, 79],
                [0, 78], [0, 77], [0, 76], [0, 75], [0, 74], [0, 73], [0, 72], [0, 71], [0, 70], [0, 69], [0, 68],
                [0, 67], [0, 66], [0, 65], [0, 64], [0, 63], [0, 62], [0, 61], [0, 60], [0, 59], [0, 58], [0, 57],
                [0, 56], [0, 55], [0, 54], [0, 53], [0, 52], [0, 51], [0, 50], [0, 49], [0, 48], [0, 47], [0, 46],
                [0, 45], [0, 44], [0, 43], [0, 42], [0, 41], [0, 40], [0, 39], [0, 38], [0, 37], [0, 36], [0, 35],
                [0, 34], [0, 33], [0, 32], [0, 31], [0, 30], [0, 29], [0, 28], [0, 27], [0, 26], [0, 25], [0, 24],
                [0, 23], [0, 22], [0, 21], [0, 20], [0, 19], [0, 18], [0, 17], [0, 16], [0, 15], [0, 14], [0, 13],
                [0, 12], [0, 11], [0, 10], [0, 9], [0, 8], [0, 7], [0, 6], [0, 5], [0, 4], [0, 3], [0, 2], [0, 1]
              ]
            ],
            false
          ],
          [
            [
              [
                [0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0],
                [12, 0], [13, 0], [14, 0], [15, 0], [16, 0], [17, 0], [18, 0], [19, 0], [20, 0], [21, 0], [22, 0],
                [23, 0], [24, 0], [25, 0], [26, 0], [27, 0], [28, 0], [29, 0], [30, 0], [31, 0], [32, 0], [33, 0],
                [34, 0], [35, 0], [36, 0], [37, 0], [38, 0], [39, 0], [40, 0], [41, 0], [42, 0], [43, 0], [44, 0],
                [45, 0], [46, 0], [47, 0], [48, 0], [49, 0], [50, 0], [51, 0], [52, 0], [53, 0], [54, 0], [55, 0],
                [56, 0], [57, 0], [58, 0], [59, 0], [60, 0], [61, 0], [62, 0], [63, 0], [64, 0], [65, 0], [66, 0],
                [67, 0], [68, 0], [69, 0], [70, 0], [71, 0], [72, 0], [73, 0], [74, 0], [75, 0], [76, 0], [77, 0],
                [78, 0], [79, 0], [80, 0], [81, 0], [82, 0], [83, 0], [84, 0], [85, 0], [86, 0], [87, 0], [88, 0],
                [89, 0], [90, 0], [91, 0], [92, 0], [93, 0], [94, 0], [95, 0], [96, 0], [97, 0], [98, 0], [99, 0],
                [100, 0], [100, 1], [100, 2], [100, 3], [100, 4], [100, 5], [100, 6], [100, 7], [100, 8], [100, 9],
                [100, 10], [100, 11], [100, 12], [100, 13], [100, 14], [100, 15], [100, 16], [100, 17], [100, 18],
                [100, 19], [100, 20], [100, 21], [100, 22], [100, 23], [100, 24], [100, 25], [100, 26], [100, 27],
                [100, 28], [100, 29], [100, 30], [100, 31], [100, 32], [100, 33], [100, 34], [100, 35], [100, 36],
                [100, 37], [100, 38], [100, 39], [100, 40], [100, 41], [100, 42], [100, 43], [100, 44], [100, 45],
                [100, 46], [100, 47], [100, 48], [100, 49], [99, 50], [100, 51], [100, 52], [100, 53], [100, 54],
                [100, 55], [100, 56], [100, 57], [100, 58], [100, 59], [100, 60], [100, 61], [100, 62], [100, 63],
                [100, 64], [100, 65], [100, 66], [100, 67], [100, 68], [100, 69], [100, 70], [100, 71], [100, 72],
                [100, 73], [100, 74], [100, 75], [100, 76], [100, 77], [100, 78], [100, 79], [100, 80], [100, 81],
                [100, 82], [100, 83], [100, 84], [100, 85], [100, 86], [100, 87], [100, 88], [100, 89], [100, 90],
                [100, 91], [100, 92], [100, 93], [100, 94], [100, 95], [100, 96], [100, 97], [100, 98], [100, 99],
                [100, 100], [99, 100], [98, 100], [97, 100], [96, 100], [95, 100], [94, 100], [93, 100], [92, 100],
                [91, 100], [90, 100], [89, 100], [88, 100], [87, 100], [86, 100], [85, 100], [84, 100], [83, 100],
                [82, 100], [81, 100], [80, 100], [79, 100], [78, 100], [77, 100], [76, 100], [75, 100], [74, 100],
                [73, 100], [72, 100], [71, 100], [70, 100], [69, 100], [68, 100], [67, 100], [66, 100], [65, 100],
                [64, 100], [63, 100], [62, 100], [61, 100], [60, 100], [59, 100], [58, 100], [57, 100], [56, 100],
                [55, 100], [54, 100], [53, 100], [52, 100], [51, 100], [50, 100], [49, 100], [48, 100], [47, 100],
                [46, 100], [45, 100], [44, 100], [43, 100], [42, 100], [41, 100], [40, 100], [39, 100], [38, 100],
                [37, 100], [36, 100], [35, 100], [34, 100], [33, 100], [32, 100], [31, 100], [30, 100], [29, 100],
                [28, 100], [27, 100], [26, 100], [25, 100], [24, 100], [23, 100], [22, 100], [21, 100], [20, 100],
                [19, 100], [18, 100], [17, 100], [16, 100], [15, 100], [14, 100], [13, 100], [12, 100], [11, 100],
                [10, 100], [9, 100], [8, 100], [7, 100], [6, 100], [5, 100], [4, 100], [3, 100], [2, 100], [1, 100],
                [0, 100], [0, 99], [0, 98], [0, 97], [0, 96], [0, 95], [0, 94], [0, 93], [0, 92], [0, 91], [0, 90],
                [0, 89], [0, 88], [0, 87], [0, 86], [0, 85], [0, 84], [0, 83], [0, 82], [0, 81], [0, 80], [0, 79],
                [0, 78], [0, 77], [0, 76], [0, 75], [0, 74], [0, 73], [0, 72], [0, 71], [0, 70], [0, 69], [0, 68],
                [0, 67], [0, 66], [0, 65], [0, 64], [0, 63], [0, 62], [0, 61], [0, 60], [0, 59], [0, 58], [0, 57],
                [0, 56], [0, 55], [0, 54], [0, 53], [0, 52], [0, 51], [0, 50], [0, 49], [0, 48], [0, 47], [0, 46],
                [0, 45], [0, 44], [0, 43], [0, 42], [0, 41], [0, 40], [0, 39], [0, 38], [0, 37], [0, 36], [0, 35],
                [0, 34], [0, 33], [0, 32], [0, 31], [0, 30], [0, 29], [0, 28], [0, 27], [0, 26], [0, 25], [0, 24],
                [0, 23], [0, 22], [0, 21], [0, 20], [0, 19], [0, 18], [0, 17], [0, 16], [0, 15], [0, 14], [0, 13],
                [0, 12], [0, 11], [0, 10], [0, 9], [0, 8], [0, 7], [0, 6], [0, 5], [0, 4], [0, 3], [0, 2], [0, 1]
              ]
            ],
            false
          ]
        ]
      },
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
    def is_convex(self, points):
        n, sign = len(points), 0
        for i in range(n):
            (ax, ay), (bx, by), (cx, cy) = points[i], points[(i + 1) % n], points[(i + 2) % n]
            cr = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)
            if cr == 0:
                continue                      # straight angle: allowed
            s = 1 if cr > 0 else -1
            if sign == 0:
                sign = s                      # first real turn fixes the direction
            elif s != sign:
                return False                  # turned the other way: dent
        return True` }, { lang: 'js', code: `function isConvex(points) {
  const n = points.length;
  let sign = 0;
  for (let i = 0; i < n; i++) {
    const a = points[i], b = points[(i + 1) % n], c = points[(i + 2) % n];
    const cr = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    if (cr === 0) continue;                 // straight angle: allowed
    const s = Math.sign(cr);
    if (sign === 0) sign = s;               // first real turn fixes the direction
    else if (s !== sign) return false;      // turned the other way: dent
  }
  return true;
}` }, { lang: 'cpp', code: `class Solution {
public:
    bool isConvex(const vector<vector<int>>& points) {
        int n = points.size(), sign = 0;
        for (int i = 0; i < n; i++) {
            const auto &a = points[i], &b = points[(i + 1) % n], &c = points[(i + 2) % n];
            long long cr = (long long)(b[0] - a[0]) * (c[1] - a[1]) - (long long)(b[1] - a[1]) * (c[0] - a[0]);
            if (cr == 0) continue;                  // straight angle: allowed
            int s = cr > 0 ? 1 : -1;
            if (sign == 0) sign = s;                // first real turn fixes the direction
            else if (s != sign) return false;       // turned the other way: dent
        }
        return true;
    }
};` }, { lang: 'csharp', code: `public class Solution {
    public bool IsConvex(IList<IList<int>> points) {
        int n = points.Count, sign = 0;
        for (int i = 0; i < n; i++) {
            IList<int> a = points[i], b = points[(i + 1) % n], c = points[(i + 2) % n];
            long cr = (long)(b[0] - a[0]) * (c[1] - a[1])
                    - (long)(b[1] - a[1]) * (c[0] - a[0]);
            int s = Math.Sign(cr);
            if (s == 0) continue;                 // straight angle: allowed
            if (sign == 0) sign = s;              // first real turn fixes the direction
            else if (s != sign) return false;     // turned the other way: dent
        }
        return true;
    }
}` }],
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
      '"Each element must have <b>equal probability</b>" + "O(1) extra space" → reservoir, not copying everything into a list or array.',
      '"Sample proportional to <b>weights</b> from a stream" → weighted reservoir (A-Res: key = u<sup>1/w</sup>, keep the k largest).',
      'Follow-up "What if the stream is <b>distributed</b> across machines?" → sample per shard, then merge reservoirs weighted by shard counts.'
    ],
    code: [{ lang: 'java', code: `
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
      }`, alt: [{ lang: 'python', code: `import random

# Algorithm R: k uniform samples from an iterable of unknown length, O(k) memory.
def reservoir_sample(stream, k, rnd=random):
    res = []
    for i, item in enumerate(stream):            # i = number of items seen before this one
        if i < k:
            res.append(item)                     # fill phase
        else:
            j = rnd.randint(0, i)                # uniform in [0, i], both ends included
            if j < k:
                res[j] = item                    # enter with prob k/(i+1), evict a random member
    return res                                   # fewer than k items if the stream was short` }, { lang: 'js', code: `// Algorithm R: k uniform samples from an iterable of unknown length, O(k) memory.
function reservoirSample(stream, k, randInt = (n) => Math.floor(Math.random() * n)) {
  const res = [];
  let i = 0;                                     // number of items seen so far
  for (const item of stream) {
    if (i < k) {
      res.push(item);                            // fill phase
    } else {
      const j = randInt(i + 1);                  // uniform in [0, i]
      if (j < k) res[j] = item;                  // enter with prob k/(i+1), evict a random member
    }
    i++;
  }
  return res;                                    // fewer than k items if the stream was short
}` }, { lang: 'cpp', code: `// Algorithm R: k uniform samples from a one-pass range of unknown length, O(k) memory.
template <class It, class T = typename iterator_traits<It>::value_type>
vector<T> reservoirSample(It first, It last, int k, mt19937& rng) {
    vector<T> res;
    res.reserve(k);
    int i = 0;                                   // number of items seen so far
    for (; first != last; ++first, ++i) {
        if (i < k) {
            res.push_back(*first);               // fill phase
        } else {
            int j = uniform_int_distribution<int>(0, i)(rng);   // uniform in [0, i]
            if (j < k) res[j] = *first;          // enter with prob k/(i+1), evict a random member
        }
    }
    return res;                                  // fewer than k items if the stream was short
}` }, { lang: 'csharp', code: `// Algorithm R: k uniform samples from a sequence of unknown length, O(k) memory.
static List<T> ReservoirSample<T>(IEnumerable<T> stream, int k, Random rnd) {
    var res = new List<T>(k);
    int i = 0;                                   // number of items seen so far
    foreach (T item in stream) {
        if (i < k) {
            res.Add(item);                       // fill phase
        } else {
            int j = rnd.Next(i + 1);             // uniform in [0, i]  (Next has no modulo bias)
            if (j < k) res[j] = item;            // enter with prob k/(i+1), evict a random member
        }
        i++;
    }
    return res;                                  // fewer than k items if the stream was short
}` }] }, { lang: 'java', code: `
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
      }`, alt: [{ lang: 'python', code: `import heapq
import random

# Weighted reservoir (Efraimidis-Spirakis "A-Res"): item with weight w gets key u^(1/w),
# u uniform in (0,1); keep the k LARGEST keys. Heavier items tend to get larger keys.
def weighted_sample(items, w, k, rnd=random):
    heap = []                                    # min-heap of (key, index): the smallest kept key on top
    for i, item in enumerate(items):
        u = 1.0 - rnd.random()                   # (0, 1], avoids pow of 0
        key = u ** (1.0 / w[i])
        if len(heap) < k:
            heapq.heappush(heap, (key, i))
        elif key > heap[0][0]:
            heapq.heapreplace(heap, (key, i))    # pop the smallest, push the new one
    return [items[i] for _, i in heap]` }, { lang: 'js', code: `// Small binary min-heap (JS has none built in); cmp(a, b) < 0 means a comes out first.
class MinHeap {
  constructor(cmp = (a, b) => a - b) { this.a = []; this.cmp = cmp; }
  size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    for (let i = a.length - 1; i > 0;) {
      const p = (i - 1) >> 1;
      if (this.cmp(a[i], a[p]) >= 0) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length > 0) {
      a[0] = last;
      for (let i = 0;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.cmp(a[l], a[m]) < 0) m = l;
        if (r < a.length && this.cmp(a[r], a[m]) < 0) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

// Weighted reservoir (Efraimidis-Spirakis "A-Res"): item with weight w gets key u^(1/w),
// u uniform in (0,1); keep the k LARGEST keys. Heavier items tend to get larger keys.
function weightedSample(items, w, k) {
  const heap = new MinHeap((a, b) => a[0] - b[0]);       // smallest kept key on top
  for (let i = 0; i < items.length; i++) {
    const u = 1.0 - Math.random();                       // (0, 1], avoids pow of 0
    const key = Math.pow(u, 1.0 / w[i]);
    if (heap.size() < k) heap.push([key, i]);
    else if (key > heap.peek()[0]) { heap.pop(); heap.push([key, i]); }
  }
  return heap.a.map(([, i]) => items[i]);
}` }, { lang: 'cpp', code: `// Weighted reservoir (Efraimidis-Spirakis "A-Res"): item with weight w gets key u^(1/w),
// u uniform in (0,1); keep the k LARGEST keys. Heavier items tend to get larger keys.
vector<string> weightedSample(const vector<string>& items, const vector<double>& w, int k, mt19937& rng) {
    using KeyIdx = pair<double, int>;
    priority_queue<KeyIdx, vector<KeyIdx>, greater<KeyIdx>> heap;   // min-heap: smallest kept key on top
    uniform_real_distribution<double> unit(0.0, 1.0);
    for (int i = 0; i < (int)items.size(); i++) {
        double u = 1.0 - unit(rng);                      // (0, 1], avoids pow of 0
        double key = pow(u, 1.0 / w[i]);
        if ((int)heap.size() < k) heap.push({key, i});
        else if (key > heap.top().first) { heap.pop(); heap.push({key, i}); }
    }
    vector<string> out;
    for (; !heap.empty(); heap.pop()) out.push_back(items[heap.top().second]);
    return out;
}` }, { lang: 'csharp', code: `// Weighted reservoir (Efraimidis-Spirakis "A-Res"): item with weight w gets key u^(1/w),
// u uniform in (0,1); keep the k LARGEST keys. Heavier items tend to get larger keys.
static List<string> WeightedSample(string[] items, double[] w, int k, Random rnd) {
    var heap = new SortedSet<(double key, int i)>();            // ordered set as a min-heap by key
    for (int i = 0; i < items.Length; i++) {
        double u = 1.0 - rnd.NextDouble();                      // (0, 1], avoids log/pow of 0
        double key = Math.Pow(u, 1.0 / w[i]);
        if (heap.Count < k) heap.Add((key, i));
        else if (key > heap.Min.key) { heap.Remove(heap.Min); heap.Add((key, i)); }
    }
    var result = new List<string>();
    foreach (var e in heap) result.Add(items[e.i]);
    return result;
}` }] }, { lang: 'python', run: true, code: `import random

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
print("wrong 'coin flip' variant:", [round(c / trials, 3) for c in count])`, alt: [{ lang: 'js', run: true, code: `// Small seeded generator so the output is reproducible (mulberry32).
function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function reservoir(stream, k, rand) {
  const res = [];
  stream.forEach((x, i) => {
    if (i < k) res.push(x);
    else {
      const j = Math.floor(rand() * (i + 1));   // uniform in [0, i], both ends included
      if (j < k) res[j] = x;
    }
  });
  return res;
}

const rand = makeRng(2026);                    // fixed seed -> reproducible
const n = 6, k = 2, trials = 60000;
let count = new Array(n).fill(0);
for (let t = 0; t < trials; t++) {
  for (const x of reservoir([...Array(n).keys()], k, rand)) count[x]++;
}
console.log('expected frequency k/n =', (k / n).toFixed(4));
for (let x = 0; x < n; x++) console.log('item', x, 'chosen', (count[x] / trials).toFixed(4));

// A WRONG variant: replace with probability 1/2 every time -> late items dominate
count = new Array(n).fill(0);
for (let t = 0; t < trials; t++) {
  let pick = 0;
  for (let x = 1; x < n; x++) if (rand() < 0.5) pick = x;
  count[pick]++;
}
console.log("wrong 'coin flip' variant:", '[' + count.map((c) => (c / trials).toFixed(3)).join(', ') + ']');` }, { lang: 'cpp', code: `#include <bits/stdc++.h>
using namespace std;

vector<int> reservoir(int n, int k, mt19937& rng) {
    vector<int> res;
    for (int i = 0; i < n; i++) {                // the stream is 0, 1, ..., n-1
        if (i < k) res.push_back(i);
        else {
            int j = uniform_int_distribution<int>(0, i)(rng);   // inclusive on both ends
            if (j < k) res[j] = i;
        }
    }
    return res;
}

int main() {
    mt19937 rng(2026);                           // fixed seed -> reproducible
    int n = 6, k = 2, trials = 60000;
    vector<int> count(n, 0);
    for (int t = 0; t < trials; t++)
        for (int x : reservoir(n, k, rng)) count[x]++;
    cout << fixed << setprecision(4) << "expected frequency k/n = " << (double)k / n << endl;
    for (int x = 0; x < n; x++) cout << "item " << x << " chosen " << (double)count[x] / trials << endl;

    // A WRONG variant: replace with probability 1/2 every time -> late items dominate
    fill(count.begin(), count.end(), 0);
    uniform_real_distribution<double> unit(0.0, 1.0);
    for (int t = 0; t < trials; t++) {
        int pick = 0;
        for (int x = 1; x < n; x++) if (unit(rng) < 0.5) pick = x;
        count[pick]++;
    }
    cout << setprecision(3) << "wrong 'coin flip' variant:";
    for (int c : count) cout << " " << (double)c / trials;
    cout << endl;
}` }, { lang: 'csharp', code: `using System;
using System.Collections.Generic;
using System.Linq;

class Program {
    static List<int> Reservoir(IEnumerable<int> stream, int k, Random rnd) {
        var res = new List<int>();
        int i = 0;
        foreach (int x in stream) {
            if (i < k) res.Add(x);
            else {
                int j = rnd.Next(i + 1);         // uniform in [0, i]
                if (j < k) res[j] = x;
            }
            i++;
        }
        return res;
    }

    static void Main() {
        var rnd = new Random(2026);              // fixed seed -> reproducible
        int n = 6, k = 2, trials = 60000;
        int[] count = new int[n];
        for (int t = 0; t < trials; t++)
            foreach (int x in Reservoir(Enumerable.Range(0, n), k, rnd)) count[x]++;
        Console.WriteLine("expected frequency k/n = " + Math.Round((double)k / n, 4));
        for (int x = 0; x < n; x++)
            Console.WriteLine("item " + x + " chosen " + Math.Round((double)count[x] / trials, 4));

        // A WRONG variant: replace with probability 1/2 every time -> late items dominate
        count = new int[n];
        for (int t = 0; t < trials; t++) {
            int pick = 0;
            for (int x = 1; x < n; x++) if (rnd.NextDouble() < 0.5) pick = x;
            count[pick]++;
        }
        Console.WriteLine("wrong 'coin flip' variant: [" + string.Join(", ", count.Select(c => Math.Round((double)c / trials, 3))) + "]");
    }
}`, run: true }, { lang: 'java', code: `public class Main {
    static List<Integer> reservoir(int n, int k, Random rnd) {
        List<Integer> res = new ArrayList<>();
        for (int i = 0; i < n; i++) {                // the stream is 0, 1, ..., n-1
            if (i < k) res.add(i);
            else {
                int j = rnd.nextInt(i + 1);          // inclusive on both ends
                if (j < k) res.set(j, i);
            }
        }
        return res;
    }

    public static void main(String[] args) {
        Random rnd = new Random(2026);               // fixed seed -> reproducible
        int n = 6, k = 2, trials = 60000;
        int[] count = new int[n];
        for (int t = 0; t < trials; t++)
            for (int x : reservoir(n, k, rnd)) count[x]++;
        System.out.printf("expected frequency k/n = %.4f%n", (double) k / n);
        for (int x = 0; x < n; x++) System.out.printf("item %d chosen %.4f%n", x, (double) count[x] / trials);

        // A WRONG variant: replace with probability 1/2 every time -> late items dominate
        count = new int[n];
        for (int t = 0; t < trials; t++) {
            int pick = 0;
            for (int x = 1; x < n; x++) if (rnd.nextDouble() < 0.5) pick = x;
            count[pick]++;
        }
        StringBuilder sb = new StringBuilder("wrong 'coin flip' variant:");
        for (int c : count) sb.append(String.format(" %.3f", (double) c / trials));
        System.out.println(sb);
    }
}` }] }],
    codeTitle: ['Algorithm R', 'Weighted reservoir A-Res', 'Fair vs unfair, measured (runnable)'],
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
                { type: 'code', lang: 'java', label: 'line running', code: 'int j = rnd.nextInt(i + 1);\nif (j < k) res.set(j, item);', hl: ok ? { 2: 'ok' } : { 1: 'cur' }, alt: RESERVOIR_ALT }] });
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
      { title: 'Random Pick Index on a huge array', html: `<p>nums = [1, 2, 3, 3, 3], target = 3. Run the reservoir only over positions where nums[i] == target: count c = 1 at i=2 (keep 2), c = 2 at i=3 (keep 3 with prob ½), c = 3 at i=4 (keep 4 with prob ⅓). Each of 2, 3, 4 is returned with probability ⅓ using O(1) extra space.</p>`, code: { lang: 'java', code: `int[] nums = {1, 2, 3, 3, 3};
int target = 3, count = 0, pick = -1;
Random rnd = new Random(1);
for (int i = 0; i < nums.length; i++) {
    if (nums[i] != target) continue;
    count++;
    if (rnd.nextInt(count) == 0) pick = i;   // keep with probability 1/count
}
System.out.println(pick);`, alt: [{ lang: 'python', code: `import random

nums = [1, 2, 3, 3, 3]
target, count, pick = 3, 0, -1
rnd = random.Random(1)
for i, x in enumerate(nums):
    if x != target:
        continue
    count += 1
    if rnd.randrange(count) == 0:   # keep with probability 1/count
        pick = i
print(pick)` }, { lang: 'js', code: `const nums = [1, 2, 3, 3, 3];
const target = 3;
let count = 0, pick = -1;
for (let i = 0; i < nums.length; i++) {
  if (nums[i] !== target) continue;
  count++;
  if (Math.floor(Math.random() * count) === 0) pick = i;   // keep with probability 1/count
}
console.log(pick);` }, { lang: 'cpp', code: `vector<int> nums = {1, 2, 3, 3, 3};
int target = 3, count = 0, pick = -1;
mt19937 rng(1);
for (int i = 0; i < (int)nums.size(); i++) {
    if (nums[i] != target) continue;
    count++;
    if (uniform_int_distribution<int>(0, count - 1)(rng) == 0) pick = i;   // keep with probability 1/count
}
cout << pick << endl;` }, { lang: 'csharp', code: `int[] nums = { 1, 2, 3, 3, 3 };
int target = 3, count = 0, pick = -1;
var rnd = new Random(1);
for (int i = 0; i < nums.Length; i++) {
    if (nums[i] != target) continue;
    count++;
    if (rnd.Next(count) == 0) pick = i;   // keep with probability 1/count
}
Console.WriteLine(pick);` }] } },
      { title: 'Distributed reservoir merge', html: `<p>Shard A saw 900 items and keeps a sample of k; shard B saw 100. To merge into one uniform sample of k, draw each output slot from A with probability 900/1000 and from B with 100/1000 (sampling without replacement inside each reservoir, updating the remaining counts). Simply concatenating and re-sampling equally would over-represent B 9×.</p>` }
    ],
    deepDive: `<p><b>Algorithm L (skip ahead).</b> Algorithm R calls the RNG N times. Vitter's/Li's <b>Algorithm L</b> computes how many items to <i>skip</i> before the next replacement using a geometric distribution: <code>W ← W · exp(log(random())/k)</code>, <code>skip = floor(log(random()) / log(1 − W))</code>. Expected RNG calls drop to O(k(1 + log(N/k))) — a big win when the stream is a fast file scan and RNG cost dominates.</p>
      <p><b>Weighted sampling.</b> A-Res (key = u<sup>1/w</sup>) gives inclusion probabilities matching sequential weighted sampling without replacement; A-ExpJ adds exponential jumps like Algorithm L. For "sample with replacement proportional to weight" from a static array, use prefix sums + binary search (Random Pick with Weight) or Walker's <b>alias method</b> for O(1) per draw after O(N) setup.</p>
      <p><b>RNG details that matter.</b> <code>rand() % n</code> has <b>modulo bias</b> when 2<sup>32</sup> is not a multiple of n; library calls such as Java's <code>nextInt(bound)</code>, Python's <code>randrange</code> and C++'s <code>uniform_int_distribution</code> use rejection to be exactly uniform. Standard generators (<code>java.util.Random</code> is a 48-bit LCG, Python and C++ <code>mt19937</code> are Mersenne Twisters, JavaScript's <code>Math.random</code> is xorshift-based) are fine for algorithms, not for security (use <code>SecureRandom</code>, Python's <code>secrets</code>, Web Crypto's <code>getRandomValues</code> or the OS generator). In multi-threaded code give each thread its own generator (Java <code>ThreadLocalRandom</code> / <code>SplittableRandom</code>, C++ <code>thread_local</code> engines) to avoid contention. Always allow a <b>seed</b> for reproducible tests.</p>
      <p><b>Production reality.</b> Reservoirs back metric systems (Dropwizard Metrics histograms used reservoirs to estimate latency percentiles — and their bias toward old data led to "exponentially decaying" reservoirs that favour recent samples), tracing systems sampling requests, database <code>TABLESAMPLE</code>, and ML pipelines sampling training examples from unbounded logs.</p>`,
    aiEra: `<p><b>What AI changes:</b> the code is ten lines and every assistant knows Algorithm R. What still trips people (and models) is the <b>probability argument</b> — interviewers now ask you to prove fairness or spot the bias in a slightly-wrong variant, because "write it" is trivial.</p>
      <p><b>Use AI as a partner:</b> have it generate a Monte Carlo test harness (as in the runnable snippet) or a chi-squared test to check uniformity of your sampler. Ask it to derive Algorithm L's skip formula step by step and then verify it numerically yourself.</p>
      <p><b>Where AI goes wrong:</b> off-by-one in the random range (a bound of <code>i</code> instead of <code>i + 1</code>: <code>nextInt(i)</code> vs <code>nextInt(i + 1)</code> in Java, <code>randrange(i)</code> vs <code>randint(0, i)</code> in Python — it silently makes the newest item impossible or too likely), using <code>Math.random() * n</code> cast incorrectly, sharing one generator across threads, and merging distributed reservoirs naïvely.</p>
      <p><b>What you must still own:</b> the telescoping proof, the 0-based vs 1-based range, and the ability to explain why a sample is uniform at <i>every</i> moment of the stream.</p>`,
    problems: [{
      title: 'Linked List Random Node', level: 'Medium', tags: ['reservoir sampling', 'linked list', 'randomized'], companies: ['Google', 'Meta', 'Amazon'],
      statement: `<p>Given a singly linked list, implement <code>Solution(ListNode head)</code> and <code>int getRandom()</code>, which returns a random node's value such that <b>each node has the same probability</b> of being chosen. Follow-up: the list is extremely large and its length is unknown — solve it with O(1) extra space. (LeetCode 382.)</p>`,
      constraints: `1 ≤ number of nodes ≤ 10<sup>4</sup>, at most 10<sup>4</sup> calls to getRandom (follow-up: assume the list may not fit in memory)`,
      example: `<p>List 1 → 2 → 3. Each call returns 1, 2 or 3 with probability ⅓ each. One possible sequence of calls: ${H.c('b', '1, 3, 2, 2, 3')}.</p>`,
      brute: {
        why: `<p>Copy all values into a list in the constructor, then return the element at a random index. O(1) per call, but <b>O(N) extra memory</b> — exactly what the follow-up forbids — and impossible if the list is a stream that cannot be stored or its length changes.</p>`,
        code: { lang: 'java', code: `class Solution {
    private final List<Integer> vals = new ArrayList<>();
    private final Random rnd = new Random();

    public Solution(ListNode head) {
        for (ListNode cur = head; cur != null; cur = cur.next) vals.add(cur.val);  // O(N) memory
    }

    public int getRandom() {
        return vals.get(rnd.nextInt(vals.size()));
    }
}`, alt: [{ lang: 'python', code: String.raw`
import random

class Solution:
    def __init__(self, head):
        self.vals = []
        cur = head
        while cur:
            self.vals.append(cur.val)                 # O(N) memory
            cur = cur.next

    def getRandom(self):
        return self.vals[random.randrange(len(self.vals))]` }, { lang: 'js', code: String.raw`
class Solution {
  constructor(head) {
    this.vals = [];
    for (let cur = head; cur !== null; cur = cur.next) this.vals.push(cur.val);   // O(N) memory
  }

  getRandom() {
    return this.vals[Math.floor(Math.random() * this.vals.length)];
  }
}` }, { lang: 'cpp', code: String.raw`
class Solution {
    vector<int> vals;
    mt19937 rnd{random_device{}()};

public:
    Solution(ListNode* head) {
        for (ListNode* cur = head; cur; cur = cur->next) vals.push_back(cur->val);   // O(N) memory
    }

    int getRandom() {
        return vals[rnd() % vals.size()];
    }
};` }, { lang: 'csharp', code: `public class Solution {
    private readonly List<int> vals = new List<int>();
    private readonly Random rnd = new Random();

    public Solution(ListNode head) {
        for (ListNode cur = head; cur != null; cur = cur.next) vals.Add(cur.val);  // O(N) memory
    }

    public int GetRandom() {
        return vals[rnd.Next(vals.Count)];
    }
}` }] }
      },
      mcq: { q: 'While walking the list you are at the 5th node (1-based). With what probability should it replace the current pick?', options: ['1/2', '1/5', '5/N', '1/N — but N is unknown'], answer: 1, explain: 'Reservoir with k = 1 keeps the i-th item with probability 1/i. The telescoping product then makes every node’s final chance 1/N.' },
      hints: [
        `<p>Hint 1: You do not need N in advance. Decide on the fly: is this node "the winner so far"?</p>`,
        `<p>Hint 2: At the i-th node (1-based) replace the current pick with probability 1/i — that is, a uniform random integer in [0, i) equals 0 (<code>rnd.nextInt(i) == 0</code> in Java, <code>random.randrange(i) == 0</code> in Python, <code>Math.floor(Math.random() * i) === 0</code> in JavaScript).</p>`,
        `<p>Hint 3: Recipe — pick = head.val; i = 1; for node in head.next…: i++; if a random integer in [0, i) is 0, pick = node.val. Return pick. Each call is O(N) time, O(1) space.</p>`
      ],
      tests: {
        sig: 'int[] int -> list<int>',
        fn: 'sampleList',
        check: `(args, out, exp) => {
  // out[i] = how often the i-th node was returned, out[n] = answers that are not in the list.
  // Every node must come up about trials / n times.
  const n = args[0].length, trials = args[1];
  if (out.length !== n + 1 || out[n] !== 0) return false;
  const p = 1 / n, mean = trials * p, sd = Math.sqrt(trials * p * (1 - p));
  return out.slice(0, n).every((c) => Math.abs(c - mean) <= 6 * sd + 3);
}`,
        harness: {
          java: `class Check {
    static List<Integer> sampleList(int[] vals, int trials) {
        ListNode head = null;
        for (int i = vals.length - 1; i >= 0; i--) head = new ListNode(vals[i], head);
        Solution s = new Solution(head);
        Map<Integer, Integer> pos = new HashMap<>();
        for (int i = 0; i < vals.length; i++) pos.put(vals[i], i);
        int[] counts = new int[vals.length + 1];          // last slot: values that are not in the list
        for (int t = 0; t < trials; t++) {
            Integer i = pos.get(s.getRandom());
            counts[i == null ? vals.length : i]++;
        }
        List<Integer> res = new ArrayList<>();
        for (int c : counts) res.add(c);
        return res;
    }
}`,
          python: `def sample_list(vals, trials):
    head = None
    for v in reversed(vals):
        head = ListNode(v, head)
    s = Solution(head)
    pos = {v: i for i, v in enumerate(vals)}
    counts = [0] * (len(vals) + 1)               # last slot: values that are not in the list
    for _ in range(trials):
        counts[pos.get(s.getRandom(), len(vals))] += 1
    return counts`,
          js: `function sampleList(vals, trials) {
  let head = null;
  for (let i = vals.length - 1; i >= 0; i--) head = new ListNode(vals[i], head);
  const s = new Solution(head), pos = new Map(vals.map((v, i) => [v, i]));
  const counts = new Array(vals.length + 1).fill(0);   // last slot: values that are not in the list
  for (let t = 0; t < trials; t++) {
    const i = pos.get(s.getRandom());
    counts[i === undefined ? vals.length : i]++;
  }
  return counts;
}`,
          cpp: `vector<int> sampleList(vector<int> vals, int trials) {
    ListNode* head = nullptr;
    for (int i = (int)vals.size() - 1; i >= 0; i--) head = new ListNode(vals[i], head);
    Solution s(head);
    map<int, int> pos;
    for (int i = 0; i < (int)vals.size(); i++) pos[vals[i]] = i;
    vector<int> counts(vals.size() + 1, 0);          // last slot: values that are not in the list
    for (int t = 0; t < trials; t++) {
        auto it = pos.find(s.getRandom());
        counts[it == pos.end() ? vals.size() : it->second]++;
    }
    return counts;
}`, csharp: `public class Check {
    public static List<int> SampleList(int[] vals, int trials) {
        ListNode head = null;
        for (int i = vals.Length - 1; i >= 0; i--) head = new ListNode(vals[i], head);
        var s = new Solution(head);
        var pos = new Dictionary<int, int>();
        for (int i = 0; i < vals.Length; i++) pos[vals[i]] = i;
        int[] counts = new int[vals.Length + 1];          // last slot: values that are not in the list
        for (int t = 0; t < trials; t++) {
            int i;
            counts[pos.TryGetValue(s.GetRandom(), out i) ? i : vals.Length]++;
        }
        return new List<int>(counts);
    }
}`
        },
        cases: [
          [[[1, 2, 3], 60000], [1]],
          [[[7], 100], [1]],
          [[[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 100000], [1]],
          [[[4, 9], 40000], [1]],
          [[[-5, 0, 9, 10000], 60000], [1]],
          [[[10000, -10000, 0, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22], 100000], [1]],
          [[{ $range: [1, 10001] }, 60], [1]]
        ]
      },
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
        self.head = head                      # O(1) memory: keep only the head

    def getRandom(self):
        pick, i, cur = self.head.val, 1, self.head.next   # first node: probability 1/1
        while cur:
            i += 1
            if random.randrange(i) == 0:      # replace with probability 1/i
                pick = cur.val
            cur = cur.next
        return pick` }, { lang: 'js', code: `class Solution {
  constructor(head) {
    this.head = head;                           // O(1) memory: keep only the head
  }
  getRandom() {
    let pick = this.head.val, i = 1;            // first node: probability 1/1
    for (let cur = this.head.next; cur !== null; cur = cur.next) {
      i++;
      if (Math.floor(Math.random() * i) === 0) pick = cur.val;   // replace with probability 1/i
    }
    return pick;
  }
}` }, { lang: 'cpp', code: `class Solution {
    ListNode* head;
    mt19937 gen{random_device{}()};
public:
    Solution(ListNode* head) : head(head) {}      // O(1) memory: keep only the head
    int getRandom() {
        int pick = head->val, i = 1;              // first node: probability 1/1
        for (ListNode* cur = head->next; cur; cur = cur->next) {
            ++i;
            if (uniform_int_distribution<int>(0, i - 1)(gen) == 0) pick = cur->val;   // 1/i
        }
        return pick;
    }
};` }, { lang: 'csharp', code: `public class Solution {
    private readonly ListNode head;
    private readonly Random rnd = new Random();

    public Solution(ListNode head) {
        this.head = head;                       // O(1) memory: keep only the head
    }

    public int GetRandom() {
        int pick = head.val, i = 1;             // first node: chosen with probability 1/1
        for (ListNode cur = head.next; cur != null; cur = cur.next) {
            i++;
            if (rnd.Next(i) == 0) pick = cur.val;   // replace with probability 1/i
        }
        return pick;
    }
}` }],
        dry: { head: ['node (i)', 'value', 'roll in [0, i)', 'replace?', 'pick'], rows: [
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
    code: [{ lang: 'java', code: `
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
      }`, alt: [{ lang: 'python', code: `import random

# Fisher-Yates: every one of the n! permutations has probability exactly 1/n!.
def shuffle(a, rnd=random):
    for i in range(len(a) - 1, 0, -1):
        j = rnd.randint(0, i)         # uniform in [0, i] -- NOT [0, n-1]
        a[i], a[j] = a[j], a[i]

# Sattolo's variant: j in [0, i-1] produces a uniformly random single CYCLE
# (nobody stays in place) -- useful for "secret santa" style derangements of one loop.
def sattolo(a, rnd=random):
    for i in range(len(a) - 1, 0, -1):
        j = rnd.randrange(i)          # excludes i
        a[i], a[j] = a[j], a[i]` }, { lang: 'js', code: `// Fisher-Yates: every one of the n! permutations has probability exactly 1/n!.
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));   // uniform in [0, i] -- NOT [0, n-1]
    [a[i], a[j]] = [a[j], a[i]];
  }
}

// Sattolo's variant: j in [0, i-1] produces a uniformly random single CYCLE
// (nobody stays in place) -- useful for "secret santa" style derangements of one loop.
function sattolo(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * i);         // excludes i
    [a[i], a[j]] = [a[j], a[i]];
  }
}` }, { lang: 'cpp', code: `// Fisher-Yates: every one of the n! permutations has probability exactly 1/n!.
void shuffleArray(vector<int>& a, mt19937& rng) {
    for (int i = (int)a.size() - 1; i > 0; i--) {
        int j = uniform_int_distribution<int>(0, i)(rng);   // uniform in [0, i] -- NOT [0, n-1]
        swap(a[i], a[j]);
    }
}

// Sattolo's variant: j in [0, i-1] produces a uniformly random single CYCLE
// (nobody stays in place) -- useful for "secret santa" style derangements of one loop.
void sattolo(vector<int>& a, mt19937& rng) {
    for (int i = (int)a.size() - 1; i > 0; i--) {
        int j = uniform_int_distribution<int>(0, i - 1)(rng);   // excludes i
        swap(a[i], a[j]);
    }
}` }, { lang: 'csharp', code: `// Fisher-Yates: every one of the n! permutations has probability exactly 1/n!.
static void Shuffle(int[] a, Random rnd) {
    for (int i = a.Length - 1; i > 0; i--) {
        int j = rnd.Next(i + 1);      // uniform in [0, i] -- NOT [0, n-1]
        int t = a[i]; a[i] = a[j]; a[j] = t;
    }
}

// Sattolo's variant: j in [0, i-1] produces a uniformly random single CYCLE
// (nobody stays in place) -- useful for "secret santa" style derangements of one loop.
static void Sattolo(int[] a, Random rnd) {
    for (int i = a.Length - 1; i > 0; i--) {
        int j = rnd.Next(i);          // excludes i
        int t = a[i]; a[i] = a[j]; a[j] = t;
    }
}` }] }, { lang: 'java', code: `
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
      }`, alt: [{ lang: 'python', code: `import random

# Randomized quickselect with 3-way partition. Returns the k-th smallest (0-based k).
# Expected O(N) time, O(1) extra space; robust to duplicates and sorted input.
def quickselect(a, k, rnd=random):
    lo, hi = 0, len(a) - 1
    while True:
        pivot = a[rnd.randint(lo, hi)]
        lt, i, gt = lo, lo, hi                   # a[lo..lt-1] < p, a[lt..i-1] == p, a[gt+1..hi] > p
        while i <= gt:
            if a[i] < pivot:
                a[lt], a[i] = a[i], a[lt]
                lt += 1
                i += 1
            elif a[i] > pivot:
                a[gt], a[i] = a[i], a[gt]
                gt -= 1
            else:
                i += 1
        if k < lt:
            hi = lt - 1                          # answer is in the "smaller" part
        elif k > gt:
            lo = gt + 1                          # answer is in the "larger" part
        else:
            return pivot                         # k lands in the "equal" block` }, { lang: 'js', code: `// Randomized quickselect with 3-way partition. Returns the k-th smallest (0-based k).
// Expected O(N) time, O(1) extra space; robust to duplicates and sorted input.
function quickselect(a, k) {
  let lo = 0, hi = a.length - 1;
  while (true) {
    const pivot = a[lo + Math.floor(Math.random() * (hi - lo + 1))];
    let lt = lo, i = lo, gt = hi;                // a[lo..lt-1] < p, a[lt..i-1] == p, a[gt+1..hi] > p
    while (i <= gt) {
      if (a[i] < pivot) { [a[lt], a[i]] = [a[i], a[lt]]; lt++; i++; }
      else if (a[i] > pivot) { [a[gt], a[i]] = [a[i], a[gt]]; gt--; }
      else i++;
    }
    if (k < lt) hi = lt - 1;                     // answer is in the "smaller" part
    else if (k > gt) lo = gt + 1;                // answer is in the "larger" part
    else return pivot;                           // k lands in the "equal" block
  }
}` }, { lang: 'cpp', code: `// Randomized quickselect with 3-way partition. Returns the k-th smallest (0-based k).
// Expected O(N) time, O(1) extra space; robust to duplicates and sorted input.
int quickselect(vector<int>& a, int k, mt19937& rng) {
    int lo = 0, hi = (int)a.size() - 1;
    while (true) {
        int pivot = a[uniform_int_distribution<int>(lo, hi)(rng)];
        int lt = lo, i = lo, gt = hi;            // a[lo..lt-1] < p, a[lt..i-1] == p, a[gt+1..hi] > p
        while (i <= gt) {
            if (a[i] < pivot) swap(a[lt++], a[i++]);
            else if (a[i] > pivot) swap(a[gt--], a[i]);
            else i++;
        }
        if (k < lt) hi = lt - 1;                 // answer is in the "smaller" part
        else if (k > gt) lo = gt + 1;            // answer is in the "larger" part
        else return pivot;                       // k lands in the "equal" block
    }
}` }, { lang: 'csharp', code: `// Randomized quickselect with 3-way partition. Returns the k-th smallest (0-based k).
// Expected O(N) time, O(1) extra space; robust to duplicates and sorted input.
static int Quickselect(int[] a, int k, Random rnd) {
    int lo = 0, hi = a.Length - 1;
    while (true) {
        int pivot = a[lo + rnd.Next(hi - lo + 1)];
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
}` }] }, { lang: 'python', run: true, code: `from itertools import product
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
print("Fisher-Yates (6 equally likely runs):", dict(sorted(fy.items())))`, alt: [{ lang: 'js', run: true, code: `const mode = (choices, kind, n) => {
  const a = 'ABCD'.slice(0, n).split('');
  if (kind === 'naive') {                  // for i in 0..n-1: swap a[i], a[rand(0..n-1)]
    choices.forEach((j, i) => { [a[i], a[j]] = [a[j], a[i]]; });
  } else {                                 // Fisher-Yates: for i = n-1..1: swap a[i], a[rand(0..i)]
    choices.forEach((j, t) => { const i = n - 1 - t; [a[i], a[j]] = [a[j], a[i]]; });
  }
  return a.join('');
};

// every sequence of choices, one value from each range [0, size)
function* product(sizes, prefix = []) {
  if (prefix.length === sizes.length) { yield prefix; return; }
  for (let v = 0; v < sizes[prefix.length]; v++) yield* product(sizes, [...prefix, v]);
}

const tally = (it) => {
  const m = new Map();
  for (const s of it) m.set(s, (m.get(s) || 0) + 1);
  return [...m].sort().map(([k, v]) => \`'\${k}': \${v}\`).join(', ');
};

const n = 3;
const naive = tally([...product([3, 3, 3])].map((c) => mode(c, 'naive', n)));
const fy = tally([...product([3, 2])].map((c) => mode(c, 'fy', n)));    // j ranges [0..2], [0..1]
console.log('naive  (27 equally likely runs):', '{' + naive + '}');
console.log('Fisher-Yates (6 equally likely runs):', '{' + fy + '}');` }, { lang: 'cpp', code: `#include <bits/stdc++.h>
using namespace std;

string applyChoices(const vector<int>& choices, bool naive, int n) {
    string a = string("ABCD").substr(0, n);
    if (naive) {                               // for i in 0..n-1: swap a[i], a[rand(0..n-1)]
        for (int i = 0; i < n; i++) swap(a[i], a[choices[i]]);
    } else {                                   // Fisher-Yates: for i = n-1..1: swap a[i], a[rand(0..i)]
        for (int t = 0; t < n - 1; t++) swap(a[n - 1 - t], a[choices[t]]);
    }
    return a;
}

// every sequence of choices, one value from each range [0, size)
void product(const vector<int>& sizes, vector<int>& cur, vector<vector<int>>& out) {
    if (cur.size() == sizes.size()) { out.push_back(cur); return; }
    for (int v = 0; v < sizes[cur.size()]; v++) {
        cur.push_back(v);
        product(sizes, cur, out);
        cur.pop_back();
    }
}

void report(const char* label, const vector<int>& sizes, bool naive, int n) {
    vector<vector<int>> all;
    vector<int> cur;
    product(sizes, cur, all);
    map<string, int> tally;
    for (auto& c : all) tally[applyChoices(c, naive, n)]++;
    cout << label << ": {";
    bool first = true;
    for (auto& [k, v] : tally) { cout << (first ? "" : ", ") << "'" << k << "': " << v; first = false; }
    cout << "}" << endl;
}

int main() {
    int n = 3;
    report("naive  (27 equally likely runs)", {3, 3, 3}, true, n);
    report("Fisher-Yates (6 equally likely runs)", {3, 2}, false, n);   // j ranges [0..2], [0..1]
}` }, { lang: 'csharp', code: `using System;
using System.Collections.Generic;
using System.Linq;

class Program {
    static string Apply(int[] choices, string mode, int n) {
        char[] a = "ABCD".Substring(0, n).ToCharArray();
        if (mode == "naive") {                     // for i in 0..n-1: swap a[i], a[rand(0..n-1)]
            for (int i = 0; i < n; i++) { int j = choices[i]; char t = a[i]; a[i] = a[j]; a[j] = t; }
        } else {                                   // Fisher-Yates: for i = n-1..1: swap a[i], a[rand(0..i)]
            for (int i = n - 1, c = 0; i > 0; i--, c++) { int j = choices[c]; char t = a[i]; a[i] = a[j]; a[j] = t; }
        }
        return new string(a);
    }

    static string Show(Dictionary<string, int> d) {
        return "{" + string.Join(", ", d.OrderBy(e => e.Key, StringComparer.Ordinal).Select(e => "'" + e.Key + "': " + e.Value)) + "}";
    }

    static void Main() {
        int n = 3;
        var naive = new Dictionary<string, int>();
        for (int c0 = 0; c0 < n; c0++)            // every one of the 27 equally likely runs
            for (int c1 = 0; c1 < n; c1++)
                for (int c2 = 0; c2 < n; c2++) {
                    string s = Apply(new[] { c0, c1, c2 }, "naive", n);
                    int cnt; naive.TryGetValue(s, out cnt); naive[s] = cnt + 1;
                }
        var fy = new Dictionary<string, int>();
        for (int c0 = 0; c0 <= 2; c0++)           // j ranges [0..2], [0..1]
            for (int c1 = 0; c1 <= 1; c1++) {
                string s = Apply(new[] { c0, c1 }, "fy", n);
                int cnt; fy.TryGetValue(s, out cnt); fy[s] = cnt + 1;
            }
        Console.WriteLine("naive  (27 equally likely runs): " + Show(naive));
        Console.WriteLine("Fisher-Yates (6 equally likely runs): " + Show(fy));
    }
}`, run: true }, { lang: 'java', code: `public class Main {
    static String apply(int[] choices, boolean naive, int n) {
        char[] a = "ABCD".substring(0, n).toCharArray();
        if (naive) {                               // for i in 0..n-1: swap a[i], a[rand(0..n-1)]
            for (int i = 0; i < n; i++) { char t = a[i]; a[i] = a[choices[i]]; a[choices[i]] = t; }
        } else {                                   // Fisher-Yates: for i = n-1..1: swap a[i], a[rand(0..i)]
            for (int t = 0; t < n - 1; t++) { int i = n - 1 - t, j = choices[t]; char c = a[i]; a[i] = a[j]; a[j] = c; }
        }
        return new String(a);
    }

    // every sequence of choices, one value from each range [0, size)
    static void product(int[] sizes, int[] cur, int pos, Map<String, Integer> tally, boolean naive, int n) {
        if (pos == sizes.length) { tally.merge(apply(cur, naive, n), 1, Integer::sum); return; }
        for (int v = 0; v < sizes[pos]; v++) { cur[pos] = v; product(sizes, cur, pos + 1, tally, naive, n); }
    }

    public static void main(String[] args) {
        int n = 3;
        Map<String, Integer> naive = new TreeMap<>(), fy = new TreeMap<>();
        product(new int[]{3, 3, 3}, new int[3], 0, naive, true, n);
        product(new int[]{3, 2}, new int[2], 0, fy, false, n);      // j ranges [0..2], [0..1]
        System.out.println("naive  (27 equally likely runs): " + naive);
        System.out.println("Fisher-Yates (6 equally likely runs): " + fy);
    }
}` }] }],
    codeTitle: ['Fisher–Yates and Sattolo', 'Randomized quickselect, 3-way partition', 'Count every possible run (runnable)'],
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
      { title: 'Off-by-one that breaks Fisher–Yates', html: `<p>Drawing j from [0, i − 1] (<code>rnd.nextInt(i)</code> in Java) instead of [0, i] (<code>rnd.nextInt(i + 1)</code>) means an element can never stay in place — you get <b>Sattolo's algorithm</b>, which only produces permutations that form a single cycle ((n−1)! of them). For n = 3, only BCA and CAB can ever appear. A one-character bug, a totally different distribution.</p>
        ${H.table(['code', 'outcomes', 'uniform over all n!?'], [['j in [0, i]', 'n!', H.c('g', 'yes')], ['j in [0, i − 1]', '(n−1)! single cycles', H.c('r', 'no')], ['j in [0, n − 1] for every i', 'n<sup>n</sup> runs', H.c('r', 'no (biased)')]])}` },
      { title: 'Quickselect trace: 2nd largest of [3, 2, 1, 5, 6, 4]', html: `<p>2nd largest = index 4 in ascending order. Pivot 3 → [2, 1 | 3 | 6, 4, 5]; index 4 is in the right part [3..5]. Pivot 5 → [4 | 5 | 6]; index 4 is the equal block → answer <b>5</b>. Two partitions touched 6 + 3 = 9 elements instead of sorting.</p>` },
      { title: 'Why a fixed pivot is dangerous', html: `<p>Quickselect with "pivot = first element" on an already sorted array of 10<sup>5</sup> elements, asking for the largest: each partition removes only one element → 10<sup>5</sup> + (10<sup>5</sup> − 1) + … ≈ 5·10<sup>9</sup> steps → TLE. LeetCode 215 contains exactly such tests. A random pivot makes no input bad; a 3-way partition handles the all-equal array.</p>` },
      { title: 'Random point in a circle (rejection sampling)', html: `<p>Pick x, y uniformly in the square [−r, r]<sup>2</sup>; if x<sup>2</sup> + y<sup>2</sup> &gt; r<sup>2</sup>, try again. Acceptance probability = π/4 ≈ 78.5%, so the expected number of tries is 4/π ≈ 1.27 — a Las Vegas algorithm. The tempting "random angle + random radius" is <b>biased</b> toward the centre; the correct polar method uses radius = r·√u.</p>`, code: { lang: 'java', code: `Random rnd = new Random(7);
double r = 1.0, x, y;
int tries = 0;
do {
    x = (rnd.nextDouble() * 2 - 1) * r;
    y = (rnd.nextDouble() * 2 - 1) * r;
    tries++;
} while (x * x + y * y > r * r);          // reject points outside the circle
System.out.println(x + ", " + y + " after " + tries + " tries");`, alt: [{ lang: 'python', code: `import random

rnd = random.Random(7)
r, tries = 1.0, 0
while True:
    x = (rnd.random() * 2 - 1) * r
    y = (rnd.random() * 2 - 1) * r
    tries += 1
    if x * x + y * y <= r * r:         # reject points outside the circle
        break
print(f"{x}, {y} after {tries} tries")` }, { lang: 'js', code: `const r = 1.0;
let x, y, tries = 0;
do {
  x = (Math.random() * 2 - 1) * r;
  y = (Math.random() * 2 - 1) * r;
  tries++;
} while (x * x + y * y > r * r);          // reject points outside the circle
console.log(\`\${x}, \${y} after \${tries} tries\`);` }, { lang: 'cpp', code: `mt19937 rng(7);
uniform_real_distribution<double> unit(0.0, 1.0);
double r = 1.0, x, y;
int tries = 0;
do {
    x = (unit(rng) * 2 - 1) * r;
    y = (unit(rng) * 2 - 1) * r;
    tries++;
} while (x * x + y * y > r * r);          // reject points outside the circle
cout << x << ", " << y << " after " << tries << " tries" << endl;` }, { lang: 'csharp', code: `var rnd = new Random(7);
double r = 1.0, x, y;
int tries = 0;
do {
    x = (rnd.NextDouble() * 2 - 1) * r;
    y = (rnd.NextDouble() * 2 - 1) * r;
    tries++;
} while (x * x + y * y > r * r);          // reject points outside the circle
Console.WriteLine(x + ", " + y + " after " + tries + " tries");` }] } }
    ],
    deepDive: `<p><b>Quickselect's exact expectation.</b> Using indicator variables (elements i and j are compared iff one of them is the first pivot chosen among the values between them), expected comparisons for quickselect are at most ≈ 3.39N (and 2N ln N ≈ 1.39 N log<sub>2</sub>N for quicksort). <b>Floyd–Rivest</b> picks the pivot from a small random sample and needs only about N + min(k, N−k) + o(N) comparisons. Deterministic linear time exists — <b>median of medians</b> (groups of 5, recursion on the medians) — but its constant (~20N) makes it slower in practice; libraries use <b>introselect</b> (C++ <code>std::nth_element</code>): quickselect, falling back to a guaranteed method if recursion gets too deep.</p>
      <p><b>Adversaries.</b> A deterministic pivot rule can be attacked: McIlroy's "killer adversary" builds inputs that make any fixed-pivot quicksort quadratic. Randomness defeats this <i>only if the attacker cannot predict the RNG</i> — the same reason hash tables use random seeds (hash-flooding DoS attacks, 2011). Java's <code>Arrays.sort</code> for primitives is a dual-pivot quicksort that falls back to heapsort when recursion gets too deep, so it cannot be driven quadratic; for objects it uses TimSort (stable, worst case O(N log N)). C++ <code>std::sort</code> is an introsort with the same heapsort fallback, and Python's <code>sort</code> and JavaScript's <code>Array.prototype.sort</code> are TimSort too.</p>
      <p><b>Shuffling in production.</b> Use the library shuffle (Java <code>Collections.shuffle</code>, Python <code>random.shuffle</code>, C++ <code>std::shuffle</code> — Fisher–Yates inside). A 32-bit seed has only ~4·10<sup>9</sup> states, but 52! ≈ 8·10<sup>67</sup>: most deck orders are <b>unreachable</b> from such a generator. A famous 1999 online-poker flaw seeded the shuffle with the system clock, letting researchers predict hands in real time. For gambling or security, use a cryptographic generator (<code>SecureRandom</code>, Python <code>secrets</code>, Web Crypto).</p>
      <p><b>Analysing randomized code:</b> linearity of expectation (no independence needed), geometric distribution (expected tries = 1/p), Markov/Chernoff bounds for "with high probability" claims, and the birthday paradox (√N draws until the first repeat) for hashing and ID collisions.</p>`,
    aiEra: `<p><b>What AI changes:</b> LLMs reliably call the library shuffle or write a textbook Fisher–Yates; they are less reliable at <i>reasoning about distributions</i>. Interviews increasingly hand you a subtly biased sampler or an O(N<sup>2</sup>)-prone quickselect and ask "is this uniform / what is its worst case?"</p>
      <p><b>Use AI as a partner:</b> ask it to enumerate every run of a small randomized procedure (as in the bias visualizer), or to write a chi-squared test for your shuffle. Ask for an adversarial input generator against your pivot rule. Ask it to explain the median-of-medians recurrence T(N) = T(N/5) + T(7N/10) + O(N) and check its algebra.</p>
      <p><b>Where AI goes wrong:</b> a range of [0, n − 1] instead of [0, i] for every swap (<code>nextInt(n)</code> instead of <code>nextInt(i + 1)</code> in Java), sorting with a random comparator (<code>(a, b) -&gt; rnd.nextInt(3) - 1</code> in Java, <code>sort(() =&gt; Math.random() - 0.5)</code> in JavaScript — biased, and Java can throw "Comparison method violates its general contract"), Lomuto partition on many duplicates, and claiming "O(N) worst case" for randomized quickselect.</p>
      <p><b>What you must still own:</b> the counting argument (n! paths vs n<sup>n</sup> runs), the good-pivot expectation argument, and the difference between expected, amortized and worst-case bounds.</p>`,
    problems: [{
      title: 'Kth Largest Element in an Array', level: 'Medium', tags: ['quickselect', 'randomized', 'partition'], companies: ['Meta', 'Amazon', 'Microsoft', 'LinkedIn'],
      statement: `<p>Given an integer array <code>nums</code> and an integer <code>k</code>, return the <b>k-th largest</b> element in sorted order (not the k-th distinct). Can you do it without sorting? (LeetCode 215.)</p>`,
      constraints: `1 ≤ k ≤ N ≤ 10<sup>5</sup>, −10<sup>4</sup> ≤ nums[i] ≤ 10<sup>4</sup> (lots of duplicates are possible)`,
      example: `<p><code>nums = [3,2,1,5,6,4], k = 2</code> → ${H.c('g', '5')} (sorted: 1 2 3 4 <b>5</b> 6).</p>
        <p><code>nums = [3,2,3,1,2,4,5,5,6], k = 4</code> → ${H.c('g', '4')} (sorted descending: 6 5 5 <b>4</b> …).</p>`,
      brute: {
        why: `<p>Sort and return <code>nums[N − k]</code>: <b>O(N log N)</b>. It does far more work than needed — it fully orders thousands of elements we never look at. A size-k min-heap is O(N log k), better but still not linear.</p>`,
        code: { lang: 'java', code: `class Solution {
    public int findKthLargest(int[] nums, int k) {
        int[] a = nums.clone();
        Arrays.sort(a);                 // O(N log N): orders everything
        return a[a.length - k];
    }
}`, alt: [{ lang: 'python', code: String.raw`
class Solution:
    def find_kth_largest(self, nums, k):
        a = sorted(nums)                              # O(N log N): orders everything
        return a[len(a) - k]` }, { lang: 'js', code: String.raw`
function findKthLargest(nums, k) {
  const a = nums.slice().sort((x, y) => x - y);       // O(N log N): orders everything
  return a[a.length - k];
}` }, { lang: 'cpp', code: String.raw`
class Solution {
public:
    int findKthLargest(vector<int>& nums, int k) {
        vector<int> a = nums;
        sort(a.begin(), a.end());                     // O(N log N): orders everything
        return a[a.size() - k];
    }
};` }, { lang: 'csharp', code: `public class Solution {
    public int FindKthLargest(int[] nums, int k) {
        int[] a = (int[])nums.Clone();
        Array.Sort(a);                  // O(N log N): orders everything
        return a[a.Length - k];
    }
}` }] }
      },
      mcq: { q: 'nums has 10<sup>5</sup> copies of the same number. Which quickselect variant stays fast?', options: ['Lomuto partition with a random pivot', 'Hoare partition with pivot = first element', '3-way (Dutch flag) partition with a random pivot', 'Any — duplicates do not matter'], answer: 2, explain: 'With 2-way partitions all equal keys go to one side, so each round removes one element → O(N²). A 3-way partition puts all equal keys in the middle block and finishes in one round.' },
      hints: [
        `<p>Hint 1: The k-th largest is the element at index <code>N − k</code> of the sorted array. You only need to know which element lands there, not the full order.</p>`,
        `<p>Hint 2: Partition around a random pivot into &lt; p, = p, &gt; p. Only one side can contain index N − k; drop the rest and loop.</p>`,
        `<p>Hint 3: Use a 3-way partition (lt, i, gt pointers) so duplicates finish instantly. Loop: pick pivot in [lo, hi]; partition; if target &lt; lt → hi = lt − 1; if target &gt; gt → lo = gt + 1; else return pivot.</p>`
      ],
      tests: {
        sig: 'int[] int -> int',
        fn: 'findKthLargest',
        cases: [
          [[[3, 2, 1, 5, 6, 4], 2], 5],
          [[[3, 2, 3, 1, 2, 4, 5, 5, 6], 4], 4],
          [[[7], 1], 7],
          [[[-1, -1], 2], -1],
          [[[5, 5, 5, 5, 5], 3], 5],
          [[[2, 1], 1], 2],
          [[[2, 1], 2], 1],
          [[[-10000, 10000, 0, -10000, 10000], 3], 0],
          [[[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 10], 1],
          [[[10, 9, 8, 7, 6, 5, 4, 3, 2, 1], 1], 10],
          [[[1, 1, 1, 2, 2, 2, 3, 3, 3], 5], 2],
          [[[-18, 20, 1, -14, -2, -5, -15, -18, 14, 4, -2, -19, -13, 18, -9], 1], 20],
          [[[-18, 20, 1, -14, -2, -5, -15, -18, 14, 4, -2, -19, -13, 18, -9], 7], -2],
          [[[-18, 20, 1, -14, -2, -5, -15, -18, 14, 4, -2, -19, -13, 18, -9], 15], -19],
          [
            [
              [
                -4, 20, -13, 12, 9, 7, 13, -11, 8, 19, 16, 6, -6, 6, -12, 20, -3, 16, 10, 0, -5, -17, 13, 17, -7,
                -11, -6, 0, -17, -17, -6, 6, -5, -4, -19, 7, -10, 16, 3, -20
              ],
              1
            ],
            20
          ],
          [
            [
              [
                -4, 20, -13, 12, 9, 7, 13, -11, 8, 19, 16, 6, -6, 6, -12, 20, -3, 16, 10, 0, -5, -17, 13, 17, -7,
                -11, -6, 0, -17, -17, -6, 6, -5, -4, -19, 7, -10, 16, 3, -20
              ],
              20
            ],
            0
          ],
          [
            [
              [
                -4, 20, -13, 12, 9, 7, 13, -11, 8, 19, 16, 6, -6, 6, -12, 20, -3, 16, 10, 0, -5, -17, 13, 17, -7,
                -11, -6, 0, -17, -17, -6, 6, -5, -4, -19, 7, -10, 16, 3, -20
              ],
              40
            ],
            -20
          ],
          [
            [
              [
                -7, 18, 3, 16, 17, 12, 20, 12, 2, 13, -11, 14, 18, -19, -5, 10, 11, 12, 3, 1, -10, 0, -10, -2, -14,
                -2, 3, 14, 1, -18, 20, 20, 1, -18, 19, 13, -15, -5, -15, -2, 15, 12, -17, 5, -12, 13, -15, 6, 0, 19,
                -18, -7, -11, -9, -7, -13, -10, -8, 11, 9, -10, -7, 12, 8, -3, 13, -5, -4, -20, -11, 3, -14, 6, -7,
                -7, 20, -19, 17, -2, 6, -16, 3, 3, 3, -10, -2, -17, 12, -9, 9, -7, -17, 4, 20, 3, 19, -12, 17, -4,
                -9, -10, 18, 20, 9, -11, -13, 8, -3, -19, 5, -14, 9, -2, 18, -9, -4, 18, -9, -2, -20, 6, -10, -10,
                -16, -15, -5, -8, 15, 5, 18, -7, 10, 19, -10, -16, 16, -7, 11, -9, -16, 20, 1, 5, -19, 3, -11, 4,
                -17, 0, 19, 1, 0, -2, -11, -12, 20, -19, 2, 12, -14, 20, 18, 19, -12, -5, -19, 8, 19, 2, -2, -15, 16,
                18, 10, 5, -7, -18, -4, -18, -3, 15, -20, -5, -4, -9, 1, 3, -14, 16, 2, 5, 8, -17, 9, 0, -16, -12,
                -18, -11, 0
              ],
              1
            ],
            20
          ],
          [
            [
              [
                -7, 18, 3, 16, 17, 12, 20, 12, 2, 13, -11, 14, 18, -19, -5, 10, 11, 12, 3, 1, -10, 0, -10, -2, -14,
                -2, 3, 14, 1, -18, 20, 20, 1, -18, 19, 13, -15, -5, -15, -2, 15, 12, -17, 5, -12, 13, -15, 6, 0, 19,
                -18, -7, -11, -9, -7, -13, -10, -8, 11, 9, -10, -7, 12, 8, -3, 13, -5, -4, -20, -11, 3, -14, 6, -7,
                -7, 20, -19, 17, -2, 6, -16, 3, 3, 3, -10, -2, -17, 12, -9, 9, -7, -17, 4, 20, 3, 19, -12, 17, -4,
                -9, -10, 18, 20, 9, -11, -13, 8, -3, -19, 5, -14, 9, -2, 18, -9, -4, 18, -9, -2, -20, 6, -10, -10,
                -16, -15, -5, -8, 15, 5, 18, -7, 10, 19, -10, -16, 16, -7, 11, -9, -16, 20, 1, 5, -19, 3, -11, 4,
                -17, 0, 19, 1, 0, -2, -11, -12, 20, -19, 2, 12, -14, 20, 18, 19, -12, -5, -19, 8, 19, 2, -2, -15, 16,
                18, 10, 5, -7, -18, -4, -18, -3, 15, -20, -5, -4, -9, 1, 3, -14, 16, 2, 5, 8, -17, 9, 0, -16, -12,
                -18, -11, 0
              ],
              100
            ],
            0
          ],
          [
            [
              [
                -7, 18, 3, 16, 17, 12, 20, 12, 2, 13, -11, 14, 18, -19, -5, 10, 11, 12, 3, 1, -10, 0, -10, -2, -14,
                -2, 3, 14, 1, -18, 20, 20, 1, -18, 19, 13, -15, -5, -15, -2, 15, 12, -17, 5, -12, 13, -15, 6, 0, 19,
                -18, -7, -11, -9, -7, -13, -10, -8, 11, 9, -10, -7, 12, 8, -3, 13, -5, -4, -20, -11, 3, -14, 6, -7,
                -7, 20, -19, 17, -2, 6, -16, 3, 3, 3, -10, -2, -17, 12, -9, 9, -7, -17, 4, 20, 3, 19, -12, 17, -4,
                -9, -10, 18, 20, 9, -11, -13, 8, -3, -19, 5, -14, 9, -2, 18, -9, -4, 18, -9, -2, -20, 6, -10, -10,
                -16, -15, -5, -8, 15, 5, 18, -7, 10, 19, -10, -16, 16, -7, 11, -9, -16, 20, 1, 5, -19, 3, -11, 4,
                -17, 0, 19, 1, 0, -2, -11, -12, 20, -19, 2, 12, -14, 20, 18, 19, -12, -5, -19, 8, 19, 2, -2, -15, 16,
                18, 10, 5, -7, -18, -4, -18, -3, 15, -20, -5, -4, -9, 1, 3, -14, 16, 2, 5, 8, -17, 9, 0, -16, -12,
                -18, -11, 0
              ],
              200
            ],
            -20
          ],
          [
            [
              {
                $concat: [{ $range: [-10000, 10001] }, { $range: [-10000, 10001] }, { $range: [-10000, 10001] }, { $range: [-10000, 10001] }]
              },
              1
            ],
            10000
          ],
          [
            [
              {
                $concat: [{ $range: [-10000, 10001] }, { $range: [-10000, 10001] }, { $range: [-10000, 10001] }, { $range: [-10000, 10001] }]
              },
              40002
            ],
            0
          ],
          [
            [
              {
                $concat: [{ $range: [-10000, 10001] }, { $range: [-10000, 10001] }, { $range: [-10000, 10001] }, { $range: [-10000, 10001] }]
              },
              80004
            ],
            -10000
          ],
          [
            [
              {
                $concat: [{ $range: [-10000, 10001] }, { $range: [-10000, 10001] }, { $range: [-10000, 10001] }, { $range: [-10000, 10001] }]
              },
              40001
            ],
            0
          ],
          [
            [
              {
                $concat: [
                  { $range: [10000, -10001, -1] },
                  { $range: [10000, -10001, -1] },
                  { $range: [10000, -10001, -1] },
                  { $range: [10000, -10001, -1] }
                ]
              },
              30000
            ],
            2501
          ],
          [[{ $rep: 4242, n: 100000 }, 77777], 4242],
          [[{ $concat: [{ $rep: -10000, n: 50000 }, { $rep: 10000, n: 50000 }] }, 50000], 10000],
          [[{ $concat: [{ $rep: -10000, n: 50000 }, { $rep: 10000, n: 50000 }] }, 50001], -10000]
        ]
      },
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
    def find_kth_largest(self, nums, k):
        target, lo, hi = len(nums) - k, 0, len(nums) - 1     # target index in ascending order
        while True:
            pivot = nums[random.randint(lo, hi)]
            lt, i, gt = lo, lo, hi                # < pivot | == pivot | unknown | > pivot
            while i <= gt:
                if nums[i] < pivot:
                    nums[lt], nums[i] = nums[i], nums[lt]
                    lt += 1
                    i += 1
                elif nums[i] > pivot:
                    nums[i], nums[gt] = nums[gt], nums[i]
                    gt -= 1
                else:
                    i += 1
            if target < lt:
                hi = lt - 1                       # go left
            elif target > gt:
                lo = gt + 1                       # go right
            else:
                return pivot                      # inside the equal block` }, { lang: 'js', code: `function findKthLargest(nums, k) {
  const target = nums.length - k;                    // index in ascending order
  let lo = 0, hi = nums.length - 1;
  while (true) {
    const pivot = nums[lo + Math.floor(Math.random() * (hi - lo + 1))];
    let lt = lo, i = lo, gt = hi;                    // < pivot | == pivot | unknown | > pivot
    while (i <= gt) {
      if (nums[i] < pivot) { [nums[lt], nums[i]] = [nums[i], nums[lt]]; lt++; i++; }
      else if (nums[i] > pivot) { [nums[i], nums[gt]] = [nums[gt], nums[i]]; gt--; }
      else i++;
    }
    if (target < lt) hi = lt - 1;                    // go left
    else if (target > gt) lo = gt + 1;               // go right
    else return pivot;                               // inside the equal block
  }
}` }, { lang: 'cpp', code: `class Solution {
    mt19937 rng{random_device{}()};
public:
    int findKthLargest(vector<int>& nums, int k) {
        int target = nums.size() - k;                // index in ascending order
        int lo = 0, hi = nums.size() - 1;
        while (true) {
            int pivot = nums[uniform_int_distribution<int>(lo, hi)(rng)];
            int lt = lo, i = lo, gt = hi;            // < pivot | == pivot | unknown | > pivot
            while (i <= gt) {
                if (nums[i] < pivot) swap(nums[lt++], nums[i++]);
                else if (nums[i] > pivot) swap(nums[i], nums[gt--]);
                else i++;
            }
            if (target < lt) hi = lt - 1;            // go left
            else if (target > gt) lo = gt + 1;       // go right
            else return pivot;                       // inside the equal block
        }
        // std::nth_element(nums.begin(), nums.begin() + target, nums.end()) does the same job.
    }
};` }, { lang: 'csharp', code: `public class Solution {
    private readonly Random rnd = new Random();

    public int FindKthLargest(int[] nums, int k) {
        int target = nums.Length - k;            // index in ascending order
        int lo = 0, hi = nums.Length - 1;
        while (true) {
            int pivot = nums[lo + rnd.Next(hi - lo + 1)];
            int lt = lo, i = lo, gt = hi;        // < pivot | == pivot | unknown | > pivot
            while (i <= gt) {
                if (nums[i] < pivot) Swap(nums, lt++, i++);
                else if (nums[i] > pivot) Swap(nums, i, gt--);
                else i++;
            }
            if (target < lt) hi = lt - 1;        // go left
            else if (target > gt) lo = gt + 1;   // go right
            else return pivot;                   // inside the equal block
        }
    }

    private void Swap(int[] a, int i, int j) { int t = a[i]; a[i] = a[j]; a[j] = t; }
}` }],
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
      <p><b>Example 1 — dynamic array (<code>ArrayList</code> / <code>list</code> / <code>Array</code> / <code>vector</code>) with doubling.</b> Appending costs 1, except when the array is full: then allocate twice the space and copy everything (cost = size).</p>
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
    code: [{ lang: 'java', code: `
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
      }`, alt: [{ lang: 'python', code: `# A growable int array: amortized O(1) add/remove_last, memory always O(size).
class IntVector:
    def __init__(self):
        self._data = [0]                                 # capacity 1
        self._size = 0

    def add(self, x):
        if self._size == len(self._data):
            self._resize(2 * len(self._data))            # full: DOUBLE (geometric growth)
        self._data[self._size] = x
        self._size += 1

    def remove_last(self):
        if self._size == 0:
            raise IndexError("empty")
        self._size -= 1
        x = self._data[self._size]
        # Shrink only at 1/4 full, not 1/2: halving at 1/2 would let an add/remove
        # pair at the boundary trigger a full copy every time (thrashing).
        if self._size > 0 and self._size == len(self._data) // 4:
            self._resize(len(self._data) // 2)
        return x

    def get(self, i):
        if not 0 <= i < self._size:
            raise IndexError(i)
        return self._data[i]

    def size(self):
        return self._size

    def _resize(self, cap):
        new = [0] * max(1, cap)
        new[:self._size] = self._data[:self._size]       # O(size) copy, rare
        self._data = new` }, { lang: 'js', code: `// A growable int array: amortized O(1) add/removeLast, memory always O(size).
class IntVector {
  constructor() {
    this.data = new Int32Array(1);                       // capacity 1
    this.n = 0;
  }
  add(x) {
    if (this.n === this.data.length) this.#resize(2 * this.data.length);   // full: DOUBLE (geometric growth)
    this.data[this.n++] = x;
  }
  removeLast() {
    if (this.n === 0) throw new Error('empty');
    const x = this.data[--this.n];
    // Shrink only at 1/4 full, not 1/2: halving at 1/2 would let an add/remove
    // pair at the boundary trigger a full copy every time (thrashing).
    if (this.n > 0 && this.n === this.data.length >> 2) this.#resize(this.data.length >> 1);
    return x;
  }
  get(i) {
    if (i < 0 || i >= this.n) throw new RangeError(String(i));
    return this.data[i];
  }
  size() { return this.n; }
  #resize(cap) {
    const next = new Int32Array(Math.max(1, cap));
    next.set(this.data.subarray(0, this.n));             // O(size) copy, rare
    this.data = next;
  }
}` }, { lang: 'cpp', code: `// A growable int array: amortized O(1) add/removeLast, memory always O(size).
class IntVector {
    vector<int> data{0};                                 // data.size() is the capacity (starts at 1)
    int n = 0;

    void resize(int cap) {
        vector<int> next(max(1, cap));
        copy(data.begin(), data.begin() + n, next.begin());   // O(size) copy, rare
        data = move(next);
    }
public:
    void add(int x) {
        if (n == (int)data.size()) resize(2 * data.size());   // full: DOUBLE (geometric growth)
        data[n++] = x;
    }

    int removeLast() {
        if (n == 0) throw out_of_range("empty");
        int x = data[--n];
        // Shrink only at 1/4 full, not 1/2: halving at 1/2 would let an add/remove
        // pair at the boundary trigger a full copy every time (thrashing).
        if (n > 0 && n == (int)data.size() / 4) resize(data.size() / 2);
        return x;
    }

    int get(int i) const {
        if (i < 0 || i >= n) throw out_of_range(to_string(i));
        return data[i];
    }

    int size() const { return n; }
};` }, { lang: 'csharp', code: `// A growable int array: amortized O(1) add/removeLast, memory always O(size).
class IntVector {
    private int[] data = new int[1];
    private int size = 0;

    public void Add(int x) {
        if (size == data.Length) Resize(2 * data.Length);   // full: DOUBLE (geometric growth)
        data[size++] = x;
    }

    public int RemoveLast() {
        if (size == 0) throw new InvalidOperationException("empty");
        int x = data[--size];
        // Shrink only at 1/4 full, not 1/2: halving at 1/2 would let an add/remove
        // pair at the boundary trigger a full copy every time (thrashing).
        if (size > 0 && size == data.Length / 4) Resize(data.Length / 2);
        return x;
    }

    public int Get(int i) {
        if (i < 0 || i >= size) throw new ArgumentOutOfRangeException("i");
        return data[i];
    }

    public int Size() { return size; }

    private void Resize(int cap) {
        Array.Resize(ref data, Math.Max(1, cap));          // O(size) copy, rare
    }
}` }] }, { lang: 'java', code: `
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
      }`, alt: [{ lang: 'python', code: `# Binary counter: one increment may flip many bits, but N increments flip < 2N bits.
def increment(bits):                       # bits[0] = least significant bit
    flips, i = 0, 0
    while i < len(bits) and bits[i] == 1:  # trailing 1s -> 0
        bits[i] = 0
        i += 1
        flips += 1
    if i < len(bits):                      # first 0 -> 1
        bits[i] = 1
        flips += 1
    return flips

# Union-Find with union by rank + path compression: O(alpha(N)) amortized per op.
class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n

    def find(self, x):
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]   # path halving (a form of compression)
            x = self.parent[x]
        return x

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return False
        if self.rank[ra] < self.rank[rb]:
            ra, rb = rb, ra
        self.parent[rb] = ra                               # attach the shorter tree under the taller
        if self.rank[ra] == self.rank[rb]:
            self.rank[ra] += 1
        return True` }, { lang: 'js', code: `// Binary counter: one increment may flip many bits, but N increments flip < 2N bits.
function increment(bits) {                   // bits[0] = least significant bit
  let flips = 0, i = 0;
  while (i < bits.length && bits[i] === 1) { bits[i++] = 0; flips++; }   // trailing 1s -> 0
  if (i < bits.length) { bits[i] = 1; flips++; }                          // first 0 -> 1
  return flips;
}

// Union-Find with union by rank + path compression: O(alpha(N)) amortized per op.
class UnionFind {
  constructor(n) {
    this.parent = Int32Array.from({ length: n }, (_, i) => i);
    this.rank = new Int32Array(n);
  }
  find(x) {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]];   // path halving (a form of compression)
      x = this.parent[x];
    }
    return x;
  }
  union(a, b) {
    let ra = this.find(a), rb = this.find(b);
    if (ra === rb) return false;
    if (this.rank[ra] < this.rank[rb]) [ra, rb] = [rb, ra];
    this.parent[rb] = ra;                              // attach the shorter tree under the taller
    if (this.rank[ra] === this.rank[rb]) this.rank[ra]++;
    return true;
  }
}` }, { lang: 'cpp', code: `// Binary counter: one increment may flip many bits, but N increments flip < 2N bits.
int increment(vector<int>& bits) {           // bits[0] = least significant bit
    int flips = 0;
    size_t i = 0;
    while (i < bits.size() && bits[i] == 1) { bits[i++] = 0; flips++; }   // trailing 1s -> 0
    if (i < bits.size()) { bits[i] = 1; flips++; }                         // first 0 -> 1
    return flips;
}

// Union-Find with union by rank + path compression: O(alpha(N)) amortized per op.
class UnionFind {
    vector<int> parent, rnk;
public:
    UnionFind(int n) : parent(n), rnk(n, 0) { iota(parent.begin(), parent.end(), 0); }
    int find(int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]];   // path halving (a form of compression)
            x = parent[x];
        }
        return x;
    }
    bool unite(int a, int b) {
        int ra = find(a), rb = find(b);
        if (ra == rb) return false;
        if (rnk[ra] < rnk[rb]) swap(ra, rb);
        parent[rb] = ra;                     // attach the shorter tree under the taller
        if (rnk[ra] == rnk[rb]) rnk[ra]++;
        return true;
    }
};` }, { lang: 'csharp', code: `// Binary counter: one increment may flip many bits, but N increments flip < 2N bits.
static int Increment(int[] bits) {          // bits[0] = least significant bit
    int flips = 0, i = 0;
    while (i < bits.Length && bits[i] == 1) { bits[i++] = 0; flips++; }   // trailing 1s -> 0
    if (i < bits.Length) { bits[i] = 1; flips++; }                          // first 0 -> 1
    return flips;
}

// Union-Find with union by rank + path compression: O(alpha(N)) amortized per op.
static int[] parent, rank;
static int Find(int x) {
    while (parent[x] != x) {
        parent[x] = parent[parent[x]];       // path halving (a form of compression)
        x = parent[x];
    }
    return x;
}
static bool Union(int a, int b) {
    int ra = Find(a), rb = Find(b);
    if (ra == rb) return false;
    if (rank[ra] < rank[rb]) { int t = ra; ra = rb; rb = t; }
    parent[rb] = ra;                         // attach the shorter tree under the taller
    if (rank[ra] == rank[rb]) rank[ra]++;
    return true;
}` }] }, { lang: 'java', code: `
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
      }`, alt: [{ lang: 'python', code: `# Monotonic stack: inner while looks quadratic, but every index is pushed once
# and popped at most once -> O(N) total. Returns next greater element (or -1).
def next_greater(a):
    ans = [-1] * len(a)
    st = []                                   # indices with decreasing values
    for i, x in enumerate(a):
        while st and a[st[-1]] < x:
            ans[st.pop()] = x
        st.append(i)
    return ans` }, { lang: 'js', code: `// Monotonic stack: inner while looks quadratic, but every index is pushed once
// and popped at most once -> O(N) total. Returns next greater element (or -1).
function nextGreater(a) {
  const ans = new Array(a.length).fill(-1);
  const st = [];                              // indices with decreasing values
  for (let i = 0; i < a.length; i++) {
    while (st.length > 0 && a[st[st.length - 1]] < a[i]) ans[st.pop()] = a[i];
    st.push(i);
  }
  return ans;
}` }, { lang: 'cpp', code: `// Monotonic stack: inner while looks quadratic, but every index is pushed once
// and popped at most once -> O(N) total. Returns next greater element (or -1).
vector<int> nextGreater(const vector<int>& a) {
    vector<int> ans(a.size(), -1);
    vector<int> st;                           // indices with decreasing values
    for (int i = 0; i < (int)a.size(); i++) {
        while (!st.empty() && a[st.back()] < a[i]) { ans[st.back()] = a[i]; st.pop_back(); }
        st.push_back(i);
    }
    return ans;
}` }, { lang: 'csharp', code: `// Monotonic stack: inner while looks quadratic, but every index is pushed once
// and popped at most once -> O(N) total. Returns next greater element (or -1).
static int[] NextGreater(int[] a) {
    int n = a.Length;
    int[] ans = new int[n];
    for (int i = 0; i < n; i++) ans[i] = -1;
    var st = new Stack<int>();                 // indices with decreasing values
    for (int i = 0; i < n; i++) {
        while (st.Count > 0 && a[st.Peek()] < a[i]) ans[st.Pop()] = a[i];
        st.Push(i);
    }
    return ans;
}` }] }],
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
      { title: 'Queue from two stacks', html: `<p>Push onto <code>in</code>. To pop, if <code>out</code> is empty move <b>everything</b> from <code>in</code> to <code>out</code> (reverses the order), then pop <code>out</code>. A single pop can cost O(N), but each element is moved from in to out at most once in its life → each element costs ≤ 4 stack operations total → O(1) amortized per queue operation.</p>`, code: { lang: 'java', code: `Deque<Integer> in = new ArrayDeque<>(), out = new ArrayDeque<>();
for (int x = 1; x <= 3; x++) in.push(x);          // enqueue 1, 2, 3
if (out.isEmpty()) while (!in.isEmpty()) out.push(in.pop());   // one O(N) transfer
System.out.println(out.pop() + " " + out.pop()); // 1 2 (FIFO), next pops are O(1)`, alt: [{ lang: 'python', code: `inp, out = [], []
for x in range(1, 4):
    inp.append(x)                               # enqueue 1, 2, 3
if not out:
    while inp:
        out.append(inp.pop())                   # one O(N) transfer
print(out.pop(), out.pop())                     # 1 2 (FIFO), next pops are O(1)` }, { lang: 'js', code: `const inp = [], out = [];
for (let x = 1; x <= 3; x++) inp.push(x);                 // enqueue 1, 2, 3
if (out.length === 0) while (inp.length > 0) out.push(inp.pop());   // one O(N) transfer
console.log(out.pop() + ' ' + out.pop());                 // 1 2 (FIFO), next pops are O(1)` }, { lang: 'cpp', code: `stack<int> in, out;
for (int x = 1; x <= 3; x++) in.push(x);                  // enqueue 1, 2, 3
if (out.empty()) while (!in.empty()) { out.push(in.top()); in.pop(); }   // one O(N) transfer
int first = out.top(); out.pop();
int second = out.top(); out.pop();
cout << first << " " << second << endl;                   // 1 2 (FIFO), next pops are O(1)` }, { lang: 'csharp', code: `var inS = new Stack<int>();
var outS = new Stack<int>();
for (int x = 1; x <= 3; x++) inS.Push(x);         // enqueue 1, 2, 3
if (outS.Count == 0) while (inS.Count > 0) outS.Push(inS.Pop());   // one O(N) transfer
Console.WriteLine(outS.Pop() + " " + outS.Pop()); // 1 2 (FIFO), next pops are O(1)` }] } },
      { title: 'Union-find: one slow find, then fast forever', html: `<p>A chain 1 → 2 → 3 → 4 → 5 (root 5). <code>find(1)</code> walks 4 links (slow) but path compression points 1, 2, 3 directly at 5. The next <code>find(1)</code> takes 1 step. The expensive walk "pays" for flattening, so the total over M operations is O(M α(N)).</p>
        ${H.arr(['1→2', '2→3', '3→4', '4→5'], { label: 'before' })}${H.arr(['1→5', '2→5', '3→5', '4→5'], { label: 'after find(1)', hl: { 0: 'g', 1: 'g', 2: 'g' } })}` },
      { title: 'Amortized vs expected vs worst case', html: `<p>Three different promises:</p>
        ${H.table(['bound', 'promise', 'example'], [['worst case per op', 'every single call is fast', 'balanced BST insert O(log N)'], ['amortized', 'any sequence of M calls costs ≤ M·c', 'dynamic-array append, union-find'], ['expected', 'average over the algorithm\'s random choices', 'quickselect, skip list, hashing']])}
        <p>A latency-sensitive system (trading, games at 60 fps, real-time audio) may reject an amortized structure because one call occasionally stalls.</p>` }
    ],
    deepDive: `<p><b>Potential method, formally.</b> Pick Φ(state) ≥ 0 with Φ(initial) = 0. Define amortized cost ĉ<sub>i</sub> = c<sub>i</sub> + Φ<sub>i</sub> − Φ<sub>i−1</sub>. Summing telescopes: ∑ĉ = ∑c + Φ<sub>final</sub> − Φ<sub>0</sub> ≥ ∑c. So bounding every ĉ<sub>i</sub> bounds the real total. For grow-and-shrink arrays use Φ = |2·size − capacity| (or a piecewise version) to cover both directions. Classic potential-method results: splay trees (Φ = ∑ log subtree sizes → O(log N) amortized), Fibonacci heaps (Φ = trees + 2·marked → O(1) amortized decrease-key, which gives Dijkstra O(E + V log V)), and union-find (Tarjan's α(N) proof; Tarjan also proved a matching lower bound for pointer machines).</p>
      <p><b>Growth factor choice.</b> Java <code>ArrayList</code> grows by 1.5× (<code>old + (old &gt;&gt; 1)</code>), CPython lists by ~1.125× plus a constant, C++ libstdc++ <code>vector</code> by 2×, MSVC by 1.5×, Go slices by 2× until 256 elements then smoothly toward 1.25×. A factor below the golden ratio (≈1.618) lets freed blocks be reused by later allocations; a larger factor means fewer copies but more wasted memory (up to 50% at 2×).</p>
      <p><b>De-amortization.</b> When single-operation latency matters, spread the rebuild: allocate the new array early and copy two old elements on every push (incremental resizing). Redis rehashes its dictionaries incrementally (a few buckets per operation, two tables live at once); Go maps (1.24+) are split into several small tables, so a growth step never rehashes the whole map; real-time garbage collectors work in small slices. The total work is the same, but no single call stalls.</p>
      <p><b>When amortized bounds break.</b> They assume a <b>single timeline</b>. With <b>persistence</b> or <b>rollback</b> (undo the last union, branch a data structure), an adversary can replay the expensive operation many times. That is why "DSU with rollback" (offline dynamic connectivity) uses union by rank <b>without</b> path compression: O(log N) worst case per find, and undo is O(1).</p>`,
    aiEra: `<p><b>What AI changes:</b> AI assistants correctly state "appending to a dynamic array (ArrayList, list, vector) is amortized O(1)" but frequently conflate amortized, average-case and expected bounds, or call a monotonic-stack solution "O(N<sup>2</sup>) because of the nested loop". Code review — human or AI-assisted — needs someone who can make the counting argument in one sentence.</p>
      <p><b>Use AI as a partner:</b> ask it to instrument your code with operation counters (pushes, pops, copies) and plot cost per operation for adversarial sequences — the fastest way to see amortization or catch thrashing. Ask it to propose a potential function and then check the algebra yourself.</p>
      <p><b>Where AI goes wrong:</b> shrinking at ½ capacity, additive growth in hand-rolled buffers, claiming O(1) worst-case for a hash-map insert (<code>HashMap.put</code>, <code>dict[k] = v</code>, <code>unordered_map</code> — it is amortized and expected), and forgetting that union-find with path compression is incompatible with rollback.</p>
      <p><b>What you must still own:</b> the "each element is pushed once and popped once" argument, the geometric-series bound, and the judgement of when a latency spike from an amortized structure is unacceptable.</p>`,
    problems: [{
      title: 'Design a Growable Array (ArrayList from scratch)', level: 'Medium', tags: ['amortized analysis', 'design', 'arrays'], companies: ['Microsoft', 'Bloomberg', 'Oracle'],
      statement: `<p>Implement <code>GrowableArray</code> backed by a plain <code>int[]</code> with <code>add(x)</code> (append), <code>get(i)</code>, <code>set(i, x)</code>, <code>removeLast()</code> and <code>size()</code>. Requirements: <code>get</code>/<code>set</code> O(1) worst case; <code>add</code>/<code>removeLast</code> <b>amortized O(1)</b>; memory must stay <b>O(size)</b> even after many removals. Explain why your resize policy meets the bounds.</p>`,
      constraints: `up to 10<sup>6</sup> operations in any order; values fit in int; removeLast on empty → throw`,
      example: `<p>add 5, add 7, add 9 (capacity 1 → 2 → 4), get(1) = ${H.c('g', '7')}, removeLast() = ${H.c('g', '9')}, removeLast() = ${H.c('g', '7')} → size 1 = capacity 4 / 4 → shrink to 2. Total copies stay linear in the number of operations.</p>`,
      brute: {
        why: `<p>Grow the array by exactly <b>one</b> slot on every add (allocate size+1, copy all). Each add copies the whole array: 0 + 1 + 2 + … + (N−1) ≈ N<sup>2</sup>/2 copies → 5·10<sup>11</sup> for 10<sup>6</sup> adds. The waste: we keep paying for the same copies again and again instead of buying spare room in advance.</p>`,
        code: { lang: 'java', code: `class GrowableArray {
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
}`, alt: [{ lang: 'python', code: String.raw`
class GrowableArray:
    def __init__(self):
        self.data = []

    def add(self, x):
        bigger = [0] * (len(self.data) + 1)           # grow by ONE: O(N) every time
        for i, v in enumerate(self.data):
            bigger[i] = v
        bigger[len(self.data)] = x
        self.data = bigger

    def removeLast(self):
        if not self.data:
            raise IndexError("empty")
        x = self.data[-1]
        self.data = self.data[:-1]                    # shrink by ONE: O(N) every time
        return x

    def get(self, i):
        return self.data[i]

    def set(self, i, x):
        self.data[i] = x

    def size(self):
        return len(self.data)` }, { lang: 'js', code: String.raw`
class GrowableArray {
  constructor() {
    this.data = [];
  }

  add(x) {
    const bigger = new Array(this.data.length + 1);   // grow by ONE: O(N) every time
    for (let i = 0; i < this.data.length; i++) bigger[i] = this.data[i];
    bigger[this.data.length] = x;
    this.data = bigger;
  }

  removeLast() {
    if (this.data.length === 0) throw new Error("empty");
    const x = this.data[this.data.length - 1];
    this.data = this.data.slice(0, -1);               // shrink by ONE: O(N) every time
    return x;
  }

  get(i) { return this.data[i]; }
  set(i, x) { this.data[i] = x; }
  size() { return this.data.length; }
}` }, { lang: 'cpp', code: String.raw`
class GrowableArray {
    vector<int> data;

public:
    void add(int x) {
        vector<int> bigger(data.size() + 1);          // grow by ONE: O(N) every time
        copy(data.begin(), data.end(), bigger.begin());
        bigger[data.size()] = x;
        data = bigger;
    }

    int removeLast() {
        if (data.empty()) throw out_of_range("empty");
        int x = data.back();
        data = vector<int>(data.begin(), data.end() - 1);   // shrink by ONE: O(N) every time
        return x;
    }

    int get(int i) const { return data[i]; }
    void set(int i, int x) { data[i] = x; }
    int size() const { return data.size(); }
};` }, { lang: 'csharp', code: `public class GrowableArray {
    private int[] data = new int[0];

    public void Add(int x) {
        int[] bigger = new int[data.Length + 1];          // grow by ONE: O(N) every time
        Array.Copy(data, bigger, data.Length);
        bigger[data.Length] = x;
        data = bigger;
    }

    public int RemoveLast() {
        if (data.Length == 0) throw new InvalidOperationException("empty");
        int x = data[data.Length - 1];
        Array.Resize(ref data, data.Length - 1);          // shrink by ONE: O(N) every time
        return x;
    }

    public int Get(int i) { return data[i]; }
    public void Set(int i, int x) { data[i] = x; }
    public int Size() { return data.Length; }
}` }] }
      },
      mcq: { q: 'You double when full. When should you halve the capacity during removals?', options: ['When size drops to capacity / 2', 'When size drops to capacity / 4', 'Never — memory is cheap', 'On every removal'], answer: 1, explain: 'Halving at ½ lets an add/remove pair at the boundary trigger a full copy every time. At ¼, after halving the array is half full, so at least capacity/4 cheap operations happen before the next resize.' },
      hints: [
        `<p>Hint 1: Separate <b>size</b> (elements used) from <b>capacity</b> (array length). Most adds just write into spare capacity.</p>`,
        `<p>Hint 2: When full, allocate <b>2×</b> capacity and copy. Copies form 1 + 2 + 4 + … &lt; 2N, so adds are O(1) amortized (charge 3 coins per add).</p>`,
        `<p>Hint 3: For removals, halve when size == capacity/4 (not /2), keep capacity ≥ 1, and bounds-check get/set against <b>size</b>, not capacity. Potential Φ = |2·size − capacity| proves both directions.</p>`
      ],
      tests: {
        sig: 'int[] -> list<int>',
        fn: 'driveArray',
        harness: {
          java: `class Check {
    // script: x >= 0 add(x); -1 record removeLast(); -2 record get(last); -3 record size();
    // -4 record 1 if capacity stays within 4 * size; -5 set(last, -old - 1); -6 record get(size / 2);
    // -7 removeLast() without recording; -8 add(0) then removeLast()
    static List<Integer> driveArray(int[] script) {
        GrowableArray a = new GrowableArray();
        List<Integer> res = new ArrayList<>();
        for (int c : script) {
            if (c >= 0) a.add(c);
            else if (c == -1) res.add(a.removeLast());
            else if (c == -2) res.add(a.get(a.size() - 1));
            else if (c == -3) res.add(a.size());
            else if (c == -4) res.add(a.capacity() >= a.size() && (a.size() == 0 || a.capacity() <= 4 * a.size()) ? 1 : 0);
            else if (c == -5) a.set(a.size() - 1, -a.get(a.size() - 1) - 1);
            else if (c == -6) res.add(a.get(a.size() / 2));
            else if (c == -7) a.removeLast();
            else if (c == -8) { a.add(0); a.removeLast(); }
        }
        return res;
    }
}`,
          python: `def drive_array(script):
    # x >= 0 add(x); -1 record removeLast(); -2 record get(last); -3 record size();
    # -4 record 1 if capacity stays within 4 * size; -5 set(last, -old - 1); -6 record get(size // 2);
    # -7 removeLast() without recording; -8 add(0) then removeLast()
    a, res = GrowableArray(), []
    for c in script:
        if c >= 0:
            a.add(c)
        elif c == -1:
            res.append(a.removeLast())
        elif c == -2:
            res.append(a.get(a.size() - 1))
        elif c == -3:
            res.append(a.size())
        elif c == -4:
            res.append(1 if a.capacity() >= a.size() and (a.size() == 0 or a.capacity() <= 4 * a.size()) else 0)
        elif c == -5:
            a.set(a.size() - 1, -a.get(a.size() - 1) - 1)
        elif c == -6:
            res.append(a.get(a.size() // 2))
        elif c == -7:
            a.removeLast()
        elif c == -8:
            a.add(0)
            a.removeLast()
    return res`,
          js: `function driveArray(script) {
  // x >= 0 add(x); -1 record removeLast(); -2 record get(last); -3 record size();
  // -4 record 1 if capacity stays within 4 * size; -5 set(last, -old - 1); -6 record get(size / 2);
  // -7 removeLast() without recording; -8 add(0) then removeLast()
  const a = new GrowableArray(), res = [];
  for (const c of script) {
    if (c >= 0) a.add(c);
    else if (c === -1) res.push(a.removeLast());
    else if (c === -2) res.push(a.get(a.size() - 1));
    else if (c === -3) res.push(a.size());
    else if (c === -4) res.push(a.capacity() >= a.size() && (a.size() === 0 || a.capacity() <= 4 * a.size()) ? 1 : 0);
    else if (c === -5) a.set(a.size() - 1, -a.get(a.size() - 1) - 1);
    else if (c === -6) res.push(a.get(Math.floor(a.size() / 2)));
    else if (c === -7) a.removeLast();
    else if (c === -8) { a.add(0); a.removeLast(); }
  }
  return res;
}`,
          cpp: `vector<int> driveArray(vector<int> script) {
    // x >= 0 add(x); -1 record removeLast(); -2 record get(last); -3 record size();
    // -4 record 1 if capacity stays within 4 * size; -5 set(last, -old - 1); -6 record get(size / 2);
    // -7 removeLast() without recording; -8 add(0) then removeLast()
    GrowableArray a;
    vector<int> res;
    for (int c : script) {
        if (c >= 0) a.add(c);
        else if (c == -1) res.push_back(a.removeLast());
        else if (c == -2) res.push_back(a.get(a.size() - 1));
        else if (c == -3) res.push_back(a.size());
        else if (c == -4) res.push_back(a.capacity() >= a.size() && (a.size() == 0 || a.capacity() <= 4 * a.size()) ? 1 : 0);
        else if (c == -5) a.set(a.size() - 1, -a.get(a.size() - 1) - 1);
        else if (c == -6) res.push_back(a.get(a.size() / 2));
        else if (c == -7) a.removeLast();
        else if (c == -8) { a.add(0); a.removeLast(); }
    }
    return res;
}`, csharp: `public class Check {
    // script: x >= 0 add(x); -1 record removeLast(); -2 record get(last); -3 record size();
    // -4 record 1 if capacity stays within 4 * size; -5 set(last, -old - 1); -6 record get(size / 2);
    // -7 removeLast() without recording; -8 add(0) then removeLast()
    public static List<int> DriveArray(int[] script) {
        var a = new GrowableArray();
        var res = new List<int>();
        foreach (int c in script) {
            if (c >= 0) a.Add(c);
            else if (c == -1) res.Add(a.RemoveLast());
            else if (c == -2) res.Add(a.Get(a.Size() - 1));
            else if (c == -3) res.Add(a.Size());
            else if (c == -4) res.Add(a.Capacity() >= a.Size() && (a.Size() == 0 || a.Capacity() <= 4 * a.Size()) ? 1 : 0);
            else if (c == -5) a.Set(a.Size() - 1, -a.Get(a.Size() - 1) - 1);
            else if (c == -6) res.Add(a.Get(a.Size() / 2));
            else if (c == -7) a.RemoveLast();
            else if (c == -8) { a.Add(0); a.RemoveLast(); }
        }
        return res;
    }
}`
        },
        cases: [
          [[[5, 7, 9, -6, -1, -1, -3, -4]], [7, 9, 7, 1, 1]],
          [[[1, 2, 3, -2, -5, -2, -6, -3]], [3, -4, 2, 3]],
          [[[-3, -4]], [0, 1]],
          [[[4, -1, -3, -4, 8, 9, -1, -1, -3, -4]], [4, 0, 1, 9, 8, 0, 1]],
          [
            [{ $concat: [{ $range: [0, 100] }, [-3, -4], { $rep: -7, n: 97 }, [-3, -4, -1, -1, -1, -3]] }],
            [100, 1, 3, 1, 2, 1, 0, 0]
          ],
          [[{ $concat: [{ $range: [0, 1024] }, { $rep: -7, n: 1024 }, [-3, -4, 7, -1, -3, -4]] }], [0, 1, 7, 0, 1]],
          [
            [
              [
                596853, 267459, 519501, -5, -5, -7, -4, -1, 511554, 936710, -4, -4, -7, 729633, -5, -2, -1, -7,
                945215, -3, 23406, 681098, -6, 984769, -4, -7, -1, -4, 553259, -1, -5, -5, -6, -1, -3, -1, -7,
                797911, -5, -2, 436396, -6, -7, 194936, -7, -2, 779245, -3, -6, -4, -6, -7, -1, 297962, -7, -3, -4,
                -3, -4, 503554, -1, -3, -3, 384957, -6, -7, 90667, -5, -7, -4, 816256, 546243, -4, -3, -5, 492117,
                323516, -7, -7, -7, -4, -7, 176783, -6, -1, 807952, -1, -4, -4, 424101, -6, -3, -7, 481434, -2, -7,
                -4, -4, 402327, -6, 543873, -6, -1, -4, 504471, -3, -7, -6, -1, -4, -3, -3, 434555, -3, 564635, -6,
                -7, -7, 480401, -7, 843652, -1, 577509, -7, 902833, 837223, -6, -2, 882633, -7, 87277, 475003,
                790778, -2, -1, -2, 836016, -7, 361153, -2, 175605, 267613, -6, 688554, -2, -7, -2, -5, -3, -5
              ]
            ],
            [
              1, 267459, 1, 1, -729634, -729634, 2, 23406, 1, 681098, 1, 553259, 945215, 23406, 2, 945215, -797912,
              436396, -797912, 2, 779245, 1, 779245, -797912, 0, 1, 0, 1, 503554, 0, 0, 384957, 1, 1, 2, 1, 176783,
              176783, 807952, 1, 1, 424101, 1, 481434, 1, 1, 402327, 543873, 543873, 1, 2, 402327, 402327, 1, 0, 0,
              1, 564635, 843652, 837223, 837223, 790778, 790778, 475003, 361153, 475003, 688554, 267613, 7
            ]
          ],
          [
            [
              [
                -3, 24782, -2, -4, -3, -4, -1, 114044, -2, -6, -1, -4, -3, 236321, 416615, 37042, 467317, -6, -7, -4,
                -6, -1, -7, -6, -5, -1, -4, 414080, -7, -4, 691875, -7, -3, 773273, -2, 222436, 321269, 900217,
                325439, -2, 436388, -7, -2, 8892, -6, 619272, -1, -7, -5, 868129, -7, -6, 396329, -1, -3, 215756, -7,
                -7, -4, -7, -1, -5, 983515, -7, -4, -2, -6, -5, 341149, -7, -4, -2, 164590, -1, -3, -7, 355567, -4,
                -1, -2, -7, 878393, -4, -6, -3, -7, -4, -3, -4, 68495, 88793, 177937, 955239, -6, -1, -2, -3, -7, -6,
                -2, -3, -3, -3, 305361, -1, -7, -5, 608129, -6, 336305, 426349, 398700, 868751, 357456, 645069, -7,
                -4, 598507, -6, -1, -7, 998502, -2, -3, -2, -7, -6, 480005, -2, 825244, 867977, -2, 643486, -7,
                96136, -4, 866249, 197050, -1, -7, -4, 121171, -5, 713964, -1, 780147, 456238, -4, -6, -2, -6, -2,
                -5, -3, 217699, -7, -3, 28586, 825082, -2, -7, -3, -5, -4, -3, -4, 67310, -3, -7, -5, 262209, -1, -7,
                -6, -5, -7, -3, -2, 567911, -1, -2, -1, -1, -3, 859808, -2, 789878, -5, 683682, -7, -7, -3, -1, -4,
                -2, 343137, 332120, -7, -2, -1, -3, 570661, -7, -7, -7, 257003, -1, 847525, -1, -4, 281085, -6,
                764589, 22559, -7, 304948, -3, -5, -5, 105837, -6, -3, 534008, -7, 188289, 148413, -3, -2, 743780,
                -6, -7, -2, 937174, -1, 571990, 817620, -3, -7, -7, -6, -1, 313447, -4, -6, 50917, -7, -1, -2,
                715208, -5, -4, -6, -2, -6, -5, -6, -5, 414932, -3, 270500, -5, 831591, -7, -4, -7, 65348, -3, -7,
                622378, 145223, -2, -2, -4, -7, -4, 642195, 244873, -5, 186204, -6, -3, -6, -7, -5, -7, -7, -1, -1,
                -3, -5, -7, -5, -1, -4, -3, -6, -7, -7, -2, -7
              ]
            ],
            [
              0, 24782, 1, 1, 1, 24782, 114044, 114044, 114044, 1, 0, 37042, 1, 416615, 37042, 236321, -236322, 1,
              1, 0, 773273, 325439, 325439, 900217, 619272, 321269, 396329, 5, 1, 321269, 1, -222437, -222437, 1,
              222436, 164590, 2, 1, 355567, 773273, 1, 878393, 1, 1, 0, 1, 177937, 955239, 177937, 3, 88793, 88793,
              2, 2, 2, 305361, 608129, 1, 398700, 598507, 998502, 7, 998502, 426349, 480005, 867977, 1, 197050, 1,
              713964, 1, 480005, 456238, 480005, 456238, 13, 13, 825082, 14, 1, 14, 1, 15, 262209, 480005, 12,
              780147, 567911, 780147, 780147, -121172, 10, 859808, 11, 859808, 1, 96136, 343137, 343137, 10,
              257003, 847525, 1, 398700, 11, 480005, 12, 14, 148413, 825244, 148413, 937174, 16, 825244, 148413, 1,
              825244, 313447, 188289, 1, 825244, -715209, 825244, 825244, 15, 1, 16, 145223, 145223, 1, 1, 764589,
              19, 764589, 622378, 414932, 14, -188290, 1, 12, 480005, 764589
            ]
          ],
          [
            [
              [
                50538, 800267, -6, -7, -3, 536484, -1, -2, -2, -2, -6, -3, 735348, -5, -7, 897871, 940157, -7, -6,
                -7, -4, 163346, -2, -4, -1, -7, 519072, -7, -3, 402628, -6, 570659, 549636, 847190, -2, -7, 280521,
                145884, -7, -7, -7, 466677, -1, -4, -4, -4, 954292, -3, -5, 652636, -5, -1, 452209, -7, -6, -4,
                692594, -2, -2, -1, -4, -6, 199060, -6, -5, -7, 32304, -7, -7, -1, -2, -1, 298615, 568684, -1, -2,
                -2, -7, 872787, -7, -3, 571869, -3, -5, -4, 806425, -1, -7, -3, 297845, 947931, 123806, -7, 571774,
                -2, -7, -7, 78835, -6, -3, -7, -2, -4, -6, -7, 795460, -6, -3, 129919, -5, -5, -3, -2, -6, -4, -3,
                -7, -7, -3, 679129, -4, -4, -1, -4, 291106, -7, -4, -4, 968159, -5, -7, -4, -3, 737035, 471217, -7,
                -7, -4, 376881, -6, 711509, -4, -7, -4, -4, -3, -7, -4, 516635, -1, 660262, 426769, -7, 664516, -4,
                -2, 804781, 854931, -7, 366424, -2, -4, -7, -6, -2, 484516, -2, -5, 489792, -6, 283975, -6, 780924,
                -7, -4, 372430, 688750, -5, 172111, -6, 723986, 421447, -7, -2, -7, -2, -1, -6, -1, -1, -3, -2,
                78522, -6, -7, -3, -5, -6, -6, 176741, -2, -7, -6, -2, -3, -7, -1, -4, -6, -4, 507116, -2, -7, -3,
                -1, -2, -7, -1, -7, 893147, -7, -3, 973076, -4, -1, 199125, 656289, 913365, -7, -5, -7, 635709, -2,
                -5, -6, 145353, 937290, -5, -3, -2, -4, -1, 753043, -1, -7, -2, 111553, -1, -4, -3, -5, 195833,
                58031, -7, 932054, -1, -7, 518479, -6, -7, -5, -3, -7, -2, 643031, 99856, -1, -4, -1, -5, -5, -4,
                242973, -1, -2, -5, -6, -7, -3, 473638, -2, -3, -5, -7, 953666, -1, 48463, 836179, 899246, -5, -3,
                -4, -7, -2, -1, -4, 922778, -7, 832288, 15918
              ]
            ],
            [
              800267, 1, 536484, 50538, 50538, 50538, 50538, 1, 897871, 1, 163346, 1, 163346, 0, 402628, 847190,
              466677, 1, 1, 1, 3, -652637, 570659, 1, 692594, 692594, 692594, 1, 570659, -954293, 570659, 402628,
              402628, 568684, 298615, 298615, 0, 1, 1, 806425, 0, 571774, 78835, 2, 297845, 1, 297845, 795460, 1,
              2, 129919, 129919, 1, 2, 0, 1, 1, 679129, 1, 1, 1, 1, 0, 1, 376881, 1, 1, 1, 1, 1, 516635, 1, 664516,
              366424, 1, 664516, 804781, 484516, 804781, -484517, 1, 489792, 723986, 172111, 172111, 489792,
              -688751, 372430, 6, 283975, -484517, 6, -484517, -484517, 176741, -484517, -283976, 6, 489792, 1,
              804781, 1, 507116, 4, -484517, 804781, 664516, 0, 1, 973076, 635709, -635710, 4, -937291, 1, -937291,
              753043, -635710, 111553, 1, 2, 932054, 635709, 2, 199125, 99856, 1, 643031, 1, 242973, 199125,
              -199126, 0, 473638, 1, 953666, 3, 1, 836179, 836179, 1
            ]
          ],
          [[{ $concat: [{ $range: [0, 1025] }, { $rep: -8, n: 300000 }, [-3, -4, -2]] }], [1025, 1, 1024]],
          [[{ $concat: [{ $range: [0, 1000000] }, [-3, -4], { $rep: -7, n: 999990 }, [-3, -4, -1]] }], [1000000, 1, 10, 1, 9]]
        ]
      },
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
        self._data = [0]                      # capacity 1
        self._n = 0                           # how many slots are in use

    def add(self, x):
        if self._n == len(self._data):
            self._resize(len(self._data) * 2)     # geometric growth
        self._data[self._n] = x
        self._n += 1

    def removeLast(self):
        if self._n == 0:
            raise IndexError("empty")
        self._n -= 1
        x = self._data[self._n]
        if self._n > 0 and self._n == len(self._data) // 4:
            self._resize(len(self._data) // 2)    # lazy shrink
        return x

    def get(self, i):
        self._check(i)
        return self._data[i]

    def set(self, i, x):
        self._check(i)
        self._data[i] = x

    def size(self):
        return self._n

    def capacity(self):
        return len(self._data)

    def _check(self, i):
        if not 0 <= i < self._n:
            raise IndexError(f"index {i}, size {self._n}")

    def _resize(self, cap):
        nxt = [0] * max(1, cap)
        nxt[:self._n] = self._data[:self._n]      # O(size), rare
        self._data = nxt` }, { lang: 'js', code: `class GrowableArray {
  constructor() {
    this.data = new Int32Array(1);           // capacity 1
    this.n = 0;                              // how many slots are in use
  }
  add(x) {
    if (this.n === this.data.length) this.#resize(this.data.length * 2);   // geometric growth
    this.data[this.n++] = x;
  }
  removeLast() {
    if (this.n === 0) throw new Error('empty');
    const x = this.data[--this.n];
    if (this.n > 0 && this.n === this.data.length >> 2) this.#resize(this.data.length >> 1);   // lazy shrink
    return x;
  }
  get(i) { this.#check(i); return this.data[i]; }
  set(i, x) { this.#check(i); this.data[i] = x; }
  size() { return this.n; }
  capacity() { return this.data.length; }
  #check(i) {
    if (!Number.isInteger(i) || i < 0 || i >= this.n) throw new RangeError(\`index \${i}, size \${this.n}\`);
  }
  #resize(cap) {
    const next = new Int32Array(Math.max(1, cap));
    next.set(this.data.subarray(0, this.n));  // O(size), rare
    this.data = next;
  }
}` }, { lang: 'cpp', code: `class GrowableArray {
    vector<int> data;                         // data.size() is the capacity
    int n = 0;                                // how many slots are in use

    void check(int i) const {
        if (i < 0 || i >= n) throw out_of_range("index " + to_string(i) + ", size " + to_string(n));
    }
    void resize(int cap) {
        vector<int> next(max(1, cap));
        copy(data.begin(), data.begin() + n, next.begin());   // O(size), rare
        data = move(next);
    }
public:
    GrowableArray() : data(1) {}
    void add(int x) {
        if (n == (int)data.size()) resize(data.size() * 2);   // geometric growth
        data[n++] = x;
    }
    int removeLast() {
        if (n == 0) throw out_of_range("empty");
        int x = data[--n];
        if (n > 0 && n == (int)data.size() / 4) resize(data.size() / 2);   // lazy shrink
        return x;
    }
    int get(int i) const { check(i); return data[i]; }
    void set(int i, int x) { check(i); data[i] = x; }
    int size() const { return n; }
    int capacity() const { return data.size(); }
};` }, { lang: 'csharp', code: `public class GrowableArray {
    private int[] data = new int[1];
    private int size = 0;

    public void Add(int x) {
        if (size == data.Length) Resize(data.Length * 2);       // geometric growth
        data[size++] = x;
    }

    public int RemoveLast() {
        if (size == 0) throw new InvalidOperationException("empty");
        int x = data[--size];
        if (size > 0 && size == data.Length / 4) Resize(data.Length / 2);  // lazy shrink
        return x;
    }

    public int Get(int i) { Check(i); return data[i]; }
    public void Set(int i, int x) { Check(i); data[i] = x; }
    public int Size() { return size; }
    public int Capacity() { return data.Length; }

    private void Check(int i) {
        if (i < 0 || i >= size) throw new ArgumentOutOfRangeException("i", "index " + i + ", size " + size);
    }

    private void Resize(int cap) {
        int[] next = new int[Math.Max(1, cap)];
        Array.Copy(data, next, size);                            // O(size), rare
        data = next;
    }
}` }],
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
        followUps: ['Add insert(i, x) and remove(i): what is their cost and why?', 'Make add worst-case O(1) with incremental copying (two arrays live at once).', 'Why do some libraries (Java <code>ArrayList</code>, MSVC <code>vector</code>) pick 1.5× growth instead of 2×?']
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
      '"<b>Concurrent</b> sorted map", "lock-free ordered structure" → skip list (Java <code>ConcurrentSkipListMap</code>; Python, JavaScript and C++ have no standard concurrent ordered map).',
      '"<b>Leaderboard / rank</b> of a player, range by score" → Redis sorted set = skip list + hash map (spans give the rank).',
      'Answer must be "<b>expected</b> O(log N)" and "randomized" is allowed → skip list or treap rather than AVL/red-black.',
      'LSM-tree <b>memtable</b>, in-memory index that is written heavily and scanned in order → skip list (LevelDB / RocksDB).'
    ],
    code: [{ lang: 'java', code: `
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
      }`, alt: [{ lang: 'python', code: `import random

# A complete skip list for ints (duplicates allowed), expected O(log N) per operation.
class SkipList:
    MAX_LEVEL = 16                       # enough for ~2^16 = 65k elements at p = 1/2
    P = 0.5                              # promotion probability

    class _Node:
        __slots__ = ("val", "nxt")
        def __init__(self, val, height):
            self.val = val
            self.nxt = [None] * height   # nxt[l] = successor on level l

    def __init__(self, seed=None):
        self.head = SkipList._Node(float("-inf"), self.MAX_LEVEL)   # sentinel on every level
        self.levels = 1                  # levels currently in use
        self.rnd = random.Random(seed)

    def _random_height(self):            # 1 + number of consecutive heads
        h = 1
        while h < self.MAX_LEVEL and self.rnd.random() < self.P:
            h += 1
        return h

    def _walk(self, x):
        # update[l] = last node with value < x on level l
        update, cur = [self.head] * self.MAX_LEVEL, self.head
        for l in range(self.levels - 1, -1, -1):          # top level down
            while cur.nxt[l] is not None and cur.nxt[l].val < x:
                cur = cur.nxt[l]                          # ride right
            update[l] = cur
        return update

    def contains(self, x):
        cand = self._walk(x)[0].nxt[0]
        return cand is not None and cand.val == x

    def insert(self, x):
        update = self._walk(x)                            # x goes right after update[l] on level l
        h = self._random_height()
        self.levels = max(self.levels, h)                 # brand-new top levels start at head
        node = SkipList._Node(x, h)
        for l in range(h):                                # splice into each of its levels
            node.nxt[l] = update[l].nxt[l]
            update[l].nxt[l] = node

    def remove(self, x):
        update = self._walk(x)
        target = update[0].nxt[0]
        if target is None or target.val != x:
            return False
        for l in range(len(target.nxt)):                  # unlink from every level it is on
            if update[l].nxt[l] is target:
                update[l].nxt[l] = target.nxt[l]
        while self.levels > 1 and self.head.nxt[self.levels - 1] is None:
            self.levels -= 1                              # drop empty top levels
        return True

    # Smallest key >= x, or None: an ordered query a dict cannot answer.
    def ceiling(self, x):
        cand = self._walk(x)[0].nxt[0]
        return None if cand is None else cand.val` }, { lang: 'js', code: `// A complete skip list for ints (duplicates allowed), expected O(log N) per operation.
class SkipList {
  static MAX_LEVEL = 16;                 // enough for ~2^16 = 65k elements at p = 1/2
  static P = 0.5;                        // promotion probability

  constructor() {
    // sentinel on every level; next[l] = successor on level l
    this.head = { val: -Infinity, next: new Array(SkipList.MAX_LEVEL).fill(null) };
    this.levels = 1;                     // levels currently in use
  }

  #randomHeight() {                      // 1 + number of consecutive heads
    let h = 1;
    while (h < SkipList.MAX_LEVEL && Math.random() < SkipList.P) h++;
    return h;
  }

  // update[l] = last node with value < x on level l
  #walk(x) {
    const update = new Array(SkipList.MAX_LEVEL).fill(this.head);
    let cur = this.head;
    for (let l = this.levels - 1; l >= 0; l--) {          // top level down
      while (cur.next[l] !== null && cur.next[l].val < x) cur = cur.next[l];   // ride right
      update[l] = cur;
    }
    return update;
  }

  contains(x) {
    const cand = this.#walk(x)[0].next[0];
    return cand !== null && cand.val === x;
  }

  insert(x) {
    const update = this.#walk(x);        // x goes right after update[l] on level l
    const h = this.#randomHeight();
    this.levels = Math.max(this.levels, h);               // brand-new top levels start at head
    const node = { val: x, next: new Array(h).fill(null) };
    for (let l = 0; l < h; l++) {                         // splice into each of its levels
      node.next[l] = update[l].next[l];
      update[l].next[l] = node;
    }
  }

  remove(x) {
    const update = this.#walk(x);
    const target = update[0].next[0];
    if (target === null || target.val !== x) return false;
    for (let l = 0; l < target.next.length; l++) {        // unlink from every level it is on
      if (update[l].next[l] === target) update[l].next[l] = target.next[l];
    }
    while (this.levels > 1 && this.head.next[this.levels - 1] === null) this.levels--;   // drop empty top levels
    return true;
  }

  // Smallest key >= x, or null: an ordered query a Map cannot answer.
  ceiling(x) {
    const cand = this.#walk(x)[0].next[0];
    return cand === null ? null : cand.val;
  }
}` }, { lang: 'cpp', code: `// A complete skip list for ints (duplicates allowed), expected O(log N) per operation.
class SkipList {
    static constexpr int MAX_LEVEL = 16;       // enough for ~2^16 = 65k elements at p = 1/2
    static constexpr double P = 0.5;           // promotion probability

    struct Node {
        int val;
        vector<Node*> next;                    // next[l] = successor on level l
        Node(int v, int height) : val(v), next(height, nullptr) {}
    };

    Node* head = new Node(INT_MIN, MAX_LEVEL); // sentinel on every level
    int levels = 1;                            // levels currently in use
    mt19937 rng;

    int randomHeight() {                       // 1 + number of consecutive heads
        int h = 1;
        while (h < MAX_LEVEL && bernoulli_distribution(P)(rng)) h++;
        return h;
    }

    // update[l] = last node with value < x on level l
    void walk(int x, array<Node*, MAX_LEVEL>& update) {
        update.fill(head);
        Node* cur = head;
        for (int l = levels - 1; l >= 0; l--) {                // top level down
            while (cur->next[l] && cur->next[l]->val < x) cur = cur->next[l];   // ride right
            update[l] = cur;
        }
    }

public:
    SkipList(unsigned seed) : rng(seed) {}
    ~SkipList() {
        for (Node* cur = head; cur;) { Node* nxt = cur->next[0]; delete cur; cur = nxt; }
    }
    SkipList(const SkipList&) = delete;
    SkipList& operator=(const SkipList&) = delete;

    bool contains(int x) {
        array<Node*, MAX_LEVEL> update;
        walk(x, update);
        Node* cand = update[0]->next[0];
        return cand && cand->val == x;
    }

    void insert(int x) {
        array<Node*, MAX_LEVEL> update;
        walk(x, update);                       // x goes right after update[l] on level l
        int h = randomHeight();
        levels = max(levels, h);               // brand-new top levels start at head
        Node* node = new Node(x, h);
        for (int l = 0; l < h; l++) {          // splice into each of its levels
            node->next[l] = update[l]->next[l];
            update[l]->next[l] = node;
        }
    }

    bool remove(int x) {
        array<Node*, MAX_LEVEL> update;
        walk(x, update);
        Node* target = update[0]->next[0];
        if (!target || target->val != x) return false;
        for (int l = 0; l < (int)target->next.size(); l++)    // unlink from every level it is on
            if (update[l]->next[l] == target) update[l]->next[l] = target->next[l];
        delete target;
        while (levels > 1 && !head->next[levels - 1]) levels--;   // drop empty top levels
        return true;
    }

    // Smallest key >= x, or nullopt: an ordered query an unordered_map cannot answer.
    optional<int> ceiling(int x) {
        array<Node*, MAX_LEVEL> update;
        walk(x, update);
        Node* cand = update[0]->next[0];
        return cand ? optional<int>(cand->val) : nullopt;
    }
};` }, { lang: 'csharp', code: `// A complete skip list for ints (duplicates allowed), expected O(log N) per operation.
class SkipList {
    private const int MAX_LEVEL = 16;                 // enough for ~2^16 = 65k elements at p = 1/2
    private const double P = 0.5;                     // promotion probability

    private sealed class Node {
        public readonly int val;
        public readonly Node[] next;                  // next[l] = successor on level l
        public Node(int val, int height) { this.val = val; this.next = new Node[height]; }
    }

    private readonly Node head = new Node(int.MinValue, MAX_LEVEL); // sentinel on every level
    private int levels = 1;                           // levels currently in use
    private readonly Random rnd;

    public SkipList(int seed) { rnd = new Random(seed); }

    private int RandomHeight() {                      // 1 + number of consecutive heads
        int h = 1;
        while (h < MAX_LEVEL && rnd.NextDouble() < P) h++;
        return h;
    }

    public bool Contains(int x) {
        Node cur = head;
        for (int l = levels - 1; l >= 0; l--)         // top level down
            while (cur.next[l] != null && cur.next[l].val < x) cur = cur.next[l]; // ride right
        cur = cur.next[0];
        return cur != null && cur.val == x;
    }

    public void Insert(int x) {
        Node[] update = new Node[MAX_LEVEL];
        Node cur = head;
        for (int l = levels - 1; l >= 0; l--) {
            while (cur.next[l] != null && cur.next[l].val < x) cur = cur.next[l];
            update[l] = cur;                          // x goes right after cur on level l
        }
        int h = RandomHeight();
        for (int l = levels; l < h; l++) update[l] = head;   // brand-new top levels start at head
        levels = Math.Max(levels, h);
        Node node = new Node(x, h);
        for (int l = 0; l < h; l++) {                 // splice into each of its levels
            node.next[l] = update[l].next[l];
            update[l].next[l] = node;
        }
    }

    public bool Remove(int x) {
        Node[] update = new Node[MAX_LEVEL];
        Node cur = head;
        for (int l = levels - 1; l >= 0; l--) {
            while (cur.next[l] != null && cur.next[l].val < x) cur = cur.next[l];
            update[l] = cur;
        }
        Node target = cur.next[0];
        if (target == null || target.val != x) return false;
        for (int l = 0; l < target.next.Length; l++)  // unlink from every level it is on
            if (update[l].next[l] == target) update[l].next[l] = target.next[l];
        while (levels > 1 && head.next[levels - 1] == null) levels--;   // drop empty top levels
        return true;
    }

    // Smallest key >= x, or null: an ordered query a hash table cannot answer.
    public int? Ceiling(int x) {
        Node cur = head;
        for (int l = levels - 1; l >= 0; l--)
            while (cur.next[l] != null && cur.next[l].val < x) cur = cur.next[l];
        return cur.next[0] == null ? (int?)null : cur.next[0].val;
    }
}` }] }, { lang: 'python', run: true, code: `import random, math

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
    print(f"N={n:>7}  levels={sl.levels:>2}  avg steps={avg:6.1f}  log2 N={math.log2(n):5.1f}  (theory ~ 2*log2 N = {2*math.log2(n):5.1f})")`, alt: [{ lang: 'js', run: true, code: `// Small seeded generator so the output is reproducible (mulberry32).
function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class SkipList {
  static MAX = 24;
  constructor(p = 0.5, seed = 1) {
    this.p = p; this.rand = makeRng(seed); this.levels = 1;
    this.head = { val: null, next: new Array(SkipList.MAX).fill(null) };
  }
  height() {
    let h = 1;
    while (h < SkipList.MAX && this.rand() < this.p) h++;
    return h;
  }
  insert(x) {
    const update = new Array(SkipList.MAX).fill(this.head);
    let cur = this.head;
    for (let l = this.levels - 1; l >= 0; l--) {
      while (cur.next[l] !== null && cur.next[l].val < x) cur = cur.next[l];
      update[l] = cur;
    }
    const h = this.height();
    this.levels = Math.max(this.levels, h);
    const node = { val: x, next: new Array(h).fill(null) };
    for (let l = 0; l < h; l++) {
      node.next[l] = update[l].next[l];
      update[l].next[l] = node;
    }
  }
  searchSteps(x) {
    let cur = this.head, steps = 0;
    for (let l = this.levels - 1; l >= 0; l--) {
      while (cur.next[l] !== null && cur.next[l].val < x) { cur = cur.next[l]; steps++; }
      steps++;                                    // the drop-down
    }
    return steps;
  }
}

for (const n of [1000, 10000, 100000]) {
  const sl = new SkipList(0.5, 7);
  const keys = Array.from({ length: n }, (_, i) => i);
  const shuf = makeRng(3);
  for (let i = n - 1; i > 0; i--) {              // shuffle the keys
    const j = Math.floor(shuf() * (i + 1));
    [keys[i], keys[j]] = [keys[j], keys[i]];
  }
  for (const k of keys) sl.insert(k);
  const pick = makeRng(5);
  let total = 0;
  for (let i = 0; i < 300; i++) total += sl.searchSteps(Math.floor(pick() * n));
  const avg = total / 300;
  console.log(\`N=\${String(n).padStart(7)}  levels=\${String(sl.levels).padStart(2)}  avg steps=\${avg.toFixed(1).padStart(6)}  log2 N=\${Math.log2(n).toFixed(1).padStart(5)}  (theory ~ 2*log2 N = \${(2 * Math.log2(n)).toFixed(1).padStart(5)})\`);
}` }, { lang: 'cpp', code: `#include <bits/stdc++.h>
using namespace std;

struct SkipList {
    static constexpr int MAX = 24;
    struct Node { int val; vector<Node*> next; Node(int v, int h) : val(v), next(h, nullptr) {} };
    double p;
    mt19937 rng;
    int levels = 1;
    Node* head = new Node(INT_MIN, MAX);
    SkipList(double p, unsigned seed) : p(p), rng(seed) {}
    ~SkipList() { for (Node* c = head; c;) { Node* n = c->next[0]; delete c; c = n; } }

    int height() {
        int h = 1;
        uniform_real_distribution<double> unit(0.0, 1.0);
        while (h < MAX && unit(rng) < p) h++;
        return h;
    }
    void insert(int x) {
        array<Node*, MAX> update;
        update.fill(head);
        Node* cur = head;
        for (int l = levels - 1; l >= 0; l--) {
            while (cur->next[l] && cur->next[l]->val < x) cur = cur->next[l];
            update[l] = cur;
        }
        int h = height();
        levels = max(levels, h);
        Node* node = new Node(x, h);
        for (int l = 0; l < h; l++) { node->next[l] = update[l]->next[l]; update[l]->next[l] = node; }
    }
    int searchSteps(int x) {
        Node* cur = head;
        int steps = 0;
        for (int l = levels - 1; l >= 0; l--) {
            while (cur->next[l] && cur->next[l]->val < x) { cur = cur->next[l]; steps++; }
            steps++;                                    // the drop-down
        }
        return steps;
    }
};

int main() {
    for (int n : {1000, 10000, 100000}) {
        SkipList sl(0.5, 7);
        vector<int> keys(n);
        iota(keys.begin(), keys.end(), 0);
        mt19937 shuf(3);
        shuffle(keys.begin(), keys.end(), shuf);
        for (int k : keys) sl.insert(k);
        mt19937 pick(5);
        double total = 0;
        for (int i = 0; i < 300; i++) total += sl.searchSteps(uniform_int_distribution<int>(0, n - 1)(pick));
        printf("N=%7d  levels=%2d  avg steps=%6.1f  log2 N=%5.1f  (theory ~ 2*log2 N = %5.1f)\\n",
               n, sl.levels, total / 300, log2((double)n), 2 * log2((double)n));
    }
}` }, { lang: 'csharp', code: `using System;
using System.Collections.Generic;
using System.Linq;

class SkipList {
    const int MAX = 24;
    class Node { public int val; public Node[] next; public Node(int v, int h) { val = v; next = new Node[h]; } }
    readonly double p; readonly Random rnd; public int levels = 1;
    readonly Node head = new Node(int.MinValue, MAX);

    public SkipList(double p = 0.5, int seed = 1) { this.p = p; rnd = new Random(seed); }

    int Height() {
        int h = 1;
        while (h < MAX && rnd.NextDouble() < p) h++;
        return h;
    }

    public void Insert(int x) {
        var update = new Node[MAX];
        for (int l = 0; l < MAX; l++) update[l] = head;
        Node cur = head;
        for (int l = levels - 1; l >= 0; l--) {
            while (cur.next[l] != null && cur.next[l].val < x) cur = cur.next[l];
            update[l] = cur;
        }
        int h = Height();
        levels = Math.Max(levels, h);
        var node = new Node(x, h);
        for (int l = 0; l < h; l++) { node.next[l] = update[l].next[l]; update[l].next[l] = node; }
    }

    public int SearchSteps(int x) {
        Node cur = head; int steps = 0;
        for (int l = levels - 1; l >= 0; l--) {
            while (cur.next[l] != null && cur.next[l].val < x) { cur = cur.next[l]; steps++; }
            steps++;                                      // the drop-down
        }
        return steps;
    }
}

class Program {
    static void Main() {
        foreach (int n in new[] { 1000, 10000, 100000 }) {
            var sl = new SkipList(0.5, 7);
            int[] keys = Enumerable.Range(0, n).ToArray();
            var shuf = new Random(3);
            for (int i = n - 1; i > 0; i--) { int j = shuf.Next(i + 1); int t = keys[i]; keys[i] = keys[j]; keys[j] = t; }
            foreach (int k in keys) sl.Insert(k);
            var probeRnd = new Random(5);
            double total = 0;
            for (int i = 0; i < 300; i++) total += sl.SearchSteps(probeRnd.Next(n));
            double avg = total / 300;
            Console.WriteLine("N=" + n.ToString().PadLeft(7) + "  levels=" + sl.levels.ToString().PadLeft(2) + "  avg steps=" + avg.ToString("F1").PadLeft(6)
                + "  log2 N=" + Math.Log(n, 2).ToString("F1").PadLeft(5) + "  (theory ~ 2*log2 N = " + (2 * Math.Log(n, 2)).ToString("F1").PadLeft(5) + ")");
        }
    }
}`, run: true }, { lang: 'java', code: `public class Main {
    static final int MAX = 24;

    static class Node {
        final int val;
        final Node[] next;
        Node(int val, int h) { this.val = val; this.next = new Node[h]; }
    }

    static class SkipList {
        final double p;
        final Random rnd;
        int levels = 1;
        final Node head = new Node(Integer.MIN_VALUE, MAX);
        SkipList(double p, long seed) { this.p = p; this.rnd = new Random(seed); }

        int height() {
            int h = 1;
            while (h < MAX && rnd.nextDouble() < p) h++;
            return h;
        }

        void insert(int x) {
            Node[] update = new Node[MAX];
            Arrays.fill(update, head);
            Node cur = head;
            for (int l = levels - 1; l >= 0; l--) {
                while (cur.next[l] != null && cur.next[l].val < x) cur = cur.next[l];
                update[l] = cur;
            }
            int h = height();
            levels = Math.max(levels, h);
            Node node = new Node(x, h);
            for (int l = 0; l < h; l++) { node.next[l] = update[l].next[l]; update[l].next[l] = node; }
        }

        int searchSteps(int x) {
            Node cur = head;
            int steps = 0;
            for (int l = levels - 1; l >= 0; l--) {
                while (cur.next[l] != null && cur.next[l].val < x) { cur = cur.next[l]; steps++; }
                steps++;                                    // the drop-down
            }
            return steps;
        }
    }

    public static void main(String[] args) {
        for (int n : new int[]{1000, 10000, 100000}) {
            SkipList sl = new SkipList(0.5, 7);
            List<Integer> keys = new ArrayList<>();
            for (int i = 0; i < n; i++) keys.add(i);
            Collections.shuffle(keys, new Random(3));
            for (int k : keys) sl.insert(k);
            Random pick = new Random(5);
            double total = 0;
            for (int i = 0; i < 300; i++) total += sl.searchSteps(pick.nextInt(n));
            System.out.printf("N=%7d  levels=%2d  avg steps=%6.1f  log2 N=%5.1f  (theory ~ 2*log2 N = %5.1f)%n",
                n, sl.levels, total / 300, Math.log(n) / Math.log(2), 2 * Math.log(n) / Math.log(2));
        }
    }
}` }] }],
    codeTitle: ['Skip list with insert / contains / remove / ceiling', 'Empirical O(log N) check (runnable)'],
    viz: {
      title: 'Build a skip list with coin flips, then search riding the express lanes',
      input: '3 7 9 12 19 21 25 26 | 25 | 18',
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
      { title: 'Range query: all keys in [8, 20]', html: `<p>Find ceiling(8) with a normal search (lands on 9), then walk level 0 until a key exceeds 20: 9, 12, 19. Cost O(log N + K) for K results — the same as a balanced BST's in-order range scan, and something a hash table cannot do.</p>`, code: { lang: 'java', code: `// Java ships a production skip list: ConcurrentSkipListSet / ConcurrentSkipListMap.
ConcurrentSkipListSet<Integer> s = new ConcurrentSkipListSet<>(List.of(3, 7, 9, 12, 19, 21, 25, 26));
System.out.println(s.ceiling(8));                    // 9
System.out.println(s.subSet(8, true, 20, true));     // [9, 12, 19]`, alt: [{ lang: 'python', code: `import bisect

# Python has no built-in skip list. A sorted list plus bisect answers the same ordered queries
# (inserts cost O(N); sortedcontainers.SortedList is the usual fast drop-in).
s = [3, 7, 9, 12, 19, 21, 25, 26]
print(s[bisect.bisect_left(s, 8)])                          # 9   ceiling(8)
print(s[bisect.bisect_left(s, 8):bisect.bisect_right(s, 20)])   # [9, 12, 19]` }, { lang: 'js', code: `// JavaScript has no built-in ordered set. A sorted array plus binary search answers the same
// ordered queries (inserts cost O(N)); libraries or your own skip list/B-tree give O(log N).
const s = [3, 7, 9, 12, 19, 21, 25, 26];
const lowerBound = (a, x) => {          // first index with a[i] >= x
  let lo = 0, hi = a.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (a[mid] < x) lo = mid + 1; else hi = mid; }
  return lo;
};
console.log(s[lowerBound(s, 8)]);                              // 9   ceiling(8)
console.log(s.slice(lowerBound(s, 8), lowerBound(s, 21)));     // [ 9, 12, 19 ]` }, { lang: 'cpp', code: `// std::set is a balanced tree (ordered, O(log N)); a skip list gives the same queries.
set<int> s = {3, 7, 9, 12, 19, 21, 25, 26};
cout << *s.lower_bound(8) << endl;                      // 9   ceiling(8)
for (auto it = s.lower_bound(8); it != s.upper_bound(20); ++it) cout << *it << " ";   // 9 12 19
cout << endl;` }, { lang: 'csharp', code: `// .NET ships an ordered set (a red-black tree) with the same ordered queries a skip list gives.
var s = new SortedSet<int> { 3, 7, 9, 12, 19, 21, 25, 26 };
Console.WriteLine(s.GetViewBetween(8, int.MaxValue).Min);           // 9  (ceiling of 8)
Console.WriteLine("[" + string.Join(", ", s.GetViewBetween(8, 20)) + "]");   // [9, 12, 19]` }] } },
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
        why: `<p>Keep a sorted array list (<code>ArrayList</code> / <code>list</code> / <code>vector</code>): search with binary search in O(log N), but <code>add</code>/<code>erase</code> shift elements → <b>O(N)</b> each, so 5·10<sup>4</sup> operations can cost ~10<sup>9</sup> moves in the worst case. A plain sorted linked list fixes the shifting but makes the search O(N). The skip list gets both: linked-list splicing plus binary-search-like hops.</p>`,
        code: { lang: 'java', code: `class Skiplist {
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
}`, alt: [{ lang: 'python', code: String.raw`
from bisect import bisect_left

class Skiplist:
    def __init__(self):
        self.list = []                                # always sorted

    def search(self, target):
        i = bisect_left(self.list, target)            # O(log N)
        return i < len(self.list) and self.list[i] == target

    def add(self, num):
        i = bisect_left(self.list, num)
        self.list.insert(i, num)                      # O(N) shift

    def erase(self, num):
        i = bisect_left(self.list, num)
        if i == len(self.list) or self.list[i] != num:
            return False
        self.list.pop(i)                              # O(N) shift
        return True` }, { lang: 'js', code: String.raw`
class Skiplist {
  constructor() {
    this.list = [];                                   // always sorted
  }

  lowerBound(x) {                                     // O(log N) binary search
    let lo = 0, hi = this.list.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.list[mid] < x) lo = mid + 1; else hi = mid;
    }
    return lo;
  }

  search(target) {
    const i = this.lowerBound(target);
    return i < this.list.length && this.list[i] === target;
  }

  add(num) {
    this.list.splice(this.lowerBound(num), 0, num);   // O(N) shift
  }

  erase(num) {
    const i = this.lowerBound(num);
    if (i === this.list.length || this.list[i] !== num) return false;
    this.list.splice(i, 1);                           // O(N) shift
    return true;
  }
}` }, { lang: 'cpp', code: String.raw`
class Skiplist {
    vector<int> list;                                 // always sorted

public:
    bool search(int target) {
        auto it = lower_bound(list.begin(), list.end(), target);   // O(log N)
        return it != list.end() && *it == target;
    }

    void add(int num) {
        list.insert(lower_bound(list.begin(), list.end(), num), num);   // O(N) shift
    }

    bool erase(int num) {
        auto it = lower_bound(list.begin(), list.end(), num);
        if (it == list.end() || *it != num) return false;
        list.erase(it);                               // O(N) shift
        return true;
    }
};` }, { lang: 'csharp', code: `public class Skiplist {
    private readonly List<int> list = new List<int>();   // always sorted

    public bool Search(int target) {
        return list.BinarySearch(target) >= 0;            // O(log N)
    }

    public void Add(int num) {
        int i = list.BinarySearch(num);
        if (i < 0) i = ~i;
        list.Insert(i, num);                              // O(N) shift
    }

    public bool Erase(int num) {
        int i = list.BinarySearch(num);
        if (i < 0) return false;
        list.RemoveAt(i);                                 // O(N) shift
        return true;
    }
}` }] }
      },
      mcq: { q: 'During add(num), what does update[l] store?', options: ['The node num itself on level l', 'The last node on level l whose value is &lt; num (num is spliced right after it)', 'The first node on level l whose value is ≥ num', 'The head of level l'], answer: 1, explain: 'The search drops a level exactly when the next value is ≥ num, so the current node is the predecessor on that level. New levels above the current top use the head as predecessor.' },
      hints: [
        `<p>Hint 1: Node = value + array of next pointers (one per level it lives on). A head sentinel has the maximum number of levels.</p>`,
        `<p>Hint 2: All three operations start with the same walk: from the top level, move right while next.val &lt; x, then go down. Record the node where you went down on each level in update[].</p>`,
        `<p>Hint 3: add: height = 1 + number of consecutive coin heads (cap at ~16); levels above the current top use head as predecessor; splice bottom-up. erase: target = update[0].next[0]; check its value; unlink on each level where update[l].next[l] == target; shrink the level count while the top is empty.</p>`
      ],
      tests: {
        sig: 'int[] -> list<int>',
        fn: 'driveSkiplist',
        harness: {
          java: `class Check {
    // script entry = kind * 100000 + value: kind 0 add, 1 search (records 1 or 0), 2 erase (records 1 or 0)
    static List<Integer> driveSkiplist(int[] script) {
        Skiplist s = new Skiplist();
        List<Integer> res = new ArrayList<>();
        for (int c : script) {
            int v = c % 100000;
            switch (c / 100000) {
                case 0: s.add(v); break;
                case 1: res.add(s.search(v) ? 1 : 0); break;
                default: res.add(s.erase(v) ? 1 : 0);
            }
        }
        return res;
    }
}`,
          python: `def drive_skiplist(script):
    # script entry = kind * 100000 + value: kind 0 add, 1 search (records 1 or 0), 2 erase (records 1 or 0)
    s, res = Skiplist(), []
    for c in script:
        kind, v = divmod(c, 100000)
        if kind == 0:
            s.add(v)
        elif kind == 1:
            res.append(1 if s.search(v) else 0)
        else:
            res.append(1 if s.erase(v) else 0)
    return res`,
          js: `function driveSkiplist(script) {
  // script entry = kind * 100000 + value: kind 0 add, 1 search (records 1 or 0), 2 erase (records 1 or 0)
  const s = new Skiplist(), res = [];
  for (const c of script) {
    const kind = Math.floor(c / 100000), v = c % 100000;
    if (kind === 0) s.add(v);
    else if (kind === 1) res.push(s.search(v) ? 1 : 0);
    else res.push(s.erase(v) ? 1 : 0);
  }
  return res;
}`,
          cpp: `vector<int> driveSkiplist(vector<int> script) {
    // script entry = kind * 100000 + value: kind 0 add, 1 search (records 1 or 0), 2 erase (records 1 or 0)
    Skiplist s;
    vector<int> res;
    for (int c : script) {
        int kind = c / 100000, v = c % 100000;
        if (kind == 0) s.add(v);
        else if (kind == 1) res.push_back(s.search(v) ? 1 : 0);
        else res.push_back(s.erase(v) ? 1 : 0);
    }
    return res;
}`, csharp: `public class Check {
    // script entry = kind * 100000 + value: kind 0 add, 1 search (records 1 or 0), 2 erase (records 1 or 0)
    public static List<int> DriveSkiplist(int[] script) {
        var s = new Skiplist();
        var res = new List<int>();
        foreach (int c in script) {
            int kind = c / 100000, v = c % 100000;
            if (kind == 0) s.Add(v);
            else if (kind == 1) res.Add(s.Search(v) ? 1 : 0);
            else res.Add(s.Erase(v) ? 1 : 0);
        }
        return res;
    }
}`
        },
        cases: [
          [[[1, 2, 3, 100000, 4, 100001, 200000, 200001, 100001]], [0, 1, 0, 1, 0]],
          [[[5, 5, 5, 200005, 100005, 200005, 200005, 200005, 100005]], [1, 1, 1, 1, 0, 0]],
          [[[100000, 200000, 0, 100000, 20000, 120000, 220000, 120000, 220000, 100000]], [0, 0, 1, 1, 1, 0, 0, 1]],
          [[[10, 20, 30, 200020, 100020, 100010, 100030, 200010, 200030, 100010, 100030]], [1, 0, 1, 1, 1, 1, 0, 0]],
          [[[7, 3, 9, 3, 5, 200003, 100003, 200003, 100003, 200004]], [1, 1, 1, 0, 0]],
          [
            [
              [
                100024, 200009, 100025, 16, 5, 100007, 25, 20, 24, 100008, 200000, 22, 100023, 200016, 200009,
                100020, 100004, 200008, 100009, 200024, 200005, 100012, 4, 5, 2, 100018, 19, 9, 200011, 11, 19, 25,
                100020, 100018, 200021, 100013, 200000, 100003, 16, 200003, 7, 24, 24, 18, 200019, 200009, 100000,
                100008, 9, 12, 23, 11, 100003, 0, 17, 2, 100003, 24, 100025, 200013, 200023, 200006, 18, 200001,
                200022, 19, 4, 22, 9, 200024, 7, 6, 10, 200022, 200019, 100014, 200000, 200016, 100000, 200015,
                200007, 200022, 200008, 3, 7, 200015, 100024, 200004, 3, 100022, 12, 20, 2, 15, 200012, 200011, 17,
                200008, 6, 200018, 6, 11, 100017, 2, 200024, 200025, 15, 0, 200012, 2, 200015, 200001, 12, 19,
                200012, 10, 200014, 200024, 200020, 21, 200017, 0, 200015, 0, 100019, 11, 21, 100004, 200021, 1, 21,
                0, 200008, 16, 24, 200012, 200011, 16, 24, 200014, 200018, 200007, 21, 200013, 100025, 12, 100009,
                200015, 100016, 10, 4, 200019, 14, 4, 200014, 100013, 25, 19, 23, 7, 100009, 21, 25, 100012, 16,
                200011, 100006, 12, 6, 100013, 17, 200015, 200015, 19, 200019, 200011, 200008, 19, 200025, 15, 2,
                100008, 100010, 0, 200024, 24, 13, 200012, 200021, 200020, 200001, 15, 100022, 100012, 20, 200009,
                21, 14, 200019, 5
              ]
            ],
            [
              0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 1,
              0, 0, 1, 1, 1, 1, 0, 1, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1,
              1, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1,
              1, 0, 1, 1, 1
            ]
          ],
          [
            [
              [
                100011, 200005, 200012, 200007, 19, 200009, 4, 200003, 11, 20, 18, 21, 200015, 19, 200014, 100000,
                100001, 100024, 100025, 200002, 12, 100008, 100024, 100004, 11, 100004, 100014, 18, 200002, 200008,
                11, 19, 18, 15, 200010, 200006, 200008, 20, 200017, 200007, 100010, 13, 200025, 22, 6, 5, 100017, 15,
                100000, 19, 200007, 100021, 100021, 200020, 200004, 1, 25, 200013, 22, 200016, 200020, 200022, 17,
                200023, 200022, 100020, 200013, 25, 1, 100006, 200010, 200009, 200025, 16, 14, 200009, 200021,
                200012, 6, 4, 17, 100020, 20, 25, 5, 100002, 200015, 0, 19, 200021, 200025, 200021, 3, 22, 3, 100003,
                100014, 200016, 200010, 10, 200020, 100007, 200009, 200019, 1, 100018, 200016, 200024, 0, 22, 0, 18,
                17, 23, 100012, 200005, 200001, 100023, 1, 200004, 15, 100001, 6, 100008, 200008, 22, 100013, 100006,
                16, 200003, 200006, 100018, 6, 200006, 16, 8, 200019, 13, 100012, 20, 13, 200022, 7, 200005, 19,
                200009, 200011, 8, 23, 200005, 100017, 200025, 20, 16, 200008, 23, 100004, 100010, 200014, 200024,
                13, 200011, 100004, 200020, 200007, 200012, 100023, 1, 23, 9, 100011, 200015, 200010, 11, 200024, 21,
                200002, 19, 100009, 200019, 8, 200007, 14, 19, 18, 100010, 200006, 200002, 200003, 200012, 200002,
                200024, 200015, 200001, 4, 200025, 200024, 200025, 200006, 24, 100004, 100013, 18, 200000, 100024,
                100024, 7, 100010, 3, 100009, 6, 200004, 14, 200024, 200013, 200001, 3, 19, 2, 15, 200001, 200004, 0,
                100000, 200003, 10, 200006, 100025, 100001, 13, 5, 5, 0, 23, 200001, 200016, 200002, 15, 200000, 23,
                100022, 200021, 200021, 200005, 100003, 4, 200022, 200014, 200020, 100015, 200022, 2, 100017, 200003,
                9, 10, 12, 16, 18, 100006, 1, 200010, 200023, 200000, 100005, 100015, 200000, 24, 200008, 19, 100023,
                200010, 200014, 21, 25, 200016, 6, 19, 4, 200005, 100010, 19, 100016, 12, 200018, 200005, 200020,
                100015, 5, 200018, 17, 200003, 100022, 18, 100011, 200020, 100003, 200025, 200025, 5, 200004, 200005,
                23, 100014, 200023, 6, 100011, 100025, 100015, 6, 12, 21, 5, 100008, 100010, 200014, 200004, 100024,
                13, 200015, 1, 200008, 100007, 200025, 100008, 22, 17, 100024, 200013, 8, 22, 16, 100020, 200020, 23,
                24, 14, 200024, 18, 200024, 15, 9, 200000, 1, 100016, 200022, 200010, 100005, 100008, 200005, 100015,
                23, 100002, 14, 15, 12, 14, 100013, 3, 0, 200014, 100005, 200021, 200015, 200003, 200012, 11, 13,
                200012, 14, 100000, 200021, 16, 200014, 100014, 200005, 5, 19, 8, 12, 100010, 100008, 200005, 23,
                100024, 10, 25, 6, 18, 100010, 22, 15, 100023, 0, 200013, 15, 200004, 200022, 3, 200010
              ]
            ],
            [
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              1,
              1,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              1,
              1,
              1,
              1,
              1,
              0,
              1,
              1,
              0,
              1,
              0,
              0,
              1,
              0,
              0,
              1,
              0,
              1,
              1,
              0,
              0,
              1,
              0,
              1,
              0,
              1,
              1,
              1,
              0,
              1,
              0,
              0,
              1,
              1,
              0,
              0,
              0,
              1,
              1,
              1,
              1,
              1,
              0,
              0,
              0,
              1,
              1,
              1,
              1,
              1,
              1,
              0,
              1,
              1,
              0,
              1,
              0,
              1,
              1,
              1,
              0,
              1,
              1,
              0,
              1,
              0,
              1,
              1,
              0,
              1,
              1,
              1,
              1,
              0,
              0,
              1,
              1,
              0,
              0,
              1,
              0,
              1,
              0,
              0,
              0,
              1,
              1,
              0,
              0,
              0,
              1,
              1,
              1,
              1,
              1,
              1,
              0,
              1,
              1,
              1,
              1,
              1,
              1,
              0,
              1,
              1,
              1,
              0,
              1,
              1,
              1,
              1,
              1,
              1,
              1,
              0,
              1,
              1,
              1,
              1,
              1,
              1,
              1,
              1,
              1,
              0,
              1,
              1,
              1,
              1,
              1,
              1,
              1,
              1,
              1,
              1,
              1,
              1,
              0,
              1,
              1,
              0,
              0,
              1,
              1,
              0,
              0,
              1,
              0,
              0,
              1,
              0,
              1,
              1,
              0,
              1,
              1,
              0,
              1,
              1,
              0,
              0,
              1,
              1,
              1,
              1,
              1,
              0,
              0,
              1,
              1,
              0,
              0,
              1,
              1,
              1,
              1,
              1,
              0,
              ...Array(18).fill(1),
              0,
              1,
              1,
              0,
              1,
              1,
              1,
              0,
              1,
              1
            ]
          ],
          [
            [
              [
                6, 200007, 200011, 100023, 3, 200022, 23, 22, 5, 200000, 200020, 100014, 200020, 23, 200007, 18, 6,
                200025, 17, 7, 100001, 200024, 20, 200012, 17, 100008, 3, 9, 16, 200022, 23, 16, 3, 200015, 100024,
                200021, 200024, 200015, 200021, 100009, 14, 1, 3, 200006, 200025, 100017, 17, 10, 14, 100004, 100013,
                200017, 200016, 100013, 5, 200009, 12, 200006, 100006, 100015, 21, 200010, 200002, 200018, 200013,
                24, 100010, 200024, 200006, 100010, 100001, 11, 100000, 200011, 200022, 16, 24, 0, 100006, 200007, 5,
                100017, 200017, 100014, 14, 8, 100011, 12, 200024, 100018, 8, 200017, 200014, 100000, 200020, 200011,
                100003, 12, 100006, 15, 10, 200019, 4, 3, 200013, 100002, 200014, 200015, 19, 100009, 200002, 200007,
                200013, 100007, 100025, 1, 200005, 4, 15, 6, 17, 100002, 12, 200012, 200000, 8, 100005, 200017,
                100002, 0, 200021, 8, 100008, 200014, 4, 200004, 100021, 16, 100008, 200007, 200020, 100018, 200014,
                200022, 200009, 100013, 200001, 200006, 9, 200008, 100004, 23, 100015, 15, 100021, 25, 25, 11, 17,
                200001, 24, 10, 200009, 200008, 3, 200006, 200001, 22, 200011, 4, 200000, 200008, 100018, 14, 200011,
                100006, 200014, 100003, 3, 6, 24, 22, 200009, 100016, 200011, 22, 200013, 200025, 2, 12, 200011,
                100006, 0, 9, 200012, 200023, 2, 100022, 200001, 200009, 100020, 13, 200012, 5, 18, 200010, 1,
                200002, 200005, 18, 16, 200020, 100004, 100015, 100006, 200022, 100011, 200015, 100001, 200003,
                200007, 100020, 8, 200007, 17, 1, 200014, 200015, 3, 100019, 200018, 200022, 8, 100021, 100021,
                100023, 9, 200023, 200018, 200015, 2, 200017, 1, 19, 23, 200021, 200021, 14, 100007, 200002, 9,
                200020, 1, 200010, 200018, 4, 200014, 100013, 200011, 15, 200004, 200004, 200008, 200016, 100008,
                200008, 9, 100015, 200009, 100004, 100002, 20, 200023, 13, 200005, 200023, 11, 100007, 5, 9, 100011,
                200019, 100019, 200000, 200007, 200023, 100010, 200011, 16, 4, 200022, 5, 16, 100000, 15, 21, 100007,
                200006, 200017, 21, 200017, 100018, 19, 200014, 11, 5, 100018, 14, 100004, 200014, 24, 200017,
                200013, 200007, 5, 200001, 200004, 200017, 23, 100008, 24, 5, 7, 100009, 23, 200009, 16, 200013,
                200022, 1, 100017, 21, 3, 200024, 200012, 17, 200007, 24, 200009, 11, 200012, 200007, 200019, 20,
                100004, 14, 200011, 100012, 23, 200025, 9, 21, 200016, 100006, 100012, 200017, 200022, 100023,
                100019, 200005, 200006, 7, 100012, 200013, 100023, 200018, 100003, 200003, 6, 200023, 8, 200022,
                100013, 100007, 1, 200022, 200004, 200013, 200003, 200001, 14, 200024, 200011, 100022, 1, 200007,
                100019, 9, 5, 17, 24, 100002, 18, 20, 200009, 200014, 200009, 200008, 23, 200009
              ]
            ],
            [
              0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 0,
              1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0,
              0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0,
              0, 1, 1, 1, 0, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1,
              1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1,
              1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1,
              1, 0, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 0, 0, 1, 0,
              1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1
            ]
          ],
          [
            [
              {
                $concat: [{ $range: [0, 12000] }, { $range: [100000, 112000] }, { $range: [211999, 199999, -1] }, { $range: [100000, 112000] }]
              }
            ],
            { $concat: [{ $rep: 1, n: 24000 }, { $rep: 0, n: 12000 }] }
          ],
          [
            [
              {
                $concat: [
                  { $range: [12000, 0, -1] },
                  { $rep: 20000, n: 3000 },
                  [120000, 100001, 112000, 112001],
                  { $rep: 220000, n: 3001 },
                  [120000, 100500]
                ]
              }
            ],
            {
              $concat: [{ $rep: 1, n: 3 }, { $rep: 0, n: 1 }, { $rep: 1, n: 3000 }, { $rep: 0, n: 2 }, { $rep: 1, n: 1 }]
            }
          ]
        ]
      },
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

class _Node:
    __slots__ = ("val", "nxt")

    def __init__(self, val, height):
        self.val = val
        self.nxt = [None] * height            # nxt[l] = next node on level l

class Skiplist:
    MAX_LEVEL = 16

    def __init__(self):
        self.head = _Node(-1, self.MAX_LEVEL)
        self.level = 1                        # levels currently in use

    def _random_level(self):
        h = 1
        while h < self.MAX_LEVEL and random.random() < 0.5:
            h += 1
        return h

    def _predecessors(self, x):
        # update[l] = the last node with value < x on level l
        update, cur = [self.head] * self.MAX_LEVEL, self.head
        for l in range(self.level - 1, -1, -1):
            while cur.nxt[l] is not None and cur.nxt[l].val < x:
                cur = cur.nxt[l]
            update[l] = cur
        return update

    def search(self, target):
        cand = self._predecessors(target)[0].nxt[0]
        return cand is not None and cand.val == target

    def add(self, num):
        update = self._predecessors(num)
        h = self._random_level()
        self.level = max(self.level, h)       # update[] already points at head for new levels
        node = _Node(num, h)
        for l in range(h):
            node.nxt[l] = update[l].nxt[l]
            update[l].nxt[l] = node

    def erase(self, num):
        update = self._predecessors(num)
        target = update[0].nxt[0]
        if target is None or target.val != num:
            return False
        for l in range(len(target.nxt)):
            if update[l].nxt[l] is target:
                update[l].nxt[l] = target.nxt[l]
        while self.level > 1 and self.head.nxt[self.level - 1] is None:
            self.level -= 1
        return True` }, { lang: 'js', code: `class Skiplist {
  static MAX_LEVEL = 16;

  constructor() {
    this.head = { val: -1, next: new Array(Skiplist.MAX_LEVEL).fill(null) };
    this.level = 1;                           // levels currently in use
  }

  #randomLevel() {
    let h = 1;
    while (h < Skiplist.MAX_LEVEL && Math.random() < 0.5) h++;
    return h;
  }

  // update[l] = the last node with value < x on level l
  #predecessors(x) {
    const update = new Array(Skiplist.MAX_LEVEL).fill(this.head);
    let cur = this.head;
    for (let l = this.level - 1; l >= 0; l--) {
      while (cur.next[l] !== null && cur.next[l].val < x) cur = cur.next[l];
      update[l] = cur;
    }
    return update;
  }

  search(target) {
    const cand = this.#predecessors(target)[0].next[0];
    return cand !== null && cand.val === target;
  }

  add(num) {
    const update = this.#predecessors(num);
    const h = this.#randomLevel();
    this.level = Math.max(this.level, h);     // update[] already points at head for new levels
    const node = { val: num, next: new Array(h).fill(null) };
    for (let l = 0; l < h; l++) {
      node.next[l] = update[l].next[l];
      update[l].next[l] = node;
    }
  }

  erase(num) {
    const update = this.#predecessors(num);
    const target = update[0].next[0];
    if (target === null || target.val !== num) return false;
    for (let l = 0; l < target.next.length; l++) {
      if (update[l].next[l] === target) update[l].next[l] = target.next[l];
    }
    while (this.level > 1 && this.head.next[this.level - 1] === null) this.level--;
    return true;
  }
}` }, { lang: 'cpp', code: `class Skiplist {
    static constexpr int MAX_LEVEL = 16;
    struct Node {
        int val;
        vector<Node*> next;                   // next[l] = next node on level l
        Node(int v, int h) : val(v), next(h, nullptr) {}
    };
    Node* head = new Node(-1, MAX_LEVEL);
    int level = 1;                            // levels currently in use
    mt19937 rng{random_device{}()};

    int randomLevel() {
        int h = 1;
        while (h < MAX_LEVEL && (rng() & 1)) h++;
        return h;
    }
    // update[l] = the last node with value < x on level l
    void predecessors(int x, array<Node*, MAX_LEVEL>& update) {
        update.fill(head);
        Node* cur = head;
        for (int l = level - 1; l >= 0; l--) {
            while (cur->next[l] && cur->next[l]->val < x) cur = cur->next[l];
            update[l] = cur;
        }
    }
public:
    Skiplist() {}
    ~Skiplist() {
        for (Node* cur = head; cur;) { Node* nxt = cur->next[0]; delete cur; cur = nxt; }
    }
    Skiplist(const Skiplist&) = delete;
    Skiplist& operator=(const Skiplist&) = delete;

    bool search(int target) {
        array<Node*, MAX_LEVEL> update;
        predecessors(target, update);
        Node* cand = update[0]->next[0];
        return cand && cand->val == target;
    }
    void add(int num) {
        array<Node*, MAX_LEVEL> update;
        predecessors(num, update);
        int h = randomLevel();
        level = max(level, h);                // update[] already points at head for new levels
        Node* node = new Node(num, h);
        for (int l = 0; l < h; l++) {
            node->next[l] = update[l]->next[l];
            update[l]->next[l] = node;
        }
    }
    bool erase(int num) {
        array<Node*, MAX_LEVEL> update;
        predecessors(num, update);
        Node* target = update[0]->next[0];
        if (!target || target->val != num) return false;
        for (int l = 0; l < (int)target->next.size(); l++)
            if (update[l]->next[l] == target) update[l]->next[l] = target->next[l];
        delete target;
        while (level > 1 && !head->next[level - 1]) level--;
        return true;
    }
};` }, { lang: 'csharp', code: `public class Skiplist {
    private const int MAX_LEVEL = 16;
    private const double P = 0.5;

    private sealed class Node {
        public readonly int val;
        public readonly Node[] next;
        public Node(int val, int h) { this.val = val; this.next = new Node[h]; }
    }

    private readonly Node head = new Node(-1, MAX_LEVEL);
    private int level = 1;
    private readonly Random rnd = new Random();

    public Skiplist() { }

    private int RandomLevel() {
        int h = 1;
        while (h < MAX_LEVEL && rnd.NextDouble() < P) h++;
        return h;
    }

    // Fills update[l] with the last node < x on each level; returns the level-0 predecessor.
    private Node FindPredecessors(int x, Node[] update) {
        Node cur = head;
        for (int l = level - 1; l >= 0; l--) {
            while (cur.next[l] != null && cur.next[l].val < x) cur = cur.next[l];
            if (update != null) update[l] = cur;
        }
        return cur;
    }

    public bool Search(int target) {
        Node cand = FindPredecessors(target, null).next[0];
        return cand != null && cand.val == target;
    }

    public void Add(int num) {
        Node[] update = new Node[MAX_LEVEL];
        FindPredecessors(num, update);
        int h = RandomLevel();
        for (int l = level; l < h; l++) update[l] = head;     // new top levels
        level = Math.Max(level, h);
        Node node = new Node(num, h);
        for (int l = 0; l < h; l++) {
            node.next[l] = update[l].next[l];
            update[l].next[l] = node;
        }
    }

    public bool Erase(int num) {
        Node[] update = new Node[MAX_LEVEL];
        Node target = FindPredecessors(num, update).next[0];
        if (target == null || target.val != num) return false;
        for (int l = 0; l < target.next.Length; l++)
            if (update[l].next[l] == target) update[l].next[l] = target.next[l];
        while (level > 1 && head.next[level - 1] == null) level--;
        return true;
    }
}` }],
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

  // =====================================================================
  // PRACTICE — Easy
  // =====================================================================
  practice.push({
    title: 'Valid Boomerang', level: 'Easy', tags: ['geometry', 'cross product'], companies: ['Google'],
    statement: `<p>Given three points <code>points[i] = [x, y]</code>, return <code>true</code> if they form a <b>boomerang</b>: all three are distinct and they are <b>not</b> on one straight line. (LeetCode 1037.)</p>`,
    constraints: `points.length == 3, 0 ≤ x, y ≤ 100`,
    example: `<p><code>[[1,1],[2,3],[3,2]]</code> → ${H.c('g', 'true')}: cross = (2−1)(2−1) − (3−1)(3−1) = 1 − 4 = −3 ≠ 0.</p><p><code>[[1,1],[2,2],[3,3]]</code> → ${H.c('r', 'false')}: cross = 1·2 − 1·2 = 0 (collinear). Duplicate points also give cross 0.</p>`,
    brute: {
      why: `<p>Compare the slopes (y2−y1)/(x2−x1) and (y3−y1)/(x3−x1) as doubles and check duplicates separately. It needs special cases for vertical lines (division by zero) and duplicates, and floating comparison is fragile. Not slow — just error-prone.</p>`,
      code: { lang: 'java', code: `class Solution {
    public boolean isBoomerang(int[][] p) {
        if (Arrays.equals(p[0], p[1]) || Arrays.equals(p[0], p[2]) || Arrays.equals(p[1], p[2])) return false;
        int dx1 = p[1][0] - p[0][0], dx2 = p[2][0] - p[0][0];
        if (dx1 == 0 && dx2 == 0) return false;          // both vertical: same line
        if (dx1 == 0 || dx2 == 0) return true;           // exactly one vertical
        double s1 = (double) (p[1][1] - p[0][1]) / dx1;
        double s2 = (double) (p[2][1] - p[0][1]) / dx2;
        return s1 != s2;                                  // fragile double comparison
    }
}`, alt: [{ lang: 'python', code: String.raw`
class Solution:
    def is_boomerang(self, points):
        p = points
        if p[0] == p[1] or p[0] == p[2] or p[1] == p[2]:
            return False
        dx1, dx2 = p[1][0] - p[0][0], p[2][0] - p[0][0]
        if dx1 == 0 and dx2 == 0:
            return False                              # both vertical: same line
        if dx1 == 0 or dx2 == 0:
            return True                               # exactly one vertical
        s1 = (p[1][1] - p[0][1]) / dx1
        s2 = (p[2][1] - p[0][1]) / dx2
        return s1 != s2                               # fragile float comparison` }, { lang: 'js', code: String.raw`
function isBoomerang(p) {
  const same = (a, b) => a[0] === b[0] && a[1] === b[1];
  if (same(p[0], p[1]) || same(p[0], p[2]) || same(p[1], p[2])) return false;
  const dx1 = p[1][0] - p[0][0], dx2 = p[2][0] - p[0][0];
  if (dx1 === 0 && dx2 === 0) return false;           // both vertical: same line
  if (dx1 === 0 || dx2 === 0) return true;            // exactly one vertical
  const s1 = (p[1][1] - p[0][1]) / dx1;
  const s2 = (p[2][1] - p[0][1]) / dx2;
  return s1 !== s2;                                   // fragile floating-point comparison
}` }, { lang: 'cpp', code: String.raw`
class Solution {
public:
    bool isBoomerang(const vector<vector<int>>& p) {
        if (p[0] == p[1] || p[0] == p[2] || p[1] == p[2]) return false;
        int dx1 = p[1][0] - p[0][0], dx2 = p[2][0] - p[0][0];
        if (dx1 == 0 && dx2 == 0) return false;       // both vertical: same line
        if (dx1 == 0 || dx2 == 0) return true;        // exactly one vertical
        double s1 = (double)(p[1][1] - p[0][1]) / dx1;
        double s2 = (double)(p[2][1] - p[0][1]) / dx2;
        return s1 != s2;                              // fragile double comparison
    }
};` }, { lang: 'csharp', code: `public class Solution {
    public bool IsBoomerang(int[][] p) {
        if (Same(p[0], p[1]) || Same(p[0], p[2]) || Same(p[1], p[2])) return false;
        int dx1 = p[1][0] - p[0][0], dx2 = p[2][0] - p[0][0];
        if (dx1 == 0 && dx2 == 0) return false;          // both vertical: same line
        if (dx1 == 0 || dx2 == 0) return true;           // exactly one vertical
        double s1 = (double)(p[1][1] - p[0][1]) / dx1;
        double s2 = (double)(p[2][1] - p[0][1]) / dx2;
        return s1 != s2;                                  // fragile double comparison
    }
    private bool Same(int[] a, int[] b) { return a[0] == b[0] && a[1] == b[1]; }
}` }] }
    },
    mcq: { q: 'Why does a single cross-product test also catch duplicate points?', options: ['It does not; you must check duplicates separately', 'A duplicate makes one of the vectors (0,0), so the cross product is 0', 'Duplicates make the cross product negative', 'Because the constraints forbid duplicates'], answer: 1, explain: 'If two points coincide, B − A or C − A is the zero vector, and anything crossed with the zero vector is 0 — reported as "collinear", which is exactly "not a boomerang".' },
    hints: [
      `<p>Hint 1: "Not on a straight line" is the same as "the triangle they form has non-zero area".</p>`,
      `<p>Hint 2: Twice the triangle area is |cross(B − A, C − A)|. No division needed.</p>`,
      `<p>Hint 3: Return <code>(x2−x1)(y3−y1) − (y2−y1)(x3−x1) != 0</code>. Duplicates automatically give 0.</p>`
    ],
    tests: {
      sig: 'int[][] -> bool',
      fn: 'isBoomerang',
      cases: [
        [[[[1, 1], [2, 3], [3, 2]]], true],
        [[[[1, 1], [2, 2], [3, 3]]], false],
        [[[[0, 0], [0, 1], [2, 0]]], true],
        [[[[0, 0], [0, 0], [1, 1]]], false],
        [[[[5, 5], [5, 5], [5, 5]]], false],
        [[[[1, 1], [2, 2], [1, 1]]], false],
        [[[[0, 0], [0, 5], [0, 100]]], false],
        [[[[0, 7], [5, 7], [100, 7]]], false],
        [[[[0, 0], [100, 99], [99, 98]]], true],
        [[[[0, 0], [100, 100], [1, 2]]], true],
        [[[[100, 0], [0, 100], [50, 50]]], false],
        [[[[100, 0], [0, 100], [50, 51]]], true],
        [[[[3, 0], [0, 3], [0, 0]]], true],
        [[[[0, 0], [1, 0], [0, 1]]], true],
        [[[[0, 0], [2, 4], [1, 2]]], false],
        [[[[0, 3], [3, 0], [0, 0]]], true],
        [[[[2, 2], [4, 1], [1, 4]]], true],
        [[[[0, 4], [1, 2], [0, 4]]], false],
        [[[[0, 2], [3, 0], [2, 2]]], true],
        [[[[0, 3], [3, 1], [1, 3]]], true],
        [[[[2, 1], [4, 2], [1, 1]]], true],
        [[[[4, 3], [3, 3], [3, 3]]], false],
        [[[[1, 0], [2, 2], [3, 2]]], true],
        [[[[4, 3], [0, 4], [1, 1]]], true],
        [[[[4, 1], [4, 3], [1, 3]]], true],
        [[[[2, 4], [2, 2], [4, 0]]], true],
        [[[[0, 3], [2, 0], [3, 0]]], true]
      ]
    },
        solution: {
      approach: `<p>One cross product. Non-zero ⇔ the three points make a real (non-flat) triangle ⇔ distinct and not collinear.</p>`,
      code: `class Solution {
    public boolean isBoomerang(int[][] p) {
        return (p[1][0] - p[0][0]) * (p[2][1] - p[0][1])
             - (p[1][1] - p[0][1]) * (p[2][0] - p[0][0]) != 0;
    }
}`,
      alt: [{ lang: 'python', code: `class Solution:
    def is_boomerang(self, points):
        (x1, y1), (x2, y2), (x3, y3) = points
        # cross product of (B - A) and (C - A); duplicates give 0 as well
        return (x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1) != 0` }, { lang: 'js', code: `function isBoomerang(p) {
  return (p[1][0] - p[0][0]) * (p[2][1] - p[0][1])
       - (p[1][1] - p[0][1]) * (p[2][0] - p[0][0]) !== 0;   // cross product of (B - A) and (C - A)
}` }, { lang: 'cpp', code: `class Solution {
public:
    bool isBoomerang(const vector<vector<int>>& p) {
        // cross product of (B - A) and (C - A); duplicates give 0 as well
        return (p[1][0] - p[0][0]) * (p[2][1] - p[0][1])
             - (p[1][1] - p[0][1]) * (p[2][0] - p[0][0]) != 0;
    }
};` }, { lang: 'csharp', code: `public class Solution {
    public bool IsBoomerang(int[][] p) {
        return (p[1][0] - p[0][0]) * (p[2][1] - p[0][1])
             - (p[1][1] - p[0][1]) * (p[2][0] - p[0][0]) != 0;
    }
}` }],
      dry: { head: ['input', 'B − A', 'C − A', 'cross', 'answer'], rows: [['[[1,1],[2,3],[3,2]]', '(1,2)', '(2,1)', '1·1 − 2·2 = −3', 'true'], ['[[1,1],[2,2],[3,3]]', '(1,1)', '(2,2)', '1·2 − 1·2 = 0', 'false'], ['[[0,0],[0,0],[1,2]]', '(0,0)', '(1,2)', '0', 'false']] },
      complexity: `<p>O(1) time and space.</p>`,
      followUps: ['Return the area of the triangle.', 'Given N points, count triples that form boomerangs.']
    }
  });

  practice.push({
    title: 'Largest Triangle Area', level: 'Easy', tags: ['geometry', 'shoelace', 'brute force'], companies: ['Google', 'Amazon'],
    statement: `<p>Given an array of distinct points on the plane, return the area of the <b>largest triangle</b> that can be formed by any three of them. Answers within 10<sup>−5</sup> are accepted. (LeetCode 812.)</p>`,
    constraints: `3 ≤ N ≤ 50, −50 ≤ x, y ≤ 50, all points distinct`,
    example: `<p><code>[[0,0],[0,1],[1,0],[0,2],[2,0]]</code> → ${H.c('g', '2.0')}: triangle (0,0), (0,2), (2,0) has |cross| = |0·0 − 2·2| = 4 → area 2.</p>`,
    brute: {
      why: `<p>All triples are only C(50,3) = 19 600, so trying every triple is the intended solution. The <i>naive</i> part people get wrong is the area formula: Heron's formula needs three square roots for the side lengths and another for the area, losing precision (and giving NaN for flat triangles when rounding makes the radicand slightly negative).</p>`,
      code: { lang: 'java', code: `class Solution {
    public double largestTriangleArea(int[][] p) {
        double best = 0;
        int n = p.length;
        for (int i = 0; i < n; i++)
            for (int j = i + 1; j < n; j++)
                for (int k = j + 1; k < n; k++) {
                    double a = dist(p[i], p[j]), b = dist(p[j], p[k]), c = dist(p[i], p[k]);
                    double s = (a + b + c) / 2;
                    double sq = s * (s - a) * (s - b) * (s - c);   // can be slightly negative
                    best = Math.max(best, Math.sqrt(Math.max(0, sq)));
                }
        return best;
    }
    private double dist(int[] u, int[] v) { return Math.hypot(u[0] - v[0], u[1] - v[1]); }
}`, alt: [{ lang: 'python', code: String.raw`
import math

class Solution:
    def largest_triangle_area(self, points):
        p = points
        best = 0.0
        n = len(p)
        dist = lambda u, v: math.hypot(u[0] - v[0], u[1] - v[1])
        for i in range(n):
            for j in range(i + 1, n):
                for k in range(j + 1, n):
                    a, b, c = dist(p[i], p[j]), dist(p[j], p[k]), dist(p[i], p[k])
                    s = (a + b + c) / 2
                    sq = s * (s - a) * (s - b) * (s - c)   # can be slightly negative
                    best = max(best, math.sqrt(max(0, sq)))
        return best` }, { lang: 'js', code: String.raw`
function largestTriangleArea(p) {
  const dist = (u, v) => Math.hypot(u[0] - v[0], u[1] - v[1]);
  let best = 0;
  const n = p.length;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      for (let k = j + 1; k < n; k++) {
        const a = dist(p[i], p[j]), b = dist(p[j], p[k]), c = dist(p[i], p[k]);
        const s = (a + b + c) / 2;
        const sq = s * (s - a) * (s - b) * (s - c);   // can be slightly negative
        best = Math.max(best, Math.sqrt(Math.max(0, sq)));
      }
  return best;
}` }, { lang: 'cpp', code: String.raw`
class Solution {
    double dist(const vector<int>& u, const vector<int>& v) { return hypot(u[0] - v[0], u[1] - v[1]); }

public:
    double largestTriangleArea(const vector<vector<int>>& p) {
        double best = 0;
        int n = p.size();
        for (int i = 0; i < n; i++)
            for (int j = i + 1; j < n; j++)
                for (int k = j + 1; k < n; k++) {
                    double a = dist(p[i], p[j]), b = dist(p[j], p[k]), c = dist(p[i], p[k]);
                    double s = (a + b + c) / 2;
                    double sq = s * (s - a) * (s - b) * (s - c);   // can be slightly negative
                    best = max(best, sqrt(max(0.0, sq)));
                }
        return best;
    }
};` }, { lang: 'csharp', code: `public class Solution {
    public double LargestTriangleArea(int[][] p) {
        double best = 0;
        int n = p.Length;
        for (int i = 0; i < n; i++)
            for (int j = i + 1; j < n; j++)
                for (int k = j + 1; k < n; k++) {
                    double a = Dist(p[i], p[j]), b = Dist(p[j], p[k]), c = Dist(p[i], p[k]);
                    double s = (a + b + c) / 2;
                    double sq = s * (s - a) * (s - b) * (s - c);   // can be slightly negative
                    best = Math.Max(best, Math.Sqrt(Math.Max(0, sq)));
                }
        return best;
    }
    private double Dist(int[] u, int[] v) { double dx = u[0] - v[0], dy = u[1] - v[1]; return Math.Sqrt(dx * dx + dy * dy); }
}` }] }
    },
    mcq: { q: 'Which formula gives the exact doubled area of triangle ABC from integer coordinates?', options: ['|AB| · |AC| / 2', '|(B−A) × (C−A)|', 'Heron with sides rounded to integers', '(B−A) · (C−A)'], answer: 1, explain: 'The absolute cross product equals the parallelogram area = 2 × triangle area, computed exactly with integer multiplication.' },
    hints: [
      `<p>Hint 1: N ≤ 50 → O(N<sup>3</sup>) triples is tiny. Focus on computing each area exactly and fast.</p>`,
      `<p>Hint 2: Area = |cross(B − A, C − A)| / 2 — the shoelace formula for a triangle.</p>`,
      `<p>Hint 3: Track the maximum doubled area as an integer and divide by 2.0 once at the end. For large N, note the best triangle's vertices lie on the convex hull.</p>`
    ],
    tests: {
      sig: 'int[][] -> double',
      fn: 'largestTriangleArea',
      cmp: 'float',
      cases: [
        [[[[0, 0], [0, 1], [1, 0], [0, 2], [2, 0]]], 2],
        [[[[1, 0], [0, 0], [0, 1]]], 0.5],
        [[[[0, 0], [1, 1], [2, 2], [3, 3]]], 0],
        [[[[0, 0], [1, 0], [0, 1], [1, 1]]], 0.5],
        [[[[-50, -50], [50, -50], [50, 50], [-50, 50]]], 5000],
        [[[[-50, -50], [50, 50], [-50, 50]]], 5000],
        [[[[0, 0], [3, 0], [0, 3], [1, 1], [2, 2]]], 4.5],
        [[[[-50, 0], [50, 1], [0, -50], [0, 50]]], 2525],
        [[[[-46, 0], [-13, -5], [28, 41], [-14, -23], [32, 47]]], 1649],
        [[[[39, 3], [-24, -41], [-25, -22], [-41, -10], [16, -14], [26, 19], [-1, -4], [14, -8], [48, -4]]], 1430.5],
        [
          [
            [
              [43, -12], [-40, 36], [-26, -20], [-34, -18], [-29, -22], [0, -35], [48, -38], [32, 48], [7, -18],
              [13, -2], [45, -28], [-11, -12], [-28, -19], [25, -37], [-44, 18], [15, 49], [-29, 16], [-36, 10],
              [15, -3], [42, 33]
            ]
          ],
          3508
        ],
        [
          [
            [
              [25, -29], [15, 30], [-16, -40], [6, -34], [40, 32], [-32, 43], [22, -32], [35, 48], [20, -23],
              [14, -30], [12, -18], [47, 40], [-30, 49], [-2, -2], [5, -21], [30, 33], [44, -26], [28, 2],
              [38, 40], [-24, 25], [35, 50], [20, -30], [-40, 50], [-5, -38], [-49, -8], [22, 40], [-46, -39],
              [-49, -2], [29, -6], [-34, -4], [19, -29], [-30, 45], [-32, 20], [15, 25], [24, -27], [49, 36],
              [34, 17], [47, 8], [31, 24], [35, -18], [-18, 49], [-24, -22], [46, -9], [9, 6], [-49, -18],
              [14, 32], [33, 9], [-43, 47], [-26, -50], [3, -8]
            ]
          ],
          4368.5
        ],
        [
          [
            [
              [-5, -5], [-5, -4], [-5, -3], [-5, -2], [-5, -1], [-5, 0], [-5, 1], [-5, 2], [-5, 3], [-5, 4],
              [-4, -5], [-4, -4], [-4, -3], [-4, -2], [-4, -1], [-4, 0], [-4, 1], [-4, 2], [-4, 3], [-4, 4],
              [-3, -5], [-3, -4], [-3, -3], [-3, -2], [-3, -1], [-3, 0], [-3, 1], [-3, 2], [-3, 3], [-3, 4],
              [-2, -5], [-2, -4], [-2, -3], [-2, -2], [-2, -1], [-2, 0], [-2, 1], [-2, 2], [-2, 3], [-2, 4],
              [-1, -5], [-1, -4], [-1, -3], [-1, -2], [-1, -1], [-1, 0], [-1, 1], [-1, 2], [-1, 3], [-1, 4]
            ]
          ],
          18
        ]
      ]
    },
        solution: {
      approach: `<p>Enumerate all triples; keep the maximum |cross| as an exact integer; return it / 2.</p>`,
      code: `class Solution {
    public double largestTriangleArea(int[][] p) {
        int n = p.length, best = 0;
        for (int i = 0; i < n; i++)
            for (int j = i + 1; j < n; j++)
                for (int k = j + 1; k < n; k++) {
                    int c = (p[j][0] - p[i][0]) * (p[k][1] - p[i][1])
                          - (p[j][1] - p[i][1]) * (p[k][0] - p[i][0]);
                    best = Math.max(best, Math.abs(c));     // twice the area, exact
                }
        return best / 2.0;
    }
}`,
      alt: [{ lang: 'python', code: `from itertools import combinations

class Solution:
    def largest_triangle_area(self, points):
        # |cross| is twice the area, and it stays an exact integer
        best = max(abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]))
                   for a, b, c in combinations(points, 3))
        return best / 2` }, { lang: 'js', code: `function largestTriangleArea(p) {
  let best = 0;
  for (let i = 0; i < p.length; i++)
    for (let j = i + 1; j < p.length; j++)
      for (let k = j + 1; k < p.length; k++) {
        const c = (p[j][0] - p[i][0]) * (p[k][1] - p[i][1]) - (p[j][1] - p[i][1]) * (p[k][0] - p[i][0]);
        best = Math.max(best, Math.abs(c));          // twice the area, exact
      }
  return best / 2;
}` }, { lang: 'cpp', code: `class Solution {
public:
    double largestTriangleArea(const vector<vector<int>>& p) {
        int n = p.size(), best = 0;
        for (int i = 0; i < n; i++)
            for (int j = i + 1; j < n; j++)
                for (int k = j + 1; k < n; k++) {
                    int c = (p[j][0] - p[i][0]) * (p[k][1] - p[i][1])
                          - (p[j][1] - p[i][1]) * (p[k][0] - p[i][0]);
                    best = max(best, abs(c));        // twice the area, exact
                }
        return best / 2.0;
    }
};` }, { lang: 'csharp', code: `public class Solution {
    public double LargestTriangleArea(int[][] p) {
        int n = p.Length, best = 0;
        for (int i = 0; i < n; i++)
            for (int j = i + 1; j < n; j++)
                for (int k = j + 1; k < n; k++) {
                    int c = (p[j][0] - p[i][0]) * (p[k][1] - p[i][1])
                          - (p[j][1] - p[i][1]) * (p[k][0] - p[i][0]);
                    best = Math.Max(best, Math.Abs(c));     // twice the area, exact
                }
        return best / 2.0;
    }
}` }],
      dry: { head: ['triple', 'cross', '|cross|/2', 'best'], rows: [['(0,0),(0,1),(1,0)', '0·0 − 1·1 = −1', '0.5', '0.5'], ['(0,0),(0,2),(2,0)', '0·0 − 2·2 = −4', '2', '2'], ['(0,1),(0,2),(2,0)', '0·(−1) − 1·2 = −2', '1', '2']] },
      complexity: `<p>O(N<sup>3</sup>) = ~2·10<sup>4</sup> triples, O(1) space. Expert follow-up: hull first, then O(H<sup>2</sup>) with a rotating pointer.</p>`,
      followUps: ['N = 10<sup>5</sup>: why do the optimal vertices lie on the convex hull?', 'Largest quadrilateral area.']
    }
  });

  practice.push({
    title: 'Rectangle Overlap', level: 'Easy', tags: ['geometry', 'intervals'], companies: ['Amazon', 'Microsoft'],
    statement: `<p>An axis-aligned rectangle is <code>[x1, y1, x2, y2]</code> (bottom-left and top-right corners). Return <code>true</code> if two rectangles overlap with <b>positive area</b> (touching edges or corners does not count). (LeetCode 836.)</p>`,
    constraints: `−10<sup>9</sup> ≤ coordinates ≤ 10<sup>9</sup>, each rectangle has positive area`,
    example: `<p><code>rec1 = [0,0,2,2], rec2 = [1,1,3,3]</code> → ${H.c('g', 'true')} (overlap square [1,1]–[2,2]).</p><p><code>[0,0,1,1]</code> and <code>[1,0,2,1]</code> → ${H.c('r', 'false')}: they only share the edge x = 1.</p>`,
    brute: {
      why: `<p>Check every unit cell of rectangle 1 to see whether it lies inside rectangle 2. With coordinates up to 10<sup>9</sup> that is up to 10<sup>18</sup> cells — impossible. The waste: area overlap is decided by two independent 1D interval overlaps.</p>`,
      code: { lang: 'java', code: `class Solution {
    // Only usable for tiny coordinates: tests each unit cell of rec1.
    public boolean isRectangleOverlap(int[] a, int[] b) {
        for (long x = a[0]; x < a[2]; x++)
            for (long y = a[1]; y < a[3]; y++)
                if (x >= b[0] && x + 1 <= b[2] && y >= b[1] && y + 1 <= b[3]) return true;
        return false;
    }
}`, alt: [{ lang: 'python', code: String.raw`
class Solution:
    # Only usable for tiny coordinates: tests each unit cell of rec1.
    def is_rectangle_overlap(self, rec1, rec2):
        a, b = rec1, rec2
        for x in range(a[0], a[2]):
            for y in range(a[1], a[3]):
                if x >= b[0] and x + 1 <= b[2] and y >= b[1] and y + 1 <= b[3]:
                    return True
        return False` }, { lang: 'js', code: String.raw`
// Only usable for tiny coordinates: tests each unit cell of rec1.
function isRectangleOverlap(a, b) {
  for (let x = a[0]; x < a[2]; x++)
    for (let y = a[1]; y < a[3]; y++)
      if (x >= b[0] && x + 1 <= b[2] && y >= b[1] && y + 1 <= b[3]) return true;
  return false;
}` }, { lang: 'cpp', code: String.raw`
class Solution {
public:
    // Only usable for tiny coordinates: tests each unit cell of rec1.
    bool isRectangleOverlap(const vector<int>& a, const vector<int>& b) {
        for (long long x = a[0]; x < a[2]; x++)
            for (long long y = a[1]; y < a[3]; y++)
                if (x >= b[0] && x + 1 <= b[2] && y >= b[1] && y + 1 <= b[3]) return true;
        return false;
    }
};` }, { lang: 'csharp', code: `public class Solution {
    // Only usable for tiny coordinates: tests each unit cell of rec1.
    public bool IsRectangleOverlap(int[] a, int[] b) {
        for (long x = a[0]; x < a[2]; x++)
            for (long y = a[1]; y < a[3]; y++)
                if (x >= b[0] && x + 1 <= b[2] && y >= b[1] && y + 1 <= b[3]) return true;
        return false;
    }
}` }] }
    },
    mcq: { q: 'Two rectangles overlap with positive area exactly when…', options: ['their x-intervals overlap OR their y-intervals overlap', 'their x-intervals overlap with positive length AND their y-intervals overlap with positive length', 'one corner of A is inside B', 'their centres are closer than the sum of half-diagonals'], answer: 1, explain: 'The intersection of two axis-aligned rectangles is the product of the x-overlap and the y-overlap; it has positive area only if both lengths are positive. "Corner inside" fails for a plus-sign (cross) arrangement.' },
    hints: [
      `<p>Hint 1: Project both rectangles onto the x-axis: you get two intervals. Do the same for y.</p>`,
      `<p>Hint 2: Interval overlap length = min(right ends) − max(left ends). Positive means real overlap.</p>`,
      `<p>Hint 3: Return <code>min(a.x2, b.x2) &gt; max(a.x1, b.x1) &amp;&amp; min(a.y2, b.y2) &gt; max(a.y1, b.y1)</code>. Strict &gt; makes edge-touching return false.</p>`
    ],
    tests: {
      sig: 'int[] int[] -> bool',
      fn: 'isRectangleOverlap',
      cases: [
        [[[0, 0, 2, 2], [1, 1, 3, 3]], true],
        [[[0, 0, 1, 1], [1, 0, 2, 1]], false],
        [[[0, 0, 1, 1], [2, 2, 3, 3]], false],
        [[[0, 0, 1, 1], [1, 1, 2, 2]], false],
        [[[0, 0, 10, 10], [2, 2, 4, 4]], true],
        [[[0, 0, 4, 4], [0, 0, 4, 4]], true],
        [[[0, 0, 4, 4], [4, 0, 8, 4]], false],
        [[[0, 0, 4, 4], [0, 4, 4, 8]], false],
        [[[0, 0, 4, 4], [-4, 0, 0, 4]], false],
        [[[-1000000000, -1000000000, 1000000000, 1000000000], [-1000000000, -1000000000, 1000000000, 1000000000]], true],
        [[[-1000000000, -1000000000, 0, 0], [0, 0, 1000000000, 1000000000]], false],
        [[[-1000000000, -1000000000, 1, 1], [0, 0, 1000000000, 1000000000]], true],
        [[[-1000000000, 0, 1000000000, 1], [999999999, -5, 1000000000, 5]], true],
        [[[0, 0, 1000000000, 1], [999999999, 0, 1000000000, 1]], true],
        [[[0, 0, 3, 3], [1, -5, 2, 8]], true],
        [[[0, 0, 1, 5], [0, 3, 1, 9]], true],
        [[[2, -4, 7, -3], [-4, -3, -3, 2]], false],
        [[[1, 2, 3, 3], [3, -2, 4, 0]], false],
        [[[-2, 2, 2, 3], [3, 1, 4, 6]], false],
        [[[-3, 4, -2, 6], [1, 3, 3, 8]], false],
        [[[-3, -4, -1, -2], [4, 1, 7, 4]], false],
        [[[1, 2, 5, 7], [0, -1, 1, 0]], false],
        [[[-3, 0, -1, 2], [2, 0, 5, 1]], false],
        [[[4, 0, 9, 2], [-4, 4, -2, 8]], false],
        [[[3, 2, 7, 7], [-4, -2, 1, 1]], false],
        [[[-1, 4, 3, 5], [1, -2, 6, -1]], false],
        [[[2, 3, 5, 5], [-2, 2, 1, 3]], false],
        [[[1, -3, 5, 1], [0, -4, 4, -2]], true],
        [[[-3, -2, 0, 1], [1, -4, 6, 0]], false],
        [[[1, -4, 4, 1], [-2, 3, 0, 4]], false]
      ]
    },
        solution: {
      approach: `<p>Separate the dimensions: overlap area = (x-overlap length) × (y-overlap length). Both must be strictly positive. This is also the 2D case of the "separating axis" idea used in game collision checks.</p>`,
      code: `class Solution {
    public boolean isRectangleOverlap(int[] a, int[] b) {
        boolean xOverlap = Math.min(a[2], b[2]) > Math.max(a[0], b[0]);
        boolean yOverlap = Math.min(a[3], b[3]) > Math.max(a[1], b[1]);
        return xOverlap && yOverlap;
    }
}`,
      alt: [{ lang: 'python', code: `class Solution:
    def is_rectangle_overlap(self, rec1, rec2):
        # the x-ranges and the y-ranges must both overlap by a positive amount
        return (min(rec1[2], rec2[2]) > max(rec1[0], rec2[0])
                and min(rec1[3], rec2[3]) > max(rec1[1], rec2[1]))` }, { lang: 'js', code: `function isRectangleOverlap(a, b) {
  const xOverlap = Math.min(a[2], b[2]) > Math.max(a[0], b[0]);
  const yOverlap = Math.min(a[3], b[3]) > Math.max(a[1], b[1]);
  return xOverlap && yOverlap;
}` }, { lang: 'cpp', code: `class Solution {
public:
    bool isRectangleOverlap(const vector<int>& a, const vector<int>& b) {
        bool xOverlap = min(a[2], b[2]) > max(a[0], b[0]);
        bool yOverlap = min(a[3], b[3]) > max(a[1], b[1]);
        return xOverlap && yOverlap;
    }
};` }, { lang: 'csharp', code: `public class Solution {
    public bool IsRectangleOverlap(int[] a, int[] b) {
        bool xOverlap = Math.Min(a[2], b[2]) > Math.Max(a[0], b[0]);
        bool yOverlap = Math.Min(a[3], b[3]) > Math.Max(a[1], b[1]);
        return xOverlap && yOverlap;
    }
}` }],
      dry: { head: ['pair', 'x overlap', 'y overlap', 'answer'], rows: [['[0,0,2,2] & [1,1,3,3]', 'min(2,3) − max(0,1) = 1', '1', 'true'], ['[0,0,1,1] & [1,0,2,1]', 'min(1,2) − max(0,1) = 0', '1', 'false (edge only)'], ['[0,0,1,1] & [2,2,3,3]', '1 − 2 = −1', '−1', 'false']] },
      complexity: `<p>O(1) time and space. The subtraction-free comparison form avoids overflow with coordinates near ±10<sup>9</sup>.</p>`,
      followUps: ['Return the overlap area (Rectangle Area, LeetCode 223).', 'Union area of N rectangles (Rectangle Area II — practice Hard).']
    }
  });

  practice.push({
    title: 'Implement Queue using Stacks', level: 'Easy', tags: ['amortized analysis', 'stack', 'design'], companies: ['Amazon', 'Microsoft', 'Bloomberg'],
    statement: `<p>Implement a FIFO queue with only two stacks: <code>push(x)</code>, <code>pop()</code>, <code>peek()</code>, <code>empty()</code>. Follow-up: make every operation <b>amortized O(1)</b>. (LeetCode 232.)</p>`,
    constraints: `1 ≤ x ≤ 9, at most 100 calls (follow-up: assume 10<sup>6</sup>), pop/peek only on a non-empty queue`,
    example: `<p>push 1, push 2, peek → ${H.c('g', '1')}, pop → ${H.c('g', '1')}, empty → ${H.c('r', 'false')}.</p>`,
    brute: {
      why: `<p>Keep the oldest element on top of a single stack: on every push, move everything to a helper stack, push x, move everything back. Each push is <b>O(N)</b>, so N pushes cost O(N<sup>2</sup>). The waste: we re-reverse the same elements on every push.</p>`,
      code: { lang: 'java', code: `class MyQueue {
    private final Deque<Integer> s = new ArrayDeque<>(), tmp = new ArrayDeque<>();

    public void push(int x) {                       // O(N) every time
        while (!s.isEmpty()) tmp.push(s.pop());
        s.push(x);
        while (!tmp.isEmpty()) s.push(tmp.pop());
    }
    public int pop() { return s.pop(); }
    public int peek() { return s.peek(); }
    public boolean empty() { return s.isEmpty(); }
}`, alt: [{ lang: 'python', code: String.raw`
class MyQueue:
    def __init__(self):
        self.s = []
        self.tmp = []

    def push(self, x):                                # O(N) every time
        while self.s:
            self.tmp.append(self.s.pop())
        self.s.append(x)
        while self.tmp:
            self.s.append(self.tmp.pop())

    def pop(self):
        return self.s.pop()

    def peek(self):
        return self.s[-1]

    def empty(self):
        return not self.s` }, { lang: 'js', code: String.raw`
class MyQueue {
  constructor() {
    this.s = [];
    this.tmp = [];
  }

  push(x) {                                           // O(N) every time
    while (this.s.length) this.tmp.push(this.s.pop());
    this.s.push(x);
    while (this.tmp.length) this.s.push(this.tmp.pop());
  }

  pop() { return this.s.pop(); }
  peek() { return this.s[this.s.length - 1]; }
  empty() { return this.s.length === 0; }
}` }, { lang: 'cpp', code: String.raw`
class MyQueue {
    stack<int> s, tmp;

public:
    void push(int x) {                                // O(N) every time
        while (!s.empty()) { tmp.push(s.top()); s.pop(); }
        s.push(x);
        while (!tmp.empty()) { s.push(tmp.top()); tmp.pop(); }
    }
    int pop() { int x = s.top(); s.pop(); return x; }
    int peek() { return s.top(); }
    bool empty() { return s.empty(); }
};` }, { lang: 'csharp', code: `public class MyQueue {
    private readonly Stack<int> s = new Stack<int>(), tmp = new Stack<int>();

    public void Push(int x) {                       // O(N) every time
        while (s.Count > 0) tmp.Push(s.Pop());
        s.Push(x);
        while (tmp.Count > 0) s.Push(tmp.Pop());
    }
    public int Pop() { return s.Pop(); }
    public int Peek() { return s.Peek(); }
    public bool Empty() { return s.Count == 0; }
}` }] }
    },
    mcq: { q: 'Over a long sequence, how many times can one element be moved from the in-stack to the out-stack?', options: ['Once per pop call', 'At most once in its lifetime', 'log N times', 'N times'], answer: 1, explain: 'We only transfer when out is empty, and an element in out leaves only by being popped. So each element is pushed to in once, moved once, popped once: O(1) amortized.' },
    hints: [
      `<p>Hint 1: Pouring stack A into stack B reverses the order — the oldest element ends up on top of B.</p>`,
      `<p>Hint 2: Keep two stacks: <code>in</code> for pushes, <code>out</code> for pops. Only pour in → out when out is empty.</p>`,
      `<p>Hint 3: pop/peek: if out is empty, move everything from in. Each element is moved at most once → amortized O(1) (one pop can still be O(N)).</p>`
    ],
    tests: {
      cls: 'MyQueue',
      sigs: { MyQueue: '', push: 'int -> void', pop: '-> int', peek: '-> int', empty: '-> bool' },
      cases: [
        {
          ops: ['MyQueue', 'push', 'push', 'peek', 'pop', 'empty'],
          args: [[], [1], [2], [], [], []],
          out: [null, null, null, 1, 1, false]
        },
        { ops: ['MyQueue', 'empty'], args: [[], []], out: [null, true] },
        { ops: ['MyQueue', 'push', 'pop', 'empty'], args: [[], [9], [], []], out: [null, null, 9, true] },
        {
          ops: ['MyQueue', 'push', 'push', 'pop', 'push', 'pop', 'pop', 'empty'],
          args: [[], [1], [2], [], [3], [], [], []],
          out: [null, null, null, 1, null, 2, 3, true]
        },
        {
          ops: [
            'MyQueue', 'push', 'push', 'push', 'peek', 'push', 'peek', 'pop', 'peek', 'push', 'pop', 'pop',
            'peek', 'pop', 'pop', 'empty'
          ],
          args: [[], [1], [2], [3], [], [4], [], [], [], [5], [], [], [], [], [], []],
          out: [null, null, null, null, 1, null, 1, 1, 2, null, 2, 3, 4, 4, 5, true]
        },
        {
          ops: ['MyQueue', ...Array(100).fill('push'), ...Array(100).fill('pop'), 'empty'],
          args: [
            [],
            [1],
            [2],
            [3],
            [4],
            [5],
            [6],
            [7],
            [8],
            [9],
            [1],
            [2],
            [3],
            [4],
            [5],
            [6],
            [7],
            [8],
            [9],
            [1],
            [2],
            [3],
            [4],
            [5],
            [6],
            [7],
            [8],
            [9],
            [1],
            [2],
            [3],
            [4],
            [5],
            [6],
            [7],
            [8],
            [9],
            [1],
            [2],
            [3],
            [4],
            [5],
            [6],
            [7],
            [8],
            [9],
            [1],
            [2],
            [3],
            [4],
            [5],
            [6],
            [7],
            [8],
            [9],
            [1],
            [2],
            [3],
            [4],
            [5],
            [6],
            [7],
            [8],
            [9],
            [1],
            [2],
            [3],
            [4],
            [5],
            [6],
            [7],
            [8],
            [9],
            [1],
            [2],
            [3],
            [4],
            [5],
            [6],
            [7],
            [8],
            [9],
            [1],
            [2],
            [3],
            [4],
            [5],
            [6],
            [7],
            [8],
            [9],
            [1],
            [2],
            [3],
            [4],
            [5],
            [6],
            [7],
            [8],
            [9],
            [1],
            ...Array(101).fill([])
          ],
          out: [
            ...Array(101).fill(null),
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            1,
            true
          ]
        },
        {
          ops: [
            'MyQueue', 'empty', 'push', 'push', 'pop', 'pop', 'push', 'empty', 'pop', 'push', 'pop', 'empty',
            'empty', 'push', 'pop', 'empty', 'empty', 'push', 'peek', 'pop', 'push', 'push', 'empty', 'push',
            'pop', 'pop', 'peek', 'empty', 'pop', 'empty', 'empty', 'push', 'empty', 'push', 'push', 'pop',
            'pop', 'empty', 'push', 'push', 'pop', 'push', 'pop', 'push', 'pop', 'peek', 'pop', 'pop', 'empty',
            'push', 'peek', 'pop', 'push', 'push', 'pop', 'peek', 'peek', 'push', 'peek', 'pop', 'empty', 'peek',
            'empty', 'pop', 'push', 'push', 'pop', 'pop', 'empty', 'empty', 'push', 'empty', 'peek', 'peek',
            'peek', 'pop', 'push', 'pop', 'empty', 'empty', 'empty', 'empty', 'empty', 'push', 'peek', 'push',
            'empty', 'push', 'pop', 'pop', 'pop', 'empty', 'empty', 'push', 'pop', 'push', 'push', 'pop', 'pop',
            'push', 'pop'
          ],
          args: [
            [], [], [4], [2], [], [], [7], [], [], [6], [], [], [], [4], [], [], [], [7], [], [], [5], [6], [],
            [8], [], [], [], [], [], [], [], [4], [], [6], [1], [], [], [], [4], [5], [], [9], [], [8], [], [],
            [], [], [], [4], [], [], [2], [3], [], [], [], [2], [], [], [], [], [], [], [7], [5], [], [], [], [],
            [4], [], [], [], [], [], [9], [], [], [], [], [], [], [1], [], [1], [], [4], [], [], [], [], [], [5],
            [], [4], [6], [], [], [4], []
          ],
          out: [
            null, true, null, null, 4, 2, null, false, 7, null, 6, true, true, null, 4, true, true, null, 7, 7,
            null, null, false, null, 5, 6, 8, false, 8, true, true, null, false, null, null, 4, 6, false, null,
            null, 1, null, 4, null, 5, 9, 9, 8, true, null, 4, 4, null, null, 2, 3, 3, null, 3, 3, false, 2,
            false, 2, null, null, 7, 5, true, true, null, false, 4, 4, 4, 4, null, 9, true, true, true, true,
            true, null, 1, null, false, null, 1, 1, 4, true, true, null, 5, null, null, 4, 6, null, 4
          ]
        },
        {
          ops: [
            'MyQueue', 'empty', 'push', 'empty', 'pop', 'push', 'peek', 'push', 'push', 'pop', 'pop', 'pop',
            'empty', 'empty', 'push', 'pop', 'push', 'pop', 'empty', 'empty', 'push', 'peek', 'pop', 'empty',
            'push', 'empty', 'empty', 'empty', 'push', 'pop', 'empty', 'empty', 'push', 'push', 'peek', 'push',
            'pop', 'pop', 'pop', 'pop', 'empty', 'empty', 'push', 'pop', 'empty', 'empty', 'push', 'empty',
            'peek', 'pop', 'push', 'pop', 'push', 'peek', 'pop', 'push', 'pop', 'push', 'pop', 'push', 'pop',
            'push', 'empty', 'peek', 'pop', 'empty', 'empty', 'push', 'peek', 'peek', 'pop', 'push', 'pop',
            'empty', 'empty', 'empty', 'empty', 'push', 'pop', 'empty', 'push', 'push', 'pop', 'empty', 'pop',
            'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'push', 'peek', 'pop', 'empty', 'empty',
            'empty', 'push', 'pop', 'push', 'pop'
          ],
          args: [
            [], [], [8], [], [], [1], [], [8], [5], [], [], [], [], [], [1], [], [6], [], [], [], [4], [], [],
            [], [8], [], [], [], [8], [], [], [], [7], [1], [], [5], [], [], [], [], [], [], [2], [], [], [],
            [8], [], [], [], [5], [], [7], [], [], [7], [], [8], [], [5], [], [4], [], [], [], [], [], [1], [],
            [], [], [5], [], [], [], [], [], [9], [], [], [5], [7], [], [], [], [], [], [], [], [], [], [7], [],
            [], [], [], [], [3], [], [7], []
          ],
          out: [
            null, true, null, false, 8, null, 1, null, null, 1, 8, 5, true, true, null, 1, null, 6, true, true,
            null, 4, 4, true, null, false, false, false, null, 8, false, false, null, null, 8, null, 8, 7, 1, 5,
            true, true, null, 2, true, true, null, false, 8, 8, null, 5, null, 7, 7, null, 7, null, 8, null, 5,
            null, false, 4, 4, true, true, null, 1, 1, 1, null, 5, true, true, true, true, null, 9, true, null,
            null, 5, false, 7, true, true, true, true, true, true, null, 7, 7, true, true, true, null, 3, null,
            7
          ]
        },
        {
          ops: [
            'MyQueue', 'empty', 'push', 'pop', 'push', 'empty', 'push', 'pop', 'empty', 'push', 'pop', 'pop',
            'push', 'pop', 'empty', 'empty', 'empty', 'push', 'pop', 'push', 'push', 'push', 'peek', 'pop',
            'pop', 'pop', 'push', 'peek', 'empty', 'pop', 'push', 'pop', 'empty', 'empty', 'push', 'pop',
            'empty', 'push', 'pop', 'push', 'pop', 'push', 'peek', 'pop', 'empty', 'empty', 'empty', 'push',
            'pop', 'empty', 'empty', 'empty', 'push', 'peek', 'peek', 'push', 'peek', 'push', 'pop', 'peek',
            'peek'
          ],
          args: [
            [], [], [3], [], [6], [], [6], [], [], [9], [], [], [7], [], [], [], [], [3], [], [5], [7], [4], [],
            [], [], [], [7], [], [], [], [3], [], [], [], [7], [], [], [7], [], [3], [], [7], [], [], [], [], [],
            [3], [], [], [], [], [9], [], [], [5], [], [1], [], [], []
          ],
          out: [
            null, true, null, 3, null, false, null, 6, false, null, 6, 9, null, 7, true, true, true, null, 3,
            null, null, null, 5, 5, 7, 4, null, 7, false, 7, null, 3, true, true, null, 7, true, null, 7, null,
            3, null, 7, 7, true, true, true, null, 3, true, true, true, null, 9, 9, null, 9, null, 9, 5, 5
          ]
        }
      ]
    },
        solution: {
      approach: `<p>Lazy transfer. Elements wait in <code>in</code> in LIFO order; when <code>out</code> runs dry we reverse the whole batch once. Banker's view: charge 3 per push (push to in, move, pop from out).</p>`,
      code: `class MyQueue {
    private final Deque<Integer> in = new ArrayDeque<>(), out = new ArrayDeque<>();

    public void push(int x) { in.push(x); }                 // O(1)

    public int pop() { shift(); return out.pop(); }         // amortized O(1)

    public int peek() { shift(); return out.peek(); }

    public boolean empty() { return in.isEmpty() && out.isEmpty(); }

    private void shift() {
        if (out.isEmpty())                                   // only when out is dry
            while (!in.isEmpty()) out.push(in.pop());        // each element moves once, ever
    }
}`,
      alt: [{ lang: 'python', code: `class MyQueue:
    def __init__(self):
        self.inp, self.out = [], []           # lists used as stacks

    def push(self, x):
        self.inp.append(x)                    # O(1)

    def pop(self):
        self._shift()
        return self.out.pop()                 # amortized O(1)

    def peek(self):
        self._shift()
        return self.out[-1]

    def empty(self):
        return not self.inp and not self.out

    def _shift(self):
        if not self.out:                      # only when out is dry
            while self.inp:
                self.out.append(self.inp.pop())   # each element moves once, ever` }, { lang: 'js', code: `class MyQueue {
  constructor() {
    this.inp = [];                            // arrays used as stacks
    this.out = [];
  }
  push(x) { this.inp.push(x); }               // O(1)
  pop() { this.#shift(); return this.out.pop(); }   // amortized O(1)
  peek() { this.#shift(); return this.out[this.out.length - 1]; }
  empty() { return this.inp.length === 0 && this.out.length === 0; }
  #shift() {
    if (this.out.length === 0) {              // only when out is dry
      while (this.inp.length > 0) this.out.push(this.inp.pop());   // each element moves once, ever
    }
  }
}` }, { lang: 'cpp', code: `class MyQueue {
    stack<int> in, out;
    void shift() {
        if (out.empty()) {                    // only when out is dry
            while (!in.empty()) { out.push(in.top()); in.pop(); }   // each element moves once, ever
        }
    }
public:
    void push(int x) { in.push(x); }          // O(1)
    int pop() { shift(); int x = out.top(); out.pop(); return x; }   // amortized O(1)
    int peek() { shift(); return out.top(); }
    bool empty() { return in.empty() && out.empty(); }
};` }, { lang: 'csharp', code: `public class MyQueue {
    private readonly Stack<int> inS = new Stack<int>(), outS = new Stack<int>();

    public void Push(int x) { inS.Push(x); }                // O(1)

    public int Pop() { Shift(); return outS.Pop(); }        // amortized O(1)

    public int Peek() { Shift(); return outS.Peek(); }

    public bool Empty() { return inS.Count == 0 && outS.Count == 0; }

    private void Shift() {
        if (outS.Count == 0)                                 // only when out is dry
            while (inS.Count > 0) outS.Push(inS.Pop());      // each element moves once, ever
    }
}` }],
      dry: { head: ['op', 'in (bottom→top)', 'out (bottom→top)', 'result'], rows: [['push 1', '[1]', '[]', '—'], ['push 2', '[1, 2]', '[]', '—'], ['peek', '[]', '[2, 1]', '1 (transfer once)'], ['pop', '[]', '[2]', '1'], ['push 3', '[3]', '[2]', '—'], ['pop', '[3]', '[]', '2 (no transfer)']] },
      complexity: `<p>push O(1); pop/peek <b>amortized O(1)</b>, worst case O(N) for a single call; space O(N).</p>`,
      followUps: ['Implement a stack using queues (LeetCode 225).', 'Make pop worst-case O(1) (incremental transfer / real-time queue).']
    }
  });

  // =====================================================================
  // PRACTICE — Medium
  // =====================================================================
  practice.push({
    title: 'Shuffle an Array', level: 'Medium', tags: ['randomized', 'Fisher-Yates', 'design'], companies: ['Google', 'Meta', 'Microsoft'],
    statement: `<p>Implement <code>Solution(int[] nums)</code>, <code>int[] reset()</code> (return the original configuration) and <code>int[] shuffle()</code> (return a random shuffling where <b>all permutations are equally likely</b>). (LeetCode 384.)</p>`,
    constraints: `1 ≤ N ≤ 50, all elements unique, at most 10<sup>4</sup> calls`,
    example: `<p>nums = [1,2,3]: shuffle() might return ${H.c('b', '[3,1,2]')}; each of the 6 orders with probability 1/6. reset() returns ${H.c('g', '[1,2,3]')}.</p>`,
    brute: {
      why: `<p>Copy the elements into a list; repeatedly remove a random element and append it to the result. Correct and uniform, but removing from the middle of an array list (<code>ArrayList.remove(i)</code>, <code>list.pop(i)</code>, <code>vector::erase</code>) shifts elements → <b>O(N<sup>2</sup>)</b> per shuffle. Fisher–Yates does the same "pick from the remaining" in place with a swap, O(N).</p>`,
      code: { lang: 'java', code: `class Solution {
    private final int[] orig;
    private final Random rnd = new Random();
    public Solution(int[] nums) { orig = nums.clone(); }
    public int[] reset() { return orig.clone(); }
    public int[] shuffle() {
        List<Integer> pool = new ArrayList<>();
        for (int x : orig) pool.add(x);
        int[] res = new int[orig.length];
        for (int i = 0; i < res.length; i++)
            res[i] = pool.remove(rnd.nextInt(pool.size()));   // O(N) removal each time
        return res;
    }
}`, alt: [{ lang: 'python', code: String.raw`
import random

class Solution:
    def __init__(self, nums):
        self.orig = list(nums)

    def reset(self):
        return list(self.orig)

    def shuffle(self):
        pool = list(self.orig)
        res = []
        for _ in range(len(self.orig)):
            res.append(pool.pop(random.randrange(len(pool))))   # O(N) removal each time
        return res` }, { lang: 'js', code: String.raw`
class Solution {
  constructor(nums) {
    this.orig = nums.slice();
  }

  reset() { return this.orig.slice(); }

  shuffle() {
    const pool = this.orig.slice();
    const res = [];
    for (let i = 0; i < this.orig.length; i++)
      res.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);   // O(N) removal each time
    return res;
  }
}` }, { lang: 'cpp', code: String.raw`
class Solution {
    vector<int> orig;
    mt19937 rnd{random_device{}()};

public:
    Solution(vector<int>& nums) : orig(nums) {}

    vector<int> reset() { return orig; }

    vector<int> shuffle() {
        vector<int> pool = orig, res;
        for (size_t i = 0; i < orig.size(); i++) {
            int j = rnd() % pool.size();
            res.push_back(pool[j]);
            pool.erase(pool.begin() + j);             // O(N) removal each time
        }
        return res;
    }
};` }, { lang: 'csharp', code: `public class Solution {
    private readonly int[] orig;
    private readonly Random rnd = new Random();
    public Solution(int[] nums) { orig = (int[])nums.Clone(); }
    public int[] Reset() { return (int[])orig.Clone(); }
    public int[] Shuffle() {
        var pool = new List<int>(orig);
        int[] res = new int[orig.Length];
        for (int i = 0; i < res.Length; i++) {
            int j = rnd.Next(pool.Count);
            res[i] = pool[j];
            pool.RemoveAt(j);                                // O(N) removal each time
        }
        return res;
    }
}` }] }
    },
    mcq: { q: 'Which loop produces a uniformly random permutation?', options: ['for i in 0..n−1: swap(a[i], a[rand(0..n−1)])', 'for i in n−1..1: swap(a[i], a[rand(0..i)])', 'for i in n−1..1: swap(a[i], a[rand(0..i−1)])', 'sort with a random comparator'], answer: 1, explain: 'Fisher–Yates draws j from [0, i] so the number of equally likely runs is n!. Option A gives n^n runs (biased), option C is Sattolo (single cycles only), option D is biased and may violate the comparator contract.' },
    hints: [
      `<p>Hint 1: Keep a pristine copy for reset(); shuffle a fresh copy each time (or shuffle in place and copy back on reset).</p>`,
      `<p>Hint 2: Fill the array from the back: choose which remaining element goes to position i, uniformly among positions 0..i, and swap it there.</p>`,
      `<p>Hint 3: Draw j uniformly from [0, i] — inclusive of i, so the element may stay (<code>rnd.nextInt(i + 1)</code> in Java, <code>random.randint(0, i)</code> in Python). n! equally likely runs ↔ n! permutations.</p>`
    ],
    tests: {
      sig: 'int[] int -> list<int>',
      fn: 'shuffleStats',
      check: `(args, out, exp) => {
  // out = [every shuffle was a permutation and reset() restored the array, some shuffle moved something,
  //        then (for n <= 4) how often each of the n! orders appeared, sorted]
  const n = args[0].length, trials = args[1];
  if (out[0] !== 1) return false;
  if (n >= 10 && trials > 0 && out[1] !== 1) return false;
  if (n > 4) return out.length === 2;
  let perms = 1; for (let i = 2; i <= n; i++) perms *= i;
  const counts = out.slice(2);
  if (counts.length !== perms) return false;
  const p = 1 / perms, mean = trials * p, sd = Math.sqrt(trials * p * (1 - p));
  return counts.every((c) => Math.abs(c - mean) <= 6 * sd + 3);
}`,
      harness: {
        java: `class Check {
    static List<Integer> shuffleStats(int[] nums, int trials) {
        Solution s = new Solution(nums.clone());
        int[] base = nums.clone();
        Arrays.sort(base);
        Map<String, Integer> seen = new HashMap<>();
        int valid = 1, changed = 0;
        for (int t = 0; t < trials; t++) {
            int[] a = s.shuffle();
            int[] sorted = a.clone();
            Arrays.sort(sorted);
            if (!Arrays.equals(sorted, base)) valid = 0;          // must be a permutation
            if (!Arrays.equals(a, nums)) changed = 1;
            if (nums.length <= 4) seen.merge(Arrays.toString(a), 1, Integer::sum);
            if (t % 997 == 0 && !Arrays.equals(s.reset(), nums)) valid = 0;   // reset restores the original
        }
        if (!Arrays.equals(s.reset(), nums)) valid = 0;
        List<Integer> counts = new ArrayList<>(seen.values());
        Collections.sort(counts);
        List<Integer> res = new ArrayList<>(Arrays.asList(valid, changed));
        res.addAll(counts);
        return res;
    }
}`,
        python: `def shuffle_stats(nums, trials):
    s = Solution(list(nums))
    base = sorted(nums)
    seen = {}
    valid, changed = 1, 0
    for t in range(trials):
        a = s.shuffle()
        if sorted(a) != base:
            valid = 0
        if a != nums:
            changed = 1
        if len(nums) <= 4:
            seen[tuple(a)] = seen.get(tuple(a), 0) + 1
        if t % 997 == 0 and s.reset() != nums:
            valid = 0
    if s.reset() != nums:
        valid = 0
    return [valid, changed] + sorted(seen.values())`,
        js: `function shuffleStats(nums, trials) {
  const s = new Solution([...nums]);
  const key = (a) => a.join(','), base = key([...nums].sort((a, b) => a - b)), seen = new Map();
  let valid = 1, changed = 0;
  for (let t = 0; t < trials; t++) {
    const a = s.shuffle();
    if (key([...a].sort((x, y) => x - y)) !== base) valid = 0;
    if (key(a) !== key(nums)) changed = 1;
    if (nums.length <= 4) seen.set(key(a), (seen.get(key(a)) || 0) + 1);
    if (t % 997 === 0 && key(s.reset()) !== key(nums)) valid = 0;
  }
  if (key(s.reset()) !== key(nums)) valid = 0;
  return [valid, changed, ...[...seen.values()].sort((a, b) => a - b)];
}`,
        cpp: `vector<int> shuffleStats(vector<int> nums, int trials) {
    Solution s(nums);
    vector<int> base = nums;
    sort(base.begin(), base.end());
    map<vector<int>, int> seen;
    int valid = 1, changed = 0;
    for (int t = 0; t < trials; t++) {
        vector<int> a = s.shuffle(), sorted = a;
        sort(sorted.begin(), sorted.end());
        if (sorted != base) valid = 0;
        if (a != nums) changed = 1;
        if (nums.size() <= 4) seen[a]++;
        if (t % 997 == 0 && s.reset() != nums) valid = 0;
    }
    if (s.reset() != nums) valid = 0;
    vector<int> counts, res = {valid, changed};
    for (auto& kv : seen) counts.push_back(kv.second);
    sort(counts.begin(), counts.end());
    res.insert(res.end(), counts.begin(), counts.end());
    return res;
}`, csharp: `public class Check {
    public static List<int> ShuffleStats(int[] nums, int trials) {
        var s = new Solution((int[])nums.Clone());
        int[] baseArr = (int[])nums.Clone();
        Array.Sort(baseArr);
        var seen = new Dictionary<string, int>();
        int valid = 1, changed = 0;
        for (int t = 0; t < trials; t++) {
            int[] a = s.Shuffle();
            int[] sorted = (int[])a.Clone();
            Array.Sort(sorted);
            if (!sorted.SequenceEqual(baseArr)) valid = 0;        // must be a permutation
            if (!a.SequenceEqual(nums)) changed = 1;
            if (nums.Length <= 4) { string k = string.Join(",", a); int c; seen.TryGetValue(k, out c); seen[k] = c + 1; }
            if (t % 997 == 0 && !s.Reset().SequenceEqual(nums)) valid = 0;   // reset restores the original
        }
        if (!s.Reset().SequenceEqual(nums)) valid = 0;
        var counts = new List<int>(seen.Values);
        counts.Sort();
        var res = new List<int> { valid, changed };
        res.AddRange(counts);
        return res;
    }
}`
      },
      cases: [
        [[[1], 50], [1]],
        [[[1, 2], 20000], [1]],
        [[[1, 2, 3], 60000], [1]],
        [[[5, -3, 8, 0], 120000], [1]],
        [[[3, 1, 2], 60000], [1]],
        [
          [
            [
              1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27,
              28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50
            ],
            300
          ],
          [1]
        ],
        [
          [
            [
              50, 49, 48, 47, 46, 45, 44, 43, 42, 41, 40, 39, 38, 37, 36, 35, 34, 33, 32, 31, 30, 29, 28, 27, 26,
              25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1
            ],
            300
          ],
          [1]
        ]
      ]
    },
        solution: {
      approach: `<p>Fisher–Yates on a copy. Each shuffle is O(N); reset returns a copy of the stored original so callers cannot mutate our state.</p>`,
      code: `class Solution {
    private final int[] orig;
    private final Random rnd = new Random();

    public Solution(int[] nums) { orig = nums.clone(); }

    public int[] reset() { return orig.clone(); }

    public int[] shuffle() {
        int[] a = orig.clone();
        for (int i = a.length - 1; i > 0; i--) {
            int j = rnd.nextInt(i + 1);          // uniform in [0, i]
            int t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
    }
}`,
      alt: [{ lang: 'python', code: `import random

class Solution:
    def __init__(self, nums):
        self.orig = list(nums)

    def reset(self):
        return list(self.orig)

    def shuffle(self):
        a = list(self.orig)
        for i in range(len(a) - 1, 0, -1):
            j = random.randint(0, i)          # uniform in [0, i], both ends included
            a[i], a[j] = a[j], a[i]
        return a` }, { lang: 'js', code: `class Solution {
  constructor(nums) {
    this.orig = [...nums];
  }
  reset() { return [...this.orig]; }
  shuffle() {
    const a = [...this.orig];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));    // uniform in [0, i]
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}` }, { lang: 'cpp', code: `class Solution {
    vector<int> orig;
    mt19937 rng{random_device{}()};
public:
    Solution(vector<int>& nums) : orig(nums) {}
    vector<int> reset() { return orig; }
    vector<int> shuffle() {
        vector<int> a = orig;
        for (int i = (int)a.size() - 1; i > 0; i--) {
            int j = uniform_int_distribution<int>(0, i)(rng);   // uniform in [0, i]
            swap(a[i], a[j]);
        }
        return a;
    }
};` }, { lang: 'csharp', code: `public class Solution {
    private readonly int[] orig;
    private readonly Random rnd = new Random();

    public Solution(int[] nums) { orig = (int[])nums.Clone(); }

    public int[] Reset() { return (int[])orig.Clone(); }

    public int[] Shuffle() {
        int[] a = (int[])orig.Clone();
        for (int i = a.Length - 1; i > 0; i--) {
            int j = rnd.Next(i + 1);             // uniform in [0, i]
            int t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
    }
}` }],
      dry: { head: ['i', 'j drawn', 'array after swap'], rows: [['—', '—', '[1, 2, 3]'], ['2', '0', '[3, 2, 1]'], ['1', '1', '[3, 2, 1] (stays)']] },
      complexity: `<p>shuffle O(N) time, O(N) for the returned copy; reset O(N).</p>`,
      followUps: ['Shuffle a stream that does not fit in memory (assign random keys and external-sort, or reservoir-style "inside-out" Fisher–Yates).', 'Why can a 32-bit seeded RNG not produce all 52! deck orders?']
    }
  });

  practice.push({
    title: 'Random Pick Index', level: 'Medium', tags: ['reservoir sampling', 'randomized'], companies: ['Meta', 'Google'],
    statement: `<p>Given an integer array <code>nums</code> with possible duplicates, implement <code>pick(target)</code> that returns a random index i with <code>nums[i] == target</code>; each valid index must be equally likely. The target always exists. Aim for O(1) extra space. (LeetCode 398.)</p>`,
    constraints: `1 ≤ N ≤ 2·10<sup>4</sup>, at most 10<sup>4</sup> calls to pick`,
    example: `<p>nums = [1,2,3,3,3]: pick(3) returns ${H.c('b', '2, 3 or 4')}, each with probability ⅓; pick(1) always returns ${H.c('g', '0')}.</p>`,
    brute: {
      why: `<p>Precompute <code>Map&lt;value, List&lt;index&gt;&gt;</code> and return a random element of the list: O(1) per pick but <b>O(N) extra memory</b>. Or collect the matching indices on each call — O(N) time and O(K) memory per call. Reservoir sampling needs no extra memory.</p>`,
      code: { lang: 'java', code: `class Solution {
    private final Map<Integer, List<Integer>> pos = new HashMap<>();
    private final Random rnd = new Random();

    public Solution(int[] nums) {
        for (int i = 0; i < nums.length; i++)
            pos.computeIfAbsent(nums[i], k -> new ArrayList<>()).add(i);  // O(N) memory
    }

    public int pick(int target) {
        List<Integer> l = pos.get(target);
        return l.get(rnd.nextInt(l.size()));
    }
}`, alt: [{ lang: 'python', code: String.raw`
import random

class Solution:
    def __init__(self, nums):
        self.pos = {}
        for i, v in enumerate(nums):
            self.pos.setdefault(v, []).append(i)      # O(N) memory

    def pick(self, target):
        l = self.pos[target]
        return l[random.randrange(len(l))]` }, { lang: 'js', code: String.raw`
class Solution {
  constructor(nums) {
    this.pos = new Map();
    nums.forEach((v, i) => {
      if (!this.pos.has(v)) this.pos.set(v, []);
      this.pos.get(v).push(i);                        // O(N) memory
    });
  }

  pick(target) {
    const l = this.pos.get(target);
    return l[Math.floor(Math.random() * l.length)];
  }
}` }, { lang: 'cpp', code: String.raw`
class Solution {
    unordered_map<int, vector<int>> pos;
    mt19937 rnd{random_device{}()};

public:
    Solution(vector<int>& nums) {
        for (int i = 0; i < (int)nums.size(); i++) pos[nums[i]].push_back(i);   // O(N) memory
    }

    int pick(int target) {
        vector<int>& l = pos[target];
        return l[rnd() % l.size()];
    }
};` }, { lang: 'csharp', code: `public class Solution {
    private readonly Dictionary<int, List<int>> pos = new Dictionary<int, List<int>>();
    private readonly Random rnd = new Random();

    public Solution(int[] nums) {
        for (int i = 0; i < nums.Length; i++) {
            List<int> l;
            if (!pos.TryGetValue(nums[i], out l)) pos[nums[i]] = l = new List<int>();
            l.Add(i);                                         // O(N) memory
        }
    }

    public int Pick(int target) {
        List<int> l = pos[target];
        return l[rnd.Next(l.Count)];
    }
}` }] }
    },
    mcq: { q: 'Scanning left to right, you meet the 3rd index whose value equals target. With what probability do you switch your answer to it?', options: ['1/2', '1/3', '1/N', 'Always'], answer: 1, explain: 'Run reservoir sampling only over matching indices: the c-th match replaces the answer with probability 1/c.' },
    hints: [
      `<p>Hint 1: Treat the matching indices as a stream whose length you do not know in advance.</p>`,
      `<p>Hint 2: Reservoir with k = 1: keep a counter c of matches; at each match, c++, replace the answer with probability 1/c.</p>`,
      `<p>Hint 3: <code>if (nums[i] == target &amp;&amp; rnd.nextInt(++c) == 0) ans = i;</code> in Java (in Python: <code>random.randrange(count) == 0</code>) — one pass, O(1) space.</p>`
    ],
    tests: {
      sig: 'int[] int int -> list<int>',
      fn: 'samplePick',
      check: `(args, out, exp) => {
  // out[i] = how often index i was returned, out[n] = answers that are not a valid index.
  // Each index holding target must come up about trials / (copies of target) times; the others never.
  const nums = args[0], target = args[1], trials = args[2], n = nums.length;
  if (out.length !== n + 1 || out[n] !== 0) return false;
  const copies = nums.filter((v) => v === target).length;
  const p = 1 / copies, mean = trials * p, sd = Math.sqrt(trials * p * (1 - p));
  return nums.every((v, i) => (v === target ? Math.abs(out[i] - mean) <= 6 * sd + 3 : out[i] === 0));
}`,
      harness: {
        java: `class Check {
    static List<Integer> samplePick(int[] nums, int target, int trials) {
        Solution s = new Solution(nums);
        int[] counts = new int[nums.length + 1];          // last slot: indices that do not hold target
        for (int t = 0; t < trials; t++) {
            int i = s.pick(target);
            counts[i >= 0 && i < nums.length && nums[i] == target ? i : nums.length]++;
        }
        List<Integer> res = new ArrayList<>();
        for (int c : counts) res.add(c);
        return res;
    }
}`,
        python: `def sample_pick(nums, target, trials):
    s = Solution(nums)
    counts = [0] * (len(nums) + 1)                   # last slot: indices that do not hold target
    for _ in range(trials):
        i = s.pick(target)
        counts[i if 0 <= i < len(nums) and nums[i] == target else len(nums)] += 1
    return counts`,
        js: `function samplePick(nums, target, trials) {
  const s = new Solution(nums);
  const counts = new Array(nums.length + 1).fill(0);   // last slot: indices that do not hold target
  for (let t = 0; t < trials; t++) {
    const i = s.pick(target);
    counts[Number.isInteger(i) && i >= 0 && i < nums.length && nums[i] === target ? i : nums.length]++;
  }
  return counts;
}`,
        cpp: `vector<int> samplePick(vector<int> nums, int target, int trials) {
    Solution s(nums);
    vector<int> counts(nums.size() + 1, 0);          // last slot: indices that do not hold target
    for (int t = 0; t < trials; t++) {
        int i = s.pick(target);
        counts[i >= 0 && i < (int)nums.size() && nums[i] == target ? i : nums.size()]++;
    }
    return counts;
}`, csharp: `public class Check {
    public static List<int> SamplePick(int[] nums, int target, int trials) {
        var s = new Solution(nums);
        int[] counts = new int[nums.Length + 1];          // last slot: indices that do not hold target
        for (int t = 0; t < trials; t++) {
            int i = s.Pick(target);
            counts[i >= 0 && i < nums.Length && nums[i] == target ? i : nums.Length]++;
        }
        return new List<int>(counts);
    }
}`
      },
      cases: [
        [[[1, 2, 3, 3, 3], 3, 60000], [1]],
        [[[1, 2, 3, 3, 3], 1, 100], [1]],
        [[[5], 5, 10], [1]],
        [[[2, 2], 2, 40000], [1]],
        [[[7, 1, 7, 2, 7, 3, 7, 7, 7, 4, 7, 7], 7, 100000], [1]],
        [[[-1, -1, 0, -1], -1, 60000], [1]],
        [[[10000, 3, -10000, 3, 10000], 10000, 20000], [1]],
        [[{ $concat: [{ $rep: 1, n: 10000 }, { $rep: 2, n: 10000 }] }, 2, 40], [1]]
      ]
    },
        solution: {
      approach: `<p>Reservoir sampling restricted to positions holding the target. Each matching position ends up chosen with probability 1/(number of matches). Mention the trade-off: the hash-map version is faster per call when memory is available and calls are many.</p>`,
      code: `class Solution {
    private final int[] nums;
    private final Random rnd = new Random();

    public Solution(int[] nums) { this.nums = nums; }

    public int pick(int target) {
        int ans = -1, count = 0;
        for (int i = 0; i < nums.length; i++) {
            if (nums[i] != target) continue;
            count++;
            if (rnd.nextInt(count) == 0) ans = i;   // keep with probability 1/count
        }
        return ans;
    }
}`,
      alt: [{ lang: 'python', code: `import random

class Solution:
    def __init__(self, nums):
        self.nums = nums

    def pick(self, target):
        ans, count = -1, 0
        for i, x in enumerate(self.nums):
            if x == target:
                count += 1
                if random.randrange(count) == 0:   # keep with probability 1/count
                    ans = i
        return ans` }, { lang: 'js', code: `class Solution {
  constructor(nums) {
    this.nums = nums;
  }
  pick(target) {
    let ans = -1, count = 0;
    for (let i = 0; i < this.nums.length; i++) {
      if (this.nums[i] !== target) continue;
      count++;
      if (Math.floor(Math.random() * count) === 0) ans = i;   // keep with probability 1/count
    }
    return ans;
  }
}` }, { lang: 'cpp', code: `class Solution {
    vector<int> nums;
    mt19937 rng{random_device{}()};
public:
    Solution(vector<int>& nums) : nums(nums) {}
    int pick(int target) {
        int ans = -1, count = 0;
        for (int i = 0; i < (int)nums.size(); i++) {
            if (nums[i] != target) continue;
            count++;
            if (uniform_int_distribution<int>(0, count - 1)(rng) == 0) ans = i;   // 1/count
        }
        return ans;
    }
};` }, { lang: 'csharp', code: `public class Solution {
    private readonly int[] nums;
    private readonly Random rnd = new Random();

    public Solution(int[] nums) { this.nums = nums; }

    public int Pick(int target) {
        int ans = -1, count = 0;
        for (int i = 0; i < nums.Length; i++) {
            if (nums[i] != target) continue;
            count++;
            if (rnd.Next(count) == 0) ans = i;      // keep with probability 1/count
        }
        return ans;
    }
}` }],
      dry: { head: ['i', 'nums[i]', 'count', 'roll in [0, count)', 'ans'], rows: [['2', '3', '1', '0 → take', '2'], ['3', '3', '2', '1 → keep', '2'], ['4', '3', '3', '0 → take', '4']] },
      complexity: `<p>pick: O(N) time, <b>O(1)</b> extra space. Hash-map alternative: O(1) per pick, O(N) space.</p>`,
      followUps: ['Pick k distinct indices of the target uniformly.', 'Which version would you ship for 10<sup>9</sup> calls on a static array?']
    }
  });

  practice.push({
    title: 'Random Pick with Weight', level: 'Medium', tags: ['randomized', 'prefix sum', 'binary search'], companies: ['Google', 'Meta', 'Uber'],
    statement: `<p>Given positive weights <code>w</code>, implement <code>pickIndex()</code> which returns index i with probability <code>w[i] / sum(w)</code>. (LeetCode 528.)</p>`,
    constraints: `1 ≤ N ≤ 10<sup>4</sup>, 1 ≤ w[i] ≤ 10<sup>5</sup>, at most 10<sup>4</sup> calls`,
    example: `<p>w = [1, 3]: index 0 with probability ${H.c('b', '1/4')}, index 1 with ${H.c('b', '3/4')}. Prefix sums [1, 4]; a random ticket in 1..4: ticket 1 → index 0, tickets 2–4 → index 1.</p>`,
    brute: {
      why: `<p>Expand the array — write index i exactly w[i] times — and pick a random slot: sum(w) can reach 10<sup>9</sup> slots, far too much memory. Scanning prefix sums linearly per call is O(N) per pick, 10<sup>8</sup> total — slow but feasible; binary search makes it O(log N).</p>`,
      code: { lang: 'java', code: `class Solution {
    private final int[] prefix;
    private final Random rnd = new Random();

    public Solution(int[] w) {
        prefix = new int[w.length];
        int s = 0;
        for (int i = 0; i < w.length; i++) { s += w[i]; prefix[i] = s; }
    }

    public int pickIndex() {
        int ticket = rnd.nextInt(prefix[prefix.length - 1]) + 1;   // 1..total
        for (int i = 0; i < prefix.length; i++)                     // O(N) scan
            if (ticket <= prefix[i]) return i;
        return prefix.length - 1;
    }
}`, alt: [{ lang: 'python', code: String.raw`
import random

class Solution:
    def __init__(self, w):
        self.prefix = []
        s = 0
        for x in w:
            s += x
            self.prefix.append(s)

    def pickIndex(self):
        ticket = random.randint(1, self.prefix[-1])   # 1..total
        for i in range(len(self.prefix)):             # O(N) scan
            if ticket <= self.prefix[i]:
                return i
        return len(self.prefix) - 1` }, { lang: 'js', code: String.raw`
class Solution {
  constructor(w) {
    this.prefix = [];
    let s = 0;
    for (const x of w) { s += x; this.prefix.push(s); }
  }

  pickIndex() {
    const total = this.prefix[this.prefix.length - 1];
    const ticket = Math.floor(Math.random() * total) + 1;   // 1..total
    for (let i = 0; i < this.prefix.length; i++)            // O(N) scan
      if (ticket <= this.prefix[i]) return i;
    return this.prefix.length - 1;
  }
}` }, { lang: 'cpp', code: String.raw`
class Solution {
    vector<int> prefix;
    mt19937 rnd{random_device{}()};

public:
    Solution(vector<int>& w) {
        int s = 0;
        for (int x : w) { s += x; prefix.push_back(s); }
    }

    int pickIndex() {
        int ticket = rnd() % prefix.back() + 1;       // 1..total
        for (int i = 0; i < (int)prefix.size(); i++)  // O(N) scan
            if (ticket <= prefix[i]) return i;
        return prefix.size() - 1;
    }
};` }, { lang: 'csharp', code: `public class Solution {
    private readonly int[] prefix;
    private readonly Random rnd = new Random();

    public Solution(int[] w) {
        prefix = new int[w.Length];
        int s = 0;
        for (int i = 0; i < w.Length; i++) { s += w[i]; prefix[i] = s; }
    }

    public int PickIndex() {
        int ticket = rnd.Next(prefix[prefix.Length - 1]) + 1;      // 1..total
        for (int i = 0; i < prefix.Length; i++)                     // O(N) scan
            if (ticket <= prefix[i]) return i;
        return prefix.Length - 1;
    }
}` }] }
    },
    mcq: { q: 'Prefix sums are [2, 5, 6] and the ticket drawn uniformly from 1..6 is 5. Which index is returned?', options: ['0', '1', '2', 'It depends on the seed'], answer: 1, explain: 'Index 1 owns tickets 3..5 (prefix[0] = 2 < 5 ≤ prefix[1] = 5). The answer is the first prefix ≥ ticket — a lower-bound binary search.' },
    hints: [
      `<p>Hint 1: Lay the weights end to end on a number line of length S = sum(w). Index i owns a segment of length w[i].</p>`,
      `<p>Hint 2: Prefix sums give the segment ends. Draw a ticket uniformly in [1, S] and find which segment contains it.</p>`,
      `<p>Hint 3: That is the first index with prefix[i] ≥ ticket → binary search (lower bound). Use a 64-bit integer if weights could sum past 2<sup>31</sup>.</p>`
    ],
    tests: {
      sig: 'int[] int -> list<int>',
      fn: 'sampleWeights',
      check: `(args, out, exp) => {
  // out[i] = how often index i was returned, out[n] = answers outside 0..n-1.
  // Index i must come up with probability w[i] / sum(w).
  const w = args[0], trials = args[1], n = w.length;
  if (out.length !== n + 1 || out[n] !== 0) return false;
  let total = 0; for (const x of w) total += x;
  return w.every((x, i) => {
    const p = x / total, mean = trials * p, sd = Math.sqrt(trials * p * (1 - p));
    return Math.abs(out[i] - mean) <= 6 * sd + 3;
  });
}`,
      harness: {
        java: `class Check {
    static List<Integer> sampleWeights(int[] w, int trials) {
        Solution s = new Solution(w);
        int[] counts = new int[w.length + 1];             // last slot: answers outside 0..n-1
        for (int t = 0; t < trials; t++) {
            int i = s.pickIndex();
            counts[i >= 0 && i < w.length ? i : w.length]++;
        }
        List<Integer> res = new ArrayList<>();
        for (int c : counts) res.add(c);
        return res;
    }
}`,
        python: `def sample_weights(w, trials):
    s = Solution(w)
    counts = [0] * (len(w) + 1)                      # last slot: answers outside 0..n-1
    for _ in range(trials):
        i = s.pickIndex()
        counts[i if 0 <= i < len(w) else len(w)] += 1
    return counts`,
        js: `function sampleWeights(w, trials) {
  const s = new Solution(w);
  const counts = new Array(w.length + 1).fill(0);      // last slot: answers outside 0..n-1
  for (let t = 0; t < trials; t++) {
    const i = s.pickIndex();
    counts[Number.isInteger(i) && i >= 0 && i < w.length ? i : w.length]++;
  }
  return counts;
}`,
        cpp: `vector<int> sampleWeights(vector<int> w, int trials) {
    Solution s(w);
    vector<int> counts(w.size() + 1, 0);             // last slot: answers outside 0..n-1
    for (int t = 0; t < trials; t++) {
        int i = s.pickIndex();
        counts[i >= 0 && i < (int)w.size() ? i : w.size()]++;
    }
    return counts;
}`, csharp: `public class Check {
    public static List<int> SampleWeights(int[] w, int trials) {
        var s = new Solution(w);
        int[] counts = new int[w.Length + 1];             // last slot: answers outside 0..n-1
        for (int t = 0; t < trials; t++) {
            int i = s.PickIndex();
            counts[i >= 0 && i < w.Length ? i : w.Length]++;
        }
        return new List<int>(counts);
    }
}`
      },
      cases: [
        [[[1, 3], 80000], [1]],
        [[[1], 10], [1]],
        [[[3, 14, 1, 7], 100000], [1]],
        [[[100000, 1], 100000], [1]],
        [[[1, 1, 1, 1, 1, 1, 1, 1, 1, 1], 100000], [1]],
        [[[1, 1, 99998], 100000], [1]],
        [[{ $rep: 100000, n: 10000 }, 2000], [1]],
        [[{ $concat: [{ $rep: 1, n: 9999 }, [100000]] }, 20000], [1]]
      ]
    },
        solution: {
      approach: `<p>Prefix sums + uniform ticket + lower-bound binary search. Setup O(N), each pick O(log N). For O(1) picks after O(N) setup, use Walker's alias method.</p>`,
      code: `class Solution {
    private final long[] prefix;
    private final Random rnd = new Random();

    public Solution(int[] w) {
        prefix = new long[w.length];
        long s = 0;
        for (int i = 0; i < w.length; i++) { s += w[i]; prefix[i] = s; }
    }

    public int pickIndex() {
        long ticket = (long) (rnd.nextDouble() * prefix[prefix.length - 1]) + 1; // 1..total
        int lo = 0, hi = prefix.length - 1;
        while (lo < hi) {                       // first i with prefix[i] >= ticket
            int mid = (lo + hi) >>> 1;
            if (prefix[mid] >= ticket) hi = mid; else lo = mid + 1;
        }
        return lo;
    }
}`,
      alt: [{ lang: 'python', code: `import bisect
import itertools
import random

class Solution:
    def __init__(self, w):
        self.prefix = list(itertools.accumulate(w))      # prefix[i] = w[0] + ... + w[i]

    def pickIndex(self):
        ticket = random.randint(1, self.prefix[-1])      # 1..total, both ends included
        return bisect.bisect_left(self.prefix, ticket)   # first i with prefix[i] >= ticket` }, { lang: 'js', code: `class Solution {
  constructor(w) {
    this.prefix = [];
    let s = 0;
    for (const x of w) { s += x; this.prefix.push(s); }
  }
  pickIndex() {
    const total = this.prefix[this.prefix.length - 1];
    const ticket = Math.floor(Math.random() * total) + 1;   // 1..total
    let lo = 0, hi = this.prefix.length - 1;
    while (lo < hi) {                                       // first i with prefix[i] >= ticket
      const mid = (lo + hi) >> 1;
      if (this.prefix[mid] >= ticket) hi = mid; else lo = mid + 1;
    }
    return lo;
  }
}` }, { lang: 'cpp', code: `class Solution {
    vector<long long> prefix;
    mt19937_64 rng{random_device{}()};
public:
    Solution(vector<int>& w) {
        partial_sum(w.begin(), w.end(), back_inserter(prefix));   // prefix[i] = w[0] + ... + w[i]
    }
    int pickIndex() {
        long long ticket = uniform_int_distribution<long long>(1, prefix.back())(rng);   // 1..total
        return lower_bound(prefix.begin(), prefix.end(), ticket) - prefix.begin();       // first >= ticket
    }
};` }, { lang: 'csharp', code: `public class Solution {
    private readonly long[] prefix;
    private readonly Random rnd = new Random();

    public Solution(int[] w) {
        prefix = new long[w.Length];
        long s = 0;
        for (int i = 0; i < w.Length; i++) { s += w[i]; prefix[i] = s; }
    }

    public int PickIndex() {
        long ticket = (long)(rnd.NextDouble() * prefix[prefix.Length - 1]) + 1; // 1..total
        int lo = 0, hi = prefix.Length - 1;
        while (lo < hi) {                       // first i with prefix[i] >= ticket
            int mid = (lo + hi) >> 1;
            if (prefix[mid] >= ticket) hi = mid; else lo = mid + 1;
        }
        return lo;
    }
}` }],
      dry: { head: ['w', 'prefix', 'ticket', 'binary search', 'index'], rows: [['[2, 3, 1]', '[2, 5, 6]', '1', 'prefix[0] = 2 ≥ 1', '0'], ['[2, 3, 1]', '[2, 5, 6]', '5', 'prefix[1] = 5 ≥ 5', '1'], ['[2, 3, 1]', '[2, 5, 6]', '6', 'prefix[2] = 6 ≥ 6', '2']] },
      complexity: `<p>Constructor O(N), pickIndex <b>O(log N)</b>, space O(N).</p>`,
      followUps: ['Weights change between picks: use a Fenwick tree for O(log N) updates and picks.', 'Alias method: O(1) per pick — explain the table construction.']
    }
  });

  practice.push({
    title: 'K Closest Points to Origin', level: 'Medium', tags: ['quickselect', 'randomized', 'geometry'], companies: ['Amazon', 'Meta', 'LinkedIn'],
    statement: `<p>Given points <code>points[i] = [x, y]</code> and an integer k, return the k points closest to the origin (Euclidean distance), in any order. (LeetCode 973.)</p>`,
    constraints: `1 ≤ k ≤ N ≤ 10<sup>4</sup>, −10<sup>4</sup> ≤ x, y ≤ 10<sup>4</sup>`,
    example: `<p><code>points = [[3,3],[5,−1],[−2,4]], k = 2</code> → ${H.c('g', '[[3,3],[−2,4]]')}: squared distances 18, 26, 20 — the two smallest are 18 and 20.</p>`,
    brute: {
      why: `<p>Sort all points by distance and take the first k: <b>O(N log N)</b>, ordering points we never return. A max-heap of size k is O(N log k). Quickselect only needs the k-th boundary: expected O(N).</p>`,
      code: { lang: 'java', code: `class Solution {
    public int[][] kClosest(int[][] points, int k) {
        int[][] p = points.clone();
        Arrays.sort(p, (a, b) -> Long.compare(dist(a), dist(b)));   // O(N log N)
        return Arrays.copyOfRange(p, 0, k);
    }
    private long dist(int[] q) { return (long) q[0] * q[0] + (long) q[1] * q[1]; }
}`, alt: [{ lang: 'python', code: String.raw`
class Solution:
    def k_closest(self, points, k):
        p = sorted(points, key=lambda q: q[0] * q[0] + q[1] * q[1])   # O(N log N)
        return p[:k]` }, { lang: 'js', code: String.raw`
function kClosest(points, k) {
  const dist = (q) => q[0] * q[0] + q[1] * q[1];
  const p = points.slice().sort((a, b) => dist(a) - dist(b));   // O(N log N)
  return p.slice(0, k);
}` }, { lang: 'cpp', code: String.raw`
class Solution {
    long long dist(const vector<int>& q) { return (long long)q[0] * q[0] + (long long)q[1] * q[1]; }

public:
    vector<vector<int>> kClosest(vector<vector<int>> points, int k) {
        sort(points.begin(), points.end(), [&](auto& a, auto& b) { return dist(a) < dist(b); });   // O(N log N)
        return vector<vector<int>>(points.begin(), points.begin() + k);
    }
};` }, { lang: 'csharp', code: `public class Solution {
    public int[][] KClosest(int[][] points, int k) {
        int[][] p = (int[][])points.Clone();
        Array.Sort(p, (a, b) => Dist(a).CompareTo(Dist(b)));   // O(N log N)
        int[][] res = new int[k][];
        Array.Copy(p, res, k);
        return res;
    }
    private long Dist(int[] q) { return (long)q[0] * q[0] + (long)q[1] * q[1]; }
}` }] }
    },
    mcq: { q: 'Why compare x² + y² instead of √(x² + y²)?', options: ['A square root function does not exist', 'Squaring preserves the order of non-negative distances, and stays exact in integers', 'It changes which points are closest', 'Square roots are faster'], answer: 1, explain: 'For d ≥ 0, d₁ < d₂ ⇔ d₁² < d₂². Skipping the square root keeps everything in exact integer arithmetic.' },
    hints: [
      `<p>Hint 1: You need the k smallest by squared distance, in any order — that is a selection problem, not sorting.</p>`,
      `<p>Hint 2: Quickselect on squared distances: random pivot, 3-way partition the points, keep the side containing position k − 1.</p>`,
      `<p>Hint 3: When position k − 1 lands in the "equal" block, the first k positions hold the answer. Swap point references (int[]), compute distances in 64-bit integers.</p>`
    ],
    tests: {
      sig: 'int[][] int -> int[][]',
      fn: 'kClosest',
      check: `(args, out, exp) => {
  // exp = the k smallest squared distances. The answer must use k input points (each at most as often as given)
  // whose sorted squared distances are exactly exp, so ties at the boundary may go either way.
  const pts = args[0], k = args[1], d = (p) => p[0] * p[0] + p[1] * p[1];
  if (!Array.isArray(out) || out.length !== k) return false;
  const have = new Map(), key = (p) => p[0] + ',' + p[1];
  for (const p of pts) have.set(key(p), (have.get(key(p)) || 0) + 1);
  for (const p of out) {
    if (!Array.isArray(p) || p.length !== 2) return false;
    const c = have.get(key(p)) || 0;
    if (c === 0) return false;
    have.set(key(p), c - 1);
  }
  const got = out.map(d).sort((a, b) => a - b);
  return got.length === exp.length && got.every((x, i) => x === exp[i]);
}`,
      cases: [
        [[[[3, 3], [5, -1], [-2, 4]], 2], [18, 20]],
        [[[[1, 3], [-2, 2]], 1], [8]],
        [[[[0, 0]], 1], [0]],
        [[[[1, 0], [0, 1], [-1, 0], [0, -1], [2, 0]], 2], [1, 1]],
        [[[[2, 2], [-2, -2], [2, -2], [-2, 2]], 4], [8, 8, 8, 8]],
        [[[[10000, 10000], [-10000, -10000], [10000, -10000], [0, 0], [-10000, 10000]], 3], [0, 200000000, 200000000]],
        [[[[5, 5], [5, 5], [1, 1], [1, 1], [3, 3]], 3], [2, 2, 18]],
        [[[[0, 5], [5, 0], [0, -5], [-5, 0], [3, 4], [4, 3], [-3, -4]], 5], [25, 25, 25, 25, 25]],
        [
          [
            [
              [20, 0], [19, 0], [18, 0], [17, 0], [16, 0], [15, 0], [14, 0], [13, 0], [12, 0], [11, 0], [10, 0],
              [9, 0], [8, 0], [7, 0], [6, 0], [5, 0], [4, 0], [3, 0], [2, 0], [1, 0]
            ],
            7
          ],
          [1, 4, 9, 16, 25, 36, 49]
        ],
        [
          [
            [
              [-11, 18], [-17, 6], [-4, -3], [16, -14], [9, 9], [-16, -16], [3, -18], [20, -16], [15, 13],
              [-11, 20], [-20, 14], [15, 12], [-6, -6], [-15, 6], [10, 13], [-16, -20], [20, 19], [7, -6],
              [20, 10], [-16, -6], [2, 3], [12, 15], [-13, 17], [-3, -6], [16, 0], [-8, -19], [9, -8], [20, -20],
              [9, 15], [-7, 7]
            ],
            10
          ],
          [13, 25, 45, 72, 85, 98, 145, 162, 256, 261]
        ],
        [
          [
            [
              [-18, -20], [4, -3], [-15, 75], [-48, 37], [-99, -2], [-60, 16], [86, 10], [85, -93], [-68, 12],
              [45, -93], [-11, 34], [85, -90], [-5, -70], [87, -44], [-81, 66], [85, 41], [-44, 13], [14, 85],
              [-25, 34], [-41, 45], [82, -69], [48, -20], [-18, 24], [-100, -34], [38, 95], [-70, 12], [24, -89],
              [21, 54], [-12, 17], [63, -99], [82, -70], [86, -95], [-52, -1], [-89, -41], [-26, -2], [-21, 86],
              [-73, 27], [-59, 72], [81, -86], [26, -82], [19, -31], [-62, 68], [62, -70], [-2, -24], [7, 98],
              [50, -28], [67, -44], [53, -10], [-12, 72], [98, -11], [91, -61], [80, -21], [46, -62], [-68, 15],
              [16, 1], [-49, 94], [52, 19], [-31, 64], [-17, -23], [27, -73]
            ],
            1
          ],
          [25]
        ],
        [
          [
            [
              [76, -43], [81, -82], [13, 19], [19, 39], [-56, -23], [-80, 23], [-65, -98], [27, 82], [-30, 40],
              [41, -6], [2, -82], [8, 26], [56, -33], [6, -29], [13, 66], [-63, -53], [8, -89], [-84, 78],
              [47, 33], [-75, -63], [-27, -9], [-1, 96], [52, 59], [93, 4], [61, -94], [22, -9], [-16, 37],
              [-84, -64], [-89, -41], [-58, 23], [-75, -32], [18, 44], [90, -38], [4, 50], [-10, -87], [-46, -17],
              [28, -97], [-8, 1], [27, -94], [59, 8], [-99, 49], [55, 39], [-49, -35], [88, -6], [58, 56],
              [34, -17], [46, 35], [-58, -24], [-33, 79], [-45, -20], [89, -62], [-3, 65], [31, -50], [9, 16],
              [-39, -2], [-14, 73], [-34, -77], [-98, 32], [20, 23], [-83, -22]
            ],
            60
          ],
          [
            65, 337, 530, 565, 740, 810, 877, 929, 1445, 1525, 1625, 1717, 1882, 2260, 2405, 2425, 2500, 2516,
            3298, 3341, 3461, 3545, 3626, 3665, 3893, 3940, 4225, 4234, 4525, 4546, 5525, 6185, 6500, 6649, 6728,
            6778, 6929, 7085, 7330, 7373, 7453, 7625, 7669, 7780, 7985, 8665, 9217, 9544, 9565, 9594, 9602,
            10193, 10628, 11152, 11765, 12202, 12557, 13140, 13285, 13829
          ]
        ],
        [
          [
            [
              [9612, -7184], [-2470, -5201], [-4384, 3132], [9765, 3881], [6882, -3739], [912, 9138], [8566, 361],
              [6430, 1696], [558, -9715], [6321, -9306], [3330, -2540], [-587, -9609], [8638, -4393], [-706, 663],
              [9453, -6793], [3855, -3096], [4861, -710], [7540, 965], [1904, -401], [5373, -9509], [9245, 5971],
              [8889, 5804], [-8282, -1383], [7383, -9469], [9369, 7832], [-5936, -2350], [-3991, 283],
              [7511, -4442], [3159, -3403], [-1242, -2129], [2226, -4507], [2541, 3283], [741, -215], [258, -6985],
              [-4986, 4244], [4762, 6566], [7932, 1654], [-4789, 6897], [8856, -3891], [9921, -7314],
              [-2831, 9535], [-2921, -6115], [1050, 8261], [-3463, 989], [268, -9922], [-9893, -7308],
              [8219, 2902], [7821, 7779], [-9394, -3010], [-493, -947], [962, 6185], [-8334, -5189], [7934, -4006],
              [2912, 6324], [-6166, -5797], [-6158, 3135], [-2983, 1870], [2797, -5663], [-5026, -3446],
              [-7457, 3135], [-4472, 7863], [9341, 4929], [-5278, -5134], [-2656, -9584], [4792, 4971],
              [6773, -6736], [1829, -5637], [-2073, -7889], [-9444, -5998], [3246, 1727], [931, 3211],
              [-7846, -2588], [-5984, 5109], [1098, -7303], [-6243, 618], [-3385, 8163], [9598, 4984],
              [-7414, 8822], [5495, 9393], [-2383, 6373], [-3621, 9286], [2409, 9411], [5483, 6304], [7866, -8541],
              [8242, 7596], [-7788, 2212], [9074, -6555], [7400, 9059], [-2372, 4986], [-6388, 6648], [7909, 3906],
              [6547, 8150], [8322, -649], [-4814, -9214], [-1542, -485], [8345, -560], [-5012, 1391],
              [-3122, -2819], [-7884, -7588], [6796, 5047], [-5137, 5694], [-2691, -1687], [6725, -7038],
              [-9644, 2346], [-3951, 8083], [-689, 575], [6677, -1501], [-7362, 53], [2053, -9108], [-7035, -5626],
              [-9147, 8584], [-419, -7919], [3568, -5383], [-7913, -6859], [2968, -469], [3119, 8300], [534, 4700],
              [-8466, -8040], [3750, 5542], [-2432, -6335], [2979, -1523], [-2231, 4103], [573, 4084],
              [-2170, 2874], [8735, 3300], [-3052, 2050], [6945, -7426], [-5363, -9517], [-8938, -4961],
              [6042, 3790], [9030, 7974], [-2496, -3016], [2640, -491], [4971, -4870], [680, -9899], [7211, 3478],
              [-1932, 7040], [-8313, -6450], [2147, -7844], [8247, 7637], [604, 4169], [-36, -8221], [-6542, 9281],
              [714, -9564], [-3875, -5340], [4339, -7502], [-113, -2605], [349, -7507], [1156, -388],
              [1213, -4197], [-5659, 4113], [6609, -985], [-8595, -1939], [929, -3406], [-5581, 475],
              [-1302, 2931], [2193, -6322], [604, 6656], [-5460, -1642], [-7168, -1119], [-6917, 5942],
              [-6591, 3714], [-3096, 8487], [-8473, -2364], [4968, 7921], [-8769, 2477], [3425, -1920],
              [-5852, 6823], [4941, 5655], [-9031, 7761], [-1630, -6827], [6146, -3226], [9167, 3382],
              [7436, -3517], [-2268, 9181], [-6684, -2088], [3130, -4776], [5580, -7089], [-8138, 5716],
              [3838, 5884], [3455, -5638], [-7190, 4228], [9873, 2769], [-756, -3212], [3359, -1752], [6226, 9383],
              [-1869, -994], [-9944, -8806], [-1077, -8842], [-8340, 8673], [8882, 7222], [1572, -3788],
              [-6109, 2572], [-9388, -6078], [1009, -911], [7337, -2925], [5619, -360], [7552, 3272], [4402, 5557],
              [-5933, -2703]
            ],
            77
          ],
          [
            595306, 805346, 938005, 1139858, 1486880, 1848002, 2612989, 3786017, 4481197, 6075205, 6798794,
            7210681, 9028985, 10087450, 10285965, 10888480, 11177282, 11193970, 12395189, 12463877, 12968776,
            12970490, 13517204, 13519045, 14352385, 15326272, 15417025, 16008170, 16820128, 17007385, 17234770,
            17540500, 17693645, 17745377, 19086178, 21559690, 21811970, 22375156, 24133421, 24446241, 25268125,
            27055025, 29028880, 30486580, 31373186, 31702761, 32507764, 32607076, 33151301, 35121010, 37135592,
            39179669, 39356973, 39892778, 40758596, 41707313, 42506698, 42871732, 43531225, 43724069, 43935065,
            44221316, 44649106, 44667152, 44776264, 44776933, 45925466, 46046849, 46293818, 46835330, 47674105,
            47749189, 48180392, 48427741, 48472720, 48856789, 48941050
          ]
        ],
        [
          [
            [
              [0, 5], [-1, -1], [-2, 3], [2, 2], [-5, -3], [-2, 0], [0, -3], [-4, -4], [3, -3], [0, -1], [2, -1],
              [-1, 1], [5, 1], [-1, 1], [1, 4], [-3, 3], [1, 3], [0, 1], [2, -1], [0, -4], [-1, 3], [2, 2],
              [-5, -1], [-3, -2], [-1, 5], [4, -3], [-3, -4], [0, 1], [5, 2], [0, 3], [-3, 2], [2, 4], [1, -4],
              [-5, -3], [-2, 4], [-3, 4], [0, -1], [-4, -3], [-5, 1], [-1, 5], [2, -3], [5, 3], [1, 0], [0, -2],
              [3, 1], [-3, -2], [1, -1], [2, 3], [-5, -4], [-5, 4], [4, -5], [5, -3], [-4, -1], [-5, 2], [0, 4],
              [-2, -3], [2, 5], [1, 2], [2, -3], [-3, 5], [-3, -1], [5, 4], [2, 3], [-5, 1], [5, -3], [4, -5],
              [3, -1], [1, 2], [-3, -3], [-2, 5], [1, 4], [-1, 4], [-1, -2], [-3, -2], [1, 5], [2, 4], [3, -4],
              [0, 3], [3, 4], [4, 2], [-5, -4], [-4, 4], [-4, -5], [4, -3], [2, 3], [4, 1], [0, 2], [3, 5], [1, 0],
              [1, 1], [4, -1], [5, 4], [5, -1], [-3, 5], [-1, 2], [1, -4], [5, 2], [2, -1], [-1, 0], [4, -2],
              [-3, 0], [5, 0], [-4, 1], [-5, 1], [-5, 5], [-2, -2], [-2, 1], [-4, 5], [0, 1], [-4, -2], [4, -4],
              [1, -4], [-3, -4], [2, -2], [-1, -5], [1, 4], [-2, 4], [-3, 1], [5, 3], [0, -4], [3, 4], [2, 2],
              [-1, 4], [-3, -1], [4, -1], [-4, -3], [3, -2], [-1, -3], [-2, 2], [1, 0], [-1, -4], [-1, -2],
              [-4, -2], [-2, -1], [-5, -3], [-4, 2], [-1, -2], [-1, -1], [-1, -3], [-2, 5], [1, 0], [2, 5],
              [-5, 0], [2, 4], [4, 5], [2, -5], [2, 3], [-5, 2], [4, 3], [1, -2], [2, -5], [-4, 4], [-1, -1],
              [5, 0], [5, 3], [-1, 1], [-5, 5], [3, -3], [-3, 2], [-1, -2], [4, -1], [4, -4], [0, 3], [0, -5],
              [-5, 0], [5, -4], [-4, -1], [-3, 0], [3, -5], [3, 0], [5, 4], [3, 5], [1, 1], [3, 5], [2, 4],
              [-4, 5], [-5, -4], [4, -3], [-5, 0], [0, 1], [-1, 1], [-1, 4], [5, 4], [3, -4], [-4, 1], [4, -5],
              [3, -3], [-4, 0], [-3, 3], [1, -1], [3, 2], [-3, 0], [-1, -1], [-4, -3], [-3, 1], [5, -3], [5, 4],
              [5, 4], [-5, 1], [-1, 0], [-3, -3], [5, 4], [2, 2], [0, 2], [-1, -4], [0, -2], [-5, -2], [5, -4],
              [-3, -3], [-3, 2], [-1, 3], [4, 0], [-2, -3], [4, -1], [-3, 2], [3, 1], [-2, -4], [-2, -5], [-4, 1],
              [-1, -4], [-2, -3], [0, 3], [-2, -1], [-4, 2], [4, 0], [-4, 3], [-2, -3], [3, -1], [1, 0], [1, 2],
              [2, 1], [3, 1], [4, -5], [2, 1], [-1, -1], [-2, -2], [-5, 5], [3, 0], [1, 4], [5, -4], [-5, -5],
              [4, -1], [-5, -1], [-3, 3], [-2, 1], [-3, 4], [-4, 0], [-1, -3], [2, 5], [-3, -5], [-1, 2], [-2, 4],
              [3, 4], [1, -3], [0, 4], [-1, 3], [0, 3], [0, 1], [2, -2], [-1, -2], [-2, -2], [-3, -5], [-5, 5],
              [-2, -1], [-1, -1], [1, 2], [-1, 1], [0, 0], [5, 0], [4, 2], [-2, -2], [5, -2], [-2, 5], [3, 2],
              [-2, -5], [-5, -3], [-2, 0], [-5, 1], [-4, 1], [3, 1], [4, -2], [-4, 5], [3, 4], [3, -4], [0, 5],
              [3, 1], [3, 0], [3, -5], [2, -1], [-2, -3], [2, -2], [-5, -5], [-3, 1], [0, -3], [-1, 0], [0, 0],
              [-1, -5], [-4, 2], [4, -2], [0, -2]
            ],
            150
          ],
          [
            0,
            0,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            2,
            2,
            2,
            2,
            2,
            2,
            2,
            2,
            2,
            2,
            2,
            2,
            2,
            2,
            2,
            4,
            4,
            4,
            4,
            4,
            4,
            4,
            ...Array(23).fill(5),
            8,
            8,
            8,
            8,
            8,
            8,
            8,
            8,
            8,
            8,
            8,
            8,
            9,
            9,
            9,
            9,
            9,
            9,
            9,
            9,
            9,
            9,
            9,
            9,
            9,
            ...Array(20).fill(10),
            ...Array(22).fill(13),
            16,
            16,
            16,
            16,
            16,
            16,
            16,
            16,
            17,
            17,
            17,
            17,
            17,
            17,
            17,
            17,
            17,
            17,
            17,
            17,
            17
          ]
        ],
        [[{ $rep: [3, 4], n: 10000 }, 5000], { $concat: [{ $rep: 25, n: 5000 }] }],
        [[{ $rep: [3, 4], n: 10000 }, 1], [25]],
        [[{ $rep: [-10000, 10000], n: 10000 }, 10000], { $concat: [{ $rep: 200000000, n: 10000 }] }],
        [
          [{ $concat: [{ $rep: [1, 1], n: 4000 }, { $rep: [2, 2], n: 4000 }, { $rep: [3, 3], n: 2000 }] }, 7000],
          { $concat: [{ $rep: 2, n: 4000 }, { $rep: 8, n: 3000 }] }
        ],
        [
          [{ $concat: [{ $rep: [3, 3], n: 2000 }, { $rep: [2, 2], n: 4000 }, { $rep: [1, 1], n: 4000 }] }, 4001],
          { $concat: [{ $rep: 2, n: 4000 }, { $rep: 8, n: 1 }] }
        ]
      ]
    },
        solution: {
      approach: `<p>Randomized quickselect with a 3-way partition keyed on squared distance. After it stops, positions 0..k−1 contain the k closest points (in arbitrary order).</p>`,
      code: `class Solution {
    private final Random rnd = new Random();

    public int[][] kClosest(int[][] points, int k) {
        int lo = 0, hi = points.length - 1, target = k - 1;
        while (lo < hi) {
            long pivot = dist(points[lo + rnd.nextInt(hi - lo + 1)]);
            int lt = lo, i = lo, gt = hi;
            while (i <= gt) {
                long d = dist(points[i]);
                if (d < pivot) swap(points, lt++, i++);
                else if (d > pivot) swap(points, i, gt--);
                else i++;
            }
            if (target < lt) hi = lt - 1;
            else if (target > gt) lo = gt + 1;
            else break;                          // boundary found
        }
        return Arrays.copyOfRange(points, 0, k);
    }

    private long dist(int[] p) { return (long) p[0] * p[0] + (long) p[1] * p[1]; }

    private void swap(int[][] a, int i, int j) { int[] t = a[i]; a[i] = a[j]; a[j] = t; }
}`,
      alt: [{ lang: 'python', code: `import heapq

class Solution:
    def k_closest(self, points, k):
        # Heap of the k smallest: O(N log k). Squared distance keeps everything in integers.
        return heapq.nsmallest(k, points, key=lambda p: p[0] * p[0] + p[1] * p[1])` }, { lang: 'js', code: `function kClosest(points, k) {
  const dist = (p) => p[0] * p[0] + p[1] * p[1];     // squared distance: no square root needed
  const target = k - 1;
  let lo = 0, hi = points.length - 1;
  while (lo < hi) {
    const pivot = dist(points[lo + Math.floor(Math.random() * (hi - lo + 1))]);
    let lt = lo, i = lo, gt = hi;                    // < pivot | == pivot | unknown | > pivot
    while (i <= gt) {
      const d = dist(points[i]);
      if (d < pivot) { [points[lt], points[i]] = [points[i], points[lt]]; lt++; i++; }
      else if (d > pivot) { [points[i], points[gt]] = [points[gt], points[i]]; gt--; }
      else i++;
    }
    if (target < lt) hi = lt - 1;
    else if (target > gt) lo = gt + 1;
    else break;                                      // boundary found
  }
  return points.slice(0, k);
}` }, { lang: 'cpp', code: `class Solution {
public:
    vector<vector<int>> kClosest(vector<vector<int>> points, int k) {
        auto dist = [](const vector<int>& p) { return (long long)p[0] * p[0] + (long long)p[1] * p[1]; };
        // nth_element is quickselect: the first k items end up the closest, in any order.
        nth_element(points.begin(), points.begin() + k, points.end(),
                    [&](const vector<int>& a, const vector<int>& b) { return dist(a) < dist(b); });
        points.resize(k);
        return points;
    }
};` }, { lang: 'csharp', code: `public class Solution {
    private readonly Random rnd = new Random();

    public int[][] KClosest(int[][] points, int k) {
        int lo = 0, hi = points.Length - 1, target = k - 1;
        while (lo < hi) {
            long pivot = Dist(points[lo + rnd.Next(hi - lo + 1)]);
            int lt = lo, i = lo, gt = hi;
            while (i <= gt) {
                long d = Dist(points[i]);
                if (d < pivot) Swap(points, lt++, i++);
                else if (d > pivot) Swap(points, i, gt--);
                else i++;
            }
            if (target < lt) hi = lt - 1;
            else if (target > gt) lo = gt + 1;
            else break;                          // boundary found
        }
        int[][] res = new int[k][];
        Array.Copy(points, res, k);
        return res;
    }

    private long Dist(int[] p) { return (long)p[0] * p[0] + (long)p[1] * p[1]; }

    private void Swap(int[][] a, int i, int j) { int[] t = a[i]; a[i] = a[j]; a[j] = t; }
}` }],
      dry: { head: ['round', 'range', 'pivot dist', 'partition (dists)', 'target 1 in…'], rows: [['1', '[0,2]', '26', '[18, 20 | 26 | ]', 'left → hi = 1'], ['2', '[0,1]', '18', '[ | 18 | 20]', 'right → lo = 1'], ['3', 'lo == hi', '—', '—', 'stop → first 2 points']] },
      complexity: `<p>Expected <b>O(N)</b> time, O(1) extra space (in place). Heap: O(N log k) time, O(k) space, works on streams.</p>`,
      followUps: ['Points arrive as a stream: keep a max-heap of size k.', 'Return them sorted by distance — sort only the k results: O(N + k log k).']
    }
  });

  practice.push({
    title: 'Online Stock Span', level: 'Medium', tags: ['monotonic stack', 'amortized analysis', 'design'], companies: ['Amazon', 'Goldman Sachs'],
    statement: `<p>Design <code>StockSpanner</code> with <code>next(price)</code>: return today's <b>span</b> — the number of consecutive days ending today (including today) whose price was ≤ today's price. (LeetCode 901.)</p>`,
    constraints: `1 ≤ price ≤ 10<sup>5</sup>, at most 10<sup>4</sup> calls (follow-up: 10<sup>6</sup>)`,
    example: `<p>prices 100, 80, 60, 70, 60, 75, 85 → spans ${H.c('g', '1, 1, 1, 2, 1, 4, 6')}. For 75: the run 60, 70, 60, 75 are all ≤ 75 → 4.</p>`,
    brute: {
      why: `<p>Store every price and, for each new one, walk backwards until a larger price appears: <b>O(N)</b> per call, O(N<sup>2</sup>) for a rising sequence (10<sup>12</sup> steps for 10<sup>6</sup> calls). The waste: we re-scan days that an earlier, bigger price already "covered".</p>`,
      code: { lang: 'java', code: `class StockSpanner {
    private final List<Integer> prices = new ArrayList<>();

    public int next(int price) {
        prices.add(price);
        int span = 0;
        for (int i = prices.size() - 1; i >= 0 && prices.get(i) <= price; i--) span++;  // O(N)
        return span;
    }
}`, alt: [{ lang: 'python', code: String.raw`
class StockSpanner:
    def __init__(self):
        self.prices = []

    def next(self, price):
        self.prices.append(price)
        span = 0
        i = len(self.prices) - 1
        while i >= 0 and self.prices[i] <= price:     # O(N)
            span += 1
            i -= 1
        return span` }, { lang: 'js', code: String.raw`
class StockSpanner {
  constructor() {
    this.prices = [];
  }

  next(price) {
    this.prices.push(price);
    let span = 0;
    for (let i = this.prices.length - 1; i >= 0 && this.prices[i] <= price; i--) span++;   // O(N)
    return span;
  }
}` }, { lang: 'cpp', code: String.raw`
class StockSpanner {
    vector<int> prices;

public:
    int next(int price) {
        prices.push_back(price);
        int span = 0;
        for (int i = (int)prices.size() - 1; i >= 0 && prices[i] <= price; i--) span++;   // O(N)
        return span;
    }
};` }, { lang: 'csharp', code: `public class StockSpanner {
    private readonly List<int> prices = new List<int>();

    public int Next(int price) {
        prices.Add(price);
        int span = 0;
        for (int i = prices.Count - 1; i >= 0 && prices[i] <= price; i--) span++;  // O(N)
        return span;
    }
}` }] }
    },
    mcq: { q: 'The inner while pops many entries for a single call. Why is the total still O(N) over N calls?', options: ['Because prices are bounded by 10<sup>5</sup>', 'Each day is pushed once and popped at most once', 'Because the stack is sorted', 'It is not; it is O(N log N)'], answer: 1, explain: 'Aggregate method: total pops ≤ total pushes = N, so all calls together do O(N) work → amortized O(1) per call.' },
    hints: [
      `<p>Hint 1: Once a price p is beaten by a later higher price q, p can never be the "blocker" for future days — q blocks first.</p>`,
      `<p>Hint 2: Keep a stack of (price, span) with strictly decreasing prices. A new price absorbs (pops) all entries with price ≤ it, adding their spans.</p>`,
      `<p>Hint 3: span = 1 + sum of popped spans; push (price, span). Each entry is pushed once and popped once → amortized O(1).</p>`
    ],
    tests: {
      cls: 'StockSpanner',
      sigs: { StockSpanner: '', next: 'int -> int' },
      cases: [
        {
          ops: ['StockSpanner', 'next', 'next', 'next', 'next', 'next', 'next', 'next'],
          args: [[], [100], [80], [60], [70], [60], [75], [85]],
          out: [null, 1, 1, 1, 2, 1, 4, 6]
        },
        { ops: ['StockSpanner', 'next'], args: [[], [5]], out: [null, 1] },
        {
          ops: ['StockSpanner', ...Array(50).fill('next')],
          args: [
            [], [1], [2], [3], [4], [5], [6], [7], [8], [9], [10], [11], [12], [13], [14], [15], [16], [17],
            [18], [19], [20], [21], [22], [23], [24], [25], [26], [27], [28], [29], [30], [31], [32], [33], [34],
            [35], [36], [37], [38], [39], [40], [41], [42], [43], [44], [45], [46], [47], [48], [49], [50]
          ],
          out: [
            null, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26,
            27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50
          ]
        },
        {
          ops: ['StockSpanner', ...Array(50).fill('next')],
          args: [
            [], [50], [49], [48], [47], [46], [45], [44], [43], [42], [41], [40], [39], [38], [37], [36], [35],
            [34], [33], [32], [31], [30], [29], [28], [27], [26], [25], [24], [23], [22], [21], [20], [19], [18],
            [17], [16], [15], [14], [13], [12], [11], [10], [9], [8], [7], [6], [5], [4], [3], [2], [1]
          ],
          out: [null, ...Array(50).fill(1)]
        },
        {
          ops: ['StockSpanner', ...Array(40).fill('next')],
          args: [[], ...Array(40).fill([7])],
          out: [
            null, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26,
            27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40
          ]
        },
        {
          ops: ['StockSpanner', 'next', 'next', 'next', 'next', 'next', 'next', 'next', 'next'],
          args: [[], [100000], [1], [100000], [1], [1], [99999], [100000], [100000]],
          out: [null, 1, 1, 3, 1, 2, 3, 7, 8]
        },
        {
          ops: [
            'StockSpanner', 'next', 'next', 'next', 'next', 'next', 'next', 'next', 'next', 'next', 'next',
            'next', 'next', 'next', 'next', 'next'
          ],
          args: [[], [3], [1], [4], [1], [5], [9], [2], [6], [5], [3], [5], [8], [9], [7], [9]],
          out: [null, 1, 1, 3, 1, 5, 6, 1, 2, 1, 1, 3, 6, 13, 1, 15]
        },
        {
          ops: ['StockSpanner', ...Array(250).fill('next')],
          args: [
            [], [7], [5], [2], [10], [3], [7], [8], [5], [6], [8], [7], [7], [8], [10], [10], [2], [9], [2], [5],
            [7], [2], [6], [10], [2], [1], [7], [9], [8], [9], [5], [5], [7], [7], [10], [3], [1], [6], [10],
            [1], [5], [4], [2], [7], [6], [2], [9], [10], [6], [7], [5], [10], [6], [8], [1], [6], [8], [6], [1],
            [7], [2], [10], [4], [1], [7], [1], [9], [8], [3], [7], [9], [3], [6], [2], [4], [1], [1], [2], [5],
            [10], [5], [1], [6], [8], [6], [8], [3], [10], [10], [9], [6], [10], [5], [10], [9], [6], [5], [10],
            [1], [4], [7], [4], [1], [4], [9], [7], [9], [8], [1], [5], [2], [6], [10], [1], [7], [3], [4], [1],
            [8], [6], [9], [7], [5], [7], [5], [8], [10], [6], [7], [2], [8], [10], [10], [3], [8], [5], [3],
            [6], [6], [1], [6], [8], [4], [9], [9], [1], [1], [7], [9], [8], [3], [7], [7], [6], [7], [3], [10],
            [3], [10], [4], [5], [5], [10], [6], [7], [1], [9], [10], [9], [6], [5], [5], [1], [5], [3], [9],
            [8], [9], [7], [2], [8], [7], [6], [5], [6], [7], [8], [10], [1], [7], [10], [7], [7], [10], [2],
            [3], [1], [9], [3], [1], [8], [5], [9], [7], [10], [6], [8], [10], [2], [3], [1], [7], [9], [1], [5],
            [4], [10], [2], [6], [3], [1], [9], [10], [7], [9], [1], [7], [2], [5], [10], [8], [10], [9], [8],
            [1], [7], [1], [4], [4], [1], [10], [1], [2], [5], [7], [6], [2], [7], [2], [10], [8]
          ],
          out: [
            null, 1, 1, 1, 4, 1, 2, 3, 1, 2, 6, 1, 2, 9, 14, 15, 1, 2, 1, 2, 3, 1, 2, 23, 1, 1, 3, 4, 1, 6, 1, 2,
            3, 4, 34, 1, 1, 3, 38, 1, 2, 1, 1, 5, 1, 1, 8, 47, 1, 2, 1, 51, 1, 2, 1, 2, 5, 1, 1, 3, 1, 61, 1, 1,
            3, 1, 5, 1, 1, 2, 9, 1, 2, 1, 2, 1, 2, 3, 6, 79, 1, 1, 3, 4, 1, 6, 1, 87, 88, 1, 1, 91, 1, 93, 1, 1,
            1, 97, 1, 2, 3, 1, 1, 3, 7, 1, 9, 1, 1, 2, 1, 4, 112, 1, 2, 1, 2, 1, 6, 1, 8, 1, 1, 3, 1, 5, 126, 1,
            2, 1, 4, 131, 132, 1, 2, 1, 1, 3, 4, 1, 6, 9, 1, 11, 12, 1, 2, 3, 16, 1, 1, 2, 3, 1, 5, 1, 156, 1,
            158, 1, 2, 3, 162, 1, 2, 1, 4, 167, 1, 1, 1, 2, 1, 4, 1, 8, 1, 10, 1, 1, 3, 1, 1, 1, 3, 5, 9, 187, 1,
            2, 190, 1, 2, 193, 1, 2, 1, 4, 1, 1, 3, 1, 9, 1, 204, 1, 2, 207, 1, 2, 1, 4, 5, 1, 2, 1, 216, 1, 2,
            1, 1, 5, 222, 1, 2, 1, 2, 1, 2, 229, 1, 231, 1, 1, 1, 2, 1, 2, 3, 1, 240, 1, 2, 3, 4, 1, 1, 7, 1,
            249, 1
          ]
        },
        {
          ops: ['StockSpanner', ...Array(250).fill('next')],
          args: [
            [], [58287], [4506], [33684], [72216], [72133], [14887], [69030], [8594], [56731], [10835], [65684],
            [41632], [37312], [67566], [32787], [48454], [10764], [35231], [4829], [10180], [18583], [98313],
            [1017], [80495], [84767], [35408], [69995], [27921], [41839], [27929], [13127], [81730], [66783],
            [90827], [11482], [3081], [48973], [22023], [11806], [44902], [26480], [46377], [49048], [98781],
            [80846], [86032], [33436], [31735], [17119], [94400], [84110], [44356], [99903], [79658], [99592],
            [51581], [35353], [85923], [68395], [53167], [7399], [26178], [39971], [91486], [86343], [95338],
            [80027], [7284], [898], [14869], [26428], [30030], [57753], [36513], [64533], [81982], [12934],
            [1500], [70150], [95313], [10685], [14516], [29212], [80766], [68937], [30824], [46743], [52854],
            [57829], [42955], [31492], [10465], [16104], [54001], [72735], [7914], [30100], [49868], [69050],
            [42875], [78721], [30774], [44498], [94627], [68219], [66408], [68203], [30426], [77049], [60583],
            [53941], [10863], [72813], [96006], [60052], [80955], [14644], [60439], [35247], [32204], [86174],
            [35998], [40976], [32907], [36483], [50226], [77319], [17814], [2526], [42901], [15824], [70188],
            [42283], [79882], [85528], [79043], [64252], [51006], [45052], [66712], [14651], [86874], [64314],
            [50726], [39273], [75400], [43050], [25074], [11976], [75607], [86977], [8222], [81804], [74290],
            [91504], [70761], [18788], [30894], [35105], [8769], [17674], [29669], [78574], [55176], [728],
            [2061], [13752], [26535], [60878], [75890], [53116], [87576], [34811], [50608], [48075], [96963],
            [84241], [13896], [35040], [53148], [45443], [68590], [22114], [9627], [42528], [21399], [71631],
            [67195], [51817], [81878], [8430], [94500], [12448], [73464], [10544], [67441], [45270], [32030],
            [24720], [71050], [39731], [90739], [90422], [68109], [64413], [22411], [17276], [73090], [59570],
            [70106], [56074], [71023], [16952], [16858], [59716], [89869], [52900], [54270], [86757], [30645],
            [38146], [31443], [21417], [16971], [34584], [16200], [62596], [53185], [21048], [26247], [76561],
            [90145], [10750], [65248], [78965], [24775], [57320], [28949], [80478], [70935], [44590], [61551],
            [26007], [58680], [56149], [28794], [19037], [8122], [76975], [65951]
          ],
          out: [
            null, 1, 1, 2, 4, 1, 1, 2, 1, 2, 1, 4, 1, 1, 7, 1, 2, 1, 2, 1, 2, 3, 22, 1, 2, 3, 1, 2, 1, 2, 1, 1,
            7, 1, 12, 1, 1, 3, 1, 1, 3, 1, 5, 9, 44, 1, 2, 1, 1, 1, 6, 1, 1, 53, 1, 2, 1, 1, 3, 1, 1, 1, 2, 3, 9,
            1, 11, 1, 1, 1, 3, 4, 5, 6, 1, 8, 10, 1, 1, 3, 14, 1, 2, 3, 4, 1, 1, 2, 3, 4, 1, 1, 1, 2, 5, 11, 1,
            2, 3, 4, 1, 17, 1, 2, 24, 1, 1, 2, 1, 5, 1, 1, 1, 4, 59, 1, 2, 1, 2, 1, 1, 7, 1, 2, 1, 2, 5, 6, 1, 1,
            3, 1, 5, 1, 13, 14, 1, 1, 1, 1, 4, 1, 28, 1, 1, 1, 4, 1, 1, 1, 8, 37, 1, 2, 1, 41, 1, 1, 2, 3, 1, 2,
            3, 8, 1, 1, 2, 3, 4, 6, 7, 1, 17, 1, 2, 1, 121, 1, 1, 2, 3, 1, 5, 1, 1, 3, 1, 10, 1, 1, 13, 1, 16, 1,
            2, 1, 2, 1, 1, 1, 6, 1, 10, 1, 1, 1, 1, 1, 5, 1, 2, 1, 4, 1, 1, 3, 13, 1, 2, 3, 1, 2, 1, 1, 1, 4, 1,
            8, 1, 1, 2, 12, 29, 1, 2, 3, 1, 2, 1, 7, 1, 1, 2, 1, 2, 1, 1, 1, 1, 10, 1
          ]
        }
      ]
    },
        solution: {
      approach: `<p>Monotonic stack that compresses runs: each stack entry stands for a block of consecutive days already known to be ≤ its price. Amortized O(1) by the push-once/pop-once argument.</p>`,
      code: `class StockSpanner {
    private final Deque<int[]> st = new ArrayDeque<>();   // {price, span}, prices strictly decreasing

    public int next(int price) {
        int span = 1;
        while (!st.isEmpty() && st.peek()[0] <= price)
            span += st.pop()[1];                          // absorb the smaller block
        st.push(new int[]{price, span});
        return span;
    }
}`,
      alt: [{ lang: 'python', code: `class StockSpanner:
    def __init__(self):
        self.st = []                          # (price, span), prices strictly decreasing

    def next(self, price):
        span = 1
        while self.st and self.st[-1][0] <= price:
            span += self.st.pop()[1]          # absorb the smaller block
        self.st.append((price, span))
        return span` }, { lang: 'js', code: `class StockSpanner {
  constructor() {
    this.st = [];                             // [price, span], prices strictly decreasing
  }
  next(price) {
    let span = 1;
    while (this.st.length > 0 && this.st[this.st.length - 1][0] <= price) {
      span += this.st.pop()[1];               // absorb the smaller block
    }
    this.st.push([price, span]);
    return span;
  }
}` }, { lang: 'cpp', code: `class StockSpanner {
    vector<pair<int, int>> st;                // {price, span}, prices strictly decreasing
public:
    StockSpanner() {}
    int next(int price) {
        int span = 1;
        while (!st.empty() && st.back().first <= price) {
            span += st.back().second;         // absorb the smaller block
            st.pop_back();
        }
        st.push_back({price, span});
        return span;
    }
};` }, { lang: 'csharp', code: `public class StockSpanner {
    private readonly Stack<(int price, int span)> st = new Stack<(int price, int span)>();   // prices strictly decreasing

    public int Next(int price) {
        int span = 1;
        while (st.Count > 0 && st.Peek().price <= price)
            span += st.Pop().span;                        // absorb the smaller block
        st.Push((price, span));
        return span;
    }
}` }],
      dry: { head: ['price', 'popped', 'span', 'stack after (price:span)'], rows: [['100', '—', '1', '100:1'], ['80', '—', '1', '100:1, 80:1'], ['60', '—', '1', '…, 80:1, 60:1'], ['70', '60:1', '2', '…, 80:1, 70:2'], ['60', '—', '1', '…, 70:2, 60:1'], ['75', '60:1, 70:2', '4', '100:1, 80:1, 75:4'], ['85', '75:4, 80:1', '6', '100:1, 85:6']] },
      complexity: `<p><b>Amortized O(1)</b> per call (worst single call O(N)); space O(N).</p>`,
      followUps: ['Daily Temperatures (next greater to the right) — same stack, offline.', 'Return the span for an arbitrary past day in O(log N).']
    }
  });

  practice.push({
    title: 'Generate Random Point in a Circle', level: 'Medium', tags: ['randomized', 'rejection sampling', 'geometry'], companies: ['Google', 'Meta'],
    statement: `<p>Given the radius and centre of a circle, implement <code>randPoint()</code> which returns a <b>uniformly random</b> point inside the circle (the boundary counts as inside). (LeetCode 478.)</p>`,
    constraints: `0 &lt; radius ≤ 10<sup>8</sup>, −10<sup>7</sup> ≤ centre coordinates ≤ 10<sup>7</sup>, at most 3·10<sup>4</sup> calls`,
    example: `<p>radius 1, centre (0,0): returns points like ${H.c('b', '[−0.02, −0.73]')}, ${H.c('b', '[0.67, 0.22]')} — every equal-area region of the disc equally likely.</p>`,
    brute: {
      why: `<p>"Random angle θ in [0, 2π), random radius ρ uniform in [0, r]" looks natural but is <b>biased toward the centre</b>: a ring at small ρ has little area but receives as many points as an outer ring of the same width. Half the points land within r/2, which covers only a quarter of the area.</p>`,
      code: { lang: 'java', code: `class Solution {
    private final double r, cx, cy;
    private final Random rnd = new Random();
    public Solution(double radius, double x, double y) { r = radius; cx = x; cy = y; }

    public double[] randPoint() {               // BIASED: radius should be r * sqrt(u)
        double theta = rnd.nextDouble() * 2 * Math.PI;
        double rho = rnd.nextDouble() * r;
        return new double[]{cx + rho * Math.cos(theta), cy + rho * Math.sin(theta)};
    }
}`, alt: [{ lang: 'python', code: String.raw`
import math
import random

class Solution:
    def __init__(self, radius, x_center, y_center):
        self.r, self.cx, self.cy = radius, x_center, y_center

    def randPoint(self):                              # BIASED: radius should be r * sqrt(u)
        theta = random.random() * 2 * math.pi
        rho = random.random() * self.r
        return [self.cx + rho * math.cos(theta), self.cy + rho * math.sin(theta)]` }, { lang: 'js', code: String.raw`
class Solution {
  constructor(radius, xCenter, yCenter) {
    this.r = radius; this.cx = xCenter; this.cy = yCenter;
  }

  randPoint() {                                       // BIASED: radius should be r * sqrt(u)
    const theta = Math.random() * 2 * Math.PI;
    const rho = Math.random() * this.r;
    return [this.cx + rho * Math.cos(theta), this.cy + rho * Math.sin(theta)];
  }
}` }, { lang: 'cpp', code: String.raw`
class Solution {
    double r, cx, cy;
    mt19937 rnd{random_device{}()};
    uniform_real_distribution<double> unit{0.0, 1.0};

public:
    Solution(double radius, double xCenter, double yCenter) : r(radius), cx(xCenter), cy(yCenter) {}

    vector<double> randPoint() {                      // BIASED: radius should be r * sqrt(u)
        double theta = unit(rnd) * 2 * M_PI;
        double rho = unit(rnd) * r;
        return {cx + rho * cos(theta), cy + rho * sin(theta)};
    }
};` }, { lang: 'csharp', code: `public class Solution {
    private readonly double r, cx, cy;
    private readonly Random rnd = new Random();
    public Solution(double radius, double x, double y) { r = radius; cx = x; cy = y; }

    public double[] RandPoint() {               // BIASED: radius should be r * sqrt(u)
        double theta = rnd.NextDouble() * 2 * Math.PI;
        double rho = rnd.NextDouble() * r;
        return new[] { cx + rho * Math.Cos(theta), cy + rho * Math.Sin(theta) };
    }
}` }] }
    },
    mcq: { q: 'To sample uniformly by angle and radius, the radius should be…', options: ['r · u', 'r · u²', 'r · √u', 'r · log(u)'], answer: 2, explain: 'The area within radius ρ grows like ρ². For a uniform point, P(radius ≤ ρ) = (ρ/r)², so ρ = r·√u inverts that CDF.' },
    hints: [
      `<p>Hint 1: Easiest exact method: rejection sampling — pick a uniform point in the bounding square, retry if it falls outside the circle (accept rate π/4 ≈ 78.5%).</p>`,
      `<p>Hint 2: Polar method: uniform angle, but the radius must follow P(R ≤ ρ) = ρ²/r² because area grows with ρ².</p>`,
      `<p>Hint 3: Inverse CDF: ρ = r·√u with u uniform in [0, 1]. Then x = cx + ρ cos θ, y = cy + ρ sin θ.</p>`
    ],
    tests: {
      sig: 'double double double int -> list<int>',
      fn: 'sampleCircle',
      check: `(args, out, exp) => {
  // no point outside the disc; P(dist <= r/2) = 1/4, P(dist <= r/sqrt2) = 1/2, each quadrant 1/4
  const trials = args[3];
  const ok = (cnt, p) => Math.abs(cnt - trials * p) <= 6 * Math.sqrt(trials * p * (1 - p)) + 3;
  return out.length === 7 && out[0] === 0 && ok(out[1], 0.25) && ok(out[2], 0.5) &&
         out.slice(3).every((k) => ok(k, 0.25));
}`,
      harness: {
        java: `class Check {
    static List<Integer> sampleCircle(double r, double cx, double cy, int trials) {
        Solution s = new Solution(r, cx, cy);
        int[] c = new int[7];                  // outside, within r/2, within r/sqrt2, four quadrants
        for (int t = 0; t < trials; t++) {
            double[] p = s.randPoint();
            double dx = p[0] - cx, dy = p[1] - cy, d = Math.hypot(dx, dy);
            if (!(d <= r * (1 + 1e-9) + 1e-9)) c[0]++;
            if (d <= r / 2) c[1]++;
            if (d <= r / Math.sqrt(2)) c[2]++;
            c[3 + (dx >= 0 ? 0 : 1) + (dy >= 0 ? 0 : 2)]++;
        }
        List<Integer> res = new ArrayList<>();
        for (int v : c) res.add(v);
        return res;
    }
}`,
        python: `def sample_circle(r, cx, cy, trials):
    import math
    s = Solution(r, cx, cy)
    c = [0] * 7                                  # outside, within r/2, within r/sqrt2, four quadrants
    for _ in range(trials):
        x, y = s.randPoint()
        dx, dy = x - cx, y - cy
        d = math.hypot(dx, dy)
        if not d <= r * (1 + 1e-9) + 1e-9:
            c[0] += 1
        if d <= r / 2:
            c[1] += 1
        if d <= r / math.sqrt(2):
            c[2] += 1
        c[3 + (0 if dx >= 0 else 1) + (0 if dy >= 0 else 2)] += 1
    return c`,
        js: `function sampleCircle(r, cx, cy, trials) {
  const s = new Solution(r, cx, cy);
  const c = new Array(7).fill(0);              // outside, within r/2, within r/sqrt2, four quadrants
  for (let t = 0; t < trials; t++) {
    const [x, y] = s.randPoint();
    const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy);
    if (!(d <= r * (1 + 1e-9) + 1e-9)) c[0]++;
    if (d <= r / 2) c[1]++;
    if (d <= r / Math.SQRT2) c[2]++;
    c[3 + (dx >= 0 ? 0 : 1) + (dy >= 0 ? 0 : 2)]++;
  }
  return c;
}`,
        cpp: `vector<int> sampleCircle(double r, double cx, double cy, int trials) {
    Solution s(r, cx, cy);
    vector<int> c(7, 0);                       // outside, within r/2, within r/sqrt2, four quadrants
    for (int t = 0; t < trials; t++) {
        vector<double> p = s.randPoint();
        double dx = p[0] - cx, dy = p[1] - cy, d = hypot(dx, dy);
        if (!(d <= r * (1 + 1e-9) + 1e-9)) c[0]++;
        if (d <= r / 2) c[1]++;
        if (d <= r / sqrt(2.0)) c[2]++;
        c[3 + (dx >= 0 ? 0 : 1) + (dy >= 0 ? 0 : 2)]++;
    }
    return c;
}`, csharp: `public class Check {
    public static List<int> SampleCircle(double r, double cx, double cy, int trials) {
        var s = new Solution(r, cx, cy);
        int[] c = new int[7];                  // outside, within r/2, within r/sqrt2, four quadrants
        for (int t = 0; t < trials; t++) {
            double[] p = s.RandPoint();
            double dx = p[0] - cx, dy = p[1] - cy, d = Math.Sqrt(dx * dx + dy * dy);
            if (!(d <= r * (1 + 1e-9) + 1e-9)) c[0]++;
            if (d <= r / 2) c[1]++;
            if (d <= r / Math.Sqrt(2)) c[2]++;
            c[3 + (dx >= 0 ? 0 : 1) + (dy >= 0 ? 0 : 2)]++;
        }
        return new List<int>(c);
    }
}`
      },
      cases: [
        [[1, 0, 0, 100000], [0]],
        [[5, -3, 7, 80000], [0]],
        [[100000000, 10000000, -10000000, 80000], [0]],
        [[0.001, 0, 0, 60000], [0]],
        [[2.5, 0.5, -0.5, 60000], [0]],
        [[1, -10000000, 10000000, 60000], [0]]
      ]
    },
        solution: {
      approach: `<p>Either rejection sampling (expected 4/π ≈ 1.27 tries, a Las Vegas algorithm) or the inverse-CDF polar method with √u. Both are exactly uniform; the polar method uses a fixed two random numbers per call.</p>`,
      code: `class Solution {
    private final double r, cx, cy;
    private final Random rnd = new Random();

    public Solution(double radius, double xCenter, double yCenter) {
        r = radius; cx = xCenter; cy = yCenter;
    }

    public double[] randPoint() {
        double theta = rnd.nextDouble() * 2 * Math.PI;
        double rho = r * Math.sqrt(rnd.nextDouble());       // sqrt corrects the area density
        return new double[]{cx + rho * Math.cos(theta), cy + rho * Math.sin(theta)};
    }

    // Alternative: rejection sampling, also exactly uniform.
    public double[] randPointRejection() {
        while (true) {
            double x = (rnd.nextDouble() * 2 - 1) * r, y = (rnd.nextDouble() * 2 - 1) * r;
            if (x * x + y * y <= r * r) return new double[]{cx + x, cy + y};
        }
    }
}`,
      alt: [{ lang: 'python', code: `import math
import random

class Solution:
    def __init__(self, radius, x_center, y_center):
        self.r, self.cx, self.cy = radius, x_center, y_center

    def randPoint(self):
        theta = random.uniform(0, 2 * math.pi)
        rho = self.r * math.sqrt(random.random())       # sqrt corrects the area density
        return [self.cx + rho * math.cos(theta), self.cy + rho * math.sin(theta)]

    def rand_point_rejection(self):
        # Alternative: rejection sampling, also exactly uniform.
        while True:
            x, y = random.uniform(-self.r, self.r), random.uniform(-self.r, self.r)
            if x * x + y * y <= self.r * self.r:
                return [self.cx + x, self.cy + y]` }, { lang: 'js', code: `class Solution {
  constructor(radius, xCenter, yCenter) {
    this.r = radius; this.cx = xCenter; this.cy = yCenter;
  }
  randPoint() {
    const theta = Math.random() * 2 * Math.PI;
    const rho = this.r * Math.sqrt(Math.random());     // sqrt corrects the area density
    return [this.cx + rho * Math.cos(theta), this.cy + rho * Math.sin(theta)];
  }
  // Alternative: rejection sampling, also exactly uniform.
  randPointRejection() {
    while (true) {
      const x = (Math.random() * 2 - 1) * this.r, y = (Math.random() * 2 - 1) * this.r;
      if (x * x + y * y <= this.r * this.r) return [this.cx + x, this.cy + y];
    }
  }
}` }, { lang: 'cpp', code: `class Solution {
    double r, cx, cy;
    mt19937 rng{random_device{}()};
    uniform_real_distribution<double> unit{0.0, 1.0};
public:
    Solution(double radius, double xCenter, double yCenter) : r(radius), cx(xCenter), cy(yCenter) {}
    vector<double> randPoint() {
        double theta = unit(rng) * 2 * acos(-1.0);
        double rho = r * sqrt(unit(rng));                  // sqrt corrects the area density
        return {cx + rho * cos(theta), cy + rho * sin(theta)};
    }
    // Alternative: rejection sampling, also exactly uniform.
    vector<double> randPointRejection() {
        while (true) {
            double x = (unit(rng) * 2 - 1) * r, y = (unit(rng) * 2 - 1) * r;
            if (x * x + y * y <= r * r) return {cx + x, cy + y};
        }
    }
};` }, { lang: 'csharp', code: `public class Solution {
    private readonly double r, cx, cy;
    private readonly Random rnd = new Random();

    public Solution(double radius, double xCenter, double yCenter) {
        r = radius; cx = xCenter; cy = yCenter;
    }

    public double[] RandPoint() {
        double theta = rnd.NextDouble() * 2 * Math.PI;
        double rho = r * Math.Sqrt(rnd.NextDouble());       // sqrt corrects the area density
        return new[] { cx + rho * Math.Cos(theta), cy + rho * Math.Sin(theta) };
    }

    // Alternative: rejection sampling, also exactly uniform.
    public double[] RandPointRejection() {
        while (true) {
            double x = (rnd.NextDouble() * 2 - 1) * r, y = (rnd.NextDouble() * 2 - 1) * r;
            if (x * x + y * y <= r * r) return new[] { cx + x, cy + y };
        }
    }
}` }],
      dry: { head: ['u', 'naive ρ = r·u', 'correct ρ = r·√u', 'fraction of area inside ρ'], rows: [['0.25', '0.25r', '0.5r', '25%'], ['0.5', '0.5r', '0.707r', '50%'], ['0.81', '0.81r', '0.9r', '81%']] },
      complexity: `<p>O(1) per call (rejection: expected O(1), about 1.27 iterations).</p>`,
      followUps: ['Uniform point on the circle boundary only.', 'Uniform point in non-overlapping rectangles (LeetCode 497): weight by integer point count + binary search.', 'Uniform point inside a triangle (reflect when u + v &gt; 1).']
    }
  });

  // =====================================================================
  // PRACTICE — Hard
  // =====================================================================
  practice.push({
    title: 'Max Points on a Line', level: 'Hard', tags: ['geometry', 'hashing', 'gcd'], companies: ['Google', 'Apple', 'LinkedIn', 'Twitter'],
    statement: `<p>Given an array of <b>distinct</b> points <code>points[i] = [x, y]</code>, return the maximum number of points that lie on the same straight line. (LeetCode 149.)</p>`,
    constraints: `1 ≤ N ≤ 300 (follow-up: 3000), −10<sup>4</sup> ≤ x, y ≤ 10<sup>4</sup>, all points distinct`,
    example: `<p><code>[[1,1],[2,2],[3,3]]</code> → ${H.c('g', '3')}.</p><p><code>[[1,1],[3,2],[5,3],[4,1],[2,3],[1,4]]</code> → ${H.c('g', '4')}: (1,4), (2,3), (3,2), (4,1) lie on x + y = 5.</p>`,
    brute: {
      why: `<p>For every pair (i, j) count all points k with cross(P<sub>i</sub>, P<sub>j</sub>, P<sub>k</sub>) = 0: <b>O(N<sup>3</sup>)</b>. That is 2.7·10<sup>7</sup> for N = 300 (passes) but 2.7·10<sup>10</sup> for N = 3000. The waste: every line through i is rediscovered once per pair on it, and points are re-tested for each.</p>`,
      code: { lang: 'java', code: `class Solution {
    public int maxPoints(int[][] p) {
        int n = p.length;
        if (n <= 2) return n;
        int best = 2;
        for (int i = 0; i < n; i++)
            for (int j = i + 1; j < n; j++) {
                int cnt = 2;
                for (int k = 0; k < n; k++) {
                    if (k == i || k == j) continue;
                    long c = (long) (p[j][0] - p[i][0]) * (p[k][1] - p[i][1])
                           - (long) (p[j][1] - p[i][1]) * (p[k][0] - p[i][0]);
                    if (c == 0) cnt++;
                }
                best = Math.max(best, cnt);
            }
        return best;
    }
}`, alt: [{ lang: 'python', code: String.raw`
class Solution:
    def max_points(self, points):
        p = points
        n = len(p)
        if n <= 2:
            return n
        best = 2
        for i in range(n):
            for j in range(i + 1, n):
                cnt = 2
                for k in range(n):
                    if k == i or k == j:
                        continue
                    c = (p[j][0] - p[i][0]) * (p[k][1] - p[i][1]) \
                        - (p[j][1] - p[i][1]) * (p[k][0] - p[i][0])
                    if c == 0:
                        cnt += 1
                best = max(best, cnt)
        return best` }, { lang: 'js', code: String.raw`
function maxPoints(p) {
  const n = p.length;
  if (n <= 2) return n;
  let best = 2;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      let cnt = 2;
      for (let k = 0; k < n; k++) {
        if (k === i || k === j) continue;
        const c = (p[j][0] - p[i][0]) * (p[k][1] - p[i][1])
                - (p[j][1] - p[i][1]) * (p[k][0] - p[i][0]);
        if (c === 0) cnt++;
      }
      best = Math.max(best, cnt);
    }
  return best;
}` }, { lang: 'cpp', code: String.raw`
class Solution {
public:
    int maxPoints(const vector<vector<int>>& p) {
        int n = p.size();
        if (n <= 2) return n;
        int best = 2;
        for (int i = 0; i < n; i++)
            for (int j = i + 1; j < n; j++) {
                int cnt = 2;
                for (int k = 0; k < n; k++) {
                    if (k == i || k == j) continue;
                    long long c = (long long)(p[j][0] - p[i][0]) * (p[k][1] - p[i][1])
                                - (long long)(p[j][1] - p[i][1]) * (p[k][0] - p[i][0]);
                    if (c == 0) cnt++;
                }
                best = max(best, cnt);
            }
        return best;
    }
};` }, { lang: 'csharp', code: `public class Solution {
    public int MaxPoints(int[][] p) {
        int n = p.Length;
        if (n <= 2) return n;
        int best = 2;
        for (int i = 0; i < n; i++)
            for (int j = i + 1; j < n; j++) {
                int cnt = 2;
                for (int k = 0; k < n; k++) {
                    if (k == i || k == j) continue;
                    long c = (long)(p[j][0] - p[i][0]) * (p[k][1] - p[i][1])
                           - (long)(p[j][1] - p[i][1]) * (p[k][0] - p[i][0]);
                    if (c == 0) cnt++;
                }
                best = Math.Max(best, cnt);
            }
        return best;
    }
}` }] }
    },
    mcq: { q: 'Directions (2, 4) and (−1, −2) from the same anchor should count as the same line. Which key handles that exactly?', options: ['the double dy/dx', 'the pair (dx/g, dy/g) with g = gcd(|dx|,|dy|) and a fixed sign rule', 'the string dx + "/" + dy', 'atan2(dy, dx) rounded to 6 decimals'], answer: 1, explain: 'Dividing by the gcd gives (1, 2) and (−1, −2); forcing dx &gt; 0 (or dx = 0, dy &gt; 0) maps both to (1, 2). Exact, no floating point, no division by zero for vertical lines.' },
    hints: [
      `<p>Hint 1: Fix an anchor point A. Every other point B defines a direction from A; points on the same line through A share the direction.</p>`,
      `<p>Hint 2: Represent a direction exactly: reduce (dx, dy) by their gcd and normalise the sign so that opposite vectors match. Count directions in a hash map (<code>HashMap</code> / <code>dict</code> / <code>Map</code> / <code>unordered_map</code>).</p>`,
      `<p>Hint 3: Answer = max over anchors of (largest count + 1). Only pair each anchor with later points (j &gt; i): a line's best anchor is its first point. N = 1 → 1.</p>`
    ],
    tests: {
      sig: 'int[][] -> int',
      fn: 'maxPoints',
      cases: [
        [[[[1, 1], [2, 2], [3, 3]]], 3],
        [[[[1, 1], [3, 2], [5, 3], [4, 1], [2, 3], [1, 4]]], 4],
        [[[[7, 7]]], 1],
        [[[[0, 0], [5, 9]]], 2],
        [[[[3, 0], [3, 1], [3, 2], [3, 5], [4, 4]]], 4],
        [[[[0, 2], [1, 2], [7, 2], [-4, 2], [0, 3]]], 4],
        [[[[0, 0], [1, 1], [2, 2], [0, 1], [0, 2], [0, 3]]], 4],
        [[[[0, 0], [1, 2], [2, 4], [3, 6], [1, 0], [2, 1], [3, 2]]], 4],
        [[[[-10000, -10000], [10000, 10000], [0, 0], [-10000, 10000], [10000, -10000]]], 3],
        [[[[-10000, -9999], [10000, 9999], [0, 0], [5000, 4999]]], 3],
        [[[[0, 0], [1, 1], [1, -1], [-1, 1], [-1, -1], [0, 1], [1, 0], [2, 2]]], 4],
        [[[[0, 0], [1, 0], [2, 0], [3, 0], [4, 1], [5, 2], [6, 3], [7, 4], [8, 5]]], 6],
        [
          [
            [
              [0, 0], [0, 1], [0, 2], [0, 3], [1, 0], [1, 1], [1, 2], [1, 3], [2, 0], [2, 1], [2, 2], [2, 3],
              [3, 0], [3, 1], [3, 2], [3, 3]
            ]
          ],
          4
        ],
        [[[[6, -4], [0, -6], [-3, 1], [6, -5], [-6, -2], [3, -6], [-2, 0], [-6, -6], [-4, -4], [0, -5], [-5, -5], [-4, -5]]], 4],
        [
          [
            [
              [-10, 1], [-5, -9], [-5, -3], [-5, -6], [5, 4], [-6, 1], [-7, -7], [-9, 2], [-1, -5], [-4, 10],
              [5, -6], [-2, 10], [8, -10], [1, -10], [1, -4], [7, -9], [6, -1], [6, -2], [-2, 3], [5, -4], [-3, 4],
              [9, -3], [9, 3], [2, 0], [10, 10]
            ]
          ],
          3
        ],
        [
          [
            [
              [-18, 30], [-29, -3], [27, 4], [29, -29], [-15, -23], [-28, 19], [-25, 18], [19, 24], [-15, 4],
              [-2, -5], [-24, -8], [-25, -28], [1, 21], [3, -18], [29, 1], [23, -9], [-14, -16], [19, -16],
              [-8, -12], [-9, -11], [22, 22], [29, -15], [6, -14], [16, 9], [14, -19], [28, -26], [-14, -26],
              [20, -6], [25, -28], [4, 19], [-24, -28], [-12, -29], [9, 21], [19, 25], [13, 9], [-28, 29],
              [-19, -23], [-10, -11], [15, 12], [25, 20]
            ]
          ],
          4
        ],
        [
          [
            [
              [4, 0], [-6, -5], [3, 1], [-3, -3], [5, 4], [8, 0], [-5, 6], [1, -6], [2, -7], [-8, -1], [2, -4],
              [-7, -7], [1, 0], [1, 6], [-4, -5], [-8, 4], [6, -7], [-1, -8], [6, -4], [6, 2], [-2, -5], [-4, 1],
              [-2, -2], [-1, 4], [-1, -2], [-2, 4], [-1, 1], [-2, 1], [6, 8], [3, 0], [-6, -3], [-3, -7], [3, 3],
              [5, 6], [5, 3], [0, -1], [2, -2], [2, 4], [2, 1], [-4, -6], [1, 8], [-7, 1], [-1, 0], [6, 7],
              [-4, 6], [3, -4], [3, 2], [-5, -8], [-3, 4], [-6, 5], [-3, 1], [8, 1], [2, -3], [1, 1], [1, -2],
              [-8, 5], [-7, 3], [7, 8], [7, 5], [-4, 8]
            ]
          ],
          9
        ],
        [
          [
            [
              [-150, -297], [-149, -295], [-148, -293], [-147, -291], [-146, -289], [-145, -287], [-144, -285],
              [-143, -283], [-142, -281], [-141, -279], [-140, -277], [-139, -275], [-138, -273], [-137, -271],
              [-136, -269], [-135, -267], [-134, -265], [-133, -263], [-132, -261], [-131, -259], [-130, -257],
              [-129, -255], [-128, -253], [-127, -251], [-126, -249], [-125, -247], [-124, -245], [-123, -243],
              [-122, -241], [-121, -239], [-120, -237], [-119, -235], [-118, -233], [-117, -231], [-116, -229],
              [-115, -227], [-114, -225], [-113, -223], [-112, -221], [-111, -219], [-110, -217], [-109, -215],
              [-108, -213], [-107, -211], [-106, -209], [-105, -207], [-104, -205], [-103, -203], [-102, -201],
              [-101, -199], [-100, -197], [-99, -195], [-98, -193], [-97, -191], [-96, -189], [-95, -187],
              [-94, -185], [-93, -183], [-92, -181], [-91, -179], [-90, -177], [-89, -175], [-88, -173],
              [-87, -171], [-86, -169], [-85, -167], [-84, -165], [-83, -163], [-82, -161], [-81, -159],
              [-80, -157], [-79, -155], [-78, -153], [-77, -151], [-76, -149], [-75, -147], [-74, -145],
              [-73, -143], [-72, -141], [-71, -139], [-70, -137], [-69, -135], [-68, -133], [-67, -131],
              [-66, -129], [-65, -127], [-64, -125], [-63, -123], [-62, -121], [-61, -119], [-60, -117],
              [-59, -115], [-58, -113], [-57, -111], [-56, -109], [-55, -107], [-54, -105], [-53, -103],
              [-52, -101], [-51, -99], [-50, -97], [-49, -95], [-48, -93], [-47, -91], [-46, -89], [-45, -87],
              [-44, -85], [-43, -83], [-42, -81], [-41, -79], [-40, -77], [-39, -75], [-38, -73], [-37, -71],
              [-36, -69], [-35, -67], [-34, -65], [-33, -63], [-32, -61], [-31, -59], [-30, -57], [-29, -55],
              [-28, -53], [-27, -51], [-26, -49], [-25, -47], [-24, -45], [-23, -43], [-22, -41], [-21, -39],
              [-20, -37], [-19, -35], [-18, -33], [-17, -31], [-16, -29], [-15, -27], [-14, -25], [-13, -23],
              [-12, -21], [-11, -19], [-10, -17], [-9, -15], [-8, -13], [-7, -11], [-6, -9], [-5, -7], [-4, -5],
              [-3, -3], [-2, -1], [-1, 1], [0, 3], [1, 5], [2, 7], [3, 9], [4, 11], [5, 13], [6, 15], [7, 17],
              [8, 19], [9, 21], [10, 23], [11, 25], [12, 27], [13, 29], [14, 31], [15, 33], [16, 35], [17, 37],
              [18, 39], [19, 41], [20, 43], [21, 45], [22, 47], [23, 49], [24, 51], [25, 53], [26, 55], [27, 57],
              [28, 59], [29, 61], [30, 63], [31, 65], [32, 67], [33, 69], [34, 71], [35, 73], [36, 75], [37, 77],
              [38, 79], [39, 81], [40, 83], [41, 85], [42, 87], [43, 89], [44, 91], [45, 93], [46, 95], [47, 97],
              [48, 99], [49, 101], [50, 103], [51, 105], [52, 107], [53, 109], [54, 111], [55, 113], [56, 115],
              [57, 117], [58, 119], [59, 121], [60, 123], [61, 125], [62, 127], [63, 129], [64, 131], [65, 133],
              [66, 135], [67, 137], [68, 139], [69, 141], [70, 143], [71, 145], [72, 147], [73, 149], [74, 151],
              [75, 153], [76, 155], [77, 157], [78, 159], [79, 161], [80, 163], [81, 165], [82, 167], [83, 169],
              [84, 171], [85, 173], [86, 175], [87, 177], [88, 179], [89, 181], [90, 183], [91, 185], [92, 187],
              [93, 189], [94, 191], [95, 193], [96, 195], [97, 197], [98, 199], [99, 201], [100, 203], [101, 205],
              [102, 207], [103, 209], [104, 211], [105, 213], [106, 215], [107, 217], [108, 219], [109, 221],
              [110, 223], [111, 225], [112, 227], [113, 229], [114, 231], [115, 233], [116, 235], [117, 237],
              [118, 239], [119, 241], [120, 243], [121, 245], [122, 247], [123, 249], [124, 251], [125, 253],
              [126, 255], [127, 257], [128, 259], [129, 261], [130, 263], [131, 265], [132, 267], [133, 269],
              [134, 271], [135, 273], [136, 275], [137, 277], [138, 279], [139, 281], [140, 283], [141, 285],
              [142, 287], [143, 289], [144, 291], [145, 293], [146, 295], [147, 297], [148, 299], [149, 301]
            ]
          ],
          300
        ],
        [
          [
            [
              [-149, 249], [-148, 248], [-147, 247], [-146, 246], [-145, 245], [-144, 244], [-143, 243],
              [-142, 242], [-141, 241], [-140, 240], [-139, 239], [-138, 238], [-137, 237], [-136, 236],
              [-135, 235], [-134, 234], [-133, 233], [-132, 232], [-131, 231], [-130, 230], [-129, 229],
              [-128, 228], [-127, 227], [-126, 226], [-125, 225], [-124, 224], [-123, 223], [-122, 222],
              [-121, 221], [-120, 220], [-119, 219], [-118, 218], [-117, 217], [-116, 216], [-115, 215],
              [-114, 214], [-113, 213], [-112, 212], [-111, 211], [-110, 210], [-109, 209], [-108, 208],
              [-107, 207], [-106, 206], [-105, 205], [-104, 204], [-103, 203], [-102, 202], [-101, 201],
              [-100, 200], [-99, 199], [-98, 198], [-97, 197], [-96, 196], [-95, 195], [-94, 194], [-93, 193],
              [-92, 192], [-91, 191], [-90, 190], [-89, 189], [-88, 188], [-87, 187], [-86, 186], [-85, 185],
              [-84, 184], [-83, 183], [-82, 182], [-81, 181], [-80, 180], [-79, 179], [-78, 178], [-77, 177],
              [-76, 176], [-75, 175], [-74, 174], [-73, 173], [-72, 172], [-71, 171], [-70, 170], [-69, 169],
              [-68, 168], [-67, 167], [-66, 166], [-65, 165], [-64, 164], [-63, 163], [-62, 162], [-61, 161],
              [-60, 160], [-59, 159], [-58, 158], [-57, 157], [-56, 156], [-55, 155], [-54, 154], [-53, 153],
              [-52, 152], [-51, 151], [-50, 150], [-49, 149], [-48, 148], [-47, 147], [-46, 146], [-45, 145],
              [-44, 144], [-43, 143], [-42, 142], [-41, 141], [-40, 140], [-39, 139], [-38, 138], [-37, 137],
              [-36, 136], [-35, 135], [-34, 134], [-33, 133], [-32, 132], [-31, 131], [-30, 130], [-29, 129],
              [-28, 128], [-27, 127], [-26, 126], [-25, 125], [-24, 124], [-23, 123], [-22, 122], [-21, 121],
              [-20, 120], [-19, 119], [-18, 118], [-17, 117], [-16, 116], [-15, 115], [-14, 114], [-13, 113],
              [-12, 112], [-11, 111], [-10, 110], [-9, 109], [-8, 108], [-7, 107], [-6, 106], [-5, 105], [-4, 104],
              [-3, 103], [-2, 102], [-1, 101], [0, 100], [1, 99], [2, 98], [3, 97], [4, 96], [5, 95], [6, 94],
              [7, 93], [8, 92], [9, 91], [10, 90], [11, 89], [12, 88], [13, 87], [14, 86], [15, 85], [16, 84],
              [17, 83], [18, 82], [19, 81], [20, 80], [21, 79], [22, 78], [23, 77], [24, 76], [25, 75], [26, 74],
              [27, 73], [28, 72], [29, 71], [30, 70], [31, 69], [32, 68], [33, 67], [34, 66], [35, 65], [36, 64],
              [37, 63], [38, 62], [39, 61], [40, 60], [41, 59], [42, 58], [43, 57], [44, 56], [45, 55], [46, 54],
              [47, 53], [48, 52], [49, 51], [50, 50], [51, 49], [52, 48], [53, 47], [54, 46], [55, 45], [56, 44],
              [57, 43], [58, 42], [59, 41], [60, 40], [61, 39], [62, 38], [63, 37], [64, 36], [65, 35], [66, 34],
              [67, 33], [68, 32], [69, 31], [70, 30], [71, 29], [72, 28], [73, 27], [74, 26], [75, 25], [76, 24],
              [77, 23], [78, 22], [79, 21], [80, 20], [81, 19], [82, 18], [83, 17], [84, 16], [85, 15], [86, 14],
              [87, 13], [88, 12], [89, 11], [90, 10], [91, 9], [92, 8], [93, 7], [94, 6], [95, 5], [96, 4],
              [97, 3], [98, 2], [99, 1], [100, 0], [101, -1], [102, -2], [103, -3], [104, -4], [105, -5],
              [106, -6], [107, -7], [108, -8], [109, -9], [110, -10], [111, -11], [112, -12], [113, -13],
              [114, -14], [115, -15], [116, -16], [117, -17], [118, -18], [119, -19], [120, -20], [121, -21],
              [122, -22], [123, -23], [124, -24], [125, -25], [126, -26], [127, -27], [128, -28], [129, -29],
              [130, -30], [131, -31], [132, -32], [133, -33], [134, -34], [135, -35], [136, -36], [137, -37],
              [138, -38], [139, -39], [140, -40], [141, -41], [142, -42], [143, -43], [144, -44], [145, -45],
              [146, -46], [147, -47], [148, -48], [149, -49], [0, 1]
            ]
          ],
          299
        ],
        [
          [
            [
              [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8], [0, 9], [0, 10], [0, 11],
              [0, 12], [0, 13], [0, 14], [0, 15], [0, 16], [0, 17], [0, 18], [0, 19], [1, 0], [1, 1], [1, 2],
              [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [1, 8], [1, 9], [1, 10], [1, 11], [1, 12], [1, 13], [1, 14],
              [1, 15], [1, 16], [1, 17], [1, 18], [1, 19], [2, 0], [2, 1], [2, 2], [2, 3], [2, 4], [2, 5], [2, 6],
              [2, 7], [2, 8], [2, 9], [2, 10], [2, 11], [2, 12], [2, 13], [2, 14], [2, 15], [2, 16], [2, 17],
              [2, 18], [2, 19], [3, 0], [3, 1], [3, 2], [3, 3], [3, 4], [3, 5], [3, 6], [3, 7], [3, 8], [3, 9],
              [3, 10], [3, 11], [3, 12], [3, 13], [3, 14], [3, 15], [3, 16], [3, 17], [3, 18], [3, 19], [4, 0],
              [4, 1], [4, 2], [4, 3], [4, 4], [4, 5], [4, 6], [4, 7], [4, 8], [4, 9], [4, 10], [4, 11], [4, 12],
              [4, 13], [4, 14], [4, 15], [4, 16], [4, 17], [4, 18], [4, 19], [5, 0], [5, 1], [5, 2], [5, 3],
              [5, 4], [5, 5], [5, 6], [5, 7], [5, 8], [5, 9], [5, 10], [5, 11], [5, 12], [5, 13], [5, 14], [5, 15],
              [5, 16], [5, 17], [5, 18], [5, 19], [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [6, 6], [6, 7],
              [6, 8], [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14], [6, 15], [6, 16], [6, 17], [6, 18],
              [6, 19], [7, 0], [7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6], [7, 7], [7, 8], [7, 9], [7, 10],
              [7, 11], [7, 12], [7, 13], [7, 14], [7, 15], [7, 16], [7, 17], [7, 18], [7, 19], [8, 0], [8, 1],
              [8, 2], [8, 3], [8, 4], [8, 5], [8, 6], [8, 7], [8, 8], [8, 9], [8, 10], [8, 11], [8, 12], [8, 13],
              [8, 14], [8, 15], [8, 16], [8, 17], [8, 18], [8, 19], [9, 0], [9, 1], [9, 2], [9, 3], [9, 4], [9, 5],
              [9, 6], [9, 7], [9, 8], [9, 9], [9, 10], [9, 11], [9, 12], [9, 13], [9, 14], [9, 15], [9, 16],
              [9, 17], [9, 18], [9, 19], [10, 0], [10, 1], [10, 2], [10, 3], [10, 4], [10, 5], [10, 6], [10, 7],
              [10, 8], [10, 9], [10, 10], [10, 11], [10, 12], [10, 13], [10, 14], [10, 15], [10, 16], [10, 17],
              [10, 18], [10, 19], [11, 0], [11, 1], [11, 2], [11, 3], [11, 4], [11, 5], [11, 6], [11, 7], [11, 8],
              [11, 9], [11, 10], [11, 11], [11, 12], [11, 13], [11, 14], [11, 15], [11, 16], [11, 17], [11, 18],
              [11, 19], [12, 0], [12, 1], [12, 2], [12, 3], [12, 4], [12, 5], [12, 6], [12, 7], [12, 8], [12, 9],
              [12, 10], [12, 11], [12, 12], [12, 13], [12, 14], [12, 15], [12, 16], [12, 17], [12, 18], [12, 19],
              [13, 0], [13, 1], [13, 2], [13, 3], [13, 4], [13, 5], [13, 6], [13, 7], [13, 8], [13, 9], [13, 10],
              [13, 11], [13, 12], [13, 13], [13, 14], [13, 15], [13, 16], [13, 17], [13, 18], [13, 19], [14, 0],
              [14, 1], [14, 2], [14, 3], [14, 4], [14, 5], [14, 6], [14, 7], [14, 8], [14, 9], [14, 10], [14, 11],
              [14, 12], [14, 13], [14, 14], [14, 15], [14, 16], [14, 17], [14, 18], [14, 19]
            ]
          ],
          20
        ]
      ]
    },
        solution: {
      approach: `<p>For each anchor, bucket all later points by their reduced, sign-normalised direction. The largest bucket + the anchor is the best line through it. O(N<sup>2</sup>) hash operations, exact integer keys.</p>`,
      code: `class Solution {
    public int maxPoints(int[][] p) {
        int n = p.length, best = 1;
        for (int i = 0; i < n; i++) {
            Map<Long, Integer> count = new HashMap<>();
            for (int j = i + 1; j < n; j++) {
                int dx = p[j][0] - p[i][0], dy = p[j][1] - p[i][1];
                int g = gcd(Math.abs(dx), Math.abs(dy));      // > 0 because points are distinct
                dx /= g; dy /= g;
                if (dx < 0 || (dx == 0 && dy < 0)) { dx = -dx; dy = -dy; }  // canonical sign
                long key = ((long) dx << 32) ^ (dy & 0xffffffffL);
                best = Math.max(best, count.merge(key, 1, Integer::sum) + 1);
            }
        }
        return best;
    }

    private int gcd(int a, int b) { return b == 0 ? a : gcd(b, a % b); }
}`,
      alt: [{ lang: 'python', code: `from collections import Counter
from math import gcd

class Solution:
    def max_points(self, points):
        best = 1
        for i, (x1, y1) in enumerate(points):
            slopes = Counter()
            for x2, y2 in points[i + 1:]:
                dx, dy = x2 - x1, y2 - y1
                g = gcd(dx, dy)                      # > 0 because the points are distinct
                dx, dy = dx // g, dy // g
                if dx < 0 or (dx == 0 and dy < 0):   # canonical sign: one key per direction
                    dx, dy = -dx, -dy
                slopes[(dx, dy)] += 1
                best = max(best, slopes[(dx, dy)] + 1)
        return best` }, { lang: 'js', code: `function maxPoints(p) {
  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
  let best = 1;
  for (let i = 0; i < p.length; i++) {
    const count = new Map();
    for (let j = i + 1; j < p.length; j++) {
      let dx = p[j][0] - p[i][0], dy = p[j][1] - p[i][1];
      const g = gcd(Math.abs(dx), Math.abs(dy));     // > 0 because the points are distinct
      dx /= g; dy /= g;
      if (dx < 0 || (dx === 0 && dy < 0)) { dx = -dx; dy = -dy; }   // canonical sign
      const key = dx * 100000 + dy;                  // |dy| <= 20000, so keys never collide
      const c = (count.get(key) || 0) + 1;
      count.set(key, c);
      best = Math.max(best, c + 1);
    }
  }
  return best;
}` }, { lang: 'cpp', code: `class Solution {
public:
    int maxPoints(const vector<vector<int>>& p) {
        int n = p.size(), best = 1;
        for (int i = 0; i < n; i++) {
            unordered_map<long long, int> count;
            for (int j = i + 1; j < n; j++) {
                int dx = p[j][0] - p[i][0], dy = p[j][1] - p[i][1];
                int g = gcd(abs(dx), abs(dy));       // > 0 because the points are distinct
                dx /= g; dy /= g;
                if (dx < 0 || (dx == 0 && dy < 0)) { dx = -dx; dy = -dy; }   // canonical sign
                best = max(best, ++count[(long long)dx * 100000 + dy] + 1);  // |dy| <= 20000
            }
        }
        return best;
    }
};` }, { lang: 'csharp', code: `public class Solution {
    public int MaxPoints(int[][] p) {
        int n = p.Length, best = 1;
        for (int i = 0; i < n; i++) {
            var count = new Dictionary<long, int>();
            for (int j = i + 1; j < n; j++) {
                int dx = p[j][0] - p[i][0], dy = p[j][1] - p[i][1];
                int g = Gcd(Math.Abs(dx), Math.Abs(dy));      // > 0 because points are distinct
                dx /= g; dy /= g;
                if (dx < 0 || (dx == 0 && dy < 0)) { dx = -dx; dy = -dy; }  // canonical sign
                long key = ((long)dx << 32) ^ (dy & 0xffffffffL);
                int c;
                count.TryGetValue(key, out c);
                count[key] = c + 1;
                best = Math.Max(best, c + 2);
            }
        }
        return best;
    }

    private int Gcd(int a, int b) { return b == 0 ? a : Gcd(b, a % b); }
}` }],
      dry: { head: ['anchor', 'other point', '(dx, dy)', 'reduced key', 'count'], rows: [['(3,2)', '(5,3)', '(2,1)', '(2,1)', '1'], ['(3,2)', '(4,1)', '(1,−1)', '(1,−1)', '1'], ['(3,2)', '(2,3)', '(−1,1)', '(1,−1)', '2'], ['(3,2)', '(1,4)', '(−2,2)', '(1,−1)', '3 → best = 4']] },
      complexity: `<p>Time <b>O(N<sup>2</sup> log C)</b> (gcd on coordinates up to C), space O(N) per anchor.</p>`,
      followUps: ['Points may repeat: count duplicates of the anchor separately and add them to every line.', 'Return the line itself as a·x + b·y = c with integer coefficients.']
    }
  });

  practice.push({
    title: 'Perfect Rectangle', level: 'Hard', tags: ['geometry', 'hashing', 'area'], companies: ['Google', 'Apple'],
    statement: `<p>Given N axis-aligned rectangles <code>[x1, y1, x2, y2]</code>, return <code>true</code> if together they form an <b>exact cover</b> of one rectangular region: no gaps and no overlaps. (LeetCode 391.)</p>`,
    constraints: `1 ≤ N ≤ 2·10<sup>4</sup>, −10<sup>5</sup> ≤ coordinates ≤ 10<sup>5</sup>, each rectangle has positive area`,
    example: `<p><code>[[1,1,3,3],[3,1,4,2],[3,2,4,4],[1,3,2,4],[2,3,3,4]]</code> → ${H.c('g', 'true')}: areas 4+1+2+1+1 = 9 = the 3×3 bounding box, and only the 4 outer corners appear an odd number of times.</p><p><code>[[1,1,2,3],[1,3,2,4],[3,1,4,2],[3,2,4,4]]</code> → ${H.c('r', 'false')}: a gap in the middle column.</p>`,
    brute: {
      why: `<p>Check (1) total area equals the bounding box area and (2) no two rectangles overlap (pairwise, Rectangle Overlap test). Correct, but the pair check is <b>O(N<sup>2</sup>)</b> = 2·10<sup>8</sup> overlap tests. Painting a grid is worse: up to 4·10<sup>10</sup> unit cells.</p>`,
      code: { lang: 'java', code: `class Solution {
    public boolean isRectangleCover(int[][] r) {
        long area = 0;
        int x1 = Integer.MAX_VALUE, y1 = Integer.MAX_VALUE, x2 = Integer.MIN_VALUE, y2 = Integer.MIN_VALUE;
        for (int[] a : r) {
            area += (long) (a[2] - a[0]) * (a[3] - a[1]);
            x1 = Math.min(x1, a[0]); y1 = Math.min(y1, a[1]);
            x2 = Math.max(x2, a[2]); y2 = Math.max(y2, a[3]);
        }
        if (area != (long) (x2 - x1) * (y2 - y1)) return false;
        for (int i = 0; i < r.length; i++)                // O(N^2) overlap checks
            for (int j = i + 1; j < r.length; j++)
                if (Math.min(r[i][2], r[j][2]) > Math.max(r[i][0], r[j][0])
                 && Math.min(r[i][3], r[j][3]) > Math.max(r[i][1], r[j][1])) return false;
        return true;
    }
}`, alt: [{ lang: 'python', code: String.raw`
class Solution:
    def is_rectangle_cover(self, rectangles):
        r = rectangles
        area = 0
        x1 = y1 = float("inf")
        x2 = y2 = float("-inf")
        for a in r:
            area += (a[2] - a[0]) * (a[3] - a[1])
            x1, y1 = min(x1, a[0]), min(y1, a[1])
            x2, y2 = max(x2, a[2]), max(y2, a[3])
        if area != (x2 - x1) * (y2 - y1):
            return False
        for i in range(len(r)):                       # O(N^2) overlap checks
            for j in range(i + 1, len(r)):
                if (min(r[i][2], r[j][2]) > max(r[i][0], r[j][0])
                        and min(r[i][3], r[j][3]) > max(r[i][1], r[j][1])):
                    return False
        return True` }, { lang: 'js', code: String.raw`
function isRectangleCover(r) {
  let area = 0, x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const a of r) {
    area += (a[2] - a[0]) * (a[3] - a[1]);
    x1 = Math.min(x1, a[0]); y1 = Math.min(y1, a[1]);
    x2 = Math.max(x2, a[2]); y2 = Math.max(y2, a[3]);
  }
  if (area !== (x2 - x1) * (y2 - y1)) return false;
  for (let i = 0; i < r.length; i++)                  // O(N^2) overlap checks
    for (let j = i + 1; j < r.length; j++)
      if (Math.min(r[i][2], r[j][2]) > Math.max(r[i][0], r[j][0]) &&
          Math.min(r[i][3], r[j][3]) > Math.max(r[i][1], r[j][1])) return false;
  return true;
}` }, { lang: 'cpp', code: String.raw`
class Solution {
public:
    bool isRectangleCover(const vector<vector<int>>& r) {
        long long area = 0;
        int x1 = INT_MAX, y1 = INT_MAX, x2 = INT_MIN, y2 = INT_MIN;
        for (auto& a : r) {
            area += (long long)(a[2] - a[0]) * (a[3] - a[1]);
            x1 = min(x1, a[0]); y1 = min(y1, a[1]);
            x2 = max(x2, a[2]); y2 = max(y2, a[3]);
        }
        if (area != (long long)(x2 - x1) * (y2 - y1)) return false;
        for (int i = 0; i < (int)r.size(); i++)       // O(N^2) overlap checks
            for (int j = i + 1; j < (int)r.size(); j++)
                if (min(r[i][2], r[j][2]) > max(r[i][0], r[j][0])
                 && min(r[i][3], r[j][3]) > max(r[i][1], r[j][1])) return false;
        return true;
    }
};` }, { lang: 'csharp', code: `public class Solution {
    public bool IsRectangleCover(int[][] r) {
        long area = 0;
        int x1 = int.MaxValue, y1 = int.MaxValue, x2 = int.MinValue, y2 = int.MinValue;
        foreach (var a in r) {
            area += (long)(a[2] - a[0]) * (a[3] - a[1]);
            x1 = Math.Min(x1, a[0]); y1 = Math.Min(y1, a[1]);
            x2 = Math.Max(x2, a[2]); y2 = Math.Max(y2, a[3]);
        }
        if (area != (long)(x2 - x1) * (y2 - y1)) return false;
        for (int i = 0; i < r.Length; i++)                // O(N^2) overlap checks
            for (int j = i + 1; j < r.Length; j++)
                if (Math.Min(r[i][2], r[j][2]) > Math.Max(r[i][0], r[j][0])
                 && Math.Min(r[i][3], r[j][3]) > Math.Max(r[i][1], r[j][1])) return false;
        return true;
    }
}` }] }
    },
    mcq: { q: 'In a perfect cover, how often does an interior corner point (not one of the 4 outer corners) appear among all rectangle corners?', options: ['Exactly once', 'An even number of times (2 or 4)', 'Exactly 3 times', 'It never appears'], answer: 1, explain: 'Inside a perfect tiling every corner is shared by 2 rectangles (a T-junction) or 4 (a cross). Only the 4 bounding corners belong to a single rectangle. Toggling corners in a set leaves exactly those 4.' },
    hints: [
      `<p>Hint 1: Necessary: sum of areas == bounding-box area. Not sufficient — an overlap can exactly cancel a gap.</p>`,
      `<p>Hint 2: Look at corners. In a perfect tiling, each internal corner point is shared by an even number of rectangles; the 4 outer corners appear exactly once.</p>`,
      `<p>Hint 3: Toggle each rectangle's 4 corners in a HashSet (add if absent, remove if present). Valid ⇔ area matches AND the set is exactly the 4 bounding corners. Encode (x, y) as one 64-bit integer.</p>`
    ],
    tests: {
      sig: 'int[][] -> bool',
      fn: 'isRectangleCover',
      cases: [
        [[[[1, 1, 3, 3], [3, 1, 4, 2], [3, 2, 4, 4], [1, 3, 2, 4], [2, 3, 3, 4]]], true],
        [[[[1, 1, 2, 3], [1, 3, 2, 4], [3, 1, 4, 2], [3, 2, 4, 4]]], false],
        [[[[0, 0, 1, 1]]], true],
        [[[[0, 0, 2, 2], [1, 1, 3, 3]]], false],
        [[[[0, 0, 1, 1], [1, 1, 2, 2]]], false],
        [[[[0, 0, 1, 1], [1, 0, 2, 1], [0, 1, 1, 2], [1, 1, 2, 2]]], true],
        [[[[0, 0, 1, 1], [1, 0, 2, 1], [0, 1, 1, 2]]], false],
        [[[[0, 0, 2, 1], [0, 1, 1, 2], [1, 1, 2, 2], [0, 0, 2, 1]]], false],
        [[[[0, 0, 3, 3], [0, 0, 3, 3]]], false],
        [[[[0, 0, 2, 2], [2, 0, 4, 2], [0, 2, 4, 4]]], true],
        [[[[0, 0, 2, 2], [2, 0, 4, 2], [0, 2, 4, 4], [1, 1, 3, 3]]], false],
        [[[[0, 0, 1, 3], [1, 0, 2, 1], [1, 1, 2, 2], [1, 2, 2, 3]]], true],
        [[[[-100000, -100000, 100000, 100000]]], true],
        [[[[-100000, -100000, 100000, 0], [-100000, 0, 100000, 100000]]], true],
        [[[[-100000, -100000, 100000, 0], [-100000, 1, 100000, 100000]]], false],
        [[[[-100000, -100000, 100000, 100000], [0, 0, 65536, 32768], [0, 0, 65536, 32768]]], false],
        [
          [
            [
              [-100000, -100000, 0, 100000],
              [0, -100000, 100000, 100000],
              [-100000, -100000, 0, 100000],
              [-100000, -100000, 0, 100000]
            ]
          ],
          false
        ],
        [
          [
            [
              [0, 0, 1, 1], [0, 1, 1, 2], [0, 2, 1, 3], [0, 3, 1, 4], [0, 4, 1, 5], [0, 5, 1, 6], [0, 6, 1, 7],
              [0, 7, 1, 8], [0, 8, 1, 9], [0, 9, 1, 10], [1, 0, 2, 1], [1, 1, 2, 2], [1, 2, 2, 3], [1, 3, 2, 4],
              [1, 4, 2, 5], [1, 5, 2, 6], [1, 6, 2, 7], [1, 7, 2, 8], [1, 8, 2, 9], [1, 9, 2, 10], [2, 0, 3, 1],
              [2, 1, 3, 2], [2, 2, 3, 3], [2, 3, 3, 4], [2, 4, 3, 5], [2, 5, 3, 6], [2, 6, 3, 7], [2, 7, 3, 8],
              [2, 8, 3, 9], [2, 9, 3, 10], [3, 0, 4, 1], [3, 1, 4, 2], [3, 2, 4, 3], [3, 3, 4, 4], [3, 4, 4, 5],
              [3, 5, 4, 6], [3, 6, 4, 7], [3, 7, 4, 8], [3, 8, 4, 9], [3, 9, 4, 10], [4, 0, 5, 1], [4, 1, 5, 2],
              [4, 2, 5, 3], [4, 3, 5, 4], [4, 4, 5, 5], [4, 5, 5, 6], [4, 6, 5, 7], [4, 7, 5, 8], [4, 8, 5, 9],
              [4, 9, 5, 10], [5, 0, 6, 1], [5, 1, 6, 2], [5, 2, 6, 3], [5, 3, 6, 4], [5, 4, 6, 5], [5, 5, 6, 6],
              [5, 6, 6, 7], [5, 7, 6, 8], [5, 8, 6, 9], [5, 9, 6, 10], [6, 0, 7, 1], [6, 1, 7, 2], [6, 2, 7, 3],
              [6, 3, 7, 4], [6, 4, 7, 5], [6, 5, 7, 6], [6, 6, 7, 7], [6, 7, 7, 8], [6, 8, 7, 9], [6, 9, 7, 10],
              [7, 0, 8, 1], [7, 1, 8, 2], [7, 2, 8, 3], [7, 3, 8, 4], [7, 4, 8, 5], [7, 5, 8, 6], [7, 6, 8, 7],
              [7, 7, 8, 8], [7, 8, 8, 9], [7, 9, 8, 10], [8, 0, 9, 1], [8, 1, 9, 2], [8, 2, 9, 3], [8, 3, 9, 4],
              [8, 4, 9, 5], [8, 5, 9, 6], [8, 6, 9, 7], [8, 7, 9, 8], [8, 8, 9, 9], [8, 9, 9, 10], [9, 0, 10, 1],
              [9, 1, 10, 2], [9, 2, 10, 3], [9, 3, 10, 4], [9, 4, 10, 5], [9, 5, 10, 6], [9, 6, 10, 7],
              [9, 7, 10, 8], [9, 8, 10, 9], [9, 9, 10, 10]
            ]
          ],
          true
        ],
        [
          [
            [
              [0, 0, 1, 1], [0, 1, 1, 2], [0, 2, 1, 3], [0, 3, 1, 4], [0, 4, 1, 5], [0, 5, 1, 6], [0, 6, 1, 7],
              [0, 7, 1, 8], [0, 8, 1, 9], [0, 9, 1, 10], [1, 0, 2, 1], [1, 1, 2, 2], [1, 2, 2, 3], [1, 3, 2, 4],
              [1, 4, 2, 5], [1, 5, 2, 6], [1, 6, 2, 7], [1, 7, 2, 8], [1, 8, 2, 9], [1, 9, 2, 10], [2, 0, 3, 1],
              [2, 1, 3, 2], [2, 2, 3, 3], [2, 3, 3, 4], [2, 4, 3, 5], [2, 5, 3, 6], [2, 6, 3, 7], [2, 7, 3, 8],
              [2, 8, 3, 9], [2, 9, 3, 10], [3, 0, 4, 1], [3, 1, 4, 2], [3, 2, 4, 3], [3, 3, 4, 4], [3, 4, 4, 5],
              [3, 5, 4, 6], [3, 6, 4, 7], [3, 7, 4, 8], [3, 8, 4, 9], [3, 9, 4, 10], [4, 0, 5, 1], [4, 1, 5, 2],
              [4, 2, 5, 3], [4, 3, 5, 4], [4, 4, 5, 5], [4, 5, 5, 6], [4, 6, 5, 7], [4, 8, 5, 9], [4, 9, 5, 10],
              [5, 0, 6, 1], [5, 1, 6, 2], [5, 2, 6, 3], [5, 3, 6, 4], [5, 4, 6, 5], [5, 5, 6, 6], [5, 6, 6, 7],
              [5, 7, 6, 8], [5, 8, 6, 9], [5, 9, 6, 10], [6, 0, 7, 1], [6, 1, 7, 2], [6, 2, 7, 3], [6, 3, 7, 4],
              [6, 4, 7, 5], [6, 5, 7, 6], [6, 6, 7, 7], [6, 7, 7, 8], [6, 8, 7, 9], [6, 9, 7, 10], [7, 0, 8, 1],
              [7, 1, 8, 2], [7, 2, 8, 3], [7, 3, 8, 4], [7, 4, 8, 5], [7, 5, 8, 6], [7, 6, 8, 7], [7, 7, 8, 8],
              [7, 8, 8, 9], [7, 9, 8, 10], [8, 0, 9, 1], [8, 1, 9, 2], [8, 2, 9, 3], [8, 3, 9, 4], [8, 4, 9, 5],
              [8, 5, 9, 6], [8, 6, 9, 7], [8, 7, 9, 8], [8, 8, 9, 9], [8, 9, 9, 10], [9, 0, 10, 1], [9, 1, 10, 2],
              [9, 2, 10, 3], [9, 3, 10, 4], [9, 4, 10, 5], [9, 5, 10, 6], [9, 6, 10, 7], [9, 7, 10, 8],
              [9, 8, 10, 9], [9, 9, 10, 10]
            ]
          ],
          false
        ],
        [
          [
            [
              [0, 0, 1, 1], [0, 1, 1, 2], [0, 2, 1, 3], [0, 3, 1, 4], [0, 4, 1, 5], [0, 5, 1, 6], [0, 6, 1, 7],
              [0, 7, 1, 8], [0, 8, 1, 9], [0, 9, 1, 10], [1, 0, 2, 1], [1, 1, 2, 2], [1, 2, 2, 3], [1, 3, 2, 4],
              [1, 4, 2, 5], [1, 5, 2, 6], [1, 6, 2, 7], [1, 7, 2, 8], [1, 8, 2, 9], [1, 9, 2, 10], [2, 0, 3, 1],
              [2, 1, 3, 2], [2, 2, 3, 3], [2, 3, 3, 4], [2, 4, 3, 5], [2, 5, 3, 6], [2, 6, 3, 7], [2, 7, 3, 8],
              [2, 8, 3, 9], [2, 9, 3, 10], [3, 0, 4, 1], [3, 1, 4, 2], [3, 2, 4, 3], [3, 3, 4, 4], [3, 4, 4, 5],
              [3, 5, 4, 6], [3, 6, 4, 7], [3, 7, 4, 8], [3, 8, 4, 9], [3, 9, 4, 10], [4, 0, 5, 1], [4, 1, 5, 2],
              [4, 2, 5, 3], [4, 3, 5, 4], [4, 4, 5, 5], [4, 5, 5, 6], [4, 6, 5, 7], [4, 8, 5, 9], [4, 9, 5, 10],
              [5, 0, 6, 1], [5, 1, 6, 2], [5, 2, 6, 3], [5, 3, 6, 4], [5, 4, 6, 5], [5, 5, 6, 6], [5, 6, 6, 7],
              [5, 7, 6, 8], [5, 8, 6, 9], [5, 9, 6, 10], [6, 0, 7, 1], [6, 1, 7, 2], [6, 2, 7, 3], [6, 3, 7, 4],
              [6, 4, 7, 5], [6, 5, 7, 6], [6, 6, 7, 7], [6, 7, 7, 8], [6, 8, 7, 9], [6, 9, 7, 10], [7, 0, 8, 1],
              [7, 1, 8, 2], [7, 2, 8, 3], [7, 3, 8, 4], [7, 4, 8, 5], [7, 5, 8, 6], [7, 6, 8, 7], [7, 7, 8, 8],
              [7, 8, 8, 9], [7, 9, 8, 10], [8, 0, 9, 1], [8, 1, 9, 2], [8, 2, 9, 3], [8, 3, 9, 4], [8, 4, 9, 5],
              [8, 5, 9, 6], [8, 6, 9, 7], [8, 7, 9, 8], [8, 8, 9, 9], [8, 9, 9, 10], [9, 0, 10, 1], [9, 1, 10, 2],
              [9, 2, 10, 3], [9, 3, 10, 4], [9, 4, 10, 5], [9, 5, 10, 6], [9, 6, 10, 7], [9, 7, 10, 8],
              [9, 8, 10, 9], [9, 9, 10, 10], [4, 7, 5, 8]
            ]
          ],
          true
        ],
        [
          [
            [
              [0, 0, 1, 1], [0, 1, 1, 2], [0, 2, 1, 3], [0, 3, 1, 4], [0, 4, 1, 5], [0, 5, 1, 6], [0, 6, 1, 7],
              [0, 7, 1, 8], [0, 8, 1, 9], [0, 9, 1, 10], [1, 0, 2, 1], [1, 1, 2, 2], [1, 2, 2, 3], [1, 3, 2, 4],
              [1, 4, 2, 5], [1, 5, 2, 6], [1, 6, 2, 7], [1, 7, 2, 8], [1, 8, 2, 9], [1, 9, 2, 10], [2, 0, 3, 1],
              [2, 1, 3, 2], [2, 2, 3, 3], [2, 3, 3, 4], [2, 4, 3, 5], [2, 5, 3, 6], [2, 6, 3, 7], [2, 7, 3, 8],
              [2, 8, 3, 9], [2, 9, 3, 10], [3, 0, 4, 1], [3, 1, 4, 2], [3, 2, 4, 3], [3, 3, 4, 4], [3, 4, 4, 5],
              [3, 5, 4, 6], [3, 6, 4, 7], [3, 7, 4, 8], [3, 8, 4, 9], [3, 9, 4, 10], [4, 0, 5, 1], [4, 1, 5, 2],
              [4, 2, 5, 3], [4, 3, 5, 4], [4, 4, 5, 5], [4, 5, 5, 6], [4, 6, 5, 7], [4, 8, 5, 9], [4, 9, 5, 10],
              [5, 0, 6, 1], [5, 1, 6, 2], [5, 2, 6, 3], [5, 3, 6, 4], [5, 4, 6, 5], [5, 5, 6, 6], [5, 6, 6, 7],
              [5, 7, 6, 8], [5, 8, 6, 9], [5, 9, 6, 10], [6, 0, 7, 1], [6, 1, 7, 2], [6, 2, 7, 3], [6, 3, 7, 4],
              [6, 4, 7, 5], [6, 5, 7, 6], [6, 6, 7, 7], [6, 7, 7, 8], [6, 8, 7, 9], [6, 9, 7, 10], [7, 0, 8, 1],
              [7, 1, 8, 2], [7, 2, 8, 3], [7, 3, 8, 4], [7, 4, 8, 5], [7, 5, 8, 6], [7, 6, 8, 7], [7, 7, 8, 8],
              [7, 8, 8, 9], [7, 9, 8, 10], [8, 0, 9, 1], [8, 1, 9, 2], [8, 2, 9, 3], [8, 3, 9, 4], [8, 4, 9, 5],
              [8, 5, 9, 6], [8, 6, 9, 7], [8, 7, 9, 8], [8, 8, 9, 9], [8, 9, 9, 10], [9, 0, 10, 1], [9, 1, 10, 2],
              [9, 2, 10, 3], [9, 3, 10, 4], [9, 4, 10, 5], [9, 5, 10, 6], [9, 6, 10, 7], [9, 7, 10, 8],
              [9, 8, 10, 9], [9, 9, 10, 10], [3, 3, 4, 4]
            ]
          ],
          false
        ],
        [
          [
            [
              [11, 4, 12, 8], [-7, 5, -6, 7], [13, 12, 14, 13], [9, -6, 10, -5], [11, -6, 12, -3], [12, -6, 13, 3],
              [11, -1, 12, 1], [11, -8, 12, -6], [-3, 7, 4, 14], [-7, -2, -6, -1], [11, 2, 12, 3], [-4, -3, -3, 1],
              [11, -15, 12, -11], [-10, -9, -8, 1], [8, 5, 9, 8], [0, -3, 8, 7], [10, 10, 11, 12],
              [7, -15, 8, -14], [9, -5, 10, -2], [11, -2, 12, -1], [8, -9, 9, -8], [-11, -8, -10, 7],
              [14, 13, 15, 14], [8, -13, 9, -11], [5, -11, 7, -10], [-13, -15, -9, -14], [-3, -9, -2, 0],
              [-11, -9, -10, -8], [-7, -1, -6, 0], [11, 8, 12, 9], [8, -10, 9, -9], [6, 12, 7, 14], [8, 11, 9, 12],
              [10, -7, 11, -6], [0, -15, 2, -14], [10, 12, 11, 13], [-6, 0, -4, 7], [7, 12, 8, 13], [4, 7, 5, 9],
              [11, 10, 12, 12], [5, 10, 8, 11], [-15, -13, 5, -12], [-3, 4, 0, 7], [11, -3, 12, -2],
              [9, -2, 10, 5], [10, -8, 11, -7], [11, 12, 12, 13], [4, 9, 5, 14], [11, 14, 12, 15],
              [10, 13, 11, 14], [-4, 1, -3, 7], [6, 14, 7, 15], [8, -6, 9, -5], [6, 7, 7, 8], [-15, -10, 0, -9],
              [-4, -15, 0, -14], [12, 13, 13, 14], [-7, -5, -6, -4], [-9, 9, -7, 14], [-7, 0, -6, 4],
              [-8, -11, 5, -10], [5, -14, 7, -11], [-4, 7, -3, 14], [-10, 7, -9, 13], [5, -15, 6, -14],
              [6, 11, 7, 12], [-8, -15, -7, -14], [11, 9, 12, 10], [-12, 13, -9, 14], [5, 14, 6, 15],
              [14, 12, 15, 13], [8, -5, 9, 4], [-15, 14, -14, 15], [12, -15, 13, -6], [-4, 14, 0, 15],
              [8, 13, 9, 14], [9, 5, 10, 15], [7, -11, 8, -10], [0, 14, 1, 15], [14, 8, 15, 11], [-9, 7, -7, 9],
              [5, 7, 6, 8], [-7, 7, -6, 14], [7, 14, 8, 15], [10, -4, 11, -2], [14, 6, 15, 8], [11, 1, 12, 2],
              [-8, 5, -7, 7], [-5, -9, -4, -3], [-15, -14, 5, -13], [0, -9, 8, -6], [6, -15, 7, -14],
              [10, -6, 11, -4], [4, 14, 5, 15], [12, 6, 13, 12], [8, 12, 9, 13], [-2, -9, 0, 0], [2, -15, 5, -14],
              [3, 14, 4, 15], [-7, -9, -6, -5], [10, 14, 11, 15], [0, -6, 8, -5], [-6, -3, -4, 0],
              [-7, -4, -6, -2], [8, 14, 9, 15], [-14, 8, -13, 14], [8, -8, 9, -6], [13, -3, 14, -2], [-3, 0, 0, 4],
              [7, 7, 8, 8], [7, 8, 8, 9], [13, -15, 14, -3], [0, -10, 5, -9], [10, -2, 11, 0], [-7, -12, 5, -11],
              [10, 0, 11, 10], [12, 12, 13, 13], [12, 14, 13, 15], [14, 14, 15, 15], [-7, -15, -4, -14],
              [8, 8, 9, 11], [11, -11, 12, -8], [9, -11, 10, -6], [5, 11, 6, 12], [8, -11, 9, -10], [7, 11, 8, 12],
              [-6, -9, -5, -3], [14, 2, 15, 5], [5, -10, 6, -9], [-14, 7, -13, 8], [-13, 13, -12, 14],
              [10, -15, 11, -8], [12, 3, 13, 6], [-15, -9, -11, 4], [-15, 7, -14, 8], [14, -15, 15, -14],
              [13, 11, 14, 12], [5, 9, 8, 10], [-15, -15, -13, -14], [9, -14, 10, -13], [9, -13, 10, -11],
              [13, 14, 14, 15], [-15, 8, -14, 14], [11, 3, 12, 4], [-13, 7, -10, 13], [14, 11, 15, 12],
              [-7, 4, -6, 5], [-15, -11, -8, -10], [-8, -9, -7, 5], [14, -14, 15, 2], [0, -5, 8, -3], [8, 4, 9, 5],
              [7, 13, 8, 14], [14, 5, 15, 6], [2, 14, 3, 15], [1, 14, 2, 15], [-15, -12, -7, -11],
              [9, -15, 10, -14], [7, -14, 8, -11], [6, -10, 7, -9], [13, -2, 14, 11], [11, 13, 12, 14],
              [-4, -5, -3, -3], [8, -15, 9, -13], [5, 12, 6, 14], [7, -10, 8, -9], [-4, -9, -3, -5], [5, 8, 7, 9],
              [13, 13, 14, 14], [-15, 4, -11, 7], [-14, 14, -4, 15], [-6, 7, -4, 14], [-10, 1, -8, 7],
              [-9, -15, -8, -14]
            ]
          ],
          true
        ],
        [
          [
            [
              [11, 4, 12, 8], [-7, 5, -6, 7], [13, 12, 14, 13], [9, -6, 10, -5], [11, -6, 12, -3], [12, -6, 13, 3],
              [11, -1, 12, 1], [11, -8, 12, -6], [-3, 7, 3, 14], [-7, -2, -6, -1], [11, 2, 12, 3], [-4, -3, -3, 1],
              [11, -15, 12, -11], [-10, -9, -8, 1], [8, 5, 9, 8], [0, -3, 8, 7], [10, 10, 11, 12],
              [7, -15, 8, -14], [9, -5, 10, -2], [11, -2, 12, -1], [8, -9, 9, -8], [-11, -8, -10, 7],
              [14, 13, 15, 14], [8, -13, 9, -11], [5, -11, 7, -10], [-13, -15, -9, -14], [-3, -9, -2, 0],
              [-11, -9, -10, -8], [-7, -1, -6, 0], [11, 8, 12, 9], [8, -10, 9, -9], [6, 12, 7, 14], [8, 11, 9, 12],
              [10, -7, 11, -6], [0, -15, 2, -14], [10, 12, 11, 13], [-6, 0, -4, 7], [7, 12, 8, 13], [4, 7, 5, 9],
              [11, 10, 12, 12], [5, 10, 8, 11], [-15, -13, 5, -12], [-3, 4, 0, 7], [11, -3, 12, -2],
              [9, -2, 10, 5], [10, -8, 11, -7], [11, 12, 12, 13], [4, 9, 5, 14], [11, 14, 12, 15],
              [10, 13, 11, 14], [-4, 1, -3, 7], [6, 14, 7, 15], [8, -6, 9, -5], [6, 7, 7, 8], [-15, -10, 0, -9],
              [-4, -15, 0, -14], [12, 13, 13, 14], [-7, -5, -6, -4], [-9, 9, -7, 14], [-7, 0, -6, 4],
              [-8, -11, 5, -10], [5, -14, 7, -11], [-4, 7, -3, 14], [-10, 7, -9, 13], [5, -15, 6, -14],
              [6, 11, 7, 12], [-8, -15, -7, -14], [11, 9, 12, 10], [-12, 13, -9, 14], [5, 14, 6, 15],
              [14, 12, 15, 13], [8, -5, 9, 4], [-15, 14, -14, 15], [12, -15, 13, -6], [-4, 14, 0, 15],
              [8, 13, 9, 14], [9, 5, 10, 15], [7, -11, 8, -10], [0, 14, 1, 15], [14, 8, 15, 11], [-9, 7, -7, 9],
              [5, 7, 6, 8], [-7, 7, -6, 14], [7, 14, 8, 15], [10, -4, 11, -2], [14, 6, 15, 8], [11, 1, 12, 2],
              [-8, 5, -7, 7], [-5, -9, -4, -3], [-15, -14, 5, -13], [0, -9, 8, -6], [6, -15, 7, -14],
              [10, -6, 11, -4], [4, 14, 5, 15], [12, 6, 13, 12], [8, 12, 9, 13], [-2, -9, 0, 0], [2, -15, 5, -14],
              [3, 14, 4, 15], [-7, -9, -6, -5], [10, 14, 11, 15], [0, -6, 8, -5], [-6, -3, -4, 0],
              [-7, -4, -6, -2], [8, 14, 9, 15], [-14, 8, -13, 14], [8, -8, 9, -6], [13, -3, 14, -2], [-3, 0, 0, 4],
              [7, 7, 8, 8], [7, 8, 8, 9], [13, -15, 14, -3], [0, -10, 5, -9], [10, -2, 11, 0], [-7, -12, 5, -11],
              [10, 0, 11, 10], [12, 12, 13, 13], [12, 14, 13, 15], [14, 14, 15, 15], [-7, -15, -4, -14],
              [8, 8, 9, 11], [11, -11, 12, -8], [9, -11, 10, -6], [5, 11, 6, 12], [8, -11, 9, -10], [7, 11, 8, 12],
              [-6, -9, -5, -3], [14, 2, 15, 5], [5, -10, 6, -9], [-14, 7, -13, 8], [-13, 13, -12, 14],
              [10, -15, 11, -8], [12, 3, 13, 6], [-15, -9, -11, 4], [-15, 7, -14, 8], [14, -15, 15, -14],
              [13, 11, 14, 12], [5, 9, 8, 10], [-15, -15, -13, -14], [9, -14, 10, -13], [9, -13, 10, -11],
              [13, 14, 14, 15], [-15, 8, -14, 14], [11, 3, 12, 4], [-13, 7, -10, 13], [14, 11, 15, 12],
              [-7, 4, -6, 5], [-15, -11, -8, -10], [-8, -9, -7, 5], [14, -14, 15, 2], [0, -5, 8, -3], [8, 4, 9, 5],
              [7, 13, 8, 14], [14, 5, 15, 6], [2, 14, 3, 15], [1, 14, 2, 15], [-15, -12, -7, -11],
              [9, -15, 10, -14], [7, -14, 8, -11], [6, -10, 7, -9], [13, -2, 14, 11], [11, 13, 12, 14],
              [-4, -5, -3, -3], [8, -15, 9, -13], [5, 12, 6, 14], [7, -10, 8, -9], [-4, -9, -3, -5], [5, 8, 7, 9],
              [13, 13, 14, 14], [-15, 4, -11, 7], [-14, 14, -4, 15], [-6, 7, -4, 14], [-10, 1, -8, 7],
              [-9, -15, -8, -14]
            ]
          ],
          false
        ],
        [
          [
            [
              [10, -3, 11, -2], [-15, -15, -14, -14], [7, 7, 8, 9], [8, -1, 11, 1], [-13, 7, -12, 8], [8, 5, 9, 6],
              [-4, 14, -2, 15], [-11, 8, -10, 11], [10, 6, 11, 7], [-15, 12, -14, 13], [14, 7, 15, 10],
              [1, -15, 2, -14], [7, 2, 9, 3], [-1, -15, 0, -14], [5, 13, 6, 14], [7, -15, 8, -13], [4, 13, 5, 14],
              [-8, 11, -7, 13], [-6, -14, -1, -13], [13, 4, 14, 5], [11, 1, 14, 3], [7, -1, 8, 1], [-3, 13, 1, 14],
              [-15, -12, -10, -6], [13, -1, 15, 1], [7, -2, 10, -1], [5, -14, 6, -13], [-10, -15, -7, -14],
              [-14, 9, -13, 11], [0, -8, 1, -2], [9, 5, 12, 6], [-14, 5, -13, 9], [10, -9, 11, -8],
              [8, -14, 10, -13], [-10, 8, -9, 9], [6, -10, 7, -3], [13, 5, 14, 6], [14, -13, 15, -12],
              [9, -3, 10, -2], [10, -13, 11, -12], [13, 11, 14, 15], [11, 6, 12, 7], [5, -8, 6, -3],
              [-9, 8, -8, 9], [7, -3, 9, -2], [14, -7, 15, -3], [9, 4, 12, 5], [-14, -15, -10, -14],
              [13, -14, 14, -13], [11, -3, 12, -2], [11, -7, 12, -6], [-12, -2, -10, 0], [8, -15, 10, -14],
              [-14, 12, -12, 13], [-12, 5, 7, 8], [-13, 0, -12, 2], [12, -14, 13, -13], [-15, 13, -6, 14],
              [8, 1, 10, 2], [7, 4, 8, 5], [4, -3, 5, -2], [-6, 12, 2, 13], [10, -6, 11, -5], [6, -3, 7, -2],
              [10, 2, 11, 3], [10, -14, 11, -13], [14, -9, 15, -7], [-15, 14, -11, 15], [7, 13, 8, 15],
              [10, -10, 11, -9], [12, 5, 13, 6], [9, 2, 10, 3], [-6, -13, 0, -6], [-10, -2, 7, 0], [14, 1, 15, 3],
              [5, 11, 7, 12], [11, -8, 14, -7], [4, -11, 5, -8], [14, 4, 15, 5], [-14, -2, -13, 3], [8, 9, 13, 15],
              [10, -2, 11, -1], [-3, -15, -2, -14], [-13, -1, -12, 0], [14, -14, 15, -13], [-15, -3, -6, -2],
              [11, -14, 12, -13], [-13, 10, -12, 11], [13, -15, 14, -14], [5, 12, 7, 13], [7, 3, 8, 4],
              [14, 10, 15, 12], [5, -13, 6, -8], [-12, 0, 7, 2], [-14, -13, -6, -12], [-15, -6, -6, -3],
              [7, 6, 8, 7], [-11, 14, -6, 15], [8, 6, 9, 7], [-1, -14, 0, -13], [6, -15, 7, -13], [-6, 14, -5, 15],
              [14, 6, 15, 7], [-13, 8, -12, 10], [1, 13, 4, 14], [11, -12, 14, -8], [-15, 5, -14, 7],
              [4, -4, 5, -3], [12, 6, 14, 7], [2, 11, 5, 12], [0, -15, 1, -14], [6, 13, 7, 14], [-15, 4, -14, 5],
              [-4, 13, -3, 14], [8, 4, 9, 5], [8, 3, 9, 4], [-13, -2, -12, -1], [4, -8, 5, -4],
              [-14, -14, -6, -13], [10, -7, 11, -6], [13, 7, 14, 11], [-12, 11, -8, 12], [-14, 11, -12, 12],
              [-8, 8, 7, 9], [-5, 14, -4, 15], [-12, 8, -11, 11], [1, -14, 2, -2], [10, -11, 11, -10],
              [-7, -15, -3, -14], [14, 3, 15, 4], [-2, 14, 2, 15], [12, -5, 14, -2], [-14, 3, -13, 5],
              [-15, 7, -14, 11], [-2, 3, 7, 4], [-6, 13, -4, 14], [2, -15, 4, -14], [11, -2, 13, -1],
              [7, 9, 8, 10], [10, -8, 11, -7], [10, -12, 11, -11], [10, 1, 11, 2], [11, -6, 12, -3],
              [13, -2, 15, -1], [7, 5, 8, 6], [2, -14, 4, -2], [-10, -12, -6, -6], [12, 3, 13, 4],
              [13, -13, 14, -12], [-10, 9, -9, 11], [-13, 2, -12, 7], [2, 12, 5, 13], [7, 10, 8, 13],
              [14, -15, 15, -14], [11, -15, 12, -14], [10, -15, 11, -14], [5, -3, 6, -2], [7, 1, 8, 2],
              [14, 5, 15, 6], [7, -8, 10, -3], [12, -15, 13, -14], [8, 7, 13, 9], [12, 4, 13, 5], [12, -7, 14, -5],
              [10, -4, 11, -3], [-2, -15, -1, -14], [-6, 11, 2, 12], [6, -13, 7, -10], [10, -5, 11, -4],
              [11, -1, 13, 1], [14, -12, 15, -11], [0, -14, 1, -8], [2, 14, 4, 15], [-15, -2, -14, 4],
              [-12, 3, -2, 4], [9, 6, 10, 7], [-12, 12, -10, 13], [-12, 4, 7, 5], [7, -13, 10, -8], [4, 14, 7, 15],
              [14, 12, 15, 13], [-15, -14, -14, -13], [11, -13, 13, -12], [-9, 10, 7, 11], [-9, 9, 7, 10],
              [4, -15, 5, -11], [14, -3, 15, -2], [-12, 2, 7, 3], [-15, 11, -14, 12], [-6, -6, 0, -2],
              [13, 3, 14, 4], [5, -15, 6, -14], [-15, -13, -14, -12], [14, -11, 15, -9], [9, 3, 12, 4],
              [-10, 12, -8, 13], [-7, 11, -6, 13], [14, 13, 15, 14], [14, 14, 15, 15]
            ]
          ],
          true
        ],
        [
          [
            [
              [10, -3, 11, -2], [-15, -15, -14, -14], [7, 7, 8, 9], [8, -1, 10, 1], [-13, 7, -12, 8], [8, 5, 9, 6],
              [-4, 14, -2, 15], [-11, 8, -10, 11], [10, 6, 11, 7], [-15, 12, -14, 13], [14, 7, 15, 10],
              [1, -15, 2, -14], [7, 2, 9, 3], [-1, -15, 0, -14], [5, 13, 6, 14], [7, -15, 8, -13], [4, 13, 5, 14],
              [-8, 11, -7, 13], [-6, -14, -1, -13], [13, 4, 14, 5], [11, 1, 14, 3], [7, -1, 8, 1], [-3, 13, 1, 14],
              [-15, -12, -10, -6], [13, -1, 15, 1], [7, -2, 10, -1], [5, -14, 6, -13], [-10, -15, -7, -14],
              [-14, 9, -13, 11], [0, -8, 1, -2], [9, 5, 12, 6], [-14, 5, -13, 9], [10, -9, 11, -8],
              [8, -14, 10, -13], [-10, 8, -9, 9], [6, -10, 7, -3], [13, 5, 14, 6], [14, -13, 15, -12],
              [9, -3, 10, -2], [10, -13, 11, -12], [13, 11, 14, 15], [11, 6, 12, 7], [5, -8, 6, -3],
              [-9, 8, -8, 9], [7, -3, 9, -2], [14, -7, 15, -3], [9, 4, 12, 5], [-14, -15, -10, -14],
              [13, -14, 14, -13], [11, -3, 12, -2], [11, -7, 12, -6], [-12, -2, -10, 0], [8, -15, 10, -14],
              [-14, 12, -12, 13], [-12, 5, 7, 8], [-13, 0, -12, 2], [12, -14, 13, -13], [-15, 13, -6, 14],
              [8, 1, 10, 2], [7, 4, 8, 5], [4, -3, 5, -2], [-6, 12, 2, 13], [10, -6, 11, -5], [6, -3, 7, -2],
              [10, 2, 11, 3], [10, -14, 11, -13], [14, -9, 15, -7], [-15, 14, -11, 15], [7, 13, 8, 15],
              [10, -10, 11, -9], [12, 5, 13, 6], [9, 2, 10, 3], [-6, -13, 0, -6], [-10, -2, 7, 0], [14, 1, 15, 3],
              [5, 11, 7, 12], [11, -8, 14, -7], [4, -11, 5, -8], [14, 4, 15, 5], [-14, -2, -13, 3], [8, 9, 13, 15],
              [10, -2, 11, -1], [-3, -15, -2, -14], [-13, -1, -12, 0], [14, -14, 15, -13], [-15, -3, -6, -2],
              [11, -14, 12, -13], [-13, 10, -12, 11], [13, -15, 14, -14], [5, 12, 7, 13], [7, 3, 8, 4],
              [14, 10, 15, 12], [5, -13, 6, -8], [-12, 0, 7, 2], [-14, -13, -6, -12], [-15, -6, -6, -3],
              [7, 6, 8, 7], [-11, 14, -6, 15], [8, 6, 9, 7], [-1, -14, 0, -13], [6, -15, 7, -13], [-6, 14, -5, 15],
              [14, 6, 15, 7], [-13, 8, -12, 10], [1, 13, 4, 14], [11, -12, 14, -8], [-15, 5, -14, 7],
              [4, -4, 5, -3], [12, 6, 14, 7], [2, 11, 5, 12], [0, -15, 1, -14], [6, 13, 7, 14], [-15, 4, -14, 5],
              [-4, 13, -3, 14], [8, 4, 9, 5], [8, 3, 9, 4], [-13, -2, -12, -1], [4, -8, 5, -4],
              [-14, -14, -6, -13], [10, -7, 11, -6], [13, 7, 14, 11], [-12, 11, -8, 12], [-14, 11, -12, 12],
              [-8, 8, 7, 9], [-5, 14, -4, 15], [-12, 8, -11, 11], [1, -14, 2, -2], [10, -11, 11, -10],
              [-7, -15, -3, -14], [14, 3, 15, 4], [-2, 14, 2, 15], [12, -5, 14, -2], [-14, 3, -13, 5],
              [-15, 7, -14, 11], [-2, 3, 7, 4], [-6, 13, -4, 14], [2, -15, 4, -14], [11, -2, 13, -1],
              [7, 9, 8, 10], [10, -8, 11, -7], [10, -12, 11, -11], [10, 1, 11, 2], [11, -6, 12, -3],
              [13, -2, 15, -1], [7, 5, 8, 6], [2, -14, 4, -2], [-10, -12, -6, -6], [12, 3, 13, 4],
              [13, -13, 14, -12], [-10, 9, -9, 11], [-13, 2, -12, 7], [2, 12, 5, 13], [7, 10, 8, 13],
              [14, -15, 15, -14], [11, -15, 12, -14], [10, -15, 11, -14], [5, -3, 6, -2], [7, 1, 8, 2],
              [14, 5, 15, 6], [7, -8, 10, -3], [12, -15, 13, -14], [8, 7, 13, 9], [12, 4, 13, 5], [12, -7, 14, -5],
              [10, -4, 11, -3], [-2, -15, -1, -14], [-6, 11, 2, 12], [6, -13, 7, -10], [10, -5, 11, -4],
              [11, -1, 13, 1], [14, -12, 15, -11], [0, -14, 1, -8], [2, 14, 4, 15], [-15, -2, -14, 4],
              [-12, 3, -2, 4], [9, 6, 10, 7], [-12, 12, -10, 13], [-12, 4, 7, 5], [7, -13, 10, -8], [4, 14, 7, 15],
              [14, 12, 15, 13], [-15, -14, -14, -13], [11, -13, 13, -12], [-9, 10, 7, 11], [-9, 9, 7, 10],
              [4, -15, 5, -11], [14, -3, 15, -2], [-12, 2, 7, 3], [-15, 11, -14, 12], [-6, -6, 0, -2],
              [13, 3, 14, 4], [5, -15, 6, -14], [-15, -13, -14, -12], [14, -11, 15, -9], [9, 3, 12, 4],
              [-10, 12, -8, 13], [-7, 11, -6, 13], [14, 13, 15, 14], [14, 14, 15, 15]
            ]
          ],
          false
        ]
      ]
    },
        solution: {
      approach: `<p>Two O(N) invariants: area equality and corner parity. Area rules out gaps without overlaps (and vice versa); the corner condition rules out the case where a gap and an overlap of equal area cancel. Together they are necessary and sufficient (a known result for this problem).</p>`,
      code: `class Solution {
    public boolean isRectangleCover(int[][] rects) {
        long area = 0;
        int minX = Integer.MAX_VALUE, minY = Integer.MAX_VALUE, maxX = Integer.MIN_VALUE, maxY = Integer.MIN_VALUE;
        Set<Long> corners = new HashSet<>();
        for (int[] r : rects) {
            area += (long) (r[2] - r[0]) * (r[3] - r[1]);
            minX = Math.min(minX, r[0]); minY = Math.min(minY, r[1]);
            maxX = Math.max(maxX, r[2]); maxY = Math.max(maxY, r[3]);
            for (long c : new long[]{key(r[0], r[1]), key(r[0], r[3]), key(r[2], r[1]), key(r[2], r[3])})
                if (!corners.add(c)) corners.remove(c);          // toggle: keeps odd-count corners
        }
        if (area != (long) (maxX - minX) * (maxY - minY)) return false;
        return corners.size() == 4
            && corners.contains(key(minX, minY)) && corners.contains(key(minX, maxY))
            && corners.contains(key(maxX, minY)) && corners.contains(key(maxX, maxY));
    }

    private long key(int x, int y) { return ((long) x << 32) ^ (y & 0xffffffffL); }
}`,
      alt: [{ lang: 'python', code: `class Solution:
    def is_rectangle_cover(self, rectangles):
        area, corners = 0, set()
        x1 = min(r[0] for r in rectangles)
        y1 = min(r[1] for r in rectangles)
        x2 = max(r[2] for r in rectangles)
        y2 = max(r[3] for r in rectangles)
        for a, b, c, d in rectangles:
            area += (c - a) * (d - b)
            corners ^= {(a, b), (a, d), (c, b), (c, d)}    # symmetric difference = toggle
        return (area == (x2 - x1) * (y2 - y1)
                and corners == {(x1, y1), (x1, y2), (x2, y1), (x2, y2)})` }, { lang: 'js', code: `function isRectangleCover(rects) {
  let area = 0, minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const corners = new Set();
  const toggle = (x, y) => { const k = x + ',' + y; if (!corners.delete(k)) corners.add(k); };
  for (const [x1, y1, x2, y2] of rects) {
    area += (x2 - x1) * (y2 - y1);                   // at most 2e4 * 4e10: still exact in a double
    minX = Math.min(minX, x1); minY = Math.min(minY, y1);
    maxX = Math.max(maxX, x2); maxY = Math.max(maxY, y2);
    toggle(x1, y1); toggle(x1, y2); toggle(x2, y1); toggle(x2, y2);
  }
  if (area !== (maxX - minX) * (maxY - minY)) return false;
  return corners.size === 4 && [[minX, minY], [minX, maxY], [maxX, minY], [maxX, maxY]]
    .every(([x, y]) => corners.has(x + ',' + y));
}` }, { lang: 'cpp', code: `class Solution {
public:
    bool isRectangleCover(const vector<vector<int>>& rects) {
        long long area = 0;
        int minX = INT_MAX, minY = INT_MAX, maxX = INT_MIN, maxY = INT_MIN;
        set<pair<int, int>> corners;
        auto toggle = [&](int x, int y) {
            if (!corners.erase({x, y})) corners.insert({x, y});   // keeps odd-count corners
        };
        for (const auto& r : rects) {
            area += (long long)(r[2] - r[0]) * (r[3] - r[1]);
            minX = min(minX, r[0]); minY = min(minY, r[1]);
            maxX = max(maxX, r[2]); maxY = max(maxY, r[3]);
            toggle(r[0], r[1]); toggle(r[0], r[3]); toggle(r[2], r[1]); toggle(r[2], r[3]);
        }
        if (area != (long long)(maxX - minX) * (maxY - minY)) return false;
        return corners == set<pair<int, int>>{{minX, minY}, {minX, maxY}, {maxX, minY}, {maxX, maxY}};
    }
};` }, { lang: 'csharp', code: `public class Solution {
    public bool IsRectangleCover(int[][] rects) {
        long area = 0;
        int minX = int.MaxValue, minY = int.MaxValue, maxX = int.MinValue, maxY = int.MinValue;
        var corners = new HashSet<long>();
        foreach (var r in rects) {
            area += (long)(r[2] - r[0]) * (r[3] - r[1]);
            minX = Math.Min(minX, r[0]); minY = Math.Min(minY, r[1]);
            maxX = Math.Max(maxX, r[2]); maxY = Math.Max(maxY, r[3]);
            foreach (long c in new[] { Key(r[0], r[1]), Key(r[0], r[3]), Key(r[2], r[1]), Key(r[2], r[3]) })
                if (!corners.Add(c)) corners.Remove(c);          // toggle: keeps odd-count corners
        }
        if (area != (long)(maxX - minX) * (maxY - minY)) return false;
        return corners.Count == 4
            && corners.Contains(Key(minX, minY)) && corners.Contains(Key(minX, maxY))
            && corners.Contains(Key(maxX, minY)) && corners.Contains(Key(maxX, maxY));
    }

    private long Key(int x, int y) { return ((long)x << 32) ^ (y & 0xffffffffL); }
}` }],
      dry: { head: ['rectangle', 'area', 'corners toggled', 'set size after'], rows: [['[1,1,3,3]', '4', '(1,1) (1,3) (3,1) (3,3) added', '4'], ['[3,1,4,2]', '1', '(3,1) removed; (3,2) (4,1) (4,2) added', '6'], ['[3,2,4,4]', '2', '(3,2) (4,2) removed; (3,4) (4,4) added', '6'], ['[1,3,2,4]', '1', '(1,3) removed; (1,4) (2,3) (2,4) added', '8'], ['[2,3,3,4]', '1', '(2,3) (2,4) (3,3) (3,4) removed', '<span class="c-g">4 = outer corners, area 9 = 9 → true</span>']] },
      complexity: `<p>Time <b>O(N)</b> expected (hash set), space O(N).</p>`,
      followUps: ['Return the overlapping pair if not perfect (sweep line with an interval tree: O(N log N)).', 'Prove why area + corner parity is sufficient.']
    }
  });

  practice.push({
    title: 'Rectangle Area II (Union of Rectangles)', level: 'Hard', tags: ['sweep line', 'geometry', 'coordinate compression'], companies: ['Google', 'Amazon'],
    statement: `<p>Given N axis-aligned rectangles <code>[x1, y1, x2, y2]</code>, return the total area covered by their <b>union</b>, modulo 10<sup>9</sup> + 7. Overlapping parts count once. (LeetCode 850.)</p>`,
    constraints: `1 ≤ N ≤ 200, 0 ≤ coordinates ≤ 10<sup>9</sup>`,
    example: `<p><code>[[0,0,2,2],[1,0,2,3],[1,0,3,1]]</code> → ${H.c('g', '6')}. Strips: x∈[0,1] covers y∈[0,2] → 2; x∈[1,2] covers y∈[0,3] → 3; x∈[2,3] covers y∈[0,1] → 1. Total 6.</p>`,
    brute: {
      why: `<p>Coordinate-compress x and y (≤ 400 values each), mark every compressed cell each rectangle covers, then sum the areas of marked cells: <b>O(N<sup>3</sup>)</b> ≈ 200 × 400 × 400 = 3.2·10<sup>7</sup> — fine here, but 10<sup>12</sup> for N = 10<sup>4</sup>. The waste: re-marking cells one by one instead of measuring covered lengths per strip.</p>`,
      code: { lang: 'java', code: `class Solution {
    public int rectangleArea(int[][] rects) {
        TreeSet<Integer> xs = new TreeSet<>(), ys = new TreeSet<>();
        for (int[] r : rects) { xs.add(r[0]); xs.add(r[2]); ys.add(r[1]); ys.add(r[3]); }
        Integer[] X = xs.toArray(new Integer[0]), Y = ys.toArray(new Integer[0]);
        Map<Integer, Integer> xi = new HashMap<>(), yi = new HashMap<>();
        for (int i = 0; i < X.length; i++) xi.put(X[i], i);
        for (int i = 0; i < Y.length; i++) yi.put(Y[i], i);
        boolean[][] covered = new boolean[X.length][Y.length];
        for (int[] r : rects)
            for (int i = xi.get(r[0]); i < xi.get(r[2]); i++)
                for (int j = yi.get(r[1]); j < yi.get(r[3]); j++) covered[i][j] = true;
        long area = 0;
        for (int i = 0; i + 1 < X.length; i++)
            for (int j = 0; j + 1 < Y.length; j++)
                if (covered[i][j]) area += (long) (X[i + 1] - X[i]) * (Y[j + 1] - Y[j]);
        return (int) (area % 1_000_000_007L);
    }
}`, alt: [{ lang: 'python', code: String.raw`
class Solution:
    def rectangle_area(self, rectangles):
        xs = sorted({v for r in rectangles for v in (r[0], r[2])})
        ys = sorted({v for r in rectangles for v in (r[1], r[3])})
        xi = {v: i for i, v in enumerate(xs)}
        yi = {v: i for i, v in enumerate(ys)}
        covered = [[False] * len(ys) for _ in range(len(xs))]
        for r in rectangles:
            for i in range(xi[r[0]], xi[r[2]]):
                for j in range(yi[r[1]], yi[r[3]]):
                    covered[i][j] = True
        area = 0
        for i in range(len(xs) - 1):
            for j in range(len(ys) - 1):
                if covered[i][j]:
                    area += (xs[i + 1] - xs[i]) * (ys[j + 1] - ys[j])
        return area % 1_000_000_007` }, { lang: 'js', code: String.raw`
function rectangleArea(rects) {
  const X = [...new Set(rects.flatMap((r) => [r[0], r[2]]))].sort((a, b) => a - b);
  const Y = [...new Set(rects.flatMap((r) => [r[1], r[3]]))].sort((a, b) => a - b);
  const xi = new Map(X.map((v, i) => [v, i])), yi = new Map(Y.map((v, i) => [v, i]));
  const covered = Array.from({ length: X.length }, () => new Array(Y.length).fill(false));
  for (const r of rects)
    for (let i = xi.get(r[0]); i < xi.get(r[2]); i++)
      for (let j = yi.get(r[1]); j < yi.get(r[3]); j++) covered[i][j] = true;
  let area = 0n;                                      // up to 1e18, so BigInt
  for (let i = 0; i + 1 < X.length; i++)
    for (let j = 0; j + 1 < Y.length; j++)
      if (covered[i][j]) area += BigInt(X[i + 1] - X[i]) * BigInt(Y[j + 1] - Y[j]);
  return Number(area % 1000000007n);
}` }, { lang: 'cpp', code: String.raw`
class Solution {
public:
    int rectangleArea(const vector<vector<int>>& rects) {
        set<int> xs, ys;
        for (auto& r : rects) { xs.insert(r[0]); xs.insert(r[2]); ys.insert(r[1]); ys.insert(r[3]); }
        vector<int> X(xs.begin(), xs.end()), Y(ys.begin(), ys.end());
        map<int, int> xi, yi;
        for (int i = 0; i < (int)X.size(); i++) xi[X[i]] = i;
        for (int i = 0; i < (int)Y.size(); i++) yi[Y[i]] = i;
        vector<vector<char>> covered(X.size(), vector<char>(Y.size(), 0));
        for (auto& r : rects)
            for (int i = xi[r[0]]; i < xi[r[2]]; i++)
                for (int j = yi[r[1]]; j < yi[r[3]]; j++) covered[i][j] = 1;
        long long area = 0;
        for (int i = 0; i + 1 < (int)X.size(); i++)
            for (int j = 0; j + 1 < (int)Y.size(); j++)
                if (covered[i][j]) area += (long long)(X[i + 1] - X[i]) * (Y[j + 1] - Y[j]);
        return (int)(area % 1'000'000'007LL);
    }
};` }, { lang: 'csharp', code: `public class Solution {
    public int RectangleArea(int[][] rects) {
        var xs = new SortedSet<int>();
        var ys = new SortedSet<int>();
        foreach (var r in rects) { xs.Add(r[0]); xs.Add(r[2]); ys.Add(r[1]); ys.Add(r[3]); }
        int[] X = xs.ToArray(), Y = ys.ToArray();
        var xi = new Dictionary<int, int>();
        var yi = new Dictionary<int, int>();
        for (int i = 0; i < X.Length; i++) xi[X[i]] = i;
        for (int i = 0; i < Y.Length; i++) yi[Y[i]] = i;
        bool[,] covered = new bool[X.Length, Y.Length];
        foreach (var r in rects)
            for (int i = xi[r[0]]; i < xi[r[2]]; i++)
                for (int j = yi[r[1]]; j < yi[r[3]]; j++) covered[i, j] = true;
        long area = 0;
        for (int i = 0; i + 1 < X.Length; i++)
            for (int j = 0; j + 1 < Y.Length; j++)
                if (covered[i, j]) area += (long)(X[i + 1] - X[i]) * (Y[j + 1] - Y[j]);
        return (int)(area % 1000000007L);
    }
}` }] }
    },
    mcq: { q: 'In the sweep, what do you multiply between two consecutive event x-coordinates?', options: ['The number of active rectangles × strip width', 'The total length of the UNION of active y-intervals × strip width', 'The sum of active y-interval lengths × strip width', 'The largest active y-interval × strip width'], answer: 1, explain: 'Inside a vertical strip with no events the covered set is constant: the union of the active y-intervals. Summing raw lengths would double-count overlaps.' },
    hints: [
      `<p>Hint 1: Sweep a vertical line left to right. Between two consecutive rectangle edges (events) the covered cross-section does not change.</p>`,
      `<p>Hint 2: Events: (x1, open, y1, y2) and (x2, close, y1, y2). Before applying an event at x, add coveredY × (x − prevX).</p>`,
      `<p>Hint 3: coveredY = length of the union of active y-intervals: sort them and merge (Merge Intervals). Keep the sum in a 64-bit integer (≤ 10<sup>18</sup>; <code>BigInt</code> in JavaScript), take mod at the end. A segment tree over compressed y makes it O(N log N).</p>`
    ],
    tests: {
      sig: 'int[][] -> int',
      fn: 'rectangleArea',
      cases: [
        [[[[0, 0, 2, 2], [1, 0, 2, 3], [1, 0, 3, 1]]], 6],
        [[[[0, 0, 1000000000, 1000000000]]], 49],
        [[[[0, 0, 1, 1]]], 1],
        [[[[0, 0, 1, 1], [0, 0, 1, 1]]], 1],
        [[[[0, 0, 2, 2], [1, 1, 3, 3]]], 7],
        [[[[0, 0, 1, 1], [1, 1, 2, 2]]], 2],
        [[[[0, 0, 3, 3], [1, 1, 2, 2]]], 9],
        [[[[0, 0, 1000000000, 1], [0, 0, 1, 1000000000]]], 999999992],
        [[[[0, 0, 1000000000, 1000000000], [0, 0, 1000000000, 1000000000]]], 49],
        [[[[0, 0, 1000000000, 500000000], [0, 500000000, 1000000000, 1000000000]]], 49],
        [[[[0, 0, 999999999, 999999999], [1, 1, 1000000000, 1000000000]]], 47],
        [[[[0, 0, 3, 1], [0, 2, 3, 3], [1, 0, 2, 3]]], 7],
        [
          [[[7, 7, 8, 10], [7, 1, 9, 3], [0, 5, 5, 10], [3, 6, 8, 9], [4, 6, 9, 7], [3, 2, 10, 8], [2, 8, 10, 9], [4, 3, 8, 7]]],
          69
        ],
        [
          [
            [
              [38, 22, 40, 50], [19, 22, 26, 40], [11, 4, 27, 41], [42, 8, 45, 35], [13, 39, 48, 50],
              [19, 20, 26, 33], [9, 4, 44, 12], [25, 38, 31, 44], [44, 15, 46, 20], [35, 18, 36, 19],
              [20, 11, 39, 23], [47, 42, 49, 43], [22, 26, 31, 34], [25, 34, 27, 38], [43, 49, 48, 50],
              [20, 34, 35, 41], [39, 29, 45, 31], [16, 10, 30, 31], [5, 23, 40, 34], [40, 46, 47, 49],
              [3, 11, 31, 42], [14, 21, 26, 25], [21, 17, 30, 18], [2, 5, 25, 17], [29, 1, 35, 7], [1, 17, 39, 42],
              [25, 6, 30, 36], [10, 44, 41, 49], [39, 7, 43, 11], [33, 34, 41, 37]
            ]
          ],
          1907
        ],
        [
          [
            [
              [133821049, 329326677, 953934841, 811213020],
              [22424564, 123346680, 641735921, 853285367],
              [827138323, 936179826, 903925678, 958484476],
              [168535338, 337138205, 868150709, 969076346],
              [716461210, 199971053, 945134328, 980861668],
              [917841883, 95899681, 986603193, 810568543],
              [207995767, 379992685, 561058957, 817861450],
              [686544545, 697940184, 691388099, 942470147],
              [630005195, 371432231, 670726250, 583576338],
              [795560478, 973738644, 925396943, 987606128],
              [176240661, 599200868, 242249658, 657697309],
              [324099386, 951555730, 758463535, 968854768],
              [892549093, 626750459, 902795604, 925820372],
              [39483539, 910799792, 631522472, 948058698],
              [708232586, 693955664, 895296945, 698543743],
              [480801352, 976468964, 689127089, 992164364],
              [694411217, 673688790, 987582532, 864264962],
              [167496433, 162193299, 605728986, 265419972],
              [750008479, 265186960, 751352654, 664373607],
              [73779225, 581338453, 505365386, 611473065],
              [28686388, 427285357, 476583866, 756877350],
              [331113622, 928637360, 614775055, 954087798],
              [111183812, 59920838, 736549018, 486668298],
              [69621818, 514816761, 268165931, 815693304],
              [880555897, 205504560, 970551891, 514104471]
            ]
          ],
          51647401
        ],
        [
          [
            [
              [668, 994, 963, 997], [360, 574, 910, 735], [57, 893, 683, 987], [390, 705, 475, 960],
              [942, 226, 947, 565], [979, 687, 994, 884], [146, 794, 893, 996], [27, 644, 771, 972],
              [242, 591, 258, 998], [859, 948, 951, 979], [195, 998, 210, 999], [798, 649, 821, 967],
              [46, 370, 257, 916], [502, 129, 866, 652], [611, 665, 654, 964], [350, 479, 673, 516],
              [332, 489, 678, 688], [954, 504, 969, 588], [584, 253, 591, 627], [30, 155, 770, 770],
              [334, 909, 851, 928], [352, 811, 809, 977], [651, 156, 694, 733], [510, 513, 654, 851],
              [36, 43, 398, 694], [372, 411, 478, 801], [591, 920, 677, 994], [440, 618, 787, 825],
              [653, 288, 941, 338], [90, 499, 425, 944], [249, 764, 760, 977], [226, 492, 718, 880],
              [824, 619, 970, 903], [915, 318, 918, 891], [399, 686, 804, 736], [929, 666, 951, 724],
              [732, 724, 780, 804], [499, 118, 889, 156], [414, 322, 811, 809], [634, 677, 702, 777],
              [155, 99, 401, 742], [717, 803, 747, 824], [256, 203, 804, 671], [412, 579, 423, 765],
              [646, 760, 780, 980], [149, 671, 497, 985], [306, 137, 994, 194], [885, 763, 995, 787],
              [220, 853, 726, 887], [341, 712, 348, 995], [947, 238, 989, 667], [93, 59, 938, 847],
              [353, 376, 666, 405], [630, 371, 856, 712], [388, 558, 790, 768], [117, 21, 893, 608],
              [783, 980, 933, 985], [211, 146, 925, 306], [546, 645, 897, 856], [127, 729, 856, 902],
              [11, 476, 176, 655], [631, 437, 939, 591], [791, 167, 821, 255], [485, 391, 764, 523],
              [593, 200, 840, 557], [502, 833, 785, 910], [393, 94, 988, 450], [43, 683, 202, 742],
              [621, 397, 754, 684], [121, 836, 492, 893], [267, 548, 688, 553], [243, 118, 411, 399],
              [175, 882, 265, 886], [953, 748, 962, 794], [9, 502, 664, 591], [843, 195, 938, 988],
              [341, 642, 988, 908], [834, 388, 984, 738], [411, 901, 864, 922], [377, 817, 521, 980],
              [258, 659, 726, 802], [409, 733, 776, 938], [466, 735, 887, 849], [456, 985, 479, 989],
              [510, 73, 645, 673], [63, 267, 596, 455], [142, 204, 703, 585], [249, 225, 302, 636],
              [587, 795, 733, 992], [703, 281, 865, 730], [940, 688, 958, 968], [298, 177, 620, 318],
              [100, 456, 475, 591], [913, 261, 972, 444], [249, 102, 285, 255], [78, 365, 267, 743],
              [6, 673, 834, 702], [591, 357, 844, 921], [105, 613, 209, 901], [10, 203, 991, 976]
            ]
          ],
          942865
        ],
        [
          [
            [
              [910541123, 211181569, 948473893, 774839167],
              [852597147, 154022374, 874587534, 869231890],
              [915511518, 27739465, 999506054, 510031728],
              [58886508, 722329297, 344379640, 858770746],
              [578405260, 284548754, 593096216, 755418322],
              [585958284, 720828506, 842735742, 890783105],
              [150783285, 28926028, 208284258, 75097250],
              [564297857, 123545776, 585610044, 417915684],
              [820320573, 661326040, 945595691, 740356660],
              [665825038, 144943576, 711748562, 569200394],
              [148764948, 716101085, 769476505, 931160001],
              [591603635, 296717696, 596729973, 945779695],
              [325333439, 504459897, 986463376, 789896551],
              [640557540, 823875060, 861038434, 906194057],
              [91890164, 584675554, 227677793, 642066744],
              [268339843, 262709837, 891412382, 776698733],
              [696841678, 644350353, 716838421, 802757719],
              [595060372, 687361649, 596684513, 721266258],
              [612850462, 822336541, 701332329, 914842989],
              [621184633, 858415584, 871033947, 866447474],
              [31136231, 548481517, 578294715, 736217838],
              [665990924, 414205370, 912809439, 879505093],
              [728940177, 686900198, 941573141, 692322246],
              [352851499, 119323924, 833505061, 737180210],
              [70960943, 543837884, 202607341, 938295376],
              [535569393, 939897708, 539636461, 962158069],
              [377173551, 429402504, 922750340, 932086862],
              [263448756, 122370000, 950181400, 548887962],
              [369264252, 853530150, 797706346, 959674106],
              [8675481, 752049884, 269037137, 914836390],
              [475142649, 871373627, 536319962, 999101539],
              [833114067, 714587396, 899457573, 812442857],
              [76758021, 987761018, 795586150, 996453134],
              [46291352, 776694383, 445179321, 932859053],
              [103844158, 198809060, 234657604, 690958497],
              [584743823, 488803038, 729905167, 692973729],
              [90391380, 662353434, 746214653, 910994624],
              [521027350, 529218065, 583987586, 693123568],
              [919531144, 946397242, 944536980, 953719855],
              [692862623, 882818749, 783235139, 994626442],
              [709121098, 250714836, 856566116, 582030567],
              [317679867, 83542048, 352131705, 806759411],
              [822594205, 954657584, 824621071, 993033477],
              [402553341, 169025303, 876290521, 421204149],
              [447402715, 626596516, 465690773, 751352434],
              [959789897, 559514909, 993130247, 763912372],
              [463427114, 30993926, 466553382, 785310494],
              [347540923, 17759298, 439760372, 85367786],
              [562054953, 176843173, 656219882, 257570258],
              [645848680, 49483112, 926709160, 411094525],
              [968635867, 766291765, 981326782, 904276918],
              [692380474, 133357391, 994039648, 420164604],
              [474796871, 507806499, 848736721, 773828332],
              [856732732, 592789281, 878684772, 693761428],
              [546215408, 853102609, 794921522, 864285006],
              [528013156, 158169490, 535695381, 468090957],
              [814926101, 246814416, 846628065, 861576831],
              [217363643, 968788212, 855494530, 971465359],
              [579048825, 837668867, 850500587, 917795812],
              [423761829, 610324751, 919387730, 945493617],
              [870208171, 716944763, 997596293, 835493356],
              [78095232, 912793752, 230150554, 959604192],
              [281646421, 206309339, 379206884, 658016187],
              [216911164, 241290641, 690631373, 752585957],
              [668495031, 503266391, 975910183, 939239967],
              [717956239, 312558799, 775519281, 703773603],
              [665922828, 859572196, 694923330, 909319656],
              [135801173, 55329766, 183742767, 679566469],
              [962415761, 754970856, 982168429, 913041618],
              [799712703, 193833232, 937672642, 471980111],
              [969091032, 156377308, 991452220, 708819890],
              [986847699, 650776044, 994849612, 819833742],
              [740591752, 578400021, 905226983, 841038272],
              [779704944, 917946840, 868081033, 961895020],
              [629763908, 609201361, 829702928, 662460972],
              [999251609, 839167793, 999793430, 987758604],
              [923202693, 309735626, 957701813, 786007951],
              [470452856, 364680963, 838957947, 531546281],
              [676569628, 601413965, 800243120, 676933790],
              [287921379, 608483277, 953957710, 731538805],
              [803367578, 403951572, 838567855, 702949896],
              [95225419, 268356252, 146652385, 635563342],
              [160625907, 55367498, 743312584, 917616384],
              [790257559, 497858725, 873178287, 911558919],
              [226778860, 742351819, 802180470, 884464079],
              [60008794, 717928160, 986847521, 967010721],
              [878703348, 602347287, 914331307, 805679766],
              [879798744, 455772589, 978945285, 743273288],
              [45796756, 734495728, 959229426, 950805605],
              [324026700, 398583393, 936376414, 619922611],
              [576257432, 84337858, 604265467, 456602563],
              [640579524, 350797453, 684570651, 950533465],
              [747852330, 356003830, 853665754, 587755846],
              [554333569, 90007931, 817098361, 523593556],
              [662466291, 113346476, 824828430, 525737508],
              [861125841, 510953414, 917563740, 843614206],
              [253240086, 343476335, 532342581, 770877566],
              [66001648, 456240528, 728169633, 675953665],
              [182490836, 40617756, 496968601, 198491862],
              [385500224, 116477446, 706008777, 402273684],
              [468009807, 265698058, 875843242, 871939339],
              [562533695, 1978984, 673869581, 538527435],
              [358040853, 458839791, 841139012, 927423713],
              [693340607, 581340682, 758532696, 678740684],
              [907410903, 881796656, 930830087, 993303891],
              [599216425, 685526650, 708324577, 910976597],
              [947087344, 650952745, 959128378, 999300246],
              [192960908, 177043781, 539138687, 896860788],
              [317613031, 107879276, 835355752, 295843400],
              [161960192, 551003176, 780681578, 925069065],
              [944054156, 319856402, 995794161, 771254352],
              [559890845, 116053342, 697970339, 904489062],
              [889198247, 835938393, 978093749, 974443892],
              [928327737, 983465321, 972961969, 991590214],
              [281098714, 490983362, 979952526, 629408159],
              [363160902, 539343877, 385233728, 939690553],
              [386229949, 824298982, 904243915, 875146010],
              [467846719, 172415435, 608354771, 557751181],
              [199891225, 15713458, 857902125, 798852351],
              [16371726, 180563766, 833130337, 310163631],
              [669575390, 246517334, 877012125, 463551012],
              [447651310, 312641825, 552896643, 678800040],
              [776540984, 334223865, 873711154, 968728884],
              [529827934, 342853380, 598735758, 849294235],
              [111580971, 719103296, 563502952, 728208185],
              [560665069, 929141786, 588104570, 968823660],
              [180655469, 198028121, 422816215, 455322814],
              [461854693, 438413453, 728943401, 781230674],
              [293112588, 516900966, 611028168, 587412781],
              [565502081, 109868247, 782807533, 125555186],
              [230069116, 78025321, 763104148, 746131173],
              [371794260, 931154745, 915579997, 938525051],
              [9918222, 520707056, 764065503, 823887673],
              [387898789, 1684430, 525708820, 143871075],
              [435933475, 972047929, 450654251, 999447462],
              [130533432, 879327910, 749137989, 959693530],
              [882665383, 825587355, 911748834, 861155325],
              [360339349, 488002797, 393556498, 627594045],
              [540096868, 90006900, 694392264, 347146360],
              [743497677, 339735105, 875664327, 431731104],
              [663043329, 680396284, 779697453, 956154296],
              [844078963, 862143806, 880341275, 930312590],
              [63511471, 66167045, 792910921, 134366884],
              [346025620, 27035201, 578207363, 601396033],
              [557263674, 407926352, 827119058, 569944949],
              [415171143, 994981734, 760410635, 996707369],
              [525799920, 479911142, 582793839, 761068837],
              [33601879, 138091357, 470746353, 232156625],
              [284716386, 431983783, 319629637, 924519564],
              [52295936, 155702898, 892935026, 601848172],
              [736306104, 693872525, 812264419, 977531186],
              [626436388, 839801899, 752040986, 883962893],
              [782852209, 965950865, 853243560, 980288479],
              [177478104, 804220317, 926119603, 944411730],
              [419060071, 69677273, 510128160, 797394545],
              [823849494, 500059096, 871095837, 680824448],
              [491565593, 34722628, 546483608, 822752655],
              [220074120, 289119171, 822156117, 475742634],
              [637849183, 413575939, 828669116, 696711211],
              [782485962, 392993759, 815626592, 846215868],
              [158938406, 285732359, 981129797, 360259616],
              [789151682, 313936162, 937367193, 521906566],
              [168033860, 209418971, 662269133, 270366556],
              [67445630, 667910440, 980907936, 713689730],
              [405330258, 21180732, 913603573, 29054831],
              [440608585, 206578381, 594644720, 495206344],
              [597393947, 841123234, 758868823, 880569740],
              [888903677, 249260787, 954912592, 692245882],
              [566916355, 364386411, 708022225, 923406462],
              [645932901, 642785233, 879861183, 737829901],
              [548880357, 716571469, 682623952, 826619739],
              [227808560, 428685214, 680898336, 455120703],
              [844404161, 447505650, 914801717, 572945131],
              [192888826, 439660037, 759845786, 487121705],
              [852422056, 975771769, 890414207, 991239720],
              [700169042, 439862071, 872945896, 769880161],
              [405121731, 409021811, 970964462, 625259528],
              [252146910, 214844603, 583723185, 944103593],
              [328521764, 749480550, 343290122, 894256820],
              [931243915, 736068991, 983488587, 967562900],
              [370337592, 675501664, 966345194, 815569151],
              [954545684, 375338098, 999513426, 496625417],
              [108110696, 161110567, 252313951, 396747464],
              [106179529, 378747742, 415823841, 490092421],
              [498128252, 956565288, 935494388, 988051778],
              [579890952, 417731191, 778735690, 727210900],
              [257977508, 584413797, 726715752, 924111632],
              [71674789, 306384568, 362468223, 647071723],
              [918972753, 926619806, 930523121, 981908955],
              [307213981, 727592721, 620461477, 856158755],
              [552169541, 469800540, 891378083, 699292089],
              [83895661, 155738775, 644755719, 277109825],
              [522867159, 655334306, 737964639, 913175497],
              [328790765, 184938850, 411975546, 212063910],
              [986393320, 336514960, 992179501, 758710014],
              [113368309, 433770656, 411351408, 782635753],
              [14194750, 832111157, 663231855, 873924946],
              [198798373, 973601799, 439528774, 977750501],
              [947974072, 880524602, 964107048, 951165345],
              [519128286, 959035043, 829806183, 978439836]
            ]
          ],
          581306485
        ],
        [
          [
            [
              [15, 61, 83, 91], [82, 44, 93, 52], [75, 99, 93, 100], [86, 27, 97, 63], [37, 8, 58, 66],
              [24, 38, 68, 62], [61, 90, 65, 92], [80, 91, 91, 96], [17, 51, 56, 73], [96, 27, 99, 45],
              [6, 56, 67, 98], [67, 50, 88, 78], [87, 29, 89, 57], [94, 27, 95, 33], [8, 64, 81, 74],
              [21, 38, 85, 82], [73, 47, 83, 49], [55, 64, 73, 78], [35, 17, 68, 82], [53, 54, 63, 77],
              [71, 84, 76, 85], [40, 82, 67, 92], [25, 0, 32, 23], [56, 47, 76, 50], [70, 21, 93, 83],
              [67, 72, 79, 92], [77, 31, 91, 48], [58, 17, 61, 79], [95, 55, 97, 73], [21, 22, 64, 99],
              [11, 94, 32, 97], [52, 96, 74, 97], [98, 59, 100, 98], [22, 48, 32, 65], [83, 23, 85, 88],
              [30, 4, 36, 60], [28, 27, 94, 52], [14, 90, 95, 91], [43, 29, 47, 77], [76, 87, 91, 94],
              [33, 56, 85, 90], [57, 4, 92, 76], [5, 46, 55, 70], [56, 83, 90, 85], [30, 56, 31, 64],
              [69, 1, 93, 6], [66, 40, 99, 74], [38, 64, 42, 68], [77, 56, 80, 59], [21, 66, 73, 72],
              [20, 76, 79, 85], [19, 53, 64, 54], [80, 5, 92, 33], [38, 38, 59, 82], [36, 21, 97, 43],
              [6, 92, 16, 94], [64, 43, 98, 54], [9, 15, 92, 22], [61, 44, 99, 63], [10, 44, 93, 56],
              [12, 45, 45, 89], [46, 44, 76, 54], [89, 23, 94, 60], [58, 19, 68, 84], [71, 42, 85, 99],
              [63, 56, 99, 85], [55, 25, 75, 47], [79, 74, 100, 94], [50, 98, 82, 100], [3, 33, 88, 64],
              [39, 56, 88, 83], [31, 44, 64, 77], [82, 94, 86, 96], [54, 59, 97, 97], [36, 90, 66, 100],
              [35, 70, 75, 92], [22, 83, 64, 100], [13, 18, 72, 80], [1, 99, 86, 100], [7, 72, 11, 91],
              [22, 98, 40, 99], [41, 86, 49, 88], [86, 30, 89, 82], [67, 70, 80, 71], [41, 53, 97, 94],
              [55, 22, 95, 83], [9, 38, 59, 92], [61, 12, 81, 34], [11, 69, 47, 100], [46, 6, 88, 18],
              [54, 48, 89, 56], [86, 7, 93, 91], [23, 18, 40, 97], [95, 86, 97, 90], [25, 70, 52, 79],
              [3, 81, 90, 92], [55, 17, 71, 64], [80, 37, 81, 51], [25, 74, 64, 81], [31, 20, 78, 80],
              [51, 75, 89, 77], [27, 57, 54, 68], [18, 85, 29, 90], [19, 38, 38, 53], [65, 61, 67, 83],
              [29, 16, 49, 36], [83, 82, 92, 88], [83, 8, 98, 97], [80, 80, 86, 90], [85, 78, 86, 96],
              [93, 85, 98, 95], [95, 51, 100, 58], [77, 33, 98, 35], [59, 1, 96, 22], [63, 1, 72, 5],
              [45, 96, 62, 100], [39, 8, 80, 20], [10, 12, 32, 56], [29, 60, 58, 83], [33, 94, 59, 100],
              [46, 14, 95, 53], [98, 90, 99, 94], [72, 22, 97, 94], [38, 9, 63, 50], [35, 59, 63, 86],
              [31, 93, 35, 99], [63, 99, 96, 100], [88, 62, 92, 77], [33, 72, 40, 78], [66, 10, 70, 51],
              [49, 2, 58, 62], [25, 97, 82, 98], [54, 41, 60, 96], [1, 88, 60, 94], [8, 18, 53, 73],
              [61, 72, 96, 91], [60, 64, 66, 66], [27, 61, 44, 78], [2, 4, 28, 70], [1, 79, 59, 98],
              [17, 90, 67, 94], [80, 62, 89, 79], [49, 0, 70, 21], [37, 66, 100, 92], [15, 56, 43, 58],
              [23, 20, 76, 99], [34, 57, 74, 74], [81, 52, 90, 79], [53, 36, 85, 71], [85, 39, 86, 84],
              [61, 18, 62, 80], [80, 77, 99, 86], [33, 50, 70, 72], [15, 65, 88, 86], [10, 22, 17, 87],
              [44, 6, 51, 61], [47, 15, 98, 55], [75, 16, 80, 65], [97, 40, 100, 54], [11, 82, 55, 84],
              [86, 53, 89, 82], [33, 46, 65, 69], [24, 74, 69, 91], [62, 61, 64, 70], [74, 67, 88, 79],
              [43, 66, 60, 82], [15, 60, 52, 79], [22, 49, 95, 50], [41, 78, 95, 85], [28, 42, 99, 92],
              [23, 53, 32, 78], [43, 22, 95, 77], [97, 74, 100, 81], [58, 88, 95, 93], [1, 18, 64, 84],
              [45, 58, 93, 71], [55, 25, 58, 41], [89, 2, 92, 98], [58, 43, 95, 81], [94, 13, 100, 38],
              [53, 91, 86, 97], [77, 38, 82, 46], [91, 73, 94, 85], [61, 31, 85, 44], [53, 52, 79, 61],
              [16, 59, 34, 82], [56, 61, 62, 76], [45, 47, 70, 76], [55, 57, 87, 82], [31, 44, 47, 64],
              [91, 20, 93, 40], [22, 53, 42, 85], [95, 17, 100, 26], [49, 14, 50, 76], [94, 11, 99, 70],
              [33, 5, 62, 41], [31, 88, 57, 100], [22, 66, 81, 68], [15, 8, 42, 54], [20, 79, 60, 88]
            ]
          ],
          9601
        ]
      ]
    },
        solution: {
      approach: `<p>Sweep line over x with an active multiset of y-intervals; at each event, the strip area = (union length of active intervals) × (strip width). O(N) events × O(N log N) merge = O(N<sup>2</sup> log N), fine for N = 200. The union area is at most 10<sup>18</sup>, which fits in a 64-bit integer (JavaScript needs <code>BigInt</code>, because 10<sup>18</sup> is past 2<sup>53</sup>), so a single final mod is safe.</p>`,
      code: `class Solution {
    public int rectangleArea(int[][] rects) {
        List<int[]> events = new ArrayList<>();                 // {x, type, y1, y2}
        for (int[] r : rects) {
            events.add(new int[]{r[0], 1, r[1], r[3]});        // left edge: open
            events.add(new int[]{r[2], -1, r[1], r[3]});       // right edge: close
        }
        events.sort((a, b) -> Integer.compare(a[0], b[0]));
        List<int[]> active = new ArrayList<>();
        long area = 0;
        int prevX = events.get(0)[0];
        for (int[] e : events) {
            area += coveredY(active) * (long) (e[0] - prevX);  // strip [prevX, x)
            prevX = e[0];
            if (e[1] == 1) active.add(new int[]{e[2], e[3]});
            else {
                for (int i = 0; i < active.size(); i++)
                    if (active.get(i)[0] == e[2] && active.get(i)[1] == e[3]) { active.remove(i); break; }
            }
        }
        return (int) (area % 1_000_000_007L);
    }

    // Length of the union of y-intervals (Merge Intervals).
    private long coveredY(List<int[]> active) {
        if (active.isEmpty()) return 0;
        List<int[]> iv = new ArrayList<>(active);
        iv.sort((a, b) -> Integer.compare(a[0], b[0]));
        long total = 0;
        int lo = iv.get(0)[0], hi = iv.get(0)[1];
        for (int[] s : iv) {
            if (s[0] > hi) { total += hi - lo; lo = s[0]; hi = s[1]; }   // gap: close the block
            else hi = Math.max(hi, s[1]);                                  // overlap: extend
        }
        return total + (hi - lo);
    }
}`,
      alt: [{ lang: 'python', code: `class Solution:
    def rectangle_area(self, rectangles):
        events = []
        for x1, y1, x2, y2 in rectangles:
            events.append((x1, 1, y1, y2))           # left edge: open
            events.append((x2, -1, y1, y2))          # right edge: close
        events.sort()
        active, area, prev_x = [], 0, events[0][0]

        def covered():
            # length of the union of the active y-intervals (Merge Intervals)
            total, top = 0, -1
            for lo, hi in sorted(active):
                if hi > top:
                    total += hi - max(lo, top)
                    top = hi
            return total

        for x, kind, y1, y2 in events:
            area += covered() * (x - prev_x)         # strip [prev_x, x)
            prev_x = x
            if kind == 1:
                active.append((y1, y2))
            else:
                active.remove((y1, y2))
        return area % (10 ** 9 + 7)` }, { lang: 'js', code: `function rectangleArea(rects) {
  const events = [];                                 // [x, type, y1, y2]
  for (const [x1, y1, x2, y2] of rects) {
    events.push([x1, 1, y1, y2]);                    // left edge: open
    events.push([x2, -1, y1, y2]);                   // right edge: close
  }
  events.sort((a, b) => a[0] - b[0]);
  let active = [];
  let area = 0n, prevX = events[0][0];               // BigInt: the area can reach 1e18, past 2^53
  const coveredY = () => {                           // length of the union of the y-intervals
    const iv = [...active].sort((a, b) => a[0] - b[0]);
    let total = 0, top = -Infinity;
    for (const [lo, hi] of iv) {
      if (hi > top) { total += hi - Math.max(lo, top); top = hi; }
    }
    return total;
  };
  for (const [x, type, y1, y2] of events) {
    area += BigInt(coveredY()) * BigInt(x - prevX);  // strip [prevX, x)
    prevX = x;
    if (type === 1) active.push([y1, y2]);
    else active.splice(active.findIndex((s) => s[0] === y1 && s[1] === y2), 1);
  }
  return Number(area % 1000000007n);
}` }, { lang: 'cpp', code: `class Solution {
    // Length of the union of y-intervals (Merge Intervals).
    static long long coveredY(vector<pair<int, int>> iv) {
        sort(iv.begin(), iv.end());
        long long total = 0;
        int top = INT_MIN;
        for (auto [lo, hi] : iv) {
            if (hi > top) { total += (long long)hi - max(lo, top); top = hi; }
        }
        return total;
    }
public:
    int rectangleArea(const vector<vector<int>>& rects) {
        vector<array<int, 4>> events;                // {x, type, y1, y2}
        for (const auto& r : rects) {
            events.push_back({r[0], 1, r[1], r[3]});     // left edge: open
            events.push_back({r[2], -1, r[1], r[3]});    // right edge: close
        }
        sort(events.begin(), events.end(), [](const auto& a, const auto& b) { return a[0] < b[0]; });
        vector<pair<int, int>> active;
        long long area = 0;                          // the union is at most 1e18: fits in 64 bits
        int prevX = events[0][0];
        for (const auto& e : events) {
            area += coveredY(active) * (e[0] - prevX);   // strip [prevX, x)
            prevX = e[0];
            if (e[1] == 1) active.push_back({e[2], e[3]});
            else active.erase(find(active.begin(), active.end(), make_pair(e[2], e[3])));
        }
        return area % 1000000007LL;
    }
};` }, { lang: 'csharp', code: `public class Solution {
    public int RectangleArea(int[][] rects) {
        var events = new List<int[]>();                         // {x, type, y1, y2}
        foreach (var r in rects) {
            events.Add(new[] { r[0], 1, r[1], r[3] });          // left edge: open
            events.Add(new[] { r[2], -1, r[1], r[3] });         // right edge: close
        }
        events.Sort((a, b) => a[0].CompareTo(b[0]));
        var active = new List<int[]>();
        long area = 0;
        int prevX = events[0][0];
        foreach (var e in events) {
            area += CoveredY(active) * (long)(e[0] - prevX);    // strip [prevX, x)
            prevX = e[0];
            if (e[1] == 1) active.Add(new[] { e[2], e[3] });
            else {
                for (int i = 0; i < active.Count; i++)
                    if (active[i][0] == e[2] && active[i][1] == e[3]) { active.RemoveAt(i); break; }
            }
        }
        return (int)(area % 1000000007L);
    }

    // Length of the union of y-intervals (Merge Intervals).
    private long CoveredY(List<int[]> active) {
        if (active.Count == 0) return 0;
        var iv = new List<int[]>(active);
        iv.Sort((a, b) => a[0].CompareTo(b[0]));
        long total = 0;
        int lo = iv[0][0], hi = iv[0][1];
        foreach (var s in iv) {
            if (s[0] > hi) { total += hi - lo; lo = s[0]; hi = s[1]; }   // gap: close the block
            else hi = Math.Max(hi, s[1]);                                  // overlap: extend
        }
        return total + (hi - lo);
    }
}` }],
      dry: { head: ['event x', 'strip', 'active before event', 'covered y', 'area +=', 'total'], rows: [['0 (open [0,2])', '—', '{}', '0', '0', '0'], ['1 (open [0,3], [0,1])', '[0,1]', '{[0,2]}', '2', '2', '2'], ['2 (close [0,2], [0,3])', '[1,2]', '{[0,2],[0,3],[0,1]}', '3', '3', '5'], ['3 (close [0,1])', '[2,3]', '{[0,1]}', '1', '1', '<span class="c-g">6</span>']] },
      complexity: `<p>Time <b>O(N<sup>2</sup> log N)</b>, space O(N). With a segment tree over compressed y storing "cover count + covered length": <b>O(N log N)</b> (see DSA 21).</p>`,
      followUps: ['N = 10<sup>5</sup>: implement the segment-tree version.', 'Perimeter of the union (IOI 1998 "Picture").', 'Union area of circles (numerical integration / Green\'s theorem on arcs).']
    }
  });

  practice.push({
    title: 'Erect the Fence II (Smallest Enclosing Circle)', level: 'Hard', tags: ['randomized', 'geometry', 'Welzl'], companies: ['Google'],
    statement: `<p>Given tree positions <code>trees[i] = [x, y]</code>, find the <b>smallest circle</b> that contains every tree (on or inside). Return <code>[x, y, r]</code>; answers within 10<sup>−5</sup> are accepted. (LeetCode 1924.)</p>`,
    constraints: `1 ≤ N ≤ 3000, 0 ≤ x, y ≤ 3000`,
    example: `<p><code>[[1,1],[2,2],[2,0],[2,4],[3,3],[4,2]]</code> → ${H.c('g', '[2.0, 2.0, 2.0]')} (through (2,0), (2,4), (4,2)…).</p><p><code>[[1,2],[2,2],[4,2]]</code> → ${H.c('g', '[2.5, 2.0, 1.5]')}: collinear points — the circle with diameter (1,2)–(4,2).</p>`,
    brute: {
      why: `<p>The optimal circle is determined by 2 boundary points (as a diameter) or 3 (circumcircle). Try every pair and triple — O(N<sup>3</sup>) candidates — and verify each against all N points: <b>O(N<sup>4</sup>)</b> ≈ 8·10<sup>13</sup> for N = 3000. Hopeless; even O(N<sup>3</sup>) is too slow.</p>`,
      code: { lang: 'java', code: `class Solution {
    public double[] outerTrees(int[][] t) {
        int n = t.length;
        if (n == 1) return new double[]{t[0][0], t[0][1], 0};
        double[] best = null;
        for (int i = 0; i < n; i++)
            for (int j = i + 1; j < n; j++) {
                best = better(best, circle2(t[i], t[j]), t);
                for (int k = j + 1; k < n; k++) best = better(best, circle3(t[i], t[j], t[k]), t);
            }
        return best;
    }
    private double[] better(double[] best, double[] c, int[][] t) {
        if (c == null || (best != null && c[2] >= best[2])) return best;
        for (int[] q : t) if (Math.hypot(q[0] - c[0], q[1] - c[1]) > c[2] + 1e-7) return best;  // O(N) verify
        return c;
    }
    private double[] circle2(int[] a, int[] b) {
        double cx = (a[0] + b[0]) / 2.0, cy = (a[1] + b[1]) / 2.0;
        return new double[]{cx, cy, Math.hypot(a[0] - cx, a[1] - cy)};
    }
    private double[] circle3(int[] a, int[] b, int[] c) {
        double bx = b[0] - a[0], by = b[1] - a[1], cx = c[0] - a[0], cy = c[1] - a[1];
        double d = 2 * (bx * cy - by * cx);
        if (d == 0) return null;                                  // collinear: no circumcircle
        double b2 = bx * bx + by * by, c2 = cx * cx + cy * cy;
        double ux = (cy * b2 - by * c2) / d, uy = (bx * c2 - cx * b2) / d;
        return new double[]{a[0] + ux, a[1] + uy, Math.hypot(ux, uy)};
    }
}`, alt: [{ lang: 'python', code: String.raw`
import math

class Solution:
    def outer_trees(self, trees):
        t = trees
        n = len(t)
        if n == 1:
            return [t[0][0], t[0][1], 0]
        best = None
        for i in range(n):
            for j in range(i + 1, n):
                best = self.better(best, self.circle2(t[i], t[j]), t)
                for k in range(j + 1, n):
                    best = self.better(best, self.circle3(t[i], t[j], t[k]), t)
        return best

    def better(self, best, c, t):
        if c is None or (best is not None and c[2] >= best[2]):
            return best
        for q in t:
            if math.hypot(q[0] - c[0], q[1] - c[1]) > c[2] + 1e-7:   # O(N) verify
                return best
        return c

    def circle2(self, a, b):
        cx, cy = (a[0] + b[0]) / 2.0, (a[1] + b[1]) / 2.0
        return [cx, cy, math.hypot(a[0] - cx, a[1] - cy)]

    def circle3(self, a, b, c):
        bx, by, cx, cy = b[0] - a[0], b[1] - a[1], c[0] - a[0], c[1] - a[1]
        d = 2 * (bx * cy - by * cx)
        if d == 0:
            return None                               # collinear: no circumcircle
        b2, c2 = bx * bx + by * by, cx * cx + cy * cy
        ux, uy = (cy * b2 - by * c2) / d, (bx * c2 - cx * b2) / d
        return [a[0] + ux, a[1] + uy, math.hypot(ux, uy)]` }, { lang: 'js', code: String.raw`
function outerTrees(t) {
  const n = t.length;
  if (n === 1) return [t[0][0], t[0][1], 0];
  const circle2 = (a, b) => {
    const cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2;
    return [cx, cy, Math.hypot(a[0] - cx, a[1] - cy)];
  };
  const circle3 = (a, b, c) => {
    const bx = b[0] - a[0], by = b[1] - a[1], cx = c[0] - a[0], cy = c[1] - a[1];
    const d = 2 * (bx * cy - by * cx);
    if (d === 0) return null;                         // collinear: no circumcircle
    const b2 = bx * bx + by * by, c2 = cx * cx + cy * cy;
    const ux = (cy * b2 - by * c2) / d, uy = (bx * c2 - cx * b2) / d;
    return [a[0] + ux, a[1] + uy, Math.hypot(ux, uy)];
  };
  const better = (best, c) => {
    if (c === null || (best !== null && c[2] >= best[2])) return best;
    for (const q of t) if (Math.hypot(q[0] - c[0], q[1] - c[1]) > c[2] + 1e-7) return best;   // O(N) verify
    return c;
  };
  let best = null;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      best = better(best, circle2(t[i], t[j]));
      for (let k = j + 1; k < n; k++) best = better(best, circle3(t[i], t[j], t[k]));
    }
  return best;
}` }, { lang: 'cpp', code: String.raw`
class Solution {
    vector<double> better(const vector<double>& best, const vector<double>& c, const vector<vector<int>>& t) {
        if (c.empty() || (!best.empty() && c[2] >= best[2])) return best;
        for (auto& q : t) if (hypot(q[0] - c[0], q[1] - c[1]) > c[2] + 1e-7) return best;   // O(N) verify
        return c;
    }

    vector<double> circle2(const vector<int>& a, const vector<int>& b) {
        double cx = (a[0] + b[0]) / 2.0, cy = (a[1] + b[1]) / 2.0;
        return {cx, cy, hypot(a[0] - cx, a[1] - cy)};
    }

    vector<double> circle3(const vector<int>& a, const vector<int>& b, const vector<int>& c) {
        double bx = b[0] - a[0], by = b[1] - a[1], cx = c[0] - a[0], cy = c[1] - a[1];
        double d = 2 * (bx * cy - by * cx);
        if (d == 0) return {};                        // collinear: no circumcircle
        double b2 = bx * bx + by * by, c2 = cx * cx + cy * cy;
        double ux = (cy * b2 - by * c2) / d, uy = (bx * c2 - cx * b2) / d;
        return {a[0] + ux, a[1] + uy, hypot(ux, uy)};
    }

public:
    vector<double> outerTrees(const vector<vector<int>>& t) {
        int n = t.size();
        if (n == 1) return {(double)t[0][0], (double)t[0][1], 0};
        vector<double> best;
        for (int i = 0; i < n; i++)
            for (int j = i + 1; j < n; j++) {
                best = better(best, circle2(t[i], t[j]), t);
                for (int k = j + 1; k < n; k++) best = better(best, circle3(t[i], t[j], t[k]), t);
            }
        return best;
    }
};` }, { lang: 'csharp', code: `public class Solution {
    public double[] OuterTrees(int[][] t) {
        int n = t.Length;
        if (n == 1) return new double[] { t[0][0], t[0][1], 0 };
        double[] best = null;
        for (int i = 0; i < n; i++)
            for (int j = i + 1; j < n; j++) {
                best = Better(best, Circle2(t[i], t[j]), t);
                for (int k = j + 1; k < n; k++) best = Better(best, Circle3(t[i], t[j], t[k]), t);
            }
        return best;
    }
    private double[] Better(double[] best, double[] c, int[][] t) {
        if (c == null || (best != null && c[2] >= best[2])) return best;
        foreach (var q in t) if (Hypot(q[0] - c[0], q[1] - c[1]) > c[2] + 1e-7) return best;  // O(N) verify
        return c;
    }
    private double Hypot(double x, double y) { return Math.Sqrt(x * x + y * y); }
    private double[] Circle2(int[] a, int[] b) {
        double cx = (a[0] + b[0]) / 2.0, cy = (a[1] + b[1]) / 2.0;
        return new[] { cx, cy, Hypot(a[0] - cx, a[1] - cy) };
    }
    private double[] Circle3(int[] a, int[] b, int[] c) {
        double bx = b[0] - a[0], by = b[1] - a[1], cx = c[0] - a[0], cy = c[1] - a[1];
        double d = 2 * (bx * cy - by * cx);
        if (d == 0) return null;                                  // collinear: no circumcircle
        double b2 = bx * bx + by * by, c2 = cx * cx + cy * cy;
        double ux = (cy * b2 - by * c2) / d, uy = (bx * c2 - cx * b2) / d;
        return new[] { a[0] + ux, a[1] + uy, Hypot(ux, uy) };
    }
}` }] }
    },
    mcq: { q: 'Why does Welzl\'s algorithm shuffle the points first?', options: ['To make the answer unique', 'So that a point falls outside the current circle rarely: the i-th point is on the final boundary with probability ≤ 3/i, giving expected O(N)', 'Because the circle must be computed in sorted order', 'To avoid floating-point error'], answer: 1, explain: 'Backwards analysis: the minimal circle of the first i points is fixed by at most 3 of them, so the i-th (random) point is one of them with probability ≤ 3/i. Expensive inner loops are entered rarely, and the expected total work telescopes to O(N).' },
    hints: [
      `<p>Hint 1: Build the answer incrementally. If the next point is already inside the current circle, nothing changes. If not, that point must lie <b>on</b> the boundary of the new minimal circle.</p>`,
      `<p>Hint 2: Nested loops: outer i (p<sub>i</sub> on boundary) → middle j &lt; i (p<sub>i</sub>, p<sub>j</sub> on boundary, start from the diameter circle) → inner k &lt; j (circumcircle of p<sub>i</sub>, p<sub>j</sub>, p<sub>k</sub>).</p>`,
      `<p>Hint 3: Shuffle first (random order) → expected O(N). Use an epsilon (~1e−7) in the "inside" test, and guard the circumcircle against a zero determinant (collinear) by falling back to the widest pair.</p>`
    ],
    tests: {
      sig: 'int[][] -> double[]',
      fn: 'outerTrees',
      cmp: 'float',
      cases: [
        [[[[1, 1], [2, 2], [2, 0], [2, 4], [3, 3], [4, 2]]], [2, 2, 2]],
        [[[[1, 2], [2, 2], [4, 2]]], [2.5, 2, 1.5]],
        [[[[7, 9]]], [7, 9, 0]],
        [[[[0, 0], [6, 8]]], [3, 4, 5]],
        [[[[3, 3], [3, 3], [3, 3]]], [3, 3, 0]],
        [[[[0, 0], [10, 0], [5, 1]]], [5, 0, 5]],
        [[[[0, 0], [4, 0], [2, 3]]], [2, 0.8333333333333334, 2.1666666666666665]],
        [[[[0, 0], [3000, 0], [0, 3000], [3000, 3000]]], [1500, 1500, 2121.3203435596424]],
        [[[[10, 15], [10, 5], [15, 10], [5, 10], [13, 14], [7, 6], [13, 6], [7, 14]]], [10, 10, 5]],
        [[[[0, 0], [1, 0], [2, 0], [3, 0], [9, 0], [5, 0], [4, 0]]], [4.5, 0, 4.5]],
        [[[[5, 0], [5, 1], [5, 2], [5, 7], [5, 3]]], [5, 3.5, 3.5]],
        [[[[0, 0], [0, 0], [8, 6], [8, 6]]], [4, 3, 5]],
        [[[[0, 0], [1, 1], [2, 2], [3, 3], [4, 4], [5, 5]]], [2.5, 2.5, 3.5355339059327378]],
        [[[[9, 10], [2, 17], [12, 6], [17, 0], [5, 3], [14, 14], [13, 3]]], [9.5, 8.5, 11.335784048754634]],
        [
          [
            [
              [1302, 536], [1645, 2649], [2479, 1718], [2802, 2529], [2826, 1345], [1896, 2530], [2067, 2190],
              [417, 895], [2323, 585], [1757, 2520], [129, 2832], [1173, 1401]
            ]
          ],
          [1371.412765805683, 1850.4829141867683, 1583.3399099309745]
        ],
        [
          [
            [
              [2986, 1494], [1131, 263], [1786, 2780], [1539, 163], [280, 1413], [2265, 2472], [1916, 186],
              [1377, 2308], [2369, 1990], [151, 620], [449, 2096], [1418, 1507], [2436, 1167], [834, 1540],
              [2166, 609], [1108, 644], [2685, 2948], [69, 2400], [1930, 66], [2606, 465], [1334, 1881],
              [2535, 2506], [1290, 1530], [1209, 2785], [1938, 1095], [2876, 1467], [2633, 2570], [893, 258],
              [1398, 2689], [769, 620]
            ]
          ],
          [1471.2075195280802, 1726.0842549466688, 1722.3153815893922]
        ],
        [
          [
            [
              [11, 46], [26, 25], [27, 29], [36, 45], [14, 0], [49, 49], [25, 14], [6, 15], [1, 13], [18, 9],
              [30, 1], [12, 15], [23, 45], [31, 11], [13, 19], [47, 47], [32, 17], [31, 4], [24, 34], [50, 41],
              [5, 48], [29, 30], [40, 8], [12, 11], [36, 1], [33, 20], [10, 23], [13, 15], [30, 41], [13, 0],
              [33, 46], [11, 49], [20, 48], [0, 32], [39, 2], [22, 35], [41, 47], [10, 43], [36, 24], [26, 25]
            ]
          ],
          [27.486792452830187, 27.081132075471697, 30.71245464075641]
        ],
        [
          [
            [
              [1405, 417], [1594, 441], [2807, 2646], [328, 694], [523, 2971], [2133, 1967], [2050, 823],
              [1016, 2239], [2905, 195], [1149, 1564], [2818, 34], [202, 2090], [2628, 1067], [2627, 178],
              [183, 666], [1851, 2333], [1496, 2680], [795, 2010], [2203, 1832], [445, 576], [2669, 2864],
              [592, 1171], [977, 1136], [1586, 1305], [351, 70], [1879, 2545], [334, 2185], [909, 2929],
              [1281, 689], [534, 2799], [1591, 378], [110, 1603], [1744, 1514], [856, 2569], [2826, 133],
              [221, 2201], [2082, 935], [2172, 1633], [238, 1907], [2842, 2554], [846, 2764], [579, 774],
              [497, 979], [98, 2163], [1906, 1951], [162, 572], [2435, 2216], [125, 327], [589, 105], [2026, 1839],
              [2965, 2121], [1881, 229], [2097, 1600], [2353, 202], [2397, 298], [711, 1183], [662, 732],
              [2497, 1261], [832, 1442], [2618, 613], [2196, 79], [147, 2992], [2660, 135], [1693, 1343],
              [2705, 2548], [2068, 616], [1141, 2892], [83, 1813], [139, 2219], [1924, 178], [863, 2925],
              [1295, 1809], [2920, 2451], [910, 555], [2942, 2397], [1285, 2505], [2584, 2501], [1854, 682],
              [490, 2466], [1010, 1897], [2974, 560], [1580, 1651], [1490, 1048], [1884, 399], [521, 875],
              [2449, 363], [246, 532], [1130, 872], [2103, 1469], [64, 337], [60, 1114], [717, 2861], [183, 2889],
              [1104, 2157], [2740, 413], [129, 1804], [2243, 491], [2244, 2983], [2392, 2782], [2851, 575],
              [2930, 2714], [2044, 2679], [758, 371], [458, 388], [985, 1970], [2611, 774], [1730, 2514],
              [52, 170], [228, 1861], [1770, 2385], [1367, 1994], [1365, 2630], [487, 2636], [131, 291],
              [1053, 1114], [1407, 373], [1199, 2699], [961, 2025], [937, 2255], [252, 2063], [2640, 1519],
              [2503, 494], [480, 1616], [1009, 1100], [247, 2811], [2339, 2160], [1805, 1853], [1197, 763],
              [1836, 2146], [2294, 1038], [154, 300], [441, 906], [2390, 921], [2564, 923], [1197, 2850],
              [1277, 1921], [2853, 1192], [187, 21], [2818, 1492], [1458, 865], [438, 2937], [606, 2244],
              [1450, 28], [1682, 2], [1501, 1589], [2141, 462], [1896, 2720], [907, 2510], [2256, 528], [2302, 29]
            ]
          ],
          [1482.4999992966036, 1512.9999993648507, 1992.7371251622728]
        ],
        [
          [
            [
              [2845, 2678], [2503, 2536], [1357, 2815], [797, 2666], [695, 2543], [2242, 2426], [917, 2608],
              [1387, 1186], [643, 1509], [2103, 898], [2114, 1240], [434, 1912], [1475, 1438], [1357, 2410],
              [704, 1120], [2156, 393], [2554, 715], [371, 377], [872, 746], [1406, 1011], [1606, 1702],
              [1916, 2720], [2648, 1373], [1095, 2164], [2903, 2982], [601, 564], [1284, 1097], [2852, 2413],
              [8, 2075], [676, 1160], [1958, 1172], [2424, 710], [1575, 2160], [2207, 323], [2531, 142],
              [2227, 2130], [358, 2032], [0, 990], [2733, 804], [1555, 402], [2771, 1858], [2840, 631],
              [887, 2038], [1709, 2184], [805, 733], [2381, 833], [347, 928], [2520, 1924], [1988, 1698],
              [854, 2845], [2538, 2085], [2339, 921], [2878, 994], [1732, 1627], [2961, 1132], [1023, 2789],
              [745, 1612], [2412, 2940], [462, 1610], [2394, 376], [1351, 2937], [1526, 2105], [2462, 407],
              [2909, 1571], [1378, 700], [882, 1420], [416, 888], [24, 933], [1029, 976], [1856, 670],
              [2304, 2938], [669, 1680], [77, 804], [1199, 11], [1438, 2835], [1347, 1206], [1200, 2367],
              [2833, 1984], [2079, 191], [1330, 586], [818, 2798], [1773, 765], [88, 1567], [2060, 724],
              [2402, 44], [2306, 423], [2747, 1312], [1741, 2303], [2075, 963], [2123, 161], [1811, 952],
              [1564, 583], [913, 2529], [1731, 901], [2506, 1289], [412, 335], [2880, 2652], [2393, 1690],
              [2088, 36], [1751, 1687], [2282, 1300], [1116, 2193], [1555, 798], [987, 409], [668, 117],
              [1902, 2282], [2566, 2227], [2811, 873], [1413, 2753], [274, 13], [609, 341], [2195, 986],
              [1511, 1911], [2790, 849], [1322, 2803], [1129, 2445], [748, 240], [1704, 453], [2035, 2803],
              [1149, 1522], [1370, 2008], [743, 684], [295, 57], [939, 1499], [1635, 2036], [2403, 943],
              [1657, 582], [559, 1129], [2726, 2656], [100, 2499], [2737, 1659], [456, 2985], [2132, 1644],
              [2526, 268], [1790, 2660], [1426, 2577], [97, 345], [2942, 368], [2908, 1518], [1086, 788],
              [2232, 552], [1033, 2647], [280, 2453], [1495, 769], [2795, 1160], [194, 2092], [1623, 2161],
              [2854, 2664], [819, 2577], [1801, 1973], [1082, 2909], [1649, 2016], [2637, 818], [1949, 1133],
              [1699, 1404], [847, 758], [2745, 116], [557, 97], [1874, 1595], [2543, 2779], [2586, 1977],
              [107, 1787], [1253, 2122], [2379, 160], [1728, 279], [2982, 1879], [1574, 541], [2449, 746],
              [539, 744], [2, 204], [1926, 792], [584, 1039], [1327, 820], [703, 2675], [1084, 2595], [1696, 2379],
              [2217, 2257], [957, 1335], [2871, 2053], [1486, 506], [2221, 2987], [1914, 2338], [617, 2665],
              [2866, 569], [97, 1786], [271, 1708], [2984, 2786], [819, 1898], [784, 2863], [1759, 2005],
              [2342, 2125], [2398, 1785], [327, 2791], [886, 2515], [197, 561], [202, 1416], [2710, 1021],
              [1421, 1651], [1726, 1443], [540, 517], [1354, 2311], [1113, 65], [2245, 2800], [2483, 2319],
              [1710, 1304], [2766, 1177], [117, 448], [2905, 887], [1923, 2392], [2988, 1718], [2214, 998],
              [2485, 2718], [197, 1460], [529, 2179], [1192, 2004], [1604, 2179], [2629, 1608], [1938, 422],
              [542, 1413], [2596, 1459], [2541, 354], [416, 1950], [785, 724], [1414, 55], [327, 1338],
              [2718, 1053], [136, 931], [1304, 1812], [1680, 2676], [1394, 191], [2262, 1326], [2956, 1363],
              [2895, 1448], [810, 1561], [251, 2246], [1991, 1819], [792, 1788], [921, 2395], [1335, 2131],
              [2232, 879], [679, 2644], [54, 2028], [2567, 36], [6, 1690], [745, 343], [2722, 491], [2530, 2207],
              [2159, 1650], [971, 2005], [1858, 1559], [1374, 784], [377, 2482], [1647, 873], [728, 2784],
              [1941, 2047], [544, 2448], [1909, 2339], [2795, 931], [2220, 732], [2239, 326], [2673, 2472],
              [1822, 96], [2719, 2062], [432, 2648], [1659, 771], [267, 1257], [47, 861], [665, 234], [2601, 2277],
              [1349, 1364], [1275, 2343], [227, 2985], [2470, 479], [1251, 992], [1936, 2452], [344, 2094],
              [2943, 106], [1115, 271], [2787, 427], [191, 1894], [499, 1223], [1578, 2365], [1551, 682],
              [2625, 224], [1758, 1636], [1582, 2491], [2717, 740], [2629, 936], [739, 2125], [1171, 1273],
              [2325, 2580], [261, 2394], [486, 2311], [838, 800], [2970, 717], [113, 1454], [2995, 2800],
              [865, 1360], [614, 260], [1705, 107]
            ]
          ],
          [1518.1331726122162, 1524.4608229848673, 2010.5413654369454]
        ],
        [
          [
            [
              [22, 16], [29, 14], [27, 8], [9, 15], [10, 6], [17, 14], [14, 22], [14, 6], [14, 25], [28, 11],
              [18, 14], [30, 6], [3, 20], [10, 10], [2, 11], [8, 19], [13, 3], [23, 26], [17, 16], [26, 18],
              [18, 20], [19, 24], [5, 4], [8, 21], [3, 11], [5, 13], [22, 4], [28, 5], [25, 15], [3, 27], [8, 13],
              [3, 12], [25, 1], [2, 23], [4, 8], [29, 21], [16, 4], [3, 19], [19, 4], [16, 22], [0, 27], [20, 17],
              [27, 29], [26, 30], [21, 2], [23, 24], [5, 28], [8, 9], [2, 7], [24, 7], [15, 19], [4, 29], [17, 24],
              [24, 22], [25, 17], [26, 14], [1, 20], [11, 25], [27, 21], [0, 18], [12, 0], [15, 8], [25, 6],
              [29, 23], [2, 28], [29, 15], [6, 15], [13, 3], [4, 24], [26, 2], [14, 9], [0, 28], [17, 2], [19, 29],
              [3, 14], [6, 6], [25, 13], [13, 17], [5, 9], [7, 26], [30, 9], [1, 17], [26, 21], [2, 18], [10, 28],
              [15, 30], [29, 13], [2, 21], [29, 30], [16, 21], [29, 8], [3, 16], [17, 0], [27, 19], [20, 21],
              [17, 24], [24, 4], [25, 6], [7, 18], [3, 1], [11, 3], [1, 27], [21, 9], [15, 18], [24, 16], [13, 22],
              [14, 1], [19, 3], [4, 6], [21, 8], [4, 10], [3, 22], [11, 30], [4, 26], [17, 1], [28, 22], [4, 28],
              [2, 12], [12, 10], [10, 26], [1, 19], [6, 18], [3, 25], [20, 4], [15, 4], [29, 27], [1, 11],
              [24, 23], [16, 22], [23, 8], [1, 24], [6, 24], [14, 25], [16, 11], [16, 14], [15, 11], [6, 25],
              [23, 11], [13, 29], [4, 21], [18, 21], [24, 14], [9, 0], [6, 4], [11, 19], [18, 16], [11, 24],
              [6, 13], [26, 0], [22, 14], [0, 0], [21, 16], [10, 10], [9, 30], [4, 5], [13, 16], [26, 29],
              [12, 16], [12, 26], [1, 20], [11, 2], [10, 8], [20, 15], [16, 29], [15, 27], [24, 4], [19, 19],
              [22, 0], [20, 24], [18, 26], [10, 25], [7, 11], [4, 27], [3, 3], [8, 10], [23, 25], [27, 25],
              [24, 5], [4, 8], [4, 2], [9, 14], [18, 30], [6, 15], [23, 7], [4, 24], [0, 8], [13, 26], [22, 24],
              [11, 18], [3, 10], [17, 2], [25, 25], [20, 16], [7, 9], [23, 12], [17, 15], [4, 2], [16, 10],
              [27, 3], [30, 2], [30, 14], [24, 22], [12, 23], [17, 23], [24, 10], [26, 15], [17, 17], [1, 16],
              [15, 1], [16, 13], [14, 9], [14, 14], [19, 14], [29, 4], [14, 27], [12, 13], [28, 30], [15, 11],
              [20, 4], [25, 24], [17, 29], [18, 12], [25, 12], [14, 16], [11, 25], [8, 6], [29, 16], [17, 11],
              [14, 1], [24, 5], [16, 1], [14, 29], [27, 28], [7, 5], [24, 6], [4, 19], [5, 14], [20, 2], [10, 0],
              [5, 0], [7, 26], [6, 8], [4, 6], [23, 8], [26, 29], [13, 20], [3, 10], [25, 12], [14, 23], [8, 20],
              [13, 29], [17, 4], [19, 27], [14, 20], [1, 14], [28, 14], [22, 8], [24, 12], [7, 2], [0, 4], [22, 1],
              [0, 24], [30, 30], [25, 17], [12, 11], [25, 22], [8, 3], [3, 16], [7, 5], [6, 2], [1, 24], [16, 21],
              [18, 25], [21, 3], [30, 13], [18, 5], [2, 23], [20, 12], [17, 11], [20, 6], [28, 4], [15, 17],
              [23, 15], [12, 13], [12, 18], [8, 27], [19, 27], [11, 7], [5, 26], [21, 15], [21, 12], [22, 21],
              [2, 1], [17, 4], [13, 7], [2, 1], [21, 13], [3, 12], [2, 17], [8, 10]
            ]
          ],
          [15.000000035559982, 14.999999964440022, 21.21320343559643]
        ],
        [
          [
            [
              [56, 1500], [406, 1500], [380, 1500], [1874, 1500], [592, 1500], [882, 1500], [2075, 1500],
              [2429, 1500], [1191, 1500], [2900, 1500], [2745, 1500], [156, 1500], [1524, 1500], [778, 1500],
              [2585, 1500], [1768, 1500], [2410, 1500], [1481, 1500], [465, 1500], [124, 1500], [1057, 1500],
              [1827, 1500], [1566, 1500], [439, 1500], [7, 1500], [500, 1500], [2964, 1500], [2349, 1500],
              [2781, 1500], [313, 1500], [2242, 1500], [357, 1500], [1987, 1500], [1090, 1500], [1653, 1500],
              [1771, 1500], [1043, 1500], [1955, 1500], [1347, 1500], [1050, 1500], [898, 1500], [470, 1500],
              [1572, 1500], [2650, 1500], [1596, 1500], [1330, 1500], [2583, 1500], [406, 1500], [2865, 1500],
              [1760, 1500], [1281, 1500], [1218, 1500], [1536, 1500], [2704, 1500], [1520, 1500], [1381, 1500],
              [559, 1500], [1883, 1500], [1945, 1500], [2521, 1500], [1398, 1500], [276, 1500], [703, 1500],
              [2111, 1500], [2815, 1500], [2735, 1500], [2109, 1500], [865, 1500], [1597, 1500], [1378, 1500],
              [194, 1500], [2365, 1500], [1619, 1500], [2617, 1500], [2987, 1500], [1535, 1500], [718, 1500],
              [920, 1500], [475, 1500], [1629, 1500], [2139, 1500], [1046, 1500], [390, 1500], [1835, 1500],
              [2103, 1500], [1322, 1500], [1578, 1500], [1998, 1500], [228, 1500], [1129, 1500], [2732, 1500],
              [2321, 1500], [1508, 1500], [2794, 1500], [2765, 1500], [1674, 1500], [1412, 1500], [2224, 1500],
              [2579, 1500], [564, 1500]
            ]
          ],
          [1497, 1500, 1490]
        ]
      ]
    },
        solution: {
      approach: `<p>Welzl's randomized incremental algorithm (iterative form). Random insertion order makes each level's "point outside" event rare (probability ≤ 2/i or 3/i), so the expected cost of the three nested loops is O(N) — a Las Vegas algorithm: always correct, randomly fast.</p>`,
      code: `class Solution {
    private static final double EPS = 1e-7;

    public double[] outerTrees(int[][] trees) {
        int n = trees.length;
        double[][] p = new double[n][];
        for (int i = 0; i < n; i++) p[i] = new double[]{trees[i][0], trees[i][1]};
        Random rnd = new Random(20260);
        for (int i = n - 1; i > 0; i--) {                    // Fisher-Yates: random order
            int j = rnd.nextInt(i + 1);
            double[] t = p[i]; p[i] = p[j]; p[j] = t;
        }
        double[] c = {p[0][0], p[0][1], 0};
        for (int i = 1; i < n; i++) {
            if (inside(c, p[i])) continue;
            c = new double[]{p[i][0], p[i][1], 0};           // p[i] is on the boundary
            for (int j = 0; j < i; j++) {
                if (inside(c, p[j])) continue;
                c = diameter(p[i], p[j]);                    // p[i], p[j] on the boundary
                for (int k = 0; k < j; k++) {
                    if (inside(c, p[k])) continue;
                    c = circumcircle(p[i], p[j], p[k]);      // all three on the boundary
                }
            }
        }
        return c;
    }

    private boolean inside(double[] c, double[] q) {
        return Math.hypot(q[0] - c[0], q[1] - c[1]) <= c[2] + EPS;
    }

    private double[] diameter(double[] a, double[] b) {
        double cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2;
        return new double[]{cx, cy, Math.hypot(a[0] - cx, a[1] - cy)};
    }

    private double[] circumcircle(double[] a, double[] b, double[] c) {
        double bx = b[0] - a[0], by = b[1] - a[1], cx = c[0] - a[0], cy = c[1] - a[1];
        double d = 2 * (bx * cy - by * cx);
        if (Math.abs(d) < 1e-12) {                           // collinear (rounding): widest pair
            double[] best = diameter(a, b), d2 = diameter(a, c), d3 = diameter(b, c);
            if (d2[2] > best[2]) best = d2;
            if (d3[2] > best[2]) best = d3;
            return best;
        }
        double b2 = bx * bx + by * by, c2 = cx * cx + cy * cy;
        double ux = (cy * b2 - by * c2) / d, uy = (bx * c2 - cx * b2) / d;
        return new double[]{a[0] + ux, a[1] + uy, Math.hypot(ux, uy)};
    }
}`,
      alt: [{ lang: 'python', code: `import math
import random

class Solution:
    def outer_trees(self, trees):
        pts = [(float(x), float(y)) for x, y in trees]
        random.shuffle(pts)                          # random order gives expected O(N)
        eps = 1e-7

        def inside(c, p):
            return math.hypot(p[0] - c[0], p[1] - c[1]) <= c[2] + eps

        def diameter(a, b):
            cx, cy = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
            return (cx, cy, math.hypot(a[0] - cx, a[1] - cy))

        def circumcircle(a, b, c):
            bx, by, cx, cy = b[0] - a[0], b[1] - a[1], c[0] - a[0], c[1] - a[1]
            d = 2 * (bx * cy - by * cx)
            if abs(d) < 1e-12:                       # collinear (rounding): widest pair
                return max(diameter(a, b), diameter(a, c), diameter(b, c), key=lambda t: t[2])
            b2, c2 = bx * bx + by * by, cx * cx + cy * cy
            ux, uy = (cy * b2 - by * c2) / d, (bx * c2 - cx * b2) / d
            return (a[0] + ux, a[1] + uy, math.hypot(ux, uy))

        c = (pts[0][0], pts[0][1], 0.0)
        for i in range(1, len(pts)):
            if inside(c, pts[i]):
                continue
            c = (pts[i][0], pts[i][1], 0.0)          # pts[i] is on the boundary
            for j in range(i):
                if inside(c, pts[j]):
                    continue
                c = diameter(pts[i], pts[j])         # pts[i], pts[j] on the boundary
                for k in range(j):
                    if not inside(c, pts[k]):
                        c = circumcircle(pts[i], pts[j], pts[k])   # all three on the boundary
        return list(c)` }, { lang: 'js', code: `function outerTrees(trees) {
  const p = trees.map(([x, y]) => [x, y]);
  for (let i = p.length - 1; i > 0; i--) {           // Fisher-Yates: random order gives expected O(N)
    const j = Math.floor(Math.random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  const EPS = 1e-7;
  const inside = (c, q) => Math.hypot(q[0] - c[0], q[1] - c[1]) <= c[2] + EPS;
  const diameter = (a, b) => {
    const cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2;
    return [cx, cy, Math.hypot(a[0] - cx, a[1] - cy)];
  };
  const circumcircle = (a, b, c) => {
    const bx = b[0] - a[0], by = b[1] - a[1], cx = c[0] - a[0], cy = c[1] - a[1];
    const d = 2 * (bx * cy - by * cx);
    if (Math.abs(d) < 1e-12) {                       // collinear (rounding): widest pair
      return [diameter(a, b), diameter(a, c), diameter(b, c)].reduce((u, v) => (v[2] > u[2] ? v : u));
    }
    const b2 = bx * bx + by * by, c2 = cx * cx + cy * cy;
    const ux = (cy * b2 - by * c2) / d, uy = (bx * c2 - cx * b2) / d;
    return [a[0] + ux, a[1] + uy, Math.hypot(ux, uy)];
  };
  let c = [p[0][0], p[0][1], 0];
  for (let i = 1; i < p.length; i++) {
    if (inside(c, p[i])) continue;
    c = [p[i][0], p[i][1], 0];                       // p[i] is on the boundary
    for (let j = 0; j < i; j++) {
      if (inside(c, p[j])) continue;
      c = diameter(p[i], p[j]);                      // p[i], p[j] on the boundary
      for (let k = 0; k < j; k++) {
        if (!inside(c, p[k])) c = circumcircle(p[i], p[j], p[k]);   // all three on the boundary
      }
    }
  }
  return c;
}` }, { lang: 'cpp', code: `class Solution {
    using P = array<double, 2>;
    using C = array<double, 3>;                      // {x, y, r}
    static constexpr double EPS = 1e-7;

    static bool inside(const C& c, const P& q) { return hypot(q[0] - c[0], q[1] - c[1]) <= c[2] + EPS; }

    static C diameter(const P& a, const P& b) {
        double cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2;
        return {cx, cy, hypot(a[0] - cx, a[1] - cy)};
    }

    static C circumcircle(const P& a, const P& b, const P& c) {
        double bx = b[0] - a[0], by = b[1] - a[1], cx = c[0] - a[0], cy = c[1] - a[1];
        double d = 2 * (bx * cy - by * cx);
        if (fabs(d) < 1e-12) {                       // collinear (rounding): widest pair
            C best = diameter(a, b);
            for (C o : {diameter(a, c), diameter(b, c)}) if (o[2] > best[2]) best = o;
            return best;
        }
        double b2 = bx * bx + by * by, c2 = cx * cx + cy * cy;
        double ux = (cy * b2 - by * c2) / d, uy = (bx * c2 - cx * b2) / d;
        return {a[0] + ux, a[1] + uy, hypot(ux, uy)};
    }

public:
    vector<double> outerTrees(const vector<vector<int>>& trees) {
        vector<P> p;
        for (const auto& t : trees) p.push_back({(double)t[0], (double)t[1]});
        mt19937 rng(random_device{}());
        shuffle(p.begin(), p.end(), rng);            // random order gives expected O(N)
        int n = p.size();
        C c = {p[0][0], p[0][1], 0};
        for (int i = 1; i < n; i++) {
            if (inside(c, p[i])) continue;
            c = {p[i][0], p[i][1], 0};               // p[i] is on the boundary
            for (int j = 0; j < i; j++) {
                if (inside(c, p[j])) continue;
                c = diameter(p[i], p[j]);            // p[i], p[j] on the boundary
                for (int k = 0; k < j; k++)
                    if (!inside(c, p[k])) c = circumcircle(p[i], p[j], p[k]);   // all three
            }
        }
        return {c[0], c[1], c[2]};
    }
};` }, { lang: 'csharp', code: `public class Solution {
    private const double EPS = 1e-7;

    public double[] OuterTrees(int[][] trees) {
        int n = trees.Length;
        double[][] p = new double[n][];
        for (int i = 0; i < n; i++) p[i] = new double[] { trees[i][0], trees[i][1] };
        var rnd = new Random(20260);
        for (int i = n - 1; i > 0; i--) {                    // Fisher-Yates: random order
            int j = rnd.Next(i + 1);
            double[] t = p[i]; p[i] = p[j]; p[j] = t;
        }
        double[] c = { p[0][0], p[0][1], 0 };
        for (int i = 1; i < n; i++) {
            if (Inside(c, p[i])) continue;
            c = new[] { p[i][0], p[i][1], 0 };               // p[i] is on the boundary
            for (int j = 0; j < i; j++) {
                if (Inside(c, p[j])) continue;
                c = Diameter(p[i], p[j]);                    // p[i], p[j] on the boundary
                for (int k = 0; k < j; k++) {
                    if (Inside(c, p[k])) continue;
                    c = Circumcircle(p[i], p[j], p[k]);      // all three on the boundary
                }
            }
        }
        return c;
    }

    private static double Hypot(double x, double y) { return Math.Sqrt(x * x + y * y); }

    private bool Inside(double[] c, double[] q) {
        return Hypot(q[0] - c[0], q[1] - c[1]) <= c[2] + EPS;
    }

    private double[] Diameter(double[] a, double[] b) {
        double cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2;
        return new[] { cx, cy, Hypot(a[0] - cx, a[1] - cy) };
    }

    private double[] Circumcircle(double[] a, double[] b, double[] c) {
        double bx = b[0] - a[0], by = b[1] - a[1], cx = c[0] - a[0], cy = c[1] - a[1];
        double d = 2 * (bx * cy - by * cx);
        if (Math.Abs(d) < 1e-12) {                           // collinear (rounding): widest pair
            double[] best = Diameter(a, b), d2 = Diameter(a, c), d3 = Diameter(b, c);
            if (d2[2] > best[2]) best = d2;
            if (d3[2] > best[2]) best = d3;
            return best;
        }
        double b2 = bx * bx + by * by, c2 = cx * cx + cy * cy;
        double ux = (cy * b2 - by * c2) / d, uy = (bx * c2 - cx * b2) / d;
        return new[] { a[0] + ux, a[1] + uy, Hypot(ux, uy) };
    }
}` }],
      dry: { head: ['step (order 1,2 | 2,2 | 4,2)', 'point', 'inside current?', 'new circle'], rows: [['start', '(1,2)', '—', 'centre (1,2), r 0'], ['i = 1', '(2,2)', 'no', 'diameter (1,2)-(2,2): centre (1.5,2), r 0.5'], ['i = 2', '(4,2)', 'no', 'start at (4,2) r 0; j = 0: (1,2) outside → diameter: centre (2.5,2), r 1.5'], ['i = 2, j = 1', '(2,2)', 'yes (distance 0.5 ≤ 1.5)', 'unchanged → answer [2.5, 2, 1.5]']] },
      complexity: `<p><b>Expected O(N)</b> time (worst case O(N<sup>3</sup>) with vanishing probability), O(N) space for the shuffled copy.</p>`,
      followUps: ['Prove the ≤ 3/i probability with backwards analysis.', 'Smallest enclosing sphere in 3D (same algorithm, up to 4 boundary points).', 'Why use a fixed seed in tests but a random seed in production?']
    }
  });

  // =====================================================================
  // QUIZ
  // =====================================================================
  quiz.push(
    { q: 'For A = (0,0), B = (4,0), C = (2,3), cross(A, B, C) = (B−A)×(C−A) equals…', options: ['−12: a right turn', '12: a left (counter-clockwise) turn', '0: collinear', '6: the triangle area'], answer: 1, explain: '(4,0)×(2,3) = 4·3 − 0·2 = 12 &gt; 0 → left turn. The triangle area is |12|/2 = 6, but the cross product itself is 12.' },
    { q: 'In a segment-intersection test you have two cross products c1, c2 up to 10<sup>18</sup>. How should you test "opposite sides"?', options: ['c1 * c2 &lt; 0', 'sign(c1) * sign(c2) &lt; 0 (compare the signs: Long.signum in Java, (c1 &gt; 0) - (c1 &lt; 0) in Python, JavaScript and C++)', '(double) c1 * c2 &lt; 0', 'c1 + c2 == 0'], answer: 1, explain: 'c1 * c2 overflows a 64-bit integer when both are near 10<sup>18</sup>. Comparing signs is exact; converting to double loses precision near zero.' },
    { q: 'Segments (0,0)–(2,2) and (3,3)–(5,5). All four orientations are 0. Do they intersect?', options: ['Yes — collinear segments always intersect', 'No — they are collinear but the bounding-box (on-segment) checks all fail', 'Yes — the general case o1 ≠ o2 fires', 'Undefined'], answer: 1, explain: 'Collinear is necessary but not sufficient. None of the endpoints lies inside the other segment\'s box (3 &gt; 2), so they are disjoint.' },
    { q: 'Andrew\'s monotone chain should keep points lying exactly on hull edges (Erect the Fence). The pop condition must be…', options: ['pop while cross ≤ 0', 'pop while cross &lt; 0', 'pop while cross ≥ 0', 'never pop collinear points, pop everything else'], answer: 1, explain: 'A point on a straight stretch makes cross = 0; popping only on strictly negative (right) turns keeps it. Remember to de-duplicate when all points are collinear.' },
    { q: 'The shoelace sum for a polygon comes out as −32. What do you conclude?', options: ['The input is invalid', 'Area 16, vertices listed clockwise', 'Area −16', 'Area 32, counter-clockwise'], answer: 1, explain: 'Area = |sum| / 2 = 16. The sign gives orientation: negative = clockwise, positive = counter-clockwise.' },
    { q: 'A lattice polygon has area 16 and 14 lattice points on its boundary. How many lattice points are strictly inside?', options: ['9', '10', '16', '23'], answer: 1, explain: 'Pick\'s theorem: A = I + B/2 − 1 → I = 16 − 7 + 1 = 10.' },
    { q: 'In reservoir sampling with k = 1, the 5th item of the stream should replace the current choice with probability…', options: ['1/2', '1/5', '4/5', '1/N'], answer: 1, explain: 'Keep the i-th item with probability 1/i. The survival products telescope so every item ends with 1/N.' },
    { q: 'Why is "for every i, swap a[i] with a[rand(0..n−1)]" a biased shuffle?', options: ['It never moves the first element', 'It has n<sup>n</sup> equally likely runs, which cannot divide evenly among n! permutations', 'It produces only cyclic permutations', 'It is unbiased; only speed differs'], answer: 1, explain: 'For n = 3: 27 runs vs 6 permutations; 27/6 is not an integer, so some permutations get 5 runs and others 4.' },
    { q: 'Randomized quickselect with a 3-way partition has which running time?', options: ['O(N) worst case', 'Expected O(N); worst case O(N<sup>2</sup>) with negligible probability', 'O(N log N) always', 'O(log N) expected'], answer: 1, explain: 'A random pivot is in the middle half with probability ½, shrinking the range to ≤ ¾ — a geometric series, so expected O(N). Bad luck on most rounds gives O(N²), but no input can force it.' },
    { q: 'A buffer grows by a fixed +100 slots whenever full. Appending N elements costs…', options: ['O(N) total, O(1) amortized', 'O(N<sup>2</sup>) total, O(N) amortized per append', 'O(N log N) total', 'O(1) total'], answer: 1, explain: 'Copies happen at sizes 100, 200, 300, …: their sum is ≈ N²/200 → quadratic. Only multiplicative growth gives O(1) amortized.' },
    { q: 'Which statement about amortized O(1) is TRUE?', options: ['Every single operation takes O(1) time', 'Any sequence of M operations takes O(M) total time, though one operation may be slow', 'It holds only for random inputs', 'It means expected O(1) over random choices'], answer: 1, explain: 'Amortized bounds are worst-case guarantees over sequences, not per operation and not probabilistic. Average-case assumes random inputs; expected assumes random choices.' },
    { q: 'A skip list with p = ½ holds 10<sup>6</sup> keys. Its height is most likely around…', options: ['2', '20', '1 000', '500 000'], answer: 1, explain: 'Expected height ≈ log<sub>2</sub>N ≈ 20 levels; each level holds about half of the nodes of the level below.' },
    { q: 'Union-find with union by rank AND path compression costs, per operation (amortized)…', options: ['O(1) exactly', 'O(α(N)) — inverse Ackermann, ≤ 4 in practice', 'O(log N)', 'O(√N)'], answer: 1, explain: 'Tarjan\'s bound: O(M α(N)) for M operations. With only one of the two optimisations you get O(log N).' },
    { q: 'Welzl\'s smallest-enclosing-circle algorithm (shuffle + incremental) is…', options: ['Monte Carlo: fast but sometimes wrong', 'Las Vegas: always correct, expected O(N) time', 'Deterministic O(N log N)', 'Approximate within 1%'], answer: 1, explain: 'Randomness only affects the running time; the returned circle is always the true minimum (up to floating-point tolerance).' }
  );

  // Spread the correct answers over different positions (deterministic re-ordering).
  (function () {
    var pattern = [1, 3, 0, 2, 1, 0, 2, 3, 1, 0, 2, 1, 3, 0];
    quiz.forEach(function (q, i) {
      var t = pattern[i % pattern.length] % q.options.length;
      var correct = q.options[q.answer];
      var others = q.options.filter(function (_, j) { return j !== q.answer; });
      others.splice(t, 0, correct);
      q.options = others;
      q.answer = t;
    });
  })();

  // =====================================================================
  // INTERVIEW Q&A
  // =====================================================================
  interview.push(
    { q: 'How do you decide whether three points make a left turn, a right turn, or are collinear? Why not compare slopes?', level: 'I', a: `<p>Compute <code>cross = (B.x − A.x)(C.y − A.y) − (B.y − A.y)(C.x − A.x)</code>. Positive → C is to the left of A→B (counter-clockwise turn), negative → right turn, zero → collinear. Its absolute value is twice the triangle area.</p><p>Slopes need division: vertical lines divide by zero and floating-point rounding breaks equality tests. The cross product uses only integer multiply/subtract, so with 64-bit integer arithmetic (<code>long</code> / <code>long long</code>; Python integers are unbounded) it is <b>exact</b> for coordinates up to ~10<sup>9</sup>. I code it once as a helper and build every other geometry routine on it.</p>`, followUps: ['What is the overflow limit for coordinates in 64-bit integers?', 'How would you handle double coordinates from GPS?', 'How do you sort points by angle without atan2?'] },
    { q: 'Walk me through checking whether two line segments intersect. Which cases break naive solutions?', level: 'A', a: `<p>Four orientations: o1 = orient(P1,P2,Q1), o2 = orient(P1,P2,Q2), o3 = orient(Q1,Q2,P1), o4 = orient(Q1,Q2,P2). If o1 ≠ o2 and o3 ≠ o4, they intersect (this already covers T-shaped touches). Otherwise check the four collinear cases: an orientation of 0 plus the point inside the other segment's bounding box.</p><p>Breakers: collinear-but-disjoint segments (all orientations 0 — must use the box check), touching at an endpoint, zero-length segments, overflow from multiplying two cross products (compare signs instead), and float slopes for vertical segments. For the crossing point use t = ((Q1−P1)×s)/(r×s), u = ((Q1−P1)×r)/(r×s), checking 0 ≤ t,u ≤ 1 with integer numerators before dividing.</p>`, followUps: ['How do you find whether ANY two of N segments intersect in O(N log N)?', 'Return the exact intersection as a fraction.'] },
    { q: 'Explain Andrew\'s monotone chain convex hull and its complexity.', level: 'A', a: `<p>Sort points by (x, y). Build the lower hull left to right with a stack: before pushing a point, pop while the last two stack points and the new point do not make a left turn (cross ≤ 0). Build the upper hull right to left the same way. Concatenate, dropping the duplicated endpoints.</p><p>Sorting is O(N log N); each point is pushed once and popped at most once per chain, so the scans are O(N) amortized — overall O(N log N), O(N) space. To keep collinear boundary points pop only on cross &lt; 0 and de-duplicate (all-collinear input puts every point in both chains). Edge cases: fewer than 3 points, duplicates, all collinear, many points with the same x.</p>`, followUps: ['Why is Ω(N log N) a lower bound?', 'How would you then find the farthest pair of points?', 'Graham scan vs monotone chain: which tie-breaking traps does Graham have?'] },
    { q: 'Is O(N log N) optimal for convex hull? What if the hull is tiny?', level: 'E', a: `<p>In the comparison model yes: map numbers x<sub>i</sub> to points (x<sub>i</sub>, x<sub>i</sub><sup>2</sup>) on a parabola — all are hull vertices and the hull lists them in sorted order, so a faster hull would sort faster than Ω(N log N).</p><p>But the bound can be refined by the output size H. Jarvis march (gift wrapping) is O(NH) — great when H is a small constant. Chan's algorithm combines Graham scans on groups of size m with Jarvis steps over the groups, guessing m = 2<sup>2<sup>t</sup></sup>, achieving O(N log H), which is optimal in terms of N and H. QuickHull is O(N log N) on average and extends well to 3D.</p>`, followUps: ['Describe Chan\'s algorithm\'s guessing schedule.', 'Which hull algorithm generalises best to 3D?'] },
    { q: 'How does the shoelace formula work, and when does it give a wrong answer?', level: 'I', a: `<p>For vertices listed in boundary order, 2·Area = |∑ (x<sub>i</sub>·y<sub>i+1</sub> − x<sub>i+1</sub>·y<sub>i</sub>)| with wrap-around. Each term is twice the signed area of triangle (origin, P<sub>i</sub>, P<sub>i+1</sub>); triangles outside the polygon are counted once positively and once negatively and cancel (it is Green's theorem). The signed sum is positive for counter-clockwise order.</p><p>Wrong answers: unordered vertices (garbage), self-intersecting polygons (net area — bow-tie lobes cancel), lat/long coordinates on a sphere (must project or use geodesic area), and overflow when summing large products — shift all points by P<sub>0</sub> first or use big integers (<code>BigInteger</code>, Python <code>int</code>, JavaScript <code>BigInt</code>).</p>`, followUps: ['How do you count interior lattice points?', 'How do you compute the centroid of a polygon?'] },
    { q: 'Design a point-in-polygon test for a geofencing service. What edge cases matter?', level: 'A', a: `<p>Core: ray casting (even-odd rule). Shoot a horizontal ray to the right of the point; count edges it crosses; odd = inside. Edge cases: the ray passing exactly through a vertex (use the half-open rule: count an edge only if low.y ≤ p.y &lt; high.y), horizontal edges (ignored by that rule), and points exactly on the boundary (detect with cross = 0 + bounding box and return a defined answer). Use exact integer math (cross product sign) rather than computing x-intersections in floating point.</p><p>For the service: for convex polygons O(log N) via binary search over the triangle fan; for many polygons put bounding boxes in an R-tree (or geohash/S2 cells) to shortlist candidates; use winding number if polygons may self-intersect; project lat/long appropriately.</p>`, followUps: ['How would you scale to 10<sup>6</sup> geofences and 10<sup>5</sup> queries per second?', 'Winding number vs even-odd: when do they differ?'] },
    { q: 'Explain reservoir sampling and prove that it is uniform.', level: 'A', a: `<p>To sample k items from a stream of unknown length: put the first k in the reservoir; for the item with 0-based index i ≥ k, draw j uniformly in [0, i]; if j &lt; k replace reservoir[j]. O(N) time, O(k) memory, one pass.</p><p>Proof by induction: after i items each is present with probability k/i. Item i enters with probability k/(i+1). An existing member is evicted with probability (k/(i+1))·(1/k) = 1/(i+1), so it stays with i/(i+1); k/i · i/(i+1) = k/(i+1). For k = 1 the chain (1/i)·(i/(i+1))···((N−1)/N) telescopes to 1/N. The sample is valid at every moment, so you can stop the stream any time.</p>`, followUps: ['Algorithm L: how do you skip items to reduce RNG calls?', 'What goes wrong if j is drawn from [0, i − 1] instead of [0, i]?'] },
    { q: 'You need a uniform sample of 10 000 events from logs spread across 100 servers, and some events should count more (weights). How?', level: 'E', a: `<p>Uniform case: each server keeps its own reservoir of size k plus its count n<sub>s</sub>. To merge, fill the global sample slot by slot: choose server s with probability proportional to its <i>remaining</i> count, then take a random unused item from its reservoir (sampling without replacement), decrementing counts. Simply concatenating and resampling uniformly would over-represent small servers.</p><p>Weighted case: A-Res (Efraimidis–Spirakis) — give each item the key u<sup>1/w</sup> with u uniform in (0,1), keep the k largest keys in a min-heap. Keys are comparable across machines, so a distributed version just keeps the top-k keys per server and merges with a final top-k — perfectly parallel. Use seeded, per-thread RNGs (SplittableRandom) for reproducibility.</p>`, followUps: ['Why are A-Res keys mergeable but Algorithm R reservoirs need counts?', 'How would you favour recent events (time-decayed sampling)?'] },
    { q: 'Write a fair shuffle and explain why the "obvious" version is biased.', level: 'I', a: `<p>Fisher–Yates: for i from n−1 down to 1, j = random in [0, i], swap a[i] and a[j]. Each run is one of n·(n−1)···2 = n! equally likely choice sequences, and different sequences give different permutations, so each permutation has probability exactly 1/n!.</p><p>The obvious version swaps a[i] with a random index in [0, n−1] for every i: n<sup>n</sup> equally likely runs. Since n! does not divide n<sup>n</sup> (for n = 3: 27 vs 6), some permutations must be more likely — ACB, BAC and BCA appear 5/27 times, the others 4/27. Also beware drawing j from [0, i − 1] (<code>nextInt(i)</code> in Java, <code>randrange(i)</code> in Python, <code>rnd() % i</code> in C++ — that is Sattolo's algorithm, which gives only single cycles), sorting with a random comparator, and RNGs whose seed space is smaller than n! (a 32-bit seed cannot reach most of 52! deck orders).</p>`, followUps: ['How do you shuffle a file too large for memory?', 'When would you deliberately use Sattolo\'s algorithm?'] },
    { q: 'Why is randomized quickselect expected O(N)? How do production libraries avoid its worst case?', level: 'A', a: `<p>Call a pivot good if it lies in the middle half of the current range — probability ½. A good pivot leaves at most ¾ of the range. The expected number of rounds between good pivots is 2, so the expected total work is at most 2·(N + ¾N + (¾)<sup>2</sup>N + …) = 8N = O(N). A sharper indicator-variable analysis gives ≈ 3.4N comparisons.</p><p>Worst case is O(N<sup>2</sup>) (consistently terrible pivots) and with many duplicates a 2-way partition degrades too — so use a 3-way partition. Libraries use <b>introselect</b> (C++ <code>nth_element</code>): quickselect with a depth limit, falling back to median-of-medians or heap-based selection, giving O(N) average and a guaranteed bound. Deterministic median-of-medians is O(N) worst case but has a large constant.</p>`, followUps: ['Derive the median-of-medians recurrence.', 'How can an adversary break a fixed pivot rule?'] },
    { q: 'Explain amortized analysis using the dynamic array. Show all three methods.', level: 'A', a: `<p>Doubling array: a push costs 1, or 1 + size when it triggers a copy. <b>Aggregate:</b> over N pushes, copies are 1 + 2 + 4 + … &lt; 2N, total &lt; 3N → O(1) amortized. <b>Accounting:</b> charge 3 coins per push; 1 pays the write, 2 are stored on the element. When size m doubles, the m/2 elements added since the last doubling hold m coins, enough to copy all m. <b>Potential:</b> Φ = 2·size − capacity; a normal push costs 1 + 2 = 3, a doubling push costs (1 + m) + (2 − m) = 3.</p><p>Shrinking must happen at ¼ full (not ½) to avoid thrashing; growth must be multiplicative (any constant factor &gt; 1), never additive, or the total becomes quadratic.</p>`, followUps: ['Why do some libraries (Java <code>ArrayList</code>, MSVC <code>vector</code>) grow by 1.5× instead of 2×?', 'Show the potential function for the binary counter.'] },
    { q: 'When is an amortized O(1) structure unacceptable, and what do you do instead?', level: 'E', a: `<p>When a single slow operation breaks a latency budget: trading systems, real-time audio, game frames at 16 ms, request p99 SLOs, interrupt handlers. A hash-map or dynamic-array resize copying 10<sup>8</sup> entries can stall for hundreds of milliseconds even though the average is tiny.</p><p>De-amortize: allocate the bigger table early and migrate a few entries on every operation (incremental resizing). Redis rehashes dictionaries incrementally with two tables live at once; Go maps (1.24+) are split into several small tables, so a growth step never rehashes the whole map; real-time GCs slice their work. Other options: pre-size with a known capacity, use structures with worst-case bounds (balanced trees, real-time queues), or move the rebuild off the hot path (copy-on-write snapshot built in the background).</p>`, followUps: ['How does incremental rehashing handle lookups during migration?', 'What happens to amortized bounds when you add rollback/undo?'] },
    { q: 'Compare a skip list with a red-black tree and a B-tree. Why does Java ship ConcurrentSkipListMap but no concurrent TreeMap?', level: 'E', a: `<p>All give ordered maps with O(log N) operations. Skip list: expected bounds via coin flips, very simple insert/delete (splice a few pointers, no rotations), easy range iteration, ~2 pointers per key at p = ½ (1.33 at p = ¼). Red-black tree: worst-case O(log N), compact, but rebalancing rotations touch several nodes. B-tree: wide nodes, far fewer cache misses or disk reads — the winner on disk and often in memory for read-heavy workloads.</p><p>Concurrency is the decider for Java: a skip-list insert changes a few local pointers and can be done with CAS, linking level 0 first (the node is then logically present) and higher levels afterwards, so lock-free designs are practical. Tree rotations modify shared structure near the root, which is hard to do lock-free. Redis sorted sets (skip list + hash, with spans for rank) and LevelDB/RocksDB memtables use skip lists for similar reasons.</p>`, followUps: ['How do spans let a skip list answer rank queries?', 'Why does Redis use p = 1/4?'] },
    { q: 'How do you make computational geometry code robust against floating-point errors?', level: 'E', a: `<p>First choice: keep inputs integral (scale fixed-point coordinates) and use exact integer predicates — orientation, in-circle — with enough width (64-bit integers, or 128-bit / big integers when products of products appear). Keep fractions as numerator/denominator until the end. Compare signs rather than multiplying large values.</p><p>When doubles are unavoidable: use tolerances scaled to the magnitude of the inputs, apply them consistently (one predicate function used everywhere), and avoid decisions that depend on two inconsistent epsilon tests. For production, use robust adaptive predicates (Shewchuk's), which evaluate quickly in floating point with an error bound and fall back to exact arithmetic only near zero; libraries like CGAL, JTS/GEOS use such techniques. Also randomise/perturb degenerate inputs (simulation of simplicity) and test with collinear, duplicate and huge-coordinate cases.</p>`, followUps: ['Why can an epsilon-based hull algorithm crash or loop?', 'What is the in-circle predicate used for?'] },
    { q: 'Union-find is "almost O(1)". What exactly is the bound, and when does it fail?', level: 'E', a: `<p>With union by rank (or size) and path compression, any sequence of M operations on N elements costs O(M·α(N)), where α is the inverse Ackermann function — at most 4 for any N that fits in the universe. It is an <b>amortized</b> bound (Tarjan, with a matching lower bound for pointer machines): a single find can still walk O(log N) links, but it flattens them so the cost does not repeat.</p><p>It fails when history is not linear. With <b>rollback</b> (offline dynamic connectivity, backtracking search), undoing unions lets an adversary replay expensive finds, and path compression cannot be cheaply undone. Then use union by rank only (O(log N) worst-case find, O(1) undo with a change stack). With only one optimisation the bound is O(log N).</p>`, followUps: ['Path compression vs path halving vs path splitting?', 'How does DSU with rollback support offline deletions?'] }
  );

  // =====================================================================
  // MODULE
  // =====================================================================
  registerModule({
    id: 'dsa26',
    title: 'Geometry, Randomized & Amortized Analysis',
    intro: `<p>This module collects three "expert toolkits" that interviewers love because they test <b>reasoning</b>, not memorised templates.</p>
      <ul>
        <li><b>Computational geometry</b> — everything grows from one five-line helper, the <b>cross product</b>: left/right turns, segment intersection, convex hull (Andrew's monotone chain and Graham scan), polygon area with the shoelace formula, convexity, Pick's theorem and point-in-polygon. You will learn to do it all with <b>exact integer arithmetic</b> and to hunt down the degenerate cases (collinear, touching, duplicates) that break naive code.</li>
        <li><b>Randomized algorithms</b> — reservoir sampling for streams of unknown length, the Fisher–Yates shuffle (and why the "obvious" shuffle is biased), randomized quickselect with expected O(N) time, rejection sampling and Welzl's smallest enclosing circle. You will learn to <b>prove</b> fairness and expected running times, not just write the code.</li>
        <li><b>Amortized analysis</b> — why appending to a dynamic array, monotonic stacks, two-stack queues and union-find are fast "on average over any sequence", using the aggregate, banker's and potential methods — and when a latency spike makes amortized structures unacceptable. We finish with <b>skip lists</b>, the randomized express-lane structure behind Java's ConcurrentSkipListMap, Redis sorted sets and LevelDB.</li>
      </ul>
      <p>Every topic starts with an everyday analogy, then a step-by-step visualizer you can feed your own input, worked examples, expert deep dives (overflow budgets, robustness, production systems) and how to work alongside AI on it.</p>`,
    goals: [
      'Decide left/right/collinear, segment intersection and point-on-segment with exact integer cross products — no slopes, no division',
      'Build a convex hull in O(N log N) with the monotone chain, handling collinear points, duplicates and all-collinear input',
      'Compute polygon area and orientation with the shoelace formula, test convexity, count lattice points with Pick\'s theorem, and run point-in-polygon',
      'Implement and prove reservoir sampling, Fisher–Yates and randomized quickselect; spot biased samplers and adversarial-pivot traps',
      'Prove amortized bounds with the aggregate, banker\'s and potential methods (dynamic array, binary counter, monotonic stack, union-find) and explain when to de-amortize',
      'Design a skip list (search / insert / erase) and compare it with balanced BSTs and B-trees for concurrency and range queries'
    ],
    prereqs: `DSA 2 (Complexity), DSA 3 (GCD, modular arithmetic), DSA 7 (Sorting, partitioning, intervals), DSA 10 (Binary Search), DSA 12 (Linked Lists), DSA 13 (Stacks, monotonic stack), DSA 15 (Heaps) and DSA 19 (Union-Find). Comfort with basic probability (independent events, expectation) helps for the randomized topics.`,
    hours: 16,
    langNotes: {
      java: `<p><b>Java:</b> use <code>long</code> for every cross product, area and Pick count: coordinates near 10<sup>9</sup> give products near 4·10<sup>18</sup>, and <code>int</code> overflow wraps silently. Compare signs with <code>Long.signum</code> instead of multiplying two cross products. In sort comparators use <code>Long.compare</code> / <code>Integer.compare</code>, never subtraction, which can overflow. <code>Random.nextInt(bound)</code> is uniform in <code>[0, bound)</code>, so "up to and including i" is <code>nextInt(i + 1)</code>; <code>Collections.shuffle</code> is Fisher–Yates. Pack a pair of ints into one <code>long</code> for a <code>HashMap</code> / <code>HashSet</code> key, or use <code>TreeMap</code> / <code>TreeSet</code> for ordered queries (<code>ceiling</code>, <code>subSet</code>). <code>PriorityQueue</code> is a min-heap (the weighted reservoir keeps the smallest key on top). Recursion here is shallow (gcd), so the default stack is fine.</p>`,
      python: `<p><b>Python:</b> integers never overflow, so cross products, areas, Pick counts and the 10<sup>18</sup> union area are exact; keep them integers (use <code>//</code>, and divide with <code>/</code> only at the very end). <code>random.randint(a, b)</code> includes <b>both ends</b> but <code>random.randrange(n)</code> stops at n − 1: the classic off-by-one in Fisher–Yates and reservoir sampling. <code>random.shuffle</code> and <code>random.sample</code> are built in. Tuples are hashable, so use them as set / dict keys for points and reduced slopes; lists are not. <code>heapq</code> is a min-heap (push <code>(key, index)</code> pairs), and an old-style comparator needs <code>functools.cmp_to_key</code>. <code>list.pop(0)</code> and <code>insert(0, x)</code> are O(n). There is no ordered set: use <code>bisect</code> on a sorted list or the third-party <code>sortedcontainers.SortedList</code>. No solution here recurses deeply, so the 1000-frame limit never matters.</p>`,
      js: `<p><b>JavaScript:</b> every <code>Number</code> is a double, exact for integers only up to 2<sup>53</sup> ≈ 9·10<sup>15</sup>. Cross products are safe for coordinates up to about 10<sup>7</sup>; near 10<sup>9</sup>, or for a union area up to 10<sup>18</sup>, switch to <code>BigInt</code> (and never mix <code>BigInt</code> with <code>Number</code> in one expression). <code>%</code> keeps the sign of the dividend and <code>|0</code> truncates to 32 bits. <code>sort()</code> compares as <em>strings</em> unless you pass a comparator: write <code>(a, b) =&gt; a[0] - b[0] || a[1] - b[1]</code>. <code>Math.random()</code> returns <code>[0, 1)</code>, so a uniform integer in <code>[0, n)</code> is <code>Math.floor(Math.random() * n)</code>; it cannot be seeded, so demos that must repeat use a tiny seeded generator. Arrays compare by reference: key a <code>Map</code> / <code>Set</code> by a string or a packed number. There is no built-in heap, so the weighted reservoir carries a small <code>MinHeap</code> class. Do not use <code>shift()</code> as a queue pop (O(n)).</p>`,
      cpp: `<p><b>C++:</b> signed overflow is undefined behaviour, so use <code>long long</code> for cross products and areas (products up to 4·10<sup>18</sup> fit; anything wider needs <code>__int128</code>). For randomness use an engine such as <code>mt19937</code> with <code>uniform_int_distribution&lt;int&gt;(0, i)</code> (inclusive on both ends) or <code>uniform_real_distribution</code>; avoid <code>rand() % n</code>, which is biased. <code>std::shuffle</code> is Fisher–Yates and <code>nth_element</code> is quickselect. A <code>sort</code> comparator must be a strict weak ordering (use <code>&lt;</code>, never <code>&lt;=</code>) or the sort may crash. <code>priority_queue</code> is a <b>max</b>-heap: pass <code>greater&lt;&gt;</code> for a min-heap. <code>pair</code> and <code>array</code> work as <code>map</code> / <code>set</code> keys; <code>unordered_map</code> needs a hash for them, so pack two ints into one <code>long long</code>. <code>set</code> / <code>map</code> are balanced trees (O(log n), <code>lower_bound</code> is the ceiling); <code>unordered_map</code> is O(1) on average. Anything you <code>new</code> must be freed (see the skip list destructor).</p>`
    },
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
