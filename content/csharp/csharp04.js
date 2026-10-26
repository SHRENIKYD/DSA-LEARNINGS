(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------------- small helpers shared by the visualizers ---------------- */
  function one(k, cls) { var h = {}; h[k] = cls; return h; }
  function note(html, label) { return { type: 'text', label: label || 'Why', html: html }; }
  function cs(code, hl, label) { return { type: 'code', label: label || 'C# (highlighted line = running now)', lang: 'csharp', code: code, hl: hl || {} }; }
  // steps: [line, narration, vars?, stack?, output?]
  function walk(code, steps) {
    return steps.map(function (s) {
      var parts = [cs(code, one(s[0], 'cur'))];
      if (s[2]) parts.push({ type: 'vars', label: 'State', vals: s[2] });
      if (s[3]) parts.push({ type: 'stack', label: 'Call stack (top = running)', items: s[3].slice(), hl: one(s[3].length - 1, 'cur') });
      if (s[4] !== undefined) parts.push(note(s[4] || '<i>(nothing printed yet)</i>', 'Console output so far'));
      return { narr: s[1], parts: parts };
    });
  }
  function words(input, hint, max) {
    var a = String(input === undefined || input === null ? '' : input).trim().split(/[\s,]+/).filter(function (x) { return x.length; });
    if (!a.length || a.length > (max || 8)) throw new Error(hint);
    return a;
  }

  /* ======================================================================
     TOPIC 1 — Inheritance, constructors and base calls
     ====================================================================== */
  topics.push({
    title: 'Inheritance, Constructor Chaining & base Calls',
    analogy: `<p>Think of a <b>franchise restaurant</b>. Head office writes the master recipe book: how to greet guests, how to take payment, how to clean up. A local branch <b>inherits</b> the whole book for free and only adds a few local pages ("we also serve masala dosa"). Before the branch can open, the head-office checklist must be done first (licences, kitchen safety) — that is the <b>base constructor running before the derived one</b>. And when the branch wants the standard greeting plus its own twist, it says "do what head office says, then add our line" — that is a <b><code>base.Greet()</code></b> call.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> Inheritance lets one class (the <b>derived</b> or child class) reuse and extend another (the <b>base</b> or parent class). You write it with a colon: <code>class Savings : Account</code>. The child gets every member of the parent, can add new ones, and can be used anywhere the parent is expected (<code>Account a = new Savings(...)</code>). That last rule is the heart of it: <b>a Savings IS-AN Account</b>.</p>
<p>Rules you must know in C#:</p>
${H.table(['Rule', 'What it means'], [
  ['Single class inheritance', 'A class has exactly <b>one</b> base class (default <code>object</code>). Use interfaces for "many parents".'],
  ['Structs and records', 'Structs cannot inherit (they are implicitly sealed and derive from <code>ValueType</code>). A <code>record class</code> can inherit only from another record.'],
  ['Constructors are not inherited', 'Each class declares its own. The derived constructor chooses a base constructor with <code>: base(args)</code>.'],
  ['Order of construction', 'Derived <b>field initialisers</b> → base field initialisers → <b>base constructor body</b> → derived constructor body.'],
  ['<code>protected</code>', 'Visible inside the class and in derived classes, hidden from everyone else. <code>private protected</code> = derived classes in the same assembly only.']
])}
<p><b>Calling up the chain.</b> Inside a derived class, <code>base.Member</code> reaches the parent's version, even when the child overrides it. The typical use is "<i>do what the parent does, then a bit more</i>":</p>
${H.table(['Call', 'Runs'], [['<code>new Savings("A", 500)</code>', 'Account(id, balance) body, then Savings body'], ['<code>savings.Withdraw(50)</code>', 'Savings.Withdraw checks the minimum, then calls <code>base.Withdraw(50)</code>'], ['<code>account.Describe()</code> (account is really Savings)', 'the most-derived override, because it is virtual']])}
<p>If the base class has <b>no parameterless constructor</b>, every derived constructor <b>must</b> call <code>: base(...)</code> explicitly or the code does not compile (CS7036). With C# 12 <b>primary constructors</b> you can write the chain on the class line: <code>class Savings(string id, decimal opening) : Account(id, opening)</code>.</p>`,
    clues: [
      '"IS-A relationship" / "a Savings account is an Account" → inheritance is a candidate',
      '"call the parent version and add to it" → <code>base.Method()</code>',
      '"base class has no default constructor" / error CS7036 → add <code>: base(args)</code>',
      '"in what order do constructors and field initialisers run?" → derived initialisers, base initialisers, base ctor, derived ctor',
      '"accessible to subclasses but not to the public" → <code>protected</code>',
      '"can a struct inherit?" → no; structs are sealed, use interfaces'
    ],
    code: [{ lang: 'csharp', run: true, title: 'A base class, a derived class and base calls (runnable)', code: `var acct = new Savings("S-1", 500m, minimum: 100m);
Console.WriteLine(acct.Describe());
Console.WriteLine(acct.Withdraw(350m));   // allowed: 150 left
Console.WriteLine(acct.Withdraw(100m));   // denied: would drop below 100
Account plain = acct;                     // a Savings IS-AN Account
Console.WriteLine(plain.Describe());      // still the Savings override (virtual dispatch)

class Account
{
    public string Id { get; }
    public decimal Balance { get; protected set; }   // derived classes may set it, outsiders may not

    public Account(string id, decimal opening)
    {
        Id = id;
        Balance = opening;
        Console.WriteLine($"Account ctor ({id})");
    }

    public virtual bool Withdraw(decimal amount)
    {
        if (amount <= 0 || amount > Balance) return false;
        Balance -= amount;
        return true;
    }

    public virtual string Describe() => $"{Id}: {Balance:0.00}";
}

class Savings : Account
{
    private readonly decimal _minimum;

    // ": base(id, opening)" picks the parent constructor; it runs BEFORE this body
    public Savings(string id, decimal opening, decimal minimum) : base(id, opening)
    {
        _minimum = minimum;
        Console.WriteLine("Savings ctor");
    }

    public override bool Withdraw(decimal amount)
    {
        if (Balance - amount < _minimum) return false;   // extra rule first...
        return base.Withdraw(amount);                     // ...then reuse the parent's logic
    }

    public override string Describe() => base.Describe() + $" (min {_minimum:0.00})";
}` }],
    codeTitle: ['Base and derived account'],
    viz: {
      title: 'Constructing a derived object step by step',
      gen: function () {
        var code = 'class Account {\n  protected decimal bal = 0;          // base field initialiser\n  public Account(decimal b) { bal = b; }\n}\nclass Savings : Account {\n  decimal min = 100;                  // derived field initialiser\n  public Savings(decimal b) : base(b) {\n    Console.WriteLine(bal - min);\n  }\n}\nvar s = new Savings(500);';
        return walk(code, [
          [11, '<code>new Savings(500)</code>: the runtime allocates one object big enough for <b>all</b> fields of Account and Savings, zero-filled.', { bal: 0, min: 0 }, ['Main'], ''],
          [6, 'C# runs the <b>derived field initialisers first</b>: <code>min = 100</code>. (Java does the opposite order — a classic interview contrast.)', { bal: 0, min: 100 }, ['Main', 'Savings ctor (initialisers)'], ''],
          [7, 'The <code>: base(b)</code> clause now hands control to the parent constructor before the Savings body runs.', { bal: 0, min: 100, b: 500 }, ['Main', 'Savings ctor', 'Account ctor'], ''],
          [2, 'Inside Account: its own field initialiser runs (<code>bal = 0</code>)…', { bal: 0, min: 100 }, ['Main', 'Savings ctor', 'Account ctor'], ''],
          [3, '…then the Account constructor body: <code>bal = 500</code>.', { bal: 500, min: 100 }, ['Main', 'Savings ctor', 'Account ctor'], ''],
          [8, 'Back in Savings, the body runs last. Both fields are ready, so it prints 400.', { bal: 500, min: 100 }, ['Main', 'Savings ctor'], '400'],
          [11, 'Done. One object, two layers of construction, base body before derived body.', { bal: 500, min: 100 }, ['Main'], '400']
        ]);
      }
    },
    examples: [
      { title: 'Forgetting : base(...) when the parent needs arguments', html: `<p>If <code>Account</code> only has <code>Account(string id, decimal opening)</code>, then <code>public Savings() { }</code> fails with <b>CS7036: There is no argument given that corresponds to the required parameter 'id'</b>. The compiler silently adds <code>: base()</code> to any constructor without a chain, and there is no parameterless base constructor to call.</p>`, code: { lang: 'csharp', code: `class Account { public Account(string id) { } }
class Savings : Account
{
    public Savings() : base("default") { }      // must pick a base constructor explicitly
    public Savings(string id) : base(id) { }
}` } },
      { title: 'Chaining inside one class with : this(...)', html: `<p><code>: this(...)</code> calls another constructor of the <b>same</b> class, so validation lives in one place. Only the final constructor in the chain calls <code>base</code>.</p>`, code: { lang: 'csharp', code: `class Point3
{
    public int X { get; } public int Y { get; } public int Z { get; }
    public Point3() : this(0, 0, 0) { }
    public Point3(int x, int y) : this(x, y, 0) { }
    public Point3(int x, int y, int z) { X = x; Y = y; Z = z; }
}` } },
      { title: 'Primary constructor chaining (C# 12)', html: `<p>The parameters of a primary constructor are in scope in the whole class, and the base call sits on the class line. Remember the parameters are captured as hidden fields only if you use them in members.</p>`, code: { lang: 'csharp', run: true, code: `var c = new Checking("C-9", 50m, overdraft: 200m);
Console.WriteLine(c.Available);   // 250.00

class Account(string id, decimal opening)
{
    public string Id { get; } = id;
    public decimal Balance { get; protected set; } = opening;
}
class Checking(string id, decimal opening, decimal overdraft) : Account(id, opening)
{
    public decimal Available => Balance + overdraft;
}` } }
    ],
    deepDive: `<p><b>🟣 Under the hood.</b> A derived object is <b>one</b> heap object. Its memory holds the object header, the method-table pointer, then the base fields followed by the derived fields. The method table of <code>Savings</code> points to its parent's method table, which is how <code>is</code>/<code>as</code> checks walk the hierarchy.</p>
<p><b>Initialiser order is different from Java.</b> In C#, field initialisers run <i>before</i> the base constructor call, from most-derived to least-derived. In Java, the base constructor runs first and derived initialisers afterwards. The practical danger is the same in both: <b>never call a virtual method from a constructor</b>. If <code>Account</code>'s constructor calls a virtual <code>Describe()</code> that <code>Savings</code> overrides, the override runs while the Savings constructor <i>body</i> has not run yet, so anything it sets there is still default. C# is a bit safer because derived field <i>initialisers</i> have already run.</p>
<p><b>Access levels.</b> <code>protected internal</code> = derived classes OR same assembly. <code>private protected</code> (C# 7.2) = derived classes AND same assembly. A derived class can only touch a protected member <b>through an instance of its own type</b> (or a further-derived type), not through an arbitrary base reference — this prevents a <code>Savings</code> from editing a <code>Checking</code>'s protected balance.</p>
<p><b>Fragile base class.</b> Every protected member is part of a contract with code you may not control. Changing the order in which a base method calls its own virtual methods can break subclasses silently. That is why framework designers seal by default and expose small, documented extension points.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants generate class hierarchies in seconds, and they love deep ones (<code>BaseEntity → AuditableEntity → SoftDeletableEntity → Customer</code>). <b>Use AI as a partner:</b> ask "<i>list every place in this hierarchy where a constructor calls a virtual method</i>" or "<i>draw the constructor order for new Savings(...)</i>" and verify against the rules above. <b>Where AI goes wrong:</b> it mixes up Java and C# initialiser order, forgets <code>: base(...)</code> when the parent lacks a default constructor, and suggests <code>protected</code> fields where a <code>protected</code> property with a private setter would keep the invariant. <b>What you still own:</b> deciding whether the relationship is truly IS-A, and keeping hierarchies shallow (one or two levels) so a reviewer can reason about them.</p>`
  });

  topics[0].problems = [{
    title: 'Account Hierarchy with base Calls',
    level: 'Easy', tags: ['inheritance', 'base', 'protected', 'virtual'], companies: ['Microsoft', 'JPMorgan', 'Intuit'],
    statement: `<p>Model a tiny bank. A base class <code>Account</code> holds an id and a <code>long</code> balance. A withdrawal is allowed only if the balance after it stays at or above a <b>floor</b>, and the amount is positive. <code>Savings</code> has a floor of <b>100</b>. <code>Checking</code> has a floor of <b>−limit</b> (an overdraft) and, after a successful withdrawal that leaves the balance negative, reports <code>overdrawn</code>.</p>
<p>Implement <code>public static string[] Run(string[] ops)</code>. Each op is one of:</p>
<ul><li><code>open savings ID AMOUNT</code> → <code>opened ID</code></li>
<li><code>open checking ID AMOUNT LIMIT</code> → <code>opened ID</code></li>
<li><code>withdraw ID AMOUNT</code> → <code>ID ok BAL</code> (plus <code> overdrawn</code> for a Checking account left below zero) or <code>ID denied BAL</code></li>
<li><code>deposit ID AMOUNT</code> → <code>ID ok BAL</code>, or <code>ID denied BAL</code> when AMOUNT ≤ 0</li></ul>
<p>Any op on an id that was never opened prints <code>ID missing</code>.</p>`,
    constraints: `0 ≤ ops.Length ≤ 10<sup>4</sup>; amounts fit in <code>long</code>; ids are unique words.`,
    example: `<p>ops = ["open savings A 500", "withdraw A 350", "withdraw A 100"] → ["opened A", "A ok 150", ${H.c('r', '"A denied 150"')}]. The second withdrawal would leave 50, below the Savings floor of 100.</p>`,
    brute: {
      why: `<p>A single <code>Account</code> class with a <code>string Kind</code> field and an <code>if (Kind == "savings") … else if (Kind == "checking") …</code> inside every method. It works, but each new account type means editing every method (the open/closed principle is broken) and the rules for one kind are scattered across the file.</p>`,
      code: `class FlatAccount
{
    public string Kind = ""; public long Balance; public long Limit;
    public bool Withdraw(long amt)
    {
        long floor = Kind == "savings" ? 100 : Kind == "checking" ? -Limit : 0;   // type switch everywhere
        if (amt <= 0 || Balance - amt < floor) return false;
        Balance -= amt; return true;
    }
}`
    },
    mcq: { q: 'Where should the shared "positive amount and floor" check live?', options: ['Copied into Savings and Checking', 'In Account.Withdraw, with the floor supplied by a protected virtual member the subclasses override', 'In Run, outside the classes', 'In a static helper that switches on the type name'], answer: 1, explain: 'Put the common rule in the base class once and let each subclass vary only the part that differs (the floor). Checking adds its "overdrawn" note by calling base.Withdraw and then inspecting the result.' },
    hints: [
      `<p>Hint 1: Only the floor differs between account kinds. Make it <code>protected virtual long Floor =&gt; 0;</code> in <code>Account</code>.</p>`,
      `<p>Hint 2: <code>Savings</code> overrides <code>Floor =&gt; 100</code>. <code>Checking</code> overrides <code>Floor =&gt; -limit</code> and overrides <code>Describe</code> or a status method that calls the base and appends <code>" overdrawn"</code>.</p>`,
      `<p>Hint 3: Keep accounts in a <code>Dictionary&lt;string, Account&gt;</code>; use <code>TryGetValue</code> to print <code>missing</code>. Parse amounts with <code>long.Parse</code>.</p>`
    ],
    tests: { sig: 'string[] -> string[]', fn: 'Run', cases: [
      [[["open savings A 500", "withdraw A 350", "withdraw A 100", "deposit A 50", "withdraw A 100"]], ["opened A", "A ok 150", "A denied 150", "A ok 200", "A ok 100"]],
      [[["open checking C 50 200", "withdraw C 100", "withdraw C 150", "withdraw C 1", "deposit C 300"]], ["opened C", "C ok -50 overdrawn", "C ok -200 overdrawn", "C denied -200", "C ok 100"]],
      [[["withdraw X 10"]], ["X missing"]],
      [[[]], []],
      [[["open savings S 100", "withdraw S 1", "withdraw S 0", "deposit S -5", "deposit S 0"]], ["opened S", "S denied 100", "S denied 100", "S denied 100", "S denied 100"]],
      [[["open savings A 1000", "open checking B 0 50", "withdraw A 900", "withdraw B 50", "deposit B 50", "withdraw A 0", "withdraw Z 5"]], ["opened A", "opened B", "A ok 100", "B ok -50 overdrawn", "B ok 0", "A denied 100", "Z missing"]],
      [[["open checking C 9000000000 1", "withdraw C 9000000001"]], ["opened C", "C ok -1 overdrawn"]],
      [[["deposit Q 5", "open checking Q 0 0", "withdraw Q 1", "deposit Q 7", "withdraw Q 7"]], ["Q missing", "opened Q", "Q denied 0", "Q ok 7", "Q ok 0"]]
    ] },
    solution: {
      approach: `<p>The base class owns the shared rules (positive amount, floor check, deposit). Subclasses change only what differs: <code>Floor</code>, and Checking adds a status suffix by calling <code>base.Status()</code>. <code>Run</code> keeps a dictionary of accounts typed as the base class — it never needs to know which kind it is talking to.</p>`,
      code: `public class Account
{
    public string Id { get; }
    public long Balance { get; private set; }
    public Account(string id, long opening) { Id = id; Balance = opening; }

    protected virtual long Floor => 0;                      // the one thing subclasses vary

    public virtual bool Withdraw(long amount)
    {
        if (amount <= 0 || Balance - amount < Floor) return false;
        Balance -= amount;
        return true;
    }
    public bool Deposit(long amount)
    {
        if (amount <= 0) return false;
        Balance += amount;
        return true;
    }
    public virtual string Status(bool ok) => $"{Id} {(ok ? "ok" : "denied")} {Balance}";
}

public class Savings : Account
{
    public Savings(string id, long opening) : base(id, opening) { }
    protected override long Floor => 100;
}

public class Checking : Account
{
    private readonly long _limit;
    public Checking(string id, long opening, long limit) : base(id, opening) => _limit = limit;
    protected override long Floor => -_limit;
    public string WithdrawStatus(bool ok) => base.Status(ok) + (ok && Balance < 0 ? " overdrawn" : "");
}

public class Solution
{
    public static string[] Run(string[] ops)
    {
        var accounts = new Dictionary<string, Account>();
        var output = new List<string>();
        foreach (var op in ops)
        {
            var p = op.Split(' ');
            if (p[0] == "open")
            {
                accounts[p[2]] = p[1] == "savings"
                    ? new Savings(p[2], long.Parse(p[3]))
                    : new Checking(p[2], long.Parse(p[3]), long.Parse(p[4]));
                output.Add("opened " + p[2]);
                continue;
            }
            if (!accounts.TryGetValue(p[1], out var acct)) { output.Add(p[1] + " missing"); continue; }
            long amount = long.Parse(p[2]);
            if (p[0] == "deposit") output.Add(acct.Status(acct.Deposit(amount)));
            else
            {
                bool ok = acct.Withdraw(amount);
                output.Add(acct is Checking c ? c.WithdrawStatus(ok) : acct.Status(ok));
            }
        }
        return output.ToArray();
    }
}`,
      dry: { head: ['op', 'object', 'check', 'output'], rows: [
        ['open savings A 500', 'Savings(A, 500)', 'ctor: base(A, 500) first', 'opened A'],
        ['withdraw A 350', 'Account.Withdraw', '500 − 350 = 150 ≥ Floor 100', 'A ok 150'],
        ['withdraw A 100', 'Account.Withdraw', '150 − 100 = 50 &lt; 100', H.c('r', 'A denied 150')],
        ['open checking C 50 200', 'Checking(C, 50, 200)', 'Floor = −200', 'opened C'],
        ['withdraw C 100', 'Withdraw + WithdrawStatus', '−50 ≥ −200, balance &lt; 0', 'C ok -50 overdrawn']
      ] },
      complexity: `<p>O(1) average per operation (dictionary lookup plus constant work), O(number of accounts) memory.</p>`,
      followUps: ['Add a monthly interest method that only Savings supports — where does it go?', 'Why is Balance a property with a private setter instead of a protected field?', 'How would you add a "frozen" state without another subclass? (composition / state object)']
    }
  }];

  /* ======================================================================
     TOPIC 2 — virtual, override, new, sealed
     ====================================================================== */
  topics.push({
    title: 'virtual, override, new & sealed — Polymorphism vs Hiding',
    analogy: `<p>Imagine a <b>TV remote</b> with a big "Power" button. Every TV brand wires that button differently inside, but you just press it — the TV in front of you decides what happens. That is <b>override</b>: one call, the real object picks the behaviour. Now imagine a brand that glues a <i>second</i>, separate "Power" button onto its own special remote. If you use the universal remote, you still press the original button; only people holding the special remote reach the new one. That is <b><code>new</code> (hiding)</b>: which button you get depends on <i>which remote you hold</i> (the variable's type), not on the TV.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> In C# methods are <b>not virtual by default</b> (unlike Java). You opt in:</p>
${H.table(['Keyword', 'Where', 'Meaning'], [
  ['<code>virtual</code>', 'base class', '"Subclasses may replace me." Creates a new slot in the virtual method table.'],
  ['<code>override</code>', 'derived class', '"Replace the inherited virtual method." Fills the <b>same</b> slot, so calls through a base reference reach it.'],
  ['<code>new</code>', 'derived class', '"I am a <b>different</b> method that happens to share the name." Hides the old one; base-typed variables still call the old one.'],
  ['<code>sealed override</code>', 'derived class', '"Override here, and nobody below me may override again."'],
  ['<code>sealed class</code>', 'class', 'Nobody may derive from this class at all.'],
  ['<code>abstract</code>', 'abstract class', 'A virtual slot with no body; derived non-abstract classes must override it.']
])}
<p><b>The one rule to remember:</b> the <b>compile-time type</b> of the variable picks <i>which method</i> is being called; if that method is virtual, the <b>runtime type</b> of the object picks <i>whose override</i> runs.</p>
${H.table(['Code', 'Animal.Speak virtual, Dog overrides "Woof", Puppy : Dog uses new "Yip"', 'Prints'], [
  ['<code>Animal a = new Dog();</code> <code>a.Speak()</code>', 'virtual → runtime type Dog', 'Woof'],
  ['<code>Animal a = new Puppy();</code> <code>a.Speak()</code>', 'virtual slot still holds Dog\'s override; Puppy\'s method is a different one', H.c('y', 'Woof')],
  ['<code>Puppy p = new Puppy();</code> <code>p.Speak()</code>', 'static type Puppy sees the new method first', 'Yip']
])}
<p>If you write a method with the same signature as an inherited one and forget both <code>override</code> and <code>new</code>, the compiler warns <b>CS0108</b> ("hides inherited member; use the new keyword if hiding was intended") and treats it as <code>new</code>. That warning nearly always means you meant <code>override</code>.</p>`,
    clues: [
      '"output prediction: base reference to derived object" → check whether the method is virtual/override or new',
      '"warning CS0108 hides inherited member" → you probably wanted <code>override</code>',
      '"prevent further overriding" → <code>sealed override</code>; "prevent inheritance" → <code>sealed class</code>',
      '"Java methods are virtual by default; what about C#?" → non-virtual by default, opt in with <code>virtual</code>',
      '"runtime polymorphism / dynamic dispatch" → virtual method table (vtable) lookup',
      '"why is my override not called?" → the base method is not virtual, or the derived one uses <code>new</code>'
    ],
    code: [{ lang: 'csharp', run: true, title: 'override vs new vs sealed (runnable)', code: `Animal[] zoo = [new Animal(), new Dog(), new Puppy(), new Wolf()];
foreach (Animal a in zoo)
    Console.WriteLine($"{a.GetType().Name,-6} as Animal -> {a.Speak()}");

Puppy p = new Puppy();
Console.WriteLine($"Puppy  as Puppy  -> {p.Speak()}");   // the hiding method
Console.WriteLine($"Puppy  as Dog    -> {((Dog)p).Speak()}");

class Animal
{
    public virtual string Speak() => "...";
    public string Kind() => "animal";            // non-virtual: always this body
}
class Dog : Animal
{
    public override string Speak() => "Woof";    // fills Animal's virtual slot
}
class Puppy : Dog
{
    public new string Speak() => "Yip";          // a NEW method; the virtual slot still says Woof
}
class Wolf : Dog
{
    public sealed override string Speak() => "Howl";   // classes below Wolf cannot override again
}` }],
    codeTitle: ['Dispatch demo'],
    viz: {
      title: 'Which Speak() runs? (static type vs runtime type)',
      input: 'Puppy Animal',
      inputLabel: 'Runtime type and variable type, e.g. "Puppy Animal" (types: Animal Dog Puppy Wolf)',
      gen: function (input) {
        var w = words(input, 'Enter two type names, e.g. "Puppy Animal"', 2);
        var types = ['Animal', 'Dog', 'Puppy', 'Wolf'];
        var parent = { Animal: null, Dog: 'Animal', Puppy: 'Dog', Wolf: 'Dog' };
        var rt = w[0], st = w[1] || w[0];
        if (types.indexOf(rt) < 0 || types.indexOf(st) < 0) throw new Error('Types must be Animal, Dog, Puppy or Wolf');
        var code = 'class Animal { public virtual string Speak() => "..."; }\nclass Dog : Animal { public override string Speak() => "Woof"; }\nclass Puppy : Dog { public new string Speak() => "Yip"; }\nclass Wolf : Dog { public sealed override string Speak() => "Howl"; }\n' + st + ' x = new ' + rt + '();\nConsole.WriteLine(x.Speak());';
        var line = { Animal: 1, Dog: 2, Puppy: 3, Wolf: 4 };
        var frames = [];
        frames.push({ narr: 'The variable is declared as <b>' + st + '</b> and the object created is a <b>' + rt + '</b>.', parts: [cs(code, one(5, 'cur')), { type: 'vars', label: 'Types', vals: { 'static type': st, 'runtime type': rt } }] });
        var c = rt, ok = false;
        while (c) { if (c === st) { ok = true; break; } c = parent[c]; }
        if (!ok) {
          frames.push({ narr: H.c('r', 'A ' + rt + ' is not a ' + st + '.') + ' An implicit conversion does not compile, and an explicit cast <code>(' + st + ')obj</code> throws <code>InvalidCastException</code> at run time.', parts: [cs(code, one(5, 'bad')), note('Upcasts (derived → base) are always safe and implicit. Downcasts need a cast and may fail; prefer <code>obj is ' + st + ' s</code>.')] });
          frames.push({ narr: 'Try a valid pair such as "Puppy Dog" or "Wolf Animal".', parts: [note('Hierarchy: Animal ← Dog ← Puppy, Dog ← Wolf')] });
          return frames;
        }
        // compile-time lookup
        var found = st === 'Puppy' ? 'Puppy' : null;
        if (found) {
          frames.push({ narr: 'Compile time: looking up <code>Speak</code> on <b>Puppy</b> finds Puppy\'s own <code>new</code> method first. It is <b>not virtual</b>, so the call is bound right now.', parts: [cs(code, one(3, 'cur')), note('Hiding methods are chosen by the static type only.')] });
          frames.push({ narr: 'Run time: no vtable lookup needed. Output: <b>Yip</b>.', parts: [cs(code, one(6, 'ok')), note('Yip', 'Console output')] });
          frames.push({ narr: 'Same object through a <code>Dog</code> or <code>Animal</code> variable would print Woof — the new method is invisible there.', parts: [note('That surprise is why CS0108 warns you.')] });
          return frames;
        }
        frames.push({ narr: 'Compile time: looking up <code>Speak</code> on <b>' + st + '</b> finds the method declared in Animal (a <b>virtual</b> slot). The compiler emits a <code>callvirt</code> through that slot.', parts: [cs(code, one(line[st] === 3 ? 2 : line[st], 'cur')), note('The variable type decides <i>which slot</i>; the object decides <i>what is in it</i>.')] });
        var slot = { Animal: 'Animal.Speak', Dog: 'Dog.Speak', Puppy: 'Dog.Speak', Wolf: 'Wolf.Speak' }[rt];
        var out = { Animal: '...', Dog: 'Woof', Puppy: 'Woof', Wolf: 'Howl' }[rt];
        frames.push({ narr: 'Run time: the object\'s method table for <b>' + rt + '</b> is consulted. Its Speak slot holds <b>' + slot + '</b>' + (rt === 'Puppy' ? ' — Puppy\'s <code>new</code> method lives in a separate slot, so it does not count.' : '.'), parts: [{ type: 'map', label: rt + ' method table', entries: [['Speak (virtual slot)', slot], ['ToString', 'object.ToString'], ['Equals', 'object.Equals']].concat(rt === 'Puppy' ? [['Speak (new, non-virtual)', 'Puppy.Speak']] : []), hl: { 'Speak (virtual slot)': 'sel' } }] });
        frames.push({ narr: 'Output: <b>' + out + '</b>.', parts: [cs(code, one(6, 'ok')), note(out, 'Console output')] });
        return frames;
      }
    },
    examples: [
      { title: 'The CS0108 trap', html: `<p>You meant to customise <code>ToDisplay()</code> but forgot <code>override</code>. Code that holds a base reference keeps calling the base version, and the bug only appears in production lists of base-typed objects.</p>`, code: { lang: 'csharp', code: `class Item { public virtual string ToDisplay() => "item"; }
class Book : Item
{
    // public string ToDisplay() => "book";        // warning CS0108: hides, does NOT override
    public override string ToDisplay() => "book";  // correct
}` } },
      { title: 'sealed override to lock behaviour', html: `<p>A security check that must not be bypassed by deeper subclasses: seal the override. A class deriving from <code>AdminPolicy</code> gets error CS0239 if it tries to override <code>Allows</code>.</p>`, code: { lang: 'csharp', code: `abstract class Policy { public abstract bool Allows(string user); }
class AdminPolicy : Policy
{
    public sealed override bool Allows(string user) => user == "root";
}` } },
      { title: 'Calling a virtual method non-virtually with base', html: `<p><code>base.Speak()</code> is compiled as a plain <code>call</code>, not <code>callvirt</code>, so it always runs the parent's body even though Speak is virtual. That is how an override can extend its parent without recursion.</p>`, code: { lang: 'csharp', run: true, code: `Console.WriteLine(new Loud().Speak());   // WOOF!

class Dog { public virtual string Speak() => "Woof"; }
class Loud : Dog { public override string Speak() => base.Speak().ToUpper() + "!"; }` } }
    ],
    deepDive: `<p><b>🟣 How dispatch really works.</b> Each type has a <b>method table</b> (MethodTable in CoreCLR) containing a slot per virtual method. A derived type copies its parent's slots and replaces those it overrides; <code>new virtual</code> or a non-virtual <code>new</code> method adds a separate entry. A virtual call loads the object's method-table pointer, indexes the slot, and jumps — two dependent loads. The C# compiler emits <code>callvirt</code> for nearly all instance calls (even non-virtual ones) because <code>callvirt</code> also performs the null check.</p>
<p><b>Devirtualisation.</b> The JIT turns virtual calls into direct calls (and may inline them) when it can prove the exact type: the class or method is <code>sealed</code>, the object was just created with <code>new</code>, or (with Dynamic PGO, on by default in .NET 8) the profile shows one dominant type, in which case it emits a type check plus an inlined fast path. Sealing leaf classes is a genuine, cheap performance win in hot code, and the .NET team added analyzer CA1852 to suggest it.</p>
<p><b>Versioning.</b> C# makes you choose <code>override</code> or <code>new</code> on purpose because of library evolution: if version 2 of a base library adds a virtual method with the same name as one already in your subclass, your method does not silently start overriding it — it is treated as hiding (with a warning) until you decide.</p>
<p><b>Properties, indexers and events</b> can be virtual too. Fields cannot. <code>static</code> members are never virtual (static abstract interface members, module 11, are a separate compile-time mechanism).</p>`,
    aiEra: `<p><b>What AI changes:</b> output-prediction questions are now easy to "check" by asking a model, but models regularly answer them with Java rules (everything virtual). <b>Use AI as a partner:</b> paste a hierarchy and ask "<i>which calls are bound at compile time and which at run time?</i>", then confirm by running it. Ask it to find CS0108 warnings in a build log and explain each. <b>Where AI goes wrong:</b> it adds <code>new</code> to silence warnings instead of fixing the missing <code>override</code>, and it rarely suggests <code>sealed</code>. <b>What you still own:</b> the design decision of which members are extension points (virtual) and which are fixed, and knowing the static-type/runtime-type rule cold for interviews.</p>`
  });

  topics[1].problems = [{
    title: 'Predict the Dispatch',
    level: 'Easy', tags: ['virtual', 'override', 'new', 'sealed', 'casting'], companies: ['Microsoft', 'Unity', 'EPAM'],
    statement: `<p>Use this hierarchy exactly:</p>
<ul><li><code>Animal</code>: <code>public virtual string Speak() =&gt; "..."</code></li>
<li><code>Dog : Animal</code>: <code>override</code> → <code>"Woof"</code></li>
<li><code>Puppy : Dog</code>: <code>public new string Speak() =&gt; "Yip"</code></li>
<li><code>Wolf : Dog</code>: <code>sealed override</code> → <code>"Howl"</code></li></ul>
<p>Implement <code>public static string[] Dispatch(string[] queries)</code>. Each query is <code>"R as S"</code>: create an object of runtime type R, view it through a variable of static type S, and call <code>Speak()</code>. If an R is not an S, return <code>"invalid cast"</code> for that query. Let the real C# runtime do the work — do not hard-code a table.</p>`,
    constraints: `R and S are one of Animal, Dog, Puppy, Wolf. 0 ≤ queries.Length ≤ 100.`,
    example: `<p>["Dog as Animal", "Puppy as Animal", "Puppy as Puppy"] → ["Woof", ${H.c('y', '"Woof"')}, "Yip"]. A Puppy seen as an Animal uses the virtual slot, which still holds Dog's override; Puppy's <code>new</code> method is only visible through a Puppy variable.</p>`,
    brute: {
      why: `<p>A hand-written lookup table of 16 answers. It "passes", but it encodes your guess about C# rules instead of testing them, and it breaks the moment the hierarchy changes. The point of the exercise is to let the compiler and runtime decide.</p>`,
      code: `static string Guess(string q) => q switch
{
    "Puppy as Puppy" => "Yip",
    "Puppy as Animal" => "Yip",      // a typical wrong guess: Puppy's new method is not in the virtual slot
    _ => "Woof"
};`
    },
    mcq: { q: '<code>Dog d = new Puppy(); d.Speak();</code> prints…', options: ['Yip, because the object is a Puppy', 'Woof, because Puppy.Speak is a new (hiding) method and Dog.Speak is the override in the virtual slot', 'A compile error', '"..."'], answer: 1, explain: 'The static type Dog finds the virtual Speak; at run time the slot holds the most-derived override, which is Dog\'s, because Puppy hid the method instead of overriding it.' },
    hints: [
      `<p>Hint 1: Build the object with a switch: <code>Animal obj = r switch { "Dog" =&gt; new Dog(), … };</code>.</p>`,
      `<p>Hint 2: For the static type use pattern matching: <code>"Puppy" =&gt; obj is Puppy p ? p.Speak() : "invalid cast"</code>. Calling <code>Speak</code> on <code>p</code> (type Puppy) binds to the hiding method.</p>`,
      `<p>Hint 3: Every object is an Animal, so the Animal branch never fails. Split each query with <code>Split(" as ")</code>.</p>`
    ],
    tests: { sig: 'string[] -> string[]', fn: 'Dispatch', cases: [
      [[["Dog as Animal", "Puppy as Animal", "Puppy as Puppy"]], ["Woof", "Woof", "Yip"]],
      [[["Animal as Animal", "Wolf as Animal", "Wolf as Dog", "Wolf as Wolf"]], ["...", "Howl", "Howl", "Howl"]],
      [[["Animal as Dog"]], ["invalid cast"]],
      [[[]], []],
      [[["Puppy as Dog", "Dog as Dog", "Dog as Puppy", "Wolf as Puppy"]], ["Woof", "Woof", "invalid cast", "invalid cast"]],
      [[["Puppy as Wolf", "Animal as Puppy", "Puppy as Puppy"]], ["invalid cast", "invalid cast", "Yip"]],
      [[["Animal as Wolf", "Dog as Wolf", "Wolf as Wolf", "Animal as Animal"]], ["invalid cast", "invalid cast", "Howl", "..."]]
    ] },
    solution: {
      approach: `<p>Create the runtime object, then view it through the requested static type with <code>is</code> patterns. Calling <code>Speak</code> on a variable of that static type makes the compiler pick the method exactly as the rules say, and the runtime does the virtual dispatch.</p>`,
      code: `public class Animal { public virtual string Speak() => "..."; }
public class Dog : Animal { public override string Speak() => "Woof"; }
public class Puppy : Dog { public new string Speak() => "Yip"; }
public class Wolf : Dog { public sealed override string Speak() => "Howl"; }

public class Solution
{
    public static string[] Dispatch(string[] queries)
    {
        var result = new List<string>();
        foreach (var q in queries)
        {
            var parts = q.Split(" as ");
            Animal obj = parts[0] switch
            {
                "Dog" => new Dog(),
                "Puppy" => new Puppy(),
                "Wolf" => new Wolf(),
                _ => new Animal()
            };
            string said = parts[1] switch
            {
                "Animal" => obj.Speak(),                                   // virtual call through Animal
                "Dog" => obj is Dog d ? d.Speak() : "invalid cast",        // virtual call through Dog
                "Puppy" => obj is Puppy p ? p.Speak() : "invalid cast",    // binds to the hiding method
                "Wolf" => obj is Wolf w ? w.Speak() : "invalid cast",
                _ => "invalid cast"
            };
            result.Add(said);
        }
        return result.ToArray();
    }
}`,
      dry: { head: ['query', 'static type finds', 'runtime slot', 'result'], rows: [
        ['Dog as Animal', 'Animal.Speak (virtual)', 'Dog.Speak', 'Woof'],
        ['Puppy as Animal', 'Animal.Speak (virtual)', 'Dog.Speak (Puppy only hid it)', H.c('y', 'Woof')],
        ['Puppy as Puppy', 'Puppy.Speak (new, non-virtual)', '— bound at compile time', 'Yip'],
        ['Animal as Dog', '—', 'is Dog fails', H.c('r', 'invalid cast')]
      ] },
      complexity: `<p>O(1) per query; one allocation per query.</p>`,
      followUps: ['What would change if Puppy used <code>public new virtual string Speak()</code> and a class below it overrode that?', 'Why does C# require you to choose between override and new explicitly?']
    }
  }];

  /* ======================================================================
     TOPIC 3 — Abstract classes and the template method
     ====================================================================== */
  topics.push({
    title: 'Abstract Classes & the Template Method',
    analogy: `<p>A <b>job application form</b> from head office has fixed sections — name, address, signature — plus one blank box labelled "<i>department-specific questions: each department fills this in</i>". You cannot hand the blank form to a candidate as it is; a department must complete the box first. An <b>abstract class</b> is that form: it fixes the overall steps, leaves some steps <b>abstract</b> (no body), and cannot be used until a concrete subclass fills in the blanks.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> Mark a class <code>abstract</code> when it describes a <b>general concept</b> that should never exist on its own ("a Shape" — but which one?). An abstract class:</p>
<ul>
<li><b>cannot be instantiated</b>: <code>new Shape()</code> is error CS0144;</li>
<li>may have <b>abstract members</b> — methods, properties, indexers or events with no body, which every concrete subclass must <code>override</code>;</li>
<li>may <b>also</b> have normal fields, constructors, properties and fully written methods — that is the big difference from an interface's traditional role;</li>
<li>usually has a <code>protected</code> constructor, since only subclasses call it.</li>
</ul>
${H.table(['', 'abstract method', 'virtual method', 'normal method'], [
  ['Has a body?', H.c('r', 'no'), H.c('g', 'yes (default behaviour)'), H.c('g', 'yes')],
  ['Subclass must override?', H.c('y', 'yes (unless the subclass is abstract too)'), 'may', 'cannot (only hide with new)'],
  ['Allowed in a non-abstract class?', H.c('r', 'no'), 'yes', 'yes']
])}
<p><b>The template method pattern</b> is the classic reason to use an abstract class: a non-virtual method in the base defines the <i>algorithm skeleton</i> and calls abstract or virtual "hook" steps that subclasses fill in. The order of steps is protected; only the details vary.</p>
${H.table(['Step in Report.Render()', 'Who writes it'], [['Header()', 'base (fixed)'], ['Body()', H.c('b', 'abstract — each report type')], ['Footer()', 'virtual — base default, override if needed'], ['the order Header → Body → Footer', 'base, non-virtual: nobody can change it']])}`,
    clues: [
      '"common code + some steps that differ per type" → abstract base class with a template method',
      '"should never be created on its own" → mark it <code>abstract</code>',
      '"force every subclass to implement X" → abstract member',
      '"abstract class vs interface" → state + constructors + shared code vs pure contract and multiple implementation',
      '"cannot create an instance of the abstract type" (CS0144) → instantiate a concrete subclass',
      '"Shape / Employee / Vehicle / Report hierarchy" → classic abstract-class design question'
    ],
    code: [{ lang: 'csharp', run: true, title: 'Abstract Shape with a template method (runnable)', code: `using System.Globalization;

Shape[] shapes = [new Circle(1), new Rect(2, 3)];
foreach (var s in shapes) Console.WriteLine(s.Describe());

abstract class Shape
{
    protected Shape(string name) => Name = name;    // only subclasses can call this
    public string Name { get; }

    public abstract double Area();                  // no body: every concrete shape must provide it
    public abstract double Perimeter();

    // Template method: fixed format, the varying numbers come from the subclass
    public string Describe() =>
        string.Create(CultureInfo.InvariantCulture, $"{Name} area={Area():F2} perimeter={Perimeter():F2}");
}

sealed class Circle(double r) : Shape("Circle")
{
    public override double Area() => Math.PI * r * r;
    public override double Perimeter() => 2 * Math.PI * r;
}

sealed class Rect(double w, double h) : Shape("Rectangle")
{
    public override double Area() => w * h;
    public override double Perimeter() => 2 * (w + h);
}` }],
    codeTitle: ['Shapes'],
    viz: {
      title: 'Template method: the base drives, the subclass fills in',
      input: 'Rect',
      inputLabel: 'Concrete shape: Circle or Rect',
      gen: function (input) {
        var k = words(input, 'Type Circle or Rect', 1)[0];
        if (k !== 'Circle' && k !== 'Rect') throw new Error('Type Circle or Rect');
        var code = 'abstract class Shape {\n  public string Describe() =>\n    $"{Name} area={Area():F2} perimeter={Perimeter():F2}";\n  public abstract double Area();\n  public abstract double Perimeter();\n}\nclass Circle(double r) : Shape("Circle") {\n  public override double Area() => Math.PI * r * r;\n  public override double Perimeter() => 2 * Math.PI * r;\n}\nclass Rect(double w, double h) : Shape("Rectangle") {\n  public override double Area() => w * h;\n  public override double Perimeter() => 2 * (w + h);\n}';
        var c = k === 'Circle';
        var a = c ? '3.14' : '6.00', p = c ? '6.28' : '10.00', base = c ? 8 : 12;
        return walk(code, [
          [2, 'Caller runs <code>shape.Describe()</code> on a ' + (c ? 'Circle(1)' : 'Rect(2, 3)') + '. Describe lives in the <b>abstract base</b> and is not virtual: the format is fixed for everyone.', { shape: k }, ['Main', 'Shape.Describe'], ''],
          [3, 'The template needs the area. <code>Area()</code> is abstract, so this is a virtual call into the subclass.', { shape: k }, ['Main', 'Shape.Describe'], ''],
          [base, (c ? 'Circle' : 'Rect') + '.Area runs and returns ' + a + '.', { area: a }, ['Main', 'Shape.Describe', k + '.Area'], ''],
          [3, 'Back in the template; next it needs the perimeter.', { area: a }, ['Main', 'Shape.Describe'], ''],
          [base + 1, (c ? 'Circle' : 'Rect') + '.Perimeter returns ' + p + '.', { area: a, perimeter: p }, ['Main', 'Shape.Describe', k + '.Perimeter'], ''],
          [3, 'The base assembles the final string. The subclass never saw the format.', { area: a, perimeter: p }, ['Main', 'Shape.Describe'], (c ? 'Circle' : 'Rectangle') + ' area=' + a + ' perimeter=' + p]
        ]);
      }
    },
    examples: [
      { title: 'An abstract class can still have state and a constructor', html: `<p>Abstract does not mean empty. Here the base validates and stores the name for every subclass. Note the constructor is <code>protected</code>; making it <code>public</code> is legal but pointless because nobody can call <code>new</code> on the abstract type anyway.</p>`, code: { lang: 'csharp', code: `abstract class Employee
{
    protected Employee(string name)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        Name = name;
    }
    public string Name { get; }
    public abstract decimal MonthlyPay();
}` } },
      { title: 'An abstract subclass can postpone the work', html: `<p>A class that derives from an abstract class but does not implement every abstract member must itself be <code>abstract</code>. It can also <b>re-abstract</b> a virtual method: <code>public abstract override string ToString();</code> forces its own subclasses to write a ToString.</p>`, code: { lang: 'csharp', code: `abstract class Vehicle { public abstract int Wheels { get; } public abstract string Fuel(); }
abstract class Car : Vehicle
{
    public override int Wheels => 4;          // fills one blank
    public abstract override string ToString();   // forces subclasses to write ToString
}
sealed class Ev : Car
{
    public override string Fuel() => "electric";
    public override string ToString() => "EV";
}` } },
      { title: 'Hook methods: virtual with a sensible default', html: `<p>A template method often mixes <b>abstract</b> steps (must fill) with <b>virtual hooks</b> (may customise). The default footer works for most reports; only the audit report changes it.</p>`, code: { lang: 'csharp', run: true, code: `Console.WriteLine(new SalesReport().Render());
Console.WriteLine(new AuditReport().Render());

abstract class Report
{
    public string Render() => $"[{Title}] {Body()} {Footer()}";   // fixed order
    protected abstract string Title { get; }
    protected abstract string Body();
    protected virtual string Footer() => "-- end";               // hook with a default
}
class SalesReport : Report { protected override string Title => "Sales"; protected override string Body() => "42 units"; }
class AuditReport : Report
{
    protected override string Title => "Audit";
    protected override string Body() => "0 issues";
    protected override string Footer() => "-- signed";
}` } }
    ],
    deepDive: `<p><b>🟣 Abstract vs interface in modern C#.</b> Since C# 8, interfaces can carry default method bodies, and since C# 11 static abstract members, so the line is blurrier than in textbooks. What abstract classes still uniquely give you: <b>instance fields</b> and therefore real state, <b>constructors</b> that enforce invariants, non-public members of any access level that subclasses inherit, and the ability to <b>add a new non-abstract member later without breaking</b> existing subclasses (adding a member to an interface needs a default body to be non-breaking). What they cost: a class can have only one base class, so choosing an abstract base "uses up" the inheritance slot.</p>
<p><b>Template method vs strategy.</b> The template method fixes behaviour at <i>compile time</i> through inheritance; a strategy object (topic 7) fixes it at <i>run time</i> through composition. If the varying step needs to change per call or be combined, prefer a strategy. If the subclasses are true specialisations with their own data, the template method is simpler.</p>
<p><b>Calling abstract members from the base constructor</b> is legal but dangerous: the override runs before the subclass constructor body. With primary constructors the captured parameters are assigned before the base call, which makes C# somewhat safer than Java here, but explicitly assigned fields in a body are not.</p>
<p><b>Performance.</b> Abstract calls are ordinary virtual calls. If concrete shapes are <code>sealed</code> and the JIT sees the exact type, it devirtualises; across a heterogeneous array it cannot, and a virtual call costs a couple of nanoseconds — irrelevant except in the tightest loops.</p>`,
    aiEra: `<p><b>What AI changes:</b> "generate the Shape/Employee hierarchy" is a one-line prompt now, so interviewers ask <i>why</i> you chose an abstract class. <b>Use AI as a partner:</b> ask it to argue for and against an abstract base versus an interface plus a helper class for your case, and to list which members truly need to vary. <b>Where AI goes wrong:</b> it marks every method <code>virtual</code> "for flexibility", makes base constructors public, and duplicates formatting code in each subclass instead of using a template method. <b>What you still own:</b> choosing which steps are fixed and which vary, and keeping the base class small enough that changing it does not break a dozen subclasses.</p>`
  });

  topics[2].problems = [{
    title: 'Shape Report with an Abstract Base',
    level: 'Easy', tags: ['abstract class', 'template method', 'formatting', 'stdin'], companies: ['Microsoft', 'Siemens', 'Autodesk'],
    statement: `<p>Write a complete program. The first line holds <code>n</code>; each of the next <code>n</code> lines describes a shape: <code>circle r</code>, <code>rect w h</code> or <code>triangle a b c</code>. Use an abstract class <code>Shape</code> with abstract <code>Area()</code> and <code>Perimeter()</code> and a non-virtual template method that prints</p>
<pre>Name area=A perimeter=P</pre>
<p>with two decimals (Names: <code>Circle</code>, <code>Rectangle</code>, <code>Triangle</code>). A triangle whose sides break the strict triangle inequality prints <code>invalid triangle</code>; an unknown keyword prints <code>unknown shape KEYWORD</code>. Finish with <code>total area=T</code> (two decimals) summing only the valid shapes. Format numbers with the invariant culture.</p>`,
    constraints: `0 ≤ n ≤ 1000; dimensions are positive decimals ≤ 10<sup>6</sup>. Triangle area by Heron's formula.`,
    example: `<p>Input <code>3 / circle 1 / rect 2 3 / triangle 3 4 5</code> prints <code>Circle area=3.14 perimeter=6.28</code>, <code>Rectangle area=6.00 perimeter=10.00</code>, <code>Triangle area=6.00 perimeter=12.00</code>, <code>total area=15.14</code> (π + 6 + 6 = 15.14159…).</p>`,
    brute: {
      why: `<p>One big loop with a <code>switch</code> on the keyword that computes and prints inline. It works for three shapes but every new shape touches the loop, the formatting is duplicated three times, and nothing stops a future shape from printing a different format.</p>`,
      code: `static void PrintShape(string kind, double[] d)
{
    switch (kind)
    {
        case "circle": Console.WriteLine($"Circle area={Math.PI * d[0] * d[0]:F2} perimeter={2 * Math.PI * d[0]:F2}"); break;
        case "rect": Console.WriteLine($"Rectangle area={d[0] * d[1]:F2} perimeter={2 * (d[0] + d[1]):F2}"); break;
    }
}`
    },
    mcq: { q: 'Which member of Shape should NOT be virtual or abstract?', options: ['Area()', 'Perimeter()', 'The method that formats the line (the template method)', 'All of them should be abstract'], answer: 2, explain: 'The template method fixes the output format for every shape. Only the varying calculations are abstract.' },
    hints: [
      `<p>Hint 1: <code>abstract class Shape { public abstract double Area(); public abstract double Perimeter(); protected abstract string Name { get; } public string Describe() =&gt; … }</code>.</p>`,
      `<p>Hint 2: Heron: s = (a + b + c) / 2, area = √(s(s−a)(s−b)(s−c)). Validate with a + b &gt; c, a + c &gt; b, b + c &gt; a before creating the Triangle.</p>`,
      `<p>Hint 3: Read everything with <code>Console.In.ReadToEnd()</code> and split into lines. Format with <code>ToString("F2", CultureInfo.InvariantCulture)</code>.</p>`
    ],
    tests: { io: true, cases: [
      { stdin: '3\ncircle 1\nrect 2 3\ntriangle 3 4 5\n', stdout: 'Circle area=3.14 perimeter=6.28\nRectangle area=6.00 perimeter=10.00\nTriangle area=6.00 perimeter=12.00\ntotal area=15.14' },
      { stdin: '1\ncircle 2.5\n', stdout: 'Circle area=19.63 perimeter=15.71\ntotal area=19.63' },
      { stdin: '0\n', stdout: 'total area=0.00' },
      { stdin: '2\ntriangle 1 2 3\nrect 0.5 0.5\n', stdout: 'invalid triangle\nRectangle area=0.25 perimeter=2.00\ntotal area=0.25' },
      { stdin: '2\ntriangle 2 2 2\ncircle 10\n', stdout: 'Triangle area=1.73 perimeter=6.00\nCircle area=314.16 perimeter=62.83\ntotal area=315.89' },
      { stdin: '1\nrect 1000000 1000000\n', stdout: 'Rectangle area=1000000000000.00 perimeter=4000000.00\ntotal area=1000000000000.00' },
      { stdin: '1\nhexagon 3\n', stdout: 'unknown shape hexagon\ntotal area=0.00' }
    ] },
    solution: {
      approach: `<p>The abstract base owns the output format (template method) and the name; each concrete shape supplies only its formulas. Parsing and validation stay in the program, so a <code>Triangle</code> object can never be invalid.</p>`,
      code: { lang: 'csharp', run: true, code: `using System.Globalization;

var inv = CultureInfo.InvariantCulture;
var lines = Console.In.ReadToEnd().Split('\\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
int n = lines.Length > 0 ? int.Parse(lines[0]) : 0;
double total = 0;
for (int i = 1; i <= n; i++)
{
    var p = lines[i].Split(' ', StringSplitOptions.RemoveEmptyEntries);
    double D(int k) => double.Parse(p[k], inv);
    Shape? shape = p[0] switch
    {
        "circle" => new Circle(D(1)),
        "rect" => new Rect(D(1), D(2)),
        "triangle" when Triangle.IsValid(D(1), D(2), D(3)) => new Triangle(D(1), D(2), D(3)),
        _ => null
    };
    if (shape is null)
    {
        Console.WriteLine(p[0] == "triangle" ? "invalid triangle" : "unknown shape " + p[0]);
        continue;
    }
    Console.WriteLine(shape.Describe());
    total += shape.Area();
}
Console.WriteLine("total area=" + total.ToString("F2", inv));

abstract class Shape
{
    protected abstract string Name { get; }
    public abstract double Area();
    public abstract double Perimeter();
    public string Describe()   // template method: one format for every shape
    {
        var inv = CultureInfo.InvariantCulture;
        return $"{Name} area={Area().ToString("F2", inv)} perimeter={Perimeter().ToString("F2", inv)}";
    }
}
sealed class Circle(double r) : Shape
{
    protected override string Name => "Circle";
    public override double Area() => Math.PI * r * r;
    public override double Perimeter() => 2 * Math.PI * r;
}
sealed class Rect(double w, double h) : Shape
{
    protected override string Name => "Rectangle";
    public override double Area() => w * h;
    public override double Perimeter() => 2 * (w + h);
}
sealed class Triangle(double a, double b, double c) : Shape
{
    public static bool IsValid(double a, double b, double c) => a + b > c && a + c > b && b + c > a;
    protected override string Name => "Triangle";
    public override double Perimeter() => a + b + c;
    public override double Area()
    {
        double s = (a + b + c) / 2;
        return Math.Sqrt(s * (s - a) * (s - b) * (s - c));
    }
}` },
      dry: { head: ['line', 'object', 'Area / Perimeter', 'printed'], rows: [
        ['circle 1', 'Circle(1)', 'π / 2π', 'Circle area=3.14 perimeter=6.28'],
        ['rect 2 3', 'Rect(2, 3)', '6 / 10', 'Rectangle area=6.00 perimeter=10.00'],
        ['triangle 3 4 5', 'Triangle', 's = 6, √36 = 6 / 12', 'Triangle area=6.00 perimeter=12.00'],
        ['end', '—', 'sum 15.14159', 'total area=15.14']
      ] },
      complexity: `<p>O(n) time, O(1) extra memory besides the input lines.</p>`,
      followUps: ['Add a Square: should it derive from Rect? (think about Liskov when widths can change)', 'Move the culture choice into a parameter of Describe — what changes?']
    }
  }];

  /* ======================================================================
     TOPIC 4 — Interfaces and default interface methods
     ====================================================================== */
  topics.push({
    title: 'Interfaces & Default Interface Methods',
    analogy: `<p>A <b>wall socket standard</b> says: "any device with this plug shape will get power". The socket does not care whether you plug in a lamp, a laptop or a kettle. An <b>interface</b> is that standard for code: a list of members a type promises to have. Any class or struct can sign up, even if it already has a different parent — a kettle can be a "kitchen appliance" <i>and</i> fit the plug standard. A <b>default interface method</b> is like the standard shipping with a basic built-in fuse: devices get it for free unless they bring their own.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> An interface declares <b>what</b> a type can do, not <b>how</b>. By convention names start with <code>I</code>: <code>IComparable&lt;T&gt;</code>, <code>IDisposable</code>, <code>IEnumerable&lt;T&gt;</code>.</p>
${H.table(['Interfaces can contain', 'Interfaces cannot contain'], [
  ['methods, properties, indexers, events', 'instance fields (no per-object state)'],
  ['default bodies for members (C# 8+)', 'instance constructors'],
  ['static members, static fields, static abstract/virtual members (C# 11)', 'finalizers'],
  ['private/protected helper members used by defaults (C# 8+)', '—']
])}
<p><b>Why interfaces matter:</b></p>
<ul>
<li>A class may implement <b>any number</b> of interfaces: <code>class Kettle : Appliance, IPluggable, IDisposable</code> (base class first, then interfaces).</li>
<li><b>Structs</b> can implement interfaces too (but not inherit classes).</li>
<li>Code written against an interface (<code>void Save(IStorage s)</code>) works with every implementation — real, fake, cached — which is the backbone of dependency injection and unit testing.</li>
</ul>
<p><b>Default interface methods (DIM).</b> Since C# 8 an interface member may have a body. A class that implements the interface but not that member inherits the default. Important detail: the default is reachable <b>only through the interface type</b>, not through the class type.</p>
${H.table(['Code', 'Compiles?'], [
  ['<code>ILogger log = new ConsoleLogger(); log.Error("x");</code>', H.c('g', 'yes — uses the default Error')],
  ['<code>var c = new ConsoleLogger(); c.Error("x");</code>', H.c('r', 'no (CS1061) — the class itself has no Error member')]
])}
<p>DIMs exist mainly so library authors can <b>add a member to a published interface without breaking</b> every implementer, the way <code>IAsyncDisposable</code>-style evolution needs.</p>`,
    clues: [
      '"can-do" capability shared by unrelated types (comparable, disposable, serialisable) → interface',
      '"a class needs two parents" → one base class plus interfaces',
      '"add a method to a published interface without breaking implementers" → default interface method',
      '"swap the real database for a fake in tests" → depend on an interface',
      '"why can\'t I call the default method on my class variable?" → defaults are only visible through the interface type',
      '"struct needs polymorphism" → structs implement interfaces (beware boxing when cast to the interface)'
    ],
    code: [{ lang: 'csharp', run: true, title: 'Interfaces with a default method (runnable)', code: `ILogger[] loggers = [new ConsoleLogger(), new LoudLogger()];
foreach (var log in loggers)
{
    log.Log("started");
    log.Error("disk full");          // default body unless the class provides its own
}

var plain = new ConsoleLogger();
plain.Log("direct call works");
// plain.Error("x");                 // CS1061: Error is not a member of the class itself
((ILogger)plain).Error("through the interface it works");

interface ILogger
{
    void Log(string message);                              // must implement
    void Error(string message) => Log("ERROR: " + message); // default implementation (C# 8+)
}

class ConsoleLogger : ILogger
{
    public void Log(string message) => Console.WriteLine("[console] " + message);
}

class LoudLogger : ILogger
{
    public void Log(string message) => Console.WriteLine("[loud] " + message.ToUpperInvariant());
    public void Error(string message) => Log("!!! " + message);   // replaces the default
}` }],
    codeTitle: ['ILogger'],
    viz: {
      title: 'Where does a call on an interface land?',
      input: 'Console Error',
      inputLabel: 'Logger (Console or Loud) and method (Log or Error)',
      gen: function (input) {
        var w = words(input, 'Enter e.g. "Console Error"', 2);
        var lg = w[0], m = w[1] || 'Log';
        if (['Console', 'Loud'].indexOf(lg) < 0 || ['Log', 'Error'].indexOf(m) < 0) throw new Error('Logger must be Console or Loud, method Log or Error');
        var code = 'interface ILogger {\n  void Log(string msg);\n  void Error(string msg) => Log("ERROR: " + msg);\n}\nclass ConsoleLogger : ILogger {\n  public void Log(string msg) => Console.WriteLine("[console] " + msg);\n}\nclass LoudLogger : ILogger {\n  public void Log(string msg) => Console.WriteLine("[loud] " + msg.ToUpperInvariant());\n  public void Error(string msg) => Log("!!! " + msg);\n}\nILogger log = new ' + lg + 'Logger();\nlog.' + m + '("disk");';
        var frames = [];
        frames.push({ narr: 'The variable has the interface type <code>ILogger</code>. The call <code>log.' + m + '</code> is compiled as a call through the interface slot <b>ILogger.' + m + '</b>.', parts: [cs(code, one(13, 'cur')), { type: 'map', label: lg + 'Logger interface map', entries: [['ILogger.Log', lg + 'Logger.Log'], ['ILogger.Error', lg === 'Loud' ? 'LoudLogger.Error' : 'ILogger.Error (default body)']], hl: one('ILogger.' + m, 'sel') }] });
        var out;
        if (m === 'Log') {
          out = lg === 'Loud' ? '[loud] DISK' : '[console] disk';
          frames.push({ narr: 'Log has no default, so every class must implement it. The interface map points to <b>' + lg + 'Logger.Log</b>.', parts: [cs(code, one(lg === 'Loud' ? 9 : 6, 'cur'))] });
        } else if (lg === 'Loud') {
          out = '[loud] !!! DISK';
          frames.push({ narr: 'LoudLogger declares its own public <code>Error</code>, which implements the interface member and <b>replaces the default</b>.', parts: [cs(code, one(10, 'cur'))] });
          frames.push({ narr: 'Its body calls <code>Log("!!! disk")</code>, which is LoudLogger.Log.', parts: [cs(code, one(9, 'cur'))] });
        } else {
          out = '[console] ERROR: disk';
          frames.push({ narr: 'ConsoleLogger has no Error, so the runtime uses the <b>default body in the interface</b>.', parts: [cs(code, one(3, 'cur')), note('Inside the default, <code>this</code> is the ConsoleLogger, so <code>Log(...)</code> is an interface call back into ConsoleLogger.Log.')] });
          frames.push({ narr: 'The default calls <code>Log("ERROR: disk")</code> → ConsoleLogger.Log.', parts: [cs(code, one(6, 'cur'))] });
        }
        frames.push({ narr: 'Printed: <b>' + out + '</b>', parts: [cs(code, one(13, 'ok')), note(out, 'Console output')] });
        frames.push({ narr: 'Remember: with a <code>' + lg + 'Logger</code>-typed variable, <code>Error</code> ' + (lg === 'Loud' ? 'is visible (the class declares it).' : 'would not compile — defaults are reachable only through the interface.'), parts: [note('Defaults are interface members, not class members.')] });
        return frames;
      }
    },
    examples: [
      { title: 'One class, several interfaces', html: `<p>The base class (if any) comes first, then interfaces in any order. A <code>Kettle</code> can be passed to anything that needs an <code>IPluggable</code> or an <code>IDisposable</code>.</p>`, code: { lang: 'csharp', code: `abstract class Appliance { public abstract string Name { get; } }
interface IPluggable { int Watts { get; } }
sealed class Kettle : Appliance, IPluggable, IDisposable
{
    public override string Name => "Kettle";
    public int Watts => 2000;
    public void Dispose() { /* release the heating element handle */ }
}` } },
      { title: 'Programming to the interface for testability', html: `<p>The service depends on <code>IClock</code>, not on <code>DateTime.Now</code>. Tests pass a fixed clock; production passes the real one. (.NET 8 even ships <code>TimeProvider</code> for exactly this.)</p>`, code: { lang: 'csharp', run: true, code: `var greeter = new Greeter(new FixedClock(new DateTime(2026, 1, 1, 9, 0, 0)));
Console.WriteLine(greeter.Greet());   // Good morning

interface IClock { DateTime Now { get; } }
sealed class SystemClock : IClock { public DateTime Now => DateTime.Now; }
sealed class FixedClock(DateTime at) : IClock { public DateTime Now => at; }
sealed class Greeter(IClock clock)
{
    public string Greet() => clock.Now.Hour < 12 ? "Good morning" : "Good afternoon";
}` } },
      { title: 'Structs implementing interfaces (and the boxing catch)', html: `<p>A struct can implement an interface. Assigning it to an interface variable <b>boxes</b> it (copies it to the heap), so mutations through the interface change the box, not your original. Generic code with a constraint (<code>where T : ICounter</code>) avoids the box.</p>`, code: { lang: 'csharp', run: true, code: `var c = new Counter();
ICounter boxed = c;      // boxing copies c
boxed.Increment();
Console.WriteLine(c.Value);                     // 0: the original is untouched
Console.WriteLine(((Counter)boxed).Value);      // 1

interface ICounter { void Increment(); }
struct Counter : ICounter
{
    public int Value;
    public void Increment() => Value++;
}` } }
    ],
    deepDive: `<p><b>🟣 Interface dispatch internals.</b> CoreCLR uses <b>virtual stub dispatch</b>: an interface call site starts with a lookup stub, becomes a monomorphic "resolve" stub that caches the last type, and falls back to a hash-table resolver when many types flow through. With Dynamic PGO the JIT can also guard on the hot type and inline. In practice, interface calls cost about the same as virtual calls.</p>
<p><b>Default interface methods — the fine print.</b> (1) They need runtime support (.NET Core 3.0+); they do not work on .NET Framework. (2) A class does not inherit the default as its own member, so you cannot call it via the class type, and a derived class cannot call "the default" with <code>base</code> (C# has no <code>base(IFoo)</code> syntax yet). (3) If two interfaces provide conflicting defaults for the same member (the diamond), the class must implement the member itself or the code does not compile. (4) Defaults cannot use instance fields because interfaces have none; they can only call other members.</p>
<p><b>Static abstract members</b> (C# 11) let an interface require static methods and operators (<code>INumber&lt;T&gt;</code> uses them for generic math). They are resolved at compile time through generic constraints and are covered in module 11.</p>
<p><b>Design guidance.</b> Keep interfaces small and role-based (Interface Segregation): <code>IReader</code> and <code>IWriter</code> rather than one fat <code>IFileManager</code>. Do not create an interface for every class "just in case" — one implementation and no test seam is a sign the interface is noise.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants happily generate an <code>IFooService</code> for every <code>FooService</code>, plus mocks. <b>Use AI as a partner:</b> ask it to split a fat interface by caller ("<i>which members does each consumer actually use?</i>"), or to produce a fake implementation for a test. <b>Where AI goes wrong:</b> it tries to call a default interface method through the class type, puts state in an interface (fields are illegal), and invents <code>base(IFoo).Method()</code> syntax that does not exist in C# 12. <b>What you still own:</b> deciding where the seams in your design are, and recognising when a single concrete class is the honest answer.</p>`
  });

  topics[3].problems = [{
    title: 'Price Rules with a Default Interface Method',
    level: 'Medium', tags: ['interface', 'default interface method', 'polymorphism'], companies: ['Amazon', 'Flipkart', 'Shopify'],
    statement: `<p>Define <code>interface IPriceRule</code> with <code>string Name { get; }</code>, <code>long Apply(long cents)</code> and a <b>default</b> method <code>string Describe(long before) =&gt; $"{Name}: {before} -&gt; {Apply(before)}"</code>. Implement three rules:</p>
<ul><li><code>percent P</code> — name <code>percent(P)</code>, subtracts <code>cents * P / 100</code> (integer division);</li>
<li><code>flat F</code> — name <code>flat(F)</code>, subtracts F but never goes below 0;</li>
<li><code>min M</code> — name <code>min(M)</code>, raises the price to M if it is lower. It <b>overrides</b> Describe to print <code>min(M): raised X</code> or <code>min(M): kept X</code>.</li></ul>
<p>Implement <code>public static string[] Checkout(long cents, string[] rules)</code>: apply the rules in order, return one Describe line per rule (computed on the price before that rule), then <code>total T</code>.</p>`,
    constraints: `0 ≤ cents ≤ 10<sup>10</sup>; 0 ≤ P ≤ 100; F, M ≥ 0; at most 50 rules.`,
    example: `<p>Checkout(1000, ["percent 10", "flat 50"]) → ["percent(10): 1000 -&gt; 900", "flat(50): 900 -&gt; 850", "total 850"].</p>`,
    brute: {
      why: `<p>A single method with a switch on the rule keyword that both computes and formats. Adding a fourth rule edits the switch in two places, and the "describe" format is copy-pasted per case. An interface lets each rule own its maths and reuse the shared description.</p>`,
      code: `static long ApplyAll(long cents, string[] rules)
{
    foreach (var r in rules)
    {
        var p = r.Split(' '); long v = long.Parse(p[1]);
        cents = p[0] switch { "percent" => cents - cents * v / 100, "flat" => Math.Max(0, cents - v), _ => Math.Max(cents, v) };
    }
    return cents;
}`
    },
    mcq: { q: 'Your loop variable is typed <code>IPriceRule rule</code>. For a MinRule that declares its own public Describe, <code>rule.Describe(x)</code> runs…', options: ['The interface default, always', 'MinRule.Describe, because a class member with the same signature implements the interface member', 'Neither — it is ambiguous', 'It depends on the order of declaration'], answer: 1, explain: 'A public member matching the interface signature becomes the implementation and wins over the default body. Classes that do not declare it get the default.' },
    hints: [
      `<p>Hint 1: Put the default body in the interface; only MinRule writes its own Describe.</p>`,
      `<p>Hint 2: Keep the loop variable typed as <code>IPriceRule</code> — the default method is only reachable through the interface type.</p>`,
      `<p>Hint 3: Compute the description before updating the price: <code>lines.Add(rule.Describe(price)); price = rule.Apply(price);</code>. Use <code>long</code> for <code>cents * P</code> (10<sup>10</sup> × 100 fits).</p>`
    ],
    tests: { sig: 'long string[] -> string[]', fn: 'Checkout', cases: [
      [[1000, ["percent 10", "flat 50"]], ["percent(10): 1000 -> 900", "flat(50): 900 -> 850", "total 850"]],
      [[1000, []], ["total 1000"]],
      [[100, ["flat 250"]], ["flat(250): 100 -> 0", "total 0"]],
      [[999, ["percent 50", "min 600"]], ["percent(50): 999 -> 500", "min(600): raised 600", "total 600"]],
      [[2000, ["min 100", "percent 100"]], ["min(100): kept 2000", "percent(100): 2000 -> 0", "total 0"]],
      [[0, ["percent 10", "flat 0", "min 0"]], ["percent(10): 0 -> 0", "flat(0): 0 -> 0", "min(0): kept 0", "total 0"]],
      [[5000000000, ["percent 33", "flat 1"]], ["percent(33): 5000000000 -> 3350000000", "flat(1): 3350000000 -> 3349999999", "total 3349999999"]],
      [[101, ["percent 1"]], ["percent(1): 101 -> 100", "total 100"]]
    ] },
    solution: {
      approach: `<p>Each rule is a small class implementing <code>IPriceRule</code>. The interface's default <code>Describe</code> is shared by Percent and Flat; Min supplies its own. The checkout loop talks only to the interface.</p>`,
      code: `public interface IPriceRule
{
    string Name { get; }
    long Apply(long cents);
    string Describe(long before) => $"{Name}: {before} -> {Apply(before)}";   // default body
}

public sealed class PercentRule(long p) : IPriceRule
{
    public string Name => $"percent({p})";
    public long Apply(long cents) => cents - cents * p / 100;
}

public sealed class FlatRule(long f) : IPriceRule
{
    public string Name => $"flat({f})";
    public long Apply(long cents) => Math.Max(0, cents - f);
}

public sealed class MinRule(long m) : IPriceRule
{
    public string Name => $"min({m})";
    public long Apply(long cents) => Math.Max(cents, m);
    public string Describe(long before) => $"{Name}: {(before < m ? "raised" : "kept")} {Apply(before)}";   // replaces the default
}

public class Solution
{
    public static string[] Checkout(long cents, string[] rules)
    {
        var lines = new List<string>();
        foreach (var text in rules)
        {
            var p = text.Split(' ');
            long v = long.Parse(p[1]);
            IPriceRule rule = p[0] switch
            {
                "percent" => new PercentRule(v),
                "flat" => new FlatRule(v),
                _ => new MinRule(v)
            };
            lines.Add(rule.Describe(cents));   // through the interface: default or override
            cents = rule.Apply(cents);
        }
        lines.Add($"total {cents}");
        return lines.ToArray();
    }
}`,
      dry: { head: ['rule', 'price before', 'Describe source', 'line'], rows: [
        ['percent 50', '999', 'interface default', 'percent(50): 999 -&gt; 500'],
        ['min 600', '500', 'MinRule.Describe', 'min(600): raised 600'],
        ['—', '600', '—', 'total 600']
      ] },
      complexity: `<p>O(r) for r rules; each rule is O(1).</p>`,
      followUps: ['Add a rule that needs the original price, not the running one — what does the interface need?', 'What happens if two interfaces both give Describe a default and a class implements both?']
    }
  }];

  /* ======================================================================
     TOPIC 5 — Explicit interface implementation
     ====================================================================== */
  topics.push({
    title: 'Explicit Interface Implementation',
    analogy: `<p>A person can be a <b>parent at home</b> and a <b>manager at work</b>. Both roles have a "<i>review</i>" duty, but they mean totally different things — checking homework versus approving expense reports. You only perform the right one when someone addresses you <b>in that role</b>. Explicit interface implementation gives one object a separate method per role; the caller picks the role by looking at the object <b>through that interface</b>.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> Normally (implicitly) a class implements an interface member with a <code>public</code> method of the same name. <b>Explicit</b> implementation writes the interface name in front of the member and leaves out the access modifier:</p>
${H.table(['Implicit', 'Explicit'], [
  ['<code>public double Read() { … }</code>', '<code>double ICelsius.Read() { … }</code>'],
  ['callable on the class and on the interface', 'callable <b>only through the interface</b>'],
  ['one body serves every interface with that signature', 'a different body per interface']
])}
<p><b>When to use it:</b></p>
<ol>
<li><b>Name clash</b> — two interfaces need the same signature with different meanings (<code>ICelsius.Read</code> vs <code>IFahrenheit.Read</code>).</li>
<li><b>Hide a member you must have but do not want on the public surface</b> — e.g. the non-generic <code>IEnumerable.GetEnumerator()</code> next to the generic one, or <code>ICollection&lt;T&gt;.IsReadOnly</code> on a type where it is always false.</li>
<li><b>Return a more specific type</b> publicly while satisfying the interface's weaker signature (<code>public FileStream Open()</code> plus <code>Stream IOpener.Open() =&gt; Open();</code>).</li>
</ol>
${H.table(['Call', 'Result'], [
  ['<code>var t = new Thermo(20); t.Read()</code>', H.c('r', 'CS1061 — no public Read')],
  ['<code>((ICelsius)t).Read()</code>', '20'],
  ['<code>IFahrenheit f = t; f.Read()</code>', '68']
])}`,
    clues: [
      '"two interfaces declare the same method with different meanings" → explicit implementation',
      '"implement IEnumerable&lt;T&gt; — what about the non-generic GetEnumerator?" → explicit <code>IEnumerable.GetEnumerator()</code>',
      '"member required by the interface but should not clutter the class API" → explicit',
      '"why can\'t I call this method on my object?" → it is explicitly implemented; cast to the interface',
      '"struct implements an interface explicitly" → calling it requires a cast, which boxes (unless via a generic constraint)'
    ],
    code: [{ lang: 'csharp', run: true, title: 'Two interfaces, same signature, two meanings (runnable)', code: `using System.Collections;

var t = new Thermo(20);
Console.WriteLine(((ICelsius)t).Read());       // 20
IFahrenheit f = t;
Console.WriteLine(f.Read());                   // 68
Console.WriteLine(t.Summary());

var bag = new Bag([3, 1, 2]);
foreach (int x in bag) Console.Write(x + " ");  // uses the public generic enumerator
Console.WriteLine();

interface ICelsius { double Read(); }
interface IFahrenheit { double Read(); }

sealed class Thermo(double celsius) : ICelsius, IFahrenheit
{
    double ICelsius.Read() => celsius;                  // explicit: no access modifier
    double IFahrenheit.Read() => celsius * 9 / 5 + 32;
    public string Summary() => $"{((ICelsius)this).Read()}C = {((IFahrenheit)this).Read()}F";
}

sealed class Bag(int[] items) : IEnumerable<int>
{
    public IEnumerator<int> GetEnumerator() => ((IEnumerable<int>)items).GetEnumerator();
    IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();   // the old non-generic one, hidden
}` }],
    codeTitle: ['Explicit implementation'],
    viz: {
      title: 'Same object, different roles',
      input: '20',
      inputLabel: 'Temperature in Celsius',
      gen: function (input) {
        var c = Number(String(input).trim());
        if (!isFinite(c) || Math.abs(c) > 100000) throw new Error('Enter a number of degrees Celsius');
        var fv = c * 9 / 5 + 32;
        var code = 'interface ICelsius { double Read(); }\ninterface IFahrenheit { double Read(); }\nclass Thermo(double c) : ICelsius, IFahrenheit {\n  double ICelsius.Read() => c;\n  double IFahrenheit.Read() => c * 9 / 5 + 32;\n}\nvar t = new Thermo(' + c + ');\nConsole.WriteLine(((ICelsius)t).Read());\nIFahrenheit f = t;\nConsole.WriteLine(f.Read());\n// t.Read();   CS1061';
        var map = function (k) { return { type: 'map', label: 'Thermo interface map', entries: [['ICelsius.Read', 'Thermo.ICelsius.Read'], ['IFahrenheit.Read', 'Thermo.IFahrenheit.Read'], ['public Read', '(none)']], hl: one(k, k === 'public Read' ? 'bad' : 'sel') }; };
        return [
          { narr: 'One object is created. It has <b>no public Read</b>; it has two private-looking members named after their interfaces.', parts: [cs(code, one(7, 'cur')), map('public Read')] },
          { narr: 'Casting to <code>ICelsius</code> picks the Celsius role. The call goes through the ICelsius slot.', parts: [cs(code, one(8, 'cur')), map('ICelsius.Read')] },
          { narr: 'ICelsius.Read returns ' + c + '.', parts: [cs(code, one(4, 'ok')), note(String(c), 'Console output')] },
          { narr: 'Assigning to an <code>IFahrenheit</code> variable is an implicit reference conversion — same object, different view.', parts: [cs(code, one(9, 'cur')), map('IFahrenheit.Read')] },
          { narr: 'IFahrenheit.Read computes ' + c + ' × 9 / 5 + 32 = ' + fv + '.', parts: [cs(code, one(5, 'ok')), note(c + '<br>' + fv, 'Console output')] },
          { narr: H.c('r', 'Calling t.Read() directly does not compile') + ': the class type has no member called Read. That is the point — callers must say which role they mean.', parts: [cs(code, one(11, 'bad'))] }
        ];
      }
    },
    examples: [
      { title: 'Returning a more specific type', html: `<p>The interface promises a <code>Stream</code>; the class publicly offers the more useful <code>MemoryStream</code> and satisfies the interface explicitly by forwarding.</p>`, code: { lang: 'csharp', code: `interface IOpener { Stream Open(); }
sealed class MemOpener : IOpener
{
    public MemoryStream Open() => new MemoryStream();   // what class users see
    Stream IOpener.Open() => Open();                    // what interface users get
}` } },
      { title: 'Hiding an always-false property', html: `<p>A read-write collection must implement <code>ICollection&lt;T&gt;.IsReadOnly</code>, but showing it on the class only invites confusion. <code>List&lt;T&gt;</code> itself implements <code>IsReadOnly</code> explicitly for this reason.</p>`, code: { lang: 'csharp', code: `sealed class Names : ICollection<string>
{
    private readonly List<string> _items = [];
    public int Count => _items.Count;
    bool ICollection<string>.IsReadOnly => false;      // hidden from the class API
    public void Add(string item) => _items.Add(item);
    public void Clear() => _items.Clear();
    public bool Contains(string item) => _items.Contains(item);
    public void CopyTo(string[] array, int index) => _items.CopyTo(array, index);
    public bool Remove(string item) => _items.Remove(item);
    public IEnumerator<string> GetEnumerator() => _items.GetEnumerator();
    System.Collections.IEnumerator System.Collections.IEnumerable.GetEnumerator() => GetEnumerator();
}` } },
      { title: 'Explicit implementation on a struct and boxing', html: `<p>Calling an explicit member on a struct needs a cast to the interface, which boxes a copy. Inside generic code constrained to the interface (<code>where T : struct, IReset</code>) the call is made on the value itself without boxing.</p>`, code: { lang: 'csharp', run: true, code: `var s = new Gauge { Level = 5 };
((IReset)s).Reset();               // resets a boxed COPY
Console.WriteLine(s.Level);        // 5
ResetInPlace(ref s);
Console.WriteLine(s.Level);        // 0

static void ResetInPlace<T>(ref T value) where T : struct, IReset => value.Reset();   // no box

interface IReset { void Reset(); }
struct Gauge : IReset
{
    public int Level;
    void IReset.Reset() => Level = 0;
}` } }
    ],
    deepDive: `<p><b>🟣 What the compiler emits.</b> An explicit implementation becomes a <b>private</b> method in IL with a name like <code>ICelsius.Read</code> plus a <code>.override</code> directive that maps the interface slot to it. That is why it has no access modifier in C# — it is never reachable by name, only through the interface map. It is also why you cannot mark it <code>virtual</code> or <code>abstract</code>. If a subclass needs to customise it, the usual pattern is: explicit member calls a <code>protected virtual</code> method that subclasses override.</p>
<p><b>Re-implementation.</b> A derived class can list the interface again (<code>class Derived : Base, ICelsius</code>) and provide a new explicit implementation; that replaces the base's mapping for that interface. Without re-listing, a derived public method with the same name does <i>not</i> replace an explicit base implementation.</p>
<p><b>Generic interfaces implemented twice.</b> A class can implement both <code>IComparable&lt;Money&gt;</code> and <code>IComparable</code>; the non-generic one is usually explicit and forwards after a type check. In .NET 8 the BCL uses this pattern widely, including in the generic-math interfaces (<code>INumber&lt;T&gt;</code> members such as <code>INumberBase&lt;int&gt;.IsComplexNumber</code> are explicit on <code>int</code>).</p>
<p><b>Discoverability cost.</b> IntelliSense on the class does not show explicit members, which is great for clutter but bad when the member is important. Reserve explicit implementation for clashes, legacy non-generic members and genuinely internal plumbing.</p>`,
    aiEra: `<p><b>What AI changes:</b> generated collection classes often contain explicit <code>IEnumerable.GetEnumerator()</code> lines that juniors copy without understanding. <b>Use AI as a partner:</b> ask "<i>which members here are explicit and why?</i>" or "<i>rewrite this name clash with explicit implementations</i>". <b>Where AI goes wrong:</b> it adds <code>public</code> to explicit implementations (a compile error, CS0106), tries to make them <code>virtual</code>, and forgets that calling an explicit member on a struct through a cast boxes and loses the change. <b>What you still own:</b> deciding which role a member belongs to and keeping the public surface of your types small and honest.</p>`
  });

  topics[4].problems = [{
    title: 'Thermometer with Two Roles',
    level: 'Easy', tags: ['explicit interface implementation', 'formatting'], companies: ['Bosch', 'Honeywell', 'Microsoft'],
    statement: `<p>Define <code>interface ICelsius { double Read(); }</code> and <code>interface IFahrenheit { double Read(); }</code>. Write <code>class Thermo</code> that implements <b>both explicitly</b> from one stored Celsius value (F = C × 9 / 5 + 32). Then implement <code>public static string[] Readings(double[] celsius)</code> returning <code>"C=x F=y"</code> for each value, both with one decimal place, invariant culture. Obtain each number by calling <code>Read()</code> through the right interface.</p>`,
    constraints: `0 ≤ celsius.Length ≤ 1000; −10<sup>6</sup> ≤ value ≤ 10<sup>6</sup>.`,
    example: `<p>Readings([20, −40]) → ["C=20.0 F=68.0", "C=-40.0 F=-40.0"] (−40 is the same in both scales).</p>`,
    brute: {
      why: `<p>Two public methods <code>ReadCelsius()</code> and <code>ReadFahrenheit()</code> with no interfaces. Fine for this class alone, but code written against <code>ICelsius</code> (say, a dashboard that only knows Celsius sensors) cannot use it. The exercise is about satisfying two contracts that collide on a name.</p>`,
      code: `sealed class PlainThermo(double c)
{
    public double ReadCelsius() => c;
    public double ReadFahrenheit() => c * 9 / 5 + 32;
}`
    },
    mcq: { q: 'Inside Thermo, how do you call the Fahrenheit version on the current object?', options: ['<code>Read()</code>', '<code>this.IFahrenheit.Read()</code>', '<code>((IFahrenheit)this).Read()</code>', '<code>base.Read()</code>'], answer: 2, explain: 'Explicit members are reachable only through the interface type, even from inside the class.' },
    hints: [
      `<p>Hint 1: <code>double ICelsius.Read() =&gt; _c;</code> — no <code>public</code>.</p>`,
      `<p>Hint 2: In <code>Readings</code>, write <code>ICelsius c = t; IFahrenheit f = t;</code> and call <code>Read()</code> on each.</p>`,
      `<p>Hint 3: Format with <code>ToString("F1", CultureInfo.InvariantCulture)</code>.</p>`
    ],
    tests: { sig: 'double[] -> string[]', fn: 'Readings', cases: [
      [[[20]], ["C=20.0 F=68.0"]],
      [[[]], []],
      [[[-40]], ["C=-40.0 F=-40.0"]],
      [[[0, 100]], ["C=0.0 F=32.0", "C=100.0 F=212.0"]],
      [[[37.5]], ["C=37.5 F=99.5"]],
      [[[36.6]], ["C=36.6 F=97.9"]],
      [[[1000000, -10]], ["C=1000000.0 F=1800032.0", "C=-10.0 F=14.0"]]
    ] },
    solution: {
      approach: `<p>Store Celsius once. Each interface gets its own explicit <code>Read</code>. The caller chooses the role by the variable's interface type.</p>`,
      code: `using System.Globalization;

public interface ICelsius { double Read(); }
public interface IFahrenheit { double Read(); }

public sealed class Thermo(double celsius) : ICelsius, IFahrenheit
{
    double ICelsius.Read() => celsius;
    double IFahrenheit.Read() => celsius * 9 / 5 + 32;
}

public class Solution
{
    public static string[] Readings(double[] celsius)
    {
        var inv = CultureInfo.InvariantCulture;
        var result = new string[celsius.Length];
        for (int i = 0; i < celsius.Length; i++)
        {
            var t = new Thermo(celsius[i]);
            ICelsius c = t;          // same object, Celsius role
            IFahrenheit f = t;       // same object, Fahrenheit role
            result[i] = $"C={c.Read().ToString("F1", inv)} F={f.Read().ToString("F1", inv)}";
        }
        return result;
    }
}`,
      dry: { head: ['value', 'ICelsius.Read', 'IFahrenheit.Read', 'string'], rows: [
        ['20', '20', '20 × 9 / 5 + 32 = 68', 'C=20.0 F=68.0'],
        ['−40', '−40', '−72 + 32 = −40', 'C=-40.0 F=-40.0'],
        ['36.6', '36.6', '97.88…', 'C=36.6 F=97.9']
      ] },
      complexity: `<p>O(n) time and output space.</p>`,
      followUps: ['Add a public <code>Read()</code> that returns Kelvin — which calls change?', 'How would a subclass customise the Fahrenheit reading if the explicit member cannot be virtual?']
    }
  }];

  /* ======================================================================
     TOPIC 6 — System.Object members
     ====================================================================== */
  topics.push({
    title: 'The object Methods: ToString, Equals, GetHashCode, GetType',
    analogy: `<p>Every citizen gets a few things from the state automatically: a <b>name on file</b>, an <b>ID number</b>, a way to <b>check whether two forms describe the same person</b>. In .NET, <code>System.Object</code> is that state: every type — your classes, structs, records, even <code>int</code> — inherits a handful of members from it. Some you should customise (how you are introduced: <code>ToString</code>; who counts as "the same": <code>Equals</code>/<code>GetHashCode</code>), and some are fixed (<code>GetType</code>, your true identity).</p>`,
    explain: `<p><b>🟢 The plain idea.</b> Every type derives from <code>object</code> (alias of <code>System.Object</code>), directly or indirectly. It gives you:</p>
${H.table(['Member', 'Virtual?', 'Default behaviour', 'Override when…'], [
  ['<code>ToString()</code>', 'yes', 'the full type name, e.g. <code>Shop.Money</code>', 'you want readable logs and debugger output'],
  ['<code>Equals(object?)</code>', 'yes', 'classes: same reference; structs: field-by-field via reflection', 'two objects with the same data should count as equal (value objects)'],
  ['<code>GetHashCode()</code>', 'yes', 'classes: per-object identity hash; structs: based on fields', '<b>always together with Equals</b>'],
  ['<code>GetType()</code>', 'no', 'the exact runtime <code>Type</code>', 'never — it cannot be overridden'],
  ['<code>MemberwiseClone()</code>', 'no (protected)', 'shallow copy of all fields', 'call it inside your own Clone/copy method'],
  ['<code>Finalize()</code>', 'yes (as <code>~T()</code>)', 'nothing', 'rarely; see module 8'],
  ['static <code>ReferenceEquals(a, b)</code>', '—', 'true if both refer to the same object', '— (use it to test identity)']
])}
<p><b>The equality contract</b> (Hash-based collections like <code>Dictionary</code> and <code>HashSet</code> depend on it):</p>
<ol>
<li>If <code>a.Equals(b)</code> then <code>a.GetHashCode() == b.GetHashCode()</code>. (Equal hashes do <b>not</b> imply equal objects.)</li>
<li>Equals is reflexive, symmetric and transitive, and <code>x.Equals(null)</code> is false.</li>
<li>The hash of an object must not change while it is a key in a hash collection — so hash only <b>immutable</b> fields.</li>
</ol>
<p><b><code>==</code> is not <code>Equals</code>.</b> For classes, <code>==</code> compares references unless the class <b>overloads the operator</b> (string does, records do). <code>==</code> is chosen at compile time from the static types; <code>Equals</code> is virtual. With records (module 3), the compiler writes Equals, GetHashCode, <code>==</code>, <code>!=</code> and ToString for you.</p>`,
    clues: [
      '"two objects with the same values are not found in the HashSet / Dictionary" → override Equals and GetHashCode together',
      '"override Equals without GetHashCode" (warning CS0659) → hash collections break',
      '"== returns false but Equals returns true" → == compares references for classes without an operator overload',
      '"print an object and get the type name" → override ToString',
      '"value object" (Money, Point, DateRange) → value equality; consider a <code>record</code> or <code>IEquatable&lt;T&gt;</code>',
      '"GetType() == typeof(X) vs is X" → exact type vs is-a check'
    ],
    code: [{ lang: 'csharp', run: true, title: 'Value equality done right (runnable)', code: `var a = new Point(1, 2);
var b = new Point(1, 2);
Console.WriteLine(a);                          // Point(1, 2)      (ToString)
Console.WriteLine(a.Equals(b));                // True             (value equality)
Console.WriteLine(a == b);                     // True             (operator overloaded)
Console.WriteLine(ReferenceEquals(a, b));      // False            (two objects)
Console.WriteLine(new HashSet<Point> { a, b }.Count);   // 1     (Equals + GetHashCode agree)
Console.WriteLine(a.GetType().Name);           // Point

sealed class Point : IEquatable<Point>
{
    public int X { get; }
    public int Y { get; }
    public Point(int x, int y) { X = x; Y = y; }

    public bool Equals(Point? other) =>
        other is not null && X == other.X && Y == other.Y;   // typed, no boxing, no casts

    public override bool Equals(object? obj) => Equals(obj as Point);
    public override int GetHashCode() => HashCode.Combine(X, Y); // same fields as Equals
    public override string ToString() => $"Point({X}, {Y})";

    public static bool operator ==(Point? l, Point? r) => l is null ? r is null : l.Equals(r);
    public static bool operator !=(Point? l, Point? r) => !(l == r);
}` }],
    codeTitle: ['Point with value equality'],
    viz: {
      title: 'HashSet.Add: hash first, then Equals',
      input: 'with',
      inputLabel: '"with" = Equals+GetHashCode overridden, "without" = defaults',
      gen: function (input) {
        var mode = words(input, 'Type with or without', 1)[0];
        if (mode !== 'with' && mode !== 'without') throw new Error('Type with or without');
        var w = mode === 'with';
        var code = 'var set = new HashSet<Point>();\nset.Add(new Point(1, 2));   // object #1\nset.Add(new Point(1, 2));   // object #2, same data\nConsole.WriteLine(set.Count);';
        var h1 = w ? 'Combine(1,2) = 0x5F1A' : 'identity #1 = 0x2A11', h2 = w ? 'Combine(1,2) = 0x5F1A' : 'identity #2 = 0x7C03';
        var frames = [];
        frames.push({ narr: 'Add object #1. HashSet calls <code>GetHashCode()</code> → <b>' + h1 + '</b> and picks a bucket from it.', parts: [cs(code, one(2, 'cur')), { type: 'map', label: 'buckets', entries: [[w ? 'bucket 3' : 'bucket 1', 'Point(1,2) #1']], hl: one(w ? 'bucket 3' : 'bucket 1', 'ok') }] });
        frames.push({ narr: 'Add object #2 with the same data. Hash: <b>' + h2 + '</b>.', parts: [cs(code, one(3, 'cur')), { type: 'vars', label: 'hashes', vals: { '#1': h1, '#2': h2 }, hl: { '#2': w ? 'ok' : 'bad' } }] });
        if (w) {
          frames.push({ narr: 'Same hash → same bucket. Now <code>Equals</code> is asked: X and Y match → <b>already present</b>, Add returns false.', parts: [{ type: 'map', label: 'buckets', entries: [['bucket 3', 'Point(1,2) #1']], hl: { 'bucket 3': 'sel' } }, note('Equals(#1, #2) = true')] });
          frames.push({ narr: 'Count = <b>1</b>. This is the behaviour a value object needs.', parts: [cs(code, one(4, 'ok')), note('1', 'Console output')] });
        } else {
          frames.push({ narr: 'Default hashes are per object, so #2 lands in a <b>different bucket</b>; Equals is never even called. (Default Equals compares references anyway.)', parts: [{ type: 'map', label: 'buckets', entries: [['bucket 1', 'Point(1,2) #1'], ['bucket 4', 'Point(1,2) #2']], hl: { 'bucket 4': 'bad' } }] });
          frames.push({ narr: 'Count = <b>2</b> — "duplicates" in a set. Overriding only Equals would not fix it either: the hashes still differ.', parts: [cs(code, one(4, 'bad')), note('2', 'Console output')] });
        }
        frames.push({ narr: 'Rule: <b>equal objects must have equal hash codes</b>. Override both, from the same immutable fields — or use a <code>record</code>.', parts: [note('HashCode.Combine(X, Y) + Equals comparing X and Y.')] });
        return frames;
      }
    },
    examples: [
      { title: 'Overriding Equals but forgetting GetHashCode', html: `<p>The compiler warns CS0659. <code>list.Contains</code> works (it only uses Equals) but <code>HashSet.Contains</code> and Dictionary lookups fail randomly, because they compare hashes first.</p>`, code: { lang: 'csharp', run: true, code: `var list = new List<Bad> { new(1) };
var set = new HashSet<Bad> { new(1) };
Console.WriteLine(list.Contains(new Bad(1)));   // True
Console.WriteLine(set.Contains(new Bad(1)));    // almost always False

#pragma warning disable CS0659
sealed class Bad(int id)
{
    public int Id { get; } = id;
    public override bool Equals(object? o) => o is Bad b && b.Id == Id;
}` } },
      { title: '== on object variables compares references', html: `<p><code>==</code> is resolved from the <b>static</b> types. Two equal strings typed as <code>object</code> compare references (and may be false if they are different instances), while <code>Equals</code> is virtual and compares contents.</p>`, code: { lang: 'csharp', run: true, code: `string s1 = "hello";
string s2 = new string("hello".ToCharArray());   // a different instance
object o1 = s1, o2 = s2;
Console.WriteLine(s1 == s2);        // True  (string's == overload)
Console.WriteLine(o1 == o2);        // False (reference comparison on object)
Console.WriteLine(o1.Equals(o2));   // True  (virtual string.Equals)` } },
      { title: 'GetType() vs is', html: `<p><code>is</code> asks "IS-A?" (true for subclasses); <code>GetType() == typeof(T)</code> asks "exactly this type?". Equals for non-sealed classes often uses the exact check so a base object never equals a derived one (symmetry).</p>`, code: { lang: 'csharp', run: true, code: `object x = new Manager();
Console.WriteLine(x is Employee);                     // True
Console.WriteLine(x.GetType() == typeof(Employee));   // False
Console.WriteLine(x.GetType().Name);                  // Manager

class Employee { }
class Manager : Employee { }` } }
    ],
    deepDive: `<p><b>🟣 Default implementations.</b> <code>object.GetHashCode()</code> for a class returns a value derived from the object's identity (stored lazily in the object header or its sync block); it is stable for the object's lifetime even though the GC moves the object. <code>ValueType.Equals</code> for structs uses a fast bitwise compare when the struct has no reference fields and no padding issues, otherwise <b>reflection</b> over the fields — slow and boxing. <code>ValueType.GetHashCode</code> may use only the first non-null field. So: <b>always override Equals/GetHashCode on structs used as keys</b>, or make them <code>record struct</code>s.</p>
<p><b>Inheritance and equality do not mix well.</b> If <code>Point3D : Point</code> adds Z, a <code>Point</code> may consider itself equal to a <code>Point3D</code> while the reverse is false — symmetry broken. Options: seal value types (preferred), compare <code>GetType()</code> exactly, or use records, which add a hidden <code>EqualityContract</code> property so a base record never equals a derived one.</p>
<p><b>HashCode.Combine</b> (in <code>System</code>) mixes up to eight values with a randomised per-process seed (xxHash32-based), so hash values differ between runs — never persist them. For many fields use <code>var h = new HashCode(); h.Add(x); … h.ToHashCode()</code>.</p>
<p><b>Mutable keys.</b> If a field used in GetHashCode changes after the object was added to a <code>HashSet</code>, the object sits in the wrong bucket and becomes unfindable (and cannot be removed). Make value objects immutable: get-only or <code>init</code> properties.</p>`,
    aiEra: `<p><b>What AI changes:</b> IDEs and assistants generate Equals/GetHashCode/operators in one click, so the code is rarely hand-written any more. <b>Use AI as a partner:</b> ask "<i>are Equals and GetHashCode using the same fields? Are those fields immutable?</i>" and "<i>should this be a record?</i>". <b>Where AI goes wrong:</b> it hashes mutable properties, implements == without handling null on the left, uses <code>is</code> instead of an exact type check in a non-sealed class's Equals, and sometimes hand-rolls <code>X * 31 + Y</code> where <code>HashCode.Combine</code> is better. <b>What you still own:</b> deciding whether a type has identity (entity) or value semantics (value object) — that decision drives all of these overrides.</p>`
  });

  topics[5].problems = [{
    title: 'Count Distinct Points',
    level: 'Easy', tags: ['Equals', 'GetHashCode', 'IEquatable', 'HashSet'], companies: ['Google', 'Uber', 'Microsoft'],
    statement: `<p>Write a <b>class</b> (not a record or tuple) <code>Point</code> with immutable <code>X</code>, <code>Y</code> that implements <code>IEquatable&lt;Point&gt;</code> and overrides <code>Equals(object?)</code>, <code>GetHashCode()</code> and <code>ToString()</code>. Then implement <code>public static int CountDistinct(int[][] pts)</code> that inserts a <code>Point</code> for every pair into a <code>HashSet&lt;Point&gt;</code> and returns its size.</p>`,
    constraints: `0 ≤ pts.Length ≤ 10<sup>5</sup>; each coordinate is any <code>int</code>.`,
    example: `<p>[[1,2],[1,2],[2,1]] → <b>2</b>: the first two are equal values, (2,1) is different because order matters.</p>`,
    brute: {
      why: `<p>Keep a <code>List&lt;Point&gt;</code> and call <code>Contains</code> before each add: O(n²) for 10<sup>5</sup> points ≈ 5·10<sup>9</sup> comparisons. Without a correct GetHashCode, a HashSet would count every object as distinct, which is the bug this problem is about.</p>`,
      code: `static int CountDistinctSlow(int[][] pts)
{
    var seen = new List<(int, int)>();
    foreach (var p in pts)
        if (!seen.Contains((p[0], p[1]))) seen.Add((p[0], p[1]));   // linear scan each time
    return seen.Count;
}`
    },
    mcq: { q: 'You override Equals but not GetHashCode. HashSet&lt;Point&gt; of [[1,2],[1,2]] most likely has Count…', options: ['1', '2', 'It throws', '0'], answer: 1, explain: 'Default hashes are per object, so the two points go to different buckets and Equals is never consulted.' },
    hints: [
      `<p>Hint 1: <code>public bool Equals(Point? o) =&gt; o is not null &amp;&amp; X == o.X &amp;&amp; Y == o.Y;</code></p>`,
      `<p>Hint 2: <code>public override bool Equals(object? obj) =&gt; Equals(obj as Point);</code> and <code>GetHashCode() =&gt; HashCode.Combine(X, Y);</code></p>`,
      `<p>Hint 3: Seal the class so a subclass cannot break symmetry.</p>`
    ],
    tests: { sig: 'int[][] -> int', fn: 'CountDistinct', cases: [
      [[[[1, 2], [1, 2], [2, 1]]], 2],
      [[[]], 0],
      [[[[0, 0]]], 1],
      [[[[-1, -1], [-1, -1], [-1, -1]]], 1],
      [[[[1, 2], [2, 1], [3, 4], [4, 3]]], 4],
      [[[[2147483647, -2147483648], [2147483647, -2147483648], [0, 0]]], 2],
      [[{ $rep: [5, 5], n: 100000 }], 1],
      [[[[0, 1], [1, 0], [0, -1], [-1, 0], [0, 1]]], 4]
    ] },
    solution: {
      approach: `<p>Value equality on X and Y, a hash from the same two fields, and a sealed immutable class. The HashSet then deduplicates in O(1) average per insert.</p>`,
      code: `public sealed class Point : IEquatable<Point>
{
    public int X { get; }
    public int Y { get; }
    public Point(int x, int y) { X = x; Y = y; }

    public bool Equals(Point? other) => other is not null && X == other.X && Y == other.Y;
    public override bool Equals(object? obj) => Equals(obj as Point);
    public override int GetHashCode() => HashCode.Combine(X, Y);
    public override string ToString() => $"({X}, {Y})";
}

public class Solution
{
    public static int CountDistinct(int[][] pts)
    {
        var set = new HashSet<Point>();
        foreach (var p in pts) set.Add(new Point(p[0], p[1]));
        return set.Count;
    }
}`,
      dry: { head: ['point', 'hash', 'Equals with existing?', 'set size'], rows: [
        ['(1, 2)', 'h(1,2)', '—', '1'],
        ['(1, 2)', 'h(1,2) same bucket', H.c('g', 'true → skip'), '1'],
        ['(2, 1)', 'h(2,1) different', '—', '2']
      ] },
      complexity: `<p>O(n) average time, O(n) space.</p>`,
      followUps: ['Rewrite Point as a <code>readonly record struct</code> — what disappears from the code?', 'What goes wrong if X had a public setter and you changed it after insertion?']
    }
  }];

  /* ======================================================================
     TOPIC 7 — Composition over inheritance
     ====================================================================== */
  topics.push({
    title: 'Composition over Inheritance (Strategy & Decorator)',
    analogy: `<p>A <b>food processor</b> comes with snap-on blades: a slicer, a grater, a whisk. You do not buy a "SlicingProcessor", a "GratingProcessor" and a "SlicingAndGratingProcessor"; you buy one motor and <b>plug in the part you need</b>, even swapping it mid-recipe. Inheritance is buying a new machine for every combination. <b>Composition</b> is one machine that <i>has</i> replaceable parts.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> Inheritance says "<b>is-a</b>" and fixes behaviour at compile time. Composition says "<b>has-a</b>": an object keeps a reference to another object (usually through an interface) and delegates work to it. You can change that part at run time, combine parts freely, and test each part alone.</p>
${H.table(['Problem with inheritance', 'Composition answer'], [
  ['Class explosion: Logger × {File, Console} × {Plain, Json} × {Buffered, Direct} = 8 subclasses', '3 small interfaces, combine at construction: 2 + 2 + 2 classes'],
  ['Behaviour frozen at compile time', 'Swap the strategy object at run time'],
  ['Subclass depends on base internals (fragile base class)', 'Depend only on a small public interface'],
  ['Single inheritance: only one "parent" allowed', 'Hold as many collaborators as you like'],
  ['Inheriting methods you do not want (a Stack that exposes List.Insert)', 'Expose only what you choose and delegate']
])}
<p><b>Two composition patterns every C# developer should know:</b></p>
<ul>
<li><b>Strategy</b> — the varying algorithm is an object: <code>class Checkout(IShipping shipping)</code>. Pass <code>new Express()</code> or <code>new Standard()</code>. In C#, a small strategy is often just a delegate <code>Func&lt;int, decimal&gt;</code> (module 6).</li>
<li><b>Decorator</b> — wrap an object in another that implements the <b>same interface</b>, adds behaviour, and forwards the call: <code>new Cached(new Logged(new SqlRepository()))</code>. ASP.NET Core middleware and <code>Stream</code> wrappers (<code>GZipStream</code> over <code>FileStream</code>) are decorators.</li>
</ul>
<p><b>When is inheritance still right?</b> A true, stable IS-A relationship with shared state and a template method (topic 3), framework extension points designed for it (<code>Exception</code>, <code>ControllerBase</code>, <code>BackgroundService</code>), and closed hierarchies used with pattern matching.</p>`,
    clues: [
      '"behaviour must change at run time" / "pluggable algorithm" → strategy (interface or delegate)',
      '"add logging / caching / retries without touching the class" → decorator',
      '"too many subclasses for every combination" → composition',
      '"Stack extends List exposes Insert(0, x)" → wrap a list instead of inheriting it',
      '"favor composition over inheritance — explain" → is-a vs has-a, coupling, testability',
      '"unit test the class without the real database" → inject a collaborator through the constructor'
    ],
    code: [{ lang: 'csharp', run: true, title: 'Strategy plus decorators (runnable)', code: `IShipping standard = new Standard();
IShipping express = new Express();
IShipping loggedExpress = new Logged(new FreeOver(new Express(), threshold: 100m));   // decorators stack

var order = new Checkout(standard);
Console.WriteLine(order.Total(80m, kg: 2));     // 90.00
order.Shipping = express;                       // swap the strategy at run time
Console.WriteLine(order.Total(80m, kg: 2));     // 105.00
order.Shipping = loggedExpress;
Console.WriteLine(order.Total(120m, kg: 2));    // 120.00 (free shipping), with a log line

interface IShipping { decimal Cost(decimal subtotal, int kg); }

sealed class Standard : IShipping { public decimal Cost(decimal subtotal, int kg) => 5m * kg; }
sealed class Express : IShipping { public decimal Cost(decimal subtotal, int kg) => 15m + 5m * kg; }

// Decorator: same interface, wraps another IShipping and changes the result
sealed class FreeOver(IShipping inner, decimal threshold) : IShipping
{
    public decimal Cost(decimal subtotal, int kg) => subtotal >= threshold ? 0m : inner.Cost(subtotal, kg);
}
sealed class Logged(IShipping inner) : IShipping
{
    public decimal Cost(decimal subtotal, int kg)
    {
        var c = inner.Cost(subtotal, kg);
        Console.WriteLine($"[log] shipping for {subtotal:0.00} = {c:0.00}");
        return c;
    }
}

sealed class Checkout(IShipping shipping)
{
    public IShipping Shipping { get; set; } = shipping;          // has-a, replaceable
    public decimal Total(decimal subtotal, int kg) => subtotal + Shipping.Cost(subtotal, kg);
}` }],
    codeTitle: ['Strategy and decorator'],
    viz: {
      title: 'A call travelling through stacked decorators',
      input: '120',
      inputLabel: 'Order subtotal (free shipping from 100)',
      gen: function (input) {
        var sub = Number(String(input).trim());
        if (!isFinite(sub) || sub < 0 || sub > 1e6) throw new Error('Enter a subtotal between 0 and 1000000');
        var free = sub >= 100, cost = free ? 0 : 25;
        var g = function (hl, ehl) { return { type: 'graph', directed: true, height: 40, nodes: [{ id: 'C', label: 'Checkout', x: 8, y: 20, shape: 'box' }, { id: 'L', label: 'Logged', x: 33, y: 20, shape: 'box' }, { id: 'F', label: 'FreeOver(100)', x: 60, y: 20, shape: 'box' }, { id: 'E', label: 'Express', x: 88, y: 20, shape: 'box' }], edges: [['C', 'L'], ['L', 'F'], ['F', 'E']], hl: hl, ehl: ehl || {} }; };
        var frames = [
          { narr: 'Checkout holds <b>one</b> IShipping. It has no idea that it is really three objects wrapped inside each other.', parts: [g({ C: 'cur' })] },
          { narr: 'Checkout calls <code>Cost(' + sub + ', 2)</code> on the outer object: <b>Logged</b>. Logged first forwards to its inner object.', parts: [g({ L: 'cur' }, { 'C-L': 'ok' })] },
          { narr: '<b>FreeOver</b> checks the subtotal: ' + sub + (free ? ' ≥ 100 → returns 0 <b>without calling Express at all</b>.' : ' &lt; 100 → forwards to Express.'), parts: [g({ F: 'cur' }, { 'C-L': 'ok', 'L-F': 'ok' })] }
        ];
        if (!free) frames.push({ narr: '<b>Express</b> computes 15 + 5 × 2 = 25.', parts: [g({ E: 'ok' }, { 'C-L': 'ok', 'L-F': 'ok', 'F-E': 'ok' })] });
        frames.push({ narr: 'The result flows back out. Logged prints its line on the way out, then returns ' + cost + '.', parts: [g({ L: 'sel' }, { 'C-L': 'ok', 'L-F': 'ok' }), note('[log] shipping for ' + sub.toFixed(2) + ' = ' + cost.toFixed(2), 'Console output')] });
        frames.push({ narr: 'Total = ' + sub + ' + ' + cost + ' = <b>' + (sub + cost).toFixed(2) + '</b>. To add retries or caching we wrap one more layer; no existing class changes.', parts: [g({ C: 'ok' }), { type: 'vars', label: 'Result', vals: { subtotal: sub, shipping: cost, total: (sub + cost).toFixed(2) } }] });
        return frames;
      }
    },
    examples: [
      { title: 'The inheritance mistake: a Stack that is a List', html: `<p>Inheriting <code>List&lt;T&gt;</code> to build a stack hands callers <code>Insert</code>, <code>RemoveAt</code>, indexers — everything that breaks the LIFO rule. Composition exposes only Push/Pop/Peek. (The BCL's own <code>Stack&lt;T&gt;</code> wraps an array.)</p>`, code: { lang: 'csharp', run: true, code: `var s = new SafeStack<int>();
s.Push(1); s.Push(2);
Console.WriteLine(s.Pop());   // 2
Console.WriteLine(s.Count);   // 1

sealed class SafeStack<T>
{
    private readonly List<T> _items = [];          // has-a list, not is-a list
    public int Count => _items.Count;
    public void Push(T item) => _items.Add(item);
    public T Pop()
    {
        if (_items.Count == 0) throw new InvalidOperationException("empty");
        var top = _items[^1];
        _items.RemoveAt(_items.Count - 1);
        return top;
    }
}` } },
      { title: 'Strategy as a delegate', html: `<p>When the strategy is a single method, an interface plus a class is ceremony. A <code>Func</code> is a strategy too; you can pass a lambda.</p>`, code: { lang: 'csharp', run: true, code: `var calc = new Pricing(subtotal => subtotal > 50 ? 0 : 4.99m);
Console.WriteLine(calc.Total(30));   // 34.99
Console.WriteLine(calc.Total(60));   // 60

sealed class Pricing(Func<decimal, decimal> shippingRule)
{
    public decimal Total(decimal subtotal) => subtotal + shippingRule(subtotal);
}` } },
      { title: 'Decorators in the framework: streams', html: `<p><code>BufferedStream</code>, <code>GZipStream</code> and <code>CryptoStream</code> all derive from <code>Stream</code> <b>and</b> wrap another <code>Stream</code>. You compose behaviour by nesting constructors — the same idea as the shipping example.</p>`, code: { lang: 'csharp', run: true, code: `using System.IO.Compression;

var raw = new MemoryStream();
using (var gzip = new GZipStream(raw, CompressionLevel.SmallestSize, leaveOpen: true))
using (var writer = new StreamWriter(gzip))
    writer.Write(new string('a', 10_000));
Console.WriteLine($"10000 chars compressed to {raw.Length} bytes");` } }
    ],
    deepDive: `<p><b>🟣 Trade-offs, honestly.</b> Composition is not free: more small objects, more indirection, and a call path that can be hard to follow in a debugger ("which decorator swallowed my exception?"). Keep decorators single-purpose and register them in one place (a DI container such as <code>Microsoft.Extensions.DependencyInjection</code>, or Scrutor's <code>Decorate</code> extension) so the stack is visible.</p>
<p><b>Liskov Substitution Principle.</b> Inheritance is only safe if a subclass can stand in for its parent without surprising callers. The classic counterexample is <code>Square : Rectangle</code> with settable Width/Height: setting Width on a Square must also change Height, which breaks code that assumes the two are independent. Composition (or immutability) avoids the trap.</p>
<p><b>Delegation boilerplate.</b> C# has no automatic delegation (Kotlin's <code>by</code>), so a decorator over a 12-member interface must forward 12 members. That pressure is useful: it pushes you toward small, role-based interfaces. Source generators can generate the forwarding code if needed.</p>
<p><b>Performance.</b> Each decorator adds an interface call (a few nanoseconds) and an allocation at construction — negligible for I/O-bound services. In hot numeric loops prefer generics with struct strategies (<code>where TStrategy : struct, IShipping</code>), which the JIT specialises and inlines.</p>`,
    aiEra: `<p><b>What AI changes:</b> design discussions now start from AI-drafted class diagrams, which often lean on inheritance because training data is full of "Animal → Dog" tutorials. <b>Use AI as a partner:</b> ask "<i>refactor this hierarchy into strategies</i>", "<i>which combinations of features would need a new subclass?</i>", or "<i>write a caching decorator for this interface</i>". <b>Where AI goes wrong:</b> it produces decorators that forget to forward a member, double-log because two layers do the same thing, or builds strategy interfaces where a <code>Func</code> would do. <b>What you still own:</b> knowing the axes along which your system varies — that is what decides where the seams go.</p>`
  });

  topics[6].problems = [{
    title: 'Text Filter Decorators',
    level: 'Medium', tags: ['composition', 'decorator', 'interface'], companies: ['Microsoft', 'Atlassian', 'Adobe'],
    statement: `<p>Define <code>interface ITextFilter { string Run(string s); }</code>, an identity filter, and one <b>decorator</b> class per step that wraps an inner <code>ITextFilter</code>, runs it, then applies its own change. Steps: <code>trim</code>, <code>upper</code>, <code>lower</code>, <code>reverse</code>, <code>exclaim</code> (append "!"), <code>squeeze</code> (collapse runs of spaces to one space). Implement <code>public static string Apply(string text, string[] steps)</code> that builds the chain so steps run <b>in the given order</b> and returns the result.</p>`,
    constraints: `0 ≤ |text| ≤ 10<sup>5</sup>; 0 ≤ steps.Length ≤ 20; text is ASCII.`,
    example: `<p>Apply("abc", ["reverse", "exclaim"]) → "cba!" but Apply("abc", ["exclaim", "reverse"]) → "!cba". Order matters, so the chain must preserve it.</p>`,
    brute: {
      why: `<p>A loop with a switch that edits the string in place. It works, but the steps are not objects: you cannot store a pipeline, reuse it, log each stage, or add a step from another assembly without editing the switch. The decorator version turns each step into a reusable, testable unit.</p>`,
      code: `static string ApplySwitch(string text, string[] steps)
{
    foreach (var s in steps)
        text = s switch { "trim" => text.Trim(), "upper" => text.ToUpperInvariant(), _ => text };
    return text;
}`
    },
    mcq: { q: 'Each decorator runs its inner filter first and then its own change. To run steps in the given order you should…', options: ['Wrap in reverse order', 'Wrap in the given order: each new step wraps the chain built so far', 'Order does not matter', 'Sort the steps'], answer: 1, explain: 'If the newest wrapper runs the inner chain first, the innermost (first wrapped) step runs first — exactly the given order.' },
    hints: [
      `<p>Hint 1: <code>abstract class Step(ITextFilter inner) : ITextFilter { public string Run(string s) =&gt; Change(inner.Run(s)); protected abstract string Change(string s); }</code>.</p>`,
      `<p>Hint 2: Start with <code>ITextFilter chain = new Identity();</code> and for each step <code>chain = new Upper(chain)</code> etc.</p>`,
      `<p>Hint 3: squeeze: walk the characters with a StringBuilder and skip a space if the previous appended char was a space. Use the invariant upper/lower methods.</p>`
    ],
    tests: { sig: 'string string[] -> string', fn: 'Apply', cases: [
      [["  hello world  ", ["trim", "upper"]], "HELLO WORLD"],
      [["abc", []], "abc"],
      [["abc", ["reverse", "exclaim"]], "cba!"],
      [["abc", ["exclaim", "reverse"]], "!cba"],
      [["a   b    c", ["squeeze"]], "a b c"],
      [["", ["exclaim", "exclaim"]], "!!"],
      [["MiXeD", ["lower", "reverse", "upper"]], "DEXIM"],
      [["  x  ", ["exclaim", "trim"]], "x  !"],
      [[{ $rep: "ab ", n: 30000 }, ["squeeze", "trim", "upper"]], { $concat: [{ $rep: "AB ", n: 29999 }, "AB"] }]
    ] },
    solution: {
      approach: `<p>An abstract decorator base implements the "run inner, then change" rule once (a tiny template method), and each step only supplies <code>Change</code>. Building the chain in the given order makes the first step the innermost one, so it runs first.</p>`,
      code: `using System.Text;

public interface ITextFilter { string Run(string s); }

public sealed class Identity : ITextFilter { public string Run(string s) => s; }

public abstract class Step(ITextFilter inner) : ITextFilter
{
    public string Run(string s) => Change(inner.Run(s));   // inner first, then this step
    protected abstract string Change(string s);
}
public sealed class Trim(ITextFilter i) : Step(i) { protected override string Change(string s) => s.Trim(); }
public sealed class Upper(ITextFilter i) : Step(i) { protected override string Change(string s) => s.ToUpperInvariant(); }
public sealed class Lower(ITextFilter i) : Step(i) { protected override string Change(string s) => s.ToLowerInvariant(); }
public sealed class Exclaim(ITextFilter i) : Step(i) { protected override string Change(string s) => s + "!"; }
public sealed class Reverse(ITextFilter i) : Step(i)
{
    protected override string Change(string s) { var a = s.ToCharArray(); Array.Reverse(a); return new string(a); }
}
public sealed class Squeeze(ITextFilter i) : Step(i)
{
    protected override string Change(string s)
    {
        var sb = new StringBuilder(s.Length);
        foreach (char c in s)
            if (c != ' ' || sb.Length == 0 || sb[^1] != ' ') sb.Append(c);
        return sb.ToString();
    }
}

public class Solution
{
    public static string Apply(string text, string[] steps)
    {
        ITextFilter chain = new Identity();
        foreach (var step in steps)
            chain = step switch
            {
                "trim" => new Trim(chain),
                "upper" => new Upper(chain),
                "lower" => new Lower(chain),
                "reverse" => new Reverse(chain),
                "exclaim" => new Exclaim(chain),
                "squeeze" => new Squeeze(chain),
                _ => throw new ArgumentException("unknown step " + step)
            };
        return chain.Run(text);
    }
}`,
      dry: { head: ['build step', 'chain', 'Run("abc") order'], rows: [
        ['start', 'Identity', 'abc'],
        ['reverse', 'Reverse(Identity)', 'Identity → Reverse = cba'],
        ['exclaim', 'Exclaim(Reverse(Identity))', 'Identity → Reverse → Exclaim = cba!']
      ] },
      complexity: `<p>O(k·n) for k steps over a string of length n; one allocation per step.</p>`,
      followUps: ['Make the pipeline from a list of <code>Func&lt;string, string&gt;</code> instead — what do you lose?', 'Add a decorator that records the intermediate result of every stage for debugging.']
    }
  }];

  /* ============================ PRACTICE ============================ */
  practice.push({
    title: 'Total Area of Mixed Shapes',
    level: 'Easy', tags: ['abstract class', 'polymorphism'], companies: ['Amazon', 'Autodesk', 'Microsoft'],
    statement: `<p>Each string is <code>circle r</code>, <code>square s</code> or <code>rect w h</code>. Build a list of <code>Shape</code> objects (abstract base with an abstract <code>Area()</code>) and return the sum of their areas. <code>Square</code> should reuse <code>Rect</code>.</p>`,
    constraints: `0 ≤ shapes.Length ≤ 10<sup>4</sup>; dimensions are decimals in (0, 10<sup>6</sup>]. Parse with the invariant culture.`,
    example: `<p>["circle 1", "square 2"] → π + 4 ≈ <b>7.14159</b>.</p>`,
    brute: { why: `<p>A switch that computes each area inline is fine for a one-off but has no reusable Shape type; the next feature (perimeter, drawing) repeats the switch.</p>`, code: `static double AreaOf(string s)
{
    var p = s.Split(' ');
    return p[0] == "circle" ? Math.PI * double.Parse(p[1]) * double.Parse(p[1]) : 0;   // and so on for every kind
}` },
    mcq: { q: 'How should Square relate to Rect when shapes are immutable?', options: ['Square : Rect, passing (s, s) to the base constructor', 'Copy Rect\'s code into Square', 'Rect : Square', 'They must be unrelated'], answer: 0, explain: 'For immutable shapes, a square really is a rectangle with equal sides; reuse the base constructor. (With mutable width/height setters this breaks Liskov.)' },
    hints: [`<p>Hint 1: <code>abstract class Shape { public abstract double Area(); }</code></p>`, `<p>Hint 2: <code>class Square(double s) : Rect(s, s)</code> — mark Rect non-sealed.</p>`, `<p>Hint 3: <code>shapes.Select(Parse).Sum(s =&gt; s.Area())</code>.</p>`],
    tests: { sig: 'string[] -> double', fn: 'TotalArea', cmp: 'float', cases: [
      [[["circle 1", "square 2"]], 7.141592653589793],
      [[[]], 0.0],
      [[["rect 2 3"]], 6.0],
      [[["circle 0.5"]], 0.7853981633974483],
      [[["square 1000000", "square 1000000"]], 2000000000000.0],
      [[["rect 1.5 2", "circle 2"]], 15.566370614359172]
    ] },
    solution: {
      approach: `<p>An abstract base with one abstract member, three small concrete classes, and LINQ to sum through the base type.</p>`,
      code: `using System.Globalization;

public abstract class Shape { public abstract double Area(); }
public sealed class Circle(double r) : Shape { public override double Area() => Math.PI * r * r; }
public class Rect(double w, double h) : Shape { public override double Area() => w * h; }
public sealed class Square(double s) : Rect(s, s) { }

public class Solution
{
    static Shape Parse(string text)
    {
        var p = text.Split(' ');
        double D(int i) => double.Parse(p[i], CultureInfo.InvariantCulture);
        return p[0] switch
        {
            "circle" => new Circle(D(1)),
            "square" => new Square(D(1)),
            "rect" => new Rect(D(1), D(2)),
            _ => throw new FormatException("unknown shape " + p[0])
        };
    }
    public static double TotalArea(string[] shapes) => shapes.Select(Parse).Sum(s => s.Area());
}`,
      complexity: `<p>O(n) time; O(1) extra besides the lazily created shapes.</p>`,
      followUps: ['Add Perimeter — which classes change?', 'Why would a mutable Square : Rect be a design bug?']
    }
  });

  practice.push({
    title: 'ToString with a base Call',
    level: 'Easy', tags: ['ToString', 'override', 'base'], companies: ['Infosys', 'TCS', 'Microsoft'],
    statement: `<p>Write <code>class Person(string name, int age)</code> overriding <code>ToString()</code> as <code>"Name (Age)"</code>, and <code>class Minor : Person</code> whose ToString is the base text plus <code>" [minor]"</code> (use <code>base.ToString()</code>). People under 18 are Minors. Implement <code>public static string[] Describe(string[] names, int[] ages)</code> that creates the objects and returns their <code>ToString()</code> results <b>called through a Person-typed variable</b>.</p>`,
    constraints: `names.Length == ages.Length ≤ 10<sup>4</sup>; 0 ≤ age ≤ 150.`,
    example: `<p>(["Asha", "Ben"], [30, 12]) → ["Asha (30)", "Ben (12) [minor]"].</p>`,
    brute: { why: `<p>Formatting in the caller with an <code>if (age &lt; 18)</code> spreads the "how is a person shown" rule across the code base. Overriding ToString puts it in one place and makes logs, debugger views and string interpolation all agree.</p>`, code: `static string Show(string name, int age) => age < 18 ? $"{name} ({age}) [minor]" : $"{name} ({age})";` },
    mcq: { q: 'Inside Minor.ToString, what does <code>base.ToString()</code> call?', options: ['Minor.ToString again (infinite recursion)', 'Person.ToString, non-virtually', 'object.ToString', 'Nothing — base is only for constructors'], answer: 1, explain: 'base.Member is a non-virtual call to the parent\'s implementation, which is how an override extends rather than replaces.' },
    hints: [`<p>Hint 1: <code>public override string ToString() =&gt; $"{Name} ({Age})";</code></p>`, `<p>Hint 2: <code>class Minor(string n, int a) : Person(n, a) { public override string ToString() =&gt; base.ToString() + " [minor]"; }</code></p>`, `<p>Hint 3: Store objects as <code>Person</code> and call ToString — virtual dispatch picks the right override.</p>`],
    tests: { sig: 'string[] int[] -> string[]', fn: 'Describe', cases: [
      [[["Asha", "Ben"], [30, 12]], ["Asha (30)", "Ben (12) [minor]"]],
      [[[], []], []],
      [[["Z"], [18]], ["Z (18)"]],
      [[["Kid"], [0]], ["Kid (0) [minor]"]],
      [[["A", "B", "C"], [17, 18, 19]], ["A (17) [minor]", "B (18)", "C (19)"]],
      [[["Old"], [120]], ["Old (120)"]]
    ] },
    solution: {
      approach: `<p>Person owns the base format; Minor extends it with base.ToString(). The caller only knows Person.</p>`,
      code: `public class Person(string name, int age)
{
    public string Name { get; } = name;
    public int Age { get; } = age;
    public override string ToString() => $"{Name} ({Age})";
}

public sealed class Minor(string name, int age) : Person(name, age)
{
    public override string ToString() => base.ToString() + " [minor]";
}

public class Solution
{
    public static string[] Describe(string[] names, int[] ages)
    {
        var result = new string[names.Length];
        for (int i = 0; i < names.Length; i++)
        {
            Person p = ages[i] < 18 ? new Minor(names[i], ages[i]) : new Person(names[i], ages[i]);
            result[i] = p.ToString();          // virtual: Minor's override when p is a Minor
        }
        return result;
    }
}`,
      complexity: `<p>O(n) time and space.</p>`,
      followUps: ['A Minor turns 18 — why is a subclass a poor model for a state that changes? (state/flag instead)', 'How do records generate ToString, and can you customise part of it with PrintMembers?']
    }
  });

  practice.push({
    title: 'Counters Behind an Interface',
    level: 'Easy', tags: ['interface', 'polymorphism', 'unchecked arithmetic'], companies: ['Amazon', 'Bloomberg', 'Microsoft'],
    statement: `<p>Define <code>interface ICounter { int Next(); }</code> with two implementations: <code>StepCounter(start, step)</code> returns start, start+step, start+2·step, … and <code>CycleCounter(start, mod)</code> returns start, start+1, … wrapping to 0 when it reaches <code>mod</code>. Implement <code>public static int[] Take(string kind, int a, int b, int n)</code>: create the counter (<code>"step"</code> → StepCounter(a, b), <code>"cycle"</code> → CycleCounter(a, b)) and return its first n values. Arithmetic uses C#'s default unchecked <code>int</code> behaviour.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>5</sup>; for "cycle", 0 ≤ a &lt; b.`,
    example: `<p>Take("cycle", 2, 4, 5) → [2, 3, 0, 1, 2]. Take("step", 2147483647, 1, 2) → [2147483647, −2147483648] (silent wrap-around).</p>`,
    brute: { why: `<p>A single function with a <code>bool isCycle</code> flag inside the loop. The caller then cannot accept "any counter" — for instance a test that wants a fake counter returning fixed values.</p>`, code: `static int[] TakeFlag(bool cycle, int a, int b, int n)
{
    var r = new int[n];
    for (int i = 0, v = a; i < n; i++) { r[i] = v; v = cycle ? (v + 1) % b : v + b; }
    return r;
}` },
    mcq: { q: 'StepCounter(int.MaxValue, 1).Next() twice returns what in a default C# project?', options: ['Throws OverflowException', 'int.MaxValue then int.MinValue', 'int.MaxValue twice', 'It does not compile'], answer: 1, explain: 'Integer arithmetic is unchecked by default (unless the project enables CheckForOverflowUnderflow or the code uses checked), so it wraps.' },
    hints: [`<p>Hint 1: Each class keeps its current value in a private field and advances it after returning.</p>`, `<p>Hint 2: Cycle: <code>_v = _v + 1 == _mod ? 0 : _v + 1;</code></p>`, `<p>Hint 3: Type the variable as <code>ICounter</code> so the loop works for any implementation.</p>`],
    tests: { sig: 'string int int int -> int[]', fn: 'Take', cases: [
      [["step", 0, 1, 5], [0, 1, 2, 3, 4]],
      [["step", 10, -3, 4], [10, 7, 4, 1]],
      [["cycle", 2, 4, 5], [2, 3, 0, 1, 2]],
      [["cycle", 0, 1, 3], [0, 0, 0]],
      [["step", 5, 0, 0], []],
      [["step", 2147483647, 1, 2], [2147483647, -2147483648]],
      [["cycle", 0, 3, 7], [0, 1, 2, 0, 1, 2, 0]]
    ] },
    solution: {
      approach: `<p>Two small classes behind one interface; the loop depends only on <code>ICounter</code>.</p>`,
      code: `public interface ICounter { int Next(); }

public sealed class StepCounter(int start, int step) : ICounter
{
    private int _value = start;
    public int Next() { int v = _value; _value += step; return v; }   // unchecked: wraps on overflow
}

public sealed class CycleCounter(int start, int mod) : ICounter
{
    private int _value = start;
    public int Next() { int v = _value; _value = _value + 1 == mod ? 0 : _value + 1; return v; }
}

public class Solution
{
    public static int[] Take(string kind, int a, int b, int n)
    {
        ICounter counter = kind == "cycle" ? new CycleCounter(a, b) : new StepCounter(a, b);
        var result = new int[n];
        for (int i = 0; i < n; i++) result[i] = counter.Next();
        return result;
    }
}`,
      complexity: `<p>O(n) time and output space.</p>`,
      followUps: ['Make the counters implement IEnumerable&lt;int&gt; with yield return (module 6).', 'Wrap Next in checked(...) — which test changes?']
    }
  });

  practice.push({
    title: 'Animal Chorus (Program)',
    level: 'Easy', tags: ['abstract class', 'virtual', 'stdin'], companies: ['Unity', 'EA', 'Microsoft'],
    statement: `<p>Read lines <code>kind name</code> until end of input (kind is <code>dog</code>, <code>cat</code>, <code>cow</code> or <code>duck</code>; extra spaces may appear). Use an abstract class <code>Animal</code> with an abstract <code>Sound</code> property and a non-virtual <code>Describe()</code> producing <code>"NAME the KIND says SOUND"</code> (Woof, Meow, Moo, Quack). Print one line per animal; for an unknown kind print <code>unknown animal KIND</code>. Finish with <code>animals: N</code>, the number of animals created.</p>`,
    constraints: `At most 1000 lines.`,
    example: `<p>Input <code>dog Rex / cat Tom</code> → <code>Rex the dog says Woof</code>, <code>Tom the cat says Meow</code>, <code>animals: 2</code>.</p>`,
    brute: { why: `<p>Printing straight from a switch works but duplicates the sentence four times; one typo and one animal speaks differently. The abstract base owns the sentence once.</p>`, code: `static string Line(string kind, string name) => kind switch
{
    "dog" => name + " the dog says Woof",
    "cat" => name + " the cat says Meow",
    _ => "unknown animal " + kind
};` },
    mcq: { q: 'Where should the word "dog" in the sentence come from?', options: ['A switch in Main', 'An abstract/virtual Kind member each subclass supplies (or GetType().Name lower-cased)', 'A global array', 'The constructor of Animal hard-coding it'], answer: 1, explain: 'Let the subclass describe itself; the base sentence just asks for it.' },
    hints: [`<p>Hint 1: <code>abstract class Animal(string name) { protected abstract string Kind { get; } protected abstract string Sound { get; } public string Describe() =&gt; … }</code></p>`, `<p>Hint 2: Read with <code>Console.In.ReadToEnd()</code>, split lines, then split each line with <code>StringSplitOptions.RemoveEmptyEntries</code>.</p>`, `<p>Hint 3: Use a switch expression returning <code>Animal?</code> and print the unknown message when it is null.</p>`],
    tests: { io: true, cases: [
      { stdin: 'dog Rex\ncat Tom\n', stdout: 'Rex the dog says Woof\nTom the cat says Meow\nanimals: 2' },
      { stdin: '', stdout: 'animals: 0' },
      { stdin: 'cow Bessie\n', stdout: 'Bessie the cow says Moo\nanimals: 1' },
      { stdin: 'fox Red\ndog A\n', stdout: 'unknown animal fox\nA the dog says Woof\nanimals: 1' },
      { stdin: 'duck Don\n', stdout: 'Don the duck says Quack\nanimals: 1' },
      { stdin: 'cat X\ncat Y\ncat Z\n', stdout: 'X the cat says Meow\nY the cat says Meow\nZ the cat says Meow\nanimals: 3' },
      { stdin: 'dog  Rex  \n', stdout: 'Rex the dog says Woof\nanimals: 1' }
    ] },
    solution: {
      approach: `<p>Abstract base with two abstract properties and one fixed sentence; four tiny subclasses; a switch expression as the factory.</p>`,
      code: { lang: 'csharp', run: true, code: `var lines = Console.In.ReadToEnd().Split('\\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
int created = 0;
foreach (var line in lines)
{
    var p = line.Split(' ', StringSplitOptions.RemoveEmptyEntries);
    Animal? a = p[0] switch
    {
        "dog" => new Dog(p[1]),
        "cat" => new Cat(p[1]),
        "cow" => new Cow(p[1]),
        "duck" => new Duck(p[1]),
        _ => null
    };
    if (a is null) { Console.WriteLine("unknown animal " + p[0]); continue; }
    created++;
    Console.WriteLine(a.Describe());
}
Console.WriteLine($"animals: {created}");

abstract class Animal(string name)
{
    protected abstract string Kind { get; }
    protected abstract string Sound { get; }
    public string Describe() => $"{name} the {Kind} says {Sound}";   // one sentence for all
}
sealed class Dog(string n) : Animal(n) { protected override string Kind => "dog"; protected override string Sound => "Woof"; }
sealed class Cat(string n) : Animal(n) { protected override string Kind => "cat"; protected override string Sound => "Meow"; }
sealed class Cow(string n) : Animal(n) { protected override string Kind => "cow"; protected override string Sound => "Moo"; }
sealed class Duck(string n) : Animal(n) { protected override string Kind => "duck"; protected override string Sound => "Quack"; }` },
      complexity: `<p>O(total input size).</p>`,
      followUps: ['Register animal kinds in a Dictionary&lt;string, Func&lt;string, Animal&gt;&gt; instead of a switch.', 'Make Describe virtual for a Parrot that repeats its name — is that better or worse?']
    }
  });

  practice.push({
    title: 'Payroll with an Abstract Employee',
    level: 'Medium', tags: ['abstract class', 'polymorphism', 'long arithmetic'], companies: ['ADP', 'Workday', 'Oracle'],
    statement: `<p>Rows: <code>salaried NAME monthly</code>, <code>hourly NAME rate hours</code>, <code>commission NAME base sales pct</code>. Pay rules: salaried = monthly; hourly = rate × min(hours, 160) + overtime hours × rate × 3 / 2 (integer division on the overtime part); commission = base + sales × pct / 100 (integer division). Model with an abstract <code>Employee</code> and an abstract <code>Pay()</code> returning <code>long</code>. Implement <code>public static long Payroll(string[] rows)</code> returning the total.</p>`,
    constraints: `0 ≤ rows ≤ 10<sup>4</sup>; all numbers are non-negative and fit in <code>long</code>; totals fit in <code>long</code>.`,
    example: `<p>["salaried A 5000", "hourly B 10 100", "commission C 0 999 10"] → 5000 + 1000 + 99 = <b>6099</b>.</p>`,
    brute: { why: `<p>Parallel arrays of type codes and numbers with a switch in the total loop. Adding a fourth kind (contractor) means editing the loop; pay rules are not testable alone.</p>`, code: `static long PayOf(string[] p) => p[0] switch
{
    "salaried" => long.Parse(p[2]),
    _ => 0   // every kind squeezed into one switch
};` },
    mcq: { q: 'Why make Pay() return long instead of int?', options: ['long is faster', 'Rates × hours and big salaries can exceed 2³¹−1 and int would wrap silently', 'int cannot be returned from an abstract method', 'Style only'], answer: 1, explain: '10⁶ × 200 already needs more than int, and C# int arithmetic is unchecked by default, so the error would be silent.' },
    hints: [`<p>Hint 1: <code>abstract class Employee(string name) { public abstract long Pay(); }</code></p>`, `<p>Hint 2: Hourly: <code>long regular = Math.Min(hours, 160), extra = hours - regular; return rate * regular + rate * extra * 3 / 2;</code></p>`, `<p>Hint 3: Sum with <code>rows.Select(Parse).Sum(e =&gt; e.Pay())</code> — LINQ's Sum over long checks for overflow.</p>`],
    tests: { sig: 'string[] -> long', fn: 'Payroll', cases: [
      [[["salaried A 5000"]], 5000],
      [[[]], 0],
      [[["hourly B 20 160"]], 3200],
      [[["hourly B 20 170"]], 3500],
      [[["commission C 1000 20000 5"]], 2000],
      [[["salaried A 5000", "hourly B 10 100", "commission C 0 999 10"]], 6099],
      [[["hourly D 1000000 200", "salaried E 3000000000"]], 3220000000],
      [[["hourly F 15 161"]], 2422]
    ] },
    solution: {
      approach: `<p>Each kind is a subclass with its own Pay; the total is a polymorphic sum over the base type.</p>`,
      code: `public abstract class Employee(string name)
{
    public string Name { get; } = name;
    public abstract long Pay();
}
public sealed class Salaried(string name, long monthly) : Employee(name)
{
    public override long Pay() => monthly;
}
public sealed class Hourly(string name, long rate, long hours) : Employee(name)
{
    public override long Pay()
    {
        long regular = Math.Min(hours, 160), extra = hours - regular;
        return rate * regular + rate * extra * 3 / 2;
    }
}
public sealed class Commission(string name, long baseSalary, long sales, long pct) : Employee(name)
{
    public override long Pay() => baseSalary + sales * pct / 100;
}

public class Solution
{
    static Employee Parse(string row)
    {
        var p = row.Split(' ');
        long N(int i) => long.Parse(p[i]);
        return p[0] switch
        {
            "salaried" => new Salaried(p[1], N(2)),
            "hourly" => new Hourly(p[1], N(2), N(3)),
            _ => new Commission(p[1], N(2), N(3), N(4))
        };
    }
    public static long Payroll(string[] rows) => rows.Select(Parse).Sum(e => e.Pay());
}`,
      complexity: `<p>O(n) time for n rows, O(1) extra memory besides the parsed objects.</p>`,
      followUps: ['An employee can be both commissioned and hourly — does inheritance still fit? (compose pay components)', 'Use decimal for money with cents; what changes?']
    }
  });

  practice.push({
    title: 'Bounded Stack by Composition',
    level: 'Medium', tags: ['composition', 'encapsulation', 'design'], companies: ['Amazon', 'Microsoft', 'Goldman Sachs'],
    statement: `<p>Design <code>BoundedStack</code> with a constructor taking a capacity, <code>bool Push(int x)</code> (false when full), <code>int Pop()</code> and <code>int Peek()</code> (both return −1 when empty) and <code>int Size()</code>. Do <b>not</b> inherit from <code>List&lt;int&gt;</code> or <code>Stack&lt;int&gt;</code>: hold a collection privately and expose only these members.</p>`,
    constraints: `0 ≤ capacity ≤ 10<sup>5</sup>; up to 10<sup>5</sup> operations.`,
    example: `<p>BoundedStack(2): Push(1) true, Push(2) true, Push(3) <b>false</b>, Size() 2, Pop() 2, Peek() 1.</p>`,
    brute: { why: `<p><code>class BoundedStack : List&lt;int&gt;</code> compiles and "works", but callers can call <code>Insert(0, x)</code>, <code>Add</code> past the capacity or <code>RemoveAt</code> in the middle — every invariant you meant to keep is one method call away from broken. And List's methods are not virtual, so you cannot even intercept them.</p>`, code: `class LeakyStack : List<int>
{
    public int Capacity2 { get; init; }
    public bool Push(int x) { if (Count == Capacity2) return false; Add(x); return true; }
    // ...but Add, Insert, RemoveAt are all still public
}` },
    mcq: { q: 'Why can you not fix LeakyStack by overriding List&lt;int&gt;.Add?', options: ['List&lt;T&gt;.Add is not virtual, so a "new Add" would only hide it and callers using a List or IList reference bypass it', 'You can, it is virtual', 'List&lt;T&gt; is sealed', 'Generic classes cannot be inherited'], answer: 0, explain: 'List&lt;T&gt; is not designed for inheritance (no virtual members). Collection&lt;T&gt; exists for that, but composition is simpler.' },
    hints: [`<p>Hint 1: <code>private readonly int[] _items; private int _count;</code></p>`, `<p>Hint 2: Push checks <code>_count == _items.Length</code>; Pop returns <code>_items[--_count]</code>.</p>`, `<p>Hint 3: Capacity 0 is legal: every Push fails.</p>`],
    tests: { cls: 'BoundedStack', sigs: { BoundedStack: 'int', push: 'int -> bool', pop: '-> int', peek: '-> int', size: '-> int' }, cases: [
      { ops: ['BoundedStack', 'push', 'push', 'push', 'size', 'pop', 'peek', 'pop', 'pop'], args: [[2], [1], [2], [3], [], [], [], [], []], out: [null, true, true, false, 2, 2, 1, 1, -1] },
      { ops: ['BoundedStack', 'push', 'size', 'peek'], args: [[0], [5], [], []], out: [null, false, 0, -1] },
      { ops: ['BoundedStack', 'pop', 'push', 'peek', 'size'], args: [[3], [], [-7], [], []], out: [null, -1, true, -7, 1] },
      { ops: ['BoundedStack', 'push', 'pop', 'push', 'push', 'peek'], args: [[1], [1], [], [2], [3], []], out: [null, true, 1, true, false, 2] },
      { ops: { $concat: [['BoundedStack'], { $rep: 'push', n: 5001 }, ['size']] }, args: { $concat: [[[5000]], { $rep: [1], n: 5001 }, [[]]] }, out: { $concat: [[null], { $rep: true, n: 5000 }, [false], [5000]] } },
      { ops: ['BoundedStack', 'push', 'push', 'pop', 'pop', 'size'], args: [[2], [2147483647], [-2147483648], [], [], []], out: [null, true, true, -2147483648, 2147483647, 0] }
    ] },
    solution: {
      approach: `<p>Has-a array plus a count. The public surface is exactly the four operations, so the capacity invariant cannot be bypassed.</p>`,
      code: `public sealed class BoundedStack
{
    private readonly int[] _items;   // has-a storage, invisible to callers
    private int _count;

    public BoundedStack(int capacity) => _items = new int[capacity];

    public bool Push(int x)
    {
        if (_count == _items.Length) return false;
        _items[_count++] = x;
        return true;
    }
    public int Pop() => _count == 0 ? -1 : _items[--_count];
    public int Peek() => _count == 0 ? -1 : _items[_count - 1];
    public int Size() => _count;
}`,
      complexity: `<p>O(1) per operation, O(capacity) memory.</p>`,
      followUps: ['Make it generic: BoundedStack&lt;T&gt; with bool TryPop(out T item) instead of a −1 sentinel.', 'Implement IEnumerable&lt;int&gt; so it works with foreach, without exposing mutation.']
    }
  });

  practice.push({
    title: 'Money Value Object',
    level: 'Medium', tags: ['Equals', 'GetHashCode', 'IEquatable', 'value object'], companies: ['Stripe', 'PayPal', 'Revolut'],
    statement: `<p>Write a sealed class <code>Money</code> with <code>decimal Amount</code> and <code>string Currency</code> (stored upper-case). Two Money values are equal when the amounts are numerically equal (10.5 equals 10.50) and the currencies match ignoring case. Override Equals/GetHashCode, implement <code>IEquatable&lt;Money&gt;</code> and <code>==</code>/<code>!=</code>. Implement <code>public static int DistinctAmounts(string[] items)</code> where each item is <code>"AMOUNT CURRENCY"</code>, returning the number of distinct Money values.</p>`,
    constraints: `0 ≤ items.Length ≤ 10<sup>5</sup>; amounts parse as <code>decimal</code> with the invariant culture.`,
    example: `<p>["10.50 USD", "10.5 usd", "10.50 EUR"] → <b>2</b>.</p>`,
    brute: { why: `<p>Using the raw strings in a <code>HashSet&lt;string&gt;</code> counts "10.50 USD" and "10.5 usd" as different. Comparing every pair with a custom function is O(n²).</p>`, code: `static int DistinctStrings(string[] items) => new HashSet<string>(items).Count;   // wrong: formatting differences count` },
    mcq: { q: '<code>10.5m.Equals(10.50m)</code> and their hash codes…', options: ['Equal and equal hashes — decimal compares numerically and hashes the normalised value', 'Equal but different hashes', 'Not equal (different scale)', 'Throws'], answer: 0, explain: 'decimal keeps the scale (10.50 prints with two decimals) but Equals and GetHashCode treat 10.5 and 10.50 as the same number.' },
    hints: [`<p>Hint 1: Normalise in the constructor: <code>Currency = currency.ToUpperInvariant();</code>.</p>`, `<p>Hint 2: <code>GetHashCode() =&gt; HashCode.Combine(Amount, Currency);</code> works because decimal's own hash ignores trailing zeros.</p>`, `<p>Hint 3: <code>operator ==</code> must handle null on either side: <code>l is null ? r is null : l.Equals(r)</code>.</p>`],
    tests: { sig: 'string[] -> int', fn: 'DistinctAmounts', cases: [
      [[["10.50 USD", "10.5 usd", "10.50 EUR"]], 2],
      [[[]], 0],
      [[["0 INR", "0.00 inr", "0.000 Inr"]], 1],
      [[["1 USD", "2 USD", "3 USD", "1.0 USD"]], 3],
      [[["5 usd", "5 USD", "5 Usd", "5 uSD"]], 1],
      [[["79228162514264337593543950335 USD", "79228162514264337593543950335 usd", "1 JPY"]], 2],
      [[["0.1 GBP", "0.10 GBP", "0.01 GBP"]], 2]
    ] },
    solution: {
      approach: `<p>Normalise the currency once, let decimal handle numeric equality, and keep Equals, GetHashCode and the operators consistent.</p>`,
      code: `using System.Globalization;

public sealed class Money : IEquatable<Money>
{
    public decimal Amount { get; }
    public string Currency { get; }
    public Money(decimal amount, string currency) { Amount = amount; Currency = currency.ToUpperInvariant(); }

    public bool Equals(Money? other) => other is not null && Amount == other.Amount && Currency == other.Currency;
    public override bool Equals(object? obj) => Equals(obj as Money);
    public override int GetHashCode() => HashCode.Combine(Amount, Currency);
    public override string ToString() => $"{Amount.ToString(CultureInfo.InvariantCulture)} {Currency}";
    public static bool operator ==(Money? l, Money? r) => l is null ? r is null : l.Equals(r);
    public static bool operator !=(Money? l, Money? r) => !(l == r);
}

public class Solution
{
    public static int DistinctAmounts(string[] items)
    {
        var set = new HashSet<Money>();
        foreach (var item in items)
        {
            var p = item.Split(' ');
            set.Add(new Money(decimal.Parse(p[0], CultureInfo.InvariantCulture), p[1]));
        }
        return set.Count;
    }
}`,
      complexity: `<p>O(n) average time and O(n) space for the set of distinct values.</p>`,
      followUps: ['Add Money + Money that throws for different currencies.', 'Rewrite as <code>public readonly record struct Money</code> — why would the currency normalisation need an explicit constructor?']
    }
  });

  practice.push({
    title: 'Notification Channels (Program)',
    level: 'Medium', tags: ['interface', 'explicit implementation', 'stdin'], companies: ['Twilio', 'Microsoft', 'Swiggy'],
    statement: `<p>Each input line is <code>channel user message…</code> (split into at most 3 parts on single spaces; the message keeps its own spacing). Channels implement <code>interface INotifier { string Send(string user, string msg); }</code>:</p>
<ul><li><code>email</code> → <code>EMAIL to USER: MSG</code></li>
<li><code>push</code> → <code>PUSH USER: MSG</code></li>
<li><code>sms</code> → <code>SMS to USER: MSG</code> with MSG cut to its first 20 characters. SMS also implements <code>interface IThrottled { int Limit { get; } }</code> <b>explicitly</b> with Limit 2: the third and later SMS to the same user print <code>SMS to USER throttled</code>.</li></ul>
<p>An unknown channel prints <code>no channel NAME</code>. Finish with <code>sent=S throttled=T</code>.</p>`,
    constraints: `At most 10<sup>4</sup> lines.`,
    example: `<p><code>sms bob a / sms bob b / sms bob c</code> → two SMS lines, then <code>SMS to bob throttled</code>, then <code>sent=2 throttled=1</code>.</p>`,
    brute: { why: `<p>One method with a switch per channel and a dictionary of counts for SMS only. The throttling rule leaks into the dispatcher, and a new throttled channel (WhatsApp) needs another special case. With an interface, the dispatcher asks "<i>is this channel IThrottled?</i>" and applies one rule.</p>`, code: `static string SendFlat(string ch, string user, string msg) => ch switch
{
    "email" => $"EMAIL to {user}: {msg}",
    _ => "no channel " + ch
};` },
    mcq: { q: 'The dispatcher holds an INotifier. How does it read the SMS limit, which is implemented explicitly?', options: ['notifier.Limit', '<code>notifier is IThrottled t ? t.Limit : …</code>', 'Reflection', 'It cannot'], answer: 1, explain: 'Explicit members are reachable through the interface type; a type pattern gives you that view.' },
    hints: [`<p>Hint 1: <code>line.Split(' ', 3)</code> keeps the rest of the line as the message.</p>`, `<p>Hint 2: Keep <code>Dictionary&lt;(string channel, string user), int&gt;</code> counts in the dispatcher and check <code>if (n is IThrottled t &amp;&amp; count &gt;= t.Limit)</code>.</p>`, `<p>Hint 3: Truncate with <code>msg.Length &gt; 20 ? msg[..20] : msg</code>.</p>`],
    tests: { io: true, cases: [
      { stdin: 'email ann Hello there\nsms bob Your code is 1234\npush ann Ping\n', stdout: 'EMAIL to ann: Hello there\nSMS to bob: Your code is 1234\nPUSH ann: Ping\nsent=3 throttled=0' },
      { stdin: '', stdout: 'sent=0 throttled=0' },
      { stdin: 'sms bob a\nsms bob b\nsms bob c\nsms amy d\n', stdout: 'SMS to bob: a\nSMS to bob: b\nSMS to bob throttled\nSMS to amy: d\nsent=3 throttled=1' },
      { stdin: 'sms joe This message is definitely longer than twenty\n', stdout: 'SMS to joe: This message is defi\nsent=1 throttled=0' },
      { stdin: 'fax tom hi\nemail tom hi\n', stdout: 'no channel fax\nEMAIL to tom: hi\nsent=1 throttled=0' },
      { stdin: 'push x a  b\n', stdout: 'PUSH x: a  b\nsent=1 throttled=0' },
      { stdin: 'sms a 1\nemail a 2\nsms a 3\nsms a 4\nsms a 5\n', stdout: 'SMS to a: 1\nEMAIL to a: 2\nSMS to a: 3\nSMS to a throttled\nSMS to a throttled\nsent=3 throttled=2' }
    ] },
    solution: {
      approach: `<p>Channels implement INotifier; SMS also implements IThrottled explicitly. The dispatcher counts per (channel, user) and consults the limit only for channels that are IThrottled.</p>`,
      code: { lang: 'csharp', run: true, code: `var channels = new Dictionary<string, INotifier>
{
    ["email"] = new EmailNotifier(),
    ["push"] = new PushNotifier(),
    ["sms"] = new SmsNotifier()
};
var counts = new Dictionary<(string, string), int>();
int sent = 0, throttled = 0;
foreach (var raw in Console.In.ReadToEnd().Split('\\n'))
{
    var line = raw.TrimEnd('\\r');
    if (line.Length == 0) continue;
    var p = line.Split(' ', 3);
    string channel = p[0], user = p[1], msg = p.Length > 2 ? p[2] : "";
    if (!channels.TryGetValue(channel, out var notifier)) { Console.WriteLine("no channel " + channel); continue; }
    counts.TryGetValue((channel, user), out int used);
    if (notifier is IThrottled t && used >= t.Limit)
    {
        Console.WriteLine($"{channel.ToUpperInvariant()} to {user} throttled");
        throttled++;
        continue;
    }
    counts[(channel, user)] = used + 1;
    Console.WriteLine(notifier.Send(user, msg));
    sent++;
}
Console.WriteLine($"sent={sent} throttled={throttled}");

interface INotifier { string Send(string user, string msg); }
interface IThrottled { int Limit { get; } }

sealed class EmailNotifier : INotifier { public string Send(string user, string msg) => $"EMAIL to {user}: {msg}"; }
sealed class PushNotifier : INotifier { public string Send(string user, string msg) => $"PUSH {user}: {msg}"; }
sealed class SmsNotifier : INotifier, IThrottled
{
    int IThrottled.Limit => 2;                     // explicit: not part of SmsNotifier's public API
    public string Send(string user, string msg) => $"SMS to {user}: {(msg.Length > 20 ? msg[..20] : msg)}";
}` },
      complexity: `<p>O(total input) time, O(distinct (channel, user) pairs) memory.</p>`,
      followUps: ['Make the limit per time window instead of forever (inject an IClock).', 'Add a "fallback" decorator: if SMS is throttled, send email instead.']
    }
  });

  practice.push({
    title: 'Exporter Template Method',
    level: 'Medium', tags: ['abstract class', 'template method', 'hooks'], companies: ['Microsoft', 'SAP', 'Salesforce'],
    statement: `<p>Rows are <code>"name,age"</code>. Write an abstract <code>Exporter</code> whose non-virtual <code>Export(string[] rows)</code> builds: <code>Open + join(Separator, [Header (if not empty), each Row(name, age)]) + Close</code>. Subclasses supply the pieces:</p>
${H.table(['format', 'Open', 'Header', 'Row', 'Separator', 'Close'], [
  ['csv', '""', 'name,age', 'Asha,30', '"\\n"', '""'],
  ['json', '"["', '""', '{"name":"Asha","age":30}', '","', '"]"'],
  ['md', '""', '| name | age |\\n|---|---|', '| Asha | 30 |', '"\\n"', '""']
])}
<p>Implement <code>public static string ExportAs(string format, string[] rows)</code>. Open/Close/Header should be <b>virtual hooks</b> with empty defaults; Row and Separator are abstract.</p>`,
    constraints: `0 ≤ rows ≤ 10<sup>4</sup>; names contain no commas, quotes or pipes.`,
    example: `<p>ExportAs("json", ["Asha,30", "Ben,25"]) → <code>[{"name":"Asha","age":30},{"name":"Ben","age":25}]</code>.</p>`,
    brute: { why: `<p>Three separate methods, each re-implementing the loop, the joining and the edge case of zero rows. A bug fix to the joining has to be made three times.</p>`, code: `static string Csv(string[] rows) => "name,age" + (rows.Length > 0 ? "\\n" + string.Join("\\n", rows) : "");` },
    mcq: { q: 'Which members should be virtual with a default rather than abstract?', options: ['Row', 'Separator', 'Open, Close and Header — most formats leave them empty', 'Export'], answer: 2, explain: 'Hooks with sensible defaults keep subclasses small; only what every format must define is abstract. Export stays non-virtual to protect the algorithm.' },
    hints: [`<p>Hint 1: <code>protected virtual string Open =&gt; "";</code> etc.</p>`, `<p>Hint 2: Build a <code>List&lt;string&gt;</code>: add Header if non-empty, then each row.</p>`, `<p>Hint 3: JSON row: <code>$"{{\\"name\\":\\"{name}\\",\\"age\\":{age}}}"</code> — double braces print literal braces in an interpolated string.</p>`],
    tests: { sig: 'string string[] -> string', fn: 'ExportAs', cases: [
      [["csv", ["Asha,30", "Ben,25"]], "name,age\nAsha,30\nBen,25"],
      [["json", ["Asha,30", "Ben,25"]], '[{"name":"Asha","age":30},{"name":"Ben","age":25}]'],
      [["md", ["Asha,30"]], "| name | age |\n|---|---|\n| Asha | 30 |"],
      [["csv", []], "name,age"],
      [["json", []], "[]"],
      [["md", []], "| name | age |\n|---|---|"],
      [["json", ["Zed,0"]], '[{"name":"Zed","age":0}]']
    ] },
    solution: {
      approach: `<p>The abstract base fixes the assembly algorithm; subclasses provide only their pieces. Hooks default to empty strings.</p>`,
      code: `public abstract class Exporter
{
    protected virtual string Open => "";
    protected virtual string Close => "";
    protected virtual string Header => "";
    protected abstract string Separator { get; }
    protected abstract string Row(string name, int age);

    public string Export(string[] rows)          // template method: not virtual
    {
        var parts = new List<string>();
        if (Header.Length > 0) parts.Add(Header);
        foreach (var r in rows)
        {
            var p = r.Split(',');
            parts.Add(Row(p[0], int.Parse(p[1])));
        }
        return Open + string.Join(Separator, parts) + Close;
    }
}

public sealed class CsvExporter : Exporter
{
    protected override string Header => "name,age";
    protected override string Separator => "\\n";
    protected override string Row(string name, int age) => $"{name},{age}";
}
public sealed class JsonExporter : Exporter
{
    protected override string Open => "[";
    protected override string Close => "]";
    protected override string Separator => ",";
    protected override string Row(string name, int age) => $"{{\\"name\\":\\"{name}\\",\\"age\\":{age}}}";
}
public sealed class MarkdownExporter : Exporter
{
    protected override string Header => "| name | age |\\n|---|---|";
    protected override string Separator => "\\n";
    protected override string Row(string name, int age) => $"| {name} | {age} |";
}

public class Solution
{
    public static string ExportAs(string format, string[] rows)
    {
        Exporter e = format switch
        {
            "csv" => new CsvExporter(),
            "json" => new JsonExporter(),
            _ => new MarkdownExporter()
        };
        return e.Export(rows);
    }
}`,
      complexity: `<p>O(total row length).</p>`,
      followUps: ['Real CSV must quote fields with commas — which piece changes?', 'Turn the pieces into a strategy record instead of subclasses. Pros and cons?']
    }
  });

  practice.push({
    title: 'Shipping Strategies',
    level: 'Medium', tags: ['strategy', 'composition', 'interface'], companies: ['Amazon', 'FedEx', 'Flipkart'],
    statement: `<p>Define <code>interface IShipping { long Cost(int kg, int km); }</code> and strategies: <code>flat</code> = 500; <code>weight</code> = 100 × kg; <code>distance</code> = max(10 × km, 200); <code>hybrid</code> = the maximum of a weight strategy and a distance strategy (<b>compose</b> the two objects, do not re-implement them); <code>bulk</code> = a weight strategy with 20% off (× 80 / 100) when kg ≥ 50. Implement <code>public static long Cost(string strategy, int kg, int km)</code>.</p>`,
    constraints: `0 ≤ kg, km ≤ 10<sup>6</sup>.`,
    example: `<p>Cost("hybrid", 3, 100) → max(300, 1000) = <b>1000</b>; Cost("bulk", 50, 0) → 5000 × 80 / 100 = <b>4000</b>.</p>`,
    brute: { why: `<p>A switch with copy-pasted formulas: "hybrid" repeats the weight and distance formulas, so changing the distance minimum means editing two places. Composing strategies reuses them.</p>`, code: `static long CostSwitch(string s, int kg, int km) => s switch
{
    "weight" => 100L * kg,
    "hybrid" => Math.Max(100L * kg, Math.Max(10L * km, 200)),   // duplicated formulas
    _ => 500
};` },
    mcq: { q: 'Hybrid needs both formulas. The composition-friendly design is…', options: ['Hybrid : Weight, and copy the distance formula', 'Hybrid holds two IShipping objects and returns the max of their costs', 'A static helper with both formulas', 'Multiple inheritance from Weight and Distance'], answer: 1, explain: 'A combinator strategy that holds other strategies reuses them unchanged and works for any pair (it could be Max(Flat, Distance) tomorrow).' },
    hints: [`<p>Hint 1: <code>sealed class MaxOf(IShipping a, IShipping b) : IShipping</code>.</p>`, `<p>Hint 2: Bulk is a decorator: <code>sealed class BulkDiscount(IShipping inner) : IShipping</code>.</p>`, `<p>Hint 3: Use <code>long</code> multiplication: <code>100L * kg</code>.</p>`],
    tests: { sig: 'string int int -> long', fn: 'Cost', cases: [
      [["flat", 1, 1], 500],
      [["weight", 3, 100], 300],
      [["distance", 3, 5], 200],
      [["distance", 3, 100], 1000],
      [["hybrid", 3, 100], 1000],
      [["hybrid", 30, 10], 3000],
      [["bulk", 50, 0], 4000],
      [["bulk", 49, 0], 4900],
      [["weight", 0, 0], 0],
      [["hybrid", 1000000, 1000000], 100000000]
    ] },
    solution: {
      approach: `<p>Leaf strategies for the basic formulas, a combinator (MaxOf) and a decorator (BulkDiscount) built from them.</p>`,
      code: `public interface IShipping { long Cost(int kg, int km); }

public sealed class Flat : IShipping { public long Cost(int kg, int km) => 500; }
public sealed class ByWeight : IShipping { public long Cost(int kg, int km) => 100L * kg; }
public sealed class ByDistance : IShipping { public long Cost(int kg, int km) => Math.Max(10L * km, 200); }

public sealed class MaxOf(IShipping a, IShipping b) : IShipping
{
    public long Cost(int kg, int km) => Math.Max(a.Cost(kg, km), b.Cost(kg, km));
}
public sealed class BulkDiscount(IShipping inner) : IShipping
{
    public long Cost(int kg, int km)
    {
        long c = inner.Cost(kg, km);
        return kg >= 50 ? c * 80 / 100 : c;
    }
}

public class Solution
{
    public static long Cost(string strategy, int kg, int km)
    {
        IShipping s = strategy switch
        {
            "flat" => new Flat(),
            "weight" => new ByWeight(),
            "distance" => new ByDistance(),
            "hybrid" => new MaxOf(new ByWeight(), new ByDistance()),
            "bulk" => new BulkDiscount(new ByWeight()),
            _ => throw new ArgumentException(strategy)
        };
        return s.Cost(kg, km);
    }
}`,
      complexity: `<p>O(1) per call; each composed strategy adds one interface call.</p>`,
      followUps: ['Load the strategy name from configuration and resolve it through dependency injection (keyed services in .NET 8).', 'Express the same strategies as Func&lt;int, int, long&gt; values. What does the interface version give you that the delegate does not?']
    }
  });

  practice.push({
    title: 'Expression Tree Printer and Evaluator',
    level: 'Hard', tags: ['abstract class', 'composite', 'recursion', 'ToString'], companies: ['Google', 'JetBrains', 'Microsoft'],
    statement: `<p>Parse a <b>prefix</b> expression of space-separated tokens: integers, binary <code>+</code> <code>-</code> <code>*</code>, and unary <code>neg</code>. Build a tree of objects deriving from an abstract <code>Expr</code> with abstract <code>long Eval()</code> and an overridden <code>ToString()</code>: numbers print as themselves, binary nodes as <code>(L op R)</code>, neg as <code>-(X)</code>. Implement <code>public static string Evaluate(string prefix)</code> returning <code>"TEXT = VALUE"</code>.</p>`,
    constraints: `1 ≤ tokens ≤ 1000; the expression is valid; integers are in [0, 10<sup>6</sup>]; intermediate results fit in <code>long</code>.`,
    example: `<p>"+ 1 * 2 3" → "(1 + (2 * 3)) = 7". "- 10 neg 3" → "(10 - -(3)) = 13".</p>`,
    brute: { why: `<p>Evaluating with a stack of numbers works for the value but gives you no structure to print, simplify or reuse. Building objects (an AST) separates parsing from what you do with the tree.</p>`, code: `static long EvalOnly(string[] t, ref int i)
{
    string tok = t[i++];
    return tok switch
    {
        "+" => EvalOnly(t, ref i) + EvalOnly(t, ref i),
        "neg" => -EvalOnly(t, ref i),
        _ => long.Parse(tok)
    };
}` },
    mcq: { q: 'Where does the code that prints "(L op R)" belong?', options: ['In a big switch in Evaluate', 'In each node class\'s ToString override — every node knows how to print itself and asks its children to do the same', 'In the parser', 'In object.ToString'], answer: 1, explain: 'Composite pattern: a node delegates to its children; the recursion is split across the classes.' },
    hints: [`<p>Hint 1: Classes Num, Neg, Bin(char op, Expr l, Expr r) deriving from abstract Expr.</p>`, `<p>Hint 2: Parse recursively with an index: read a token; if it is an operator, parse the needed children; otherwise it is a number.</p>`, `<p>Hint 3: Bin.Eval uses a switch on op; use <code>long</code> everywhere.</p>`],
    tests: { sig: 'string -> string', fn: 'Evaluate', cases: [
      [["+ 1 * 2 3"], "(1 + (2 * 3)) = 7"],
      [["5"], "5 = 5"],
      [["neg 4"], "-(4) = -4"],
      [["- 10 neg 3"], "(10 - -(3)) = 13"],
      [["* + 1 2 - 7 4"], "((1 + 2) * (7 - 4)) = 9"],
      [["* 100000 100000"], "(100000 * 100000) = 10000000000"],
      [["neg neg 0"], "-(-(0)) = 0"],
      [["- - 1 2 3"], "((1 - 2) - 3) = -4"]
    ] },
    solution: {
      approach: `<p>An abstract node type with three concrete subclasses. Each node evaluates and prints itself by delegating to its children. A recursive-descent parser builds the tree from the prefix tokens.</p>`,
      code: `public abstract class Expr
{
    public abstract long Eval();
}
public sealed class Num(long v) : Expr
{
    public override long Eval() => v;
    public override string ToString() => v.ToString();
}
public sealed class Neg(Expr e) : Expr
{
    public override long Eval() => -e.Eval();
    public override string ToString() => $"-({e})";
}
public sealed class Bin(char op, Expr l, Expr r) : Expr
{
    public override long Eval() => op switch
    {
        '+' => l.Eval() + r.Eval(),
        '-' => l.Eval() - r.Eval(),
        _ => l.Eval() * r.Eval()
    };
    public override string ToString() => $"({l} {op} {r})";
}

public class Solution
{
    static Expr Parse(string[] t, ref int i)
    {
        string tok = t[i++];
        switch (tok)
        {
            case "+": case "-": case "*":
                var left = Parse(t, ref i);
                var right = Parse(t, ref i);
                return new Bin(tok[0], left, right);
            case "neg":
                return new Neg(Parse(t, ref i));
            default:
                return new Num(long.Parse(tok));
        }
    }
    public static string Evaluate(string prefix)
    {
        var tokens = prefix.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        int i = 0;
        Expr root = Parse(tokens, ref i);
        return $"{root} = {root.Eval()}";
    }
}`,
      complexity: `<p>O(n) to parse, print and evaluate; recursion depth ≤ n (≤ 1000 frames, well within the 1 MB stack).</p>`,
      followUps: ['Add a Simplify() that folds "neg neg x" to x — virtual method or visitor?', 'Compare with System.Linq.Expressions (module 11), which builds and compiles such trees.']
    }
  });

  practice.push({
    title: 'Directory Sizes with the Composite Pattern',
    level: 'Hard', tags: ['composite', 'abstract class', 'recursion', 'sorting'], companies: ['Dropbox', 'Microsoft', 'Google'],
    statement: `<p>Each entry is <code>"path size"</code> where path is a file path like <code>a/b/c.txt</code>. Build a tree with an abstract <code>Node</code> (abstract <code>long Size</code>), a <code>FileNode</code> and a <code>DirNode</code> holding children (composite). Implement <code>public static string[] DirSizes(string[] files)</code> returning one <code>"DIR SIZE"</code> line per directory — the root as <code>/</code> and others as <code>/a</code>, <code>/a/b</code> — sorted by path with ordinal string comparison.</p>`,
    constraints: `0 ≤ files.Length ≤ 10<sup>4</sup>; path depth ≤ 50; sizes ≤ 10<sup>10</sup>; no path is both a file and a directory.`,
    example: `<p>["a/x.txt 10", "a/b/y.txt 5", "z.txt 1"] → ["/ 16", "/a 15", "/a/b 5"].</p>`,
    brute: { why: `<p>For every directory prefix, scan all files and add those under it: O(D·F·depth). It also never builds a model you can reuse for listing, moving or deleting.</p>`, code: `static long SizeUnder(string dir, string[] files) =>
    files.Select(f => f.Split(' ')).Where(p => ("/" + p[0]).StartsWith(dir == "/" ? "/" : dir + "/")).Sum(p => long.Parse(p[1]));` },
    mcq: { q: 'In the composite pattern, DirNode.Size is…', options: ['Stored and updated by every caller', 'The sum of its children\'s Size, computed through the same abstract member', 'Always zero', 'Looked up in a global dictionary'], answer: 1, explain: 'The client treats files and directories uniformly; a directory just delegates to its children.' },
    hints: [`<p>Hint 1: <code>DirNode</code> has <code>Dictionary&lt;string, Node&gt; Children</code> and <code>Size =&gt; Children.Values.Sum(c =&gt; c.Size)</code>.</p>`, `<p>Hint 2: Insert each file by walking its directory parts, creating DirNodes as needed.</p>`, `<p>Hint 3: Collect directories with a recursive walk carrying the path, then <code>Sort(StringComparer.Ordinal)</code> on the paths.</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'DirSizes', cases: [
      [[["a/x.txt 10", "a/b/y.txt 5", "z.txt 1"]], ["/ 16", "/a 15", "/a/b 5"]],
      [[[]], ["/ 0"]],
      [[["f 7"]], ["/ 7"]],
      [[["a/b/c/d 1", "a/b/e 2", "a/f 3"]], ["/ 6", "/a 6", "/a/b 3", "/a/b/c 1"]],
      [[["x/1 4", "y/1 5", "x/2 6"]], ["/ 15", "/x 10", "/y 5"]],
      [[["a-b/f 1", "a/f 2"]], ["/ 3", "/a 2", "/a-b 1"]],
      [[["d/big 3000000000", "d/big2 3000000000"]], ["/ 6000000000", "/d 6000000000"]]
    ] },
    solution: {
      approach: `<p>Composite tree: files are leaves, directories sum their children. A depth-first walk records each directory's path and size; sorting by ordinal path gives the required order (the root "/" sorts first).</p>`,
      code: `public abstract class Node
{
    public abstract long Size { get; }
}
public sealed class FileNode(long size) : Node
{
    public override long Size => size;
}
public sealed class DirNode : Node
{
    public Dictionary<string, Node> Children { get; } = new();
    public override long Size => Children.Values.Sum(c => c.Size);   // delegate to children

    public DirNode Dir(string name)
    {
        if (!Children.TryGetValue(name, out var n)) Children[name] = n = new DirNode();
        return (DirNode)n;
    }
}

public class Solution
{
    public static string[] DirSizes(string[] files)
    {
        var root = new DirNode();
        foreach (var f in files)
        {
            var sp = f.Split(' ');
            var parts = sp[0].Split('/');
            var dir = root;
            for (int i = 0; i < parts.Length - 1; i++) dir = dir.Dir(parts[i]);
            dir.Children[parts[^1]] = new FileNode(long.Parse(sp[1]));
        }
        var found = new List<(string Path, long Size)>();
        void Walk(DirNode d, string path)
        {
            found.Add((path, d.Size));
            foreach (var (name, child) in d.Children)
                if (child is DirNode sub) Walk(sub, path == "/" ? "/" + name : path + "/" + name);
        }
        Walk(root, "/");
        found.Sort((x, y) => string.CompareOrdinal(x.Path, y.Path));
        return found.Select(x => $"{x.Path} {x.Size}").ToArray();
    }
}`,
      complexity: `<p>Building is O(total path parts). Computing Size on demand for every directory is O(D × subtree size) in the worst case (deep chains); cache sizes in one post-order pass if that matters. Sorting is O(D log D).</p>`,
      followUps: ['Compute all sizes in a single post-order traversal instead of calling Size repeatedly.', 'Add a Visitor that counts files by extension without changing the node classes.']
    }
  });

  practice.push({
    title: 'Middleware Pipeline (Decorators in Order)',
    level: 'Hard', tags: ['decorator', 'chain of responsibility', 'composition'], companies: ['Microsoft', 'Stripe', 'Cloudflare'],
    statement: `<p>Model ASP.NET-style middleware. <code>interface IHandler { void Handle(string request, List&lt;string&gt; log); }</code>. The final handler logs <code>handle REQUEST</code>. Each middleware wraps the next handler and logs <code>enter NAME</code> before and <code>exit NAME</code> after calling it:</p>
<ul><li><code>log</code> — just enter/exit;</li>
<li><code>upper</code> — passes the request upper-cased to the next handler;</li>
<li><code>auth</code> — if the request does not start with <code>user:</code> (case-sensitive) it logs <code>auth denied</code> and does <b>not</b> call the next handler.</li></ul>
<p>The first middleware in the list is the <b>outermost</b>. Implement <code>public static string[] Handle(string[] middlewares, string request)</code> returning the log.</p>`,
    constraints: `0 ≤ middlewares.Length ≤ 50; request is ASCII.`,
    example: `<p>(["upper", "auth"], "user:a") → ["enter upper", "enter auth", ${H.c('r', '"auth denied"')}, "exit auth", "exit upper"] — upper ran first and turned the request into "USER:A", which fails the case-sensitive check. Order matters.</p>`,
    brute: { why: `<p>A loop over the middleware names that applies each "before" step, then the handler, then a second loop backwards for the "after" steps. Short-circuiting (auth) and per-middleware state make that loop a tangle of flags. Nesting objects expresses "around" behaviour directly.</p>`, code: `static List<string> Flat(string[] mw, string req)
{
    var log = new List<string>();
    foreach (var m in mw) log.Add("enter " + m);           // no way to stop early cleanly
    log.Add("handle " + req);
    for (int i = mw.Length - 1; i >= 0; i--) log.Add("exit " + mw[i]);
    return log;
}` },
    mcq: { q: 'To make the first middleware the outermost while wrapping one at a time, iterate the list…', options: ['Forwards, wrapping the current chain each time', 'Backwards: start from the final handler and wrap with the last middleware first', 'In any order', 'Sorted by name'], answer: 1, explain: 'The last wrapper you apply ends up outermost, so wrap from the end of the list to the front.' },
    hints: [`<p>Hint 1: <code>abstract class Middleware(string name, IHandler next) : IHandler</code> with a template <code>Handle</code> that logs enter, calls a virtual <code>Around</code>, logs exit.</p>`, `<p>Hint 2: Build from the end: <code>IHandler h = new Final(); for (int i = mw.Length - 1; i &gt;= 0; i--) h = Make(mw[i], h);</code></p>`, `<p>Hint 3: Auth overrides Around and returns without calling next on failure; enter/exit are still logged by the base.</p>`],
    tests: { sig: 'string[] string -> string[]', fn: 'Handle', cases: [
      [[["log", "upper"], "user:hi"], ["enter log", "enter upper", "handle USER:HI", "exit upper", "exit log"]],
      [[[], "x"], ["handle x"]],
      [[["auth"], "guest:hi"], ["enter auth", "auth denied", "exit auth"]],
      [[["auth", "upper"], "user:a"], ["enter auth", "enter upper", "handle USER:A", "exit upper", "exit auth"]],
      [[["upper", "auth"], "user:a"], ["enter upper", "enter auth", "auth denied", "exit auth", "exit upper"]],
      [[["log", "log"], ""], ["enter log", "enter log", "handle ", "exit log", "exit log"]],
      [[["auth", "log"], "user:"], ["enter auth", "enter log", "handle user:", "exit log", "exit auth"]]
    ] },
    solution: {
      approach: `<p>Each middleware is a decorator over the next IHandler. A small template method in the base logs enter/exit around a virtual step; auth short-circuits by not calling next. Wrapping from the end of the list makes the first name outermost.</p>`,
      code: `public interface IHandler { void Handle(string request, List<string> log); }

public sealed class Final : IHandler
{
    public void Handle(string request, List<string> log) => log.Add("handle " + request);
}

public abstract class Middleware(string name, IHandler next) : IHandler
{
    protected IHandler Next { get; } = next;
    public void Handle(string request, List<string> log)
    {
        log.Add("enter " + name);
        Around(request, log);              // the varying part
        log.Add("exit " + name);
    }
    protected virtual void Around(string request, List<string> log) => Next.Handle(request, log);
}

public sealed class LogMiddleware(IHandler next) : Middleware("log", next) { }

public sealed class UpperMiddleware(IHandler next) : Middleware("upper", next)
{
    protected override void Around(string request, List<string> log) => Next.Handle(request.ToUpperInvariant(), log);
}

public sealed class AuthMiddleware(IHandler next) : Middleware("auth", next)
{
    protected override void Around(string request, List<string> log)
    {
        if (!request.StartsWith("user:", StringComparison.Ordinal)) { log.Add("auth denied"); return; }   // short-circuit
        Next.Handle(request, log);
    }
}

public class Solution
{
    public static string[] Handle(string[] middlewares, string request)
    {
        IHandler pipeline = new Final();
        for (int i = middlewares.Length - 1; i >= 0; i--)
            pipeline = middlewares[i] switch
            {
                "upper" => new UpperMiddleware(pipeline),
                "auth" => new AuthMiddleware(pipeline),
                _ => new LogMiddleware(pipeline)
            };
        var log = new List<string>();
        pipeline.Handle(request, log);
        return log.ToArray();
    }
}`,
      complexity: `<p>O(m) to build and O(m + |request|·u) to run, where u is the number of upper middlewares.</p>`,
      followUps: ['ASP.NET Core builds the same chain from Func&lt;RequestDelegate, RequestDelegate&gt; — rewrite this with delegates.', 'Add an exception-handling middleware that catches failures from inner layers and logs "error".']
    }
  });

  practice.push({
    title: 'Collisions with Double Dispatch',
    level: 'Hard', tags: ['double dispatch', 'virtual', 'visitor'], companies: ['Unity', 'Epic Games', 'Microsoft'],
    statement: `<p>Game objects <code>Asteroid</code>, <code>Ship</code> and <code>Station</code> derive from an abstract <code>Body</code>. The result of a collision depends on <b>both</b> runtime types (symmetric):</p>
${H.table(['pair', 'result'], [['Asteroid–Asteroid', 'bounce'], ['Asteroid–Ship', 'ship damaged'], ['Asteroid–Station', 'station dented'], ['Ship–Ship', 'dock'], ['Ship–Station', 'ship docks at station'], ['Station–Station', 'impossible']])}
<p>Implement it with <b>double dispatch</b>: <code>a.CollideWith(b)</code> is virtual on a, and calls a second virtual method on b that knows a's concrete type (e.g. <code>b.HitBy(this)</code> with overloads). Then implement <code>public static string[] Collide(string[] pairs)</code> where each pair is <code>"TypeA TypeB"</code>; an unknown type name gives <code>unknown</code>.</p>`,
    constraints: `0 ≤ pairs.Length ≤ 10<sup>4</sup>.`,
    example: `<p>["Asteroid Ship", "Ship Asteroid"] → ["ship damaged", "ship damaged"].</p>`,
    brute: { why: `<p><code>if (a is Asteroid &amp;&amp; b is Ship) … else if …</code> for all nine ordered pairs. It works but every new body type adds a row for every existing type in one giant method. (Module 7's tuple pattern matching makes this tidier, and it is a valid modern alternative — but double dispatch is the classic OOP answer interviewers ask about.)</p>`, code: `abstract class Body { }
sealed class Asteroid : Body { }
sealed class Ship : Body { }

static string Brute(Body a, Body b)
{
    if (a is Asteroid && b is Ship || a is Ship && b is Asteroid) return "ship damaged";
    return "bounce";   // ...and seven more branches
}` },
    mcq: { q: 'C# picks a method overload using…', options: ['The runtime types of the arguments', 'The compile-time types of the arguments; only the receiver of a virtual call is dispatched at run time', 'Random choice', 'The order of declaration'], answer: 1, explain: 'That is why a single virtual call cannot see both runtime types: the second dispatch happens when the first override calls back with <code>this</code>, whose static type is now concrete.' },
    hints: [`<p>Hint 1: <code>abstract class Body { public abstract string CollideWith(Body other); public abstract string HitBy(Asteroid a); public abstract string HitBy(Ship s); public abstract string HitBy(Station s); }</code></p>`, `<p>Hint 2: In Asteroid: <code>public override string CollideWith(Body other) =&gt; other.HitBy(this);</code> — inside Asteroid, <code>this</code> has static type Asteroid, so the right overload is chosen.</p>`, `<p>Hint 3: Each class answers the three HitBy cases; keep the table symmetric.</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'Collide', cases: [
      [[["Asteroid Ship"]], ["ship damaged"]],
      [[["Ship Asteroid"]], ["ship damaged"]],
      [[[]], []],
      [[["Station Station", "Ship Ship"]], ["impossible", "dock"]],
      [[["Asteroid Asteroid", "Asteroid Station", "Station Asteroid"]], ["bounce", "station dented", "station dented"]],
      [[["Ship Station", "Station Ship", "Comet Ship"]], ["ship docks at station", "ship docks at station", "unknown"]],
      [[["Ship Comet", "Asteroid Asteroid"]], ["unknown", "bounce"]]
    ] },
    solution: {
      approach: `<p>First dispatch: the virtual <code>CollideWith</code> on the left body. Inside each override, <code>this</code> has a concrete static type, so calling <code>other.HitBy(this)</code> picks the right overload at compile time and then dispatches virtually on <code>other</code> — the second dispatch.</p>`,
      code: `public abstract class Body
{
    public abstract string CollideWith(Body other);
    public abstract string HitBy(Asteroid a);
    public abstract string HitBy(Ship s);
    public abstract string HitBy(Station s);
}

public sealed class Asteroid : Body
{
    public override string CollideWith(Body other) => other.HitBy(this);   // this : Asteroid
    public override string HitBy(Asteroid a) => "bounce";
    public override string HitBy(Ship s) => "ship damaged";
    public override string HitBy(Station s) => "station dented";
}

public sealed class Ship : Body
{
    public override string CollideWith(Body other) => other.HitBy(this);   // this : Ship
    public override string HitBy(Asteroid a) => "ship damaged";
    public override string HitBy(Ship s) => "dock";
    public override string HitBy(Station s) => "ship docks at station";
}

public sealed class Station : Body
{
    public override string CollideWith(Body other) => other.HitBy(this);   // this : Station
    public override string HitBy(Asteroid a) => "station dented";
    public override string HitBy(Ship s) => "ship docks at station";
    public override string HitBy(Station s) => "impossible";
}

public class Solution
{
    static Body? Make(string name) => name switch
    {
        "Asteroid" => new Asteroid(),
        "Ship" => new Ship(),
        "Station" => new Station(),
        _ => null
    };
    public static string[] Collide(string[] pairs)
    {
        var result = new List<string>();
        foreach (var pair in pairs)
        {
            var p = pair.Split(' ');
            Body? a = Make(p[0]), b = Make(p[1]);
            result.Add(a is null || b is null ? "unknown" : a.CollideWith(b));
        }
        return result.ToArray();
    }
}`,
      complexity: `<p>O(1) per pair: two virtual calls.</p>`,
      followUps: ['Rewrite with a switch on the tuple <code>(a, b) switch { (Asteroid, Ship) or (Ship, Asteroid) =&gt; … }</code>. When is each style better?', 'How does the Visitor pattern generalise this to many operations over a fixed set of types?']
    }
  });

  /* ============================ QUIZ ============================ */
  quiz.push(
    { q: 'In C#, instance methods are…', options: ['virtual by default, like Java', 'non-virtual by default; you opt in with <code>virtual</code>', 'always sealed', 'virtual only inside abstract classes'], answer: 1, explain: 'C# requires <code>virtual</code> on the base and <code>override</code> in the derived class. A same-named method without override hides the base one (warning CS0108).' },
    { q: '<code>class B : A</code>; A has only <code>A(int x)</code>. What happens with <code>class B : A { public B() { } }</code>?', options: ['Compiles; x defaults to 0', 'Compile error CS7036: B must call <code>: base(someInt)</code>', 'Runtime exception', 'Compiles and A\'s constructor is skipped'], answer: 1, explain: 'The compiler inserts <code>: base()</code> when you write no chain, and A has no parameterless constructor.' },
    { q: 'Order when <code>new Derived()</code> runs:', options: ['base ctor body, base initialisers, derived initialisers, derived body', 'derived field initialisers, base field initialisers, base ctor body, derived ctor body', 'derived body first', 'all initialisers after all bodies'], answer: 1, explain: 'C# runs field initialisers before chaining to the base constructor, most-derived first. Java runs base construction first.' },
    { q: 'Animal.Speak is virtual, Dog overrides it, Puppy : Dog declares <code>public new string Speak()</code>. <code>Animal a = new Puppy(); a.Speak()</code> runs…', options: ['Puppy.Speak', 'Dog.Speak', 'Animal.Speak', 'It does not compile'], answer: 1, explain: 'The virtual slot holds the most-derived <i>override</i>, which is Dog\'s; Puppy\'s method is a separate, hiding method visible only through Puppy-typed references.' },
    { q: 'What does <code>sealed override</code> do?', options: ['Makes the class sealed', 'Overrides the method and prevents further overriding in derived classes', 'Hides the base method', 'Makes the method static'], answer: 1, explain: 'It closes that virtual chain below this class; the class itself can still be inherited.' },
    { q: 'Which can an abstract class have that an interface cannot?', options: ['Methods with bodies', 'Static members', 'Instance fields and instance constructors', 'Properties'], answer: 2, explain: 'Since C# 8 interfaces can have default method bodies and static members, but never instance fields or instance constructors.' },
    { q: '<code>interface ILog { void Log(string m); void Warn(string m) =&gt; Log("W:" + m); }</code>, <code>class C : ILog { public void Log(string m) {} }</code>. Which line fails to compile?', options: ['<code>ILog x = new C(); x.Warn("a");</code>', '<code>new C().Log("a");</code>', '<code>new C().Warn("a");</code>', '<code>((ILog)new C()).Warn("a");</code>'], answer: 2, explain: 'A default interface method is not a member of the class, so it is reachable only through the interface type.' },
    { q: 'An explicitly implemented member <code>double ICelsius.Read()</code> can be called…', options: ['Only through an ICelsius reference', 'On any Thermo variable', 'Only from derived classes', 'Never'], answer: 0, explain: 'Explicit implementations are private in IL and mapped only into the interface\'s slot.' },
    { q: 'You override Equals but not GetHashCode. What breaks?', options: ['Nothing', 'Hash-based collections (HashSet, Dictionary keys) treat equal objects as different', 'ToString', 'The == operator'], answer: 1, explain: 'Hash collections compare hash codes first; equal objects must have equal hashes (CS0659 warns you).' },
    { q: 'For two class instances with the same data and no operator overload, <code>a == b</code> is…', options: ['true', 'false — it compares references', 'a compile error', 'the same as Equals'], answer: 1, explain: 'Without an overload, == on reference types is reference equality. Records and string overload it.' },
    { q: 'Which member of <code>object</code> cannot be overridden?', options: ['ToString', 'Equals', 'GetHashCode', 'GetType'], answer: 3, explain: 'GetType is non-virtual and always returns the exact runtime type.' },
    { q: 'Adding logging around an existing <code>IRepository</code> without editing it is best done with…', options: ['A subclass of each repository', 'A decorator that implements IRepository and wraps another IRepository', 'Copying the code', 'A static helper'], answer: 1, explain: 'A decorator composes behaviour and works with every implementation of the interface.' },
    { q: 'Why does double dispatch need two virtual calls in C#?', options: ['Overloads are chosen from compile-time argument types, so one virtual call can only see the receiver\'s runtime type', 'C# has no overloading', 'For performance', 'Because interfaces cannot have overloads'], answer: 0, explain: 'The first call dispatches on the receiver; it then calls back with <code>this</code>, whose static type is concrete, so the overload and the second virtual dispatch pick the right pair.' }
  );

  /* ============================ INTERVIEW ============================ */
  interview.push(
    { q: 'What is the difference between <code>override</code> and <code>new</code> on a method?', level: 'B', a: `<p><code>override</code> replaces the implementation in the base class's <b>virtual slot</b>, so every call through a base-typed reference reaches the new code (runtime polymorphism). <code>new</code> declares a <b>separate</b> method that hides the inherited one; which one runs depends on the <b>static type</b> of the variable. Example: <code>Animal a = new Puppy()</code> calls Dog's override if Puppy used <code>new</code>. Omitting both gives warning CS0108 and behaves like <code>new</code> — usually a bug.</p>`, followUps: ['When is method hiding legitimately useful? (changing a return type in a derived API, versioning)', 'What does the compiler emit for each — call or callvirt, and which slot?'] },
    { q: 'Abstract class or interface — how do you choose?', level: 'B', a: `<p>Use an <b>interface</b> for a capability that unrelated types can share and when a type may need several (<code>IComparable</code>, <code>IDisposable</code>); it is also the natural seam for testing and DI. Use an <b>abstract class</b> when subclasses are true specialisations that share <b>state, constructors and implementation</b> (a template method), and you want to add non-abstract members later without breaking them. Default interface methods blur the line but do not give interfaces fields or constructors. Often the best answer is both: an interface for consumers plus an abstract base class that implements it for convenience.</p>`, followUps: ['How do default interface methods change this answer?', 'Why does a class get only one base class but many interfaces?'] },
    { q: 'Explain the order of construction for a derived class in C# and why calling virtual methods from constructors is dangerous.', level: 'I', a: `<p>For <code>new Derived()</code>: Derived's field initialisers run, then the chained base constructor (Base's field initialisers, then Base's constructor body), then Derived's constructor body. The object's runtime type is Derived from the start, so a virtual call made inside Base's constructor dispatches to Derived's override — which runs <b>before Derived's constructor body</b>, seeing any fields that body would set as default/null. C# is slightly safer than Java because derived <i>initialisers</i> have already run, but constructor-body assignments have not. Rule: do not call overridable members from constructors; use a factory or a non-virtual initialisation step.</p>`, followUps: ['How do primary constructor parameters behave here?', 'What does Java print for the same program?'] },
    { q: 'Why should you override GetHashCode when you override Equals? What makes a good hash?', level: 'I', a: `<p>Hash-based collections find a bucket by hash first and only then call Equals within the bucket. If two equal objects have different hashes they go to different buckets and are never compared, so a <code>HashSet</code> stores "duplicates" and dictionary lookups miss. The contract: equal objects ⇒ equal hashes. A good hash uses <b>the same fields as Equals</b>, only <b>immutable</b> fields, and mixes them well — <code>HashCode.Combine(a, b, c)</code> does this with a per-process random seed. Never persist hash codes.</p>`, followUps: ['What happens if a key\'s hashed field changes while it is in a HashSet?', 'Why are default struct Equals/GetHashCode slow or weak?'] },
    { q: 'What is explicit interface implementation and when would you use it?', level: 'I', a: `<p>Writing the member as <code>ReturnType IInterface.Member(...)</code> with no access modifier. It is only callable through the interface type. Uses: (1) two interfaces with the same signature but different meanings; (2) hiding required-but-noisy members such as the non-generic <code>IEnumerable.GetEnumerator()</code> or <code>ICollection&lt;T&gt;.IsReadOnly</code>; (3) exposing a more specific public return type while satisfying the interface. Caveats: the member cannot be virtual (forward to a protected virtual method instead), and calling it on a struct via a cast boxes a copy.</p>`, followUps: ['How can a subclass customise an explicitly implemented member?', 'How does a generic constraint avoid the boxing?'] },
    { q: '"Favour composition over inheritance." Explain with an example.', level: 'I', a: `<p>Inheritance couples the subclass to the base class's internals and fixes behaviour at compile time; combining independent variations (format × destination × buffering) produces a class explosion. Composition holds collaborators behind small interfaces and delegates: a <code>Checkout</code> has an <code>IShipping</code> strategy that can be swapped at run time, and cross-cutting behaviour (logging, caching, retry) is added by decorators that implement the same interface. Tests inject fakes. Inheritance still fits stable IS-A relationships and framework extension points. A classic smell: inheriting <code>List&lt;T&gt;</code> to build a Stack and leaking Insert/RemoveAt.</p>`, followUps: ['What are the costs of composition?', 'How do DI containers help manage decorators?'] },
    { q: 'What does <code>sealed</code> buy you, both for design and performance?', level: 'I', a: `<p><b>Design:</b> a sealed class cannot be derived from, so its invariants and behaviour cannot be altered by a subclass, and you avoid the fragile-base-class problem; <code>sealed override</code> stops a virtual chain below a given class. <b>Performance:</b> the JIT can devirtualise calls on a sealed type (and inline them), type checks (<code>is</code>, casts) against a sealed type are a single method-table comparison, and array covariance checks are cheaper. .NET's analyzer CA1852 suggests sealing internal types that have no subclasses. Seal by default; unseal deliberately when you design for extension.</p>`, followUps: ['Why are records not sealed by default?', 'What is guarded devirtualisation with Dynamic PGO?'] },
    { q: 'How does a virtual call actually work in the CLR?', level: 'A', a: `<p>Every object starts with a pointer to its type's <b>MethodTable</b>. Virtual methods occupy numbered slots; a derived type copies the parent's slots and replaces those it overrides. A virtual call loads the MethodTable pointer from the object, loads the slot (often via a chunk indirection), and calls through it. The C# compiler emits <code>callvirt</code> for instance calls (also for the free null check). Interface calls use <b>virtual stub dispatch</b> with per-call-site caching. The JIT can devirtualise when the exact type is known (sealed types, freshly allocated objects) and, with Dynamic PGO in .NET 8, guard on the hot type and inline it.</p>`, followUps: ['Why does base.Method() compile to call instead of callvirt?', 'What does new virtual do to the slot layout?'] },
    { q: 'What problems do default interface methods solve, and what are their limitations?', level: 'A', a: `<p>They let a library <b>add members to a published interface</b> without breaking every implementer, and enable trait-like reuse of behaviour expressed purely in terms of other interface members. Limitations: they need .NET Core 3.0+ runtime support; they cannot use instance state (no fields); implementing classes do not inherit them as class members, so they are reachable only through the interface; there is no syntax to call the default from an overriding class; and conflicting defaults from two interfaces (diamond) force the class to implement the member explicitly. Overusing them turns interfaces into hidden base classes.</p>`, followUps: ['How would you call the default implementation from a class that overrides it?', 'How do static abstract members differ?'] },
    { q: 'Describe the Liskov Substitution Principle with a C# example of a violation.', level: 'A', a: `<p>Subtypes must be usable wherever the base type is expected without changing the correctness of the program — preconditions cannot be strengthened, postconditions cannot be weakened, invariants must hold. Violation: <code>Square : Rectangle</code> with settable Width and Height. Code that sets Width = 5, Height = 4 and expects Area 20 gets 16 from a Square. Another: a <code>ReadOnlyList : List&lt;T&gt;</code> whose Add throws <code>NotSupportedException</code> — callers of List do not expect that. In the BCL, arrays implementing <code>IList&lt;T&gt;</code> but throwing on Add is a well-known compromise. Fixes: immutability, separate abstractions, or composition.</p>`, followUps: ['Is array covariance (string[] as object[]) an LSP problem?', 'How do read-only interfaces like IReadOnlyList&lt;T&gt; help?'] },
    { q: 'What is double dispatch and how would you implement it in C#? Compare with pattern matching.', level: 'A', a: `<p>Choosing behaviour by the runtime types of <b>two</b> objects. C# overload resolution uses compile-time argument types, and virtual dispatch only considers the receiver, so one call is not enough. Classic solution: <code>a.CollideWith(b)</code> is virtual; each override calls <code>b.HitBy(this)</code>, where <code>this</code> has a concrete static type, selecting an overload that is itself virtual on b (this is the Visitor pattern's mechanism). Modern alternative: <code>(a, b) switch { (Asteroid, Ship) or (Ship, Asteroid) =&gt; … }</code>, which is shorter and keeps the table in one place but loses the compiler's "every class handles every case" guarantee for open hierarchies. <code>dynamic</code> also does runtime overload resolution, at a cost.</p>`, followUps: ['When would you choose Visitor over a switch expression?', 'What does dynamic do at run time?'] },
    { q: 'How do records change the story for Equals, GetHashCode, ToString and inheritance?', level: 'I', a: `<p>A <code>record</code> (class) gets compiler-generated value equality over all fields, <code>==</code>/<code>!=</code>, <code>IEquatable&lt;T&gt;</code>, GetHashCode, a readable ToString via <code>PrintMembers</code>, and <code>with</code> support. Records can inherit only from records; to keep equality symmetric across a hierarchy, the compiler adds a virtual <code>EqualityContract</code> (the runtime Type) that must match. You can override ToString or PrintMembers, and supply your own <code>Equals(R? other)</code>. A <code>record struct</code> does the same for value types without the inheritance part.</p>`, followUps: ['Why may a record with a List&lt;T&gt; property still give surprising equality?', 'Can you seal ToString in a record?'] },
    { q: 'You are designing a plug-in system for payment providers. Walk through the OOP design.', level: 'E', a: `<p>Define a small <code>IPaymentProvider</code> interface (Authorise, Capture, Refund returning result objects, not exceptions for expected declines). Providers implement it in separate assemblies and are registered by key (.NET 8 keyed DI services) or discovered via an attribute and reflection. Cross-cutting concerns — logging, retries with idempotency keys, metrics, circuit breaking — are <b>decorators</b> around the interface, so providers stay focused. Shared plumbing (HTTP client setup, signing) can live in an optional abstract base class that implements the interface. Seal concrete providers. Keep provider-specific options in typed option classes. Version the interface carefully: add members with default implementations or via a new interface (<code>IPaymentProvider2</code>) rather than breaking implementers.</p>`, followUps: ['How do you test a decorator chain?', 'How would you add a provider-specific feature that others do not support (capability interfaces)?'] },
    { q: 'What are the hidden costs of deep inheritance hierarchies in a large C# codebase?', level: 'E', a: `<p>(1) <b>Fragile base class</b>: changes to protected members or to the order of virtual calls in a base break unknown subclasses. (2) <b>Comprehension</b>: to know what <code>Save()</code> does you read five classes, with overrides calling base at different points. (3) <b>Testing</b>: you cannot test a level in isolation. (4) <b>Rigidity</b>: one inheritance slot is spent; new axes of variation cause class explosions. (5) <b>Performance</b> is a minor factor (unsealed virtual calls, larger objects). Mitigations: max one or two levels, seal leaf classes, prefer composition for behaviour variation, keep protected surface minimal and documented, and use analyzers to flag virtual calls in constructors.</p>`, followUps: ['How would you refactor a 5-level hierarchy incrementally?', 'Where in the .NET BCL is deep inheritance used successfully, and why does it work there? (Stream, Exception)'] }
  );

  registerModule({
    id: 'csharp04',
    title: 'OOP: Inheritance, Interfaces & Polymorphism',
    intro: `<p>This module turns classes into <b>designs</b>. You will build hierarchies with <code>: base(...)</code> chaining, decide between <code>virtual</code>/<code>override</code>, <code>new</code> and <code>sealed</code>, use abstract classes for template methods, define interfaces (including C# 8 default methods and explicit implementations), override the <code>object</code> methods correctly, and — just as important — learn when to stop inheriting and compose objects instead. Every topic comes with a visualizer that shows what the compiler and the CLR actually do, and every problem is a runnable C# 12 design checked by tests.</p>`,
    goals: [
      'Write derived classes with correct constructor chaining and predict the construction order',
      'Predict exactly which method runs for override, new and sealed, from static and runtime types',
      'Use abstract classes and template methods, and choose between them and interfaces',
      'Implement interfaces, default interface methods and explicit implementations, and know where each is callable',
      'Override ToString, Equals and GetHashCode correctly and explain the equality contract',
      'Refactor inheritance into strategies and decorators, and implement double dispatch'
    ],
    prereqs: `C# 3 (Classes, Structs &amp; Records): constructors, properties, static members, records and equality. You should be comfortable writing a class with a constructor and a few properties.`,
    hours: 14,
    topics: topics, practice: practice, quiz: quiz, interview: interview
  });
})();
