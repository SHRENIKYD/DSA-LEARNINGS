(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- small helpers shared by the visualizers of this module ---------- */
  // A box node for architecture / dependency diagrams.
  function bx(id, label, x, y, w) {
    var n = { id: id, label: label, x: x, y: y, shape: 'box' };
    if (w) n.w = w;
    return n;
  }
  // Build a graph part. nodes: array of bx(...). edges: [[u, v, label?]].
  function gp(label, nodes, edges, hl, ehl, tags, height) {
    return { type: 'graph', label: label, directed: true, height: height || 60, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} };
  }
  // A Java code part with highlighted lines. hl: {lineNo: cls}
  var ALTS = {};   // python / TypeScript / C++ versions of the Java panes, keyed by the exact Java text (filled in near the end of this file)
  function mkAlt(py, ts, cpp, maps) {
    maps = maps || {};
    return { python: { code: py, map: maps.python || {} }, js: { lang: 'ts', code: ts, map: maps.ts || {} }, cpp: { code: cpp, map: maps.cpp || {} } };
  }
  function cp(label, lines, hl, alt) {
    var code = lines.join('\n');
    return { type: 'code', label: label, lang: 'java', code: code, hl: hl || {}, alt: alt || ALTS[code] };
  }
  // Highlight lines a..b (1-based, inclusive) with one class.
  function rng(a, b, cls, base) {
    var o = base || {};
    for (var i = a; i <= b; i++) o[i] = cls;
    return o;
  }
  // Split a comma / space separated list, trim, drop blanks.
  function splitList(input, def) {
    var s = String(input === undefined || input === null ? def : input).trim();
    if (!s) s = def;
    return s.split(/[,;\n]+/).map(function (x) { return x.trim(); }).filter(function (x) { return x.length > 0; });
  }
  // Shorten a label so boxes stay readable.
  function short(s, n) {
    s = String(s);
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }
  // Spread k items evenly between lo and hi.
  function spread(k, i, lo, hi) {
    if (k <= 1) return (lo + hi) / 2;
    return lo + (hi - lo) * i / (k - 1);
  }
  function clone(o) {
    var r = {};
    for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) r[k] = o[k];
    return r;
  }

  /* =====================================================================
     TOPIC 1 — DRY
     ===================================================================== */
  topics.push({
    title: 'DRY — Don\'t Repeat Yourself (one home for every rule)',
    analogy: `<p>Imagine your mum's new phone number is written on <b>five sticky notes</b>: on the fridge, in your wallet, in the car, at the office and in your diary. She changes her number. You update four notes and forget the one in the car. One day you are stuck on the road and call the <span class="c-r">old number</span>. Nobody answers.</p>
<p>If the number lived in <b>one place</b> (your phone's contacts) and everything else just said "see contacts", one update would fix everything. That is DRY: <b>every fact has one home</b>, and everybody else points to that home.</p>`,
    explain: `<p><b>DRY</b> was named by Andy Hunt and Dave Thomas in <i>The Pragmatic Programmer</i>. Their exact wording is worth remembering: <i>"Every piece of <b>knowledge</b> must have a single, unambiguous, authoritative representation within a system."</i></p>
<p>Notice the word <b>knowledge</b>, not "code". DRY is not "never type the same characters twice". It is "never store the same <b>business rule / fact / decision</b> in two places". Why does that matter? Because rules change. When a rule lives in 3 places, every change must be made 3 times, and the day somebody updates only 2 of them, your system <span class="c-r">disagrees with itself</span>. That is a real, very common source of bugs.</p>
${H.table(['Kind of duplication', 'Example', 'Fix'], [
  ['Copy-pasted logic', 'Same "10% off above ₹1000" <code>if</code> in Cart and Invoice', 'Extract Method / Extract Class (e.g. <code>DiscountPolicy</code>)'],
  ['Magic numbers', '<code>0.18</code> GST typed in 12 files', 'Named constant or config value'],
  ['Parallel <code>switch</code> on a type code', '<code>switch(type)</code> repeated in price, label and icon code', 'Polymorphism (one class per type)'],
  ['Duplicated data', 'Storing both <code>age</code> and <code>dateOfBirth</code>', 'Store DOB, <b>compute</b> age'],
  ['Comment repeating code', '<code>i++; // add one to i</code>', 'Delete the comment; explain <i>why</i>, not <i>what</i>'],
  ['Cross-layer rules', 'Password rule in React form + Java API + SQL CHECK', 'Generate both from one schema, or treat the server as the authority']
])}
<p><b>The big trap — accidental duplication.</b> Two pieces of code can <i>look</i> the same and still be <b>different knowledge</b>. Say GST is 18% and the late-payment fee is also 18%. Same number, different reasons. If you merge them into one constant <code>EIGHTEEN_PERCENT</code>, then the day the government changes GST, your late fee changes too. That is a new bug caused by "DRYing" too hard. Ask: <i>"If one changes, must the other change for the same reason?"</i> Only then merge.</p>
<p><b>Rule of Three</b> (a handy habit): the first time, just write it. The second time, wince but duplicate. The third time, extract. By the third copy you understand what really is common.</p>`,
    clues: [
      '"We changed the tax rate and one screen still shows the old price" → the rule lives in more than one place.',
      'Interviewer pastes two nearly identical methods and asks "what would you improve?" → DRY / Extract Method.',
      '"The same <code>switch (type)</code> appears in three classes" → duplicated knowledge of the type list.',
      'Magic numbers such as <code>0.18</code>, <code>86400</code>, <code>3</code> retries scattered in code → named constants / config.',
      '"Front-end and back-end validation disagree" → one source of truth for the rule (schema).',
      'Follow-up "could merging these two make things worse?" → they want you to mention accidental duplication and the wrong abstraction.'
    ],
    code: { lang: 'java', code: `// BEFORE: the "10% off when subtotal is above 1000" rule lives in TWO places.
// Money is kept in whole paise/cents (long) to avoid floating-point errors.
class CartBefore {
    long total(long subtotal) {
        if (subtotal > 100_000) return subtotal * 90 / 100;      // copy #1
        return subtotal;
    }
}
class InvoiceBefore {
    long amountDue(long subtotal) {
        if (subtotal >= 100_000) return subtotal - subtotal / 10; // copy #2 — note ">=" : they already disagree!
        return subtotal;
    }
}

// AFTER: one authoritative home for the rule.
final class DiscountPolicy {
    static final long THRESHOLD = 100_000;   // 1000.00 in paise
    static final int PERCENT_OFF = 10;
    private DiscountPolicy() {}               // no instances: just the rule
    static long apply(long subtotal) {
        if (subtotal <= THRESHOLD) return subtotal;
        return subtotal - subtotal * PERCENT_OFF / 100;
    }
}
class Cart    { long total(long subtotal)     { return DiscountPolicy.apply(subtotal); } }
class Invoice { long amountDue(long subtotal) { return DiscountPolicy.apply(subtotal); } }

class DryDemo {
    public static void main(String[] args) {
        // exactly at the threshold the OLD code gave two different answers
        System.out.println(new CartBefore().total(100_000) + " vs " + new InvoiceBefore().amountDue(100_000));
        System.out.println(new Cart().total(100_000) + " vs " + new Invoice().amountDue(100_000));
    }
}`, alt: [
        { lang: 'python', code: `# BEFORE: the "10% off when subtotal is above 1000" rule lives in TWO places.
# Money is kept in whole paise/cents (int) to avoid floating-point errors.
class CartBefore:
    def total(self, subtotal: int) -> int:
        if subtotal > 100_000:
            return subtotal * 90 // 100  # copy #1
        return subtotal


class InvoiceBefore:
    def amount_due(self, subtotal: int) -> int:
        if subtotal >= 100_000:
            return subtotal - subtotal // 10  # copy #2 - note ">=" : they already disagree!
        return subtotal


# AFTER: one authoritative home for the rule.
class DiscountPolicy:
    THRESHOLD = 100_000  # 1000.00 in paise
    PERCENT_OFF = 10

    @classmethod
    def apply(cls, subtotal: int) -> int:  # no instances: just the rule
        if subtotal <= cls.THRESHOLD:
            return subtotal
        return subtotal - subtotal * cls.PERCENT_OFF // 100


class Cart:
    def total(self, subtotal: int) -> int:
        return DiscountPolicy.apply(subtotal)


class Invoice:
    def amount_due(self, subtotal: int) -> int:
        return DiscountPolicy.apply(subtotal)


if __name__ == "__main__":
    # exactly at the threshold the OLD code gave two different answers
    print(f"{CartBefore().total(100_000)} vs {InvoiceBefore().amount_due(100_000)}")
    print(f"{Cart().total(100_000)} vs {Invoice().amount_due(100_000)}")` },
        { lang: 'ts', code: `// BEFORE: the "10% off when subtotal is above 1000" rule lives in TWO places.
// Money is kept in whole paise/cents (integers) to avoid floating-point errors.
class CartBefore {
  total(subtotal: number): number {
    if (subtotal > 100_000) return Math.floor((subtotal * 90) / 100); // copy #1
    return subtotal;
  }
}
class InvoiceBefore {
  amountDue(subtotal: number): number {
    if (subtotal >= 100_000) return subtotal - Math.floor(subtotal / 10); // copy #2 - note ">=" : they already disagree!
    return subtotal;
  }
}

// AFTER: one authoritative home for the rule.
class DiscountPolicy {
  static readonly THRESHOLD = 100_000; // 1000.00 in paise
  static readonly PERCENT_OFF = 10;
  private constructor() {} // no instances: just the rule
  static apply(subtotal: number): number {
    if (subtotal <= DiscountPolicy.THRESHOLD) return subtotal;
    return subtotal - Math.floor((subtotal * DiscountPolicy.PERCENT_OFF) / 100);
  }
}
class Cart { total(subtotal: number): number { return DiscountPolicy.apply(subtotal); } }
class Invoice { amountDue(subtotal: number): number { return DiscountPolicy.apply(subtotal); } }

// exactly at the threshold the OLD code gave two different answers
console.log(\`\${new CartBefore().total(100_000)} vs \${new InvoiceBefore().amountDue(100_000)}\`);
console.log(\`\${new Cart().total(100_000)} vs \${new Invoice().amountDue(100_000)}\`);` },
        { lang: 'cpp', code: `// BEFORE: the "10% off when subtotal is above 1000" rule lives in TWO places.
// Money is kept in whole paise/cents (long long) to avoid floating-point errors.
class CartBefore {
public:
    long long total(long long subtotal) const {
        if (subtotal > 100'000) return subtotal * 90 / 100;      // copy #1
        return subtotal;
    }
};
class InvoiceBefore {
public:
    long long amountDue(long long subtotal) const {
        if (subtotal >= 100'000) return subtotal - subtotal / 10; // copy #2 - note ">=" : they already disagree!
        return subtotal;
    }
};

// AFTER: one authoritative home for the rule.
class DiscountPolicy final {
public:
    static constexpr long long THRESHOLD = 100'000;   // 1000.00 in paise
    static constexpr int PERCENT_OFF = 10;
    DiscountPolicy() = delete;                         // no instances: just the rule
    static long long apply(long long subtotal) {
        if (subtotal <= THRESHOLD) return subtotal;
        return subtotal - subtotal * PERCENT_OFF / 100;
    }
};
class Cart { public: long long total(long long subtotal) const { return DiscountPolicy::apply(subtotal); } };
class Invoice { public: long long amountDue(long long subtotal) const { return DiscountPolicy::apply(subtotal); } };

int main() {
    // exactly at the threshold the OLD code gave two different answers
    cout << CartBefore().total(100'000) << " vs " << InvoiceBefore().amountDue(100'000) << "\\n";
    cout << Cart().total(100'000) << " vs " << Invoice().amountDue(100'000) << "\\n";
}` }
      ] },
    codeTitle: 'Two copies of a rule drift apart; one DiscountPolicy fixes it',
    viz: [{
      title: 'Dependency graph: copies of a rule vs one home',
      input: 'Signup, Checkout, Profile, Admin',
      inputLabel: 'Screens that validate an email (2 to 5, comma separated)',
      gen: function (input) {
        var places = splitList(input, 'Signup, Checkout, Profile, Admin');
        if (places.length < 2 || places.length > 5) throw new Error('Give 2 to 5 screen names, comma separated, e.g. Signup, Checkout, Profile');
        var n = places.length, frames = [];
        var callers = [], copies = [];
        places.forEach(function (p, i) {
          var x = spread(n, i, 12, 88);
          callers.push(bx('C' + i, short(p, 10), x, 10));
          copies.push(bx('R' + i, 'rule copy ' + (i + 1), x, 34));
        });
        function before(hlCopies, tags, ehl) {
          var edges = [];
          for (var i = 0; i < n; i++) edges.push(['C' + i, 'R' + i, 'owns']);
          return gp('BEFORE — each screen carries its own copy of the email rule', callers.concat(copies), edges, hlCopies, ehl || {}, tags || {}, 46);
        }
        var allBad = {}, eBad = {};
        for (var i = 0; i < n; i++) { eBad['C' + i + '-R' + i] = 'bad'; }
        frames.push({ narr: 'We have <b>' + n + '</b> screens. Each one pasted the same email check (<code>contains("@")</code> and no <code>+</code>). The graph shows every screen owning a private copy — ' + n + ' places hold the <b>same knowledge</b>.', parts: [before({}, {}, eBad), { type: 'vars', label: 'cost of one rule change', vals: { placesToEdit: n, updated: 0, missed: 0 } }] });
        var hlAll = {};
        for (i = 0; i < n; i++) hlAll['R' + i] = 'cur';
        frames.push({ narr: 'Product says: "emails with a <code>+tag</code> (like <code>asha+shop@mail.com</code>) must now be allowed". Every copy (amber) must change. A developer starts editing them one by one…', parts: [before(hlAll, {}, eBad), { type: 'vars', label: 'cost of one rule change', vals: { placesToEdit: n, updated: 0, missed: 0 } }] });
        var hl = clone(hlAll), tags = {};
        for (i = 0; i < n - 1; i++) {
          hl['R' + i] = 'ok'; tags['R' + i] = 'updated';
          frames.push({ narr: 'Copy ' + (i + 1) + ' in <b>' + H.esc(places[i]) + '</b> updated (green). ' + (n - 1 - i) + ' still to go. Nothing reminds the developer how many copies exist — they must <i>remember</i> or <i>grep</i>.', parts: [before(clone(hl), clone(tags), eBad), { type: 'vars', label: 'cost of one rule change', vals: { placesToEdit: n, updated: i + 1, missed: 0 }, hl: { updated: 'ok' } }] });
        }
        hl['R' + (n - 1)] = 'bad'; tags['R' + (n - 1)] = 'FORGOTTEN';
        frames.push({ narr: '<span class="c-r">The last copy in <b>' + H.esc(places[n - 1]) + '</b> was missed.</span> Now the system disagrees with itself: a user can sign up with a <code>+tag</code> email but gets "invalid email" on ' + H.esc(places[n - 1]) + '. This is the classic DRY bug.', parts: [before(clone(hl), clone(tags), eBad), { type: 'vars', label: 'cost of one rule change', vals: { placesToEdit: n, updated: n - 1, missed: 1 }, hl: { missed: 'bad' } }] });
        var rule = bx('E', 'EmailRule', 50, 36);
        var aEdges = [], aE = {};
        for (i = 0; i < n; i++) { aEdges.push(['C' + i, 'E', 'uses']); aE['C' + i + '-E'] = 'ok'; }
        frames.push({ narr: '<b>Refactor:</b> Extract Class. The rule moves into <b>one</b> class <code>EmailRule.isValid(email)</code>. Every screen now <i>points to</i> it instead of owning a copy. The ' + n + ' private copies are deleted.', parts: [gp('AFTER — one authoritative home', callers.concat([rule]), aEdges, { E: 'sel' }, aE, { E: 'single source of truth' }, 46), cp('Refactor step', ['// before (in every screen)', 'if (!email.contains("@") || email.contains("+")) error();', '', '// after (in every screen)', 'if (!EmailRule.isValid(email)) error();'], { 2: 'bad', 5: 'ok' })] });
        frames.push({ narr: 'Next rule change ("block disposable domains"): edit <b>one</b> file. All ' + n + ' screens get it for free. The graph turned from <b>' + n + ' red ownership edges</b> into ' + n + ' green "uses" edges pointing at one node.', parts: [gp('AFTER — change once', callers.concat([rule]), aEdges, { E: 'ok' }, aE, { E: 'changed once' }, 46), { type: 'vars', label: 'cost of one rule change', vals: { placesToEdit: 1, updated: 1, missed: 0 }, hl: { placesToEdit: 'ok' } }] });
        frames.push({ narr: 'Summary table. Notice the trade-off DRY introduces: every screen now <b>depends</b> on <code>EmailRule</code>. That coupling is good here because they must all follow the same rule. If two screens only <i>looked</i> alike but had different rules, sharing would be a mistake (accidental duplication).', parts: [{ type: 'table', label: 'Before vs after', columns: ['', 'Before', 'After'], rows: [['Places holding the rule', String(n), '1'], ['Edits per change', String(n), '1'], ['Risk of forgetting one', 'high', 'none'], ['New coupling', 'none', 'all screens → EmailRule']], hl: { 0: 'sel' } }] });
        return frames;
      }
    }, {
      title: 'Step through an Extract Method refactor',
      gen: function () {
        var src = [
          'class ReportService {',
          '  String daily(List<Integer> s) {',
          '    int sum = 0;',
          '    for (int x : s) sum += x;',
          '    double avg = s.isEmpty() ? 0 : (double) sum / s.size();',
          '    return "Daily avg " + avg;',
          '  }',
          '  String weekly(List<Integer> s) {',
          '    int sum = 0;',
          '    for (int x : s) sum += x;',
          '    double avg = s.isEmpty() ? 0 : (double) sum / s.size();',
          '    return "Weekly avg " + avg;',
          '  }',
          '}'
        ];
        var after = [
          'class ReportService {',
          '  String daily(List<Integer> s)  { return "Daily avg " + average(s); }',
          '  String weekly(List<Integer> s) { return "Weekly avg " + average(s); }',
          '',
          '  // ONE home for "how we average sales"',
          '  private double average(List<Integer> s) {',
          '    if (s.isEmpty()) return 0;',
          '    int sum = 0;',
          '    for (int x : s) sum += x;',
          '    return (double) sum / s.size();',
          '  }',
          '}'
        ];
        return [
          { narr: 'Two report methods. Read them slowly — lines 3-5 and 9-11 are the <b>same knowledge</b>: "how we compute an average of sales".', parts: [cp('ReportService (smelly)', src, {})] },
          { narr: 'Highlight the duplicate block in <code>daily</code> (amber) and in <code>weekly</code> (red copy). If the business decides to <i>ignore refunds (negative values)</i>, both must change.', parts: [cp('ReportService (smelly)', src, rng(9, 11, 'bad', rng(3, 5, 'cur')))] },
          { narr: 'Ask the DRY question: <i>"If one changes, must the other change for the same reason?"</i> Yes — both are "average of sales". So this is <b>real</b> duplication, safe to merge. (The return lines differ only in a label, which is data, not logic.)', parts: [cp('ReportService (smelly)', src, rng(9, 11, 'win', rng(3, 5, 'win', { 6: 'done', 12: 'done' })))] },
          { narr: '<b>Extract Method</b>: move the block into <code>average(s)</code> (lines 6-11). The empty-list guard becomes an early return — easier to read.', parts: [cp('ReportService (refactored)', after, rng(6, 11, 'ok'))] },
          { narr: 'Callers shrink to one line each and read like English. Any future change to averaging (ignore refunds, use <code>long</code> to avoid overflow) happens in one place.', parts: [cp('ReportService (refactored)', after, { 2: 'sel', 3: 'sel' })] },
          { narr: 'Refactoring rule: behaviour must not change. Run the tests before and after — same outputs for empty list, one element, many elements.', parts: [{ type: 'table', label: 'Same behaviour check', columns: ['input', 'daily before', 'daily after'], rows: [['[]', 'Daily avg 0.0', 'Daily avg 0.0'], ['[4]', 'Daily avg 4.0', 'Daily avg 4.0'], ['[1,2]', 'Daily avg 1.5', 'Daily avg 1.5']], hl: { 0: 'ok', 1: 'ok', 2: 'ok' } }] }
        ];
      }
    }],
    examples: [
      { title: 'Magic number → named constant', html: `<p>A delivery app has <code>if (km &gt; 7)</code> in the fee code, the ETA code and the "free delivery" banner. Marketing changes the free radius to 10 km. Two places get updated; the banner still says 7 km. Fix: <code>static final int FREE_DELIVERY_KM = 10;</code> in one place (or a config value). The constant also <b>documents</b> what 7 meant.</p>`, code: { lang: 'java', code: `final class DeliveryRules {
    static final int FREE_DELIVERY_KM = 10;
    private DeliveryRules() {}
    static boolean isFree(int km) { return km <= FREE_DELIVERY_KM; }
}`, alt: [
          { lang: 'python', code: `class DeliveryRules:
    FREE_DELIVERY_KM = 10

    @classmethod
    def is_free(cls, km: int) -> bool:
        return km <= cls.FREE_DELIVERY_KM` },
          { lang: 'ts', code: `class DeliveryRules {
  static readonly FREE_DELIVERY_KM = 10;
  private constructor() {}
  static isFree(km: number): boolean { return km <= DeliveryRules.FREE_DELIVERY_KM; }
}` },
          { lang: 'cpp', code: `class DeliveryRules final {
public:
    static constexpr int FREE_DELIVERY_KM = 10;
    DeliveryRules() = delete;
    static bool isFree(int km) { return km <= FREE_DELIVERY_KM; }
};` }
        ] } },
      { title: 'Accidental duplication — do NOT merge', html: `<p>${H.c('y', 'Looks the same:')} <code>gstRate = 0.18</code> and <code>lateFeeRate = 0.18</code>. ${H.c('r', 'Different knowledge:')} one is set by the government, the other by your finance team. Merging them into one constant means a GST change silently changes late fees. Keep two constants with two names. DRY is about <b>reasons to change</b>, not matching text.</p>` },
      { title: 'Derived data: store the fact once', html: `<p>A <code>User</code> table stores <code>dateOfBirth</code> <b>and</b> <code>age</code>. After a birthday, <code>age</code> is wrong unless a nightly job fixes it. The age is <i>derived</i> knowledge. Store only the DOB and compute the age when needed.</p>`, code: { lang: 'java', code: `record User(String name, LocalDate dateOfBirth) {
    int ageOn(LocalDate today) { return Period.between(dateOfBirth, today).getYears(); }
}`, alt: [
          { lang: 'python', code: `from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class User:
    name: str
    date_of_birth: date

    def age_on(self, today: date) -> int:
        had_birthday = (today.month, today.day) >= (self.date_of_birth.month, self.date_of_birth.day)
        return today.year - self.date_of_birth.year - (0 if had_birthday else 1)` },
          { lang: 'ts', code: `class User {
  // dateOfBirth is an ISO date such as "1990-06-15"; only the age is derived, never stored
  constructor(readonly name: string, readonly dateOfBirth: string) {}

  ageOn(today: string): number {
    const [by, bm, bd] = this.dateOfBirth.split("-").map(Number);
    const [ty, tm, td] = today.split("-").map(Number);
    const hadBirthday = tm > bm || (tm === bm && td >= bd);
    return ty - by - (hadBirthday ? 0 : 1);
  }
}` },
          { lang: 'cpp', code: `struct User {
    string name;
    chrono::year_month_day dateOfBirth;

    int ageOn(chrono::year_month_day today) const {
        bool hadBirthday = today.month() > dateOfBirth.month() ||
                           (today.month() == dateOfBirth.month() && today.day() >= dateOfBirth.day());
        return int(today.year()) - int(dateOfBirth.year()) - (hadBirthday ? 0 : 1);
    }
};` }
        ] } },
      { title: 'DRY in tests vs DAMP', html: `<p>Test code follows a softer rule: <b>DAMP</b> ("Descriptive And Meaningful Phrases"). It is fine to repeat a few setup lines so each test reads on its own. Hiding everything in a giant shared <code>setUp()</code> makes a failing test hard to understand. Do extract <i>helpers</i> such as <code>anOrderWith(items)</code>, which keep both DRY and readability.</p>` }
    ],
    deepDive: `<p><b>DRY versus the wrong abstraction.</b> Sandi Metz's well-known line: <i>"duplication is far cheaper than the wrong abstraction"</i>. Here is how it goes wrong. Two similar methods get merged into one. A new caller needs a small difference, so somebody adds a boolean parameter. Then another one. After a year the shared method has 5 flags and 30 branches, and nobody dares touch it. The cure is to <b>inline the abstraction back</b> into each caller and re-extract only what is truly shared. Kent C. Dodds calls the habit <b>AHA</b>: "Avoid Hasty Abstractions".</p>
<p><b>DRY creates coupling.</b> Sharing code means every user now depends on it. Inside one service that is cheap. Across microservices, a shared "common" library with business rules makes teams release together, which is the <i>distributed monolith</i> problem. Many teams accept some duplication <i>between</i> services (each owns its own copy of a DTO) to keep them independently deployable, while staying strictly DRY <i>inside</i> each service.</p>
<p><b>Single source of truth for data</b> is DRY applied to storage: database normalization, one service owning each entity, caches that are clearly <i>copies</i> with an invalidation story. When you <i>must</i> copy (caches, read replicas, denormalized read models in CQRS), make the copy <b>generated</b> from the source, never hand-edited.</p>
<p><b>Generators</b> are a DRY tool: OpenAPI or Protobuf schemas generate client and server types, so the contract lives in one file. Value-type features DRY up <code>equals/hashCode/toString</code> boilerplate (Java <code>record</code>, Python <code>@dataclass</code>, C++ defaulted <code>operator==</code>). Enums with fields DRY up parallel <code>switch</code> statements.</p>
<p><b>Measuring:</b> tools like PMD's CPD (copy-paste detector), SonarQube duplication %, and IntelliJ's "Duplicated code fragment" inspection find textual copies. They cannot find <i>knowledge</i> duplication written in different words (like <code>&gt; 1000</code> vs <code>&gt;= 1000</code> above). That needs human review.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI assistants make copying almost free. Ask for "a validator for the checkout form" in three different files and you will often get three slightly different validators. Industry analyses of AI-heavy repositories (for example GitClear's code-quality reports) have shown copy-pasted lines rising and "moved"/refactored lines falling. So DRY review matters <b>more</b>, not less.</p>
<p><b>Use AI as a partner:</b> paste a package and ask <code>List every business rule (numbers, thresholds, formats) that appears in more than one place, with file names. Do not change code.</code> Then decide yourself which are real duplicates. Ask it to draft the Extract Method and the unit tests that prove behaviour is unchanged.</p>
<p><b>Where AI goes wrong:</b> it happily merges <i>accidental</i> duplicates (same number, different meaning), and it often "fixes" duplication by adding boolean flags to one function, creating the wrong abstraction. It also tends to add a new helper instead of finding the existing one, so you end up with <code>isValidEmail</code>, <code>validateEmail</code> and <code>EmailUtil.check</code>.</p>
<p><b>What you must still own:</b> knowing <i>which knowledge</i> belongs together, naming the single home well, and saying no to over-DRYing across service boundaries.</p>`,
    problems: [{
      title: 'Shipping fee rule copied in three services',
      level: 'Easy', tags: ['DRY', 'extract class', 'magic numbers'], companies: ['Flipkart', 'Amazon'],
      statement: `<p>An online shop computes the shipping fee in <b>three</b> places: <code>CartService</code> (shows the fee), <code>CheckoutService</code> (charges it) and <code>EmailService</code> (prints it in the receipt). The rule is: <b>free if order ≥ ₹500</b>, otherwise <b>₹40</b>, plus <b>₹30</b> extra for express. Customers complain that the receipt fee sometimes differs from what they were charged. Find the smell and refactor so the rule has one home.</p>`,
      constraints: `Amounts are whole rupees (<code>int</code>). Behaviour must stay identical to <code>CheckoutService</code> (the one that actually charges money). Keep the three services; only their insides may change.`,
      example: `<p>Order ₹500, standard → fee ${H.c('g', '0')} in checkout, but the email copy used <code>&gt; 500</code> and printed ${H.c('r', '40')}. The two copies disagree exactly at the boundary. After the refactor all three print ${H.c('g', '0')}.</p>`,
      brute: {
        why: `<p>The smelly design: three copies of the same knowledge, with magic numbers. They have already drifted (<code>&gt;=</code> vs <code>&gt;</code>, and the email copy forgot express). Every rule change costs 3 edits and one missed edit is a customer-facing bug. It "works" today, which is why such duplication survives so long.</p>`,
        code: { lang: 'java', code: `class CartService {
    int fee(int order, boolean express) {
        int f = order >= 500 ? 0 : 40;
        return express ? f + 30 : f;
    }
}
class CheckoutService {
    int fee(int order, boolean express) {
        int f = 0;
        if (order < 500) f = 40;
        if (express) f += 30;
        return f;
    }
}
class EmailService {
    String receiptLine(int order, boolean express) {
        int f = order > 500 ? 0 : 40;          // drifted: > instead of >=, and express forgotten
        return "Shipping: Rs " + f;
    }
}`, alt: [
                { lang: 'python', code: `
class CartService:
    def fee(self, order, express):
        f = 0 if order >= 500 else 40
        return f + 30 if express else f

class CheckoutService:
    def fee(self, order, express):
        f = 0
        if order < 500: f = 40
        if express: f += 30
        return f

class EmailService:
    def receipt_line(self, order, express):
        f = 0 if order > 500 else 40          # drifted: > instead of >=, and express forgotten
        return f"Shipping: Rs {f}"` },
                { lang: 'ts', code: `
class CartService {
    fee(order: number, express: boolean): number {
        const f = order >= 500 ? 0 : 40;
        return express ? f + 30 : f;
    }
}
class CheckoutService {
    fee(order: number, express: boolean): number {
        let f = 0;
        if (order < 500) f = 40;
        if (express) f += 30;
        return f;
    }
}
class EmailService {
    receiptLine(order: number, express: boolean): string {
        const f = order > 500 ? 0 : 40;          // drifted: > instead of >=, and express forgotten
        return "Shipping: Rs " + f;
    }
}` },
                { lang: 'cpp', code: `
struct CartService {
    int fee(int order, bool express) {
        int f = order >= 500 ? 0 : 40;
        return express ? f + 30 : f;
    }
};
struct CheckoutService {
    int fee(int order, bool express) {
        int f = 0;
        if (order < 500) f = 40;
        if (express) f += 30;
        return f;
    }
};
struct EmailService {
    string receiptLine(int order, bool express) {
        int f = order > 500 ? 0 : 40;          // drifted: > instead of >=, and express forgotten
        return "Shipping: Rs " + to_string(f);
    }
};` }
              ] }
      },
      mcq: { q: 'What is the most important thing to fix first?', options: ['Rename the methods to calculateShippingFee', 'Give the shipping rule a single home that all three services call', 'Convert int to double for precision', 'Add comments explaining the rule in each class'], answer: 1, explain: 'The bug comes from the same knowledge living in 3 places. Comments would be a 4th copy; renaming does not stop drift.' },
      hints: [
        `<p>Hint 1: Write down the rule in one English sentence. Every place that encodes that sentence is a copy of the same knowledge.</p>`,
        `<p>Hint 2: Create a small <code>ShippingPolicy</code> class with named constants (<code>FREE_ABOVE</code>, <code>STANDARD_FEE</code>, <code>EXPRESS_SURCHARGE</code>) and one method <code>feeFor(order, express)</code>.</p>`,
        `<p>Hint 3: Pick the charging code as the truth (<code>&gt;= 500</code> is free, express always adds 30). Inject the policy into each service so tests can swap it. Check the boundary 499 / 500 and express on a free order.</p>`
      ],
      tests: { io: true, cases: [{ stdin: '', stdout: "499 -> charged 70, Shipping: Rs 70\n500 -> charged 30, Shipping: Rs 30\n501 -> charged 30, Shipping: Rs 30\nstandard: cart 40, checkout 0\n" }] },
      solution: {
        approach: `<p><b>Spot:</b> three copies of one business rule plus magic numbers → DRY violation that already caused drift. <b>Refactor:</b> Extract Class <code>ShippingPolicy</code> holding the constants and the single formula, taken from <code>CheckoutService</code> because that is what customers are charged. Each service receives the policy in its constructor (so a test or a festival promotion can pass a different one) and delegates. The receipt now prints exactly what was charged.</p>
<p><b>Why this is better:</b> one edit per rule change; the boundary is decided once; the constants explain themselves. <b>Trade-off:</b> three services now depend on <code>ShippingPolicy</code>, which is correct because they must agree.</p>`,
        code: `final class ShippingPolicy {
    static final int FREE_ABOVE = 500;        // order value (inclusive) that ships free
    static final int STANDARD_FEE = 40;
    static final int EXPRESS_SURCHARGE = 30;

    int feeFor(int orderValue, boolean express) {
        int fee = orderValue >= FREE_ABOVE ? 0 : STANDARD_FEE;
        return express ? fee + EXPRESS_SURCHARGE : fee;
    }
}

class CartService {
    private final ShippingPolicy policy;
    CartService(ShippingPolicy policy) { this.policy = policy; }
    int fee(int order, boolean express) { return policy.feeFor(order, express); }
}
class CheckoutService {
    private final ShippingPolicy policy;
    CheckoutService(ShippingPolicy policy) { this.policy = policy; }
    int fee(int order, boolean express) { return policy.feeFor(order, express); }
}
class EmailService {
    private final ShippingPolicy policy;
    EmailService(ShippingPolicy policy) { this.policy = policy; }
    String receiptLine(int order, boolean express) { return "Shipping: Rs " + policy.feeFor(order, express); }
}

class ShippingDemo {
    public static void main(String[] args) {
        ShippingPolicy p = new ShippingPolicy();
        CartService cart = new CartService(p);
        CheckoutService checkout = new CheckoutService(p);
        EmailService email = new EmailService(p);
        int[] orders = {499, 500, 501};
        for (int o : orders) {
            System.out.println(o + " -> charged " + checkout.fee(o, true) + ", " + email.receiptLine(o, true));
        }
        System.out.println("standard: cart " + cart.fee(499, false) + ", checkout " + checkout.fee(500, false));
    }
}`,
        alt: [
          { lang: 'python', code: `class ShippingPolicy:
    FREE_ABOVE = 500  # order value (inclusive) that ships free
    STANDARD_FEE = 40
    EXPRESS_SURCHARGE = 30

    def fee_for(self, order_value: int, express: bool) -> int:
        fee = 0 if order_value >= self.FREE_ABOVE else self.STANDARD_FEE
        return fee + self.EXPRESS_SURCHARGE if express else fee


class CartService:
    def __init__(self, policy: ShippingPolicy) -> None:
        self._policy = policy

    def fee(self, order: int, express: bool) -> int:
        return self._policy.fee_for(order, express)


class CheckoutService:
    def __init__(self, policy: ShippingPolicy) -> None:
        self._policy = policy

    def fee(self, order: int, express: bool) -> int:
        return self._policy.fee_for(order, express)


class EmailService:
    def __init__(self, policy: ShippingPolicy) -> None:
        self._policy = policy

    def receipt_line(self, order: int, express: bool) -> str:
        return f"Shipping: Rs {self._policy.fee_for(order, express)}"


if __name__ == "__main__":
    policy = ShippingPolicy()
    cart = CartService(policy)
    checkout = CheckoutService(policy)
    email = EmailService(policy)
    for order in (499, 500, 501):
        print(f"{order} -> charged {checkout.fee(order, True)}, {email.receipt_line(order, True)}")
    print(f"standard: cart {cart.fee(499, False)}, checkout {checkout.fee(500, False)}")` },
          { lang: 'ts', code: `class ShippingPolicy {
  static readonly FREE_ABOVE = 500; // order value (inclusive) that ships free
  static readonly STANDARD_FEE = 40;
  static readonly EXPRESS_SURCHARGE = 30;

  feeFor(orderValue: number, express: boolean): number {
    const fee = orderValue >= ShippingPolicy.FREE_ABOVE ? 0 : ShippingPolicy.STANDARD_FEE;
    return express ? fee + ShippingPolicy.EXPRESS_SURCHARGE : fee;
  }
}

class CartService {
  constructor(private readonly policy: ShippingPolicy) {}
  fee(order: number, express: boolean): number { return this.policy.feeFor(order, express); }
}
class CheckoutService {
  constructor(private readonly policy: ShippingPolicy) {}
  fee(order: number, express: boolean): number { return this.policy.feeFor(order, express); }
}
class EmailService {
  constructor(private readonly policy: ShippingPolicy) {}
  receiptLine(order: number, express: boolean): string { return \`Shipping: Rs \${this.policy.feeFor(order, express)}\`; }
}

const policy = new ShippingPolicy();
const cart = new CartService(policy);
const checkout = new CheckoutService(policy);
const email = new EmailService(policy);
for (const order of [499, 500, 501]) {
  console.log(\`\${order} -> charged \${checkout.fee(order, true)}, \${email.receiptLine(order, true)}\`);
}
console.log(\`standard: cart \${cart.fee(499, false)}, checkout \${checkout.fee(500, false)}\`);` },
          { lang: 'cpp', code: `class ShippingPolicy {
public:
    static constexpr int FREE_ABOVE = 500;   // order value (inclusive) that ships free
    static constexpr int STANDARD_FEE = 40;
    static constexpr int EXPRESS_SURCHARGE = 30;

    int feeFor(int orderValue, bool express) const {
        int fee = orderValue >= FREE_ABOVE ? 0 : STANDARD_FEE;
        return express ? fee + EXPRESS_SURCHARGE : fee;
    }
};

class CartService {
    const ShippingPolicy& policy_;
public:
    explicit CartService(const ShippingPolicy& policy) : policy_(policy) {}
    int fee(int order, bool express) const { return policy_.feeFor(order, express); }
};
class CheckoutService {
    const ShippingPolicy& policy_;
public:
    explicit CheckoutService(const ShippingPolicy& policy) : policy_(policy) {}
    int fee(int order, bool express) const { return policy_.feeFor(order, express); }
};
class EmailService {
    const ShippingPolicy& policy_;
public:
    explicit EmailService(const ShippingPolicy& policy) : policy_(policy) {}
    string receiptLine(int order, bool express) const { return "Shipping: Rs " + to_string(policy_.feeFor(order, express)); }
};

int main() {
    ShippingPolicy policy;
    CartService cart(policy);
    CheckoutService checkout(policy);
    EmailService email(policy);
    for (int order : {499, 500, 501}) {
        cout << order << " -> charged " << checkout.fee(order, true) << ", " << email.receiptLine(order, true) << "\\n";
    }
    cout << "standard: cart " << cart.fee(499, false) << ", checkout " << checkout.fee(500, false) << "\\n";
}` }
        ],
        complexity: `<p>Runtime is O(1) either way. The real metric is <b>change cost</b>: before, 3 edits per rule change with drift risk; after, 1 edit and 0 drift.</p>`,
        followUps: ['How would you let marketing change FREE_ABOVE without a deploy? (config / feature flag, still one source)', 'Should ShippingPolicy be an interface? Only when a second real policy appears (YAGNI).', 'Write the boundary tests: 499, 500, express on a free order.']
      }
    }]
  });

  /* =====================================================================
     TOPIC 2 — KISS & YAGNI
     ===================================================================== */
  topics.push({
    title: 'KISS & YAGNI — simple first, build only what is needed',
    analogy: `<p>You live alone and want a place to sleep. One friend says: "Build a 6-bedroom house with a helipad — you <i>might</i> get married, have five kids and buy a helicopter." You would pay for, clean and repair all those empty rooms for years, and when the family finally arrives they want a garden, not a helipad.</p>
<p><b>YAGNI</b> ("You Aren't Gonna Need It") says: build the one-bedroom flat now, and keep it <b>easy to extend</b>. <b>KISS</b> ("Keep It Simple, Stupid") says: make that flat plain and obvious — a door that opens by pushing, not a fingerprint-and-voice door that nobody can fix.</p>`,
    explain: `<p><b>KISS</b> came from engineering (often credited to Kelly Johnson at Lockheed): a design should be simple enough that an average mechanic can repair it in the field with basic tools. In code: prefer the <b>most straightforward</b> solution a teammate can read in one go. Simple does <i>not</i> mean "quick and dirty" — it means <b>few moving parts</b> and <b>no cleverness that needs a comment to decode</b>.</p>
<p><b>YAGNI</b> comes from Extreme Programming (Ron Jeffries): <i>"Always implement things when you actually need them, never when you just foresee that you need them."</i> It targets <b>speculative features and hooks</b>: plug-in systems with one plug-in, interfaces with one implementation "for later", config flags nobody toggles, generic <code>Repository&lt;T, ID&gt;</code> with 12 methods when you call one.</p>
<p>Martin Fowler lists four costs of a feature built "just in case":</p>
${H.table(['Cost', 'Plain meaning', 'Example'], [
  ['Cost of build', 'Time spent writing it', '2 weeks on a plug-in loader'],
  ['Cost of delay', 'The feature you actually needed shipped later', 'Checkout bug fix waited for the plug-in work'],
  ['Cost of carry', 'Every reader and every change must work around it', 'Each new feature must also "support plug-ins"'],
  ['Cost of repair', 'When the real need arrives it is different, so you rework it', 'Real plug-ins needed sandboxing you did not design for']
])}
<p>And there is a fifth: often the feature is <b>never needed</b> at all, so all of it was waste.</p>
<p><b>How they fit together:</b> YAGNI decides <i>what</i> to build (only today's needs). KISS decides <i>how</i> to build it (the plainest way). Together they leave you with less code, and less code is easier to change when tomorrow's real need shows up.</p>
<p><b>What YAGNI is NOT:</b> it is not an excuse to skip tests, skip refactoring, or write messy code. Effort that makes code <b>easier to change</b> (clear names, small functions, tests) always pays off. YAGNI is only about <i>presumptive features</i>. It also does not apply to decisions that are very expensive to reverse later — security, data model, public API shapes, data privacy. Those are "one-way doors" and deserve thought up front.</p>`,
    clues: [
      '"Design it so we can support any payment provider in the future" with only one provider in scope → ask about YAGNI; design a seam, not a framework.',
      'Interviewer asks "is this over-engineered?" about a design with factories, strategies and registries for one use case.',
      'Code needs a comment like "// clever bit trick, do not touch" → KISS violation.',
      'Interfaces with exactly one implementation and no test double → possible speculative generality.',
      '"Machine coding round, 90 minutes" → start with the simplest working core, extend only when asked.',
      'Follow-up "the requirement just changed — how hard is it to extend?" → shows YAGNI + clean code makes change cheap.'
    ],
    code: { lang: 'java', code: `// OVER-ENGINEERED (YAGNI + KISS violations): a "framework" for a single greeting.
interface GreetingStrategy { String greet(String name); }
class EnglishGreeting implements GreetingStrategy { public String greet(String n) { return "Hello, " + n; } }
interface GreetingStrategyFactory { GreetingStrategy create(String locale); }
class DefaultGreetingStrategyFactory implements GreetingStrategyFactory {
    public GreetingStrategy create(String locale) {
        // "we might support French one day" — nobody asked for it
        return new EnglishGreeting();
    }
}
class GreetingService {
    private final GreetingStrategyFactory factory;
    GreetingService(GreetingStrategyFactory f) { this.factory = f; }
    String greet(String name, String locale) { return factory.create(locale).greet(name); }
}

// SIMPLE (what the requirement actually says: greet users in English).
final class Greeter {
    String greet(String name) { return "Hello, " + name; }
}
// When French REALLY arrives, refactoring Greeter into an interface takes 5 minutes
// because the code is small, named well and covered by a test.

class KissDemo {
    public static void main(String[] args) {
        System.out.println(new GreetingService(new DefaultGreetingStrategyFactory()).greet("Asha", "en"));
        System.out.println(new Greeter().greet("Asha"));
    }
}`, alt: [
        { lang: 'python', code: `from typing import Protocol


# OVER-ENGINEERED (YAGNI + KISS violations): a "framework" for a single greeting.
class GreetingStrategy(Protocol):
    def greet(self, name: str) -> str: ...


class EnglishGreeting:
    def greet(self, name: str) -> str:
        return f"Hello, {name}"


class GreetingStrategyFactory(Protocol):
    def create(self, locale: str) -> GreetingStrategy: ...


class DefaultGreetingStrategyFactory:
    def create(self, locale: str) -> GreetingStrategy:
        # "we might support French one day" - nobody asked for it
        return EnglishGreeting()


class GreetingService:
    def __init__(self, factory: GreetingStrategyFactory) -> None:
        self._factory = factory

    def greet(self, name: str, locale: str) -> str:
        return self._factory.create(locale).greet(name)


# SIMPLE (what the requirement actually says: greet users in English).
def greet(name: str) -> str:
    return f"Hello, {name}"
# When French REALLY arrives, refactoring greet into a class takes 5 minutes
# because the code is small, named well and covered by a test.


if __name__ == "__main__":
    print(GreetingService(DefaultGreetingStrategyFactory()).greet("Asha", "en"))
    print(greet("Asha"))` },
        { lang: 'ts', code: `// OVER-ENGINEERED (YAGNI + KISS violations): a "framework" for a single greeting.
interface GreetingStrategy { greet(name: string): string; }
class EnglishGreeting implements GreetingStrategy {
  greet(name: string): string { return \`Hello, \${name}\`; }
}
interface GreetingStrategyFactory { create(locale: string): GreetingStrategy; }
class DefaultGreetingStrategyFactory implements GreetingStrategyFactory {
  create(locale: string): GreetingStrategy {
    // "we might support French one day" - nobody asked for it
    return new EnglishGreeting();
  }
}
class GreetingService {
  constructor(private readonly factory: GreetingStrategyFactory) {}
  greet(name: string, locale: string): string { return this.factory.create(locale).greet(name); }
}

// SIMPLE (what the requirement actually says: greet users in English).
const greet = (name: string): string => \`Hello, \${name}\`;
// When French REALLY arrives, refactoring greet into an interface takes 5 minutes
// because the code is small, named well and covered by a test.

console.log(new GreetingService(new DefaultGreetingStrategyFactory()).greet("Asha", "en"));
console.log(greet("Asha"));` },
        { lang: 'cpp', code: `// OVER-ENGINEERED (YAGNI + KISS violations): a "framework" for a single greeting.
class GreetingStrategy {
public:
    virtual ~GreetingStrategy() = default;
    virtual string greet(const string& name) const = 0;
};
class EnglishGreeting : public GreetingStrategy {
public:
    string greet(const string& name) const override { return "Hello, " + name; }
};
class GreetingStrategyFactory {
public:
    virtual ~GreetingStrategyFactory() = default;
    virtual unique_ptr<GreetingStrategy> create(const string& locale) const = 0;
};
class DefaultGreetingStrategyFactory : public GreetingStrategyFactory {
public:
    unique_ptr<GreetingStrategy> create(const string&) const override {
        // "we might support French one day" - nobody asked for it
        return make_unique<EnglishGreeting>();
    }
};
class GreetingService {
    const GreetingStrategyFactory& factory_;
public:
    explicit GreetingService(const GreetingStrategyFactory& factory) : factory_(factory) {}
    string greet(const string& name, const string& locale) const { return factory_.create(locale)->greet(name); }
};

// SIMPLE (what the requirement actually says: greet users in English).
string greet(const string& name) { return "Hello, " + name; }
// When French REALLY arrives, refactoring greet into an interface takes 5 minutes
// because the code is small, named well and covered by a test.

int main() {
    DefaultGreetingStrategyFactory factory;
    cout << GreetingService(factory).greet("Asha", "en") << "\\n";
    cout << greet("Asha") << "\\n";
}` }
      ] },
    codeTitle: 'Five types for one sentence vs one small class',
    viz: [{
      title: 'Speculative features pile up (cost of carry)',
      input: 'Plug-in system, XML export, Multi-currency, Dark-mode API',
      inputLabel: '"Just in case" features (1 to 5, comma separated)',
      gen: function (input) {
        var feats = splitList(input, 'Plug-in system, XML export, Multi-currency');
        if (feats.length < 1 || feats.length > 5) throw new Error('List 1 to 5 speculative features, comma separated');
        var frames = [];
        var core = bx('CORE', 'Order core', 50, 10);
        var nodes = [core], edges = [], hl = { CORE: 'ok' }, ehl = {}, tags = { CORE: 'needed today' };
        var classes = 3, hours = 0, carry = 0;
        frames.push({ narr: 'The real requirement: take an order and save it. That is <b>' + classes + ' classes</b>. Simple, tested, shipped.', parts: [gp('Design', nodes.slice(), edges.slice(), clone(hl), clone(ehl), clone(tags), 50), { type: 'vars', label: 'running cost', vals: { classes: classes, buildHours: hours, extraReadsPerChange: carry } }] });
        feats.forEach(function (f, i) {
          var id = 'F' + i;
          nodes.push(bx(id, short(f, 13), spread(feats.length, i, 12, 88), 38));
          edges.push(['CORE', id, 'hook']);
          hl[id] = 'bad'; ehl['CORE-' + id] = 'bad'; tags[id] = 'used by 0';
          classes += 3; hours += 16; carry += 1;
          frames.push({ narr: 'Someone says "we <i>might</i> need <b>' + H.esc(f) + '</b>". Hooks are added to the core (red edge) plus ~3 classes. <b>Nobody uses it yet.</b> Every future change to the core must now also keep this hook working — that is the <i>cost of carry</i>.', parts: [gp('Design', nodes.slice(), edges.slice(), clone(hl), clone(ehl), clone(tags), 50), { type: 'vars', label: 'running cost', vals: { classes: classes, buildHours: hours, extraReadsPerChange: carry }, hl: { classes: 'bad', buildHours: 'bad', extraReadsPerChange: 'bad' } }] });
        });
        var realIdx = feats.length > 1 ? 1 : 0;
        var tags2 = clone(tags); tags2['F' + realIdx] = 'needed, but different!';
        var hl2 = clone(hl); hl2['F' + realIdx] = 'cur';
        frames.push({ narr: 'Six months later the business really needs <b>' + H.esc(feats[realIdx]) + '</b> — but with rules nobody guessed. The pre-built hook does not fit, so it is rewritten anyway (<i>cost of repair</i>). The other ' + (feats.length - 1) + ' speculative feature(s) were <b>never</b> needed.', parts: [gp('Design', nodes.slice(), edges.slice(), hl2, clone(ehl), tags2, 50), { type: 'vars', label: 'running cost', vals: { classes: classes, buildHours: hours, extraReadsPerChange: carry, wastedHours: (feats.length - (feats.length > 1 ? 1 : 0)) * 16 + 16 }, hl: { wastedHours: 'bad' } }] });
        var simpleNodes = [core, bx('NEW', short(feats[realIdx], 13), 50, 38)];
        frames.push({ narr: '<b>The YAGNI path:</b> keep only the core. When the real need arrives, add exactly that (green), designed for the <i>actual</i> rules. Because the core stayed small and tested, the addition is cheap.', parts: [gp('YAGNI design', simpleNodes, [['CORE', 'NEW', 'added when needed']], { CORE: 'ok', NEW: 'ok' }, { 'CORE-NEW': 'ok' }, { CORE: 'small + tested', NEW: 'built on demand' }, 50), { type: 'vars', label: 'YAGNI cost', vals: { classes: 6, buildHours: 16, extraReadsPerChange: 0, wastedHours: 0 }, hl: { wastedHours: 'ok' } }] });
        frames.push({ narr: 'Fowler\'s four costs, for this run. YAGNI does not say "never plan" — it says "do not <b>build</b> for guesses". Thinking about future needs is fine; writing code for them is the expensive part.', parts: [{ type: 'table', label: 'Speculative vs YAGNI', columns: ['Cost', 'Built just in case', 'YAGNI'], rows: [['Build', hours + ' h', '16 h (only the real one)'], ['Delay', 'core shipped late', 'core shipped first'], ['Carry', carry + ' hooks to respect on every change', '0'], ['Repair', 'rewrite the guessed hook', 'none — built for real rules']], hl: { 2: 'sel' } }] });
        return frames;
      }
    }, {
      title: 'KISS: clever code vs obvious code',
      gen: function () {
        var clever = [
          'boolean isLeap(int y) {',
          '  return ((y & 3) == 0 && ((y % 25) != 0 || (y & 15) == 0));',
          '}'
        ];
        var simple = [
          'boolean isLeap(int year) {',
          '  boolean divisibleBy4   = year % 4 == 0;',
          '  boolean divisibleBy100 = year % 100 == 0;',
          '  boolean divisibleBy400 = year % 400 == 0;',
          '  return divisibleBy4 && (!divisibleBy100 || divisibleBy400);',
          '}'
        ];
        return [
          { narr: 'A "clever" leap-year check. It is correct and maybe a few nanoseconds faster. Can you verify it in 10 seconds? Most people cannot.', parts: [cp('Clever', clever, { 2: 'cur' })] },
          { narr: 'To trust it you must know that <code>y &amp; 3</code> is <code>y % 4</code>, and that <code>y % 25 != 0</code> combined with divisible-by-4 stands in for "not divisible by 100", and <code>y &amp; 15</code> for <code>% 16</code>, which with <code>% 25</code> means divisible by 400. Three hidden facts = high cognitive load.', parts: [cp('Clever', clever, { 2: 'bad' }), { type: 'vars', label: 'reader burden', vals: { hiddenFacts: 3, secondsToVerify: 60 }, hl: { hiddenFacts: 'bad' } }] },
          { narr: 'The KISS version names each fact. It reads like the rule in the calendar: <i>divisible by 4, except centuries, unless divisible by 400</i>.', parts: [cp('Simple', simple, rng(2, 4, 'ok'))] },
          { narr: 'The return line is now the rule itself. Performance? The JIT compiler optimizes both to nearly the same machine code. You pay nothing for clarity here.', parts: [cp('Simple', simple, { 5: 'sel' }), { type: 'vars', label: 'reader burden', vals: { hiddenFacts: 0, secondsToVerify: 10 }, hl: { hiddenFacts: 'ok' } }] },
          { narr: 'Same answers. KISS is not about fewer characters — it is about fewer things a reader must hold in their head.', parts: [{ type: 'table', label: 'Both give the same results', columns: ['year', 'clever', 'simple'], rows: [['1900', 'false', 'false'], ['2000', 'true', 'true'], ['2024', 'true', 'true'], ['2026', 'false', 'false']], hl: { 0: 'ok', 1: 'ok' } }] }
        ];
      }
    }],
    examples: [
      { title: 'The generic repository nobody needed', html: `<p>A team writes <code>GenericRepository&lt;T, ID&gt;</code> with <code>findAll, findBy(Criteria), page, sort, softDelete, audit…</code> for a feature that only needs <code>findById</code> and <code>save</code>. Each new entity has to "fit" the generic shape, and bugs in unused methods still need fixing. ${H.c('g', 'YAGNI version:')} a small <code>OrderRepository</code> with the two methods actually called. Add more when a caller needs them.</p>`, code: { lang: 'java', code: `interface OrderRepository {
    Optional<String> findById(long id);
    void save(long id, String order);
}
class InMemoryOrderRepository implements OrderRepository {
    private final Map<Long, String> store = new HashMap<>();
    public Optional<String> findById(long id) { return Optional.ofNullable(store.get(id)); }
    public void save(long id, String order) { store.put(id, order); }
}`, alt: [
          { lang: 'python', code: `from typing import Optional, Protocol


class OrderRepository(Protocol):
    def find_by_id(self, id: int) -> Optional[str]: ...
    def save(self, id: int, order: str) -> None: ...


class InMemoryOrderRepository:
    def __init__(self) -> None:
        self._store: dict[int, str] = {}

    def find_by_id(self, id: int) -> Optional[str]:
        return self._store.get(id)

    def save(self, id: int, order: str) -> None:
        self._store[id] = order` },
          { lang: 'ts', code: `interface OrderRepository {
  findById(id: number): string | undefined;
  save(id: number, order: string): void;
}
class InMemoryOrderRepository implements OrderRepository {
  private readonly store = new Map<number, string>();
  findById(id: number): string | undefined { return this.store.get(id); }
  save(id: number, order: string): void { this.store.set(id, order); }
}` },
          { lang: 'cpp', code: `class OrderRepository {
public:
    virtual ~OrderRepository() = default;
    virtual optional<string> findById(long long id) const = 0;
    virtual void save(long long id, const string& order) = 0;
};
class InMemoryOrderRepository : public OrderRepository {
    unordered_map<long long, string> store_;
public:
    optional<string> findById(long long id) const override {
        auto it = store_.find(id);
        return it == store_.end() ? nullopt : optional<string>(it->second);
    }
    void save(long long id, const string& order) override { store_[id] = order; }
};` }
        ] } },
      { title: 'Config flag that is never toggled', html: `<p><code>if (config.useNewTaxEngine())</code> was added "for safe rollout" two years ago and is <code>true</code> everywhere. Now every reader has to understand <b>two</b> tax engines. Feature flags are great for rollout, but they need an <b>expiry date</b>. Delete the old branch once the rollout is done.</p>` },
      { title: 'Premature optimization', html: `<p>A developer adds a hand-rolled LRU cache in front of a lookup that runs 10 times a day "for performance". It adds invalidation bugs and nothing measurable. KISS + measure first: write the plain loop, profile, and optimize only the measured hotspot. Knuth's full quote: "premature optimization is the root of all evil" — <i>"yet we should not pass up our opportunities in that critical 3%"</i>.</p>` },
      { title: 'When YAGNI does NOT apply', html: `<p>In an interview you design a Parking Lot. Saying "I will hard-code one floor because YAGNI" is wrong when the <b>stated</b> requirement is multiple floors. YAGNI is about <i>guessed</i> needs, not stated ones. Also do not skip: input validation, thread-safety for a shared resource, money as integers/BigDecimal — those are correctness, not features.</p>` }
    ],
    deepDive: `<p><b>Essential vs accidental complexity.</b> Fred Brooks ("No Silver Bullet", 1986) split complexity into <i>essential</i> (the problem itself is hard: tax law, scheduling) and <i>accidental</i> (complexity we added: layers, frameworks, indirection). KISS attacks accidental complexity only. You cannot make tax law simple, but you can avoid wrapping it in three factories.</p>
<p><b>Gall's law:</b> "A complex system that works is invariably found to have evolved from a simple system that worked." Great designs are usually <i>grown</i>, not drawn complete on day one. This is why YAGNI pairs with <b>continuous refactoring</b>: you can only defer design decisions safely if the code stays clean enough to change later.</p>
<p><b>Last Responsible Moment</b> (Lean software): delay a decision until the cost of <i>not</i> deciding becomes higher than the cost of deciding. Cheap-to-reverse decisions (internal class structure) can wait. Expensive ones (database choice, public API contracts, ID formats, encryption) cannot — think about them early. Amazon calls these one-way vs two-way doors.</p>
<p><b>Measuring simplicity:</b> cyclomatic complexity (number of independent paths; aim ≤ 10 per method), cognitive complexity (SonarSource; penalizes nesting more than flat branches), number of types per feature, depth of call chain to do one thing. A good smell test: "how many files do I open to understand this request?"</p>
<p><b>Speculative generality</b> is a named smell in Fowler's catalogue: abstract classes with one subclass, unused parameters, methods only called by tests, names like <code>AbstractBaseManagerFactory</code>. The refactorings are <i>Collapse Hierarchy</i>, <i>Inline Class</i>, <i>Remove Parameter</i> and <i>Remove Dead Code</i>.</p>
<p><b>Simple ≠ easy.</b> Rich Hickey's talk "Simple Made Easy": <i>easy</i> means familiar/near at hand; <i>simple</i> means not intertwined. A familiar framework can still produce a tangled (complex) design. Aim for un-tangled.</p>`,
    aiEra: `<p><b>What AI changes:</b> code costs almost nothing to generate, so over-engineering is now one prompt away. Ask an assistant for "a scalable notification system" and you may get interfaces, factories, retry policies and a plug-in registry for a feature that sends one email. The <b>cost of carry</b> did not go down — humans (and AI agents) still have to read, test and change all that code.</p>
<p><b>Use AI as a partner:</b> prompt with constraints: <code>Implement only the stated requirements. No interfaces with a single implementation. No config options that are not asked for. Prefer the standard library.</code> Then ask: <code>List anything in this diff that is not required by the ticket.</code> AI is good at spotting speculative code when you ask directly.</p>
<p><b>Where AI goes wrong:</b> it pattern-matches to "enterprise" examples from its training data, adds premature abstraction layers, and writes clever one-liners (nested streams, bit tricks) that pass tests but are hard to review. It also rarely deletes code on its own.</p>
<p><b>What you must still own:</b> deciding what is <i>actually</i> required, recognising one-way-door decisions that deserve upfront design, and having the confidence to delete. In interviews, saying "I am keeping this simple because X is not required; here is the seam where I would extend it" is a strong senior signal.</p>`,
    problems: [{
      title: 'Over-engineered notification sender',
      level: 'Medium', tags: ['YAGNI', 'KISS', 'speculative generality'], companies: ['Swiggy', 'Atlassian'],
      statement: `<p>The ticket says: <i>"When an order ships, send the customer one email."</i> A teammate wrote an abstract channel hierarchy, a factory, a plug-in registry, a retry policy interface and a priority enum — 8 types for one email. Review it, list the speculative parts, and rewrite it to the simplest design that meets the ticket <b>while keeping one clean seam</b> so tests can check that an email was sent.</p>`,
      constraints: `Only email exists today. No retries, priorities or other channels are in the ticket. The result must be testable without a real mail server.`,
      example: `<p>Input: order <code>#42</code> shipped for <code>asha@mail.com</code>. Output: one email "Your order #42 has shipped". ${H.c('r', 'Before:')} 8 types, 3 unused enums values, a registry with one entry. ${H.c('g', 'After:')} 1 interface (the seam), 1 real implementation, 1 service.</p>`,
      brute: {
        why: `<p>Every layer here is built for an imagined future: SMS/push channels that do not exist, priorities that are never read, a retry policy with one "no retry" implementation, and a registry keyed by a string. Readers must trace 5 hops to see that "an email is sent". Each future change must keep all these layers consistent (<b>cost of carry</b>), and when SMS really arrives it will need different data (phone number) that this design never planned for (<b>cost of repair</b>).</p>`,
        code: { lang: 'java', code: `enum Priority { LOW, NORMAL, HIGH, CRITICAL }
interface RetryPolicy { int maxAttempts(); }
class NoRetry implements RetryPolicy { public int maxAttempts() { return 1; } }
abstract class Channel {
    abstract void deliver(String to, String body, Priority p);
}
class EmailChannel extends Channel {
    final List<String> sent = new ArrayList<>();
    void deliver(String to, String body, Priority p) { sent.add(to + ": " + body); }
}
interface ChannelFactory { Channel create(String type); }
class ChannelRegistry implements ChannelFactory {
    private final Map<String, Channel> channels = new HashMap<>();
    void register(String type, Channel c) { channels.put(type, c); }
    public Channel create(String type) { return channels.get(type); }
}
class NotificationOrchestrator {
    private final ChannelFactory factory;
    private final RetryPolicy retry;
    NotificationOrchestrator(ChannelFactory f, RetryPolicy r) { factory = f; retry = r; }
    void notifyShipped(String email, int orderId) {
        for (int attempt = 0; attempt < retry.maxAttempts(); attempt++) {
            factory.create("EMAIL").deliver(email, "Your order #" + orderId + " has shipped", Priority.NORMAL);
            return;
        }
    }
}`, alt: [
                { lang: 'python', code: `
from abc import ABC, abstractmethod
from enum import Enum

class Priority(Enum): LOW = 0; NORMAL = 1; HIGH = 2; CRITICAL = 3

class RetryPolicy(ABC):
    @abstractmethod
    def max_attempts(self): pass
class NoRetry(RetryPolicy):
    def max_attempts(self): return 1

class Channel(ABC):
    @abstractmethod
    def deliver(self, to, body, p): pass
class EmailChannel(Channel):
    def __init__(self): self.sent = []
    def deliver(self, to, body, p): self.sent.append(to + ": " + body)

class ChannelFactory(ABC):
    @abstractmethod
    def create(self, type): pass
class ChannelRegistry(ChannelFactory):
    def __init__(self): self._channels = {}
    def register(self, type, c): self._channels[type] = c
    def create(self, type): return self._channels.get(type)

class NotificationOrchestrator:
    def __init__(self, f, r): self._factory, self._retry = f, r
    def notify_shipped(self, email, order_id):
        for attempt in range(self._retry.max_attempts()):
            self._factory.create("EMAIL").deliver(email, f"Your order #{order_id} has shipped", Priority.NORMAL)
            return` },
                { lang: 'ts', code: `
enum Priority { LOW, NORMAL, HIGH, CRITICAL }
interface RetryPolicy { maxAttempts(): number; }
class NoRetry implements RetryPolicy { maxAttempts() { return 1; } }
abstract class Channel {
    abstract deliver(to: string, body: string, p: Priority): void;
}
class EmailChannel extends Channel {
    readonly sent: string[] = [];
    deliver(to: string, body: string, p: Priority): void { this.sent.push(to + ": " + body); }
}
interface ChannelFactory { create(type: string): Channel | undefined; }
class ChannelRegistry implements ChannelFactory {
    private channels = new Map<string, Channel>();
    register(type: string, c: Channel): void { this.channels.set(type, c); }
    create(type: string): Channel | undefined { return this.channels.get(type); }
}
class NotificationOrchestrator {
    constructor(private factory: ChannelFactory, private retry: RetryPolicy) {}
    notifyShipped(email: string, orderId: number): void {
        for (let attempt = 0; attempt < this.retry.maxAttempts(); attempt++) {
            this.factory.create("EMAIL")!.deliver(email, "Your order #" + orderId + " has shipped", Priority.NORMAL);
            return;
        }
    }
}` },
                { lang: 'cpp', code: `
enum class Priority { LOW, NORMAL, HIGH, CRITICAL };
struct RetryPolicy { virtual int maxAttempts() = 0; virtual ~RetryPolicy() = default; };
struct NoRetry : RetryPolicy { int maxAttempts() override { return 1; } };
struct Channel {
    virtual void deliver(const string& to, const string& body, Priority p) = 0;
    virtual ~Channel() = default;
};
struct EmailChannel : Channel {
    vector<string> sent;
    void deliver(const string& to, const string& body, Priority p) override { sent.push_back(to + ": " + body); }
};
struct ChannelFactory { virtual Channel* create(const string& type) = 0; virtual ~ChannelFactory() = default; };
class ChannelRegistry : public ChannelFactory {
    unordered_map<string, Channel*> channels;
public:
    void registerChannel(const string& type, Channel* c) { channels[type] = c; }
    Channel* create(const string& type) override { return channels[type]; }
};
class NotificationOrchestrator {
    ChannelFactory& factory;
    RetryPolicy& retry;
public:
    NotificationOrchestrator(ChannelFactory& f, RetryPolicy& r) : factory(f), retry(r) {}
    void notifyShipped(const string& email, int orderId) {
        for (int attempt = 0; attempt < retry.maxAttempts(); attempt++) {
            factory.create("EMAIL")->deliver(email, "Your order #" + to_string(orderId) + " has shipped", Priority::NORMAL);
            return;
        }
    }
};` }
              ] }
      },
      mcq: { q: 'Which part of the over-engineered design is worth KEEPING?', options: ['The Priority enum', 'The ChannelRegistry keyed by strings', 'A small interface in front of the mail sender so tests can use a fake', 'The RetryPolicy interface with NoRetry'], answer: 2, explain: 'A seam for testing has a real, present-day user (the test). The other parts serve only imagined futures.' },
      hints: [
        `<p>Hint 1: For each type, ask "who uses this <i>today</i>?" If the only answer is "future us", it is speculative generality.</p>`,
        `<p>Hint 2: Keep one interface <code>MailSender { void send(String to, String subject) }</code> because a test needs a fake. Everything else can collapse into a plain <code>ShippingNotifier</code> class.</p>`,
        `<p>Hint 3: Recipe: delete Priority, RetryPolicy, NoRetry, Channel hierarchy, factory and registry → keep MailSender + SmtpMailSender + ShippingNotifier. Write a FakeMailSender that records messages and assert one message was sent. Note in the PR where SMS would plug in later.</p>`
      ],
      tests: { io: true, cases: [{ stdin: '', stdout: "MAIL to asha@mail.com: Your order #42 has shipped\ntest sees: [ben@mail.com | Your order #7 has shipped, cy@mail.com | Your order #8 has shipped]\n" }] },
      solution: {
        approach: `<p><b>Review notes (the smells):</b> speculative generality (Channel hierarchy with one subclass, registry with one entry, retry loop that runs once), dead data (Priority never read), stringly-typed lookup (<code>"EMAIL"</code> can fail at runtime with a null).</p>
<p><b>Refactor (Collapse Hierarchy + Inline Class + Remove Dead Code):</b> one interface <code>MailSender</code> — justified today because tests need a fake — one real implementation, and one <code>ShippingNotifier</code> with a single readable method. When SMS truly arrives, we will know its real needs (phone numbers, opt-in rules) and can introduce a <code>Notifier</code> abstraction then; the small codebase makes that a 15-minute change.</p>`,
        code: `interface MailSender {
    void send(String to, String body);
}

// Real implementation (would wrap JavaMail/SES in production).
class ConsoleMailSender implements MailSender {
    public void send(String to, String body) { System.out.println("MAIL to " + to + ": " + body); }
}

// Test double: records instead of sending.
class FakeMailSender implements MailSender {
    final List<String> sent = new ArrayList<>();
    public void send(String to, String body) { sent.add(to + " | " + body); }
}

class ShippingNotifier {
    private final MailSender mail;
    ShippingNotifier(MailSender mail) { this.mail = mail; }

    void orderShipped(String customerEmail, int orderId) {
        mail.send(customerEmail, "Your order #" + orderId + " has shipped");
    }
}

class NotifierDemo {
    public static void main(String[] args) {
        new ShippingNotifier(new ConsoleMailSender()).orderShipped("asha@mail.com", 42);

        FakeMailSender fake = new FakeMailSender();
        ShippingNotifier notifier = new ShippingNotifier(fake);
        notifier.orderShipped("ben@mail.com", 7);
        notifier.orderShipped("cy@mail.com", 8);
        System.out.println("test sees: " + fake.sent);   // [ben@mail.com | Your order #7 has shipped, cy@mail.com | ...]
    }
}`,
        alt: [
          { lang: 'python', code: `from typing import Protocol


class MailSender(Protocol):
    def send(self, to: str, body: str) -> None: ...


class ConsoleMailSender:
    """Real implementation (would wrap SES or SMTP in production)."""

    def send(self, to: str, body: str) -> None:
        print(f"MAIL to {to}: {body}")


class FakeMailSender:
    """Test double: records instead of sending."""

    def __init__(self) -> None:
        self.sent: list[str] = []

    def send(self, to: str, body: str) -> None:
        self.sent.append(f"{to} | {body}")


class ShippingNotifier:
    def __init__(self, mail: MailSender) -> None:
        self._mail = mail

    def order_shipped(self, customer_email: str, order_id: int) -> None:
        self._mail.send(customer_email, f"Your order #{order_id} has shipped")


if __name__ == "__main__":
    ShippingNotifier(ConsoleMailSender()).order_shipped("asha@mail.com", 42)

    fake = FakeMailSender()
    notifier = ShippingNotifier(fake)
    notifier.order_shipped("ben@mail.com", 7)
    notifier.order_shipped("cy@mail.com", 8)
    print(f"test sees: [{', '.join(fake.sent)}]")` },
          { lang: 'ts', code: `interface MailSender {
  send(to: string, body: string): void;
}

// Real implementation (would wrap SES or SMTP in production).
class ConsoleMailSender implements MailSender {
  send(to: string, body: string): void { console.log(\`MAIL to \${to}: \${body}\`); }
}

// Test double: records instead of sending.
class FakeMailSender implements MailSender {
  readonly sent: string[] = [];
  send(to: string, body: string): void { this.sent.push(\`\${to} | \${body}\`); }
}

class ShippingNotifier {
  constructor(private readonly mail: MailSender) {}

  orderShipped(customerEmail: string, orderId: number): void {
    this.mail.send(customerEmail, \`Your order #\${orderId} has shipped\`);
  }
}

new ShippingNotifier(new ConsoleMailSender()).orderShipped("asha@mail.com", 42);

const fake = new FakeMailSender();
const notifier = new ShippingNotifier(fake);
notifier.orderShipped("ben@mail.com", 7);
notifier.orderShipped("cy@mail.com", 8);
console.log(\`test sees: [\${fake.sent.join(", ")}]\`);` },
          { lang: 'cpp', code: `class MailSender {
public:
    virtual ~MailSender() = default;
    virtual void send(const string& to, const string& body) = 0;
};

// Real implementation (would wrap SES or SMTP in production).
class ConsoleMailSender : public MailSender {
public:
    void send(const string& to, const string& body) override { cout << "MAIL to " << to << ": " << body << "\\n"; }
};

// Test double: records instead of sending.
class FakeMailSender : public MailSender {
public:
    vector<string> sent;
    void send(const string& to, const string& body) override { sent.push_back(to + " | " + body); }
};

class ShippingNotifier {
    MailSender& mail_;   // the caller owns the sender and outlives the notifier
public:
    explicit ShippingNotifier(MailSender& mail) : mail_(mail) {}
    void orderShipped(const string& customerEmail, int orderId) {
        mail_.send(customerEmail, "Your order #" + to_string(orderId) + " has shipped");
    }
};

int main() {
    ConsoleMailSender console;
    ShippingNotifier(console).orderShipped("asha@mail.com", 42);

    FakeMailSender fake;
    ShippingNotifier notifier(fake);
    notifier.orderShipped("ben@mail.com", 7);
    notifier.orderShipped("cy@mail.com", 8);
    string joined;
    for (size_t i = 0; i < fake.sent.size(); i++) joined += (i ? ", " : "") + fake.sent[i];
    cout << "test sees: [" << joined << "]\\n";
}` }
        ],
        complexity: `<p>Types: 8 → 4 (including the test fake). Hops from caller to "email sent": 5 → 2. Runtime is O(1) in both; the gain is reading and change cost.</p>`,
        followUps: ['SMS is now required: what is the smallest change? (introduce Notifier interface or add SmsSender + decide per customer preference)', 'Retries are now required: where do they belong? (inside the real MailSender adapter, not the domain service)', 'How would you convince the teammate without hurting them? (cost of carry, show the diff, keep the seam)']
      }
    }]
  });

  /* =====================================================================
     TOPIC 3 — Composition over Inheritance
     ===================================================================== */
  topics.push({
    title: 'Composition over Inheritance (has-a beats is-a for reuse)',
    analogy: `<p>A <b>LEGO</b> car is built from parts: wheels, an engine block, a seat. Want a faster car? Swap the engine piece. Want a boat? Keep the seat, swap wheels for a hull. That is <b>composition</b>: things <i>have</i> parts, and parts can be swapped.</p>
<p>A car <b>carved from one block of wood</b> is inheritance taken too far: the shape of the wheels is baked into the body. Changing the body can crack the wheels, and you cannot give a different car the same wheels without carving them again. When you need a sink fixed you <b>call a plumber</b> (delegate) — you do not <i>become</i> a plumber (inherit).</p>`,
    explain: `<p><b>Inheritance</b> (<code>class B extends A</code>) means "B <b>is an</b> A". B gets A's fields and methods for free. <b>Composition</b> means "B <b>has an</b> A": B keeps an A in a field and <b>delegates</b> work to it, usually through an interface.</p>
<p>The famous advice from the <i>Gang of Four</i> book (1994): <b>"Favor object composition over class inheritance."</b> Not "never inherit" — <i>favor</i>. Why?</p>
${H.table(['Problem with inheritance', 'Plain meaning', 'Composition answer'], [
  ['<b>Tight coupling to the parent\'s insides</b> (white-box reuse)', 'Subclass depends on <i>how</i> the parent works, not just <i>what</i> it does. Parent changes → child silently breaks (the <b>fragile base class</b> problem).', 'Use only the public interface of the part (black-box reuse).'],
  ['<b>Class explosion</b>', 'Coffee with Milk, with Sugar, with Milk+Sugar… n options → 2<sup>n</sup> subclasses.', 'One Coffee with a list of add-ons → n small classes.'],
  ['<b>Fixed at compile time</b>', 'An object cannot change its parent while running.', 'Swap the part at runtime: <code>robot.setMove(new Fly())</code>.'],
  ['<b>Inherits things you do not want</b>', '<code>java.util.Stack extends Vector</code>, so you can <code>insertElementAt(x, 0)</code> into a "stack"!', 'Expose only the operations that make sense.'],
  ['<b>Single inheritance (Java, TypeScript)</b>', 'You get only one parent class.', 'You can hold any number of parts.']
])}
<p><b>When inheritance IS right:</b> (1) a genuine "is-a" where every subclass can be used wherever the parent is expected (the Liskov Substitution Principle from SOLID); (2) a parent <b>designed and documented</b> for extension (e.g. <code>AbstractList</code>, framework template classes); (3) closed families of data types such as <code>sealed interface Shape permits Circle, Square</code>. Implementing an <b>interface</b> is fine almost always — it shares a contract, not implementation.</p>
<p><b>Quick test:</b> say it out loud. "A <code>Stack</code> is a <code>Vector</code>" — no, a stack only pushes and pops. "A <code>SavingsAccount</code> is an <code>Account</code>" — yes, probably. "An <code>Employee</code> is a <code>Person</code>" — careful: what happens when that person becomes a contractor? A <b>role</b> that changes over time is a part (composition), not an identity.</p>`,
    clues: [
      '"Coffee with milk, sugar, caramel… in any combination" → combinations explode with subclasses; compose add-ons (Decorator/list).',
      '"Behaviour must change at runtime" (robot switches from walking to flying) → hold a strategy object.',
      'Subclass overrides a method and the parent\'s other method suddenly misbehaves → fragile base class.',
      'Subclass throws <code>UnsupportedOperationException</code> for an inherited method → refused bequest; probably not a real is-a.',
      '"Reuse code from class X" asked in an LLD round → interviewer listens for has-a + delegation, not extends.',
      'A role that changes over time (customer becomes seller, employee becomes contractor) → composition of roles.'
    ],
    code: { lang: 'java', code: `// BROKEN: extending HashSet couples us to HashSet's private habit:
// AbstractCollection.addAll() calls add() for each element ("self-use").
class InstrumentedHashSet<E> extends HashSet<E> {
    private int addCount = 0;
    @Override public boolean add(E e) { addCount++; return super.add(e); }
    @Override public boolean addAll(Collection<? extends E> c) {
        addCount += c.size();
        return super.addAll(c);        // internally calls OUR add() again → double count
    }
    int getAddCount() { return addCount; }
}

// FIXED with composition: wrap any Set and forward calls (Effective Java, Item 18).
class InstrumentedSet<E> implements Iterable<E> {
    private final Set<E> inner;        // has-a, not is-a
    private int addCount = 0;
    InstrumentedSet(Set<E> inner) { this.inner = inner; }
    boolean add(E e) { addCount++; return inner.add(e); }
    boolean addAll(Collection<? extends E> c) {
        addCount += c.size();
        return inner.addAll(c);        // inner's add() is NOT ours → no double count
    }
    boolean contains(Object o) { return inner.contains(o); }
    int size() { return inner.size(); }
    int getAddCount() { return addCount; }
    public Iterator<E> iterator() { return inner.iterator(); }
}

class CompositionDemo {
    public static void main(String[] args) {
        InstrumentedHashSet<String> broken = new InstrumentedHashSet<>();
        broken.addAll(List.of("a", "b", "c"));
        System.out.println("inheritance count = " + broken.getAddCount()); // 6 (wrong!)

        InstrumentedSet<String> fixed = new InstrumentedSet<>(new TreeSet<>()); // works with ANY Set
        fixed.addAll(List.of("a", "b", "c"));
        System.out.println("composition count = " + fixed.getAddCount());  // 3
    }
}`, alt: [
        { lang: 'python', code: `from collections.abc import Iterable, Iterator
from typing import Generic, TypeVar

E = TypeVar("E")


# Stands in for Java's HashSet: add_all() calls the overridable add() for each element ("self-use").
class SimpleSet(Generic[E]):
    def __init__(self) -> None:
        self._items: set[E] = set()

    def add(self, e: E) -> bool:
        before = len(self._items)
        self._items.add(e)
        return len(self._items) > before

    def add_all(self, c: Iterable[E]) -> bool:
        changed = False
        for e in c:
            changed = self.add(e) or changed
        return changed


# BROKEN: extending SimpleSet couples us to its private habit (the self-use above).
class InstrumentedHashSet(SimpleSet[E]):
    def __init__(self) -> None:
        super().__init__()
        self._add_count = 0

    def add(self, e: E) -> bool:
        self._add_count += 1
        return super().add(e)

    def add_all(self, c: Iterable[E]) -> bool:
        items = list(c)
        self._add_count += len(items)
        return super().add_all(items)  # internally calls OUR add() again -> double count

    def get_add_count(self) -> int:
        return self._add_count


# FIXED with composition: wrap any set and forward calls (Effective Java, Item 18).
class InstrumentedSet(Generic[E]):
    def __init__(self, inner: set[E]) -> None:
        self._inner = inner  # has-a, not is-a
        self._add_count = 0

    def add(self, e: E) -> bool:
        self._add_count += 1
        before = len(self._inner)
        self._inner.add(e)
        return len(self._inner) > before

    def add_all(self, c: Iterable[E]) -> bool:
        items = list(c)
        self._add_count += len(items)
        before = len(self._inner)
        self._inner.update(items)  # the inner set's add is NOT ours -> no double count
        return len(self._inner) > before

    def __contains__(self, o: object) -> bool:
        return o in self._inner

    def __len__(self) -> int:
        return len(self._inner)

    def __iter__(self) -> Iterator[E]:
        return iter(self._inner)

    def get_add_count(self) -> int:
        return self._add_count


if __name__ == "__main__":
    broken: InstrumentedHashSet[str] = InstrumentedHashSet()
    broken.add_all(["a", "b", "c"])
    print(f"inheritance count = {broken.get_add_count()}")  # 6 (wrong!)

    fixed: InstrumentedSet[str] = InstrumentedSet(set())  # works with ANY set
    fixed.add_all(["a", "b", "c"])
    print(f"composition count = {fixed.get_add_count()}")  # 3` },
        { lang: 'ts', code: `// Stands in for Java's HashSet: addAll() calls the overridable add() for each element ("self-use").
class SimpleSet<E> {
  protected readonly items = new Set<E>();

  add(e: E): boolean {
    const before = this.items.size;
    this.items.add(e);
    return this.items.size > before;
  }
  addAll(c: Iterable<E>): boolean {
    let changed = false;
    for (const e of c) changed = this.add(e) || changed;
    return changed;
  }
}

// BROKEN: extending SimpleSet couples us to its private habit (the self-use above).
class InstrumentedHashSet<E> extends SimpleSet<E> {
  private addCount = 0;

  override add(e: E): boolean {
    this.addCount++;
    return super.add(e);
  }
  override addAll(c: Iterable<E>): boolean {
    const items = [...c];
    this.addCount += items.length;
    return super.addAll(items); // internally calls OUR add() again -> double count
  }
  getAddCount(): number { return this.addCount; }
}

// FIXED with composition: wrap any Set and forward calls (Effective Java, Item 18).
class InstrumentedSet<E> implements Iterable<E> {
  private addCount = 0;

  constructor(private readonly inner: Set<E>) {} // has-a, not is-a

  add(e: E): boolean {
    this.addCount++;
    const before = this.inner.size;
    this.inner.add(e);
    return this.inner.size > before;
  }
  addAll(c: Iterable<E>): boolean {
    const items = [...c];
    this.addCount += items.length;
    const before = this.inner.size;
    for (const e of items) this.inner.add(e); // the inner set's add is NOT ours -> no double count
    return this.inner.size > before;
  }
  has(o: E): boolean { return this.inner.has(o); }
  get size(): number { return this.inner.size; }
  getAddCount(): number { return this.addCount; }
  [Symbol.iterator](): Iterator<E> { return this.inner[Symbol.iterator](); }
}

const broken = new InstrumentedHashSet<string>();
broken.addAll(["a", "b", "c"]);
console.log(\`inheritance count = \${broken.getAddCount()}\`); // 6 (wrong!)

const fixed = new InstrumentedSet<string>(new Set()); // works with ANY Set
fixed.addAll(["a", "b", "c"]);
console.log(\`composition count = \${fixed.getAddCount()}\`); // 3` },
        { lang: 'cpp', code: `// Stands in for Java's HashSet: addAll() calls the overridable add() for each element ("self-use").
template <typename E>
class SimpleSet {
protected:
    set<E> items_;
public:
    virtual ~SimpleSet() = default;
    virtual bool add(const E& e) { return items_.insert(e).second; }
    virtual bool addAll(const vector<E>& c) {
        bool changed = false;
        for (const E& e : c) {
            bool added = add(e);
            changed = changed || added;
        }
        return changed;
    }
};

// BROKEN: extending SimpleSet couples us to its private habit (the self-use above).
template <typename E>
class InstrumentedHashSet : public SimpleSet<E> {
    int addCount_ = 0;
public:
    bool add(const E& e) override {
        addCount_++;
        return SimpleSet<E>::add(e);
    }
    bool addAll(const vector<E>& c) override {
        addCount_ += static_cast<int>(c.size());
        return SimpleSet<E>::addAll(c);   // internally calls OUR add() again -> double count
    }
    int getAddCount() const { return addCount_; }
};

// FIXED with composition: wrap a set and forward calls (Effective Java, Item 18).
template <typename E>
class InstrumentedSet {
    set<E> inner_;   // has-a, not is-a
    int addCount_ = 0;
public:
    explicit InstrumentedSet(set<E> inner) : inner_(std::move(inner)) {}
    bool add(const E& e) {
        addCount_++;
        return inner_.insert(e).second;
    }
    bool addAll(const vector<E>& c) {
        addCount_ += static_cast<int>(c.size());
        size_t before = inner_.size();
        inner_.insert(c.begin(), c.end());   // the inner set's insert is NOT ours -> no double count
        return inner_.size() > before;
    }
    bool contains(const E& e) const { return inner_.count(e) > 0; }
    size_t size() const { return inner_.size(); }
    int getAddCount() const { return addCount_; }
    auto begin() const { return inner_.begin(); }
    auto end() const { return inner_.end(); }
};

int main() {
    InstrumentedHashSet<string> broken;
    broken.addAll({"a", "b", "c"});
    cout << "inheritance count = " << broken.getAddCount() << "\\n";   // 6 (wrong!)

    InstrumentedSet<string> fixed{set<string>{}};
    fixed.addAll({"a", "b", "c"});
    cout << "composition count = " << fixed.getAddCount() << "\\n";    // 3
}` }
      ] },
    codeTitle: 'The fragile base class bug and the composition fix',
    viz: [{
      title: 'Class explosion: inheritance vs composition',
      input: 'Milk, Sugar, Caramel',
      inputLabel: 'Coffee add-ons (1 to 5, comma separated)',
      gen: function (input) {
        var feats = splitList(input, 'Milk, Sugar, Caramel');
        if (feats.length < 1 || feats.length > 5) throw new Error('Give 1 to 5 add-ons, comma separated, e.g. Milk, Sugar');
        var ini = feats.map(function (f) { return f.charAt(0).toUpperCase(); });
        var legend = feats.map(function (f, i) { return ini[i] + ' = ' + H.esc(f); }).join(', ');
        var frames = [], prevSubsets = [];
        function inhPart(k, fresh) {
          // all non-empty subsets of first k features, show at most 7
          var subs = [];
          for (var mask = 1; mask < (1 << k); mask++) {
            var parts = [];
            for (var b = 0; b < k; b++) if (mask & (1 << b)) parts.push(ini[b]);
            subs.push({ mask: mask, label: parts.join('+') });
          }
          subs.sort(function (a, b) { return a.label.length - b.label.length || a.mask - b.mask; });
          var shown = subs.slice(0, 7), nodes = [bx('base', 'Coffee', 50, 8)], edges = [], hl = { base: 'done' }, ehl = {}, tags = {};
          shown.forEach(function (s, i) {
            var row = i < 4 ? 0 : 1, col = row === 0 ? i : i - 4, cnt = row === 0 ? Math.min(4, shown.length) : shown.length - 4;
            var id = 'S' + s.mask;
            nodes.push(bx(id, s.label + ' Coffee', spread(cnt, col, 12, 88), row === 0 ? 30 : 50));
            edges.push([id, 'base', 'extends']);
            var isNew = fresh && (s.mask & (1 << (k - 1)));
            hl[id] = isNew ? 'bad' : 'cur';
            ehl[id + '-base'] = 'bad';
          });
          if (subs.length > 7) tags['base'] = '+' + (subs.length - 7) + ' more subclasses not drawn';
          return { part: gp('Inheritance: one subclass per combination', nodes, edges, hl, ehl, tags, 58), count: subs.length + 1 };
        }
        function compPart(k) {
          var nodes = [bx('C', 'Coffee', 22, 10), bx('AO', 'AddOn (interface)', 70, 10)], edges = [['C', 'AO', 'has 0..*']], hl = { C: 'ok', AO: 'sel' }, ehl = { 'C-AO': 'ok' };
          for (var i = 0; i < k; i++) {
            var id = 'A' + i;
            nodes.push(bx(id, short(feats[i], 9), spread(k, i, 12, 88), 40));
            edges.push([id, 'AO', 'implements']);
            hl[id] = i === k - 1 ? 'ok' : 'done';
          }
          return { part: gp('Composition: Coffee has a list of AddOns', nodes, edges, hl, ehl, {}, 50), count: k + 2 };
        }
        frames.push({ narr: 'Start: one plain <b>Coffee</b> class. Customers can add: ' + legend + '. We will add the options one at a time and count classes in both designs.', parts: [gp('Both designs start here', [bx('base', 'Coffee', 50, 20)], [], { base: 'ok' }, {}, {}, 36), { type: 'bars', label: 'number of classes', values: [1, 1], texts: ['inheritance', 'composition'] }] });
        for (var k = 1; k <= feats.length; k++) {
          var inh = inhPart(k, true), comp = compPart(k);
          frames.push({ narr: 'Add <b>' + H.esc(feats[k - 1]) + '</b>. Inheritance must create a subclass for <i>every combination</i> that includes it (red = new). Total combinations: 2<sup>' + k + '</sup> − 1 = <b>' + (inh.count - 1) + '</b> subclasses. Composition adds just <b>one</b> small class implementing <code>AddOn</code>.', parts: [inh.part, comp.part, { type: 'bars', label: 'number of classes', values: [inh.count, comp.count], texts: ['inheritance', 'composition'], hl: { 0: 'bad', 1: 'ok' } }] });
        }
        frames.push({ narr: 'And it gets worse with time: a new rule "caramel costs more on weekends" must be edited in every subclass containing caramel. With composition it lives in <code>Caramel</code> only. Also, a customer who changes their mind can <code>coffee.remove(milk)</code> at runtime — impossible once an object\'s class is fixed.', parts: [{ type: 'table', label: 'Classes needed', columns: ['add-ons n', 'inheritance (2^n)', 'composition (n + 2)'], rows: [1, 2, 3, 4, 5].map(function (n) { return [String(n), String(1 << n), String(n + 2)]; }), hl: { [feats.length - 1]: 'sel' } }] });
        frames.push({ narr: 'The composed design in code: price is the base price plus each add-on\'s price. This is the idea behind the <b>Decorator</b> and <b>Strategy</b> patterns you will meet later.', parts: [cp('Composition', ['interface AddOn { int price(); String name(); }', 'record Milk() implements AddOn { public int price(){return 20;} public String name(){return "milk";} }', 'class Coffee {', '  private final List<AddOn> addOns = new ArrayList<>();', '  void add(AddOn a)    { addOns.add(a); }', '  void remove(AddOn a) { addOns.remove(a); }', '  int price() {', '    int p = 100;', '    for (AddOn a : addOns) p += a.price();', '    return p;', '  }', '}'], { 4: 'ok', 9: 'sel' })] });
        return frames;
      }
    }, {
      title: 'Fragile base class: tracing addAll() step by step',
      gen: function () {
        var code = [
          'class InstrumentedHashSet<E> extends HashSet<E> {',
          '  int addCount = 0;',
          '  public boolean add(E e) { addCount++; return super.add(e); }',
          '  public boolean addAll(Collection<? extends E> c) {',
          '    addCount += c.size();',
          '    return super.addAll(c);  // AbstractCollection.addAll',
          '  }',
          '}',
          '// inside AbstractCollection (JDK code you do not own):',
          '//   for (E e : c) if (add(e)) modified = true;'
        ];
        var f = [];
        f.push({ narr: 'We call <code>set.addAll(List.of("a","b","c"))</code>. We expect <code>addCount</code> to end at <b>3</b>.', parts: [cp('Subclass of HashSet', code, { 4: 'cur' }), { type: 'stack', label: 'call stack', items: ['main', 'addAll([a,b,c])'], hl: { 1: 'cur' } }, { type: 'vars', vals: { addCount: 0 } }] });
        f.push({ narr: 'Our override adds <code>c.size()</code> = 3. So far so good.', parts: [cp('Subclass of HashSet', code, { 5: 'ok' }), { type: 'stack', label: 'call stack', items: ['main', 'addAll([a,b,c])'], hl: { 1: 'cur' } }, { type: 'vars', vals: { addCount: 3 }, hl: { addCount: 'ok' } }] });
        f.push({ narr: 'We call <code>super.addAll(c)</code>. The parent\'s implementation is a loop that calls <code>add(e)</code>. Because of dynamic dispatch, that <code>add</code> is <b>our overridden add</b>, not HashSet\'s!', parts: [cp('Subclass of HashSet', code, { 6: 'cur', 10: 'cur' }), { type: 'stack', label: 'call stack', items: ['main', 'addAll([a,b,c])', 'AbstractCollection.addAll'], hl: { 2: 'cur' } }, { type: 'vars', vals: { addCount: 3 } }] });
        ['a', 'b', 'c'].forEach(function (x, i) {
          f.push({ narr: 'Parent loop calls <code>add("' + x + '")</code> → lands in OUR <code>add</code> → <code>addCount++</code>. Counted <span class="c-r">twice</span>.', parts: [cp('Subclass of HashSet', code, { 3: 'bad', 10: 'cur' }), { type: 'stack', label: 'call stack', items: ['main', 'addAll([a,b,c])', 'AbstractCollection.addAll', 'add("' + x + '")  ← our override'], hl: { 3: 'bad' } }, { type: 'vars', vals: { addCount: 4 + i }, hl: { addCount: 'bad' } }] });
        });
        f.push({ narr: 'Result: <b>6</b>, not 3. The bug comes from a detail of the parent\'s <i>implementation</i> ("addAll uses add") that is not part of its contract. A JDK update could change it and silently "fix" or break us again. That is the <b>fragile base class</b> problem.', parts: [{ type: 'vars', vals: { expected: 3, actual: 6 }, hl: { actual: 'bad' } }, { type: 'text', html: 'Inheritance = <b>white-box</b> reuse: you depend on how the parent works inside.' }] });
        f.push({ narr: 'Composition fix: <code>InstrumentedSet</code> <b>has</b> a <code>Set</code> and forwards to it. The inner set\'s <code>addAll</code> calls the inner set\'s own <code>add</code>, which we never overrode. Count = 3, and it now works with <i>any</i> Set (TreeSet, LinkedHashSet…).', parts: [cp('Wrapper (composition)', ['class InstrumentedSet<E> {', '  private final Set<E> inner;', '  int addCount = 0;', '  boolean addAll(Collection<? extends E> c) {', '    addCount += c.size();', '    return inner.addAll(c);  // inner.add is not ours', '  }', '}'], { 2: 'sel', 6: 'ok' }), { type: 'vars', vals: { expected: 3, actual: 3 }, hl: { actual: 'ok' } }] });
        return f;
      }
    }],
    examples: [
      { title: 'java.util.Stack extends Vector — a famous mistake', html: `<p>Because <code>Stack</code> inherits from <code>Vector</code>, you can call <code>stack.add(0, x)</code> or <code>stack.remove(3)</code> and break the stack's last-in-first-out promise. Its Javadoc now recommends <code>Deque&lt;Integer&gt; stack = new ArrayDeque&lt;&gt;()</code>. <code>Properties extends Hashtable</code> has the same flaw: you can <code>put</code> non-String values that later break <code>getProperty</code>.</p>`, code: { lang: 'java', code: `Stack<Integer> s = new Stack<>();
s.push(1); s.push(2);
s.add(0, 99);                 // legal, but no longer a stack!
System.out.println(s);        // [99, 1, 2]
Deque<Integer> better = new ArrayDeque<>();
better.push(1); better.push(2);
System.out.println(better.pop()); // 2 — only stack operations are natural here`, alt: [
          { lang: 'python', code: `s = [1, 2]
s.insert(0, 99)  # legal, but no longer a stack!
print(s)  # [99, 1, 2]


class IntStack:  # has-a list, exposes only stack operations
    def __init__(self) -> None:
        self._items: list[int] = []

    def push(self, x: int) -> None:
        self._items.append(x)

    def pop(self) -> int:
        return self._items.pop()


better = IntStack()
better.push(1)
better.push(2)
print(better.pop())  # 2 - only stack operations are natural here` },
          { lang: 'ts', code: `const s: number[] = [1, 2];
s.splice(0, 0, 99); // legal, but no longer a stack!
console.log(\`[\${s.join(", ")}]\`); // [99, 1, 2]

class IntStack { // has-a array, exposes only stack operations
  private readonly items: number[] = [];
  push(x: number): void { this.items.push(x); }
  pop(): number | undefined { return this.items.pop(); }
}

const better = new IntStack();
better.push(1);
better.push(2);
console.log(better.pop()); // 2 - only stack operations are natural here` },
          { lang: 'cpp', code: `vector<int> s{1, 2};
s.insert(s.begin(), 99);        // legal, but no longer a stack!
cout << "[" << s[0] << ", " << s[1] << ", " << s[2] << "]\\n";   // [99, 1, 2]
stack<int> better;              // an adapter: only stack operations are exposed
better.push(1);
better.push(2);
cout << better.top() << "\\n";   // 2 (top, then better.pop() would remove it)
better.pop();` }
        ] } },
      { title: 'Strategy: change behaviour at runtime', html: `<p>A game character can walk, then picks up a jetpack and flies. With inheritance you would need <code>WalkingHero</code> and <code>FlyingHero</code> and could not switch. With composition the hero <b>has</b> a <code>Movement</code> and swaps it.</p>`, code: { lang: 'java', code: `interface Movement { String move(); }
class Walk implements Movement { public String move() { return "walks"; } }
class Fly implements Movement { public String move() { return "flies"; } }
class Hero {
    private Movement movement = new Walk();
    void setMovement(Movement m) { this.movement = m; }
    String act() { return "Hero " + movement.move(); }
}
class HeroDemo {
    public static void main(String[] args) {
        Hero h = new Hero();
        System.out.println(h.act());
        h.setMovement(new Fly());   // picked up a jetpack
        System.out.println(h.act());
    }
}`, alt: [
          { lang: 'python', code: `from typing import Protocol


class Movement(Protocol):
    def move(self) -> str: ...


class Walk:
    def move(self) -> str:
        return "walks"


class Fly:
    def move(self) -> str:
        return "flies"


class Hero:
    def __init__(self) -> None:
        self._movement: Movement = Walk()

    def set_movement(self, m: Movement) -> None:
        self._movement = m

    def act(self) -> str:
        return f"Hero {self._movement.move()}"


if __name__ == "__main__":
    h = Hero()
    print(h.act())
    h.set_movement(Fly())  # picked up a jetpack
    print(h.act())` },
          { lang: 'ts', code: `interface Movement { move(): string; }
class Walk implements Movement { move(): string { return "walks"; } }
class Fly implements Movement { move(): string { return "flies"; } }

class Hero {
  private movement: Movement = new Walk();
  setMovement(m: Movement): void { this.movement = m; }
  act(): string { return \`Hero \${this.movement.move()}\`; }
}

const h = new Hero();
console.log(h.act());
h.setMovement(new Fly()); // picked up a jetpack
console.log(h.act());` },
          { lang: 'cpp', code: `class Movement {
public:
    virtual ~Movement() = default;
    virtual string move() const = 0;
};
class Walk : public Movement { public: string move() const override { return "walks"; } };
class Fly : public Movement { public: string move() const override { return "flies"; } };

class Hero {
    unique_ptr<Movement> movement_ = make_unique<Walk>();
public:
    void setMovement(unique_ptr<Movement> m) { movement_ = std::move(m); }
    string act() const { return "Hero " + movement_->move(); }
};

int main() {
    Hero h;
    cout << h.act() << "\\n";
    h.setMovement(make_unique<Fly>());   // picked up a jetpack
    cout << h.act() << "\\n";
}` }
        ] } },
      { title: 'Where inheritance is the right tool', html: `<p>A closed family of shapes: every <code>Circle</code> truly <i>is a</i> <code>Shape</code>, no subclass inherits implementation it does not want, and a closed hierarchy (<code>sealed</code> in Java, a union type in TypeScript, <code>std::variant</code> in C++) stops strangers from adding subclasses. Value types such as records, frozen dataclasses and structs are not meant to be extended, so there is no fragile-base problem.</p>`, code: { lang: 'java', code: `sealed interface Shape permits Circle, Square {}
record Circle(double r) implements Shape {}
record Square(double side) implements Shape {}
class Areas {
    static double area(Shape s) {
        return switch (s) {
            case Circle c -> Math.PI * c.r() * c.r();
            case Square q -> q.side() * q.side();
        };
    }
}`, alt: [
          { lang: 'python', code: `import math
from dataclasses import dataclass


@dataclass(frozen=True)
class Circle:
    r: float


@dataclass(frozen=True)
class Square:
    side: float


Shape = Circle | Square  # a closed set: every variant is listed up front


def area(s: Shape) -> float:
    match s:
        case Circle(r):
            return math.pi * r * r
        case Square(side):
            return side * side` },
          { lang: 'ts', code: `type Shape =
  | { readonly kind: "circle"; readonly r: number }
  | { readonly kind: "square"; readonly side: number };

function area(s: Shape): number {
  switch (s.kind) {
    case "circle": return Math.PI * s.r * s.r;
    case "square": return s.side * s.side;
  }
}` },
          { lang: 'cpp', code: `struct Circle { double r; };
struct Square { double side; };
using Shape = variant<Circle, Square>;   // a closed set: every variant is listed up front

double area(const Shape& s) {
    return visit([](const auto& v) {
        if constexpr (is_same_v<decay_t<decltype(v)>, Circle>) return numbers::pi * v.r * v.r;
        else return v.side * v.side;
    }, s);
}` }
        ] } },
      { title: 'Roles that change over time', html: `<p><code>class Seller extends User</code> breaks the day a buyer also starts selling (single-inheritance languages such as Java and TypeScript allow only one parent, and in every language an object cannot change its class). Model roles as parts: <code>User</code> has a <code>Set&lt;Role&gt;</code> or optional <code>SellerProfile</code>. Same for <code>Employee</code> → contractor, <code>Student</code> → teaching assistant.</p>` }
    ],
    deepDive: `<p><b>Why the fragile base class happens:</b> a subclass that overrides a method participates in the parent's <i>self-calls</i>. The parent author may change which methods call which (a legal refactor that keeps the public contract), and every subclass that relied on the old call graph breaks. Effective Java Item 19: <i>"Design and document for inheritance or else prohibit it."</i> If a class is meant to be extended, its docs must say which overridable methods it calls internally (the "Implementation Requirements" tag <code>@implSpec</code>). Otherwise make it <code>final</code> or give it only private constructors.</p>
<p><b>Constructors calling overridable methods</b> are another trap: the parent constructor runs before subclass fields are initialized, so an override that reads a subclass field sees <code>null</code>/<code>0</code>.</p>
<p><b>Forwarding boilerplate:</b> a full <code>ForwardingSet</code> must implement ~15 methods of <code>Set</code>. Guava ships <code>ForwardingSet</code>/<code>ForwardingMap</code>; Kotlin has <code>class X(inner: Set&lt;E&gt;) : Set&lt;E&gt; by inner</code>; Lombok has <code>@Delegate</code>. Java's interface <code>default</code> methods let you share small behaviours without a base class.</p>
<p><b>Performance:</b> an extra delegation call costs effectively nothing — HotSpot inlines small monomorphic calls. Do not choose inheritance for speed.</p>
<p><b>Identity &amp; equality:</b> wrappers break <code>==</code> identity and can surprise callbacks (the wrapped object passes <code>this</code> to a listener, bypassing the wrapper — the "SELF problem"). Know it, it rarely matters.</p>
<p><b>Inheritance vs composition is also coupling:</b> inheritance is the <i>strongest</i> coupling in OO (child sees protected fields and the parent's call graph). Composition through an interface is among the weakest. That is why this principle sits next to "low coupling" in every design book.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants trained on decades of object-oriented code still reach for <code>extends</code> often — older tutorials loved deep hierarchies (<code>Animal → Mammal → Dog</code>). Ask for "an admin user" and you may get <code>class Admin extends User</code> even when admin is a role that can be granted and revoked.</p>
<p><b>Use AI as a partner:</b> ask <code>For each extends in this package, does the subclass satisfy Liskov substitution and does it rely on the parent's internal self-calls? Suggest composition where it doesn't.</code> Let it generate the forwarding boilerplate for a wrapper — tedious work AI does well — then review that every method really forwards.</p>
<p><b>Where AI goes wrong:</b> it may "fix" a class explosion by adding even more subclasses, or suggest composition everywhere, including for sealed data hierarchies where inheritance is perfect. It also forgets to forward <code>equals/hashCode</code> sensibly in wrappers.</p>
<p><b>What you must still own:</b> the <i>is-a vs has-a vs plays-a-role</i> judgment from the domain, and spotting runtime-variability needs in requirements ("users can switch plans", "robot changes mode").</p>`,
    problems: [{
      title: 'Robots that walk, fly and talk',
      level: 'Medium', tags: ['composition', 'strategy', 'class explosion'], companies: ['Amazon', 'Google'],
      statement: `<p>A toy company models robots with inheritance: <code>Robot</code>, <code>WalkingRobot</code>, <code>FlyingRobot</code>, <code>TalkingWalkingRobot</code>, <code>TalkingFlyingRobot</code>… Each new ability doubles the classes, the movement code is copy-pasted, and a robot cannot switch from walking to flying when its battery-powered wings unlock. Redesign with composition so (a) abilities combine freely, (b) movement can change at runtime, (c) adding "swim" means adding one class.</p>`,
      constraints: `Movements: walk, fly (later swim). Speech: silent, talk. Must be able to call <code>robot.setMovement(...)</code> at runtime.`,
      example: `<p>Robot "R2" starts walking and silent: <code>R2 walks, says nothing</code>. Wings unlock → <code>setMovement(new Fly())</code> → <code>R2 flies, says nothing</code>. ${H.c('g', 'No new class was needed for the new combination.')}</p>`,
      brute: {
        why: `<p>The inheritance design needs one class per combination: 2 movements × 2 speech = 4 subclasses, and adding swim makes 6. The walking logic is copied into every walking class (a DRY violation too). The type of an object is fixed when created, so a <code>WalkingRobot</code> can never fly. Any change to "walk" means editing every class that walks.</p>`,
        code: { lang: 'java', code: `abstract class Robot {
    final String name;
    Robot(String name) { this.name = name; }
    abstract String act();
}
class WalkingRobot extends Robot {
    WalkingRobot(String n) { super(n); }
    String act() { return name + " walks, says nothing"; }
}
class FlyingRobot extends Robot {
    FlyingRobot(String n) { super(n); }
    String act() { return name + " flies, says nothing"; }
}
class TalkingWalkingRobot extends Robot {
    TalkingWalkingRobot(String n) { super(n); }
    String act() { return name + " walks, says hello"; }   // walking copied
}
class TalkingFlyingRobot extends Robot {
    TalkingFlyingRobot(String n) { super(n); }
    String act() { return name + " flies, says hello"; }   // flying copied
}`, alt: [
                { lang: 'python', code: `
from abc import ABC, abstractmethod

class Robot(ABC):
    def __init__(self, name): self.name = name
    @abstractmethod
    def act(self): pass

class WalkingRobot(Robot):
    def act(self): return self.name + " walks, says nothing"

class FlyingRobot(Robot):
    def act(self): return self.name + " flies, says nothing"

class TalkingWalkingRobot(Robot):
    def act(self): return self.name + " walks, says hello"   # walking copied

class TalkingFlyingRobot(Robot):
    def act(self): return self.name + " flies, says hello"   # flying copied` },
                { lang: 'ts', code: `
abstract class Robot {
    constructor(readonly name: string) {}
    abstract act(): string;
}
class WalkingRobot extends Robot {
    act(): string { return this.name + " walks, says nothing"; }
}
class FlyingRobot extends Robot {
    act(): string { return this.name + " flies, says nothing"; }
}
class TalkingWalkingRobot extends Robot {
    act(): string { return this.name + " walks, says hello"; }   // walking copied
}
class TalkingFlyingRobot extends Robot {
    act(): string { return this.name + " flies, says hello"; }   // flying copied
}` },
                { lang: 'cpp', code: `
class Robot {
protected:
    string name;
public:
    Robot(string name) : name(name) {}
    virtual ~Robot() = default;
    virtual string act() = 0;
};
struct WalkingRobot : Robot {
    WalkingRobot(string n) : Robot(n) {}
    string act() override { return name + " walks, says nothing"; }
};
struct FlyingRobot : Robot {
    FlyingRobot(string n) : Robot(n) {}
    string act() override { return name + " flies, says nothing"; }
};
struct TalkingWalkingRobot : Robot {
    TalkingWalkingRobot(string n) : Robot(n) {}
    string act() override { return name + " walks, says hello"; }   // walking copied
};
struct TalkingFlyingRobot : Robot {
    TalkingFlyingRobot(string n) : Robot(n) {}
    string act() override { return name + " flies, says hello"; }   // flying copied
};` }
              ] }
      },
      mcq: { q: 'The robot must switch from walking to flying while the program runs. What does that requirement tell you?', options: ['Use a deeper inheritance tree', 'Movement should be a part (field) the robot holds and can replace', 'Use instanceof checks', 'Make Robot an enum'], answer: 1, explain: 'An object cannot change its class at runtime, but it can replace a field. Runtime variability is the strongest clue for composition (Strategy).' },
      hints: [
        `<p>Hint 1: List the things that vary independently: <i>how it moves</i> and <i>how it speaks</i>. Each independent axis becomes its own interface.</p>`,
        `<p>Hint 2: <code>interface Movement { String move(); }</code> and <code>interface Speech { String speak(); }</code>. <code>Robot</code> holds one of each and delegates.</p>`,
        `<p>Hint 3: Add setters (or a builder) to swap parts. Default to sensible parts in the constructor. Check: swim = 1 new class; 3 movements × 2 speech = 6 combos with only 5 small classes + Robot.</p>`
      ],
      tests: { io: true, cases: [{ stdin: '', stdout: "R2 walks, says nothing\nR2 flies, says nothing\nR2 swims, says hello\n" }] },
      solution: {
        approach: `<p><b>Smell:</b> class explosion + duplicated behaviour + behaviour frozen at creation time. <b>Refactor:</b> Replace Inheritance with Delegation. Each axis of variation becomes an interface (<code>Movement</code>, <code>Speech</code>) with tiny implementations. <code>Robot</code> is now a single <code>final</code> class that <b>has</b> a movement and a speech part and delegates to them. Combinations are made by plugging parts in; runtime changes are a setter call. New ability = one new class, zero edits to existing ones (Open/Closed).</p>`,
        code: `interface Movement { String move(); }
class Walk implements Movement { public String move() { return "walks"; } }
class Fly  implements Movement { public String move() { return "flies"; } }
class Swim implements Movement { public String move() { return "swims"; } }   // new ability = 1 class

interface Speech { String speak(); }
class Silent implements Speech { public String speak() { return "says nothing"; } }
class Talk   implements Speech { public String speak() { return "says hello"; } }

final class Robot {
    private final String name;
    private Movement movement;
    private Speech speech;

    Robot(String name, Movement movement, Speech speech) {
        this.name = name;
        this.movement = movement;
        this.speech = speech;
    }
    void setMovement(Movement m) { this.movement = m; }   // runtime change
    void setSpeech(Speech s)     { this.speech = s; }

    String act() { return name + " " + movement.move() + ", " + speech.speak(); }
}

class RobotDemo {
    public static void main(String[] args) {
        Robot r2 = new Robot("R2", new Walk(), new Silent());
        System.out.println(r2.act());          // R2 walks, says nothing
        r2.setMovement(new Fly());             // wings unlocked
        System.out.println(r2.act());          // R2 flies, says nothing
        r2.setSpeech(new Talk());
        r2.setMovement(new Swim());
        System.out.println(r2.act());          // R2 swims, says hello
    }
}`,
        alt: [
          { lang: 'python', code: `from typing import Protocol


class Movement(Protocol):
    def move(self) -> str: ...


class Speech(Protocol):
    def speak(self) -> str: ...


class Walk:
    def move(self) -> str:
        return "walks"


class Fly:
    def move(self) -> str:
        return "flies"


class Swim:  # new ability = 1 class
    def move(self) -> str:
        return "swims"


class Silent:
    def speak(self) -> str:
        return "says nothing"


class Talk:
    def speak(self) -> str:
        return "says hello"


class Robot:
    def __init__(self, name: str, movement: Movement, speech: Speech) -> None:
        self._name = name
        self._movement = movement
        self._speech = speech

    def set_movement(self, movement: Movement) -> None:  # runtime change
        self._movement = movement

    def set_speech(self, speech: Speech) -> None:
        self._speech = speech

    def act(self) -> str:
        return f"{self._name} {self._movement.move()}, {self._speech.speak()}"


if __name__ == "__main__":
    r2 = Robot("R2", Walk(), Silent())
    print(r2.act())
    r2.set_movement(Fly())  # wings unlocked
    print(r2.act())
    r2.set_speech(Talk())
    r2.set_movement(Swim())
    print(r2.act())` },
          { lang: 'ts', code: `interface Movement { move(): string; }
class Walk implements Movement { move(): string { return "walks"; } }
class Fly implements Movement { move(): string { return "flies"; } }
class Swim implements Movement { move(): string { return "swims"; } } // new ability = 1 class

interface Speech { speak(): string; }
class Silent implements Speech { speak(): string { return "says nothing"; } }
class Talk implements Speech { speak(): string { return "says hello"; } }

class Robot {
  constructor(private readonly name: string, private movement: Movement, private speech: Speech) {}

  setMovement(m: Movement): void { this.movement = m; } // runtime change
  setSpeech(s: Speech): void { this.speech = s; }

  act(): string { return \`\${this.name} \${this.movement.move()}, \${this.speech.speak()}\`; }
}

const r2 = new Robot("R2", new Walk(), new Silent());
console.log(r2.act());
r2.setMovement(new Fly()); // wings unlocked
console.log(r2.act());
r2.setSpeech(new Talk());
r2.setMovement(new Swim());
console.log(r2.act());` },
          { lang: 'cpp', code: `class Movement {
public:
    virtual ~Movement() = default;
    virtual string move() const = 0;
};
class Walk : public Movement { public: string move() const override { return "walks"; } };
class Fly : public Movement { public: string move() const override { return "flies"; } };
class Swim : public Movement { public: string move() const override { return "swims"; } };   // new ability = 1 class

class Speech {
public:
    virtual ~Speech() = default;
    virtual string speak() const = 0;
};
class Silent : public Speech { public: string speak() const override { return "says nothing"; } };
class Talk : public Speech { public: string speak() const override { return "says hello"; } };

class Robot final {
    string name_;
    unique_ptr<Movement> movement_;   // the robot owns its parts
    unique_ptr<Speech> speech_;
public:
    Robot(string name, unique_ptr<Movement> movement, unique_ptr<Speech> speech)
        : name_(std::move(name)), movement_(std::move(movement)), speech_(std::move(speech)) {}

    void setMovement(unique_ptr<Movement> m) { movement_ = std::move(m); }   // runtime change
    void setSpeech(unique_ptr<Speech> s) { speech_ = std::move(s); }

    string act() const { return name_ + " " + movement_->move() + ", " + speech_->speak(); }
};

int main() {
    Robot r2("R2", make_unique<Walk>(), make_unique<Silent>());
    cout << r2.act() << "\\n";
    r2.setMovement(make_unique<Fly>());   // wings unlocked
    cout << r2.act() << "\\n";
    r2.setSpeech(make_unique<Talk>());
    r2.setMovement(make_unique<Swim>());
    cout << r2.act() << "\\n";
}` }
        ],
        complexity: `<p>Classes for m movements and s speech styles: inheritance m × s, composition m + s + 1. Runtime cost: one extra virtual call per action — negligible.</p>`,
        followUps: ['A robot can do several movements at once — what changes? (List&lt;Movement&gt;)', 'How would you stop invalid combos (a fish robot that talks)? (validation in a factory/builder)', 'Which GoF pattern is this? (Strategy; with stacking add-ons it would be Decorator)']
      }
    }]
  });

  /* =====================================================================
     TOPIC 4 — Coupling vs Cohesion
     ===================================================================== */
  topics.push({
    title: 'Coupling vs Cohesion (loose ties, tight teams)',
    analogy: `<p>Think of a kitchen. <b>Cohesion</b> is how well each drawer is organised: a cutlery drawer holding only cutlery is <b>highly cohesive</b>; a "junk drawer" with batteries, spoons, tape and old keys has <b>low cohesion</b> — you never know what is inside.</p>
<p><b>Coupling</b> is how many strings tie drawers together. If opening the cutlery drawer also yanks the spice rack and the oven door (because someone tied them with string), the kitchen is <b>tightly coupled</b>. Old Christmas lights wired in <i>series</i> are tightly coupled too: one dead bulb and the whole string goes dark. Goal: <b>organised drawers, few strings</b> — high cohesion, low coupling.</p>`,
    explain: `<p>These two words, from Larry Constantine's structured design work in the late 1960s/70s, are still the best two-word summary of good design.</p>
<ul>
<li><b>Coupling</b> = how much one module <i>knows about</i> or <i>depends on</i> another. If changing class A forces you to change class B, they are coupled. We want it <b>low</b> (loose).</li>
<li><b>Cohesion</b> = how strongly the things <i>inside</i> one module belong together — do its methods work on the same data for the same purpose? We want it <b>high</b>.</li>
</ul>
<p>They pull in the same direction: when each class has one focused job (high cohesion), it naturally needs fewer, narrower connections to others (low coupling).</p>
<p><b>Kinds of coupling, worst → best</b> (classic structured-design list):</p>
${H.table(['Coupling', 'What it looks like in code', 'Why it hurts'], [
  [H.c('r', 'Content'), 'Class A changes B\'s private fields via reflection or reaches into its internals', 'Any internal change to B breaks A'],
  [H.c('r', 'Common (global)'), 'Many classes read/write a <code>static</code> mutable <code>Config</code> or singleton', 'Hidden links; tests interfere with each other'],
  [H.c('y', 'External'), 'Many classes depend on a specific file format / vendor SDK', 'Vendor change ripples everywhere'],
  [H.c('y', 'Control'), '<code>print(report, true)</code> — a flag tells the callee which branch to run', 'Caller must know callee\'s internal logic'],
  [H.c('y', 'Stamp'), 'Passing a whole <code>User</code> when only <code>email</code> is needed', 'Callee depends on fields it never uses'],
  [H.c('g', 'Data'), 'Passing just the values needed: <code>send(email, text)</code>', 'Minimal knowledge'],
  [H.c('g', 'Message'), 'Talking only through an interface / events', 'Loosest; parts swap freely']
])}
<p><b>Kinds of cohesion, worst → best:</b> coincidental (random "Utils"), logical (grouped by category, e.g. "all input handling"), temporal (things that happen at the same time, like <code>init()</code>), procedural, communicational (same data), sequential (output of one is input of next), <b>functional</b> (everything contributes to one well-defined task) — the goal.</p>
<p><b>How to measure (rough but useful):</b></p>
<ul>
<li><b>Efferent coupling Ce</b> = how many classes <i>this</i> class depends on (fan-out). <b>Afferent coupling Ca</b> = how many depend on <i>it</i> (fan-in). <b>Instability I = Ce / (Ca + Ce)</b>: 0 = very stable (many depend on it, so it should be abstract), 1 = very unstable (free to change).</li>
<li><b>LCOM</b> ("Lack of Cohesion of Methods"): draw a table of methods × fields. If methods split into groups that share no fields, the class is really two (or more) classes glued together.</li>
</ul>
<p><b>The everyday fixes:</b> depend on <b>interfaces</b> not concrete classes, inject dependencies through the constructor, pass only the data needed, replace flag parameters with two methods, and split classes along their field-sharing groups (Extract Class).</p>`,
    clues: [
      '"If we switch from MySQL to Postgres / Stripe to Razorpay, how many classes change?" → coupling to concrete vendors; introduce an interface (port) and adapters.',
      '"This class is hard to unit test" → it creates its own dependencies (<code>new</code> inside) or uses static globals.',
      'A class named <code>Manager</code>, <code>Helper</code>, <code>Utils</code> with 40 unrelated methods → low (coincidental) cohesion.',
      'Boolean/enum parameter that selects which branch runs → control coupling.',
      '"A small change broke something far away" → hidden coupling (shared mutable state, global config).',
      'Interviewer draws boxes and arrows and asks "what would you change?" → count arrows into concrete classes, look for cycles.'
    ],
    code: { lang: 'java', code: `// BEFORE: high coupling — concrete classes created inside, global state, control flag.
class GlobalConfig { static String currency = "INR"; }           // common coupling
class MySqlDb { void insert(String row) { System.out.println("SQL INSERT " + row); } }
class SmtpMailer { void sendMail(String to, String msg) { System.out.println("SMTP " + to + ": " + msg); } }

class OrderServiceBefore {
    void place(String customerEmail, int amount, boolean sendMail) {   // control coupling
        MySqlDb db = new MySqlDb();                                    // hard-wired, untestable
        db.insert(customerEmail + "," + amount + "," + GlobalConfig.currency);
        if (sendMail) new SmtpMailer().sendMail(customerEmail, "Order placed");
    }
}

// AFTER: depend on small interfaces, inject them, pass only needed data.
interface OrderRepository { void save(String customerEmail, int amount, String currency); }
interface Notifier { void notify(String to, String message); }

class MySqlOrderRepository implements OrderRepository {
    public void save(String e, int a, String c) { System.out.println("SQL INSERT " + e + "," + a + "," + c); }
}
class EmailNotifier implements Notifier {
    public void notify(String to, String m) { System.out.println("SMTP " + to + ": " + m); }
}

class OrderService {
    private final OrderRepository orders;
    private final Notifier notifier;
    private final String currency;
    OrderService(OrderRepository orders, Notifier notifier, String currency) {
        this.orders = orders; this.notifier = notifier; this.currency = currency;
    }
    void place(String customerEmail, int amount) {          // one job, no flag
        orders.save(customerEmail, amount, currency);
        notifier.notify(customerEmail, "Order placed");
    }
}

class CouplingDemo {
    public static void main(String[] args) {
        new OrderServiceBefore().place("asha@mail.com", 500, true);
        OrderService s = new OrderService(new MySqlOrderRepository(), new EmailNotifier(), "INR");
        s.place("asha@mail.com", 500);
        // In a test: new OrderService((e, a, c) -> {}, (to, m) -> {}, "INR") — no DB, no SMTP needed.
    }
}`, alt: [
        { lang: 'python', code: `from typing import Protocol


# BEFORE: high coupling - concrete classes created inside, global state, control flag.
class GlobalConfig:
    currency = "INR"  # common coupling


class MySqlDb:
    def insert(self, row: str) -> None:
        print(f"SQL INSERT {row}")


class SmtpMailer:
    def send_mail(self, to: str, msg: str) -> None:
        print(f"SMTP {to}: {msg}")


class OrderServiceBefore:
    def place(self, customer_email: str, amount: int, send_mail: bool) -> None:  # control coupling
        db = MySqlDb()  # hard-wired, untestable
        db.insert(f"{customer_email},{amount},{GlobalConfig.currency}")
        if send_mail:
            SmtpMailer().send_mail(customer_email, "Order placed")


# AFTER: depend on small interfaces, inject them, pass only needed data.
class OrderRepository(Protocol):
    def save(self, customer_email: str, amount: int, currency: str) -> None: ...


class Notifier(Protocol):
    def notify(self, to: str, message: str) -> None: ...


class MySqlOrderRepository:
    def save(self, customer_email: str, amount: int, currency: str) -> None:
        print(f"SQL INSERT {customer_email},{amount},{currency}")


class EmailNotifier:
    def notify(self, to: str, message: str) -> None:
        print(f"SMTP {to}: {message}")


class OrderService:
    def __init__(self, orders: OrderRepository, notifier: Notifier, currency: str) -> None:
        self._orders = orders
        self._notifier = notifier
        self._currency = currency

    def place(self, customer_email: str, amount: int) -> None:  # one job, no flag
        self._orders.save(customer_email, amount, self._currency)
        self._notifier.notify(customer_email, "Order placed")


if __name__ == "__main__":
    OrderServiceBefore().place("asha@mail.com", 500, True)
    s = OrderService(MySqlOrderRepository(), EmailNotifier(), "INR")
    s.place("asha@mail.com", 500)
    # In a test: pass tiny fakes with save/notify methods - no DB, no SMTP needed.` },
        { lang: 'ts', code: `// BEFORE: high coupling - concrete classes created inside, global state, control flag.
class GlobalConfig { static currency = "INR"; } // common coupling
class MySqlDb { insert(row: string): void { console.log(\`SQL INSERT \${row}\`); } }
class SmtpMailer { sendMail(to: string, msg: string): void { console.log(\`SMTP \${to}: \${msg}\`); } }

class OrderServiceBefore {
  place(customerEmail: string, amount: number, sendMail: boolean): void { // control coupling
    const db = new MySqlDb(); // hard-wired, untestable
    db.insert(\`\${customerEmail},\${amount},\${GlobalConfig.currency}\`);
    if (sendMail) new SmtpMailer().sendMail(customerEmail, "Order placed");
  }
}

// AFTER: depend on small interfaces, inject them, pass only needed data.
interface OrderRepository { save(customerEmail: string, amount: number, currency: string): void; }
interface Notifier { notify(to: string, message: string): void; }

class MySqlOrderRepository implements OrderRepository {
  save(e: string, a: number, c: string): void { console.log(\`SQL INSERT \${e},\${a},\${c}\`); }
}
class EmailNotifier implements Notifier {
  notify(to: string, m: string): void { console.log(\`SMTP \${to}: \${m}\`); }
}

class OrderService {
  constructor(
    private readonly orders: OrderRepository,
    private readonly notifier: Notifier,
    private readonly currency: string,
  ) {}
  place(customerEmail: string, amount: number): void { // one job, no flag
    this.orders.save(customerEmail, amount, this.currency);
    this.notifier.notify(customerEmail, "Order placed");
  }
}

new OrderServiceBefore().place("asha@mail.com", 500, true);
const s = new OrderService(new MySqlOrderRepository(), new EmailNotifier(), "INR");
s.place("asha@mail.com", 500);
// In a test: new OrderService({ save() {} }, { notify() {} }, "INR") - no DB, no SMTP needed.` },
        { lang: 'cpp', code: `// BEFORE: high coupling - concrete classes created inside, global state, control flag.
struct GlobalConfig { static inline string currency = "INR"; };   // common coupling
class MySqlDb { public: void insert(const string& row) { cout << "SQL INSERT " << row << "\\n"; } };
class SmtpMailer { public: void sendMail(const string& to, const string& msg) { cout << "SMTP " << to << ": " << msg << "\\n"; } };

class OrderServiceBefore {
public:
    void place(const string& customerEmail, int amount, bool sendMail) {   // control coupling
        MySqlDb db;                                                         // hard-wired, untestable
        db.insert(customerEmail + "," + to_string(amount) + "," + GlobalConfig::currency);
        if (sendMail) SmtpMailer().sendMail(customerEmail, "Order placed");
    }
};

// AFTER: depend on small interfaces, inject them, pass only needed data.
class OrderRepository {
public:
    virtual ~OrderRepository() = default;
    virtual void save(const string& customerEmail, int amount, const string& currency) = 0;
};
class Notifier {
public:
    virtual ~Notifier() = default;
    virtual void notify(const string& to, const string& message) = 0;
};

class MySqlOrderRepository : public OrderRepository {
public:
    void save(const string& e, int a, const string& c) override { cout << "SQL INSERT " << e << "," << a << "," << c << "\\n"; }
};
class EmailNotifier : public Notifier {
public:
    void notify(const string& to, const string& m) override { cout << "SMTP " << to << ": " << m << "\\n"; }
};

class OrderService {
    OrderRepository& orders_;   // injected; the caller owns them and outlives the service
    Notifier& notifier_;
    string currency_;
public:
    OrderService(OrderRepository& orders, Notifier& notifier, string currency)
        : orders_(orders), notifier_(notifier), currency_(std::move(currency)) {}
    void place(const string& customerEmail, int amount) {   // one job, no flag
        orders_.save(customerEmail, amount, currency_);
        notifier_.notify(customerEmail, "Order placed");
    }
};

int main() {
    OrderServiceBefore().place("asha@mail.com", 500, true);
    MySqlOrderRepository repo;
    EmailNotifier notifier;
    OrderService s(repo, notifier, "INR");
    s.place("asha@mail.com", 500);
    // In a test: pass tiny fakes that implement save/notify - no DB, no SMTP needed.
}` }
      ] },
    codeTitle: 'From hard-wired dependencies to injected interfaces',
    viz: [{
      title: 'Dependency graph before/after: watch a change ripple',
      gen: function () {
        var bNodes = [bx('OS', 'OrderService', 50, 8), bx('DB', 'MySqlDb', 12, 36), bx('ML', 'SmtpMailer', 38, 36), bx('ST', 'StripeClient', 64, 36), bx('GC', 'GlobalConfig', 90, 36), bx('RP', 'ReportJob', 25, 56), bx('RF', 'RefundService', 75, 56)];
        var bEdges = [['OS', 'DB'], ['OS', 'ML'], ['OS', 'ST'], ['OS', 'GC'], ['RP', 'DB'], ['RP', 'GC'], ['RF', 'ST'], ['RF', 'GC']];
        var allBad = {};
        bEdges.forEach(function (e) { allBad[e[0] + '-' + e[1]] = 'bad'; });
        var f = [];
        f.push({ narr: '<b>BEFORE.</b> Three business classes (OrderService, ReportJob, RefundService) depend <i>directly</i> on concrete vendor classes and on a mutable global <code>GlobalConfig</code>. Every red arrow is "I know your concrete class".', parts: [gp('Concrete dependencies (tight coupling)', bNodes, bEdges, {}, allBad, {}, 64), { type: 'vars', label: 'OrderService', vals: { Ce_concrete: 4, testableWithoutDB: 'no' }, hl: { Ce_concrete: 'bad' } }] });
        f.push({ narr: 'Stripe releases SDK v2 with a renamed method. <code>StripeClient</code> changes (amber)…', parts: [gp('Change hits StripeClient', bNodes, bEdges, { ST: 'cur' }, allBad, { ST: 'SDK v2' }, 64)] });
        f.push({ narr: '…and the change <b>ripples</b> to every class with an arrow into it: <b>OrderService</b> and <b>RefundService</b> must be edited and re-tested. Ripple size = number of incoming arrows (afferent coupling of the changed class).', parts: [gp('Ripple effect', bNodes, bEdges, { ST: 'cur', OS: 'bad', RF: 'bad' }, allBad, { OS: 'must change', RF: 'must change' }, 64), { type: 'vars', label: 'impact', vals: { classesEdited: 3 }, hl: { classesEdited: 'bad' } }] });
        f.push({ narr: 'Worse: <code>GlobalConfig.currency</code> is a static mutable field. A test sets it to "USD" and forgets to reset; an unrelated ReportJob test fails later. That invisible link is <b>common coupling</b>.', parts: [gp('Hidden global link', bNodes, bEdges, { GC: 'bad', OS: 'cur', RP: 'cur', RF: 'cur' }, allBad, { GC: 'shared mutable state' }, 64)] });
        var aNodes = [bx('OS', 'OrderService', 22, 8), bx('RF', 'RefundService', 78, 8), bx('PG', 'PaymentGateway', 50, 28), bx('RE', 'OrderRepository', 15, 28), bx('NT', 'Notifier', 85, 28), bx('SA', 'StripeAdapter', 50, 52), bx('MR', 'MySqlOrderRepo', 15, 52), bx('EN', 'EmailNotifier', 85, 52)];
        var aEdges = [['OS', 'PG'], ['OS', 'RE'], ['OS', 'NT'], ['RF', 'PG'], ['SA', 'PG', 'implements'], ['MR', 'RE', 'implements'], ['EN', 'NT', 'implements']];
        var aOk = {};
        aEdges.forEach(function (e) { aOk[e[0] + '-' + e[1]] = 'ok'; });
        f.push({ narr: '<b>AFTER.</b> Business classes depend only on small <b>interfaces</b> they own (purple). Vendor code sits in <b>adapters</b> that implement those interfaces. Arrows now point <i>towards</i> abstractions (Dependency Inversion). Config is passed in through constructors — no globals.', parts: [gp('Depend on interfaces (loose coupling)', aNodes, aEdges, { PG: 'sel', RE: 'sel', NT: 'sel' }, aOk, {}, 60), { type: 'vars', label: 'OrderService', vals: { Ce_concrete: 0, Ce_interfaces: 3, testableWithoutDB: 'yes' }, hl: { Ce_concrete: 'ok', testableWithoutDB: 'ok' } }] });
        f.push({ narr: 'Same Stripe SDK v2 change. Only <b>StripeAdapter</b> changes. The interface <code>PaymentGateway</code> did not change, so the ripple <b>stops</b> there. OrderService and RefundService are untouched.', parts: [gp('Ripple stops at the adapter', aNodes, aEdges, { SA: 'cur', PG: 'ok', OS: 'done', RF: 'done' }, aOk, { SA: 'SDK v2 — only change', PG: 'unchanged' }, 60), { type: 'vars', label: 'impact', vals: { classesEdited: 1 }, hl: { classesEdited: 'ok' } }] });
        f.push({ narr: 'Bonus: swapping Stripe for Razorpay = write <code>RazorpayAdapter implements PaymentGateway</code> and change one line of wiring. In tests, pass a fake gateway — no network.', parts: [{ type: 'table', label: 'Before vs after', columns: ['Question', 'Before', 'After'], rows: [['Classes edited for SDK change', '3', '1'], ['Swap payment vendor', 'edit 2 business classes', 'new adapter + 1 wiring line'], ['Unit test OrderService', 'needs DB + SMTP + Stripe', 'pass fakes'], ['Global mutable state', 'yes', 'no']], hl: { 0: 'sel' } }] });
        return f;
      }
    }, {
      title: 'Cohesion table: find the hidden classes inside a "Manager"',
      input: 'login: passwordHash, sessions; logout: sessions; changePassword: passwordHash; exportReport: reportRows, reportFormat; addReportRow: reportRows; printInvoice: invoiceTemplate',
      inputLabel: 'method: fields it uses; next method: … (2-8 methods)',
      gen: function (input) {
        var def = 'login: passwordHash, sessions; logout: sessions; changePassword: passwordHash; exportReport: reportRows, reportFormat; addReportRow: reportRows; printInvoice: invoiceTemplate';
        var s = String(input === undefined || input === null || !String(input).trim() ? def : input);
        var chunks = s.split(';').map(function (x) { return x.trim(); }).filter(Boolean);
        if (chunks.length < 2 || chunks.length > 8) throw new Error('Write 2 to 8 methods like  login: passwordHash, sessions; logout: sessions');
        var methods = [], fields = [];
        chunks.forEach(function (c) {
          var p = c.split(':');
          if (p.length !== 2 || !p[0].trim()) throw new Error('Each method needs the form  name: field1, field2');
          var fs = p[1].split(',').map(function (x) { return x.trim(); }).filter(Boolean);
          if (!fs.length) throw new Error('Method "' + p[0].trim() + '" must use at least one field');
          fs.forEach(function (x) { if (fields.indexOf(x) < 0) fields.push(x); });
          methods.push({ name: short(p[0].trim(), 16), fields: fs });
        });
        if (fields.length > 8) throw new Error('Use at most 8 distinct fields');
        function tableRows(hlRow) {
          return methods.map(function (m) { return [m.name].concat(fields.map(function (fl) { return m.fields.indexOf(fl) >= 0 ? '✓' : ''; })); });
        }
        var cols = ['method'].concat(fields.map(function (x) { return short(x, 12); }));
        var frames = [];
        frames.push({ narr: 'One class, ' + methods.length + ' methods, ' + fields.length + ' fields. Each ✓ means "this method reads or writes this field". A highly cohesive class has ✓ marks that overlap a lot.', parts: [{ type: 'table', label: 'Method × field usage', columns: cols, rows: tableRows(), hl: {} }] });
        // union-find over methods via shared fields
        var parent = methods.map(function (_, i) { return i; });
        function find(x) { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }
        var owner = {};
        methods.forEach(function (m, i) {
          var joined = [];
          m.fields.forEach(function (fl) {
            if (owner[fl] === undefined) owner[fl] = i;
            else { var a = find(owner[fl]), b = find(i); if (a !== b) { parent[b] = a; joined.push(methods[owner[fl]].name + ' (via ' + fl + ')'); } }
          });
          var groups = {};
          for (var j = 0; j <= i; j++) { var r = find(j); (groups[r] = groups[r] || []).push(methods[j].name); }
          var entries = Object.keys(groups).map(function (k, gi) { return ['group ' + (gi + 1), groups[k].join(', ')]; });
          var hl = {}; hl[i] = 'cur';
          frames.push({ narr: 'Look at <b>' + H.esc(m.name) + '</b>. ' + (joined.length ? 'It shares a field with ' + H.esc(joined.join(' and ')) + ', so they belong in the <b>same group</b>.' : 'It shares no field with any earlier method, so it starts a <b>new group</b>.'), parts: [{ type: 'table', label: 'Method × field usage', columns: cols, rows: tableRows(), hl: hl }, { type: 'map', label: 'groups of methods that share data', entries: entries }] });
        });
        var P = 0, Q = 0;
        for (var a = 0; a < methods.length; a++) for (var b = a + 1; b < methods.length; b++) {
          var share = methods[a].fields.some(function (x) { return methods[b].fields.indexOf(x) >= 0; });
          if (share) Q++; else P++;
        }
        var lcom = Math.max(P - Q, 0);
        var groups = {};
        methods.forEach(function (m, i) { var r = find(i); (groups[r] = groups[r] || []).push(i); });
        var keys = Object.keys(groups);
        frames.push({ narr: 'Count method pairs: <b>' + P + '</b> pairs share <i>no</i> field, <b>' + Q + '</b> pairs share at least one. LCOM1 = max(P − Q, 0) = <b>' + lcom + '</b>. ' + (lcom > 0 ? 'Above 0 → <span class="c-r">the class is doing unrelated jobs</span>.' : 'Zero → the methods mostly work on shared data (good cohesion).') + ' A clearer signal: the number of disconnected groups = <b>' + keys.length + '</b>.', parts: [{ type: 'vars', label: 'cohesion metrics', vals: { pairsNoShare_P: P, pairsShare_Q: Q, LCOM1: lcom, groups: keys.length }, hl: { LCOM1: lcom > 0 ? 'bad' : 'ok', groups: keys.length > 1 ? 'bad' : 'ok' } }] });
        var nodes = [bx('BIG', 'Original class', 50, 8)], edges = [], ghl = { BIG: keys.length > 1 ? 'bad' : 'ok' }, tags = {}, ehl = {};
        keys.forEach(function (k, gi) {
          var id = 'G' + gi, fl = [];
          groups[k].forEach(function (mi) { methods[mi].fields.forEach(function (x) { if (fl.indexOf(x) < 0) fl.push(x); }); });
          nodes.push(bx(id, 'Class ' + (gi + 1) + ' (' + groups[k].length + ' methods)', spread(keys.length, gi, 14, 86), 40));
          edges.push(['BIG', id, 'Extract Class']); ehl['BIG-' + id] = 'ok'; ghl[id] = 'ok';
          tags[id] = short(fl.join(', '), 26);
        });
        frames.push({ narr: keys.length > 1 ? '<b>Refactor:</b> Extract Class along the groups. Each new class owns its fields and the methods that use them — every one of them is highly cohesive. Name them by their job (e.g. <i>Authenticator</i>, <i>ReportBuilder</i>, <i>InvoicePrinter</i>).' : 'Only one group: this class is already cohesive. Do not split it just because it is big — split by <b>data and purpose</b>, not by line count.', parts: [gp('Suggested split', nodes, edges, ghl, ehl, tags, 54)] });
        var rows = keys.map(function (k, gi) {
          var fl = [];
          groups[k].forEach(function (mi) { methods[mi].fields.forEach(function (x) { if (fl.indexOf(x) < 0) fl.push(x); }); });
          return ['Class ' + (gi + 1), groups[k].map(function (mi) { return methods[mi].name; }).join(', '), fl.join(', ')];
        });
        frames.push({ narr: 'Final map of new classes. Callers that only did reports now depend only on the report class — so splitting for cohesion also <b>reduced coupling</b> for everyone else.', parts: [{ type: 'table', label: 'New classes', columns: ['class', 'methods', 'fields it owns'], rows: rows, hl: {} }] });
        return frames;
      }
    }],
    examples: [
      { title: 'Control coupling: kill the boolean flag', html: `<p><code>render(doc, true)</code> — what does <code>true</code> mean? The caller must know the callee's insides. Split into two intention-revealing methods. Each is simpler and the call site reads like English.</p>`, code: { lang: 'java', code: `class Renderer {
    // before: String render(String doc, boolean asPdf) { if (asPdf) ... else ... }
    String renderHtml(String doc) { return "<html>" + doc + "</html>"; }
    String renderPdf(String doc)  { return "%PDF " + doc; }
}`, alt: [
          { lang: 'python', code: `class Renderer:
    # before: def render(self, doc, as_pdf: bool): if as_pdf: ... else: ...
    def render_html(self, doc: str) -> str:
        return f"<html>{doc}</html>"

    def render_pdf(self, doc: str) -> str:
        return f"%PDF {doc}"` },
          { lang: 'ts', code: `class Renderer {
  // before: render(doc: string, asPdf: boolean): string { if (asPdf) ... else ... }
  renderHtml(doc: string): string { return \`<html>\${doc}</html>\`; }
  renderPdf(doc: string): string { return \`%PDF \${doc}\`; }
}` },
          { lang: 'cpp', code: `class Renderer {
public:
    // before: string render(const string& doc, bool asPdf) { if (asPdf) ... else ... }
    string renderHtml(const string& doc) const { return "<html>" + doc + "</html>"; }
    string renderPdf(const string& doc) const { return "%PDF " + doc; }
};` }
        ] } },
      { title: 'Stamp coupling: pass only what you need', html: `<p><code>sendWelcome(User user)</code> only reads <code>user.email()</code>. Now the mailer depends on <code>User</code>, its package and every future field. <code>sendWelcome(String email)</code> is reusable for leads and guests too. (Counterpoint: if you would pass 5 fields of User, a small parameter object is better than 5 strings.)</p>` },
      { title: 'Temporal cohesion: the init() junk drawer', html: `<p><code>AppStartup.init()</code> loads config, warms the product cache, starts the metrics thread and sends a "server up" Slack message. They are together only because they happen at the same time. Each belongs to its own component with its own <code>start()</code>; the startup class just calls them in order.</p>` },
      { title: 'Package-level coupling: cycles', html: `<p>If <code>orders</code> imports <code>payments</code> and <code>payments</code> imports <code>orders</code>, neither can be built, tested or released alone. Break the cycle by moving the shared type to a third package or by introducing an interface in one package that the other implements (the <b>Acyclic Dependencies Principle</b>). Tools such as ArchUnit can fail the build when a cycle appears.</p>` }
    ],
    deepDive: `<p><b>Connascence</b> (Meilir Page-Jones) is a finer-grained vocabulary for coupling: two parts are connascent if changing one requires changing the other. <i>Static</i> forms, weakest to strongest: <b>name</b> (rename a method → callers change), <b>type</b>, <b>meaning</b> (magic value 2 means "admin" in both places), <b>position</b> (argument order), <b>algorithm</b> (both sides must hash the same way). <i>Dynamic</i> forms: <b>execution order</b>, <b>timing</b>, <b>value</b> (two values must stay in sync), <b>identity</b> (must be the very same object). Rules: convert strong forms into weaker ones (position → name with a parameter object; meaning → enum), and keep strong connascence <b>local</b> (inside one class, not across services).</p>
<p><b>Robert C. Martin's package metrics:</b> Instability I = Ce/(Ca+Ce) and Abstractness A = abstract types / all types. Good packages sit near the "main sequence" A + I ≈ 1. A package with I ≈ 0 (everyone depends on it) and A ≈ 0 (all concrete) is the <b>zone of pain</b> — hard to change, and everyone suffers when it does. The <b>Stable Dependencies Principle</b>: depend in the direction of stability.</p>
<p><b>Coupling at runtime and across the network:</b> two microservices that must be deployed together, share a database table, or call each other synchronously in a chain are tightly coupled even if their code is separate (the <b>distributed monolith</b>). Asynchronous events, owned data and versioned contracts are the service-level versions of "depend on interfaces".</p>
<p><b>Cohesion metrics:</b> LCOM has many variants (LCOM1–LCOM4, LCOM-HS). LCOM4 counts connected components of methods (linked by shared fields or calls) — exactly what the visualizer computes; LCOM4 = 1 is ideal. Treat metrics as conversation starters: getters/setters and DTOs fool them.</p>
<p><b>Trade-off:</b> zero coupling is impossible — a system is <i>parts that work together</i>. The goal is that each dependency is <b>intentional, narrow, and pointing at something stable</b>.</p>`,
    aiEra: `<p><b>What AI changes:</b> coding agents work best on <b>loosely coupled, highly cohesive</b> code. An agent asked to "change the refund rule" can read one 150-line class and its tests. In a tangled codebase it must load 20 files into its context window, and it is far more likely to miss a ripple. Good modular design is now also <i>AI-friendly</i> design.</p>
<p><b>Use AI as a partner:</b> ask <code>Draw the dependency graph of these classes as a list of A -> B edges and point out cycles and dependencies on concrete vendor classes.</code> or <code>Group the methods of this class by which fields they use and propose an Extract Class split.</code> These are mechanical analyses where AI is fast; you then check the proposal against the domain.</p>
<p><b>Where AI goes wrong:</b> it often "decouples" by adding an interface in front of <i>everything</i>, which adds indirection without reducing real coupling (both sides still change together). It also happily introduces static helpers and singletons because they are quick to call.</p>
<p><b>What you must still own:</b> choosing the <i>seams</i> — where change is likely (vendors, I/O, policies) — and keeping strong coupling local. That requires knowing the business, not just the code.</p>`,
    problems: [{
      title: 'Untestable OrderService hard-wired to vendors',
      level: 'Medium', tags: ['coupling', 'dependency injection', 'interfaces'], companies: ['Razorpay', 'Microsoft'],
      statement: `<p>The <code>CheckoutService</code> below creates its own <code>StripeClient</code> and <code>SmtpMailer</code> with <code>new</code>, reads a static <code>Settings.taxPercent</code>, and takes a <code>boolean dryRun</code> that changes what it does. Unit tests hit the real payment API. Refactor to reduce coupling so that: tests need no network, the payment vendor can be swapped, and there is no global mutable state or control flag.</p>`,
      constraints: `Keep the public behaviour: charge amount + tax, then email a receipt. No frameworks (plain constructor injection).`,
      example: `<p>Charge 1000 with tax 18 → gateway receives ${H.c('g', '1180')}, customer receives "Paid 1180". In a test with a fake gateway, ${H.c('g', 'no real API call')} happens and we can assert the amount.</p>`,
      brute: {
        why: `<p>Four kinds of coupling in one class: <b>external</b> (concrete Stripe/SMTP classes), <b>common</b> (static mutable <code>Settings</code>), <b>control</b> (<code>dryRun</code> flag), and creation coupling (<code>new</code> inside means you cannot substitute anything). Consequences: tests are slow and flaky, switching vendor edits business code, and one test changing <code>Settings.taxPercent</code> breaks others.</p>`,
        code: { lang: 'java', code: `class Settings { static int taxPercent = 18; }
class StripeClient { String charge(int amount) { return "stripe-txn-" + amount; } }
class SmtpMailer { void send(String to, String body) { System.out.println("SMTP " + to + " " + body); } }

class CheckoutService {
    String checkout(String email, int amount, boolean dryRun) {
        int total = amount + amount * Settings.taxPercent / 100;
        if (dryRun) return "DRY " + total;
        String txn = new StripeClient().charge(total);
        new SmtpMailer().send(email, "Paid " + total);
        return txn;
    }
}`, alt: [
                { lang: 'python', code: `
class Settings:
    tax_percent = 18
class StripeClient:
    def charge(self, amount): return f"stripe-txn-{amount}"
class SmtpMailer:
    def send(self, to, body): print("SMTP", to, body)

class CheckoutService:
    def checkout(self, email, amount, dry_run):
        total = amount + amount * Settings.tax_percent // 100
        if dry_run: return f"DRY {total}"
        txn = StripeClient().charge(total)
        SmtpMailer().send(email, f"Paid {total}")
        return txn` },
                { lang: 'ts', code: `
class Settings { static taxPercent = 18; }
class StripeClient { charge(amount: number): string { return "stripe-txn-" + amount; } }
class SmtpMailer { send(to: string, body: string): void { console.log("SMTP " + to + " " + body); } }

class CheckoutService {
    checkout(email: string, amount: number, dryRun: boolean): string {
        const total = amount + Math.floor(amount * Settings.taxPercent / 100);
        if (dryRun) return "DRY " + total;
        const txn = new StripeClient().charge(total);
        new SmtpMailer().send(email, "Paid " + total);
        return txn;
    }
}` },
                { lang: 'cpp', code: `
struct Settings { static inline int taxPercent = 18; };
struct StripeClient { string charge(int amount) { return "stripe-txn-" + to_string(amount); } };
struct SmtpMailer { void send(const string& to, const string& body) { cout << "SMTP " << to << " " << body << "\\n"; } };

class CheckoutService {
public:
    string checkout(const string& email, int amount, bool dryRun) {
        int total = amount + amount * Settings::taxPercent / 100;
        if (dryRun) return "DRY " + to_string(total);
        string txn = StripeClient().charge(total);
        SmtpMailer().send(email, "Paid " + to_string(total));
        return txn;
    }
};` }
              ] }
      },
      mcq: { q: 'What is the single most useful first step to make CheckoutService unit-testable?', options: ['Make every method static', 'Accept PaymentGateway and Mailer interfaces through the constructor instead of calling new', 'Add more dryRun flags', 'Catch all exceptions'], answer: 1, explain: 'Constructor injection of interfaces lets tests pass fakes, removes the vendor from business code and makes dependencies visible.' },
      hints: [
        `<p>Hint 1: Circle every <code>new</code>, every <code>static</code> field and every boolean parameter. Each is a coupling point.</p>`,
        `<p>Hint 2: Define <code>PaymentGateway</code> and <code>Mailer</code> interfaces owned by the checkout code. Pass them plus <code>taxPercent</code> into the constructor.</p>`,
        `<p>Hint 3: Replace <code>dryRun</code> with a different gateway implementation (a <code>DryRunGateway</code> that charges nothing). Write a recording fake in the demo to prove the amount is 1180.</p>`
      ],
      tests: { io: true, cases: [{ stdin: '', stdout: "[1180] [asha@mail.com:Paid 1180]\nMAIL ben@mail.com Paid 590\nstripe-txn-590\nMAIL cy@mail.com Paid 100\nDRY 100\n" }] },
      solution: {
        approach: `<p><b>Spot:</b> external + common + control coupling and hard-coded creation. <b>Refactor steps:</b> (1) Extract Interface <code>PaymentGateway</code>, <code>Mailer</code>; (2) move vendor code into adapters <code>StripeGateway</code>, <code>SmtpMailerAdapter</code>; (3) constructor-inject the interfaces and the tax rate (no global); (4) Replace Parameter with Polymorphism: <code>dryRun</code> becomes a <code>DryRunGateway</code>. Now <code>CheckoutService</code> has one job, depends only on abstractions it owns, and is trivially testable.</p>`,
        code: `interface PaymentGateway { String charge(int amount); }
interface Mailer { void send(String to, String body); }

class StripeGateway implements PaymentGateway {          // adapter around the vendor SDK
    public String charge(int amount) { return "stripe-txn-" + amount; }
}
class DryRunGateway implements PaymentGateway {          // replaces the dryRun flag
    public String charge(int amount) { return "DRY " + amount; }
}
class ConsoleMailer implements Mailer {
    public void send(String to, String body) { System.out.println("MAIL " + to + " " + body); }
}

class CheckoutService {
    private final PaymentGateway gateway;
    private final Mailer mailer;
    private final int taxPercent;
    CheckoutService(PaymentGateway gateway, Mailer mailer, int taxPercent) {
        this.gateway = gateway; this.mailer = mailer; this.taxPercent = taxPercent;
    }
    String checkout(String email, int amount) {
        int total = amount + amount * taxPercent / 100;
        String txn = gateway.charge(total);
        mailer.send(email, "Paid " + total);
        return txn;
    }
}

class CheckoutTestDemo {
    public static void main(String[] args) {
        // "unit test" with fakes: no network, no globals
        List<Integer> charged = new ArrayList<>();
        List<String> mails = new ArrayList<>();
        CheckoutService svc = new CheckoutService(
            amount -> { charged.add(amount); return "fake-txn"; },
            (to, body) -> mails.add(to + ":" + body),
            18);
        svc.checkout("asha@mail.com", 1000);
        System.out.println(charged + " " + mails);           // [1180] [asha@mail.com:Paid 1180]

        // production wiring, then the dry-run gateway that replaces the old boolean flag
        System.out.println(new CheckoutService(new StripeGateway(), new ConsoleMailer(), 18).checkout("ben@mail.com", 500));
        System.out.println(new CheckoutService(new DryRunGateway(), new ConsoleMailer(), 0).checkout("cy@mail.com", 100));
    }
}`,
        alt: [
          { lang: 'python', code: `from typing import Protocol


class PaymentGateway(Protocol):
    def charge(self, amount: int) -> str: ...


class Mailer(Protocol):
    def send(self, to: str, body: str) -> None: ...


class StripeGateway:  # adapter around the vendor SDK
    def charge(self, amount: int) -> str:
        return f"stripe-txn-{amount}"


class DryRunGateway:  # replaces the dry_run flag
    def charge(self, amount: int) -> str:
        return f"DRY {amount}"


class ConsoleMailer:
    def send(self, to: str, body: str) -> None:
        print(f"MAIL {to} {body}")


class CheckoutService:
    def __init__(self, gateway: PaymentGateway, mailer: Mailer, tax_percent: int) -> None:
        self._gateway = gateway
        self._mailer = mailer
        self._tax_percent = tax_percent

    def checkout(self, email: str, amount: int) -> str:
        total = amount + amount * self._tax_percent // 100
        txn = self._gateway.charge(total)
        self._mailer.send(email, f"Paid {total}")
        return txn


class RecordingGateway:  # test fake: no network
    def __init__(self) -> None:
        self.charged: list[int] = []

    def charge(self, amount: int) -> str:
        self.charged.append(amount)
        return "fake-txn"


class RecordingMailer:
    def __init__(self) -> None:
        self.mails: list[str] = []

    def send(self, to: str, body: str) -> None:
        self.mails.append(f"{to}:{body}")


if __name__ == "__main__":
    gateway, mailer = RecordingGateway(), RecordingMailer()
    CheckoutService(gateway, mailer, 18).checkout("asha@mail.com", 1000)
    print(f"[{', '.join(map(str, gateway.charged))}] [{', '.join(mailer.mails)}]")

    print(CheckoutService(StripeGateway(), ConsoleMailer(), 18).checkout("ben@mail.com", 500))
    print(CheckoutService(DryRunGateway(), ConsoleMailer(), 0).checkout("cy@mail.com", 100))` },
          { lang: 'ts', code: `interface PaymentGateway { charge(amount: number): string; }
interface Mailer { send(to: string, body: string): void; }

class StripeGateway implements PaymentGateway { // adapter around the vendor SDK
  charge(amount: number): string { return \`stripe-txn-\${amount}\`; }
}
class DryRunGateway implements PaymentGateway { // replaces the dryRun flag
  charge(amount: number): string { return \`DRY \${amount}\`; }
}
class ConsoleMailer implements Mailer {
  send(to: string, body: string): void { console.log(\`MAIL \${to} \${body}\`); }
}

class CheckoutService {
  constructor(
    private readonly gateway: PaymentGateway,
    private readonly mailer: Mailer,
    private readonly taxPercent: number,
  ) {}

  checkout(email: string, amount: number): string {
    const total = amount + Math.floor((amount * this.taxPercent) / 100);
    const txn = this.gateway.charge(total);
    this.mailer.send(email, \`Paid \${total}\`);
    return txn;
  }
}

// "unit test" with fakes: object literals satisfy the interfaces
const charged: number[] = [];
const mails: string[] = [];
const svc = new CheckoutService(
  { charge: (amount) => { charged.push(amount); return "fake-txn"; } },
  { send: (to, body) => { mails.push(\`\${to}:\${body}\`); } },
  18,
);
svc.checkout("asha@mail.com", 1000);
console.log(\`[\${charged.join(", ")}] [\${mails.join(", ")}]\`);

console.log(new CheckoutService(new StripeGateway(), new ConsoleMailer(), 18).checkout("ben@mail.com", 500));
console.log(new CheckoutService(new DryRunGateway(), new ConsoleMailer(), 0).checkout("cy@mail.com", 100));` },
          { lang: 'cpp', code: `class PaymentGateway {
public:
    virtual ~PaymentGateway() = default;
    virtual string charge(int amount) = 0;
};
class Mailer {
public:
    virtual ~Mailer() = default;
    virtual void send(const string& to, const string& body) = 0;
};

class StripeGateway : public PaymentGateway {   // adapter around the vendor SDK
public:
    string charge(int amount) override { return "stripe-txn-" + to_string(amount); }
};
class DryRunGateway : public PaymentGateway {   // replaces the dryRun flag
public:
    string charge(int amount) override { return "DRY " + to_string(amount); }
};
class ConsoleMailer : public Mailer {
public:
    void send(const string& to, const string& body) override { cout << "MAIL " << to << " " << body << "\\n"; }
};

class CheckoutService {
    PaymentGateway& gateway_;   // injected; the composition root owns them
    Mailer& mailer_;
    int taxPercent_;
public:
    CheckoutService(PaymentGateway& gateway, Mailer& mailer, int taxPercent)
        : gateway_(gateway), mailer_(mailer), taxPercent_(taxPercent) {}

    string checkout(const string& email, int amount) {
        int total = amount + amount * taxPercent_ / 100;
        string txn = gateway_.charge(total);
        mailer_.send(email, "Paid " + to_string(total));
        return txn;
    }
};

class RecordingGateway : public PaymentGateway {   // test fake: no network
public:
    vector<int> charged;
    string charge(int amount) override { charged.push_back(amount); return "fake-txn"; }
};
class RecordingMailer : public Mailer {
public:
    vector<string> mails;
    void send(const string& to, const string& body) override { mails.push_back(to + ":" + body); }
};

int main() {
    RecordingGateway gateway;
    RecordingMailer mailer;
    CheckoutService(gateway, mailer, 18).checkout("asha@mail.com", 1000);
    cout << "[";
    for (size_t i = 0; i < gateway.charged.size(); i++) cout << (i ? ", " : "") << gateway.charged[i];
    cout << "] [";
    for (size_t i = 0; i < mailer.mails.size(); i++) cout << (i ? ", " : "") << mailer.mails[i];
    cout << "]\\n";

    StripeGateway stripe;
    DryRunGateway dryRun;
    ConsoleMailer console;
    cout << CheckoutService(stripe, console, 18).checkout("ben@mail.com", 500) << "\\n";
    cout << CheckoutService(dryRun, console, 0).checkout("cy@mail.com", 100) << "\\n";
}` }
        ],
        complexity: `<p>Concrete dependencies of CheckoutService: 3 → 0. Test runtime: network-bound → microseconds. Classes: 4 → 6 small ones (a fair price for testability and vendor freedom).</p>`,
        followUps: ['Who creates the objects now? (a composition root / main / DI container like Spring)', 'Is an interface for Mailer YAGNI? (No: the test is a present-day second implementation)', 'How would you handle tax rules per country? (TaxPolicy strategy injected the same way)']
      }
    }]
  });

  /* =====================================================================
     TOPIC 5 — Law of Demeter
     ===================================================================== */
  topics.push({
    title: 'Law of Demeter & Tell, Don\'t Ask (talk only to your friends)',
    analogy: `<p>The newspaper boy comes to collect ₹200. Option A: he reaches into your back pocket, pulls out your wallet, opens it, takes the cash and puts the wallet back. Option B: he says "₹200 please" and <b>you</b> decide how to pay — wallet, UPI, or a note from the kitchen drawer.</p>
<p>Option A is creepy <i>and</i> fragile: the day you keep money in your phone case, his "algorithm" breaks. Option B is the <b>Law of Demeter</b>: <i>talk only to your immediate friends, not to your friends' friends</i>. You also do not walk into a restaurant kitchen and tell the chef which pan to use — you <b>tell the waiter</b> what you want.</p>`,
    explain: `<p>The <b>Law of Demeter</b> (LoD, also "principle of least knowledge") came from the Demeter project at Northeastern University (1987). For a method <code>m</code> of an object <code>O</code>, <code>m</code> should only call methods on:</p>
<ol>
<li><code>O</code> itself (<code>this</code>),</li>
<li><code>m</code>'s <b>parameters</b>,</li>
<li>objects <b>created</b> inside <code>m</code>,</li>
<li><code>O</code>'s own <b>fields</b> (its direct parts),</li>
<li>(and globally reachable constants / well-known objects).</li>
</ol>
<p>What it forbids is calling methods on objects <b>returned by</b> those calls — strangers. The classic violation is a <b>train wreck</b>:</p>
<pre>String city = order.getCustomer().getAddress().getCity();</pre>
<p>This one line makes the shipping code know that orders have customers, customers have addresses, and addresses have cities. If the business adds "ship to a pickup point instead of home", <i>every</i> train wreck through <code>getAddress()</code> must change. That is hidden structural <b>coupling</b>.</p>
<p><b>The fix is "Tell, Don't Ask":</b> instead of <i>asking</i> for an object's insides and doing the work yourself, <i>tell</i> the object what you need and let it do the work with its own data.</p>
${H.table(['Ask (violates LoD)', 'Tell (follows LoD)'], [
  ['<code>order.getCustomer().getAddress().getCity()</code>', '<code>order.shippingCity()</code>'],
  ['<code>if (acct.getBalance() &gt;= amt) acct.setBalance(acct.getBalance() - amt);</code>', '<code>acct.withdraw(amt);</code> (the account checks its own balance)'],
  ['<code>car.getEngine().getFuelTank().getLevel() &lt; 10</code>', '<code>car.needsFuel()</code>']
])}
<p><b>It is not about counting dots.</b> These are all fine:</p>
<ul>
<li><b>Fluent APIs / builders</b> that return the same object: <code>sb.append("a").append("b")</code>, <code>Order.builder().id(1).build()</code>.</li>
<li><b>Streams and pipelines</b>: <code>list.stream().filter(...).map(...).toList()</code> (or a comprehension, <code>array.filter().map()</code>, <code>std::ranges</code>) — each call returns a stream you created; you are talking to one friend.</li>
<li><b>Plain data structures</b> (records, dataclasses, plain structs, DTOs) whose whole job is to expose data: <code>dto.address().city()</code> on a JSON response record. Bob Martin (Clean Code) separates <i>objects</i> (hide data, expose behaviour) from <i>data structures</i> (expose data, no behaviour). LoD is for objects.</li>
</ul>
<p><b>Do not overdo it:</b> wrapping every nested getter creates a <b>Middle Man</b> smell — classes that only forward calls. Add a "tell" method when it expresses a real domain idea (<code>needsFuel</code>, <code>shippingCity</code>), not mechanically for every field.</p>`,
    clues: [
      'Chains like <code>a.getB().getC().doX()</code> in the code under review → train wreck / Law of Demeter.',
      '"Changing the Address class broke code in 15 unrelated places" → structural coupling from reaching through objects.',
      'Mocks returning mocks returning mocks in a unit test (<code>RETURNS_DEEP_STUBS</code>) → the code under test violates LoD.',
      'Logic outside a class that reads its fields, decides, then sets its fields (<code>if (x.getA()...) x.setA(...)</code>) → Tell, Don\'t Ask / feature envy.',
      'Interviewer: "is <code>list.stream().map().filter()</code> a violation?" → they want the "not dot counting" nuance.',
      'Class that only forwards calls to another → over-applied LoD; Middle Man smell.'
    ],
    code: { lang: 'java', code: `// ----- BEFORE: the paperboy reaches into the customer's wallet -----
class Wallet {
    private int cash;
    Wallet(int cash) { this.cash = cash; }
    int getCash() { return cash; }
    void setCash(int c) { cash = c; }
}
class CustomerBefore {
    private final Wallet wallet;
    CustomerBefore(Wallet w) { wallet = w; }
    Wallet getWallet() { return wallet; }          // exposes its insides
}
class PaperboyBefore {
    int collected = 0;
    void collect(CustomerBefore c, int due) {
        Wallet w = c.getWallet();                   // stranger!
        if (w.getCash() >= due) {                   // talking to the stranger
            w.setCash(w.getCash() - due);           // and changing its state
            collected += due;
        }
    }
}

// ----- AFTER: tell, don't ask -----
class Customer {
    private final Wallet wallet;                    // private part, never handed out
    Customer(Wallet w) { wallet = w; }
    /** Pays if possible; returns the amount actually paid. Customer decides HOW. */
    int pay(int due) {
        if (wallet.getCash() < due) return 0;       // Customer talks to ITS OWN field: allowed
        wallet.setCash(wallet.getCash() - due);
        return due;
    }
}
class Paperboy {
    int collected = 0;
    void collect(Customer c, int due) {
        collected += c.pay(due);                    // only talks to a parameter: allowed
    }
}

class DemeterDemo {
    public static void main(String[] args) {
        Paperboy p = new Paperboy();
        p.collect(new Customer(new Wallet(500)), 200);
        p.collect(new Customer(new Wallet(100)), 200);
        System.out.println("collected = " + p.collected);   // 200
    }
}`, alt: [
        { lang: 'python', code: `# ----- BEFORE: the paperboy reaches into the customer's wallet -----
class Wallet:
    def __init__(self, cash: int) -> None:
        self._cash = cash

    def get_cash(self) -> int:
        return self._cash

    def set_cash(self, c: int) -> None:
        self._cash = c


class CustomerBefore:
    def __init__(self, w: Wallet) -> None:
        self._wallet = w

    def get_wallet(self) -> Wallet:  # exposes its insides
        return self._wallet


class PaperboyBefore:
    def __init__(self) -> None:
        self.collected = 0

    def collect(self, c: CustomerBefore, due: int) -> None:
        w = c.get_wallet()  # stranger!
        if w.get_cash() >= due:  # talking to the stranger
            w.set_cash(w.get_cash() - due)  # and changing its state
            self.collected += due


# ----- AFTER: tell, don't ask -----
class Customer:
    def __init__(self, w: Wallet) -> None:
        self._wallet = w  # private part, never handed out

    def pay(self, due: int) -> int:
        """Pays if possible; returns the amount actually paid. Customer decides HOW."""
        if self._wallet.get_cash() < due:  # Customer talks to ITS OWN field: allowed
            return 0
        self._wallet.set_cash(self._wallet.get_cash() - due)
        return due


class Paperboy:
    def __init__(self) -> None:
        self.collected = 0

    def collect(self, c: Customer, due: int) -> None:
        self.collected += c.pay(due)  # only talks to a parameter: allowed


if __name__ == "__main__":
    p = Paperboy()
    p.collect(Customer(Wallet(500)), 200)
    p.collect(Customer(Wallet(100)), 200)
    print(f"collected = {p.collected}")  # 200` },
        { lang: 'ts', code: `// ----- BEFORE: the paperboy reaches into the customer's wallet -----
class Wallet {
  constructor(private cash: number) {}
  getCash(): number { return this.cash; }
  setCash(c: number): void { this.cash = c; }
}
class CustomerBefore {
  constructor(private readonly wallet: Wallet) {}
  getWallet(): Wallet { return this.wallet; } // exposes its insides
}
class PaperboyBefore {
  collected = 0;
  collect(c: CustomerBefore, due: number): void {
    const w = c.getWallet(); // stranger!
    if (w.getCash() >= due) { // talking to the stranger
      w.setCash(w.getCash() - due); // and changing its state
      this.collected += due;
    }
  }
}

// ----- AFTER: tell, don't ask -----
class Customer {
  constructor(private readonly wallet: Wallet) {} // private part, never handed out
  /** Pays if possible; returns the amount actually paid. Customer decides HOW. */
  pay(due: number): number {
    if (this.wallet.getCash() < due) return 0; // Customer talks to ITS OWN field: allowed
    this.wallet.setCash(this.wallet.getCash() - due);
    return due;
  }
}
class Paperboy {
  collected = 0;
  collect(c: Customer, due: number): void {
    this.collected += c.pay(due); // only talks to a parameter: allowed
  }
}

const p = new Paperboy();
p.collect(new Customer(new Wallet(500)), 200);
p.collect(new Customer(new Wallet(100)), 200);
console.log(\`collected = \${p.collected}\`); // 200` },
        { lang: 'cpp', code: `// ----- BEFORE: the paperboy reaches into the customer's wallet -----
class Wallet {
    int cash_;
public:
    explicit Wallet(int cash) : cash_(cash) {}
    int getCash() const { return cash_; }
    void setCash(int c) { cash_ = c; }
};
class CustomerBefore {
    Wallet wallet_;
public:
    explicit CustomerBefore(Wallet w) : wallet_(w) {}
    Wallet& getWallet() { return wallet_; }          // exposes its insides
};
class PaperboyBefore {
public:
    int collected = 0;
    void collect(CustomerBefore& c, int due) {
        Wallet& w = c.getWallet();                    // stranger!
        if (w.getCash() >= due) {                     // talking to the stranger
            w.setCash(w.getCash() - due);             // and changing its state
            collected += due;
        }
    }
};

// ----- AFTER: tell, don't ask -----
class Customer {
    Wallet wallet_;                                   // private part, never handed out
public:
    explicit Customer(Wallet w) : wallet_(w) {}
    // Pays if possible; returns the amount actually paid. Customer decides HOW.
    int pay(int due) {
        if (wallet_.getCash() < due) return 0;        // Customer talks to ITS OWN field: allowed
        wallet_.setCash(wallet_.getCash() - due);
        return due;
    }
};
class Paperboy {
public:
    int collected = 0;
    void collect(Customer& c, int due) {
        collected += c.pay(due);                      // only talks to a parameter: allowed
    }
};

int main() {
    Paperboy p;
    Customer a{Wallet(500)}, b{Wallet(100)};
    p.collect(a, 200);
    p.collect(b, 200);
    cout << "collected = " << p.collected << "\\n";    // 200
}` }
      ] },
    codeTitle: 'Paperboy and the wallet — before and after',
    viz: [{
      title: 'Train wreck inspector',
      input: 'order.getCustomer().getAddress().getCity().getName()',
      inputLabel: 'A chained call starting from a field or parameter',
      gen: function (input) {
        var s = String(input === undefined || input === null || !String(input).trim() ? 'order.getCustomer().getAddress().getCity().getName()' : input).trim().replace(/;$/, '');
        var toks = s.split('.').map(function (t) { return t.trim(); });
        if (toks.length < 2 || toks.length > 7) throw new Error('Write 1 to 6 chained calls, e.g. order.getCustomer().getAddress()');
        toks.forEach(function (t, i) {
          if (!/^[A-Za-z_]\w*(\(\))?$/.test(t)) throw new Error('Use simple names like order.getCustomer().getAddress() (no arguments)');
          if (i > 0 && !/\(\)$/.test(t)) throw new Error('Every part after the first must be a call, like getAddress()');
        });
        function typeName(t, i) {
          var n = t.replace(/\(\)$/, '').replace(/^(get|find|fetch)/, '');
          if (!n) n = 'Result' + i;
          return n.charAt(0).toUpperCase() + n.slice(1);
        }
        var types = toks.map(typeName);
        var n = toks.length, frames = [];
        var nodes = [bx('ME', 'ShippingService', 10, 8)];
        types.forEach(function (t, i) { nodes.push(bx('T' + i, short(t, 12), spread(n, i, 16, 90), 40)); });
        var edges = [['ME', 'T0', 'friend']], ehl = { 'ME-T0': 'ok' }, hl = { ME: 'cur', T0: 'ok' }, tags = { T0: 'parameter/field' };
        frames.push({ narr: 'We are inside <code>ShippingService</code>. <code>' + H.esc(toks[0]) + '</code> is a parameter or field — a <b>friend</b>. Talking to it is allowed.', parts: [gp('Who does ShippingService know?', nodes, edges.slice(), clone(hl), clone(ehl), clone(tags), 52), cp('Line under review', ['String x = ' + s + ';'], { 1: 'cur' }, mkAlt('x = ' + snakeCall(s), 'const x = ' + s + ';', 'auto x = ' + s + ';')), { type: 'vars', vals: { hops: 0, strangers: 0 } }] });
        var strangers = 0;
        for (var i = 1; i < n; i++) {
          edges.push(['T' + (i - 1), 'T' + i, toks[i].replace(/\(\)$/, '')]);
          ehl['T' + (i - 1) + '-T' + i] = 'done';
          if (i === 1) {
            hl['T1'] = 'cur'; tags['T1'] = 'returned object';
            frames.push({ narr: 'Hop 1: <code>.' + H.esc(toks[1]) + '</code> — asking a friend a question is fine. But the answer is a <b>' + H.esc(types[1]) + '</b> object we did not create and do not own. It is a <b>stranger</b>.' + (n === 2 ? ' The chain stops here, so this line is OK.' : ''), parts: [gp('Who does ShippingService know?', nodes, edges.slice(), clone(hl), clone(ehl), clone(tags), 52), { type: 'vars', vals: { hops: 1, strangers: 0 } }] });
          } else {
            strangers++;
            edges.push(['ME', 'T' + (i - 1), 'reaches into']);
            ehl['ME-T' + (i - 1)] = 'bad'; hl['T' + (i - 1)] = 'bad'; hl['T' + i] = 'cur'; tags['T' + (i - 1)] = 'stranger';
            frames.push({ narr: 'Hop ' + i + ': we call <code>.' + H.esc(toks[i]) + '</code> <b>on the stranger</b> ' + H.esc(types[i - 1]) + '. <span class="c-r">Violation.</span> ShippingService now depends on the internal structure of ' + H.esc(types[i - 1]) + ' (red edge). If that class changes, we break.', parts: [gp('Who does ShippingService know?', nodes, edges.slice(), clone(hl), clone(ehl), clone(tags), 52), { type: 'vars', vals: { hops: i, strangers: strangers }, hl: { strangers: 'bad' } }] });
          }
        }
        var tail = toks.slice(Math.max(1, n - 2)).map(function (t) { var b = t.replace(/\(\)$/, '').replace(/^(get|find|fetch)/, ''); return b.charAt(0).toUpperCase() + b.slice(1); }).join('');
        var tell = toks[0] + '.' + tail.charAt(0).toLowerCase() + tail.slice(1) + '()';
        frames.push({ narr: strangers ? 'Result: ShippingService secretly knows <b>' + (strangers + 1) + '</b> classes but is only entitled to know <b>1</b>. A change in any of them (e.g. "pickup points instead of addresses") ripples here.' : 'No call on a stranger — this line respects the Law of Demeter.', parts: [{ type: 'table', label: 'Knowledge audit', columns: ['object', 'relationship', 'allowed to call?'], rows: types.map(function (t, i) { return [t, i === 0 ? 'friend (param/field)' : 'returned by hop ' + i, i === 0 ? 'yes' : (i < n - 1 ? 'NO (called ' + toks[i + 1] + ')' : 'not called')]; }), hl: (function () { var h = {}; for (var k = 1; k < n - 1; k++) h[k] = 'bad'; h[0] = 'ok'; return h; })() }] });
        if (strangers) {
          var aNodes = [bx('ME', 'ShippingService', 10, 8)].concat(types.map(function (t, i) { return bx('T' + i, short(t, 12), spread(n, i, 16, 90), 40); }));
          var aEdges = [['ME', 'T0', tell.split('.')[1]]], aEhl = { 'ME-T0': 'ok' };
          for (var j = 1; j < n; j++) { aEdges.push(['T' + (j - 1), 'T' + j, 'delegates']); aEhl['T' + (j - 1) + '-T' + j] = 'ok'; }
          frames.push({ narr: '<b>Tell, Don\'t Ask.</b> Give the first object a method that answers the real question, e.g. <code>' + H.esc(tell) + '</code> (in real code pick a domain name such as <code>order.shippingCity()</code>). Each class now talks only to its own direct part. ShippingService knows exactly one class.', parts: [gp('After: each object knows only its neighbour', aNodes, aEdges, { ME: 'ok', T0: 'sel' }, aEhl, { T0: 'only friend' }, 52), cp('Refactored', ['// ShippingService', 'String x = ' + tell + ';', '', '// ' + types[0] + ' delegates one step down; so does each part'], { 2: 'ok' }, mkAlt('# ShippingService\nx = ' + snakeCall(tell) + '\n\n# ' + types[0] + ' delegates one step down; so does each part', '// ShippingService\nconst x = ' + tell + ';\n\n// ' + types[0] + ' delegates one step down; so does each part', '// ShippingService\nauto x = ' + tell + ';\n\n// ' + types[0] + ' delegates one step down; so does each part'))] });
        }
        frames.push({ narr: 'Remember the exceptions: fluent builders (<code>sb.append().append()</code>), streams and plain data records are not violations — you are talking to the same object, or to data with no behaviour to protect.', parts: [{ type: 'table', label: 'Violation or not?', columns: ['code', 'verdict'], rows: [['sb.append("a").append("b")', 'OK — same object returned'], ['list.stream().filter(p).toList()', 'OK — pipeline you own'], ['dto.address().city()  (record from JSON)', 'OK — data structure'], ['order.getCustomer().getWallet().debit(5)', 'VIOLATION — reaching into objects']], hl: { 3: 'bad' } }] });
        return frames;
      }
    }],
    examples: [
      { title: 'Car needs fuel?', html: `<p>${H.c('r', 'Ask:')} <code>if (car.getEngine().getFuelTank().getLevel() &lt; 10)</code>. ${H.c('g', 'Tell:')} <code>if (car.needsFuel())</code>. When electric cars arrive, <code>needsFuel</code> becomes <code>needsCharge</code> logic inside <code>Car</code>; callers do not care that there is no fuel tank anymore.</p>`, code: { lang: 'java', code: `class FuelTank { private int level; FuelTank(int l) { level = l; } boolean isBelow(int pct) { return level < pct; } }
class Engine { private final FuelTank tank; Engine(FuelTank t) { tank = t; } boolean lowOnFuel() { return tank.isBelow(10); } }
class Car {
    private final Engine engine;
    Car(Engine e) { engine = e; }
    boolean needsFuel() { return engine.lowOnFuel(); }   // each level talks only to its own part
}`, alt: [
          { lang: 'python', code: `class FuelTank:
    def __init__(self, level: int) -> None:
        self._level = level

    def is_below(self, pct: int) -> bool:
        return self._level < pct


class Engine:
    def __init__(self, tank: FuelTank) -> None:
        self._tank = tank

    def low_on_fuel(self) -> bool:
        return self._tank.is_below(10)


class Car:
    def __init__(self, engine: Engine) -> None:
        self._engine = engine

    def needs_fuel(self) -> bool:  # each level talks only to its own part
        return self._engine.low_on_fuel()` },
          { lang: 'ts', code: `class FuelTank {
  constructor(private readonly level: number) {}
  isBelow(pct: number): boolean { return this.level < pct; }
}
class Engine {
  constructor(private readonly tank: FuelTank) {}
  lowOnFuel(): boolean { return this.tank.isBelow(10); }
}
class Car {
  constructor(private readonly engine: Engine) {}
  needsFuel(): boolean { return this.engine.lowOnFuel(); } // each level talks only to its own part
}` },
          { lang: 'cpp', code: `class FuelTank {
    int level_;
public:
    explicit FuelTank(int level) : level_(level) {}
    bool isBelow(int pct) const { return level_ < pct; }
};
class Engine {
    FuelTank tank_;
public:
    explicit Engine(FuelTank tank) : tank_(tank) {}
    bool lowOnFuel() const { return tank_.isBelow(10); }
};
class Car {
    Engine engine_;
public:
    explicit Car(Engine engine) : engine_(engine) {}
    bool needsFuel() const { return engine_.lowOnFuel(); }   // each level talks only to its own part
};` }
        ] } },
      { title: 'Bank account: stop doing its job for it', html: `<p>${H.c('r', 'Ask:')} <code>if (acct.getBalance() &gt;= amt) acct.setBalance(acct.getBalance() - amt);</code> — the rule "no overdraft" now lives in every caller, and two threads can both pass the check (a race). ${H.c('g', 'Tell:')} <code>acct.withdraw(amt)</code> keeps the rule and the locking inside the account. LoD and encapsulation are the same idea seen from two sides.</p>` },
      { title: 'Data structures are allowed to be dug into', html: `<p>A JSON response mapped to plain data types (records, dataclasses, structs): <code>resp.data().user().email()</code>. These records have no behaviour and no invariants; they exist to carry data. Wrapping them in "tell" methods would just add a Middle Man. LoD protects <b>objects with behaviour</b>, not passive data.</p>`, code: { lang: 'java', code: `record Address(String city) {}
record UserDto(String email, Address address) {}
class DtoDemo {
    public static void main(String[] args) {
        UserDto u = new UserDto("a@b.com", new Address("Pune"));
        System.out.println(u.address().city());   // fine: plain data
    }
}`, alt: [
          { lang: 'python', code: `from dataclasses import dataclass


@dataclass(frozen=True)
class Address:
    city: str


@dataclass(frozen=True)
class UserDto:
    email: str
    address: Address


if __name__ == "__main__":
    u = UserDto("a@b.com", Address("Pune"))
    print(u.address.city)  # fine: plain data` },
          { lang: 'ts', code: `interface Address { readonly city: string; }
interface UserDto { readonly email: string; readonly address: Address; }

const u: UserDto = { email: "a@b.com", address: { city: "Pune" } };
console.log(u.address.city); // fine: plain data` },
          { lang: 'cpp', code: `struct Address { string city; };
struct UserDto { string email; Address address; };

int main() {
    UserDto u{"a@b.com", Address{"Pune"}};
    cout << u.address.city << "\\n";   // fine: plain data
}` }
        ] } },
      { title: 'The test-mock smell', html: `<p>If testing <code>InvoiceService</code> requires <code>when(order.getCustomer()).thenReturn(cust); when(cust.getAddress()).thenReturn(addr); when(addr.getCountry())...</code>, the class under test violates LoD. After introducing <code>order.billingCountry()</code> the test needs one stub. Painful mocks are a design signal.</p>` }
    ],
    deepDive: `<p><b>Formal versions:</b> the original paper (Lieberherr, Holland, Riel, 1988) defined a <i>class form</i> (you may call methods of classes of your fields/arguments) and an <i>object form</i> (the stricter list in this topic). The object form is what people mean today.</p>
<p><b>Why it reduces coupling:</b> every method you call on an object is a dependency on that object's type. A train wreck of length k makes you depend on k types and on the <i>shape of the path</i> between them. LoD keeps each class's knowledge to its immediate neighbourhood, so changes to the object graph stay local. In connascence terms, it removes connascence of type/structure across distant classes.</p>
<p><b>The cost:</b> wrapper methods. Taken mechanically, LoD creates <code>Order.getCustomerAddressCityName()</code> for every combination — the <b>Middle Man</b> smell, and wide interfaces (an Interface Segregation problem). The judgment call: add a method when it names a <b>domain concept</b> (<code>shippingCity</code>, <code>isOverdue</code>, <code>needsFuel</code>). If you notice many callers asking the same deep question, that is strong evidence the method belongs on the first object.</p>
<p><b>Feature envy is LoD's twin:</b> a method that pulls lots of data from another object to compute something "envies" that object; Move Method puts the computation where the data lives, which removes the chain at the same time.</p>
<p><b>Null chains:</b> <code>a.getB().getC()</code> also fails anywhere along the chain with a null-pointer error (<code>NullPointerException</code> in Java, <code>AttributeError</code> on <code>None</code> in Python, <code>TypeError</code> on <code>undefined</code> in TypeScript, undefined behaviour on a null pointer in C++). <code>Optional.map(...).map(...)</code> (or <code>?.</code> in TypeScript and Python's <code>and</code> chains) hides the null failure but not the coupling — it is still a train wreck, just a safer one. Java's "helpful NullPointerExceptions" (JEP 358) at least tell you which link was null.</p>
<p><b>Concurrency bonus:</b> "Tell" keeps check-then-act inside one object, where one lock can guard it. "Ask" splits the check and the act across objects, inviting race conditions.</p>`,
    aiEra: `<p><b>What AI changes:</b> autocomplete loves train wrecks. Type <code>order.</code> and the IDE/AI offers <code>getCustomer().getAddress().getCity()</code> in one keystroke because it can see the whole object graph. Writing a violation became effortless, so spotting it in review matters more.</p>
<p><b>Use AI as a partner:</b> <code>Find all call chains longer than two hops on domain objects (ignore streams, builders and records). For each, suggest a Tell-Don't-Ask method name based on what the caller is trying to decide.</code> AI is good at proposing names from intent; you decide which names are real domain concepts.</p>
<p><b>Where AI goes wrong:</b> it either flags every stream/builder as a violation (dot counting) or it "fixes" violations by adding a forwarding getter for every field, producing Middle Men. It also tends to move logic into the wrong class if it does not know which object owns the rule.</p>
<p><b>What you must still own:</b> deciding where each piece of behaviour belongs (who owns the data and the rule) — that is domain modelling, the heart of LLD interviews.</p>`,
    problems: [{
      title: 'Paperboy reaches into the wallet',
      level: 'Easy', tags: ['Law of Demeter', 'tell dont ask', 'encapsulation'], companies: ['ThoughtWorks', 'Uber'],
      statement: `<p>A <code>Paperboy</code> collects monthly dues from a list of customers. His code does <code>customer.getWallet().getCash()</code>, compares, then calls <code>customer.getWallet().subtract(due)</code>. The business now wants customers to pay by UPI if their wallet is short. Refactor so the Paperboy only <b>tells</b> customers to pay, and adding UPI does not touch <code>Paperboy</code>.</p>`,
      constraints: `A customer pays from the wallet first, then UPI balance if the wallet is short. If neither can cover the due, nothing is paid. Paperboy returns the total collected.`,
      example: `<p>Customers: A (wallet 500), B (wallet 50, UPI 300), C (wallet 10, UPI 0); due 100 each. Collected = ${H.c('g', '200')} (A by cash, B by UPI, C cannot pay). The old design would have collected only from A, and adding UPI would have meant editing Paperboy.</p>`,
      brute: {
        why: `<p>The paperboy knows the customer has a wallet, knows the wallet's API, and makes the payment decision himself. Every new payment method changes the paperboy's code (shotgun surgery waiting to happen), and the "can I pay?" rule lives outside the object that owns the money.</p>`,
        code: { lang: 'java', code: `class Wallet {
    private int cash;
    Wallet(int c) { cash = c; }
    int getCash() { return cash; }
    void subtract(int amt) { cash -= amt; }
}
class Customer {
    private final Wallet wallet;
    Customer(Wallet w) { wallet = w; }
    Wallet getWallet() { return wallet; }
}
class Paperboy {
    int collectAll(List<Customer> customers, int due) {
        int total = 0;
        for (Customer c : customers) {
            if (c.getWallet().getCash() >= due) {      // train wreck + decision outside owner
                c.getWallet().subtract(due);
                total += due;
            }
        }
        return total;
    }
}`, alt: [
                { lang: 'python', code: `
class Wallet:
    def __init__(self, c): self._cash = c
    def get_cash(self): return self._cash
    def subtract(self, amt): self._cash -= amt

class Customer:
    def __init__(self, w): self._wallet = w
    def get_wallet(self): return self._wallet

class Paperboy:
    def collect_all(self, customers, due):
        total = 0
        for c in customers:
            if c.get_wallet().get_cash() >= due:      # train wreck + decision outside owner
                c.get_wallet().subtract(due)
                total += due
        return total` },
                { lang: 'ts', code: `
class Wallet {
    private cash: number;
    constructor(c: number) { this.cash = c; }
    getCash(): number { return this.cash; }
    subtract(amt: number): void { this.cash -= amt; }
}
class Customer {
    constructor(private readonly wallet: Wallet) {}
    getWallet(): Wallet { return this.wallet; }
}
class Paperboy {
    collectAll(customers: Customer[], due: number): number {
        let total = 0;
        for (const c of customers) {
            if (c.getWallet().getCash() >= due) {      // train wreck + decision outside owner
                c.getWallet().subtract(due);
                total += due;
            }
        }
        return total;
    }
}` },
                { lang: 'cpp', code: `
class Wallet {
    int cash;
public:
    Wallet(int c) : cash(c) {}
    int getCash() { return cash; }
    void subtract(int amt) { cash -= amt; }
};
class Customer {
    Wallet& wallet;
public:
    Customer(Wallet& w) : wallet(w) {}
    Wallet& getWallet() { return wallet; }
};
class Paperboy {
public:
    int collectAll(vector<Customer>& customers, int due) {
        int total = 0;
        for (Customer& c : customers) {
            if (c.getWallet().getCash() >= due) {      // train wreck + decision outside owner
                c.getWallet().subtract(due);
                total += due;
            }
        }
        return total;
    }
};` }
              ] }
      },
      mcq: { q: 'After the refactor, which call should Paperboy make?', options: ['c.getWallet().subtract(due)', 'c.pay(due) returning the amount paid', 'c.getUpi().debit(due)', 'Wallet.subtract(c, due)'], answer: 1, explain: 'Tell the customer what is needed; how they pay is their business. Paperboy then never changes when payment options change.' },
      hints: [
        `<p>Hint 1: Who owns the money? The customer. So the decision "can I pay, and how?" should live in <code>Customer</code>.</p>`,
        `<p>Hint 2: Give <code>Customer</code> a method <code>int pay(int due)</code> that returns the amount paid (0 if it cannot). Remove <code>getWallet()</code> so no one can reach in again.</p>`,
        `<p>Hint 3: Inside <code>pay</code>, Customer may talk to its own fields (wallet, upi). Check wallet first, then UPI. Paperboy's loop becomes <code>total += c.pay(due)</code>.</p>`
      ],
      tests: { io: true, cases: [{ stdin: '', stdout: "200\n250\n" }] },
      solution: {
        approach: `<p><b>Spot:</b> train wreck <code>c.getWallet().getCash()</code> + decision made outside the data owner (feature envy). <b>Refactor:</b> Hide Delegate / Tell-Don't-Ask — add <code>Customer.pay(due)</code>, remove the <code>getWallet()</code> getter, and put the "wallet first, then UPI" rule inside <code>Customer</code>. Paperboy talks only to his parameter. Adding a third payment method changes only <code>Customer</code>.</p>`,
        code: `class Wallet {
    private int cash;
    Wallet(int c) { cash = c; }
    boolean canCover(int amt) { return cash >= amt; }
    void take(int amt) { cash -= amt; }
}
class UpiAccount {
    private int balance;
    UpiAccount(int b) { balance = b; }
    boolean canCover(int amt) { return balance >= amt; }
    void debit(int amt) { balance -= amt; }
}
class Customer {
    private final Wallet wallet;
    private final UpiAccount upi;
    Customer(Wallet wallet, UpiAccount upi) { this.wallet = wallet; this.upi = upi; }

    /** Pays the full due if possible; returns what was paid (0 or due). */
    int pay(int due) {
        if (wallet.canCover(due)) { wallet.take(due); return due; }
        if (upi.canCover(due))    { upi.debit(due);   return due; }
        return 0;
    }
}
class Paperboy {
    int collectAll(List<Customer> customers, int due) {
        int total = 0;
        for (Customer c : customers) total += c.pay(due);   // tell, don't ask
        return total;
    }
}
class PaperboyDemo {
    public static void main(String[] args) {
        Paperboy boy = new Paperboy();
        List<Customer> cs = List.of(
            new Customer(new Wallet(500), new UpiAccount(0)),
            new Customer(new Wallet(50), new UpiAccount(300)),
            new Customer(new Wallet(10), new UpiAccount(0)));
        System.out.println(boy.collectAll(cs, 100));   // 200: A by cash, B by UPI, C cannot pay
        System.out.println(boy.collectAll(cs, 250));   // 250: only A (wallet 400 left) can cover it
    }
}`,
        alt: [
          { lang: 'python', code: `class Wallet:
    def __init__(self, cash: int) -> None:
        self._cash = cash

    def can_cover(self, amount: int) -> bool:
        return self._cash >= amount

    def take(self, amount: int) -> None:
        self._cash -= amount


class UpiAccount:
    def __init__(self, balance: int) -> None:
        self._balance = balance

    def can_cover(self, amount: int) -> bool:
        return self._balance >= amount

    def debit(self, amount: int) -> None:
        self._balance -= amount


class Customer:
    def __init__(self, wallet: Wallet, upi: UpiAccount) -> None:
        self._wallet = wallet
        self._upi = upi

    def pay(self, due: int) -> int:
        """Pays the full due if possible; returns what was paid (0 or due)."""
        if self._wallet.can_cover(due):
            self._wallet.take(due)
            return due
        if self._upi.can_cover(due):
            self._upi.debit(due)
            return due
        return 0


class Paperboy:
    def collect_all(self, customers: list[Customer], due: int) -> int:
        return sum(c.pay(due) for c in customers)  # tell, don't ask


if __name__ == "__main__":
    boy = Paperboy()
    cs = [
        Customer(Wallet(500), UpiAccount(0)),
        Customer(Wallet(50), UpiAccount(300)),
        Customer(Wallet(10), UpiAccount(0)),
    ]
    print(boy.collect_all(cs, 100))  # 200: A by cash, B by UPI, C cannot pay
    print(boy.collect_all(cs, 250))  # 250: only A (wallet 400 left) can cover it` },
          { lang: 'ts', code: `class Wallet {
  constructor(private cash: number) {}
  canCover(amt: number): boolean { return this.cash >= amt; }
  take(amt: number): void { this.cash -= amt; }
}

class UpiAccount {
  constructor(private balance: number) {}
  canCover(amt: number): boolean { return this.balance >= amt; }
  debit(amt: number): void { this.balance -= amt; }
}

class Customer {
  constructor(private readonly wallet: Wallet, private readonly upi: UpiAccount) {}

  /** Pays the full due if possible; returns what was paid (0 or due). */
  pay(due: number): number {
    if (this.wallet.canCover(due)) { this.wallet.take(due); return due; }
    if (this.upi.canCover(due)) { this.upi.debit(due); return due; }
    return 0;
  }
}

class Paperboy {
  collectAll(customers: Customer[], due: number): number {
    return customers.reduce((total, c) => total + c.pay(due), 0); // tell, don't ask
  }
}

const boy = new Paperboy();
const cs = [
  new Customer(new Wallet(500), new UpiAccount(0)),
  new Customer(new Wallet(50), new UpiAccount(300)),
  new Customer(new Wallet(10), new UpiAccount(0)),
];
console.log(boy.collectAll(cs, 100)); // 200: A by cash, B by UPI, C cannot pay
console.log(boy.collectAll(cs, 250)); // 250: only A (wallet 400 left) can cover it` },
          { lang: 'cpp', code: `class Wallet {
    int cash_;
public:
    explicit Wallet(int cash) : cash_(cash) {}
    bool canCover(int amt) const { return cash_ >= amt; }
    void take(int amt) { cash_ -= amt; }
};

class UpiAccount {
    int balance_;
public:
    explicit UpiAccount(int balance) : balance_(balance) {}
    bool canCover(int amt) const { return balance_ >= amt; }
    void debit(int amt) { balance_ -= amt; }
};

class Customer {
    Wallet wallet_;
    UpiAccount upi_;
public:
    Customer(Wallet wallet, UpiAccount upi) : wallet_(wallet), upi_(upi) {}

    // Pays the full due if possible; returns what was paid (0 or due).
    int pay(int due) {
        if (wallet_.canCover(due)) { wallet_.take(due); return due; }
        if (upi_.canCover(due)) { upi_.debit(due); return due; }
        return 0;
    }
};

class Paperboy {
public:
    int collectAll(vector<Customer>& customers, int due) {
        int total = 0;
        for (Customer& c : customers) total += c.pay(due);   // tell, don't ask
        return total;
    }
};

int main() {
    Paperboy boy;
    vector<Customer> cs;
    cs.emplace_back(Wallet(500), UpiAccount(0));
    cs.emplace_back(Wallet(50), UpiAccount(300));
    cs.emplace_back(Wallet(10), UpiAccount(0));
    cout << boy.collectAll(cs, 100) << "\\n";   // 200: A by cash, B by UPI, C cannot pay
    cout << boy.collectAll(cs, 250) << "\\n";   // 250: only A (wallet 400 left) can cover it
}` }
        ],
        complexity: `<p>O(customers) time, O(1) extra space — same as before. Classes Paperboy depends on: 3 (Customer, Wallet, implicitly UPI) → 1 (Customer).</p>`,
        followUps: ['How would you support partial payments?', 'Where would you put a rule like "senior citizens get 10% off"?', 'Is Customer becoming a God class now? When would you extract a PaymentMethod strategy list?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 6 — Naming & Small Functions
     ===================================================================== */
  topics.push({
    title: 'Naming & Small Functions (code that reads like a story)',
    analogy: `<p>Your spice rack has twelve identical unlabelled jars. To find the cumin you open and sniff each one. Put a label on each jar and you find it in two seconds. <b>Names are labels</b>: a good name saves every future reader from "opening the jar" (reading the code) to learn what is inside.</p>
<p>Small functions are like a <b>book with chapter titles</b>. The table of contents ("validate order, reserve stock, charge payment, send receipt") tells the whole story; you open a chapter only when you need its details. A 300-line method is a book with no chapters, no paragraphs and no full stops.</p>`,
    explain: `<p>Code is read far more often than it is written — by teammates, by future-you, by reviewers and now by AI agents. Names and function size are the cheapest, highest-impact tools you have.</p>
<p><b>Naming rules that matter most</b></p>
${H.table(['Rule', 'Bad', 'Good'], [
  ['Reveal intent (what &amp; why)', '<code>int d; // elapsed days</code>', '<code>int elapsedDays</code>'],
  ['Classes = nouns, methods = verbs', '<code>class ProcessOrder</code>, <code>void data()</code>', '<code>class OrderProcessor</code>, <code>void reserveStock()</code>'],
  ['Booleans read as a yes/no question', '<code>flag</code>, <code>status</code>', '<code>isExpired</code>, <code>hasStock</code>, <code>canRetry</code>'],
  ['No noise words / number suffixes', '<code>data2</code>, <code>theInfo</code>, <code>accountObj</code>', '<code>shippingAddress</code>, <code>billingAddress</code>'],
  ['One word per concept', '<code>fetchUser</code>, <code>getOrder</code>, <code>retrieveCart</code> in one codebase', 'Pick <code>find…</code> everywhere'],
  ['Searchable, no magic numbers', '<code>if (s == 4)</code>', '<code>if (status == SHIPPED)</code>'],
  ['Length grows with scope', 'Field named <code>i</code>', 'Loop counter <code>i</code> is fine; a class field is <code>retryCount</code>'],
  ['Use the domain\'s words', '<code>itemList2</code>', '<code>cart</code>, <code>wishlist</code>, <code>backorder</code>'],
  ['No type encodings (Hungarian)', '<code>strName</code>, <code>IUserService</code> (debated)', '<code>name</code>, <code>UserService</code>']
])}
<p><b>Function rules that matter most</b></p>
<ul>
<li><b>Do one thing.</b> Test: can you extract another function from it with a name that is not just a restatement? If yes, it does more than one thing.</li>
<li><b>One level of abstraction per function.</b> Do not mix "charge the payment" (high level) with "trim whitespace from the card number" (low level) in the same body.</li>
<li><b>Step-down rule:</b> read top to bottom — each function is followed by the ones it calls, like a newspaper: headline first, details later.</li>
<li><b>Few parameters</b> (0–2 ideal, 3 maximum). More → group them into a parameter object (<code>DateRange</code>, <code>ShippingInfo</code>).</li>
<li><b>No flag arguments.</b> <code>render(true)</code> means the function does two things. Make two functions.</li>
<li><b>Command–Query Separation</b> (Bertrand Meyer): a method either <i>does</i> something (command, returns void) or <i>answers</i> something (query, no side effects) — not both. <code>boolean set(...)</code> that changes state <i>and</i> reports is confusing.</li>
<li><b>Guard clauses</b> instead of deep nesting: handle the invalid cases first and <code>return</code> early, so the happy path is flat ("arrow code" → straight line).</li>
</ul>
<p><b>How small?</b> There is no magic number. A useful guide: fits on one screen, nesting ≤ 2 levels, you can name it without "and". Very small is fine in compiled and JIT languages (Java, C++, TypeScript on V8): tiny methods are inlined, so there is no speed cost. A call in CPython does cost time, but readability still wins until a profiler says otherwise.</p>`,
    clues: [
      'Reviewer asks "what does <code>process(data, true)</code> do?" → poor names + flag argument.',
      'Method needs a comment above each block ("// validate", "// compute total") → each block wants to be an Extract Method with that comment as its name.',
      'Deeply nested <code>if</code>s (arrow shape) → guard clauses.',
      'Parameter list with 5+ arguments, several of the same type → parameter object / builder.',
      'Same concept called fetch/get/retrieve/load in one codebase → inconsistent vocabulary.',
      'Machine-coding round evaluation criteria mention "readability" → names and small functions are graded.'
    ],
    code: { lang: 'java', code: `record Item(String name, int priceCents, int qty) {}
record Customer(String name, boolean premium) {}

// BEFORE: vague names, one long method, flag argument, deep nesting.
class Proc {
    int doIt(List<Item> l, Customer c, boolean f) {
        int t = 0;
        if (l != null) {
            if (!l.isEmpty()) {
                for (Item i : l) {
                    if (i.qty() > 0) {
                        t += i.priceCents() * i.qty();
                    }
                }
                if (c.premium()) {
                    t = t - t / 10;
                }
                if (f) {
                    t = t + 4000;
                }
            }
        }
        return t;
    }
}

// AFTER: intention-revealing names, guard clause, one level of abstraction per method.
class OrderPricer {
    private static final int EXPRESS_FEE_CENTS = 4000;
    private static final int PREMIUM_DISCOUNT_PERCENT = 10;

    int standardTotal(List<Item> cart, Customer customer) {
        if (cart == null || cart.isEmpty()) return 0;                  // guard clause
        return applyLoyaltyDiscount(subtotal(cart), customer);
    }
    int expressTotal(List<Item> cart, Customer customer) {              // flag replaced by a 2nd method
        int total = standardTotal(cart, customer);
        return total == 0 ? 0 : total + EXPRESS_FEE_CENTS;
    }

    private int subtotal(List<Item> cart) {
        int sum = 0;
        for (Item item : cart) {
            if (item.qty() > 0) sum += item.priceCents() * item.qty();
        }
        return sum;
    }
    private int applyLoyaltyDiscount(int amount, Customer customer) {
        if (!customer.premium()) return amount;
        return amount - amount * PREMIUM_DISCOUNT_PERCENT / 100;
    }
}

class NamingDemo {
    public static void main(String[] args) {
        List<Item> cart = List.of(new Item("pen", 1000, 2), new Item("book", 30000, 1));
        Customer asha = new Customer("Asha", true);
        System.out.println(new Proc().doIt(cart, asha, true) + " == " + new OrderPricer().expressTotal(cart, asha));
    }
}`, alt: [
        { lang: 'python', code: `from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class Item:
    name: str
    price_cents: int
    qty: int


@dataclass(frozen=True)
class Customer:
    name: str
    premium: bool


# BEFORE: vague names, one long method, flag argument, deep nesting.
class Proc:
    def do_it(self, l: Optional[list[Item]], c: Customer, f: bool) -> int:
        t = 0
        if l is not None:
            if len(l) > 0:
                for i in l:
                    if i.qty > 0:
                        t += i.price_cents * i.qty
                if c.premium:
                    t = t - t // 10
                if f:
                    t = t + 4000
        return t


# AFTER: intention-revealing names, guard clause, one level of abstraction per method.
class OrderPricer:
    EXPRESS_FEE_CENTS = 4000
    PREMIUM_DISCOUNT_PERCENT = 10

    def standard_total(self, cart: Optional[list[Item]], customer: Customer) -> int:
        if not cart:  # guard clause
            return 0
        return self._apply_loyalty_discount(self._subtotal(cart), customer)

    def express_total(self, cart: Optional[list[Item]], customer: Customer) -> int:  # flag replaced by a 2nd method
        total = self.standard_total(cart, customer)
        return 0 if total == 0 else total + self.EXPRESS_FEE_CENTS

    def _subtotal(self, cart: list[Item]) -> int:
        return sum(item.price_cents * item.qty for item in cart if item.qty > 0)

    def _apply_loyalty_discount(self, amount: int, customer: Customer) -> int:
        if not customer.premium:
            return amount
        return amount - amount * self.PREMIUM_DISCOUNT_PERCENT // 100


if __name__ == "__main__":
    cart = [Item("pen", 1000, 2), Item("book", 30000, 1)]
    asha = Customer("Asha", True)
    print(f"{Proc().do_it(cart, asha, True)} == {OrderPricer().express_total(cart, asha)}")` },
        { lang: 'ts', code: `interface Item { readonly name: string; readonly priceCents: number; readonly qty: number; }
interface Customer { readonly name: string; readonly premium: boolean; }

// BEFORE: vague names, one long method, flag argument, deep nesting.
class Proc {
  doIt(l: Item[] | null, c: Customer, f: boolean): number {
    let t = 0;
    if (l !== null) {
      if (l.length > 0) {
        for (const i of l) {
          if (i.qty > 0) {
            t += i.priceCents * i.qty;
          }
        }
        if (c.premium) {
          t = t - Math.floor(t / 10);
        }
        if (f) {
          t = t + 4000;
        }
      }
    }
    return t;
  }
}

// AFTER: intention-revealing names, guard clause, one level of abstraction per method.
class OrderPricer {
  private static readonly EXPRESS_FEE_CENTS = 4000;
  private static readonly PREMIUM_DISCOUNT_PERCENT = 10;

  standardTotal(cart: readonly Item[] | null, customer: Customer): number {
    if (cart === null || cart.length === 0) return 0; // guard clause
    return this.applyLoyaltyDiscount(this.subtotal(cart), customer);
  }
  expressTotal(cart: readonly Item[] | null, customer: Customer): number { // flag replaced by a 2nd method
    const total = this.standardTotal(cart, customer);
    return total === 0 ? 0 : total + OrderPricer.EXPRESS_FEE_CENTS;
  }

  private subtotal(cart: readonly Item[]): number {
    return cart.filter((item) => item.qty > 0).reduce((sum, item) => sum + item.priceCents * item.qty, 0);
  }
  private applyLoyaltyDiscount(amount: number, customer: Customer): number {
    if (!customer.premium) return amount;
    return amount - Math.floor((amount * OrderPricer.PREMIUM_DISCOUNT_PERCENT) / 100);
  }
}

const cart: Item[] = [{ name: "pen", priceCents: 1000, qty: 2 }, { name: "book", priceCents: 30000, qty: 1 }];
const asha: Customer = { name: "Asha", premium: true };
console.log(\`\${new Proc().doIt(cart, asha, true)} == \${new OrderPricer().expressTotal(cart, asha)}\`);` },
        { lang: 'cpp', code: `struct Item { string name; int priceCents; int qty; };
struct Customer { string name; bool premium; };

// BEFORE: vague names, one long method, flag argument, deep nesting.
class Proc {
public:
    int doIt(const vector<Item>* l, const Customer& c, bool f) const {
        int t = 0;
        if (l != nullptr) {
            if (!l->empty()) {
                for (const Item& i : *l) {
                    if (i.qty > 0) {
                        t += i.priceCents * i.qty;
                    }
                }
                if (c.premium) {
                    t = t - t / 10;
                }
                if (f) {
                    t = t + 4000;
                }
            }
        }
        return t;
    }
};

// AFTER: intention-revealing names, guard clause, one level of abstraction per method.
class OrderPricer {
    static constexpr int EXPRESS_FEE_CENTS = 4000;
    static constexpr int PREMIUM_DISCOUNT_PERCENT = 10;

    static int subtotal(const vector<Item>& cart) {
        int sum = 0;
        for (const Item& item : cart) if (item.qty > 0) sum += item.priceCents * item.qty;
        return sum;
    }
    static int applyLoyaltyDiscount(int amount, const Customer& customer) {
        if (!customer.premium) return amount;
        return amount - amount * PREMIUM_DISCOUNT_PERCENT / 100;
    }

public:
    int standardTotal(const vector<Item>& cart, const Customer& customer) const {
        if (cart.empty()) return 0;   // guard clause
        return applyLoyaltyDiscount(subtotal(cart), customer);
    }
    int expressTotal(const vector<Item>& cart, const Customer& customer) const {   // flag replaced by a 2nd method
        int total = standardTotal(cart, customer);
        return total == 0 ? 0 : total + EXPRESS_FEE_CENTS;
    }
};

int main() {
    vector<Item> cart{{"pen", 1000, 2}, {"book", 30000, 1}};
    Customer asha{"Asha", true};
    cout << Proc().doIt(&cart, asha, true) << " == " << OrderPricer().expressTotal(cart, asha) << "\\n";
}` }
      ] },
    codeTitle: 'From doIt(l, c, f) to a readable OrderPricer',
    viz: [{
      title: 'Refactor a long method step by step',
      gen: function () {
        var before = [
          'int doIt(List<Item> l, Customer c, boolean f) {',
          '  int t = 0;',
          '  if (l != null) {',
          '    if (!l.isEmpty()) {',
          '      for (Item i : l) {',
          '        if (i.qty() > 0) {',
          '          t += i.priceCents() * i.qty();',
          '        }',
          '      }',
          '      if (c.premium()) {',
          '        t = t - t / 10;',
          '      }',
          '      if (f) {',
          '        t = t + 4000;',
          '      }',
          '    }',
          '  }',
          '  return t;',
          '}'
        ];
        var after = [
          'int expressTotal(List<Item> cart, Customer customer) {',
          '  int total = standardTotal(cart, customer);',
          '  return total == 0 ? 0 : total + EXPRESS_FEE_CENTS;',
          '}',
          'int standardTotal(List<Item> cart, Customer customer) {',
          '  if (cart == null || cart.isEmpty()) return 0;',
          '  return applyLoyaltyDiscount(subtotal(cart), customer);',
          '}',
          'private int subtotal(List<Item> cart) { ... loop ... }',
          'private int applyLoyaltyDiscount(int amount, Customer c) { ... }'
        ];
        return [
          { narr: 'Start: a 19-line method called <code>doIt</code> with parameters <code>l</code>, <code>c</code>, <code>f</code>. To learn what it does you must read every line. Metrics on the right.', parts: [cp('Before', before, {}), { type: 'vars', label: 'metrics', vals: { lines: 19, maxNesting: 4, branches: 6, params: 3, meaningfulNames: 0 }, hl: { maxNesting: 'bad', meaningfulNames: 'bad' } }] },
          { narr: '<b>Step 1 — Rename.</b> Read carefully and name things after what they <i>are</i>: <code>l → cart</code>, <code>c → customer</code>, <code>t → total</code>, <code>i → item</code>. The IDE\'s Rename refactoring (Shift+F6 in IntelliJ) does this safely.', parts: [cp('Before', before, { 1: 'cur', 2: 'cur', 5: 'cur' }), { type: 'table', label: 'renames', columns: ['old', 'new'], rows: [['doIt', 'priceOrder (for now)'], ['l', 'cart'], ['c', 'customer'], ['t', 'total'], ['i', 'item']], hl: {} }] },
          { narr: '<b>Step 2 — Guard clause.</b> Lines 3-4 wrap everything in two <code>if</code>s just to handle "no cart". Invert them: <code>if (cart == null || cart.isEmpty()) return 0;</code> Nesting drops by 2 levels.', parts: [cp('Before', before, { 3: 'bad', 4: 'bad', 16: 'bad', 17: 'bad' }), { type: 'vars', label: 'metrics', vals: { lines: 15, maxNesting: 2, branches: 6, params: 3, meaningfulNames: 4 }, hl: { maxNesting: 'ok' } }] },
          { narr: '<b>Step 3 — Extract Method.</b> Lines 5-9 compute the sum of line items. That block has one clear job → <code>subtotal(cart)</code>.', parts: [cp('Before', before, rng(5, 9, 'ok'))] },
          { narr: '<b>Step 4 — Extract Method + name the magic number.</b> Lines 10-12: "premium customers get 10% off" → <code>applyLoyaltyDiscount(amount, customer)</code> with <code>PREMIUM_DISCOUNT_PERCENT = 10</code>.', parts: [cp('Before', before, rng(10, 12, 'ok'))] },
          { narr: '<b>Step 5 — Kill the flag argument.</b> Lines 13-15: <code>f</code> secretly means "express delivery". A boolean parameter means the method does two things. Split into <code>standardTotal</code> and <code>expressTotal</code>; the magic 4000 becomes <code>EXPRESS_FEE_CENTS</code>.', parts: [cp('Before', before, rng(13, 15, 'bad', { 1: 'bad' }))] },
          { narr: 'Result. The top method reads like the requirement: "express total = standard total plus express fee". Each method is 1-4 lines, has one level of abstraction, and its name is its documentation.', parts: [cp('After (step-down order)', after, { 1: 'sel', 5: 'sel', 9: 'ok', 10: 'ok' }), { type: 'vars', label: 'metrics (worst method)', vals: { lines: 4, maxNesting: 1, branches: 2, params: 2, meaningfulNames: 'all' }, hl: { lines: 'ok', maxNesting: 'ok', meaningfulNames: 'ok' } }] },
          { narr: 'Did behaviour change? It must not — refactoring preserves behaviour. Note one subtle thing we kept on purpose: an empty cart with express still costs 0 (the old code never added the fee to an empty cart). Tests would catch it if we got it wrong.', parts: [{ type: 'table', label: 'behaviour check', columns: ['cart', 'premium', 'express', 'old doIt', 'new'], rows: [['empty', 'no', 'yes', '0', '0'], ['pen×2 + book', 'yes', 'yes', '32800', '32800'], ['pen×2 + book', 'no', 'no', '32000', '32000']], hl: { 0: 'ok', 1: 'ok', 2: 'ok' } }] }
        ];
      }
    }, {
      title: 'Name linter: diagnose bad names',
      input: 'd, data2, flag, mgr, processStuff, isNotInvalid, x1',
      inputLabel: 'Names to review (2-8, comma separated)',
      gen: function (input) {
        var names = splitList(input, 'd, data2, flag, mgr, processStuff, isNotInvalid, x1');
        if (names.length < 2 || names.length > 8) throw new Error('Enter 2 to 8 names separated by commas');
        var known = { d: 'elapsedDays', data2: 'billingAddress', flag: 'isExpressDelivery', mgr: 'connectionPool', processstuff: 'reserveStock', isnotinvalid: 'isValid', x1: 'retryCount', tmp: 'pendingOrders', list: 'activeUsers', info: 'shippingDetails', obj: 'invoice', val: 'discountPercent', handle: 'chargeCard' };
        var generic = ['data', 'info', 'manager', 'mgr', 'process', 'handle', 'stuff', 'thing', 'temp', 'tmp', 'obj', 'object', 'util', 'helper', 'val', 'value', 'item', 'list'];
        function diagnose(nm) {
          var low = nm.toLowerCase(), issues = [];
          if (!/^[A-Za-z_$][\w$]*$/.test(nm)) issues.push('not a valid identifier');
          if (nm.length <= 2) issues.push('too short — says nothing outside a tiny loop');
          if (/\d$/.test(nm)) issues.push('number suffix is noise (data1/data2) — what makes them different?');
          if (/^(is|has|can)?Not[A-Z]/.test(nm) || /^not[A-Z]/.test(nm)) issues.push('negative boolean — double negatives (!isNotX) confuse');
          if (low === 'flag' || low === 'status' || low === 'b') issues.push('boolean without a question — name the condition (isX/hasX)');
          var words = nm.split(/(?=[A-Z])|_|[0-9]+/).map(function (w) { return w.toLowerCase(); });
          generic.forEach(function (g) { if (words.indexOf(g) >= 0 && issues.join().indexOf('vague') < 0) issues.push('vague word "' + g + '" — what data? what process?'); });
          if (nm.length >= 3 && nm.length <= 4 && !/[aeiou]/i.test(nm.slice(1))) issues.push('abbreviation — not pronounceable or searchable');
          if (!issues.length) issues.push('looks fine — does it match the domain words?');
          return issues;
        }
        var rows = [], frames = [];
        frames.push({ narr: 'We will review ' + names.length + ' names one by one, the way a reviewer would. A good name answers: <i>what is it, why does it exist, how is it used?</i>', parts: [{ type: 'table', label: 'Name review', columns: ['name', 'problem', 'better (example)'], rows: names.map(function (n) { return [n, '?', '?']; }), hl: {} }] });
        names.forEach(function (nm, i) {
          var iss = diagnose(nm);
          var fine = iss.length === 1 && iss[0].indexOf('looks fine') === 0;
          var sug = known[nm.toLowerCase()] || (fine ? nm : 'name what it holds in domain words');
          rows.push([H.esc(nm), iss.join('; '), sug]);
          var all = rows.slice().concat(names.slice(i + 1).map(function (n) { return [H.esc(n), '?', '?']; }));
          var hl = {}; hl[i] = fine ? 'ok' : 'bad';
          frames.push({ narr: '<code>' + H.esc(nm) + '</code>: ' + H.esc(iss[0]) + (iss.length > 1 ? ' (+' + (iss.length - 1) + ' more)' : '') + '.', parts: [{ type: 'table', label: 'Name review', columns: ['name', 'problem', 'better (example)'], rows: all, hl: hl }] });
        });
        frames.push({ narr: 'Suggestions are <b>examples</b>: the right name depends on what the variable really holds — only someone who knows the domain can choose it. Rename with your IDE so every usage updates safely.', parts: [{ type: 'table', label: 'Name review (done)', columns: ['name', 'problem', 'better (example)'], rows: rows, hl: {} }] });
        return frames;
      }
    }],
    examples: [
      { title: 'Guard clauses flatten arrow code', html: `<p>Deep nesting forces readers to keep a stack of conditions in their head. Handle the exceptional cases first and return.</p>`, code: { lang: 'java', code: `class Shipping {
    String label(String name, String city, boolean paid) {
        if (name == null || name.isBlank()) return "ERROR: no name";
        if (city == null || city.isBlank()) return "ERROR: no city";
        if (!paid) return "HOLD: unpaid";
        return name + ", " + city;             // happy path, not nested
    }
}`, alt: [
          { lang: 'python', code: `class Shipping:
    def label(self, name: str | None, city: str | None, paid: bool) -> str:
        if not name or not name.strip():
            return "ERROR: no name"
        if not city or not city.strip():
            return "ERROR: no city"
        if not paid:
            return "HOLD: unpaid"
        return f"{name}, {city}"  # happy path, not nested` },
          { lang: 'ts', code: `class Shipping {
  label(name: string | null, city: string | null, paid: boolean): string {
    if (name === null || name.trim() === "") return "ERROR: no name";
    if (city === null || city.trim() === "") return "ERROR: no city";
    if (!paid) return "HOLD: unpaid";
    return \`\${name}, \${city}\`; // happy path, not nested
  }
}` },
          { lang: 'cpp', code: `class Shipping {
    static bool blank(const optional<string>& s) {
        return !s || all_of(s->begin(), s->end(), [](unsigned char c) { return isspace(c); });
    }
public:
    string label(const optional<string>& name, const optional<string>& city, bool paid) const {
        if (blank(name)) return "ERROR: no name";
        if (blank(city)) return "ERROR: no city";
        if (!paid) return "HOLD: unpaid";
        return *name + ", " + *city;   // happy path, not nested
    }
};` }
        ] } },
      { title: 'Command–Query Separation', html: `<p>${H.c('r', 'Confusing:')} <code>if (set("color", "red"))</code> — does it check whether color <i>was</i> red, or set it and report success? ${H.c('g', 'Clear:')} <code>if (hasAttribute("color")) setAttribute("color", "red");</code> A query must be safe to call twice; a command changes state and returns nothing (or throws on failure). (Exceptions such as <code>Deque.pop()</code> or <code>Set.add()</code> returning a boolean are accepted idioms — know them.)</p>` },
      { title: 'Parameter object for long argument lists', html: `<p><code>search(String from, String to, LocalDate depart, LocalDate ret, int adults, int kids, boolean flexible)</code> — easy to swap <code>from</code> and <code>to</code> by mistake. Group what belongs together: <code>search(Route route, DateRange dates, Passengers pax)</code>. The new types also become homes for behaviour (<code>dates.nights()</code>).</p>`, code: { lang: 'java', code: `record Route(String from, String to) {}
record DateRange(LocalDate depart, LocalDate ret) {
    DateRange { if (ret.isBefore(depart)) throw new IllegalArgumentException("return before departure"); }
    long nights() { return java.time.temporal.ChronoUnit.DAYS.between(depart, ret); }
}
record Passengers(int adults, int kids) {}
class FlightSearch {
    String search(Route route, DateRange dates, Passengers pax) {
        return route.from() + "->" + route.to() + " for " + dates.nights() + " nights, " + (pax.adults() + pax.kids()) + " pax";
    }
}`, alt: [
          { lang: 'python', code: `from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class Route:
    from_city: str
    to_city: str


@dataclass(frozen=True)
class DateRange:
    depart: date
    ret: date

    def __post_init__(self) -> None:
        if self.ret < self.depart:
            raise ValueError("return before departure")

    def nights(self) -> int:
        return (self.ret - self.depart).days


@dataclass(frozen=True)
class Passengers:
    adults: int
    kids: int


class FlightSearch:
    def search(self, route: Route, dates: DateRange, pax: Passengers) -> str:
        return f"{route.from_city}->{route.to_city} for {dates.nights()} nights, {pax.adults + pax.kids} pax"` },
          { lang: 'ts', code: `interface Route { readonly from: string; readonly to: string; }

class DateRange {
  // depart and ret are ISO dates such as "2026-10-01"
  constructor(readonly depart: string, readonly ret: string) {
    if (Date.parse(ret) < Date.parse(depart)) throw new RangeError("return before departure");
  }
  nights(): number { return Math.round((Date.parse(this.ret) - Date.parse(this.depart)) / 86_400_000); }
}

interface Passengers { readonly adults: number; readonly kids: number; }

class FlightSearch {
  search(route: Route, dates: DateRange, pax: Passengers): string {
    return \`\${route.from}->\${route.to} for \${dates.nights()} nights, \${pax.adults + pax.kids} pax\`;
  }
}` },
          { lang: 'cpp', code: `struct Route { string from; string to; };

class DateRange {
    chrono::sys_days depart_, ret_;
public:
    DateRange(chrono::sys_days depart, chrono::sys_days ret) : depart_(depart), ret_(ret) {
        if (ret_ < depart_) throw invalid_argument("return before departure");
    }
    long nights() const { return (ret_ - depart_).count(); }
};

struct Passengers { int adults; int kids; };

class FlightSearch {
public:
    string search(const Route& route, const DateRange& dates, const Passengers& pax) const {
        return route.from + "->" + route.to + " for " + to_string(dates.nights()) + " nights, " + to_string(pax.adults + pax.kids) + " pax";
    }
};` }
        ] } },
      { title: 'Comments: why, not what', html: `<p>${H.c('r', 'Redundant:')} <code>// increment retry count</code> above <code>retryCount++</code>. ${H.c('g', 'Valuable:')} <code>// Bank API rate-limits at 5 req/s; retry with backoff or we get banned for an hour.</code> If you need a comment to explain <i>what</i> code does, try a better name or an extracted method first. Keep comments for <i>why</i>, warnings, and public API docs.</p>` }
    ],
    deepDive: `<p><b>Why small functions help the brain:</b> working memory holds only a handful of "chunks" at once (often quoted as about 4). A well-named function turns 15 lines into one chunk ("applyLoyaltyDiscount"). Deep nesting is costly because each level is another chunk you must hold — that is why SonarSource's <b>cognitive complexity</b> metric adds an extra penalty per nesting level, unlike plain <b>cyclomatic complexity</b> (number of independent paths = decisions + 1).</p>
<p><b>Can functions be too small?</b> Yes. Splitting into dozens of 1-line methods that are each used once, with names that just restate the code (<code>addOne(x)</code>), forces readers to jump around ("lasagna code"). Extract when the new name <b>adds information</b> or hides a level of detail. Inline Method is the reverse refactoring for when it doesn't.</p>
<p><b>Performance:</b> optimizing compilers and JITs (HotSpot, V8, GCC and Clang) inline small methods aggressively (HotSpot, for example, always inlines methods under 35 bytes of bytecode), so extracting methods almost never costs speed. Megamorphic virtual calls are the rare exception, and only profiling can tell you it matters. Python is the exception: a function call there has a real cost, but it is still rarely the bottleneck.</p>
<p><b>Names and architecture:</b> Domain-Driven Design calls the shared vocabulary of developers and business people the <b>Ubiquitous Language</b>. When code uses the same words as the business ("backorder", "settlement", "chargeback"), conversations map directly onto classes. Name drift (the business says "subscription", code says <code>Plan</code>) is a slow tax on every discussion.</p>
<p><b>Getters and setters:</b> the JavaBeans <code>getX/setX</code> convention is required by many Java frameworks, but domain objects read better with intention-revealing commands (<code>account.deposit(m)</code> rather than <code>setBalance</code>). Java records, Python properties and TypeScript <code>readonly</code> fields expose values without a <code>get</code> prefix.</p>
<p><b>Tests as names:</b> test method names are specifications: <code>expressTotal_addsFee_forNonEmptyCart()</code> or JUnit 5's <code>@DisplayName</code>. When a test fails, its name should tell you which rule broke.</p>`,
    aiEra: `<p><b>What AI changes:</b> names are now also <b>prompts</b>. Coding assistants and agents read your identifiers to guess intent. A method called <code>applyLoyaltyDiscount</code> gets better completions, better generated tests and better agent edits than <code>doIt2</code>. Vague names make AI output vaguer too.</p>
<p><b>Use AI as a partner:</b> AI is very good at proposing names: <code>Suggest 3 intention-revealing names for this method based on what it does and how callers use it.</code> It is also good at mechanical Extract Method suggestions and at turning comments into method names. Ask it to explain a function in one sentence — if that sentence contains "and", the function probably does two things.</p>
<p><b>Where AI goes wrong:</b> it produces names that are long but generic (<code>processAndHandleOrderData</code>), invents synonyms that clash with your existing vocabulary (<code>fetch</code> in a codebase that uses <code>find</code>), and generated code often has long methods with comment banners ("// Step 1: validate") instead of extracted functions.</p>
<p><b>What you must still own:</b> the domain vocabulary and consistency across the codebase. A short glossary in the repo (or in your agent instructions file) helps humans and AI use the same words.</p>`,
    problems: [{
      title: 'Untangle the arrow-shaped validator',
      level: 'Medium', tags: ['naming', 'guard clauses', 'extract method'], companies: ['Infosys', 'Paytm'],
      statement: `<p>A signup validator <code>chk(String a, String b, int c)</code> returns an error string or <code>"OK"</code>. It is 5 levels deep, uses one-letter names and the magic numbers 18, 8 and 120. Rename everything, replace nesting with guard clauses, extract small well-named checks and named constants — <b>without changing any output</b>.</p>`,
      constraints: `Rules (unchanged): email must contain "@"; password at least 8 characters; age between 18 and 120 inclusive. Error priority stays: email → password → age. Same error messages.`,
      example: `<p><code>("asha@x.com", "secret123", 25)</code> → ${H.c('g', '"OK"')}. <code>("asha", "secret123", 25)</code> → ${H.c('r', '"bad email"')}. <code>("asha@x.com", "short", 15)</code> → ${H.c('r', '"weak password"')} (email OK, password checked before age).</p>`,
      brute: {
        why: `<p>The reader must keep five nested conditions in mind to understand the last <code>return</code>. Single-letter names hide which parameter is which (easy to pass age where length is expected). Magic numbers hide the rules. Adding a sixth rule means nesting even deeper. It works, but every change is risky.</p>`,
        code: { lang: 'java', code: `class V {
    String chk(String a, String b, int c) {
        if (a != null && a.contains("@")) {
            if (b != null) {
                if (b.length() >= 8) {
                    if (c >= 18) {
                        if (c <= 120) {
                            return "OK";
                        } else {
                            return "bad age";
                        }
                    } else {
                        return "bad age";
                    }
                } else {
                    return "weak password";
                }
            } else {
                return "weak password";
            }
        } else {
            return "bad email";
        }
    }
}`, alt: [
                { lang: 'python', code: `
class V:
    def chk(self, a, b, c):
        if a is not None and "@" in a:
            if b is not None:
                if len(b) >= 8:
                    if c >= 18:
                        if c <= 120:
                            return "OK"
                        else:
                            return "bad age"
                    else:
                        return "bad age"
                else:
                    return "weak password"
            else:
                return "weak password"
        else:
            return "bad email"` },
                { lang: 'ts', code: `
class V {
    chk(a: string | null, b: string | null, c: number): string {
        if (a !== null && a.includes("@")) {
            if (b !== null) {
                if (b.length >= 8) {
                    if (c >= 18) {
                        if (c <= 120) {
                            return "OK";
                        } else {
                            return "bad age";
                        }
                    } else {
                        return "bad age";
                    }
                } else {
                    return "weak password";
                }
            } else {
                return "weak password";
            }
        } else {
            return "bad email";
        }
    }
}` },
                { lang: 'cpp', code: `
class V {
public:
    string chk(const string* a, const string* b, int c) {
        if (a != nullptr && a->find('@') != string::npos) {
            if (b != nullptr) {
                if (b->size() >= 8) {
                    if (c >= 18) {
                        if (c <= 120) {
                            return "OK";
                        } else {
                            return "bad age";
                        }
                    } else {
                        return "bad age";
                    }
                } else {
                    return "weak password";
                }
            } else {
                return "weak password";
            }
        } else {
            return "bad email";
        }
    }
};` }
              ] }
      },
      mcq: { q: 'What is the safest FIRST step before touching this code?', options: ['Rewrite it from scratch', 'Write tests that pin the current outputs for valid and each invalid case', 'Rename the class', 'Add comments to each if'], answer: 1, explain: 'Refactoring means behaviour stays the same. Characterization tests prove it, so every later step can be checked in seconds.' },
      hints: [
        `<p>Hint 1: Pin behaviour first: one valid input and one input per error, including the priority case (bad password + bad age → "weak password").</p>`,
        `<p>Hint 2: Invert each <code>if</code> into a guard clause that returns the error immediately; the final line returns "OK". Keep the order email → password → age.</p>`,
        `<p>Hint 3: Extract <code>isValidEmail</code>, <code>isStrongPassword</code>, <code>isAllowedAge</code>, and constants <code>MIN_PASSWORD_LENGTH = 8</code>, <code>MIN_AGE = 18</code>, <code>MAX_AGE = 120</code>. Rename <code>V.chk</code> to <code>SignupValidator.validate(email, password, age)</code>.</p>`
      ],
      tests: { io: true, cases: [{ stdin: '', stdout: "OK\nbad email\nweak password\nweak password\nbad age\nOK\nbad email\nbad age\n" }] },
      solution: {
        approach: `<p><b>Smells:</b> arrow code (deep nesting), meaningless names, magic numbers, duplicated error returns. <b>Refactor, in safe steps:</b> (1) characterization tests; (2) Rename (class, method, parameters); (3) Replace Nested Conditional with Guard Clauses; (4) Extract Method for each rule; (5) Replace Magic Number with Symbolic Constant. Each step is tiny and the tests stay green. The resulting <code>validate</code> reads as a checklist, and adding a rule is one more guard line.</p>`,
        code: `class SignupValidator {
    static final int MIN_PASSWORD_LENGTH = 8;
    static final int MIN_AGE = 18;
    static final int MAX_AGE = 120;

    String validate(String email, String password, int age) {
        if (!isValidEmail(email))        return "bad email";
        if (!isStrongPassword(password)) return "weak password";
        if (!isAllowedAge(age))          return "bad age";
        return "OK";
    }

    private boolean isValidEmail(String email)     { return email != null && email.contains("@"); }
    private boolean isStrongPassword(String pw)    { return pw != null && pw.length() >= MIN_PASSWORD_LENGTH; }
    private boolean isAllowedAge(int age)          { return age >= MIN_AGE && age <= MAX_AGE; }
}

class ValidatorCheck {
    public static void main(String[] args) {
        SignupValidator v = new SignupValidator();
        // characterization cases: same outputs as the old chk(...)
        System.out.println(v.validate("asha@x.com", "secret123", 25));  // OK
        System.out.println(v.validate("asha", "secret123", 25));        // bad email
        System.out.println(v.validate("asha@x.com", "short", 15));      // weak password (priority)
        System.out.println(v.validate("asha@x.com", null, 30));         // weak password
        System.out.println(v.validate("asha@x.com", "secret123", 121)); // bad age
        System.out.println(v.validate("asha@x.com", "secret123", 18));  // OK (boundary)
        System.out.println(v.validate(null, "secret123", 25));          // bad email (null is rejected, not a crash)
        System.out.println(v.validate("asha@x.com", "secret123", 17));  // bad age
    }
}`,
        alt: [
          { lang: 'python', code: `from typing import Optional


class SignupValidator:
    MIN_PASSWORD_LENGTH = 8
    MIN_AGE = 18
    MAX_AGE = 120

    def validate(self, email: Optional[str], password: Optional[str], age: int) -> str:
        if not self._is_valid_email(email):
            return "bad email"
        if not self._is_strong_password(password):
            return "weak password"
        if not self._is_allowed_age(age):
            return "bad age"
        return "OK"

    @staticmethod
    def _is_valid_email(email: Optional[str]) -> bool:
        return email is not None and "@" in email

    @classmethod
    def _is_strong_password(cls, pw: Optional[str]) -> bool:
        return pw is not None and len(pw) >= cls.MIN_PASSWORD_LENGTH

    @classmethod
    def _is_allowed_age(cls, age: int) -> bool:
        return cls.MIN_AGE <= age <= cls.MAX_AGE


if __name__ == "__main__":
    v = SignupValidator()
    # characterization cases: same outputs as the old chk(...)
    print(v.validate("asha@x.com", "secret123", 25))  # OK
    print(v.validate("asha", "secret123", 25))  # bad email
    print(v.validate("asha@x.com", "short", 15))  # weak password (priority)
    print(v.validate("asha@x.com", None, 30))  # weak password
    print(v.validate("asha@x.com", "secret123", 121))  # bad age
    print(v.validate("asha@x.com", "secret123", 18))  # OK (boundary)
    print(v.validate(None, "secret123", 25))  # bad email (None is rejected, not a crash)
    print(v.validate("asha@x.com", "secret123", 17))  # bad age` },
          { lang: 'ts', code: `class SignupValidator {
  static readonly MIN_PASSWORD_LENGTH = 8;
  static readonly MIN_AGE = 18;
  static readonly MAX_AGE = 120;

  validate(email: string | null, password: string | null, age: number): string {
    if (!this.isValidEmail(email)) return "bad email";
    if (!this.isStrongPassword(password)) return "weak password";
    if (!this.isAllowedAge(age)) return "bad age";
    return "OK";
  }

  private isValidEmail(email: string | null): boolean { return email !== null && email.includes("@"); }
  private isStrongPassword(pw: string | null): boolean { return pw !== null && pw.length >= SignupValidator.MIN_PASSWORD_LENGTH; }
  private isAllowedAge(age: number): boolean { return age >= SignupValidator.MIN_AGE && age <= SignupValidator.MAX_AGE; }
}

const v = new SignupValidator();
// characterization cases: same outputs as the old chk(...)
console.log(v.validate("asha@x.com", "secret123", 25)); // OK
console.log(v.validate("asha", "secret123", 25)); // bad email
console.log(v.validate("asha@x.com", "short", 15)); // weak password (priority)
console.log(v.validate("asha@x.com", null, 30)); // weak password
console.log(v.validate("asha@x.com", "secret123", 121)); // bad age
console.log(v.validate("asha@x.com", "secret123", 18)); // OK (boundary)
console.log(v.validate(null, "secret123", 25)); // bad email (null is rejected, not a crash)
console.log(v.validate("asha@x.com", "secret123", 17)); // bad age` },
          { lang: 'cpp', code: `class SignupValidator {
public:
    static constexpr size_t MIN_PASSWORD_LENGTH = 8;
    static constexpr int MIN_AGE = 18;
    static constexpr int MAX_AGE = 120;

    string validate(const optional<string>& email, const optional<string>& password, int age) const {
        if (!isValidEmail(email)) return "bad email";
        if (!isStrongPassword(password)) return "weak password";
        if (!isAllowedAge(age)) return "bad age";
        return "OK";
    }

private:
    static bool isValidEmail(const optional<string>& email) { return email && email->find('@') != string::npos; }
    static bool isStrongPassword(const optional<string>& pw) { return pw && pw->size() >= MIN_PASSWORD_LENGTH; }
    static bool isAllowedAge(int age) { return age >= MIN_AGE && age <= MAX_AGE; }
};

int main() {
    SignupValidator v;
    // characterization cases: same outputs as the old chk(...)
    cout << v.validate("asha@x.com", "secret123", 25) << "\\n";   // OK
    cout << v.validate("asha", "secret123", 25) << "\\n";         // bad email
    cout << v.validate("asha@x.com", "short", 15) << "\\n";       // weak password (priority)
    cout << v.validate("asha@x.com", nullopt, 30) << "\\n";       // weak password
    cout << v.validate("asha@x.com", "secret123", 121) << "\\n";  // bad age
    cout << v.validate("asha@x.com", "secret123", 18) << "\\n";   // OK (boundary)
    cout << v.validate(nullopt, "secret123", 25) << "\\n";        // bad email (absent is rejected, not a crash)
    cout << v.validate("asha@x.com", "secret123", 17) << "\\n";   // bad age
}` }
        ],
        complexity: `<p>Runtime unchanged: O(length of email + password). Max nesting 5 → 1; longest method 22 lines → 5; magic numbers 3 → 0.</p>`,
        followUps: ['Return all errors at once instead of the first one — what shape would you use? (List&lt;String&gt; or a ValidationResult)', 'How would you share these rules with the front-end without duplicating them?', 'Should errors be strings or an enum? Why?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 7 — Code Smells & Refactoring
     ===================================================================== */
  topics.push({
    title: 'Code Smells & Safe Refactoring (spot it, name it, fix it in small steps)',
    analogy: `<p>A funny <b>smell in the fridge</b> is not proof that food is rotten — but it tells you where to look. Code smells are the same: <i>hints</i> that something might be wrong, worth a closer look.</p>
<p><b>Refactoring</b> is like tidying a busy shop <b>while it stays open</b>. You do not close for a month and rebuild (a rewrite). You move one shelf at a time, and after each move you check that customers can still find everything. Small steps, constant checking, never a broken shop.</p>`,
    explain: `<p>Martin Fowler's definition: <b>refactoring</b> is <i>"a change made to the internal structure of software to make it easier to understand and cheaper to modify without changing its observable behaviour."</i> Two key words: <b>without changing behaviour</b>. Adding a feature is not refactoring; fixing a bug is not refactoring. Keep them separate ("two hats": you wear either the feature hat or the refactoring hat, never both at once).</p>
<p><b>The safe loop:</b> tests green → make one tiny change (rename, extract, move) → run tests → commit → repeat. If a test goes red, <b>undo</b> the last tiny step instead of debugging a big mess. Modern IDEs (IntelliJ, Eclipse, VS Code) automate many refactorings so they are nearly risk-free.</p>
<p><b>The smell catalogue</b> (from Fowler &amp; Beck, grouped the popular way):</p>
${H.table(['Group', 'Smell', 'You notice…', 'Usual refactoring'], [
  ['Bloaters', 'Long Method', 'Scrolling to read one method; comment banners', 'Extract Method'],
  ['', 'Large / God Class', '2000 lines, 40 fields, "Manager"', 'Extract Class (split by cohesion)'],
  ['', 'Primitive Obsession', '<code>String email</code>, <code>double money</code>, <code>int status</code> everywhere', 'Replace Primitive with Object (value objects, enums)'],
  ['', 'Long Parameter List / Data Clumps', 'Same 3 params travel together', 'Introduce Parameter Object'],
  ['OO abusers', 'Switch Statements (repeated)', 'Same <code>switch(type)</code> in many places', 'Replace Conditional with Polymorphism'],
  ['', 'Refused Bequest', 'Subclass ignores/throws on inherited methods', 'Replace Inheritance with Delegation'],
  ['', 'Temporary Field', 'Field only set in some situations', 'Extract Class / pass as parameter'],
  ['Change preventers', 'Divergent Change', 'One class changes for many different reasons', 'Extract Class (SRP)'],
  ['', 'Shotgun Surgery', 'One change touches many classes', 'Move Method / Inline Class to gather it'],
  ['Dispensables', 'Duplicate Code', 'Copy-paste', 'Extract Method / Pull Up'],
  ['', 'Dead Code / Speculative Generality', 'Unused methods, one-impl abstractions', 'Delete / Collapse Hierarchy'],
  ['', 'Comments as deodorant', 'Comment explains confusing code', 'Rename / Extract Method'],
  ['', 'Data Class', 'Only getters/setters; logic lives elsewhere', 'Move Method into it'],
  ['Couplers', 'Feature Envy', 'Method uses another object\'s data more than its own', 'Move Method'],
  ['', 'Message Chains', '<code>a.getB().getC().getD()</code>', 'Hide Delegate (Law of Demeter)'],
  ['', 'Middle Man', 'Class only forwards calls', 'Remove Middle Man / Inline'],
  ['', 'Inappropriate Intimacy', 'Two classes poke each other\'s internals', 'Move Method / Extract Class']
])}
<p><b>Divergent change vs shotgun surgery</b> (a favourite interview question): divergent change = <i>one class, many reasons to change</i> (split it); shotgun surgery = <i>one reason to change, many classes</i> (gather it). They are mirror images.</p>
<p><b>Legacy code without tests?</b> First write <b>characterization tests</b> (Michael Feathers): call the code with sample inputs and assert whatever it returns <i>today</i>, even if it looks wrong. Now you have a safety net that detects any behaviour change. Then refactor.</p>`,
    clues: [
      '"Adding a new payment type means editing 6 files" → shotgun surgery, usually from repeated <code>switch</code> on a type code.',
      '"This class changes every sprint for different reasons" → divergent change / SRP violation.',
      'Method parameters like <code>(String street, String city, String zip)</code> appearing in many signatures → data clump → value object.',
      '"We have no tests and need to change this" → characterization tests first, then refactor in small steps.',
      '"Should we rewrite it?" → prefer incremental refactoring / strangler fig; rewrites lose hidden behaviour.',
      'Code review exercise: "list the smells in this snippet" → name them with catalogue words (Feature Envy, Primitive Obsession…) and pair each with a refactoring.'
    ],
    code: { lang: 'java', code: `// BEFORE: the same switch on a type code appears in several classes (shotgun surgery).
enum EmpType { ENGINEER, MANAGER, INTERN }
class EmpBefore { final EmpType type; final int base; EmpBefore(EmpType t, int b) { type = t; base = b; } }
class PayrollBefore {
    int pay(EmpBefore e) {
        switch (e.type) {
            case ENGINEER: return e.base;
            case MANAGER:  return e.base + 20_000;
            case INTERN:   return e.base / 2;
            default: throw new IllegalStateException();
        }
    }
}
class BadgeBefore {
    String label(EmpBefore e) {
        switch (e.type) {                       // copy #2 of the type knowledge
            case ENGINEER: return "ENG";
            case MANAGER:  return "MGR";
            case INTERN:   return "INT";
            default: throw new IllegalStateException();
        }
    }
}

// AFTER: Replace Conditional with Polymorphism. Each type owns its behaviour.
sealed interface Employee permits Engineer, Manager, Intern {
    int pay();
    String badge();
}
record Engineer(int base) implements Employee {
    public int pay() { return base; }
    public String badge() { return "ENG"; }
}
record Manager(int base) implements Employee {
    static final int MANAGEMENT_ALLOWANCE = 20_000;
    public int pay() { return base + MANAGEMENT_ALLOWANCE; }
    public String badge() { return "MGR"; }
}
record Intern(int base) implements Employee {
    public int pay() { return base / 2; }
    public String badge() { return "INT"; }
}

class SmellDemo {
    public static void main(String[] args) {
        EmpBefore old = new EmpBefore(EmpType.MANAGER, 100_000);
        System.out.println(new PayrollBefore().pay(old) + " " + new BadgeBefore().label(old));
        List<Employee> staff = List.of(new Engineer(90_000), new Manager(100_000), new Intern(40_000));
        for (Employee e : staff) System.out.println(e.badge() + " " + e.pay());
        // Adding "Contractor" = one new record. The compiler (sealed) lists every place that must handle it.
    }
}`, alt: [
        { lang: 'python', code: `from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum, auto


# BEFORE: the same switch on a type code appears in several classes (shotgun surgery).
class EmpType(Enum):
    ENGINEER = auto()
    MANAGER = auto()
    INTERN = auto()


@dataclass(frozen=True)
class EmpBefore:
    type: EmpType
    base: int


class PayrollBefore:
    def pay(self, e: EmpBefore) -> int:
        if e.type is EmpType.ENGINEER:
            return e.base
        if e.type is EmpType.MANAGER:
            return e.base + 20_000
        if e.type is EmpType.INTERN:
            return e.base // 2
        raise RuntimeError("unknown type")


class BadgeBefore:
    def label(self, e: EmpBefore) -> str:
        if e.type is EmpType.ENGINEER:  # copy #2 of the type knowledge
            return "ENG"
        if e.type is EmpType.MANAGER:
            return "MGR"
        if e.type is EmpType.INTERN:
            return "INT"
        raise RuntimeError("unknown type")


# AFTER: Replace Conditional with Polymorphism. Each type owns its behaviour.
class Employee(ABC):
    @abstractmethod
    def pay(self) -> int: ...

    @abstractmethod
    def badge(self) -> str: ...


@dataclass(frozen=True)
class Engineer(Employee):
    base: int

    def pay(self) -> int:
        return self.base

    def badge(self) -> str:
        return "ENG"


@dataclass(frozen=True)
class Manager(Employee):
    MANAGEMENT_ALLOWANCE = 20_000
    base: int

    def pay(self) -> int:
        return self.base + self.MANAGEMENT_ALLOWANCE

    def badge(self) -> str:
        return "MGR"


@dataclass(frozen=True)
class Intern(Employee):
    base: int

    def pay(self) -> int:
        return self.base // 2

    def badge(self) -> str:
        return "INT"


if __name__ == "__main__":
    old = EmpBefore(EmpType.MANAGER, 100_000)
    print(f"{PayrollBefore().pay(old)} {BadgeBefore().label(old)}")
    staff: list[Employee] = [Engineer(90_000), Manager(100_000), Intern(40_000)]
    for e in staff:
        print(f"{e.badge()} {e.pay()}")
    # Adding "Contractor" = one new class. A type checker with a closed union lists every place that must handle it.` },
        { lang: 'ts', code: `// BEFORE: the same switch on a type code appears in several classes (shotgun surgery).
type EmpType = "ENGINEER" | "MANAGER" | "INTERN";
interface EmpBefore { readonly type: EmpType; readonly base: number; }

class PayrollBefore {
  pay(e: EmpBefore): number {
    switch (e.type) {
      case "ENGINEER": return e.base;
      case "MANAGER": return e.base + 20_000;
      case "INTERN": return Math.floor(e.base / 2);
    }
  }
}
class BadgeBefore {
  label(e: EmpBefore): string {
    switch (e.type) { // copy #2 of the type knowledge
      case "ENGINEER": return "ENG";
      case "MANAGER": return "MGR";
      case "INTERN": return "INT";
    }
  }
}

// AFTER: Replace Conditional with Polymorphism. Each type owns its behaviour.
interface Employee {
  pay(): number;
  badge(): string;
}
class Engineer implements Employee {
  constructor(private readonly base: number) {}
  pay(): number { return this.base; }
  badge(): string { return "ENG"; }
}
class Manager implements Employee {
  static readonly MANAGEMENT_ALLOWANCE = 20_000;
  constructor(private readonly base: number) {}
  pay(): number { return this.base + Manager.MANAGEMENT_ALLOWANCE; }
  badge(): string { return "MGR"; }
}
class Intern implements Employee {
  constructor(private readonly base: number) {}
  pay(): number { return Math.floor(this.base / 2); }
  badge(): string { return "INT"; }
}

const old: EmpBefore = { type: "MANAGER", base: 100_000 };
console.log(\`\${new PayrollBefore().pay(old)} \${new BadgeBefore().label(old)}\`);
const staff: Employee[] = [new Engineer(90_000), new Manager(100_000), new Intern(40_000)];
for (const e of staff) console.log(\`\${e.badge()} \${e.pay()}\`);
// Adding "Contractor" = one new class. A discriminated union (as above for EmpType) lets the compiler list every switch to update.` },
        { lang: 'cpp', code: `// BEFORE: the same switch on a type code appears in several classes (shotgun surgery).
enum class EmpType { ENGINEER, MANAGER, INTERN };
struct EmpBefore { EmpType type; int base; };

class PayrollBefore {
public:
    int pay(const EmpBefore& e) const {
        switch (e.type) {
            case EmpType::ENGINEER: return e.base;
            case EmpType::MANAGER:  return e.base + 20'000;
            case EmpType::INTERN:   return e.base / 2;
        }
        throw logic_error("unknown type");
    }
};
class BadgeBefore {
public:
    string label(const EmpBefore& e) const {
        switch (e.type) {                       // copy #2 of the type knowledge
            case EmpType::ENGINEER: return "ENG";
            case EmpType::MANAGER:  return "MGR";
            case EmpType::INTERN:   return "INT";
        }
        throw logic_error("unknown type");
    }
};

// AFTER: Replace Conditional with Polymorphism. Each type owns its behaviour.
class Employee {
public:
    virtual ~Employee() = default;
    virtual int pay() const = 0;
    virtual string badge() const = 0;
};
class Engineer final : public Employee {
    int base_;
public:
    explicit Engineer(int base) : base_(base) {}
    int pay() const override { return base_; }
    string badge() const override { return "ENG"; }
};
class Manager final : public Employee {
    int base_;
public:
    static constexpr int MANAGEMENT_ALLOWANCE = 20'000;
    explicit Manager(int base) : base_(base) {}
    int pay() const override { return base_ + MANAGEMENT_ALLOWANCE; }
    string badge() const override { return "MGR"; }
};
class Intern final : public Employee {
    int base_;
public:
    explicit Intern(int base) : base_(base) {}
    int pay() const override { return base_ / 2; }
    string badge() const override { return "INT"; }
};

int main() {
    EmpBefore old{EmpType::MANAGER, 100'000};
    cout << PayrollBefore().pay(old) << " " << BadgeBefore().label(old) << "\\n";
    vector<unique_ptr<Employee>> staff;
    staff.push_back(make_unique<Engineer>(90'000));
    staff.push_back(make_unique<Manager>(100'000));
    staff.push_back(make_unique<Intern>(40'000));
    for (const auto& e : staff) cout << e->badge() << " " << e->pay() << "\\n";
    // Adding "Contractor" = one new class. A switch over the enum (above) warns about every case you forgot.
}` }
      ] },
    codeTitle: 'Replace Conditional with Polymorphism',
    viz: [{
      title: 'Shotgun surgery: adding a new type',
      input: 'Engineer, Manager, Intern, Contractor',
      inputLabel: 'Employee types; the LAST one is the new type being added (3-5)',
      gen: function (input) {
        var types = splitList(input, 'Engineer, Manager, Intern, Contractor');
        if (types.length < 3 || types.length > 5) throw new Error('Give 3 to 5 type names; the last one is the new type');
        var newT = types[types.length - 1], oldT = types.slice(0, -1);
        var frames = [];
        var places = [['PAY', 'PayrollService', 15], ['BON', 'BonusService', 38], ['BDG', 'BadgePrinter', 62], ['RPT', 'HrReport', 85]];
        var nodes = [bx('ENUM', 'enum EmpType', 50, 8)];
        places.forEach(function (p) { nodes.push(bx(p[0], p[1], p[2], 40)); });
        var edges = places.map(function (p) { return [p[0], 'ENUM', 'switch']; });
        var ehl = {};
        places.forEach(function (p) { ehl[p[0] + '-ENUM'] = 'bad'; });
        frames.push({ narr: 'Today we have ' + oldT.length + ' types (' + oldT.map(H.esc).join(', ') + '). <b>Four</b> classes each contain a <code>switch (type)</code> — the knowledge "what each type does" is scattered (red edges = switch on the type code).', parts: [gp('BEFORE: type code + switches', nodes, edges, { ENUM: 'cur' }, ehl, { ENUM: oldT.length + ' constants' }, 52), cp('PayrollService', ['switch (e.type) {'].concat(oldT.map(function (t) { return '  case ' + t.toUpperCase() + ': return ...;'; })).concat(['}']), {})] });
        frames.push({ narr: 'Request: "add <b>' + H.esc(newT) + '</b>". Step 1: add a constant to the enum.', parts: [gp('BEFORE: type code + switches', nodes, edges, { ENUM: 'ok' }, ehl, { ENUM: '+ ' + newT }, 52), { type: 'vars', label: 'change cost', vals: { filesEdited: 1, forgottenRisk: 'high' } }] });
        var hl = { ENUM: 'ok' }, tags = { ENUM: '+ ' + newT };
        places.forEach(function (p, i) {
          var missed = i === places.length - 1;
          hl[p[0]] = missed ? 'bad' : 'ok'; tags[p[0]] = missed ? 'FORGOTTEN → default branch' : '+ case';
          var code = ['switch (e.type) {'].concat(oldT.map(function (t) { return '  case ' + t.toUpperCase() + ': return ...;'; }));
          if (!missed) code.push('  case ' + newT.toUpperCase() + ': return ...;   // added');
          code.push('  default: throw new IllegalStateException();');
          code.push('}');
          var chl = {}; chl[code.length - (missed ? 1 : 2)] = missed ? 'bad' : 'ok';
          frames.push({ narr: missed ? '<span class="c-r">' + p[1] + ' was missed.</span> Nothing forced us to update it; at runtime the first ' + H.esc(newT) + ' hits the <code>default</code> branch and crashes the HR report in production. This is <b>shotgun surgery</b>: one change, many places.' : 'Edit <b>' + p[1] + '</b>: add a <code>case ' + H.esc(newT.toUpperCase()) + '</code>. Files touched so far: ' + (i + 2) + '.', parts: [gp('BEFORE: one change, many places', nodes, edges, clone(hl), ehl, clone(tags), 52), cp(p[1], code, chl), { type: 'vars', label: 'change cost', vals: { filesEdited: i + 2, forgottenRisk: 'high' }, hl: { filesEdited: 'bad' } }] });
        });
        var aNodes = [bx('IF', 'Employee', 50, 8)], aEdges = [], aHl = { IF: 'sel' }, aEhl = {};
        types.forEach(function (t, i) {
          var id = 'T' + i;
          aNodes.push(bx(id, short(t, 11), spread(types.length, i, 12, 88), 40));
          aEdges.push([id, 'IF', 'implements']); aEhl[id + '-IF'] = 'ok';
          aHl[id] = t === newT ? 'ok' : 'done';
        });
        frames.push({ narr: '<b>Refactor: Replace Conditional with Polymorphism.</b> <code>Employee</code> becomes a (sealed) interface with <code>pay()</code>, <code>bonus()</code>, <code>badge()</code>, <code>reportLine()</code>. Each type is a class that owns all its behaviour. The four services just call <code>e.pay()</code> etc. — no switches left.', parts: [gp('AFTER: behaviour lives with the type', aNodes, aEdges, aHl, aEhl, { IF: 'sealed interface' }, 52)] });
        frames.push({ narr: 'Adding <b>' + H.esc(newT) + '</b> now = <b>one new class</b>. And because the interface is <code>sealed</code> (or simply abstract), the compiler refuses to build until every method is implemented — you <i>cannot</i> forget one.', parts: [cp(newT, ['record ' + newT.replace(/\W/g, '') + '(int base) implements Employee {', '  public int pay()    { return base; }', '  public int bonus()  { return 0; }', '  public String badge()      { return "' + newT.slice(0, 3).toUpperCase() + '"; }', '  public String reportLine() { return "' + newT + ' " + pay(); }', '}'], rng(1, 6, 'ok'), contractorAlt(newT)), { type: 'vars', label: 'change cost', vals: { filesEdited: 1, forgottenRisk: 'none (compiler checks)' }, hl: { filesEdited: 'ok', forgottenRisk: 'ok' } }] });
        frames.push({ narr: 'When is the switch still fine? When it appears in <b>one</b> place (e.g. a factory that turns a DB code into the right object), or when the set of <i>operations</i> grows more often than the set of <i>types</i> (then a pattern-matching <code>switch</code> over a sealed type, or the Visitor pattern, is the better trade-off).', parts: [{ type: 'table', label: 'Choose the shape', columns: ['What changes more often?', 'Prefer'], rows: [['New types are added often', 'Polymorphism (one class per type)'], ['New operations are added often', 'switch over sealed types / Visitor'], ['Only one switch, in a factory', 'Keep it — it is the single home']], hl: { 0: 'sel' } }] });
        return frames;
      }
    }, {
      title: 'The safe refactoring loop',
      gen: function () {
        var nodes = [bx('G', 'Tests green', 15, 10), bx('S', 'One tiny step', 85, 10), bx('R', 'Run tests', 85, 46), bx('C', 'Commit', 15, 46), bx('U', 'Undo step', 50, 28)];
        var edges = [['G', 'S'], ['S', 'R'], ['R', 'C', 'pass'], ['C', 'G'], ['R', 'U', 'fail'], ['U', 'G']];
        var steps = [
          ['Rename doIt → priceOrder', 'pass'], ['Extract Method subtotal()', 'pass'], ['Move discount into Customer', 'fail'], ['Move discount (fixed: kept rounding)', 'pass'], ['Introduce Parameter Object DateRange', 'pass']
        ];
        var f = [];
        var log = [];
        f.push({ narr: 'Before touching anything: are there tests, and are they green? If not, write characterization tests first. This is the starting state of the loop.', parts: [gp('Refactoring loop', nodes, edges, { G: 'ok' }, {}, {}, 56), { type: 'table', label: 'commit log', columns: ['#', 'step', 'result'], rows: [['-', 'start', 'green']], hl: {} }] });
        steps.forEach(function (st, i) {
          var ok = st[1] === 'pass';
          f.push({ narr: 'Step ' + (i + 1) + ': <b>' + st[0] + '</b>. One small, named change — small enough to explain in a commit message.', parts: [gp('Refactoring loop', nodes, edges, { S: 'cur' }, { 'G-S': 'cur' }, { S: st[0] }, 56)] });
          log.push([String(i + 1), st[0], ok ? 'green → committed' : 'RED → undone']);
          var hl = ok ? { R: 'ok', C: 'ok' } : { R: 'bad', U: 'cur' };
          var ehl = ok ? { 'S-R': 'ok', 'R-C': 'ok' } : { 'S-R': 'cur', 'R-U': 'bad' };
          f.push({ narr: ok ? 'Tests pass → <b>commit</b>. The commit is a save point you can always return to.' : '<span class="c-r">A test failed</span> (the move changed rounding). Do not debug a pile of changes: <b>undo this one step</b> (git checkout / IDE undo), think, and redo it more carefully. Cheap because the step was tiny.', parts: [gp('Refactoring loop', nodes, edges, hl, ehl, {}, 56), { type: 'table', label: 'commit log', columns: ['#', 'step', 'result'], rows: log.slice(), hl: (function () { var h = {}; h[log.length - 1] = ok ? 'ok' : 'bad'; return h; })() }] });
        });
        f.push({ narr: 'Five small safe steps (one retried) instead of one risky "big refactor". Each commit is reviewable on its own. This rhythm is what interviewers mean by "refactor safely".', parts: [{ type: 'table', label: 'commit log', columns: ['#', 'step', 'result'], rows: log, hl: { 2: 'bad' } }] });
        return f;
      }
    }],
    examples: [
      { title: 'Primitive Obsession → value object', html: `<p>Money as <code>double</code> gives rounding errors (<code>0.1 + 0.2 != 0.3</code>) and lets you add rupees to dollars. A small immutable <code>Money</code> type fixes both and becomes the home for money rules.</p>`, code: { lang: 'java', code: `record Money(long minorUnits, String currency) {
    Money {
        Objects.requireNonNull(currency);
        if (minorUnits < 0) throw new IllegalArgumentException("negative money");
    }
    Money plus(Money other) {
        if (!currency.equals(other.currency)) throw new IllegalArgumentException("currency mismatch");
        return new Money(minorUnits + other.minorUnits, currency);
    }
    Money percent(int p) { return new Money(minorUnits * p / 100, currency); }
}`, alt: [
          { lang: 'python', code: `from dataclasses import dataclass


@dataclass(frozen=True)
class Money:
    minor_units: int
    currency: str

    def __post_init__(self) -> None:
        if self.minor_units < 0:
            raise ValueError("negative money")

    def plus(self, other: "Money") -> "Money":
        if self.currency != other.currency:
            raise ValueError("currency mismatch")
        return Money(self.minor_units + other.minor_units, self.currency)

    def percent(self, p: int) -> "Money":
        return Money(self.minor_units * p // 100, self.currency)` },
          { lang: 'ts', code: `class Money {
  constructor(readonly minorUnits: number, readonly currency: string) {
    if (minorUnits < 0) throw new RangeError("negative money");
  }
  plus(other: Money): Money {
    if (this.currency !== other.currency) throw new TypeError("currency mismatch");
    return new Money(this.minorUnits + other.minorUnits, this.currency);
  }
  percent(p: number): Money {
    return new Money(Math.floor((this.minorUnits * p) / 100), this.currency);
  }
}` },
          { lang: 'cpp', code: `class Money {
    long long minorUnits_;
    string currency_;
public:
    Money(long long minorUnits, string currency) : minorUnits_(minorUnits), currency_(std::move(currency)) {
        if (minorUnits_ < 0) throw invalid_argument("negative money");
    }
    long long minorUnits() const { return minorUnits_; }
    const string& currency() const { return currency_; }
    Money plus(const Money& other) const {
        if (currency_ != other.currency_) throw invalid_argument("currency mismatch");
        return Money(minorUnits_ + other.minorUnits_, currency_);
    }
    Money percent(int p) const { return Money(minorUnits_ * p / 100, currency_); }
};` }
        ] } },
      { title: 'Feature Envy → Move Method', html: `<p><code>InvoicePrinter.lineTotal(Item i)</code> reads <code>i.price()</code>, <code>i.qty()</code>, <code>i.discount()</code> and nothing of its own. It "envies" <code>Item</code>. Move it: <code>item.total()</code>. Now the rule lives next to its data, and other callers (cart, refunds) reuse it instead of copying it.</p>` },
      { title: 'Divergent Change vs Shotgun Surgery', html: `${H.table(['', 'Divergent Change', 'Shotgun Surgery'], [['Shape', 'one class ← many reasons', 'one reason → many classes'], ['Example', '<code>Order</code> edited for tax, PDF layout and DB schema changes', 'adding a currency edits 7 files'], ['Fix', 'split (Extract Class)', 'gather (Move Method/Field, Inline Class)']])}` },
      { title: 'Characterization test for legacy code', html: `<p>You do not know what <code>legacyFee(int)</code> <i>should</i> return, but you can record what it <i>does</i> return today and lock it in. Any refactor that changes these numbers is caught immediately.</p>`, code: { lang: 'java', code: `class LegacyFees {
    static int legacyFee(int amount) { return amount < 100 ? 5 : amount / 20 + (amount % 7 == 0 ? 1 : 0); }
}
class CharacterizationTest {
    public static void main(String[] args) {
        int[] inputs   = {0, 99, 100, 140, 1000};
        int[] recorded = {5, 5, 5, 8, 50};           // captured from the current code
        for (int i = 0; i < inputs.length; i++) {
            int actual = LegacyFees.legacyFee(inputs[i]);
            if (actual != recorded[i]) throw new AssertionError(inputs[i] + " -> " + actual);
        }
        System.out.println("behaviour pinned");
    }
}`, alt: [
          { lang: 'python', code: `class LegacyFees:
    @staticmethod
    def legacy_fee(amount: int) -> int:
        return 5 if amount < 100 else amount // 20 + (1 if amount % 7 == 0 else 0)


if __name__ == "__main__":
    inputs = [0, 99, 100, 140, 1000]
    recorded = [5, 5, 5, 8, 50]  # captured from the current code
    for amount, expected in zip(inputs, recorded):
        actual = LegacyFees.legacy_fee(amount)
        if actual != expected:
            raise AssertionError(f"{amount} -> {actual}")
    print("behaviour pinned")` },
          { lang: 'ts', code: `class LegacyFees {
  static legacyFee(amount: number): number {
    return amount < 100 ? 5 : Math.floor(amount / 20) + (amount % 7 === 0 ? 1 : 0);
  }
}

const inputs = [0, 99, 100, 140, 1000];
const recorded = [5, 5, 5, 8, 50]; // captured from the current code
inputs.forEach((amount, i) => {
  const actual = LegacyFees.legacyFee(amount);
  if (actual !== recorded[i]) throw new Error(\`\${amount} -> \${actual}\`);
});
console.log("behaviour pinned");` },
          { lang: 'cpp', code: `struct LegacyFees {
    static int legacyFee(int amount) { return amount < 100 ? 5 : amount / 20 + (amount % 7 == 0 ? 1 : 0); }
};

int main() {
    vector<int> inputs{0, 99, 100, 140, 1000};
    vector<int> recorded{5, 5, 5, 8, 50};   // captured from the current code
    for (size_t i = 0; i < inputs.size(); i++) {
        int actual = LegacyFees::legacyFee(inputs[i]);
        if (actual != recorded[i]) throw runtime_error(to_string(inputs[i]) + " -> " + to_string(actual));
    }
    cout << "behaviour pinned\\n";
}` }
        ] } }
    ],
    deepDive: `<p><b>Why "smell" and not "rule":</b> every smell has legitimate exceptions — a long method that is a flat list of 40 field mappings is fine; a <code>switch</code> in a single factory is the right home. Smells start a conversation; tests and change history decide.</p>
<p><b>Finding what to refactor first:</b> Adam Tornhill's <i>hotspot</i> analysis multiplies <b>change frequency</b> (from git log) by <b>complexity</b>. Messy code nobody touches costs little; messy code edited every week costs a lot. Refactor hotspots first. The "Boy Scout Rule" (leave code a bit cleaner than you found it) spreads the work into daily feature tasks instead of big "refactoring sprints".</p>
<p><b>Big refactors without big risk:</b> <i>Branch by Abstraction</i> (introduce an interface, move callers to it, build the new implementation behind it, switch, delete the old); <i>Strangler Fig</i> (route traffic piece by piece from an old system to a new one); <i>Parallel Change / expand-contract</i> (add the new API, migrate callers, remove the old); the <i>Mikado Method</i> (try the goal, note what breaks, revert, solve prerequisites first — a dependency tree of small steps).</p>
<p><b>Rewrites:</b> Joel Spolsky's famous essay argues that rewriting from scratch throws away years of bug fixes hidden in "ugly" code. Prefer incremental refactoring unless the platform itself is dead.</p>
<p><b>Tests that enable refactoring</b> test <i>behaviour through public APIs</i>. Tests that mock every private collaborator or assert internal call order break on every refactor and discourage it. Approval/golden-master tests are a pragmatic tool for legacy outputs (reports, PDFs).</p>
<p><b>Static analysis:</b> SonarQube, PMD, SpotBugs, Error Prone and IntelliJ inspections detect many smells (long methods, duplicated blocks, cyclomatic complexity, unused code). ArchUnit tests enforce package-level rules ("domain must not depend on infrastructure").</p>`,
    aiEra: `<p><b>What AI changes:</b> large language models are genuinely good at mechanical refactorings — renaming, extracting, converting a switch to polymorphism, writing the characterization tests that pin behaviour. Agents can now carry out a multi-file refactor in minutes. The bottleneck moves from <i>typing</i> the refactor to <i>verifying</i> it.</p>
<p><b>Use AI as a partner:</b> (1) <code>List the code smells in this class using Fowler's catalogue names, with line numbers and the matching refactoring. Do not edit.</code> (2) <code>Write characterization tests that capture current behaviour, including odd edge cases.</code> (3) Then ask for <b>one refactoring at a time</b> and run the tests after each, exactly like the safe loop. Prefer your IDE's automated refactorings when available — they are provably behaviour-preserving; AI edits are not.</p>
<p><b>Where AI goes wrong:</b> it mixes refactoring with "improvements" (changing rounding, error messages or null handling) — wearing both hats at once — and large AI diffs hide such behaviour changes. It may delete code that looks dead but is used via reflection, configuration or another service.</p>
<p><b>What you must still own:</b> choosing <i>which</i> smells matter (hotspots), insisting on small reviewable steps, and reading every behaviour-affecting line. "AI refactored it and the tests pass" is only as good as the tests.</p>`,
    problems: [{
      title: 'Movie rental statement (Fowler\'s classic)',
      level: 'Hard', tags: ['replace conditional with polymorphism', 'extract method', 'move method'], companies: ['ThoughtWorks', 'Goldman Sachs'],
      statement: `<p>A video store prints a customer statement. One long method loops over rentals and uses a <code>switch</code> on the movie's price code to compute each charge and the frequent-renter points. The store will soon add new price categories and an HTML statement. Refactor so that (1) adding a price category touches one place, (2) an HTML statement can reuse the calculations without copying them, and (3) the plain-text output is byte-for-byte identical.</p>`,
      constraints: `Prices in paise (int). REGULAR: 200 for up to 2 days, +150 per extra day. NEW_RELEASE: 300 per day. CHILDREN: 150 for up to 3 days, +150 per extra day. Points: 1 per rental, +1 if NEW_RELEASE rented more than 1 day.`,
      example: `<p>Rentals: Jaws (REGULAR, 3 days) = ${H.c('b', '350')}, Dune (NEW_RELEASE, 2 days) = ${H.c('b', '600')}, Bluey (CHILDREN, 4 days) = ${H.c('b', '300')}. Total ${H.c('g', '1250')}, points ${H.c('g', '4')} (1+2+1).</p>`,
      brute: {
        why: `<p>The smelly design mixes three jobs in one method: <b>pricing rules</b>, <b>points rules</b> and <b>text formatting</b> (divergent change). The <code>switch</code> on price code lives inside the customer, far from the movie data (feature envy). An HTML statement would copy the whole loop including the switch (duplication), and a new category means editing every copy of the switch (shotgun surgery).</p>`,
        code: { lang: 'java', code: `class Movie {
    static final int REGULAR = 0, NEW_RELEASE = 1, CHILDREN = 2;
    final String title; int priceCode;
    Movie(String t, int p) { title = t; priceCode = p; }
}
class Rental { final Movie movie; final int days; Rental(Movie m, int d) { movie = m; days = d; } }
class Customer {
    final String name; final List<Rental> rentals = new ArrayList<>();
    Customer(String n) { name = n; }
    String statement() {
        int total = 0, points = 0;
        String result = "Rental record for " + name + "|";
        for (Rental r : rentals) {
            int amt = 0;
            switch (r.movie.priceCode) {
                case Movie.REGULAR:
                    amt += 200;
                    if (r.days > 2) amt += (r.days - 2) * 150;
                    break;
                case Movie.NEW_RELEASE:
                    amt += r.days * 300;
                    break;
                case Movie.CHILDREN:
                    amt += 150;
                    if (r.days > 3) amt += (r.days - 3) * 150;
                    break;
            }
            points++;
            if (r.movie.priceCode == Movie.NEW_RELEASE && r.days > 1) points++;
            result += r.movie.title + ":" + amt + "|";
            total += amt;
        }
        return result + "Total " + total + "|Points " + points;
    }
}`, alt: [
                { lang: 'python', code: `
class Movie:
    REGULAR, NEW_RELEASE, CHILDREN = 0, 1, 2
    def __init__(self, t, p): self.title, self.price_code = t, p

class Rental:
    def __init__(self, m, d): self.movie, self.days = m, d

class Customer:
    def __init__(self, n): self.name, self.rentals = n, []
    def statement(self):
        total = points = 0
        result = "Rental record for " + self.name + "|"
        for r in self.rentals:
            amt = 0
            if r.movie.price_code == Movie.REGULAR:
                amt += 200
                if r.days > 2: amt += (r.days - 2) * 150
            elif r.movie.price_code == Movie.NEW_RELEASE:
                amt += r.days * 300
            elif r.movie.price_code == Movie.CHILDREN:
                amt += 150
                if r.days > 3: amt += (r.days - 3) * 150
            points += 1
            if r.movie.price_code == Movie.NEW_RELEASE and r.days > 1: points += 1
            result += r.movie.title + ":" + str(amt) + "|"
            total += amt
        return result + "Total " + str(total) + "|Points " + str(points)` },
                { lang: 'ts', code: `
class Movie {
    static readonly REGULAR = 0; static readonly NEW_RELEASE = 1; static readonly CHILDREN = 2;
    constructor(readonly title: string, public priceCode: number) {}
}
class Rental { constructor(readonly movie: Movie, readonly days: number) {} }
class Customer {
    readonly rentals: Rental[] = [];
    constructor(readonly name: string) {}
    statement(): string {
        let total = 0, points = 0;
        let result = "Rental record for " + this.name + "|";
        for (const r of this.rentals) {
            let amt = 0;
            switch (r.movie.priceCode) {
                case Movie.REGULAR:
                    amt += 200;
                    if (r.days > 2) amt += (r.days - 2) * 150;
                    break;
                case Movie.NEW_RELEASE:
                    amt += r.days * 300;
                    break;
                case Movie.CHILDREN:
                    amt += 150;
                    if (r.days > 3) amt += (r.days - 3) * 150;
                    break;
            }
            points++;
            if (r.movie.priceCode === Movie.NEW_RELEASE && r.days > 1) points++;
            result += r.movie.title + ":" + amt + "|";
            total += amt;
        }
        return result + "Total " + total + "|Points " + points;
    }
}` },
                { lang: 'cpp', code: `
struct Movie {
    static const int REGULAR = 0, NEW_RELEASE = 1, CHILDREN = 2;
    string title; int priceCode;
    Movie(string t, int p) : title(t), priceCode(p) {}
};
struct Rental { const Movie& movie; int days; Rental(const Movie& m, int d) : movie(m), days(d) {} };
class Customer {
    string name; vector<Rental> rentals;
public:
    Customer(string n) : name(n) {}
    string statement() {
        int total = 0, points = 0;
        string result = "Rental record for " + name + "|";
        for (auto& r : rentals) {
            int amt = 0;
            switch (r.movie.priceCode) {
                case Movie::REGULAR:
                    amt += 200;
                    if (r.days > 2) amt += (r.days - 2) * 150;
                    break;
                case Movie::NEW_RELEASE:
                    amt += r.days * 300;
                    break;
                case Movie::CHILDREN:
                    amt += 150;
                    if (r.days > 3) amt += (r.days - 3) * 150;
                    break;
            }
            points++;
            if (r.movie.priceCode == Movie::NEW_RELEASE && r.days > 1) points++;
            result += r.movie.title + ":" + to_string(amt) + "|";
            total += amt;
        }
        return result + "Total " + to_string(total) + "|Points " + to_string(points);
    }
};` }
              ] }
      },
      mcq: { q: 'Which refactoring should come FIRST in Fowler\'s approach?', options: ['Replace Conditional with Polymorphism immediately', 'Extract Method for the charge calculation, with tests pinning the current output', 'Rewrite statement() as HTML', 'Make priceCode a String'], answer: 1, explain: 'Start with tests, then small safe steps: extract the calculation, move it next to its data, and only then replace the conditional. Big jumps lose behaviour.' },
      hints: [
        `<p>Hint 1: Pin the exact output string with a test. Then Extract Method <code>amountFor(rental)</code> and <code>pointsFor(rental)</code> from the loop body.</p>`,
        `<p>Hint 2: These methods use only rental/movie data → Move Method into <code>Rental</code> (feature envy). Then the switch depends on the price code only → move it into a <code>PriceCode</code> type.</p>`,
        `<p>Hint 3: Make <code>PriceCode</code> an enum with constant-specific methods <code>charge(days)</code> and <code>points(days)</code>. Customer keeps <code>totalCharge()</code>/<code>totalPoints()</code>; <code>statement()</code> only formats. An <code>htmlStatement()</code> reuses the same methods.</p>`
      ],
      tests: { io: true, cases: [{ stdin: '', stdout: "identical output\n<h1>Asha</h1><ul><li>Jaws 350</li><li>Dune 600</li><li>Bluey 300</li></ul><p>Total 1250</p>\nRental record for Ben|Dune:300|Total 300|Points 1\n" }] },
      solution: {
        approach: `<p><b>Sequence of small refactorings</b> (each followed by running the pinned test): (1) Extract Method <code>amountFor</code> / <code>pointsFor</code>; (2) Move Method to <code>Rental</code> (the data lives there); (3) Replace Type Code with an enum <code>PriceCode</code>; (4) Replace Conditional with Polymorphism using constant-specific enum methods — each category owns its charge and points rule; (5) Replace Temp with Query: <code>totalCharge()</code> and <code>totalPoints()</code> on Customer; (6) <code>statement()</code> is now pure formatting, and <code>htmlStatement()</code> reuses the same queries.</p>
<p><b>Result:</b> new category = one new enum constant; new output format = one new formatting method; calculations exist once. The text output is unchanged (verified in <code>main</code>).</p>`,
        code: `enum PriceCode {
    REGULAR {
        int charge(int days) { return 200 + Math.max(0, days - 2) * 150; }
    },
    NEW_RELEASE {
        int charge(int days) { return days * 300; }
        @Override int points(int days) { return days > 1 ? 2 : 1; }
    },
    CHILDREN {
        int charge(int days) { return 150 + Math.max(0, days - 3) * 150; }
    };

    abstract int charge(int days);
    int points(int days) { return 1; }            // default rule, overridden where different
}

record Movie(String title, PriceCode priceCode) {}

record Rental(Movie movie, int days) {
    int charge() { return movie.priceCode().charge(days); }
    int points() { return movie.priceCode().points(days); }
}

class Customer {
    private final String name;
    private final List<Rental> rentals = new ArrayList<>();
    Customer(String name) { this.name = name; }
    void rent(Rental r) { rentals.add(r); }

    int totalCharge() { return rentals.stream().mapToInt(Rental::charge).sum(); }
    int totalPoints() { return rentals.stream().mapToInt(Rental::points).sum(); }

    String statement() {                              // formatting only
        StringBuilder sb = new StringBuilder("Rental record for " + name + "|");
        for (Rental r : rentals) sb.append(r.movie().title()).append(':').append(r.charge()).append('|');
        return sb.append("Total ").append(totalCharge()).append("|Points ").append(totalPoints()).toString();
    }
    String htmlStatement() {                          // new format reuses the same rules
        StringBuilder sb = new StringBuilder("<h1>" + name + "</h1><ul>");
        for (Rental r : rentals) sb.append("<li>").append(r.movie().title()).append(' ').append(r.charge()).append("</li>");
        return sb.append("</ul><p>Total ").append(totalCharge()).append("</p>").toString();
    }
}

class RentalDemo {
    public static void main(String[] args) {
        Customer c = new Customer("Asha");
        c.rent(new Rental(new Movie("Jaws", PriceCode.REGULAR), 3));
        c.rent(new Rental(new Movie("Dune", PriceCode.NEW_RELEASE), 2));
        c.rent(new Rental(new Movie("Bluey", PriceCode.CHILDREN), 4));
        String expected = "Rental record for Asha|Jaws:350|Dune:600|Bluey:300|Total 1250|Points 4";
        System.out.println(c.statement().equals(expected) ? "identical output" : "CHANGED: " + c.statement());
        System.out.println(c.htmlStatement());

        Customer ben = new Customer("Ben");                        // a one-day new release earns only 1 point
        ben.rent(new Rental(new Movie("Dune", PriceCode.NEW_RELEASE), 1));
        System.out.println(ben.statement());
    }
}`,
        alt: [
          { lang: 'python', code: `from dataclasses import dataclass
from enum import Enum
from typing import Callable


@dataclass(frozen=True)
class _Rule:
    charge: Callable[[int], int]
    points: Callable[[int], int] = lambda days: 1  # default rule, overridden where different


class PriceCode(Enum):
    REGULAR = _Rule(lambda days: 200 + max(0, days - 2) * 150)
    NEW_RELEASE = _Rule(lambda days: days * 300, lambda days: 2 if days > 1 else 1)
    CHILDREN = _Rule(lambda days: 150 + max(0, days - 3) * 150)

    def charge(self, days: int) -> int:
        return self.value.charge(days)

    def points(self, days: int) -> int:
        return self.value.points(days)


@dataclass(frozen=True)
class Movie:
    title: str
    price_code: PriceCode


@dataclass(frozen=True)
class Rental:
    movie: Movie
    days: int

    def charge(self) -> int:
        return self.movie.price_code.charge(self.days)

    def points(self) -> int:
        return self.movie.price_code.points(self.days)


class Customer:
    def __init__(self, name: str) -> None:
        self._name = name
        self._rentals: list[Rental] = []

    def rent(self, rental: Rental) -> None:
        self._rentals.append(rental)

    def total_charge(self) -> int:
        return sum(r.charge() for r in self._rentals)

    def total_points(self) -> int:
        return sum(r.points() for r in self._rentals)

    def statement(self) -> str:  # formatting only
        lines = "".join(f"{r.movie.title}:{r.charge()}|" for r in self._rentals)
        return f"Rental record for {self._name}|{lines}Total {self.total_charge()}|Points {self.total_points()}"

    def html_statement(self) -> str:  # new format reuses the same rules
        items = "".join(f"<li>{r.movie.title} {r.charge()}</li>" for r in self._rentals)
        return f"<h1>{self._name}</h1><ul>{items}</ul><p>Total {self.total_charge()}</p>"


if __name__ == "__main__":
    c = Customer("Asha")
    c.rent(Rental(Movie("Jaws", PriceCode.REGULAR), 3))
    c.rent(Rental(Movie("Dune", PriceCode.NEW_RELEASE), 2))
    c.rent(Rental(Movie("Bluey", PriceCode.CHILDREN), 4))
    expected = "Rental record for Asha|Jaws:350|Dune:600|Bluey:300|Total 1250|Points 4"
    print("identical output" if c.statement() == expected else "CHANGED: " + c.statement())
    print(c.html_statement())

    ben = Customer("Ben")  # a one-day new release earns only 1 point
    ben.rent(Rental(Movie("Dune", PriceCode.NEW_RELEASE), 1))
    print(ben.statement())` },
          { lang: 'ts', code: `interface PriceCode {
  charge(days: number): number;
  points(days: number): number;
}

// Each category owns its charge and points rule; points default to 1.
const REGULAR: PriceCode = {
  charge: (days) => 200 + Math.max(0, days - 2) * 150,
  points: () => 1,
};
const NEW_RELEASE: PriceCode = {
  charge: (days) => days * 300,
  points: (days) => (days > 1 ? 2 : 1),
};
const CHILDREN: PriceCode = {
  charge: (days) => 150 + Math.max(0, days - 3) * 150,
  points: () => 1,
};

interface Movie { readonly title: string; readonly priceCode: PriceCode; }

class Rental {
  constructor(readonly movie: Movie, readonly days: number) {}
  charge(): number { return this.movie.priceCode.charge(this.days); }
  points(): number { return this.movie.priceCode.points(this.days); }
}

class Customer {
  private readonly rentals: Rental[] = [];
  constructor(private readonly name: string) {}

  rent(r: Rental): void { this.rentals.push(r); }

  totalCharge(): number { return this.rentals.reduce((s, r) => s + r.charge(), 0); }
  totalPoints(): number { return this.rentals.reduce((s, r) => s + r.points(), 0); }

  statement(): string { // formatting only
    const lines = this.rentals.map((r) => \`\${r.movie.title}:\${r.charge()}|\`).join("");
    return \`Rental record for \${this.name}|\${lines}Total \${this.totalCharge()}|Points \${this.totalPoints()}\`;
  }
  htmlStatement(): string { // new format reuses the same rules
    const items = this.rentals.map((r) => \`<li>\${r.movie.title} \${r.charge()}</li>\`).join("");
    return \`<h1>\${this.name}</h1><ul>\${items}</ul><p>Total \${this.totalCharge()}</p>\`;
  }
}

const c = new Customer("Asha");
c.rent(new Rental({ title: "Jaws", priceCode: REGULAR }, 3));
c.rent(new Rental({ title: "Dune", priceCode: NEW_RELEASE }, 2));
c.rent(new Rental({ title: "Bluey", priceCode: CHILDREN }, 4));
const expected = "Rental record for Asha|Jaws:350|Dune:600|Bluey:300|Total 1250|Points 4";
console.log(c.statement() === expected ? "identical output" : "CHANGED: " + c.statement());
console.log(c.htmlStatement());

const ben = new Customer("Ben"); // a one-day new release earns only 1 point
ben.rent(new Rental({ title: "Dune", priceCode: NEW_RELEASE }, 1));
console.log(ben.statement());` },
          { lang: 'cpp', code: `// Each category owns its charge and points rule; points default to 1.
struct PriceCode {
    function<int(int)> charge;
    function<int(int)> points;
};

const PriceCode REGULAR{[](int days) { return 200 + max(0, days - 2) * 150; }, [](int) { return 1; }};
const PriceCode NEW_RELEASE{[](int days) { return days * 300; }, [](int days) { return days > 1 ? 2 : 1; }};
const PriceCode CHILDREN{[](int days) { return 150 + max(0, days - 3) * 150; }, [](int) { return 1; }};

struct Movie {
    string title;
    const PriceCode* priceCode;
};

struct Rental {
    Movie movie;
    int days;
    int charge() const { return movie.priceCode->charge(days); }
    int points() const { return movie.priceCode->points(days); }
};

class Customer {
    string name_;
    vector<Rental> rentals_;
public:
    explicit Customer(string name) : name_(std::move(name)) {}
    void rent(const Rental& r) { rentals_.push_back(r); }

    int totalCharge() const { int s = 0; for (const Rental& r : rentals_) s += r.charge(); return s; }
    int totalPoints() const { int s = 0; for (const Rental& r : rentals_) s += r.points(); return s; }

    string statement() const {   // formatting only
        string out = "Rental record for " + name_ + "|";
        for (const Rental& r : rentals_) out += r.movie.title + ":" + to_string(r.charge()) + "|";
        return out + "Total " + to_string(totalCharge()) + "|Points " + to_string(totalPoints());
    }
    string htmlStatement() const {   // new format reuses the same rules
        string out = "<h1>" + name_ + "</h1><ul>";
        for (const Rental& r : rentals_) out += "<li>" + r.movie.title + " " + to_string(r.charge()) + "</li>";
        return out + "</ul><p>Total " + to_string(totalCharge()) + "</p>";
    }
};

int main() {
    Customer c("Asha");
    c.rent({{"Jaws", &REGULAR}, 3});
    c.rent({{"Dune", &NEW_RELEASE}, 2});
    c.rent({{"Bluey", &CHILDREN}, 4});
    string expected = "Rental record for Asha|Jaws:350|Dune:600|Bluey:300|Total 1250|Points 4";
    cout << (c.statement() == expected ? "identical output" : "CHANGED: " + c.statement()) << "\\n";
    cout << c.htmlStatement() << "\\n";

    Customer ben("Ben");   // a one-day new release earns only 1 point
    ben.rent({{"Dune", &NEW_RELEASE}, 1});
    cout << ben.statement() << "\\n";
}` }
        ],
        complexity: `<p>Time O(rentals) per statement (totals are recomputed — two passes instead of one, which is fine; cache only if profiling says so). Places to edit for a new category: 3+ → 1.</p>`,
        followUps: ['A movie can change category (new release becomes regular after 3 months). Does the enum design handle it? (yes: priceCode is a field; use a new Movie record or make it mutable)', 'Why not use a closed set of classes (a sealed interface) instead of an enum? (enum is enough when categories carry no per-instance state)', 'How would you test each category in isolation?']
      }
    }]
  });

  /* =====================================================================
     PRACTICE — Easy
     ===================================================================== */
  practice.push({
    title: 'Magic numbers in a parking fee calculator',
    level: 'Easy', tags: ['DRY', 'magic numbers', 'naming'], companies: ['Amazon', 'Zoho'],
    statement: `<p>A parking lot charges ₹50 for the first 2 hours, ₹30 for each extra hour, and never more than ₹500 per day. The numbers <code>50</code>, <code>2</code>, <code>30</code> and <code>500</code> are typed directly in two methods: <code>fee(hours)</code> and <code>estimateText(hours)</code>. Spot the smells and refactor so each tariff value has one named home.</p>`,
    constraints: `Hours are whole numbers ≥ 0 (0 hours costs ₹0). Outputs must not change.`,
    example: `<p><code>fee(1)</code> = ${H.c('g', '50')}, <code>fee(5)</code> = 50 + 3×30 = ${H.c('g', '140')}, <code>fee(20)</code> = min(50 + 18×30, 500) = ${H.c('g', '500')}. <code>estimateText(5)</code> = "About Rs 140 (first 2 h Rs 50)".</p>`,
    brute: {
      why: `<p>The same tariff facts appear in two methods (and in a text string), with nothing explaining what 30 or 500 mean. When the price of the first block changes, someone will update <code>fee</code> and forget the estimate text — customers see one price and pay another.</p>`,
      code: { lang: 'java', code: `class ParkingFees {
    int fee(int hours) {
        if (hours == 0) return 0;
        if (hours <= 2) return 50;
        return Math.min(50 + (hours - 2) * 30, 500);
    }
    String estimateText(int hours) {
        int f = hours == 0 ? 0 : (hours <= 2 ? 50 : Math.min(50 + (hours - 2) * 30, 500));
        return "About Rs " + f + " (first 2 h Rs 50)";
    }
}`, alt: [
              { lang: 'python', code: `
class ParkingFees:
    def fee(self, hours):
        if hours == 0: return 0
        if hours <= 2: return 50
        return min(50 + (hours - 2) * 30, 500)

    def estimate_text(self, hours):
        f = 0 if hours == 0 else (50 if hours <= 2 else min(50 + (hours - 2) * 30, 500))
        return f"About Rs {f} (first 2 h Rs 50)"` },
              { lang: 'ts', code: `
class ParkingFees {
    fee(hours: number): number {
        if (hours === 0) return 0;
        if (hours <= 2) return 50;
        return Math.min(50 + (hours - 2) * 30, 500);
    }
    estimateText(hours: number): string {
        const f = hours === 0 ? 0 : (hours <= 2 ? 50 : Math.min(50 + (hours - 2) * 30, 500));
        return "About Rs " + f + " (first 2 h Rs 50)";
    }
}` },
              { lang: 'cpp', code: `
class ParkingFees {
public:
    int fee(int hours) {
        if (hours == 0) return 0;
        if (hours <= 2) return 50;
        return min(50 + (hours - 2) * 30, 500);
    }
    string estimateText(int hours) {
        int f = hours == 0 ? 0 : (hours <= 2 ? 50 : min(50 + (hours - 2) * 30, 500));
        return "About Rs " + to_string(f) + " (first 2 h Rs 50)";
    }
};` }
            ] }
    },
    mcq: { q: 'Which change removes the duplication of knowledge best?', options: ['Add a comment explaining 50, 2, 30 and 500', 'Named constants in one tariff class, and estimateText() calls fee()', 'Move the numbers to a properties file read in both methods separately', 'Convert ints to doubles'], answer: 1, explain: 'Constants name the facts; making estimateText reuse fee() removes the duplicated formula too.' },
    hints: [
      `<p>Hint 1: There are two kinds of duplication here: repeated <b>numbers</b> and a repeated <b>formula</b>. Fix both.</p>`,
      `<p>Hint 2: Create constants <code>FIRST_BLOCK_HOURS</code>, <code>FIRST_BLOCK_PRICE</code>, <code>EXTRA_HOUR_PRICE</code>, <code>DAILY_CAP</code>.</p>`,
      `<p>Hint 3: <code>estimateText</code> should call <code>fee(hours)</code> and build the text from the constants. Test 0, 2, 3, 5, 20 hours before and after.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "0h -> 0 | About Rs 0 (first 2 h Rs 50)\n1h -> 50 | About Rs 50 (first 2 h Rs 50)\n2h -> 50 | About Rs 50 (first 2 h Rs 50)\n3h -> 80 | About Rs 80 (first 2 h Rs 50)\n5h -> 140 | About Rs 140 (first 2 h Rs 50)\n8h -> 230 | About Rs 230 (first 2 h Rs 50)\n20h -> 500 | About Rs 500 (first 2 h Rs 50)\n" }] },
    solution: {
      approach: `<p><b>Smells:</b> magic numbers + duplicated formula. <b>Refactor:</b> Replace Magic Number with Symbolic Constant, then make <code>estimateText</code> reuse <code>fee</code> (Extract/Reuse Method). Now changing the tariff is one edit and the text can never disagree with the charge.</p>`,
      code: `class ParkingTariff {
    static final int FIRST_BLOCK_HOURS = 2;
    static final int FIRST_BLOCK_PRICE = 50;
    static final int EXTRA_HOUR_PRICE = 30;
    static final int DAILY_CAP = 500;

    int fee(int hours) {
        if (hours == 0) return 0;
        if (hours <= FIRST_BLOCK_HOURS) return FIRST_BLOCK_PRICE;
        int uncapped = FIRST_BLOCK_PRICE + (hours - FIRST_BLOCK_HOURS) * EXTRA_HOUR_PRICE;
        return Math.min(uncapped, DAILY_CAP);
    }

    String estimateText(int hours) {
        return "About Rs " + fee(hours) + " (first " + FIRST_BLOCK_HOURS + " h Rs " + FIRST_BLOCK_PRICE + ")";
    }

    public static void main(String[] args) {
        ParkingTariff t = new ParkingTariff();
        for (int h : new int[]{0, 1, 2, 3, 5, 8, 20}) System.out.println(h + "h -> " + t.fee(h) + " | " + t.estimateText(h));
    }
}`,
      alt: [
        { lang: 'python', code: `class ParkingTariff:
    FIRST_BLOCK_HOURS = 2
    FIRST_BLOCK_PRICE = 50
    EXTRA_HOUR_PRICE = 30
    DAILY_CAP = 500

    def fee(self, hours: int) -> int:
        if hours == 0:
            return 0
        if hours <= self.FIRST_BLOCK_HOURS:
            return self.FIRST_BLOCK_PRICE
        uncapped = self.FIRST_BLOCK_PRICE + (hours - self.FIRST_BLOCK_HOURS) * self.EXTRA_HOUR_PRICE
        return min(uncapped, self.DAILY_CAP)

    def estimate_text(self, hours: int) -> str:
        return f"About Rs {self.fee(hours)} (first {self.FIRST_BLOCK_HOURS} h Rs {self.FIRST_BLOCK_PRICE})"


if __name__ == "__main__":
    t = ParkingTariff()
    for h in (0, 1, 2, 3, 5, 8, 20):
        print(f"{h}h -> {t.fee(h)} | {t.estimate_text(h)}")` },
        { lang: 'ts', code: `class ParkingTariff {
  static readonly FIRST_BLOCK_HOURS = 2;
  static readonly FIRST_BLOCK_PRICE = 50;
  static readonly EXTRA_HOUR_PRICE = 30;
  static readonly DAILY_CAP = 500;

  fee(hours: number): number {
    if (hours === 0) return 0;
    if (hours <= ParkingTariff.FIRST_BLOCK_HOURS) return ParkingTariff.FIRST_BLOCK_PRICE;
    const uncapped = ParkingTariff.FIRST_BLOCK_PRICE + (hours - ParkingTariff.FIRST_BLOCK_HOURS) * ParkingTariff.EXTRA_HOUR_PRICE;
    return Math.min(uncapped, ParkingTariff.DAILY_CAP);
  }

  estimateText(hours: number): string {
    return \`About Rs \${this.fee(hours)} (first \${ParkingTariff.FIRST_BLOCK_HOURS} h Rs \${ParkingTariff.FIRST_BLOCK_PRICE})\`;
  }
}

const t = new ParkingTariff();
for (const h of [0, 1, 2, 3, 5, 8, 20]) console.log(\`\${h}h -> \${t.fee(h)} | \${t.estimateText(h)}\`);` },
        { lang: 'cpp', code: `class ParkingTariff {
public:
    static constexpr int FIRST_BLOCK_HOURS = 2;
    static constexpr int FIRST_BLOCK_PRICE = 50;
    static constexpr int EXTRA_HOUR_PRICE = 30;
    static constexpr int DAILY_CAP = 500;

    int fee(int hours) const {
        if (hours == 0) return 0;
        if (hours <= FIRST_BLOCK_HOURS) return FIRST_BLOCK_PRICE;
        int uncapped = FIRST_BLOCK_PRICE + (hours - FIRST_BLOCK_HOURS) * EXTRA_HOUR_PRICE;
        return min(uncapped, DAILY_CAP);
    }

    string estimateText(int hours) const {
        return "About Rs " + to_string(fee(hours)) + " (first " + to_string(FIRST_BLOCK_HOURS) + " h Rs " + to_string(FIRST_BLOCK_PRICE) + ")";
    }
};

int main() {
    ParkingTariff t;
    for (int h : {0, 1, 2, 3, 5, 8, 20}) cout << h << "h -> " << t.fee(h) << " | " << t.estimateText(h) << "\\n";
}` }
      ],
      complexity: `<p>O(1). Edits per tariff change: up to 4 scattered numbers in 2 methods → 1 constant.</p>`,
      followUps: ['Weekend tariff differs — how do you add it without duplicating fee()? (TariffPolicy strategy)', 'Should the constants live in config? When does that help?']
    }
  });

  practice.push({
    title: 'Decode the cryptic inventory method',
    level: 'Easy', tags: ['naming', 'intention-revealing names'], companies: ['Flipkart', 'Walmart'],
    statement: `<p>Below is <code>List&lt;int[]&gt; getThem(List&lt;int[]&gt; l)</code>. After reading it you realise each <code>int[]</code> is a product: <code>[id, stock, reorderLevel]</code>, and the method returns products that need reordering. Rename and restructure so that a reader understands it <b>without</b> reading the body.</p>`,
    constraints: `Behaviour unchanged: a product needs reordering when stock is <b>below</b> its reorder level. Keep the input order in the output.`,
    example: `<p>Products: (1, stock 5, level 10), (2, 50, 10), (3, 9, 10) → returns products ${H.c('g', '1 and 3')}.</p>`,
    brute: {
      why: `<p>Every name hides meaning: <code>getThem</code>, <code>l</code>, <code>x</code>, <code>x[1] &lt; x[2]</code>. The reader must reverse-engineer what the array slots mean, and anyone can pass <code>[stock, id, level]</code> by mistake because the type system cannot help (primitive obsession).</p>`,
      code: { lang: 'java', code: `class Inv {
    List<int[]> getThem(List<int[]> l) {
        List<int[]> r = new ArrayList<>();
        for (int[] x : l) {
            if (x[1] < x[2]) r.add(x);
        }
        return r;
    }
}`, alt: [
              { lang: 'python', code: `
class Inv:
    def get_them(self, l):
        r = []
        for x in l:
            if x[1] < x[2]:
                r.append(x)
        return r` },
              { lang: 'ts', code: `
class Inv {
    getThem(l: number[][]): number[][] {
        const r: number[][] = [];
        for (const x of l) {
            if (x[1] < x[2]) r.push(x);
        }
        return r;
    }
}` },
              { lang: 'cpp', code: `
class Inv {
public:
    vector<vector<int>> getThem(const vector<vector<int>>& l) {
        vector<vector<int>> r;
        for (auto& x : l) {
            if (x[1] < x[2]) r.push_back(x);
        }
        return r;
    }
};` }
            ] }
    },
    mcq: { q: 'Which name best fits the method?', options: ['getThem', 'process', 'findProductsToReorder', 'filterList'], answer: 2, explain: 'It reveals intent (reorder), the domain object (products) and the kind of operation (find, a query).' },
    hints: [
      `<p>Hint 1: Name the concept hidden in <code>int[]</code>: it is a product with an id, stock and reorder level. A small value type (a Java <code>record</code>, a Python <code>@dataclass</code>, a C++ <code>struct</code>) gives each slot a name.</p>`,
      `<p>Hint 2: Put the question "does this product need reordering?" on the product itself: <code>needsReorder()</code>.</p>`,
      `<p>Hint 3: The method becomes <code>findProductsToReorder(List&lt;Product&gt; products)</code>; a stream filter or loop both read well now.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "reorder 1 (stock 5 < 10)\nreorder 3 (stock 9 < 10)\ncount 2\n" }] },
    solution: {
      approach: `<p><b>Refactor:</b> Replace Array with Object (<code>record Product</code>), Rename Method/variables, and Move the condition into the product (<code>needsReorder</code>). The calling code now reads like the business rule.</p>`,
      code: `record Product(int id, int stock, int reorderLevel) {
    boolean needsReorder() { return stock < reorderLevel; }
}

class Inventory {
    List<Product> findProductsToReorder(List<Product> products) {
        return products.stream().filter(Product::needsReorder).toList();
    }

    public static void main(String[] args) {
        List<Product> all = List.of(new Product(1, 5, 10), new Product(2, 50, 10), new Product(3, 9, 10), new Product(4, 10, 10));
        List<Product> low = new Inventory().findProductsToReorder(all);
        for (Product p : low) System.out.println("reorder " + p.id() + " (stock " + p.stock() + " < " + p.reorderLevel() + ")");
        System.out.println("count " + low.size());   // product 4 sits exactly at its level: not reordered
    }
}`,
      alt: [
        { lang: 'python', code: `from dataclasses import dataclass


@dataclass(frozen=True)
class Product:
    id: int
    stock: int
    reorder_level: int

    def needs_reorder(self) -> bool:
        return self.stock < self.reorder_level


class Inventory:
    def find_products_to_reorder(self, products: list[Product]) -> list[Product]:
        return [p for p in products if p.needs_reorder()]


if __name__ == "__main__":
    all_products = [Product(1, 5, 10), Product(2, 50, 10), Product(3, 9, 10), Product(4, 10, 10)]
    low = Inventory().find_products_to_reorder(all_products)
    for p in low:
        print(f"reorder {p.id} (stock {p.stock} < {p.reorder_level})")
    print(f"count {len(low)}")  # product 4 sits exactly at its level: not reordered` },
        { lang: 'ts', code: `class Product {
  constructor(readonly id: number, readonly stock: number, readonly reorderLevel: number) {}
  needsReorder(): boolean { return this.stock < this.reorderLevel; }
}

class Inventory {
  findProductsToReorder(products: readonly Product[]): Product[] {
    return products.filter((p) => p.needsReorder());
  }
}

const all = [new Product(1, 5, 10), new Product(2, 50, 10), new Product(3, 9, 10), new Product(4, 10, 10)];
const low = new Inventory().findProductsToReorder(all);
for (const p of low) console.log(\`reorder \${p.id} (stock \${p.stock} < \${p.reorderLevel})\`);
console.log(\`count \${low.length}\`); // product 4 sits exactly at its level: not reordered` },
        { lang: 'cpp', code: `struct Product {
    int id;
    int stock;
    int reorderLevel;
    bool needsReorder() const { return stock < reorderLevel; }
};

class Inventory {
public:
    vector<Product> findProductsToReorder(const vector<Product>& products) const {
        vector<Product> low;
        copy_if(products.begin(), products.end(), back_inserter(low), [](const Product& p) { return p.needsReorder(); });
        return low;
    }
};

int main() {
    vector<Product> all{{1, 5, 10}, {2, 50, 10}, {3, 9, 10}, {4, 10, 10}};
    vector<Product> low = Inventory().findProductsToReorder(all);
    for (const Product& p : low) cout << "reorder " << p.id << " (stock " << p.stock << " < " << p.reorderLevel << ")\\n";
    cout << "count " << low.size() << "\\n";   // product 4 sits exactly at its level: not reordered
}` }
      ],
      complexity: `<p>O(n) time, O(k) output. Reading time: from "decode the array slots" to "read one line".</p>`,
      followUps: ['Where would a per-warehouse stock count go?', 'Why is a small value type (record, dataclass, struct) better than a class with public fields here?']
    }
  });

  practice.push({
    title: 'Remove the flag argument from export()',
    level: 'Easy', tags: ['flag argument', 'control coupling', 'small functions'], companies: ['SAP', 'Oracle'],
    statement: `<p><code>String export(List&lt;String&gt; rows, boolean b)</code> returns CSV when <code>b</code> is true and JSON otherwise. Callers write <code>export(rows, true)</code>, which nobody can read. Refactor to remove the control coupling while keeping both formats.</p>`,
    constraints: `CSV = rows joined by commas. JSON = rows as a JSON array of strings (no escaping needed for this exercise). Same outputs as before.`,
    example: `<p>rows = [a, b] → CSV ${H.c('g', '"a,b"')}, JSON ${H.c('g', '["a","b"]')}. Call sites become <code>exporter.toCsv(rows)</code> instead of <code>export(rows, true)</code>.</p>`,
    brute: {
      why: `<p>A boolean parameter means the method does two different things, and the caller has to know which value selects which branch (control coupling). Adding XML would make it a tri-state flag or a second boolean — even worse.</p>`,
      code: { lang: 'java', code: `class Exporter {
    String export(List<String> rows, boolean b) {
        if (b) {
            return String.join(",", rows);
        } else {
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < rows.size(); i++) {
                if (i > 0) sb.append(',');
                sb.append('"').append(rows.get(i)).append('"');
            }
            return sb.append(']').toString();
        }
    }
}`, alt: [
              { lang: 'python', code: `
class Exporter:
    def export(self, rows, b):
        if b:
            return ",".join(rows)
        else:
            parts = []
            for row in rows:
                parts.append('"' + row + '"')
            return "[" + ",".join(parts) + "]"` },
              { lang: 'ts', code: `
class Exporter {
    export(rows: string[], b: boolean): string {
        if (b) {
            return rows.join(",");
        } else {
            let sb = "[";
            for (let i = 0; i < rows.length; i++) {
                if (i > 0) sb += ",";
                sb += '"' + rows[i] + '"';
            }
            return sb + "]";
        }
    }
}` },
              { lang: 'cpp', code: `
class Exporter {
public:
    string exportRows(const vector<string>& rows, bool b) {
        if (b) {
            string s;
            for (size_t i = 0; i < rows.size(); i++) s += (i ? "," : "") + rows[i];
            return s;
        } else {
            string sb = "[";
            for (size_t i = 0; i < rows.size(); i++) {
                if (i > 0) sb += ',';
                sb += '"' + rows[i] + '"';
            }
            return sb + "]";
        }
    }
};` }
            ] }
    },
    mcq: { q: 'What is the simplest fix that meets today\'s requirement?', options: ['Replace boolean with an int 0/1', 'Two intention-revealing methods: toCsv and toJson', 'A plug-in system of formatters loaded by reflection', 'Add a comment at each call site'], answer: 1, explain: 'Two methods remove the flag with the least machinery (KISS). If formats multiply, an interface can come later.' },
    hints: [
      `<p>Hint 1: Each branch of the <code>if (b)</code> is a separate job. Give each its own method with a name that says the format.</p>`,
      `<p>Hint 2: Keep the old method temporarily delegating to the new ones (so callers can migrate), then delete it — the Parallel Change technique.</p>`,
      `<p>Hint 3: If many formats appear later, introduce <code>interface RowFormat { String format(List&lt;String&gt; rows); }</code>. Not needed yet (YAGNI).</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "csv=a,b json=[\"a\",\"b\"]\ncsv= json=[]\nbridge ok\n" }] },
    solution: {
      approach: `<p><b>Refactor:</b> Remove Flag Argument (Fowler) → <code>toCsv</code> and <code>toJson</code>. During migration the old <code>export</code> is marked <code>@Deprecated</code> and delegates, so callers can move one by one; then it is deleted.</p>`,
      code: `class Exporter {
    String toCsv(List<String> rows) {
        return String.join(",", rows);
    }

    String toJson(List<String> rows) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < rows.size(); i++) {
            if (i > 0) sb.append(',');
            sb.append('"').append(rows.get(i)).append('"');
        }
        return sb.append(']').toString();
    }

    /** Temporary bridge for old callers; delete once all call sites use toCsv/toJson. */
    @Deprecated
    String export(List<String> rows, boolean csv) {
        return csv ? toCsv(rows) : toJson(rows);
    }

    public static void main(String[] args) {
        Exporter e = new Exporter();
        List<String> rows = List.of("a", "b");
        System.out.println("csv=" + e.toCsv(rows) + " json=" + e.toJson(rows));
        System.out.println("csv=" + e.toCsv(List.of()) + " json=" + e.toJson(List.of()));   // empty input
        System.out.println(e.export(rows, true).equals(e.toCsv(rows)) && e.export(rows, false).equals(e.toJson(rows)) ? "bridge ok" : "bridge broken");
    }
}`,
      alt: [
        { lang: 'python', code: `import warnings


class Exporter:
    def to_csv(self, rows: list[str]) -> str:
        return ",".join(rows)

    def to_json(self, rows: list[str]) -> str:
        return "[" + ",".join(f'"{r}"' for r in rows) + "]"

    def export(self, rows: list[str], csv: bool) -> str:
        """Temporary bridge for old callers; delete once all call sites use to_csv/to_json."""
        warnings.warn("export() is deprecated: use to_csv or to_json", DeprecationWarning, stacklevel=2)
        return self.to_csv(rows) if csv else self.to_json(rows)


if __name__ == "__main__":
    e = Exporter()
    rows = ["a", "b"]
    print(f"csv={e.to_csv(rows)} json={e.to_json(rows)}")
    print(f"csv={e.to_csv([])} json={e.to_json([])}")  # empty input
    ok = e.export(rows, True) == e.to_csv(rows) and e.export(rows, False) == e.to_json(rows)
    print("bridge ok" if ok else "bridge broken")` },
        { lang: 'ts', code: `class Exporter {
  toCsv(rows: readonly string[]): string {
    return rows.join(",");
  }

  toJson(rows: readonly string[]): string {
    return "[" + rows.map((r) => \`"\${r}"\`).join(",") + "]";
  }

  /** @deprecated Temporary bridge for old callers; delete once all call sites use toCsv/toJson. */
  export(rows: readonly string[], csv: boolean): string {
    return csv ? this.toCsv(rows) : this.toJson(rows);
  }
}

const e = new Exporter();
const rows = ["a", "b"];
console.log(\`csv=\${e.toCsv(rows)} json=\${e.toJson(rows)}\`);
console.log(\`csv=\${e.toCsv([])} json=\${e.toJson([])}\`); // empty input
const ok = e.export(rows, true) === e.toCsv(rows) && e.export(rows, false) === e.toJson(rows);
console.log(ok ? "bridge ok" : "bridge broken");` },
        { lang: 'cpp', code: `class Exporter {
public:
    string toCsv(const vector<string>& rows) const {
        string out;
        for (size_t i = 0; i < rows.size(); i++) out += (i ? "," : "") + rows[i];
        return out;
    }

    string toJson(const vector<string>& rows) const {
        string out = "[";
        for (size_t i = 0; i < rows.size(); i++) out += string(i ? "," : "") + "\\"" + rows[i] + "\\"";
        return out + "]";
    }

    // Temporary bridge for old callers (named exportRows because export is a C++20 keyword).
    [[deprecated("use toCsv or toJson")]]
    string exportRows(const vector<string>& rows, bool csv) const { return csv ? toCsv(rows) : toJson(rows); }
};

int main() {
    Exporter e;
    vector<string> rows{"a", "b"};
    cout << "csv=" << e.toCsv(rows) << " json=" << e.toJson(rows) << "\\n";
    cout << "csv=" << e.toCsv({}) << " json=" << e.toJson({}) << "\\n";   // empty input
    bool ok = e.exportRows(rows, true) == e.toCsv(rows) && e.exportRows(rows, false) == e.toJson(rows);
    cout << (ok ? "bridge ok" : "bridge broken") << "\\n";
}` }
      ],
      complexity: `<p>O(total characters) for both formats, unchanged. Call-site readability: <code>export(rows, true)</code> → <code>toCsv(rows)</code>.</p>`,
      followUps: ['When would you introduce a RowFormat interface instead?', 'How do you find and migrate all callers safely? (IDE find usages, deprecation warnings)']
    }
  });

  practice.push({
    title: 'Delete the speculative generality',
    level: 'Easy', tags: ['YAGNI', 'dead code', 'KISS'], companies: ['Atlassian', 'Freshworks'],
    statement: `<p>A tip calculator was built "for the future": an abstract base class with one subclass, a factory with one product, an unused <code>currency</code> parameter, and a method <code>tipForGroups</code> that nothing calls. The only requirement: <i>tip = bill × percent / 100, rounded down</i>. Simplify it.</p>`,
    constraints: `Keep <code>tip(bill, percent)</code> behaviour. Bill and percent are non-negative ints. Remove everything not needed by the requirement.`,
    example: `<p><code>tip(1000, 15)</code> = ${H.c('g', '150')}; <code>tip(999, 10)</code> = ${H.c('g', '99')}. ${H.c('r', 'Before:')} 4 types and 3 unused members. ${H.c('g', 'After:')} 1 small class.</p>`,
    brute: {
      why: `<p>Four types for one multiplication. Readers must check whether <code>currency</code> matters (it does not), whether <code>tipForGroups</code> is used somewhere (it is not), and which subclass the factory returns. All of this is cost of carry with zero benefit.</p>`,
      code: { lang: 'java', code: `abstract class AbstractTipCalculator {
    abstract int tip(int bill, int percent, String currency);
    int tipForGroups(int bill, int percent, int people) { return tip(bill, percent, "INR") / people; }
}
class StandardTipCalculator extends AbstractTipCalculator {
    int tip(int bill, int percent, String currency) { return bill * percent / 100; }
}
interface TipCalculatorFactory { AbstractTipCalculator create(); }
class DefaultTipCalculatorFactory implements TipCalculatorFactory {
    public AbstractTipCalculator create() { return new StandardTipCalculator(); }
}`, alt: [
              { lang: 'python', code: `
from abc import ABC, abstractmethod

class AbstractTipCalculator(ABC):
    @abstractmethod
    def tip(self, bill, percent, currency): pass
    def tip_for_groups(self, bill, percent, people): return self.tip(bill, percent, "INR") // people

class StandardTipCalculator(AbstractTipCalculator):
    def tip(self, bill, percent, currency): return bill * percent // 100

class TipCalculatorFactory(ABC):
    @abstractmethod
    def create(self): pass

class DefaultTipCalculatorFactory(TipCalculatorFactory):
    def create(self): return StandardTipCalculator()` },
              { lang: 'ts', code: `
abstract class AbstractTipCalculator {
    abstract tip(bill: number, percent: number, currency: string): number;
    tipForGroups(bill: number, percent: number, people: number): number { return Math.floor(this.tip(bill, percent, "INR") / people); }
}
class StandardTipCalculator extends AbstractTipCalculator {
    tip(bill: number, percent: number, currency: string): number { return Math.floor(bill * percent / 100); }
}
interface TipCalculatorFactory { create(): AbstractTipCalculator; }
class DefaultTipCalculatorFactory implements TipCalculatorFactory {
    create(): AbstractTipCalculator { return new StandardTipCalculator(); }
}` },
              { lang: 'cpp', code: `
struct AbstractTipCalculator {
    virtual int tip(int bill, int percent, const string& currency) = 0;
    int tipForGroups(int bill, int percent, int people) { return tip(bill, percent, "INR") / people; }
    virtual ~AbstractTipCalculator() = default;
};
struct StandardTipCalculator : AbstractTipCalculator {
    int tip(int bill, int percent, const string& currency) override { return bill * percent / 100; }
};
struct TipCalculatorFactory { virtual unique_ptr<AbstractTipCalculator> create() = 0; virtual ~TipCalculatorFactory() = default; };
struct DefaultTipCalculatorFactory : TipCalculatorFactory {
    unique_ptr<AbstractTipCalculator> create() override { return make_unique<StandardTipCalculator>(); }
};` }
            ] }
    },
    mcq: { q: 'Which refactorings apply here?', options: ['Collapse Hierarchy, Remove Parameter, Remove Dead Code, Inline Class', 'Extract Interface and Pull Up Method', 'Introduce Parameter Object', 'Replace Conditional with Polymorphism'], answer: 0, explain: 'These are the standard cures for speculative generality: fold the one-subclass hierarchy, drop unused parameters and methods, inline the pointless factory.' },
    hints: [
      `<p>Hint 1: For every type and member ask "who calls this today?" Use the IDE's Find Usages.</p>`,
      `<p>Hint 2: Abstract class with one subclass → Collapse Hierarchy. Factory with one product and no test need → Inline. Unused parameter → Remove Parameter.</p>`,
      `<p>Hint 3: Keep one class <code>TipCalculator</code> with <code>int tip(int bill, int percent)</code>. Guard against negative input if you like, and test the rounding-down case.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "150 99\nrejected: bill and percent must be >= 0\n" }] },
    solution: {
      approach: `<p><b>Smell:</b> Speculative Generality + Dead Code. <b>Refactor:</b> Collapse Hierarchy, Inline Class (factory), Remove Parameter (currency), Remove Dead Code (tipForGroups). Version control remembers the deleted code if it is ever needed — deleting is safe.</p>`,
      code: `class TipCalculator {
    int tip(int bill, int percent) {
        if (bill < 0 || percent < 0) throw new IllegalArgumentException("bill and percent must be >= 0");
        return bill * percent / 100;   // integer division rounds down, as required
    }

    public static void main(String[] args) {
        TipCalculator calc = new TipCalculator();
        System.out.println(calc.tip(1000, 15) + " " + calc.tip(999, 10));   // 150 99
        try {
            calc.tip(-5, 10);
        } catch (IllegalArgumentException e) {
            System.out.println("rejected: " + e.getMessage());
        }
    }
}`,
      alt: [
        { lang: 'python', code: `class TipCalculator:
    def tip(self, bill: int, percent: int) -> int:
        if bill < 0 or percent < 0:
            raise ValueError("bill and percent must be >= 0")
        return bill * percent // 100  # floor division rounds down, as required


if __name__ == "__main__":
    calc = TipCalculator()
    print(calc.tip(1000, 15), calc.tip(999, 10))  # 150 99
    try:
        calc.tip(-5, 10)
    except ValueError as e:
        print(f"rejected: {e}")` },
        { lang: 'ts', code: `class TipCalculator {
  tip(bill: number, percent: number): number {
    if (bill < 0 || percent < 0) throw new RangeError("bill and percent must be >= 0");
    return Math.floor((bill * percent) / 100); // rounds down, as required
  }
}

const calc = new TipCalculator();
console.log(\`\${calc.tip(1000, 15)} \${calc.tip(999, 10)}\`); // 150 99
try {
  calc.tip(-5, 10);
} catch (e) {
  console.log(\`rejected: \${(e as Error).message}\`);
}` },
        { lang: 'cpp', code: `class TipCalculator {
public:
    int tip(int bill, int percent) const {
        if (bill < 0 || percent < 0) throw invalid_argument("bill and percent must be >= 0");
        return bill * percent / 100;   // integer division rounds down for non-negative values, as required
    }
};

int main() {
    TipCalculator calc;
    cout << calc.tip(1000, 15) << " " << calc.tip(999, 10) << "\\n";   // 150 99
    try {
        calc.tip(-5, 10);
    } catch (const invalid_argument& e) {
        cout << "rejected: " << e.what() << "\\n";
    }
}` }
      ],
      complexity: `<p>O(1). Types 4 → 1, members 5 → 1.</p>`,
      followUps: ['Splitting the bill among people is now requested — where does it go?', 'How do you convince a teammate that deleting "future" code is safe? (git history, YAGNI costs)']
    }
  });

  /* =====================================================================
     PRACTICE — Medium
     ===================================================================== */
  practice.push({
    title: 'Primitive obsession: money and phone numbers as Strings',
    level: 'Medium', tags: ['primitive obsession', 'value object', 'records'], companies: ['PhonePe', 'Stripe'],
    statement: `<p>A wallet service stores amounts as <code>double</code> and phone numbers as raw <code>String</code>s. Bugs seen in production: <code>0.1 + 0.2</code> balances, a transfer that added INR to USD, and phone numbers saved as "98 765-43210" and "+919876543210" (same person, two accounts). Introduce value objects so these bugs become impossible to write.</p>`,
    constraints: `Money: amount in minor units (paise/cents, <code>long</code>) + currency code; adding different currencies must fail. Phone: normalised to "+91" followed by 10 digits; reject anything else. Value objects must be immutable and compare by value.`,
    example: `<p><code>Phone.of("98765 43210")</code> and <code>Phone.of("+91-98765-43210")</code> are ${H.c('g', 'equal')}. <code>Money(10, "INR").plus(Money(20, "INR"))</code> = ${H.c('g', 'Money(30, INR)')}; adding <code>Money(5, "USD")</code> throws ${H.c('r', 'IllegalArgumentException')}.</p>`,
    brute: {
      why: `<p>Primitives carry no rules. Every method that touches money must remember to round and to check currency; every method that touches phones must remember to normalise. Somebody always forgets. Validation is duplicated everywhere (DRY) and the type system cannot tell a phone from a name — both are <code>String</code>.</p>`,
      code: { lang: 'java', code: `class WalletService {
    final Map<String, Double> balances = new HashMap<>();   // phone -> balance
    void deposit(String phone, double amount, String currency) {
        // currency silently ignored; phone not normalised; double rounding errors
        balances.merge(phone, amount, Double::sum);
    }
    public static void main(String[] args) {
        WalletService w = new WalletService();
        w.deposit("98765 43210", 0.1, "INR");
        w.deposit("98765 43210", 0.2, "INR");
        w.deposit("+919876543210", 5, "USD");     // same person, different key, wrong currency
        System.out.println(w.balances);           // {98765 43210=0.30000000000000004, +919876543210=5.0}
    }
}`, alt: [
              { lang: 'python', code: `
class WalletService:
    def __init__(self):
        self.balances = {}   # phone -> balance
    def deposit(self, phone, amount, currency):
        # currency silently ignored; phone not normalised; float rounding errors
        self.balances[phone] = self.balances.get(phone, 0) + amount

w = WalletService()
w.deposit("98765 43210", 0.1, "INR")
w.deposit("98765 43210", 0.2, "INR")
w.deposit("+919876543210", 5, "USD")     # same person, different key, wrong currency
print(w.balances)           # {'98765 43210': 0.30000000000000004, '+919876543210': 5}` },
              { lang: 'ts', code: `
class WalletService {
    readonly balances = new Map<string, number>();   // phone -> balance
    deposit(phone: string, amount: number, currency: string): void {
        // currency silently ignored; phone not normalised; number rounding errors
        this.balances.set(phone, (this.balances.get(phone) ?? 0) + amount);
    }
}
const w = new WalletService();
w.deposit("98765 43210", 0.1, "INR");
w.deposit("98765 43210", 0.2, "INR");
w.deposit("+919876543210", 5, "USD");     // same person, different key, wrong currency
console.log(w.balances);           // Map { '98765 43210' => 0.30000000000000004, '+919876543210' => 5 }` },
              { lang: 'cpp', code: `
class WalletService {
public:
    unordered_map<string, double> balances;   // phone -> balance
    void deposit(const string& phone, double amount, const string& currency) {
        // currency silently ignored; phone not normalised; double rounding errors
        balances[phone] += amount;
    }
};
int main() {
    WalletService w;
    w.deposit("98765 43210", 0.1, "INR");
    w.deposit("98765 43210", 0.2, "INR");
    w.deposit("+919876543210", 5, "USD");     // same person, different key, wrong currency
    for (auto& [k, v] : w.balances) cout << k << "=" << v << "\\n";   // 98765 43210=0.3 (0.1 + 0.2 drifts), +919876543210=5
}` }
            ] }
    },
    mcq: { q: 'Where should phone-number normalisation live?', options: ['In every controller that accepts a phone', 'In a Phone value object\'s factory method, so an invalid Phone cannot exist', 'In a database trigger only', 'In a static StringUtils class'], answer: 1, explain: 'A value object validates once at construction; afterwards every Phone in the system is valid by definition ("parse, don\'t validate").' },
    hints: [
      `<p>Hint 1: Make each concept a type: <code>record Money(long minor, String currency)</code>, <code>record Phone(String e164)</code>.</p>`,
      `<p>Hint 2: Put rules in compact constructors / static factories: Phone strips non-digits, handles optional 91 prefix, checks 10 digits; Money rejects negative and mismatched currency in <code>plus</code>.</p>`,
      `<p>Hint 3: Change the service signature to <code>deposit(Phone, Money)</code>. Records give value-based <code>equals/hashCode</code>, so Phone works as a map key. Keep one currency per wallet and check it.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "30 INR\ntrue\nrejected: INR + USD\nrejected: bad phone: +9112345\nrejected: negative amount\n" }] },
    solution: {
      approach: `<p><b>Refactor:</b> Replace Primitive with Object. <code>Money</code> uses integer minor units (no floating-point error) and refuses mixed currencies. <code>Phone</code> normalises in a static factory and validates in the compact constructor, so every <code>Phone</code> instance is valid ("parse, don't validate"). The service now takes types that make the old bugs impossible to express, and validation lives in one place each.</p>`,
      code: `record Money(long minor, String currency) {
    Money {
        Objects.requireNonNull(currency, "currency");
        if (minor < 0) throw new IllegalArgumentException("negative amount");
    }
    Money plus(Money o) {
        if (!currency.equals(o.currency)) throw new IllegalArgumentException(currency + " + " + o.currency);
        return new Money(Math.addExact(minor, o.minor), currency);
    }
}

record Phone(String e164) {
    Phone {
        if (!e164.matches("[+]91[0-9]{10}")) throw new IllegalArgumentException("bad phone: " + e164);
    }
    static Phone of(String raw) {
        String digits = raw.replaceAll("[^0-9]", "");
        if (digits.length() == 12 && digits.startsWith("91")) digits = digits.substring(2);
        return new Phone("+91" + digits);
    }
}

class WalletService {
    private final Map<Phone, Money> balances = new HashMap<>();
    void deposit(Phone phone, Money amount) {
        balances.merge(phone, amount, Money::plus);   // plus() enforces same currency
    }
    Money balance(Phone phone) { return balances.getOrDefault(phone, new Money(0, "INR")); }

    public static void main(String[] args) {
        WalletService w = new WalletService();
        w.deposit(Phone.of("98765 43210"), new Money(10, "INR"));
        w.deposit(Phone.of("+91-98765-43210"), new Money(20, "INR"));
        Money total = w.balance(Phone.of("9876543210"));
        System.out.println(total.minor() + " " + total.currency());                       // 30 INR
        System.out.println(Phone.of("98765 43210").equals(Phone.of("+91-98765-43210")));   // true: same value, same account
        try {
            w.deposit(Phone.of("9876543210"), new Money(5, "USD"));
        } catch (IllegalArgumentException e) {
            System.out.println("rejected: " + e.getMessage());
        }
        try {
            Phone.of("12345");
        } catch (IllegalArgumentException e) {
            System.out.println("rejected: " + e.getMessage());
        }
        try {
            new Money(-1, "INR");
        } catch (IllegalArgumentException e) {
            System.out.println("rejected: " + e.getMessage());
        }
    }
}`,
      alt: [
        { lang: 'python', code: `import re
from dataclasses import dataclass


@dataclass(frozen=True)
class Money:
    minor: int
    currency: str

    def __post_init__(self) -> None:
        if self.minor < 0:
            raise ValueError("negative amount")

    def plus(self, other: "Money") -> "Money":
        if self.currency != other.currency:
            raise ValueError(f"{self.currency} + {other.currency}")
        return Money(self.minor + other.minor, self.currency)


@dataclass(frozen=True)
class Phone:
    e164: str

    def __post_init__(self) -> None:
        if not re.fullmatch(r"[+]91[0-9]{10}", self.e164):
            raise ValueError(f"bad phone: {self.e164}")

    @staticmethod
    def of(raw: str) -> "Phone":
        digits = re.sub(r"[^0-9]", "", raw)
        if len(digits) == 12 and digits.startswith("91"):
            digits = digits[2:]
        return Phone("+91" + digits)


class WalletService:
    def __init__(self) -> None:
        self._balances: dict[Phone, Money] = {}  # frozen dataclass: __eq__ and __hash__ make Phone a safe key

    def deposit(self, phone: Phone, amount: Money) -> None:
        current = self._balances.get(phone)
        self._balances[phone] = amount if current is None else current.plus(amount)  # plus() enforces same currency

    def balance(self, phone: Phone) -> Money:
        return self._balances.get(phone, Money(0, "INR"))


if __name__ == "__main__":
    w = WalletService()
    w.deposit(Phone.of("98765 43210"), Money(10, "INR"))
    w.deposit(Phone.of("+91-98765-43210"), Money(20, "INR"))
    total = w.balance(Phone.of("9876543210"))
    print(f"{total.minor} {total.currency}")  # 30 INR
    print(str(Phone.of("98765 43210") == Phone.of("+91-98765-43210")).lower())  # true: same value, same account
    for action in (
        lambda: w.deposit(Phone.of("9876543210"), Money(5, "USD")),
        lambda: Phone.of("12345"),
        lambda: Money(-1, "INR"),
    ):
        try:
            action()
        except ValueError as e:
            print(f"rejected: {e}")` },
        { lang: 'ts', code: `class Money {
  constructor(readonly minor: number, readonly currency: string) {
    if (minor < 0) throw new RangeError("negative amount");
  }
  plus(o: Money): Money {
    if (this.currency !== o.currency) throw new TypeError(\`\${this.currency} + \${o.currency}\`);
    const sum = this.minor + o.minor;
    if (!Number.isSafeInteger(sum)) throw new RangeError("integer overflow");
    return new Money(sum, this.currency);
  }
}

class Phone {
  private constructor(readonly e164: string) {
    if (!/^[+]91[0-9]{10}$/.test(e164)) throw new RangeError(\`bad phone: \${e164}\`);
  }
  static of(raw: string): Phone {
    let digits = raw.replace(/[^0-9]/g, "");
    if (digits.length === 12 && digits.startsWith("91")) digits = digits.substring(2);
    return new Phone("+91" + digits);
  }
  equals(o: Phone): boolean { return this.e164 === o.e164; }
}

class WalletService {
  private readonly balances = new Map<string, Money>(); // objects compare by identity, so key by the e164 string

  deposit(phone: Phone, amount: Money): void {
    const current = this.balances.get(phone.e164);
    this.balances.set(phone.e164, current === undefined ? amount : current.plus(amount)); // plus() enforces same currency
  }
  balance(phone: Phone): Money { return this.balances.get(phone.e164) ?? new Money(0, "INR"); }
}

const w = new WalletService();
w.deposit(Phone.of("98765 43210"), new Money(10, "INR"));
w.deposit(Phone.of("+91-98765-43210"), new Money(20, "INR"));
const total = w.balance(Phone.of("9876543210"));
console.log(\`\${total.minor} \${total.currency}\`); // 30 INR
console.log(Phone.of("98765 43210").equals(Phone.of("+91-98765-43210"))); // true: same value, same account
const attempts: Array<() => void> = [
  () => w.deposit(Phone.of("9876543210"), new Money(5, "USD")),
  () => { Phone.of("12345"); },
  () => { new Money(-1, "INR"); },
];
for (const attempt of attempts) {
  try {
    attempt();
  } catch (e) {
    console.log(\`rejected: \${(e as Error).message}\`);
  }
}` },
        { lang: 'cpp', code: `class Money {
    long long minor_;
    string currency_;
public:
    Money(long long minor, string currency) : minor_(minor), currency_(std::move(currency)) {
        if (minor_ < 0) throw invalid_argument("negative amount");
    }
    long long minor() const { return minor_; }
    const string& currency() const { return currency_; }
    Money plus(const Money& o) const {
        if (currency_ != o.currency_) throw invalid_argument(currency_ + " + " + o.currency_);
        long long sum;
        if (__builtin_add_overflow(minor_, o.minor_, &sum)) throw overflow_error("integer overflow");
        return Money(sum, currency_);
    }
};

class Phone {
    string e164_;
    explicit Phone(string e164) : e164_(std::move(e164)) {
        if (!regex_match(e164_, regex("[+]91[0-9]{10}"))) throw invalid_argument("bad phone: " + e164_);
    }
public:
    static Phone of(const string& raw) {
        string digits;
        for (char ch : raw) if (isdigit(static_cast<unsigned char>(ch))) digits += ch;
        if (digits.size() == 12 && digits.rfind("91", 0) == 0) digits = digits.substr(2);
        return Phone("+91" + digits);
    }
    const string& e164() const { return e164_; }
    auto operator<=>(const Phone&) const = default;   // value equality and ordering: usable as a map key
};

class WalletService {
    map<Phone, Money> balances_;
public:
    void deposit(const Phone& phone, const Money& amount) {
        auto it = balances_.find(phone);
        if (it == balances_.end()) balances_.emplace(phone, amount);
        else it->second = it->second.plus(amount);   // plus() enforces same currency
    }
    Money balance(const Phone& phone) const {
        auto it = balances_.find(phone);
        return it == balances_.end() ? Money(0, "INR") : it->second;
    }
};

int main() {
    WalletService w;
    w.deposit(Phone::of("98765 43210"), Money(10, "INR"));
    w.deposit(Phone::of("+91-98765-43210"), Money(20, "INR"));
    Money total = w.balance(Phone::of("9876543210"));
    cout << total.minor() << " " << total.currency() << "\\n";   // 30 INR
    cout << boolalpha << (Phone::of("98765 43210") == Phone::of("+91-98765-43210")) << "\\n";   // true: same value, same account
    vector<function<void()>> attempts{
        [&] { w.deposit(Phone::of("9876543210"), Money(5, "USD")); },
        [] { Phone::of("12345"); },
        [] { Money(-1, "INR"); },
    };
    for (auto& attempt : attempts) {
        try {
            attempt();
        } catch (const exception& e) {
            cout << "rejected: " << e.what() << "\\n";
        }
    }
}` }
      ],
      complexity: `<p>Same O(1) per deposit. Validation sites: every caller → one constructor per concept. Classes: +2 tiny records.</p>`,
      followUps: ['Why long minor units instead of BigDecimal? When would you choose BigDecimal? (fractional rates, interest)', 'How would you support multiple currencies per wallet? (Map&lt;Currency, Money&gt;)', 'What does "parse, don\'t validate" mean?']
    }
  });

  practice.push({
    title: 'Data clump: address passed as four Strings',
    level: 'Medium', tags: ['data clumps', 'parameter object', 'long parameter list'], companies: ['Swiggy', 'Zomato'],
    statement: `<p>Delivery code passes <code>(String line1, String city, String state, String pin)</code> into <code>quote</code>, <code>validate</code>, <code>label</code> and <code>zone</code> — often in different orders. A bug shipped where <code>city</code> and <code>state</code> were swapped. Introduce a parameter object and give it the behaviour that belongs to it.</p>`,
    constraints: `PIN must be 6 digits. Zone = first digit of the PIN ("1".."9"). Label format: "line1, city, state - pin". Delivery quote: ₹30 for zone 4, ₹60 otherwise.`,
    example: `<p>Address("12 MG Road", "Pune", "MH", "411001") → zone ${H.c('g', '4')}, quote ${H.c('g', '30')}, label ${H.c('g', '"12 MG Road, Pune, MH - 411001"')}.</p>`,
    brute: {
      why: `<p>Four strings always travel together — a <b>data clump</b>. Because they are the same type, the compiler cannot catch swapped arguments. The PIN validation and zone logic are re-done in each method (duplication), and every new method grows the parameter list again.</p>`,
      code: { lang: 'java', code: `class Delivery {
    boolean validate(String line1, String city, String state, String pin) {
        return pin != null && pin.matches("[0-9]{6}") && !city.isBlank();
    }
    String zone(String line1, String city, String state, String pin) { return pin.substring(0, 1); }
    int quote(String line1, String city, String state, String pin) {
        return pin.substring(0, 1).equals("4") ? 30 : 60;        // zone logic duplicated
    }
    String label(String line1, String state, String city, String pin) {   // order differs!
        return line1 + ", " + city + ", " + state + " - " + pin;
    }
}`, alt: [
              { lang: 'python', code: `
import re

class Delivery:
    def validate(self, line1, city, state, pin):
        return pin is not None and re.fullmatch(r"[0-9]{6}", pin) is not None and city.strip() != ""
    def zone(self, line1, city, state, pin): return pin[0:1]
    def quote(self, line1, city, state, pin):
        return 30 if pin[0:1] == "4" else 60        # zone logic duplicated
    def label(self, line1, state, city, pin):   # order differs!
        return line1 + ", " + city + ", " + state + " - " + pin` },
              { lang: 'ts', code: `
class Delivery {
    validate(line1: string, city: string, state: string, pin: string | null): boolean {
        return pin !== null && /^[0-9]{6}$/.test(pin) && city.trim() !== "";
    }
    zone(line1: string, city: string, state: string, pin: string): string { return pin.substring(0, 1); }
    quote(line1: string, city: string, state: string, pin: string): number {
        return pin.substring(0, 1) === "4" ? 30 : 60;        // zone logic duplicated
    }
    label(line1: string, state: string, city: string, pin: string): string {   // order differs!
        return line1 + ", " + city + ", " + state + " - " + pin;
    }
}` },
              { lang: 'cpp', code: `
class Delivery {
public:
    bool validate(const string& line1, const string& city, const string& state, const string& pin) {
        return regex_match(pin, regex("[0-9]{6}")) && city.find_first_not_of(" \\t") != string::npos;
    }
    string zone(const string& line1, const string& city, const string& state, const string& pin) { return pin.substr(0, 1); }
    int quote(const string& line1, const string& city, const string& state, const string& pin) {
        return pin.substr(0, 1) == "4" ? 30 : 60;        // zone logic duplicated
    }
    string label(const string& line1, const string& state, const string& city, const string& pin) {   // order differs!
        return line1 + ", " + city + ", " + state + " - " + pin;
    }
};` }
            ] }
    },
    mcq: { q: 'What signals a data clump?', options: ['Any method with two parameters', 'The same group of values appearing together in many signatures and fields', 'A class with many methods', 'Use of String'], answer: 1, explain: 'Fowler\'s test: delete one of the values — if the others no longer make sense alone, they form a concept that wants its own type.' },
    hints: [
      `<p>Hint 1: Create <code>record Address(String line1, String city, String state, String pin)</code> and validate the PIN in its compact constructor.</p>`,
      `<p>Hint 2: Move <code>zone()</code> and <code>label()</code> into Address — they use only address data (Feature Envy).</p>`,
      `<p>Hint 3: <code>Delivery.quote(Address a)</code> asks <code>a.zone()</code>. Build addresses with named accessor calls so swapping is visible in review.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "4 30 12 MG Road, Pune, MH - 411001\n7 60 5 Park St, Kolkata, WB - 700016\nrejected: PIN must be 6 digits\nrejected: city required\n" }] },
    solution: {
      approach: `<p><b>Refactor:</b> Introduce Parameter Object (<code>Address</code>) → Move Method (<code>zone</code>, <code>label</code>) into it → validate in the constructor. Signatures shrink to one argument, the swap bug disappears (there is one constructor in one place to review), and address rules have a home.</p>`,
      code: `record Address(String line1, String city, String state, String pin) {
    Address {
        if (pin == null || !pin.matches("[0-9]{6}")) throw new IllegalArgumentException("PIN must be 6 digits");
        if (city == null || city.isBlank()) throw new IllegalArgumentException("city required");
    }
    String zone()  { return pin.substring(0, 1); }
    String label() { return line1 + ", " + city + ", " + state + " - " + pin; }
}

class Delivery {
    static final String LOCAL_ZONE = "4";
    static final int LOCAL_FEE = 30, OUTSTATION_FEE = 60;

    int quote(Address to) { return to.zone().equals(LOCAL_ZONE) ? LOCAL_FEE : OUTSTATION_FEE; }

    public static void main(String[] args) {
        Delivery d = new Delivery();
        Address a = new Address("12 MG Road", "Pune", "MH", "411001");
        System.out.println(a.zone() + " " + d.quote(a) + " " + a.label());
        Address b = new Address("5 Park St", "Kolkata", "WB", "700016");
        System.out.println(b.zone() + " " + d.quote(b) + " " + b.label());
        try {
            new Address("1 Lane", "Pune", "MH", "4110");
        } catch (IllegalArgumentException e) {
            System.out.println("rejected: " + e.getMessage());
        }
        try {
            new Address("1 Lane", " ", "MH", "411001");
        } catch (IllegalArgumentException e) {
            System.out.println("rejected: " + e.getMessage());
        }
    }
}`,
      alt: [
        { lang: 'python', code: `import re
from dataclasses import dataclass


@dataclass(frozen=True)
class Address:
    line1: str
    city: str
    state: str
    pin: str

    def __post_init__(self) -> None:
        if not re.fullmatch(r"[0-9]{6}", self.pin or ""):
            raise ValueError("PIN must be 6 digits")
        if not self.city or not self.city.strip():
            raise ValueError("city required")

    def zone(self) -> str:
        return self.pin[0]

    def label(self) -> str:
        return f"{self.line1}, {self.city}, {self.state} - {self.pin}"


class Delivery:
    LOCAL_ZONE = "4"
    LOCAL_FEE = 30
    OUTSTATION_FEE = 60

    def quote(self, to: Address) -> int:
        return self.LOCAL_FEE if to.zone() == self.LOCAL_ZONE else self.OUTSTATION_FEE


if __name__ == "__main__":
    d = Delivery()
    a = Address("12 MG Road", "Pune", "MH", "411001")
    print(a.zone(), d.quote(a), a.label())
    b = Address("5 Park St", "Kolkata", "WB", "700016")
    print(b.zone(), d.quote(b), b.label())
    for city, pin in (("Pune", "4110"), (" ", "411001")):
        try:
            Address("1 Lane", city, "MH", pin)
        except ValueError as e:
            print(f"rejected: {e}")` },
        { lang: 'ts', code: `class Address {
  constructor(
    readonly line1: string,
    readonly city: string,
    readonly state: string,
    readonly pin: string,
  ) {
    if (!/^[0-9]{6}$/.test(pin)) throw new RangeError("PIN must be 6 digits");
    if (city.trim() === "") throw new RangeError("city required");
  }
  zone(): string { return this.pin.substring(0, 1); }
  label(): string { return \`\${this.line1}, \${this.city}, \${this.state} - \${this.pin}\`; }
}

class Delivery {
  static readonly LOCAL_ZONE = "4";
  static readonly LOCAL_FEE = 30;
  static readonly OUTSTATION_FEE = 60;

  quote(to: Address): number { return to.zone() === Delivery.LOCAL_ZONE ? Delivery.LOCAL_FEE : Delivery.OUTSTATION_FEE; }
}

const d = new Delivery();
const a = new Address("12 MG Road", "Pune", "MH", "411001");
console.log(\`\${a.zone()} \${d.quote(a)} \${a.label()}\`);
const b = new Address("5 Park St", "Kolkata", "WB", "700016");
console.log(\`\${b.zone()} \${d.quote(b)} \${b.label()}\`);
for (const [city, pin] of [["Pune", "4110"], [" ", "411001"]]) {
  try {
    new Address("1 Lane", city, "MH", pin);
  } catch (e) {
    console.log(\`rejected: \${(e as Error).message}\`);
  }
}` },
        { lang: 'cpp', code: `class Address {
    string line1_, city_, state_, pin_;
public:
    Address(string line1, string city, string state, string pin)
        : line1_(std::move(line1)), city_(std::move(city)), state_(std::move(state)), pin_(std::move(pin)) {
        if (!regex_match(pin_, regex("[0-9]{6}"))) throw invalid_argument("PIN must be 6 digits");
        if (all_of(city_.begin(), city_.end(), [](unsigned char c) { return isspace(c); })) throw invalid_argument("city required");
    }
    string zone() const { return pin_.substr(0, 1); }
    string label() const { return line1_ + ", " + city_ + ", " + state_ + " - " + pin_; }
};

class Delivery {
public:
    static inline const string LOCAL_ZONE = "4";
    static constexpr int LOCAL_FEE = 30;
    static constexpr int OUTSTATION_FEE = 60;
    int quote(const Address& to) const { return to.zone() == LOCAL_ZONE ? LOCAL_FEE : OUTSTATION_FEE; }
};

int main() {
    Delivery d;
    Address a("12 MG Road", "Pune", "MH", "411001");
    cout << a.zone() << " " << d.quote(a) << " " << a.label() << "\\n";
    Address b("5 Park St", "Kolkata", "WB", "700016");
    cout << b.zone() << " " << d.quote(b) << " " << b.label() << "\\n";
    for (auto [city, pin] : vector<pair<string, string>>{{"Pune", "4110"}, {" ", "411001"}}) {
        try {
            Address("1 Lane", city, "MH", pin);
        } catch (const invalid_argument& e) {
            cout << "rejected: " << e.what() << "\\n";
        }
    }
}` }
      ],
      complexity: `<p>O(1) everywhere. Parameters per method 4 → 1; validation sites 1 per method → 1 total.</p>`,
      followUps: ['Would a builder help if Address had 10 optional fields?', 'Where would geocoding (lat/long) go — in Address or a separate service? Why?']
    }
  });

  practice.push({
    title: 'Feature envy in InvoicePrinter',
    level: 'Medium', tags: ['feature envy', 'move method', 'cohesion'], companies: ['Zoho', 'Intuit'],
    statement: `<p><code>InvoicePrinter.lineTotal(LineItem item)</code> reads the item's price, quantity and discount and computes the total; <code>CartView</code> has its own copy of the same formula. <code>LineItem</code> itself is a data class with only getters. Move the behaviour where the data lives.</p>`,
    constraints: `Line total = price × qty − discount, never below 0. Amounts in paise (int). Printed lines: "name x qty = total".`,
    example: `<p>Item("Pen", 1000, 3, discount 500) → total ${H.c('g', '2500')}. Item("Gift", 100, 1, discount 500) → total ${H.c('g', '0')} (not negative).</p>`,
    brute: {
      why: `<p>The method uses three fields of another class and nothing of its own — classic <b>feature envy</b>. Because the rule lives outside <code>LineItem</code>, it is copied into <code>CartView</code> (and the copy forgot the "never below 0" rule). <code>LineItem</code> is an anaemic data class, and cohesion is low on both sides.</p>`,
      code: { lang: 'java', code: `class LineItem {
    private final String name; private final int price, qty, discount;
    LineItem(String n, int p, int q, int d) { name = n; price = p; qty = q; discount = d; }
    String getName() { return name; } int getPrice() { return price; }
    int getQty() { return qty; } int getDiscount() { return discount; }
}
class InvoicePrinter {
    int lineTotal(LineItem i) { return Math.max(0, i.getPrice() * i.getQty() - i.getDiscount()); }
    String print(LineItem i) { return i.getName() + " x " + i.getQty() + " = " + lineTotal(i); }
}
class CartView {
    int lineTotal(LineItem i) { return i.getPrice() * i.getQty() - i.getDiscount(); }   // drifted copy
}`, alt: [
              { lang: 'python', code: `
class LineItem:
    def __init__(self, n, p, q, d): self._name, self._price, self._qty, self._discount = n, p, q, d
    def get_name(self): return self._name
    def get_price(self): return self._price
    def get_qty(self): return self._qty
    def get_discount(self): return self._discount

class InvoicePrinter:
    def line_total(self, i): return max(0, i.get_price() * i.get_qty() - i.get_discount())
    def print(self, i): return f"{i.get_name()} x {i.get_qty()} = {self.line_total(i)}"

class CartView:
    def line_total(self, i): return i.get_price() * i.get_qty() - i.get_discount()   # drifted copy` },
              { lang: 'ts', code: `
class LineItem {
    constructor(private readonly name: string, private readonly price: number, private readonly qty: number, private readonly discount: number) {}
    getName(): string { return this.name; } getPrice(): number { return this.price; }
    getQty(): number { return this.qty; } getDiscount(): number { return this.discount; }
}
class InvoicePrinter {
    lineTotal(i: LineItem): number { return Math.max(0, i.getPrice() * i.getQty() - i.getDiscount()); }
    print(i: LineItem): string { return i.getName() + " x " + i.getQty() + " = " + this.lineTotal(i); }
}
class CartView {
    lineTotal(i: LineItem): number { return i.getPrice() * i.getQty() - i.getDiscount(); }   // drifted copy
}` },
              { lang: 'cpp', code: `
class LineItem {
    string name; int price, qty, discount;
public:
    LineItem(string n, int p, int q, int d) : name(n), price(p), qty(q), discount(d) {}
    string getName() const { return name; } int getPrice() const { return price; }
    int getQty() const { return qty; } int getDiscount() const { return discount; }
};
class InvoicePrinter {
public:
    int lineTotal(const LineItem& i) { return max(0, i.getPrice() * i.getQty() - i.getDiscount()); }
    string print(const LineItem& i) { return i.getName() + " x " + to_string(i.getQty()) + " = " + to_string(lineTotal(i)); }
};
class CartView {
public:
    int lineTotal(const LineItem& i) { return i.getPrice() * i.getQty() - i.getDiscount(); }   // drifted copy
};` }
            ] }
    },
    mcq: { q: 'How do you recognise feature envy?', options: ['A method is longer than 20 lines', 'A method uses another object\'s data more than its own class\'s data', 'A class has no interface', 'A method is static'], answer: 1, explain: 'Feature envy: the method "wants to be" in the class whose data it uses. Move Method fixes it.' },
    hints: [
      `<p>Hint 1: Count which fields <code>lineTotal</code> touches: all belong to <code>LineItem</code>. That is where it should live.</p>`,
      `<p>Hint 2: Move Method → <code>LineItem.total()</code>. Make both printers call it; delete their copies.</p>`,
      `<p>Hint 3: Consider whether the getters are still needed. Often a "tell" method like <code>printLine()</code> or a record with accessors is enough. Test the negative-discount case.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "Pen x 3 = 2500 | 0\nGift x 1 = 0\n" }] },
    solution: {
      approach: `<p><b>Refactor:</b> Move Method <code>lineTotal</code> into <code>LineItem</code> as <code>total()</code>; replace both copies with calls (removes duplication and the drifted bug). <code>LineItem</code> becomes a record with behaviour; printers only format. Cohesion rises in all three classes.</p>`,
      code: `record LineItem(String name, int price, int qty, int discount) {
    int total() { return Math.max(0, price * qty - discount); }   // rule next to its data
}
class InvoicePrinter {
    String print(LineItem item) { return item.name() + " x " + item.qty() + " = " + item.total(); }
}
class CartView {
    int lineTotal(LineItem item) { return item.total(); }        // no copy, no drift
}
class EnvyDemo {
    public static void main(String[] args) {
        LineItem pen = new LineItem("Pen", 1000, 3, 500);
        LineItem gift = new LineItem("Gift", 100, 1, 500);
        System.out.println(new InvoicePrinter().print(pen) + " | " + new CartView().lineTotal(gift));   // Pen x 3 = 2500 | 0
        System.out.println(new InvoicePrinter().print(gift));   // Gift x 1 = 0 (discount larger than the price: clamped, not negative)
    }
}`,
      alt: [
        { lang: 'python', code: `from dataclasses import dataclass


@dataclass(frozen=True)
class LineItem:
    name: str
    price: int
    qty: int
    discount: int

    def total(self) -> int:
        return max(0, self.price * self.qty - self.discount)  # rule next to its data


class InvoicePrinter:
    def print(self, item: LineItem) -> str:
        return f"{item.name} x {item.qty} = {item.total()}"


class CartView:
    def line_total(self, item: LineItem) -> int:
        return item.total()  # no copy, no drift


if __name__ == "__main__":
    pen = LineItem("Pen", 1000, 3, 500)
    gift = LineItem("Gift", 100, 1, 500)
    print(f"{InvoicePrinter().print(pen)} | {CartView().line_total(gift)}")
    print(InvoicePrinter().print(gift))  # discount larger than the price: clamped, not negative` },
        { lang: 'ts', code: `class LineItem {
  constructor(readonly name: string, readonly price: number, readonly qty: number, readonly discount: number) {}
  total(): number { return Math.max(0, this.price * this.qty - this.discount); } // rule next to its data
}

class InvoicePrinter {
  print(item: LineItem): string { return \`\${item.name} x \${item.qty} = \${item.total()}\`; }
}

class CartView {
  lineTotal(item: LineItem): number { return item.total(); } // no copy, no drift
}

const pen = new LineItem("Pen", 1000, 3, 500);
const gift = new LineItem("Gift", 100, 1, 500);
console.log(\`\${new InvoicePrinter().print(pen)} | \${new CartView().lineTotal(gift)}\`);
console.log(new InvoicePrinter().print(gift)); // discount larger than the price: clamped, not negative` },
        { lang: 'cpp', code: `struct LineItem {
    string name;
    int price;
    int qty;
    int discount;
    int total() const { return max(0, price * qty - discount); }   // rule next to its data
};

class InvoicePrinter {
public:
    string print(const LineItem& item) const { return item.name + " x " + to_string(item.qty) + " = " + to_string(item.total()); }
};

class CartView {
public:
    int lineTotal(const LineItem& item) const { return item.total(); }   // no copy, no drift
};

int main() {
    LineItem pen{"Pen", 1000, 3, 500};
    LineItem gift{"Gift", 100, 1, 500};
    cout << InvoicePrinter().print(pen) << " | " << CartView().lineTotal(gift) << "\\n";
    cout << InvoicePrinter().print(gift) << "\\n";   // discount larger than the price: clamped, not negative
}` }
      ],
      complexity: `<p>O(1) per line. Copies of the formula 2 → 1; the CartView bug is fixed as a side effect.</p>`,
      followUps: ['Tax per line is added — where does it go?', 'When is a pure data class (DTO) acceptable? (API boundaries, serialisation)']
    }
  });

  practice.push({
    title: 'Stack extends ArrayList: refused bequest',
    level: 'Medium', tags: ['composition over inheritance', 'refused bequest', 'LSP'], companies: ['Google', 'Adobe'],
    statement: `<p>A teammate wrote <code>class UndoStack&lt;T&gt; extends ArrayList&lt;T&gt;</code> to get storage "for free", adding <code>push</code>/<code>pop</code>/<code>peek</code> with a max size of 50. Users of the class are calling <code>add(0, x)</code>, <code>remove(3)</code> and <code>sort</code>, corrupting the undo history. Fix the design.</p>`,
    constraints: `Operations: push (drop the oldest when more than 50), pop, peek, size, isEmpty. Empty pop/peek throw <code>NoSuchElementException</code>. No other operations should be possible.`,
    example: `<p>push a, b, c → pop = ${H.c('g', 'c')}, peek = ${H.c('g', 'b')}. With the old design <code>stack.add(0, "z")</code> compiled and inserted under the history — ${H.c('r', 'impossible')} after the fix.</p>`,
    brute: {
      why: `<p>Inheriting from a list class (<code>ArrayList</code> in Java, <code>list</code> in Python, <code>Array</code> in TypeScript, <code>vector</code> in C++) exposes dozens of list operations that break the stack's promise. The class only wants a <i>storage</i> part, not to <i>be</i> a list — a refused bequest. It also couples us to the list's internals (e.g. in Java, overriding <code>add</code> would interact with <code>addAll</code>: the fragile base class problem), and the max-size rule can be bypassed with bulk or positional operations such as <code>addAll</code> or <code>insert</code>.</p>`,
      code: { lang: 'java', code: `class UndoStack<T> extends ArrayList<T> {
    static final int MAX = 50;
    void push(T t) { add(t); if (size() > MAX) remove(0); }
    T pop() { return remove(size() - 1); }
    T peek() { return get(size() - 1); }
}
class UndoMisuse {
    public static void main(String[] args) {
        UndoStack<String> s = new UndoStack<>();
        s.push("a"); s.push("b");
        s.add(0, "z");                 // compiles: history corrupted
        System.out.println(s);
    }
}`, alt: [
              { lang: 'python', code: `
class UndoStack(list):
    MAX = 50
    def push(self, t):
        self.append(t)
        if len(self) > self.MAX: del self[0]
    def pop(self): return super().pop()
    def peek(self): return self[-1]

s = UndoStack()
s.push("a"); s.push("b")
s.insert(0, "z")                 # works: history corrupted
print(s)` },
              { lang: 'ts', code: `
class UndoStack<T> extends Array<T> {
    static readonly MAX = 50;
    pushItem(t: T): void { this.push(t); if (this.length > UndoStack.MAX) this.shift(); }
    popItem(): T | undefined { return this.pop(); }
    peek(): T { return this[this.length - 1]; }
}
const s = new UndoStack<string>();
s.pushItem("a"); s.pushItem("b");
s.unshift("z");                 // compiles: history corrupted
console.log(s);` },
              { lang: 'cpp', code: `
template <class T>
class UndoStack : public vector<T> {
public:
    static const int MAX = 50;
    void pushItem(T t) { this->push_back(t); if ((int)this->size() > MAX) this->erase(this->begin()); }
    T popItem() { T t = this->back(); this->pop_back(); return t; }
    T peek() { return this->back(); }
};
int main() {
    UndoStack<string> s;
    s.pushItem("a"); s.pushItem("b");
    s.insert(s.begin(), "z");                 // compiles: history corrupted
    for (auto& x : s) cout << x << " ";
}` }
            ] }
    },
    mcq: { q: 'Why is composition the right fix here?', options: ['Composition is always faster', 'An undo stack is not a list; it should HAVE storage and expose only stack operations', 'Extending a built-in list class is forbidden', 'To use less memory'], answer: 1, explain: 'The is-a test fails. Holding an ArrayDeque privately lets the class expose exactly the operations that keep its invariants.' },
    hints: [
      `<p>Hint 1: Say it aloud: "an UndoStack is an ArrayList" — false. "An UndoStack has a storage" — true.</p>`,
      `<p>Hint 2: Hold a private <code>Deque&lt;T&gt;</code> (<code>ArrayDeque</code>) and delegate. Use <code>addFirst/removeFirst</code> for the top and <code>removeLast</code> to drop the oldest.</p>`,
      `<p>Hint 3: Expose only push/pop/peek/size/isEmpty. Throw <code>NoSuchElementException</code> on empty pop/peek (ArrayDeque's <code>removeFirst</code>/<code>getFirst</code> already do).</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "c b\n50\nx59\ncannot pop: empty\n" }] },
    solution: {
      approach: `<p><b>Refactor:</b> Replace Inheritance with Delegation (Replace Superclass with Delegate). The class owns a private <code>ArrayDeque</code>; its public surface is exactly the stack operations, so invariants (LIFO order, max 50) cannot be bypassed. As a bonus, <code>ArrayDeque</code> makes "drop oldest" O(1) instead of ArrayList's O(n) <code>remove(0)</code>.</p>`,
      code: `final class UndoStack<T> {
    static final int MAX = 50;
    private final Deque<T> items = new ArrayDeque<>();   // has-a storage

    void push(T t) {
        items.addFirst(t);
        if (items.size() > MAX) items.removeLast();       // drop the oldest, O(1)
    }
    T pop()  { return items.removeFirst(); }              // throws NoSuchElementException when empty
    T peek() { return items.getFirst(); }
    int size() { return items.size(); }
    boolean isEmpty() { return items.isEmpty(); }

    public static void main(String[] args) {
        UndoStack<String> s = new UndoStack<>();
        s.push("a"); s.push("b"); s.push("c");
        System.out.println(s.pop() + " " + s.peek());     // c b
        for (int i = 0; i < 60; i++) s.push("x" + i);
        System.out.println(s.size());                      // 50
        System.out.println(s.peek());                      // x59: the newest survives, the oldest were dropped
        try {
            new UndoStack<String>().pop();
        } catch (NoSuchElementException e) {
            System.out.println("cannot pop: empty");
        }
        // s.add(0, "z");  -- does not compile any more
    }
}`,
      alt: [
        { lang: 'python', code: `from collections import deque
from typing import Generic, TypeVar

T = TypeVar("T")


class UndoStack(Generic[T]):
    MAX = 50

    def __init__(self) -> None:
        self._items: deque[T] = deque(maxlen=self.MAX)  # has-a storage; maxlen drops the oldest, O(1)

    def push(self, item: T) -> None:
        self._items.append(item)

    def pop(self) -> T:
        return self._items.pop()  # raises IndexError when empty

    def peek(self) -> T:
        return self._items[-1]

    def size(self) -> int:
        return len(self._items)

    def is_empty(self) -> bool:
        return not self._items


if __name__ == "__main__":
    s: UndoStack[str] = UndoStack()
    for x in "abc":
        s.push(x)
    print(s.pop(), s.peek())  # c b
    for i in range(60):
        s.push(f"x{i}")
    print(s.size())  # 50
    print(s.peek())  # x59: the newest survives, the oldest were dropped
    try:
        UndoStack[str]().pop()
    except IndexError:
        print("cannot pop: empty")` },
        { lang: 'ts', code: `class UndoStack<T> {
  static readonly MAX = 50;
  private readonly items: T[] = []; // has-a storage; the newest item is last

  push(item: T): void {
    this.items.push(item);
    if (this.items.length > UndoStack.MAX) this.items.shift(); // drop the oldest (the array never exceeds 51, so shift is cheap)
  }
  pop(): T {
    if (this.items.length === 0) throw new Error("empty");
    return this.items.pop() as T;
  }
  peek(): T {
    if (this.items.length === 0) throw new Error("empty");
    return this.items[this.items.length - 1];
  }
  size(): number { return this.items.length; }
  isEmpty(): boolean { return this.items.length === 0; }
}

const s = new UndoStack<string>();
for (const x of ["a", "b", "c"]) s.push(x);
console.log(\`\${s.pop()} \${s.peek()}\`); // c b
for (let i = 0; i < 60; i++) s.push(\`x\${i}\`);
console.log(s.size()); // 50
console.log(s.peek()); // x59: the newest survives, the oldest were dropped
try {
  new UndoStack<string>().pop();
} catch {
  console.log("cannot pop: empty");
}` },
        { lang: 'cpp', code: `template <typename T>
class UndoStack {
    deque<T> items_;   // has-a storage; the newest item is at the front
public:
    static constexpr size_t MAX = 50;

    void push(T item) {
        items_.push_front(std::move(item));
        if (items_.size() > MAX) items_.pop_back();   // drop the oldest, O(1)
    }
    T pop() {
        if (items_.empty()) throw out_of_range("empty");
        T top = std::move(items_.front());
        items_.pop_front();
        return top;
    }
    const T& peek() const {
        if (items_.empty()) throw out_of_range("empty");
        return items_.front();
    }
    size_t size() const { return items_.size(); }
    bool isEmpty() const { return items_.empty(); }
};

int main() {
    UndoStack<string> s;
    for (string x : {"a", "b", "c"}) s.push(x);
    string top = s.pop();
    cout << top << " " << s.peek() << "\\n";   // c b
    for (int i = 0; i < 60; i++) s.push("x" + to_string(i));
    cout << s.size() << "\\n";   // 50
    cout << s.peek() << "\\n";   // x59: the newest survives, the oldest were dropped
    try {
        UndoStack<string>().pop();
    } catch (const out_of_range&) {
        cout << "cannot pop: empty\\n";
    }
}` }
      ],
      complexity: `<p>push/pop/peek O(1) (drop-oldest improved from O(n) to O(1)). Public methods: ~45 → 5.</p>`,
      followUps: ['How would you add redo? (second stack; cleared on new push)', 'When WOULD extending a JDK collection be acceptable? (AbstractList etc. designed for extension)']
    }
  });

  practice.push({
    title: 'Car refuel check: train wreck to tell-don\'t-ask',
    level: 'Medium', tags: ['Law of Demeter', 'tell dont ask', 'encapsulation'], companies: ['Uber', 'Ola'],
    statement: `<p>A fleet dashboard decides which cars need service with <code>car.getEngine().getFuelTank().getLitres() &lt; 5</code> and <code>car.getEngine().getOilLevel() &lt; 20</code>. The company is adding electric cars (no fuel tank, a battery instead), and every train wreck will crash. Refactor so the dashboard never needs to know what is inside a car.</p>`,
    constraints: `Petrol car needs service if fuel &lt; 5 litres or oil &lt; 20%. Electric car needs service if battery &lt; 15%. Dashboard returns the plate numbers needing service, in input order.`,
    example: `<p>KA01 (petrol, fuel 3, oil 80) → ${H.c('r', 'service')}; KA02 (petrol, 40, 90) → ok; KA03 (electric, 10%) → ${H.c('r', 'service')}. Output [KA01, KA03].</p>`,
    brute: {
      why: `<p>The dashboard knows the whole object graph: car → engine → fuel tank → litres. Each <code>get</code> is a dependency on another class's structure (Law of Demeter violation). Adding an electric car means <code>getEngine()</code> or <code>getFuelTank()</code> returns null and the dashboard must grow type checks (<code>instanceof</code> / <code>isinstance</code>) — every client of Car pays for every internal change.</p>`,
      code: { lang: 'java', code: `class FuelTank { private final int litres; FuelTank(int l) { litres = l; } int getLitres() { return litres; } }
class Engine {
    private final FuelTank tank; private final int oil;
    Engine(FuelTank t, int oil) { tank = t; this.oil = oil; }
    FuelTank getFuelTank() { return tank; } int getOilLevel() { return oil; }
}
class Car {
    private final String plate; private final Engine engine;
    Car(String p, Engine e) { plate = p; engine = e; }
    String getPlate() { return plate; } Engine getEngine() { return engine; }
}
class Dashboard {
    List<String> needingService(List<Car> cars) {
        List<String> out = new ArrayList<>();
        for (Car c : cars) {
            if (c.getEngine().getFuelTank().getLitres() < 5 || c.getEngine().getOilLevel() < 20) out.add(c.getPlate());
        }
        return out;
    }
}`, alt: [
              { lang: 'python', code: `
class FuelTank:
    def __init__(self, l): self._litres = l
    def get_litres(self): return self._litres

class Engine:
    def __init__(self, t, oil): self._tank, self._oil = t, oil
    def get_fuel_tank(self): return self._tank
    def get_oil_level(self): return self._oil

class Car:
    def __init__(self, p, e): self._plate, self._engine = p, e
    def get_plate(self): return self._plate
    def get_engine(self): return self._engine

class Dashboard:
    def needing_service(self, cars):
        out = []
        for c in cars:
            if c.get_engine().get_fuel_tank().get_litres() < 5 or c.get_engine().get_oil_level() < 20: out.append(c.get_plate())
        return out` },
              { lang: 'ts', code: `
class FuelTank { constructor(private readonly litres: number) {} getLitres(): number { return this.litres; } }
class Engine {
    constructor(private readonly tank: FuelTank, private readonly oil: number) {}
    getFuelTank(): FuelTank { return this.tank; } getOilLevel(): number { return this.oil; }
}
class Car {
    constructor(private readonly plate: string, private readonly engine: Engine) {}
    getPlate(): string { return this.plate; } getEngine(): Engine { return this.engine; }
}
class Dashboard {
    needingService(cars: Car[]): string[] {
        const out: string[] = [];
        for (const c of cars) {
            if (c.getEngine().getFuelTank().getLitres() < 5 || c.getEngine().getOilLevel() < 20) out.push(c.getPlate());
        }
        return out;
    }
}` },
              { lang: 'cpp', code: `
class FuelTank { int litres; public: FuelTank(int l) : litres(l) {} int getLitres() const { return litres; } };
class Engine {
    FuelTank tank; int oil;
public:
    Engine(FuelTank t, int oil) : tank(t), oil(oil) {}
    const FuelTank& getFuelTank() const { return tank; } int getOilLevel() const { return oil; }
};
class Car {
    string plate; Engine engine;
public:
    Car(string p, Engine e) : plate(p), engine(e) {}
    string getPlate() const { return plate; } const Engine& getEngine() const { return engine; }
};
class Dashboard {
public:
    vector<string> needingService(const vector<Car>& cars) {
        vector<string> out;
        for (auto& c : cars) {
            if (c.getEngine().getFuelTank().getLitres() < 5 || c.getEngine().getOilLevel() < 20) out.push_back(c.getPlate());
        }
        return out;
    }
};` }
            ] }
    },
    mcq: { q: 'After refactoring, what should Dashboard call?', options: ['car.getEngine().needsService()', 'car.needsService()', 'car instanceof ElectricCar ? ... : ...', 'Engine.check(car)'], answer: 1, explain: 'The dashboard tells/asks its direct friend a domain question. How each car decides is the car\'s business.' },
    hints: [
      `<p>Hint 1: What question does the dashboard really ask? "Does this car need service?" Put that method on Car.</p>`,
      `<p>Hint 2: Make <code>Car</code> an interface (or sealed) with <code>plate()</code> and <code>needsService()</code>; <code>PetrolCar</code> and <code>ElectricCar</code> implement it using their own parts.</p>`,
      `<p>Hint 3: Remove the getters that leaked internals (<code>getEngine</code>, <code>getFuelTank</code>). Dashboard becomes a one-line filter over cars.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "[KA01, KA03, KA05]\n[]\n" }] },
    solution: {
      approach: `<p><b>Refactor:</b> Hide Delegate + Replace Conditional with Polymorphism. Each car type answers <code>needsService()</code> using its own parts; the dashboard talks only to <code>Car</code>. Electric cars plug in without touching the dashboard, and the engine/tank classes are free to change.</p>`,
      code: `sealed interface Car permits PetrolCar, ElectricCar {
    String plate();
    boolean needsService();
}
record PetrolCar(String plate, int fuelLitres, int oilPercent) implements Car {
    static final int MIN_FUEL = 5, MIN_OIL = 20;
    public boolean needsService() { return fuelLitres < MIN_FUEL || oilPercent < MIN_OIL; }
}
record ElectricCar(String plate, int batteryPercent) implements Car {
    static final int MIN_BATTERY = 15;
    public boolean needsService() { return batteryPercent < MIN_BATTERY; }
}
class Dashboard {
    List<String> needingService(List<Car> cars) {
        return cars.stream().filter(Car::needsService).map(Car::plate).toList();
    }
    public static void main(String[] args) {
        List<Car> fleet = List.of(new PetrolCar("KA01", 3, 80), new PetrolCar("KA02", 40, 90), new ElectricCar("KA03", 10),
                new PetrolCar("KA04", 5, 20), new PetrolCar("KA05", 40, 10), new ElectricCar("KA06", 15));
        System.out.println(new Dashboard().needingService(fleet));   // [KA01, KA03, KA05]; KA04 and KA06 sit exactly on the limit
        System.out.println(new Dashboard().needingService(List.of()));   // []
    }
}`,
      alt: [
        { lang: 'python', code: `from abc import ABC, abstractmethod
from dataclasses import dataclass


class Car(ABC):
    plate: str

    @abstractmethod
    def needs_service(self) -> bool: ...


@dataclass(frozen=True)
class PetrolCar(Car):
    MIN_FUEL = 5
    MIN_OIL = 20

    plate: str
    fuel_litres: int
    oil_percent: int

    def needs_service(self) -> bool:
        return self.fuel_litres < self.MIN_FUEL or self.oil_percent < self.MIN_OIL


@dataclass(frozen=True)
class ElectricCar(Car):
    MIN_BATTERY = 15

    plate: str
    battery_percent: int

    def needs_service(self) -> bool:
        return self.battery_percent < self.MIN_BATTERY


class Dashboard:
    def needing_service(self, cars: list[Car]) -> list[str]:
        return [c.plate for c in cars if c.needs_service()]


if __name__ == "__main__":
    fleet = [
        PetrolCar("KA01", 3, 80), PetrolCar("KA02", 40, 90), ElectricCar("KA03", 10),
        PetrolCar("KA04", 5, 20), PetrolCar("KA05", 40, 10), ElectricCar("KA06", 15),
    ]
    show = lambda plates: "[" + ", ".join(plates) + "]"
    print(show(Dashboard().needing_service(fleet)))  # [KA01, KA03, KA05]; KA04 and KA06 sit exactly on the limit
    print(show(Dashboard().needing_service([])))  # []` },
        { lang: 'ts', code: `interface Car {
  readonly plate: string;
  needsService(): boolean;
}

class PetrolCar implements Car {
  static readonly MIN_FUEL = 5;
  static readonly MIN_OIL = 20;
  constructor(readonly plate: string, private readonly fuelLitres: number, private readonly oilPercent: number) {}
  needsService(): boolean { return this.fuelLitres < PetrolCar.MIN_FUEL || this.oilPercent < PetrolCar.MIN_OIL; }
}

class ElectricCar implements Car {
  static readonly MIN_BATTERY = 15;
  constructor(readonly plate: string, private readonly batteryPercent: number) {}
  needsService(): boolean { return this.batteryPercent < ElectricCar.MIN_BATTERY; }
}

class Dashboard {
  needingService(cars: readonly Car[]): string[] {
    return cars.filter((c) => c.needsService()).map((c) => c.plate);
  }
}

const fleet: Car[] = [
  new PetrolCar("KA01", 3, 80), new PetrolCar("KA02", 40, 90), new ElectricCar("KA03", 10),
  new PetrolCar("KA04", 5, 20), new PetrolCar("KA05", 40, 10), new ElectricCar("KA06", 15),
];
const show = (plates: string[]): string => \`[\${plates.join(", ")}]\`;
console.log(show(new Dashboard().needingService(fleet))); // [KA01, KA03, KA05]; KA04 and KA06 sit exactly on the limit
console.log(show(new Dashboard().needingService([]))); // []` },
        { lang: 'cpp', code: `class Car {
public:
    virtual ~Car() = default;
    virtual const string& plate() const = 0;
    virtual bool needsService() const = 0;
};

class PetrolCar final : public Car {
    string plate_;
    int fuelLitres_, oilPercent_;
public:
    static constexpr int MIN_FUEL = 5, MIN_OIL = 20;
    PetrolCar(string plate, int fuelLitres, int oilPercent) : plate_(std::move(plate)), fuelLitres_(fuelLitres), oilPercent_(oilPercent) {}
    const string& plate() const override { return plate_; }
    bool needsService() const override { return fuelLitres_ < MIN_FUEL || oilPercent_ < MIN_OIL; }
};

class ElectricCar final : public Car {
    string plate_;
    int batteryPercent_;
public:
    static constexpr int MIN_BATTERY = 15;
    ElectricCar(string plate, int batteryPercent) : plate_(std::move(plate)), batteryPercent_(batteryPercent) {}
    const string& plate() const override { return plate_; }
    bool needsService() const override { return batteryPercent_ < MIN_BATTERY; }
};

class Dashboard {
public:
    vector<string> needingService(const vector<unique_ptr<Car>>& cars) const {
        vector<string> plates;
        for (const auto& c : cars) if (c->needsService()) plates.push_back(c->plate());
        return plates;
    }
};

static string show(const vector<string>& plates) {
    string out = "[";
    for (size_t i = 0; i < plates.size(); i++) out += (i ? ", " : "") + plates[i];
    return out + "]";
}

int main() {
    vector<unique_ptr<Car>> fleet;
    fleet.push_back(make_unique<PetrolCar>("KA01", 3, 80));
    fleet.push_back(make_unique<PetrolCar>("KA02", 40, 90));
    fleet.push_back(make_unique<ElectricCar>("KA03", 10));
    fleet.push_back(make_unique<PetrolCar>("KA04", 5, 20));
    fleet.push_back(make_unique<PetrolCar>("KA05", 40, 10));
    fleet.push_back(make_unique<ElectricCar>("KA06", 15));
    cout << show(Dashboard().needingService(fleet)) << "\\n";   // [KA01, KA03, KA05]; KA04 and KA06 sit exactly on the limit
    cout << show(Dashboard().needingService({})) << "\\n";      // []
}` }
      ],
      complexity: `<p>O(cars). Classes the dashboard depends on: 4 → 1.</p>`,
      followUps: ['The UI needs to show WHY a car needs service — how without breaking LoD? (return a ServiceReport value)', 'Is cars.stream().filter().map() a Demeter violation? Why not?']
    }
  });

  practice.push({
    title: 'Hidden coupling to the clock and a global config',
    level: 'Medium', tags: ['coupling', 'dependency injection', 'testability'], companies: ['Booking.com', 'MakeMyTrip'],
    statement: `<p><code>PriceService.finalPrice(base)</code> adds a 10% weekend surcharge by calling <code>LocalDate.now()</code> and reads the surcharge from a static mutable <code>AppConfig.weekendPercent</code>. Tests pass on weekdays and fail on Saturdays; one test that changes <code>AppConfig</code> breaks others. Remove the hidden coupling.</p>`,
    constraints: `Weekend = Saturday or Sunday. Surcharge percent configurable. Must be testable for any date without waiting for the weekend. Integer arithmetic.`,
    example: `<p>Base 1000 on Saturday 2026-10-17 with 10% → ${H.c('g', '1100')}; on Wednesday 2026-10-14 → ${H.c('g', '1000')}. Tests pass a fixed <code>Clock</code>.</p>`,
    brute: {
      why: `<p><code>LocalDate.now()</code> is a hidden dependency on the system clock (a global), and <code>AppConfig.weekendPercent</code> is common coupling through mutable static state. Neither appears in the constructor or method signature, so readers do not see them and tests cannot control them — results depend on the day you run the build.</p>`,
      code: { lang: 'java', code: `class AppConfig { static int weekendPercent = 10; }
class PriceService {
    int finalPrice(int base) {
        DayOfWeek d = LocalDate.now().getDayOfWeek();
        boolean weekend = d == DayOfWeek.SATURDAY || d == DayOfWeek.SUNDAY;
        return weekend ? base + base * AppConfig.weekendPercent / 100 : base;
    }
}`, alt: [
              { lang: 'python', code: `
from datetime import date

class AppConfig:
    weekend_percent = 10

class PriceService:
    def final_price(self, base):
        weekend = date.today().weekday() >= 5
        return base + base * AppConfig.weekend_percent // 100 if weekend else base` },
              { lang: 'ts', code: `
class AppConfig { static weekendPercent = 10; }
class PriceService {
    finalPrice(base: number): number {
        const d = new Date().getDay();
        const weekend = d === 0 || d === 6;
        return weekend ? base + Math.floor(base * AppConfig.weekendPercent / 100) : base;
    }
}` },
              { lang: 'cpp', code: `
struct AppConfig { static inline int weekendPercent = 10; };
class PriceService {
public:
    int finalPrice(int base) {
        time_t now = time(nullptr);
        int d = localtime(&now)->tm_wday;
        bool weekend = d == 0 || d == 6;
        return weekend ? base + base * AppConfig::weekendPercent / 100 : base;
    }
};` }
            ] }
    },
    mcq: { q: 'What is the standard way to make "now" testable?', options: ['Call System.currentTimeMillis() instead', 'Inject a clock (Java\'s java.time.Clock, or a function that returns today\'s date) and ask it for the date', 'Use Thread.sleep in tests until Saturday', 'Mock LocalDate with reflection'], answer: 1, explain: 'Make the clock a dependency. In Java, java.time.Clock exists for this: production passes Clock.systemDefaultZone() and tests pass Clock.fixed(...). In Python, TypeScript or C++ the clock is a function that returns today\'s date: production passes the real one, tests pass a fixed one.' },
    hints: [
      `<p>Hint 1: List the hidden inputs of <code>finalPrice</code>: today's date and the surcharge percent. Make them explicit dependencies.</p>`,
      `<p>Hint 2: Constructor-inject a clock (Java's <code>Clock</code>, or a function that returns today's date in Python, TypeScript and C++) and the <code>weekendPercent</code> (an immutable value). Ask the injected clock for the date.</p>`,
      `<p>Hint 3: In the demo build two services with <code>Clock.fixed(Instant.parse("2026-10-17T10:00:00Z"), ZoneOffset.UTC)</code> (Saturday) and a Wednesday clock, and check 1100 and 1000.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "1100\n1000\n1100\n1000\n" }] },
    solution: {
      approach: `<p><b>Refactor:</b> make implicit dependencies explicit. The clock and the percent are passed in the constructor (dependency injection), the global config is gone, and the weekend rule is extracted into a small well-named method. Tests now pin any date and any percent, and there is no shared mutable state between tests.</p>`,
      code: `class PriceService {
    private final Clock clock;
    private final int weekendPercent;

    PriceService(Clock clock, int weekendPercent) {
        this.clock = clock;
        this.weekendPercent = weekendPercent;
    }

    int finalPrice(int base) {
        return isWeekend(LocalDate.now(clock)) ? base + base * weekendPercent / 100 : base;
    }

    private static boolean isWeekend(LocalDate date) {
        DayOfWeek d = date.getDayOfWeek();
        return d == DayOfWeek.SATURDAY || d == DayOfWeek.SUNDAY;
    }

    public static void main(String[] args) {
        Clock saturday = Clock.fixed(Instant.parse("2026-10-17T10:00:00Z"), ZoneOffset.UTC);
        Clock wednesday = Clock.fixed(Instant.parse("2026-10-14T10:00:00Z"), ZoneOffset.UTC);
        Clock sunday = Clock.fixed(Instant.parse("2026-10-18T23:30:00Z"), ZoneOffset.UTC);
        System.out.println(new PriceService(saturday, 10).finalPrice(1000));   // 1100
        System.out.println(new PriceService(wednesday, 10).finalPrice(1000));  // 1000
        System.out.println(new PriceService(sunday, 10).finalPrice(1000));     // 1100
        System.out.println(new PriceService(saturday, 0).finalPrice(1000));    // 1000: the percent is injected too
        // production: new PriceService(Clock.systemDefaultZone(), configuredPercent)
    }
}`,
      alt: [
        { lang: 'python', code: `from datetime import date
from typing import Callable

Clock = Callable[[], date]  # a clock is just a function that returns today's date


class PriceService:
    def __init__(self, clock: Clock, weekend_percent: int) -> None:
        self._clock = clock
        self._weekend_percent = weekend_percent

    def final_price(self, base: int) -> int:
        if self._is_weekend(self._clock()):
            return base + base * self._weekend_percent // 100
        return base

    @staticmethod
    def _is_weekend(day: date) -> bool:
        return day.weekday() >= 5  # Monday is 0, so 5 and 6 are Saturday and Sunday


if __name__ == "__main__":
    saturday: Clock = lambda: date(2026, 10, 17)
    wednesday: Clock = lambda: date(2026, 10, 14)
    sunday: Clock = lambda: date(2026, 10, 18)
    print(PriceService(saturday, 10).final_price(1000))  # 1100
    print(PriceService(wednesday, 10).final_price(1000))  # 1000
    print(PriceService(sunday, 10).final_price(1000))  # 1100
    print(PriceService(saturday, 0).final_price(1000))  # 1000: the percent is injected too
    # production: PriceService(date.today, configured_percent)` },
        { lang: 'ts', code: `type Clock = () => Date; // inject the clock instead of calling new Date() inside the service

class PriceService {
  constructor(private readonly clock: Clock, private readonly weekendPercent: number) {}

  finalPrice(base: number): number {
    return PriceService.isWeekend(this.clock()) ? base + Math.floor((base * this.weekendPercent) / 100) : base;
  }

  private static isWeekend(date: Date): boolean {
    const day = date.getUTCDay(); // 0 = Sunday, 6 = Saturday
    return day === 0 || day === 6;
  }
}

const saturday: Clock = () => new Date("2026-10-17T10:00:00Z");
const wednesday: Clock = () => new Date("2026-10-14T10:00:00Z");
const sunday: Clock = () => new Date("2026-10-18T23:30:00Z");
console.log(new PriceService(saturday, 10).finalPrice(1000)); // 1100
console.log(new PriceService(wednesday, 10).finalPrice(1000)); // 1000
console.log(new PriceService(sunday, 10).finalPrice(1000)); // 1100
console.log(new PriceService(saturday, 0).finalPrice(1000)); // 1000: the percent is injected too
// production: new PriceService(() => new Date(), configuredPercent)` },
        { lang: 'cpp', code: `using Clock = function<chrono::sys_days()>;   // inject "today" as a callable

class PriceService {
    Clock clock_;
    int weekendPercent_;

    static bool isWeekend(chrono::sys_days day) {
        chrono::weekday wd{day};
        return wd == chrono::Saturday || wd == chrono::Sunday;
    }

public:
    PriceService(Clock clock, int weekendPercent) : clock_(std::move(clock)), weekendPercent_(weekendPercent) {}

    int finalPrice(int base) const {
        return isWeekend(clock_()) ? base + base * weekendPercent_ / 100 : base;
    }
};

int main() {
    using namespace chrono;
    Clock saturday = [] { return sys_days{year{2026} / 10 / 17}; };
    Clock wednesday = [] { return sys_days{year{2026} / 10 / 14}; };
    Clock sunday = [] { return sys_days{year{2026} / 10 / 18}; };
    cout << PriceService(saturday, 10).finalPrice(1000) << "\\n";    // 1100
    cout << PriceService(wednesday, 10).finalPrice(1000) << "\\n";   // 1000
    cout << PriceService(sunday, 10).finalPrice(1000) << "\\n";      // 1100
    cout << PriceService(saturday, 0).finalPrice(1000) << "\\n";     // 1000: the percent is injected too
    // production: a clock that returns floor<days>(system_clock::now())
}` }
      ],
      complexity: `<p>O(1). Hidden dependencies 2 → 0; flaky tests → deterministic.</p>`,
      followUps: ['Which time zone defines "weekend" for a global product? (the hotel\'s, not the server\'s)', 'Where else does hidden global coupling show up? (Random, UUID, environment variables, singletons)']
    }
  });

  /* =====================================================================
     PRACTICE — Hard
     ===================================================================== */
  practice.push({
    title: 'Shotgun surgery: adding a WhatsApp channel touches 5 places',
    level: 'Hard', tags: ['shotgun surgery', 'polymorphism', 'open/closed', 'registry'], companies: ['Twilio', 'Meesho'],
    statement: `<p>A notification module supports <code>"EMAIL"</code> and <code>"SMS"</code>. Knowledge about each channel is spread across a <code>switch</code> in <code>send</code>, a <code>switch</code> in <code>costPaise</code>, an <code>if</code> chain in <code>isValidRecipient</code>, a hard-coded list in the settings page and an enum-like set of string constants. Product wants WhatsApp next quarter and Push after that. Refactor so a new channel is <b>one new class plus one registration line</b>.</p>`,
    constraints: `Email: recipient contains "@", costs 0. SMS: 10 digits, costs 25 paise. WhatsApp: 10 digits, costs 40 paise. Unknown channel id → <code>IllegalArgumentException</code>. Settings page lists channel ids in registration order.`,
    example: `<p><code>send("WHATSAPP", "9876543210", "Hi")</code> → ${H.c('g', '"WHATSAPP to 9876543210: Hi"')}, cost ${H.c('g', '40')}. <code>send("SMS", "asha@x.com", "Hi")</code> → ${H.c('r', 'invalid recipient')}. <code>availableChannels()</code> → [EMAIL, SMS, WHATSAPP].</p>`,
    brute: {
      why: `<p>"What a channel is" is scattered across five places — the definition of <b>shotgun surgery</b>. Adding WhatsApp means finding and editing each switch; missing one gives a runtime <code>default</code> crash or a channel that is sendable but not listed. Stringly-typed ids allow typos ("WHATSAP"). The service also changes for every channel (divergent change), so it grows forever.</p>`,
      code: { lang: 'java', code: `class Notifier {
    static final String EMAIL = "EMAIL", SMS = "SMS";
    String send(String channel, String to, String msg) {
        if (!isValidRecipient(channel, to)) throw new IllegalArgumentException("invalid recipient");
        switch (channel) {
            case EMAIL: return "EMAIL to " + to + ": " + msg;
            case SMS:   return "SMS to " + to + ": " + msg;
            default: throw new IllegalArgumentException(channel);
        }
    }
    int costPaise(String channel) {
        switch (channel) {
            case EMAIL: return 0;
            case SMS:   return 25;
            default: throw new IllegalArgumentException(channel);
        }
    }
    boolean isValidRecipient(String channel, String to) {
        if (channel.equals(EMAIL)) return to.contains("@");
        if (channel.equals(SMS)) return to.matches("[0-9]{10}");
        return false;
    }
    List<String> availableChannels() { return List.of(EMAIL, SMS); }   // 5th place to remember
}`, alt: [
              { lang: 'python', code: `
import re

class Notifier:
    EMAIL, SMS = "EMAIL", "SMS"
    def send(self, channel, to, msg):
        if not self.is_valid_recipient(channel, to): raise ValueError("invalid recipient")
        if channel == Notifier.EMAIL: return f"EMAIL to {to}: {msg}"
        if channel == Notifier.SMS:   return f"SMS to {to}: {msg}"
        raise ValueError(channel)
    def cost_paise(self, channel):
        if channel == Notifier.EMAIL: return 0
        if channel == Notifier.SMS:   return 25
        raise ValueError(channel)
    def is_valid_recipient(self, channel, to):
        if channel == Notifier.EMAIL: return "@" in to
        if channel == Notifier.SMS: return re.fullmatch(r"[0-9]{10}", to) is not None
        return False
    def available_channels(self): return [Notifier.EMAIL, Notifier.SMS]   # 5th place to remember` },
              { lang: 'ts', code: `
class Notifier {
    static readonly EMAIL = "EMAIL"; static readonly SMS = "SMS";
    send(channel: string, to: string, msg: string): string {
        if (!this.isValidRecipient(channel, to)) throw new Error("invalid recipient");
        switch (channel) {
            case Notifier.EMAIL: return "EMAIL to " + to + ": " + msg;
            case Notifier.SMS:   return "SMS to " + to + ": " + msg;
            default: throw new Error(channel);
        }
    }
    costPaise(channel: string): number {
        switch (channel) {
            case Notifier.EMAIL: return 0;
            case Notifier.SMS:   return 25;
            default: throw new Error(channel);
        }
    }
    isValidRecipient(channel: string, to: string): boolean {
        if (channel === Notifier.EMAIL) return to.includes("@");
        if (channel === Notifier.SMS) return /^[0-9]{10}$/.test(to);
        return false;
    }
    availableChannels(): string[] { return [Notifier.EMAIL, Notifier.SMS]; }   // 5th place to remember
}` },
              { lang: 'cpp', code: `
class Notifier {
public:
    static inline const string EMAIL = "EMAIL", SMS = "SMS";
    string send(const string& channel, const string& to, const string& msg) {
        if (!isValidRecipient(channel, to)) throw invalid_argument("invalid recipient");
        if (channel == EMAIL) return "EMAIL to " + to + ": " + msg;
        if (channel == SMS)   return "SMS to " + to + ": " + msg;
        throw invalid_argument(channel);
    }
    int costPaise(const string& channel) {
        if (channel == EMAIL) return 0;
        if (channel == SMS)   return 25;
        throw invalid_argument(channel);
    }
    bool isValidRecipient(const string& channel, const string& to) {
        if (channel == EMAIL) return to.find('@') != string::npos;
        if (channel == SMS) return regex_match(to, regex("[0-9]{10}"));
        return false;
    }
    vector<string> availableChannels() { return {EMAIL, SMS}; }   // 5th place to remember
};` }
            ] }
    },
    mcq: { q: 'Which design turns "add a channel" into a single new class?', options: ['A bigger switch with comments', 'A Channel interface (id, accepts, cost, deliver) plus a registry the service looks up', 'Inheritance: WhatsAppNotifier extends Notifier overriding each method', 'A global static map of lambdas edited in many files'], answer: 1, explain: 'Gather all knowledge about one channel into one class (cures shotgun surgery); the service depends only on the interface and a registry (open for extension, closed for modification).' },
    hints: [
      `<p>Hint 1: Group the scattered facts by channel, not by operation. Everything about SMS (validation, cost, formatting) belongs in one class.</p>`,
      `<p>Hint 2: <code>interface Channel { String id(); boolean accepts(String to); int costPaise(); String deliver(String to, String msg); }</code>. The service holds a <code>LinkedHashMap&lt;String, Channel&gt;</code> built from a list passed to its constructor.</p>`,
      `<p>Hint 3: <code>send</code> = look up (unknown → exception) → check <code>accepts</code> → <code>deliver</code>. <code>availableChannels</code> = the map's keys (registration order). Adding WhatsApp = new class + add it to the list in the wiring code. Reject duplicate ids at registration.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "WHATSAPP to 9876543210: Hi cost 40\nEMAIL to asha@x.com: Hi cost 0\n[EMAIL, SMS, WHATSAPP]\ninvalid recipient for SMS\nunknown channel PUSH\nduplicate channel SMS\n" }] },
    solution: {
      approach: `<p><b>Refactor:</b> Replace Conditional with Polymorphism + Move Method (gather each channel's knowledge into its own class) + a small registry (Open/Closed). The <code>NotificationService</code> no longer changes when channels are added; it only orchestrates lookup → validation → delivery. Channel classes are highly cohesive (everything about one channel) and loosely coupled (the service sees only the interface). The settings list is derived from the registry, so it cannot get out of sync.</p>`,
      code: `interface Channel {
    String id();
    boolean accepts(String recipient);
    int costPaise();
    String deliver(String recipient, String message);
}

final class EmailChannel implements Channel {
    public String id() { return "EMAIL"; }
    public boolean accepts(String r) { return r.contains("@"); }
    public int costPaise() { return 0; }
    public String deliver(String r, String m) { return "EMAIL to " + r + ": " + m; }
}
final class SmsChannel implements Channel {
    public String id() { return "SMS"; }
    public boolean accepts(String r) { return r.matches("[0-9]{10}"); }
    public int costPaise() { return 25; }
    public String deliver(String r, String m) { return "SMS to " + r + ": " + m; }
}
final class WhatsAppChannel implements Channel {          // the NEW channel: one class
    public String id() { return "WHATSAPP"; }
    public boolean accepts(String r) { return r.matches("[0-9]{10}"); }
    public int costPaise() { return 40; }
    public String deliver(String r, String m) { return "WHATSAPP to " + r + ": " + m; }
}

final class NotificationService {
    private final Map<String, Channel> channels = new LinkedHashMap<>();

    NotificationService(List<Channel> available) {
        for (Channel c : available) {
            if (channels.putIfAbsent(c.id(), c) != null) throw new IllegalArgumentException("duplicate channel " + c.id());
        }
    }
    private Channel lookup(String id) {
        Channel c = channels.get(id);
        if (c == null) throw new IllegalArgumentException("unknown channel " + id);
        return c;
    }
    String send(String channelId, String to, String msg) {
        Channel c = lookup(channelId);
        if (!c.accepts(to)) throw new IllegalArgumentException("invalid recipient for " + channelId);
        return c.deliver(to, msg);
    }
    int costPaise(String channelId) { return lookup(channelId).costPaise(); }
    List<String> availableChannels() { return List.copyOf(channels.keySet()); }

    public static void main(String[] args) {
        NotificationService svc = new NotificationService(List.of(new EmailChannel(), new SmsChannel(), new WhatsAppChannel()));
        System.out.println(svc.send("WHATSAPP", "9876543210", "Hi") + " cost " + svc.costPaise("WHATSAPP"));
        System.out.println(svc.send("EMAIL", "asha@x.com", "Hi") + " cost " + svc.costPaise("EMAIL"));
        System.out.println(svc.availableChannels());
        String[][] bad = {{"SMS", "asha@x.com"}, {"PUSH", "9876543210"}};
        for (String[] b : bad) {
            try { svc.send(b[0], b[1], "Hi"); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }
        }
        try { new NotificationService(List.of(new SmsChannel(), new SmsChannel())); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }
    }
}`,
      alt: [
        { lang: 'python', code: `import re
from abc import ABC, abstractmethod


class Channel(ABC):
    @property
    @abstractmethod
    def id(self) -> str: ...

    @abstractmethod
    def accepts(self, recipient: str) -> bool: ...

    @abstractmethod
    def cost_paise(self) -> int: ...

    @abstractmethod
    def deliver(self, recipient: str, message: str) -> str: ...


class EmailChannel(Channel):
    id = "EMAIL"

    def accepts(self, recipient: str) -> bool:
        return "@" in recipient

    def cost_paise(self) -> int:
        return 0

    def deliver(self, recipient: str, message: str) -> str:
        return f"EMAIL to {recipient}: {message}"


class SmsChannel(Channel):
    id = "SMS"

    def accepts(self, recipient: str) -> bool:
        return re.fullmatch(r"[0-9]{10}", recipient) is not None

    def cost_paise(self) -> int:
        return 25

    def deliver(self, recipient: str, message: str) -> str:
        return f"SMS to {recipient}: {message}"


class WhatsAppChannel(Channel):  # the NEW channel: one class
    id = "WHATSAPP"

    def accepts(self, recipient: str) -> bool:
        return re.fullmatch(r"[0-9]{10}", recipient) is not None

    def cost_paise(self) -> int:
        return 40

    def deliver(self, recipient: str, message: str) -> str:
        return f"WHATSAPP to {recipient}: {message}"


class NotificationService:
    def __init__(self, available: list[Channel]) -> None:
        self._channels: dict[str, Channel] = {}  # dicts keep insertion order
        for c in available:
            if c.id in self._channels:
                raise ValueError(f"duplicate channel {c.id}")
            self._channels[c.id] = c

    def _lookup(self, channel_id: str) -> Channel:
        channel = self._channels.get(channel_id)
        if channel is None:
            raise ValueError(f"unknown channel {channel_id}")
        return channel

    def send(self, channel_id: str, to: str, msg: str) -> str:
        channel = self._lookup(channel_id)
        if not channel.accepts(to):
            raise ValueError(f"invalid recipient for {channel_id}")
        return channel.deliver(to, msg)

    def cost_paise(self, channel_id: str) -> int:
        return self._lookup(channel_id).cost_paise()

    def available_channels(self) -> list[str]:
        return list(self._channels)


if __name__ == "__main__":
    svc = NotificationService([EmailChannel(), SmsChannel(), WhatsAppChannel()])
    print(f"{svc.send('WHATSAPP', '9876543210', 'Hi')} cost {svc.cost_paise('WHATSAPP')}")
    print(f"{svc.send('EMAIL', 'asha@x.com', 'Hi')} cost {svc.cost_paise('EMAIL')}")
    print("[" + ", ".join(svc.available_channels()) + "]")
    for channel_id, to in (("SMS", "asha@x.com"), ("PUSH", "9876543210")):
        try:
            svc.send(channel_id, to, "Hi")
        except ValueError as e:
            print(e)
    try:
        NotificationService([SmsChannel(), SmsChannel()])
    except ValueError as e:
        print(e)` },
        { lang: 'ts', code: `interface Channel {
  readonly id: string;
  accepts(recipient: string): boolean;
  costPaise(): number;
  deliver(recipient: string, message: string): string;
}

class EmailChannel implements Channel {
  readonly id = "EMAIL";
  accepts(r: string): boolean { return r.includes("@"); }
  costPaise(): number { return 0; }
  deliver(r: string, m: string): string { return \`EMAIL to \${r}: \${m}\`; }
}
class SmsChannel implements Channel {
  readonly id = "SMS";
  accepts(r: string): boolean { return /^[0-9]{10}$/.test(r); }
  costPaise(): number { return 25; }
  deliver(r: string, m: string): string { return \`SMS to \${r}: \${m}\`; }
}
class WhatsAppChannel implements Channel { // the NEW channel: one class
  readonly id = "WHATSAPP";
  accepts(r: string): boolean { return /^[0-9]{10}$/.test(r); }
  costPaise(): number { return 40; }
  deliver(r: string, m: string): string { return \`WHATSAPP to \${r}: \${m}\`; }
}

class NotificationService {
  private readonly channels = new Map<string, Channel>(); // Map keeps insertion order

  constructor(available: readonly Channel[]) {
    for (const c of available) {
      if (this.channels.has(c.id)) throw new Error(\`duplicate channel \${c.id}\`);
      this.channels.set(c.id, c);
    }
  }
  private lookup(id: string): Channel {
    const c = this.channels.get(id);
    if (c === undefined) throw new Error(\`unknown channel \${id}\`);
    return c;
  }
  send(channelId: string, to: string, msg: string): string {
    const c = this.lookup(channelId);
    if (!c.accepts(to)) throw new Error(\`invalid recipient for \${channelId}\`);
    return c.deliver(to, msg);
  }
  costPaise(channelId: string): number { return this.lookup(channelId).costPaise(); }
  availableChannels(): string[] { return [...this.channels.keys()]; }
}

const svc = new NotificationService([new EmailChannel(), new SmsChannel(), new WhatsAppChannel()]);
console.log(\`\${svc.send("WHATSAPP", "9876543210", "Hi")} cost \${svc.costPaise("WHATSAPP")}\`);
console.log(\`\${svc.send("EMAIL", "asha@x.com", "Hi")} cost \${svc.costPaise("EMAIL")}\`);
console.log(\`[\${svc.availableChannels().join(", ")}]\`);
for (const [channelId, to] of [["SMS", "asha@x.com"], ["PUSH", "9876543210"]]) {
  try {
    svc.send(channelId, to, "Hi");
  } catch (e) {
    console.log((e as Error).message);
  }
}
try {
  new NotificationService([new SmsChannel(), new SmsChannel()]);
} catch (e) {
  console.log((e as Error).message);
}` },
        { lang: 'cpp', code: `class Channel {
public:
    virtual ~Channel() = default;
    virtual string id() const = 0;
    virtual bool accepts(const string& recipient) const = 0;
    virtual int costPaise() const = 0;
    virtual string deliver(const string& recipient, const string& message) const = 0;
};

class EmailChannel : public Channel {
public:
    string id() const override { return "EMAIL"; }
    bool accepts(const string& r) const override { return r.find('@') != string::npos; }
    int costPaise() const override { return 0; }
    string deliver(const string& r, const string& m) const override { return "EMAIL to " + r + ": " + m; }
};
class SmsChannel : public Channel {
public:
    string id() const override { return "SMS"; }
    bool accepts(const string& r) const override { return regex_match(r, regex("[0-9]{10}")); }
    int costPaise() const override { return 25; }
    string deliver(const string& r, const string& m) const override { return "SMS to " + r + ": " + m; }
};
class WhatsAppChannel : public Channel {   // the NEW channel: one class
public:
    string id() const override { return "WHATSAPP"; }
    bool accepts(const string& r) const override { return regex_match(r, regex("[0-9]{10}")); }
    int costPaise() const override { return 40; }
    string deliver(const string& r, const string& m) const override { return "WHATSAPP to " + r + ": " + m; }
};

class NotificationService {
    unordered_map<string, unique_ptr<Channel>> channels_;   // the service owns its channels
    vector<string> order_;                                  // keeps registration order for the settings page

    const Channel& lookup(const string& id) const {
        auto it = channels_.find(id);
        if (it == channels_.end()) throw invalid_argument("unknown channel " + id);
        return *it->second;
    }

public:
    explicit NotificationService(vector<unique_ptr<Channel>> available) {
        for (auto& c : available) {
            string id = c->id();
            if (!channels_.emplace(id, std::move(c)).second) throw invalid_argument("duplicate channel " + id);
            order_.push_back(id);
        }
    }
    string send(const string& channelId, const string& to, const string& msg) const {
        const Channel& c = lookup(channelId);
        if (!c.accepts(to)) throw invalid_argument("invalid recipient for " + channelId);
        return c.deliver(to, msg);
    }
    int costPaise(const string& channelId) const { return lookup(channelId).costPaise(); }
    const vector<string>& availableChannels() const { return order_; }
};

int main() {
    vector<unique_ptr<Channel>> all;
    all.push_back(make_unique<EmailChannel>());
    all.push_back(make_unique<SmsChannel>());
    all.push_back(make_unique<WhatsAppChannel>());
    NotificationService svc(std::move(all));
    cout << svc.send("WHATSAPP", "9876543210", "Hi") << " cost " << svc.costPaise("WHATSAPP") << "\\n";
    cout << svc.send("EMAIL", "asha@x.com", "Hi") << " cost " << svc.costPaise("EMAIL") << "\\n";
    cout << "[";
    for (size_t i = 0; i < svc.availableChannels().size(); i++) cout << (i ? ", " : "") << svc.availableChannels()[i];
    cout << "]\\n";
    for (auto [channelId, to] : vector<pair<string, string>>{{"SMS", "asha@x.com"}, {"PUSH", "9876543210"}}) {
        try {
            svc.send(channelId, to, "Hi");
        } catch (const invalid_argument& e) {
            cout << e.what() << "\\n";
        }
    }
    try {
        vector<unique_ptr<Channel>> twice;
        twice.push_back(make_unique<SmsChannel>());
        twice.push_back(make_unique<SmsChannel>());
        NotificationService dup(std::move(twice));
    } catch (const invalid_argument& e) {
        cout << e.what() << "\\n";
    }
}` }
      ],
      complexity: `<p>Lookup O(1) per send. Places edited per new channel: 5 → 1 class + 1 wiring line. The service class never changes again for new channels.</p>`,
      followUps: ['Channels need different message shapes (email has a subject). How does the interface evolve? (a Message value object; or channel-specific renderers)', 'How would you load channels via ServiceLoader or Spring without the wiring line?', 'Customer preference decides the channel — where does that rule live?']
    }
  });

  practice.push({
    title: 'Split the LibraryManager God class by cohesion',
    level: 'Hard', tags: ['cohesion', 'extract class', 'god class', 'SRP'], companies: ['Microsoft', 'Salesforce'],
    statement: `<p><code>LibraryManager</code> has grown to hold the book catalogue, member registry, loans, fine calculation and reminder text. Every feature edits it; merge conflicts happen weekly. Using a method × field cohesion table, split it into cohesive classes with clear dependencies, keeping the public behaviour of the use-cases below.</p>`,
    constraints: `Use-cases: addBook(isbn, title), registerMember(id, name), borrow(memberId, isbn, onDate), returnBook(isbn, onDate) → fine in rupees (₹5 per day late; loan period 14 days), overdueReminders(onDate) → list of "name: title". A book can be on loan to one member at a time; unknown member/book → <code>IllegalArgumentException</code>.`,
    example: `<p>Borrow "Clean Code" on 2026-10-01, return on 2026-10-20 → 19 days, 5 days late → fine ${H.c('g', '25')}. On 2026-10-16 the reminders list contains ${H.c('g', '"Asha: Clean Code"')}.</p>`,
    brute: {
      why: `<p>One class with five unrelated groups of fields. The method × field table shows disconnected groups: catalogue methods never touch fines; reminder text never touches the catalogue map directly. That is low cohesion (and divergent change: it changes for catalogue rules, fine rules and wording). Every client depends on the whole class, so coupling is high too.</p>`,
      code: { lang: 'java', code: `class LibraryManager {
    final Map<String, String> books = new HashMap<>();          // isbn -> title
    final Map<String, String> members = new HashMap<>();        // id -> name
    final Map<String, String> loanMember = new HashMap<>();     // isbn -> memberId
    final Map<String, LocalDate> loanDate = new HashMap<>();    // isbn -> borrowed on
    final int finePerDay = 5, loanDays = 14;

    void addBook(String isbn, String title) { books.put(isbn, title); }
    void registerMember(String id, String name) { members.put(id, name); }
    void borrow(String memberId, String isbn, LocalDate on) {
        if (!members.containsKey(memberId) || !books.containsKey(isbn)) throw new IllegalArgumentException("unknown");
        if (loanMember.containsKey(isbn)) throw new IllegalStateException("on loan");
        loanMember.put(isbn, memberId); loanDate.put(isbn, on);
    }
    int returnBook(String isbn, LocalDate on) {
        LocalDate from = loanDate.remove(isbn); loanMember.remove(isbn);
        long days = java.time.temporal.ChronoUnit.DAYS.between(from, on);
        return (int) Math.max(0, days - loanDays) * finePerDay;
    }
    List<String> overdueReminders(LocalDate on) {
        List<String> out = new ArrayList<>();
        for (String isbn : loanMember.keySet())
            if (java.time.temporal.ChronoUnit.DAYS.between(loanDate.get(isbn), on) > loanDays)
                out.add(members.get(loanMember.get(isbn)) + ": " + books.get(isbn));
        return out;
    }
}`, alt: [
              { lang: 'python', code: `
class LibraryManager:
    FINE_PER_DAY, LOAN_DAYS = 5, 14
    def __init__(self):
        self.books = {}          # isbn -> title
        self.members = {}        # id -> name
        self.loan_member = {}    # isbn -> member id
        self.loan_date = {}      # isbn -> borrowed on

    def add_book(self, isbn, title): self.books[isbn] = title
    def register_member(self, id, name): self.members[id] = name
    def borrow(self, member_id, isbn, on):
        if member_id not in self.members or isbn not in self.books: raise ValueError("unknown")
        if isbn in self.loan_member: raise RuntimeError("on loan")
        self.loan_member[isbn] = member_id; self.loan_date[isbn] = on
    def return_book(self, isbn, on):
        frm = self.loan_date.pop(isbn); self.loan_member.pop(isbn)
        days = (on - frm).days
        return max(0, days - self.LOAN_DAYS) * self.FINE_PER_DAY
    def overdue_reminders(self, on):
        out = []
        for isbn in self.loan_member:
            if (on - self.loan_date[isbn]).days > self.LOAN_DAYS:
                out.append(self.members[self.loan_member[isbn]] + ": " + self.books[isbn])
        return out` },
              { lang: 'ts', code: `
class LibraryManager {
    readonly books = new Map<string, string>();          // isbn -> title
    readonly members = new Map<string, string>();        // id -> name
    readonly loanMember = new Map<string, string>();     // isbn -> memberId
    readonly loanDate = new Map<string, Date>();         // isbn -> borrowed on
    readonly finePerDay = 5; readonly loanDays = 14;

    addBook(isbn: string, title: string): void { this.books.set(isbn, title); }
    registerMember(id: string, name: string): void { this.members.set(id, name); }
    borrow(memberId: string, isbn: string, on: Date): void {
        if (!this.members.has(memberId) || !this.books.has(isbn)) throw new Error("unknown");
        if (this.loanMember.has(isbn)) throw new Error("on loan");
        this.loanMember.set(isbn, memberId); this.loanDate.set(isbn, on);
    }
    returnBook(isbn: string, on: Date): number {
        const from = this.loanDate.get(isbn)!; this.loanDate.delete(isbn); this.loanMember.delete(isbn);
        const days = Math.floor((on.getTime() - from.getTime()) / 86400000);
        return Math.max(0, days - this.loanDays) * this.finePerDay;
    }
    overdueReminders(on: Date): string[] {
        const out: string[] = [];
        for (const [isbn, mid] of this.loanMember)
            if (Math.floor((on.getTime() - this.loanDate.get(isbn)!.getTime()) / 86400000) > this.loanDays)
                out.push(this.members.get(mid) + ": " + this.books.get(isbn));
        return out;
    }
}` },
              { lang: 'cpp', code: `
class LibraryManager {
public:
    unordered_map<string, string> books;          // isbn -> title
    unordered_map<string, string> members;        // id -> name
    unordered_map<string, string> loanMember;     // isbn -> memberId
    unordered_map<string, int> loanDate;          // isbn -> borrowed on (day number)
    const int finePerDay = 5, loanDays = 14;

    void addBook(const string& isbn, const string& title) { books[isbn] = title; }
    void registerMember(const string& id, const string& name) { members[id] = name; }
    void borrow(const string& memberId, const string& isbn, int on) {
        if (!members.count(memberId) || !books.count(isbn)) throw invalid_argument("unknown");
        if (loanMember.count(isbn)) throw runtime_error("on loan");
        loanMember[isbn] = memberId; loanDate[isbn] = on;
    }
    int returnBook(const string& isbn, int on) {
        int from = loanDate[isbn]; loanDate.erase(isbn); loanMember.erase(isbn);
        int days = on - from;
        return max(0, days - loanDays) * finePerDay;
    }
    vector<string> overdueReminders(int on) {
        vector<string> out;
        for (auto& [isbn, mid] : loanMember)
            if (on - loanDate[isbn] > loanDays)
                out.push_back(members[mid] + ": " + books[isbn]);
        return out;
    }
};` }
            ] }
    },
    mcq: { q: 'In the cohesion table, which methods share the loan fields (loanMember, loanDate)?', options: ['addBook and registerMember', 'borrow, returnBook and overdueReminders', 'Only addBook', 'All methods equally'], answer: 1, explain: 'Those three form the "loans" group. Catalogue (books) and members are separate groups that loans merely look up — so they become separate classes that LoanService depends on.' },
    hints: [
      `<p>Hint 1: Build the table: addBook→books; registerMember→members; borrow/return/overdue→loanMember, loanDate (+ lookups); fine math→finePerDay, loanDays. Groups: Catalog, Members, Loans, FinePolicy.</p>`,
      `<p>Hint 2: <code>Catalog</code> and <code>MemberDirectory</code> own their maps and expose <code>titleOf(isbn)</code>/<code>nameOf(id)</code> that throw on unknown. A <code>record Loan(memberId, isbn, borrowedOn)</code> replaces the two parallel maps (a data clump!).</p>`,
      `<p>Hint 3: <code>FinePolicy</code> knows loan days and rate (<code>fineFor(loan, returnDate)</code>, <code>isOverdue</code>). <code>LoanService</code> depends on Catalog, MemberDirectory and FinePolicy via constructor. A thin <code>Library</code> facade can keep the old API if callers need it.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "[Asha: Clean Code]\n25\n[]\nunknown book 999\nunknown member m9\nalready on loan: 111\nnot on loan: 222\n0\n" }] },
    solution: {
      approach: `<p><b>Analysis:</b> the method × field table splits into four groups → four cohesive classes. Two parallel maps keyed by isbn are a data clump → <code>record Loan</code>. <b>Refactor:</b> Extract Class ×3 (Catalog, MemberDirectory, FinePolicy), Introduce Parameter Object (Loan), Move Method (fine and overdue rules into FinePolicy). <code>LoanService</code> orchestrates, depending on the others through constructor injection. Each class now changes for one reason (fine rules, wording, catalogue rules), merge conflicts drop, and each class is testable alone.</p>`,
      code: `final class Catalog {
    private final Map<String, String> titles = new HashMap<>();
    void add(String isbn, String title) { titles.put(isbn, title); }
    String titleOf(String isbn) {
        String t = titles.get(isbn);
        if (t == null) throw new IllegalArgumentException("unknown book " + isbn);
        return t;
    }
}

final class MemberDirectory {
    private final Map<String, String> names = new HashMap<>();
    void register(String id, String name) { names.put(id, name); }
    String nameOf(String id) {
        String n = names.get(id);
        if (n == null) throw new IllegalArgumentException("unknown member " + id);
        return n;
    }
}

record Loan(String memberId, String isbn, LocalDate borrowedOn) {}

final class FinePolicy {
    private final int loanDays, rupeesPerDay;
    FinePolicy(int loanDays, int rupeesPerDay) { this.loanDays = loanDays; this.rupeesPerDay = rupeesPerDay; }
    private long daysLate(Loan loan, LocalDate on) {
        return Math.max(0, java.time.temporal.ChronoUnit.DAYS.between(loan.borrowedOn(), on) - loanDays);
    }
    int fineFor(Loan loan, LocalDate returnedOn) { return (int) daysLate(loan, returnedOn) * rupeesPerDay; }
    boolean isOverdue(Loan loan, LocalDate on) { return daysLate(loan, on) > 0; }
}

final class LoanService {
    private final Catalog catalog;
    private final MemberDirectory members;
    private final FinePolicy fines;
    private final Map<String, Loan> activeByIsbn = new LinkedHashMap<>();

    LoanService(Catalog catalog, MemberDirectory members, FinePolicy fines) {
        this.catalog = catalog; this.members = members; this.fines = fines;
    }
    void borrow(String memberId, String isbn, LocalDate on) {
        members.nameOf(memberId);            // validates member
        catalog.titleOf(isbn);               // validates book
        if (activeByIsbn.containsKey(isbn)) throw new IllegalStateException("already on loan: " + isbn);
        activeByIsbn.put(isbn, new Loan(memberId, isbn, on));
    }
    int returnBook(String isbn, LocalDate on) {
        Loan loan = activeByIsbn.remove(isbn);
        if (loan == null) throw new IllegalArgumentException("not on loan: " + isbn);
        return fines.fineFor(loan, on);
    }
    List<String> overdueReminders(LocalDate on) {
        List<String> out = new ArrayList<>();
        for (Loan loan : activeByIsbn.values())
            if (fines.isOverdue(loan, on)) out.add(members.nameOf(loan.memberId()) + ": " + catalog.titleOf(loan.isbn()));
        return out;
    }
}

class LibraryDemo {
    public static void main(String[] args) {
        Catalog catalog = new Catalog();
        MemberDirectory members = new MemberDirectory();
        LoanService loans = new LoanService(catalog, members, new FinePolicy(14, 5));
        catalog.add("111", "Clean Code");
        members.register("m1", "Asha");
        loans.borrow("m1", "111", LocalDate.of(2026, 10, 1));
        System.out.println(loans.overdueReminders(LocalDate.of(2026, 10, 16)));   // [Asha: Clean Code]
        System.out.println(loans.returnBook("111", LocalDate.of(2026, 10, 20)));  // 25
        System.out.println(loans.overdueReminders(LocalDate.of(2026, 10, 20)));   // [] (the book is back)
        try { loans.borrow("m1", "999", LocalDate.of(2026, 10, 21)); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }
        try { loans.borrow("m9", "111", LocalDate.of(2026, 10, 21)); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }
        loans.borrow("m1", "111", LocalDate.of(2026, 10, 21));
        try { loans.borrow("m1", "111", LocalDate.of(2026, 10, 22)); } catch (IllegalStateException e) { System.out.println(e.getMessage()); }
        try { loans.returnBook("222", LocalDate.of(2026, 10, 22)); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }
        System.out.println(loans.returnBook("111", LocalDate.of(2026, 10, 25)));  // 0: returned on time
    }
}`,
      alt: [
        { lang: 'python', code: `from dataclasses import dataclass
from datetime import date


class Catalog:
    def __init__(self) -> None:
        self._titles: dict[str, str] = {}

    def add(self, isbn: str, title: str) -> None:
        self._titles[isbn] = title

    def title_of(self, isbn: str) -> str:
        if isbn not in self._titles:
            raise ValueError(f"unknown book {isbn}")
        return self._titles[isbn]


class MemberDirectory:
    def __init__(self) -> None:
        self._names: dict[str, str] = {}

    def register(self, member_id: str, name: str) -> None:
        self._names[member_id] = name

    def name_of(self, member_id: str) -> str:
        if member_id not in self._names:
            raise ValueError(f"unknown member {member_id}")
        return self._names[member_id]


@dataclass(frozen=True)
class Loan:
    member_id: str
    isbn: str
    borrowed_on: date


class FinePolicy:
    def __init__(self, loan_days: int, rupees_per_day: int) -> None:
        self._loan_days = loan_days
        self._rupees_per_day = rupees_per_day

    def _days_late(self, loan: Loan, on: date) -> int:
        return max(0, (on - loan.borrowed_on).days - self._loan_days)

    def fine_for(self, loan: Loan, returned_on: date) -> int:
        return self._days_late(loan, returned_on) * self._rupees_per_day

    def is_overdue(self, loan: Loan, on: date) -> bool:
        return self._days_late(loan, on) > 0


class LoanService:
    def __init__(self, catalog: Catalog, members: MemberDirectory, fines: FinePolicy) -> None:
        self._catalog = catalog
        self._members = members
        self._fines = fines
        self._active_by_isbn: dict[str, Loan] = {}

    def borrow(self, member_id: str, isbn: str, on: date) -> None:
        self._members.name_of(member_id)  # validates member
        self._catalog.title_of(isbn)  # validates book
        if isbn in self._active_by_isbn:
            raise RuntimeError(f"already on loan: {isbn}")
        self._active_by_isbn[isbn] = Loan(member_id, isbn, on)

    def return_book(self, isbn: str, on: date) -> int:
        loan = self._active_by_isbn.pop(isbn, None)
        if loan is None:
            raise ValueError(f"not on loan: {isbn}")
        return self._fines.fine_for(loan, on)

    def overdue_reminders(self, on: date) -> list[str]:
        return [
            f"{self._members.name_of(loan.member_id)}: {self._catalog.title_of(loan.isbn)}"
            for loan in self._active_by_isbn.values()
            if self._fines.is_overdue(loan, on)
        ]


def attempt(action) -> None:
    try:
        action()
    except (ValueError, RuntimeError) as e:
        print(e)


if __name__ == "__main__":
    catalog = Catalog()
    members = MemberDirectory()
    loans = LoanService(catalog, members, FinePolicy(14, 5))
    catalog.add("111", "Clean Code")
    members.register("m1", "Asha")
    loans.borrow("m1", "111", date(2026, 10, 1))
    print("[" + ", ".join(loans.overdue_reminders(date(2026, 10, 16))) + "]")  # [Asha: Clean Code]
    print(loans.return_book("111", date(2026, 10, 20)))  # 25
    print("[" + ", ".join(loans.overdue_reminders(date(2026, 10, 20))) + "]")  # [] (the book is back)
    attempt(lambda: loans.borrow("m1", "999", date(2026, 10, 21)))
    attempt(lambda: loans.borrow("m9", "111", date(2026, 10, 21)))
    loans.borrow("m1", "111", date(2026, 10, 21))
    attempt(lambda: loans.borrow("m1", "111", date(2026, 10, 22)))
    attempt(lambda: loans.return_book("222", date(2026, 10, 22)))
    print(loans.return_book("111", date(2026, 10, 25)))  # 0: returned on time` },
        { lang: 'ts', code: `// A calendar day as whole days since 1970-01-01 (UTC), so subtracting two days gives the days between them.
type Day = number;
const day = (year: number, month: number, date: number): Day => Date.UTC(year, month - 1, date) / 86_400_000;

class Catalog {
  private readonly titles = new Map<string, string>();
  add(isbn: string, title: string): void { this.titles.set(isbn, title); }
  titleOf(isbn: string): string {
    const t = this.titles.get(isbn);
    if (t === undefined) throw new Error(\`unknown book \${isbn}\`);
    return t;
  }
}

class MemberDirectory {
  private readonly names = new Map<string, string>();
  register(id: string, name: string): void { this.names.set(id, name); }
  nameOf(id: string): string {
    const n = this.names.get(id);
    if (n === undefined) throw new Error(\`unknown member \${id}\`);
    return n;
  }
}

interface Loan { readonly memberId: string; readonly isbn: string; readonly borrowedOn: Day; }

class FinePolicy {
  constructor(private readonly loanDays: number, private readonly rupeesPerDay: number) {}
  private daysLate(loan: Loan, on: Day): number { return Math.max(0, on - loan.borrowedOn - this.loanDays); }
  fineFor(loan: Loan, returnedOn: Day): number { return this.daysLate(loan, returnedOn) * this.rupeesPerDay; }
  isOverdue(loan: Loan, on: Day): boolean { return this.daysLate(loan, on) > 0; }
}

class LoanService {
  private readonly activeByIsbn = new Map<string, Loan>();

  constructor(
    private readonly catalog: Catalog,
    private readonly members: MemberDirectory,
    private readonly fines: FinePolicy,
  ) {}

  borrow(memberId: string, isbn: string, on: Day): void {
    this.members.nameOf(memberId); // validates member
    this.catalog.titleOf(isbn); // validates book
    if (this.activeByIsbn.has(isbn)) throw new Error(\`already on loan: \${isbn}\`);
    this.activeByIsbn.set(isbn, { memberId, isbn, borrowedOn: on });
  }
  returnBook(isbn: string, on: Day): number {
    const loan = this.activeByIsbn.get(isbn);
    if (loan === undefined) throw new Error(\`not on loan: \${isbn}\`);
    this.activeByIsbn.delete(isbn);
    return this.fines.fineFor(loan, on);
  }
  overdueReminders(on: Day): string[] {
    return [...this.activeByIsbn.values()]
      .filter((loan) => this.fines.isOverdue(loan, on))
      .map((loan) => \`\${this.members.nameOf(loan.memberId)}: \${this.catalog.titleOf(loan.isbn)}\`);
  }
}

function attempt(action: () => void): void {
  try {
    action();
  } catch (e) {
    console.log((e as Error).message);
  }
}

const catalog = new Catalog();
const members = new MemberDirectory();
const loans = new LoanService(catalog, members, new FinePolicy(14, 5));
catalog.add("111", "Clean Code");
members.register("m1", "Asha");
loans.borrow("m1", "111", day(2026, 10, 1));
console.log(\`[\${loans.overdueReminders(day(2026, 10, 16)).join(", ")}]\`); // [Asha: Clean Code]
console.log(loans.returnBook("111", day(2026, 10, 20))); // 25
console.log(\`[\${loans.overdueReminders(day(2026, 10, 20)).join(", ")}]\`); // [] (the book is back)
attempt(() => loans.borrow("m1", "999", day(2026, 10, 21)));
attempt(() => loans.borrow("m9", "111", day(2026, 10, 21)));
loans.borrow("m1", "111", day(2026, 10, 21));
attempt(() => loans.borrow("m1", "111", day(2026, 10, 22)));
attempt(() => loans.returnBook("222", day(2026, 10, 22)));
console.log(loans.returnBook("111", day(2026, 10, 25))); // 0: returned on time` },
        { lang: 'cpp', code: `using Day = chrono::sys_days;
static Day day(int y, unsigned m, unsigned d) { return Day{chrono::year{y} / chrono::month{m} / chrono::day{d}}; }

class Catalog {
    map<string, string> titles_;
public:
    void add(const string& isbn, const string& title) { titles_[isbn] = title; }
    const string& titleOf(const string& isbn) const {
        auto it = titles_.find(isbn);
        if (it == titles_.end()) throw invalid_argument("unknown book " + isbn);
        return it->second;
    }
};

class MemberDirectory {
    map<string, string> names_;
public:
    void registerMember(const string& id, const string& name) { names_[id] = name; }   // "register" is a reserved word
    const string& nameOf(const string& id) const {
        auto it = names_.find(id);
        if (it == names_.end()) throw invalid_argument("unknown member " + id);
        return it->second;
    }
};

struct Loan {
    string memberId;
    string isbn;
    Day borrowedOn;
};

class FinePolicy {
    int loanDays_, rupeesPerDay_;
    long daysLate(const Loan& loan, Day on) const { return max(0L, static_cast<long>((on - loan.borrowedOn).count()) - loanDays_); }
public:
    FinePolicy(int loanDays, int rupeesPerDay) : loanDays_(loanDays), rupeesPerDay_(rupeesPerDay) {}
    int fineFor(const Loan& loan, Day returnedOn) const { return static_cast<int>(daysLate(loan, returnedOn)) * rupeesPerDay_; }
    bool isOverdue(const Loan& loan, Day on) const { return daysLate(loan, on) > 0; }
};

class LoanService {
    const Catalog& catalog_;
    const MemberDirectory& members_;
    const FinePolicy& fines_;
    vector<Loan> active_;   // in borrowing order, one entry per book on loan

    vector<Loan>::iterator find(const string& isbn) {
        return find_if(active_.begin(), active_.end(), [&](const Loan& l) { return l.isbn == isbn; });
    }

public:
    LoanService(const Catalog& catalog, const MemberDirectory& members, const FinePolicy& fines)
        : catalog_(catalog), members_(members), fines_(fines) {}

    void borrow(const string& memberId, const string& isbn, Day on) {
        members_.nameOf(memberId);   // validates member
        catalog_.titleOf(isbn);      // validates book
        if (find(isbn) != active_.end()) throw logic_error("already on loan: " + isbn);
        active_.push_back({memberId, isbn, on});
    }
    int returnBook(const string& isbn, Day on) {
        auto it = find(isbn);
        if (it == active_.end()) throw invalid_argument("not on loan: " + isbn);
        Loan loan = *it;
        active_.erase(it);
        return fines_.fineFor(loan, on);
    }
    vector<string> overdueReminders(Day on) const {
        vector<string> out;
        for (const Loan& loan : active_)
            if (fines_.isOverdue(loan, on)) out.push_back(members_.nameOf(loan.memberId) + ": " + catalog_.titleOf(loan.isbn));
        return out;
    }
};

static string show(const vector<string>& items) {
    string out = "[";
    for (size_t i = 0; i < items.size(); i++) out += (i ? ", " : "") + items[i];
    return out + "]";
}

static void attempt(const function<void()>& action) {
    try {
        action();
    } catch (const exception& e) {
        cout << e.what() << "\\n";
    }
}

int main() {
    Catalog catalog;
    MemberDirectory members;
    FinePolicy policy(14, 5);
    LoanService loans(catalog, members, policy);
    catalog.add("111", "Clean Code");
    members.registerMember("m1", "Asha");
    loans.borrow("m1", "111", day(2026, 10, 1));
    cout << show(loans.overdueReminders(day(2026, 10, 16))) << "\\n";   // [Asha: Clean Code]
    cout << loans.returnBook("111", day(2026, 10, 20)) << "\\n";        // 25
    cout << show(loans.overdueReminders(day(2026, 10, 20))) << "\\n";   // [] (the book is back)
    attempt([&] { loans.borrow("m1", "999", day(2026, 10, 21)); });
    attempt([&] { loans.borrow("m9", "111", day(2026, 10, 21)); });
    loans.borrow("m1", "111", day(2026, 10, 21));
    attempt([&] { loans.borrow("m1", "111", day(2026, 10, 22)); });
    attempt([&] { loans.returnBook("222", day(2026, 10, 22)); });
    cout << loans.returnBook("111", day(2026, 10, 25)) << "\\n";        // 0: returned on time
}` }
      ],
      complexity: `<p>All operations O(1) except reminders O(active loans) — same as before. LCOM: 1 class with 4 disconnected groups → 4 classes with 1 group each.</p>`,
      followUps: ['Members can borrow max 3 books — which class owns that rule?', 'Reminders must be emailed — where does the mailer dependency go? (a ReminderJob using LoanService, not inside it)', 'Draw the new dependency graph. Is there any cycle?']
    }
  });

  practice.push({
    title: 'Refactor legacy pricing safely with characterization tests',
    level: 'Hard', tags: ['characterization tests', 'refactoring', 'legacy code', 'small functions'], companies: ['JPMorgan', 'Barclays'],
    statement: `<p>You inherit <code>LegacyPricing.price(unit, qty, tier, coupon)</code>: 25 lines of nested conditions, no tests, and nobody remembers the rules. A known quirk: the bulk discount (₹50 off for 10+ items) is applied <i>after</i> the coupon, and the total is clamped at 0. Business says <b>do not change any output</b>. Pin the behaviour, then restructure it into small named steps.</p>`,
    constraints: `tier ∈ {"GOLD", "SILVER", null, unknown string}; coupon ∈ {"FLAT100", "PCTnn", null, unknown}. Integer rupees. Outputs must be identical for all pinned cases, including nulls and unknown codes.`,
    example: `<p>(unit 100, qty 10, GOLD, "FLAT100") → 1000 → 900 (gold) → 800 (coupon, since 900 &gt; 500) → ${H.c('g', '750')} (bulk). (60, 1, null, "FLAT100") → 60 (coupon needs &gt; 500) → ${H.c('g', '60')}.</p>`,
    brute: {
      why: `<p>The legacy method mixes four rules in one nested block, uses magic numbers and string checks, and has no tests — so nobody dares to change it. "Rewrite it cleanly from the spec" is the tempting brute force, but there is no reliable spec; a rewrite would silently drop quirks (ordering, clamping, unknown-code handling) that customers depend on.</p>`,
      code: { lang: 'java', code: `class LegacyPricing {
    static int price(int unit, int qty, String tier, String coupon) {
        int t = unit * qty;
        if (tier != null) {
            if (tier.equals("GOLD")) {
                t = t - t * 10 / 100;
            } else {
                if (tier.equals("SILVER")) {
                    t = t - t * 5 / 100;
                }
            }
        }
        if (coupon != null) {
            if (coupon.equals("FLAT100")) {
                if (t > 500) {
                    t = t - 100;
                }
            } else if (coupon.startsWith("PCT")) {
                t = t - t * Integer.parseInt(coupon.substring(3)) / 100;
            }
        }
        if (qty >= 10) t = t - 50;
        if (t < 0) t = 0;
        return t;
    }
}`, alt: [
              { lang: 'python', code: `
class LegacyPricing:
    @staticmethod
    def price(unit, qty, tier, coupon):
        t = unit * qty
        if tier is not None:
            if tier == "GOLD":
                t = t - t * 10 // 100
            else:
                if tier == "SILVER":
                    t = t - t * 5 // 100
        if coupon is not None:
            if coupon == "FLAT100":
                if t > 500:
                    t = t - 100
            elif coupon.startswith("PCT"):
                t = t - t * int(coupon[3:]) // 100
        if qty >= 10: t = t - 50
        if t < 0: t = 0
        return t` },
              { lang: 'ts', code: `
class LegacyPricing {
    static price(unit: number, qty: number, tier: string | null, coupon: string | null): number {
        let t = unit * qty;
        if (tier !== null) {
            if (tier === "GOLD") {
                t = t - Math.floor(t * 10 / 100);
            } else {
                if (tier === "SILVER") {
                    t = t - Math.floor(t * 5 / 100);
                }
            }
        }
        if (coupon !== null) {
            if (coupon === "FLAT100") {
                if (t > 500) {
                    t = t - 100;
                }
            } else if (coupon.startsWith("PCT")) {
                t = t - Math.floor(t * parseInt(coupon.substring(3)) / 100);
            }
        }
        if (qty >= 10) t = t - 50;
        if (t < 0) t = 0;
        return t;
    }
}` },
              { lang: 'cpp', code: `
class LegacyPricing {
public:
    static int price(int unit, int qty, const string& tier, const string& coupon) {
        int t = unit * qty;
        if (!tier.empty()) {
            if (tier == "GOLD") {
                t = t - t * 10 / 100;
            } else {
                if (tier == "SILVER") {
                    t = t - t * 5 / 100;
                }
            }
        }
        if (!coupon.empty()) {
            if (coupon == "FLAT100") {
                if (t > 500) {
                    t = t - 100;
                }
            } else if (coupon.rfind("PCT", 0) == 0) {
                t = t - t * stoi(coupon.substr(3)) / 100;
            }
        }
        if (qty >= 10) t = t - 50;
        if (t < 0) t = 0;
        return t;
    }
};` }
            ] }
    },
    mcq: { q: 'You notice the bulk discount after the coupon "looks wrong". What do you do during the refactor?', options: ['Fix it quietly while refactoring', 'Keep it exactly, pin it with a test, and raise it with the business as a separate change', 'Delete the bulk discount', 'Make it configurable'], answer: 1, explain: 'Refactoring never changes behaviour. A suspected bug is a separate, explicit change with its own approval and test update ("two hats").' },
    hints: [
      `<p>Hint 1: Characterization first: pick inputs that cover each branch and boundary (GOLD/SILVER/null/unknown tier, FLAT100 at 500 and 501, PCT10, unknown coupon, qty 9/10, a case that clamps to 0) and record the current outputs.</p>`,
      `<p>Hint 2: Flatten with Extract Method: <code>applyTier</code>, <code>applyCoupon</code>, <code>applyBulk</code>, <code>clampAtZero</code>, called in the same order. Replace magic numbers with constants.</p>`,
      `<p>Hint 3: Use <code>"GOLD".equals(tier)</code> style to keep null-safety identical. Run the pinned table after each step; finish with a loop that compares old vs new for every case.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "all 8 pinned cases identical\nmalformed coupon rejected by both\n" }] },
    solution: {
      approach: `<p><b>Step 1 — pin behaviour:</b> a table of inputs covering every branch and boundary, with outputs recorded from the legacy code (the demo also compares old vs new live). <b>Step 2 — refactor in tiny steps</b>, re-running the table each time: Extract Method for each rule, Replace Nested Conditional with Guard Clauses inside each step, Replace Magic Number with Constant. The pipeline <code>applyTier → applyCoupon → applyBulk → clamp</code> now documents the quirky order explicitly, ready for a separate, approved behaviour change if the business wants one.</p>`,
      code: `final class LegacyPricing {   // kept only to prove equivalence
    static int price(int unit, int qty, String tier, String coupon) {
        int t = unit * qty;
        if (tier != null) { if (tier.equals("GOLD")) t = t - t * 10 / 100; else if (tier.equals("SILVER")) t = t - t * 5 / 100; }
        if (coupon != null) {
            if (coupon.equals("FLAT100")) { if (t > 500) t = t - 100; }
            else if (coupon.startsWith("PCT")) t = t - t * Integer.parseInt(coupon.substring(3)) / 100;
        }
        if (qty >= 10) t = t - 50;
        if (t < 0) t = 0;
        return t;
    }
}

final class Pricing {
    static final int GOLD_PERCENT = 10, SILVER_PERCENT = 5;
    static final int FLAT_COUPON_OFF = 100, FLAT_COUPON_MIN_TOTAL = 500;
    static final int BULK_MIN_QTY = 10, BULK_OFF = 50;

    static int price(int unit, int qty, String tier, String coupon) {
        int total = unit * qty;
        total = applyTier(total, tier);
        total = applyCoupon(total, coupon);
        total = applyBulk(total, qty);          // NOTE: after coupon — existing behaviour, pinned by tests
        return Math.max(0, total);
    }

    private static int percentOff(int amount, int percent) { return amount - amount * percent / 100; }

    private static int applyTier(int total, String tier) {
        if ("GOLD".equals(tier))   return percentOff(total, GOLD_PERCENT);
        if ("SILVER".equals(tier)) return percentOff(total, SILVER_PERCENT);
        return total;                            // null or unknown tier: no discount
    }

    private static int applyCoupon(int total, String coupon) {
        if (coupon == null) return total;
        if (coupon.equals("FLAT100")) return total > FLAT_COUPON_MIN_TOTAL ? total - FLAT_COUPON_OFF : total;
        if (coupon.startsWith("PCT")) return percentOff(total, Integer.parseInt(coupon.substring(3)));
        return total;                            // unknown coupon: ignored
    }

    private static int applyBulk(int total, int qty) { return qty >= BULK_MIN_QTY ? total - BULK_OFF : total; }
}

class PricingCharacterization {
    public static void main(String[] args) {
        Object[][] cases = {
            {100, 10, "GOLD", "FLAT100", 750}, {60, 1, null, "FLAT100", 60}, {501, 1, null, "FLAT100", 401},
            {500, 1, null, "FLAT100", 500}, {200, 3, "SILVER", "PCT10", 513}, {10, 10, "GOLD", null, 40},
            {3, 10, null, "PCT50", 0}, {100, 9, "BRONZE", "XYZ", 900}
        };
        for (Object[] c : cases) {
            int unit = (Integer) c[0], qty = (Integer) c[1], expected = (Integer) c[4];
            String tier = (String) c[2], coupon = (String) c[3];
            int legacy = LegacyPricing.price(unit, qty, tier, coupon);
            int clean = Pricing.price(unit, qty, tier, coupon);
            if (legacy != expected || clean != expected) throw new AssertionError(Arrays.toString(c) + " legacy=" + legacy + " clean=" + clean);
        }
        System.out.println("all " + cases.length + " pinned cases identical");

        int rejected = 0;                       // a malformed coupon fails the same way before and after
        try { LegacyPricing.price(100, 1, null, "PCTabc"); } catch (NumberFormatException e) { rejected++; }
        try { Pricing.price(100, 1, null, "PCTabc"); } catch (NumberFormatException e) { rejected++; }
        System.out.println(rejected == 2 ? "malformed coupon rejected by both" : "behaviour differs");
    }
}`,
      alt: [
        { lang: 'python', code: `from typing import Optional


class LegacyPricing:  # kept only to prove equivalence
    @staticmethod
    def price(unit: int, qty: int, tier: Optional[str], coupon: Optional[str]) -> int:
        t = unit * qty
        if tier is not None:
            if tier == "GOLD":
                t = t - t * 10 // 100
            elif tier == "SILVER":
                t = t - t * 5 // 100
        if coupon is not None:
            if coupon == "FLAT100":
                if t > 500:
                    t = t - 100
            elif coupon.startswith("PCT"):
                t = t - t * int(coupon[3:]) // 100
        if qty >= 10:
            t = t - 50
        if t < 0:
            t = 0
        return t


class Pricing:
    GOLD_PERCENT = 10
    SILVER_PERCENT = 5
    FLAT_COUPON_OFF = 100
    FLAT_COUPON_MIN_TOTAL = 500
    BULK_MIN_QTY = 10
    BULK_OFF = 50

    @classmethod
    def price(cls, unit: int, qty: int, tier: Optional[str], coupon: Optional[str]) -> int:
        total = unit * qty
        total = cls._apply_tier(total, tier)
        total = cls._apply_coupon(total, coupon)
        total = cls._apply_bulk(total, qty)  # NOTE: after coupon, existing behaviour pinned by tests
        return max(0, total)

    @staticmethod
    def _percent_off(amount: int, percent: int) -> int:
        return amount - amount * percent // 100

    @classmethod
    def _apply_tier(cls, total: int, tier: Optional[str]) -> int:
        if tier == "GOLD":
            return cls._percent_off(total, cls.GOLD_PERCENT)
        if tier == "SILVER":
            return cls._percent_off(total, cls.SILVER_PERCENT)
        return total  # None or unknown tier: no discount

    @classmethod
    def _apply_coupon(cls, total: int, coupon: Optional[str]) -> int:
        if coupon is None:
            return total
        if coupon == "FLAT100":
            return total - cls.FLAT_COUPON_OFF if total > cls.FLAT_COUPON_MIN_TOTAL else total
        if coupon.startswith("PCT"):
            return cls._percent_off(total, int(coupon[3:]))
        return total  # unknown coupon: ignored

    @classmethod
    def _apply_bulk(cls, total: int, qty: int) -> int:
        return total - cls.BULK_OFF if qty >= cls.BULK_MIN_QTY else total


if __name__ == "__main__":
    cases = [
        (100, 10, "GOLD", "FLAT100", 750), (60, 1, None, "FLAT100", 60), (501, 1, None, "FLAT100", 401),
        (500, 1, None, "FLAT100", 500), (200, 3, "SILVER", "PCT10", 513), (10, 10, "GOLD", None, 40),
        (3, 10, None, "PCT50", 0), (100, 9, "BRONZE", "XYZ", 900),
    ]
    for unit, qty, tier, coupon, expected in cases:
        legacy = LegacyPricing.price(unit, qty, tier, coupon)
        clean = Pricing.price(unit, qty, tier, coupon)
        if legacy != expected or clean != expected:
            raise AssertionError(f"{(unit, qty, tier, coupon)} legacy={legacy} clean={clean}")
    print(f"all {len(cases)} pinned cases identical")

    rejected = 0  # a malformed coupon fails the same way before and after
    for price in (LegacyPricing.price, Pricing.price):
        try:
            price(100, 1, None, "PCTabc")
        except ValueError:
            rejected += 1
    print("malformed coupon rejected by both" if rejected == 2 else "behaviour differs")` },
        { lang: 'ts', code: `function parseIntStrict(s: string): number {
  if (!/^[+-]?[0-9]+$/.test(s)) throw new SyntaxError(\`not a number: \${s}\`);
  return Number(s);
}

class LegacyPricing { // kept only to prove equivalence
  static price(unit: number, qty: number, tier: string | null, coupon: string | null): number {
    let t = unit * qty;
    if (tier !== null) {
      if (tier === "GOLD") t = t - Math.floor((t * 10) / 100);
      else if (tier === "SILVER") t = t - Math.floor((t * 5) / 100);
    }
    if (coupon !== null) {
      if (coupon === "FLAT100") {
        if (t > 500) t = t - 100;
      } else if (coupon.startsWith("PCT")) {
        t = t - Math.floor((t * parseIntStrict(coupon.substring(3))) / 100);
      }
    }
    if (qty >= 10) t = t - 50;
    if (t < 0) t = 0;
    return t;
  }
}

class Pricing {
  static readonly GOLD_PERCENT = 10;
  static readonly SILVER_PERCENT = 5;
  static readonly FLAT_COUPON_OFF = 100;
  static readonly FLAT_COUPON_MIN_TOTAL = 500;
  static readonly BULK_MIN_QTY = 10;
  static readonly BULK_OFF = 50;

  static price(unit: number, qty: number, tier: string | null, coupon: string | null): number {
    let total = unit * qty;
    total = Pricing.applyTier(total, tier);
    total = Pricing.applyCoupon(total, coupon);
    total = Pricing.applyBulk(total, qty); // NOTE: after coupon, existing behaviour pinned by tests
    return Math.max(0, total);
  }

  private static percentOff(amount: number, percent: number): number {
    return amount - Math.floor((amount * percent) / 100);
  }

  private static applyTier(total: number, tier: string | null): number {
    if (tier === "GOLD") return Pricing.percentOff(total, Pricing.GOLD_PERCENT);
    if (tier === "SILVER") return Pricing.percentOff(total, Pricing.SILVER_PERCENT);
    return total; // null or unknown tier: no discount
  }

  private static applyCoupon(total: number, coupon: string | null): number {
    if (coupon === null) return total;
    if (coupon === "FLAT100") return total > Pricing.FLAT_COUPON_MIN_TOTAL ? total - Pricing.FLAT_COUPON_OFF : total;
    if (coupon.startsWith("PCT")) return Pricing.percentOff(total, parseIntStrict(coupon.substring(3)));
    return total; // unknown coupon: ignored
  }

  private static applyBulk(total: number, qty: number): number {
    return qty >= Pricing.BULK_MIN_QTY ? total - Pricing.BULK_OFF : total;
  }
}

type PinnedCase = [unit: number, qty: number, tier: string | null, coupon: string | null, expected: number];
const cases: PinnedCase[] = [
  [100, 10, "GOLD", "FLAT100", 750], [60, 1, null, "FLAT100", 60], [501, 1, null, "FLAT100", 401],
  [500, 1, null, "FLAT100", 500], [200, 3, "SILVER", "PCT10", 513], [10, 10, "GOLD", null, 40],
  [3, 10, null, "PCT50", 0], [100, 9, "BRONZE", "XYZ", 900],
];
for (const [unit, qty, tier, coupon, expected] of cases) {
  const legacy = LegacyPricing.price(unit, qty, tier, coupon);
  const clean = Pricing.price(unit, qty, tier, coupon);
  if (legacy !== expected || clean !== expected) {
    throw new Error(\`\${JSON.stringify([unit, qty, tier, coupon])} legacy=\${legacy} clean=\${clean}\`);
  }
}
console.log(\`all \${cases.length} pinned cases identical\`);

let rejected = 0; // a malformed coupon fails the same way before and after
for (const price of [LegacyPricing.price, Pricing.price]) {
  try {
    price(100, 1, null, "PCTabc");
  } catch (e) {
    if (e instanceof SyntaxError) rejected++;
  }
}
console.log(rejected === 2 ? "malformed coupon rejected by both" : "behaviour differs");` },
        { lang: 'cpp', code: `class LegacyPricing {   // kept only to prove equivalence
public:
    static int price(int unit, int qty, const optional<string>& tier, const optional<string>& coupon) {
        int t = unit * qty;
        if (tier) { if (*tier == "GOLD") t = t - t * 10 / 100; else if (*tier == "SILVER") t = t - t * 5 / 100; }
        if (coupon) {
            if (*coupon == "FLAT100") { if (t > 500) t = t - 100; }
            else if (coupon->rfind("PCT", 0) == 0) t = t - t * stoi(coupon->substr(3)) / 100;
        }
        if (qty >= 10) t = t - 50;
        if (t < 0) t = 0;
        return t;
    }
};

class Pricing {
    static constexpr int GOLD_PERCENT = 10, SILVER_PERCENT = 5;
    static constexpr int FLAT_COUPON_OFF = 100, FLAT_COUPON_MIN_TOTAL = 500;
    static constexpr int BULK_MIN_QTY = 10, BULK_OFF = 50;

    static int percentOff(int amount, int percent) { return amount - amount * percent / 100; }

    static int applyTier(int total, const optional<string>& tier) {
        if (tier == "GOLD") return percentOff(total, GOLD_PERCENT);
        if (tier == "SILVER") return percentOff(total, SILVER_PERCENT);
        return total;   // no tier or unknown tier: no discount
    }

    static int applyCoupon(int total, const optional<string>& coupon) {
        if (!coupon) return total;
        if (*coupon == "FLAT100") return total > FLAT_COUPON_MIN_TOTAL ? total - FLAT_COUPON_OFF : total;
        if (coupon->rfind("PCT", 0) == 0) return percentOff(total, stoi(coupon->substr(3)));
        return total;   // unknown coupon: ignored
    }

    static int applyBulk(int total, int qty) { return qty >= BULK_MIN_QTY ? total - BULK_OFF : total; }

public:
    static int price(int unit, int qty, const optional<string>& tier, const optional<string>& coupon) {
        int total = unit * qty;
        total = applyTier(total, tier);
        total = applyCoupon(total, coupon);
        total = applyBulk(total, qty);   // NOTE: after coupon, existing behaviour pinned by tests
        return max(0, total);
    }
};

struct PinnedCase {
    int unit, qty;
    optional<string> tier, coupon;
    int expected;
};

int main() {
    vector<PinnedCase> cases{
        {100, 10, "GOLD", "FLAT100", 750}, {60, 1, nullopt, "FLAT100", 60}, {501, 1, nullopt, "FLAT100", 401},
        {500, 1, nullopt, "FLAT100", 500}, {200, 3, "SILVER", "PCT10", 513}, {10, 10, "GOLD", nullopt, 40},
        {3, 10, nullopt, "PCT50", 0}, {100, 9, "BRONZE", "XYZ", 900},
    };
    for (const PinnedCase& c : cases) {
        int legacy = LegacyPricing::price(c.unit, c.qty, c.tier, c.coupon);
        int clean = Pricing::price(c.unit, c.qty, c.tier, c.coupon);
        if (legacy != c.expected || clean != c.expected) {
            throw runtime_error("pinned case failed: legacy=" + to_string(legacy) + " clean=" + to_string(clean));
        }
    }
    cout << "all " << cases.size() << " pinned cases identical\\n";

    int rejected = 0;   // a malformed coupon fails the same way before and after
    try { LegacyPricing::price(100, 1, nullopt, "PCTabc"); } catch (const invalid_argument&) { rejected++; }
    try { Pricing::price(100, 1, nullopt, "PCTabc"); } catch (const invalid_argument&) { rejected++; }
    cout << (rejected == 2 ? "malformed coupon rejected by both" : "behaviour differs") << "\\n";
}` }
      ],
      complexity: `<p>O(1) per price. Max nesting 4 → 1; one 25-line method → five methods of 1-5 lines. Most important "metric": 8 pinned cases now guard every future change.</p>`,
      followUps: ['How would you find inputs that cover all branches in a bigger legacy method? (coverage tools, approval tests with generated inputs)', 'The business decides bulk should apply before the coupon. What changes, and in which commit?', 'What if Integer.parseInt fails for "PCTabc"? Should the refactor change that? (No — pin it, then decide)']
    }
  });

  practice.push({
    title: 'Game characters: fragile base class and class explosion',
    level: 'Hard', tags: ['composition over inheritance', 'decorator', 'strategy', 'fragile base class'], companies: ['Ubisoft', 'Unity', 'Amazon'],
    statement: `<p>A game uses inheritance: <code>Character → Warrior → FireWarrior</code>, <code>Character → Mage → FlyingMage</code>, … The base class's <code>attack()</code> calls an overridable <code>bonus()</code>; a subclass overrode <code>bonus()</code> to call <code>attack()</code> for a "combo" — infinite recursion in production. Designers also want temporary buffs (fire enchant, rage) that stack on any character, and to swap weapons mid-fight. Redesign with composition.</p>`,
    constraints: `Damage = weapon base damage + sum of active buff bonuses (buffs stack, can be added and removed). Abilities (fly, heal…) are a set any character can have. Swapping weapons must work at runtime. No class per combination.`,
    example: `<p>Asha with Sword (10) → ${H.c('g', '10')}. Add FireEnchant (+5) and Rage (+3) → ${H.c('g', '18')}. Swap to Bow (7) with buffs kept → ${H.c('g', '15')}. Remove Rage → ${H.c('g', '12')}. Abilities [FLY, HEAL] work for any class.</p>`,
    brute: {
      why: `<p>Two problems from inheritance. (1) <b>Fragile base class</b>: the parent's <code>attack()</code> self-calls an overridable method, so a subclass override can change the parent's behaviour — here causing infinite recursion. (2) <b>Class explosion</b>: element × class × flying needs a subclass per combination, and buffs that come and go cannot be modelled with a fixed class at all. Weapons are baked into subclasses so they cannot be swapped.</p>`,
      code: { lang: 'java', code: `class GameCharacter {
    int attack() { return 10 + bonus(); }       // self-use of an overridable method
    int bonus() { return 0; }
}
class Warrior extends GameCharacter {
    @Override int bonus() { return 3; }
}
class FireWarrior extends Warrior {
    @Override int bonus() { return 3 + 5; }     // duplicated knowledge of Warrior's bonus
}
class ComboWarrior extends Warrior {
    @Override int bonus() { return attack() / 2; }  // calls attack() -> bonus() -> attack() ... StackOverflowError
}
class FlyingFireWarrior extends FireWarrior {}    // one class per combination...`, alt: [
              { lang: 'python', code: `
class GameCharacter:
    def attack(self): return 10 + self.bonus()       # self-use of an overridable method
    def bonus(self): return 0

class Warrior(GameCharacter):
    def bonus(self): return 3

class FireWarrior(Warrior):
    def bonus(self): return 3 + 5     # duplicated knowledge of Warrior's bonus

class ComboWarrior(Warrior):
    def bonus(self): return self.attack() // 2  # calls attack() -> bonus() -> attack() ... RecursionError

class FlyingFireWarrior(FireWarrior): pass    # one class per combination...` },
              { lang: 'ts', code: `
class GameCharacter {
    attack(): number { return 10 + this.bonus(); }       // self-use of an overridable method
    bonus(): number { return 0; }
}
class Warrior extends GameCharacter {
    override bonus(): number { return 3; }
}
class FireWarrior extends Warrior {
    override bonus(): number { return 3 + 5; }     // duplicated knowledge of Warrior's bonus
}
class ComboWarrior extends Warrior {
    override bonus(): number { return Math.floor(this.attack() / 2); }  // calls attack() -> bonus() -> attack() ... stack overflow
}
class FlyingFireWarrior extends FireWarrior {}    // one class per combination...` },
              { lang: 'cpp', code: `
class GameCharacter {
public:
    virtual ~GameCharacter() = default;
    int attack() { return 10 + bonus(); }       // self-use of an overridable method
    virtual int bonus() { return 0; }
};
class Warrior : public GameCharacter {
public:
    int bonus() override { return 3; }
};
class FireWarrior : public Warrior {
public:
    int bonus() override { return 3 + 5; }     // duplicated knowledge of Warrior's bonus
};
class ComboWarrior : public Warrior {
public:
    int bonus() override { return attack() / 2; }  // calls attack() -> bonus() -> attack() ... stack overflow
};
class FlyingFireWarrior : public FireWarrior {};    // one class per combination...` }
            ] }
    },
    mcq: { q: 'Buffs can be added and removed during a fight and must stack. Which structure fits?', options: ['A subclass per buff combination', 'A list of Buff objects the character holds; damage sums them', 'A boolean field per buff on the base class', 'Overriding attack() in each subclass'], answer: 1, explain: 'Runtime add/remove + stacking = a collection of parts (composition). Each buff is a small object with its own rule.' },
    hints: [
      `<p>Hint 1: Identify independent axes of change: weapon (swappable), buffs (stack, temporary), abilities (set). Each becomes a part the character holds.</p>`,
      `<p>Hint 2: <code>interface Weapon { int baseDamage(); }</code>, <code>interface Buff { int bonus(); }</code>, <code>enum Ability { FLY, HEAL, ... }</code>. <code>Character</code> is <code>final</code> — nobody can override its internals.</p>`,
      `<p>Hint 3: <code>attack()</code> = weapon.baseDamage() + sum of buff bonuses. Provide <code>equip</code>, <code>addBuff</code>, <code>removeBuff</code>, <code>can(Ability)</code>. No method calls an overridable method of the same object, so the recursion bug is impossible.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "Asha with Sword [] -> 10\nAsha with Sword [Fire, Rage] -> 18\nAsha with Bow [Fire, Rage] -> 15\nAsha with Bow [Fire] -> 12 canFly=true canStealth=false\n12\n" }] },
    solution: {
      approach: `<p><b>Refactor:</b> Replace Inheritance with Delegation along three axes. <code>Character</code> is a <code>final</code> class holding a <code>Weapon</code> (Strategy, swappable), a <code>List&lt;Buff&gt;</code> (stackable parts, the idea behind Decorator) and an <code>EnumSet&lt;Ability&gt;</code>. Because the class is final and only calls its parts' public methods, there is no self-use for a subclass to break (fragile base class gone). Combinations are data, not classes: n weapons + m buffs + k abilities instead of n × 2<sup>m</sup> × 2<sup>k</sup> subclasses.</p>`,
      code: `interface Weapon { int baseDamage(); String name(); }
record Sword() implements Weapon { public int baseDamage() { return 10; } public String name() { return "Sword"; } }
record Bow()   implements Weapon { public int baseDamage() { return 7; }  public String name() { return "Bow"; } }

interface Buff { int bonus(); String name(); }
record FireEnchant() implements Buff { public int bonus() { return 5; } public String name() { return "Fire"; } }
record Rage()        implements Buff { public int bonus() { return 3; } public String name() { return "Rage"; } }

enum Ability { FLY, HEAL, STEALTH }

final class GameCharacter {
    private final String name;
    private Weapon weapon;
    private final List<Buff> buffs = new ArrayList<>();
    private final Set<Ability> abilities = EnumSet.noneOf(Ability.class);

    GameCharacter(String name, Weapon weapon, Ability... abilities) {
        this.name = name;
        this.weapon = weapon;
        this.abilities.addAll(Arrays.asList(abilities));
    }
    void equip(Weapon w)       { this.weapon = w; }         // swap at runtime
    void addBuff(Buff b)       { buffs.add(b); }
    void removeBuff(Buff b)    { buffs.remove(b); }         // records compare by value
    boolean can(Ability a)     { return abilities.contains(a); }

    int attack() {
        int bonus = 0;
        for (Buff b : buffs) bonus += b.bonus();
        return weapon.baseDamage() + bonus;
    }
    String describe() { return name + " with " + weapon.name() + " " + buffs.stream().map(Buff::name).toList() + " -> " + attack(); }

    public static void main(String[] args) {
        GameCharacter asha = new GameCharacter("Asha", new Sword(), Ability.FLY, Ability.HEAL);
        System.out.println(asha.describe());                   // 10
        asha.addBuff(new FireEnchant());
        asha.addBuff(new Rage());
        System.out.println(asha.describe());                   // 18
        asha.equip(new Bow());
        System.out.println(asha.describe());                   // 15
        asha.removeBuff(new Rage());
        System.out.println(asha.describe() + " canFly=" + asha.can(Ability.FLY) + " canStealth=" + asha.can(Ability.STEALTH));   // 12 canFly=true canStealth=false
        asha.removeBuff(new Rage());                           // already removed: nothing happens
        System.out.println(asha.attack());                     // 12
    }
}`,
      alt: [
        { lang: 'python', code: `from dataclasses import dataclass
from enum import Enum, auto
from typing import Protocol


class Weapon(Protocol):
    def base_damage(self) -> int: ...
    def name(self) -> str: ...


class Buff(Protocol):
    def bonus(self) -> int: ...
    def name(self) -> str: ...


@dataclass(frozen=True)
class Sword:
    def base_damage(self) -> int:
        return 10

    def name(self) -> str:
        return "Sword"


@dataclass(frozen=True)
class Bow:
    def base_damage(self) -> int:
        return 7

    def name(self) -> str:
        return "Bow"


@dataclass(frozen=True)
class FireEnchant:
    def bonus(self) -> int:
        return 5

    def name(self) -> str:
        return "Fire"


@dataclass(frozen=True)
class Rage:
    def bonus(self) -> int:
        return 3

    def name(self) -> str:
        return "Rage"


class Ability(Enum):
    FLY = auto()
    HEAL = auto()
    STEALTH = auto()


class GameCharacter:
    def __init__(self, name: str, weapon: Weapon, *abilities: Ability) -> None:
        self._name = name
        self._weapon = weapon
        self._buffs: list[Buff] = []
        self._abilities = set(abilities)

    def equip(self, weapon: Weapon) -> None:  # swap at runtime
        self._weapon = weapon

    def add_buff(self, buff: Buff) -> None:
        self._buffs.append(buff)

    def remove_buff(self, buff: Buff) -> None:  # frozen dataclasses compare by value
        if buff in self._buffs:
            self._buffs.remove(buff)

    def can(self, ability: Ability) -> bool:
        return ability in self._abilities

    def attack(self) -> int:
        return self._weapon.base_damage() + sum(b.bonus() for b in self._buffs)

    def describe(self) -> str:
        buffs = ", ".join(b.name() for b in self._buffs)
        return f"{self._name} with {self._weapon.name()} [{buffs}] -> {self.attack()}"


if __name__ == "__main__":
    asha = GameCharacter("Asha", Sword(), Ability.FLY, Ability.HEAL)
    print(asha.describe())  # 10
    asha.add_buff(FireEnchant())
    asha.add_buff(Rage())
    print(asha.describe())  # 18
    asha.equip(Bow())
    print(asha.describe())  # 15
    asha.remove_buff(Rage())
    print(f"{asha.describe()} canFly={str(asha.can(Ability.FLY)).lower()} canStealth={str(asha.can(Ability.STEALTH)).lower()}")
    asha.remove_buff(Rage())  # already removed: nothing happens
    print(asha.attack())  # 12` },
        { lang: 'ts', code: `interface Weapon { baseDamage(): number; name(): string; }
interface Buff { bonus(): number; name(): string; }

class Sword implements Weapon { baseDamage(): number { return 10; } name(): string { return "Sword"; } }
class Bow implements Weapon { baseDamage(): number { return 7; } name(): string { return "Bow"; } }

class FireEnchant implements Buff { bonus(): number { return 5; } name(): string { return "Fire"; } }
class Rage implements Buff { bonus(): number { return 3; } name(): string { return "Rage"; } }

type Ability = "FLY" | "HEAL" | "STEALTH";

class GameCharacter {
  private readonly buffs: Buff[] = [];
  private readonly abilities: ReadonlySet<Ability>;

  constructor(private readonly name: string, private weapon: Weapon, ...abilities: Ability[]) {
    this.abilities = new Set(abilities);
  }

  equip(w: Weapon): void { this.weapon = w; } // swap at runtime
  addBuff(b: Buff): void { this.buffs.push(b); }
  removeBuff(b: Buff): void { // objects compare by identity, so a buff is "equal" when its name matches
    const i = this.buffs.findIndex((x) => x.name() === b.name());
    if (i >= 0) this.buffs.splice(i, 1);
  }
  can(a: Ability): boolean { return this.abilities.has(a); }

  attack(): number {
    return this.weapon.baseDamage() + this.buffs.reduce((sum, b) => sum + b.bonus(), 0);
  }
  describe(): string {
    return \`\${this.name} with \${this.weapon.name()} [\${this.buffs.map((b) => b.name()).join(", ")}] -> \${this.attack()}\`;
  }
}

const asha = new GameCharacter("Asha", new Sword(), "FLY", "HEAL");
console.log(asha.describe()); // 10
asha.addBuff(new FireEnchant());
asha.addBuff(new Rage());
console.log(asha.describe()); // 18
asha.equip(new Bow());
console.log(asha.describe()); // 15
asha.removeBuff(new Rage());
console.log(\`\${asha.describe()} canFly=\${asha.can("FLY")} canStealth=\${asha.can("STEALTH")}\`);
asha.removeBuff(new Rage()); // already removed: nothing happens
console.log(asha.attack()); // 12` },
        { lang: 'cpp', code: `class Weapon {
public:
    virtual ~Weapon() = default;
    virtual int baseDamage() const = 0;
    virtual string name() const = 0;
};
class Sword : public Weapon {
public:
    int baseDamage() const override { return 10; }
    string name() const override { return "Sword"; }
};
class Bow : public Weapon {
public:
    int baseDamage() const override { return 7; }
    string name() const override { return "Bow"; }
};

class Buff {
public:
    virtual ~Buff() = default;
    virtual int bonus() const = 0;
    virtual string name() const = 0;
};
class FireEnchant : public Buff {
public:
    int bonus() const override { return 5; }
    string name() const override { return "Fire"; }
};
class Rage : public Buff {
public:
    int bonus() const override { return 3; }
    string name() const override { return "Rage"; }
};

enum class Ability { FLY, HEAL, STEALTH };

class GameCharacter final {
    string name_;
    unique_ptr<Weapon> weapon_;            // the character owns its weapon and buffs
    vector<unique_ptr<Buff>> buffs_;
    set<Ability> abilities_;

public:
    GameCharacter(string name, unique_ptr<Weapon> weapon, initializer_list<Ability> abilities)
        : name_(std::move(name)), weapon_(std::move(weapon)), abilities_(abilities) {}

    void equip(unique_ptr<Weapon> w) { weapon_ = std::move(w); }   // swap at runtime
    void addBuff(unique_ptr<Buff> b) { buffs_.push_back(std::move(b)); }
    void removeBuff(const Buff& b) {   // pointers compare by address, so a buff is "equal" when its name matches
        auto it = find_if(buffs_.begin(), buffs_.end(), [&](const unique_ptr<Buff>& x) { return x->name() == b.name(); });
        if (it != buffs_.end()) buffs_.erase(it);
    }
    bool can(Ability a) const { return abilities_.count(a) > 0; }

    int attack() const {
        int bonus = 0;
        for (const auto& b : buffs_) bonus += b->bonus();
        return weapon_->baseDamage() + bonus;
    }
    string describe() const {
        string buffs;
        for (size_t i = 0; i < buffs_.size(); i++) buffs += (i ? ", " : "") + buffs_[i]->name();
        return name_ + " with " + weapon_->name() + " [" + buffs + "] -> " + to_string(attack());
    }
};

int main() {
    GameCharacter asha("Asha", make_unique<Sword>(), {Ability::FLY, Ability::HEAL});
    cout << asha.describe() << "\\n";   // 10
    asha.addBuff(make_unique<FireEnchant>());
    asha.addBuff(make_unique<Rage>());
    cout << asha.describe() << "\\n";   // 18
    asha.equip(make_unique<Bow>());
    cout << asha.describe() << "\\n";   // 15
    asha.removeBuff(Rage());
    cout << asha.describe() << " canFly=" << boolalpha << asha.can(Ability::FLY)
         << " canStealth=" << asha.can(Ability::STEALTH) << "\\n";
    asha.removeBuff(Rage());           // already removed: nothing happens
    cout << asha.attack() << "\\n";     // 12
}` }
      ],
      complexity: `<p>attack() is O(active buffs). Types: one per weapon/buff instead of one per combination. No overridable self-calls → no fragile base class.</p>`,
      followUps: ['A buff that doubles damage (multiplicative) — does a simple sum still work? (ordered pipeline / true Decorator wrapping)', 'Buffs expire after N turns — where does the timer live?', 'How would you load weapons and buffs from designer-edited JSON? (data-driven: parts are data, not code)']
    }
  });

  /* =====================================================================
     QUIZ
     ===================================================================== */
  quiz.push({ q: 'According to Hunt &amp; Thomas, DRY is primarily about avoiding duplication of…', options: ['Identical lines of text', '<b>Knowledge</b> — business rules, facts and decisions', 'Variable names', 'Test code'], answer: 1, explain: 'DRY: every piece of knowledge has a single, unambiguous, authoritative representation. Similar-looking code that encodes different knowledge should stay separate.' });
  quiz.push({ q: '<code>GST_RATE = 18</code> and <code>LATE_FEE_PERCENT = 18</code>. A teammate merges them into <code>EIGHTEEN</code>. What is the problem?', options: ['None, it is DRY', 'Accidental duplication: they change for different reasons, so merging couples unrelated rules', 'Constants should be lowercase', 'It slows the program'], answer: 1, explain: 'Same value, different meaning. When GST changes, late fees would silently change too.' });
  quiz.push({ q: 'Which situation is the BEST example of a YAGNI violation?', options: ['Writing unit tests for a feature', 'Building a plug-in loader with one plug-in because "we might sell plug-ins one day"', 'Renaming a confusing variable', 'Validating user input'], answer: 1, explain: 'YAGNI targets presumptive features. Tests, naming and validation make code correct and easy to change — always worth it.' });
  quiz.push({ q: 'Why does extending <code>HashSet</code> and overriding both <code>add</code> and <code>addAll</code> to count insertions give double counts?', options: ['HashSet is final', 'The inherited <code>addAll</code> internally calls <code>add</code>, which is now the overridden one (self-use)', 'Generics erase the counter', 'HashSet stores duplicates'], answer: 1, explain: 'This is the fragile base class problem: the subclass depends on an implementation detail of the parent. Composition (a wrapper holding a Set) avoids it.' });
  quiz.push({ q: 'Which kind of coupling is <code>print(report, true)</code> where <code>true</code> selects PDF output?', options: ['Data coupling', 'Message coupling', 'Control coupling', 'No coupling'], answer: 2, explain: 'A flag that tells the callee which branch to take is control coupling. Replace it with two intention-revealing methods.' });
  quiz.push({ q: 'A class has methods {login, logout} using {sessions, passwordHash} and {exportCsv, addRow} using {rows, format} with no shared fields. What does this suggest?', options: ['High cohesion', 'The class should be split into two classes (low cohesion / LCOM &gt; 1 group)', 'It needs more getters', 'It should be a singleton'], answer: 1, explain: 'Two disconnected groups of methods and fields = two responsibilities glued together. Extract Class along the groups.' });
  quiz.push({ q: 'Which line violates the Law of Demeter (inside a <code>ShippingService</code> method)?', options: ['<code>sb.append("a").append("b")</code>', '<code>orders.stream().filter(o -&gt; o.isPaid()).toList()</code>', '<code>order.getCustomer().getAddress().getCity()</code>', '<code>this.mailer.send(email)</code>'], answer: 2, explain: 'Calling methods on objects returned by other calls (strangers) is the violation. Fluent builders and streams return objects you are already working with.' });
  quiz.push({ q: '"Tell, Don\'t Ask" recommends replacing <code>if (acct.getBalance() &gt;= x) acct.setBalance(acct.getBalance() - x);</code> with…', options: ['<code>acct.withdraw(x)</code> where the account checks its own balance', 'A static <code>AccountUtils.withdraw(acct, x)</code>', 'Making balance public', 'Two separate getters'], answer: 0, explain: 'The object that owns the data owns the rule. It also keeps check-then-act in one place, which helps thread safety.' });
  quiz.push({ q: 'Command–Query Separation says a method should…', options: ['Always return void', 'Either change state (command) or return an answer without side effects (query), not both', 'Have at most one parameter', 'Never throw exceptions'], answer: 1, explain: 'Queries are safe to call repeatedly; commands do things. Mixing them confuses callers (e.g. <code>if (set(x))</code>).' });
  quiz.push({ q: 'Adding a new employee type requires editing <code>switch</code> statements in five classes. This smell is called…', options: ['Divergent Change', 'Shotgun Surgery', 'Lazy Class', 'Middle Man'], answer: 1, explain: 'One reason to change, many classes to edit = shotgun surgery. Cure: gather the knowledge, e.g. Replace Conditional with Polymorphism.' });
  quiz.push({ q: 'What is the FIRST thing to do before refactoring legacy code that has no tests?', options: ['Rewrite it from scratch', 'Write characterization tests that pin its current behaviour', 'Fix all the bugs you see', 'Rename every variable'], answer: 1, explain: 'Refactoring preserves behaviour; you need a safety net that detects any change. Characterization tests record what the code does today.' });
  quiz.push({ q: 'Which refactoring cures <b>Feature Envy</b>?', options: ['Move Method to the class whose data it uses', 'Extract Interface', 'Inline Class', 'Add a comment'], answer: 0, explain: 'A method that mostly uses another object\'s data belongs in that object. Moving it also tends to remove train wrecks and duplication.' });
  quiz.push({ q: 'An interface has exactly one implementation and a unit test uses a fake of it. Is the interface speculative generality?', options: ['Yes, delete it', 'No — the test is a real, present-day second user of the seam', 'Only if it has more than 3 methods', 'Interfaces are always speculative'], answer: 1, explain: 'YAGNI is about imagined users. A test double is a real user today, so the seam earns its place.' });

  /* =====================================================================
     INTERVIEW Q&A
     ===================================================================== */
  interview.push({ level: 'B', q: 'What does DRY mean, and can following it too strictly hurt?', a: `<p>DRY means every piece of <b>knowledge</b> (a rule, a fact, a decision) has one authoritative home. If the "free shipping above ₹500" rule lives in three classes, a change needs three edits and one missed edit is a bug.</p><p>Yes, it can hurt: (1) <b>accidental duplication</b> — code that looks the same but represents different rules should not be merged, or a change to one silently changes the other; (2) <b>the wrong abstraction</b> — forcing two callers through one function that then grows boolean flags; (3) <b>coupling</b> — sharing code across microservices can force teams to release together. I use the "rule of three" and ask "do these change for the same reason?" before extracting.</p>`, followUps: ['Give an example of accidental duplication from your work.', 'How do you undo a wrong abstraction? (inline it back, then re-extract what is truly common)'] });
  interview.push({ level: 'B', q: 'Explain KISS and YAGNI. How are they different?', a: `<p><b>KISS</b> is about <i>how</i> you build: choose the simplest design and the most obvious code that works — few moving parts, no cleverness that needs decoding. <b>YAGNI</b> is about <i>what</i> you build: implement features and extension points only when they are actually needed, not when you predict they might be.</p><p>YAGNI is backed by Fowler's costs of a presumptive feature: cost of build, cost of delay, cost of carry (everyone works around it) and cost of repair (the real need differs). Neither principle excuses skipping tests, clear names or refactoring — those make future change cheap, which is what lets you defer features safely. And for one-way-door decisions (data model, public API, security) I think ahead.</p>`, followUps: ['Where would you NOT apply YAGNI?', 'How do you push back on a "future-proof" design in a code review?'] });
  interview.push({ level: 'B', q: 'Composition vs inheritance: when do you use each?', a: `<p><b>Inheritance</b> ("is-a") when a subclass truly can stand in for its parent everywhere (Liskov), when the parent was designed and documented for extension, or for closed data families like <code>sealed interface Shape</code> with records. <b>Composition</b> ("has-a" + delegation) for reusing behaviour, for behaviour that varies at runtime (strategies), for combinations of features (avoids 2<sup>n</sup> subclasses), and when I do not control the parent class.</p><p>The reason to favour composition: inheritance is white-box reuse — the child depends on the parent's internal self-calls (fragile base class, e.g. <code>InstrumentedHashSet</code> double-counting via <code>addAll</code>). Composition uses only the part's public contract, and parts can be swapped or tested in isolation. Examples of bad inheritance in the JDK: <code>Stack extends Vector</code>, <code>Properties extends Hashtable</code>.</p>`, followUps: ['What is the fragile base class problem? Give a concrete example.', 'How do Kotlin\'s "by" delegation or Lombok @Delegate help?'] });
  interview.push({ level: 'B', q: 'Define coupling and cohesion. Why do we want low coupling and high cohesion?', a: `<p><b>Coupling</b> is how much one module depends on or knows about another: if changing A forces changes in B, they are coupled. <b>Cohesion</b> is how strongly the elements inside one module belong together — do its methods use the same data for one purpose?</p><p>Low coupling means changes stay local, parts can be replaced (swap a payment vendor via an interface), and units can be tested alone. High cohesion means each class has one clear job, is easy to name, understand and reuse. They reinforce each other: focused classes need fewer and narrower connections. I check coupling by counting arrows into concrete classes and looking for cycles; I check cohesion with a method × field table — disconnected groups mean the class should be split.</p>`, followUps: ['List kinds of coupling from worst to best.', 'What is LCOM and what are its limits?'] });
  interview.push({ level: 'I', q: 'What is the Law of Demeter? Is <code>list.stream().filter(...).map(...).toList()</code> a violation?', a: `<p>The Law of Demeter says a method should only call methods on: itself, its parameters, objects it creates, and its own fields — not on objects returned by those calls. The classic violation is a train wreck like <code>order.getCustomer().getAddress().getCity()</code>, which couples the caller to the entire object graph. The fix is "Tell, Don't Ask": add <code>order.shippingCity()</code> so each object talks only to its neighbour.</p><p>The stream pipeline is <b>not</b> a violation: each call returns a stream that is part of the same fluent operation, not a stranger's internals. Same for builders (<code>sb.append().append()</code>) and for plain data structures such as records/DTOs. LoD protects objects with behaviour, it is not "count the dots". Over-applying it creates Middle Man classes, so I add delegating methods only when they name a real domain concept.</p>`, followUps: ['How does LoD show up in unit tests? (deep mock chains)', 'How do you balance LoD against the Middle Man smell?'] });
  interview.push({ level: 'I', q: 'You are reviewing a 300-line method. Walk me through how you would refactor it.', a: `<p>1) <b>Safety net first:</b> check existing tests; if none, write characterization tests that pin current outputs for typical inputs, boundaries and error paths. 2) <b>Read and rename:</b> use IDE Rename to give variables and the method intention-revealing names — understanding improves immediately. 3) <b>Flatten:</b> guard clauses for invalid cases to remove nesting. 4) <b>Extract Method</b> for each block that has a comment banner or a single purpose ("validate", "compute subtotal", "apply discount"), keeping one level of abstraction per method. 5) Replace magic numbers with constants; introduce parameter objects for argument clumps. 6) Look for <b>Feature Envy</b> and move methods to the class that owns the data; if a switch on type appears, consider polymorphism.</p><p>After every tiny step: run tests, commit. If red, undo the step rather than debug. Refactoring and behaviour changes go in separate commits.</p>`, followUps: ['How small should each commit be?', 'How do you get buy-in for refactoring time? (Boy Scout rule, hotspots)'] });
  interview.push({ level: 'I', q: 'Explain divergent change vs shotgun surgery with examples.', a: `<p>They are mirror images. <b>Divergent change</b>: one class changes for many unrelated reasons — e.g. <code>Order</code> is edited for tax rules, for PDF layout and for database schema changes. It violates single responsibility; the cure is to <b>split</b> it (Extract Class) so each reason has its own class.</p><p><b>Shotgun surgery</b>: one logical change forces edits in many classes — e.g. adding a payment method edits a switch in the checkout, refunds, reporting and settings. The knowledge is scattered; the cure is to <b>gather</b> it (Move Method/Field, Replace Conditional with Polymorphism) so the payment method is one class implementing an interface. A good design aims for "one change → one place" and "one place → one reason to change".</p>`, followUps: ['Which SOLID principles map to these smells?', 'How can git history help you detect shotgun surgery? (files that always change together — change coupling)'] });
  interview.push({ level: 'I', q: 'What is primitive obsession, and how do value objects fix it?', a: `<p>Primitive obsession is using basic types (<code>String</code>, <code>int</code>, <code>double</code>) for domain concepts: money as <code>double</code>, email/phone as <code>String</code>, status as <code>int</code>. Consequences: validation and formatting are duplicated everywhere, the compiler cannot stop you passing a phone where a name is expected, and floating-point money has rounding errors.</p><p>A <b>value object</b> — an immutable class (a Java <code>record</code>, a Python frozen <code>@dataclass</code>, a TypeScript class with <code>readonly</code> fields, a C++ class with a validating constructor) — wraps the value, validates it once in the constructor ("parse, don't validate"), compares by value, and becomes the home for related behaviour: <code>Money.plus</code> refuses mixed currencies, <code>Phone.of</code> normalises formats, <code>Email.domain()</code>. After that, every instance in the system is valid by construction and method signatures document themselves: <code>transfer(Phone from, Phone to, Money amount)</code>.</p>`, followUps: ['long minor units or BigDecimal for money?', 'What about performance/allocations of many small objects? (usually negligible; Valhalla value classes in future)'] });
  interview.push({ level: 'A', q: 'How would you make a class with <code>new StripeClient()</code>, <code>LocalDate.now()</code> and a static config unit-testable?', a: `<p>All three are hidden dependencies (external, temporal and common/global coupling). I make them explicit: define an interface the domain owns (<code>PaymentGateway</code>), move Stripe code into an adapter implementing it, and pass the gateway, a clock (Java's <code>java.time.Clock</code>, or a function that returns today's date) and the config values through the constructor. The class then asks the injected clock for the date instead of calling <code>LocalDate.now()</code>.</p><p>Production wiring (a <code>main</code>, a factory or a DI container like Spring) passes the real adapter and the system clock (<code>Clock.systemDefaultZone()</code> in Java); tests pass a recording fake or a lambda and a fixed clock (<code>Clock.fixed(...)</code>). Benefits beyond testing: vendor changes stop at the adapter, dependencies are visible in the constructor (a long constructor is itself a useful smell signalling too many responsibilities), and there is no shared mutable state between tests.</p>`, followUps: ['Constructor vs setter vs field injection — which and why?', 'When is a static method fine? (pure functions with no hidden state, e.g. Math.max)'] });
  interview.push({ level: 'A', q: 'What is connascence and how does it refine "coupling"?', a: `<p>Connascence (Meilir Page-Jones) says two parts are connascent if changing one requires changing the other. It gives coupling a vocabulary with <b>strength</b>. Static forms, weakest to strongest: name, type, meaning (both sides know "2 means admin"), position (argument order), algorithm (both sides must hash identically). Dynamic forms: execution order, timing, value (values must stay in sync), identity (must be the same object).</p><p>Practical rules: convert strong forms to weaker ones — position → name with a parameter object, meaning → an enum, algorithm → a shared single implementation; keep strong connascence <b>local</b> (inside one class or module) and only weak connascence across boundaries such as services; and reduce the <b>degree</b> (how many parts are involved). It turns vague "this is too coupled" into a specific, fixable statement.</p>`, followUps: ['Give an example of connascence of position in your language and how to fix it.', 'Which connascence types appear between microservices?'] });
  interview.push({ level: 'A', q: 'When is a switch on a type code acceptable, and when should it become polymorphism?', a: `<p>Replace it with polymorphism when the <b>same</b> switch over the same type set appears in several places, and new <b>types</b> are added more often than new operations — each new type would otherwise require shotgun surgery. One class per type gathers all its behaviour, and the compiler (abstract methods or a sealed interface) forces you to implement every operation.</p><p>A switch is fine when it appears in <b>one</b> place — typically a factory converting external data (a DB code, a JSON field) into the right object — or when the set of types is closed and stable but <b>operations</b> are added often. Then a pattern-matching <code>switch</code> over a closed hierarchy (a Java <code>sealed</code> interface, a TypeScript discriminated union, Python <code>match</code> on dataclasses, C++ <code>std::visit</code> on a <code>std::variant</code>) is excellent: exhaustive, compiler-checked, and keeps each operation in one place (the "expression problem" trade-off; Visitor is the classic OO version).</p>`, followUps: ['What is the expression problem?', 'How does a closed hierarchy (a sealed interface or a union type) make switch safer than an enum with default?'] });
  interview.push({ level: 'E', q: 'Your team\'s core service is a 15k-line "God" module. How do you improve it without a rewrite?', a: `<p>1) <b>Find hotspots</b>: combine git change frequency with complexity to find the 5% of code that causes most pain; ignore stable ugly code. 2) <b>Safety nets</b>: characterization/approval tests around the hotspot's public behaviour, plus ArchUnit rules to stop new violations. 3) <b>Seams</b>: introduce interfaces at vendor and I/O boundaries (Branch by Abstraction) so pieces can move independently. 4) <b>Extract by cohesion</b>: use method × field and change-coupling analysis to find natural sub-domains (billing, notifications), extract them into modules with explicit APIs — still in the same deployable at first. 5) <b>Strangler fig / expand–contract</b> for anything that crosses process boundaries. 6) <b>Make it a habit</b>: Boy Scout rule in every feature PR, small reviewable steps, measurable goals (hotspot complexity, build times, defect rate).</p><p>Throughout, refactoring PRs are separate from behaviour changes, and the business sees value continuously instead of waiting months for a risky rewrite.</p>`, followUps: ['How do you prioritise refactoring against feature work with a product manager?', 'What metrics show the effort is working?', 'When IS a rewrite justified?'] });
  interview.push({ level: 'E', q: 'How do AI coding assistants change the importance of clean-code principles?', a: `<p>They make principles <b>more</b> important. Generation is cheap, so duplication and speculative abstractions arrive faster (several industry analyses have reported more copy-pasted code in AI-assisted repositories). Agents also work best on cohesive, loosely coupled code: a focused class with clear names fits in the context window and gets correct edits; a tangled module causes missed ripples.</p><p>How I work with them: I give explicit constraints ("only the stated requirements, no single-implementation interfaces, follow existing names"), ask AI for analysis before edits (list smells, dependency edges, duplicated rules), prefer IDE automated refactorings for guaranteed behaviour preservation, require characterization tests before AI refactors, and review diffs for hidden behaviour changes mixed into "cleanups". Names and a repo glossary act as prompts for both humans and agents. What I still own: choosing seams, domain vocabulary, and saying no to complexity.</p>`, followUps: ['How would you write team guidelines for AI-generated code review?', 'Which refactorings would you trust an agent to do unattended?'] });

  /* ---- python / TypeScript / C++ versions of the Java code panes (same line numbers so hl and "lines N-M" narration still match) ---- */
  ALTS['// before (in every screen)\nif (!email.contains("@") || email.contains("+")) error();\n\n// after (in every screen)\nif (!EmailRule.isValid(email)) error();'] = mkAlt(`# before (in every screen)
if "@" not in email or "+" in email: error()

# after (in every screen)
if not EmailRule.is_valid(email): error()`, `// before (in every screen)
if (!email.includes("@") || email.includes("+")) error();

// after (in every screen)
if (!EmailRule.isValid(email)) error();`, `// before (in every screen)
if (email.find('@') == string::npos || email.find('+') != string::npos) error();

// after (in every screen)
if (!EmailRule::isValid(email)) error();`);
  ALTS['class ReportService {\n  String daily(List<Integer> s) {\n    int sum = 0;\n    for (int x : s) sum += x;\n    double avg = s.isEmpty() ? 0 : (double) sum / s.size();\n    return "Daily avg " + avg;\n  }\n  String weekly(List<Integer> s) {\n    int sum = 0;\n    for (int x : s) sum += x;\n    double avg = s.isEmpty() ? 0 : (double) sum / s.size();\n    return "Weekly avg " + avg;\n  }\n}'] = mkAlt(`class ReportService:
    def daily(self, s):
        total = 0
        for x in s: total += x
        avg = 0 if not s else total / len(s)
        return f"Daily avg {avg}"

    def weekly(self, s):
        total = 0
        for x in s: total += x
        avg = 0 if not s else total / len(s)
        return f"Weekly avg {avg}"`, `class ReportService {
  daily(s: number[]): string {
    let sum = 0;
    for (const x of s) sum += x;
    const avg = s.length === 0 ? 0 : sum / s.length;
    return "Daily avg " + avg;
  }
  weekly(s: number[]): string {
    let sum = 0;
    for (const x of s) sum += x;
    const avg = s.length === 0 ? 0 : sum / s.length;
    return "Weekly avg " + avg;
  }
}`, `struct ReportService {
  string daily(const vector<int>& s) {
    int sum = 0;
    for (int x : s) sum += x;
    double avg = s.empty() ? 0 : (double) sum / s.size();
    return "Daily avg " + to_string(avg);
  }
  string weekly(const vector<int>& s) {
    int sum = 0;
    for (int x : s) sum += x;
    double avg = s.empty() ? 0 : (double) sum / s.size();
    return "Weekly avg " + to_string(avg);
  }
};`);
  ALTS['class ReportService {\n  String daily(List<Integer> s)  { return "Daily avg " + average(s); }\n  String weekly(List<Integer> s) { return "Weekly avg " + average(s); }\n\n  // ONE home for "how we average sales"\n  private double average(List<Integer> s) {\n    if (s.isEmpty()) return 0;\n    int sum = 0;\n    for (int x : s) sum += x;\n    return (double) sum / s.size();\n  }\n}'] = mkAlt(`class ReportService:
    def daily(self, s):  return f"Daily avg {self._average(s)}"
    def weekly(self, s): return f"Weekly avg {self._average(s)}"

    # ONE home for "how we average sales"
    def _average(self, s):
        if not s: return 0
        total = 0
        for x in s: total += x
        return total / len(s)`, `class ReportService {
  daily(s: number[]): string  { return "Daily avg " + this.average(s); }
  weekly(s: number[]): string { return "Weekly avg " + this.average(s); }

  // ONE home for "how we average sales"
  private average(s: number[]): number {
    if (s.length === 0) return 0;
    let sum = 0;
    for (const x of s) sum += x;
    return sum / s.length;
  }
}`, `struct ReportService {
  string daily(const vector<int>& s)  { return "Daily avg " + to_string(average(s)); }
  string weekly(const vector<int>& s) { return "Weekly avg " + to_string(average(s)); }

  // ONE home for "how we average sales"
  private: double average(const vector<int>& s) {
    if (s.empty()) return 0;
    int sum = 0;
    for (int x : s) sum += x;
    return (double) sum / s.size();
  }
};`, { python: { 11: 10 } });
  ALTS['boolean isLeap(int y) {\n  return ((y & 3) == 0 && ((y % 25) != 0 || (y & 15) == 0));\n}'] = mkAlt(`def is_leap(y):
    return (y & 3) == 0 and ((y % 25) != 0 or (y & 15) == 0)`, `function isLeap(y: number): boolean {
  return ((y & 3) === 0 && ((y % 25) !== 0 || (y & 15) === 0));
}`, `bool isLeap(int y) {
  return ((y & 3) == 0 && ((y % 25) != 0 || (y & 15) == 0));
}`);
  ALTS['boolean isLeap(int year) {\n  boolean divisibleBy4   = year % 4 == 0;\n  boolean divisibleBy100 = year % 100 == 0;\n  boolean divisibleBy400 = year % 400 == 0;\n  return divisibleBy4 && (!divisibleBy100 || divisibleBy400);\n}'] = mkAlt(`def is_leap(year):
    divisible_by_4   = year % 4 == 0
    divisible_by_100 = year % 100 == 0
    divisible_by_400 = year % 400 == 0
    return divisible_by_4 and (not divisible_by_100 or divisible_by_400)`, `function isLeap(year: number): boolean {
  const divisibleBy4   = year % 4 === 0;
  const divisibleBy100 = year % 100 === 0;
  const divisibleBy400 = year % 400 === 0;
  return divisibleBy4 && (!divisibleBy100 || divisibleBy400);
}`, `bool isLeap(int year) {
  bool divisibleBy4   = year % 4 == 0;
  bool divisibleBy100 = year % 100 == 0;
  bool divisibleBy400 = year % 400 == 0;
  return divisibleBy4 && (!divisibleBy100 || divisibleBy400);
}`);
  ALTS['interface AddOn { int price(); String name(); }\nrecord Milk() implements AddOn { public int price(){return 20;} public String name(){return "milk";} }\nclass Coffee {\n  private final List<AddOn> addOns = new ArrayList<>();\n  void add(AddOn a)    { addOns.add(a); }\n  void remove(AddOn a) { addOns.remove(a); }\n  int price() {\n    int p = 100;\n    for (AddOn a : addOns) p += a.price();\n    return p;\n  }\n}'] = mkAlt(`class AddOn(ABC): price = name = None       # an add-on has a price() and a name()
class Milk(AddOn): price = lambda self: 20; name = lambda self: "milk"
class Coffee:
    def __init__(self): self._add_ons = []
    def add(self, a):    self._add_ons.append(a)
    def remove(self, a): self._add_ons.remove(a)
    def price(self):
        p = 100
        for a in self._add_ons: p += a.price()
        return p`, `interface AddOn { price(): number; name(): string; }
class Milk implements AddOn { price() { return 20; } name() { return "milk"; } }
class Coffee {
  private readonly addOns: AddOn[] = [];
  add(a: AddOn): void    { this.addOns.push(a); }
  remove(a: AddOn): void { this.addOns.splice(this.addOns.indexOf(a), 1); }
  price(): number {
    let p = 100;
    for (const a of this.addOns) p += a.price();
    return p;
  }
}`, `struct AddOn { virtual int price() = 0; virtual string name() = 0; virtual ~AddOn() = default; };
struct Milk : AddOn { int price() override { return 20; } string name() override { return "milk"; } };
class Coffee {
  vector<AddOn*> addOns;
public:
  void add(AddOn* a)    { addOns.push_back(a); }
  void remove(AddOn* a) { addOns.erase(find(addOns.begin(), addOns.end(), a)); }
  int price() {
    int p = 100;
    for (AddOn* a : addOns) p += a->price();
    return p;
  }
};`);
  ALTS['int doIt(List<Item> l, Customer c, boolean f) {\n  int t = 0;\n  if (l != null) {\n    if (!l.isEmpty()) {\n      for (Item i : l) {\n        if (i.qty() > 0) {\n          t += i.priceCents() * i.qty();\n        }\n      }\n      if (c.premium()) {\n        t = t - t / 10;\n      }\n      if (f) {\n        t = t + 4000;\n      }\n    }\n  }\n  return t;\n}'] = mkAlt(`def do_it(l, c, f):
    t = 0
    if l is not None:
        if len(l) > 0:
            for i in l:
                if i.qty() > 0:
                    t += i.price_cents() * i.qty()


        if c.premium():
            t = t - t // 10

        if f:
            t = t + 4000



    return t`, `function doIt(l: Item[] | null, c: Customer, f: boolean): number {
  let t = 0;
  if (l !== null) {
    if (l.length > 0) {
      for (const i of l) {
        if (i.qty() > 0) {
          t += i.priceCents() * i.qty();
        }
      }
      if (c.premium()) {
        t = t - Math.floor(t / 10);
      }
      if (f) {
        t = t + 4000;
      }
    }
  }
  return t;
}`, `int doIt(const vector<Item>* l, const Customer& c, bool f) {
  int t = 0;
  if (l != nullptr) {
    if (!l->empty()) {
      for (const Item& i : *l) {
        if (i.qty() > 0) {
          t += i.priceCents() * i.qty();
        }
      }
      if (c.premium()) {
        t = t - t / 10;
      }
      if (f) {
        t = t + 4000;
      }
    }
  }
  return t;
}`);
  ALTS['int expressTotal(List<Item> cart, Customer customer) {\n  int total = standardTotal(cart, customer);\n  return total == 0 ? 0 : total + EXPRESS_FEE_CENTS;\n}\nint standardTotal(List<Item> cart, Customer customer) {\n  if (cart == null || cart.isEmpty()) return 0;\n  return applyLoyaltyDiscount(subtotal(cart), customer);\n}\nprivate int subtotal(List<Item> cart) { ... loop ... }\nprivate int applyLoyaltyDiscount(int amount, Customer c) { ... }'] = mkAlt(`def express_total(cart, customer):
    total = standard_total(cart, customer)
    return 0 if total == 0 else total + EXPRESS_FEE_CENTS

def standard_total(cart, customer):
    if cart is None or len(cart) == 0: return 0
    return apply_loyalty_discount(subtotal(cart), customer)

def subtotal(cart): return sum(i.price_cents() * i.qty() for i in cart if i.qty() > 0)
def apply_loyalty_discount(amount, c): return amount - amount // 10 if c.premium() else amount`, `function expressTotal(cart: Item[], customer: Customer): number {
  const total = standardTotal(cart, customer);
  return total === 0 ? 0 : total + EXPRESS_FEE_CENTS;
}
function standardTotal(cart: Item[] | null, customer: Customer): number {
  if (cart === null || cart.length === 0) return 0;
  return applyLoyaltyDiscount(subtotal(cart), customer);
}
function subtotal(cart: Item[]): number { return cart.filter(i => i.qty() > 0).reduce((s, i) => s + i.priceCents() * i.qty(), 0); }
function applyLoyaltyDiscount(amount: number, c: Customer): number { return c.premium() ? amount - Math.floor(amount / 10) : amount; }`, `int expressTotal(const vector<Item>& cart, const Customer& customer) {
  int total = standardTotal(&cart, customer);
  return total == 0 ? 0 : total + EXPRESS_FEE_CENTS;
}
int standardTotal(const vector<Item>* cart, const Customer& customer) {
  if (cart == nullptr || cart->empty()) return 0;
  return applyLoyaltyDiscount(subtotal(*cart), customer);
}
int subtotal(const vector<Item>& cart) { int s = 0; for (auto& i : cart) if (i.qty() > 0) s += i.priceCents() * i.qty(); return s; }
int applyLoyaltyDiscount(int amount, const Customer& c) { return c.premium() ? amount - amount / 10 : amount; }`);
  ALTS['switch (e.type) {\n  case ENGINEER: return ...;\n  case MANAGER: return ...;\n  case INTERN: return ...;\n}'] = mkAlt(`match e.type:
    case Type.ENGINEER: return engineer_pay(e)
    case Type.MANAGER: return manager_pay(e)
    case Type.INTERN: return intern_pay(e)`, `switch (e.type) {
  case Type.ENGINEER: return engineerPay(e);
  case Type.MANAGER: return managerPay(e);
  case Type.INTERN: return internPay(e);
}`, `switch (e.type) {
  case ENGINEER: return engineerPay(e);
  case MANAGER: return managerPay(e);
  case INTERN: return internPay(e);
}`);
  ALTS['switch (e.type) {\n  case ENGINEER: return ...;\n  case MANAGER: return ...;\n  case INTERN: return ...;\n  case CONTRACTOR: return ...;   // added\n  default: throw new IllegalStateException();\n}'] = mkAlt(`match e.type:
    case Type.ENGINEER: return engineer_pay(e)
    case Type.MANAGER: return manager_pay(e)
    case Type.INTERN: return intern_pay(e)
    case Type.CONTRACTOR: return contractor_pay(e)   # added
    case _: raise RuntimeError("unknown type")`, `switch (e.type) {
  case Type.ENGINEER: return engineerPay(e);
  case Type.MANAGER: return managerPay(e);
  case Type.INTERN: return internPay(e);
  case Type.CONTRACTOR: return contractorPay(e);   // added
  default: throw new Error("unknown type");
}`, `switch (e.type) {
  case ENGINEER: return engineerPay(e);
  case MANAGER: return managerPay(e);
  case INTERN: return internPay(e);
  case CONTRACTOR: return contractorPay(e);   // added
  default: throw logic_error("unknown type");
}`);
  ALTS['switch (e.type) {\n  case ENGINEER: return ...;\n  case MANAGER: return ...;\n  case INTERN: return ...;\n  default: throw new IllegalStateException();\n}'] = mkAlt(`match e.type:
    case Type.ENGINEER: return engineer_pay(e)
    case Type.MANAGER: return manager_pay(e)
    case Type.INTERN: return intern_pay(e)
    case _: raise RuntimeError("unknown type")`, `switch (e.type) {
  case Type.ENGINEER: return engineerPay(e);
  case Type.MANAGER: return managerPay(e);
  case Type.INTERN: return internPay(e);
  default: throw new Error("unknown type");
}`, `switch (e.type) {
  case ENGINEER: return engineerPay(e);
  case MANAGER: return managerPay(e);
  case INTERN: return internPay(e);
  default: throw logic_error("unknown type");
}`);
  function snakeCall(s) { return s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase(); }
  function contractorAlt(newT) {
    var cls = newT.replace(/\W/g, ''), badge = newT.slice(0, 3).toUpperCase();
    return mkAlt('class ' + cls + '(Employee):\n    def __init__(self, base): self.base = base\n    def pay(self):    return self.base\n    def bonus(self):  return 0\n    def badge(self):       return "' + badge + '"\n    def report_line(self): return f"' + newT + ' {self.pay()}"',
      'class ' + cls + ' implements Employee { constructor(readonly base: number) {}\n  pay(): number    { return this.base; }\n  bonus(): number  { return 0; }\n  badge(): string       { return "' + badge + '"; }\n  reportLine(): string  { return "' + newT + ' " + this.pay(); }\n}',
      'struct ' + cls + ' : Employee { int base; ' + cls + '(int b) : base(b) {}\n  int pay() override    { return base; }\n  int bonus() override  { return 0; }\n  string badge() override       { return "' + badge + '"; }\n  string reportLine() override  { return "' + newT + ' " + to_string(pay()); }\n};',
      { python: { 1: 1, 2: 3, 3: 4, 4: 5, 5: 6, 6: 2 } });
  }

  registerModule({
    id: 'lld03',
    title: 'Clean Code & Design Principles',
    intro: `<p>SOLID tells you how to shape classes; this module gives you the <b>everyday habits</b> that keep a codebase pleasant to change: <b>DRY</b>, <b>KISS</b>, <b>YAGNI</b>, <b>composition over inheritance</b>, <b>low coupling / high cohesion</b>, the <b>Law of Demeter</b>, good <b>names</b>, <b>small functions</b>, and the catalogue of <b>code smells</b> with the <b>refactorings</b> that cure them.</p>
<p>Every topic starts with a real-life analogy, then shows a smelly design next to a refactored one, with the code in Java, Python, TypeScript and C++. Visualizers draw <b>dependency graphs before and after</b> (red = tight coupling), build <b>cohesion tables</b> that reveal hidden classes, and <b>step through refactors</b> line by line. Practice problems are code-review exercises: the "brute force" is the smelly design and why it hurts; the solution is a complete program in Java, Python, TypeScript and C++ plus the reasoning an interviewer wants to hear.</p>
<p>Why it matters: machine-coding and LLD rounds grade <i>readability, extensibility and testability</i> as much as correctness, and in the AI era — when code is cheap to generate — judging and simplifying code is the skill that sets you apart.</p>`,
    goals: [
      'Spot duplicated <b>knowledge</b> (not just duplicated text) and refactor it to a single source of truth — while avoiding accidental duplication and the wrong abstraction',
      'Apply KISS and YAGNI to cut speculative generality, and explain Fowler\'s costs of presumptive features',
      'Choose composition over inheritance with reasons (fragile base class, class explosion, runtime variability) and know when inheritance is right',
      'Draw a dependency graph, name the kind of coupling, and reduce it with interfaces and dependency injection; measure cohesion with a method × field table and split God classes',
      'Fix Law of Demeter violations with Tell-Don\'t-Ask without creating Middle Men',
      'Write intention-revealing names and small single-purpose functions (guard clauses, no flag arguments, CQS)',
      'Name common code smells from Fowler\'s catalogue, pair each with its refactoring, and refactor legacy code safely using characterization tests and small steps'
    ],
    prereqs: `LLD 1 (OOP Modelling &amp; UML) and LLD 2 (SOLID Principles). Comfortable with Java classes, interfaces, records, enums and collections (Java track modules on OOP and Collections).`,
    hours: 12,
    langNotes: {
      java: `<p><b>One home for a rule.</b> <code>static final</code> constants in a small <code>final</code> class with a private constructor are the usual home for a tariff or threshold; an <code>enum</code> with constant-specific methods (<code>PriceCode</code>) is the home for a rule that differs per category. <b>Interfaces and composition.</b> An <code>interface</code> is the seam you inject: a lambda can implement a one-method interface, so a test fake is one line, and constructor injection with <code>final</code> fields makes dependencies visible. Prefer delegation to <code>extends</code>: <code>class UndoStack extends ArrayList</code> hands every <code>add(int, E)</code> to your users, and <code>HashSet.addAll</code> calling <code>add</code> is the classic fragile-base-class trap. <b>Value objects.</b> A <code>record</code> gives you <code>equals</code>, <code>hashCode</code> and <code>toString</code> by value, plus a compact constructor for validation (<code>Phone</code>, <code>Money</code>, <code>Address</code>), so it is safe as a <code>HashMap</code> key; <code>List.copyOf</code> and <code>final</code> fields keep it immutable. <b>Closed sets.</b> A <code>sealed interface</code> with records replaces a type-code <code>switch</code>, and the compiler lists every place a new variant must be handled. <b>Time and config.</b> Pass a <code>java.time.Clock</code> (<code>Clock.fixed</code> in tests) instead of calling <code>LocalDate.now()</code>; never read a static mutable <code>Config</code>. <b>Numbers.</b> <code>int</code> division truncates toward zero and <code>int</code> overflow wraps silently, so keep money in <code>long</code> minor units (use <code>Math.addExact</code> to fail loudly) or <code>BigDecimal</code>, never <code>double</code>.</p>`,
      python: `<p><b>One home for a rule.</b> Class attributes (<code>FREE_ABOVE = 500</code>) or module-level constants in upper case hold a tariff; an <code>Enum</code> whose values carry small rule objects plays the role of Java's constant-specific enum methods. <b>Interfaces and composition.</b> Use <code>typing.Protocol</code> for a seam any object with the right methods can fill (a test fake needs no base class), or <code>abc.ABC</code> with <code>@abstractmethod</code> when you want a class that forgets a method to fail at construction. A <code>Callable</code> is the one-method interface; a clock is just <code>Callable[[], date]</code>. Inheritance is even riskier here because nothing stops a subclass from overriding anything, so prefer a field that <i>has</i> the collaborator (<code>deque(maxlen=50)</code> inside <code>UndoStack</code> instead of subclassing <code>list</code>). <b>Value objects.</b> <code>@dataclass(frozen=True)</code> generates <code>__eq__</code> and <code>__hash__</code> by field, so it works as a dict key; validate in <code>__post_init__</code>. Writing your own <code>__eq__</code> removes <code>__hash__</code> unless you define it too. <b>Tell, don't ask.</b> A single leading underscore (<code>self._wallet</code>) is only a convention, so the discipline is yours; avoid public getters that return the inner object. <b>Numbers.</b> Integers never overflow, but <code>//</code> floors toward minus infinity (Java and C++ truncate toward zero), which only matters for negative values; keep money in integer minor units or <code>Decimal</code>, not <code>float</code>.</p>`,
      js: `<p><b>TypeScript.</b> <b>One home for a rule.</b> <code>static readonly</code> members on a class (or a <code>const</code> object) hold a tariff; there is no constant-specific enum method, so a rule per category is an object that implements an interface (<code>PriceCode</code>), and a string-literal union (<code>"GOLD" | "SILVER"</code>) replaces an <code>enum</code> for a closed set. <b>Interfaces and composition.</b> An <code>interface</code> is erased at run time and structural, so an object literal with the right methods is a perfectly good test fake; a function type (<code>type Clock = () =&gt; Date</code>) is the one-method interface. Constructor parameter properties (<code>constructor(private readonly repo: Repo) {}</code>) are the shortest way to inject. Prefer a field that holds the collaborator over <code>extends</code>, and turn on <code>strict</code> and <code>noImplicitOverride</code> so an accidental override is an error. <b>Value objects.</b> <code>===</code>, <code>Map</code> keys and <code>Set</code> compare objects by identity, so two <code>Phone</code> instances with the same digits are different keys: key the map by a string (<code>phone.e164</code>) or give the class an <code>equals</code> method. <code>readonly</code> exists only at compile time; <code>Object.freeze</code> enforces it. <b>Tell, don't ask.</b> <code>private</code> is also compile-time only (use <code>#field</code> for real privacy). <b>Numbers.</b> <code>number</code> is a double: keep money in integer minor units, use <code>Math.floor</code> (or <code>Math.trunc</code>) after dividing because <code>/</code> never truncates, and check <code>Number.isSafeInteger</code> past 2^53 (<code>BigInt</code> beyond that). Dates are mutable <code>Date</code> objects: inject a <code>() =&gt; Date</code> and do not call <code>new Date()</code> inside business rules.</p>`,
      cpp: `<p><b>One home for a rule.</b> <code>static constexpr</code> members in a class (or <code>inline constexpr</code> variables) are the named constants; a category rule is a small struct holding <code>std::function</code> members or a class with virtual methods. <b>Interfaces and composition.</b> An interface is a class of pure virtual functions with a <b>virtual destructor</b>; mark every implementation <code>override</code> so a signature mismatch fails to compile, and <code>final</code> on a leaf class. <b>Ownership is the injection decision.</b> A service that owns its part holds a <code>std::unique_ptr&lt;Interface&gt;</code> (<code>Robot</code> and its <code>Movement</code>, <code>GameCharacter</code> and its buffs); a service that only uses a dependency owned by <code>main</code> holds a reference (<code>CheckoutService</code> and its gateway), which must outlive it. Never copy a polymorphic object by value: it slices the derived part. Containers of polymorphic objects are <code>vector&lt;unique_ptr&lt;Base&gt;&gt;</code>. <b>Value objects.</b> A plain class with a validating constructor (throw <code>std::invalid_argument</code>) is the equivalent of a Java record; <code>auto operator&lt;=&gt;(const T&amp;) const = default;</code> generates comparison, so it works as a <code>std::map</code> key; <code>const</code> members and const methods give immutability. <b>Names to avoid.</b> <code>export</code>, <code>register</code>, <code>new</code>, <code>delete</code> and <code>default</code> are keywords, so the Java methods <code>export</code> and <code>register</code> become <code>exportRows</code> and <code>registerMember</code> here. <b>Numbers.</b> Signed overflow is undefined behaviour: use <code>long long</code> for money and <code>__builtin_add_overflow</code> to detect it; <code>/</code> truncates toward zero. <b>Time.</b> Inject a clock as a <code>std::function</code> returning a <code>std::chrono::sys_days</code> instead of calling <code>system_clock::now()</code> inside the rule.</p>`
    },
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
