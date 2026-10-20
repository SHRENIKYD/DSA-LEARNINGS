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
      tests: { engine: 'sqlite', cmp: 'set', cases: [
        { cols: ['name', 'yearly_salary', 'monthly_pay'], rows: [['Priya Sharma', 250000, 20833.33], ['Arjun Mehta', 160000, 13333.33], ['Lena Fischer', 120000, 10000], ['Marco Rossi', 120000, 10000], ['Sara Johnson', 250000, 20833.33], ['Tom Becker', 90000, 7500], ['Aisha Bello', 95000, 7916.67], ['Kenji Tanaka', 130000, 10833.33], ['Olivia Brown', 85000, 7083.33], ['Rahul Verma', 30000, 2500], ['Zoe Martin', 110000, 9166.67], ['Nina Kowalski', 135000, 11250]] },
        { setup: 'UPDATE employees SET salary = 1 WHERE id = 1; UPDATE employees SET salary = 5 WHERE id = 2; UPDATE employees SET salary = 7 WHERE id = 3;', cols: ['name', 'yearly_salary', 'monthly_pay'], rows: [['Priya Sharma', 1, 0.08], ['Arjun Mehta', 5, 0.42], ['Lena Fischer', 7, 0.58], ['Marco Rossi', 120000, 10000], ['Sara Johnson', 250000, 20833.33], ['Tom Becker', 90000, 7500], ['Aisha Bello', 95000, 7916.67], ['Kenji Tanaka', 130000, 10833.33], ['Olivia Brown', 85000, 7083.33], ['Rahul Verma', 30000, 2500], ['Zoe Martin', 110000, 9166.67], ['Nina Kowalski', 135000, 11250]] },
        { setup: 'UPDATE employees SET salary = 0 WHERE id = 4;', cols: ['name', 'yearly_salary', 'monthly_pay'], rows: [['Priya Sharma', 250000, 20833.33], ['Arjun Mehta', 160000, 13333.33], ['Lena Fischer', 120000, 10000], ['Marco Rossi', 0, 0], ['Sara Johnson', 250000, 20833.33], ['Tom Becker', 90000, 7500], ['Aisha Bello', 95000, 7916.67], ['Kenji Tanaka', 130000, 10833.33], ['Olivia Brown', 85000, 7083.33], ['Rahul Verma', 30000, 2500], ['Zoe Martin', 110000, 9166.67], ['Nina Kowalski', 135000, 11250]] },
        { setup: 'DELETE FROM employees;', rows: [] },
        { setup: 'INSERT INTO employees (id, name, salary) VALUES (13, \'Big Earner\', 2000000000);', cols: ['name', 'yearly_salary', 'monthly_pay'], rows: [['Priya Sharma', 250000, 20833.33], ['Arjun Mehta', 160000, 13333.33], ['Lena Fischer', 120000, 10000], ['Marco Rossi', 120000, 10000], ['Sara Johnson', 250000, 20833.33], ['Tom Becker', 90000, 7500], ['Aisha Bello', 95000, 7916.67], ['Kenji Tanaka', 130000, 10833.33], ['Olivia Brown', 85000, 7083.33], ['Rahul Verma', 30000, 2500], ['Zoe Martin', 110000, 9166.67], ['Nina Kowalski', 135000, 11250], ['Big Earner', 2000000000, 166666666.67]] },
        { setup: 'INSERT INTO employees (id, name, salary) VALUES (13, \'Priya Sharma\', 250000), (14, \'Odd Pay\', 99999);', cols: ['name', 'yearly_salary', 'monthly_pay'], rows: [['Priya Sharma', 250000, 20833.33], ['Arjun Mehta', 160000, 13333.33], ['Lena Fischer', 120000, 10000], ['Marco Rossi', 120000, 10000], ['Sara Johnson', 250000, 20833.33], ['Tom Becker', 90000, 7500], ['Aisha Bello', 95000, 7916.67], ['Kenji Tanaka', 130000, 10833.33], ['Olivia Brown', 85000, 7083.33], ['Rahul Verma', 30000, 2500], ['Zoe Martin', 110000, 9166.67], ['Nina Kowalski', 135000, 11250], ['Priya Sharma', 250000, 20833.33], ['Odd Pay', 99999, 8333.25]] }
      ] },
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
      tests: { engine: 'sqlite', cases: [
        { cols: ['name', 'dept', 'salary'], rows: [['Sara Johnson', 'Sales', 250000], ['Kenji Tanaka', 'Marketing', 130000], ['Aisha Bello', 'Sales', 95000]] },
        { setup: 'UPDATE employees SET salary = 90001 WHERE id = 6;', cols: ['name', 'dept', 'salary'], rows: [['Sara Johnson', 'Sales', 250000], ['Kenji Tanaka', 'Marketing', 130000], ['Aisha Bello', 'Sales', 95000], ['Tom Becker', 'Sales', 90001]] },
        { setup: 'UPDATE employees SET dept = NULL WHERE id IN (5, 8);', cols: ['name', 'dept', 'salary'], rows: [['Aisha Bello', 'Sales', 95000]] },
        { setup: 'INSERT INTO employees (id, name, dept, title, salary, bonus, manager_id) VALUES (13, \'Edge Exact\', \'Sales\', \'AE\', 90000, NULL, NULL);INSERT INTO employees (id, name, dept, title, salary, bonus, manager_id) VALUES (14, \'Edge Over\', \'Marketing\', \'AE\', 90001, NULL, NULL);INSERT INTO employees (id, name, dept, title, salary, bonus, manager_id) VALUES (15, \'No Pay\', \'Sales\', \'AE\', NULL, NULL, NULL);INSERT INTO employees (id, name, dept, title, salary, bonus, manager_id) VALUES (16, \'Eng Rich\', \'Engineering\', \'AE\', 999999, NULL, NULL);', cols: ['name', 'dept', 'salary'], rows: [['Sara Johnson', 'Sales', 250000], ['Kenji Tanaka', 'Marketing', 130000], ['Aisha Bello', 'Sales', 95000], ['Edge Over', 'Marketing', 90001]] },
        { setup: 'UPDATE employees SET salary = 1;', rows: [] },
        { setup: 'UPDATE employees SET salary = salary + 1 WHERE dept IN (\'Engineering\', \'HR\') OR dept IS NULL; UPDATE employees SET salary = 300000 WHERE id = 9;', cols: ['name', 'dept', 'salary'], rows: [['Olivia Brown', 'Marketing', 300000], ['Sara Johnson', 'Sales', 250000], ['Kenji Tanaka', 'Marketing', 130000], ['Aisha Bello', 'Sales', 95000]] }
      ] },
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
      tests: { engine: 'sqlite', cmp: 'set', cases: [
        { cols: ['name', 'email', 'country'], rows: [['Asha Rao', 'asha@gmail.com', 'India'], ['Diya Patel', 'diya@gmail.com', 'India'], ['Fatima Khan', 'fatima_k@gmail.com', 'UAE'], ['Jia Li', 'jia_li@GMAIL.com', 'India']] },
        { setup: 'UPDATE customers SET email = \'k@gmail.com\' WHERE id = 11;', cols: ['name', 'email', 'country'], rows: [['Asha Rao', 'asha@gmail.com', 'India'], ['Diya Patel', 'diya@gmail.com', 'India'], ['Fatima Khan', 'fatima_k@gmail.com', 'UAE'], ['Jia Li', 'jia_li@GMAIL.com', 'India'], ['Kabir Singh', 'k@gmail.com', 'India']] },
        { setup: 'UPDATE customers SET country = NULL WHERE id = 1;', cols: ['name', 'email', 'country'], rows: [['Diya Patel', 'diya@gmail.com', 'India'], ['Fatima Khan', 'fatima_k@gmail.com', 'UAE'], ['Jia Li', 'jia_li@GMAIL.com', 'India']] },
        { setup: 'UPDATE customers SET email = \'x@gmail.com.evil.com\' WHERE id = 1; UPDATE customers SET email = \'a@mygmail.com\' WHERE id = 4;', cols: ['name', 'email', 'country'], rows: [['Fatima Khan', 'fatima_k@gmail.com', 'UAE'], ['Jia Li', 'jia_li@GMAIL.com', 'India']] },
        { setup: 'UPDATE customers SET email = NULL;', rows: [] },
        { setup: 'UPDATE customers SET email = \'e@gmail.com\' WHERE id = 5; UPDATE customers SET email = \'u@Gmail.Com\' WHERE id = 6;', cols: ['name', 'email', 'country'], rows: [['Asha Rao', 'asha@gmail.com', 'India'], ['Diya Patel', 'diya@gmail.com', 'India'], ['Fatima Khan', 'u@Gmail.Com', 'UAE'], ['Jia Li', 'jia_li@GMAIL.com', 'India']] }
      ] },
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

  // Build the three-valued-logic truth tables step by step
  function truthFrames() {
    var V = [true, false, null], N = ['TRUE', 'FALSE', 'UNKNOWN'], F = [];
    function and3(a, b) { return a === false || b === false ? false : a === null || b === null ? null : true; }
    function or3(a, b) { return a === true || b === true ? true : a === null || b === null ? null : false; }
    function nm(v) { return v === null ? 'UNKNOWN' : v ? 'TRUE' : 'FALSE'; }
    var cmpRows = [
      ['NULL = NULL', 'UNKNOWN', 'two unknowns might or might not be equal'],
      ['NULL <> 5', 'UNKNOWN', 'we cannot say it differs from 5'],
      ['salary > NULL', 'UNKNOWN', 'any comparison with NULL'],
      ['NULL IS NULL', 'TRUE', 'IS NULL is the only reliable test'],
      ['5 IS NOT NULL', 'TRUE', ''],
      ['NULL + 100', 'NULL', 'arithmetic with NULL is NULL'],
      ["'Hi ' || NULL", 'NULL', 'so is concatenation'],
      ['NULL IS 5  /  NULL IS NOT DISTINCT FROM 5', 'FALSE', 'null-safe equality never returns UNKNOWN']
    ];
    F.push({ narr: 'SQL logic has <b>three</b> answers, not two: <span class="c-g">TRUE</span>, <span class="c-r">FALSE</span> and <span class="c-y">UNKNOWN</span>. UNKNOWN appears whenever a <b>NULL</b> ("value missing / not known") takes part in a comparison. Think of NULL as a sealed envelope: "is the envelope equal to 5?" — <i>I don\'t know</i>.', parts: [{ type: 'table', label: 'Comparisons involving NULL', columns: ['expression', 'result', 'why'], rows: cmpRows.slice(0, 3), hl: { 0: 'cur', 1: 'cur', 2: 'cur' } }] });
    F.push({ narr: 'The escape hatches: <code>IS NULL</code> / <code>IS NOT NULL</code> always give TRUE or FALSE. Arithmetic and string glue with NULL produce NULL ("unknown + 100 is still unknown"). Null-safe equality (<code>IS</code> in SQLite, <code>IS NOT DISTINCT FROM</code> in standard SQL, <code>&lt;=&gt;</code> in MySQL) treats two NULLs as equal and never returns UNKNOWN.', parts: [{ type: 'table', label: 'Comparisons involving NULL', columns: ['expression', 'result', 'why'], rows: cmpRows, hl: { 3: 'ok', 4: 'ok', 5: 'bad', 6: 'bad', 7: 'sel' } }] });
    var rows = [], hl = {};
    var reasons = {
      'TRUE,TRUE': 'everything is TRUE → AND and OR are TRUE',
      'TRUE,FALSE': 'one FALSE kills AND; one TRUE is enough for OR',
      'TRUE,UNKNOWN': 'AND: depends on the unknown → UNKNOWN. OR: already TRUE no matter what → TRUE',
      'FALSE,TRUE': 'AND is FALSE (one FALSE), OR is TRUE (one TRUE)',
      'FALSE,FALSE': 'both FALSE → AND FALSE, OR FALSE',
      'FALSE,UNKNOWN': 'AND: FALSE wins no matter what the unknown is → FALSE. OR: depends on the unknown → UNKNOWN',
      'UNKNOWN,TRUE': 'AND depends on the unknown → UNKNOWN; OR already TRUE → TRUE',
      'UNKNOWN,FALSE': 'AND already FALSE → FALSE; OR depends on the unknown → UNKNOWN',
      'UNKNOWN,UNKNOWN': 'nothing is known → UNKNOWN for both; NOT UNKNOWN is still UNKNOWN'
    };
    for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) {
      var p = V[i], q = V[j];
      rows.push([N[i], N[j], nm(and3(p, q)), nm(or3(p, q)), nm(p === null ? null : !p)]);
      hl = {}; for (var k = 0; k < rows.length - 1; k++) hl[k] = 'done';
      hl[rows.length - 1] = 'cur';
      F.push({ narr: 'p = <b>' + N[i] + '</b>, q = <b>' + N[j] + '</b>: ' + reasons[N[i] + ',' + N[j]] + '. Trick: treat UNKNOWN as "could be TRUE or FALSE" — if both choices give the same answer, that is the answer; otherwise it stays UNKNOWN.', parts: [{ type: 'table', label: 'Three-valued truth table', columns: ['p', 'q', 'p AND q', 'p OR q', 'NOT p'], rows: rows.slice(), hl: hl }] });
    }
    var g = function (fn) { return V.map(function (a) { return V.map(function (b) { return nm(fn(a, b)); }); }); };
    var ghl = function (fn) { var o = {}; V.forEach(function (a, r) { V.forEach(function (b, c) { var x = fn(a, b); o[r + ',' + c] = x === true ? 'ok' : x === false ? 'bad' : 'cur'; }); }); return o; };
    F.push({ narr: 'The same facts as two 3×3 grids. Notice: <b>FALSE AND anything = FALSE</b> and <b>TRUE OR anything = TRUE</b> — those are the only ways UNKNOWN gets "rescued".', parts: [
      { type: 'grid', label: 'p AND q', rowHead: ['p=TRUE', 'p=FALSE', 'p=UNKNOWN'], colHead: ['q=TRUE', 'q=FALSE', 'q=UNKNOWN'], rows: g(and3), hl: ghl(and3) },
      { type: 'grid', label: 'p OR q', rowHead: ['p=TRUE', 'p=FALSE', 'p=UNKNOWN'], colHead: ['q=TRUE', 'q=FALSE', 'q=UNKNOWN'], rows: g(or3), hl: ghl(or3) }
    ] });
    var w = rows.map(function (r) { return r.slice(0, 3).concat([r[2] === 'TRUE' ? 'KEEP' : 'DROP']); }), wh = {};
    w.forEach(function (r, k) { wh[k] = r[3] === 'KEEP' ? 'ok' : 'bad'; });
    F.push({ narr: '<b>The rule that matters:</b> WHERE (and HAVING, and JOIN … ON) keep a row <b>only when the condition is TRUE</b>. FALSE and UNKNOWN are both thrown away. CHECK constraints are the opposite: they <i>reject</i> only FALSE, so UNKNOWN passes.', parts: [{ type: 'table', label: 'WHERE p AND q — which rows survive?', columns: ['p', 'q', 'p AND q', 'WHERE verdict'], rows: w, hl: wh }] });
    return F;
  }

  /* =====================================================================
     TOPIC 4 — NULL, IS NULL and three-valued logic
     ===================================================================== */
  topics.push({
    title: 'NULL & Three-Valued Logic: IS NULL, UNKNOWN and the NOT IN Trap',
    analogy: `<p>A form asks for your phone number and you leave it blank. Is your phone number equal to your friend's blank phone number? Nobody can say — <b>both are unknown</b>. That blank is <b>NULL</b>: not zero, not an empty string, but "<i>we don't know / it doesn't exist</i>". Like a <b>sealed envelope</b>: asking "is the envelope's amount bigger than 100?" can only be answered "I don't know". SQL calls that third answer <b>UNKNOWN</b>, and a WHERE clause only lets in rows whose answer is a confident YES.</p>`,
    explain: `<p><b>NULL is a marker for a missing value.</b> It is not 0 and not <code>''</code>. Rahul has no department (NULL), Marco has no email (NULL), Arjun's bonus is unknown (NULL), but Aisha's bonus is <b>0</b> — a real, known value.</p>
<p><b>Rule 1 — any comparison with NULL is UNKNOWN.</b> <code>dept = NULL</code>, <code>dept &lt;&gt; 'Sales'</code> (when dept is NULL), <code>bonus &gt; 0</code> (when bonus is NULL) — all UNKNOWN. Even <code>NULL = NULL</code> is UNKNOWN.</p>
<p><b>Rule 2 — WHERE keeps only TRUE.</b> UNKNOWN rows are silently dropped, exactly like FALSE rows. That is why <code>WHERE email = NULL</code> returns <b>nothing</b>, ever.</p>
<p><b>Rule 3 — test for NULL with <code>IS NULL</code> / <code>IS NOT NULL</code>.</b></p>
<pre>SELECT name FROM employees WHERE email IS NULL;       -- Marco, Rahul
SELECT name FROM employees WHERE email IS NOT NULL;   -- the other 10</pre>
<p><b>Rule 4 — three-valued truth tables</b> (see the visualizer):</p>
${H.table(['', 'AND', 'OR'], [['TRUE ⊕ UNKNOWN', H.c('y', 'UNKNOWN'), H.c('g', 'TRUE')], ['FALSE ⊕ UNKNOWN', H.c('r', 'FALSE'), H.c('y', 'UNKNOWN')], ['UNKNOWN ⊕ UNKNOWN', H.c('y', 'UNKNOWN'), H.c('y', 'UNKNOWN')], ['NOT UNKNOWN', H.c('y', 'UNKNOWN'), '']])}
<p><b>Rule 5 — NULL spreads through calculations:</b> <code>salary + bonus</code>, <code>'Hi ' || email</code>, <code>UPPER(NULL)</code> are all NULL. Replace NULL with a default using <code>COALESCE(bonus, 0)</code> (first non-NULL argument) or <code>IFNULL(bonus, 0)</code>.</p>
<p><b>Rule 6 — "not equal" quietly hides NULL rows.</b> "Everyone not in Engineering" written as <code>dept &lt;&gt; 'Engineering'</code> loses Rahul, whose department is unknown. If you want him, say so: <code>dept &lt;&gt; 'Engineering' OR dept IS NULL</code>, or null-safe <code>dept IS NOT 'Engineering'</code> (SQLite) / <code>dept IS DISTINCT FROM 'Engineering'</code> (standard; SQLite 3.39+, PostgreSQL).</p>
<p><b>Rule 7 — the NOT IN trap.</b> <code>x NOT IN (1, 2, NULL)</code> means <code>x &lt;&gt; 1 AND x &lt;&gt; 2 AND x &lt;&gt; NULL</code>. The last part is always UNKNOWN, so the whole thing is never TRUE → <b>zero rows</b>. It bites hardest with subqueries: <code>WHERE id NOT IN (SELECT manager_id FROM employees)</code> returns nothing because some manager_id values are NULL.</p>`,
    clues: [
      '"customers <b>without</b> an email / with <b>no</b> manager / <b>missing</b> phone" → <code>IS NULL</code>, never <code>= NULL</code>',
      '"everyone <b>except</b> X" on a nullable column → decide whether NULL rows belong; add <code>OR col IS NULL</code> or use <code>IS NOT</code> / <code>IS DISTINCT FROM</code>',
      '"<b>NOT IN</b> (subquery)" → check whether the subquery can return NULL; prefer <code>NOT EXISTS</code>',
      '"treat missing bonus as 0", "show \'N/A\' when unknown" → <code>COALESCE</code> / <code>IFNULL</code>',
      'A query "returns fewer rows than expected" or "returns nothing" → suspect NULLs in a comparison',
      '"total = salary + bonus" with nullable bonus → NULL propagation, wrap with COALESCE'
    ],
    code: [{ lang: 'sql', db: 'hr', title: 'NULL handling cheat sheet (runnable)', code: `-- 1) = NULL never matches; IS NULL does
SELECT 'eq'  AS how, COUNT(*) AS n FROM employees WHERE email = NULL     -- 0
UNION ALL
SELECT 'is', COUNT(*) FROM employees WHERE email IS NULL;                 -- 2

-- 2) <> silently drops NULL rows
SELECT name, dept FROM employees WHERE dept <> 'Engineering';             -- no Rahul
SELECT name, dept FROM employees WHERE dept IS NOT 'Engineering';         -- Rahul included (null-safe)

-- 3) NULL spreads; COALESCE gives a default
SELECT name, salary + bonus AS raw_total,
       salary + COALESCE(bonus, 0) AS safe_total
FROM employees;

-- 4) Direct look at three-valued logic (1 = TRUE, 0 = FALSE, NULL = UNKNOWN)
SELECT NULL = NULL      AS null_eq_null,
       NULL IS NULL     AS null_is_null,
       (1 = 1) OR NULL  AS true_or_unknown,
       (1 = 0) AND NULL AS false_and_unknown,
       NOT NULL         AS not_unknown;` }],
    codeTitle: ['Runnable reference queries'],
    viz: [
      { title: 'Three-valued logic: building the truth table', gen: function () { return truthFrames(); } },
      queryViz('<> quietly drops the NULL row', "SELECT name, dept FROM employees WHERE dept <> 'Engineering'", { stepWhere: true }),
      queryViz('The NOT IN trap: one NULL in the list empties the result', "SELECT name, dept FROM employees WHERE dept NOT IN ('Sales', NULL)", { stepWhere: true, intro: '<b>Trap ahead:</b> the list contains a NULL. ' })
    ],
    examples: [
      {
        title: '= NULL returns nothing; IS NULL works',
        html: `<p><code>WHERE email = NULL</code> asks "is the email equal to an unknown value?" → UNKNOWN for every row → <b>0 rows</b>. Some linters flag <code>= NULL</code> as an error for exactly this reason. <code>IS NULL</code> is a real test that returns TRUE/FALSE.</p>`,
        code: { lang: 'sql', db: 'shop', code: `SELECT name FROM customers WHERE email = NULL;     -- 0 rows, always
SELECT name FROM customers WHERE email IS NULL;    -- Chen Wei, Gabriel Silva` }
      },
      {
        title: '<> and NOT LIKE drop the unknowns too',
        html: `<p>"Orders that are not cancelled": <code>status &lt;&gt; 'cancelled'</code> returns 11 rows, but there are 12 non-cancelled orders — order 113 has a NULL status. Same story for <code>NOT LIKE</code>, <code>NOT BETWEEN</code> and <code>NOT IN</code>: negating UNKNOWN keeps it UNKNOWN.</p>`,
        code: { lang: 'sql', db: 'shop', code: `SELECT COUNT(*) FROM orders WHERE status <> 'cancelled';                       -- 11
SELECT COUNT(*) FROM orders WHERE status <> 'cancelled' OR status IS NULL;     -- 12
SELECT COUNT(*) FROM orders WHERE status IS NOT 'cancelled';                   -- 12 (SQLite null-safe)
SELECT COUNT(*) FROM orders WHERE status IS DISTINCT FROM 'cancelled';         -- 12 (standard SQL)` }
      },
      {
        title: 'The NOT IN + NULL disaster (and the fix)',
        html: `<p>"Employees who manage nobody": the subquery returns manager ids <code>{NULL, 1, 2, 5, 8}</code>. Because of that NULL, <code>id NOT IN (…)</code> is never TRUE and the result is <b>empty</b>. Filter NULLs out of the subquery — or better, use <code>NOT EXISTS</code> (JOINs module), which is immune.</p>`,
        code: { lang: 'sql', db: 'hr', code: `-- Broken: 0 rows
SELECT name FROM employees
WHERE id NOT IN (SELECT manager_id FROM employees);

-- Fixed: 8 rows
SELECT name FROM employees
WHERE id NOT IN (SELECT manager_id FROM employees WHERE manager_id IS NOT NULL);` }
      },
      {
        title: 'COALESCE for defaults and display',
        html: `<p><code>COALESCE(a, b, c)</code> returns the first argument that is not NULL. Use it for calculations (<code>COALESCE(bonus, 0)</code>) and for friendly output (<code>COALESCE(city, 'unknown')</code>). Be honest in reports: replacing NULL with 0 changes averages, so only do it when "missing" truly means "zero".</p>`,
        code: { lang: 'sql', db: 'shop', code: `SELECT name,
       COALESCE(city, country, 'location unknown') AS where_from,
       COALESCE(email, '-')                        AS email
FROM customers;` }
      }
    ],
    deepDive: `<p><b>Where three-valued logic comes from.</b> Codd's relational model added NULL for missing information, and SQL adopted Kleene's strong three-valued logic. Its key property: if replacing UNKNOWN by TRUE and by FALSE gives the same answer, that answer is returned; otherwise UNKNOWN. De Morgan's laws still hold, but the <b>law of excluded middle</b> does not: <code>WHERE x = 5 OR x &lt;&gt; 5</code> does <i>not</i> return every row — rows with NULL x vanish.</p>
<p><b>Where NULLs are treated as equal (inconsistency to memorise).</b> In <code>WHERE</code>/<code>ON</code>, NULL never equals NULL. But <code>DISTINCT</code>, <code>GROUP BY</code>, <code>UNION</code>, <code>INTERSECT</code>/<code>EXCEPT</code> and <code>PARTITION BY</code> put all NULLs in one group ("not distinct"). <code>UNIQUE</code> constraints allow many NULLs in SQLite, PostgreSQL, MySQL and Oracle (single-column), while SQL Server allows only one; PostgreSQL 15+ offers <code>UNIQUE NULLS NOT DISTINCT</code>. <code>ORDER BY</code> needs a position for NULL: smallest in SQLite/MySQL/SQL Server, largest in PostgreSQL/Oracle. Aggregates (<code>SUM/AVG/COUNT(col)</code>) skip NULLs; <code>COUNT(*)</code> counts rows.</p>
<p><b>CHECK constraints flip the rule:</b> a row is rejected only if the check is FALSE, so <code>CHECK (price &gt; 0)</code> happily accepts NULL price. Add <code>NOT NULL</code> when a value is required.</p>
<p><b>Oracle quirk:</b> Oracle treats the empty string <code>''</code> as NULL, so <code>WHERE name = ''</code> never matches there. Most other engines keep them distinct.</p>
<p><b>Performance.</b> B-tree indexes in SQLite, PostgreSQL and MySQL store NULLs, so <code>IS NULL</code> can use an index (Oracle single-column B-trees do not index all-NULL keys). <code>COALESCE(col, 0) = 0</code> is not sargable; rewrite as <code>(col = 0 OR col IS NULL)</code>. <code>NOT IN</code> also blocks the efficient anti-join plan in many engines precisely because of NULL semantics — another reason <code>NOT EXISTS</code> is preferred.</p>
<p><b>Design advice.</b> Use NULL only for truly unknown/not-applicable data, declare <code>NOT NULL</code> everywhere else, and never use magic values (<code>-1</code>, <code>'1900-01-01'</code>) to mean "missing" — they silently corrupt averages and sorts.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI assistants are great at explaining a truth table, but NULL bugs are <b>silent</b> — the query runs, returns plausible rows, and nobody notices the missing ones. That makes your NULL instinct a key review skill when an assistant or a text-to-SQL agent writes queries for you. <b>Use AI as a partner:</b> paste the schema and ask <code>Which columns in this query are nullable, and how does each WHERE condition treat NULL?</code> or <code>Rewrite every NOT IN in this file as NOT EXISTS</code>. Ask it to generate a test row with NULL in every nullable column and compare results. <b>Where AI goes wrong:</b> writes <code>col != 'x'</code> for "not x" without thinking about NULL, uses <code>NOT IN (subquery)</code>, applies <code>COALESCE(x, 0)</code> inside averages (changing the meaning), and assumes PostgreSQL NULL ordering in SQLite. <b>What you must still own:</b> deciding what "missing" means in the business question and proving the row counts add up (rows with X + rows without X + rows with unknown = total).</p>`,
    problems: [{
      title: 'Everyone Outside Engineering — Including the Unknowns', level: 'Medium', tags: ['null', 'three-valued logic', 'where'], companies: ['Google', 'Microsoft', 'Atlassian'],
      statement: `<p>An all-hands invite must reach every employee who is <b>not known to be in Engineering</b> — that includes people whose department is not recorded yet. Return <code>name, dept</code> ordered by name.</p>`,
      constraints: `<p><code>employees.dept</code> is nullable. 12 rows, 1 has a NULL dept.</p>`,
      example: `${H.table(['name', 'dept'], [['Aisha Bello', 'Sales'], ['Kenji Tanaka', 'Marketing'], ['Olivia Brown', 'Marketing'], [H.c('g', 'Rahul Verma'), H.c('m', 'NULL')], ['Sara Johnson', 'Sales'], ['Tom Becker', 'Sales'], ['Zoe Martin', 'HR']])}<p>7 rows. Rahul's department is unknown, so <code>dept &lt;&gt; 'Engineering'</code> is UNKNOWN for him — the naive query drops him, but the business rule says he must be invited.</p>`,
      brute: { why: `<p><code>dept &lt;&gt; 'Engineering'</code> evaluates to UNKNOWN for Rahul (NULL dept) and WHERE keeps only TRUE, so he silently disappears — 6 rows instead of 7. No error, no warning.</p>`, code: { lang: 'sql', db: 'hr', code: `SELECT name, dept
FROM employees
WHERE dept <> 'Engineering'      -- NULL dept → UNKNOWN → dropped
ORDER BY name;` } },
      mcq: { q: 'For Rahul (dept NULL), what is <code>dept &lt;&gt; \'Engineering\'</code>?', options: ['TRUE', 'FALSE', 'UNKNOWN', 'An error'], answer: 2, explain: 'Any ordinary comparison with NULL yields UNKNOWN, and WHERE discards UNKNOWN rows.' },
      hints: [
        `<p>Hint 1: list the three possible situations for a row: dept is Engineering, dept is something else, dept is unknown. Which ones does the invite want?</p>`,
        `<p>Hint 2: add the missing case explicitly with <code>OR dept IS NULL</code>.</p>`,
        `<p>Hint 3: or use a null-safe comparison: <code>dept IS NOT 'Engineering'</code> (SQLite) / <code>dept IS DISTINCT FROM 'Engineering'</code> (standard).</p>`
      ],
      tests: { engine: 'sqlite', cases: [
        { cols: ['name', 'dept'], rows: [['Aisha Bello', 'Sales'], ['Kenji Tanaka', 'Marketing'], ['Olivia Brown', 'Marketing'], ['Rahul Verma', null], ['Sara Johnson', 'Sales'], ['Tom Becker', 'Sales'], ['Zoe Martin', 'HR']] },
        { setup: 'UPDATE employees SET dept = NULL;', cols: ['name', 'dept'], rows: [['Aisha Bello', null], ['Arjun Mehta', null], ['Kenji Tanaka', null], ['Lena Fischer', null], ['Marco Rossi', null], ['Nina Kowalski', null], ['Olivia Brown', null], ['Priya Sharma', null], ['Rahul Verma', null], ['Sara Johnson', null], ['Tom Becker', null], ['Zoe Martin', null]] },
        { setup: 'UPDATE employees SET dept = \'Engineering\';', rows: [] },
        { setup: 'UPDATE employees SET dept = NULL WHERE id IN (1, 2);', cols: ['name', 'dept'], rows: [['Aisha Bello', 'Sales'], ['Arjun Mehta', null], ['Kenji Tanaka', 'Marketing'], ['Olivia Brown', 'Marketing'], ['Priya Sharma', null], ['Rahul Verma', null], ['Sara Johnson', 'Sales'], ['Tom Becker', 'Sales'], ['Zoe Martin', 'HR']] },
        { setup: 'UPDATE employees SET dept = \'\' WHERE id = 3;', cols: ['name', 'dept'], rows: [['Aisha Bello', 'Sales'], ['Kenji Tanaka', 'Marketing'], ['Lena Fischer', ''], ['Olivia Brown', 'Marketing'], ['Rahul Verma', null], ['Sara Johnson', 'Sales'], ['Tom Becker', 'Sales'], ['Zoe Martin', 'HR']] },
        { setup: 'INSERT INTO employees (id, name, dept, title, salary, bonus, manager_id) VALUES (13, \'Aaron\', \'Sales\', \'AE\', 1, NULL, NULL);INSERT INTO employees (id, name, dept, title, salary, bonus, manager_id) VALUES (14, \'Aaron\', NULL, \'AE\', 1, NULL, NULL);', cols: ['name', 'dept'], rows: [['Aaron', 'Sales'], ['Aaron', null], ['Aisha Bello', 'Sales'], ['Kenji Tanaka', 'Marketing'], ['Olivia Brown', 'Marketing'], ['Rahul Verma', null], ['Sara Johnson', 'Sales'], ['Tom Becker', 'Sales'], ['Zoe Martin', 'HR']] }
      ] },
      solution: {
        approach: `<p>Spell out the NULL case. <code>dept &lt;&gt; 'Engineering' OR dept IS NULL</code> turns Rahul's UNKNOWN into TRUE (UNKNOWN OR TRUE = TRUE). The null-safe operator does the same in one test.</p>`,
        code: { lang: 'sql', db: 'hr', code: `SELECT name, dept
FROM employees
WHERE dept <> 'Engineering' OR dept IS NULL
ORDER BY name;` },
        alt: [{ lang: 'sql', db: 'hr', title: 'Null-safe comparison (SQLite 3.39+ / PostgreSQL)', code: `SELECT name, dept
FROM employees
WHERE dept IS DISTINCT FROM 'Engineering'
ORDER BY name;` }],
        complexity: `<p>O(N) scan (or O(N log N) with the sort). OR across "value" and "IS NULL" on the same column can still use an index in most engines (two ranges).</p>`,
        followUps: ['Count how many rows fall in each of the three cases and check they add up to 12.', 'Rewrite using <code>COALESCE(dept, \'\') &lt;&gt; \'Engineering\'</code> — why is that worse for indexes?', 'What does <code>WHERE dept = dept</code> return?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 5 — ORDER BY
     ===================================================================== */
  topics.push({
    title: 'ORDER BY: Sorting by Many Keys, Directions, Expressions and NULL Placement',
    analogy: `<p>A teacher sorting a pile of exam papers: first into stacks <b>by class</b> (A, B, C), then inside each class stack <b>by marks, highest first</b>. The second rule only matters when two papers are in the same class — it is a <b>tie-breaker</b>. And the papers with no name written on them? The teacher must decide: put them on top or at the bottom. That is <code>ORDER BY class ASC, marks DESC</code>, with <code>NULLS FIRST/LAST</code> for the nameless papers.</p>`,
    explain: `<p>A table is a <b>set of rows with no built-in order</b>. If you do not write <code>ORDER BY</code>, the database may return rows in any order it likes — and that order can change tomorrow (new index, parallel scan, data rewrite). <b>If order matters, you must say ORDER BY.</b></p>
<pre>SELECT name, dept, salary
FROM employees
ORDER BY dept ASC, salary DESC;</pre>
<ul>
<li><b>ASC</b> (ascending, the default): small → big, A → Z, old → new dates. <b>DESC</b>: the reverse.</li>
<li><b>Several keys</b>: sort by the first; only rows that <b>tie</b> on it are compared by the second, and so on. Each key has its own direction: <code>ORDER BY dept ASC, salary DESC</code>.</li>
<li><b>Expressions and aliases</b>: <code>ORDER BY salary + COALESCE(bonus,0) DESC</code> or, if you named it in SELECT, <code>ORDER BY total_comp DESC</code>. ORDER BY is one of the few places an alias is allowed (it runs after SELECT).</li>
<li><b>Column positions</b>: <code>ORDER BY 2</code> means "the 2nd output column". Legal, but fragile — avoid in real code.</li>
<li><b>Columns you did not select</b>: <code>SELECT name FROM employees ORDER BY salary</code> is fine (except together with DISTINCT in strict databases).</li>
</ul>
<p><b>Where do NULLs go?</b> Different databases disagree:</p>
${H.table(['Database', 'ASC puts NULL…', 'DESC puts NULL…', 'NULLS FIRST/LAST?'], [['SQLite, MySQL, SQL Server', 'first (NULL = smallest)', 'last', 'SQLite 3.30+ yes; MySQL/SQL Server no'], ['PostgreSQL, Oracle', 'last (NULL = largest)', 'first', 'yes']])}
<p>Portable trick when NULLS LAST is not available: <code>ORDER BY rating IS NULL, rating</code> — <code>rating IS NULL</code> is 0 for real values and 1 for NULLs, so NULLs sink to the bottom.</p>
<p><b>Text sorts by characters, not meaning:</b> <code>'10' &lt; '9'</code> as text (compares '1' vs '9' first), and with binary collation upper-case comes before lower-case (<code>'Zoe' &lt; 'adam'</code>). Store numbers as numbers, and use <code>COLLATE NOCASE</code> (SQLite) or <code>LOWER()</code> for case-insensitive sorting.</p>`,
    clues: [
      '"sorted by / ordered by / ranked", "highest first", "most recent first" → <code>ORDER BY … DESC</code>',
      '"ties broken by name" / "if equal, by id" → a <b>second sort key</b>; always add a unique last key for deterministic output',
      '"unrated / unknown values at the end" → <code>NULLS LAST</code> or the portable <code>col IS NULL, col</code> trick',
      '"case-insensitive alphabetical" → <code>COLLATE NOCASE</code> / <code>LOWER(col)</code>',
      '"pending orders first, then the rest by date" → sort by a boolean or CASE expression',
      'The grader says "order matters" → the output must be fully deterministic — check for ties'
    ],
    code: [{ lang: 'sql', db: 'hr', title: 'Multi-key sorting with explicit NULL placement (runnable)', code: `-- Department A→Z (unknown department last), then highest salary first,
-- then id as a final tie-breaker so the order is 100% deterministic.
SELECT name, dept, salary
FROM employees
ORDER BY dept ASC NULLS LAST,
         salary DESC,
         id;` }],
    codeTitle: ['Runnable reference query'],
    viz: [
      queryViz('ORDER BY dept ASC, salary DESC — key by key', 'SELECT name, dept, salary FROM employees ORDER BY dept ASC, salary DESC', { sortSteps: true }),
      queryViz('Ratings high→low, unrated last, ties by votes', 'SELECT title, rating, votes FROM movies ORDER BY rating DESC NULLS LAST, votes DESC', { sortSteps: true })
    ],
    examples: [
      {
        title: 'Two keys, two directions',
        html: `<p>Engineering's three engineers on 120000/120000/135000 are ordered by salary DESC <i>inside</i> the Engineering group. Lena and Marco tie on both dept and salary — without a third key their relative order is not guaranteed. Adding <code>, name</code> or <code>, id</code> fixes that.</p>`,
        code: { lang: 'sql', db: 'hr', code: `SELECT name, dept, salary
FROM employees
WHERE dept = 'Engineering'
ORDER BY salary DESC, name;   -- name breaks the Lena/Marco tie` }
      },
      {
        title: 'Moving NULLs to where you want them',
        html: `<p>In SQLite, <code>ORDER BY rating</code> puts the two unrated movies <b>first</b> (NULL is the smallest). <code>NULLS LAST</code> moves them to the end. The <code>rating IS NULL</code> trick works in every database, including MySQL, which has no NULLS LAST.</p>`,
        code: { lang: 'sql', db: 'movies', code: `SELECT title, rating FROM movies ORDER BY rating;                    -- NULLs first (SQLite)
SELECT title, rating FROM movies ORDER BY rating NULLS LAST;         -- NULLs last
SELECT title, rating FROM movies ORDER BY rating IS NULL, rating;    -- portable NULLs last` }
      },
      {
        title: 'Text vs number sorting, and case',
        html: `<p>Numbers stored as text sort "alphabetically": <code>'10' &lt; '100' &lt; '9'</code>. Cast them to sort numerically. With the default BINARY collation, every upper-case letter sorts before every lower-case one; <code>COLLATE NOCASE</code> sorts as humans expect.</p>`,
        code: { lang: 'sql', db: 'movies', code: `SELECT column1 AS v FROM (VALUES ('10'), ('9'), ('100')) ORDER BY v;                        -- 10, 100, 9
SELECT column1 AS v FROM (VALUES ('10'), ('9'), ('100')) ORDER BY CAST(v AS INTEGER);       -- 9, 10, 100
SELECT column1 AS w FROM (VALUES ('banana'), ('Apple'), ('cherry'), ('Blueberry')) ORDER BY w;               -- Apple, Blueberry, banana, cherry
SELECT column1 AS w FROM (VALUES ('banana'), ('Apple'), ('cherry'), ('Blueberry')) ORDER BY w COLLATE NOCASE; -- Apple, banana, Blueberry, cherry` }
      },
      {
        title: 'Custom priority with an expression',
        html: `<p>"Show pending orders first, then everything else, newest first." A comparison like <code>status = 'pending'</code> is 1 (TRUE), 0 (FALSE) or NULL in SQLite, so sorting it DESC puts pending orders on top. For more than two priority levels you would use a <code>CASE</code> expression (SQL 3).</p>`,
        code: { lang: 'sql', db: 'shop', code: `SELECT id, status, order_date
FROM orders
ORDER BY status = 'pending' DESC,   -- 1 (pending) before 0 / NULL
         order_date DESC;` }
      },
      {
        title: 'Sorting by alias, by position, and by a hidden column',
        html: `<p>All three are legal. Aliases are the most readable; positions break silently when someone reorders the select list; hidden-column sorting is fine but confuses readers who cannot see the sort key in the output.</p>`,
        code: { lang: 'sql', db: 'hr', code: `SELECT name, salary + COALESCE(bonus, 0) AS total_comp FROM employees ORDER BY total_comp DESC;
SELECT name, salary FROM employees ORDER BY 2 DESC;          -- 2 = second output column
SELECT name FROM employees ORDER BY hire_date;               -- sort key not displayed` }
      }
    ],
    deepDive: `<p><b>Why there is no "natural order".</b> Relations are sets; physical order depends on the storage engine (heap tables in PostgreSQL append rows anywhere free space exists; InnoDB/SQLite rowid tables happen to be clustered by primary key) and on the plan (an index scan, a hash aggregate or a parallel scan returns rows in different orders). Code that relies on "it always came back sorted" breaks on upgrades. Only the outermost ORDER BY is guaranteed — an ORDER BY inside a subquery or view may be ignored.</p>
<p><b>Cost of sorting.</b> Sorting N rows is O(N log N). Engines sort in memory up to a limit (<code>work_mem</code> in PostgreSQL, <code>sort_buffer_size</code> in MySQL) and spill to disk with an external merge sort beyond it. Two big savings: (1) an <b>index</b> on the sort key returns rows already ordered, so no sort is needed (watch for "USE TEMP B-TREE FOR ORDER BY" in SQLite's EXPLAIN QUERY PLAN, "Sort" nodes in PostgreSQL); (2) with <code>LIMIT k</code> the engine uses a <b>top-k heap</b> — O(N log k) and tiny memory.</p>
<p><b>Stability and determinism.</b> SQL sorting is not guaranteed stable. When the sort keys are not unique, equal rows may come back in any order, which makes pagination skip or repeat rows and makes tests flaky. Rule: the final ORDER BY key list should contain a unique column (often the primary key).</p>
<p><b>Collations.</b> Text order is defined by collation: BINARY (byte/code point), NOCASE (ASCII case folding in SQLite), or locale-aware ICU/CLDR collations (in German "ä" sorts with "a", in Swedish after "z"). An index only helps ORDER BY if it was built with the same collation as the query uses.</p>
<p><b>Mixed types in SQLite.</b> Because of dynamic typing, SQLite defines a total order across types: NULL &lt; INTEGER/REAL &lt; TEXT &lt; BLOB. A column that accidentally contains both <code>5</code> and <code>'5'</code> will sort the text one after all numbers.</p>`,
    aiEra: `<p><b>What AI changes:</b> dashboards and AI agents increasingly generate "top" and "ranked" lists for you, and LLM-written SQL almost always includes an ORDER BY — but rarely a <b>tie-breaker</b> or explicit NULL placement. <b>Use AI as a partner:</b> ask <code>Is the ORDER BY in this query deterministic? Which rows could tie?</code>, <code>Make NULL placement explicit and portable to MySQL and PostgreSQL</code>, or <code>Will this ORDER BY use the index on (dept, salary)?</code>. <b>Where AI goes wrong:</b> assumes PostgreSQL's NULLS-largest rule in SQLite/MySQL (or vice versa), writes <code>NULLS LAST</code> for MySQL where it is a syntax error, relies on ORDER BY inside subqueries/views, and sorts numeric text as text. <b>What you must still own:</b> knowing that row order is undefined without ORDER BY, designing deterministic sort keys for pagination and tests, and recognising when an index can remove the sort entirely.</p>`,
    problems: [{
      title: 'Worst-Rated Movies First, Unrated Last', level: 'Medium', tags: ['order by', 'nulls last', 'tie-breakers'], companies: ['Netflix', 'Amazon Prime Video', 'Spotify'],
      statement: `<p>The content team wants to review weak titles. List <code>title, rating, votes</code> for <b>all</b> movies, <b>lowest rating first</b>. Movies with the same rating: the one with <b>more votes</b> first (a more reliable low score). Movies without a rating go at the <b>very end</b>, ordered by title.</p>`,
      constraints: `<p>14 movies; <code>rating</code> and <code>votes</code> are nullable. The output order is graded exactly.</p>`,
      example: `${H.table(['title', 'rating', 'votes'], [['The Room', '3.6', '95000'], ['Groundhog Day', '8.0', '680000'], ['…', '…', '…'], ['Toy Story', H.c('y', '8.3'), '1050000'], ['Amelie', H.c('y', '8.3'), '780000'], ['Dangal', H.c('y', '8.3'), '200000'], ['…', '…', '…'], ['Dune: Part Three', H.c('m', 'NULL'), H.c('m', 'NULL')], ['Untitled Indie Film', H.c('m', 'NULL'), H.c('m', 'NULL')]])}<p>Three movies tie at 8.3 → most votes first. The two NULL ratings must come last — but SQLite's default puts NULL <b>first</b> in ascending order.</p>`,
      brute: { why: `<p><code>ORDER BY rating</code> alone puts the two unrated movies at the <b>top</b> in SQLite (NULL sorts as the smallest value), and the three 8.3 ties come back in an arbitrary order — the grader compares exact order, so both issues fail.</p>`, code: { lang: 'sql', db: 'movies', code: `SELECT title, rating, votes
FROM movies
ORDER BY rating;      -- NULLs first, ties unordered` } },
      mcq: { q: 'In SQLite, where do NULLs appear with <code>ORDER BY rating ASC</code>?', options: ['First', 'Last', 'Randomly', 'They are excluded'], answer: 0, explain: 'SQLite (like MySQL and SQL Server) treats NULL as smaller than any value, so ASC puts NULLs first. PostgreSQL and Oracle do the opposite.' },
      hints: [
        `<p>Hint 1: there are three sort rules — rating up, votes down, and title for the unrated ones. That is three ORDER BY keys.</p>`,
        `<p>Hint 2: control NULLs explicitly with <code>NULLS LAST</code> (SQLite 3.30+, PostgreSQL) or the portable <code>rating IS NULL</code> first key.</p>`,
        `<p>Hint 3: recipe: <code>ORDER BY rating ASC NULLS LAST, votes DESC, title</code>. Title is the final tie-breaker (titles are unique here).</p>`
      ],
      tests: { engine: 'sqlite', cases: [
        { cols: ['title', 'rating', 'votes'], rows: [['The Room', 3.6, 95000], ['Groundhog Day', 8, 680000], ['Lagaan', 8.1, 120000], ['Jurassic Park', 8.2, 1100000], ['Toy Story', 8.3, 1050000], ['Amelie', 8.3, 780000], ['Dangal', 8.3, 200000], ['Parasite', 8.5, 950000], ['Se7en', 8.6, 1800000], ['Spirited Away', 8.6, 850000], ['The Matrix', 8.7, 2000000], ['Inception', 8.8, 2500000], ['Dune: Part Three', null, null], ['Untitled Indie Film', null, null]] },
        { setup: 'UPDATE movies SET rating = 8.3 WHERE id IN (1, 2, 3, 4);', cols: ['title', 'rating', 'votes'], rows: [['The Room', 3.6, 95000], ['Groundhog Day', 8, 680000], ['Lagaan', 8.1, 120000], ['Jurassic Park', 8.2, 1100000], ['Inception', 8.3, 2500000], ['The Matrix', 8.3, 2000000], ['Toy Story', 8.3, 1050000], ['Parasite', 8.3, 950000], ['Spirited Away', 8.3, 850000], ['Amelie', 8.3, 780000], ['Dangal', 8.3, 200000], ['Se7en', 8.6, 1800000], ['Dune: Part Three', null, null], ['Untitled Indie Film', null, null]] },
        { setup: 'UPDATE movies SET rating = 7, votes = 1000;', cols: ['title', 'rating', 'votes'], rows: [['Amelie', 7, 1000], ['Dangal', 7, 1000], ['Dune: Part Three', 7, 1000], ['Groundhog Day', 7, 1000], ['Inception', 7, 1000], ['Jurassic Park', 7, 1000], ['Lagaan', 7, 1000], ['Parasite', 7, 1000], ['Se7en', 7, 1000], ['Spirited Away', 7, 1000], ['The Matrix', 7, 1000], ['The Room', 7, 1000], ['Toy Story', 7, 1000], ['Untitled Indie Film', 7, 1000]] },
        { setup: 'UPDATE movies SET rating = NULL, votes = NULL;', cols: ['title', 'rating', 'votes'], rows: [['Amelie', null, null], ['Dangal', null, null], ['Dune: Part Three', null, null], ['Groundhog Day', null, null], ['Inception', null, null], ['Jurassic Park', null, null], ['Lagaan', null, null], ['Parasite', null, null], ['Se7en', null, null], ['Spirited Away', null, null], ['The Matrix', null, null], ['The Room', null, null], ['Toy Story', null, null], ['Untitled Indie Film', null, null]] },
        { setup: 'DELETE FROM movies WHERE id <> 5;', cols: ['title', 'rating', 'votes'], rows: [['Dangal', 8.3, 200000]] },
        { setup: 'DELETE FROM movies;', rows: [] },
        { setup: 'INSERT INTO movies (id, title, rating, votes) VALUES (15, \'Zero Star\', 0, 5), (16, \'Aardvark\', NULL, NULL);', cols: ['title', 'rating', 'votes'], rows: [['Zero Star', 0, 5], ['The Room', 3.6, 95000], ['Groundhog Day', 8, 680000], ['Lagaan', 8.1, 120000], ['Jurassic Park', 8.2, 1100000], ['Toy Story', 8.3, 1050000], ['Amelie', 8.3, 780000], ['Dangal', 8.3, 200000], ['Parasite', 8.5, 950000], ['Se7en', 8.6, 1800000], ['Spirited Away', 8.6, 850000], ['The Matrix', 8.7, 2000000], ['Inception', 8.8, 2500000], ['Aardvark', null, null], ['Dune: Part Three', null, null], ['Untitled Indie Film', null, null]] }
      ] },
      solution: {
        approach: `<p>Three keys: rating ascending with NULLs forced last, votes descending to break rating ties, and title as a final deterministic key (it also orders the unrated films, whose rating and votes are both NULL).</p>`,
        code: { lang: 'sql', db: 'movies', code: `SELECT title, rating, votes
FROM movies
ORDER BY rating ASC NULLS LAST,   -- unrated at the end
         votes DESC,              -- among equal ratings, more votes first
         title;                   -- final deterministic tie-breaker` },
        alt: [{ lang: 'sql', db: 'movies', title: 'Portable (MySQL has no NULLS LAST)', code: `SELECT title, rating, votes
FROM movies
ORDER BY rating IS NULL,   -- 0 for rated, 1 for unrated
         rating,
         votes DESC,
         title;` }],
        complexity: `<p>O(N log N) sort. An index on <code>(rating, votes DESC, title)</code> would let the engine read rows already in order.</p>`,
        followUps: ['Return only the 3 weakest rated movies.', 'How would this behave in PostgreSQL if you dropped NULLS LAST?', 'Why is <code>ORDER BY 2</code> risky here?']
      }
    }]
  });

  // OFFSET pagination vs keyset pagination: how many rows does each page cost?
  function pagingFrames(input) {
    var m = /(\d+)/.exec(String(input || '4'));
    var size = m ? Number(m[1]) : 4;
    if (size < 2 || size > 7) throw new Error('Enter a page size between 2 and 7');
    var R = runQuery('SELECT id, order_date, amount FROM orders ORDER BY order_date DESC, id DESC');
    var rows = R.sorted, pages = Math.ceil(rows.length / size), F = [], offCost = [], keyCost = [], totOff = 0, totKey = 0;
    F.push({ narr: 'Orders sorted newest first (<code>ORDER BY order_date DESC, id DESC</code>), page size <b>' + size + '</b> → ' + pages + ' pages. We compare two ways to fetch each page: <b>OFFSET</b> ("skip the first k rows") and <b>keyset</b> ("continue after the last row I saw").', parts: [outTable(R, rows, {}, 'All ' + rows.length + ' orders in display order', [{ name: '#', get: function (r) { return rows.indexOf(r) + 1; } }])] });
    for (var p = 1; p <= pages; p++) {
      var off = (p - 1) * size, hl = {}, last = rows[Math.min(off + size, rows.length) - 1], prev = off ? rows[off - 1] : null;
      rows.forEach(function (r, i) { hl[i] = i < off ? 'bad' : i < off + size ? 'sel' : 'done'; });
      var readOff = Math.min(off + size, rows.length), readKey = Math.min(size, rows.length - off);
      totOff += readOff; totKey += readKey; offCost.push(readOff); keyCost.push(readKey);
      F.push({
        narr: '<b>Page ' + p + '</b> with <code>LIMIT ' + size + ' OFFSET ' + off + '</code>: the engine still walks the first ' + off + ' rows (red) only to throw them away, then returns ' + readKey + ' (purple) → reads <b>' + readOff + '</b> rows. ' +
          (prev ? 'Keyset version: <code>WHERE (order_date, id) &lt; (\'' + prev.src[2] + '\', ' + prev.src[0] + ')</code> jumps straight past the last row of page ' + (p - 1) + ' using the index → reads only <b>' + readKey + '</b>.' : 'Page 1 is identical for both methods.'),
        parts: [outTable(R, rows, hl, 'OFFSET ' + off + ': red = read and discarded, purple = returned', [{ name: '#', get: function (r) { return rows.indexOf(r) + 1; } }]), { type: 'vars', label: 'Rows read for this page', vals: { page: p, offset_method: readOff, keyset_method: readKey, next_cursor: last ? "('" + last.src[2] + "', " + last.src[0] + ')' : '-' }, hl: { offset_method: off ? 'bad' : '', keyset_method: 'ok' } }]
      });
    }
    F.push({ narr: 'Total rows read to show every page: OFFSET = <b>' + totOff + '</b>, keyset = <b>' + totKey + '</b>. OFFSET cost grows with the page number (page k costs ≈ k × size), so deep pages on a 10-million-row table get slower and slower. Keyset stays flat — and it does not skip or repeat rows when new orders arrive between page loads.', parts: [{ type: 'bars', label: 'Rows read per page — OFFSET', values: offCost, idxLabels: offCost.map(function (x, i) { return 'p' + (i + 1); }) }, { type: 'bars', label: 'Rows read per page — keyset', values: keyCost, idxLabels: keyCost.map(function (x, i) { return 'p' + (i + 1); }) }] });
    return F;
  }

  /* =====================================================================
     TOPIC 6 — LIMIT / OFFSET
     ===================================================================== */
  topics.push({
    title: 'LIMIT & OFFSET: Top-N Queries and Pagination',
    analogy: `<p>Search results on a website: you see <b>10 results per page</b>. Page 1 shows results 1–10, page 2 shows 11–20. <code>LIMIT</code> is "how many per page" and <code>OFFSET</code> is "how many to skip first". And just like a "Top 10 songs" chart only makes sense after the songs are <b>ranked</b>, LIMIT only means something after <code>ORDER BY</code> — otherwise you get "any 10 songs".</p>`,
    explain: `<p><code>LIMIT n</code> returns at most <b>n</b> rows. <code>OFFSET k</code> skips the first <b>k</b> rows before counting. Both are applied <b>last</b>, after WHERE, SELECT, DISTINCT and ORDER BY.</p>
<pre>-- Top 3 earners
SELECT name, salary FROM employees ORDER BY salary DESC, id LIMIT 3;

-- Page 2 with 3 rows per page = rows 4..6
SELECT name, salary FROM employees ORDER BY salary DESC, id LIMIT 3 OFFSET 3;</pre>
<p><b>Pagination formula:</b> <code>OFFSET = (page − 1) × page_size</code>, <code>LIMIT = page_size</code>.</p>
<p><b>Same idea, different spellings:</b></p>
${H.table(['Database', 'Top 5', 'Skip 10, take 5'], [['SQLite, PostgreSQL, MySQL', '<code>LIMIT 5</code>', '<code>LIMIT 5 OFFSET 10</code>'], ['SQLite, MySQL (short form)', '', '<code>LIMIT 10, 5</code> ← offset comes FIRST'], ['SQL standard, PostgreSQL, Oracle 12c+', '<code>FETCH FIRST 5 ROWS ONLY</code>', '<code>OFFSET 10 ROWS FETCH NEXT 5 ROWS ONLY</code>'], ['SQL Server', '<code>SELECT TOP 5 …</code>', '<code>OFFSET 10 ROWS FETCH NEXT 5 ROWS ONLY</code> (needs ORDER BY)']])}
<p><b>Golden rules:</b></p>
<ul>
<li><b>Always pair LIMIT with ORDER BY</b>, otherwise "first 3 rows" is whatever the engine happens to read first.</li>
<li>Make the ORDER BY <b>unique</b> (add <code>id</code>), or rows that tie can jump between pages — page 2 might repeat a row from page 1 and skip another.</li>
<li>"N-th highest <i>value</i>" needs <code>DISTINCT</code> so duplicates do not occupy several positions.</li>
<li><b>Deep OFFSETs are slow</b>: <code>OFFSET 1000000</code> makes the engine read and discard a million rows. For infinite scroll / APIs use <b>keyset (seek) pagination</b>: remember the last row's sort key and ask for rows "after" it.</li>
</ul>`,
    clues: [
      '"top 5 / first 10 / the highest / the latest" → <code>ORDER BY … LIMIT n</code>',
      '"<b>second</b> highest / N-th highest salary" → <code>DISTINCT … ORDER BY … DESC LIMIT 1 OFFSET N-1</code> (+ return NULL if missing)',
      '"page 3 of results, 20 per page" → <code>LIMIT 20 OFFSET 40</code>',
      '"infinite scroll", "API cursor", "millions of rows, deep pages are slow" → keyset pagination',
      '"include everyone tied for 3rd place" → LIMIT cuts ties arbitrarily; use <code>FETCH … WITH TIES</code> or a ranking window function',
      '"top 2 per department" → not LIMIT alone; that is a window-function (ROW_NUMBER) job'
    ],
    code: [{ lang: 'sql', db: 'hr', title: 'Top-N, pagination and keyset (runnable)', code: `-- Top 3 earners (id breaks ties so the result is deterministic)
SELECT id, name, salary FROM employees ORDER BY salary DESC, id DESC LIMIT 3;

-- Page 2 (3 rows per page): OFFSET = (2 - 1) * 3
SELECT id, name, salary FROM employees ORDER BY salary DESC, id DESC LIMIT 3 OFFSET 3;

-- Keyset pagination: continue after the last row of page 1, which was (salary 160000, id 2)
SELECT id, name, salary
FROM employees
WHERE (salary, id) < (160000, 2)      -- row-value comparison (SQLite 3.15+, PostgreSQL, MySQL)
ORDER BY salary DESC, id DESC
LIMIT 3;` }],
    codeTitle: ['Runnable reference queries'],
    viz: [
      queryViz('LIMIT 3 OFFSET 3 = page 2 of 3-row pages', 'SELECT name, salary FROM employees ORDER BY salary DESC, id LIMIT 3 OFFSET 3'),
      { title: 'OFFSET vs keyset pagination: rows read per page', input: '4', inputLabel: 'Page size (2–7)', gen: function (input) { return pagingFrames(input); } }
    ],
    examples: [
      {
        title: 'Top 3 — and the tie you did not see',
        html: `<p>Priya and Sara both earn 250000. "Top 1 earner" with <code>LIMIT 1</code> returns one of them <b>arbitrarily</b> unless a tie-breaker is given. Decide what the business wants: one row (add <code>id</code>), or everyone tied (PostgreSQL 13+/Oracle: <code>FETCH FIRST 1 ROWS WITH TIES</code>; anywhere: <code>WHERE salary = (SELECT MAX(salary) …)</code>).</p>`,
        code: { lang: 'sql', db: 'hr', code: `SELECT name, salary FROM employees ORDER BY salary DESC LIMIT 1;           -- Priya OR Sara?
SELECT name, salary FROM employees ORDER BY salary DESC, id LIMIT 1;       -- deterministic: Priya
SELECT name, salary FROM employees
WHERE salary = (SELECT MAX(salary) FROM employees);                        -- both tied rows` }
      },
      {
        title: 'The page formula, and LIMIT a, b gotcha',
        html: `<p>Page 3 with 4 orders per page → <code>OFFSET (3−1)×4 = 8</code>. SQLite/MySQL also accept <code>LIMIT 8, 4</code> — the <b>offset comes first</b> in that short form, the opposite of <code>LIMIT 4 OFFSET 8</code>. Mixing them up is a classic off-by-a-page bug.</p>`,
        code: { lang: 'sql', db: 'shop', code: `SELECT id, order_date FROM orders ORDER BY order_date DESC, id DESC LIMIT 4 OFFSET 8;   -- page 3
SELECT id, order_date FROM orders ORDER BY order_date DESC, id DESC LIMIT 8, 4;         -- same rows!` }
      },
      {
        title: 'N-th highest distinct value (and NULL when it does not exist)',
        html: `<p>Second-highest salary: without DISTINCT, rows 1 and 2 are both 250000, so <code>OFFSET 1</code> returns 250000 — wrong. With DISTINCT the values are 250000, 160000, … and the answer is ${H.c('g', '160000')}. Wrapping in a scalar subquery returns a row with NULL instead of <i>no row</i> when there is no such salary — exactly what LeetCode 176 expects.</p>`,
        code: { lang: 'sql', db: 'hr', code: `SELECT salary FROM employees ORDER BY salary DESC LIMIT 1 OFFSET 1;            -- 250000 (wrong)
SELECT DISTINCT salary FROM employees ORDER BY salary DESC LIMIT 1 OFFSET 1;   -- 160000

SELECT (SELECT DISTINCT salary FROM employees
        ORDER BY salary DESC LIMIT 1 OFFSET 20) AS twenty_first_highest;      -- NULL, not empty` }
      },
      {
        title: 'Random sample — and why it is expensive',
        html: `<p><code>ORDER BY RANDOM() LIMIT 2</code> picks 2 random rows, but the engine must assign a random number to <b>every</b> row and sort them all. Fine for 14 rows, painful for 100 million (use <code>TABLESAMPLE</code> in PostgreSQL/SQL Server, or pick random ids).</p>`,
        code: { lang: 'sql', db: 'movies', code: `SELECT title FROM movies ORDER BY RANDOM() LIMIT 2;   -- different every run` }
      }
    ],
    deepDive: `<p><b>How LIMIT executes.</b> LIMIT is a pipeline <i>stop signal</i>: once n rows have been produced, upstream operators stop. With an index that already provides the ORDER BY, <code>ORDER BY created_at DESC LIMIT 10</code> reads just 10 index entries — O(log N + 10). Without such an index the engine must see every row, but uses a <b>bounded top-k heap</b> (O(N log k) time, O(k) memory) rather than a full sort; PostgreSQL shows this as "top-N heapsort".</p>
<p><b>Why OFFSET is O(offset).</b> Rows have no stored "position number", so OFFSET 100000 must produce and discard 100000 rows (through the index or the table). Latency grows linearly with page depth. <b>Keyset (seek) pagination</b> replaces "skip k" with a predicate on the last seen sort key: <code>WHERE (created_at, id) &lt; (:last_ts, :last_id) ORDER BY created_at DESC, id DESC LIMIT 20</code>. With a composite index on <code>(created_at, id)</code> each page is an O(log N) seek. Trade-offs: you cannot jump to "page 37" directly, and mixed sort directions (ASC on one key, DESC on another) cannot use a single row-value comparison — you expand it to <code>a &lt; :a OR (a = :a AND b &gt; :b)</code>.</p>
<p><b>Consistency under writes.</b> OFFSET pagination over live data skips or duplicates rows when inserts/deletes happen between page requests (a new order arrives → everything shifts by one). Keyset pagination is stable because it anchors on values, not positions. APIs typically encode the last key into an opaque <i>cursor</i> token (base64 JSON) — the pattern behind GraphQL Relay connections and most public REST APIs.</p>
<p><b>Dialect notes.</b> The SQL:2008 standard form is <code>OFFSET k ROWS FETCH FIRST n ROWS ONLY</code>; <code>WITH TIES</code> returns extra rows equal to the last one (requires ORDER BY). SQL Server's <code>TOP (n) WITH TIES</code> and <code>TOP n PERCENT</code> exist too. SQLite treats a negative LIMIT as "no limit" (<code>LIMIT -1 OFFSET 5</code> means "skip 5, return the rest"). Oracle before 12c used <code>ROWNUM</code>, which is assigned <i>before</i> ORDER BY — the classic bug <code>WHERE ROWNUM &lt;= 3 ORDER BY sal DESC</code> returns 3 arbitrary rows, sorted.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI coding assistants generate REST endpoints with <code>LIMIT ? OFFSET ?</code> pagination by default — fine for admin screens, a scaling problem for feeds and public APIs. AI agents that browse databases also use LIMIT constantly to keep results small enough for their context window, which can make them silently miss rows. <b>Use AI as a partner:</b> ask <code>Convert this OFFSET pagination to keyset pagination with an opaque cursor</code>, <code>What index makes this ORDER BY … LIMIT query avoid a sort?</code>, or <code>Is this top-N deterministic when values tie?</code>. <b>Where AI goes wrong:</b> LIMIT without ORDER BY, forgets DISTINCT in "N-th highest", swaps the arguments of <code>LIMIT a, b</code>, writes <code>TOP</code> for SQLite or <code>LIMIT</code> for SQL Server, and builds keyset predicates that break with mixed sort directions or NULL keys. <b>What you must still own:</b> choosing the pagination strategy for the product, guaranteeing unique sort keys, and reasoning about cost at page 10,000.</p>`,
    problems: [{
      title: 'Second Highest Salary', level: 'Medium', tags: ['limit', 'offset', 'distinct', 'classic'], companies: ['Amazon', 'Meta', 'Adobe', 'Uber'],
      statement: `<p>Return the <b>second highest distinct salary</b> from <code>employees</code> as a single column named <code>second_highest_salary</code>. If there is no second highest salary, return <b>NULL</b> (one row containing NULL, not an empty result).</p>`,
      constraints: `<p>Salaries may repeat (two people earn 250000). Classic LeetCode 176 shape.</p>`,
      example: `${H.table(['distinct salaries (desc)', 'position'], [['250000 ' + H.c('m', '(Priya, Sara)'), '1st'], [H.c('g', '160000'), H.c('g', '2nd ← answer')], ['135000', '3rd']])}<p>Output: <code>second_highest_salary = 160000</code>. Without DISTINCT the 2nd <i>row</i> is Sara's 250000 — the same value as the 1st.</p>`,
      brute: { why: `<p>Sorting rows and skipping one returns the 2nd <b>row</b>, not the 2nd <b>value</b>. Priya and Sara both earn 250000, so the query answers ${H.c('r', '250000')}. It also returns an empty result (no row) when fewer than two salaries exist, instead of NULL.</p>`, code: { lang: 'sql', db: 'hr', code: `SELECT salary AS second_highest_salary
FROM employees
ORDER BY salary DESC
LIMIT 1 OFFSET 1;     -- 250000: duplicates occupy positions` } },
      mcq: { q: 'Why does the naive <code>ORDER BY salary DESC LIMIT 1 OFFSET 1</code> fail here?', options: ['Duplicate salaries take up more than one position', 'OFFSET is not supported in SQLite', 'DESC sorts NULLs first', 'LIMIT runs before ORDER BY'], answer: 0, explain: 'Two rows share the top salary, so the second row still holds the top value. DISTINCT collapses duplicates before ORDER BY/LIMIT.' },
      hints: [
        `<p>Hint 1: you need the 2nd <i>value</i>, so remove duplicate values before counting positions.</p>`,
        `<p>Hint 2: logical order is DISTINCT → ORDER BY → LIMIT/OFFSET, so <code>SELECT DISTINCT salary … ORDER BY salary DESC LIMIT 1 OFFSET 1</code> works.</p>`,
        `<p>Hint 3: to get NULL instead of no row, wrap it as a scalar subquery: <code>SELECT ( … ) AS second_highest_salary;</code> — a scalar subquery with no row evaluates to NULL.</p>`
      ],
      tests: { engine: 'sqlite', cases: [
        { cols: ['second_highest_salary'], rows: [[160000]] },
        { setup: 'UPDATE employees SET salary = 100;', cols: ['second_highest_salary'], rows: [[null]] },
        { setup: 'DELETE FROM employees WHERE id <> 1;', cols: ['second_highest_salary'], rows: [[null]] },
        { setup: 'DELETE FROM employees;', cols: ['second_highest_salary'], rows: [[null]] },
        { setup: 'UPDATE employees SET salary = NULL WHERE id NOT IN (1, 2, 3);', cols: ['second_highest_salary'], rows: [[160000]] },
        { setup: 'UPDATE employees SET salary = NULL WHERE id <> 1;', cols: ['second_highest_salary'], rows: [[null]] },
        { setup: 'UPDATE employees SET salary = -salary;', cols: ['second_highest_salary'], rows: [[-85000]] },
        { setup: 'UPDATE employees SET salary = NULL WHERE id IN (1, 5);', cols: ['second_highest_salary'], rows: [[135000]] }
      ] },
      solution: {
        approach: `<p>De-duplicate salaries with DISTINCT, sort descending, skip the first value and take one. Wrapping the whole thing in a scalar subquery guarantees exactly one output row: the value, or NULL when there is no second salary.</p>`,
        code: { lang: 'sql', db: 'hr', code: `SELECT (
    SELECT DISTINCT salary
    FROM employees
    WHERE salary IS NOT NULL
    ORDER BY salary DESC
    LIMIT 1 OFFSET 1
) AS second_highest_salary;` },
        alt: [{ lang: 'sql', db: 'hr', title: 'Alternative with MAX (no LIMIT)', code: `-- Highest salary that is below the overall maximum
SELECT MAX(salary) AS second_highest_salary
FROM employees
WHERE salary < (SELECT MAX(salary) FROM employees);` }],
        complexity: `<p>O(N log N) for the distinct sort, or O(N) with the MAX version (two scans). With an index on salary both become O(log N) seeks.</p>`,
        followUps: ['Generalise to the N-th highest salary (LeetCode 177).', 'Return the names of everyone earning the second highest salary.', 'Solve it with DENSE_RANK() (Window Functions module).']
      }
    }]
  });

  // How an engine removes duplicates: hash-set walk, then sort-and-compare-neighbours
  function distinctFrames(input) {
    var m = /^\s*(\w+)\s*\.\s*(\w+)\s*$/.exec(String(input || ''));
    if (!m || !DATA[m[1].toLowerCase()]) throw new Error('Enter table.column, e.g. orders.status or customers.country');
    var tbl = DATA[m[1].toLowerCase()], ci = tbl.cols.indexOf(m[2].toLowerCase());
    if (ci < 0) throw new Error('Column must be one of: ' + tbl.cols.join(', '));
    var vals = tbl.rows.map(function (r) { return r[ci]; }), F = [], seen = [], hl = {};
    var label = function (v) { return v === null ? 'NULL' : String(v); };
    F.push({ narr: '<code>SELECT DISTINCT ' + m[2] + ' FROM ' + m[1] + '</code>. Strategy 1 — <b>hashing</b>: walk the rows once, keep a set of values already emitted. New value → output it; already in the set → it is a duplicate, skip it.', parts: [{ type: 'array', label: m[2] + ' (in storage order)', values: vals.map(label) }, { type: 'set', label: 'seen set (= output so far)', items: [] }] });
    vals.forEach(function (v, i) {
      var key = label(v), dup = seen.indexOf(key) >= 0, sh = {};
      hl = {}; for (var k = 0; k < i; k++) hl[k] = 'done'; hl[i] = dup ? 'bad' : 'ok';
      if (!dup) seen.push(key);
      sh[key] = dup ? 'bad' : 'ok';
      F.push({ narr: 'Row ' + (i + 1) + ': <b>' + H.esc(key) + '</b> ' + (dup ? '<span class="c-r">is already in the set → duplicate, skipped</span>.' : '<span class="c-g">is new → emitted and remembered</span>.') + (v === null ? ' Note: DISTINCT treats all NULLs as one value (unlike WHERE, where NULL = NULL is UNKNOWN).' : ''), parts: [{ type: 'array', label: m[2], values: vals.map(label), hl: hl, ptr: (function () { var o = {}; o[i] = 'row'; return o; })() }, { type: 'set', label: 'seen set (= output so far)', items: seen.slice(), hl: sh }] });
    });
    var sorted = vals.slice().sort(function (a, b) { if (a === null) return b === null ? 0 : -1; if (b === null) return 1; var c = compare(a, b); return c; }).map(label);
    var sh2 = {}; sorted.forEach(function (v, i) { sh2[i] = i > 0 && sorted[i - 1] === v ? 'bad' : 'ok'; });
    F.push({ narr: 'Strategy 2 — <b>sorting</b>: sort the values, then duplicates sit next to each other; keep a value only if it differs from its left neighbour (red = equal to neighbour → dropped). Engines pick hashing or sorting based on size and memory; if an index already gives sorted order, the sort is free. Both give <b>' + seen.length + '</b> distinct values from ' + vals.length + ' rows.', parts: [{ type: 'array', label: 'sorted ' + m[2], values: sorted, hl: sh2 }, { type: 'set', label: 'DISTINCT result', items: seen.slice() }] });
    return F;
  }

  /* =====================================================================
     TOPIC 7 — DISTINCT
     ===================================================================== */
  topics.push({
    title: 'DISTINCT: Removing Duplicate Rows (and What It Really Compares)',
    analogy: `<p>A guest sign-in sheet at a party: some people signed three times because they went out and came back. To know <b>who</b> came, you read the sheet and write each name once on a clean list. That clean list is <code>SELECT DISTINCT name</code>. Now suppose the sheet has "name + time" and you copy both — "Asha 7pm" and "Asha 9pm" are <b>different lines</b>, so both stay. DISTINCT compares the <b>whole line you copy</b>, not just the first word.</p>`,
    explain: `<p><code>SELECT DISTINCT</code> removes duplicate <b>rows from the result</b>. Two rows are duplicates when <b>every selected column</b> is equal.</p>
<pre>SELECT DISTINCT dept FROM employees;          -- each department once (plus one NULL)
SELECT DISTINCT dept, title FROM employees;   -- each (dept, title) PAIR once</pre>
<ul>
<li><b>One DISTINCT per SELECT</b>, written right after <code>SELECT</code>. It applies to the <i>whole</i> select list. <code>SELECT DISTINCT(dept), title</code> is <b>not</b> "distinct on dept only" — the parentheses are just grouping the expression <code>dept</code>; pairs are still compared.</li>
<li><b>NULLs count as equal</b> for DISTINCT: three NULL cities become one NULL row. (In WHERE, NULL = NULL is UNKNOWN — DISTINCT uses a different rule, "is not distinct from".)</li>
<li><b>Logical position</b>: DISTINCT runs <b>after SELECT</b> (it needs the final columns) and <b>before ORDER BY and LIMIT</b>. So <code>SELECT DISTINCT salary … ORDER BY salary DESC LIMIT 1 OFFSET 1</code> really is "second highest distinct salary".</li>
<li><b>Counting unique values</b>: <code>COUNT(DISTINCT customer_id)</code> (aggregates are next module) — not <code>DISTINCT COUNT(customer_id)</code>.</li>
<li><code>SELECT DISTINCT x</code> gives the same rows as <code>SELECT x … GROUP BY x</code>. Use DISTINCT to de-duplicate, GROUP BY when you also compute per-group numbers.</li>
</ul>
<p><b>Smell warning:</b> if you "need" DISTINCT to fix duplicate rows coming out of a JOIN, the real bug is usually the join (a 1-to-many relationship you did not expect). DISTINCT hides the symptom and costs a sort or hash.</p>`,
    clues: [
      '"list the <b>unique</b> / <b>different</b> / <b>distinct</b> cities / statuses / categories" → <code>SELECT DISTINCT</code>',
      '"which customers <b>have placed</b> an order" (asked about people, data is per order) → DISTINCT customer_id',
      '"N-th highest <b>value</b>" → DISTINCT before ORDER BY/LIMIT',
      '"how many unique visitors" → <code>COUNT(DISTINCT visitor_id)</code> (aggregates module)',
      'Duplicate rows appeared after adding a JOIN → fix the join; DISTINCT is a band-aid',
      '"one row per X with the latest Y" → not DISTINCT (that is <code>DISTINCT ON</code> in PostgreSQL or ROW_NUMBER)'
    ],
    code: [{ lang: 'sql', db: 'shop', title: 'DISTINCT on one column and on several (runnable)', code: `-- Unique countries (NULL appears once)
SELECT DISTINCT country FROM customers ORDER BY country;

-- Unique (country, city) pairs: London/UK appears once, Mumbai/India once
SELECT DISTINCT country, city FROM customers ORDER BY country, city;

-- Which customers ordered at least once? (orders has one row per order)
SELECT DISTINCT customer_id FROM orders ORDER BY customer_id;` }],
    codeTitle: ['Runnable reference queries'],
    viz: [
      queryViz('DISTINCT compares whole rows: (dept, title) pairs', 'SELECT DISTINCT dept, title FROM employees ORDER BY dept, title'),
      { title: 'How the engine finds duplicates: hash set vs sort', input: 'customers.country', inputLabel: 'table.column (e.g. orders.status, products.category, employees.dept)', gen: function (input) { return distinctFrames(input || 'customers.country'); } },
      queryViz('Unique countries — NULL kept once', 'SELECT DISTINCT country FROM customers ORDER BY country')
    ],
    examples: [
      {
        title: 'One column vs two columns',
        html: `<p><code>SELECT DISTINCT dept</code> gives 5 rows (Engineering, Sales, Marketing, HR and NULL). <code>SELECT DISTINCT dept, title</code> gives 9 rows because Engineering appears with three different titles. Adding a column can only keep or <i>increase</i> the number of distinct rows.</p>`,
        code: { lang: 'sql', db: 'hr', code: `SELECT DISTINCT dept FROM employees;          -- 5 rows
SELECT DISTINCT dept, title FROM employees;   -- 9 rows` }
      },
      {
        title: 'The DISTINCT(...) myth',
        html: `<p>Many people believe <code>SELECT DISTINCT(dept), name</code> makes only <i>dept</i> unique. It does not — it returns all 12 (dept, name) pairs because names are unique. If you want "one row per department with some name", you need aggregation (<code>GROUP BY dept</code> + <code>MIN(name)</code>) or a window function.</p>`,
        code: { lang: 'sql', db: 'hr', code: `SELECT DISTINCT(dept), name FROM employees;   -- still 12 rows!
SELECT dept, MIN(name) AS first_name_alphabetically
FROM employees GROUP BY dept;                 -- one row per dept (next module)` }
      },
      {
        title: 'DISTINCT and NULL: one NULL survives',
        html: `<p>Diya and Ivan have NULL cities. <code>SELECT DISTINCT city</code> shows a single NULL row. If you want only real cities, filter first: <code>WHERE city IS NOT NULL</code> — WHERE runs before DISTINCT, so the NULL never reaches it.</p>`,
        code: { lang: 'sql', db: 'shop', code: `SELECT DISTINCT city FROM customers;                          -- 9 rows incl. one NULL
SELECT DISTINCT city FROM customers WHERE city IS NOT NULL;   -- 8 rows` }
      },
      {
        title: 'Counting unique values vs de-duplicating rows',
        html: `<p>14 orders were placed by 10 different customers. <code>COUNT(DISTINCT customer_id)</code> counts unique values; <code>SELECT DISTINCT</code> lists them. (COUNT is covered properly in SQL 3 — shown here because interviewers mix the two.)</p>`,
        code: { lang: 'sql', db: 'shop', code: `SELECT COUNT(*)                    AS orders,
       COUNT(DISTINCT customer_id) AS unique_customers
FROM orders;` }
      }
    ],
    deepDive: `<p><b>Implementation.</b> DISTINCT is a de-duplication operator, implemented exactly like GROUP BY without aggregates: either <b>hash aggregation</b> (one pass, a hash table of seen rows, O(N) expected time, memory proportional to the number of distinct rows, spills to disk in partitions when large) or <b>sort-based</b> (sort O(N log N), then drop rows equal to their predecessor; output comes out sorted). If an index already supplies rows ordered by the DISTINCT columns, the sort is free and the engine streams ("Unique" node in PostgreSQL). SQLite's EXPLAIN QUERY PLAN shows "USE TEMP B-TREE FOR DISTINCT" when it builds a temporary structure.</p>
<p><b>Equality rules.</b> DISTINCT uses "not distinct" comparison: NULL matches NULL. Text equality follows the column's collation, so under a case-insensitive collation 'Mumbai' and 'MUMBAI' collapse into one (MySQL default), while SQLite/PostgreSQL keep both. Floating-point values that print the same may still differ in the last bit and stay separate.</p>
<p><b>ORDER BY with DISTINCT.</b> Standard SQL (and PostgreSQL) requires ORDER BY expressions to appear in the select list when DISTINCT is used — otherwise which of the collapsed rows' values would you sort by? SQLite and older MySQL allow it and pick an arbitrary row's value, which is non-deterministic.</p>
<p><b>Variants.</b> PostgreSQL's <code>DISTINCT ON (dept) … ORDER BY dept, salary DESC</code> keeps the first row per dept — a concise "top-1 per group". <code>UNION</code> (without ALL) applies DISTINCT across the combined result; <code>UNION ALL</code> skips that cost. <code>COUNT(DISTINCT x)</code> on huge data is expensive; analytics engines offer approximate versions (<code>APPROX_COUNT_DISTINCT</code>, HyperLogLog) with ~1–2% error and tiny memory.</p>
<p><b>Performance smell.</b> A DISTINCT over many wide columns forces the engine to hash or sort every column of every row. When duplicates come from a join, rewrite with <code>EXISTS</code> (semi-join) so duplicates are never produced.</p>`,
    aiEra: `<p><b>What AI changes:</b> LLM-generated SQL often sprinkles <code>DISTINCT</code> "just in case" after joins — the query looks right, the counts look plausible, and a fan-out bug is hidden underneath. Spotting an unjustified DISTINCT is now a core code-review skill. <b>Use AI as a partner:</b> ask <code>Why would this query return duplicates without DISTINCT? Show the join that fans out</code>, or <code>Rewrite this SELECT DISTINCT … JOIN as an EXISTS semi-join</code>. For huge analytics tables ask whether an approximate distinct count is acceptable. <b>Where AI goes wrong:</b> believes <code>DISTINCT(col)</code> applies to one column, uses DISTINCT where GROUP BY with an aggregate was needed, and adds ORDER BY columns that are not in a DISTINCT select list (fails in PostgreSQL). <b>What you must still own:</b> understanding the grain of each table ("one row per order") and therefore when duplicates are legitimate, impossible, or a symptom.</p>`,
    problems: [{
      title: 'Customers Who Ordered in August 2024', level: 'Easy', tags: ['distinct', 'between', 'dates'], companies: ['Swiggy', 'Zomato', 'DoorDash'],
      statement: `<p>Finance wants the list of <b>customer ids</b> who placed at least one order in <b>August 2024</b>, each id <b>once</b>, in ascending order. Table: <code>orders(id, customer_id, order_date, status, amount, coupon)</code> — one row per order, dates stored as <code>'YYYY-MM-DD'</code> text.</p>`,
      constraints: `<p>14 orders; some customers ordered several times. Cancelled orders still count as "placed".</p>`,
      example: `${H.table(['customer_id'], [['1'], ['2'], ['3'], ['4'], ['5'], ['6'], ['8'], ['10']])}<p>Customer 1 placed three August orders (101, 103, 111) but appears once. Customers 9, 12 and the September order of customer 2 are outside August.</p>`,
      brute: { why: `<p>Without DISTINCT you get one row <b>per order</b>: customer 1 three times and customer 2 twice — 11 rows instead of 8. The table's grain is "order", but the question's grain is "customer".</p>`, code: { lang: 'sql', db: 'shop', code: `SELECT customer_id
FROM orders
WHERE order_date BETWEEN '2024-08-01' AND '2024-08-31'
ORDER BY customer_id;     -- duplicates: 1,1,1,2,2,...` } },
      mcq: { q: 'In which logical step are the duplicate customer ids removed?', options: ['After SELECT, before ORDER BY', 'Before WHERE', 'After LIMIT', 'During FROM'], answer: 0, explain: 'DISTINCT needs the final select-list values, so it runs after SELECT and before ORDER BY/LIMIT.' },
      hints: [
        `<p>Hint 1: the table has one row per <i>order</i>; the answer needs one row per <i>customer</i>.</p>`,
        `<p>Hint 2: filter August with a date range on the ISO text column, then put DISTINCT right after SELECT.</p>`,
        `<p>Hint 3: prefer the half-open range <code>order_date &gt;= '2024-08-01' AND order_date &lt; '2024-09-01'</code>; sort with ORDER BY customer_id.</p>`
      ],
      tests: { engine: 'sqlite', cases: [
        { cols: ['customer_id'], rows: [[1], [2], [3], [4], [5], [6], [8], [10]] },
        { setup: 'INSERT INTO orders (id, customer_id, order_date, status, amount) VALUES (115, 11, \'2024-08-31\', \'delivered\', 100);INSERT INTO orders (id, customer_id, order_date, status, amount) VALUES (116, 7, \'2024-09-01\', \'delivered\', 100);INSERT INTO orders (id, customer_id, order_date, status, amount) VALUES (117, 12, \'2024-07-31\', \'delivered\', 100);INSERT INTO orders (id, customer_id, order_date, status, amount) VALUES (118, 7, \'2024-08-01\', \'delivered\', 100);', cols: ['customer_id'], rows: [[1], [2], [3], [4], [5], [6], [7], [8], [10], [11]] },
        { setup: 'INSERT INTO orders (id, customer_id, order_date, status, amount) VALUES (115, 7, \'2023-08-15\', \'delivered\', 100);INSERT INTO orders (id, customer_id, order_date, status, amount) VALUES (116, 11, \'2025-08-02\', \'delivered\', 100);', cols: ['customer_id'], rows: [[1], [2], [3], [4], [5], [6], [8], [10]] },
        { setup: 'DELETE FROM orders;', rows: [] },
        { setup: 'UPDATE orders SET order_date = \'2024-09-15\';', rows: [] },
        { setup: 'UPDATE orders SET order_date = \'2024-08-10\' WHERE id IN (112, 113, 114);', cols: ['customer_id'], rows: [[1], [2], [3], [4], [5], [6], [8], [9], [10], [12]] }
      ] },
      solution: {
        approach: `<p>Filter rows to August (WHERE), project customer_id (SELECT), collapse duplicates (DISTINCT), then sort. The half-open range is correct whether the column holds dates or full timestamps.</p>`,
        code: { lang: 'sql', db: 'shop', code: `SELECT DISTINCT customer_id
FROM orders
WHERE order_date >= '2024-08-01'
  AND order_date <  '2024-09-01'
ORDER BY customer_id;` },
        alt: [{ lang: 'sql', db: 'shop', title: 'Same result with GROUP BY', code: `SELECT customer_id
FROM orders
WHERE order_date >= '2024-08-01' AND order_date < '2024-09-01'
GROUP BY customer_id
ORDER BY customer_id;` }],
        complexity: `<p>O(N) scan + O(K log K) to sort the K distinct ids (or hash-dedupe). An index on <code>(order_date, customer_id)</code> makes the range read cheap and covering.</p>`,
        followUps: ['Return the customer names instead of ids (needs a JOIN — SQL 4).', 'Count the unique customers in one number.', 'Which customers ordered in August but not in September?']
      }
    }]
  });

  // Written order vs logical order, stepping through a full query template
  function orderFrames() {
    var code = "SELECT DISTINCT dept, COUNT(*) AS n\nFROM employees\nWHERE salary > 50000\nGROUP BY dept\nHAVING COUNT(*) >= 2\nORDER BY n DESC\nLIMIT 3;";
    var steps = [
      { line: 2, name: 'FROM', sees: 'all rows and columns of the table(s); JOINs happen here', alias: 'no', why: 'You cannot filter or pick columns before you know where the rows come from.' },
      { line: 3, name: 'WHERE', sees: 'one raw row at a time, every column', alias: 'no (aliases do not exist yet)', why: 'Filters individual rows early so less data flows to later steps. No aggregates allowed — groups do not exist yet.' },
      { line: 4, name: 'GROUP BY', sees: 'surviving rows; buckets them by dept', alias: 'no (standard) — MySQL/SQLite lenient', why: 'Collapses many rows into one row per group (next module).' },
      { line: 5, name: 'HAVING', sees: 'one group at a time; aggregates allowed', alias: 'no (standard)', why: 'Filters whole groups, e.g. keep departments with at least 2 people.' },
      { line: 1, name: 'SELECT', sees: 'each row/group; computes expressions and creates aliases (and window functions)', alias: 'aliases are BORN here', why: 'Now the output columns exist, with their names.' },
      { line: 1, name: 'DISTINCT', sees: 'complete output rows', alias: 'n/a', why: 'Needs final column values to compare rows, so it must come after SELECT.' },
      { line: 6, name: 'ORDER BY', sees: 'output rows (aliases!) plus source columns', alias: 'YES', why: 'Sorting happens after SELECT, so it can use aliases like n.' },
      { line: 7, name: 'LIMIT / OFFSET', sees: 'the sorted list', alias: 'n/a', why: 'Cuts the final list. Must be last, otherwise "top 3" would be 3 random rows.' }
    ];
    var F = [], done = [];
    F.push({ narr: 'You <b>write</b> a query starting with SELECT, but SELECT is evaluated almost <b>last</b>. Here is a full query (GROUP BY/HAVING come in the next module — included so you see the whole picture). Watch the highlighted line jump around in <b>logical</b> order.', parts: [{ type: 'code', label: 'Written order', lang: 'sql', code: code }, { type: 'array', label: 'written position of each step (logical order →)', values: ['FROM:2', 'WHERE:3', 'GROUP:4', 'HAVING:5', 'SELECT:1', 'DISTINCT:1', 'ORDER:6', 'LIMIT:7'] }] });
    steps.forEach(function (s, i) {
      var hl = {}; hl[s.line] = 'cur';
      done.forEach(function (d) { if (!hl[d]) hl[d] = 'done'; });
      done.push(s.line);
      var rows = steps.slice(0, i + 1).map(function (x, k) { return [String(k + 1), x.name, x.sees, x.alias]; }), th = {};
      th[i] = 'cur';
      F.push({ narr: '<b>Step ' + (i + 1) + ': ' + s.name + '</b> (written on line ' + s.line + '). ' + s.why, parts: [{ type: 'code', label: 'Written order (current logical step highlighted)', lang: 'sql', code: code, hl: hl }, { type: 'table', label: 'Logical steps so far', columns: ['#', 'clause', 'what it can see', 'can use SELECT aliases?'], rows: rows, hl: th }] });
    });
    F.push({ narr: '<b>Memory trick:</b> "<b>F</b>rogs <b>W</b>ear <b>G</b>reen <b>H</b>ats, <b>S</b>o <b>D</b>ucks <b>O</b>bviously <b>L</b>augh" → FROM, WHERE, GROUP BY, HAVING, SELECT, DISTINCT, ORDER BY, LIMIT. This is the <i>logical</i> order that defines the meaning; the optimizer may execute things differently (use an index, push filters down, stop early for LIMIT) as long as the answer is identical.', parts: [{ type: 'array', label: 'logical order', values: ['FROM', 'WHERE', 'GROUP BY', 'HAVING', 'SELECT', 'DISTINCT', 'ORDER BY', 'LIMIT'], hl: { 0: 'ok', 1: 'ok', 2: 'ok', 3: 'ok', 4: 'sel', 5: 'ok', 6: 'ok', 7: 'ok' } }] });
    return F;
  }

  /* =====================================================================
     TOPIC 8 — Logical query processing order
     ===================================================================== */
  topics.push({
    title: 'Logical Query Processing Order: How SQL Really Reads Your Query',
    analogy: `<p>A restaurant order slip says "<i>Serve 3 plates, sorted by size, of grilled fish, using only today's catch.</i>" You <b>wrote</b> "serve" first, but the kitchen <b>works</b> in a different order: fetch the fish from the fridge (FROM), throw out anything not from today (WHERE), grill and plate it (SELECT), remove identical plates (DISTINCT), line them up by size (ORDER BY), and send out the first 3 (LIMIT). SQL is the same: the <b>written</b> order is for humans, the <b>logical</b> order is how the meaning is defined.</p>`,
    explain: `<p>Every SELECT query is <i>defined</i> as if it ran these steps in this order, each step feeding a table into the next:</p>
${H.table(['#', 'Clause', 'What happens', 'Written position'], [['1', '<b>FROM</b> (+ JOIN)', 'get the source rows', '2nd'], ['2', '<b>WHERE</b>', 'keep rows where the condition is TRUE', '3rd'], ['3', 'GROUP BY', 'form groups (SQL 3)', '4th'], ['4', 'HAVING', 'keep groups (SQL 3)', '5th'], ['5', '<b>SELECT</b>', 'compute output columns, create aliases', H.c('y', '1st!')], ['6', '<b>DISTINCT</b>', 'remove duplicate output rows', '1st (inside SELECT)'], ['7', '<b>ORDER BY</b>', 'sort', '6th'], ['8', '<b>LIMIT / OFFSET</b>', 'cut the sorted list', 'last']])}
<p>Knowing this order explains almost every "why does SQL do that?" question:</p>
<ul>
<li><b>Why can't I use my alias in WHERE?</b> WHERE (step 2) runs before SELECT (step 5) creates the alias. Repeat the expression, or wrap the query in a subquery/CTE. (SQLite quietly allows it — PostgreSQL, SQL Server, Oracle and MySQL reject it, so don't rely on it.)</li>
<li><b>Why CAN I use my alias in ORDER BY?</b> ORDER BY (step 7) runs after SELECT.</li>
<li><b>Why can WHERE filter on a column I did not select?</b> WHERE sees the full source row; SELECT only trims columns later.</li>
<li><b>Why does "second highest" need DISTINCT before LIMIT?</b> DISTINCT (6) runs before ORDER BY (7) and LIMIT (8), so duplicates are already gone when positions are counted.</li>
<li><b>Why is LIMIT without ORDER BY random-ish?</b> LIMIT just cuts whatever order step 7 produced — with no ORDER BY, there is no defined order.</li>
<li><b>Why can't I write <code>WHERE COUNT(*) &gt; 2</code>?</b> Groups do not exist at step 2 — that is what HAVING (step 4) is for.</li>
</ul>
<p><b>Logical ≠ physical.</b> The optimizer may run things in a different physical order — read an index that is already sorted (no sort step), push a filter into a join, stop scanning as soon as LIMIT is satisfied — but only if the result is <i>identical</i> to the logical order. The logical order is the contract; the plan is the implementation.</p>`,
    clues: [
      '"Error: column total does not exist" when filtering on an alias → WHERE runs before SELECT; repeat the expression or use a subquery/CTE',
      '"Why does my LIMIT return different rows each time?" → no ORDER BY; LIMIT is last and just cuts',
      '"Filter on the count / sum" → aggregates belong in HAVING (after GROUP BY), not WHERE',
      '"Rank rows and keep the top 2" → window functions are computed at SELECT, so filtering them needs an outer query',
      '"Explain how the database executes this query" in an interview → recite the logical order, then distinguish it from the physical plan (EXPLAIN)',
      '"Take the 5 newest orders, then show them oldest first" → two ORDER BYs need a subquery (LIMIT happens after the only ORDER BY)'
    ],
    code: [{ lang: 'sql', db: 'hr', title: 'Every clause of this module in one query (runnable)', code: `-- Written order:  SELECT … FROM … WHERE … ORDER BY … LIMIT
-- Logical order:  FROM → WHERE → SELECT → DISTINCT → ORDER BY → LIMIT
SELECT DISTINCT dept,
       salary / 1000 AS salary_k          -- 5) alias born here (integer division → thousands)
FROM employees                            -- 1) source rows
WHERE hire_date >= '2018-01-01'           -- 2) row filter (sees every column)
ORDER BY salary_k DESC                    -- 7) alias allowed here
LIMIT 4;                                  -- 8) cut last` }],
    codeTitle: ['Runnable reference query'],
    viz: [
      queryViz('The whole pipeline: FROM → WHERE → SELECT → DISTINCT → ORDER BY → LIMIT', "SELECT DISTINCT dept, salary / 1000 AS salary_k FROM employees WHERE hire_date >= '2018-01-01' ORDER BY salary_k DESC LIMIT 4", { stepWhere: true }),
      { title: 'Written order vs logical order (full 8-step version)', gen: function () { return orderFrames(); } }
    ],
    examples: [
      {
        title: 'Alias in WHERE: works in SQLite, fails almost everywhere else',
        html: `<p>SQLite resolves <code>total_comp</code> in WHERE to the SELECT alias as a convenience. PostgreSQL says <code>column "total_comp" does not exist</code>; SQL Server says <code>Invalid column name</code>. Portable fixes: repeat the expression, or compute it in a subquery/CTE and filter outside.</p>`,
        code: { lang: 'sql', db: 'hr', code: `-- Non-portable (SQLite-only convenience)
SELECT name, salary + COALESCE(bonus, 0) AS total_comp
FROM employees WHERE total_comp > 150000;

-- Portable 1: repeat the expression
SELECT name, salary + COALESCE(bonus, 0) AS total_comp
FROM employees WHERE salary + COALESCE(bonus, 0) > 150000;

-- Portable 2: derived table (subquery in FROM)
SELECT name, total_comp
FROM (SELECT name, salary + COALESCE(bonus, 0) AS total_comp FROM employees) AS t
WHERE total_comp > 150000;` }
      },
      {
        title: 'WHERE can see columns that SELECT throws away',
        html: `<p>The output only shows names, yet the filter uses <code>hire_date</code> and the sort uses <code>salary</code>. WHERE and ORDER BY can reach source columns; SELECT just decides what you see.</p>`,
        code: { lang: 'sql', db: 'hr', code: `SELECT name
FROM employees
WHERE hire_date < '2018-01-01'
ORDER BY salary DESC;` }
      },
      {
        title: 'Two different orderings need two query levels',
        html: `<p>"Take the 5 most recent orders, then display them oldest-first." One query has one ORDER BY and LIMIT always happens after it, so you sort-and-cut in an inner query, then re-sort outside.</p>`,
        code: { lang: 'sql', db: 'shop', code: `SELECT id, order_date
FROM (SELECT id, order_date
      FROM orders
      ORDER BY order_date DESC, id DESC
      LIMIT 5) AS latest
ORDER BY order_date, id;` }
      },
      {
        title: 'Aggregates are not allowed in WHERE',
        html: `<p><code>WHERE COUNT(*) &gt; 1</code> is an error ("misuse of aggregate") because at step 2 there are only single rows. HAVING runs after GROUP BY and can filter on counts — the whole story is next module, but the reason is the processing order.</p>`,
        code: { lang: 'sql', db: 'hr', code: `-- WHERE COUNT(*) > 1  → error: misuse of aggregate
SELECT dept, COUNT(*) AS headcount
FROM employees
WHERE dept IS NOT NULL            -- row filter (step 2)
GROUP BY dept                     -- step 3
HAVING COUNT(*) > 1               -- group filter (step 4)
ORDER BY headcount DESC;          -- alias OK (step 7)` }
      }
    ],
    deepDive: `<p><b>The formal model.</b> The SQL standard defines a query's result by the <i>logical</i> evaluation: FROM builds a (possibly joined) virtual table; WHERE restricts it; GROUP BY partitions it; HAVING restricts groups; SELECT projects (window functions are evaluated here, after HAVING, which is why <code>WHERE ROW_NUMBER() OVER (…) = 1</code> is illegal); DISTINCT removes duplicates; set operators (UNION/INTERSECT/EXCEPT) combine query blocks; ORDER BY sorts the final result; OFFSET/FETCH cuts it. Itzik Ben-Gan's well-known diagram and most textbooks use exactly this sequence.</p>
<p><b>What the optimizer actually does.</b> The planner rewrites the logical tree into a cheaper equivalent physical plan: <i>predicate pushdown</i> (evaluate WHERE inside the scan or below a join), <i>projection pushdown</i> (read only needed columns — huge in column stores), <i>index-provided order</i> (skip the sort), <i>top-N</i> (combine ORDER BY + LIMIT into a heap), <i>early termination</i> (stop reading once LIMIT is satisfied), and <i>constant folding</i>. You see the physical plan with <code>EXPLAIN QUERY PLAN</code> (SQLite), <code>EXPLAIN ANALYZE</code> (PostgreSQL/MySQL 8). Any transformation must preserve the logical result, including NULL semantics — which is why some rewrites (e.g. NOT IN → anti-join) are only allowed when columns are NOT NULL.</p>
<p><b>Dialect leniency.</b> SQLite resolves unknown identifiers in WHERE/GROUP BY/HAVING against result-column aliases; MySQL allows aliases in GROUP BY/HAVING (not WHERE); PostgreSQL allows output-column names and positions in GROUP BY and ORDER BY but not WHERE or HAVING. Writing to the strict standard keeps queries portable — important when SQLite prototypes move to PostgreSQL in production.</p>
<p><b>Short-circuit is not promised.</b> Because the optimizer reorders, the logical order says nothing about which <i>part</i> of a WHERE condition is evaluated first, nor that SELECT expressions are evaluated only for rows that pass WHERE in every situation (some engines evaluate expressions speculatively). Guard risky expressions (division, casts) with CASE/NULLIF rather than relying on WHERE order.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI writes SQL fluently, but when its query fails or returns odd rows, the root cause is very often a processing-order misunderstanding — an alias used in WHERE, an aggregate in WHERE, a window function filtered in the same level, or LIMIT expected to apply before a sort. The logical order is your <b>debugging map</b>. <b>Use AI as a partner:</b> ask <code>Annotate each clause of this query with its logical step number and what it can see</code>, <code>Rewrite this to be portable to PostgreSQL (no aliases in WHERE)</code>, or <code>Explain how the EXPLAIN plan differs from the logical order</code>. <b>Where AI goes wrong:</b> it learns from SQLite/MySQL-flavoured snippets online and happily emits alias-in-WHERE or alias-in-HAVING that breaks on PostgreSQL, and it sometimes claims WHERE "runs after SELECT". <b>What you must still own:</b> reciting and applying the order under interview pressure, distinguishing logical meaning from the physical plan, and choosing subqueries/CTEs to get a second "pass".</p>`,
    problems: [{
      title: 'Total Compensation Above 150k', level: 'Medium', tags: ['logical order', 'alias', 'null', 'coalesce'], companies: ['Goldman Sachs', 'Microsoft', 'Stripe'],
      statement: `<p>Total compensation = salary + bonus, where a missing bonus counts as <b>0</b>. Return <code>name</code> and <code>total_comp</code> for employees whose total compensation is <b>greater than 150,000</b>, highest first. The query must also run on PostgreSQL (so no alias in WHERE).</p>`,
      constraints: `<p><code>bonus</code> is nullable (4 employees have NULL). Must be portable standard SQL.</p>`,
      example: `${H.table(['name', 'total_comp'], [['Priya Sharma', '300000'], ['Sara Johnson', '290000'], [H.c('g', 'Arjun Mehta'), H.c('g', '160000')]])}<p>Arjun's bonus is NULL → counts as 0 → 160000 &gt; 150000, so he qualifies. A naive <code>salary + bonus</code> makes his total NULL and he disappears.</p>`,
      brute: { why: `<p>Two bugs. (1) <code>salary + bonus</code> is NULL whenever bonus is NULL, so Arjun's total is NULL and <code>NULL &gt; 150000</code> is UNKNOWN → dropped. (2) <code>WHERE total_comp …</code> uses a SELECT alias in WHERE: SQLite tolerates it, but PostgreSQL and SQL Server reject it because WHERE runs before SELECT.</p>`, code: { lang: 'sql', db: 'hr', code: `SELECT name, salary + bonus AS total_comp
FROM employees
WHERE total_comp > 150000          -- alias in WHERE: SQLite-only
ORDER BY total_comp DESC;          -- and Arjun (NULL bonus) is lost` } },
      mcq: { q: 'Why is <code>WHERE total_comp &gt; 150000</code> rejected by PostgreSQL?', options: ['WHERE is evaluated before SELECT creates the alias', 'Aliases must be quoted', 'total_comp is a reserved word', 'WHERE cannot compare numbers'], answer: 0, explain: 'Logical order: FROM → WHERE → … → SELECT. When WHERE runs, the alias does not exist yet.' },
      hints: [
        `<p>Hint 1: handle the missing bonus first — <code>COALESCE(bonus, 0)</code>.</p>`,
        `<p>Hint 2: since WHERE cannot see aliases, repeat the expression in WHERE (or compute it in a subquery and filter outside).</p>`,
        `<p>Hint 3: ORDER BY <i>can</i> use the alias. Recipe: SELECT name, salary + COALESCE(bonus,0) AS total_comp … WHERE salary + COALESCE(bonus,0) &gt; 150000 ORDER BY total_comp DESC.</p>`
      ],
      tests: { engine: 'both', pg: `CREATE TABLE employees (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  dept TEXT,
  title TEXT,
  salary INTEGER,
  bonus INTEGER,
  manager_id INTEGER,
  hire_date TEXT,
  email TEXT
);
INSERT INTO employees VALUES
  (1, 'Priya Sharma', 'Engineering', 'VP Engineering', 250000, 50000, NULL, '2015-03-01', 'priya@corp.com'),
  (2, 'Arjun Mehta', 'Engineering', 'Senior Engineer', 160000, NULL, 1, '2018-07-15', 'arjun@corp.com'),
  (3, 'Lena Fischer', 'Engineering', 'Engineer', 120000, 8000, 2, '2021-01-10', 'lena@corp.com'),
  (4, 'Marco Rossi', 'Engineering', 'Engineer', 120000, NULL, 2, '2022-05-23', NULL),
  (5, 'Sara Johnson', 'Sales', 'VP Sales', 250000, 40000, NULL, '2016-11-01', 'sara@corp.com'),
  (6, 'Tom Becker', 'Sales', 'Account Exec', 90000, 15000, 5, '2020-02-17', 'tom@corp.com'),
  (7, 'Aisha Bello', 'Sales', 'Account Exec', 95000, 0, 5, '2023-08-01', 'aisha@corp.com'),
  (8, 'Kenji Tanaka', 'Marketing', 'Marketing Lead', 130000, 10000, NULL, '2019-04-08', 'kenji@corp.com'),
  (9, 'Olivia Brown', 'Marketing', 'Designer', 85000, NULL, 8, '2024-01-15', 'olivia@corp.com'),
  (10, 'Rahul Verma', NULL, 'Intern', 30000, NULL, 2, '2024-06-01', NULL),
  (11, 'Zoe Martin', 'HR', 'HR Manager', 110000, 5000, NULL, '2017-09-12', 'zoe@corp.com'),
  (12, 'Nina Kowalski', 'Engineering', 'Engineer', 135000, 12000, 2, '2020-10-05', 'nina@corp.com');`, cases: [
        { cols: ['name', 'total_comp'], rows: [['Priya Sharma', 300000], ['Sara Johnson', 290000], ['Arjun Mehta', 160000]] },
        { setup: 'UPDATE employees SET bonus = 15001 WHERE id = 12;', cols: ['name', 'total_comp'], rows: [['Priya Sharma', 300000], ['Sara Johnson', 290000], ['Arjun Mehta', 160000], ['Nina Kowalski', 150001]] },
        { setup: 'UPDATE employees SET bonus = 15000 WHERE id = 12;', cols: ['name', 'total_comp'], rows: [['Priya Sharma', 300000], ['Sara Johnson', 290000], ['Arjun Mehta', 160000]] },
        { setup: 'UPDATE employees SET bonus = NULL WHERE id <> 1;', cols: ['name', 'total_comp'], rows: [['Priya Sharma', 300000], ['Sara Johnson', 250000], ['Arjun Mehta', 160000]] },
        { setup: 'UPDATE employees SET bonus = -200000 WHERE id = 1;', cols: ['name', 'total_comp'], rows: [['Sara Johnson', 290000], ['Arjun Mehta', 160000]] },
        { setup: 'DELETE FROM employees;', rows: [] },
        { setup: 'INSERT INTO employees (id, name, dept, title, salary, bonus, manager_id) VALUES (13, \'Big\', \'HR\', \'X\', 1000000000, 1000000000, NULL);INSERT INTO employees (id, name, dept, title, salary, bonus, manager_id) VALUES (14, \'Edge\', \'HR\', \'X\', 150000, 1, NULL);', cols: ['name', 'total_comp'], rows: [['Big', 2000000000], ['Priya Sharma', 300000], ['Sara Johnson', 290000], ['Arjun Mehta', 160000], ['Edge', 150001]] }
      ] },
      solution: {
        approach: `<p>Use COALESCE to turn unknown bonuses into 0, repeat the expression in WHERE (step 2 cannot see the alias), and sort by the alias in ORDER BY (step 7 can). The derived-table version computes once and filters outside — identical plan in most engines.</p>`,
        code: { lang: 'sql', db: 'hr', code: `SELECT name,
       salary + COALESCE(bonus, 0) AS total_comp
FROM employees
WHERE salary + COALESCE(bonus, 0) > 150000
ORDER BY total_comp DESC;` },
        alt: [{ lang: 'sql', db: 'hr', title: 'Compute once in a derived table', code: `SELECT name, total_comp
FROM (
    SELECT name, salary + COALESCE(bonus, 0) AS total_comp
    FROM employees
) AS t
WHERE total_comp > 150000
ORDER BY total_comp DESC;` }],
        complexity: `<p>O(N) scan + O(K log K) sort of the K qualifying rows. The expression in WHERE is not sargable; for large tables a generated/computed column with an index can help.</p>`,
        followUps: ['Show the top 2 only.', 'Add a column showing what percentage of total comp is bonus (watch integer division).', 'Write it with a CTE (WITH …) — SQL 5.']
      }
    }]
  });

  /* =====================================================================
     PRACTICE — Easy
     ===================================================================== */
  practice.push({
    title: 'Cheap Stationery', level: 'Easy', tags: ['where', 'and', 'case sensitivity'], companies: ['Amazon', 'Walmart'],
    statement: `<p>Return <code>name, price</code> of products in the <b>Stationery</b> category that cost <b>less than 200</b>, cheapest first. Table: <code>products(id, name, category, price, stock, discount_pct)</code>.</p>`,
    constraints: `<p>12 products. Category values are stored with a capital first letter (<code>'Stationery'</code>). Price may be NULL.</p>`,
    example: `${H.table(['name', 'price'], [['Notebook A5', '149'], ['Gel Pen 10-pack', '199']])}<p>Both Stationery items are under 200. "Less than" is strict, so a 200 item would be excluded.</p>`,
    brute: { why: `<p>Typing the category in lower case returns <b>zero rows</b>: in SQLite (and PostgreSQL) <code>=</code> on text is case-sensitive, so <code>'stationery' ≠ 'Stationery'</code>. No error is raised — the result is just silently empty.</p>`, code: { lang: 'sql', db: 'shop', code: `SELECT name, price
FROM products
WHERE category = 'stationery' AND price < 200   -- wrong case → 0 rows
ORDER BY price;` } },
    mcq: { q: 'In SQLite, is <code>\'Stationery\' = \'stationery\'</code> TRUE?', options: ['No — = compares text case-sensitively by default', 'Yes — SQL ignores case', 'Only inside LIKE', 'It returns NULL'], answer: 0, explain: 'The default BINARY collation compares exact characters. LIKE is case-insensitive for ASCII; = is not.' },
    hints: [
      `<p>Hint 1: two conditions must both hold — the category test and the price test — so join them with AND.</p>`,
      `<p>Hint 2: match the stored spelling exactly (<code>'Stationery'</code>), or compare case-insensitively with <code>LOWER(category) = 'stationery'</code>.</p>`,
      `<p>Hint 3: finish with <code>ORDER BY price</code> (ascending is the default). NULL prices fail <code>price &lt; 200</code> automatically.</p>`
    ],
    tests: { engine: 'sqlite', cases: [
      { cols: ['name', 'price'], rows: [['Notebook A5', 149], ['Gel Pen 10-pack', 199]] },
      { setup: 'INSERT INTO products (id, name, category, price) VALUES (13, \'Pen Edge\', \'Stationery\', 200);INSERT INTO products (id, name, category, price) VALUES (14, \'Pencil Free\', \'Stationery\', 0);INSERT INTO products (id, name, category, price) VALUES (15, \'Stapler\', \'Stationery\', 150);', cols: ['name', 'price'], rows: [['Pencil Free', 0], ['Notebook A5', 149], ['Stapler', 150], ['Gel Pen 10-pack', 199]] },
      { setup: 'INSERT INTO products (id, name, category, price) VALUES (13, \'Unpriced\', \'Stationery\', NULL);', cols: ['name', 'price'], rows: [['Notebook A5', 149], ['Gel Pen 10-pack', 199]] },
      { setup: 'INSERT INTO products (id, name, category, price) VALUES (13, \'Cheap Mug\', \'Kitchen\', 100);', cols: ['name', 'price'], rows: [['Notebook A5', 149], ['Gel Pen 10-pack', 199]] },
      { setup: 'UPDATE products SET price = 500 WHERE category = \'Stationery\';', rows: [] },
      { setup: 'DELETE FROM products WHERE category = \'Stationery\';', rows: [] }
    ] },
    solution: {
      approach: `<p>Filter with two AND-ed predicates, using the exact stored category spelling, and sort ascending by price.</p>`,
      code: { lang: 'sql', db: 'shop', code: `SELECT name, price
FROM products
WHERE category = 'Stationery'
  AND price < 200
ORDER BY price;` },
      complexity: `<p>O(N) scan, or an index range seek on <code>(category, price)</code> which also returns rows already sorted by price.</p>`,
      followUps: ['Make the category match case-insensitive without breaking index use (hint: COLLATE NOCASE index).', 'Include items with an unknown price as well.']
    }
  });

  practice.push({
    title: 'Customers Without an Email', level: 'Easy', tags: ['null', 'is null'], companies: ['HubSpot', 'Salesforce'],
    statement: `<p>The CRM team needs every customer whose <b>email is missing</b>. Return <code>id, name</code> ordered by id.</p>`,
    constraints: `<p><code>customers.email</code> is nullable. 12 customers.</p>`,
    example: `${H.table(['id', 'name'], [['3', 'Chen Wei'], ['7', 'Gabriel Silva']])}<p>Only these two rows have NULL in <code>email</code>.</p>`,
    brute: { why: `<p><code>email = NULL</code> compares with an unknown value, which is UNKNOWN for every row, and WHERE drops UNKNOWN — the query always returns <b>0 rows</b>, no matter how many emails are missing.</p>`, code: { lang: 'sql', db: 'shop', code: `SELECT id, name
FROM customers
WHERE email = NULL      -- always UNKNOWN → 0 rows
ORDER BY id;` } },
    mcq: { q: 'What does <code>WHERE email = NULL</code> return?', options: ['Always zero rows', 'Rows with missing email', 'Rows with an email', 'A syntax error'], answer: 0, explain: 'Any = comparison with NULL is UNKNOWN; WHERE keeps only TRUE rows. Use IS NULL.' },
    hints: [
      `<p>Hint 1: NULL is not a value you can compare with =; it is a marker meaning "unknown".</p>`,
      `<p>Hint 2: SQL has a dedicated predicate for this: <code>col IS NULL</code>, which always returns TRUE or FALSE.</p>`,
      `<p>Hint 3: if empty strings <code>''</code> could also mean "missing" in your data, add <code>OR email = ''</code>.</p>`
    ],
    tests: { engine: 'sqlite', cases: [
      { cols: ['id', 'name'], rows: [[3, 'Chen Wei'], [7, 'Gabriel Silva']] },
      { setup: 'UPDATE customers SET email = NULL;', cols: ['id', 'name'], rows: [[1, 'Asha Rao'], [2, 'Ben Carter'], [3, 'Chen Wei'], [4, 'Diya Patel'], [5, 'Ethan Brooks'], [6, 'Fatima Khan'], [7, 'Gabriel Silva'], [8, 'Hana Sato'], [9, 'Ivan Petrov'], [10, 'Jia Li'], [11, 'Kabir Singh'], [12, 'Lucy Evans']] },
      { setup: 'UPDATE customers SET email = \'a@b.com\' WHERE email IS NULL;', rows: [] },
      { setup: 'UPDATE customers SET email = \'\' WHERE id = 1; UPDATE customers SET email = \'NULL\' WHERE id = 2;', cols: ['id', 'name'], rows: [[3, 'Chen Wei'], [7, 'Gabriel Silva']] },
      { setup: 'INSERT INTO customers (id, name) VALUES (0, \'First\'), (20, \'Last\');', cols: ['id', 'name'], rows: [[0, 'First'], [3, 'Chen Wei'], [7, 'Gabriel Silva'], [20, 'Last']] },
      { setup: 'DELETE FROM customers;', rows: [] }
    ] },
    solution: {
      approach: `<p>Use the IS NULL predicate, which is designed for missing values and never yields UNKNOWN.</p>`,
      code: { lang: 'sql', db: 'shop', code: `SELECT id, name
FROM customers
WHERE email IS NULL
ORDER BY id;` },
      complexity: `<p>O(N) scan; B-tree indexes in SQLite/PostgreSQL/MySQL store NULLs, so an index on email can answer IS NULL directly.</p>`,
      followUps: ['Also treat blank or whitespace-only emails as missing.', 'Count customers with and without email; check the two counts add up to 12.']
    }
  });

  practice.push({
    title: 'Three Most Expensive Products', level: 'Easy', tags: ['order by', 'limit', 'null'], companies: ['Flipkart', 'eBay'],
    statement: `<p>Return the <b>3 most expensive</b> products (<code>name, price</code>), most expensive first. Products with an unknown price must not appear.</p>`,
    constraints: `<p>12 products; one (Desk Lamp) has a NULL price. The query should give the same answer on SQLite and PostgreSQL.</p>`,
    example: `${H.table(['name', 'price'], [['Running_Shoes', '4999'], ['Mechanical Keyboard', '3499'], ['French Press', '1899']])}<p>In PostgreSQL, <code>ORDER BY price DESC</code> puts NULL <b>first</b> — Desk Lamp would steal the top spot unless filtered.</p>`,
    brute: { why: `<p><code>LIMIT 3</code> without ORDER BY returns whichever three rows the engine reads first (here the first three by storage order: mouse, keyboard, cable) — "top 3" has no meaning without a sort.</p>`, code: { lang: 'sql', db: 'shop', code: `SELECT name, price
FROM products
LIMIT 3;          -- no ORDER BY → arbitrary 3 rows` } },
    mcq: { q: 'Which clause runs <b>last</b> in the logical order?', options: ['LIMIT', 'ORDER BY', 'WHERE', 'SELECT'], answer: 0, explain: 'LIMIT cuts the final, already sorted list — so it needs ORDER BY to be meaningful.' },
    hints: [
      `<p>Hint 1: "most expensive first" is a descending sort on price.</p>`,
      `<p>Hint 2: NULL placement differs between databases; the safest way to exclude unknown prices is <code>WHERE price IS NOT NULL</code>.</p>`,
      `<p>Hint 3: recipe: filter NULLs → ORDER BY price DESC → LIMIT 3. Consider a tie-breaker (id) if prices can repeat.</p>`
    ],
    tests: { engine: 'both', pg: `CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  city TEXT,
  country TEXT,
  signup_date TEXT,
  referred_by INTEGER
);
INSERT INTO customers VALUES
  (1, 'Asha Rao', 'asha@gmail.com', 'Mumbai', 'India', '2024-01-15', NULL),
  (2, 'Ben Carter', 'ben.carter@yahoo.com', 'London', 'UK', '2024-02-03', 1),
  (3, 'Chen Wei', NULL, 'Shanghai', 'China', '2024-02-20', NULL),
  (4, 'Diya Patel', 'diya@gmail.com', NULL, 'India', '2024-03-11', 1),
  (5, 'Ethan Brooks', 'ethan@outlook.com', 'New York', 'USA', '2024-03-29', 2),
  (6, 'Fatima Khan', 'fatima_k@gmail.com', 'Dubai', 'UAE', '2024-04-14', NULL),
  (7, 'Gabriel Silva', NULL, 'Sao Paulo', 'Brazil', '2024-05-02', 5),
  (8, 'Hana Sato', 'hana@sato.jp', 'Tokyo', 'Japan', '2024-05-30', NULL),
  (9, 'Ivan Petrov', 'ivan.p@mail.ru', NULL, NULL, '2024-06-18', 3),
  (10, 'Jia Li', 'jia_li@GMAIL.com', 'Mumbai', 'India', '2024-07-07', 4),
  (11, 'Kabir Singh', 'gmailfan@yahoo.in', 'Delhi', 'India', '2024-08-01', NULL),
  (12, 'Lucy Evans', 'lucy@outlook.com', 'London', 'UK', '2024-08-19', 2);
CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  price INTEGER,
  stock INTEGER,
  discount_pct INTEGER
);
INSERT INTO products VALUES
  (1, 'Wireless Mouse', 'Electronics', 799, 120, 10),
  (2, 'Mechanical Keyboard', 'Electronics', 3499, 40, NULL),
  (3, 'USB-C Cable', 'Electronics', 299, 500, 0),
  (4, 'Yoga Mat', 'Fitness', 1199, 60, 15),
  (5, 'Dumbbell 5kg', 'Fitness', 1499, 0, NULL),
  (6, 'Coffee Mug', 'Kitchen', 349, 200, 5),
  (7, 'French Press', 'Kitchen', 1899, 25, NULL),
  (8, 'Notebook A5', 'Stationery', 149, 1000, NULL),
  (9, 'Gel Pen 10-pack', 'Stationery', 199, NULL, 20),
  (10, '100% Cotton Tee', 'Apparel', 599, 80, 50),
  (11, 'Running_Shoes', 'Apparel', 4999, 15, NULL),
  (12, 'Desk Lamp', 'Electronics', NULL, 30, NULL);
CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER,
  order_date TEXT,
  status TEXT,
  amount INTEGER,
  coupon TEXT
);
INSERT INTO orders VALUES
  (101, 1, '2024-08-01', 'delivered', 1598, NULL),
  (102, 2, '2024-08-02', 'shipped', 3499, 'WELCOME10'),
  (103, 1, '2024-08-05', 'cancelled', 299, NULL),
  (104, 3, '2024-08-07', 'delivered', 1199, 'FIT15'),
  (105, 5, '2024-08-10', 'pending', 4999, NULL),
  (106, 4, '2024-08-11', 'delivered', 349, NULL),
  (107, 6, '2024-08-15', 'returned', 1899, 'KITCHEN5'),
  (108, 2, '2024-08-18', 'delivered', 149, NULL),
  (109, 8, '2024-08-20', 'shipped', 2398, NULL),
  (110, 10, '2024-08-25', 'pending', NULL, NULL),
  (111, 1, '2024-08-28', 'delivered', 599, 'WELCOME10'),
  (112, 9, '2024-09-01', 'cancelled', 799, NULL),
  (113, 12, '2024-09-03', NULL, 1499, 'WELCOME10'),
  (114, 2, '2024-09-05', 'delivered', 1899, NULL);`, cases: [
      { cols: ['name', 'price'], rows: [['Running_Shoes', 4999], ['Mechanical Keyboard', 3499], ['French Press', 1899]] },
      { setup: 'UPDATE products SET price = 10000 WHERE id = 12;', cols: ['name', 'price'], rows: [['Desk Lamp', 10000], ['Running_Shoes', 4999], ['Mechanical Keyboard', 3499]] },
      { setup: 'UPDATE products SET price = NULL;', rows: [] },
      { setup: 'UPDATE products SET price = NULL WHERE id > 2;', cols: ['name', 'price'], rows: [['Mechanical Keyboard', 3499], ['Wireless Mouse', 799]] },
      { setup: 'DELETE FROM products;', rows: [] },
      { setup: 'UPDATE products SET price = price * 2 WHERE id IN (1, 3, 4);', cols: ['name', 'price'], rows: [['Running_Shoes', 4999], ['Mechanical Keyboard', 3499], ['Yoga Mat', 2398]] },
      { setup: 'UPDATE products SET price = 7000 WHERE id = 3; UPDATE products SET price = 6000 WHERE id = 8; UPDATE products SET price = 5000 WHERE id = 9;', cols: ['name', 'price'], rows: [['USB-C Cable', 7000], ['Notebook A5', 6000], ['Gel Pen 10-pack', 5000]] }
    ] },
    solution: {
      approach: `<p>Remove unknown prices in WHERE, sort descending, keep three rows. A tie-breaker on id makes the result deterministic if two products share a price.</p>`,
      code: { lang: 'sql', db: 'shop', code: `SELECT name, price
FROM products
WHERE price IS NOT NULL
ORDER BY price DESC, id
LIMIT 3;` },
      complexity: `<p>Top-k heap: O(N log 3) ≈ O(N). With an index on price: read 3 index entries from the high end, O(log N).</p>`,
      followUps: ['Return every product tied for 3rd place too.', 'Return the 3 cheapest in-stock products.']
    }
  });

  practice.push({
    title: 'Unique Customer Cities, Alphabetical', level: 'Easy', tags: ['distinct', 'is not null', 'order by'], companies: ['Uber', 'Airbnb'],
    statement: `<p>Return the list of <b>distinct cities</b> our customers live in, alphabetically, <b>without</b> the unknown (NULL) city. One column: <code>city</code>.</p>`,
    constraints: `<p>12 customers; two have NULL city; London and Mumbai appear twice.</p>`,
    example: `${H.table(['city'], [['Delhi'], ['Dubai'], ['London'], ['Mumbai'], ['New York'], ['Sao Paulo'], ['Shanghai'], ['Tokyo']])}<p>8 cities. London and Mumbai appear once each; NULL is removed.</p>`,
    brute: { why: `<p>Without DISTINCT, London and Mumbai each appear twice; without the NULL filter, a NULL row appears first (SQLite sorts NULL smallest). 12 rows instead of 8.</p>`, code: { lang: 'sql', db: 'shop', code: `SELECT city
FROM customers
ORDER BY city;      -- duplicates and NULLs` } },
    mcq: { q: 'Two customers have NULL city. How many NULL rows does <code>SELECT DISTINCT city</code> return?', options: ['One', 'Two', 'Zero', 'It depends on ORDER BY'], answer: 0, explain: 'DISTINCT treats NULLs as not distinct from each other, so they collapse into a single NULL row.' },
    hints: [
      `<p>Hint 1: "unique" → DISTINCT right after SELECT.</p>`,
      `<p>Hint 2: WHERE runs before DISTINCT, so <code>WHERE city IS NOT NULL</code> removes the unknowns early.</p>`,
      `<p>Hint 3: alphabetical = <code>ORDER BY city</code>. Use COLLATE NOCASE if casing in the data is inconsistent.</p>`
    ],
    tests: { engine: 'sqlite', cases: [
      { cols: ['city'], rows: [['Delhi'], ['Dubai'], ['London'], ['Mumbai'], ['New York'], ['Sao Paulo'], ['Shanghai'], ['Tokyo']] },
      { setup: 'UPDATE customers SET city = NULL;', rows: [] },
      { setup: 'UPDATE customers SET city = \'X\';', cols: ['city'], rows: [['X']] },
      { setup: 'INSERT INTO customers (id, name, city) VALUES (13, \'A\', \'london\');INSERT INTO customers (id, name, city) VALUES (14, \'B\', \'London \');INSERT INTO customers (id, name, city) VALUES (15, \'C\', \'Zurich\');INSERT INTO customers (id, name, city) VALUES (16, \'D\', \'Zurich\');', cols: ['city'], rows: [['Delhi'], ['Dubai'], ['London'], ['London '], ['Mumbai'], ['New York'], ['Sao Paulo'], ['Shanghai'], ['Tokyo'], ['Zurich'], ['london']] },
      { setup: 'DELETE FROM customers;', rows: [] },
      { setup: 'UPDATE customers SET city = \'Pune\' WHERE city IS NOT NULL; UPDATE customers SET city = \'Agra\' WHERE id = 1;', cols: ['city'], rows: [['Agra'], ['Pune']] }
    ] },
    solution: {
      approach: `<p>Filter out NULL cities, de-duplicate with DISTINCT, sort ascending.</p>`,
      code: { lang: 'sql', db: 'shop', code: `SELECT DISTINCT city
FROM customers
WHERE city IS NOT NULL
ORDER BY city;` },
      complexity: `<p>O(N) hashing or O(N log N) sorting for the de-duplication; an index on city lets the engine stream distinct values in order.</p>`,
      followUps: ['Show each distinct (country, city) pair.', 'How many distinct cities are there? (COUNT(DISTINCT city))']
    }
  });

  practice.push({
    title: 'Movies From the 1990s', level: 'Easy', tags: ['between', 'inclusive range'], companies: ['Netflix', 'IMDb'],
    statement: `<p>Return <code>title, year</code> of all movies released in the <b>1990s</b> (1990 through 1999 inclusive), ordered by year then title.</p>`,
    constraints: `<p>14 movies; one has a NULL year.</p>`,
    example: `${H.table(['title', 'year'], [['Groundhog Day', '1993'], ['Jurassic Park', '1993'], ['Se7en', '1995'], ['Toy Story', '1995'], [H.c('g', 'The Matrix'), H.c('g', '1999')]])}<p>The Matrix (1999) is part of the 1990s — an exclusive upper bound would wrongly drop it.</p>`,
    brute: { why: `<p>Using strict comparisons <code>year &gt; 1990 AND year &lt; 1999</code> excludes both boundary years, so ${H.c('r', 'The Matrix (1999)')} disappears. "Through" means inclusive.</p>`, code: { lang: 'sql', db: 'movies', code: `SELECT title, year
FROM movies
WHERE year > 1990 AND year < 1999     -- drops 1990 and 1999
ORDER BY year, title;` } },
    mcq: { q: '<code>year BETWEEN 1990 AND 1999</code> is equivalent to…', options: ['<code>year &gt;= 1990 AND year &lt;= 1999</code>', '<code>year &gt; 1990 AND year &lt; 1999</code>', '<code>year &gt;= 1990 AND year &lt; 1999</code>', '<code>year IN (1990, 1999)</code>'], answer: 0, explain: 'BETWEEN includes both ends.' },
    hints: [
      `<p>Hint 1: decide whether the boundaries belong: 1990 and 1999 are both "in the 90s".</p>`,
      `<p>Hint 2: BETWEEN low AND high is inclusive on both ends; the smaller number must come first.</p>`,
      `<p>Hint 3: sort with two keys: <code>ORDER BY year, title</code> to break ties between same-year films.</p>`
    ],
    tests: { engine: 'sqlite', cases: [
      { cols: ['title', 'year'], rows: [['Groundhog Day', 1993], ['Jurassic Park', 1993], ['Se7en', 1995], ['Toy Story', 1995], ['The Matrix', 1999]] },
      { setup: 'INSERT INTO movies (id, title, year) VALUES (15, \'Y1989\', 1989);INSERT INTO movies (id, title, year) VALUES (16, \'Y1990\', 1990);INSERT INTO movies (id, title, year) VALUES (17, \'Y1999\', 1999);INSERT INTO movies (id, title, year) VALUES (18, \'Y2000\', 2000);', cols: ['title', 'year'], rows: [['Y1990', 1990], ['Groundhog Day', 1993], ['Jurassic Park', 1993], ['Se7en', 1995], ['Toy Story', 1995], ['The Matrix', 1999], ['Y1999', 1999]] },
      { setup: 'INSERT INTO movies (id, title, year) VALUES (15, \'Beta\', 1993);INSERT INTO movies (id, title, year) VALUES (16, \'Alpha\', 1993);', cols: ['title', 'year'], rows: [['Alpha', 1993], ['Beta', 1993], ['Groundhog Day', 1993], ['Jurassic Park', 1993], ['Se7en', 1995], ['Toy Story', 1995], ['The Matrix', 1999]] },
      { setup: 'UPDATE movies SET year = NULL;', rows: [] },
      { setup: 'UPDATE movies SET year = 2005;', rows: [] },
      { setup: 'DELETE FROM movies;', rows: [] }
    ] },
    solution: {
      approach: `<p>An inclusive range check with BETWEEN; the NULL-year movie fails the test (UNKNOWN) and is excluded automatically. Two sort keys give a deterministic order.</p>`,
      code: { lang: 'sql', db: 'movies', code: `SELECT title, year
FROM movies
WHERE year BETWEEN 1990 AND 1999
ORDER BY year, title;` },
      complexity: `<p>O(N) scan or one index range scan on year.</p>`,
      followUps: ['Movies NOT from the 1990s — what happens to the NULL-year film?', 'Write it as a half-open range.']
    }
  });

  /* =====================================================================
     PRACTICE — Medium
     ===================================================================== */
  practice.push({
    title: 'Employees Whose Name Starts With a Vowel', level: 'Medium', tags: ['like', 'in', 'string functions'], companies: ['Oracle', 'HackerRank'],
    statement: `<p>Return <code>name</code> of employees whose name <b>starts with a vowel</b> (a, e, i, o, u — any case), alphabetically.</p>`,
    constraints: `<p>12 employees. Must work in SQLite. (HackerRank's "Weather Observation Station" family uses the same idea.)</p>`,
    example: `${H.table(['name'], [['Aisha Bello'], ['Arjun Mehta'], ['Olivia Brown']])}<p>Only these three begin with A or O.</p>`,
    brute: { why: `<p>The bracket pattern <code>'[aeiou]%'</code> is SQL Server syntax. SQLite's LIKE treats <code>[</code> literally, so it searches for names starting with the text "[aeiou]" and returns <b>nothing</b>.</p>`, code: { lang: 'sql', db: 'hr', code: `SELECT name
FROM employees
WHERE name LIKE '[aeiou]%'      -- SQL Server only; 0 rows in SQLite
ORDER BY name;` } },
    mcq: { q: 'Which SQLite expression extracts the first character of name?', options: ['<code>SUBSTR(name, 1, 1)</code>', '<code>SUBSTR(name, 0, 1)</code>', '<code>LEFT(name, 1)</code> (works in SQLite)', '<code>name[0]</code>'], answer: 0, explain: 'SQL strings are 1-indexed. SQLite has no LEFT() function; MySQL/SQL Server/PostgreSQL do.' },
    hints: [
      `<p>Hint 1: get the first letter with <code>SUBSTR(name, 1, 1)</code> and lower-case it.</p>`,
      `<p>Hint 2: then test membership with <code>IN ('a','e','i','o','u')</code>.</p>`,
      `<p>Hint 3: an alternative is five LIKE tests joined by OR (<code>name LIKE 'a%' OR …</code>) — LIKE is case-insensitive in SQLite, or use GLOB <code>'[AEIOUaeiou]*'</code>.</p>`
    ],
    tests: { engine: 'sqlite', cases: [
      { cols: ['name'], rows: [['Aisha Bello'], ['Arjun Mehta'], ['Olivia Brown']] },
      { setup: 'DELETE FROM employees; INSERT INTO employees (id, name) VALUES (1, \'umar\'), (2, \'zed\'), (3, \'Ünal\'), (4, \'x\');', cols: ['name'], rows: [['umar']] },
      { setup: 'INSERT INTO employees (id, name) VALUES (13, \'Eve\'), (14, \'Ivy\'), (15, \'Uma\'), (16, \'Yara\');', cols: ['name'], rows: [['Aisha Bello'], ['Arjun Mehta'], ['Eve'], ['Ivy'], ['Olivia Brown'], ['Uma']] },
      { setup: 'DELETE FROM employees;', rows: [] },
      { setup: 'UPDATE employees SET name = \'Bob \' || name;', rows: [] },
      { setup: 'INSERT INTO employees (id, name) VALUES (13, \'Aisha Bello\'), (14, \'Oscar\');', cols: ['name'], rows: [['Aisha Bello'], ['Aisha Bello'], ['Arjun Mehta'], ['Olivia Brown'], ['Oscar']] },
      { setup: 'DELETE FROM employees; INSERT INTO employees (id, name) VALUES (1, \'olga\'), (2, \'abe\'), (3, \'ivan\');', cols: ['name'], rows: [['abe'], ['ivan'], ['olga']] }
    ] },
    solution: {
      approach: `<p>Take the first character, normalise its case, and check it against the vowel list with IN. Portable to any engine that has SUBSTR/SUBSTRING and LOWER.</p>`,
      code: { lang: 'sql', db: 'hr', code: `SELECT name
FROM employees
WHERE LOWER(SUBSTR(name, 1, 1)) IN ('a', 'e', 'i', 'o', 'u')
ORDER BY name;` },
      alt: [{ lang: 'sql', db: 'hr', title: 'SQLite GLOB with a character class', code: `SELECT name
FROM employees
WHERE name GLOB '[AEIOUaeiou]*'
ORDER BY name;` }],
      complexity: `<p>O(N): the function on the column prevents index use (non-sargable). Five prefix LIKEs on an index with matching collation could use five range scans.</p>`,
      followUps: ['Names that start AND end with a vowel.', 'Names that do not start with a vowel — careful with NULL names.']
    }
  });

  practice.push({
    title: 'Page 2 of Recent Orders', level: 'Medium', tags: ['limit', 'offset', 'pagination', 'tie-breaker'], companies: ['Shopify', 'Stripe', 'Razorpay'],
    statement: `<p>An admin screen shows orders <b>newest first</b>, <b>4 per page</b>. Return <code>id, order_date, amount</code> for <b>page 2</b>. Two orders can share a date, so the order must be fully deterministic (break ties by id, highest first).</p>`,
    constraints: `<p>14 orders; page numbers start at 1.</p>`,
    example: `${H.table(['id', 'order_date', 'amount'], [['110', '2024-08-25', H.c('m', 'NULL')], ['109', '2024-08-20', '2398'], ['108', '2024-08-18', '149'], ['107', '2024-08-15', '1899']])}<p>Page 1 = orders 114, 113, 112, 111. Page 2 skips those four: OFFSET = (2 − 1) × 4 = 4.</p>`,
    brute: { why: `<p>Using the page number as the offset (<code>OFFSET 2</code>) returns rows 3–6, overlapping page 1. Also, sorting only by date would let tied dates swap between pages.</p>`, code: { lang: 'sql', db: 'shop', code: `SELECT id, order_date, amount
FROM orders
ORDER BY order_date DESC
LIMIT 4 OFFSET 2;     -- wrong offset, no tie-breaker` } },
    mcq: { q: 'Page size 4, page 5. What OFFSET?', options: ['16', '20', '5', '4'], answer: 0, explain: 'OFFSET = (page − 1) × size = 4 × 4 = 16.' },
    hints: [
      `<p>Hint 1: OFFSET counts rows to skip, not pages: (page − 1) × page_size.</p>`,
      `<p>Hint 2: make the sort unique: <code>ORDER BY order_date DESC, id DESC</code>.</p>`,
      `<p>Hint 3: <code>LIMIT 4 OFFSET 4</code> — or in SQLite/MySQL short form <code>LIMIT 4, 4</code> (offset first!).</p>`
    ],
    tests: { engine: 'sqlite', cases: [
      { cols: ['id', 'order_date', 'amount'], rows: [[110, '2024-08-25', null], [109, '2024-08-20', 2398], [108, '2024-08-18', 149], [107, '2024-08-15', 1899]] },
      { setup: 'UPDATE orders SET order_date = \'2024-09-05\';', cols: ['id', 'order_date', 'amount'], rows: [[110, '2024-09-05', null], [109, '2024-09-05', 2398], [108, '2024-09-05', 149], [107, '2024-09-05', 1899]] },
      { setup: 'DELETE FROM orders WHERE id > 105;', cols: ['id', 'order_date', 'amount'], rows: [[101, '2024-08-01', 1598]] },
      { setup: 'DELETE FROM orders WHERE id > 104;', rows: [] },
      { setup: 'DELETE FROM orders;', rows: [] },
      { setup: 'UPDATE orders SET order_date = \'2024-08-25\' WHERE id IN (109, 110, 111, 112);', cols: ['id', 'order_date', 'amount'], rows: [[110, '2024-08-25', null], [109, '2024-08-25', 2398], [108, '2024-08-18', 149], [107, '2024-08-15', 1899]] },
      { setup: 'INSERT INTO orders (id, customer_id, order_date, status, amount) VALUES (115, 1, \'2024-09-06\', \'delivered\', 100);INSERT INTO orders (id, customer_id, order_date, status, amount) VALUES (116, 2, \'2024-09-06\', \'delivered\', 100);INSERT INTO orders (id, customer_id, order_date, status, amount) VALUES (117, 3, \'2024-09-06\', \'delivered\', 100);INSERT INTO orders (id, customer_id, order_date, status, amount) VALUES (118, 4, \'2024-09-07\', \'delivered\', 100);', cols: ['id', 'order_date', 'amount'], rows: [[114, '2024-09-05', 1899], [113, '2024-09-03', 1499], [112, '2024-09-01', 799], [111, '2024-08-28', 599]] }
    ] },
    solution: {
      approach: `<p>Deterministic sort (date, then id, both descending), skip one page of 4 rows, take 4.</p>`,
      code: { lang: 'sql', db: 'shop', code: `SELECT id, order_date, amount
FROM orders
ORDER BY order_date DESC, id DESC
LIMIT 4 OFFSET 4;` },
      alt: [{ lang: 'sql', db: 'shop', title: 'Keyset version (page 1 ended at 2024-08-28, id 111)', code: `-- Page 1's last row was (order_date '2024-08-28', id 111)
SELECT id, order_date, amount
FROM orders
WHERE (order_date, id) < ('2024-08-28', 111)
ORDER BY order_date DESC, id DESC
LIMIT 4;` }],
      complexity: `<p>OFFSET reads offset + limit rows (O(page × size)); keyset reads only the page with an index on (order_date, id).</p>`,
      followUps: ['Also return the total number of pages.', 'What goes wrong with OFFSET if a new order arrives while the user is on page 1?']
    }
  });

  practice.push({
    title: 'Products With an Underscore in the Name', level: 'Medium', tags: ['like', 'escape', 'wildcards'], companies: ['Atlassian', 'GitHub'],
    statement: `<p>A data-quality job must find products whose name contains a <b>literal underscore</b> character (<code>_</code>). Return <code>id, name</code>.</p>`,
    constraints: `<p>12 products; <code>_</code> is a wildcard in LIKE patterns.</p>`,
    example: `${H.table(['id', 'name'], [['11', 'Running_Shoes']])}<p>Only one product actually contains the underscore character.</p>`,
    brute: { why: `<p>In LIKE, <code>_</code> means "any single character", so <code>'%_%'</code> means "at least one character" and matches <b>all 12</b> products.</p>`, code: { lang: 'sql', db: 'shop', code: `SELECT id, name
FROM products
WHERE name LIKE '%_%';     -- matches every non-empty name` } },
    mcq: { q: 'What does the pattern <code>\'%_%\'</code> match?', options: ['Any string with at least one character', 'Strings containing an underscore', 'Empty strings only', 'Nothing'], answer: 0, explain: '_ is the single-character wildcard; surrounded by % it matches any non-empty string.' },
    hints: [
      `<p>Hint 1: you must tell LIKE that this particular <code>_</code> is literal.</p>`,
      `<p>Hint 2: choose an escape character and declare it: <code>LIKE '%\\_%' ESCAPE '\\'</code>.</p>`,
      `<p>Hint 3: alternatives without LIKE: <code>INSTR(name, '_') &gt; 0</code> or SQLite <code>GLOB '*_*'</code> (in GLOB, _ is not special).</p>`
    ],
    tests: { engine: 'sqlite', cmp: 'set', cases: [
      { cols: ['id', 'name'], rows: [[11, 'Running_Shoes']] },
      { setup: 'DELETE FROM products WHERE id = 11;', rows: [] },
      { setup: 'INSERT INTO products (id, name, category, price) VALUES (13, \'a_b_c\', \'X\', 1);INSERT INTO products (id, name, category, price) VALUES (14, \'_lead\', \'X\', 1);INSERT INTO products (id, name, category, price) VALUES (15, \'trail_\', \'X\', 1);INSERT INTO products (id, name, category, price) VALUES (16, \'_\', \'X\', 1);', cols: ['id', 'name'], rows: [[11, 'Running_Shoes'], [13, 'a_b_c'], [14, '_lead'], [15, 'trail_'], [16, '_']] },
      { setup: 'INSERT INTO products (id, name, category, price) VALUES (13, \'100% sure\', \'X\', 1);INSERT INTO products (id, name, category, price) VALUES (14, \'ab\', \'X\', 1);', cols: ['id', 'name'], rows: [[11, 'Running_Shoes']] },
      { setup: 'UPDATE products SET name = replace(name, \' \', \'_\');', cols: ['id', 'name'], rows: [[1, 'Wireless_Mouse'], [2, 'Mechanical_Keyboard'], [3, 'USB-C_Cable'], [4, 'Yoga_Mat'], [5, 'Dumbbell_5kg'], [6, 'Coffee_Mug'], [7, 'French_Press'], [8, 'Notebook_A5'], [9, 'Gel_Pen_10-pack'], [10, '100%_Cotton_Tee'], [11, 'Running_Shoes'], [12, 'Desk_Lamp']] },
      { setup: 'UPDATE products SET name = \'plain\' || id;', rows: [] }
    ] },
    solution: {
      approach: `<p>Escape the wildcard so LIKE treats it as a literal character. INSTR is a wildcard-free alternative.</p>`,
      code: { lang: 'sql', db: 'shop', code: `SELECT id, name
FROM products
WHERE name LIKE '%\\_%' ESCAPE '\\';` },
      alt: [{ lang: 'sql', db: 'shop', title: 'No wildcards at all', code: `SELECT id, name
FROM products
WHERE INSTR(name, '_') > 0;` }],
      complexity: `<p>O(N): a leading % prevents index use. For frequent searches consider a full-text or trigram index.</p>`,
      followUps: ['Find names containing a literal % sign.', 'Replace the underscores with spaces in the output.']
    }
  });

  practice.push({
    title: 'Orders That Did Not Use WELCOME10', level: 'Medium', tags: ['null', 'is not', 'three-valued logic'], companies: ['Swiggy', 'Instacart'],
    statement: `<p>Marketing wants every order that did <b>not</b> use the coupon <code>WELCOME10</code> — including orders with <b>no coupon at all</b>. Return <code>id, coupon</code> ordered by id.</p>`,
    constraints: `<p>14 orders; <code>coupon</code> is NULL when no coupon was used; 3 orders used WELCOME10.</p>`,
    example: `${H.table(['id', 'coupon'], [['101', H.c('m', 'NULL')], ['103', H.c('m', 'NULL')], ['104', 'FIT15'], ['…', '…'], ['107', 'KITCHEN5'], ['…', '…'], ['114', H.c('m', 'NULL')]])}<p>11 rows: 14 orders minus the 3 that used WELCOME10.</p>`,
    brute: { why: `<p><code>coupon &lt;&gt; 'WELCOME10'</code> is UNKNOWN for the 9 orders with a NULL coupon, so only FIT15 and KITCHEN5 come back — 2 rows instead of 11.</p>`, code: { lang: 'sql', db: 'shop', code: `SELECT id, coupon
FROM orders
WHERE coupon <> 'WELCOME10'     -- NULL coupons vanish
ORDER BY id;` } },
    mcq: { q: 'Which condition keeps NULL coupons?', options: ["<code>coupon IS NOT 'WELCOME10'</code> (SQLite)", "<code>coupon &lt;&gt; 'WELCOME10'</code>", "<code>NOT coupon = 'WELCOME10'</code>", "<code>coupon != 'WELCOME10'</code>"], answer: 0, explain: 'IS / IS NOT are null-safe in SQLite: NULL IS NOT \'WELCOME10\' is TRUE. The other three are UNKNOWN for NULL.' },
    hints: [
      `<p>Hint 1: count the cases: coupon = WELCOME10, coupon = something else, coupon unknown. The question wants the last two.</p>`,
      `<p>Hint 2: add <code>OR coupon IS NULL</code>, or use the null-safe <code>IS NOT</code> / <code>IS DISTINCT FROM</code>.</p>`,
      `<p>Hint 3: sanity check: 3 + 11 = 14 orders.</p>`
    ],
    tests: { engine: 'sqlite', cases: [
      { cols: ['id', 'coupon'], rows: [[101, null], [103, null], [104, 'FIT15'], [105, null], [106, null], [107, 'KITCHEN5'], [108, null], [109, null], [110, null], [112, null], [114, null]] },
      { setup: 'UPDATE orders SET coupon = NULL;', cols: ['id', 'coupon'], rows: [[101, null], [102, null], [103, null], [104, null], [105, null], [106, null], [107, null], [108, null], [109, null], [110, null], [111, null], [112, null], [113, null], [114, null]] },
      { setup: 'UPDATE orders SET coupon = \'WELCOME10\';', rows: [] },
      { setup: 'UPDATE orders SET coupon = \'\' WHERE id = 101; UPDATE orders SET coupon = \'WELCOME100\' WHERE id = 103;', cols: ['id', 'coupon'], rows: [[101, ''], [103, 'WELCOME100'], [104, 'FIT15'], [105, null], [106, null], [107, 'KITCHEN5'], [108, null], [109, null], [110, null], [112, null], [114, null]] },
      { setup: 'DELETE FROM orders;', rows: [] },
      { setup: 'UPDATE orders SET coupon = \'FIT15\' WHERE coupon = \'WELCOME10\';', cols: ['id', 'coupon'], rows: [[101, null], [102, 'FIT15'], [103, null], [104, 'FIT15'], [105, null], [106, null], [107, 'KITCHEN5'], [108, null], [109, null], [110, null], [111, 'FIT15'], [112, null], [113, 'FIT15'], [114, null]] }
    ] },
    solution: {
      approach: `<p>Use a null-safe inequality so that "no coupon" counts as "not WELCOME10".</p>`,
      code: { lang: 'sql', db: 'shop', code: `SELECT id, coupon
FROM orders
WHERE coupon IS DISTINCT FROM 'WELCOME10'   -- standard; SQLite also: coupon IS NOT 'WELCOME10'
ORDER BY id;` },
      alt: [{ lang: 'sql', db: 'shop', title: 'Works on every database', code: `SELECT id, coupon
FROM orders
WHERE coupon <> 'WELCOME10' OR coupon IS NULL
ORDER BY id;` }],
      complexity: `<p>O(N) scan. MySQL spells null-safe equality <code>&lt;=&gt;</code>, so there: <code>NOT (coupon &lt;=&gt; 'WELCOME10')</code>.</p>`,
      followUps: ['Count orders by "used coupon" vs "no coupon".', 'Why is <code>COALESCE(coupon, \'\') &lt;&gt; \'WELCOME10\'</code> correct but less index-friendly?']
    }
  });

  practice.push({
    title: 'Weak or Unrated Movies', level: 'Medium', tags: ['or', 'is null', 'order by nulls'], companies: ['Netflix', 'Hulu'],
    statement: `<p>Return <code>title, rating</code> of movies that are <b>rated below 8.2 or not rated at all</b>. Show unrated movies first, then by rating ascending, ties by title.</p>`,
    constraints: `<p>14 movies; 2 have NULL rating.</p>`,
    example: `${H.table(['title', 'rating'], [['Dune: Part Three', H.c('m', 'NULL')], ['Untitled Indie Film', H.c('m', 'NULL')], ['The Room', '3.6'], ['Groundhog Day', '8.0'], ['Lagaan', '8.1']])}<p>5 rows. Jurassic Park (8.2) is not <i>below</i> 8.2.</p>`,
    brute: { why: `<p><code>NOT (rating &gt;= 8.2)</code> looks like "below 8.2 or unknown", but NOT UNKNOWN is still UNKNOWN, so both unrated movies are dropped — 3 rows instead of 5.</p>`, code: { lang: 'sql', db: 'movies', code: `SELECT title, rating
FROM movies
WHERE NOT (rating >= 8.2)
ORDER BY rating, title;` } },
    mcq: { q: 'For a NULL rating, <code>NOT (rating &gt;= 8.2)</code> is…', options: ['UNKNOWN', 'TRUE', 'FALSE', 'An error'], answer: 0, explain: 'rating >= 8.2 is UNKNOWN, and NOT UNKNOWN = UNKNOWN.' },
    hints: [
      `<p>Hint 1: two separate reasons qualify a movie: a low rating, or a missing rating.</p>`,
      `<p>Hint 2: <code>rating &lt; 8.2 OR rating IS NULL</code> — UNKNOWN OR TRUE is TRUE for the unrated films.</p>`,
      `<p>Hint 3: for "unrated first", SQLite's ascending default already puts NULLs first, but write <code>NULLS FIRST</code> to be explicit and portable to PostgreSQL.</p>`
    ],
    tests: { engine: 'sqlite', cases: [
      { cols: ['title', 'rating'], rows: [['Dune: Part Three', null], ['Untitled Indie Film', null], ['The Room', 3.6], ['Groundhog Day', 8], ['Lagaan', 8.1]] },
      { setup: 'INSERT INTO movies (id, title, rating) VALUES (15, \'Edge 8.2\', 8.2);INSERT INTO movies (id, title, rating) VALUES (16, \'Edge 8.19\', 8.19);INSERT INTO movies (id, title, rating) VALUES (17, \'Zero\', 0);', cols: ['title', 'rating'], rows: [['Dune: Part Three', null], ['Untitled Indie Film', null], ['Zero', 0], ['The Room', 3.6], ['Groundhog Day', 8], ['Lagaan', 8.1], ['Edge 8.19', 8.19]] },
      { setup: 'UPDATE movies SET rating = NULL;', cols: ['title', 'rating'], rows: [['Amelie', null], ['Dangal', null], ['Dune: Part Three', null], ['Groundhog Day', null], ['Inception', null], ['Jurassic Park', null], ['Lagaan', null], ['Parasite', null], ['Se7en', null], ['Spirited Away', null], ['The Matrix', null], ['The Room', null], ['Toy Story', null], ['Untitled Indie Film', null]] },
      { setup: 'UPDATE movies SET rating = 9;', rows: [] },
      { setup: 'UPDATE movies SET rating = 7 WHERE id IN (1, 2, 3);', cols: ['title', 'rating'], rows: [['Dune: Part Three', null], ['Untitled Indie Film', null], ['The Room', 3.6], ['Parasite', 7], ['Spirited Away', 7], ['The Matrix', 7], ['Groundhog Day', 8], ['Lagaan', 8.1]] },
      { setup: 'DELETE FROM movies;', rows: [] },
      { setup: 'UPDATE movies SET rating = NULL WHERE rating IS NOT NULL AND rating >= 8.2; ', cols: ['title', 'rating'], rows: [['Amelie', null], ['Dangal', null], ['Dune: Part Three', null], ['Inception', null], ['Jurassic Park', null], ['Parasite', null], ['Se7en', null], ['Spirited Away', null], ['The Matrix', null], ['Toy Story', null], ['Untitled Indie Film', null], ['The Room', 3.6], ['Groundhog Day', 8], ['Lagaan', 8.1]] }
    ] },
    solution: {
      approach: `<p>OR the low-rating condition with an explicit IS NULL check; sort ascending with NULLS FIRST and title as tie-breaker.</p>`,
      code: { lang: 'sql', db: 'movies', code: `SELECT title, rating
FROM movies
WHERE rating < 8.2 OR rating IS NULL
ORDER BY rating ASC NULLS FIRST, title;` },
      complexity: `<p>O(N) scan + small sort.</p>`,
      followUps: ['Exclude films that have not been released yet (year after 2026 or NULL).', 'Make it portable to MySQL (no NULLS FIRST).']
    }
  });

  practice.push({
    title: 'Fifth-Largest Distinct Order Amount', level: 'Medium', tags: ['distinct', 'limit', 'offset', 'nth highest'], companies: ['Amazon', 'Bloomberg'],
    statement: `<p>Return the <b>5th largest distinct</b> order amount as a column named <code>amount</code>. Ignore orders with an unknown amount. If it does not exist, return NULL.</p>`,
    constraints: `<p>14 orders; amount 1899 appears twice; one amount is NULL.</p>`,
    example: `${H.table(['rank', 'distinct amount'], [['1', '4999'], ['2', '3499'], ['3', '2398'], ['4', '1899 ' + H.c('m', '(×2)')], [H.c('g', '5'), H.c('g', '1598')]])}<p>Answer: <b>1598</b>. Counting rows instead of values would give 1899 (the duplicate fills two positions).</p>`,
    brute: { why: `<p>Without DISTINCT, the two 1899 orders occupy positions 4 and 5, so OFFSET 4 lands on the second 1899 — ${H.c('r', '1899')} instead of 1598.</p>`, code: { lang: 'sql', db: 'shop', code: `SELECT amount
FROM orders
WHERE amount IS NOT NULL
ORDER BY amount DESC
LIMIT 1 OFFSET 4;` } },
    mcq: { q: 'In logical order, when are duplicates removed relative to OFFSET?', options: ['Before — DISTINCT runs before ORDER BY and LIMIT/OFFSET', 'After OFFSET', 'At the same time', 'DISTINCT is ignored with OFFSET'], answer: 0, explain: 'SELECT → DISTINCT → ORDER BY → LIMIT/OFFSET.' },
    hints: [
      `<p>Hint 1: positions must be counted over distinct <i>values</i>.</p>`,
      `<p>Hint 2: 5th largest → <code>ORDER BY amount DESC LIMIT 1 OFFSET 4</code> after DISTINCT.</p>`,
      `<p>Hint 3: wrap in a scalar subquery <code>SELECT ( … ) AS amount</code> so a missing value yields NULL rather than no row.</p>`
    ],
    tests: { engine: 'sqlite', cases: [
      { cols: ['amount'], rows: [[1598]] },
      { setup: 'UPDATE orders SET amount = 100;', cols: ['amount'], rows: [[null]] },
      { setup: 'DELETE FROM orders;', cols: ['amount'], rows: [[null]] },
      { setup: 'DELETE FROM orders WHERE id > 105;', cols: ['amount'], rows: [[299]] },
      { setup: 'DELETE FROM orders WHERE id > 104;', cols: ['amount'], rows: [[null]] },
      { setup: 'UPDATE orders SET amount = NULL WHERE id > 106;', cols: ['amount'], rows: [[349]] },
      { setup: 'UPDATE orders SET amount = -amount;', cols: ['amount'], rows: [[-799]] },
      { setup: 'UPDATE orders SET amount = 4999 WHERE id IN (101, 102, 103);', cols: ['amount'], rows: [[1199]] }
    ] },
    solution: {
      approach: `<p>Drop NULLs, de-duplicate, sort descending, skip 4, take 1 — inside a scalar subquery for the NULL-if-missing guarantee.</p>`,
      code: { lang: 'sql', db: 'shop', code: `SELECT (
    SELECT DISTINCT amount
    FROM orders
    WHERE amount IS NOT NULL
    ORDER BY amount DESC
    LIMIT 1 OFFSET 4
) AS amount;` },
      complexity: `<p>O(N log N) for the sort of distinct values (O(N) hashing + top-k in smart engines).</p>`,
      followUps: ['Parameterise N (a function in PostgreSQL / a bind variable).', 'Return every order having that amount.']
    }
  });

  /* =====================================================================
     PRACTICE — Hard
     ===================================================================== */
  practice.push({
    title: 'Keyset Pagination With Mixed Sort Directions', level: 'Hard', tags: ['keyset pagination', 'order by', 'ties'], companies: ['LinkedIn', 'Twitter/X', 'Stripe'],
    statement: `<p>A salary report is sorted by <b>salary descending</b>, then <b>id ascending</b>, 3 rows per page. The client sends the cursor of the last row it saw: <code>(salary = 120000, id = 3)</code>. Return the <b>next page</b> (<code>id, name, salary</code>) <b>without using OFFSET</b>.</p>`,
    constraints: `<p>Two employees earn exactly 120000 (ids 3 and 4) — the cursor sits in the middle of a tie. Salaries are NOT NULL here.</p>`,
    example: `${H.table(['id', 'name', 'salary'], [[H.c('g', '4'), H.c('g', 'Marco Rossi'), '120000'], ['11', 'Zoe Martin', '110000'], ['7', 'Aisha Bello', '95000']])}<p>Marco (120000, id 4) comes right after Lena (120000, id 3) because ids ascend within a salary tie. He must not be skipped.</p>`,
    brute: { why: `<p>Filtering only on the first key, <code>salary &lt; 120000</code>, skips ${H.c('r', 'Marco (id 4)')}, who shares the cursor's salary. The row-value shortcut <code>(salary, id) &lt; (120000, 3)</code> is also wrong here because the two keys sort in <b>opposite directions</b>.</p>`, code: { lang: 'sql', db: 'hr', code: `SELECT id, name, salary
FROM employees
WHERE salary < 120000          -- loses the rest of the tie
ORDER BY salary DESC, id
LIMIT 3;` } },
    mcq: { q: 'Sort is <code>salary DESC, id ASC</code>. Which predicate means "strictly after (S, I)"?', options: ['<code>salary &lt; S OR (salary = S AND id &gt; I)</code>', '<code>(salary, id) &lt; (S, I)</code>', '<code>salary &lt;= S AND id &gt; I</code>', '<code>salary &lt; S AND id &gt; I</code>'], answer: 0, explain: 'Either the first key is strictly further along (lower salary), or it ties and the second key is further along (higher id). Row values only work when all keys share one direction.' },
    hints: [
      `<p>Hint 1: "after the cursor" in sort order means: strictly later on the first key, or equal on the first key and strictly later on the second.</p>`,
      `<p>Hint 2: "later" for a DESC key means smaller; for an ASC key it means larger.</p>`,
      `<p>Hint 3: write <code>salary &lt; 120000 OR (salary = 120000 AND id &gt; 3)</code>, keep the same ORDER BY, and LIMIT 3.</p>`
    ],
    tests: { engine: 'sqlite', cases: [
      { cols: ['id', 'name', 'salary'], rows: [[4, 'Marco Rossi', 120000], [11, 'Zoe Martin', 110000], [7, 'Aisha Bello', 95000]] },
      { setup: 'INSERT INTO employees (id, name, dept, title, salary, bonus, manager_id) VALUES (13, \'Tie13\', \'HR\', \'X\', 120000, NULL, NULL);', cols: ['id', 'name', 'salary'], rows: [[4, 'Marco Rossi', 120000], [13, 'Tie13', 120000], [11, 'Zoe Martin', 110000]] },
      { setup: 'INSERT INTO employees (id, name, dept, title, salary, bonus, manager_id) VALUES (0, \'Tie0\', \'HR\', \'X\', 120000, NULL, NULL);', cols: ['id', 'name', 'salary'], rows: [[4, 'Marco Rossi', 120000], [11, 'Zoe Martin', 110000], [7, 'Aisha Bello', 95000]] },
      { setup: 'DELETE FROM employees WHERE salary < 100000;', cols: ['id', 'name', 'salary'], rows: [[4, 'Marco Rossi', 120000], [11, 'Zoe Martin', 110000]] },
      { setup: 'DELETE FROM employees WHERE id = 4;', cols: ['id', 'name', 'salary'], rows: [[11, 'Zoe Martin', 110000], [7, 'Aisha Bello', 95000], [6, 'Tom Becker', 90000]] },
      { setup: 'DELETE FROM employees WHERE salary < 120000;', cols: ['id', 'name', 'salary'], rows: [[4, 'Marco Rossi', 120000]] },
      { setup: 'INSERT INTO employees (id, name, dept, title, salary, bonus, manager_id) VALUES (13, \'T13\', \'HR\', \'X\', 120000, NULL, NULL);INSERT INTO employees (id, name, dept, title, salary, bonus, manager_id) VALUES (14, \'T14\', \'HR\', \'X\', 120000, NULL, NULL);INSERT INTO employees (id, name, dept, title, salary, bonus, manager_id) VALUES (15, \'T15\', \'HR\', \'X\', 120000, NULL, NULL);', cols: ['id', 'name', 'salary'], rows: [[4, 'Marco Rossi', 120000], [13, 'T13', 120000], [14, 'T14', 120000]] }
    ] },
    solution: {
      approach: `<p>Expand the lexicographic comparison by hand because the directions differ. The ORDER BY must match the cursor definition exactly, and its last key must be unique (id) so no row can be skipped or repeated.</p>`,
      code: { lang: 'sql', db: 'hr', code: `SELECT id, name, salary
FROM employees
WHERE salary < 120000
   OR (salary = 120000 AND id > 3)
ORDER BY salary DESC, id ASC
LIMIT 3;` },
      alt: [{ lang: 'sql', db: 'hr', title: 'Same-direction trick: negate one key so row values work', code: `-- Sorting by (-salary ASC, id ASC) is the same order; both keys now ascend
SELECT id, name, salary
FROM employees
WHERE (-salary, id) > (-120000, 3)
ORDER BY -salary, id
LIMIT 3;` }],
      complexity: `<p>With an index on <code>(salary DESC, id)</code> each page is an O(log N) seek + 3 reads, regardless of depth — versus O(offset) for OFFSET pagination.</p>`,
      followUps: ['How would you encode the cursor in an API response?', 'What changes if salary can be NULL?', 'How do you support a "previous page" button?']
    }
  });

  practice.push({
    title: 'Employees Who Manage Nobody (the NOT IN Trap)', level: 'Hard', tags: ['not in', 'null', 'subquery', 'three-valued logic'], companies: ['Meta', 'Google', 'Microsoft'],
    statement: `<p>Return <code>id, name</code> of every employee who is <b>not anybody's manager</b>, ordered by id. <code>employees.manager_id</code> points to another employee's id and is NULL for top-level leaders.</p>`,
    constraints: `<p>12 employees; 4 have a NULL manager_id. You may use a subquery in WHERE (formally covered in SQL 5).</p>`,
    example: `${H.table(['id', 'name'], [['3', 'Lena Fischer'], ['4', 'Marco Rossi'], ['6', 'Tom Becker'], ['7', 'Aisha Bello'], ['9', 'Olivia Brown'], ['10', 'Rahul Verma'], ['11', 'Zoe Martin'], ['12', 'Nina Kowalski']])}<p>Managers are ids {1, 2, 5, 8}; everyone else (8 people) manages nobody.</p>`,
    brute: { why: `<p>The subquery returns <code>{NULL, 1, 2, 5, 8}</code>. <code>id NOT IN (…)</code> expands to <code>id &lt;&gt; NULL AND id &lt;&gt; 1 AND …</code>; the first part is always UNKNOWN, so no row is ever TRUE and the query returns <b>zero rows</b> — silently.</p>`, code: { lang: 'sql', db: 'hr', code: `SELECT id, name
FROM employees
WHERE id NOT IN (SELECT manager_id FROM employees)   -- contains NULL → 0 rows
ORDER BY id;` } },
    mcq: { q: '<code>3 NOT IN (1, 2, NULL)</code> evaluates to…', options: ['UNKNOWN', 'TRUE', 'FALSE', 'An error'], answer: 0, explain: '3<>1 TRUE, 3<>2 TRUE, 3<>NULL UNKNOWN; TRUE AND TRUE AND UNKNOWN = UNKNOWN.' },
    hints: [
      `<p>Hint 1: run the subquery alone and look at its values — is there a NULL?</p>`,
      `<p>Hint 2: remove the NULLs inside the subquery: <code>WHERE manager_id IS NOT NULL</code>.</p>`,
      `<p>Hint 3: the industry-standard fix is <code>NOT EXISTS (SELECT 1 FROM employees r WHERE r.manager_id = e.id)</code>, which is immune to NULLs and usually becomes an efficient anti-join.</p>`
    ],
    tests: { engine: 'sqlite', cases: [
      { cols: ['id', 'name'], rows: [[3, 'Lena Fischer'], [4, 'Marco Rossi'], [6, 'Tom Becker'], [7, 'Aisha Bello'], [9, 'Olivia Brown'], [10, 'Rahul Verma'], [11, 'Zoe Martin'], [12, 'Nina Kowalski']] },
      { setup: 'UPDATE employees SET manager_id = NULL;', cols: ['id', 'name'], rows: [[1, 'Priya Sharma'], [2, 'Arjun Mehta'], [3, 'Lena Fischer'], [4, 'Marco Rossi'], [5, 'Sara Johnson'], [6, 'Tom Becker'], [7, 'Aisha Bello'], [8, 'Kenji Tanaka'], [9, 'Olivia Brown'], [10, 'Rahul Verma'], [11, 'Zoe Martin'], [12, 'Nina Kowalski']] },
      { setup: 'UPDATE employees SET manager_id = 3 WHERE id = 12;', cols: ['id', 'name'], rows: [[4, 'Marco Rossi'], [6, 'Tom Becker'], [7, 'Aisha Bello'], [9, 'Olivia Brown'], [10, 'Rahul Verma'], [11, 'Zoe Martin'], [12, 'Nina Kowalski']] },
      { setup: 'DELETE FROM employees;', rows: [] },
      { setup: 'UPDATE employees SET manager_id = id WHERE id = 6;', cols: ['id', 'name'], rows: [[3, 'Lena Fischer'], [4, 'Marco Rossi'], [7, 'Aisha Bello'], [9, 'Olivia Brown'], [10, 'Rahul Verma'], [11, 'Zoe Martin'], [12, 'Nina Kowalski']] },
      { setup: 'UPDATE employees SET manager_id = 12 WHERE manager_id IS NOT NULL;', cols: ['id', 'name'], rows: [[1, 'Priya Sharma'], [2, 'Arjun Mehta'], [3, 'Lena Fischer'], [4, 'Marco Rossi'], [5, 'Sara Johnson'], [6, 'Tom Becker'], [7, 'Aisha Bello'], [8, 'Kenji Tanaka'], [9, 'Olivia Brown'], [10, 'Rahul Verma'], [11, 'Zoe Martin']] },
      { setup: 'UPDATE employees SET manager_id = 99 WHERE id = 10;', cols: ['id', 'name'], rows: [[3, 'Lena Fischer'], [4, 'Marco Rossi'], [6, 'Tom Becker'], [7, 'Aisha Bello'], [9, 'Olivia Brown'], [10, 'Rahul Verma'], [11, 'Zoe Martin'], [12, 'Nina Kowalski']] }
    ] },
    solution: {
      approach: `<p>Exclude NULLs from the NOT IN list so the comparison can become TRUE, or switch to NOT EXISTS, whose correlated test simply finds no matching row.</p>`,
      code: { lang: 'sql', db: 'hr', code: `SELECT id, name
FROM employees
WHERE id NOT IN (SELECT manager_id
                 FROM employees
                 WHERE manager_id IS NOT NULL)
ORDER BY id;` },
      alt: [{ lang: 'sql', db: 'hr', title: 'NOT EXISTS (preferred)', code: `SELECT e.id, e.name
FROM employees AS e
WHERE NOT EXISTS (SELECT 1
                  FROM employees AS r
                  WHERE r.manager_id = e.id)
ORDER BY e.id;` }],
      complexity: `<p>Naively O(N·M); engines turn NOT EXISTS (and NULL-safe NOT IN) into a hash anti-join, O(N + M). An index on manager_id makes each probe O(log N).</p>`,
      followUps: ['Return managers with exactly one direct report (needs GROUP BY).', 'Why can the optimizer not always turn NOT IN into an anti-join?']
    }
  });

  practice.push({
    title: 'Safe Product Search for User Input', level: 'Hard', tags: ['like', 'escape', 'security'], companies: ['Shopify', 'Etsy', 'Atlassian'],
    statement: `<p>A search box passes the user's text into a "name contains" query. The user types <code>_S</code> and expects products whose name literally contains "_S" (case-insensitive). Return <code>id, name</code>. Your query must treat <code>%</code> and <code>_</code> in user input as <b>literal characters</b>.</p>`,
    constraints: `<p>The term comes from the user; assume the app escapes it before binding. Escape character: backslash.</p>`,
    example: `${H.table(['id', 'name'], [['11', 'Running_Shoes']])}<p>Only one name contains the two characters "_S". The naive query returns 5 rows.</p>`,
    brute: { why: `<p>Dropping the raw term into <code>'%' || term || '%'</code> makes <code>_</code> a wildcard: <code>'%_S%'</code> = "any character followed by s" → Wireless Mouse, USB-C Cable, French Press, Running_Shoes, Desk Lamp. A user typing just <code>%</code> would dump the whole table.</p>`, code: { lang: 'sql', db: 'shop', code: `SELECT id, name
FROM products
WHERE name LIKE '%' || '_S' || '%';     -- user text used as a pattern` } },
    mcq: { q: 'Which characters must be escaped in the user term before using it in LIKE with ESCAPE \'\\\'?', options: ['<code>%</code>, <code>_</code> and the escape character <code>\\</code> itself', 'Only <code>%</code>', 'Only single quotes', 'Nothing if you use bind parameters'], answer: 0, explain: 'Bind parameters stop SQL injection but not wildcard interpretation. Escape %, _ and the escape character (otherwise a trailing backslash breaks the pattern).' },
    hints: [
      `<p>Hint 1: there are two separate problems: SQL injection (solved by bind parameters) and wildcard injection (solved by escaping).</p>`,
      `<p>Hint 2: in the app: <code>term.replace('\\\\', '\\\\\\\\').replace('%', '\\\\%').replace('_', '\\\\_')</code> — escape the backslash first.</p>`,
      `<p>Hint 3: in SQL you can also escape inside the query with nested REPLACE calls, then <code>LIKE '%' || escaped || '%' ESCAPE '\\'</code>.</p>`
    ],
    tests: { engine: 'sqlite', cmp: 'set', cases: [
      { cols: ['id', 'name'], rows: [[11, 'Running_Shoes']] },
      { setup: 'INSERT INTO products (id, name, category, price) VALUES (13, \'Big_sale\', \'X\', 1);', cols: ['id', 'name'], rows: [[11, 'Running_Shoes'], [13, 'Big_sale']] },
      { setup: 'DELETE FROM products WHERE id = 11;', rows: [] },
      { setup: 'INSERT INTO products (id, name, category, price) VALUES (13, \'x_S_y\', \'X\', 1);INSERT INTO products (id, name, category, price) VALUES (14, \'under score S\', \'X\', 1);INSERT INTO products (id, name, category, price) VALUES (15, \'S_\', \'X\', 1);', cols: ['id', 'name'], rows: [[11, 'Running_Shoes'], [13, 'x_S_y']] },
      { setup: 'UPDATE products SET name = \'Run%_Shoes\' WHERE id = 11;', cols: ['id', 'name'], rows: [[11, 'Run%_Shoes']] },
      { setup: 'UPDATE products SET name = \'a\\_Sb\' WHERE id = 11;', cols: ['id', 'name'], rows: [[11, 'a\\_Sb']] },
      { setup: 'UPDATE products SET name = \'S_\' || id WHERE id < 4;', cols: ['id', 'name'], rows: [[11, 'Running_Shoes']] }
    ] },
    solution: {
      approach: `<p>Escape the escape character, then % and _, and declare the escape character with ESCAPE. Doing it in SQL with REPLACE keeps the example self-contained; in production pass the raw term as a bind parameter and escape in code (or in SQL exactly like this).</p>`,
      code: { lang: 'sql', db: 'shop', code: `-- :term = '_S' (would be a bind parameter in an app)
SELECT id, name
FROM products
WHERE name LIKE '%' ||
      REPLACE(REPLACE(REPLACE('_S', '\\', '\\\\'), '%', '\\%'), '_', '\\_')
      || '%' ESCAPE '\\';` },
      alt: [{ lang: 'sql', db: 'shop', title: 'Wildcard-free alternative', code: `SELECT id, name
FROM products
WHERE INSTR(LOWER(name), LOWER('_S')) > 0;` }],
      complexity: `<p>O(N) per search (leading wildcard). At scale use full-text search (SQLite FTS5, PostgreSQL tsvector/pg_trgm) where escaping rules differ again.</p>`,
      followUps: ['Rank results that START with the term above results that merely contain it.', 'Why is INSTR safe from wildcard injection?']
    }
  });

  practice.push({
    title: 'Department Roster With Unknowns Last', level: 'Hard', tags: ['distinct', 'coalesce', 'order by expression', 'logical order'], companies: ['Workday', 'Rippling', 'Deel'],
    statement: `<p>Produce the distinct list of (<code>dept_name</code>, <code>title</code>) pairs. Show a missing department as <code>'N/A'</code>. Sort departments alphabetically, but <b>'N/A' must come last</b>; within a department sort titles alphabetically.</p>`,
    constraints: `<p>12 employees, 9 distinct pairs; Engineering has 3 Engineers. 'N/A' would sort between Marketing and Sales alphabetically.</p>`,
    example: `${H.table(['dept_name', 'title'], [['Engineering', 'Engineer'], ['Engineering', 'Senior Engineer'], ['Engineering', 'VP Engineering'], ['HR', 'HR Manager'], ['Marketing', 'Designer'], ['Marketing', 'Marketing Lead'], ['Sales', 'Account Exec'], ['Sales', 'VP Sales'], [H.c('y', 'N/A'), 'Intern']])}<p>Plain alphabetical order would put N/A before Sales — the requirement says last.</p>`,
    brute: { why: `<p>Sorting by the display alias alone puts ${H.c('r', "'N/A'")} in the middle ('M' &lt; 'N' &lt; 'S'). Sorting by the raw <code>dept</code> with NULLS LAST would work in SQLite but sorts by a column that is not in the DISTINCT select list — an error in PostgreSQL.</p>`, code: { lang: 'sql', db: 'hr', code: `SELECT DISTINCT COALESCE(dept, 'N/A') AS dept_name, title
FROM employees
ORDER BY dept_name, title;      -- N/A lands between Marketing and Sales` } },
    mcq: { q: 'What does <code>ORDER BY dept_name = \'N/A\', dept_name</code> do?', options: ['Sorts real departments (0) before N/A (1), then alphabetically', 'Filters out N/A', 'Sorts N/A first', 'Is a syntax error'], answer: 0, explain: 'A comparison yields 0/1 in SQLite; ascending puts 0 (real departments) first. Elsewhere use CASE WHEN dept_name = \'N/A\' THEN 1 ELSE 0 END.' },
    hints: [
      `<p>Hint 1: DISTINCT runs on the output columns, so compute <code>COALESCE(dept, 'N/A')</code> in SELECT and de-duplicate that.</p>`,
      `<p>Hint 2: ORDER BY runs after SELECT and can use the alias; add a first sort key that is 1 for 'N/A' and 0 otherwise.</p>`,
      `<p>Hint 3: recipe: <code>ORDER BY dept_name = 'N/A', dept_name, title</code> (or a CASE expression for portability).</p>`
    ],
    tests: { engine: 'sqlite', cases: [
      { cols: ['dept_name', 'title'], rows: [['Engineering', 'Engineer'], ['Engineering', 'Senior Engineer'], ['Engineering', 'VP Engineering'], ['HR', 'HR Manager'], ['Marketing', 'Designer'], ['Marketing', 'Marketing Lead'], ['Sales', 'Account Exec'], ['Sales', 'VP Sales'], ['N/A', 'Intern']] },
      { setup: 'UPDATE employees SET dept = \'N/A\' WHERE id = 3; UPDATE employees SET dept = NULL WHERE id IN (4, 10);', cols: ['dept_name', 'title'], rows: [['Engineering', 'Engineer'], ['Engineering', 'Senior Engineer'], ['Engineering', 'VP Engineering'], ['HR', 'HR Manager'], ['Marketing', 'Designer'], ['Marketing', 'Marketing Lead'], ['Sales', 'Account Exec'], ['Sales', 'VP Sales'], ['N/A', 'Engineer'], ['N/A', 'Intern']] },
      { setup: 'DELETE FROM employees WHERE dept IS NULL;', cols: ['dept_name', 'title'], rows: [['Engineering', 'Engineer'], ['Engineering', 'Senior Engineer'], ['Engineering', 'VP Engineering'], ['HR', 'HR Manager'], ['Marketing', 'Designer'], ['Marketing', 'Marketing Lead'], ['Sales', 'Account Exec'], ['Sales', 'VP Sales']] },
      { setup: 'UPDATE employees SET dept = NULL;', cols: ['dept_name', 'title'], rows: [['N/A', 'Account Exec'], ['N/A', 'Designer'], ['N/A', 'Engineer'], ['N/A', 'HR Manager'], ['N/A', 'Intern'], ['N/A', 'Marketing Lead'], ['N/A', 'Senior Engineer'], ['N/A', 'VP Engineering'], ['N/A', 'VP Sales']] },
      { setup: 'DELETE FROM employees;', rows: [] },
      { setup: 'INSERT INTO employees (id, name, dept, title, salary, bonus, manager_id) VALUES (13, \'Z\', \'Zoology\', \'Zoologist\', 1, NULL, NULL);INSERT INTO employees (id, name, dept, title, salary, bonus, manager_id) VALUES (14, \'Z2\', \'Zoology\', \'Zoologist\', 1, NULL, NULL);INSERT INTO employees (id, name, dept, title, salary, bonus, manager_id) VALUES (15, \'Q\', \'Accounts\', \'Clerk\', 1, NULL, NULL);', cols: ['dept_name', 'title'], rows: [['Accounts', 'Clerk'], ['Engineering', 'Engineer'], ['Engineering', 'Senior Engineer'], ['Engineering', 'VP Engineering'], ['HR', 'HR Manager'], ['Marketing', 'Designer'], ['Marketing', 'Marketing Lead'], ['Sales', 'Account Exec'], ['Sales', 'VP Sales'], ['Zoology', 'Zoologist'], ['N/A', 'Intern']] }
    ] },
    solution: {
      approach: `<p>Project the display value with COALESCE, de-duplicate pairs with DISTINCT, then sort by a boolean "is unknown" key first. Every ORDER BY expression only uses select-list columns, which keeps it legal under strict DISTINCT rules.</p>`,
      code: { lang: 'sql', db: 'hr', code: `SELECT DISTINCT COALESCE(dept, 'N/A') AS dept_name,
                title
FROM employees
ORDER BY dept_name = 'N/A',   -- 0 for real departments, 1 for N/A
         dept_name,
         title;` },
      alt: [{ lang: 'sql', db: 'hr', title: 'Portable CASE version (PostgreSQL / SQL Server)', code: `SELECT dept_name, title
FROM (SELECT DISTINCT COALESCE(dept, 'N/A') AS dept_name, title
      FROM employees) AS t
ORDER BY CASE WHEN dept_name = 'N/A' THEN 1 ELSE 0 END,
         dept_name,
         title;` }],
      complexity: `<p>O(N) to hash-deduplicate + O(K log K) to sort the K distinct pairs.</p>`,
      followUps: ['Show only the first 5 pairs.', 'Add a headcount per pair (GROUP BY — SQL 3).']
    }
  });

  /* =====================================================================
     QUIZ
     ===================================================================== */
  quiz.push(
    { q: 'What is the correct <b>logical</b> processing order?', options: ['FROM → WHERE → SELECT → DISTINCT → ORDER BY → LIMIT', 'SELECT → FROM → WHERE → ORDER BY → LIMIT → DISTINCT', 'FROM → SELECT → WHERE → ORDER BY → DISTINCT → LIMIT', 'WHERE → FROM → SELECT → LIMIT → ORDER BY'], answer: 0, explain: 'Rows are sourced, filtered, projected, de-duplicated, sorted and finally cut.' },
    { q: '<code>SELECT name FROM employees WHERE email = NULL;</code> returns…', options: ['Zero rows, always', 'Employees without email', 'Employees with email', 'An error in every database'], answer: 0, explain: 'Comparing with NULL yields UNKNOWN; WHERE keeps only TRUE. Use IS NULL.' },
    { q: 'What is <code>TRUE OR UNKNOWN</code>?', options: ['TRUE', 'UNKNOWN', 'FALSE', 'NULL error'], answer: 0, explain: 'Whatever the unknown is, OR with TRUE is TRUE.' },
    { q: 'What is <code>FALSE OR UNKNOWN</code>?', options: ['UNKNOWN', 'FALSE', 'TRUE', 'It depends on the database'], answer: 0, explain: 'The result depends on the unknown value, so it stays UNKNOWN.' },
    { q: '<code>WHERE dept = \'Sales\' OR dept = \'HR\' AND salary &gt; 100000</code> is read as…', options: ["<code>dept = 'Sales' OR (dept = 'HR' AND salary &gt; 100000)</code>", "<code>(dept = 'Sales' OR dept = 'HR') AND salary &gt; 100000</code>", 'A syntax error', 'Left to right with no precedence'], answer: 0, explain: 'AND binds tighter than OR.' },
    { q: '<code>price BETWEEN 100 AND 200</code> includes…', options: ['Both 100 and 200', 'Neither 100 nor 200', 'Only 100', 'Only 200'], answer: 0, explain: 'BETWEEN is inclusive on both ends: >= 100 AND <= 200.' },
    { q: 'Which LIKE pattern matches names whose <b>second</b> letter is "a"?', options: ["<code>'_a%'</code>", "<code>'%a_'</code>", "<code>'a%'</code>", "<code>'%_a'</code>"], answer: 0, explain: '_ matches exactly one character (the first), then a, then anything.' },
    { q: 'The subquery for <code>x NOT IN (SELECT y FROM t)</code> returns 1, 2 and NULL. For x = 5 the condition is…', options: ['UNKNOWN, so the row is dropped', 'TRUE', 'FALSE', 'An error'], answer: 0, explain: '5 <> NULL is UNKNOWN, which makes the whole AND-chain UNKNOWN.' },
    { q: 'In SQLite, with <code>ORDER BY rating DESC</code>, NULL ratings appear…', options: ['Last', 'First', 'Randomly', 'Not at all'], answer: 0, explain: 'SQLite treats NULL as the smallest value: first in ASC, last in DESC. PostgreSQL is the opposite.' },
    { q: '<code>SELECT DISTINCT dept, title FROM employees</code> removes rows that are equal in…', options: ['Both dept and title together', 'dept only', 'title only', 'The first column only'], answer: 0, explain: 'DISTINCT compares the whole output row.' },
    { q: 'In SQLite/MySQL, <code>LIMIT 10, 5</code> means…', options: ['Skip 10 rows, return 5', 'Skip 5 rows, return 10', 'Return rows 5 to 10', 'Return 10 rows then 5 more'], answer: 0, explain: 'In the comma form the offset comes first: LIMIT offset, count.' },
    { q: 'Why can you use a SELECT alias in ORDER BY but (in standard SQL) not in WHERE?', options: ['ORDER BY runs after SELECT; WHERE runs before it', 'WHERE does not support names', 'Aliases are only for display', 'ORDER BY ignores aliases anyway'], answer: 0, explain: 'The alias is created in the SELECT step; only later steps can see it.' },
    { q: 'In SQLite, <code>SELECT 7 / 2</code> returns…', options: ['3', '3.5', '4', 'An error'], answer: 0, explain: 'Integer divided by integer truncates. Use 7 / 2.0 for 3.5.' },
    { q: 'Which query reliably returns the employee(s) with no department?', options: ['<code>WHERE dept IS NULL</code>', "<code>WHERE dept = ''</code>", '<code>WHERE dept = NULL</code>', "<code>WHERE dept &lt;&gt; 'Sales' AND dept &lt;&gt; 'HR'</code>"], answer: 0, explain: 'Only IS NULL tests for the missing marker; the others are UNKNOWN or test an empty string.' },
    { q: 'Why is <code>LIMIT 20 OFFSET 1000000</code> slow on a big table?', options: ['The engine must produce and discard the first million rows', 'OFFSET disables indexes completely', 'LIMIT forces a full table lock', 'It is not slow; OFFSET is O(1)'], answer: 0, explain: 'Rows have no stored position; skipping k rows costs O(k). Keyset pagination avoids that.' }
  );

  /* =====================================================================
     INTERVIEW Q&A
     ===================================================================== */
  interview.push(
    { q: 'Explain the logical query processing order of a SELECT statement.', level: 'B', a: `<p>Logically: <b>FROM</b> (and JOINs) → <b>WHERE</b> → <b>GROUP BY</b> → <b>HAVING</b> → <b>SELECT</b> (expressions, aliases, window functions) → <b>DISTINCT</b> → <b>ORDER BY</b> → <b>LIMIT/OFFSET</b>. Each step consumes the table produced by the previous one. This explains why aliases are unavailable in WHERE, why aggregates need HAVING, why ORDER BY can use aliases and why LIMIT without ORDER BY is arbitrary. It is the <i>logical</i> definition; the optimizer may execute a different physical plan (index order, predicate pushdown, early termination) as long as the result is identical.</p>`, followUps: ['Where do window functions fit and what does that imply for filtering on them?', 'Give an example where the physical plan differs from the logical order.'] },
    { q: 'What is NULL, and why does <code>WHERE col = NULL</code> never return rows?', level: 'B', a: `<p>NULL is a marker for a <b>missing or unknown</b> value — not zero and not an empty string. Any comparison with NULL (<code>=</code>, <code>&lt;&gt;</code>, <code>&lt;</code>…) yields <b>UNKNOWN</b>, the third truth value. WHERE keeps only rows whose condition is TRUE, so UNKNOWN rows are dropped. <code>col = NULL</code> is UNKNOWN for every row → empty result. Use <code>IS NULL</code> / <code>IS NOT NULL</code>, or a null-safe comparison (<code>IS DISTINCT FROM</code>, SQLite <code>IS</code>, MySQL <code>&lt;=&gt;</code>).</p>`, followUps: ['How does DISTINCT treat NULLs?', 'How does a UNIQUE constraint treat multiple NULLs?'] },
    { q: 'Walk me through three-valued logic for AND, OR and NOT.', level: 'B', a: `<p>Values: TRUE, FALSE, UNKNOWN. <b>AND</b>: FALSE if either side is FALSE; else UNKNOWN if either is UNKNOWN; else TRUE. <b>OR</b>: TRUE if either side is TRUE; else UNKNOWN if either is UNKNOWN; else FALSE. <b>NOT</b>: swaps TRUE/FALSE, keeps UNKNOWN. A quick rule: substitute TRUE and FALSE for the unknown — if both give the same answer, that is the result, otherwise UNKNOWN. Consequence: <code>WHERE x = 5 OR x &lt;&gt; 5</code> does not return rows where x is NULL (no law of excluded middle).</p>`, followUps: ['Do De Morgan\'s laws still hold?', 'How do CHECK constraints treat UNKNOWN?'] },
    { q: 'Why is <code>NOT IN</code> with a subquery dangerous, and what do you use instead?', level: 'I', a: `<p><code>x NOT IN (a, b, NULL)</code> expands to <code>x &lt;&gt; a AND x &lt;&gt; b AND x &lt;&gt; NULL</code>. The last term is always UNKNOWN, so the predicate can never be TRUE and the query returns <b>no rows</b> — silently. Any subquery over a nullable column can introduce a NULL. Fixes: add <code>WHERE col IS NOT NULL</code> inside the subquery, or (preferred) use <code>NOT EXISTS</code>, which checks for a matching row and is immune to NULLs. NOT EXISTS also maps cleanly to an anti-join; many optimizers cannot turn NOT IN into an anti-join unless the columns are declared NOT NULL.</p>`, followUps: ['Does IN (positive) have the same problem?', 'How would you rewrite with a LEFT JOIN … IS NULL?'] },
    { q: 'What is the difference between WHERE and SELECT in terms of what they filter?', level: 'B', a: `<p>WHERE filters <b>rows</b>: it decides which rows survive, evaluating a condition per row and keeping only TRUE. SELECT chooses and computes <b>columns</b> for the surviving rows (projection). WHERE can reference any column of the source, even columns not in the select list, because it runs earlier; SELECT can create new computed columns and aliases. Neither changes the stored data. A common confusion is thinking that leaving a column out of SELECT prevents filtering on it — it does not.</p>`, followUps: ['Can SELECT reduce the number of rows?', 'Where does DISTINCT fit?'] },
    { q: 'How do you get the N-th highest salary? What edge cases matter?', level: 'I', a: `<p><code>SELECT (SELECT DISTINCT salary FROM employees WHERE salary IS NOT NULL ORDER BY salary DESC LIMIT 1 OFFSET N-1) AS nth;</code>. Edge cases: <b>duplicates</b> (DISTINCT so tied values occupy one position), <b>missing value</b> (scalar subquery returns NULL instead of an empty set, which graders like LeetCode 176/177 expect), <b>NULL salaries</b> (filter them; in PostgreSQL DESC would put NULL first), and <b>dialects</b> (TOP/OFFSET FETCH in SQL Server). Alternatives: <code>DENSE_RANK()</code> window function, or <code>MAX(salary) WHERE salary &lt; (SELECT MAX…)</code> for N = 2.</p>`, followUps: ['Return all employees earning the N-th highest salary.', 'Which approach is fastest with an index on salary?'] },
    { q: 'Compare OFFSET pagination with keyset (seek) pagination.', level: 'A', a: `<p><b>OFFSET</b>: <code>ORDER BY k LIMIT n OFFSET m</code>. Simple, supports jumping to any page, but costs O(m + n) because skipped rows must still be produced, and under concurrent inserts/deletes rows shift so users see duplicates or miss rows. <b>Keyset</b>: remember the last row's sort key and query <code>WHERE (k, id) &lt; (:k, :id) ORDER BY k DESC, id DESC LIMIT n</code>. With an index on (k, id) each page is an O(log N) seek, latency is flat at any depth, and results are stable under writes. Downsides: no random page access, the sort key must be unique (add id), mixed sort directions need an expanded OR predicate, and NULLable keys need care. APIs expose it as an opaque cursor.</p>`, followUps: ['How would you implement "previous page" with keyset?', 'How do you show a total count cheaply?'] },
    { q: 'Why might the same query return rows in a different order on different days?', level: 'I', a: `<p>Without an ORDER BY, SQL guarantees <b>no</b> order — a table is a set. The order you observe is a side effect of the physical plan: heap layout, which index is chosen, parallel workers, hash operations, vacuum/compaction, buffer cache state, or a version upgrade. Even with ORDER BY, rows that <b>tie</b> on all sort keys can come back in any order. Fix: always ORDER BY when order matters, and make the last sort key unique (e.g., the primary key). An ORDER BY inside a subquery or view is not guaranteed to survive to the outer result.</p>`, followUps: ['How does this break pagination?', 'Is SQL sort stable?'] },
    { q: 'How do NULLs sort, and how do you control it portably?', level: 'I', a: `<p>It depends on the engine: SQLite, MySQL and SQL Server treat NULL as the smallest value (first in ASC, last in DESC); PostgreSQL and Oracle treat it as the largest (last in ASC, first in DESC). The standard <code>NULLS FIRST / NULLS LAST</code> works in PostgreSQL, Oracle and SQLite 3.30+, but not MySQL or SQL Server. A portable trick is to sort by a null indicator first: <code>ORDER BY col IS NULL, col</code> (or <code>CASE WHEN col IS NULL THEN 1 ELSE 0 END</code>) to push NULLs last. Indexes can include NULL ordering (<code>CREATE INDEX … (col DESC NULLS LAST)</code> in PostgreSQL) so the sort can still be avoided.</p>`, followUps: ['What happens to NULLs in a "top 3 by price DESC" query on PostgreSQL?', 'How does GROUP BY handle NULL keys?'] },
    { q: 'What does DISTINCT actually compare, and when is it a code smell?', level: 'I', a: `<p>DISTINCT compares <b>entire output rows</b> — all selected columns together — treating NULLs as equal. <code>SELECT DISTINCT(a), b</code> is still distinct on (a, b). It runs after SELECT and before ORDER BY/LIMIT, implemented by hashing or sorting (cost O(N) to O(N log N) plus memory). It is a smell when used to hide duplicates produced by a join that fans out (1-to-many): the query is wrong at its grain and DISTINCT masks it while burning CPU. Better: fix the join, use <code>EXISTS</code> for "has at least one", or aggregate deliberately with GROUP BY.</p>`, followUps: ['DISTINCT vs GROUP BY — any performance difference?', 'What is PostgreSQL DISTINCT ON?'] },
    { q: 'How is LIKE matched and when can it use an index?', level: 'I', a: `<p>LIKE matches the whole string against a pattern where <code>%</code> = any sequence (including empty) and <code>_</code> = exactly one character; other characters must match literally (case-insensitive for ASCII in SQLite/MySQL default collations, case-sensitive in PostgreSQL). A B-tree index helps only with a <b>constant prefix</b>, e.g. <code>'abc%'</code>, which becomes a range scan <code>&gt;= 'abc' AND &lt; 'abd'</code> — provided collation matches (SQLite NOCASE index / case_sensitive_like; PostgreSQL text_pattern_ops or C collation). A leading wildcard (<code>'%abc'</code>) forces a full scan; use trigram (pg_trgm GIN), full-text (FTS5, tsvector) or a reversed-string column. User input needs escaping of %, _ and the escape character.</p>`, followUps: ['How would you implement "ends with" efficiently?', 'Difference between LIKE and GLOB in SQLite?'] },
    { q: 'What happens with <code>salary + bonus</code> when bonus is NULL, and how do COALESCE and IFNULL help?', level: 'B', a: `<p>Arithmetic and string operations with NULL return NULL (unknown + 100 is still unknown), so total comp becomes NULL and any filter on it becomes UNKNOWN. <code>COALESCE(a, b, …)</code> returns the first non-NULL argument (standard, any number of arguments); <code>IFNULL(a, b)</code> (SQLite/MySQL) and <code>ISNULL(a, b)</code> (SQL Server) are two-argument versions; Oracle has <code>NVL</code>. Use them when "missing" truly means a default (bonus 0). Do not blindly replace NULLs in averages — <code>AVG(COALESCE(x,0))</code> changes the meaning compared with <code>AVG(x)</code>, which ignores NULLs.</p>`, followUps: ['What does NULLIF do and where is it useful?', 'Does COALESCE(col, 0) = 0 use an index?'] },
    { q: 'Why does <code>SELECT name, salary*12 AS annual FROM emp WHERE annual &gt; 100000</code> fail in PostgreSQL but work in SQLite?', level: 'I', a: `<p>By the logical order WHERE is evaluated before SELECT, so the alias <code>annual</code> does not exist yet; PostgreSQL, SQL Server, Oracle and MySQL raise "column does not exist". SQLite, as a convenience, resolves unknown identifiers in WHERE against result-column aliases. Portable fixes: repeat the expression (<code>WHERE salary*12 &gt; 100000</code>) or compute it in a derived table/CTE and filter in the outer query. Optimizers treat both the same, so there is no performance penalty. Relying on dialect leniency is a common source of bugs when prototypes move from SQLite to a production database.</p>`, followUps: ['Can you use the alias in GROUP BY in MySQL? In PostgreSQL?', 'Can a SELECT expression refer to another alias in the same select list?'] },
    { q: 'What is a sargable predicate? Give examples from WHERE clauses.', level: 'A', a: `<p>Sargable (Search ARGument ABLE) means the predicate can be answered by an index seek/range scan: the indexed column appears bare on one side of a comparison with a constant or parameter. Sargable: <code>price &lt; 500</code>, <code>name LIKE 'Ab%'</code>, <code>created_at &gt;= '2024-08-01' AND created_at &lt; '2024-09-01'</code>, <code>col IN (1,2,3)</code>, <code>col IS NULL</code>. Not sargable: <code>LOWER(name) = 'x'</code>, <code>price * 1.18 &lt; 500</code>, <code>SUBSTR(code,1,2) = 'IN'</code>, <code>name LIKE '%x'</code>, <code>COALESCE(col,0) = 0</code>, <code>DATE(created_at) = '2024-08-01'</code>. Rewrite by moving the arithmetic to the constant side, using ranges instead of functions, or creating an expression index (<code>CREATE INDEX … ON t(LOWER(name))</code>).</p>`, followUps: ['How would you check whether an index is used in SQLite?', 'Is an OR across two different columns sargable?'] },
    { q: 'How would you design the SQL behind a product search box with filters, sorting and pagination?', level: 'E', a: `<p>Build the query from parameterised pieces only (never string-concatenate user text). Filters: equality/IN for facets (category, brand), BETWEEN/half-open ranges for price and dates, an escaped LIKE or — at scale — a full-text/trigram/vector index for the text box. Explicitly handle NULL semantics per filter (does "not brand X" include unbranded items?). Sorting: whitelist allowed sort columns and directions, always append the primary key as a tie-breaker, and define NULL placement. Pagination: keyset cursors encoding (sort key, id) for infinite scroll; OFFSET only for small admin pages. Indexes: composite indexes matching the most common (filter, sort) combinations so the engine can seek and stream without sorting; avoid functions on indexed columns. Return a total count asynchronously or approximately, because <code>COUNT(*)</code> over a large filtered set can cost more than the page. Monitor with EXPLAIN and slow-query logs.</p>`, followUps: ['How do you prevent SQL injection with a dynamic ORDER BY column?', 'When would you move search out of the OLTP database entirely?'] }
  );

  // Spread correct answers across positions (options were authored with the correct one first)
  function rotate(m, i) {
    if (!m || !m.options) return;
    var n = m.options.length, k = (i * 2 + 1) % n;
    if (!k) return;
    m.options = m.options.slice(k).concat(m.options.slice(0, k));
    m.answer = (m.answer - k + n) % n;
  }
  quiz.forEach(function (q, i) { rotate(q, i); });
  practice.forEach(function (p, i) { rotate(p.mcq, i + 1); });
  topics.forEach(function (t, i) { (t.problems || []).forEach(function (p) { if (p.mcq.answer === 0) rotate(p.mcq, i); }); });

  registerModule({
    id: 'sql02',
    title: 'SELECT, WHERE, ORDER BY, LIMIT & NULLs',
    lang: 'sql',
    intro: `<p>This is where you start <b>asking the database questions</b>. You will learn to pick columns and compute new ones (<code>SELECT</code>), keep only the rows you care about (<code>WHERE</code> with comparisons, AND/OR/NOT, <code>IN</code>, <code>BETWEEN</code>, <code>LIKE</code>), sort them (<code>ORDER BY</code>), take the top few or one page at a time (<code>LIMIT/OFFSET</code>) and remove duplicates (<code>DISTINCT</code>).</p>
<p>Two ideas run through the whole module because interviewers test them relentlessly: <b>NULL and three-valued logic</b> (why <code>= NULL</code> never matches and why <code>NOT IN</code> can return nothing), and the <b>logical query processing order</b> FROM → WHERE → SELECT → DISTINCT → ORDER BY → LIMIT (why aliases fail in WHERE and why LIMIT needs ORDER BY). Every visualizer is a tiny query engine: edit the SQL and watch rows get filtered, projected, de-duplicated, sorted and cut — and every ▶ Run button executes against real SQLite sample databases (<code>hr</code>, <code>shop</code>, <code>movies</code>) full of deliberate NULLs and ties.</p>`,
    goals: [
      'Write SELECT queries with explicit columns, computed expressions and aliases, avoiding integer-division and NULL-propagation bugs',
      'Translate English requirements into correct WHERE conditions using comparisons, AND/OR/NOT with parentheses, IN, BETWEEN and anchored/escaped LIKE patterns',
      'Predict the result of any condition involving NULL using three-valued logic, and fix <code>= NULL</code>, <code>&lt;&gt;</code> and <code>NOT IN</code> traps',
      'Produce deterministic sorted output with multi-key ORDER BY and explicit NULL placement, and paginate with LIMIT/OFFSET or keyset cursors',
      'Recite the logical processing order and use it to explain alias scope, DISTINCT vs LIMIT, and "N-th highest" queries in interviews'
    ],
    prereqs: `<p>SQL 1 (Databases &amp; the Relational Model): what tables, rows, columns and primary keys are. No programming background needed — but comfort with basic comparisons (&gt;, &lt;, =) helps.</p>`,
    hours: 9,
    databases: {
      hr: buildDb(['employees']),
      shop: buildDb(['customers', 'products', 'orders']),
      movies: buildDb(['movies'])
    },
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
