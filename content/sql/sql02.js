(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* =====================================================================
     SAMPLE DATA — one source of truth.
     The same rows build (a) the SQLite databases the ▶ Run buttons use and
     (b) the in-browser mini query engine that powers every visualizer,
     so what you see animated is exactly what SQLite returns.
     ===================================================================== */
  var DATA = {
    employees: {
      ddl: ['id INTEGER PRIMARY KEY', 'name TEXT NOT NULL', 'dept TEXT', 'title TEXT', 'salary INTEGER', 'bonus INTEGER', 'manager_id INTEGER', 'hire_date TEXT', 'email TEXT'],
      rows: [
        [1, 'Priya Sharma', 'Engineering', 'VP Engineering', 250000, 50000, null, '2015-03-01', 'priya@corp.com'],
        [2, 'Arjun Mehta', 'Engineering', 'Senior Engineer', 160000, null, 1, '2018-07-15', 'arjun@corp.com'],
        [3, 'Lena Fischer', 'Engineering', 'Engineer', 120000, 8000, 2, '2021-01-10', 'lena@corp.com'],
        [4, 'Marco Rossi', 'Engineering', 'Engineer', 120000, null, 2, '2022-05-23', null],
        [5, 'Sara Johnson', 'Sales', 'VP Sales', 250000, 40000, null, '2016-11-01', 'sara@corp.com'],
        [6, 'Tom Becker', 'Sales', 'Account Exec', 90000, 15000, 5, '2020-02-17', 'tom@corp.com'],
        [7, 'Aisha Bello', 'Sales', 'Account Exec', 95000, 0, 5, '2023-08-01', 'aisha@corp.com'],
        [8, 'Kenji Tanaka', 'Marketing', 'Marketing Lead', 130000, 10000, null, '2019-04-08', 'kenji@corp.com'],
        [9, 'Olivia Brown', 'Marketing', 'Designer', 85000, null, 8, '2024-01-15', 'olivia@corp.com'],
        [10, 'Rahul Verma', null, 'Intern', 30000, null, 2, '2024-06-01', null],
        [11, 'Zoe Martin', 'HR', 'HR Manager', 110000, 5000, null, '2017-09-12', 'zoe@corp.com'],
        [12, 'Nina Kowalski', 'Engineering', 'Engineer', 135000, 12000, 2, '2020-10-05', 'nina@corp.com']
      ]
    },
    customers: {
      ddl: ['id INTEGER PRIMARY KEY', 'name TEXT NOT NULL', 'email TEXT', 'city TEXT', 'country TEXT', 'signup_date TEXT', 'referred_by INTEGER'],
      rows: [
        [1, 'Asha Rao', 'asha@gmail.com', 'Mumbai', 'India', '2024-01-15', null],
        [2, 'Ben Carter', 'ben.carter@yahoo.com', 'London', 'UK', '2024-02-03', 1],
        [3, 'Chen Wei', null, 'Shanghai', 'China', '2024-02-20', null],
        [4, 'Diya Patel', 'diya@gmail.com', null, 'India', '2024-03-11', 1],
        [5, 'Ethan Brooks', 'ethan@outlook.com', 'New York', 'USA', '2024-03-29', 2],
        [6, 'Fatima Khan', 'fatima_k@gmail.com', 'Dubai', 'UAE', '2024-04-14', null],
        [7, 'Gabriel Silva', null, 'Sao Paulo', 'Brazil', '2024-05-02', 5],
        [8, 'Hana Sato', 'hana@sato.jp', 'Tokyo', 'Japan', '2024-05-30', null],
        [9, 'Ivan Petrov', 'ivan.p@mail.ru', null, null, '2024-06-18', 3],
        [10, 'Jia Li', 'jia_li@GMAIL.com', 'Mumbai', 'India', '2024-07-07', 4],
        [11, 'Kabir Singh', 'gmailfan@yahoo.in', 'Delhi', 'India', '2024-08-01', null],
        [12, 'Lucy Evans', 'lucy@outlook.com', 'London', 'UK', '2024-08-19', 2]
      ]
    },
    products: {
      ddl: ['id INTEGER PRIMARY KEY', 'name TEXT NOT NULL', 'category TEXT', 'price INTEGER', 'stock INTEGER', 'discount_pct INTEGER'],
      rows: [
        [1, 'Wireless Mouse', 'Electronics', 799, 120, 10],
        [2, 'Mechanical Keyboard', 'Electronics', 3499, 40, null],
        [3, 'USB-C Cable', 'Electronics', 299, 500, 0],
        [4, 'Yoga Mat', 'Fitness', 1199, 60, 15],
        [5, 'Dumbbell 5kg', 'Fitness', 1499, 0, null],
        [6, 'Coffee Mug', 'Kitchen', 349, 200, 5],
        [7, 'French Press', 'Kitchen', 1899, 25, null],
        [8, 'Notebook A5', 'Stationery', 149, 1000, null],
        [9, 'Gel Pen 10-pack', 'Stationery', 199, null, 20],
        [10, '100% Cotton Tee', 'Apparel', 599, 80, 50],
        [11, 'Running_Shoes', 'Apparel', 4999, 15, null],
        [12, 'Desk Lamp', 'Electronics', null, 30, null]
      ]
    },
    orders: {
      ddl: ['id INTEGER PRIMARY KEY', 'customer_id INTEGER', 'order_date TEXT', 'status TEXT', 'amount INTEGER', 'coupon TEXT'],
      rows: [
        [101, 1, '2024-08-01', 'delivered', 1598, null],
        [102, 2, '2024-08-02', 'shipped', 3499, 'WELCOME10'],
        [103, 1, '2024-08-05', 'cancelled', 299, null],
        [104, 3, '2024-08-07', 'delivered', 1199, 'FIT15'],
        [105, 5, '2024-08-10', 'pending', 4999, null],
        [106, 4, '2024-08-11', 'delivered', 349, null],
        [107, 6, '2024-08-15', 'returned', 1899, 'KITCHEN5'],
        [108, 2, '2024-08-18', 'delivered', 149, null],
        [109, 8, '2024-08-20', 'shipped', 2398, null],
        [110, 10, '2024-08-25', 'pending', null, null],
        [111, 1, '2024-08-28', 'delivered', 599, 'WELCOME10'],
        [112, 9, '2024-09-01', 'cancelled', 799, null],
        [113, 12, '2024-09-03', null, 1499, 'WELCOME10'],
        [114, 2, '2024-09-05', 'delivered', 1899, null]
      ]
    },
    movies: {
      ddl: ['id INTEGER PRIMARY KEY', 'title TEXT NOT NULL', 'year INTEGER', 'genre TEXT', 'rating REAL', 'votes INTEGER', 'director TEXT', 'language TEXT'],
      rows: [
        [1, 'The Matrix', 1999, 'Sci-Fi', 8.7, 2000000, 'Lana Wachowski', 'English'],
        [2, 'Spirited Away', 2001, 'Animation', 8.6, 850000, 'Hayao Miyazaki', 'Japanese'],
        [3, 'Parasite', 2019, 'Thriller', 8.5, 950000, 'Bong Joon-ho', 'Korean'],
        [4, 'Inception', 2010, 'Sci-Fi', 8.8, 2500000, 'Christopher Nolan', 'English'],
        [5, 'Dangal', 2016, 'Drama', 8.3, 200000, 'Nitesh Tiwari', 'Hindi'],
        [6, 'Groundhog Day', 1993, 'Comedy', 8.0, 680000, 'Harold Ramis', 'English'],
        [7, 'Jurassic Park', 1993, 'Adventure', 8.2, 1100000, 'Steven Spielberg', 'English'],
        [8, 'Lagaan', 2001, 'Drama', 8.1, 120000, 'Ashutosh Gowariker', 'Hindi'],
        [9, 'Amelie', 2001, 'Romance', 8.3, 780000, 'Jean-Pierre Jeunet', 'French'],
        [10, 'Dune: Part Three', 2026, 'Sci-Fi', null, null, 'Denis Villeneuve', 'English'],
        [11, 'Toy Story', 1995, 'Animation', 8.3, 1050000, 'John Lasseter', 'English'],
        [12, 'The Room', 2003, 'Drama', 3.6, 95000, 'Tommy Wiseau', 'English'],
        [13, 'Untitled Indie Film', null, 'Drama', null, null, null, 'English'],
        [14, 'Se7en', 1995, 'Thriller', 8.6, 1800000, 'David Fincher', 'English']
      ]
    }
  };
  Object.keys(DATA).forEach(function (t) {
    var d = DATA[t];
    d.cols = d.ddl.map(function (c) { return c.split(' ')[0]; });
    d.real = {};
    d.ddl.forEach(function (c) { if (/ REAL/.test(c)) d.real[c.split(' ')[0]] = true; });
  });
  function sqlLit(v) {
    if (v === null) return 'NULL';
    if (typeof v === 'number') return String(v);
    return "'" + String(v).replace(/'/g, "''") + "'";
  }
  function buildDb(names) {
    return names.map(function (t) {
      var d = DATA[t];
      return 'CREATE TABLE ' + t + ' (\n  ' + d.ddl.join(',\n  ') + '\n);\nINSERT INTO ' + t + ' VALUES\n' +
        d.rows.map(function (r) { return '  (' + r.map(sqlLit).join(', ') + ')'; }).join(',\n') + ';';
    }).join('\n\n');
  }

  /* =====================================================================
     MINI SQL ENGINE (visualizers only).
     Supports: SELECT [DISTINCT] expr [AS alias], ... FROM table [alias]
     [WHERE expr] [ORDER BY expr [ASC|DESC] [NULLS FIRST|LAST], ...]
     [LIMIT n [OFFSET m]] with SQLite semantics: three-valued logic,
     NULL sorts smallest, LIKE is ASCII case-insensitive, = is case-sensitive.
     ===================================================================== */
  var RESERVED = ' SELECT FROM WHERE ORDER BY LIMIT OFFSET AND OR NOT IN IS NULL LIKE GLOB BETWEEN AS ASC DESC DISTINCT ALL GROUP HAVING NULLS FIRST LAST ESCAPE JOIN ON UNION TRUE FALSE CASE WHEN THEN ELSE END ';
  function isReserved(u) { return RESERVED.indexOf(' ' + u + ' ') >= 0; }

  function tokenize(s) {
    var t = [], i = 0, n = s.length, m;
    while (i < n) {
      var c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (c === '-' && s[i + 1] === '-') { while (i < n && s[i] !== '\n') i++; continue; }
      if (c === "'") {
        var j = i + 1, v = '';
        while (j < n) {
          if (s[j] === "'") { if (s[j + 1] === "'") { v += "'"; j += 2; continue; } break; }
          v += s[j++];
        }
        if (j >= n) throw new Error('A string literal is missing its closing quote \'');
        t.push({ k: 'str', v: v }); i = j + 1; continue;
      }
      if (c === '"') {
        var e = s.indexOf('"', i + 1);
        if (e < 0) throw new Error('A "quoted name" is missing its closing quote');
        t.push({ k: 'id', v: s.slice(i + 1, e), u: '"' }); i = e + 1; continue;
      }
      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(s[i + 1] || ''))) {
        m = /^(\d+\.\d*|\.\d+|\d+)/.exec(s.slice(i));
        t.push({ k: 'num', v: Number(m[0]), real: m[0].indexOf('.') >= 0 }); i += m[0].length; continue;
      }
      if (/[A-Za-z_]/.test(c)) {
        m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(s.slice(i));
        t.push({ k: 'id', v: m[0], u: m[0].toUpperCase() }); i += m[0].length; continue;
      }
      var two = s.substr(i, 2);
      if (['<=', '>=', '<>', '!=', '||', '=='].indexOf(two) >= 0) { t.push({ k: 'op', v: two === '==' ? '=' : two }); i += 2; continue; }
      if ('=<>+-*/%(),;.'.indexOf(c) >= 0) { t.push({ k: 'op', v: c }); i++; continue; }
      throw new Error('Unexpected character "' + c + '" — use plain SQL like: SELECT name FROM employees WHERE salary > 100000');
    }
    return t;
  }

  function Parser(toks) { this.t = toks; this.p = 0; }
  Parser.prototype.peek = function (o) { return this.t[this.p + (o || 0)]; };
  Parser.prototype.kw = function (u, o) { var x = this.peek(o); return !!x && x.k === 'id' && x.u === u; };
  Parser.prototype.op = function (v) { var x = this.peek(); return !!x && x.k === 'op' && x.v === v; };
  Parser.prototype.eatKw = function (u) { if (!this.kw(u)) throw new Error('Expected ' + u + ' near "' + this.near() + '"'); this.p++; };
  Parser.prototype.eatOp = function (v) { if (!this.op(v)) throw new Error('Expected "' + v + '" near "' + this.near() + '"'); this.p++; };
  Parser.prototype.near = function () { return this.t.slice(this.p, this.p + 4).map(function (x) { return x.k === 'str' ? "'" + x.v + "'" : x.v; }).join(' ') || 'end of query'; };
  Parser.prototype.expr = function () { return this.or(); };
  Parser.prototype.or = function () { var l = this.and(); while (this.kw('OR')) { this.p++; l = { t: 'or', l: l, r: this.and() }; } return l; };
  Parser.prototype.and = function () { var l = this.not(); while (this.kw('AND')) { this.p++; l = { t: 'and', l: l, r: this.not() }; } return l; };
  Parser.prototype.not = function () { if (this.kw('NOT')) { this.p++; return { t: 'not', e: this.not() }; } return this.cmp(); };
  Parser.prototype.cmp = function () {
    var l = this.add(), x = this.peek();
    if (x && x.k === 'op' && ['=', '!=', '<>', '<', '<=', '>', '>='].indexOf(x.v) >= 0) { this.p++; return { t: 'cmp', op: x.v === '!=' ? '<>' : x.v, l: l, r: this.add() }; }
    if (this.kw('IS')) {
      this.p++; var neg = false;
      if (this.kw('NOT')) { this.p++; neg = true; }
      if (this.kw('DISTINCT')) { this.p++; this.eatKw('FROM'); return { t: 'is', l: l, r: this.add(), neg: !neg }; }
      if (this.kw('NULL')) { this.p++; return { t: 'isnull', e: l, neg: neg }; }
      return { t: 'is', l: l, r: this.add(), neg: neg };
    }
    var ng = false;
    if (this.kw('NOT') && (this.kw('IN', 1) || this.kw('BETWEEN', 1) || this.kw('LIKE', 1))) { this.p++; ng = true; }
    if (this.kw('IN')) {
      this.p++; this.eatOp('(');
      var list = [this.expr()];
      while (this.op(',')) { this.p++; list.push(this.expr()); }
      this.eatOp(')');
      return { t: 'in', e: l, list: list, neg: ng };
    }
    if (this.kw('BETWEEN')) { this.p++; var lo = this.add(); this.eatKw('AND'); return { t: 'between', e: l, lo: lo, hi: this.add(), neg: ng }; }
    if (this.kw('LIKE')) {
      this.p++; var pat = this.add(), esc = null;
      if (this.kw('ESCAPE')) { this.p++; esc = this.add(); }
      return { t: 'like', e: l, pat: pat, esc: esc, neg: ng };
    }
    if (ng) throw new Error('NOT must be followed by IN, BETWEEN or LIKE here');
    return l;
  };
  Parser.prototype.add = function () {
    var l = this.mul();
    while (this.op('+') || this.op('-') || this.op('||')) { var o = this.peek().v; this.p++; l = { t: 'bin', op: o, l: l, r: this.mul() }; }
    return l;
  };
  Parser.prototype.mul = function () {
    var l = this.unary();
    while (this.op('*') || this.op('/') || this.op('%')) { var o = this.peek().v; this.p++; l = { t: 'bin', op: o, l: l, r: this.unary() }; }
    return l;
  };
  Parser.prototype.unary = function () {
    if (this.op('-')) { this.p++; return { t: 'neg', e: this.unary() }; }
    if (this.op('+')) { this.p++; return this.unary(); }
    return this.atom();
  };
  Parser.prototype.atom = function () {
    var x = this.peek();
    if (!x) throw new Error('Query ended too early — an expression is missing');
    if (x.k === 'num') { this.p++; return { t: 'num', v: x.v, real: x.real }; }
    if (x.k === 'str') { this.p++; return { t: 'str', v: x.v }; }
    if (x.k === 'op' && x.v === '(') { this.p++; var e = this.expr(); this.eatOp(')'); return { t: 'par', e: e }; }
    if (x.k === 'id') {
      if (x.u === 'NULL') { this.p++; return { t: 'null' }; }
      if (x.u === 'TRUE' || x.u === 'FALSE') { this.p++; return { t: 'num', v: x.u === 'TRUE' ? 1 : 0, b: x.u }; }
      if (x.u === 'CASE') throw new Error('CASE expressions are covered in SQL 3 — this visualizer keeps to SELECT/WHERE/ORDER BY/LIMIT');
      if (x.u !== '"' && isReserved(x.u)) throw new Error('Unexpected keyword ' + x.u + ' near "' + this.near() + '"');
      this.p++;
      if (this.op('(')) {
        this.p++; var args = [];
        if (!this.op(')')) { args.push(this.expr()); while (this.op(',')) { this.p++; args.push(this.expr()); } }
        this.eatOp(')');
        var fn = x.v.toUpperCase();
        if (!FUNCS[fn]) throw new Error('The visualizer knows these functions: ' + Object.keys(FUNCS).join(', ') + ' (aggregates like ' + fn + ' come in SQL 3)');
        return { t: 'fn', name: fn, args: args };
      }
      if (this.op('.')) { this.p++; var c2 = this.peek(); if (!c2 || c2.k !== 'id') throw new Error('Expected a column name after "' + x.v + '."'); this.p++; return { t: 'col', name: c2.v }; }
      return { t: 'col', name: x.v };
    }
    throw new Error('Unexpected "' + x.v + '" near "' + this.near() + '"');
  };

  function num(v) {
    if (v === null) return null;
    if (typeof v === 'number') return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    var m = /^\s*[-+]?(\d+\.?\d*|\.\d+)/.exec(String(v));
    return m ? Number(m[0]) : 0;
  }
  function truth(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === 'boolean') return v;
    return num(v) !== 0;
  }
  function looksNum(s) { return typeof s === 'string' && /^\s*[-+]?(\d+\.?\d*|\.\d+)\s*$/.test(s); }
  function compare(a, b) {
    if (a === null || b === null) return null;
    if (typeof a === 'boolean') a = a ? 1 : 0;
    if (typeof b === 'boolean') b = b ? 1 : 0;
    if (typeof a === 'number' && looksNum(b)) b = Number(b);
    if (typeof b === 'number' && looksNum(a)) a = Number(a);
    if (typeof a === 'number' && typeof b === 'number') return a < b ? -1 : a > b ? 1 : 0;
    if (typeof a === 'number') return -1;
    if (typeof b === 'number') return 1;
    return a < b ? -1 : a > b ? 1 : 0;
  }
  function likeRe(pat, esc) {
    var r = '^', i, ch;
    for (i = 0; i < pat.length; i++) {
      ch = pat[i];
      if (esc && ch === esc && i + 1 < pat.length) { i++; r += pat[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); continue; }
      if (ch === '%') r += '[\\s\\S]*';
      else if (ch === '_') r += '[\\s\\S]';
      else r += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    return new RegExp(r + '$', 'i');
  }
  var FUNCS = {
    UPPER: function (a) { return a[0] === null ? null : String(a[0]).toUpperCase(); },
    LOWER: function (a) { return a[0] === null ? null : String(a[0]).toLowerCase(); },
    LENGTH: function (a) { return a[0] === null ? null : String(a[0]).length; },
    COALESCE: function (a) { for (var i = 0; i < a.length; i++) if (a[i] !== null) return a[i]; return null; },
    IFNULL: function (a) { return a[0] !== null ? a[0] : a[1]; },
    NULLIF: function (a) { return compare(a[0], a[1]) === 0 ? null : a[0]; },
    ROUND: function (a) { if (a[0] === null) return null; var f = Math.pow(10, a[1] ? num(a[1]) : 0); return Math.round(num(a[0]) * f) / f; },
    ABS: function (a) { return a[0] === null ? null : Math.abs(num(a[0])); },
    SUBSTR: function (a) { if (a[0] === null) return null; var s = String(a[0]), st = num(a[1]) - 1; return a.length > 2 ? s.substr(Math.max(0, st), num(a[2])) : s.substr(Math.max(0, st)); },
    TRIM: function (a) { return a[0] === null ? null : String(a[0]).trim(); },
    REPLACE: function (a) { return a[0] === null ? null : String(a[0]).split(String(a[1])).join(String(a[2])); },
    INSTR: function (a) { return a[0] === null || a[1] === null ? null : String(a[0]).indexOf(String(a[1])) + 1; }
  };

  function isRealNode(n, tbl) {
    if (!n) return false;
    if (n.t === 'num') return !!n.real;
    if (n.t === 'col') return !!(tbl && tbl.real[n.name]);
    if (n.t === 'bin') return n.op !== '||' && (isRealNode(n.l, tbl) || isRealNode(n.r, tbl));
    if (n.t === 'neg' || n.t === 'par') return isRealNode(n.e, tbl);
    if (n.t === 'fn' && n.name === 'ROUND') return true;
    return false;
  }

  function evalNode(n, env) {
    switch (n.t) {
      case 'num': return n.v;
      case 'str': return n.v;
      case 'null': return null;
      case 'par': return evalNode(n.e, env);
      case 'col': return env.get(n.name);
      case 'neg': { var v = evalNode(n.e, env); return v === null ? null : -num(v); }
      case 'fn': return FUNCS[n.name](n.args.map(function (a) { return evalNode(a, env); }));
      case 'bin': {
        var a = evalNode(n.l, env), b = evalNode(n.r, env);
        if (a === null || b === null) return null;
        if (n.op === '||') return String(typeof a === 'boolean' ? +a : a) + String(typeof b === 'boolean' ? +b : b);
        a = num(a); b = num(b);
        if (n.op === '+') return a + b;
        if (n.op === '-') return a - b;
        if (n.op === '*') return a * b;
        if (b === 0) return null;
        if (n.op === '%') return a % b;
        var intDiv = Number.isInteger(a) && Number.isInteger(b) && !isRealNode(n.l, env.tbl) && !isRealNode(n.r, env.tbl);
        return intDiv ? Math.trunc(a / b) : a / b;
      }
      case 'cmp': {
        var c = compare(evalNode(n.l, env), evalNode(n.r, env));
        if (c === null) return null;
        return n.op === '=' ? c === 0 : n.op === '<>' ? c !== 0 : n.op === '<' ? c < 0 : n.op === '<=' ? c <= 0 : n.op === '>' ? c > 0 : c >= 0;
      }
      case 'is': { var x = evalNode(n.l, env), y = evalNode(n.r, env), same = (x === null && y === null) || (x !== null && y !== null && compare(x, y) === 0); return n.neg ? !same : same; }
      case 'isnull': { var z = evalNode(n.e, env) === null; return n.neg ? !z : z; }
      case 'and': { var p = truth(evalNode(n.l, env)), q = truth(evalNode(n.r, env)); if (p === false || q === false) return false; if (p === null || q === null) return null; return true; }
      case 'or': { var p2 = truth(evalNode(n.l, env)), q2 = truth(evalNode(n.r, env)); if (p2 === true || q2 === true) return true; if (p2 === null || q2 === null) return null; return false; }
      case 'not': { var w = truth(evalNode(n.e, env)); return w === null ? null : !w; }
      case 'in': {
        var lv = evalNode(n.e, env), sawNull = false, hit = false;
        if (lv === null) return null;
        n.list.forEach(function (it) { var iv = evalNode(it, env); if (iv === null) sawNull = true; else if (compare(lv, iv) === 0) hit = true; });
        var r = hit ? true : sawNull ? null : false;
        return n.neg ? (r === null ? null : !r) : r;
      }
      case 'between': {
        var bv = evalNode(n.e, env), lo = compare(bv, evalNode(n.lo, env)), hi = compare(bv, evalNode(n.hi, env));
        var g = lo === null ? null : lo >= 0, h = hi === null ? null : hi <= 0, res;
        if (g === false || h === false) res = false; else if (g === null || h === null) res = null; else res = true;
        return n.neg ? (res === null ? null : !res) : res;
      }
      case 'like': {
        var sv = evalNode(n.e, env), pv = evalNode(n.pat, env), ev = n.esc ? evalNode(n.esc, env) : null;
        if (sv === null || pv === null) return null;
        var ok = likeRe(String(pv), ev === null ? null : String(ev)).test(String(sv));
        return n.neg ? !ok : ok;
      }
    }
    throw new Error('Cannot evaluate ' + n.t);
  }

  function show(n) {
    switch (n.t) {
      case 'num': return n.b || (n.real && Number.isInteger(n.v) ? n.v.toFixed(1) : String(n.v));
      case 'str': return "'" + n.v.replace(/'/g, "''") + "'";
      case 'null': return 'NULL';
      case 'par': return '(' + show(n.e) + ')';
      case 'col': return n.name;
      case 'neg': return '-' + show(n.e);
      case 'fn': return n.name + '(' + n.args.map(show).join(', ') + ')';
      case 'bin': return show(n.l) + ' ' + n.op + ' ' + show(n.r);
      case 'cmp': return show(n.l) + ' ' + n.op + ' ' + show(n.r);
      case 'is': return show(n.l) + (n.neg ? ' IS NOT ' : ' IS ') + show(n.r);
      case 'isnull': return show(n.e) + (n.neg ? ' IS NOT NULL' : ' IS NULL');
      case 'and': return show(n.l) + ' AND ' + show(n.r);
      case 'or': return show(n.l) + ' OR ' + show(n.r);
      case 'not': return 'NOT ' + show(n.e);
      case 'in': return show(n.e) + (n.neg ? ' NOT IN (' : ' IN (') + n.list.map(show).join(', ') + ')';
      case 'between': return show(n.e) + (n.neg ? ' NOT BETWEEN ' : ' BETWEEN ') + show(n.lo) + ' AND ' + show(n.hi);
      case 'like': return show(n.e) + (n.neg ? ' NOT LIKE ' : ' LIKE ') + show(n.pat) + (n.esc ? ' ESCAPE ' + show(n.esc) : '');
    }
    return '?';
  }
  function tv(v) { v = truth(v); return v === null ? 'UNKNOWN' : v ? 'TRUE' : 'FALSE'; }
  function tvc(v) { var s = tv(v); return '<span class="' + (s === 'TRUE' ? 'c-g' : s === 'FALSE' ? 'c-r' : 'c-y') + '">' + s + '</span>'; }
  function fmtVal(v) { return v === null ? 'NULL' : typeof v === 'boolean' ? (v ? '1' : '0') : typeof v === 'string' ? "'" + v + "'" : String(v); }
  function leaves(n, out) {
    if (n.t === 'and' || n.t === 'or') { leaves(n.l, out); leaves(n.r, out); }
    else if (n.t === 'not' || n.t === 'par') { if (n.t === 'not') out.push(n); else leaves(n.e, out); }
    else out.push(n);
    return out;
  }
  function firstVal(n, env) {
    var t = n.t === 'not' ? n.e : n;
    var side = t.l || t.e;
    if (!side) return '';
    try { return ' <span class="c-m">(' + H.esc(show(side)) + ' = ' + H.esc(fmtVal(evalNode(side, env))) + ')</span>'; } catch (e) { return ''; }
  }

  function parseQuery(sql) {
    var toks = tokenize(String(sql));
    if (toks.length && toks[toks.length - 1].k === 'op' && toks[toks.length - 1].v === ';') toks.pop();
    var P = new Parser(toks), q = { items: [], order: [], distinct: false };
    P.eatKw('SELECT');
    if (P.kw('DISTINCT')) { P.p++; q.distinct = true; } else if (P.kw('ALL')) P.p++;
    do {
      if (q.items.length) P.p++;
      if (P.op('*')) { P.p++; q.items.push({ star: true }); continue; }
      var e = P.expr(), alias = null;
      if (P.kw('AS')) { P.p++; var a = P.peek(); if (!a || (a.k !== 'id' && a.k !== 'str')) throw new Error('Expected an alias name after AS'); alias = a.v; P.p++; }
      else if (P.peek() && P.peek().k === 'id' && (P.peek().u === '"' || !isReserved(P.peek().u))) { alias = P.peek().v; P.p++; }
      q.items.push({ e: e, alias: alias });
    } while (P.op(','));
    P.eatKw('FROM');
    var tb = P.peek();
    if (!tb || tb.k !== 'id' || !DATA[tb.v.toLowerCase()]) throw new Error('FROM must name one table: ' + Object.keys(DATA).join(', '));
    q.table = tb.v.toLowerCase(); P.p++;
    if (P.kw('AS')) P.p++;
    if (P.peek() && P.peek().k === 'id' && !isReserved(P.peek().u)) P.p++;
    if (P.kw('JOIN') || P.op(',')) throw new Error('JOINs are covered in SQL 4 — use a single table here');
    if (P.kw('WHERE')) { P.p++; q.where = P.expr(); }
    if (P.kw('GROUP') || P.kw('HAVING')) throw new Error('GROUP BY / HAVING come in SQL 3 — this visualizer covers FROM → WHERE → SELECT → DISTINCT → ORDER BY → LIMIT');
    if (P.kw('ORDER')) {
      P.p++; P.eatKw('BY');
      do {
        if (q.order.length) P.p++;
        var oe = P.expr(), desc = false, nulls = null;
        if (P.kw('ASC')) P.p++; else if (P.kw('DESC')) { P.p++; desc = true; }
        if (P.kw('NULLS')) { P.p++; if (P.kw('FIRST')) nulls = 'first'; else if (P.kw('LAST')) nulls = 'last'; else throw new Error('Write NULLS FIRST or NULLS LAST'); P.p++; }
        q.order.push({ e: oe, desc: desc, nulls: nulls });
      } while (P.op(','));
    }
    if (P.kw('LIMIT')) {
      P.p++; var l1 = P.expr();
      if (P.kw('OFFSET')) { P.p++; q.limit = l1; q.offset = P.expr(); }
      else if (P.op(',')) { P.p++; q.offset = l1; q.limit = P.expr(); q.mysqlLimit = true; }
      else q.limit = l1;
    }
    if (P.peek()) throw new Error('Did not understand "' + P.near() + '" — clause order is SELECT … FROM … WHERE … ORDER BY … LIMIT … OFFSET …');
    return q;
  }

  function makeEnv(tbl, row, extra) {
    return {
      tbl: tbl,
      get: function (name) {
        var i = tbl.cols.indexOf(name);
        if (i < 0) { var lc = name.toLowerCase(); for (var k = 0; k < tbl.cols.length; k++) if (tbl.cols[k].toLowerCase() === lc) { i = k; break; } }
        if (i >= 0) return row[i];
        if (extra && Object.prototype.hasOwnProperty.call(extra, name)) return extra[name];
        throw new Error('No such column: ' + name + ' (table has: ' + tbl.cols.join(', ') + '). If ' + name + ' is a SELECT alias: WHERE runs before SELECT, so standard SQL cannot see aliases there (SQLite is lenient; Postgres/SQL Server/Oracle raise an error).');
      }
    };
  }
  function disp(v, real) {
    if (v === null || v === undefined) return null;
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (typeof v === 'number' && !Number.isInteger(v)) return Math.round(v * 1e6) / 1e6;
    if (typeof v === 'number' && real) return v.toFixed(1);
    return v;
  }

  // Run a query and return everything the frames need (also used by the self-checks)
  function runQuery(sql) {
    var q = parseQuery(sql), tbl = DATA[q.table];
    var rows = tbl.rows.map(function (r, i) { return { src: r, i: i }; });
    // output column descriptors
    var outCols = [];
    q.items.forEach(function (it) {
      if (it.star) tbl.cols.forEach(function (c) { outCols.push({ name: c, node: { t: 'col', name: c } }); });
      else outCols.push({ name: it.alias || show(it.e), node: it.e, alias: it.alias, computed: it.e.t !== 'col' });
    });
    outCols.forEach(function (c) { c.real = isRealNode(c.node, tbl); });
    rows.forEach(function (r) { var env = makeEnv(tbl, r.src); r.w = q.where ? truth(evalNode(q.where, env)) : true; });
    var kept = rows.filter(function (r) { return r.w === true; });
    kept.forEach(function (r) {
      var env = makeEnv(tbl, r.src);
      r.out = outCols.map(function (c) { return evalNode(c.node, env); });
    });
    var afterDistinct = kept, dupFlags = [];
    if (q.distinct) {
      var seen = {};
      afterDistinct = [];
      kept.forEach(function (r) {
        var key = JSON.stringify(r.out.map(function (v) { return v === null ? '\u0000NULL' : typeof v === 'boolean' ? +v : v; }));
        var dup = !!seen[key]; dupFlags.push(dup);
        if (!dup) { seen[key] = 1; afterDistinct.push(r); }
      });
    }
    var sorted = afterDistinct.slice();
    if (q.order.length) {
      sorted.forEach(function (r) {
        var extra = {};
        outCols.forEach(function (c, k) { if (c.alias) extra[c.alias] = r.out[k]; });
        var env = makeEnv(tbl, r.src, extra);
        r.keys = q.order.map(function (o) {
          if (o.e.t === 'num' && Number.isInteger(o.e.v) && !o.e.real && !o.e.b) {
            if (o.e.v < 1 || o.e.v > outCols.length) throw new Error('ORDER BY ' + o.e.v + ' is out of range — there are ' + outCols.length + ' output columns');
            return r.out[o.e.v - 1];
          }
          // a bare alias name refers to the output column
          if (o.e.t === 'col') { for (var k = 0; k < outCols.length; k++) if (outCols[k].alias && outCols[k].alias.toLowerCase() === o.e.name.toLowerCase()) return r.out[k]; }
          return evalNode(o.e, env);
        });
      });
      sorted.sort(function (a, b) {
        for (var k = 0; k < q.order.length; k++) {
          var o = q.order[k], x = a.keys[k], y = b.keys[k];
          if (typeof x === 'boolean') x = +x;
          if (typeof y === 'boolean') y = +y;
          if (x === null && y === null) continue;
          var nullsFirst = o.nulls ? o.nulls === 'first' : !o.desc;
          if (x === null) return nullsFirst ? -1 : 1;
          if (y === null) return nullsFirst ? 1 : -1;
          var c = compare(x, y);
          if (c) return o.desc ? -c : c;
        }
        return a.i - b.i;
      });
    }
    var lim = null, off = 0;
    if (q.limit) { lim = num(evalNode(q.limit, makeEnv(tbl, []))); if (lim < 0) lim = null; }
    if (q.offset) { off = Math.max(0, num(evalNode(q.offset, makeEnv(tbl, [])))); }
    var final = sorted.slice(off, lim === null ? undefined : off + lim);
    return { q: q, tbl: tbl, rows: rows, kept: kept, outCols: outCols, dupFlags: dupFlags, afterDistinct: afterDistinct, sorted: sorted, lim: lim, off: off, final: final };
  }

  var STEPS = ['FROM', 'WHERE', 'SELECT', 'DISTINCT', 'ORDER BY', 'LIMIT'];
  function pipe(cur, present) {
    var hl = {}, tags = {}, ci = STEPS.indexOf(cur);
    STEPS.forEach(function (s, i) {
      if (!present[s]) { hl[s] = 'done'; tags[s] = 'not used'; }
      else if (i < ci) hl[s] = 'ok';
      else if (i === ci) hl[s] = 'cur';
    });
    var edges = [];
    for (var i = 0; i + 1 < STEPS.length; i++) edges.push([STEPS[i], STEPS[i + 1]]);
    var ehl = {};
    if (ci > 0) ehl[STEPS[ci - 1] + '-' + cur] = 'ok';
    return {
      type: 'graph', label: 'Logical processing order (how the engine thinks)', directed: true, height: 14,
      nodes: STEPS.map(function (s, i) { return { id: s, label: (i + 1) + ' ' + s, x: 8 + i * 16.8, y: 6, shape: 'box' }; }),
      edges: edges, hl: hl, ehl: ehl, tags: tags
    };
  }
  function srcTable(tbl, rows, extraCol, extraVals, hl, label) {
    return {
      type: 'table', label: label, columns: tbl.cols.concat(extraCol ? [extraCol] : []),
      rows: rows.map(function (r, k) { return r.src.map(function (v, j) { return disp(v, tbl.real[tbl.cols[j]]); }).concat(extraCol ? [extraVals[k]] : []); }),
      hl: hl || {}
    };
  }
  function outTable(R, rows, hl, label, extraCols) {
    extraCols = extraCols || [];
    return {
      type: 'table', label: label, columns: R.outCols.map(function (c) { return c.name; }).concat(extraCols.map(function (e) { return e.name; })),
      rows: rows.map(function (r) { return r.out.map(function (v, k) { return disp(v, R.outCols[k].real); }).concat(extraCols.map(function (e) { return e.get(r); })); }),
      hl: hl || {}
    };
  }
  function queryText(q, sql) { return String(sql).trim().replace(/\s+(FROM|WHERE|ORDER BY|LIMIT)\b/gi, '\n$1'); }

  /* queryFrames(sql, opts) → animation frames for the whole logical pipeline.
     opts.stepWhere: one frame per row while WHERE is evaluated
     opts.sortSteps: show ORDER BY one sort key at a time
     opts.intro: extra HTML for the first frame */
  function queryFrames(sql, opts) {
    opts = opts || {};
    if (String(sql).length > 400) throw new Error('Keep the query under 400 characters');
    var R = runQuery(sql), q = R.q, tbl = R.tbl, F = [];
    var present = { FROM: 1, WHERE: !!q.where, SELECT: 1, DISTINCT: q.distinct, 'ORDER BY': q.order.length > 0, LIMIT: q.limit || q.offset };
    var codePart = { type: 'code', label: 'Your query (written order)', lang: 'sql', code: queryText(q, sql) };
    F.push({ narr: (opts.intro || '') + 'You <b>write</b> SELECT first, but the engine <b>runs</b> the clauses in a different order: FROM → WHERE → SELECT → DISTINCT → ORDER BY → LIMIT. Grey boxes are clauses this query does not use. Press ▶ to watch each step.', parts: [pipe('', present), codePart] });
    F.push({ narr: '<b>Step 1 — FROM ' + q.table + '</b>: the engine opens the table and gets all <b>' + R.rows.length + '</b> rows. Nothing is filtered yet; every column is still available. Grey <span class="c-m">NULL</span> cells mean "value unknown / missing".', parts: [pipe('FROM', present), srcTable(tbl, R.rows, null, null, {}, 'Working set after FROM (' + R.rows.length + ' rows)')] });
    if (q.where) {
      var whereTxt = H.esc(show(q.where)), res = [], hl = {};
      if (opts.stepWhere) {
        R.rows.forEach(function (r, i) {
          var env = makeEnv(tbl, r.src), parts = leaves(q.where, []).map(function (lf) { return '<code>' + H.esc(show(lf)) + '</code>' + firstVal(lf, env) + ' → ' + tvc(evalNode(lf, env)); });
          res.push(tv(r.w)); hl = {};
          for (var k = 0; k < i; k++) hl[k] = R.rows[k].w === true ? 'ok' : 'bad';
          hl[i] = 'cur';
          var shown = res.slice().concat(R.rows.slice(i + 1).map(function () { return ''; }));
          F.push({
            narr: '<b>Step 2 — WHERE</b>, row ' + (i + 1) + ' of ' + R.rows.length + ': ' + parts.join('; ') + '. Whole condition → ' + tvc(r.w) + ' → ' +
              (r.w === true ? '<span class="c-g">row KEPT</span>.' : r.w === null ? '<span class="c-y">UNKNOWN is not TRUE → row DROPPED</span> (a NULL was involved).' : '<span class="c-r">row DROPPED</span>.'),
            parts: [pipe('WHERE', present), srcTable(tbl, R.rows, 'WHERE result', shown, hl, 'WHERE ' + whereTxt)]
          });
        });
      }
      hl = {}; res = [];
      R.rows.forEach(function (r, i) { hl[i] = r.w === true ? 'ok' : 'bad'; res.push(tv(r.w)); });
      var unk = R.rows.filter(function (r) { return r.w === null; }).length;
      F.push({ narr: '<b>Step 2 — WHERE ' + whereTxt + '</b> checked every row. Green rows got <span class="c-g">TRUE</span> and survive; red rows got FALSE' + (unk ? ' or <span class="c-y">UNKNOWN</span> (' + unk + ' row' + (unk > 1 ? 's' : '') + ' — NULL made the answer unknown)' : '') + ' and are thrown away. WHERE keeps <b>only TRUE</b>.', parts: [pipe('WHERE', present), srcTable(tbl, R.rows, 'WHERE result', res, hl, 'WHERE verdict per row')] });
      var kh = {}; R.kept.forEach(function (r, i) { kh[i] = 'ok'; });
      F.push({ narr: 'After WHERE only <b>' + R.kept.length + '</b> of ' + R.rows.length + ' rows remain. Everything later (SELECT, DISTINCT, ORDER BY, LIMIT) works only on these survivors.', parts: [pipe('WHERE', present), srcTable(tbl, R.kept, null, null, kh, 'Survivors after WHERE (' + R.kept.length + ' rows)')] });
    }
    var comp = R.outCols.filter(function (c) { return c.computed || c.alias; });
    F.push({
      narr: '<b>Step 3 — SELECT</b> (projection): for each surviving row the engine evaluates the select list and keeps only those columns. ' +
        (q.items.some(function (it) { return it.star; }) ? '<code>*</code> means "every column". ' : 'Other columns disappear from the output. ') +
        (comp.length ? 'New/renamed columns: ' + comp.map(function (c) { return '<b>' + H.esc(c.name) + '</b>' + (c.alias ? ' = <code>' + H.esc(show(c.node)) + '</code>' : ''); }).join(', ') + '. Aliases are born <i>here</i> — that is why standard SQL cannot use them in WHERE (step 2 already ran).' : ''),
      parts: [pipe('SELECT', present), outTable(R, R.kept, {}, 'After SELECT (' + R.kept.length + ' rows × ' + R.outCols.length + ' columns)')]
    });
    if (q.distinct) {
      var dh = {}; R.dupFlags.forEach(function (d, i) { dh[i] = d ? 'bad' : 'ok'; });
      var nd = R.dupFlags.filter(Boolean).length;
      F.push({ narr: '<b>Step 4 — DISTINCT</b> compares <i>whole output rows</i> (all selected columns together). Red rows are exact repeats of an earlier row (' + nd + ' found) and get removed. Two NULLs count as "the same" here, even though NULL = NULL is UNKNOWN in WHERE.', parts: [pipe('DISTINCT', present), outTable(R, R.kept, dh, 'DISTINCT check')] });
      var ah = {}; R.afterDistinct.forEach(function (r, i) { ah[i] = 'ok'; });
      F.push({ narr: 'After DISTINCT: <b>' + R.afterDistinct.length + '</b> unique rows.', parts: [pipe('DISTINCT', present), outTable(R, R.afterDistinct, ah, 'Unique rows')] });
    }
    if (q.order.length) {
      var desc = q.order.map(function (o) { return '<code>' + H.esc(show(o.e)) + (o.desc ? ' DESC' : ' ASC') + (o.nulls ? ' NULLS ' + o.nulls.toUpperCase() : '') + '</code>'; }).join(', then ');
      var keyCols = q.order.map(function (o, k) { return { name: '↕ ' + show(o.e), get: function (r) { return disp(r.keys[k], isRealNode(o.e, tbl)); } }; });
      if (opts.sortSteps && q.order.length > 1) {
        for (var s = 1; s < q.order.length; s++) {
          var part = R.afterDistinct.slice();
          part.sort(function (a, b) {
            for (var k = 0; k < s; k++) {
              var o = q.order[k], x = a.keys[k], y = b.keys[k];
              if (x === null && y === null) continue;
              var nf = o.nulls ? o.nulls === 'first' : !o.desc;
              if (x === null) return nf ? -1 : 1;
              if (y === null) return nf ? 1 : -1;
              var c = compare(x, y); if (c) return o.desc ? -c : c;
            }
            return a.i - b.i;
          });
          F.push({ narr: '<b>Step 5 — ORDER BY</b>, key ' + s + ' only: <code>' + H.esc(show(q.order[s - 1].e)) + (q.order[s - 1].desc ? ' DESC' : ' ASC') + '</code>. Rows that tie on this key are still in arbitrary order — the next key will break those ties.', parts: [pipe('ORDER BY', present), outTable(R, part, {}, 'Sorted by first ' + s + ' key(s)', keyCols)] });
        }
      }
      var sh = {}; if (R.sorted.length) sh[0] = 'sel';
      F.push({ narr: '<b>Step 5 — ORDER BY</b> ' + desc + '. Later keys only break ties of earlier keys. In SQLite a <span class="c-m">NULL</span> sorts as the <i>smallest</i> value (first in ASC, last in DESC) unless you write NULLS FIRST/LAST. ↕ columns show the sort keys (they are not part of the output). Without ORDER BY the row order would be <b>undefined</b>.', parts: [pipe('ORDER BY', present), outTable(R, R.sorted, sh, 'Sorted rows', keyCols)] });
    }
    if (q.limit || q.offset) {
      var lh = {}, idx = [];
      R.sorted.forEach(function (r, i) { lh[i] = i < R.off ? 'done' : (R.lim === null || i < R.off + R.lim) ? 'sel' : 'done'; idx.push(i + 1); });
      F.push({ narr: '<b>Step 6 — LIMIT ' + (R.lim === null ? 'all' : R.lim) + (R.off ? ' OFFSET ' + R.off : '') + '</b>: ' + (R.off ? 'skip the first <b>' + R.off + '</b> rows (faded), ' : '') + 'then return at most <b>' + (R.lim === null ? 'all' : R.lim) + '</b> rows (purple). LIMIT is applied <i>last</i>, after sorting — so "top N" only means something when ORDER BY is present.', parts: [pipe('LIMIT', present), outTable(R, R.sorted, lh, 'Row positions after ORDER BY', [{ name: '#', get: function (r) { return R.sorted.indexOf(r) + 1; } }])] });
    }
    var fh = {}; R.final.forEach(function (r, i) { fh[i] = 'sel'; });
    F.push({
      narr: '<b>Final result: ' + R.final.length + ' row' + (R.final.length === 1 ? '' : 's') + '.</b> Row count at each step: FROM ' + R.rows.length + (q.where ? ' → WHERE ' + R.kept.length : '') + ' → SELECT ' + R.kept.length + (q.distinct ? ' → DISTINCT ' + R.afterDistinct.length : '') + (q.order.length ? ' → ORDER BY ' + R.sorted.length : '') + ((q.limit || q.offset) ? ' → LIMIT ' + R.final.length : '') + '. Edit the query above and press Visualize to try your own.',
      parts: [pipe('', present), outTable(R, R.final, fh, 'Result set'), { type: 'vars', label: 'Rows flowing through the pipeline', vals: { from: R.rows.length, after_where: R.kept.length, after_distinct: R.afterDistinct.length, returned: R.final.length } }]
    });
    return F;
  }
  function queryViz(title, sql, opts) {
    return {
      title: title, input: sql, inputLabel: 'SQL query (tables: employees, customers, products, orders, movies)',
      gen: function (input) { return queryFrames(String(input || sql), opts); }
    };
  }


  /* ---------- extra visualizer helpers ---------- */
  // Evaluate a SELECT list one row at a time, showing the inputs and each computed value
  function rowByRowSelect(list, table, maxRows) {
    if (String(list).length > 300) throw new Error('Keep the select list under 300 characters');
    var R = runQuery('SELECT ' + list + ' FROM ' + table), F = [], tbl = R.tbl, n = Math.min(maxRows || 5, R.kept.length);
    F.push({ narr: 'The select list <code>' + H.esc(list) + '</code> is a little <b>recipe</b>. The engine runs the recipe <b>once per row</b>, like a cook filling one plate at a time. Let us watch the first ' + n + ' rows.', parts: [{ type: 'code', label: 'Recipe applied to every row', lang: 'sql', code: 'SELECT ' + list + '\nFROM ' + table + ';' }, srcTable(tbl, R.rows.slice(0, n), null, null, {}, 'Input rows (FROM ' + table + ')')] });
    for (var i = 0; i < n; i++) {
      var r = R.kept[i], vals = {}, hlv = {}, notes = [];
      tbl.cols.forEach(function (c, j) { vals[c] = r.src[j] === null ? 'NULL' : r.src[j]; });
      R.outCols.forEach(function (c, k) {
        var v = r.out[k], key = '→ ' + c.name;
        vals[key] = v === null ? 'NULL' : disp(v, c.real);
        hlv[key] = v === null ? 'bad' : 'ok';
        if (c.computed) notes.push('<b>' + H.esc(c.name) + '</b> = <code>' + H.esc(show(c.node)) + '</code> = ' + (v === null ? '<span class="c-y">NULL</span> (some input was NULL, so the whole result is NULL)' : H.esc(fmtVal(disp(v, c.real)))));
      });
      var hl = {}; for (var k = 0; k < i; k++) hl[k] = 'done'; hl[i] = 'ok';
      F.push({ narr: 'Row ' + (i + 1) + ' (' + H.esc(String(r.src[1])) + '): ' + (notes.length ? notes.join('; ') : 'plain columns are just copied across') + '.', parts: [{ type: 'vars', label: 'Row ' + (i + 1) + ': inputs and computed outputs', vals: vals, hl: hlv }, outTable(R, R.kept.slice(0, i + 1), hl, 'Output being built')] });
    }
    F.push({ narr: 'Same recipe, every row, no loops written by you — SQL is <b>declarative</b>: you describe the shape of the answer and the engine does the iterating. Column names come from the alias (AS …) or, if there is none, from the expression text itself.', parts: [outTable(R, R.kept, {}, 'Full output (' + R.kept.length + ' rows)')] });
    return F;
  }

  /* =====================================================================
     TOPIC 1 — SELECT: columns, expressions, aliases
     ===================================================================== */
  topics.push({
    title: 'SELECT: Picking Columns, Computing Expressions & Naming Them with Aliases',
    analogy: `<p>Imagine a huge spreadsheet with 50 columns about every employee. Your manager asks: <i>"Just send me names and salaries."</i> You would <b>hide</b> the other 48 columns and maybe <b>add</b> one new column like "salary × 12". That is exactly what <code>SELECT</code> does: it is the <b>camera frame</b> you point at a table — you choose which columns appear in the photo, and you can paint new columns (calculations) onto it. An <b>alias</b> is the sticky-note label you put on top of a column so the reader knows what it means.</p>`,
    explain: `<p><b>SELECT</b> is the part of a query that decides <b>which columns</b> come out and <b>what they are called</b>. The smallest query is:</p>
<pre>SELECT name, salary FROM employees;</pre>
<p>Read it as: <i>"From the employees table, give me the name and salary columns."</i> Key ideas, in plain words:</p>
<ul>
<li><b>Column list</b> — separate columns with commas. The output keeps <i>your</i> order, not the table's order.</li>
<li><b><code>*</code> (star)</b> — "every column". Great for exploring, risky in real apps (more on that in the deep dive).</li>
<li><b>Expressions</b> — you can calculate: <code>salary * 12</code>, <code>price - 100</code>, <code>UPPER(name)</code>, <code>first || ' ' || last</code> (<code>||</code> glues text together). The calculation runs <b>once per row</b>.</li>
<li><b>Aliases</b> — <code>salary * 12 AS annual_pay</code> names the new column. <code>AS</code> is optional (<code>salary * 12 annual_pay</code> also works) but writing it is clearer. Use double quotes for names with spaces: <code>AS "Annual Pay"</code>.</li>
<li><b>Literals</b> — fixed values like <code>'hello'</code> (text uses <b>single</b> quotes) or <code>42</code> appear on every row.</li>
</ul>
${H.table(['You write', 'Output column name', 'Value for Priya (salary 250000)'], [['<code>salary</code>', 'salary', '250000'], ['<code>salary * 12</code>', 'salary * 12', '3000000'], ['<code>salary * 12 AS annual_pay</code>', '<span class="c-g">annual_pay</span>', '3000000'], ['<code>salary / 12</code>', 'salary / 12', H.c('r', '20833 (integer division!)')], ['<code>salary / 12.0</code>', 'salary / 12.0', H.c('g', '20833.333…')]])}
<p>Two beginner traps: <b>NULL spreads</b> — <code>salary + bonus</code> is NULL when bonus is NULL (unknown + 5 = unknown); and <b>integer division</b> — in SQLite, PostgreSQL and SQL Server, <code>7 / 2</code> is <code>3</code> because both sides are whole numbers (MySQL and Oracle return 3.5). Write <code>7 / 2.0</code> or <code>CAST(7 AS REAL) / 2</code> when you need decimals.</p>`,
    clues: [
      '"Return the <b>name and email</b> of…" → a plain column list, not <code>SELECT *</code>',
      '"Output column should be named <code>total_price</code>" → you need an <b>alias</b> (<code>AS total_price</code>); auto-graders compare column names',
      '"Show the annual salary / price after tax / full name" → a <b>computed expression</b> in the select list',
      '"Average to two decimal places", "percentage" → watch for <b>integer division</b>; use <code>12.0</code> or CAST, then <code>ROUND(x, 2)</code>',
      '"Some employees have no bonus" + arithmetic on bonus → NULL propagation; reach for <code>COALESCE(bonus, 0)</code>',
      '"Column name contains a space" or is a keyword (e.g. <code>order</code>) → quote the identifier with double quotes'
    ],
    code: [{ lang: 'sql', db: 'hr', title: 'Columns, expressions and aliases (runnable)', code: `-- Pick columns in the order YOU want, compute new ones, and label them.
SELECT name,                                   -- plain column
       dept,
       salary,
       salary * 12            AS annual_pay,   -- computed per row
       ROUND(salary / 12.0, 2) AS monthly_pay,  -- 12.0 avoids integer division
       UPPER(title)           AS title_caps,   -- built-in function
       'FY2026'               AS fiscal_year   -- literal: same value on every row
FROM employees;` }],
    codeTitle: ['Runnable reference query'],
    viz: [
      queryViz('SELECT pipeline: FROM → SELECT', "SELECT name, salary, salary * 12 AS annual_pay, UPPER(dept) AS team FROM employees"),
      {
        title: 'Row-by-row evaluation of the select list (watch NULL spread)',
        input: "name, salary * 12 AS annual, salary + bonus AS total_comp, name || ' - ' || dept AS label",
        inputLabel: 'Select list for employees (no SELECT/FROM needed)',
        gen: function (input) { return rowByRowSelect(String(input || ''), 'employees', 5); }
      }
    ],
    examples: [
      {
        title: 'SELECT * versus naming your columns',
        html: `<p><code>SELECT *</code> returns all 9 employee columns — handy while exploring a new table. In application code, list the columns you need: the result stays the same shape even if someone later adds a column, less data travels over the network, and the reader instantly sees what you depend on.</p>`,
        code: { lang: 'sql', db: 'hr', code: `-- Exploring: fine
SELECT * FROM employees LIMIT 3;

-- Production: explicit, stable, cheaper
SELECT id, name, email FROM employees;` }
      },
      {
        title: 'The integer-division surprise',
        html: `<p>Aisha earns 95000 a year. <code>95000 / 12</code> gives <b>${H.c('r', '7916')}</b> in SQLite because both numbers are integers, so the remainder is thrown away. <code>95000 / 12.0</code> gives ${H.c('g', '7916.666…')}, and <code>ROUND(…, 2)</code> makes it ${H.c('g', '7916.67')}. Interviewers love this when asking for "average rating" or "percentage of orders".</p>`,
        code: { lang: 'sql', db: 'hr', code: `SELECT name,
       salary / 12              AS wrong_monthly,  -- 7916 for Aisha
       salary / 12.0            AS exact_monthly,  -- 7916.666...
       ROUND(salary / 12.0, 2)  AS monthly_pay     -- 7916.67
FROM employees
WHERE name = 'Aisha Bello';` }
      },
      {
        title: 'Gluing text with || and what NULL does to it',
        html: `<p>Marco has no email (NULL). <code>name || ' &lt;' || email || '&gt;'</code> becomes <b>NULL for the whole row</b> — one unknown piece makes the whole sentence unknown. <code>COALESCE(email, 'no email')</code> swaps NULL for a fallback. (MySQL uses <code>CONCAT()</code>; in MySQL <code>||</code> means OR unless PIPES_AS_CONCAT is on.)</p>`,
        code: { lang: 'sql', db: 'hr', code: `SELECT name,
       name || ' <' || email || '>'                       AS contact_raw,   -- NULL for Marco & Rahul
       name || ' <' || COALESCE(email, 'no email') || '>' AS contact_safe
FROM employees
WHERE dept = 'Engineering' OR dept IS NULL;` }
      },
      {
        title: 'Quoted aliases and SELECT without FROM',
        html: `<p>Double quotes name a column ("identifier"); single quotes make a text value. SQL can also be a calculator: a SELECT with no FROM returns exactly one row. Note the alias with a space must be quoted.</p>`,
        code: { lang: 'sql', db: 'hr', code: `SELECT 6 * 7          AS answer,
       'hello' || '!' AS greeting,
       10 / 4         AS int_div,     -- 2
       10 / 4.0       AS real_div;    -- 2.5

SELECT name AS "Employee Name", salary AS "Yearly Salary" FROM employees LIMIT 2;` }
      }
    ],
    deepDive: `<p><b>Relational algebra view.</b> SELECT's column list is the <b>projection</b> operator π: it keeps some attributes and drops the rest. Pure relational algebra also removes duplicate rows after projecting; SQL deliberately does <i>not</i> (it works on <b>bags/multisets</b>), which is why <code>DISTINCT</code> exists as a separate, optional step.</p>
<p><b>Why <code>SELECT *</code> hurts in production.</b> (1) <i>Schema drift</i>: adding a column silently changes your result shape and can break positional code or <code>INSERT … SELECT *</code>. (2) <i>I/O</i>: wide TEXT/JSON/BLOB columns are read and shipped even if unused; in column stores (BigQuery, Snowflake, Redshift, DuckDB) you <b>pay per column scanned</b>, so <code>*</code> literally costs money. (3) <i>Covering indexes</i>: if an index contains every requested column the engine can skip the table entirely ("index-only scan"); <code>*</code> almost always defeats that.</p>
<p><b>Alias scope.</b> An alias is created during the SELECT step. Standard SQL lets you use it in <code>ORDER BY</code> but <b>not</b> in WHERE/GROUP BY/HAVING of the same query, and not even in another expression of the same select list. SQLite (and MySQL in GROUP BY/HAVING) are lenient — portable code should not rely on that. You also cannot write <code>SELECT salary*12 AS a, a + 1</code> in standard SQL.</p>
<p><b>Quoting rules.</b> Standard SQL: <code>'text'</code> = string literal, <code>"name"</code> = identifier. MySQL uses backticks by default; SQL Server uses <code>[brackets]</code>. SQLite has a dangerous legacy quirk: if <code>"xyz"</code> does not match any column, it silently treats it as the <i>string</i> 'xyz'. Quoted identifiers are also case-sensitive in PostgreSQL (<code>"Name"</code> ≠ <code>name</code>), while unquoted names fold to lower case.</p>
<p><b>Types &amp; arithmetic.</b> Integer ÷ integer truncates toward zero in SQLite/Postgres/SQL Server; MySQL's <code>/</code> always returns a decimal (use <code>DIV</code> for integer division); Oracle returns NUMBER. SQLite has dynamic typing with <i>type affinity</i>: a column declared INTEGER can still hold text, and comparisons convert based on affinity. Expressions are evaluated per row, but deterministic expressions over constants (<code>2*3</code>) are folded once at plan time.</p>`,
    aiEra: `<p><b>What AI changes:</b> asking "write a query for names and yearly salary" gets you correct-looking SQL in seconds, so the interview value shifts from <i>typing</i> SELECT to <b>reading it critically</b>. <b>Use AI as a partner:</b> paste your table's <code>CREATE TABLE</code> statement first (schema-grounding), then ask: <code>List every column my report needs and flag any that may be NULL</code>, or <code>Rewrite this SELECT * into explicit columns</code>. <b>Where AI goes wrong:</b> it invents column names that "sound right" (<code>employee_name</code> instead of <code>name</code>), uses MySQL <code>CONCAT</code> in SQLite or <code>||</code> in MySQL, forgets integer division, and happily emits <code>SELECT *</code> in production code. Text-to-SQL tools in BI products (2026) are good on simple projections and still weak on dialect details. <b>What you must still own:</b> knowing exactly what each column means, spotting NULL propagation, choosing explicit columns for stability and cost, and checking the result against a few rows you can verify by hand.</p>`,
    problems: [{
      title: 'Monthly Pay Slip', level: 'Easy', tags: ['select', 'alias', 'expressions'], companies: ['Infosys', 'TCS', 'Amazon'],
      statement: `<p>Payroll needs a pay-slip view. For <b>every</b> employee return three columns, exactly named: <code>name</code>, <code>yearly_salary</code> (the salary column) and <code>monthly_pay</code> (salary ÷ 12, as a decimal rounded to 2 places). Table: <code>employees(id, name, dept, title, salary, bonus, manager_id, hire_date, email)</code>.</p>`,
      constraints: `<p>12 employees; salary is an INTEGER and never NULL here. Output column names are checked by the grader. Row order does not matter.</p>`,
      example: `${H.table(['name', 'yearly_salary', 'monthly_pay'], [['Priya Sharma', '250000', '20833.33'], ['Aisha Bello', '95000', H.c('g', '7916.67')], ['Tom Becker', '90000', '7500.0'], ['…', '…', '…']])}<p>Aisha: 95000 ÷ 12 = 7916.666… → rounded to ${H.c('g', '7916.67')}. With integer division you would wrongly get ${H.c('r', '7916')}.</p>`,
      brute: { why: `<p>The quick version divides two integers, so SQLite <b>truncates</b> (7916 instead of 7916.67), and the columns come out named <code>salary</code> and <code>salary/12</code> — the grader expecting <code>yearly_salary</code>/<code>monthly_pay</code> marks it wrong even where the numbers match.</p>`, code: { lang: 'sql', db: 'hr', code: `-- Naive: integer division + unlabeled columns
SELECT name, salary, salary/12
FROM employees;` } },
      mcq: { q: 'In SQLite, what does <code>SELECT 95000 / 12</code> return?', options: ['7916', '7916.67', '7916.666666…', 'An error'], answer: 0, explain: 'Both operands are integers, so SQLite does integer division and drops the remainder. Make one side a real number (12.0) to get decimals.' },
      hints: [
        `<p>Hint 1: the grader checks column <b>names</b> — every computed or renamed column needs an <code>AS alias</code>.</p>`,
        `<p>Hint 2: integer ÷ integer truncates. Divide by <code>12.0</code> (or <code>CAST(salary AS REAL)</code>) to keep the fraction.</p>`,
        `<p>Hint 3: wrap the division in <code>ROUND(x, 2)</code>. Recipe: <code>SELECT name, salary AS yearly_salary, ROUND(salary / 12.0, 2) AS monthly_pay FROM employees;</code></p>`
      ],
      solution: {
        approach: `<p>Pure projection: no filtering needed. Rename <code>salary</code> with an alias, compute the monthly figure using a REAL divisor so no precision is lost, and round to cents. No ORDER BY because order was not requested (add <code>ORDER BY name</code> if the output must be deterministic for tests).</p>`,
        code: { lang: 'sql', db: 'hr', code: `SELECT name,
       salary                  AS yearly_salary,
       ROUND(salary / 12.0, 2) AS monthly_pay   -- 12.0 forces real division
FROM employees;` },
        alt: [{ lang: 'sql', db: 'hr', title: 'Using CAST (portable to Postgres/SQL Server)', code: `SELECT name,
       salary AS yearly_salary,
       ROUND(CAST(salary AS REAL) / 12, 2) AS monthly_pay
FROM employees;` }],
        complexity: `<p>One sequential pass over the table: <b>O(N)</b> time, O(1) extra memory per row (streamed). No index can help because every row is needed.</p>`,
        followUps: ['Also show <code>monthly_bonus</code> where bonus may be NULL — print 0 instead of NULL.', 'In PostgreSQL, <code>ROUND(double precision, int)</code> does not exist — how would you cast?', 'Why might money be stored in integer cents instead of REAL?']
      }
    }]
  });

  // Turn a WHERE condition into a level-order tree and evaluate it row by row
  function treeFrames(cond, table, opts) {
    opts = opts || {};
    if (String(cond).length > 250) throw new Error('Keep the condition under 250 characters');
    var tbl = DATA[table], P = new Parser(tokenize(String(cond)));
    var root = P.expr();
    if (P.peek()) throw new Error('Did not understand "' + P.near() + '" — enter only the condition, e.g. dept = \'Sales\' OR salary > 100000');
    var arr = [], nodes = [], leafNo = 0, legend = [];
    function unwrap(n) { while (n.t === 'par') n = n.e; return n; }
    function place(n, idx) {
      n = unwrap(n);
      if (idx > 14) throw new Error('Condition is too deeply nested for the tree view (max 4 levels)');
      while (arr.length <= idx) arr.push(null);
      nodes[idx] = n;
      if (n.t === 'and' || n.t === 'or') { arr[idx] = n.t.toUpperCase(); place(n.l, 2 * idx + 1); place(n.r, 2 * idx + 2); }
      else if (n.t === 'not') { arr[idx] = 'NOT'; place(n.e, 2 * idx + 1); }
      else { leafNo++; arr[idx] = 'c' + leafNo; legend.push(['c' + leafNo, '<code>' + H.esc(show(n)) + '</code>']); }
    }
    place(root, 0);
    var F = [];
    F.push({ narr: 'The engine first <b>parses</b> your condition into a tree. Precedence decides the shape: <b>NOT</b> binds tightest, then <b>AND</b>, then <b>OR</b> — exactly like × before + in maths. Parentheses override it. Leaves c1, c2… are the simple tests.', parts: [{ type: 'tree', label: 'Parse tree of: ' + H.esc(show(root)), arr: arr }, { type: 'table', label: 'Leaf tests', columns: ['leaf', 'test'], rows: legend.map(function (l) { return [l[0], show(nodes[arr.indexOf(l[0])])]; }) }] });
    var rows = tbl.rows.slice(0, opts.maxRows || 12);
    rows.forEach(function (r, ri) {
      var env = makeEnv(tbl, r), hl = {}, tags = {};
      arr.forEach(function (lab, idx) {
        if (lab === null) return;
        var v = truth(evalNode(nodes[idx], env));
        hl[idx] = v === true ? 'ok' : v === false ? 'bad' : 'cur';
        tags[idx] = v === true ? 'T' : v === false ? 'F' : '?';
      });
      var res = truth(evalNode(root, env));
      var vals = {};
      tbl.cols.forEach(function (c, j) { if (opts.cols ? opts.cols.indexOf(c) >= 0 : j < 6) vals[c] = r[j] === null ? 'NULL' : r[j]; });
      F.push({
        narr: 'Row ' + (ri + 1) + ' (<b>' + H.esc(String(r[1])) + '</b>): leaves are evaluated, then results flow <b>up</b> the tree. Green = TRUE, red = FALSE, amber = UNKNOWN (NULL involved). Root = ' + tvc(res) + ' → ' + (res === true ? '<span class="c-g">row kept</span>' : '<span class="c-r">row dropped</span>') + '.',
        parts: [{ type: 'vars', label: 'Current row', vals: vals }, { type: 'tree', label: 'Evaluated tree (T / F / ?)', arr: arr, hl: hl, tags: tags }]
      });
    });
    return F;
  }

  /* =====================================================================
     TOPIC 2 — WHERE with comparison & logical operators
     ===================================================================== */
  topics.push({
    title: 'WHERE: Comparison Operators, AND / OR / NOT and Precedence',
    analogy: `<p>Think of a <b>bouncer at a club door</b> holding a checklist: "age ≥ 21 <b>AND</b> (on the guest list <b>OR</b> VIP)". Every person (row) walks up, the bouncer checks the list, and only those who get a clear <b>YES</b> walk in. Everyone else is turned away — and the bouncer never changes what people look like, he only decides <i>who gets in</i>. <code>WHERE</code> is that bouncer: it filters <b>rows</b>; SELECT later decides which <b>columns</b> you see.</p>`,
    explain: `<p><code>WHERE</code> holds a <b>condition</b> (a yes/no question). The engine asks it for <b>every row</b>; rows answering <span class="c-g">TRUE</span> stay, all others are removed.</p>
<pre>SELECT name, salary FROM employees WHERE salary &gt; 100000;</pre>
<p><b>Comparison operators</b> (work for numbers, text and ISO dates):</p>
${H.table(['Operator', 'Meaning', 'Example', 'Note'], [['<code>=</code>', 'equal', "<code>dept = 'Sales'</code>", 'one = in SQL (not ==, though SQLite accepts ==)'], ['<code>&lt;&gt;</code> or <code>!=</code>', 'not equal', "<code>status &lt;&gt; 'cancelled'</code>", '&lt;&gt; is the SQL standard'], ['<code>&lt;  &lt;=</code>', 'less (or equal)', '<code>price &lt; 500</code>', ''], ['<code>&gt;  &gt;=</code>', 'greater (or equal)', "<code>hire_date &gt;= '2020-01-01'</code>", "ISO text dates compare correctly"]])}
<p><b>Logical operators</b> combine tests:</p>
<ul>
<li><code>A AND B</code> — both must be TRUE.</li>
<li><code>A OR B</code> — at least one must be TRUE.</li>
<li><code>NOT A</code> — flips TRUE ↔ FALSE.</li>
</ul>
<p><b>Precedence (the #1 WHERE bug):</b> <code>NOT</code> first, then <code>AND</code>, then <code>OR</code> — like × before + in school maths. So</p>
<pre>WHERE dept = 'Sales' OR dept = 'Marketing' AND salary &gt; 90000</pre>
<p>is read as <code>dept = 'Sales' OR (dept = 'Marketing' AND salary &gt; 90000)</code> — <i>every</i> Sales person sneaks in regardless of salary. When you mix AND and OR, <b>always add parentheses</b>: <code>(dept = 'Sales' OR dept = 'Marketing') AND salary &gt; 90000</code>.</p>
<p><b>Text comparisons</b>: in SQLite, PostgreSQL and Oracle, <code>=</code> on text is <b>case-sensitive</b> (<code>'sales' ≠ 'Sales'</code>); MySQL and SQL Server usually are case-<i>insensitive</i> because of their default collations. Strings are always in <b>single quotes</b>.</p>`,
    clues: [
      '"employees in Sales <b>or</b> Marketing who earn <b>more than</b> 90k" → mixed AND/OR → parentheses are mandatory',
      '"hired <b>on or after</b> 2020" → <code>&gt;=</code> (not &gt;); read inclusive vs exclusive words carefully',
      '"<b>not</b> in the Sales department" → <code>&lt;&gt;</code> / NOT — and ask yourself what happens to NULL departments',
      '"case-insensitive match" → <code>LOWER(col) = \'x\'</code> or <code>COLLATE NOCASE</code>',
      '"filter rows" / "only include" / "exclude" → that is WHERE (row filter), not SELECT (column chooser)',
      'Dates stored as text <code>YYYY-MM-DD</code> → plain string comparison works because the format sorts chronologically'
    ],
    code: [{ lang: 'sql', db: 'hr', title: 'Comparison + logical operators (runnable)', code: `-- Sales or Marketing people earning more than 90k.
-- Parentheses make the OR happen first; without them AND would bind tighter.
SELECT name, dept, salary
FROM employees
WHERE (dept = 'Sales' OR dept = 'Marketing')
  AND salary > 90000;

-- Dates stored as ISO text compare correctly as strings
SELECT name, hire_date
FROM employees
WHERE hire_date >= '2020-01-01' AND hire_date < '2023-01-01';` }],
    codeTitle: ['Runnable reference queries'],
    viz: [
      queryViz('WHERE checks every row (with parentheses)', "SELECT name, dept, salary FROM employees WHERE (dept = 'Sales' OR dept = 'Marketing') AND salary > 90000", { stepWhere: true }),
      {
        title: 'Precedence: the parse tree of a WHERE condition',
        input: "dept = 'Sales' OR dept = 'Marketing' AND salary > 90000",
        inputLabel: 'WHERE condition on employees (try adding parentheses)',
        gen: function (input) { return treeFrames(String(input || ''), 'employees', { cols: ['name', 'dept', 'salary'], maxRows: 9 }); }
      }
    ],
    examples: [
      {
        title: 'Same words, different answer: the missing parentheses',
        html: `<p>Without parentheses the query returns <b>Tom Becker (Sales, 90000)</b> — wrong, he does not earn more than 90k. AND grabbed <code>dept = 'Marketing' AND salary &gt; 90000</code> first, then OR let <i>any</i> Sales person in.</p>${H.table(['Query', 'Rows'], [['no parentheses', 'Sara, ' + H.c('r', 'Tom') + ', Aisha, Kenji'], ['with parentheses', 'Sara, Aisha, Kenji']])}`,
        code: { lang: 'sql', db: 'hr', code: `-- BUG: reads as Sales OR (Marketing AND salary > 90000)
SELECT name, dept, salary FROM employees
WHERE dept = 'Sales' OR dept = 'Marketing' AND salary > 90000;

-- FIX
SELECT name, dept, salary FROM employees
WHERE (dept = 'Sales' OR dept = 'Marketing') AND salary > 90000;` }
      },
      {
        title: 'NOT and De Morgan\'s laws',
        html: `<p>"Not (Sales or under 100k)" equals "not Sales <b>and</b> at least 100k". De Morgan: <code>NOT (A OR B) = NOT A AND NOT B</code> and <code>NOT (A AND B) = NOT A OR NOT B</code>. These laws still hold with SQL's UNKNOWN value, so rewriting is safe — but remember both forms drop rows where the answer is UNKNOWN.</p>`,
        code: { lang: 'sql', db: 'hr', code: `SELECT name, dept, salary FROM employees
WHERE NOT (dept = 'Sales' OR salary < 100000);

-- Same result, De Morgan form
SELECT name, dept, salary FROM employees
WHERE dept <> 'Sales' AND salary >= 100000;` }
      },
      {
        title: 'Case sensitivity and dates as text',
        html: `<p><code>dept = 'engineering'</code> returns <b>zero rows</b> in SQLite because <code>=</code> compares text exactly. Use <code>LOWER(dept) = 'engineering'</code> or <code>dept = 'engineering' COLLATE NOCASE</code>. Dates stored as <code>'YYYY-MM-DD'</code> text sort like real dates, so a range "2020 through 2022" is <code>&gt;= '2020-01-01' AND &lt; '2023-01-01'</code> (half-open — safe even if times are added later).</p>`,
        code: { lang: 'sql', db: 'hr', code: `SELECT COUNT(*) AS exact_match FROM employees WHERE dept = 'engineering';           -- 0
SELECT COUNT(*) AS lower_match FROM employees WHERE LOWER(dept) = 'engineering';    -- 5
SELECT COUNT(*) AS nocase      FROM employees WHERE dept = 'engineering' COLLATE NOCASE;

SELECT name, hire_date FROM employees
WHERE hire_date >= '2020-01-01' AND hire_date < '2023-01-01';` }
      },
      {
        title: 'Filter on a computed expression',
        html: `<p>WHERE can test any expression, not only raw columns: "employees whose salary plus bonus beats 140k". Notice the NULL bonus problem — Arjun (160000, bonus NULL) vanishes unless you use <code>COALESCE</code>. Also note: wrapping a column in a function/arithmetic can stop an index from being used (a "non-sargable" predicate, covered in the optimisation module).</p>`,
        code: { lang: 'sql', db: 'hr', code: `SELECT name, salary, bonus
FROM employees
WHERE salary + COALESCE(bonus, 0) > 140000;` }
      }
    ],
    deepDive: `<p><b>How engines evaluate WHERE.</b> The condition is compiled into an expression tree (see the visualizer). For each candidate row the leaves are evaluated and combined. The SQL standard does <b>not</b> promise left-to-right or short-circuit evaluation: <code>WHERE x &lt;&gt; 0 AND 10 / x &gt; 1</code> is not guaranteed safe — the optimizer may reorder conjuncts (cheapest or most selective first). Use <code>CASE</code> or <code>NULLIF</code> to guard divisions (SQLite returns NULL on division by zero; PostgreSQL raises an error).</p>
<p><b>Conjunctive normal form and indexes.</b> Planners split WHERE into AND-ed pieces ("conjuncts"). Each conjunct like <code>salary &gt; 100000</code> can be matched to an index; an <code>OR</code> across different columns is harder — engines either scan, or do an "OR-by-union" / bitmap-OR of two index lookups. A predicate the index can use directly is called <b>sargable</b> (Search ARGument ABLE): <code>col op constant</code>. <code>LOWER(col) = 'x'</code>, <code>col + 1 = 5</code>, <code>SUBSTR(col,1,3) = 'abc'</code> are not sargable unless you build an expression index.</p>
<p><b>Comparison semantics across types.</b> SQLite uses type affinity: comparing an INTEGER column with <code>'100'</code> converts the text to a number. PostgreSQL is strict and errors on mismatched types without a cast. MySQL silently converts <code>'abc'</code> to 0 — the source of classic bugs (<code>WHERE id = '1abc'</code> matches id 1). Text comparison follows the <b>collation</b>: binary (code points, case-sensitive), NOCASE, or locale-aware ICU collations where <code>'é'</code> sorts next to <code>'e'</code>.</p>
<p><b>Floating point.</b> <code>WHERE price = 0.1 + 0.2</code> can fail because 0.1 + 0.2 = 0.30000000000000004 in binary floating point. Store money as integer cents or DECIMAL/NUMERIC, and compare floats with a tolerance (<code>ABS(a - b) &lt; 1e-9</code>).</p>
<p><b>Performance reality.</b> A WHERE that matches 1% of 100M rows with an index reads ~1M rows; without an index it reads all 100M. Writing filters as simple column-versus-constant comparisons is the cheapest optimisation you will ever make.</p>`,
    aiEra: `<p><b>What AI changes:</b> natural-language-to-SQL tools turn "Sales or Marketing earning over 90k" into a WHERE clause instantly — and very often get the <b>AND/OR grouping</b> wrong in exactly the way shown above, because English is ambiguous too. <b>Use AI as a partner:</b> ask it to <code>add explicit parentheses to every mixed AND/OR condition and explain each group in one sentence</code>, or to <code>generate 5 test rows that would distinguish A OR (B AND C) from (A OR B) AND C</code>. Ask it to point out non-sargable filters on large tables. <b>Where AI goes wrong:</b> assumes case-insensitive equality (MySQL habits) on PostgreSQL/SQLite, compares dates stored in non-ISO formats as strings, uses <code>BETWEEN</code> on timestamps, and forgets NULLs in <code>&lt;&gt;</code> filters. <b>What you must still own:</b> translating the business sentence into precise logic (inclusive vs exclusive, what "not" means for missing data) and proving it with edge-case rows.</p>`,
    problems: [{
      title: 'Sales or Marketing Staff Earning Over 90k', level: 'Easy', tags: ['where', 'and-or', 'precedence'], companies: ['Amazon', 'Deloitte', 'Accenture'],
      statement: `<p>HR wants every employee who works in <b>Sales or Marketing</b> and earns <b>more than 90,000</b>. Return <code>name, dept, salary</code>, highest salary first.</p>`,
      constraints: `<p><code>employees</code> has 12 rows; <code>dept</code> may be NULL. "More than" is strict (&gt;). </p>`,
      example: `${H.table(['name', 'dept', 'salary'], [['Sara Johnson', 'Sales', '250000'], ['Kenji Tanaka', 'Marketing', '130000'], ['Aisha Bello', 'Sales', '95000']])}<p>Tom Becker (Sales, ${H.c('r', '90000')}) is excluded: 90000 is not <i>more than</i> 90000. Olivia (Marketing, 85000) is excluded too.</p>`,
      brute: { why: `<p>Writing the sentence left to right without parentheses gives <code>dept = 'Sales' OR (dept = 'Marketing' AND salary &gt; 90000)</code> because AND binds tighter than OR. Every Sales employee passes regardless of salary, so ${H.c('r', 'Tom Becker (90000)')} wrongly appears.</p>`, code: { lang: 'sql', db: 'hr', code: `SELECT name, dept, salary
FROM employees
WHERE dept = 'Sales' OR dept = 'Marketing' AND salary > 90000   -- AND binds first!
ORDER BY salary DESC;` } },
      mcq: { q: 'How does SQL read <code>A OR B AND C</code>?', options: ['<code>A OR (B AND C)</code>', '<code>(A OR B) AND C</code>', 'Left to right, whichever comes first', 'It is a syntax error'], answer: 0, explain: 'AND has higher precedence than OR (like multiplication over addition), so B AND C is grouped first.' },
      hints: [
        `<p>Hint 1: there are two separate requirements — department is one of two values, <i>and</i> salary is above a threshold.</p>`,
        `<p>Hint 2: group the department test in parentheses, or use <code>dept IN ('Sales', 'Marketing')</code> which is a single test.</p>`,
        `<p>Hint 3: "more than" means <code>&gt;</code> not <code>&gt;=</code>; finish with <code>ORDER BY salary DESC</code>.</p>`
      ],
      solution: {
        approach: `<p>Make the OR explicit with parentheses so the salary condition applies to both departments. <code>IN</code> is an equivalent, tidier spelling. NULL departments are naturally excluded because <code>NULL = 'Sales'</code> is UNKNOWN.</p>`,
        code: { lang: 'sql', db: 'hr', code: `SELECT name, dept, salary
FROM employees
WHERE (dept = 'Sales' OR dept = 'Marketing')
  AND salary > 90000
ORDER BY salary DESC;` },
        alt: [{ lang: 'sql', db: 'hr', title: 'Same logic with IN', code: `SELECT name, dept, salary
FROM employees
WHERE dept IN ('Sales', 'Marketing') AND salary > 90000
ORDER BY salary DESC;` }],
        complexity: `<p>Full scan O(N) without indexes. With an index on <code>(dept, salary)</code> the engine can do two small range lookups (one per department) and read only matching rows.</p>`,
        followUps: ['Make it "Sales earning over 90k OR anyone in Marketing" — where do the parentheses go now?', 'How would you make the department match case-insensitive?', 'What changes if salary can be NULL?']
      }
    }]
  });

  // Animate LIKE matching: which characters each pattern piece consumed
  function likeFrames(pattern) {
    pattern = String(pattern);
    if (!pattern.length || pattern.length > 30) throw new Error('Enter a LIKE pattern of 1–30 characters, e.g. _o%  or  %mug%');
    var toks = [], i;
    for (i = 0; i < pattern.length; i++) toks.push(pattern[i]);
    var re = new RegExp('^' + toks.map(function (c) { return c === '%' ? '([\\s\\S]*?)' : c === '_' ? '([\\s\\S])' : '(' + c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')'; }).join('') + '$', 'i');
    var names = DATA.products.rows.map(function (r) { return r[1]; }), F = [], hits = [];
    F.push({ narr: 'Pattern <code>' + H.esc(pattern) + '</code>: <span class="c-b">%</span> = "any run of characters, even none", <span class="c-y">_</span> = "exactly one character", everything else must match literally (SQLite LIKE ignores upper/lower case for A–Z). The pattern must cover the <b>whole</b> value, not just part of it.', parts: [{ type: 'array', label: 'pattern pieces', values: toks, hl: toks.reduce(function (o, c, k) { o[k] = c === '%' ? 'win' : c === '_' ? 'cur' : 'ok'; return o; }, {}) }] });
    names.forEach(function (nm) {
      var chars = nm.split(''), m = re.exec(nm), hl = {};
      if (m) {
        var pos = 0;
        for (var g = 1; g < m.length; g++) {
          var len = m[g].length, kind = toks[g - 1] === '%' ? 'win' : toks[g - 1] === '_' ? 'cur' : 'ok';
          for (var k = 0; k < len; k++) hl[pos + k] = kind;
          pos += len;
        }
        hits.push(nm);
      } else chars.forEach(function (c, k) { hl[k] = 'bad'; });
      F.push({ narr: '<b>' + H.esc(nm) + '</b> LIKE <code>' + H.esc(pattern) + '</code> → ' + (m ? '<span class="c-g">TRUE</span>: green = literal letters matched, amber = consumed by _, blue = swallowed by %.' : '<span class="c-r">FALSE</span>: no way to line the pattern up with the whole value.'), parts: [{ type: 'array', label: 'name', values: chars, hl: hl }, { type: 'set', label: 'matches so far', items: hits.slice() }] });
    });
    F.push({ narr: '<b>' + hits.length + '</b> of ' + names.length + ' product names match. Want a literal % or _? Escape it: <code>LIKE \'%\\_%\' ESCAPE \'\\\'</code>.', parts: [{ type: 'set', label: 'Rows that pass WHERE name LIKE \'' + H.esc(pattern) + '\'', items: hits }] });
    return F;
  }

  /* =====================================================================
     TOPIC 3 — IN, BETWEEN, LIKE
     ===================================================================== */
  topics.push({
    title: 'IN, BETWEEN & LIKE: Lists, Ranges and Pattern Matching',
    analogy: `<p>Three shortcuts you already use in real life: a <b>guest list</b> at the door ("is your name on this list?" → <code>IN</code>), a <b>height bar</b> at a theme-park ride ("between 120 cm and 190 cm, both included" → <code>BETWEEN</code>), and the <b>contact search</b> on your phone where typing "ra" finds Rahul and Rana ("starts with ra…" → <code>LIKE 'ra%'</code>). They do nothing you could not write with <code>=</code>, <code>&gt;=</code> and OR — they just make the condition short and readable.</p>`,
    explain: `<p><b>IN — match any value in a list</b></p>
<pre>WHERE category IN ('Kitchen', 'Fitness', 'Apparel')
-- same as: category = 'Kitchen' OR category = 'Fitness' OR category = 'Apparel'</pre>
<p><code>NOT IN (…)</code> means "none of these". ⚠ If the list contains a <b>NULL</b>, <code>NOT IN</code> returns no rows at all (explained in the NULL topic).</p>
<p><b>BETWEEN — inclusive range</b></p>
<pre>WHERE price BETWEEN 500 AND 1500     -- same as price &gt;= 500 AND price &lt;= 1500</pre>
<p>Both ends are <b>included</b>. The smaller value must come first: <code>BETWEEN 1500 AND 500</code> matches nothing. It works on text and ISO dates too, but be careful with date-<i>times</i>: <code>BETWEEN '2024-08-01' AND '2024-08-31'</code> misses <code>'2024-08-31 14:00'</code>. Prefer a half-open range <code>&gt;= '2024-08-01' AND &lt; '2024-09-01'</code>.</p>
<p><b>LIKE — simple pattern matching on text</b></p>
${H.table(['Pattern', 'Means', 'Matches', 'Does not match'], [["<code>'Wi%'</code>", 'starts with Wi', 'Wireless Mouse', 'Mouse'], ["<code>'%Mat'</code>", 'ends with Mat', 'Yoga Mat', 'Matcha'], ["<code>'%pen%'</code>", 'contains pen anywhere', 'Gel Pen 10-pack', 'Notebook A5'], ["<code>'_o%'</code>", '2nd letter is o', 'Yoga Mat, Coffee Mug, Notebook A5', 'Desk Lamp'], ["<code>'____'</code>", 'exactly 4 characters', 'Mugs', 'Mug']])}
<ul>
<li><code>%</code> = any number of characters (including zero). <code>_</code> = exactly one character.</li>
<li><b>Case</b>: SQLite and MySQL LIKE ignore case for plain letters; PostgreSQL LIKE is case-sensitive (use <code>ILIKE</code> or <code>LOWER()</code>).</li>
<li>To search for a literal <code>%</code> or <code>_</code>, pick an escape character: <code>name LIKE '%\\_%' ESCAPE '\\'</code>.</li>
<li><code>NOT LIKE</code> flips the match. SQLite also has <code>GLOB</code> (Unix-style <code>*</code> and <code>?</code>, case-sensitive).</li>
</ul>`,
    clues: [
      '"in any of these categories / cities / statuses" → <code>IN (…)</code> instead of a chain of ORs',
      '"between X and Y", "from 500 to 1500 inclusive" → <code>BETWEEN</code> (both ends included); "up to but not including" → half-open <code>&gt;= … AND &lt; …</code>',
      '"name starts with / ends with / contains" → <code>LIKE \'x%\'</code>, <code>\'%x\'</code>, <code>\'%x%\'</code>',
      '"emails on gmail.com" → anchor the pattern: <code>LIKE \'%@gmail.com\'</code>, not <code>\'%gmail%\'</code>',
      '"exactly 5 characters", "second letter is a" → the <code>_</code> wildcard',
      '"the search term can contain % or _" → you need <code>ESCAPE</code>',
      '"all orders in August" on a DATETIME column → BETWEEN trap; use a half-open date range'
    ],
    code: [{ lang: 'sql', db: 'shop', title: 'IN, BETWEEN and LIKE together (runnable)', code: `-- Kitchen or Fitness items priced 300..1500 (inclusive)
SELECT name, category, price
FROM products
WHERE category IN ('Kitchen', 'Fitness')
  AND price BETWEEN 300 AND 1500;

-- Customers whose email is exactly on gmail.com (LIKE ignores case in SQLite)
SELECT name, email
FROM customers
WHERE email LIKE '%@gmail.com';

-- Products whose name contains a literal underscore
SELECT name
FROM products
WHERE name LIKE '%\\_%' ESCAPE '\\';` }],
    codeTitle: ['Runnable reference queries'],
    viz: [
      queryViz('IN + LIKE filter, row by row', "SELECT name, category, price FROM products WHERE category IN ('Kitchen', 'Fitness') OR name LIKE '%cable%'", { stepWhere: true }),
      { title: 'How a LIKE pattern lines up with each value', input: '_o%', inputLabel: 'LIKE pattern tested against product names', gen: function (input) { return likeFrames(input === undefined ? '_o%' : input); } },
      queryViz('BETWEEN is inclusive on both ends', 'SELECT id, order_date, amount FROM orders WHERE amount BETWEEN 599 AND 1899 ORDER BY amount')
    ],
    examples: [
      {
        title: 'IN is a tidy OR (and NOT IN is a tidy AND)',
        html: `<p><code>status IN ('pending', 'shipped')</code> = <code>status = 'pending' OR status = 'shipped'</code>. <code>NOT IN ('cancelled', 'returned')</code> = <code>status &lt;&gt; 'cancelled' AND status &lt;&gt; 'returned'</code> — and note order 113 (status NULL) is in <b>neither</b> result, because NULL compared with anything is UNKNOWN.</p>`,
        code: { lang: 'sql', db: 'shop', code: `SELECT id, status FROM orders WHERE status IN ('pending', 'shipped');

SELECT id, status FROM orders WHERE status NOT IN ('cancelled', 'returned');  -- 113 (NULL) missing!` }
      },
      {
        title: 'BETWEEN: inclusive, ordered, and the date-time trap',
        html: `<p>Order amounts 599 and 1899 are <b>included</b> by <code>BETWEEN 599 AND 1899</code>. Swapping the bounds returns nothing. For dates, our <code>order_date</code> holds pure dates so BETWEEN works, but the half-open form is the habit that survives when someone later stores <code>'2024-08-31 18:30:00'</code>.</p>`,
        code: { lang: 'sql', db: 'shop', code: `SELECT id, amount FROM orders WHERE amount BETWEEN 599 AND 1899;   -- 7 rows, both ends included
SELECT id, amount FROM orders WHERE amount BETWEEN 1899 AND 599;   -- 0 rows: low must come first

-- August 2024, robust form
SELECT id, order_date FROM orders
WHERE order_date >= '2024-08-01' AND order_date < '2024-09-01';` }
      },
      {
        title: 'Anchoring LIKE patterns: %gmail% vs %@gmail.com',
        html: `<p><code>'%gmail%'</code> also matches ${H.c('r', 'gmailfan@yahoo.in')} (Kabir). <code>'%@gmail.com'</code> anchors the pattern at the end and requires the @. Jia's address is <code>jia_li@GMAIL.com</code> — SQLite's LIKE ignores case so she still matches; in PostgreSQL you would write <code>ILIKE</code> or <code>LOWER(email) LIKE …</code>.</p>`,
        code: { lang: 'sql', db: 'shop', code: `SELECT name, email FROM customers WHERE email LIKE '%gmail%';       -- includes gmailfan@yahoo.in
SELECT name, email FROM customers WHERE email LIKE '%@gmail.com';   -- only real gmail accounts` }
      },
      {
        title: 'Literal % and _ need ESCAPE',
        html: `<p>In a pattern, <code>_</code> means "any one character", so <code>'%_%'</code> matches every non-empty name. To find the literal underscore in <code>Running_Shoes</code> or the percent sign in <code>100% Cotton Tee</code>, put an escape character before it and declare it with <code>ESCAPE</code>.</p>`,
        code: { lang: 'sql', db: 'shop', code: `SELECT name FROM products WHERE name LIKE '%_%';                -- all 12 rows!
SELECT name FROM products WHERE name LIKE '%\\_%' ESCAPE '\\';    -- Running_Shoes
SELECT name FROM products WHERE name LIKE '%!%%' ESCAPE '!';     -- 100% Cotton Tee` }
      }
    ],
    deepDive: `<p><b>IN under the hood.</b> A literal IN list is rewritten as OR-ed equalities, but engines optimise it: PostgreSQL turns it into <code>= ANY(array)</code>, SQLite builds a tiny ephemeral index for long lists, and with an index on the column the engine performs one index seek per value ("IN-list iteration"). Very long IN lists (thousands of IDs from an app) bloat the SQL text and the plan cache — prefer a temporary table or array parameter and a join.</p>
<p><b>BETWEEN is just sugar</b> for <code>x &gt;= lo AND x &lt;= hi</code>; it is fully sargable, so an index on <code>x</code> answers it with one range scan. The SQL standard also has <code>BETWEEN SYMMETRIC</code> (PostgreSQL) which swaps bounds automatically. With <b>timestamps</b>, an inclusive upper bound like <code>'2024-08-31 23:59:59'</code> still misses fractional seconds (<code>23:59:59.5</code>) — half-open ranges are the professional default.</p>
<p><b>LIKE and indexes.</b> A pattern with a <b>fixed prefix</b> (<code>'Wi%'</code>) is a range scan: <code>name &gt;= 'Wi' AND name &lt; 'Wj'</code> — but only if the index collation matches the LIKE semantics (SQLite needs a NOCASE index for case-insensitive LIKE, or <code>PRAGMA case_sensitive_like</code>; PostgreSQL needs <code>text_pattern_ops</code> in non-C locales). A <b>leading wildcard</b> (<code>'%gmail.com'</code>) cannot use a B-tree index → full scan. Fixes: store a reversed column, use trigram indexes (PostgreSQL <code>pg_trgm</code> GIN) or a full-text index (SQLite FTS5, PostgreSQL tsvector, Elasticsearch/OpenSearch) for "contains word" search.</p>
<p><b>Unicode and case.</b> SQLite's built-in case folding only covers ASCII A–Z — <code>'É' LIKE 'é'</code> is false unless the ICU extension is loaded. Collations decide equality too: in MySQL's default <code>utf8mb4_0900_ai_ci</code>, <code>'resume' = 'résumé'</code> is TRUE (accent-insensitive).</p>
<p><b>Security.</b> If the pattern comes from user input, escape <code>%</code>, <code>_</code> and the escape char itself in application code and pass it as a bind parameter — otherwise a user typing <code>%</code> dumps every row (a "wildcard injection"), and string-building the SQL opens real SQL injection.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants write LIKE/IN/BETWEEN filters flawlessly at the syntax level, and semantic search with vector embeddings (pgvector, SQLite-vec, cloud vector indexes) now handles "find products similar to <i>comfy running shoes</i>" — something LIKE never could. <b>Use AI as a partner:</b> ask it to <code>list strings that would wrongly match this LIKE pattern</code>, or <code>convert this BETWEEN on a timestamp into a half-open range</code>. Use it to draft the escaping function for user search terms, then review it. <b>Where AI goes wrong:</b> uses <code>'%term%'</code> on million-row tables (leading wildcard = full scan), forgets that PostgreSQL LIKE is case-sensitive, generates <code>NOT IN</code> lists that may contain NULLs, and builds SQL by string concatenation with user input. <b>What you must still own:</b> choosing between LIKE, full-text and vector search; anchoring patterns precisely; and knowing which filters can use an index.</p>`,
    problems: [{
      title: 'Gmail Customers in India or UAE', level: 'Easy', tags: ['like', 'in', 'pattern'], companies: ['Flipkart', 'Swiggy', 'Shopify'],
      statement: `<p>Marketing is running a Google-Workspace promo in India and the UAE. Return <code>name, email, country</code> of customers whose email address is on the <b>gmail.com</b> domain and whose country is <b>India or UAE</b>. Table: <code>customers(id, name, email, city, country, signup_date, referred_by)</code>.</p>`,
      constraints: `<p>12 customers. Emails may be NULL and may contain upper-case letters. A real gmail address ends with <code>@gmail.com</code>.</p>`,
      example: `${H.table(['name', 'email', 'country'], [['Asha Rao', 'asha@gmail.com', 'India'], ['Diya Patel', 'diya@gmail.com', 'India'], ['Fatima Khan', 'fatima_k@gmail.com', 'UAE'], ['Jia Li', 'jia_li@' + H.c('y', 'GMAIL') + '.com', 'India']])}<p>Kabir (<code>${H.c('r', 'gmailfan@yahoo.in')}</code>) is <b>not</b> a gmail user even though his address contains the word "gmail". Chen and Gabriel have NULL emails → excluded.</p>`,
      brute: { why: `<p>Two bugs: <code>'%gmail%'</code> is not anchored, so Kabir's yahoo address matches; and <code>AND … OR country = 'UAE'</code> without parentheses lets <i>every</i> UAE customer in regardless of email (AND binds tighter than OR).</p>`, code: { lang: 'sql', db: 'shop', code: `SELECT name, email, country
FROM customers
WHERE email LIKE '%gmail%' AND country = 'India' OR country = 'UAE';` } },
      mcq: { q: 'Which pattern matches only addresses on the gmail.com domain?', options: ["<code>'%gmail%'</code>", "<code>'%@gmail.com'</code>", "<code>'gmail.com%'</code>", "<code>'_gmail.com'</code>"], answer: 1, explain: "The domain is the part after @ at the very end, so anchor it: anything, then '@gmail.com' as the final characters." },
      hints: [
        `<p>Hint 1: think about what text appears at the <b>end</b> of every gmail address, including the @.</p>`,
        `<p>Hint 2: use <code>IN ('India', 'UAE')</code> for the countries — it is one test, so no precedence trouble.</p>`,
        `<p>Hint 3: NULL emails fail LIKE automatically (UNKNOWN). In PostgreSQL wrap with <code>LOWER(email)</code> because LIKE is case-sensitive there.</p>`
      ],
      solution: {
        approach: `<p>Anchor the pattern to the end of the string with the @ included, and express the country choice with IN. Both conditions are joined by AND, so no parentheses are needed.</p>`,
        code: { lang: 'sql', db: 'shop', code: `SELECT name, email, country
FROM customers
WHERE email LIKE '%@gmail.com'          -- anchored: must END with @gmail.com
  AND country IN ('India', 'UAE')
ORDER BY name;` },
        alt: [{ lang: 'sql', db: 'shop', title: 'Portable (case-insensitive everywhere)', code: `SELECT name, email, country
FROM customers
WHERE LOWER(email) LIKE '%@gmail.com'
  AND country IN ('India', 'UAE')
ORDER BY name;` }],
        complexity: `<p>Leading-wildcard LIKE cannot use a B-tree index → O(N) scan. An index on <code>country</code> could narrow rows first; for millions of rows store the domain in its own indexed column.</p>`,
        followUps: ['Also accept <code>googlemail.com</code> addresses.', 'How would you extract the domain into a separate column?', 'Why does <code>LOWER(email) LIKE …</code> stop an index on email from being used?']
      }
    }]
  });
registerModule({ id: 'sql02', title: 'SELECT, WHERE, ORDER BY, LIMIT & NULLs', intro: '<p>x</p>', goals: [], prereqs: 'x', hours: 8,
  databases: { hr: buildDb(['employees']), shop: buildDb(['customers', 'products', 'orders']), movies: buildDb(['movies']) },
  topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
