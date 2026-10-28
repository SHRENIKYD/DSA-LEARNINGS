(function () {
var topics = [], practice = [], quiz = [], interview = [];

/* ---------- shared visualizer helpers (cs17) ---------- */
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function fr(narr, parts) { return { narr: narr, parts: parts }; }
function txt(html, label) { return { type: 'text', label: label, html: html }; }

// Tokenizer used by several visualizers. Returns [{k:'num'|'id'|'op'|'lp'|'rp'|'kw', v, pos}]
var KW = ['let', 'if', 'else', 'while', 'true', 'false', 'print'];
function lex(src) {
  src = String(src);
  if (src.length > 80) throw new Error('Keep the input under 80 characters');
  var out = [], i = 0;
  while (i < src.length) {
    var c = src[i];
    if (c === ' ' || c === '\t') { i++; continue; }
    if (c >= '0' && c <= '9') {
      var j = i; while (j < src.length && src[j] >= '0' && src[j] <= '9') j++;
      out.push({ k: 'num', v: src.slice(i, j), pos: i }); i = j; continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      var e = i; while (e < src.length && /[A-Za-z0-9_]/.test(src[e])) e++;
      var w = src.slice(i, e);
      out.push({ k: KW.indexOf(w) >= 0 ? 'kw' : 'id', v: w, pos: i }); i = e; continue;
    }
    var two = src.substr(i, 2);
    if (['==', '!=', '<=', '>='].indexOf(two) >= 0) { out.push({ k: 'op', v: two, pos: i }); i += 2; continue; }
    if ('+-*/^<>=;'.indexOf(c) >= 0) { out.push({ k: 'op', v: c, pos: i }); i++; continue; }
    if (c === '(') { out.push({ k: 'lp', v: c, pos: i }); i++; continue; }
    if (c === ')') { out.push({ k: 'rp', v: c, pos: i }); i++; continue; }
    throw new Error('Unexpected character "' + c + '" at position ' + i + '. Use digits, names, + - * / ^ ( )');
  }
  return out;
}

// Recursive-descent parser for arithmetic: expr -> term (+|- term)* ; term -> unary (*|/ unary)* ;
// unary -> '-' unary | power ; power -> primary ('^' unary)? ; primary -> num | id | '(' expr ')'
// trace (optional) receives {fn, at} entries so a visualizer can replay the call stack.
function parseExpr(tokens, trace) {
  var p = 0, stack = [];
  function peek() { return tokens[p]; }
  function enter(fn) { stack.push(fn); if (trace) trace.push({ ev: 'enter', fn: fn, stack: stack.slice(), at: p }); }
  function leave(node) { var fn = stack.pop(); if (trace) trace.push({ ev: 'leave', fn: fn, stack: stack.slice(), at: p, node: node }); return node; }
  function expr() {
    enter('expr'); var n = term();
    while (peek() && peek().k === 'op' && (peek().v === '+' || peek().v === '-')) { var op = tokens[p++].v; n = { t: 'bin', op: op, l: n, r: term() }; }
    return leave(n);
  }
  function term() {
    enter('term'); var n = unary();
    while (peek() && peek().k === 'op' && (peek().v === '*' || peek().v === '/')) { var op = tokens[p++].v; n = { t: 'bin', op: op, l: n, r: unary() }; }
    return leave(n);
  }
  function unary() {
    enter('unary');
    if (peek() && peek().k === 'op' && peek().v === '-') { p++; return leave({ t: 'neg', e: unary() }); }
    return leave(power());
  }
  function power() {
    enter('power'); var b = primary();
    if (peek() && peek().k === 'op' && peek().v === '^') { p++; return leave({ t: 'bin', op: '^', l: b, r: unary() }); }
    return leave(b);
  }
  function primary() {
    enter('primary'); var t = peek();
    if (!t) throw new Error('Expression ended too early - something is missing after the last operator');
    if (t.k === 'num') { p++; return leave({ t: 'num', v: Number(t.v) }); }
    if (t.k === 'id') { p++; return leave({ t: 'var', n: t.v }); }
    if (t.k === 'kw' && (t.v === 'true' || t.v === 'false')) { p++; return leave({ t: 'bool', v: t.v === 'true' }); }
    if (t.k === 'lp') { p++; var e = expr(); if (!peek() || peek().k !== 'rp') throw new Error('Missing ")"'); p++; return leave(e); }
    throw new Error('Unexpected "' + t.v + '" at position ' + t.pos);
  }
  var ast = expr();
  if (p < tokens.length) throw new Error('Unexpected "' + tokens[p].v + '" at position ' + tokens[p].pos + ' (extra input after a full expression)');
  return ast;
}
function show(n) {
  if (n.t === 'num') return String(n.v);
  if (n.t === 'var') return n.n;
  if (n.t === 'bool') return String(n.v);
  if (n.t === 'neg') return '(-' + show(n.e) + ')';
  return '(' + show(n.l) + ' ' + n.op + ' ' + show(n.r) + ')';
}
function depth(n) { return n.t === 'bin' ? 1 + Math.max(depth(n.l), depth(n.r)) : n.t === 'neg' ? 1 + depth(n.e) : 1; }
function treeArr(n) {
  // level-order array for the 'tree' part (null = missing)
  var arr = [];
  (function put(x, i) {
    if (!x) return;
    while (arr.length <= i) arr.push(null);
    arr[i] = x.t === 'num' ? String(x.v) : x.t === 'var' ? x.n : x.t === 'bool' ? String(x.v) : x.t === 'neg' ? 'neg' : x.op;
    if (x.t === 'bin') { put(x.l, 2 * i + 1); put(x.r, 2 * i + 2); }
    if (x.t === 'neg') put(x.e, 2 * i + 1);
  })(n, 0);
  return arr;
}
function astPart(n, label) {
  if (depth(n) <= 4) return { type: 'tree', label: label || 'AST', arr: treeArr(n) };
  return txt('<code>' + esc(show(n)) + '</code>', (label || 'AST') + ' (too deep to draw, shown fully parenthesised)');
}
function applyOp(op, a, b) {
  if (op === '+') return a + b; if (op === '-') return a - b; if (op === '*') return a * b;
  if (op === '/') { if (b === 0) throw new Error('Division by zero in the input'); return Math.trunc(a / b); }
  if (op === '^') return Math.pow(a, b);
  throw new Error('Unknown operator ' + op);
}
/* ================= TOPIC 1: pipeline + lexing ================= */
topics.push({
  title: 'The Compiler Pipeline & Lexical Analysis (Tokens, Maximal Munch, Regular Languages)',
  analogy: `<p>Think of reading a letter in a foreign language. First your eyes group letters into <b>words</b> (lexing). Then you work out the <b>sentence structure</b> - subject, verb, object (parsing). Then you check it <b>makes sense</b> - "the chair ate the soup" is grammatical nonsense (semantic analysis). Only then do you <b>act</b> on it (code generation / execution). A compiler is that reader, done very carefully, one stage at a time.</p>`,
  explain: `<p>Every language implementation - <code>gcc</code>, <code>javac</code>, V8, CPython, the C# Roslyn compiler - is a <b>pipeline</b>. Each stage takes one representation and produces a simpler, more structured one:</p>
${H.table(['Stage', 'Input → output', 'Catches'], [['Lexer (scanner)', 'characters → tokens', 'illegal characters, unterminated strings'], ['Parser', 'tokens → AST (syntax tree)', 'syntax errors: missing ), unexpected token'], ['Semantic analysis', 'AST → annotated AST + symbol tables', 'undeclared variables, type errors'], ['IR generation + optimizer', 'AST → IR (three-address code, SSA, bytecode)', '(nothing - it improves code)'], ['Back end', 'IR → machine code / bytecode', 'register allocation, instruction selection']])}
<p>The <b>front end</b> (lex, parse, check) depends on the source language; the <b>back end</b> depends on the target machine. A shared IR in the middle is why LLVM can compile C, Rust, Swift and Zig to x86 and ARM: M languages × N targets need M + N pieces instead of M × N.</p>
<p><b>Lexing</b> is the first step. The lexer walks the characters left to right and groups them into <b>tokens</b>: a kind plus the text (the <i>lexeme</i>), e.g. <code>count = 42 + x1;</code> → ${H.chips(['ID(count)', 'OP(=)', 'NUM(42)', 'OP(+)', 'ID(x1)', 'SEMI'])} It throws away whitespace and comments and records line/column for error messages.</p>
<p>Two rules decide how text is split: <b>maximal munch</b> (always take the <i>longest</i> token that matches - <code>&gt;=</code> is one token, not <code>&gt;</code> then <code>=</code>; <code>x1</code> is one identifier) and <b>priority</b> (if two rules match the same length, the earlier rule wins - so <code>if</code> is a keyword, not an identifier). Token patterns are <b>regular expressions</b>, and every regex can be turned into a finite automaton (DFA), which is why a lexer runs in O(n) - one step per character.</p>`,
  clues: ['"Write a tokenizer / lexer for a calculator / mini language" → character loop with maximal munch', '"Why is <code>a+++b</code> parsed as <code>a++ + b</code>?" → maximal munch', '"What are the phases of a compiler?" → lex → parse → semantic → IR/optimize → codegen', '"Can a regex match balanced parentheses?" → no: tokens are regular, nesting needs a parser (context-free grammar)', '"Error messages need line numbers" → lexer tracks positions on every token', '"Front end vs back end, why LLVM IR?" → M + N instead of M × N'],
  code: [
    { lang: 'python', run: true, title: 'Hand-written tokenizer with maximal munch (runnable)', code: `KEYWORDS = {"let", "if", "else", "while", "print"}
TWO_CHAR = {"==", "!=", "<=", ">="}
ONE_CHAR = set("+-*/^<>=;(){}")

def tokenize(src):
    tokens, i, line = [], 0, 1
    while i < len(src):
        c = src[i]
        if c == "\\n":                      # track lines for error messages
            line += 1; i += 1; continue
        if c in " \\t":                     # skip whitespace
            i += 1; continue
        if c == "#":                       # comment until end of line
            while i < len(src) and src[i] != "\\n":
                i += 1
            continue
        if c.isdigit():                    # NUMBER: maximal munch over digits
            j = i
            while j < len(src) and src[j].isdigit():
                j += 1
            tokens.append(("NUM", src[i:j], line)); i = j; continue
        if c.isalpha() or c == "_":        # IDENT or KEYWORD (priority: keyword wins)
            j = i
            while j < len(src) and (src[j].isalnum() or src[j] == "_"):
                j += 1
            word = src[i:j]
            tokens.append(("KW" if word in KEYWORDS else "ID", word, line)); i = j; continue
        if src[i:i + 2] in TWO_CHAR:       # longest operator first
            tokens.append(("OP", src[i:i + 2], line)); i += 2; continue
        if c in ONE_CHAR:
            tokens.append(("OP", c, line)); i += 1; continue
        raise SyntaxError(f"line {line}: unexpected character {c!r}")
    tokens.append(("EOF", "", line))
    return tokens

program = """let count = 42 + x1;   # a comment
if count >= 10 { print count; }"""
for t in tokenize(program):
    print(t)

try:
    tokenize("let a = 3 $ 4;")
except SyntaxError as e:
    print("lexer error ->", e)` }
  ],
  codeTitle: ['Tokenizer'],
  viz: [{
    title: 'Lexer: characters become tokens',
    input: 'count >= 42 + x1*(y-7)',
    inputLabel: 'source text (digits, names, + - * / ^ ( ) < > = ; == != <= >=)',
    gen: function (input) {
      var toks = lex(input), f = [], src = String(input);
      if (!toks.length) throw new Error('Type some source text');
      f.push(fr('The lexer starts at character 0 of <code>' + esc(src) + '</code>. It will read left to right, never going back more than one or two characters.', [{ type: 'array', label: 'characters', values: src.split(''), showIdx: true }, { type: 'array', label: 'tokens so far', values: ['(none)'] }]));
      var done = [];
      toks.forEach(function (t, n) {
        var hl = {}; for (var q = t.pos; q < t.pos + t.v.length; q++) hl[q] = 'cur';
        var why = t.k === 'num' ? 'a digit starts a NUMBER; keep eating digits (maximal munch) until a non-digit.'
          : t.k === 'id' ? 'a letter starts a name; keep eating letters/digits/_ so <code>' + esc(t.v) + '</code> is ONE identifier.'
          : t.k === 'kw' ? '<code>' + t.v + '</code> matches both the identifier rule and the keyword rule with the same length - priority says keyword wins.'
          : t.v.length === 2 ? 'two-character operator <code>' + esc(t.v) + '</code>: maximal munch prefers it over <code>' + esc(t.v[0]) + '</code> followed by <code>' + esc(t.v[1]) + '</code>.'
          : 'single-character token <code>' + esc(t.v) + '</code>.';
        done.push(t.k.toUpperCase() + '(' + t.v + ')');
        var th = {}; th[done.length - 1] = 'ok';
        f.push(fr('Token ' + (n + 1) + ' at position ' + t.pos + ': ' + why, [{ type: 'array', label: 'characters', values: src.split(''), showIdx: true, hl: hl }, { type: 'array', label: 'tokens so far', values: done.slice(), hl: th }]));
      });
      f.push(fr('Done: <b>' + toks.length + ' tokens</b> from ' + src.length + ' characters. Spaces vanished. The parser never sees characters again - only this token stream. Each character was looked at a constant number of times, so lexing is <b>O(n)</b>.', [{ type: 'array', label: 'token stream for the parser', values: done.slice(), hl: done.reduce(function (o, _, i) { o[i] = 'sel'; return o; }, {}) }]));
      return f;
    }
  }],
  examples: [
    { title: 'Maximal munch in C: a+++b', html: `<p>The C lexer reads <code>a+++b</code> as <code>a</code>, <code>++</code>, <code>+</code>, <code>b</code> - it takes the longest operator it can at each point, without asking whether the result makes sense. So <code>a+++b</code> means <code>(a++) + b</code>. And <code>a+++++b</code> becomes <code>a ++ ++ + b</code>, which is a <b>compile error</b> even though <code>a++ + ++b</code> would have been valid. The lexer does not look ahead to the grammar.</p>` },
    { title: 'Java generics and >>', html: `<p>In <code>List&lt;List&lt;String&gt;&gt;</code> the two closing brackets look like the shift operator <code>&gt;&gt;</code> to a maximal-munch lexer. Old C++ (before C++11) really required a space: <code>&gt; &gt;</code>. Modern Java and C++ parsers split the token back up when they are inside a template/generic argument list - a small, deliberate break of "the lexer decides alone".</p>` },
    { title: 'Why tokens are regular but programs are not', html: `<p>Identifiers (<code>[A-Za-z_][A-Za-z0-9_]*</code>), numbers and operators are all regular expressions, so a DFA recognises them in one pass. But "every <code>(</code> has a matching <code>)</code>" needs <b>counting without a limit</b>, which a finite automaton cannot do (pumping lemma). That is the boundary between the lexer (regular languages) and the parser (context-free languages, which need a stack).</p>` },
    { title: 'Phases in a real compiler error', html: `${H.table(['Input', 'Phase that complains', 'Message'], [['<code>int x = 3 @ 4;</code>', 'lexer', 'illegal character @'], ['<code>int x = (3 + 4;</code>', 'parser', "expected ')'"], ['<code>int x = y + 4;</code>', 'semantic', 'cannot find symbol y'], ['<code>int x = "hi";</code>', 'type checker', 'incompatible types: String → int']])}<p>Knowing which phase owns an error is a classic interview question.</p>` }
  ],
  deepDive: `<p><b>From regex to DFA.</b> Lexer generators (lex/flex, ANTLR's lexer, re2c) take token regexes, build an NFA with Thompson's construction, convert it to a DFA by the subset construction, and minimise it. The DFA runs with one table lookup per character. Hand-written lexers (Go, Clang, V8, Roslyn) are equivalent but faster and give better errors, which is why production compilers usually hand-write them.</p>
<p><b>Context-sensitive corners.</b> Real lexers are not always pure. JavaScript's <code>/</code> can start a regex literal or mean division - the lexer needs to know whether the previous token was an expression. Python's lexer emits <code>INDENT</code>/<code>DEDENT</code> tokens by keeping a stack of indentation widths. C's lexer runs after the preprocessor, and <code>typedef</code> names make <code>(a)*b</code> ambiguous until the symbol table says whether <code>a</code> is a type ("the lexer hack").</p>
<p><b>Performance reality.</b> Lexing is usually the only phase that touches every byte, so it shows up in profiles of big builds and of JS start-up. V8 scans lazily: it pre-parses function bodies quickly and fully parses them only when they are first called (see the JS module <i>JS Engine Internals: V8, Memory &amp; GC</i>). Unicode identifiers, string escapes and numeric literal formats (<code>1_000</code>, <code>0x1F</code>, <code>1e-9</code>) are where hand-written lexers get their bugs.</p>`,
  aiEra: `<p><b>How AI changes this.</b> LLMs also tokenize - but with <b>BPE subword tokens</b> learned from data, not language rules. That is why a model may "see" <code>&gt;=</code> or a long identifier as strange chunks and why counting characters is hard for it. Knowing the difference between a compiler lexer (exact, rule-based, total) and an LLM tokenizer (statistical, lossless but arbitrary splits) is a good talking point.</p>
<p><b>Use AI as a partner.</b> Ask an assistant to generate tricky lexer test inputs: <code>a+++b</code>, unterminated strings, nested comments, Unicode names, <code>1..2</code> (range or float?). Then run your own tokenizer on them. <b>Where AI goes wrong:</b> it often writes a regex-based tokenizer that silently skips unknown characters, or orders patterns so <code>=</code> matches before <code>==</code>. You must own maximal munch and error reporting.</p>`,
  problems: [{
    title: 'Tokenize a Calculator Expression', level: 'Easy', tags: ['lexer', 'maximal munch'], companies: ['Google', 'JetBrains'],
    statement: `<p>Write <code>tokenize(s)</code> that turns an arithmetic string into a list of tokens: integers, identifiers, the operators <code>+ - * / ( )</code> and the comparison operators <code>&lt; &lt;= == !=</code>. Skip spaces. Raise an error with the position on any other character.</p>`,
    constraints: `<p>|s| ≤ 10<sup>5</sup>. Must be O(n). Multi-digit numbers and multi-letter identifiers are single tokens.</p>`,
    example: `<p><code>"x1 &lt;= 42*(y-7)"</code> → ${H.chips(['ID x1', 'OP &lt;=', 'NUM 42', 'OP *', 'LP', 'ID y', 'OP -', 'NUM 7', 'RP'])} - <code>&lt;=</code> is one token by maximal munch, <code>x1</code> is one identifier.</p>`,
    brute: { why: `<p>Splitting on spaces (<code>s.split()</code>) breaks on <code>42*(y-7)</code> which has no spaces at all, and a pile of <code>str.replace</code> calls to add spaces around operators breaks <code>&lt;=</code> into two tokens. Trying every regex at every position and keeping the longest works but re-scans text many times.</p>` },
    mcq: { q: 'The input is <code>a&lt;=b</code>. After reading <code>&lt;</code>, what must the lexer do?', options: ['Emit &lt; immediately', 'Peek at the next character and emit &lt;= if it is =', 'Ask the parser what it expects'], answer: 1, explain: 'Maximal munch: look one character ahead and take the longest operator that matches.' },
    hints: [`<p>Hint 1: the first character of a token decides its kind: digit → number, letter → identifier, otherwise operator.</p>`, `<p>Hint 2: for numbers and names use an inner loop that keeps advancing while the character still belongs; for operators check the two-character set before the one-character set.</p>`, `<p>Hint 3: keep an index i; every branch must advance i or raise an error, otherwise you loop forever. Record the start index on each token for error messages.</p>`],
    solution: {
      approach: `<p>Single left-to-right pass with an index <code>i</code>. Skip whitespace. If <code>s[i]</code> is a digit, advance <code>j</code> while digits and emit <code>NUM s[i:j]</code>. If it is a letter or underscore, advance while alphanumeric and emit <code>ID</code> (or keyword). Otherwise check <code>s[i:i+2]</code> against the two-character operators first (<code>&lt;= == !=</code>), then the single-character set. Anything else raises <code>SyntaxError("unexpected char at i")</code>. Each character is consumed exactly once, so the run time is O(n), and the tokens carry their start position for later error messages. This is exactly the runnable tokenizer shown in the lesson code.</p>`,
      complexity: `<p>O(n) time, O(n) space for the token list (O(1) extra if you yield tokens lazily as a generator).</p>`,
      followUps: ['How would you add string literals with escape sequences?', 'How would you lex floating-point numbers like 1.5e-3 without confusing 1..2?']
    }
  }]
});
/* ================= TOPIC 2: parsing + AST + evaluation ================= */
topics.push({
  title: 'Parsing: Grammars, Recursive Descent, Precedence & the AST',
  analogy: `<p>Diagramming a sentence in school: "the big dog chased the cat" becomes a tree - a <i>noun phrase</i> and a <i>verb phrase</i>, each with parts. A parser does that for code. Precedence is like the rule "multiply before you add": the tree for <code>1 + 2 * 3</code> puts <code>*</code> <b>lower</b> (deeper) so it is done first, exactly like you would bracket it by hand: <code>1 + (2 * 3)</code>.</p>`,
  explain: `<p>A <b>grammar</b> describes which token sequences are valid programs. It is written as rules (BNF/EBNF):</p>
<pre>expr    → term (('+' | '-') term)*
term    → unary (('*' | '/') unary)*
unary   → '-' unary | power
power   → primary ('^' unary)?        // right-associative
primary → NUMBER | NAME | '(' expr ')'</pre>
<p><b>Recursive descent</b> turns each rule into one function. <code>expr()</code> calls <code>term()</code>, which calls <code>unary()</code>, and so on. Because <code>term</code> is "inside" <code>expr</code>, <code>*</code> binds tighter than <code>+</code> - <b>precedence comes from the nesting of the rules</b>. The <code>while</code> loop in <code>expr</code> builds <code>((1 - 2) - 3)</code>, giving <b>left associativity</b>; the recursive call in <code>power</code> gives <code>2^(3^2)</code>, <b>right associativity</b>.</p>
<p>The output is an <b>AST</b> (abstract syntax tree): only the meaning stays - no parentheses, no semicolons. <code>(1 + 2) * 3</code> and <code>1 + 2 * 3</code> have different trees:</p>
${H.table(['Source', 'AST (prefix)', 'Value'], [['<code>1 + 2 * 3</code>', '(+ 1 (* 2 3))', '7'], ['<code>(1 + 2) * 3</code>', '(* (+ 1 2) 3)', '9'], ['<code>8 - 3 - 2</code>', '(- (- 8 3) 2)', '3 (left assoc)'], ['<code>2 ^ 3 ^ 2</code>', '(^ 2 (^ 3 2))', '512 (right assoc)']])}
<p>Once you have the tree, an <b>evaluator</b> is a tiny recursive function: a number returns itself, a binary node evaluates its two children and applies the operator. This "tree-walking interpreter" is how many scripting languages started (Ruby before YARV, early JavaScript engines).</p>`,
  clues: ['"Implement a basic calculator with + - * / and parentheses" (LeetCode 224/227/772) → recursive descent or two stacks', '"Evaluate an expression with operator precedence" → one grammar rule per precedence level', '"Left recursion", "infinite recursion in my parser" → rewrite <code>E → E + T</code> as a loop', '"Pratt parser", "precedence climbing" → table-driven alternative used by real compilers', '"Shunting-yard", "convert to postfix / RPN" → Dijkstra\'s stack-based alternative', '"LL vs LR parser" → top-down vs bottom-up'],
  code: [
    { lang: 'python', run: true, title: 'Recursive-descent parser + AST evaluator (runnable)', code: `# Grammar (one function per rule; deeper rule = higher precedence):
#   expr    -> term (('+'|'-') term)*
#   term    -> unary (('*'|'/') unary)*
#   unary   -> '-' unary | power
#   power   -> primary ('^' unary)?          right-associative
#   primary -> NUMBER | NAME | '(' expr ')'

def tokenize(s):
    out, i = [], 0
    while i < len(s):
        c = s[i]
        if c.isspace():
            i += 1
        elif c.isdigit():
            j = i
            while j < len(s) and s[j].isdigit():
                j += 1
            out.append(("num", int(s[i:j]))); i = j
        elif c.isalpha():
            j = i
            while j < len(s) and s[j].isalnum():
                j += 1
            out.append(("name", s[i:j])); i = j
        elif c in "+-*/^()":
            out.append(("op", c)); i += 1
        else:
            raise SyntaxError(f"bad char {c!r} at {i}")
    return out

class Parser:
    def __init__(self, tokens):
        self.toks, self.p = tokens, 0
    def peek(self):
        return self.toks[self.p] if self.p < len(self.toks) else ("eof", None)
    def eat(self, v):
        if self.peek()[1] != v:
            raise SyntaxError(f"expected {v!r} but found {self.peek()[1]!r}")
        self.p += 1
    def parse(self):
        node = self.expr()
        if self.p != len(self.toks):
            raise SyntaxError(f"unexpected {self.peek()[1]!r}")
        return node
    def expr(self):
        node = self.term()
        while self.peek()[1] in ("+", "-"):          # loop = left associativity
            op = self.peek()[1]; self.p += 1
            node = (op, node, self.term())
        return node
    def term(self):
        node = self.unary()
        while self.peek()[1] in ("*", "/"):
            op = self.peek()[1]; self.p += 1
            node = (op, node, self.unary())
        return node
    def unary(self):
        if self.peek()[1] == "-":
            self.p += 1
            return ("neg", self.unary())
        return self.power()
    def power(self):
        base = self.primary()
        if self.peek()[1] == "^":                      # recursion = right associativity
            self.p += 1
            return ("^", base, self.unary())
        return base
    def primary(self):
        kind, val = self.peek()
        if kind in ("num", "name"):
            self.p += 1
            return (kind, val)
        if val == "(":
            self.eat("(")
            node = self.expr()
            self.eat(")")
            return node
        raise SyntaxError(f"unexpected {val!r}")

def evaluate(node, env):
    tag = node[0]
    if tag == "num":
        return node[1]
    if tag == "name":
        if node[1] not in env:
            raise NameError(f"undefined variable {node[1]}")
        return env[node[1]]
    if tag == "neg":
        return -evaluate(node[1], env)
    a, b = evaluate(node[1], env), evaluate(node[2], env)
    if tag == "+": return a + b
    if tag == "-": return a - b
    if tag == "*": return a * b
    if tag == "/": return a // b
    if tag == "^": return a ** b

for src in ["1 + 2 * 3", "(1 + 2) * 3", "8 - 3 - 2", "2 ^ 3 ^ 2", "-x * (y + 4)"]:
    ast = Parser(tokenize(src)).parse()
    print(f"{src:14} AST={ast}  value={evaluate(ast, {'x': 5, 'y': 1})}")

for bad in ["(1 + 2", "1 + * 2"]:
    try:
        Parser(tokenize(bad)).parse()
    except SyntaxError as e:
        print(f"{bad!r:10} -> SyntaxError: {e}")` }
  ],
  codeTitle: ['Parser + evaluator'],
  viz: [{
    title: 'Recursive descent: watch the call stack build the AST',
    input: '1 + 2 * (3 - x)',
    inputLabel: 'arithmetic expression (numbers, names, + - * / ^ ( ))',
    gen: function (input) {
      var toks = lex(input), trace = [];
      if (!toks.length) throw new Error('Type an expression such as 1 + 2 * 3');
      var ast = parseExpr(toks, trace), f = [];
      var vals = toks.map(function (t) { return t.v; });
      f.push(fr('Tokens are ready. The parser starts by calling <code>expr()</code> - the rule with the <b>lowest</b> precedence. Lower-precedence rules call higher ones, so the higher-precedence operators end up deeper in the tree.', [{ type: 'array', label: 'tokens', values: vals, ptr: { 0: 'p' } }, { type: 'stack', label: 'call stack', items: ['(empty)'] }]));
      var shown = 0;
      for (var i = 0; i < trace.length && shown < 40; i++) {
        var e = trace[i];
        var interesting = e.ev === 'leave' ? (e.node.t === 'bin' || e.node.t === 'neg' || e.fn === 'primary') : (e.fn === 'expr' || e.fn === 'primary');
        if (!interesting) continue;
        shown++;
        var ptr = {}; if (e.at < vals.length) ptr[e.at] = 'p';
        var narr;
        if (e.ev === 'enter') narr = 'Call <code>' + e.fn + '()</code> with the cursor at token ' + (e.at < vals.length ? '<code>' + esc(vals[e.at]) + '</code>' : 'END') + (e.fn === 'expr' && e.stack.length > 1 ? ' - a <b>parenthesis</b> restarts at the lowest precedence level.' : '.');
        else if (e.fn === 'primary') narr = '<code>primary()</code> consumed <code>' + esc(show(e.node)) + '</code> and returns a leaf node.';
        else narr = '<code>' + e.fn + '()</code> returns the subtree <code>' + esc(show(e.node)) + '</code>' + (e.node.t === 'bin' && (e.node.op === '*' || e.node.op === '/') ? ' - the multiplication is finished <b>before</b> any enclosing + sees it, which is precedence.' : '.');
        var parts = [{ type: 'array', label: 'tokens', values: vals, ptr: ptr }, { type: 'stack', label: 'call stack (top = current rule)', items: e.stack.length ? e.stack.slice() : ['(empty)'], hl: e.stack.length ? (function () { var h = {}; h[e.stack.length - 1] = 'cur'; return h; })() : {} }];
        if (e.ev === 'leave') parts.push(astPart(e.node, 'subtree just built'));
        f.push(fr(narr, parts));
      }
      f.push(fr('Finished. The full AST is <code>' + esc(show(ast)) + '</code>. No parentheses survive - the tree <i>shape</i> now carries the grouping.', [astPart(ast, 'final AST')]));
      var env = {}, vars = [];
      (function scan(n) { if (n.t === 'var' && vars.indexOf(n.n) < 0) vars.push(n.n); if (n.l) scan(n.l); if (n.r) scan(n.r); if (n.e) scan(n.e); })(ast);
      vars.forEach(function (v, i) { env[v] = i + 2; });
      function ev(n) { if (n.t === 'num') return n.v; if (n.t === 'var') return env[n.n]; if (n.t === 'neg') return -ev(n.e); return applyOp(n.op, ev(n.l), ev(n.r)); }
      var envKv = {}; vars.forEach(function (v) { envKv[v] = env[v]; });
      envKv.result = ev(ast);
      f.push(fr('Evaluate by walking the tree bottom-up (post-order): children first, then the operator. ' + (vars.length ? 'Variables were given sample values.' : '') + ' Result = <b>' + envKv.result + '</b> (integer division).', [astPart(ast, 'AST'), { type: 'vars', label: 'environment', vals: envKv, hl: { result: 'sel' } }]));
      return f;
    }
  }],
  examples: [
    { title: 'Left recursion kills recursive descent', html: `<p>The textbook rule <code>expr → expr '+' term | term</code> is left-recursive: <code>expr()</code> would call <code>expr()</code> first, with no token consumed - infinite recursion and a stack overflow. Rewrite it as <code>expr → term ('+' term)*</code> and implement the star as a <code>while</code> loop. The loop also produces the correct left-associative tree.</p>` },
    { title: 'Precedence climbing / Pratt parsing', html: `<p>With 15 precedence levels (C has about that many) one function per level is long. A <b>Pratt parser</b> keeps a table <code>{'+': 10, '*': 20, '^': 30}</code> and one loop: parse a prefix, then while the next operator's binding power is higher than the current minimum, consume it and recurse with that power (minus one for right-assoc). V8, Clang, rustc and Roslyn use hand-written recursive descent with Pratt-style expression parsing.</p>` },
    { title: 'Dangling else', html: `<p><code>if a then if b then s1 else s2</code> - does <code>else</code> belong to the inner or outer <code>if</code>? The grammar is <b>ambiguous</b> (two parse trees). Nearly every language picks "nearest if" - recursive descent does this naturally because the inner <code>ifStmt()</code> call greedily takes the <code>else</code>. Python avoids the issue with indentation; Go and Rust require braces.</p>` },
    { title: 'CST vs AST', html: `<p>A <b>concrete syntax tree</b> (parse tree) keeps every token, including parentheses and commas - formatters like Prettier and refactoring tools (Roslyn, IntelliJ PSI) need this to rewrite code without losing comments. An <b>AST</b> keeps only meaning - enough for type checking and code generation. Tools like ESLint use an AST plus token/comment side tables.</p>` }
  ],
  deepDive: `<p><b>LL vs LR.</b> Recursive descent is <b>LL</b> (top-down, Left-to-right, Leftmost derivation): it predicts which rule to use by peeking at k tokens. <b>LR</b> parsers (yacc/bison, LALR(1)) are bottom-up: they shift tokens onto a stack and <i>reduce</i> when the top of the stack matches a rule's right-hand side, which accepts left recursion and a larger class of grammars. Generated LR tables give terrible error messages, which is a big reason GCC moved its C/C++ front end from bison to hand-written recursive descent (2004-2006).</p>
<p><b>Complexity.</b> A predictive (LL(1)) or LR(1) parser is O(n). General context-free parsing (CYK, Earley, GLR) is O(n<sup>3</sup>) worst case - fine for natural language, avoided for programming languages by designing unambiguous grammars. PEG parsers use ordered choice and memoisation (packrat) for linear time at the cost of memory; Python 3.9+ switched CPython to a PEG parser.</p>
<p><b>Error recovery.</b> An IDE must keep parsing after the first error. Common tricks: <b>panic mode</b> (skip tokens until a synchronising token like <code>;</code> or <code>}</code>), inserting missing tokens, and producing "error nodes" in the tree so later phases still run. Incremental parsers (tree-sitter, Roslyn) re-parse only the edited region.</p>`,
  aiEra: `<p><b>How AI changes this.</b> Code assistants generate code as text, and the first thing any tool does with it is parse it - a missing bracket fails the same way it fails for human code. Tools built on <b>tree-sitter</b> and ASTs (codemods, linters, structural search) are how agents make safe edits at scale instead of regex replace. Constrained decoding can even force an LLM's output to follow a grammar, using the same LL/LR machinery you learn here.</p>
<p><b>Use AI as a partner</b> to generate grammar test cases: "give me 20 expressions that test precedence and associativity with their expected values". <b>Where AI goes wrong:</b> it frequently makes <code>^</code> left-associative, mishandles unary minus (<code>-2^2</code> is -4 in maths and Python), or writes a left-recursive rule into a recursive-descent parser. Check by hand.</p>`,
  problems: [{
    title: 'Basic Calculator with Precedence and Parentheses', level: 'Medium', tags: ['recursive descent', 'parsing'], companies: ['Meta', 'Amazon', 'Google'],
    statement: `<p>Implement <code>calculate(s)</code> that evaluates a string with non-negative integers, <code>+ - * /</code> (integer division truncating toward zero), unary minus and parentheses. Respect normal precedence and left associativity. Do not use <code>eval</code>.</p>`,
    constraints: `<p>|s| ≤ 10<sup>4</sup>, nesting depth ≤ 1000, intermediate values fit in 32-bit ints.</p>`,
    example: `<p><code>"2*(3+4)-10/3"</code> → 2*7 - 3 = ${H.c('g', '11')}. <code>"8-3-2"</code> → ${H.c('g', '3')} (not 7: subtraction is left-associative).</p>`,
    brute: { why: `<p>Repeatedly find the innermost parentheses, evaluate the flat expression inside with two passes (first * and /, then + and -), splice the result back as a string, and repeat. It works but re-scans and re-builds the string for every pair of parentheses: O(n<sup>2</sup>) and fiddly with negative numbers.</p>` },
    mcq: { q: 'Which grammar structure makes * bind tighter than +?', options: ['Checking * before + in one big if-chain', 'term (handling *) is called from inside expr (handling +)', 'Evaluating the string right to left'], answer: 1, explain: 'Precedence = nesting depth of the grammar rules. The inner rule finishes its operators before control returns to the outer one.' },
    hints: [`<p>Hint 1: write the grammar first: expr → term (± term)*, term → factor (*/ factor)*, factor → number | '(' expr ')' | '-' factor.</p>`, `<p>Hint 2: one function per rule, a shared index into the token list, and while-loops (not recursion) for the repetition so associativity stays left.</p>`, `<p>Hint 3: careful with truncating division for negatives (use int(a / b) style, not floor), and with deep nesting - an explicit stack version avoids recursion limits.</p>`],
    solution: {
      approach: `<p>Tokenize, then recursive descent. <code>expr()</code> parses a <code>term()</code> and loops while the next token is + or -, folding into an accumulator (left associative). <code>term()</code> does the same with * and / over <code>factor()</code>. <code>factor()</code> handles a number, a unary minus (recursive call to <code>factor</code>), or <code>'('</code> expr <code>')'</code>. You can evaluate directly while parsing (no AST needed) or build the AST and evaluate it afterwards - the latter is better when the interviewer follows up with "now add variables / compile it". Each token is consumed once: O(n). For depth 10<sup>4</sup>+ convert to the two-stack shunting-yard algorithm to avoid recursion limits.</p>`,
      complexity: `<p>O(n) time, O(depth) recursion stack (O(n) worst case).</p>`,
      followUps: ['Add the ^ operator (right associative).', 'Return a helpful error with a column number for "2*(3+".', 'How does a Pratt parser shorten this?']
    }
  }]
});
/* ================= TOPIC 3: semantic analysis + type checking ================= */
topics.push({
  title: 'Semantic Analysis: Scopes, Symbol Tables & Type Checking',
  analogy: `<p>A grammar checker tells you "Colorless green ideas sleep furiously" is a fine English sentence. A proof-reader who knows the <b>meaning</b> of words tells you it is nonsense. The parser is the grammar checker; semantic analysis is the proof-reader. It keeps a <b>phone book</b> (the symbol table) of every name in each room (scope) and checks that every name you use is in the book and is used the right way.</p>`,
  explain: `<p>After parsing, the AST is syntactically valid but may still be wrong: <code>y + 1</code> where <code>y</code> was never declared, <code>"hi" * true</code>, calling <code>f(1, 2)</code> when <code>f</code> takes one argument. <b>Semantic analysis</b> walks the AST and checks the rules that a grammar cannot express.</p>
<p><b>1. Name resolution with a symbol table.</b> A symbol table maps a name to what it means (variable, function, type) and its declared type. Scopes nest, so the table is a <b>stack of hash maps</b>: entering a block pushes a map, leaving pops it, and lookup searches from the innermost map outward. That is <b>lexical (static) scoping</b> - which declaration a name refers to is decided by where it appears in the source, not by who calls whom at run time.</p>
${H.table(['Event', 'Scope stack', 'Effect'], [['<code>let x: int</code> (global)', '[{x:int}]', 'declare'], ['enter function body', '[{x:int}, {}]', 'push'], ['<code>let x: bool</code>', '[{x:int}, {x:bool}]', 'shadows outer x'], ['use <code>x</code>', 'search top → bool', 'resolved to inner x'], ['leave body', '[{x:int}]', 'pop']])}
<p><b>2. Type checking.</b> Each expression gets a type computed bottom-up from its children using <b>typing rules</b>: <code>int + int → int</code>, <code>int &lt; int → bool</code>, <code>if</code> needs a <code>bool</code> condition. If no rule applies you get a type error. <b>Static</b> typing (Java, C#, Go, Rust, TypeScript) does this at compile time; <b>dynamic</b> typing (Python, JavaScript, Ruby) attaches the type to the run-time value and checks when the operation runs. <b>Strong vs weak</b> is a different axis: whether the language silently converts (<code>"5" * 2 → 10</code> in JS) or refuses (<code>TypeError</code> in Python).</p>
<p><b>3. Type inference</b> fills in types you did not write: <code>var x = 42;</code> (Java/C#) or <code>let xs = vec![]</code> (Rust). Local inference flows types forward from initialisers; Hindley-Milner (ML, Haskell, much of Rust) solves equations by <b>unification</b> across a whole function.</p>`,
  clues: ['"Implement variable scoping / a symbol table" → stack of hash maps, search innermost first', '"Static vs dynamic typing", "strong vs weak typing" → when the check happens vs whether implicit conversions are allowed', '"Lexical vs dynamic scope", closures capturing variables → resolved by source position', '"Why does Java reject <code>int x = &quot;a&quot;</code> but Python accepts it?" → static type checking', '"How does <code>var</code> / <code>auto</code> / type inference work?" → infer from initialiser; HM uses unification', '"Covariance, generics, erasure" → type system design questions'],
  code: [
    { lang: 'python', run: true, title: 'Scoped symbol table + type checker for a mini language (runnable)', code: `# AST nodes are tuples. Statements:
#   ("let", name, type_or_None, expr)   ("block", [stmts])   ("print", expr)
# Expressions:
#   ("int", 5) ("bool", True) ("var", "x") ("bin", op, left, right)

ARITH = {"+", "-", "*", "/"}
COMPARE = {"<", "<=", "==", "!="}

class Scopes:
    def __init__(self):
        self.stack = [{}]
    def push(self):
        self.stack.append({})
    def pop(self):
        self.stack.pop()
    def declare(self, name, typ):
        if name in self.stack[-1]:
            raise TypeError(f"'{name}' already declared in this scope")
        self.stack[-1][name] = typ
    def lookup(self, name):
        for scope in reversed(self.stack):        # innermost first
            if name in scope:
                return scope[name]
        raise NameError(f"undeclared variable '{name}'")

def type_of(e, sc):
    tag = e[0]
    if tag == "int":
        return "int"
    if tag == "bool":
        return "bool"
    if tag == "var":
        return sc.lookup(e[1])
    _, op, l, r = e
    lt, rt = type_of(l, sc), type_of(r, sc)
    if op in ARITH:
        if lt == rt == "int":
            return "int"
        raise TypeError(f"operator {op} needs int, int but got {lt}, {rt}")
    if op in COMPARE:
        if lt != rt:
            raise TypeError(f"cannot compare {lt} with {rt}")
        return "bool"
    raise TypeError(f"unknown operator {op}")

def check(stmts, sc=None):
    sc = sc or Scopes()
    for s in stmts:
        if s[0] == "let":
            _, name, declared, expr = s
            t = type_of(expr, sc)                  # infer from the initialiser
            if declared and declared != t:
                raise TypeError(f"'{name}' declared {declared} but initialised with {t}")
            sc.declare(name, declared or t)
        elif s[0] == "block":
            sc.push()
            try:
                check(s[1], sc)
            finally:
                sc.pop()
        elif s[0] == "print":
            type_of(s[1], sc)
    return "ok"

good = [
    ("let", "x", None, ("int", 1)),
    ("block", [
        ("let", "x", "bool", ("bin", "<", ("var", "x"), ("int", 10))),   # shadows outer x
        ("print", ("var", "x")),
    ]),
    ("let", "y", None, ("bin", "*", ("var", "x"), ("int", 3))),        # outer x is int again
]
print("good program:", check(good))

bad_programs = {
    "undeclared": [("print", ("var", "z"))],
    "int + bool": [("let", "a", None, ("bin", "+", ("int", 1), ("bool", True)))],
    "redeclare":  [("let", "a", None, ("int", 1)), ("let", "a", None, ("int", 2))],
    "scope ended": [("block", [("let", "t", None, ("int", 1))]), ("print", ("var", "t"))],
}
for name, prog in bad_programs.items():
    try:
        check(prog)
    except (TypeError, NameError) as e:
        print(f"{name:12} -> {type(e).__name__}: {e}")` }
  ],
  codeTitle: ['Type checker'],
  viz: [{
    title: 'Type checking statement by statement with a scope stack',
    input: 'let x = 2 * 3; { let x = true; x }; let y = x + 1; let z = y + false',
    inputLabel: 'statements separated by ";" - "let NAME = expr", a bare expr, or "{ ... }" for a block (one level)',
    gen: function (input) {
      var raw = String(input);
      if (raw.length > 120) throw new Error('Keep the program under 120 characters');
      // split on ';' and braces into a flat list of events
      var evs = [], cur = '', i;
      for (i = 0; i < raw.length; i++) {
        var c = raw[i];
        if (c === '{' || c === '}' || c === ';') { if (cur.trim()) evs.push({ k: 'stmt', s: cur.trim() }); cur = ''; if (c !== ';') evs.push({ k: c }); }
        else cur += c;
      }
      if (cur.trim()) evs.push({ k: 'stmt', s: cur.trim() });
      if (!evs.length) throw new Error('Type at least one statement, e.g. let x = 1');
      var scopes = [{}], f = [], depthNow = 0;
      function scopeParts(hlName) {
        return scopes.map(function (sc, d) {
          var hl = {}; if (hlName && sc[hlName] && d === scopes.length - 1) hl[hlName] = 'ok';
          return { type: 'map', label: d === 0 ? 'global scope' : 'block scope (depth ' + d + ')', entries: Object.keys(sc).map(function (k) { return [k, sc[k]]; }), hl: hl };
        });
      }
      function lookup(n) { for (var d = scopes.length - 1; d >= 0; d--) if (scopes[d][n]) return { t: scopes[d][n], d: d }; return null; }
      function typeOf(n, log) {
        if (n.t === 'num') return 'int';
        if (n.t === 'bool') return 'bool';
        if (n.t === 'var') { var r = lookup(n.n); if (!r) throw { msg: 'undeclared variable <code>' + esc(n.n) + '</code>' }; log.push(n.n + ' → ' + r.t + ' (scope depth ' + r.d + ')'); return r.t; }
        if (n.t === 'neg') { var t = typeOf(n.e, log); if (t !== 'int') throw { msg: 'unary minus needs int, got ' + t }; return 'int'; }
        var a = typeOf(n.l, log), b = typeOf(n.r, log);
        if (a !== 'int' || b !== 'int') throw { msg: 'operator <code>' + esc(n.op) + '</code> needs int, int but got <b>' + a + ', ' + b + '</b>' };
        log.push(a + ' ' + n.op + ' ' + b + ' → int');
        return 'int';
      }
      f.push(fr('Start with one empty <b>global scope</b>. The checker walks the statements in order, like the compiler does after parsing.', scopeParts()));
      var errors = 0;
      evs.forEach(function (e) {
        if (e.k === '{') { scopes.push({}); depthNow++; f.push(fr('<code>{</code> - entering a block <b>pushes</b> a new, empty scope. Names declared here will hide (shadow) outer names with the same spelling.', scopeParts())); return; }
        if (e.k === '}') { if (scopes.length === 1) throw new Error('Unmatched }'); var gone = Object.keys(scopes.pop()); f.push(fr('<code>}</code> - leaving the block <b>pops</b> its scope' + (gone.length ? ': <code>' + esc(gone.join(', ')) + '</code> no longer exist' : '') + '. Outer names become visible again.', scopeParts())); return; }
        var m = /^let\s+([A-Za-z_]\w*)\s*=\s*(.+)$/.exec(e.s), name = m ? m[1] : null, exprSrc = m ? m[2] : e.s;
        var ast = parseExpr(lex(exprSrc)), log = [];
        try {
          var t = typeOf(ast, log);
          if (name) {
            if (scopes[scopes.length - 1][name]) throw { msg: '<code>' + esc(name) + '</code> is already declared in this scope' };
            scopes[scopes.length - 1][name] = t;
            f.push(fr('<code>' + esc(e.s) + '</code>: infer the type of the right side bottom-up (' + esc(log.join('; ') || 'literal') + ') = <b>' + t + '</b>, then <b>declare</b> <code>' + esc(name) + ': ' + t + '</code> in the current scope.', scopeParts(name).concat([astPart(ast, 'initialiser AST')])));
          } else {
            f.push(fr('<code>' + esc(e.s) + '</code> is an expression statement. Resolving names: ' + esc(log.join('; ') || 'none') + '. Its type is <b>' + t + '</b> - fine.', scopeParts().concat([astPart(ast, 'expression AST')])));
          }
        } catch (err) {
          if (!err.msg) throw err;
          errors++;
          f.push(fr('<span class="c-r"><b>Type error</b></span> in <code>' + esc(e.s) + '</code>: ' + err.msg + '. A static compiler rejects the program here, before it ever runs.', scopeParts().concat([astPart(ast, 'offending AST')])));
        }
      });
      f.push(fr(errors ? '<b>' + errors + ' error(s)</b> found at compile time. In Python or JavaScript these would only surface when that line actually executes (or, in JS, might silently coerce).' : 'Program is well-typed: every name resolved and every operator got the types it needs.', scopeParts()));
      return f;
    }
  }],
  examples: [
    { title: 'Same code, three languages', html: `${H.table(['Code', 'Java (static, strong)', 'Python (dynamic, strong)', 'JavaScript (dynamic, weak)'], [['<code>"5" * 2</code>', 'compile error', '<code>"55"</code> (str * int is defined: repetition)', '<code>10</code> (coerces)'], ['<code>"5" + 2</code>', '<code>"52"</code> (string concat rule)', 'TypeError at run time', '<code>"52"</code>'], ['<code>undefinedVar</code>', 'cannot find symbol', 'NameError when reached', 'ReferenceError when reached']])}<p>Static/dynamic is about <b>when</b>; strong/weak is about <b>implicit conversions</b>. Python's <code>"5" * 2</code> is not a coercion - <code>str * int</code> is a defined operation.</p>` },
    { title: 'Closures need lexical scope', html: `<p><code>function counter() { let n = 0; return () =&gt; ++n; }</code> - the inner function uses <code>n</code> from the scope where it was <b>written</b>. Name resolution links the use to that declaration at compile time; the runtime then keeps that variable alive in a heap-allocated environment (a "closure cell") after <code>counter</code> returns. Dynamic scoping (old Lisps, bash <code>local</code>) would instead look up <code>n</code> in whoever called the function.</p>` },
    { title: 'Type erasure in Java generics', html: `<p>The Java compiler type-checks <code>List&lt;String&gt;</code> fully, then <b>erases</b> it to raw <code>List</code> in bytecode and inserts casts. So at run time you cannot ask <code>xs instanceof List&lt;String&gt;</code>. C# (CLR) keeps <b>reified</b> generics - <code>List&lt;int&gt;</code> is a real distinct type with unboxed storage. That design difference starts in this phase.</p>` },
    { title: 'Unification in one line', html: `<p>Infer <code>fun f(x) = x + 1</code>: give <code>x</code> an unknown type <code>α</code>. The rule for <code>+</code> says both sides are <code>int</code>, so <code>α = int</code>, and <code>f : int → int</code>. For <code>fun id(x) = x</code> no constraint fixes <code>α</code>, so the type is <b>generalised</b> to <code>∀α. α → α</code> - polymorphism for free.</p>` }
  ],
  deepDive: `<p><b>Attributes and passes.</b> The checker decorates AST nodes with <b>attributes</b>: resolved symbol, computed type, constant value, whether an expression is an lvalue. Some languages need several passes - Java and C# let a method call another declared later in the class, so the compiler first collects all declarations, then checks bodies. C requires forward declarations precisely because early C compilers were single-pass.</p>
<p><b>Soundness.</b> A type system is <b>sound</b> if a well-typed program can never hit a type error at run time ("well-typed programs don't go wrong"). Java is mostly sound but array covariance (<code>Object[] a = new String[1]; a[0] = 1;</code>) needs a run-time <code>ArrayStoreException</code> check. TypeScript is <b>intentionally unsound</b> (bivariant method parameters, <code>any</code>, unchecked casts) for ergonomics - types are erased and nothing is checked at run time.</p>
<p><b>Other checks here:</b> definite assignment (Java's "variable might not have been initialized"), reachability ("unreachable statement"), exhaustiveness of <code>switch</code> over sealed types/enums, borrow checking in Rust (a whole extra analysis over the MIR), overload resolution, and constant evaluation of <code>static final</code>/<code>const</code> values. Many of these are <b>data-flow analyses</b> on a control-flow graph rather than pure tree walks.</p>`,
  aiEra: `<p><b>How AI changes this.</b> Type checkers are the cheapest, fastest verifier you can put next to an LLM. Agents that run <code>tsc --noEmit</code>, <code>mypy</code> or <code>cargo check</code> after each edit catch a large share of hallucinated APIs and wrong argument types in seconds. Statically typed code also gives the model better context (signatures are documentation), which is one reason TypeScript and typed Python became the default in AI-heavy codebases.</p>
<p><b>Where AI goes wrong:</b> it confuses static vs strong typing, claims TypeScript types are checked at run time, or "fixes" type errors with <code>as any</code>/<code># type: ignore</code>. <b>You must own</b> the scoping rules (shadowing, closures, hoisting in JS) and be able to explain why a checker accepted or rejected a line.</p>`,
  problems: [{
    title: 'Scoped Symbol Table with Shadowing', level: 'Medium', tags: ['symbol table', 'scopes', 'hash map'], companies: ['Microsoft', 'Uber'],
    statement: `<p>Process commands: <code>BEGIN</code> (enter a block), <code>END</code> (leave it), <code>SET name value</code> (declare in the current block), <code>GET name</code> (print the innermost visible value or <code>NOT FOUND</code>). Variables declared in a block vanish at its END and outer variables with the same name become visible again.</p>`,
    constraints: `<p>Up to 10<sup>5</sup> commands. GET must be fast even when blocks are nested 10<sup>4</sup> deep.</p>`,
    example: `<p>SET a 1, BEGIN, SET a 2, GET a → ${H.c('g', '2')}, END, GET a → ${H.c('g', '1')}, GET b → ${H.c('r', 'NOT FOUND')}.</p>`,
    brute: { why: `<p>Stack of hash maps and search from the top: correct and simple, but GET is O(depth) - 10<sup>4</sup> nested blocks × 10<sup>5</sup> lookups = 10<sup>9</sup> steps in the worst case.</p>` },
    mcq: { q: 'Which structure gives O(1) GET and O(1) amortised END?', options: ['One hash map from name to a stack of values, plus a per-block list of names declared', 'A single hash map, overwritten on SET', 'A sorted list of (depth, name)'], answer: 0, explain: 'Each name keeps its own shadow stack; END pops exactly the names its block declared (total work = number of SETs).' },
    hints: [`<p>Hint 1: think of each name separately - its visible value is always the most recent still-open declaration.</p>`, `<p>Hint 2: keep <code>map: name → stack of values</code>, and a stack of blocks, each block remembering which names it declared.</p>`, `<p>Hint 3: on END, for each name in the block, pop that name's value stack (delete the key if empty). Redeclaring in the same block should overwrite, not push twice.</p>`],
    solution: {
      approach: `<p>This is how fast compilers (and LeetCode-style "nested key-value store" problems) implement scopes. Keep <code>values: dict name → list</code> and <code>blocks: list of sets</code> (start with one global block). <b>SET</b>: if the name is already in the current block, replace the top of its list; otherwise push the value and add the name to the current block's set. <b>GET</b>: look at the top of <code>values[name]</code> - O(1). <b>BEGIN</b>: push an empty set. <b>END</b>: pop the set and pop one value from each name it contains, deleting empty lists. Every value is pushed once and popped once, so END is O(1) amortised. Compare with the stack-of-maps version (simpler, O(depth) lookup) and say when each wins: shallow nesting in real programs makes the simple version fine for most compilers.</p>`,
      complexity: `<p>O(1) per SET/GET/BEGIN, O(1) amortised per END; O(total declarations) space.</p>`,
      followUps: ['How would closures capture a variable whose block has ended?', 'How do you report "unused variable" warnings with this structure?']
    }
  }]
});
/* ================= TOPIC 4: IR + optimisation ================= */
function foldTrace(n, steps) {
  if (n.t === 'num' || n.t === 'var' || n.t === 'bool') return n;
  if (n.t === 'neg') {
    var e = foldTrace(n.e, steps);
    if (e.t === 'num') { steps.push({ before: '-' + show(e), after: String(-e.v), why: 'negating a constant' }); return { t: 'num', v: -e.v }; }
    return { t: 'neg', e: e };
  }
  var l = foldTrace(n.l, steps), r = foldTrace(n.r, steps), b = { t: 'bin', op: n.op, l: l, r: r };
  if (l.t === 'num' && r.t === 'num' && !(n.op === '/' && r.v === 0)) {
    var v = applyOp(n.op, l.v, r.v);
    steps.push({ before: show(b), after: String(v), why: 'both operands are constants - compute at compile time', node: b });
    return { t: 'num', v: v };
  }
  if (n.op === '*' && ((r.t === 'num' && r.v === 1) || (l.t === 'num' && l.v === 1))) { var keep = r.t === 'num' && r.v === 1 ? l : r; steps.push({ before: show(b), after: show(keep), why: 'identity: x * 1 = x' }); return keep; }
  if (n.op === '+' && ((r.t === 'num' && r.v === 0) || (l.t === 'num' && l.v === 0))) { var k2 = r.t === 'num' && r.v === 0 ? l : r; steps.push({ before: show(b), after: show(k2), why: 'identity: x + 0 = x' }); return k2; }
  if (n.op === '-' && r.t === 'num' && r.v === 0) { steps.push({ before: show(b), after: show(l), why: 'identity: x - 0 = x' }); return l; }
  if (n.op === '*' && ((r.t === 'num' && r.v === 0) || (l.t === 'num' && l.v === 0))) { steps.push({ before: show(b), after: '0', why: 'x * 0 = 0 (safe for integers and side-effect-free x only)' }); return { t: 'num', v: 0 }; }
  if (n.op === '*' && r.t === 'num' && r.v > 1 && (r.v & (r.v - 1)) === 0) { var sh = Math.round(Math.log(r.v) / Math.LN2); steps.push({ before: show(b), after: '(' + show(l) + ' &lt;&lt; ' + sh + ')', why: 'strength reduction: multiply by 2^' + sh + ' becomes a shift (shown, not applied to keep the tree arithmetic)' }); }
  return b;
}
function tac(n, out) {
  if (n.t === 'num') return String(n.v);
  if (n.t === 'var') return n.n;
  if (n.t === 'bool') return String(n.v);
  if (n.t === 'neg') { var a = tac(n.e, out), tn = 't' + (out.length + 1); out.push(tn + ' = -' + a); return tn; }
  var x = tac(n.l, out), y = tac(n.r, out), t = 't' + (out.length + 1);
  out.push(t + ' = ' + x + ' ' + n.op + ' ' + y);
  return t;
}
topics.push({
  title: 'Intermediate Representations & Optimizations (Three-Address Code, SSA, Constant Folding)',
  analogy: `<p>A recipe written by a chatty grandparent ("take the eggs - you know, the ones from the shop - and crack two, no, three...") is rewritten by a chef into a clean numbered list: "1. crack 3 eggs. 2. whisk." That clean list is the <b>IR</b>. Then the chef optimises: "pre-heat the oven once, not before every tray" and "the 2 + 3 minutes is just 5 minutes". The dish is the same; the work is less.</p>`,
  explain: `<p>Trees are great for checking but awkward for optimising and generating machine code. Compilers lower the AST into an <b>intermediate representation (IR)</b>, usually <b>three-address code</b>: each instruction has at most one operator and names its result.</p>
<pre>a = (x + y) * (x + y) - 4 * 2     becomes     t1 = x + y
                                                t2 = x + y
                                                t3 = t1 * t2
                                                t4 = 4 * 2
                                                a  = t3 - t4</pre>
<p>Instructions are grouped into <b>basic blocks</b> (straight-line code with one entry and one exit) linked into a <b>control-flow graph (CFG)</b>. Most modern compilers (LLVM, GCC's GIMPLE, HotSpot C2, V8 TurboFan/Maglev, .NET RyuJIT, Go) use <b>SSA form</b> - static single assignment: every variable is assigned exactly once (<code>x1 = ...; x2 = x1 + 1</code>), with <b>φ (phi) functions</b> where control flow merges (<code>x3 = φ(x1, x2)</code>). SSA makes "where did this value come from?" trivial, which makes most optimisations simple.</p>
<p>The classic optimisations, all of which must keep the program's observable behaviour:</p>
${H.table(['Optimisation', 'Before', 'After'], [['Constant folding', '<code>t4 = 4 * 2</code>', '<code>t4 = 8</code>'], ['Constant propagation', '<code>n = 8; y = n + 1</code>', '<code>y = 9</code>'], ['Common subexpression elimination', '<code>t1 = x+y; t2 = x+y</code>', '<code>t2</code> reuses <code>t1</code>'], ['Dead code elimination', '<code>z = a * b</code> (z never used)', 'deleted'], ['Strength reduction', '<code>i * 8</code>', '<code>i &lt;&lt; 3</code>'], ['Loop-invariant code motion', '<code>for(...) { k = n * 2; ... }</code>', 'hoist <code>k</code> out of the loop'], ['Inlining', '<code>sq(x)</code> where <code>sq(v)=v*v</code>', '<code>x * x</code> (then more folding)']])}
<p>Optimisations <b>feed each other</b>: inlining exposes constants, folding creates dead branches, dead-code elimination removes them. Compilers therefore run pass pipelines, often several times.</p>`,
  clues: ['"Implement constant folding / simplify an expression tree" → post-order AST rewrite', '"What does -O2 actually do?" → inlining, CSE, LICM, DCE, vectorisation over SSA IR', '"Why is SSA useful?" → one definition per variable makes def-use chains and propagation trivial', '"Why did my benchmark loop take 0 ns?" → dead code elimination removed unused work', '"Is <code>x * 0 → 0</code> always safe?" → not for floats (NaN, -0.0) or if x has side effects', '"Basic blocks, CFG, φ-nodes" → standard IR vocabulary'],
  code: [
    { lang: 'python', run: true, title: 'Constant folding, algebraic simplification and three-address code (runnable)', code: `# AST: ("num", v) | ("var", name) | (op, left, right) for op in + - * /
def fold(n):
    """Post-order: simplify children first, then this node."""
    if n[0] in ("num", "var"):
        return n
    op, l, r = n[0], fold(n[1]), fold(n[2])
    if l[0] == "num" and r[0] == "num":                 # constant folding
        if op == "/" and r[1] == 0:
            return (op, l, r)                            # keep: must fail at run time
        a, b = l[1], r[1]
        return ("num", {"+": a + b, "-": a - b, "*": a * b, "/": int(a / b)}[op])
    # algebraic identities (integers, pure operands)
    if op == "+" and r == ("num", 0): return l
    if op == "+" and l == ("num", 0): return r
    if op == "-" and r == ("num", 0): return l
    if op == "*" and (r == ("num", 1)): return l
    if op == "*" and (l == ("num", 1)): return r
    if op == "*" and ("num", 0) in (l, r): return ("num", 0)
    if op == "-" and l == r and l[0] == "var": return ("num", 0)
    return (op, l, r)

def to_tac(n, code, cse):
    """Emit three-address code; reuse identical (op, a, b) results (local CSE)."""
    if n[0] == "num": return str(n[1])
    if n[0] == "var": return n[1]
    a, b = to_tac(n[1], code, cse), to_tac(n[2], code, cse)
    key = (n[0], a, b)
    if key in cse:                                       # common subexpression
        return cse[key]
    t = f"t{len(code) + 1}"
    code.append(f"{t} = {a} {n[0]} {b}")
    cse[key] = t
    return t

def show(n):
    return str(n[1]) if n[0] in ("num", "var") else f"({show(n[1])} {n[0]} {show(n[2])})"

# a = (x + y) * (x + y) - 4 * 2 + (z * (3 - 3))
expr = ("+", ("-", ("*", ("+", ("var", "x"), ("var", "y")), ("+", ("var", "x"), ("var", "y"))),
              ("*", ("num", 4), ("num", 2))),
       ("*", ("var", "z"), ("-", ("num", 3), ("num", 3))))

print("original :", show(expr))
naive = []; to_tac(expr, naive, {})
print("naive TAC:", len(naive), "instructions")
for line in naive: print("   ", line)

opt = fold(expr)
print("folded   :", show(opt))
better = []; res = to_tac(opt, better, {})
print("optimised TAC:", len(better), "instructions, result in", res)
for line in better: print("   ", line)` }
  ],
  codeTitle: ['Folding + TAC'],
  viz: [{
    title: 'Constant folding bottom-up, then lowering to three-address code',
    input: 'x * (2 + 3) + 4 * 0 + y * 1 - (10 - 2 * 5)',
    inputLabel: 'expression with numbers and variable names',
    gen: function (input) {
      var ast = parseExpr(lex(input)), f = [], steps = [];
      if (!ast) throw new Error('Type an expression');
      var before = []; tac(ast, before);
      f.push(fr('The parser produced this AST. Lowered naively it would be <b>' + before.length + '</b> three-address instructions. The optimiser walks the tree <b>post-order</b> (children before parents) so constants bubble up.', [astPart(ast, 'AST before'), { type: 'array', label: 'naive three-address code', values: before.length ? before : ['(just a leaf)'] }]));
      var folded = foldTrace(ast, steps);
      steps.slice(0, 20).forEach(function (s, i) {
        f.push(fr('Step ' + (i + 1) + ': <code>' + esc(s.before).replace(/&amp;lt;/g, '&lt;') + '</code> → <code>' + s.after.replace(/&lt;&lt;/g, '&lt;&lt;') + '</code> because ' + s.why + '.', [{ type: 'table', label: 'rewrite', columns: ['before', 'after'], rows: [[esc(s.before), s.after]], hl: { 0: 'ok' } }, { type: 'vars', label: 'progress', vals: { rewrites: i + 1, remaining: steps.length - i - 1 } }]));
      });
      if (!steps.length) f.push(fr('Nothing to fold: no operator has two constant operands and no identity (x+0, x*1, x*0) applies.', [astPart(ast, 'AST')]));
      var after = []; var res = tac(folded, after);
      f.push(fr('Folded AST: <code>' + esc(show(folded)) + '</code>. All of this arithmetic now happens <b>once, at compile time</b>, instead of on every execution.', [astPart(folded, 'AST after')]));
      f.push(fr('Lower to three-address code: each instruction has one operator and a fresh temporary. ' + before.length + ' → <b>' + after.length + '</b> instructions; the value ends up in <code>' + esc(res) + '</code>.', [{ type: 'array', label: 'before', values: before.length ? before : ['-'], hl: { } }, { type: 'array', label: 'after optimisation', values: after.length ? after : ['result = ' + res], hl: after.reduce(function (o, _, i) { o[i] = 'ok'; return o; }, {}) }]));
      f.push(fr('Real compilers continue: <b>constant propagation</b> pushes known values into later statements, <b>CSE</b> merges repeated <code>x + y</code>, and <b>dead code elimination</b> deletes temporaries nobody reads. In SSA form each of these is a simple pass over def-use chains.', [{ type: 'graph', height: 30, nodes: [{ id: 'AST', label: 'AST', x: 8, y: 15, shape: 'box' }, { id: 'IR', label: 'SSA IR', x: 32, y: 15, shape: 'box' }, { id: 'OPT', label: 'passes x N', x: 58, y: 15, shape: 'box' }, { id: 'CG', label: 'codegen', x: 84, y: 15, shape: 'box' }], edges: [['AST', 'IR', 'lower'], ['IR', 'OPT', ''], ['OPT', 'CG', '']], hl: { OPT: 'cur' } }]));
      return f;
    }
  }],
  examples: [
    { title: 'SSA and a φ-node', html: `<pre>if (c) x = 1; else x = 2;      →    B1: br c, B2, B3
y = x * 10;                         B2: x1 = 1; jmp B4
                                    B3: x2 = 2; jmp B4
                                    B4: x3 = φ(x1, x2); y1 = x3 * 10</pre><p>φ picks <code>x1</code> if we came from B2 and <code>x2</code> from B3. If <code>c</code> is a known constant, the dead branch disappears and φ collapses to a single value, which then folds into <code>y1 = 10</code>.</p>` },
    { title: 'The benchmark that measured nothing', html: `<p><code>for (int i = 0; i &lt; 1e9; i++) { int r = i * i; }</code> - <code>r</code> is never read, so DCE deletes the body, and then the empty loop. Result: "1 billion iterations in 0 ms". JMH's <code>Blackhole</code>, BenchmarkDotNet's returned values and Google Benchmark's <code>DoNotOptimize</code> exist to defeat exactly this.</p>` },
    { title: 'Undefined behaviour lets the optimiser delete your check', html: `<p>In C, signed overflow is undefined, so <code>if (x + 1 &lt; x)</code> may be folded to <code>false</code>: the compiler is allowed to assume overflow never happens. Same for a null check after a dereference. Safe languages (Java, C#, Rust in safe code) define these cases, which limits some optimisations but removes this class of surprise.</p>` },
    { title: 'When folding must not happen', html: `${H.table(['Expression', 'Fold?', 'Why'], [['<code>2 * 3</code>', H.c('g', 'yes'), 'pure constants'], ['<code>1 / 0</code>', H.c('r', 'no'), 'must raise at run time, not at compile time'], ['<code>x * 0</code> (float)', H.c('r', 'no'), 'NaN * 0 = NaN, -5.0 * 0 = -0.0'], ['<code>f() * 0</code>', H.c('r', 'no'), 'f() may have side effects'], ['<code>0.1 + 0.2</code>', H.c('y', 'yes, carefully'), 'must use the exact target float semantics']])}` }
  ],
  deepDive: `<p><b>Data-flow analysis.</b> Most optimisations rest on facts computed over the CFG with a fixed-point iteration: <b>liveness</b> (is this value read later? → dead code, register allocation), <b>reaching definitions</b>, <b>available expressions</b> (→ CSE). Facts are elements of a lattice; each block has a transfer function; you iterate until nothing changes. SSA makes many of these sparse and nearly linear.</p>
<p><b>The back end.</b> After the target-independent passes, <b>instruction selection</b> maps IR to machine instructions (tree pattern matching), <b>register allocation</b> assigns unlimited temporaries to ~16 physical registers (graph colouring - NP-hard in general, so heuristics; JITs use the faster <b>linear scan</b>), and <b>instruction scheduling</b> reorders to hide latency. Spills to the stack happen when registers run out.</p>
<p><b>Inlining is the king.</b> Almost every big win (escape analysis, devirtualisation, constant propagation across calls) depends on inlining first. The trade-off is code size and compile time, so compilers use heuristics (callee size, call frequency, hotness from profiles). Profile-guided optimisation (PGO), and JITs that have real profiles, inline better than static compilers guessing. See the <i>JVM Internals</i> (Java) and <i>CLR Internals &amp; Performance</i> (C#) modules for how C2 and RyuJIT make those decisions.</p>`,
  aiEra: `<p><b>How AI changes this.</b> ML is already inside compilers: LLVM's MLGO uses learned policies for inlining-for-size and register-allocation eviction, and research systems use LLMs to suggest pass orderings or to translate between IRs. But correctness still comes from classic proofs - an optimisation must preserve semantics for <b>every</b> input, which is exactly where statistical models are weakest.</p>
<p><b>Use AI as a partner</b>: paste a small C function into Compiler Explorer (godbolt.org) at <code>-O0</code> and <code>-O2</code>, and ask an assistant to explain each difference in terms of the passes above. <b>Where AI goes wrong:</b> it proposes "optimisations" that are invalid for floats or for code with side effects, or assumes the compiler will vectorise something it cannot. Always check the generated assembly or IR yourself.</p>`,
  problems: [{
    title: 'Constant-Fold an Expression Tree', level: 'Medium', tags: ['AST', 'constant folding', 'post-order'], companies: ['Google', 'NVIDIA'],
    statement: `<p>Given an AST of integer arithmetic (<code>+ - * /</code>, integer literals, variable names), return a new AST where every subtree made only of constants is replaced by its value, and the identities <code>x + 0</code>, <code>x * 1</code>, <code>x * 0</code> are simplified. Division by a constant zero must be <b>left in place</b> so the program still fails at run time.</p>`,
    constraints: `<p>Up to 10<sup>5</sup> nodes; depth up to 10<sup>4</sup> (consider an iterative traversal). Variables are pure (no side effects).</p>`,
    example: `<p><code>x * (2 + 3) + 4 * 0</code> → ${H.c('g', 'x * 5')}. <code>(1 + 1) / (2 - 2)</code> → ${H.c('y', '2 / 0')} (kept: must throw at run time).</p>`,
    brute: { why: `<p>Repeatedly scan the whole tree for any node with two constant children, fold it, and restart from the root until nothing changes. Each pass is O(n) and a chain like <code>((((1+1)+1)+1)...)</code> needs n passes - O(n<sup>2</sup>).</p>` },
    mcq: { q: 'Why fold children before the parent (post-order)?', options: ['It uses less memory', 'A parent can only become constant after its children have been folded', 'Pre-order would give a different numeric answer'], answer: 1, explain: 'In (2+3)*4 the * node sees two constants only after 2+3 has become 5. One post-order pass folds everything.' },
    hints: [`<p>Hint 1: one bottom-up pass is enough because folding a node only depends on its (already folded) children.</p>`, `<p>Hint 2: after folding both children, check: both constants → compute; one side is the identity element → return the other side; x * 0 → 0 (only because x is pure and integer).</p>`, `<p>Hint 3: guard division by zero and integer semantics (truncate toward zero). For very deep trees, do the post-order with an explicit stack.</p>`],
    solution: {
      approach: `<p>Recursive (or explicit-stack) post-order rewrite. For a leaf return it unchanged. For a binary node fold both children first. If both are numbers and the operation is not a division by zero, compute the value (truncating division) and return a number node. Otherwise apply the identities: <code>x + 0 → x</code>, <code>0 + x → x</code>, <code>x - 0 → x</code>, <code>x * 1 → x</code>, <code>1 * x → x</code>, <code>x * 0 → 0</code>; else rebuild the node with the folded children. Mention the guard conditions an interviewer is listening for: floats (NaN, -0.0), side effects, overflow semantics, and keeping run-time errors at run time. This is the runnable <code>fold</code> function in the lesson code.</p>`,
      complexity: `<p>O(n) time - each node is visited once; O(depth) stack.</p>`,
      followUps: ['Add constant propagation across statements (let a = 3; b = a * 2).', 'How would SSA form make propagation easier?']
    }
  }]
});
/* ================= TOPIC 5: interpreters, bytecode VMs, JIT ================= */
function compileBC(n, out) {
  if (n.t === 'num') { out.push('PUSH ' + n.v); return; }
  if (n.t === 'bool') { out.push('PUSH ' + (n.v ? 1 : 0)); return; }
  if (n.t === 'var') { out.push('LOAD ' + n.n); return; }
  if (n.t === 'neg') { compileBC(n.e, out); out.push('NEG'); return; }
  compileBC(n.l, out); compileBC(n.r, out);
  out.push({ '+': 'ADD', '-': 'SUB', '*': 'MUL', '/': 'DIV', '^': 'POW' }[n.op]);
}
topics.push({
  title: 'Execution Models: Tree-Walking Interpreters, Bytecode VMs & JIT Compilation',
  analogy: `<p>Three ways to use a recipe in a foreign language. <b>Interpreter:</b> a translator stands next to you and translates each line as you cook - every time you cook. <b>Bytecode VM:</b> you translate the recipe once into your own shorthand cards and follow the cards - much faster to read. <b>JIT:</b> after you have cooked the same dish 50 times, you memorise the moves and do them by muscle memory - fastest, but only worth it for dishes you cook often. <b>AOT</b> (ahead-of-time) is a chef who learnt the dish before opening the restaurant.</p>`,
  explain: `<p>Once you have an AST or IR you can <b>run</b> it in several ways:</p>
${H.table(['Model', 'How it runs', 'Start-up', 'Peak speed', 'Examples'], [['Tree-walking interpreter', 'recursive eval() over the AST', 'instant', 'slowest (pointer chasing, a call per node)', 'early Ruby/JS, many DSLs, calculators'], ['Bytecode VM', 'compile to compact instructions, loop: fetch → decode → execute', 'fast', '2-10× faster than AST walking', 'CPython, Lua, JVM interpreter, V8 Ignition, Ruby YARV'], ['JIT compiler', 'compile hot bytecode to machine code at run time, using profiles', 'slow warm-up', 'close to (sometimes beats) AOT', 'HotSpot C1/C2, V8 Sparkplug/Maglev/TurboFan, .NET RyuJIT, PyPy, LuaJIT'], ['AOT compiler', 'compile everything to machine code before running', 'fastest start', 'high, but no run-time profile', 'C, C++, Rust, Go, GraalVM native-image, .NET Native AOT']])}
<p><b>Stack VMs</b> (JVM, CPython, .NET IL, WebAssembly) have instructions that take operands from an <b>operand stack</b>: <code>a + b * c</code> becomes <code>LOAD a; LOAD b; LOAD c; MUL; ADD</code> - exactly a post-order walk of the AST. <b>Register VMs</b> (Lua 5, Dalvik, V8 Ignition with an accumulator) name operands: <code>MUL r1, b, c; ADD r0, a, r1</code> - fewer instructions dispatched, bigger instructions.</p>
<p><b>Why bytecode beats AST walking:</b> instructions are dense in memory (cache-friendly), no recursion, and the dispatch loop is tight. <b>Why JIT beats bytecode:</b> no dispatch at all, values in registers, and the JIT can <b>specialise</b> on what it has observed - this call site always sees <code>int</code>, this object always has the same shape - guarded by cheap checks. If a guess turns out wrong, the JIT <b>deoptimises</b> back to the interpreter.</p>
<p>Modern runtimes are <b>tiered</b>: interpret first (fast start, gather profiles), compile hot code quickly with a baseline JIT, then recompile the hottest code with an optimising JIT. The language modules cover the concrete engines: <i>JVM Internals</i> (Java 13: bytecode, tiered C1/C2), <i>JS Engine Internals: V8, Memory &amp; GC</i> (JS 12: Ignition, Sparkplug, Maglev, TurboFan, hidden classes) and <i>CLR Internals &amp; Performance</i> (C# 12: IL, tiered JIT, ReadyToRun, Native AOT).</p>`,
  clues: ['"Interpreter vs compiler vs JIT" → when translation happens and what it can know', '"Design a VM / implement a stack machine" → instruction array + pc + operand stack + dispatch loop', '"Why is Java slow at start-up but fast later?" → warm-up: interpreter → tiered JIT', '"Why is Python slower than Java?" → CPython is a bytecode interpreter without (until 3.13 experimental) a JIT; dynamic types everywhere', '"Serverless cold start" → AOT / snapshots / CDS', '"Deoptimization", "inline cache", "hidden class" → speculative JIT vocabulary'],
  code: [
    { lang: 'python', run: true, title: 'Compile an AST to stack bytecode and run it on a tiny VM (runnable)', code: `# AST: ("num", v) | ("var", name) | (op, left, right)
OPS = {"+": "ADD", "-": "SUB", "*": "MUL", "/": "DIV", "<": "LT"}

def compile_expr(n, code):
    """Post-order walk: operands first, operator last = stack-machine code."""
    if n[0] == "num":
        code.append(("PUSH", n[1]))
    elif n[0] == "var":
        code.append(("LOAD", n[1]))
    else:
        compile_expr(n[1], code)
        compile_expr(n[2], code)
        code.append((OPS[n[0]],))
    return code

def run(code, env, trace=False):
    stack, pc, steps = [], 0, 0
    while pc < len(code):
        ins = code[pc]; op = ins[0]; pc += 1; steps += 1   # fetch + decode
        if op == "PUSH":   stack.append(ins[1])
        elif op == "LOAD": stack.append(env[ins[1]])
        elif op == "STORE": env[ins[1]] = stack.pop()
        elif op == "JMP":  pc = ins[1]
        elif op == "JZ":                                       # jump if zero (false)
            if stack.pop() == 0: pc = ins[1]
        elif op == "PRINT": print("   output:", stack.pop())
        else:                                                  # binary operators
            b, a = stack.pop(), stack.pop()
            if op == "ADD":   stack.append(a + b)
            elif op == "SUB": stack.append(a - b)
            elif op == "MUL": stack.append(a * b)
            elif op == "DIV": stack.append(int(a / b))   # truncate toward zero
            elif op == "LT":  stack.append(int(a < b))
            else: raise ValueError(f"unknown opcode {op}")
        if trace:
            print(f"   {str(ins):18} stack={stack}")
    return stack, steps

expr = ("+", ("var", "a"), ("*", ("var", "b"), ("num", 3)))     # a + b * 3
code = compile_expr(expr, [])
print("bytecode for a + b * 3:", code)
print("result:", run(code, {"a": 2, "b": 5}, trace=True)[0])

# A loop in bytecode: sum = 0; i = 0; while i < n: sum = sum + i; i = i + 1; print sum
loop = [
    ("PUSH", 0), ("STORE", "sum"), ("PUSH", 0), ("STORE", "i"),
    ("LOAD", "i"), ("LOAD", "n"), ("LT",), ("JZ", 17),           # 4: loop test
    ("LOAD", "sum"), ("LOAD", "i"), ("ADD",), ("STORE", "sum"),
    ("LOAD", "i"), ("PUSH", 1), ("ADD",), ("STORE", "i"),
    ("JMP", 4),
    ("LOAD", "sum"), ("PRINT",),                                  # 17
]
_, steps = run(loop, {"n": 100})
print("loop over n=100 dispatched", steps, "instructions -",
      "a JIT would turn the hot loop body into a few machine instructions")` }
  ],
  codeTitle: ['Stack VM'],
  viz: [{
    title: 'Stack VM: compile an expression, then fetch-decode-execute',
    input: '(a + 2) * b - 6 / 3 ; a=4 b=5',
    inputLabel: 'expression ; variable values (name=value)',
    gen: function (input) {
      var parts = String(input).split(';'), env = {};
      (parts[1] || '').trim().split(/\s+/).filter(Boolean).forEach(function (kv) {
        var m = /^([A-Za-z_]\w*)=(-?\d+)$/.exec(kv); if (!m) throw new Error('Variables look like a=4 b=5'); env[m[1]] = Number(m[2]);
      });
      var ast = parseExpr(lex(parts[0])), code = [];
      compileBC(ast, code);
      if (code.length > 30) throw new Error('Expression is too long for the animation (max 30 instructions)');
      var f = [];
      f.push(fr('Compile: a <b>post-order</b> walk of the AST emits operands before their operator. That order is exactly what a stack machine needs. ' + code.length + ' instructions.', [astPart(ast, 'AST'), { type: 'array', label: 'bytecode', values: code, showIdx: true }]));
      var st = [];
      for (var pc = 0; pc < code.length; pc++) {
        var ins = code[pc], op = ins.split(' ')[0], arg = ins.split(' ')[1], narr;
        if (op === 'PUSH') { st.push(Number(arg)); narr = '<code>PUSH ' + arg + '</code>: put the constant on the operand stack.'; }
        else if (op === 'LOAD') { if (!(arg in env)) throw new Error('No value for variable ' + arg + ' - add ' + arg + '=... after the ;'); st.push(env[arg]); narr = '<code>LOAD ' + esc(arg) + '</code>: read the variable from the frame\'s locals (' + env[arg] + ') and push it.'; }
        else if (op === 'NEG') { st.push(-st.pop()); narr = '<code>NEG</code>: pop one value, push its negation.'; }
        else { var b = st.pop(), a = st.pop(), sym = { ADD: '+', SUB: '-', MUL: '*', DIV: '/', POW: '^' }[op], r = applyOp(sym, a, b); st.push(r); narr = '<code>' + op + '</code>: pop <b>' + b + '</b> (right) and <b>' + a + '</b> (left), compute ' + a + ' ' + sym + ' ' + b + ' = <b>' + r + '</b>, push it. Note the order: the right operand is on top.'; }
        var h = {}; h[pc] = 'cur';
        var sh = {}; sh[st.length - 1] = 'ok';
        f.push(fr('pc=' + pc + ' - ' + narr, [{ type: 'array', label: 'bytecode', values: code, showIdx: true, hl: h, ptr: (function () { var p = {}; p[pc] = 'pc'; return p; })() }, { type: 'stack', label: 'operand stack', items: st.map(String), hl: sh }, { type: 'vars', label: 'locals', vals: Object.keys(env).length ? env : { '(none)': '-' } }]));
      }
      f.push(fr('Halt. One value remains: <b>' + st[0] + '</b>. The VM executed ' + code.length + ' dispatches. A JIT that saw this code run millions of times would emit a few register instructions with no dispatch loop and no stack traffic at all.', [{ type: 'stack', label: 'operand stack', items: st.map(String), hl: { 0: 'sel' } }, { type: 'vars', label: 'cost model', vals: { dispatches: code.length, 'stack pushes': code.filter(function (c) { return /PUSH|LOAD/.test(c); }).length } }]));
      return f;
    }
  }],
  examples: [
    { title: 'See real bytecode in Python', html: `<p><code>import dis; dis.dis(lambda a, b: a + b * 3)</code> prints <code>LOAD_FAST a</code>, <code>LOAD_FAST b</code>, <code>LOAD_CONST 3</code>, <code>BINARY_OP *</code>, <code>BINARY_OP +</code>, <code>RETURN_VALUE</code> - the same post-order shape as our VM. CPython 3.11+ <b>specialises</b> instructions at run time (e.g. <code>BINARY_OP_ADD_INT</code>) after seeing the types - an "adaptive interpreter", a step toward JIT. 3.13 added an experimental copy-and-patch JIT.</p>` },
    { title: 'Same expression, three VMs', html: `${H.table(['Engine', 'Code for a + b * 3'], [['JVM (javap)', '<code>iload_1, iload_2, iconst_3, imul, iadd</code>'], ['.NET IL', '<code>ldarg.0, ldarg.1, ldc.i4.3, mul, add</code>'], ['WebAssembly', '<code>local.get 0, local.get 1, i32.const 3, i32.mul, i32.add</code>']])}<p>All stack machines: compact, easy to verify, easy to JIT. Wasm's validator type-checks the stack at load time.</p>` },
    { title: 'Why warm-up matters in production', html: `<p>A Java service is deployed and immediately sent full traffic. For the first 30-60 seconds p99 latency is 5× higher: code is still interpreted or C1-compiled and the JIT threads compete for CPU. Fixes: warm-up traffic before joining the load balancer, CDS/AOT caches, or GraalVM native image / .NET Native AOT for short-lived processes (at the cost of peak throughput and reflection limits).</p>` },
    { title: 'Speculation and deopt in one picture', html: `<p>A JIT sees <code>add(x, y)</code> called 10,000 times with small integers. It compiles: "check both are ints → integer add → check overflow". On call 10,001 a string arrives: the guard fails, the frame is rebuilt as an interpreter frame (<b>deoptimisation</b>), and the function is later recompiled more generically. Guards are cheap; deopt loops are expensive - a classic cause of mysterious slowdowns in JS.</p>` }
  ],
  deepDive: `<p><b>Dispatch cost.</b> A naive <code>switch</code> in a loop compiles to one indirect branch that the CPU's predictor must guess for every instruction. <b>Threaded code</b> (computed goto, used by CPython and many VMs) puts an indirect jump at the end of each handler, giving the predictor per-opcode history. <b>Superinstructions</b> fuse common pairs (<code>LOAD_FAST_LOAD_FAST</code>). V8's Ignition and the JVM's template interpreter generate handlers as machine code at start-up.</p>
<p><b>Stack vs register VMs.</b> Stack code is ~25-50% smaller and simpler to generate; register code dispatches ~45% fewer instructions (Shi et al., "Virtual Machine Showdown"). JITs do not care much - they convert either form to SSA immediately.</p>
<p><b>Tracing vs method JITs.</b> Method JITs (HotSpot, V8, RyuJIT) compile whole functions. Tracing JITs (LuaJIT, PyPy's meta-tracing, old TraceMonkey) record one hot path through a loop, including across calls, and compile that linear trace with guards for exits. <b>OSR</b> (on-stack replacement) lets a long-running loop switch from interpreter to compiled code mid-execution. <b>Copy-and-patch</b> (CPython 3.13) stitches pre-compiled machine code templates together - a cheap baseline JIT.</p>
<p><b>Security.</b> JITs write executable memory at run time, which needs W^X juggling (Apple's MAP_JIT, V8's write-protect) and is a frequent target of browser exploits - why some locked-down environments (iOS for third-party engines, "jitless" modes) ban JITs entirely.</p>`,
  aiEra: `<p><b>How AI changes this.</b> ML frameworks are compilers and JITs: PyTorch 2's <code>torch.compile</code> traces Python bytecode (TorchDynamo), builds an IR graph, and generates fused GPU kernels; JAX/XLA and Triton do the same. "Graph breaks" and "recompilation" there are the same ideas as deoptimisation and guard failures here. Inference servers fight warm-up and cold-start exactly like JVM services do.</p>
<p><b>Use AI as a partner</b> to read <code>dis</code>, <code>javap -c</code> or Compiler Explorer output and explain each instruction. <b>Where AI goes wrong:</b> it says "Java is interpreted" or "Python is compiled to machine code", or claims a JIT makes everything faster (not for short-lived processes). Own the trade-off table above.</p>`,
  problems: [{
    title: 'Build a Stack VM with Jumps', level: 'Medium', tags: ['virtual machine', 'stack', 'interpreter'], companies: ['Apple', 'Bloomberg', 'Stripe'],
    statement: `<p>Implement <code>run(program, env)</code> for instructions <code>PUSH k, LOAD x, STORE x, ADD, SUB, MUL, LT, JMP t, JZ t, PRINT</code>. <code>JZ</code> pops a value and jumps to index <code>t</code> if it is 0. Return the printed outputs. Detect stack underflow and a step limit (to catch infinite loops).</p>`,
    constraints: `<p>Program length ≤ 10<sup>4</sup>; abort with an error after 10<sup>7</sup> steps.</p>`,
    example: `<p>The sum-of-0..n-1 loop in the lesson code with n = 100 prints ${H.c('g', '4950')} after about 1,300 dispatches.</p>`,
    brute: { why: `<p>Walking the AST of the source program with recursive <code>eval</code> works too, but each node costs a function call and pointer chases, and loops re-walk the same subtrees. Re-parsing source text per iteration (a "pure interpreter" of text) is far slower still.</p>` },
    mcq: { q: 'For SUB, which value is the left operand?', options: ['The top of the stack', 'The value just below the top', 'It does not matter'], answer: 1, explain: 'The left operand was pushed first, so it is below the right one: b = pop(), a = pop(), push(a - b).' },
    hints: [`<p>Hint 1: the whole VM is a while loop over a program counter <code>pc</code>; fetch <code>program[pc]</code>, increment <code>pc</code>, then execute.</p>`, `<p>Hint 2: jumps just assign <code>pc</code>; binary ops pop right then left. Keep variables in a dict (the "frame").</p>`, `<p>Hint 3: check <code>len(stack) &gt;= needed</code> before popping and count steps to stop runaway loops; jump targets must be inside the program.</p>`],
    solution: {
      approach: `<p>Keep <code>pc = 0</code>, an operand stack list and a step counter. Loop while <code>pc &lt; len(program)</code>: fetch the instruction, increment <code>pc</code> (so jumps can overwrite it), dispatch on the opcode with a dict or match statement. PUSH/LOAD push; STORE pops into env; arithmetic pops b then a and pushes the result; LT pushes 1/0; JMP sets pc; JZ pops and conditionally sets pc; PRINT pops and appends to the output list. Before each pop verify the stack has enough values and raise "stack underflow at pc" otherwise; after each step increment the counter and raise when it exceeds the limit. This mirrors the runnable VM in the lesson and the real fetch-decode-execute loop inside the JVM interpreter and CPython's ceval.</p>`,
      complexity: `<p>O(steps executed) time, O(max stack depth + variables) space.</p>`,
      followUps: ['Add CALL/RET with a frame stack.', 'How would you add a verifier that proves no underflow before running (like the JVM / Wasm)?']
    }
  }]
});
/* ================= TOPIC 6: GC basics - refcount + mark-sweep ================= */
// Parse "roots: A ; A->B B->C C->A D->E" into {roots, nodes, edges}
function parseHeap(input) {
  var s = String(input), parts = s.split(';');
  if (parts.length < 2) throw new Error('Format: roots: A B ; A->B B->C D->E');
  var roots = parts[0].replace(/roots\s*:/i, '').trim().split(/[\s,]+/).filter(Boolean);
  var edges = [], nodes = [];
  function add(n) { if (!/^[A-Za-z]\w{0,3}$/.test(n)) throw new Error('Object names must be short words like A or N1, got "' + n + '"'); if (nodes.indexOf(n) < 0) nodes.push(n); }
  roots.forEach(add);
  parts[1].trim().split(/[\s,]+/).filter(Boolean).forEach(function (e) {
    var m = /^(\w+)->(\w+)$/.exec(e); if (!m) throw new Error('Edges look like A->B, got "' + e + '"');
    add(m[1]); add(m[2]); edges.push([m[1], m[2]]);
  });
  if (nodes.length > 12) throw new Error('Use at most 12 objects');
  return { roots: roots, nodes: nodes, edges: edges };
}
function heapGraph(h, hl, ehl, tags) {
  var n = h.nodes.length, nodes = [{ id: 'ROOTS', label: 'roots', x: 6, y: 30, shape: 'box' }];
  h.nodes.forEach(function (id, i) {
    var col = i % 4, row = Math.floor(i / 4);
    nodes.push({ id: id, label: id, x: 28 + col * 22, y: 10 + row * 20 + (col % 2) * 6 });
  });
  var edges = h.roots.map(function (r) { return ['ROOTS', r]; }).concat(h.edges.map(function (e) { return [e[0], e[1]]; }));
  return { type: 'graph', directed: true, height: 60 + (n > 8 ? 10 : 0), nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} };
}
topics.push({
  title: 'Garbage Collection I: Reachability, Reference Counting & Mark-Sweep',
  analogy: `<p><b>Reference counting</b> is a library book with a sticker counting how many people are holding it - when the count drops to 0, it goes back on the shelf immediately. But if two friends each hold the other's library card and nobody else knows them, the count never drops - a <b>cycle</b> leaks. <b>Mark-sweep</b> is a cleaner walking the house from the front door (the roots), putting a tick on everything reachable, then throwing away everything without a tick.</p>`,
  explain: `<p>A garbage collector frees heap memory that the program can never use again. "Can never use again" is approximated by <b>reachability</b>: an object is live if there is a path of pointers to it from a <b>root</b> - local variables on thread stacks, CPU registers, global/static variables, and runtime handles. Everything else is garbage.</p>
<p><b>Reference counting (RC)</b> stores a counter in each object: +1 when a new reference is created, -1 when one is dropped; at 0 the object is freed at once (and its children's counts are decremented, possibly cascading). Used by CPython, Swift/Objective-C (ARC), C++ <code>shared_ptr</code>, Rust <code>Rc/Arc</code>, COM.</p>
${H.table(['RC strength', 'RC weakness'], [['memory freed immediately - predictable, good for files/sockets (deterministic destruction)', 'cannot free <b>cycles</b> (A→B→A) on its own'], ['no long pauses; work spread over the program', 'a counter update on every pointer copy - and an <b>atomic</b> one if shared between threads'], ['simple, works with native code', 'freeing a huge structure can cascade into a long pause']])}
<p>Fixes for cycles: <b>weak references</b> that do not count (parent pointers, caches, delegate back-references in Swift), or a <b>backup cycle collector</b> (CPython's <code>gc</code> module runs a trial-deletion algorithm over container objects).</p>
<p><b>Tracing GC: mark-sweep</b> (McCarthy, Lisp, 1960). Stop the program, then: <b>Mark</b> - DFS/BFS from the roots, set a mark bit on every object reached. <b>Sweep</b> - walk the whole heap linearly; unmarked objects go to the free list, marked ones get their bit cleared for next time. Cycles are no problem: an unreachable cycle is simply never marked. Costs: mark is O(live objects), sweep is O(heap size); the program is paused (stop-the-world) unless the collector is incremental or concurrent; and the heap gets <b>fragmented</b> because nothing moves. <b>Mark-compact</b> fixes fragmentation by sliding live objects together and updating pointers.</p>`,
  clues: ['"Implement a garbage collector / mark and sweep over an object graph" → DFS from roots + linear sweep', '"Why does Python have both reference counting and a gc module?" → RC cannot free cycles', '"Memory leak in Swift closure / iOS delegate" → strong reference cycle; use <code>weak</code>/<code>unowned</code>', '"What are GC roots?" → stacks, registers, globals/statics, JNI/handles', '"Does a cycle leak in Java?" → no, tracing GC handles unreachable cycles', '"Deterministic destruction / RAII / using / with" → RC or explicit scopes, not tracing GC'],
  code: [
    { lang: 'python', run: true, title: 'Reference counting with a leaking cycle (runnable)', code: `class Obj:
    def __init__(self, heap, name):
        self.name, self.rc, self.refs, self.heap = name, 0, [], heap
        heap[name] = self

def incref(o):
    o.rc += 1

def decref(o, log):
    o.rc -= 1
    log.append(f"decref {o.name} -> rc={o.rc}")
    if o.rc == 0:                       # free immediately, then cascade
        log.append(f"FREE {o.name}")
        del o.heap[o.name]
        for child in o.refs:
            decref(child, log)
        o.refs.clear()

def point(src, dst):                    # src.field = dst
    src.refs.append(dst); incref(dst)

heap, log = {}, []
# A tree: root variable -> A -> B -> C
a, b, c = Obj(heap, "A"), Obj(heap, "B"), Obj(heap, "C")
incref(a)                               # the local variable 'a' holds A
point(a, b); point(b, c)
decref(a, log)                          # variable goes out of scope
print("tree   :", log, "| heap left:", sorted(heap))

# A cycle: variable -> X, X <-> Y
heap, log = {}, []
x, y = Obj(heap, "X"), Obj(heap, "Y")
incref(x)
point(x, y); point(y, x)                # X.rc = 2 (variable + Y), Y.rc = 1
decref(x, log)                          # drop the variable
print("cycle  :", log, "| heap left:", sorted(heap), "<- LEAK: unreachable but rc > 0")

# The fix: make the back pointer weak (it does not count)
heap, log = {}, []
x, y = Obj(heap, "X"), Obj(heap, "Y")
incref(x)
point(x, y)
y.weak_parent = x                       # weak: no incref
decref(x, log)
print("weak   :", log, "| heap left:", sorted(heap))` },
    { lang: 'python', run: true, title: 'Mark-sweep collector over a toy heap (runnable)', code: `class Heap:
    def __init__(self, capacity):
        self.slots = [None] * capacity          # each slot: {"name", "refs", "marked"}
        self.free = list(range(capacity - 1, -1, -1))
        self.roots = set()

    def alloc(self, name):
        if not self.free:
            self.collect()                      # out of memory? run the GC first
            if not self.free:
                raise MemoryError("heap full of live objects")
        i = self.free.pop()
        self.slots[i] = {"name": name, "refs": [], "marked": False}
        return i

    def mark(self):
        stack = list(self.roots)                # explicit stack: no recursion limit
        while stack:
            i = stack.pop()
            obj = self.slots[i]
            if obj is None or obj["marked"]:
                continue
            obj["marked"] = True
            stack.extend(obj["refs"])

    def sweep(self):
        freed = []
        for i, obj in enumerate(self.slots):   # linear walk over the WHOLE heap
            if obj is None:
                continue
            if obj["marked"]:
                obj["marked"] = False           # reset for the next cycle
            else:
                freed.append(obj["name"])
                self.slots[i] = None
                self.free.append(i)
        return freed

    def collect(self):
        self.mark()
        freed = self.sweep()
        print("   GC freed:", freed)
        return freed

h = Heap(6)
A, B, C = h.alloc("A"), h.alloc("B"), h.alloc("C")
D, E = h.alloc("D"), h.alloc("E")
h.slots[A]["refs"] = [B]; h.slots[B]["refs"] = [C]
h.slots[D]["refs"] = [E]; h.slots[E]["refs"] = [D]   # unreachable cycle D <-> E
h.roots = {A}
print("live before GC:", [s["name"] for s in h.slots if s])
h.collect()
print("live after GC :", [s["name"] for s in h.slots if s])
F = h.alloc("F"); G = h.alloc("G"); H = h.alloc("H")  # reuses the freed slots
print("after more allocations:", [s["name"] if s else "-" for s in h.slots])` }
  ],
  codeTitle: ['Reference counting', 'Mark-sweep'],
  viz: [{
    title: 'Mark-sweep: trace from the roots, sweep the rest',
    input: 'roots: A F ; A->B B->C C->A D->E E->D F->G H->G',
    inputLabel: 'roots: names ; edges like A->B (an object pointing to another)',
    gen: function (input) {
      var h = parseHeap(input), f = [], marked = {}, order = [], stack = h.roots.slice().reverse();
      f.push(fr('The heap has <b>' + h.nodes.length + '</b> objects. The roots (stack variables, globals) point to <code>' + esc(h.roots.join(', ')) + '</code>. The program is paused (stop-the-world) while we collect.', [heapGraph(h, { ROOTS: 'cur' })]));
      while (stack.length) {
        var n = stack.pop();
        if (marked[n]) {
          var hl0 = {}; Object.keys(marked).forEach(function (k) { hl0[k] = 'ok'; }); hl0[n] = 'win';
          f.push(fr('Reached <b>' + esc(n) + '</b> again - it is already marked, so we stop here. This check is why <b>cycles do not loop forever</b> in the marker.', [heapGraph(h, hl0), { type: 'stack', label: 'mark stack', items: stack.slice() }]));
          continue;
        }
        marked[n] = true; order.push(n);
        var kids = h.edges.filter(function (e) { return e[0] === n; }).map(function (e) { return e[1]; });
        kids.slice().reverse().forEach(function (k) { stack.push(k); });
        var hl = {}; Object.keys(marked).forEach(function (k) { hl[k] = 'ok'; }); hl[n] = 'cur';
        var ehl = {}; kids.forEach(function (k) { ehl[n + '-' + k] = 'cur'; });
        f.push(fr('<b>Mark</b> ' + esc(n) + ' as live' + (kids.length ? ' and push its children <code>' + esc(kids.join(', ')) + '</code>.' : ' - it has no outgoing pointers.'), [heapGraph(h, hl, ehl), { type: 'stack', label: 'mark stack', items: stack.slice() }]));
      }
      var garbage = h.nodes.filter(function (x) { return !marked[x]; });
      var hlM = {}; h.nodes.forEach(function (x) { hlM[x] = marked[x] ? 'ok' : 'bad'; });
      f.push(fr('Mark phase done: ' + order.length + ' live object(s). Work so far is proportional to <b>live</b> objects only. Unmarked: <code>' + esc(garbage.join(', ') || 'none') + '</code>' + (garbage.length ? ' - note any cycle among them: reference counting would have leaked it, tracing does not care.' : '.'), [heapGraph(h, hlM)]));
      h.nodes.forEach(function (x, i) {
        var hl2 = {}; h.nodes.forEach(function (y, j) { hl2[y] = j < i ? (marked[y] ? 'ok' : 'done') : (marked[y] ? 'ok' : 'bad'); }); hl2[x] = marked[x] ? 'win' : 'bad';
        f.push(fr('<b>Sweep</b> slot ' + i + ' (' + esc(x) + '): ' + (marked[x] ? 'marked → keep it and clear the mark bit for the next GC.' : 'not marked → add its memory to the <b>free list</b>.'), [heapGraph(h, hl2), { type: 'array', label: 'free list', values: (function () { var fl = h.nodes.slice(0, i + 1).filter(function (y) { return !marked[y]; }); return fl.length ? fl : ['(empty)']; })() }]));
      });
      f.push(fr('Done. Freed <b>' + garbage.length + '</b>, kept <b>' + order.length + '</b>. The sweep touched every object (O(heap)). Survivors did not move, so free memory is now scattered holes - <b>fragmentation</b>, which compacting and copying collectors fix.', [heapGraph({ roots: h.roots, nodes: order, edges: h.edges.filter(function (e) { return marked[e[0]] && marked[e[1]]; }) }, {}), { type: 'set', label: 'freed', items: garbage.length ? garbage : ['(nothing)'] }]));
      return f;
    }
  }, {
    title: 'Reference counting: freeing a chain vs leaking a cycle',
    input: 'X->Y Y->Z Z->Y',
    inputLabel: 'edges between objects; one local variable points to the first object, then it is dropped',
    gen: function (input) {
      var h = parseHeap('roots: ; ' + input), first = h.edges.length ? h.edges[0][0] : null;
      if (!first) throw new Error('Give at least one edge, e.g. X->Y Y->X');
      h.roots = [first];
      var rc = {}; h.nodes.forEach(function (n) { rc[n] = 0; }); rc[first] += 1;
      h.edges.forEach(function (e) { rc[e[1]] += 1; });
      var f = [], freed = {};
      function kv() { return { type: 'map', label: 'reference counts', entries: h.nodes.map(function (n) { return [n, freed[n] ? 'freed' : String(rc[n])]; }), hl: h.nodes.reduce(function (o, n) { o[n] = freed[n] ? 'bad' : rc[n] > 0 ? 'ok' : 'cur'; return o; }, {}) }; }
      f.push(fr('Each object counts how many pointers point at it. The local variable points to <b>' + esc(first) + '</b> (+1) and every edge adds +1 to its target.', [heapGraph(h, {}), kv()]));
      var live = { roots: [], nodes: h.nodes, edges: h.edges };
      rc[first] -= 1;
      f.push(fr('The variable goes out of scope: <code>' + esc(first) + '.rc</code> drops to <b>' + rc[first] + '</b>.' + (rc[first] === 0 ? ' Zero means nobody can reach it - free it now and decrement its children.' : ' Still above zero because another object points at it.'), [heapGraph(live, (function () { var o = {}; o[first] = rc[first] ? 'cur' : 'bad'; return o; })()), kv()]));
      var queue = rc[first] === 0 ? [first] : [];
      while (queue.length) {
        var n = queue.shift(); if (freed[n]) continue; freed[n] = true;
        h.edges.filter(function (e) { return e[0] === n; }).forEach(function (e) {
          rc[e[1]] -= 1;
          var o = {}; Object.keys(freed).forEach(function (k) { o[k] = 'bad'; }); o[e[1]] = rc[e[1]] ? 'cur' : 'bad';
          var eh = {}; eh[e[0] + '-' + e[1]] = 'bad';
          f.push(fr('Free <b>' + esc(n) + '</b>: its pointer to <b>' + esc(e[1]) + '</b> disappears, so <code>' + esc(e[1]) + '.rc</code> becomes <b>' + rc[e[1]] + '</b>' + (rc[e[1]] === 0 ? ' → free it too (cascade).' : '.'), [heapGraph(live, o, eh), kv()]));
          if (rc[e[1]] === 0) queue.push(e[1]);
        });
      }
      var leaked = h.nodes.filter(function (n) { return !freed[n]; });
      var o2 = {}; h.nodes.forEach(function (n) { o2[n] = freed[n] ? 'done' : 'bad'; });
      f.push(fr(leaked.length ? '<span class="c-r"><b>Leak:</b></span> <code>' + esc(leaked.join(', ')) + '</code> can no longer be reached from any variable, but each still has rc &gt; 0 because they point at each other (a <b>cycle</b>). Pure reference counting never frees them. Fixes: make one pointer <b>weak</b>, or run a backup cycle collector (CPython\'s <code>gc</code>).' : 'Everything was freed immediately and deterministically - no cycles, so reference counting worked perfectly.', [heapGraph(live, o2), kv()]));
      return f;
    }
  }],
  examples: [
    { title: 'CPython: RC + a cycle collector', html: `<p><code>a = []; a.append(a); del a</code> - the list references itself, so its refcount stays 1 after <code>del</code>. CPython's generational cycle detector (<code>gc.collect()</code>) finds it by "trial deletion": for each container it subtracts references that come from <i>other tracked containers</i>; whatever reaches 0 is only kept alive internally and is unreachable. <code>sys.getrefcount(x)</code> shows counts (one higher, because the argument itself is a reference).</p>` },
    { title: 'Swift retain cycle', html: `<p>A view controller stores a closure that captures <code>self</code>: controller → closure → controller. With ARC neither is ever freed - a classic iOS memory leak. Fix: <code>{ [weak self] in self?.reload() }</code>. Same with delegates: the child holds a <code>weak var delegate</code>.</p>` },
    { title: 'Roots in a real runtime', html: `${H.table(['Root kind', 'Example'], [['thread stacks / registers', 'local variables of every active frame'], ['globals / statics', 'a static <code>Map</code> cache (a top leak source)'], ['runtime handles', 'JNI global refs, GCHandle in .NET, pending callbacks'], ['class/metadata', 'loaded classes and their static fields']])}<p>A "leak" in a GC language is always an object that is still <b>reachable</b> from a root but no longer needed.</p>` },
    { title: 'Cost comparison on one picture', html: `<p>Heap of 1 GB with 100 MB live. Mark: proportional to <b>100 MB</b> (only live data is traced). Sweep: proportional to <b>1 GB</b> (every object header is visited). RC: proportional to the number of <b>pointer writes</b> the program makes, all the time. This is why tracing GCs like a big heap with little live data, and why sweeping is often done lazily during allocation.</p>` }
  ],
  deepDive: `<p><b>Mark bits and the mark stack.</b> Real collectors keep mark bits in a side <b>bitmap</b> (1 bit per 8-16 bytes of heap) instead of object headers - sweeping then scans a dense bitmap, and marking does not dirty every object's cache line. The mark stack can overflow on long linked lists; collectors fall back to rescanning or use pointer reversal (Deutsch-Schorr-Waite) to mark in constant extra space.</p>
<p><b>Conservative vs precise.</b> A <b>precise</b> GC knows exactly which words are pointers (stack maps emitted by the JIT at safepoints). A <b>conservative</b> GC (Boehm GC for C/C++, the stack scanning of some runtimes) treats anything that looks like a heap address as a possible pointer - it can keep garbage alive and can never move objects those words point to.</p>
<p><b>Allocation matters as much as collection.</b> Mark-sweep uses free lists (segregated by size class, like <code>malloc</code>), which is slower than a moving collector's <b>bump-pointer</b> allocation (one add and one compare, inside a per-thread buffer - TLAB). Deferred and coalesced RC (used by modern research collectors like LXR) and biased RC reduce the cost of counter updates. Even CPython's free-threaded build (3.13+) uses biased reference counting so the owning thread updates counts without atomics.</p>`,
  aiEra: `<p><b>How AI changes this.</b> Assistants are good at spotting classic leak patterns in a diff - closures capturing <code>self</code>, listeners never removed, static caches without bounds - and at reading heap dumps when you paste a dominator summary. But they cannot see your live heap; you still need the profiler (heap snapshots in DevTools, <code>jcmd GC.heap_dump</code>, <code>dotnet-gcdump</code>, <code>tracemalloc</code>).</p>
<p><b>Where AI goes wrong:</b> it claims "Java leaks cycles" (it does not), says Python has "no garbage collector" (it has RC <i>and</i> a cycle GC), or suggests <code>System.gc()</code> as a fix. <b>You must own</b> the reachability definition: a leak in a GC language is a reachable-but-useless object, and the fix is to drop the reference.</p>`,
  problems: [{
    title: 'Mark-Sweep over an Adjacency List', level: 'Medium', tags: ['garbage collection', 'graph', 'DFS'], companies: ['Oracle', 'Microsoft', 'Meta'],
    statement: `<p>The heap has objects <code>0..n-1</code>; <code>refs[i]</code> lists the objects that object <code>i</code> points to. Given the root set, return the sorted list of objects that a mark-sweep collector frees. Then explain what reference counting would free on the same heap if every root were dropped.</p>`,
    constraints: `<p>n ≤ 10<sup>6</sup>, total references ≤ 5·10<sup>6</sup>; chains can be 10<sup>6</sup> long (no recursion).</p>`,
    example: `<p>n = 5, refs = [[1], [2], [0], [4], [3]], roots = [0] → ${H.c('r', 'free [3, 4]')}. Objects 3 and 4 form a cycle, so reference counting frees nothing there, while mark-sweep frees them because no root reaches them.</p>`,
    brute: { why: `<p>For every object, run a separate search from the roots to see if it is reachable: O(n · (n + m)). Or try to decide garbage by "refcount is 0" - wrong, because the unreachable cycle 3 ↔ 4 has counts of 1.</p>` },
    mcq: { q: 'Which objects does marking visit?', options: ['All objects in the heap', 'Only objects reachable from roots', 'Only objects with refcount 0'], answer: 1, explain: 'Marking is a graph traversal from the roots; its cost is proportional to the live data. Sweep is the phase that touches everything.' },
    hints: [`<p>Hint 1: "garbage" = not reachable from any root; this is a plain graph-reachability question.</p>`, `<p>Hint 2: iterative DFS/BFS with a boolean <code>marked</code> array; skip already-marked nodes so cycles terminate.</p>`, `<p>Hint 3: the sweep is a linear scan collecting every index with <code>marked[i] == false</code> - already sorted. Use an explicit stack for 10<sup>6</sup>-long chains.</p>`],
    solution: {
      approach: `<p>Mark: push all roots on an explicit stack; while it is non-empty pop <code>i</code>, skip if marked, else set <code>marked[i] = true</code> and push every <code>refs[i]</code>. Sweep: scan <code>i = 0..n-1</code> and collect indices that are unmarked - the output is sorted for free. For the RC comparison: dropping the roots makes counts of root objects fall to 0, which cascades through acyclic parts, but every object on a cycle (or reachable only from a cycle) keeps a positive count and leaks. That is exactly the motivation for CPython's cycle collector and for weak references. The runnable <code>Heap</code> class in the lesson implements this with a free list.</p>`,
      complexity: `<p>Mark O(live + their edges), sweep O(n); O(n) bits for marks plus the stack.</p>`,
      followUps: ['How would you make the sweep lazy (done during allocation)?', 'How does a compacting collector update the pointers after moving objects?']
    }
  }]
});
/* ================= TOPIC 7: generational, copying, concurrent GC ================= */
function triColor(h, k, src, dst, cut, barrier) {
  // Incremental marking: one grey object scanned per step. After k steps the mutator
  // does src.f = dst and deletes cut->dst. Returns frames data + final colours.
  var color = {}, grey = [], steps = [], edges = h.edges.map(function (e) { return e.slice(); }), mutated = false;
  h.nodes.forEach(function (n) { color[n] = 'white'; });
  h.roots.forEach(function (r) { if (color[r] === 'white') { color[r] = 'grey'; grey.push(r); } });
  steps.push({ what: 'roots shaded grey', color: Object.assign({}, color), grey: grey.slice(), edges: edges.map(function (e) { return e.slice(); }) });
  var count = 0;
  while (grey.length || !mutated) {
    if (count === k && !mutated) {
      mutated = true;
      edges.push([src, dst]);
      edges = edges.filter(function (e) { return !(e[0] === cut && e[1] === dst); });
      var note = 'mutator runs: <code>' + src + '.f = ' + dst + '</code> and deletes <code>' + cut + ' → ' + dst + '</code>.';
      if (barrier && color[src] === 'black' && color[dst] === 'white') { color[dst] = 'grey'; grey.push(dst); note += ' <b>Write barrier</b>: a black object now points to a white one, so ' + dst + ' is shaded grey.'; }
      else if (!barrier && color[src] === 'black' && color[dst] === 'white') note += ' <span class="c-r">No barrier: black ' + src + ' now points to white ' + dst + ' and nobody will rescan ' + src + '.</span>';
      steps.push({ what: note, mut: true, color: Object.assign({}, color), grey: grey.slice(), edges: edges.map(function (e) { return e.slice(); }) });
      continue;
    }
    if (!grey.length) { count = k; continue; }
    var n = grey.shift(), kids = edges.filter(function (e) { return e[0] === n; }).map(function (e) { return e[1]; }), shaded = [];
    kids.forEach(function (c) { if (color[c] === 'white') { color[c] = 'grey'; grey.push(c); shaded.push(c); } });
    color[n] = 'black'; count++;
    steps.push({ what: 'scan ' + n + ': ' + (shaded.length ? 'shade children ' + shaded.join(', ') + ' grey' : 'no white children') + ', then ' + n + ' becomes black (fully scanned).', color: Object.assign({}, color), grey: grey.slice(), edges: edges.map(function (e) { return e.slice(); }), cur: n });
  }
  return { steps: steps, color: color, edges: edges };
}
topics.push({
  title: 'Garbage Collection II: Copying, Generational, Incremental & Concurrent Collectors',
  analogy: `<p>A busy restaurant. Most customers (objects) leave within minutes; a few regulars stay all evening. The smart manager cleans the <b>front tables</b> (young generation) very often - almost everyone there has already left, so it is quick - and cleans the <b>back room</b> (old generation) rarely. And instead of closing the restaurant to clean (stop-the-world), the best cleaners work <b>while guests are eating</b> (concurrent GC), as long as guests tell them when they move a plate (write barrier).</p>`,
  explain: `<p><b>Copying (semi-space) collection</b> (Cheney, 1970): split the heap into from-space and to-space. Allocate by bumping a pointer in from-space. To collect, copy every <b>reachable</b> object to to-space (BFS, leaving a forwarding pointer behind), then swap the roles. Cost is proportional to <b>live</b> data only, the result is perfectly compacted, and allocation is a pointer bump. Downside: half the memory sits empty.</p>
<p><b>The generational hypothesis:</b> "most objects die young". So split the heap: a small <b>young generation</b> (eden + survivor spaces) collected often with a copying <b>minor GC</b> - cheap because almost everything there is dead - and an <b>old generation</b> for objects that survive a few minor GCs (<b>promotion / tenuring</b>), collected rarely with mark-sweep or mark-compact (<b>major GC</b>). Used by HotSpot (G1, Parallel), .NET (gen 0/1/2 + LOH), V8 (Scavenger + Mark-Compact), Go is the notable non-generational exception.</p>
<p>The catch: an <b>old object can point to a young one</b>. A minor GC must treat those pointers as roots without scanning the whole old generation. The fix is a <b>write barrier</b> - a few instructions the compiler inserts on every pointer store - that records old→young pointers in a <b>remembered set</b> or <b>card table</b>.</p>
<p><b>Incremental and concurrent marking</b> use the <b>tri-color abstraction</b>: white = not yet seen (garbage if still white at the end), grey = seen but children not yet scanned (the worklist), black = scanned. The danger: while the GC runs, the program (the <b>mutator</b>) can store a pointer to a white object into a black object and delete the only other path to it - the white object would be freed while still in use. Write barriers keep the invariant: <b>Dijkstra / insertion barrier</b> shades the new target grey; <b>Yuasa / snapshot-at-the-beginning (SATB) barrier</b> shades the old value being overwritten (used by G1, Shenandoah, V8, Go's hybrid barrier). Concurrent <b>compaction</b> also needs read/load barriers (ZGC's coloured pointers, Shenandoah's forwarding) so the program always sees the moved copy.</p>
${H.table(['Collector family', 'Pause', 'Throughput', 'Memory overhead', 'Examples'], [['Stop-the-world mark-compact / parallel', 'long (scales with heap)', 'best', 'low', 'Parallel GC, .NET workstation non-concurrent'], ['Generational + mostly concurrent', 'short, regular', 'good', 'medium', 'G1 (Java default), .NET background GC, V8 Orinoco'], ['Fully concurrent, compacting', '&lt; 1 ms', 'lower (barriers)', 'higher', 'ZGC (generational since JDK 21), Shenandoah, Azul C4'], ['Concurrent, non-moving', 'sub-ms', 'good', 'tuned by GOGC', 'Go']])}`,
  clues: ['"Most objects die young" / "minor vs major GC" → generational collection', '"Stop-the-world pause", "p99 latency spikes every N seconds" → GC pause; consider concurrent collector, smaller young gen, fewer allocations', '"Tri-color marking", "write barrier", "concurrent GC correctness" → mutator invariant', '"Card table", "remembered set" → old-to-young pointers for minor GC', '"Throughput vs latency vs footprint" → pick 2 of 3 in GC tuning', '"Why does Go not compact?" / "ZGC coloured pointers" → design trade-offs between collectors'],
  code: [
    { lang: 'python', run: true, title: 'Cheney copying collector + generational promotion (runnable)', code: `from collections import deque

def cheney(roots, heap):
    """heap: name -> list of referenced names. Copy reachable objects to to-space (BFS)."""
    to_space, forward = [], {}              # forward = forwarding pointers left in from-space
    def copy(name):
        if name not in forward:
            forward[name] = len(to_space)   # new address = next free slot (bump pointer)
            to_space.append(name)
        return forward[name]
    new_roots = [copy(r) for r in roots]
    scan = 0                                 # Cheney's trick: to-space itself is the BFS queue
    while scan < len(to_space):
        for child in heap[to_space[scan]]:
            copy(child)
        scan += 1
    return to_space, new_roots

heap = {"A": ["B"], "B": ["C", "A"], "C": [], "D": ["E"], "E": ["D"], "F": []}
to_space, roots = cheney(["A", "F"], heap)
print("copied (compacted, in BFS order):", to_space)
print("left behind (garbage, never touched):", sorted(set(heap) - set(to_space)))

# Generational simulation: objects survive minor GCs until promoted after AGE_LIMIT.
AGE_LIMIT = 2
young, old, ages = {}, set(), {}
def minor_gc(live_young):
    global young
    survivors = {}
    for name in young:
        if name in live_young:
            ages[name] += 1
            if ages[name] >= AGE_LIMIT:
                old.add(name)               # promotion / tenuring
            else:
                survivors[name] = True
    dead = [n for n in young if n not in live_young]
    young = survivors
    return dead

for cycle, (allocs, live) in enumerate([
        (["req1", "tmp1", "tmp2", "cache"], {"cache", "req1"}),
        (["req2", "tmp3", "tmp4"], {"cache", "req2"}),
        (["req3", "tmp5"], {"req3"})]):
    for a in allocs:
        young[a] = True; ages[a] = 0
    dead = minor_gc(live)
    print(f"minor GC {cycle + 1}: freed {dead}, young now {sorted(young)}, old {sorted(old)}")
print("most young objects died young - exactly what the generational hypothesis predicts")` }
  ],
  codeTitle: ['Copying + generations'],
  viz: [{
    title: 'Incremental tri-color marking and the write barrier',
    input: 'roots: A ; A->B A->C C->D D->E ; 2 B E D ; barrier',
    inputLabel: 'roots ; edges ; after K scans the mutator does SRC.f = DST and deletes CUT->DST ; barrier | nobarrier',
    gen: function (input) {
      var p = String(input).split(';');
      if (p.length < 3) throw new Error('Format: roots: A ; A->B ... ; K SRC DST CUT ; barrier|nobarrier');
      var h = parseHeap(p[0] + ';' + p[1]), m = p[2].trim().split(/\s+/), k = Number(m[0]), useB = !/nobarrier/i.test(p[3] || 'barrier');
      if (m.length < 4 || isNaN(k) || k < 0 || k > 12) throw new Error('Mutation looks like: 2 B E D (after 2 scans, B.f = E, delete D->E)');
      [m[1], m[2], m[3]].forEach(function (x) { if (h.nodes.indexOf(x) < 0) throw new Error('Unknown object ' + x + ' in the mutation'); });
      var res = triColor(h, k, m[1], m[2], m[3], useB), other = triColor(h, k, m[1], m[2], m[3], !useB), f = [];
      var cls = { white: 'done', grey: 'cur', black: 'ok' };
      f.push(fr('Tri-color marking, one object scanned per step so the program can run in between. <b>White</b> (faded) = not reached yet, <b>grey</b> (amber) = reached but children not scanned, <b>black</b> (green) = done. Mode: <b>' + (useB ? 'with Dijkstra write barrier' : 'NO write barrier') + '</b>.', [heapGraph(h, h.nodes.reduce(function (o, n) { o[n] = 'done'; return o; }, {}))]));
      res.steps.forEach(function (s) {
        var hl = {}; Object.keys(s.color).forEach(function (n) { hl[n] = cls[s.color[n]]; });
        if (s.mut) { hl[m[2]] = s.color[m[2]] === 'white' ? 'bad' : hl[m[2]]; }
        var ehl = {}; if (s.mut) ehl[m[1] + '-' + m[2]] = 'bad';
        f.push(fr((s.mut ? '⚡ ' : '') + s.what, [heapGraph({ roots: h.roots, nodes: h.nodes, edges: s.edges }, hl, ehl), { type: 'queue', label: 'grey worklist', items: s.grey.length ? s.grey : ['(empty)'] }]));
      });
      var reach = {}, st = h.roots.slice();
      while (st.length) { var x = st.pop(); if (reach[x]) continue; reach[x] = 1; res.edges.forEach(function (e) { if (e[0] === x) st.push(e[1]); }); }
      var lost = h.nodes.filter(function (n) { return reach[n] && res.color[n] === 'white'; });
      var lostOther = h.nodes.filter(function (n) { return reach[n] && other.color[n] === 'white'; });
      var hlF = {}; h.nodes.forEach(function (n) { hlF[n] = res.color[n] === 'black' ? 'ok' : (reach[n] ? 'bad' : 'done'); });
      f.push(fr('Marking finished; white objects will be swept. ' + (lost.length ? '<span class="c-r"><b>BUG:</b> ' + esc(lost.join(', ')) + ' is still reachable but white - it would be freed while the program uses it (use-after-free / heap corruption).</span>' : '<span class="c-g">Correct:</span> every reachable object is black.') + ' For comparison, the run ' + (useB ? 'without' : 'with') + ' the barrier ' + (lostOther.length ? 'loses <b>' + esc(lostOther.join(', ')) + '</b>.' : 'is also safe for this input.') + ' Try switching the last field to <code>' + (useB ? 'nobarrier' : 'barrier') + '</code>.', [heapGraph({ roots: h.roots, nodes: h.nodes, edges: res.edges }, hlF), { type: 'map', label: 'final colours', entries: h.nodes.map(function (n) { return [n, res.color[n]]; }) }]));
      return f;
    }
  }],
  examples: [
    { title: 'Reading a GC log', html: `<pre>[gc] GC(42) Pause Young (Normal) (G1 Evacuation Pause) 512M-&gt;96M(1024M) 8.1ms
[gc] GC(57) Pause Full (Allocation Failure) 980M-&gt;870M(1024M) 2140ms</pre><p>Line 1: a healthy minor GC - most of eden was garbage, an 8 ms pause. Line 2: a full GC that freed only 110 MB and took 2 s - the old generation is nearly full of <b>live</b> data. That is a leak or an undersized heap, not a GC tuning problem. The JVM-specific flags and collectors are in the <i>JVM Internals</i> module.</p>` },
    { title: 'Card table in numbers', html: `<p>The old generation is divided into 512-byte cards with one byte each in a card table. The write barrier for <code>oldObj.field = youngObj</code> is roughly <code>cardTable[addr &gt;&gt; 9] = DIRTY</code> - one shift and one store. A minor GC scans only dirty cards (say 2,000 × 512 B = 1 MB) instead of a 4 GB old generation.</p>` },
    { title: 'Allocation rate drives GC cost', html: `${H.table(['Allocation rate', 'Young gen 256 MB', 'Minor GCs'], [['50 MB/s', 'fills in ~5 s', '~12 per minute'], ['500 MB/s', 'fills in ~0.5 s', '~120 per minute']])}<p>Reducing allocation (reusing buffers, avoiding boxing, streaming instead of materialising lists) is usually a bigger win than switching collectors. See <i>CLR Internals &amp; Performance</i> for allocation profiling in .NET.</p>` },
    { title: 'Go\'s choice', html: `<p>Go uses a concurrent, non-generational, non-moving tri-color mark-sweep with a hybrid write barrier, pauses usually well under 1 ms, and a single knob <code>GOGC</code> (heap growth % before the next GC) plus <code>GOMEMLIMIT</code>. It trades some throughput and memory for simplicity and low latency - and relies on escape analysis to keep many values on the stack.</p>` }
  ],
  deepDive: `<p><b>Safepoints.</b> The GC can only stop a thread at points where the JIT has recorded which stack slots and registers hold pointers (stack maps). Compiled code polls a page or flag at loop back-edges and method returns. A long counted loop without a safepoint poll can delay "time to safepoint" - all other threads wait - which shows up as GC pauses that are not GC work.</p>
<p><b>Barrier costs.</b> Card-marking barriers cost a few percent of throughput. SATB barriers do a load and a check on every reference store during marking. ZGC and Shenandoah add <b>load barriers</b> (check pointer colour bits on every reference read), costing ~5-15% throughput in exchange for sub-millisecond pauses that do not grow with heap size. Generational ZGC (JDK 21+, default mode since JDK 23) recovered much of that throughput.</p>
<p><b>Pause-less is not free.</b> Concurrent collectors need <b>headroom</b>: the program keeps allocating while the GC marks. If allocation outruns the collector you get an "allocation stall"/"to-space exhausted" and a fallback full GC. Rule of thumb: concurrent collectors want 2-3× the live set as heap. Escape analysis (allocating non-escaping objects on the stack or scalar-replacing them) removes work for every collector - see the JIT topic in <i>JVM Internals</i>.</p>
<p><b>Region-based heaps.</b> G1 splits the heap into equal regions and collects the regions with the most garbage first ("garbage first") to meet a pause-time goal. .NET has the Large Object Heap (objects ≥ 85,000 bytes, not compacted by default) and, since .NET 7, regions too. V8 uses a semi-space Scavenger for young objects and concurrent marking with parallel compaction for the old space.</p>`,
  aiEra: `<p><b>How AI changes this.</b> GC logs, JFR recordings and heap histograms are long and repetitive - ideal for an assistant to summarise ("pause p99 is driven by Full GCs after promotion failures"). AI inference services in managed languages (Java/Kotlin gateways, Node front-ends, Python orchestrators) are often allocation-heavy, and the GC concepts here explain their tail latency.</p>
<p><b>Where AI goes wrong:</b> it recommends copy-pasted JVM flag sets from 2015 (CMS is removed since JDK 14), suggests calling <code>System.gc()</code>/<code>GC.Collect()</code>, or claims a concurrent GC has zero cost. <b>You must own</b> the trade-off triangle (throughput, latency, footprint), the tri-color invariant, and how to measure before tuning.</p>`,
  problems: [{
    title: 'Simulate a Cheney Copying Collector', level: 'Hard', tags: ['garbage collection', 'BFS', 'forwarding pointers'], companies: ['Google', 'Oracle', 'Microsoft'],
    statement: `<p>Objects live in from-space at addresses <code>0..n-1</code>; <code>fields[i]</code> lists the addresses object <code>i</code> points to. Given the roots, produce the to-space layout (Cheney BFS order), the new addresses of the roots, and every object's fields <b>rewritten</b> to the new addresses. Objects that are not copied are garbage.</p>`,
    constraints: `<p>n ≤ 10<sup>6</sup>; cycles and shared objects are allowed; each object must be copied exactly once.</p>`,
    example: `<p>fields = [[2], [], [0, 3], []], roots = [2] → copy 2 (new 0), then scan it: 0 (new 1), 3 (new 2); scan old 0: points to 2 → already forwarded to 0. To-space = [old2, old0, old3] with fields [[1, 2], [0], []]. Object 1 is ${H.c('r', 'garbage')}.</p>`,
    brute: { why: `<p>First compute the reachable set with DFS, assign new addresses in any order, then make a second pass to rewrite all fields using a hash map from old to new address. Correct, but it uses an extra queue/stack and map; Cheney's insight is that to-space itself is the BFS queue and the forwarding pointer replaces the map, so the copy needs no extra memory.</p>` },
    mcq: { q: 'What prevents an object reachable through two paths from being copied twice?', options: ['A reference count', 'The forwarding pointer written into the old copy', 'Sorting the roots'], answer: 1, explain: 'When an object is first copied, its old location records the new address. Every later visit just reads it.' },
    hints: [`<p>Hint 1: keep two pointers into to-space: <code>free</code> (next slot to copy into) and <code>scan</code> (next copied object whose fields still point into from-space).</p>`, `<p>Hint 2: <code>forward(old)</code>: if old is already forwarded return the stored new address; otherwise copy it at <code>free++</code> and record the forwarding address.</p>`, `<p>Hint 3: forward the roots first, then while scan &lt; free rewrite each field of to-space[scan] with forward(field). Cycles terminate because forwarded objects are never copied again.</p>`],
    solution: {
      approach: `<p>Maintain <code>newAddr[old] = -1</code> (the forwarding pointers), <code>to</code> list, and <code>scan = 0</code>. <code>forward(o)</code>: if <code>newAddr[o] == -1</code>, set it to <code>len(to)</code> and append a copy of o's fields (still old addresses); return <code>newAddr[o]</code>. Forward every root. Then <code>while scan &lt; len(to)</code>: replace each field f of <code>to[scan]</code> with <code>forward(f)</code>, and increment scan. When scan catches up with free, everything reachable has been copied and every pointer rewritten; anything with <code>newAddr == -1</code> is garbage and is reclaimed by simply reusing all of from-space. The work is proportional to live objects and edges only - dead objects are never touched, which is why copying is ideal for a young generation where most objects are dead. The runnable <code>cheney</code> function in the lesson implements the same algorithm.</p>`,
      complexity: `<p>O(live objects + live pointers) time; to-space must be as large as from-space (2× memory).</p>`,
      followUps: ['Why does BFS order hurt locality, and how does depth-first / hierarchical copying help?', 'How would you add promotion to an old generation after 2 survivals?']
    }
  }]
});
/* ================= PRACTICE ARENA ================= */
function P(o) { practice.push(o); }
P({
  title: 'Name the Phase That Reports the Error', level: 'Easy', tags: ['compiler phases'], companies: ['Amazon', 'Microsoft'],
  statement: `<p>For each Java line, say which compiler phase rejects it: (1) <code>int x = 3 # 4;</code> (2) <code>int x = (3 + 4;</code> (3) <code>int x = y + 1;</code> with no <code>y</code> declared (4) <code>int x = "four";</code> (5) <code>int x = 1 / 0;</code></p>`,
  constraints: `<p>Phases: lexer, parser, name resolution, type checker, or none (compiles, fails at run time).</p>`,
  example: `<p>(1) ${H.c('r', 'lexer')} - <code>#</code> is not a legal Java character outside strings/comments.</p>`,
  brute: { why: `<p>Guessing "the compiler" for all of them misses the point: interviewers want to see you know what each phase can and cannot know. Case (5) in particular is not a compile error in Java - <code>javac</code> does not reject integer division by a constant zero.</p>` },
  mcq: { q: 'Which phase first knows that y was never declared?', options: ['Lexer', 'Parser', 'Semantic analysis (name resolution)'], answer: 2, explain: 'The parser sees a valid identifier; only the symbol table lookup fails.' },
  hints: [`<p>Hint 1: the lexer only sees characters, the parser only sees token order, the checker sees meaning.</p>`, `<p>Hint 2: ask for each line: is every character legal? is the token sequence grammatical? does every name exist? do the types fit?</p>`, `<p>Hint 3: some errors are only detectable at run time - think about which values the compiler actually evaluates.</p>`],
  solution: { approach: `<p>(1) <b>Lexer</b>: illegal character <code>#</code>. (2) <b>Parser</b>: expected <code>)</code> - all tokens are legal but their order violates the grammar. (3) <b>Name resolution</b> (semantic analysis): "cannot find symbol y". (4) <b>Type checker</b>: incompatible types, String cannot be converted to int. (5) <b>None at compile time</b>: <code>javac</code> accepts it (constant folding does not fold an expression that would throw), and the JVM throws <code>ArithmeticException: / by zero</code> when the line runs. Explaining why each phase is the first one with enough information to detect the problem is the real answer.</p>`, complexity: `<p>Conceptual - no algorithmic cost.</p>` }
});
P({
  title: 'Count Tokens by Hand (Maximal Munch)', level: 'Easy', tags: ['lexer', 'maximal munch'], companies: ['JetBrains', 'Google'],
  statement: `<p>Using C/Java/JS lexing rules, how many tokens are in each? (a) <code>x+++y</code> (b) <code>a&gt;&gt;=2</code> (c) <code>count1=count+1;</code> (d) <code>if(x&lt;=10)</code></p>`,
  constraints: `<p>Operators include <code>++ + &gt;&gt;= &gt;&gt; &gt;= &gt; &lt;= =</code>. Identifiers are letters followed by letters/digits.</p>`,
  example: `<p>(a) <code>x</code>, <code>++</code>, <code>+</code>, <code>y</code> = ${H.c('g', '4 tokens')}.</p>`,
  brute: { why: `<p>Splitting on every operator character (counting <code>x + + + y</code> as 5) ignores maximal munch; splitting only on spaces counts 1 token. Both are wrong.</p>` },
  mcq: { q: 'How does the lexer tokenize a&gt;&gt;=2?', options: ['a, &gt;, &gt;, =, 2', 'a, &gt;&gt;=, 2', 'a, &gt;&gt;, =, 2'], answer: 1, explain: 'Maximal munch takes the longest operator: the shift-assign operator.' },
  hints: [`<p>Hint 1: at each position, take the longest operator that the language defines.</p>`, `<p>Hint 2: identifiers continue through digits: <code>count1</code> is one token.</p>`, `<p>Hint 3: punctuation like ( ) ; are tokens too - do not forget them.</p>`],
  solution: { approach: `<p>(a) <code>x ++ + y</code> = <b>4</b>. (b) <code>a &gt;&gt;= 2</code> = <b>3</b>, the compound shift-assignment wins over <code>&gt;&gt;</code> then <code>=</code>. (c) <code>count1 = count + 1 ;</code> = <b>6</b>, the digit continues the identifier. (d) <code>if ( x &lt;= 10 )</code> = <b>6</b>, <code>if</code> is a keyword by priority and <code>&lt;=</code> is one token by maximal munch. The general recipe: scan left to right; at each point try the longest matching rule; on ties, the earlier (keyword) rule wins.</p>`, complexity: `<p>O(n) per string, one pass left to right.</p>` }
});
P({
  title: 'Draw the AST and Evaluate', level: 'Easy', tags: ['AST', 'precedence', 'associativity'], companies: ['Meta', 'Bloomberg'],
  statement: `<p>Draw the AST and give the value for: (a) <code>2 + 3 * 4 - 5</code> (b) <code>20 / 5 / 2</code> (c) <code>2 ^ 2 ^ 3</code> (d) <code>-2 ^ 2</code> using maths conventions (^ binds tighter than unary minus, and is right-associative).</p>`,
  constraints: `<p>Integer arithmetic. * and / are left-associative.</p>`,
  example: `<p>(a) <code>(- (+ 2 (* 3 4)) 5)</code> = ${H.c('g', '9')}.</p>`,
  brute: { why: `<p>Evaluating strictly left to right gives (a) 15 and (c) 64 - both wrong, because they ignore precedence and right associativity.</p>` },
  mcq: { q: 'What is 20 / 5 / 2 with left associativity?', options: ['8', '2', '1'], answer: 1, explain: '(20 / 5) / 2 = 4 / 2 = 2. Right-assoc would give 20 / 2.5 → 8 in real numbers.' },
  hints: [`<p>Hint 1: higher-precedence operators sit deeper in the tree.</p>`, `<p>Hint 2: left-assoc chains lean left: ((a op b) op c); right-assoc chains lean right.</p>`, `<p>Hint 3: in the maths convention unary minus applies to the whole power: -(2^2).</p>`],
  solution: { approach: `<p>(a) <code>(2 + (3 * 4)) - 5</code> = 14 - 5 = <b>9</b>; the tree root is <code>-</code> because + and - are left-associative and the * subtree sits under +. (b) <code>(20 / 5) / 2</code> = <b>2</b>, the tree leans left. (c) <code>2 ^ (2 ^ 3)</code> = 2<sup>8</sup> = <b>256</b>, the tree leans right (left-assoc would be 4<sup>3</sup> = 64). (d) <code>-(2 ^ 2)</code> = <b>-4</b>, as in Python where <code>-2**2 == -4</code>. In a grammar: unary → '-' unary | power and power → primary ('^' unary)? encode exactly these rules.</p>`, complexity: `<p>Linear in expression size.</p>` }
});
P({
  title: 'Evaluate Reverse Polish Notation (a Stack VM in Disguise)', level: 'Easy', tags: ['stack', 'stack machine'], companies: ['Amazon', 'LinkedIn'],
  statement: `<p>Evaluate an RPN token list like <code>["2","1","+","3","*"]</code> with <code>+ - * /</code> (division truncates toward zero). Explain why this is exactly what a stack-based VM like the JVM does.</p>`,
  constraints: `<p>1 ≤ tokens ≤ 10<sup>4</sup>; the expression is valid.</p>`,
  example: `<p><code>2 1 + 3 *</code> → push 2, push 1, add → 3, push 3, mul → ${H.c('g', '9')}.</p>`,
  brute: { why: `<p>Converting back to an infix string and evaluating it re-introduces parsing and precedence problems that RPN was designed to remove.</p>` },
  mcq: { q: 'Operands are a then b in RPN "a b -". After popping, which is the right operand?', options: ['The first value popped', 'The second value popped', 'Whichever is larger'], answer: 0, explain: 'b was pushed last so it is popped first; compute a - b with a = second pop.' },
  hints: [`<p>Hint 1: numbers push, operators pop two and push one.</p>`, `<p>Hint 2: pop the right operand first, then the left.</p>`, `<p>Hint 3: truncate toward zero for negative division (int(a / b) in Python, not //).</p>`],
  solution: { approach: `<p>Scan tokens; on a number push it; on an operator pop <code>b</code> then <code>a</code> and push <code>a op b</code>; the answer is the single remaining value. RPN is the post-order traversal of the AST, which is the order a compiler emits stack bytecode: <code>iload a; iload b; isub</code> in the JVM, <code>ldarg; ldarg; sub</code> in .NET IL, <code>LOAD_FAST; LOAD_FAST; BINARY_OP</code> in CPython. The VM's operand stack plays the role of your stack, and the JVM verifier checks statically that each instruction finds enough operands.</p>`, complexity: `<p>O(n) time, O(n) stack.</p>` }
});
P({
  title: 'Infix to Bytecode with the Shunting-Yard Algorithm', level: 'Medium', tags: ['shunting-yard', 'stack', 'compilation'], companies: ['Google', 'Citadel'],
  statement: `<p>Convert an infix expression with <code>+ - * / ^ ( )</code>, numbers and names into stack bytecode (<code>PUSH</code>/<code>LOAD</code>/<code>ADD</code>...) without building an AST. <code>^</code> is right-associative.</p>`,
  constraints: `<p>|s| ≤ 10<sup>5</sup>; nesting may be deep (no recursion).</p>`,
  example: `<p><code>a + b * (c - 2)</code> → ${H.c('g', 'LOAD a, LOAD b, LOAD c, PUSH 2, SUB, MUL, ADD')}.</p>`,
  brute: { why: `<p>Build an AST with recursive descent, then post-order emit. Perfectly fine, but deep nesting risks recursion limits and the interviewer may ask for the stack-based version.</p>` },
  mcq: { q: 'When an incoming operator has the SAME precedence as the stack top and is left-associative, you…', options: ['Pop the top first, then push the new one', 'Push the new one on top', 'Throw an error'], answer: 0, explain: 'Left associativity means the earlier operator is applied first, so it must be emitted first.' },
  hints: [`<p>Hint 1: operands go straight to the output; operators wait on an operator stack.</p>`, `<p>Hint 2: before pushing an operator, pop operators with higher precedence, or equal precedence when the new one is left-associative.</p>`, `<p>Hint 3: '(' is pushed; ')' pops until '('. At the end pop everything. Map each popped operator to its opcode.</p>`],
  solution: { approach: `<p>Dijkstra's shunting-yard: for each token, a number emits <code>PUSH k</code>, a name emits <code>LOAD x</code>. For an operator <code>o</code>: while the stack top is an operator <code>t</code> with <code>prec(t) &gt; prec(o)</code>, or <code>prec(t) == prec(o)</code> and <code>o</code> is left-associative, pop <code>t</code> and emit its opcode; then push <code>o</code>. '(' is pushed; ')' pops and emits until the matching '(' (error if none). At the end pop and emit everything (error on a leftover '('). The output is the post-order of the AST, i.e. valid stack-VM code, produced in one pass with an explicit stack - no recursion, O(n).</p>`, complexity: `<p>O(n) time, O(n) operator stack.</p>`, followUps: ['How do you support unary minus?', 'How would you add function calls with argument counts?'] }
});
P({
  title: 'Detect Use of Undeclared Variables Across Nested Scopes', level: 'Medium', tags: ['scopes', 'symbol table'], companies: ['Microsoft', 'Atlassian'],
  statement: `<p>A program is a list of lines: <code>{</code>, <code>}</code>, <code>let NAME</code>, or <code>use NAME</code>. Report every <code>use</code> of a name that is not visible (declared in the current or an enclosing open block, earlier in the program). Also report a <code>let</code> that redeclares a name in the <b>same</b> block.</p>`,
  constraints: `<p>Up to 10<sup>5</sup> lines; nesting depth up to 10<sup>4</sup>.</p>`,
  example: `<p><code>let a; { let b; use a; } use b;</code> → ${H.c('r', 'error: b not visible at the last line')} (its block closed).</p>`,
  brute: { why: `<p>For each use, scan backward through all earlier lines tracking brace depth to see if a matching declaration is still open: O(n) per use, O(n<sup>2</sup>) total.</p>` },
  mcq: { q: 'Shadowing (inner block declaring a name that also exists outside) should be…', options: ['Reported as a redeclaration error', 'Allowed: lookup finds the inner one', 'Undefined'], answer: 1, explain: 'Only redeclaring in the SAME scope is an error in most languages (Java forbids shadowing locals with locals, a stricter rule).' },
  hints: [`<p>Hint 1: model scopes as a stack of sets.</p>`, `<p>Hint 2: for O(1) lookup keep a counter per name of how many open scopes declare it.</p>`, `<p>Hint 3: on '}' remove the block's names (decrement counters). A name is visible iff its counter is &gt; 0.</p>`],
  solution: { approach: `<p>Keep <code>blocks</code>, a stack of sets (start with a global set) and <code>visible</code>, a dict name → number of open blocks that declare it. <code>{</code> pushes an empty set. <code>let x</code>: if x is in the top set, report redeclaration; else add it and increment <code>visible[x]</code>. <code>use x</code>: report if <code>visible.get(x, 0) == 0</code>. <code>}</code>: pop the set and decrement each of its names (error if popping the global block). Every name is added and removed once, so the whole pass is O(n). This is the semantic-analysis pass of a compiler, and the same idea powers "unused variable" and "use before definition" lints.</p>`, complexity: `<p>O(n) time, O(number of declarations) space.</p>` }
});
P({
  title: 'Common Subexpression Elimination in a Basic Block', level: 'Medium', tags: ['optimization', 'CSE', 'hashing'], companies: ['NVIDIA', 'Apple'],
  statement: `<p>A basic block is a list of three-address instructions <code>dst = a op b</code>. Remove recomputations: if <code>a op b</code> was already computed into some variable and neither <code>a</code>, <code>b</code> nor that variable has been reassigned since, replace the instruction with <code>dst = thatVar</code>. Treat <code>+</code> and <code>*</code> as commutative.</p>`,
  constraints: `<p>Up to 10<sup>5</sup> instructions in the block; no control flow inside it.</p>`,
  example: `<p><code>t1 = x + y; t2 = y + x; x = 5; t3 = x + y</code> → t2 becomes ${H.c('g', 't2 = t1')}, but t3 must ${H.c('r', 'stay')} because x changed.</p>`,
  brute: { why: `<p>For each instruction scan all earlier ones for the same expression, then scan the instructions in between for reassignments: O(n<sup>2</sup>).</p>` },
  mcq: { q: 'After x = 5, which table entries must be invalidated?', options: ['None', 'Every expression that uses x as an operand, and any entry whose result variable is x', 'All entries'], answer: 1, explain: 'Expressions reading the old x are stale, and an entry stored in x no longer holds its value.' },
  hints: [`<p>Hint 1: keep a hash map from a normalised key (op, a, b) to the variable that holds it ("available expressions").</p>`, `<p>Hint 2: normalise commutative ops by sorting the operands.</p>`, `<p>Hint 3: on every assignment to v, delete entries that read v or are stored in v - keep an index from variable to keys for O(1) amortised invalidation.</p>`],
  solution: { approach: `<p>Local value numbering in its simplest form. Walk the block with <code>avail: key → var</code> and <code>uses: var → set of keys</code>. For <code>dst = a op b</code>: build the key (sort a and b for + and *). If the key is in <code>avail</code>, rewrite the instruction to a copy <code>dst = avail[key]</code>. Then, because <code>dst</code> is being overwritten, remove every key in <code>uses[dst]</code> and every key whose holder is <code>dst</code>. Finally, if the instruction was not a copy, record <code>avail[key] = dst</code> (unless dst is a or b) and add the key to <code>uses[a]</code>, <code>uses[b]</code>. A follow-up copy-propagation and dead-code pass then deletes the now-unused copies. In SSA form invalidation disappears entirely because variables are never reassigned - one reason compilers love SSA.</p>`, complexity: `<p>O(n) expected time with hashing.</p>`, followUps: ['How does global value numbering extend this across blocks?', 'Why is CSE across a function call unsafe for memory loads?'] }
});
P({
  title: 'Reference Counting: Find What Leaks', level: 'Medium', tags: ['reference counting', 'cycles', 'graph'], companies: ['Apple', 'Dropbox'],
  statement: `<p>Objects and their strong references are given, plus the root set. All roots are dropped. Under pure reference counting with cascading frees, which objects are freed and which leak? Return the leaked set.</p>`,
  constraints: `<p>n ≤ 10<sup>5</sup> objects, m ≤ 5·10<sup>5</sup> references. References may form cycles; an object can be referenced many times.</p>`,
  example: `<p>Root → A, A → B, B → C, C → B, A → D. Drop the root: A frees, D frees, B's count goes 2 → 1, so ${H.c('r', 'B and C leak')}.</p>`,
  brute: { why: `<p>Assuming "everything unreachable is freed" is the tracing-GC answer, not the RC one. Simulating decrements recursively works but can overflow the stack on long chains.</p>` },
  mcq: { q: 'An object that is NOT on a cycle but is referenced only by a leaked cycle…', options: ['Is freed', 'Also leaks', 'Depends on allocation order'], answer: 1, explain: 'Its count never drops because the cycle that references it is never freed.' },
  hints: [`<p>Hint 1: compute initial counts = in-degree (+1 for each root reference).</p>`, `<p>Hint 2: drop the roots, then run a queue (Kahn-style): any object reaching 0 is freed and decrements its children.</p>`, `<p>Hint 3: whatever never reaches 0 leaks - cycles plus everything hanging off them. It is exactly a topological-sort leftover.</p>`],
  solution: { approach: `<p>Count in-degrees including root references. Decrement for each root; push every object reaching 0 onto a queue. Pop an object, mark it freed, and decrement each child (once per reference), pushing children that reach 0. This is Kahn's topological-sort algorithm on the reference graph: the leftover objects are exactly those on a cycle or reachable only from a cycle, i.e. the RC leak set. A tracing collector would free all of them (none are reachable). Fixes in practice: weak references for back-pointers (Swift <code>weak</code>, Rust <code>Weak</code>, <code>std::weak_ptr</code>) or a backup cycle collector (CPython).</p>`, complexity: `<p>O(n + m) time and space.</p>` }
});
P({
  title: 'Choose an Execution Strategy', level: 'Medium', tags: ['interpreter', 'JIT', 'AOT'], companies: ['AWS', 'Cloudflare', 'Vercel'],
  statement: `<p>For each workload choose interpreter, bytecode VM, JIT or AOT, and justify: (a) a CLI tool that runs for 200 ms; (b) a trading service that runs for weeks and is CPU-bound; (c) a serverless function with strict cold-start limits; (d) a rules DSL that product managers edit at run time; (e) user scripts in a game on iOS.</p>`,
  constraints: `<p>Consider start-up, peak speed, memory, safety and platform rules.</p>`,
  example: `<p>(a) → ${H.c('g', 'AOT or a fast-starting VM')}; a JIT never warms up in 200 ms.</p>`,
  brute: { why: `<p>"JIT is always fastest" ignores warm-up time, memory, compile threads competing for CPU and platforms that forbid writable+executable memory.</p>` },
  mcq: { q: 'Why may a JIT beat an AOT compiler on a long-running service?', options: ['It has run-time profiles to specialise and inline on', 'Machine code from a JIT is a different instruction set', 'It skips type checks'], answer: 0, explain: 'Observed types, branch frequencies and hot call targets allow speculative optimisation, with deoptimisation as the safety net.' },
  hints: [`<p>Hint 1: draw a time axis: compile cost is paid up front (AOT), lazily (JIT) or never (interpreter).</p>`, `<p>Hint 2: ask who writes the code and when it changes - code that changes at run time cannot be fully AOT-compiled.</p>`, `<p>Hint 3: remember platform constraints such as no JIT on iOS for third-party engines.</p>`],
  solution: { approach: `<p>(a) <b>AOT</b> (Go, Rust, GraalVM native image, .NET Native AOT) or a VM with a start-up snapshot - the run ends before a JIT pays off. (b) <b>Tiered JIT</b> (HotSpot C2, RyuJIT) or well-optimised AOT with PGO: profiles enable inlining and devirtualisation; warm-up is irrelevant over weeks (pre-warm before taking traffic). (c) <b>AOT</b> or snapshot/CDS-style caches; a cold JIT start costs hundreds of ms. (d) A <b>tree-walking interpreter or bytecode VM</b>: rules are small, change often and need sandboxing; compile to bytecode if rule evaluation becomes hot. (e) A <b>bytecode interpreter</b> (e.g. Lua or a Wasm interpreter) because iOS forbids third-party JIT; optimise with a fast dispatch loop and superinstructions.</p>`, complexity: `<p>Design trade-off - no algorithmic cost.</p>` }
});
P({
  title: 'Recursive-Descent Parser for a Statement Language', level: 'Hard', tags: ['parsing', 'grammar', 'AST'], companies: ['Google', 'Stripe', 'Databricks'],
  statement: `<p>Write a grammar and a recursive-descent parser for: <code>let x = expr;</code>, <code>x = expr;</code>, <code>print expr;</code>, <code>if (expr) { stmts } else { stmts }</code>, <code>while (expr) { stmts }</code>, with expressions supporting <code>|| &amp;&amp; == != &lt; &lt;= + - * / !</code> and unary minus at the usual precedences. Produce an AST and report the first syntax error with line and column.</p>`,
  constraints: `<p>Source ≤ 10<sup>5</sup> characters. else is optional (dangling else not possible because braces are required).</p>`,
  example: `<p><code>while (i &lt; 10) { i = i + 1; }</code> → ${H.c('g', 'While(Lt(Var i, 10), [Assign(i, Add(Var i, 1))])')}.</p>`,
  brute: { why: `<p>Regex-matching each statement line by line breaks on nested blocks and expressions spanning lines; a parser generator works but the interviewer wants to see you derive precedence from the grammar.</p>` },
  mcq: { q: 'How many expression functions does a precedence ladder with || , &amp;&amp;, equality, comparison, additive, multiplicative, unary, primary need?', options: ['1', '8 (one per level)', 'As many as there are operators (13)'], answer: 1, explain: 'One function per precedence level; operators of equal precedence share a level.' },
  hints: [`<p>Hint 1: statements dispatch on the first token: let, print, if, while, or an identifier followed by '='.</p>`, `<p>Hint 2: expressions are a precedence ladder: or → and → equality → comparison → additive → multiplicative → unary → primary, each a loop over its operators.</p>`, `<p>Hint 3: have <code>expect(kind)</code> raise "line L col C: expected X, found Y"; tokens should carry positions from the lexer.</p>`],
  solution: { approach: `<p>Grammar: <code>program → stmt*</code>; <code>stmt → 'let' ID '=' expr ';' | ID '=' expr ';' | 'print' expr ';' | 'if' '(' expr ')' block ('else' block)? | 'while' '(' expr ')' block</code>; <code>block → '{' stmt* '}'</code>; then the expression ladder <code>or → and ('||' and)*</code>, <code>and → eq ('&amp;&amp;' eq)*</code>, <code>eq → cmp (('=='|'!=') cmp)*</code>, <code>cmp → add (('&lt;'|'&lt;=') add)*</code>, <code>add → mul (('+'|'-') mul)*</code>, <code>mul → unary (('*'|'/') unary)*</code>, <code>unary → ('!'|'-') unary | primary</code>, <code>primary → NUM | ID | '(' expr ')'</code>. Implement one method per rule with a shared token cursor; loops give left associativity. The lexer attaches line/column to each token so <code>expect</code> can produce precise errors. The AST uses node classes (Let, Assign, Print, If, While, Binary, Unary, Num, Var). Everything is LL(1) - one token of lookahead decides every choice except ID at the start of a statement, which is always an assignment here - so parsing is O(n).</p>`, complexity: `<p>O(n) tokens, O(nesting depth) recursion.</p>`, followUps: ['Add panic-mode error recovery so you can report several errors.', 'Compile the AST to the stack VM with JZ/JMP for if/while.'] }
});
P({
  title: 'Compile if/while to Stack Bytecode with Backpatching', level: 'Hard', tags: ['code generation', 'bytecode', 'control flow'], companies: ['Oracle', 'Microsoft', 'Bloomberg'],
  statement: `<p>Given the AST from the previous problem, emit code for the stack VM (<code>PUSH, LOAD, STORE, ADD, SUB, MUL, LT, JMP t, JZ t, PRINT</code>). Jump targets for forward jumps are not known when the jump is emitted - handle it with <b>backpatching</b>.</p>`,
  constraints: `<p>Single pass over the AST; nested if/while arbitrarily deep.</p>`,
  example: `<p><code>while (i &lt; 3) { i = i + 1; }</code> → ${H.c('g', '0: LOAD i, 1: PUSH 3, 2: LT, 3: JZ 9, 4: LOAD i, 5: PUSH 1, 6: ADD, 7: STORE i, 8: JMP 0')} (9 = first instruction after the loop).</p>`,
  brute: { why: `<p>Two passes - first compute the size of every subtree to know the targets, then emit - works but duplicates logic. Using symbolic labels plus a final resolution pass is fine too; backpatching is the classic single-pass technique.</p>` },
  mcq: { q: 'Where does the JMP at the end of a while body jump to?', options: ['The first instruction after the loop', 'The start of the condition', 'The start of the body'], answer: 1, explain: 'The condition must be re-evaluated each iteration; JZ exits the loop when it is false.' },
  hints: [`<p>Hint 1: expressions compile post-order; statements compile in order; STORE pops into a variable.</p>`, `<p>Hint 2: emit <code>JZ ?</code>, remember its index, compile the body, then set the operand to the current code length.</p>`, `<p>Hint 3: while: start = len(code); cond; jz = emit JZ; body; emit JMP start; patch jz. if/else: cond; JZ → else; then; JMP → end; patch; else; patch end.</p>`],
  solution: { approach: `<p>Recursive <code>gen(node)</code> appending to a code list. Expressions: post-order (operands, then the opcode). <code>Let/Assign</code>: gen(expr), <code>STORE x</code>. <code>Print</code>: gen(expr), <code>PRINT</code>. <code>While</code>: <code>start = len(code)</code>; gen(cond); <code>j = emit('JZ', None)</code>; gen(body); emit <code>JMP start</code>; <code>code[j] = ('JZ', len(code))</code>. <code>If</code>: gen(cond); <code>j1 = emit JZ</code>; gen(then); if there is an else: <code>j2 = emit JMP</code>, patch j1 to here, gen(else), patch j2 to here; otherwise just patch j1. Each instruction is emitted once and patched at most once: O(size of AST). This is how simple compilers (and javac for its goto/if* bytecodes) handle forward branches; LLVM-style compilers instead build basic blocks and a CFG and assign addresses at the end.</p>`, complexity: `<p>O(AST size) time and code size.</p>`, followUps: ['Add break/continue (keep a stack of pending break jumps per loop).', 'Add short-circuit && and || using jumps.'] }
});
P({
  title: 'Design a GC for a Low-Latency Service', level: 'Hard', tags: ['garbage collection', 'design', 'latency'], companies: ['Jane Street', 'Netflix', 'Uber'],
  statement: `<p>You run a JVM/.NET/Go service: 16 GB heap, 4 GB live data, allocation rate 1 GB/s, p99 latency target 10 ms; stop-the-world full GCs of 2 s occur every hour. Explain the root causes you would check, which collector design you would choose and why, and what you would change in the application.</p>`,
  constraints: `<p>Hardware can grow memory by at most 50%; you cannot rewrite the service in another language.</p>`,
  example: `<p>A 2 s pause with "Pause Full ... 15.8G-&gt;14.9G" means the old generation is ${H.c('r', 'mostly live')} - tuning will not help until the live set or promotion rate shrinks.</p>`,
  brute: { why: `<p>"Just add <code>-Xmx32g</code>" makes full GCs rarer but each one longer (mark and compact scale with live data/heap), and does nothing about the allocation rate that causes promotion. Calling <code>System.gc()</code> at night only moves the pause.</p>` },
  mcq: { q: 'Which collector property removes pauses that scale with heap size?', options: ['Bigger young generation', 'Concurrent marking AND concurrent compaction (load/read barriers)', 'More GC threads in a stop-the-world collector'], answer: 1, explain: 'Without concurrent compaction (ZGC, Shenandoah, C4), fragmentation eventually forces a stop-the-world compaction.' },
  hints: [`<p>Hint 1: read the GC log: which pauses, how much freed, how much promoted per minor GC.</p>`, `<p>Hint 2: separate "too much garbage" (allocation rate) from "too much live data" (leak, caches) from "collector choice" (pause model).</p>`, `<p>Hint 3: concurrent collectors need headroom (2-3× live) and cost throughput via barriers; size accordingly and fix allocation hot spots first.</p>`],
  solution: { approach: `<p><b>Diagnose:</b> GC logs/JFR (or <code>dotnet-counters</code>, Go <code>GODEBUG=gctrace=1</code>) to see pause types, promotion rate, and live set after full GC. A heap histogram/dump checks whether 4 GB live is expected or a leak (unbounded caches, listeners, thread-locals). <b>Reduce allocation:</b> profile allocation sites, remove boxing, reuse buffers, stream instead of materialising, avoid large temporary arrays (LOH in .NET). Lower allocation means fewer minor GCs and less premature promotion. <b>Collector:</b> choose a concurrent compacting collector - generational ZGC or Shenandoah on the JVM (sub-ms pauses independent of heap size), .NET server GC with background GC (and consider regions/DATAS settings), Go with tuned <code>GOGC</code>/<code>GOMEMLIMIT</code>. Give it headroom: 4 GB live → 12-16 GB heap is reasonable. <b>Verify</b> with a load test measuring p99 and CPU (barriers cost a few percent throughput). Also check time-to-safepoint and container CPU limits starving concurrent GC threads.</p>`, complexity: `<p>Design - collectors trade throughput, latency and memory footprint.</p>` }
});
P({
  title: 'Prove the Tri-Color Invariant Breaks Without a Barrier', level: 'Hard', tags: ['concurrent GC', 'tri-color', 'write barrier'], companies: ['Google', 'Azul', 'Microsoft'],
  statement: `<p>Construct the smallest heap and interleaving of mutator and incremental collector steps where a reachable object is freed when no write barrier is used. Then show how (a) a Dijkstra insertion barrier and (b) a Yuasa/SATB deletion barrier each prevent it.</p>`,
  constraints: `<p>Collector scans one grey object per step; the mutator may run between steps; use the strong tri-color invariant: no black → white pointer.</p>`,
  example: `<p>Roots → A; A → B; B → C. Scan A (A black, B grey). Mutator: <code>A.f = C</code>; <code>B.g = null</code>. Scan B: no children. C stays white but A points to it → ${H.c('r', 'freed while live')}.</p>`,
  brute: { why: `<p>Hand-waving "the GC might miss things" is not enough; the interviewer wants the exact two conditions (black→white pointer created AND the last grey→white path destroyed) and how each barrier breaks one of them.</p>` },
  mcq: { q: 'An SATB (deletion) barrier, on <code>B.g = null</code>, does what?', options: ['Shades the new value', 'Shades the OLD value (C) being overwritten, so the snapshot stays marked', 'Stops the mutator until marking ends'], answer: 1, explain: 'Snapshot-at-the-beginning keeps everything that was reachable when marking started; overwritten referents are logged and marked.' },
  hints: [`<p>Hint 1: a white object is lost only if (1) a black object gets a pointer to it, and (2) every grey path to it is cut before the collector follows it.</p>`, `<p>Hint 2: three objects are enough: root object A, B and C.</p>`, `<p>Hint 3: insertion barrier breaks condition (1) by shading the new target; deletion barrier breaks condition (2) by shading the old target.</p>`],
  solution: { approach: `<p>Heap: root → A → B → C. Step 1: collector scans A: A black, B grey, C white. Mutator: <code>A.f = C</code> (black → white pointer) and <code>B.g = null</code> (removes the only grey path to C). Step 2: collector scans B, finds nothing; grey set empty; marking ends. C is white, gets swept, yet A.f still points to it → use-after-free. <b>(a) Dijkstra insertion barrier:</b> on <code>A.f = C</code>, if C is white shade it grey; condition (1) never holds (strong invariant). Cost: barrier on every store, and stacks must be rescanned at the end because stack writes usually have no barrier. <b>(b) Yuasa/SATB deletion barrier:</b> on <code>B.g = null</code>, shade the old value C before overwriting; everything reachable at the start of marking stays marked (weak invariant), new objects are allocated black. G1, Shenandoah and V8 use SATB; Go uses a hybrid of both so stacks need no rescan.</p>`, complexity: `<p>Barriers add O(1) work per pointer store during marking.</p>` }
});
/* ================= QUIZ ================= */
// Options are rotated deterministically so the correct answer is not always in the same position.
function Q(q, options, answer, explain) {
  var n = options.length, k = (quiz.length * 2 + 1) % n;
  var rot = options.slice(k).concat(options.slice(0, k));
  quiz.push({ q: q, options: rot, answer: (answer - k + n) % n, explain: explain });
}
Q('Which phase turns the characters <code>x1 &gt;= 42</code> into <code>ID(x1) OP(&gt;=) NUM(42)</code>?', ['Parser', 'Lexer (scanner)', 'Type checker', 'Code generator'], 1, 'The lexer groups characters into tokens using maximal munch; the parser only ever sees tokens.');
Q('Why can a lexer not check that parentheses are balanced?', ['It is too slow', 'Token patterns are regular languages; matching nesting needs unbounded counting (a stack)', 'Parentheses are removed before lexing', 'It can, using maximal munch'], 1, 'Finite automata cannot count to an unbounded depth. Context-free grammars and a parser (with a stack or recursion) handle nesting.');
Q('In a recursive-descent parser, what gives <code>*</code> higher precedence than <code>+</code>?', ['Checking for * first in the token stream', 'The function for * (term) is called from inside the function for + (expr)', 'A precedence table in the lexer', 'Evaluating right to left'], 1, 'Precedence comes from nesting: the inner rule finishes its operators before control returns to the outer one.');
Q('A grammar rule <code>expr → expr "+" term</code> in a recursive-descent parser causes…', ['Right associativity', 'Infinite recursion (left recursion)', 'Faster parsing', 'An ambiguous grammar error at compile time'], 1, 'expr() calls expr() without consuming a token. Rewrite as term ("+" term)* with a loop.');
Q('What does <code>2 ^ 3 ^ 2</code> evaluate to with right-associative ^?', ['64', '512', '36', '12'], 1, '2 ^ (3 ^ 2) = 2 ^ 9 = 512. Left associativity would give (2^3)^2 = 64.');
Q('Python evaluates <code>"5" * 2</code> to <code>"55"</code> and JavaScript to <code>10</code>. Which description fits?', ['Both static and weak', 'Both dynamic; JS coerces implicitly (weaker), Python only uses defined operations', 'Python static, JS dynamic', 'Both strong and static'], 1, 'Both check at run time (dynamic). JS converts "5" to 5 (weak/implicit coercion); Python has str * int defined as repetition but refuses str + int.');
Q('A symbol table for nested block scopes is most naturally…', ['A single global hash map', 'A stack of hash maps searched from innermost outward', 'A sorted array of names', 'A trie of keywords'], 1, 'Entering a block pushes, leaving pops, lookup goes innermost first - giving lexical scoping and shadowing.');
Q('What is SSA form?', ['A register allocation algorithm', 'An IR where every variable is assigned exactly once, with φ-functions at control-flow merges', 'A garbage collection barrier', 'A kind of bytecode verifier'], 1, 'Static single assignment makes def-use chains explicit, simplifying constant propagation, CSE and dead code elimination.');
Q('Which optimisation is NOT always safe?', ['Folding 2 * 3 to 6', 'Rewriting <code>x * 0</code> to 0 when x is a float', 'Removing an unused pure computation', 'Reusing an identical pure subexpression in the same block'], 1, 'For floats, NaN * 0 is NaN and -5.0 * 0 is -0.0. It is only safe for integers (and pure x).');
Q('Stack bytecode for <code>a - b * c</code> is…', ['LOAD a, LOAD b, SUB, LOAD c, MUL', 'LOAD a, LOAD b, LOAD c, MUL, SUB', 'MUL b c, SUB a', 'LOAD c, LOAD b, MUL, LOAD a, SUB'], 1, 'Post-order traversal of the AST: operands before operators, with the multiplication nested inside the subtraction.');
Q('Why do JIT-compiled runtimes (JVM, V8, .NET) have a warm-up period?', ['The garbage collector is disabled at start', 'Code starts interpreted/baseline-compiled while profiles are gathered; optimised code arrives later', 'Bytecode must be downloaded', 'The OS loads machine code lazily'], 1, 'Tiered compilation trades start-up for peak speed: interpret, profile, then compile hot code with speculative optimisations.');
Q('What happens on deoptimisation?', ['The program crashes', 'A failed speculation guard sends execution back to the interpreter / less optimised code', 'The GC compacts the heap', 'The JIT deletes all compiled code in the process'], 1, 'Optimised code assumed something (a type, a shape); when a guard fails the frame is rebuilt for the interpreter and the method may be recompiled.');
Q('Which garbage can pure reference counting NOT reclaim?', ['Large objects', 'Unreachable cycles of objects', 'Objects referenced by globals', 'Short-lived objects'], 1, 'In a cycle every object keeps a count of at least 1 from its neighbour, even when nothing outside can reach it.');
Q('In mark-sweep, the mark phase cost is proportional to ___ and the sweep phase to ___.', ['heap size; live data', 'live (reachable) data; heap size', 'number of roots; number of pointers', 'allocation rate; pause time'], 1, 'Marking traverses only reachable objects; sweeping visits every object or bitmap entry in the heap.');
Q('Why is a young-generation copying collection usually cheap?', ['It runs on a separate core', 'Its cost is proportional to survivors, and most young objects are already dead', 'It never touches roots', 'It skips write barriers'], 1, 'Copying collectors only touch live objects; the generational hypothesis says few young objects survive.');
Q('What does a write barrier do in a concurrent or generational GC?', ['Blocks all writes during GC', 'Runs a little code on pointer stores to record old→young pointers or preserve the tri-color invariant', 'Encrypts heap memory', 'Flushes CPU caches'], 1, 'Card marking/remembered sets for generational GC; shading new (Dijkstra) or old (SATB) referents for concurrent marking.');
/* ================= INTERVIEW ================= */
function I(level, q, a, followUps) { interview.push({ q: q, a: a, level: level, followUps: followUps }); }
I('B', 'Walk me through what happens between writing source code and the CPU executing it.', `<p>A compiler or runtime works as a pipeline. The <b>lexer</b> turns characters into tokens. The <b>parser</b> checks the grammar and builds an <b>AST</b>. <b>Semantic analysis</b> resolves names with symbol tables and type-checks. The front end then lowers the AST into an <b>IR</b> (three-address code, usually in SSA form), where target-independent <b>optimisations</b> run (inlining, constant folding, CSE, dead code elimination, loop optimisations). The <b>back end</b> does instruction selection, register allocation and scheduling and emits machine code (C, Rust, Go) or bytecode (Java, C#, Python). Bytecode is then run by a VM: interpreted first, then <b>JIT-compiled</b> when hot. Throughout, the runtime manages memory with a garbage collector or reference counting.</p>`, ['Where in that pipeline does a "cannot find symbol" error come from?', 'What does javac optimise compared with the JIT?']);
I('B', 'What is the difference between a compiler, an interpreter and a JIT?', `<p>A <b>compiler</b> translates the whole program to another form (machine code or bytecode) before it runs; you pay compile time once and get fast execution, but without knowledge of run-time behaviour. An <b>interpreter</b> executes the program directly - by walking the AST or looping over bytecode - so it starts instantly and is simple and portable, but each operation pays dispatch overhead (often 10-50× slower than native). A <b>JIT</b> compiles at run time, only the hot parts, using profiles of the actual types and branches; it can speculate and deoptimise if wrong. Modern runtimes mix all three: CPython compiles to bytecode and interprets it (with a specialising interpreter and an experimental JIT), the JVM and V8 interpret then JIT, and Go/Rust are AOT.</p>`, ['Is Java compiled or interpreted?', 'Why can a JIT sometimes outperform AOT code?']);
I('B', 'What is an abstract syntax tree and how is it different from a parse tree?', `<p>A <b>parse tree</b> (concrete syntax tree) records every grammar rule application and every token, including parentheses, commas and semicolons. An <b>AST</b> keeps only the meaning: operator nodes with operand children, statements with their parts. Grouping is expressed by the tree shape, so <code>(1 + 2) * 3</code> is a <code>*</code> node with a <code>+</code> child and no parenthesis nodes. Compilers type-check, optimise and generate code from the AST. Tools that must reproduce source exactly (formatters, refactoring engines like Roslyn or IntelliJ PSI) keep a concrete tree or attach tokens and comments ("trivia") to it.</p>`, ['How do linters like ESLint use the AST?', 'What is tree-sitter used for?']);
I('I', 'How would you implement a calculator that supports + - * / and parentheses with correct precedence?', `<p>Write a grammar with one rule per precedence level - <code>expr → term (('+'|'-') term)*</code>, <code>term → factor (('*'|'/') factor)*</code>, <code>factor → NUMBER | '(' expr ')' | '-' factor</code> - and implement it as <b>recursive descent</b>: one function per rule, a shared token index, while-loops for repetition so operators are left-associative. Either evaluate during parsing or build an AST and evaluate it with a post-order walk. Alternatives: Dijkstra's <b>shunting-yard</b> algorithm with an operator stack (no recursion, produces RPN), or a <b>Pratt parser</b> with a binding-power table. Mention edge cases: unary minus, truncating division for negatives, division by zero, deep nesting (stack overflow → use the explicit-stack version), and error messages with positions. Everything is O(n).</p>`, ['How do you add right-associative exponentiation?', 'How would you add variables and assignment?']);
I('I', 'Explain static vs dynamic typing and strong vs weak typing.', `<p>They are two separate axes. <b>Static vs dynamic</b> is <i>when</i> types are checked: static languages (Java, C#, Go, Rust, TypeScript) check at compile time by giving every expression a type; dynamic languages (Python, JavaScript, Ruby) attach types to run-time values and check when an operation executes. <b>Strong vs weak</b> is about <i>implicit conversions</i>: JavaScript silently converts in <code>"5" * 2 → 10</code> and <code>[] + {}</code>; Python raises <code>TypeError</code> for <code>"5" + 2</code>. C is static but weak-ish (implicit numeric conversions, unchecked casts). Gradual typing (TypeScript, Python type hints) adds static checks that are erased at run time, so they do not protect you from wrong data coming in at run time.</p>`, ['Is TypeScript sound?', 'What does type inference do in Java var or Rust let?']);
I('I', 'What is SSA form and why do compilers use it?', `<p>In <b>static single assignment</b> form every variable is assigned exactly once; each new assignment creates a new version (<code>x1</code>, <code>x2</code>), and where control-flow paths merge a <b>φ-function</b> selects the right version (<code>x3 = φ(x1, x2)</code>). Because each use has exactly one definition, def-use chains are explicit and many analyses become sparse and simple: constant propagation (just look at the single definition), dead code elimination (a definition with no uses), global value numbering, and register allocation (SSA interference graphs are chordal). LLVM, GCC (GIMPLE), HotSpot C2, V8 TurboFan/Maglev, .NET RyuJIT and Go all use SSA. Before emitting machine code, φ-functions are removed by inserting copies.</p>`, ['How do you place φ-functions efficiently?', 'Why is register allocation easier in SSA?']);
I('I', 'Name some compiler optimisations and when they are not allowed.', `<p><b>Constant folding/propagation</b> (compute known values at compile time), <b>dead code elimination</b>, <b>common subexpression elimination</b>, <b>inlining</b>, <b>loop-invariant code motion</b>, <b>strength reduction</b> (<code>i*8 → i&lt;&lt;3</code>), loop unrolling and vectorisation, escape analysis (stack allocation / scalar replacement). Every one must preserve observable behaviour, which restricts them: floating point is not associative, so reordering sums changes results (allowed only with fast-math flags); expressions with side effects (calls, volatile reads, I/O) cannot be removed or merged; memory loads cannot be reused across stores that might alias or across synchronisation (the memory model); errors such as division by zero must still happen at run time. In C, undefined behaviour gives the optimiser extra freedom, which is why overflow checks can vanish.</p>`, ['Why does a benchmark loop sometimes take 0 ns?', 'Why is inlining called the most important optimisation?']);
I('A', 'How does a bytecode VM execute code, and what makes it faster or slower?', `<p>A VM keeps a program counter, an operand stack (or registers) and frames for locals. The core is a <b>fetch-decode-execute</b> loop: read the opcode at pc, jump to its handler, do the work, advance pc. Costs: the <b>dispatch</b> (an indirect branch per instruction that the CPU often mispredicts), stack traffic, and dynamic type checks in dynamic languages. Speed-ups: threaded dispatch (computed goto), superinstructions, register-based bytecode (fewer instructions), <b>quickening / specialising</b> instructions after observing types (CPython 3.11+ <code>BINARY_OP_ADD_INT</code>), inline caches for property lookups, and finally a JIT that removes dispatch entirely. The language modules show concrete VMs: JVM bytecode in <i>JVM Internals</i>, Ignition in <i>JS Engine Internals</i>, and IL in <i>CLR Internals</i>.</p>`, ['Stack vs register VM - which would you choose for a new language and why?', 'How does the JVM verifier prove there is no stack underflow?']);
I('A', 'What is speculative optimisation and deoptimisation in a JIT?', `<p>A JIT watches the program: which types reach an operation, which class a virtual call dispatches to, which branches are taken. It then compiles code that <b>assumes</b> the observed behaviour (integer add only, call inlined for class <code>Circle</code>, object has hidden class/shape S) and protects each assumption with a cheap <b>guard</b>. If a guard fails, the runtime <b>deoptimises</b>: it reconstructs the interpreter frame from metadata recorded at that point and continues in the interpreter, later recompiling with more general assumptions. Class loading can also invalidate assumptions (a new subclass breaks a devirtualised call), triggering deopt of dependent code. Frequent deopt/re-opt cycles are a real performance bug, visible with <code>-XX:+PrintCompilation</code> ("made not entrant") or V8's <code>--trace-deopt</code>.</p>`, ['What is an inline cache and what does megamorphic mean?', 'What is on-stack replacement?']);
I('I', 'Compare reference counting with tracing garbage collection.', `<p><b>Reference counting</b> frees an object the moment its count reaches zero: memory reclamation is immediate and deterministic, pauses are small (except for large cascading frees), and it interoperates easily with native code. Costs: a counter update on every pointer copy (atomic if shared across threads), extra memory per object, and it <b>cannot reclaim cycles</b> without weak references or a backup cycle collector. Used by CPython, Swift/ObjC ARC, <code>shared_ptr</code>, Rust <code>Rc/Arc</code>. <b>Tracing GC</b> (mark-sweep, mark-compact, copying, generational) periodically finds everything reachable from the roots and frees the rest: handles cycles, has cheap pointer writes and (with moving collectors) bump-pointer allocation, but reclamation is delayed, needs headroom memory, and has pauses or barrier costs. Used by the JVM, .NET, V8, Go.</p>`, ['Why does CPython have both?', 'How would you fix a retain cycle in Swift?']);
I('I', 'Explain mark-sweep and mark-compact. What problem does compaction solve?', `<p><b>Mark-sweep</b>: stop the world, mark every object reachable from the roots (stacks, registers, globals) with DFS/BFS, then sweep the heap linearly, putting unmarked objects on free lists. Mark costs O(live), sweep costs O(heap). Objects never move, so free memory becomes <b>fragmented</b> - many small holes - which slows allocation (free-list search) and can fail a large allocation even when total free memory is enough. <b>Mark-compact</b> adds a phase that slides live objects together (e.g. Lisp2 or sliding compaction: compute new addresses, update every pointer, move), leaving one contiguous free area where allocation is a pointer bump. Compaction costs extra passes and pointer updates, which is why collectors compact selectively (G1 evacuates chosen regions) or concurrently (ZGC, Shenandoah with load barriers).</p>`, ['What are GC roots in the JVM?', 'Why does .NET not compact the Large Object Heap by default?']);
I('A', 'What is generational garbage collection and what is a write barrier for?', `<p>The <b>weak generational hypothesis</b> says most objects die young. So the heap is split: a small <b>young generation</b> collected frequently with a copying collector (cost proportional to survivors, which are few) and an <b>old generation</b> for objects that survived several collections (promotion), collected rarely with mark-sweep/compact. The problem: old objects can point to young ones, and a minor GC must treat those pointers as roots without scanning the whole old generation. A <b>write barrier</b> - code the compiler adds to every reference store - records such pointers, typically by dirtying a byte in a <b>card table</b> (one per 512-byte card) or adding to a <b>remembered set</b>. A minor GC scans roots plus dirty cards only. Costs: a few instructions per store and premature promotion when the young generation is too small.</p>`, ['What happens if promotion rate is too high?', 'Why is Go not generational?']);
I('E', 'How do concurrent garbage collectors stay correct while the program keeps running?', `<p>With the <b>tri-color abstraction</b>: white (not yet reached), grey (reached, children pending), black (fully scanned). Marking is correct if no reachable object stays white at the end. While the mutator runs concurrently, an object can be lost only if <b>both</b> happen: a black object gets a pointer to a white object, <b>and</b> every path from a grey object to that white object is destroyed. Barriers break one condition: a <b>Dijkstra insertion barrier</b> shades the new target grey on store (strong invariant, but stacks need rescanning); a <b>Yuasa / snapshot-at-the-beginning deletion barrier</b> shades the old value being overwritten so everything live at the start stays marked (G1, Shenandoah, V8); Go uses a hybrid barrier. Concurrent <b>compaction</b> also needs read/load barriers or forwarding (ZGC coloured pointers, Shenandoah Brooks/forwarding pointers) so the program never uses a stale copy. Costs: barrier overhead (single-digit to ~15% throughput) and memory headroom.</p>`, ['What happens if allocation outpaces a concurrent collector?', 'Why does ZGC use load barriers rather than only write barriers?']);
I('E', 'A service has 2-second GC pauses every hour. How do you investigate and fix it?', `<p>First <b>measure</b>: enable GC logging (JVM <code>-Xlog:gc*</code>, .NET event counters/traces, Go <code>gctrace</code>) and correlate pauses with latency spikes. Classify: if the pause is a full GC that frees little, the live set is too big - take a heap dump, look at the dominator tree, and find leaks (unbounded caches, listeners, static maps, thread-locals). If old gen fills because of <b>premature promotion</b>, the allocation rate is too high or the young gen too small - profile allocation sites and remove waste (boxing, temporary collections, string building), or resize generations. If the live set is legitimately large, switch to a <b>concurrent compacting collector</b> (generational ZGC/Shenandoah, .NET background GC, tuned Go GOGC/GOMEMLIMIT) and give it headroom (2-3× live). Also rule out non-GC causes: time-to-safepoint, swapping, container CPU throttling starving GC threads. Verify with a load test and keep the GC log on in production.</p>`, ['How do you read a heap dump dominator tree?', 'When would you choose Parallel GC over ZGC?']);
I('A', 'How would you design a small scripting language runtime for a product (e.g. user-defined rules)?', `<p>Front end: a hand-written lexer and recursive-descent parser for good error messages with line/column, producing an AST; a semantic pass that resolves names and checks types (static types catch most user mistakes before deploy). Execution: start with a <b>tree-walking interpreter</b> (simplest, easy to sandbox); if rules become hot, compile the AST to compact <b>bytecode</b> for a stack VM with constant folding at compile time. Safety: no access to the host except through a whitelist of functions, a <b>step/fuel limit</b> and memory limit per evaluation to stop infinite loops, deterministic behaviour (no wall clock unless injected). Memory: rules are short-lived, so allocate in a per-evaluation arena and free it all at the end, or reuse the host language's GC. Alternatives worth naming: embed Lua, CEL (Google's Common Expression Language), Starlark, or WebAssembly with fuel metering instead of building your own.</p>`, ['How would you cache compiled rules?', 'How do you version the language without breaking saved rules?']);
registerModule({
  id: 'cs17',
  title: 'Compilers & Language Runtimes',
  langExplain: `<p><b>About the code here.</b> The runnable examples are short Python programs (a tokenizer, a recursive-descent parser and evaluator, a type checker, constant folding, a stack VM, reference counting and mark-sweep/copying collectors) because Python reads like pseudocode and runs in the page. The ideas are language-independent: the same pipeline exists in <code>javac</code> + HotSpot, Roslyn + the CLR, V8, CPython, Go and LLVM. For how one specific runtime does it, see the Java module <i>JVM Internals</i>, the JavaScript module <i>JS Engine Internals: V8, Memory &amp; GC</i> and the C# module <i>CLR Internals &amp; Performance</i>.</p>`,
  intro: `<p>This module explains how code becomes execution - the theory underneath every language you use. You will build, piece by piece, a tiny language implementation: a <b>lexer</b> that turns characters into tokens, a <b>recursive-descent parser</b> that turns tokens into an <b>AST</b> with correct precedence, a <b>type checker</b> with scoped symbol tables, an <b>optimiser</b> that folds constants and lowers to three-address code, and a <b>stack bytecode VM</b>. Then you compare interpreters, bytecode VMs, JIT and AOT compilation, and finish with <b>garbage collection</b>: reference counting and its cycle problem, mark-sweep, copying, generational and concurrent collectors with tri-color marking and write barriers. Every topic has an interactive visualizer and runnable code, and the interview section covers the questions asked at systems, language-runtime and senior backend interviews. Engine-specific details live in the JVM, V8 and CLR internals modules; here you learn the general model that explains all of them.</p>`,
  goals: ['Tokenize source text with maximal munch and explain why lexing is regular but parsing needs a grammar', 'Write a recursive-descent parser that gets precedence and associativity right, and evaluate its AST', 'Implement scoped symbol tables and a simple type checker; explain static vs dynamic and strong vs weak typing', 'Lower an AST to three-address code, explain SSA, and apply constant folding, CSE and dead code elimination safely', 'Compile expressions to stack bytecode, run them on a VM, and explain interpreters vs JIT vs AOT trade-offs including warm-up and deoptimisation', 'Explain and implement reference counting (and its cycle leak), mark-sweep and copying collection; reason about generational and concurrent GC, write barriers and pause tuning'],
  prereqs: `<p>Required: CS Core <b>Computer Architecture Essentials</b> (instructions, registers, caches - what machine code runs on) and <b>Memory Management &amp; Virtual Memory</b> (the heap, pages, allocation). Helpful: recursion, stacks, hash maps and graph traversal (DFS/BFS) from the DSA track. If you know Java, JavaScript or C#, the JVM, V8 and CLR internals modules are great companions after this one.</p>`,
  hours: 14,
  topics: topics,
  quiz: quiz,
  interview: interview,
  practice: practice
});
})();
