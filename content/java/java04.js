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
registerModule({ id: 'java04', title: 'OOP Pillars in Java', intro: '<p>x</p>', goals: [], prereqs: 'x', hours: 12, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
