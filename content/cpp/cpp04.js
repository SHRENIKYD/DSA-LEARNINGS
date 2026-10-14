(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var R = String.raw; // code snippets: keep C++ escapes like '\n' exactly as typed

  /* ================= TOPIC 1: classes, structs, access specifiers ================= */
  topics.push({
    title: 'Classes, Structs & Access Specifiers (Encapsulation)',
    analogy: `<p>A <b>class</b> is a <b>cookie cutter</b>; each <b>object</b> is a cookie you stamp out with it. Every cookie has the same shape (same members), but each one has its own sprinkles (its own data).</p>
      <p><b>Access specifiers</b> are like a <b>bank branch</b>: the <b>public</b> counter is where any customer can walk up and ask for a deposit; the <b>private</b> vault is staff-only, and nobody outside can touch the cash directly; the <b>protected</b> back office is open to staff <i>and</i> to staff from the "child" branches (derived classes). Customers never grab money from the vault — they ask the counter, and the counter checks the rules first.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> A class glues together <b>data</b> (member variables, also called fields) and the <b>functions that work on that data</b> (member functions, also called methods). You write the class once, then create as many <b>objects</b> (instances) as you like.</p>
      <p>Three access words decide <b>who may touch each member</b>:</p>
      ${H.table(['specifier', 'who can use it', 'think of it as'], [
        ['<code>public</code>', 'everyone', 'the shop counter'],
        ['<code>protected</code>', 'the class itself + classes derived from it', 'the staff back office'],
        ['<code>private</code>', 'only the class itself (and its friends)', 'the locked vault']
      ])}
      <p><b>struct vs class</b> — the ONLY language difference is the default: in a <code>struct</code> members (and base classes) are <code>public</code> unless you say otherwise; in a <code>class</code> they are <code>private</code>. Everything else (constructors, methods, inheritance) works identically. By convention, people use <code>struct</code> for "plain bag of data" (a <code>Point {x, y}</code>) and <code>class</code> when there are rules to protect.</p>
      <p><b>Encapsulation</b> = hide the data, expose safe operations. Why bother? Because a class usually has an <b>invariant</b> — a promise that must always be true, like "balance is never negative". If <code>balance</code> were public, any line in a 100,000-line program could break that promise. If it is private, only the class's own few functions can change it, so you check the rule in <b>one place</b>.</p>
      ${H.table(['line of code', 'compiles?', 'why'], [
        ['<code>acct.deposit(50);</code>', H.c('g', 'yes'), 'deposit is public'],
        ['<code>acct.balance = -999;</code>', H.c('r', 'NO'), 'balance is private → compile error'],
        ['<code>p.x = 3;</code> (p is a struct Point)', H.c('g', 'yes'), 'struct members default to public']
      ])}
      <p>Key facts to remember: access checks happen at <b>compile time</b> (zero runtime cost); access is per <b>class</b>, not per object (one Account's method may read another Account's private balance); and an object's size comes only from its <b>data</b> members (plus padding) — member functions are stored once in the program's code, not inside every object.</p>`,
    clues: [
      '"Design a class for …" / "model a bank account / parking lot / library" → private data + public methods + invariants',
      '"What is the difference between struct and class in C++?" → only default member access and default inheritance access',
      '"Why should data members be private?" → invariants, one place to validate, freedom to change representation later',
      '"What is sizeof(obj)?" → sum of data members + alignment padding; member functions and static members add nothing',
      '"Can a member function access private members of another object of the same class?" → yes, access is per-class',
      '"Encapsulation", "information hiding", "getter/setter" in the question'
    ],
    code: [R`#include <iostream>
#include <string>
using namespace std;

// struct: a plain bag of data. Members are PUBLIC by default.
struct Point {
    int x = 0;   // default member initializer: x starts at 0
    int y = 0;
};

// class: data with rules. Members are PRIVATE by default.
class BankAccount {
    // --- private section (default for class) ---
    string owner;
    long long balanceCents = 0;   // INVARIANT: never negative

public:
    // constructor: runs when the object is created (topic 2 covers this in depth)
    BankAccount(string name, long long openingCents) : owner(name) {
        if (openingCents > 0) balanceCents = openingCents;   // reject negative openings
    }

    // public operations are the ONLY way to change the balance
    bool deposit(long long cents) {
        if (cents <= 0) return false;      // reject nonsense
        balanceCents += cents;
        return true;
    }
    bool withdraw(long long cents) {
        if (cents <= 0 || cents > balanceCents) return false;   // protects the invariant
        balanceCents -= cents;
        return true;
    }
    // const member function: promises not to modify the object
    long long balance() const { return balanceCents; }
    const string& name() const { return owner; }

    // access is per CLASS: we may read other.balanceCents even though it is private
    bool richerThan(const BankAccount& other) const {
        return balanceCents > other.balanceCents;
    }
};

int main() {
    Point p{3, 4};                // aggregate initialization of a struct
    p.x = 10;                     // fine: public

    BankAccount a("Asha", 5000), b("Ben", 1200);
    a.deposit(2500);              // 7500
    bool ok = b.withdraw(9999);   // false: would break the invariant
    // a.balanceCents = -1;       // ERROR: 'balanceCents' is private within this context

    cout << p.x << ' ' << p.y << '\n';                        // 10 4
    cout << a.name() << ' ' << a.balance() << '\n';          // Asha 7500
    cout << boolalpha << ok << ' ' << a.richerThan(b) << '\n';  // false true
}`],
    codeTitle: ['struct for plain data, class for data + rules'],
    viz: {
      title: 'Object memory layout: offsets, alignment & padding',
      input: 'char int char double',
      inputLabel: 'Member types in declaration order (char bool short int float long double ptr)',
      gen: function (input) {
        var SZ = { char: 1, bool: 1, short: 2, int: 4, float: 4, long: 8, double: 8, ptr: 8 };
        var toks = String(input || '').trim().split(/[\s,]+/).filter(Boolean);
        if (!toks.length) throw new Error('Enter member types like: char int char double');
        if (toks.length > 10) throw new Error('Use at most 10 members');
        var mem = toks.map(function (t, i) {
          var k = /\*$/.test(t) ? 'ptr' : t.toLowerCase();
          if (!SZ[k]) throw new Error('Unknown type "' + t + '". Use: char bool short int float long double ptr');
          return { name: String.fromCharCode(97 + i), type: t, size: SZ[k] };
        });
        function layout(list) {
          var off = 0, maxA = 1, rows = [];
          list.forEach(function (m) { var pad = (m.size - off % m.size) % m.size; off += pad; rows.push({ m: m, off: off, pad: pad }); off += m.size; if (m.size > maxA) maxA = m.size; });
          var total = Math.ceil(off / maxA) * maxA;
          return { rows: rows, end: off, total: total, maxA: maxA };
        }
        var L = layout(mem);
        if (L.total > 64) throw new Error('Layout is over 64 bytes; use fewer/smaller members');
        function bytes(lay, upto, showTail) {
          var b = [], hl = {};
          var lim = upto < lay.rows.length ? lay.rows[upto].off + lay.rows[upto].m.size : lay.end;
          for (var i = 0; i < lim; i++) { b.push('pad'); hl[i] = 'bad'; }
          lay.rows.forEach(function (r, k) {
            if (k > upto) return;
            for (var j = 0; j < r.m.size; j++) { b[r.off + j] = r.m.name; hl[r.off + j] = k === upto ? 'ok' : 'done'; }
          });
          if (showTail) for (var t = lay.end; t < lay.total; t++) { b.push('pad'); hl[t] = 'bad'; }
          return { values: b, hl: hl };
        }
        function tableRows(lay, upto) {
          return lay.rows.filter(function (r, k) { return k <= upto; }).map(function (r) {
            return [r.m.type + ' ' + r.m.name, r.m.size, r.m.size, r.off, r.pad ? r.pad + ' byte(s) before' : '-'];
          });
        }
        var cols = ['member', 'size', 'align', 'offset', 'padding'];
        var frames = [];
        frames.push({ narr: 'Rule of the game: on a typical 64-bit machine every member must start at an offset that is a <b>multiple of its alignment</b> (here: alignment = size). Members are laid out <b>in declaration order</b>. Watch where the compiler is forced to insert invisible <span class="c-r">padding</span> bytes.', parts: [
          { type: 'table', label: 'struct S { ' + toks.join('; ') + '; }', columns: ['member', 'type', 'size (bytes)'], rows: mem.map(function (m) { return [m.name, m.type, m.size]; }) },
          { type: 'vars', label: 'cursor', vals: { offset: 0, 'sizeof so far': 0 } }
        ] });
        L.rows.forEach(function (r, k) {
          var by = bytes(L, k, false), hl = {}; hl[k] = 'cur';
          frames.push({ narr: 'Place <b>' + r.m.type + ' ' + r.m.name + '</b> (needs alignment ' + r.m.size + '). ' + (r.pad ? '<span class="c-r">Offset ' + (r.off - r.pad) + ' is not a multiple of ' + r.m.size + ', so ' + r.pad + ' padding byte(s) are inserted.</span> ' : 'The cursor is already aligned, no padding needed. ') + 'It lands at offset <b>' + r.off + '</b> and occupies ' + r.m.size + ' byte(s).', parts: [
            { type: 'table', label: 'layout so far', columns: cols, rows: tableRows(L, k), hl: hl },
            { type: 'array', label: 'bytes of one object', values: by.values, hl: by.hl, showIdx: true },
            { type: 'vars', label: 'cursor', vals: { offset: r.off + r.m.size, 'padding so far': L.rows.slice(0, k + 1).reduce(function (s, x) { return s + x.pad; }, 0) }, hl: { offset: 'ok' } }
          ] });
        });
        var full = bytes(L, L.rows.length, true), tail = L.total - L.end;
        frames.push({ narr: 'Tail step: the whole object size must be a multiple of the <b>largest</b> alignment (' + L.maxA + ') so that arrays of S keep every element aligned. ' + (tail ? '<span class="c-r">' + tail + ' tail padding byte(s)</span> added. ' : 'No tail padding needed. ') + '<b>sizeof(S) = ' + L.total + '</b> even though the data itself is only ' + mem.reduce(function (s, m) { return s + m.size; }, 0) + ' bytes.', parts: [
          { type: 'array', label: 'final object bytes', values: full.values, hl: full.hl, showIdx: true },
          { type: 'vars', label: 'result', vals: { 'data bytes': mem.reduce(function (s, m) { return s + m.size; }, 0), 'padding bytes': L.total - mem.reduce(function (s, m) { return s + m.size; }, 0), 'sizeof(S)': L.total }, hl: { 'sizeof(S)': 'sel' } }
        ] });
        var sorted = mem.slice().sort(function (a, b) { return b.size - a.size; });
        var L2 = layout(sorted), by2 = bytes(L2, L2.rows.length, true);
        frames.push({ narr: 'Pro trick: declare members from <b>largest to smallest</b> alignment. Same data, new order → <b>sizeof = ' + L2.total + '</b> (was ' + L.total + '). ' + (L2.total < L.total ? '<span class="c-g">Saved ' + (L.total - L2.total) + ' bytes per object</span> — a million objects saves ' + ((L.total - L2.total)) + ' MB.' : 'This order was already optimal.'), parts: [
          { type: 'table', label: 'reordered: ' + sorted.map(function (m) { return m.type; }).join(' '), columns: cols, rows: tableRows(L2, L2.rows.length) },
          { type: 'array', label: 'reordered bytes', values: by2.values, hl: by2.hl, showIdx: true }
        ] });
        frames.push({ narr: 'Remember: <b>member functions take zero bytes</b> inside the object (their machine code lives once in the program), and <b>static</b> members live outside every object. Only non-static data + padding count toward sizeof. (Virtual functions add a hidden pointer — that is next module.)', parts: [
          { type: 'table', label: 'what counts toward sizeof(obj)?', columns: ['thing', 'inside each object?'], rows: [['non-static data members', 'YES'], ['padding', 'YES'], ['member functions', 'no (code, stored once)'], ['static data members', 'no (one shared copy)'], ['access specifiers', 'no (compile-time only)']], hl: { 0: 'ok', 1: 'bad' } }
        ] });
        return frames;
      }
    },
    examples: [
      {
        title: 'struct vs class: only the default changes',
        html: `<p>These two types are <b>identical</b> in power. The only difference is what you get when you write nothing: <code>struct</code> → public, <code>class</code> → private. You can always override with an explicit label.</p>
          ${H.table(['', 'members default', 'base class default', 'typical use'], [['<code>struct</code>', 'public', 'public', 'plain data (Point, Config)'], ['<code>class</code>', 'private', 'private', 'types with invariants']])}`,
        code: R`struct S { int v = 1; };          // v is public
class  C { int v = 1; };          // v is private
class  D { public: int v = 1; };  // explicit label: now public

int main() {
    S s; s.v = 5;      // OK
    D d; d.v = 7;      // OK
    C c;               // c.v = 9; would be: error, 'int C::v' is private
    (void)c;
}`
      },
      {
        title: 'Access is per class, not per object',
        html: `<p>A common interview trap: "can <code>a</code> read <code>b</code>'s private field?" — inside a member function of the <b>same class</b>, yes. The compiler checks "which class's code is running", not "which object owns the field". This is exactly how comparisons and copy operations are written.</p>
          ${H.kv([['a.secret', 7], ['b.secret', 3]], { label: 'two Vault objects' })}<p><code>a.biggerThan(b)</code> → compares 7 vs 3 → ${H.c('g', 'true')}, legally.</p>`,
        code: R`class Vault {
    int secret;
public:
    explicit Vault(int s) : secret(s) {}
    bool biggerThan(const Vault& other) const {
        return secret > other.secret;   // other.secret is private, but we ARE class Vault
    }
};

int main() {
    Vault a(7), b(3);
    cout << boolalpha << a.biggerThan(b) << '\n';  // true
}`
      },
      {
        title: 'sizeof: data only, plus padding (and an empty class is 1 byte)',
        html: `<p>Predict each <code>sizeof</code> on a typical 64-bit Linux machine:</p>
          ${H.table(['type', 'sizeof', 'why'], [
            ['<code>struct A { char c; int i; char d; }</code>', '12', '1 + 3 pad + 4 + 1 + 3 tail pad'],
            ['<code>struct B { int i; char c; char d; }</code>', '8', '4 + 1 + 1 + 2 tail pad'],
            ['<code>struct E { }</code>', '1', 'every object needs a unique address'],
            ['<code>struct F { void hello(); }</code>', '1', 'functions are not stored in objects'],
            ['<code>struct G { static int n; int x; }</code>', '4', 'static member lives outside objects']
          ])}`,
        code: R`struct A { char c; int i; char d; };
struct B { int i; char c; char d; };
struct E { };
struct F { void hello() {} };
struct G { static int n; int x; };

static_assert(sizeof(E) == 1, "empty class still has size 1");
static_assert(sizeof(F) == 1, "member functions add no size");
static_assert(alignof(int) == 4, "typical platforms");

int main() {
    cout << sizeof(A) << ' ' << sizeof(B) << ' ' << sizeof(G) << '\n';  // 12 8 4
}`
      },
      {
        title: 'Aggregates and C++20 designated initializers',
        html: `<p>A struct with all-public data and no user-declared constructors is an <b>aggregate</b>: you can brace-initialize it member by member. C++20 lets you name the fields (they must appear in declaration order). Missing fields get their default member initializer (or zero).</p>
          ${H.kv([['host', '"db.local"'], ['port', 5432], ['retries', '3 (default)']], { label: 'cfg' })}`,
        code: R`struct Config {
    string host = "localhost";
    int port = 80;
    int retries = 3;
};

int main() {
    Config a{"api.local", 8080};                 // positional: retries stays 3
    Config b{.host = "db.local", .port = 5432};  // C++20 designated initializers
    cout << a.host << ':' << a.port << ' ' << b.host << ':' << b.port << ' ' << b.retries << '\n';
    // api.local:8080 db.local:5432 3
}`
      }
    ],
    deepDive: `<p>🟣 <b>Access control is a compile-time fence, not a security boundary.</b> Private members are still in memory; <code>reinterpret_cast</code> or <code>memcpy</code> can read them. Access specifiers protect you from <i>accidents</i>, not from attackers. They also never change the generated machine code.</p>
      <p><b>Layout rules.</b> Non-static data members get increasing addresses in declaration order (since C++23 this is guaranteed even across different access sections; before that, only within the same access section). The compiler inserts padding so each member meets its <code>alignof</code>, and rounds the total up to the largest alignment so arrays stay aligned. Reordering fields largest→smallest is the cheapest memory optimisation there is — on hot structs (millions of game entities, order-book entries) it can save 20–40% of RAM and improve cache hit rates. Verify with <code>static_assert(sizeof(T) == N)</code> so a future edit cannot silently grow it. <code>#pragma pack(1)</code> removes padding but causes slow or even faulting unaligned accesses on some CPUs — use only for wire formats, and prefer explicit serialization.</p>
      <p><b>Empty classes</b> have size 1 so two distinct objects never share an address. When used as a base class, the <b>empty base optimisation</b> lets that byte disappear; C++20's <code>[[no_unique_address]]</code> gives the same saving for members (this is how <code>std::unique_ptr</code> with a stateless deleter stays the size of one pointer).</p>
      <p><b>Header/source split.</b> In real projects the class definition goes in <code>account.h</code> and long member functions are defined in <code>account.cpp</code> as <code>bool BankAccount::deposit(long long c) { … }</code>. Functions defined <i>inside</i> the class body are implicitly <code>inline</code>, so they may appear in many translation units without ODR (one-definition rule) violations.</p>
      <p><b>Standard-layout and trivially copyable</b> types (no virtuals, same access for all data, etc.) can be <code>memcpy</code>'d and shared with C code; <code>offsetof</code> is only guaranteed for standard-layout types. Check with <code>std::is_standard_layout_v&lt;T&gt;</code> and <code>std::is_trivially_copyable_v&lt;T&gt;</code>.</p>
      <p><b>Design judgement.</b> Not every field needs a getter and setter — a class full of <code>getX/setX</code> pairs is just a struct with extra typing (an "anemic" class). Expose <b>behaviour</b> (<code>withdraw</code>), not raw data, and keep a plain <code>struct</code> when there is genuinely no invariant.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants generate class skeletons, getters/setters and constructors in seconds, so typing boilerplate is no longer the skill. The skill is <b>deciding what the invariants are</b> and which members must be private to protect them — AI happily makes everything public or adds a setter that bypasses validation.</p>
      <p><b>Use AI as a partner:</b> prompt <code>"List the invariants this BankAccount class must protect and point out any public member that can break them"</code>, or <code>"Reorder these fields to minimise padding and add static_asserts for sizeof"</code>. Then compile and check the numbers yourself — models often guess sizeof wrong on padding-heavy structs or assume Windows <code>long</code> = 4 vs Linux = 8.</p>
      <p><b>Where AI goes wrong:</b> anemic getter/setter pairs for every field, using <code>struct</code> with public fields for something with rules, forgetting <code>const</code> on read-only methods, and money stored in <code>double</code>. <b>What you must still own:</b> the interview explanation of <i>why</i> data is private, the struct vs class answer, and predicting sizeof with padding on a whiteboard.</p>`,
    problems: [{
      title: 'Design a Safe BankAccount (invariant: never negative)',
      level: 'Easy', tags: ['class design', 'encapsulation', 'invariants'], companies: ['Goldman Sachs', 'Amazon', 'Microsoft'],
      statement: `<p>Design a class <code>BankAccount</code> with an owner name and a balance (in integer cents). Support <code>deposit(amount)</code>, <code>withdraw(amount)</code> and <code>balance()</code>. Both operations must return <code>false</code> and change nothing if the amount is not positive or a withdrawal would make the balance negative. No code outside the class may be able to set the balance directly.</p>`,
      constraints: `0 ≤ amount ≤ 10<sup>12</sup> cents; up to 10<sup>5</sup> operations; use integer cents (never floating point for money).`,
      example: `<p>open with 1000 → deposit(500) ${H.c('g', 'true')} → withdraw(2000) ${H.c('r', 'false')} → withdraw(300) ${H.c('g', 'true')} → balance() = <b>1200</b>.</p><p>The 2000 withdrawal is rejected because 1500 − 2000 &lt; 0 would break the invariant.</p>`,
      brute: {
        why: `<p>The naive version is a <code>struct</code> with a public <code>balance</code> field. It "works" until any caller writes <code>acct.balance -= 5000;</code> and the account goes negative — the invariant can be broken from anywhere in the program, so bugs are impossible to localise.</p>`,
        code: R`struct NaiveAccount {
    string owner;
    long long balance;   // PUBLIC: anyone can write acct.balance = -1
};

int main() {
    NaiveAccount a{"Asha", 1000};
    a.balance -= 5000;   // compiles happily; invariant silently broken
    cout << a.balance << '\n';   // -4000
}`
      },
      mcq: { q: 'Where should the "balance never negative" check live?', options: ['Inside the class, in every member function that changes the balance', 'In every caller before they modify balance', 'In main() only', 'Nowhere — use unsigned so it cannot go negative'], answer: 0, explain: 'Private data + validating member functions = one place to enforce the rule. unsigned would silently wrap to a huge number instead of failing.' },
      hints: [
        `<p>Hint 1: the data must be <code>private</code>, so the only doors into it are your member functions — each door can check the rule.</p>`,
        `<p>Hint 2: return <code>bool</code> so callers know whether the operation happened; mark <code>balance()</code> as <code>const</code>.</p>`,
        `<p>Hint 3: edge cases — amount 0, negative amount, withdrawing exactly the whole balance (allowed), opening balance negative (clamp to 0 or reject in the constructor). Recipe: validate → mutate → return true.</p>`
      ],
      solution: {
        approach: `<p>Make <code>balanceCents</code> private, set it once in the constructor, and route every change through <code>deposit</code>/<code>withdraw</code>, which validate before mutating. Because no other code can touch the field, the invariant holds after every public call.</p>`,
        code: R`#include <iostream>
#include <string>
using namespace std;

class BankAccount {
    string owner_;
    long long balanceCents_ = 0;      // invariant: balanceCents_ >= 0
public:
    BankAccount(string owner, long long opening) : owner_(owner) {
        if (opening > 0) balanceCents_ = opening;  // never start negative
    }
    bool deposit(long long amt) {
        if (amt <= 0) return false;
        balanceCents_ += amt;
        return true;
    }
    bool withdraw(long long amt) {
        if (amt <= 0 || amt > balanceCents_) return false;  // would break invariant
        balanceCents_ -= amt;
        return true;
    }
    long long balance() const { return balanceCents_; }
    const string& owner() const { return owner_; }
};

int main() {
    BankAccount a("Asha", 1000);
    cout << boolalpha;
    cout << a.deposit(500) << ' ' << a.withdraw(2000) << ' ' << a.withdraw(300) << '\n'; // true false true
    cout << a.balance() << '\n';   // 1200
}`,
        dry: { head: ['call', 'check', 'result', 'balance'], rows: [
          ['BankAccount("Asha",1000)', 'opening > 0', 'set', '1000'],
          ['deposit(500)', '500 > 0', '<span class="c-g">true</span>', '1500'],
          ['withdraw(2000)', '2000 > 1500', '<span class="c-r">false</span>', '1500'],
          ['withdraw(300)', '300 ≤ 1500', '<span class="c-g">true</span>', '1200']
        ] },
        complexity: `<p>Every operation is O(1) time and the object is O(1) space (a string + one 8-byte integer).</p>`,
        followUps: ['Add a transfer(BankAccount&amp; to, amount) that is all-or-nothing.', 'Add an overdraft limit as a constructor parameter.', 'Make it thread-safe (mutex or atomic compare-exchange).']
      }
    }]
  });

  /* ================= TOPIC 2: constructors & destructors ================= */
  topics.push({
    title: 'Constructors & Destructors: Object Lifetime and Call Order',
    analogy: `<p>Think of a <b>hotel stay</b>. The moment you arrive, the <b>check-in desk</b> (the constructor) gets your room ready: makes the bed, hands you a key. When you leave, <b>housekeeping</b> (the destructor) automatically cleans up: takes the key back, empties the bin. You never have to call housekeeping yourself — leaving is enough.</p>
      <p>And objects in one block leave like <b>plates on a stack</b>: the last plate you put on is the first one you take off. Last constructed → first destroyed.</p>`,
    explain: `<p>🟢 <b>Constructor</b> = a special member function with the <b>same name as the class</b> and <b>no return type</b>. It runs automatically the instant an object is created and its job is to put the object into a valid state (establish the invariant).</p>
      <p><b>Destructor</b> = <code>~ClassName()</code>, no parameters, no return type, exactly one per class. It runs automatically when the object's lifetime ends and its job is to release whatever the object owns (memory, files, locks, sockets).</p>
      ${H.table(['kind', 'looks like', 'used when'], [
        ['default', '<code>Rect()</code>', '<code>Rect r;</code>'],
        ['parameterized', '<code>Rect(int w, int h)</code>', '<code>Rect r(3, 4);</code> or <code>Rect r{3, 4};</code>'],
        ['delegating (C++11)', '<code>Rect() : Rect(1, 1) {}</code>', 'reuse another constructor'],
        ['copy (next module)', '<code>Rect(const Rect&amp; o)</code>', '<code>Rect b = a;</code>'],
        ['destructor', '<code>~Rect()</code>', 'automatically at end of lifetime']
      ])}
      <p><b>When does the destructor run?</b></p>
      ${H.table(['object lives in…', 'constructed', 'destroyed'], [
        ['local variable (stack)', 'when execution reaches its declaration', 'at the closing <code>}</code> of its block'],
        ['heap via <code>new</code>', 'at <code>new</code>', 'ONLY at <code>delete</code> (forget it → leak, destructor never runs)'],
        ['global / namespace scope', 'before <code>main</code> starts', 'after <code>main</code> returns'],
        ['<code>static</code> local', 'the first time execution passes it', 'after <code>main</code> returns'],
        ['temporary <code>T("x")</code>', 'in the expression', 'at the end of the full expression (the <code>;</code>)']
      ])}
      <p><b>The golden rule of order:</b> objects in the same scope are destroyed in the <b>reverse order</b> of construction (LIFO). Same for array elements (index 0 built first, destroyed last) and static/global objects.</p>
      <p>Two gotchas: (1) once you declare <i>any</i> constructor, the compiler stops generating the default one — write <code>Rect() = default;</code> if you still want it; (2) mark single-argument constructors <code>explicit</code> so <code>Rect r = 5;</code> or passing <code>5</code> to a function taking <code>Rect</code> does not silently create objects.</p>`,
    clues: [
      '"Predict the output" + classes that print in constructor/destructor → reverse-order (LIFO) destruction',
      '"When is the destructor called?" → end of scope, delete, end of program, end of full expression for temporaries',
      '"What happens if you forget delete?" → destructor never runs → memory/resource leak',
      '"Why can\'t my class be default-constructed any more?" → you declared another constructor; add = default',
      '"Implicit conversion surprised me" / "single-argument constructor" → explicit',
      '"RAII", "cleanup is automatic", "file/lock closed at end of scope" → destructor-based cleanup'
    ],
    code: [R`#include <iostream>
#include <string>
using namespace std;

// A "tracer" prints when it is born and when it dies: the #1 tool for learning lifetimes.
struct Tracer {
    string name;
    Tracer(string n) : name(n) { cout << "ctor " << name << '\n'; }
    ~Tracer()                  { cout << "dtor " << name << '\n'; }
};

class Rect {
    int w, h;
public:
    Rect() : Rect(1, 1) {}                     // default ctor DELEGATES to the 2-arg one
    explicit Rect(int side) : Rect(side, side) {}  // explicit: no silent int -> Rect
    Rect(int w_, int h_) : w(w_), h(h_) {}
    int area() const { return w * h; }
};

Tracer global("global");          // constructed BEFORE main runs

int main() {
    cout << "main starts\n";
    Tracer a("a");
    {
        Tracer b("b");             // inner scope
        Tracer c("c");
    }                              // c then b destroyed here (reverse order)
    Tracer* heap = new Tracer("heap");
    Tracer("temp");                // temporary: dies at the end of this statement
    delete heap;                   // heap's destructor runs NOW, not at end of scope

    Rect r1, r2(3), r3(2, 5);
    cout << r1.area() << ' ' << r2.area() << ' ' << r3.area() << '\n';   // 1 9 10
    // Rect bad = 4;               // ERROR: constructor is explicit
    cout << "main ends\n";
}                                  // a destroyed, then (after main) global
/* Output:
ctor global
main starts
ctor a
ctor b
ctor c
dtor c
dtor b
ctor heap
ctor temp
dtor temp
dtor heap
1 9 10
main ends
dtor a
dtor global
*/`],
    codeTitle: ['Tracer: watch every constructor and destructor fire'],
    viz: {
      title: 'Constructor/destructor call order on the stack',
      input: 'a { b c } new:h d delete:h',
      inputLabel: 'Objects in order: name = local, { } = inner scope, new:x / delete:x = heap',
      gen: function (input) {
        var toks = String(input || '').trim().split(/\s+/).filter(Boolean);
        if (!toks.length) throw new Error('Example: a { b c } new:h d delete:h');
        if (toks.length > 16) throw new Error('Use at most 16 tokens');
        var depth = 0;
        toks.forEach(function (t) {
          if (t === '{') depth++;
          else if (t === '}') { depth--; if (depth < 0) throw new Error('Unbalanced } brace'); }
          else if (!/^(new:|delete:)?[A-Za-z_]\w{0,7}$/.test(t)) throw new Error('Bad token "' + t + '" (use names like a, new:h, delete:h, { and })');
        });
        if (depth !== 0) throw new Error('Unbalanced { brace');
        var lines = ['int main() {'], lineOf = [], ind = '    ';
        toks.forEach(function (t, i) {
          if (t === '{') { lines.push(ind + '{'); ind += '    '; }
          else if (t === '}') { ind = ind.slice(4); lines.push(ind + '}'); }
          else if (t.indexOf('new:') === 0) lines.push(ind + 'Tracer* ' + t.slice(4) + ' = new Tracer("' + t.slice(4) + '");');
          else if (t.indexOf('delete:') === 0) lines.push(ind + 'delete ' + t.slice(7) + ';');
          else lines.push(ind + 'Tracer ' + t + '("' + t + '");');
          lineOf[i] = lines.length;
        });
        lines.push('}');
        var code = lines.join('\n'), endLine = lines.length;
        var stack = [], heap = [], out = [], frames = [];
        function snap(narr, line, cls, stackHl, heapHl) {
          var sh = {}; if (stackHl !== undefined && stackHl >= 0) sh[stackHl] = cls === 'bad' ? 'bad' : 'ok';
          var hh = {}; if (heapHl) hh[heapHl] = cls === 'bad' ? 'bad' : 'ok';
          var hl = {}; if (line) hl[line] = cls || 'cur';
          frames.push({ narr: narr, parts: [
            { type: 'code', label: 'program', lang: 'cpp', code: code, hl: hl },
            { type: 'stack', label: 'automatic objects (top = newest)', items: stack.map(function (s) { return s === '|' ? '── scope ──' : s; }), hl: sh },
            { type: 'set', label: 'heap objects (alive)', items: heap.slice(), hl: hh },
            { type: 'text', label: 'console output', html: out.length ? out.map(function (o) { return o.indexOf('dtor') === 0 ? '<span class="c-r">' + o + '</span>' : '<span class="c-g">' + o + '</span>'; }).join('<br>') : '<span class="c-m">(nothing yet)</span>' }
          ] });
        }
        snap('Program starts. The <b>automatic-object stack</b> is empty. Each local object is pushed when its declaration runs, and popped (destructor!) when its scope closes.', 1, 'cur');
        toks.forEach(function (t, i) {
          var ln = lineOf[i];
          if (t === '{') { stack.push('|'); snap('Enter an inner block <code>{</code>. Objects declared inside will die at its matching <code>}</code>.', ln, 'cur'); }
          else if (t === '}') {
            snap('Reached <code>}</code>: every object created in this block is destroyed now, <b>newest first</b>.', ln, 'cur');
            while (stack.length && stack[stack.length - 1] !== '|') {
              var top = stack.length - 1, nm = stack[top];
              out.push('dtor ' + nm);
              snap('Destructor <b>~Tracer()</b> for <b>' + nm + '</b> (it was the last one built in this block, so it goes first).', ln, 'bad', top);
              stack.pop();
            }
            stack.pop();
          } else if (t.indexOf('new:') === 0) {
            var h = t.slice(4); heap.push(h); out.push('ctor ' + h);
            snap('<code>new</code> builds <b>' + h + '</b> on the <b>heap</b>. It is NOT on the stack, so leaving a scope will never destroy it — only <code>delete</code> will.', ln, 'ok', undefined, h);
          } else if (t.indexOf('delete:') === 0) {
            var d = t.slice(7), at = heap.indexOf(d);
            if (at < 0) { snap('<span class="c-r"><code>delete ' + d + '</code> on something that is not a live heap object — in real C++ that is undefined behaviour (double delete or invalid pointer)!</span>', ln, 'bad'); }
            else { out.push('dtor ' + d); snap('<code>delete ' + d + '</code> runs the destructor of <b>' + d + '</b> immediately and frees its memory.', ln, 'bad', undefined, d); heap.splice(at, 1); }
          } else {
            stack.push(t); out.push('ctor ' + t);
            snap('Declaration reached: constructor runs for <b>' + t + '</b>, pushed on top of the stack.', ln, 'ok', stack.length - 1);
          }
        });
        snap('End of <code>main</code>. Remaining locals are destroyed in <b>reverse</b> order of construction.', endLine, 'cur');
        while (stack.length) { var tt = stack.length - 1; out.push('dtor ' + stack[tt]); snap('Destructor for <b>' + stack[tt] + '</b>.', endLine, 'bad', tt); stack.pop(); }
        snap(heap.length ? '<span class="c-r">Program over, but heap object(s) <b>' + heap.join(', ') + '</b> were never deleted: their destructors NEVER ran. That is a leak.</span> Smart pointers (module 6) fix this automatically.' : '<span class="c-g">Everything was cleaned up.</span> Read the console output top to bottom — that is exactly what a "predict the output" question expects.', endLine, heap.length ? 'bad' : 'ok');
        return frames;
      }
    },
    examples: [
      {
        title: 'Predict the output: nested scopes',
        html: `<p>Rule: build in order of declaration, destroy in reverse <b>within each scope</b>, and an inner scope finishes completely before code after it runs.</p>
          ${H.table(['step', 'event', 'why'], [['1', 'ctor a', 'first declaration'], ['2', 'ctor b', 'inner scope'], ['3', 'ctor c', ''], ['4', '<span class="c-r">dtor c</span>', 'inner <code>}</code>, newest first'], ['5', '<span class="c-r">dtor b</span>', ''], ['6', 'ctor d', 'after the block'], ['7', '<span class="c-r">dtor d</span>', 'end of main, newest first'], ['8', '<span class="c-r">dtor a</span>', 'oldest dies last']])}`,
        code: R`struct T {
    char n;
    T(char c) : n(c) { cout << "ctor " << n << '\n'; }
    ~T() { cout << "dtor " << n << '\n'; }
};
int main() {
    T a('a');
    {
        T b('b');
        T c('c');
    }
    T d('d');
}
// ctor a, ctor b, ctor c, dtor c, dtor b, ctor d, dtor d, dtor a`
      },
      {
        title: 'Arrays and temporaries',
        html: `<p>Array elements are built index 0 → n−1 and destroyed n−1 → 0. A temporary (an object with no name) dies at the <b>end of the full expression</b>, i.e. at the semicolon.</p>
          ${H.arr(['x0', 'x1', 'x2'], { label: 'built →', hl: { 0: 'g', 1: 'g', 2: 'g' } })}${H.arr(['x2', 'x1', 'x0'], { label: '← destroyed', hl: { 0: 'r', 1: 'r', 2: 'r' } })}`,
        code: R`struct T {
    string n;
    T(string s) : n(s) { cout << "ctor " << n << '\n'; }
    ~T() { cout << "dtor " << n << '\n'; }
};
int main() {
    T arr[3] = {T("x0"), T("x1"), T("x2")};   // C++17: built directly in place
    T("temp");                                  // ctor temp, dtor temp immediately
    cout << "end of main\n";
}
// ctor x0, ctor x1, ctor x2, ctor temp, dtor temp, end of main, dtor x2, dtor x1, dtor x0`
      },
      {
        title: 'Declaring one constructor removes the free default constructor',
        html: `<p>The compiler writes a default constructor for you <b>only if you declare no constructors at all</b>. Add a parameterized one and <code>Point p;</code> stops compiling. Bring it back with <code>= default</code> (and give members default values so it is not garbage).</p>
          ${H.table(['class has…', '<code>Point p;</code> compiles?'], [['no constructors', H.c('g', 'yes (implicit default)')], ['only <code>Point(int, int)</code>', H.c('r', 'no')], ['<code>Point(int,int)</code> + <code>Point() = default;</code>', H.c('g', 'yes')]])}`,
        code: R`class Point {
    int x = 0, y = 0;            // default member initializers keep = default safe
public:
    Point() = default;           // ask for the compiler-generated default ctor back
    Point(int x_, int y_) : x(x_), y(y_) {}
    Point(const Point&) = default;
    int sum() const { return x + y; }
};
int main() {
    Point a;          // OK thanks to = default -> (0,0)
    Point b(2, 3);
    cout << a.sum() << ' ' << b.sum() << '\n';   // 0 5
}`
      },
      {
        title: 'The most vexing parse: T t(); is not an object',
        html: `<p><code>Tracer t();</code> looks like "create t with no arguments" but C++ reads it as <b>declaring a function</b> named <code>t</code> that returns a Tracer. No constructor runs, nothing prints. Use <code>Tracer t;</code> or <code>Tracer t{};</code>. Brace initialization (<code>{}</code>) was introduced partly to kill this trap.</p>
          ${H.table(['code', 'meaning'], [['<code>Widget w;</code>', 'object, default-constructed'], ['<code>Widget w{};</code>', 'object, value-initialized'], ['<code>Widget w();</code>', H.c('r', 'function declaration!')]])}`,
        code: R`struct Widget {
    Widget() { cout << "Widget built\n"; }
};
int main() {
    Widget w1;     // prints
    Widget w2{};   // prints
    Widget w3();   // declares a FUNCTION w3() returning Widget: prints nothing
    cout << "done\n";
}`
      },
      {
        title: 'explicit stops surprise conversions',
        html: `<p>Without <code>explicit</code>, a one-argument constructor is also a silent converter: <code>printArea(7)</code> would quietly build a 7×7 square. Interviewers like asking why most one-argument constructors should be <code>explicit</code>.</p>`,
        code: R`class Square {
    int side;
public:
    explicit Square(int s) : side(s) {}
    int area() const { return side * side; }
};
void printArea(const Square& s) { cout << s.area() << '\n'; }

int main() {
    printArea(Square(7));   // OK: intention is visible
    // printArea(7);        // error: no implicit int -> Square (explicit)
}`
      }
    ],
    deepDive: `<p>🟣 <b>Lifetime precisely.</b> An object's lifetime begins when its constructor <i>finishes</i> and ends when its destructor <i>starts</i>. Automatic objects are destroyed in reverse order of construction at scope exit — including when the scope is left by <code>return</code>, <code>break</code>, <code>goto</code> or an exception (stack unwinding). This guarantee is the whole foundation of <b>RAII</b> (Resource Acquisition Is Initialization): acquire in the constructor, release in the destructor, and cleanup can never be forgotten.</p>
      <p><b>Exceptions in constructors.</b> If a constructor throws, the object never existed, so <i>its</i> destructor does not run — but every member and base that was already fully constructed <b>is</b> destroyed. That is why owning raw pointers in a class with a throwing constructor leak: wrap each resource in its own RAII member. Destructors are implicitly <code>noexcept</code> since C++11; throwing out of one during unwinding calls <code>std::terminate</code>.</p>
      <p><b>Statics.</b> Function-local <code>static</code> objects are constructed the first time control passes the declaration, and that initialisation is thread-safe since C++11 ("magic statics"). Static-storage objects are destroyed after <code>main</code> returns (or <code>exit()</code> is called) in reverse order of construction completion. Globals in <i>different</i> .cpp files have unspecified relative initialisation order — the <b>static initialization order fiasco</b>; fix it with a function returning a reference to a local static. <code>exit()</code> skips destructors of automatic locals; <code>abort()</code>/<code>quick_exit()</code> skip static destructors too.</p>
      <p><b>Copy elision.</b> Since C++17, <code>T x = T("a");</code> and returning a prvalue construct directly in place — no copy, no extra destructor call. That changes the answer to older "predict the output" questions; NRVO (returning a named local) is still only optional, so outputs may differ between compilers and <code>-fno-elide-constructors</code>.</p>
      <p><b>Special members the compiler may write for you:</b> default ctor, destructor, copy ctor/assignment, move ctor/assignment. Declaring some suppresses others (the full table is the Rule of 3/5/0 in the next module). <code>= default</code> asks for the generated version; <code>= delete</code> forbids an operation (e.g. a non-copyable lock guard).</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> an assistant can generate a class with constructors in a blink, and it can even predict simple outputs. But lifetime questions are exactly where models hallucinate: they forget that a <code>static</code> local is destroyed after main's locals, miss copy elision, or claim a heap object is destroyed at scope end.</p>
      <p><b>Use AI as a partner:</b> ask <code>"Add tracing ctor/dtor prints to this class and list the order you expect"</code>, then <b>compile and run it</b> — the program is the ground truth, not the model. Ask <code>"Which single-argument constructors here should be explicit?"</code> and <code>"Where can an exception leak a resource in this constructor?"</code></p>
      <p><b>Where AI goes wrong:</b> generating <code>new</code> without matching <code>delete</code>, writing a destructor that throws, or using <code>Widget w();</code>. <b>What you must still own:</b> predicting construction/destruction order on a whiteboard in under a minute — it is one of the most common C++ interview warm-ups — and explaining RAII in one sentence.</p>`,
    problems: [{
      title: 'Predict the Output: Globals, Static Locals and Scopes',
      level: 'Medium', tags: ['predict the output', 'object lifetime', 'static local'], companies: ['Qualcomm', 'Nvidia', 'Bloomberg'],
      statement: `<p>Each <code>T</code> prints <code>+name</code> when constructed and <code>-name</code> when destroyed (space separated). Predict the exact output of this program:</p>
        <pre>T g("g");
void f() { static T s("s"); T l("l"); }
int main() {
    T a("a");
    f();
    f();
    { T b("b"); }
    cout &lt;&lt; "| ";
}</pre>`,
      constraints: `Assume a conforming C++20 compiler; output goes to one line.`,
      example: `<p>Answer: ${H.c('g', '+g +a +s +l -l +l -l +b -b | -a -s -g')}</p><p>${H.c('b', 'g')} is built before main. The static ${H.c('p', 's')} is built only on the FIRST call and survives until after main. ${H.c('y', 'l')} is a normal local: born and killed on every call.</p>`,
      brute: {
        why: `<p>The "brute force" is to stop guessing and <b>instrument</b>: record every event into a log and print it. That always works on a real machine, but in an interview you have no compiler — and the naive mental model ("destroy in declaration order" or "static locals die with the function") gives the wrong answer. You need the rules.</p>`,
        code: R`#include <iostream>
#include <string>
#include <vector>
using namespace std;

vector<string> logv;   // record events instead of reasoning about them
struct T {
    string n;
    T(string s) : n(s) { logv.push_back("+" + n); }
    ~T() { logv.push_back("-" + n); }
};
int main() {
    {
        T a("a");
        { T b("b"); }
    }
    for (auto& e : logv) cout << e << ' ';   // +a +b -b -a
    cout << '\n';
}`
      },
      mcq: { q: 'When is the static local s destroyed?', options: ['After main returns, before g (reverse order of construction)', 'At the end of the first call to f()', 'At the end of the second call to f()', 'Never'], answer: 0, explain: 'Static locals live until program exit; static-storage objects die in reverse order of construction, and s was built after g, so s dies before g.' },
      hints: [
        `<p>Hint 1: split objects by storage: global (g), static local (s), automatic locals (a, l, b). Each group has its own lifetime rule.</p>`,
        `<p>Hint 2: <code>s</code> is constructed the first time control reaches it, and that initialisation is skipped on later calls. <code>l</code> is fresh every call.</p>`,
        `<p>Hint 3: at the end, automatic objects in main die at <code>}</code> first (<code>-a</code>), then static-storage objects in reverse order of construction: s (built later) before g. Recipe: write the timeline left to right, push on construct, pop on scope exit.</p>`
      ],
      solution: {
        approach: `<p>Walk the program as the machine does. Before main: <code>+g</code>. main: <code>+a</code>. First <code>f()</code>: static s initialised (<code>+s</code>), local l (<code>+l</code>), l dies at f's <code>}</code> (<code>-l</code>). Second <code>f()</code>: s skipped, <code>+l -l</code>. Block: <code>+b -b</code>. Print <code>| </code>. main ends: <code>-a</code>. Then statics in reverse construction order: <code>-s -g</code>.</p>`,
        code: R`#include <iostream>
#include <string>
using namespace std;

struct T {
    string n;
    T(string s) : n(s) { cout << '+' << n << ' '; }
    ~T() { cout << '-' << n << ' '; }
};

T g("g");                       // static storage: built before main

void f() {
    static T s("s");            // built on FIRST call only, lives until program exit
    T l("l");                   // automatic: born and destroyed every call
}

int main() {
    T a("a");
    f();
    f();
    { T b("b"); }
    cout << "| ";
}
// Output: +g +a +s +l -l +l -l +b -b | -a -s -g`,
        dry: { head: ['moment', 'event', 'output so far'], rows: [
          ['before main', 'construct global g', '+g'],
          ['main line 1', 'construct a', '+g +a'],
          ['f() #1', 'static s initialised, then l; l dies', '… +s +l -l'],
          ['f() #2', 's skipped; l born and dies', '… +l -l'],
          ['inner block', 'b born, dies at }', '… +b -b'],
          ['cout', 'print bar', '… |'],
          ['main returns', 'a dies (automatic)', '… -a'],
          ['after main', 'statics in reverse order: s then g', '… -s -g']
        ] },
        complexity: `<p>Reasoning is linear in the number of statements; the program itself runs in O(1).</p>`,
        followUps: ['What changes if main calls exit(0) instead of returning?', 'What if g lived in another .cpp file and s used g in its constructor?', 'Make f() thread-safe: is static T s already safe?']
      }
    }]
  });

  /* ================= TOPIC 3: member initializer lists ================= */
  topics.push({
    title: 'Member Initializer Lists & Default Member Initializers',
    analogy: `<p>Filling in an official form. The <b>initializer list</b> is writing the correct answer in pen the first time. Assigning in the constructor <b>body</b> is like first scribbling a placeholder, then crossing it out and writing the real answer — slower, messy, and for some boxes (signed, notarised = <code>const</code>, references) you are simply <b>not allowed to cross out</b>.</p>
      <p>And the form's boxes are always filled <b>top to bottom in the order they are printed on the page</b> (declaration order) — no matter in which order you read the instructions.</p>`,
    explain: `<p>🟢 A constructor can initialise members <b>before its body runs</b>, using the list after the colon:</p>
      <pre>Circle(double r) : radius(r), area(3.14159 * r * r) { /* body */ }</pre>
      <p>Why this matters: by the time the body's <code>{</code> is reached, <b>every member already exists</b>. If you did not list a member, it was default-constructed (or left as garbage for <code>int</code>/<code>double</code>/pointers). Assigning in the body is then a <i>second</i> step.</p>
      ${H.table(['member kind', 'assign in body?', 'initializer list?'], [
        ['<code>int</code>, <code>string</code> …', 'works (but double work for string)', H.c('g', 'best')],
        ['<code>const int id;</code>', H.c('r', 'compile error'), H.c('g', 'required')],
        ['<code>Logger&amp; log;</code> (reference)', H.c('r', 'compile error'), H.c('g', 'required')],
        ['member with no default constructor', H.c('r', 'compile error'), H.c('g', 'required')],
        ['base class (topic 6)', H.c('r', 'impossible'), H.c('g', 'required to pass args')]
      ])}
      <p><b>The order trap:</b> members are initialised in the order they are <b>declared in the class</b>, NOT the order you write them in the list. If <code>lo</code> is declared before <code>hi</code>, then <code>: hi(n), lo(hi - 10)</code> computes <code>lo</code> from an uninitialised <code>hi</code> → garbage. Compile with <code>-Wall</code> (it enables <code>-Wreorder</code>) and keep the list in declaration order.</p>
      <p><b>Default member initializers</b> (C++11): <code>int retries = 3;</code> right in the class. Every constructor uses that value unless its initializer list says otherwise. Great for giving every member a safe default so no constructor forgets one.</p>
      ${H.table(['step', 'what happens when <code>Obj o(args)</code> runs'], [['1', 'base classes are constructed (topic 6)'], ['2', 'each member, in declaration order: initializer-list value if listed, else its default member initializer, else default-initialized'], ['3', 'the constructor body <code>{ … }</code> runs']])}`,
    clues: [
      '"const member" or "reference member" in a class → must use the member initializer list',
      '"member has no default constructor" / "error: no matching function for call to X::X()" → initializer list',
      '"Why is my member garbage?" with an initializer list → members init in DECLARATION order (-Wreorder)',
      '"Initializer list vs assignment in constructor body" → init once vs default-construct then assign',
      '"Give every field a safe default" → default member initializers (int x = 0;)',
      '"Avoid duplicating constructor logic" → delegating constructors'
    ],
    code: [R`#include <iostream>
#include <string>
using namespace std;

class Engine {
    int hp;
public:
    explicit Engine(int horsepower) : hp(horsepower) {}   // NO default constructor
    int power() const { return hp; }
};

class Logger {
public:
    void log(const string& s) { cout << "[log] " << s << '\n'; }
};

class Car {
    const int id;          // const: can only be initialized, never assigned
    Logger& logger;        // reference: must be bound at birth
    Engine engine;         // no default ctor: must be initialized explicitly
    string model;
    int trips = 0;         // default member initializer
public:
    // Initializer list in DECLARATION order: id, logger, engine, model (trips uses its default)
    Car(int id_, Logger& lg, int hp, string m)
        : id(id_), logger(lg), engine(hp), model(m) {
        logger.log("car " + to_string(id) + " ready");   // body runs last
    }
    void drive() { ++trips; }
    void report() const {
        cout << model << " #" << id << ' ' << engine.power() << "hp trips=" << trips << '\n';
    }
};

int main() {
    Logger lg;
    Car c(7, lg, 300, "Roadster");   // [log] car 7 ready
    c.drive(); c.drive();
    c.report();                      // Roadster #7 300hp trips=2
}`],
    codeTitle: ['const, reference and no-default-ctor members all need the initializer list'],
    viz: {
      title: 'Initialization follows DECLARATION order, not list order',
      input: 'lo len hi',
      inputLabel: 'Declaration order of members lo, hi, len (try: lo hi len)',
      gen: function (input) {
        var order = String(input || '').trim().split(/[\s,]+/).filter(Boolean);
        var need = ['hi', 'len', 'lo'];
        if (order.length !== 3 || order.slice().sort().join() !== need.join()) throw new Error('Enter the three names lo, hi, len in any order, e.g. "lo hi len"');
        var expr = { hi: 'start + n', lo: 'start', len: 'hi - lo' };
        var listOrder = ['hi', 'lo', 'len'];
        var code = 'class Range {\n' + order.map(function (m) { return '    int ' + m + ';'; }).join('\n') + '\npublic:\n    Range(int start, int n)\n        : hi(start + n), lo(start), len(hi - lo) {}\n};';
        var declLine = {}; order.forEach(function (m, i) { declLine[m] = 2 + i; });
        var ctorLine = order.length + 4;
        var vals = { lo: '? (garbage)', hi: '? (garbage)', len: '? (garbage)' }, ready = {}, bad = false, frames = [];
        var start = 10, n = 5;
        var steps = [];
        frames.push({ narr: 'We call <code>Range r(10, 5)</code>. The list is <b>written</b> as hi, lo, len — but the compiler ignores that order. It walks the members in the order they are <b>declared</b>: ' + order.join(' → ') + '. Before anything runs, every int holds garbage.', parts: [
          { type: 'code', label: 'class as declared', lang: 'cpp', code: code, hl: (function () { var h = {}; h[ctorLine] = 'cur'; return h; })() },
          { type: 'array', label: 'written order in the list', values: listOrder, hl: {} },
          { type: 'array', label: 'ACTUAL init order (declaration order)', values: order.slice(), hl: {} },
          { type: 'vars', label: 'object r', vals: { start: start, n: n, lo: vals.lo, hi: vals.hi, len: vals.len } }
        ] });
        order.forEach(function (m, i) {
          var v, note;
          if (m === 'hi') { v = start + n; note = 'hi = start + n = ' + (start + n) + '. Only uses parameters, always safe.'; }
          else if (m === 'lo') { v = start; note = 'lo = start = ' + start + '. Only uses a parameter, always safe.'; }
          else {
            if (ready.hi && ready.lo) { v = (start + n) - start; note = 'len = hi − lo = ' + (start + n) + ' − ' + start + ' = ' + v + '. Both were already initialised, so this is correct.'; }
            else { v = '??? (UB)'; bad = true; note = '<span class="c-r">len = hi − lo, but ' + (!ready.hi ? 'hi' : '') + (!ready.hi && !ready.lo ? ' and ' : '') + (!ready.lo ? 'lo' : '') + ' is NOT initialised yet → reads garbage → undefined behaviour.</span>'; }
          }
          vals[m] = v; ready[m] = true;
          var ah = {}; ah[i] = m === 'len' && bad ? 'bad' : 'ok';
          var lh = {}; lh[listOrder.indexOf(m)] = 'cur';
          var ch = {}; ch[declLine[m]] = m === 'len' && bad ? 'bad' : 'ok';
          var vh = {}; vh[m] = m === 'len' && bad ? 'bad' : 'ok';
          steps.push([String(i + 1), m, expr[m], String(v)]);
          frames.push({ narr: 'Step ' + (i + 1) + ': initialise <b>' + m + '</b> (declared ' + (i + 1) + (i === 0 ? 'st' : i === 1 ? 'nd' : 'rd') + '). Its list entry is <code>' + m + '(' + expr[m] + ')</code>. ' + note, parts: [
            { type: 'code', label: 'class as declared', lang: 'cpp', code: code, hl: ch },
            { type: 'array', label: 'written order in the list', values: listOrder, hl: lh },
            { type: 'array', label: 'ACTUAL init order (declaration order)', values: order.slice(), hl: ah },
            { type: 'vars', label: 'object r', vals: { start: start, n: n, lo: vals.lo, hi: vals.hi, len: vals.len }, hl: vh },
            { type: 'table', label: 'init log', columns: ['#', 'member', 'expression', 'value'], rows: steps.map(function (r) { return r.slice(); }), hl: (function () { var h = {}; h[steps.length - 1] = m === 'len' && bad ? 'bad' : 'ok'; return h; })() }
          ] });
        });
        var matches = order.join() === listOrder.join();
        frames.push({ narr: 'Then the constructor <b>body</b> runs (empty here). ' + (bad ? '<span class="c-r">Result: len is garbage.</span> g++ -Wall flags the mismatch with a <i>-Wreorder</i> warning ("… will be initialized after …").' : '<span class="c-g">Result: lo=10, hi=15, len=5 — correct, because len is declared after the members it reads.</span>') + (matches ? '' : ' Tip: even when it works, keep the list in declaration order so readers are not fooled.'), parts: [
          { type: 'vars', label: 'final object r', vals: { lo: vals.lo, hi: vals.hi, len: vals.len }, hl: { len: bad ? 'bad' : 'sel' } },
          { type: 'table', label: 'rule of thumb', columns: ['do', 'why'], rows: [['declare members in dependency order', 'init order = declaration order'], ['write the list in the same order', '-Wreorder stays quiet, readers not misled'], ['avoid members reading other members in the list', 'compute from parameters instead: len(n)']], hl: { 0: 'ok' } }
        ] });
        return frames;
      }
    },
    examples: [
      {
        title: 'The reorder bug (predict the output)',
        html: `<p><code>lo</code> is declared first, so <code>lo(hi - 10)</code> runs while <code>hi</code> is still garbage. The fix is to compute both from the <b>parameter</b>, not from another member.</p>
          ${H.table(['version', 'lo', 'hi'], [['buggy: <code>: hi(n), lo(hi - 10)</code>', H.c('r', 'garbage'), '100'], ['fixed: <code>: lo(n - 10), hi(n)</code>', H.c('g', '90'), '100']])}`,
        code: R`class Buggy {
    int lo;   // declared FIRST -> initialized first
    int hi;
public:
    Buggy(int n) : hi(n), lo(hi - 10) {}   // reads hi before it is set: undefined behaviour
    int low() const { return lo; }
};
class Fixed {
    int lo;
    int hi;
public:
    Fixed(int n) : lo(n - 10), hi(n) {}    // only uses the parameter, in declaration order
    int low() const { return lo; }
};
int main() {
    cout << Fixed(100).low() << '\n';      // 90
    // Buggy(100).low() could print anything
}`
      },
      {
        title: 'Double work: assignment in the body',
        html: `<p>For a class-type member, "assign in body" means <b>default constructor + assignment</b> (2 operations); the initializer list does <b>1</b> construction. With a <code>std::string</code> holding a long text, the first version may allocate twice.</p>
          ${H.table(['style', 'calls on member'], [['<code>Box(Noisy n) { m = n; }</code>', 'default ctor, then operator='], ['<code>Box(Noisy n) : m(n) {}</code>', 'copy ctor only']])}`,
        code: R`struct Noisy {
    Noisy()                      { cout << "default "; }
    Noisy(const Noisy&)          { cout << "copy "; }
    Noisy& operator=(const Noisy&) { cout << "assign "; return *this; }
};
struct InBody   { Noisy m; InBody(const Noisy& n) { m = n; } };
struct InList   { Noisy m; InList(const Noisy& n) : m(n) {} };

int main() {
    Noisy src;            // default
    cout << "| ";
    InBody a(src);        // default assign
    cout << "| ";
    InList b(src);        // copy
    cout << '\n';
}`
      },
      {
        title: 'Default member initializers + delegating constructors',
        html: `<p>Give members safe defaults in the class, and let simple constructors <b>delegate</b> to the full one instead of copy-pasting logic. If a constructor lists a member, the list wins over the default.</p>
          ${H.kv([['Timer()', 'name="timer", ms=1000'], ['Timer("tick")', 'name="tick", ms=1000'], ['Timer("tick", 50)', 'name="tick", ms=50']], { label: 'results' })}`,
        code: R`class Timer {
    string name = "timer";   // default member initializers
    int ms = 1000;
public:
    Timer() = default;                                   // uses both defaults
    explicit Timer(string n) : Timer(n, 1000) {}         // delegates
    Timer(string n, int period) : name(n), ms(period) {} // list overrides defaults
    void show() const { cout << name << '/' << ms << ' '; }
};
int main() {
    Timer().show(); Timer("tick").show(); Timer("tick", 50).show();   // timer/1000 tick/1000 tick/50
}`
      },
      {
        title: 'Uniform (brace) initialization stops narrowing',
        html: `<p>Inside the list you may use <code>()</code> or <code>{}</code>. Braces refuse <b>narrowing</b> conversions, catching bugs like stuffing <code>3.7</code> into an <code>int</code> at compile time.</p>
          ${H.table(['code', 'result'], [['<code>count(3.7)</code>', 'silently 3'], ['<code>count{3.7}</code>', H.c('r', 'compile error: narrowing')]])}`,
        code: R`class Stock {
    int count;
    double price;
public:
    Stock(int c, double p) : count{c}, price{p} {}   // braces: no silent narrowing
    double value() const { return count * price; }
};
int main() {
    Stock s{10, 2.5};
    cout << s.value() << '\n';   // 25
}`
      }
    ],
    deepDive: `<p>🟣 <b>Exact initialization sequence</b> (from the standard): (1) virtual bases, (2) direct non-virtual bases in the order they appear in the base-specifier list, (3) non-static data members in declaration order, (4) the constructor body. Destruction is the exact mirror. The order in your initializer list is <i>irrelevant</i> — which is why <code>-Wreorder</code> exists and why many style guides make it an error (<code>-Werror=reorder</code>).</p>
      <p><b>Default-initialized vs value-initialized.</b> A built-in member not mentioned anywhere is <i>default-initialized</i> — for <code>int</code> that means indeterminate, and reading it is undefined behaviour (C++26 reclassifies most such reads as "erroneous behaviour" with a defined but wrong value, but you should still never rely on it). Writing <code>count()</code> or <code>count{}</code> in the list value-initializes to 0. Default member initializers (<code>int count = 0;</code>) remove the whole class of bug.</p>
      <p><b>Performance:</b> for <code>std::string</code>/<code>std::vector</code> members, init-list construction avoids a wasted default construction plus assignment. Taking a sink parameter by value and moving it, <code>Person(string n) : name(std::move(n)) {}</code>, is the modern idiom (move semantics are covered in the advanced module).</p>
      <p><b>Exceptions:</b> a <i>function-try-block</i> <code>Ctor() try : m(x) { } catch (...) { }</code> can catch an exception thrown by a member's constructor, but it must rethrow (the object cannot be rescued) — it is mainly for logging/translation.</p>
      <p><b><code>std::initializer_list</code> is a different thing.</b> <code>vector&lt;int&gt; v{3, 4}</code> calls the initializer_list constructor (2 elements: 3 and 4) while <code>vector&lt;int&gt; v(3, 4)</code> makes three 4s. Same braces, very different meaning — know the difference from member initializer lists.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> code assistants usually write initializer lists correctly for simple classes, and tools like clang-tidy (<code>cppcoreguidelines-prefer-member-initializer</code>, <code>modernize-use-default-member-init</code>) can auto-fix body assignments. The remaining risk is <b>ordering</b>: models frequently emit lists in "logical" order that differs from the declaration order, or compute one member from another.</p>
      <p><b>Use AI as a partner:</b> ask <code>"Check this class: does any initializer read a member that is declared later?"</code> and <code>"Convert body assignments to an initializer list and add default member initializers"</code>. Then compile with <code>-Wall -Wextra -Werror</code> — the compiler is the referee.</p>
      <p><b>What you must still own:</b> the four cases where the initializer list is mandatory (const, reference, no default ctor, base with arguments), and the declaration-order rule. These are classic interview checks precisely because they cannot be bluffed.</p>`,
    problems: [{
      title: 'Fix the Sensor Class That Will Not Compile',
      level: 'Easy', tags: ['initializer list', 'const member', 'reference member'], companies: ['Bosch', 'Qualcomm', 'Tesla'],
      statement: `<p>A teammate wrote a <code>Sensor</code> with a <code>const int id</code>, a reference <code>Calibration&amp; cal</code> (shared by all sensors), and a <code>Filter filter</code> where <code>Filter</code> has only <code>Filter(int window)</code>. They assigned everything inside the constructor body and got three compile errors. Rewrite the constructor so it compiles, keeps <code>id</code> const and <code>cal</code> a reference, and returns <code>read(raw) = filter.window * cal.scale * raw</code>.</p>`,
      constraints: `Do not change member types (no removing const, no switching the reference to a pointer). C++20.`,
      example: `<p>Calibration{scale = 2}; Sensor s(42, cal, 3); <code>s.read(5)</code> → 3 × 2 × 5 = ${H.c('g', '30')}. <code>s.id()</code> → ${H.c('g', '42')}.</p>`,
      brute: {
        why: `<p>The tempting "fix" is to weaken the types until body assignment compiles: drop <code>const</code>, turn the reference into a pointer, and give <code>Filter</code> a default constructor. It compiles, but now <code>id</code> can be changed later, <code>cal</code> may be null, and a <code>Filter</code> with a meaningless window exists for a moment. You destroyed the invariants to dodge one syntax rule.</p>`,
        code: R`struct Calibration { int scale = 1; };
struct Filter { int window = 0; Filter() = default; Filter(int w) : window(w) {} };

class SensorWeak {
    int id_;               // const removed
    Calibration* cal_;     // reference turned into a nullable pointer
    Filter filter_;        // relies on a fake default ctor
public:
    SensorWeak(int id, Calibration& c, int w) {
        id_ = id; cal_ = &c; filter_ = Filter(w);   // default-construct then assign
    }
    int read(int raw) const { return filter_.window * cal_->scale * raw; }
};
int main() { Calibration c{2}; SensorWeak s(42, c, 3); cout << s.read(5) << '\n'; }`
      },
      mcq: { q: 'Which member could still be set inside the constructor body if you really wanted?', options: ['None of the three: const, reference and no-default-ctor members all need the initializer list', 'id', 'cal', 'filter'], answer: 0, explain: 'A const must be initialized, a reference must be bound at birth, and a member without a default constructor cannot be default-constructed before the body runs.' },
      hints: [
        `<p>Hint 1: by the time the body's <code>{</code> runs, every member has ALREADY been created. A const or a reference cannot be "created empty and filled later".</p>`,
        `<p>Hint 2: use <code>: id_(id), cal_(c), filter_(w)</code> — and write them in the same order as the declarations.</p>`,
        `<p>Hint 3: the reference parameter must itself be a reference (<code>Calibration&amp; c</code>), otherwise <code>cal_</code> would bind to a parameter copy that dies when the constructor returns — a dangling reference. Recipe: list each member once, in declaration order, leave the body empty.</p>`
      ],
      solution: {
        approach: `<p>Move all three into the member initializer list, in declaration order. Members are then constructed exactly once with their final values; <code>id_</code> stays const and <code>cal_</code> stays a non-null reference to the shared calibration object.</p>`,
        code: R`#include <iostream>
using namespace std;

struct Calibration { int scale = 1; };
struct Filter {
    int window;
    explicit Filter(int w) : window(w) {}   // NO default constructor
};

class Sensor {
    const int id_;          // 1st
    Calibration& cal_;      // 2nd
    Filter filter_;         // 3rd
public:
    Sensor(int id, Calibration& c, int w)
        : id_(id), cal_(c), filter_(w) {}   // same order as declarations
    int id() const { return id_; }
    int read(int raw) const { return filter_.window * cal_.scale * raw; }
};

int main() {
    Calibration cal{2};
    Sensor s(42, cal, 3);
    cout << s.id() << ' ' << s.read(5) << '\n';   // 42 30
    cal.scale = 10;                                // shared: every sensor sees it
    cout << s.read(5) << '\n';                     // 150
}`,
        dry: { head: ['step', 'member', 'initialised with', 'value'], rows: [
          ['1', 'id_', 'id', '42'],
          ['2', 'cal_', 'c (bound, not copied)', 'refers to cal'],
          ['3', 'filter_', 'Filter(3)', 'window = 3'],
          ['4', 'body', '(empty)', '-'],
          ['read(5)', '-', '3 × 2 × 5', '<span class="c-g">30</span>']
        ] },
        complexity: `<p>O(1) construction and O(1) per read.</p>`,
        followUps: ['What breaks if the constructor took Calibration by value?', 'Why does a reference member make the class non-assignable?', 'Replace the reference with std::reference_wrapper — what do you gain?']
      }
    }]
  });

  /* ================= TOPIC 4: the this pointer ================= */
  topics.push({
    title: 'The this Pointer: How a Method Knows Which Object It Is',
    analogy: `<p>A call-centre script says: "Read the customer's account balance." The same script is used for millions of callers — so how does the agent know <i>whose</i> balance? The phone system silently passes the <b>caller's account number</b> with every call. In C++ that hidden account number is <code>this</code>: the <b>address of the object</b> the member function was called on.</p>
      <p>One script (the function's code), many customers (objects), and a hidden "who is calling" slip on every call.</p>`,
    explain: `<p>🟢 Member function code exists <b>once</b> in the program, yet <code>a.add(5)</code> changes <code>a</code> and <code>b.add(5)</code> changes <code>b</code>. The trick: the compiler secretly passes the object's address as an extra first argument.</p>
      ${H.table(['you write', 'compiler roughly does'], [['<code>a.add(5);</code>', '<code>Counter::add(&amp;a, 5);</code>'], ['<code>value += v;</code> (inside add)', '<code>this-&gt;value += v;</code>'], ['<code>p-&gt;add(5);</code> (p is a pointer)', '<code>Counter::add(p, 5);</code>']])}
      <p>Inside a member function, <code>this</code> is a pointer to the current object, so <code>*this</code> is the object itself. Writing <code>this-&gt;</code> is usually optional — but it is useful in four everyday situations:</p>
      <ul>
        <li><b>Name clash:</b> parameter and member have the same name → <code>this-&gt;x = x;</code></li>
        <li><b>Method chaining:</b> return <code>*this</code> by reference so you can write <code>b.setW(3).setH(4).paint();</code></li>
        <li><b>Self-check:</b> <code>if (this == &amp;other)</code> to detect assigning or comparing an object with itself.</li>
        <li><b>Passing yourself</b> to another function or registry: <code>registry.add(this);</code></li>
      </ul>
      <p><b>Type of <code>this</code>:</b> in a normal member function of class <code>X</code> it is <code>X*</code>; in a <code>const</code> member function it is <code>const X*</code> — which is exactly <i>why</i> a const method cannot modify members. You cannot reassign <code>this</code>, and <b>static member functions have no <code>this</code> at all</b> (they are not called on an object).</p>`,
    clues: [
      '"Parameter has the same name as the member" → this->name = name (or name members with a trailing _)',
      '"Fluent interface", "builder", "chain calls like obj.a().b().c()" → return *this by reference',
      '"Why can\'t a const member function modify fields?" → this is const X* there',
      '"Can a static member function use this?" → no, it has no object',
      '"Handle self-assignment" → if (this == &other) return *this;',
      '"How does one copy of method code work for every object?" → hidden this argument'
    ],
    code: [R`#include <iostream>
#include <string>
using namespace std;

class Rectangle {
    int width = 0, height = 0;
    string color = "white";
public:
    // Parameter names shadow the members, so this-> picks the member
    Rectangle& setWidth(int width)  { this->width = width;   return *this; }
    Rectangle& setHeight(int height) { this->height = height; return *this; }
    Rectangle& setColor(const string& color) { this->color = color; return *this; }

    // const member function: here 'this' has type const Rectangle*
    int area() const { return width * height; }

    // compare addresses to detect "same object"
    bool isSameObjectAs(const Rectangle& other) const { return this == &other; }

    void print() const {
        cout << color << ' ' << width << 'x' << height << " area=" << area()
             << " at " << (const void*)this << '\n';   // the object's address
    }
};

int main() {
    Rectangle r;
    r.setWidth(3).setHeight(4).setColor("blue");   // chaining: every call returns r itself
    r.print();                                     // blue 3x4 area=12 at 0x7ffd...
    Rectangle* p = &r;
    p->setWidth(10);                               // same as r.setWidth(10)
    cout << r.area() << ' ' << boolalpha << r.isSameObjectAs(*p) << '\n';   // 40 true
}`],
    codeTitle: ['this for name clashes, chaining and identity checks'],
    viz: {
      title: 'One method, many objects: watching this change',
      input: 'a.add(5) b.add(7) a.add(3) b.set(1) a.set(0)',
      inputLabel: 'Calls on objects a and b: a.add(n), b.set(n) …',
      gen: function (input) {
        var toks = String(input || '').trim().split(/\s+/).filter(Boolean);
        if (!toks.length) throw new Error('Example: a.add(5) b.add(7)');
        if (toks.length > 10) throw new Error('Use at most 10 calls');
        var calls = toks.map(function (t) {
          var m = /^([ab])\.(add|set)\((-?\d{1,4})\)$/.exec(t);
          if (!m) throw new Error('Bad call "' + t + '". Use a.add(5) or b.set(-2)');
          return { obj: m[1], fn: m[2], v: Number(m[3]) };
        });
        var addr = { a: '0x1000', b: '0x2000' }, val = { a: 0, b: 0 }, frames = [];
        var code = 'class Counter {\n    int value = 0;\npublic:\n    void add(int v) { this->value += v; }\n    void set(int v) { this->value = v; }\n};';
        function mem(hlObj, cls) {
          var h = {}; if (hlObj) h[hlObj === 'a' ? 0 : 1] = cls;
          return { type: 'table', label: 'memory (two Counter objects)', columns: ['object', 'address', 'value'], rows: [['a', addr.a, val.a], ['b', addr.b, val.b]], hl: h };
        }
        frames.push({ narr: 'Two objects, <b>a</b> at 0x1000 and <b>b</b> at 0x2000. There is only ONE copy of the code for <code>add</code> and <code>set</code>. How does it know which <code>value</code> to change? Watch the hidden <code>this</code>.', parts: [
          { type: 'code', label: 'class (code stored once)', lang: 'cpp', code: code, hl: {} }, mem(null), { type: 'vars', label: 'hidden parameter', vals: { 'this': '(none yet)' } }
        ] });
        calls.forEach(function (c) {
          var line = c.fn === 'add' ? 4 : 5;
          var before = val[c.obj];
          frames.push({ narr: 'Call <code>' + c.obj + '.' + c.fn + '(' + c.v + ')</code>. The compiler turns it into <code>Counter::' + c.fn + '(&amp;' + c.obj + ', ' + c.v + ')</code>, so <b>this = ' + addr[c.obj] + '</b> — it points at ' + c.obj + '.', parts: [
            { type: 'code', label: 'running', lang: 'cpp', code: code, hl: (function () { var h = {}; h[line] = 'cur'; return h; })() }, mem(c.obj, 'cur'),
            { type: 'vars', label: 'hidden parameter', vals: { 'this': addr[c.obj] + ' (→ ' + c.obj + ')', v: c.v }, hl: { 'this': 'cur' } }
          ] });
          val[c.obj] = c.fn === 'add' ? before + c.v : c.v;
          frames.push({ narr: '<code>this-&gt;value</code> means "the value field at address ' + addr[c.obj] + '". ' + c.obj + '.value: ' + before + ' → <b>' + val[c.obj] + '</b>. The other object is untouched.', parts: [
            { type: 'code', label: 'running', lang: 'cpp', code: code, hl: (function () { var h = {}; h[line] = 'ok'; return h; })() }, mem(c.obj, 'ok'),
            { type: 'vars', label: 'hidden parameter', vals: { 'this': addr[c.obj] + ' (→ ' + c.obj + ')', 'this->value': val[c.obj] }, hl: { 'this->value': 'ok' } }
          ] });
        });
        frames.push({ narr: 'Bonus: in a <b>const</b> member function the hidden parameter has type <code>const Counter*</code>, so writing through it is a compile error. And a <b>static</b> member function gets no <code>this</code> at all.', parts: [
          { type: 'table', label: 'type of this', columns: ['member function', 'this is', 'can modify members?'], rows: [['void add(int)', 'Counter*', 'yes'], ['int get() const', 'const Counter*', 'no (except mutable)'], ['static int count()', '(no this)', 'only static members']], hl: { 1: 'win', 2: 'bad' } },
          mem(null)
        ] });
        return frames;
      }
    },
    examples: [
      {
        title: 'The silent shadowing bug: x = x',
        html: `<p>Inside <code>setX(int x)</code>, the plain name <code>x</code> means the <b>parameter</b> (closest scope wins). <code>x = x;</code> assigns the parameter to itself and the member never changes. Fix with <code>this-&gt;x = x;</code> or by naming members <code>x_</code>.</p>
          ${H.table(['line', 'member x afterwards'], [['<code>x = x;</code>', H.c('r', '0 (unchanged!)')], ['<code>this-&gt;x = x;</code>', H.c('g', '42')]])}`,
        code: R`struct Buggy { int x = 0; void setX(int x) { x = x; } };          // assigns param to itself
struct Good  { int x = 0; void setX(int x) { this->x = x; } };    // member = param
int main() {
    Buggy b; b.setX(42);
    Good g;  g.setX(42);
    cout << b.x << ' ' << g.x << '\n';   // 0 42
}`
      },
      {
        title: 'Predict the output: chaining by reference vs by value',
        html: `<p>Returning <code>*this</code> <b>by value</b> returns a <i>copy</i>. The second and third calls in the chain modify temporaries that vanish at the semicolon. Only by-reference chaining keeps working on the original.</p>
          ${H.table(['chain', 'r.v / w.v after'], [['<code>ByRef&amp; add()</code>: r.add(1).add(2).add(3)', H.c('g', '6')], ['<code>ByVal add()</code>: w.add(1).add(2).add(3)', H.c('r', '1')]])}`,
        code: R`struct ByRef { int v = 0; ByRef& add(int x) { v += x; return *this; } };
struct ByVal { int v = 0; ByVal  add(int x) { v += x; return *this; } };   // returns a COPY
int main() {
    ByRef r; r.add(1).add(2).add(3);
    ByVal w; w.add(1).add(2).add(3);   // add(2), add(3) work on temporary copies
    cout << r.v << ' ' << w.v << '\n'; // 6 1
}`
      },
      {
        title: 'const member functions and mutable',
        html: `<p>A <code>const</code> method promises not to change the object; the compiler enforces it because <code>this</code> is <code>const T*</code>. You can call const methods on const objects; non-const methods are rejected. <code>mutable</code> marks a member that may change even in const methods (caches, counters, mutexes) because it is not part of the object's logical value.</p>
          ${H.table(['call on <code>const Temp t</code>', 'compiles?'], [['<code>t.celsius()</code> (const)', H.c('g', 'yes')], ['<code>t.set(5)</code> (non-const)', H.c('r', 'no')]])}`,
        code: R`class Temp {
    double c = 0;
    mutable int reads = 0;          // bookkeeping, not part of the logical value
public:
    void set(double v) { c = v; }
    double celsius() const { ++reads; return c; }   // OK: reads is mutable
    int readCount() const { return reads; }
};
int main() {
    const Temp t;
    t.celsius(); t.celsius();
    // t.set(5);                    // error: passing 'const Temp' as 'this' discards qualifiers
    cout << t.readCount() << '\n';  // 2
}`
      },
      {
        title: 'Self-assignment guard with this == &other',
        html: `<p>When a class owns a buffer, assigning an object to itself (<code>a = a</code>, often hidden as <code>v[i] = v[j]</code> with i == j) could free the buffer and then copy from freed memory. Comparing addresses catches it. (Full copy-assignment rules are next module.)</p>
          ${H.kv([['this', '0x1000'], ['&amp;other', '0x1000']], { label: 'a = a' })}<p>Same address → do nothing.</p>`,
        code: R`class Buffer {
    int* data;
    int n;
public:
    explicit Buffer(int size) : data(new int[size]()), n(size) {}
    ~Buffer() { delete[] data; }
    Buffer(const Buffer&) = delete;                  // keep the example small
    Buffer& assignFrom(const Buffer& other) {
        if (this == &other) return *this;            // self-assignment: nothing to do
        int* fresh = new int[other.n];
        copy(other.data, other.data + other.n, fresh);
        delete[] data;
        data = fresh; n = other.n;
        return *this;
    }
    int size() const { return n; }
};
int main() { Buffer a(4), b(8); a.assignFrom(b).assignFrom(a); cout << a.size() << '\n'; }   // 8`
      },
      {
        title: 'Lambdas inside members capture this',
        html: `<p>A lambda written inside a member function can reach members only by capturing <code>this</code>. <code>[this]</code> captures the <b>pointer</b> (dangerous if the lambda outlives the object); C++17's <code>[*this]</code> captures a <b>copy</b> of the object. C++20 deprecates implicitly capturing <code>this</code> via <code>[=]</code> — write <code>[=, this]</code> explicitly.</p>`,
        code: R`class Scaler {
    int factor;
public:
    explicit Scaler(int f) : factor(f) {}
    vector<int> apply(vector<int> v) const {
        transform(v.begin(), v.end(), v.begin(), [this](int x) { return x * factor; });
        return v;
    }
};
int main() {
    for (int x : Scaler(3).apply({1, 2, 3})) cout << x << ' ';   // 3 6 9
}`
      }
    ],
    deepDive: `<p>🟣 <b>Under the hood.</b> On x86-64 Linux (Itanium/System V ABI) <code>this</code> is passed in register <code>rdi</code> exactly like a first argument; on 32-bit MSVC it used the <code>thiscall</code> convention (<code>ecx</code>). Calling a non-virtual member function costs the same as a free function — "OOP has overhead" is a myth for non-virtual calls.</p>
      <p><b>Value category:</b> <code>this</code> is a prvalue, so <code>this = nullptr;</code> does not compile. Calling a member function through a null pointer (<code>Counter* p = nullptr; p-&gt;add(1);</code>) is undefined behaviour even if the function never touches members — optimisers assume <code>this != nullptr</code> and may delete your null checks.</p>
      <p><b>cv- and ref-qualifiers.</b> A member function can be qualified <code>const</code>, <code>volatile</code>, <code>&amp;</code> or <code>&amp;&amp;</code>; <code>&amp;&amp;</code>-qualified overloads run only on temporaries, letting a builder's final <code>build() &amp;&amp;</code> move out its state. C++23 adds <b>deducing this</b> (explicit object parameter): <code>auto&amp;&amp; get(this auto&amp;&amp; self)</code> — one function template replaces const/non-const/rvalue overload sets and enables recursive lambdas and CRTP without templates on the class.</p>
      <p><b>Logical vs bitwise const.</b> The compiler enforces bitwise constness through <code>const T*</code>; <code>mutable</code> lets you keep <i>logical</i> constness (observable value unchanged) while updating caches. If several threads call a const method, that mutable state needs a mutex or atomic — the standard library assumes const member functions are safe to call concurrently.</p>
      <p><b>Dangling this.</b> Storing <code>this</code> (in a callback, a registry or a lambda <code>[this]</code>) creates a pointer whose validity depends on the object's lifetime. Async code (thread pools, timers, ASIO handlers) commonly uses <code>shared_from_this()</code> (module 6) to keep the object alive instead.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> builders and fluent APIs are boilerplate an assistant produces instantly. The bugs it introduces are subtle: returning <code>*this</code> by value (silently breaking chains), capturing <code>[this]</code> in an async callback that outlives the object, or using <code>[=]</code> and assuming members were copied.</p>
      <p><b>Use AI as a partner:</b> ask <code>"Which of these lambdas capture this, and can any outlive the object?"</code> or <code>"Convert these three const/non-const overloads to C++23 deducing this"</code>. Ask for a test that chains five calls and checks the original object.</p>
      <p><b>What you must still own:</b> the mental model that a method is a function with a hidden pointer argument. Once you can draw <code>a.add(5) → Counter::add(&amp;a, 5)</code>, interview questions about const methods, static functions, and null-pointer calls answer themselves.</p>`,
    problems: [{
      title: 'Fluent QueryBuilder with Method Chaining',
      level: 'Medium', tags: ['this', 'method chaining', 'builder'], companies: ['Microsoft', 'Uber', 'Adobe'],
      statement: `<p>Implement a <code>QueryBuilder</code> so that <code>QueryBuilder().from("users").where("age &gt; 18").where("active = 1").limit(10).build()</code> returns <code>SELECT * FROM users WHERE age &gt; 18 AND active = 1 LIMIT 10</code>. Multiple <code>where</code> calls are joined with <code>AND</code>; <code>limit</code> is optional; <code>select</code> may set the column list (default <code>*</code>).</p>`,
      constraints: `At most 20 chained calls; strings up to 100 chars; build() must not modify the builder.`,
      example: `<p><code>qb.from("orders").where("total &gt; 100").build()</code> → ${H.c('g', '"SELECT * FROM orders WHERE total &gt; 100"')}</p><p>Each setter returns <code>*this</code> by reference, so the NEXT call in the chain works on the same builder.</p>`,
      brute: {
        why: `<p>The naive version returns the builder <b>by value</b>. It compiles and the chain even "works" when written as one expression ending in <code>build()</code> — but each step copies all the strings (wasted allocations), and the moment someone writes <code>qb.from("t"); qb.where("x").where("y");</code> the second <code>where</code> lands on a temporary copy and disappears.</p>`,
        code: R`class QBCopy {
    string table, cond;
public:
    QBCopy from(const string& t) { table = t; return *this; }     // returns a COPY
    QBCopy where(const string& c) { cond += (cond.empty() ? "" : " AND ") + c; return *this; }
    string build() const { return "SELECT * FROM " + table + (cond.empty() ? "" : " WHERE " + cond); }
};
int main() {
    QBCopy q;
    q.from("t");
    q.where("x = 1").where("y = 2");   // "y = 2" goes to a temporary and is lost
    cout << q.build() << '\n';         // SELECT * FROM t WHERE x = 1
}`
      },
      mcq: { q: 'What should every chaining setter return?', options: ['QueryBuilder&amp; — a reference to *this', 'QueryBuilder — a copy of *this', 'void', 'QueryBuilder* — but callers must use -&gt;'], answer: 0, explain: 'Returning *this by reference makes each call act on the same object with zero copies. A pointer works but forces the uglier -&gt; syntax.' },
      hints: [
        `<p>Hint 1: the expression <code>a.f().g()</code> calls <code>g</code> on whatever <code>f</code> returned. For <code>g</code> to touch <code>a</code>, <code>f</code> must return <code>a</code> itself — i.e. <code>*this</code> by reference.</p>`,
        `<p>Hint 2: keep members: <code>columns</code> (default "*"), <code>table</code>, <code>vector&lt;string&gt; conditions</code>, <code>int lim = -1</code>.</p>`,
        `<p>Hint 3: <code>build()</code> is <code>const</code> and assembles the string: SELECT cols FROM table, then " WHERE " + join(conditions, " AND ") if non-empty, then " LIMIT n" if lim ≥ 0. Edge cases: no where, limit 0 is valid.</p>`
      ],
      solution: {
        approach: `<p>Every mutator updates a member and ends with <code>return *this;</code> with return type <code>QueryBuilder&amp;</code>. <code>build()</code> is a const member function that only reads members. Conditions are kept in a vector and joined at build time so <code>where</code> stays O(length of condition).</p>`,
        code: R`#include <iostream>
#include <string>
#include <vector>
using namespace std;

class QueryBuilder {
    string columns = "*";
    string table;
    vector<string> conditions;
    int lim = -1;                       // -1 means "no LIMIT"
public:
    QueryBuilder& select(const string& cols) { columns = cols; return *this; }
    QueryBuilder& from(const string& t)      { table = t;      return *this; }
    QueryBuilder& where(const string& c)     { conditions.push_back(c); return *this; }
    QueryBuilder& limit(int n)               { lim = n;        return *this; }

    string build() const {              // const: this is const QueryBuilder*
        string q = "SELECT " + columns + " FROM " + table;
        for (size_t i = 0; i < conditions.size(); ++i)
            q += (i == 0 ? " WHERE " : " AND ") + conditions[i];
        if (lim >= 0) q += " LIMIT " + to_string(lim);
        return q;
    }
};

int main() {
    cout << QueryBuilder().from("users").where("age > 18").where("active = 1").limit(10).build() << '\n';
    QueryBuilder q;
    q.select("id, total").from("orders");
    q.where("total > 100");                  // separate statements still hit the same object
    cout << q.build() << '\n';
}
// SELECT * FROM users WHERE age > 18 AND active = 1 LIMIT 10
// SELECT id, total FROM orders WHERE total > 100`,
        dry: { head: ['call', 'returns', 'state after'], rows: [
          ['from("users")', 'ref to same builder', 'table=users'],
          ['where("age &gt; 18")', 'ref to same builder', 'conditions=[age &gt; 18]'],
          ['where("active = 1")', 'ref to same builder', 'conditions=[age &gt; 18, active = 1]'],
          ['limit(10)', 'ref to same builder', 'lim=10'],
          ['build()', 'string', '<span class="c-g">SELECT * FROM users WHERE age &gt; 18 AND active = 1 LIMIT 10</span>']
        ] },
        complexity: `<p>Each setter O(length of its argument) amortised; build() O(total output length). No copies of the builder are ever made.</p>`,
        followUps: ['Add an rvalue-qualified build() &amp;&amp; that moves strings out.', 'Prevent SQL injection: accept parameters separately instead of raw strings.', 'Rewrite the setters with C++23 deducing this so they work on temporaries and lvalues alike.']
      }
    }]
  });

  /* ================= TOPIC 5: static members ================= */
  topics.push({
    title: 'Static Members: One Shared Copy for the Whole Class',
    analogy: `<p>In a classroom every student has their <b>own notebook</b> (normal members: each object has its own copy). But there is <b>one whiteboard</b> on the wall that everybody reads and writes (a <b>static</b> member: one copy shared by the whole class). If one student writes "Test on Friday" on the whiteboard, every student sees it instantly. And the whiteboard exists even on a day when no student shows up.</p>
      <p>A <b>static member function</b> is like the school office: you can ask it things ("how many students are enrolled?") without picking any particular student.</p>`,
    explain: `<p>🟢 Put <code>static</code> in front of a data member and it stops living inside each object. There is exactly <b>one copy</b>, owned by the class, created before <code>main</code> starts, and shared by all objects — even when zero objects exist.</p>
      ${H.table(['', 'normal (non-static) member', 'static member'], [
        ['copies', 'one per object', H.c('b', 'one for the whole class')],
        ['lives in', 'inside each object', 'static storage (like a global)'],
        ['counts toward sizeof(obj)?', 'yes', 'no'],
        ['access', '<code>obj.x</code>', '<code>ClassName::x</code> (or <code>obj.x</code>)'],
        ['exists with 0 objects?', 'no', 'yes']
      ])}
      <p><b>Static member functions</b> belong to the class too. They are called as <code>ClassName::f()</code>, have <b>no <code>this</code></b>, and therefore can touch only static members directly (they CAN read private members of an object you pass in, because access is per class). Typical uses:</p>
      <ul>
        <li><b>Counters &amp; ID generators:</b> <code>static int nextId;</code> handing out 1, 2, 3 …</li>
        <li><b>Class-wide constants:</b> <code>static constexpr int MAX_SPEED = 120;</code></li>
        <li><b>Named constructors / factories:</b> <code>Temperature::fromFahrenheit(98.6)</code></li>
        <li><b>Shared configuration or cache</b> (careful with threads!).</li>
      </ul>
      <p><b>Where is it defined?</b> Before C++17 you declared it in the class and had to define it in exactly one .cpp file: <code>int Ticket::nextId = 1;</code> — forget that and you get the classic linker error <i>"undefined reference to Ticket::nextId"</i>. Since C++17 just write <code>inline static int nextId = 1;</code> inside the class. <code>static constexpr</code> members are implicitly inline.</p>`,
    clues: [
      '"Count how many objects are alive / have been created" → static counter incremented in ctor, decremented in dtor',
      '"Give every object a unique ID" → static nextId++ in the constructor',
      '"Shared by all instances", "class-level", "without creating an object" → static member / static member function',
      '"undefined reference to X::member" linker error → static data member declared but never defined (use inline static)',
      '"Named constructor", "factory method", "Singleton" → static member function (Meyers singleton uses a static local)',
      '"Can a static function access non-static members / use this?" → no this; only via an object parameter'
    ],
    code: [R`#include <iostream>
#include <string>
using namespace std;

class Ticket {
    inline static int nextId = 1;    // C++17: defined right here, ONE copy for the class
    inline static int alive = 0;     // how many Ticket objects exist right now
    int id;                          // per-object: each ticket has its own
    string owner;
public:
    static constexpr int MAX_PER_EVENT = 500;   // class-wide constant (implicitly inline)

    explicit Ticket(string who) : id(nextId++), owner(who) { ++alive; }
    ~Ticket() { --alive; }
    Ticket(const Ticket&) = delete;  // keep counting simple: tickets are not copyable

    int getId() const { return id; }
    static int liveCount() { return alive; }   // no 'this': called as Ticket::liveCount()
    static int issued() { return nextId - 1; }
};

int main() {
    cout << Ticket::liveCount() << '\n';            // 0  (statics exist with zero objects)
    Ticket a("Asha"), b("Ben");
    {
        Ticket c("Chen");
        cout << c.getId() << ' ' << Ticket::liveCount() << '\n';   // 3 3
    }                                               // c destroyed -> alive 2
    Ticket d("Dev");                                // id 4: ids are never reused
    cout << d.getId() << ' ' << Ticket::liveCount() << ' ' << Ticket::issued() << '\n';   // 4 3 4
    cout << sizeof(Ticket) << " bytes: statics are not inside objects\n";   // int + string only
}`],
    codeTitle: ['Static ID generator + live counter'],
    viz: {
      title: 'Static member shared by every object (graph)',
      input: '+ + + - +',
      inputLabel: 'Operations: + creates a Ticket, - destroys the newest one',
      gen: function (input) {
        var ops = String(input || '').trim().split(/\s+/).filter(Boolean);
        if (!ops.length || ops.some(function (o) { return o !== '+' && o !== '-'; })) throw new Error('Use only + and - separated by spaces, e.g. + + - +');
        if (ops.length > 12) throw new Error('Use at most 12 operations');
        var live = [], nextId = 1, frames = [];
        function graph(hlId, cls, extraNarrTag) {
          var nodes = [{ id: 'S', label: 'Ticket::nextId=' + nextId + ' | alive=' + live.length, x: 50, y: 50, shape: 'box', w: 44 }];
          var edges = [], hl = { S: 'sel' }, ehl = {}, tags = {};
          live.forEach(function (o, i) {
            var nid = 'T' + o;
            nodes.push({ id: nid, label: 'obj id=' + o, x: 8 + i * 17, y: 12, shape: 'box' });
            edges.push([nid, 'S']);
            tags[nid] = 'own id';
            if (o === hlId) { hl[nid] = cls; ehl[nid + '-S'] = cls; }
          });
          return { type: 'graph', label: 'objects (top) all point at ONE static (bottom)', directed: true, height: 62, nodes: nodes, edges: edges, hl: hl, ehl: ehl, tags: tags };
        }
        function vars(h) { return { type: 'vars', label: 'class-level (static) state', vals: { 'Ticket::nextId': nextId, 'Ticket::alive': live.length, 'sizeof(Ticket)': '4 (just int id)' }, hl: h || {} }; }
        frames.push({ narr: 'Before any object exists, the static members are already there: <code>nextId = 1</code>, <code>alive = 0</code>. They live in static storage, not inside objects.', parts: [graph(), vars({ 'Ticket::nextId': 'sel' }), { type: 'code', label: 'class', lang: 'cpp', code: 'class Ticket {\n    inline static int nextId = 1;\n    inline static int alive = 0;\n    int id;\npublic:\n    Ticket() : id(nextId++) { ++alive; }\n    ~Ticket() { --alive; }\n};', hl: { 2: 'win', 3: 'win' } }] });
        ops.forEach(function (op) {
          if (op === '+') {
            if (live.length >= 6) throw new Error('At most 6 live objects in this demo');
            var id = nextId; nextId++; live.push(id);
            frames.push({ narr: 'Create a Ticket. The constructor reads the SHARED <code>nextId</code> (' + id + ') into this object\'s own <code>id</code>, then bumps the shared value to ' + nextId + ' and <code>++alive</code>. Every object sees the same new numbers.', parts: [graph(id, 'ok'), vars({ 'Ticket::nextId': 'ok', 'Ticket::alive': 'ok' })] });
          } else {
            if (!live.length) { frames.push({ narr: '<span class="c-r">Nothing to destroy</span> — no Ticket is alive. The statics still exist anyway.', parts: [graph(), vars()] }); return; }
            var gone = live[live.length - 1];
            frames.push({ narr: 'Destroy the newest Ticket (id=' + gone + '). Its destructor runs <code>--alive</code> on the shared counter.', parts: [graph(gone, 'bad'), vars({ 'Ticket::alive': 'bad' })] });
            live.pop();
            frames.push({ narr: 'Gone. <code>alive</code> dropped to ' + live.length + ', but <code>nextId</code> stays ' + nextId + ' — IDs are never reused, so the next ticket gets ' + nextId + '.', parts: [graph(), vars({ 'Ticket::alive': 'ok' })] });
          }
        });
        frames.push({ narr: 'Summary: <b>' + (nextId - 1) + '</b> tickets were ever issued, <b>' + live.length + '</b> are alive. One shared whiteboard (the statics), many personal notebooks (each object\'s id). <code>Ticket::liveCount()</code> could report this without any object.', parts: [graph(), vars({ 'Ticket::nextId': 'sel', 'Ticket::alive': 'sel' })] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Named constructors with static member functions',
        html: `<p>Two constructors <code>Temperature(double)</code> cannot mean both Celsius and Fahrenheit — same signature! A private constructor plus static factory functions gives readable, unambiguous creation.</p>
          ${H.table(['call', 'stored Celsius'], [['<code>Temperature::fromCelsius(100)</code>', '100'], ['<code>Temperature::fromFahrenheit(212)</code>', '100']])}`,
        code: R`class Temperature {
    double c;
    explicit Temperature(double celsius) : c(celsius) {}   // private: use the factories
public:
    static Temperature fromCelsius(double v)    { return Temperature(v); }
    static Temperature fromFahrenheit(double f) { return Temperature((f - 32) * 5 / 9); }
    double celsius() const { return c; }
};
int main() {
    auto a = Temperature::fromCelsius(100);
    auto b = Temperature::fromFahrenheit(212);
    cout << a.celsius() << ' ' << b.celsius() << '\n';   // 100 100
}`
      },
      {
        title: 'What a static member function can and cannot touch',
        html: `<p>No <code>this</code> means no "current object". It can use static members freely, and can reach private non-static members only through an object you hand it.</p>
          ${H.table(['inside <code>static void f(const Box&amp; other)</code>', 'OK?'], [['<code>count++</code> (static)', H.c('g', 'yes')], ['<code>width</code> (non-static, no object)', H.c('r', 'error: invalid use of member')], ['<code>other.width</code> (private, via object)', H.c('g', 'yes — same class')], ['<code>this</code>', H.c('r', 'error: no this in static function')]])}`,
        code: R`class Box {
    int width = 5;
    inline static int count = 0;
public:
    Box() { ++count; }
    static int widthOf(const Box& other) {
        // return width;        // error: no object, no this
        return other.width;      // fine: access is per class, object is explicit
    }
    static int made() { return count; }
};
int main() { Box b1, b2; cout << Box::widthOf(b1) << ' ' << Box::made() << '\n'; }   // 5 2`
      },
      {
        title: 'Pre-C++17 definition rule and the famous linker error',
        html: `<p>Old style: the class body only <b>declares</b> the static; one .cpp must <b>define</b> it. Forget the definition and every .cpp compiles, then the linker fails with <i>undefined reference to 'Counter::hits'</i>. C++17 <code>inline static</code> fixes it in one line.</p>
          ${H.table(['style', 'where the storage is defined'], [['<code>static int hits;</code> + <code>int Counter::hits = 0;</code> in counter.cpp', 'in that one .cpp'], ['<code>inline static int hits = 0;</code> (C++17)', 'in the header, merged by the linker'], ['<code>static constexpr int LIMIT = 10;</code>', 'implicitly inline (C++17)']])}`,
        code: R`// counter.h
class Counter {
public:
    static int hits;                     // declaration only
    inline static int misses = 0;        // C++17: declaration + definition
    static constexpr int LIMIT = 10;     // constexpr static: implicitly inline
};
// counter.cpp (exactly ONE translation unit)
int Counter::hits = 0;                   // the definition the linker needs

int main() {
    Counter::hits++; Counter::misses += 2;
    cout << Counter::hits << ' ' << Counter::misses << ' ' << Counter::LIMIT << '\n';   // 1 2 10
}`
      },
      {
        title: 'Static locals: Meyers singleton and call counters',
        html: `<p>A <code>static</code> variable inside a function is created the first time the line runs and then keeps its value between calls. A function returning a reference to a static local object is the simplest thread-safe singleton (C++11 guarantees one-time initialization).</p>
          ${H.table(['call', 'calls()'], [['1st', '1'], ['2nd', '2'], ['3rd', '3']])}`,
        code: R`int calls() {
    static int n = 0;   // initialised once, survives between calls
    return ++n;
}
class Config {
    Config() { cout << "loading config once\n"; }
public:
    static Config& instance() {
        static Config c;   // built on first call, thread-safe since C++11
        return c;
    }
    Config(const Config&) = delete;
    Config& operator=(const Config&) = delete;
};
int main() {
    calls(); calls();
    cout << calls() << '\n';                                     // 3
    cout << (&Config::instance() == &Config::instance()) << '\n';   // loading config once, then 1
}`
      }
    ],
    deepDive: `<p>🟣 <b>Storage and initialization.</b> Static data members have static storage duration, exactly like globals but scoped to the class name and subject to access control. Constant-initialized statics (<code>constexpr</code>, literals) are baked into the binary at compile time; others are dynamically initialized before <code>main</code>, and across different translation units that order is unspecified — the <b>static initialization order fiasco</b>. Prefer <code>constexpr</code>/<code>constinit</code> (C++20 enforces compile-time init) or the function-local-static pattern.</p>
      <p><b>Threads.</b> <code>nextId++</code> on a plain <code>int</code> from two threads is a <b>data race</b> (undefined behaviour) and can hand out duplicate IDs. Use <code>inline static std::atomic&lt;int&gt; nextId{1};</code> and <code>nextId.fetch_add(1)</code>. Function-local static initialization is thread-safe, but later <i>modifications</i> of that object are not automatically.</p>
      <p><b>Linkage &amp; ODR.</b> A non-inline static data member must be defined in exactly one translation unit; two definitions → "multiple definition" link error, zero → "undefined reference". Odr-using a <code>static const int</code> (e.g. binding it to <code>const int&amp;</code> in <code>std::max</code>) pre-C++17 also needed an out-of-class definition — a famous surprise that <code>inline</code> variables fixed.</p>
      <p><b>Testing &amp; design.</b> Static mutable state is global state in disguise: it makes unit tests order-dependent (a counter left over from the previous test) and complicates concurrency. Singletons are now often considered an anti-pattern for anything with dependencies; prefer passing objects explicitly (dependency injection) and keep statics for constants, pure factories and genuinely process-wide registries.</p>
      <p><b>Static member functions as callbacks.</b> They have no hidden <code>this</code>, so their address is a plain function pointer — perfect for C APIs (<code>qsort</code>, <code>pthread_create</code>, signal handlers) that cannot call member functions. The usual trick passes the object through a <code>void*</code> user-data argument.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> asking an assistant for "a class that counts its instances" usually yields correct code — but often a plain <code>static int</code> incremented from multiple threads, a missing decrement in the destructor, or a copy constructor that does not bump the counter (so copies are uncounted). Older training data also produces the pre-C++17 out-of-class definition style.</p>
      <p><b>Use AI as a partner:</b> prompt <code>"Is this instance counter correct under copying, moving and multithreading? List every path that creates or destroys an object"</code>. Ask it to generate a unit test that creates objects in a loop on 8 threads and asserts unique IDs, and run it under ThreadSanitizer (<code>-fsanitize=thread</code>).</p>
      <p><b>What you must still own:</b> the "one copy per class" mental model, knowing that statics are not part of sizeof, and judging when static state is a design smell. Interviewers love "implement a thread-safe singleton" — you should know the C++11 static-local answer cold.</p>`,
    problems: [{
      title: 'Unique IDs and a Live-Object Counter',
      level: 'Medium', tags: ['static members', 'constructors', 'destructors'], companies: ['Amazon', 'Bloomberg', 'Oracle'],
      statement: `<p>Write class <code>Order</code>. Each new order gets a unique, strictly increasing ID starting at 1001. Provide static functions <code>Order::alive()</code> (orders currently existing) and <code>Order::created()</code> (total ever created). Copying an order must create a NEW order with a NEW ID (a duplicate order), and must count as a creation. IDs are never reused.</p>`,
      constraints: `Single-threaded for the base version; up to 10<sup>6</sup> orders; use C++17 inline statics.`,
      example: `<p>Create a, b (ids 1001, 1002). In a block, copy c = a (id ${H.c('g', '1003')}). After the block: alive = ${H.c('b', '2')}, created = ${H.c('b', '3')}. Create d → id ${H.c('g', '1004')} (1003 is not reused).</p>`,
      brute: {
        why: `<p>The naive approach keeps a global <code>vector</code> of all orders ever made and computes "alive" by scanning a flag on each — O(N) per query and O(N) memory forever. Worse, it forgets copies: the compiler-generated copy constructor copies the ID too, so two orders share an ID and are never counted.</p>`,
        code: R`struct NaiveOrder {
    int id;
    bool aliveFlag = true;
};
vector<NaiveOrder*> everything;          // grows forever
int naiveAlive() {                        // O(N) scan for every query
    int c = 0;
    for (auto* o : everything) if (o->aliveFlag) ++c;
    return c;
}
int main() {
    NaiveOrder a{1001}; everything.push_back(&a);
    NaiveOrder copyOfA = a;               // same id 1001! and not registered
    cout << naiveAlive() << ' ' << copyOfA.id << '\n';   // 1 1001
}`
      },
      mcq: { q: 'Order b = a; — which constructor runs, and what must it do here?', options: ['The copy constructor; it must take a fresh id from nextId and increment both counters', 'The default constructor; nothing special', 'No constructor runs for copies', 'The destructor of a'], answer: 0, explain: 'Copy construction is still construction: a new object is born, so it needs its own id and must be counted. The compiler-generated version would copy the id, so we write our own.' },
      hints: [
        `<p>Hint 1: two shared numbers are needed: <code>nextId</code> (never decreases) and <code>aliveCount</code> (goes up and down). Both are <code>inline static</code>.</p>`,
        `<p>Hint 2: every constructor (default/parameterized AND copy) does <code>id(nextId++)</code> and <code>++aliveCount</code>; the destructor does <code>--aliveCount</code>. <code>created()</code> = <code>nextId − 1001</code>.</p>`,
        `<p>Hint 3: copy assignment (<code>a = b</code>) does NOT create an object: keep your own id, copy only the payload. Edge cases: temporaries count while they live; for threads switch the counters to <code>std::atomic&lt;int&gt;</code>.</p>`
      ],
      solution: {
        approach: `<p>Static members give O(1) shared state. Each constructor stamps the next ID and increments <code>aliveCount</code>; the destructor decrements it. A user-written copy constructor copies the payload but takes a fresh ID; copy assignment keeps the left-hand object's ID.</p>`,
        code: R`#include <iostream>
#include <string>
using namespace std;

class Order {
    inline static int nextId = 1001;     // shared: next ID to hand out
    inline static int aliveCount = 0;    // shared: objects currently alive
    int id;
    string item;
public:
    explicit Order(string what) : id(nextId++), item(what) { ++aliveCount; }
    Order(const Order& other) : id(nextId++), item(other.item) { ++aliveCount; }  // NEW id
    Order& operator=(const Order& other) { item = other.item; return *this; }   // keep my id
    ~Order() { --aliveCount; }

    int getId() const { return id; }
    static int alive() { return aliveCount; }
    static int created() { return nextId - 1001; }
};

int main() {
    Order a("book"), b("pen");
    {
        Order c = a;                                   // copy: id 1003
        cout << c.getId() << ' ' << Order::alive() << '\n';                 // 1003 3
    }
    cout << Order::alive() << ' ' << Order::created() << '\n';             // 2 3
    Order d("lamp");
    cout << d.getId() << ' ' << Order::alive() << ' ' << Order::created() << '\n';   // 1004 3 4
}`,
        dry: { head: ['event', 'id assigned', 'nextId after', 'alive', 'created'], rows: [
          ['Order a("book")', '1001', '1002', '1', '1'],
          ['Order b("pen")', '1002', '1003', '2', '2'],
          ['Order c = a (copy)', '1003', '1004', '3', '3'],
          ['end of block: ~c', '-', '1004', '2', '3'],
          ['Order d("lamp")', '<span class="c-g">1004</span>', '1005', '3', '4']
        ] },
        complexity: `<p>O(1) time per construction, destruction and query; O(1) extra memory regardless of how many orders exist.</p>`,
        followUps: ['Make it thread-safe with std::atomic and fetch_add.', 'Add a move constructor: should a moved-to order get a new id?', 'Expose a reset for unit tests without making the counters public.']
      }
    }]
  });

  /* ================= TOPIC 6: inheritance basics ================= */
  topics.push({
    title: 'Inheritance Basics: Base First, Derived Last',
    analogy: `<p>Think of <b>Russian nesting dolls</b> built from the inside out. A <code>SportsCar</code> object contains a complete <code>Car</code> doll, which contains a complete <code>Vehicle</code> doll. To build it, the factory must make the innermost doll first (Vehicle), wrap Car around it, then wrap SportsCar around that. To take it apart, you open the <b>outermost</b> doll first.</p>
      <p>Inheritance is "<b>is-a</b>": a SportsCar <i>is a</i> Car, a Car <i>is a</i> Vehicle. It is like a family recipe book: the child gets every recipe from the parent for free and adds a few pages of its own.</p>`,
    explain: `<p>🟢 <code>class Dog : public Animal { … };</code> makes <code>Dog</code> a <b>derived</b> class of the <b>base</b> class <code>Animal</code>. A Dog object contains a full Animal inside it (the <b>base subobject</b>) plus Dog's own members, and Dog gets Animal's member functions for free.</p>
      <p><b>Who can see what?</b> Private members of the base are inherited (they take up space!) but <b>not accessible</b> in the derived class. Protected members are accessible in the derived class but not to outsiders.</p>
      ${H.table(['base member is…', '<code>: public Base</code>', '<code>: protected Base</code>', '<code>: private Base</code>'], [
        ['public', 'public', 'protected', 'private'],
        ['protected', 'protected', 'protected', 'private'],
        ['private', 'not accessible', 'not accessible', 'not accessible']
      ])}
      <p>Almost always use <code>public</code> inheritance (true is-a). Careful: <code>class D : B</code> defaults to <b>private</b> inheritance, <code>struct D : B</code> to public.</p>
      <p><b>The order rule (memorise it):</b></p>
      ${H.table(['construction (inside → out)', 'destruction (outside → in)'], [
        ['1. base class constructor', '1. derived destructor body'],
        ['2. derived members, in declaration order', '2. derived members, in reverse order'],
        ['3. derived constructor body', '3. base class destructor']
      ])}
      <p>The base constructor always runs first. If you do not call one explicitly, the base's <b>default</b> constructor is used; to pass arguments, call it in the initializer list: <code>Dog(string n) : Animal(n, 4) {}</code>.</p>
      <p>Other basics: a <code>Dog*</code> converts automatically to an <code>Animal*</code> (upcast); a derived function with the same name <b>hides</b> all base overloads of that name; and you can call the base version explicitly with <code>Animal::speak()</code>. Making calls through a base pointer pick the derived version needs <code>virtual</code> — that is next module.</p>`,
    clues: [
      '"is-a relationship", "Dog is an Animal", "reuse code from a parent class" → public inheritance',
      '"Predict the output" with Base and Derived printing in ctors/dtors → base ctor first, derived dtor first',
      '"How do I pass arguments to the base class constructor?" → call it in the derived initializer list',
      '"Derived class cannot access a member" → it is private in base; make it protected or add a protected accessor',
      '"Overload in base disappeared after I added a function in derived" → name hiding; using Base::f;',
      '"has-a" (Car has an Engine) → composition (member), NOT inheritance'
    ],
    code: [R`#include <iostream>
#include <string>
using namespace std;

class Animal {
    string name;                 // private: Dog cannot touch it directly
protected:
    int legs;                    // protected: visible to derived classes
public:
    Animal(string n, int l) : name(n), legs(l) { cout << "Animal(" << name << ") "; }
    ~Animal() { cout << "~Animal "; }
    const string& getName() const { return name; }
    void speak() const { cout << getName() << " makes a sound\n"; }
};

class Dog : public Animal {      // public inheritance: a Dog IS an Animal
    string breed;
public:
    // Base constructor MUST be called in the initializer list to pass arguments
    Dog(string n, string b) : Animal(n, 4), breed(b) { cout << "Dog(" << breed << ")\n"; }
    ~Dog() { cout << "~Dog "; }

    void speak() const {         // hides Animal::speak (no virtual yet)
        cout << getName() << " the " << breed << " barks on " << legs << " legs\n";  // legs is protected: OK
        // cout << name;         // ERROR: 'name' is private within Animal
    }
    void speakLikeAnimal() const { Animal::speak(); }   // call the base version explicitly
};

int main() {
    Dog d("Rex", "beagle");      // Animal(Rex) Dog(beagle)
    d.speak();                   // Rex the beagle barks on 4 legs
    d.speakLikeAnimal();         // Rex makes a sound
    const Animal& a = d;         // upcast: every Dog is an Animal
    a.speak();                   // Rex makes a sound  (non-virtual: static type decides)
}                                // ~Dog ~Animal`],
    codeTitle: ['Animal → Dog: base ctor call, protected access, hiding'],
    viz: {
      title: 'Constructor & destructor call stack through a class hierarchy',
      input: 'Vehicle Car[Engine] SportsCar',
      inputLabel: 'Base → derived class names; Name[Member] adds a member object',
      gen: function (input) {
        var toks = String(input || '').trim().split(/\s+/).filter(Boolean);
        if (toks.length < 2 || toks.length > 4) throw new Error('Give 2 to 4 class names from base to most-derived, e.g. Vehicle Car[Engine] SportsCar');
        var cls = toks.map(function (t) {
          var m = /^([A-Za-z_]\w{0,11})(\[([A-Za-z_]\w{0,11})\])?$/.exec(t);
          if (!m) throw new Error('Bad token "' + t + '". Use Name or Name[Member]');
          return { name: m[1], member: m[3] || null };
        });
        var stack = [], out = [], frames = [], top = cls[cls.length - 1].name;
        function layout(hlLevel) {
          var rows = [], h = {};
          cls.forEach(function (c, i) {
            rows.push([c.name + ' part', i === 0 ? 'innermost (base subobject)' : 'derived from ' + cls[i - 1].name, c.member ? 'member: ' + c.member : '-']);
            if (i === hlLevel) h[i] = 'cur';
          });
          return { type: 'table', label: 'one ' + top + ' object = nested parts (lowest address first)', columns: ['region', 'role', 'contains'], rows: rows, hl: h };
        }
        function snap(narr, cls2, lvl) {
          var sh = {}; if (stack.length) sh[stack.length - 1] = cls2 || 'cur';
          frames.push({ narr: narr, parts: [
            { type: 'stack', label: 'call stack (top = running now)', items: stack.slice(), hl: sh },
            layout(lvl),
            { type: 'text', label: 'console output', html: out.length ? out.map(function (o) { return o.charAt(0) === '~' ? '<span class="c-r">' + o + '</span>' : '<span class="c-g">' + o + '</span>'; }).join(' ') : '<span class="c-m">(nothing yet)</span>' }
          ] });
        }
        snap('<code>' + top + ' x;</code> is declared. The constructor of the <b>most-derived</b> class is called first — but before its body may run, it must build everything it is made of.', null, -1);
        function ctor(i) {
          var c = cls[i];
          stack.push(c.name + '()');
          snap('<b>' + c.name + '()</b> is entered. ' + (i > 0 ? 'Step 1: its base <b>' + cls[i - 1].name + '</b> must be constructed first, so it calls ' + cls[i - 1].name + '() before doing anything else.' : 'It has no base class, so it can initialise its own members and run its body.'), 'cur', i);
          if (i > 0) ctor(i - 1);
          if (c.member) {
            stack.push(c.member + '()');
            out.push(c.member);
            snap('Step 2 for ' + c.name + ': its member <b>' + c.member + '</b> is constructed (members come after the base, before the body).', 'ok', i);
            stack.pop();
          }
          out.push(c.name);
          snap('Step 3: the body of <b>' + c.name + '()</b> runs and prints. ' + (i < cls.length - 1 ? 'Control returns to ' + cls[i + 1].name + '().' : 'The whole object is now fully built.'), 'ok', i);
          stack.pop();
        }
        ctor(cls.length - 1);
        snap('Construction finished: output reads base → derived. Now <code>x</code> goes out of scope …', null, -1);
        function dtor(i) {
          var c = cls[i];
          stack.push('~' + c.name + '()');
          out.push('~' + c.name);
          snap('<b>~' + c.name + '()</b>: its body runs FIRST (the outer doll opens first), while everything inside is still alive and usable.', 'bad', i);
          if (c.member) {
            stack.push('~' + c.member + '()');
            out.push('~' + c.member);
            snap('Then ' + c.name + '\'s member <b>' + c.member + '</b> is destroyed (members in reverse declaration order).', 'bad', i);
            stack.pop();
          }
          if (i > 0) snap('Finally ~' + c.name + '() implicitly calls the base destructor <b>~' + cls[i - 1].name + '()</b>.', 'cur', i);
          if (i > 0) dtor(i - 1);
          stack.pop();
        }
        dtor(cls.length - 1);
        snap('Done. Destruction is the exact <b>mirror image</b> of construction. Read the output: that is the answer to every "predict the output" inheritance question.', null, -1);
        return frames;
      }
    },
    examples: [
      {
        title: 'Predict the output: base, member and derived',
        html: `<p>Apply the order rule level by level. Base builds completely first (its own member, then its body), then Derived's members, then Derived's body. Destruction mirrors it.</p>
          ${H.arr(['Base', 'Engine', 'Derived', '|', '~Derived', '~Engine', '~Base'], { label: 'output', hl: { 0: 'g', 1: 'g', 2: 'g', 4: 'r', 5: 'r', 6: 'r' } })}`,
        code: R`struct Base   { Base()   { cout << "Base ";   } ~Base()   { cout << "~Base ";   } };
struct Engine { Engine() { cout << "Engine "; } ~Engine() { cout << "~Engine "; } };
struct Derived : Base {
    Engine e;                                    // member
    Derived()  { cout << "Derived "; }
    ~Derived() { cout << "~Derived "; }
};
int main() {
    Derived d;
    cout << "| ";
}
// Base Engine Derived | ~Derived ~Engine ~Base`
      },
      {
        title: 'protected in practice',
        html: `<p>Derived member functions can use the base's protected members; outside code cannot. Use protected for things a subclass genuinely needs, but prefer protected <b>functions</b> over protected <b>data</b> so the base keeps control of its invariants.</p>
          ${H.table(['expression', 'inside <code>Savings</code>', 'in <code>main</code>'], [['<code>balance</code> (protected)', H.c('g', 'OK'), H.c('r', 'error')], ['<code>pin</code> (private)', H.c('r', 'error'), H.c('r', 'error')], ['<code>deposit()</code> (public)', H.c('g', 'OK'), H.c('g', 'OK')]])}`,
        code: R`class Account {
    int pin = 1234;          // private: only Account
protected:
    double balance = 0;      // protected: Account + derived classes
public:
    void deposit(double x) { if (x > 0) balance += x; }
    double getBalance() const { return balance; }
};
class Savings : public Account {
    double rate;
public:
    explicit Savings(double r) : rate(r) {}
    void addInterest() { balance += balance * rate; }   // OK: protected
    // int peek() { return pin; }                        // error: private in Account
};
int main() {
    Savings s(0.10);
    s.deposit(100);
    s.addInterest();
    cout << s.getBalance() << '\n';   // 110
    // s.balance = 1e9;               // error: protected
}`
      },
      {
        title: 'Name hiding: the overload that vanished',
        html: `<p>Declaring <code>print(string)</code> in Derived <b>hides every</b> <code>print</code> from Base, even with different parameter types. <code>d.print(42)</code> then tries <code>print(string)</code> and fails. Bring the base overloads back with <code>using Base::print;</code>.</p>
          ${H.table(['Derived has…', '<code>d.print(42)</code>'], [['only <code>print(string)</code>', H.c('r', 'error: no conversion int → string')], ['<code>using Base::print;</code> + <code>print(string)</code>', H.c('g', 'calls Base::print(int)')]])}`,
        code: R`struct Base {
    void print(int x) const { cout << "int " << x << '\n'; }
};
struct Derived : Base {
    using Base::print;                       // un-hide Base::print(int)
    void print(const string& s) const { cout << "string " << s << '\n'; }
};
int main() {
    Derived d;
    d.print(42);       // int 42      (works only because of the using-declaration)
    d.print("hi");     // string hi
}`
      },
      {
        title: 'Inheriting constructors and passing base arguments',
        html: `<p>If the derived class adds no data needing setup, <code>using Base::Base;</code> inherits all base constructors in one line instead of writing forwarding constructors by hand.</p>
          ${H.table(['code', 'effect'], [['<code>Label(string t) : Widget(t) {}</code>', 'manual forwarding'], ['<code>using Widget::Widget;</code>', 'inherit every Widget constructor']])}`,
        code: R`class Widget {
protected:
    string text; int width;
public:
    Widget(string t, int w = 100) : text(t), width(w) {}
};
class Button : public Widget {
public:
    using Widget::Widget;                    // Button("OK") and Button("OK", 80) now work
    void show() const { cout << '[' << text << ':' << width << "] "; }
};
class Label : public Widget {
public:
    explicit Label(string t) : Widget("> " + t, 60) {}   // pass custom args to base
    void show() const { cout << text << ':' << width << ' '; }
};
int main() { Button("OK").show(); Button("Cancel", 80).show(); Label("Name").show(); }
// [OK:100] [Cancel:80] > Name:60`
      },
      {
        title: 'Inheritance vs composition (is-a vs has-a)',
        html: `<p>Use inheritance only for a true <b>is-a</b> relation where every base operation makes sense for the derived type. A <code>Car</code> is not an <code>Engine</code> — it <b>has</b> one, so make it a member. Classic trap: <code>Stack : public vector</code> exposes <code>insert</code> in the middle and breaks the stack's rules; compose a vector privately instead.</p>
          ${H.table(['relationship', 'tool', 'example'], [['is-a', 'public inheritance', 'Dog : Animal'], ['has-a', 'member (composition)', 'Car { Engine e; }'], ['implemented-in-terms-of', 'private member (or private inheritance)', 'Stack { vector&lt;int&gt; v; }']])}`,
        code: R`class IntStack {                 // composition: only stack operations are exposed
    vector<int> data;
public:
    void push(int x) { data.push_back(x); }
    void pop() { if (!data.empty()) data.pop_back(); }
    int top() const { return data.back(); }
    bool empty() const { return data.empty(); }
};
int main() {
    IntStack s; s.push(1); s.push(2); s.pop();
    cout << s.top() << '\n';   // 1   (no way to call insert() in the middle)
}`
      }
    ],
    deepDive: `<p>🟣 <b>Memory layout.</b> With single inheritance (and no virtual functions), the base subobject usually sits at offset 0 of the derived object and derived members follow. That is why a <code>Derived*</code> converts to a <code>Base*</code> with no address adjustment. With <b>multiple</b> inheritance, the second base sits at a non-zero offset, so the compiler adjusts the pointer during the upcast (<code>static_cast</code> handles it; <code>reinterpret_cast</code> would be a bug). An empty base class takes zero bytes thanks to the empty base optimisation.</p>
      <p><b>Why base-first?</b> The derived constructor body may call base member functions, so the base must already be valid. Symmetrically, the derived destructor body may still use base members, so the base must be destroyed last. During a base constructor/destructor the object's dynamic type is the <i>base</i> — virtual calls from there do not reach the derived override (important next module).</p>
      <p><b>Slicing preview.</b> <code>Animal a = dog;</code> copies only the Animal part — the Dog-specific members are "sliced off". Pass polymorphic objects by reference or pointer. And deleting a derived object through a <code>Base*</code> without a <code>virtual</code> destructor is undefined behaviour — the single most common inheritance bug, covered in depth in the next module.</p>
      <p><b>Private and protected inheritance</b> model "implemented-in-terms-of": the derived class uses the base internally but does not promise substitutability, and outside code cannot upcast. Composition is usually clearer; private inheritance is mainly used for the empty-base optimisation or to override a virtual of a helper base.</p>
      <p><b>Design guidance (Liskov Substitution Principle):</b> a derived class must be usable anywhere its base is expected without surprising callers. The classic counter-example: <code>Square : Rectangle</code> breaks callers that set width and height independently. Prefer shallow hierarchies; "favour composition over inheritance" remains standard advice in 2026 codebases.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants generate class hierarchies eagerly — sometimes too eagerly. Ask for "a parking lot design" and you may get five levels of inheritance where composition and an enum would be simpler. Models also forget that <code>class D : B</code> is private inheritance and frequently omit the base constructor call, silently relying on a default constructor.</p>
      <p><b>Use AI as a partner:</b> prompt <code>"For each inheritance edge in this design, justify is-a with the Liskov principle or replace it with composition"</code>, or <code>"Predict the construction/destruction output of this hierarchy, then I will compile it"</code> — and do compile it, because models regularly misplace member construction relative to the base.</p>
      <p><b>What you must still own:</b> the order rule (base → members → body; reverse for destruction), the access table, and the judgement call between is-a and has-a. Low-level-design interviews (LLD) probe exactly this judgement, and no tool makes it for you.</p>`,
    problems: [{
      title: 'Predict the Output: Members Declared vs Listed Across a Hierarchy',
      level: 'Hard', tags: ['predict the output', 'inheritance', 'initialization order'], companies: ['Qualcomm', 'Citadel', 'Nvidia'],
      statement: `<p>Each <code>Part</code> prints <code>P(name)</code> when built and <code>~P(name)</code> when destroyed. Predict the full output:</p>
        <pre>struct Base {
    Part p1{"b"};
    Base()  { cout &lt;&lt; "Base "; }
    ~Base() { cout &lt;&lt; "~Base "; }
};
struct Derived : Base {
    Part p2;
    Part p3;
    Derived() : p3("y"), p2("x") { cout &lt;&lt; "Derived "; }
    ~Derived() { cout &lt;&lt; "~Derived "; }
};
int main() { Derived d; cout &lt;&lt; "| "; }</pre>`,
      constraints: `Single line of output; assume C++20.`,
      example: `<p>Answer: ${H.c('g', 'P(b) Base P(x) P(y) Derived | ~Derived ~P(y) ~P(x) ~Base ~P(b)')}</p><p>Notice ${H.c('y', 'P(x) before P(y)')} even though the list says p3 first: members follow DECLARATION order.</p>`,
      brute: {
        why: `<p>Reading top-to-bottom ("Derived's list says p3 then p2, so y then x") or assuming the base's member is destroyed with the base body gives a wrong answer. The brute-force way is to compile and record every event, which you cannot do on a whiteboard — so learn the 3-step rule per level.</p>`,
        code: R`#include <iostream>
#include <string>
#include <vector>
using namespace std;

vector<string> events;   // brute force: record what actually happens
struct Part {
    string n;
    Part(string s) : n(s) { events.push_back("P(" + n + ")"); }
    ~Part() { events.push_back("~P(" + n + ")"); }
};
int main() {
    { Part a("a"); Part b("b"); }
    for (auto& e : events) cout << e << ' ';   // P(a) P(b) ~P(b) ~P(a)
    cout << '\n';
}`
      },
      mcq: { q: 'Which line prints first when Derived d; is constructed?', options: ['P(b) — Base\'s member, because the base is built before anything in Derived', 'Base', 'P(y) — first in Derived\'s initializer list', 'Derived'], answer: 0, explain: 'The base subobject is constructed first, and constructing Base means its members first (P(b)), then Base\'s body.' },
      hints: [
        `<p>Hint 1: each level follows the same recipe: base → members (declaration order) → body. Apply it to Base, then to Derived.</p>`,
        `<p>Hint 2: the initializer list <code>p3("y"), p2("x")</code> only supplies the <i>arguments</i>; the <i>order</i> comes from the declarations <code>p2</code>, <code>p3</code>.</p>`,
        `<p>Hint 3: destruction mirrors construction exactly: ~Derived body, then p3, p2 (reverse), then ~Base body, then Base's member p1. Write the construction list, then reverse it.</p>`
      ],
      solution: {
        approach: `<p>Construction: Base level (P(b), then "Base"), then Derived's members in declaration order (P(x), P(y)), then "Derived". Print "| ". Destruction is the reverse sequence: "~Derived", ~P(y), ~P(x), "~Base", ~P(b).</p>`,
        code: R`#include <iostream>
#include <string>
using namespace std;

struct Part {
    string n;
    Part(string s) : n(s) { cout << "P(" << n << ") "; }
    ~Part() { cout << "~P(" << n << ") "; }
};
struct Base {
    Part p1{"b"};                       // default member initializer
    Base()  { cout << "Base "; }
    ~Base() { cout << "~Base "; }
};
struct Derived : Base {
    Part p2;                            // declared first  -> built first
    Part p3;                            // declared second -> built second
    Derived() : p3("y"), p2("x") { cout << "Derived "; }   // list order is ignored (-Wreorder)
    ~Derived() { cout << "~Derived "; }
};
int main() {
    Derived d;
    cout << "| ";
}
// P(b) Base P(x) P(y) Derived | ~Derived ~P(y) ~P(x) ~Base ~P(b)`,
        dry: { head: ['phase', 'level', 'event', 'printed'], rows: [
          ['build', 'Base', 'member p1', 'P(b)'],
          ['build', 'Base', 'body', 'Base'],
          ['build', 'Derived', 'member p2 (declared 1st)', 'P(x)'],
          ['build', 'Derived', 'member p3 (declared 2nd)', 'P(y)'],
          ['build', 'Derived', 'body', 'Derived'],
          ['main', '-', 'cout', '|'],
          ['destroy', 'Derived', 'body, then p3, p2', '~Derived ~P(y) ~P(x)'],
          ['destroy', 'Base', 'body, then p1', '~Base ~P(b)']
        ] },
        complexity: `<p>Reasoning is O(number of bases + members); the program is O(1).</p>`,
        followUps: ['Add a second base class: struct Derived : Base, Other — where do Other\'s prints go?', 'What changes if p1 is declared static?', 'What if Derived is created with new and deleted through a Base*?']
      }
    }]
  });

  /* ================= TOPIC 7: friend ================= */
  topics.push({
    title: 'friend Functions & friend Classes: Controlled Backstage Passes',
    analogy: `<p>You give a <b>spare house key</b> to one trusted friend. That friend can walk in and open your private drawers. But: their <b>kids</b> do not automatically get a key (friendship is <b>not inherited</b>), <b>their</b> friends do not get one either (<b>not transitive</b>), and giving them your key does not mean they gave you theirs (<b>not mutual</b>). Most importantly, <b>you</b> decide who gets a key — nobody can make themselves your friend.</p>`,
    explain: `<p>🟢 A <code>friend</code> declaration inside a class says: "this specific outside function (or class) may access my <b>private and protected</b> members."</p>
      <pre>class Money {
    long long cents;
    friend ostream&amp; operator&lt;&lt;(ostream&amp; os, const Money&amp; m);  // a friend FUNCTION
    friend class Auditor;                                    // a friend CLASS: all its members
};</pre>
      <p>Important facts:</p>
      <ul>
        <li>A friend function is <b>not a member</b>: it has no <code>this</code>, is called like a normal function (<code>f(obj)</code>, not <code>obj.f()</code>), and the access label (public/private) around the friend declaration does not matter.</li>
        <li>Friendship is <b>granted by the class</b>, never taken. It is part of the class's interface — like a public method, just with different call syntax.</li>
        <li>Not inherited, not transitive, not mutual (see the key analogy).</li>
      </ul>
      <p><b>When do you actually need it?</b></p>
      ${H.table(['situation', 'why friend helps'], [
        ['<code>cout &lt;&lt; obj</code>', 'the left operand is <code>ostream</code>, not your class, so <code>operator&lt;&lt;</code> cannot be your member function'],
        ['symmetric operators like <code>2 + money</code>', 'a member <code>operator+</code> would not allow a converted value on the left'],
        ['two tightly coupled classes (List + Node, container + iterator)', 'one needs the other\'s internals without making them public to everyone'],
        ['unit tests (sparingly)', 'inspect private state in a test fixture']
      ])}
      <p>If a public getter already gives what the function needs, you do not need <code>friend</code> at all — prefer the least access that works.</p>`,
    clues: [
      '"Overload << to print my class" / "make cout << obj work" → friend (or non-member) operator<<',
      '"Make 5 + obj work as well as obj + 5" → non-member (often friend) binary operator',
      '"Two classes need each other\'s private data" (List/Node, Matrix/Vector) → friend class',
      '"Is friendship inherited / transitive / mutual?" → no, no, no',
      '"Does friend break encapsulation?" → only in a controlled, class-granted way; prefer it over making data public',
      '"Hidden friend", "ADL" → friend function defined inside the class body'
    ],
    code: [R`#include <iostream>
#include <iomanip>
using namespace std;

class Money {
    long long cents;                        // private
public:
    explicit Money(long long c = 0) : cents(c) {}
    static Money dollars(long long d) { return Money(d * 100); }

    // friend function: not a member, but may read 'cents'.
    // Defined inside the class ("hidden friend"): found via argument-dependent lookup.
    friend ostream& operator<<(ostream& os, const Money& m) {
        return os << '$' << m.cents / 100 << '.' << setw(2) << setfill('0') << m.cents % 100;
    }
    // symmetric operators as friends: both operands are treated equally
    friend Money operator+(const Money& a, const Money& b) { return Money(a.cents + b.cents); }
    friend bool operator<(const Money& a, const Money& b) { return a.cents < b.cents; }

    friend class Auditor;                   // every member of Auditor may read cents
};

class Auditor {
public:
    static bool suspicious(const Money& m) { return m.cents > 1'000'000; }  // > $10,000
};

int main() {
    Money rent = Money::dollars(1200), food(45050);   // $1200.00, $450.50
    Money total = rent + food;
    cout << total << '\n';                            // $1650.50
    cout << boolalpha << (food < rent) << ' ' << Auditor::suspicious(total) << '\n';  // true false
}`],
    codeTitle: ['friend operator<<, symmetric operators and a friend class'],
    viz: {
      title: 'Who may open the private drawer? Friendship rules as a graph',
      gen: function () {
        var nodes = [
          { id: 'S', label: 'class Safe (private: code)', x: 50, y: 32, shape: 'box', w: 30 },
          { id: 'F', label: 'friend fn audit()', x: 12, y: 8, shape: 'box' },
          { id: 'L', label: 'friend class Locksmith', x: 88, y: 8, shape: 'box' },
          { id: 'A', label: 'Apprentice : Locksmith', x: 88, y: 56, shape: 'box' },
          { id: 'N', label: 'Locksmith\'s friend Neighbor', x: 12, y: 56, shape: 'box' },
          { id: 'M', label: 'main()', x: 50, y: 6, shape: 'box' }
        ];
        var steps = [
          { from: 'M', ok: false, narr: '<code>main()</code> tries <code>safe.code</code>. It is an ordinary outsider: <span class="c-r">error, \'code\' is private</span>.' },
          { from: 'F', ok: true, narr: 'Safe declared <code>friend void audit(const Safe&amp;);</code>. Inside audit(), <code>s.code</code> is <span class="c-g">allowed</span>. Note: audit is NOT a member — it gets the Safe as a parameter, no <code>this</code>.' },
          { from: 'L', ok: true, narr: 'Safe declared <code>friend class Locksmith;</code>. <b>Every</b> member function of Locksmith may read Safe\'s privates: <span class="c-g">allowed</span>.' },
          { from: 'A', ok: false, narr: '<code>Apprentice</code> derives from Locksmith. Friendship is <b>NOT inherited</b>: code written in Apprentice\'s own member functions <span class="c-r">cannot</span> touch Safe\'s privates.' },
          { from: 'N', ok: false, narr: '<code>Neighbor</code> is a friend of Locksmith, and Locksmith is a friend of Safe. Friendship is <b>NOT transitive</b>: Neighbor gets <span class="c-r">no access</span> to Safe.' },
          { from: 'S', to: 'L', ok: false, narr: 'Reverse direction: can Safe read <b>Locksmith\'s</b> privates? Friendship is <b>NOT mutual</b> — Locksmith never declared Safe a friend: <span class="c-r">denied</span>.' }
        ];
        var frames = [], edges = [], ehl = {}, hl = {}, tags = {}, log = [];
        frames.push({ narr: 'The <b>Safe</b> class keeps <code>int code;</code> private. Only Safe itself — and anyone <b>Safe</b> names as a friend — may read it. Let\'s test five would-be readers.', parts: [
          { type: 'graph', label: 'access attempts', directed: true, height: 64, nodes: nodes, edges: [], hl: { S: 'sel' } },
          { type: 'code', label: 'class Safe', lang: 'cpp', code: 'class Safe {\n    int code = 4321;\n    friend void audit(const Safe&);\n    friend class Locksmith;\n};', hl: { 2: 'win' } }
        ] });
        steps.forEach(function (st, i) {
          var u = st.from, v = st.to || 'S';
          edges.push([u, v, st.ok ? 'access' : 'denied']);
          var key = u + '-' + v; ehl[key] = st.ok ? 'ok' : 'bad';
          var h = {}; Object.keys(hl).forEach(function (k) { h[k] = hl[k]; }); h[u] = st.ok ? 'ok' : 'bad';
          hl[u] = st.ok ? 'ok' : 'done';
          tags[u] = st.ok ? '✔ friend' : '✘';
          log.push([String(i + 1), nodes.filter(function (n) { return n.id === u; })[0].label + (st.to ? ' → Locksmith' : ' → Safe'), st.ok ? 'allowed' : 'denied']);
          var e2 = {}; Object.keys(ehl).forEach(function (k) { e2[k] = ehl[k]; });
          var t2 = {}; Object.keys(tags).forEach(function (k) { t2[k] = tags[k]; });
          frames.push({ narr: st.narr, parts: [
            { type: 'graph', label: 'access attempts', directed: true, height: 64, nodes: nodes, edges: edges.map(function (e) { return e.slice(); }), hl: h, ehl: e2, tags: t2 },
            { type: 'table', label: 'verdicts', columns: ['#', 'who → whose privates', 'result'], rows: log.map(function (r) { return r.slice(); }), hl: (function () { var x = {}; x[log.length - 1] = st.ok ? 'ok' : 'bad'; return x; })() }
          ] });
        });
        frames.push({ narr: 'Summary: only the two <b>explicitly named</b> friends got in. Friendship is a key handed out by the class itself — <b>not inherited, not transitive, not mutual</b>.', parts: [
          { type: 'table', label: 'friendship rules', columns: ['question', 'answer'], rows: [['Granted by whom?', 'the class whose privates are opened'], ['Inherited by derived classes?', 'no'], ['Transitive (friend of a friend)?', 'no'], ['Mutual?', 'no'], ['Is a friend function a member?', 'no (no this)']], hl: { 0: 'sel' } },
          { type: 'graph', label: 'final picture', directed: true, height: 64, nodes: nodes, edges: edges.map(function (e) { return e.slice(); }), hl: hl, ehl: ehl, tags: tags }
        ] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Why operator<< cannot be a member',
        html: `<p>For <code>cout &lt;&lt; p</code>, the compiler looks for <code>cout.operator&lt;&lt;(p)</code> (a member of <b>ostream</b> — you cannot add one) or a free function <code>operator&lt;&lt;(cout, p)</code>. A member of <code>Point</code> would require writing <code>p &lt;&lt; cout</code>, which is backwards. So it is a non-member, made a friend when it needs private data.</p>
          ${H.table(['form', 'usage'], [['member <code>Point::operator&lt;&lt;(ostream&amp;)</code>', H.c('r', 'p &lt;&lt; cout  (weird)')], ['friend <code>operator&lt;&lt;(ostream&amp;, const Point&amp;)</code>', H.c('g', 'cout &lt;&lt; p')]])}`,
        code: R`class Point {
    int x, y;
public:
    Point(int a, int b) : x(a), y(b) {}
    friend ostream& operator<<(ostream& os, const Point& p) {
        return os << '(' << p.x << ", " << p.y << ')';   // returns os so calls can chain
    }
};
int main() {
    Point a(1, 2), b(3, 4);
    cout << a << " -> " << b << '\n';   // (1, 2) -> (3, 4)
}`
      },
      {
        title: 'Symmetric operators: 2 + v needs a non-member',
        html: `<p>With a <b>member</b> <code>operator+(const Vec&amp;)</code>, <code>v + 2</code> works (2 is converted to Vec) but <code>2 + v</code> does not — the left operand of a member call is never converted. A friend (non-member) treats both sides equally.</p>
          ${H.table(['expression', 'member operator+', 'friend operator+'], [['<code>v + w</code>', 'OK', 'OK'], ['<code>v + 2</code>', 'OK', 'OK'], ['<code>2 + v</code>', H.c('r', 'error'), H.c('g', 'OK')]])}`,
        code: R`class Vec {
    int x;
public:
    Vec(int v) : x(v) {}               // NOT explicit on purpose: allows int -> Vec
    friend Vec operator+(const Vec& a, const Vec& b) { return Vec(a.x + b.x); }
    int get() const { return x; }
};
int main() {
    Vec v(5);
    cout << (v + 2).get() << ' ' << (2 + v).get() << '\n';   // 7 7
}`
      },
      {
        title: 'friend class for tightly coupled pairs',
        html: `<p>A linked list's <code>Node</code> should not be usable on its own, so its constructor and pointers are private — and only <code>LinkedList</code> is allowed in. This keeps the internals hidden from every other class while still letting the two halves cooperate.</p>
          ${H.arr([3, 2, 1], { label: 'after push 1, 2, 3 (push front)' })}`,
        code: R`class Node {
    int val;
    Node* next;
    Node(int v, Node* n) : val(v), next(n) {}   // private: only friends may create Nodes
    friend class LinkedList;
};
class LinkedList {
    Node* head = nullptr;
public:
    void pushFront(int v) { head = new Node(v, head); }
    void print() const { for (Node* p = head; p; p = p->next) cout << p->val << ' '; cout << '\n'; }
    ~LinkedList() { while (head) { Node* n = head->next; delete head; head = n; } }
};
int main() {
    LinkedList l; l.pushFront(1); l.pushFront(2); l.pushFront(3);
    l.print();            // 3 2 1
    // Node n(5, nullptr); // error: Node::Node is private
}`
      },
      {
        title: 'Friendship is not inherited or transitive (compile check)',
        html: `<p>The commented lines are real compile errors. <code>Child</code> inherits from friend <code>Parent</code> but gets no access; <code>Buddy</code> is Parent's friend but still a stranger to <code>Secret</code>.</p>
          ${H.table(['who', 'reads Secret::v?'], [['Parent (named friend)', H.c('g', 'yes')], ['Child : Parent', H.c('r', 'no — not inherited')], ['Buddy (friend of Parent)', H.c('r', 'no — not transitive')]])}`,
        code: R`class Secret {
    int v = 42;
    friend class Parent;
};
class Parent {
    friend class Buddy;
public:
    int peek(const Secret& s) const { return s.v; }      // OK: Parent is a friend
};
class Child : public Parent {
public:
    // int peek2(const Secret& s) const { return s.v; }  // ERROR: friendship not inherited
};
class Buddy {
public:
    // int peek3(const Secret& s) const { return s.v; }  // ERROR: not transitive
};
int main() { Secret s; Child c; cout << c.peek(s) << '\n'; }   // 42 (inherited Parent::peek is fine)`
      }
    ],
    deepDive: `<p>🟣 <b>Hidden friends.</b> A friend function <i>defined</i> inside the class body is not visible to ordinary name lookup — it is found only through <b>argument-dependent lookup</b> (ADL) when one of the arguments is of that class. Benefits: it never pollutes overload sets for unrelated types (faster compiles, better error messages) and cannot be called through accidental implicit conversions of unrelated arguments. The standard library and modern guidelines recommend hidden friends for operators.</p>
      <p><b>Encapsulation math.</b> Scott Meyers' observation: encapsulation is measured by how much code can see the private data. A friend function adds exactly one function to that set — the same as adding a member function. So a well-chosen friend does not weaken encapsulation more than a member; making data <code>public</code> to avoid friendship weakens it enormously.</p>
      <p><b>Granularity.</b> You can befriend a single member function of another class (<code>friend void Auditor::check(const Money&amp;);</code> — Auditor must be fully defined first), a whole class, a function template or all specializations of a class template. For finer control, the <b>passkey idiom</b> gives one class access to just a few public-but-gated functions by requiring a token type only that class can construct.</p>
      <p><b>C++20 comparisons.</b> <code>friend bool operator==(const T&amp;, const T&amp;) = default;</code> and <code>friend auto operator&lt;=&gt;(const T&amp;, const T&amp;) = default;</code> generate member-wise comparisons, and the compiler rewrites <code>a != b</code>, <code>a &lt; b</code> etc. from them — a big reduction in boilerplate.</p>
      <p><b>Testing.</b> <code>FRIEND_TEST</code> in GoogleTest and <code>friend class FooTest;</code> exist, but needing them often signals that the class does too much. Prefer testing through the public interface; reach for friends when observing internal invariants is genuinely valuable.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> ask an assistant to "make my class printable" and it will usually produce a correct <code>operator&lt;&lt;</code>. The pitfalls are design-level: it may declare a dozen unnecessary friends, make a class friend just to avoid writing a getter, or define <code>operator+</code> as a member so <code>2 + x</code> fails.</p>
      <p><b>Use AI as a partner:</b> prompt <code>"Which of these friend declarations are unnecessary because public members already suffice?"</code> or <code>"Rewrite these comparison operators with C++20 defaulted operator== and operator&lt;=&gt;"</code>. Ask it to show which expressions (<code>2 + v</code>, <code>v + 2</code>) compile under each design, then verify with the compiler.</p>
      <p><b>What you must still own:</b> the three "nots" (inherited, transitive, mutual), why <code>operator&lt;&lt;</code> cannot be a member, and a reasoned answer to "does friend break encapsulation?" — a favourite discussion question in C++ interviews.</p>`,
    problems: [{
      title: 'Printable, Addable Money (friend operators)',
      level: 'Easy', tags: ['friend', 'operator overloading', 'encapsulation'], companies: ['Stripe', 'JPMorgan', 'PayPal'],
      statement: `<p>Implement <code>Money</code> storing private integer cents. Support <code>cout &lt;&lt; m</code> printing like <code>$12.05</code> (negative amounts as <code>-$3.10</code>), <code>a + b</code>, <code>a == b</code>, and creation via <code>Money(dollars, cents)</code>. Do not add a public getter for the raw cents.</p>`,
      constraints: `|amount| ≤ 10<sup>15</sup> cents; 0 ≤ cents argument &lt; 100.`,
      example: `<p><code>Money(12, 5) + Money(0, 95)</code> → ${H.c('g', '$13.00')}; <code>Money(-3, 10)</code> prints ${H.c('r', '-$3.10')}.</p><p>Why the padding? 5 cents must print as <b>05</b>, not 5.</p>`,
      brute: {
        why: `<p>Making <code>cents</code> public "solves" printing and adding, but now any code can write nonsense into it, and you can never change the representation (e.g. to a 128-bit integer or a currency code) without breaking every caller.</p>`,
        code: R`struct MoneyPublic {
    long long cents;      // public: anyone can corrupt or depend on it
};
void print(const MoneyPublic& m) {
    cout << '$' << m.cents / 100 << '.' << (m.cents % 100 < 10 ? "0" : "") << m.cents % 100 << '\n';
}
int main() { MoneyPublic m{1205}; m.cents = -1; print(m); }   // prints garbage like $0.0-1`
      },
      mcq: { q: 'Why make operator&lt;&lt; a friend instead of a member of Money?', options: ['Its left operand is an ostream, so it cannot be a member of Money; friend lets it read the private cents', 'Friends are faster', 'Members cannot return references', 'Because Money has no constructor'], answer: 0, explain: 'A member operator always has the class object on the LEFT. For cout &lt;&lt; m the left side is ostream, so the operator must be a non-member; friendship grants it access.' },
      hints: [
        `<p>Hint 1: three free functions need private data: <code>operator&lt;&lt;</code>, <code>operator+</code>, <code>operator==</code>. Declare them as friends inside the class.</p>`,
        `<p>Hint 2: printing: handle the sign first, then work with the absolute value: dollars = abs / 100, cents = abs % 100, pad cents to 2 digits with <code>setw(2) &lt;&lt; setfill('0')</code>.</p>`,
        `<p>Hint 3: the constructor <code>Money(d, c)</code> with negative dollars should produce <code>d*100 − c</code> (so -3,10 → -310). Return <code>os</code> from operator&lt;&lt; so <code>cout &lt;&lt; a &lt;&lt; b</code> chains.</p>`
      ],
      solution: {
        approach: `<p>Keep <code>cents</code> private. Define three hidden friends inside the class. The printer handles the sign separately so negative values print correctly, and restores the stream's fill character afterwards.</p>`,
        code: R`#include <iostream>
#include <iomanip>
#include <cstdlib>
using namespace std;

class Money {
    long long cents;
public:
    Money(long long dollars, long long c) : cents(dollars < 0 ? dollars * 100 - c : dollars * 100 + c) {}

    friend ostream& operator<<(ostream& os, const Money& m) {
        long long a = llabs(m.cents);
        if (m.cents < 0) os << '-';
        char old = os.fill('0');                       // remember the fill char
        os << '$' << a / 100 << '.' << setw(2) << a % 100;
        os.fill(old);                                  // restore for later output
        return os;
    }
    friend Money operator+(const Money& x, const Money& y) {
        Money r(0, 0);
        r.cents = x.cents + y.cents;
        return r;
    }
    friend bool operator==(const Money& x, const Money& y) { return x.cents == y.cents; }
};

int main() {
    Money a(12, 5), b(0, 95), c(-3, 10);
    cout << a + b << ' ' << c << ' ' << boolalpha << (a + b == Money(13, 0)) << '\n';
    // $13.00 -$3.10 true
}`,
        dry: { head: ['expression', 'cents', 'printed'], rows: [
          ['Money(12, 5)', '1205', '$12.05'],
          ['Money(0, 95)', '95', '$0.95'],
          ['a + b', '1300', '<span class="c-g">$13.00</span>'],
          ['Money(-3, 10)', '-310', '<span class="c-r">-$3.10</span>']
        ] },
        complexity: `<p>All operations O(1).</p>`,
        followUps: ['Add operator&lt;=&gt; with = default.', 'Support a currency code and refuse to add different currencies.', 'Handle overflow near the 64-bit limit.']
      }
    }]
  });

  /* ================= PRACTICE: Easy ================= */
  practice.push({
    title: 'Rectangle Class with Validation',
    level: 'Easy', tags: ['class design', 'encapsulation', 'const methods'], companies: ['Infosys', 'TCS', 'Amazon'],
    statement: `<p>Design class <code>Rectangle</code> with private width and height (positive integers). Provide a constructor that rejects non-positive sides (clamp them to 1), <code>area()</code>, <code>perimeter()</code>, <code>isSquare()</code>, and <code>scale(k)</code> that multiplies both sides by k only if k &gt; 0 (returns bool). Read-only functions must be <code>const</code>.</p>`,
    constraints: `1 ≤ sides ≤ 10<sup>6</sup>; area fits in <code>long long</code>.`,
    example: `<p>Rectangle(3, 4): area ${H.c('g', '12')}, perimeter ${H.c('g', '14')}, isSquare ${H.c('r', 'false')}. scale(2) → 6×8, area 48. Rectangle(-5, 2) → clamped to 1×2.</p>`,
    brute: {
      why: `<p>A struct with public <code>w, h</code> and free functions works for the happy path, but nothing prevents <code>r.w = -5</code>, so every function must re-validate (or silently compute a negative area). The rule lives everywhere instead of in one place.</p>`,
      code: R`struct RectRaw { int w, h; };
long long area(const RectRaw& r) { return 1LL * r.w * r.h; }
int main() { RectRaw r{3, 4}; r.w = -5; cout << area(r) << '\n'; }   // -20: invariant broken`
    },
    mcq: { q: 'Which member functions should be marked const?', options: ['area, perimeter and isSquare', 'scale only', 'All of them, including scale', 'None — const is optional style'], answer: 0, explain: 'Functions that only read state should be const so they can be called on const Rectangles; scale modifies the object so it cannot be const.' },
    hints: [
      `<p>Hint 1: the invariant is "both sides ≥ 1". Enforce it in the constructor and in every function that changes the sides.</p>`,
      `<p>Hint 2: use <code>long long</code> for area to avoid overflow (10<sup>6</sup> × 10<sup>6</sup> = 10<sup>12</sup>).</p>`,
      `<p>Hint 3: <code>scale</code> should return false for k ≤ 0 and leave the object unchanged. Mark read-only functions <code>const</code>.</p>`
    ],
    solution: {
      approach: `<p>Private data, a validating constructor (clamping with <code>max(1, x)</code>), const accessors, and a validating mutator. All checks live inside the class.</p>`,
      code: R`#include <iostream>
#include <algorithm>
using namespace std;

class Rectangle {
    long long w, h;                                    // invariant: w >= 1, h >= 1
public:
    Rectangle(long long width, long long height)
        : w(max(1LL, width)), h(max(1LL, height)) {}
    long long area() const { return w * h; }
    long long perimeter() const { return 2 * (w + h); }
    bool isSquare() const { return w == h; }
    bool scale(long long k) {
        if (k <= 0) return false;                     // would break the invariant
        w *= k; h *= k;
        return true;
    }
};

int main() {
    Rectangle r(3, 4);
    cout << r.area() << ' ' << r.perimeter() << ' ' << boolalpha << r.isSquare() << '\n';  // 12 14 false
    r.scale(2);
    cout << r.area() << '\n';                         // 48
    Rectangle bad(-5, 2);
    cout << bad.area() << '\n';                       // 2
}`,
      dry: { head: ['call', 'w', 'h', 'result'], rows: [['Rectangle(3,4)', '3', '4', '-'], ['area()', '3', '4', '12'], ['scale(2)', '6', '8', 'true'], ['Rectangle(-5,2)', '1', '2', 'clamped']] },
      complexity: `<p>O(1) for every operation.</p>`,
      followUps: ['Throw std::invalid_argument instead of clamping — when is each better?', 'Add operator== with C++20 = default.']
    }
  });

  practice.push({
    title: 'Predict the Output: Letters In, Capitals Out',
    level: 'Easy', tags: ['predict the output', 'constructor', 'destructor'], companies: ['Samsung', 'Qualcomm'],
    statement: `<p><code>P</code> prints its lowercase letter in the constructor and the uppercase letter in the destructor. Predict the output:</p>
      <pre>struct P {
    char c;
    P(char x) : c(x) { cout &lt;&lt; c; }
    ~P() { cout &lt;&lt; (char)toupper(c); }
};
int main() { P a('a'); P b('b'); { P c('c'); } P d('d'); }</pre>`,
    constraints: `Output is one line with no spaces.`,
    example: `<p>Answer: ${H.c('g', 'abcCdDBA')}. Lowercase = born, uppercase = died. ${H.c('y', 'c')} dies at its inner <code>}</code> before d is born; at the end the rest die newest-first: D, B, A.</p>`,
    brute: {
      why: `<p>Guessing "objects die in the order they were declared" gives <code>abcCdABD</code> — wrong. The safe brute force is to run it, which you cannot do in an interview. Use the stack rule instead.</p>`,
      code: R`struct P {
    char c;
    P(char x) : c(x) { cout << c; }
    ~P() { cout << (char)toupper(c); }
};
int main() { P a('a'); P b('b'); { P c('c'); } P d('d'); cout << '\n'; }`
    },
    mcq: { q: 'Which object is destroyed LAST?', options: ['a', 'b', 'c', 'd'], answer: 0, explain: 'a was constructed first in main\'s scope, so it is destroyed last (LIFO).' },
    hints: [
      `<p>Hint 1: treat each scope as a stack of plates.</p>`,
      `<p>Hint 2: the inner block <code>{ P c('c'); }</code> finishes completely (born and destroyed) before <code>d</code> is constructed.</p>`,
      `<p>Hint 3: at the end of main, the remaining stack is a, b, d (bottom → top); pop from the top.</p>`
    ],
    solution: {
      approach: `<p>Construct a, b; inner block constructs and destroys c; construct d; end of main destroys d, b, a. Concatenate: <b>abcCdDBA</b>.</p>`,
      code: R`#include <iostream>
#include <cctype>
using namespace std;

struct P {
    char c;
    P(char x) : c(x) { cout << c; }
    ~P() { cout << (char)toupper(c); }
};
int main() {
    P a('a');
    P b('b');
    { P c('c'); }      // c born and dies here
    P d('d');
}                      // d, b, a die
// Output: abcCdDBA`,
      dry: { head: ['event', 'stack after', 'output so far'], rows: [['P a', 'a', 'a'], ['P b', 'a b', 'ab'], ['block: c born/dies', 'a b', 'abcC'], ['P d', 'a b d', 'abcCd'], ['end of main', '(empty)', 'abcCdDBA']] },
      complexity: `<p>O(1) to run; reasoning is linear in the number of objects you track.</p>`,
      followUps: ['What if d were declared static?', 'What if b were created with new and never deleted?']
    }
  });

  practice.push({
    title: 'Count the Widgets (static counters)',
    level: 'Easy', tags: ['static members', 'constructor', 'destructor'], companies: ['Microsoft', 'Adobe'],
    statement: `<p>Write class <code>Widget</code> so that <code>Widget::alive()</code> returns how many Widgets currently exist and <code>Widget::total()</code> how many were ever created. Both are static functions callable with zero objects alive.</p>`,
    constraints: `Single-threaded. Copies count as new Widgets.`,
    example: `<p>Create 3 widgets, destroy 1 → alive ${H.c('b', '2')}, total ${H.c('b', '3')}. With no widgets at program start: alive 0, total 0.</p>`,
    brute: {
      why: `<p>Keeping a global counter and asking every caller to increment/decrement it manually is fragile: one forgotten line and the count drifts. Constructors and destructors run automatically, so the class should do it itself.</p>`,
      code: R`int widgetsAlive = 0;                 // global, updated by hand
struct WidgetManual { };
int main() {
    WidgetManual a; ++widgetsAlive;
    WidgetManual b;                    // forgot ++ here: count is now wrong
    cout << widgetsAlive << '\n';      // 1 (should be 2)
}`
    },
    mcq: { q: 'Where must --aliveCount go?', options: ['In the destructor', 'In the constructor', 'In main after each scope', 'In a static function called by users'], answer: 0, explain: 'The destructor runs automatically exactly once per object at the end of its lifetime.' },
    hints: [
      `<p>Hint 1: two <code>inline static int</code> members: aliveCount and totalCount.</p>`,
      `<p>Hint 2: increment both in every constructor — including the copy constructor, which you must write yourself.</p>`,
      `<p>Hint 3: decrement aliveCount in the destructor; static functions return the values.</p>`
    ],
    solution: {
      approach: `<p>Static data members hold the shared counts; constructors and the destructor update them automatically; static member functions expose them.</p>`,
      code: R`#include <iostream>
using namespace std;

class Widget {
    inline static int aliveCount = 0;
    inline static int totalCount = 0;
public:
    Widget() { ++aliveCount; ++totalCount; }
    Widget(const Widget&) { ++aliveCount; ++totalCount; }   // copies are new widgets
    ~Widget() { --aliveCount; }
    static int alive() { return aliveCount; }
    static int total() { return totalCount; }
};

int main() {
    cout << Widget::alive() << ' ' << Widget::total() << '\n';   // 0 0
    Widget a, b;
    { Widget c = a; }
    cout << Widget::alive() << ' ' << Widget::total() << '\n';   // 2 3
}`,
      dry: { head: ['event', 'alive', 'total'], rows: [['start', '0', '0'], ['Widget a, b', '2', '2'], ['copy c = a', '3', '3'], ['c destroyed', '2', '3']] },
      complexity: `<p>O(1) per event and query.</p>`,
      followUps: ['Make the counters std::atomic for multithreaded use.', 'What about move construction?']
    }
  });

  practice.push({
    title: 'Temperature with a Physical Invariant',
    level: 'Easy', tags: ['encapsulation', 'invariants', 'static factory'], companies: ['Bosch', 'Siemens'],
    statement: `<p>Write class <code>Temperature</code> storing Kelvin internally. It must never go below absolute zero (0 K). Provide static factories <code>fromCelsius(c)</code> and <code>fromKelvin(k)</code> returning <code>std::optional&lt;Temperature&gt;</code> (empty if invalid), getters <code>celsius()</code> and <code>kelvin()</code>, and <code>bool warmBy(double d)</code> that refuses changes that would go below 0 K.</p>`,
    constraints: `Values within ±10<sup>6</sup>; use double.`,
    example: `<p>fromCelsius(25) → ${H.c('g', '298.15 K')}. fromCelsius(-300) → ${H.c('r', 'empty optional')} (would be −26.85 K). warmBy(−400) on 298.15 K → ${H.c('r', 'false')}, unchanged.</p>`,
    brute: {
      why: `<p>A public <code>double celsius</code> field lets anyone set −500 °C. Validating only in the constructor is not enough either if there is a public setter without checks.</p>`,
      code: R`struct TempRaw { double celsius; };
int main() { TempRaw t{25}; t.celsius = -500; cout << t.celsius << '\n'; }   // physically impossible`
    },
    mcq: { q: 'Why use static factory functions returning optional instead of a public constructor?', options: ['They can report "invalid input" without exceptions and give the units a clear name', 'Constructors cannot take doubles', 'Static functions are faster', 'optional is required for classes'], answer: 0, explain: 'A constructor cannot return "nothing"; a named static factory can return an empty optional and also documents the unit (Celsius vs Kelvin).' },
    hints: [
      `<p>Hint 1: store a single canonical unit (Kelvin) — conversions happen at the edges.</p>`,
      `<p>Hint 2: make the constructor private so the only way in is through the validating factories.</p>`,
      `<p>Hint 3: <code>warmBy</code> computes the new value first, checks ≥ 0, then commits. Celsius = Kelvin − 273.15.</p>`
    ],
    solution: {
      approach: `<p>Private constructor + static factories that validate and return <code>optional</code>; every mutator checks the invariant before committing.</p>`,
      code: R`#include <iostream>
#include <optional>
using namespace std;

class Temperature {
    double k;                                          // invariant: k >= 0
    explicit Temperature(double kelvin) : k(kelvin) {}
public:
    static optional<Temperature> fromKelvin(double kv) {
        if (kv < 0) return nullopt;
        return Temperature(kv);
    }
    static optional<Temperature> fromCelsius(double c) { return fromKelvin(c + 273.15); }
    double kelvin() const { return k; }
    double celsius() const { return k - 273.15; }
    bool warmBy(double d) {
        if (k + d < 0) return false;                  // refuse to break physics
        k += d;
        return true;
    }
};

int main() {
    auto t = Temperature::fromCelsius(25);
    auto bad = Temperature::fromCelsius(-300);
    cout << t->kelvin() << ' ' << boolalpha << bad.has_value() << '\n';   // 298.15 false
    cout << t->warmBy(-400) << ' ' << t->celsius() << '\n';               // false 25
}`,
      dry: { head: ['call', 'kelvin', 'result'], rows: [['fromCelsius(25)', '298.15', 'valid'], ['fromCelsius(-300)', '-26.85', 'nullopt'], ['warmBy(-400)', '298.15', 'false'], ['celsius()', '298.15', '25']] },
      complexity: `<p>O(1) for every operation.</p>`,
      followUps: ['Add fromFahrenheit.', 'Should equality compare doubles exactly? Discuss epsilon.']
    }
  });

  /* ================= PRACTICE: Medium ================= */
  practice.push({
    title: 'Predict the Output: Heap, Arrays and Temporaries',
    level: 'Medium', tags: ['predict the output', 'lifetime', 'new/delete'], companies: ['Nvidia', 'Arm', 'Bloomberg'],
    statement: `<p>Predict the output:</p>
      <pre>struct N {
    int id;
    N(int i) : id(i) { cout &lt;&lt; '+' &lt;&lt; id &lt;&lt; ' '; }
    ~N() { cout &lt;&lt; '-' &lt;&lt; id &lt;&lt; ' '; }
};
int main() {
    N* h = new N(0);
    N arr[2] = {N(1), N(2)};
    N(3);
    { N a(4); delete h; }
    cout &lt;&lt; "| ";
}</pre>`,
    constraints: `C++17 or later (guaranteed copy elision for the array elements).`,
    example: `<p>Answer: ${H.c('g', '+0 +1 +2 +3 -3 +4 -0 -4 | -2 -1')}</p><p>The heap object dies exactly at ${H.c('r', 'delete')}, the temporary dies at its own semicolon, and the array dies in reverse index order at the end of main.</p>`,
    brute: {
      why: `<p>A common wrong answer puts <code>-0</code> at the very end ("heap objects are cleaned up at the end of main") and destroys the array as -1 -2. Rules beat guesses: heap lifetime is controlled only by delete; arrays reverse.</p>`,
      code: R`struct N {
    int id;
    N(int i) : id(i) { cout << '+' << id << ' '; }
    ~N() { cout << '-' << id << ' '; }
};
int main() {
    N* h = new N(0);   // naive belief: "destroyed automatically at end of main" (false!)
    cout << "| ";
    delete h;          // without this line, -0 would NEVER print
}`
    },
    mcq: { q: 'When is the object created by N(3); destroyed?', options: ['Immediately, at the end of that statement', 'At the end of main', 'Never', 'When arr is destroyed'], answer: 0, explain: 'N(3) is an unnamed temporary; temporaries die at the end of the full expression.' },
    hints: [
      `<p>Hint 1: classify each object: heap (h), array elements (arr[0], arr[1]), temporary (N(3)), local in an inner block (a).</p>`,
      `<p>Hint 2: inside the block, a is born, then <code>delete h</code> runs (printing -0) while a is still alive, then a dies at the brace.</p>`,
      `<p>Hint 3: after "| ", only the array remains: elements die from the highest index down.</p>`
    ],
    solution: {
      approach: `<p>+0 (new), +1 +2 (array in index order), +3 -3 (temporary), +4 (block local), -0 (delete inside block), -4 (block ends), "| ", -2 -1 (array reverse).</p>`,
      code: R`#include <iostream>
using namespace std;

struct N {
    int id;
    N(int i) : id(i) { cout << '+' << id << ' '; }
    ~N() { cout << '-' << id << ' '; }
};
int main() {
    N* h = new N(0);              // +0  heap
    N arr[2] = {N(1), N(2)};      // +1 +2  built in place (C++17)
    N(3);                         // +3 -3  temporary
    {
        N a(4);                   // +4
        delete h;                 // -0  heap object dies NOW
    }                             // -4
    cout << "| ";
}                                 // -2 -1
// Output: +0 +1 +2 +3 -3 +4 -0 -4 | -2 -1`,
      dry: { head: ['line', 'printed'], rows: [['new N(0)', '+0'], ['arr', '+1 +2'], ['N(3);', '+3 -3'], ['block', '+4 -0 -4'], ['cout', '|'], ['end of main', '-2 -1']] },
      complexity: `<p>O(1) to run; reasoning is linear in the number of objects you track.</p>`,
      followUps: ['Rewrite with std::unique_ptr so -0 cannot be forgotten.', 'Careful: what does N(x); mean if x is a variable name?']
    }
  });

  practice.push({
    title: 'Fixed-Capacity Stack Class',
    level: 'Medium', tags: ['class design', 'encapsulation', 'array'], companies: ['Amazon', 'Cisco', 'Oracle'],
    statement: `<p>Implement <code>BoundedStack</code> holding at most <code>cap</code> ints (cap given at construction, ≤ 1000). Operations: <code>bool push(int)</code> (false if full), <code>bool pop()</code> (false if empty), <code>optional&lt;int&gt; top() const</code>, <code>int size() const</code>, <code>bool full() const</code>. Internal storage must not be reachable from outside.</p>`,
    constraints: `1 ≤ cap ≤ 1000; up to 10<sup>5</sup> operations; each O(1).`,
    example: `<p>cap = 2: push(1) ${H.c('g', 'true')}, push(2) ${H.c('g', 'true')}, push(3) ${H.c('r', 'false')} (full), top() = 2, pop(), top() = 1.</p>`,
    brute: {
      why: `<p>Using a public <code>vector&lt;int&gt;</code> and letting callers push directly ignores the capacity and allows inserting in the middle — not a stack anymore. Each caller re-implements the checks.</p>`,
      code: R`struct OpenStack { vector<int> data; int cap = 2; };
int main() {
    OpenStack s;
    s.data.push_back(1); s.data.push_back(2); s.data.push_back(3);   // capacity ignored
    s.data.insert(s.data.begin(), 99);                                // not even LIFO
    cout << s.data.size() << '\n';                                     // 4
}`
    },
    mcq: { q: 'What should top() return on an empty stack in this design?', options: ['An empty std::optional', 'Garbage from data[-1]', '0', 'Throw always'], answer: 0, explain: 'optional makes "no value" explicit and checkable without undefined behaviour; 0 is ambiguous with a real value.' },
    hints: [
      `<p>Hint 1: private <code>std::array&lt;int, 1000&gt;</code> (or a vector reserved once) plus an <code>int n</code> for the current size.</p>`,
      `<p>Hint 2: invariant 0 ≤ n ≤ cap. push checks n &lt; cap; pop checks n &gt; 0.</p>`,
      `<p>Hint 3: clamp cap into [1, 1000] in the constructor; mark size/full/top const.</p>`
    ],
    solution: {
      approach: `<p>Encapsulate a fixed array and a count. All bounds checks live in push/pop/top; the class guarantees LIFO and capacity.</p>`,
      code: R`#include <iostream>
#include <array>
#include <optional>
#include <algorithm>
using namespace std;

class BoundedStack {
    static constexpr int MAX = 1000;
    array<int, MAX> data{};
    int n = 0;                 // invariant: 0 <= n <= cap
    int cap;
public:
    explicit BoundedStack(int capacity) : cap(clamp(capacity, 1, MAX)) {}
    bool push(int x) {
        if (n == cap) return false;
        data[n++] = x;
        return true;
    }
    bool pop() {
        if (n == 0) return false;
        --n;
        return true;
    }
    optional<int> top() const { return n ? optional<int>(data[n - 1]) : nullopt; }
    int size() const { return n; }
    bool full() const { return n == cap; }
};

int main() {
    BoundedStack s(2);
    cout << boolalpha << s.push(1) << ' ' << s.push(2) << ' ' << s.push(3) << '\n';  // true true false
    cout << *s.top() << ' ';     // 2
    s.pop();
    cout << *s.top() << ' ' << s.size() << '\n';   // 1 1
}`,
      dry: { head: ['op', 'n', 'result'], rows: [['push(1)', '1', 'true'], ['push(2)', '2', 'true'], ['push(3)', '2', 'false (full)'], ['pop()', '1', 'true'], ['top()', '1', '1']] },
      complexity: `<p>O(1) per operation; O(MAX) memory per object (consider a heap buffer for large caps).</p>`,
      followUps: ['Make it a template BoundedStack&lt;T, N&gt;.', 'Add getMin() in O(1).']
    }
  });

  practice.push({
    title: 'Fluent Pizza Order Builder',
    level: 'Medium', tags: ['this', 'method chaining', 'validation'], companies: ['Uber', 'Swiggy', 'DoorDash'],
    statement: `<p>Create <code>PizzaOrder</code> with chainable setters <code>size(char)</code> ('S','M','L'), <code>addTopping(string)</code> (max 5, duplicates ignored), <code>extraCheese()</code>, and <code>int price() const</code>: S=200, M=300, L=400, +40 per topping, +50 for extra cheese. Invalid sizes are ignored. All setters must be chainable on the SAME object.</p>`,
    constraints: `≤ 20 chained calls.`,
    example: `<p><code>o.size('L').addTopping("olive").addTopping("corn").addTopping("olive").extraCheese()</code> → toppings {olive, corn} → 400 + 80 + 50 = ${H.c('g', '530')}.</p>`,
    brute: {
      why: `<p>Returning <code>PizzaOrder</code> by value makes every link operate on a new copy; the original only gets the first setting. Price comes out as if most of the chain never happened.</p>`,
      code: R`struct PizzaCopy {
    int base = 200; int toppings = 0;
    PizzaCopy large() { base = 400; return *this; }        // returns a COPY
    PizzaCopy topping() { ++toppings; return *this; }
    int price() const { return base + 40 * toppings; }
};
int main() {
    PizzaCopy p;
    p.large().topping().topping();   // toppings went to temporaries
    cout << p.price() << '\n';       // 400, not 480
}`
    },
    mcq: { q: 'Which return type makes o.size(\'L\').extraCheese() modify o?', options: ['PizzaOrder&amp;', 'PizzaOrder', 'void', 'const PizzaOrder'], answer: 0, explain: 'Return *this by non-const reference so the next call acts on the same object.' },
    hints: [
      `<p>Hint 1: every setter ends with <code>return *this;</code> and returns <code>PizzaOrder&amp;</code>.</p>`,
      `<p>Hint 2: store toppings in a <code>vector&lt;string&gt;</code>; check with <code>find</code> before inserting and stop at 5.</p>`,
      `<p>Hint 3: price() is const and computes from the stored state; unknown sizes leave the old size.</p>`
    ],
    solution: {
      approach: `<p>Each setter validates, updates and returns <code>*this</code> by reference; <code>price()</code> is a const query.</p>`,
      code: R`#include <iostream>
#include <string>
#include <vector>
#include <algorithm>
using namespace std;

class PizzaOrder {
    char sz = 'M';
    vector<string> toppings;
    bool cheese = false;
public:
    PizzaOrder& size(char s) {
        if (s == 'S' || s == 'M' || s == 'L') sz = s;   // ignore invalid sizes
        return *this;
    }
    PizzaOrder& addTopping(const string& t) {
        if (toppings.size() < 5 && find(toppings.begin(), toppings.end(), t) == toppings.end())
            toppings.push_back(t);
        return *this;
    }
    PizzaOrder& extraCheese() { cheese = true; return *this; }
    int price() const {
        int base = sz == 'S' ? 200 : sz == 'M' ? 300 : 400;
        return base + 40 * (int)toppings.size() + (cheese ? 50 : 0);
    }
};

int main() {
    PizzaOrder o;
    o.size('L').addTopping("olive").addTopping("corn").addTopping("olive").extraCheese();
    cout << o.price() << '\n';   // 530
}`,
      dry: { head: ['call', 'state', 'price so far'], rows: [['size(\'L\')', 'L', '400'], ['addTopping(olive)', 'L [olive]', '440'], ['addTopping(corn)', 'L [olive, corn]', '480'], ['addTopping(olive)', 'duplicate ignored', '480'], ['extraCheese()', 'cheese', '530']] },
      complexity: `<p>addTopping O(5) = O(1); others O(1).</p>`,
      followUps: ['Add a build() that returns an immutable Pizza object.', 'Make the setters usable on temporaries with C++23 deducing this.']
    }
  });

  practice.push({
    title: 'Employee and Manager (inheritance basics)',
    level: 'Medium', tags: ['inheritance', 'base constructor', 'protected'], companies: ['Accenture', 'Deloitte', 'Microsoft'],
    statement: `<p>Write <code>Employee</code> (name, salary; <code>describe()</code> returns <code>"Asha earns 50000"</code>) and <code>Manager : public Employee</code> with a team size and a bonus of 10% of salary per 5 team members (integer division). <code>Manager::describe()</code> must reuse <code>Employee::describe()</code> and append <code>" + bonus B, team T"</code>. Salary is protected so Manager can compute the bonus; name stays private.</p>`,
    constraints: `0 ≤ team ≤ 1000; salary ≤ 10<sup>9</sup>.`,
    example: `<p>Manager("Ravi", 100000, 12) → 12 / 5 = 2 steps → bonus 2 × 10% × 100000 = ${H.c('g', '20000')}. describe() → "Ravi earns 100000 + bonus 20000, team 12".</p>`,
    brute: {
      why: `<p>Copy-pasting Employee's fields and describe logic into an unrelated Manager class duplicates code: a later change (e.g. currency formatting) must be made twice, and a Manager cannot be passed where an Employee is expected.</p>`,
      code: R`struct ManagerCopy {                    // duplicated instead of inherited
    string name; long long salary; int team;
    string describe() const { return name + " earns " + to_string(salary) + ", team " + to_string(team); }
};
int main() { ManagerCopy m{"Ravi", 100000, 12}; cout << m.describe() << '\n'; }`
    },
    mcq: { q: 'How does Manager\'s constructor set name and salary, given name is private in Employee?', options: ['By calling Employee(name, salary) in its initializer list', 'By assigning name = n in its body', 'By making Manager a friend automatically', 'It cannot'], answer: 0, explain: 'The base constructor initialises the base subobject; derived classes pass arguments to it through the initializer list.' },
    hints: [
      `<p>Hint 1: <code>Manager(string n, long long s, int t) : Employee(n, s), team(t) {}</code>.</p>`,
      `<p>Hint 2: inside Manager, call the base version explicitly with <code>Employee::describe()</code> — a plain <code>describe()</code> would recurse into Manager's own.</p>`,
      `<p>Hint 3: bonus = (team / 5) × salary / 10. Use long long.</p>`
    ],
    solution: {
      approach: `<p>Public inheritance (a Manager is an Employee), base constructor invoked from the initializer list, protected salary for the bonus formula, and explicit qualification to reuse the base description.</p>`,
      code: R`#include <iostream>
#include <string>
using namespace std;

class Employee {
    string name;
protected:
    long long salary;
public:
    Employee(string n, long long s) : name(n), salary(s) {}
    string describe() const { return name + " earns " + to_string(salary); }
};

class Manager : public Employee {
    int team;
public:
    Manager(string n, long long s, int t) : Employee(n, s), team(t) {}
    long long bonus() const { return (team / 5) * salary / 10; }   // salary is protected
    string describe() const {                                       // hides Employee::describe
        return Employee::describe() + " + bonus " + to_string(bonus()) + ", team " + to_string(team);
    }
};

int main() {
    Employee e("Asha", 50000);
    Manager m("Ravi", 100000, 12);
    cout << e.describe() << '\n';   // Asha earns 50000
    cout << m.describe() << '\n';   // Ravi earns 100000 + bonus 20000, team 12
    const Employee& asBase = m;
    cout << asBase.describe() << '\n';   // Ravi earns 100000  (no virtual yet!)
}`,
      dry: { head: ['step', 'value'], rows: [['Employee("Ravi",100000)', 'base part built'], ['team = 12', 'member built'], ['bonus()', '(12/5)=2 → 2×100000/10 = 20000'], ['describe()', 'base text + " + bonus 20000, team 12"']] },
      complexity: `<p>O(length of the strings) for describe; O(1) otherwise.</p>`,
      followUps: ['Why does asBase.describe() print the Employee version? (preview: virtual)', 'Should salary be protected data or should Employee offer a protected getter?']
    }
  });

  practice.push({
    title: 'Fraction Class with friend Operators',
    level: 'Medium', tags: ['friend', 'operator overloading', 'invariants', 'gcd'], companies: ['Google', 'Jane Street', 'Microsoft'],
    statement: `<p>Implement <code>Fraction</code> that is always stored in lowest terms with a positive denominator. Support <code>+</code>, <code>*</code>, <code>==</code> and <code>cout &lt;&lt; f</code> (prints <code>3/4</code>, or just <code>2</code> when the denominator is 1). <code>2 + f</code> must also compile. A zero denominator throws <code>std::invalid_argument</code>.</p>`,
    constraints: `Numerators/denominators fit in long long after reduction; use std::gcd.`,
    example: `<p>Fraction(2, -4) is stored as ${H.c('g', '-1/2')}. 1/2 + 1/3 = ${H.c('g', '5/6')}. 2 + 1/2 = ${H.c('g', '5/2')}. 3/4 × 4/3 prints ${H.c('g', '1')}.</p>`,
    brute: {
      why: `<p>Storing numerator and denominator without normalising makes equality wrong (1/2 vs 2/4 compare unequal) and numbers grow quickly toward overflow after a few additions. Making the operators members also breaks <code>2 + f</code>.</p>`,
      code: R`struct RawFrac {
    long long n, d;
    RawFrac operator+(const RawFrac& o) const { return {n * o.d + o.n * d, d * o.d}; }  // never reduced
    bool operator==(const RawFrac& o) const { return n == o.n && d == o.d; }
};
int main() {
    RawFrac a{1, 2}, b{2, 4};
    cout << boolalpha << (a == b) << '\n';   // false, although 1/2 == 2/4
}`
    },
    mcq: { q: 'Why must operator+ be a non-member for 2 + f to compile?', options: ['The left operand of a member operator is never implicitly converted; a non-member allows converting 2 to Fraction', 'Members cannot be operators', 'Because Fraction has a destructor', 'Non-members are inlined'], answer: 0, explain: 'For a member, 2 + f would need int::operator+(Fraction). A non-member (friend) operator+(Fraction, Fraction) lets the implicit Fraction(long long) constructor convert the 2.' },
    hints: [
      `<p>Hint 1: a private <code>normalize()</code> called by the constructor: divide by gcd, move the sign to the numerator.</p>`,
      `<p>Hint 2: allow implicit construction from an integer: <code>Fraction(long long n, long long d = 1)</code> (intentionally not explicit).</p>`,
      `<p>Hint 3: hidden friend operators: a/b + c/d = (ad + cb)/bd, then the constructor normalises. Equality is member-wise once normalised.</p>`
    ],
    solution: {
      approach: `<p>The invariant "lowest terms, positive denominator" is established in the only constructor, so every Fraction — including results of operators, which construct new Fractions — is canonical. Equality is then trivial. Friend operators give symmetric conversions.</p>`,
      code: R`#include <iostream>
#include <numeric>
#include <stdexcept>
using namespace std;

class Fraction {
    long long num, den;                         // invariant: gcd(|num|, den) == 1, den > 0
    void normalize() {
        if (den == 0) throw invalid_argument("zero denominator");
        if (den < 0) { num = -num; den = -den; }
        long long g = gcd(num, den);            // std::gcd works on absolute values
        if (g) { num /= g; den /= g; }
    }
public:
    Fraction(long long n, long long d = 1) : num(n), den(d) { normalize(); }  // implicit from int on purpose

    friend Fraction operator+(const Fraction& a, const Fraction& b) {
        return Fraction(a.num * b.den + b.num * a.den, a.den * b.den);
    }
    friend Fraction operator*(const Fraction& a, const Fraction& b) {
        return Fraction(a.num * b.num, a.den * b.den);
    }
    friend bool operator==(const Fraction& a, const Fraction& b) {
        return a.num == b.num && a.den == b.den;   // valid because both are normalised
    }
    friend ostream& operator<<(ostream& os, const Fraction& f) {
        os << f.num;
        if (f.den != 1) os << '/' << f.den;
        return os;
    }
};

int main() {
    Fraction a(2, -4), b(1, 3);
    cout << a << ' ' << Fraction(1, 2) + b << ' ' << 2 + Fraction(1, 2) << ' ' << Fraction(3, 4) * Fraction(4, 3) << '\n';
    // -1/2 5/6 5/2 1
    cout << boolalpha << (Fraction(1, 2) == Fraction(2, 4)) << '\n';   // true
}`,
      dry: { head: ['expression', 'raw', 'gcd', 'stored'], rows: [['Fraction(2,-4)', '-2/4', '2', '-1/2'], ['1/2 + 1/3', '5/6', '1', '5/6'], ['2 + 1/2', '(2·2+1·1)/2 = 5/2', '1', '5/2'], ['3/4 × 4/3', '12/12', '12', '1']] },
      complexity: `<p>O(log min(n, d)) per operation for gcd.</p>`,
      followUps: ['Reduce cross terms before multiplying to delay overflow.', 'Add C++20 operator&lt;=&gt; that compares a/b vs c/d with cross multiplication.']
    }
  });

  practice.push({
    title: 'Validated Date with nextDay()',
    level: 'Medium', tags: ['class design', 'invariants', 'static helpers'], companies: ['Expedia', 'Booking.com', 'Oracle'],
    statement: `<p>Design <code>Date</code> (year, month, day). The static factory <code>Date::make(y, m, d)</code> returns <code>optional&lt;Date&gt;</code> and rejects invalid dates (Feb 30, month 13, Feb 29 on non-leap years). Provide <code>nextDay()</code> (returns a new Date), <code>operator&lt;</code> and <code>operator&lt;&lt;</code> printing <code>YYYY-MM-DD</code>. Use a static helper <code>daysInMonth(y, m)</code>.</p>`,
    constraints: `1 ≤ year ≤ 9999; Gregorian leap rule: divisible by 4 and not by 100, or divisible by 400.`,
    example: `<p>make(2024, 2, 29) ${H.c('g', 'valid')} (2024 is leap); make(2023, 2, 29) ${H.c('r', 'invalid')}; make(1900, 2, 29) ${H.c('r', 'invalid')} (divisible by 100, not 400). nextDay(2024-12-31) = ${H.c('g', '2025-01-01')}.</p>`,
    brute: {
      why: `<p>A struct with public fields lets <code>Date{2023, 2, 31}</code> exist, and every function must defensively re-check. Converting each date to "days since year 1" with a day-by-day loop to add one day is also needlessly O(days).</p>`,
      code: R`struct RawDate { int y, m, d; };
int main() {
    RawDate bad{2023, 2, 31};   // nonsense date, nothing stops it
    cout << bad.y << '-' << bad.m << '-' << bad.d << '\n';
}`
    },
    mcq: { q: 'Why is daysInMonth a good static member function?', options: ['It depends only on its arguments (year, month), not on any particular Date object', 'Static functions can modify private members of every Date', 'Non-static functions cannot return int', 'It must be static to be called from the constructor'], answer: 0, explain: 'No this is needed: it is a class-related utility that does not read object state, so static is the honest signature.' },
    hints: [
      `<p>Hint 1: <code>static bool isLeap(int y)</code> and <code>static int daysInMonth(int y, int m)</code> with a table {31,28,31,30,31,30,31,31,30,31,30,31}, adding 1 for leap Februaries.</p>`,
      `<p>Hint 2: make the constructor private; <code>make</code> validates and returns nullopt for bad input.</p>`,
      `<p>Hint 3: nextDay: d+1; if it exceeds daysInMonth → day 1 of next month; if month exceeds 12 → Jan 1 of next year. Compare with <code>tie(y, m, d) &lt; tie(o.y, o.m, o.d)</code>.</p>`
    ],
    solution: {
      approach: `<p>Validation in one static factory makes invalid Dates unrepresentable. nextDay builds the successor directly with O(1) carry logic. friend operators handle comparison and printing.</p>`,
      code: R`#include <iostream>
#include <iomanip>
#include <optional>
#include <tuple>
using namespace std;

class Date {
    int y, m, d;
    Date(int yy, int mm, int dd) : y(yy), m(mm), d(dd) {}     // private: only valid dates
public:
    static bool isLeap(int yy) { return (yy % 4 == 0 && yy % 100 != 0) || yy % 400 == 0; }
    static int daysInMonth(int yy, int mm) {
        static const int days[12] = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
        return days[mm - 1] + (mm == 2 && isLeap(yy) ? 1 : 0);
    }
    static optional<Date> make(int yy, int mm, int dd) {
        if (yy < 1 || yy > 9999 || mm < 1 || mm > 12 || dd < 1 || dd > daysInMonth(yy, mm)) return nullopt;
        return Date(yy, mm, dd);
    }
    Date nextDay() const {
        if (d < daysInMonth(y, m)) return Date(y, m, d + 1);
        if (m < 12) return Date(y, m + 1, 1);
        return Date(y + 1, 1, 1);
    }
    friend bool operator<(const Date& a, const Date& b) { return tie(a.y, a.m, a.d) < tie(b.y, b.m, b.d); }
    friend ostream& operator<<(ostream& os, const Date& x) {
        char old = os.fill('0');
        os << setw(4) << x.y << '-' << setw(2) << x.m << '-' << setw(2) << x.d;
        os.fill(old);
        return os;
    }
};

int main() {
    cout << boolalpha << Date::make(2024, 2, 29).has_value() << ' '
         << Date::make(2023, 2, 29).has_value() << ' ' << Date::make(1900, 2, 29).has_value() << '\n';  // true false false
    auto nye = Date::make(2024, 12, 31);
    cout << nye->nextDay() << ' ' << (*nye < nye->nextDay()) << '\n';   // 2025-01-01 true
}`,
      dry: { head: ['input', 'check', 'result'], rows: [['2024-02-29', 'leap: 2024%4==0, %100!=0', 'valid'], ['2023-02-29', 'not leap, Feb has 28', 'nullopt'], ['1900-02-29', '1900%100==0, %400!=0', 'nullopt'], ['nextDay(2024-12-31)', 'day and month overflow', '2025-01-01']] },
      complexity: `<p>O(1) for every operation.</p>`,
      followUps: ['Add addDays(n) in O(1) using a days-from-civil formula.', 'Compare with C++20 std::chrono::year_month_day.']
    }
  });

  /* ================= PRACTICE: Hard ================= */
  practice.push({
    title: 'Predict the Output: The Whole Lifetime Zoo',
    level: 'Hard', tags: ['predict the output', 'inheritance', 'static', 'temporaries'], companies: ['Citadel', 'Qualcomm', 'Nvidia', 'Optiver'],
    statement: `<p>Predict the full output:</p>
      <pre>struct T {
    string n;
    T(string s) : n(s) { cout &lt;&lt; n &lt;&lt; ' '; }
    ~T() { cout &lt;&lt; '~' &lt;&lt; n &lt;&lt; ' '; }
};
struct Base { T b{"B"}; Base() { cout &lt;&lt; "Base "; } ~Base() { cout &lt;&lt; "~Base "; } };
struct Derived : Base {
    T d;
    Derived() : d("D") { cout &lt;&lt; "Derived "; }
    ~Derived() { cout &lt;&lt; "~Derived "; }
};
T global("G");
T&amp; lazy() { static T s("S"); return s; }
int main() {
    cout &lt;&lt; "[main] ";
    Derived x;
    T("tmp");
    lazy();
    { T inner("I"); lazy(); }
    cout &lt;&lt; "[end] ";
}</pre>`,
    constraints: `Conforming C++20 compiler; one line of output.`,
    example: `<p>Answer: ${H.c('g', 'G [main] B Base D Derived tmp ~tmp S I ~I [end] ~Derived ~D ~Base ~B ~S ~G')}</p><p>Four rules in one program: globals before main, base before derived, temporaries die at <code>;</code>, static locals once and destroyed after main in reverse order.</p>`,
    brute: {
      why: `<p>Brute force = compile and run, then memorise. That fails on new variations. Typical mistakes: printing ~S right after the first lazy() call, printing ~tmp at the end of main, or destroying B before ~Base.</p>`,
      code: R`struct T {
    string n;
    T(string s) : n(s) { cout << n << ' '; }
    ~T() { cout << '~' << n << ' '; }
};
T& lazy() { static T s("S"); return s; }
int main() {
    lazy();                // S
    lazy();                // nothing: already initialised
    cout << "[end] ";      // after main: ~S
}`
    },
    mcq: { q: 'Which is destroyed last of all?', options: ['global G', 'static local S', 'x (Derived)', 'B inside Base'], answer: 0, explain: 'Static-storage objects are destroyed after main in reverse order of construction. G was constructed before main, earlier than S, so it is destroyed last.' },
    hints: [
      `<p>Hint 1: timeline zones: before main (globals), main body, end of main (automatic objects), after main (statics in reverse).</p>`,
      `<p>Hint 2: Derived x expands to: Base's member B, Base body, Derived's member D, Derived body. Destruction mirrors it.</p>`,
      `<p>Hint 3: T("tmp") prints tmp and ~tmp immediately; the second lazy() prints nothing; S is destroyed after main but before G.</p>`
    ],
    solution: {
      approach: `<p>Before main: G. In main: [main], then Derived x → B Base D Derived; temporary → tmp ~tmp; first lazy() → S; block → I, (lazy prints nothing), ~I; [end]. End of main: x dies → ~Derived ~D ~Base ~B. After main: statics reverse: ~S then ~G.</p>`,
      code: R`#include <iostream>
#include <string>
using namespace std;

struct T {
    string n;
    T(string s) : n(s) { cout << n << ' '; }
    ~T() { cout << '~' << n << ' '; }
};
struct Base { T b{"B"}; Base() { cout << "Base "; } ~Base() { cout << "~Base "; } };
struct Derived : Base {
    T d;
    Derived() : d("D") { cout << "Derived "; }
    ~Derived() { cout << "~Derived "; }
};
T global("G");
T& lazy() { static T s("S"); return s; }

int main() {
    cout << "[main] ";
    Derived x;
    T("tmp");
    lazy();
    { T inner("I"); lazy(); }
    cout << "[end] ";
}
// G [main] B Base D Derived tmp ~tmp S I ~I [end] ~Derived ~D ~Base ~B ~S ~G`,
      dry: { head: ['zone', 'events', 'printed'], rows: [['before main', 'global', 'G'], ['main', 'Derived x', 'B Base D Derived'], ['main', 'temporary', 'tmp ~tmp'], ['main', 'lazy() #1', 'S'], ['main', 'block', 'I ~I'], ['end of main', 'x destroyed', '~Derived ~D ~Base ~B'], ['after main', 'statics reverse', '~S ~G']] },
      complexity: `<p>O(1) to run; reasoning is linear in the number of objects you track.</p>`,
      followUps: ['What if main ended with std::exit(0)? (x would not be destroyed)', 'What if Derived x were declared static inside main?']
    }
  });

  practice.push({
    title: 'Mini Bank: Account Numbers, Transfers and an Audit Log',
    level: 'Hard', tags: ['class design', 'static members', 'encapsulation', 'invariants'], companies: ['Goldman Sachs', 'Stripe', 'JPMorgan', 'Revolut'],
    statement: `<p>Design <code>Account</code> with an auto-generated account number (static counter starting at 10001), owner, and balance in cents (never negative). Implement <code>bool transfer(Account&amp; to, long long amt)</code> that is <b>all-or-nothing</b> (reject non-positive amounts, self-transfers and insufficient funds). Keep a static audit log (<code>vector&lt;string&gt;</code>) of successful transfers, exposed read-only via a static function. Accounts must not be copyable (two objects with the same number would be a disaster).</p>`,
    constraints: `≤ 10<sup>5</sup> accounts and transfers; single-threaded.`,
    example: `<p>A(10001, 5000), B(10002, 0). A.transfer(B, 3000) ${H.c('g', 'true')} → A 2000, B 3000, log ["10001-&gt;10002:3000"]. B.transfer(A, 9999) ${H.c('r', 'false')} (insufficient), nothing changes. A.transfer(A, 1) ${H.c('r', 'false')} (self).</p>`,
    brute: {
      why: `<p>A naive transfer that first adds to the receiver and then tries to subtract from the sender leaves money created out of thin air when the subtraction fails. Copyable accounts make it worse: a copy can be debited while the original keeps its balance.</p>`,
      code: R`struct NaiveAcc { int number; long long bal; };
bool naiveTransfer(NaiveAcc& from, NaiveAcc& to, long long amt) {
    to.bal += amt;                       // step 1 succeeds
    if (from.bal < amt) return false;    // step 2 fails -> money was created!
    from.bal -= amt;
    return true;
}
int main() {
    NaiveAcc a{1, 100}, b{2, 0};
    naiveTransfer(a, b, 500);
    cout << a.bal + b.bal << '\n';       // 600: total money changed
}`
    },
    mcq: { q: 'Why may a.transfer(b, x) read and modify b.balance even though balance is private?', options: ['Access control is per class: Account member functions can access private members of any Account', 'Because b is passed by reference', 'Because transfer is static', 'It cannot; you need a friend'], answer: 0, explain: 'Private means "private to the class", not to the object. Any Account member function may touch any Account\'s private members.' },
    hints: [
      `<p>Hint 1: validate everything first (amount &gt; 0, &amp;to != this, balance ≥ amt), THEN perform both updates — that is what makes it all-or-nothing.</p>`,
      `<p>Hint 2: <code>inline static int nextNumber = 10001;</code> and <code>inline static vector&lt;string&gt; log;</code>; delete the copy constructor and copy assignment.</p>`,
      `<p>Hint 3: expose the log as <code>static const vector&lt;string&gt;&amp; auditLog()</code> so callers can read but not modify. Record entries only on success.</p>`
    ],
    solution: {
      approach: `<p>Invariants (balance ≥ 0, unique numbers, conservation of money) are enforced inside the class. transfer checks all preconditions using <code>this</code> and access to the other object's privates, then commits both sides and appends to the static log. Copy operations are deleted to keep identity unique.</p>`,
      code: R`#include <iostream>
#include <string>
#include <vector>
using namespace std;

class Account {
    inline static int nextNumber = 10001;
    inline static vector<string> log;
    const int number;
    string owner;
    long long balance;                           // invariant: >= 0
public:
    Account(string who, long long opening)
        : number(nextNumber++), owner(who), balance(opening > 0 ? opening : 0) {}
    Account(const Account&) = delete;            // identity must be unique
    Account& operator=(const Account&) = delete;

    bool transfer(Account& to, long long amt) {
        if (amt <= 0 || &to == this || balance < amt) return false;   // validate first
        balance -= amt;                                                // then commit both
        to.balance += amt;                                             // private, same class: OK
        log.push_back(to_string(number) + "->" + to_string(to.number) + ":" + to_string(amt));
        return true;
    }
    long long getBalance() const { return balance; }
    int getNumber() const { return number; }
    static const vector<string>& auditLog() { return log; }
};

int main() {
    Account a("Asha", 5000), b("Ben", 0);
    cout << boolalpha << a.transfer(b, 3000) << ' ' << b.transfer(a, 9999) << ' ' << a.transfer(a, 1) << '\n';
    // true false false
    cout << a.getBalance() << ' ' << b.getBalance() << '\n';   // 2000 3000
    for (const auto& e : Account::auditLog()) cout << e << '\n';   // 10001->10002:3000
}`,
      dry: { head: ['call', 'checks', 'A', 'B', 'log'], rows: [['start', '-', '5000', '0', '[]'], ['A→B 3000', 'ok', '2000', '3000', '[10001-&gt;10002:3000]'], ['B→A 9999', '3000 &lt; 9999 ✘', '2000', '3000', 'unchanged'], ['A→A 1', 'self ✘', '2000', '3000', 'unchanged']] },
      complexity: `<p>O(1) per transfer plus O(length) for the log string; O(T) memory for T logged transfers.</p>`,
      followUps: ['Make transfer thread-safe without deadlock (std::scoped_lock on both accounts\' mutexes).', 'Should the audit log be static at all? Discuss testing and dependency injection.']
    }
  });

  practice.push({
    title: 'Matrix Class with friend Multiplication',
    level: 'Hard', tags: ['class design', 'friend', 'static factory', 'operator overloading'], companies: ['Nvidia', 'MathWorks', 'Google'],
    statement: `<p>Implement <code>Matrix</code> (rows × cols of <code>long long</code>, private storage in a single <code>vector</code>). Provide <code>Matrix(r, c)</code> (zero-filled), static <code>Matrix::identity(n)</code>, <code>at(i, j)</code> (const and non-const), friend <code>operator*</code> that throws <code>std::invalid_argument</code> on dimension mismatch, friend <code>operator==</code>, and friend <code>operator&lt;&lt;</code> printing rows on separate lines.</p>`,
    constraints: `1 ≤ r, c ≤ 200; values fit in long long.`,
    example: `<p>[[1,2],[3,4]] × I₂ = ${H.c('g', 'same matrix')}. [[1,2],[3,4]] × [[5],[6]] = ${H.c('g', '[[17],[39]]')} (1·5+2·6 = 17, 3·5+4·6 = 39). 2×2 × 3×1 → ${H.c('r', 'throws')}.</p>`,
    brute: {
      why: `<p>Using <code>vector&lt;vector&lt;long long&gt;&gt;</code> exposed publicly lets callers create ragged rows (different lengths), so every multiplication must re-validate every row, and each row is a separate heap allocation (poor cache locality).</p>`,
      code: R`using RawMat = vector<vector<long long>>;
RawMat mul(const RawMat& a, const RawMat& b) {      // no dimension checks at all
    RawMat c(a.size(), vector<long long>(b[0].size()));
    for (size_t i = 0; i < a.size(); ++i)
        for (size_t j = 0; j < b[0].size(); ++j)
            for (size_t k = 0; k < b.size(); ++k) c[i][j] += a[i][k] * b[k][j];
    return c;
}
int main() { RawMat a{{1, 2}, {3}}; cout << a[1].size() << '\n'; }   // ragged: 1`
    },
    mcq: { q: 'Why is identity(n) a static member function rather than a constructor Matrix(n)?', options: ['A constructor Matrix(int) would be ambiguous in meaning; a named static factory states intent clearly', 'Constructors cannot loop', 'Static functions are required for friend operators', 'identity must be shared by all matrices'], answer: 0, explain: 'Named constructors make call sites self-documenting: Matrix::identity(3) is unambiguous, Matrix(3) is not.' },
    hints: [
      `<p>Hint 1: store <code>vector&lt;long long&gt; a(r * c)</code>; element (i, j) lives at index <code>i * c + j</code> (row-major).</p>`,
      `<p>Hint 2: friend <code>operator*</code>: check <code>A.c == B.r</code>, else throw. Use i-k-j loop order for cache-friendly access.</p>`,
      `<p>Hint 3: provide both <code>long long&amp; at(i, j)</code> and <code>long long at(i, j) const</code>; equality compares dimensions then data.</p>`
    ],
    solution: {
      approach: `<p>Encapsulated contiguous storage guarantees rectangular shape. Friend operators read the private dimensions and data directly. The i-k-j loop streams through rows of B contiguously.</p>`,
      code: R`#include <iostream>
#include <vector>
#include <stdexcept>
using namespace std;

class Matrix {
    int r, c;
    vector<long long> a;                    // row-major: (i, j) -> i * c + j
public:
    Matrix(int rows, int cols) : r(rows), c(cols), a((size_t)rows * cols, 0) {
        if (rows <= 0 || cols <= 0) throw invalid_argument("bad dimensions");
    }
    static Matrix identity(int n) {
        Matrix m(n, n);
        for (int i = 0; i < n; ++i) m.at(i, i) = 1;
        return m;
    }
    long long& at(int i, int j) { return a[(size_t)i * c + j]; }
    long long at(int i, int j) const { return a[(size_t)i * c + j]; }

    friend Matrix operator*(const Matrix& x, const Matrix& y) {
        if (x.c != y.r) throw invalid_argument("dimension mismatch");
        Matrix z(x.r, y.c);
        for (int i = 0; i < x.r; ++i)
            for (int k = 0; k < x.c; ++k) {
                long long v = x.a[(size_t)i * x.c + k];
                for (int j = 0; j < y.c; ++j) z.a[(size_t)i * z.c + j] += v * y.a[(size_t)k * y.c + j];
            }
        return z;
    }
    friend bool operator==(const Matrix& x, const Matrix& y) { return x.r == y.r && x.c == y.c && x.a == y.a; }
    friend ostream& operator<<(ostream& os, const Matrix& m) {
        for (int i = 0; i < m.r; ++i) {
            for (int j = 0; j < m.c; ++j) os << m.at(i, j) << (j + 1 < m.c ? " " : "");
            os << '\n';
        }
        return os;
    }
};

int main() {
    Matrix A(2, 2); A.at(0, 0) = 1; A.at(0, 1) = 2; A.at(1, 0) = 3; A.at(1, 1) = 4;
    Matrix v(2, 1); v.at(0, 0) = 5; v.at(1, 0) = 6;
    cout << boolalpha << (A * Matrix::identity(2) == A) << '\n';   // true
    cout << A * v;                                                 // 17 / 39
    try { Matrix bad = A * Matrix(3, 1); } catch (const invalid_argument& e) { cout << e.what() << '\n'; }
}`,
      dry: { head: ['i', 'k', 'v = A(i,k)', 'z row i after'], rows: [['0', '0', '1', '[5]'], ['0', '1', '2', '[5+12=17]'], ['1', '0', '3', '[15]'], ['1', '1', '4', '[15+24=39]']] },
      complexity: `<p>Multiplication O(r·k·c) time, O(r·c) extra space; at() is O(1).</p>`,
      followUps: ['Add fast exponentiation (power(n)) using identity and repeated squaring.', 'Why is i-k-j faster than i-j-k? (cache lines, see the performance module)']
    }
  });

  practice.push({
    title: 'Self-Registering Sensors (static registry + this)',
    level: 'Hard', tags: ['static members', 'this', 'destructor', 'lifetime'], companies: ['Tesla', 'Bosch', 'Apple'],
    statement: `<p>Every <code>Sensor</code> must register itself (its <code>this</code> pointer) in a static registry when constructed and remove itself when destroyed, so <code>Sensor::readAll()</code> can return the sum of readings of all live sensors and <code>Sensor::count()</code> the number registered. Copying must be disabled. Sensors may be created and destroyed in any order (not only LIFO).</p>`,
    constraints: `≤ 10<sup>4</sup> live sensors; single-threaded; removal may be O(N).`,
    example: `<p>Create s1(5), s2(7) → readAll ${H.c('g', '12')}. In a block create s3(100) → readAll 112. After the block → ${H.c('g', '12')} again, count 2. Destroy s1 via a heap pointer → readAll ${H.c('g', '7')}.</p>`,
    brute: {
      why: `<p>A registry that only adds pointers and never removes them ends up holding <b>dangling pointers</b> to destroyed sensors; readAll then reads freed memory (undefined behaviour). Allowing copies is also wrong: the copy would not be registered (implicit copy ctor), or would be registered twice by hand.</p>`,
      code: R`struct LeakySensor {
    int value;
    inline static vector<LeakySensor*> all;
    explicit LeakySensor(int v) : value(v) { all.push_back(this); }   // never removed!
};
int main() {
    { LeakySensor tmp(100); }            // tmp destroyed, pointer stays in 'all'
    cout << LeakySensor::all.size() << '\n';   // 1 dangling pointer
}`
    },
    mcq: { q: 'Why must the copy constructor be deleted (or written to register the copy)?', options: ['The implicit copy constructor would create a sensor that is not in the registry, but its destructor would still try to remove itself', 'Copies are slower', 'Static members cannot be copied', 'this cannot be copied'], answer: 0, explain: 'Every live object must be registered exactly once. The compiler-generated copy constructor knows nothing about the registry.' },
    hints: [
      `<p>Hint 1: <code>inline static vector&lt;Sensor*&gt; registry;</code> — constructor does <code>registry.push_back(this)</code>.</p>`,
      `<p>Hint 2: destructor: find <code>this</code> in the registry and erase it (swap with back + pop_back is O(1) after the O(N) find).</p>`,
      `<p>Hint 3: <code>Sensor(const Sensor&amp;) = delete;</code> and the copy assignment too. readAll iterates the registry calling each sensor's reading.</p>`
    ],
    solution: {
      approach: `<p>The static registry is the shared "whiteboard"; <code>this</code> is the identity each object writes onto it. Constructor and destructor keep the registry exactly equal to the set of live objects, regardless of destruction order.</p>`,
      code: R`#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

class Sensor {
    inline static vector<Sensor*> registry;    // every live Sensor, exactly once
    int value;
public:
    explicit Sensor(int v) : value(v) { registry.push_back(this); }
    ~Sensor() {
        auto it = find(registry.begin(), registry.end(), this);
        if (it != registry.end()) { *it = registry.back(); registry.pop_back(); }   // O(1) erase
    }
    Sensor(const Sensor&) = delete;
    Sensor& operator=(const Sensor&) = delete;

    int reading() const { return value; }
    static long long readAll() {
        long long s = 0;
        for (const Sensor* p : registry) s += p->reading();
        return s;
    }
    static size_t count() { return registry.size(); }
};

int main() {
    Sensor* s1 = new Sensor(5);
    Sensor s2(7);
    cout << Sensor::readAll() << ' ';          // 12
    {
        Sensor s3(100);
        cout << Sensor::readAll() << ' ';      // 112
    }
    cout << Sensor::readAll() << ' ' << Sensor::count() << ' ';   // 12 2
    delete s1;                                 // non-LIFO removal
    cout << Sensor::readAll() << '\n';         // 7
}`,
      dry: { head: ['event', 'registry', 'readAll'], rows: [['new Sensor(5)', '[s1]', '5'], ['Sensor s2(7)', '[s1, s2]', '12'], ['Sensor s3(100)', '[s1, s2, s3]', '112'], ['block ends: ~s3', '[s1, s2]', '12'], ['delete s1', '[s2]', '7']] },
      complexity: `<p>Construction O(1) amortised, destruction O(N) for the find, readAll O(N).</p>`,
      followUps: ['Store an index in each Sensor to make removal O(1).', 'Add a mutex: which operations must be locked?', 'What goes wrong if a static Sensor outlives the registry (destruction order)?']
    }
  });

  /* ================= QUIZ ================= */
  quiz.push(
    { q: 'What is the ONLY language difference between <code>struct</code> and <code>class</code> in C++?', options: ['Default member access and default inheritance access (public vs private)', 'structs cannot have member functions', 'structs cannot have constructors', 'classes are allocated on the heap'], answer: 0, explain: 'Everything else is identical. struct defaults to public, class to private — for members and for base classes.' },
    { q: 'Given <code>struct S { char a; int b; char c; };</code> on a typical 64-bit machine, what is <code>sizeof(S)</code>?', options: ['12', '6', '8', '9'], answer: 0, explain: 'a at 0, 3 bytes padding, b at 4–7, c at 8, then 3 bytes tail padding to a multiple of 4 → 12.' },
    { q: 'Objects <code>a</code>, <code>b</code>, <code>c</code> are declared in that order in one block. In what order are their destructors called?', options: ['c, b, a', 'a, b, c', 'b, a, c', 'Unspecified'], answer: 0, explain: 'Automatic objects are destroyed in reverse order of construction (LIFO).' },
    { q: 'A class declares only <code>Point(int x, int y)</code>. What does <code>Point p;</code> do?', options: ['Compile error: no default constructor is generated once you declare a constructor', 'Creates (0, 0)', 'Creates a point with garbage values', 'Calls Point(0, 0) automatically'], answer: 0, explain: 'Declaring any constructor suppresses the implicit default constructor. Add Point() = default; to get it back.' },
    { q: 'Members are declared <code>int a; int b;</code> and the constructor is <code>X() : b(1), a(b + 1) {}</code>. What is <code>a</code>?', options: ['Indeterminate (b is not initialized yet when a is)', '2', '1', 'Compile error'], answer: 0, explain: 'Initialization follows declaration order: a first (reading uninitialized b → undefined behaviour), then b.' },
    { q: 'Which member REQUIRES the member initializer list?', options: ['<code>const int id;</code>', '<code>int count;</code>', '<code>std::string name;</code>', '<code>static int total;</code>'], answer: 0, explain: 'const members (and references, and members without default constructors) must be initialized, not assigned. Static members are not initialized per object at all.' },
    { q: 'Inside a <code>const</code> member function of class <code>X</code>, what is the type of <code>this</code>?', options: ['<code>const X*</code>', '<code>X*</code>', '<code>X&amp;</code>', '<code>const X&amp;</code>'], answer: 0, explain: 'this points to a const object, which is exactly why non-mutable members cannot be modified there.' },
    { q: 'Which statement about static member functions is TRUE?', options: ['They have no this pointer and can be called as ClassName::f()', 'They can be virtual', 'They can be marked const', 'They can directly read non-static members without an object'], answer: 0, explain: 'No object → no this → no const qualifier, no virtual dispatch, and non-static members are reachable only through an explicit object.' },
    { q: 'Does a static data member increase <code>sizeof</code> of each object?', options: ['No — there is one copy stored outside all objects', 'Yes, by its size', 'Yes, by the size of a pointer', 'Only if it is public'], answer: 0, explain: 'Static data members have static storage duration, like globals; objects do not contain them.' },
    { q: '<code>class Dog : Animal { … };</code> — what kind of inheritance is this?', options: ['private inheritance (class defaults to private)', 'public inheritance', 'protected inheritance', 'compile error: access specifier required'], answer: 0, explain: 'For class the default base access is private; for struct it is public. Write : public Animal for an is-a relationship.' },
    { q: 'For <code>struct D : B { M m; };</code>, which order is correct for construction?', options: ['B, then m, then D\'s body', 'D\'s body, then m, then B', 'm, then B, then D\'s body', 'B, then D\'s body, then m'], answer: 0, explain: 'Bases first, then members in declaration order, then the constructor body. Destruction is the mirror image.' },
    { q: 'Class A declares <code>friend class B;</code> and class C derives from B. Can C\'s own member functions access A\'s private members?', options: ['No — friendship is not inherited', 'Yes — derived classes inherit friendship', 'Only protected members', 'Only if C is also a struct'], answer: 0, explain: 'Friendship is not inherited, not transitive and not mutual. A must name C explicitly.' },
    { q: 'Why is <code>operator&lt;&lt;</code> for printing usually a non-member (often friend)?', options: ['Its left operand is std::ostream, so it cannot be a member of your class', 'Members cannot return ostream&amp;', 'Friends are faster', 'The standard forbids member operators'], answer: 0, explain: 'A member operator always has your object on the left. cout &lt;&lt; obj has ostream on the left.' },
    { q: 'What does <code>Widget w();</code> declare?', options: ['A function named w that takes no arguments and returns a Widget', 'A default-constructed Widget', 'A value-initialized Widget', 'A pointer to Widget'], answer: 0, explain: 'The most vexing parse: anything that can be a declaration is one. Use Widget w; or Widget w{};' }
  );

  /* ================= INTERVIEW ================= */
  interview.push(
    { q: 'What is the difference between a struct and a class in C++? When do you use each?', level: 'B',
      a: `<p>Language-wise there is exactly one difference: <b>default access</b>. In a <code>struct</code>, members and base classes are <code>public</code> by default; in a <code>class</code>, they are <code>private</code>. Both can have constructors, destructors, member functions, inheritance, templates and virtual functions.</p><p>By convention, use <code>struct</code> for passive data aggregates with no invariants (a <code>Point</code>, a config record, a DTO) and <code>class</code> when the type protects an invariant through private data and public operations. The C++ Core Guidelines (C.2, C.8) say exactly this: use class if any member is non-public.</p>`,
      followUps: ['What is an aggregate, and how do designated initializers work in C++20?', 'Can a struct inherit from a class?'] },
    { q: 'Explain encapsulation and why data members are usually private.', level: 'B',
      a: `<p>Encapsulation means bundling data with the operations on it and <b>hiding the data</b> behind those operations. With private data, the class's member functions are the only code that can change the state, so an invariant (e.g. "balance ≥ 0", "denominator &gt; 0") is checked in a handful of places instead of everywhere in the codebase.</p><p>It also lets you change the representation later (store cents instead of dollars, cache a value) without breaking callers. Access checks are purely compile-time, so encapsulation costs nothing at runtime. Avoid reflexive getter/setter pairs for every field — expose behaviour, not raw data.</p>`,
      followUps: ['Is access control a security mechanism?', 'When is a public data member fine?'] },
    { q: 'In what order are constructors and destructors called for local objects, members and base classes?', level: 'B',
      a: `<p><b>Construction:</b> base classes (in the order listed in the class head; virtual bases first), then non-static data members <b>in declaration order</b>, then the constructor body. Local objects in a scope are constructed in the order their declarations execute.</p><p><b>Destruction:</b> the exact reverse — destructor body, then members in reverse declaration order, then bases in reverse order. Locals die in reverse order of construction at the end of their scope, array elements from the last index to the first, temporaries at the end of the full expression, and static/global objects after <code>main</code> returns in reverse order of construction.</p>`,
      followUps: ['What changes if an exception is thrown halfway through a constructor?', 'How are static locals ordered relative to globals at exit?'] },
    { q: 'Why should you prefer the member initializer list over assignment in the constructor body?', level: 'I',
      a: `<p>Members are constructed <i>before</i> the constructor body runs. Assigning in the body means each class-type member is first default-constructed and then assigned — two operations instead of one (expensive for strings, vectors, or types with heavy constructors).</p><p>More importantly, some members <b>cannot</b> be assigned: <code>const</code> members, reference members, and members whose type has no default constructor, plus base classes that need arguments. All of these must be initialized in the list. Remember the trap: the list's written order is ignored; members initialize in declaration order, so never make one member's initializer depend on a member declared after it (<code>-Wreorder</code> warns).</p>`,
      followUps: ['What are default member initializers and how do they interact with the list?', 'What is a delegating constructor?'] },
    { q: 'What is the this pointer? What is its type in const and static member functions?', level: 'I',
      a: `<p><code>this</code> is a hidden parameter passed to every non-static member function holding the address of the object the function was called on: <code>obj.f(x)</code> behaves like <code>X::f(&amp;obj, x)</code>. Inside a non-const member function of <code>X</code> it has type <code>X*</code>; inside a <code>const</code> member function it is <code>const X*</code>, which is why members cannot be modified there (except <code>mutable</code> ones).</p><p>Static member functions have <b>no</b> <code>this</code> because they are not called on an object. Typical uses: disambiguating <code>this-&gt;x = x</code>, returning <code>*this</code> by reference for method chaining, self-assignment checks <code>this == &amp;other</code>, and registering the object somewhere.</p>`,
      followUps: ['Is calling a member function on a null pointer okay if it doesn\'t touch members?', 'What does C++23 "deducing this" change?'] },
    { q: 'What are static data members and static member functions? Give real uses.', level: 'B',
      a: `<p>A static data member belongs to the class, not to any object: one copy shared by all instances, existing even when no instance exists, not counted in <code>sizeof</code>. A static member function is called as <code>ClassName::f()</code>, has no <code>this</code>, and can directly use only static members (though it can access private members of objects passed to it).</p><p>Uses: instance counters and ID generators, class-wide constants (<code>static constexpr</code>), named constructors/factories (<code>Temperature::fromFahrenheit</code>), the Meyers singleton (<code>static T&amp; instance()</code> returning a function-local static), and plain-function-pointer callbacks for C APIs. Since C++17, <code>inline static</code> lets you define them in the header; before that they needed exactly one out-of-class definition.</p>`,
      followUps: ['Why is a plain static int counter not thread-safe?', 'What is the static initialization order fiasco?'] },
    { q: 'You get "undefined reference to `Counter::count`" at link time. What is wrong and how do you fix it?', level: 'I',
      a: `<p>The class body contains <code>static int count;</code>, which is only a <b>declaration</b>. Some code uses <code>count</code>, so the linker needs a <b>definition</b> (the actual storage), and none exists. Before C++17 the fix is to add <code>int Counter::count = 0;</code> in exactly one .cpp file (two definitions would cause a "multiple definition" error).</p><p>Since C++17 the cleaner fix is <code>inline static int count = 0;</code> inside the class: the definition can live in the header and the linker merges the copies. <code>static constexpr</code> data members are implicitly inline, which also fixed the old surprise where passing a <code>static const int</code> by reference required an out-of-class definition.</p>`,
      followUps: ['What is an inline variable?', 'What does constinit add in C++20?'] },
    { q: 'Explain public, protected and private inheritance.', level: 'I',
      a: `<p>The inheritance access specifier caps the access of inherited members as seen from <b>outside</b> the derived class. With <code>public</code> inheritance, public stays public and protected stays protected — it models a true <b>is-a</b> relationship and allows implicit upcasts (<code>Derived*</code> → <code>Base*</code>) for everyone. With <code>protected</code> inheritance, public and protected base members become protected. With <code>private</code> inheritance, they become private and outsiders cannot upcast — it means "implemented in terms of".</p><p>Private base members are inherited (they occupy memory) but are never accessible in the derived class. Default: <code>class</code> inherits privately, <code>struct</code> publicly. In practice use public inheritance for is-a and composition (a member) for almost everything else.</p>`,
      followUps: ['When would you use private inheritance over composition?', 'What is the Liskov Substitution Principle?'] },
    { q: 'How do you pass arguments to a base class constructor? What happens if you do not?', level: 'B',
      a: `<p>Call the base constructor in the derived class's member initializer list: <code>Dog(string n) : Animal(n, 4), breed("mixed") {}</code>. The base is always constructed first regardless of where you write it in the list.</p><p>If you do not mention the base, its <b>default constructor</b> is called implicitly; if the base has no default constructor, the derived constructor fails to compile. If the derived class needs no extra setup, <code>using Animal::Animal;</code> inherits all base constructors. You cannot initialize base members directly in the derived initializer list — only through a base constructor.</p>`,
      followUps: ['What is constructor delegation vs constructor inheritance?', 'Why can\'t the derived class assign a const member of the base?'] },
    { q: 'What is name hiding in inheritance and how do you fix it?', level: 'I',
      a: `<p>If a derived class declares a member with the same name as a base member, it <b>hides all</b> base members of that name — including overloads with different parameter types. Name lookup finds the name in the derived scope and stops before reaching the base, then overload resolution only considers the derived versions. So <code>d.print(42)</code> fails if Derived only declares <code>print(const string&amp;)</code>, even though Base has <code>print(int)</code>.</p><p>Fixes: add <code>using Base::print;</code> in the derived class to bring all base overloads into scope, or call explicitly with <code>d.Base::print(42)</code>. This is different from overriding, which requires <code>virtual</code> and the same signature (next module).</p>`,
      followUps: ['How does override help catch accidental hiding?', 'Does hiding apply to data members too?'] },
    { q: 'What is a friend function? Does friendship break encapsulation?', level: 'I',
      a: `<p>A friend function or class is granted access to private and protected members by the class that declares it a friend. A friend function is not a member: no <code>this</code>, called with normal syntax, and the access label around its declaration does not matter. Friendship is granted (never taken), and it is not inherited, not transitive and not mutual.</p><p>It does not break encapsulation in any meaningful sense: the class itself decides who gets access, so the friend is part of the class's interface — adding one friend exposes the data to one more function, just like adding a member function would. The typical legitimate uses are <code>operator&lt;&lt;</code>/<code>operator&gt;&gt;</code>, symmetric binary operators that need conversions on both sides, and tightly coupled pairs like a container and its iterator or node. Making data public to avoid friendship is far worse.</p>`,
      followUps: ['What is a hidden friend and why is ADL relevant?', 'What is the passkey idiom?'] },
    { q: 'Why does <code>2 + x</code> fail to compile when <code>operator+</code> is a member, and how do you fix it?', level: 'A',
      a: `<p>For a member operator, <code>a + b</code> is <code>a.operator+(b)</code>. The left operand must already be of the class type — the compiler never applies a user-defined conversion to the object a member function is called on. So <code>x + 2</code> works (2 converts via a non-explicit constructor) but <code>2 + x</code> does not, because <code>int</code> has no member <code>operator+(X)</code>.</p><p>Fix: make it a non-member, <code>X operator+(const X&amp;, const X&amp;)</code>, typically a hidden friend so it can read private data and is found via ADL. Then both operands participate in implicit conversion symmetrically. A common pattern is to implement <code>operator+=</code> as a member and <code>operator+</code> as a non-member built on it.</p>`,
      followUps: ['Which operators must be members (=, [], (), -&gt;)?', 'How do C++20 rewritten comparison candidates reduce boilerplate?'] },
    { q: 'What is sizeof of an empty class, and why? How does the empty base optimization help?', level: 'A',
      a: `<p><code>sizeof</code> of an empty class is <b>1</b>, not 0, because every complete object must have a unique address — two distinct empty objects in an array or struct must be distinguishable. Member functions and static members do not add size.</p><p>When an empty class is used as a <b>base</b>, the compiler may give that base subobject zero size (the empty base optimization), so <code>struct D : Empty { int x; }</code> is just 4 bytes. C++20's <code>[[no_unique_address]]</code> extends this to members. The standard library relies on it: <code>std::unique_ptr</code> with a stateless deleter, and allocator-aware containers storing empty allocators, take no extra space.</p>`,
      followUps: ['How would you reorder members to minimize padding?', 'Why can two empty bases of the same type not share an address?'] },
    { q: 'Design a class that hands out unique IDs and counts live instances. What pitfalls must you handle?', level: 'A',
      a: `<p>Use two static members — <code>inline static int nextId</code> and <code>inline static int alive</code> — and increment them in <b>every</b> constructor (including the copy constructor, which you must write or delete, otherwise the compiler-generated one copies the ID and skips the count), and decrement <code>alive</code> in the destructor. Copy assignment should not change identity. Decide what moves mean (new ID or transfer).</p><p>Pitfalls: multithreading (<code>nextId++</code> is a data race — use <code>std::atomic&lt;int&gt;</code> with <code>fetch_add</code>), static initialization order if other globals create instances during startup, test isolation (counters persist across tests), and overflow for very long-running processes (use 64-bit). Expose counts via static member functions, keep the counters private.</p>`,
      followUps: ['How would you make IDs unique across processes or machines?', 'Should moved-from objects still count as alive?'] }
  );

  registerModule({
    id: 'cpp04',
    title: 'OOP Basics in C++',
    intro: `<p>This module turns "C with structs" into real C++ objects. You will learn how a <b>class</b> bundles data with the functions that protect it, how <b>access specifiers</b> keep invariants safe, and exactly <b>when constructors and destructors run</b> — the foundation of RAII and of a whole family of "predict the output" interview questions.</p>
      <p>We cover <b>member initializer lists</b> (and their declaration-order trap), the hidden <b>this</b> pointer behind method chaining, <b>static members</b> shared by every object, the basics of <b>inheritance</b> (base-first construction, protected access, name hiding), and <b>friend</b> functions and classes. Every topic has an analogy first, an interactive visualizer (object memory layout, constructor/destructor call stacks, shared static state), worked examples, and class-design practice from Easy to Hard.</p>`,
    goals: [
      'Design a class with private data, validating public methods and const correctness that keeps a stated invariant true',
      'Predict the exact constructor/destructor output of programs mixing locals, scopes, heap objects, temporaries, arrays, static locals, globals and base/derived classes',
      'Use member initializer lists correctly for const, reference, no-default-constructor and base-class members, and avoid the declaration-order bug',
      'Explain and use the this pointer for name clashes, fluent method chaining and self-checks',
      'Implement instance counters, ID generators and factories with static members, and explain inline static and the linker error',
      'Apply public inheritance with base-constructor calls, protected access and using-declarations, and choose friend functions for operator&lt;&lt; and symmetric operators'
    ],
    prereqs: `<p>C++ 1 (Compilation Model, Types &amp; I/O), C++ 2 (Functions, Arrays &amp; Strings) and C++ 3 (Pointers &amp; References) — especially references, const, and pointers to objects.</p>`,
    hours: 12,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
