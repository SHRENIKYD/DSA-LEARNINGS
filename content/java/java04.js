(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------------- shared little helpers for the visualizers ---------------- */
  function one(k, cls) { var h = {}; h[k] = cls; return h; }
  function esc(s) { return H.esc(String(s)); }
  function out(text) {
    return { type: 'text', label: 'Console output', html: text ? '<code>' + esc(text).replace(/\n/g, '<br>') + '</code>' : '<span class="c-m">(nothing printed yet)</span>' };
  }
  function note(label, htmlText) { return { type: 'text', label: label, html: htmlText }; }
  /* Turns a list of steps into frames for a fixed code listing.
     step = { l: line | [lines], cls, v: {vars}, hv: {name: cls}, vl: 'vars label', st: [call stack], out: 'console', extra: [parts], narr } */
  function codeFrames(code, steps, label) {
    return steps.map(function (s) {
      var hl = {};
      [].concat(s.l === undefined ? [] : s.l).forEach(function (n) { hl[n] = s.cls || 'cur'; });
      var parts = [{ type: 'code', label: label || 'Code (highlighted line = running now)', lang: 'java', code: code, hl: hl }];
      if (s.v) parts.push({ type: 'vars', label: s.vl || 'Variables', vals: s.v, hl: s.hv || {} });
      if (s.st) parts.push({ type: 'stack', label: 'Call stack (top = running now)', items: s.st.slice(), hl: one(s.st.length - 1, 'cur') });
      if (s.out !== undefined) parts.push(out(s.out));
      (s.extra || []).forEach(function (p) { parts.push(p); });
      return { narr: s.narr, parts: parts };
    });
  }
  /* A class-hierarchy diagram. nodes: [{id,label,x,y,w?}] ; edges: [[child,parent,label]] (arrow points to the parent, like UML). */
  function hier(label, nodes, edges, hl, ehl, tags, height) {
    return {
      type: 'graph', label: label, directed: true, height: height || 60,
      nodes: nodes.map(function (n) { return { id: n.id, label: n.label || n.id, x: n.x, y: n.y, shape: 'box', w: n.w }; }),
      edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {}
    };
  }
  function cleanWord(input, def) {
    var s = String(input === undefined || input === null ? def : input).trim();
    return s;
  }

  /* ======================================================================
     TOPIC 1 — Encapsulation
     ====================================================================== */
  topics.push({
    title: 'Encapsulation: Private Data, Public Behaviour, Guarded Invariants',
    analogy: `<p>Think of a <b>bank counter</b>. You never walk into the vault and grab cash yourself. You hand a slip to the cashier (a <b>public method</b>), the cashier <b>checks</b> it ("Do you have enough money? Is this amount positive?") and only then touches the money (the <b>private field</b>). The vault is hidden; the counter is the only door. If the bank renovates the vault — new lockers, new layout — customers do not notice, because they only ever talk to the counter. That is encapsulation: <b>hide the data, expose safe actions, and let the object protect its own rules</b>.</p>`,
    explain: `<p><b>Encapsulation</b> means bundling an object's data (fields) together with the code that works on that data (methods), and <b>hiding</b> the data so outside code can only change it through methods you control.</p>
      <p>In Java you do it with <b>access modifiers</b>:</p>
      ${H.table(['Modifier', 'Same class', 'Same package', 'Subclass (other package)', 'Everyone'], [
        ['<code>private</code>', H.c('g', 'yes'), H.c('r', 'no'), H.c('r', 'no'), H.c('r', 'no')],
        ['<i>(none)</i> = package-private', H.c('g', 'yes'), H.c('g', 'yes'), H.c('r', 'no'), H.c('r', 'no')],
        ['<code>protected</code>', H.c('g', 'yes'), H.c('g', 'yes'), H.c('g', 'yes') + ' (through inheritance)', H.c('r', 'no')],
        ['<code>public</code>', H.c('g', 'yes'), H.c('g', 'yes'), H.c('g', 'yes'), H.c('g', 'yes')]
      ])}
      <p>The recipe for a well-encapsulated class:</p>
      <ol>
        <li>Make fields <code>private</code> (and <code>final</code> when they never change).</li>
        <li>Validate everything in the <b>constructor</b> so an object can never be born broken.</li>
        <li>Offer <b>behaviour</b> methods (<code>deposit</code>, <code>withdraw</code>) instead of raw setters (<code>setBalance</code>). This is called <i>"tell, don't ask"</i>.</li>
        <li>Never hand out a reference to an internal <b>mutable</b> object (a list, an array, a <code>Date</code>). Return a copy or a read-only view.</li>
      </ol>
      <p>The rule the class protects is called an <b>invariant</b> — something that is always true, e.g. <i>"balance is never negative"</i>. If the field were <code>public</code>, any line anywhere in a 500,000-line codebase could write <code>acct.balance = -999</code>. With <code>private</code>, only the ~20 lines inside <code>BankAccount</code> can, so you only have to check those 20 lines.</p>
      <p><b>Common myth:</b> "private field + getter + setter = encapsulation". Not really. A public <code>setBalance(long)</code> with no checks is just a public field wearing a costume. Encapsulation is about <b>protecting rules</b>, not about typing <code>get</code>/<code>set</code>.</p>`,
    clues: [
      '"Design a class so that the balance can <b>never go negative</b>" → private field + guarded methods',
      '"Why make fields private if we add getters and setters anyway?" → invariants, validation, freedom to change the internals',
      '"The caller changed our internal list" / "leaking internal state" → defensive copy or unmodifiable view',
      '"Difference between encapsulation and abstraction" → hiding <i>data</i> vs hiding <i>complexity</i>',
      '"Make this class immutable / thread-safe" → encapsulation is the first step (private final fields, no setters)',
      '"Data hiding", "information hiding", "access modifiers", "tell, don\'t ask"'
    ],
    code: [`
      import java.util.*;

      public class BankAccount {
          // private: only code inside BankAccount can read or write these
          private final String owner;          // final: set once, never changes
          private long balancePaise;           // whole paise/cents avoids floating-point rounding bugs
          private final List<String> history = new ArrayList<>();

          public BankAccount(String owner, long openingPaise) {
              // validate in the constructor: an object can never be born broken
              if (owner == null || owner.isBlank()) throw new IllegalArgumentException("owner required");
              if (openingPaise < 0) throw new IllegalArgumentException("opening balance cannot be negative");
              this.owner = owner;
              this.balancePaise = openingPaise;
              history.add("OPEN " + openingPaise);
          }

          // behaviour method instead of setBalance(): the class enforces its own rules
          public void deposit(long paise) {
              if (paise <= 0) throw new IllegalArgumentException("deposit must be positive");
              balancePaise += paise;
              history.add("DEP " + paise);
          }

          // returns false instead of letting the invariant "balance >= 0" break
          public boolean withdraw(long paise) {
              if (paise <= 0 || paise > balancePaise) return false;
              balancePaise -= paise;
              history.add("WD " + paise);
              return true;
          }

          public long getBalancePaise() { return balancePaise; }
          public String getOwner() { return owner; }

          // read-only VIEW: callers can look, but add()/remove() throw UnsupportedOperationException
          public List<String> getHistory() { return Collections.unmodifiableList(history); }

          public static void main(String[] args) {
              BankAccount a = new BankAccount("Asha", 10_000);
              a.deposit(5_000);
              System.out.println(a.withdraw(20_000));   // false: would go negative
              System.out.println(a.withdraw(3_000));    // true
              System.out.println(a.getBalancePaise());  // 12000
              System.out.println(a.getHistory());       // [OPEN 10000, DEP 5000, WD 3000]
              // a.balancePaise = -1;  // compile error: balancePaise has private access in BankAccount
          }
      }`],
    codeTitle: ['A properly encapsulated BankAccount (runnable main)'],
    viz: {
      title: 'Only the counter touches the vault: operations on a private balance',
      input: 'deposit 500, withdraw 200, withdraw 900, deposit -50, balance = 0',
      inputLabel: 'Operations separated by commas: deposit N, withdraw N, balance = N (a direct field write)',
      gen: function (input) {
        var code = [
          'class BankAccount {',
          '    private long balance;                       // hidden: only this class can touch it',
          '    private final List<String> log = new ArrayList<>();',
          '',
          '    public void deposit(long amt) {',
          '        if (amt <= 0) throw new IllegalArgumentException("amount must be > 0");',
          '        balance += amt;',
          '        log.add("+" + amt);',
          '    }',
          '    public boolean withdraw(long amt) {',
          '        if (amt <= 0 || amt > balance) return false;  // guard keeps balance >= 0',
          '        balance -= amt;',
          '        log.add("-" + amt);',
          '        return true;',
          '    }',
          '    public long getBalance() { return balance; }',
          '}',
          '// outside the class:  acct.balance = ...;   <- not allowed'
        ].join('\n');
        var raw = String(input === undefined || input === null ? '' : input).trim();
        if (!raw) throw new Error('Type operations like: deposit 500, withdraw 200, balance = 0');
        var ops = raw.split(/[,;\n]+/).map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
        if (ops.length > 8) throw new Error('Use at most 8 operations');
        var parsed = ops.map(function (s) {
          var m = s.match(/^(deposit|withdraw)\s+(-?\d{1,9})$/);
          if (m) return { kind: m[1], amt: Number(m[2]) };
          var f = s.match(/^balance\s*=\s*(-?\d{1,9})$/);
          if (f) return { kind: 'field', amt: Number(f[1]) };
          throw new Error('Could not read "' + s + '". Use: deposit 500, withdraw 200, balance = 0');
        });
        var bal = 0, log = [], frames = [];
        function state(hlKey) {
          return [
            { type: 'vars', label: 'acct (inside the object — private)', vals: { balance: bal, 'log size': log.length }, hl: hlKey ? one(hlKey, hlKey === 'balance' ? 'ok' : 'cur') : {} },
            { type: 'array', label: 'log (private list)', values: log.length ? log.slice() : ['(empty)'] }
          ];
        }
        frames.push({ narr: 'A new <code>BankAccount</code> starts with <b>balance = 0</b>. The field is <code>private</code>, so the <b>only</b> doors into it are the public methods. Let us try your operations one by one.', parts: [{ type: 'code', label: 'BankAccount', lang: 'java', code: code, hl: { 2: 'sel' } }].concat(state()) });
        parsed.forEach(function (op) {
          if (op.kind === 'field') {
            frames.push({ narr: '<code>acct.balance = ' + op.amt + ';</code> from <b>outside</b> the class → <span class="c-r">compile error: balance has private access in BankAccount</span>. The program never even runs this line, so the invariant cannot be broken by a stray assignment.', parts: [{ type: 'code', label: 'BankAccount', lang: 'java', code: code, hl: { 2: 'bad', 18: 'bad' } }].concat(state()) });
            return;
          }
          if (op.kind === 'deposit') {
            if (op.amt <= 0) {
              frames.push({ narr: '<code>deposit(' + op.amt + ')</code>: the guard on line 6 sees a non-positive amount and <span class="c-r">throws IllegalArgumentException</span>. Balance stays <b>' + bal + '</b>. The object refused bad input instead of silently corrupting itself.', parts: [{ type: 'code', label: 'BankAccount', lang: 'java', code: code, hl: { 5: 'cur', 6: 'bad' } }].concat(state()) });
            } else {
              frames.push({ narr: '<code>deposit(' + op.amt + ')</code>: the guard on line 6 passes (amount is positive).', parts: [{ type: 'code', label: 'BankAccount', lang: 'java', code: code, hl: { 5: 'cur', 6: 'ok' } }].concat(state()) });
              bal += op.amt; log.push('+' + op.amt);
              frames.push({ narr: 'Lines 7–8 update the private balance to <b>' + bal + '</b> and record the action in the private log. Only <i>this</i> class wrote to the field.', parts: [{ type: 'code', label: 'BankAccount', lang: 'java', code: code, hl: { 7: 'ok', 8: 'ok' } }].concat(state('balance')) });
            }
            return;
          }
          if (op.amt <= 0 || op.amt > bal) {
            frames.push({ narr: '<code>withdraw(' + op.amt + ')</code>: ' + (op.amt <= 0 ? 'amount is not positive' : 'asking for ' + op.amt + ' but balance is only ' + bal) + ' → the guard on line 11 <span class="c-r">returns false</span>. Balance stays <b>' + bal + '</b>. This single line is what keeps "balance ≥ 0" true forever.', parts: [{ type: 'code', label: 'BankAccount', lang: 'java', code: code, hl: { 10: 'cur', 11: 'bad' } }].concat(state()) });
          } else {
            bal -= op.amt; log.push('-' + op.amt);
            frames.push({ narr: '<code>withdraw(' + op.amt + ')</code>: guard passes, lines 12–14 subtract and log, then <span class="c-g">return true</span>. New balance <b>' + bal + '</b>.', parts: [{ type: 'code', label: 'BankAccount', lang: 'java', code: code, hl: { 11: 'ok', 12: 'ok', 13: 'ok', 14: 'ok' } }].concat(state('balance')) });
          }
        });
        frames.push({ narr: 'Finished. Final balance <b>' + bal + '</b> — and it is <b>guaranteed</b> not negative, because every write went through a guarded method. Outside code can read it only via <code>getBalance()</code>.', parts: [{ type: 'code', label: 'BankAccount', lang: 'java', code: code, hl: { 16: 'sel' } }].concat(state('balance')) });
        return frames;
      }
    },
    examples: [
      {
        title: 'The leaky getter: returning your internal list',
        html: `<p>A getter that returns the real list lets callers change your object behind your back. Fix it with a <b>copy</b> (<code>List.copyOf</code>, Java 10+) or a <b>read-only view</b> (<code>Collections.unmodifiableList</code>).</p>
          ${H.table(['Getter returns', 'caller does list.add("hack")', 'caller later sees your changes?'], [
            ['the real <code>items</code> list', H.c('r', 'succeeds — your object is corrupted'), 'yes'],
            ['<code>Collections.unmodifiableList(items)</code>', H.c('g', 'UnsupportedOperationException'), 'yes (it is a live view)'],
            ['<code>List.copyOf(items)</code>', H.c('g', 'UnsupportedOperationException'), 'no (a frozen snapshot)']
          ])}`,
        code: `import java.util.*;

class Cart {
    private final List<String> items = new ArrayList<>();
    void add(String item) { items.add(item); }
    List<String> leakyItems() { return items; }              // BAD: hands out the real list
    List<String> safeItems()  { return List.copyOf(items); } // GOOD: immutable snapshot
}

public class Main {
    public static void main(String[] args) {
        Cart c = new Cart();
        c.add("milk");
        c.leakyItems().add("FREE TV");          // outsider silently edits the cart
        System.out.println(c.safeItems());      // [milk, FREE TV]  <- invariant broken
        try {
            c.safeItems().add("another TV");
        } catch (UnsupportedOperationException e) {
            System.out.println("blocked");       // the copy cannot be modified
        }
    }
}`
      },
      {
        title: 'Defensive copy of a mutable argument',
        html: `<p>If your constructor stores a mutable object the caller still holds (an array, a <code>java.util.Date</code>), the caller can change it later. Copy it on the way <b>in</b> and on the way <b>out</b>. Better still, use immutable types like <code>LocalDate</code>.</p>`,
        code: `import java.util.*;

final class Scores {
    private final int[] values;
    Scores(int[] values) { this.values = values.clone(); }   // copy IN
    int[] values() { return values.clone(); }               // copy OUT
    int max() { return Arrays.stream(values).max().orElse(0); }
}

public class Main {
    public static void main(String[] args) {
        int[] raw = {70, 85, 90};
        Scores s = new Scores(raw);
        raw[0] = 1000;                 // caller mutates its own array...
        s.values()[1] = 2000;          // ...and the returned copy
        System.out.println(s.max());   // 90 — Scores is unaffected
    }
}`
      },
      {
        title: 'A record with a validating compact constructor',
        html: `<p>Java 16+ <b>records</b> give you private final fields, a constructor, accessors, <code>equals</code>, <code>hashCode</code> and <code>toString</code> for free. You can still guard the invariant in a <b>compact constructor</b>. Records are shallowly immutable: there are no setters at all.</p>`,
        code: `record Temperature(double celsius) {
    Temperature {                                    // compact constructor: runs before fields are set
        if (celsius < -273.15) throw new IllegalArgumentException("below absolute zero: " + celsius);
    }
    double fahrenheit() { return celsius * 9 / 5 + 32; }
}

public class Main {
    public static void main(String[] args) {
        System.out.println(new Temperature(25).fahrenheit());  // 77.0
        try {
            new Temperature(-300);
        } catch (IllegalArgumentException e) {
            System.out.println(e.getMessage());                  // below absolute zero: -300.0
        }
    }
}`
      },
      {
        title: 'private is per CLASS, not per object',
        html: `<p>Surprise for many: one object can read another object's private fields <b>if both are the same class</b>. That is how <code>equals</code> and copy constructors read <code>other.x</code>. Encapsulation protects the class's code boundary, not individual instances.</p>`,
        code: `class Point {
    private final int x, y;
    Point(int x, int y) { this.x = x; this.y = y; }
    Point(Point other) { this(other.x, other.y); }        // reading another object's private fields: legal
    boolean sameAs(Point o) { return x == o.x && y == o.y; }
}

public class Main {
    public static void main(String[] args) {
        Point a = new Point(1, 2);
        System.out.println(new Point(a).sameAs(a));       // true
    }
}`
      }
    ],
    deepDive: `<p><b>1. Getters cost nothing at runtime.</b> The HotSpot JIT inlines tiny methods like <code>getBalance()</code>, so after warm-up the call is as fast as reading the field. Never make a field public "for speed".</p>
      <p><b>2. Encapsulation has layers.</b> Class level (<code>private</code>), package level (package-private — a great default for helpers), and <b>module</b> level (JPMS, Java 9+): a package that is not <code>exports</code>-ed in <code>module-info.java</code> is invisible to other modules even if its classes are <code>public</code>. Since JDK 16/17, strong encapsulation is enforced: deep reflection (<code>setAccessible(true)</code>) into JDK internals fails unless the package is explicitly opened.</p>
      <p><b>3. Nestmates (Java 11).</b> A nested class and its outer class can read each other's private members directly; before Java 11 javac generated hidden <code>access$000</code> bridge methods for this.</p>
      <p><b>4. Encapsulation enables thread safety.</b> If state is private, you control every access path, so you can add a lock, make it <code>final</code>, or switch to an <code>AtomicLong</code> without touching callers. With a public field you can never make the class thread-safe.</p>
      <p><b>5. Records are shallowly immutable.</b> <code>record Team(List&lt;String&gt; members)</code> stores the caller's list; a caller can still mutate it. Fix it in the compact constructor: <code>members = List.copyOf(members);</code>.</p>
      <p><b>6. Encapsulation vs abstraction.</b> Encapsulation hides <i>data</i> and protects invariants (the vault). Abstraction hides <i>complexity</i> behind a simple idea (the "withdraw" button). They work together but are different words in interviews.</p>
      <p><b>7. Anemic domain model.</b> Classes that are just private fields + getters + setters, with all logic in "service" classes, technically compile but give up the main benefit: rules end up scattered and duplicated. Put the rule next to the data.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants (and Lombok's <code>@Data</code>) will happily generate a getter <i>and</i> a setter for every field. That is fast typing, not design. Many AI-written classes are "public fields in disguise".</p>
      <p><b>Use AI as a partner:</b> ask <code>List the invariants this class must protect, then show which public methods could break each one</code>, or <code>Find every getter here that leaks a mutable internal object</code>. Ask for a version with records and compact-constructor validation and compare.</p>
      <p><b>Where AI goes wrong:</b> returns internal <code>List</code>/arrays directly, adds setters for fields that should be <code>final</code>, validates in the setter but forgets the constructor, uses <code>double</code> for money.</p>
      <p><b>What you must still own:</b> deciding <i>what the rules are</i> (the business invariants), which fields should never change, and which operations the outside world truly needs. That judgement is exactly what interviewers probe.</p>`,
    problems: [
      {
        title: 'Guided: Build a Wallet That Can Never Go Negative',
        level: 'Easy', tags: ['encapsulation', 'invariants', 'class design'], companies: ['Paytm', 'PhonePe', 'Amazon'],
        statement: `<p>Write a <code>Wallet</code> class with an owner name and a balance (in whole rupees). Requirements:</p>
          <ul><li>Balance must <b>never</b> be negative and must never be set directly from outside.</li>
          <li><code>addMoney(long)</code> accepts only positive amounts.</li>
          <li><code>pay(long)</code> returns <code>true</code> on success, <code>false</code> if funds are insufficient.</li>
          <li>Expose a <b>read-only</b> list of transactions such as <code>"+500"</code> and <code>"-120"</code>.</li></ul>`,
        constraints: `Amounts 1 ≤ amt ≤ 10<sup>12</sup>. Up to 10<sup>5</sup> operations.`,
        example: `<p>addMoney(500), pay(120), pay(1000) → balance ${H.c('g', '380')}, transactions ${H.c('b', '[+500, -120]')}. The third call returns ${H.c('r', 'false')} because 1000 &gt; 380 — the wallet refuses rather than going to −620.</p>`,
        brute: {
          why: `<p>The "quick" version uses public fields. It compiles and the happy path works, but any caller can write <code>w.balance = -999</code> or <code>w.history.clear()</code>. The bug then shows up far away from the line that caused it, and you must search the whole codebase to find who did it.</p>`,
          code: `import java.util.*;

class Wallet {
    public String owner;                       // anyone can rename the owner
    public long balance;                       // anyone can set -999
    public List<String> history = new ArrayList<>();  // anyone can clear it
}

public class Main {
    public static void main(String[] args) {
        Wallet w = new Wallet();
        w.balance = 500;
        w.balance -= 1000;                     // nothing stops this
        System.out.println(w.balance);         // -500: invariant broken
    }
}`
        },
        mcq: { q: 'Where should the "balance ≥ 0" check live?', options: ['Inside the Wallet methods that change the balance', 'In every caller before they touch balance', 'In a separate WalletValidator class called sometimes', 'Nowhere — trust the callers'], answer: 0, explain: 'Only the class itself can guarantee the rule for every path. Checks in callers get forgotten; a separate validator can be skipped.' },
        hints: [
          `<p>Hint 1: The aha — if the field is <code>private</code>, the only code that can change it is inside <code>Wallet</code>. Guard those few methods and the rule holds everywhere.</p>`,
          `<p>Hint 2: Use <code>private long balance</code>, <code>private final List&lt;String&gt; history</code>, and return <code>Collections.unmodifiableList(history)</code> (or <code>List.copyOf</code>) from the getter.</p>`,
          `<p>Hint 3: Edge cases — non-positive amounts (throw <code>IllegalArgumentException</code>), paying exactly the balance (allowed → 0), blank owner (reject in constructor). Recipe: validate → change → log → return.</p>`
        ],
        solution: {
          approach: `<p>Make every field private; give the class behaviour methods that check before they change; hand out only a read-only view of the history. The constructor validates too, so no broken Wallet can ever exist.</p>`,
          code: `import java.util.*;

class Wallet {
    private final String owner;
    private long balance;                                  // always >= 0
    private final List<String> history = new ArrayList<>();

    Wallet(String owner) {
        if (owner == null || owner.isBlank()) throw new IllegalArgumentException("owner required");
        this.owner = owner;
    }

    void addMoney(long amt) {
        if (amt <= 0) throw new IllegalArgumentException("amount must be positive");
        balance += amt;
        history.add("+" + amt);
    }

    boolean pay(long amt) {
        if (amt <= 0) throw new IllegalArgumentException("amount must be positive");
        if (amt > balance) return false;                   // refuse: would break the invariant
        balance -= amt;
        history.add("-" + amt);
        return true;
    }

    long balance() { return balance; }
    String owner() { return owner; }
    List<String> history() { return Collections.unmodifiableList(history); }
}

public class Main {
    public static void main(String[] args) {
        Wallet w = new Wallet("Ravi");
        w.addMoney(500);
        System.out.println(w.pay(120));    // true
        System.out.println(w.pay(1000));   // false
        System.out.println(w.balance());   // 380
        System.out.println(w.history());   // [+500, -120]
    }
}`,
          alt: [{ lang: 'python', code: `class Wallet:\n    def __init__(self, owner):\n        if not owner or not owner.strip():\n            raise ValueError("owner required")\n        self._owner = owner          # leading underscore = "private by convention"\n        self._balance = 0\n        self._history = []\n\n    def add_money(self, amt):\n        if amt <= 0:\n            raise ValueError("amount must be positive")\n        self._balance += amt\n        self._history.append(f"+{amt}")\n\n    def pay(self, amt):\n        if amt <= 0:\n            raise ValueError("amount must be positive")\n        if amt > self._balance:\n            return False\n        self._balance -= amt\n        self._history.append(f"-{amt}")\n        return True\n\n    @property\n    def balance(self):\n        return self._balance\n\n    @property\n    def history(self):\n        return tuple(self._history)   # immutable snapshot\n\nw = Wallet("Ravi")\nw.add_money(500)\nprint(w.pay(120), w.pay(1000), w.balance, w.history)`, run: true }],
          dry: {
            head: ['call', 'guard', 'balance after', 'history'],
            rows: [
              ['new Wallet("Ravi")', 'owner not blank ✓', '0', '[]'],
              ['addMoney(500)', '500 &gt; 0 ✓', '500', '[+500]'],
              ['pay(120)', '120 ≤ 500 ✓', '380', '[+500, -120]'],
              ['pay(1000)', H.c('r', '1000 &gt; 380 ✗ → false'), '380', '[+500, -120]'],
              ['history().add("x")', H.c('r', 'UnsupportedOperationException'), '380', 'unchanged']
            ]
          },
          complexity: `<p>Each operation O(1) amortised (list append). Space O(number of transactions) for the history.</p>`,
          followUps: ['Make the wallet thread-safe — which methods need <code>synchronized</code>, or would <code>AtomicLong</code> be enough?', 'How would you support refunds without exposing a setter?', 'Why is <code>long</code> paise/rupees safer than <code>double</code> for money?']
        }
      }
    ]
  });

  /* ======================================================================
     TOPIC 2 — Inheritance and super
     ====================================================================== */
  topics.push({
    title: 'Inheritance, extends & super: Reusing a Parent and Building Objects Layer by Layer',
    analogy: `<p>A <b>family recipe book</b>. Grandma wrote the basic dal recipe. Mom <b>inherits</b> the whole book and adds her own pages. When Mom cooks, she can say <i>"first do it exactly Grandma's way"</i> (<code>super.cook()</code>) <i>"then add extra chilli"</i>. And think of building a <b>three-storey house</b>: the ground floor (the parent class) must be built before the first floor (the child class), even though you ordered "a three-storey house" in one go. Java builds objects the same way — <b>parent part first, then child part</b>.</p>`,
    explain: `<p><b>Inheritance</b> lets a new class (the <i>subclass</i> or <i>child</i>) reuse and extend an existing class (the <i>superclass</i> or <i>parent</i>) with the keyword <code>extends</code>. It models an <b>IS-A</b> relationship: a <code>Dog</code> IS-A <code>Animal</code>, so anywhere an <code>Animal</code> is expected, a <code>Dog</code> is fine.</p>
      ${H.table(['What the child gets', 'Inherited?', 'Note'], [
        ['public / protected fields & methods', H.c('g', 'yes'), 'usable directly'],
        ['package-private members', H.c('y', 'only if same package'), ''],
        ['private fields', H.c('y', 'they EXIST inside the object'), 'but the child cannot name them — use the parent\'s methods'],
        ['constructors', H.c('r', 'no'), 'the child writes its own and calls <code>super(...)</code>'],
        ['static members', H.c('y', 'reachable'), 'but not overridden — only hidden']
      ])}
      <p><b>Rules to remember:</b></p>
      <ul>
        <li>A class can <code>extends</code> <b>only one</b> class (single inheritance). Every class without <code>extends</code> silently extends <code>java.lang.Object</code>.</li>
        <li>Every constructor starts by calling a parent constructor: either you write <code>super(args)</code> as the <b>first statement</b>, or javac inserts an invisible <code>super()</code>. If the parent has no no-arg constructor, that invisible call fails to compile.</li>
        <li><code>super.method()</code> calls the parent's version of an overridden method; <code>super.field</code> reaches a parent field hidden by a child field of the same name.</li>
      </ul>
      <p><b>Order of construction for <code>new Puppy("Rex")</code>:</b> memory for the <i>whole</i> object is allocated once (all fields set to 0/null/false) → <code>Puppy()</code> calls <code>Dog()</code> → <code>Dog()</code> calls <code>Animal()</code> → <code>Animal()</code> calls <code>Object()</code> → then the bodies finish from the <b>top down</b>: Animal's field initializers + body, then Dog's, then Puppy's. There is only <b>one</b> object; <code>super</code> is not a second object, just "the parent's part of me".</p>`,
    clues: [
      '"IS-A relationship", "code reuse between related classes", "extends" → inheritance',
      '"What is printed when we create new Child()?" with static/instance blocks → construction & initialization order',
      '"Why must super() be the first statement?" → parent part must be ready before the child uses it',
      '"Implicit super()", "no default constructor" compile error → constructor chaining',
      '"Does Java support multiple inheritance?" → classes no (state diamond), interfaces yes',
      '"Are private members inherited?" → present in the object, not accessible by name'
    ],
    code: [`
      class Animal {
          protected final String name;              // protected: subclasses may read it
          Animal(String name) {
              this.name = name;
              System.out.println("Animal constructor: " + name);
          }
          String describe() { return name + " is an animal"; }
      }

      class Dog extends Animal {
          private final String breed;
          Dog(String name, String breed) {
              super(name);                          // must be first: build the Animal part
              this.breed = breed;
              System.out.println("Dog constructor: " + breed);
          }
          @Override
          String describe() {
              // reuse the parent's text, then add our own
              return super.describe() + ", breed " + breed;
          }
      }

      public class Main {
          public static void main(String[] args) {
              Animal a = new Dog("Rex", "Beagle");
              System.out.println(a.describe());
              // Animal constructor: Rex
              // Dog constructor: Beagle
              // Rex is an animal, breed Beagle
          }
      }`],
    codeTitle: ['extends, super(...) and super.method()'],
    viz: {
      title: 'Constructor chaining: new Puppy(name) builds one object, top floor last',
      input: 'Rex',
      inputLabel: 'Puppy name (letters only)',
      gen: function (input) {
        var nm = cleanWord(input, 'Rex');
        if (!/^[A-Za-z]{1,12}$/.test(nm)) throw new Error('Enter a short name using letters only, e.g. Rex');
        var code = [
          'class Animal {',
          '    String name;',
          '    Animal(String name) {',
          '        super();                 // Object() first (javac adds this if you omit it)',
          '        this.name = name;',
          '        System.out.println("Animal(" + name + ")");',
          '    }',
          '}',
          'class Dog extends Animal {',
          '    String sound = "Woof";      // field initializer: runs right AFTER super(...) returns',
          '    Dog(String name) {',
          '        super(name);            // must be the first statement',
          '        System.out.println("Dog sound=" + sound);',
          '    }',
          '}',
          'class Puppy extends Dog {',
          '    Puppy(String name) {',
          '        super(name);',
          '        System.out.println("Puppy ready");',
          '    }',
          '}',
          '// in main:   Animal a = new Puppy("' + nm + '");'
        ].join('\n');
        var nodes = [{ id: 'Object', x: 50, y: 6 }, { id: 'Animal', x: 50, y: 22 }, { id: 'Dog', x: 50, y: 38 }, { id: 'Puppy', x: 50, y: 54 }];
        var edges = [['Puppy', 'Dog', 'extends'], ['Dog', 'Animal', 'extends'], ['Animal', 'Object', 'extends']];
        function g(cur, done) {
          var hl = {}; (done || []).forEach(function (d) { hl[d] = 'done'; }); if (cur) hl[cur] = 'cur';
          return hier('Class hierarchy (arrow = extends)', nodes, edges, hl, {}, {}, 62);
        }
        var A1 = 'Animal(' + nm + ')', D1 = 'Dog sound=Woof';
        var s0 = ['main'];
        var steps = [
          { l: 22, v: { name: 'null', sound: 'null' }, vl: 'The ONE Puppy object (fields start at default values)', st: s0, out: '', extra: [g('Puppy')], narr: '<code>new Puppy("' + nm + '")</code>: the JVM allocates memory for the <b>whole</b> object at once — Animal\'s field <code>name</code> and Dog\'s field <code>sound</code> included — and sets every field to its default (<code>null</code>). Nothing has run yet.' },
          { l: [17, 18], v: { name: 'null', sound: 'null' }, st: s0.concat(['Puppy("' + nm + '")']), out: '', extra: [g('Puppy')], narr: 'The <code>Puppy</code> constructor starts. Its first statement is <code>super(name)</code>, so before doing anything of its own, it hands control up to <code>Dog</code>.' },
          { l: [11, 12], v: { name: 'null', sound: 'null' }, st: s0.concat(['Puppy("' + nm + '")', 'Dog("' + nm + '")']), out: '', extra: [g('Dog', ['Puppy'])], narr: '<code>Dog(name)</code> starts and immediately calls <code>super(name)</code>. Note: <code>sound</code> is still <b>null</b> — Dog\'s field initializer has not run yet!' },
          { l: [3, 4], v: { name: 'null', sound: 'null' }, st: s0.concat(['Puppy("' + nm + '")', 'Dog("' + nm + '")', 'Animal("' + nm + '")']), out: '', extra: [g('Animal', ['Puppy', 'Dog'])], narr: '<code>Animal(name)</code> calls <code>super()</code> → <code>Object()</code>, the root of every class. Object has nothing to set up, so it returns at once.' },
          { l: 5, v: { name: '"' + nm + '"', sound: 'null' }, hv: { name: 'ok' }, st: s0.concat(['Puppy("' + nm + '")', 'Dog("' + nm + '")', 'Animal("' + nm + '")']), out: '', extra: [g('Animal', ['Puppy', 'Dog', 'Object'])], narr: 'Now the bodies run <b>top-down</b>. Animal sets <code>this.name = "' + nm + '"</code>. <code>this</code> here is the Puppy object — there is only one object.' },
          { l: 6, v: { name: '"' + nm + '"', sound: 'null' }, st: s0.concat(['Puppy("' + nm + '")', 'Dog("' + nm + '")', 'Animal("' + nm + '")']), out: A1, extra: [g('Animal', ['Puppy', 'Dog', 'Object'])], narr: 'Animal prints <b>' + esc(A1) + '</b> and returns to Dog.' },
          { l: 10, cls: 'ok', v: { name: '"' + nm + '"', sound: '"Woof"' }, hv: { sound: 'ok' }, st: s0.concat(['Puppy("' + nm + '")', 'Dog("' + nm + '")']), out: A1, extra: [g('Dog', ['Puppy', 'Object', 'Animal'])], narr: 'Back in Dog, <b>right after super(...) returns</b>, Dog\'s field initializers run: <code>sound = "Woof"</code>. (This is why a parent constructor that peeks at child fields sees null/0.)' },
          { l: 13, v: { name: '"' + nm + '"', sound: '"Woof"' }, st: s0.concat(['Puppy("' + nm + '")', 'Dog("' + nm + '")']), out: A1 + '\n' + D1, extra: [g('Dog', ['Puppy', 'Object', 'Animal'])], narr: 'Dog\'s body prints <b>' + D1 + '</b> and returns to Puppy.' },
          { l: 19, v: { name: '"' + nm + '"', sound: '"Woof"' }, st: s0.concat(['Puppy("' + nm + '")']), out: A1 + '\n' + D1 + '\nPuppy ready', extra: [g('Puppy', ['Object', 'Animal', 'Dog'])], narr: 'Finally Puppy\'s own body runs and prints <b>Puppy ready</b>.' },
          { l: 22, cls: 'ok', v: { name: '"' + nm + '"', sound: '"Woof"' }, hv: { name: 'ok', sound: 'ok' }, st: s0, out: A1 + '\n' + D1 + '\nPuppy ready', extra: [g(null, [])], narr: 'Done: the reference <code>a</code> now points to <b>one fully-built Puppy</b>. Constructors were <i>called</i> bottom-up (Puppy → Dog → Animal → Object) but <i>finished</i> top-down. Output order: Animal, Dog, Puppy.' }
        ];
        return codeFrames(code, steps);
      }
    },
    examples: [
      {
        title: 'The "no default constructor" compile error',
        html: `<p>If the parent only has <code>Vehicle(String plate)</code>, a child constructor without an explicit <code>super(plate)</code> gets an invisible <code>super()</code> — which does not exist. Error: <i>constructor Vehicle in class Vehicle cannot be applied to given types</i>. Fix: call <code>super(...)</code> yourself.</p>`,
        code: `class Vehicle {
    final String plate;
    Vehicle(String plate) { this.plate = plate; }   // no Vehicle() exists
}

class Car extends Vehicle {
    // Car() { }          // ERROR: javac inserts super(), but Vehicle() does not exist
    Car(String plate) {
        super(plate);      // OK: explicitly pick the parent constructor
    }
    Car() {
        this("TEMP-000");  // also OK: this(...) delegates to another Car constructor, which calls super
    }
}

public class Main {
    public static void main(String[] args) {
        System.out.println(new Car().plate);   // TEMP-000
    }
}`
      },
      {
        title: 'Extending behaviour with super.method()',
        html: `<p>Override a method, then call <code>super.format(...)</code> to reuse the parent's work instead of copy-pasting it. Classic in <code>toString()</code> chains.</p>`,
        code: `class Logger {
    String format(String msg) { return "[LOG] " + msg; }
}

class TimestampLogger extends Logger {
    @Override
    String format(String msg) {
        return "12:00 " + super.format(msg);    // parent's version, then decorate
    }
}

public class Main {
    public static void main(String[] args) {
        Logger log = new TimestampLogger();
        System.out.println(log.format("started"));   // 12:00 [LOG] started
    }
}`
      },
      {
        title: 'Field hiding: two fields with the same name',
        html: `<p>Declaring a field with the same name in the child does <b>not</b> override — it creates a <b>second</b> field that hides the first. Which one you get depends on the <b>reference type</b> at compile time. Avoid this in real code; interviewers love it in puzzles.</p>
          ${H.table(['Expression (inside Child)', 'Result'], [['<code>label</code>', 'child'], ['<code>super.label</code>', 'parent'], ['<code>((Parent) this).label</code>', 'parent']])}`,
        code: `class Parent { protected String label = "parent"; }

class Child extends Parent {
    String label = "child";                      // hides Parent.label: the object now has TWO label fields
    void show() {
        System.out.println(label + " / " + super.label + " / " + ((Parent) this).label);
    }
}

public class Main {
    public static void main(String[] args) {
        new Child().show();                      // child / parent / parent
        Parent p = new Child();
        System.out.println(p.label);             // parent  (fields use the REFERENCE type)
    }
}`
      },
      {
        title: 'Private fields are inside the object but not reachable by name',
        html: `<p>A <code>SavingsAccount</code> object really contains <code>Account.balance</code> (it takes memory) but the child cannot write <code>balance</code>. It must use the parent's methods — which is good, because the parent keeps its invariants.</p>`,
        code: `class Account {
    private long balance;                        // private: invisible to subclasses
    protected void credit(long amt) { if (amt > 0) balance += amt; }
    long balance() { return balance; }
}

class SavingsAccount extends Account {
    void addInterest(double rate) {
        // balance += 5;                         // ERROR: balance has private access in Account
        credit(Math.round(balance() * rate));    // go through the parent's guarded method
    }
}

public class Main {
    public static void main(String[] args) {
        SavingsAccount s = new SavingsAccount();
        s.credit(1000);
        s.addInterest(0.05);
        System.out.println(s.balance());          // 1050
    }
}`
      }
    ],
    deepDive: `<p><b>1. One object, stacked field blocks.</b> HotSpot lays out a <code>Puppy</code> as: object header (mark word + class pointer, ~12 bytes with compressed class pointers), then Animal's fields, then Dog's fields, then Puppy's. Parent fields come first so that code compiled against <code>Animal</code> finds <code>name</code> at the same offset in any subclass.</p>
      <p><b>2. Bytecode.</b> <code>new Puppy("Rex")</code> compiles to <code>new</code> (allocate + zero) → <code>dup</code> → <code>invokespecial Puppy.&lt;init&gt;</code>. Constructors and <code>super.m()</code> calls use <code>invokespecial</code> (no virtual dispatch), which is why <code>super.describe()</code> always runs the parent's version.</p>
      <p><b>3. Full initialization order.</b> First use of a class: parent static initializers, then child static initializers (once per class loader). For each <code>new</code>: parent field initializers + instance blocks (in source order) + parent constructor body, then child field initializers + instance blocks + child constructor body.</p>
      <p><b>4. "super() must be first" is relaxing.</b> JEP 513 <i>Flexible Constructor Bodies</i> (final in Java 25) lets you put statements <b>before</b> <code>super(...)</code> — for validating or preparing arguments — as long as they do not touch <code>this</code>. On Java 21 (and in most interviews) the classic rule still applies.</p>
      <p><b>5. Why single inheritance of classes?</b> Two parents could each bring a <code>name</code> field and a constructor; which runs first, and which <code>name</code> wins? Java avoids this "diamond of state" by allowing many <i>interfaces</i> (behaviour, no instance state) but only one superclass.</p>
      <p><b>6. Liskov Substitution Principle.</b> Inheritance is a promise: every <code>Dog</code> must behave correctly wherever an <code>Animal</code> is used. If a subclass has to throw "not supported" for an inherited method, the IS-A is false — use composition instead (see the Composition topic).</p>`,
    aiEra: `<p><b>What AI changes:</b> code generators reach for <code>extends</code> because it is the shortest way to "reuse" code, producing deep hierarchies (<code>BaseService → AbstractService → UserService</code>) that are hard to change.</p>
      <p><b>Use AI as a partner:</b> ask <code>Draw this class hierarchy and list what each level adds; flag any subclass that breaks Liskov substitution</code>, or <code>Print the exact construction order for new X() including static blocks</code> — then verify by running it.</p>
      <p><b>Where AI goes wrong:</b> it sometimes claims constructors are inherited, forgets the implicit <code>super()</code> compile error, or says private fields are "not inherited at all" (they are in the object, just not accessible).</p>
      <p><b>What you must still own:</b> deciding whether IS-A is truly correct, keeping hierarchies shallow (≤ 2–3 levels), and predicting initialization order without running code — a staple of Java interviews.</p>`,
    problems: [
      {
        title: 'Guided: Predict the Initialization Order (static + instance blocks)',
        level: 'Medium', tags: ['inheritance', 'constructors', 'output prediction'], companies: ['TCS', 'Infosys', 'Oracle', 'Goldman Sachs'],
        statement: `<p>What exactly does this program print? Write the output in order and explain each line.</p>
          <pre>class Parent {
    static { print("Parent static"); }
    { print("Parent instance block"); }
    Parent() { print("Parent constructor"); }
}
class Child extends Parent {
    static { print("Child static"); }
    { print("Child instance block"); }
    Child() { print("Child constructor"); }
}
main: new Child(); new Child();</pre>`,
        constraints: `Single class loader, single thread. <code>print</code> = <code>System.out.println</code>.`,
        example: `<p>The first two lines are ${H.c('b', 'Parent static')} then ${H.c('b', 'Child static')} — static blocks run <b>once</b>, when the classes are first initialized, parent before child. The second <code>new Child()</code> prints only the four ${H.c('g', 'instance')} lines again.</p>`,
        brute: {
          why: `<p>The naive guess reads the code "from the object you create": <i>Child first, because we wrote new Child()</i>, or <i>static blocks print every time</i>. Both are wrong. Guessing without the rules wastes interview time and gives a confident wrong answer.</p>`,
          code: `class Parent {
    static { System.out.println("Parent static"); }
    { System.out.println("Parent instance block"); }
    Parent() { System.out.println("Parent constructor"); }
}

class Child extends Parent {
    static { System.out.println("Child static"); }
    { System.out.println("Child instance block"); }
    Child() { System.out.println("Child constructor"); }
}

public class Main {
    public static void main(String[] args) {
        // NAIVE (wrong) guess:  Child static, Child constructor, Parent static, Parent constructor ...
        new Child();
        new Child();
    }
}`
        },
        mcq: { q: 'How many times does "Child static" print for two new Child() calls?', options: ['Once', 'Twice', 'Zero — static blocks need a static method call', 'Once per constructor'], answer: 0, explain: 'A static initializer runs once when the class is initialized (first active use), not once per object.' },
        hints: [
          `<p>Hint 1: Split the work into two phases — <b>class initialization</b> (static blocks, once, parent before child) and <b>object construction</b> (every <code>new</code>).</p>`,
          `<p>Hint 2: Within construction: the child constructor first calls <code>super()</code>; the parent's instance blocks run, then the parent constructor body; only then the child's instance blocks and constructor body.</p>`,
          `<p>Hint 3: Recipe — static(P), static(C), then for each new: block(P), ctor(P), block(C), ctor(C). Two <code>new</code> → 2 + 4 + 4 = 10 lines.</p>`
        ],
        solution: {
          approach: `<p>Class initialization happens once, triggered by the first <code>new Child()</code>; initializing <code>Child</code> requires initializing <code>Parent</code> first. Then each construction runs the parent's instance initializers and constructor body before the child's, because the child constructor's very first action is the (implicit) <code>super()</code>, and javac places instance-initializer code right after that call.</p>`,
          code: `class Parent {
    static { System.out.println("Parent static"); }          // once, when Parent is initialized
    { System.out.println("Parent instance block"); }         // every new, right after super()
    Parent() { System.out.println("Parent constructor"); }
}

class Child extends Parent {
    static { System.out.println("Child static"); }           // once, after Parent's static
    { System.out.println("Child instance block"); }          // every new, after Parent() returns
    Child() { System.out.println("Child constructor"); }     // implicit super() runs first
}

public class Main {
    public static void main(String[] args) {
        new Child();
        new Child();
        // Parent static
        // Child static
        // Parent instance block
        // Parent constructor
        // Child instance block
        // Child constructor
        // Parent instance block
        // Parent constructor
        // Child instance block
        // Child constructor
    }
}`,
          dry: {
            head: ['step', 'trigger', 'printed'],
            rows: [
              ['1', 'first use of Child → initialize Parent class', 'Parent static'],
              ['2', 'then initialize Child class', 'Child static'],
              ['3', '1st new Child() → super() → Parent instance init', 'Parent instance block'],
              ['4', 'Parent() body', 'Parent constructor'],
              ['5', 'back in Child: instance init', 'Child instance block'],
              ['6', 'Child() body', 'Child constructor'],
              ['7–10', '2nd new Child(): classes already initialized', 'the 4 instance lines again']
            ]
          },
          complexity: `<p>Not an algorithm question: the output is 10 lines. The "cost" to remember: static init once per class (per class loader); instance init per object.</p>`,
          followUps: ['What changes if main only calls a static method <code>Child.hello()</code>?', 'What if Child had a field <code>int x = compute();</code> — when does compute() run?', 'What does <code>Class.forName("Child")</code> trigger?']
        }
      }
    ]
  });

  /* ======================================================================
     TOPIC 3 — Method overriding rules
     ====================================================================== */
  topics.push({
    title: 'Method Overriding Rules: Signature, Return Type, Access, Exceptions, @Override',
    analogy: `<p>A <b>franchise restaurant</b>. Head office (the parent class) publishes a menu item: <i>"Masala Dosa — served to everyone, may contain nuts"</i>. A local branch (the subclass) may cook its <b>own version</b> (override), but under franchise rules: same dish name and same order form (same signature); it may serve something <b>more specific</b> — a "Mysore Masala Dosa" is still a dosa (covariant return); it may <b>not</b> turn away customers head office promised to serve (no narrower access); and it may <b>not</b> add new surprise allergens head office never warned about (no new or broader checked exceptions). Break a rule and the franchise contract (the compiler) refuses.</p>`,
    explain: `<p><b>Overriding</b> = a subclass provides its own body for an <b>instance</b> method it inherited, with the <b>same name and same parameter types</b>. At runtime, Java calls the version belonging to the object's actual class (that is runtime polymorphism — next topic).</p>
      ${H.table(['Rule', 'Allowed', 'Not allowed'], [
        ['1. Signature (name + parameter types)', 'exactly the same', 'different params → that is an <b>overload</b>, not an override'],
        ['2. Return type', 'same, or a <b>subtype</b> for reference types (covariant): <code>Number → Integer</code>', 'a different primitive (<code>int → long</code>) or an unrelated type'],
        ['3. Access', 'same or <b>wider</b>: <code>protected → public</code>', 'narrower: <code>public → protected</code>'],
        ['4. Checked exceptions', 'fewer, none, or <b>narrower</b>: <code>IOException → FileNotFoundException</code>', 'new or broader checked exceptions: <code>IOException → Exception</code>'],
        ['5. Unchecked exceptions', 'any (RuntimeException, Error)', '—'],
        ['6. What can be overridden', 'non-private, non-static, non-final instance methods', '<code>final</code> (error), <code>static</code> (only hidden), <code>private</code> (not inherited), constructors']
      ])}
      <p>Access order, from narrowest to widest: <code>private</code> &lt; <i>package-private</i> &lt; <code>protected</code> &lt; <code>public</code>.</p>
      <p><b>Why these rules?</b> They all protect the caller who holds a <b>parent-type</b> reference. Code written as <code>Shape s = ...; Number n = s.area();</code> was compiled against Shape's promise. Whatever subclass shows up at runtime must keep that promise: still callable (access), still returns something usable as a <code>Number</code> (covariant return), and throws nothing the caller was not forced to handle (exceptions). This is the <b>Liskov Substitution Principle</b> enforced by the compiler.</p>
      <p><b>Always write <code>@Override</code>.</b> It costs nothing and turns a silent bug (you accidentally wrote an overload) into a compile error.</p>`,
    clues: [
      '"Can an overriding method throw a broader exception / change the return type / reduce visibility?" → the five rules',
      '"Can we override a static / private / final method?" → hiding / not inherited / compile error',
      '"Difference between overloading and overriding" → same name; params differ (compile time) vs same signature in subclass (runtime)',
      '"What is a covariant return type?" → child returns a subtype of the parent\'s return type',
      '"Why use @Override?" → compiler verifies you really override (catches equals(MyType) mistakes)',
      'Output puzzles where a "static method" is called through a parent-type reference → hiding, not polymorphism'
    ],
    code: [`
      import java.io.*;

      class Reader {
          protected Object read() throws IOException { return "raw"; }
      }

      class FileReaderX extends Reader {
          @Override                                   // compiler checks this really overrides
          public String read()                        // wider access (protected -> public): OK
                  throws FileNotFoundException {      // narrower checked exception: OK
              return "file contents";                 // String is a subtype of Object: covariant return OK
          }
          // public int read() { ... }                // ERROR: int is not a subtype of Object
          // void read() throws Exception { ... }     // ERROR: weaker access AND broader exception
      }

      public class Main {
          public static void main(String[] args) throws IOException {
              Reader r = new FileReaderX();
              Object o = r.read();                    // caller only knows Reader's promise...
              System.out.println(o);                  // ...but the subclass version runs: file contents
              String s = new FileReaderX().read();    // through a child reference we get the precise type
              System.out.println(s.length());         // 13
          }
      }`],
    codeTitle: ['A legal override that uses every allowed freedom'],
    viz: {
      title: 'Override rule checker: is this override legal?',
      input: 'public Number IOException ; protected Integer FileNotFoundException',
      inputLabel: 'parent ; child — each: [access] [static] [final] returnType exception|none (access: public, protected, package, private)',
      gen: function (input) {
        var RET = { 'void': null, 'int': null, 'long': null, 'double': null, 'boolean': null, 'Object': null, 'Number': 'Object', 'Integer': 'Number', 'Long': 'Number', 'Double': 'Number', 'CharSequence': 'Object', 'String': 'CharSequence', 'List': 'Object', 'ArrayList': 'List' };
        var PRIM = { 'void': 1, 'int': 1, 'long': 1, 'double': 1, 'boolean': 1 };
        var EXC = { 'Throwable': null, 'Exception': 'Throwable', 'IOException': 'Exception', 'FileNotFoundException': 'IOException', 'SQLException': 'Exception', 'RuntimeException': 'Exception', 'IllegalArgumentException': 'RuntimeException', 'NullPointerException': 'RuntimeException' };
        var ACC = { 'private': 0, 'package': 1, 'default': 1, 'protected': 2, 'public': 3 };
        function isSub(map, a, b) { var x = a; while (x) { if (x === b) return true; x = map[x]; } return false; }
        function unchecked(e) { return isSub(EXC, e, 'RuntimeException'); }
        function parseSide(s, who) {
          var t = s.trim().split(/\s+/).filter(Boolean), d = { acc: 'package', st: false, fin: false, ret: null, ex: 'none' };
          var i = 0;
          for (; i < t.length; i++) {
            if (ACC[t[i]] !== undefined) d.acc = t[i] === 'default' ? 'package' : t[i];
            else if (t[i] === 'static') d.st = true;
            else if (t[i] === 'final') d.fin = true;
            else break;
          }
          if (i >= t.length || !(t[i] in RET)) throw new Error(who + ': return type must be one of ' + Object.keys(RET).join(', '));
          d.ret = t[i++];
          if (i < t.length) {
            if (t[i] !== 'none' && !(t[i] in EXC)) throw new Error(who + ': exception must be none or one of ' + Object.keys(EXC).join(', '));
            d.ex = t[i++];
          }
          if (i < t.length) throw new Error(who + ': too many words. Example: public Number IOException');
          return d;
        }
        var raw = String(input === undefined || input === null ? '' : input);
        var sides = raw.split(';');
        if (sides.length !== 2) throw new Error('Write parent ; child, e.g. public Number IOException ; public Integer none');
        var P = parseSide(sides[0], 'Parent'), C = parseSide(sides[1], 'Child');
        function decl(d) { return (d.acc === 'package' ? '' : d.acc + ' ') + (d.st ? 'static ' : '') + (d.fin ? 'final ' : '') + d.ret + ' area()' + (d.ex === 'none' ? '' : ' throws ' + d.ex); }
        var code = ['class Shape {', '    ' + decl(P) + ' { ... }', '}', 'class Circle extends Shape {', '    @Override', '    ' + decl(C) + ' { ... }', '}'].join('\n');
        var rows = [], frames = [], problems = 0, hiding = false;
        function tbl(hlRow) { return { type: 'table', label: 'Rule checklist', columns: ['Rule', 'Parent', 'Child', 'Verdict'], rows: rows.map(function (r) { return r.slice(); }), hl: hlRow === undefined ? {} : one(hlRow, rows[hlRow][3].indexOf('✗') >= 0 ? 'bad' : 'ok') }; }
        function push(narr, lines, cls) { var h = {}; lines.forEach(function (l) { h[l] = cls; }); frames.push({ narr: narr, parts: [{ type: 'code', label: 'Parent and child declarations', lang: 'java', code: code, hl: h }, tbl(rows.length ? rows.length - 1 : undefined)] }); }
        push('We compare the parent method on line 2 with the child method on line 6. Same name <code>area()</code> and same (empty) parameter list, so the child is <b>trying</b> to override. Now check each rule, like the compiler does.', [2, 6], 'cur');
        var r0 = 'OK ✓';
        if (P.acc === 'private') { r0 = 'not inherited ✗'; problems++; }
        else if (P.fin) { r0 = 'final cannot be overridden ✗'; problems++; }
        else if (P.st && !C.st) { r0 = 'instance cannot override static ✗'; problems++; }
        else if (!P.st && C.st) { r0 = 'static cannot hide instance ✗'; problems++; }
        else if (P.st && C.st) { r0 = 'HIDING (legal, not polymorphic)'; hiding = true; }
        rows.push(['Modifiers (private / final / static)', (P.acc === 'private' ? 'private ' : '') + (P.st ? 'static ' : '') + (P.fin ? 'final' : '') || '—', (C.st ? 'static ' : '') + (C.fin ? 'final' : '') || '—', r0]);
        push(r0.indexOf('✗') >= 0 ? (P.acc === 'private' ? 'The parent method is <b>private</b>: subclasses do not even see it, so the child method is a <b>brand-new method</b>. With <code>@Override</code> this is a compile error ("method does not override").' : P.fin ? '<b>final</b> means "no subclass may override this". Compile error.' : 'Mixing static and instance methods with the same signature is a compile error: statics belong to the class, instance methods to objects.') : hiding ? 'Both are <b>static</b>: this is <b>hiding</b>, not overriding. Allowed, but which one runs depends on the <i>reference type</i>, never on the object. (And <code>@Override</code> would actually be an error here.)' : 'Neither method is private, final or static: overriding is possible. ✓', [2, 6], r0.indexOf('✗') >= 0 ? 'bad' : 'ok');
        var accOk = ACC[C.acc] >= ACC[P.acc];
        if (!accOk) problems++;
        rows.push(['Access: same or wider', P.acc, C.acc, accOk ? 'OK ✓' : 'narrower ✗']);
        push(accOk ? 'Access <b>' + C.acc + '</b> is the same as or wider than <b>' + P.acc + '</b>. Anyone who could call the parent version can still call the child version. ✓' : 'Access <b>' + C.acc + '</b> is <b>narrower</b> than <b>' + P.acc + '</b>. Code holding a <code>Shape</code> reference was promised it may call <code>area()</code>; a Circle cannot take that back. <span class="c-r">Compile error: attempting to assign weaker access privileges.</span>', [6], accOk ? 'ok' : 'bad');
        var retOk, retWhy;
        if (PRIM[P.ret] || PRIM[C.ret]) { retOk = P.ret === C.ret; retWhy = retOk ? 'Primitive/void return types match exactly. ✓' : 'With primitives or void the return type must be <b>identical</b> — <code>' + C.ret + '</code> ≠ <code>' + P.ret + '</code>. No widening here. <span class="c-r">Compile error: incompatible return type.</span>'; }
        else { retOk = isSub(RET, C.ret, P.ret); retWhy = retOk ? (C.ret === P.ret ? 'Same return type. ✓' : '<code>' + C.ret + '</code> IS-A <code>' + P.ret + '</code> → <b>covariant return</b>. A caller expecting a ' + P.ret + ' happily accepts a ' + C.ret + '. ✓') : '<code>' + C.ret + '</code> is not a subtype of <code>' + P.ret + '</code>. A caller expecting a ' + P.ret + ' could get something unusable. <span class="c-r">Compile error.</span>'; }
        if (!retOk) problems++;
        rows.push(['Return type: same or subtype', P.ret, C.ret, retOk ? 'OK ✓' : 'incompatible ✗']);
        push(retWhy, [6], retOk ? 'ok' : 'bad');
        var exOk, exWhy;
        if (C.ex === 'none') { exOk = true; exWhy = 'The child throws nothing extra. Throwing <b>fewer</b> exceptions is always fine. ✓'; }
        else if (unchecked(C.ex)) { exOk = true; exWhy = '<code>' + C.ex + '</code> is <b>unchecked</b> (a RuntimeException). The compiler never restricts unchecked exceptions. ✓'; }
        else if (P.ex !== 'none' && !unchecked(P.ex) && isSub(EXC, C.ex, P.ex)) { exOk = true; exWhy = '<code>' + C.ex + '</code> IS-A <code>' + P.ex + '</code>: a <b>narrower</b> checked exception. Callers already catch ' + P.ex + ', so they also catch this. ✓'; }
        else { exOk = false; exWhy = 'Checked <code>' + C.ex + '</code> is ' + (P.ex === 'none' || unchecked(P.ex) ? 'new — the parent declared no checked exception' : 'broader than / unrelated to <code>' + P.ex + '</code>') + '. Callers of <code>Shape.area()</code> were never forced to handle it. <span class="c-r">Compile error: overridden method does not throw ' + C.ex + '.</span>'; }
        if (!exOk) problems++;
        rows.push(['Checked exceptions: none / same / narrower', P.ex, C.ex, exOk ? 'OK ✓' : 'broader ✗']);
        push(exWhy, [6], exOk ? 'ok' : 'bad');
        var verdict = problems ? '<span class="c-r"><b>Does not compile</b> — ' + problems + ' rule(s) broken.</span> Fix every ✗ row.' : hiding ? '<span class="c-y"><b>Compiles as method HIDING</b></span> (remove <code>@Override</code>). Calls are resolved by reference type at compile time.' : '<span class="c-g"><b>Legal override.</b></span> <code>Shape s = new Circle(); s.area()</code> will run Circle\'s version at runtime.';
        frames.push({ narr: 'Verdict: ' + verdict + ' Try other inputs, e.g. <code>public Object none ; public String none</code> or <code>protected Number IOException ; public Integer Exception</code>.', parts: [{ type: 'code', label: 'Parent and child declarations', lang: 'java', code: code, hl: { 6: problems ? 'bad' : 'ok' } }, tbl()] });
        return frames;
      }
    },
    examples: [
      {
        title: '@Override catches the classic equals(Point) mistake',
        html: `<p><code>equals(Point other)</code> does <b>not</b> override <code>Object.equals(Object)</code> — the parameter type differs, so it is an <b>overload</b>. Collections call <code>equals(Object)</code>, so <code>list.contains</code> fails. Adding <code>@Override</code> to the wrong version would be a compile error, catching the bug instantly.</p>
          ${H.table(['Call', 'Method chosen', 'Result'], [['<code>p1.equals(p2)</code> (both Point refs)', 'equals(Point) — overload', H.c('g', 'true')], ['<code>list.contains(p2)</code>', 'equals(Object) — Object\'s identity check', H.c('r', 'false')]])}`,
        code: `import java.util.*;

class Point {
    final int x, y;
    Point(int x, int y) { this.x = x; this.y = y; }
    // @Override    <- uncommenting this gives: "method does not override or implement a method from a supertype"
    public boolean equals(Point o) { return o != null && x == o.x && y == o.y; }   // OVERLOAD, not override
}

public class Main {
    public static void main(String[] args) {
        Point p1 = new Point(1, 2), p2 = new Point(1, 2);
        System.out.println(p1.equals(p2));                 // true  (overload chosen at compile time)
        System.out.println(List.of(p1).contains(p2));      // false (List calls equals(Object))
    }
}`
      },
      {
        title: 'Covariant return: copy() that returns the precise type',
        html: `<p>Since Java 5 an override may return a <b>subtype</b>. Callers holding the child type then avoid a cast. The JDK uses this everywhere (e.g. <code>StringBuilder.append</code> returns <code>StringBuilder</code>, though declared in <code>Appendable</code> to return <code>Appendable</code>).</p>`,
        code: `class Shape {
    Shape copy() { return new Shape(); }
}

class Circle extends Shape {
    final double r;
    Circle(double r) { this.r = r; }
    @Override
    Circle copy() { return new Circle(r); }        // covariant: Circle IS-A Shape
}

public class Main {
    public static void main(String[] args) {
        Circle c = new Circle(2.5).copy();           // no cast needed
        Shape s = c;
        System.out.println(c.r + " " + (s.copy() instanceof Circle));   // 2.5 true
    }
}`
      },
      {
        title: 'Exceptions: narrower is fine, broader is not',
        html: `${H.table(['Parent declares', 'Child declares', 'Legal?'], [
          ['<code>throws IOException</code>', '<code>throws FileNotFoundException</code>', H.c('g', 'yes (narrower)')],
          ['<code>throws IOException</code>', '(nothing)', H.c('g', 'yes (fewer)')],
          ['<code>throws IOException</code>', '<code>throws IllegalStateException</code>', H.c('g', 'yes (unchecked)')],
          ['<code>throws IOException</code>', '<code>throws Exception</code>', H.c('r', 'no (broader)')],
          ['(nothing)', '<code>throws IOException</code>', H.c('r', 'no (new checked)')]
        ])}`,
        code: `import java.io.*;

class Loader {
    void load(String path) throws IOException { }
}

class SafeLoader extends Loader {
    @Override
    void load(String path) {                        // throws nothing: callers' catch blocks are simply unused
        if (path.isEmpty()) throw new IllegalArgumentException("empty path");  // unchecked: always allowed
    }
}

class StrictLoader extends Loader {
    @Override
    void load(String path) throws FileNotFoundException { }   // narrower checked exception: allowed
    // void load(String path) throws Exception { }             // ERROR: broader than IOException
}

public class Main {
    public static void main(String[] args) throws IOException {
        Loader l = new SafeLoader();
        l.load("a.txt");                            // compiler still demands IOException handling here
        System.out.println("loaded");
    }
}`
      },
      {
        title: 'Static methods are hidden, not overridden',
        html: `<p>For a <code>static</code> method the compiler picks the version from the <b>declared type</b> of the reference. The object is ignored entirely — even <code>((Parent) null).greet()</code> works!</p>`,
        code: `class Parent {
    static String greet() { return "Parent.greet"; }
    String hello() { return "Parent.hello"; }
}

class Child extends Parent {
    static String greet() { return "Child.greet"; }      // HIDES Parent.greet
    @Override String hello() { return "Child.hello"; }   // OVERRIDES Parent.hello
}

public class Main {
    @SuppressWarnings("static-access")
    public static void main(String[] args) {
        Parent p = new Child();
        System.out.println(p.greet());                 // Parent.greet  (declared type decides)
        System.out.println(p.hello());                 // Child.hello   (object decides)
        System.out.println(((Parent) null).greet());   // Parent.greet  (no object needed at all)
    }
}`
      }
    ],
    deepDive: `<p><b>1. Bridge methods.</b> The JVM itself matches methods by name <i>and</i> full descriptor including return type. For <code>Circle copy()</code> overriding <code>Shape copy()</code>, javac emits a hidden <b>synthetic bridge</b> <code>Shape copy()</code> in Circle that just calls <code>Circle copy()</code>. The same trick makes generic overrides work after type erasure (<code>compareTo(Object)</code> bridging to <code>compareTo(Person)</code>). You can see them with <code>javap -p -c</code>.</p>
      <p><b>2. Overriding is decided after erasure.</b> <code>void f(List&lt;String&gt;)</code> and <code>void f(List&lt;Integer&gt;)</code> in the same class clash ("same erasure"). A subclass method with a raw <code>List</code> parameter can override a generic one.</p>
      <p><b>3. Package-private methods across packages.</b> A package-private method in <code>com.a.Base</code> is <b>not</b> overridden by a same-signature method in <code>com.b.Sub</code>; they are two unrelated methods. Puzzlers love this.</p>
      <p><b>4. No parameter contravariance.</b> Changing a parameter from <code>String</code> to <code>Object</code> in a subclass does not "widen" the override — it creates an overload. Only the return type has variance in Java.</p>
      <p><b>5. Not part of the signature.</b> <code>synchronized</code>, <code>final</code> parameters, parameter names, and <code>strictfp</code> do not affect overriding. An override is <b>not</b> automatically synchronized just because the parent was.</p>
      <p><b>6. Calling the original.</b> Inside the child, <code>super.m()</code> reaches the parent version (via <code>invokespecial</code>). From outside there is no way to force the parent version on a child object — that is what makes overriding trustworthy for frameworks.</p>
      <p><b>7. Interfaces too.</b> Implementing an interface method is overriding: the implementation must be <code>public</code> (interface methods are implicitly public), so <code>void run()</code> without <code>public</code> fails with "weaker access".</p>`,
    aiEra: `<p><b>What AI changes:</b> IDEs and assistants generate overrides for you ("Implement methods", "Override equals"). The <i>typing</i> is solved; knowing whether a hand-written or AI-written method <i>really</i> overrides is not.</p>
      <p><b>Use AI as a partner:</b> paste a class and ask <code>Which of these methods actually override something, which are overloads, and which hide a static?</code> Or <code>Show the bridge methods javac will generate for this class</code> and confirm with <code>javap -p</code>.</p>
      <p><b>Where AI goes wrong:</b> it occasionally writes <code>equals(MyType)</code> without <code>@Override</code>, makes interface implementations package-private, declares <code>throws Exception</code> on an override "to be safe" (compile error), or claims statics are polymorphic.</p>
      <p><b>What you must still own:</b> the five rules and the reasoning behind them (substitutability). In interviews you must explain <i>why</i> narrowing access is illegal, not just that it is.</p>`,
    problems: [
      {
        title: 'Guided: Fix the Four Broken Overrides',
        level: 'Medium', tags: ['overriding', 'covariant return', 'exceptions', 'static hiding'], companies: ['Oracle', 'SAP', 'Cognizant'],
        statement: `<p>A junior wrote <code>Circle extends Shape</code> with four "overrides". For each, say whether it compiles and why, then write a corrected <code>Circle</code> where all four really override (or correctly hide) the parent.</p>
          <pre>class Shape {
    protected Number area() throws IOException
    public Shape copy()
    void draw()
    public static String kind()
}
// Circle's attempts:
private Integer area()              // (a)
public Circle copy()                // (b)
public void draw() throws Exception // (c)
public String kind()                // (d) instance method</pre>`,
        constraints: `Java 21. Keep <code>Shape</code> unchanged. <code>Circle</code> stores a radius.`,
        example: `<p>(a) ${H.c('r', '✗ weaker access')} (protected → private). (b) ${H.c('g', '✓ covariant return')}. (c) ${H.c('r', '✗ new checked exception')} — Shape.draw declares none. (d) ${H.c('r', '✗ instance method cannot override a static method')}.</p>`,
        brute: {
          why: `<p>The tempting "fix" is to delete <code>@Override</code> and tweak parameter lists until the errors vanish. It compiles — but every method is now an <b>overload</b> or an unrelated method, so <code>Shape s = new Circle(2); s.area()</code> silently runs <b>Shape's</b> version and returns 0. You traded a loud compile error for a quiet runtime bug.</p>`,
          code: `import java.io.*;

class Shape {
    protected Number area() throws IOException { return 0; }
    public Shape copy() { return new Shape(); }
    void draw() { System.out.println("shape"); }
    public static String kind() { return "shape"; }
}

class Circle extends Shape {
    final double r;
    Circle(double r) { this.r = r; }
    public Integer area(double scale) { return (int) (Math.PI * r * r * scale); }  // overload: never called via Shape
    void draw(String color) { System.out.println(color + " circle"); }             // overload again
}

public class Main {
    public static void main(String[] args) throws IOException {
        Shape s = new Circle(2);
        System.out.println(s.area());   // 0  <- Shape's version: the "override" never happened
        s.draw();                       // shape
    }
}`
        },
        mcq: { q: 'Attempt (c) adds "throws Exception" to draw(). The cleanest fix is…', options: ['Remove the throws clause (or throw an unchecked exception instead)', 'Add throws Exception to Shape.draw() too', 'Catch Exception in main', 'Make draw() static'], answer: 0, explain: 'You are not allowed to change Shape here, and the override may only throw fewer/narrower checked exceptions. Dropping the clause or using an unchecked exception keeps the contract.' },
        hints: [
          `<p>Hint 1: For each attempt run the checklist in order — modifiers (static/final/private), access (same or wider), return (same or subtype), checked exceptions (none/same/narrower).</p>`,
          `<p>Hint 2: (a) needs <code>protected</code> or <code>public</code>; returning <code>Double</code> (a Number) is fine and you may drop <code>throws IOException</code>. (d) must be <code>static</code> too — and then it is hiding, so no <code>@Override</code>.</p>`,
          `<p>Hint 3: Verify with a parent reference: <code>Shape s = new Circle(2); s.area(); s.copy(); s.draw();</code> must all run Circle's code, while <code>s.kind()</code> still prints "shape" (static: reference type decides).</p>`
        ],
        solution: {
          approach: `<p>Fix each attempt with the smallest change that satisfies the rules, and put <code>@Override</code> on every true override so the compiler guards them forever. For the static <code>kind()</code>, make the child static too (legal hiding) and remember it is <b>not</b> polymorphic.</p>`,
          code: `import java.io.*;

class Shape {
    protected Number area() throws IOException { return 0; }
    public Shape copy() { return new Shape(); }
    void draw() { System.out.println("shape"); }
    public static String kind() { return "shape"; }
}

class Circle extends Shape {
    final double r;
    Circle(double r) { this.r = r; }

    @Override
    public Double area() {                                   // (a) wider access, covariant Double, no checked exception
        return Math.PI * r * r;
    }

    @Override
    public Circle copy() { return new Circle(r); }           // (b) was already legal: covariant return

    @Override
    public void draw() {                                     // (c) no new checked exception
        if (r <= 0) throw new IllegalStateException("bad radius");   // unchecked is fine
        System.out.println("circle r=" + r);
    }

    public static String kind() { return "circle"; }         // (d) static hides static (no @Override!)
}

public class Main {
    public static void main(String[] args) throws IOException {
        Shape s = new Circle(2);
        System.out.printf("%.2f%n", s.area().doubleValue());   // 12.57  (Circle's area)
        System.out.println(s.copy() instanceof Circle);         // true
        s.draw();                                               // circle r=2.0
        System.out.println(Shape.kind() + " " + Circle.kind()); // shape circle (hiding: decided by the type name)
    }
}`,
          dry: {
            head: ['attempt', 'rule broken', 'fix', 'Shape s = new Circle(2) calls…'],
            rows: [
              ['(a) private Integer area()', 'access protected → private', 'public Double area()', 'Circle.area → 12.57'],
              ['(b) public Circle copy()', 'none ✓', 'keep, add @Override', 'Circle.copy'],
              ['(c) draw() throws Exception', 'new checked exception', 'drop throws; unchecked if needed', 'Circle.draw'],
              ['(d) public String kind()', 'instance vs static', 'public static String kind()', 'Shape.kind (hiding)']
            ]
          },
          complexity: `<p>O(1) per call. The real cost being avoided is a silent wrong-method bug that only shows up at runtime.</p>`,
          followUps: ['Why is <code>@Override</code> on the static <code>kind()</code> a compile error?', 'Could Circle.area() return <code>double</code> (primitive)? Why not?', 'What bridge methods will javac generate for Circle?']
        }
      }
    ]
  });

  /* ======================================================================
     TOPIC 4 — Polymorphism: compile-time vs runtime
     ====================================================================== */
  topics.push({
    title: 'Polymorphism: Compile-Time (Overloading) vs Runtime (Dynamic Dispatch)',
    analogy: `<p>A <b>universal TV remote</b>. You press the same <b>Power</b> button every time, but a Samsung, an LG and a Sony TV each switch on in their own way. The remote does not know or care which brand is in front of it — the <b>TV decides</b> what "power" means at the moment you press. That is <b>runtime polymorphism</b>. Now think of a <b>coffee machine with three slots</b>: a pod slot, a beans slot and a powder slot. Which slot you use is decided <b>by looking at what is in your hand before you start</b>. That is <b>compile-time polymorphism</b> (overloading): the choice is made early, from the visible type, not from what is "really" inside.</p>`,
    explain: `<p><b>Polymorphism</b> means "many forms": one name, many behaviours. Java has two kinds, and interviews always ask you to separate them.</p>
      ${H.table(['', 'Compile-time (static)', 'Runtime (dynamic)'], [
        ['Mechanism', '<b>Overloading</b>: same name, different parameter lists', '<b>Overriding</b>: subclass replaces an inherited instance method'],
        ['Who decides', 'javac, from the <b>declared (static) types</b> of the arguments', 'the JVM, from the <b>actual class of the object</b>'],
        ['When', 'while compiling', 'every time the call runs'],
        ['Also called', 'static binding, early binding', 'dynamic dispatch, late binding, virtual call']
      ])}
      <p><b>The golden rule:</b> <i>the reference type decides <b>what you are allowed to call</b>; the object type decides <b>which version runs</b>.</i></p>
      <p>${H.c('b', '<code>Animal a = new Dog();</code>')} — <code>a.sound()</code> compiles because <code>Animal</code> has <code>sound()</code>, and runs <code>Dog</code>'s version. <code>a.fetch()</code> does <b>not</b> compile even though the object is a Dog, because <code>Animal</code> has no <code>fetch()</code>. To call it you must <b>downcast</b>: <code>if (a instanceof Dog d) d.fetch();</code> (pattern matching, Java 16+).</p>
      <p><b>Not polymorphic</b> (decided by the reference type at compile time): <b>fields</b>, <b>static methods</b>, <b>private methods</b>, and the choice between <b>overloads</b>.</p>
      <p><b>How javac picks an overload</b> — three phases, stopping at the first phase that finds something:</p>
      <ol>
        <li><b>Phase 1:</b> exact match or <i>widening</i> only (<code>int → long</code>, <code>String → Object</code>). No boxing, no varargs.</li>
        <li><b>Phase 2:</b> also allow <i>boxing/unboxing</i> (<code>int ↔ Integer</code>).</li>
        <li><b>Phase 3:</b> also allow <i>varargs</i>.</li>
      </ol>
      <p>Inside a phase, the <b>most specific</b> method wins (<code>Integer</code> beats <code>Object</code>); if none is most specific → "reference is ambiguous" compile error. That is why <code>f(5)</code> picks <code>f(long)</code> over <code>f(Integer)</code>: widening (phase 1) beats boxing (phase 2).</p>`,
    clues: [
      '"Difference between compile-time and runtime polymorphism" / "static vs dynamic binding"',
      '"Animal a = new Dog(); what does a.sound() print?" → object decides (dynamic dispatch)',
      '"What does p.name print when Parent p = new Child()?" → fields are NOT polymorphic',
      '"f(null) with f(String) and f(Object)" / "f(5) with f(long) and f(Integer)" → overload resolution phases',
      '"Replace this if-else / instanceof chain on types" → push the behaviour into overridden methods',
      '"Can we achieve polymorphism with static methods?" → no, statics are hidden, bound at compile time'
    ],
    code: [`
      import java.util.*;

      abstract class Notification {
          abstract String channel();                       // each subclass decides
          String send(String msg) {                        // shared algorithm calls the overridable method
              return "[" + channel() + "] " + msg;
          }
      }
      class Email extends Notification { String channel() { return "EMAIL"; } }
      class Sms   extends Notification { String channel() { return "SMS"; } }
      class Push  extends Notification {
          String channel() { return "PUSH"; }
          @Override String send(String msg) { return super.send(msg.toUpperCase()); }
      }

      public class Main {
          // compile-time polymorphism: two overloads, chosen by the static argument type
          static String describe(int n)    { return "int " + n; }
          static String describe(String s) { return "text " + s; }

          public static void main(String[] args) {
              List<Notification> all = List.of(new Email(), new Sms(), new Push());
              for (Notification n : all) {
                  System.out.println(n.send("order shipped"));   // runtime polymorphism: object decides
              }
              System.out.println(describe(42) + " | " + describe("42"));
              // [EMAIL] order shipped
              // [SMS] order shipped
              // [PUSH] ORDER SHIPPED
              // int 42 | text 42
          }
      }`],
    codeTitle: ['Both kinds of polymorphism in one program'],
    viz: [
      {
        title: 'Dynamic dispatch: which sound() and move() run for a.intro()?',
        input: 'Puppy',
        inputLabel: 'Runtime class for "Animal a = new ___()": Animal, Dog, Puppy or Cat',
        gen: function (input) {
          var X = cleanWord(input, 'Puppy');
          var DEF = { Animal: { sound: 2, move: 3, intro: 4 }, Dog: { sound: 7 }, Puppy: { move: 10 }, Cat: { sound: 13, move: 14 } };
          var PAR = { Animal: null, Dog: 'Animal', Puppy: 'Dog', Cat: 'Animal' };
          var VAL = { 'Animal.sound': '...', 'Animal.move': 'walks', 'Dog.sound': 'Woof', 'Puppy.move': 'tumbles', 'Cat.sound': 'Meow', 'Cat.move': 'sneaks' };
          if (!DEF[X]) throw new Error('Choose one of: Animal, Dog, Puppy, Cat');
          var code = [
            'class Animal {',
            '    String sound() { return "..."; }',
            '    String move()  { return "walks"; }',
            '    String intro() { return sound() + " and " + move(); }',
            '}',
            'class Dog extends Animal {',
            '    @Override String sound() { return "Woof"; }',
            '}',
            'class Puppy extends Dog {',
            '    @Override String move()  { return "tumbles"; }',
            '}',
            'class Cat extends Animal {',
            '    @Override String sound() { return "Meow"; }',
            '    @Override String move()  { return "sneaks"; }',
            '}',
            '// main:',
            'Animal a = new ' + X + '();',
            'System.out.println(a.intro());'
          ].join('\n');
          var nodes = [{ id: 'Object', x: 50, y: 6 }, { id: 'Animal', x: 50, y: 22 }, { id: 'Dog', x: 28, y: 38 }, { id: 'Cat', x: 72, y: 38 }, { id: 'Puppy', x: 28, y: 54 }];
          var edges = [['Animal', 'Object', 'extends'], ['Dog', 'Animal', 'extends'], ['Cat', 'Animal', 'extends'], ['Puppy', 'Dog', 'extends']];
          function lookup(m) { var path = [], c = X; while (c) { path.push(c); if (DEF[c][m]) return { cls: c, path: path, line: DEF[c][m] }; c = PAR[c]; } return null; }
          function graph(path, found, extraTag) {
            var hl = {}, ehl = {}, tags = {};
            path.forEach(function (c, i) { hl[c] = c === found ? 'ok' : 'cur'; if (i > 0) ehl[path[i - 1] + '-' + c] = 'cur'; });
            tags[X] = 'object is a ' + X;
            if (extraTag) tags[found] = extraTag;
            return hier('Lookup walks UP from the object\'s class', nodes, edges, hl, ehl, tags, 62);
          }
          function vtable() {
            return { type: 'table', label: 'Method table (vtable) for class ' + X, columns: ['method', 'implementation used'], rows: ['sound', 'move', 'intro'].map(function (m) { var r = lookup(m); return [m + '()', r.cls + '.' + m + (r.cls === X ? '' : ' (inherited)')]; }) };
          }
          var frames = [], s = lookup('sound'), mv = lookup('move'), it = lookup('intro');
          var sv = VAL[s.cls + '.sound'], mvv = VAL[mv.cls + '.move'];
          frames.push({ narr: '<b>Compile time:</b> javac only looks at the <i>declared</i> type <code>Animal</code>. Does Animal have <code>intro()</code>? Yes → the call compiles as "invoke virtual Animal.intro()". javac does <b>not</b> know the object will be a ' + X + '.', parts: [{ type: 'code', label: 'Program', lang: 'java', code: code, hl: { 17: 'cur', 18: 'cur', 1: 'win', 4: 'win' } }, hier('Class hierarchy', nodes, edges, { Animal: 'cur' }, {}, { Animal: 'declared type' }, 62)] });
          frames.push({ narr: '<b>Runtime:</b> <code>a</code> points to a real <b>' + X + '</b> object. The JVM looks up <code>intro()</code> starting at ' + X + ' and walking up: ' + it.path.join(' → ') + '. Found in <b>' + it.cls + '</b>.', parts: [{ type: 'code', label: 'Program', lang: 'java', code: code, hl: { 18: 'cur', 4: 'ok' } }, graph(it.path, it.cls, 'intro() found'), vtable()] });
          frames.push({ narr: 'Inside <code>Animal.intro()</code>, <code>this</code> is still the ' + X + ' object. The call <code>sound()</code> is really <code>this.sound()</code> — another <b>virtual</b> call, so the lookup starts again from <b>' + X + '</b>, not from Animal!', parts: [{ type: 'code', label: 'Program', lang: 'java', code: code, hl: { 4: 'cur' } }, { type: 'stack', label: 'Call stack', items: ['main', X + '.intro()  [code from ' + it.cls + ']'], hl: { 1: 'cur' } }, graph(s.path, s.cls, 'sound() found')] });
          frames.push({ narr: 'Lookup for <code>sound()</code>: ' + s.path.join(' → ') + ' → found in <b>' + s.cls + '</b> (line ' + s.line + '). It returns <b>"' + sv + '"</b>.', parts: [{ type: 'code', label: 'Program', lang: 'java', code: code, hl: one(s.line, 'ok') }, { type: 'stack', label: 'Call stack', items: ['main', X + '.intro()', s.cls + '.sound()'], hl: { 2: 'cur' } }, { type: 'vars', label: 'Partial result', vals: { 'sound()': '"' + sv + '"' }, hl: { 'sound()': 'ok' } }] });
          frames.push({ narr: 'Next <code>move()</code>, also virtual: ' + mv.path.join(' → ') + ' → found in <b>' + mv.cls + '</b> (line ' + mv.line + '), returns <b>"' + mvv + '"</b>.', parts: [{ type: 'code', label: 'Program', lang: 'java', code: code, hl: one(mv.line, 'ok') }, graph(mv.path, mv.cls, 'move() found'), { type: 'vars', label: 'Partial result', vals: { 'sound()': '"' + sv + '"', 'move()': '"' + mvv + '"' }, hl: { 'move()': 'ok' } }] });
          frames.push({ narr: '<code>intro()</code> glues them: <b>"' + sv + ' and ' + mvv + '"</b>. Same line of code in Animal, but the result depends entirely on the object. Try every class: Animal, Dog, Puppy, Cat. Notice Puppy gets Dog\'s sound and its own move.', parts: [{ type: 'code', label: 'Program', lang: 'java', code: code, hl: { 18: 'ok' } }, vtable(), out(sv + ' and ' + mvv)] });
          return frames;
        }
      },
      {
        title: 'Overload resolution: javac\'s three phases',
        input: 'int',
        inputLabel: 'Static type of the argument (byte, short, char, int, long, float, double, boolean, Integer, Long, String, null), optionally remove candidates: e.g. "int -long"',
        gen: function (input) {
          var t = String(input === undefined || input === null ? '' : input).trim().split(/\s+/).filter(Boolean);
          var TYPES = ['byte', 'short', 'char', 'int', 'long', 'float', 'double', 'boolean', 'Integer', 'Long', 'String', 'null'];
          if (!t.length || TYPES.indexOf(t[0]) < 0) throw new Error('First word must be one of: ' + TYPES.join(', '));
          var T = t[0], removed = {};
          t.slice(1).forEach(function (w) {
            var k = w.replace(/^-/, '');
            if (['long', 'Integer', 'Object', 'varargs'].indexOf(k) < 0 || w[0] !== '-') throw new Error('Remove candidates with -long, -Integer, -Object or -varargs');
            removed[k] = true;
          });
          var PRIM = { byte: 1, short: 1, char: 1, int: 1, long: 1, float: 1, double: 1, boolean: 1 };
          var WIDEN = { byte: ['short', 'int', 'long', 'float', 'double'], short: ['int', 'long', 'float', 'double'], char: ['int', 'long', 'float', 'double'], int: ['long', 'float', 'double'], long: ['float', 'double'], float: ['double'], double: [], boolean: [] };
          var BOX = { byte: 'Byte', short: 'Short', char: 'Character', int: 'Integer', long: 'Long', float: 'Float', double: 'Double', boolean: 'Boolean' };
          var UNBOX = { Integer: 'int', Long: 'long' };
          function primTo(a, p) { return a === p || WIDEN[a].indexOf(p) >= 0; }
          function refTo(a, p) { return a === 'null' || a === p || p === 'Object'; }
          function app(phase, param) {
            var argPrim = !!PRIM[T], parPrim = !!PRIM[param];
            if (argPrim && parPrim) return primTo(T, param);
            if (!argPrim && !parPrim) return refTo(T, param);
            if (phase < 2) return false;
            if (argPrim && !parPrim) return refTo(BOX[T], param);
            return !!UNBOX[T] && primTo(UNBOX[T], param);
          }
          var C = [{ k: 'long', p: 'long', line: 1 }, { k: 'Integer', p: 'Integer', line: 2 }, { k: 'Object', p: 'Object', line: 3 }, { k: 'varargs', p: 'int', line: 4, va: true }].filter(function (c) { return !removed[c.k]; });
          var code = ['static void f(long x)    { System.out.println("long"); }', 'static void f(Integer x) { System.out.println("Integer"); }', 'static void f(Object x)  { System.out.println("Object"); }', 'static void f(int... xs) { System.out.println("varargs"); }', '', '// the call:  f(arg);   where arg is declared as ' + T].join('\n');
          var rows = C.map(function (c) { return ['f(' + (c.va ? 'int...' : c.p) + ')', '', '', '']; });
          function sub(a, b) { if (a === b) return true; if (PRIM[a] && PRIM[b]) return primTo(a, b); if (!PRIM[a] && !PRIM[b]) return b === 'Object'; return false; }
          var frames = [], removedTxt = Object.keys(removed).length ? ' (removed: ' + Object.keys(removed).join(', ') + ')' : '';
          function codeHl(lines, cls) { var h = { 6: 'cur' }; C.forEach(function (c) { if (removed[c.k]) h[c.line] = 'done'; }); ['long', 'Integer', 'Object', 'varargs'].forEach(function (k, i) { if (removed[k]) h[i + 1] = 'done'; }); lines.forEach(function (l) { h[l] = cls; }); return h; }
          function tbl(hlIdx, cls) { var h = {}; if (hlIdx !== undefined) h[hlIdx] = cls; return { type: 'table', label: 'Applicable?', columns: ['Candidate', 'Phase 1: widening only', 'Phase 2: + boxing', 'Phase 3: + varargs'], rows: rows.map(function (r) { return r.slice(); }), hl: h }; }
          frames.push({ narr: 'The argument\'s <b>declared type</b> is <code>' + T + '</code>' + removedTxt + '. javac does not care about the runtime value — only this type. It tries three phases in order and stops at the first phase where some method fits.', parts: [{ type: 'code', label: 'Overloads', lang: 'java', code: code, hl: codeHl([], 'cur') }, tbl()] });
          var winner = null, phaseWon = 0, ambiguous = false;
          for (var ph = 1; ph <= 3 && !winner && !ambiguous; ph++) {
            var appl = [];
            C.forEach(function (c, i) {
              // in phases 1-2 a varargs method counts as fixed arity: f(int[] xs). Only null converts to int[] here.
              var ok = ph < 3 ? (c.va ? T === 'null' : app(ph, c.p)) : app(2, c.p);
              rows[i][ph] = ok ? (c.va && ph < 3 ? '✓ (as int[])' : '✓') : '✗';
              if (ok) appl.push(c);
            });
            var desc = ph === 1 ? 'Phase 1 allows only an exact match or <b>widening</b> (byte→short→int→long→float→double, char→int, any reference→Object, null→any reference). No boxing, no varargs.' : ph === 2 ? 'Nothing fit, so Phase 2 also allows <b>boxing/unboxing</b> (int↔Integer, long↔Long), optionally followed by widening.' : 'Still nothing, so Phase 3 finally allows <b>varargs</b>.';
            var lines = appl.map(function (c) { return c.line; });
            frames.push({ narr: desc + ' Applicable: ' + (appl.length ? appl.map(function (c) { return '<code>f(' + (c.va ? 'int...' : c.p) + ')</code>'; }).join(', ') : '<b>none</b>') + '.', parts: [{ type: 'code', label: 'Overloads', lang: 'java', code: code, hl: codeHl(lines, 'ok') }, tbl()] });
            if (appl.length) {
              var pt = function (c) { return c.va && ph < 3 ? 'int[]' : c.p; };
              var best = appl.filter(function (a) { return appl.every(function (b) { return sub(pt(a), pt(b)); }); });
              if (best.length === 1) { winner = best[0]; phaseWon = ph; }
              else { ambiguous = true; }
            }
          }
          if (winner) {
            frames.push({ narr: 'Most specific in phase ' + phaseWon + ': <b><code>f(' + (winner.va ? 'int...' : winner.p) + ')</code></b>' + (phaseWon === 1 && C.length > 1 ? ' — later phases are never even considered, which is why widening beats boxing and boxing beats varargs.' : '.') + ' This decision is baked into the bytecode; it never changes at runtime.', parts: [{ type: 'code', label: 'Overloads', lang: 'java', code: code, hl: codeHl([winner.line], 'sel') }, tbl(C.indexOf(winner), 'sel'), out(winner.va ? 'varargs' : winner.p)] });
          } else {
            frames.push({ narr: ambiguous ? '<span class="c-r">Compile error: reference to f is ambiguous</span> — several methods fit and none is more specific than all others.' : '<span class="c-r">Compile error: no suitable method found for f(' + T + ')</span>.', parts: [{ type: 'code', label: 'Overloads', lang: 'java', code: code, hl: codeHl([6], 'bad') }, tbl()] });
          }
          frames.push({ narr: 'Try: <code>Long</code> (phase 1 picks Object, not long!), <code>null</code> (ambiguous: <code>int...</code> counts as <code>int[]</code>, and Integer vs int[] has no winner), <code>null -varargs</code> (Integer beats Object), <code>float</code> (boxing to Float → Object), <code>int -long</code> (boxing → Integer), <code>int -long -Integer -Object</code> (varargs).', parts: [tbl(), { type: 'text', label: 'Rule of thumb', html: 'widening &gt; boxing &gt; varargs. Within a phase: most specific wins, or it is ambiguous.' }] });
          return frames;
        }
      }
    ],
    examples: [
      {
        title: 'Overload chosen at compile time, override chosen at runtime — in the same call',
        html: `<p>Two-step decision: <b>javac</b> picks the <i>signature</i> using the declared types; the <b>JVM</b> then picks the <i>implementation</i> of that signature using the object.</p>
          ${H.table(['Call', 'javac picks signature (static types)', 'JVM picks body (object = B)', 'Prints'], [
            ['<code>a.m("hi")</code>', 'm(String) — most specific in A', 'B does not override m(String)', 'A.String'],
            ['<code>a.m(o)</code> with <code>Object o = "hi"</code>', 'm(Object) — o is declared Object', 'B overrides m(Object)', 'B.Object']
          ])}`,
        code: `class A {
    void m(Object o) { System.out.println("A.Object"); }
    void m(String s) { System.out.println("A.String"); }
}

class B extends A {
    @Override void m(Object o) { System.out.println("B.Object"); }
}

public class Main {
    public static void main(String[] args) {
        A a = new B();
        Object o = "hi";
        a.m("hi");    // A.String
        a.m(o);       // B.Object
    }
}`
      },
      {
        title: 'Upcast is free, downcast needs a check',
        html: `<p>Upcasting (<code>Dog → Animal</code>) is automatic and always safe. Downcasting (<code>Animal → Dog</code>) needs an explicit cast and fails with <code>ClassCastException</code> if the object is not really a Dog. Use <code>instanceof</code> with a pattern variable (Java 16+) to test and cast in one step.</p>`,
        code: `class Animal { }
class Dog extends Animal { String fetch() { return "fetching!"; } }
class Cat extends Animal { }

public class Main {
    public static void main(String[] args) {
        Animal[] zoo = { new Dog(), new Cat() };
        for (Animal a : zoo) {
            if (a instanceof Dog d) {             // test + cast + new variable d
                System.out.println(d.fetch());
            } else {
                System.out.println(a.getClass().getSimpleName() + " cannot fetch");
            }
        }
        try {
            Dog wrong = (Dog) zoo[1];             // compiles, but the object is a Cat
        } catch (ClassCastException e) {
            System.out.println("ClassCastException");
        }
    }
}`
      },
      {
        title: 'Fields are not polymorphic — methods are',
        html: `<p>Same name field in parent and child → two fields. Field access uses the <b>reference type</b>; method calls use the <b>object</b>. This is why we keep fields private and go through methods.</p>
          ${H.table(['Expression', 'Decided by', 'Value'], [['<code>p.name</code>', 'reference type Parent', 'parent'], ['<code>p.getName()</code>', 'object type Child', 'child'], ['<code>((Child) p).name</code>', 'reference type Child', 'child']])}`,
        code: `class Parent {
    String name = "parent";
    String getName() { return name; }
}

class Child extends Parent {
    String name = "child";                         // hides, does not override
    @Override String getName() { return name; }    // this one IS overridden
}

public class Main {
    public static void main(String[] args) {
        Parent p = new Child();
        System.out.println(p.name);                // parent
        System.out.println(p.getName());           // child
        System.out.println(((Child) p).name);      // child
    }
}`
      },
      {
        title: 'Modern alternative: sealed types + pattern-matching switch (Java 21)',
        html: `<p>Classic OOP puts behaviour <i>inside</i> each class (override). Java 21 also lets you keep data classes simple and put behaviour in one exhaustive <code>switch</code>. The compiler checks every subtype is handled because the interface is <code>sealed</code>. Use overriding when new <i>types</i> are added often; use sealed + switch when new <i>operations</i> are added often.</p>`,
        code: `sealed interface Shape permits Circle, Square, Rect { }
record Circle(double r) implements Shape { }
record Square(double side) implements Shape { }
record Rect(double w, double h) implements Shape { }

public class Main {
    static double area(Shape s) {
        return switch (s) {                        // exhaustive: no default needed
            case Circle c -> Math.PI * c.r() * c.r();
            case Square q -> q.side() * q.side();
            case Rect r   -> r.w() * r.h();
        };
    }
    public static void main(String[] args) {
        System.out.printf("%.1f %.1f %.1f%n", area(new Circle(1)), area(new Square(2)), area(new Rect(2, 3)));
        // 3.1 4.0 6.0
    }
}`
      }
    ],
    deepDive: `<p><b>1. Bytecode call instructions.</b> <code>invokestatic</code> (static methods), <code>invokespecial</code> (constructors, private methods, <code>super.m()</code>) — both bound at link time. <code>invokevirtual</code> (class methods) and <code>invokeinterface</code> (interface methods) — dispatched on the receiver's class. <code>invokedynamic</code> powers lambdas and string concatenation.</p>
      <p><b>2. vtables and itables.</b> HotSpot gives each class a <b>vtable</b>: an array of method pointers where an overriding method reuses its parent's slot. <code>invokevirtual</code> = load the object's class → index the slot → jump. Interfaces use <b>itables</b>, which need a search, so they are slightly slower before the JIT kicks in.</p>
      <p><b>3. The JIT removes most of the cost.</b> Using <b>Class Hierarchy Analysis</b>, if only one loaded class implements a method, the call is devirtualized and inlined. At a call site the JIT keeps an <b>inline cache</b>: <i>monomorphic</i> (1 receiver type seen → inline it), <i>bimorphic</i> (2 → type check + both inlined), <i>megamorphic</i> (3+ → real vtable/itable call, no inlining). Hot loops over a <code>List&lt;Shape&gt;</code> with many shape types can be measurably slower — one reason data-oriented code sometimes uses a switch.</p>
      <p><b>4. Java is single-dispatch.</b> The runtime choice depends only on the receiver object, never on the runtime types of the arguments (those were fixed by overloading at compile time). To dispatch on two objects (e.g. collision of Asteroid with Ship) you use <b>double dispatch</b> / the Visitor pattern — or, in Java 21, a <code>switch</code> over a record pair with nested patterns.</p>
      <p><b>5. Overloading gotchas.</b> <code>List&lt;Integer&gt;.remove(1)</code> removes <i>index</i> 1 (phase 1: <code>remove(int)</code>), not the value 1 — use <code>remove(Integer.valueOf(1))</code>. <code>f(null)</code> with <code>f(String)</code> and <code>f(Integer)</code> is ambiguous. Overloads + lambdas can also be ambiguous (<code>submit(Runnable)</code> vs <code>submit(Callable)</code>).</p>
      <p><b>6. Calling overridable methods from constructors</b> runs the subclass version before the subclass's fields are initialized — the object is half-built. Effective Java: constructors must not invoke overridable methods.</p>`,
    aiEra: `<p><b>What AI changes:</b> generated code frequently uses <code>if (x instanceof A) ... else if (x instanceof B) ...</code> chains, or string "type" fields with switches. They work, but every new type means editing every chain.</p>
      <p><b>Use AI as a partner:</b> ask <code>Refactor this instanceof chain into polymorphic methods</code> and also <code>…into a sealed interface with an exhaustive switch</code>, then compare which is easier to extend for your case. For puzzles, ask the model to <i>explain</i> each phase of overload resolution, then verify by compiling.</p>
      <p><b>Where AI goes wrong:</b> claiming overloads are chosen by runtime type, predicting <code>f(long)</code> vs <code>f(Integer)</code> wrongly, or forgetting that fields and statics are not polymorphic. LLMs also over-trust "the object decides" for static methods.</p>
      <p><b>What you must still own:</b> the two-step mental model (javac picks signature, JVM picks body), and the design call between overriding, sealed + switch, and visitor.</p>`,
    problems: [
      {
        title: 'Guided: Polymorphic Payroll',
        level: 'Medium', tags: ['polymorphism', 'abstract class', 'overriding'], companies: ['Amazon', 'Flipkart', 'Walmart', 'Accenture'],
        statement: `<p>A company has three kinds of employees. Compute the <b>total monthly payroll</b> for a mixed list:</p>
          <ul><li><b>Salaried</b>: annual salary / 12.</li>
          <li><b>Hourly</b>: rate × hours for the first 160 hours, 1.5 × rate for every hour above 160.</li>
          <li><b>Commission</b>: base + sales × percentage.</li></ul>
          <p>Adding a fourth type (e.g. Intern with a fixed stipend) must not require editing the total-payroll code.</p>`,
        constraints: `Up to 10<sup>5</sup> employees; money as <code>double</code> is acceptable here (rounded to 2 decimals for display).`,
        example: `<p>Salaried(1,200,000/yr) → ${H.c('g', '100,000')}; Hourly(500/h, 170 h) → 160×500 + 10×750 = ${H.c('g', '87,500')}; Commission(30,000 + 5% of 400,000) → ${H.c('g', '50,000')}. Total ${H.c('b', '237,500.00')}.</p>`,
        brute: {
          why: `<p>A single <code>Employee</code> class with a <code>type</code> string and a big <code>switch</code>. It works, but every new employee type means editing this switch (and every other switch like it — tax, bonus, reports). Forget one and you get a silent wrong answer. Unused fields (hours for salaried staff) pile up.</p>`,
          code: `import java.util.*;

class Employee {
    String type; double annual, rate, hours, base, sales, pct;   // every field for every type
    Employee(String type) { this.type = type; }
}

public class Main {
    static double pay(Employee e) {
        switch (e.type) {                                   // must be edited for every new type
            case "SALARIED": return e.annual / 12;
            case "HOURLY":   return e.hours <= 160 ? e.rate * e.hours : 160 * e.rate + (e.hours - 160) * e.rate * 1.5;
            case "COMMISSION": return e.base + e.sales * e.pct;
            default: return 0;                              // a new "INTERN" silently earns 0
        }
    }
    public static void main(String[] args) {
        Employee s = new Employee("SALARIED"); s.annual = 1_200_000;
        Employee i = new Employee("INTERN");
        System.out.println(pay(s) + pay(i));                // 100000.0
    }
}`
        },
        mcq: { q: 'Where should "how to compute pay" live in an OOP design?', options: ['In each Employee subclass as an overridden method', 'In one static switch in the Payroll class', 'In the caller, using instanceof', 'In a String field describing the formula'], answer: 0, explain: 'Each subclass owns its rule; the total-payroll loop just calls e.monthlyPay() and never changes when new types are added (open/closed principle).' },
        hints: [
          `<p>Hint 1: The loop "for each employee, add pay" is the same for everyone. Only the <i>formula</i> differs → make the formula an overridable method.</p>`,
          `<p>Hint 2: <code>abstract class Employee { abstract double monthlyPay(); }</code> with three subclasses. Total = sum over <code>List&lt;Employee&gt;</code>.</p>`,
          `<p>Hint 3: Edge cases — exactly 160 hours (no overtime), 0 sales, empty list (total 0). Validate negative inputs in constructors.</p>`
        ],
        solution: {
          approach: `<p>An abstract <code>Employee</code> declares <code>monthlyPay()</code>; each subclass overrides it with its own formula. The payroll loop depends only on the abstract type, so adding <code>Intern</code> is one new class and zero edits elsewhere — dynamic dispatch picks the right formula for each object.</p>`,
          code: `import java.util.*;

abstract class Employee {
    private final String name;
    Employee(String name) { this.name = name; }
    String name() { return name; }
    abstract double monthlyPay();                       // each subclass must supply its formula
}

class Salaried extends Employee {
    private final double annual;
    Salaried(String n, double annual) { super(n); this.annual = annual; }
    @Override double monthlyPay() { return annual / 12; }
}

class Hourly extends Employee {
    private static final int REGULAR = 160;
    private final double rate, hours;
    Hourly(String n, double rate, double hours) { super(n); this.rate = rate; this.hours = hours; }
    @Override double monthlyPay() {
        double regular = Math.min(hours, REGULAR) * rate;
        double overtime = Math.max(0, hours - REGULAR) * rate * 1.5;
        return regular + overtime;
    }
}

class Commission extends Employee {
    private final double base, sales, pct;
    Commission(String n, double base, double sales, double pct) { super(n); this.base = base; this.sales = sales; this.pct = pct; }
    @Override double monthlyPay() { return base + sales * pct; }
}

class Intern extends Employee {                         // added later: nothing else changes
    Intern(String n) { super(n); }
    @Override double monthlyPay() { return 15_000; }
}

public class Main {
    static double total(List<? extends Employee> staff) {
        double sum = 0;
        for (Employee e : staff) sum += e.monthlyPay();   // dynamic dispatch picks the formula
        return sum;
    }
    public static void main(String[] args) {
        List<Employee> staff = List.of(
            new Salaried("Asha", 1_200_000),
            new Hourly("Ben", 500, 170),
            new Commission("Chen", 30_000, 400_000, 0.05));
        System.out.printf("%.2f%n", total(staff));          // 237500.00
    }
}`,
          alt: [{ lang: 'python', code: `from abc import ABC, abstractmethod\n\nclass Employee(ABC):\n    def __init__(self, name):\n        self.name = name\n    @abstractmethod\n    def monthly_pay(self): ...\n\nclass Salaried(Employee):\n    def __init__(self, name, annual):\n        super().__init__(name); self.annual = annual\n    def monthly_pay(self):\n        return self.annual / 12\n\nclass Hourly(Employee):\n    def __init__(self, name, rate, hours):\n        super().__init__(name); self.rate, self.hours = rate, hours\n    def monthly_pay(self):\n        return min(self.hours, 160) * self.rate + max(0, self.hours - 160) * self.rate * 1.5\n\nclass Commission(Employee):\n    def __init__(self, name, base, sales, pct):\n        super().__init__(name); self.base, self.sales, self.pct = base, sales, pct\n    def monthly_pay(self):\n        return self.base + self.sales * self.pct\n\nstaff = [Salaried("Asha", 1_200_000), Hourly("Ben", 500, 170), Commission("Chen", 30_000, 400_000, 0.05)]\nprint(f"{sum(e.monthly_pay() for e in staff):.2f}")`, run: true }],
          dry: {
            head: ['employee', 'runtime class', 'method that runs', 'pay', 'running total'],
            rows: [
              ['Asha', 'Salaried', 'Salaried.monthlyPay', '1,200,000 / 12 = 100,000', '100,000'],
              ['Ben', 'Hourly', 'Hourly.monthlyPay', '160×500 + 10×750 = 87,500', '187,500'],
              ['Chen', 'Commission', 'Commission.monthlyPay', '30,000 + 0.05×400,000 = 50,000', H.c('g', '237,500')]
            ]
          },
          complexity: `<p>O(N) time for N employees, O(1) extra space. Each call is a virtual call; with 3 receiver types the JIT's inline cache is megamorphic, still nanoseconds per call.</p>`,
          followUps: ['Add a <code>bonus()</code> with a default in the parent that only some subclasses override.', 'How would a sealed interface + records + switch look? When is that better?', 'Why should money in production use <code>BigDecimal</code> or <code>long</code> paise?']
        }
      }
    ]
  });

  /* ======================================================================
     TOPIC 5 — Abstract classes
     ====================================================================== */
  topics.push({
    title: 'Abstract Classes: Half-Built Blueprints and the Template Method',
    analogy: `<p>A <b>cake-mix box</b>. The box already contains the flour, sugar and the printed steps: <i>"1. Empty mix into bowl. 2. Add ______. 3. Bake 30 minutes."</i> Step 2 is blank — you <b>must</b> fill it (eggs? banana? yoghurt?) before you get a cake. You cannot eat the box itself; you can only eat a cake made <i>from</i> it. An <b>abstract class</b> is that box: some work done (fields, concrete methods, the order of steps), some blanks left (<b>abstract methods</b>), and you can never create an object of the box itself — only of a subclass that fills every blank.</p>`,
    explain: `<p>Mark a class <code>abstract</code> when it represents a <b>general idea</b> that should never exist on its own — "a Shape", "an Employee", "a Report" — but that has <b>shared state and code</b> worth writing once.</p>
      <ul>
        <li><b>Cannot be instantiated:</b> <code>new Shape()</code> is a compile error. A variable of type <code>Shape</code> is fine (it points to a Circle, Square…).</li>
        <li><b>Abstract methods</b> have no body: <code>abstract double area();</code> Every concrete subclass <b>must</b> override all of them, or be declared abstract itself.</li>
        <li><b>Can have everything a normal class has:</b> fields (any access, mutable or final), <b>constructors</b> (called via <code>super(...)</code>), concrete methods, static methods, even <code>main</code>.</li>
        <li>A class with even one abstract method <b>must</b> be abstract. An abstract class may have <b>zero</b> abstract methods (to just forbid instantiation).</li>
      </ul>
      ${H.table(['Combination', 'Legal?', 'Why'], [
        ['<code>abstract</code> + <code>final</code> class', H.c('r', 'no'), 'abstract needs subclasses, final forbids them'],
        ['<code>abstract</code> + <code>private</code> method', H.c('r', 'no'), 'subclasses could never see it to implement it'],
        ['<code>abstract</code> + <code>static</code> method', H.c('r', 'no'), 'static methods are not overridden, so nobody could ever supply the body'],
        ['abstract class with a constructor', H.c('g', 'yes'), 'it initializes the shared fields; runs when a subclass is created'],
        ['abstract class implementing an interface without implementing its methods', H.c('g', 'yes'), 'concrete subclasses finish the job']
      ])}
      <p><b>The Template Method pattern</b> is the #1 reason to use an abstract class: the parent defines the <b>fixed order of steps</b> in a (usually <code>final</code>) method, and subclasses fill in individual steps. Frameworks are built this way: <code>HttpServlet.service()</code> calls your <code>doGet()</code>; JUnit lifecycle; <code>AbstractList</code> builds a full <code>List</code> from your <code>get()</code> and <code>size()</code>.</p>`,
    clues: [
      '"Can an abstract class have a constructor?" → yes, it runs via super(...) when a subclass is built',
      '"Same algorithm, different steps" / "define the skeleton, let subclasses fill in" → Template Method with an abstract class',
      '"Shared state + shared code among closely related classes" → abstract class (interfaces cannot hold instance state)',
      '"Can we instantiate an abstract class?" → no; but an anonymous subclass is allowed',
      '"Abstract class vs interface — when to use which?"',
      '"abstract final / abstract static / abstract private — legal?" → all illegal'
    ],
    code: [`
      abstract class Shape {
          private final String name;                    // shared state: interfaces cannot have this
          protected Shape(String name) {                 // constructor of an abstract class
              if (name == null) throw new IllegalArgumentException("name");
              this.name = name;
          }
          abstract double area();                        // blank to fill
          abstract double perimeter();

          // concrete method that USES the abstract ones (written once for all shapes)
          @Override public String toString() {
              return String.format("%s: area=%.2f perimeter=%.2f", name, area(), perimeter());
          }
      }

      class Circle extends Shape {
          private final double r;
          Circle(double r) { super("Circle"); this.r = r; }
          double area() { return Math.PI * r * r; }
          double perimeter() { return 2 * Math.PI * r; }
      }

      class Rectangle extends Shape {
          private final double w, h;
          Rectangle(double w, double h) { super("Rectangle"); this.w = w; this.h = h; }
          double area() { return w * h; }
          double perimeter() { return 2 * (w + h); }
      }

      public class Main {
          public static void main(String[] args) {
              // Shape s = new Shape("blob");            // ERROR: Shape is abstract; cannot be instantiated
              Shape[] shapes = { new Circle(1), new Rectangle(2, 3) };
              for (Shape s : shapes) System.out.println(s);
              // Circle: area=3.14 perimeter=6.28
              // Rectangle: area=6.00 perimeter=10.00
          }
      }`],
    codeTitle: ['Abstract class with state, constructor, abstract and concrete methods'],
    viz: {
      title: 'Template Method: the parent runs the recipe, the subclass fills the blanks',
      input: 'html ann bob',
      inputLabel: 'Report kind (csv or html) followed by 1–4 names',
      gen: function (input) {
        var t = String(input === undefined || input === null ? '' : input).trim().split(/\s+/).filter(Boolean);
        if (!t.length || (t[0] !== 'csv' && t[0] !== 'html')) throw new Error('Start with csv or html, then 1-4 names, e.g. html ann bob');
        var rows = t.slice(1);
        if (rows.length < 1 || rows.length > 4 || rows.some(function (r) { return !/^[A-Za-z]{1,10}$/.test(r); })) throw new Error('Give 1-4 names made of letters, e.g. csv ann bob');
        var csv = t[0] === 'csv', K = csv ? 'CsvReport' : 'HtmlReport';
        var code = [
          'abstract class Report {',
          '    // the fixed recipe: final so subclasses cannot reorder the steps',
          '    final String build(List<String> rows) {',
          '        StringBuilder sb = new StringBuilder(header());',
          '        for (String r : rows) sb.append(row(r));',
          '        sb.append(footer());',
          '        return sb.toString();',
          '    }',
          '    abstract String header();              // MUST be supplied by each subclass',
          '    abstract String row(String r);',
          '    String footer() { return " (end)"; }   // hook: optional to override',
          '}',
          'class CsvReport extends Report {',
          '    String header() { return "name;"; }',
          '    String row(String r) { return r + ";"; }',
          '}',
          'class HtmlReport extends Report {',
          '    String header() { return "[ul]"; }',
          '    String row(String r) { return "[li]" + r + "[/li]"; }',
          '    @Override String footer() { return "[/ul]"; }',
          '}',
          '// main:  Report rep = new ' + K + '();  rep.build(rows);'
        ].join('\n');
        var nodes = [{ id: 'Report', label: 'Report (abstract)', x: 50, y: 8, w: 30 }, { id: 'CsvReport', x: 25, y: 34 }, { id: 'HtmlReport', x: 75, y: 34 }];
        var edges = [['CsvReport', 'Report', 'extends'], ['HtmlReport', 'Report', 'extends']];
        function g(cur) { var hl = {}; hl[K] = 'sel'; if (cur) hl[cur] = 'cur'; var tags = {}; tags[K] = 'the object'; return hier('Who owns the code that runs now?', nodes, edges, hl, {}, tags, 44); }
        var sb = '', frames = [];
        var base = ['main'];
        frames.push({ narr: '<code>rep</code> is declared as <code>Report</code> but the object is a <b>' + K + '</b>. (<code>new Report()</code> would not compile — it is abstract.) We call <code>rep.build(' + JSON.stringify(rows) + ')</code>.', parts: [{ type: 'code', label: 'Template method', lang: 'java', code: code, hl: { 22: 'cur' } }, g(null), { type: 'stack', label: 'Call stack', items: base.slice(), hl: { 0: 'cur' } }] });
        frames.push({ narr: '<code>build</code> lives in the <b>abstract parent</b>. It is <code>final</code>, so every report follows the same recipe: header → one row per item → footer. First it needs <code>header()</code> — an <b>abstract</b> method, so the call is dispatched to the object\'s class.', parts: [{ type: 'code', label: 'Template method', lang: 'java', code: code, hl: { 3: 'cur', 4: 'cur' } }, g('Report'), { type: 'stack', label: 'Call stack', items: base.concat(['Report.build']), hl: { 1: 'cur' } }] });
        var h = csv ? 'name;' : '[ul]';
        sb += h;
        frames.push({ narr: K + '.header() runs (line ' + (csv ? 14 : 18) + ') and returns <b>' + esc(h) + '</b>. The parent wrote the algorithm; the child supplied this one step.', parts: [{ type: 'code', label: 'Template method', lang: 'java', code: code, hl: one(csv ? 14 : 18, 'ok') }, g(K), { type: 'stack', label: 'Call stack', items: base.concat(['Report.build', K + '.header']), hl: { 2: 'cur' } }, { type: 'vars', label: 'build() locals', vals: { sb: '"' + sb + '"' }, hl: { sb: 'ok' } }] });
        rows.forEach(function (r, i) {
          var piece = csv ? r + ';' : '[li]' + r + '[/li]';
          sb += piece;
          frames.push({ narr: 'Loop item ' + (i + 1) + ': <code>row("' + r + '")</code> → ' + K + '.row (line ' + (csv ? 15 : 19) + ') returns <b>' + esc(piece) + '</b>, appended to sb.', parts: [{ type: 'code', label: 'Template method', lang: 'java', code: code, hl: (function () { var o = {}; o[5] = 'cur'; o[csv ? 15 : 19] = 'ok'; return o; })() }, g(K), { type: 'stack', label: 'Call stack', items: base.concat(['Report.build', K + '.row']), hl: { 2: 'cur' } }, { type: 'array', label: 'rows', values: rows.slice(), hl: one(i, 'cur') }, { type: 'vars', label: 'build() locals', vals: { r: '"' + r + '"', sb: '"' + sb + '"' }, hl: { sb: 'ok' } }] });
        });
        var f = csv ? ' (end)' : '[/ul]';
        sb += f;
        frames.push({ narr: '<code>footer()</code> is a <b>hook</b>: concrete in the parent, optionally overridden. ' + (csv ? 'CsvReport did not override it, so the parent\'s default (line 11) runs: <b>" (end)"</b>.' : 'HtmlReport overrides it (line 20): <b>[/ul]</b>.'), parts: [{ type: 'code', label: 'Template method', lang: 'java', code: code, hl: (function () { var o = {}; o[6] = 'cur'; o[csv ? 11 : 20] = 'ok'; return o; })() }, g(csv ? 'Report' : K), { type: 'stack', label: 'Call stack', items: base.concat(['Report.build', (csv ? 'Report' : K) + '.footer']), hl: { 2: 'cur' } }, { type: 'vars', label: 'build() locals', vals: { sb: '"' + sb + '"' }, hl: { sb: 'ok' } }] });
        frames.push({ narr: '<code>build</code> returns the finished text. Switch the input between <code>csv</code> and <code>html</code>: the recipe (lines 3–8) never changes, only the steps do. That is the Template Method pattern — and the reason the abstract class exists.', parts: [{ type: 'code', label: 'Template method', lang: 'java', code: code, hl: { 7: 'ok' } }, g(null), out(sb)] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Abstract classes cannot be instantiated — but anonymous subclasses can',
        html: `<p><code>new Greeter()</code> fails. <code>new Greeter() { ... }</code> creates an <b>anonymous subclass</b> on the spot that fills the blank, and that is legal. (For a single-method <i>interface</i> you would use a lambda instead; lambdas do <b>not</b> work for abstract classes.)</p>`,
        code: `abstract class Greeter {
    abstract String name();
    String greet() { return "Hello, " + name() + "!"; }
}

public class Main {
    public static void main(String[] args) {
        // Greeter g = new Greeter();          // ERROR: Greeter is abstract; cannot be instantiated
        Greeter g = new Greeter() {            // anonymous subclass
            @Override String name() { return "Priya"; }
        };
        System.out.println(g.greet());         // Hello, Priya!
        System.out.println(g.getClass().getSuperclass().getSimpleName());   // Greeter
    }
}`
      },
      {
        title: 'The JDK\'s skeletal implementation: a full List from two methods',
        html: `<p><code>AbstractList</code> implements ~25 <code>List</code> methods (<code>contains</code>, <code>indexOf</code>, iterators, <code>subList</code>, <code>equals</code>, <code>hashCode</code>…) in terms of two abstract ones: <code>get(int)</code> and <code>size()</code>. Fill those two and you get a complete read-only list. This "interface + Abstract skeleton" pairing appears all over the JDK (<code>AbstractMap</code>, <code>AbstractSet</code>, <code>AbstractQueue</code>).</p>`,
        code: `import java.util.*;

class Range extends AbstractList<Integer> {      // numbers lo..hi-1 without storing them
    private final int lo, hi;
    Range(int lo, int hi) { this.lo = lo; this.hi = hi; }
    @Override public Integer get(int i) {
        if (i < 0 || i >= size()) throw new IndexOutOfBoundsException(i);
        return lo + i;
    }
    @Override public int size() { return hi - lo; }
}

public class Main {
    public static void main(String[] args) {
        List<Integer> r = new Range(3, 8);
        System.out.println(r);                    // [3, 4, 5, 6, 7]   (toString from AbstractCollection)
        System.out.println(r.contains(6));        // true              (inherited)
        System.out.println(r.indexOf(7));         // 4                 (inherited)
        System.out.println(r.subList(1, 3));      // [4, 5]            (inherited)
        System.out.println(r.equals(List.of(3, 4, 5, 6, 7)));   // true
    }
}`
      },
      {
        title: 'An abstract subclass may leave some blanks for its own children',
        html: `<p>A class that does not implement every abstract method must itself be <code>abstract</code>. This lets you build layers: <code>Vehicle</code> (abstract: wheels, fuel) → <code>Car</code> (abstract: fills wheels=4) → <code>ElectricCar</code> (concrete: fills fuel).</p>
          ${H.table(['Class', 'wheels()', 'fuel()', 'Instantiable?'], [['Vehicle', 'abstract', 'abstract', H.c('r', 'no')], ['Car', '4', 'abstract', H.c('r', 'no')], ['ElectricCar', '4 (inherited)', '"battery"', H.c('g', 'yes')]])}`,
        code: `abstract class Vehicle {
    abstract int wheels();
    abstract String fuel();
    String spec() { return wheels() + " wheels, runs on " + fuel(); }
}

abstract class Car extends Vehicle {             // fills one blank, still abstract
    @Override int wheels() { return 4; }
}

class ElectricCar extends Car {
    @Override String fuel() { return "battery"; }
}

public class Main {
    public static void main(String[] args) {
        Vehicle v = new ElectricCar();
        System.out.println(v.spec());             // 4 wheels, runs on battery
    }
}`
      },
      {
        title: 'Danger: calling an abstract method from the constructor',
        html: `<p>The parent constructor runs <b>before</b> the subclass's fields are set. If it calls an abstract (overridden) method, the subclass version sees default values. Output below is <code>label = null</code>, not <code>label = sensor-1</code>.</p>`,
        code: `abstract class Device {
    Device() {
        System.out.println("label = " + label());   // calls the subclass version too early
    }
    abstract String label();
}

class Sensor extends Device {
    private final String id;
    Sensor(String id) {
        super();                                    // Device() runs here, id is still null
        this.id = id;
    }
    @Override String label() { return id; }
}

public class Main {
    public static void main(String[] args) {
        Sensor s = new Sensor("sensor-1");          // prints: label = null
        System.out.println(s.label());              // sensor-1 (fine once construction is done)
    }
}`
      }
    ],
    deepDive: `<p><b>1. Bytecode view.</b> An abstract class gets the <code>ACC_ABSTRACT</code> flag; abstract methods have no <code>Code</code> attribute. The JVM refuses <code>new</code> on such a class with <code>InstantiationError</code> (the compiler stops you earlier). The abstract class still has an <code>&lt;init&gt;</code> constructor that subclasses call.</p>
      <p><b>2. Abstract class vs interface (Java 8+).</b></p>
      ${H.table(['', 'Abstract class', 'Interface'], [
        ['Instance fields', 'yes, any kind', 'no (only public static final constants)'],
        ['Constructors', 'yes', 'no'],
        ['Method bodies', 'any', 'default, static, private (Java 9+)'],
        ['Access of members', 'any', 'public (or private helpers)'],
        ['How many per class', 'one (extends)', 'many (implements)'],
        ['Relationship', 'IS-A, shared identity', 'CAN-DO capability'],
        ['Lambda-friendly', 'no', 'yes, if exactly one abstract method']
      ])}
      <p><b>3. Skeletal implementation pattern (Effective Java item 20).</b> Publish an <b>interface</b> as the type (flexible: anyone can implement it) and an <b>abstract class</b> that implements most of it (convenient). Users choose: extend the skeleton for convenience, or implement the interface directly when they already have a superclass.</p>
      <p><b>4. Template method + final.</b> Mark the template method <code>final</code> so subclasses cannot break the sequence; make the steps <code>protected abstract</code> so they are not part of the public API. "Hooks" (concrete methods with empty/default bodies) give optional extension points.</p>
      <p><b>5. Sealed abstract classes (Java 17).</b> <code>sealed abstract class Payment permits Card, Upi, Cash</code> fixes the list of subclasses, so a <code>switch</code> over them can be exhaustive, and nobody outside can add a surprise subclass.</p>
      <p><b>6. Testing.</b> Test an abstract class through a tiny concrete test subclass, or test each concrete subclass. Heavy abstract base classes with many hooks are hard to test — another reason to prefer composition when the "shared code" is really a separate responsibility.</p>`,
    aiEra: `<p><b>What AI changes:</b> asking an assistant for "a base class for all our services" often yields a large abstract class full of hooks and protected fields — instant coupling. AI is also quick to scaffold correct Template Method code.</p>
      <p><b>Use AI as a partner:</b> <code>Is this abstract class doing Template Method, or is it just a bag of shared utilities that should be a separate helper class?</code> · <code>Convert this abstract class into an interface + skeletal implementation and show what breaks</code>.</p>
      <p><b>Where AI goes wrong:</b> calling abstract methods from constructors, making the template method non-final, writing <code>abstract static</code> methods (illegal), or trying to use a lambda for an abstract class.</p>
      <p><b>What you must still own:</b> the abstract-class-vs-interface decision (state? one parent? lambda?), which steps are fixed vs pluggable, and keeping the hierarchy shallow.</p>`,
    problems: [
      {
        title: 'Guided: Beverage Machine with a Template Method',
        level: 'Easy', tags: ['abstract class', 'template method', 'hooks'], companies: ['Swiggy', 'Zomato', 'Infosys'],
        statement: `<p>A drinks machine makes Tea and Coffee. Both follow the same recipe: <b>boil water → brew → pour in cup → (optionally) add condiments</b>. Tea brews by "steep tea" and adds "lemon"; Coffee brews by "drip coffee" and adds "milk" — but a <b>black coffee</b> skips condiments. Write the classes so the recipe is written <b>once</b> and cannot be reordered. <code>prepare()</code> returns the list of steps.</p>`,
        constraints: `Java 21. New drinks (e.g. HotChocolate) must be addable without touching the recipe.`,
        example: `<p><code>new Tea().prepare()</code> → ${H.c('g', '[boil water, steep tea, pour in cup, add lemon]')}<br><code>new Coffee(true).prepare()</code> (black) → ${H.c('g', '[boil water, drip coffee, pour in cup]')} — the hook <code>wantsCondiments()</code> returned false.</p>`,
        brute: {
          why: `<p>Two independent classes, each with its own copy of the recipe. Fixing a step (say "boil filtered water") means editing every copy; one copy gets missed, and the drinks drift apart. Nothing stops a new drink from pouring before brewing.</p>`,
          code: `import java.util.*;

class Tea {
    List<String> prepare() {
        return new ArrayList<>(List.of("boil water", "steep tea", "pour in cup", "add lemon"));
    }
}

class Coffee {
    boolean black;
    Coffee(boolean black) { this.black = black; }
    List<String> prepare() {                         // same recipe, copy-pasted
        List<String> s = new ArrayList<>(List.of("boil water", "drip coffee", "pour in cup"));
        if (!black) s.add("add milk");
        return s;
    }
}

public class Main {
    public static void main(String[] args) {
        System.out.println(new Tea().prepare());
        System.out.println(new Coffee(true).prepare());
    }
}`
        },
        mcq: { q: 'Which method should be final in the abstract Beverage class?', options: ['prepare() — the recipe itself', 'brew() — every drink brews', 'addCondiments()', 'None; final is never useful'], answer: 0, explain: 'The template method fixes the order of steps; making it final stops subclasses from reordering or skipping steps. The steps themselves are the parts meant to vary.' },
        hints: [
          `<p>Hint 1: Separate what never changes (the order of steps) from what varies (brew, condiments, whether to add them).</p>`,
          `<p>Hint 2: <code>abstract class Beverage</code> with <code>final List&lt;String&gt; prepare()</code>, <code>abstract String brew()</code>, <code>abstract String condiment()</code>, and a hook <code>boolean wantsCondiments() { return true; }</code>.</p>`,
          `<p>Hint 3: Coffee overrides the hook to return <code>!black</code>. Recipe: list ← boil; list ← brew(); list ← pour; if hook() list ← "add " + condiment(); return list.</p>`
        ],
        solution: {
          approach: `<p>The abstract parent owns the algorithm in a <code>final</code> template method and calls abstract "step" methods plus one hook. Each drink fills in only what differs. New drinks plug in without editing the recipe, and no drink can reorder it.</p>`,
          code: `import java.util.*;

abstract class Beverage {
    // the template method: fixed order, cannot be overridden
    final List<String> prepare() {
        List<String> steps = new ArrayList<>();
        steps.add("boil water");
        steps.add(brew());                              // step supplied by subclass
        steps.add("pour in cup");
        if (wantsCondiments()) steps.add("add " + condiment());   // hook decides
        return steps;
    }
    protected abstract String brew();
    protected abstract String condiment();
    protected boolean wantsCondiments() { return true; }         // hook with a default
}

class Tea extends Beverage {
    @Override protected String brew() { return "steep tea"; }
    @Override protected String condiment() { return "lemon"; }
}

class Coffee extends Beverage {
    private final boolean black;
    Coffee(boolean black) { this.black = black; }
    @Override protected String brew() { return "drip coffee"; }
    @Override protected String condiment() { return "milk"; }
    @Override protected boolean wantsCondiments() { return !black; }
}

public class Main {
    public static void main(String[] args) {
        System.out.println(new Tea().prepare());          // [boil water, steep tea, pour in cup, add lemon]
        System.out.println(new Coffee(true).prepare());   // [boil water, drip coffee, pour in cup]
        System.out.println(new Coffee(false).prepare());  // [boil water, drip coffee, pour in cup, add milk]
    }
}`,
          dry: {
            head: ['call', 'step', 'method that runs', 'steps so far'],
            rows: [
              ['Coffee(true).prepare()', '1', 'Beverage.prepare (final)', '[boil water]'],
              ['', '2', 'Coffee.brew', '[boil water, drip coffee]'],
              ['', '3', 'Beverage.prepare', '[…, pour in cup]'],
              ['', '4', 'Coffee.wantsCondiments → false', H.c('g', 'skip condiments')],
              ['Tea().prepare()', '4', 'Beverage.wantsCondiments → true; Tea.condiment', '[…, add lemon]']
            ]
          },
          complexity: `<p>O(1) per drink (4 steps). The win is structural: the recipe exists in exactly one place.</p>`,
          followUps: ['Add HotChocolate in one class — what did you have to touch?', 'Rewrite with composition: a Beverage holding a BrewStrategy. Which is more flexible?', 'Why make the steps <code>protected</code> rather than <code>public</code>?']
        }
      }
    ]
  });

  /* ======================================================================
     TOPIC 6 — Interfaces: default, static and private methods
     ====================================================================== */
  topics.push({
    title: 'Interfaces: Contracts, default & static Methods, and the Diamond Rules',
    analogy: `<p>A <b>driving licence</b>. It does not care who your parents are (your class hierarchy); it only certifies a <b>capability</b>: "this person CAN drive". You can hold many such certificates at once — driving, swimming, first aid — but you have only one set of biological parents. That is the class/interface split: <b>one superclass (who you are), many interfaces (what you can do)</b>. A <b>default method</b> is like the licence coming with a free standard instruction booklet: use it as-is, or replace it with your own. If two certificates ship <i>conflicting</i> booklets for the same thing, the law makes <b>you</b> write your own version.</p>`,
    explain: `<p>An <b>interface</b> is a named contract: a list of methods a class promises to provide. A class <code>implements</code> it; an interface <code>extends</code> other interfaces (several at once).</p>
      ${H.table(['Member', 'Since', 'Implicit modifiers', 'Notes'], [
        ['abstract method <code>void pay();</code>', 'Java 1', '<code>public abstract</code>', 'implementations must be <code>public</code>'],
        ['constant <code>int MAX = 5;</code>', 'Java 1', '<code>public static final</code>', 'no instance fields allowed'],
        ['<code>default</code> method (with body)', 'Java 8', '<code>public</code>', 'inherited by implementers; may be overridden'],
        ['<code>static</code> method', 'Java 8', '<code>public</code>', 'called as <code>Iface.m()</code>; <b>not</b> inherited by implementing classes'],
        ['<code>private</code> method', 'Java 9', '—', 'helper shared by default methods'],
        ['nested types, <code>sealed</code> … <code>permits</code>', 'Java 17', '', 'restrict who may implement']
      ])}
      <p><b>Why default methods?</b> To <b>evolve</b> an interface without breaking every existing implementation. Java 8 added <code>Collection.stream()</code>, <code>Iterable.forEach()</code>, <code>List.sort()</code>, <code>Map.getOrDefault()</code> as defaults — otherwise millions of user classes implementing <code>List</code> would have stopped compiling.</p>
      <p><b>Diamond rules</b> — when a class inherits the same method from several places:</p>
      <ol>
        <li><b>Class wins:</b> a method from the class itself or any superclass beats every interface default.</li>
        <li><b>More specific interface wins:</b> if <code>K extends I</code> and both have a default, K's version wins.</li>
        <li><b>Otherwise it is a compile error:</b> the class must override the method itself; inside, it may pick one with <code>J.super.hello()</code> (only for <b>direct</b> superinterfaces).</li>
      </ol>
      <p><b>Functional interface</b> = exactly one abstract method (defaults and statics do not count), e.g. <code>Runnable</code>, <code>Comparator</code>, <code>Function</code>. Any such interface can be implemented with a <b>lambda</b>. <code>@FunctionalInterface</code> makes the compiler enforce it.</p>`,
    clues: [
      '"Why were default methods added in Java 8?" → evolve interfaces (stream(), forEach) without breaking implementers',
      '"A class implements two interfaces with the same default method — what happens?" → diamond rules, X.super.m()',
      '"Can an interface have a constructor / instance fields / static methods / private methods?" → no / no / yes (8) / yes (9)',
      '"Multiple inheritance in Java" → only of type and behaviour through interfaces, not of state',
      '"Abstract class vs interface" → state + constructor + single parent vs capability + many + lambdas',
      '"Functional interface", "@FunctionalInterface", "SAM type" → exactly one abstract method'
    ],
    code: [`
      @FunctionalInterface
      interface Validator {
          boolean test(String s);                         // the single abstract method

          default Validator and(Validator other) {        // default: inherited behaviour
              return s -> test(s) && other.test(s);
          }
          default Validator negate() { return s -> !test(s); }

          static Validator nonBlank() { return s -> s != null && !s.isBlank(); }   // static factory
          static Validator maxLength(int n) { return s -> s.length() <= n; }

          private static String quote(String s) { return "'" + s + "'"; }          // private helper (Java 9)
          default String explain(String s) { return quote(s) + (test(s) ? " OK" : " REJECTED"); }
      }

      public class Main {
          public static void main(String[] args) {
              Validator username = Validator.nonBlank().and(Validator.maxLength(8));
              System.out.println(username.explain("asha"));        // 'asha' OK
              System.out.println(username.explain("   "));         // '   ' REJECTED
              System.out.println(username.explain("verylongname")); // 'verylongname' REJECTED
              Validator hasDigit = s -> s.chars().anyMatch(Character::isDigit);   // lambda
              System.out.println(hasDigit.negate().test("abc"));   // true
          }
      }`],
    codeTitle: ['One interface using abstract, default, static and private methods'],
    viz: {
      title: 'Diamond resolution: who wins c.hello()?',
      input: 'I J',
      inputLabel: 'Which types define hello()? Any of: C Base I J K (K extends I; class C extends Base implements J, K)',
      gen: function (input) {
        var toks = String(input === undefined || input === null ? '' : input).trim().split(/[\s,]+/).filter(Boolean);
        var ALL = ['C', 'Base', 'I', 'J', 'K'], has = {};
        toks.forEach(function (x) { if (ALL.indexOf(x) < 0) throw new Error('Use names from: C Base I J K, e.g. "I J" or "Base I"'); has[x] = true; });
        function body(t, iface) { return has[t] ? ' { ' + (iface ? 'default ' : 'public ') + 'String hello() { return "' + t + '"; } }' : ' { }'; }
        var code = [
          'interface I' + body('I', true),
          'interface J' + body('J', true),
          'interface K extends I' + body('K', true),
          'class Base' + body('Base', false),
          'class C extends Base implements J, K' + body('C', false),
          '',
          '// main:  System.out.println(new C().hello());'
        ].join('\n');
        var LINE = { I: 1, J: 2, K: 3, Base: 4, C: 5 };
        var nodes = [{ id: 'I', label: 'interface I', x: 18, y: 8, w: 22 }, { id: 'K', label: 'interface K', x: 18, y: 30, w: 22 }, { id: 'J', label: 'interface J', x: 50, y: 30, w: 22 }, { id: 'Base', label: 'class Base', x: 82, y: 30, w: 22 }, { id: 'C', label: 'class C', x: 50, y: 54, w: 22 }];
        var edges = [['K', 'I', 'extends'], ['C', 'K', 'implements'], ['C', 'J', 'implements'], ['C', 'Base', 'extends']];
        function g(hl, tags) { var t = {}; ALL.forEach(function (x) { if (has[x]) t[x] = 'has hello()'; }); Object.keys(tags || {}).forEach(function (k) { t[k] = tags[k]; }); var h2 = {}; Object.keys(hl || {}).forEach(function (k) { if (hl[k]) h2[k] = hl[k]; }); return hier('Type hierarchy', nodes, edges, h2, {}, t, 62); }
        function c(hl) { return { type: 'code', label: 'Declarations', lang: 'java', code: code, hl: hl }; }
        var frames = [];
        var defining = ALL.filter(function (x) { return has[x]; });
        frames.push({ narr: 'C extends class Base and implements J and K; K extends I. Types that define <code>hello()</code>: <b>' + (defining.length ? defining.join(', ') : 'none') + '</b>. Java applies three rules in order.', parts: [c({ 7: 'cur' }), g({})] });
        var winner = null, error = null, fix = null;
        if (has.C) { winner = 'C'; frames.push({ narr: '<b>Rule 0:</b> C declares <code>hello()</code> itself, so its own version is used. Nothing else matters.', parts: [c({ 5: 'ok' }), g({ C: 'ok' })] }); }
        else {
          frames.push({ narr: '<b>Rule 0:</b> C does not declare <code>hello()</code> itself. Look further.', parts: [c({ 5: 'cur' }), g({ C: 'cur' })] });
          if (has.Base) { winner = 'Base'; frames.push({ narr: '<b>Rule 1 — class wins:</b> superclass Base has a concrete <code>hello()</code>. A class method <b>always</b> beats interface defaults' + (has.I || has.J || has.K ? ' (so the defaults in ' + ['I', 'J', 'K'].filter(function (x) { return has[x]; }).join(', ') + ' are ignored)' : '') + '. This keeps old class code working when new defaults appear.', parts: [c({ 4: 'ok' }), g({ Base: 'ok', I: has.I ? 'done' : undefined, J: has.J ? 'done' : undefined, K: has.K ? 'done' : undefined })] }); }
          else {
            frames.push({ narr: '<b>Rule 1 — class wins:</b> no class in C\'s superclass chain (Base, Object) defines <code>hello()</code>. Move on to the interfaces.', parts: [c({ 4: 'cur' }), g({ Base: 'cur' })] });
            var cands = ['I', 'J', 'K'].filter(function (x) { return has[x]; });
            var removed = [];
            if (has.I && has.K) { cands = cands.filter(function (x) { return x !== 'I'; }); removed.push('I'); }
            var hl2 = {}; cands.forEach(function (x) { hl2[x] = 'cur'; }); removed.forEach(function (x) { hl2[x] = 'done'; });
            frames.push({ narr: '<b>Rule 2 — most specific interface wins:</b> ' + (removed.length ? 'K extends I and both define <code>hello()</code>, so K\'s version <b>overrides</b> I\'s; I is dropped. ' : '') + 'Remaining candidates: <b>' + (cands.length ? cands.join(', ') : 'none') + '</b>.', parts: [c((function () { var o = {}; cands.forEach(function (x) { o[LINE[x]] = 'cur'; }); removed.forEach(function (x) { o[LINE[x]] = 'done'; }); return o; })()), g(hl2)] });
            if (cands.length === 1) winner = cands[0];
            else if (cands.length === 0) error = '<span class="c-r">Compile error: cannot find symbol hello()</span> — nobody defines it.';
            else {
              error = '<span class="c-r">Compile error: class C inherits unrelated defaults for hello()</span> from ' + cands.join(' and ') + '. Neither is more specific, so Java refuses to guess.';
              fix = cands.map(function (x) { return x === 'I' ? 'K.super.hello()' : x + '.super.hello()'; });
            }
          }
        }
        if (winner) {
          frames.push({ narr: '<b>Result:</b> <code>new C().hello()</code> runs <b>' + winner + '</b>\'s version and prints <b>' + winner + '</b>. Try inputs: <code>I J</code> (conflict), <code>I K</code> (K wins), <code>Base J K</code> (class wins), <code>J</code>.', parts: [c(one(LINE[winner], 'sel')), g(one(winner, 'sel'), one(winner, 'WINNER')), out(winner)] });
        } else {
          frames.push({ narr: '<b>Result:</b> ' + error, parts: [c({ 5: 'bad', 7: 'bad' }), g({ C: 'bad' })] });
          if (fix) {
            frames.push({ narr: '<b>Fix:</b> C must override <code>hello()</code> and may delegate with <code>X.super.hello()</code>. Only <b>direct</b> superinterfaces can be named that way' + (has.I && !has.K ? ' — I is not a direct superinterface of C, so its default is reached as <code>K.super.hello()</code> (K inherits it)' : '') + '.', parts: [{ type: 'code', label: 'The fix inside class C', lang: 'java', code: 'class C extends Base implements J, K {\n    @Override public String hello() {\n        return ' + fix.join(' + "+" + ') + ';\n    }\n}', hl: { 2: 'ok', 3: 'ok' } }, g({ C: 'ok' }), out(fix.map(function (f) { return f.indexOf('K.super') === 0 ? (has.K ? 'K' : 'I') : f.charAt(0); }).join('+'))] });
          }
        }
        return frames;
      }
    },
    examples: [
      {
        title: 'Evolving an interface without breaking anyone',
        html: `<p>Version 1 of <code>PaymentGateway</code> had only <code>charge</code>. Version 2 adds <code>refund</code>. As an <b>abstract</b> method, every existing implementation (including ones in other companies' code) would stop compiling. As a <b>default</b> method with a safe fallback, old classes keep working and new ones can override.</p>`,
        code: `interface PaymentGateway {
    String charge(long paise);
    // added in v2 — existing implementations still compile
    default String refund(long paise) {
        return "refund of " + paise + " not supported by " + getClass().getSimpleName();
    }
}

class OldGateway implements PaymentGateway {              // written for v1, never edited
    public String charge(long paise) { return "charged " + paise; }
}

class NewGateway implements PaymentGateway {
    public String charge(long paise) { return "charged " + paise; }
    @Override public String refund(long paise) { return "refunded " + paise; }
}

public class Main {
    public static void main(String[] args) {
        System.out.println(new OldGateway().refund(500));   // refund of 500 not supported by OldGateway
        System.out.println(new NewGateway().refund(500));   // refunded 500
    }
}`
      },
      {
        title: 'Static interface methods are NOT inherited',
        html: `<p>Unlike static methods in classes, a static method of an interface is reachable <b>only</b> through the interface name. This avoids diamond confusion for statics.</p>
          ${H.table(['Call', 'Compiles?'], [['<code>Shapes.unitSquare()</code>', H.c('g', 'yes')], ['<code>Square.unitSquare()</code> (Square implements Shapes)', H.c('r', 'no — cannot find symbol')], ['<code>sq.unitSquare()</code>', H.c('r', 'no')]])}`,
        code: `interface Shapes {
    double area();
    static Shapes unitSquare() { return new Square(1); }   // factory lives on the interface
}

class Square implements Shapes {
    private final double side;
    Square(double side) { this.side = side; }
    public double area() { return side * side; }
}

public class Main {
    public static void main(String[] args) {
        System.out.println(Shapes.unitSquare().area());      // 1.0
        // System.out.println(Square.unitSquare());         // ERROR: static interface methods are not inherited
    }
}`
      },
      {
        title: 'Resolving a default-method conflict with X.super',
        html: `<p>Two unrelated interfaces both provide <code>describe()</code>. The class <b>must</b> override, and can combine both through <code>Interface.super.method()</code>.</p>`,
        code: `interface Camera { default String describe() { return "12MP camera"; } }
interface Phone  { default String describe() { return "5G phone"; } }

class SmartPhone implements Camera, Phone {
    @Override
    public String describe() {                               // required: otherwise compile error
        return Phone.super.describe() + " with " + Camera.super.describe();
    }
}

public class Main {
    public static void main(String[] args) {
        System.out.println(new SmartPhone().describe());     // 5G phone with 12MP camera
    }
}`
      },
      {
        title: 'Constants and a custom functional interface with lambdas',
        html: `<p>Fields in an interface are automatically <code>public static final</code>. A single-abstract-method interface works with lambdas and method references — the backbone of modern Java APIs.</p>`,
        code: `import java.util.*;

@FunctionalInterface
interface DiscountRule {
    int MAX_PERCENT = 50;                                    // implicitly public static final
    double apply(double price);                              // the one abstract method
    default DiscountRule then(DiscountRule next) { return p -> next.apply(apply(p)); }
}

public class Main {
    public static void main(String[] args) {
        DiscountRule festive = p -> p * 0.9;                 // lambda
        DiscountRule flat100 = p -> Math.max(0, p - 100);
        DiscountRule combo = festive.then(flat100);
        System.out.println(combo.apply(1000));               // 800.0
        System.out.println(DiscountRule.MAX_PERCENT);        // 50
    }
}`
      }
    ],
    deepDive: `<p><b>1. Why no state in interfaces?</b> Default methods give multiple inheritance of <i>behaviour</i>, but never of <i>state</i>. Two interfaces cannot each bring a field <code>name</code>, so the "which constructor runs, which field wins" diamond cannot happen. Defaults can only use other interface methods (abstract ones the class implements).</p>
      <p><b>2. Defaults cannot override Object's methods.</b> <code>default boolean equals(Object o)</code> is a compile error: by the "class wins" rule, <code>Object.equals</code> would always beat it anyway, so it would be dead code.</p>
      <p><b>3. Dispatch cost.</b> Interface calls compile to <code>invokeinterface</code>. HotSpot uses <b>itables</b> plus inline caches; after JIT warm-up a monomorphic interface call is as fast as a class call. Lambdas are created via <code>invokedynamic</code> + <code>LambdaMetafactory</code>, producing a hidden class that implements the interface.</p>
      <p><b>4. Marker interfaces.</b> <code>Serializable</code>, <code>Cloneable</code>, <code>RandomAccess</code> have no methods; they tag a type so code can check <code>instanceof</code>. Annotations do a similar job but cannot be used as a <i>type</i> in method parameters — a marker interface can.</p>
      <p><b>5. The constant-interface anti-pattern.</b> Implementing an interface just to use its constants leaks them into your public API forever. Prefer a <code>final</code> utility class or an <code>enum</code>, and <code>import static</code>.</p>
      <p><b>6. Default-method pitfalls.</b> A default added later can silently change behaviour of classes that happened to have a same-named method with a different meaning — or break them (Java 8's <code>Collection.removeIf</code> vs synchronized wrappers needed overrides for thread safety). Defaults are for evolution, not a substitute for abstract classes.</p>
      <p><b>7. Sealed interfaces + records (Java 17/21)</b> model closed sets of alternatives (<code>sealed interface Result permits Ok, Err</code>); combined with exhaustive pattern-matching <code>switch</code> they give algebraic data types in Java.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants produce interface + implementation pairs instantly (often too many: an <code>IUserService</code> for every class with exactly one implementation). They are also good at wiring lambdas and default-method combinators like <code>and()</code>/<code>then()</code>.</p>
      <p><b>Use AI as a partner:</b> <code>Which of these interfaces has only one implementation and adds no testing or extension value?</code> · <code>Explain which hello() runs here using the three diamond rules</code> · <code>Generate a sealed interface hierarchy for these API responses</code>.</p>
      <p><b>Where AI goes wrong:</b> trying to call a static interface method through an implementing class, writing <code>I.super.m()</code> for a non-direct superinterface, putting mutable "fields" in interfaces, or forgetting that implementations must be <code>public</code>.</p>
      <p><b>What you must still own:</b> designing small, focused interfaces (Interface Segregation), deciding interface vs abstract class, and knowing the diamond rules cold.</p>`,
    problems: [
      {
        title: 'Guided: Smart Bulb with Two Conflicting Defaults',
        level: 'Medium', tags: ['interfaces', 'default methods', 'diamond'], companies: ['Google', 'Samsung', 'Bosch'],
        statement: `<p>Two interfaces from different teams both provide a <code>default String status()</code>:</p>
          <ul><li><code>Switchable</code>: <code>"power:on"</code> / <code>"power:off"</code>, based on abstract <code>boolean isOn()</code>.</li>
          <li><code>Connectable</code>: <code>"wifi:up"</code> / <code>"wifi:down"</code>, based on abstract <code>boolean isConnected()</code>.</li></ul>
          <p>Write <code>SmartBulb implements Switchable, Connectable</code> whose <code>status()</code> returns both parts, e.g. <code>"power:on, wifi:down"</code>, <b>reusing</b> the interfaces' logic rather than copying it.</p>`,
        constraints: `Do not change the interfaces. Java 21.`,
        example: `<p>bulb on, wifi off → ${H.c('g', '"power:on, wifi:down"')}. Without an override in SmartBulb the class ${H.c('r', 'does not compile')}: it inherits two unrelated defaults for <code>status()</code>.</p>`,
        brute: {
          why: `<p>Overriding <code>status()</code> by <b>copy-pasting</b> both formats compiles, but the logic now lives in three places. When the Switchable team changes its format to <code>"PWR=1"</code>, the bulb keeps printing the old text and nobody notices.</p>`,
          code: `interface Switchable {
    boolean isOn();
    default String status() { return "power:" + (isOn() ? "on" : "off"); }
}

interface Connectable {
    boolean isConnected();
    default String status() { return "wifi:" + (isConnected() ? "up" : "down"); }
}

class SmartBulb implements Switchable, Connectable {
    boolean on = true, wifi = false;
    public boolean isOn() { return on; }
    public boolean isConnected() { return wifi; }
    @Override public String status() {                       // duplicated formatting logic
        return "power:" + (on ? "on" : "off") + ", wifi:" + (wifi ? "up" : "down");
    }
}

public class Main {
    public static void main(String[] args) {
        System.out.println(new SmartBulb().status());         // power:on, wifi:down
    }
}`
        },
        mcq: { q: 'Inside SmartBulb, how do you call Switchable\'s default status()?', options: ['Switchable.super.status()', 'super.status()', 'Switchable.status()', '((Switchable) this).status()'], answer: 0, explain: 'X.super.m() selects a direct superinterface\'s default. super.status() refers to the superclass (Object), Switchable.status() would mean a static method, and casting this still dispatches to SmartBulb.status() — infinite recursion.' },
        hints: [
          `<p>Hint 1: Rule 3 of the diamond: two unrelated interfaces, no class method → the class <b>must</b> override <code>status()</code>.</p>`,
          `<p>Hint 2: Inside the override you can still reach each default with <code>Switchable.super.status()</code> and <code>Connectable.super.status()</code>.</p>`,
          `<p>Hint 3: Watch the trap: <code>((Switchable) this).status()</code> calls SmartBulb's own override again → <code>StackOverflowError</code>. Recipe: override → join the two super calls with ", ".</p>`
        ],
        solution: {
          approach: `<p>Override <code>status()</code> in SmartBulb (forced by the compiler) and delegate to both interface defaults via <code>X.super.status()</code>. Each format stays owned by its interface; the bulb just composes them.</p>`,
          code: `interface Switchable {
    boolean isOn();
    default String status() { return "power:" + (isOn() ? "on" : "off"); }
}

interface Connectable {
    boolean isConnected();
    default String status() { return "wifi:" + (isConnected() ? "up" : "down"); }
}

class SmartBulb implements Switchable, Connectable {
    private boolean on, wifi;
    SmartBulb(boolean on, boolean wifi) { this.on = on; this.wifi = wifi; }
    public boolean isOn() { return on; }
    public boolean isConnected() { return wifi; }

    @Override
    public String status() {
        // reuse both defaults instead of copying their logic
        return Switchable.super.status() + ", " + Connectable.super.status();
    }
}

public class Main {
    public static void main(String[] args) {
        System.out.println(new SmartBulb(true, false).status());   // power:on, wifi:down
        Switchable s = new SmartBulb(false, true);
        System.out.println(s.status());                            // power:off, wifi:up  (dynamic dispatch)
    }
}`,
          dry: {
            head: ['call', 'resolves to', 'returns'],
            rows: [
              ['bulb.status()', 'SmartBulb.status (class wins)', '…'],
              ['Switchable.super.status()', 'Switchable default → isOn() = true', '"power:on"'],
              ['Connectable.super.status()', 'Connectable default → isConnected() = false', '"wifi:down"'],
              ['join', '', H.c('g', '"power:on, wifi:down"')]
            ]
          },
          complexity: `<p>O(1). The value is in maintainability: each format is defined exactly once.</p>`,
          followUps: ['What happens if SmartBulb extends a class <code>Device</code> that has <code>public String status()</code>?', 'Why can you not write <code>Object.super.toString()</code>-style calls for non-direct interfaces?', 'Make the interfaces sealed — who may implement them now?']
        }
      }
    ]
  });
registerModule({ id: 'java04', title: 'OOP Pillars in Java', intro: '<p>x</p>', goals: [], prereqs: 'x', hours: 12, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
