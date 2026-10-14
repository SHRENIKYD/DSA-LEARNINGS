(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var R = String.raw;

  /* =====================================================================
     Shared helpers for the visualizers of this module.
     A tiny, safe "mini-Python" expression evaluator (no eval!) that follows
     real Python 3 rules: int is arbitrary precision (BigInt), / always gives
     float, // and % floor toward minus infinity, ** is right-associative and
     binds tighter than a unary minus on its left, and/or return an operand,
     comparisons chain.  It records every step so we can animate it.
     ===================================================================== */
  function pad4(frames, tip) {
    while (frames.length < 4) {
      var last = frames[frames.length - 1];
      frames.push({ narr: tip || 'Tip: edit the input above with more lines to see more steps.', parts: last.parts });
    }
    return frames;
  }
  function PyErr(kind, msg) { var e = new Error(kind + ': ' + msg); e.py = true; e.kind = kind; e.pmsg = msg; return e; }

  function floatRepr(x) {
    if (x !== x) return 'nan';
    if (x === Infinity) return 'inf';
    if (x === -Infinity) return '-inf';
    if (x === 0) return (1 / x < 0) ? '-0.0' : '0.0';
    var neg = x < 0, ax = Math.abs(x);
    var e = ax.toExponential();             // shortest round-trip digits, like Python repr
    var m = e.split('e'), digits = m[0].replace('.', ''), exp = parseInt(m[1], 10);
    var s;
    if (exp >= -5 && exp < 16) {           // Python: fixed notation when -4 <= exp10 < 16 (here exp of d.ddd form)
      if (exp < -4) { s = null; }
      else if (exp >= digits.length - 1) s = digits + new Array(exp - digits.length + 2).join('0') + '.0';
      else if (exp >= 0) s = digits.slice(0, exp + 1) + '.' + digits.slice(exp + 1);
      else s = '0.' + new Array(-exp).join('0') + digits;
    }
    if (!s) {
      var mant = digits.length > 1 ? digits[0] + '.' + digits.slice(1) : digits;
      var ee = Math.abs(exp) < 10 ? '0' + Math.abs(exp) : String(Math.abs(exp));
      s = mant + 'e' + (exp < 0 ? '-' : '+') + ee;
    }
    return (neg ? '-' : '') + s;
  }
  function strRepr(s) {
    var q = (s.indexOf("'") >= 0 && s.indexOf('"') < 0) ? '"' : "'";
    var out = s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\t/g, '\\t');
    if (q === "'") out = out.replace(/'/g, "\\'");
    return q + out + q;
  }
  function V(t, v) { return { t: t, v: v }; }
  var NONE = V('NoneType', null);
  function tname(a) { return a.t; }
  function repr(a) {
    if (a.t === 'int') return a.v.toString();
    if (a.t === 'float') return floatRepr(a.v);
    if (a.t === 'str') return strRepr(a.v);
    if (a.t === 'bool') return a.v ? 'True' : 'False';
    if (a.t === 'NoneType') return 'None';
    if (a.t === 'type') return "<class '" + a.v + "'>";
    return String(a.v);
  }
  function pstr(a) { return a.t === 'str' ? a.v : repr(a); }
  function truthy(a) {
    if (a.t === 'int') return a.v !== 0n;
    if (a.t === 'float') return a.v !== 0;
    if (a.t === 'str') return a.v.length > 0;
    if (a.t === 'bool') return a.v;
    if (a.t === 'NoneType') return false;
    return true;
  }
  function isNum(a) { return a.t === 'int' || a.t === 'float' || a.t === 'bool'; }
  function asInt(a) { return a.t === 'bool' ? (a.v ? 1n : 0n) : a.v; }
  function asF(a) { return a.t === 'float' ? a.v : Number(asInt(a)); }
  function bigFloorDiv(a, b) { var q = a / b; if ((a % b !== 0n) && ((a < 0n) !== (b < 0n))) q -= 1n; return q; }
  function bigMod(a, b) { var r = a % b; if (r !== 0n && ((r < 0n) !== (b < 0n))) r += b; return r; }
  function typeErr(op, a, b) { return PyErr('TypeError', "unsupported operand type(s) for " + op + ": '" + tname(a) + "' and '" + tname(b) + "'"); }
  function capInt(n) { if ((n < 0n ? -n : n).toString().length > 400) throw PyErr('DemoLimit', 'result has more than 400 digits — Python handles it, this demo keeps output short'); return V('int', n); }

  function binop(op, a, b) {
    var ints = (a.t === 'int' || a.t === 'bool') && (b.t === 'int' || b.t === 'bool');
    if (op === '+') {
      if (a.t === 'str' && b.t === 'str') { if (a.v.length + b.v.length > 200) throw PyErr('DemoLimit', 'string too long for the demo'); return V('str', a.v + b.v); }
      if (a.t === 'str') throw PyErr('TypeError', 'can only concatenate str (not "' + tname(b) + '") to str');
      if (isNum(a) && isNum(b)) return ints ? capInt(asInt(a) + asInt(b)) : V('float', asF(a) + asF(b));
      throw typeErr('+', a, b);
    }
    if (op === '-') { if (isNum(a) && isNum(b)) return ints ? capInt(asInt(a) - asInt(b)) : V('float', asF(a) - asF(b)); throw typeErr('-', a, b); }
    if (op === '*') {
      if ((a.t === 'str' && (b.t === 'int' || b.t === 'bool')) || (b.t === 'str' && (a.t === 'int' || a.t === 'bool'))) {
        var s = a.t === 'str' ? a.v : b.v, n = Number(a.t === 'str' ? asInt(b) : asInt(a));
        if (n <= 0) return V('str', '');
        if (s.length * n > 200) throw PyErr('DemoLimit', 'string too long for the demo');
        return V('str', new Array(n + 1).join(s));
      }
      if (isNum(a) && isNum(b)) return ints ? capInt(asInt(a) * asInt(b)) : V('float', asF(a) * asF(b));
      throw typeErr('*', a, b);
    }
    if (op === '/') {
      if (!(isNum(a) && isNum(b))) throw typeErr('/', a, b);
      if (asF(b) === 0) throw PyErr('ZeroDivisionError', 'division by zero');
      return V('float', asF(a) / asF(b));
    }
    if (op === '//' || op === '%') {
      if (!(isNum(a) && isNum(b))) throw typeErr(op, a, b);
      if (ints) {
        if (asInt(b) === 0n) throw PyErr('ZeroDivisionError', op === '//' ? 'integer division or modulo by zero' : 'integer modulo by zero');
        return V('int', op === '//' ? bigFloorDiv(asInt(a), asInt(b)) : bigMod(asInt(a), asInt(b)));
      }
      var x = asF(a), y = asF(b);
      if (y === 0) throw PyErr('ZeroDivisionError', 'float division by zero');
      var fl = Math.floor(x / y);
      return V('float', op === '//' ? fl : x - fl * y);
    }
    if (op === '**') {
      if (!(isNum(a) && isNum(b))) throw typeErr('** or pow()', a, b);
      if (ints && asInt(b) >= 0n) {
        var base = asInt(a), ex = asInt(b);
        var approx = Number(ex) * Math.log10(Math.max(2, Math.abs(Number(base))));
        if (approx > 400) throw PyErr('DemoLimit', 'about ' + Math.round(approx) + ' digits — Python can do it, the demo shows at most 400');
        return capInt(base ** ex);
      }
      var bx = asF(a), by = asF(b);
      if (bx < 0 && Math.floor(by) !== by) throw PyErr('DemoLimit', 'a negative number to a fractional power gives a complex number in Python');
      if (bx === 0 && by < 0) throw PyErr('ZeroDivisionError', 'zero to a negative power');
      return V('float', Math.pow(bx, by));
    }
    if (op === '&' || op === '|' || op === '^' || op === '<<' || op === '>>') {
      if (!ints) throw typeErr(op, a, b);
      var p = asInt(a), q = asInt(b);
      if (op === '&') return V('int', p & q);
      if (op === '|') return V('int', p | q);
      if (op === '^') return V('int', p ^ q);
      if (q < 0n) throw PyErr('ValueError', 'negative shift count');
      if (op === '<<') { if (q > 1000n) throw PyErr('DemoLimit', 'shift too large for the demo'); return capInt(p << q); }
      return V('int', p >> q);
    }
    throw PyErr('SyntaxError', 'unknown operator ' + op);
  }
  function cmp(op, a, b) {
    if (op === 'in' || op === 'not in') {
      if (b.t !== 'str') throw PyErr('TypeError', "argument of type '" + tname(b) + "' is not iterable");
      if (a.t !== 'str') throw PyErr('TypeError', "'in <string>' requires string as left operand, not " + tname(a));
      var r = b.v.indexOf(a.v) >= 0; return op === 'in' ? r : !r;
    }
    if (op === 'is' || op === 'is not') {
      var same = (a.t === b.t) && (a.t === 'NoneType' || a.t === 'bool' ? a.v === b.v : a.t === 'int' ? (a.v === b.v && a.v >= -5n && a.v <= 256n) : false);
      return op === 'is' ? same : !same;
    }
    var eq;
    if (isNum(a) && isNum(b)) {
      if ((a.t === 'int' || a.t === 'bool') && (b.t === 'int' || b.t === 'bool')) {
        var x = asInt(a), y = asInt(b);
        if (op === '==') return x === y; if (op === '!=') return x !== y;
        if (op === '<') return x < y; if (op === '<=') return x <= y; if (op === '>') return x > y; return x >= y;
      }
      var fx = asF(a), fy = asF(b);
      if (op === '==') return fx === fy; if (op === '!=') return fx !== fy;
      if (op === '<') return fx < fy; if (op === '<=') return fx <= fy; if (op === '>') return fx > fy; return fx >= fy;
    }
    if (a.t === 'str' && b.t === 'str') {
      if (op === '==') return a.v === b.v; if (op === '!=') return a.v !== b.v;
      if (op === '<') return a.v < b.v; if (op === '<=') return a.v <= b.v; if (op === '>') return a.v > b.v; return a.v >= b.v;
    }
    if (op === '==') { eq = (a.t === b.t && a.v === b.v); return eq; }
    if (op === '!=') { eq = (a.t === b.t && a.v === b.v); return !eq; }
    throw PyErr('TypeError', "'" + op + "' not supported between instances of '" + tname(a) + "' and '" + tname(b) + "'");
  }

  /* ---------- tokenizer + Pratt parser with source spans ---------- */
  function tokenize(src) {
    var toks = [], i = 0, re;
    var ops = ['**', '//', '==', '!=', '<=', '>=', '<<', '>>', '+', '-', '*', '/', '%', '<', '>', '(', ')', '&', '|', '^', '~', ','];
    while (i < src.length) {
      var ch = src[i];
      if (ch === ' ' || ch === '\t') { i++; continue; }
      var rest = src.slice(i), mm;
      if ((mm = rest.match(/^(\d[\d_]*\.\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?|\d[\d_]*[eE][+-]?\d+|\d[\d_]*)/))) {
        var t = mm[1];
        if (/_$|__/.test(t)) throw PyErr('SyntaxError', 'invalid decimal literal ' + t);
        var isF = /[.eE]/.test(t);
        if (!isF && /^0\d/.test(t.replace(/_/g, '')) && /[1-9]/.test(t)) throw PyErr('SyntaxError', 'leading zeros in decimal integer literals are not permitted (' + t + ')');
        toks.push({ k: 'num', v: isF ? V('float', parseFloat(t.replace(/_/g, ''))) : V('int', BigInt(t.replace(/_/g, ''))), s: i, e: i + t.length });
        i += t.length; continue;
      }
      if (ch === '"' || ch === "'") {
        var j = src.indexOf(ch, i + 1);
        if (j < 0) throw PyErr('SyntaxError', 'unterminated string literal');
        toks.push({ k: 'str', v: V('str', src.slice(i + 1, j)), s: i, e: j + 1 }); i = j + 1; continue;
      }
      if ((mm = rest.match(/^[A-Za-z_][A-Za-z_0-9]*/))) {
        var w = mm[0];
        if (w === 'not' && /^not\s+in\b/.test(rest)) { var full = rest.match(/^not\s+in/)[0]; toks.push({ k: 'op', v: 'not in', s: i, e: i + full.length }); i += full.length; continue; }
        if (w === 'is' && /^is\s+not\b/.test(rest)) { var f2 = rest.match(/^is\s+not/)[0]; toks.push({ k: 'op', v: 'is not', s: i, e: i + f2.length }); i += f2.length; continue; }
        if (['and', 'or', 'not', 'in', 'is'].indexOf(w) >= 0) toks.push({ k: 'op', v: w, s: i, e: i + w.length });
        else if (w === 'True' || w === 'False') toks.push({ k: 'const', v: V('bool', w === 'True'), s: i, e: i + w.length });
        else if (w === 'None') toks.push({ k: 'const', v: NONE, s: i, e: i + w.length });
        else toks.push({ k: 'name', v: w, s: i, e: i + w.length });
        i += w.length; continue;
      }
      var hit = null;
      for (var o = 0; o < ops.length; o++) if (rest.indexOf(ops[o]) === 0) { hit = ops[o]; break; }
      if (!hit) throw PyErr('SyntaxError', 'unexpected character "' + ch + '"');
      toks.push({ k: 'op', v: hit, s: i, e: i + hit.length }); i += hit.length;
    }
    return toks;
  }
  var BIN = { 'or': 1, 'and': 2, '|': 5, '^': 6, '&': 7, '<<': 8, '>>': 8, '+': 9, '-': 9, '*': 10, '/': 10, '//': 10, '%': 10 };
  var CMP = ['<', '>', '<=', '>=', '==', '!=', 'in', 'not in', 'is', 'is not'];
  function parseExpr(src) {
    var toks = tokenize(src), p = 0;
    function peek() { return toks[p]; }
    function isOp(t, v) { return t && t.k === 'op' && t.v === v; }
    function atom() {
      var t = toks[p];
      if (!t) throw PyErr('SyntaxError', 'expression ended too early');
      if (t.k === 'num' || t.k === 'str' || t.k === 'const') { p++; return { n: 'lit', v: t.v, s: t.s, e: t.e }; }
      if (t.k === 'name') {
        p++;
        if (isOp(toks[p], '(')) {
          p++; var args = [];
          if (!isOp(toks[p], ')')) { args.push(expr(0)); while (isOp(toks[p], ',')) { p++; args.push(expr(0)); } }
          if (!isOp(toks[p], ')')) throw PyErr('SyntaxError', "'(' was never closed");
          var end = toks[p].e; p++;
          return { n: 'call', f: t.v, args: args, s: t.s, e: end };
        }
        return { n: 'name', id: t.v, s: t.s, e: t.e };
      }
      if (isOp(t, '(')) {
        p++; var inner = expr(0);
        if (!isOp(toks[p], ')')) throw PyErr('SyntaxError', "'(' was never closed");
        var node = { n: 'paren', x: inner, s: t.s, e: toks[p].e }; p++; return node;
      }
      throw PyErr('SyntaxError', 'invalid syntax near "' + src.slice(t.s, t.s + 6) + '"');
    }
    function power() {
      var base = atom();
      if (isOp(peek(), '**')) { p++; var rhs = unary(); return { n: 'bin', op: '**', l: base, r: rhs, s: base.s, e: rhs.e }; }
      return base;
    }
    function unary() {
      var t = peek();
      if (t && t.k === 'op' && (t.v === '-' || t.v === '+' || t.v === '~')) { p++; var x = unary(); return { n: 'un', op: t.v, x: x, s: t.s, e: x.e }; }
      return power();
    }
    function cmpExpr() {
      var first = arith(5), ops = [], rest = [];
      while (peek() && peek().k === 'op' && CMP.indexOf(peek().v) >= 0) { ops.push(peek().v); p++; rest.push(arith(5)); }
      if (!ops.length) return first;
      return { n: 'cmp', ops: ops, xs: [first].concat(rest), s: first.s, e: rest[rest.length - 1].e };
    }
    function notExpr() {
      var t = peek();
      if (isOp(t, 'not')) { p++; var x = notExpr(); return { n: 'not', x: x, s: t.s, e: x.e }; }
      return cmpExpr();
    }
    function andExpr() {
      var left = notExpr();
      while (isOp(peek(), 'and')) { p++; var r = notExpr(); left = { n: 'bool', op: 'and', l: left, r: r, s: left.s, e: r.e }; }
      return left;
    }
    function orExpr() {
      var left = andExpr();
      while (isOp(peek(), 'or')) { p++; var r = andExpr(); left = { n: 'bool', op: 'or', l: left, r: r, s: left.s, e: r.e }; }
      return left;
    }
    function arith(minP) {
      var left = unary();
      for (;;) {
        var t = peek();
        if (!t || t.k !== 'op' || !BIN[t.v] || BIN[t.v] < 5 || BIN[t.v] < minP) break;
        var pr = BIN[t.v]; p++;
        var right = arith(pr + 1);
        left = { n: 'bin', op: t.v, l: left, r: right, s: left.s, e: right.e };
      }
      return left;
    }
    function expr() { return orExpr(); }
    var tree = expr();
    if (p < toks.length) throw PyErr('SyntaxError', 'invalid syntax near "' + src.slice(toks[p].s, toks[p].s + 8) + '"');
    return tree;
  }
  function roundHalfEven(x) { var f = Math.floor(x), d = x - f; if (d > 0.5) return f + 1; if (d < 0.5) return f; return (f % 2 === 0) ? f : f + 1; }
  function callBuiltin(f, args) {
    var a = args[0];
    function need(n) { if (args.length !== n) throw PyErr('TypeError', f + '() takes ' + n + ' argument(s) in this demo'); }
    if (f === 'int') {
      need(1);
      if (a.t === 'int') return a; if (a.t === 'bool') return V('int', asInt(a));
      if (a.t === 'float') { if (!isFinite(a.v)) throw PyErr('OverflowError', 'cannot convert float infinity to integer'); return V('int', BigInt(Math.trunc(a.v))); }
      if (a.t === 'str') { var s = a.v.trim(); if (!/^[+-]?\d+(_\d+)*$/.test(s)) throw PyErr('ValueError', "invalid literal for int() with base 10: " + strRepr(a.v)); return V('int', BigInt(s.replace(/_/g, ''))); }
      throw PyErr('TypeError', "int() argument must be a string, a bytes-like object or a real number, not '" + a.t + "'");
    }
    if (f === 'float') {
      need(1);
      if (isNum(a)) return V('float', asF(a));
      if (a.t === 'str') { var t = a.v.trim().toLowerCase(); if (t === 'inf' || t === '+inf' || t === 'infinity') return V('float', Infinity); if (t === '-inf') return V('float', -Infinity); if (t === 'nan') return V('float', NaN); if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/.test(t)) throw PyErr('ValueError', 'could not convert string to float: ' + strRepr(a.v)); return V('float', parseFloat(t)); }
      throw PyErr('TypeError', "float() argument must be a string or a real number, not '" + a.t + "'");
    }
    if (f === 'str') { need(1); return V('str', pstr(a)); }
    if (f === 'repr') { need(1); return V('str', repr(a)); }
    if (f === 'bool') { need(1); return V('bool', truthy(a)); }
    if (f === 'abs') { need(1); if (a.t === 'float') return V('float', Math.abs(a.v)); if (a.t === 'int' || a.t === 'bool') { var n = asInt(a); return V('int', n < 0n ? -n : n); } throw PyErr('TypeError', "bad operand type for abs(): '" + a.t + "'"); }
    if (f === 'len') { need(1); if (a.t !== 'str') throw PyErr('TypeError', "object of type '" + a.t + "' has no len()"); return V('int', BigInt(Array.from(a.v).length)); }
    if (f === 'type') { need(1); return V('type', a.t); }
    if (f === 'round') { need(1); if (a.t === 'float') return V('int', BigInt(roundHalfEven(a.v))); if (isNum(a)) return V('int', asInt(a)); throw PyErr('TypeError', "type " + a.t + " doesn't define __round__ method"); }
    if (f === 'print') { return { printed: args.map(pstr).join(' '), value: NONE }; }
    throw PyErr('NameError', "name '" + f + "' is not defined (demo knows int, float, str, repr, bool, abs, len, type, round, print)");
  }
  /* evaluate with step recording. env: {name: value}. steps: [{s,e,text,val}] */
  function evalNode(node, env, steps, out) {
    if (steps.length > 60) throw PyErr('DemoLimit', 'expression too long for the demo');
    if (node.n === 'lit') return node.v;
    if (node.n === 'paren') return evalNode(node.x, env, steps, out);
    if (node.n === 'name') {
      if (!Object.prototype.hasOwnProperty.call(env, node.id)) throw PyErr('NameError', "name '" + node.id + "' is not defined");
      var nv = env[node.id]; steps.push({ s: node.s, e: node.e, text: 'look up name <b>' + node.id + '</b> → ' + H.esc(repr(nv)), val: nv }); return nv;
    }
    if (node.n === 'un') {
      var x = evalNode(node.x, env, steps, out), r;
      if (node.op === '-') { if (!isNum(x)) throw PyErr('TypeError', "bad operand type for unary -: '" + x.t + "'"); r = x.t === 'float' ? V('float', -x.v) : V('int', -asInt(x)); }
      else if (node.op === '+') { if (!isNum(x)) throw PyErr('TypeError', "bad operand type for unary +: '" + x.t + "'"); r = x.t === 'float' ? x : V('int', asInt(x)); }
      else { if (!(x.t === 'int' || x.t === 'bool')) throw PyErr('TypeError', "bad operand type for unary ~: '" + x.t + "'"); r = V('int', ~asInt(x)); }
      steps.push({ s: node.s, e: node.e, text: 'unary <b>' + node.op + '</b> ' + H.esc(repr(x)) + ' → ' + H.esc(repr(r)), val: r }); return r;
    }
    if (node.n === 'bin') {
      var a = evalNode(node.l, env, steps, out), b = evalNode(node.r, env, steps, out), res = binop(node.op, a, b);
      steps.push({ s: node.s, e: node.e, text: H.esc(repr(a)) + ' <b>' + H.esc(node.op) + '</b> ' + H.esc(repr(b)) + ' → ' + H.esc(repr(res)) + ' <span class="c-m">(' + res.t + ')</span>', val: res });
      return res;
    }
    if (node.n === 'bool') {
      var L = evalNode(node.l, env, steps, out), lt = truthy(L);
      if ((node.op === 'and' && !lt) || (node.op === 'or' && lt)) {
        steps.push({ s: node.s, e: node.e, text: H.esc(repr(L)) + ' is ' + (lt ? 'truthy' : 'falsy') + ' → <b>' + node.op + '</b> short-circuits and returns it; right side <b>never runs</b>', val: L, skip: [node.r.s, node.r.e] });
        return L;
      }
      var Rv = evalNode(node.r, env, steps, out);
      steps.push({ s: node.s, e: node.e, text: H.esc(repr(L)) + ' is ' + (lt ? 'truthy' : 'falsy') + ' → <b>' + node.op + '</b> returns the right operand ' + H.esc(repr(Rv)), val: Rv });
      return Rv;
    }
    if (node.n === 'not') { var nx = evalNode(node.x, env, steps, out), nr = V('bool', !truthy(nx)); steps.push({ s: node.s, e: node.e, text: '<b>not</b> ' + H.esc(repr(nx)) + ' → ' + repr(nr), val: nr }); return nr; }
    if (node.n === 'cmp') {
      var left = evalNode(node.xs[0], env, steps, out);
      for (var k = 0; k < node.ops.length; k++) {
        var right = evalNode(node.xs[k + 1], env, steps, out), ok = cmp(node.ops[k], left, right);
        var last = k === node.ops.length - 1;
        if (!ok || last) {
          steps.push({ s: node.s, e: node.e, text: H.esc(repr(left)) + ' <b>' + H.esc(node.ops[k]) + '</b> ' + H.esc(repr(right)) + ' is ' + (ok ? 'True' : 'False') + (node.ops.length > 1 ? (ok ? ' → every link held, chain is True' : ' → chain stops: <b>False</b>') : ''), val: V('bool', ok) });
          return V('bool', ok);
        }
        steps.push({ s: node.xs[k].s, e: node.xs[k + 1].e, text: H.esc(repr(left)) + ' <b>' + H.esc(node.ops[k]) + '</b> ' + H.esc(repr(right)) + ' is True → keep checking the chain (like <code>and</code>)', val: V('bool', true) });
        left = right;
      }
    }
    if (node.n === 'call') {
      var args = node.args.map(function (q) { return evalNode(q, env, steps, out); });
      var cr = callBuiltin(node.f, args), val = cr && cr.printed !== undefined ? cr.value : cr;
      if (cr && cr.printed !== undefined && out) out.push(cr.printed);
      steps.push({ s: node.s, e: node.e, text: '<b>' + node.f + '</b>(' + H.esc(args.map(repr).join(', ')) + ') → ' + H.esc(repr(val)) + (cr && cr.printed !== undefined ? ' <span class="c-m">(and writes "' + H.esc(cr.printed) + '" to the screen)</span>' : ''), val: val });
      return val;
    }
    throw PyErr('SyntaxError', 'unsupported expression');
  }
  function markSpan(src, s, e, cls, skip) {
    var html = '';
    for (var i = 0; i < src.length; i++) {
      var c = H.esc(src[i]);
      if (skip && i >= skip[0] && i < skip[1]) c = '<span class="c-m"><s>' + c + '</s></span>';
      html += c;
    }
    if (skip) return '<code>' + html + '</code>';
    return '<code>' + H.esc(src.slice(0, s)) + '<mark>' + H.esc(src.slice(s, e)) + '</mark>' + H.esc(src.slice(e)) + '</code>';
  }

  /* =====================================================================
     Names → objects interpreter (for the "variables are name tags" viz).
     Supports:  x = 5 | s = 'hi' | a = [1, 2] | b = a | a = a + [3] | n = n + 1
                x += 1 | a += [4] | a.append(5) | a[0] = 9 | del x | a, b = b, a
                print(a) | print(a is b) | print(a == b) | print(id(a))
     ===================================================================== */
  function nameMachine(src) {
    var lines = String(src).split(/\n|;/).map(function (l) { return l.trim(); }).filter(function (l) { return l && l[0] !== '#'; });
    if (!lines.length) throw new Error('Type a few assignment lines, e.g. a = [1, 2] then b = a');
    if (lines.length > 14) throw new Error('Use at most 14 lines');
    var heap = [], names = {}, order = [], out = [], frames = [], nextId = 1, small = {};
    function newObj(t, v) { var o = { id: nextId++, t: t, v: v, alive: true }; heap.push(o); return o; }
    function intObj(n) {
      if (n >= -5n && n <= 256n) { var k = n.toString(); if (!small[k] || !small[k].alive) { small[k] = newObj('int', n); small[k].cached = true; } return small[k]; }
      return newObj('int', n);
    }
    function show(o) {
      if (o.t === 'int') return 'int ' + o.v.toString();
      if (o.t === 'str') return 'str ' + strRepr(o.v);
      if (o.t === 'list') return 'list [' + o.v.map(function (x) { return x.t === 'str' ? strRepr(x.v) : x.v.toString(); }).join(', ') + ']';
      if (o.t === 'NoneType') return 'None';
      return o.t;
    }
    function pyShow(o) { return o.t === 'int' ? o.v.toString() : o.t === 'str' ? o.v : o.t === 'list' ? show(o).slice(5) : 'None'; }
    function lit(t) {
      t = t.trim();
      if (/^-?\d+$/.test(t)) return intObj(BigInt(t));
      if (/^(['"]).*\1$/.test(t)) return newObj('str', t.slice(1, -1));
      if (t === 'None') { if (!names.__none) { names.__none = newObj('NoneType', null); names.__none.cached = true; } return names.__none; }
      if (/^\[.*\]$/.test(t)) {
        var inner = t.slice(1, -1).trim(), items = inner ? inner.split(',') : [];
        if (items.length > 8) throw new Error('Keep lists to 8 items');
        return newObj('list', items.map(function (x) { x = x.trim(); if (/^-?\d+$/.test(x)) return { t: 'int', v: BigInt(x) }; if (/^(['"]).*\1$/.test(x)) return { t: 'str', v: x.slice(1, -1) }; throw new Error('List items must be ints or quoted strings: ' + x); }));
      }
      if (/^[A-Za-z_]\w*$/.test(t)) { if (!names[t]) throw new Error("NameError: name '" + t + "' is not defined"); return names[t]; }
      return null;
    }
    function bind(n, o) { if (!names[n]) order.push(n); names[n] = o; }
    function rhs(t) {
      var o = lit(t); if (o) return { o: o, note: /^[A-Za-z_]\w*$/.test(t.trim()) ? 'no copy is made — <b>both names now point at the same object</b>' : 'Python creates the object first, then ties the name to it' };
      var m = t.match(/^([A-Za-z_]\w*)\s*([+*-])\s*(.+)$/);
      if (m) {
        var a = lit(m[1]), b = lit(m[3]);
        if (!a || !b) throw new Error('Could not understand "' + t + '"');
        if (a.t === 'int' && b.t === 'int') { var r = m[2] === '+' ? a.v + b.v : m[2] === '-' ? a.v - b.v : a.v * b.v; return { o: intObj(r), note: 'ints are immutable, so <b>' + m[2] + '</b> builds a <b>new</b> int object' + ((r >= -5n && r <= 256n) ? ' (values -5..256 come from CPython\'s small-int cache)' : '') }; }
        if (a.t === 'list' && b.t === 'list' && m[2] === '+') return { o: newObj('list', a.v.concat(b.v)), note: '<b>a + b</b> on lists builds a <b>brand-new</b> list; the old one is untouched' };
        if (a.t === 'str' && b.t === 'str' && m[2] === '+') return { o: newObj('str', a.v + b.v), note: 'strings are immutable, so + builds a new str' };
        throw new Error("TypeError: unsupported operand type(s) for " + m[2] + ": '" + a.t + "' and '" + b.t + "'");
      }
      var cp = t.match(/^([A-Za-z_]\w*)\[:\]$|^list\(([A-Za-z_]\w*)\)$|^([A-Za-z_]\w*)\.copy\(\)$/);
      if (cp) { var src0 = lit(cp[1] || cp[2] || cp[3]); if (src0.t !== 'list') throw new Error('Only lists can be copied in this demo'); return { o: newObj('list', src0.v.slice()), note: 'a <b>copy</b>: a new list object with the same items' }; }
      throw new Error('Could not understand "' + t + '" (try literals, names, name + value, or name[:])');
    }
    function refcounts() {
      var rc = {}; heap.forEach(function (o) { rc[o.id] = 0; });
      order.forEach(function (n) { if (names[n]) rc[names[n].id]++; });
      return rc;
    }
    function snapshot(lineNo, narr, hlNames, hlObj, extra) {
      var rc = refcounts();
      heap.forEach(function (o) { if (o.alive && rc[o.id] === 0 && !o.cached && !o.dying) o.dying = true; });
      heap.forEach(function (o) { o.hide = o.cached && rc[o.id] === 0 && !o.wasRef; });
      var live = heap.filter(function (o) { return o.alive && !o.hide; }), liveNames = order.filter(function (n) { return names[n]; });
      var rows = Math.max(live.length, liveNames.length, 1), H2 = Math.max(40, rows * 14 + 6);
      var nodes = [], edges = [], hl = {}, tags = {}, ehl = {};
      liveNames.forEach(function (n, i) { nodes.push({ id: 'n_' + n, label: n, x: 12, y: 8 + i * 14 }); if (hlNames && hlNames[n]) { hl['n_' + n] = hlNames[n]; } });
      live.forEach(function (o, i) {
        var lab = show(o); if (lab.length > 26) lab = lab.slice(0, 25) + '…';
        nodes.push({ id: 'o' + o.id, label: lab, x: 66, y: 8 + i * 14, shape: 'box', w: 40 });
        tags['o' + o.id] = '#' + o.id + ' · refs ' + rc[o.id] + (o.cached ? ' · cached' : '');
        if (o.dying) { hl['o' + o.id] = 'done'; tags['o' + o.id] = '#' + o.id + ' · refs 0 → freed'; }
        if (o.cached && rc[o.id] === 0) { hl['o' + o.id] = 'done'; tags['o' + o.id] = '#' + o.id + ' · refs 0 · cached small int stays alive'; }
        if (hlObj && hlObj[o.id]) hl['o' + o.id] = hlObj[o.id];
      });
      liveNames.forEach(function (n) { edges.push(['n_' + n, 'o' + names[n].id]); if (hlNames && hlNames[n]) ehl['n_' + n + '-o' + names[n].id] = 'ok'; });
      var vals = {}; liveNames.forEach(function (n) { vals[n] = '→ #' + names[n].id; });
      var parts = [
        { type: 'code', label: 'Your code', lang: 'python', code: lines.join('\n'), hl: lineNo ? (function () { var h = {}; h[lineNo] = 'cur'; return h; })() : {} },
        { type: 'graph', label: 'Names (left) → objects (right)', directed: true, height: H2, nodes: nodes, edges: edges, hl: hl, ehl: ehl, tags: tags },
        { type: 'vars', label: 'Namespace (name → object id)', vals: vals, hl: hlNames || {} }
      ];
      if (out.length) parts.push({ type: 'text', label: 'Output', html: '<pre>' + H.esc(out.join('\n')) + '</pre>' });
      if (extra) parts.push(extra);
      frames.push({ narr: narr, parts: parts });
      heap.forEach(function (o) { if (o.dying) o.alive = false; o.wasRef = rc[o.id] > 0; });
    }
    snapshot(0, 'Start: the namespace is empty. Remember the rule: <b>a variable is a name tag tied to an object</b>, not a box that holds a value.', null, null);
    lines.forEach(function (ln, idx) {
      var L = idx + 1, m, hn = {}, ho = {};
      if ((m = ln.match(/^print\((.*)\)$/))) {
        var args = m[1].split(',').map(function (s) { return s.trim(); }), res = [];
        args.forEach(function (a) {
          var mm;
          if ((mm = a.match(/^([A-Za-z_]\w*)\s+is\s+not\s+([A-Za-z_]\w*)$/))) res.push(String(lit(mm[1]) !== lit(mm[2])).replace(/^./, function (c) { return c.toUpperCase(); }));
          else if ((mm = a.match(/^([A-Za-z_]\w*)\s+is\s+([A-Za-z_]\w*)$/))) res.push(lit(mm[1]) === lit(mm[2]) ? 'True' : 'False');
          else if ((mm = a.match(/^([A-Za-z_]\w*)\s*==\s*([A-Za-z_]\w*)$/))) res.push(show(lit(mm[1])) === show(lit(mm[2])) ? 'True' : 'False');
          else if ((mm = a.match(/^id\(([A-Za-z_]\w*)\)$/))) res.push('#' + lit(mm[1]).id);
          else { var o = lit(a); if (!o) throw new Error('print() in this demo takes names, "a is b", "a == b" or id(a)'); res.push(pyShow(o)); }
        });
        out.push(res.join(' '));
        snapshot(L, '<code>' + H.esc(ln) + '</code> prints <b>' + H.esc(res.join(' ')) + '</b>.' + (/\bis\b|==/.test(m[1]) ? ' <code>is</code> asks "same object (same arrow target)?", <code>==</code> asks "equal value?".' : ' print shows the <b>object</b> the name points to right now.'), null, null);
        return;
      }
      if ((m = ln.match(/^del\s+([A-Za-z_]\w*)$/))) {
        if (!names[m[1]]) throw new Error("NameError: name '" + m[1] + "' is not defined");
        var gone = names[m[1]]; delete names[m[1]]; order = order.filter(function (n) { return n !== m[1]; });
        ho[gone.id] = 'cur';
        snapshot(L, '<code>del ' + m[1] + '</code> removes the <b>name tag</b>, not the object. The object dies only when no names (references) point at it anymore.', null, ho);
        return;
      }
      if ((m = ln.match(/^([A-Za-z_]\w*)\.append\((.+)\)$/))) {
        var lo = lit(m[1]); if (lo.t !== 'list') throw new Error("AttributeError: '" + lo.t + "' object has no attribute 'append'");
        var it = m[2].trim(); lo.v.push(/^-?\d+$/.test(it) ? { t: 'int', v: BigInt(it) } : { t: 'str', v: it.replace(/^['"]|['"]$/g, '') });
        if (lo.v.length > 10) throw new Error('Keep lists to 10 items');
        ho[lo.id] = 'cur'; order.forEach(function (n) { if (names[n] === lo) hn[n] = 'cur'; });
        snapshot(L, '<code>' + H.esc(ln) + '</code> <b>mutates</b> object #' + lo.id + ' in place. Every name pointing at it (' + Object.keys(hn).join(', ') + ') now "sees" the change — no name was rebound.', hn, ho);
        return;
      }
      if ((m = ln.match(/^([A-Za-z_]\w*)\[(-?\d+)\]\s*=\s*(.+)$/))) {
        var to = lit(m[1]); if (to.t !== 'list') throw new Error("TypeError: '" + to.t + "' object does not support item assignment");
        var ix = parseInt(m[2], 10); if (ix < 0) ix += to.v.length; if (ix < 0 || ix >= to.v.length) throw new Error('IndexError: list assignment index out of range');
        var iv = m[3].trim(); to.v[ix] = /^-?\d+$/.test(iv) ? { t: 'int', v: BigInt(iv) } : { t: 'str', v: iv.replace(/^['"]|['"]$/g, '') };
        ho[to.id] = 'cur'; order.forEach(function (n) { if (names[n] === to) hn[n] = 'cur'; });
        snapshot(L, '<code>' + H.esc(ln) + '</code> changes slot ' + ix + ' <b>inside</b> list #' + to.id + '. Aliases share the change.', hn, ho);
        return;
      }
      if ((m = ln.match(/^([A-Za-z_]\w*)\s*\+=\s*(.+)$/))) {
        var cur = lit(m[1]), add = lit(m[2]);
        if (!add) throw new Error('Right side of += must be a literal or name');
        if (cur.t === 'list' && add.t === 'list') {
          cur.v = cur.v.concat(add.v); ho[cur.id] = 'cur'; order.forEach(function (n) { if (names[n] === cur) hn[n] = 'cur'; });
          snapshot(L, '<code>' + H.esc(ln) + '</code>: for a <b>list</b>, <code>+=</code> calls <code>__iadd__</code> which <b>extends the same object</b> (#' + cur.id + '). Aliases see it! Compare with <code>a = a + [..]</code> which builds a new list.', hn, ho);
          return;
        }
        var r2 = rhs(m[1] + ' + ' + m[2].trim()); var old = cur;
        bind(m[1], r2.o); hn[m[1]] = 'ok'; ho[r2.o.id] = 'ok';
        snapshot(L, '<code>' + H.esc(ln) + '</code>: ' + old.t + ' is <b>immutable</b>, so <code>+=</code> builds a new object #' + r2.o.id + ' and <b>re-points</b> only the name <b>' + m[1] + '</b>. Other names still point at #' + old.id + '.', hn, ho);
        return;
      }
      if ((m = ln.match(/^([A-Za-z_]\w*)\s*,\s*([A-Za-z_]\w*)\s*=\s*(.+?)\s*,\s*(.+)$/))) {
        var o1 = rhs(m[3]).o, o2 = rhs(m[4]).o;
        bind(m[1], o1); bind(m[2], o2); hn[m[1]] = 'ok'; hn[m[2]] = 'ok';
        snapshot(L, '<code>' + H.esc(ln) + '</code>: Python evaluates the whole right side <b>first</b> (making a tuple of the two objects), <b>then</b> ties the names. That is why swapping needs no temp variable.', hn, null);
        return;
      }
      if ((m = ln.match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/))) {
        var r = rhs(m[2]), existed = !!names[m[1]];
        bind(m[1], r.o); hn[m[1]] = existed ? 'cur' : 'ok'; ho[r.o.id] = 'ok';
        snapshot(L, '<code>' + H.esc(ln) + '</code>: ' + r.note + '. Name <b>' + m[1] + '</b> → object #' + r.o.id + (existed ? ' (the name is <b>re-bound</b>; its old object is not changed).' : '.'), hn, ho);
        return;
      }
      throw new Error('Line ' + L + ' not understood: "' + ln + '"');
    });
    snapshot(0, 'Done. Read the arrows: names that share an arrow target are <b>aliases</b>. Mutating through one is visible through all; re-binding one never affects the others.', null, null);
    return pad4(frames, 'Tip: add more lines (e.g. <code>b = a</code> then <code>b.append(1)</code>) to watch arrows move.');
  }

  /* ---------- format-spec mini-language (subset, Python rules) ---------- */
  function formatSpec(val, spec) {
    var m = spec.match(/^(?:([\s\S])?([<>=^]))?([+\- ])?(#)?(0)?(\d+)?([,_])?(?:\.(\d+))?([bdeEfFosxX%])?$/);
    if (!m) throw new Error('Invalid format spec "' + spec + '". Pattern: [[fill]align][sign][#][0][width][,|_][.precision][type]');
    var f = { fill: m[1], align: m[2], sign: m[3] || '-', alt: !!m[4], zero: !!m[5], width: m[6] ? parseInt(m[6], 10) : 0, group: m[7] || '', prec: m[8] !== undefined ? parseInt(m[8], 10) : null, type: m[9] || '' };
    if (f.width > 40) throw new Error('Keep width ≤ 40 for the demo');
    if (f.prec !== null && f.prec > 20) throw new Error('Keep precision ≤ 20 for the demo');
    var steps = [], isStr = val.t === 'str', isInt = val.t === 'int' || val.t === 'bool', type = f.type;
    if (!type) type = isStr ? 's' : isInt ? 'd' : (f.prec === null ? 'r' : null);
    if (type === null) throw new Error('For a float with precision, add a type such as f, e or % (e.g. .2f)');
    if (isStr && type !== 's') throw new Error("ValueError: Unknown format code '" + type + "' for object of type 'str'");
    if (!isStr && type === 's') throw new Error("ValueError: Unknown format code 's' for object of type '" + val.t + "'");
    if (val.t === 'float' && 'dxXob'.indexOf(type) >= 0) throw new Error("ValueError: Unknown format code '" + type + "' for object of type 'float'");
    if (f.zero && f.group) throw new Error('This demo does not combine 0-padding with grouping; try one at a time');
    steps.push({ what: 'type', text: 'Presentation type <b>' + (f.type || '(none → ' + (type === 'r' ? 'repr-like' : type) + ')') + '</b>' });
    var neg = false, prefix = '', body = '', suffix = '';
    if (type === 's') { body = val.v; if (f.prec !== null) body = body.slice(0, f.prec); }
    else if (type === 'd' || 'xXob'.indexOf(type) >= 0) {
      var n = asInt(val); neg = n < 0n; if (neg) n = -n;
      var base = type === 'd' ? 10 : type === 'o' ? 8 : type === 'b' ? 2 : 16;
      body = n.toString(base); if (type === 'X') body = body.toUpperCase();
      if (f.alt && base !== 10) prefix = '0' + (type === 'X' ? 'X' : type === 'o' ? 'o' : type === 'b' ? 'b' : 'x');
    } else {
      var x = asF(val); neg = x < 0 || (x === 0 && 1 / x < 0); x = Math.abs(x);
      var p = f.prec === null ? 6 : f.prec;
      if (type === '%') { x = x * 100; suffix = '%'; }
      if (type === 'r') body = floatRepr(x);
      else if (!isFinite(x)) body = x !== x ? 'nan' : 'inf';
      else if (type === 'e' || type === 'E') {
        var ex = x.toExponential(p).split('e'), en = parseInt(ex[1], 10);
        body = ex[0] + 'e' + (en < 0 ? '-' : '+') + (Math.abs(en) < 10 ? '0' : '') + Math.abs(en);
        if (type === 'E') body = body.toUpperCase();
      } else {
        body = x.toFixed(p);
        var scaled = x * Math.pow(10, p);
        if (p <= 6 && Math.floor(scaled) + 0.5 === scaled) { var down = Math.floor(scaled); var even = down % 2 === 0 ? down : down + 1; body = (even / Math.pow(10, p)).toFixed(p); steps.push({ what: 'round', text: 'Exact tie at the last digit → Python rounds <b>half to even</b>' }); }
      }
      if (f.alt && p === 0 && body.indexOf('.') < 0 && /^\d+$/.test(body)) body += '.';
    }
    steps.push({ what: 'digits', text: 'Raw text of the value: <code>' + H.esc(body) + '</code>' + (f.prec !== null ? ' (precision ' + f.prec + (type === 's' ? ' = max characters' : ' = digits after the point') + ')' : '') });
    if (f.group) {
      var gsize = (type === 'd' || type === 'f' || type === 'F' || type === '%' || type === 'e' || type === 'r') ? 3 : 4;
      if (f.group === ',' && gsize === 4) throw new Error("ValueError: Cannot specify ',' with '" + type + "'.");
      var parts = body.split('.'), ip = parts[0], grouped = '';
      while (ip.length > gsize) { grouped = f.group + ip.slice(-gsize) + grouped; ip = ip.slice(0, -gsize); }
      body = ip + grouped + (parts.length > 1 ? '.' + parts[1] : '');
      steps.push({ what: 'group', text: 'Insert <b>' + H.esc(f.group) + '</b> every ' + gsize + ' digits of the integer part: <code>' + H.esc(body) + '</code>' });
    }
    var sign = neg ? '-' : (f.sign === '+' ? '+' : f.sign === ' ' ? ' ' : '');
    if (!isStr) steps.push({ what: 'sign', text: 'Sign rule <b>"' + H.esc(f.sign) + '"</b> → sign is ' + (sign ? '<code>' + (sign === ' ' ? '(space)' : sign) + '</code>' : 'nothing') + (prefix ? ', prefix <code>' + prefix + '</code> (from #)' : '') });
    var fill = f.fill !== undefined ? f.fill : (f.zero && !f.align ? '0' : ' ');
    var align = f.align || (f.zero ? '=' : (isStr ? '<' : '>'));
    var core = sign + prefix + body + suffix, pad = Math.max(0, f.width - core.length), segs = [];
    function seg(s, cls) { for (var i = 0; i < s.length; i++) segs.push({ c: s[i], cls: cls }); }
    function bodySeg() { for (var i = 0; i < body.length; i++) segs.push({ c: body[i], cls: (body[i] === ',' || body[i] === '_') && f.group ? 'cur' : 'ok' }); }
    var fills = new Array(pad + 1).join(fill);
    if (align === '<') { seg(sign + prefix, 'sel'); bodySeg(); seg(suffix, 'win'); seg(fills, 'done'); }
    else if (align === '>') { seg(fills, 'done'); seg(sign + prefix, 'sel'); bodySeg(); seg(suffix, 'win'); }
    else if (align === '^') { var lp = Math.floor(pad / 2); seg(fills.slice(0, lp), 'done'); seg(sign + prefix, 'sel'); bodySeg(); seg(suffix, 'win'); seg(fills.slice(lp), 'done'); }
    else { seg(sign + prefix, 'sel'); seg(fills, 'done'); bodySeg(); seg(suffix, 'win'); }
    steps.push({ what: 'pad', text: 'Width ' + f.width + (pad ? ' → add <b>' + pad + '</b> × fill <code>' + H.esc(fill === ' ' ? '·' : fill) + '</code>, align <b>' + align + '</b> (' + ({ '<': 'left', '>': 'right', '^': 'centre', '=': 'after the sign' })[align] + ')' : ' → already ' + core.length + ' chars wide, no padding') });
    return { f: f, type: type, steps: steps, segs: segs, result: segs.map(function (s) { return s.c; }).join('') };
  }

  /* ---------- big int → CPython 30-bit "digits" ---------- */
  function bigDigits(n) {
    var neg = n < 0n, a = neg ? -n : n, out = [], B = 1n << 30n;
    if (a === 0n) out.push(0n);
    while (a > 0n) { out.push(a % B); a = a / B; }
    return { neg: neg, digits: out };
  }
  /* ---------- exact decimal value of a JS double (same as Python Decimal(float)) ---------- */
  function exactDecimal(x) {
    var dv = new DataView(new ArrayBuffer(8)); dv.setFloat64(0, x);
    var hi = dv.getUint32(0), lo = dv.getUint32(4);
    var sign = hi >>> 31, expBits = (hi >>> 20) & 0x7ff, mant = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo);
    if (expBits === 0x7ff) return x !== x ? 'NaN' : (sign ? '-' : '') + 'Infinity';
    var e;
    if (expBits === 0) e = -1074; else { mant = mant | (1n << 52n); e = expBits - 1075; }
    var s;
    if (mant === 0n) s = '0';
    else if (e >= 0) s = (mant << BigInt(e)).toString();
    else {
      var k = -e, num = mant * (5n ** BigInt(k)), str = num.toString();
      while (str.length <= k) str = '0' + str;
      s = str.slice(0, str.length - k) + '.' + str.slice(str.length - k);
      s = s.replace(/0+$/, '').replace(/\.$/, '');
    }
    return { sign: sign, mant: mant, exp: e, text: (sign ? '-' : '') + s, bits: { hi: hi, lo: lo, expBits: expBits } };
  }

  /* =====================================================================
     TOPIC 1 — Installing Python, running code, the REPL
     ===================================================================== */
  topics.push({
    title: 'Installing Python, Running Code & the REPL',
    analogy: R`<p>Think of Python as a <b>live interpreter at a business meeting</b>. In the <b>REPL</b> you say one sentence, the interpreter translates it on the spot, the listener reacts, and you immediately hear the answer — perfect for trying ideas. A <b>script</b> (<code>hello.py</code>) is like handing over a <b>whole written letter</b>: the interpreter translates all of it first, then the listener carries out every instruction top to bottom, and you only see what the letter explicitly asks to be <i>said out loud</i> (<code>print</code>). Installing Python is simply <b>hiring the interpreter</b> — and making sure your terminal knows their phone number (the <code>PATH</code>).</p>`,
    explain: R`<h4>🟢 What "Python" actually is</h4>
<p><b>Python</b> is a language; <b>CPython</b> is the official program (written in C) that runs it. When people say "install Python" they mean "install CPython". Other implementations exist (PyPy, MicroPython, GraalPy) but 99% of jobs and interviews assume CPython.</p>
<p>A new <b>3.x</b> release ships every <b>October</b> (3.13 in 2024, 3.14 in 2025, 3.15 in 2026) and each gets about <b>5 years</b> of fixes. Python 2 has been dead since January 2020 — if a tutorial writes <code>print "hi"</code> without brackets, it is ancient.</p>
<h4>🟢 Installing (pick one)</h4>
${H.table(['Where', 'Easiest way', 'Then check with'], [
  ['Windows', 'python.org installer / Python Install Manager (gives the <code>py</code> command), or Microsoft Store', '<code>py --version</code> or <code>python --version</code>'],
  ['macOS', 'python.org installer or <code>brew install python</code>', '<code>python3 --version</code>'],
  ['Linux', 'usually pre-installed; <code>sudo apt install python3 python3-venv</code>', '<code>python3 --version</code>'],
  ['Any OS (modern)', '<code>uv python install 3.13</code> (fast all-in-one tool) or <code>pyenv</code>', '<code>uv run python --version</code>'],
  ['No install at all', 'this page (Pyodide = CPython compiled to WebAssembly), Google Colab, online REPLs', 'press ▶ Run']
])}
<p>Command names differ: on macOS/Linux use <code>python3</code> (plain <code>python</code> may not exist or may be old). On Windows use <code>py</code> or <code>python</code>. When confused, ask Python itself:</p>
<pre>python3 -c "import sys; print(sys.version); print(sys.executable)"</pre>
<h4>🟢 Four ways to run code</h4>
${H.table(['Command', 'What happens', 'Use it for'], [
  ['<code>python3</code>', 'opens the <b>REPL</b> (prompt <code>&gt;&gt;&gt;</code>)', 'experiments, quick maths, checking a behaviour'],
  ['<code>python3 hello.py</code>', 'runs a <b>script</b> file top to bottom', 'real programs'],
  ['<code>python3 -c "print(2**10)"</code>', 'runs one command string', 'one-liners in a terminal'],
  ['<code>python3 -m http.server</code>', 'runs a <b>module</b> as a program', 'tools: <code>-m pip</code>, <code>-m venv</code>, <code>-m pytest</code>'],
  ['<code>python3 -i hello.py</code>', 'runs the script, then <b>stays</b> in the REPL', 'poking at variables after a run']
])}
<h4>🔵 The REPL = Read → Eval → Print → Loop</h4>
<ul>
<li><b>Read</b> one line (or a block; <code>...</code> is the continuation prompt).</li>
<li><b>Eval</b>uate it.</li>
<li><b>Print</b> the <code>repr()</code> of the result <i>if it was an expression and the result is not <code>None</code></i>. That is why <code>&gt;&gt;&gt; 'hi'</code> shows <code>'hi'</code> <b>with quotes</b> but <code>print('hi')</code> shows <code>hi</code>.</li>
<li>The last shown result is saved in the special name <code>_</code> (underscore).</li>
</ul>
<p>Handy REPL helpers: <code>help(len)</code>, <code>dir(str)</code>, <code>type(x)</code>. Quit with <code>exit()</code>, <kbd>Ctrl</kbd>+<kbd>D</kbd> (macOS/Linux) or <kbd>Ctrl</kbd>+<kbd>Z</kbd> then <kbd>Enter</kbd> (Windows). Since 3.13 the REPL has colours, multi-line editing, <kbd>F1</kbd> help, <kbd>F2</kbd> history and <kbd>F3</kbd> paste mode.</p>
<h4>🔵 Script vs REPL — the classic surprise</h4>
<p>In a <b>script</b>, a bare expression line like <code>2 + 3</code> is computed and thrown away — nothing appears. Only <code>print()</code> writes to the screen. The REPL's auto-echo is a convenience of the REPL only.</p>
<h4>🔵 What happens when you run <code>hello.py</code></h4>
${H.table(['Stage', 'What it does', 'You can see it with'], [
  ['1. Tokenize + parse', 'text → tokens → syntax tree (AST); syntax errors are caught here, <b>before anything runs</b>', '<code>python3 -m ast hello.py</code>'],
  ['2. Compile', 'AST → <b>bytecode</b> (simple instructions for a virtual machine)', '<code>python3 -m dis hello.py</code>'],
  ['3. Cache', 'imported modules save bytecode in <code>__pycache__/*.pyc</code> to start faster next time', 'look in the folder'],
  ['4. Execute', 'the <b>Python Virtual Machine</b> (a big loop in C) runs the bytecode', 'your program\'s output']
])}
<p>So "Is Python interpreted?" — the honest answer: <b>compiled to bytecode, then the bytecode is interpreted</b> (and since 3.11 the interpreter specialises hot instructions; 3.13+ also ship an experimental JIT).</p>`,
    clues: [
      '"Is Python compiled or interpreted?" → both: source is compiled to bytecode, a virtual machine interprets it',
      '"Why does the REPL show <code>\'hi\'</code> but print shows <code>hi</code>?" → REPL echoes <code>repr()</code>, print uses <code>str()</code>',
      '"<code>python: command not found</code>" / "wrong version runs" → PATH problem; use <code>python3</code>/<code>py</code>, check <code>sys.executable</code>',
      '"What is <code>__pycache__</code> / a .pyc file?" → cached bytecode of imported modules',
      '"What does <code>_</code> mean in the interactive shell?" → the last echoed result',
      '"error: externally-managed-environment" on <code>pip install</code> → system Python is protected (PEP 668); make a virtual environment',
      '"CPython vs PyPy vs Jython" → implementations of the same language; CPython is the reference'
    ],
    code: [{ lang: 'python', run: true, title: 'hello.py — your first script (runnable)', code: R`# hello.py — run it with:  python3 hello.py
import sys            # sys tells us about the Python that is running us

print("Hello, Python!")                       # print writes text to the screen
print("Version:", sys.version.split()[0])      # e.g. 3.13.1
print("Major/minor:", sys.version_info[:2])    # a tuple like (3, 13)

2 + 3          # computed and thrown away: scripts do NOT auto-echo
print(2 + 3)   # only print() shows something -> 5

# Is this Python new enough?  Tuples compare item by item.
if sys.version_info >= (3, 10):
    print("New enough for match/case and nicer error messages")` },
    { lang: 'bash', title: 'Terminal commands you will use', code: R`# Which Python? (macOS/Linux use python3, Windows uses py or python)
python3 --version
py --version

# Start the REPL, then leave it with exit() or Ctrl-D
python3

# Run a script / a one-liner / a module
python3 hello.py
python3 -c "print(2 ** 100)"
python3 -m pip --version

# Run a script and stay in the REPL afterwards to inspect variables
python3 -i hello.py

# Modern all-in-one tool: install a Python and run with it
uv python install 3.13
uv run --python 3.13 hello.py

# A project-local environment (keeps packages per project)
python3 -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate` }],
    codeTitle: ['Your first script', 'Install and run commands'],
    viz: {
      title: 'REPL simulator: Read → Eval → Print → Loop',
      input: "2 + 3; _ * 10; x = 7; x * 2; print(x); 'hi'; print('hi'); None",
      inputLabel: 'REPL lines separated by ; (ints, floats, strings, names, x = ..., print(...))',
      gen: function (input) {
        var lines = String(input).split(';').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!lines.length) throw new Error('Type some REPL lines separated by ;  e.g.  2 + 3; _ * 10');
        if (lines.length > 10) throw new Error('Use at most 10 lines');
        var env = {}, term = [], frames = [];
        var nodes = [{ id: 'R', label: 'Read', x: 15, y: 10, shape: 'box' }, { id: 'E', label: 'Eval', x: 50, y: 10, shape: 'box' }, { id: 'P', label: 'Print repr', x: 85, y: 10, shape: 'box' }, { id: 'L', label: 'Loop', x: 50, y: 40, shape: 'box' }];
        var edges = [['R', 'E'], ['E', 'P'], ['P', 'L'], ['L', 'R']];
        function g(h, eh) { return { type: 'graph', label: 'The REPL cycle', directed: true, height: 50, nodes: nodes, edges: edges, hl: h, ehl: eh || {} }; }
        function envVars() { var v = {}; Object.keys(env).forEach(function (k) { v[k] = repr(env[k]); }); return v; }
        function termPart() { return { type: 'text', label: 'Terminal', html: '<pre>' + H.esc(term.concat(['>>> ']).join('\n')) + '</pre>' }; }
        frames.push({ narr: 'The REPL starts and shows the <b>&gt;&gt;&gt;</b> prompt. Nothing is defined yet.', parts: [g({ R: 'cur' }), termPart(), { type: 'vars', label: 'Names defined', vals: { '(none yet)': '' } }] });
        lines.forEach(function (ln) {
          if (ln.length > 60) throw new Error('Keep each line under 60 characters');
          term.push('>>> ' + ln);
          frames.push({ narr: '<b>Read</b>: you type <code>' + H.esc(ln) + '</code> and press Enter.', parts: [g({ R: 'cur' }, { 'L-R': 'ok' }), termPart(), { type: 'vars', label: 'Names defined', vals: envVars() }] });
          var am = ln.match(/^([A-Za-z_]\w*)\s*=(?!=)\s*(.+)$/), steps = [], out = [];
          try {
            if (am) {
              var v = evalNode(parseExpr(am[2]), env, steps, out); env[am[1]] = v;
              out.forEach(function (o) { term.push(o); });
              frames.push({ narr: '<b>Eval</b>: this is an <b>assignment statement</b>. Python computes <code>' + H.esc(am[2]) + '</code> = ' + H.esc(repr(v)) + ' and binds the name <b>' + am[1] + '</b>. Statements have no value, so the REPL <b>prints nothing</b> and <code>_</code> is unchanged.', parts: [g({ E: 'cur' }, { 'R-E': 'ok' }), termPart(), { type: 'vars', label: 'Names defined', vals: envVars(), hl: (function () { var h = {}; h[am[1]] = 'ok'; return h; })() }] });
            } else {
              var r = evalNode(parseExpr(ln), env, steps, out);
              var stepTxt = steps.length ? steps.map(function (s) { return s.text; }).join('<br>') : 'a literal evaluates to itself';
              frames.push({ narr: '<b>Eval</b>: it is an <b>expression</b>. ' + stepTxt, parts: [g({ E: 'cur' }, { 'R-E': 'ok' }), termPart(), { type: 'vars', label: 'Names defined', vals: envVars() }] });
              out.forEach(function (o) { term.push(o); });
              if (r.t === 'NoneType') {
                frames.push({ narr: '<b>Print</b>: the value is <code>None</code>, so the REPL shows nothing extra' + (out.length ? ' (the text you see came from <code>print()</code> itself, which returns None)' : '') + '. <code>_</code> is <b>not</b> updated for None.', parts: [g({ P: 'cur' }, { 'E-P': 'ok' }), termPart(), { type: 'vars', label: 'Names defined', vals: envVars() }] });
              } else {
                term.push(repr(r)); env._ = r;
                frames.push({ narr: '<b>Print</b>: the REPL echoes <code>repr(result)</code> = <b>' + H.esc(repr(r)) + '</b>' + (r.t === 'str' ? ' — note the <b>quotes</b>: repr shows it is a string' : '') + ', and stores it in <code>_</code>.', parts: [g({ P: 'cur' }, { 'E-P': 'ok' }), termPart(), { type: 'vars', label: 'Names defined', vals: envVars(), hl: { _: 'ok' } }] });
              }
            }
          } catch (e) {
            if (!e.py) throw e;
            term.push('Traceback (most recent call last):', '  File "<python-input>", line 1, in <module>', e.message);
            frames.push({ narr: '<b>Eval</b> failed with <span class="c-r">' + H.esc(e.message) + '</span>. The REPL prints the traceback and simply <b>keeps going</b> — one error never kills an interactive session.', parts: [g({ E: 'bad' }), termPart(), { type: 'vars', label: 'Names defined', vals: envVars() }] });
          }
        });
        frames.push({ narr: '<b>Loop</b>: back to the prompt. In a <b>script</b> the same lines would print only what <code>print()</code> writes — no auto-echo, no <code>_</code>.', parts: [g({ L: 'cur', R: 'win' }), termPart(), { type: 'vars', label: 'Names defined', vals: envVars() }] });
        return frames;
      }
    },
    examples: [
      { title: 'The REPL as a calculator with _', html: R`<p>The REPL remembers the last echoed result in <code>_</code>, so you can chain calculations without naming anything:</p>
<pre>&gt;&gt;&gt; 1200 * 12
14400
&gt;&gt;&gt; _ * 0.3          # 30% tax on the yearly amount
4320.0
&gt;&gt;&gt; round(_)
4320</pre><p>Inside a <b>script</b>, <code>_</code> has no special meaning (it is just a normal name, often used for "I don't care" values like <code>for _ in range(3)</code>).</p>` },
      { title: 'Same lines, REPL vs script', html: R`<p>Type these in the REPL and you see three lines of output. Save them as <code>demo.py</code> and run it — you see only <b>one</b>:</p>`, code: { lang: 'python', run: true, code: R`'hello'          # REPL would echo 'hello' ; a script shows nothing
len('hello')     # REPL would echo 5       ; a script shows nothing
print('hello')   # both show: hello` } },
      { title: 'Which Python is running me?', html: R`<p>"It works on my machine" bugs are often two Pythons on one computer. Print the version and the exact executable path; inside a virtual environment the path points into <code>.venv</code>.</p>`, code: { lang: 'python', run: true, code: R`import sys, platform

print(platform.python_implementation())  # CPython (or PyPy, ...)
print(sys.version_info)                   # sys.version_info(major=3, minor=13, ...)
print(sys.executable)                     # full path of the interpreter binary
print(sys.prefix != sys.base_prefix)      # True inside a virtual environment` } },
      { title: 'Seeing the bytecode', html: R`<p>The <code>dis</code> module shows what the compiler produced. Notice <code>2 * 3</code> was already folded to <code>6</code> at compile time ("constant folding").</p>`, code: { lang: 'python', run: true, code: R`import dis

def area():
    width = 2 * 3          # folded to 6 by the compiler
    return width * 4

dis.dis(area)              # prints LOAD_CONST / STORE_FAST / BINARY_OP ... lines` } }
    ],
    deepDive: R`<h4>🟣 Inside CPython's pipeline</h4>
<ul>
<li><b>Parser</b>: since 3.9 CPython uses a <b>PEG parser</b>; that is why newer versions give precise error messages like <code>'(' was never closed</code> and "Did you mean ...?" suggestions.</li>
<li><b>Bytecode</b> is per code object (module, function, class body). It is <b>not</b> portable across minor versions — a .pyc from 3.12 is ignored by 3.13 (the magic number in the file header differs) and simply rebuilt.</li>
<li><b>Faster CPython</b>: 3.11 added the <b>specialising adaptive interpreter</b> (an instruction like <code>BINARY_OP</code> rewrites itself to <code>BINARY_OP_ADD_INT</code> once it sees ints) — typically 10–60% faster than 3.10. 3.13 added an experimental copy-and-patch <b>JIT</b> (off by default) and an optional <b>free-threaded</b> build (<code>python3.13t</code>) without the GIL; in 3.14 the free-threaded build became officially supported.</li>
<li><b>Start-up</b>: <code>python -X importtime script.py</code> shows which imports are slow; <code>python -I</code> runs "isolated" (ignores the user site-packages and environment variables) — great for reproducible tooling.</li>
</ul>
<h4>🟣 Production reality</h4>
<ul>
<li><b>Never</b> <code>sudo pip install</code> into the system Python on Linux — distros mark it "externally managed" (PEP 668) because OS tools depend on it. Use a <b>virtual environment</b> per project (<code>python3 -m venv .venv</code> or <code>uv venv</code>).</li>
<li>Pin the version: a <code>.python-version</code> file (read by pyenv and uv) or <code>requires-python = "&gt;=3.11"</code> in <code>pyproject.toml</code>.</li>
<li>Docker images: prefer an official <code>python:3.13-slim</code> base; the full image is large.</li>
<li>Shebang for executable scripts: <code>#!/usr/bin/env python3</code> on the first line, then <code>chmod +x</code>.</li>
</ul>
<h4>🟣 Edge cases worth knowing</h4>
<ul><li>A file named <code>random.py</code> or <code>math.py</code> in your folder <b>shadows</b> the standard module — a classic beginner mystery ("module has no attribute randint"). Python 3.13 now warns about this.</li>
<li>Indentation is syntax: mixing tabs and spaces raises <code>TabError</code>. Configure your editor to insert 4 spaces.</li></ul>`,
    aiEra: R`<p><b>What AI changes:</b> assistants can install toolchains, write <code>pyproject.toml</code> files and explain error tracebacks instantly. Copilot-style tools autocomplete whole scripts, and agents can run code in sandboxes (often exactly this kind of Pyodide/WebAssembly or container REPL).</p>
<p><b>Use AI as a partner:</b> paste a confusing traceback and ask <code>Explain this error in one sentence, then list the 3 most likely causes — don't rewrite my code yet</code>. Ask it to generate a setup checklist for your OS, then <i>verify each command yourself</i>.</p>
<p><b>Where AI goes wrong:</b> mixing up <code>python</code>/<code>python3</code>/<code>py</code> for your OS, suggesting <code>sudo pip install</code>, using Python 2 syntax from old training data, or inventing flags. It also cannot see which interpreter <i>your</i> terminal resolves — only <code>sys.executable</code> can.</p>
<p><b>What you must still own:</b> knowing which interpreter and environment your code runs in, reading tracebacks bottom-up, and using the REPL as your <b>fastest truth machine</b> — when the AI and the REPL disagree, the REPL wins.</p>`,
    problems: [{
      title: 'Version Gate',
      level: 'Easy', tags: ['sys.version_info', 'tuples', 'comparison'], companies: ['Generic'],
      statement: R`<p>Your tool needs at least Python <b>3.10</b>. Write <code>version_ok(current, minimum)</code> that receives two version tuples like <code>(3, 13, 1)</code> and <code>(3, 10)</code> and returns <code>True</code> if <code>current</code> is the same or newer. Then print a friendly message using the real <code>sys.version_info</code>.</p>`,
      constraints: R`Tuples contain 1–3 non-negative ints. Do not convert to strings or floats.`,
      example: R`<p><code>version_ok((3, 13, 1), (3, 10))</code> → ${H.c('g', 'True')} (13 &gt; 10 decides it).<br><code>version_ok((3, 9, 18), (3, 10))</code> → ${H.c('r', 'False')} (9 &lt; 10).<br><code>version_ok((3, 10), (3, 10))</code> → ${H.c('g', 'True')} (equal is fine).</p>`,
      brute: { why: R`<p>A common naive attempt turns versions into floats: <code>3.9</code> vs <code>3.10</code> → <code>3.9 &gt; 3.1</code>, so 3.9 looks <b>newer</b>! Comparing strings fails too: <code>"3.9" &gt; "3.10"</code> is True because <code>'9' &gt; '1'</code>.</p>`, code: R`def version_ok_wrong(current, minimum):
    # BUG: "3.10" becomes the float 3.1, so 3.9 looks bigger than 3.10
    cur = float(f"{current[0]}.{current[1]}")
    need = float(f"{minimum[0]}.{minimum[1]}")
    return cur >= need

print(version_ok_wrong((3, 9), (3, 10)))   # True  <- wrong!` },
      mcq: { q: 'Which comparison correctly says 3.9 is older than 3.10?', options: ['<code>(3, 9) &lt; (3, 10)</code>', '<code>3.9 &lt; 3.10</code>', '<code>"3.9" &lt; "3.10"</code>', 'They are all fine'], answer: 0, explain: 'Tuples compare item by item as integers: 3 == 3, then 9 < 10 → True. The float 3.10 is just 3.1, and strings compare character by character.' },
      hints: [R`<p>Hint 1: Python already knows how to compare tuples: first items, then second items, and so on — exactly like comparing dates or version numbers.</p>`, R`<p>Hint 2: <code>sys.version_info</code> behaves like a tuple <code>(major, minor, micro, releaselevel, serial)</code>, so <code>sys.version_info[:2]</code> gives <code>(3, 13)</code>.</p>`, R`<p>Hint 3: Shorter tuple that is a prefix counts as smaller: <code>(3, 10) &lt; (3, 10, 0)</code>. To treat "3.10" and "3.10.0" as equal, compare only <code>current[:len(minimum)]</code>. Recipe: slice → compare with <code>&gt;=</code>.</p>`],
      solution: {
        approach: R`<p>Slice the current version to the same length as the minimum, then compare tuples with <code>&gt;=</code>. Tuple comparison is lexicographic over integers, which is exactly how version numbers work.</p>`,
        code: { lang: 'python', run: true, code: R`import sys

def version_ok(current, minimum):
    """True if the current version tuple is >= minimum (compare only as many parts as minimum has)."""
    return tuple(current[:len(minimum)]) >= tuple(minimum)

# quick checks
print(version_ok((3, 13, 1), (3, 10)))   # True
print(version_ok((3, 9, 18), (3, 10)))   # False
print(version_ok((3, 10), (3, 10)))      # True

# real interpreter
if version_ok(sys.version_info, (3, 10)):
    print(f"OK: running Python {sys.version_info.major}.{sys.version_info.minor}")
else:
    print("Please upgrade to Python 3.10+")` },
        dry: { head: ['call', 'current[:len(min)]', 'compare', 'result'], rows: [['(3,13,1) vs (3,10)', '(3, 13)', '3==3, then 13 &gt; 10', '<span class="c-g">True</span>'], ['(3,9,18) vs (3,10)', '(3, 9)', '3==3, then 9 &lt; 10', '<span class="c-r">False</span>'], ['(3,10) vs (3,10)', '(3, 10)', 'all equal', '<span class="c-g">True</span>']] },
        complexity: R`<p>O(k) where k = number of parts (≤ 3) — effectively O(1). No extra memory beyond the small slice.</p>`,
        followUps: ['Parse a version string like "3.12.4rc1" into a comparable tuple.', 'Why does packaging use <code>packaging.version.Version</code> instead of tuples?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 2 — Variables are names bound to objects
     ===================================================================== */
  topics.push({
    title: 'Variables Are Name Tags Bound to Objects',
    analogy: R`<p>In many languages a variable is a <b>box</b> with a value inside. In Python a variable is a <b>luggage tag on a string</b>. The suitcase (the <b>object</b>) sits on the conveyor belt; the tag just says "this one is <i>Asha's</i>". You can tie <b>two tags</b> to the same suitcase (<code>b = a</code>) — open it through either tag and you see the same clothes. Moving a tag to a different suitcase (<code>a = something_else</code>) does nothing to the suitcase or to the other tag. And when a suitcase has <b>no tags left</b>, the airport (Python) throws it away.</p>`,
    explain: R`<h4>🟢 The one rule that explains everything</h4>
<p><code>x = 300</code> does two things, <b>right side first</b>: (1) create (or find) an <b>object</b> — a thing in memory with a <b>type</b>, a <b>value</b> and an <b>identity</b>; (2) bind the <b>name</b> <code>x</code> to it. The name has no type and no value of its own — it only points.</p>
${H.table(['Every object has', 'Ask with', 'Can it change?'], [
  ['identity (which object)', '<code>id(x)</code>, <code>x is y</code>', 'never, for the object\'s lifetime'],
  ['type (what kind)', '<code>type(x)</code>', 'never'],
  ['value (contents)', '<code>x == y</code>', 'only if the type is <b>mutable</b> (list, dict, set …)']
])}
<h4>🟢 Assignment never copies</h4>
<pre>a = [1, 2]
b = a          # b is a second tag on the SAME list
b.append(3)
print(a)       # [1, 2, 3]  — a "changed" because it is the same object</pre>
<p>This is called <b>aliasing</b>: two names, one object.</p>
<h4>🔵 Re-binding vs mutating — the key distinction</h4>
${H.table(['You write', 'What happens', 'Other names see it?'], [
  ['<code>a = a + [4]</code>', H.c('b', 're-bind') + ': build a NEW list, move tag <code>a</code> to it', 'No'],
  ['<code>a.append(4)</code>, <code>a[0] = 9</code>', H.c('y', 'mutate') + ': change the object in place', '<b>Yes</b>'],
  ['<code>a += [4]</code> (list)', H.c('y', 'mutate') + ' (lists extend in place)', '<b>Yes</b>'],
  ['<code>n += 1</code> (int/str/tuple)', H.c('b', 're-bind') + ' (immutables cannot change)', 'No']
])}
<h4>🔵 <code>is</code> vs <code>==</code></h4>
<ul>
<li><code>a == b</code>: "do they hold <b>equal values</b>?" — use this 99% of the time.</li>
<li><code>a is b</code>: "are they the <b>same object</b>?" — use it for <code>None</code> (<code>if x is None:</code>) and when identity really matters.</li>
</ul>
<h4>🔵 Assignment forms you will use daily</h4>
<pre>x = y = 0            # chained: both names → the same 0 object
a, b = 1, 2          # tuple unpacking
a, b = b, a          # swap: right side is built FIRST, then names re-bound
first, *rest = [1, 2, 3, 4]   # first=1, rest=[2, 3, 4]
count += 1           # augmented assignment
del x                # removes the NAME, not necessarily the object</pre>
<h4>🔵 Naming rules</h4>
<p>Names: letters, digits, underscores; cannot start with a digit; case-sensitive (<code>Age</code> ≠ <code>age</code>); cannot be a keyword (<code>class</code>, <code>if</code>, <code>None</code> …). Style (PEP 8): <code>snake_case</code> for variables/functions, <code>UPPER_CASE</code> for constants, <code>PascalCase</code> for classes. Avoid shadowing built-ins like <code>list</code>, <code>str</code>, <code>id</code>, <code>sum</code>.</p>`,
    clues: [
      '"I changed b and a changed too!" → aliasing: both names bound to one mutable object',
      '"Difference between <code>is</code> and <code>==</code>" → identity vs equality; <code>is</code> only for None/singletons',
      '"Does Python pass by value or by reference?" → neither: <b>pass by object reference</b> (call by sharing)',
      '"Swap two variables without a temp" → <code>a, b = b, a</code> (right side evaluated first)',
      '"Why is <code>a is b</code> True for 256 but False for 257?" → CPython small-int cache (-5..256), an implementation detail',
      '"What does <code>del</code> do?" → unbinds a name; the object is freed when its reference count hits 0',
      '<code>x = y = []</code> then <code>x.append(1)</code> → y changed too (one list, two names)'
    ],
    code: [{ lang: 'python', run: true, title: 'Names, objects, identity (runnable)', code: R`a = [1, 2]
b = a                      # no copy: two names, one list
print(a is b, id(a) == id(b))   # True True

b.append(3)                # mutate the shared object
print("a =", a)            # a = [1, 2, 3]

a = a + [4]                # build a NEW list, re-bind only 'a'
print("a =", a, "b =", b)  # a = [1, 2, 3, 4] b = [1, 2, 3]
print(a is b)              # False

x = 1000
y = x                      # same int object
x += 1                     # ints are immutable: x now names a NEW int
print(x, y)                # 1001 1000

c = b.copy()               # an explicit (shallow) copy
print(c == b, c is b)      # True False  -> equal value, different objects

p, q = 1, 2
p, q = q, p                # swap
print(p, q)                # 2 1

first, *rest = [10, 20, 30, 40]
print(first, rest)         # 10 [20, 30, 40]` }],
    codeTitle: ['Core behaviour'],
    viz: {
      title: 'Names → objects: watch the arrows move',
      input: "a = [1, 2]\nb = a\nb.append(3)\nprint(a)\na = a + [4]\nprint(a is b)\nx = 300\ny = x\nx += 1\nprint(x, y)\nb += [9]\ndel y",
      inputLabel: 'Lines (x = 5, s = "hi", a = [1, 2], b = a, a = a + [3], a += [4], a.append(5), a[0] = 9, a, b = b, a, del x, print(a is b))',
      gen: function (input) { return nameMachine(input); }
    },
    examples: [
      { title: 'The chained-assignment trap', html: R`<p><code>x = y = []</code> creates <b>one</b> list with two tags. Appending through <code>x</code> shows up in <code>y</code>. If you want two separate lists, write two literals.</p>`, code: { lang: 'python', run: true, code: R`x = y = []
x.append("oops")
print(y)            # ['oops']  -> same list

x, y = [], []       # two different lists
x.append("fine")
print(x, y)         # ['fine'] []` } },
      { title: 'Rebinding inside a function does not affect the caller', html: R`<p>Arguments are passed by <b>object reference</b>: the parameter is a new tag on the caller's object. <b>Mutating</b> the object is visible to the caller; <b>re-binding</b> the parameter is not.</p>`, code: { lang: 'python', run: true, code: R`def mutate(items):
    items.append(99)      # changes the caller's list

def rebind(items):
    items = [0]           # only moves the local tag

nums = [1, 2]
mutate(nums)
print(nums)               # [1, 2, 99]
rebind(nums)
print(nums)               # [1, 2, 99]  (unchanged)` } },
      { title: 'is vs == with numbers and None', html: R`<p>Equal values do not imply the same object. Small ints happen to be cached by CPython, so <code>is</code> "works" for them by accident — never rely on that. <code>None</code> is a true singleton, so <code>is None</code> is the correct, fastest test.</p>`, code: { lang: 'python', run: true, code: R`a = 256
b = int("256")        # built at run time
print(a == b, a is b) # True True   (small-int cache -5..256)

c = 257
d = int("257")
print(c == d, c is d) # True False  (two different int objects)

result = None
print(result is None) # True — the idiomatic None check` } },
      { title: 'del removes names, not objects', html: R`<p>After <code>del a</code>, the list still lives because <code>b</code> still points at it. Only when the <b>last</b> reference goes does CPython free it (reference counting).</p>`, code: { lang: 'python', run: true, code: R`import sys
a = [1, 2, 3]
b = a
print(sys.getrefcount(a))  # usually 3: a, b + the call's temporary (varies by version)
del a
print(b)                   # [1, 2, 3] — object survives
# print(a)  would raise NameError: name 'a' is not defined` } }
    ],
    deepDive: R`<h4>🟣 What a name really is</h4>
<p>A namespace is a <b>dictionary</b> from strings to object references. At module level you can literally see it: <code>globals()['x']</code>. Inside functions CPython optimises locals into a fixed array ("fast locals"), which is why <code>locals()</code> is a snapshot there. Each object starts with a header: a <b>reference count</b> and a pointer to its <b>type</b> (<code>PyObject</code>: <code>ob_refcnt</code>, <code>ob_type</code>).</p>
<h4>🟣 Identity details</h4>
<ul>
<li>In CPython <code>id(x)</code> is the memory address. Two objects with non-overlapping lifetimes may get the <b>same</b> id — so storing ids of temporary objects is a bug.</li>
<li><b>Small ints</b> −5…256, <code>None</code>, <code>True</code>, <code>False</code> and many short strings are shared. Since 3.12 these are <b>immortal</b> objects (their refcount never changes; PEP 683), which also helps multi-core builds.</li>
<li>Constants in the <b>same code block</b> can be merged by the compiler: in a script, <code>a = 1000; b = 1000; a is b</code> may be <code>True</code>, but in the REPL on separate lines it is <code>False</code>. Python 3.8+ even emits a <code>SyntaxWarning: "is" with a literal</code>. Lesson: <code>is</code> is for identity, never for value comparison.</li>
</ul>
<h4>🟣 Augmented assignment, precisely</h4>
<p><code>a += b</code> first tries <code>a.__iadd__(b)</code> (in-place, returns the same object for lists) and falls back to <code>a = a.__add__(b)</code>. The famous puzzle: <code>t = ([1],); t[0] += [2]</code> <b>raises TypeError</b> (tuples do not support item assignment) <b>and</b> still changes the list to <code>[1, 2]</code> — the in-place extend happens before the failing store.</p>
<h4>🟣 Garbage collection in one paragraph</h4>
<p>CPython frees most objects the instant their reference count reaches 0 (deterministic). Reference <b>cycles</b> (a list containing itself, two objects pointing at each other) are found by a separate cyclic garbage collector (<code>gc</code> module) that runs periodically. PyPy uses a different (tracing) GC, so code that depends on "file closed as soon as the name goes away" is not portable — use <code>with</code> blocks.</p>`,
    aiEra: R`<p><b>What AI changes:</b> assistants explain aliasing bugs well when you show them the code, and can draw name→object diagrams on request. Tools like Python Tutor-style visualisers are now built into many AI tutors.</p>
<p><b>Use AI as a partner:</b> <code>Here is my function; list every place where two names might point to the same mutable object</code>. Ask it to write a test that would <i>fail</i> if a function accidentally mutates its input.</p>
<p><b>Where AI goes wrong:</b> generated code sometimes uses <code>is</code> to compare strings or numbers (works in a quick test thanks to caching/interning, then breaks in production), writes <code>x = y = []</code>, or "fixes" aliasing by sprinkling <code>copy.deepcopy</code> everywhere (slow, hides the design issue).</p>
<p><b>What you must still own:</b> the mental model "names point at objects; assignment never copies; mutation is shared". With it you can review AI output in seconds — without it, aliasing bugs look like magic.</p>`,
    problems: [{
      title: 'Same, Equal or Different?',
      level: 'Easy', tags: ['identity', 'equality', 'aliasing'], companies: ['Google', 'Microsoft'],
      statement: R`<p>Write <code>relation(a, b)</code> that returns:</p><ul><li><code>"same object"</code> if <code>a</code> and <code>b</code> are the very same object,</li><li><code>"equal copies"</code> if they are different objects with equal values,</li><li><code>"different"</code> otherwise.</li></ul><p>Then use it to classify an alias, a copy and an unrelated list.</p>`,
      constraints: R`Any Python objects that support <code>==</code>. Order of checks matters.`,
      example: R`<p><code>x = [1, 2]; y = x; z = x.copy()</code><br><code>relation(x, y)</code> → ${H.c('g', '"same object"')}<br><code>relation(x, z)</code> → ${H.c('b', '"equal copies"')}<br><code>relation(x, [3])</code> → ${H.c('r', '"different"')}</p>`,
      brute: { why: R`<p>Comparing <code>id()</code> strings or using only <code>==</code> cannot tell an alias from a copy: <code>x == y</code> and <code>x == z</code> are both True. Another trap is checking <code>==</code> first — then aliases are reported as "equal copies".</p>`, code: R`def relation_wrong(a, b):
    # BUG: == is True for both aliases and copies, so the order hides "same object"
    if a == b:
        return "equal copies"
    if a is b:
        return "same object"
    return "different"

x = [1, 2]
print(relation_wrong(x, x))   # equal copies  <- wrong` },
      mcq: { q: 'After <code>y = x</code> where x is a list, which is true?', options: ['<code>x is y</code> and <code>x == y</code>', 'only <code>x == y</code>', 'only <code>x is y</code>', 'neither'], answer: 0, explain: 'Same object ⇒ identical ⇒ certainly equal (for normal types). Identity implies equality; equality does not imply identity.' },
      hints: [R`<p>Hint 1: Identity is the stronger statement. If two names point at the same object, they are automatically equal, so test identity <b>first</b>.</p>`, R`<p>Hint 2: <code>a is b</code> compares identities (like <code>id(a) == id(b)</code> but safer); <code>a == b</code> calls <code>__eq__</code> to compare values.</p>`, R`<p>Hint 3: Edge case: <code>float('nan')</code> is not equal to itself, so <code>n is n</code> is True while <code>n == n</code> is False — checking identity first also handles this. Recipe: if is → same; elif == → equal; else different.</p>`],
      solution: {
        approach: R`<p>Check from strongest to weakest relation: identity, then equality, then fall through.</p>`,
        code: { lang: 'python', run: true, code: R`def relation(a, b):
    """Classify how two objects relate: identity, equality, or neither."""
    if a is b:                 # same object (one suitcase, two tags)
        return "same object"
    if a == b:                 # different suitcases, same contents
        return "equal copies"
    return "different"

x = [1, 2]
y = x
z = x.copy()
print(relation(x, y))          # same object
print(relation(x, z))          # equal copies
print(relation(x, [3]))        # different
nan = float("nan")
print(relation(nan, nan))      # same object (even though nan != nan)` },
        dry: { head: ['call', 'a is b?', 'a == b?', 'returns'], rows: [['relation(x, y)', '<span class="c-g">True</span>', '(not checked)', '"same object"'], ['relation(x, z)', 'False', '<span class="c-g">True</span>', '"equal copies"'], ['relation(x, [3])', 'False', 'False', '"different"'], ['relation(nan, nan)', '<span class="c-g">True</span>', '(not checked)', '"same object"']] },
        complexity: R`<p><code>is</code> is O(1) (pointer compare). <code>==</code> on lists is O(n) in the worst case (element by element).</p>`,
        followUps: ['How would you detect that two <i>nested</i> lists share an inner list?', 'Why is <code>x is None</code> preferred over <code>x == None</code>?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 3 — The core built-in types: int, float, str, bool, None
     ===================================================================== */
  function approxSize(v) {
    if (v.t === 'int' || v.t === 'bool') { var n = asInt(v); if (n < 0n) n = -n; var d = 0; while (n > 0n) { d++; n >>= 30n; } return { b: 24 + 4 * Math.max(1, d), approx: false }; }
    if (v.t === 'float') return { b: 24, approx: false };
    if (v.t === 'NoneType') return { b: 16, approx: false };
    if (v.t === 'str') {
      var cps = Array.from(v.v).map(function (c) { return c.codePointAt(0); }), mx = cps.reduce(function (a, b) { return Math.max(a, b); }, 0), L = cps.length;
      if (mx < 128) return { b: 41 + L, approx: false };
      if (mx < 256) return { b: 56 + L + 1, approx: true };
      if (mx < 65536) return { b: 56 + 2 * (L + 1), approx: true };
      return { b: 56 + 4 * (L + 1), approx: true };
    }
    return { b: 0, approx: true };
  }
  var TYPE_NOTE = {
    int: 'a whole number of <b>any size</b> (no overflow). Immutable.',
    float: 'a 64-bit IEEE-754 double: about 15–17 significant digits, can be inexact. Immutable.',
    str: 'an immutable sequence of Unicode characters.',
    bool: 'True/False — and secretly a <b>subclass of int</b> (True == 1, False == 0).',
    NoneType: 'the single "no value here" object. Falsy. Test it with <code>is None</code>.',
    type: 'a class object — what <code>type()</code> returns.'
  };

  topics.push({
    title: 'Core Types: int, float, str, bool & None',
    analogy: R`<p>Think of the five core types as five kinds of <b>things in a kitchen</b>. <b>int</b> is a pile of whole eggs — you count them exactly, and the pile can be as big as you like. <b>float</b> is flour on a scale — great for amounts, but the scale only shows so many digits, so tiny errors creep in. <b>str</b> is a label-maker strip of letters. <b>bool</b> is a light switch: on or off. <b>None</b> is the <b>empty plate</b> — it is a real plate you can point to, it just says "nothing here yet".</p>`,
    explain: R`<h4>🟢 The five you meet on day one</h4>
${H.table(['Type', 'Literals', 'Mutable?', 'Falsy value(s)', 'Typical use'], [
  ['<code>int</code>', '<code>42</code>, <code>-7</code>, <code>1_000_000</code>, <code>0xff</code>, <code>0b101</code>, <code>0o17</code>', 'no', '<code>0</code>', 'counting, indexes, money in cents'],
  ['<code>float</code>', '<code>3.14</code>, <code>2.</code>, <code>.5</code>, <code>1e-3</code>, <code>float("inf")</code>', 'no', '<code>0.0</code>, <code>-0.0</code>', 'measurements, science, ratios'],
  ['<code>str</code>', '<code>\'hi\'</code>, <code>"hi"</code>, <code>"""multi-line"""</code>', 'no', '<code>""</code> (empty)', 'text'],
  ['<code>bool</code>', '<code>True</code>, <code>False</code>', 'no', '<code>False</code>', 'conditions, flags'],
  ['<code>NoneType</code>', '<code>None</code>', 'no', '<code>None</code>', '"no result / not set yet"']
])}
<p>Ask any object its type with <code>type(x)</code>; check membership in a type with <code>isinstance(x, int)</code>.</p>
<h4>🟢 int — whole numbers, exact, unlimited</h4>
<p><code>2 ** 100</code> is <code>1267650600228229401496703205376</code> — exactly. There is no <code>long</code>, no overflow. Underscores are allowed for readability: <code>10_000_000</code>. Other bases: <code>0xff</code> (255), <code>0b1010</code> (10), <code>0o17</code> (15).</p>
<h4>🟢 float — fast, approximate decimals</h4>
<p><code>0.1 + 0.2</code> gives <code>0.30000000000000004</code> because 0.1 cannot be stored exactly in binary (topic 7 shows why). Special values: <code>float('inf')</code>, <code>float('-inf')</code>, <code>float('nan')</code> ("not a number"; it is <b>not equal to itself</b>).</p>
<h4>🟢 str — text</h4>
<p>Single and double quotes are identical; pick whichever avoids escaping: <code>"it's"</code>. Strings are <b>immutable</b>: <code>s.upper()</code> returns a <b>new</b> string. <code>len("héllo")</code> is 5 — it counts characters (code points), not bytes. Strings support <code>+</code> (join), <code>*</code> (repeat), indexing <code>s[0]</code>, and <code>in</code>.</p>
<h4>🟢 bool — True and False</h4>
<p>Comparisons produce bools: <code>3 &gt; 2</code> → <code>True</code>. Surprise: <code>bool</code> is a subclass of <code>int</code>, so <code>True + True == 2</code> and <code>sum([True, False, True]) == 2</code> (a handy way to count matches).</p>
<h4>🟢 None — "nothing"</h4>
<p>Functions without <code>return</code> give back <code>None</code>. Use it for "not set yet" and test it with <code>if x is None:</code>.</p>
<h4>🔵 Truthiness — every object is True or False in an <code>if</code></h4>
${H.table(['Falsy (treated as False)', 'Everything else is truthy'], [
  ['<code>False</code>, <code>None</code>, <code>0</code>, <code>0.0</code>, <code>0j</code>, <code>""</code>, <code>[]</code>, <code>()</code>, <code>{}</code>, <code>set()</code>, <code>range(0)</code>', '<code>"0"</code>, <code>"False"</code>, <code>" "</code>, <code>[0]</code>, <code>-1</code>, <code>0.0001</code> …']
])}
<p>So <code>if name:</code> means "if name is not empty". Careful: <code>bool("False")</code> is <code>True</code> — it is a non-empty string!</p>
<h4>🔵 Immutability, in one line</h4>
<p>All five are immutable: an operation never changes the object, it makes a new one. That is why they are safe as dictionary keys and why <code>n += 1</code> re-binds rather than mutates.</p>`,
    clues: [
      '"What is the output of <code>True + True</code>?" → 2: bool is a subclass of int',
      '"Does Python have integer overflow?" → no for int (arbitrary precision); yes-ish for float (becomes inf)',
      '"Why is <code>0.1 + 0.2 != 0.3</code>?" → binary floating point; use <code>math.isclose</code> or Decimal',
      '"Which values are falsy?" → None, False, zero of any numeric type, empty containers/strings',
      '"<code>type(x) == int</code> vs <code>isinstance(x, int)</code>" → isinstance respects subclasses (and True is an int!)',
      '"Is str mutable?" → no; methods return new strings; build big strings with <code>"".join(parts)</code>',
      '"What does a function return if it has no return?" → None'
    ],
    code: [{ lang: 'python', run: true, title: 'Meet the five core types (runnable)', code: R`values = [42, 3.14, "hi", True, None, 2 ** 100, 0.0, ""]

for v in values:
    # type(v).__name__ gives a short name like 'int'; bool(v) is its truthiness
    print(f"{v!r:>35}  type={type(v).__name__:<8} truthy={bool(v)}")

print(True + True)              # 2      bool is an int subclass
print(isinstance(True, int))    # True
print(0.1 + 0.2)                # 0.30000000000000004
print(float("nan") == float("nan"))  # False: nan is never equal, not even to itself
print(len("héllo"))             # 5 characters
print(0xff, 0b1010, 0o17, 1_000_000)  # 255 10 15 1000000` }],
    codeTitle: ['Type tour'],
    viz: {
      title: 'Type inspector: type, truthiness and memory size',
      input: "42; 3.14; 'hi'; True; None; 2 ** 100; 0.0; ''; '0'",
      inputLabel: 'Expressions separated by ; (ints, floats, strings, True/False/None, operators)',
      gen: function (input) {
        var exprs = String(input).split(';').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!exprs.length) throw new Error('Type a few values separated by ;  e.g.  42; 3.14; "hi"');
        if (exprs.length > 10) throw new Error('Use at most 10 values');
        var rows = [], sizes = [], labels = [], frames = [];
        frames.push({ narr: 'We will evaluate each expression and ask Python three questions: <b>type(x)</b>, <b>bool(x)</b> (truthiness) and <b>sys.getsizeof(x)</b> (bytes in memory on 64-bit CPython 3.12+).', parts: [{ type: 'table', label: 'Inspector', columns: ['expression', 'repr', 'type', 'bool(x)', 'getsizeof'], rows: [['—', '—', '—', '—', '—']] }] });
        exprs.forEach(function (ex) {
          var v = evalNode(parseExpr(ex), {}, [], []);
          var sz = approxSize(v), tr = truthy(v);
          rows.push([ex, repr(v).length > 24 ? repr(v).slice(0, 22) + '…' : repr(v), v.t, tr ? 'True' : 'False', (sz.approx ? '≈' : '') + sz.b + ' B']);
          sizes.push(sz.b); labels.push(v.t);
          var hl = {}; hl[rows.length - 1] = tr ? 'ok' : 'bad';
          frames.push({ narr: '<code>' + H.esc(ex) + '</code> → <b>' + H.esc(repr(v)) + '</b> is a <b>' + v.t + '</b>: ' + (TYPE_NOTE[v.t] || '') + ' It is <b>' + (tr ? 'truthy' : 'falsy') + '</b>' + (v.t === 'str' && v.v.length && !tr ? '' : (v.t === 'str' && tr && /^(0|False|None)$/.test(v.v) ? ' — a non-empty string is truthy even if it <i>says</i> "' + H.esc(v.v) + '"!' : '.')),
            parts: [{ type: 'table', label: 'Inspector', columns: ['expression', 'repr', 'type', 'bool(x)', 'getsizeof'], rows: rows.map(function (r) { return r.slice(); }), hl: hl },
              { type: 'bars', label: 'Bytes per object (getsizeof)', values: sizes.slice(), idxLabels: labels.slice() }] });
        });
        frames.push({ narr: 'Pattern check: every value is a full <b>object</b> with a header (refcount + type pointer), so even a tiny int costs 28 bytes. Big ints grow by 4 bytes per 30-bit "digit". Zero-like and empty values are falsy; everything else is truthy.', parts: [{ type: 'table', label: 'Inspector', columns: ['expression', 'repr', 'type', 'bool(x)', 'getsizeof'], rows: rows }, { type: 'bars', label: 'Bytes per object (getsizeof)', values: sizes, idxLabels: labels }] });
        return pad4(frames, 'Tip: add more values separated by ; to compare types and sizes.');
      }
    },
    examples: [
      { title: 'Counting with bools', html: R`<p>Because <code>True == 1</code>, summing a generator of conditions counts how many are true. This is idiomatic and fast.</p>`, code: { lang: 'python', run: true, code: R`scores = [55, 91, 78, 40, 99]
passed = sum(s >= 60 for s in scores)   # adds up True/False values
print(passed)                           # 3` } },
      { title: 'None as "not set yet"', html: R`<p>Use <code>None</code> as a sentinel for "no value yet", then test with <code>is None</code>. Testing with plain truthiness would wrongly treat a real value of <code>0</code> as "missing".</p>`, code: { lang: 'python', run: true, code: R`best = None
for x in [0, -3, -1]:
    if best is None or x > best:   # NOT 'if not best' — 0 would look missing
        best = x
print(best)                         # 0` } },
      { title: 'isinstance and the bool surprise', html: R`<p>Validation code that accepts "ints" will also accept <code>True</code>, because bool is an int. If that matters (e.g. a JSON API), exclude bool explicitly.</p>`, code: { lang: 'python', run: true, code: R`def is_real_int(x):
    return isinstance(x, int) and not isinstance(x, bool)

for v in [5, True, 5.0, "5"]:
    print(repr(v), isinstance(v, int), is_real_int(v))
# 5 True True / True True False / 5.0 False False / '5' False False` } },
      { title: 'Special floats', html: R`<p>Infinity is handy as a starting "best" value in min/max searches; NaN spreads through calculations and never compares equal — detect it with <code>math.isnan</code>.</p>`, code: { lang: 'python', run: true, code: R`import math
lo = float("inf")
for x in [7, 3, 9]:
    lo = min(lo, x)
print(lo)                         # 3

n = float("nan")
print(n == n, math.isnan(n))      # False True
print(1e308 * 10)                 # inf  (float overflow → infinity, no error)` } }
    ],
    deepDive: R`<h4>🟣 How CPython stores them</h4>
<ul>
<li><b>int</b>: a variable-length array of 30-bit "digits" plus a size/sign field (topic 7). Since 3.12 there is also a compact fast path for small values. <code>sys.getsizeof(1)</code> = 28 bytes on 64-bit.</li>
<li><b>float</b>: a C <code>double</code> inside a 24-byte object. <code>sys.float_info</code> tells you max ≈ 1.8e308, epsilon ≈ 2.2e-16 (the gap after 1.0).</li>
<li><b>str</b>: PEP 393 "flexible string representation" — each string uses 1, 2 or 4 bytes per character depending on its <b>widest</b> character. One emoji in a long ASCII string makes the whole string 4 bytes per char. Strings cache their hash, which makes dict lookups fast.</li>
<li><b>bool</b>: exactly two instances exist; <code>bool(x)</code> calls <code>x.__bool__()</code>, falling back to <code>__len__()</code>, falling back to "always True".</li>
<li><b>None</b>: a singleton of <code>NoneType</code>; immortal since 3.12.</li>
</ul>
<h4>🟣 Equality across types</h4>
<p><code>1 == 1.0 == True</code> is <code>True</code>, and they have equal hashes, so <code>{1: "a", 1.0: "b", True: "c"}</code> is a dict with <b>one</b> key (<code>{1: 'c'}</code>) — a favourite trick question. <code>"1" == 1</code> is simply <code>False</code> (no implicit conversion), while <code>"1" &lt; 1</code> raises <code>TypeError</code>.</p>
<h4>🟣 Other built-in scalars you should recognise</h4>
<p><code>complex</code> (<code>3+4j</code>, <code>abs(3+4j) == 5.0</code>), <code>bytes</code> (<code>b"hi"</code>, raw 0–255 values, covered in the strings module), <code>decimal.Decimal</code> and <code>fractions.Fraction</code> from the standard library (exact arithmetic, topic 7).</p>
<h4>🟣 Performance notes</h4>
<p>Everything is an object, so a Python list of a million ints stores a million pointers to 28-byte objects (~36 MB). For numeric bulk data use <code>array.array</code> or NumPy (8 bytes per value). String concatenation in a loop is O(n²) in the worst case — collect parts and <code>"".join()</code> them.</p>`,
    aiEra: R`<p><b>What AI changes:</b> generated code often handles types reasonably and adds type hints automatically (<code>def f(x: int) -&gt; str</code>), which static checkers then verify.</p>
<p><b>Use AI as a partner:</b> ask <code>List edge-case inputs for this function: zero, negative, empty string, None, True, NaN, huge ints</code> and turn them into tests. Ask it to explain why <code>{1: 'a', True: 'b'}</code> has one key — then verify in the REPL.</p>
<p><b>Where AI goes wrong:</b> truthiness shortcuts like <code>if not value:</code> that treat 0 or "" as missing; <code>type(x) == int</code> checks that reject subclasses; float money calculations; forgetting that <code>isinstance(True, int)</code> is True when validating JSON.</p>
<p><b>What you must still own:</b> choosing the right type for the data (int cents vs float dollars, None vs 0), knowing which values are falsy, and spotting the one-character bug where a truthiness check should be an <code>is None</code> check.</p>`,
    problems: [{
      title: 'Strict Type Counter',
      level: 'Easy', tags: ['type()', 'isinstance', 'bool is int'], companies: ['Amazon', 'Stripe'],
      statement: R`<p>Given a list of mixed values, return a dict counting how many are <code>int</code>, <code>float</code>, <code>str</code>, <code>bool</code> and <code>None</code>. A <code>True</code>/<code>False</code> must count as <b>bool only</b>, not as int.</p>`,
      constraints: R`0 ≤ len(values) ≤ 10<sup>5</sup>; values are only of these five types.`,
      example: R`<p>Input <code>[1, True, 2.5, "x", None, False, 7]</code><br>Output ${H.c('g', "{'int': 2, 'float': 1, 'str': 1, 'bool': 2, 'None': 1}")}<br>Why: <code>1</code> and <code>7</code> are ints; <code>True</code>/<code>False</code> go to bool even though <code>isinstance(True, int)</code> is True.</p>`,
      brute: { why: R`<p>Using an <code>isinstance</code> chain that tests <code>int</code> before <code>bool</code> sends every bool into the int bucket, because bool is a subclass of int.</p>`, code: R`def count_types_wrong(values):
    counts = {"int": 0, "float": 0, "str": 0, "bool": 0, "None": 0}
    for v in values:
        if isinstance(v, int):        # BUG: True/False also match here
            counts["int"] += 1
        elif isinstance(v, bool):     # never reached for bools
            counts["bool"] += 1
        elif isinstance(v, float):
            counts["float"] += 1
        elif isinstance(v, str):
            counts["str"] += 1
        else:
            counts["None"] += 1
    return counts

print(count_types_wrong([1, True]))   # int: 2, bool: 0  <- wrong` },
      mcq: { q: 'Which check puts <code>True</code> only in the bool bucket?', options: ['Test <code>isinstance(v, bool)</code> before <code>isinstance(v, int)</code>', 'Test <code>isinstance(v, int)</code> first', 'Use <code>v == True</code>', 'Use <code>bool(v)</code>'], answer: 0, explain: 'Check the more specific subclass first, or use exact <code>type(v)</code> lookups. <code>v == True</code> is also True for <code>1</code> and <code>1.0</code>.' },
      hints: [R`<p>Hint 1: <code>bool</code> is a subclass of <code>int</code>, so any "is it an int?" test also says yes for True/False. Either test bool first, or use the exact type.</p>`, R`<p>Hint 2: <code>type(v)</code> returns the exact class (<code>bool</code> for True), so a dict mapping <code>{int: "int", bool: "bool", ...}</code> gives O(1) exact lookups.</p>`, R`<p>Hint 3: <code>type(None)</code> is <code>NoneType</code>; map it to the label <code>"None"</code>. Empty list → all zeros. Recipe: start counts at 0 → for each v look up <code>LABEL[type(v)]</code> → add 1.</p>`],
      solution: {
        approach: R`<p>Map exact types to labels with a dict and count. <code>type(v)</code> never confuses bool with int because it returns the most specific class.</p>`,
        code: { lang: 'python', run: true, code: R`LABEL = {int: "int", float: "float", str: "str", bool: "bool", type(None): "None"}

def count_types(values):
    """Count values by exact type; bools are NOT counted as ints."""
    counts = {"int": 0, "float": 0, "str": 0, "bool": 0, "None": 0}
    for v in values:
        counts[LABEL[type(v)]] += 1    # exact type lookup, O(1)
    return counts

print(count_types([1, True, 2.5, "x", None, False, 7]))
# {'int': 2, 'float': 1, 'str': 1, 'bool': 2, 'None': 1}
print(count_types([]))` },
        dry: { head: ['v', 'type(v)', 'label', 'counts after'], rows: [['1', 'int', 'int', 'int=1'], ['True', '<span class="c-y">bool</span>', 'bool', 'int=1 bool=1'], ['2.5', 'float', 'float', 'float=1'], ['"x"', 'str', 'str', 'str=1'], ['None', 'NoneType', 'None', 'None=1'], ['False', 'bool', 'bool', 'bool=2'], ['7', 'int', 'int', '<span class="c-g">int=2</span>']] },
        complexity: R`<p>Time O(n), one dict lookup per value. Space O(1) — five counters.</p>`,
        followUps: ['Support any type by using <code>type(v).__name__</code> and <code>collections.Counter</code>.', 'When is <code>isinstance</code> the better choice than exact type checks?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 4 — Dynamic typing (and strong typing) + conversions
     ===================================================================== */
  topics.push({
    title: 'Dynamic Typing, Strong Typing & Type Conversion',
    analogy: R`<p>A Python name is like a <b>reusable sticky note</b>. Today you stick "lunch" on a sandwich; tomorrow you peel it off and stick it on a bowl of soup — the note never cared what kind of thing it labels. That is <b>dynamic typing</b>: the <i>thing</i> knows its type, the label does not. But the things themselves are <b>strict</b>: you cannot pour soup into a toaster. Python will not secretly turn the text <code>"3"</code> into the number 3 for you — that is <b>strong typing</b>. To change a thing's kind you must <b>convert</b> it on purpose, like blending fruit into a smoothie: <code>int("3")</code>.</p>`,
    explain: R`<h4>🟢 Dynamic: types live on objects, not on names</h4>
<pre>x = 42        # x → an int
x = "forty"   # now x → a str   (perfectly legal)
x = [4, 2]    # now x → a list</pre>
<p>There are no type declarations. Python checks types <b>at run time</b>, at the moment an operation happens. Compare Java/C++/Go (<b>static</b> typing) where <code>int x = 42; x = "forty";</code> is rejected by the compiler before the program ever runs.</p>
<h4>🟢 Strong: no silent conversions between unrelated types</h4>
${H.table(['Expression', 'Python (strong)', 'JavaScript (weak)'], [
  ['<code>"3" + 3</code>', H.c('r', 'TypeError') + ': can only concatenate str (not "int") to str', '<code>"33"</code>'],
  ['<code>"3" * 3</code>', '<code>"333"</code> (repeat — defined on purpose)', '<code>9</code>'],
  ['<code>"5" == 5</code>', '<code>False</code>', '<code>true</code>'],
  ['<code>1 + 2.5</code>', '<code>3.5</code> (numeric widening is allowed: int → float)', '<code>3.5</code>']
])}
<p>The one place Python <i>does</i> mix types automatically is the <b>numeric tower</b>: <code>bool → int → float → complex</code>. Mixing them produces the "wider" type.</p>
<h4>🟢 Converting on purpose</h4>
${H.table(['Call', 'Result', 'Notes'], [
  ['<code>int("42")</code>', '42', 'spaces around are ok: <code>int(" 42 ")</code>; <code>int("4.2")</code> → ValueError'],
  ['<code>int(3.99)</code>', '3', 'truncates toward zero (<code>int(-3.99)</code> → -3); use <code>round()</code> to round'],
  ['<code>int("ff", 16)</code>', '255', 'second argument = base (2..36); <code>int("0b101", 0)</code> auto-detects'],
  ['<code>float("1e3")</code>', '1000.0', 'also <code>"inf"</code>, <code>"nan"</code>'],
  ['<code>str(3.0)</code>', '"3.0"', 'any object → text'],
  ['<code>bool("False")</code>', 'True', 'non-empty string is truthy!'],
  ['<code>list("abc")</code>', "['a', 'b', 'c']", 'any iterable → list']
])}
<h4>🔵 Duck typing</h4>
<p>"If it walks like a duck and quacks like a duck, it is a duck." Python code usually cares what an object can <b>do</b>, not what it <b>is</b>. A function that calls <code>len(x)</code> works for strings, lists, dicts and your own classes with <code>__len__</code>.</p>
<h4>🔵 Type hints: documentation the tools can check</h4>
<pre>def area(width: float, height: float) -&gt; float:
    return width * height

count: int = 0</pre>
<p>Hints are <b>not enforced at run time</b> — <code>area("a", 3)</code> still runs (and returns <code>"aaa"</code>!). Static checkers (mypy, pyright, and editors) read them to catch bugs before running. It is the best of both worlds: dynamic flexibility plus static safety where you want it.</p>`,
    clues: [
      '"Is Python statically or dynamically typed? Strong or weak?" → dynamic AND strong',
      '"<code>TypeError: can only concatenate str (not \"int\") to str</code>" → convert explicitly: <code>str(n)</code> or use an f-string',
      '"<code>ValueError: invalid literal for int() with base 10</code>" → the text is not a whole number (e.g. "4.2", "", "abc")',
      '"What is duck typing?" → behaviour over declared type; EAFP style',
      '"Are type hints enforced?" → no, only by external checkers (mypy/pyright) or libraries like pydantic',
      '"<code>int(2.9)</code> vs <code>round(2.9)</code>" → truncation (2) vs rounding (3)'
    ],
    code: [{ lang: 'python', run: true, title: 'Dynamic + strong in action (runnable)', code: R`x = 42
print(type(x).__name__)      # int
x = "forty-two"
print(type(x).__name__)      # str  — the NAME was re-bound to a str object

# Strong typing: no silent str <-> int conversion
try:
    print("Age: " + 30)
except TypeError as e:
    print("TypeError:", e)   # can only concatenate str (not "int") to str

print("Age: " + str(30))     # explicit conversion works
print(f"Age: {30}")          # f-strings convert for you, on purpose

# Numeric widening is allowed (bool -> int -> float)
print(True + 1, 1 + 2.5)     # 2 3.5

# Conversions
print(int(" 42 "), int(3.99), int(-3.99), round(3.99))  # 42 3 -3 4
print(int("ff", 16), int("101", 2), float("1e3"))         # 255 5 1000.0

# Hints are not enforced at run time
def area(width: float, height: float) -> float:
    return width * height
print(area("ab", 3))         # 'ababab' — runs! a type checker would flag it` }],
    codeTitle: ['Dynamic and strong typing'],
    viz: {
      title: 'One name, many types — and what x + 1 does each time',
      input: "42; 'hello'; 3.5; True; None; '7'",
      inputLabel: 'Values to bind to x, separated by ; (each one is tested with x + 1)',
      gen: function (input) {
        var vals = String(input).split(';').map(function (s) { return s.trim(); }).filter(Boolean);
        if (vals.length < 1) throw new Error('Type values separated by ;  e.g. 42; "hi"; 3.5');
        if (vals.length > 8) throw new Error('Use at most 8 values');
        var frames = [], code = [], history = [];
        frames.push({ narr: 'In Python the <b>name</b> <code>x</code> has no type. We will bind it to several objects of different types and try <code>x + 1</code> each time. Types are checked <b>when the operation runs</b>.', parts: [{ type: 'text', label: 'Rule', html: 'dynamic = <b>names</b> can point at any type · strong = <b>objects</b> refuse nonsense mixes' }, { type: 'vars', label: 'Namespace', vals: { x: '(unbound)' } }] });
        vals.forEach(function (src, i) {
          var v = evalNode(parseExpr(src), {}, [], []);
          code.push('x = ' + src, 'x + 1');
          var nodes = [{ id: 'x', label: 'x', x: 12, y: 25 }], edges = [['x', 'o' + i]], hl = { x: 'cur' }, tags = {};
          if (i > 0) { nodes.push({ id: 'old', label: history[history.length - 1], x: 70, y: 8, shape: 'box', w: 34 }); hl.old = 'done'; tags.old = 'old object (unchanged)'; }
          nodes.push({ id: 'o' + i, label: v.t + ' ' + repr(v), x: 70, y: 40, shape: 'box', w: 34 }); hl['o' + i] = 'ok'; tags['o' + i] = "type(x) is " + v.t;
          var ehl = {}; ehl['x-o' + i] = 'ok';
          history.push(v.t + ' ' + repr(v));
          var cl = {}; cl[code.length - 1] = 'cur';
          frames.push({ narr: '<code>x = ' + H.esc(src) + '</code>: the name <b>x</b> is re-bound to a <b>' + v.t + '</b> object. No declaration, no error — that is <b>dynamic typing</b>.', parts: [
            { type: 'code', label: 'Program so far', lang: 'python', code: code.join('\n'), hl: cl },
            { type: 'graph', label: 'x → object', directed: true, height: 50, nodes: nodes, edges: edges, hl: hl, ehl: ehl, tags: tags },
            { type: 'vars', label: 'Namespace', vals: { x: repr(v), 'type(x)': v.t }, hl: { x: 'ok' } }] });
          var res, ok = true, msg;
          try { res = binop('+', v, V('int', 1n)); msg = '<code>x + 1</code> → <b>' + H.esc(repr(res)) + '</b> (' + res.t + ')' + (v.t === 'bool' ? ' — bool is an int subclass, so True + 1 == 2' : v.t === 'float' ? ' — int 1 is widened to float' : ''); }
          catch (e) { ok = false; msg = '<code>x + 1</code> → <span class="c-r">' + H.esc(e.message) + '</span>. ' + (v.t === 'str' ? 'Strong typing: Python refuses to guess whether you meant <code>"' + H.esc(v.v) + '1"</code> or a number. Convert on purpose: ' + (/^\s*-?\d+\s*$/.test(v.v) ? '<code>int(x) + 1</code> = ' + (BigInt(v.v.trim()) + 1n) : '<code>x + "1"</code> or <code>f"{x}1"</code>') : 'None has no + operation at all.'); }
          var cl2 = {}; cl2[code.length] = ok ? 'ok' : 'bad';
          frames.push({ narr: msg, parts: [
            { type: 'code', label: 'Program so far', lang: 'python', code: code.join('\n'), hl: cl2 },
            { type: 'vars', label: 'Result of x + 1', vals: { 'x': repr(v), 'x + 1': ok ? repr(res) : 'TypeError' }, hl: { 'x + 1': ok ? 'ok' : 'bad' } }] });
        });
        frames.push({ narr: 'Summary: the <b>same name</b> held ' + history.length + ' different types (dynamic), but each <b>object</b> enforced its own rules (strong). A static language would reject <code>x = "hello"</code> after <code>int x = 42</code> at compile time; Python finds type problems only when the line runs — which is why tests and type checkers (mypy/pyright) matter.', parts: [{ type: 'table', label: 'What x pointed at', columns: ['step', 'object'], rows: history.map(function (h, k) { return [String(k + 1), h]; }) }] });
        return frames;
      }
    },
    examples: [
      { title: 'Building a message from numbers', html: R`<p>Three correct ways to glue text and numbers. The f-string is the modern default.</p>`, code: { lang: 'python', run: true, code: R`name, age = "Asha", 30
print("Name: " + name + ", age: " + str(age))   # explicit str()
print("Name:", name, "age:", age)                # print converts each argument
print(f"Name: {name}, age: {age}")               # f-string (best)` } },
      { title: 'Safe conversion with try/except (EAFP)', html: R`<p>"Easier to Ask Forgiveness than Permission": just try the conversion and handle the failure. This is more robust than checking with <code>str.isdigit()</code> (which rejects <code>"-5"</code> and accepts <code>"²"</code>).</p>`, code: { lang: 'python', run: true, code: R`def parse_int(text, default=None):
    try:
        return int(text)
    except ValueError:
        return default

for t in ["42", " -7 ", "4.2", "", "1_000"]:
    print(repr(t), "->", parse_int(t))
# '42' -> 42, ' -7 ' -> -7, '4.2' -> None, '' -> None, '1_000' -> 1000` } },
      { title: 'int() truncates, round() rounds (to even!)', html: R`<p><code>int()</code> chops toward zero. <code>round()</code> rounds to the nearest integer, and exact halves go to the <b>even</b> neighbour (banker's rounding) to avoid bias.</p>`, code: { lang: 'python', run: true, code: R`import math
for x in [2.7, -2.7, 2.5, 3.5, -2.5]:
    print(x, int(x), round(x), math.floor(x), math.ceil(x))
# 2.5 -> round 2, 3.5 -> round 4, -2.5 -> round -2` } },
      { title: 'Duck typing with len()', html: R`<p>The function never checks types; it just needs "something with a length". Strings, lists, dicts and ranges all qualify.</p>`, code: { lang: 'python', run: true, code: R`def describe(thing):
    return f"{type(thing).__name__} of length {len(thing)}"

for t in ["hello", [1, 2, 3], {"a": 1}, range(10)]:
    print(describe(t))` } }
    ],
    deepDive: R`<h4>🟣 How the run-time type check really happens</h4>
<p><code>a + b</code> becomes the bytecode <code>BINARY_OP (+)</code>, which calls <code>type(a).__add__(a, b)</code>. If that returns <code>NotImplemented</code> (or does not exist), Python tries the reflected <code>type(b).__radd__(b, a)</code>. If both fail you get <code>TypeError: unsupported operand type(s)</code>. That two-step protocol is how <code>1 + 2.5</code> works (<code>int.__add__</code> says NotImplemented for a float, then <code>float.__radd__</code> handles it) and how your own classes can join in.</p>
<h4>🟣 Conversion protocols</h4>
<ul>
<li><code>int(x)</code> calls <code>x.__int__()</code> (or <code>__index__</code>); <code>float(x)</code> calls <code>__float__</code>; <code>str(x)</code> calls <code>__str__</code> (falling back to <code>__repr__</code>); <code>bool(x)</code> calls <code>__bool__</code> then <code>__len__</code>.</li>
<li><code>int(x)</code> on a float that is <code>inf</code> raises <code>OverflowError</code>; on <code>nan</code> raises <code>ValueError</code>.</li>
<li>Security: since 3.11, <code>int(str)</code> refuses strings longer than 4300 digits by default (quadratic-time DoS protection; see topic 7).</li>
</ul>
<h4>🟣 Gradual typing in production</h4>
<p>Big Python codebases (Instagram, Dropbox, most AI/ML stacks) run <b>mypy</b> or <b>pyright</b> in CI. Libraries such as <b>pydantic</b> and <b>dataclasses</b> read hints at run time to validate data — that is a library choice, not the language. Since 3.14, annotations are evaluated lazily (PEP 649), so forward references "just work" without quotes.</p>
<h4>🟣 Trade-offs</h4>
<p>Dynamic typing makes prototyping fast and code short, at the cost of run-time errors and slower execution (every operation must dispatch on the object's type). Static checkers recover much of the safety without changing how Python runs.</p>`,
    aiEra: R`<p><b>What AI changes:</b> AI writes type hints for you, and type checkers then act as a cheap "second reviewer" of AI-generated code — hints turn many hallucinated APIs and wrong argument types into red squiggles before you run anything.</p>
<p><b>Use AI as a partner:</b> <code>Add precise type hints to this function and list any call sites that would fail mypy</code>. Ask for property-style tests: <code>Generate tricky strings for my parse_int: signs, spaces, underscores, unicode digits, empty</code>.</p>
<p><b>Where AI goes wrong:</b> believing hints are enforced at run time, using <code>isdigit()</code> as validation, converting with <code>int(float(s))</code> (loses precision on big numbers), or silently swallowing errors with a bare <code>except:</code>.</p>
<p><b>What you must still own:</b> deciding where data crosses a boundary (user input, files, APIs) and converting/validating exactly there. Inside your program, values should already have the right types.</p>`,
    problems: [{
      title: 'Smart Number Parser',
      level: 'Medium', tags: ['conversion', 'EAFP', 'ValueError'], companies: ['Meta', 'Atlassian'],
      statement: R`<p>Write <code>to_number(text)</code> that returns an <code>int</code> if <code>text</code> is a whole number (like <code>" -12 "</code> or <code>"1_000"</code>), a <code>float</code> if it is a decimal/scientific number (<code>"3.5"</code>, <code>"1e3"</code>), and <code>None</code> otherwise (<code>"abc"</code>, <code>""</code>, <code>"nan"</code>, <code>"inf"</code>).</p>`,
      constraints: R`len(text) ≤ 100. Do not use regular expressions or <code>eval</code>. NaN and infinity count as "not a number" here.`,
      example: R`<p><code>"42"</code> → ${H.c('g', '42 (int)')} · <code>"4.0"</code> → ${H.c('b', '4.0 (float)')} · <code>"1e3"</code> → ${H.c('b', '1000.0 (float)')} · <code>"nan"</code> → ${H.c('r', 'None')} · <code>"12abc"</code> → ${H.c('r', 'None')}<br>Why: try the strictest conversion (int) first; if it fails try float; reject non-finite floats.</p>`,
      brute: { why: R`<p>Character checks like <code>text.isdigit()</code> look simple but are wrong in many ways: they reject <code>"-5"</code>, <code>" 5"</code> and <code>"1_000"</code>, and they accept superscript <code>"²"</code> (which <code>int()</code> then rejects). Manual scanning for one dot misses <code>"1e3"</code>.</p>`, code: R`def to_number_naive(text):
    if text.isdigit():                       # rejects "-5", " 5", "1_000"
        return int(text)
    if text.count(".") == 1 and text.replace(".", "").isdigit():
        return float(text)                   # misses "1e3", "-2.5"
    return None

print(to_number_naive("-5"))   # None  <- wrong` },
      mcq: { q: 'Which order of attempts gives the correct type for "7"?', options: ['Try <code>int()</code> first, then <code>float()</code>', 'Try <code>float()</code> first, then <code>int()</code>', 'Only <code>float()</code>', 'Use <code>eval()</code>'], answer: 0, explain: 'float("7") succeeds too, giving 7.0 (a float). Trying the stricter int() first keeps whole numbers as ints. eval() is a security hole.' },
      hints: [R`<p>Hint 1: Let Python's own parsers decide — they already handle signs, spaces, underscores and exponents. Your job is to <b>try</b> them in the right order and catch failures.</p>`, R`<p>Hint 2: <code>int(text)</code> raises <code>ValueError</code> for <code>"3.5"</code>; then <code>float(text)</code> handles it. Wrap each in <code>try/except ValueError</code>.</p>`, R`<p>Hint 3: <code>float("nan")</code> and <code>float("inf")</code> succeed, so check <code>math.isfinite(result)</code>. Recipe: try int → return; try float → return if finite else None; otherwise None.</p>`],
      solution: {
        approach: R`<p>EAFP: attempt <code>int</code>, then <code>float</code>; filter out non-finite floats. Each conversion is linear in the text length.</p>`,
        code: { lang: 'python', run: true, code: R`import math

def to_number(text):
    """Return int, float or None for a string, without regex or eval."""
    try:
        return int(text)                 # strictest first: "42", " -12 ", "1_000"
    except ValueError:
        pass
    try:
        value = float(text)              # "3.5", "1e3", "-0.25"
    except ValueError:
        return None                      # "abc", "", "12abc"
    return value if math.isfinite(value) else None   # reject nan / inf

for t in ["42", " -12 ", "1_000", "4.0", "1e3", "nan", "inf", "12abc", ""]:
    r = to_number(t)
    print(f"{t!r:>9} -> {r!r} ({type(r).__name__})")` },
        dry: { head: ['text', 'int(text)', 'float(text)', 'isfinite?', 'result'], rows: [['"42"', '<span class="c-g">42</span>', '—', '—', '42 (int)'], ['"4.0"', '<span class="c-r">ValueError</span>', '4.0', 'yes', '4.0 (float)'], ['"1e3"', '<span class="c-r">ValueError</span>', '1000.0', 'yes', '1000.0'], ['"nan"', '<span class="c-r">ValueError</span>', 'nan', '<span class="c-r">no</span>', 'None'], ['"12abc"', '<span class="c-r">ValueError</span>', '<span class="c-r">ValueError</span>', '—', 'None']] },
        complexity: R`<p>O(L) time for a string of length L (each parser scans once); O(1) extra space.</p>`,
        followUps: ['Also accept "0x1F" and "0b101" using <code>int(text, 0)</code>.', 'Return a <code>Decimal</code> instead of float for money-like inputs.']
      }
    }]
  });

  /* =====================================================================
     TOPIC 5 — input(), print() and f-strings
     ===================================================================== */
  function splitTop(s) {
    var out = [], depth = 0, q = null, cur = '';
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (q) { cur += c; if (c === '\\' && i + 1 < s.length) { cur += s[++i]; continue; } if (c === q) q = null; continue; }
      if (c === '"' || c === "'") { q = c; cur += c; continue; }
      if (c === '(') depth++; if (c === ')') depth--;
      if (c === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
      cur += c;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  function unescapeLit(t) {
    var m = t.match(/^(['"])([\s\S]*)\1$/);
    if (!m) throw new Error('sep= and end= need a quoted string, e.g. sep="-"');
    return m[2].replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\(['"\\])/g, '$1');
  }
  function showChars(s) { return Array.from(s).map(function (c) { return c === ' ' ? '␣' : c === '\n' ? '⏎' : c === '\t' ? '⇥' : c; }); }

  topics.push({
    title: 'Talking to the User: input(), print() & f-strings',
    analogy: R`<p>Your program is a <b>shop counter</b>. <code>input()</code> is the shopkeeper asking a question and writing the customer's reply on a <b>paper slip</b> — always a slip of <b>text</b>, even if the customer said "42"; you must convert it to a number yourself. <code>print()</code> is the shopkeeper speaking out loud: by default they put a <b>space</b> between items and <b>take a breath</b> (newline) at the end — and you can change both. An <b>f-string</b> is a <b>fill-in-the-blanks form</b>: <code>f"Total: {price:.2f}"</code> — the blanks are filled with live values, neatly formatted.</p>`,
    explain: R`<h4>🟢 print() — every option</h4>
<pre>print(*objects, sep=' ', end='\n', file=sys.stdout, flush=False)</pre>
${H.table(['Call', 'Output', 'Why'], [
  ['<code>print("a", "b", 3)</code>', '<code>a b 3</code>', 'items converted with <code>str()</code>, joined by <code>sep=" "</code>'],
  ['<code>print("a", "b", sep="-")</code>', '<code>a-b</code>', 'custom separator'],
  ['<code>print("loading", end="")</code>', '<code>loading</code> (no newline)', 'next print continues on the same line'],
  ['<code>print()</code>', 'an empty line', 'just the <code>end</code>'],
  ['<code>print(*[1, 2, 3])</code>', '<code>1 2 3</code>', '<code>*</code> unpacks the list into separate arguments'],
  ['<code>print("oops", file=sys.stderr)</code>', 'to the error stream', 'logs/errors separate from normal output']
])}
<p><code>print</code> itself <b>returns None</b> — so <code>x = print("hi")</code> prints hi and makes <code>x</code> None.</p>
<h4>🟢 input() — always returns a str</h4>
<pre>name = input("Your name: ")          # waits for Enter, returns text WITHOUT the newline
age = int(input("Your age: "))       # convert explicitly — "30" is not 30
a, b = map(int, input().split())     # two numbers on one line: "3 4" → 3, 4
nums = list(map(int, input().split()))  # a whole line of numbers</pre>
<p>If input ends (Ctrl-D / end of file) <code>input()</code> raises <code>EOFError</code>. For huge inputs (competitive programming), read everything at once: <code>data = sys.stdin.buffer.read().split()</code> — far faster than many <code>input()</code> calls.</p>
<h4>🟢 f-strings — the modern way to format</h4>
<pre>name, price, qty = "Tea", 2.5, 3
f"{name} x{qty} = {price * qty:.2f}"   # 'Tea x3 = 7.50'</pre>
<p>Anything inside <code>{ }</code> is a real Python expression. After a colon comes the <b>format spec</b>:</p>
${H.table(['Spec', 'Example', 'Result', 'Meaning'], [
  ['<code>.2f</code>', '<code>f"{3.14159:.2f}"</code>', '<code>3.14</code>', '2 digits after the point'],
  ['<code>,</code> / <code>_</code>', '<code>f"{1234567:,}"</code>', '<code>1,234,567</code>', 'thousands separator'],
  ['<code>&gt;8</code> <code>&lt;8</code> <code>^8</code>', '<code>f"{\'hi\':^8}|"</code>', '<code>   hi   |</code>', 'right / left / centre in width 8'],
  ['<code>*^9</code>', '<code>f"{\'hi\':*^9}"</code>', '<code>***hi****</code>', 'custom fill character'],
  ['<code>08.3f</code>', '<code>f"{42:08.3f}"</code>', '<code>0042.000</code>', 'zero-pad to width 8'],
  ['<code>+</code>', '<code>f"{5:+}"</code>', '<code>+5</code>', 'always show sign'],
  ['<code>.1%</code>', '<code>f"{0.256:.1%}"</code>', '<code>25.6%</code>', 'multiply by 100, add %'],
  ['<code>x</code> <code>b</code> <code>#x</code>', '<code>f"{255:#x}"</code>', '<code>0xff</code>', 'hex / binary (# adds prefix)'],
  ['<code>e</code>', '<code>f"{12345.678:.2e}"</code>', '<code>1.23e+04</code>', 'scientific notation']
])}
<p>Two power features: <code>f"{x=}"</code> prints <code>x=5</code> (great for debugging), and <code>!r</code> uses <code>repr()</code>: <code>f"{name!r}"</code> → <code>'Tea'</code> with quotes.</p>
<h4>🔵 Older styles you will still read</h4>
<pre>"%s is %d years" % ("Asha", 30)          # printf-style (oldest)
"{} is {} years".format("Asha", 30)      # str.format (3.0+)
f"{'Asha'} is {30} years"                # f-string (3.6+, fastest, preferred)</pre>
<p>Since 3.12 (PEP 701) f-strings can reuse the same quotes inside, span lines and contain comments. Python 3.14 added <b>t-strings</b> (<code>t"..."</code>, PEP 750) that produce a <i>Template</i> object instead of a str, so libraries can safely escape values for SQL or HTML.</p>`,
    clues: [
      '"Read two integers from one line" → <code>a, b = map(int, input().split())</code>',
      '"Why does <code>input() + 1</code> fail?" → input always returns str; convert with <code>int()</code>',
      '"Print without a newline" / "print on one line" → <code>end=""</code>',
      '"Print a list space-separated" → <code>print(*items)</code> or <code>" ".join(map(str, items))</code>',
      '"Format to 2 decimal places" / "align columns" → f-string format spec <code>:.2f</code>, <code>:&gt;10</code>',
      '"Input has 10<sup>6</sup> numbers" / TLE on reading → <code>sys.stdin.buffer.read().split()</code>',
      '"Debug print a variable with its name" → <code>f"{x=}"</code>'
    ],
    code: [{ lang: 'python', run: true, title: 'print and f-string tour (runnable)', code: R`import sys

print("a", "b", 3)                    # a b 3
print("a", "b", sep="-")              # a-b
print("loading", end="")              # no newline...
print("... done")                     # ...so this continues: loading... done
print(*[1, 2, 3], sep=", ")           # 1, 2, 3
print("warning!", file=sys.stderr)    # goes to the error stream

name, price, qty = "Tea", 2.5, 3
print(f"{name} x{qty} = {price * qty:.2f}")      # Tea x3 = 7.50
print(f"{1234567.891:,.2f}")                     # 1,234,567.89
print(f"|{'hi':<6}|{'hi':^6}|{'hi':>6}|")        # |hi    |  hi  |    hi|
print(f"{42:08.3f} {255:#x} {255:08b} {0.256:.1%}")  # 0042.000 0xff 11111111 25.6%
x = 5
print(f"{x=}, {x * 2 = }, {name!r}")             # x=5, x * 2 = 10, 'Tea'
result = print("print returns:")                 # prints, then...
print(result)                                    # None` },
    { lang: 'python', title: 'Reading input (run locally: it waits for the keyboard)', code: R`import sys

# 1) One value per line
name = input("Your name: ")            # returns str, newline stripped
age = int(input("Your age: "))         # convert explicitly
print(f"Hi {name}, next year you'll be {age + 1}")

# 2) Several numbers on one line, e.g. "3 4"
a, b = map(int, input().split())
print(a + b)

# 3) Fast bulk reading for big inputs (competitive programming)
def main():
    data = sys.stdin.buffer.read().split()   # all tokens as bytes
    n = int(data[0])
    nums = list(map(int, data[1:1 + n]))
    sys.stdout.write(str(sum(nums)) + "\n")  # one write is faster than many prints

# 4) Reading until end of input
def read_all_lines():
    lines = []
    while True:
        try:
            lines.append(input())
        except EOFError:                     # Ctrl-D / end of file
            return lines` }],
    codeTitle: ['print & f-strings', 'Reading input'],
    viz: [{
      title: 'Format-spec explorer: how f"{value:spec}" builds the text',
      input: '1234567.891 | *>16,.2f',
      inputLabel: 'value | spec   (try: 42 | 08.3f   ·   -42 | =+8   ·   255 | #010b   ·   0.256 | .1%   ·   "hi" | *^9)',
      gen: function (input) {
        var parts = String(input).split('|');
        if (parts.length !== 2) throw new Error('Format: value | spec   e.g.  3.14159 | .2f');
        var vsrc = parts[0].trim(), spec = parts[1].trim();
        if (!vsrc) throw new Error('Type a value before the |');
        var v = evalNode(parseExpr(vsrc), {}, [], []);
        if (['int', 'float', 'str', 'bool'].indexOf(v.t) < 0) throw new Error('Use an int, float or string value');
        var r = formatSpec(v, spec), f = r.f, frames = [];
        var fs = 'f"{' + vsrc + ':' + spec + '}"';
        frames.push({ narr: 'We evaluate <code>' + H.esc(fs) + '</code>. First Python computes the value <b>' + H.esc(repr(v)) + '</b> (' + v.t + '), then calls <code>format(value, "' + H.esc(spec) + '")</code>.', parts: [{ type: 'code', label: 'f-string', lang: 'python', code: 'value = ' + vsrc + '\ntext = ' + fs, hl: { 2: 'cur' } }, { type: 'vars', label: 'Value', vals: { value: repr(v), 'type': v.t } }] });
        var specRows = [['fill', f.fill === undefined ? '(default)' : '"' + f.fill + '"'], ['align', f.align || '(default)'], ['sign', f.sign], ['#', f.alt ? 'yes' : '—'], ['0', f.zero ? 'yes' : '—'], ['width', f.width || '—'], ['grouping', f.group || '—'], ['.precision', f.prec === null ? '—' : f.prec], ['type', f.type || '(none)']];
        var used = {}; specRows.forEach(function (row, i) { if (row[1] !== '—' && row[1] !== '(default)' && row[1] !== '(none)' && !(row[0] === 'sign' && row[1] === '-')) used[i] = 'sel'; });
        frames.push({ narr: 'Parse the spec using the pattern <code>[[fill]align][sign][#][0][width][grouping][.precision][type]</code>. Highlighted rows are the parts you wrote; the rest use defaults (numbers align right, text aligns left, fill is a space).', parts: [{ type: 'table', label: 'Spec "' + spec + '" decoded', columns: ['field', 'value'], rows: specRows.map(function (x) { return [x[0], String(x[1])]; }), hl: used }] });
        r.steps.forEach(function (st, i) {
          frames.push({ narr: 'Step ' + (i + 1) + ': ' + st.text, parts: [{ type: 'table', label: 'Spec "' + spec + '" decoded', columns: ['field', 'value'], rows: specRows.map(function (x) { return [x[0], String(x[1])]; }), hl: used }, { type: 'vars', label: 'Progress', vals: { step: st.what } }] });
        });
        var hl = {}; r.segs.forEach(function (s, i) { hl[i] = s.cls; });
        frames.push({ narr: 'Result: <code>' + H.esc(strRepr(r.result)) + '</code> (' + r.result.length + ' characters). Colours: <span class="c-p">sign/prefix</span>, <span class="c-g">digits/text</span>, <span class="c-y">group separators</span>, <span class="c-b">suffix</span>, faded = fill padding.', parts: [{ type: 'array', label: 'Characters of the result (␣ = space)', values: showChars(r.result), hl: hl, showIdx: true }, { type: 'code', label: 'Equivalent', lang: 'python', code: 'print(' + fs + ')\n# ' + r.result + '|', hl: { 2: 'ok' } }] });
        return frames;
      }
    }, {
      title: 'print() step by step: sep and end',
      input: "print('a', 'b', 3); print('x', 'y', sep='-'); print('loading', end=''); print('...done'); print(*'abc', sep=', ', end='!\\n'); print()",
      inputLabel: "print(...) calls separated by ; (positional args are expressions; sep='..' and end='..' supported; *'abc' unpacks a string)",
      gen: function (input) {
        var calls = String(input).split(/;\s*(?=print\()/).map(function (s) { return s.trim().replace(/;$/, ''); }).filter(Boolean);
        if (!calls.length) throw new Error("Type print(...) calls separated by ;");
        if (calls.length > 8) throw new Error('Use at most 8 print calls');
        var outText = '', frames = [];
        frames.push({ narr: 'The screen starts empty. Each <code>print</code> converts its arguments with <code>str()</code>, puts <b>sep</b> between them (default a space) and writes <b>end</b> after them (default a newline <code>\\n</code>).', parts: [{ type: 'text', label: 'Screen', html: '<pre> </pre>' }] });
        calls.forEach(function (c) {
          var m = c.match(/^print\(([\s\S]*)\)$/);
          if (!m) throw new Error('Each call must look like print(...): ' + c);
          var args = m[1].trim() ? splitTop(m[1]) : [], vals = [], sep = ' ', end = '\n';
          args.forEach(function (a) {
            var kw = a.match(/^(sep|end)\s*=\s*([\s\S]+)$/);
            if (kw) { if (kw[1] === 'sep') sep = unescapeLit(kw[2].trim()); else end = unescapeLit(kw[2].trim()); return; }
            if (a[0] === '*') { var sv = evalNode(parseExpr(a.slice(1)), {}, [], []); if (sv.t !== 'str') throw new Error('This demo unpacks only strings with *'); Array.from(sv.v).forEach(function (ch) { vals.push(ch); }); return; }
            vals.push(pstr(evalNode(parseExpr(a), {}, [], [])));
          });
          var written = vals.join(sep) + end;
          outText += written;
          var hl = {}, chars = showChars(written), pos = 0;
          vals.forEach(function (v, i) { for (var k = 0; k < Array.from(v).length; k++) hl[pos++] = 'ok'; if (i < vals.length - 1) for (var s2 = 0; s2 < Array.from(sep).length; s2++) hl[pos++] = 'cur'; });
          for (var e2 = 0; e2 < Array.from(end).length; e2++) hl[pos++] = 'sel';
          frames.push({ narr: '<code>' + H.esc(c) + '</code>: items ' + H.esc(JSON.stringify(vals)) + ' joined by sep <code>' + H.esc(JSON.stringify(sep)) + '</code>, then end <code>' + H.esc(JSON.stringify(end)) + '</code>' + (end === '' ? ' — <b>no newline</b>, so the next print continues on this line.' : '.'), parts: [
            { type: 'array', label: 'Characters written by this call (green = items, amber = sep, purple = end)', values: chars.length ? chars : ['(nothing)'], hl: hl },
            { type: 'text', label: 'Screen', html: '<pre>' + H.esc(outText) + '▌</pre>' }] });
        });
        frames.push({ narr: 'Final screen. Notice that <code>print()</code> with no arguments just writes <code>end</code> — an empty line — and that every call returned <code>None</code>.', parts: [{ type: 'text', label: 'Screen', html: '<pre>' + H.esc(outText) + '</pre>' }] });
        return pad4(frames, 'Tip: add more print calls separated by ; — try end="" or sep=", ".');
      }
    }],
    examples: [
      { title: 'A tidy table with alignment specs', html: R`<p>Fixed widths line columns up: names left-aligned in 10 characters, numbers right-aligned with 2 decimals.</p>`, code: { lang: 'python', run: true, code: R`rows = [("Tea", 2.5, 3), ("Croissant", 3.75, 2), ("Water", 1, 10)]
print(f"{'Item':<10}{'Qty':>5}{'Total':>10}")
print("-" * 25)
for name, price, qty in rows:
    print(f"{name:<10}{qty:>5}{price * qty:>10.2f}")
# Item        Qty     Total
# Tea           3      7.50 ...` } },
      { title: 'Debugging with f"{x=}"', html: R`<p>The <code>=</code> specifier prints the expression text and its value — perfect for quick checks. It respects format specs and <code>!r</code> too.</p>`, code: { lang: 'python', run: true, code: R`width, height = 3, 4.5
print(f"{width=}, {height=}")          # width=3, height=4.5
print(f"{width * height = :.1f}")      # width * height = 13.5
name = "Asha"
print(f"{name=}")                      # name='Asha'  (repr by default with =)` } },
      { title: 'Simulating input() for testing', html: R`<p>Code that calls <code>input()</code> is awkward to test. Read from a parameter instead, or feed a fake stdin with <code>io.StringIO</code> — this snippet runs without a keyboard.</p>`, code: { lang: 'python', run: true, code: R`import io, sys

sys.stdin = io.StringIO("Asha\n3 4\n")   # pretend the user typed this
name = input()
a, b = map(int, input().split())
sys.stdin = sys.__stdin__               # restore the real stdin
print(f"Hello {name}! {a} + {b} = {a + b}")` } },
      { title: 'join vs print(*items)', html: R`<p>To print numbers separated by commas, <code>join</code> needs strings, while <code>print(*items, sep=...)</code> converts for you. Both beat a loop of prints with <code>end</code>.</p>`, code: { lang: 'python', run: true, code: R`nums = [3, 1, 4, 1, 5]
print(", ".join(map(str, nums)))   # 3, 1, 4, 1, 5
print(*nums, sep=", ")             # 3, 1, 4, 1, 5
# ", ".join(nums) would raise TypeError: sequence item 0: expected str instance, int found` } }
    ],
    deepDive: R`<h4>🟣 What print really does</h4>
<p><code>print</code> calls <code>str()</code> on each argument, then <code>file.write()</code> for the pieces. <code>sys.stdout</code> is <b>buffered</b>: when connected to a terminal it is line-buffered (flushes at each newline); when piped to a file or another program it is block-buffered — so a progress message without a newline may appear late. Fix with <code>flush=True</code> or run <code>python -u</code>. Writing millions of lines? Build one string and call <code>sys.stdout.write</code> once.</p>
<h4>🟣 Encoding</h4>
<p>Text you print is encoded (UTF-8 almost everywhere in 2026; Python 3.15 makes UTF-8 mode the default on all platforms, PEP 686). <code>input()</code> decodes bytes from the terminal back to str. Emoji or accents failing on an old Windows console were an encoding problem, not a Python bug.</p>
<h4>🟣 f-string internals</h4>
<p>f-strings compile to bytecode (<code>FORMAT_VALUE</code>/<code>FORMAT_SIMPLE</code>, <code>BUILD_STRING</code>), so they are faster than <code>%</code> or <code>.format</code> — there is no run-time parsing of the template. The spec after <code>:</code> is passed to <code>type(value).__format__(spec)</code>, which is why <code>datetime</code> supports <code>f"{now:%Y-%m-%d}"</code> and your own classes can define custom specs. Specs can be nested: <code>f"{value:{width}.{prec}f}"</code>.</p>
<h4>🟣 Rounding while formatting</h4>
<p><code>f"{2.675:.2f}"</code> gives <code>2.67</code>, not 2.68 — 2.675 is really 2.67499999999999982236431605997495353221893310546875 in binary. Formatting rounds the <b>exact stored value</b> correctly; exact ties round half to even. For money, format <code>Decimal</code> values instead.</p>
<h4>🟣 Security</h4>
<p>Never build SQL or shell commands with f-strings from user input (<code>f"SELECT * FROM users WHERE name = '{name}'"</code> → SQL injection). Use parameterised queries; that is exactly the problem t-strings (3.14) were designed to make safer. And never call <code>eval(input())</code>.</p>`,
    aiEra: R`<p><b>What AI changes:</b> AI is excellent at producing format specs on demand ("right-align in 12 chars with thousands separators" → <code>:&gt;12,</code>) and at converting old <code>%</code>/<code>.format</code> code to f-strings.</p>
<p><b>Use AI as a partner:</b> describe the exact output layout you need and ask for the f-string, then verify with the explorer above. Ask it to convert slow <code>input()</code> loops into <code>sys.stdin</code> bulk reads for contest problems.</p>
<p><b>Where AI goes wrong:</b> forgetting that <code>input()</code> returns str, using <code>eval(input())</code> to "parse numbers", f-string SQL (injection), assuming <code>round</code>/<code>:.2f</code> rounds half up, and nesting the same quotes inside f-strings (fine in 3.12+, a SyntaxError on 3.11 and older servers).</p>
<p><b>What you must still own:</b> knowing that program I/O is text at the boundary, converting/validating there, reading big inputs efficiently, and keeping user data out of code strings.</p>`,
    problems: [{
      title: 'Receipt Printer',
      level: 'Medium', tags: ['f-strings', 'format spec', 'alignment'], companies: ['Shopify', 'Swiggy'],
      statement: R`<p>Given a list of <code>(item, quantity, unit_price)</code> tuples, return the receipt as a string:</p><ul><li>each line: item name left-aligned in 12 chars, quantity right-aligned in 4, line total right-aligned in 10 with 2 decimals and thousands separators;</li><li>a dashed line of 26 <code>-</code>;</li><li>a final <code>TOTAL</code> line with the same column layout (quantity column = total items).</li></ul><p>Names longer than 12 characters are cut to 11 characters plus <code>…</code>.</p>`,
      constraints: R`1 ≤ items ≤ 100; quantity is an int ≥ 1; prices are floats with ≤ 2 decimals. Lines must be exactly 26 characters wide.`,
      example: R`<p>Input <code>[("Tea", 3, 2.5), ("Laptop stand", 1, 1499.0)]</code><br>Output:</p><pre>Tea            3      7.50
Laptop stand   1  1,499.00
--------------------------
TOTAL          4  1,506.50</pre><p>Why: <code>f"{name:&lt;12}{qty:&gt;4}{total:&gt;10,.2f}"</code> gives 12 + 4 + 10 = 26 characters per line.</p>`,
      brute: { why: R`<p>Padding by hand with string concatenation and <code>len()</code> math (<code>name + " " * (12 - len(name))</code>) works but is long and error-prone: it breaks on long names (negative padding), forgets thousands separators, and rounding via <code>str(round(x, 2))</code> prints <code>7.5</code> instead of <code>7.50</code>.</p>`, code: R`def receipt_naive(items):
    lines = []
    for name, qty, price in items:
        total = str(round(qty * price, 2))           # 7.5, not 7.50; no commas
        lines.append(name + " " * (12 - len(name))   # breaks for long names
                     + " " * (4 - len(str(qty))) + str(qty)
                     + " " * (10 - len(total)) + total)
    return "\n".join(lines)

print(receipt_naive([("Tea", 3, 2.5)]))` },
      mcq: { q: 'Which spec right-aligns 1499.0 in 10 characters as <code>  1,499.00</code>?', options: ['<code>:&gt;10,.2f</code>', '<code>:10.2</code>', '<code>:&lt;10,.2f</code>', '<code>:,&gt;10.2f</code>'], answer: 0, explain: 'Order is [fill][align][sign][#][0][width][grouping][.precision][type]: align &gt;, width 10, grouping ",", precision .2, type f. In the last option "," is taken as the fill character.' },
      hints: [R`<p>Hint 1: Each column is just one format spec. Decide widths first (12, 4, 10) — the line width is their sum.</p>`, R`<p>Hint 2: Text aligns left with <code>&lt;</code>, numbers right with <code>&gt;</code>; money needs <code>,.2f</code>. Truncate long names before formatting: <code>name if len(name) &lt;= 12 else name[:11] + "…"</code>.</p>`, R`<p>Hint 3: Accumulate total quantity and total money while looping, then build the TOTAL line with the same spec. Join lines with <code>"\n"</code>. Edge: one item; a name of exactly 12 chars must not be cut.</p>`],
      solution: {
        approach: R`<p>One f-string template per line keeps every column consistent; a helper shortens long names; totals are accumulated in the same loop.</p>`,
        code: { lang: 'python', run: true, code: R`def receipt(items):
    """Build a 26-char-wide receipt from (name, qty, unit_price) tuples."""
    def fit(name, width=12):
        return name if len(name) <= width else name[:width - 1] + "…"

    lines, total_qty, total_money = [], 0, 0.0
    for name, qty, price in items:
        line_total = qty * price
        total_qty += qty
        total_money += line_total
        lines.append(f"{fit(name):<12}{qty:>4}{line_total:>10,.2f}")
    lines.append("-" * 26)
    lines.append(f"{'TOTAL':<12}{total_qty:>4}{total_money:>10,.2f}")
    return "\n".join(lines)

print(receipt([("Tea", 3, 2.5), ("Laptop stand", 1, 1499.0), ("Noise-cancelling headphones", 2, 89.99)]))` },
        dry: { head: ['item', 'fit(name)', 'qty', 'line total', 'formatted line'], rows: [['Tea', '"Tea"', '3', '7.5', '<code>Tea␣␣␣␣␣␣␣␣␣␣␣␣3␣␣␣␣␣␣7.50</code>'], ['Laptop stand', '"Laptop stand" (12, kept)', '1', '1499.0', '<code>Laptop␣stand␣␣␣1␣␣1,499.00</code>'], ['Noise-cancelling…', '"Noise-cance…"', '2', '179.98', '<code>Noise-cance…␣␣␣2␣␣␣␣179.98</code>'], ['TOTAL', '—', '6', '1686.48', '<code>TOTAL␣␣␣␣␣␣␣␣␣6␣␣1,686.48</code>']] },
        complexity: R`<p>O(n) lines, each formatted in O(1) (bounded width). Memory O(n) for the list of lines; <code>"\n".join</code> builds the final string in one pass.</p>`,
        followUps: ['Use <code>Decimal</code> so totals never show float noise.', 'Make the column widths adapt to the longest item name.']
      }
    }]
  });

  /* =====================================================================
     TOPIC 6 — Operators, precedence, short-circuiting
     ===================================================================== */
  function exprFrames(src, introNarr) {
    src = String(src).trim();
    if (!src) throw new Error('Type an expression, e.g.  2 + 3 * 4 ** 2');
    if (src.length > 70) throw new Error('Keep the expression under 70 characters');
    var tree, steps = [], out = [], frames = [], val, err = null;
    try { tree = parseExpr(src); } catch (e) { if (e.py) throw new Error(e.message); throw e; }
    try { val = evalNode(tree, {}, steps, out); } catch (e) { if (!e.py) throw e; err = e; }
    frames.push({ narr: introNarr, parts: [{ type: 'text', label: 'Expression', html: '<code>' + H.esc(src) + '</code>' }, { type: 'table', label: 'Precedence ladder (high → low)', columns: ['level', 'operators'], rows: [['1', '( ) calls'], ['2', '**  (right-to-left)'], ['3', 'unary -x +x ~x'], ['4', '*  /  //  %'], ['5', '+  -'], ['6', '<<  >>'], ['7', '&'], ['8', '^'], ['9', '|'], ['10', '== != < > <= >= is in (chain)'], ['11', 'not'], ['12', 'and'], ['13', 'or']] }] });
    var done = [];
    steps.forEach(function (st, i) {
      if (st.val === undefined) return;
      done.push([String(done.length + 1), src.slice(st.s, st.e), H.esc(repr(st.val))]);
      var hl = {}; hl[done.length - 1] = 'cur';
      frames.push({ narr: 'Step ' + (i + 1) + ': ' + st.text, parts: [
        { type: 'text', label: 'Now evaluating (highlighted)', html: markSpan(src, st.s, st.e, 'cur', st.skip) },
        { type: 'table', label: 'Steps so far', columns: ['#', 'sub-expression', 'value'], rows: done.map(function (r) { return r.slice(); }), hl: hl },
        { type: 'vars', label: 'Latest value', vals: { value: repr(st.val), type: st.val.t }, hl: { value: 'ok' } }] });
    });
    if (err) frames.push({ narr: '<span class="c-r">' + H.esc(err.message) + '</span> — Python stops at the first failing operation; nothing after it runs.', parts: [{ type: 'text', label: 'Error', html: '<code>' + H.esc(src) + '</code><br><span class="c-r">' + H.esc(err.message) + '</span>' }, { type: 'table', label: 'Steps completed', columns: ['#', 'sub-expression', 'value'], rows: done.length ? done : [['—', '—', '—']] }] });
    else frames.push({ narr: 'Final result: <b>' + H.esc(repr(val)) + '</b> (' + val.t + '). Python evaluated operands <b>left to right</b>, but applied operators by <b>precedence</b>.', parts: [{ type: 'text', label: 'Result', html: '<code>' + H.esc(src) + '</code> → <b>' + H.esc(repr(val)) + '</b>' }, { type: 'table', label: 'All steps', columns: ['#', 'sub-expression', 'value'], rows: done.length ? done : [['1', src, H.esc(repr(val))]] }] });
    while (frames.length < 4) frames.push({ narr: 'Tip: try longer expressions such as <code>-2 ** 2</code>, <code>7 // -2</code>, <code>1 &lt; 5 &lt; 3</code> or <code>0 or "x"</code> to see more steps.', parts: [{ type: 'text', label: 'Result', html: '<code>' + H.esc(src) + '</code>' + (err ? '' : ' → <b>' + H.esc(repr(val)) + '</b>') }] });
    return frames;
  }

  topics.push({
    title: 'Operators: Arithmetic, Comparison, Logic, Bitwise & Precedence',
    analogy: R`<p>Operators are the <b>kitchen verbs</b> — add, cut, compare, combine. <b>Precedence</b> is the recipe's unwritten rule of <b>what happens first</b>: you chop (<code>**</code>) before you mix (<code>*</code>) before you plate (<code>+</code>). Brackets are the chef shouting "do THIS first!". And <code>and</code>/<code>or</code> are like a <b>bouncer</b>: <code>or</code> lets in the <b>first</b> guest who looks good and stops checking; <code>and</code> stops at the first guest who fails — and the bouncer hands you <b>that guest</b>, not a yes/no stamp.</p>`,
    explain: R`<h4>🟢 Arithmetic</h4>
${H.table(['Op', 'Example', 'Result', 'Remember'], [
  ['<code>+ - *</code>', '<code>7 * 2</code>', '14', 'int op int → int; any float → float'],
  ['<code>/</code>', '<code>7 / 2</code>, <code>6 / 3</code>', '3.5, <b>2.0</b>', 'true division <b>always</b> gives a float'],
  ['<code>//</code>', '<code>7 // 2</code>, <code>-7 // 2</code>', '3, <b>-4</b>', 'floor division: rounds <b>down</b> (toward −∞), not toward 0'],
  ['<code>%</code>', '<code>7 % 3</code>, <code>-7 % 3</code>', '1, <b>2</b>', 'result has the sign of the <b>divisor</b>'],
  ['<code>**</code>', '<code>2 ** 10</code>, <code>2 ** -1</code>', '1024, 0.5', 'power; <code>pow(b, e, m)</code> = fast modular power'],
  ['<code>divmod</code>', '<code>divmod(17, 5)</code>', '(3, 2)', 'both at once: <code>a == b*q + r</code> always holds']
])}
<p>The law that ties <code>//</code> and <code>%</code> together: <code>a == (a // b) * b + a % b</code>. With <code>a = -7, b = 2</code>: <code>(-4) * 2 + 1 = -7</code> ✓. That is why <code>-7 % 2</code> is <code>1</code> in Python (but −1 in C/Java/JS) — handy: <code>i % n</code> is always a valid index for positive n, even for negative i.</p>
<h4>🟢 Comparison (and chaining)</h4>
<p><code>== != &lt; &gt; &lt;= &gt;=</code> return <code>True</code>/<code>False</code>. They <b>chain</b> like maths: <code>0 &lt;= x &lt; 10</code> means <code>0 &lt;= x and x &lt; 10</code> (with <code>x</code> evaluated once). Strings compare alphabetically by code point: <code>"Z" &lt; "a"</code> is True (uppercase letters come first).</p>
<h4>🟢 Logic: <code>and</code>, <code>or</code>, <code>not</code></h4>
${H.table(['Expression', 'Returns', 'Why'], [
  ['<code>x or y</code>', 'x if x is truthy, else y', 'stops at the first truthy'],
  ['<code>x and y</code>', 'x if x is falsy, else y', 'stops at the first falsy'],
  ['<code>not x</code>', 'always a bool', 'flips truthiness']
])}
<p>So <code>"" or "guest"</code> → <code>'guest'</code> (a default value idiom) and <code>0 and 1/0</code> → <code>0</code> without ever dividing — <b>short-circuit</b>.</p>
<h4>🔵 Identity and membership</h4>
<p><code>is</code>/<code>is not</code> test same object (topic 2). <code>in</code>/<code>not in</code> test containment: <code>"ell" in "hello"</code>, <code>3 in [1, 2, 3]</code>, <code>"key" in my_dict</code> (checks keys).</p>
<h4>🔵 Bitwise (on ints)</h4>
${H.table(['Op', '<code>a=12 (1100), b=10 (1010)</code>', 'Use'], [
  ['<code>&amp;</code> and', '<code>a &amp; b = 8 (1000)</code>', 'mask bits, test <code>n &amp; 1</code> (odd?)'],
  ['<code>|</code> or', '<code>a | b = 14 (1110)</code>', 'set bits / combine flags'],
  ['<code>^</code> xor', '<code>a ^ b = 6 (0110)</code>', 'toggle bits, find the unique number'],
  ['<code>~</code> not', '<code>~a = -13</code>', '<code>~x == -x - 1</code> (infinite two\'s complement)'],
  ['<code>&lt;&lt; &gt;&gt;</code>', '<code>1 &lt;&lt; 4 = 16</code>, <code>-9 &gt;&gt; 1 = -5</code>', '× / ÷ by powers of 2 (floor)']
])}
<h4>🔵 Assignment operators, walrus, ternary</h4>
<pre>total += 5        # also -= *= /= //= %= **= &amp;= |= ^= &gt;&gt;= &lt;&lt;=
if (n := len(items)) &gt; 3:    # walrus: assign AND use (3.8+)
    print(f"{n} items")
label = "even" if n % 2 == 0 else "odd"   # conditional expression</pre>
<h4>🔵 Precedence cheat-sheet (high → low)</h4>
<p><code>()</code> → <code>**</code> → unary <code>-x</code> → <code>* / // %</code> → <code>+ -</code> → <code>&lt;&lt; &gt;&gt;</code> → <code>&amp;</code> → <code>^</code> → <code>|</code> → comparisons/<code>in</code>/<code>is</code> → <code>not</code> → <code>and</code> → <code>or</code> → <code>if-else</code> → <code>:=</code>.<br>Two traps: <code>-2 ** 2</code> is <b>−4</b> (power before minus), and <code>2 ** 3 ** 2</code> is <b>512</b> (right-to-left). When in doubt, add brackets — readers will thank you.</p>`,
    clues: [
      '"Output of <code>-7 // 2</code> and <code>-7 % 2</code>?" → -4 and 1 (floor toward −∞; sign follows the divisor)',
      '"Why is <code>-2 ** 2</code> negative?" → ** binds tighter than unary minus',
      '"What does <code>x or default</code> return?" → an operand, not a bool; beware of valid falsy values like 0',
      '"<code>1 &lt; 3 &gt; 2</code>?" → chained comparison: (1 &lt; 3) and (3 &gt; 2) → True',
      '"Wrap-around index / circular array / clock arithmetic" → <code>% n</code> (always non-negative for n &gt; 0)',
      '"Check odd/even, power of two, toggle a flag" → bitwise <code>&amp; 1</code>, <code>n &amp; (n - 1) == 0</code>, <code>^</code>',
      '"Avoid ZeroDivisionError in a condition" → short-circuit: <code>d != 0 and n / d &gt; 2</code>'
    ],
    code: [{ lang: 'python', run: true, title: 'Operator behaviour that interviewers love (runnable)', code: R`print(7 / 2, 6 / 3)          # 3.5 2.0   true division -> float
print(7 // 2, -7 // 2)       # 3 -4      floor division rounds DOWN
print(7 % 3, -7 % 3, 7 % -3) # 1 2 -2    sign follows the divisor
print(divmod(-7, 2))         # (-4, 1)   and (-4)*2 + 1 == -7
print(-2 ** 2, (-2) ** 2)    # -4 4      ** before unary minus
print(2 ** 3 ** 2)           # 512       right-to-left: 2 ** 9
print(pow(3, 200, 1000))     # 1         fast modular exponent

print(1 < 3 > 2, 1 < 2 < 1)  # True False  chaining
print("" or "guest")         # guest     or returns an operand
print(0 and 1 / 0)           # 0         short-circuit: 1/0 never runs
print(not "", not [0])       # True False

print(12 & 10, 12 | 10, 12 ^ 10, ~12)  # 8 14 6 -13
print(1 << 4, -9 >> 1)                  # 16 -5

items = [3, 1, 4, 1, 5]
if (n := len(items)) > 3:               # walrus: assign + test
    print(f"{n} items, " + ("even" if n % 2 == 0 else "odd"))` }],
    codeTitle: ['Operators in action'],
    viz: [{
      title: 'Expression evaluator: precedence step by step',
      input: '2 + 3 * 4 ** 2 // 5 - -7 % 3',
      inputLabel: 'Any expression with numbers/strings (+ - * / // % ** & | ^ ~ << >> comparisons and/or/not, abs(), int(), ...)',
      gen: function (input) { return exprFrames(input, 'We will evaluate <code>' + H.esc(String(input).trim()) + '</code> exactly like CPython: operands left to right, operators by the precedence ladder below.'); }
    }, {
      title: 'Short-circuit: and / or return operands',
      input: "0 or '' or 'guest' and 1 // 0",
      inputLabel: 'Try: 5 and 0 or 7 · None or 0 or [] · 0 and 1 // 0 · 1 < 2 < 0',
      gen: function (input) { return exprFrames(input, '<code>and</code> binds tighter than <code>or</code>. Watch which operands are actually evaluated — skipped parts are struck through, so an error hiding there (like <code>1 // 0</code>) never happens.'); }
    }],
    examples: [
      { title: 'Circular index with %', html: R`<p>Moving backwards in a circular list: <code>(i - 1) % n</code> is always in <code>0..n-1</code> in Python, so no special case for <code>i = 0</code> is needed.</p>`, code: { lang: 'python', run: true, code: R`days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
i = 0
print(days[(i - 1) % 7])     # Sun  (-1 % 7 == 6)
print(days[(i + 10) % 7])    # Thu  (10 days after Monday)` } },
      { title: 'The "or default" idiom and its trap', html: R`<p><code>x or default</code> is great when every falsy value means "missing". If 0 is a valid value, use an explicit <code>is None</code> test.</p>`, code: { lang: 'python', run: true, code: R`def greet(name=None):
    return "Hello, " + (name or "guest")

print(greet(), greet("Asha"))   # Hello, guest Hello, Asha

def set_volume(level=None):
    level = level or 50          # BUG: level=0 becomes 50!
    return level

def set_volume_ok(level=None):
    return 50 if level is None else level

print(set_volume(0), set_volume_ok(0))   # 50 0` } },
      { title: 'Seconds → h:m:s with divmod', html: R`<p><code>divmod</code> returns quotient and remainder together — perfect for unit conversion.</p>`, code: { lang: 'python', run: true, code: R`total = 7384
minutes, seconds = divmod(total, 60)
hours, minutes = divmod(minutes, 60)
print(f"{hours}:{minutes:02d}:{seconds:02d}")   # 2:03:04` } },
      { title: 'Bit tricks', html: R`<p>Classic one-liners: odd test, power-of-two test, toggling a flag, and counting set bits (<code>int.bit_count()</code>, 3.10+).</p>`, code: { lang: 'python', run: true, code: R`n = 40
print(n & 1)                       # 0 -> even
print(n > 0 and n & (n - 1) == 0)  # False (40 is not a power of two)
print(64 & 63 == 0)                # True: unlike C, & binds TIGHTER than == in Python
x, y = 5, 3
print(x > 1 & y < 3)               # True?! parsed as x > (1 & y) < 3, a chained comparison
print((x > 1) & (y < 3))           # False: brackets say what we meant
flags = 0b0101
flags ^= 0b0001                    # toggle bit 0
print(bin(flags), (255).bit_count())  # 0b100 8` } }
    ],
    deepDive: R`<h4>🟣 Why floor division?</h4>
<p>Guido chose floor semantics so that <code>a % b</code> has the sign of <code>b</code>; that makes <code>%</code> a true mathematical modulo for positive moduli (hashing buckets, clock arithmetic, circular buffers). C, Java, Go and JavaScript truncate toward zero instead, so porting code between languages with negative numbers is a classic bug source. <code>math.fmod(-7, 3)</code> gives the C-style <code>-1.0</code> when you need it.</p>
<h4>🟣 Operator dispatch</h4>
<p>Each operator maps to a dunder method: <code>+</code> → <code>__add__</code>/<code>__radd__</code>, <code>&lt;</code> → <code>__lt__</code> (reflected as <code>__gt__</code>), <code>in</code> → <code>__contains__</code>, <code>bool(x)</code> → <code>__bool__</code>. Python has <b>no</b> <code>__and__</code> for the keyword <code>and</code> — <code>and</code>/<code>or</code>/<code>not</code> cannot be overloaded because they must short-circuit. (<code>__and__</code> is the bitwise <code>&amp;</code>, which is why NumPy/pandas use <code>(a &gt; 1) &amp; (b &lt; 2)</code> with brackets.)</p>
<h4>🟣 Evaluation order</h4>
<p>Operands are evaluated <b>left to right</b> even when precedence groups the right side first: in <code>f() + g() * h()</code>, <code>f</code> is called first. In assignments the right side is evaluated before the targets. In a chained comparison <code>a &lt; f() &lt; c</code>, <code>f()</code> runs only once.</p>
<h4>🟣 Performance notes</h4>
<p><code>x * x</code> is faster than <code>x ** 2</code> for small ints; <code>pow(b, e, m)</code> uses square-and-multiply (O(log e) multiplications) and never builds the huge intermediate; <code>n &gt;&gt; 1</code> and <code>n // 2</code> are equally fast in CPython — prefer the readable one. Since 3.11 specialised bytecodes (<code>BINARY_OP_ADD_INT</code>, <code>COMPARE_OP_INT</code>) make int arithmetic noticeably faster when types are stable.</p>
<h4>🟣 Floats and comparisons</h4>
<p><code>nan</code> compares False with everything (even itself), so sorting lists with NaN gives unpredictable order. <code>0.1 + 0.2 == 0.3</code> is False — compare with <code>math.isclose(a, b, rel_tol=1e-9, abs_tol=0.0)</code> (topic 7).</p>`,
    aiEra: R`<p><b>What AI changes:</b> assistants instantly explain "why is this -4?" and translate integer-division logic between languages — if you tell them both languages' semantics differ.</p>
<p><b>Use AI as a partner:</b> <code>Port this C function to Python; flag every / and % whose behaviour changes for negative numbers</code>. Ask it to generate tricky precedence quizzes, then check them with the evaluator above.</p>
<p><b>Where AI goes wrong:</b> porting C/Java code that relies on truncating division (<code>-7 / 2 == -3</code>) to Python's <code>//</code> (gives -4); mixing <code>&amp;</code> with comparisons without brackets (<code>a &gt; 1 &amp; b &lt; 3</code> silently becomes the chain <code>a &gt; (1 &amp; b) &lt; 3</code>); using <code>or</code> defaults that swallow valid zeros; using <code>and</code> instead of <code>&amp;</code> with NumPy arrays ("truth value of an array is ambiguous").</p>
<p><b>What you must still own:</b> the precedence ladder, Python's floor semantics, and what <code>and</code>/<code>or</code> really return. These show up in every "predict the output" round.</p>`,
    problems: [{
      title: 'Leap Year Rule',
      level: 'Easy', tags: ['modulo', 'boolean logic', 'precedence'], companies: ['TCS', 'Infosys', 'Google'],
      statement: R`<p>Write <code>is_leap(year)</code>. A year is a leap year if it is divisible by 4, <b>except</b> years divisible by 100, <b>unless</b> they are also divisible by 400. Return a bool using a single boolean expression.</p>`,
      constraints: R`1 ≤ year ≤ 10<sup>9</sup>. Gregorian rules only.`,
      example: R`<p><code>2024</code> → ${H.c('g', 'True')} (÷4, not ÷100) · <code>1900</code> → ${H.c('r', 'False')} (÷100 but not ÷400) · <code>2000</code> → ${H.c('g', 'True')} (÷400) · <code>2023</code> → ${H.c('r', 'False')}</p>`,
      brute: { why: R`<p>Nested if/else ladders work but are easy to get wrong — the most common bug is checking <code>% 100</code> before <code>% 400</code> and returning False for 2000. Another bug is mixing <code>and</code>/<code>or</code> without brackets and relying on precedence you have not verified.</p>`, code: R`def is_leap_buggy(year):
    if year % 100 == 0:       # BUG: 2000 is caught here and rejected
        return False
    if year % 400 == 0:
        return True
    return year % 4 == 0

print(is_leap_buggy(2000))    # False  <- wrong, 2000 was a leap year` },
      mcq: { q: 'Which expression is correct?', options: ['<code>y % 4 == 0 and (y % 100 != 0 or y % 400 == 0)</code>', '<code>y % 4 == 0 and y % 100 != 0 or y % 400 == 0 and False</code>', '<code>y % 400 == 0 and y % 4 == 0 or y % 100 != 0</code>', '<code>y % 4 == 0 or y % 100 != 0</code>'], answer: 0, explain: 'Divisible by 4 AND (not a century OR a 400-multiple). Option 3 makes 2023 a leap year (2023 % 100 != 0 is True).' },
      hints: [R`<p>Hint 1: Write the three rules as three small boolean facts: <code>div4</code>, <code>div100</code>, <code>div400</code>. Then combine them in words before writing operators.</p>`, R`<p>Hint 2: <code>and</code> binds tighter than <code>or</code>, so use brackets to make "not a century OR divisible by 400" one group.</p>`, R`<p>Hint 3: Test the four classic years: 2024 (T), 2023 (F), 1900 (F), 2000 (T). Recipe: <code>return y % 4 == 0 and (y % 100 != 0 or y % 400 == 0)</code>.</p>`],
      solution: {
        approach: R`<p>Translate the rule literally: divisible by 4, and either not a century or divisible by 400. Brackets make the grouping explicit; short-circuiting skips the extra checks for most years.</p>`,
        code: { lang: 'python', run: true, code: R`def is_leap(year):
    """Gregorian leap-year rule in one boolean expression."""
    return year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)

for y in [2024, 2023, 1900, 2000, 2100, 2400]:
    print(y, is_leap(y))
# also available in the standard library:
import calendar
print(calendar.isleap(2000))   # True` },
        dry: { head: ['year', 'y % 4 == 0', 'y % 100 != 0', 'y % 400 == 0', 'result'], rows: [['2024', 'True', 'True (stop: or is satisfied)', '— (skipped)', '<span class="c-g">True</span>'], ['2023', 'False (stop: and fails)', '— (skipped)', '— (skipped)', '<span class="c-r">False</span>'], ['1900', 'True', 'False', 'False', '<span class="c-r">False</span>'], ['2000', 'True', 'False', 'True', '<span class="c-g">True</span>']] },
        complexity: R`<p>O(1) time and space: at most three modulo operations, often fewer thanks to short-circuiting.</p>`,
        followUps: ['Count leap years between two years in O(1) using floor division.', 'Why do the 100/400 rules exist? (the solar year is ~365.2425 days)']
      }
    }]
  });

  /* =====================================================================
     TOPIC 7 — Integer precision (and why floats are different)
     ===================================================================== */
  topics.push({
    title: 'Integer Precision: Unlimited ints, Approximate floats',
    analogy: R`<p>A Python <b>int</b> is like a <b>notebook that grows</b>: when a number gets too long for one line, Python just staples on another page — it never runs out of room, it only gets thicker (and slower to read). A <b>float</b> is like a <b>pocket calculator with a fixed 16-digit screen</b>: super fast, handles huge and tiny numbers, but anything that needs more digits gets <b>rounded to fit the screen</b>. And because the calculator thinks in <b>binary</b>, even a simple-looking "0.1" is an endless pattern for it, like 1/3 = 0.333… is for us.</p>`,
    explain: R`<h4>🟢 int: exact and unlimited</h4>
<pre>2 ** 64        # 18446744073709551616 (no overflow!)
2 ** 1000      # 302 digits, exact
10 ** 20 + 1 - 10 ** 20   # 1, exactly</pre>
<p>In Java/C++, <code>int</code> wraps around after 2<sup>31</sup>−1 and <code>long</code> after 2<sup>63</sup>−1. Python ints grow as needed, so factorials, huge counters and cryptography maths "just work". The price: bigger numbers use more memory and each operation takes longer.</p>
<h4>🟢 float: 64-bit binary, about 15–17 significant digits</h4>
${H.table(['Expression', 'Result', 'Why'], [
  ['<code>0.1 + 0.2</code>', '<code>0.30000000000000004</code>', '0.1 and 0.2 are stored slightly off'],
  ['<code>0.1 + 0.2 == 0.3</code>', '<code>False</code>', 'the tiny errors do not cancel'],
  ['<code>2 ** 53 + 1.0</code>', '<code>9007199254740992.0</code>', 'floats have 53 bits of precision; the +1 is lost'],
  ['<code>1e308 * 10</code>', '<code>inf</code>', 'too big for a float → infinity (no error)'],
  ['<code>10 ** 400 / 3</code>', H.c('r', 'OverflowError'), '<code>/</code> converts to float — use <code>//</code> for big ints'],
  ['<code>round(2.675, 2)</code>', '<code>2.67</code>', '2.675 is really 2.67499999…']
])}
<h4>🟢 Comparing floats safely</h4>
<pre>import math
math.isclose(0.1 + 0.2, 0.3)          # True (relative tolerance 1e-9)
abs(a - b) &lt; 1e-9                      # manual version (absolute tolerance)</pre>
<h4>🔵 When you need exact decimals</h4>
${H.table(['Tool', 'Example', 'Use for'], [
  ['int cents', '<code>price_cents = 1999</code>', 'money in most apps: store the smallest unit as an int'],
  ['<code>Decimal</code>', '<code>Decimal("0.1") + Decimal("0.2") == Decimal("0.3")</code> → True', 'finance, tax, exact decimal rounding rules'],
  ['<code>Fraction</code>', '<code>Fraction(1, 3) * 3 == 1</code> → True', 'exact rational maths, probabilities'],
  ['<code>math.fsum</code>', '<code>math.fsum([0.1] * 10) == 1.0</code>', 'accurate float sums']
])}
<p>Create a Decimal from a <b>string</b>, not a float: <code>Decimal(0.1)</code> faithfully copies the float's error (<code>0.1000000000000000055511…</code>).</p>
<h4>🔵 int ↔ float conversions</h4>
<ul>
<li><code>float(10**20)</code> is exact, but <code>float(2**53 + 1)</code> is not — floats can only represent every integer up to 2<sup>53</sup> = 9,007,199,254,740,992.</li>
<li><code>int(1e23)</code> → <code>99999999999999991611392</code>: the float 1e23 was never exactly 10<sup>23</sup>. Write <code>10 ** 23</code> for exact powers.</li>
<li>Comparisons between int and float are <b>exact</b> in Python: <code>2**53 + 1 == float(2**53 + 1)</code> is False, correctly.</li>
</ul>
<h4>🔵 The 4300-digit safety limit</h4>
<p>Since Python 3.11, converting between <code>int</code> and decimal <code>str</code> is limited to 4300 digits by default (<code>int("1" * 5000)</code> → <code>ValueError: Exceeds the limit (4300 digits)…</code>) because the conversion is quadratic and attackers could freeze servers with huge numbers. Arithmetic is unlimited; only the text conversion is guarded. Raise it with <code>sys.set_int_max_str_digits(0)</code> (0 = no limit) when you really need to.</p>`,
    clues: [
      '"Does Python int overflow?" / "factorial of 100" / "2<sup>1000</sup>" → no overflow; arbitrary precision',
      '"Why is <code>0.1 + 0.2 != 0.3</code>?" → binary floating point (IEEE 754); use <code>math.isclose</code> or Decimal',
      '"Handle money / currency" → int cents or <code>Decimal</code> from strings, never float',
      '"Answer modulo 10<sup>9</sup>+7" → in Python you <i>can</i> compute exactly, but reducing mod as you go keeps numbers small and fast',
      '"<code>OverflowError: integer division result too large for a float</code>" → use <code>//</code> instead of <code>/</code> on big ints',
      '"<code>ValueError: Exceeds the limit (4300 digits)</code>" → int↔str conversion limit; <code>sys.set_int_max_str_digits</code>',
      '"Largest integer a float can hold exactly?" → 2<sup>53</sup>'
    ],
    code: [{ lang: 'python', run: true, title: 'Precision playground (runnable)', code: R`import math, sys
from decimal import Decimal
from fractions import Fraction

print(2 ** 100)                         # exact, 31 digits
print(math.factorial(25))               # 15511210043330985984000000
print(len(str(2 ** 1000)))              # 302 digits

print(0.1 + 0.2, 0.1 + 0.2 == 0.3)      # 0.30000000000000004 False
print(math.isclose(0.1 + 0.2, 0.3))     # True
print(Decimal("0.1") + Decimal("0.2"))  # 0.3 exactly
print(Decimal(0.1))                     # 0.1000000000000000055511151231257827021181583404541015625
print(Fraction(1, 3) * 3)               # 1

total = 0.0
for _ in range(10):
    total += 0.1                        # errors accumulate
print(total, math.fsum([0.1] * 10))     # 0.9999999999999999 1.0

print(float(2 ** 53 + 1))               # 9007199254740992.0  (lost the +1)
print(int(1e23), 10 ** 23)              # 99999999999999991611392 vs exact
print(sys.float_info.max, sys.float_info.epsilon)
print((10 ** 400) // 3 % 1000)          # big-int floor division is fine: 333
try:
    print(10 ** 400 / 3)                # true division needs a float
except OverflowError as e:
    print("OverflowError:", e)
print(round(2.5), round(3.5), round(2.675, 2))   # 2 4 2.67 (half-to-even, binary error)` }],
    codeTitle: ['Precision playground'],
    viz: [{
      title: 'How CPython stores a big int: base-2³⁰ "digits"',
      input: '2 ** 100 + 12345',
      inputLabel: 'An integer expression (e.g. 2 ** 100, 10 ** 30, -(2 ** 64), 123456789012345678901234567890)',
      gen: function (input) {
        var src = String(input).trim();
        if (!src) throw new Error('Type an integer expression, e.g. 2 ** 100');
        var v = evalNode(parseExpr(src), {}, [], []);
        if (v.t !== 'int' && v.t !== 'bool') throw new Error('Please give an integer expression (got ' + v.t + ')');
        var n = asInt(v), bd = bigDigits(n), frames = [], B = 1n << 30n, rest = n < 0n ? -n : n, digs = [];
        if (bd.digits.length > 14) throw new Error('Keep it under ~400 bits for the demo (e.g. 2 ** 400)');
        frames.push({ narr: 'Value: <b>' + n.toString() + '</b> (' + (n < 0n ? -n : n).toString().length + ' decimal digits). CPython does not store decimal digits; it stores an array of <b>30-bit chunks</b> (each 0 … 1,073,741,823), least-significant first, plus a sign.', parts: [{ type: 'vars', label: 'Number', vals: { value: n.toString().length > 40 ? n.toString().slice(0, 38) + '…' : n.toString(), base: '2^30 = 1073741824', sign: n < 0n ? 'negative' : n === 0n ? 'zero' : 'positive' } }, { type: 'array', label: 'ob_digit[] (empty so far)', values: ['…'] }] });
        if (rest === 0n) digs.push('0');
        var k = 0;
        while (rest > 0n) {
          var d = rest % B, q = rest / B;
          digs.push(d.toString());
          var hl = {}; hl[digs.length - 1] = 'ok';
          frames.push({ narr: 'Chunk ' + k + ': <code>divmod(rest, 2**30)</code> → remainder <b>' + d.toString() + '</b> is stored in <code>ob_digit[' + k + ']</code>; quotient ' + (q.toString().length > 30 ? q.toString().slice(0, 28) + '…' : q.toString()) + ' carries on.', parts: [{ type: 'vars', label: 'Long division by 2^30', vals: { rest: rest.toString().length > 34 ? rest.toString().slice(0, 32) + '…' : rest.toString(), 'rest % 2^30': d.toString(), 'rest // 2^30': q.toString().length > 34 ? q.toString().slice(0, 32) + '…' : q.toString() }, hl: { 'rest % 2^30': 'ok' } }, { type: 'array', label: 'ob_digit[] (least significant first)', values: digs.slice(), hl: hl, showIdx: true }] });
          rest = q; k++;
        }
        var size = 24 + 4 * Math.max(1, bd.digits.length);
        frames.push({ narr: 'Done: <b>' + bd.digits.length + '</b> chunk(s). <code>sys.getsizeof</code> ≈ 24-byte header + 4 bytes × ' + Math.max(1, bd.digits.length) + ' = <b>' + size + ' bytes</b>. Value check: Σ ob_digit[i] × 2<sup>30·i</sup> = the original number' + (n < 0n ? ' (the sign is stored separately)' : '') + '.', parts: [{ type: 'array', label: 'ob_digit[]', values: digs, showIdx: true, hl: (function () { var h = {}; digs.forEach(function (_, i) { h[i] = 'sel'; }); return h; })() }, { type: 'bars', label: 'Bytes: header vs digits', values: [24, 4 * Math.max(1, bd.digits.length)], idxLabels: ['header', 'digits'] }] });
        frames.push({ narr: 'Why it matters: adding two n-chunk ints costs O(n); multiplying uses Karatsuba (≈ O(n<sup>1.58</sup>)) for big ones; turning them into decimal text is roughly O(n²) — hence the 4300-digit str-conversion limit. Small ints (one chunk) take the fast path.', parts: [{ type: 'table', label: 'Cost of operations on an n-chunk int', columns: ['operation', 'cost'], rows: [['+ , -', 'O(n)'], ['* (small)', 'O(n²) schoolbook'], ['* (large)', 'Karatsuba ≈ O(n^1.58)'], ['str(n) / int(s)', '≈ O(n²) → 4300-digit limit'], ['n.bit_length()', 'O(1)']] }] });
        return pad4(frames, 'Tip: try a bigger number such as 2 ** 300 to see more 30-bit chunks.');
      }
    }, {
      title: 'Why 0.1 is not exact: decimal → binary, then rounding to 53 bits',
      input: '0.1',
      inputLabel: 'A decimal number between 0 and 1000 with up to 8 decimals (try 0.1, 0.5, 0.75, 0.2, 2.675)',
      gen: function (input) {
        var s = String(input).trim();
        if (!/^\d{1,3}(\.\d{1,8})?$/.test(s)) throw new Error('Type a decimal like 0.1 or 2.675 (0–999, up to 8 decimals)');
        var parts = s.split('.'), ip = BigInt(parts[0]), fs = parts[1] || '', N = fs ? BigInt(fs) : 0n, D = 10n ** BigInt(fs.length), frames = [];
        var bitsArr = [], seen = {}, cycleAt = -1, steps = 0, x = parseFloat(s);
        frames.push({ narr: 'Integer part <b>' + ip + '</b> is easy in binary (<code>' + ip.toString(2) + '</code>). The fraction <b>0.' + (fs || '0') + '</b> is converted by repeatedly <b>doubling</b>: the digit before the point becomes the next binary digit.', parts: [{ type: 'vars', label: 'Start', vals: { fraction: N.toString() + '/' + D.toString(), 'binary so far': '0.' } }] });
        while (N !== 0n && steps < 14) {
          var key = N.toString();
          if (seen[key] !== undefined) { cycleAt = seen[key]; break; }
          seen[key] = steps;
          var before = N; N = N * 2n; var bit = N >= D ? 1 : 0; if (bit) N -= D;
          bitsArr.push(bit); steps++;
          var hl = {}; hl[bitsArr.length - 1] = bit ? 'ok' : 'cur';
          frames.push({ narr: 'Double ' + before + '/' + D + ' → ' + (before * 2n) + '/' + D + '. ' + (bit ? 'It is ≥ 1, so write <b>1</b> and subtract 1.' : 'Still &lt; 1, so write <b>0</b>.') + ' Remainder: ' + N + '/' + D + '.', parts: [{ type: 'array', label: 'Binary digits after the point', values: bitsArr.slice(), hl: hl, showIdx: true }, { type: 'vars', label: 'State', vals: { remainder: N.toString() + '/' + D.toString(), 'binary so far': '0.' + bitsArr.join('') } }] });
        }
        var verdict;
        if (N === 0n) verdict = 'The remainder hit <b>0</b>: this fraction is a sum of powers of ½, so it is stored <b>exactly</b>.';
        else if (cycleAt >= 0) verdict = 'The remainder repeats (seen at step ' + cycleAt + '): the binary digits <b>repeat forever</b>, like 1/3 = 0.333… in decimal. A float must cut it off.';
        else verdict = 'Still not finished after 14 steps — the pattern goes on far longer than a float can hold.';
        frames.push({ narr: verdict, parts: [{ type: 'array', label: 'Binary digits found', values: bitsArr.length ? bitsArr : [0], hl: cycleAt >= 0 ? (function () { var h = {}; for (var i = cycleAt; i < bitsArr.length; i++) h[i] = 'win'; return h; })() : {} }, { type: 'text', label: 'Rule of thumb', html: 'Only fractions whose denominator is a power of 2 (½, ¼, ⅜, 0.75 …) are exact in binary.' }] });
        var ex = exactDecimal(x);
        var expo = ex.bits.expBits;
        frames.push({ narr: 'A float keeps <b>53 significant bits</b> (1 implicit + 52 stored), in IEEE-754 binary64 layout: 1 sign bit, 11 exponent bits (here ' + expo + ' → 2<sup>' + (expo - 1023) + '</sup>), 52 fraction bits. Below are the 64 bits split into two 32-bit halves.', parts: [{ type: 'bits', label: 'high 32 bits: sign | exponent | fraction (top 20 bits)', value: ex.bits.hi | 0, width: 32, hl: (function () { var h = { 31: 'sel' }; for (var i = 20; i < 31; i++) h[i] = 'cur'; return h; })() }, { type: 'bits', label: 'low 32 bits: rest of the fraction', value: ex.bits.lo | 0, width: 32 }] });
        frames.push({ narr: 'The value actually stored for <code>' + H.esc(s) + '</code> is exactly <b>' + ex.text + '</b>. Python prints <code>' + floatRepr(x) + '</code> because <code>repr</code> shows the <b>shortest</b> text that maps back to the same float — the error is hidden, not gone.', parts: [{ type: 'vars', label: 'Typed vs stored', vals: { typed: s, 'repr(x)': floatRepr(x), 'Decimal(x)': ex.text.length > 60 ? ex.text.slice(0, 58) + '…' : ex.text, exact: ex.text === (s.indexOf('.') >= 0 ? s.replace(/0+$/, '').replace(/\.$/, '') : s).replace(/^0+(?=\d)/, '') ? 'yes' : 'no' }, hl: { 'Decimal(x)': 'sel' } }] });
        var y = x + 0.2, ey = exactDecimal(y);
        frames.push({ narr: 'Consequence: <code>' + floatRepr(x) + ' + 0.2</code> → <b>' + floatRepr(y) + '</b>. Each operand carries its tiny error and the result is rounded again to 53 bits. Compare floats with <code>math.isclose</code>; use <code>Decimal("' + H.esc(s) + '")</code> or integer cents when exact decimals matter.', parts: [{ type: 'table', label: 'Exact values behind the scenes', columns: ['float', 'exact stored value'], rows: [[floatRepr(x), ex.text], ['0.2', exactDecimal(0.2).text], [floatRepr(y), ey.text]], hl: { 2: 'bad' } }] });
        return frames;
      }
    }],
    examples: [
      { title: 'Exact big-number maths', html: R`<p>Combinatorics answers overflow 64-bit integers quickly. Python computes them exactly; <code>math.comb</code> is the fast built-in.</p>`, code: { lang: 'python', run: true, code: R`import math
print(math.comb(100, 50))            # 100891344545564193334812497256
print(math.factorial(30) // math.factorial(28))   # 870 = 30 * 29
print((2 ** 127 - 1).bit_length())   # 127 bits` } },
      { title: 'Money: floats vs cents vs Decimal', html: R`<p>Adding ₹0.10 ten times with floats drifts; integer cents and Decimal stay exact. Decimal also lets you choose the rounding rule (finance often wants half-up).</p>`, code: { lang: 'python', run: true, code: R`from decimal import Decimal, ROUND_HALF_UP

f = 0.0
for _ in range(10):
    f += 0.10
print(f)                               # 0.9999999999999999

cents = sum([10] * 10)
print(f"{cents // 100}.{cents % 100:02d}")   # 1.00

d = sum([Decimal("0.10")] * 10, Decimal("0"))
print(d)                               # 1.00
print(Decimal("2.675").quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))  # 2.68` } },
      { title: 'Modular arithmetic for huge answers', html: R`<p>Even though Python could compute 3<sup>10<sup>6</sup></sup> exactly, it would have ~477,000 digits and be slow. Interview answers "mod 10<sup>9</sup>+7" are fastest with three-argument <code>pow</code>.</p>`, code: { lang: 'python', run: true, code: R`MOD = 10 ** 9 + 7
print(pow(3, 10 ** 6, MOD))            # instant, small result
print(pow(3, -1, MOD))                 # modular inverse (3.8+): 333333336
print(3 * pow(3, -1, MOD) % MOD)       # 1` } },
      { title: 'The 2⁵³ cliff', html: R`<p>Beyond 2<sup>53</sup>, floats cannot represent every integer; neighbouring floats are 2 apart, then 4, and so on. IDs from JSON parsed as floats (JavaScript!) get corrupted exactly here.</p>`, code: { lang: 'python', run: true, code: R`import math
big = 2 ** 53
print(float(big) == float(big + 1))    # True  -> two ints collapse to one float
print(math.ulp(float(big)))            # 2.0   gap between neighbouring floats
print(big + 1)                         # 9007199254740993 exact as an int` } }
    ],
    deepDive: R`<h4>🟣 Inside <code>PyLongObject</code></h4>
<p>An int is a header (refcount, type pointer), a combined size/sign field, and <code>ob_digit[]</code>: an array of 32-bit C integers each holding 30 bits (on all mainstream 64-bit builds; <code>sys.int_info</code> shows <code>bits_per_digit=30</code>). The spare 2 bits let additions/multiplications of digits happen without overflow before carrying. Since 3.12 the representation has a compact form ("lv_tag") so one-digit ints take fast paths everywhere.</p>
<h4>🟣 Algorithms</h4>
<ul>
<li>Addition/subtraction: O(n) schoolbook with carries.</li>
<li>Multiplication: schoolbook O(n²) below ~70 digits (2100 bits), <b>Karatsuba</b> O(n<sup>1.585</sup>) above. CPython does not use FFT multiplication — for million-digit maths use <code>gmpy2</code> (GMP).</li>
<li>int → decimal str was quadratic; 3.12 added a faster divide-and-conquer algorithm for very large values, but the 4300-digit default limit (CVE-2020-10735) stays as a guard.</li>
<li><code>pow(b, e, m)</code>: square-and-multiply with sliding windows, O(log e) multiplications of size log m.</li>
</ul>
<h4>🟣 Floats, precisely</h4>
<p>IEEE-754 binary64: value = (−1)<sup>sign</sup> × 1.fraction × 2<sup>exponent−1023</sup>. Machine epsilon 2<sup>−52</sup> ≈ 2.22e-16 is the gap after 1.0; the relative error of one operation is at most half of that. Smallest subnormal 5e-324; anything smaller underflows to 0.0. Since 3.1, <code>repr(float)</code> prints the <b>shortest</b> round-tripping string (David Gay's algorithm) — why you see <code>0.1</code> instead of 17 digits. Since 3.12, the built-in <code>sum()</code> of floats uses compensated (Neumaier) summation, so <code>sum([0.1] * 10) == 1.0</code> while a manual <code>+=</code> loop still drifts.</p>
<h4>🟣 Hashing across types</h4>
<p>Python guarantees <code>hash(1) == hash(1.0) == hash(Fraction(1)) == hash(Decimal(1))</code> for equal numbers (numeric hashing is based on reduction modulo the Mersenne prime 2<sup>61</sup>−1), so mixed-type numeric keys behave consistently in dicts and sets.</p>
<h4>🟣 Production reality</h4>
<p>Money: integer minor units or <code>Decimal</code> with explicit context/rounding. Science: floats + NumPy (fixed 64-bit ints there <b>do</b> overflow silently!). Interop: JSON numbers above 2<sup>53</sup> are unsafe in JavaScript clients — send big IDs as strings.</p>`,
    aiEra: R`<p><b>What AI changes:</b> AI happily writes numeric code fast — and numeric bugs are the hardest to spot by eye. Use it to generate <b>adversarial test values</b> (0, −0.0, 2<sup>53</sup>+1, 1e308, NaN, values ending in 5 for rounding).</p>
<p><b>Use AI as a partner:</b> <code>Review this function for float precision issues and suggest where Decimal or integer cents should be used</code>. Ask it to explain why a specific value rounds the way it does, then confirm with <code>Decimal(x)</code>.</p>
<p><b>Where AI goes wrong:</b> claiming Python ints overflow at 2<sup>63</sup> (Java habits), adding manual "% MOD to avoid overflow" comments in Python as if overflow were the reason (the real reason is speed), using <code>float</code> for money, using <code>==</code> on floats, assuming <code>round()</code> rounds half up, and suggesting <code>Decimal(0.1)</code> instead of <code>Decimal("0.1")</code>.</p>
<p><b>What you must still own:</b> choosing the number type per domain (count → int, measurement → float, money → cents/Decimal), knowing the 2<sup>53</sup> and 4300-digit limits, and explaining 0.1 + 0.2 clearly in an interview.</p>`,
    problems: [{
      title: 'Power Digit Sum',
      level: 'Easy', tags: ['big integers', 'divmod', 'digits'], companies: ['Project Euler', 'Goldman Sachs'],
      statement: R`<p>Return the sum of the decimal digits of <code>base ** exp</code>. For example, 2<sup>15</sup> = 32768 → 3+2+7+6+8 = 26. Solve it for <code>2 ** 1000</code>.</p>`,
      constraints: R`2 ≤ base ≤ 100, 0 ≤ exp ≤ 5000 (results stay below the 4300-digit str limit only for smaller cases — prefer an arithmetic digit loop).`,
      example: R`<p><code>digit_sum(2, 15)</code> → ${H.c('g', '26')} because 2<sup>15</sup> = 32768.<br><code>digit_sum(2, 1000)</code> → ${H.c('g', '1366')} (2<sup>1000</sup> has 302 digits — no overflow in Python).</p>`,
      brute: { why: R`<p>In languages with fixed-size integers you would need a hand-written big-number multiplier (an array of digits, multiply by 2 one thousand times, O(exp × digits)). In Python, the naive <code>str()</code> route works for moderate sizes but hits the 4300-digit conversion limit for huge results (e.g. 2<sup>15000</sup>).</p>`, code: R`def digit_sum_manual(base, exp):
    digits = [1]                         # little-endian decimal digits
    for _ in range(exp):                 # multiply the digit array by base
        carry = 0
        for i in range(len(digits)):
            carry, digits[i] = divmod(digits[i] * base + carry, 10)
        while carry:
            carry, d = divmod(carry, 10)
            digits.append(d)
    return sum(digits)

print(digit_sum_manual(2, 15))           # 26` },
      mcq: { q: 'Why does <code>2 ** 1000</code> not overflow in Python?', options: ['ints are arbitrary precision (grow chunk by chunk)', 'Python secretly uses floats', 'Python uses 128-bit integers', 'It does overflow but wraps silently'], answer: 0, explain: 'CPython ints are arrays of 30-bit digits that grow as needed. Floats would lose precision; there is no wrap-around.' },
      hints: [R`<p>Hint 1: Python can compute <code>base ** exp</code> exactly — the only question is how to walk its digits.</p>`, R`<p>Hint 2: <code>sum(map(int, str(n)))</code> is short; an arithmetic loop <code>n, d = divmod(n, 10)</code> avoids string conversion entirely (and its 4300-digit limit).</p>`, R`<p>Hint 3: Edge: <code>exp = 0</code> → n = 1 → sum 1. Recipe: n = base ** exp; total = 0; while n: n, d = divmod(n, 10); total += d. Bonus: divide by 10**9 per step to process 9 digits at a time.</p>`],
      solution: {
        approach: R`<p>Compute the exact power, then peel off decimal digits with <code>divmod(n, 10)</code>. For speed on huge numbers, peel 9 digits at a time with <code>divmod(n, 10**9)</code> and sum each chunk's digits.</p>`,
        code: { lang: 'python', run: true, code: R`def digit_sum(base, exp):
    """Sum of decimal digits of base**exp, without str() (no 4300-digit limit)."""
    n = base ** exp                 # exact big integer
    total = 0
    while n:
        n, chunk = divmod(n, 10 ** 9)   # take 9 decimal digits at once
        while chunk:
            chunk, d = divmod(chunk, 10)
            total += d
    return total

print(digit_sum(2, 15))     # 26
print(digit_sum(2, 1000))   # 1366
print(digit_sum(7, 0))      # 1  (7**0 == 1)
print(sum(map(int, str(2 ** 1000))))   # 1366, the short version` },
        dry: { head: ['step', 'n (2**15 = 32768)', 'divmod(n, 10)', 'total'], rows: [['1', '32768', '(3276, 8)', '8'], ['2', '3276', '(327, 6)', '14'], ['3', '327', '(32, 7)', '21'], ['4', '32', '(3, 2)', '23'], ['5', '3', '(0, 3)', '<span class="c-g">26</span>']] },
        complexity: R`<p>Computing the power costs O(M(d)·log exp) where d = number of digits; peeling 9 digits at a time does d/9 big divisions, each O(d) → O(d²/9) overall, fine for thousands of digits. Space O(d).</p>`,
        followUps: ['How many digits does 2<sup>1000</sup> have without converting? (<code>floor(1000·log10(2)) + 1</code>)', 'Return the last 10 digits of 2<sup>10<sup>9</sup></sup> instantly.']
      }
    }]
  });

  /* =====================================================================
     PRACTICE — Easy
     ===================================================================== */
  practice.push({
    title: 'Predict the Output: Re-binding Ints',
    level: 'Easy', tags: ['predict the output', 'names', 'immutability'], companies: ['Amazon', 'Accenture'],
    statement: R`<p>Without running it, write down exactly what this prints. Then explain each value using the "names point at objects" model.</p><pre>a = 10
b = a
a += 5
c = [a, b]
a = 0
print(a, b, c)</pre>`,
    constraints: R`Plain CPython 3. One line of output.`,
    example: R`<p>Output: ${H.c('g', '0 10 [15, 10]')}<br>Why: <code>b = a</code> ties b to the int 10. <code>a += 5</code> makes a <b>new</b> int 15 and moves only <code>a</code>. The list stores references to 15 and 10 <b>at that moment</b>; re-binding <code>a</code> to 0 later does not touch the list.</p>`,
    brute: { why: R`<p>The "boxes" mental model (from C/Java primitives or spreadsheets) predicts <code>0 15 [0, 15]</code> — as if <code>b</code> were linked to <code>a</code> and the list held live formulas. Python names never link to other names, only to objects.</p>`, code: R`# The wrong mental model, written out as if names were linked:
a = 10
b = a          # "b follows a"?  No — b points at the object 10
a += 5         # a now points at a NEW object 15; b still at 10
c = [a, b]     # the list stores the objects 15 and 10, not the names
a = 0
print(a, b, c) # 0 10 [15, 10]` },
    mcq: { q: 'After <code>a += 5</code>, what does <code>b</code> point to?', options: ['The original int object 10', 'The new int 15', 'The name a', 'Nothing'], answer: 0, explain: 'Ints are immutable, so += creates a new object and re-binds only a. Names never point to other names.' },
    hints: [R`<p>Hint 1: Draw two columns — names on the left, objects on the right — and move arrows line by line.</p>`, R`<p>Hint 2: <code>+=</code> on an int cannot change the int; it creates a new one and moves the arrow of the name on the left only.</p>`, R`<p>Hint 3: A list holds references to <b>objects</b>, captured when the list is built. Later re-binding of a name does not reach inside the list.</p>`],
    solution: {
      approach: R`<p>Trace arrows: a→10, b→10, a→15, c→[15, 10], a→0. Print shows current targets.</p>`,
      code: { lang: 'python', run: true, code: R`a = 10
b = a
a += 5
c = [a, b]
a = 0
print(a, b, c)   # 0 10 [15, 10]` },
      dry: { head: ['line', 'a →', 'b →', 'c →'], rows: [['a = 10', '10', '—', '—'], ['b = a', '10', '10 (same object)', '—'], ['a += 5', '<span class="c-g">15 (new)</span>', '10', '—'], ['c = [a, b]', '15', '10', '[15, 10]'], ['a = 0', '<span class="c-g">0</span>', '10', '[15, 10]']] },
      complexity: R`<p>O(1) — a handful of bindings. The point is the mental model, not speed.</p>`,
      followUps: ['What changes if <code>a</code> starts as the list <code>[10]</code> and you do <code>a += [5]</code>?']
    }
  });

  practice.push({
    title: 'Celsius → Fahrenheit Table',
    level: 'Easy', tags: ['f-strings', 'float', 'range'], companies: ['Wipro', 'Cognizant'],
    statement: R`<p>Write <code>temp_table(start, stop, step)</code> that returns a list of lines for Celsius values from <code>start</code> to <code>stop</code> inclusive, formatted as <code>"  -10°C =    14.0°F"</code>: Celsius right-aligned in 5 characters, Fahrenheit right-aligned in 7 characters with one decimal. Formula: F = C × 9/5 + 32.</p>`,
    constraints: R`−273 ≤ start ≤ stop ≤ 1000, step ≥ 1 (all ints).`,
    example: R`<p><code>temp_table(-10, 10, 10)</code> →</p><pre>  -10°C =    14.0°F
    0°C =    32.0°F
   10°C =    50.0°F</pre><p>Why: <code>f"{c:&gt;5}°C = {f:&gt;7.1f}°F"</code>; <code>stop</code> is included, so use <code>range(start, stop + 1, step)</code>.</p>`,
    brute: { why: R`<p>Printing with <code>print(c, "°C =", f)</code> gives ragged columns and float noise like <code>98.60000000000001</code>; returning nothing makes it untestable.</p>`, code: R`def temp_table_naive(start, stop, step):
    for c in range(start, stop, step):    # BUG: misses stop itself
        print(c, "°C =", c * 9 / 5 + 32)  # ragged, unformatted

temp_table_naive(-10, 10, 10)` },
    mcq: { q: 'Which range includes 10 when going from -10 in steps of 10?', options: ['<code>range(-10, 11, 10)</code>', '<code>range(-10, 10, 10)</code>', '<code>range(-10, 10)</code>', '<code>range(10, -10, 10)</code>'], answer: 0, explain: 'range stops BEFORE its stop value, so use stop + 1 to include it.' },
    hints: [R`<p>Hint 1: Separate computing from printing — return a list of strings so the function is easy to test.</p>`, R`<p>Hint 2: <code>c * 9 / 5 + 32</code> is a float because <code>/</code> always gives a float; format it with <code>:.1f</code>.</p>`, R`<p>Hint 3: Widths: <code>{c:&gt;5}</code> and <code>{f:&gt;7.1f}</code>. Remember <code>range(start, stop + 1, step)</code>.</p>`],
    solution: {
      approach: R`<p>Loop over the inclusive range, compute F, format each line with fixed-width specs.</p>`,
      code: { lang: 'python', run: true, code: R`def temp_table(start, stop, step):
    """Return formatted Celsius→Fahrenheit lines, stop inclusive."""
    lines = []
    for c in range(start, stop + 1, step):
        f = c * 9 / 5 + 32                     # / gives float
        lines.append(f"{c:>5}°C = {f:>7.1f}°F")
    return lines

for line in temp_table(-10, 40, 10):
    print(line)
print(temp_table(37, 37, 1))   # ['   37°C =    98.6°F']` },
      dry: { head: ['c', 'f = c*9/5+32', 'line'], rows: [['-10', '14.0', '<code>␣␣-10°C = ␣␣␣14.0°F</code>'], ['0', '32.0', '<code>␣␣␣␣0°C = ␣␣␣32.0°F</code>'], ['10', '50.0', '<code>␣␣␣10°C = ␣␣␣50.0°F</code>']] },
      complexity: R`<p>O(k) for k = number of rows; each line is O(1).</p>`,
      followUps: ['Add a Kelvin column.', 'Accept float steps (hint: range only takes ints — loop with an integer counter).']
    }
  });

  practice.push({
    title: 'Predict the Output: The Division Family',
    level: 'Easy', tags: ['predict the output', 'floor division', 'modulo'], companies: ['Google', 'Microsoft'],
    statement: R`<p>Predict the single line printed:</p><pre>print(17 / 5, 17 // 5, 17 % 5, -17 // 5, -17 % 5, 17 // -5, 2 ** -2)</pre>`,
    constraints: R`CPython 3. Watch types (int vs float) and signs.`,
    example: R`<p>Output: ${H.c('g', '3.4 3 2 -4 3 -4 0.25')}<br>Why: <code>/</code> → float 3.4. <code>//</code> floors: 3, and −3.4 floors to <b>−4</b>. <code>%</code> follows the divisor's sign: <code>-17 % 5</code> = 3 because (−4)·5 + 3 = −17. <code>2 ** -2</code> = 1/4 → float.</p>`,
    brute: { why: R`<p>Assuming C/Java/JS semantics (truncate toward zero) predicts <code>-17 // 5 = -3</code> and <code>-17 % 5 = -2</code>. Python floors instead.</p>`, code: R`import math
# C-style truncation, for comparison (what other languages do):
print(math.trunc(-17 / 5), math.fmod(-17, 5))   # -3 -2.0
# Python's floor semantics:
print(-17 // 5, -17 % 5)                         # -4 3` },
    mcq: { q: 'What is <code>-17 % 5</code> in Python?', options: ['3', '-2', '2', '-3'], answer: 0, explain: 'Floor division gives -4, and -17 - (-4 × 5) = 3. The remainder takes the sign of the divisor (5).' },
    hints: [R`<p>Hint 1: <code>/</code> always returns a float, even <code>6 / 3</code> → 2.0.</p>`, R`<p>Hint 2: <code>a // b</code> = floor(a / b) — floor means "toward minus infinity", so −3.4 becomes −4.</p>`, R`<p>Hint 3: Check every pair with <code>a == (a // b) * b + a % b</code>. A negative exponent with <code>**</code> gives a float.</p>`],
    solution: {
      approach: R`<p>Apply floor semantics and the divmod identity to each term.</p>`,
      code: { lang: 'python', run: true, code: R`print(17 / 5, 17 // 5, 17 % 5, -17 // 5, -17 % 5, 17 // -5, 2 ** -2)
# 3.4 3 2 -4 3 -4 0.25
for a, b in [(17, 5), (-17, 5), (17, -5)]:
    q, r = divmod(a, b)
    print(a, b, q, r, q * b + r == a)   # identity always holds` },
      dry: { head: ['expression', 'exact value', 'Python result'], rows: [['17 / 5', '3.4', '3.4 (float)'], ['17 // 5', 'floor(3.4)', '3'], ['-17 // 5', 'floor(−3.4)', '<span class="c-y">-4</span>'], ['-17 % 5', '−17 − (−4·5)', '<span class="c-y">3</span>'], ['17 // -5', 'floor(−3.4)', '-4'], ['2 ** -2', '1/4', '0.25']] },
      complexity: R`<p>O(1): each operation works on small ints; even for huge ints divmod is linear in their size.</p>`,
      followUps: ['What is <code>17 % -5</code>? (−3)', 'How would you get C-style truncation in Python? (<code>int(a / b)</code> for small values, or <code>math.trunc</code>)']
    }
  });

  practice.push({
    title: 'Keep Zeros, Drop Blanks',
    level: 'Easy', tags: ['truthiness', 'None', 'list comprehension'], companies: ['Stripe', 'Razorpay'],
    statement: R`<p>A form returns values that may be <code>None</code> or <code>""</code> (blank). Write <code>clean(values)</code> that removes only <code>None</code> and empty/whitespace-only strings, but <b>keeps</b> legitimate falsy data like <code>0</code>, <code>0.0</code> and <code>False</code>.</p>`,
    constraints: R`0 ≤ len(values) ≤ 10<sup>5</sup>. Preserve order.`,
    example: R`<p>Input <code>[0, None, "", "  ", "Asha", False, 0.0, 42]</code><br>Output ${H.c('g', "[0, 'Asha', False, 0.0, 42]")}<br>Why: a truthiness filter (<code>if v</code>) would wrongly drop 0, False and 0.0.</p>`,
    brute: { why: R`<p><code>[v for v in values if v]</code> looks neat but removes every falsy value, including real zeros and False answers — a classic data-loss bug.</p>`, code: R`def clean_wrong(values):
    return [v for v in values if v]     # drops 0, False, 0.0 too

print(clean_wrong([0, None, "", "Asha", False]))   # ['Asha']  <- lost data` },
    mcq: { q: 'Which condition keeps 0 but drops None?', options: ['<code>v is not None</code>', '<code>v</code>', '<code>v != 0</code>', '<code>bool(v)</code>'], answer: 0, explain: 'Only an identity check against None separates "missing" from "zero". Truthiness treats both as falsy.' },
    hints: [R`<p>Hint 1: Decide what "missing" means precisely: <code>None</code>, or a string that is empty after <code>.strip()</code>.</p>`, R`<p>Hint 2: Write a helper <code>is_blank(v)</code>: <code>v is None or (isinstance(v, str) and not v.strip())</code>.</p>`, R`<p>Hint 3: Keep everything that is not blank with a list comprehension. Edge cases: empty list, all blanks, strings like <code>"0"</code> (keep — they are not blank).</p>`],
    solution: {
      approach: R`<p>Define blankness explicitly instead of relying on truthiness, then filter.</p>`,
      code: { lang: 'python', run: true, code: R`def is_blank(v):
    """None, or a str that is empty/whitespace only."""
    return v is None or (isinstance(v, str) and not v.strip())

def clean(values):
    return [v for v in values if not is_blank(v)]

print(clean([0, None, "", "  ", "Asha", False, 0.0, 42]))   # [0, 'Asha', False, 0.0, 42]
print(clean([]), clean([None, " "]), clean(["0"]))          # [] [] ['0']` },
      dry: { head: ['v', 'is None?', 'blank str?', 'kept?'], rows: [['0', 'no', 'not a str', '<span class="c-g">yes</span>'], ['None', '<span class="c-r">yes</span>', '—', 'no'], ['"  "', 'no', '<span class="c-r">yes</span>', 'no'], ['False', 'no', 'not a str', '<span class="c-g">yes</span>'], ['"Asha"', 'no', 'no', '<span class="c-g">yes</span>']] },
      complexity: R`<p>O(n·L) where L is the average string length (strip); O(n) extra for the output list.</p>`,
      followUps: ['Return how many values were dropped, too.', 'Treat the string "N/A" as blank — how do you keep the rule easy to extend?']
    }
  });

  /* =====================================================================
     PRACTICE — Medium
     ===================================================================== */
  practice.push({
    title: 'Predict the Output: Aliasing Gauntlet',
    level: 'Medium', tags: ['predict the output', 'aliasing', 'mutability'], companies: ['Meta', 'Bloomberg'],
    statement: R`<p>Predict both lines:</p><pre>a = [1, 2]
b = a
c = a[:]
a += [3]
b = b + [4]
c.append(5)
print(a, b, c)
print(a is b, a == c)</pre>`,
    constraints: R`CPython 3. Remember: <code>+=</code> on a list mutates; <code>+</code> builds a new list; <code>[:]</code> copies.`,
    example: R`<p>Output:<br>${H.c('g', '[1, 2, 3] [1, 2, 3, 4] [1, 2, 5]')}<br>${H.c('g', 'False False')}<br>Why: <code>a += [3]</code> extends the shared list (b sees it). <code>b = b + [4]</code> builds a <b>new</b> list and re-binds b only. <code>c</code> was an independent copy.</p>`,
    brute: { why: R`<p>Treating <code>a += x</code> as exactly <code>a = a + x</code> (true for ints, false for lists) predicts that b stays <code>[1, 2]</code>, giving <code>[1, 2, 3] [1, 2, 4] [1, 2, 5]</code>.</p>`, code: R`# Wrong assumption: "+= is just a = a + x" — true for ints, NOT for lists.
x = [1]
y = x
x = x + [2]      # new list: y unaffected
print(y)         # [1]
x = [1]
y = x
x += [2]         # in-place extend: y sees it
print(y)         # [1, 2]` },
    mcq: { q: 'Right after <code>a += [3]</code>, what is <code>b</code>?', options: ['[1, 2, 3]', '[1, 2]', '[3]', '[1, 2, 3, 4]'], answer: 0, explain: 'b and a are the same list; list.__iadd__ extends it in place.' },
    hints: [R`<p>Hint 1: Draw objects. After line 3 there are two lists: L1 = [1, 2] (named a and b) and L2 = [1, 2] (named c).</p>`, R`<p>Hint 2: <code>a += [3]</code> mutates L1. <code>b = b + [4]</code> creates L3 = L1 + [4] and moves only b.</p>`, R`<p>Hint 3: Final: a → L1 [1, 2, 3], b → L3 [1, 2, 3, 4], c → L2 [1, 2, 5]. Then compare identities and values.</p>`],
    solution: {
      approach: R`<p>Track list objects, not names. Mutations affect all aliases; re-binding affects one name.</p>`,
      code: { lang: 'python', run: true, code: R`a = [1, 2]
b = a          # alias
c = a[:]       # copy
a += [3]       # mutate shared list -> b sees it
b = b + [4]    # new list, re-bind b
c.append(5)    # mutate the copy only
print(a, b, c)            # [1, 2, 3] [1, 2, 3, 4] [1, 2, 5]
print(a is b, a == c)     # False False` },
      dry: { head: ['line', 'L1 (a)', 'b →', 'L2 (c)'], rows: [['b = a', '[1, 2]', 'L1', '—'], ['c = a[:]', '[1, 2]', 'L1', '[1, 2]'], ['a += [3]', '<span class="c-y">[1, 2, 3]</span>', 'L1', '[1, 2]'], ['b = b + [4]', '[1, 2, 3]', '<span class="c-g">L3 [1, 2, 3, 4]</span>', '[1, 2]'], ['c.append(5)', '[1, 2, 3]', 'L3', '<span class="c-y">[1, 2, 5]</span>']] },
      complexity: R`<p><code>+=</code> is amortised O(k) for k new items; <code>+</code> copies everything, O(n + k).</p>`,
      followUps: ['What does <code>t = ([1],); t[0] += [2]</code> do? (raises TypeError AND mutates the list)']
    }
  });

  practice.push({
    title: 'Duration Formatter',
    level: 'Medium', tags: ['divmod', 'f-strings', 'negative numbers'], companies: ['Uber', 'Zomato'],
    statement: R`<p>Write <code>fmt_duration(seconds)</code> returning <code>"Dd HH:MM:SS"</code> when there is at least one day, otherwise <code>"HH:MM:SS"</code>. Negative durations get a leading <code>-</code> (format the absolute value).</p>`,
    constraints: R`|seconds| ≤ 10<sup>12</sup> (int).`,
    example: R`<p><code>93784</code> → ${H.c('g', '"1d 02:03:04"')} (1 day + 2 h + 3 min + 4 s)<br><code>59</code> → ${H.c('g', '"00:00:59"')}<br><code>-3661</code> → ${H.c('g', '"-01:01:01"')}</p>`,
    brute: { why: R`<p>Chains of <code>//</code> and <code>%</code> with hard-coded constants (86400, 3600…) work but are easy to get wrong, and applying them directly to a <b>negative</b> number gives Python's floor results (<code>-1 // 60 == -1</code>, <code>-1 % 60 == 59</code>) — nonsense like <code>"-1:59:59"</code>.</p>`, code: R`def fmt_naive(s):
    h = s // 3600            # for s = -1 -> -1
    m = s % 3600 // 60       # 59
    sec = s % 60             # 59
    return f"{h}:{m:02d}:{sec:02d}"

print(fmt_naive(-1))         # -1:59:59  <- wrong, should be -00:00:01` },
    mcq: { q: 'Why take <code>abs(seconds)</code> before dividing?', options: ['Floor division of negatives rounds away from zero, scrambling the fields', 'Python cannot divide negative numbers', 'divmod rejects negatives', 'It is faster'], answer: 0, explain: 'divmod(-1, 60) == (-1, 59). Work with the magnitude, then add the sign as text.' },
    hints: [R`<p>Hint 1: Handle the sign first: <code>sign = "-" if seconds &lt; 0 else ""</code>, then work with <code>abs(seconds)</code>.</p>`, R`<p>Hint 2: Peel units with <code>divmod</code>: minutes, s = divmod(t, 60); hours, m = divmod(minutes, 60); days, h = divmod(hours, 24).</p>`, R`<p>Hint 3: Format with <code>:02d</code> for two-digit fields; include the day part only if days &gt; 0.</p>`],
    solution: {
      approach: R`<p>Sign as text, magnitude through a cascade of <code>divmod</code>s, zero-padded f-string.</p>`,
      code: { lang: 'python', run: true, code: R`def fmt_duration(seconds):
    sign = "-" if seconds < 0 else ""
    t = abs(seconds)
    minutes, s = divmod(t, 60)
    hours, m = divmod(minutes, 60)
    days, h = divmod(hours, 24)
    clock = f"{h:02d}:{m:02d}:{s:02d}"
    return f"{sign}{days}d {clock}" if days else f"{sign}{clock}"

for x in [93784, 59, -3661, 0, 86400, -1]:
    print(x, "->", fmt_duration(x))` },
      dry: { head: ['step', 't', 'divmod', 'fields'], rows: [['start', '93784', '—', 'sign ""'], ['by 60', '93784', '(1563, 4)', 's = 4'], ['by 60', '1563', '(26, 3)', 'm = 3'], ['by 24', '26', '(1, 2)', 'h = 2, days = 1'], ['format', '—', '—', '<span class="c-g">"1d 02:03:04"</span>']] },
      complexity: R`<p>O(1): three divmods and one format.</p>`,
      followUps: ['Parse the string back into seconds.', 'Pluralise: "1 day, 2 hours".']
    }
  });

  practice.push({
    title: 'Implement isclose()',
    level: 'Medium', tags: ['float', 'tolerance', 'nan/inf'], companies: ['Two Sigma', 'NVIDIA'],
    statement: R`<p>Implement <code>approx_equal(a, b, rel_tol=1e-9, abs_tol=0.0)</code> with the same rules as <code>math.isclose</code>: equal values are close; <code>inf</code> is close only to the same <code>inf</code>; <code>nan</code> is close to nothing; otherwise <code>|a − b| ≤ max(rel_tol · max(|a|, |b|), abs_tol)</code>.</p>`,
    constraints: R`rel_tol ≥ 0, abs_tol ≥ 0 (raise <code>ValueError</code> otherwise). Inputs are floats or ints.`,
    example: R`<p><code>approx_equal(0.1 + 0.2, 0.3)</code> → ${H.c('g', 'True')} · <code>approx_equal(1e-12, 0.0)</code> → ${H.c('r', 'False')} (relative tolerance is useless near 0) · with <code>abs_tol=1e-9</code> → ${H.c('g', 'True')} · <code>approx_equal(inf, inf)</code> → True · <code>approx_equal(nan, nan)</code> → False</p>`,
    brute: { why: R`<p>A fixed absolute epsilon (<code>abs(a - b) &lt; 1e-9</code>) is wrong at both ends of the scale: for 1e20 it demands impossible precision (neighbouring floats are ~16000 apart), and for 1e-15 values everything is "equal".</p>`, code: R`def approx_naive(a, b):
    return abs(a - b) < 1e-9

print(approx_naive(1e20, 1e20 + 16384))   # False, though they are adjacent floats
print(approx_naive(1e-15, 5e-15))         # True, though one is 5x the other` },
    mcq: { q: 'Why does <code>math.isclose(1e-12, 0.0)</code> return False by default?', options: ['Relative tolerance scales with the magnitude, and near 0 the allowed gap is ~0', 'Floats cannot represent 1e-12', 'isclose rejects zero', 'Because of NaN rules'], answer: 0, explain: 'rel_tol × max(|a|, |b|) = 1e-9 × 1e-12 = 1e-21 — tiny. Pass abs_tol when comparing to zero.' },
    hints: [R`<p>Hint 1: Handle special cases first: exact equality (covers equal infinities), then any infinity or NaN → False.</p>`, R`<p>Hint 2: The tolerance is the larger of a relative part (scaled by the bigger magnitude) and an absolute floor.</p>`, R`<p>Hint 3: Validate tolerances (negative → ValueError). Recipe: if a == b → True; if inf/nan involved → False; diff = |a−b|; return diff ≤ rel·max(|a|,|b|) or diff ≤ abs_tol.</p>`],
    solution: {
      approach: R`<p>Mirror CPython's algorithm: equality shortcut, non-finite guard, then the symmetric relative/absolute test.</p>`,
      code: { lang: 'python', run: true, code: R`import math

def approx_equal(a, b, rel_tol=1e-9, abs_tol=0.0):
    if rel_tol < 0 or abs_tol < 0:
        raise ValueError("tolerances must be non-negative")
    if a == b:                      # exact match, includes inf == inf
        return True
    if math.isinf(a) or math.isinf(b) or math.isnan(a) or math.isnan(b):
        return False                # different infinities, or any nan
    diff = abs(a - b)
    return diff <= abs(rel_tol * b) or diff <= abs(rel_tol * a) or diff <= abs_tol

inf, nan = float("inf"), float("nan")
cases = [(0.1 + 0.2, 0.3, 0.0), (1e-12, 0.0, 0.0), (1e-12, 0.0, 1e-9), (inf, inf, 0.0), (nan, nan, 0.0), (1e20, 1e20 + 16384, 0.0)]
for a, b, at in cases:
    mine = approx_equal(a, b, abs_tol=at)
    print(a, b, mine, mine == math.isclose(a, b, abs_tol=at))` },
      dry: { head: ['a, b', 'a == b?', 'non-finite?', 'diff vs tol', 'result'], rows: [['0.30000000000000004, 0.3', 'no', 'no', '5.6e-17 ≤ 3e-10', '<span class="c-g">True</span>'], ['1e-12, 0.0', 'no', 'no', '1e-12 &gt; 1e-21', '<span class="c-r">False</span>'], ['inf, inf', '<span class="c-g">yes</span>', '—', '—', 'True'], ['nan, nan', 'no', '<span class="c-r">yes</span>', '—', 'False']] },
      complexity: R`<p>O(1) time and space: a few comparisons and one subtraction.</p>`,
      followUps: ['Why is the test symmetric (uses both |a| and |b|)?', 'How does NumPy\'s <code>allclose</code> differ? (asymmetric: atol + rtol·|b|, default atol=1e-8)']
    }
  });

  practice.push({
    title: 'Tiny Calculator Without eval',
    level: 'Medium', tags: ['parsing', 'conversion', 'operators', 'errors'], companies: ['Atlassian', 'Intuit'],
    statement: R`<p>Write <code>calc(expr)</code> for strings of the form <code>"&lt;number&gt; &lt;op&gt; &lt;number&gt;"</code> separated by single spaces, where op is one of <code>+ - * / // % **</code>. Numbers may be negative and may be ints or floats. Return an int when both operands are ints (except for <code>/</code>), otherwise a float. Return the string <code>"error"</code> for division by zero or malformed input.</p>`,
    constraints: R`len(expr) ≤ 50. <code>eval</code>/<code>exec</code> are forbidden. Exponent results are capped: if the int exponent is &gt; 10<sup>4</sup>, return "error".`,
    example: R`<p><code>"7 // -2"</code> → ${H.c('g', '-4')} · <code>"2.5 * 4"</code> → ${H.c('g', '10.0')} · <code>"9 / 3"</code> → ${H.c('g', '3.0')} · <code>"1 / 0"</code> → ${H.c('r', '"error"')} · <code>"2 ^ 3"</code> → ${H.c('r', '"error"')}</p>`,
    brute: { why: R`<p><code>eval(expr)</code> "works" but executes arbitrary code — <code>__import__('os').system('rm -rf ~')</code> is a valid "expression". Never eval user input.</p>`, code: R`def calc_dangerous(expr):
    try:
        return eval(expr)          # NEVER do this with user input
    except ZeroDivisionError:
        return "error"

print(calc_dangerous("7 // -2"))   # -4, but at what cost?` },
    mcq: { q: 'Best way to map "+" to an operation without eval?', options: ['A dict from symbols to functions in the <code>operator</code> module', 'A long string of <code>exec</code> calls', '<code>int(op)</code>', 'Regular expressions only'], answer: 0, explain: '<code>{"+": operator.add, "//": operator.floordiv, ...}</code> gives an O(1), safe dispatch table.' },
    hints: [R`<p>Hint 1: <code>expr.split(" ")</code> should give exactly 3 tokens; anything else is malformed.</p>`, R`<p>Hint 2: Parse each number with "try int, then float" (EAFP); keep the parsed values' types so int op int stays int.</p>`, R`<p>Hint 3: Dispatch with <code>import operator</code>: add, sub, mul, truediv, floordiv, mod, pow. Catch <code>ZeroDivisionError</code>; guard huge exponents before calling pow.</p>`],
    solution: {
      approach: R`<p>Tokenise, convert numbers safely, look up the operator in a dict of functions, and translate failures into "error".</p>`,
      code: { lang: 'python', run: true, code: R`import operator

OPS = {"+": operator.add, "-": operator.sub, "*": operator.mul, "/": operator.truediv,
       "//": operator.floordiv, "%": operator.mod, "**": operator.pow}

def parse_num(tok):
    try:
        return int(tok)
    except ValueError:
        return float(tok)          # may raise ValueError -> handled by caller

def calc(expr):
    parts = expr.split(" ")
    if len(parts) != 3 or parts[1] not in OPS:
        return "error"
    try:
        a, b = parse_num(parts[0]), parse_num(parts[2])
    except ValueError:
        return "error"
    if parts[1] == "**" and isinstance(b, int) and abs(b) > 10_000:
        return "error"             # keep results reasonable
    try:
        return OPS[parts[1]](a, b)
    except (ZeroDivisionError, OverflowError):
        return "error"

for e in ["7 // -2", "2.5 * 4", "9 / 3", "-7 % 3", "2 ** 10", "1 / 0", "2 ^ 3", "a + 1"]:
    print(f"{e!r:>10} -> {calc(e)!r}")` },
      dry: { head: ['expr', 'tokens', 'a, b', 'op', 'result'], rows: [['"7 // -2"', '["7","//","-2"]', '7, -2 (ints)', 'floordiv', '-4'], ['"2.5 * 4"', '["2.5","*","4"]', '2.5, 4', 'mul', '10.0'], ['"1 / 0"', '["1","/","0"]', '1, 0', 'truediv', '<span class="c-r">ZeroDivisionError → "error"</span>'], ['"2 ^ 3"', '["2","^","3"]', '—', 'not in OPS', '<span class="c-r">"error"</span>']] },
      complexity: R`<p>O(L) to split and parse a string of length L; the operation itself is O(1) for normal sizes.</p>`,
      followUps: ['Support full expressions with precedence (shunting-yard or recursive descent).', 'Use <code>ast.literal_eval</code> for safe literal parsing — why can it not evaluate <code>1 + 2</code> in general?']
    }
  });

  practice.push({
    title: 'Predict the Output: and / or Side Effects',
    level: 'Medium', tags: ['predict the output', 'short-circuit', 'truthiness'], companies: ['Google', 'Adobe'],
    statement: R`<p>Predict every printed line, in order:</p><pre>def f(x):
    print("f", x)
    return x

print(f(0) or f(2) and f(3))
print(f(1) and f(0) or f(4))</pre>`,
    constraints: R`CPython 3. <code>and</code> binds tighter than <code>or</code>; evaluation is left to right with short-circuiting.`,
    example: R`<p>Output (8 lines):</p><pre>f 0
f 2
f 3
3
f 1
f 0
f 4
4</pre><p>Why: line 1 is <code>f(0) or (f(2) and f(3))</code>: 0 is falsy so the right group runs; 2 is truthy so <code>and</code> evaluates and returns 3. Line 2 is <code>(f(1) and f(0)) or f(4)</code>: 1 truthy → f(0) → 0 falsy → <code>or</code> runs f(4).</p>`,
    brute: { why: R`<p>Thinking <code>and</code>/<code>or</code> return booleans predicts <code>True</code> lines; thinking they evaluate everything predicts extra calls; forgetting precedence groups line 1 as <code>(f(0) or f(2)) and f(3)</code> (which happens to call the same functions but for different reasons — try <code>f(5) or f(2) and f(3)</code> to see the difference).</p>`, code: R`def f(x):
    print("f", x)
    return x

# Precedence matters: these two are NOT the same
print(f(5) or f(2) and f(3))     # f 5 -> 5   (right group skipped)
print((f(5) or f(2)) and f(3))   # f 5, f 3 -> 3` },
    mcq: { q: 'What does <code>f(0) or f(2) and f(3)</code> return?', options: ['3', 'True', '2', '0'], answer: 0, explain: 'Parsed as f(0) or (f(2) and f(3)). 0 is falsy → evaluate the and-group → 2 truthy → returns f(3) = 3.' },
    hints: [R`<p>Hint 1: Add brackets according to precedence first: <code>and</code> groups before <code>or</code>.</p>`, R`<p>Hint 2: <code>or</code> returns the first truthy operand (or the last one); <code>and</code> returns the first falsy operand (or the last one).</p>`, R`<p>Hint 3: Every call prints when it actually runs. Skipped operands print nothing. Then the final value is printed by the outer <code>print</code>.</p>`],
    solution: {
      approach: R`<p>Bracket by precedence, then walk left to right, applying short-circuit rules and recording each call.</p>`,
      code: { lang: 'python', run: true, code: R`def f(x):
    print("f", x)
    return x

print(f(0) or f(2) and f(3))   # f 0, f 2, f 3, then 3
print(f(1) and f(0) or f(4))   # f 1, f 0, f 4, then 4` },
      dry: { head: ['expression', 'calls made', 'value'], rows: [['f(0) or (f(2) and f(3))', 'f 0 (falsy) → f 2 (truthy) → f 3', '<span class="c-g">3</span>'], ['(f(1) and f(0)) or f(4)', 'f 1 (truthy) → f 0 (falsy) → f 4', '<span class="c-g">4</span>']] },
      complexity: R`<p>O(number of operands evaluated) — short-circuiting can skip work, which is why expensive checks go last.</p>`,
      followUps: ['Rewrite line 1 with an if/else statement that behaves identically.', 'Why can\'t you overload <code>and</code> in a class?']
    }
  });

  practice.push({
    title: 'Integer to Any Base',
    level: 'Medium', tags: ['divmod', 'big integers', 'strings'], companies: ['Microsoft', 'Oracle'],
    statement: R`<p>Write <code>to_base(n, base)</code> that converts an int to a string in base 2–36 using digits <code>0-9a-z</code>, <b>without</b> <code>bin/oct/hex/format/str</code> on the number. Handle 0 and negatives (<code>-</code> prefix). It must work for huge ints like <code>2 ** 200</code>.</p>`,
    constraints: R`2 ≤ base ≤ 36; |n| may have hundreds of digits.`,
    example: R`<p><code>to_base(255, 16)</code> → ${H.c('g', '"ff"')} · <code>to_base(-10, 2)</code> → ${H.c('g', '"-1010"')} · <code>to_base(0, 7)</code> → ${H.c('g', '"0"')} · <code>to_base(35, 36)</code> → ${H.c('g', '"z"')}</p>`,
    brute: { why: R`<p>Building the result by prepending to a string inside the loop (<code>s = d + s</code>) copies the string every step — O(k²) for k digits. Also, using <code>%</code> and <code>//</code> directly on a negative n produces wrong digits because of floor semantics.</p>`, code: R`DIG = "0123456789abcdefghijklmnopqrstuvwxyz"

def to_base_slow(n, base):
    s = ""
    while n > 0:                 # BUG: returns "" for 0 and for negatives
        s = DIG[n % base] + s    # O(k) copy each time -> O(k^2)
        n //= base
    return s

print(repr(to_base_slow(0, 2)), to_base_slow(255, 16))   # '' ff` },
    mcq: { q: 'Why convert <code>abs(n)</code> and add "-" separately?', options: ['Floor division/modulo on negatives give digits for a different representation', 'Python cannot divide negatives', 'Because base 36 has no minus', 'It is required by PEP 8'], answer: 0, explain: '-10 % 2 == 0 and -10 // 2 == -5, -5 % 2 == 1, -5 // 2 == -3 … the loop never reaches 0 cleanly. Work on the magnitude.' },
    hints: [R`<p>Hint 1: Repeated <code>divmod(n, base)</code> yields digits from least significant to most significant.</p>`, R`<p>Hint 2: Append digits to a list and reverse once at the end, then <code>"".join</code> — O(k) total.</p>`, R`<p>Hint 3: Special-case 0 → "0". Validate base. Recipe: sign → abs → loop divmod → map digit via a 36-char string → reverse → join.</p>`],
    solution: {
      approach: R`<p>Peel digits with divmod on the magnitude, collect in a list, reverse and join; prepend the sign.</p>`,
      code: { lang: 'python', run: true, code: R`DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz"

def to_base(n, base):
    if not 2 <= base <= 36:
        raise ValueError("base must be in 2..36")
    if n == 0:
        return "0"
    sign = "-" if n < 0 else ""
    n = abs(n)
    out = []
    while n:
        n, d = divmod(n, base)   # least significant digit first
        out.append(DIGITS[d])
    return sign + "".join(reversed(out))

print(to_base(255, 16), to_base(-10, 2), to_base(0, 7), to_base(35, 36))
big = 2 ** 200
print(to_base(big, 16) == format(big, "x"))   # True — verified against the built-in
print(int(to_base(big, 36), 36) == big)       # True — round trip` },
      dry: { head: ['n', 'divmod(n, 16)', 'digit', 'out'], rows: [['255', '(15, 15)', 'f', '[f]'], ['15', '(0, 15)', 'f', '[f, f]'], ['0', 'stop', '—', 'reverse → <span class="c-g">"ff"</span>']] },
      complexity: R`<p>k = number of output digits. k divmods; for huge n each divmod is O(size of n), so O(k · size) overall (quadratic for gigantic ints, like <code>str()</code>). Space O(k).</p>`,
      followUps: ['Parse the string back without <code>int(s, base)</code>.', 'Support base −2 (negabinary).']
    }
  });

  /* =====================================================================
     PRACTICE — Hard
     ===================================================================== */
  practice.push({
    title: 'Fair Bill Split to the Cent',
    level: 'Hard', tags: ['Decimal', 'integer cents', 'divmod', 'rounding'], companies: ['Splitwise', 'PayPal', 'Stripe'],
    statement: R`<p>Write <code>split_bill(total, people, tip_percent)</code>. <code>total</code> is a string like <code>"100.00"</code>; add a tip of <code>tip_percent</code>% rounded <b>half-up</b> to the cent; then split among <code>people</code> so that the shares are whole cents, differ by at most one cent, the <b>first</b> people pay the extra cents, and the shares add up <b>exactly</b> to the grand total. Return the shares as strings with 2 decimals.</p>`,
    constraints: R`total has at most 2 decimals, 0 ≤ total ≤ 10<sup>9</sup>; 1 ≤ people ≤ 1000; 0 ≤ tip_percent ≤ 100 (may be a string like "12.5"). No floats anywhere.`,
    example: R`<p><code>split_bill("100.00", 3, "10")</code>: tip = 10.00 → grand total 110.00 = 11000 cents; <code>divmod(11000, 3) = (3666, 2)</code> → ${H.c('g', "['36.67', '36.67', '36.66']")} — sums to exactly 110.00.<br><code>split_bill("10.01", 2, "12.5")</code>: tip 1.25125 → 1.25 → 11.26 → ${H.c('g', "['5.63', '5.63']")}.</p>`,
    brute: { why: R`<p>Float maths (<code>round(total * 1.1 / 3, 2)</code> for everyone) produces shares like 36.67 × 3 = 110.01 — a cent appears from nowhere — and float rounding of values like 2.675 goes the "wrong" way.</p>`, code: R`def split_float(total, people, tip_percent):
    grand = float(total) * (1 + float(tip_percent) / 100)
    share = round(grand / people, 2)
    return [share] * people

shares = split_float("100.00", 3, "10")
print(shares, sum(shares))   # [36.67, 36.67, 36.67] 110.01  <- a cent too much` },
    mcq: { q: 'After converting the grand total to integer cents C, how do you split among n people?', options: ['<code>q, r = divmod(C, n)</code>; r people pay q + 1, the rest pay q', 'Everyone pays <code>round(C / n)</code>', 'Everyone pays <code>C // n</code>', 'Everyone pays <code>C / n</code> as a float'], answer: 0, explain: 'divmod distributes the remainder cents exactly; q·n + r == C always holds, so the shares sum to the total.' },
    hints: [R`<p>Hint 1: Do money in <b>Decimal built from strings</b> (or integer cents). Floats cannot represent most cent values exactly.</p>`, R`<p>Hint 2: Tip: <code>(total * Decimal(tip) / 100).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)</code>. Then convert the grand total to cents: <code>int(grand * 100)</code> (exact because it has 2 decimals).</p>`, R`<p>Hint 3: <code>q, r = divmod(cents, people)</code>; shares = [q + 1] × r + [q] × (people − r). Format cents as <code>f"{c // 100}.{c % 100:02d}"</code>. Assert the sum equals the grand total.</p>`],
    solution: {
      approach: R`<p>Exact decimal tip with an explicit rounding rule, convert to integer cents, distribute the remainder with divmod, format back to strings.</p>`,
      code: { lang: 'python', run: true, code: R`from decimal import Decimal, ROUND_HALF_UP

CENT = Decimal("0.01")

def split_bill(total, people, tip_percent):
    if people < 1:
        raise ValueError("need at least one person")
    base = Decimal(total)                                  # exact from string
    tip = (base * Decimal(str(tip_percent)) / 100).quantize(CENT, rounding=ROUND_HALF_UP)
    grand = (base + tip).quantize(CENT)
    cents = int(grand * 100)                               # exact: 2 decimals
    q, r = divmod(cents, people)
    shares = [q + 1] * r + [q] * (people - r)              # first r pay 1 cent more
    assert sum(shares) == cents                            # nothing lost or created
    return [f"{c // 100}.{c % 100:02d}" for c in shares]

print(split_bill("100.00", 3, "10"))     # ['36.67', '36.67', '36.66']
print(split_bill("10.01", 2, "12.5"))    # ['5.63', '5.63']
print(split_bill("0.05", 3, 0))          # ['0.02', '0.02', '0.01']
print(split_bill("999999999.99", 7, "18"))` },
      dry: { head: ['step', 'value'], rows: [['base', 'Decimal("100.00")'], ['tip', '100.00 × 10 / 100 = 10.00 (half-up)'], ['grand → cents', '110.00 → 11000'], ['divmod(11000, 3)', '(3666, 2)'], ['shares', '[3667, 3667, 3666] → <span class="c-g">36.67, 36.67, 36.66</span>']] },
      complexity: R`<p>O(n) for n people (building the list); Decimal operations are O(1) for these sizes.</p>`,
      followUps: ['Split by weights (e.g. 2:1:1) with the largest-remainder method.', 'Support currencies with 0 or 3 decimal places (JPY, KWD).']
    }
  });

  practice.push({
    title: 'Predict the Output: Interview Gauntlet',
    level: 'Hard', tags: ['predict the output', 'precedence', 'bool/int', 'rounding', 'None'], companies: ['Google', 'Amazon', 'Meta'],
    statement: R`<p>Predict all six lines exactly:</p><pre>print(-2 ** 2, 2 ** 3 ** 2)
print(1 == 1.0 == True, {1: 'a', 1.0: 'b', True: 'c'})
print(round(0.5), round(1.5), round(2.5))
print(0.1 * 3 == 0.3, 0.5 * 3 == 1.5)
print(int(-3.7), -7 // 2, int(-7 / 2))
x = None
print(x is None, not x, x == False)</pre>`,
    constraints: R`CPython 3.8+. Every line has at least one trap.`,
    example: R`<pre>-4 512
True {1: 'c'}
0 2 2
False True
-3 -4 -3
True True False</pre><p>Why (short): ** beats unary minus and is right-associative; 1, 1.0 and True are equal with equal hashes, so the dict keeps the <b>first key</b> and the <b>last value</b>; round() goes half-to-even; 0.1 is inexact but 0.5 is exact in binary; int() truncates while // floors; None is falsy but not equal to False.</p>`,
    brute: { why: R`<p>Guessing from maths class or another language gives: <code>4 64</code>, a 3-key dict, <code>1 2 3</code>, <code>True True</code>, <code>-4 -4 -4</code> (or <code>-3 -3 -3</code>), and <code>True True True</code>. Each of those is a specific misconception worth naming in an interview.</p>`, code: R`# Check each trap in isolation
print(-(2 ** 2), (-2) ** 2)          # -4 4   precedence decides
print(2 ** (3 ** 2), (2 ** 3) ** 2)  # 512 64 right-to-left
print(hash(1) == hash(1.0) == hash(True))   # True -> same dict slot
print(round(2.5), round(3.5))        # 2 4    banker's rounding
print((0.1).as_integer_ratio())      # not exactly 1/10
print(None == False, bool(None))     # False False` },
    mcq: { q: 'Why does the dict print as <code>{1: \'c\'}</code>?', options: ['1, 1.0 and True are equal and hash equally, so later assignments overwrite the value but keep the original key object', 'Dicts keep only the last key typed', 'True is converted to 1 by the parser', 'It is a syntax error in newer Pythons'], answer: 0, explain: 'Each later "key" finds the existing equal key; the value is replaced, the stored key (the int 1) stays.' },
    hints: [R`<p>Hint 1: Lines 1 and 5 are about <b>precedence</b> and <b>rounding direction</b>: ** binds tighter than unary minus; <code>int()</code> truncates toward 0, <code>//</code> floors toward −∞.</p>`, R`<p>Hint 2: Lines 2 and 6 are about <b>equality vs identity vs truthiness</b>: bool is an int subclass; None is only equal to None.</p>`, R`<p>Hint 3: Lines 3 and 4 are about <b>floats</b>: exact halves round to the even neighbour; 0.5 is a power of two (exact), 0.1 is not.</p>`],
    solution: {
      approach: R`<p>Resolve each trap with its rule; the code below prints the real output so you can check yourself.</p>`,
      code: { lang: 'python', run: true, code: R`print(-2 ** 2, 2 ** 3 ** 2)                      # -4 512
print(1 == 1.0 == True, {1: 'a', 1.0: 'b', True: 'c'})   # True {1: 'c'}
print(round(0.5), round(1.5), round(2.5))         # 0 2 2
print(0.1 * 3 == 0.3, 0.5 * 3 == 1.5)             # False True
print(int(-3.7), -7 // 2, int(-7 / 2))            # -3 -4 -3
x = None
print(x is None, not x, x == False)               # True True False` },
      dry: { head: ['line', 'trap', 'output'], rows: [['1', '** before unary −; right-assoc', '-4 512'], ['2', 'equal + equal hashes → one key', "True {1: 'c'}"], ['3', 'half to even', '0 2 2'], ['4', '0.1 inexact, 0.5 exact', 'False True'], ['5', 'truncate vs floor', '-3 -4 -3'], ['6', 'falsy ≠ equal to False', 'True True False']] },
      complexity: R`<p>O(1) — this is about semantics, not speed.</p>`,
      followUps: ['What does <code>{0: "a", False: "b", 0.0: "c"}</code> print?', 'Why does <code>round(2.675, 2)</code> give 2.67?']
    }
  });

  practice.push({
    title: 'Facts About 2^N Without Building It',
    level: 'Hard', tags: ['big integers', 'modular exponentiation', 'logarithms', 'Decimal'], companies: ['Jane Street', 'Citadel', 'Google'],
    statement: R`<p>For huge N, building <code>2 ** N</code> is too slow (N = 10<sup>18</sup> would need ~10<sup>17</sup> bytes). Write <code>power_facts(N, k)</code> returning <code>(digit_count, first_k_digits, last_k_digits)</code> of 2<sup>N</sup> as <code>(int, str, str)</code> — last digits zero-padded to length k when the number has at least k digits.</p>`,
    constraints: R`1 ≤ N ≤ 10<sup>18</sup>, 1 ≤ k ≤ 15. Must run in well under a second. Verify against the exact value for small N.`,
    example: R`<p><code>power_facts(10, 3)</code> → ${H.c('g', "(4, '102', '024')")} because 2<sup>10</sup> = 1024.<br><code>power_facts(1000, 5)</code> → ${H.c('g', "(302, '10715', '69376')")}.<br>Why: digits = ⌊N·log₁₀2⌋ + 1; leading digits come from the <b>fractional part</b> of N·log₁₀2; trailing digits are 2<sup>N</sup> mod 10<sup>k</sup>.</p>`,
    brute: { why: R`<p><code>s = str(2 ** N)</code> is exact but costs O(N) memory and quadratic conversion time; it also hits the 4300-digit str-conversion limit as soon as N &gt; ~14,000.</p>`, code: R`def power_facts_brute(N, k):
    s = str(2 ** N)            # huge for big N; ValueError past 4300 digits
    return len(s), s[:k], s[-k:]

print(power_facts_brute(1000, 5))   # (302, '10715', '69376')` },
    mcq: { q: 'Which gives the last 6 digits of 2<sup>10<sup>18</sup></sup> instantly?', options: ['<code>pow(2, 10**18, 10**6)</code>', '<code>str(2 ** 10**18)[-6:]</code>', '<code>(2 ** 10**18) % 10**6</code>', '<code>int(2.0 ** 1e18) % 10**6</code>'], answer: 0, explain: 'Three-argument pow reduces modulo 10^6 after every squaring: ~60 multiplications of tiny numbers. The others build (or overflow) the giant number.' },
    hints: [R`<p>Hint 1: A number x has ⌊log₁₀ x⌋ + 1 digits, and log₁₀(2<sup>N</sup>) = N·log₁₀2. No need to build 2<sup>N</sup>.</p>`, R`<p>Hint 2: Write N·log₁₀2 = I + f (integer + fraction). Then 2<sup>N</sup> = 10<sup>I</sup> · 10<sup>f</sup>, so the leading digits are those of 10<sup>f</sup>. With N up to 10<sup>18</sup>, a float has too few digits — use <code>Decimal</code> with ~60 digits of precision.</p>`, R`<p>Hint 3: Trailing digits: <code>pow(2, N, 10**k)</code>, zero-padded with <code>:0{k}d</code>. Leading k digits: <code>int(10 ** (f + k - 1))</code>. Validate against <code>str(2**N)</code> for N ≤ 2000.</p>`],
    solution: {
      approach: R`<p>Logarithms (in high-precision Decimal) for the size and the leading digits; modular exponentiation for the trailing digits.</p>`,
      code: { lang: 'python', run: true, code: R`from decimal import Decimal, localcontext

def power_facts(N, k):
    """(digit count, first k digits, last k digits) of 2**N without computing 2**N."""
    with localcontext() as ctx:
        ctx.prec = 60                              # plenty for N up to 1e18
        L = Decimal(2).log10() * N                 # log10(2**N)
        whole = int(L)                             # floor, L > 0
        digits = whole + 1
        frac = L - whole
        first = int(Decimal(10) ** (frac + k - 1)) # leading k digits
    if digits < k:                                 # tiny numbers: use exact value
        s = str(2 ** N)
        return digits, s, s
    last = pow(2, N, 10 ** k)                      # trailing k digits
    return digits, str(first), f"{last:0{k}d}"

print(power_facts(10, 3))        # (4, '102', '024')
print(power_facts(1000, 5))      # (302, '10715', '69376')
print(power_facts(10 ** 18, 8))  # instant

# verify against the exact big int for many small N
ok = all(power_facts(n, 4) == (len(str(2 ** n)), str(2 ** n)[:4], str(2 ** n)[-4:])
         for n in range(14, 2000))
print("verified:", ok)` },
      dry: { head: ['N = 1000', 'value'], rows: [['L = N·log₁₀2', '301.0299956639811952…'], ['digits', '⌊301.03⌋ + 1 = <span class="c-g">302</span>'], ['f', '0.0299956639811952…'], ['10^(f+4)', '10715.08… → <span class="c-g">"10715"</span>'], ['pow(2, 1000, 10^5)', '<span class="c-g">69376</span>']] },
      complexity: R`<p>Decimal log and power: O(p²)-ish in the precision p (fixed 60) → effectively constant. <code>pow(2, N, 10**k)</code>: O(log N) multiplications of k-digit numbers. Memory O(1). Compare: building 2<sup>N</sup> is O(N) memory.</p>`,
      followUps: ['When could the floor of N·log₁₀2 be wrong with too little precision?', 'Find the first N for which 2<sup>N</sup> starts with "2026".']
    }
  });

  practice.push({
    title: 'Float Anatomy: Exact Value of Any Float',
    level: 'Hard', tags: ['IEEE-754', 'math.frexp', 'exact arithmetic', 'Fraction'], companies: ['Bloomberg', 'Qualcomm', 'Apple'],
    statement: R`<p>Write <code>exact_decimal(x)</code> that returns the <b>exact</b> decimal expansion of a finite float as a string (what <code>Decimal(x)</code> prints), using only <code>math.frexp</code> and integer arithmetic. Also return <code>(numerator, denominator)</code> in lowest terms, which must match <code>x.as_integer_ratio()</code>.</p>`,
    constraints: R`x is finite (raise ValueError for inf/nan). Do not use <code>decimal</code>, <code>fractions</code> or <code>as_integer_ratio</code> inside the solution (only to verify).`,
    example: R`<p><code>exact_decimal(0.1)</code> → ${H.c('g', "('0.1000000000000000055511151231257827021181583404541015625', (3602879701896397, 36028797018963968))")}<br><code>exact_decimal(0.5)</code> → ${H.c('g', "('0.5', (1, 2))")}<br>Why: every finite float is m × 2<sup>e</sup> with an integer m — a fraction whose denominator is a power of 2, so its decimal expansion always terminates.</p>`,
    brute: { why: R`<p><code>f"{x:.60f}"</code> pads with zeros and still has a fixed length (wrong for numbers needing more digits, like 5e-324 with 751 significant digits). Repeated multiply-by-10 on the float itself accumulates new rounding errors with every step.</p>`, code: R`x = 0.1
print(f"{x:.60f}")   # looks exact but the length is arbitrary
digits = []
y = x
for _ in range(20):          # multiplying a float by 10 rounds every time
    y *= 10
    d = int(y)
    digits.append(str(d))
    y -= d
print("0." + "".join(digits))   # drifts away from the true expansion` },
    mcq: { q: 'Why does the decimal expansion of every finite float terminate?', options: ['It equals m / 2<sup>k</sup>, and 1/2<sup>k</sup> = 5<sup>k</sup> / 10<sup>k</sup> terminates', 'Python truncates it to 17 digits', 'Floats store decimal digits internally', 'It does not always terminate'], answer: 0, explain: 'Multiply numerator and denominator by 5^k: m·5^k / 10^k — an integer shifted k decimal places.' },
    hints: [R`<p>Hint 1: <code>math.frexp(x)</code> returns <code>(f, e)</code> with x = f × 2<sup>e</sup> and 0.5 ≤ |f| &lt; 1. Scale f by 2<sup>53</sup> to get an exact integer mantissa m = int(f × 2<sup>53</sup>), exponent e − 53.</p>`, R`<p>Hint 2: If the exponent E ≥ 0, x = m × 2<sup>E</sup> (an integer). Otherwise x = m / 2<sup>−E</sup>: reduce by stripping common factors of 2 (while m is even and the power &gt; 0), then the decimal digits are m × 5<sup>k</sup> shifted k places.</p>`, R`<p>Hint 3: Handle sign separately, strip trailing zeros of the fractional part, and verify with <code>Decimal(x)</code> and <code>x.as_integer_ratio()</code> for many random floats.</p>`],
    solution: {
      approach: R`<p>Decompose into an integer mantissa and binary exponent with <code>frexp</code>; reduce the fraction; convert 1/2<sup>k</sup> to 5<sup>k</sup>/10<sup>k</sup> to print exactly.</p>`,
      code: { lang: 'python', run: true, code: R`import math, random
from decimal import Decimal      # only for verification below

def exact_decimal(x):
    if not math.isfinite(x):
        raise ValueError("finite floats only")
    if x == 0:
        return ("-0" if math.copysign(1, x) < 0 else "0"), (0, 1)
    sign = "-" if x < 0 else ""
    f, e = math.frexp(abs(x))           # abs(x) = f * 2**e, 0.5 <= f < 1
    m, E = int(f * 2 ** 53), e - 53      # exact: f has at most 53 significant bits
    while m % 2 == 0 and E < 0:          # reduce m / 2**-E to lowest terms
        m //= 2
        E += 1
    if E >= 0:
        n = m << E
        return sign + str(n), (int(sign + "1") * n, 1)
    k = -E                               # x = m / 2**k = m * 5**k / 10**k
    digits = str(m * 5 ** k).rjust(k + 1, "0")
    text = digits[:-k] + "." + digits[-k:]
    return sign + text, (int(sign + "1") * m, 2 ** k)

print(exact_decimal(0.1))
print(exact_decimal(0.5), exact_decimal(-2.5), exact_decimal(1e22)[0])

random.seed(7)
ok = True
for _ in range(2000):
    x = random.uniform(-1e6, 1e6) * random.choice([1, 1e-200, 1e200])
    text, ratio = exact_decimal(x)
    ok &= (Decimal(text) == Decimal(x)) and ratio == x.as_integer_ratio()
print("verified:", ok)` },
      dry: { head: ['step', 'x = 0.1'], rows: [['frexp', 'f = 0.8, e = −3'], ['m, E', 'm = 0.8 × 2⁵³ = 7205759403792794, E = −56'], ['reduce', 'm even → m = 3602879701896397, E = −55'], ['k = 55', 'digits = m × 5⁵⁵ (55 decimal places)'], ['result', '<span class="c-g">0.1000000000000000055511151231257827…</span>']] },
      complexity: R`<p>The mantissa has ≤ 53 bits; k ≤ 1074 for subnormals, so m·5<sup>k</sup> has at most ~770 digits — O(k²) big-int work in the worst case, microseconds in practice.</p>`,
      followUps: ['Print the float\'s IEEE-754 bit fields using <code>struct.pack(">d", x)</code>.', 'Find the next float after x (<code>math.nextafter</code>) and the gap between them (<code>math.ulp</code>).']
    }
  });

  /* =====================================================================
     QUIZ
     ===================================================================== */
  quiz.push(
    { q: 'You type <code>&gt;&gt;&gt; "hi"</code> in the REPL. What appears?', options: ["<code>'hi'</code> (with quotes)", '<code>hi</code>', 'Nothing', '<code>None</code>'], answer: 0, explain: 'The REPL echoes <code>repr()</code> of expression results; repr of a string includes quotes. <code>print("hi")</code> would show hi.' },
    { q: 'What does <code>python3 script.py</code> do with a line that is just <code>2 + 3</code>?', options: ['Computes 5 and discards it — nothing is shown', 'Prints 5', 'Raises SyntaxError', 'Stores it in <code>_</code>'], answer: 0, explain: 'Auto-echo is a REPL feature. In scripts only print() (or other output calls) write to the screen.' },
    { q: 'After <code>a = [1]; b = a; a = a + [2]</code>, what is <code>b</code>?', options: ['[1]', '[1, 2]', '[2]', 'NameError'], answer: 0, explain: '<code>a + [2]</code> builds a new list and re-binds only a. b still points at the original [1].' },
    { q: 'After <code>a = [1]; b = a; a += [2]</code>, what is <code>b</code>?', options: ['[1, 2]', '[1]', '[2]', '[[1], [2]]'], answer: 0, explain: 'For lists, += calls __iadd__, which extends the same object in place, so the alias b sees it.' },
    { q: 'Which is the idiomatic way to test for None?', options: ['<code>if x is None:</code>', '<code>if x == None:</code>', '<code>if not x:</code>', '<code>if type(x) == None:</code>'], answer: 0, explain: 'None is a singleton, so identity is exact and cannot be fooled by a custom __eq__. <code>not x</code> also catches 0, "" and [].' },
    { q: 'What is <code>True + True + False</code>?', options: ['2', 'True', 'TypeError', '"TrueTrueFalse"'], answer: 0, explain: 'bool is a subclass of int: True == 1, False == 0.' },
    { q: 'Python is described as…', options: ['dynamically and strongly typed', 'statically and strongly typed', 'dynamically and weakly typed', 'statically and weakly typed'], answer: 0, explain: 'Names can be re-bound to any type (dynamic), but objects refuse implicit conversions like "3" + 3 (strong).' },
    { q: '<code>x = input("n: ")</code> and the user types 5. What is <code>x * 2</code>?', options: ["<code>'55'</code>", '<code>10</code>', '<code>TypeError</code>', '<code>5.0</code>'], answer: 0, explain: 'input() always returns str; str * int repeats the string. Convert with int(x) first.' },
    { q: 'What does <code>f"{3.14159:8.2f}|"</code> produce?', options: ['<code>"␣␣␣␣3.14|"</code>', '<code>"3.14␣␣␣␣|"</code>', '<code>"3.14|"</code>', '<code>"00003.14|"</code>'], answer: 0, explain: 'Width 8, precision 2, type f; numbers align right by default, padding with spaces (␣).' },
    { q: 'What is <code>-7 // 2</code> in Python?', options: ['-4', '-3', '-3.5', '3'], answer: 0, explain: '// floors toward minus infinity: −3.5 → −4. (C/Java would truncate to −3.)' },
    { q: 'What does <code>"" or 0 or None</code> evaluate to?', options: ['None', 'False', '""', '0'], answer: 0, explain: 'or returns the first truthy operand, or the last operand if none are truthy — here None.' },
    { q: 'Which statement about Python ints is true?', options: ['They never overflow; they grow in 30-bit chunks', 'They overflow at 2<sup>63</sup> − 1', 'They become floats when large', 'They are limited to 4300 digits in arithmetic'], answer: 0, explain: 'Arithmetic is unlimited. The 4300-digit limit applies only to int ↔ decimal-string conversion.' },
    { q: 'Which correctly creates an exact 0.1?', options: ['<code>Decimal("0.1")</code>', '<code>Decimal(0.1)</code>', '<code>float("0.1")</code>', '<code>round(0.1, 1)</code>'], answer: 0, explain: 'Decimal(0.1) copies the float\'s binary error (0.1000000000000000055…). Build Decimals from strings.' },
    { q: 'What is <code>round(2.5)</code>?', options: ['2', '3', '2.0', '2.5'], answer: 0, explain: 'Python rounds exact halves to the even neighbour (banker\'s rounding) to avoid statistical bias.' },
    { q: 'What is <code>1 &lt; 3 &gt; 2</code>?', options: ['True', 'False', 'TypeError', '<code>(True &gt; 2)</code> → False'], answer: 0, explain: 'Chained comparisons mean (1 &lt; 3) and (3 &gt; 2), both True.' }
  );

  /* =====================================================================
     INTERVIEW Q&A
     ===================================================================== */
  interview.push(
    { q: 'Is Python compiled or interpreted?', level: 'B', a: R`<p><b>Both.</b> CPython first <b>compiles</b> source code to <b>bytecode</b> (after tokenising and parsing to an AST); imported modules cache it in <code>__pycache__/*.pyc</code>. Then the bytecode is <b>interpreted</b> by the Python virtual machine, a loop in C that executes one instruction at a time. Since 3.11 the interpreter specialises hot instructions for the types it sees (e.g. int addition), and 3.13+ include an experimental JIT. So "interpreted language" is a simplification — the honest answer is "compiled to bytecode, then interpreted (with adaptive specialisation)". Other implementations differ: PyPy uses a tracing JIT.</p>`, followUps: ['When is a .pyc file regenerated?', 'What does <code>dis.dis</code> show?', 'What is the difference between CPython and PyPy?'] },
    { q: 'Explain "variables are names bound to objects". Why does it matter?', level: 'B', a: R`<p>An assignment <code>x = expr</code> evaluates the right side to an <b>object</b> (which has identity, type and value) and binds the <b>name</b> x to it. Names have no type; assignment never copies. It matters because of <b>aliasing</b>: after <code>b = a</code>, both names refer to the same object, so <b>mutating</b> it through one (<code>b.append(1)</code>) is visible through the other, while <b>re-binding</b> one (<code>b = [...]</code>) does not affect the other. It also explains argument passing ("call by sharing"): functions receive references to the caller's objects, so they can mutate them but cannot re-bind the caller's names.</p>`, followUps: ['Is Python pass-by-value or pass-by-reference?', 'How do you make a real copy of a nested list?', 'What does <code>id()</code> return in CPython?'] },
    { q: 'What is the difference between <code>is</code> and <code>==</code>?', level: 'B', a: R`<p><code>==</code> compares <b>values</b> by calling <code>__eq__</code>; <code>is</code> compares <b>identity</b> — whether both operands are the very same object (same <code>id()</code>). Use <code>==</code> for values and <code>is</code> only for singletons such as <code>None</code> (and sentinels you create). <code>is</code> can appear to "work" for small ints (−5..256 are cached) or interned strings, but that is a CPython implementation detail; <code>a = 1000; b = int("1000"); a is b</code> is False. Python 3.8+ even emits a SyntaxWarning for <code>x is 5</code>.</p>`, followUps: ['Why is <code>x is None</code> preferred to <code>x == None</code>?', 'Can <code>a == a</code> ever be False? (NaN)'] },
    { q: 'Is Python statically or dynamically typed? Strongly or weakly?', level: 'B', a: R`<p><b>Dynamically</b> typed: types belong to objects, not to names; a name can be re-bound to any type and type errors are detected at run time when an operation executes. <b>Strongly</b> typed: objects do not silently convert to unrelated types — <code>"3" + 3</code> raises <code>TypeError</code> instead of producing "33" or 6 as weakly typed languages might. The exception is the numeric tower (bool → int → float → complex), where widening is deliberate. Type hints (<code>def f(x: int) -&gt; str</code>) add optional static checking via tools like mypy/pyright but are not enforced by the interpreter.</p>`, followUps: ['What is duck typing?', 'Why are hints not enforced at run time?', 'Name a library that does use hints at run time.'] },
    { q: 'Which values are falsy in Python, and what is a common bug related to truthiness?', level: 'B', a: R`<p>Falsy: <code>None</code>, <code>False</code>, numeric zeros (<code>0</code>, <code>0.0</code>, <code>0j</code>, <code>Decimal(0)</code>), and empty containers/strings (<code>""</code>, <code>[]</code>, <code>()</code>, <code>{}</code>, <code>set()</code>, <code>range(0)</code>). Everything else is truthy, including <code>"0"</code>, <code>"False"</code> and <code>[0]</code>. Classic bug: using truthiness to detect "missing" values — <code>if not quantity:</code> or <code>x = x or default</code> treats a valid 0 as missing. Use <code>if quantity is None:</code> when 0/empty are legitimate. Custom classes control truthiness with <code>__bool__</code> or <code>__len__</code>.</p>`, followUps: ['How does <code>bool()</code> decide for a custom object?', 'What does <code>"" or "x"</code> return and why?'] },
    { q: 'Why is <code>0.1 + 0.2 != 0.3</code>, and how do you handle it?', level: 'I', a: R`<p>Floats are IEEE-754 binary64 numbers with 53 bits of precision. 0.1, 0.2 and 0.3 have infinitely repeating binary expansions (like 1/3 in decimal), so each is stored as the nearest representable value: 0.1 is really 0.1000000000000000055…, 0.2 is 0.2000000000000000111…, and their sum rounds to 0.3000000000000000444…, while the literal 0.3 is 0.2999999999999999888…. Handling: compare with <code>math.isclose</code> (relative + optional absolute tolerance); for money use integer cents or <code>Decimal("0.1")</code> (from strings); for exact rationals use <code>Fraction</code>; for accurate sums use <code>math.fsum</code>.</p>`, followUps: ['Why does <code>print(0.1)</code> show 0.1 if it is not exact?', 'When does <code>abs(a - b) &lt; 1e-9</code> fail?', 'Why build Decimal from a string?'] },
    { q: 'Do Python integers overflow? How are they stored?', level: 'I', a: R`<p>No — Python <code>int</code> has arbitrary precision. CPython stores it as a sign/size field plus an array of 30-bit "digits" (in 32-bit C ints), least significant first; numbers grow by adding digits. Costs: addition O(n), multiplication schoolbook O(n²) for small and Karatsuba (≈ O(n<sup>1.58</sup>)) for large sizes, decimal string conversion roughly quadratic — hence the 4300-digit default limit on int↔str conversion added in 3.11 as DoS protection (<code>sys.set_int_max_str_digits</code>). Floats, by contrast, overflow to <code>inf</code>, and NumPy's fixed-width ints wrap silently. Each small int object costs 28 bytes.</p>`, followUps: ['What is <code>sys.getsizeof(2**100)</code> roughly?', 'Why do contest problems still ask for answers mod 10^9+7 in Python?', 'What error does <code>10**400 / 3</code> raise and why?'] },
    { q: 'Explain <code>//</code> and <code>%</code> for negative numbers. How does Python differ from C or Java?', level: 'I', a: R`<p>Python's <code>//</code> is <b>floor</b> division (rounds toward −∞) and <code>%</code> returns a result with the <b>sign of the divisor</b>, keeping the identity <code>a == (a // b) * b + a % b</code>. So <code>-7 // 2 == -4</code> and <code>-7 % 2 == 1</code>. C, C++, Java, Go and JavaScript truncate toward zero: −7 / 2 = −3 and −7 % 2 = −1. Python's choice makes <code>i % n</code> a valid index for any i when n &gt; 0 (circular buffers, clock arithmetic). For C-style behaviour use <code>math.fmod</code> or <code>int(a / b)</code> (small values only). Porting algorithms between languages with negative operands is a common source of bugs.</p>`, followUps: ['What is <code>7 % -3</code>?', 'How would you implement truncating division for huge ints?'] },
    { q: 'What do <code>and</code> and <code>or</code> return? What is short-circuiting?', level: 'I', a: R`<p>They return one of their <b>operands</b>, not necessarily a bool. <code>x or y</code> returns x if x is truthy, otherwise y; <code>x and y</code> returns x if x is falsy, otherwise y. Short-circuiting means the right operand is evaluated only if needed — <code>d != 0 and n / d &gt; 1</code> never divides by zero, and <code>cache or compute()</code> skips the call when the cache is filled. <code>not</code> always returns a bool. Precedence: <code>not</code> &gt; <code>and</code> &gt; <code>or</code>. They cannot be overloaded (no dunder methods) precisely because they must short-circuit; NumPy uses <code>&amp;</code>/<code>|</code> instead, which need brackets around comparisons.</p>`, followUps: ['Predict <code>0 or [] or "a" and "b"</code>.', 'Why does <code>arr &gt; 1 and arr &lt; 5</code> fail for NumPy arrays?'] },
    { q: 'How do you read input efficiently in Python for large inputs?', level: 'I', a: R`<p><code>input()</code> is fine for a few lines but each call has overhead (it strips the newline, handles prompts, and goes through text decoding line by line). For 10<sup>5</sup>–10<sup>6</sup> tokens, read everything at once: <code>data = sys.stdin.buffer.read().split()</code> then convert with <code>map(int, ...)</code> and walk an index — often 5–10× faster. Alternatively bind <code>input = sys.stdin.readline</code> (remember it keeps the trailing newline, so <code>.split()</code> or <code>.strip()</code>). For output, collect strings and write once with <code>sys.stdout.write("\n".join(out))</code> instead of millions of <code>print</code> calls.</p>`, followUps: ['Why is reading bytes faster than reading text?', 'How do you detect the end of input with input()?'] },
    { q: 'Compare f-strings, <code>str.format</code> and <code>%</code> formatting.', level: 'B', a: R`<p>All three format values into text. <b>%-formatting</b> (<code>"%s is %d" % (name, age)</code>) is the oldest, C-printf style, still used in <code>logging</code> (which defers formatting until a message is actually emitted). <b>str.format</b> (<code>"{} is {}".format(name, age)</code>) introduced the format-spec mini-language and works with templates stored as data. <b>f-strings</b> (<code>f"{name} is {age}"</code>, 3.6+) embed expressions directly, are compiled to fast bytecode, support the same specs (<code>:&gt;10,.2f</code>), the <code>=</code> debug specifier and <code>!r</code>; since 3.12 they allow nested same-type quotes and comments. Prefer f-strings in code, <code>format</code> for user-defined templates, <code>%</code> in logging calls; never use any of them to build SQL/shell commands from user input.</p>`, followUps: ['Why does logging prefer <code>log.info("x=%s", x)</code>?', 'What are t-strings in Python 3.14?'] },
    { q: 'What is the small-integer cache and string interning? Should code rely on them?', level: 'A', a: R`<p>CPython pre-creates int objects for −5…256 and reuses them, and interns many strings (identifier-like literals, names, single characters) so equal strings share one object. Since 3.12 these are <b>immortal</b> objects (PEP 683), whose reference count never changes. As a result <code>a = 256; b = 256; a is b</code> is True and the same with 257 created at run time is False; the compiler may also merge equal constants within a code block, so results differ between scripts and the REPL. Code must <b>never</b> rely on this — it is an optimisation, differs across versions/implementations, and <code>is</code> with literals triggers a SyntaxWarning. Use <code>==</code> for values; use <code>sys.intern()</code> explicitly only for performance in symbol-heavy workloads.</p>`, followUps: ['What does immortality help with in free-threaded builds?', 'Why does <code>"hello world" is "hello world"</code> vary?'] },
    { q: 'What happens step by step when you run <code>a, b = b, a</code>?', level: 'I', a: R`<p>The right side is evaluated <b>first and completely</b>: Python loads the objects referenced by b and a (in that order) and builds a tuple (CPython optimises two- and three-element swaps into stack rotations, no real tuple). Then the targets are assigned left to right: a is bound to the first element, b to the second. Because all right-hand values were captured before any re-binding, no temporary variable is needed. The same rule makes <code>x, y = y, x + y</code> (Fibonacci step) correct. A gotcha is when targets overlap with expressions that depend on earlier assignments, e.g. <code>i, arr[i] = 1, 5</code> assigns i first, then uses the new i as the index.</p>`, followUps: ['What does <code>dis</code> show for a swap?', 'Explain the <code>i, arr[i] = ...</code> gotcha.'] },
    { q: 'How would you represent money in Python, and why?', level: 'A', a: R`<p>Not with float: binary floats cannot represent most decimal amounts exactly (0.10 + 0.20 ≠ 0.30), errors accumulate over many operations, and <code>round()</code> uses banker's rounding on the already-inexact binary value. Options: (1) store <b>integer minor units</b> (cents/paise) — exact, fast, simple; convert only for display with <code>divmod(c, 100)</code>; (2) use <code>decimal.Decimal</code> constructed from <b>strings</b>, with explicit <code>quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)</code> (or the rule your regulator requires) and a configured context precision. When splitting amounts, distribute remainders with <code>divmod</code> so shares sum exactly to the total. At system boundaries (JSON, databases) use string or NUMERIC/DECIMAL types to avoid float conversion.</p>`, followUps: ['How do you split ₹100 among 3 people fairly?', 'Which rounding mode do banks use?', 'How does a database NUMERIC column map into Python?'] },
    { q: 'You see <code>error: externally-managed-environment</code> when running pip. What is going on and what do you do?', level: 'B', a: R`<p>Modern Linux distributions (and Homebrew) mark their system Python as "externally managed" (PEP 668) because OS tools depend on its packages; installing into it with pip could break the system. The fix is <b>not</b> <code>sudo pip</code> or <code>--break-system-packages</code>, but a <b>virtual environment</b> per project: <code>python3 -m venv .venv</code>, activate it, then <code>pip install ...</code> — or use <code>uv venv</code>/<code>uv add</code>. For command-line tools use <code>pipx</code> or <code>uv tool install</code>, which give each tool its own environment. Check which interpreter is active with <code>sys.executable</code>; inside a venv, <code>sys.prefix != sys.base_prefix</code>.</p>`, followUps: ['What does activating a venv actually change?', 'What is a lock file and why does it matter?'] }
  );

  registerModule({
    id: 'py01',
    title: 'Python Setup, Syntax, Types & I/O',
    lang: 'python',
    intro: R`<p>Welcome to Python! This first module builds the <b>mental model</b> that every later Python topic — and every "predict the output" interview question — rests on. You will install Python and learn the fastest truth machine you own (the <b>REPL</b>), then discover that Python variables are <b>name tags tied to objects</b>, not boxes. With that one idea, aliasing, <code>is</code> vs <code>==</code>, and "why did my list change?" stop being mysteries.</p>
<p>Next you meet the five core types (<code>int</code>, <code>float</code>, <code>str</code>, <code>bool</code>, <code>None</code>), see what <b>dynamic + strong typing</b> means in practice, talk to users with <code>input()</code>, <code>print()</code> and <b>f-strings</b>, master the operators that trip people up (<code>//</code>, <code>%</code>, <code>**</code>, <code>and</code>/<code>or</code>), and finish with <b>integer precision</b>: why Python ints never overflow, why <code>0.1 + 0.2 != 0.3</code>, and what to use for money. Every topic has an interactive visualizer and runnable examples — press ▶ Run and experiment.</p>`,
    goals: [
      'Install Python (python.org, package managers or uv), run code via the REPL, scripts, <code>-c</code> and <code>-m</code>, and explain how CPython compiles to bytecode',
      'Draw names → objects diagrams to predict aliasing, mutation vs re-binding, and <code>is</code> vs <code>==</code> results',
      'Use int, float, str, bool and None correctly, including truthiness, <code>bool</code>-is-an-<code>int</code> and <code>is None</code> checks',
      'Explain dynamic vs strong typing and convert between types safely (int/float/str, EAFP parsing)',
      'Read input (including fast bulk input) and produce exact layouts with print options and f-string format specs',
      'Predict any expression involving precedence, floor division/modulo with negatives, chained comparisons and short-circuit <code>and</code>/<code>or</code>',
      'Explain arbitrary-precision ints, IEEE-754 float error, and choose int cents / Decimal / Fraction / isclose appropriately'
    ],
    prereqs: R`<p>None — this is the first Python module. Basic computer skills (opening a terminal, editing a text file) help. If you already know another language, pay special attention to topics 2 (names vs boxes), 6 (floor division) and 7 (unlimited ints).</p>`,
    hours: 12,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
