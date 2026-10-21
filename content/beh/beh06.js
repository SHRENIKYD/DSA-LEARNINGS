(function () {
var topics = [], practice = [], quiz = [], interview = [];

// ---- shared helpers (fictional companies, illustrative numbers only) ----
function fmt(n) { return Math.round(n) + 'k'; }
function offerYears(o, g) {
  var rows = [];
  for (var y = 0; y < 4; y++) {
    var eq = o.equity * o.vest[y] / 100 * Math.pow(1 + g, y + 1);
    rows.push({ base: o.base, bonus: o.base * o.bonus / 100, sign: y === 0 ? o.sign : 0, eq: eq });
  }
  return rows;
}
function yTotal(r) { return r.base + r.bonus + r.sign + r.eq; }
var OA = { name: 'Nimbus Labs', base: 160, bonus: 10, sign: 20, equity: 200, vest: [25, 25, 25, 25] };
var OB = { name: 'Orbit Systems', base: 150, bonus: 10, sign: 40, equity: 320, vest: [5, 15, 40, 40] };
function P(o) {
  return {
    title: o.title, level: o.level, tags: o.tags, lang: 'text',
    statement: '<p>' + o.s + '</p>',
    constraints: o.c || 'Be honest, polite, specific. Numbers are fictional examples; norms vary by country and company.',
    example: '<p><b>Situation:</b> ' + o.s + '</p><p><span class="c-g">Good answer shape:</span> ' + o.shape + '</p>',
    brute: { why: '<p><b>Weak answer:</b> &ldquo;' + o.weak + '&rdquo;</p><p>' + o.why + '</p>', code: { lang: 'text', code: o.weak, check: false } },
    mcq: o.mcq,
    hints: ['<p>Hint 1: ' + o.h1 + ' Think about what the other person needs to hear to say yes.</p>', '<p>Hint 2: ' + o.h2 + ' Keep it specific, warm and honest.</p>', '<p>Hint 3: ' + o.h3 + ' Then pause and let them reply.</p>'],
    solution: { approach: o.a, complexity: '<p>Not a code problem. Effort: 10 minutes of prep, one calm conversation.</p>', followUps: o.f }
  };
}
topics.push({
  title: 'Anatomy of an Offer: Base, Bonus, Sign-On & Benefits',
  analogy: `<p>An offer is like a <b>restaurant bill read backwards</b>: it lists dishes (base, bonus, equity, sign-on, perks), but you must add them up and ask &ldquo;what will I really pay or earn per year?&rdquo; A big number on one line (a huge sign-on) can hide a small number on another line (a low base that you live on for years).</p>`,
  explain: `<p>An offer has <b>five parts</b>. Learn each one in plain words:</p>
<ul><li><b>Base salary</b> &mdash; fixed pay per year. Safe, predictable, and the number that raises, bonuses and often loans are based on.</li>
<li><b>Bonus</b> &mdash; a target percent of base (for example 10%). It can pay less or more depending on company and personal results. Ask: &ldquo;What did the bonus pay out in the last two years?&rdquo;</li>
<li><b>Equity</b> &mdash; shares of the company that you earn slowly (vesting). Covered in the next topic.</li>
<li><b>Sign-on bonus</b> &mdash; one-time cash to join. Often paid back if you leave in the first year (a <i>clawback</i>). It helps year 1 only.</li>
<li><b>Benefits</b> &mdash; health insurance, retirement match, paid leave, learning budget, remote or hybrid rules, relocation. Worth real money.</li></ul>
${H.table(['Part', 'Repeats every year?', 'Risk', 'Question to ask'], [['Base', 'Yes', 'Low', 'Is there a yearly raise band?'], ['Bonus', 'Usually', 'Medium', 'What was the payout last 2 years?'], ['Equity', 'Over 4 years', 'High', 'RSU or options? vesting shape?'], ['Sign-on', H.c('r', 'No, once'), 'Low', 'Is there a clawback?'], ['Benefits', 'Yes', 'Low', 'What is the 401k/pension match?']])}
<p>Rule of thumb: <b>compare offers by what you receive each year for four years</b>, not by the biggest headline number. Numbers here are illustrative examples with fictional companies; norms vary a lot by country and company.</p>`,
  clues: ['&ldquo;We are pleased to extend an offer&rdquo; &rarr; read every line before you reply', 'Recruiter quotes only &ldquo;total compensation&rdquo; with no split &rarr; ask for base, bonus, equity, sign-on separately', 'Huge sign-on + low base &rarr; year 1 looks great, year 2 drops', '&ldquo;Target bonus&rdquo; &rarr; a target is not a promise', 'Equity quoted as one big number &rarr; ask over how many years and what shape', 'Offer arrives by phone &rarr; ask for the written details before deciding'],
  viz: {
    title: 'Building year-1 pay, one piece at a time',
    input: '160 10 20 50 12',
    inputLabel: 'base(k) bonus% sign-on(k) equity per year(k) benefits value(k)',
    gen: function (input) {
      var a = String(input).trim().split(/[\s,]+/).map(Number);
      if (a.length !== 5 || a.some(function (x) { return isNaN(x) || x < 0; })) throw new Error('Enter 5 numbers: base bonus% sign-on equity benefits');
      var base = a[0], bon = base * a[1] / 100, sg = a[2], eq = a[3], ben = a[4];
      var names = ['Base', 'Bonus', 'Sign-on', 'Equity', 'Benefits'];
      var vals = [base, bon, sg, eq, ben], frames = [], shown = [], run = 0, why = [
        'The <b>base</b> is the foundation. It repeats every year.',
        'Add the <b>target bonus</b> (' + a[1] + '% of base). Not guaranteed.',
        'Add the <b>sign-on</b>. It is paid <span class="c-r">once</span>, so year 2 will not have it.',
        'Add one year of <b>equity vesting</b>. Its real value depends on the stock price.',
        'Add the <b>value of benefits</b> (match, insurance). Real money even if not on the paycheck.'];
      frames.push({ narr: 'We will build <b>year-1 total compensation</b> piece by piece.', parts: [{ type: 'bars', label: 'pieces so far (k)', values: [0], idxLabels: ['start'] }] });
      for (var i = 0; i < 5; i++) {
        shown.push(Math.round(vals[i] * 10) / 10); run += vals[i];
        var hl = {}; hl[i] = i === 2 ? 'bad' : 'cur';
        frames.push({ narr: why[i] + ' Running total: <b>' + Math.round(run) + 'k</b>.', parts: [{ type: 'bars', label: 'pieces (k)', values: shown.slice(), idxLabels: names.slice(0, i + 1), hl: hl, texts: shown.map(function (v) { return v + 'k'; }) }, { type: 'vars', vals: { yearOneTotal: Math.round(run) + 'k' }, hl: { yearOneTotal: 'ok' } }] });
      }
      var y2 = run - sg;
      frames.push({ narr: 'Year 2 without sign-on is <b>' + Math.round(y2) + 'k</b>. Always check the drop.', parts: [{ type: 'table', label: 'Year 1 vs year 2', columns: ['year', 'total (k)'], rows: [['1', Math.round(run)], ['2', Math.round(y2)]], hl: { 1: 'sel' } }] });
      return frames;
    }
  },
  examples: [
    { title: 'Two offers, same headline', html: `<p>Nimbus Labs says &ldquo;about 250k&rdquo;. Orbit Systems also says &ldquo;about 250k&rdquo;. Nimbus: base 160k, bonus 16k, equity 50k/yr, sign-on 20k. Orbit: base 150k, bonus 15k, equity spread unevenly, sign-on 40k. Same headline, very different years.</p>` },
    { title: 'Sign-on clawback', html: `<p>A 30k sign-on with a 12-month clawback means if you leave at month 9 you may repay it. Treat it as <i>conditional</i> money. Ask: &ldquo;Is the clawback pro-rated?&rdquo;</p>` },
    { title: 'Benefits in money', html: `<p>A 5% retirement match on 160k base is worth 8k a year. Extra paid leave, a learning budget of 2k and good health cover may add another 5-10k. A role with fewer perks but 6k more base can still lose.</p>` }
  ],
  deepDive: `<p><b>Expert layer.</b> Components differ in <i>liquidity</i> and <i>certainty</i>. Base is certain; bonus is a probability-weighted estimate (many firms pay 80&ndash;120% of target, some pay zero in bad years); equity is a risky asset that you cannot sell until it vests (and for private companies, until a liquidity event). A good habit is to discount: count base at 100%, bonus at about 80&ndash;90%, public RSUs at 100% of expected value but flag the risk, and private options at a heavy discount.</p>
<p><b>Taxes and geography.</b> Sign-on bonuses and RSUs are often taxed as ordinary income when received; options have special rules that differ by country. Cost of living, health cover and statutory leave change what a salary means. Compare <i>after-tax, after-cost</i> only when you can; otherwise compare within the same country and say so. Never rely on a single recruiter email: ask for the written offer letter and the equity plan document.</p>
<p><b>Hidden terms to check:</b> bonus eligibility during notice periods, repayment clauses on relocation and training, non-compete or garden-leave rules, level (title) in writing because it controls future raises, and the start date, because equity usually vests from the start date.</p>`,
  aiEra: `<p><b>What AI changes:</b> offer comparison is now a five-minute job. You can paste the numbers (remove names if you wish) into an AI assistant and ask for a year-by-year table, a list of missing questions, and a plain-English summary of the clauses.</p>
<p><b>Use AI as a partner:</b> <code>Here are two offers. Build a 4-year table. List 10 questions I forgot to ask each recruiter.</code> Then verify every number yourself.</p>
<p><b>Where AI goes wrong:</b> it may invent market salaries, assume wrong tax rules, or misread vesting clauses. It cannot know the real payout history of a bonus plan.</p>
<p><b>What you must still own:</b> deciding what matters to your life (learning, team, stability, flexibility), asking the questions in the right tone, and getting terms in writing. In an AI-era job market, role scope (does the team build with AI or get replaced by it?) is as important as the pay line.</p>`,
  problems: [P({
    title: 'Read the offer line by line', level: 'Easy', tags: ['offer', 'total comp'],
    s: 'You get a verbal offer: &ldquo;250k total, you will love it.&rdquo; You need to respond today.',
    shape: 'thank them, ask for the written breakdown (base, bonus, equity, sign-on, benefits, level), and promise a reply by a clear date.',
    weak: 'Wow, 250k, I accept!', why: 'You accepted a number you cannot define. Total hides base, vesting and clawbacks, and you gave away all your leverage in one sentence.',
    mcq: { q: 'Best first reply to a verbal offer?', options: ['Accept right away', 'Thank them and ask for the full written breakdown', 'Say the number is too low'], answer: 1, explain: 'You cannot judge what you cannot see. Be warm, ask for details in writing, and give a reply date.' },
    h1: 'You do not yet know what &ldquo;total&rdquo; contains.', h2: 'Ask for the written offer and the equity plan.', h3: 'Say thanks, show enthusiasm, ask for the breakdown, and name a day you will reply.',
    a: '<p>&ldquo;Thank you so much, I am genuinely excited about the team and the work. To compare this properly, could you send the written breakdown: base, target bonus, equity amount and vesting schedule, sign-on and any clawback, level, and benefits? I will come back to you by Thursday.&rdquo; This keeps the tone warm, asks for facts, and sets a calm timeline without committing to anything.</p>',
    f: ['What if the recruiter will not send details until you accept?']
  })]
});
topics.push({
  title: 'Equity Deep Dive: RSUs vs Options, Vesting, Cliffs & Refreshers',
  analogy: `<p>Equity is like a <b>loyalty card at a coffee shop</b>: you do not get the free coffees today, you earn them stamp by stamp. A <b>cliff</b> is the rule &ldquo;no free coffee at all until you have collected the first 12 stamps.&rdquo; <b>Back-loaded vesting</b> means most stamps are given in the last two years, so quitting early wastes your effort.</p>`,
  explain: `<p><b>RSU</b> (restricted stock unit) = a promise of free shares that arrive as they vest. You pay nothing; when shares arrive they count as income. <b>Stock option</b> = the right to <i>buy</i> shares at a fixed price (the strike). If the stock is worth more than the strike, you profit by the difference; if not, the option is worth nothing. Options are common at startups; RSUs are common at large public companies.</p>
${H.table(['', 'RSU', 'Option'], [['What you get', 'Shares for free', 'Right to buy at strike'], ['Worth if stock falls', 'Still something', 'Can be zero'], ['Cash needed', 'No (tax usually withheld)', 'Yes, to exercise'], ['Typical home', 'Public / late-stage', 'Early startup']])}
<p><b>Vesting</b> is how long you must stay to earn the grant. Common shape: 4 years with a <b>1-year cliff</b> (nothing in the first 12 months, then 25% at month 12, then monthly). Some companies use even 25/25/25/25 each year; others use <b>back-loaded</b> schedules such as 5/15/40/40. A <b>refresher</b> is a new grant later (often yearly) to keep the equity flowing after the first grant runs out.</p>
${H.arr([25, 25, 25, 25], { label: 'Even vesting % by year', hl: { 0: 'b', 1: 'b', 2: 'b', 3: 'b' } })}
${H.arr([5, 15, 40, 40], { label: 'Back-loaded vesting % by year', hl: { 0: 'r', 1: 'y', 2: 'g', 3: 'g' } })}
<p>Same 4-year total, but the second shape pays you late. If you leave after year 2, even vesting gives you 50%, back-loaded gives only 20%. All figures are illustrative; schedules vary by company and country.</p>`,
  clues: ['&ldquo;Four-year grant with a one-year cliff&rdquo; &rarr; leave before month 12 and you keep nothing', '&ldquo;Front-loaded / back-loaded vesting&rdquo; &rarr; the yearly percentages are not equal; ask for them', '&ldquo;Strike price&rdquo; / &ldquo;409A&rdquo; &rarr; options, so the grant value is not the number shown', '&ldquo;Refreshers are discretionary&rdquo; &rarr; do not count them as promised', '&ldquo;Equity valued at last funding round&rdquo; &rarr; private shares, hard to sell', '&ldquo;Post-termination exercise window of 90 days&rdquo; &rarr; leaving may force a big cash decision'],
  viz: {
    title: 'Vesting schedule and the cliff',
    input: '25 25 25 25',
    inputLabel: 'Yearly vesting % (4 numbers adding to 100)',
    gen: function (input) {
      var v = String(input).trim().split(/[\s,\/]+/).map(Number);
      if (v.length !== 4 || v.some(function (x) { return isNaN(x) || x < 0; })) throw new Error('Enter 4 numbers like: 5 15 40 40');
      var sum = v[0] + v[1] + v[2] + v[3];
      if (sum !== 100) throw new Error('The four numbers must add to 100 (now ' + sum + ')');
      var frames = [], cum = [], c = 0, months = [];
      for (var m = 1; m <= 12; m++) months.push(0);
      frames.push({ narr: 'Month by month in <b>year 1</b>: with a 1-year <b>cliff</b>, you own <span class="c-r">0%</span> of the grant until month 12.', parts: [{ type: 'array', label: 'vested % at end of month 1..12', values: months, hl: { 0: 'bad', 1: 'bad', 2: 'bad', 3: 'bad', 4: 'bad', 5: 'bad', 6: 'bad', 7: 'bad', 8: 'bad', 9: 'bad', 10: 'bad' }, showIdx: true, start: 1 }] });
      var m2 = months.slice(); m2[11] = v[0];
      frames.push({ narr: 'At month 12 the cliff is passed: year-1 share <b>' + v[0] + '%</b> vests at once. Leave a day before and you lose it.', parts: [{ type: 'array', label: 'vested % at end of month 1..12', values: m2, hl: { 11: 'ok', 0: 'bad', 5: 'bad' }, showIdx: true, start: 1 }] });
      for (var y = 0; y < 4; y++) {
        c += v[y]; cum.push(c);
        var hl = {}; hl[y] = 'cur';
        frames.push({ narr: 'End of year ' + (y + 1) + ': <b>' + v[y] + '%</b> vests. You now own <b>' + c + '%</b> in total.', parts: [{ type: 'array', label: 'vest % per year', values: v.slice(), hl: hl, showIdx: true, start: 1 }, { type: 'bars', label: 'cumulative owned %', values: cum.slice(), hl: hl, texts: cum.map(function (x) { return x + '%'; }) }] });
      }
      frames.push({ narr: 'If you leave after year 2 you keep <b>' + (v[0] + v[1]) + '%</b>. Compare with even vesting: 50%.', parts: [{ type: 'bars', label: 'cumulative owned %', values: cum.slice(), hl: { 1: 'sel' } }] });
      return frames;
    }
  },
  examples: [
    { title: 'Worked: 5/15/40/40 on a 320k grant', html: `<p>Year 1: 16k, year 2: 48k, year 3: 128k, year 4: 128k. If the stock stays flat and you leave after year 2, you collected only 64k of 320k. Staying to year 3 more than doubles your total.</p>` },
    { title: 'Cliff risk', html: `<p>Grant 200k over 4 years, 1-year cliff. You are laid off in month 11. You receive <b>0</b> of the equity. At month 12 you receive 50k at once. Ask whether the company accelerates vesting on layoff.</p>` },
    { title: 'Option math', html: `<p>200,000 options, strike 1.00, stock now 3.00. Paper gain: 400,000. But you must pay 200,000 to exercise (plus tax in some countries) and the shares may be illiquid. Ask what percent of the company the options represent, and the latest valuation.</p>` }
  ],
  deepDive: `<p><b>Expert layer.</b> Key technical points: (1) RSUs usually trigger tax at vest on the full market value, so companies often sell part of the shares to cover it (<i>sell-to-cover</i>). (2) Options come in different tax types depending on country; early exercise, 83(b)-type elections, and post-termination exercise windows can change thousands in tax. Read a tax professional&rsquo;s advice for your country; do not guess. (3) Private-company equity depends on dilution, preference stacks and exit events; the headline number can be worth much less.</p>
<p><b>Shape matters.</b> A <i>back-loaded</i> schedule is a retention tool: most value arrives when you are most useful. It also reduces your negotiating freedom after year 2. A <i>front-loaded</i> or even schedule is friendlier to someone who may move. When comparing offers, compute the value if you leave at year 2 and at year 4, not only the full-term figure.</p>
<p><b>Refreshers</b> change the long-run picture: some firms give yearly refreshers sized to keep your pay near the original level; others give little. Ask how refreshers are decided and what typical engineers at your level received (recruiters will often say a range). Treat refreshers as a possibility, never a promise, unless in writing.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI-focused companies often pay heavily in equity, which makes vesting terms and valuation risk much more important. Fast-moving hiring means offers can include unusual terms (large grants with long vests, tender-offer rules).</p>
<p><b>Use AI as a partner:</b> paste the equity clause and ask <code>Explain this vesting and acceleration language in simple words, and list what is unclear.</code> Ask it to build a leave-at-year-N table.</p>
<p><b>Where AI goes wrong:</b> it may confuse RSUs with options, assume public liquidity for private shares, or give confident tax claims for the wrong country. It cannot read the full equity plan document unless you provide it.</p>
<p><b>What you must still own:</b> asking the right questions (strike, valuation, cliffs, acceleration, refresher practice), deciding your risk appetite, and consulting a qualified tax or legal professional for large or unusual grants.</p>`,
  problems: [P({
    title: 'Which vesting shape is better for you?', level: 'Medium', tags: ['vesting', 'cliff'],
    s: 'Offer X has 300k equity vesting 25/25/25/25. Offer Y has 360k vesting 10/20/30/40. You have been job-hopping every 2 years. Which is better, and what do you ask?',
    shape: 'compute year-2 and year-4 values for both, mention that you may leave at year 2, and ask about refreshers and acceleration.',
    weak: 'Y is bigger so Y is better.', why: 'It ignores the shape. At year 2 X gives 150k while Y gives only 108k, and Y rewards only people who stay.',
    mcq: { q: 'You expect to leave after 2 years. Which compares best?', options: ['Full 4-year grant size', 'Value vested by year 2', 'Strike price only'], answer: 1, explain: 'Compare what you would really collect given your own plan.' },
    h1: 'Calculate vested amount at year 2 and year 4.', h2: 'X: 150k at year 2, 300k at year 4. Y: 108k and 360k.', h3: 'State your own expected stay, then ask about refreshers.',
    a: '<p>Year 2: X gives 150k, Y gives 108k. Year 4: X gives 300k, Y gives 360k. If I truly expect to leave at year 2, X is better by 42k in equity; if I expect to stay four years, Y is better by 60k. I would say: &ldquo;I like the larger grant, but the schedule is back-loaded. Could we move to 15/25/30/30, or add a first-year refresher?&rdquo; I would also ask about acceleration on layoff and how refreshers are decided. A decision based on my honest plan beats one based on the largest number.</p>',
    f: ['What if the stock doubles?', 'How would a cliff change the answer?']
  })]
});
topics.push({
  title: 'Total Compensation Over 4 Years: The Calculator',
  analogy: `<p>Comparing offers is like comparing two <b>phone plans</b>. One has a low monthly price but a big fee at the start; the other starts cheap and gets expensive later. You would never pick by one month; you add up the full contract. Do the same: add up four years, year by year.</p>`,
  explain: `<p>Recipe for a fair comparison:</p>
<ol><li>For each year write <b>base + bonus + sign-on (year 1 only) + equity vesting that year</b>.</li><li>Pick an <b>assumed stock growth rate</b> (for example 0%, and a cautious 10%). Never assume the stock only goes up.</li><li>Add the four years; also show the <b>year-2 stop</b> if you may leave early.</li><li>Add benefits separately as a note.</li></ol>
${H.table(['Year', 'Nimbus Labs (25/25/25/25)', 'Orbit Systems (5/15/40/40)'], [['1', '246k', '221k'], ['2', '226k', '213k'], ['3', '226k', '293k'], ['4', '226k', '293k'], ['Total', '924k', H.c('g', '1020k')]])}
<p>Orbit wins over four years by about 96k at 0% growth, but Nimbus pays more in years 1&ndash;2. If you leave at year 2, Nimbus is ahead (472k vs 434k). The honest answer depends on <i>how long you will stay</i> and <i>how much you trust the stock</i>. All numbers are fictional examples.</p>`,
  clues: ['&ldquo;Which offer is better?&rdquo; &rarr; build a year-by-year table first', 'Different vesting shapes &rarr; compare at year 2 and year 4', 'Big sign-on &rarr; separate year 1 from the steady state', 'Private-company equity &rarr; run the calculator with 0% and a haircut', 'Offers in different currencies &rarr; convert and note the date', 'A friend says &ldquo;take the higher base&rdquo; &rarr; test with the table'],
  code: [{
    lang: 'python', run: true, title: '4-year total-comp calculator (runnable)',
    code: `# 4-year total compensation calculator. Fictional numbers, stdlib only.
# Vesting is given as yearly fractions; a "cliff" means nothing vests before month 12.

def year_rows(offer, growth):
    """Return one dict per year with base, bonus, sign-on, equity and total."""
    rows = []
    for y in range(4):
        base = offer["base"]
        bonus = base * offer["bonus_pct"] / 100
        sign = offer["sign_on"] if y == 0 else 0
        # shares vest at the end of year y+1; value grows with the stock
        equity = offer["equity"] * offer["vest"][y] / 100 * (1 + growth) ** (y + 1)
        rows.append({"base": base, "bonus": bonus, "sign": sign,
                     "equity": equity, "total": base + bonus + sign + equity})
    return rows

def vested_if_leave(offer, month, growth):
    """Equity value you keep if you leave at a given month (1-year cliff, then monthly)."""
    if month < 12:                       # cliff: nothing before month 12
        return 0.0
    frac = 0.0
    for y in range(4):
        start, end = 12 * y, 12 * (y + 1)
        if month >= end:
            frac += offer["vest"][y] / 100
        elif month > start:              # part of a year after the cliff
            frac += offer["vest"][y] / 100 * (month - start) / 12
    return offer["equity"] * frac * (1 + growth) ** (month / 12)

offers = {
    "Nimbus Labs":   {"base": 160, "bonus_pct": 10, "sign_on": 20, "equity": 200, "vest": [25, 25, 25, 25]},
    "Orbit Systems": {"base": 150, "bonus_pct": 10, "sign_on": 40, "equity": 320, "vest": [5, 15, 40, 40]},
}

for growth in (0.0, 0.10):
    print(f"=== Assumed stock growth {int(growth * 100)}% per year (all numbers in thousands) ===")
    totals = {}
    for name, offer in offers.items():
        rows = year_rows(offer, growth)
        totals[name] = sum(r["total"] for r in rows)
        print(name)
        for i, r in enumerate(rows, 1):
            print(f"  Year {i}: base {r['base']:.0f} + bonus {r['bonus']:.0f} + sign {r['sign']:.0f}"
                  f" + equity {r['equity']:.0f} = {r['total']:.0f}")
        print(f"  4-year total: {totals[name]:.0f}   first-2-years: {sum(r['total'] for r in rows[:2]):.0f}")
    best = max(totals, key=totals.get)
    print(f"Winner over 4 years: {best}\\n")

print("If you leave at month 11 (cliff) or month 18, equity you keep at 0% growth:")
for name, offer in offers.items():
    print(f"  {name}: month 11 -> {vested_if_leave(offer, 11, 0):.0f}k, month 18 -> {vested_if_leave(offer, 18, 0):.0f}k")
`
  }],
  codeTitle: ['Compare two offers year by year'],
  viz: {
    title: 'Two offers, year by year',
    input: '0',
    inputLabel: 'Assumed stock growth per year, % (0 to 30)',
    gen: function (input) {
      var g = Number(String(input).trim());
      if (isNaN(g) || g < 0 || g > 30) throw new Error('Enter a growth rate from 0 to 30');
      g = g / 100;
      var A = offerYears(OA, g), B = offerYears(OB, g), frames = [], ta = 0, tb = 0, rows = [];
      frames.push({ narr: 'Two fictional offers. <b>Nimbus Labs</b>: base 160k, 25/25/25/25 vesting. <b>Orbit Systems</b>: base 150k, bigger sign-on, 5/15/40/40 vesting. Growth assumed: <b>' + Math.round(g * 100) + '%</b>.', parts: [{ type: 'table', columns: ['', 'Nimbus', 'Orbit'], rows: [['base', 160, 150], ['bonus %', 10, 10], ['sign-on', 20, 40], ['equity grant', 200, 320], ['vesting', '25/25/25/25', '5/15/40/40']] }] });
      for (var y = 0; y < 4; y++) {
        var a = yTotal(A[y]), b = yTotal(B[y]); ta += a; tb += b;
        rows.push(['Year ' + (y + 1), Math.round(a), Math.round(b)]);
        var hl = {}; hl[y] = 'cur';
        frames.push({ narr: 'Year ' + (y + 1) + ': Nimbus <b>' + fmt(a) + '</b>, Orbit <b>' + fmt(b) + '</b>. ' + (a > b ? 'Nimbus leads this year.' : 'Orbit leads this year.'), parts: [{ type: 'bars', label: 'Nimbus total by year (k)', values: A.slice(0, y + 1).map(yTotal).map(Math.round), hl: hl }, { type: 'bars', label: 'Orbit total by year (k)', values: B.slice(0, y + 1).map(yTotal).map(Math.round), hl: hl }, { type: 'table', columns: ['year', 'Nimbus', 'Orbit'], rows: rows.slice(), hl: hl }] });
      }
      frames.push({ narr: '4-year totals: Nimbus <b>' + fmt(ta) + '</b>, Orbit <b>' + fmt(tb) + '</b>. ' + (tb > ta ? 'Orbit wins long-term, but check year-2 exit.' : 'Nimbus wins.'), parts: [{ type: 'table', columns: ['', 'Nimbus', 'Orbit'], rows: rows.concat([['Total', Math.round(ta), Math.round(tb)]]), hl: { 4: 'sel' } }] });
      var a2 = yTotal(A[0]) + yTotal(A[1]), b2 = yTotal(B[0]) + yTotal(B[1]);
      frames.push({ narr: 'If you may leave after 2 years: Nimbus <b>' + fmt(a2) + '</b> vs Orbit <b>' + fmt(b2) + '</b>. ' + (a2 > b2 ? 'Nimbus is ahead.' : 'Orbit is ahead.') + ' Your plan decides.', parts: [{ type: 'bars', label: 'first 2 years (k)', values: [Math.round(a2), Math.round(b2)], idxLabels: ['Nimbus', 'Orbit'], hl: { 0: a2 > b2 ? 'win' : 'done', 1: b2 > a2 ? 'win' : 'done' } }] });
      return frames;
    }
  },
  examples: [
    { title: 'Higher base is not always higher pay', html: `<p>Nimbus base is 10k higher, yet Orbit wins over four years because its grant is larger and pays heavily in years 3 and 4. Read the table, not the base.</p>` },
    { title: 'Add a growth haircut', html: `<p>With 10% yearly growth the gap widens for Orbit; with a falling stock it narrows or flips. Always run 0% as your base case, and treat growth as a bonus rather than the plan.</p>` },
    { title: 'Leaving early', html: `<p>Use the month-11 line from the script: any cliff means zero. A plan to leave at 18 months gives very different values for the two schedules. Run it with your own timeline.</p>`, code: { lang: 'python', run: true, code: `# Quick sanity check: 4-year equity vested for each shape on a 100k grant\nfor name, v in (('even', [25, 25, 25, 25]), ('back-loaded', [5, 15, 40, 40])):\n    print(name, [sum(v[:i + 1]) for i in range(4)])` } }
  ],
  deepDive: `<p><b>Expert layer.</b> A thorough model adds: (1) probability-weighted bonus; (2) equity discount for risk (public stock: small haircut; late-stage private: a big haircut, for example 30&ndash;60%; early options: often near zero in your base case); (3) taxes by country; (4) time value (money in year 1 is worth slightly more than in year 4, so back-loaded plans deserve a small discount); (5) refreshers as an upside scenario; (6) the cost of switching again, since leaving mid-vest forfeits value.</p>
<p><b>Break-even thinking.</b> Ask &ldquo;At what stock growth does Offer B beat Offer A?&rdquo; and &ldquo;At what stay length?&rdquo; These two numbers explain the trade-off better than the totals. The calculator is easy to extend: loop over growth from -20% to +30% and print the winner.</p>
<p><b>Non-money value</b> is real: learning rate, manager quality, product risk, commute or remote policy, visa support. Money tables help you <i>price</i> these: if Offer A pays 40k less per year, is better mentoring worth 40k to you?</p>`,
  aiEra: `<p><b>What AI changes:</b> you can ask an assistant to extend the calculator (more years, taxes, scenarios) in minutes, and to draw charts. Some companies now quote part of the pay as equity in fast-growing AI firms, so scenario analysis matters more.</p>
<p><b>Use AI as a partner:</b> <code>Modify this Python script to add a refresher of 40k in year 3 and print the break-even growth rate.</code> Read the code before you trust the output.</p>
<p><b>Where AI goes wrong:</b> silent arithmetic or timing mistakes (vesting at start vs end of year), invented tax rates, and false confidence about private-company value.</p>
<p><b>What you must still own:</b> the assumptions. A model is only as honest as the growth rate and stay length you choose. Write them down, and be ready to explain them to a partner, mentor or recruiter.</p>`,
  problems: [P({
    title: 'Compare two offers with different vesting', level: 'Medium', tags: ['total comp', 'vesting'],
    s: 'Offer A (Nimbus): base 160k, 10% bonus, 20k sign-on, 200k equity 25/25/25/25. Offer B (Orbit): base 150k, 10% bonus, 40k sign-on, 320k equity 5/15/40/40. Which do you pick and what do you say to each recruiter?',
    shape: 'build the year table (A 924k, B 1020k at 0% growth), note the year-2 reversal (A 472k vs B 434k), pick by your stay plan, and ask Orbit for a flatter schedule.',
    weak: 'B has more total money so I take B.', why: 'It ignores the risk of leaving at year 2, cliffs and the stock assumption, and it wastes a chance to ask Orbit for a friendlier schedule.',
    mcq: { q: 'Which question most improves the decision?', options: ['How long will I likely stay?', 'Which logo is bigger?', 'Which recruiter was nicer?'], answer: 0, explain: 'Back-loaded vesting pays only those who stay. Your stay plan decides.' },
    h1: 'Make a four-row table first.', h2: 'Compute totals at year 2 and year 4.', h3: 'Use the gap as a negotiation: ask Orbit for 10/20/35/35 or a bigger year-1 amount.',
    a: '<p>Year totals at 0% growth: Nimbus 246/226/226/226 = 924k; Orbit 221/213/293/293 = 1020k. After two years Nimbus is ahead 472k to 434k, but over four years Orbit leads by 96k. I would plan to stay at least three years, so Orbit looks stronger, but I would test a falling-stock case and ask Orbit: &ldquo;I am excited about the role. The grant is attractive, but the back-loaded vesting is a risk for me. Could we move to 10/20/35/35, or add a year-2 sign-on?&rdquo; I would also tell Nimbus honestly that I have another offer and ask whether they can raise the equity grant. Choose with numbers, then with team and growth.</p>',
    f: ['What if Orbit is a private startup?', 'How would a 1-year cliff change it?']
  })]
});
topics.push({
  title: 'Negotiation Principles & Polite Scripts',
  analogy: `<p>Negotiating an offer is like <b>buying a house with a kind seller</b>. You say you love the house (enthusiasm), you show recent prices of similar houses (data), you ask for a fair price, and then you stop talking and let the seller think. Nobody is the enemy; both sides want the deal to happen.</p>`,
  explain: `<p>Five simple principles:</p>
<ol><li><b>Express enthusiasm first.</b> &ldquo;I am excited about this role.&rdquo; Companies like to give more to people who clearly want to join.</li>
<li><b>Anchor with data, not feelings.</b> Say &ldquo;Based on the level and the market data I have seen, I was expecting something closer to X&rdquo; rather than &ldquo;I need more money.&rdquo;</li>
<li><b>Negotiate total compensation.</b> If base is capped, ask for equity, sign-on, level, start date or a review in 6 months.</li>
<li><b>Make one clear ask, then pause.</b> Silence is fine. Let them respond.</li>
<li><b>Get it in writing.</b> A verbal &ldquo;yes&rdquo; is not an offer. Wait for the updated letter before you resign.</li></ol>
<p><b>Do not</b> lie about other offers, give an ultimatum you cannot keep, or reveal your lowest acceptable number. In many places recruiters ask for your current salary; you can politely redirect to the role&rsquo;s range, and in some places the law protects this. Norms differ by country and company.</p>
${H.table(['Situation', 'Polite script'], [['Lowball', '&ldquo;Thank you. I am excited about the team. The offer is below what I was expecting for this level; could we look at 185k base?&rdquo;'], ['Ask for equity', '&ldquo;Is there flexibility on the equity grant? A larger grant would help me say yes.&rdquo;'], ['Current salary', '&ldquo;I would rather focus on the value of the role. What is the range for this level?&rdquo;'], ['Need time', '&ldquo;Thank you. Can I reply by Friday so I can decide carefully?&rdquo;']])}
<p>Offers are illustrative; always check your own country&rsquo;s rules and norms.</p>`,
  clues: ['&ldquo;What are your salary expectations?&rdquo; &rarr; give a researched range, or ask for theirs', '&ldquo;What is your current compensation?&rdquo; &rarr; redirect politely to the role&rsquo;s range', '&ldquo;This is our best and final offer&rdquo; &rarr; test with a respectful non-base ask', '&ldquo;We do not negotiate base for this level&rdquo; &rarr; ask about equity, sign-on, level, review date', '&ldquo;We need an answer by tomorrow&rdquo; &rarr; ask for a short extension in a warm tone', '&ldquo;Congratulations!&rdquo; call &rarr; thank, ask for the written details, do not decide on the call'],
  code: [{
    lang: 'python', run: true, title: 'Negotiation script templater (runnable)',
    code: `# Fills a polite script from a few facts. Stdlib only; fictional numbers.

TEMPLATES = {
    "thank_and_ask_details": (
        "Thank you so much, {name}. I am genuinely excited about the {role} role at {company}. "
        "Could you send the written breakdown (base, bonus, equity and vesting, sign-on, level, benefits)? "
        "I will get back to you by {date}."),
    "counter_total_comp": (
        "Thank you again, {name}. I am very excited to join {company}. Based on the {level} level and the data I have "
        "seen for similar roles, I was hoping for a base closer to {ask_base}k. "
        "If base is fixed, I would also be happy to look at the equity grant or a sign-on. Is there flexibility?"),
    "ask_equity": (
        "I really like the team and the plan for the role. The equity grant is the part that would make my decision easy: "
        "could we increase it from {equity}k to {ask_equity}k, or smooth the vesting schedule?"),
    "decline_salary_history": (
        "I would rather focus on the value I can bring to the {role} role. "
        "What is the compensation range for the {level} level?"),
    "extend_deadline": (
        "Thank you for the offer. I want to give it the careful decision it deserves. "
        "Could I have until {date}? I am excited about {company} and will confirm as soon as I can."),
}

def render(key, **facts):
    """Return the filled script, or tell which fact is missing."""
    try:
        return TEMPLATES[key].format(**facts)
    except KeyError as e:
        return f"[missing fact: {e}]"

facts = dict(name="Priya", role="Backend Engineer", company="Nimbus Labs", level="Senior",
             date="Friday", ask_base=175, equity=200, ask_equity=250)

for key in TEMPLATES:
    print(f"--- {key} ---")
    print(render(key, **facts))
    print()

# Quick check: how big is the ask versus the offer?
offer_base = 160
print(f"Ask is {(facts['ask_base'] - offer_base) / offer_base * 100:.1f}% above the offer: reasonable and specific.")
print(render("counter_total_comp", name="Sam"))   # shows the missing-fact guard
`
  }],
  codeTitle: ['Script templater'],
  viz: {
    title: 'A negotiation conversation, step by step',
    input: 'Nimbus Labs',
    inputLabel: 'Company name (fictional)',
    gen: function (input) {
      var co = String(input).replace(/[<>&]/g, '').trim() || 'the company';
      if (co.length > 30) throw new Error('Use a short company name');
      var steps = ['Thank + enthusiasm', 'Ask for the written offer', 'Research data', 'Make one clear ask', 'Pause and listen', 'Agree + get it in writing'];
      var say = [
        '&ldquo;Thank you, I am excited about joining ' + co + '.&rdquo;',
        '&ldquo;Could you send the full breakdown and the equity plan?&rdquo;',
        'Quietly check ranges for your level, city and skills. Not shared yet.',
        '&ldquo;Based on the data, I was hoping for a base nearer 175k. Is there flexibility?&rdquo;',
        'Say nothing more. Let them respond. Silence is not rude.',
        '&ldquo;Great. Please send the updated offer letter and I will confirm.&rdquo;'];
      var frames = [];
      for (var i = 0; i < steps.length; i++) {
        var hl = {}; for (var j = 0; j < i; j++) hl[j] = 'done'; hl[i] = 'cur';
        frames.push({ narr: 'Step ' + (i + 1) + ': <b>' + steps[i] + '</b>. ' + say[i], parts: [{ type: 'queue', label: 'Conversation flow', items: steps.slice(), hl: hl, frontLabel: 'start', backLabel: 'signed' }, { type: 'text', html: say[i] }] });
      }
      frames.push({ narr: 'If they say <b>no</b> to base, return to total comp: sign-on, equity, level, review date, start date.', parts: [{ type: 'queue', label: 'Fallback asks', items: ['Equity', 'Sign-on', 'Level / title', '6-month review', 'Start date'], hl: { 0: 'ok' } }] });
      return frames;
    }
  },
  examples: [
    { title: 'Weak vs strong counter', html: `<p><span class="c-r">Weak:</span> &ldquo;I need more.&rdquo; <span class="c-g">Strong:</span> &ldquo;I am excited about the role. Given the scope and the data I have seen for this level, I was expecting a base closer to 175k. Could we get there?&rdquo; The strong version is specific, polite and gives a reason.</p>` },
    { title: 'When base is fixed', html: `<p>Recruiter: &ldquo;Base is capped at 160k.&rdquo; You: &ldquo;I understand. Could we look at the equity grant or a sign-on to bridge the difference?&rdquo; You moved to a different lever without a fight.</p>` },
    { title: 'Salary history question', html: `<p>&ldquo;What are you earning now?&rdquo; You: &ldquo;I would rather focus on the role&rsquo;s value. What range have you set for this level?&rdquo; If pushed, share a target range rather than past pay. Some regions limit this question by law.</p>` }
  ],
  deepDive: `<p><b>Expert layer.</b> Negotiation is about <i>information and alternatives</i>. Your best leverage is a real alternative (another offer, or a good current job) and the company&rsquo;s sunk effort in hiring you. Tactics that work: (1) ask for the range early and give a range with your target at the bottom; (2) trade, do not just ask (&ldquo;If we can get to X, I can sign this week&rdquo;); (3) negotiate level first because level controls future pay bands; (4) ask for the offer review in writing; (5) keep every conversation friendly because you will work with these people.</p>
<p><b>Common mistakes.</b> Naming a number too early; accepting on the call; negotiating against yourself (&ldquo;I would take 150k&rdquo;); bluffing about offers that do not exist; making demands by email in a harsh tone; ignoring the manager, who often has influence and can sponsor your case.</p>
<p><b>Ethics and law.</b> Be truthful. Do not reveal confidential information from other employers. Rules about salary history and pay transparency vary by country and state, so check local rules before you cite them. A polite, honest negotiation rarely costs you an offer, and many hiring teams expect one, especially for senior roles.</p>`,
  aiEra: `<p><b>What AI changes:</b> pay data and templates are easy to find, so the edge moves to <i>preparation and tone</i>. AI can draft emails, role-play the recruiter, and suggest questions.</p>
<p><b>Use AI as a partner:</b> <code>Act as a recruiter who says this is a final offer. I will practise a polite counter. Give feedback after each reply.</code> Practise out loud and keep your own voice.</p>
<p><b>Where AI goes wrong:</b> it may cite fake salary statistics, write stiff or over-aggressive emails, or suggest tactics that are illegal or untrue where you live. Recruiters can often tell when a message is generic.</p>
<p><b>What you must still own:</b> the numbers you ask for, honesty, relationship, and the real conversation. Use AI to prepare, then speak as yourself.</p>`,
  problems: [P({
    title: 'Respond to a lowball offer', level: 'Medium', tags: ['negotiation', 'lowball'],
    s: 'The offer is 140k base for a role where you researched 165-185k for similar level and city. The recruiter says it is their standard band.',
    shape: 'thank, show enthusiasm, anchor with data, ask for a specific number, and offer to talk about total comp.',
    weak: 'That is way too low. I will not accept less than 180k.', why: 'It is an ultimatum with no data or warmth, and it can end the conversation.',
    mcq: { q: 'Best next step after a low offer?', options: ['Walk away', 'Thank them, cite data, make a specific polite ask', 'Accept to be safe'], answer: 1, explain: 'A calm data-based ask keeps the deal alive and shows professionalism.' },
    h1: 'Enthusiasm first, number second.', h2: 'Cite market ranges for your level, not your needs.', h3: 'Ask for one number and a trade (equity, level, review date).',
    a: '<p>&ldquo;Thank you, I am excited about the team and the product. The offer is below what I expected for a senior engineer in this city; roles I have researched sit in the 165 to 185k range. Could we get to 170k base? If base is fixed, I am open to discussing equity or a sign-on to close the gap.&rdquo; Then pause. This is warm, specific, and shows I understand total compensation. If they hold firm on everything, I decide on the whole package, not on pride.</p>',
    f: ['What if they say the band is final?', 'When do you walk away?']
  })]
});
topics.push({
  title: 'Multiple Offers, Exploding Deadlines & Counter-Offers',
  analogy: `<p>Several offers are like <b>having two good invitations for the same evening</b>. You owe each host an honest, early, kind answer. You do not lie to either, you do not ghost, and you do not accept both. A clear decision method (a score sheet) keeps the choice calm.</p>`,
  explain: `<p><b>Handling multiple offers.</b> Tell each company, truthfully, that you are in other processes and give your timeline. Ask them to move their interview steps if needed so offers arrive together. Then compare with a <b>decision matrix</b>: list what matters (total compensation, growth, team/manager, stability, flexibility), give each a weight, score each offer 1&ndash;5, and multiply.</p>
<p><b>Exploding offers</b> expire quickly (24&ndash;72 hours). Respond calmly: &ldquo;I am very interested. To decide carefully I need until Friday. Is that possible?&rdquo; Most teams extend a few days. If they refuse, decide based on what you know; do not accept just from panic, and do not lie about having another offer.</p>
<p><b>Counter-offer from your current employer.</b> When you resign, your manager may offer more money. Think before accepting: ask <i>why was it not offered before?</i> Many career advisers warn that people who accept a counter-offer often leave soon after, but there is no fixed rule and outcomes vary. Accept only if the real reasons you wanted to leave (growth, scope, manager) are also fixed in writing.</p>
${H.table(['Question', 'Honest, polite move'], [['Offer expires tomorrow', 'Ask for 3&ndash;5 more days, state the date you can answer'], ['You prefer company B but A offered first', 'Tell B your timeline; do not accept A unless you will honour it'], ['Current employer matches pay', 'Check if growth issues are solved; get it in writing'], ['Already accepted, better offer arrives', 'Breaking an acceptance harms trust; decide carefully before signing']])}`,
  clues: ['&ldquo;This offer expires in 48 hours&rdquo; &rarr; ask politely for a short extension', '&ldquo;We will match any offer&rdquo; &rarr; ask what changes beyond pay', '&ldquo;I have another offer&rdquo; &rarr; only say it if true, and state your timeline', 'Two offers, different strengths &rarr; weighted decision matrix', 'Manager says &ldquo;please stay&rdquo; with a raise &rarr; why now? is the cause fixed?', 'Verbal offer, no letter &rarr; do not resign yet'],
  viz: {
    title: 'Decision matrix for three offers',
    input: '40 25 20 15',
    inputLabel: 'Weights: pay growth team stability (any 4 numbers)',
    gen: function (input) {
      var w = String(input).trim().split(/[\s,]+/).map(Number);
      if (w.length !== 4 || w.some(function (x) { return isNaN(x) || x < 0; }) || w[0] + w[1] + w[2] + w[3] === 0) throw new Error('Enter 4 non-negative weights like: 40 25 20 15');
      var tot = w[0] + w[1] + w[2] + w[3];
      var names = ['Pay', 'Growth', 'Team', 'Stability'];
      var sc = [[4, 5, 3], [3, 5, 4], [3, 4, 5], [4, 2, 5]];
      var cols = ['Nimbus', 'Orbit', 'Helio'], frames = [];
      var rows = sc.map(function (r) { return r.slice(); });
      frames.push({ narr: 'Scores from 1 (poor) to 5 (great) for each offer. These are your honest feelings after research.', parts: [{ type: 'grid', label: 'Scores', colHead: [''].concat(cols), rowHead: names, rows: rows }] });
      frames.push({ narr: 'Weights (how much each factor matters to <b>you</b>): ' + names.map(function (n, i) { return n + ' ' + w[i]; }).join(', ') + '.', parts: [{ type: 'vars', vals: { Pay: w[0], Growth: w[1], Team: w[2], Stability: w[3] }, hl: { Pay: 'cur' } }] });
      var sums = [0, 0, 0];
      for (var k = 0; k < 4; k++) {
        for (var c = 0; c < 3; c++) sums[c] += sc[k][c] * w[k] / tot;
        var hl = {}; for (var c2 = 0; c2 < 3; c2++) hl[k + ',' + c2] = 'cur';
        frames.push({ narr: 'Add <b>' + names[k] + '</b> (weight ' + w[k] + '). Running totals: ' + cols.map(function (n, i) { return n + ' ' + sums[i].toFixed(2); }).join(', ') + '.', parts: [{ type: 'grid', label: 'Scores', colHead: [''].concat(cols), rowHead: names, rows: rows, hl: hl }, { type: 'bars', label: 'weighted score so far', values: sums.map(function (s) { return Math.round(s * 100) / 100; }), idxLabels: cols }] });
      }
      var best = 0; for (var i = 1; i < 3; i++) if (sums[i] > sums[best]) best = i;
      var fin = sums.map(function (s) { return s.toFixed(2); });
      var hw = {}; for (var r2 = 0; r2 < 4; r2++) hw[r2 + ',' + best] = 'win';
      frames.push({ narr: 'Winner by your weights: <b>' + cols[best] + '</b> (' + fin[best] + ' / 5). Change the weights and see if the winner changes. If it flips easily, the choice is close, so trust your gut too.', parts: [{ type: 'grid', label: 'Winner highlighted', colHead: [''].concat(cols), rowHead: names, rows: rows, hl: hw }, { type: 'bars', label: 'final weighted scores', values: sums.map(function (s) { return Math.round(s * 100) / 100; }), idxLabels: cols, hl: (function () { var h = {}; h[best] = 'win'; return h; })() }] });
      return frames;
    }
  },
  examples: [
    { title: 'Extension request', html: `<p>&ldquo;Thank you for the offer, I am very excited. I am finishing a final interview on Thursday. Could I confirm by Friday afternoon?&rdquo; Truthful, polite, with a date.</p>` },
    { title: 'Telling the other company', html: `<p>&ldquo;I have received an offer with a deadline next Tuesday and you are still my top choice. Is it possible to speed up the final step?&rdquo; This is honest and often works.</p>` },
    { title: 'Counter-offer check', html: `<p>Manager offers +15k to stay. Ask: Did the reasons I wanted to leave change? Is the new scope or level in writing? If only the pay changes, the cause remains.</p>` }
  ],
  deepDive: `<p><b>Expert layer.</b> Timing is the lever. Start all processes around the same time, say your deadlines early, and keep updates short and honest. A strong competing offer legitimately shifts a company&rsquo;s view of the market, but a bluff does not: recruiters often ask for the offer letter or notice the story does not match. Keep your promises: reneging on an accepted offer or signing bonus can hurt your reputation in small industries.</p>
<p><b>Exploding offers</b> are a pressure tactic but also sometimes real hiring-plan limits. Ask what drives the date. If the true reason is a closing budget, you may negotiate a one-day delay; if the answer is vague, you have learned something about the company culture.</p>
<p><b>Counter-offers</b> carry hidden costs: trust may drop (&ldquo;flight risk&rdquo;), raises may be one-off, and the problems that made you look remain. Good reasons to stay after a counter: the reason for leaving was pay-only, and the promotion or scope change is documented. Always thank your manager and keep the door open either way.</p>`,
  aiEra: `<p><b>What AI changes:</b> candidates can run many applications in parallel, so multiple-offer situations are more common, and companies sometimes decide faster. Hiring teams also use AI screening, which makes your written record (offer letter, level, scope) more important.</p>
<p><b>Use AI as a partner:</b> make the decision matrix, then ask <code>What is missing from my criteria? Argue against my top choice.</code> Practise the extension request out loud.</p>
<p><b>Where AI goes wrong:</b> it can encourage hardball tactics or invented leverage. A matrix is only as good as the scores you enter; AI may flatter your first instinct.</p>
<p><b>What you must still own:</b> honesty with every company, the weights (which reflect your values), and final accountability for the choice. Consider long-term skills: does the team learn and ship with AI tools, or is the role likely to be automated?</p>`,
  problems: [P({
    title: 'Respond to an exploding offer', level: 'Medium', tags: ['deadline', 'multiple offers'],
    s: 'Company A gives you an offer that expires in 48 hours. Company B (your first choice) has a final interview in 5 days.',
    shape: 'ask A for an extension truthfully; tell B about the deadline and ask to move the interview; prepare a decision matrix.',
    weak: 'I will just tell A I have another offer from B, even though B has not given one.', why: 'It is a lie that can be discovered, and it damages trust with both companies.',
    mcq: { q: 'Which is ethical and effective?', options: ['Claim an offer you do not have', 'Ask for a few more days and tell B your timeline', 'Accept A and keep interviewing at B'], answer: 1, explain: 'Truthful timeline requests are normal and often granted.' },
    h1: 'Do not invent an offer.', h2: 'Ask both companies to adjust dates.', h3: 'Decide the fallback if neither moves.',
    a: '<p>To A: &ldquo;Thank you, I am excited about this offer. I am in a final round with another company next week and want to make a fair decision. Could I answer by next Wednesday?&rdquo; To B: &ldquo;I have an offer with a short deadline and you are my top choice. Is it possible to move the final interview earlier or get a decision by Friday?&rdquo; I stay truthful, say I am in process, not that I hold an offer. If A refuses and B cannot move, I decide using the matrix: take A only if I would be happy there, otherwise let it go. I never accept an offer I will not honour.</p>',
    f: ['What if A refuses an extension?', 'Would you reveal the number from B?']
  }), P({
    title: 'Counter-offer from your current employer', level: 'Hard', tags: ['counter-offer', 'retention'],
    s: 'You resign for a better offer. Your manager offers a 12% raise to stay and says a promotion is coming next year.',
    shape: 'thank them, test whether the causes are fixed, ask for written terms, and decide on growth rather than pay alone.',
    weak: 'OK, I will stay for the raise and cancel the other offer today.', why: 'It decides on a single emotional moment, ignores why you wanted to leave, and burns the new employer.',
    mcq: { q: 'Strongest check before accepting a counter?', options: ['Is the raise larger than the new offer?', 'Are the reasons I wanted to leave fixed and written down?', 'Does my manager seem sad?'], answer: 1, explain: 'If the cause of leaving remains, the pay raise only delays the same decision.' },
    h1: 'Why did you look in the first place?', h2: 'Ask for the promotion and scope in writing.', h3: 'Compare 4-year growth, not just year 1.',
    a: '<p>I would thank my manager sincerely and say: &ldquo;I appreciate this. I started looking because of limited scope and growth, not only pay. Could we put the promotion timeline and the project scope in writing?&rdquo; I would compare the two paths on growth, learning, manager quality and 4-year total compensation. If the promised changes are specific and written, staying can be a good choice. If it is only a raise and a vague promise, I would take the new role and leave on good terms. Either way I would tell the new company promptly and kindly, because trust matters.</p>',
    f: ['What if the manager gets upset?', 'What if the raise matches the new offer exactly?']
  })]
});
topics.push({
  title: 'Career Ladders: IC vs Manager Track, Levels & Expectations',
  analogy: `<p>A career ladder is like a <b>video game skill tree</b>. After a certain point the path splits: one branch grows your own power (deep technical expert), the other grows your team&rsquo;s power (leader of people). Both branches reach high levels; you can also switch branches with some cost.</p>`,
  explain: `<p>Most tech companies publish a <b>ladder</b> with levels (names differ: L3&ndash;L7, SDE I&ndash;Principal, E3&ndash;E8). Roughly, using fictional level names:</p>
${H.table(['Level', 'Typical title', 'Expectation (simple)'], [['L3', 'Engineer', 'Finish well-defined tasks with help'], ['L4', 'Engineer II', 'Own features end to end'], ['L5', 'Senior Engineer', 'Own a whole system, mentor others, lead projects'], ['L6', 'Staff Engineer', 'Set technical direction across teams'], ['M1', 'Engineering Manager', 'Grow a team, deliver outcomes, hire, coach']])}
<p><b>Two tracks:</b> <i>IC</i> (individual contributor) goes Senior &rarr; Staff &rarr; Principal. <i>Manager</i> goes Manager &rarr; Senior Manager &rarr; Director. Many people try management for a year and return to IC; many companies support this. <b>Level is a big money lever</b> because pay bands depend on level, so negotiate level before base.</p>
<p>To decide, ask yourself: Do I enjoy <b>coaching people and handling conflict</b>, or <b>solving deep technical problems</b>? Do my best days involve code and design, or one-on-ones and planning? Neither is better; they are different jobs.</p>
${H.chips(['IC: deep craft', 'IC: influence by design', 'Manager: people', 'Manager: outcomes via team'], { label: 'What each track rewards' })}`,
  clues: ['&ldquo;What level is this offer?&rdquo; &rarr; level controls pay band and expectations', '&ldquo;Do you want to move into management?&rdquo; &rarr; a thoughtful answer, not a yes/no', '&ldquo;Staff, Senior Staff, Principal&rdquo; &rarr; IC ladder above senior', '&ldquo;Tech lead&rdquo; &rarr; a role, not necessarily a level', '&ldquo;We promote from within&rdquo; &rarr; ask for promotion timelines and rates', '&ldquo;Manager of managers&rdquo; &rarr; director path, different skills again'],
  viz: {
    title: 'Career ladder: IC and manager tracks',
    input: '4',
    inputLabel: 'Your current level number (3 to 6)',
    gen: function (input) {
      var cur = parseInt(String(input).trim(), 10);
      if (isNaN(cur) || cur < 3 || cur > 6) throw new Error('Enter a level number from 3 to 6');
      var nodes = [
        { id: 'L3', label: 'L3 Engineer', x: 10, y: 38, shape: 'box', w: 16 },
        { id: 'L4', label: 'L4 Eng II', x: 32, y: 38, shape: 'box', w: 16 },
        { id: 'L5', label: 'L5 Senior', x: 54, y: 38, shape: 'box', w: 16 },
        { id: 'L6', label: 'L6 Staff', x: 80, y: 14, shape: 'box', w: 16 },
        { id: 'M1', label: 'M1 Manager', x: 80, y: 62, shape: 'box', w: 16 }
      ];
      var edges = [['L3', 'L4'], ['L4', 'L5'], ['L5', 'L6', 'IC track'], ['L5', 'M1', 'Manager track']];
      var info = {
        L3: 'You finish well-defined tasks. Growth: learn the codebase, ask good questions.',
        L4: 'You own features end to end. Growth: handle ambiguity, start mentoring.',
        L5: 'You own a system and lead projects. <b>The fork:</b> go deeper (Staff) or lead people (Manager).',
        L6: 'Staff: direction across teams, influence without authority, write the strategy.',
        M1: 'Manager: hire, coach, plan, remove blockers. Your output is your team&rsquo;s output.'
      };
      var order = ['L3', 'L4', 'L5', 'L6', 'M1'], curId = 'L' + cur, frames = [], seen = {};
      for (var i = 0; i < order.length; i++) {
        var id = order[i], hl = {}; seen[id] = 'done';
        for (var k in seen) hl[k] = seen[k];
        hl[curId] = 'cur'; hl[id] = id === curId ? 'cur' : 'sel';
        frames.push({ narr: '<b>' + id + '</b>' + (id === curId ? ' (you are here)' : '') + ': ' + info[id], parts: [{ type: 'graph', label: 'Ladder', directed: true, height: 76, nodes: nodes, edges: edges, hl: hl }, { type: 'stack', label: 'Levels climbed (bottom to top)', items: order.slice(0, Math.min(i + 1, 4)), hl: (function () { var h = {}; h[Math.min(i, 3)] = 'cur'; return h; })() }] });
      }
      frames.push({ narr: 'At the fork, ask: what do I enjoy on my best day? Both tracks are valid, and you can switch.', parts: [{ type: 'graph', directed: true, height: 76, nodes: nodes, edges: edges, hl: (function () { var h = {}; h[curId] = 'cur'; return h; })(), ehl: { 'L5-L6': 'ok', 'L5-M1': 'ok' } }] });
      return frames;
    }
  },
  examples: [
    { title: 'Negotiating level', html: `<p>Offer says L4 but your scope fits L5. Ask: &ldquo;Based on my experience leading X, could we discuss L5? I would be happy to talk through the leveling expectations.&rdquo; A level up is worth more than a small base bump.</p>` },
    { title: 'Management trial', html: `<p>You are offered a team lead role. A good reply: &ldquo;I would like to try it for a year, with the option to return to IC if it is not a fit. Can we agree that in writing?&rdquo;</p>` },
    { title: 'Staff-track proof', html: `<p>Staff engineers show impact across teams: a migration plan that saved 30% build time, a cross-team design review process. Collect evidence, not just titles.</p>` }
  ],
  deepDive: `<p><b>Expert layer.</b> Ladders encode <i>scope, autonomy, impact and influence</i>. Up to senior, promotion is mostly about execution; beyond that it is about picking the right problems, aligning others and growing people. Managers are judged on team outcomes, hiring, retention and clarity; IC leaders on technical judgment and multiplier effect. Staff roles come in flavours: tech lead, architect, solver, right hand.</p>
<p><b>Mistakes.</b> Taking management for status or money; avoiding it out of fear; staying at one level too long without feedback; chasing titles in small companies that do not map to larger ones. Good habits: ask for the written ladder, a calibrated skills gap with your manager every 6 months, a sponsor (someone who speaks for you in promotion meetings), and a brag document of impact.</p>
<p>Also note that titles do not transfer exactly across companies: &ldquo;Senior&rdquo; at one firm can equal &ldquo;mid-level&rdquo; at another. Compare scope, not name.</p>`,
  aiEra: `<p><b>What AI changes:</b> as AI tools take over routine coding, the value shifts to problem framing, design judgment, review, communication and leading humans plus AI. Some organisations flatten management layers; others expect leads to manage AI-assisted workflows. Junior tasks change shape, so ladders increasingly stress ownership and impact over lines of code.</p>
<p><b>Use AI as a partner:</b> <code>Here is my ladder document and my last 6 months of work. Show the evidence gap for the next level.</code> Use it to prepare promotion packets and one-on-one talking points.</p>
<p><b>Where AI goes wrong:</b> it flatters; it can invent impact numbers; it cannot see politics or the company&rsquo;s real promotion bar.</p>
<p><b>What you must still own:</b> choosing your path, building trust, mentoring humans, and showing judgment that cannot be copied from a prompt.</p>`,
  problems: [P({
    title: 'Choosing between IC and manager track', level: 'Medium', tags: ['career ladder', 'management'],
    s: 'You are a Senior Engineer (L5). Your director offers you a team of five. You enjoy design but also like helping juniors.',
    shape: 'reflect on best days, propose a time-boxed trial, ask about support and return path, and describe what success looks like in each track.',
    weak: 'Management pays more so I will say yes.', why: 'It picks on money alone, with no trial, no support plan and no honest view of the work.',
    mcq: { q: 'Most useful question before accepting?', options: ['Is there a return path to IC and support for new managers?', 'Will I get a bigger desk?', 'Can I skip coding forever?'], answer: 0, explain: 'A safe trial and training turn a risky leap into an experiment.' },
    h1: 'Think about your best day at work.', h2: 'Ask what management success means in 6 months.', h3: 'Propose a 12-month trial with a return path in writing.',
    a: '<p>I would say: &ldquo;Thank you, I am honoured. I enjoy mentoring and I also love design work, so I would like to try the manager role for 12 months with training and a clear way back to Staff or Senior IC if it does not fit. Can we agree on what success looks like at 6 and 12 months, and how my current system ownership will be handed over?&rdquo; I would speak to two current managers, read the ladder for both tracks, and check my energy after a month. This treats the choice as an experiment based on what I actually enjoy, not only on pay.</p>',
    f: ['What if you hate management after 6 months?']
  })]
});
topics.push({
  title: 'Staying Relevant with AI & a Continuous Learning Plan',
  analogy: `<p>Staying relevant is like <b>keeping a garden</b>. You do not plant everything in one weekend; you water a little every week, remove weeds (outdated habits), and try a few new seeds each season. The people who thrive are not the ones who learn the most in one burst, but the ones who keep a steady rhythm.</p>`,
  explain: `<p>AI tools now write code, tests and docs. That does not make engineers useless; it moves the value up the stack. A simple plan:</p>
<ol><li><b>Keep the fundamentals.</b> Data structures, systems, debugging, communication. You need them to judge what AI gives you.</li>
<li><b>Use AI daily on real work</b>, then review its output carefully. Learn its weak spots.</li>
<li><b>Build T-shaped skills</b>: broad awareness (AI tooling, cloud, product) plus one deep strength.</li>
<li><b>Show impact, not just activity.</b> Keep a record of what you shipped and what changed.</li>
<li><b>Learn in public a little</b>: notes, talks, small projects. It builds reputation and offers.</li></ol>
<p>A <b>continuous learning plan</b> is small and repeatable. Example for four weeks (3 to 5 hours a week):</p>
${H.table(['Week', 'Focus', 'Output'], [['1', 'Read + notes', 'One page summary'], ['2', 'Build small project with AI help', 'Working demo'], ['3', 'Review + fix what AI got wrong', 'Written lessons'], ['4', 'Share + plan next month', 'Post or team talk']])}
<p>Also schedule a <b>quarterly career check</b>: update your resume, review your ladder, talk to a mentor, and look at the market even when happy. Being ready makes every negotiation easier.</p>`,
  clues: ['&ldquo;How do you keep your skills current?&rdquo; &rarr; give a concrete weekly routine', '&ldquo;How do you use AI in your work?&rdquo; &rarr; examples plus how you verify', '&ldquo;Where do you see yourself in 3 years?&rdquo; &rarr; growth tied to the role', '&ldquo;Will AI replace engineers?&rdquo; &rarr; calm, specific view on scope shift', '&ldquo;Tell me about something new you learned&rdquo; &rarr; STAR story with outcome', '&ldquo;Do you mentor?&rdquo; &rarr; teaching shows depth'],
  viz: {
    title: 'A 4-week learning calendar',
    input: '4',
    inputLabel: 'Study hours per week (2 to 10)',
    gen: function (input) {
      var hrs = Number(String(input).trim());
      if (isNaN(hrs) || hrs < 2 || hrs > 10) throw new Error('Enter hours per week from 2 to 10');
      var days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
      var plan = [
        ['Read', 'Notes', '', 'Fundamentals', ''],
        ['Build', 'AI pair', '', 'Build', 'Demo'],
        ['Review AI', 'Fix bugs', '', 'Lessons', ''],
        ['Share', 'Mentor chat', '', 'Plan next', 'Rest']
      ];
      var rows = plan.map(function (r) { return r.map(function (c, ci) { return c && (ci < Math.ceil(hrs / 2)) ? c : (c ? '(optional)' : ''); }); });
      var frames = [], shown = [];
      frames.push({ narr: 'You study about <b>' + hrs + ' hours a week</b>. The rule: small, regular, with an output each week.', parts: [{ type: 'grid', label: 'Calendar', colHead: [''].concat(days), rowHead: ['Week 1', 'Week 2', 'Week 3', 'Week 4'], rows: [['', '', '', '', ''], ['', '', '', '', ''], ['', '', '', '', ''], ['', '', '', '', '']] }] });
      var themes = ['Week 1: <b>read</b> and take notes (fundamentals first).', 'Week 2: <b>build</b> a small project with AI as a pair.', 'Week 3: <b>review</b> what AI got wrong and write lessons.', 'Week 4: <b>share</b> it, talk to a mentor, plan next month.'];
      for (var w = 0; w < 4; w++) {
        shown.push(rows[w]);
        var hl = {}; for (var c = 0; c < 5; c++) if (rows[w][c] && rows[w][c] !== '(optional)') hl[w + ',' + c] = 'ok'; else hl[w + ',' + c] = 'done';
        var full = []; for (var r = 0; r < 4; r++) full.push(r <= w ? rows[r] : ['', '', '', '', '']);
        frames.push({ narr: themes[w], parts: [{ type: 'grid', label: 'Calendar', colHead: [''].concat(days), rowHead: ['Week 1', 'Week 2', 'Week 3', 'Week 4'], rows: full, hl: hl }] });
      }
      frames.push({ narr: 'After 4 weeks you have a note, a demo, lessons and a share. Repeat each month, and do a <b>quarterly career check</b>.', parts: [{ type: 'grid', label: 'Calendar', colHead: [''].concat(days), rowHead: ['Week 1', 'Week 2', 'Week 3', 'Week 4'], rows: rows, hl: { '3,4': 'sel' } }, { type: 'vars', vals: { hoursPerMonth: hrs * 4, outputs: 4 }, hl: { outputs: 'ok' } }] });
      return frames;
    }
  },
  examples: [
    { title: 'Interview answer: &ldquo;How do you use AI?&rdquo;', html: `<p>&ldquo;I use an assistant to draft tests and explore options, then I review every line, run it, and check edge cases. Last month it suggested a cache that ignored invalidation; I caught it in review and we avoided a stale-data bug.&rdquo; Shows use, judgment and a result.</p>` },
    { title: 'Brag document', html: `<p>Each Friday write two lines: what I shipped, what changed. After a quarter you have evidence for reviews, promotions and negotiation.</p>` },
    { title: 'Quarterly check', html: `<p>Four questions: What did I learn? What did I ship? Who knows my work? What is my next step on the ladder? Take 30 minutes and write the answers.</p>` }
  ],
  deepDive: `<p><b>Expert layer.</b> Skills decay and compound. Fundamentals have long half-lives (algorithms, networking, databases, communication); tools have short ones (frameworks, prompts). Invest more of your time in durable skills than in tools. Practise <i>deliberately</i>: choose something slightly beyond your ability, get feedback, repeat. Teaching is a strong accelerator.</p>
<p><b>AI-era risks and openings.</b> Risks: skill atrophy from over-reliance, shallow understanding, and tasks (boilerplate, simple glue) shrinking. Openings: faster prototyping, bigger scope per person, more focus on system design, reliability, evaluation of AI output, security and product sense. Roles around building and evaluating AI systems are growing, but do not chase hype; follow genuine problems.</p>
<p><b>Resilience.</b> Keep savings, a network, an updated resume and a portfolio. Relationships (mentors, peers, former managers) are the most reliable source of opportunity. Protect health: a sustainable pace beats a sprint.</p>`,
  aiEra: `<p><b>What AI changes:</b> learning is cheaper: instant explanations, practice questions, code reviews, mock interviews. The risk is the illusion of knowing; you read the answer but cannot reproduce it.</p>
<p><b>Use AI as a partner:</b> <code>Quiz me on this topic, one question at a time, and do not give hints until I try.</code> Ask it to critique your design, not write it. Keep a log of its mistakes.</p>
<p><b>Where AI goes wrong:</b> outdated or wrong facts delivered confidently, shallow practice, and answers you cannot defend in an interview.</p>
<p><b>What you must still own:</b> your goals, your fundamentals, honest self-testing, and the human parts: trust, communication, ethics, taste. People who combine strong basics with skilled AI use will stand out.</p>`,
  problems: [P({
    title: 'Build a learning plan around AI', level: 'Easy', tags: ['learning', 'AI'],
    s: 'An interviewer asks: &ldquo;With AI writing so much code, how do you stay relevant?&rdquo;',
    shape: 'name fundamentals, daily AI use with verification, a weekly routine and a concrete recent example.',
    weak: 'I just use AI for everything and it keeps me up to date.', why: 'It shows no judgment, no fundamentals and no learning routine.',
    mcq: { q: 'Which answer shows the strongest signal?', options: ['AI will not affect me', 'I use AI daily, verify output, and keep a weekly learning routine with outputs', 'I avoid AI to keep my skills pure'], answer: 1, explain: 'Interviewers want balanced judgment and a concrete habit.' },
    h1: 'Show you use AI and still own the basics.', h2: 'Give a weekly habit.', h3: 'End with a small real example and a result.',
    a: '<p>&ldquo;I treat AI as a fast junior pair: I use it for drafts, tests and exploring options, and I always review, run and test the result. I protect my fundamentals with a weekly routine: three to four hours on one topic, with a small output such as a demo or a written lesson. Last quarter this caught a caching bug the assistant introduced. I also teach juniors on my team, which keeps my own understanding sharp. I check my direction every quarter with a mentor and update my skills where the work is moving, such as evaluating AI outputs and system design.&rdquo; This shows judgment, habit and evidence.</p>',
    f: ['What would you stop doing by hand?']
  })]
});
// ---------------- practice (Easy -> Hard) ----------------
practice.push(P({
  title: 'Recruiter asks for your current salary', level: 'Easy', tags: ['salary history', 'recruiter'],
  s: 'On the first call, a recruiter asks: &ldquo;What are you making right now?&rdquo;',
  shape: 'politely redirect to the role&rsquo;s range, share your expectation as a researched range if asked again, never lie.',
  weak: 'Uh, I make 120k, but I want a lot more.', why: 'It anchors the offer to your old pay and gives away leverage before you know the range.',
  mcq: { q: 'Best reply?', options: ['Give your exact pay and ask for double', 'Redirect to the range for the role', 'Refuse and end the call'], answer: 1, explain: 'Redirect politely; share a range for the new role if pressed.' },
  h1: 'Your old pay is not the value of the new job.', h2: 'Ask for the range first.', h3: 'If pressed, give a researched range based on level and market.',
  a: '<p>&ldquo;I would like to focus on the value of this role rather than my current pay. Could you share the range for this level? If it helps, based on my research and experience I am looking for something in the 165 to 185k range, depending on the whole package.&rdquo; Keep your tone friendly and do not lie. If the law or norms in your location restrict the question, you can say so politely. If the recruiter insists, choose between giving a range and politely stepping out of the process.</p>',
  f: ['What if they say it is required for their system?']
}));
practice.push(P({
  title: 'Respond to a verbal offer on the phone', level: 'Easy', tags: ['offer', 'enthusiasm'],
  s: 'The hiring manager calls with good news and says the base salary and a start date. You feel excited and nervous.',
  shape: 'thank warmly, show enthusiasm, ask for the written offer, give a reply date.',
  weak: 'Yes, I accept right now!', why: 'You skipped details like equity, level and benefits, and gave up any room to negotiate.',
  mcq: { q: 'What do you say at the end of the call?', options: ['I accept', 'Thank you, please send it in writing and I will reply by Thursday', 'I need much more'], answer: 1, explain: 'Warm gratitude plus a clear timeline.' },
  h1: 'Enthusiasm is free.', h2: 'Decisions are made with documents.', h3: 'Give a reply date within a few days.',
  a: '<p>&ldquo;Thank you so much, this is wonderful news and I am really excited about the team. Could you send the written offer with the full details: base, bonus, equity and vesting, sign-on, level and benefits? I would like to review it carefully and will reply by Thursday afternoon.&rdquo; This keeps relationships warm, avoids a rushed yes, and gives you time to run your four-year table and prepare a counter if needed.</p>',
  f: ['What if they pressure you to accept now?']
}));
practice.push(P({
  title: 'Understand the vesting terms', level: 'Easy', tags: ['equity', 'vesting'],
  s: 'Your offer letter says &ldquo;200k RSUs vesting over four years with a one-year cliff.&rdquo; You are not sure what it means.',
  shape: 'ask for the exact yearly schedule, what happens if laid off, and how refreshers work.',
  weak: 'RSUs sound good. 200k is a lot.', why: 'You do not know when you get the money, what the cliff risk is, or what the shares will be worth.',
  mcq: { q: 'With a one-year cliff, if you leave at month 10 you receive…', options: ['Most of the grant', 'Nothing from the grant', 'A third'], answer: 1, explain: 'Cliff = nothing until month 12.' },
  h1: 'Cliff = waiting period.', h2: 'Ask for the schedule in percentages.', h3: 'Ask about acceleration and refreshers too.',
  a: '<p>&ldquo;Could you confirm the exact vesting schedule? I understand a one-year cliff, then monthly. Is the first-year amount 25%? What happens to unvested shares if my role is eliminated? How do refreshers work, and what is typical for engineers at this level after year two?&rdquo; I would also ask what the current share price is and how the grant value is calculated, so I can model the four-year value with a cautious growth assumption. Understanding terms makes comparison and negotiation much stronger.</p>',
  f: ['What is acceleration?']
}));
practice.push(P({
  title: 'Ask for more equity', level: 'Medium', tags: ['equity', 'negotiation'],
  s: 'The base is fair but the equity grant looks small compared to your other process. You want to ask for a bigger grant without sounding greedy.',
  shape: 'show enthusiasm, give a reason, name a figure, propose an alternative such as a sign-on.',
  weak: 'Give me more stock or I walk.', why: 'It is a threat without a reason and creates conflict.',
  mcq: { q: 'Which phrasing is better?', options: ['The grant must be doubled', 'Could we increase the grant from 200k to 260k given my experience with X?', 'Everyone else pays more'], answer: 1, explain: 'A specific ask with a reason is easy to evaluate.' },
  h1: 'Tie the ask to value you bring.', h2: 'Use a number.', h3: 'Offer a flexible alternative.',
  a: '<p>&ldquo;I am very excited about the role. The base works for me; the equity grant is the piece I would like to look at. Given my experience leading migrations like the ones you described, could we increase the grant from 200k to 260k, or smooth the vesting so a larger share arrives in the first two years? If the grant is fixed, a sign-on to bridge the difference would also work.&rdquo; Then pause. A calm specific ask with a trade makes it easy for the recruiter to take it to the compensation committee.</p>',
  f: ['What if they say equity bands are fixed by level?']
}));
practice.push(P({
  title: 'Compare two offers with different vesting', level: 'Medium', tags: ['total comp', 'vesting'],
  s: 'Offer P: base 170k, 100k equity vesting 25/25/25/25, no sign-on. Offer Q: base 155k, 240k equity vesting 5/15/40/40, 30k sign-on. You want to decide.',
  shape: 'make a four-year table, compute at 0 percent growth and at year 2, then decide based on stay plan.',
  weak: 'Q has more equity so Q.', why: 'It ignores base differences, sign-on and back-loading.',
  mcq: { q: 'What is P&rsquo;s four-year total at 0% growth, assuming a 10% bonus (approx.)?', options: ['About 850k', 'About 1,000k', 'About 600k'], answer: 0, explain: 'P: (170 + 17) x 4 = 748 plus 100 equity = 848. Compute your own with bonus 10%; the point is to run the numbers.' },
  h1: 'Write yearly rows.', h2: 'Compute first-2-year totals.', h3: 'State your assumption about staying.',
  a: '<p>With a 10 percent bonus and 0 percent growth: P pays 187 + 25 = 212 each year, 848k over four years. Q: year 1 = 155 + 15.5 + 30 + 12 = 212.5, year 2 = 170.5 + 36 = 206.5, years 3 and 4 = 170.5 + 96 = 266.5 each, total about 952k. After two years P is ahead (424k vs 419k, nearly equal). Q wins long term by about 100k but needs three-plus years. I would choose Q if I plan to stay, and ask Q for a flatter schedule. I would state my assumptions clearly and check benefits and team before deciding.</p>',
  f: ['What if the stock falls 30 percent?']
}));
practice.push(P({
  title: 'Respond to a lowball offer', level: 'Medium', tags: ['lowball', 'anchoring'],
  s: 'The offer is 15% below the range you researched. The recruiter says the band is standard.',
  shape: 'thank, cite data, ask for a number, offer to trade other levers.',
  weak: 'This is insulting. Please improve it.', why: 'It is emotional and gives no number or data, so there is nothing for the recruiter to act on.',
  mcq: { q: 'What anchors best?', options: ['My rent is high', 'Data for similar roles at this level', 'A friend earns more'], answer: 1, explain: 'Market data is neutral and credible.' },
  h1: 'Do not argue about feelings.', h2: 'Use ranges from several sources.', h3: 'Offer total-comp flexibility.',
  a: '<p>&ldquo;Thank you for the offer, I am excited about the team. The base is below what I see for senior roles in this market, around 165 to 185k. Could we move to 172k? If base is capped, I would consider equity or a sign-on to close the gap.&rdquo; Then stay silent and listen. If the answer is no on everything, decide on the whole package: growth, team and stability may still make it worth it, but I would say so honestly.</p>',
  f: ['How do you know your data is good?']
}));
practice.push(P({
  title: 'Handle an exploding offer', level: 'Medium', tags: ['deadline', 'ethics'],
  s: 'You have 24 hours to accept. Another company interviews you in 3 days.',
  shape: 'ask for an extension honestly, inform the second company, keep a fallback.',
  weak: 'I will say I have another offer in hand.', why: 'If it is false you risk your reputation.',
  mcq: { q: 'Which is ethical?', options: ['Lie about an offer', 'Ask for more time and share your real timeline', 'Sign and keep interviewing'], answer: 1, explain: 'Truthful requests keep trust.' },
  h1: 'Ask early.', h2: 'Be truthful.', h3: 'Prepare a decision rule.',
  a: '<p>&ldquo;Thank you, I am excited about this offer. I am in a final stage with another company on Friday and want to make a respectful decision. Could I confirm by next Monday?&rdquo; To the second company: &ldquo;I have an offer with a short deadline and you are a top choice; can we speed up the final step?&rdquo; If I get no extension, I decide using my matrix, and if the first offer is not clearly acceptable I let it go rather than sign something I will not honour.</p>',
  f: ['What if both say no?']
}));
practice.push(P({
  title: 'Choose between IC and manager track', level: 'Medium', tags: ['career ladder', 'management'],
  s: 'You are offered a first manager role. You are not sure it fits.',
  shape: 'reflect on enjoyment, propose a trial and a return path, ask for training.',
  weak: 'I will do whatever pays more.', why: 'It ignores fit and long-term growth.',
  mcq: { q: 'Which is a good safeguard?', options: ['A written 12-month trial with a return path', 'No plan', 'Quitting immediately'], answer: 0, explain: 'A trial reduces risk.' },
  h1: 'Think about your best days.', h2: 'Ask what support exists.', h3: 'Define success at 6 and 12 months.',
  a: '<p>&ldquo;Thank you, I am excited. I would like to try management for a year with manager training and a clear route back to Senior or Staff IC if it is not a fit. Can we define success at 6 and 12 months and agree how my current responsibilities are handed over?&rdquo; I would also talk to two managers about the real work, such as feedback, hiring and conflict, and note how I feel after a month. If I miss deep technical work, I will say so early and use the return path without guilt.</p>',
  f: ['What would make you stay IC?']
}));
practice.push(P({
  title: 'Counter-offer from your current employer', level: 'Hard', tags: ['counter-offer', 'retention'],
  s: 'You resign and your manager offers a 10% raise and a vague promotion promise.',
  shape: 'thank, test causes, ask for specifics in writing, decide on growth.',
  weak: 'Great, I will stay and cancel the other job.', why: 'The raise may fix pay but not the reason you left; you also harm the new employer.',
  mcq: { q: 'What matters most?', options: ['Whether the real reasons for leaving are fixed in writing', 'The size of the cake at the farewell', 'The manager&rsquo;s mood'], answer: 0, explain: 'Fix causes, not symptoms.' },
  h1: 'Why did you look?', h2: 'Ask for written scope, level and timeline.', h3: 'Compare four-year growth.',
  a: '<p>&ldquo;Thank you, this means a lot. I started looking because of limited scope and growth. Could we write down the promotion timeline, the scope of my next project and the review date? I will compare it with the other offer by Friday.&rdquo; If the answers are specific and written, I might stay; if they are vague, I take the new role and leave on good terms. In both cases I thank the manager, hand over well, and keep relationships positive.</p>',
  f: ['What if they ask you not to tell the team?']
}));
practice.push(P({
  title: 'Negotiate level, not only base', level: 'Hard', tags: ['level', 'negotiation'],
  s: 'The offer is L4 but your experience and the interviews suggest L5 scope.',
  shape: 'show evidence of L5 scope, ask for a level review, and tie it to compensation.',
  weak: 'I want L5 because I deserve it.', why: 'It has no evidence and sounds entitled.',
  mcq: { q: 'Best evidence?', options: ['Years of experience only', 'Examples of owning systems and leading projects at L5 scope', 'A friend with L5'], answer: 1, explain: 'Scope and impact define level.' },
  h1: 'Level controls the pay band.', h2: 'Bring two or three projects.', h3: 'Ask for the leveling guide.',
  a: '<p>&ldquo;I am excited about the role. The interview scope and my last two years, where I led a payments migration and mentored four engineers, feel closer to L5 than L4. Could we review the leveling expectations together? If L5 is possible, the compensation band would also match what I expected.&rdquo; If they hold at L4, I would ask for a written 6-month promotion review with clear criteria and a sign-on that reflects the gap. Level is worth more than a small base increase because it shapes every future raise.</p>',
  f: ['What if they say the loop did not demonstrate L5?']
}));
practice.push(P({
  title: 'Negotiate a startup offer with options', level: 'Hard', tags: ['options', 'startup'],
  s: 'A startup offers 140k base and 80,000 options with strike 2.00. You do not know the total share count.',
  shape: 'ask for ownership percent, latest valuation, preference terms, exercise window, and model a low case.',
  weak: 'Options sound big, 80,000 of them!', why: 'The number of options means nothing without the share count and strike.',
  mcq: { q: 'Which fact matters most?', options: ['Percent of the company and latest valuation', 'Office snacks', 'Founder&rsquo;s title'], answer: 0, explain: 'You need ownership and value to price options.' },
  h1: 'Options are a right to buy.', h2: 'Ask total shares outstanding.', h3: 'Treat your base case as near zero.',
  a: '<p>I would ask: &ldquo;What percentage of the company do the 80,000 options represent, what was the latest 409A or valuation, what are the preference terms, how long is the post-departure exercise window, and is there early-exercise or refresh policy?&rdquo; Then I model: if ownership is 0.05 percent and the company exits at a modest value, how much is it after strike and taxes? I treat equity as a lottery ticket in the base case and compare cash compensation to a stable alternative. I might ask for a higher base or a shorter exercise window instead of more options. Seek professional tax advice for the country involved.</p>',
  f: ['What if the company runs out of cash?']
}));
practice.push(P({
  title: 'Negotiate after a layoff-season offer', level: 'Hard', tags: ['market', 'leverage'],
  s: 'The market is tough and you have a single offer, slightly below target. You also have a gap on your resume.',
  shape: 'be grateful, make a modest specific ask, trade flexibility, and avoid bluffing.',
  weak: 'I have other offers so give me 20% more.', why: 'A bluff is risky when you have only one offer and it can sink the deal.',
  mcq: { q: 'Which approach is wise with low leverage?', options: ['Bluff', 'Small specific ask plus flexible trades', 'Accept silently'], answer: 1, explain: 'Modest, honest asks cost little and often succeed.' },
  h1: 'Leverage is low, goodwill is not.', h2: 'Ask for non-cash items too.', h3: 'Be ready to accept.',
  a: '<p>&ldquo;I am genuinely excited about this role and ready to join. Is there flexibility to move the base up by about 5 percent, or to add a six-month review with a raise path? If not, I am happy to accept as it stands.&rdquo; I stay honest, ask for modest improvements such as a sign-on, a review date or a learning budget, and do not claim other offers. If the answer is no, I accept gracefully; strong early performance and a documented review are the best route to higher pay later.</p>',
  f: ['Would you accept if they refuse everything?']
}));
practice.push(P({
  title: 'Plan your next 3 years with AI in mind', level: 'Hard', tags: ['career', 'AI', 'learning'],
  s: 'You are a mid-level engineer. Your manager asks for your three-year plan and how AI will change your role.',
  shape: 'name fundamentals, an AI workflow, a growth target on the ladder, and measurable milestones.',
  weak: 'I will learn whatever is trending.', why: 'It has no direction, no measures, and no link to the company.',
  mcq: { q: 'Which plan is strongest?', options: ['Chase every new tool', 'Fundamentals + AI workflow + a ladder target with milestones', 'Wait and see'], answer: 1, explain: 'Direction plus measurement beats trend chasing.' },
  h1: 'Aim at the next level.', h2: 'Add AI skills to existing strengths.', h3: 'Define quarterly checkpoints.',
  a: '<p>&ldquo;Year 1: reach full ownership of one system and build a reliable AI-assisted workflow with tests and review. Year 2: lead a cross-team project and mentor two juniors, aiming at Senior. Year 3: choose between Staff and management based on what I enjoy. Every quarter I will review my brag document with you, finish one learning cycle (read, build, review, share), and measure outcomes such as incident reduction and delivery speed. I expect AI to take routine coding, so I will invest in design, evaluation of AI output, communication and domain knowledge.&rdquo;</p>',
  f: ['What would you do if your role is reduced by automation?']
}));
// ---------------- quiz ----------------
function Q(q, options, answer, explain) { quiz.push({ q: q, options: options, answer: answer, explain: explain }); }
Q('Which part of an offer repeats every year?', ['Sign-on bonus', 'Base salary', 'Relocation payment'], 1, 'Base repeats; sign-on and relocation are typically one-time.');
Q('A one-year cliff means…', ['25% vests monthly from day one', 'Nothing vests until month 12', 'Everything vests at once on day one'], 1, 'Before the cliff you own none of the grant.');
Q('Which vesting shape pays most to someone leaving after year 2?', ['5/15/40/40', '25/25/25/25', 'They are identical'], 1, 'Even gives 50% by year 2; back-loaded gives 20%.');
Q('RSUs differ from options because…', ['RSUs need you to buy at a strike price', 'RSUs deliver shares without a purchase', 'Options always beat RSUs'], 1, 'RSUs are free shares on vesting; options require paying the strike.');
Q('Which is the best first reply to a verbal offer?', ['Accept immediately', 'Thank them and ask for the written breakdown', 'Counter with a huge number'], 1, 'You need the details and time to compare.');
Q('If base is capped, a sensible next ask is…', ['Quit the process', 'Equity, sign-on, level or a review date', 'Repeat the same ask louder'], 1, 'Negotiate total compensation across several levers.');
Q('A recruiter asks your current salary. A polite move is…', ['Lie to look better', 'Redirect to the role&rsquo;s range', 'Hang up'], 1, 'Redirecting keeps honesty and leverage.');
Q('For an exploding offer you should…', ['Invent a competing offer', 'Ask for a short extension and give a real date', 'Ignore it'], 1, 'Truthful timeline requests are normal.');
Q('Before accepting a counter-offer you should check…', ['Whether the reasons you wanted to leave are fixed in writing', 'How big the raise is only', 'Who sits near you'], 0, 'If causes remain, the move is only delayed.');
Q('Which factor most directly sets future pay bands at a company?', ['Your desk', 'Your level on the ladder', 'The recruiter&rsquo;s name'], 1, 'Level controls the band, so negotiate level early.');
Q('The best way to use AI in a learning plan is…', ['Copy answers without checking', 'Use it as a tutor, then verify and rebuild things yourself', 'Avoid it completely'], 1, 'Verification and rebuilding keep real skill.');
Q('Offer numbers in this module are…', ['Real market data', 'Illustrative with fictional companies; norms vary', 'Legal advice'], 1, 'They are teaching examples only.');

// ---------------- interview ----------------
function I(q, level, a, f) { interview.push({ q: q, level: level, a: '<p>' + a + '</p>', followUps: f }); }
I('How do you evaluate a job offer beyond the salary?', 'B', 'I compare total compensation over four years (base, bonus, equity by vesting year, sign-on, benefits), then the non-money factors: growth, manager and team quality, scope, stability, flexibility and learning. I score them with weights that reflect my priorities, and I check that the level and key terms are in writing. The number alone never tells me how I will grow or whether I will stay.', ['Which factor do you weigh most, and why?', 'How do you check team quality?']);
I('Explain the difference between RSUs and stock options.', 'B', 'RSUs are promised shares delivered as they vest, with no purchase needed, so they keep some value even if the price falls. Options are the right to buy shares at a fixed strike price; they gain value only when the stock is above the strike and usually require cash to exercise. Public companies typically give RSUs; startups often give options, which carry more risk and tax complexity that varies by country.', ['What is a strike price?', 'What is a post-termination exercise window?']);
I('What is a vesting cliff and why does back-loaded vesting matter?', 'I', 'A cliff is an initial period, often 12 months, during which nothing vests; after it a chunk vests at once. Back-loaded vesting such as 5/15/40/40 delivers most value in the last two years, so leaving early forfeits much more than with even vesting. It is a retention tool. I compare offers by the value vested at the time I realistically might leave, and I ask for flatter schedules or refreshers.', ['How would you ask a company to change the schedule?', 'What about acceleration on layoff?']);
I('How do you respond to a lowball offer?', 'I', 'I thank them, express enthusiasm, then anchor with data for the role, level and location and make one specific ask, such as a base closer to a stated number. If base is fixed I move to equity, sign-on, level or a review date. I stay silent after the ask, and I never bluff. If nothing moves, I decide on the whole package and long-term growth.', ['What if they say the band is fixed?', 'How do you pick your number?']);
I('A recruiter asks for your current salary. What do you do?', 'B', 'I redirect politely to the value of the role and ask for the range for that level. If pressed I share a researched target range rather than my past pay, and I do not lie. In some places the law restricts the question, so I know the local rule. The aim is to avoid anchoring the new offer to an old, possibly low number.', ['What if they refuse to continue?', 'Is it ever fine to share it?']);
I('How do you handle an exploding offer?', 'I', 'I ask calmly for a short extension and give a real date, explain that I want to decide carefully, and tell other companies about the timeline so they can speed up. I do not invent offers. If they refuse an extension, I decide using my criteria and fallback rather than panic. Pressure tactics also tell me something about the culture.', ['What if the extension is refused?', 'How do you tell the other company?']);
I('Your current employer counter-offers when you resign. What now?', 'A', 'I thank my manager, then ask what is different now and whether the reasons I wanted to leave are fixed with specifics in writing: scope, level, timeline. A raise alone rarely fixes growth or manager problems, and trust can change after a resignation. I compare four-year growth across both paths and decide calmly. Whatever I choose, I stay kind and professional.', ['Why was it not offered before?', 'How do you tell the new company?']);
I('How do you decide between IC and manager tracks?', 'A', 'I think about the work I enjoy most on good days: design and deep problems, or coaching, planning and handling conflict. I talk to people in both roles, read both ladders, and propose a time-boxed manager trial with training and a written way back. Either path can reach high levels, and switching is possible. I choose by fit and energy, not only title or money.', ['What would make you go back to IC?', 'What skills change between tracks?']);
I('How do you negotiate level?', 'A', 'I bring evidence of scope matching the higher level, such as systems I owned, cross-team influence and mentoring, and ask to review the leveling guide together. Level controls the pay band and future promotions, so it often matters more than a small base difference. If they hold the level, I ask for a written review in six months with clear criteria.', ['What if you lack evidence?', 'How do levels compare across companies?']);
I('How do you stay relevant as AI changes engineering?', 'I', 'I keep strong fundamentals so I can judge AI output, use AI daily on real work with careful verification, and follow a weekly learning routine with outputs like demos or notes. I move toward higher-value skills: design, reliability, evaluation, communication and product sense. I track my impact in a brag document and review my direction with a mentor every quarter.', ['Give an example where AI was wrong.', 'What will you stop doing by hand?']);
I('How do you build a continuous learning plan?', 'I', 'I set a small repeatable rhythm, for example three to five hours a week, in cycles of read, build, review and share. I mix durable fundamentals with tools, ask for feedback, teach others and keep a log of lessons. Every quarter I check progress against the ladder and the market so my learning has direction rather than drifting with trends.', ['How do you avoid burnout?', 'How do you measure progress?']);
I('Walk me through comparing two offers with different vesting schedules.', 'E', 'I create a four-row table per offer with base, expected bonus, sign-on in year 1 and equity vesting each year with an assumed stock growth, usually 0 percent as base case plus a cautious scenario. I compare totals at year 2 and year 4, compute break-even stay length and growth, then adjust for risk of private equity and add non-money factors. Finally I use the gap to negotiate, for example asking the back-loaded offer for a flatter schedule.', ['What growth rate do you assume?', 'How do you treat private-company equity?']);
I('How do you negotiate ethically when you have multiple offers?', 'E', 'I state my real timeline, keep each company informed, never exaggerate or invent offers, and respect confidentiality. I use a decision matrix with weights so I choose by my priorities. I ask for extensions rather than pressure, and I keep my promises once I accept. Reputation lasts longer than any single negotiation.', ['What if you already accepted and a better offer arrives?', 'How much detail about the other offer do you share?']);

registerModule({
  id: 'beh06',
  title: 'Offers, Negotiation & Career Growth in the AI Era',
  intro: `<p>You passed the interviews. Now comes a different skill: reading an offer, comparing it fairly over four years, negotiating politely, handling deadlines and counter-offers, choosing a career path, and staying valuable as AI changes the work. This module teaches simple methods, scripts you can adapt, and two runnable Python tools. All numbers and companies are <b>fictional examples</b>; pay norms and rules differ by country and company, so check your own situation and consult professionals for tax and legal questions.</p>`,
  goals: ['Break an offer into base, bonus, equity, sign-on and benefits and compare two offers year by year over four years', 'Explain RSUs vs options, vesting schedules, cliffs, back-loaded vesting and refreshers', 'Negotiate politely with enthusiasm, data and total compensation, and get the result in writing', 'Handle multiple offers, exploding deadlines and counter-offers ethically', 'Choose between IC and manager tracks and plan continuous learning in the AI era'],
  prereqs: `Behavioral modules 1 to 5 (especially Senior &amp; Staff-Level Interviews). No coding needed; the Python snippets use only the standard library.`,
  hours: 8,
  topics: topics, practice: practice, quiz: quiz, interview: interview
});
})();
