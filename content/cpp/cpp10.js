(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var R = String.raw;   // C++ code is written with String.raw so "\n" stays a C++ escape

  /* ---------------- shared little helpers for the visualizers ---------------- */
  function one(k, cls) { var h = {}; h[k] = cls; return h; }
  function note(html, label) { return { type: 'text', label: label || 'What is going on', html: html }; }
  function splitOps(input, def, max) {
    var s = String(input === undefined || input === null ? def : input).trim();
    if (!s) throw new Error('Type some steps separated by ";" — e.g. ' + def);
    var ops = s.split(/\s*;\s*|\n+/).map(function (x) { return x.trim(); }).filter(Boolean);
    if (ops.length > (max || 16)) throw new Error('Use at most ' + (max || 16) + ' steps');
    return ops;
  }
  function okName(n) {
    if (!/^[A-Za-z_][A-Za-z0-9_]{0,9}$/.test(n || '')) throw new Error('Names must be short identifiers like a, b, s1 (got "' + n + '")');
    return n;
  }
  /* ======================================================================
     TOPIC 1 — Value categories & rvalue references
     ====================================================================== */
  function classify(e) {
    var s = e.replace(/\s+/g, ' ').trim();
    if (!s) return null;
    if (/^(std::)?move\s*\(.+\)$/.test(s)) return ['xvalue', 'std::move is just a cast to T&& — it marks a named object as "you may steal from me".'];
    if (/^static_cast\s*<.*&&\s*>\s*\(.+\)$/.test(s)) return ['xvalue', 'A cast to an rvalue reference type produces an xvalue (an "eXpiring" object that still has a name/address).'];
    if (/^(std::)?forward\s*<.+>\s*\(.+\)$/.test(s)) return ['xvalue', 'std::forward&lt;T&gt;(x) is an xvalue when T is a non-reference type (the caller passed an rvalue); it is an lvalue when T is U&.'];
    if (/^".*"$/.test(s)) return ['lvalue', 'Surprise! A string literal is an lvalue: it is a real char array stored in the program, so it has an address.'];
    if (/^(-?\d+(\.\d+)?[fFuUlL]*|true|false|nullptr|'.')$/.test(s)) return ['prvalue', 'A literal is a pure value: no name, no address you can take. It only exists to initialise something.'];
    if (/^(\+\+|--)\s*[A-Za-z_]/.test(s)) return ['lvalue', 'Prefix ++x changes x and hands back x itself (a reference), so the result is an lvalue.'];
    if (/[A-Za-z_\])]\s*(\+\+|--)$/.test(s)) return ['prvalue', 'Postfix x++ returns a COPY of the old value — a brand-new temporary, so it is a prvalue.'];
    if (/^\[/.test(s)) return ['prvalue', 'A lambda expression creates a temporary closure object — a prvalue.'];
    if (/^\*/.test(s)) return ['lvalue', 'Dereferencing a pointer names an object that lives somewhere in memory — lvalue.'];
    if (/^&/.test(s)) return ['prvalue', 'Taking an address gives you a pointer VALUE (a number) — that number itself is a temporary prvalue.'];
    if (/^this$/.test(s)) return ['prvalue', '"this" is a prvalue pointer: you cannot write this = nullptr.'];
    if (/^[A-Za-z_][\w.]*(\[[^\]]*\])?\s*([+\-*\/%]?=)\s*[^=]/.test(s)) return ['lvalue', 'Built-in assignment returns a reference to the left side, so (x = 5) is an lvalue.'];
    if (/^[A-Za-z_][\w:.]*\s*\[[^\]]*\]$/.test(s)) return ['lvalue', 'a[i] names a real element in memory — lvalue.'];
    if (/^[A-Za-z_][\w:.<>]*\s*[({].*[)}]$/.test(s)) {
      if (/ref/i.test(s.split(/[({]/)[0])) return ['lvalue', 'A call to a function that returns T&amp; (like getRef()) is an lvalue — it names an existing object.'];
      return ['prvalue', 'A call to a function that returns BY VALUE (or T{} / T(...)) makes a fresh temporary — prvalue. (Since C++17 it is not even materialised until something needs it.)'];
    }
    if (/^[A-Za-z_][\w]*((\.|->)[A-Za-z_]\w*)*$/.test(s)) return ['lvalue', 'Anything with a NAME is an lvalue — even a variable declared as int&amp;&amp;! The name lets you use it again, so the compiler will not silently steal from it.'];
    if (/[+\-*\/%<>]|==|!=|&&|\|\|/.test(s)) return ['prvalue', 'Arithmetic / comparison results are fresh temporary values — prvalue.'];
    throw new Error('Could not classify "' + e + '". Try forms like: x; 42; x + 1; std::move(x); f(); ++x; x++; *p; a[0]; "hi"; x = 5');
  }
  function valueCatViz(input) {
    var DEF = 'x; 42; x + 1; std::move(x); rr; f(); getRef(); ++x; x++; "hi"; a[0]; *p; static_cast<int&&>(x)';
    var ops = splitOps(input, DEF, 16), rows = [], frames = [];
    var bind = { lvalue: ['YES', 'YES', 'no'], prvalue: ['no', 'YES', 'YES'], xvalue: ['no', 'YES', 'YES'] };
    var cols = ['expression', 'category', 'has identity?', 'movable?', 'binds int&', 'binds const int&', 'binds int&&'];
    frames.push({ narr: 'Every C++ expression has a <b>type</b> AND a <b>value category</b>. We will sort each expression you typed into <b>lvalue</b> (has a name/address, keep it), <b>prvalue</b> (pure temporary value), or <b>xvalue</b> (named object we are allowed to steal from). Assume: <code>int x, a[3], *p; int&amp;&amp; rr = 5; int f(); int&amp; getRef();</code>', parts: [
      { type: 'table', label: 'Classification table (fills in step by step)', columns: cols, rows: [] },
      note('Two questions decide everything: <b>(1) does it have identity?</b> (can I take its address / refer to it again) and <b>(2) can it be moved from?</b> lvalue = identity, not movable. prvalue = no identity, movable. xvalue = BOTH.')
    ] });
    ops.forEach(function (op, idx) {
      var c = classify(op);
      var b = bind[c[0]];
      rows.push([op, c[0], c[0] === 'prvalue' ? 'no' : 'yes', c[0] === 'lvalue' ? 'no' : 'yes', b[0], b[1], b[2]]);
      var hl = {}; rows.forEach(function (_, i) { hl[i] = i === idx ? (c[0] === 'lvalue' ? 'win' : c[0] === 'xvalue' ? 'sel' : 'ok') : 'done'; });
      frames.push({ narr: '<code>' + H.esc(op) + '</code> → <b>' + c[0] + '</b>. ' + c[1], parts: [
        { type: 'table', label: 'Classification table', columns: cols, rows: rows.map(function (r) { return r.slice(); }), hl: hl },
        { type: 'vars', label: 'Overload that wins for f(int&) / f(const int&) / f(int&&)', vals: { expression: op, picks: c[0] === 'lvalue' ? 'f(int&)' : 'f(int&&)', 'also OK': 'f(const int&)' }, hl: { picks: c[0] === 'lvalue' ? 'cur' : 'ok' } }
      ] });
    });
    var count = { lvalue: 0, prvalue: 0, xvalue: 0 };
    rows.forEach(function (r) { count[r[1]]++; });
    frames.push({ narr: 'Summary. <b>glvalue</b> = lvalue + xvalue (things with identity). <b>rvalue</b> = prvalue + xvalue (things you may move from). <code>int&amp;&amp;</code> only accepts rvalues; <code>const int&amp;</code> accepts everything — that is why old C++98 code used it everywhere.', parts: [
      { type: 'table', label: 'Final table', columns: cols, rows: rows },
      { type: 'vars', label: 'Count', vals: count, hl: { xvalue: 'sel' } }
    ] });
    return frames;
  }

  topics.push({
    title: 'Value Categories: lvalues, rvalues & rvalue References',
    analogy: `<p>Think of a <b>library book</b> vs a <b>free flyer</b>. The library book has a shelf number (an <b>address</b>) and other people will read it after you — so you must hand it back in perfect shape. That is an <b>lvalue</b>. The flyer someone pushes into your hand on the street has no shelf, nobody else will ever want it, so you can scribble on it, fold it, or take the staples out of it. That is an <b>rvalue</b>. Move semantics is simply C++ noticing "this is a flyer — I can take its parts instead of photocopying it".</p>`,
    explain: `<p>Every expression in C++ has two labels: its <b>type</b> (int, std::string…) and its <b>value category</b>. The category answers: "Is this a thing that will still be around after this line, or a temporary that is about to vanish?"</p>
      <ul>
        <li><b>lvalue</b> ("locator value") — it has a name or an address. <code>x</code>, <code>a[0]</code>, <code>*p</code>, <code>++x</code>, even a string literal <code>"hi"</code>. You can write <code>&amp;x</code>.</li>
        <li><b>prvalue</b> ("pure rvalue") — a fresh temporary value: <code>42</code>, <code>x + 1</code>, <code>x++</code>, <code>f()</code> when f returns by value, <code>std::string("hi")</code>.</li>
        <li><b>xvalue</b> ("eXpiring value") — a named object that we have <i>marked</i> as "about to die, you may steal from it": <code>std::move(x)</code>, <code>static_cast&lt;T&amp;&amp;&gt;(x)</code>.</li>
      </ul>
      ${H.table(['', 'has identity (address)?', 'may be moved from?', 'group'], [['lvalue', H.c('g', 'yes'), H.c('r', 'no'), 'glvalue'], ['xvalue', H.c('g', 'yes'), H.c('g', 'yes'), 'glvalue + rvalue'], ['prvalue', H.c('r', 'no'), H.c('g', 'yes'), 'rvalue']])}
      <p>An <b>rvalue reference</b> <code>T&amp;&amp;</code> is a reference that <b>only binds to rvalues</b> (prvalues and xvalues). That is the whole trick behind move semantics: if a function has two overloads, <code>f(const T&amp;)</code> and <code>f(T&amp;&amp;)</code>, the compiler picks the <code>&amp;&amp;</code> one exactly when the argument is "a flyer" — so that overload is allowed to steal.</p>
      ${H.table(['argument', 'f(T&amp;)', 'f(const T&amp;)', 'f(T&amp;&amp;)'], [['lvalue x', H.c('g', '✔ best'), '✔', H.c('r', '✘')], ['const lvalue', H.c('r', '✘'), H.c('g', '✔ best'), H.c('r', '✘')], ['prvalue 42 / f()', H.c('r', '✘'), '✔', H.c('g', '✔ best')], ['xvalue std::move(x)', H.c('r', '✘'), '✔', H.c('g', '✔ best')]])}
      <p><b>The #1 rule people forget:</b> <span class="c-r">a named rvalue reference is an lvalue</span>. Inside <code>void g(std::string&amp;&amp; s)</code>, the expression <code>s</code> has a name, so it is an lvalue. If you want to pass it on as an rvalue you must write <code>std::move(s)</code> again.</p>`,
    clues: ['"What is the difference between an lvalue and an rvalue?" — classic opener for any modern C++ round', '"Why can\'t I bind a temporary to a non-const reference?" → value categories + binding rules', '"Is a named rvalue reference an lvalue or rvalue?" → trick question, answer: lvalue', 'Overload set with <code>const T&amp;</code> and <code>T&amp;&amp;</code> in the question → they are testing which one gets called', '"prvalue / xvalue / glvalue" or "guaranteed copy elision (C++17)" anywhere in the prompt', 'Output-prediction question where the same function is called with <code>x</code>, <code>std::move(x)</code> and <code>x + 1</code>'],
    code: [R`#include <iostream>
#include <string>
#include <utility>

// Three overloads: the compiler picks one based on the VALUE CATEGORY of the argument.
void show(int&)        { std::cout << "int&        (modifiable lvalue)\n"; }
void show(const int&)  { std::cout << "const int&  (const lvalue / fallback)\n"; }
void show(int&&)       { std::cout << "int&&       (rvalue: prvalue or xvalue)\n"; }

int  makeInt() { return 7; }      // returns by value  -> call is a prvalue
int& pick(int& r) { return r; }   // returns a reference -> call is an lvalue

int main() {
    int x = 1;
    const int cx = 2;
    show(x);              // int&
    show(cx);             // const int&
    show(42);             // int&&   literal is a prvalue
    show(x + 1);          // int&&   arithmetic result is a prvalue
    show(makeInt());      // int&&   function returning by value
    show(pick(x));        // int&    function returning T& is an lvalue
    show(std::move(x));   // int&&   std::move produces an xvalue

    int&& rr = 5;         // rr's TYPE is int&&, but the EXPRESSION rr is an lvalue
    show(rr);             // int&    <- the famous gotcha
    show(std::move(rr));  // int&&
}`, R`#include <iostream>
#include <type_traits>

// decltype((expr)) — note the DOUBLE parentheses — encodes the value category in the type:
//   lvalue  -> T&      xvalue -> T&&      prvalue -> T
template <class T> struct Cat           { static constexpr const char* name = "prvalue"; };
template <class T> struct Cat<T&>       { static constexpr const char* name = "lvalue";  };
template <class T> struct Cat<T&&>      { static constexpr const char* name = "xvalue";  };
#define CATEGORY(e) Cat<decltype((e))>::name

int main() {
    int x = 0; int* p = &x; int&& rr = 1;
    std::cout << CATEGORY(x) << ' ' << CATEGORY(x + 1) << ' ' << CATEGORY(std::move(x)) << ' '
              << CATEGORY(*p) << ' ' << CATEGORY(rr) << ' ' << CATEGORY(x++) << ' ' << CATEGORY(++x) << '\n';
    // prints: lvalue prvalue xvalue lvalue lvalue prvalue lvalue
}`],
    codeTitle: ['Overload resolution reveals the value category', 'A compile-time value-category detector with decltype((e))'],
    viz: {
      title: 'Classify expressions into lvalue / prvalue / xvalue',
      input: 'x; 42; x + 1; std::move(x); rr; f(); getRef(); ++x; x++; "hi"; a[0]; *p; static_cast<int&&>(x)',
      inputLabel: 'Expressions separated by ";" (x, rr, a, p, f, getRef are pre-declared)',
      gen: valueCatViz
    },
    examples: [
      { title: 'Why int& r = 42; does not compile, but const int& r = 42; does', html: `<p><code>42</code> is a prvalue. A non-const lvalue reference promises "I can modify the original object" — but there is no original object, only a temporary, so C++ refuses (changing a temporary that disappears next line is almost always a bug). A <code>const int&amp;</code> promises not to modify, so C++ allows it and <b>extends the temporary's lifetime</b> to match the reference. <code>int&amp;&amp; r = 42;</code> also works and also extends the lifetime — and lets you modify it.</p>`, code: R`int main() {
    // int& bad = 42;        // error: cannot bind non-const lvalue reference to an rvalue
    const int& ok1 = 42;     // fine: lifetime of the temporary is extended to ok1's scope
    int&& ok2 = 42;          // fine: rvalue reference to the temporary, also extended
    ok2 = 43;                // and we may modify it
    return ok1 + ok2;
}` },
      { title: 'Named rvalue reference is an lvalue', html: `<p>This is the bug in half of hand-written move constructors. Inside <code>Holder(std::string&amp;&amp; s)</code> the parameter <code>s</code> has a name, so <code>name(s)</code> <span class="c-r">copies</span>. You need <code>name(std::move(s))</code> to actually move. Rule of thumb: <b>"if it has a name, it is an lvalue"</b>.</p>`, code: R`#include <string>
#include <utility>
struct Holder {
    std::string name;
    // BAD:  Holder(std::string&& s) : name(s) {}          // copies! s is an lvalue here
    Holder(std::string&& s) : name(std::move(s)) {}       // GOOD: really moves
};
int main() { Holder h(std::string(1000, 'x')); return h.name.size() == 1000 ? 0 : 1; }` },
      { title: 'Returning a reference to a local: dangling, whatever the category', html: `<p><code>std::string&amp;&amp; bad() { std::string s = "hi"; return std::move(s); }</code> compiles but returns a reference to a local that dies at the closing brace — <span class="c-r">dangling</span>. Rvalue references are still <i>references</i>; they do not own anything. Return <b>by value</b> (<code>std::string good()</code>) and let the compiler move or elide.</p>` },
      { title: 'C++17 guaranteed copy elision changed what a prvalue is', html: `<p>Since C++17 a prvalue is not "a temporary object" but "a recipe to initialise an object". <code>Widget w = Widget(1);</code> or <code>return Widget(1);</code> constructs <b>directly in the destination</b> — no copy or move constructor is called, and it even compiles if both are deleted. A temporary is only <b>materialised</b> (turned into an xvalue) when you need an object, e.g. binding it to a reference or calling a member on it.</p>`, code: R`struct NoCopyNoMove {
    int v;
    explicit NoCopyNoMove(int x) : v(x) {}
    NoCopyNoMove(const NoCopyNoMove&) = delete;
    NoCopyNoMove(NoCopyNoMove&&) = delete;
};
NoCopyNoMove make() { return NoCopyNoMove(5); }   // OK since C++17: guaranteed elision
int main() { NoCopyNoMove n = make(); return n.v - 5; }` }
    ],
    deepDive: `<p><b>The full taxonomy (C++11, refined in C++17).</b> Two axes: <i>identity</i> (i) and <i>movability</i> (m). <b>glvalue</b> = has identity (lvalue ∪ xvalue). <b>rvalue</b> = movable (prvalue ∪ xvalue). Only three leaf categories exist: lvalue (i, ¬m), xvalue (i, m), prvalue (¬i, m). Bjarne Stroustrup's original note literally named them with this i/m grid.</p>
      <p><b>Temporary materialization (C++17).</b> A prvalue is converted to an xvalue only when an object is required: binding to a reference, member access (<code>f().x</code> — so <code>f().x</code> is an xvalue), array-to-pointer on a prvalue array, or a discarded-value expression. This is why <code>return T{};</code> no longer calls any constructor beyond the one that builds the result in place.</p>
      <p><b>Lifetime extension pitfalls.</b> Extension works only when the reference binds <i>directly</i> to the temporary. <code>const std::string&amp; r = std::string("a") + "b";</code> is fine. But <code>const auto&amp; r = getVector()[0];</code> binds to an element of a temporary vector returned by <code>operator[]</code> (a function call returning a reference) — the vector dies at the semicolon and <code>r</code> dangles. Same for <code>for (auto&amp; x : makeObj().items())</code> before C++23 (P2718 fixed the range-for temporary lifetime in C++23).</p>
      <p><b>decltype rules.</b> <code>decltype(x)</code> on an unparenthesised name gives the <i>declared</i> type (so <code>decltype(rr)</code> is <code>int&amp;&amp;</code>). <code>decltype((x))</code> treats it as an expression: lvalue → <code>T&amp;</code>, xvalue → <code>T&amp;&amp;</code>, prvalue → <code>T</code>. That one extra pair of parentheses is a famous interview trap and the basis of our CATEGORY macro.</p>
      <p><b>Member functions can overload on value category</b> via ref-qualifiers: <code>std::string name() const&amp; { return n; }</code> and <code>std::string name() &amp;&amp; { return std::move(n); }</code> — the second one is chosen for temporaries so it can move the member out. <code>std::optional::value()</code> uses exactly this.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants are good at explaining a given expression's category, but they often <i>assert</i> wrong things about edge cases — e.g. claiming a string literal is a prvalue, or that <code>f().x</code> is a prvalue. Treat their answer as a hypothesis and verify with the <code>decltype((e))</code> trick or a tiny overload set — it takes 30 seconds on Compiler Explorer.</p>
      <p><b>Use AI as a partner:</b> <code>Generate 15 tricky C++ expressions and ask me to classify each as lvalue/xvalue/prvalue; reveal answers only after I reply</code>. Or paste a class and ask "where does this code copy when it could move?" — then check each claim yourself.</p>
      <p><b>Where AI goes wrong:</b> generated move constructors that forget <code>std::move</code> on members (silently copying, because named rvalue refs are lvalues), code that returns <code>std::move(local)</code> (which <i>disables</i> NRVO), and dangling <code>const auto&amp;</code> bound into temporaries.</p>
      <p><b>What you must still own:</b> the mental model. Code review of AI output in performance-sensitive C++ is mostly "is this a copy or a move?" and you can only answer that if value categories are second nature.</p>`,
    problems: [{
      title: 'Build a VALUE_CATEGORY(expr) Detector', level: 'Medium', tags: ['value categories', 'decltype', 'templates'], companies: ['Bloomberg', 'Jane Street', 'Optiver'],
      statement: `<p>Write a compile-time tool <code>category_of&lt;decltype((e))&gt;</code> (wrapped in a macro <code>VCAT(e)</code>) that returns the string <code>"lvalue"</code>, <code>"xvalue"</code> or <code>"prvalue"</code> for any expression <code>e</code>, without evaluating <code>e</code>. Then use it to print the category of <code>x</code>, <code>x + 1</code>, <code>std::move(x)</code>, <code>rr</code> (an <code>int&amp;&amp;</code> variable) and <code>s.size()</code>.</p>`,
      constraints: `C++17 or later. Must not evaluate the expression (no side effects). Must work for any type.`,
      example: `<p>Input expressions: <code>x</code>, <code>x + 1</code>, <code>std::move(x)</code>, <code>rr</code>, <code>s.size()</code><br>Output: ${H.c('b', 'lvalue')} ${H.c('g', 'prvalue')} ${H.c('p', 'xvalue')} ${H.c('b', 'lvalue')} ${H.c('g', 'prvalue')}<br>Why: <code>rr</code> has a name → lvalue even though its declared type is <code>int&amp;&amp;</code>; <code>size()</code> returns by value → prvalue.</p>`,
      brute: { why: `<p>The naive approach is an overload set <code>f(int&amp;)</code> / <code>f(int&amp;&amp;)</code>. It <b>evaluates</b> the expression (side effects!), only works for <code>int</code>, and cannot tell xvalue from prvalue — both bind to <code>&amp;&amp;</code>. We are wasting a runtime call to answer a compile-time question.</p>`, code: R`#include <iostream>
#include <utility>
const char* f(int&)  { return "lvalue"; }
const char* f(int&&) { return "rvalue (xvalue or prvalue? can't tell)"; }
int main() {
    int x = 0;
    std::cout << f(x) << '\n' << f(x + 1) << '\n' << f(std::move(x)) << '\n';
}` },
      mcq: { q: 'What is <code>decltype((x))</code> when <code>int x;</code>?', options: ['<code>int</code>', '<code>int&amp;</code>', '<code>int&amp;&amp;</code>', '<code>const int&amp;</code>'], answer: 1, explain: 'With the extra parentheses, decltype looks at the expression (x), which is an lvalue of type int, so it yields int&amp;. Without them, decltype(x) gives the declared type int.' },
      hints: [`<p>Hint 1: <code>decltype</code> applied to a <b>parenthesised</b> expression encodes the category in the reference-ness of the result: lvalue → <code>T&amp;</code>, xvalue → <code>T&amp;&amp;</code>, prvalue → plain <code>T</code>.</p>`, `<p>Hint 2: Write a primary class template returning "prvalue", then partial specialisations for <code>T&amp;</code> and <code>T&amp;&amp;</code>. <code>decltype</code> is an unevaluated context, so no side effects happen.</p>`, `<p>Hint 3: You need a <b>macro</b> because you must write <code>decltype((e))</code> with the double parentheses around the user's expression. Recipe: <code>#define VCAT(e) Cat&lt;decltype((e))&gt;::name</code>.</p>`],
      tests: {"io":true,"cases":[{"stdin":"","stdout":"lvalue prvalue xvalue lvalue prvalue prvalue\nx is still 0\nlvalue prvalue xvalue lvalue lvalue prvalue\nlvalue prvalue lvalue prvalue xvalue\nx is 0"}]},
      solution: {
        approach: `<p><code>decltype((e))</code> is the standard's own value-category oracle. Map the three result shapes to three strings with partial specialisation. Everything happens at compile time; <code>e</code> is never executed.</p>`,
        code: R`#include <iostream>
#include <string>
#include <utility>

template <class T> struct Cat      { static constexpr const char* name = "prvalue"; };
template <class T> struct Cat<T&>  { static constexpr const char* name = "lvalue";  };
template <class T> struct Cat<T&&> { static constexpr const char* name = "xvalue";  };
#define VCAT(e) (Cat<decltype((e))>::name)

int main() {
    int x = 0;
    int&& rr = 5;
    std::string s = "hey";
    std::cout << VCAT(x) << ' '            // lvalue
              << VCAT(x + 1) << ' '        // prvalue
              << VCAT(std::move(x)) << ' ' // xvalue
              << VCAT(rr) << ' '           // lvalue  (named!)
              << VCAT(s.size()) << ' '     // prvalue (returns by value)
              << VCAT(x++) << '\n';        // prvalue, and x is NOT incremented (unevaluated)
    std::cout << "x is still " << x << '\n';
    std::cout << VCAT("abc") << ' ' << VCAT(5) << ' ' << VCAT(static_cast<int&&>(x)) << ' '
              << VCAT(s) << ' ' << VCAT(s[0]) << ' ' << VCAT(std::string("t")) << '\n';   // lvalue prvalue xvalue lvalue lvalue prvalue
    std::cout << VCAT(++x) << ' ' << VCAT(&x) << ' ' << VCAT(*(&x)) << ' '
              << VCAT(nullptr) << ' ' << VCAT(std::move(rr)) << '\n';                    // lvalue prvalue lvalue prvalue xvalue
    std::cout << "x is " << x << '\n';                                                   // still 0: ++x was never evaluated
}`,
        dry: { head: ['expression', 'decltype((e))', 'specialisation chosen', 'printed'], rows: [['x', 'int&amp;', 'Cat&lt;T&amp;&gt;', 'lvalue'], ['x + 1', 'int', 'primary', 'prvalue'], ['std::move(x)', 'int&amp;&amp;', 'Cat&lt;T&amp;&amp;&gt;', 'xvalue'], ['rr', 'int&amp;', 'Cat&lt;T&amp;&gt;', 'lvalue'], ['s.size()', 'size_t', 'primary', 'prvalue'], ['x++', 'int', 'primary', 'prvalue (x stays 0)']] },
        complexity: `<p>Zero runtime cost: everything is resolved at compile time. The program only prints string literals.</p>`,
        followUps: ['Extend it to also report const-ness (e.g. "const lvalue").', 'Why does <code>decltype(rr)</code> (single parentheses) give <code>int&amp;&amp;</code>?', 'What category is <code>std::string("a").size()</code> and why is the temporary materialised?']
      }
    }]
  });
  /* ======================================================================
     TOPIC 2 — std::move, move constructor & move assignment
     ====================================================================== */
  function moveViz(input) {
    var DEF = 'make a hello; copy b a; move c a; make d bye; moveassign d c; copyassign b d; end';
    var ops = splitOps(input, DEF, 14), frames = [];
    var objs = [], bufs = [], bufSeq = 0, stats = { allocations: 0, 'bytes copied': 0, 'pointers stolen': 0, 'delete[] calls': 0 };
    function obj(n) { for (var i = 0; i < objs.length; i++) if (objs[i].name === n) return objs[i]; return null; }
    function need(n) { var o = obj(okName(n)); if (!o) throw new Error('No object named "' + n + '" — create it first with: make ' + n + ' text'); return o; }
    function buf(id) { for (var i = 0; i < bufs.length; i++) if (bufs[i].id === id) return bufs[i]; return null; }
    function newBuf(text) { bufSeq++; stats.allocations++; bufs.push({ id: bufSeq, text: text, live: true }); return bufSeq; }
    function free(id) { var b = buf(id); if (b) { b.live = false; stats['delete[] calls']++; } }
    function pic(hl, ehl, tags) {
      var nodes = [], edges = [], H2 = Math.max(56, Math.max(objs.length, bufs.length) * 12 + 18), t = {};
      nodes.push({ id: '_S', label: 'objects (stack)', x: 20, y: 5, shape: 'box', w: 28 });
      nodes.push({ id: '_H', label: 'char buffers (heap)', x: 76, y: 5, shape: 'box', w: 32 });
      objs.forEach(function (o, i) {
        nodes.push({ id: 'O' + o.name, label: o.name + ' {ptr=' + (o.ptr ? '#' + o.ptr : 'nullptr') + ', len=' + o.len + '}', x: 20, y: 18 + i * 12, shape: 'box', w: 34 });
        if (o.ptr) edges.push(['O' + o.name, 'B' + o.ptr]);
        else t['O' + o.name] = 'moved-from (empty)';
      });
      bufs.forEach(function (b, i) {
        nodes.push({ id: 'B' + b.id, label: '#' + b.id + ' "' + b.text + '"', x: 76, y: 18 + i * 12, shape: 'box', w: 30 });
        if (!b.live) t['B' + b.id] = 'freed';
      });
      var h = {}; bufs.forEach(function (b) { if (!b.live) h['B' + b.id] = 'done'; });
      Object.keys(hl || {}).forEach(function (k) { h[k] = hl[k]; });
      Object.keys(tags || {}).forEach(function (k) { t[k] = tags[k]; });
      return [{ type: 'graph', label: 'Arrow = "this object\'s ptr member points to that heap buffer"', directed: true, height: H2, nodes: nodes, edges: edges, hl: h, ehl: ehl || {}, tags: t },
        { type: 'vars', label: 'Cost scoreboard', vals: JSON.parse(JSON.stringify(stats)), hl: {} }];
    }
    function gc() { bufs = bufs.filter(function (b) { return b.live; }); }
    frames.push({ narr: 'Our class <code>Str</code> owns a heap buffer: <code>char* ptr; size_t len;</code>. Copying means <b>allocate + copy every byte</b>. Moving means <b>steal the pointer</b> and leave the source empty. Steps: <code>' + H.esc(ops.join('; ')) + '</code>', parts: pic() });
    ops.forEach(function (op) {
      gc();
      var w = op.split(/\s+/), cmd = (w[0] || '').toLowerCase();
      if (cmd === 'make') {
        var n = okName(w[1]); if (obj(n)) throw new Error('"' + n + '" already exists');
        if (objs.length >= 6) throw new Error('At most 6 objects in this demo');
        var text = (w.slice(2).join(' ') || 'text').slice(0, 12);
        var id = newBuf(text); objs.push({ name: n, ptr: id, len: text.length });
        frames.push({ narr: '<code>Str ' + n + '("' + H.esc(text) + '");</code> The constructor calls <code>new char[' + text.length + ']</code> and copies the characters in. ' + n + ' now <b>owns</b> buffer #' + id + '.', parts: pic(one('O' + n, 'ok'), one('O' + n + '-B' + id, 'ok')) });
      } else if (cmd === 'copy' || cmd === 'move') {
        var d = okName(w[1]), s = need(w[2]); if (obj(d)) throw new Error('"' + d + '" already exists — use copyassign/moveassign for existing objects');
        if (objs.length >= 6) throw new Error('At most 6 objects in this demo');
        if (cmd === 'copy') {
          if (!s.ptr) { objs.push({ name: d, ptr: null, len: 0 }); frames.push({ narr: '<code>Str ' + d + '(' + s.name + ');</code> copies an EMPTY moved-from object → ' + d + ' is empty too. (Legal: moved-from objects are valid, just unspecified/empty.)', parts: pic(one('O' + d, 'cur')) }); return; }
          var sb = buf(s.ptr), nid = newBuf(sb.text); stats['bytes copied'] += sb.text.length;
          objs.push({ name: d, ptr: nid, len: s.len });
          frames.push({ narr: '<code>Str ' + d + '(' + s.name + ');</code> → <b>copy constructor</b> (argument is an lvalue). Deep copy: allocate a NEW buffer #' + nid + ' and copy ' + sb.text.length + ' bytes. Both objects own separate, equal buffers. Cost grows with the string length: <b>O(n)</b>.', parts: pic(one('O' + d, 'cur'), one('O' + d + '-B' + nid, 'ok'), one('B' + nid, 'new copy')) });
        } else {
          var stolen = s.ptr; objs.push({ name: d, ptr: stolen, len: s.len });
          frames.push({ narr: '<code>Str ' + d + '(std::move(' + s.name + '));</code> → <b>move constructor</b> (argument is an xvalue). Step 1: <code>ptr = other.ptr; len = other.len;</code> — just copy the POINTER (8 bytes), not the characters. Right now <span class="c-r">two objects point to the same buffer</span> — if we stopped here both destructors would delete it (double free!).', parts: pic(one('O' + d, 'cur'), (function () { var e = {}; if (stolen) { e['O' + d + '-B' + stolen] = 'ok'; e['O' + s.name + '-B' + stolen] = 'bad'; } return e; })()) });
          s.ptr = null; s.len = 0; stats['pointers stolen']++;
          frames.push({ narr: 'Step 2: <code>other.ptr = nullptr; other.len = 0;</code> The source is left <b>valid but empty</b>, so its destructor will do <code>delete[] nullptr</code> (a harmless no-op). Total cost: a few pointer writes — <b>O(1)</b>, no allocation.', parts: pic(one('O' + s.name, 'done'), stolen ? one('O' + d + '-B' + stolen, 'ok') : {}) });
        }
      } else if (cmd === 'copyassign' || cmd === 'moveassign') {
        var dd = need(w[1]), ss = need(w[2]);
        if (dd === ss) { frames.push({ narr: '<code>' + dd.name + ' = ' + (cmd === 'moveassign' ? 'std::move(' + ss.name + ')' : ss.name) + ';</code> is <b>self-assignment</b>. A correct operator checks <code>if (this != &amp;other)</code> (or uses copy-and-swap) so it does not free its own buffer first.', parts: pic(one('O' + dd.name, 'cur')) }); return; }
        var old = dd.ptr;
        if (cmd === 'copyassign') {
          var nid2 = null;
          if (ss.ptr) { var sb2 = buf(ss.ptr); nid2 = newBuf(sb2.text); stats['bytes copied'] += sb2.text.length; }
          if (old) free(old);
          dd.ptr = nid2; dd.len = ss.len;
          frames.push({ narr: '<code>' + dd.name + ' = ' + ss.name + ';</code> → <b>copy assignment</b>. Allocate a fresh copy FIRST (#' + (nid2 || '—') + '), then free the old buffer' + (old ? ' #' + old : '') + '. (Allocating first gives the strong exception guarantee: if <code>new</code> throws, ' + dd.name + ' is untouched.)', parts: pic(one('O' + dd.name, 'cur'), nid2 ? one('O' + dd.name + '-B' + nid2, 'ok') : {}, old ? one('B' + old, 'freed') : {}) });
        } else {
          if (old) free(old);
          var st = ss.ptr; dd.ptr = st; dd.len = ss.len; ss.ptr = null; ss.len = 0; stats['pointers stolen']++;
          frames.push({ narr: '<code>' + dd.name + ' = std::move(' + ss.name + ');</code> → <b>move assignment</b>: (1) release what ' + dd.name + ' owned' + (old ? ' (buffer #' + old + ' → delete[])' : '') + ', (2) steal ' + ss.name + '\'s pointer, (3) null out ' + ss.name + '. No bytes copied.', parts: pic((function () { var h = one('O' + dd.name, 'cur'); h['O' + ss.name] = 'done'; return h; })(), st ? one('O' + dd.name + '-B' + st, 'ok') : {}) });
        }
      } else if (cmd === 'end') {
        for (var i = objs.length - 1; i >= 0; i--) {
          var o = objs[i];
          if (o.ptr) free(o.ptr);
          frames.push({ narr: 'Scope ends → destructors run in <b>reverse</b> order. <code>~Str()</code> for ' + o.name + ': ' + (o.ptr ? '<code>delete[]</code> buffer #' + o.ptr + '.' : 'ptr is nullptr (moved-from), <code>delete[] nullptr</code> does nothing.') + ' Every buffer is freed exactly once — no leak, no double free.', parts: pic(one('O' + o.name, 'cur')) });
          o.ptr = null;
        }
        objs = [];
      } else throw new Error('Unknown step "' + op + '". Use: make a text; copy b a; move c a; copyassign b c; moveassign b c; end');
    });
    frames.push({ narr: 'Done. Compare <b>bytes copied</b> (work done by copies) with <b>pointers stolen</b> (moves cost O(1) each). That difference is why <code>std::vector&lt;std::string&gt;</code> growth, sorting and returning big objects got dramatically faster in C++11.', parts: pic() });
    return frames;
  }

  var STR_CLASS = R`#include <cstring>
#include <iostream>
#include <utility>

// A tiny owning string: the textbook "Rule of Five" class.
class Str {
    char*  ptr_ = nullptr;
    size_t len_ = 0;
public:
    Str() = default;
    explicit Str(const char* s) : ptr_(new char[std::strlen(s) + 1]), len_(std::strlen(s)) {
        std::memcpy(ptr_, s, len_ + 1);
    }
    ~Str() { delete[] ptr_; }                                // 1. destructor

    Str(const Str& o)                                        // 2. copy constructor: deep copy
        : ptr_(o.ptr_ ? new char[o.len_ + 1] : nullptr), len_(o.len_) {
        if (ptr_) std::memcpy(ptr_, o.ptr_, len_ + 1);
    }
    Str& operator=(const Str& o) {                           // 3. copy assignment
        if (this != &o) {
            Str tmp(o);                                      // copy first (may throw) ...
            swap(tmp);                                       // ... then commit: strong guarantee
        }
        return *this;
    }
    Str(Str&& o) noexcept                                    // 4. move constructor: steal
        : ptr_(std::exchange(o.ptr_, nullptr)), len_(std::exchange(o.len_, 0)) {}
    Str& operator=(Str&& o) noexcept {                       // 5. move assignment
        if (this != &o) {
            delete[] ptr_;                                   // release what we own
            ptr_ = std::exchange(o.ptr_, nullptr);           // steal
            len_ = std::exchange(o.len_, 0);                 // leave source empty but valid
        }
        return *this;
    }
    void swap(Str& o) noexcept { std::swap(ptr_, o.ptr_); std::swap(len_, o.len_); }
    size_t size() const { return len_; }
    const char* c_str() const { return ptr_ ? ptr_ : ""; }
};

int main() {
    Str a("hello");
    Str b(a);              // copy ctor
    Str c(std::move(a));   // move ctor: a is now empty
    Str d("bye");
    d = std::move(c);      // move assignment
    b = d;                 // copy assignment
    std::cout << '[' << a.c_str() << "] [" << b.c_str() << "] [" << c.c_str() << "] [" << d.c_str() << "]\n";
    // prints: [] [hello] [] [hello]
}`;

  topics.push({
    title: 'std::move, Move Constructor & Move Assignment',
    analogy: `<p>You are moving house. <b>Copying</b> is building an identical second house at the new address, brick by brick, then keeping both. <b>Moving</b> is just handing over the <b>keys</b>: the new owner gets the same house instantly, and the old owner is left with an empty key ring. The house (the heap buffer) never moves — only the keys (the pointer) change hands. <code>std::move</code> itself is just a sticky note saying "this owner is leaving, you may take the keys" — it does not move anything by itself.</p>`,
    explain: `<p>Classes that own a resource (heap memory, a file, a socket) store a small <b>handle</b> — usually a pointer — and the big data lives elsewhere. Copying such an object must duplicate the big data (<b>O(n)</b>). But if the source is about to die anyway (a temporary, or something you will never use again), duplicating is a waste: just <b>take its pointer</b> and leave it empty (<b>O(1)</b>).</p>
      <p>C++11 lets a class say how to do that with two special members:</p>
      <ul>
        <li><b>Move constructor</b> <code>T(T&amp;&amp; other) noexcept</code> — build a new object by stealing other's guts.</li>
        <li><b>Move assignment</b> <code>T&amp; operator=(T&amp;&amp; other) noexcept</code> — free what I own, steal other's guts.</li>
      </ul>
      <p>Both must leave <code>other</code> in a <b>valid but unspecified</b> state (usually empty) so its destructor still works.</p>
      <p><b><code>std::move(x)</code> does not move.</b> It is literally <code>static_cast&lt;T&amp;&amp;&gt;(x)</code>: it turns the lvalue <code>x</code> into an xvalue so overload resolution picks the move constructor/assignment. If the type has no move constructor, or <code>x</code> is <code>const</code>, the copy is chosen and nothing is stolen.</p>
      ${H.table(['line', 'which member runs', 'cost'], [['<code>Str b(a);</code>', 'copy ctor', 'O(n) + allocation'], ['<code>Str c(std::move(a));</code>', 'move ctor', 'O(1), no allocation'], ['<code>Str d = makeStr();</code>', 'nothing! (C++17 elision)', 'free'], ['<code>d = std::move(c);</code>', 'move assignment', 'O(1) + free old'], ['<code>b = d;</code>', 'copy assignment', 'O(n)']])}
      <p><b>Rule of 0 / 3 / 5:</b> if your class needs a custom destructor, it almost certainly needs custom copy ops too (Rule of 3) and, for speed, move ops (Rule of 5). Best of all: hold your resources in types that already do this (<code>std::string</code>, <code>std::vector</code>, <code>std::unique_ptr</code>) and write <b>none</b> of them (Rule of 0).</p>`,
    clues: ['"Implement a move constructor" / "write a class that manages a buffer" → Rule of 5 with <code>noexcept</code> and nulling the source', '"Does std::move move anything?" → no, it is a cast', '"Why is my vector copying instead of moving on resize?" → move constructor not <code>noexcept</code>', '"What state is a moved-from object in?" → valid but unspecified', '"Should I write return std::move(x);?" → usually no, it blocks NRVO', '"Rule of three / five / zero" in the question'],
    code: [STR_CLASS, R`#include <iostream>
#include <vector>

struct Loud {
    Loud() = default;
    Loud(const Loud&) { std::cout << "copy "; }
    Loud(Loud&&) noexcept { std::cout << "move "; }   // remove noexcept -> vector COPIES on growth
};

int main() {
    std::vector<Loud> v;
    for (int i = 0; i < 4; ++i) { v.emplace_back(); std::cout << "| "; }
    std::cout << '\n';
    // With noexcept: "| move | move move | move move move | ..." (old elements moved on reallocation)
    // Without noexcept: copies, because vector must keep the strong exception guarantee
    // (std::move_if_noexcept picks copy when the move constructor might throw).
}`],
    codeTitle: ['Rule of Five done right (std::exchange + copy-and-swap)', 'Why noexcept on the move constructor matters for std::vector'],
    viz: {
      title: 'Copy vs move: who owns the heap buffer?',
      input: 'make a hello; copy b a; move c a; make d bye; moveassign d c; copyassign b d; end',
      inputLabel: 'Steps: make NAME text; copy DST SRC; move DST SRC; copyassign DST SRC; moveassign DST SRC; end',
      gen: moveViz
    },
    examples: [
      { title: 'Copy or move? std::move on a const object', html: `<p><code>const std::string s = "big"; std::string t = std::move(s);</code> — <span class="c-r">this COPIES</span>. <code>std::move(s)</code> gives <code>const std::string&amp;&amp;</code>; the move constructor takes <code>std::string&amp;&amp;</code> (non-const, because it must modify the source), so it cannot bind. The copy constructor <code>const std::string&amp;</code> can. No error, no warning by default — just a silent copy. clang-tidy's <code>performance-move-const-arg</code> catches this.</p>`, code: R`#include <string>
#include <utility>
int main() {
    const std::string s(1000, 'x');
    std::string t = std::move(s);   // COPY: cannot steal from a const object
    return s.size() == 1000 ? 0 : 1; // s is untouched
}` },
      { title: 'Using an object after moving from it', html: `<p>After <code>std::string b = std::move(a);</code>, <code>a</code> is "valid but unspecified". Allowed: destroy it, assign a new value, call functions with no preconditions (<code>a.size()</code>, <code>a.clear()</code>, <code>a.empty()</code>). Not safe: assume it holds anything in particular. Pattern: <b>re-assign before reuse</b>.</p>`, code: R`#include <string>
#include <utility>
#include <vector>
int main() {
    std::vector<std::string> out;
    std::string line = "first";
    out.push_back(std::move(line)); // line is now unspecified (in practice empty)
    line = "second";                // re-assigning restores a known state: OK
    out.push_back(std::move(line));
    return out.size() == 2 ? 0 : 1;
}` },
      { title: 'return std::move(local) is a pessimisation', html: `<p>When you <code>return local;</code>, the compiler first tries <b>NRVO</b> (build <code>local</code> directly in the caller's slot — zero cost). If it cannot, C++11 already treats <code>local</code> as an rvalue and moves automatically. Writing <code>return std::move(local);</code> changes the expression from a plain name to a function call, which <b>forbids NRVO</b> and forces a move. GCC warns with <code>-Wpessimizing-move</code>.</p>`, code: R`#include <vector>
std::vector<int> good() { std::vector<int> v(1000, 1); return v; }            // NRVO or implicit move
std::vector<int> worse() { std::vector<int> v(1000, 1); return std::move(v); } // forces a move, no NRVO
int main() { return good().size() == worse().size() ? 0 : 1; }` },
      { title: 'Rule of 0: let members do the work', html: `<p>If your class holds a <code>std::vector</code>, a <code>std::string</code> and a <code>std::unique_ptr</code>, the compiler-generated move constructor moves each member — correct and <code>noexcept</code> automatically. Declaring <i>any</i> of destructor / copy ops <b>suppresses</b> the implicit move ops (they fall back to copying!), so do not write an empty <code>~T() {}</code> "just because".</p>`, code: R`#include <memory>
#include <string>
#include <vector>
#include <type_traits>
struct Document {                      // Rule of 0: no special members written
    std::string title;
    std::vector<int> pages;
    std::unique_ptr<int> cache;
};
static_assert(std::is_nothrow_move_constructible_v<Document>);
static_assert(!std::is_copy_constructible_v<Document>);   // unique_ptr member makes it move-only
int main() { Document a{"t", {1, 2}, nullptr}; Document b = std::move(a); return b.pages.size() == 2 ? 0 : 1; }` }
    ],
    deepDive: `<p><b>When does the compiler generate move ops?</b> Implicit move ctor/assignment are declared only if the class has <i>no</i> user-declared copy ctor, copy assignment, move counterpart, or destructor. Declaring a destructor (even <code>= default</code>) silently turns moves into copies — a classic performance regression. Conversely, declaring a move op makes the implicit copy ops <b>deleted</b>.</p>
      <p><b>noexcept and the strong guarantee.</b> <code>std::vector::push_back</code> promises: if it throws, the vector is unchanged. On reallocation it must transfer old elements; if a move could throw halfway, the old buffer would already be gutted. So it uses <code>std::move_if_noexcept</code>: move only if the move constructor is <code>noexcept</code> (or the type is not copyable). Mark move ops <code>noexcept</code> whenever they only shuffle pointers.</p>
      <p><b>Self-move-assignment</b> (<code>x = std::move(x)</code>) must not crash; the standard library only promises the object ends in a valid state. The <code>if (this != &amp;o)</code> guard or swap-based implementations handle it. <b>Copy-and-swap</b> (<code>T&amp; operator=(T o) { swap(o); return *this; }</code>) gives one operator serving both copy and move with the strong guarantee, at the cost of an extra move.</p>
      <p><b>std::exchange</b> (C++14) makes moves one-liners: <code>ptr_ = std::exchange(o.ptr_, nullptr)</code> reads the old value and writes the new one in a single expression.</p>
      <p><b>Small-buffer optimisation caveat.</b> Moving a short <code>std::string</code> (≤ 15 chars in libstdc++, SSO) still copies the characters because they live <i>inside</i> the object, not on the heap. Moves are O(1) but not always "free". Same for <code>std::array</code> — moving it moves each element.</p>
      <p><b>Moved-from state guarantees in the library:</b> <code>unique_ptr</code>/<code>shared_ptr</code> become null; <code>vector</code>/<code>string</code> are valid (in practice empty); <code>std::thread</code> becomes non-joinable. For your own types, document it — "empty" is the friendliest choice.</p>`,
    aiEra: `<p><b>What AI changes:</b> an assistant will happily generate a full Rule-of-Five class in seconds. The skill that matters now is <b>reviewing</b> it: is the move ctor <code>noexcept</code>? Does it null the source? Does copy assignment survive self-assignment and exceptions? Is a custom destructor even needed, or should this be Rule of 0 with <code>unique_ptr</code>?</p>
      <p><b>Use AI as a partner:</b> <code>Here is my class. List every place a copy happens that could be a move, and explain the value category at each call site</code>. Then confirm by adding a noisy copy constructor and running it.</p>
      <p><b>Where AI goes wrong:</b> forgetting <code>noexcept</code> (vector silently copies), writing <code>return std::move(x)</code>, moving from <code>const</code> objects, using the object after <code>std::move</code> in the same expression (e.g. <code>f(std::move(s), s.size())</code> — argument evaluation order is unspecified), and adding destructors that suppress implicit moves.</p>
      <p><b>What you must still own:</b> ownership reasoning — who frees what, exactly once — and the ability to prove it with a sanitizer run (<code>-fsanitize=address</code>) rather than trusting generated code.</p>`,
    problems: [{
      title: 'Write the Move Operations for a Buffer Class', level: 'Medium', tags: ['move semantics', 'rule of five', 'RAII'], companies: ['Microsoft', 'Bloomberg', 'NVIDIA', 'Google'],
      statement: `<p>You are given a class <code>Buffer</code> that owns <code>int* data_</code> of size <code>n_</code> and already has a constructor, destructor, copy constructor and copy assignment. Add a <b>move constructor</b> and <b>move assignment</b> so that <code>std::vector&lt;Buffer&gt;</code> growth and <code>Buffer b = std::move(a);</code> never allocate or copy elements. Count copies vs moves to prove it.</p>`,
      constraints: `Buffers may hold up to 10<sup>7</sup> ints. Move ops must be O(1), <code>noexcept</code>, safe under self-move, and leave the source valid (destructible and assignable).`,
      example: `<p><code>Buffer a(5); Buffer b = std::move(a);</code><br>After: ${H.c('g', 'b.size() == 5, b owns the old pointer')}, ${H.c('y', 'a.size() == 0, a.data_ == nullptr')}. Pushing 1000 buffers into a vector: ${H.c('g', '0 deep copies')} (without the move ops: ~1023 deep copies from reallocations).</p>`,
      brute: { why: `<p>With only the Rule of 3, every <code>std::move(a)</code> falls back to the <b>copy</b> constructor (an rvalue binds to <code>const Buffer&amp;</code>). Each copy allocates and copies n ints → O(n) time and memory per "move", and vector reallocation copies every element.</p>`, code: R`#include <algorithm>
#include <cstddef>
class Buffer {                       // Rule of 3 only: "moves" silently become copies
    int* data_; std::size_t n_;
public:
    explicit Buffer(std::size_t n) : data_(new int[n]()), n_(n) {}
    ~Buffer() { delete[] data_; }
    Buffer(const Buffer& o) : data_(new int[o.n_]), n_(o.n_) { std::copy(o.data_, o.data_ + n_, data_); }
    Buffer& operator=(const Buffer& o) {
        if (this != &o) { int* p = new int[o.n_]; std::copy(o.data_, o.data_ + o.n_, p); delete[] data_; data_ = p; n_ = o.n_; }
        return *this;
    }
    std::size_t size() const { return n_; }
};
int main() { Buffer a(1000000); Buffer b = static_cast<Buffer&&>(a); return b.size() == a.size() ? 0 : 1; } // a still full: it was copied` },
      mcq: { q: 'Your move constructor steals <code>o.data_</code> but forgets to set <code>o.data_ = nullptr</code>. What happens?', options: ['Nothing, it works', 'A memory leak', 'Double delete when both destructors run — undefined behaviour', 'Compile error'], answer: 2, explain: 'Both objects now hold the same pointer; both destructors call delete[] on it. The second delete is undefined behaviour (often a crash or heap corruption).' },
      hints: [`<p>Hint 1: Moving is "copy the pointer and size, then make the source forget them". No <code>new</code>, no loop.</p>`, `<p>Hint 2: <code>std::exchange(o.data_, nullptr)</code> returns the old pointer and writes nullptr in one step — perfect for the member-initialiser list.</p>`, `<p>Hint 3: Move assignment = (a) guard self-move, (b) <code>delete[]</code> my current buffer, (c) steal, (d) null the source, (e) <code>return *this</code>. Mark both <code>noexcept</code> so <code>std::vector</code> uses them during reallocation.</p>`],
      tests: {"io":true,"cases":[{"stdin":"","stdout":"a=0 b=5\ndeep copies: 0\na=5 b=0\n1000\ndeep copies: 1 5\n00\n0 10000000\n3"}]},
      solution: {
        approach: `<p>Add the two move members. The move constructor transfers ownership in the initialiser list using <code>std::exchange</code>. Move assignment frees its own buffer, then transfers. Both are <code>noexcept</code> because they only shuffle a pointer and a size. A static counter shows zero deep copies during vector growth.</p>`,
        code: R`#include <type_traits>
#include <algorithm>
#include <cstddef>
#include <iostream>
#include <utility>
#include <vector>

class Buffer {
    int* data_ = nullptr;
    std::size_t n_ = 0;
public:
    static inline int deepCopies = 0;
    explicit Buffer(std::size_t n) : data_(new int[n]()), n_(n) {}
    ~Buffer() { delete[] data_; }
    Buffer(const Buffer& o) : data_(new int[o.n_]), n_(o.n_) {
        std::copy(o.data_, o.data_ + n_, data_); ++deepCopies;
    }
    Buffer& operator=(const Buffer& o) {
        if (this != &o) { Buffer tmp(o); swap(tmp); }
        return *this;
    }
    // ---- the new part ----
    Buffer(Buffer&& o) noexcept
        : data_(std::exchange(o.data_, nullptr)), n_(std::exchange(o.n_, 0)) {}
    Buffer& operator=(Buffer&& o) noexcept {
        if (this != &o) {
            delete[] data_;                          // release what I own
            data_ = std::exchange(o.data_, nullptr); // steal
            n_    = std::exchange(o.n_, 0);          // source becomes empty but valid
        }
        return *this;
    }
    void swap(Buffer& o) noexcept { std::swap(data_, o.data_); std::swap(n_, o.n_); }
    std::size_t size() const { return n_; }
};

static_assert(std::is_nothrow_move_constructible_v<Buffer> && std::is_nothrow_move_assignable_v<Buffer>);

int main() {
    Buffer a(5);
    Buffer b = std::move(a);
    std::cout << "a=" << a.size() << " b=" << b.size() << '\n';   // a=0 b=5
    std::vector<Buffer> v;
    for (int i = 0; i < 1000; ++i) v.push_back(Buffer(100));       // temporaries are moved in
    std::cout << "deep copies: " << Buffer::deepCopies << '\n';     // 0
    a = std::move(b);                                               // move assignment
    a = std::move(a);                                               // self-move: safe no-op
    std::cout << "a=" << a.size() << " b=" << b.size() << '\n';     // a=5 b=0
    std::cout << v.size() << '\n';                                  // 1000
    Buffer c = a;                                                   // a real copy still works
    std::cout << "deep copies: " << Buffer::deepCopies << ' ' << c.size() << '\n';   // 1 5
    Buffer z(0);
    Buffer y = std::move(z);
    std::cout << z.size() << y.size() << '\n';                      // 00
    Buffer big(10000000);
    Buffer moved = std::move(big);                                  // O(1) for 10^7 ints
    std::cout << big.size() << ' ' << moved.size() << '\n';         // 0 10000000
    b = Buffer(3);                                                  // a moved-from buffer can be assigned again
    std::cout << b.size() << '\n';                                  // 3
}`,
        dry: { head: ['statement', 'member called', 'a (ptr, n)', 'b (ptr, n)', 'allocations'], rows: [['Buffer a(5)', 'ctor', '(P1, 5)', '—', '1'], ['Buffer b = std::move(a)', 'move ctor', '(null, 0)', '(P1, 5)', '1'], ['v.push_back(Buffer(100)) ×1000', 'ctor + move ctor (+ moves on growth)', '—', '—', '1001'], ['a = std::move(b)', 'move assign', '(P1, 5)', '(null, 0)', '1001'], ['a = std::move(a)', 'move assign, self-guard', '(P1, 5)', '(null, 0)', '1001']] },
        complexity: `<p>Move ctor / assignment: <b>O(1)</b> time, no allocation (assignment also frees the old buffer). Vector growth: amortised O(1) per push with pointer moves only — deep copies drop from ~N to 0.</p>`,
        followUps: ['Replace both copy and move assignment with a single by-value <code>operator=(Buffer o)</code> — what are the trade-offs?', 'Rewrite Buffer with <code>std::unique_ptr&lt;int[]&gt;</code> so you need Rule of 0 for moves. What happens to copying?', 'What does <code>static_assert(std::is_nothrow_move_constructible_v&lt;Buffer&gt;)</code> protect against?']
      }
    }]
  });
  /* ======================================================================
     TOPIC 3 — Perfect forwarding & forwarding references
     ====================================================================== */
  function fwdViz(input) {
    var s = String(input === undefined || input === null ? 'rvalue forward' : input).trim().toLowerCase();
    var kind = /const/.test(s) ? 'const lvalue' : /rvalue|temp|move/.test(s) ? 'rvalue' : /lvalue/.test(s) ? 'lvalue' : null;
    if (!kind) throw new Error('Type the argument kind (lvalue, const lvalue, rvalue) and optionally "forward" or "noforward" — e.g. "rvalue forward"');
    var fwd = !/no\s*-?forward|plain|without/.test(s);
    var argExpr = kind === 'rvalue' ? 'std::string("abc")' : kind === 'lvalue' ? 's' : 'cs';
    var T = kind === 'rvalue' ? 'std::string' : kind === 'lvalue' ? 'std::string&' : 'const std::string&';
    var paramT = kind === 'rvalue' ? 'std::string&&' : kind === 'lvalue' ? 'std::string&' : 'const std::string&';
    var frames = [], st = [];
    function vars(extra, hl) {
      var v = { 'argument kind': kind, 'forwarding?': fwd ? 'std::forward<T>(arg)' : 'plain arg' };
      Object.keys(extra || {}).forEach(function (k) { v[k] = extra[k]; });
      return { type: 'vars', label: 'Deduction & categories', vals: v, hl: hl || {} };
    }
    var collapse = { type: 'table', label: 'Reference collapsing (the only 4 rules)', columns: ['T is', 'T&& becomes', 'so arg binds to'], rows: [['U (rvalue passed)', 'U&&', 'rvalues'], ['U& (lvalue passed)', 'U& && → U&', 'lvalues'], ['U&& (explicit)', 'U&& && → U&&', 'rvalues'], ['const U&', 'const U& && → const U&', 'const lvalues']], hl: { 0: kind === 'rvalue' ? 'sel' : '', 1: kind === 'lvalue' ? 'sel' : '', 3: kind === 'const lvalue' ? 'sel' : '' } };
    st.push('main(): make_widget(' + argExpr + ')');
    frames.push({ narr: 'We call a factory <code>make_widget(' + H.esc(argExpr) + ')</code>. The argument is ' + (kind === 'const lvalue' ? 'a' : 'an') + ' <b>' + kind + '</b>. The factory passes it through <b>two layers</b> (make_widget → build) before it reaches the <code>Widget</code> constructor, which has a copy overload <code>Widget(const std::string&amp;)</code> and a move overload <code>Widget(std::string&amp;&amp;)</code>. Goal: the final constructor should see exactly what the caller passed.', parts: [
      { type: 'stack', label: 'Call stack', items: st.slice(), hl: { 0: 'cur' } }, vars({}), { type: 'code', label: 'The layers', lang: 'cpp', code: 'template <class T> Widget make_widget(T&& arg) { return build(' + (fwd ? 'std::forward<T>(arg)' : 'arg') + '); }\ntemplate <class U> Widget build(U&& x)        { return Widget(' + (fwd ? 'std::forward<U>(x)' : 'x') + '); }\nWidget(const std::string&)  // copy\nWidget(std::string&&)       // move', hl: {} }
    ] });
    st.push('make_widget<T = ' + T + '>(' + paramT + ' arg)');
    frames.push({ narr: '<b>Layer 1: template argument deduction.</b> <code>T&amp;&amp;</code> with a deduced <code>T</code> is a <b>forwarding reference</b>. Passing ' + (kind === 'const lvalue' ? 'a ' : 'an ') + kind + ' deduces <code>T = ' + H.esc(T) + '</code>, so the parameter type <code>T&amp;&amp;</code> collapses to <code>' + H.esc(paramT) + '</code>. ' + (kind === 'rvalue' ? 'The "rvalue-ness" is remembered in T (T has no &amp;).' : 'The "lvalue-ness" is remembered in T (T carries an &amp;).'), parts: [
      { type: 'stack', label: 'Call stack', items: st.slice(), hl: { 1: 'cur' } }, vars({ T: T, 'type of arg': paramT }, { T: 'sel' }), collapse
    ] });
    var argCat = 'lvalue (it has a name!)';
    frames.push({ narr: 'Inside make_widget, the <b>expression</b> <code>arg</code> is an <b>lvalue</b> — every named variable is, even one declared <code>std::string&amp;&amp;</code>. ' + (fwd ? '<code>std::forward&lt;T&gt;(arg)</code> looks at T: ' + (kind === 'rvalue' ? 'T is not a reference → cast to <code>std::string&amp;&amp;</code> (an xvalue). The rvalue-ness is restored.' : 'T is an lvalue reference → returns an lvalue. Nothing is stolen from the caller\'s variable — correct!') : '<span class="c-r">We pass plain <code>arg</code>, so the next layer receives an lvalue no matter what the caller passed.</span>'), parts: [
      { type: 'stack', label: 'Call stack', items: st.slice(), hl: { 1: 'cur' } },
      vars({ T: T, 'category of expression arg': argCat, 'what layer 2 receives': fwd ? (kind === 'rvalue' ? 'xvalue (rvalue)' : kind) : (kind === 'const lvalue' ? 'const lvalue' : 'lvalue') }, { 'what layer 2 receives': fwd || kind !== 'rvalue' ? 'ok' : 'bad' })
    ] });
    var passedKind = fwd ? kind : (kind === 'const lvalue' ? 'const lvalue' : 'lvalue');
    var U = passedKind === 'rvalue' ? 'std::string' : passedKind === 'lvalue' ? 'std::string&' : 'const std::string&';
    var xT = passedKind === 'rvalue' ? 'std::string&&' : passedKind === 'lvalue' ? 'std::string&' : 'const std::string&';
    st.push('build<U = ' + U + '>(' + xT + ' x)');
    frames.push({ narr: '<b>Layer 2:</b> deduction happens again from what layer 1 handed over: <code>U = ' + H.esc(U) + '</code>, parameter type <code>' + H.esc(xT) + '</code>. ' + (fwd ? 'Same story: <code>std::forward&lt;U&gt;(x)</code> re-creates the original category.' : 'The original information is already <span class="c-r">lost</span> — U only knows it got an lvalue.'), parts: [
      { type: 'stack', label: 'Call stack', items: st.slice(), hl: { 2: 'cur' } }, vars({ T: T, U: U, 'type of x': xT }, { U: fwd || kind !== 'rvalue' ? 'ok' : 'bad' })
    ] });
    var ctor = passedKind === 'rvalue' ? 'Widget(std::string&&) — MOVE' : 'Widget(const std::string&) — COPY';
    st.push(ctor);
    var good = (kind === 'rvalue') === (passedKind === 'rvalue');
    frames.push({ narr: '<b>Constructor chosen:</b> <code>' + H.esc(ctor) + '</code>. ' + (kind === 'rvalue' ? (fwd ? '<span class="c-g">The temporary was moved all the way down — zero character copies.</span>' : '<span class="c-r">A temporary got COPIED: we paid an allocation + O(n) copy for nothing. This is the bug perfect forwarding fixes.</span>') : '<span class="c-g">The caller\'s variable was copied, which is correct — we must not steal from an lvalue the caller still uses.</span>'), parts: [
      { type: 'stack', label: 'Call stack', items: st.slice(), hl: { 3: good ? 'ok' : 'bad' } }, vars({ T: T, U: U, 'constructor': ctor, 'heap copies of the string': passedKind === 'rvalue' ? 0 : 1 }, { constructor: good ? 'ok' : 'bad' })
    ] });
    st.pop(); st.pop(); st.pop();
    frames.push({ narr: 'Stack unwinds back to main. Summary: a forwarding reference <b>records</b> the category in T; <code>std::forward&lt;T&gt;</code> <b>replays</b> it. You need both at <b>every</b> layer — miss one and the chain degrades to copies. Try input <code>' + (fwd ? kind + ' noforward' : kind + ' forward') + '</code> to compare.', parts: [
      { type: 'stack', label: 'Call stack', items: st.slice(), hl: { 0: 'done' } },
      { type: 'table', label: 'All combinations', columns: ['argument', 'with std::forward', 'without'], rows: [['lvalue s', 'copy (correct)', 'copy'], ['const lvalue cs', 'copy (correct)', 'copy'], ['rvalue temp', 'MOVE', 'copy (wasted)']], hl: { 0: kind === 'lvalue' ? 'sel' : '', 1: kind === 'const lvalue' ? 'sel' : '', 2: kind === 'rvalue' ? 'sel' : '' } }
    ] });
    return frames;
  }

  topics.push({
    title: 'Perfect Forwarding & Forwarding References',
    analogy: `<p>Think of a <b>parcel courier chain</b>: the sender marks a box "FRAGILE" or "OK TO OPEN". The parcel passes through a local depot, a regional hub, then the delivery van. If any depot peels off the label, the final driver treats every box the same way. <b>Perfect forwarding</b> is keeping the label intact through every hop: the forwarding reference <code>T&amp;&amp;</code> <i>reads</i> the label (lvalue or rvalue) into <code>T</code>, and <code>std::forward&lt;T&gt;</code> <i>re-sticks</i> it before handing the parcel on.</p>`,
    explain: `<p>Wrappers are everywhere: <code>std::make_unique</code>, <code>emplace_back</code>, <code>std::thread</code>, logging/timing decorators. A wrapper takes arguments and passes them to something else. The problem: inside the wrapper the parameter has a <b>name</b>, so it is always an <b>lvalue</b>. If the caller passed a temporary, the inner call would copy it instead of moving it.</p>
      <p>The fix has three ingredients:</p>
      <ol>
        <li><b>Forwarding reference</b> (a.k.a. "universal reference"): a parameter of the exact form <code>T&amp;&amp;</code> where <code>T</code> is <b>deduced</b> for this call (<code>template &lt;class T&gt; void f(T&amp;&amp; x)</code>, or <code>auto&amp;&amp; x</code>). It binds to <i>anything</i>, and encodes what it got: lvalue → <code>T = U&amp;</code>; rvalue → <code>T = U</code>.</li>
        <li><b>Reference collapsing</b> makes the types work out: <code>U&amp; &amp;&amp;</code> → <code>U&amp;</code>; <code>U&amp;&amp; &amp;&amp;</code> → <code>U&amp;&amp;</code>. Rule of thumb: <b>any &amp; wins</b>.</li>
        <li><b><code>std::forward&lt;T&gt;(x)</code></b> casts <code>x</code> back to an rvalue <i>only if</i> T says the original was an rvalue. It is a conditional <code>std::move</code>.</li>
      </ol>
      ${H.table(['you pass', 'T deduced as', 'param type T&amp;&amp;', 'std::forward&lt;T&gt;(x) is'], [['lvalue <code>s</code>', '<code>std::string&amp;</code>', '<code>std::string&amp;</code>', 'lvalue → copy'], ['const lvalue', '<code>const std::string&amp;</code>', '<code>const std::string&amp;</code>', 'const lvalue → copy'], ['rvalue <code>std::string("x")</code>', '<code>std::string</code>', '<code>std::string&amp;&amp;</code>', H.c('g', 'xvalue → move')]])}
      <p><b>Not every <code>&amp;&amp;</code> is a forwarding reference.</b> <code>void f(std::string&amp;&amp;)</code> (no template) and <code>vector&lt;T&gt;::push_back(T&amp;&amp;)</code> (T is the <i>class's</i> parameter, already fixed) are plain rvalue references. <code>const T&amp;&amp;</code> is also not a forwarding reference.</p>
      <p>Variadic version — the shape of every factory in the standard library:</p>
      <pre>template &lt;class T, class... Args&gt;
std::unique_ptr&lt;T&gt; make(Args&amp;&amp;... args) {
    return std::unique_ptr&lt;T&gt;(new T(std::forward&lt;Args&gt;(args)...));
}</pre>`,
    clues: ['"Implement make_unique / emplace_back / a generic wrapper" → variadic forwarding references + <code>std::forward</code>', '"What is a universal reference?" or "Is <code>T&amp;&amp;</code> always an rvalue reference?"', '"Explain reference collapsing"', '"Difference between std::move and std::forward"', 'A decorator/logging/timing wrapper that must "not change behaviour of the wrapped call"', '<code>auto&amp;&amp;</code> in a range-for or generic lambda parameter'],
    code: [R`#include <iostream>
#include <memory>
#include <string>
#include <utility>

struct Widget {
    std::string name;
    Widget(const std::string& n) : name(n)            { std::cout << "Widget COPY  " << name << '\n'; }
    Widget(std::string&& n)      : name(std::move(n)) { std::cout << "Widget MOVE  " << name << '\n'; }
};

// Our own make_unique: forwards any number of arguments with their categories intact.
template <class T, class... Args>
std::unique_ptr<T> my_make_unique(Args&&... args) {
    return std::unique_ptr<T>(new T(std::forward<Args>(args)...));
}

// A "decorator" that times/logs any callable without changing how arguments are passed.
template <class F, class... Args>
decltype(auto) logged_call(F&& f, Args&&... args) {
    std::cout << "[calling with " << sizeof...(Args) << " arg(s)]\n";
    return std::forward<F>(f)(std::forward<Args>(args)...);   // decltype(auto) keeps refs too
}

int main() {
    std::string s = "lvalue-name";
    auto a = my_make_unique<Widget>(s);                    // COPY (s still needed by caller)
    auto b = my_make_unique<Widget>(std::string("temp"));  // MOVE
    auto c = my_make_unique<Widget>(std::move(s));         // MOVE (caller gave permission)
    logged_call([](Widget w) { return w.name.size(); }, std::string("via-lambda")); // MOVE
}`, R`#include <type_traits>

// How std::forward is (essentially) implemented — two overloads.
template <class T>
constexpr T&& my_forward(std::remove_reference_t<T>& x) noexcept {
    return static_cast<T&&>(x);       // T = U&  -> U& && -> U&   (lvalue)
}                                     // T = U   -> U&&           (xvalue)
template <class T>
constexpr T&& my_forward(std::remove_reference_t<T>&& x) noexcept {
    static_assert(!std::is_lvalue_reference_v<T>, "cannot forward an rvalue as an lvalue");
    return static_cast<T&&>(x);
}

// And std::move: an UNCONDITIONAL cast.
template <class T>
constexpr std::remove_reference_t<T>&& my_move(T&& x) noexcept {
    return static_cast<std::remove_reference_t<T>&&>(x);
}

int main() {
    int i = 0;
    static_assert(std::is_same_v<decltype(my_forward<int&>(i)), int&>);
    static_assert(std::is_same_v<decltype(my_forward<int>(i)), int&&>);
    static_assert(std::is_same_v<decltype(my_move(i)), int&&>);
}`],
    codeTitle: ['make_unique and a logging decorator built on perfect forwarding', 'std::forward and std::move are just casts'],
    viz: {
      title: 'Perfect forwarding through two layers (call stack)',
      input: 'rvalue forward',
      inputLabel: 'Argument kind + mode: "lvalue forward", "const lvalue forward", "rvalue forward", "rvalue noforward"',
      gen: fwdViz
    },
    examples: [
      { title: 'Copy or move? emplace_back vs push_back', html: `<p><code>v.push_back(std::string(10, 'x'))</code> builds a temporary string, then moves it into the vector. <code>v.emplace_back(10, 'x')</code> perfectly forwards <code>10</code> and <code>'x'</code> to the string constructor <b>inside</b> the vector's storage — no temporary at all. For an existing lvalue <code>s</code>, both copy; for <code>std::move(s)</code>, both move. emplace shines when you pass <b>constructor arguments</b>, not a ready-made object.</p>`, code: R`#include <string>
#include <vector>
int main() {
    std::vector<std::string> v;
    v.push_back(std::string(10, 'x')); // temporary + move
    v.emplace_back(10, 'x');           // constructed in place: args forwarded to string(size_t, char)
    std::string s = "keep";
    v.emplace_back(s);                 // copy (s is an lvalue)
    v.emplace_back(std::move(s));      // move
    return v.size() == 4 ? 0 : 1;
}` },
      { title: 'Bug: forwarding the same argument twice', html: `<p><code>template&lt;class T&gt; void both(T&amp;&amp; x) { a(std::forward&lt;T&gt;(x)); b(std::forward&lt;T&gt;(x)); }</code> — if the caller passed an rvalue, <code>a</code> may steal it and <code>b</code> receives a <span class="c-r">moved-from husk</span>. Forward only on the <b>last</b> use; earlier uses take plain <code>x</code>.</p>`, code: R`#include <string>
#include <utility>
#include <vector>
std::vector<std::string> logBook, store;
template <class T>
void record(T&& x) {
    logBook.push_back(x);                 // plain x: copy for the log (never steal yet)
    store.push_back(std::forward<T>(x));  // last use: forward (moves if caller passed an rvalue)
}
int main() { record(std::string("payload")); return store[0] == logBook[0] ? 0 : 1; }` },
      { title: 'auto&& is a forwarding reference too', html: `<p><code>for (auto&amp;&amp; x : range)</code> binds to whatever the range yields: an lvalue reference for <code>std::vector&lt;int&gt;</code>, but a <b>prvalue proxy</b> for <code>std::vector&lt;bool&gt;</code> (where <code>auto&amp;</code> would not compile). Generic lambdas use it the same way: <code>[](auto&amp;&amp; a) { g(std::forward&lt;decltype(a)&gt;(a)); }</code>.</p>`, code: R`#include <utility>
#include <vector>
void sink(bool) {}
int main() {
    std::vector<bool> flags{true, false, true};
    // for (auto& f : flags) {}   // error: proxy object is a prvalue
    for (auto&& f : flags) f = !f;                      // works: auto&& binds to the proxy
    auto fwd = [](auto&& a) { sink(std::forward<decltype(a)>(a)); };
    fwd(flags[0]);
    return flags[1] ? 0 : 1;
}` },
      { title: 'Where perfect forwarding fails', html: `<p>Forwarding needs the compiler to <b>deduce</b> a type, so it breaks for: <b>braced lists</b> (<code>f({1, 2})</code> cannot deduce <code>T</code>), <b>0 or NULL</b> as a null pointer (deduced as <code>int</code>), <b>overloaded function names</b> (which overload?), <b>bit-fields</b> (cannot bind a reference), and <code>static constexpr</code> members without a definition (pre-C++17 linker error). Fixes: pass <code>std::initializer_list&lt;int&gt;{1, 2}</code>, use <code>nullptr</code>, wrap the function in a lambda, copy the bit-field to a local.</p>` }
    ],
    deepDive: `<p><b>Why "forwarding reference" and not "universal reference"?</b> Scott Meyers coined "universal reference"; the standard (since C++17 wording) calls it a <b>forwarding reference</b>: "an rvalue reference to a cv-unqualified template parameter that does not represent a template parameter of a class template" (and <code>auto&amp;&amp;</code>). Class template argument deduction guides are the exception: in a constructor of <code>template&lt;class T&gt; struct S { S(T&amp;&amp;); }</code>, <code>T&amp;&amp;</code> is <i>not</i> forwarding for CTAD.</p>
      <p><b>Overloading on forwarding references is a trap.</b> A constructor <code>template&lt;class T&gt; Person(T&amp;&amp; name)</code> is a better match than the copy constructor <code>Person(const Person&amp;)</code> for a <i>non-const</i> lvalue <code>Person p2(p1)</code> — so copying calls your string constructor and fails to compile (or worse, compiles). Constrain it: <code>template&lt;class T&gt; requires std::constructible_from&lt;std::string, T&gt;</code>, or <code>!std::is_same_v&lt;std::remove_cvref_t&lt;T&gt;, Person&gt;</code>.</p>
      <p><b>decltype(auto) returns</b> preserve reference-ness, so a forwarding wrapper can return exactly what the wrapped function returns. But <code>decltype(auto) f() { int x; return (x); }</code> returns <code>int&amp;</code> to a local — the parentheses rule again.</p>
      <p><b>Pass-by-value-then-move</b> is an alternative to forwarding for "sink" parameters you always store: <code>Widget(std::string n) : name(std::move(n)) {}</code>. One function, costs one extra move vs perfect forwarding, avoids template bloat and works with braced lists. Use it for constructors with a single sink parameter; use forwarding for generic, variadic code.</p>
      <p><b>Lambdas capturing parameter packs</b>: C++20 allows <code>[...args = std::forward&lt;Args&gt;(args)]</code> init-capture packs, which is how you forward into a deferred task.</p>`,
    aiEra: `<p><b>What AI changes:</b> generated generic code often <i>looks</i> right (it has <code>T&amp;&amp;</code>) but omits <code>std::forward</code>, or uses <code>std::move</code> on a forwarding reference — which steals from the caller's lvalues. Those are the two bugs to grep for in every AI-written template.</p>
      <p><b>Use AI as a partner:</b> <code>For each call in main(), tell me what T deduces to and whether the final constructor copies or moves; show the reference-collapsing step</code>. Then verify with a noisy class like our <code>Widget</code>.</p>
      <p><b>Where AI goes wrong:</b> calling <code>vector&lt;T&gt;::push_back(T&amp;&amp;)</code> a universal reference; overloading a forwarding constructor without constraints; forwarding the same argument twice; forgetting <code>decltype(auto)</code> so a wrapper returns by value when the wrapped function returned a reference.</p>
      <p><b>What you must still own:</b> knowing the deduction table cold. In interviews, "implement make_unique" is a five-line answer that separates people who have memorised the syntax from people who understand why each <code>std::forward</code> is there.</p>`,
    problems: [{
      title: 'Implement emplace-style Construction with Perfect Forwarding', level: 'Hard', tags: ['perfect forwarding', 'variadic templates', 'placement new'], companies: ['Bloomberg', 'Citadel', 'Amazon'],
      statement: `<p>Write <code>template &lt;class T&gt; class Slot</code> holding raw aligned storage for exactly one <code>T</code>, with <code>template &lt;class... Args&gt; T&amp; emplace(Args&amp;&amp;... args)</code> that constructs the object <b>in place</b>, forwarding every argument with its original value category, and a <code>reset()</code> that destroys it. Prove with a noisy type that an rvalue string argument is moved and an lvalue one is copied.</p>`,
      constraints: `No heap allocation inside Slot. Must work for any number of constructor arguments. Calling emplace twice must destroy the old object first.`,
      example: `<p><code>std::string s = "abc"; Slot&lt;Widget&gt; w; w.emplace(s, 1);</code> → ${H.c('y', 'Widget COPY abc')}<br><code>w.emplace(std::string("tmp"), 2);</code> → old one destroyed, then ${H.c('g', 'Widget MOVE tmp')}<br>Why: <code>Args</code> deduces <code>std::string&amp;</code> for <code>s</code> and <code>std::string</code> for the temporary; <code>std::forward</code> replays that.</p>`,
      brute: { why: `<p>Taking <code>const Args&amp;... args</code> accepts everything but turns every argument into a const lvalue: temporaries get <b>copied</b> (extra allocation + O(n) copy) and move-only types like <code>std::unique_ptr</code> do not compile at all.</p>`, code: R`#include <new>
#include <string>
template <class T>
class Slot {
    alignas(T) unsigned char buf_[sizeof(T)];
    bool full_ = false;
public:
    template <class... Args>
    T& emplace(const Args&... args) {            // everything becomes a const lvalue -> copies
        reset();
        T* p = ::new (static_cast<void*>(buf_)) T(args...);
        full_ = true;
        return *p;
    }
    void reset() { if (full_) { std::launder(reinterpret_cast<T*>(buf_))->~T(); full_ = false; } }
    ~Slot() { reset(); }
};
int main() { Slot<std::string> s; s.emplace(std::string(100, 'x')); /* copied, not moved */ }` },
      mcq: { q: 'Inside <code>emplace(Args&amp;&amp;... args)</code>, what does <code>T(args...)</code> (no forward) do with an rvalue argument?', options: ['Moves it', 'Copies it, because each named parameter is an lvalue', 'Compile error', 'Undefined behaviour'], answer: 1, explain: 'Named parameters are lvalues. Without std::forward the constructor sees lvalues and picks copy overloads (and fails for move-only types).' },
      hints: [`<p>Hint 1: Raw storage = <code>alignas(T) unsigned char buf_[sizeof(T)]</code>. Construct into it with <b>placement new</b>: <code>::new (static_cast&lt;void*&gt;(buf_)) T(...)</code>.</p>`, `<p>Hint 2: Parameter pack of forwarding references: <code>Args&amp;&amp;... args</code>, expanded as <code>std::forward&lt;Args&gt;(args)...</code> — the <code>...</code> goes <b>after</b> the whole forward expression.</p>`, `<p>Hint 3: Track a <code>bool full_</code>. <code>reset()</code> calls the destructor explicitly (<code>ptr()-&gt;~T()</code>) if full. <code>emplace</code> = reset, placement-new with forwarded args, set full, return a reference. Destructor calls reset.</p>`],
      tests: {"io":true,"cases":[{"stdin":"","stdout":"Widget COPY abc\n~Widget 1\nWidget MOVE tmp\n7 abc\n0 zzz 1 0\n[]\n1000\nWidget MOVE x\n~Widget 3\n~Widget 2"}]},
      solution: {
        approach: `<p>Store aligned bytes; <code>emplace</code> destroys any existing object, then placement-news a <code>T</code> passing <code>std::forward&lt;Args&gt;(args)...</code>, so each argument arrives as the category the caller gave. <code>std::launder</code> gets a valid pointer to the object living in the byte buffer.</p>`,
        code: R`#include <iostream>
#include <memory>
#include <new>
#include <string>
#include <utility>

struct Widget {
    std::string name; int id;
    Widget(const std::string& n, int i) : name(n), id(i)            { std::cout << "Widget COPY " << name << '\n'; }
    Widget(std::string&& n, int i)      : name(std::move(n)), id(i) { std::cout << "Widget MOVE " << name << '\n'; }
    ~Widget() { std::cout << "~Widget " << id << '\n'; }
};

template <class T>
class Slot {
    alignas(T) unsigned char buf_[sizeof(T)];
    bool full_ = false;
    T* ptr() { return std::launder(reinterpret_cast<T*>(buf_)); }
public:
    Slot() = default;
    Slot(const Slot&) = delete;
    Slot& operator=(const Slot&) = delete;
    ~Slot() { reset(); }

    template <class... Args>
    T& emplace(Args&&... args) {
        reset();                                                     // destroy old object first
        T* p = ::new (static_cast<void*>(buf_)) T(std::forward<Args>(args)...);
        full_ = true;                                                // set only after success
        return *p;
    }
    void reset() noexcept { if (full_) { ptr()->~T(); full_ = false; } }
    bool has_value() const { return full_; }
    T& operator*() { return *ptr(); }
};

int main() {
    std::string s = "abc";
    Slot<Widget> w;
    w.emplace(s, 1);                    // Widget COPY abc
    w.emplace(std::string("tmp"), 2);   // ~Widget 1, Widget MOVE tmp
    Slot<std::unique_ptr<int>> u;
    u.emplace(std::make_unique<int>(7)); // move-only type works too
    std::cout << **u << ' ' << s << '\n'; // 7 abc  (s untouched)
    Slot<std::string> ss;
    std::cout << ss.has_value();
    ss.emplace(3, 'z');                 // two constructor arguments: string(3, 'z')
    std::cout << ' ' << *ss << ' ' << ss.has_value();
    ss.reset();
    std::cout << ' ' << ss.has_value() << '\n';   // 0 zzz 1 0
    ss.emplace();                       // zero arguments: default constructor
    std::cout << '[' << *ss << "]\n";   // []
    ss.emplace(std::string(1000, 'q'));
    std::cout << (*ss).size() << '\n';  // 1000
    Slot<Widget> w3;
    w3.emplace(std::string("x"), 3);    // Widget MOVE x
    w3.reset();                         // ~Widget 3, and the destructor will not destroy it again
}                                       // ~Widget 2                                       // ~Widget 2`,
        dry: { head: ['call', 'Args deduced', 'forward yields', 'ctor run', 'Slot state'], rows: [['w.emplace(s, 1)', 'std::string&amp;, int', 'lvalue, int&amp;&amp;', 'COPY', 'full (id 1)'], ['w.emplace(std::string("tmp"), 2)', 'std::string, int', 'xvalue, int&amp;&amp;', '~Widget 1 then MOVE', 'full (id 2)'], ['u.emplace(make_unique(7))', 'unique_ptr&lt;int&gt;', 'xvalue', 'unique_ptr move ctor', 'full'], ['end of main', '—', '—', '~Widget 2', 'empty']] },
        complexity: `<p>O(1) bookkeeping plus whatever <code>T</code>'s constructor costs. No heap allocation by Slot itself; rvalue arguments are moved instead of copied, saving an allocation + O(n) copy each.</p>`,
        followUps: ['What happens if T\'s constructor throws inside emplace? Is the Slot still valid?', 'Add move construction for Slot itself.', 'How does <code>std::optional::emplace</code> differ from this design?']
      }
    }]
  });
  /* ======================================================================
     TOPIC 4 — Lambdas & captures
     ====================================================================== */
  function lambdaViz(input) {
    var DEF = 'set 1; capture; set 10; call; inc; inc; call; set 20; end; call';
    var ops = splitOps(input, DEF, 16), frames = [];
    var st = { x: null, alive: false, captured: false, valX: null, n: null, last: '—' };
    var CODE = 'int x = 1;\nauto byVal   = [x]            { return x; };\nauto byRef   = [&x]           { return x; };\nauto counter = [n = x]() mutable { return ++n; };\nx = 10;\nbyVal(); byRef();\ncounter();\n} // x dies here: byRef now dangles';
    function view(line, hl) {
      var v = {};
      v['x (lives in main)'] = st.alive ? st.x : 'DEAD (out of scope)';
      v['byVal.x (closure\'s own copy)'] = st.captured ? st.valX : '—';
      v['byRef.x (reference to main\'s x)'] = st.captured ? (st.alive ? '&x → ' + st.x : 'DANGLING') : '—';
      v['counter.n (own copy, mutable)'] = st.captured ? st.n : '—';
      v['last call result'] = st.last;
      var h = {}; Object.keys(hl || {}).forEach(function (k) { h[k] = hl[k]; });
      if (st.captured && !st.alive) h['byRef.x (reference to main\'s x)'] = 'bad';
      var lh = {}; if (line) lh[line] = h.__bad ? 'bad' : 'cur';
      delete h.__bad;
      return [{ type: 'vars', label: 'Variables & closure members', vals: v, hl: h }, { type: 'code', label: 'Program', lang: 'cpp', code: CODE, hl: lh }];
    }
    frames.push({ narr: 'A lambda is an <b>object</b> (a "closure") with hidden member variables — one per captured variable. <code>[x]</code> gives it an <b>int member copied now</b>. <code>[&amp;x]</code> gives it a <b>reference member</b> pointing at main\'s x. <code>[n = x]</code> is an <b>init-capture</b>: a new member named n. Steps: <code>' + H.esc(ops.join('; ')) + '</code>', parts: view(0) });
    ops.forEach(function (op) {
      var w = op.split(/\s+/), cmd = (w[0] || '').toLowerCase();
      if (cmd === 'set') {
        var v = parseInt(w[1], 10); if (isNaN(v) || Math.abs(v) > 99999) throw new Error('set needs a number, e.g. set 10');
        if (!st.alive && st.x !== null) throw new Error('x is already out of scope after "end" — you cannot set it any more');
        var first = st.x === null; st.x = v; st.alive = true;
        frames.push({ narr: first ? '<code>int x = ' + v + ';</code> — an ordinary local on main\'s stack.' : '<code>x = ' + v + ';</code> — main changes ITS x. ' + (st.captured ? 'byVal does <b>not</b> notice (it holds a snapshot). byRef <b>does</b> (it refers to this very variable). counter.n is untouched.' : ''), parts: view(first ? 1 : 5, { 'x (lives in main)': 'cur', 'byRef.x (reference to main\'s x)': st.captured ? 'ok' : '' }) });
      } else if (cmd === 'capture') {
        if (!st.alive) throw new Error('Start with "set N" so x exists before capturing');
        st.captured = true; st.valX = st.x; st.n = st.x;
        frames.push({ narr: 'Create the three lambdas. Captures happen <b>right now</b>, at creation time: byVal.x = ' + st.x + ' (copied), byRef stores the address of x, counter.n = ' + st.x + ' (init-capture). sizeof(byVal) == sizeof(int), sizeof(byRef) == sizeof(int*) on typical compilers.', parts: view(2, { 'byVal.x (closure\'s own copy)': 'ok', 'byRef.x (reference to main\'s x)': 'ok', 'counter.n (own copy, mutable)': 'ok' }) });
      } else if (cmd === 'call') {
        if (!st.captured) throw new Error('Run "capture" before "call"');
        if (st.alive) {
          st.last = 'byVal() = ' + st.valX + ', byRef() = ' + st.x;
          frames.push({ narr: 'Call both: <b>byVal() returns ' + st.valX + '</b> (the snapshot), <b>byRef() returns ' + st.x + '</b> (the live value). ' + (st.valX !== st.x ? 'They differ because x changed after capture.' : 'Same for now — x has not changed since capture.'), parts: view(6, { 'last call result': 'sel' }) });
        } else {
          st.last = 'byVal() = ' + st.valX + ', byRef() = UNDEFINED BEHAVIOUR';
          frames.push({ narr: '<span class="c-r"><b>Dangling capture!</b></span> byVal() still safely returns ' + st.valX + ' — it owns its copy. byRef() reads a stack slot that no longer belongs to x: <b>undefined behaviour</b>. It may print the old value, garbage, or crash; AddressSanitizer reports <code>stack-use-after-scope</code> / <code>stack-use-after-return</code>.', parts: view(6, { 'last call result': 'bad', __bad: true }) });
        }
      } else if (cmd === 'inc') {
        if (!st.captured) throw new Error('Run "capture" before "inc"');
        st.n++; st.last = 'counter() = ' + st.n;
        frames.push({ narr: '<code>counter()</code> — <code>mutable</code> lets the call operator modify the closure\'s OWN member n (by default operator() is const). n is now ' + st.n + '. main\'s x is ' + (st.alive ? 'still ' + st.x : 'gone') + ': mutable changes the copy, never the original.', parts: view(7, { 'counter.n (own copy, mutable)': 'cur', 'last call result': 'sel' }) });
      } else if (cmd === 'end') {
        if (!st.alive) throw new Error('x is already out of scope');
        st.alive = false;
        frames.push({ narr: 'The scope that owns x ends (think: the function returned the lambdas, or they were stored in a callback list). byVal and counter carry their own data and stay valid. byRef holds a reference to a dead variable — it is now a <span class="c-r">time bomb</span>.', parts: view(8, { 'x (lives in main)': 'bad', __bad: true }) });
      } else throw new Error('Unknown step "' + op + '". Use: set N; capture; call; inc; end');
    });
    frames.push({ narr: 'Rule of thumb: capture <b>by value</b> (or init-capture/move) when the lambda may <b>outlive</b> the current scope (callbacks, threads, returned lambdas). Capture <b>by reference</b> only when the lambda is used immediately and locally (e.g. passed to <code>std::sort</code> or <code>std::for_each</code>).', parts: view(0) });
    return frames;
  }

  topics.push({
    title: 'Lambdas & Captures',
    analogy: `<p>A lambda is like a <b>packed lunch box</b> you hand to a worker who will run an errand later. Capture <b>by value</b> = you put an actual sandwich in the box; it does not matter what happens in your kitchen afterwards. Capture <b>by reference</b> = you put a <b>note</b> saying "the sandwich is on my kitchen table". Fine if the worker eats right now while you are home. But if you move house (the variable goes out of scope) and the worker reads the note tomorrow, they find a stranger's table — that is a <b>dangling reference</b>.</p>`,
    explain: `<p>A lambda expression <code>[captures](params) { body }</code> creates an unnamed <b>closure object</b>. The compiler literally writes a small class for you: each captured variable becomes a <b>data member</b>, and the body becomes <code>operator()</code>.</p>
      ${H.table(['capture', 'meaning', 'safe if the lambda outlives the scope?'], [['<code>[]</code>', 'nothing captured (converts to a plain function pointer)', H.c('g', 'yes')], ['<code>[x]</code>', 'copy x now', H.c('g', 'yes')], ['<code>[&amp;x]</code>', 'refer to x', H.c('r', 'no')], ['<code>[=]</code>', 'copy everything used (and <code>this</code>, implicitly; deprecated in C++20 but still compiles)', H.c('y', 'careful with this')], ['<code>[&amp;]</code>', 'refer to everything used', H.c('r', 'no')], ['<code>[n = expr]</code>', 'init-capture: new member n initialised from expr', H.c('g', 'yes')], ['<code>[p = std::move(p)]</code>', 'move a move-only object (unique_ptr) into the lambda', H.c('g', 'yes')], ['<code>[this]</code>', 'copy the this POINTER (members accessed by reference!)', H.c('r', 'no')], ['<code>[*this]</code>', 'C++17: copy the whole object', H.c('g', 'yes')]])}
      <p>Three things trip people up:</p>
      <ul>
        <li><b>Captures happen when the lambda is created</b>, not when it is called. <code>[x]</code> is a snapshot.</li>
        <li><b>operator() is const by default</b>, so you cannot modify by-value captures unless you write <code>mutable</code>. And <code>mutable</code> modifies the lambda's own copy, never the original.</li>
        <li><b>Each lambda has a unique type.</b> Store it with <code>auto</code> (zero overhead, can inline) or in <code>std::function&lt;int(int)&gt;</code> when you need one type for many lambdas (type erasure: may heap-allocate, indirect call, can't inline).</li>
      </ul>
      <p>Modern extras: <b>generic lambdas</b> <code>[](auto a, auto b) { return a &lt; b; }</code> (C++14), <b>template lambdas</b> <code>[]&lt;class T&gt;(std::vector&lt;T&gt;&amp; v) {...}</code> (C++20), <b>constexpr lambdas</b> (C++17, implicit when possible), and <b>stateless lambdas are default-constructible</b> in C++20 — handy as comparator types in <code>std::set&lt;int, decltype(cmp)&gt;</code>.</p>`,
    clues: ['"Callback", "event handler", "async", "thread", "store for later" + a lambda → think about capture lifetime', '"What does the compiler generate for a lambda?" → closure class with operator()', '"Why does my lambda print an old value?" → captured by value at creation', '"Cannot assign to a variable captured by copy in a non-mutable lambda" error message', '"Move a unique_ptr into a lambda" → init-capture <code>[p = std::move(p)]</code>', '"std::function vs auto vs template parameter" → type erasure cost discussion'],
    code: [R`#include <iostream>

// What you write:
//     int base = 10, hits = 0;
//     auto f = [base, &hits](int v) { ++hits; return v + base; };
// What the compiler (roughly) generates:
class __Lambda_f {
    int  base;    // captured by value  -> a copy member
    int& hits;    // captured by reference -> a reference member
public:
    __Lambda_f(int b, int& h) : base(b), hits(h) {}
    int operator()(int v) const {   // const by default!
        ++hits;                     // OK: modifying the referred-to int, not the member itself
        return v + base;            // base = 1; would NOT compile without 'mutable'
    }
};

int main() {
    int base = 10, hits = 0;
    auto f = [base, &hits](int v) { ++hits; return v + base; };
    __Lambda_f g(base, hits);
    base = 100;                                      // neither f nor g sees this change
    std::cout << f(1) << ' ' << g(2) << ' ' << hits << '\n';   // 11 12 2
}`, R`#include <algorithm>
#include <functional>
#include <iostream>
#include <memory>
#include <set>
#include <string>
#include <vector>

int main() {
    // 1. Init-capture: move a move-only resource into the closure.
    auto res = std::make_unique<std::string>("config");
    auto task = [r = std::move(res)] { return r->size(); };      // res is now null

    // 2. Generic lambda + algorithm (by-reference capture is fine: used immediately).
    std::vector<int> v{5, 3, 8, 1};
    int threshold = 4, count = 0;
    std::for_each(v.begin(), v.end(), [&](int x) { if (x > threshold) ++count; });

    // 3. C++20 template lambda.
    auto sum = []<class T>(const std::vector<T>& xs) { T s{}; for (const T& x : xs) s += x; return s; };

    // 4. Stateless lambda as a comparator TYPE (C++20: default-constructible).
    auto byLen = [](const std::string& a, const std::string& b) { return a.size() < b.size(); };
    std::set<std::string, decltype(byLen)> words{"ccc", "a", "bb"};

    // 5. Immediately-invoked lambda to initialise a const variable with complex logic.
    const std::string mode = [&] { return count > 1 ? "busy" : "idle"; }();

    // 6. Recursive lambda: pass itself as a parameter.
    auto fib = [](auto self, int n) -> long long { return n < 2 ? n : self(self, n - 1) + self(self, n - 2); };

    // 7. std::function when you need ONE type for different lambdas (type erasure).
    std::vector<std::function<int(int)>> ops{[](int a) { return a + 1; }, [threshold](int a) { return a * threshold; }};

    std::cout << task() << ' ' << count << ' ' << sum(v) << ' ' << *words.begin() << ' '
              << mode << ' ' << fib(fib, 20) << ' ' << ops[1](3) << '\n';  // 6 2 17 a busy 6765 12
}`],
    codeTitle: ['A lambda is just a class with operator()', 'Seven lambda techniques you will use in real code'],
    viz: {
      title: 'Capture by value vs by reference (and mutable, and dangling)',
      input: 'set 1; capture; set 10; call; inc; inc; call; set 20; end; call',
      inputLabel: 'Steps: set N; capture; call; inc; end',
      gen: lambdaViz
    },
    examples: [
      { title: 'Bug: returning a lambda that captures a local by reference', html: `<p><code>makeAdder</code> returns a lambda that refers to <code>step</code>, a parameter living in <code>makeAdder</code>'s stack frame. The frame is gone when the caller uses the lambda → <span class="c-r">undefined behaviour</span>. Fix: capture by value <code>[step]</code>. Compilers rarely warn here; ASan does.</p>`, code: R`#include <functional>
std::function<int(int)> makeAdderBad(int step)  { return [&step](int x) { return x + step; }; } // dangles
std::function<int(int)> makeAdderGood(int step) { return [step](int x) { return x + step; }; }  // owns a copy
int main() { auto add5 = makeAdderGood(5); return add5(1) == 6 ? 0 : 1; }` },
      { title: 'Bug: [=] does not copy *this (before C++17 [*this])', html: `<p>Inside a member function, <code>[=]</code> captures the <b>this pointer</b>, not the members. <code>[=] { return name; }</code> really means <code>this-&gt;name</code>. If the object dies before the callback runs (common with async/event loops), it dangles. C++20 deprecates implicit this capture via <code>[=]</code>. Fixes: <code>[*this]</code> (copy the object), <code>[name = name]</code> (copy just the member), or <code>[self = shared_from_this()]</code> (keep it alive).</p>`, code: R`#include <functional>
#include <string>
struct Button {
    std::string name = "OK";
    std::function<std::string()> handlerRisky() { return [this] { return name; }; }        // pointer to *this
    std::function<std::string()> handlerSafe()  { return [label = name] { return label; }; } // own copy
};
int main() {
    std::function<std::string()> h;
    { Button b; h = b.handlerSafe(); }   // b destroyed here
    return h() == "OK" ? 0 : 1;          // safe: the closure owns "OK"
}` },
      { title: 'Copy or move inside a capture?', html: `<p><code>[s]</code> <b>copies</b> the string into the closure. <code>[s = std::move(s)]</code> <b>moves</b> it (s becomes empty). Copying the <i>lambda</i> later copies all its by-value members too — so a lambda holding a big vector is expensive to copy, and one holding a <code>unique_ptr</code> is <b>move-only</b> and cannot be stored in <code>std::function</code> (which requires copyable callables). C++23 adds <code>std::move_only_function</code> for exactly this.</p>`, code: R`#include <memory>
#include <string>
#include <utility>
int main() {
    std::string s(1000, 'z');
    auto copyCap = [s] { return s.size(); };                // copies 1000 chars
    auto moveCap = [s = std::move(s)] { return s.size(); }; // steals; s is now empty
    auto ptr = std::make_unique<int>(3);
    auto owner = [p = std::move(ptr)] { return *p; };        // closure is move-only
    auto owner2 = std::move(owner);                          // OK: moving the closure
    // auto owner3 = owner2;                                 // error: unique_ptr member not copyable
    return (copyCap() == 1000 && moveCap() == 1000 && owner2() == 3) ? 0 : 1;
}` },
      { title: 'Loop variable captured by reference in deferred tasks', html: `<p>Pushing <code>[&amp;i] { return i; }</code> into a vector inside a <code>for</code> loop: every closure refers to the same <code>i</code>, which is <b>out of scope</b> once the loop ends — classic bug in thread-pool and callback code. Capture <code>[i]</code> instead. (In languages like old JavaScript the same trap exists with <code>var</code>.)</p>` }
    ],
    deepDive: `<p><b>Closure type facts.</b> Every lambda expression has a unique, unnamed class type. A captureless lambda has an implicit conversion to a function pointer (so it can be passed to C APIs like <code>qsort</code>); unary <code>+</code> forces it: <code>+[](int){}</code>. Captured variables are members in unspecified order; by-reference captures may be optimised to a single frame pointer.</p>
      <p><b>What can be captured?</b> Only automatic (local) variables. Globals and <code>static</code> locals are used directly — <code>[=]</code> does <i>not</i> copy them, a surprise when the global changes later. Structured bindings can be captured since C++20. Parameter packs: <code>[...xs = std::move(xs)]</code> (C++20).</p>
      <p><b>Cost model.</b> A lambda passed to a template (e.g. <code>std::sort(v.begin(), v.end(), cmp)</code>) is inlined: zero overhead, usually faster than a function pointer. <code>std::function</code> uses type erasure: small closures fit in its internal buffer (SBO, typically 16–32 bytes), larger ones are heap-allocated; every call is an indirect call that blocks inlining. In hot loops prefer templates/<code>auto</code>; use <code>std::function</code> at API boundaries; consider <code>std::function_ref</code> (C++26) for non-owning callbacks.</p>
      <p><b>Mutable + copy semantics.</b> <code>std::generate(v.begin(), v.end(), [n = 0]() mutable { return n++; })</code> works, but algorithms may <b>copy</b> the functor, so state can be duplicated (classic with <code>std::for_each</code> returning the functor, and with <code>std::remove_if</code> which may copy the predicate). Keep stateful predicates out of algorithms, or hold the state by reference.</p>
      <p><b>Lifetime checklist for any lambda that escapes:</b> no <code>[&amp;]</code>; no raw <code>this</code> unless the owner provably outlives it; no references/pointers/string_views to locals; prefer init-captures that own data. In coroutines and async code (<code>std::async</code>, asio handlers, thread pools) this is the number-one source of use-after-free bugs.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants love <code>[&amp;]</code> because it always compiles. For lambdas used inline with algorithms that is fine; for anything stored, returned, or sent to another thread it is a latent use-after-free. When reviewing AI code, find every lambda that <b>escapes</b> its scope and check each capture.</p>
      <p><b>Use AI as a partner:</b> <code>List every lambda in this file that outlives the enclosing function and the lifetime of each captured variable</code>. Ask it to rewrite with init-captures, then run tests under <code>-fsanitize=address</code> to confirm.</p>
      <p><b>Where AI goes wrong:</b> <code>[=]</code> in member functions assuming it copies members; storing move-only closures in <code>std::function</code>; capturing <code>std::string_view</code> or iterators by value (still non-owning!); forgetting <code>mutable</code> or misunderstanding that it does not affect the original.</p>
      <p><b>What you must still own:</b> the closure-as-object mental model. Once you see captures as data members, every lifetime question becomes "who owns this member's target?" — something tools only partially check.</p>`,
    problems: [{
      title: 'Fix the Deferred Task Capture Bug', level: 'Easy', tags: ['lambdas', 'captures', 'lifetime'], companies: ['Microsoft', 'Adobe', 'Amazon'],
      statement: `<p>A function <code>makeTasks(int n)</code> should return a <code>std::vector&lt;std::function&lt;int()&gt;&gt;</code> where task <code>i</code> returns <code>i * i</code> when run <b>later</b>. The current code captures <code>[&amp;]</code> and prints garbage or crashes. Fix it, and also add a task that owns a <code>std::string</code> label moved into it.</p>`,
      constraints: `0 ≤ n ≤ 46341 (so that i·i still fits in an int). Tasks run after makeTasks has returned. No global variables.`,
      example: `<p><code>makeTasks(4)</code>, then run all → ${H.c('g', '0 1 4 9')}<br>Buggy version → ${H.c('r', 'undefined behaviour')}: every lambda refers to the loop variable <code>i</code>, which died when the loop (and the function) ended.</p>`,
      brute: { why: `<p>The buggy version captures by reference. Each closure stores a reference to <code>i</code> (a local of <code>makeTasks</code>). When the caller runs the tasks, that stack memory has been reused — undefined behaviour. It "works" sometimes in debug builds, which makes it worse.</p>`, code: R`#include <functional>
#include <vector>
std::vector<std::function<int()>> makeTasksBuggy(int n) {
    std::vector<std::function<int()>> tasks;
    for (int i = 0; i < n; ++i)
        tasks.push_back([&] { return i * i; });   // BUG: i dies at end of each iteration / function
    return tasks;
}
int main() { auto t = makeTasksBuggy(3); return t.size() == 3 ? 0 : 1; /* calling t[0]() would be UB */ }` },
      mcq: { q: 'Which capture makes each task own the right number?', options: ['<code>[&amp;i]</code>', '<code>[i]</code>', '<code>[this]</code>', '<code>[&amp;]</code> with <code>mutable</code>'], answer: 1, explain: '[i] copies the current value of i into each closure at creation time, so every task has its own correct snapshot that survives the function returning.' },
      hints: [`<p>Hint 1: Ask "does this lambda outlive the variables it refers to?" Here: yes, it is returned. So nothing may be captured by reference.</p>`, `<p>Hint 2: <code>[i]</code> snapshots the loop counter at creation time. For a string you want to <b>move</b> in, use an init-capture <code>[label = std::move(label)]</code>.</p>`, `<p>Hint 3: Recipe: loop i = 0..n-1, push <code>[i] { return i * i; }</code>. Then push <code>[label = std::move(label)] { return (int)label.size(); }</code>. Return the vector (it is moved out automatically).</p>`],
      tests: {"io":true,"cases":[{"stdin":"","stdout":"0 1 4 9 6\n0 2\n1 0\n46342 33171177740190 2147395600 1"}]},
      solution: {
        approach: `<p>Capture by value so each closure owns a copy of <code>i</code>. Use an init-capture to move the string into the last task (the closure stays copyable because <code>std::string</code> is copyable, so it fits in <code>std::function</code>).</p>`,
        code: R`#include <functional>
#include <iostream>
#include <string>
#include <utility>
#include <vector>

std::vector<std::function<int()>> makeTasks(int n, std::string label) {
    std::vector<std::function<int()>> tasks;
    tasks.reserve(n + 1);
    for (int i = 0; i < n; ++i)
        tasks.push_back([i] { return i * i; });                          // own copy of i
    tasks.push_back([label = std::move(label)] { return static_cast<int>(label.size()); }); // owns the string
    return tasks;
}

int main() {
    auto tasks = makeTasks(4, "report");
    for (auto& t : tasks) std::cout << t() << ' ';   // 0 1 4 9 6
    std::cout << '\n';
    auto one = makeTasks(1, "ab");
    for (auto& t : one) std::cout << t() << ' ';     // 0 2
    std::cout << '\n';
    auto none = makeTasks(0, "");
    std::cout << none.size() << ' ' << none[0]() << '\n';   // 1 0
    auto big = makeTasks(46341, "z");                // i*i still fits in int for i = 46340
    long long sum = 0;
    for (int i = 0; i < 46341; ++i) sum += big[i]();
    std::cout << big.size() << ' ' << sum << ' ' << big[46340]() << ' ' << big.back()() << '\n';
}`,
        dry: { head: ['iteration / step', 'closure created', 'closure member', 'value when run later'], rows: [['i = 0', '[i]{ return i*i; }', 'i = 0', '0'], ['i = 1', '[i]{...}', 'i = 1', '1'], ['i = 2', '[i]{...}', 'i = 2', '4'], ['i = 3', '[i]{...}', 'i = 3', '9'], ['after loop', '[label = move(label)]', 'label = "report"', '6']] },
        complexity: `<p>O(n) time and memory to build the tasks; each closure stores one int (fits in std::function's small buffer, so typically no heap allocation per task).</p>`,
        followUps: ['Make the tasks run on a thread pool — what extra capture rules apply?', 'If label were a <code>std::unique_ptr</code>, why would <code>std::function</code> reject the lambda, and what would you use instead?', 'Rewrite returning <code>std::vector&lt;int(*)()&gt;</code> — why is that impossible with captures?']
      }
    }]
  });
  /* ======================================================================
     TOPIC 5 — auto, decltype & structured bindings
     ====================================================================== */
  function autoViz() {
    var DECLS = [
      ['auto a = ci;', 'int', 'Plain <code>auto</code> = "make a copy". Top-level <b>const is dropped</b> (your copy is yours to change).'],
      ['auto& b = ci;', 'const int&', 'With <code>&amp;</code> you refer to the original, so <b>const must be kept</b> — otherwise you could modify ci through b.'],
      ['auto c = rx;', 'int', 'The <b>reference is dropped</b> too: c is an independent copy of x. Changing c does not change x. (Common surprise!)'],
      ['auto d = arr;', 'int*', 'A C array <b>decays</b> to a pointer when copied. <code>auto&amp; d2 = arr;</code> would give <code>int(&amp;)[3]</code>.'],
      ['auto e = {1, 2};', 'std::initializer_list<int>', 'Copy-list-initialisation with braces deduces <code>std::initializer_list</code> — rarely what you want.'],
      ['auto f{1};', 'int', 'Direct-list-init with ONE element deduces the element type (C++17 fixed this; before it was initializer_list).'],
      ['const auto& g = 42;', 'const int&', 'Binds to a temporary; its lifetime is extended to g\'s scope.'],
      ['auto&& h = x;', 'int&', '<code>auto&amp;&amp;</code> is a forwarding reference: lvalue in → lvalue reference.'],
      ['auto&& i = 42;', 'int&&', 'Forwarding reference with an rvalue → rvalue reference (temporary lifetime extended).'],
      ['decltype(x) j = x;', 'int', '<code>decltype(name)</code> = the DECLARED type of the name, exactly (const and & included if declared so).'],
      ['decltype((x)) k = x;', 'int&', 'Extra parentheses: decltype of the EXPRESSION (x), an lvalue → <code>int&amp;</code>.'],
      ['decltype(auto) l = rx;', 'int&', '<code>decltype(auto)</code> = deduce with decltype rules: keeps the reference. Used for perfect return types.']
    ];
    var frames = [], rows = [];
    var setup = 'const int ci = 5;\nint x = 1;\nint& rx = x;\nint arr[3] = {1, 2, 3};\n' + DECLS.map(function (d) { return d[0]; }).join('\n');
    frames.push({ narr: '<b>Part 1 — what does auto deduce?</b> Setup: <code>const int ci = 5; int x = 1; int&amp; rx = x; int arr[3];</code>. Plain <code>auto</code> follows template deduction rules for <code>template&lt;class T&gt; void f(T p)</code>: it behaves like <b>pass-by-value</b>.', parts: [
      { type: 'code', label: 'Declarations', lang: 'cpp', code: setup, hl: { 1: 'win', 2: 'win', 3: 'win', 4: 'win' } },
      { type: 'table', label: 'Deduced types', columns: ['declaration', 'deduced type'], rows: [] }
    ] });
    DECLS.forEach(function (d, i) {
      rows.push([d[0], d[1]]);
      var hl = {}; rows.forEach(function (_, k) { hl[k] = k === i ? 'cur' : 'done'; });
      var ch = {}; ch[5 + i] = 'cur';
      frames.push({ narr: '<code>' + H.esc(d[0]) + '</code> → <b>' + H.esc(d[1]) + '</b>. ' + d[2], parts: [
        { type: 'code', label: 'Declarations', lang: 'cpp', code: setup, hl: ch },
        { type: 'table', label: 'Deduced types', columns: ['declaration', 'deduced type'], rows: rows.map(function (r) { return r.slice(); }), hl: hl }
      ] });
    });
    var map = [['ann', 30], ['bob', 25]];
    frames.push({ narr: '<b>Part 2 — structured bindings.</b> <code>for (const auto&amp; [name, age] : ages)</code>. The compiler creates ONE hidden variable <code>e</code> (here <code>const std::pair&lt;const std::string, int&gt;&amp; e = *it</code>), and <code>name</code>/<code>age</code> are just <b>aliases</b> for <code>e.first</code>/<code>e.second</code>. The <code>const auto&amp;</code> applies to e, not to the names individually.', parts: [
      { type: 'map', label: 'std::map&lt;std::string,int&gt; ages', entries: map.map(function (e) { return e.slice(); }), hl: { ann: 'cur' } },
      { type: 'vars', label: 'Iteration 1', vals: { 'hidden e': 'const pair& → {"ann", 30}', name: 'alias of e.first = "ann"', age: 'alias of e.second = 30' }, hl: { 'hidden e': 'sel' } }
    ] });
    frames.push({ narr: '<code>for (auto&amp; [name, age] : ages) age += 1;</code> — now e is a <b>non-const reference</b>, so writing to <code>age</code> writes straight into the map. (name stays const because map keys are <code>const std::string</code>.)', parts: [
      { type: 'map', label: 'ages after the loop', entries: map.map(function (e) { return [e[0], e[1] + 1]; }), hl: { ann: 'ok', bob: 'ok' } },
      { type: 'vars', label: 'What changed', vals: { 'hidden e': 'pair& (refers into the map)', 'age += 1': 'modifies the map element', 'name = "x"': 'compile error: key is const' }, hl: { 'age += 1': 'ok', 'name = "x"': 'bad' } }
    ] });
    frames.push({ narr: '<code>auto [it, inserted] = ages.insert({"cat", 3});</code> — plain <code>auto</code> means e is a <b>copy</b> of the returned <code>std::pair&lt;iterator, bool&gt;</code>; it and inserted name its members. Much clearer than <code>.first</code>/<code>.second</code>.', parts: [
      { type: 'map', label: 'ages', entries: [['ann', 31], ['bob', 26], ['cat', 3]], hl: { cat: 'ok' } },
      { type: 'vars', label: 'Bindings', vals: { 'hidden e': 'pair<iterator,bool> (a copy)', it: '→ {"cat", 3}', inserted: 'true' }, hl: { inserted: 'ok' } }
    ] });
    frames.push({ narr: 'Three kinds of things can be unpacked: (1) <b>C arrays</b> (<code>auto [a, b, c] = arr;</code>), (2) <b>tuple-like types</b> (std::pair, std::tuple, std::array, or your type with <code>tuple_size</code>/<code>get</code>), (3) <b>structs with all public non-static members</b> (bound in declaration order). The number of names must match exactly.', parts: [
      { type: 'table', label: 'Structured binding sources', columns: ['source', 'example', 'names bind to'], rows: [['C array', 'auto [a, b, c] = arr;', 'elements of the hidden copy'], ['tuple-like', 'auto [k, v] = *map.begin();', 'get<0>(e), get<1>(e)'], ['plain struct', 'auto [x, y] = Point{1, 2};', 'e.x, e.y in declaration order']], hl: { 1: 'sel' } }
    ] });
    return frames;
  }

  topics.push({
    title: 'auto, decltype & Structured Bindings',
    analogy: `<p><b>auto</b> is like telling a shop assistant "I'll take one of whatever that is" — you get a <b>fresh item off the shelf</b> (a copy), without the "display only / do not touch" sticker (top-level const) and not the display item itself (the reference). If you want <i>that exact item</i>, say <code>auto&amp;</code>. <b>Structured bindings</b> are like opening a bento box and giving each compartment a name: "rice", "fish" — the box (hidden object) is still one thing; the names are just labels on its parts.</p>`,
    explain: `<p><b>auto</b> asks the compiler to deduce a variable's type from its initializer. It uses the same rules as template argument deduction:</p>
      <ul>
        <li><code>auto x = expr;</code> — like pass-by-value: drops references and top-level <code>const</code>, decays arrays/functions to pointers. <b>Always a copy.</b></li>
        <li><code>auto&amp; x = expr;</code> — reference; keeps <code>const</code>; requires an lvalue.</li>
        <li><code>const auto&amp; x = expr;</code> — binds to anything (read-only), extends temporaries.</li>
        <li><code>auto&amp;&amp; x = expr;</code> — forwarding reference: binds to anything, keeps const, lvalue → <code>T&amp;</code>, rvalue → <code>T&amp;&amp;</code>.</li>
      </ul>
      <p><b>decltype(e)</b> reports a type <i>without</i> evaluating e. For an unparenthesised name it gives the declared type; for any other expression it adds <code>&amp;</code> for lvalues and <code>&amp;&amp;</code> for xvalues. <b>decltype(auto)</b> deduces with decltype rules — the tool for wrappers that must return exactly what they call (including references).</p>
      ${H.table(['declaration', 'type of v'], [['<code>auto v = ci;</code> (const int ci)', 'int'], ['<code>auto&amp; v = ci;</code>', 'const int&amp;'], ['<code>auto v = rx;</code> (int&amp; rx)', H.c('y', 'int (a copy!)')], ['<code>auto v = {1, 2};</code>', 'std::initializer_list&lt;int&gt;'], ['<code>decltype((x)) v = x;</code>', 'int&amp;'], ['<code>decltype(auto) v = rx;</code>', 'int&amp;']])}
      <p><b>Structured bindings</b> (C++17) unpack an aggregate into names: <code>auto [q, r] = divmod(17, 5);</code>, <code>for (const auto&amp; [key, value] : map)</code>. The qualifiers (<code>auto</code>, <code>auto&amp;</code>, <code>const auto&amp;</code>) apply to <b>one hidden object</b>; the names are aliases to its parts. So <code>auto [a, b] = pair;</code> copies the pair, while <code>auto&amp; [a, b] = pair;</code> lets you modify it.</p>
      <p><b>When to use auto:</b> long iterator types, lambdas (unnamable types), <code>make_unique</code>/casts where the type is already on the right. <b>Avoid</b> it when the exact type matters for correctness (e.g. integer width/signedness in arithmetic) or with proxy types like <code>std::vector&lt;bool&gt;::reference</code>.</p>`,
    clues: ['"What type does auto deduce here?" with const/reference/array/braces in the initializer', '"Difference between decltype(x) and decltype((x))"', '"Why did my auto loop not modify the vector?" → <code>auto</code> copies; use <code>auto&amp;</code>', '"Iterate a map and print key/value" → <code>for (const auto&amp; [k, v] : m)</code>', '"Return exactly what the wrapped function returns" → <code>decltype(auto)</code>', '"auto with std::vector&lt;bool&gt; / expression templates (Eigen)" → proxy-type trap'],
    code: [R`#include <iostream>
#include <map>
#include <string>
#include <tuple>
#include <type_traits>
#include <vector>

struct Point { double x, y; };
std::tuple<int, std::string, double> record() { return {7, "seven", 7.5}; }

int main() {
    const int ci = 5; int x = 1; int& rx = x;
    auto a = ci;            static_assert(std::is_same_v<decltype(a), int>);
    auto& b = ci;           static_assert(std::is_same_v<decltype(b), const int&>);
    auto c = rx;            static_assert(std::is_same_v<decltype(c), int>);
    auto&& h = x;           static_assert(std::is_same_v<decltype(h), int&>);
    decltype((x)) k = x;    static_assert(std::is_same_v<decltype(k), int&>);
    decltype(auto) l = rx;  static_assert(std::is_same_v<decltype(l), int&>);

    std::vector<int> v{1, 2, 3};
    for (auto e : v) e *= 10;            // modifies COPIES: v unchanged
    for (auto& e : v) e *= 10;           // modifies v
    std::map<std::string, int> ages{{"ann", 30}, {"bob", 25}};
    for (auto& [name, age] : ages) age += 1;                 // writes into the map
    auto [it, inserted] = ages.insert({"cat", 3});           // pair<iterator,bool>
    auto [id, word, score] = record();                       // tuple unpacking
    auto [px, py] = Point{1.5, 2.5};                         // aggregate unpacking
    std::cout << v[0] << ' ' << ages["ann"] << ' ' << it->first << inserted << ' '
              << id << word << score << ' ' << px + py << '\n';   // 10 31 cat1 7seven7.5 4
    (void)a; (void)b; (void)c; (void)h; (void)k; (void)l;
}`, R`#include <type_traits>
#include <utility>
#include <vector>

// decltype(auto) lets a forwarding wrapper return EXACTLY what the inner call returns.
template <class Container>
decltype(auto) firstElement(Container&& c) {
    return std::forward<Container>(c)[0];   // vector<int>& -> int&, so callers can assign
}

// Trailing return type with decltype: the return type depends on the parameters.
template <class A, class B>
auto multiply(A a, B b) -> decltype(a * b) { return a * b; }

int main() {
    std::vector<int> v{1, 2, 3};
    firstElement(v) = 42;                                        // works: returns int&
    static_assert(std::is_same_v<decltype(multiply(2, 1.5)), double>);
    return v[0] == 42 ? 0 : 1;
}`],
    codeTitle: ['auto deduction rules + structured bindings in action', 'decltype(auto) and trailing return types'],
    viz: { title: 'What does auto / decltype deduce? Then unpack with structured bindings', gen: autoViz },
    examples: [
      { title: 'Copy or reference? The silent copy in a range-for', html: `<p><code>for (auto s : names)</code> over a <code>std::vector&lt;std::string&gt;</code> copies every string (heap allocation per element if long). <code>for (const auto&amp; s : names)</code> reads without copying; <code>for (auto&amp; s : names)</code> lets you modify. For maps, the element type is <code>std::pair&lt;const K, V&gt;</code> — writing <code>for (const std::pair&lt;K, V&gt;&amp; p : m)</code> (without const K) silently creates a <b>temporary copy</b> each iteration because the types differ! <code>const auto&amp;</code> avoids that mistake.</p>`, code: R`#include <map>
#include <string>
#include <utility>
int main() {
    std::map<std::string, int> m{{"a", 1}};
    for (const std::pair<std::string, int>& p : m) (void)p;        // converts: COPY each iteration
    for (const std::pair<const std::string, int>& p : m) (void)p;  // exact type: no copy
    for (const auto& [k, v] : m) (void)k, (void)v;                 // easiest: no copy
}` },
      { title: 'auto with a proxy type: std::vector&lt;bool&gt;', html: `<p><code>auto flag = bits[3];</code> where <code>bits</code> is a <code>std::vector&lt;bool&gt;</code> does <b>not</b> give a bool — it gives a <code>std::vector&lt;bool&gt;::reference</code> proxy that points into the vector. Modify <code>flag</code> and you modify the vector; destroy the vector and the proxy dangles. Write <code>bool flag = bits[3];</code> or <code>auto flag = static_cast&lt;bool&gt;(bits[3]);</code> when you want a value.</p>`, code: R`#include <vector>
int main() {
    std::vector<bool> bits(8, false);
    auto proxy = bits[3];   // std::vector<bool>::reference, NOT bool
    proxy = true;           // writes into bits!
    bool value = bits[4];   // a real bool copy
    value = true;           // does not touch bits
    return (bits[3] && !bits[4]) ? 0 : 1;
}` },
      { title: 'Structured bindings on your own type (tuple protocol)', html: `<p>For a class with private members, opt in by specialising <code>std::tuple_size</code> and <code>std::tuple_element</code> and providing <code>get&lt;I&gt;</code>. Then <code>auto [w, h] = rect;</code> works. For plain structs with public members you need nothing at all.</p>`, code: R`#include <cstddef>
#include <tuple>
#include <type_traits>
class Size {
    int w_ = 3, h_ = 4;
public:
    template <std::size_t I> int get() const { if constexpr (I == 0) return w_; else return h_; }
};
template <> struct std::tuple_size<Size> : std::integral_constant<std::size_t, 2> {};
template <std::size_t I> struct std::tuple_element<I, Size> { using type = int; };
int main() { Size s; auto [w, h] = s; return w * h == 12 ? 0 : 1; }` },
      { title: 'Integer surprise: auto and unsigned arithmetic', html: `<p><code>auto n = v.size() - 1;</code> is <code>std::size_t</code> (unsigned). If <code>v</code> is empty, <code>n</code> becomes 18446744073709551615, not -1, and <code>for (auto i = 0; i &lt; v.size(); ++i)</code> makes <code>i</code> an <code>int</code> compared with an unsigned. Use <code>std::ssize(v)</code> (C++20) for a signed size, or spell the type explicitly when width/signedness matters.</p>` }
    ],
    deepDive: `<p><b>auto = template deduction, with one exception:</b> braced initializers. <code>template&lt;class T&gt; void f(T); f({1,2});</code> fails, but <code>auto x = {1, 2};</code> deduces <code>std::initializer_list&lt;int&gt;</code>. C++17 (N3922) made <code>auto x{1};</code> an <code>int</code> and <code>auto x{1, 2};</code> ill-formed.</p>
      <p><b>Function return type deduction</b> (<code>auto f()</code>, C++14) uses auto rules on each return statement (all must agree) and drops references. <code>decltype(auto) f()</code> uses decltype rules — and therefore <code>return (local);</code> returns a dangling <code>int&amp;</code>. Abbreviated function templates (C++20): <code>void f(auto x)</code> is <code>template&lt;class T&gt; void f(T x)</code>; constrained: <code>void f(std::integral auto x)</code>.</p>
      <p><b>Structured bindings internals.</b> <code>auto&amp; [a, b] = expr;</code> is roughly <code>auto&amp; e = expr;</code> then <code>a</code> and <code>b</code> are names referring to <code>e.first</code>/<code>get&lt;0&gt;(e)</code>. They are not separate variables: <code>decltype(a)</code> gives the member's declared type, and before C++20 they could not be captured by lambdas. They cannot be declared <code>constexpr</code> (C++26 relaxes), and you cannot skip elements (C++26 adds <code>_</code> placeholders). For tuple-like types, each binding may become a real reference variable initialised from <code>get</code>.</p>
      <p><b>Performance:</b> <code>auto</code> itself is free — it is a compile-time feature. The cost comes from accidental copies (<code>auto</code> where <code>const auto&amp;</code> was meant) and accidental conversions (<code>const std::pair&lt;K,V&gt;&amp;</code> vs <code>pair&lt;const K,V&gt;</code>). AAA ("almost always auto", Herb Sutter) reduces the second kind of bug; explicit types reduce the proxy and integer-width kind. Most style guides (Google, LLVM) say: use auto when it improves readability and the type is obvious or irrelevant.</p>`,
    aiEra: `<p><b>What AI changes:</b> generated code tends to sprinkle <code>auto</code> everywhere, which reads nicely but hides copies, proxies and signedness. Your review question for each <code>auto</code>: "copy, reference, or proxy?"</p>
      <p><b>Use AI as a partner:</b> <code>For every auto in this function, write the deduced type in a comment</code> — then verify a couple with <code>static_assert(std::is_same_v&lt;decltype(v), ...&gt;)</code> or by hovering in clangd. This is also a great way to learn the rules.</p>
      <p><b>Where AI goes wrong:</b> claims like "auto keeps const" (only with references), using <code>decltype(auto)</code> with <code>return (x);</code>, iterating maps with the wrong pair type, binding <code>auto&amp;</code> to a temporary returned by value (does not compile) and then "fixing" it by removing the <code>&amp;</code> (silent copy).</p>
      <p><b>What you must still own:</b> the deduction table above. In interviews it shows up as rapid-fire "what is the type of v?" questions, and in production as performance regressions from accidental copies in hot loops.</p>`
  });
  /* ======================================================================
     TOPIC 6 — constexpr, consteval, constinit, if constexpr
     ====================================================================== */
  function constexprViz(input) {
    var n = parseInt(String(input === undefined ? '5' : input).trim(), 10);
    if (isNaN(n) || n < 0 || n > 15) throw new Error('Enter n between 0 and 15 (try 13 to see a compile-time overflow error)');
    var frames = [], st = [], LIM = 2147483647;
    var CODE = 'constexpr int fact(int n) {\n    return n <= 1 ? 1 : n * fact(n - 1);\n}\nstatic_assert(fact(' + n + ') > 0);\nconstexpr int table_value = fact(' + n + ');';
    function parts(hlLine, hlStack, extra) {
      var p = [{ type: 'stack', label: 'Compiler\'s constant-evaluation stack (not the CPU stack!)', items: st.slice(), hl: hlStack || {} }, { type: 'code', label: 'Source', lang: 'cpp', code: CODE, hl: hlLine || {} }];
      return p.concat(extra || []);
    }
    frames.push({ narr: 'The compiler meets <code>static_assert(fact(' + n + ') &gt; 0)</code>. A static_assert needs its value <b>during compilation</b>, so the compiler runs <code>fact</code> itself, inside its built-in interpreter (GCC/Clang have a "constant evaluator"). Nothing happens at runtime.', parts: parts({ 4: 'cur' }, {}, [{ type: 'vars', label: 'Who runs the code?', vals: { evaluator: 'the COMPILER', 'runtime cost': '0 instructions' }, hl: { evaluator: 'sel' } }]) });
    for (var k = n; k >= 0; k--) {
      st.push('fact(' + k + ')');
      var hs = {}; hs[st.length - 1] = 'cur';
      if (k <= 1) { frames.push({ narr: 'fact(' + k + '): base case <code>n &lt;= 1</code> → returns 1. Now the compiler unwinds, multiplying on the way back.', parts: parts({ 2: 'ok' }, hs) }); break; }
      if (k === n || k === 2 || n - k < 2) frames.push({ narr: 'Compiler calls <code>fact(' + k + ')</code>: not a base case, needs <code>' + k + ' * fact(' + (k - 1) + ')</code>. Push another evaluation frame. (Compilers cap this depth — GCC <code>-fconstexpr-depth=512</code> by default.)', parts: parts({ 2: 'cur' }, hs) });
    }
    var val = 1, overflow = false;
    for (var j = st.length - 1; j >= 0; j--) {
      var m = parseInt(st[j].replace(/\D/g, ''), 10);
      var nv = m <= 1 ? 1 : m * val;
      var hs2 = {}; hs2[j] = 'ok';
      if (nv > LIM) {
        overflow = true;
        hs2[j] = 'bad';
        frames.push({ narr: '<span class="c-r"><b>Compile error!</b></span> <code>' + m + ' * ' + val + ' = ' + nv + '</code> overflows <code>int</code> (max 2147483647). Signed overflow is <b>undefined behaviour</b>, and UB is <b>forbidden</b> during constant evaluation, so the compiler stops with "expression is not a constant expression: overflow". At runtime this would have silently produced garbage — constexpr turned a UB bug into a build failure.', parts: parts({ 2: 'bad', 4: 'bad' }, hs2, [{ type: 'vars', label: 'Values', vals: { 'needed': m + ' * ' + val, 'INT_MAX': LIM, 'result': 'ill-formed' }, hl: { result: 'bad' } }]) });
        break;
      }
      val = nv;
      if (j === 0 || j >= st.length - 2 || j === 1) frames.push({ narr: '<code>' + st[j] + '</code> returns <b>' + val + '</b>.', parts: parts({ 2: 'ok' }, hs2, [{ type: 'vars', label: 'Running result', vals: { 'returned value': val }, hl: { 'returned value': 'ok' } }]) });
      st.pop();
    }
    if (!overflow) {
      frames.push({ narr: '<code>static_assert</code> passes and <code>table_value</code> is baked into the binary as the constant <b>' + val + '</b>. The generated machine code is just <code>mov eax, ' + val + '</code> — the recursion never runs on the CPU.', parts: parts({ 4: 'ok', 5: 'ok' }, {}, [{ type: 'vars', label: 'In the compiled program', vals: { table_value: val, 'calls at runtime': 0 }, hl: { table_value: 'sel' } }]) });
      frames.push({ narr: 'Same function, <b>runtime</b> argument: <code>int k; std::cin &gt;&gt; k; int r = fact(k);</code>. A <code>constexpr</code> function is only <i>allowed</i> to run at compile time; with a value known only at runtime it compiles to a normal function. If you need a guarantee, use <code>consteval</code> (must run at compile time) or assign the result to a <code>constexpr</code> variable.', parts: [
        { type: 'table', label: 'Which keyword promises what?', columns: ['keyword', 'applies to', 'promise'], rows: [['constexpr (variable)', 'variables', 'value computed at compile time; implicitly const'], ['constexpr (function)', 'functions', 'CAN run at compile time if args are constant'], ['consteval (C++20)', 'functions', 'MUST run at compile time ("immediate function")'], ['constinit (C++20)', 'static/global vars', 'initialised at compile time, but stays mutable'], ['if constexpr (C++17)', 'branches in templates', 'discarded branch is not instantiated']], hl: { 1: 'cur' } }
      ] });
    }
    return frames;
  }

  topics.push({
    title: 'constexpr, consteval, constinit & if constexpr',
    analogy: `<p>A restaurant can cook your meal <b>when you order</b> (runtime), or <b>prep it in the morning</b> before doors open (compile time) so serving takes zero seconds. <code>constexpr</code> marks a recipe as "safe to prep in the morning if the ingredients are known in advance". <code>consteval</code> says "this dish is <i>only</i> ever prepped in the morning". <code>constinit</code> says "this pot must be filled before opening — but the chef may still stir it later". And the morning chef is strict: any kitchen accident (undefined behaviour) cancels the whole service (a compile error) instead of quietly serving a bad dish.</p>`,
    explain: `<p><b>constexpr</b> lets code run <b>inside the compiler</b>, so results become constants baked into the program.</p>
      <ul>
        <li><b>constexpr variable</b>: <code>constexpr int N = 1 &lt;&lt; 10;</code> — must be computable at compile time; can be used as an array size, template argument, in <code>static_assert</code>, in <code>case</code> labels.</li>
        <li><b>constexpr function</b>: <code>constexpr int sq(int x) { return x * x; }</code> — <i>may</i> be evaluated at compile time when all inputs are constants and the result is needed as a constant; otherwise it is an ordinary runtime function. Since C++14 it can have loops, locals and multiple returns; since C++20 it can use <code>std::vector</code>/<code>std::string</code> (allocations must be freed before evaluation ends), <code>try</code> blocks, virtual calls.</li>
        <li><b>consteval</b> (C++20): an <b>immediate function</b> — every call must produce a constant. Calling it with a runtime value is a compile error.</li>
        <li><b>constinit</b> (C++20): a static/global variable must be <b>initialised</b> at compile time (no static-initialisation-order fiasco), yet it is <b>not</b> const.</li>
        <li><b>if constexpr</b> (C++17): inside a template, the false branch is <b>discarded</b> — not even instantiated — so it may contain code that would not compile for this type. Replaces most SFINAE/tag-dispatch tricks.</li>
        <li><b>std::is_constant_evaluated()</b> / C++23 <code>if consteval</code>: choose a compile-time-friendly path vs a fast runtime path (e.g. intrinsics).</li>
      </ul>
      ${H.table(['', 'const', 'constexpr'], [['meaning', '"I will not change this"', '"this is known at compile time"'], ['<code>const int a = rand();</code>', H.c('g', 'OK (runtime value)'), H.c('r', 'error')], ['usable as array size / template arg', 'only if initialised with a constant', H.c('g', 'always')], ['on functions', 'n/a (const member fn = different meaning)', 'may run at compile time']])}
      <p>Why care? Zero runtime cost for tables (CRC, popcount, trig), compile-time validation (format strings — <code>std::format</code> checks them with consteval!), and <b>UB detection</b>: undefined behaviour is not allowed during constant evaluation, so overflow or out-of-bounds access in a constexpr test becomes a compile error.</p>`,
    clues: ['"Compute this at compile time" / "zero runtime cost lookup table"', '"Difference between const and constexpr" (and consteval / constinit)', '"Template branch that does not compile for some types" → <code>if constexpr</code>', '"Static initialization order fiasco" → <code>constinit</code> or function-local static', '"Validate a format string / configuration at build time" → consteval', 'Array size or template argument computed from a function'],
    code: [R`#include <array>
#include <cstdint>
#include <iostream>
#include <string>
#include <type_traits>
#include <vector>

constexpr std::uint64_t fib(int n) {                 // loops and locals are fine since C++14
    std::uint64_t a = 0, b = 1;
    for (int i = 0; i < n; ++i) { auto t = a + b; a = b; b = t; }
    return a;
}

constexpr auto makeSquares() {                       // build a whole table at compile time
    std::array<int, 10> t{};
    for (int i = 0; i < 10; ++i) t[i] = i * i;
    return t;
}
constexpr auto SQUARES = makeSquares();              // lives in read-only data, computed by the compiler

consteval int mustBeCompileTime(int x) { return x * 2; }   // C++20 immediate function
constinit int globalCounter = mustBeCompileTime(21);       // compile-time init, still mutable

constexpr int sumWithVector(int n) {                 // C++20: transient allocation is allowed
    std::vector<int> v;
    for (int i = 1; i <= n; ++i) v.push_back(i);
    int s = 0;
    for (int x : v) s += x;
    return s;                                        // vector freed before evaluation ends
}

template <class T>
std::string describe(const T& v) {
    if constexpr (std::is_integral_v<T>)       return "int-like: " + std::to_string(v);
    else if constexpr (std::is_floating_point_v<T>) return "float: " + std::to_string(v);
    else                                       return "other: " + std::string(v);  // only instantiated for string-like T
}

int main() {
    static_assert(fib(50) == 12586269025ULL);
    static_assert(SQUARES[7] == 49);
    static_assert(sumWithVector(100) == 5050);
    int runtimeN = 0;
    std::cin >> runtimeN;                           // unknown until the program runs
    std::cout << fib(runtimeN) << ' ' << ++globalCounter << ' '     // fib runs at RUNTIME here
              << describe(42) << ", " << describe(2.5) << ", " << describe("hi") << '\n';
    // mustBeCompileTime(runtimeN);                 // error: not a constant expression
}`],
    codeTitle: ['constexpr, consteval, constinit, if constexpr and constexpr std::vector'],
    viz: { title: 'Compile-time evaluation of constexpr fact(n)', input: '5', inputLabel: 'n (0–15; 13+ overflows int → compile error)', gen: constexprViz },
    examples: [
      { title: 'constexpr function: compile time or runtime?', html: `<p>The same <code>constexpr int sq(int)</code> is evaluated at compile time in <code>constexpr int a = sq(4);</code>, <code>int arr[sq(3)];</code>, <code>static_assert(sq(2) == 4);</code> and <code>std::array&lt;int, sq(2)&gt;</code>. In <code>int b = sq(4);</code> the compiler <i>may</i> fold it (optimisation) but is not required to. In <code>int c = sq(userInput);</code> it is a normal call.</p>`, code: R`#include <array>
constexpr int sq(int x) { return x * x; }
int main(int argc, char**) {
    constexpr int a = sq(4);          // guaranteed compile time
    std::array<int, sq(3)> arr{};     // template argument: compile time
    int c = sq(argc);                 // runtime argument: ordinary call
    return a + static_cast<int>(arr.size()) + c > 0 ? 0 : 1;
}` },
      { title: 'Exercise: catch an out-of-bounds bug at compile time', html: `<p>Write unit tests as <code>static_assert</code>s on constexpr functions. If the function reads past an array end, constant evaluation fails, turning a sneaky runtime UB into a red build. Below, <code>sumFirst(arr, 4)</code> on a 3-element array would not compile in a static_assert ("array subscript out of bounds"), while the correct call passes.</p>`, code: R`#include <array>
constexpr int sumFirst(const std::array<int, 3>& a, int k) {
    int s = 0;
    for (int i = 0; i < k; ++i) s += a[i];
    return s;
}
constexpr std::array<int, 3> nums{1, 2, 3};
static_assert(sumFirst(nums, 3) == 6);
// static_assert(sumFirst(nums, 4) == 6);   // error: read of a[3] is not a constant expression
int main() {}` },
      { title: 'constinit fixes the static initialisation order fiasco', html: `<p>Globals in different .cpp files are initialised in unspecified order. If <code>logger.cpp</code>'s global uses <code>config.cpp</code>'s global during dynamic initialisation, it may read zeros. <code>constinit</code> forces <b>constant</b> (compile-time) initialisation, which always happens before any dynamic initialisation — and the compiler errors if it cannot. Unlike <code>constexpr</code>, the variable can still change at runtime.</p>`, code: R`constexpr int defaultPort() { return 8080; }
constinit int g_port = defaultPort();   // guaranteed initialised before any code runs
// constinit int g_bad = std::rand();   // error: not a constant initializer
int main() { g_port = 9090; return g_port == 9090 ? 0 : 1; }` },
      { title: 'if constexpr vs plain if in templates', html: `<p>With a plain <code>if (std::is_pointer_v&lt;T&gt;) return *v;</code>, both branches are compiled for every T — so <code>*v</code> fails for <code>int</code>. With <code>if constexpr</code>, the false branch is discarded at instantiation. Note: the discarded branch must still be syntactically valid, and a non-dependent error (e.g. <code>static_assert(false)</code> before C++23) still fires.</p>`, code: R`#include <type_traits>
template <class T>
auto valueOf(T v) {
    if constexpr (std::is_pointer_v<T>) return *v;   // only instantiated for pointers
    else return v;
}
int main() { int x = 5; return valueOf(&x) + valueOf(1) == 6 ? 0 : 1; }` }
    ],
    deepDive: `<p><b>Rules for constant evaluation.</b> Forbidden during constant evaluation: undefined behaviour (signed overflow, out-of-bounds, null dereference, reading uninitialised memory, using an object after its lifetime), <code>reinterpret_cast</code>, non-constexpr function calls, <code>goto</code> (until C++23), modifying non-local state not created in the evaluation, and (until C++20) heap allocation. This makes the constant evaluator a precise UB detector — some teams fuzz small pure functions by running them in <code>static_assert</code>s.</p>
      <p><b>Limits:</b> compilers cap recursion depth (<code>-fconstexpr-depth</code>, default 512 in GCC) and number of operations (<code>-fconstexpr-ops-limit</code>, default about 3.3·10<sup>7</sup> = 2<sup>25</sup> in GCC). Heavy constexpr work increases compile time; precomputed tables of millions of entries can bloat object files. Measure.</p>
      <p><b>constexpr implies inline</b> for functions and static data members, so they can live in headers. A <code>constexpr</code> variable at namespace scope has internal linkage unless declared <code>inline constexpr</code> (C++17) — use <code>inline constexpr</code> for header constants to avoid one copy per translation unit.</p>
      <p><b>Transient vs non-transient allocation.</b> C++20 lets constexpr code use <code>new</code>/<code>std::vector</code>/<code>std::string</code>, but every allocation must be freed before the constant evaluation ends — you cannot have a <code>constexpr std::vector&lt;int&gt; v = ...;</code> global. Pattern: compute into a vector, copy into a <code>std::array</code> whose size you computed in a first pass.</p>
      <p><b>consteval propagation (C++23, P2564)</b> lets constexpr functions that call consteval functions become immediate automatically. <b>std::format</b> uses a consteval constructor of <code>std::format_string</code> to validate format strings at compile time — <code>std::format("{:d}", "text")</code> fails to build.</p>
      <p><b>static reflection (C++26)</b> extends this world further: <code>^^T</code> and consteval metafunctions let code inspect types at compile time — everything builds on the constexpr machinery you learn here.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI tools are good at mechanically adding <code>constexpr</code> to pure functions and generating lookup-table builders. The judgement left to you: is compile-time evaluation actually worth the build-time cost, and does the code stay readable?</p>
      <p><b>Use AI as a partner:</b> <code>Turn these unit tests into static_asserts on constexpr functions and tell me which functions cannot be constexpr and why</code>. The compiler then becomes a free UB checker for those functions.</p>
      <p><b>Where AI goes wrong:</b> confusing <code>const</code> and <code>constexpr</code>; claiming a constexpr function "always runs at compile time"; using <code>consteval</code> where a runtime fallback is needed; writing <code>static_assert(false)</code> in an <code>if constexpr</code> else-branch (ill-formed before C++23 — use a dependent false); producing a global <code>constexpr std::vector</code> (not allowed).</p>
      <p><b>What you must still own:</b> knowing <i>when</i> code runs. In embedded, game and trading systems, moving work to compile time is a real latency tool; reasoning about it precisely is a senior-level signal.</p>`,
    problems: [{
      title: 'Compile-Time Prime Table', level: 'Medium', tags: ['constexpr', 'sieve', 'std::array'], companies: ['Optiver', 'IMC', 'Qualcomm'],
      statement: `<p>Write <code>constexpr</code> code that builds a <code>std::array&lt;bool, N&gt;</code> where entry <code>i</code> is true iff <code>i</code> is prime, entirely at compile time (sieve of Eratosthenes). Expose <code>constexpr bool isPrime(int)</code> that reads the table, and prove correctness with <code>static_assert</code>s. The program must do no prime computation at runtime.</p>`,
      constraints: `N = 1000 (template parameter). Must compile with -std=c++20. No global mutable state.`,
      example: `<p><code>static_assert(isPrime(2) &amp;&amp; isPrime(997) &amp;&amp; !isPrime(1) &amp;&amp; !isPrime(999));</code> ${H.c('g', 'compiles')}<br>Count of primes below 1000 → ${H.c('g', '168')} (also a static_assert).</p>`,
      brute: { why: `<p>The runtime approach computes the sieve on every program start (or, worse, trial-divides on every query: O(√n) each). The work is identical every run — a perfect candidate to move into the compiler. It also cannot be used in <code>static_assert</code> or as a template argument.</p>`, code: R`#include <vector>
std::vector<bool> buildAtRuntime(int n) {
    std::vector<bool> p(n, true);
    p[0] = p[1] = false;
    for (int i = 2; i * i < n; ++i)
        if (p[i]) for (int j = i * i; j < n; j += i) p[j] = false;
    return p;
}
int main() { auto p = buildAtRuntime(1000); return p[997] ? 0 : 1; }   // pays the cost every run` },
      mcq: { q: 'Why does <code>constexpr auto TABLE = sieve&lt;1000&gt;();</code> guarantee compile-time computation, while <code>auto t = sieve&lt;1000&gt;();</code> does not?', options: ['It does not; both are runtime', 'A constexpr variable must be initialised by a constant expression, so the compiler must evaluate the call', 'auto is always runtime', 'Because of the template argument'], answer: 1, explain: 'A constexpr variable requires a constant initializer, forcing constant evaluation. Without it, the call is an ordinary initialisation the optimiser may or may not fold.' },
      hints: [`<p>Hint 1: A constexpr function can declare a local <code>std::array&lt;bool, N&gt; p{}</code>, loop over it, modify it, and return it by value.</p>`, `<p>Hint 2: Store the result in a <code>constexpr</code> (or <code>inline constexpr</code>) variable to force compile-time evaluation. <code>isPrime</code> just indexes it (with a bounds check).</p>`, `<p>Hint 3: Recipe: fill all true; set [0],[1] false; for i from 2 while i*i &lt; N: if p[i], mark i*i, i*i+i, ... false. Add a constexpr <code>countPrimes()</code> and <code>static_assert(countPrimes() == 168)</code>.</p>`],
      tests: {"io":true,"cases":[{"stdin":"2\n","stdout":"prime"},{"stdin":"3\n","stdout":"prime"},{"stdin":"997\n","stdout":"prime"},{"stdin":"991\n","stdout":"prime"},{"stdin":"1\n","stdout":"not prime"},{"stdin":"0\n","stdout":"not prime"},{"stdin":"999\n","stdout":"not prime"},{"stdin":"998\n","stdout":"not prime"},{"stdin":"-7\n","stdout":"not prime"},{"stdin":"961\n","stdout":"not prime"},{"stdin":"961\n","stdout":"not prime"}]},
      solution: {
        approach: `<p>Run the classic sieve inside a <code>constexpr</code> function returning <code>std::array</code>, and bind it to a <code>constexpr</code> variable so the compiler must evaluate it. Queries are O(1) array reads; the table lives in read-only data.</p>`,
        code: R`#include <array>
#include <cstddef>
#include <iostream>

template <std::size_t N>
constexpr std::array<bool, N> sieve() {
    std::array<bool, N> p{};
    for (std::size_t i = 2; i < N; ++i) p[i] = true;
    for (std::size_t i = 2; i * i < N; ++i)
        if (p[i])
            for (std::size_t j = i * i; j < N; j += i) p[j] = false;
    return p;
}

inline constexpr auto PRIME = sieve<1000>();      // computed by the compiler

constexpr bool isPrime(int n) { return n >= 0 && n < static_cast<int>(PRIME.size()) && PRIME[n]; }

constexpr int countPrimes() {
    int c = 0;
    for (bool b : PRIME) c += b;
    return c;
}

static_assert(isPrime(2) && isPrime(997) && !isPrime(1) && !isPrime(999));
static_assert(countPrimes() == 168);
static_assert(!isPrime(0) && !isPrime(-3) && isPrime(3) && isPrime(991) && !isPrime(998));

int main() {
    int q = 0;
    std::cin >> q;
    std::cout << (isPrime(q) ? "prime" : "not prime") << '\n';   // just an array lookup at runtime
}`,
        dry: { head: ['i', 'p[i]?', 'marks false', 'table so far (2..15 primes)'], rows: [['2', 'true', '4, 6, 8, 10, ...', '2 3 5 7 9 11 13 15'], ['3', 'true', '9, 12, 15, ...', '2 3 5 7 11 13'], ['4', 'false', '— (skip)', '2 3 5 7 11 13'], ['5', 'true', '25, 30, ...', '2 3 5 7 11 13'], ['... 31', 'true', '961, 992', 'final: 168 primes &lt; 1000']] },
        complexity: `<p>Compile time: O(N log log N) evaluated by the compiler. Runtime: O(1) per query, 0 setup. Memory: N bytes of read-only data.</p>`,
        followUps: ['Make N a function parameter instead — why is that impossible for the array size?', 'Store primes themselves in a <code>std::array&lt;int, countPrimes()&gt;</code> using a second constexpr pass.', 'How would <code>consteval</code> change the API?']
      }
    }]
  });
  /* ======================================================================
     TOPIC 7 — std::optional, std::variant, std::any
     ====================================================================== */
  function vocabViz(input) {
    var DEF = 'o = 7; o.value_or 0; o = none; o.value_or 0; o.value; v = 42; v = 3.5; v = "hi"; get v int; visit v; a = 5; cast a string; cast a int';
    var ops = splitOps(input, DEF, 16), frames = [];
    var o = { has: false, val: null }, v = { idx: 0, val: 0 }, a = { type: 'empty', val: null };
    var TYPES = ['int', 'double', 'std::string'];
    function typeOf(lit) {
      if (/^".*"$/.test(lit)) return ['std::string', lit.slice(1, -1).slice(0, 12)];
      if (/^-?\d+$/.test(lit)) return ['int', parseInt(lit, 10)];
      if (/^-?\d*\.\d+$/.test(lit)) return ['double', parseFloat(lit)];
      throw new Error('Values must be an int (42), a double (3.5) or a quoted string ("hi") — got ' + lit);
    }
    function state(hl, msg) {
      var vals = {
        'o (optional<int>)': o.has ? 'engaged: ' + o.val : 'nullopt (empty)',
        'v (variant<int,double,string>)': 'index ' + v.idx + ' → ' + TYPES[v.idx] + ' ' + (v.idx === 2 ? '"' + v.val + '"' : v.val),
        'a (std::any)': a.type === 'empty' ? 'empty' : a.type + ' ' + (a.type === 'std::string' ? '"' + a.val + '"' : a.val)
      };
      var rows = TYPES.map(function (t, i) { return [i, t, i === v.idx ? (v.idx === 2 ? '"' + v.val + '"' : String(v.val)) : '(not active)']; });
      var p = [{ type: 'vars', label: 'The three vocabulary types', vals: vals, hl: hl || {} }, { type: 'table', label: 'Inside v: one shared storage block + an index (only ONE alternative is alive)', columns: ['index', 'alternative', 'value'], rows: rows, hl: one(v.idx, 'sel') }];
      if (msg) p.push(note(msg, 'Result'));
      return p;
    }
    var K = { o: 'o (optional<int>)', v: 'v (variant<int,double,string>)', a: 'a (std::any)' };
    frames.push({ narr: 'Three "vocabulary types" from C++17. <code>std::optional&lt;int&gt;</code> = an int <b>or nothing</b>. <code>std::variant&lt;int, double, std::string&gt;</code> = <b>exactly one</b> of these, and it knows which (type-safe union). <code>std::any</code> = <b>any single copyable value</b>, type checked at runtime. Steps: <code>' + H.esc(ops.join('; ')) + '</code>', parts: state() });
    ops.forEach(function (op) {
      var m;
      if ((m = op.match(/^o\s*=\s*(.+)$/))) {
        if (/none|nullopt|reset/.test(m[1])) { o.has = false; o.val = null; frames.push({ narr: '<code>o = std::nullopt;</code> — o is now <b>empty</b>. The int storage still exists inside o (no heap!), it is just marked "not engaged".', parts: state(one(K.o, 'cur')) }); }
        else { var t = typeOf(m[1].trim()); if (t[0] !== 'int') throw new Error('o is optional<int>: assign an int or none'); o.has = true; o.val = t[1]; frames.push({ narr: '<code>o = ' + t[1] + ';</code> — o now <b>contains</b> ' + t[1] + '. sizeof(optional&lt;int&gt;) is typically 8: 4 for the int + a bool flag + padding. No allocation.', parts: state(one(K.o, 'ok')) }); }
      } else if ((m = op.match(/^o\.value_or\s+(-?\d+)$/))) {
        var r = o.has ? o.val : parseInt(m[1], 10);
        frames.push({ narr: '<code>o.value_or(' + m[1] + ')</code> → <b>' + r + '</b>. ' + (o.has ? 'o has a value, so that value is returned.' : 'o is empty, so the fallback is returned. Safe, never throws.'), parts: state(one(K.o, 'ok'), 'value_or(' + m[1] + ') = ' + r) });
      } else if (/^o\.value$/.test(op) || /^\*o$/.test(op)) {
        if (op === '*o') frames.push({ narr: '<code>*o</code> on ' + (o.has ? 'an engaged optional → ' + o.val + '. Fast: no check.' : '<span class="c-r">an EMPTY optional → undefined behaviour</span>. operator* does not check!'), parts: state(one(K.o, o.has ? 'ok' : 'bad')) });
        else frames.push({ narr: '<code>o.value()</code> ' + (o.has ? '→ ' + o.val + '.' : '<span class="c-r">throws <b>std::bad_optional_access</b></span> because o is empty. value() checks; operator* does not.'), parts: state(one(K.o, o.has ? 'ok' : 'bad'), o.has ? 'value() = ' + o.val : 'exception: std::bad_optional_access') });
      } else if ((m = op.match(/^v\s*=\s*(.+)$/))) {
        var tv = typeOf(m[1].trim()), old = TYPES[v.idx];
        v.idx = TYPES.indexOf(tv[0]); v.val = tv[1];
        frames.push({ narr: '<code>v = ' + H.esc(m[1].trim()) + ';</code> — the variant ' + (old === tv[0] ? 'keeps alternative ' + old + ' and just assigns.' : '<b>destroys</b> the old ' + old + ', <b>constructs</b> a ' + H.esc(tv[0]) + ' in the same storage, and sets index = ' + v.idx + '.') + ' sizeof(v) ≈ size of the largest alternative (string, 32 B) + index → 40 B. Still no heap allocation for the variant itself.', parts: state(one(K.v, 'ok')) });
      } else if ((m = op.match(/^get\s+v\s+(int|double|string)$/))) {
        var want = m[1] === 'string' ? 'std::string' : m[1], okk = TYPES[v.idx] === want;
        frames.push({ narr: '<code>std::get&lt;' + H.esc(want) + '&gt;(v)</code> ' + (okk ? '→ ' + H.esc(String(v.val)) + '. Correct alternative.' : '<span class="c-r">throws <b>std::bad_variant_access</b></span>: v currently holds ' + TYPES[v.idx] + '. Use <code>std::get_if&lt;' + H.esc(want) + '&gt;(&amp;v)</code> to get a nullptr instead of an exception, or better, <code>std::visit</code>.'), parts: state(one(K.v, okk ? 'ok' : 'bad'), okk ? 'got ' + v.val : 'exception: std::bad_variant_access') });
      } else if (/^visit\s+v$/.test(op)) {
        var branch = ['[](int i) { ... }', '[](double d) { ... }', '[](const std::string& s) { ... }'][v.idx];
        frames.push({ narr: '<code>std::visit(overloaded{...}, v)</code> — reads the index (' + v.idx + ') and jumps to the matching lambda <code>' + H.esc(branch) + '</code> (implemented as a jump table, so O(1)). The compiler <b>forces you to handle every alternative</b>: forget one and it does not compile. That is the big advantage over a tag + union.', parts: state(one(K.v, 'sel'), 'called ' + H.esc(branch)) });
      } else if ((m = op.match(/^a\s*=\s*(.+)$/))) {
        var ta = typeOf(m[1].trim()); a.type = ta[0]; a.val = ta[1];
        frames.push({ narr: '<code>a = ' + H.esc(m[1].trim()) + ';</code> — std::any stores the value plus runtime type info. Small types (like int) live in a small internal buffer; big ones are <b>heap-allocated</b>. Any copyable type is accepted — the compiler cannot help you later.', parts: state(one(K.a, 'ok')) });
      } else if ((m = op.match(/^cast\s+a\s+(int|double|string)$/))) {
        var wa = m[1] === 'string' ? 'std::string' : m[1], oka = a.type === wa;
        frames.push({ narr: '<code>std::any_cast&lt;' + H.esc(wa) + '&gt;(a)</code> ' + (oka ? '→ ' + H.esc(String(a.val)) + '. The type matched exactly.' : '<span class="c-r">throws <b>std::bad_any_cast</b></span> — a holds ' + (a.type === 'empty' ? 'nothing' : H.esc(a.type)) + '. The type must match EXACTLY (no int → long conversion). The pointer form <code>std::any_cast&lt;T&gt;(&amp;a)</code> returns nullptr instead.'), parts: state(one(K.a, oka ? 'ok' : 'bad'), oka ? 'cast ok: ' + a.val : 'exception: std::bad_any_cast') });
      } else throw new Error('Unknown step "' + op + '". Use: o = 7; o = none; o.value_or 0; o.value; *o; v = 42 / 3.5 / "hi"; get v int; visit v; a = 5; cast a int');
    });
    frames.push({ narr: 'Choosing: "maybe a value" → <b>optional</b>. "One of a fixed, known set of types" → <b>variant</b> (compile-time checked, no heap). "Truly unknown type, decided at runtime" (plugin data, type-erased property bags) → <b>any</b> (rarely needed). For "value or error", C++23 adds <b>std::expected&lt;T, E&gt;</b>.', parts: state() });
    return frames;
  }

  topics.push({
    title: 'std::optional, std::variant & std::any',
    analogy: `<p>Three kinds of boxes. <b>optional</b> is a <b>gift box that may be empty</b> — you must check before you use what is inside. <b>variant</b> is a <b>bento box with one compartment that can hold rice OR noodles OR salad</b> — and a label on the lid saying which one it holds right now. <b>any</b> is a <b>cardboard moving box</b> — anything fits, but you only find out what is in it when you open it, and if you guessed wrong you get an unpleasant surprise.</p>`,
    explain: `<p>These are C++17 <b>vocabulary types</b>: standard ways to say common things, so APIs stop inventing their own conventions (-1 for "not found", null pointers, tag + union structs, <code>void*</code>).</p>
      <ul>
        <li><b><code>std::optional&lt;T&gt;</code></b> — either a T or nothing (<code>std::nullopt</code>). Stores the T <b>inline</b> (no heap). Check with <code>if (opt)</code> / <code>has_value()</code>; read with <code>*opt</code> (unchecked), <code>opt.value()</code> (throws <code>bad_optional_access</code>), or <code>opt.value_or(fallback)</code>. Perfect for "find" functions and optional config fields.</li>
        <li><b><code>std::variant&lt;A, B, C&gt;</code></b> — exactly one of A, B, C at a time; <code>index()</code> says which. A type-safe <b>tagged union</b>: assigning a new type destroys the old one properly. Access with <code>std::get&lt;T&gt;</code> (throws <code>bad_variant_access</code>), <code>std::get_if&lt;T&gt;</code> (returns pointer or nullptr), <code>std::holds_alternative&lt;T&gt;</code>, or best: <code>std::visit</code>, which calls a function for whichever alternative is active and forces you to handle all of them.</li>
        <li><b><code>std::any</code></b> — holds one value of <i>any</i> copyable type. Read back with <code>std::any_cast&lt;T&gt;</code>; the type must match exactly. Type-erased: may heap-allocate, no compile-time checking.</li>
      </ul>
      ${H.table(['', 'optional&lt;T&gt;', 'variant&lt;A,B,C&gt;', 'any'], [['holds', 'T or nothing', 'exactly one of A/B/C', 'one value of any type'], ['set of types known', 'at compile time', 'at compile time', 'at runtime'], ['heap allocation', 'never', 'never', 'for large types'], ['bad access', 'bad_optional_access', 'bad_variant_access', 'bad_any_cast'], ['typical size', 'sizeof(T) + flag', 'max(sizeof alts) + index', 'about 16–32 B + maybe heap'], ['use for', '"maybe" results', 'closed sets / state machines / ASTs', 'plugin data, rarely']])}
      <p>The <b>overloaded</b> idiom makes visiting pleasant: <code>template&lt;class... Ts&gt; struct overloaded : Ts... { using Ts::operator()...; };</code> then <code>std::visit(overloaded{[](int i){...}, [](const std::string&amp; s){...}}, v);</code></p>`,
    clues: ['"Return a value or nothing" / "might not be found" → <code>std::optional</code>', '"A value can be one of several types" / "AST node" / "state machine" / "JSON value" → <code>std::variant</code> + <code>std::visit</code>', '"Replace a union + enum tag" or "replace inheritance for a closed set of types" → variant', '"Store values of arbitrary types in a map" → <code>std::any</code> (and discuss why it is rarely ideal)', '"Error handling without exceptions" → optional / C++23 <code>std::expected</code>', '"What is the size of std::optional&lt;int&gt;?"'],
    code: [R`#include <iostream>
#include <map>
#include <optional>
#include <string>
#include <variant>
#include <vector>
#include <any>

// ---------- optional: a function that may not find anything ----------
std::optional<int> findAge(const std::map<std::string, int>& db, const std::string& name) {
    if (auto it = db.find(name); it != db.end()) return it->second;   // engaged
    return std::nullopt;                                              // empty
}

// ---------- variant: a closed set of shapes, no inheritance needed ----------
struct Circle { double r; };
struct Rect   { double w, h; };
using Shape = std::variant<Circle, Rect>;

template <class... Ts> struct overloaded : Ts... { using Ts::operator()...; };   // the "overloaded" idiom

double area(const Shape& s) {
    return std::visit(overloaded{
        [](const Circle& c) { return 3.14159 * c.r * c.r; },
        [](const Rect& r)   { return r.w * r.h; }
    }, s);                       // forget a case -> compile error
}

int main() {
    std::map<std::string, int> db{{"ann", 31}};
    std::cout << findAge(db, "ann").value_or(-1) << ' ' << findAge(db, "zed").value_or(-1) << '\n'; // 31 -1
    if (auto age = findAge(db, "ann")) std::cout << "found " << *age << '\n';

    std::vector<Shape> shapes{Circle{1.0}, Rect{2, 3}};
    for (const auto& s : shapes) std::cout << area(s) << ' ';
    std::cout << '\n';                                                     // 3.14159 6

    std::variant<int, std::string> v = 42;
    v = std::string("now a string");                                       // int destroyed, string built
    if (auto p = std::get_if<std::string>(&v)) std::cout << *p << " index=" << v.index() << '\n';

    std::any box = 3.5;
    try { std::cout << std::any_cast<int>(box); }                          // wrong type: throws
    catch (const std::bad_any_cast&) { std::cout << "bad_any_cast, holds double: " << std::any_cast<double>(box) << '\n'; }
}`],
    codeTitle: ['optional for "maybe", variant + visit for closed sets, any for the rare open case'],
    viz: { title: 'optional / variant / any — states, accesses, exceptions', input: 'o = 7; o.value_or 0; o = none; o.value_or 0; o.value; v = 42; v = 3.5; v = "hi"; get v int; visit v; a = 5; cast a string; cast a int', inputLabel: 'Steps: o = 7 | o = none | o.value_or N | o.value | *o | v = 42 / 3.5 / "hi" | get v int | visit v | a = 5 | cast a int', gen: vocabViz },
    examples: [
      { title: 'Replacing sentinel values with optional', html: `<p>Old API: <code>int indexOf(...)</code> returns -1 when missing — callers forget to check and use -1 as an index. New API: <code>std::optional&lt;std::size_t&gt; indexOf(...)</code>. The type itself says "may be missing", and <code>value_or</code> / <code>if (auto i = ...)</code> make handling explicit.</p>`, code: R`#include <cstddef>
#include <optional>
#include <string_view>
std::optional<std::size_t> indexOf(std::string_view s, char c) {
    for (std::size_t i = 0; i < s.size(); ++i) if (s[i] == c) return i;
    return std::nullopt;
}
int main() {
    if (auto i = indexOf("hello", 'l')) return *i == 2 ? 0 : 1;
    return 1;
}` },
      { title: 'variant as a state machine', html: `<p>A connection is <b>exactly one</b> of Disconnected, Connecting{attempt}, Connected{socketId}. With a variant, invalid combinations (connected but no socket id) are unrepresentable. Transitions are a <code>std::visit</code> returning the next state.</p>`, code: R`#include <variant>
struct Disconnected {};
struct Connecting { int attempt; };
struct Connected { int socketId; };
using Conn = std::variant<Disconnected, Connecting, Connected>;
template <class... Ts> struct overloaded : Ts... { using Ts::operator()...; };
Conn onTick(const Conn& c, bool success) {
    return std::visit(overloaded{
        [](const Disconnected&) -> Conn { return Connecting{1}; },
        [&](const Connecting& k) -> Conn { return success ? Conn{Connected{42}} : Conn{Connecting{k.attempt + 1}}; },
        [](const Connected& k) -> Conn { return k; }
    }, c);
}
int main() { Conn c = Disconnected{}; c = onTick(c, false); c = onTick(c, true); return std::holds_alternative<Connected>(c) ? 0 : 1; }` },
      { title: 'Copy or move? optional and variant hold values, not references', html: `<p><code>std::optional&lt;std::string&gt; o = name;</code> <b>copies</b> name into o; <code>= std::move(name)</code> moves. Returning <code>std::optional&lt;BigThing&gt;</code> from a function is cheap (moved or elided), but <code>std::optional&lt;T&amp;&gt;</code> is <b>not allowed</b> until C++26 — use <code>T*</code> or <code>std::optional&lt;std::reference_wrapper&lt;T&gt;&gt;</code> for "maybe a reference". Also: <code>o-&gt;size()</code> on an empty optional is UB, just like a null pointer.</p>`, code: R`#include <optional>
#include <string>
#include <utility>
int main() {
    std::string name(100, 'n');
    std::optional<std::string> a = name;              // copy
    std::optional<std::string> b = std::move(name);   // move: name now empty
    std::optional<std::string> c;
    c.emplace(5, 'x');                                // construct in place, no temporary
    return (a->size() == 100 && b->size() == 100 && *c == "xxxxx") ? 0 : 1;
}` },
      { title: 'Size check: what do these types cost?', html: `<p>On x86-64 libstdc++: <code>sizeof(std::optional&lt;int&gt;)</code> = 8, <code>sizeof(std::optional&lt;double&gt;)</code> = 16 (alignment!), <code>sizeof(std::variant&lt;int, double, std::string&gt;)</code> = 40, <code>sizeof(std::any)</code> = 16. Variant and optional never allocate by themselves; <code>any</code> allocates for types bigger than its small buffer (one pointer) or not nothrow-movable.</p>` }
    ],
    deepDive: `<p><b>variant internals.</b> A variant is a union of all alternatives plus a small index (the smallest integer type that fits). <code>std::visit</code> is typically implemented with a table of function pointers indexed by <code>index()</code> (or a switch for few alternatives), so dispatch is O(1) — comparable to a virtual call, but with the data stored inline (better cache locality than a vector of base-class pointers).</p>
      <p><b>valueless_by_exception.</b> If assigning a new alternative throws <i>after</i> the old one was destroyed (e.g. the new type's constructor throws), the variant ends up holding nothing: <code>v.valueless_by_exception()</code> is true and <code>index()</code> returns <code>std::variant_npos</code>. Implementations avoid this when the new type is nothrow-constructible by building a temporary first. Design advice: keep alternatives nothrow-move-constructible.</p>
      <p><b>variant&lt;std::string, bool&gt; v = "abc";</b> historically chose <code>bool</code> (pointer → bool conversion beats user-defined conversion). C++20 (P0608) fixed the converting constructor to reject narrowing/boolean conversions, so it now picks std::string. Always be explicit with similar alternatives.</p>
      <p><b>Monadic optional (C++23):</b> <code>opt.and_then(f).transform(g).or_else(h)</code> chains "maybe" computations without nested ifs. <b>std::expected&lt;T, E&gt;</b> (C++23) carries an error value instead of nothing — the C++ equivalent of Rust's <code>Result</code>.</p>
      <p><b>variant vs virtual functions.</b> Variant: closed set of types, open set of operations (add a new visitor anywhere), value semantics, no heap. Virtual: open set of types (plugins can add subclasses), closed set of operations, usually heap + pointers. Pick by asking which dimension will grow.</p>
      <p><b>any</b> uses type erasure: a pointer to a per-type "manager" function handles copy/destroy/type query. <code>any_cast</code> compares <code>typeid</code>s, so RTTI must be enabled. Prefer variant whenever the set of types is known.</p>`,
    aiEra: `<p><b>What AI changes:</b> generated code still often returns <code>nullptr</code>, -1, or empty strings as "missing" markers, or builds class hierarchies for what is really a closed set of cases. Asking for "use std::optional / std::variant here" is a quick, high-value review comment.</p>
      <p><b>Use AI as a partner:</b> <code>Refactor this enum-plus-union struct into std::variant with std::visit, keep behaviour identical, and list every place where a case was previously unhandled</code>. The compile errors from a non-exhaustive visit are a free bug finder.</p>
      <p><b>Where AI goes wrong:</b> using <code>*opt</code> without a check, <code>std::get&lt;T&gt;</code> in places that may throw, <code>std::any</code> where a variant would do, <code>std::optional&lt;T&amp;&gt;</code> (does not compile before C++26), and assuming <code>any_cast&lt;long&gt;</code> works on a stored <code>int</code>.</p>
      <p><b>What you must still own:</b> modelling — deciding that a value is "maybe", "one of N" or "anything", and making illegal states unrepresentable. That design skill transfers to Rust, Swift, Kotlin and TypeScript too.</p>`
  });
  /* ======================================================================
     TOPIC 8 — Ranges & views
     ====================================================================== */
  function rangesViz(input) {
    var s = String(input === undefined || input === null ? '1 2 3 4 5 6 7 8 9 10 | take 3' : input);
    var pieces = s.split('|'), k = 3;
    var nums = pieces[0].trim().split(/[\s,]+/).filter(Boolean).map(Number);
    if (!nums.length || nums.some(function (x) { return isNaN(x) || Math.abs(x) > 9999 || x !== Math.floor(x); })) throw new Error('Enter integers, then optionally "| take K" — e.g. 1 2 3 4 5 6 | take 2');
    if (nums.length > 16) throw new Error('Use at most 16 numbers');
    if (pieces[1]) { var mm = pieces[1].match(/take\s*(\d+)/); if (!mm) throw new Error('After "|" write: take K'); k = parseInt(mm[1], 10); if (k < 1 || k > 16) throw new Error('take K must be 1..16'); }
    var CODE = 'auto pipeline = nums\n    | std::views::filter([](int x) { return x % 2 == 0; })\n    | std::views::transform([](int x) { return x * x; })\n    | std::views::take(' + k + ');\nfor (int v : pipeline) out.push_back(v);   // work happens HERE, one element at a time';
    var frames = [], out = [], status = {}, touched = 0, filterCalls = 0, transformCalls = 0;
    function parts(cur, codeHl, extraVars) {
      var hl = {}; nums.forEach(function (_, i) { if (status[i]) hl[i] = status[i]; });
      var ptr = {}; if (cur !== null && cur !== undefined) { hl[cur] = 'cur'; ptr[cur] = 'it'; }
      var vals = { 'elements pulled from source': touched, 'filter calls': filterCalls, 'transform calls': transformCalls, 'taken so far': out.length + ' / ' + k };
      Object.keys(extraVars || {}).forEach(function (x) { vals[x] = extraVars[x]; });
      return [
        { type: 'array', label: 'source: nums (never copied — views just look at it)', values: nums.slice(), hl: hl, ptr: ptr },
        { type: 'code', label: 'Pipeline', lang: 'cpp', code: CODE, hl: codeHl || {} },
        { type: 'vars', label: 'Work counters (laziness made visible)', vals: vals },
        { type: 'array', label: 'out (what the loop received)', values: out.slice(), hl: out.length ? one(out.length - 1, 'ok') : {} }
      ];
    }
    frames.push({ narr: 'Building the pipeline does <b>no work at all</b>: <code>filter</code>, <code>transform</code> and <code>take</code> are <b>views</b> — lightweight objects that remember "what to do" and hold a reference to <code>nums</code>. Counters are all zero. Work starts only when the for-loop asks for the first element.', parts: parts(null, { 1: 'win', 2: 'win', 3: 'win', 4: 'win' }) });
    for (var i = 0; i < nums.length && out.length < k; i++) {
      touched++; filterCalls++;
      var even = nums[i] % 2 === 0;
      if (!even) {
        status[i] = 'bad';
        frames.push({ narr: 'The loop asks for the next value. take asks transform, transform asks filter, filter pulls <b>' + nums[i] + '</b> from the source: odd → <span class="c-r">rejected</span>. filter immediately pulls the next one (transform is never called for ' + nums[i] + ').', parts: parts(i, { 2: 'bad' }) });
      } else {
        transformCalls++;
        var sq = nums[i] * nums[i];
        out.push(sq); status[i] = 'ok';
        frames.push({ narr: 'filter pulls <b>' + nums[i] + '</b>: even → passes. transform turns it into <b>' + sq + '</b>. take counts it (' + out.length + ' of ' + k + ') and hands it to the loop body. <b>One element travelled the whole pipeline before the next one is even looked at.</b>', parts: parts(i, { 2: 'ok', 3: 'ok', 4: 'ok', 5: 'cur' }) });
      }
    }
    if (out.length >= k && i < nums.length) {
      // The range-for still executes ++it after the k-th body: counted_iterator increments the
      // underlying filter iterator, and filter_view::operator++ searches for the NEXT match.
      var startOver = i, found = -1;
      for (; i < nums.length; i++) {
        touched++; filterCalls++;
        status[i] = 'win';
        if (nums[i] % 2 === 0) { found = i; i++; break; }
      }
      frames.push({ narr: '<b>Subtle overshoot:</b> after value #' + k + ' the loop still runs <code>++it</code>. take\'s counted iterator first increments the filter iterator, and <code>filter_view::operator++</code> keeps <b>calling the predicate</b> until it finds the next even number' + (found >= 0 ? ' (' + nums[found] + ')' : ' (none left)') + '. Only then does take\'s count reach 0 and the loop stop. transform is <b>not</b> called (nothing is dereferenced). Known quirk of C++20 views; it matters when the predicate is expensive or the source is an input stream.', parts: parts(found >= 0 ? found : null, { 2: 'win', 5: 'cur' }) });
    }
    var untouched = nums.length - touched;
    nums.forEach(function (_, j) { if (!status[j]) status[j] = 'done'; });
    frames.push({ narr: out.length >= k ? '<b>take(' + k + ') is satisfied → iteration stops.</b> ' + (untouched ? untouched + ' element(s) at the end were <b>never read</b> (faded) — not even passed to the predicate. An eager version (copy-filter into a vector, then transform into another vector, then truncate) would have processed all ' + nums.length + ' and allocated two temporary vectors.' : 'It happened to need every element this time.') : 'Source exhausted before take(' + k + ') was satisfied: we got only ' + out.length + ' value(s). Views simply end when their source ends — no error.', parts: parts(null, { 5: 'ok' }, { 'never touched': untouched }) });
    frames.push({ narr: 'Eager vs lazy side by side. Laziness wins when you stop early (take, find, any_of) or chain many steps; eager containers win when you iterate the result many times (a view re-runs filter/transform on every pass).', parts: [
      { type: 'table', label: 'Work comparison for this input', columns: ['approach', 'elements examined', 'temporary vectors', 'transform calls'], rows: [['eager (3 loops)', String(nums.length), '2', String(nums.filter(function (x) { return x % 2 === 0; }).length)], ['lazy views', String(touched), '0', String(transformCalls)]], hl: { 1: 'ok' } },
      { type: 'array', label: 'result', values: out.slice(), hl: {} }
    ] });
    return frames;
  }

  topics.push({
    title: 'Ranges & Views (C++20)',
    analogy: `<p>Think of an <b>assembly line that only runs when a customer orders</b>. The old STL style is a batch factory: wash <i>all</i> apples into crate 2, peel <i>all</i> of crate 2 into crate 3, then take the first three. The ranges style hangs stations on a conveyor: <b>wash → peel → pack 3</b>. When the customer asks for an apple, one apple rides the whole line; when 3 are packed the line stops. No extra crates, no wasted peeling. And the stations (views) do not own any apples — they just watch the conveyor.</p>`,
    explain: `<p>C++20 <b>ranges</b> upgrade the STL in two ways:</p>
      <ol>
        <li><b>Range algorithms</b> take the whole container: <code>std::ranges::sort(v)</code> instead of <code>std::sort(v.begin(), v.end())</code>. They are constrained with concepts (clearer errors) and support <b>projections</b>: <code>std::ranges::sort(people, {}, &amp;Person::age)</code> sorts by age without writing a comparator.</li>
        <li><b>Views</b> are lazy, non-owning, cheap-to-copy adaptors composed with <code>|</code>: <code>v | std::views::filter(pred) | std::views::transform(f) | std::views::take(n)</code>. Nothing is computed until you iterate, and then elements flow through one at a time.</li>
      </ol>
      ${H.table(['view', 'what it does', 'example'], [['<code>views::filter(p)</code>', 'keep elements where p is true', 'evens'], ['<code>views::transform(f)</code>', 'apply f to each', 'squares'], ['<code>views::take(n)</code> / <code>drop(n)</code>', 'first n / skip n', 'top 3'], ['<code>views::take_while(p)</code>', 'stop at first failure', 'until a sentinel'], ['<code>views::iota(a, b)</code>', 'numbers a..b-1 (or infinite)', 'loop indices'], ['<code>views::reverse</code>', 'iterate backwards', ''], ['<code>views::keys</code> / <code>values</code>', 'first / second of pairs', 'map keys'], ['<code>views::split</code>, <code>join</code>', 'split by delimiter, flatten', 'CSV parsing']])}
      <p><b>Copy or move?</b> A view <b>never copies</b> the underlying elements — it refers to them. That is why it is cheap, and also why it can dangle: a view over a temporary vector is a bug (the library blocks the obvious cases by returning <code>std::ranges::dangling</code> from algorithms called on temporaries). To get a real container from a view in C++20, loop and push_back (or construct a vector from <code>common_view</code> iterators); C++23 adds <code>std::ranges::to&lt;std::vector&gt;()</code>.</p>
      <p><b>Key concepts:</b> <code>std::ranges::range</code> (has begin/end), <code>input_range</code>, <code>forward_range</code>, <code>random_access_range</code>, <code>sized_range</code>, <code>view</code>. You can constrain your own functions with them: <code>void print(std::ranges::input_range auto&amp;&amp; r)</code>.</p>`,
    clues: ['"Chain filter/map/limit" / "process a stream lazily" → views pipeline', '"Sort by a member" → <code>ranges::sort</code> with a projection', '"First N matching items from a huge or infinite sequence" → <code>views::iota</code> + <code>filter</code> + <code>take</code>', '"Avoid intermediate containers" → views', '"Iterate map keys only" → <code>views::keys</code>', '"Why does my view print stale/garbage data?" → view outlived its source (dangling)'],
    code: [R`#include <algorithm>
#include <iostream>
#include <map>
#include <ranges>
#include <string>
#include <vector>

struct Person { std::string name; int age; };

int main() {
    std::vector<int> nums{1, 2, 3, 4, 5, 6, 7, 8, 9, 10};

    // Lazy pipeline: nothing runs until the loop pulls values.
    auto evenSquares = nums
        | std::views::filter([](int x) { return x % 2 == 0; })
        | std::views::transform([](int x) { return x * x; })
        | std::views::take(3);
    for (int v : evenSquares) std::cout << v << ' ';          // 4 16 36
    std::cout << '\n';

    // Infinite range + early stop.
    for (int p : std::views::iota(1) | std::views::filter([](int n) { return n % 7 == 0; }) | std::views::take(4))
        std::cout << p << ' ';                                 // 7 14 21 28
    std::cout << '\n';

    // Range algorithms with projections: no hand-written comparator.
    std::vector<Person> people{{"cy", 41}, {"ann", 30}, {"bob", 25}};
    std::ranges::sort(people, {}, &Person::age);               // sort by age
    auto it = std::ranges::find(people, "ann", &Person::name); // find by name
    std::cout << people.front().name << ' ' << it->age << '\n'; // bob 30

    // keys/values views over a map.
    std::map<std::string, int> stock{{"apple", 3}, {"pear", 0}, {"plum", 7}};
    for (const auto& fruit : stock | std::views::filter([](const auto& kv) { return kv.second > 0; }) | std::views::keys)
        std::cout << fruit << ' ';                              // apple plum
    std::cout << '\n';

    // Materialise a view into a vector (C++20 way; C++23: | std::ranges::to<std::vector>()).
    std::vector<int> firstThree;
    std::ranges::copy(evenSquares, std::back_inserter(firstThree));
    std::cout << firstThree.size() << '\n';                    // 3
}`, R`#include <ranges>
#include <string>
#include <vector>
#include <type_traits>

std::vector<int> makeData() { return {3, 1, 2}; }

// Constrain a generic function with range concepts.
template <std::ranges::input_range R>
    requires std::is_arithmetic_v<std::ranges::range_value_t<R>>
auto total(R&& r) {
    std::ranges::range_value_t<R> s{};
    for (auto&& x : r) s += x;
    return s;
}

int main() {
    // Algorithms on a temporary return std::ranges::dangling instead of a dangling iterator:
    auto res = std::ranges::max_element(makeData());
    static_assert(std::is_same_v<decltype(res), std::ranges::dangling>);   // *res would not compile

    std::vector<int> v{1, 2, 3};
    auto doubled = v | std::views::transform([](int x) { return 2 * x; });
    return total(doubled) == 12 ? 0 : 1;      // views are ranges too
}`],
    codeTitle: ['Views, infinite ranges, projections and keys', 'Dangling protection and range concepts'],
    viz: { title: 'Lazy pipeline: filter → transform → take, one element at a time', input: '1 2 3 4 5 6 7 8 9 10 | take 3', inputLabel: 'Numbers, then "| take K"', gen: rangesViz },
    examples: [
      { title: 'Bug: a view that outlives its data', html: `<p><code>auto v = makeData() | std::views::filter(pred);</code> — since C++20's rules, piping an <b>rvalue</b> vector into a view adaptor creates an <code>owning_view</code> that keeps the vector alive, so this one is actually fine. The real trap is a view over a <b>named</b> container that dies: returning <code>localVec | views::filter(...)</code> from a function makes a view referring to a destroyed local. Rule: views must not outlive what they look at; return containers, not views of locals.</p>`, code: R`#include <ranges>
#include <vector>
std::vector<int> evensCopy(const std::vector<int>& src) {   // safe: returns an owning container
    std::vector<int> out;
    for (int x : src | std::views::filter([](int x) { return x % 2 == 0; })) out.push_back(x);
    return out;
}
int main() { return evensCopy({1, 2, 3, 4}).size() == 2 ? 0 : 1; }` },
      { title: 'Views re-run work on every iteration', html: `<p>A view stores the <i>recipe</i>, not the results. Iterating <code>expensive | views::transform(slowFn)</code> twice calls <code>slowFn</code> twice per element. Also, <code>filter_view</code> caches its <code>begin()</code> on first call, so it is not usable through a <code>const&amp;</code> and you should not modify the underlying elements in ways that change the predicate's answer while iterating. If you need the results more than once, materialise them into a vector.</p>` },
      { title: 'Index loops without off-by-one bugs', html: `<p><code>for (int i : std::views::iota(0, n))</code> replaces <code>for (int i = 0; i &lt; n; ++i)</code>. <code>std::views::reverse</code> walks backwards without the unsigned <code>i &gt;= 0</code> infinite-loop bug. C++23 adds <code>views::enumerate</code> and <code>views::zip</code> for index+value and parallel iteration.</p>`, code: R`#include <ranges>
#include <vector>
int main() {
    std::vector<int> v{5, 6, 7};
    int sum = 0;
    for (int i : std::views::iota(0, static_cast<int>(v.size()))) sum += i * v[i]; // 0*5 + 1*6 + 2*7
    for (int x : v | std::views::reverse) sum += x;                              // 7 + 6 + 5
    return sum == 38 ? 0 : 1;
}` },
      { title: 'Splitting a string with views', html: `<p><code>std::views::split(line, ',')</code> yields subranges between commas lazily. In C++20 (after P2210) each piece is a contiguous subrange, so you can build a <code>std::string_view</code> from it with <code>std::string_view(piece.begin(), piece.end())</code>.</p>`, code: R`#include <ranges>
#include <string>
#include <string_view>
#include <vector>
int main() {
    std::string line = "ann,30,paris";
    std::vector<std::string> fields;
    for (auto piece : line | std::views::split(','))
        fields.emplace_back(std::string_view(piece.begin(), piece.end()));
    return fields.size() == 3 && fields[2] == "paris" ? 0 : 1;
}` }
    ],
    deepDive: `<p><b>How a view works.</b> <code>filter_view</code> stores the underlying view + the predicate. Its iterator wraps the underlying iterator; <code>operator++</code> advances until the predicate passes. <code>transform_view</code>'s <code>operator*</code> calls the function on dereference. The pipe syntax <code>r | views::filter(p)</code> is just <code>views::filter(r, p)</code> via "range adaptor closure objects". Since everything is templates, the optimiser usually flattens a pipeline into the same loop you would write by hand.</p>
      <p><b>Sentinels.</b> Ranges allow <code>end()</code> to return a different type than <code>begin()</code> (a <i>sentinel</i>), e.g. <code>std::unreachable_sentinel</code> for infinite <code>iota</code>, or a "stop at null terminator" sentinel — no need to compute the end position in advance. That is why some views are not <code>common_range</code> and cannot be passed to old iterator-pair algorithms directly (use <code>views::common</code>).</p>
      <p><b>Borrowed ranges and dangling.</b> A range is "borrowed" if its iterators stay valid after the range object dies (<code>std::string_view</code>, <code>std::span</code>, <code>views::iota</code>). Range algorithms called with a non-borrowed <b>rvalue</b> return <code>std::ranges::dangling</code> instead of an iterator — a compile-time guard.</p>
      <p><b>Performance notes.</b> filter + reverse or filter + take_while can make iterators heavier; <code>filter_view::begin()</code> is amortised O(1) via caching. Views are cheap to copy (O(1)) — pass them by value. Some compilers still generate slightly worse code for deep pipelines; for the hottest loops, measure against a hand-written loop.</p>
      <p><b>C++23 additions:</b> <code>ranges::to</code>, <code>views::zip</code>, <code>enumerate</code>, <code>chunk</code>, <code>slide</code>, <code>adjacent</code>, <code>join_with</code>, <code>cartesian_product</code>, <code>ranges::fold_left</code>. Knowing that these exist (and which standard you are on) is a common senior interview check.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants translate Python/JS-style chains into ranges pipelines very well, and convert old iterator-pair code to <code>std::ranges</code> calls. They also tend to reach for C++23 features (<code>ranges::to</code>, <code>zip</code>, <code>enumerate</code>) even when your toolchain is C++20 — specify the standard in the prompt.</p>
      <p><b>Use AI as a partner:</b> <code>Rewrite this loop as a ranges pipeline targeting C++20 only, then tell me if the pipeline iterates the source more than once</code>. Then check Compiler Explorer output if it is a hot path.</p>
      <p><b>Where AI goes wrong:</b> returning views of local containers, iterating a filter view through a <code>const&amp;</code> parameter (does not compile), assuming views cache results, and using stateful lambdas inside <code>filter</code>/<code>transform</code> (the standard requires predicates to be regular — same input, same answer).</p>
      <p><b>What you must still own:</b> the lifetime model (views borrow, containers own) and the cost model (lazy = recomputed). With those two ideas you can review any generated pipeline in seconds.</p>`,
    problems: [{
      title: 'Top-K Passing Students with a Ranges Pipeline', level: 'Medium', tags: ['ranges', 'views', 'projections'], companies: ['Google', 'Bloomberg', 'Meta'],
      statement: `<p>Given <code>std::vector&lt;Student&gt;</code> with <code>name</code> and <code>score</code>, return the names of the <b>top k</b> students whose score is at least <code>pass</code>, highest score first (ties: alphabetical by name). Use <code>std::ranges::sort</code> with a projection/comparator and a views pipeline; do not create intermediate filtered copies.</p>`,
      constraints: `1 ≤ n ≤ 10<sup>5</sup>, 0 ≤ score ≤ 100, 1 ≤ k ≤ n. C++20 only (no ranges::to).`,
      example: `<p>students = {ann 91, bob 45, cy 78, dee 91, eve 60}, pass = 50, k = 3<br>Sorted order: ${H.c('b', 'ann 91, dee 91')} (tie → alphabetical), cy 78, eve 60, bob 45<br>Output: ${H.c('g', '["ann", "dee", "cy"]')}</p>`,
      brute: { why: `<p>The beginner version copies passing students into a new vector, sorts the copy, copies the names into a third vector, then truncates to k — three passes and two extra allocations of size n. It works, but the extra copies of strings dominate for large n.</p>`, code: R`#include <algorithm>
#include <string>
#include <vector>
struct Student { std::string name; int score; };
std::vector<std::string> topKBrute(std::vector<Student> s, int pass, int k) {
    std::vector<Student> passed;
    for (const auto& st : s) if (st.score >= pass) passed.push_back(st);      // copy 1
    std::sort(passed.begin(), passed.end(), [](const Student& a, const Student& b) {
        return a.score != b.score ? a.score > b.score : a.name < b.name; });
    std::vector<std::string> names;
    for (const auto& st : passed) names.push_back(st.name);                    // copy 2
    if ((int)names.size() > k) names.resize(k);
    return names;
}
int main() { return topKBrute({{"a", 90}, {"b", 10}}, 50, 1).size() == 1 ? 0 : 1; }` },
      mcq: { q: 'Which order of steps lets the pipeline stop as early as possible?', options: ['take → filter → sort', 'sort the vector, then view: filter → transform(name) → take(k)', 'transform → sort → filter', 'filter into a vector, sort, then take'], answer: 1, explain: 'Sorting must happen on real data (views cannot sort). After sorting, the lazy filter + transform + take pipeline stops as soon as k names are produced.' },
      hints: [`<p>Hint 1: Views cannot reorder elements — sorting needs a real container. Sort the (by-value) input first with <code>std::ranges::sort</code>.</p>`, `<p>Hint 2: Comparator: higher score first, then name ascending. Then pipe: <code>views::filter(score &gt;= pass)</code> → <code>views::transform(&amp;Student::name)</code> → <code>views::take(k)</code>.</p>`, `<p>Hint 3: Since the list is sorted descending, every passing student comes before every failing one — so <code>take_while</code> works too. Materialise by looping and <code>push_back</code> (C++20). Take the parameter by value and sort it in place to avoid touching the caller's data.</p>`],
      tests: {"io":true,"cases":[{"stdin":"","stdout":"ann dee cy\n[ann, dee, cy, eve]\n[ann, dee, cy, eve, bob]\n[]\n[ann]\n[zed]\n[a, b]\n[x, x]"}]},
      solution: {
        approach: `<p>Take the vector by value (caller can <code>std::move</code> it in → no copy), sort once with a ranges comparator, then a lazy pipeline yields at most k names. <code>views::transform(&amp;Student::name)</code> uses a member pointer as the function — projections everywhere.</p>`,
        code: R`#include <algorithm>
#include <iostream>
#include <ranges>
#include <string>
#include <vector>

struct Student { std::string name; int score; };

std::vector<std::string> topK(std::vector<Student> s, int pass, int k) {
    std::ranges::sort(s, [](const Student& a, const Student& b) {
        return a.score != b.score ? a.score > b.score : a.name < b.name;
    });
    auto names = s
        | std::views::take_while([pass](const Student& st) { return st.score >= pass; })
        | std::views::transform(&Student::name)
        | std::views::take(k);
    std::vector<std::string> out;
    for (const std::string& n : names) out.push_back(n);
    return out;
}

void show(const std::vector<std::string>& v) {
    std::cout << '[';
    for (std::size_t i = 0; i < v.size(); ++i) std::cout << (i ? ", " : "") << v[i];
    std::cout << "]\n";
}

int main() {
    auto mk = [] { return std::vector<Student>{{"ann", 91}, {"bob", 45}, {"cy", 78}, {"dee", 91}, {"eve", 60}}; };
    for (const auto& n : topK(mk(), 50, 3)) std::cout << n << ' ';   // ann dee cy
    std::cout << '\n';
    show(topK(mk(), 60, 5));                                  // [ann, dee, cy, eve]   (score == pass is allowed)
    show(topK(mk(), 0, 5));                                   // [ann, dee, cy, eve, bob]
    show(topK(mk(), 95, 3));                                  // []
    show(topK(mk(), 0, 1));                                   // [ann]
    show(topK({{"zed", 0}}, 0, 1));                           // [zed]
    show(topK({{"b", 50}, {"a", 50}, {"c", 50}}, 50, 2));     // [a, b]
    show(topK(std::vector<Student>(100000, Student{"x", 7}), 7, 2));   // [x, x]
}`,
        dry: { head: ['step', 'data', 'pipeline action', 'out'], rows: [['sort', 'ann91 dee91 cy78 eve60 bob45', '—', '[]'], ['pull 1', 'ann 91', '91 ≥ 50 ✔ → "ann"', '[ann]'], ['pull 2', 'dee 91', '✔ → "dee"', '[ann, dee]'], ['pull 3', 'cy 78', '✔ → "cy"; take(3) full → stop', '[ann, dee, cy]'], ['never pulled', 'eve, bob', 'untouched (lazy)', '[ann, dee, cy]']] },
        complexity: `<p>O(n log n) for the sort, then O(k) for the pipeline (it stops after k names). Extra memory: O(k) for the output — no filtered copy of the input.</p>`,
        followUps: ['Use <code>std::ranges::partial_sort</code> or <code>nth_element</code> to make it O(n log k).', 'Return the view instead of a vector — what lifetime problem appears?', 'Rewrite with C++23 <code>std::ranges::to&lt;std::vector&gt;()</code>.']
      }
    }]
  });
  /* ======================================================================
     PRACTICE — Easy
     ====================================================================== */
  practice.push({
    title: 'Copy or Move? Count Them with a Tracer', level: 'Easy', tags: ['move semantics', 'copy elision', 'puzzle'], companies: ['Bloomberg', 'Microsoft'],
    statement: `<p>Write a <code>Tracer</code> class that counts how many times it is <b>copied</b> and <b>moved</b> (constructors and assignments). Then predict, and verify, the counts after this sequence:</p>
      <pre>Tracer a;
Tracer b = a;
Tracer c = std::move(a);
Tracer d = Tracer();
std::vector&lt;Tracer&gt; v; v.reserve(4);
v.push_back(b);
v.push_back(Tracer());
v.emplace_back();
const Tracer e;
Tracer f = std::move(e);</pre>`,
    constraints: `C++17 or later (guaranteed copy elision applies). <code>reserve(4)</code> prevents reallocation moves.`,
    example: `<p>Answer: ${H.c('y', 'copies = 3')} (b = a, push_back(b), f = std::move(e) — moving from <b>const</b> falls back to copy), ${H.c('g', 'moves = 2')} (c = std::move(a), push_back(Tracer())). <code>Tracer d = Tracer();</code> and <code>emplace_back()</code> cost <b>nothing</b>.</p>`,
    brute: { why: `<p>A class with only a copy constructor cannot tell you anything: every "move" silently becomes a copy, so you would count 5 copies and conclude moves do not exist. You need a separate move constructor to observe the difference.</p>`, code: R`#include <iostream>
struct Tracer {
    static inline int copies = 0;
    Tracer() = default;
    Tracer(const Tracer&) { ++copies; }      // no move ctor: rvalues bind here too
};
int main() { Tracer a; Tracer b = static_cast<Tracer&&>(a); std::cout << Tracer::copies << '\n'; } // 1` },
    mcq: { q: 'What does <code>Tracer f = std::move(e);</code> do when <code>e</code> is <code>const Tracer</code>?', options: ['Moves', 'Copies', 'Compile error', 'Nothing (elided)'], answer: 1, explain: 'std::move(e) has type const Tracer&amp;&amp;. The move constructor needs a non-const Tracer&amp;&amp;, so overload resolution picks the copy constructor (const Tracer&amp;).' },
    hints: [`<p>Hint 1: Use <code>static inline int</code> counters (C++17) and increment them in the copy ctor, copy assignment, move ctor and move assignment.</p>`, `<p>Hint 2: <code>Tracer d = Tracer();</code> is a prvalue initialising an object of the same type — C++17 guarantees elision, so no constructor besides the default one runs.</p>`, `<p>Hint 3: <code>emplace_back()</code> with no arguments default-constructs directly inside the vector. <code>push_back(Tracer())</code> must first create a temporary, then move it in.</p>`],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"copies=3 moves=2\ncopies=2 moves=6\ncopies=4 moves=6"}]},
    solution: {
      approach: `<p>Instrument all four copy/move members. Walk the statements: lvalue source → copy; xvalue/prvalue source with a non-const move ctor → move; prvalue initialising the same type → elided; emplace → constructed in place.</p>`,
      code: R`#include <iostream>
#include <utility>
#include <vector>

struct Tracer {
    static inline int copies = 0, moves = 0;
    Tracer() = default;
    Tracer(const Tracer&)            { ++copies; }
    Tracer(Tracer&&) noexcept        { ++moves; }
    Tracer& operator=(const Tracer&) { ++copies; return *this; }
    Tracer& operator=(Tracer&&) noexcept { ++moves; return *this; }
};

void byValue(Tracer) {}

int main() {
    Tracer a;
    Tracer b = a;              // copy  (lvalue)
    Tracer c = std::move(a);   // move  (xvalue)
    Tracer d = Tracer();       // nothing: guaranteed elision
    std::vector<Tracer> v;
    v.reserve(4);
    v.push_back(b);            // copy
    v.push_back(Tracer());     // move  (temporary then move into storage)
    v.emplace_back();          // nothing: built in place
    const Tracer e;
    Tracer f = std::move(e);   // copy! const rvalue cannot bind to Tracer&&
    std::cout << "copies=" << Tracer::copies << " moves=" << Tracer::moves << '\n'; // copies=3 moves=2
    (void)c; (void)d; (void)f;

    Tracer::copies = Tracer::moves = 0;
    Tracer g;
    g = b;                     // copy assignment            copies 1
    g = std::move(c);          // move assignment            moves 1
    Tracer h = std::move(g);   // move construction          moves 2
    byValue(h);                // copy into the parameter    copies 2
    byValue(std::move(h));     // move into the parameter    moves 3
    byValue(Tracer());         // elided                     no change
    std::vector<Tracer> w;     // no reserve: growth relocates with the noexcept move
    w.push_back(Tracer());     // 1 move
    w.push_back(Tracer());     // 1 move + 1 relocation
    std::cout << "copies=" << Tracer::copies << " moves=" << Tracer::moves << '\n';   // copies=2 moves=6
    std::vector<Tracer> w2 = w;                                                         // 2 element copies
    std::cout << "copies=" << Tracer::copies << " moves=" << Tracer::moves << '\n';   // copies=4 moves=6
}`,
      dry: { head: ['statement', 'argument category', 'member chosen', 'copies', 'moves'], rows: [['b = a', 'lvalue', 'copy ctor', '1', '0'], ['c = std::move(a)', 'xvalue', 'move ctor', '1', '1'], ['d = Tracer()', 'prvalue, same type', 'elided', '1', '1'], ['push_back(b)', 'lvalue', 'copy ctor', '2', '1'], ['push_back(Tracer())', 'prvalue → materialised', 'move ctor', '2', '2'], ['emplace_back()', '—', 'default ctor in place', '2', '2'], ['f = std::move(e)', 'const xvalue', 'copy ctor', '3', '2']] },
      complexity: `<p>O(1) per statement; the point is the count, not the speed. In a real class each copy would be O(n) and each move O(1).</p>`,
      followUps: ['Remove <code>noexcept</code> and drop the <code>reserve</code> — what changes during growth?', 'Add <code>Tracer g = c; g = std::move(b);</code> — new counts?']
    }
  });

  practice.push({
    title: 'Remove the Silent Copies in Hot Loops', level: 'Easy', tags: ['auto', 'references', 'structured bindings'], companies: ['Amazon', 'Adobe'],
    statement: `<p>The function below computes the total length of all strings in a vector and the sum of all values in a <code>std::map&lt;std::string, int&gt;</code>. It is correct but slow: profiling shows millions of string allocations. Find the hidden copies and fix them without changing the results.</p>`,
    constraints: `Up to 10<sup>6</sup> strings of length up to 100. Do not change function signatures.`,
    example: `<p>names = {"alpha", "beta"}, scores = {{"a", 1}, {"b", 2}} → ${H.c('g', 'totalLen = 9, totalScore = 3')}. Copies before: ${H.c('r', '2 string copies + 2 pair copies')} per call. After: ${H.c('g', '0')}.</p>`,
    brute: { why: `<p><code>for (auto s : names)</code> copies every string. <code>for (const std::pair&lt;std::string, int&gt;&amp; p : scores)</code> looks like a reference but the map's element type is <code>std::pair&lt;const std::string, int&gt;</code>; the mismatch forces a <b>temporary converted copy</b> for every element.</p>`, code: R`#include <map>
#include <string>
#include <vector>
long long slowTotals(const std::vector<std::string>& names, const std::map<std::string, int>& scores) {
    long long total = 0;
    for (auto s : names) total += s.size();                               // copy per element
    for (const std::pair<std::string, int>& p : scores) total += p.second; // hidden temporary copy
    return total;
}
int main() { return slowTotals({"alpha", "beta"}, {{"a", 1}, {"b", 2}}) == 12 ? 0 : 1; }` },
    mcq: { q: 'What is the element type when iterating <code>std::map&lt;std::string, int&gt;</code>?', options: ['<code>std::pair&lt;std::string, int&gt;</code>', '<code>std::pair&lt;const std::string, int&gt;</code>', '<code>std::tuple&lt;std::string, int&gt;</code>', '<code>std::string</code>'], answer: 1, explain: 'Map keys are immutable, so value_type is pair&lt;const Key, T&gt;. Binding a const pair&lt;Key, T&gt;&amp; requires a conversion that creates a temporary copy.' },
    hints: [`<p>Hint 1: Any range-for written as <code>for (auto x : c)</code> copies each element. For read-only access use <code>const auto&amp;</code>.</p>`, `<p>Hint 2: Never spell out a map's pair type by hand — use <code>const auto&amp;</code> or a structured binding <code>const auto&amp; [key, value]</code>.</p>`, `<p>Hint 3: Verify with a counting allocator or by checking that addresses match: <code>&amp;p.first == &amp;scores.begin()-&gt;first</code> must be true for a real reference.</p>`],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"same object\n12\n0\n-3\n10000003"}]},
    solution: {
      approach: `<p>Use <code>const auto&amp;</code> everywhere you only read, and structured bindings for maps. Both loops now touch the original elements directly: zero allocations.</p>`,
      code: R`#include <iostream>
#include <map>
#include <string>
#include <vector>

long long fastTotals(const std::vector<std::string>& names, const std::map<std::string, int>& scores) {
    long long total = 0;
    for (const auto& s : names) total += s.size();               // reference: no copy
    for (const auto& [name, score] : scores) total += score;     // binds to pair<const string,int>
    return total;
}

int main() {
    std::map<std::string, int> m{{"a", 1}, {"b", 2}};
    for (const auto& [k, v] : m) {
        std::cout << (&k == &m.begin()->first ? "same object" : "copy") << '\n';   // same object
        break;
    }
    std::cout << fastTotals({"alpha", "beta"}, m) << '\n';                         // 12
    std::cout << fastTotals({}, {}) << '\n';                                       // 0
    std::map<std::string, int> neg{{"a", -5}, {"b", 2}};
    std::cout << fastTotals({""}, neg) << '\n';                                    // -3
    std::vector<std::string> many(100000, std::string(100, 'x'));
    std::cout << fastTotals(many, m) << '\n';                                      // 10000003
}`,
      complexity: `<p>O(total elements) time, O(1) extra memory (was O(1) but with one heap allocation per long string / per map entry).</p>`,
      followUps: ['When is <code>for (auto x : v)</code> actually the right choice? (small trivially-copyable types like int)', 'What does clang-tidy check <code>performance-for-range-copy</code> do?']
    }
  });

  practice.push({
    title: 'Parse an Integer Safely with std::optional', level: 'Easy', tags: ['std::optional', 'string_view', 'error handling'], companies: ['Google', 'Uber'],
    statement: `<p>Implement <code>std::optional&lt;int&gt; parseInt(std::string_view s)</code> that returns the integer if the <b>whole</b> string is a valid base-10 int (optional leading '-'), and <code>std::nullopt</code> otherwise (empty, junk characters, overflow). Then sum all valid numbers in a list, skipping invalid ones.</p>`,
    constraints: `No exceptions. Strings up to 20 chars. Must reject "12abc", "", "99999999999".`,
    example: `<p>["42", "-7", "abc", "12x", "2147483648"] → ${H.c('g', '42, -7')} valid, ${H.c('r', 'abc, 12x, 2147483648')} rejected → sum = ${H.c('g', '35')}.</p>`,
    brute: { why: `<p><code>std::stoi</code> throws on junk, accepts trailing garbage (<code>"12x"</code> → 12), and needs try/catch. Returning -1 for "invalid" is ambiguous because -1 is a valid number.</p>`, code: R`#include <string>
int parseOrMinusOne(const std::string& s) {
    try { return std::stoi(s); }          // "12x" -> 12 (wrong), "-1" indistinguishable from error
    catch (...) { return -1; }
}
int main() { return parseOrMinusOne("12x") == 12 ? 0 : 1; }` },
    mcq: { q: 'Why is <code>std::optional&lt;int&gt;</code> a better return type than <code>int</code> with -1 for errors?', options: ['It is faster', 'The type itself says "might be missing" and every int value stays usable', 'It throws automatically', 'It uses the heap'], answer: 1, explain: 'optional separates "no value" from the value space, so -1 can be a real result, and callers are nudged to check has_value().' },
    hints: [`<p>Hint 1: <code>std::from_chars(first, last, value)</code> (header &lt;charconv&gt;) parses without exceptions or locale and reports where it stopped and whether it overflowed.</p>`, `<p>Hint 2: Success means <code>ec == std::errc{}</code> AND <code>ptr == s.data() + s.size()</code> (the whole string was consumed).</p>`, `<p>Hint 3: Recipe: if empty → nullopt; call from_chars; if error or leftover chars → nullopt; else return value. Summing: <code>if (auto v = parseInt(t)) sum += *v;</code></p>`],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"35 0\n0 0 none none 2147483647 -2147483648 none none none 7 none none none none"}]},
    solution: {
      approach: `<p>Use <code>std::from_chars</code>, check both the error code and that the parse consumed every character. Return the value wrapped in optional, or <code>std::nullopt</code>.</p>`,
      code: R`#include <charconv>
#include <iostream>
#include <optional>
#include <string_view>
#include <vector>

std::optional<int> parseInt(std::string_view s) {
    if (s.empty()) return std::nullopt;
    int value = 0;
    auto [ptr, ec] = std::from_chars(s.data(), s.data() + s.size(), value);
    if (ec != std::errc{} || ptr != s.data() + s.size()) return std::nullopt;   // junk or overflow
    return value;
}

int main() {
    std::vector<std::string_view> in{"42", "-7", "abc", "12x", "2147483648", ""};
    long long sum = 0;
    for (auto t : in)
        if (auto v = parseInt(t)) sum += *v;          // only engaged optionals are added
    std::cout << sum << ' ' << parseInt("12x").value_or(0) << '\n';   // 35 0
    for (std::string_view t : {"0", "-0", "+5", "-", "2147483647", "-2147483648", "-2147483649", " 5", "5 ", "007", "99999999999", "12abc", "--5", "1e3"}) {
        if (auto v = parseInt(t)) std::cout << *v << ' ';
        else std::cout << "none ";
    }
    std::cout << '\n';   // 0 0 none none 2147483647 -2147483648 none none none 7 none none none none
}`,
      complexity: `<p>O(length) per string, no allocation, no exceptions.</p>`,
      followUps: ['Return <code>std::expected&lt;int, std::errc&gt;</code> (C++23) so callers know <i>why</i> it failed.', 'Support a leading "+" sign — from_chars rejects it.']
    }
  });

  practice.push({
    title: 'constexpr Integer Power with Compile-Time Tests', level: 'Easy', tags: ['constexpr', 'static_assert'], companies: ['Qualcomm', 'NVIDIA'],
    statement: `<p>Write <code>constexpr long long ipow(long long base, unsigned exp)</code> using fast exponentiation, prove it with <code>static_assert</code>s, and use it to size a <code>std::array</code> (e.g. 2<sup>4</sup> = 16 buckets) at compile time.</p>`,
    constraints: `0 ≤ exp ≤ 62, results fit in long long. Must be usable in constant expressions.`,
    example: `<p><code>ipow(2, 10)</code> → ${H.c('g', '1024')}; <code>ipow(3, 0)</code> → ${H.c('g', '1')}; <code>std::array&lt;int, ipow(2, 4)&gt;</code> has ${H.c('g', '16')} elements.</p>`,
    brute: { why: `<p><code>std::pow</code> works on doubles, is not constexpr in C++20, cannot size an array, and loses precision above 2<sup>53</sup> (<code>(long long)std::pow(3, 39)</code> may be off by one). A naive loop is O(exp) instead of O(log exp).</p>`, code: R`#include <cmath>
long long slowPow(long long b, unsigned e) { return static_cast<long long>(std::pow(b, e)); }  // double, runtime only
int main() { return slowPow(2, 10) == 1024 ? 0 : 1; }` },
    mcq: { q: 'Which line forces <code>ipow</code> to run at compile time?', options: ['<code>long long x = ipow(2, 5);</code>', '<code>static_assert(ipow(2, 5) == 32);</code>', '<code>auto y = ipow(n, 2);</code>', '<code>std::cout &lt;&lt; ipow(2, 5);</code>'], answer: 1, explain: 'static_assert requires a constant expression, so the compiler must evaluate ipow. The others may be folded by the optimiser but are not required to be.' },
    hints: [`<p>Hint 1: Square-and-multiply: while exp &gt; 0, if exp is odd multiply result by base; square base; halve exp.</p>`, `<p>Hint 2: A constexpr function may use loops and local variables (C++14+). Mark it <code>constexpr</code> and it works at both compile time and runtime.</p>`, `<p>Hint 3: Tests: <code>static_assert(ipow(2,10) == 1024); static_assert(ipow(3,0) == 1); static_assert(ipow(-2,3) == -8);</code>. Use the result as a template argument to prove it is a constant.</p>`],
    tests: {"io":true,"cases":[{"stdin":"0\n","stdout":"16 1"},{"stdin":"1\n","stdout":"16 3"},{"stdin":"2\n","stdout":"16 9"},{"stdin":"5\n","stdout":"16 243"},{"stdin":"10\n","stdout":"16 59049"},{"stdin":"20\n","stdout":"16 3486784401"},{"stdin":"39\n","stdout":"16 4052555153018976267"}]},
    solution: {
      approach: `<p>Binary exponentiation in a constexpr function: O(log exp) multiplications. Compile-time tests via static_assert; a template argument use proves constant-ness.</p>`,
      code: R`#include <array>
#include <iostream>

constexpr long long ipow(long long base, unsigned exp) {
    long long result = 1;
    while (exp > 0) {
        if (exp & 1u) result *= base;   // odd bit: include this power
        exp >>= 1u;
        if (exp) base *= base;          // square only if needed (avoids overflow on the last step)
    }
    return result;
}

static_assert(ipow(2, 10) == 1024);
static_assert(ipow(3, 0) == 1);
static_assert(ipow(-2, 3) == -8);
static_assert(ipow(10, 18) == 1000000000000000000LL);
static_assert(ipow(2, 62) == 4611686018427387904LL);
static_assert(ipow(0, 0) == 1 && ipow(0, 5) == 0 && ipow(1, 62) == 1 && ipow(-1, 61) == -1);
static_assert(ipow(7, 1) == 7 && ipow(2, 0) == 1 && ipow(-3, 3) == -27);

int main() {
    std::array<int, ipow(2, 4)> buckets{};          // 16 buckets, size known at compile time
    unsigned e = 0;
    std::cin >> e;
    std::cout << buckets.size() << ' ' << ipow(3, e) << '\n';   // runtime call: same function
}`,
      complexity: `<p>O(log exp) multiplications; zero runtime cost when evaluated at compile time.</p>`,
      followUps: ['Make overflow a compile error in static_asserts (hint: signed overflow is UB → not a constant expression).', 'Make it <code>consteval</code> — what breaks?']
    }
  });
  /* ======================================================================
     PRACTICE — Medium
     ====================================================================== */
  practice.push({
    title: 'Move-Only FileHandle (RAII + Move Semantics)', level: 'Medium', tags: ['RAII', 'move-only', 'rule of five'], companies: ['Microsoft', 'Apple', 'Meta'],
    statement: `<p>Wrap a C <code>FILE*</code> in a class <code>FileHandle</code> that closes the file exactly once. It must be <b>move-only</b>: copying is a compile error, moving transfers ownership, and a moved-from handle is empty. Store handles in a <code>std::vector</code> and return one from a factory function.</p>`,
    constraints: `No double <code>fclose</code>, no leaks, even on self-move. Moves must be <code>noexcept</code>.`,
    example: `<p><code>FileHandle a = openLog("x.txt"); FileHandle b = std::move(a);</code> → ${H.c('g', 'b owns the FILE*')}, ${H.c('y', 'a is empty (bool(a) == false)')}. <code>FileHandle c = b;</code> → ${H.c('r', 'compile error')}.</p>`,
    brute: { why: `<p>A struct holding a raw <code>FILE*</code> with a destructor but default copy operations copies the pointer: two objects close the same file → double <code>fclose</code> (UB). Forgetting the destructor instead leaks file descriptors.</p>`, code: R`#include <cstdio>
struct BadFile {
    std::FILE* f;
    explicit BadFile(const char* p) : f(std::fopen(p, "w")) {}
    ~BadFile() { if (f) std::fclose(f); }   // implicit copy ctor copies f -> double fclose
};
int main() { BadFile a("/tmp/bad_demo.txt"); /* BadFile b = a;  would double-close */ return 0; }` },
    mcq: { q: 'Which special members should a move-only RAII handle declare?', options: ['Only a destructor', 'Destructor, deleted copy ctor/assignment, noexcept move ctor/assignment', 'Copy ctor only', 'Nothing — Rule of 0 with FILE*'], answer: 1, explain: 'It owns a resource (destructor), must not be duplicated (delete copies) and should transfer cheaply (noexcept moves). Alternatively hold a unique_ptr with a custom deleter and get all of this for free.' },
    hints: [`<p>Hint 1: Delete the copy operations: <code>FileHandle(const FileHandle&amp;) = delete;</code> and the same for <code>operator=</code>.</p>`, `<p>Hint 2: Move ctor: <code>f_(std::exchange(o.f_, nullptr))</code>. Move assignment: guard self, close current, steal, null the source.</p>`, `<p>Hint 3: Rule-of-0 alternative: <code>std::unique_ptr&lt;std::FILE, Closer&gt;</code> where <code>Closer</code> is a struct whose <code>operator()</code> calls <code>fclose</code>. Then the class needs no special members at all.</p>`],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"002111\n01\n1\n0\nhello\nbye"}]},
    solution: {
      approach: `<p>Hand-written Rule of 5 (destructor, two deleted copies, two noexcept moves), plus an alternative that delegates to <code>unique_ptr</code> with a custom deleter (Rule of 0).</p>`,
      code: R`#include <fstream>
#include <string>
#include <type_traits>
#include <cstdio>
#include <memory>
#include <utility>
#include <vector>

class FileHandle {
    std::FILE* f_ = nullptr;
public:
    FileHandle() = default;
    FileHandle(const char* path, const char* mode) : f_(std::fopen(path, mode)) {}
    ~FileHandle() { if (f_) std::fclose(f_); }
    FileHandle(const FileHandle&) = delete;
    FileHandle& operator=(const FileHandle&) = delete;
    FileHandle(FileHandle&& o) noexcept : f_(std::exchange(o.f_, nullptr)) {}
    FileHandle& operator=(FileHandle&& o) noexcept {
        if (this != &o) {
            if (f_) std::fclose(f_);
            f_ = std::exchange(o.f_, nullptr);
        }
        return *this;
    }
    explicit operator bool() const noexcept { return f_ != nullptr; }
    std::FILE* get() const noexcept { return f_; }
};

FileHandle openLog(const char* path) { return FileHandle(path, "w"); }   // elided, no move even needed

// Rule-of-0 alternative:
struct Closer { void operator()(std::FILE* f) const noexcept { if (f) std::fclose(f); } };
using FilePtr = std::unique_ptr<std::FILE, Closer>;

int main() {
    FileHandle a = openLog("/tmp/fh_demo_a.txt");
    FileHandle b = std::move(a);                       // a now empty
    std::vector<FileHandle> files;
    files.push_back(std::move(b));                     // moved into the vector
    files.emplace_back("/tmp/fh_demo_b.txt", "w");     // constructed in place
    FilePtr p(std::fopen("/tmp/fh_demo_c.txt", "w"));
    if (files[0]) std::fputs("hello\n", files[0].get());
    std::cout << bool(a) << bool(b) << files.size() << bool(files[0]) << bool(files[1]) << bool(p) << '\n';   // 002111
    files[1] = std::move(files[0]);                    // closes b's file, takes a's file
    std::cout << bool(files[0]) << bool(files[1]) << '\n';                                                  // 01
    FileHandle& r = files[1];
    files[1] = std::move(r);                           // self-move: still open
    std::cout << bool(files[1]) << '\n';                                                                    // 1
    FileHandle bad("/nonexistent_dir_xyz/f.txt", "r");
    std::cout << bool(bad) << '\n';                                                                         // 0
    std::fputs("bye\n", files[1].get());
    files.clear();                                     // closes (and flushes) a's file exactly once
    std::ifstream in("/tmp/fh_demo_a.txt");
    for (std::string line; std::getline(in, line); ) std::cout << line << '\n';                             // hello / bye
    static_assert(!std::is_copy_constructible_v<FileHandle> && std::is_nothrow_move_constructible_v<FileHandle>);
    std::remove("/tmp/fh_demo_a.txt"); std::remove("/tmp/fh_demo_b.txt"); std::remove("/tmp/fh_demo_c.txt");
    return (!a && !b) ? 0 : 1;
}                                                      // each file closed exactly once                                                      // each file closed exactly once`,
      alt: [R`#include <cstdio>
#include <memory>
// Even shorter Rule-of-0 version with a lambda-free function pointer deleter.
using File = std::unique_ptr<std::FILE, int (*)(std::FILE*)>;
File open(const char* p) { return File(std::fopen(p, "w"), &std::fclose); }
int main() { File f = open("/tmp/fh_demo_d.txt"); File g = std::move(f); return f ? 1 : 0; }`],
      complexity: `<p>All operations O(1). Moves are pointer swaps; storage in vector reallocates with moves because they are noexcept.</p>`,
      followUps: ['Why is a function-pointer deleter bigger than an empty struct deleter? (sizeof unique_ptr: 16 vs 8)', 'Add a <code>release()</code> that gives up ownership.']
    }
  });

  practice.push({
    title: 'Fix the Dangling this in an Async Callback', level: 'Medium', tags: ['lambdas', 'captures', 'shared_ptr', 'lifetime'], companies: ['Meta', 'Bloomberg', 'Zoom'],
    statement: `<p>A <code>Downloader</code> posts a callback to an event loop with <code>[this] { onDone(); }</code>. Sometimes the Downloader is destroyed before the loop runs the callback → crash. Fix it in two ways: (a) keep the object alive while the callback is pending, (b) skip the callback if the object is already gone.</p>`,
    constraints: `The event loop is a <code>std::vector&lt;std::function&lt;void()&gt;&gt;</code> drained later. Downloader is created with <code>std::make_shared</code>.`,
    example: `<p>Create downloader, post callback, reset the last shared_ptr, run loop.<br>Buggy: ${H.c('r', 'use-after-free')}. Fix (a): ${H.c('g', 'callback runs, object freed afterwards')}. Fix (b): ${H.c('g', 'callback sees expired weak_ptr and does nothing')}.</p>`,
    brute: { why: `<p><code>[this]</code> copies only a raw pointer. Nothing ties the callback's lifetime to the object's lifetime, so if the owner releases the object first, the callback dereferences freed memory.</p>`, code: R`#include <functional>
#include <memory>
#include <vector>
std::vector<std::function<void()>> loop;
struct Downloader {
    int bytes = 0;
    void start() { loop.push_back([this] { onDone(); }); }   // raw pointer capture
    void onDone() { bytes = 100; }
};
int main() {
    auto d = std::make_shared<Downloader>();
    d->start();
    // d.reset(); for (auto& f : loop) f();   // would be use-after-free
    for (auto& f : loop) f();
}` },
    mcq: { q: 'What does <code>[self = shared_from_this()]</code> change?', options: ['Nothing, it is the same as [this]', 'The closure owns a shared_ptr, so the object lives at least until the callback is destroyed', 'It copies the whole object', 'It makes the callback run immediately'], answer: 1, explain: 'The init-capture stores a shared_ptr in the closure, adding one to the reference count; the object cannot be destroyed while the callback exists.' },
    hints: [`<p>Hint 1: Inherit <code>std::enable_shared_from_this&lt;Downloader&gt;</code> so the object can produce a <code>shared_ptr</code> to itself.</p>`, `<p>Hint 2: Keep-alive: capture <code>[self = shared_from_this()]</code>. Optional-run: capture <code>[weak = weak_from_this()]</code> and do <code>if (auto self = weak.lock()) self-&gt;onDone();</code>.</p>`, `<p>Hint 3: Keep-alive can create cycles if the object stores the callback itself — then prefer the weak version. Never call shared_from_this() in the constructor (no owner exists yet).</p>`],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"~Downloader 2\ndone 1\nskipped: object already gone\n~Downloader 1\ndone 3\ndone 3\nafter reset\n~Downloader 3"}]},
    solution: {
      approach: `<p>Tie the callback's view of the object to ownership: a <b>shared_ptr</b> capture extends the lifetime (good for "must finish" work), a <b>weak_ptr</b> capture checks liveness (good for UI/notifications that are pointless if the owner is gone).</p>`,
      code: R`#include <functional>
#include <iostream>
#include <memory>
#include <vector>

std::vector<std::function<void()>> loop;

struct Downloader : std::enable_shared_from_this<Downloader> {
    int id;
    explicit Downloader(int i) : id(i) {}
    ~Downloader() { std::cout << "~Downloader " << id << '\n'; }
    void startKeepAlive() { loop.push_back([self = shared_from_this()] { self->onDone(); }); }
    void startIfAlive() {
        loop.push_back([weak = weak_from_this()] {
            if (auto self = weak.lock()) self->onDone();
            else std::cout << "skipped: object already gone\n";
        });
    }
    void onDone() { std::cout << "done " << id << '\n'; }
};

int main() {
    auto a = std::make_shared<Downloader>(1);
    a->startKeepAlive();
    a.reset();                      // still alive: the closure holds a shared_ptr
    auto b = std::make_shared<Downloader>(2);
    b->startIfAlive();
    b.reset();                      // "~Downloader 2" now: weak_ptr does not keep it alive
    for (auto& f : loop) f();       // "done 1", then "skipped: object already gone"
    loop.clear();                   // "~Downloader 1" when its closure is destroyed
    auto c = std::make_shared<Downloader>(3);
    c->startIfAlive();
    c->startKeepAlive();
    for (auto& f : loop) f();       // object is alive for both: "done 3" twice
    c.reset();                      // the keep-alive closure still owns it: no destructor yet
    std::cout << "after reset\n";
    loop.clear();                   // "~Downloader 3"
}`,
      complexity: `<p>O(1) per post; shared_ptr capture costs an atomic increment/decrement; weak lock costs an atomic compare-exchange.</p>`,
      followUps: ['What happens if the Downloader stores the keep-alive callback as a member? (reference cycle → leak)', 'How would you cancel pending callbacks instead?']
    }
  });

  practice.push({
    title: 'Event Dispatcher with std::variant and std::visit', level: 'Medium', tags: ['std::variant', 'std::visit', 'overloaded idiom'], companies: ['Epic Games', 'Unity', 'Bloomberg'],
    statement: `<p>Model UI events as <code>std::variant&lt;KeyPress, Click, Resize&gt;</code>. Process a list of events: count key presses, sum click x-coordinates, and remember the last window size. Adding a new event type must cause a <b>compile error</b> until it is handled.</p>`,
    constraints: `Up to 10<sup>6</sup> events. No heap allocation per event, no dynamic_cast.`,
    example: `<p>[Key 'a', Click(10, 5), Key 'b', Resize(800, 600), Click(3, 1)] → ${H.c('g', 'keys = 2, clickX = 13, size = 800x600')}.</p>`,
    brute: { why: `<p>The classic OOP approach stores <code>std::unique_ptr&lt;Event&gt;</code> and tests each with <code>dynamic_cast</code>: one heap allocation per event, poor cache locality, RTTI cost per check, and a forgotten case silently falls through.</p>`, code: R`#include <memory>
#include <vector>
struct Event { virtual ~Event() = default; };
struct KeyPress : Event { char key; explicit KeyPress(char k) : key(k) {} };
struct Click : Event { int x, y; Click(int a, int b) : x(a), y(b) {} };
int countKeys(const std::vector<std::unique_ptr<Event>>& evs) {
    int keys = 0;
    for (const auto& e : evs)
        if (dynamic_cast<const KeyPress*>(e.get())) ++keys;   // RTTI per element, heap per event
    return keys;
}
int main() {
    std::vector<std::unique_ptr<Event>> evs;
    evs.push_back(std::make_unique<KeyPress>('a'));
    evs.push_back(std::make_unique<Click>(1, 2));
    return countKeys(evs) == 1 ? 0 : 1;
}` },
    mcq: { q: 'What happens if you add <code>Scroll</code> to the variant but not to the overloaded visitor?', options: ['It is silently ignored', 'Runtime exception', 'Compile error: no matching call for Scroll', 'Undefined behaviour'], answer: 2, explain: 'std::visit requires the visitor to be callable with every alternative; a missing overload fails to compile — exhaustiveness checking for free.' },
    hints: [`<p>Hint 1: Events are plain structs; <code>using Event = std::variant&lt;KeyPress, Click, Resize&gt;;</code> and store them by value in a vector.</p>`, `<p>Hint 2: The overloaded idiom: <code>template&lt;class... Ts&gt; struct overloaded : Ts... { using Ts::operator()...; };</code> — combines lambdas into one visitor.</p>`, `<p>Hint 3: Capture the stats struct by reference in the lambdas (used immediately, so safe) and call <code>std::visit(visitor, ev)</code> for each event.</p>`],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"2 13 800x600\n0 0 0x0\n0 -10 3x4\n1 999999000 0x0"}]},
    solution: {
      approach: `<p>Value-semantic events in a contiguous vector, dispatched with <code>std::visit</code> over an <code>overloaded</code> set of lambdas. Exhaustive, allocation-free, cache-friendly.</p>`,
      code: R`#include <iostream>
#include <variant>
#include <vector>

struct KeyPress { char key; };
struct Click    { int x, y; };
struct Resize   { int w, h; };
using Event = std::variant<KeyPress, Click, Resize>;

template <class... Ts> struct overloaded : Ts... { using Ts::operator()...; };

struct Stats { int keys = 0; long long clickX = 0; int w = 0, h = 0; };

Stats process(const std::vector<Event>& events) {
    Stats s;
    auto visitor = overloaded{
        [&](const KeyPress&)  { ++s.keys; },
        [&](const Click& c)   { s.clickX += c.x; },
        [&](const Resize& r)  { s.w = r.w; s.h = r.h; }
    };
    for (const auto& ev : events) std::visit(visitor, ev);
    return s;
}

int main() {
    std::vector<Event> evs{KeyPress{'a'}, Click{10, 5}, KeyPress{'b'}, Resize{800, 600}, Click{3, 1}};
    Stats s = process(evs);
    std::cout << s.keys << ' ' << s.clickX << ' ' << s.w << 'x' << s.h << '\n';   // 2 13 800x600
    Stats e = process({});
    std::cout << e.keys << ' ' << e.clickX << ' ' << e.w << 'x' << e.h << '\n';   // 0 0 0x0
    Stats r = process({Resize{1, 2}, Resize{3, 4}, Click{-5, 0}, Click{-5, 9}});
    std::cout << r.keys << ' ' << r.clickX << ' ' << r.w << 'x' << r.h << '\n';   // 0 -10 3x4
    std::vector<Event> big(1000000, Click{1000, 0});
    big[0] = KeyPress{'k'};
    Stats g = process(big);
    std::cout << g.keys << ' ' << g.clickX << ' ' << g.w << 'x' << g.h << '\n';   // 1 999999000 0x0
}`,
      complexity: `<p>O(n) with O(1) dispatch per event (jump table on the index). Memory: n × sizeof(Event) contiguous, no per-event allocation.</p>`,
      followUps: ['Add a <code>Scroll</code> event and watch the compiler point at the missing case.', 'When would virtual dispatch be the better design? (open set of event types from plugins)']
    }
  });

  practice.push({
    title: 'Implement my_move and my_forward', level: 'Medium', tags: ['std::move', 'std::forward', 'type traits'], companies: ['Jane Street', 'Citadel', 'Bloomberg'],
    statement: `<p>Implement <code>my_move</code> and <code>my_forward</code> from scratch (only <code>&lt;type_traits&gt;</code> allowed) and prove they behave like the standard ones using an overload set that prints which overload was chosen, plus <code>static_assert</code>s on the returned types.</p>`,
    constraints: `Both must be <code>constexpr</code> and <code>noexcept</code>. <code>my_forward&lt;int&gt;(lvalue)</code> must yield an rvalue; <code>my_forward&lt;int&amp;&gt;(lvalue)</code> an lvalue.`,
    example: `<p><code>sink(my_move(x))</code> → ${H.c('g', 'rvalue')}. Inside <code>relay(T&amp;&amp; a)</code>: called with <code>x</code> → ${H.c('b', 'lvalue')}, called with <code>5</code> → ${H.c('g', 'rvalue')}.</p>`,
    brute: { why: `<p>A first attempt <code>template&lt;class T&gt; T&amp;&amp; bad_move(T&amp;&amp; x) { return static_cast&lt;T&amp;&amp;&gt;(x); }</code> fails for lvalues: T deduces to <code>int&amp;</code>, so <code>T&amp;&amp;</code> collapses to <code>int&amp;</code> and you get an lvalue back — nothing is "moved". You must strip the reference first.</p>`, code: R`#include <type_traits>
template <class T> T&& bad_move(T&& x) { return static_cast<T&&>(x); }   // T = int& -> returns int&
int main() {
    int x = 1;
    static_assert(std::is_same_v<decltype(bad_move(x)), int&>);   // still an lvalue: broken
}` },
    mcq: { q: 'Why does <code>my_move</code> return <code>std::remove_reference_t&lt;T&gt;&amp;&amp;</code> rather than <code>T&amp;&amp;</code>?', options: ['Style only', 'When an lvalue is passed, T is U&amp;, and T&amp;&amp; would collapse to U&amp; — not an rvalue', 'To support const', 'To avoid copies'], answer: 1, explain: 'Reference collapsing turns U&amp; &amp;&amp; into U&amp;. Removing the reference first guarantees the result is always U&amp;&amp; (an xvalue).' },
    hints: [`<p>Hint 1: <code>my_move</code> takes a forwarding reference <code>T&amp;&amp; x</code> and returns <code>static_cast&lt;std::remove_reference_t&lt;T&gt;&amp;&amp;&gt;(x)</code>.</p>`, `<p>Hint 2: <code>my_forward&lt;T&gt;</code> must be called with an explicit T (no deduction — that is why the parameter type is <code>std::remove_reference_t&lt;T&gt;&amp;</code>, a non-deduced context). Return <code>static_cast&lt;T&amp;&amp;&gt;(x)</code>.</p>`, `<p>Hint 3: Test with <code>void sink(int&amp;)</code> / <code>void sink(int&amp;&amp;)</code> printing "lvalue"/"rvalue", and a <code>relay(T&amp;&amp; a) { sink(my_forward&lt;T&gt;(a)); }</code>.</p>`],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"rvalue\nlvalue\nrvalue\nrvalue\nlvalue\nrvalue\nhello 4"}]},
    solution: {
      approach: `<p>Both are pure casts. <code>my_move</code> unconditionally casts to an rvalue reference of the referenced type. <code>my_forward&lt;T&gt;</code> casts to <code>T&amp;&amp;</code>, which reference collapsing turns into an lvalue reference when T is an lvalue reference type.</p>`,
      code: R`#include <iostream>
#include <type_traits>

template <class T>
constexpr std::remove_reference_t<T>&& my_move(T&& x) noexcept {
    return static_cast<std::remove_reference_t<T>&&>(x);
}

template <class T>
constexpr T&& my_forward(std::remove_reference_t<T>& x) noexcept {   // non-deduced: caller writes T
    return static_cast<T&&>(x);
}
template <class T>
constexpr T&& my_forward(std::remove_reference_t<T>&& x) noexcept {
    static_assert(!std::is_lvalue_reference_v<T>, "forwarding an rvalue as an lvalue");
    return static_cast<T&&>(x);
}

void sink(int&)  { std::cout << "lvalue\n"; }
void sink(int&&) { std::cout << "rvalue\n"; }

template <class T>
void relay(T&& a) { sink(my_forward<T>(a)); }

int main() {
    int x = 1;
    sink(my_move(x));   // rvalue
    relay(x);           // lvalue  (T = int&)
    relay(5);           // rvalue  (T = int)
    static_assert(std::is_same_v<decltype(my_move(x)), int&&>);
    static_assert(std::is_same_v<decltype(my_forward<int&>(x)), int&>);
    static_assert(std::is_same_v<decltype(my_forward<int>(x)), int&&>);
    sink(my_forward<int>(x));    // rvalue: T = int asks for an rvalue
    sink(my_forward<int&>(x));   // lvalue
    relay(my_move(x));           // rvalue: an xvalue arrives as T = int
    static_assert(noexcept(my_move(x)) && noexcept(my_forward<int>(x)));
    constexpr int c = [] { int y = 3; int&& r = my_move(y); return r + 1; }();
    static_assert(c == 4);
    std::string s = "hello";
    std::string t = my_move(s);
    std::cout << t << ' ' << c << '\n';   // hello 4
}`,
      complexity: `<p>Zero runtime cost: both compile to nothing (a cast changes only the static type).</p>`,
      followUps: ['Why does std::forward need the explicit template argument?', 'What is <code>std::forward_like</code> (C++23) for?']
    }
  });

  practice.push({
    title: 'Memoize Any Function with an Init-Capture Cache', level: 'Medium', tags: ['lambdas', 'mutable', 'generic programming'], companies: ['Google', 'Two Sigma'],
    statement: `<p>Write <code>memoize(f)</code> that returns a callable which caches results of <code>f(int) -&gt; long long</code>. Repeated calls with the same argument must not call <code>f</code> again. The cache must live <b>inside</b> the returned lambda (no globals), and the original function must be moved (not copied) into it.</p>`,
    constraints: `Arguments 0 ≤ n ≤ 10<sup>6</sup>. f may be expensive and may be a move-only callable.`,
    example: `<p><code>auto slowSq = [&amp;calls](int n) { ++calls; return 1LL * n * n; }; auto fast = memoize(slowSq);</code> <code>fast(4); fast(4); fast(5);</code> → results 16, 16, 25 and ${H.c('g', 'calls == 2')} (not 3).</p>`,
    brute: { why: `<p>Calling the function every time repeats identical work. A global <code>std::map</code> cache "works" but is shared by every function, not thread-safe, and leaks across tests.</p>`, code: R`#include <map>
std::map<int, long long> globalCache;                     // shared by everything: bad
long long slowSquare(int n) { return 1LL * n * n; }
long long cachedSquare(int n) {
    auto it = globalCache.find(n);
    if (it != globalCache.end()) return it->second;
    return globalCache[n] = slowSquare(n);
}
int main() { return cachedSquare(3) == 9 ? 0 : 1; }` },
    mcq: { q: 'Why must the returned lambda be <code>mutable</code>?', options: ['To capture by reference', 'Because operator() is const by default and inserting into the captured cache modifies a member', 'To allow recursion', 'It does not need to be'], answer: 1, explain: 'The cache is a by-value data member of the closure. A const operator() cannot modify members, so mutable is required.' },
    hints: [`<p>Hint 1: Init-captures can create new members: <code>[fn = std::move(f), cache = std::unordered_map&lt;int, long long&gt;{}]</code>.</p>`, `<p>Hint 2: Mark the lambda <code>mutable</code> so it may insert into <code>cache</code>. Use <code>find</code> then <code>emplace</code> (or <code>try_emplace</code>).</p>`, `<p>Hint 3: Take <code>f</code> by value (<code>template&lt;class F&gt; auto memoize(F f)</code>) and move it into the capture — callers can pass lvalues (copied once) or rvalues (moved).</p>`],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"16 16 25 calls=2\n16 calls=2\n25 36 calls=3\n36 calls=4\n21 21\n0 1000000000000 calls=6\n333328333350000 calls=100002\n333328333350000 calls=100002"}]},
    solution: {
      approach: `<p>Return a mutable lambda that owns both the function (moved in) and an <code>unordered_map</code> cache via init-captures. Each memoized callable has its own private cache.</p>`,
      code: R`#include <iostream>
#include <unordered_map>
#include <utility>

template <class F>
auto memoize(F f) {
    return [fn = std::move(f), cache = std::unordered_map<int, long long>{}](int n) mutable -> long long {
        if (auto it = cache.find(n); it != cache.end()) return it->second;   // hit
        long long v = fn(n);                                                  // miss: compute once
        cache.emplace(n, v);
        return v;
    };
}

int main() {
    int calls = 0;
    auto slowSq = [&calls](int n) { ++calls; return 1LL * n * n; };
    auto fast = memoize(slowSq);
    std::cout << fast(4) << ' ' << fast(4) << ' ' << fast(5) << " calls=" << calls << '\n';  // 16 16 25 calls=2
    auto copy = fast;          // copying the closure copies its cache too (independent from now on)
    std::cout << copy(4) << " calls=" << calls << '\n';                                       // 16 calls=2
    std::cout << copy(5) << ' ' << copy(6) << " calls=" << calls << '\n';                     // 25 36 calls=3
    std::cout << fast(6) << " calls=" << calls << '\n';                                       // 36 calls=4
    auto mo = memoize([p = std::make_unique<int>(3)](int n) { return static_cast<long long>(*p) * n; });   // move-only callable
    std::cout << mo(7) << ' ' << mo(7) << '\n';                                                // 21 21
    std::cout << fast(0) << ' ' << fast(1000000) << " calls=" << calls << '\n';               // 0 1000000000000 calls=6
    for (int pass = 0; pass < 2; ++pass) {
        long long sum = 0;
        for (int i = 0; i < 100000; ++i) sum += fast(i);
        std::cout << sum << " calls=" << calls << '\n';   // both passes: 333328333350000 calls=100002
    }
}`,
      complexity: `<p>O(1) average per call after the first computation for a given n; memory O(distinct arguments).</p>`,
      followUps: ['Memoize a <b>recursive</b> function (e.g. fib) so that inner calls also hit the cache.', 'Make it thread-safe — where would you put the mutex, and why is that awkward in a copyable lambda?']
    }
  });

  practice.push({
    title: 'Top-3 Word Frequencies with Structured Bindings & Projections', level: 'Medium', tags: ['structured bindings', 'ranges', 'unordered_map'], companies: ['Amazon', 'Microsoft', 'Yelp'],
    statement: `<p>Given a text, count word frequencies (lowercase, split on spaces) and print the 3 most frequent words with counts, highest first, ties broken alphabetically. Use structured bindings for every pair access and <code>std::ranges::sort</code> for ordering.</p>`,
    constraints: `Text up to 10<sup>6</sup> characters. Words are separated by single spaces.`,
    example: `<p>"the cat and the hat and the bat" → ${H.c('g', 'the 3, and 2, bat 1')} (bat beats cat and hat alphabetically).</p>`,
    brute: { why: `<p>For each distinct word, rescanning the whole text to count it is O(W × D). Using <code>.first</code>/<code>.second</code> everywhere and copying pairs by value in loops adds readability problems and string copies.</p>`, code: R`#include <sstream>
#include <string>
#include <vector>
int countWord(const std::string& text, const std::string& w) {   // O(W) per distinct word
    std::istringstream in(text); std::string t; int c = 0;
    while (in >> t) if (t == w) ++c;
    return c;
}
int main() { return countWord("a b a", "a") == 2 ? 0 : 1; }` },
    mcq: { q: 'In <code>for (const auto&amp; [word, cnt] : freq)</code>, what is <code>word</code>?', options: ['A copy of the key', 'An alias for the key inside the map element (no copy)', 'An iterator', 'A string_view'], answer: 1, explain: 'The hidden object is a const reference to the map element; word and cnt are names for its members, so nothing is copied.' },
    hints: [`<p>Hint 1: Count with <code>std::unordered_map&lt;std::string, int&gt;</code> and <code>++freq[word]</code> in one pass.</p>`, `<p>Hint 2: Copy entries into a <code>std::vector&lt;std::pair&lt;std::string, int&gt;&gt;</code> (you need a sortable sequence), then <code>std::ranges::sort</code> with a comparator on (count desc, word asc).</p>`, `<p>Hint 3: Use <code>std::ranges::partial_sort</code> for only the top 3 (O(D log 3)). Print with <code>for (const auto&amp; [w, c] : top | std::views::take(3))</code>.</p>`],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"the 3\nand 2\nbat 1\n<>\n<b 2, a 1>\n<hello 3, world 1>\n<w 1, x 1, y 1>\n<a 1>\n<x 40000, y 30000, z 20000>"}]},
    solution: {
      approach: `<p>One counting pass into a hash map, move the entries into a vector, partially sort the first 3 by (count desc, word asc), print with structured bindings.</p>`,
      code: R`#include <algorithm>
#include <iostream>
#include <ranges>
#include <sstream>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

std::vector<std::pair<std::string, int>> top3(const std::string& text) {
    std::unordered_map<std::string, int> freq;
    std::istringstream in(text);
    for (std::string w; in >> w; ) {
        std::ranges::transform(w, w.begin(), [](unsigned char c) { return static_cast<char>(std::tolower(c)); });
        ++freq[std::move(w)];
    }
    std::vector<std::pair<std::string, int>> v(std::make_move_iterator(freq.begin()), std::make_move_iterator(freq.end()));
    auto better = [](const auto& a, const auto& b) {
        const auto& [wa, ca] = a;
        const auto& [wb, cb] = b;
        return ca != cb ? ca > cb : wa < wb;
    };
    auto k = std::min<std::size_t>(3, v.size());
    std::ranges::partial_sort(v, v.begin() + k, better);
    v.resize(k);
    return v;
}

void show(const std::string& text) {
    std::cout << '<';
    bool first = true;
    for (const auto& [w, c] : top3(text)) { std::cout << (first ? "" : ", ") << w << ' ' << c; first = false; }
    std::cout << ">\n";
}

int main() {
    for (const auto& [word, count] : top3("the cat and the hat and the bat"))
        std::cout << word << ' ' << count << '\n';      // the 3 / and 2 / bat 1
    show("");                                           // <>
    show("b a b");                                      // <b 2, a 1>
    show("Hello hello HELLO world");                    // <hello 3, world 1>
    show("z y x w");                                    // <w 1, x 1, y 1>
    show("a");                                          // <a 1>
    std::string big;
    for (int i = 0; i < 40000; ++i) big += "x ";
    for (int i = 0; i < 30000; ++i) big += "y ";
    for (int i = 0; i < 20000; ++i) big += "z ";
    for (int i = 0; i < 10000; ++i) big += "w ";
    show(big);                                          // <x 40000, y 30000, z 20000>
}`,
      complexity: `<p>O(W) counting + O(D log 3) partial sort, where W = words, D = distinct words. Memory O(D).</p>`,
      followUps: ['Stream the text and keep only a size-3 min-heap — when is that better?', 'Copy or move? <code>make_move_iterator</code> over the map moves the counts but the keys are <code>const std::string</code> — so they are actually copied. How could C++17 <code>extract()</code> move them out?']
    }
  });
  /* ======================================================================
     PRACTICE — Hard
     ====================================================================== */
  practice.push({
    title: 'SimpleVector: Move-Aware Growth with move_if_noexcept', level: 'Hard', tags: ['move semantics', 'placement new', 'exception safety', 'perfect forwarding'], companies: ['Bloomberg', 'Google', 'Microsoft', 'Optiver'],
    statement: `<p>Implement <code>SimpleVector&lt;T&gt;</code> with <code>emplace_back(Args&amp;&amp;...)</code>, <code>push_back(const T&amp;)</code>, <code>push_back(T&amp;&amp;)</code>, <code>size()</code>, <code>operator[]</code>, a move constructor, and a destructor. On growth it must relocate elements with <code>std::move_if_noexcept</code> (strong exception guarantee) and must handle <code>v.push_back(v[0])</code> correctly when that push triggers a reallocation.</p>`,
    constraints: `Capacity doubles (1, 2, 4, ...). Raw memory via <code>::operator new</code>; elements built with placement new. No leaks if a constructor throws.`,
    example: `<p>Push 5 strings → capacities 1, 2, 4, 8; total element relocations = 1 + 2 + 4 = ${H.c('g', '7 moves, 0 copies')} (std::string's move is noexcept). With a type whose move ctor is <i>not</i> noexcept but which is copyable, the same pushes do ${H.c('y', '7 copies')} — the price of the strong guarantee.</p>`,
    brute: { why: `<p>Growing by allocating <code>new T[newCap]</code> default-constructs every slot (requires a default ctor, wastes work) and then copy-assigns each old element: O(n) copies with allocations each time. And reading <code>v[0]</code> after freeing the old buffer in <code>push_back(v[0])</code> is a use-after-free.</p>`, code: R`#include <cstddef>
#include <string>
template <class T>
struct NaiveVector {
    T* data = nullptr; std::size_t n = 0, cap = 0;
    void push_back(const T& x) {
        if (n == cap) {
            std::size_t nc = cap ? cap * 2 : 1;
            T* nd = new T[nc];                         // default-constructs nc objects
            for (std::size_t i = 0; i < n; ++i) nd[i] = data[i];   // copies, never moves
            delete[] data;                             // x may have referred into data: dangling!
            data = nd; cap = nc;
        }
        data[n++] = x;
    }
    ~NaiveVector() { delete[] data; }
};
int main() { NaiveVector<std::string> v; v.push_back("a"); v.push_back("b"); return v.n == 2 ? 0 : 1; }` },
    mcq: { q: 'Why construct the NEW element before relocating the old ones during growth?', options: ['It is faster', 'The argument may alias an existing element (push_back(v[0])); it must be read before the old buffer is destroyed', 'The standard forbids the other order', 'To avoid calling the destructor'], answer: 1, explain: 'If old elements were moved first, v[0] would be a moved-from object (or freed memory) by the time we copy from it. Building the new element first reads the argument while it is still intact.' },
    hints: [`<p>Hint 1: Allocate raw memory: <code>static_cast&lt;T*&gt;(::operator new(n * sizeof(T)))</code>. Build objects with <code>::new (ptr) T(std::forward&lt;Args&gt;(args)...)</code>; destroy with <code>p-&gt;~T()</code>; free with <code>::operator delete</code>.</p>`, `<p>Hint 2: On growth: (1) allocate new block, (2) construct the new element at index size in the new block, (3) relocate old elements with <code>::new (nd + i) T(std::move_if_noexcept(data_[i]))</code>, (4) destroy old elements and free old block.</p>`, `<p>Hint 3: Wrap steps 2–3 in try/catch: on exception destroy whatever was built in the new block, free it, rethrow — the old vector is untouched (strong guarantee). <code>push_back(const T&amp;)</code> and <code>push_back(T&amp;&amp;)</code> both just call <code>emplace_back</code>.</p>`],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"moves=7 copies=0\nfirst first 2\nlegacy copies=7 moves=0\ncaught size=4 first=1 last=4 live=4\nlive after=0\n1000 1024 499500\nc 5 8\n0 1000"}]},
    solution: {
      approach: `<p>Separate allocation from construction. Growth builds the new element first (alias-safe), then relocates with <code>move_if_noexcept</code>, cleaning up on exceptions. All insertion paths funnel through a perfectly-forwarding <code>emplace_back</code>.</p>`,
      code: R`#include <stdexcept>
#include <type_traits>
#include <cstddef>
#include <iostream>
#include <new>
#include <string>
#include <utility>

template <class T>
class SimpleVector {
    T* data_ = nullptr;
    std::size_t size_ = 0, cap_ = 0;
    static T* allocate(std::size_t n) { return static_cast<T*>(::operator new(n * sizeof(T))); }
    static void deallocate(T* p) noexcept { ::operator delete(p); }
    void destroyAll() noexcept { for (std::size_t i = 0; i < size_; ++i) data_[i].~T(); }
public:
    SimpleVector() = default;
    SimpleVector(const SimpleVector&) = delete;               // kept short: move-only container
    SimpleVector& operator=(const SimpleVector&) = delete;
    SimpleVector(SimpleVector&& o) noexcept
        : data_(std::exchange(o.data_, nullptr)), size_(std::exchange(o.size_, 0)), cap_(std::exchange(o.cap_, 0)) {}
    ~SimpleVector() { destroyAll(); deallocate(data_); }

    template <class... Args>
    T& emplace_back(Args&&... args) {
        if (size_ < cap_) {
            ::new (static_cast<void*>(data_ + size_)) T(std::forward<Args>(args)...);
            return data_[size_++];
        }
        std::size_t ncap = cap_ ? cap_ * 2 : 1;
        T* nd = allocate(ncap);
        std::size_t built = 0;
        bool newBuilt = false;
        try {
            ::new (static_cast<void*>(nd + size_)) T(std::forward<Args>(args)...);   // 1. new element first
            newBuilt = true;
            for (; built < size_; ++built)                                           // 2. relocate old ones
                ::new (static_cast<void*>(nd + built)) T(std::move_if_noexcept(data_[built]));
        } catch (...) {
            for (std::size_t i = 0; i < built; ++i) nd[i].~T();
            if (newBuilt) nd[size_].~T();
            deallocate(nd);
            throw;                                                                   // old vector untouched
        }
        destroyAll();
        deallocate(data_);
        data_ = nd; cap_ = ncap;
        return data_[size_++];
    }
    void push_back(const T& x) { emplace_back(x); }
    void push_back(T&& x) { emplace_back(std::move(x)); }
    std::size_t size() const noexcept { return size_; }
    std::size_t capacity() const noexcept { return cap_; }
    T& operator[](std::size_t i) noexcept { return data_[i]; }
};

struct Counted {
    static inline int copies = 0, moves = 0;
    std::string s;
    explicit Counted(std::string x) : s(std::move(x)) {}
    Counted(const Counted& o) : s(o.s) { ++copies; }
    Counted(Counted&& o) noexcept : s(std::move(o.s)) { ++moves; }
};

struct Legacy {                                   // copyable, but its move may throw: copy is used on growth
    static inline int copies = 0, moves = 0;
    int v;
    explicit Legacy(int x) : v(x) {}
    Legacy(const Legacy& o) : v(o.v) { ++copies; }
    Legacy(Legacy&& o) : v(o.v) { ++moves; }
};

struct Fragile {                                  // copying throws once the budget is used up
    static inline int live = 0, budget = 100;
    int v;
    explicit Fragile(int x) : v(x) { ++live; }
    Fragile(const Fragile& o) : v(o.v) { if (--budget < 0) throw std::runtime_error("copy failed"); ++live; }
    ~Fragile() { --live; }
};

int main() {
    SimpleVector<Counted> v;
    for (int i = 0; i < 5; ++i) v.emplace_back("item" + std::to_string(i));
    std::cout << "moves=" << Counted::moves << " copies=" << Counted::copies << '\n';   // moves=7 copies=0
    SimpleVector<std::string> w;
    w.push_back("first");
    w.push_back(w[0]);                    // reallocation + aliasing: still correct
    std::cout << w[0] << ' ' << w[1] << ' ' << w.capacity() << '\n';                  // first first 2

    SimpleVector<Legacy> lg;
    for (int i = 0; i < 5; ++i) lg.emplace_back(i);
    std::cout << "legacy copies=" << Legacy::copies << " moves=" << Legacy::moves << '\n';   // legacy copies=7 moves=0

    {
        SimpleVector<Fragile> f;
        for (int i = 1; i <= 4; ++i) f.emplace_back(i);          // size 4, capacity 4
        Fragile::budget = 1;                                      // the next reallocation can copy only one element
        try {
            f.emplace_back(5);
        } catch (const std::runtime_error&) {
            std::cout << "caught size=" << f.size() << " first=" << f[0].v << " last=" << f[3].v
                      << " live=" << Fragile::live << '\n';       // caught size=4 first=1 last=4 live=4
        }
    }
    std::cout << "live after=" << Fragile::live << '\n';          // live after=0

    SimpleVector<int> ints;
    long long sum = 0;
    for (int i = 0; i < 1000; ++i) ints.push_back(i);
    for (int i = 0; i < 1000; ++i) sum += ints[i];
    std::cout << ints.size() << ' ' << ints.capacity() << ' ' << sum << '\n';        // 1000 1024 499500

    SimpleVector<std::string> w2;
    for (const char* t : {"a", "b", "c", "d"}) w2.push_back(t);
    w2.push_back(w2[2]);                  // full vector, element of itself
    std::cout << w2[4] << ' ' << w2.size() << ' ' << w2.capacity() << '\n';          // c 5 8
    auto moved = std::move(ints);
    std::cout << ints.size() << ' ' << moved.size() << '\n';                         // 0 1000
    static_assert(!std::is_copy_constructible_v<SimpleVector<int>>);
}`,
      complexity: `<p>Amortised O(1) per push (doubling); total relocations &lt; 2n. Each relocation is a move when noexcept, otherwise a copy.</p>`,
      followUps: ['Add copy construction with the strong guarantee.', 'Use <code>std::uninitialized_move_if_noexcept</code>-style helpers (<code>std::uninitialized_move</code>) — what do they handle for you?', 'What changes for trivially relocatable types (memcpy relocation, P1144)?']
    }
  });

  practice.push({
    title: 'UniqueFunction: Type Erasure for Move-Only Callables', level: 'Hard', tags: ['type erasure', 'perfect forwarding', 'lambdas', 'move-only'], companies: ['Google', 'Meta', 'Bloomberg'],
    statement: `<p><code>std::function</code> requires copyable callables, so <code>[p = std::make_unique&lt;Job&gt;()] { ... }</code> cannot be stored in it. Implement <code>UniqueFunction&lt;R(Args...)&gt;</code>: move-only, accepts any callable invocable as <code>R(Args...)</code> (including move-only lambdas), with <code>operator()</code>, <code>operator bool</code>, and correct forwarding of arguments.</p>`,
    constraints: `C++20. Must reject copying at compile time. Calling an empty UniqueFunction may throw <code>std::bad_function_call</code>.`,
    example: `<p><code>UniqueFunction&lt;int(int)&gt; f = [p = std::make_unique&lt;int&gt;(10)](int x) { return *p + x; };</code> <code>f(5)</code> → ${H.c('g', '15')}. <code>auto g = std::move(f);</code> → g works, ${H.c('y', 'f is empty')}. <code>auto h = g;</code> → ${H.c('r', 'compile error')}.</p>`,
    brute: { why: `<p>The usual workaround wraps the move-only state in a <code>std::shared_ptr</code> so the lambda becomes copyable and fits into <code>std::function</code>. It costs an extra heap allocation and atomic reference counting, and silently shares state between "copies".</p>`, code: R`#include <functional>
#include <memory>
int main() {
    auto job = std::make_shared<std::unique_ptr<int>>(std::make_unique<int>(10));  // shared just to be copyable
    std::function<int(int)> f = [job](int x) { return **job + x; };
    auto g = f;                     // both share the same job: surprising
    return f(5) + g(5) == 30 ? 0 : 1;
}` },
    mcq: { q: 'What is the core trick of type erasure here?', options: ['Templates on the whole class', 'A non-template interface (virtual call) implemented by a templated model that stores the concrete callable', 'Using void* and casts only', 'Macros'], answer: 1, explain: 'The outer class is not a template on the callable type. It holds a pointer to an abstract Concept; a templated Model&lt;F&gt; derives from it and stores F. Calls go through a virtual function.' },
    hints: [`<p>Hint 1: Partial specialisation on a function type: <code>template&lt;class&gt; class UniqueFunction; template&lt;class R, class... Args&gt; class UniqueFunction&lt;R(Args...)&gt; { ... };</code></p>`, `<p>Hint 2: Inside: <code>struct Concept { virtual ~Concept() = default; virtual R call(Args... args) = 0; };</code> and <code>template&lt;class F&gt; struct Model : Concept { F f; ... };</code>. Store <code>std::unique_ptr&lt;Concept&gt;</code> — that makes the class move-only automatically.</p>`, `<p>Hint 3: Constructor: <code>template&lt;class F&gt; requires (!std::same_as&lt;std::remove_cvref_t&lt;F&gt;, UniqueFunction&gt;) &amp;&amp; std::is_invocable_r_v&lt;R, std::decay_t&lt;F&gt;&amp;, Args...&gt;</code>, build <code>Model&lt;std::decay_t&lt;F&gt;&gt;</code> with <code>std::forward&lt;F&gt;(f)</code>. Forward call arguments with <code>std::forward&lt;Args&gt;(args)...</code>.</p>`],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"15\n11 0\n50\n0 empty\n42\n1 2 3\n2\n2.5\n10 0"}]},
    solution: {
      approach: `<p>Classic type erasure: an abstract <code>Concept</code> with a virtual <code>call</code>, a templated <code>Model&lt;F&gt;</code> that stores the callable by value, and an owning <code>unique_ptr&lt;Concept&gt;</code>. The constraint stops the converting constructor from hijacking moves of UniqueFunction itself. (C++23 ships this as <code>std::move_only_function</code>.)</p>`,
      code: R`#include <concepts>
#include <functional>
#include <iostream>
#include <memory>
#include <string>
#include <type_traits>
#include <utility>
#include <vector>

template <class> class UniqueFunction;

template <class R, class... Args>
class UniqueFunction<R(Args...)> {
    struct Concept {
        virtual ~Concept() = default;
        virtual R call(Args... args) = 0;
    };
    template <class F>
    struct Model final : Concept {
        F f;
        template <class G> explicit Model(G&& g) : f(std::forward<G>(g)) {}
        R call(Args... args) override { return std::invoke(f, std::forward<Args>(args)...); }
    };
    std::unique_ptr<Concept> impl_;
public:
    UniqueFunction() = default;
    template <class F>
        requires (!std::same_as<std::remove_cvref_t<F>, UniqueFunction>) &&
                 std::is_invocable_r_v<R, std::decay_t<F>&, Args...>
    UniqueFunction(F&& f) : impl_(std::make_unique<Model<std::decay_t<F>>>(std::forward<F>(f))) {}

    UniqueFunction(UniqueFunction&&) noexcept = default;            // move-only (unique_ptr member)
    UniqueFunction& operator=(UniqueFunction&&) noexcept = default;

    R operator()(Args... args) {
        if (!impl_) throw std::bad_function_call();
        return impl_->call(std::forward<Args>(args)...);
    }
    explicit operator bool() const noexcept { return static_cast<bool>(impl_); }
};

int twice(int x) { return 2 * x; }

int main() {
    UniqueFunction<int(int)> f = [p = std::make_unique<int>(10)](int x) { return *p + x; };
    std::cout << f(5) << '\n';                           // 15
    auto g = std::move(f);                               // ownership moves
    std::cout << g(1) << ' ' << static_cast<bool>(f) << '\n';   // 11 0
    static_assert(!std::is_copy_constructible_v<UniqueFunction<int(int)>>);
    static_assert(!std::is_copy_assignable_v<UniqueFunction<int(int)>>);

    std::vector<UniqueFunction<void(std::string&&)>> handlers;   // forwarding of rvalue args
    std::vector<std::string> sink;
    handlers.emplace_back([&sink](std::string&& s) { sink.push_back(std::move(s)); });
    handlers[0](std::string(50, 'x'));                   // moved all the way into sink
    std::cout << sink[0].size() << '\n';                 // 50

    UniqueFunction<int(int)> empty;
    std::cout << static_cast<bool>(empty) << ' ';
    try { empty(1); } catch (const std::bad_function_call&) { std::cout << "empty\n"; }   // 0 empty
    UniqueFunction<int(int)> fp = twice;                 // plain function
    std::cout << fp(21) << '\n';                         // 42
    UniqueFunction<int()> counter = [n = 0]() mutable { return ++n; };   // state lives inside
    int a1 = counter(), a2 = counter(), a3 = counter();
    std::cout << a1 << ' ' << a2 << ' ' << a3 << '\n';   // 1 2 3
    UniqueFunction<void(int&)> inc = [](int& x) { ++x; };   // lvalue reference forwarded
    int v = 1;
    inc(v);
    std::cout << v << '\n';                              // 2
    UniqueFunction<double(int)> half = [](int x) { return x / 2.0; };
    std::cout << half(5) << '\n';                        // 2.5
    UniqueFunction<int(int)> h;
    h = std::move(g);                                    // move assignment
    std::cout << h(0) << ' ' << static_cast<bool>(g) << '\n';   // 10 0
}`,
      complexity: `<p>Construction: one heap allocation (add a small-buffer optimisation to avoid it for small callables). Call: one virtual dispatch + forwarding, O(1).</p>`,
      followUps: ['Add small-buffer optimisation so lambdas up to 3 pointers do not allocate.', 'Replace the vtable with a hand-rolled table of function pointers — why do libraries do that?', 'Compare with C++23 <code>std::move_only_function</code> and C++26 <code>std::function_ref</code>.']
    }
  });

  practice.push({
    title: 'switch on Strings via constexpr Hashing', level: 'Hard', tags: ['constexpr', 'consteval', 'user-defined literals', 'hashing'], companies: ['Epic Games', 'Optiver', 'IMC'],
    statement: `<p>C++ cannot <code>switch</code> on <code>std::string</code>. Build a <code>constexpr</code> FNV-1a hash and a <code>consteval</code> user-defined literal <code>"start"_h</code>, so that command dispatch can be written as <code>switch (fnv1a(cmd)) { case "start"_h: ... }</code>. Guard against hash collisions and prove at compile time that the case labels are distinct.</p>`,
    constraints: `Commands: start, stop, pause, resume, status. Input commands are runtime strings up to 32 chars. Unknown commands must return 0, even if they collide with a known hash.`,
    example: `<p><code>dispatch("pause")</code> → ${H.c('g', '3')}; <code>dispatch("jump")</code> → ${H.c('y', '0')}. The case labels are integer constants computed by the compiler; a runtime call hashes the input once (O(length)) and jumps.</p>`,
    brute: { why: `<p>An if/else chain of string comparisons does up to k comparisons of O(length) each for k commands, and grows linearly as commands are added. A <code>std::unordered_map&lt;std::string, int&gt;</code> works but is built at runtime (allocation at startup) and still needs a hash per call.</p>`, code: R`#include <string_view>
int dispatchSlow(std::string_view c) {
    if (c == "start") return 1;
    else if (c == "stop") return 2;
    else if (c == "pause") return 3;
    else if (c == "resume") return 4;
    else if (c == "status") return 5;
    return 0;
}
int main() { return dispatchSlow("pause") == 3 ? 0 : 1; }` },
    mcq: { q: 'Why make the literal operator <code>consteval</code> instead of <code>constexpr</code>?', options: ['consteval is faster at runtime', 'It guarantees "x"_h is always computed at compile time, so it can never accidentally hash at runtime', 'constexpr cannot be used in case labels', 'consteval allows recursion'], answer: 1, explain: 'case labels need constants anyway, but consteval also stops anyone from using _h on a runtime path, keeping hashing cost and semantics predictable.' },
    hints: [`<p>Hint 1: FNV-1a 64-bit: start with 14695981039346656037, for each byte: <code>h ^= byte; h *= 1099511628211;</code> (unsigned arithmetic wraps, so it is fine in constexpr).</p>`, `<p>Hint 2: Literal operator: <code>consteval std::uint64_t operator""_h(const char* s, std::size_t n) { return fnv1a({s, n}); }</code>. Duplicate case values are already a compile error — that is your distinctness proof for free.</p>`, `<p>Hint 3: Collisions: after jumping to a case, confirm with <code>cmd == "start"</code> before acting, otherwise return 0. Add a <code>static_assert</code> that all 5 hashes differ if you also store them in an array.</p>`],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"3 0 5\n1 2 3 4 5\n0 0 0 0 0\naf63dc4c8601ec8c"}]},
    solution: {
      approach: `<p>Hash at compile time for labels, at runtime for input; switch jumps directly. A string equality check inside each case makes collisions harmless. Duplicate labels would fail to compile, so distinct commands are verified by the compiler.</p>`,
      code: R`#include <array>
#include <cstddef>
#include <cstdint>
#include <iostream>
#include <string_view>

constexpr std::uint64_t fnv1a(std::string_view s) {
    std::uint64_t h = 14695981039346656037ULL;
    for (char c : s) {
        h ^= static_cast<unsigned char>(c);
        h *= 1099511628211ULL;                 // unsigned overflow wraps: allowed in constexpr
    }
    return h;
}

consteval std::uint64_t operator""_h(const char* s, std::size_t n) { return fnv1a({s, n}); }

constexpr std::array<std::uint64_t, 5> HASHES{"start"_h, "stop"_h, "pause"_h, "resume"_h, "status"_h};
constexpr bool allDistinct() {
    for (std::size_t i = 0; i < HASHES.size(); ++i)
        for (std::size_t j = i + 1; j < HASHES.size(); ++j)
            if (HASHES[i] == HASHES[j]) return false;
    return true;
}
static_assert(allDistinct());

int dispatch(std::string_view cmd) {
    switch (fnv1a(cmd)) {                       // one O(len) hash at runtime
        case "start"_h:  return cmd == "start"  ? 1 : 0;   // equality check defeats collisions
        case "stop"_h:   return cmd == "stop"   ? 2 : 0;
        case "pause"_h:  return cmd == "pause"  ? 3 : 0;
        case "resume"_h: return cmd == "resume" ? 4 : 0;
        case "status"_h: return cmd == "status" ? 5 : 0;
        default:         return 0;
    }
}

static_assert(fnv1a("") == 14695981039346656037ULL);
static_assert(fnv1a("a") == 0xaf63dc4c8601ec8cULL);        // published FNV-1a 64-bit test vectors
static_assert(fnv1a("foobar") == 0x85944171f73967e8ULL);
static_assert("start"_h == fnv1a("start"));

int main() {
    std::cout << dispatch("pause") << ' ' << dispatch("jump") << ' ' << dispatch("status") << '\n';   // 3 0 5
    std::cout << dispatch("start") << ' ' << dispatch("stop") << ' ' << dispatch("pause") << ' '
              << dispatch("resume") << ' ' << dispatch("status") << '\n';                            // 1 2 3 4 5
    std::cout << dispatch("") << ' ' << dispatch("Start") << ' ' << dispatch("stoppp") << ' '
              << dispatch("status ") << ' ' << dispatch(std::string(32, 'z')) << '\n';               // 0 0 0 0 0
    std::cout << std::hex << fnv1a("a") << '\n';                                                     // af63dc4c8601ec8c
}`,
      complexity: `<p>Runtime: O(L) to hash the input + O(1) jump + one O(L) confirmation compare. Compile time: hashing the labels. No allocations, no startup cost.</p>`,
      followUps: ['Why is a hash-switch not a perfect hash? How would you generate a collision-free perfect hash at compile time?', 'Compare with a <code>constexpr</code> sorted <code>std::array</code> of pairs + binary search.']
    }
  });

  practice.push({
    title: 'Write Your Own Lazy View: StepView', level: 'Hard', tags: ['ranges', 'views', 'iterators', 'concepts'], companies: ['Google', 'NVIDIA', 'Bloomberg'],
    statement: `<p>Implement <code>StepView{start, step}</code>: an <b>infinite, lazy</b> range producing start, start+step, start+2·step, ... It must satisfy <code>std::ranges::view</code> and <code>std::ranges::forward_range</code> so it composes with standard adaptors: <code>StepView{3, 4} | std::views::filter(odd) | std::views::take(3)</code>.</p>`,
    constraints: `C++20. No allocation. Values are <code>long long</code>. Verify concepts with <code>static_assert</code>.`,
    example: `<p><code>StepView{3, 4} | std::views::take(5)</code> → ${H.c('g', '3 7 11 15 19')}. With <code>filter(x % 3 == 0)</code> then <code>take(2)</code> → ${H.c('g', '3 15')}. Only the elements actually requested are ever computed.</p>`,
    brute: { why: `<p>Eagerly generating a <code>std::vector</code> of "enough" values forces you to guess a size: too small gives wrong answers, too big wastes time and memory, and infinite sequences are impossible.</p>`, code: R`#include <vector>
std::vector<long long> stepsEager(long long start, long long step, int count) {
    std::vector<long long> v;
    v.reserve(count);
    for (int i = 0; i < count; ++i) v.push_back(start + i * step);   // must guess count up front
    return v;
}
int main() { return stepsEager(3, 4, 5)[4] == 19 ? 0 : 1; }` },
    mcq: { q: 'What does <code>end()</code> return for an infinite view?', options: ['A past-the-end iterator computed from a huge count', '<code>std::unreachable_sentinel</code>, which never compares equal to any iterator', 'nullptr', 'begin()'], answer: 1, explain: 'Ranges allow end() to be a different type (a sentinel). unreachable_sentinel_t compares unequal to every iterator, so the loop never ends by itself — take() or a break must stop it.' },
    hints: [`<p>Hint 1: Derive from <code>std::ranges::view_interface&lt;StepView&gt;</code> (gives empty(), front(), operator bool for free) and make the view default-constructible and cheap to copy.</p>`, `<p>Hint 2: The iterator needs: <code>value_type</code>, <code>difference_type</code>, <code>iterator_concept = std::forward_iterator_tag</code>, <code>operator*</code>, pre/post <code>++</code>, defaulted <code>operator==</code>, and default construction.</p>`, `<p>Hint 3: <code>begin()</code> returns an iterator at start; <code>end()</code> returns <code>std::unreachable_sentinel</code>. Check with <code>static_assert(std::ranges::view&lt;StepView&gt; &amp;&amp; std::ranges::forward_range&lt;StepView&gt;)</code>.</p>`],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"3 7 11 15 19\n3 15\n10 7 4 1\n5 5 5\n-2 0 2 4\n4000000000 5000000000 6000000000\n1 4 9 16 25\n3 1\n499999500000"}]},
    solution: {
      approach: `<p>A tiny value-type view storing (start, step). Its forward iterator computes the next value on <code>++</code>; the sentinel is unreachable, making the range infinite. Because it models <code>view</code>, the standard pipe adaptors accept it and stay lazy.</p>`,
      code: R`#include <vector>
#include <algorithm>
#include <cstddef>
#include <iostream>
#include <iterator>
#include <ranges>

class StepView : public std::ranges::view_interface<StepView> {
    long long start_ = 0, step_ = 1;
public:
    struct iterator {
        using value_type = long long;
        using difference_type = std::ptrdiff_t;
        using iterator_concept = std::forward_iterator_tag;
        long long cur = 0, step = 1;
        long long operator*() const { return cur; }
        iterator& operator++() { cur += step; return *this; }
        iterator operator++(int) { iterator t = *this; ++*this; return t; }
        bool operator==(const iterator&) const = default;
    };
    StepView() = default;
    StepView(long long start, long long step) : start_(start), step_(step) {}
    iterator begin() const { return iterator{start_, step_}; }
    std::unreachable_sentinel_t end() const { return std::unreachable_sentinel; }
};

static_assert(std::forward_iterator<StepView::iterator>);
static_assert(std::ranges::view<StepView>);
static_assert(std::ranges::forward_range<StepView>);

int main() {
    for (long long x : StepView{3, 4} | std::views::take(5)) std::cout << x << ' ';   // 3 7 11 15 19
    std::cout << '\n';
    auto pipeline = StepView{3, 4}
        | std::views::filter([](long long x) { return x % 3 == 0; })
        | std::views::take(2);
    for (long long x : pipeline) std::cout << x << ' ';                                 // 3 15
    std::cout << '\n';
    for (long long x : StepView{10, -3} | std::views::take(4)) std::cout << x << ' ';   // 10 7 4 1
    std::cout << '\n';
    for (long long x : StepView{5, 0} | std::views::take(3)) std::cout << x << ' ';     // 5 5 5
    std::cout << '\n';
    for (long long x : StepView{-2, 2} | std::views::take(4)) std::cout << x << ' ';    // -2 0 2 4
    std::cout << '\n';
    for (long long x : StepView{4000000000LL, 1000000000LL} | std::views::take(3)) std::cout << x << ' ';
    std::cout << '\n';                                                                  // 4000000000 5000000000 6000000000
    for (long long x : StepView{1, 1} | std::views::transform([](long long v) { return v * v; }) | std::views::take(5))
        std::cout << x << ' ';                                                          // 1 4 9 16 25
    std::cout << '\n';
    std::vector<long long> expect{0, 1, 2, 3, 4};
    std::cout << StepView{3, 4}.front() << ' ' << std::ranges::equal(StepView{0, 1} | std::views::take(5), expect) << '\n';   // 3 1
    long long sum = 0;
    for (long long x : StepView{0, 1} | std::views::take(1000000)) sum += x;
    std::cout << sum << '\n';                                                           // 499999500000
}`,
      complexity: `<p>O(1) per produced element; O(1) memory. The view itself is two long longs and copies in O(1).</p>`,
      followUps: ['Make it a <code>random_access_range</code> (add +=, -, [] and ordering).', 'Add a <code>step_by(n)</code> range adaptor closure so you can write <code>v | step_by(2)</code>.', 'Make it bounded with an end value and a real sentinel type.']
    }
  });
  /* ======================================================================
     QUIZ
     ====================================================================== */
  quiz.push({ q: 'Given <code>int&amp;&amp; r = 5;</code>, what is the value category of the expression <code>r</code>?', options: ['prvalue', 'xvalue', 'lvalue', 'It depends on the compiler'], answer: 2, explain: 'r has a name, so the expression r is an lvalue — even though its declared type is int&amp;&amp;. To pass it on as an rvalue you must write std::move(r).' });
  quiz.push({ q: 'What does <code>std::move(x)</code> actually do at runtime?', options: ['Moves x\'s bytes to a new location', 'Calls the move constructor', 'Nothing: it is a cast to an rvalue reference; the move (if any) happens in the constructor/assignment that receives it', 'Sets x to a default value'], answer: 2, explain: 'std::move is static_cast&lt;remove_reference_t&lt;T&gt;&amp;&amp;&gt;(x). It only changes which overload is selected. Zero instructions are generated for the cast itself.' });
  quiz.push({ q: '<code>const std::string s = "big"; std::string t = std::move(s);</code> — copy or move?', options: ['Move', 'Copy', 'Compile error', 'Undefined behaviour'], answer: 1, explain: 'std::move(s) is const std::string&amp;&amp;, which cannot bind to the move constructor\'s std::string&amp;&amp; parameter. The copy constructor (const std::string&amp;) is chosen.' });
  quiz.push({ q: 'Why should a move constructor be marked <code>noexcept</code>?', options: ['It is required to compile', 'So std::vector uses it (instead of copying) when reallocating, preserving the strong exception guarantee', 'It makes the move faster at runtime', 'To allow constexpr'], answer: 1, explain: 'vector relocates with std::move_if_noexcept. If the move constructor might throw and the type is copyable, vector copies to keep its strong guarantee.' });
  quiz.push({ q: 'In <code>template&lt;class T&gt; void f(T&amp;&amp; x)</code>, calling <code>f(n)</code> with an <code>int n</code> deduces T as…', options: ['<code>int</code>', '<code>int&amp;</code>', '<code>int&amp;&amp;</code>', '<code>const int&amp;</code>'], answer: 1, explain: 'For a forwarding reference, an lvalue argument deduces T = int&amp;. Then T&amp;&amp; = int&amp; &amp;&amp; collapses to int&amp;.' });
  quiz.push({ q: 'Which of these is NOT a forwarding reference?', options: ['<code>template&lt;class T&gt; void f(T&amp;&amp;)</code>', '<code>auto&amp;&amp; x = expr;</code>', '<code>void vector&lt;T&gt;::push_back(T&amp;&amp;)</code>', '<code>[](auto&amp;&amp; a) {}</code>'], answer: 2, explain: 'In push_back, T is the class template parameter, already fixed when the member is called — no deduction happens, so T&amp;&amp; is a plain rvalue reference.' });
  quiz.push({ q: '<code>int x = 1; auto f = [x]() mutable { return ++x; }; f(); f();</code> What is the outer <code>x</code> afterwards?', options: ['1', '2', '3', 'Undefined'], answer: 0, explain: 'mutable lets the closure modify its own copy. The outer x is untouched: it is still 1 (f returned 2, then 3).' });
  quiz.push({ q: 'Inside a member function, what does <code>[=]</code> capture for a member <code>name</code> (pre-C++20 behaviour)?', options: ['A copy of name', 'A reference to name', 'The this pointer, so name is accessed through it', 'Nothing — it is an error'], answer: 2, explain: '[=] implicitly captures this (by value — i.e. the pointer). Members are accessed via this-&gt;name, so a stored callback can dangle if the object dies. C++20 deprecates this implicit capture.' });
  quiz.push({ q: 'What is the deduced type of <code>a</code> in <code>const int ci = 5; auto a = ci;</code>?', options: ['<code>const int</code>', '<code>int</code>', '<code>const int&amp;</code>', '<code>int&amp;</code>'], answer: 1, explain: 'Plain auto behaves like by-value template deduction: top-level const (and references) are dropped.' });
  quiz.push({ q: 'Given <code>int x;</code>, what are <code>decltype(x)</code> and <code>decltype((x))</code>?', options: ['int and int', 'int and int&amp;', 'int&amp; and int', 'int&amp; and int&amp;'], answer: 1, explain: 'decltype on an unparenthesised name gives the declared type (int). With extra parentheses it is an lvalue expression, so decltype yields int&amp;.' });
  quiz.push({ q: 'A <code>constexpr</code> function called with a value read from <code>std::cin</code>…', options: ['fails to compile', 'runs at runtime like a normal function', 'is evaluated at compile time anyway', 'throws an exception'], answer: 1, explain: 'constexpr means "may be evaluated at compile time". With runtime arguments it simply runs at runtime. consteval would make that call a compile error.' });
  quiz.push({ q: 'Which C++20 keyword guarantees a global is initialised at compile time but leaves it mutable?', options: ['<code>constexpr</code>', '<code>consteval</code>', '<code>constinit</code>', '<code>static const</code>'], answer: 2, explain: 'constinit requires constant initialisation (avoiding the static initialisation order fiasco) without making the variable const.' });
  quiz.push({ q: 'What happens with <code>std::get&lt;int&gt;(v)</code> when <code>v</code> (a <code>variant&lt;int, std::string&gt;</code>) currently holds a string?', options: ['Returns 0', 'Undefined behaviour', 'Throws std::bad_variant_access', 'Converts the string to int'], answer: 2, explain: 'std::get checks the active index and throws bad_variant_access on mismatch. std::get_if returns nullptr instead; std::visit avoids the question entirely.' });
  quiz.push({ q: 'How many elements does <code>nums | views::filter(even) | views::transform(sq) | views::take(2)</code> read from <code>nums = {2, 4, 6, 8}</code> when fully iterated?', options: ['4', '2', '3', '0'], answer: 2, explain: 'Views are lazy: 2 and 4 pass the filter and are squared. But after the 2nd body the loop runs ++it, and take\'s counted_iterator increments the filter iterator first, so filter reads 6 (looking for the next match) before the count hits 0. transform runs only twice; 8 is never read. (This overshoot of take after filter is a known quirk of the C++20 views.)' });
  /* ======================================================================
     INTERVIEW Q&A
     ====================================================================== */
  interview.push({ q: 'Explain lvalues, rvalues, prvalues and xvalues in plain words.', level: 'I', a: `<p>Every expression has a value category. An <b>lvalue</b> has identity — a name or an address you can come back to (<code>x</code>, <code>a[i]</code>, <code>*p</code>). A <b>prvalue</b> is a pure temporary value with no identity (<code>42</code>, <code>x + 1</code>, <code>f()</code> returning by value). An <b>xvalue</b> has identity but is marked as expiring, so it may be moved from (<code>std::move(x)</code>, <code>static_cast&lt;T&amp;&amp;&gt;(x)</code>, a member of a temporary). <b>rvalue</b> = prvalue ∪ xvalue (movable); <b>glvalue</b> = lvalue ∪ xvalue (has identity). Overload resolution uses this: <code>T&amp;&amp;</code> parameters only bind rvalues, which is what enables move semantics.</p>`, followUps: ['Is a string literal an lvalue or prvalue? (lvalue)', 'What category is <code>f().member</code> when f returns by value? (xvalue)', 'How can you check a category at compile time? (<code>decltype((e))</code>)'] });
  interview.push({ q: 'What does std::move do, and what does it NOT do?', level: 'B', a: `<p><code>std::move</code> is an unconditional cast to an rvalue reference: <code>static_cast&lt;std::remove_reference_t&lt;T&gt;&amp;&amp;&gt;(x)</code>. It generates no code. It only changes overload resolution so a move constructor/assignment can be selected. It does <b>not</b> move anything, does not empty the object, and does nothing useful on <code>const</code> objects (the copy constructor is picked). The actual transfer happens inside whatever receives the xvalue. After a real move, the source is in a valid but unspecified state: you may destroy it or assign to it.</p>`, followUps: ['Why is <code>return std::move(local);</code> usually wrong?', 'What does clang-tidy <code>bugprone-use-after-move</code> detect?'] });
  interview.push({ q: 'Write a move constructor and move assignment for a class that owns a raw buffer. What must you be careful about?', level: 'I', a: `<p><code>Buf(Buf&amp;&amp; o) noexcept : p_(std::exchange(o.p_, nullptr)), n_(std::exchange(o.n_, 0)) {}</code> and <code>Buf&amp; operator=(Buf&amp;&amp; o) noexcept { if (this != &amp;o) { delete[] p_; p_ = std::exchange(o.p_, nullptr); n_ = std::exchange(o.n_, 0); } return *this; }</code>. Care points: (1) <b>null the source</b> or both destructors free the buffer; (2) mark them <b>noexcept</b> so <code>std::vector</code> uses them; (3) handle <b>self-move</b>; (4) free the old resource in assignment to avoid a leak; (5) remember named rvalue references are lvalues — move members with <code>std::move</code>; (6) prefer Rule of 0 with <code>unique_ptr</code>/<code>vector</code> members when possible.</p>`, followUps: ['Implement copy assignment with copy-and-swap.', 'What implicit members does declaring a destructor suppress?'] });
  interview.push({ q: 'What is the Rule of 0 / 3 / 5 and how does it relate to move semantics?', level: 'I', a: `<p><b>Rule of 3</b> (C++98): if you need a custom destructor, copy constructor or copy assignment, you probably need all three, because you are managing a resource. <b>Rule of 5</b> (C++11): add move constructor and move assignment, because declaring any of the three suppresses the implicit moves (they fall back to copies — a silent performance bug), and declaring a move op deletes implicit copies. <b>Rule of 0</b>: design classes so they need none of them — hold resources in RAII members (<code>std::string</code>, <code>std::vector</code>, <code>std::unique_ptr</code>), and the compiler-generated members are correct, efficient and <code>noexcept</code> where possible.</p>`, followUps: ['Does <code>~T() = default;</code> suppress implicit moves? (yes — it is user-declared)', 'How do you make a class move-only?'] });
  interview.push({ q: 'Why does std::vector sometimes copy instead of move when it grows?', level: 'A', a: `<p><code>push_back</code> provides the <b>strong exception guarantee</b>: if it throws, the vector is unchanged. During reallocation it must transfer existing elements to the new buffer. If moving element k throws, elements 0..k-1 are already gutted and the original cannot be restored. So vector uses <code>std::move_if_noexcept</code>: it moves only if the move constructor is <code>noexcept</code> (or the type is not copyable, in which case it moves and gives only the basic guarantee). A move constructor without <code>noexcept</code> on a copyable type therefore leads to copies — often a large hidden cost. Check with <code>static_assert(std::is_nothrow_move_constructible_v&lt;T&gt;)</code>.</p>`, followUps: ['What about std::deque or node-based containers?', 'What is "trivially relocatable" (P1144/P2786) about?'] });
  interview.push({ q: 'What is perfect forwarding? Implement make_unique.', level: 'A', a: `<p>Perfect forwarding passes arguments through a wrapper while preserving their value category (and constness), so temporaries are moved and lvalues are copied by the final callee. It needs a <b>forwarding reference</b> parameter (<code>T&amp;&amp;</code> with deduced T, which records lvalue-ness in T via reference collapsing) and <code>std::forward&lt;T&gt;</code>, a conditional cast to rvalue. <code>template&lt;class T, class... Args&gt; std::unique_ptr&lt;T&gt; make_unique(Args&amp;&amp;... args) { return std::unique_ptr&lt;T&gt;(new T(std::forward&lt;Args&gt;(args)...)); }</code>. Without forward, every argument would arrive as an lvalue and be copied (and move-only arguments would not compile).</p>`, followUps: ['List the four reference collapsing rules.', 'Name cases where perfect forwarding fails (braced lists, 0 as null, overloaded names, bit-fields).', 'Why can a forwarding constructor hijack the copy constructor?'] });
  interview.push({ q: 'What is the difference between std::move and std::forward?', level: 'I', a: `<p><code>std::move(x)</code> always casts to an rvalue — use it when <i>you</i> know you are done with x. <code>std::forward&lt;T&gt;(x)</code> casts to an rvalue <b>only if</b> T indicates the original argument was an rvalue (T is a non-reference type); if T is an lvalue reference it returns an lvalue. It is used only with forwarding references inside templates, and needs the explicit template argument because it is a non-deduced context. Using <code>std::move</code> on a forwarding reference is a bug: it steals from callers' lvalues. Using <code>std::forward</code> on a non-forwarding parameter is merely confusing.</p>`, followUps: ['Why is it a bug to forward the same argument twice?', 'What does <code>std::forward_like</code> (C++23) do?'] });
  interview.push({ q: 'How are lambdas implemented, and what is the difference between [=], [&amp;], [x], [&amp;x], [this] and [*this]?', level: 'I', a: `<p>A lambda creates an object of a unique closure class; captured variables become data members and the body becomes a <code>const operator()</code> (unless <code>mutable</code>). <code>[x]</code> copies x at creation; <code>[&amp;x]</code> stores a reference; <code>[=]</code>/<code>[&amp;]</code> capture whatever is used by copy/reference. <code>[this]</code> copies only the this pointer, so members are accessed through it — dangerous if the lambda outlives the object; <code>[=]</code> used to capture this implicitly (deprecated in C++20). <code>[*this]</code> (C++17) copies the whole object. Init-captures <code>[p = std::move(p)]</code> create new members, e.g. to move in a unique_ptr.</p>`, followUps: ['Why is <code>mutable</code> needed to modify a by-value capture?', 'When can a lambda convert to a function pointer? (no captures)', 'Cost of std::function vs auto for storing lambdas?'] });
  interview.push({ q: 'Describe a real lambda-capture bug you could hit in async code and how to fix it.', level: 'A', a: `<p>Typical bug: an object posts <code>[this] { onDone(); }</code> or <code>[&amp;] { use(buffer); }</code> to an event loop or thread pool, then is destroyed (or the function returns) before the callback runs → use-after-free that only shows up under load. Fixes: capture what you need <b>by value</b> or via init-capture (<code>[buf = std::move(buffer)]</code>); for objects, capture <code>shared_from_this()</code> to keep them alive, or <code>weak_from_this()</code> and <code>lock()</code> to skip work if they are gone; or cancel pending callbacks in the destructor. Verify with AddressSanitizer (<code>stack-use-after-return</code>, <code>heap-use-after-free</code>) and review every lambda that escapes its scope.</p>`, followUps: ['When does keep-alive capture create a reference cycle?', 'Is capturing a std::string_view by value safe?'] });
  interview.push({ q: 'auto vs decltype vs decltype(auto): what are the deduction rules?', level: 'I', a: `<p><code>auto</code> uses template-argument deduction as for a by-value parameter: drops references and top-level const, decays arrays/functions; <code>auto&amp;</code> keeps const; <code>auto&amp;&amp;</code> is a forwarding reference; <code>auto x = {1,2}</code> is an <code>initializer_list</code>. <code>decltype(name)</code> gives the declared type of an entity exactly; <code>decltype(expr)</code> gives T&amp; for lvalue expressions, T&amp;&amp; for xvalues, T for prvalues — so <code>decltype((x))</code> is <code>int&amp;</code>. <code>decltype(auto)</code> deduces from the initializer using decltype rules, preserving references — ideal for forwarding return types, but <code>return (local);</code> then returns a dangling reference.</p>`, followUps: ['What does <code>auto</code> deduce for <code>vector&lt;bool&gt;</code>\'s operator[]?', 'Where do you use trailing return types?'] });
  interview.push({ q: 'How do structured bindings work under the hood?', level: 'A', a: `<p><code>auto&amp; [a, b] = expr;</code> introduces one hidden variable <code>e</code> declared as <code>auto&amp; e = expr;</code>. The names a and b are not independent variables: for arrays they refer to <code>e[0]</code>, <code>e[1]</code>; for tuple-like types (with <code>std::tuple_size</code>, <code>tuple_element</code> and <code>get&lt;I&gt;</code>) they refer to the results of <code>get</code>; for aggregates they name the public data members in order. The cv/ref qualifiers apply to <code>e</code>, so <code>auto [a, b] = p;</code> copies the pair while <code>auto&amp;</code> aliases it. Restrictions: count must match; no nesting; until C++20 they could not be captured in lambdas; cannot be constexpr before C++26.</p>`, followUps: ['How do you enable structured bindings for a class with private members?', 'Why does <code>for (auto [k, v] : map)</code> copy each element?'] });
  interview.push({ q: 'constexpr vs consteval vs constinit vs const — when do you use each?', level: 'A', a: `<p><b>const</b>: the object will not be modified; its value may be known only at runtime. <b>constexpr variable</b>: must be initialised with a constant expression; usable in array bounds, template arguments, static_assert. <b>constexpr function</b>: can be evaluated at compile time when called in a constant context with constant inputs; otherwise a normal function. <b>consteval</b> (C++20): an immediate function — every call must be a constant expression (e.g. validating format strings, compile-time hashing). <b>constinit</b> (C++20): a static-storage variable must be constant-initialised, avoiding the static initialisation order fiasco, but stays mutable. Bonus: UB is forbidden in constant evaluation, so <code>static_assert</code> tests on constexpr functions catch overflow and out-of-bounds bugs at build time.</p>`, followUps: ['Can a constexpr function allocate memory in C++20?', 'What is <code>if consteval</code> / <code>std::is_constant_evaluated</code> for?'] });
  interview.push({ q: 'When would you use std::optional, std::variant, std::any — and what are their costs?', level: 'I', a: `<p><b>optional&lt;T&gt;</b>: a value that may be absent (lookup results, optional config). Stored inline: sizeof(T) plus a flag; no heap. <b>variant&lt;Ts...&gt;</b>: exactly one of a closed set of types — state machines, AST nodes, messages. Inline storage of the largest alternative plus an index; <code>std::visit</code> gives exhaustive O(1) dispatch, cache-friendly compared to heap-allocated polymorphic objects. <b>any</b>: one value of any copyable type, decided at runtime — type-erased, may heap-allocate, type checked via <code>any_cast</code> with exact type match. Prefer optional/variant; use any only for truly open-ended data (plugin properties). For error reporting, C++23 <code>std::expected&lt;T, E&gt;</code> is usually better than optional.</p>`, followUps: ['What is <code>valueless_by_exception</code>?', 'variant vs virtual inheritance: which dimension of change does each favour?'] });
  interview.push({ q: 'What are C++20 ranges and views, and what pitfalls do they have?', level: 'A', a: `<p>Ranges add (1) range algorithms (<code>std::ranges::sort(v, {}, &amp;T::key)</code>) constrained by concepts and supporting projections, and (2) <b>views</b>: lazy, non-owning, O(1)-copyable adaptors composed with <code>|</code> (filter, transform, take, drop, iota, reverse, keys, split, join). Elements flow through the pipeline one at a time only when iterated, so early termination (take, find) avoids work and intermediate containers. Pitfalls: views can <b>dangle</b> if they outlive the underlying container; they recompute work on every iteration; <code>filter_view</code> caches begin() so it is not const-iterable and modifying elements can break its invariants; take after filter evaluates the predicate one element too far; stateful lambdas in views are not allowed in principle; C++20 lacks <code>ranges::to</code> (C++23).</p>`, followUps: ['What is a sentinel and why do ranges allow end() to have a different type?', 'What does <code>std::ranges::dangling</code> protect against?'] });
  interview.push({ q: 'What is guaranteed copy elision (C++17) and how does it differ from NRVO?', level: 'E', a: `<p>Since C++17, a prvalue is not a temporary object but an initialisation recipe. When a prvalue of type T initialises an object of type T (<code>T x = T(args);</code>, <code>return T(args);</code>, passing by value), the object is constructed <b>directly</b> in its final location — no copy/move constructor is called or even required (works for non-movable types). This is <b>guaranteed</b>. <b>NRVO</b> — returning a named local (<code>T x; ...; return x;</code>) — is still only an optional optimisation; when it does not happen, the return is treated as an rvalue and moved (C++11), and C++20/23 widened that implicit move to more cases. <code>return std::move(x);</code> prevents NRVO.</p>`, followUps: ['When can the compiler not apply NRVO? (multiple different named returns, returning a parameter)', 'What is temporary materialisation?'] });
  registerModule({
    id: 'cpp10',
    title: 'Modern C++: Move Semantics to Ranges',
    intro: `<p>This is the module where C++ stops looking like "C with classes" and starts looking <b>modern</b>. You will learn why <code>std::move</code> does not move anything, how a class can hand over a megabyte buffer in three pointer writes, how library factories like <code>make_unique</code> and <code>emplace_back</code> pass arguments through without copying (perfect forwarding), how lambdas are really little objects (and how their captures cause real-world crashes), what <code>auto</code> and <code>decltype</code> actually deduce, how to push work into the compiler with <code>constexpr</code>, how to model "maybe" and "one of" with <code>optional</code>/<code>variant</code>, and how to write lazy data pipelines with C++20 <b>ranges</b>.</p>
      <p>Every topic starts with an everyday analogy, then a visualizer you can play with (classify expressions, watch a buffer pointer get stolen, follow an argument down a call stack, see captured variables go stale or dangle), then worked "copy or move?" puzzles, deep dives for senior interviews, and notes on using AI tools without inheriting their C++ bugs.</p>`,
    goals: [
      'Classify any expression as lvalue, prvalue or xvalue and predict which overload (copy or move) it selects',
      'Write correct, <code>noexcept</code> move constructors/assignments (Rule of 5) — and know when Rule of 0 makes them unnecessary',
      'Implement perfect-forwarding wrappers (<code>make_unique</code>, <code>emplace</code>) and explain reference collapsing',
      'Choose safe lambda captures for callbacks/threads and spot dangling-capture bugs in code review',
      'Predict <code>auto</code>/<code>decltype</code> deductions, use structured bindings, and move work to compile time with <code>constexpr</code>/<code>consteval</code>/<code>constinit</code>',
      'Model data with <code>optional</code>/<code>variant</code>/<code>any</code> and build lazy pipelines with C++20 ranges and views'
    ],
    prereqs: `C++ 5 (Rule of 3/5/0, operator overloading), C++ 6 (RAII & smart pointers), C++ 8 (STL algorithms & lambdas basics) and C++ 9 (Templates, SFINAE & Concepts).`,
    hours: 16,
    topics: topics, practice: practice, quiz: quiz, interview: interview
  });
})();
