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
  function cp(label, lines, hl) {
    return { type: 'code', label: label, lang: 'java', code: lines.join('\n'), hl: hl || {} };
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
    code: `// BEFORE: the "10% off when subtotal is above 1000" rule lives in TWO places.
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
}`,
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
      { title: 'Magic number → named constant', html: `<p>A delivery app has <code>if (km &gt; 7)</code> in the fee code, the ETA code and the "free delivery" banner. Marketing changes the free radius to 10 km. Two places get updated; the banner still says 7 km. Fix: <code>static final int FREE_DELIVERY_KM = 10;</code> in one place (or a config value). The constant also <b>documents</b> what 7 meant.</p>`, code: `final class DeliveryRules {
    static final int FREE_DELIVERY_KM = 10;
    private DeliveryRules() {}
    static boolean isFree(int km) { return km <= FREE_DELIVERY_KM; }
}` },
      { title: 'Accidental duplication — do NOT merge', html: `<p>${H.c('y', 'Looks the same:')} <code>gstRate = 0.18</code> and <code>lateFeeRate = 0.18</code>. ${H.c('r', 'Different knowledge:')} one is set by the government, the other by your finance team. Merging them into one constant means a GST change silently changes late fees. Keep two constants with two names. DRY is about <b>reasons to change</b>, not matching text.</p>` },
      { title: 'Derived data: store the fact once', html: `<p>A <code>User</code> table stores <code>dateOfBirth</code> <b>and</b> <code>age</code>. After a birthday, <code>age</code> is wrong unless a nightly job fixes it. The age is <i>derived</i> knowledge. Store only the DOB and compute the age when needed.</p>`, code: `record User(String name, LocalDate dateOfBirth) {
    int ageOn(LocalDate today) { return Period.between(dateOfBirth, today).getYears(); }
}` },
      { title: 'DRY in tests vs DAMP', html: `<p>Test code follows a softer rule: <b>DAMP</b> ("Descriptive And Meaningful Phrases"). It is fine to repeat a few setup lines so each test reads on its own. Hiding everything in a giant shared <code>setUp()</code> makes a failing test hard to understand. Do extract <i>helpers</i> such as <code>anOrderWith(items)</code>, which keep both DRY and readability.</p>` }
    ],
    deepDive: `<p><b>DRY versus the wrong abstraction.</b> Sandi Metz's well-known line: <i>"duplication is far cheaper than the wrong abstraction"</i>. Here is how it goes wrong. Two similar methods get merged into one. A new caller needs a small difference, so somebody adds a boolean parameter. Then another one. After a year the shared method has 5 flags and 30 branches, and nobody dares touch it. The cure is to <b>inline the abstraction back</b> into each caller and re-extract only what is truly shared. Kent C. Dodds calls the habit <b>AHA</b>: "Avoid Hasty Abstractions".</p>
<p><b>DRY creates coupling.</b> Sharing code means every user now depends on it. Inside one service that is cheap. Across microservices, a shared "common" library with business rules makes teams release together, which is the <i>distributed monolith</i> problem. Many teams accept some duplication <i>between</i> services (each owns its own copy of a DTO) to keep them independently deployable, while staying strictly DRY <i>inside</i> each service.</p>
<p><b>Single source of truth for data</b> is DRY applied to storage: database normalization, one service owning each entity, caches that are clearly <i>copies</i> with an invalidation story. When you <i>must</i> copy (caches, read replicas, denormalized read models in CQRS), make the copy <b>generated</b> from the source, never hand-edited.</p>
<p><b>Generators</b> are a DRY tool: OpenAPI or Protobuf schemas generate client and server types, so the contract lives in one file. Java <code>record</code>s DRY up <code>equals/hashCode/toString</code> boilerplate. Enums with fields DRY up parallel <code>switch</code> statements.</p>
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
        code: `class CartService {
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
}`
      },
      mcq: { q: 'What is the most important thing to fix first?', options: ['Rename the methods to calculateShippingFee', 'Give the shipping rule a single home that all three services call', 'Convert int to double for precision', 'Add comments explaining the rule in each class'], answer: 1, explain: 'The bug comes from the same knowledge living in 3 places. Comments would be a 4th copy; renaming does not stop drift.' },
      hints: [
        `<p>Hint 1: Write down the rule in one English sentence. Every place that encodes that sentence is a copy of the same knowledge.</p>`,
        `<p>Hint 2: Create a small <code>ShippingPolicy</code> class with named constants (<code>FREE_ABOVE</code>, <code>STANDARD_FEE</code>, <code>EXPRESS_SURCHARGE</code>) and one method <code>feeFor(order, express)</code>.</p>`,
        `<p>Hint 3: Pick the charging code as the truth (<code>&gt;= 500</code> is free, express always adds 30). Inject the policy into each service so tests can swap it. Check the boundary 499 / 500 and express on a free order.</p>`
      ],
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
        CheckoutService checkout = new CheckoutService(p);
        EmailService email = new EmailService(p);
        int[] orders = {499, 500, 501};
        for (int o : orders) {
            System.out.println(o + " -> charged " + checkout.fee(o, true) + ", " + email.receiptLine(o, true));
        }
    }
}`,
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
    code: `// OVER-ENGINEERED (YAGNI + KISS violations): a "framework" for a single greeting.
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
}`,
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
      { title: 'The generic repository nobody needed', html: `<p>A team writes <code>GenericRepository&lt;T, ID&gt;</code> with <code>findAll, findBy(Criteria), page, sort, softDelete, audit…</code> for a feature that only needs <code>findById</code> and <code>save</code>. Each new entity has to "fit" the generic shape, and bugs in unused methods still need fixing. ${H.c('g', 'YAGNI version:')} a small <code>OrderRepository</code> with the two methods actually called. Add more when a caller needs them.</p>`, code: `interface OrderRepository {
    Optional<String> findById(long id);
    void save(long id, String order);
}
class InMemoryOrderRepository implements OrderRepository {
    private final Map<Long, String> store = new HashMap<>();
    public Optional<String> findById(long id) { return Optional.ofNullable(store.get(id)); }
    public void save(long id, String order) { store.put(id, order); }
}` },
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
        code: `enum Priority { LOW, NORMAL, HIGH, CRITICAL }
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
}`
      },
      mcq: { q: 'Which part of the over-engineered design is worth KEEPING?', options: ['The Priority enum', 'The ChannelRegistry keyed by strings', 'A small interface in front of the mail sender so tests can use a fake', 'The RetryPolicy interface with NoRetry'], answer: 2, explain: 'A seam for testing has a real, present-day user (the test). The other parts serve only imagined futures.' },
      hints: [
        `<p>Hint 1: For each type, ask "who uses this <i>today</i>?" If the only answer is "future us", it is speculative generality.</p>`,
        `<p>Hint 2: Keep one interface <code>MailSender { void send(String to, String subject) }</code> because a test needs a fake. Everything else can collapse into a plain <code>ShippingNotifier</code> class.</p>`,
        `<p>Hint 3: Recipe: delete Priority, RetryPolicy, NoRetry, Channel hierarchy, factory and registry → keep MailSender + SmtpMailSender + ShippingNotifier. Write a FakeMailSender that records messages and assert one message was sent. Note in the PR where SMS would plug in later.</p>`
      ],
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
        new ShippingNotifier(fake).orderShipped("ben@mail.com", 7);
        System.out.println("test sees: " + fake.sent);   // [ben@mail.com | Your order #7 has shipped]
    }
}`,
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
  ['<b>Single inheritance in Java</b>', 'You get only one parent class.', 'You can hold any number of parts.']
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
    code: `// BROKEN: extending HashSet couples us to HashSet's private habit:
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
}`,
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
      { title: 'java.util.Stack extends Vector — a famous mistake', html: `<p>Because <code>Stack</code> inherits from <code>Vector</code>, you can call <code>stack.add(0, x)</code> or <code>stack.remove(3)</code> and break the stack's last-in-first-out promise. Its Javadoc now recommends <code>Deque&lt;Integer&gt; stack = new ArrayDeque&lt;&gt;()</code>. <code>Properties extends Hashtable</code> has the same flaw: you can <code>put</code> non-String values that later break <code>getProperty</code>.</p>`, code: `Stack<Integer> s = new Stack<>();
s.push(1); s.push(2);
s.add(0, 99);                 // legal, but no longer a stack!
System.out.println(s);        // [99, 1, 2]
Deque<Integer> better = new ArrayDeque<>();
better.push(1); better.push(2);
System.out.println(better.pop()); // 2 — only stack operations are natural here` },
      { title: 'Strategy: change behaviour at runtime', html: `<p>A game character can walk, then picks up a jetpack and flies. With inheritance you would need <code>WalkingHero</code> and <code>FlyingHero</code> and could not switch. With composition the hero <b>has</b> a <code>Movement</code> and swaps it.</p>`, code: `interface Movement { String move(); }
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
}` },
      { title: 'Where inheritance is the right tool', html: `<p>A closed family of shapes: every <code>Circle</code> truly <i>is a</i> <code>Shape</code>, no subclass inherits implementation it does not want, and <code>sealed</code> stops strangers from adding subclasses. Records are final, so there is no fragile-base problem.</p>`, code: `sealed interface Shape permits Circle, Square {}
record Circle(double r) implements Shape {}
record Square(double side) implements Shape {}
class Areas {
    static double area(Shape s) {
        return switch (s) {
            case Circle c -> Math.PI * c.r() * c.r();
            case Square q -> q.side() * q.side();
        };
    }
}` },
      { title: 'Roles that change over time', html: `<p><code>class Seller extends User</code> breaks the day a buyer also starts selling (Java has no multiple inheritance, and the object cannot change class). Model roles as parts: <code>User</code> has a <code>Set&lt;Role&gt;</code> or optional <code>SellerProfile</code>. Same for <code>Employee</code> → contractor, <code>Student</code> → teaching assistant.</p>` }
    ],
    deepDive: `<p><b>Why the fragile base class happens:</b> a subclass that overrides a method participates in the parent's <i>self-calls</i>. The parent author may change which methods call which (a legal refactor that keeps the public contract), and every subclass that relied on the old call graph breaks. Effective Java Item 19: <i>"Design and document for inheritance or else prohibit it."</i> If a class is meant to be extended, its docs must say which overridable methods it calls internally (the "Implementation Requirements" tag <code>@implSpec</code>). Otherwise make it <code>final</code> or give it only private constructors.</p>
<p><b>Constructors calling overridable methods</b> are another trap: the parent constructor runs before subclass fields are initialized, so an override that reads a subclass field sees <code>null</code>/<code>0</code>.</p>
<p><b>Forwarding boilerplate:</b> a full <code>ForwardingSet</code> must implement ~15 methods of <code>Set</code>. Guava ships <code>ForwardingSet</code>/<code>ForwardingMap</code>; Kotlin has <code>class X(inner: Set&lt;E&gt;) : Set&lt;E&gt; by inner</code>; Lombok has <code>@Delegate</code>. Java's interface <code>default</code> methods let you share small behaviours without a base class.</p>
<p><b>Performance:</b> an extra delegation call costs effectively nothing — HotSpot inlines small monomorphic calls. Do not choose inheritance for speed.</p>
<p><b>Identity &amp; equality:</b> wrappers break <code>==</code> identity and can surprise callbacks (the wrapped object passes <code>this</code> to a listener, bypassing the wrapper — the "SELF problem"). Know it, it rarely matters.</p>
<p><b>Inheritance vs composition is also coupling:</b> inheritance is the <i>strongest</i> coupling in OO (child sees protected fields and the parent's call graph). Composition through an interface is among the weakest. That is why this principle sits next to "low coupling" in every design book.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants trained on decades of Java code still reach for <code>extends</code> often — older tutorials loved deep hierarchies (<code>Animal → Mammal → Dog</code>). Ask for "an admin user" and you may get <code>class Admin extends User</code> even when admin is a role that can be granted and revoked.</p>
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
        code: `abstract class Robot {
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
}`
      },
      mcq: { q: 'The robot must switch from walking to flying while the program runs. What does that requirement tell you?', options: ['Use a deeper inheritance tree', 'Movement should be a part (field) the robot holds and can replace', 'Use instanceof checks', 'Make Robot an enum'], answer: 1, explain: 'An object cannot change its class at runtime, but it can replace a field. Runtime variability is the strongest clue for composition (Strategy).' },
      hints: [
        `<p>Hint 1: List the things that vary independently: <i>how it moves</i> and <i>how it speaks</i>. Each independent axis becomes its own interface.</p>`,
        `<p>Hint 2: <code>interface Movement { String move(); }</code> and <code>interface Speech { String speak(); }</code>. <code>Robot</code> holds one of each and delegates.</p>`,
        `<p>Hint 3: Add setters (or a builder) to swap parts. Default to sensible parts in the constructor. Check: swim = 1 new class; 3 movements × 2 speech = 6 combos with only 5 small classes + Robot.</p>`
      ],
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
${H.table(['Coupling', 'What it looks like in Java', 'Why it hurts'], [
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
    code: `// BEFORE: high coupling — concrete classes created inside, global state, control flag.
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
}`,
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
      { title: 'Control coupling: kill the boolean flag', html: `<p><code>render(doc, true)</code> — what does <code>true</code> mean? The caller must know the callee's insides. Split into two intention-revealing methods. Each is simpler and the call site reads like English.</p>`, code: `class Renderer {
    // before: String render(String doc, boolean asPdf) { if (asPdf) ... else ... }
    String renderHtml(String doc) { return "<html>" + doc + "</html>"; }
    String renderPdf(String doc)  { return "%PDF " + doc; }
}` },
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
      constraints: `Keep the public behaviour: charge amount + tax, then email a receipt. Java 21, no frameworks (plain constructor injection).`,
      example: `<p>Charge 1000 with tax 18 → gateway receives ${H.c('g', '1180')}, customer receives "Paid 1180". In a test with a fake gateway, ${H.c('g', 'no real API call')} happens and we can assert the amount.</p>`,
      brute: {
        why: `<p>Four kinds of coupling in one class: <b>external</b> (concrete Stripe/SMTP classes), <b>common</b> (static mutable <code>Settings</code>), <b>control</b> (<code>dryRun</code> flag), and creation coupling (<code>new</code> inside means you cannot substitute anything). Consequences: tests are slow and flaky, switching vendor edits business code, and one test changing <code>Settings.taxPercent</code> breaks others.</p>`,
        code: `class Settings { static int taxPercent = 18; }
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
}`
      },
      mcq: { q: 'What is the single most useful first step to make CheckoutService unit-testable?', options: ['Make every method static', 'Accept PaymentGateway and Mailer interfaces through the constructor instead of calling new', 'Add more dryRun flags', 'Catch all exceptions'], answer: 1, explain: 'Constructor injection of interfaces lets tests pass fakes, removes the vendor from business code and makes dependencies visible.' },
      hints: [
        `<p>Hint 1: Circle every <code>new</code>, every <code>static</code> field and every boolean parameter. Each is a coupling point.</p>`,
        `<p>Hint 2: Define <code>PaymentGateway</code> and <code>Mailer</code> interfaces owned by the checkout code. Pass them plus <code>taxPercent</code> into the constructor.</p>`,
        `<p>Hint 3: Replace <code>dryRun</code> with a different gateway implementation (a <code>DryRunGateway</code> that charges nothing). Write a recording fake in the demo to prove the amount is 1180.</p>`
      ],
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

        // production wiring
        new CheckoutService(new StripeGateway(), new ConsoleMailer(), 18).checkout("ben@mail.com", 500);
    }
}`,
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
<li><b>Streams</b>: <code>list.stream().filter(...).map(...).toList()</code> — each call returns a stream you created; you are talking to one friend.</li>
<li><b>Plain data structures</b> (records, DTOs) whose whole job is to expose data: <code>dto.address().city()</code> on a JSON response record. Bob Martin (Clean Code) separates <i>objects</i> (hide data, expose behaviour) from <i>data structures</i> (expose data, no behaviour). LoD is for objects.</li>
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
    code: `// ----- BEFORE: the paperboy reaches into the customer's wallet -----
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
}`,
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
        frames.push({ narr: 'We are inside <code>ShippingService</code>. <code>' + H.esc(toks[0]) + '</code> is a parameter or field — a <b>friend</b>. Talking to it is allowed.', parts: [gp('Who does ShippingService know?', nodes, edges.slice(), clone(hl), clone(ehl), clone(tags), 52), cp('Line under review', ['String x = ' + s + ';'], { 1: 'cur' }), { type: 'vars', vals: { hops: 0, strangers: 0 } }] });
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
          frames.push({ narr: '<b>Tell, Don\'t Ask.</b> Give the first object a method that answers the real question, e.g. <code>' + H.esc(tell) + '</code> (in real code pick a domain name such as <code>order.shippingCity()</code>). Each class now talks only to its own direct part. ShippingService knows exactly one class.', parts: [gp('After: each object knows only its neighbour', aNodes, aEdges, { ME: 'ok', T0: 'sel' }, aEhl, { T0: 'only friend' }, 52), cp('Refactored', ['// ShippingService', 'String x = ' + tell + ';', '', '// ' + types[0] + ' delegates one step down; so does each part'], { 2: 'ok' })] });
        }
        frames.push({ narr: 'Remember the exceptions: fluent builders (<code>sb.append().append()</code>), streams and plain data records are not violations — you are talking to the same object, or to data with no behaviour to protect.', parts: [{ type: 'table', label: 'Violation or not?', columns: ['code', 'verdict'], rows: [['sb.append("a").append("b")', 'OK — same object returned'], ['list.stream().filter(p).toList()', 'OK — pipeline you own'], ['dto.address().city()  (record from JSON)', 'OK — data structure'], ['order.getCustomer().getWallet().debit(5)', 'VIOLATION — reaching into objects']], hl: { 3: 'bad' } }] });
        return frames;
      }
    }],
    examples: [
      { title: 'Car needs fuel?', html: `<p>${H.c('r', 'Ask:')} <code>if (car.getEngine().getFuelTank().getLevel() &lt; 10)</code>. ${H.c('g', 'Tell:')} <code>if (car.needsFuel())</code>. When electric cars arrive, <code>needsFuel</code> becomes <code>needsCharge</code> logic inside <code>Car</code>; callers do not care that there is no fuel tank anymore.</p>`, code: `class FuelTank { private int level; FuelTank(int l) { level = l; } boolean isBelow(int pct) { return level < pct; } }
class Engine { private final FuelTank tank; Engine(FuelTank t) { tank = t; } boolean lowOnFuel() { return tank.isBelow(10); } }
class Car {
    private final Engine engine;
    Car(Engine e) { engine = e; }
    boolean needsFuel() { return engine.lowOnFuel(); }   // each level talks only to its own part
}` },
      { title: 'Bank account: stop doing its job for it', html: `<p>${H.c('r', 'Ask:')} <code>if (acct.getBalance() &gt;= amt) acct.setBalance(acct.getBalance() - amt);</code> — the rule "no overdraft" now lives in every caller, and two threads can both pass the check (a race). ${H.c('g', 'Tell:')} <code>acct.withdraw(amt)</code> keeps the rule and the locking inside the account. LoD and encapsulation are the same idea seen from two sides.</p>` },
      { title: 'Data structures are allowed to be dug into', html: `<p>A JSON response mapped to records: <code>resp.data().user().email()</code>. These records have no behaviour and no invariants; they exist to carry data. Wrapping them in "tell" methods would just add a Middle Man. LoD protects <b>objects with behaviour</b>, not passive data.</p>`, code: `record Address(String city) {}
record UserDto(String email, Address address) {}
class DtoDemo {
    public static void main(String[] args) {
        UserDto u = new UserDto("a@b.com", new Address("Pune"));
        System.out.println(u.address().city());   // fine: plain data
    }
}` },
      { title: 'The test-mock smell', html: `<p>If testing <code>InvoiceService</code> requires <code>when(order.getCustomer()).thenReturn(cust); when(cust.getAddress()).thenReturn(addr); when(addr.getCountry())...</code>, the class under test violates LoD. After introducing <code>order.billingCountry()</code> the test needs one stub. Painful mocks are a design signal.</p>` }
    ],
    deepDive: `<p><b>Formal versions:</b> the original paper (Lieberherr, Holland, Riel, 1988) defined a <i>class form</i> (you may call methods of classes of your fields/arguments) and an <i>object form</i> (the stricter list in this topic). The object form is what people mean today.</p>
<p><b>Why it reduces coupling:</b> every method you call on an object is a dependency on that object's type. A train wreck of length k makes you depend on k types and on the <i>shape of the path</i> between them. LoD keeps each class's knowledge to its immediate neighbourhood, so changes to the object graph stay local. In connascence terms, it removes connascence of type/structure across distant classes.</p>
<p><b>The cost:</b> wrapper methods. Taken mechanically, LoD creates <code>Order.getCustomerAddressCityName()</code> for every combination — the <b>Middle Man</b> smell, and wide interfaces (an Interface Segregation problem). The judgment call: add a method when it names a <b>domain concept</b> (<code>shippingCity</code>, <code>isOverdue</code>, <code>needsFuel</code>). If you notice many callers asking the same deep question, that is strong evidence the method belongs on the first object.</p>
<p><b>Feature envy is LoD's twin:</b> a method that pulls lots of data from another object to compute something "envies" that object; Move Method puts the computation where the data lives, which removes the chain at the same time.</p>
<p><b>Null chains:</b> <code>a.getB().getC()</code> also fails with <code>NullPointerException</code> anywhere along the chain. <code>Optional.map(...).map(...)</code> hides the NPE but not the coupling — it is still a train wreck, just a safer one. Java's "helpful NullPointerExceptions" (JEP 358) at least tell you which link was null.</p>
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
        code: `class Wallet {
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
}`
      },
      mcq: { q: 'After the refactor, which call should Paperboy make?', options: ['c.getWallet().subtract(due)', 'c.pay(due) returning the amount paid', 'c.getUpi().debit(due)', 'Wallet.subtract(c, due)'], answer: 1, explain: 'Tell the customer what is needed; how they pay is their business. Paperboy then never changes when payment options change.' },
      hints: [
        `<p>Hint 1: Who owns the money? The customer. So the decision "can I pay, and how?" should live in <code>Customer</code>.</p>`,
        `<p>Hint 2: Give <code>Customer</code> a method <code>int pay(int due)</code> that returns the amount paid (0 if it cannot). Remove <code>getWallet()</code> so no one can reach in again.</p>`,
        `<p>Hint 3: Inside <code>pay</code>, Customer may talk to its own fields (wallet, upi). Check wallet first, then UPI. Paperboy's loop becomes <code>total += c.pay(due)</code>.</p>`
      ],
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
        List<Customer> cs = List.of(
            new Customer(new Wallet(500), new UpiAccount(0)),
            new Customer(new Wallet(50), new UpiAccount(300)),
            new Customer(new Wallet(10), new UpiAccount(0)));
        System.out.println(new Paperboy().collectAll(cs, 100));   // 200
    }
}`,
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
<p><b>How small?</b> There is no magic number. A useful guide: fits on one screen, nesting ≤ 2 levels, you can name it without "and". Very small is fine in Java — the JIT inlines tiny methods, so there is no speed cost.</p>`,
    clues: [
      'Reviewer asks "what does <code>process(data, true)</code> do?" → poor names + flag argument.',
      'Method needs a comment above each block ("// validate", "// compute total") → each block wants to be an Extract Method with that comment as its name.',
      'Deeply nested <code>if</code>s (arrow shape) → guard clauses.',
      'Parameter list with 5+ arguments, several of the same type → parameter object / builder.',
      'Same concept called fetch/get/retrieve/load in one codebase → inconsistent vocabulary.',
      'Machine-coding round evaluation criteria mention "readability" → names and small functions are graded.'
    ],
    code: `record Item(String name, int priceCents, int qty) {}
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
}`,
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
          if (!/^[A-Za-z_$][\w$]*$/.test(nm)) issues.push('not a valid Java identifier');
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
      { title: 'Guard clauses flatten arrow code', html: `<p>Deep nesting forces readers to keep a stack of conditions in their head. Handle the exceptional cases first and return.</p>`, code: `class Shipping {
    String label(String name, String city, boolean paid) {
        if (name == null || name.isBlank()) return "ERROR: no name";
        if (city == null || city.isBlank()) return "ERROR: no city";
        if (!paid) return "HOLD: unpaid";
        return name + ", " + city;             // happy path, not nested
    }
}` },
      { title: 'Command–Query Separation', html: `<p>${H.c('r', 'Confusing:')} <code>if (set("color", "red"))</code> — does it check whether color <i>was</i> red, or set it and report success? ${H.c('g', 'Clear:')} <code>if (hasAttribute("color")) setAttribute("color", "red");</code> A query must be safe to call twice; a command changes state and returns nothing (or throws on failure). (Exceptions such as <code>Deque.pop()</code> or <code>Set.add()</code> returning a boolean are accepted idioms — know them.)</p>` },
      { title: 'Parameter object for long argument lists', html: `<p><code>search(String from, String to, LocalDate depart, LocalDate ret, int adults, int kids, boolean flexible)</code> — easy to swap <code>from</code> and <code>to</code> by mistake. Group what belongs together: <code>search(Route route, DateRange dates, Passengers pax)</code>. The new types also become homes for behaviour (<code>dates.nights()</code>).</p>`, code: `record Route(String from, String to) {}
record DateRange(LocalDate depart, LocalDate ret) {
    DateRange { if (ret.isBefore(depart)) throw new IllegalArgumentException("return before departure"); }
    long nights() { return java.time.temporal.ChronoUnit.DAYS.between(depart, ret); }
}
record Passengers(int adults, int kids) {}
class FlightSearch {
    String search(Route route, DateRange dates, Passengers pax) {
        return route.from() + "->" + route.to() + " for " + dates.nights() + " nights, " + (pax.adults() + pax.kids()) + " pax";
    }
}` },
      { title: 'Comments: why, not what', html: `<p>${H.c('r', 'Redundant:')} <code>// increment retry count</code> above <code>retryCount++</code>. ${H.c('g', 'Valuable:')} <code>// Bank API rate-limits at 5 req/s; retry with backoff or we get banned for an hour.</code> If you need a comment to explain <i>what</i> code does, try a better name or an extracted method first. Keep comments for <i>why</i>, warnings, and public API docs.</p>` }
    ],
    deepDive: `<p><b>Why small functions help the brain:</b> working memory holds only a handful of "chunks" at once (often quoted as about 4). A well-named function turns 15 lines into one chunk ("applyLoyaltyDiscount"). Deep nesting is costly because each level is another chunk you must hold — that is why SonarSource's <b>cognitive complexity</b> metric adds an extra penalty per nesting level, unlike plain <b>cyclomatic complexity</b> (number of independent paths = decisions + 1).</p>
<p><b>Can functions be too small?</b> Yes. Splitting into dozens of 1-line methods that are each used once, with names that just restate the code (<code>addOne(x)</code>), forces readers to jump around ("lasagna code"). Extract when the new name <b>adds information</b> or hides a level of detail. Inline Method is the reverse refactoring for when it doesn't.</p>
<p><b>Performance in Java:</b> HotSpot's JIT inlines small methods aggressively (by default, methods under 35 bytes of bytecode always, and hot methods up to ~325 bytes), so extracting methods almost never costs speed. Megamorphic virtual calls are the rare exception, and only profiling can tell you it matters.</p>
<p><b>Names and architecture:</b> Domain-Driven Design calls the shared vocabulary of developers and business people the <b>Ubiquitous Language</b>. When code uses the same words as the business ("backorder", "settlement", "chargeback"), conversations map directly onto classes. Name drift (the business says "subscription", code says <code>Plan</code>) is a slow tax on every discussion.</p>
<p><b>Getters and setters:</b> the JavaBeans <code>getX/setX</code> convention is required by many frameworks, but domain objects read better with intention-revealing commands (<code>account.deposit(m)</code> rather than <code>setBalance</code>). Java records use <code>x()</code> accessors without the <code>get</code> prefix.</p>
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
        code: `class V {
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
}`
      },
      mcq: { q: 'What is the safest FIRST step before touching this code?', options: ['Rewrite it from scratch', 'Write tests that pin the current outputs for valid and each invalid case', 'Rename the class', 'Add comments to each if'], answer: 1, explain: 'Refactoring means behaviour stays the same. Characterization tests prove it, so every later step can be checked in seconds.' },
      hints: [
        `<p>Hint 1: Pin behaviour first: one valid input and one input per error, including the priority case (bad password + bad age → "weak password").</p>`,
        `<p>Hint 2: Invert each <code>if</code> into a guard clause that returns the error immediately; the final line returns "OK". Keep the order email → password → age.</p>`,
        `<p>Hint 3: Extract <code>isValidEmail</code>, <code>isStrongPassword</code>, <code>isAllowedAge</code>, and constants <code>MIN_PASSWORD_LENGTH = 8</code>, <code>MIN_AGE = 18</code>, <code>MAX_AGE = 120</code>. Rename <code>V.chk</code> to <code>SignupValidator.validate(email, password, age)</code>.</p>`
      ],
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
    }
}`,
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
    code: `// BEFORE: the same switch on a type code appears in several classes (shotgun surgery).
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
}`,
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
        frames.push({ narr: 'Adding <b>' + H.esc(newT) + '</b> now = <b>one new class</b>. And because the interface is <code>sealed</code> (or simply abstract), the compiler refuses to build until every method is implemented — you <i>cannot</i> forget one.', parts: [cp(newT + '.java', ['record ' + newT.replace(/\W/g, '') + '(int base) implements Employee {', '  public int pay()    { return base; }', '  public int bonus()  { return 0; }', '  public String badge()      { return "' + newT.slice(0, 3).toUpperCase() + '"; }', '  public String reportLine() { return "' + newT + ' " + pay(); }', '}'], rng(1, 6, 'ok')), { type: 'vars', label: 'change cost', vals: { filesEdited: 1, forgottenRisk: 'none (compiler checks)' }, hl: { filesEdited: 'ok', forgottenRisk: 'ok' } }] });
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
      { title: 'Primitive Obsession → value object', html: `<p>Money as <code>double</code> gives rounding errors (<code>0.1 + 0.2 != 0.3</code>) and lets you add rupees to dollars. A small immutable <code>Money</code> type fixes both and becomes the home for money rules.</p>`, code: `record Money(long minorUnits, String currency) {
    Money {
        Objects.requireNonNull(currency);
        if (minorUnits < 0) throw new IllegalArgumentException("negative money");
    }
    Money plus(Money other) {
        if (!currency.equals(other.currency)) throw new IllegalArgumentException("currency mismatch");
        return new Money(minorUnits + other.minorUnits, currency);
    }
    Money percent(int p) { return new Money(minorUnits * p / 100, currency); }
}` },
      { title: 'Feature Envy → Move Method', html: `<p><code>InvoicePrinter.lineTotal(Item i)</code> reads <code>i.price()</code>, <code>i.qty()</code>, <code>i.discount()</code> and nothing of its own. It "envies" <code>Item</code>. Move it: <code>item.total()</code>. Now the rule lives next to its data, and other callers (cart, refunds) reuse it instead of copying it.</p>` },
      { title: 'Divergent Change vs Shotgun Surgery', html: `${H.table(['', 'Divergent Change', 'Shotgun Surgery'], [['Shape', 'one class ← many reasons', 'one reason → many classes'], ['Example', '<code>Order</code> edited for tax, PDF layout and DB schema changes', 'adding a currency edits 7 files'], ['Fix', 'split (Extract Class)', 'gather (Move Method/Field, Inline Class)']])}` },
      { title: 'Characterization test for legacy code', html: `<p>You do not know what <code>legacyFee(int)</code> <i>should</i> return, but you can record what it <i>does</i> return today and lock it in. Any refactor that changes these numbers is caught immediately.</p>`, code: `class LegacyFees {
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
}` }
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
        code: `class Movie {
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
}`
      },
      mcq: { q: 'Which refactoring should come FIRST in Fowler\'s approach?', options: ['Replace Conditional with Polymorphism immediately', 'Extract Method for the charge calculation, with tests pinning the current output', 'Rewrite statement() as HTML', 'Make priceCode a String'], answer: 1, explain: 'Start with tests, then small safe steps: extract the calculation, move it next to its data, and only then replace the conditional. Big jumps lose behaviour.' },
      hints: [
        `<p>Hint 1: Pin the exact output string with a test. Then Extract Method <code>amountFor(rental)</code> and <code>pointsFor(rental)</code> from the loop body.</p>`,
        `<p>Hint 2: These methods use only rental/movie data → Move Method into <code>Rental</code> (feature envy). Then the switch depends on the price code only → move it into a <code>PriceCode</code> type.</p>`,
        `<p>Hint 3: Make <code>PriceCode</code> an enum with constant-specific methods <code>charge(days)</code> and <code>points(days)</code>. Customer keeps <code>totalCharge()</code>/<code>totalPoints()</code>; <code>statement()</code> only formats. An <code>htmlStatement()</code> reuses the same methods.</p>`
      ],
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
    }
}`,
        complexity: `<p>Time O(rentals) per statement (totals are recomputed — two passes instead of one, which is fine; cache only if profiling says so). Places to edit for a new category: 3+ → 1.</p>`,
        followUps: ['A movie can change category (new release becomes regular after 3 months). Does the enum design handle it? (yes: priceCode is a field; use a new Movie record or make it mutable)', 'Why not use a sealed interface with classes instead of an enum? (enum is enough when categories carry no per-instance state)', 'How would you test each category in isolation?']
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
    constraints: `Hours are whole numbers ≥ 0 (0 hours costs ₹0). Outputs must not change. Use Java 21.`,
    example: `<p><code>fee(1)</code> = ${H.c('g', '50')}, <code>fee(5)</code> = 50 + 3×30 = ${H.c('g', '140')}, <code>fee(20)</code> = min(50 + 18×30, 500) = ${H.c('g', '500')}. <code>estimateText(5)</code> = "About Rs 140 (first 2 h Rs 50)".</p>`,
    brute: {
      why: `<p>The same tariff facts appear in two methods (and in a text string), with nothing explaining what 30 or 500 mean. When the price of the first block changes, someone will update <code>fee</code> and forget the estimate text — customers see one price and pay another.</p>`,
      code: `class ParkingFees {
    int fee(int hours) {
        if (hours == 0) return 0;
        if (hours <= 2) return 50;
        return Math.min(50 + (hours - 2) * 30, 500);
    }
    String estimateText(int hours) {
        int f = hours == 0 ? 0 : (hours <= 2 ? 50 : Math.min(50 + (hours - 2) * 30, 500));
        return "About Rs " + f + " (first 2 h Rs 50)";
    }
}`
    },
    mcq: { q: 'Which change removes the duplication of knowledge best?', options: ['Add a comment explaining 50, 2, 30 and 500', 'Named constants in one tariff class, and estimateText() calls fee()', 'Move the numbers to a properties file read in both methods separately', 'Convert ints to doubles'], answer: 1, explain: 'Constants name the facts; making estimateText reuse fee() removes the duplicated formula too.' },
    hints: [
      `<p>Hint 1: There are two kinds of duplication here: repeated <b>numbers</b> and a repeated <b>formula</b>. Fix both.</p>`,
      `<p>Hint 2: Create constants <code>FIRST_BLOCK_HOURS</code>, <code>FIRST_BLOCK_PRICE</code>, <code>EXTRA_HOUR_PRICE</code>, <code>DAILY_CAP</code>.</p>`,
      `<p>Hint 3: <code>estimateText</code> should call <code>fee(hours)</code> and build the text from the constants. Test 0, 2, 3, 5, 20 hours before and after.</p>`
    ],
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
        for (int h : new int[]{0, 2, 3, 5, 20}) System.out.println(h + "h -> " + t.fee(h) + " | " + t.estimateText(h));
    }
}`,
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
      code: `class Inv {
    List<int[]> getThem(List<int[]> l) {
        List<int[]> r = new ArrayList<>();
        for (int[] x : l) {
            if (x[1] < x[2]) r.add(x);
        }
        return r;
    }
}`
    },
    mcq: { q: 'Which name best fits the method?', options: ['getThem', 'process', 'findProductsToReorder', 'filterList'], answer: 2, explain: 'It reveals intent (reorder), the domain object (products) and the kind of operation (find, a query).' },
    hints: [
      `<p>Hint 1: Name the concept hidden in <code>int[]</code>: it is a product with an id, stock and reorder level. A <code>record</code> gives each slot a name.</p>`,
      `<p>Hint 2: Put the question "does this product need reordering?" on the product itself: <code>needsReorder()</code>.</p>`,
      `<p>Hint 3: The method becomes <code>findProductsToReorder(List&lt;Product&gt; products)</code>; a stream filter or loop both read well now.</p>`
    ],
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
        List<Product> all = List.of(new Product(1, 5, 10), new Product(2, 50, 10), new Product(3, 9, 10));
        System.out.println(new Inventory().findProductsToReorder(all));
    }
}`,
      complexity: `<p>O(n) time, O(k) output. Reading time: from "decode the array slots" to "read one line".</p>`,
      followUps: ['Where would a per-warehouse stock count go?', 'Why is a record better than a class with public fields here?']
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
      code: `class Exporter {
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
}`
    },
    mcq: { q: 'What is the simplest fix that meets today\'s requirement?', options: ['Replace boolean with an int 0/1', 'Two intention-revealing methods: toCsv and toJson', 'A plug-in system of formatters loaded by reflection', 'Add a comment at each call site'], answer: 1, explain: 'Two methods remove the flag with the least machinery (KISS). If formats multiply, an interface can come later.' },
    hints: [
      `<p>Hint 1: Each branch of the <code>if (b)</code> is a separate job. Give each its own method with a name that says the format.</p>`,
      `<p>Hint 2: Keep the old method temporarily delegating to the new ones (so callers can migrate), then delete it — the Parallel Change technique.</p>`,
      `<p>Hint 3: If many formats appear later, introduce <code>interface RowFormat { String format(List&lt;String&gt; rows); }</code>. Not needed yet (YAGNI).</p>`
    ],
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
        System.out.println(e.toCsv(List.of("a", "b")) + "  " + e.toJson(List.of("a", "b")));
    }
}`,
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
      code: `abstract class AbstractTipCalculator {
    abstract int tip(int bill, int percent, String currency);
    int tipForGroups(int bill, int percent, int people) { return tip(bill, percent, "INR") / people; }
}
class StandardTipCalculator extends AbstractTipCalculator {
    int tip(int bill, int percent, String currency) { return bill * percent / 100; }
}
interface TipCalculatorFactory { AbstractTipCalculator create(); }
class DefaultTipCalculatorFactory implements TipCalculatorFactory {
    public AbstractTipCalculator create() { return new StandardTipCalculator(); }
}`
    },
    mcq: { q: 'Which refactorings apply here?', options: ['Collapse Hierarchy, Remove Parameter, Remove Dead Code, Inline Class', 'Extract Interface and Pull Up Method', 'Introduce Parameter Object', 'Replace Conditional with Polymorphism'], answer: 0, explain: 'These are the standard cures for speculative generality: fold the one-subclass hierarchy, drop unused parameters and methods, inline the pointless factory.' },
    hints: [
      `<p>Hint 1: For every type and member ask "who calls this today?" Use the IDE's Find Usages.</p>`,
      `<p>Hint 2: Abstract class with one subclass → Collapse Hierarchy. Factory with one product and no test need → Inline. Unused parameter → Remove Parameter.</p>`,
      `<p>Hint 3: Keep one class <code>TipCalculator</code> with <code>int tip(int bill, int percent)</code>. Guard against negative input if you like, and test the rounding-down case.</p>`
    ],
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
    }
}`,
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
      code: `class WalletService {
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
}`
    },
    mcq: { q: 'Where should phone-number normalisation live?', options: ['In every controller that accepts a phone', 'In a Phone value object\'s factory method, so an invalid Phone cannot exist', 'In a database trigger only', 'In a static StringUtils class'], answer: 1, explain: 'A value object validates once at construction; afterwards every Phone in the system is valid by definition ("parse, don\'t validate").' },
    hints: [
      `<p>Hint 1: Make each concept a type: <code>record Money(long minor, String currency)</code>, <code>record Phone(String e164)</code>.</p>`,
      `<p>Hint 2: Put rules in compact constructors / static factories: Phone strips non-digits, handles optional 91 prefix, checks 10 digits; Money rejects negative and mismatched currency in <code>plus</code>.</p>`,
      `<p>Hint 3: Change the service signature to <code>deposit(Phone, Money)</code>. Records give value-based <code>equals/hashCode</code>, so Phone works as a map key. Keep one currency per wallet and check it.</p>`
    ],
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
        System.out.println(w.balance(Phone.of("9876543210")));   // Money[minor=30, currency=INR]
        try {
            w.deposit(Phone.of("9876543210"), new Money(5, "USD"));
        } catch (IllegalArgumentException e) {
            System.out.println("rejected: " + e.getMessage());
        }
    }
}`,
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
      code: `class Delivery {
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
}`
    },
    mcq: { q: 'What signals a data clump?', options: ['Any method with two parameters', 'The same group of values appearing together in many signatures and fields', 'A class with many methods', 'Use of String'], answer: 1, explain: 'Fowler\'s test: delete one of the values — if the others no longer make sense alone, they form a concept that wants its own type.' },
    hints: [
      `<p>Hint 1: Create <code>record Address(String line1, String city, String state, String pin)</code> and validate the PIN in its compact constructor.</p>`,
      `<p>Hint 2: Move <code>zone()</code> and <code>label()</code> into Address — they use only address data (Feature Envy).</p>`,
      `<p>Hint 3: <code>Delivery.quote(Address a)</code> asks <code>a.zone()</code>. Build addresses with named accessor calls so swapping is visible in review.</p>`
    ],
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
        Address a = new Address("12 MG Road", "Pune", "MH", "411001");
        System.out.println(a.zone() + " " + new Delivery().quote(a) + " " + a.label());
    }
}`,
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
      code: `class LineItem {
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
}`
    },
    mcq: { q: 'How do you recognise feature envy?', options: ['A method is longer than 20 lines', 'A method uses another object\'s data more than its own class\'s data', 'A class has no interface', 'A method is static'], answer: 1, explain: 'Feature envy: the method "wants to be" in the class whose data it uses. Move Method fixes it.' },
    hints: [
      `<p>Hint 1: Count which fields <code>lineTotal</code> touches: all belong to <code>LineItem</code>. That is where it should live.</p>`,
      `<p>Hint 2: Move Method → <code>LineItem.total()</code>. Make both printers call it; delete their copies.</p>`,
      `<p>Hint 3: Consider whether the getters are still needed. Often a "tell" method like <code>printLine()</code> or a record with accessors is enough. Test the negative-discount case.</p>`
    ],
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
    }
}`,
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
      why: `<p>Inheriting from <code>ArrayList</code> exposes ~40 list operations that break the stack's promise. The class only wants a <i>storage</i> part, not to <i>be</i> a list — a refused bequest. It also couples us to ArrayList internals (e.g. overriding <code>add</code> would interact with <code>addAll</code>, the fragile base class problem), and the max-size rule can be bypassed with <code>addAll</code>.</p>`,
      code: `class UndoStack<T> extends ArrayList<T> {
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
}`
    },
    mcq: { q: 'Why is composition the right fix here?', options: ['Composition is always faster', 'An undo stack is not a list; it should HAVE storage and expose only stack operations', 'Java forbids extending ArrayList', 'To use less memory'], answer: 1, explain: 'The is-a test fails. Holding an ArrayDeque privately lets the class expose exactly the operations that keep its invariants.' },
    hints: [
      `<p>Hint 1: Say it aloud: "an UndoStack is an ArrayList" — false. "An UndoStack has a storage" — true.</p>`,
      `<p>Hint 2: Hold a private <code>Deque&lt;T&gt;</code> (<code>ArrayDeque</code>) and delegate. Use <code>addFirst/removeFirst</code> for the top and <code>removeLast</code> to drop the oldest.</p>`,
      `<p>Hint 3: Expose only push/pop/peek/size/isEmpty. Throw <code>NoSuchElementException</code> on empty pop/peek (ArrayDeque's <code>removeFirst</code>/<code>getFirst</code> already do).</p>`
    ],
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
        // s.add(0, "z");  -- does not compile any more
    }
}`,
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
      why: `<p>The dashboard knows the whole object graph: car → engine → fuel tank → litres. Each <code>get</code> is a dependency on another class's structure (Law of Demeter violation). Adding an electric car means <code>getEngine()</code> or <code>getFuelTank()</code> returns null and the dashboard must grow <code>instanceof</code> checks — every client of Car pays for every internal change.</p>`,
      code: `class FuelTank { private final int litres; FuelTank(int l) { litres = l; } int getLitres() { return litres; } }
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
}`
    },
    mcq: { q: 'After refactoring, what should Dashboard call?', options: ['car.getEngine().needsService()', 'car.needsService()', 'car instanceof ElectricCar ? ... : ...', 'Engine.check(car)'], answer: 1, explain: 'The dashboard tells/asks its direct friend a domain question. How each car decides is the car\'s business.' },
    hints: [
      `<p>Hint 1: What question does the dashboard really ask? "Does this car need service?" Put that method on Car.</p>`,
      `<p>Hint 2: Make <code>Car</code> an interface (or sealed) with <code>plate()</code> and <code>needsService()</code>; <code>PetrolCar</code> and <code>ElectricCar</code> implement it using their own parts.</p>`,
      `<p>Hint 3: Remove the getters that leaked internals (<code>getEngine</code>, <code>getFuelTank</code>). Dashboard becomes a one-line filter over cars.</p>`
    ],
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
        List<Car> fleet = List.of(new PetrolCar("KA01", 3, 80), new PetrolCar("KA02", 40, 90), new ElectricCar("KA03", 10));
        System.out.println(new Dashboard().needingService(fleet));   // [KA01, KA03]
    }
}`,
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
      code: `class AppConfig { static int weekendPercent = 10; }
class PriceService {
    int finalPrice(int base) {
        DayOfWeek d = LocalDate.now().getDayOfWeek();
        boolean weekend = d == DayOfWeek.SATURDAY || d == DayOfWeek.SUNDAY;
        return weekend ? base + base * AppConfig.weekendPercent / 100 : base;
    }
}`
    },
    mcq: { q: 'What is the standard Java way to make "now" testable?', options: ['Call System.currentTimeMillis() instead', 'Inject a java.time.Clock and use LocalDate.now(clock)', 'Use Thread.sleep in tests until Saturday', 'Mock LocalDate with reflection'], answer: 1, explain: 'java.time.Clock exists for this. Production passes Clock.systemDefaultZone(); tests pass Clock.fixed(...).' },
    hints: [
      `<p>Hint 1: List the hidden inputs of <code>finalPrice</code>: today's date and the surcharge percent. Make them explicit dependencies.</p>`,
      `<p>Hint 2: Constructor-inject a <code>Clock</code> and the <code>weekendPercent</code> (an immutable value). Use <code>LocalDate.now(clock)</code>.</p>`,
      `<p>Hint 3: In the demo build two services with <code>Clock.fixed(Instant.parse("2026-10-17T10:00:00Z"), ZoneOffset.UTC)</code> (Saturday) and a Wednesday clock, and check 1100 and 1000.</p>`
    ],
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
        System.out.println(new PriceService(saturday, 10).finalPrice(1000));   // 1100
        System.out.println(new PriceService(wednesday, 10).finalPrice(1000));  // 1000
        // production: new PriceService(Clock.systemDefaultZone(), configuredPercent)
    }
}`,
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
      code: `class Notifier {
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
}`
    },
    mcq: { q: 'Which design turns "add a channel" into a single new class?', options: ['A bigger switch with comments', 'A Channel interface (id, accepts, cost, deliver) plus a registry the service looks up', 'Inheritance: WhatsAppNotifier extends Notifier overriding each method', 'A global static map of lambdas edited in many files'], answer: 1, explain: 'Gather all knowledge about one channel into one class (cures shotgun surgery); the service depends only on the interface and a registry (open for extension, closed for modification).' },
    hints: [
      `<p>Hint 1: Group the scattered facts by channel, not by operation. Everything about SMS (validation, cost, formatting) belongs in one class.</p>`,
      `<p>Hint 2: <code>interface Channel { String id(); boolean accepts(String to); int costPaise(); String deliver(String to, String msg); }</code>. The service holds a <code>LinkedHashMap&lt;String, Channel&gt;</code> built from a list passed to its constructor.</p>`,
      `<p>Hint 3: <code>send</code> = look up (unknown → exception) → check <code>accepts</code> → <code>deliver</code>. <code>availableChannels</code> = the map's keys (registration order). Adding WhatsApp = new class + add it to the list in the wiring code. Reject duplicate ids at registration.</p>`
    ],
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
        System.out.println(svc.availableChannels());
        try { svc.send("SMS", "asha@x.com", "Hi"); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }
    }
}`,
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
      code: `class LibraryManager {
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
}`
    },
    mcq: { q: 'In the cohesion table, which methods share the loan fields (loanMember, loanDate)?', options: ['addBook and registerMember', 'borrow, returnBook and overdueReminders', 'Only addBook', 'All methods equally'], answer: 1, explain: 'Those three form the "loans" group. Catalogue (books) and members are separate groups that loans merely look up — so they become separate classes that LoanService depends on.' },
    hints: [
      `<p>Hint 1: Build the table: addBook→books; registerMember→members; borrow/return/overdue→loanMember, loanDate (+ lookups); fine math→finePerDay, loanDays. Groups: Catalog, Members, Loans, FinePolicy.</p>`,
      `<p>Hint 2: <code>Catalog</code> and <code>MemberDirectory</code> own their maps and expose <code>titleOf(isbn)</code>/<code>nameOf(id)</code> that throw on unknown. A <code>record Loan(memberId, isbn, borrowedOn)</code> replaces the two parallel maps (a data clump!).</p>`,
      `<p>Hint 3: <code>FinePolicy</code> knows loan days and rate (<code>fineFor(loan, returnDate)</code>, <code>isOverdue</code>). <code>LoanService</code> depends on Catalog, MemberDirectory and FinePolicy via constructor. A thin <code>Library</code> facade can keep the old API if callers need it.</p>`
    ],
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
    }
}`,
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
      code: `class LegacyPricing {
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
}`
    },
    mcq: { q: 'You notice the bulk discount after the coupon "looks wrong". What do you do during the refactor?', options: ['Fix it quietly while refactoring', 'Keep it exactly, pin it with a test, and raise it with the business as a separate change', 'Delete the bulk discount', 'Make it configurable'], answer: 1, explain: 'Refactoring never changes behaviour. A suspected bug is a separate, explicit change with its own approval and test update ("two hats").' },
    hints: [
      `<p>Hint 1: Characterization first: pick inputs that cover each branch and boundary (GOLD/SILVER/null/unknown tier, FLAT100 at 500 and 501, PCT10, unknown coupon, qty 9/10, a case that clamps to 0) and record the current outputs.</p>`,
      `<p>Hint 2: Flatten with Extract Method: <code>applyTier</code>, <code>applyCoupon</code>, <code>applyBulk</code>, <code>clampAtZero</code>, called in the same order. Replace magic numbers with constants.</p>`,
      `<p>Hint 3: Use <code>"GOLD".equals(tier)</code> style to keep null-safety identical. Run the pinned table after each step; finish with a loop that compares old vs new for every case.</p>`
    ],
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
    }
}`,
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
      code: `class GameCharacter {
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
class FlyingFireWarrior extends FireWarrior {}    // one class per combination...`
    },
    mcq: { q: 'Buffs can be added and removed during a fight and must stack. Which structure fits?', options: ['A subclass per buff combination', 'A list of Buff objects the character holds; damage sums them', 'A boolean field per buff on the base class', 'Overriding attack() in each subclass'], answer: 1, explain: 'Runtime add/remove + stacking = a collection of parts (composition). Each buff is a small object with its own rule.' },
    hints: [
      `<p>Hint 1: Identify independent axes of change: weapon (swappable), buffs (stack, temporary), abilities (set). Each becomes a part the character holds.</p>`,
      `<p>Hint 2: <code>interface Weapon { int baseDamage(); }</code>, <code>interface Buff { int bonus(); }</code>, <code>enum Ability { FLY, HEAL, ... }</code>. <code>Character</code> is <code>final</code> — nobody can override its internals.</p>`,
      `<p>Hint 3: <code>attack()</code> = weapon.baseDamage() + sum of buff bonuses. Provide <code>equip</code>, <code>addBuff</code>, <code>removeBuff</code>, <code>can(Ability)</code>. No method calls an overridable method of the same object, so the recursion bug is impossible.</p>`
    ],
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
        System.out.println(asha.describe() + " canFly=" + asha.can(Ability.FLY));   // 12 canFly=true
    }
}`,
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
  interview.push({ level: 'I', q: 'What is primitive obsession, and how do value objects fix it?', a: `<p>Primitive obsession is using basic types (<code>String</code>, <code>int</code>, <code>double</code>) for domain concepts: money as <code>double</code>, email/phone as <code>String</code>, status as <code>int</code>. Consequences: validation and formatting are duplicated everywhere, the compiler cannot stop you passing a phone where a name is expected, and floating-point money has rounding errors.</p><p>A <b>value object</b> — in Java usually an immutable <code>record</code> — wraps the value, validates it once in the constructor ("parse, don't validate"), compares by value, and becomes the home for related behaviour: <code>Money.plus</code> refuses mixed currencies, <code>Phone.of</code> normalises formats, <code>Email.domain()</code>. After that, every instance in the system is valid by construction and method signatures document themselves: <code>transfer(Phone from, Phone to, Money amount)</code>.</p>`, followUps: ['long minor units or BigDecimal for money?', 'What about performance/allocations of many small objects? (usually negligible; Valhalla value classes in future)'] });
  interview.push({ level: 'A', q: 'How would you make a class with <code>new StripeClient()</code>, <code>LocalDate.now()</code> and a static config unit-testable?', a: `<p>All three are hidden dependencies (external, temporal and common/global coupling). I make them explicit: define an interface the domain owns (<code>PaymentGateway</code>), move Stripe code into an adapter implementing it, and pass the gateway, a <code>java.time.Clock</code> and the config values through the constructor. The class then uses <code>LocalDate.now(clock)</code>.</p><p>Production wiring (a <code>main</code>, a factory or a DI container like Spring) passes the real adapter and <code>Clock.systemDefaultZone()</code>; tests pass a recording fake or a lambda and <code>Clock.fixed(...)</code>. Benefits beyond testing: vendor changes stop at the adapter, dependencies are visible in the constructor (a long constructor is itself a useful smell signalling too many responsibilities), and there is no shared mutable state between tests.</p>`, followUps: ['Constructor vs setter vs field injection — which and why?', 'When is a static method fine? (pure functions with no hidden state, e.g. Math.max)'] });
  interview.push({ level: 'A', q: 'What is connascence and how does it refine "coupling"?', a: `<p>Connascence (Meilir Page-Jones) says two parts are connascent if changing one requires changing the other. It gives coupling a vocabulary with <b>strength</b>. Static forms, weakest to strongest: name, type, meaning (both sides know "2 means admin"), position (argument order), algorithm (both sides must hash identically). Dynamic forms: execution order, timing, value (values must stay in sync), identity (must be the same object).</p><p>Practical rules: convert strong forms to weaker ones — position → name with a parameter object, meaning → an enum, algorithm → a shared single implementation; keep strong connascence <b>local</b> (inside one class or module) and only weak connascence across boundaries such as services; and reduce the <b>degree</b> (how many parts are involved). It turns vague "this is too coupled" into a specific, fixable statement.</p>`, followUps: ['Give an example of connascence of position in Java and how to fix it.', 'Which connascence types appear between microservices?'] });
  interview.push({ level: 'A', q: 'When is a switch on a type code acceptable, and when should it become polymorphism?', a: `<p>Replace it with polymorphism when the <b>same</b> switch over the same type set appears in several places, and new <b>types</b> are added more often than new operations — each new type would otherwise require shotgun surgery. One class per type gathers all its behaviour, and the compiler (abstract methods or a sealed interface) forces you to implement every operation.</p><p>A switch is fine when it appears in <b>one</b> place — typically a factory converting external data (a DB code, a JSON field) into the right object — or when the set of types is closed and stable but <b>operations</b> are added often. Then Java 21 pattern-matching <code>switch</code> over a <code>sealed</code> hierarchy is excellent: exhaustive, compiler-checked, and keeps each operation in one place (the "expression problem" trade-off; Visitor is the classic OO version).</p>`, followUps: ['What is the expression problem?', 'How does a sealed interface make switch safer than an enum with default?'] });
  interview.push({ level: 'E', q: 'Your team\'s core service is a 15k-line "God" module. How do you improve it without a rewrite?', a: `<p>1) <b>Find hotspots</b>: combine git change frequency with complexity to find the 5% of code that causes most pain; ignore stable ugly code. 2) <b>Safety nets</b>: characterization/approval tests around the hotspot's public behaviour, plus ArchUnit rules to stop new violations. 3) <b>Seams</b>: introduce interfaces at vendor and I/O boundaries (Branch by Abstraction) so pieces can move independently. 4) <b>Extract by cohesion</b>: use method × field and change-coupling analysis to find natural sub-domains (billing, notifications), extract them into modules with explicit APIs — still in the same deployable at first. 5) <b>Strangler fig / expand–contract</b> for anything that crosses process boundaries. 6) <b>Make it a habit</b>: Boy Scout rule in every feature PR, small reviewable steps, measurable goals (hotspot complexity, build times, defect rate).</p><p>Throughout, refactoring PRs are separate from behaviour changes, and the business sees value continuously instead of waiting months for a risky rewrite.</p>`, followUps: ['How do you prioritise refactoring against feature work with a product manager?', 'What metrics show the effort is working?', 'When IS a rewrite justified?'] });
  interview.push({ level: 'E', q: 'How do AI coding assistants change the importance of clean-code principles?', a: `<p>They make principles <b>more</b> important. Generation is cheap, so duplication and speculative abstractions arrive faster (several industry analyses have reported more copy-pasted code in AI-assisted repositories). Agents also work best on cohesive, loosely coupled code: a focused class with clear names fits in the context window and gets correct edits; a tangled module causes missed ripples.</p><p>How I work with them: I give explicit constraints ("only the stated requirements, no single-implementation interfaces, follow existing names"), ask AI for analysis before edits (list smells, dependency edges, duplicated rules), prefer IDE automated refactorings for guaranteed behaviour preservation, require characterization tests before AI refactors, and review diffs for hidden behaviour changes mixed into "cleanups". Names and a repo glossary act as prompts for both humans and agents. What I still own: choosing seams, domain vocabulary, and saying no to complexity.</p>`, followUps: ['How would you write team guidelines for AI-generated code review?', 'Which refactorings would you trust an agent to do unattended?'] });

  registerModule({
    id: 'lld03',
    title: 'Clean Code & Design Principles',
    intro: `<p>SOLID tells you how to shape classes; this module gives you the <b>everyday habits</b> that keep a codebase pleasant to change: <b>DRY</b>, <b>KISS</b>, <b>YAGNI</b>, <b>composition over inheritance</b>, <b>low coupling / high cohesion</b>, the <b>Law of Demeter</b>, good <b>names</b>, <b>small functions</b>, and the catalogue of <b>code smells</b> with the <b>refactorings</b> that cure them.</p>
<p>Every topic starts with a real-life analogy, then shows a smelly Java design next to a refactored one. Visualizers draw <b>dependency graphs before and after</b> (red = tight coupling), build <b>cohesion tables</b> that reveal hidden classes, and <b>step through refactors</b> line by line. Practice problems are code-review exercises: the "brute force" is the smelly design and why it hurts; the solution is compilable Java plus the reasoning an interviewer wants to hear.</p>
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
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
