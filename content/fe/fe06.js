(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* Shared helpers for the visualizers in this module. */
  function hex2rgb(h) {
    h = String(h).trim().replace('#', '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error('Use colours like #767676 or #fff');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function lin(v8) { var c = v8 / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function lum(rgb) { return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]); }
  function r4(x) { return Math.round(x * 10000) / 10000; }
  function r2(x) { return Math.round(x * 100) / 100; }

  /* =====================================================================
     TOPIC 1 — Why accessibility matters + WCAG basics
     ===================================================================== */
  topics.push({
    title: 'Why Accessibility Matters & WCAG Basics (POUR, A / AA / AAA)',
    analogy: `<p>Think of a building with <b>only a staircase</b>. It works fine for most people, but not for someone on crutches, a parent with a pram, or a delivery person with a heavy trolley. Add a ramp and suddenly <b>everyone</b> uses it. A website is the same: if it only works with a mouse, good eyesight and a fast hand, you built a staircase. <b>Accessibility (a11y)</b> is the ramp, the lift and the clear signs.</p>
      <p>The short name "a11y" means: <b>a</b>, then 11 letters, then <b>y</b>.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> Accessibility means people with different abilities can <b>perceive, understand, navigate and use</b> your page. That includes blind users (screen readers), low-vision users (zoom, high contrast), deaf users (captions), people who cannot use a mouse (keyboard, switch, voice), people with ADHD or dyslexia (clear layout, calm motion) and many more.</p>
      <p>It is <b>not</b> a small group. About 1 in 6 people worldwide lives with a significant disability. And everyone is sometimes limited: a broken arm (one hand), bright sunlight on a phone (low contrast), a noisy train (no sound), a new baby in one arm. Designers call these <b>permanent, temporary and situational</b> limits.</p>
      ${H.table(['Kind', 'Permanent', 'Temporary', 'Situational'], [
        ['Touch / arms', 'One arm', 'Broken wrist', 'Holding a baby'],
        ['Seeing', 'Blind', 'Eye dilation', 'Glare on a phone in the sun'],
        ['Hearing', 'Deaf', 'Ear infection', 'Loud bar, no headphones'],
        ['Thinking / focus', 'ADHD, dyslexia', 'Concussion, no sleep', 'Distracted, in a hurry']
      ])}
      <p><b>The rulebook: WCAG.</b> The <b>Web Content Accessibility Guidelines</b> (made by the W3C) are the world standard. Current version: <b>WCAG 2.2</b> (2023). Every rule is called a <b>Success Criterion (SC)</b>, e.g. "1.4.3 Contrast (Minimum)". Rules are grouped under four principles, easy to remember as <b>POUR</b>:</p>
      ${H.table(['Letter', 'Principle', 'In one line', 'Example SC'], [
        ['<b>P</b>', 'Perceivable', 'Users can sense the content (see, hear, or read it via assistive tech)', '1.1.1 alt text · 1.4.3 contrast'],
        ['<b>O</b>', 'Operable', 'Users can control it (keyboard, enough time, no seizures)', '2.1.1 keyboard · 2.4.7 focus visible'],
        ['<b>U</b>', 'Understandable', 'Content and behaviour are clear and predictable', '3.1.1 page language · 3.3.1 errors'],
        ['<b>R</b>', 'Robust', 'Works with browsers and assistive tech, now and later', '4.1.2 name, role, value']
      ])}
      <p>Each SC has a <b>level</b>: ${H.c('g', 'A')} (must-have basics), ${H.c('b', 'AA')} (the normal legal target for almost every country and company), ${H.c('p', 'AAA')} (extra, not expected for a whole site). When a law or a client says "make it accessible", they nearly always mean <b>WCAG 2.2 AA</b>.</p>
      <p>Why you, a frontend engineer, care: <b>you</b> write the HTML that decides if a screen reader can read the page. A designer cannot fix a div that is not focusable. And lawsuits and procurement rules (US ADA and Section 508, the EU European Accessibility Act enforced since June 2025, EN 301 549) now ask for proof.</p>`,
    clues: [
      '"Make the app accessible" / "WCAG AA compliant" → target WCAG 2.2 AA, test with keyboard + a screen reader + automated checks',
      '"Users who cannot use a mouse" / "keyboard only" / "switch device" → Operable (2.1.1), focus order, visible focus, no keyboard traps',
      '"Colour-blind users" / "low vision" / "sunlight" → contrast 4.5:1, never colour alone to carry meaning (1.4.1)',
      '"Screen reader reads wrong thing" / "unlabelled button" → Robust: accessible name, role, value (4.1.2)',
      'Interviewer asks "where do you start?" → semantic HTML first, then keyboard, then contrast, then ARIA only for gaps'
    ],
    code: [
      { lang: 'js', run: true, title: 'Group failed WCAG checks by POUR principle (runnable)', code: `// The FIRST digit of a WCAG success-criterion number tells you its principle:
// 1.x = Perceivable, 2.x = Operable, 3.x = Understandable, 4.x = Robust
const PRINCIPLE = { 1: 'Perceivable', 2: 'Operable', 3: 'Understandable', 4: 'Robust' };

const failures = [
  { sc: '1.1.1', what: 'Hero image has no alt text' },
  { sc: '1.4.3', what: 'Grey body text is only 2.8:1' },
  { sc: '2.1.1', what: 'Dropdown menu opens on hover only' },
  { sc: '3.3.2', what: 'Email field has no label' },
  { sc: '4.1.2', what: 'Div-button has no role' },
  { sc: '2.4.7', what: 'outline: none on all links' }
];

const report = {};
for (const f of failures) {
  const p = PRINCIPLE[f.sc.split('.')[0]];   // "1.4.3" -> "1" -> "Perceivable"
  (report[p] = report[p] || []).push(f.sc + '  ' + f.what);
}
for (const [principle, list] of Object.entries(report)) {
  console.log(principle + ' (' + list.length + ')');
  list.forEach((line) => console.log('   - ' + line));
}` },
      { lang: 'html', title: 'The 5-second a11y starter page', code: `<!doctype html>
<!-- 3.1.1: tell screen readers which language to pronounce -->
<html lang="en">
<head>
  <meta charset="utf-8">
  <!-- 1.4.4 / 1.4.10: never block zoom (no user-scalable=no, no maximum-scale=1) -->
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <!-- 2.4.2: a page title that says what this page is -->
  <title>Order shoes - Sole Shop</title>
</head>
<body>
  <a class="skip-link" href="#main">Skip to main content</a>
  <header><nav aria-label="Primary">...</nav></header>
  <main id="main">
    <h1>Order shoes</h1>
  </main>
</body>
</html>` }
    ],
    codeTitle: ['Group failures by principle', 'Starter page'],
    viz: {
      title: 'Auditing a page against WCAG success criteria (POUR)',
      input: 'alt,captions,contrast,zoom,keyboard,focus,skip,lang,label,error,name,status',
      inputLabel: 'Checks to run (comma separated: alt captions contrast zoom keyboard focus skip lang label error name status)',
      gen: function (input) {
        var DB = {
          alt: ['P', '1.1.1', 'Hero image has alt text', false, 'A'],
          captions: ['P', '1.2.2', 'Promo video has captions', true, 'A'],
          contrast: ['P', '1.4.3', 'Body text contrast at least 4.5:1', false, 'AA'],
          zoom: ['P', '1.4.4', 'Page works at 200% zoom', true, 'AA'],
          keyboard: ['O', '2.1.1', 'Menu works with keyboard only', false, 'A'],
          focus: ['O', '2.4.7', 'Keyboard focus ring is visible', true, 'AA'],
          skip: ['O', '2.4.1', 'Skip-to-content link exists', false, 'A'],
          lang: ['U', '3.1.1', 'html lang attribute is set', true, 'A'],
          label: ['U', '3.3.2', 'Every input has a label', false, 'A'],
          error: ['U', '3.3.1', 'Errors are described in text', true, 'A'],
          name: ['R', '4.1.2', 'Custom widgets expose name + role', false, 'A'],
          status: ['R', '4.1.3', 'Status toast is announced', true, 'AA']
        };
        var names = { P: 'Perceivable', O: 'Operable', U: 'Understandable', R: 'Robust' };
        var keys = String(input).split(/[\s,]+/).filter(Boolean);
        if (!keys.length) throw new Error('List at least one check, e.g. alt,contrast,keyboard');
        if (keys.length > 12) throw new Error('At most 12 checks');
        keys.forEach(function (k) { if (!DB[k]) throw new Error('Unknown check "' + k + '". Use: ' + Object.keys(DB).join(' ')); });
        var frames = [], rows = [], hl = {}, tally = { P: 0, O: 0, U: 0, R: 0 }, fails = 0;
        frames.push({ narr: 'We are auditing a sign-up page. Each check is one <b>success criterion</b> from WCAG 2.2. Green = pass, red = fail. The first digit of the number tells the principle (1 = Perceivable, 2 = Operable, 3 = Understandable, 4 = Robust).', parts: [
          { type: 'table', label: 'Audit results', columns: ['SC', 'Principle', 'Check', 'Level', 'Result'], rows: [] },
          { type: 'vars', label: 'Passes so far', vals: { Perceivable: 0, Operable: 0, Understandable: 0, Robust: 0 } }
        ] });
        keys.forEach(function (k) {
          var d = DB[k];
          rows.push([d[1], names[d[0]], d[2], d[4], d[3] ? 'PASS' : 'FAIL']);
          hl[rows.length - 1] = d[3] ? 'ok' : 'bad';
          if (d[3]) tally[d[0]]++; else fails++;
          frames.push({ narr: 'Check <b>' + d[1] + '</b> (' + names[d[0]] + ', level ' + d[4] + '): "' + d[2] + '" → ' + (d[3] ? '<span class="c-g">pass</span>.' : '<span class="c-r">fail</span>. A real user is blocked here, so this goes on the bug list.'), parts: [
            { type: 'table', label: 'Audit results', columns: ['SC', 'Principle', 'Check', 'Level', 'Result'], rows: rows.map(function (r) { return r.slice(); }), hl: JSON.parse(JSON.stringify(hl)) },
            { type: 'vars', label: 'Passes so far', vals: { Perceivable: tally.P, Operable: tally.O, Understandable: tally.U, Robust: tally.R }, hl: (function () { var o = {}; o[names[d[0]]] = d[3] ? 'ok' : 'bad'; return o; })() }
          ] });
        });
        frames.push({ narr: 'Audit done: <b>' + (keys.length - fails) + ' passed, ' + fails + ' failed</b>. For an AA claim, <b>every</b> A and AA criterion must pass, so ' + (fails ? 'this page is <span class="c-r">not compliant yet</span>. Fix the red rows, then re-test.' : 'this set of checks is <span class="c-g">clean</span>.'), parts: [
          { type: 'table', label: 'Final report', columns: ['SC', 'Principle', 'Check', 'Level', 'Result'], rows: rows, hl: hl },
          { type: 'vars', label: 'Totals', vals: { pass: keys.length - fails, fail: fails, total: keys.length }, hl: { fail: fails ? 'bad' : 'ok', pass: 'ok' } }
        ] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Curb cuts: built for wheelchairs, used by everyone',
        html: `<p>Pavement <b>curb cuts</b> (the little ramps at street corners) were fought for by wheelchair users. Today pram pushers, cyclists, travellers with suitcases and delivery workers use them more than anyone. This is the <b>curb-cut effect</b>.</p>
          <p>The web has the same story: <b>captions</b> were made for deaf users, now most people watch videos muted on a bus. <b>Keyboard shortcuts</b> help power users. <b>Clear contrast</b> helps everyone outdoors. <b>Voice assistants and AI agents</b> read your page through the same structure screen readers use. Accessible markup is just <i>good markup</i>.</p>`
      },
      {
        title: 'Reading a success criterion number',
        html: `<p>Take <b>1.4.3 Contrast (Minimum), level AA</b>. Read it left to right: <code>1</code> = Perceivable, <code>1.4</code> = guideline "Distinguishable" (make it easy to see and hear), <code>1.4.3</code> = the third rule there. You will see these numbers in audit reports, Lighthouse and axe.</p>
          ${H.table(['SC', 'Name', 'Level', 'Short meaning'], [
            ['1.1.1', 'Non-text Content', 'A', 'Images need a text alternative'],
            ['1.4.3', 'Contrast (Minimum)', 'AA', 'Text 4.5:1 (large text 3:1)'],
            ['2.1.1', 'Keyboard', 'A', 'Everything works without a mouse'],
            ['2.4.7', 'Focus Visible', 'AA', 'You can see where focus is'],
            ['2.5.8', 'Target Size (Minimum) <small>new in 2.2</small>', 'AA', 'Click targets at least 24x24 CSS px'],
            ['4.1.2', 'Name, Role, Value', 'A', 'Widgets tell assistive tech what they are']
          ])}`
      },
      {
        title: 'Why "AA" is the usual target',
        html: `<p>${H.c('g', 'Level A')} is the floor: without it some people cannot use the page at all (no keyboard access, no alt text). ${H.c('b', 'Level AA')} adds things that make a page <i>comfortably</i> usable: contrast, resize text, visible focus, consistent navigation. ${H.c('p', 'Level AAA')} is stricter (7:1 contrast, sign-language video) and some AAA rules cannot be met by all content, so the W3C itself says "do not require AAA for whole sites".</p>
          <p>So contracts say <b>"WCAG 2.2 AA"</b>: <i>all</i> Level A rules <b>plus</b> all Level AA rules. In interviews, say "A and AA" together; saying only "AA" is a common slip.</p>`,
        code: { lang: 'js', run: true, code: `// Level pass rule: to claim AA you must pass every A rule AND every AA rule.
const results = [
  { sc: '1.1.1', level: 'A', pass: true },
  { sc: '1.4.3', level: 'AA', pass: false },
  { sc: '2.4.7', level: 'AA', pass: true },
  { sc: '1.4.6', level: 'AAA', pass: false } // AAA is not needed for an AA claim
];
const required = results.filter((r) => r.level === 'A' || r.level === 'AA');
const failed = required.filter((r) => !r.pass).map((r) => r.sc);
console.log(failed.length ? 'Not AA. Fix: ' + failed.join(', ') : 'Meets AA');` }
      }
    ],
    deepDive: `<p><b>🟣 What WCAG 2.2 changed.</b> WCAG 2.2 (October 2023) is backwards compatible with 2.1: a page that meets 2.2 also meets 2.1 and 2.0. It added nine criteria, among them <b>2.4.11 Focus Not Obscured</b> (a sticky header must not hide the focused element), <b>2.5.7 Dragging Movements</b> (every drag needs a click alternative), <b>2.5.8 Target Size (Minimum)</b> (24 by 24 CSS pixels), <b>3.3.7 Redundant Entry</b> (do not make people retype the same data), and <b>3.3.8 Accessible Authentication</b> (no cognitive tests like remembering a password with no paste or password-manager support). It removed <b>4.1.1 Parsing</b> because modern browsers repair broken HTML consistently. WCAG 3.0 is a long-running draft with a different scoring model; it is <i>not</i> something you can be tested against today.</p>
      <p><b>Conformance is per page, and a "process" matters.</b> To claim conformance, whole pages (including every step of a flow like checkout) must pass. A formal write-up is a <b>VPAT / ACR</b> (Accessibility Conformance Report) that big customers ask for. Also, WCAG covers <i>content</i>; browsers and OS (user agents) have their own guideline (UAAG), and authoring tools have ATAG.</p>
      <p><b>What automation can and cannot do.</b> Tools such as <b>axe-core</b>, Lighthouse and WAVE find only a portion of real issues (Deque's own studies say roughly a third to a half of issues by volume). They are great for the "mechanical" rules: missing alt, bad contrast, missing label, invalid ARIA. They cannot tell you if your alt text is <i>good</i>, if the focus order <i>makes sense</i>, or if a custom widget is <i>pleasant</i> to use. So a real process is: lint in the editor (<code>eslint-plugin-jsx-a11y</code>), axe in unit/E2E tests, keyboard pass, screen-reader pass, and real user feedback.</p>
      <p><b>Legal reality (not legal advice).</b> US: ADA lawsuits against websites are filed in the thousands each year, and Section 508 applies to federal agencies. EU: the <b>European Accessibility Act</b> became enforceable on 28 June 2025 for many consumer products and services (e-commerce, banking apps, e-books), pointing to EN 301 549 (which includes WCAG 2.1 AA). Canada (AODA), UK (Equality Act, public sector regulations), India (RPwD Act) have similar rules. Accessibility overlays ("one line of script fixes everything") are widely criticised by disabled users and accessibility experts, and in 2025 the US FTC took action against one vendor for misleading claims. Fix the source HTML instead.</p>`,
    aiEra: `<p><b>🤖 What AI changes.</b> Two big shifts. <b>(1) AI tools generate a lot of your UI</b>, and they often produce "div soup": clickable <code>&lt;div&gt;</code>s, icon buttons with no names, low-contrast greys, modal dialogs without focus handling. If you accept generated code blindly you ship inaccessible UI faster than ever. <b>(2) AI agents now read your page too.</b> Browser agents and tools like Playwright MCP navigate using the <b>accessibility tree</b> (roles and names), not pixels. A button named "Submit order" is easy for an agent to find; an unlabelled icon div is invisible. Good accessibility is now also good "agent experience".</p>
      <p><b>Use AI as a partner:</b> ask <code>Audit this component for WCAG 2.2 AA issues and list each SC number</code>, then <i>verify</i> each claim with axe and a keyboard run. Ask for edge cases: <code>What happens to focus when this modal closes?</code> Draft alt text with a vision model, then edit it.</p>
      <p><b>Where AI goes wrong:</b> it invents ARIA attributes, adds <code>role="button"</code> on top of a real button, writes alt text like "image of a shoe" (not the purpose), claims "this is fully accessible" with no testing, and cannot hear what a screen reader actually says. <b>What you must still own:</b> choosing native elements, the keyboard test, the screen reader test, and the judgement call "does this help a real person do the task?"</p>`,
    problems: [
      {
        title: 'Group WCAG Failures by Principle',
        level: 'Easy', tags: ['wcag', 'pour', 'audit'], companies: ['Deque', 'Microsoft'],
        statement: `<p>An accessibility audit tool returns a list of failures like <code>{ sc: '1.4.3', count: 12 }</code>. Write <code>summarize(failures)</code> that returns an object with the four principle names as keys and the <b>total count</b> of failed instances under each. The first number in the success criterion decides the principle (1 Perceivable, 2 Operable, 3 Understandable, 4 Robust). Unknown prefixes should go into an <code>Other</code> key.</p>`,
        constraints: `0 ≤ failures.length ≤ 10<sup>4</sup>; <code>sc</code> is a string like "2.4.7"; count ≥ 1.`,
        example: `<p>Input: <code>[{sc:'1.4.3',count:12},{sc:'1.1.1',count:3},{sc:'2.1.1',count:2}]</code></p>
          <p>Output: <code>{ Perceivable: 15, Operable: 2, Understandable: 0, Robust: 0 }</code></p>
          <p>${H.c('g', '1.4.3 and 1.1.1 both start with 1')} → Perceivable gets 12 + 3 = 15. ${H.c('b', '2.1.1 starts with 2')} → Operable gets 2.</p>`,
        brute: { why: `<p>A long chain of <code>if (sc.startsWith('1')) ... else if ...</code> works but repeats itself and is easy to break when you add a case. The wasted work is human: the mapping from digit to name is data, not control flow.</p>`, code: `function summarizeBrute(failures) {
  const out = { Perceivable: 0, Operable: 0, Understandable: 0, Robust: 0 };
  for (const f of failures) {
    if (f.sc.startsWith('1')) out.Perceivable += f.count;
    else if (f.sc.startsWith('2')) out.Operable += f.count;
    else if (f.sc.startsWith('3')) out.Understandable += f.count;
    else if (f.sc.startsWith('4')) out.Robust += f.count;
  }
  return out;
}` },
        mcq: { q: 'Which principle does WCAG 4.1.2 "Name, Role, Value" belong to?', options: ['Perceivable', 'Operable', 'Understandable', 'Robust'], answer: 3, explain: 'The first digit 4 means Robust: content must work reliably with browsers and assistive technology.' },
        hints: [
          `<p>Hint 1: you only need the <b>first character</b> of the success criterion, e.g. <code>sc.split('.')[0]</code>.</p>`,
          `<p>Hint 2: keep a lookup table <code>{1:'Perceivable', ...}</code> and a result object that you add counts to.</p>`,
          `<p>Hint 3: recipe: start result with all four keys at 0. For each failure: look up the name; if missing use "Other" (create it on demand); add <code>count</code>. Return result.</p>`
        ],
        solution: {
          approach: `<p>Treat the digit-to-name mapping as <b>data</b> (an object), then do one pass with a running total per key. Creating <code>Other</code> lazily keeps the output clean when there are no unknown codes.</p>`,
          code: { lang: 'js', run: true, code: `const NAMES = { 1: 'Perceivable', 2: 'Operable', 3: 'Understandable', 4: 'Robust' };

function summarize(failures) {
  const out = { Perceivable: 0, Operable: 0, Understandable: 0, Robust: 0 };
  for (const f of failures) {
    const name = NAMES[f.sc.split('.')[0]] || 'Other'; // unknown prefix -> Other
    out[name] = (out[name] || 0) + f.count;
  }
  return out;
}

console.log(summarize([{ sc: '1.4.3', count: 12 }, { sc: '1.1.1', count: 3 }, { sc: '2.1.1', count: 2 }]));
console.log(summarize([{ sc: '9.9.9', count: 1 }]));` },
          dry: { head: ['failure', 'digit', 'principle', 'running total'], rows: [['1.4.3 x12', '1', 'Perceivable', '12'], ['1.1.1 x3', '1', 'Perceivable', '15'], ['2.1.1 x2', '2', 'Operable', '2']] },
          complexity: `<p>Time O(N) for N failures, space O(1) (at most five keys).</p>`,
          followUps: ['Add the WCAG level (A/AA/AAA) as a second grouping', 'Sort principles by worst first']
        }
      }
    ]
  });

  /* =====================================================================
     TOPIC 2 — Semantic HTML first + the accessibility tree
     ===================================================================== */
  topics.push({
    title: 'Semantic HTML First & the Accessibility Tree',
    analogy: `<p>Picture two filing cabinets. In the first, every folder is called "Stuff" and sits in a random drawer. In the second, drawers say "Invoices", "Contracts", "Photos", and each folder is named. A visitor who cannot see the room (a screen-reader user) needs the <b>labels</b> to find anything. <b>Semantic HTML</b> is writing the labels as you build, using the right element for the right job. A pile of <code>&lt;div&gt;</code>s is the "Stuff" cabinet.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> HTML elements are not just boxes; they carry <b>meaning</b>. A <code>&lt;button&gt;</code> means "you can press this". A <code>&lt;nav&gt;</code> means "a group of site links". An <code>&lt;h2&gt;</code> means "a section title, below the h1". Browsers and assistive tech use this meaning <b>for free</b>: no extra code, no ARIA.</p>
      <p>The rule every a11y engineer repeats: <b>use the native element first</b>. A real button already gives you: a role ("button"), keyboard focus (Tab), Enter and Space activation, a disabled state, and form submit behaviour. A <code>&lt;div onclick&gt;</code> gives you none of those.</p>
      ${H.table(['I want...', 'Use', 'Do NOT use'], [
        ['An action (save, open menu)', '&lt;button type="button"&gt;', '&lt;div onclick&gt;, &lt;a href="#"&gt;'],
        ['Go to another page / URL', '&lt;a href="/cart"&gt;', '&lt;button&gt; that sets location'],
        ['Page title', '&lt;h1&gt; (one per page)', '&lt;div class="big"&gt;'],
        ['Group of links', '&lt;nav aria-label="Primary"&gt;', '&lt;div class="menu"&gt;'],
        ['Main content', '&lt;main&gt; (one per page)', '&lt;div id="content"&gt;'],
        ['A list of things', '&lt;ul&gt; / &lt;ol&gt; + &lt;li&gt;', 'Lines separated with &lt;br&gt;'],
        ['Tabular data', '&lt;table&gt; with &lt;th scope&gt;', 'CSS grid of divs'],
        ['Picture with meaning', '&lt;img alt="..."&gt;', 'CSS background-image']
      ])}
      <p><b>🔵 How it really works: the accessibility tree.</b> The browser builds the <b>DOM</b> from your HTML. From the DOM it builds a second, smaller tree: the <b>accessibility tree</b>. Each node has a <b>role</b> (what is it?), a <b>name</b> (what is it called?), a <b>state</b> (checked, expanded, disabled...) and a <b>value</b>. The browser hands this tree to the operating system's accessibility API, and screen readers read <i>that</i>, not your pixels.</p>
      <p>Pure <code>&lt;div&gt;</code> and <code>&lt;span&gt;</code> elements become "generic" nodes that are mostly skipped. So a page made of divs gives a screen reader an almost empty tree: just a pile of text with nothing to jump to. See it in the visualizer below, and in Chrome DevTools: <b>Elements → Accessibility</b> pane.</p>
      <p><b>Landmarks and headings are the "table of contents".</b> Screen-reader users jump by landmark (banner, nav, main, footer) and by heading level. That is why you need exactly one <code>&lt;main&gt;</code>, headings in order (h1 → h2 → h3, never skipping for looks), and a label on a landmark when there are two of the same kind (two navs).</p>`,
    clues: [
      '"Clickable div" / "div with onClick" / "span as button" → replace with &lt;button&gt;; a native element beats role + tabindex + key handlers',
      '"Screen-reader users jump around the page" → landmarks (header, nav, main, footer) and a clean heading outline',
      '"What does the screen reader see?" / "accessibility tree" / "computed role and name" → DevTools Accessibility pane, getByRole in Testing Library',
      '"Link or button?" → goes somewhere (URL) = link; does something on this page = button',
      '"First rule of ARIA" → do not use ARIA if a native HTML element already has the semantics'
    ],
    code: [
      { lang: 'html', title: 'Div soup vs semantic page', code: `<!-- BAD: looks the same, but the accessibility tree is empty -->
<div class="header">
  <div class="menu"><div class="item" onclick="go('/')">Home</div></div>
</div>
<div class="content">
  <div class="title">Shoes</div>
  <div class="btn" onclick="addToCart()">Add to cart</div>
</div>

<!-- GOOD: same look (CSS decides that), full meaning for free -->
<header>
  <nav aria-label="Primary">
    <ul><li><a href="/">Home</a></li></ul>
  </nav>
</header>
<main>
  <h1>Shoes</h1>
  <button type="button">Add to cart</button>
</main>` },
      { lang: 'js', run: true, title: 'Implicit roles: tag name to role (runnable)', code: `// A small version of what the browser does: map a tag to its implicit ARIA role.
function implicitRole(tag, attrs = {}) {
  switch (tag) {
    case 'button': return 'button';
    case 'a': return attrs.href !== undefined ? 'link' : 'generic'; // <a> without href is NOT a link
    case 'nav': return 'navigation';
    case 'main': return 'main';
    case 'header': return 'banner';       // when not inside article/section
    case 'footer': return 'contentinfo';  // when not inside article/section
    case 'ul': case 'ol': return 'list';
    case 'li': return 'listitem';
    case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': return 'heading';
    case 'img': return attrs.alt === '' ? 'presentation' : 'img'; // alt="" hides decoration
    case 'input': return attrs.type === 'checkbox' ? 'checkbox' : 'textbox';
    default: return 'generic';            // div, span: no meaning
  }
}

const page = [['header'], ['nav'], ['a', { href: '/' }], ['a'], ['main'], ['h1'], ['button'], ['div'], ['img', { alt: '' }]];
for (const [tag, attrs] of page) console.log(tag.padEnd(8), '->', implicitRole(tag, attrs));` }
    ],
    codeTitle: ['Div soup vs semantic page', 'Tag → implicit role'],
    viz: {
      title: 'DOM → accessibility tree: div soup vs semantic HTML',
      input: 'semantic',
      inputLabel: 'Markup style: semantic or divs',
      gen: function (input) {
        var mode = String(input).trim().toLowerCase();
        if (mode !== 'semantic' && mode !== 'divs') throw new Error('Type "semantic" or "divs"');
        var sem = mode === 'semantic';
        // level-order binary tree (heap indexing): children of i are 2i+1 and 2i+2
        var full = sem
          ? ['page', 'header', 'main', 'nav', null, 'h1', 'button', 'a Home', 'a Cart', null, null, null, null, null, null]
          : ['body', 'div', 'div', 'div', null, 'div', 'div', 'div', 'div', null, null, null, null, null, null];
        var tags = sem
          ? { 0: 'document "Sole Shop"', 1: 'banner', 2: 'main', 3: 'navigation "Primary"', 5: 'heading 1 "Shoes"', 6: 'button "Add to cart"', 7: 'link "Home"', 8: 'link "Cart"' }
          : { 0: 'document', 1: 'generic', 2: 'generic', 3: 'generic', 5: 'generic', 6: 'generic', 7: 'generic', 8: 'generic' };
        var htmlSrc = sem
          ? '<header>\n  <nav aria-label="Primary">\n    <a href="/">Home</a> <a href="/cart">Cart</a>\n  </nav>\n</header>\n<main>\n  <h1>Shoes</h1>\n  <button>Add to cart</button>\n</main>'
          : '<div>\n  <div class="menu">\n    <span onclick="go(1)">Home</span> <span onclick="go(2)">Cart</span>\n  </div>\n</div>\n<div>\n  <div class="title">Shoes</div>\n  <div class="btn">Add to cart</div>\n</div>';
        function level(n) { return n === 0 ? 0 : Math.floor(Math.log(n + 1) / Math.LN2); }
        function upTo(lv) { return full.map(function (v, i) { return level(i) <= lv ? v : null; }); }
        function hlTo(lv, curLv) { var h = {}; full.forEach(function (v, i) { if (v !== null && level(i) <= lv) h[i] = level(i) === curLv ? 'cur' : 'done'; }); return h; }
        var tg = function (lv) { var t = {}; Object.keys(tags).forEach(function (i) { if (level(+i) <= lv) t[i] = tags[i]; }); return t; };
        var code = { type: 'code', label: 'Your HTML (' + (sem ? 'semantic' : 'div soup') + ')', lang: 'html', code: htmlSrc };
        var frames = [];
        frames.push({ narr: 'We have two ways to write the <b>same looking</b> page. This one is <b>' + (sem ? 'semantic HTML' : 'div soup') + '</b>. The browser will turn the DOM into an accessibility tree: each node gets a <b>role</b> and a <b>name</b>.', parts: [code] });
        frames.push({ narr: 'Level 0: the document root. Every page starts here. The tree is shown with the role and the accessible name of each node as a tag.', parts: [code, { type: 'tree', label: 'Accessibility tree', arr: upTo(0), hl: hlTo(0, 0), tags: tg(0) }] });
        frames.push({ narr: sem
          ? 'Level 1: <code>&lt;header&gt;</code> became a <b>banner</b> landmark and <code>&lt;main&gt;</code> became the <b>main</b> landmark. A screen-reader user can press one key to jump straight to main.'
          : 'Level 1: the two top divs become <b>generic</b>. They have no role and no name, so a screen reader has no landmark to jump to.', parts: [code, { type: 'tree', label: 'Accessibility tree', arr: upTo(1), hl: hlTo(1, 1), tags: tg(1) }] });
        frames.push({ narr: sem
          ? 'Level 2: <code>&lt;nav aria-label="Primary"&gt;</code> is a <b>navigation</b> named "Primary". The h1 is a <b>heading level 1</b>, the button is a <b>button</b> named "Add to cart". All reachable and announced properly.'
          : 'Level 2: still <b>generic</b> everywhere. The "Add to cart" div is just text. It is not focusable, not announced as a button, and Enter or Space does nothing for keyboard users.', parts: [code, { type: 'tree', label: 'Accessibility tree', arr: upTo(2), hl: hlTo(2, 2), tags: tg(2) }] });
        frames.push({ narr: sem
          ? 'Level 3: the two links are <b>link</b> nodes named "Home" and "Cart". Because they are real <code>&lt;a href&gt;</code>, they are in the Tab order and the screen reader can list all links on the page.'
          : 'Level 3: the spans with <code>onclick</code> are <b>generic</b>. A mouse user sees links; a screen reader hears plain text "Home Cart". Keyboard users cannot reach them at all.', parts: [code, { type: 'tree', label: 'Accessibility tree', arr: upTo(3), hl: hlTo(3, 3), tags: tg(3) }] });
        frames.push({ narr: sem
          ? '<span class="c-g">Result:</span> 8 meaningful nodes (3 landmarks, 1 heading, 1 button, 2 links) from the very same visual page. No ARIA needed.'
          : '<span class="c-r">Result:</span> 7 nodes with no role. Only the text exists. To fix this with ARIA you would need role, tabindex, key handlers and a name on every one. Just use the right element instead.', parts: [{ type: 'tree', label: 'Final accessibility tree', arr: full, hl: (function () { var h = {}; full.forEach(function (v, i) { if (v !== null) h[i] = sem ? 'ok' : 'bad'; }); return h; })(), tags: tags }] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Link or button? Ask "does it go somewhere?"',
        html: `<p>A <b>link</b> takes you to a URL (new page, new section, a file). A <b>button</b> performs an action on the current page (open a menu, add to cart, submit a form). Screen readers announce them differently ("link" vs "button"), and users expect different keys: links activate with <kbd>Enter</kbd> only, buttons with <kbd>Enter</kbd> and <kbd>Space</kbd>.</p>
          ${H.table(['Control', 'Right element', 'Why'], [
            ['"Read more" going to /blog/42', '&lt;a href="/blog/42"&gt;', 'Navigates; can open in new tab, be bookmarked'],
            ['"Open menu"', '&lt;button aria-expanded="false"&gt;', 'Toggles UI on this page'],
            ['"Delete item"', '&lt;button type="button"&gt;', 'An action; never use a link with href="#"'],
            ['"Download PDF"', '&lt;a href="/a.pdf" download&gt;', 'It is a resource at a URL']
          ])}`
      },
      {
        title: 'Heading outline: the page table of contents',
        html: `<p>Screen-reader users often press <kbd>H</kbd> to hop heading by heading. Imagine hearing the outline only:</p>
          ${H.table(['Good outline', 'Bad outline'], [
            ['h1 Sole Shop<br>&nbsp;&nbsp;h2 Running shoes<br>&nbsp;&nbsp;&nbsp;&nbsp;h3 Men<br>&nbsp;&nbsp;&nbsp;&nbsp;h3 Women<br>&nbsp;&nbsp;h2 Reviews', 'h4 Sole Shop (chosen for font size)<br>h1 Running shoes<br>h5 Men<br>(no heading for Reviews, just a bold div)']
          ])}
          <p>Rule: pick the heading level for <b>structure</b>, then size it with CSS. Never skip levels (h2 → h4) and avoid more than one <code>h1</code>.</p>`
      },
      {
        title: 'Inspect the accessibility tree in your own browser',
        html: `<p>Open any page, right-click an element → <b>Inspect</b> → in the side panel pick <b>Accessibility</b>. You see the computed <b>Name</b>, <b>Role</b> and states for that node. In Chrome you can also turn on <b>Full-page accessibility tree</b> in DevTools settings. In tests, Testing Library's <code>getByRole('button', { name: 'Add to cart' })</code> queries this same tree, so if the query fails the page is probably inaccessible too.</p>`,
        code: { lang: 'js', check: false, title: 'Testing Library: queries mirror what users get', code: `import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('add to cart is a real, named button', async () => {
  render(<Product />);
  // Fails if the control is a div or has no accessible name
  const btn = screen.getByRole('button', { name: /add to cart/i });
  await userEvent.click(btn);
  expect(screen.getByRole('status')).toHaveTextContent('Added');
});` }
      }
    ],
    deepDive: `<p><b>🟣 How the tree is really built.</b> Chromium, Firefox and WebKit compute a node per DOM element (and some pseudo-content), then <i>prune</i>: elements with <code>display:none</code>, <code>visibility:hidden</code>, <code>hidden</code>, <code>aria-hidden="true"</code> and <code>inert</code> are removed or ignored. "Generic" containers are kept only as structure. The tree is exposed through platform APIs: <b>UI Automation / IAccessible2</b> (Windows), <b>NSAccessibility</b> (macOS/iOS) and <b>AT-SPI</b> (Linux), while Android uses its own node tree. HTML-AAM and Core-AAM are the specs that define which tag maps to which role.</p>
      <p><b>Gotchas that bite in interviews:</b> (1) <code>&lt;a&gt;</code> without <code>href</code> is not a link and is not focusable. (2) <code>&lt;header&gt;</code> and <code>&lt;footer&gt;</code> are page landmarks only when they are direct children of <code>body</code>; inside <code>&lt;article&gt;</code> they are plain groups. (3) <code>&lt;section&gt;</code> is only a "region" landmark when it has an accessible name. (4) CSS can change semantics: <code>display: contents</code> on a button or <code>list-style:none</code> on a list (Safari/VoiceOver drops the list role unless you add <code>role="list"</code>) have caused real bugs. (5) <code>&lt;div&gt;</code> inside <code>&lt;button&gt;</code> is invalid; button children must be "phrasing content", and the button flattens its children to one name ("presentational children").</p>
      <p><b>Tables and lists:</b> use <code>&lt;th scope="col|row"&gt;</code> and <code>&lt;caption&gt;</code> for data tables so cells are announced with their headers. Never use tables for layout. Use <code>&lt;fieldset&gt;</code> + <code>&lt;legend&gt;</code> for radio/checkbox groups (the legend is read before each option). Use <code>&lt;details&gt;/&lt;summary&gt;</code> for simple disclosure with keyboard and state built in. Use <code>&lt;dialog&gt;</code> for modals and <code>popover</code> for lightweight overlays.</p>
      <p><b>Performance and robustness angle:</b> semantic HTML works before JavaScript loads (server-rendered links and forms still function), it is smaller than ARIA-heavy markup, SEO crawlers use headings and landmarks, and Reader Mode and browser translation read it well. The accessibility tree also costs little: browsers only compute it fully when an assistive technology is detected or DevTools asks, though a huge DOM (tens of thousands of nodes) with live updates can slow a screen reader noticeably.</p>`,
    aiEra: `<p><b>🤖 What AI changes.</b> Code assistants autocomplete what is common, and the web is full of div-based UIs, so they happily output <code>&lt;div className="btn" onClick=...&gt;</code> or a "Card" component where every part is a div. React component libraries also hide the element: you must check that <code>&lt;Button&gt;</code> renders a real <code>&lt;button&gt;</code>. Meanwhile <b>AI agents and "computer use" tools</b> prefer the accessibility tree (roles and names) over screenshots because it is cheaper and more exact. If your markup is semantic, an agent can <code>click button "Add to cart"</code>; if not, it guesses from pixels and fails.</p>
      <p><b>Use AI as a partner:</b> paste a component and ask <code>Rewrite using native elements only, no ARIA. List every behaviour you get for free.</code> Then compare the accessibility tree in DevTools before and after. Ask it to generate a heading outline from your page and spot skipped levels.</p>
      <p><b>Where AI goes wrong:</b> it sprinkles <code>role="button"</code> on real buttons, adds <code>aria-label</code> that differs from visible text (breaking voice control), uses <code>&lt;h3&gt;</code> for size, and forgets that <code>&lt;a&gt;</code> without href is not a link. <b>What you must still own:</b> choosing the element from the user's intent, checking the real tree, and refusing div-buttons in code review.</p>`,
    problems: [
      {
        title: 'Build a Mini Accessibility Tree',
        level: 'Medium', tags: ['semantic html', 'accessibility tree', 'recursion'], companies: ['Google', 'Atlassian'],
        statement: `<p>You get a tiny DOM as nested objects: <code>{ tag, attrs, text, children }</code>. Write <code>buildTree(node)</code> that returns an accessibility-tree node <code>{ role, name, children }</code>. Rules: map tags to roles (button, a with href = link, nav = navigation, main = main, h1-h6 = heading, ul = list, li = listitem, everything else = generic). The name is <code>aria-label</code> if present, otherwise the node's own <code>text</code> for button, link and heading, otherwise <code>''</code>. Nodes with <code>aria-hidden="true"</code> (and everything inside) must be left out, and <b>generic</b> nodes with no name should be <b>flattened</b>: their children are lifted to the parent.</p>`,
        constraints: `Depth ≤ 50; at most 10<sup>4</sup> nodes; <code>children</code> and <code>attrs</code> may be missing.`,
        example: `<p>Input: <code>nav &gt; [a href "Home", div &gt; [a href "Cart"]]</code></p>
          <p>Output: <code>navigation &gt; [link "Home", link "Cart"]</code></p>
          <p>The <b>div</b> is generic with no name, so it is ${H.c('g', 'flattened')}: its link moves up one level.</p>`,
        brute: { why: `<p>Walking the tree for each node to find its nearest "meaningful" parent repeats work: O(N·depth). Also easy to forget that hiding applies to the whole subtree.</p>`, code: `function buildBrute(node, hiddenAncestor) {
  const out = [];
  function walk(n, hidden) {
    // re-checks every ancestor for each node: wasteful
    const isHidden = hidden || (n.attrs && n.attrs['aria-hidden'] === 'true');
    if (isHidden) return;
    out.push(n);
    (n.children || []).forEach((c) => walk(c, isHidden));
  }
  walk(node, !!hiddenAncestor);
  return out; // flat list only: no tree, no roles yet
}` },
        mcq: { q: 'A subtree root has aria-hidden="true". What happens to its children in the accessibility tree?', options: ['They stay, only the root is hidden', 'The whole subtree is removed', 'Only focusable children are removed', 'Nothing, aria-hidden only affects CSS'], answer: 1, explain: 'aria-hidden hides the element and all its descendants from assistive technology, so a recursive builder must return nothing for the whole subtree.' },
        hints: [
          `<p>Hint 1: this is a <b>recursive</b> transform. Handle one node, then ask the same function to handle each child.</p>`,
          `<p>Hint 2: return an <b>array</b> from the recursive helper, not a single node. Then a skipped (hidden) node returns <code>[]</code> and a flattened generic returns its children's array.</p>`,
          `<p>Hint 3: recipe: (1) if aria-hidden → return []. (2) compute kids = flatMap(helper over children). (3) compute role and name. (4) if role is generic and name is empty → return kids. (5) else return [{ role, name, children: kids }].</p>`
        ],
        solution: {
          approach: `<p>One recursive pass. The helper returns a <b>list</b> of tree nodes, which makes both "skip hidden subtree" (empty list) and "flatten useless wrappers" (return the children list) trivial. This mirrors how browsers prune generic containers.</p>`,
          code: { lang: 'js', run: true, code: `function roleOf(n) {
  const a = n.attrs || {};
  switch (n.tag) {
    case 'button': return 'button';
    case 'a': return a.href !== undefined ? 'link' : 'generic';
    case 'nav': return 'navigation';
    case 'main': return 'main';
    case 'ul': return 'list';
    case 'li': return 'listitem';
    case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': return 'heading';
    default: return 'generic';
  }
}

function nameOf(n, role) {
  const a = n.attrs || {};
  if (a['aria-label']) return a['aria-label'];
  if (role === 'button' || role === 'link' || role === 'heading') return n.text || '';
  return '';
}

// Returns an ARRAY of accessibility nodes (0 = hidden, many = flattened wrapper).
function build(n) {
  if (n.attrs && n.attrs['aria-hidden'] === 'true') return [];   // whole subtree gone
  const kids = (n.children || []).flatMap(build);
  const role = roleOf(n);
  const name = nameOf(n, role);
  if (role === 'generic' && !name) return kids;                  // flatten useless wrappers
  return [{ role, name, children: kids }];
}

const dom = { tag: 'nav', attrs: { 'aria-label': 'Primary' }, children: [
  { tag: 'a', attrs: { href: '/' }, text: 'Home' },
  { tag: 'div', children: [{ tag: 'a', attrs: { href: '/cart' }, text: 'Cart' }] },
  { tag: 'div', attrs: { 'aria-hidden': 'true' }, children: [{ tag: 'button', text: 'Secret' }] }
] };
console.log(JSON.stringify(build(dom)[0], null, 1));` },
          complexity: `<p>Time O(N) (every node visited once), space O(N) for the output plus O(depth) recursion.</p>`,
          followUps: ['Also skip nodes with the hidden attribute or style display:none', 'Add heading level (h2 → level 2) to the output node']
        }
      }
    ]
  });

  /* =====================================================================
     TOPIC 3 — ARIA roles, states, properties; names; the div-button
     ===================================================================== */
  topics.push({
    title: 'ARIA: Roles, States, Properties & Accessible Names',
    analogy: `<p>ARIA is a <b>sticker sheet</b>. You can stick a "FIRE EXIT" label on a plain wall, and a blind visitor who reads the label will believe there is a door. But the wall still has no door. ARIA changes <b>what assistive tech is told</b>, never <b>what the element actually does</b>. If you stick "button" on a div, you must still build the keyboard behaviour yourself. That is why the first rule is: if a real door (native element) exists, use it.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> <b>ARIA</b> (Accessible Rich Internet Applications) is a set of HTML attributes that add meaning when plain HTML cannot say it. It has three kinds of attributes:</p>
      ${H.table(['Kind', 'Question it answers', 'Examples'], [
        ['<b>Role</b>', 'What IS this thing?', '<code>role="dialog"</code>, <code>tab</code>, <code>tablist</code>, <code>alert</code>, <code>switch</code>'],
        ['<b>State</b> (changes often)', 'What is it doing right now?', '<code>aria-expanded</code>, <code>aria-checked</code>, <code>aria-selected</code>, <code>aria-pressed</code>, <code>aria-invalid</code>, <code>aria-disabled</code>'],
        ['<b>Property</b> (changes rarely)', 'How is it connected or named?', '<code>aria-label</code>, <code>aria-labelledby</code>, <code>aria-describedby</code>, <code>aria-controls</code>, <code>aria-haspopup</code>']
      ])}
      <p><b>The five rules of ARIA (short version):</b></p>
      <ol>
        <li><b>Do not use ARIA</b> if a native element already has the meaning (<code>&lt;button&gt;</code>, not <code>div role="button"</code>).</li>
        <li><b>Do not change native semantics</b> (no <code>&lt;h2 role="tab"&gt;</code>; wrap it instead).</li>
        <li>All interactive ARIA widgets must work with the <b>keyboard</b>.</li>
        <li>Never put <code>role="presentation"</code> or <code>aria-hidden="true"</code> on a <b>focusable</b> element.</li>
        <li>Every interactive element needs an <b>accessible name</b>.</li>
      </ol>
      <p><b>🔵 The accessible name</b> is the text a screen reader says for a control ("Save, button"). The browser picks it in a fixed priority order (simplified):</p>
      ${H.table(['Order', 'Source', 'Example'], [
        ['1', '<code>aria-labelledby</code> (points to other elements by id)', '<code>aria-labelledby="h-billing"</code>'],
        ['2', '<code>aria-label</code> (a string)', '<code>aria-label="Close"</code>'],
        ['3', 'Native source: &lt;label&gt;, alt, button/link text content, caption, legend', '<code>&lt;button&gt;Save&lt;/button&gt;</code>'],
        ['4', '<code>title</code> (last resort; flaky), placeholder (fallback only)', '<code>title="Search"</code>']
      ])}
      <p>Practical advice: <b>visible text is the best name</b>, because voice-control users say what they see ("click Save"). If you must use <code>aria-label</code> (icon buttons), keep it short and make it <b>contain the visible text</b> (WCAG 2.5.3 Label in Name).</p>
      <p><b>Toggle example.</b> A mute button that flips: <code>&lt;button aria-pressed="false"&gt;Mute&lt;/button&gt;</code>. After a click, JavaScript sets <code>aria-pressed="true"</code>. The screen reader says "Mute, toggle button, pressed". The <b>state attribute must be updated in JS</b>; ARIA never updates itself.</p>`,
    clues: [
      '"div with role=button" / "custom checkbox" / "custom dropdown" → needs role + name + state + keyboard (Enter/Space/arrows) + focus',
      '"Icon-only button" / "close X" / "hamburger" → give it an accessible name (aria-label or hidden text); hide the decorative svg',
      '"Screen reader does not know menu is open" → aria-expanded on the trigger (and aria-controls to the menu)',
      '"Label differs from visible text" / "voice control cannot click it" → Label in Name (2.5.3)',
      '"Which is better: aria-label or aria-labelledby?" → labelledby reuses visible text and wins in priority; aria-label is for text that is not on screen'
    ],
    code: [
      { lang: 'html', title: 'Disclosure + toggle + icon button done right', code: `<!-- Disclosure: the trigger owns the state, aria-controls points at the panel -->
<button type="button" aria-expanded="false" aria-controls="faq-1" id="faq-btn-1">
  What is your return policy?
</button>
<div id="faq-1" role="region" aria-labelledby="faq-btn-1" hidden>
  30 days, no questions asked.
</div>

<!-- Toggle button: aria-pressed (do NOT also change the label text) -->
<button type="button" aria-pressed="false">Mute</button>

<!-- Icon-only button: name comes from aria-label, the svg is decoration -->
<button type="button" aria-label="Close dialog">
  <svg aria-hidden="true" focusable="false" width="16" height="16"><path d="M2 2l12 12M14 2L2 14" stroke="currentColor"/></svg>
</button>` },
      { lang: 'js', title: 'Keeping aria-expanded in sync (DOM)', code: `// ARIA states never update themselves: your JavaScript must flip them.
function setupDisclosure(button) {
  const panel = document.getElementById(button.getAttribute('aria-controls'));
  button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!open)); // tell assistive tech
    panel.hidden = open;                                  // show/hide visually AND in the tree
  });
}
document.querySelectorAll('[aria-controls][aria-expanded]').forEach(setupDisclosure);` }
    ],
    codeTitle: ['Disclosure, toggle, icon button', 'Sync aria-expanded'],
    viz: [
      {
        title: 'How the browser picks the accessible name',
        input: 'aria-label=Close;content=X;title=Dismiss this banner',
        inputLabel: 'Sources as key=value; separated by ; (keys: aria-labelledby, aria-label, content, title)',
        gen: function (input) {
          var ORDER = ['aria-labelledby', 'aria-label', 'content', 'title'];
          var map = {};
          String(input).split(';').forEach(function (p) {
            var i = p.indexOf('=');
            if (i < 0) return;
            var k = p.slice(0, i).trim(), v = p.slice(i + 1).trim();
            if (ORDER.indexOf(k) < 0) throw new Error('Unknown key "' + k + '". Use: ' + ORDER.join(', '));
            map[k] = v;
          });
          if (!Object.keys(map).length) throw new Error('Give at least one source, e.g. aria-label=Close;content=X');
          var status = ORDER.map(function () { return 'not checked'; });
          var frames = [], found = false, name = '';
          function rows() { return ORDER.map(function (k, i) { return [i + 1, k, map[k] !== undefined ? map[k] : '(none)', status[i]]; }); }
          function table(hl) { return { type: 'table', label: 'Name sources, highest priority first', columns: ['#', 'Source', 'Value', 'Status'], rows: rows(), hl: hl || {} }; }
          frames.push({ narr: 'A <code>&lt;button&gt;</code> needs a name. The browser looks at sources in a <b>fixed priority order</b> and takes the <b>first one that has text</b>. Lower sources are ignored once a higher one wins.', parts: [table(), { type: 'vars', label: 'Computed name', vals: { name: '(not yet)' } }] });
          ORDER.forEach(function (k, i) {
            if (found) { status[i] = 'ignored'; return; }
            var has = map[k] !== undefined && map[k] !== '';
            if (has) { found = true; name = map[k]; status[i] = 'USED'; } else { status[i] = 'empty, next'; }
            var hl = {}; hl[i] = has ? 'ok' : 'bad';
            frames.push({ narr: 'Step ' + (i + 1) + ': <b>' + k + '</b> ' + (has ? 'has the text "<b>' + H.esc(map[k]) + '</b>". <span class="c-g">Winner.</span> Stop here.' : 'is missing or empty. Move on to the next source.'), parts: [table(hl), { type: 'vars', label: 'Computed name', vals: { name: has ? map[k] : '(not yet)' }, hl: has ? { name: 'ok' } : {} }] });
          });
          var finalHl = {};
          ORDER.forEach(function (k, i) { if (status[i] === 'USED') finalHl[i] = 'ok'; else if (status[i] === 'ignored') finalHl[i] = 'done'; else finalHl[i] = 'bad'; });
          frames.push({ narr: found
            ? 'Final: the screen reader says "<b>' + H.esc(name) + ', button</b>". ' + (/^(close|x|×)$/i.test(name) || name.length < 2 ? '' : '') + 'Sources below the winner (grey) never mattered. Tip: that is why a stale <code>title</code> cannot fix a wrong <code>aria-label</code>.'
            : '<span class="c-r">No source produced text: the button has NO accessible name.</span> A screen reader just says "button". Add visible text or aria-label.',
            parts: [table(finalHl), { type: 'vars', label: 'Computed name', vals: { name: found ? name : '(empty!)' }, hl: { name: found ? 'ok' : 'bad' } }] });
          return frames;
        }
      },
      {
        title: 'Upgrading a div to behave like a button, step by step',
        gen: function () {
          var caps = ['Announced as "button"', 'Reachable with Tab', 'Enter key activates', 'Space key activates', 'Visible focus ring', 'Disabled blocks activation', 'Submits a parent form'];
          var stages = [
            { n: '<code>&lt;div class="btn"&gt;Save&lt;/div&gt;</code> with only an onclick.', has: [0, 0, 0, 0, 0, 0, 0] },
            { n: 'Add <code>role="button"</code>. Now it is <b>announced</b> as a button. But nothing else changed: you still cannot reach it with the keyboard.', has: [1, 0, 0, 0, 0, 0, 0] },
            { n: 'Add <code>tabindex="0"</code>. It joins the Tab order. Pressing keys still does nothing, because divs ignore Enter and Space.', has: [1, 1, 0, 0, 0, 0, 0] },
            { n: 'Add a <code>keydown</code> handler for <b>Enter</b>. Native buttons fire click on Enter, so you copy that.', has: [1, 1, 1, 0, 0, 0, 0] },
            { n: 'Handle <b>Space</b> too, with <code>preventDefault()</code> so the page does not scroll. Native buttons fire on Space key-up.', has: [1, 1, 1, 1, 0, 0, 0] },
            { n: 'Add a <code>:focus-visible</code> CSS outline. Divs usually get none, so keyboard users cannot see where they are.', has: [1, 1, 1, 1, 1, 0, 0] },
            { n: 'Add <code>aria-disabled="true"</code> plus a guard in the handler. A div has no real <code>disabled</code> attribute, so you must block it yourself.', has: [1, 1, 1, 1, 1, 1, 0] },
            { n: 'Form submit behaviour (inside a <code>&lt;form&gt;</code>, click submits) would need even more code. A native <code>&lt;button&gt;</code> gets <b>all seven rows for free</b> with zero lines of JS. Use the button.', has: [1, 1, 1, 1, 1, 1, 0] }
          ];
          return stages.map(function (s, k) {
            var hl = {};
            var rows = caps.map(function (c, i) { hl[i] = s.has[i] ? 'ok' : 'bad'; return [c, s.has[i] ? 'yes' : 'NO', 'yes']; });
            var count = s.has.reduce(function (a, b) { return a + b; }, 0);
            return { narr: s.n, parts: [
              { type: 'table', label: 'What works', columns: ['Capability', 'div + your code', 'native button'], rows: rows, hl: hl },
              { type: 'vars', label: 'Progress', vals: { 'div has': count + ' / 7', 'native button has': '7 / 7', 'lines of JS you wrote (native)': 0 }, hl: { 'native button has': 'ok' } }
            ] };
          });
        }
      }
    ],
    examples: [
      {
        title: 'The complete accessible div-button (when you truly cannot use a button)',
        html: `<p>You almost always can use <code>&lt;button&gt;</code>. But when you inherit a design system or a legacy widget, here is the full checklist for a div that behaves like a button: <b>role, tabindex, name, Enter, Space (with preventDefault), focus style, disabled handling</b>. Missing any one is a bug that real users hit.</p>`,
        code: { lang: 'js', title: 'makeAccessibleButton (DOM)', code: `function makeAccessibleButton(el, onActivate) {
  el.setAttribute('role', 'button');              // 1. announced as a button
  if (!el.hasAttribute('tabindex')) el.tabIndex = 0; // 2. reachable with Tab

  const activate = (e) => {
    if (el.getAttribute('aria-disabled') === 'true') return; // 3. disabled guard
    onActivate(e);
  };
  el.addEventListener('click', activate);

  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); activate(e); }          // 4. Enter
    if (e.key === ' ') e.preventDefault();       // 5a. stop page scroll on Space...
  });
  el.addEventListener('keyup', (e) => {
    if (e.key === ' ') activate(e);              // 5b. ...and fire on key-up like a real button
  });
  // 6. In CSS: .btn:focus-visible { outline: 2px solid #1a73e8; outline-offset: 2px; }
  // 7. The accessible name comes from the text inside, or set aria-label.
}` }
      },
      {
        title: 'Icon-only buttons: three honest ways to name them',
        html: `<p>A magnifying-glass button with no text has no name. Three fixes, from best to acceptable:</p>
          ${H.table(['Approach', 'How', 'Notes'], [
            ['Visible text', '&lt;button&gt;&lt;svg aria-hidden="true"&gt;..&lt;/svg&gt; Search&lt;/button&gt;', 'Best: everyone sees it, voice control works, translates well'],
            ['Visually hidden text', '&lt;button&gt;&lt;svg aria-hidden="true"&gt;..&lt;/svg&gt;&lt;span class="sr-only"&gt;Search&lt;/span&gt;&lt;/button&gt;', 'Great: translates with the page, readable in high-contrast'],
            ['aria-label', '&lt;button aria-label="Search"&gt;&lt;svg aria-hidden="true"&gt;..&lt;/svg&gt;&lt;/button&gt;', 'OK: short and simple; some auto-translators skip it']
          ])}
          <p>The decorative <code>svg</code> gets <code>aria-hidden="true"</code> so it is not read twice. Add a tooltip (not <code>title</code> only) for sighted users who do not know the icon.</p>`,
        code: { lang: 'css', title: 'The standard visually-hidden helper', code: `/* Hidden on screen, still read by screen readers.
   (display:none or visibility:hidden would hide it from both.) */
.sr-only {
  position: absolute;
  width: 1px; height: 1px;
  margin: -1px; padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}` }
      },
      {
        title: 'aria-current, aria-selected, aria-checked: which state where?',
        html: `<p>Pick the state by the kind of widget, not by feel:</p>
          ${H.table(['Widget', 'State', 'Values'], [
            ['Nav link for the page you are on', '<code>aria-current="page"</code>', 'page, step, location, true'],
            ['Tab in a tablist', '<code>aria-selected</code>', 'true / false'],
            ['Checkbox / switch (custom)', '<code>aria-checked</code>', 'true / false / mixed'],
            ['Toggle button (Mute)', '<code>aria-pressed</code>', 'true / false / mixed'],
            ['Menu or accordion trigger', '<code>aria-expanded</code>', 'true / false'],
            ['Form field with a problem', '<code>aria-invalid</code>', 'true / false']
          ])}
          <p>Native <code>&lt;input type="checkbox"&gt;</code> already has its checked state; do not add <code>aria-checked</code> on top of it.</p>`
      }
    ],
    deepDive: `<p><b>🟣 Where the rules come from.</b> ARIA 1.2 is a W3C Recommendation (2023); 1.3 is in draft. Roles fall into families: <b>widget</b> roles (button, checkbox, tab, slider, combobox), <b>composite</b> (tablist, menu, grid, listbox, tree: these manage focus inside), <b>landmark</b> (banner, navigation, main, search, region), <b>document structure</b> (heading, list, table, article), <b>live region</b> (alert, status, log, timer, marquee) and <b>abstract</b> roles you never use. A second spec, <b>ARIA in HTML</b>, lists which roles are allowed on which native element (for example <code>role="button"</code> on a <code>&lt;button&gt;</code> is redundant but harmless; <code>role="heading"</code> on a <code>&lt;button&gt;</code> is not allowed).</p>
      <p><b>Name-from rules.</b> Some roles take their name from content (button, link, tab, heading, cell), others only from author (dialog, region, navigation need <code>aria-label</code> or <code>aria-labelledby</code>), and some roles <b>prohibit</b> naming (generic, paragraph): <code>aria-label</code> on a plain div is ignored by many screen readers. <code>aria-labelledby</code> may point to hidden elements and even to itself plus others (names concatenate in the given id order). Placeholder is a last-resort fallback and disappears when typing, so it is not a label.</p>
      <p><b>aria-hidden traps.</b> <code>aria-hidden="true"</code> on a container removes its whole subtree from the tree but <b>does not</b> stop focus: a focusable link inside becomes a "ghost" the keyboard can reach but the screen reader cannot describe. Use the <code>inert</code> attribute (supported in all current browsers) to make a region unfocusable and hidden from AT at once. Also <code>aria-hidden</code> on <code>body</code> or a parent of the active dialog hides everything.</p>
      <p><b>aria-owns / aria-controls reality.</b> <code>aria-controls</code> is poorly supported by screen readers (JAWS announces it with a jump shortcut; NVDA and VoiceOver mostly ignore it), so it is helpful but never enough alone. <code>aria-activedescendant</code> lets focus stay on one element (a combobox input) while virtual focus moves in a list; it needs ids and JS to keep the visual and the ARIA in sync. <code>aria-haspopup</code> is a hint only; <code>aria-expanded</code> on the trigger is what users hear.</p>
      <p><b>Cost of ARIA.</b> The yearly WebAIM Million study finds that home pages <i>with</i> ARIA have noticeably more detected errors than pages without. The reason is not that ARIA is bad but that people add it carelessly. The slogan from the ARIA Authoring Practices Guide (APG): <b>"No ARIA is better than bad ARIA."</b> The APG (w3.org/WAI/ARIA/apg) gives tested keyboard patterns for tabs, dialog, combobox, menu, tree, grid; follow it instead of inventing behaviour.</p>`,
    aiEra: `<p><b>🤖 What AI changes.</b> Language models know ARIA vocabulary well but not the <i>interaction contracts</i> behind it, so they tend to produce "ARIA decoration": the right attribute names with missing behaviour. A common example is a generated custom select with <code>role="listbox"</code> and <code>aria-selected</code> but no arrow-key handling, no focus management and a click-only mouse path. It passes an automated scan and fails a real user in ten seconds.</p>
      <p><b>Use AI as a partner:</b> ask <code>List the keyboard interactions required by the APG pattern for a combobox</code> and then check your implementation against that list. Ask it to explain what each ARIA attribute you wrote would be <i>announced as</i>; it is a good rubber duck. Use <code>eslint-plugin-jsx-a11y</code> and axe to catch invalid roles automatically; they run in milliseconds.</p>
      <p><b>Where AI goes wrong:</b> it adds redundant roles (<code>&lt;nav role="navigation"&gt;</code>), stale state (forgets to flip <code>aria-expanded</code>), duplicated names (<code>aria-label</code> plus identical text), or makes up attributes like <code>aria-clickable</code> (not real). <b>What you must still own:</b> the rule "native first", the state-sync logic, and testing with a screen reader (NVDA + Firefox/Chrome, VoiceOver + Safari) because support differs.</p>`,
    problems: [
      {
        title: 'Make a Div-Button Accessible',
        level: 'Medium', tags: ['aria', 'keyboard', 'events'], companies: ['Google', 'Meta', 'Atlassian'],
        statement: `<p>A legacy page has <code>&lt;div class="btn" id="save"&gt;Save&lt;/div&gt;</code> that only reacts to mouse clicks. You cannot change the element type. Write <code>makeAccessibleButton(el, onActivate)</code> so that: a screen reader says "Save, button"; it is reachable with <kbd>Tab</kbd>; <kbd>Enter</kbd> and <kbd>Space</kbd> both activate it (Space must not scroll the page); and when <code>aria-disabled="true"</code> is set, nothing fires.</p>`,
        constraints: `Do not rely on any library. Handle repeated key events (holding Enter must not spam activations on Space).`,
        example: `<p>Before: ${H.c('r', 'Tab skips it · Enter does nothing · screen reader reads "Save" as plain text')}</p>
          <p>After: ${H.c('g', 'Tab lands on it · Enter / Space fire onActivate once · reads "Save, button"')}</p>`,
        brute: { why: `<p>Only adding <code>onclick</code> (or adding just <code>role</code>) fixes one of five problems. The element is still unreachable and silent to the keyboard, and Space scrolls the page.</p>`, code: `// Only handles the mouse. Keyboard and screen reader users are locked out.
function makeBrute(el, onActivate) {
  el.addEventListener('click', onActivate);
}` },
        mcq: { q: 'Which attribute adds the div to the Tab order?', options: ['role="button"', 'tabindex="0"', 'aria-pressed="false"', 'aria-live="polite"'], answer: 1, explain: 'role only changes what is announced. tabindex="0" makes a non-interactive element focusable in DOM order.' },
        hints: [
          `<p>Hint 1: the browser gives a real button four things for free: <b>role</b>, <b>focusability</b>, <b>Enter/Space → click</b>, and a <b>disabled</b> state. You must recreate each.</p>`,
          `<p>Hint 2: set <code>role="button"</code> and <code>tabIndex = 0</code>; listen to <code>keydown</code> for Enter and Space on the element itself.</p>`,
          `<p>Hint 3: recipe: guard function <code>activate</code> checks <code>aria-disabled</code>. Enter on keydown → preventDefault + activate. Space on keydown → preventDefault (stop scroll); on keyup → activate (matches native timing). Ignore <code>e.repeat</code>.</p>`
        ],
        solution: {
          approach: `<p>Rebuild the native contract piece by piece. Putting the disabled check inside one <code>activate</code> function means mouse and keyboard share the same guard. Using keyup for Space matches native buttons (you can press, move away and cancel).</p>`,
          code: { lang: 'js', code: `function makeAccessibleButton(el, onActivate) {
  el.setAttribute('role', 'button');
  if (!el.hasAttribute('tabindex')) el.tabIndex = 0;

  function activate(e) {
    if (el.getAttribute('aria-disabled') === 'true') return; // one guard for all inputs
    onActivate(e);
  }

  el.addEventListener('click', activate);

  el.addEventListener('keydown', (e) => {
    if (e.repeat) return;                       // holding a key must not spam
    if (e.key === 'Enter') { e.preventDefault(); activate(e); }
    else if (e.key === ' ') e.preventDefault(); // stop the page from scrolling
  });

  el.addEventListener('keyup', (e) => {
    if (e.key === ' ') activate(e);             // Space fires on release, like <button>
  });

  // return a small API so callers can disable it consistently
  return {
    setDisabled(v) { el.setAttribute('aria-disabled', String(!!v)); el.tabIndex = v ? -1 : 0; }
  };
}

// Usage: makeAccessibleButton(document.getElementById('save'), () => save());` },
          complexity: `<p>O(1) work per event; four listeners per element.</p>`,
          followUps: ['Keep disabled buttons focusable (aria-disabled) so screen-reader users can discover them. When is real disabled better?', 'How would you support a toggle button with aria-pressed?']
        }
      }
    ]
  });

  /* =====================================================================
     TOPIC 4 — Keyboard navigation, tab order, focus visible, roving tabindex
     ===================================================================== */
  topics.push({
    title: 'Keyboard Navigation, Tab Order & Roving Tabindex',
    analogy: `<p>Think of a metro line. <kbd>Tab</kbd> is the train: it stops at every station in order. The <b>focus ring</b> is the "You are here" dot on the map. Once you get off at a big station (a tab list, a menu, a toolbar) you walk around inside using the <b>arrow keys</b>, and the next <kbd>Tab</kbd> takes the train to the <i>next line</i>, not to every tiny platform. A positive <code>tabindex</code> is like a train that ignores the timetable and jumps the queue: it confuses everyone.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> Many people never touch a mouse: blind users, people with tremors or paralysis, people with a broken arm, and power users who are simply faster on the keyboard. Everything you can do with a mouse must also be possible with a keyboard (WCAG <b>2.1.1</b>), and you must always be able to <b>see</b> where you are (<b>2.4.7</b>).</p>
      ${H.table(['Key', 'What users expect'], [
        ['<kbd>Tab</kbd> / <kbd>Shift+Tab</kbd>', 'Move to the next / previous focusable thing'],
        ['<kbd>Enter</kbd>', 'Activate a link or button; submit a form'],
        ['<kbd>Space</kbd>', 'Activate a button; toggle a checkbox; scroll the page'],
        ['<kbd>Esc</kbd>', 'Close the dialog, menu or popup; return focus to where it came from'],
        ['Arrow keys', 'Move <i>inside</i> a widget (tabs, menu, radio group, listbox, slider)'],
        ['<kbd>Home</kbd> / <kbd>End</kbd>', 'First / last item inside a widget']
      ])}
      <p><b>What can take focus?</b> Natively: links with <code>href</code>, buttons, inputs/selects/textareas (not disabled), <code>&lt;summary&gt;</code>, <code>contenteditable</code>, iframes. Anything else only with <code>tabindex</code>:</p>
      ${H.table(['tabindex', 'Meaning', 'Use it?'], [
        ['<code>0</code>', 'In the Tab order, at its natural place in the HTML', H.c('g', 'Yes, for custom widgets')],
        ['<code>-1</code>', 'Focusable by script (<code>el.focus()</code>) or click, NOT by Tab', H.c('g', 'Yes, for focus targets and roving items')],
        ['<code>1, 2, 3...</code>', 'Jumps ahead of every tabindex=0 element', H.c('r', 'Never. It breaks the natural order')]
      ])}
      <p><b>🔵 Tab order = DOM order.</b> The browser walks the page in source order. So your HTML order must match the visual order (WCAG <b>2.4.3</b>). CSS tricks like <code>flex-direction: row-reverse</code>, <code>order</code>, or grid placement change the look but not the Tab order, and the focus ring will jump around the screen.</p>
      <p><b>Roving tabindex</b> keeps a big widget from costing 20 Tab presses. In a tab list with three tabs, only the <b>selected</b> tab has <code>tabindex="0"</code>; the others have <code>tabindex="-1"</code>. Arrow keys move the <code>0</code> to the new tab and call <code>focus()</code> on it (it "roves"). One Tab press enters the widget, the next leaves it.</p>
      <p><b>Never remove the focus ring.</b> <code>outline: none</code> without a replacement is the most common keyboard bug on the web. Use <code>:focus-visible</code>: it shows the ring for keyboard users and hides it on mouse clicks on buttons.</p>`,
    clues: [
      '"Keyboard only" / "no mouse" / "tab through the page" → Tab order, focus visible, no traps, all actions reachable',
      '"Focus jumps around randomly" → DOM order differs from visual order (CSS order, absolute positioning) or positive tabindex',
      '"Arrow keys inside tabs / menu / toolbar / radio group" → composite widget: roving tabindex (or aria-activedescendant)',
      '"After route change focus is lost" / "SPA navigation" → move focus to the new page heading (tabindex=-1) or announce the change',
      '"Sticky header covers focused element" → WCAG 2.2 2.4.11, use scroll-padding-top'
    ],
    code: [
      { lang: 'css', title: 'Focus styles that survive real life', code: `/* Show a strong ring for keyboard users, stay quiet for mouse clicks. */
:focus-visible {
  outline: 3px solid #1a56db;      /* 3:1+ against both light and dark neighbours */
  outline-offset: 2px;
}
/* Optional: remove the default ring ONLY when you provide :focus-visible above */
:focus:not(:focus-visible) { outline: none; }

/* Keep focused items from hiding under a sticky header (WCAG 2.2 - 2.4.11) */
html { scroll-padding-top: 80px; }

/* Skip link: off-screen until it receives focus */
.skip-link { position: absolute; left: -999px; top: 0; background: #fff; padding: 8px 12px; z-index: 100; }
.skip-link:focus { left: 8px; top: 8px; }` },
      { lang: 'js', run: true, title: 'Next index for arrow-key widgets (runnable)', code: `// Pure logic for roving tabindex: where does focus go after a key press?
function nextIndex(current, key, count) {
  switch (key) {
    case 'ArrowRight': case 'ArrowDown': return (current + 1) % count;          // wrap to first
    case 'ArrowLeft': case 'ArrowUp': return (current - 1 + count) % count;     // wrap to last
    case 'Home': return 0;
    case 'End': return count - 1;
    default: return current;                                                    // ignore other keys
  }
}

let i = 0;
for (const k of ['ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowLeft', 'End', 'Home', 'x']) {
  i = nextIndex(i, k, 3);
  console.log(k.padEnd(11), '-> tab', i);
}` }
    ],
    codeTitle: ['Focus CSS + skip link', 'Arrow key index'],
    viz: [
      {
        title: 'Pressing Tab: the focus order walk',
        input: 'logo search:-1 cart:2 menu:1 buy about footer',
        inputLabel: 'Elements in DOM order, optional :tabindex (e.g. cart:2, skip:-1)',
        gen: function (input) {
          var toks = String(input).trim().split(/\s+/).filter(Boolean);
          if (toks.length < 3 || toks.length > 10) throw new Error('Give 3 to 10 elements like: logo search:-1 cart:2 menu');
          var els = toks.map(function (t, i) {
            var p = t.split(':'), ti = p.length > 1 ? parseInt(p[1], 10) : 0;
            if (isNaN(ti)) throw new Error('tabindex must be a number in "' + t + '"');
            return { name: p[0], ti: ti, dom: i };
          });
          var pos = els.filter(function (e) { return e.ti > 0; }).sort(function (a, b) { return a.ti - b.ti || a.dom - b.dom; });
          var zero = els.filter(function (e) { return e.ti === 0; });
          var order = pos.concat(zero);
          if (order.length < 2) throw new Error('Need at least 2 tabbable elements (tabindex 0 or positive)');
          var names = els.map(function (e) { return e.name; });
          var idxl = els.map(function (e) { return 'ti=' + e.ti; });
          var hlBase = {};
          els.forEach(function (e) { if (e.ti < 0) hlBase[e.dom] = 'bad'; });
          var frames = [], visited = {};
          frames.push({ narr: 'Here is the page in <b>DOM order</b>. Each element shows its <code>tabindex</code>. The browser will build the Tab order like this: first all <b>positive</b> tabindex ascending, then all <b>0</b> in DOM order. <b>-1</b> elements (red) are skipped by Tab.', parts: [
            { type: 'array', label: 'DOM order', values: names, idxLabels: idxl, hl: hlBase }
          ] });
          order.forEach(function (e, k) {
            var hl = {};
            Object.keys(hlBase).forEach(function (x) { hl[x] = hlBase[x]; });
            Object.keys(visited).forEach(function (x) { hl[x] = 'done'; });
            hl[e.dom] = 'cur';
            visited[e.dom] = true;
            var why = e.ti > 0 ? '<span class="c-r">positive tabindex ' + e.ti + ' jumps ahead of the natural order</span>' : 'natural DOM order';
            frames.push({ narr: 'Tab press <b>#' + (k + 1) + '</b>: focus lands on <b>' + e.name + '</b> (' + why + '). ' + (k === 0 && pos.length ? 'Notice the logo is not first!' : ''), parts: [
              { type: 'array', label: 'DOM order', values: names, idxLabels: idxl, hl: hl },
              { type: 'array', label: 'Tab order so far', values: order.slice(0, k + 1).map(function (z) { return z.name; }), hl: (function () { var h = {}; h[k] = 'cur'; return h; })() },
              { type: 'vars', vals: { 'Tab presses': k + 1, 'document.activeElement': e.name }, hl: { 'document.activeElement': 'cur' } }
            ] });
          });
          var skipped = els.filter(function (e) { return e.ti < 0; }).map(function (e) { return e.name; });
          frames.push({ narr: 'One more Tab leaves the page (to the browser UI) and wraps back to the start. <b>Skipped by Tab:</b> ' + (skipped.length ? skipped.join(', ') + ' (tabindex -1, still focusable with el.focus() or a click)' : 'none') + '. ' + (pos.length ? '<span class="c-r">Positive tabindex made the order differ from the visual order: a WCAG 2.4.3 failure.</span>' : '<span class="c-g">Order equals DOM order: good.</span>'), parts: [
            { type: 'array', label: 'Final Tab order', values: order.map(function (z) { return z.name; }), hl: (function () { var h = {}; order.forEach(function (z, i) { h[i] = z.ti > 0 ? 'bad' : 'ok'; }); return h; })() }
          ] });
          return frames;
        }
      },
      {
        title: 'Roving tabindex in a tab list (arrow keys)',
        input: 'Tab ArrowRight ArrowRight ArrowLeft End Home Tab Tab',
        inputLabel: 'Keys: Tab ArrowRight ArrowLeft Home End',
        gen: function (input) {
          var keys = String(input).trim().split(/\s+/).filter(Boolean);
          var ok = ['Tab', 'ArrowRight', 'ArrowLeft', 'Home', 'End'];
          if (keys.length < 3 || keys.length > 14) throw new Error('Use 3 to 14 keys');
          keys.forEach(function (k) { if (ok.indexOf(k) < 0) throw new Error('Unknown key "' + k + '". Use: ' + ok.join(' ')); });
          var tabs = ['Overview', 'Specs', 'Reviews'], sel = 0, focus = 'outside', frames = [];
          function parts() {
            var hl = {}, lbl = tabs.map(function (t, i) { return i === sel ? 'tabindex=0' : 'tabindex=-1'; });
            hl[sel] = 'ok';
            if (focus === 'tabs') hl[sel] = 'cur';
            return [
              { type: 'array', label: 'role=tablist', values: tabs, idxLabels: lbl, hl: hl },
              { type: 'text', label: 'Panel', html: '<b>' + tabs[sel] + '</b> panel ' + (focus === 'panel' ? '<span class="c-y">(has focus)</span>' : '') },
              { type: 'vars', vals: { 'focus is in': focus, 'selected tab': tabs[sel] }, hl: { 'focus is in': 'cur' } }
            ];
          }
          frames.push({ narr: 'Only the <b>selected</b> tab is in the Tab order (<code>tabindex=0</code>). The others are <code>-1</code>: reachable with arrows, not with Tab. Focus starts <b>outside</b> the widget.', parts: parts() });
          keys.forEach(function (k) {
            var msg;
            if (k === 'Tab') {
              if (focus === 'outside') { focus = 'tabs'; msg = '<b>Tab</b> enters the widget on the one tab that has tabindex=0: <b>' + tabs[sel] + '</b>.'; }
              else if (focus === 'tabs') { focus = 'panel'; msg = '<b>Tab</b> leaves the tab list in ONE press and goes to the panel (APG: panel is focusable if it has no focusable content).'; }
              else { focus = 'outside'; msg = '<b>Tab</b> moves on to the next control after the widget.'; }
            } else if (focus !== 'tabs') {
              msg = '<b>' + k + '</b> does nothing here: arrows only work while focus is on a tab. (And we must not steal arrows from the rest of the page.)';
            } else {
              var n = sel;
              if (k === 'ArrowRight') n = (sel + 1) % tabs.length;
              if (k === 'ArrowLeft') n = (sel - 1 + tabs.length) % tabs.length;
              if (k === 'Home') n = 0;
              if (k === 'End') n = tabs.length - 1;
              msg = '<b>' + k + '</b>: roving! tab <b>' + tabs[sel] + '</b> gets tabindex=-1, tab <b>' + tabs[n] + '</b> gets tabindex=0 and <code>focus()</code>. ' + (n === sel ? 'Same tab (nothing moved).' : (k === 'ArrowRight' && sel === tabs.length - 1) || (k === 'ArrowLeft' && sel === 0) ? 'It wrapped around the end.' : '');
              sel = n;
            }
            frames.push({ narr: msg, parts: parts() });
          });
          return frames;
        }
      }
    ],
    examples: [
      {
        title: 'Skip link: save keyboard users 40 Tab presses',
        html: `<p>If your header has 30 links, a keyboard user must tab through all of them on every page. A <b>skip link</b> is the very first focusable element: it appears when focused and jumps to <code>&lt;main&gt;</code> (WCAG 2.4.1 Bypass Blocks). The target needs an <code>id</code>; add <code>tabindex="-1"</code> to <code>main</code> if older browsers do not move focus.</p>`,
        code: { lang: 'html', code: `<body>
  <a class="skip-link" href="#main">Skip to main content</a>
  <header><!-- logo + 30 nav links --></header>
  <main id="main" tabindex="-1">
    <h1>Order shoes</h1>
  </main>
</body>` }
      },
      {
        title: 'Visual order vs DOM order: the flex "order" bug',
        html: `<p>A designer wants the button on the left and the heading on the right, so a dev writes the HTML in the wrong order and fixes the look with CSS. Eyes see: Button, Heading. The keyboard order is still DOM order, so focus goes <b>right to left</b>. WCAG 2.4.3 (Focus Order) and 1.3.2 (Meaningful Sequence) fail.</p>
          ${H.table(['Approach', 'Look', 'Tab / reading order'], [
            ['<code>flex-direction: row-reverse</code> on the container', 'B, A', H.c('r', 'A, B (mismatch)')],
            ['Change the HTML order itself', 'B, A', H.c('g', 'B, A (match)')]
          ])}
          <p>Rule of thumb: change layout with CSS, but change <b>order</b> in the HTML. The CSS spec now has <code>reading-flow</code> to fix this for flex/grid, but support is still limited, so do not depend on it.</p>`
      },
      {
        title: 'SPA route changes: where does focus go?',
        html: `<p>On a classic multi-page site, clicking a link loads a new page and focus resets to the top. In a single-page app, the URL changes but <b>focus stays on the clicked link</b> and the screen reader says nothing. Good practice: after navigation, move focus to the new page's <code>&lt;h1&gt;</code> (give it <code>tabindex="-1"</code> so it can receive focus) and update <code>document.title</code>. Frameworks' routers (Next.js has a route announcer, Reach/React Router with options) help, but you still have to test.</p>`,
        code: { lang: 'js', title: 'Focus the heading after a route change', code: `// Call this after your router finishes rendering the new page.
function afterNavigation() {
  document.title = document.querySelector('h1').textContent + ' - Sole Shop'; // 2.4.2
  const h1 = document.querySelector('h1');
  h1.setAttribute('tabindex', '-1');   // focusable by script, not in the Tab order
  h1.focus({ preventScroll: false });  // screen reader announces the heading text
}` }
      }
    ],
    deepDive: `<p><b>🟣 :focus vs :focus-visible.</b> <code>:focus</code> matches any focused element. <code>:focus-visible</code> uses browser heuristics: always for text inputs, for keyboard-driven focus, and not for mouse clicks on buttons. If a script calls <code>el.focus()</code> right after a keyboard action, the ring shows; after a mouse action it usually does not. WCAG 2.2 added <b>2.4.11 Focus Not Obscured (Minimum)</b> (AA): a sticky header or cookie banner must not completely hide the focused item, so use <code>scroll-padding</code> and test. <b>2.4.13 Focus Appearance</b> (AAA) asks for a ring at least 2px thick with 3:1 contrast. In <b>Windows forced-colors mode</b> (High Contrast), <code>box-shadow</code> rings vanish while <code>outline</code> stays; prefer <code>outline</code>.</p>
      <p><b>Events and APIs.</b> <code>focus</code>/<code>blur</code> do not bubble, <code>focusin</code>/<code>focusout</code> do (use them for delegation). <code>document.activeElement</code> tells you the current element (it can be <code>body</code>). <code>el.focus({ preventScroll: true })</code> avoids a scroll jump. <code>:focus-within</code> styles a container when a child is focused. In <b>shadow DOM</b>, <code>delegatesFocus: true</code> forwards focus to the first focusable inside. Browsers keep a "sequential focus navigation starting point": after you click non-focusable text, the next Tab starts from there.</p>
      <p><b>Two ways to manage focus inside composites.</b> (1) <b>Roving tabindex</b>: real DOM focus moves; works in every screen reader because focus events fire; costs a <code>tabindex</code> write per move. (2) <b>aria-activedescendant</b>: DOM focus stays on the container or input; you set <code>aria-activedescendant="option-3"</code> and style the "virtual" focus yourself. Needed for comboboxes where focus must stay in the text input, but you must keep <code>scrollIntoView</code> and styles in sync. Pick roving tabindex unless you must keep input focus.</p>
      <p><b>Real-world traps.</b> (a) <b>Keyboard traps</b> (2.1.2): a third-party widget or iframe that swallows Tab. Always offer Esc or Tab to leave. (b) <b>Single-character shortcuts</b> (2.1.4): letter shortcuts like "j/k" must be turn-off-able or only active when the widget is focused, because they collide with speech input. (c) Scroll containers: Chrome and Firefox now make scrollable regions keyboard-focusable when they have no focusable children; add a label (<code>role="region" aria-label</code>) rather than fighting it. (d) <b>Safari on macOS</b> only tabs to links when "Press Tab to highlight each item" is on (or use Option+Tab), so test controls with the right setting. (e) <b>Mobile screen readers</b> navigate by swipe, not Tab, so keyboard testing alone is not enough. (f) Hover-only menus fail 2.1.1 and 1.4.13 (content on hover must be dismissible, hoverable, persistent).</p>`,
    aiEra: `<p><b>🤖 What AI changes.</b> Code generators love <code>onClick</code> on anything and rarely add key handling. Even good output often forgets: Escape to close, focus return, arrow keys in menus, <code>:focus-visible</code> styles, <code>outline: none</code> inherited from a CSS reset (very common in AI-written "modern" CSS resets!). AI agents driving a browser also use <kbd>Tab</kbd>/<kbd>Enter</kbd> and focus state, so a broken Tab order confuses automation as much as people.</p>
      <p><b>Use AI as a partner:</b> ask <code>Write a Playwright test that tabs through this page and asserts the focus order is [logo, search, cart, menu]</code>. Let it generate the boring parts of a keyboard test (press Tab N times, assert <code>toBeFocused()</code>). Ask <code>Which keys does the APG require for a menu button, and which does my code miss?</code>.</p>
      <p><b>Where AI goes wrong:</b> it invents key maps (Left/Right on a vertical menu), forgets <code>preventDefault()</code> for Space (page scrolls), adds <code>tabindex="1"</code> "to fix the order", sets <code>tabindex="0"</code> on every item of a list (20 Tab stops), and never tests with a real keyboard. <b>What you must still own:</b> the actual Tab-through of every flow, the decision of which widget pattern fits, and checking focus after every open/close/route change.</p>`,
    problems: [
      {
        title: 'Compute the Tab Order of a Page',
        level: 'Medium', tags: ['tabindex', 'focus order', 'sorting'], companies: ['Google', 'Microsoft'],
        statement: `<p>Given the elements of a page in DOM order, each with a <code>tabindex</code> number (0 means natural, absent is treated as 0 for focusable elements), return the names in the order the <kbd>Tab</kbd> key visits them. Rules: elements with <code>tabindex &lt; 0</code> are skipped; elements with positive tabindex come first, sorted ascending (ties keep DOM order); then elements with tabindex 0 in DOM order. Add a flag <code>disabled</code> that also removes the element.</p>`,
        constraints: `1 ≤ N ≤ 10<sup>4</sup>; tabindex between -1 and 100.`,
        example: `<p>Input (DOM order): <code>logo, search(-1), cart(2), menu(1), buy, about</code></p>
          <p>Output: <code>menu, cart, logo, buy, about</code></p>
          <p>${H.c('b', 'menu (1) then cart (2)')} first because positive values go first; then ${H.c('g', 'logo, buy, about')} in DOM order; ${H.c('r', 'search is skipped (-1)')}.</p>`,
        brute: { why: `<p>Repeatedly scanning the list to find "the next smallest positive tabindex" is O(N²) and easy to get wrong with ties. A single stable sort is simpler.</p>`, code: `function tabOrderBrute(els) {
  const out = [];
  const used = new Set();
  // pick the smallest positive each time: O(N^2)
  for (;;) {
    let best = -1;
    els.forEach((e, i) => {
      if (used.has(i) || e.disabled || e.tabindex <= 0) return;
      if (best < 0 || e.tabindex < els[best].tabindex) best = i;
    });
    if (best < 0) break;
    used.add(best); out.push(els[best].name);
  }
  els.forEach((e, i) => { if (!used.has(i) && !e.disabled && e.tabindex === 0) out.push(e.name); });
  return out;
}` },
        mcq: { q: 'Which element is visited LAST by Tab?', options: ['tabindex="3"', 'tabindex="0" near the end of the DOM', 'tabindex="-1"', 'tabindex="1"'], answer: 1, explain: 'Positive tabindex elements are visited first in ascending order. tabindex=0 elements come after, in DOM order. -1 is never visited by Tab.' },
        hints: [
          `<p>Hint 1: two groups: <b>positive</b> (first) and <b>zero</b> (second). Negative and disabled are dropped.</p>`,
          `<p>Hint 2: filter into the groups, then sort the positive group by tabindex. JavaScript's <code>sort</code> is stable in modern engines, so ties keep DOM order.</p>`,
          `<p>Hint 3: recipe: map each element to <code>{name, ti: tabindex ?? 0, dom: index}</code>; drop disabled and ti &lt; 0; positives sorted by (ti, dom); zeros in dom order; concatenate and return names.</p>`
        ],
        solution: {
          approach: `<p>Partition once, sort only the (usually tiny) positive group, concatenate. Treating missing tabindex as 0 matches how natively focusable elements behave.</p>`,
          code: { lang: 'js', run: true, code: `function tabOrder(els) {
  const items = els
    .map((e, dom) => ({ name: e.name, ti: e.tabindex ?? 0, dom, disabled: !!e.disabled }))
    .filter((e) => !e.disabled && e.ti >= 0);           // drop disabled and -1

  const positive = items.filter((e) => e.ti > 0).sort((a, b) => a.ti - b.ti || a.dom - b.dom);
  const zero = items.filter((e) => e.ti === 0);          // already in DOM order
  return positive.concat(zero).map((e) => e.name);
}

console.log(tabOrder([
  { name: 'logo' }, { name: 'search', tabindex: -1 }, { name: 'cart', tabindex: 2 },
  { name: 'menu', tabindex: 1 }, { name: 'buy' }, { name: 'about', disabled: true }, { name: 'faq' }
]).join(', ')); // menu, cart, logo, buy, faq` },
          dry: { head: ['name', 'tabindex', 'group', 'result position'], rows: [['menu', '1', 'positive', '1'], ['cart', '2', 'positive', '2'], ['logo', '0', 'zero', '3'], ['buy', '0', 'zero', '4'], ['search', '-1', 'skipped', '-']] },
          complexity: `<p>Time O(N + P log P) where P is the number of positive-tabindex elements; space O(N).</p>`,
          followUps: ['How would you detect a mismatch between DOM order and visual left-to-right order using getBoundingClientRect?', 'Why is positive tabindex considered harmful in a component library?']
        }
      },
      {
        title: 'Roving Tabindex Tab List',
        level: 'Hard', tags: ['roving tabindex', 'aria tabs', 'keyboard'], companies: ['Google', 'Atlassian', 'Shopify'],
        statement: `<p>Implement <code>setupTabs(tablist)</code> for markup with <code>role="tablist"</code>, child <code>role="tab"</code> buttons and matching <code>role="tabpanel"</code> elements. Requirements: only the selected tab has <code>tabindex=0</code> (others -1); <kbd>ArrowRight</kbd>/<kbd>ArrowLeft</kbd> move and wrap, <kbd>Home</kbd>/<kbd>End</kbd> jump; the moved-to tab becomes selected (<code>aria-selected="true"</code>) and its panel is shown, others hidden; clicking a tab also selects it. Panels are linked with <code>aria-controls</code>.</p>`,
        constraints: `2 to 12 tabs. No libraries. Must not break when tabs are added later (read the DOM on each key press).`,
        example: `<p>Tabs: Overview (selected) · Specs · Reviews. Press <kbd>ArrowRight</kbd> twice, <kbd>ArrowRight</kbd> again.</p>
          <p>${H.c('g', 'Overview → Specs → Reviews → (wrap) Overview')}. Each move updates tabindex, aria-selected and the visible panel.</p>`,
        brute: { why: `<p>Giving every tab <code>tabindex=0</code> makes screen-reader and keyboard users press Tab once per tab, and arrow keys do nothing. Setting <code>aria-selected</code> but forgetting to hide the other panels makes the content duplicate.</p>`, code: `// Every tab is a Tab stop and arrows do nothing: slow and not the expected pattern.
function setupTabsBrute(tablist) {
  tablist.querySelectorAll('[role=tab]').forEach((t) => {
    t.tabIndex = 0;
    t.addEventListener('click', () => t.setAttribute('aria-selected', 'true'));
  });
}` },
        mcq: { q: 'In a tab list using roving tabindex, what is the tabindex of the tabs that are NOT selected?', options: ['0', '-1', '1', 'No tabindex attribute'], answer: 1, explain: 'Unselected tabs get -1: focusable with arrow keys (script) but skipped by Tab, so the whole widget is one Tab stop.' },
        hints: [
          `<p>Hint 1: the whole widget should be <b>one Tab stop</b>. That means exactly one tab has tabindex 0.</p>`,
          `<p>Hint 2: write one function <code>select(tab)</code> that updates every tab (tabindex, aria-selected) and every panel (hidden), then call it from clicks and keys.</p>`,
          `<p>Hint 3: recipe: <code>tabs = [...tablist.querySelectorAll('[role=tab]')]</code>; on keydown compute the next index (wrap with modulo, Home 0, End last), preventDefault, call select(tabs[i]) then <code>tabs[i].focus()</code>. Panel id comes from <code>tab.getAttribute('aria-controls')</code>.</p>`
        ],
        solution: {
          approach: `<p>Centralise state changes in <code>select</code>. Key handling only computes the next index (a pure function), so it is easy to test. This is the "automatic activation" variant from the ARIA Authoring Practices: moving focus selects the tab.</p>`,
          code: { lang: 'js', code: `function nextIndex(i, key, n) {
  if (key === 'ArrowRight') return (i + 1) % n;
  if (key === 'ArrowLeft') return (i - 1 + n) % n;
  if (key === 'Home') return 0;
  if (key === 'End') return n - 1;
  return -1; // not a key we handle
}

function setupTabs(tablist) {
  const getTabs = () => Array.from(tablist.querySelectorAll('[role="tab"]'));

  function select(tab) {
    getTabs().forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;                       // roving: only one Tab stop
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;                  // show only the active panel
    });
  }

  tablist.addEventListener('keydown', (e) => {
    const tabs = getTabs();
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    const n = nextIndex(i, e.key, tabs.length);
    if (n < 0) return;                                // let other keys (Tab) behave normally
    e.preventDefault();                               // stop the page scrolling on arrows/Home/End
    select(tabs[n]);
    tabs[n].focus();                                  // move real DOM focus
  });

  tablist.addEventListener('click', (e) => {
    const tab = e.target.closest('[role="tab"]');
    if (tab) select(tab);
  });

  select(getTabs().find((t) => t.getAttribute('aria-selected') === 'true') || getTabs()[0]);
}` },
          complexity: `<p>O(T) per interaction for T tabs (each select updates every tab); T is tiny, so it is effectively constant.</p>`,
          followUps: ['Implement manual activation (arrows move focus, Enter/Space selects) for tabs that load slow panels', 'How does this change for a vertical tab list (Up/Down keys, aria-orientation)?']
        }
      }
    ]
  });

  /* =====================================================================
     TOPIC 5 — Focus management: modals, focus trap, focus restore
     ===================================================================== */
  topics.push({
    title: 'Focus Management: Accessible Modals & the Focus Trap',
    analogy: `<p>A modal dialog is a <b>lift</b>. When you step in, the doors close: you can press the buttons inside, but you cannot wander off to the shop next door. Pressing the "open doors" button (<kbd>Esc</kbd>) lets you out, and you step out on <b>the same floor you came from</b>. A <b>focus trap</b> is the closed door; <b>focus restore</b> is stepping out on the right floor. If either is missing, keyboard users get lost: they tab into an invisible page behind the dialog, or end up at the top of the page after closing.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> When a dialog opens, three things must happen for keyboard and screen-reader users:</p>
      <ol>
        <li><b>Move focus into the dialog</b> (so they know it opened).</li>
        <li><b>Keep focus inside</b> while it is open (trap Tab and Shift+Tab; the page behind is "inert").</li>
        <li><b>Put focus back</b> where it was when the dialog closes (usually the button that opened it).</li>
      </ol>
      <p><b>Modal checklist (the 7 rules):</b></p>
      ${H.table(['#', 'Rule', 'How'], [
        ['1', 'It is announced as a dialog with a name', '<code>role="dialog"</code> (or <code>alertdialog</code>) + <code>aria-modal="true"</code> + <code>aria-labelledby="title-id"</code>'],
        ['2', 'Focus moves in on open', 'Focus the first control, or the dialog/heading for long text, or the safest button for a destructive confirm'],
        ['3', 'Tab cycles inside', 'On Tab at the last control → go to the first; on Shift+Tab at the first → go to the last'],
        ['4', 'Esc closes it', '<code>keydown</code> with <code>Escape</code> (and a visible Close button too)'],
        ['5', 'Page behind is unreachable', '<code>inert</code> attribute on siblings (or aria-hidden + the trap); lock body scroll'],
        ['6', 'Focus returns on close', 'Save <code>document.activeElement</code> before open, call <code>opener.focus()</code> after close'],
        ['7', 'Name and description are read', '<code>aria-describedby</code> for the message text of confirmations']
      ])}
      <p><b>🔵 The easy way: the native <code>&lt;dialog&gt;</code>.</b> Calling <code>dialog.showModal()</code> gives you rules 2, 4, 5 and (mostly) 6 <i>for free</i>: it puts the dialog in the browser's <b>top layer</b>, makes everything else inert, closes on <kbd>Esc</kbd>, and returns focus to the previously focused element on close. You still add a name (<code>aria-labelledby</code>) and the right initial focus. Use a custom trap only when you cannot use the native element.</p>
      <p><b>How a custom trap works:</b> collect the focusable elements inside the dialog (<code>button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])</code>), listen to <kbd>Tab</kbd> on the dialog, and when focus is on the last one (and Shift is not held) send it to the first; when on the first and Shift is held send it to the last. The list is shown as a <b>queue that wraps around</b> in the visualizer.</p>`,
    clues: [
      '"Modal" / "dialog" / "popup" / "lightbox" / "drawer" → focus in, trap, Esc, restore, labelled dialog',
      '"Tab goes to the page behind the modal" → missing trap or inert background',
      '"After closing, focus is lost / starts at the top" → forgot to restore focus to the opener',
      '"Confirm delete" → role=alertdialog, initial focus on the safe button (Cancel), not Delete',
      '"Can I use &lt;dialog&gt;?" → yes, showModal() is the first choice in 2026; all major browsers support it'
    ],
    code: [
      { lang: 'html', title: 'Native dialog: most of the work is free', code: `<button type="button" id="open-edit">Edit profile</button>

<dialog id="edit" aria-labelledby="edit-title">
  <h2 id="edit-title">Edit profile</h2>
  <form method="dialog">
    <label for="nm">Name</label>
    <input id="nm" name="nm" autocomplete="name">
    <!-- method="dialog" closes the dialog on submit; button value becomes dialog.returnValue -->
    <button value="cancel">Cancel</button>
    <button value="save">Save</button>
  </form>
</dialog>

<script>
  const dlg = document.getElementById('edit');
  document.getElementById('open-edit').addEventListener('click', () => dlg.showModal());
  // Esc, inert background, top-layer and focus restore are handled by the browser.
<\/script>` },
      { lang: 'js', run: true, title: 'The wrap-around rule of a focus trap (runnable)', code: `// Where should focus go when Tab (or Shift+Tab) is pressed inside a dialog?
function trapNext(index, count, shift) {
  if (count === 0) return -1;                       // nothing focusable: keep focus on the dialog itself
  if (index < 0) return shift ? count - 1 : 0;      // focus was outside: pull it in
  if (!shift) return index === count - 1 ? 0 : index + 1;   // last -> first
  return index === 0 ? count - 1 : index - 1;               // first -> last
}

const labels = ['Close', 'Name', 'Cancel', 'Save'];
let i = 0;
for (const shift of [false, false, false, false, true]) {
  i = trapNext(i, labels.length, shift);
  console.log((shift ? 'Shift+Tab' : 'Tab').padEnd(10), '->', labels[i]);
}` }
    ],
    codeTitle: ['Native dialog', 'Trap wrap-around'],
    viz: {
      title: 'Focus trap cycling inside a modal (queue)',
      input: 'Open Tab Tab Tab Tab Shift+Tab Escape',
      inputLabel: 'Keys: Open Tab Shift+Tab Escape',
      gen: function (input) {
        var keys = String(input).trim().split(/\s+/).filter(Boolean);
        var allowed = ['Open', 'Tab', 'Shift+Tab', 'Escape'];
        if (keys.length < 3 || keys.length > 14) throw new Error('Use 3 to 14 keys');
        keys.forEach(function (k) { if (allowed.indexOf(k) < 0) throw new Error('Unknown key "' + k + '". Use: ' + allowed.join(' ')); });
        var inside = ['Close X', 'Name field', 'Cancel', 'Save'];
        var page = ['Search', 'Cart', 'Edit profile (opener)'];
        var open = false, idx = -1, pageIdx = 2, frames = [];
        function parts() {
          var ih = {}, ph = {};
          if (open) { if (idx >= 0) ih[idx] = 'cur'; page.forEach(function (p, i) { ph[i] = 'done'; }); }
          else ph[pageIdx] = 'cur';
          return [
            { type: 'queue', label: 'Dialog: focusable elements (wraps around)', items: inside, hl: ih, frontLabel: 'first', backLabel: 'last' },
            { type: 'queue', label: open ? 'Page behind (inert: unreachable)' : 'Page', items: page, hl: ph },
            { type: 'vars', vals: { 'dialog open': open, 'focus is on': open ? (idx >= 0 ? inside[idx] : '-') : page[pageIdx] }, hl: { 'focus is on': 'cur', 'dialog open': open ? 'ok' : 'bad' } }
          ];
        }
        frames.push({ narr: 'The dialog is closed and focus is on the page button <b>Edit profile</b>. The queue on top lists everything focusable <b>inside</b> the dialog, front = first, back = last.', parts: parts() });
        keys.forEach(function (k) {
          var m;
          if (k === 'Open') {
            if (open) m = 'The dialog is already open. Nothing changes.';
            else { open = true; idx = 0; m = '<b>Open</b>: we remember the opener, make the page behind <b>inert</b>, and move focus to the <b>first</b> control: <b>' + inside[0] + '</b>.'; }
          } else if (k === 'Escape') {
            if (!open) m = '<b>Escape</b> with no dialog open does nothing.';
            else { open = false; idx = -1; m = '<b>Escape</b>: dialog closes, page becomes interactive again, and focus is <b>restored to the opener</b> (<b>Edit profile</b>). Without this, focus would drop to the top of the page.'; }
          } else if (!open) {
            m = '<b>' + k + '</b> moves through the normal page. No trap is needed while the dialog is closed.';
          } else if (k === 'Tab') {
            var wrap = idx === inside.length - 1;
            idx = wrap ? 0 : idx + 1;
            m = '<b>Tab</b>: ' + (wrap ? '<span class="c-y">we were on the LAST control, so we wrap to the FIRST</span> instead of leaving the dialog.' : 'move to the next control inside.') + ' Focus: <b>' + inside[idx] + '</b>.';
          } else {
            var wrap2 = idx === 0;
            idx = wrap2 ? inside.length - 1 : idx - 1;
            m = '<b>Shift+Tab</b>: ' + (wrap2 ? '<span class="c-y">we were on the FIRST control, so we wrap to the LAST</span>.' : 'move to the previous control.') + ' Focus: <b>' + inside[idx] + '</b>.';
          }
          frames.push({ narr: m, parts: parts() });
        });
        return frames;
      }
    },
    examples: [
      {
        title: 'Which element should get focus first?',
        html: `<p>"Move focus inside" is not always "focus the first button". Think about what the user needs next:</p>
          ${H.table(['Dialog type', 'Initial focus', 'Why'], [
            ['Form (edit profile)', 'The first input', 'The user wants to type right away'],
            ['Confirm delete (<code>alertdialog</code>)', 'The <b>Cancel</b> button', 'Avoid accidental destructive Enter presses'],
            ['Long terms / article in a dialog', 'The dialog container (<code>tabindex="-1"</code>) or its heading', 'So the screen reader starts at the top and users can scroll with keys'],
            ['Simple message with OK', 'The OK button', 'It is the only action']
          ])}
          <p>With native <code>&lt;dialog&gt;</code> you choose by adding the <code>autofocus</code> attribute to the right element.</p>`
      },
      {
        title: 'The "inert" attribute: hide the background in one line',
        html: `<p>Old tutorials set <code>aria-hidden="true"</code> on every sibling of the modal and hope nobody tabs into them. The modern fix is <code>inert</code>: one attribute that makes an element and its whole subtree <b>unfocusable, unclickable and hidden from assistive technology</b>. Put it on your app root (outside the dialog) while a custom modal is open.</p>`,
        code: { lang: 'js', code: `const app = document.getElementById('app');   // everything except the modal
function lockBackground(on) {
  app.inert = on;                              // not focusable, not clickable, not in the a11y tree
  document.body.style.overflow = on ? 'hidden' : ''; // stop the page scrolling under the modal
}` }
      },
      {
        title: 'A dialog that opens from a menu item that disappears',
        html: `<p>Edge case: the opener is inside a dropdown menu that closes when the dialog opens. After the dialog closes, <code>opener.focus()</code> does nothing because the opener is hidden or removed. A good implementation has a <b>fallback target</b>: the menu's trigger button, or the nearest stable heading. Rule: before restoring focus, check that the target is still in the document and visible; otherwise pick the fallback. Test this explicitly: open from every entry point, close with Esc, and ask "where is focus now?"</p>`,
        code: { lang: 'js', code: `function restoreFocus(opener, fallback) {
  const usable = opener && document.contains(opener) && !opener.hidden && opener.offsetParent !== null;
  (usable ? opener : fallback).focus();
}` }
      }
    ],
    deepDive: `<p><b>🟣 What <code>showModal()</code> really does.</b> The browser puts the dialog in the <b>top layer</b> (above all z-index), renders a <code>::backdrop</code>, makes the rest of the document <b>inert</b>, sets focus using the "dialog focusing steps" (first element with <code>autofocus</code>, else the first focusable descendant, else the dialog), closes on <kbd>Esc</kbd> firing <code>cancel</code> then <code>close</code> events, and restores focus to the previously focused element when closed. Browsers still differ on edge cases (focus restore after the opener was removed, nested dialogs, <code>autofocus</code> on non-form elements), so test.</p>
      <p><b>What goes wrong with custom traps.</b> (1) The list of focusable elements goes stale when content changes inside the dialog: query on each Tab, not once. (2) Hidden elements (<code>display:none</code>, <code>hidden</code>, disabled controls, <code>tabindex=-1</code>) must be excluded. (3) Radio groups count as one stop. (4) Iframes and shadow roots hide their focusables from <code>querySelectorAll</code>. (5) Using only a Tab handler allows the user to escape with a screen reader's virtual cursor, which is why modern guidance is <b>trap + inert + aria-modal</b>, not just one. (6) Libraries (Radix, React Aria, Headless UI, focus-trap) already solve these; in interviews, say "I would use <code>&lt;dialog&gt;</code> or a vetted library, and here is what it does".</p>
      <p><b>aria-modal and screen readers.</b> <code>aria-modal="true"</code> tells assistive tech that content outside is inert, and most screen readers now respect it, but support has historically been uneven, so keep <code>inert</code> as well. Do not put <code>aria-hidden</code> on an ancestor of the dialog. <b>Non-modal</b> dialogs (chat widget, inspector) do not trap focus but still need focus placement, a way to return, and a name. The newer <b>popover</b> attribute provides light-dismiss (Esc, click outside) and top-layer for menus and tooltips without a script, with focus returning to the invoker.</p>
      <p><b>Related focus jobs:</b> toasts must <i>not</i> steal focus (use live regions); inline expanding content keeps focus on the trigger; deleting an item should move focus to the next item or list heading (never let focus fall back to <code>body</code>); multi-step wizards move focus to the new step's heading. All of these follow one principle: <b>focus should never be lost to <code>&lt;body&gt;</code></b>, and every change that removes the focused element must place focus somewhere sensible.</p>`,
    aiEra: `<p><b>🤖 What AI changes.</b> Asked for "a modal component", an assistant often produces a fixed-position div with an overlay, a close button and nothing else: no role, no trap, no Esc, no restore, body still scrollable. It looks perfect in the screenshot, which is why it ships. Modern assistants know about <code>&lt;dialog&gt;</code> when you ask, but default to custom divs.</p>
      <p><b>Use AI as a partner:</b> prompt <code>Build this using native &lt;dialog&gt; and showModal(); list what the browser handles for me and what I must add</code>. Ask for a Playwright test: open, Tab 10 times asserting focus stays inside, press Esc, assert opener has focus. Ask it to review a custom trap for stale element lists and hidden-element filtering.</p>
      <p><b>Where AI goes wrong:</b> traps that query focusables once at open, no <code>e.preventDefault()</code> after moving focus (so the browser moves focus a second time), <code>autofocus</code> on the wrong element, <code>aria-hidden</code> on siblings with the dialog inside the same parent, and "restore focus" that runs before the dialog is actually removed. <b>What you must still own:</b> the open-trap-close-restore test on every entry point, and choosing initial focus by user need.</p>`,
    problems: [
      {
        title: 'Accessible Modal with Focus Trap',
        level: 'Hard', tags: ['modal', 'focus trap', 'dialog', 'a11y'], companies: ['Google', 'Atlassian', 'Stripe'],
        statement: `<p>Write <code>openModal(modal, opener)</code> for a custom modal element (a div with its content). It must: set <code>role="dialog"</code>, <code>aria-modal="true"</code>; move focus to the first focusable element (or the modal itself if none); trap <kbd>Tab</kbd>/<kbd>Shift+Tab</kbd> inside; close on <kbd>Esc</kbd>; make the rest of the page inert while open; and on close restore focus to <code>opener</code>. Return a <code>close()</code> function that cleans up all listeners.</p>`,
        constraints: `Focusable elements may change while the modal is open. Disabled and hidden elements must be skipped. No libraries.`,
        example: `<p>Modal contains: <code>[Close] [Name input] [Cancel] [Save]</code>.</p>
          <p>${H.c('g', 'Open → focus on Close')} · Tab ×3 → Save · Tab → ${H.c('y', 'wraps to Close')} · Shift+Tab → ${H.c('y', 'wraps to Save')} · Esc → ${H.c('g', 'focus back on the opener button')}.</p>`,
        brute: { why: `<p>Showing a div with a high z-index and a close button. Mouse users are fine. Keyboard users can Tab into the invisible page below, screen readers read the page behind, Esc does nothing, and after closing, focus is lost.</p>`, code: `function openModalBrute(modal) {
  modal.style.display = 'block';        // that is all: no role, no focus, no trap, no restore
  modal.querySelector('.close').onclick = () => { modal.style.display = 'none'; };
}` },
        mcq: { q: 'The user presses Shift+Tab while focus is on the FIRST control in the modal. What should happen?', options: ['Focus leaves the modal to the page behind', 'Focus moves to the LAST control in the modal', 'Nothing, the key is ignored', 'The modal closes'], answer: 1, explain: 'A focus trap wraps in both directions: Shift+Tab on the first element goes to the last, and Tab on the last goes to the first.' },
        hints: [
          `<p>Hint 1: you need three remembered things: the <b>opener</b>, a <b>keydown listener</b> on the modal, and which part of the page you made inert.</p>`,
          `<p>Hint 2: write <code>getFocusable()</code> that runs on <b>every</b> Tab press (content may change) and filters out disabled and hidden elements.</p>`,
          `<p>Hint 3: recipe: on open save opener, set inert on the app root, set role/aria-modal, focus first focusable. keydown: Escape → close; Tab → compute first/last; if Shift and active is first (or the modal) → focus last + preventDefault; if no Shift and active is last → focus first + preventDefault. close(): remove listener, un-inert, hide, <code>opener.focus()</code>.</p>`
        ],
        solution: {
          approach: `<p>A closure holds all state so <code>close()</code> can undo exactly what open did. Querying focusables on each Tab keeps the trap correct for dynamic content. Wrapping only at the boundaries (and letting the browser handle all other Tab presses) keeps native behaviour for the middle elements.</p>`,
          code: { lang: 'js', code: `const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

function openModal(modal, opener, appRoot = document.getElementById('app')) {
  function getFocusable() {
    return Array.from(modal.querySelectorAll(FOCUSABLE)).filter(
      (el) => !el.disabled && !el.hidden && el.offsetParent !== null // skip disabled/hidden
    );
  }

  function onKeydown(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    const items = getFocusable();
    if (items.length === 0) { e.preventDefault(); modal.focus(); return; } // nothing to tab to
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === modal)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
  }

  function close() {
    modal.removeEventListener('keydown', onKeydown);
    modal.hidden = true;
    if (appRoot) appRoot.inert = false;            // page is usable again
    document.body.style.overflow = '';
    if (opener && document.contains(opener)) opener.focus(); // give focus back
  }

  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.tabIndex = -1;                              // modal itself can hold focus as a fallback
  modal.hidden = false;
  if (appRoot) appRoot.inert = true;                // background: unfocusable + hidden from AT
  document.body.style.overflow = 'hidden';
  modal.addEventListener('keydown', onKeydown);
  (getFocusable()[0] || modal).focus();             // focus moves in
  return close;
}` },
          complexity: `<p>O(F) per Tab press for F focusable elements (a DOM query); open and close are O(1).</p>`,
          followUps: ['Replace the whole thing with native dialog.showModal(): what do you delete, what must you keep?', 'How do you support nested modals (a confirm on top of an edit dialog)?']
        }
      }
    ]
  });

  /* =====================================================================
     TOPIC 6 — Colour contrast and visual accessibility
     ===================================================================== */
  topics.push({
    title: 'Colour Contrast & Visual Accessibility (Computing the WCAG Ratio)',
    analogy: `<p>Contrast is the <b>volume gap</b> between a whisper and background noise. Light grey text on a white page is a whisper in a busy cafe: you can hear it in a quiet room (a bright monitor, young eyes) but lose it in sunlight, on a cheap phone, or with low vision. The WCAG <b>contrast ratio</b> is just a number that says how loud the text is compared with its background: <b>1:1</b> = identical (invisible), <b>21:1</b> = black on white (loudest possible).</p>`,
    explain: `<p><b>🟢 The plain idea.</b> Text must be easy to tell apart from its background. Roughly 1 in 12 men and 1 in 200 women have a colour-vision difference, many more people have low vision or age-related changes, and everybody meets glare. WCAG gives a <b>precise number</b>, so contrast is one of the few accessibility rules a tool can check exactly.</p>
      ${H.table(['What', 'Needs at least (AA)', 'AAA', 'SC'], [
        ['Normal text', '<b>4.5 : 1</b>', '7 : 1', '1.4.3 / 1.4.6'],
        ['Large text (24px+ regular, or 18.66px+ bold)', '<b>3 : 1</b>', '4.5 : 1', '1.4.3 / 1.4.6'],
        ['UI parts: input borders, icons that carry meaning, focus rings, chart lines', '<b>3 : 1</b> against neighbours', '-', '1.4.11'],
        ['Disabled controls, logos, pure decoration', 'No requirement', '-', 'exempt']
      ])}
      <p><b>🔵 How the ratio is computed (3 steps).</b></p>
      <ol>
        <li><b>Linearise each colour channel.</b> Take R, G, B as 0 to 255, divide by 255, then undo the screen's gamma curve: <code>c ≤ 0.04045 ? c/12.92 : ((c+0.055)/1.055)^2.4</code>.</li>
        <li><b>Relative luminance</b> L (0 = black, 1 = white): <code>L = 0.2126·R + 0.7152·G + 0.0722·B</code>. Green counts most because our eyes are most sensitive to it.</li>
        <li><b>Ratio</b> = <code>(L<sub>lighter</sub> + 0.05) / (L<sub>darker</sub> + 0.05)</code>. The 0.05 models stray light on a screen so black on black is 1, not infinity.</li>
      </ol>
      <p><b>Worked example.</b> Grey <code>#767676</code> on white. Channel 118 → 118/255 = 0.4627 → linear 0.1812. All three channels equal, so L = 0.1812. White has L = 1. Ratio = (1 + 0.05) / (0.1812 + 0.05) = 1.05 / 0.2312 = <b>4.54</b> → ${H.c('g', 'passes AA')} for normal text, just barely. <code>#777777</code> is 4.48 → ${H.c('r', 'fails')}. That is why <code>#767676</code> is famous: it is the lightest grey that passes on white.</p>
      <p><b>Not by colour alone (1.4.1).</b> Never use colour as the only signal: a red border for "error" is invisible to some users. Add an icon and text ("Email is not valid"). Links inside paragraphs need an underline (or a 3:1 colour difference from surrounding text plus a non-colour cue on hover and focus). Charts need patterns or direct labels.</p>
      <p><b>Other visual rules you must know:</b> text must resize to <b>200%</b> without loss (use <code>rem</code>/<code>em</code>, never block zoom); content must <b>reflow</b> at 320 CSS px width without horizontal scroll (1.4.10); users can override text spacing (1.4.12); don't use images of text (1.4.5); motion must respect <code>prefers-reduced-motion</code>; nothing flashes more than 3 times a second (2.3.1).</p>`,
    clues: [
      '"4.5:1" / "3:1" / "AA contrast" → text vs UI thresholds; know large text = 24px or 18.66px bold',
      '"Placeholder text is too light" / "disabled looks grey" → placeholders must pass 4.5:1; disabled is exempt but avoid unreadable',
      '"Error shown only in red" / "chart with red and green lines" → colour alone (1.4.1); add icon, text or pattern',
      '"Dark mode" / "brand colour fails" → test both themes; shift lightness (oklch L) until 4.5:1',
      '"Text over image / gradient" → measure the worst-case spot, or add a scrim/solid backing'
    ],
    code: [
      { lang: 'js', run: true, title: 'WCAG contrast-ratio calculator (runnable)', code: `// Parse "#rrggbb" or "#rgb" into [r, g, b] (0-255).
function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join(''); // #fff -> #ffffff
  if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error('Bad colour: ' + hex);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

// Step 1 + 2: linearise each channel, then weight by how bright the eye sees it.
function luminance([r, g, b]) {
  const lin = (v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

// Step 3: (lighter + 0.05) / (darker + 0.05)
function contrastRatio(fg, bg) {
  const a = luminance(hexToRgb(fg));
  const b = luminance(hexToRgb(bg));
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

// Large text = at least 24px, or at least 18.66px (14pt) and bold.
function grade(fg, bg, px = 16, bold = false) {
  const ratio = contrastRatio(fg, bg);
  const large = px >= 24 || (bold && px >= 18.66);
  return {
    ratio: Math.round(ratio * 100) / 100,
    AA: ratio >= (large ? 3 : 4.5),
    AAA: ratio >= (large ? 4.5 : 7)
  };
}

console.log('#767676 on white', grade('#767676', '#ffffff'));
console.log('#777777 on white', grade('#777777', '#ffffff'));
console.log('#999 on white (24px)', grade('#999', '#fff', 24));
console.log('black on white', grade('#000', '#fff'));` },
      { lang: 'css', title: 'Respect user preferences (dark, contrast, motion, forced colours)', code: `:root { --text: #1f2937; --bg: #f9fafb; --link: #0b57d0; }       /* 14:1 and 6.4:1 on --bg */

@media (prefers-color-scheme: dark) {
  :root { --text: #e5e7eb; --bg: #111827; --link: #8ab4f8; }       /* re-check ratios in dark! */
}
@media (prefers-contrast: more) {
  :root { --text: #000; --bg: #fff; --link: #0000ee; }             /* user asked for stronger contrast */
}
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
@media (forced-colors: active) {
  :focus-visible { outline: 2px solid CanvasText; }                /* system colours: keep outlines */
}
a { color: var(--link); text-decoration: underline; }               /* not colour alone */` }
    ],
    codeTitle: ['Contrast calculator', 'User preference media queries'],
    viz: {
      title: 'Computing a WCAG contrast ratio, step by step',
      input: '#767676 #ffffff 16',
      inputLabel: 'foreground background [font px] [bold]  e.g. #777 #fff 16 bold',
      gen: function (input) {
        var t = String(input).trim().split(/\s+/);
        if (t.length < 2) throw new Error('Give two colours, e.g. #767676 #ffffff 16');
        var fg = hex2rgb(t[0]), bg = hex2rgb(t[1]);
        var px = t[2] && t[2] !== 'bold' ? parseFloat(t[2]) : 16;
        if (isNaN(px) || px < 8 || px > 96) throw new Error('Font size must be 8 to 96 px');
        var bold = t.indexOf('bold') >= 0;
        var large = px >= 24 || (bold && px >= 18.66);
        var Lf = lum(fg), Lb = lum(bg);
        var lighter = Math.max(Lf, Lb), darker = Math.min(Lf, Lb);
        var ratio = (lighter + 0.05) / (darker + 0.05);
        var frames = [];
        frames.push({ narr: 'We test text colour <b>' + t[0] + '</b> on background <b>' + t[1] + '</b>, at <b>' + px + 'px' + (bold ? ' bold' : '') + '</b>. That counts as <b>' + (large ? 'large' : 'normal') + ' text</b> (large = 24px, or 18.66px bold), so the AA bar is <b>' + (large ? '3' : '4.5') + ' : 1</b>.', parts: [
          { type: 'vars', vals: { foreground: t[0], background: t[1], 'font size': px + 'px' + (bold ? ' bold' : ''), 'text class': large ? 'large' : 'normal' } }
        ] });
        frames.push({ narr: '<b>Step 1a.</b> Split each colour into red, green, blue (0 to 255), then divide by 255 to get 0 to 1.', parts: [
          { type: 'table', label: 'Channels', columns: ['Colour', 'R', 'G', 'B'], rows: [
            ['text 0-255', fg[0], fg[1], fg[2]], ['text 0-1', r4(fg[0] / 255), r4(fg[1] / 255), r4(fg[2] / 255)],
            ['background 0-255', bg[0], bg[1], bg[2]], ['background 0-1', r4(bg[0] / 255), r4(bg[1] / 255), r4(bg[2] / 255)]
          ], hl: { 1: 'win', 3: 'win' } }
        ] });
        frames.push({ narr: '<b>Step 1b.</b> Undo the screen gamma: if c ≤ 0.04045 use c / 12.92, else ((c + 0.055) / 1.055)<sup>2.4</sup>. This turns "number on the screen" into "amount of light".', parts: [
          { type: 'table', label: 'Linear light', columns: ['Colour', 'R', 'G', 'B'], rows: [
            ['text linear', r4(lin(fg[0])), r4(lin(fg[1])), r4(lin(fg[2]))],
            ['background linear', r4(lin(bg[0])), r4(lin(bg[1])), r4(lin(bg[2]))]
          ], hl: { 0: 'cur', 1: 'cur' } }
        ] });
        frames.push({ narr: '<b>Step 2.</b> Relative luminance: L = 0.2126·R + 0.7152·G + 0.0722·B. Green is weighted the most because the eye is most sensitive to it.', parts: [
          { type: 'vars', vals: { 'L (text)': r4(Lf), 'L (background)': r4(Lb), weights: '0.2126 / 0.7152 / 0.0722' }, hl: { 'L (text)': 'cur', 'L (background)': 'cur' } }
        ] });
        frames.push({ narr: '<b>Step 3.</b> Ratio = (lighter + 0.05) / (darker + 0.05) = (' + r4(lighter) + ' + 0.05) / (' + r4(darker) + ' + 0.05) = <b>' + r2(ratio) + ' : 1</b>.', parts: [
          { type: 'vars', vals: { lighter: r4(lighter), darker: r4(darker), 'ratio': r2(ratio) + ' : 1' }, hl: { ratio: 'sel' } }
        ] });
        var need = large ? [3, 4.5] : [4.5, 7];
        var tests = [
          ['AA normal text', 4.5], ['AA large text', 3], ['AAA normal text', 7], ['AAA large text', 4.5], ['UI component (1.4.11)', 3]
        ];
        var hl = {};
        var rows = tests.map(function (x, i) { var pass = ratio >= x[1]; hl[i] = pass ? 'ok' : 'bad'; return [x[0], x[1] + ' : 1', r2(ratio) + ' : 1', pass ? 'PASS' : 'FAIL']; });
        frames.push({ narr: 'Compare the ratio with every WCAG bar. For this text size the ones that matter are <b>AA ' + (large ? 'large' : 'normal') + ' text (' + need[0] + ' : 1)</b> and AAA ' + (large ? 'large' : 'normal') + ' text (' + need[1] + ' : 1).', parts: [
          { type: 'table', label: 'Pass or fail', columns: ['Level', 'Needs', 'You have', 'Result'], rows: rows, hl: hl }
        ] });
        var passAA = ratio >= need[0];
        frames.push({ narr: passAA
          ? '<span class="c-g">Verdict: passes AA</span> for ' + (large ? 'large' : 'normal') + ' text' + (ratio >= need[1] ? ' and even AAA.' : ' (but not AAA).') + (ratio < need[0] + 0.1 ? ' It is only just above the line, so check dark mode and semi-transparent backgrounds too.' : '')
          : '<span class="c-r">Verdict: fails AA.</span> You need ' + need[0] + ' : 1 but have ' + r2(ratio) + ' : 1. Darken the text (or lighten the background) until the ratio reaches the bar, or make the text bigger/bolder to qualify as large.',
          parts: [{ type: 'vars', vals: { ratio: r2(ratio) + ' : 1', 'AA needs': need[0] + ' : 1', verdict: passAA ? 'PASS' : 'FAIL' }, hl: { verdict: passAA ? 'ok' : 'bad' } }] });
        return frames;
      }
    },
    examples: [
      {
        title: 'The famous #767676: the lightest grey that passes on white',
        html: `<p>Designers love light grey text. Here is how close the line is (all on white <code>#ffffff</code>):</p>
          ${H.table(['Text colour', 'Ratio', 'Normal text AA (4.5)', 'Large text AA (3)'], [
            ['<code>#595959</code>', '7.00', H.c('g', 'pass (AAA too)'), H.c('g', 'pass')],
            ['<code>#767676</code>', '4.54', H.c('g', 'pass'), H.c('g', 'pass')],
            ['<code>#777777</code>', '4.48', H.c('r', 'fail by 0.02!'), H.c('g', 'pass')],
            ['<code>#949494</code>', '3.03', H.c('r', 'fail'), H.c('g', 'pass')],
            ['<code>#999999</code>', '2.85', H.c('r', 'fail'), H.c('r', 'fail')]
          ])}
          <p>Lesson: you cannot judge by eye. A tiny change flips pass to fail, so always compute.</p>`
      },
      {
        title: 'Fixing a brand colour that fails',
        html: `<p>The brand orange <code>#ff7a00</code> looks great, but white text on it is <b>2.61 : 1</b> (fail). Options that keep the brand feeling:</p>
          ${H.table(['Fix', 'Result', 'Ratio'], [
            ['Use <b>black</b> text on the orange', 'Dark on bright orange', H.c('g', '8.04 : 1')],
            ['Darken the orange to <code>#c24e00</code> for buttons with white text', 'Deeper burnt orange', H.c('g', '4.79 : 1')],
            ['Keep the bright orange for large decoration only', 'Not carrying text', 'n/a']
          ])}
          <p>Good design systems store tokens in pairs (<code>--on-primary</code> for the text colour that sits on <code>--primary</code>) and check each pair in CI.</p>`
      },
      {
        title: 'Colour alone: the error message',
        html: `<p>Bad: the input border turns red. A colour-blind user, a user in a grayscale low-power mode, and a screen-reader user all get no signal. Good: red border <b>plus</b> an icon <b>plus</b> text linked with <code>aria-describedby</code>, and <code>aria-invalid="true"</code>.</p>`,
        code: { lang: 'html', code: `<label for="email">Email</label>
<input id="email" type="email" aria-invalid="true" aria-describedby="email-err">
<p id="email-err" class="error">
  <svg aria-hidden="true" width="16" height="16">...</svg>
  Enter an email like name@example.com
</p>` }
      }
    ],
    deepDive: `<p><b>🟣 Details that matter.</b> <b>Opacity and alpha:</b> contrast is measured on the <i>final rendered</i> colours, so <code>rgba(0,0,0,0.5)</code> text on a coloured card must be composited first; tools often fail here. <b>Gradients and images:</b> test the worst pixel region; add a solid or semi-opaque scrim behind text. <b>Hover/focus/active states</b> need their own check. <b>Placeholders, icons that are the only label, and selected-tab indicators</b> are frequent misses (1.4.11 is about <i>needed to understand</i> the control). The WCAG formula uses the sRGB transfer curve; the old threshold constant 0.03928 became 0.04045 in later errata, and the difference never changes an 8-bit result.</p>
      <p><b>Limits of the WCAG 2 ratio.</b> It treats light-on-dark and dark-on-light symmetrically, ignores font weight and size (except the large-text switch), and can mislead for mid-tone colours: a pair that passes 4.5 can be hard to read in dark mode. <b>APCA</b> (the Accessible Perceptual Contrast Algorithm, proposed for WCAG 3) outputs a Lc score that depends on polarity, size and weight. It is a draft: legal compliance today is still the WCAG 2 ratio, so many teams check <i>both</i> and satisfy the stricter one.</p>
      <p><b>Building accessible palettes.</b> Perceptual colour spaces such as <b>OKLCH</b> let you pick a hue and chroma and slide lightness predictably (L 0.45 vs 0.95 gives about 6 to 7:1 for most hues). Design systems generate ramps (50 to 900) and a rule like "step 600 or darker on white passes AA". CSS <code>color-mix()</code> and relative colour syntax help derive hover shades; <code>light-dark()</code> picks values per scheme. The CSS <code>color-contrast()</code> function was proposed but is not widely shipped; compute in build tools (e.g. Colorjs.io, culori) or test in CI with axe.</p>
      <p><b>Zoom, reflow and text spacing.</b> Use relative units so browser zoom and user font-size settings work (1.4.4 requires 200% text resize). At 400% zoom a 1280px viewport behaves like 320px, so layouts must collapse to one column (1.4.10 Reflow) except for maps, tables and similar two-dimensional content. 1.4.12 requires that line-height 1.5, paragraph spacing 2×, letter spacing 0.12em and word spacing 0.16em do not clip or overlap text: avoid fixed-height containers for text. <b>Target size</b> (2.5.8, 24×24 CSS px minimum; 44×44 recommended for touch) is also a visual-motor rule. Test with Windows High Contrast / <code>forced-colors</code>, because <code>background-image</code> icons and <code>box-shadow</code> borders disappear there.</p>`,
    aiEra: `<p><b>🤖 What AI changes.</b> Vision models can now "look" at a screenshot and say "this text seems low contrast", but they estimate by perception, not by the formula, and they are often wrong at the 4.4 versus 4.6 boundary. Generated palettes and Tailwind-style UIs frequently use <code>text-gray-400</code> on white (2.5 : 1) because it looks "modern". AI colour pickers that output pretty pastel themes need a contrast gate behind them.</p>
      <p><b>Use AI as a partner:</b> ask <code>Write a Node script that reads my CSS variables and prints the WCAG ratio for every text/background pair in light and dark mode</code> (you now know the formula, so you can verify it). Ask it to propose three AA-passing alternatives for a failing brand colour with the smallest hue shift, then <i>check the numbers yourself</i>. Wire axe or Lighthouse into CI so regressions fail the build.</p>
      <p><b>Where AI goes wrong:</b> it says "this has good contrast" with no computation, forgets dark mode and hover states, treats placeholder text as exempt, and suggests <code>opacity: 0.6</code> on text (which lowers contrast silently). <b>What you must still own:</b> the contrast tokens policy, testing real devices in sunlight and with colour-blindness simulators, and making sure meaning never depends on colour alone.</p>`,
    problems: [
      {
        title: 'WCAG Contrast Ratio Calculator',
        level: 'Medium', tags: ['contrast', 'wcag', 'math'], companies: ['Google', 'Adobe', 'Deque'],
        statement: `<p>Implement <code>contrastRatio(fg, bg)</code> that takes two hex colours (<code>#rgb</code> or <code>#rrggbb</code>) and returns the WCAG 2 contrast ratio as a number rounded to 2 decimals. Then implement <code>passesAA(fg, bg, px, bold)</code> that applies the right threshold: 4.5 for normal text, 3 for large text (24px or more, or 18.66px or more when bold).</p>`,
        constraints: `Input is always a valid 3 or 6 digit hex colour with a leading #. Output ratio range is 1 to 21.`,
        example: `<p><code>contrastRatio('#767676', '#ffffff')</code> → <b>4.54</b> · <code>contrastRatio('#000', '#fff')</code> → <b>21</b></p>
          <p><code>passesAA('#777777','#ffffff',16,false)</code> → ${H.c('r', 'false')} (4.48 &lt; 4.5) · same colours at 24px → ${H.c('g', 'true')} (4.48 ≥ 3).</p>`,
        brute: { why: `<p>Comparing "brightness" with the average of R, G and B, or with the grey value, ignores that green is far brighter to the eye than blue and skips gamma. Pairs like pure blue on black look "fine" by average but fail badly.</p>`, code: `function brightnessGuess(fg, bg) {
  // WRONG: averages raw 0-255 values, no gamma, no eye weighting
  const avg = (h) => { const n = parseInt(h.slice(1), 16); return ((n >> 16) + ((n >> 8) & 255) + (n & 255)) / 3; };
  return Math.abs(avg(fg) - avg(bg)) / 255 * 21;
}` },
        mcq: { q: 'Why does the formula add 0.05 to both luminances?', options: ['To avoid division by zero for black and to model ambient screen light', 'To convert to percentages', 'Because green is brighter than red', 'To round the result'], answer: 0, explain: 'The 0.05 offset models flare/ambient light and also keeps black from making the ratio infinite.' },
        hints: [
          `<p>Hint 1: ratio needs <b>relative luminance</b> of each colour first; luminance needs <b>linear</b> channels, not raw 0 to 255.</p>`,
          `<p>Hint 2: three small helpers: <code>hexToRgb</code>, <code>luminance</code>, <code>contrastRatio</code>. The ratio always puts the lighter luminance on top (use max and min).</p>`,
          `<p>Hint 3: recipe: expand #rgb to #rrggbb; channels = parseInt pairs; lin(c) = c/255 ≤ 0.04045 ? c/255/12.92 : ((c/255 + 0.055)/1.055)^2.4; L = 0.2126R + 0.7152G + 0.0722B; ratio = (max+0.05)/(min+0.05). Large text = px ≥ 24 || (bold && px ≥ 18.66).</p>`
        ],
        solution: {
          approach: `<p>Translate the spec directly. Keep the unrounded ratio for the pass/fail comparison and round only for display, otherwise 4.495 would round to 4.5 and wrongly pass.</p>`,
          code: { lang: 'js', run: true, code: `function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

function luminance(rgb) {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function rawRatio(fg, bg) {
  const a = luminance(hexToRgb(fg)), b = luminance(hexToRgb(bg));
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const contrastRatio = (fg, bg) => Math.round(rawRatio(fg, bg) * 100) / 100;

function passesAA(fg, bg, px, bold) {
  const large = px >= 24 || (bold && px >= 18.66);
  return rawRatio(fg, bg) >= (large ? 3 : 4.5); // compare the UNROUNDED value
}

console.log(contrastRatio('#767676', '#ffffff'));  // 4.54
console.log(contrastRatio('#000', '#fff'));        // 21
console.log(passesAA('#777777', '#ffffff', 16, false)); // false
console.log(passesAA('#777777', '#ffffff', 24, false)); // true` },
          dry: { head: ['step', '#767676', '#ffffff'], rows: [['channel / 255', '0.4627', '1'], ['linear', '0.1812', '1'], ['luminance L', '0.1812', '1.0000'], ['ratio', '(1 + 0.05) / (0.1812 + 0.05)', '= 4.54']] },
          complexity: `<p>O(1): a fixed number of arithmetic operations.</p>`,
          followUps: ['Make a function that finds the closest passing text colour by lowering lightness in steps', 'Handle semi-transparent foreground colours by compositing over the background first']
        }
      }
    ]
  });

  /* =====================================================================
     TOPIC 7 — Accessible forms: labels, groups, hints, errors
     ===================================================================== */
  topics.push({
    title: 'Accessible Forms: Labels, Groups, Hints & Errors',
    analogy: `<p>A paper form at a government office has printed text above every box: "Full name", "Date of birth". Now imagine the same form where the words are <b>written in pencil inside the box</b> and vanish the moment you start writing. Someone helping you (a screen reader) sees only blank boxes, and you forget what each box asked. That is a <b>placeholder used as a label</b>. A real <code>&lt;label&gt;</code> is the printed text that stays, is tied to the box, and can be clicked to jump into it.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> Forms are where users do the important things: sign up, pay, book. A form is accessible when each field has a <b>name</b> (label), a <b>role</b> (what kind of input), the right <b>state</b> (required, invalid), and extra <b>help</b> (hints and errors) that assistive tech reads at the right moment.</p>
      ${H.table(['Need', 'Do this', 'Not this'], [
        ['Name every field', '<code>&lt;label for="email"&gt;Email&lt;/label&gt;&lt;input id="email"&gt;</code>', 'placeholder only, or a separate div beside the input'],
        ['Group related fields', '<code>&lt;fieldset&gt;&lt;legend&gt;Delivery speed&lt;/legend&gt;...</code>', 'A bold div above the radios'],
        ['Add a hint', '<code>aria-describedby="hint-id"</code> pointing at the hint text', 'Hint only as a tooltip on hover'],
        ['Mark required', '<code>required</code> + visible text like "(required)"', 'A red asterisk with no explanation'],
        ['Show an error', 'Text near the field + <code>aria-invalid="true"</code> + <code>aria-describedby</code>', 'Red border only'],
        ['Help autofill', '<code>autocomplete="email"</code>, <code>"one-time-code"</code>, ...', 'autocomplete="off" on everything']
      ])}
      <p><b>🔵 How the browser connects things.</b> <code>for="email"</code> matches the input's <code>id="email"</code>. You can also <b>wrap</b> the input inside the label (no id needed). Either way the label text becomes the input's <b>accessible name</b> and a click on the label focuses the input (a bigger click target, great for checkboxes). <code>aria-describedby</code> adds a second string, the <b>description</b>, read after the name and state: "Password, edit text, required, At least 8 characters".</p>
      <p><b>Errors: the 4-part recipe.</b> (1) State the problem in <b>words</b> ("Enter an email like name@example.com", not "Invalid"). (2) Put it <b>next to the field</b>, linked with <code>aria-describedby</code>, and set <code>aria-invalid="true"</code>. (3) On submit, if several fields fail, show an <b>error summary</b> at the top (a heading plus links to each field), and move focus to it. (4) Never rely on colour alone, and don't erase what the user typed. This covers WCAG 3.3.1 Error Identification, 3.3.3 Error Suggestion and 3.3.4 Error Prevention (confirm or undo money/legal actions).</p>
      <p><b>Other form rules:</b> <b>autocomplete</b> tokens satisfy 1.3.5 (Identify Input Purpose); don't block <b>paste</b> in password fields or break password managers (3.3.8 Accessible Authentication); don't make users retype data they already gave (3.3.7); give buttons real names ("Create account", not "Submit"); avoid disabling the submit button, because a user cannot tell <i>why</i> it is disabled: let them press it and tell them what is missing.</p>`,
    clues: [
      '"Placeholder as label" / "floating label" → needs a real, persistent label; check the accessible name',
      '"Screen reader does not say what the field is for" → label association (for/id), fieldset/legend for groups',
      '"Validation message" / "inline error" → text + aria-invalid + aria-describedby, and an error summary with focus management',
      '"Radio buttons" / "checkbox group" / "date of birth with 3 inputs" → fieldset + legend',
      '"Autofill" / "password manager" / "OTP code" → autocomplete tokens (current-password, new-password, one-time-code)'
    ],
    code: [
      { lang: 'html', title: 'A fully accessible mini form', code: `<form novalidate aria-labelledby="signup-title">
  <h2 id="signup-title">Create your account</h2>

  <!-- Error summary: shown only after a failed submit, receives focus -->
  <div id="error-summary" role="alert" tabindex="-1" hidden>
    <h3>There is a problem</h3>
    <ul><li><a href="#email">Enter your email address</a></li></ul>
  </div>

  <div>
    <label for="email">Email <span class="req">(required)</span></label>
    <p id="email-hint" class="hint">We only use it to send your receipt.</p>
    <input id="email" name="email" type="email" required autocomplete="email"
           aria-describedby="email-hint email-err" aria-invalid="true">
    <p id="email-err" class="error"><svg aria-hidden="true" width="14" height="14"></svg>
       Enter an email like name@example.com</p>
  </div>

  <fieldset>
    <legend>Delivery speed</legend>
    <label><input type="radio" name="speed" value="std" checked> Standard (3-5 days)</label>
    <label><input type="radio" name="speed" value="exp"> Express (next day)</label>
  </fieldset>

  <label><input type="checkbox" name="news"> Send me product updates</label>

  <button type="submit">Create account</button>
</form>` },
      { lang: 'js', title: 'Show errors the accessible way (DOM)', code: `// On submit: validate, set state, build a summary, and move focus to it.
function showErrors(form, errors /* [{ id: 'email', msg: 'Enter your email' }] */) {
  const summary = form.querySelector('#error-summary');
  const list = summary.querySelector('ul');
  list.innerHTML = '';

  errors.forEach(({ id, msg }) => {
    const field = form.querySelector('#' + id);
    field.setAttribute('aria-invalid', 'true');
    const err = form.querySelector('#' + id + '-err');
    err.textContent = msg;                                    // text, not just colour
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#' + id;
    a.textContent = msg;
    li.appendChild(a);
    list.appendChild(li);
  });

  summary.hidden = errors.length === 0;
  if (errors.length) summary.focus();   // role="alert" + focus: screen reader reads the list
}` }
    ],
    codeTitle: ['Accessible mini form', 'Error summary logic'],
    viz: {
      title: 'What a screen reader says: bad form vs good form',
      input: 'good',
      inputLabel: 'Markup quality: good or bad',
      gen: function (input) {
        var mode = String(input).trim().toLowerCase();
        if (mode !== 'good' && mode !== 'bad') throw new Error('Type "good" or "bad"');
        var good = mode === 'good';
        var F = good ? [
          ['Email', '<label for="email">Email</label>\n<input id="email" type="email" required\n  aria-describedby="hint">', 'Email, edit text, required. We only use it for receipts.', true],
          ['Password', '<label for="pw">Password</label>\n<input id="pw" type="password" aria-invalid="true"\n  aria-describedby="pw-err">', 'Password, protected edit text, invalid entry. Use at least 8 characters.', true],
          ['Newsletter', '<label><input type="checkbox">\n  Send me updates</label>', 'Send me updates, checkbox, not checked.', true],
          ['Delivery', '<fieldset><legend>Delivery speed</legend>\n  <label><input type="radio" name="s"> Standard</label>', 'Delivery speed, group. Standard, radio button, 1 of 2, not checked.', true]
        ] : [
          ['Email', '<input placeholder="Email">', 'Edit text, blank. (Name comes only from the placeholder, gone once typing starts; no required, no hint.)', false],
          ['Password', '<input type="password" class="red-border">', 'Protected edit text. (The error is a red border: nothing is announced.)', false],
          ['Newsletter', '<div class="chk" onclick="toggle()"></div>\n<span>Send me updates</span>', 'Send me updates. (Plain text: no role, no state, not focusable.)', false],
          ['Delivery', '<b>Delivery speed</b>\n<input type="radio" name="s"> Standard', 'Radio button, checked. (No label link, no group name: user does not know what it is for.)', false]
        ];
        var frames = [], rows = [], hl = {};
        frames.push({ narr: 'We walk a form with a screen reader, field by field. The screen reader reads the <b>accessible name, role, state and description</b> that the browser computed from your markup. Good markup gives a full sentence; bad markup gives silence or guesses. Markup style: <b>' + mode + '</b>.', parts: [
          { type: 'table', label: 'What the screen reader says', columns: ['Field', 'Announcement', 'Verdict'], rows: [] }
        ] });
        F.forEach(function (f, i) {
          rows.push([f[0], f[2], f[3] ? 'clear' : 'broken']);
          hl[i] = f[3] ? 'ok' : 'bad';
          frames.push({ narr: 'Field <b>' + f[0] + '</b>: ' + (f[3] ? '<span class="c-g">every piece of information is there.</span> The label gives the name, the type gives the role, and the described-by text is read last.' : '<span class="c-r">information is missing.</span> A blind user cannot tell what to type or that something went wrong.'), parts: [
            { type: 'code', label: 'Markup', lang: 'html', code: f[1], hl: { 1: 'cur' } },
            { type: 'table', label: 'What the screen reader says', columns: ['Field', 'Announcement', 'Verdict'], rows: rows.map(function (r) { return r.slice(); }), hl: JSON.parse(JSON.stringify(hl)) }
          ] });
        });
        frames.push({ narr: good
          ? '<span class="c-g">All four fields are understandable.</span> Notice we used zero ARIA for the names (native label, fieldset) and only two ARIA attributes for state and description. Native first.'
          : '<span class="c-r">All four fields are broken.</span> Fixing them needs no new tools: add real labels, a fieldset/legend, a real checkbox, and error text linked with aria-describedby.', parts: [
          { type: 'table', label: 'Summary', columns: ['Field', 'Announcement', 'Verdict'], rows: rows, hl: hl },
          { type: 'vars', vals: { understandable: good ? '4 / 4' : '0 / 4' }, hl: { understandable: good ? 'ok' : 'bad' } }
        ] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Three honest ways to label an input',
        html: `<p>All three give the input the accessible name "Search". Pick the first when you can.</p>`,
        code: { lang: 'html', code: `<!-- 1. explicit: for + id (best, label is clickable) -->
<label for="q">Search</label>
<input id="q" type="search">

<!-- 2. implicit: wrap the input (no id needed) -->
<label>Search <input type="search"></label>

<!-- 3. no visible label allowed by design (e.g. a search icon button next to it): use aria-label -->
<input type="search" aria-label="Search">
<button type="submit">Search</button>` }
      },
      {
        title: 'Date of birth with three inputs: fieldset and legend',
        html: `<p>Three boxes (Day, Month, Year) each have their own label, but a screen-reader user also needs the <b>question</b>: "Date of birth". The <code>&lt;legend&gt;</code> is read together with each field name: "Date of birth, Day, edit text". Without a fieldset they hear only "Day" and have to guess. Same rule for radios and checkboxes: the legend is the question, each label is an answer. Also use <code>inputmode="numeric"</code> and <code>autocomplete="bday-day"</code> etc. to help phones and autofill.</p>`,
        code: { lang: 'html', code: `<fieldset>
  <legend>Date of birth</legend>
  <label for="d">Day</label>   <input id="d" inputmode="numeric" autocomplete="bday-day" size="2">
  <label for="m">Month</label> <input id="m" inputmode="numeric" autocomplete="bday-month" size="2">
  <label for="y">Year</label>  <input id="y" inputmode="numeric" autocomplete="bday-year" size="4">
</fieldset>` }
      },
      {
        title: 'When to show the error: submit, blur, or keystroke?',
        html: `<p>Announcing "Invalid email" after the very first typed letter is noisy and rude. Good defaults:</p>
          ${H.table(['Moment', 'Use for', 'Why'], [
            ['On submit (always)', 'Everything', 'Predictable; summary + focus; works with any assistive tech'],
            ['On blur (leaving the field)', 'Format checks (email, phone)', 'The user finished typing, so feedback is fair'],
            ['On keystroke', 'Password strength meter, username availability (debounced), character counter', 'Only when the live feedback helps while typing; announce through a polite live region with a delay'],
            ['Never', 'Errors on untouched fields', 'The user has not had a chance yet']
          ])}
          <p>Once a field has an error, re-validate it <b>on change</b> so the error clears as soon as it is fixed.</p>`
      }
    ],
    deepDive: `<p><b>🟣 Label mechanics.</b> A control can have <b>several</b> labels; their text is joined in DOM order. <code>aria-labelledby</code> can pull text from any elements (even hidden ones) and beats <code>&lt;label&gt;</code> in the name algorithm, which is handy for "Amount, in euros" built from two pieces. The label's click behaviour is built in: clicking it focuses a text input or toggles a checkbox. <code>aria-label</code> must be a <i>subset or equal</i> of the visible text for voice-control users (2.5.3 Label in Name): if the button says "Pay now", the name must contain "Pay now", not "Submit order".</p>
      <p><b>Constraint Validation API.</b> Native validation (<code>required</code>, <code>type=email</code>, <code>pattern</code>, <code>min</code>) sets states you can read: <code>input.validity.valueMissing</code>, <code>input.checkValidity()</code>, <code>input.setCustomValidity('message')</code>. The default browser bubbles are inconsistent across screen readers and cannot be styled, so many teams add <code>novalidate</code> to the form and render their own messages (using the same API for the logic, plus <code>aria-invalid</code> and <code>aria-describedby</code>). CSS <code>:user-invalid</code> (now broadly supported) styles invalid fields only after the user interacted, avoiding red-on-load. <code>aria-errormessage</code> exists but has weaker support than <code>aria-describedby</code>, so use describedby.</p>
      <p><b>Focus on submit.</b> Two accepted patterns: focus the <b>error summary</b> (GOV.UK pattern; lets users review all errors with links to fields), or focus the <b>first invalid field</b> (React Hook Form does this by default). Both must also make the message be <i>announced</i>: either the focused element contains the text, or a <code>role="alert"</code> region receives it. Do not do both at once or the user hears everything twice.</p>
      <p><b>Frameworks.</b> In React use <code>htmlFor</code> and <code>useId()</code> to generate stable unique ids (hard-coded ids collide when a component renders twice, silently breaking label links). Design-system inputs should <i>require</i> a label prop. Custom controls (date pickers, comboboxes, sliders) must follow the APG patterns; prefer native <code>&lt;input type="date"&gt;</code>, <code>&lt;select&gt;</code>, <code>&lt;datalist&gt;</code> where good enough, because they bring platform keyboard and screen-reader behaviour for free. <b>Password UX:</b> a "Show password" toggle is a button with <code>aria-pressed</code> (not a checkbox with a hidden label); allow paste; use <code>autocomplete="new-password"</code> / <code>current-password</code>. For one-time codes use <code>autocomplete="one-time-code"</code> and <code>inputmode="numeric"</code> (not six separate inputs, which break paste and screen readers).</p>`,
    aiEra: `<p><b>🤖 What AI changes.</b> Form generators love the "floating label" and "placeholder only" look. Many generated forms also skip <code>autocomplete</code>, use <code>div</code>s as checkboxes, and write validation messages like "Invalid input". At the same time, <b>AI agents that fill forms for people</b> (browser assistants, shopping agents) read the accessibility tree: a field with a real label and the right <code>autocomplete</code> token is filled correctly; a placeholder-only field is guessed. Accessible forms are now also <i>agent-friendly</i> forms, and autofill-friendly.</p>
      <p><b>Use AI as a partner:</b> paste a form and ask <code>List the accessible name, role, state and description of every control, as a screen reader would announce it</code>, then compare with the real DevTools Accessibility pane. Ask it to write specific, polite error messages ("Enter a date like 27 3 2026") and a Playwright test that submits an empty form and asserts that focus moves to the summary.</p>
      <p><b>Where AI goes wrong:</b> it gives <code>aria-label</code> and a visible label with different text, adds <code>aria-required</code> and <code>required</code> (harmless but redundant), forgets <code>aria-invalid</code> reset, disables the submit button until valid, and writes the same error into a live region and the focused summary (double announcement). <b>What you must still own:</b> the label audit, the error-flow design, and testing with a real screen reader on the happy and error paths.</p>`,
    problems: [
      {
        title: 'Label a Sign-Up Form Correctly',
        level: 'Easy', tags: ['forms', 'label', 'fieldset', 'aria-describedby'], companies: ['Shopify', 'Stripe'],
        statement: `<p>The sign-up form below is "pretty" but a screen reader says only "edit text" for the first two fields, hears no question for the radios, and gets no information about the password rule or the error. Rewrite the markup so that every control has a proper name, the radios are grouped with a question, the password rule is read as a description, and the invalid password is exposed with text (no colour only). Use native HTML first.</p>
          <pre>&lt;input placeholder="Email"&gt;
&lt;input type="password" placeholder="Password" class="red"&gt;
&lt;span&gt;Plan&lt;/span&gt;
&lt;input type="radio" name="plan"&gt; Free
&lt;input type="radio" name="plan"&gt; Pro
&lt;div class="btn" onclick="go()"&gt;Submit&lt;/div&gt;</pre>`,
        constraints: `No new JavaScript. Keep the visual labels visible. Use the fewest ARIA attributes possible.`,
        example: `<p>Screen reader before: ${H.c('r', '"edit text" · "protected edit text" · "radio button" · "Submit"')}</p>
          <p>After: ${H.c('g', '"Email, edit text, required" · "Password, protected edit text, invalid entry, Use at least 8 characters" · "Plan, group. Free, radio button, 1 of 2" · "Create account, button"')}</p>`,
        brute: { why: `<p>Adding <code>aria-label</code> to every input fixes names but hides the visible text from sighted voice-control users, doesn't group the radios, and leaves the div-button and the colour-only error.</p>`, code: { lang: 'html', code: `<input aria-label="Email" placeholder="Email">
<input type="password" aria-label="Password" class="red">
<input type="radio" name="plan" aria-label="Free">
<input type="radio" name="plan" aria-label="Pro">
<div class="btn" onclick="go()">Submit</div>` } },
        mcq: { q: 'Which element gives a group of radio buttons a spoken question?', options: ['A &lt;label&gt; around all radios', 'fieldset with legend', 'a div with aria-label', 'placeholder on the first radio'], answer: 1, explain: 'fieldset + legend is the native grouping pattern; the legend is read with each option so users know what the choice is about.' },
        hints: [
          `<p>Hint 1: placeholder text is not a label. Each input needs a <code>&lt;label for&gt;</code> that stays visible.</p>`,
          `<p>Hint 2: the radios share a question: wrap them in <code>fieldset</code> + <code>legend</code>. The rule and the error go in elements referenced by <code>aria-describedby</code>.</p>`,
          `<p>Hint 3: recipe: label+input pairs with matching id; password gets <code>aria-invalid="true"</code> and <code>aria-describedby="pw-rule pw-err"</code> with a text error; the clickable div becomes <code>&lt;button type="submit"&gt;</code> with a descriptive name.</p>`
        ],
        solution: {
          approach: `<p>Every fix uses a native element. ARIA appears only for the two things HTML cannot express: the description link (<code>aria-describedby</code>) and the invalid state (<code>aria-invalid</code>). The error has an icon and text, so colour is not the only signal.</p>`,
          code: { lang: 'html', code: `<form novalidate>
  <label for="email">Email <span class="req">(required)</span></label>
  <input id="email" type="email" required autocomplete="email">

  <label for="pw">Password <span class="req">(required)</span></label>
  <p id="pw-rule" class="hint">Use at least 8 characters.</p>
  <input id="pw" type="password" required autocomplete="new-password"
         aria-invalid="true" aria-describedby="pw-rule pw-err">
  <p id="pw-err" class="error">Error: your password has only 5 characters.</p>

  <fieldset>
    <legend>Plan</legend>
    <label><input type="radio" name="plan" value="free" checked> Free</label>
    <label><input type="radio" name="plan" value="pro"> Pro</label>
  </fieldset>

  <button type="submit">Create account</button>
</form>` },
          complexity: `<p>No runtime cost; the browser builds the accessibility tree from these elements. Time to verify: one pass with a screen reader or the DevTools Accessibility pane.</p>`,
          followUps: ['Add an error summary that receives focus after a failed submit', 'How would you handle a visually hidden label for a search input that has only an icon button beside it?']
        }
      }
    ]
  });

  /* =====================================================================
     TOPIC 8 — Screen readers, live regions, toasts, testing
     ===================================================================== */
  topics.push({
    title: 'Screen Readers, Live Regions & Testing Accessibility',
    analogy: `<p>A screen reader is a <b>tour guide who reads aloud only from the map the browser hands over</b> (the accessibility tree). It describes whatever you stand next to. But what if something changes <i>somewhere else</i> on the page, like "Item added to cart"? The guide cannot see it. A <b>live region</b> is a <b>loudspeaker</b> you installed at the station beforehand: anything you put on air is announced, politely (after the guide finishes the sentence) or urgently (interrupting). The classic mistake is to plug in the speaker and speak in the same instant: nobody hears the first words.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> A <b>screen reader</b> turns the page into speech (and braille). The main ones:</p>
      ${H.table(['Screen reader', 'Platform', 'Notes'], [
        ['<b>NVDA</b>', 'Windows', 'Free, very popular, test with Firefox and Chrome'],
        ['<b>JAWS</b>', 'Windows', 'Paid, widely used at work, Chrome/Edge'],
        ['<b>VoiceOver</b>', 'macOS, iOS', 'Built in; <kbd>Cmd+F5</kbd> on Mac; pair with Safari'],
        ['<b>TalkBack</b>', 'Android', 'Built in; Chrome'],
        ['<b>Narrator</b>', 'Windows', 'Built in; Edge']
      ])}
      <p>Users do <b>not</b> read the page top to bottom. They jump: by <b>headings</b> (<kbd>H</kbd>), <b>landmarks</b> (<kbd>D</kbd> in NVDA), <b>links</b> (<kbd>K</kbd>), <b>form fields</b> (<kbd>F</kbd>), <b>tables</b> (<kbd>T</kbd>), or open a list of all of them (the "elements list" or the VoiceOver <b>rotor</b>). So structure is navigation.</p>
      <p>For each thing it reaches, the screen reader says: <b>name · role · state · value · position</b>, e.g. "Checkout, button" or "Quantity, spin button, 2" or "Tab, 2 of 3, selected". It has two modes on desktop: <b>browse mode</b> (virtual cursor, letter keys jump around) and <b>focus/forms mode</b> (keys go to the form field). It switches automatically when you land on an input.</p>
      <p><b>🔵 Live regions: announcing changes you cannot focus.</b> Some updates happen without moving focus: "Saved", "3 results found", "Message sent", "Session expires in 1 minute". For these use a live region:</p>
      ${H.table(['Need', 'Use', 'Behaviour'], [
        ['Polite info (saved, results count, toast)', '<code>role="status"</code> (= <code>aria-live="polite"</code>)', 'Waits until the user is idle; does not interrupt'],
        ['Urgent error or warning', '<code>role="alert"</code> (= <code>aria-live="assertive"</code>)', 'Interrupts immediately; use rarely'],
        ['Chat log or activity feed', '<code>role="log"</code>', 'Polite; new items appended in order'],
        ['Custom control', '<code>aria-live="polite" aria-atomic="true"</code>', 'Whole region re-read on any change']
      ])}
      <p><b>The three golden rules of live regions:</b> (1) The region must <b>already exist in the DOM</b>, empty, before you put text in it; (2) only <b>change the text</b> to announce (a freshly inserted live region is often ignored); (3) keep announcements <b>short</b> and rare. Toasts must not steal focus; focus is only for things users must act on.</p>
      <p><b>Testing.</b> Automated tools (axe, Lighthouse) catch the mechanical issues. Then do the human passes: (1) unplug the mouse and use Tab/Enter/Space/Esc/arrows; (2) turn on NVDA or VoiceOver for your main flow with the screen off if you can; (3) zoom to 200% and 400%; (4) check high contrast and reduced motion; (5) ask disabled users for feedback.</p>`,
    clues: [
      '"Toast" / "snackbar" / "notification" / "Saved!" message → live region (role=status), no focus steal',
      '"Search results update as you type" / "filter applied" → polite live region announcing count',
      '"Screen reader does not announce the error" → inject into an existing role=alert region, or move focus to the message',
      '"How would you test accessibility?" → axe in CI + keyboard pass + NVDA/VoiceOver pass + zoom/contrast + user testing',
      '"Spinner / loading" → aria-busy or a status message "Loading results"; announce when done'
    ],
    code: [
      { lang: 'js', title: 'A reusable announcer (two persistent live regions)', code: `// Create the regions ONCE at app start, empty, so screen readers register them.
function createAnnouncer() {
  const make = (role, live) => {
    const el = document.createElement('div');
    el.setAttribute('role', role);
    el.setAttribute('aria-live', live);
    el.setAttribute('aria-atomic', 'true');
    el.className = 'sr-only';                 // visually hidden, still in the accessibility tree
    document.body.appendChild(el);
    return el;
  };
  const polite = make('status', 'polite');
  const assertive = make('alert', 'assertive');

  return function announce(message, level = 'polite') {
    const region = level === 'assertive' ? assertive : polite;
    region.textContent = '';                  // clear first so repeating the same text still counts
    setTimeout(() => { region.textContent = message; }, 50); // change AFTER the region is registered
  };
}

const announce = createAnnouncer();
// announce('Item added to cart');            // polite
// announce('Payment failed. Try again.', 'assertive'); // urgent` },
      { lang: 'js', run: true, title: 'Polite vs assertive: a speech queue simulator (runnable)', code: `// How a screen reader treats announcements (simplified model):
//  - polite    -> wait in line, spoken after the current speech
//  - assertive -> jump to the front and interrupt
function simulate(events) {
  const pending = [];
  for (const [kind, text] of events) {
    if (kind === 'assertive') pending.unshift(text); // cut in line
    else pending.push(text);                          // polite: back of the line
  }
  return pending; // order in which they will be spoken
}

const order = simulate([
  ['polite', '3 results found'],
  ['polite', 'Filters applied'],
  ['assertive', 'Session expires in 1 minute'],
  ['polite', 'Saved']
]);
order.forEach((t, i) => console.log((i + 1) + '. ' + t));` }
    ],
    codeTitle: ['Announcer helper', 'Speech queue model'],
    viz: {
      title: 'Screen-reader announcement sequence (polite vs assertive vs focus)',
      input: 'focus:Search, edit text|polite:3 results found|polite:Filters applied|assertive:Session expires in 1 minute|focus:Save, button',
      inputLabel: 'Events kind:text separated by | (kinds: focus, polite, assertive)',
      gen: function (input) {
        var evs = String(input).split('|').map(function (s) { return s.trim(); }).filter(Boolean).map(function (s) {
          var i = s.indexOf(':');
          if (i < 0) throw new Error('Each event looks like kind:text, e.g. polite:Saved');
          var kind = s.slice(0, i).trim().toLowerCase(), text = s.slice(i + 1).trim();
          if (['focus', 'polite', 'assertive'].indexOf(kind) < 0) throw new Error('Kind must be focus, polite or assertive (got "' + kind + '")');
          if (!text) throw new Error('Event text is empty');
          return { kind: kind, text: text };
        });
        if (evs.length < 3 || evs.length > 8) throw new Error('Use 3 to 8 events');
        var frames = [], pending = [], spoken = [];
        function qparts(hlIdx, note) {
          var hl = {};
          if (hlIdx !== undefined && hlIdx >= 0) hl[hlIdx] = note || 'cur';
          return [
            { type: 'queue', label: 'Speech queue (front = spoken next)', items: pending.map(function (p) { return p.text; }), hl: hl, frontLabel: 'next', backLabel: 'last' },
            { type: 'text', label: 'Already spoken', html: spoken.length ? spoken.map(function (t, i) { return (i + 1) + '. ' + H.esc(t); }).join('<br>') : '<span class="c-m">(nothing yet)</span>' }
          ];
        }
        frames.push({ narr: 'A burst of things happens on the page. The screen reader keeps a <b>speech queue</b>. <b>Polite</b> live regions go to the back. <b>Assertive</b> ones and <b>focus changes</b> cut in at the front.', parts: qparts() });
        evs.forEach(function (e) {
          var pos;
          if (e.kind === 'polite') { pending.push(e); pos = pending.length - 1; }
          else { pending.unshift(e); pos = 0; }
          var why = e.kind === 'polite' ? 'polite: waits at the <b>back</b> of the queue.' : e.kind === 'assertive' ? '<span class="c-r">assertive: jumps to the FRONT</span> and interrupts. Use only for urgent errors.' : 'focus moved: the new control is announced <b>immediately</b> (front of the queue).';
          frames.push({ narr: 'Event <b>' + e.kind + '</b> "' + H.esc(e.text) + '": ' + why, parts: qparts(pos, e.kind === 'polite' ? 'ok' : 'bad') });
        });
        var n = pending.length;
        for (var k = 0; k < n; k++) {
          var cur = pending.shift();
          spoken.push(cur.text);
          frames.push({ narr: 'The screen reader speaks #' + (k + 1) + ': "<b>' + H.esc(cur.text) + '</b>" (' + cur.kind + ').' + (k === 0 && cur.kind !== 'polite' ? ' It was added last but is spoken first.' : ''), parts: qparts() });
        }
        frames.push({ narr: 'The final spoken order is not the order things happened. Lesson: use <b>polite</b> for almost everything, reserve <b>assertive</b> for real emergencies, and never rely on a live message to deliver information that must be acted upon.', parts: qparts() });
        return frames;
      }
    },
    examples: [
      {
        title: 'The toast that nobody hears (and the fix)',
        html: `<p><b>Bug:</b> a React toast component mounts <code>&lt;div role="status"&gt;Saved&lt;/div&gt;</code> when you click Save. The live region and its text appear <i>at the same time</i>, so many screen readers say nothing. <b>Fix:</b> keep one <code>&lt;div role="status"&gt;</code> mounted at the top of the app, always, and set its text when saving finishes. Also keep the toast visible long enough (WCAG 2.2.1 Timing Adjustable): at least 5 to 8 seconds, pause on hover and focus, and provide a way to dismiss.</p>`,
        code: { lang: 'js', check: false, title: 'React: persistent live region', code: `function LiveRegion({ message }) {
  // Always rendered. Only the TEXT changes, so the change is announced.
  return <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">{message}</div>;
}

function App() {
  const [msg, setMsg] = React.useState('');
  async function save() {
    await api.save();
    setMsg('Settings saved');
    setTimeout(() => setMsg(''), 5000); // clear later so the same message can be announced again
  }
  return (<>
    <button onClick={save}>Save settings</button>
    <LiveRegion message={msg} />
  </>);
}` }
      },
      {
        title: 'Search results count: announce the outcome, not the typing',
        html: `<p>A filter updates the list as you type. Sighted users see the list change. A screen-reader user hears nothing. Add a polite status that says "<b>12 results</b>" after the user pauses (debounce ~500ms). Do <i>not</i> announce every keystroke or the whole list. For "no results", say it clearly: "No results for 'shoes red'. Try fewer words."</p>
          ${H.table(['Moment', 'Announcement', 'Region'], [
            ['Typing "sh"', '(nothing: still typing)', '-'],
            ['Pause after "shoes"', '12 results for shoes', 'role=status'],
            ['Server error', 'Search failed. Check your connection.', 'role=alert']
          ])}`
      },
      {
        title: 'Alt text decisions in 4 questions',
        html: `<p>Images are announced via <code>alt</code>. Ask: <b>is it decoration, information, an action, or complex data?</b></p>
          ${H.table(['Image', 'alt', 'Why'], [
            ['Decorative swirl', '<code>alt=""</code>', 'Empty alt makes the screen reader skip it (never omit the attribute)'],
            ['Photo of the product in a card that also has the product name', '<code>alt=""</code> or a short description', 'The name nearby already says it; avoid duplicates'],
            ['Magnifier icon inside a search button', 'alt on the image empty; name on the button', 'The <i>action</i> is "Search", not "magnifying glass"'],
            ['Sales chart', 'Short alt + data table or long description nearby', 'The info is the trend and numbers']
          ])}
          <p>Don't start with "Image of" or "Picture of": the role already says it's an image.</p>`
      }
    ],
    deepDive: `<p><b>🟣 How screen readers get their data.</b> The browser keeps the accessibility tree and sends it over platform APIs (UI Automation and IAccessible2 on Windows, NSAccessibility on macOS, AT-SPI on Linux, Android's accessibility node info). NVDA and JAWS build their own <b>virtual buffer</b> of the page so you can use browse mode; they refresh it on DOM mutation events. Large, frequently-mutating DOMs (live tickers, huge tables) can make this slow or cause "stuttering" speech, which is a real reason to virtualise long lists carefully (with <code>aria-rowcount</code>/<code>aria-setsize</code> and <code>aria-posinset</code> so position is still right).</p>
      <p><b>Live region details.</b> <code>aria-live="polite"</code> announces after the current speech; <code>"assertive"</code> interrupts; <code>"off"</code> is silent. <code>aria-atomic="true"</code> reads the whole region on any change (default false: only the changed nodes). <code>aria-relevant</code> (default <code>additions text</code>) controls what counts as a change. <code>role="alert"</code> implies assertive and atomic; <code>role="status"</code> implies polite and atomic. Browsers and screen readers differ: JAWS may need a short delay, VoiceOver on iOS sometimes ignores live regions inside off-screen containers made with <code>display:none</code> (use the sr-only clip technique, not <code>display:none</code> or <code>visibility:hidden</code>, because those remove the region from the tree and nothing is announced). Repeating the same exact text may not re-announce; clear it first or add an invisible changing suffix.</p>
      <p><b>Too many announcements = noise.</b> Debounce, de-duplicate, and queue them yourself. A good announcer batches ("3 messages") and never announces progress every 100ms. Respect user setting: some SR users disable live-region speech entirely. Don't put role=alert on page load for static content (it can be announced at the wrong time). For dialogs use <code>role="alertdialog"</code> with focus, not a bare alert. For loading states, <code>aria-busy="true"</code> on a region tells assistive tech to wait before reading updates; follow it with a polite "Results loaded".</p>
      <p><b>Testing matrix and speech viewers.</b> Pair screen reader and browser realistically: NVDA with Firefox and Chrome, JAWS with Chrome/Edge, VoiceOver with Safari (macOS and iOS), TalkBack with Chrome. The <b>NVDA Speech Viewer</b> and the VoiceOver caption panel show text of what is spoken, so you can test without sound. Automated: axe-core (jest-axe, @axe-core/playwright, cypress-axe), Lighthouse accessibility score (a subset of axe), Pa11y, Storybook a11y addon, <code>eslint-plugin-jsx-a11y</code>, and Testing Library queries by role. Playwright can snapshot the accessibility tree as YAML (<code>toMatchAriaSnapshot</code>), a nice regression test for structure. Real usability testing with disabled people catches what none of these tools do.</p>`,
    aiEra: `<p><b>🤖 What AI changes.</b> <b>AI now both consumes and produces accessibility information.</b> Vision-language models can describe images, so alt text drafts and live captions are cheap; but model-generated alt text is generic ("a person standing near a building"), cannot know the <i>purpose</i> in context, and may be wrong or biased. Meanwhile AI browser agents read the accessibility tree (roles, names, states, live-region text) to decide what to click, so a clean tree and meaningful announcements improve agent reliability, and a messy tree breaks both agents and screen-reader users in similar ways.</p>
      <p><b>Use AI as a partner:</b> have a model draft alt text, then edit it for purpose. Use an LLM to turn an axe JSON report into a prioritised fix list. Let it write the repetitive announcer and Playwright tests (for example, assert the status region text after save). Use it to simulate "what would a screen reader say here?" as a first pass, then confirm on a real screen reader.</p>
      <p><b>Where AI goes wrong:</b> it claims to "see" what a screen reader says (it does not run one), stuffs <code>aria-live="assertive"</code> everywhere, auto-generates verbose alt text on every decorative image, and trusts "overlay" tools that promise one-click compliance (these have been criticised by accessibility experts and regulators). <b>What you must still own:</b> deciding what deserves an announcement, human review of alt text, and the real screen-reader and user testing.</p>`,
    problems: [
      {
        title: 'Toast Messages with a Live Region',
        level: 'Medium', tags: ['live region', 'toast', 'aria-live', 'dom'], companies: ['Atlassian', 'Slack', 'Shopify'],
        statement: `<p>Build <code>createToaster(container)</code> returning <code>show(message, { type })</code> where <code>type</code> is <code>'info'</code> (default) or <code>'error'</code>. Toasts must be announced by screen readers without stealing focus: info goes to a persistent <code>role="status"</code> region, errors to a persistent <code>role="alert"</code> region. Showing the same message twice in a row must be announced twice. Toasts should also appear visually and be removable by a Close button, and must stay on screen at least 6 seconds.</p>`,
        constraints: `Create live regions once, not per toast. At most 3 visible toasts. No libraries.`,
        example: `<p><code>show('Settings saved')</code> → visual toast + status region reads ${H.c('g', '"Settings saved"')} (polite).</p>
          <p><code>show('Payment failed', {type:'error'})</code> → alert region reads ${H.c('r', '"Payment failed"')} immediately (assertive).</p>
          <p>Calling <code>show('Settings saved')</code> again → announced ${H.c('g', 'again')}.</p>`,
        brute: { why: `<p>Creating a new <code>&lt;div role="alert"&gt;</code> with the text already inside for each toast: the live region and its content appear in the same moment, so many screen readers skip it, and role=alert for a harmless "Saved" interrupts the user.</p>`, code: `function showBrute(container, message) {
  const t = document.createElement('div');
  t.setAttribute('role', 'alert');     // too loud, and created together with its text
  t.textContent = message;
  container.appendChild(t);
  setTimeout(() => t.remove(), 2000);  // vanishes in 2 seconds: too fast to read
}` },
        mcq: { q: 'Why create the live region before inserting the message text?', options: ['Screen readers announce CHANGES to a region they already know about', 'It makes the toast look nicer', 'Alerts only work on the first message', 'It avoids layout shift'], answer: 0, explain: 'Assistive tech registers live regions when they enter the accessibility tree. Text added at the same moment is often not treated as a change, so the region must exist (empty) first.' },
        hints: [
          `<p>Hint 1: split <b>announcing</b> from <b>showing</b>. Two hidden persistent regions do the announcing; the visible toast elements are plain elements with no live role, so they are not announced by themselves (and they keep a working Close button, because focusable elements must never sit inside <code>aria-hidden</code>).</p>`,
          `<p>Hint 2: to re-announce the same message, clear the region first and set the text on the next tick (<code>setTimeout</code> 50ms or <code>requestAnimationFrame</code>).</p>`,
          `<p>Hint 3: recipe: create status + alert regions with the sr-only class on setup. <code>show</code>: pick region by type, clear then set text; create the visual toast with a Close button, append (remove the oldest if more than 3), schedule removal after 6000ms, clear timers on manual close.</p>`
        ],
        solution: {
          approach: `<p>One set of persistent live regions does the announcing. The visual toasts are separate plain elements with no live role, so they cause no double announcements and you can style them freely. They must <b>not</b> be <code>aria-hidden</code> because they contain a focusable Close button (rule 4 of ARIA).</p>`,
          code: { lang: 'js', code: `function createToaster(container) {
  const mk = (role) => {
    const el = document.createElement('div');
    el.setAttribute('role', role);
    el.setAttribute('aria-atomic', 'true');
    el.className = 'sr-only';
    container.appendChild(el);
    return el;
  };
  const status = mk('status'); // polite
  const alertRegion = mk('alert'); // assertive
  const visible = document.createElement('div');   // visual stack: no live role, so no double speech
  container.appendChild(visible);

  function announce(region, message) {
    region.textContent = '';                                   // reset so repeats are heard
    setTimeout(() => { region.textContent = message; }, 50);   // change after registration
  }

  return {
    show(message, { type = 'info' } = {}) {
      announce(type === 'error' ? alertRegion : status, message);

      const toast = document.createElement('div');
      toast.className = 'toast toast-' + type;
      toast.textContent = message;
      const close = document.createElement('button');
      close.type = 'button';
      close.textContent = '\\u00d7';
      toast.appendChild(close);
      visible.appendChild(toast);
      while (visible.children.length > 3) visible.firstChild.remove();

      const timer = setTimeout(() => toast.remove(), 6000);    // WCAG 2.2.1: enough time
      close.addEventListener('click', () => { clearTimeout(timer); toast.remove(); });
    }
  };
}` },
          complexity: `<p>O(1) per toast; at most three visible nodes.</p>`,
          followUps: ['Pause the timer while the toast is hovered or focused', 'Debounce bursts: 20 "Saved" events in a second should announce once']
        }
      }
    ]
  });

  /* =====================================================================
     PRACTICE — Easy
     ===================================================================== */
  practice.push({
    title: 'Write the Right alt Text', level: 'Easy', tags: ['alt text', 'images', 'wcag 1.1.1'], companies: ['Amazon', 'Shopify'],
    statement: `<p>Write <code>altText(img)</code> that returns the correct <code>alt</code> string. An image object has <code>kind</code> (<code>'decorative'</code>, <code>'informative'</code> or <code>'functional'</code>), <code>description</code> (what it shows), <code>action</code> (what it does if it is functional, e.g. "Search") and optional <code>nearbyText</code> (visible text next to it). Rules: decorative → empty string; functional → the <b>action</b>, not the picture; informative → the description, but drop leading "image of", "picture of", "photo of"; and if the description is identical (ignoring case) to <code>nearbyText</code>, return an empty string to avoid reading it twice.</p>`,
    constraints: `kind is always one of the three values; strings may have extra spaces; at most 10<sup>4</sup> calls.`,
    example: `<p><code>{kind:'informative', description:'Photo of a red running shoe'}</code> → ${H.c('g', '"a red running shoe"')}</p>
      <p><code>{kind:'functional', description:'magnifier', action:'Search'}</code> → ${H.c('g', '"Search"')} · <code>{kind:'decorative'}</code> → ${H.c('g', '""')}</p>`,
    brute: { why: `<p>Always returning the description makes decorative swirls and magnifier icons noisy: users hear "magnifying glass" instead of "Search", and "Photo of..." repeats the word that the role "image" already says.</p>`, code: `function altBrute(img) { return img.description || ''; }` },
    mcq: { q: 'A decorative divider image should have...', options: ['alt="divider"', 'no alt attribute at all', 'alt="" (empty)', 'aria-label="decoration"'], answer: 2, explain: 'An empty alt tells screen readers to skip the image. A missing alt can make them read the file name.' },
    hints: [
      `<p>Hint 1: the answer depends on the image's <b>purpose</b>, so branch on <code>kind</code> first.</p>`,
      `<p>Hint 2: normalise with <code>trim()</code> and a small regex that removes a leading "image/picture/photo of".</p>`,
      `<p>Hint 3: recipe: decorative → ''. functional → action. informative → cleaned description; compare lower-cased with nearbyText; equal → ''.</p>`
    ],
    solution: {
      approach: `<p>One function with a branch per purpose. The cleaning regex is anchored at the start so a word like "photographer" in the middle is untouched.</p>`,
      code: { lang: 'js', run: true, code: `function altText(img) {
  if (img.kind === 'decorative') return '';
  if (img.kind === 'functional') return (img.action || '').trim();   // describe the ACTION

  const cleaned = (img.description || '')
    .trim()
    .replace(/^(image|picture|photo|graphic)\\s+of\\s+/i, '');       // role already says "image"
  const near = (img.nearbyText || '').trim().toLowerCase();
  if (near && cleaned.toLowerCase() === near) return '';           // avoid reading it twice
  return cleaned;
}

console.log(JSON.stringify(altText({ kind: 'informative', description: 'Photo of a red running shoe' })));
console.log(JSON.stringify(altText({ kind: 'functional', description: 'magnifier', action: 'Search' })));
console.log(JSON.stringify(altText({ kind: 'decorative', description: 'swirl' })));
console.log(JSON.stringify(altText({ kind: 'informative', description: 'Red shoe', nearbyText: 'red SHOE' })));` },
      complexity: `<p>O(L) in the length of the description; O(1) memory.</p>`,
      followUps: ['What alt text would you give a bar chart image?', 'How long should alt text be before you link a longer description?']
    }
  });

  practice.push({
    title: 'Pick the Right HTML Element', level: 'Easy', tags: ['semantic html', 'button vs link'], companies: ['Google', 'Meta'],
    statement: `<p>A design spec lists UI controls described by what they do. Write <code>pickElement(spec)</code> where <code>spec</code> has booleans <code>navigates</code> (goes to a URL), <code>submitsForm</code>, <code>toggles</code> (on/off state) and <code>expands</code> (shows/hides content). Return a short string with the element and the key attribute: <code>'a[href]'</code>, <code>'button[type=submit]'</code>, <code>'button[aria-pressed]'</code>, <code>'button[aria-expanded]'</code> or plain <code>'button[type=button]'</code>. Priority when several are true: submitsForm, then navigates, then expands, then toggles.</p>`,
    constraints: `All fields optional (missing means false).`,
    example: `<p><code>{navigates:true}</code> → <b>a[href]</b> · <code>{expands:true}</code> → <b>button[aria-expanded]</b> · <code>{}</code> → <b>button[type=button]</b></p>
      <p>${H.c('g', 'Links go somewhere; buttons do something here.')}</p>`,
    brute: { why: `<p>Making everything a <code>div</code> with an <code>onclick</code> is the shortcut that costs keyboard and screen-reader users the whole control.</p>`, code: `function pickBrute() { return 'div[onclick]'; }` },
    mcq: { q: 'A "Mute" control that flips between on and off should use...', options: ['a[href="#"]', 'button with aria-pressed', 'div with role=link', 'span with tabindex=1'], answer: 1, explain: 'A toggle is an action on the current page: a button, and aria-pressed exposes the on/off state.' },
    hints: [
      `<p>Hint 1: ask "does it leave the page / change URL?" Yes → link. Otherwise it's a button.</p>`,
      `<p>Hint 2: a button's state attribute depends on what kind of state: pressed (toggle) or expanded (disclosure).</p>`,
      `<p>Hint 3: follow the priority list exactly with early returns: submitsForm, navigates, expands, toggles, else the plain button.</p>`
    ],
    solution: {
      approach: `<p>A few early returns in priority order. The point is to practise the "link vs button" decision and to attach the right state attribute.</p>`,
      code: { lang: 'js', run: true, code: `function pickElement(spec = {}) {
  if (spec.submitsForm) return 'button[type=submit]';
  if (spec.navigates) return 'a[href]';
  if (spec.expands) return 'button[aria-expanded]';
  if (spec.toggles) return 'button[aria-pressed]';
  return 'button[type=button]';
}

console.log(pickElement({ navigates: true }));
console.log(pickElement({ expands: true }));
console.log(pickElement({ toggles: true }));
console.log(pickElement({ submitsForm: true, navigates: true }));
console.log(pickElement({}));` },
      complexity: `<p>O(1) time and space: a few early returns.</p>`,
      followUps: ['What about a link that opens a menu on this page?', 'When is a button that navigates (router push) acceptable?']
    }
  });

  practice.push({
    title: 'Which Contrast Ratio Do I Need?', level: 'Easy', tags: ['contrast', 'wcag 1.4.3'], companies: ['Adobe', 'Microsoft'],
    statement: `<p>Write <code>requiredRatio(px, bold, level)</code> that returns the minimum WCAG contrast ratio for text. <code>level</code> is <code>'AA'</code> or <code>'AAA'</code>. Large text is at least 24px, or at least 18.66px and bold. AA needs 4.5 (normal) or 3 (large); AAA needs 7 (normal) or 4.5 (large). Also write <code>passes(ratio, px, bold, level)</code>.</p>`,
    constraints: `px is a positive number; bold is boolean; level is exactly 'AA' or 'AAA'.`,
    example: `<p><code>requiredRatio(16,false,'AA')</code> → <b>4.5</b> · <code>requiredRatio(24,false,'AA')</code> → <b>3</b> · <code>requiredRatio(19,true,'AAA')</code> → <b>4.5</b></p>
      <p><code>passes(4.2, 16, false, 'AA')</code> → ${H.c('r', 'false')}.</p>`,
    brute: { why: `<p>Using one threshold of 4.5 for every size over-fails big headings; using 3 everywhere under-protects body text.</p>`, code: `function requiredBrute() { return 4.5; }` },
    mcq: { q: 'Bold text counts as "large" from what size?', options: ['14px', '18.66px (14pt)', '24px', '32px'], answer: 1, explain: 'WCAG defines large text as 18pt (24px) regular or 14pt (about 18.66px) bold.' },
    hints: [
      `<p>Hint 1: first decide "is this large text?" with one boolean.</p>`,
      `<p>Hint 2: keep a tiny table of the four numbers: AA large 3, AA normal 4.5, AAA large 4.5, AAA normal 7.</p>`,
      `<p>Hint 3: <code>passes</code> just compares: <code>ratio &gt;= requiredRatio(...)</code>. Do not round the ratio before comparing.</p>`
    ],
    solution: {
      approach: `<p>Make the large-text rule a small helper, then look up the threshold from a table instead of nesting ifs.</p>`,
      code: { lang: 'js', run: true, code: `const isLarge = (px, bold) => px >= 24 || (bold && px >= 18.66);

function requiredRatio(px, bold, level) {
  const table = { AA: { large: 3, normal: 4.5 }, AAA: { large: 4.5, normal: 7 } };
  return table[level][isLarge(px, bold) ? 'large' : 'normal'];
}

const passes = (ratio, px, bold, level) => ratio >= requiredRatio(px, bold, level);

console.log(requiredRatio(16, false, 'AA'), requiredRatio(24, false, 'AA'), requiredRatio(19, true, 'AAA'));
console.log(passes(4.2, 16, false, 'AA'), passes(4.2, 24, false, 'AA'));` },
      complexity: `<p>O(1) time and space: one table lookup.</p>`,
      followUps: ['What threshold applies to a 1px input border (UI component)?', 'Does the large-text rule apply to icons?']
    }
  });

  practice.push({
    title: 'Page Skeleton with Landmarks and a Skip Link', level: 'Easy', tags: ['landmarks', 'skip link', 'semantic html'], companies: ['GOV.UK', 'Atlassian'],
    statement: `<p>Write the HTML skeleton of a shop page with a logo, a main navigation, a search form, the main content with a heading, a "Related products" sidebar, and a footer. Requirements: a working <b>skip link</b> as the first focusable element, correct <b>landmarks</b> (banner, navigation, search, main, complementary, contentinfo), exactly one <code>h1</code>, a language on the document, and a distinct label on the navigation (there will be a second nav in the footer).</p>`,
    constraints: `Use native elements before ARIA. No JavaScript.`,
    example: `<p>Landmark list a screen reader should offer: ${H.c('g', 'banner · navigation "Primary" · search · main · complementary "Related products" · navigation "Footer" · contentinfo')}.</p>`,
    brute: { why: `<p>An all-div layout with class names has no landmarks, no skip link, and the screen reader user must tab through the whole header on every page.</p>`, code: { lang: 'html', code: `<div class="header"><div class="nav">...</div></div>
<div class="content"><div class="title">Shoes</div></div>
<div class="footer">...</div>` } },
    mcq: { q: 'Why does the second &lt;nav&gt; need an aria-label?', options: ['Browsers require it', 'So users can tell the two navigation landmarks apart', 'To make it focusable', 'It improves SEO ranking directly'], answer: 1, explain: 'When a page has two landmarks of the same type, each needs a unique accessible name ("Primary", "Footer") so the landmark list is meaningful.' },
    hints: [
      `<p>Hint 1: the skip link is just an <code>&lt;a href="#main"&gt;</code> placed first in <code>body</code>, hidden until focused.</p>`,
      `<p>Hint 2: <code>header</code>, <code>nav</code>, <code>search</code>/<code>form role=search</code>, <code>main</code>, <code>aside</code>, <code>footer</code> give the landmarks natively.</p>`,
      `<p>Hint 3: label repeated landmarks (<code>aria-label</code>), give the aside a name via <code>aria-labelledby</code> pointing at its heading, and put the id on <code>main</code>.</p>`
    ],
    solution: {
      approach: `<p>Every region maps to one native element. Names are only added where two landmarks of the same kind exist. The skip link target is <code>main</code> so keyboard users jump the header.</p>`,
      code: { lang: 'html', code: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Running shoes - Sole Shop</title>
  <style>
    .skip-link { position: absolute; left: -999px; top: 0; padding: 8px 12px; background: #fff; }
    .skip-link:focus { left: 8px; top: 8px; }
  </style>
</head>
<body>
  <a class="skip-link" href="#main">Skip to main content</a>

  <header>                                  <!-- banner landmark -->
    <a href="/" aria-label="Sole Shop home"><img src="logo.svg" alt="" width="32" height="32"> Sole Shop</a>
    <nav aria-label="Primary">              <!-- navigation landmark, named -->
      <ul>
        <li><a href="/men" aria-current="page">Men</a></li>
        <li><a href="/women">Women</a></li>
      </ul>
    </nav>
    <form role="search" action="/search">   <!-- search landmark -->
      <label for="q">Search products</label>
      <input id="q" name="q" type="search">
      <button type="submit">Search</button>
    </form>
  </header>

  <main id="main">                          <!-- main landmark (only one) -->
    <h1>Running shoes</h1>
    <p>Lightweight shoes for every distance.</p>
    <aside aria-labelledby="rel">           <!-- complementary landmark -->
      <h2 id="rel">Related products</h2>
      <ul><li><a href="/socks">Running socks</a></li></ul>
    </aside>
  </main>

  <footer>                                  <!-- contentinfo landmark -->
    <nav aria-label="Footer"><a href="/help">Help</a> <a href="/privacy">Privacy</a></nav>
    <p>&copy; 2026 Sole Shop</p>
  </footer>
</body>
</html>` },
      complexity: `<p>No runtime cost; verification is one pass with the screen reader's landmark list or the DevTools Accessibility pane.</p>`,
      followUps: ['Why is the aside inside main here, and when would you put it outside?', 'How would you add a "Skip to search" link as well?']
    }
  });

  /* =====================================================================
     PRACTICE — Medium
     ===================================================================== */
  practice.push({
    title: 'Pick Black or White Text for Any Background', level: 'Medium', tags: ['contrast', 'luminance', 'design tokens'], companies: ['Adobe', 'Figma', 'Google'],
    statement: `<p>Design systems let users pick any brand colour for buttons and badges. Write <code>bestTextColor(bg)</code> that returns <code>'#000000'</code> or <code>'#ffffff'</code>, whichever has the <b>higher WCAG contrast ratio</b> against the background hex colour (<code>#rgb</code> or <code>#rrggbb</code>). Break ties with black. Also write <code>textReport(bg)</code> returning <code>{ color, ratio, passesAA }</code> for normal text.</p>`,
    constraints: `Always valid hex input. Do not use the simple "brightness &gt; 128" shortcut.`,
    example: `<p><code>bestTextColor('#ff7a00')</code> → <b>#000000</b> (8.04 : 1 beats white's 2.61 : 1)</p>
      <p><code>bestTextColor('#1a73e8')</code> → <b>#000000</b> (4.66 : 1 beats white's 4.51 : 1). ${H.c('y', 'Compute carefully: white on blue feels obvious, but black wins here.')}</p>`,
    brute: { why: `<p>The common "if the average of R,G,B is above 128 use black" rule ignores gamma and the eye's green sensitivity, so it picks the lower-contrast colour for many mid-tone backgrounds (blues, oranges).</p>`, code: `function bestBrute(bg) {
  const n = parseInt(bg.replace('#', ''), 16);
  const avg = ((n >> 16) + ((n >> 8) & 255) + (n & 255)) / 3;
  return avg > 128 ? '#000000' : '#ffffff'; // guess, not the WCAG ratio
}` },
    mcq: { q: 'Which colour has relative luminance 0?', options: ['#000000', '#808080', '#ffffff', '#0000ff'], answer: 0, explain: 'Black has luminance 0 and white 1, which is why black on white gives the maximum ratio (1.05 / 0.05 = 21).' },
    hints: [
      `<p>Hint 1: you need the real contrast ratio, so you need relative luminance first.</p>`,
      `<p>Hint 2: compute <code>ratio(bg, black)</code> and <code>ratio(bg, white)</code> with the same function and compare.</p>`,
      `<p>Hint 3: recipe: reuse luminance + ratio helpers; return black when <code>rBlack &gt;= rWhite</code>; <code>passesAA</code> is the winning ratio ≥ 4.5.</p>`
    ],
    solution: {
      approach: `<p>Black has luminance 0 and white has luminance 1, so the two ratios are (L + 0.05) / 0.05 and 1.05 / (L + 0.05). Compare them directly. The crossover is near L ≈ 0.179.</p>`,
      code: { lang: 'js', run: true, code: `function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a, b) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

function bestTextColor(bg) {
  return ratio(bg, '#000000') >= ratio(bg, '#ffffff') ? '#000000' : '#ffffff';
}

function textReport(bg) {
  const color = bestTextColor(bg);
  const r = ratio(bg, color);
  return { color, ratio: Math.round(r * 100) / 100, passesAA: r >= 4.5 };
}

for (const bg of ['#ff7a00', '#1a73e8', '#ffffff', '#767676', '#0b57d0']) console.log(bg, textReport(bg));` },
      complexity: `<p>O(1): two luminance and ratio computations.</p>`,
      followUps: ['Why do some mid-tone backgrounds (e.g. #777) pass for neither black nor white at 4.5?', 'Return a third option: the darkest/lightest tint of the brand colour that passes']
    }
  });

  practice.push({
    title: 'Compute the Accessible Name', level: 'Medium', tags: ['accname', 'aria-labelledby', 'aria-label'], companies: ['Google', 'Deque', 'Microsoft'],
    statement: `<p>Implement a simplified accessible-name algorithm. A node is <code>{ tag, attrs, text, labelText }</code>; <code>byId</code> maps ids to nodes. Order: (1) <code>aria-labelledby</code> (space separated ids → join the <code>text</code> of those nodes with a space; skip unknown ids); (2) <code>aria-label</code>; (3) native: <code>labelText</code> for inputs, <code>alt</code> for <code>img</code>, own <code>text</code> for <code>button</code> and <code>a</code>; (4) <code>title</code>; (5) <code>placeholder</code> for inputs; else <code>''</code>. A step counts only if its result is non-empty after trimming.</p>`,
    constraints: `Do not recurse into children. Trim and collapse whitespace in the result.`,
    example: `<p><code>button text "X" + aria-label "Close dialog"</code> → ${H.c('g', '"Close dialog"')} (aria-label beats content).</p>
      <p><code>input + labelledby "a b" (texts "Billing", "address")</code> → ${H.c('g', '"Billing address"')}.</p>`,
    brute: { why: `<p>Always using the text content ignores aria attributes and labels: inputs would have no name and icon buttons would be named "X".</p>`, code: `function nameBrute(node) { return (node.text || '').trim(); }` },
    mcq: { q: 'A button has text "Save" and title "Save the document". What is its accessible name?', options: ['Save the document', 'Save', 'Both joined', 'Nothing'], answer: 1, explain: 'Content (step 3) wins over title (step 4). The title becomes the accessible description instead.' },
    hints: [
      `<p>Hint 1: it is a priority list. Try each source in order and return at the first non-empty result.</p>`,
      `<p>Hint 2: write a helper <code>clean(s)</code> that trims and collapses whitespace so "   " counts as empty.</p>`,
      `<p>Hint 3: native step depends on tag: input → labelText, img → attrs.alt, button/a → text. Then title, then placeholder (inputs only).</p>`
    ],
    solution: {
      approach: `<p>An ordered array of small functions, each returning a string; the first non-empty wins. This is a faithful miniature of the real accname algorithm (without the recursion into children).</p>`,
      code: { lang: 'js', run: true, code: `const clean = (s) => String(s || '').replace(/\\s+/g, ' ').trim();

function accessibleName(node, byId = {}) {
  const a = node.attrs || {};
  const steps = [
    () => clean(String(a['aria-labelledby'] || '').split(/\\s+/).map((id) => (byId[id] ? byId[id].text : '')).join(' ')),
    () => clean(a['aria-label']),
    () => {
      if (node.tag === 'input' || node.tag === 'select' || node.tag === 'textarea') return clean(node.labelText);
      if (node.tag === 'img') return clean(a.alt);
      if (node.tag === 'button' || node.tag === 'a') return clean(node.text);
      return '';
    },
    () => clean(a.title),
    () => (node.tag === 'input' ? clean(a.placeholder) : '')
  ];
  for (const step of steps) {
    const r = step();
    if (r) return r;
  }
  return '';
}

const byId = { b: { text: 'Billing' }, ad: { text: 'address' } };
console.log(accessibleName({ tag: 'button', text: 'X', attrs: { 'aria-label': 'Close dialog' } }));
console.log(accessibleName({ tag: 'input', attrs: { 'aria-labelledby': 'b ad' } }, byId));
console.log(accessibleName({ tag: 'input', labelText: 'Email', attrs: { placeholder: 'you@x.com' } }));
console.log(JSON.stringify(accessibleName({ tag: 'img', attrs: { alt: '' } })));` },
      complexity: `<p>O(K) where K is the number of ids in aria-labelledby; at most five steps.</p>`,
      followUps: ['Add recursion so a button containing a span and an svg with title gets a combined name', 'What changes for a role that does not allow name from content (e.g. a dialog)?']
    }
  });

  practice.push({
    title: 'Accessible Accordion', level: 'Medium', tags: ['accordion', 'aria-expanded', 'aria-controls', 'dom'], companies: ['Atlassian', 'Shopify', 'Airbnb'],
    statement: `<p>Write <code>setupAccordion(root, { single })</code>. The markup has headings (<code>h3</code>) containing a <code>button</code> and a following panel with an id. Requirements: each button has <code>aria-expanded</code> and <code>aria-controls</code> pointing at its panel; clicking (or Enter/Space, native) toggles; panels use <code>hidden</code> when closed; if <code>single</code> is true, opening one closes the others; <kbd>ArrowDown</kbd>/<kbd>ArrowUp</kbd>/<kbd>Home</kbd>/<kbd>End</kbd> move focus between accordion buttons (optional pattern from the ARIA Authoring Practices).</p>`,
    constraints: `Use real <code>&lt;button&gt;</code> elements. Panels may contain focusable content. Support 2 to 20 sections.`,
    example: `<p>Click "Shipping" → button <code>aria-expanded="true"</code>, panel visible. With single=true, "Returns" closes. ${H.c('g', 'Screen reader: "Shipping, button, expanded"')}</p>`,
    brute: { why: `<p>Toggling a CSS class on a div header: no button semantics, no keyboard, no state exposed, and <code>display:none</code> via CSS only changes the look not the <code>hidden</code> attribute (often fine) but the missing aria-expanded leaves screen-reader users guessing.</p>`, code: `document.querySelectorAll('.acc-head').forEach((h) => {
  h.onclick = () => h.nextElementSibling.classList.toggle('open'); // div header, no state
});` },
    mcq: { q: 'Which attribute tells a screen reader whether the section is open?', options: ['aria-controls', 'aria-expanded on the button', 'aria-hidden on the button', 'role=region only'], answer: 1, explain: 'aria-expanded on the trigger exposes open/closed state. aria-controls only points to the panel.' },
    hints: [
      `<p>Hint 1: one function <code>setOpen(button, open)</code> that changes the state attribute and the panel's <code>hidden</code> together keeps them in sync.</p>`,
      `<p>Hint 2: find panels via <code>aria-controls</code>; for single-open mode close every other button first.</p>`,
      `<p>Hint 3: keyboard: listen on the root for keydown; if the target is one of the accordion buttons, compute the next index like in a tab list and call <code>focus()</code>.</p>`
    ],
    solution: {
      approach: `<p>All state changes go through <code>setOpen</code>. Using native buttons keeps Enter and Space free. The arrow-key handling is a small roving-focus without tabindex changes, because every header stays in the Tab order for accordions.</p>`,
      code: { lang: 'js', code: `function setupAccordion(root, { single = false } = {}) {
  const buttons = Array.from(root.querySelectorAll('button[aria-controls]'));

  function setOpen(btn, open) {
    btn.setAttribute('aria-expanded', String(open));
    const panel = document.getElementById(btn.getAttribute('aria-controls'));
    if (panel) panel.hidden = !open;               // keep the tree and the visuals in sync
  }

  buttons.forEach((btn) => {
    setOpen(btn, btn.getAttribute('aria-expanded') === 'true'); // normalise initial state
    btn.addEventListener('click', () => {
      const willOpen = btn.getAttribute('aria-expanded') !== 'true';
      if (single && willOpen) buttons.forEach((b) => b !== btn && setOpen(b, false));
      setOpen(btn, willOpen);
    });
  });

  root.addEventListener('keydown', (e) => {
    const i = buttons.indexOf(document.activeElement);
    if (i < 0) return;                              // only react when a header has focus
    let n = -1;
    if (e.key === 'ArrowDown') n = (i + 1) % buttons.length;
    else if (e.key === 'ArrowUp') n = (i - 1 + buttons.length) % buttons.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = buttons.length - 1;
    if (n >= 0) { e.preventDefault(); buttons[n].focus(); }
  });
}` },
      complexity: `<p>O(S) per click for S sections in single mode (closes others); otherwise O(1).</p>`,
      followUps: ['When would details/summary be a better choice than this script?', 'Add animation without breaking the hidden attribute (hint: hidden="until-found" and prefers-reduced-motion)']
    }
  });

  practice.push({
    title: 'Check the Heading Outline', level: 'Medium', tags: ['headings', 'document outline', 'lint'], companies: ['Deque', 'Google'],
    statement: `<p>A page's headings are given as an array of levels in document order, e.g. <code>[1, 2, 2, 4, 1, 3]</code>. Write <code>checkHeadings(levels)</code> returning an array of problem strings. Report: (a) the first heading is not an h1; (b) more than one h1 (report once); (c) a <b>skipped level</b> when a heading jumps down by more than 1 (e.g. 2 → 4), mentioning the index. Going up any number of levels (4 → 1) is fine. Return an empty array if everything is OK.</p>`,
    constraints: `Levels are integers from 1 to 6; 0 ≤ length ≤ 10<sup>4</sup>.`,
    example: `<p><code>[1,2,2,4,1,3]</code> → <code>['Skipped level at index 3: h2 to h4', 'Skipped level at index 5: h1 to h3', 'More than one h1']</code></p>
      <p><code>[1,2,3,2,3]</code> → ${H.c('g', '[]')}</p>`,
    brute: { why: `<p>Checking by sorting or counting levels ignores order, which is what matters: [1,3] is wrong but [3,1] is a different problem.</p>`, code: `function checkBrute(levels) {
  const s = new Set(levels);
  const out = [];
  for (let l = 1; l < 6; l++) if (s.has(l + 1) && !s.has(l)) out.push('Missing level ' + l); // order-blind
  return out;
}` },
    mcq: { q: 'Is going from an h4 directly to an h2 a skipped level problem?', options: ['Yes, always', 'No, going up is fine', 'Only if the h2 is last', 'Only on mobile'], answer: 1, explain: 'Closing a deeper section and starting a new higher-level section is normal. Only jumping DOWN by more than one level (h2 → h4) leaves out a level.' },
    hints: [
      `<p>Hint 1: one pass, comparing each heading with the previous one.</p>`,
      `<p>Hint 2: count h1 separately; report "more than one" once, not for every extra h1.</p>`,
      `<p>Hint 3: for i ≥ 1: if <code>levels[i] - levels[i-1] &gt; 1</code> push the skip message. Check the first element separately.</p>`
    ],
    solution: {
      approach: `<p>A single linear scan keeps track of the previous level and the h1 count, then emits messages in document order (the h1 message after the scan).</p>`,
      code: { lang: 'js', run: true, code: `function checkHeadings(levels) {
  const problems = [];
  if (levels.length && levels[0] !== 1) problems.push('First heading is h' + levels[0] + ', not h1');
  let h1s = 0;
  for (let i = 0; i < levels.length; i++) {
    if (levels[i] === 1) h1s++;
    if (i > 0 && levels[i] - levels[i - 1] > 1) {          // jumping DOWN by 2+ skips a level
      problems.push('Skipped level at index ' + i + ': h' + levels[i - 1] + ' to h' + levels[i]);
    }
  }
  if (h1s > 1) problems.push('More than one h1');
  return problems;
}

console.log(checkHeadings([1, 2, 2, 4, 1, 3]));
console.log(checkHeadings([1, 2, 3, 2, 3]));
console.log(checkHeadings([2, 3]));` },
      complexity: `<p>Time O(N), space O(P) for the number of problems found.</p>`,
      followUps: ['Run it in the browser on document.querySelectorAll("h1,h2,h3,h4,h5,h6")', 'Is a single h1 per page a hard WCAG rule? Discuss best practice vs requirement.']
    }
  });

  /* =====================================================================
     PRACTICE — Hard
     ===================================================================== */
  practice.push({
    title: 'Combobox Keyboard Logic with aria-activedescendant', level: 'Hard', tags: ['combobox', 'aria-activedescendant', 'state machine', 'keyboard'], companies: ['Google', 'Atlassian', 'Airbnb'],
    statement: `<p>Implement the keyboard brain of an accessible autocomplete as a <b>pure reducer</b>: <code>reduce(state, key, options)</code> where <code>state = { open, active, value }</code> (<code>active</code> is the highlighted option index, -1 for none) and <code>options</code> is the filtered list. Keys: <kbd>ArrowDown</kbd> (opens and highlights the first option when closed, otherwise next, wrapping), <kbd>ArrowUp</kbd> (opens and highlights the last when closed, otherwise previous, wrapping), <kbd>Home</kbd>/<kbd>End</kbd> (first/last when open), <kbd>Enter</kbd> (choose the highlighted option and close; if nothing highlighted just close), <kbd>Escape</kbd> (close if open; if already closed clear the value). Also write <code>ariaProps(state, options, prefix)</code> returning the attributes for the input: <code>aria-expanded</code> and <code>aria-activedescendant</code> (id like <code>prefix-3</code>, omitted when none).</p>`,
    constraints: `Never mutate state; options can be empty (no highlight, popup stays closed on ArrowDown).`,
    example: `<p>options = [Apple, Banana, Cherry]. closed, key <b>ArrowDown</b> → ${H.c('g', '{open:true, active:0}')} · <b>ArrowUp</b> from 0 (open) → ${H.c('y', 'wraps to 2')} · <b>Enter</b> → value "Cherry", ${H.c('g', 'open:false')}.</p>`,
    brute: { why: `<p>Moving real DOM focus into the options breaks typing (the user can no longer edit the text). Hard-coding the logic into event handlers makes it untestable and easy to desync from the ARIA attributes.</p>`, code: `// Tangled with the DOM: focus leaves the input, so typing stops working
input.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') list.firstElementChild.focus();
});` },
    mcq: { q: 'In a combobox that uses aria-activedescendant, where does real DOM focus stay?', options: ['On the highlighted option', 'On the text input', 'On the listbox container', 'On the body'], answer: 1, explain: 'Focus stays in the input so the user can keep typing. aria-activedescendant tells assistive tech which option is "virtually" focused.' },
    hints: [
      `<p>Hint 1: model it as a state machine; each key maps (state, options) → new state. No DOM inside.</p>`,
      `<p>Hint 2: handle <code>options.length === 0</code> first. Keep <code>active</code> within [0, n-1] with modulo for wrapping.</p>`,
      `<p>Hint 3: recipe: closed + ArrowDown → {open:true, active:0}; closed + ArrowUp → {open:true, active:n-1}; open + ArrowDown → (active+1)%n; open + ArrowUp → active<=0 ? n-1 : active-1; Home/End; Enter picks options[active]; Escape closes or clears.</p>`
    ],
    solution: {
      approach: `<p>A pure reducer returns a fresh object per key, which is trivial to unit test (feed keys, assert state) and to wire to any framework (<code>useReducer</code>). <code>ariaProps</code> derives the ARIA attributes from state so they can never drift from the visuals.</p>`,
      code: { lang: 'js', run: true, code: `function reduce(state, key, options) {
  const n = options.length;
  const s = { ...state };
  if (key === 'ArrowDown') {
    if (n === 0) return s;
    if (!s.open) return { ...s, open: true, active: 0 };
    return { ...s, active: (s.active + 1) % n };
  }
  if (key === 'ArrowUp') {
    if (n === 0) return s;
    if (!s.open) return { ...s, open: true, active: n - 1 };
    return { ...s, active: s.active <= 0 ? n - 1 : s.active - 1 };
  }
  if (key === 'Home' && s.open && n) return { ...s, active: 0 };
  if (key === 'End' && s.open && n) return { ...s, active: n - 1 };
  if (key === 'Enter') {
    if (s.open && s.active >= 0) return { open: false, active: -1, value: options[s.active] };
    return { ...s, open: false, active: -1 };
  }
  if (key === 'Escape') {
    return s.open ? { ...s, open: false, active: -1 } : { ...s, value: '' };
  }
  return s; // any other key: typing is handled elsewhere
}

function ariaProps(state, options, prefix) {
  const props = { 'aria-expanded': String(state.open && options.length > 0) };
  if (state.open && state.active >= 0) props['aria-activedescendant'] = prefix + '-' + state.active;
  return props;
}

const options = ['Apple', 'Banana', 'Cherry'];
let st = { open: false, active: -1, value: '' };
for (const k of ['ArrowDown', 'ArrowUp', 'ArrowUp', 'Enter', 'Escape']) {
  st = reduce(st, k, options);
  console.log(k.padEnd(10), JSON.stringify(st), JSON.stringify(ariaProps(st, options, 'opt')));
}` },
      complexity: `<p>O(1) time per key press, and no extra memory beyond the new state object.</p>`,
      followUps: ['Add typeahead: typing a letter highlights the next option starting with it', 'Add aria-autocomplete="list" and a polite live region saying "3 suggestions available"']
    }
  });

  practice.push({
    title: 'Nudge a Failing Colour to Pass AA', level: 'Hard', tags: ['contrast', 'color mixing', 'search', 'design systems'], companies: ['Figma', 'Adobe', 'Google'],
    statement: `<p>Write <code>fixContrast(fg, bg, target = 4.5)</code> that returns the hex colour <b>closest to <code>fg</code></b> that reaches at least <code>target</code> contrast against <code>bg</code>. Move the foreground toward whichever of black or white gives the higher contrast with <code>bg</code>, in 256 equal steps (colour = fg + (end − fg)·t, rounded per channel). If <code>fg</code> already passes, return it unchanged (lowercase 6-digit hex). If even the end colour fails, return the end colour.</p>`,
    constraints: `Hex inputs (#rgb or #rrggbb). Must run in O(256) steps. Round per channel and clamp 0 to 255.`,
    example: `<p><code>fixContrast('#777777', '#ffffff')</code> → ${H.c('g', 'a slightly darker grey')} such as <b>#767676</b> (4.54 : 1). <code>fixContrast('#ff7a00', '#ffffff')</code> → ${H.c('g', 'a darker orange')} that passes 4.5. <code>fixContrast('#000', '#fff')</code> → #000000 unchanged.</p>`,
    brute: { why: `<p>Trying random colours or darkening by a fixed amount (like "-20 brightness") overshoots: the result passes but is further from the brand colour than necessary, or still fails for very light colours.</p>`, code: `function fixBrute(fg) {
  // darken by a magic amount, no check against the background
  const n = parseInt(fg.replace('#', ''), 16);
  const d = (v) => Math.max(0, v - 40);
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => d(v).toString(16).padStart(2, '0')).join('');
}` },
    mcq: { q: 'Why mix toward black or white instead of changing only one RGB channel?', options: ['It keeps the hue and saturation feel close while changing lightness', 'It is faster', 'RGB channels cannot be changed alone', 'Black and white have no luminance'], answer: 0, explain: 'Mixing all channels toward an endpoint changes brightness smoothly and preserves the colour character, so the result still looks like the brand colour.' },
    hints: [
      `<p>Hint 1: contrast against a fixed background increases monotonically as you move the text toward the more extreme colour (black on light backgrounds, white on dark ones).</p>`,
      `<p>Hint 2: pick the end colour first (compare ratio to black and white), then scan t from 0 to 1 and stop at the first step that reaches the target.</p>`,
      `<p>Hint 3: reuse luminance + ratio; mix(c, end, t) = round(c + (end - c) * t) per channel; format back to #rrggbb with padStart.</p>`
    ],
    solution: {
      approach: `<p>A linear scan over 256 steps finds the <i>smallest</i> change that passes. Because the first passing step is returned, the result is the nearest colour on the line from fg to the endpoint, which is what a designer wants ("the same colour, just a bit darker").</p>`,
      code: { lang: 'js', run: true, code: `function toRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
const toHex = (rgb) => '#' + rgb.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
const lum = (rgb) => {
  const [r, g, b] = rgb.map((v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);

function fixContrast(fg, bg, target = 4.5) {
  const f = toRgb(fg), b = toRgb(bg);
  if (ratio(f, b) >= target) return toHex(f);                       // already fine
  const black = [0, 0, 0], white = [255, 255, 255];
  const end = ratio(black, b) >= ratio(white, b) ? black : white;   // move toward the stronger extreme
  for (let i = 1; i <= 255; i++) {
    const t = i / 255;
    const c = f.map((v, k) => Math.round(v + (end[k] - v) * t));
    if (ratio(c, b) >= target) return toHex(c);                     // first step that passes = closest
  }
  return toHex(end);                                                // even the extreme fails
}

for (const [fg, bg] of [['#777777', '#ffffff'], ['#ff7a00', '#ffffff'], ['#000', '#fff'], ['#6b7280', '#f3f4f6'], ['#9aa0a6', '#202124']]) {
  const out = fixContrast(fg, bg);
  console.log(fg, 'on', bg, '->', out, ratio(toRgb(out), toRgb(bg)).toFixed(2));
}` },
      complexity: `<p>O(256) steps, each a constant amount of arithmetic, so O(1) overall.</p>`,
      followUps: ['Do the same in OKLCH by changing only lightness', 'How would you handle a gradient or image background?']
    }
  });

  practice.push({
    title: 'Mini Accessibility Linter', level: 'Hard', tags: ['linting', 'axe', 'static analysis'], companies: ['Deque', 'Microsoft', 'Google'],
    statement: `<p>Write <code>lint(elements)</code> that checks a flat list of element objects <code>{ tag, attrs, text }</code> (document order) and returns an array of strings, each starting with the element index. Rules: (1) <code>img</code> without an <code>alt</code> attribute (empty alt is fine); (2) <code>button</code> or <code>a</code> (with <code>href</code>) with no accessible name (no text, <code>aria-label</code>, <code>aria-labelledby</code> or <code>title</code>); (3) form <code>input</code> (types other than hidden, submit, button) with no label: no <code>aria-label</code>/<code>aria-labelledby</code> and no <code>label</code> element whose <code>for</code> equals the input's <code>id</code>; (4) positive <code>tabindex</code>; (5) duplicate <code>id</code> values; (6) <code>div</code> or <code>span</code> with <code>onclick</code> and no <code>role</code>; (7) <code>html</code> without <code>lang</code>.</p>`,
    constraints: `Up to 10<sup>4</sup> elements; must run in a single pass plus index lookups (O(N)).`,
    example: `<p>Input: <code>html(no lang), img(no alt), button(text "") </code> → ${H.c('r', "['0: html has no lang', '1: img has no alt', '2: button has no accessible name']")}.</p>`,
    brute: { why: `<p>Checking label association by scanning all elements for each input is O(N²). Real linters index labels and ids once.</p>`, code: `function inputHasLabelBrute(els, input) {
  // O(N) per input -> O(N^2) overall
  return els.some((e) => e.tag === 'label' && e.attrs && e.attrs.for === input.attrs.id);
}` },
    mcq: { q: 'Which is an automated-lint-friendly rule?', options: ['"Alt text is meaningful"', '"img has an alt attribute"', '"Focus order feels logical"', '"The error message is helpful"'], answer: 1, explain: 'Tools can check that something exists (alt present, label linked). Whether it is meaningful or well-ordered needs human judgement.' },
    hints: [
      `<p>Hint 1: first pass: build a <code>Set</code> of <code>for</code> values from label elements and count ids. Second pass: apply the rules.</p>`,
      `<p>Hint 2: write a helper <code>hasName(el)</code> that checks text, aria-label, aria-labelledby, title (trimmed).</p>`,
      `<p>Hint 3: keep rules as small functions in an array so adding a rule is one line; push <code>index + ': ' + message</code> for each failure.</p>`
    ],
    solution: {
      approach: `<p>Pre-index label targets and id counts in one pass (O(N)), then a second pass evaluates each rule. This mirrors how axe-core precomputes a tree and runs independent rules over it.</p>`,
      code: { lang: 'js', run: true, code: `function lint(els) {
  const labelFor = new Set();
  const idCount = {};
  els.forEach((e) => {
    const a = e.attrs || {};
    if (e.tag === 'label' && a.for) labelFor.add(a.for);
    if (a.id) idCount[a.id] = (idCount[a.id] || 0) + 1;
  });

  const hasName = (e) => {
    const a = e.attrs || {};
    return Boolean((e.text || '').trim() || a['aria-label'] || a['aria-labelledby'] || a.title);
  };

  const out = [];
  const add = (i, msg) => out.push(i + ': ' + msg);

  els.forEach((e, i) => {
    const a = e.attrs || {};
    if (e.tag === 'html' && !a.lang) add(i, 'html has no lang');
    if (e.tag === 'img' && !('alt' in a)) add(i, 'img has no alt');
    if ((e.tag === 'button' || (e.tag === 'a' && 'href' in a)) && !hasName(e)) add(i, e.tag + ' has no accessible name');
    if (e.tag === 'input' && !['hidden', 'submit', 'button'].includes(a.type)) {
      const labelled = a['aria-label'] || a['aria-labelledby'] || (a.id && labelFor.has(a.id));
      if (!labelled) add(i, 'input has no label');
    }
    if (a.tabindex !== undefined && Number(a.tabindex) > 0) add(i, 'positive tabindex ' + a.tabindex);
    if (a.id && idCount[a.id] > 1) add(i, 'duplicate id "' + a.id + '"');
    if ((e.tag === 'div' || e.tag === 'span') && 'onclick' in a && !a.role) add(i, e.tag + ' with onclick has no role');
  });
  return out;
}

console.log(lint([
  { tag: 'html', attrs: {} },
  { tag: 'img', attrs: { src: 'a.png' } },
  { tag: 'button', text: '', attrs: {} },
  { tag: 'label', text: 'Email', attrs: { for: 'em' } },
  { tag: 'input', attrs: { id: 'em', type: 'email' } },
  { tag: 'input', attrs: { id: 'em', type: 'text', tabindex: '2' } },
  { tag: 'div', text: 'Go', attrs: { onclick: 'go()' } }
]));` },
      complexity: `<p>Time O(N) (two passes with hash lookups), space O(N).</p>`,
      followUps: ['Add a rule for skipped heading levels using the earlier heading checker', 'Why can this tool never prove a page is accessible?']
    }
  });

  practice.push({
    title: 'Announcement Queue: Dedupe, Rate-Limit, Priority', level: 'Hard', tags: ['live regions', 'queue', 'debounce', 'screen reader'], companies: ['Slack', 'Atlassian', 'Microsoft'],
    statement: `<p>Build <code>createAnnouncerQueue({ maxPolite = 3, dedupeMs = 1000 })</code> with <code>push(message, level, now)</code> and <code>drain()</code>. Rules: (1) <b>dedupe</b>: ignore a message identical to the previous accepted message of the same level if it arrives within <code>dedupeMs</code>; (2) <b>assertive</b> messages go before all polite ones, but keep first-come order among assertives; (3) <b>polite</b> messages are appended; (4) if more than <code>maxPolite</code> polite messages are pending, drop the <b>oldest</b> polite one; (5) <code>drain()</code> returns the messages in spoken order and empties the queue.</p>`,
    constraints: `level is 'polite' or 'assertive'; now is a millisecond timestamp (non-decreasing).`,
    example: `<p>push("Saved",polite,0) · push("Saved",polite,300) ${H.c('r', '(dropped: duplicate)')} · push("Offline",assertive,400) · push("A",polite,500) → drain: ${H.c('g', '["Offline","Saved","A"]')}.</p>`,
    brute: { why: `<p>Writing every message straight into a live region: a burst of 20 updates floods the user with speech, duplicates repeat, and an urgent error can be buried behind polite chatter.</p>`, code: `function announceBrute(region, msg) {
  region.textContent = msg; // later messages overwrite earlier ones; no priority, no dedupe, no limit
}` },
    mcq: { q: 'Why drop the OLDEST polite message when the queue is full?', options: ['Old news is least useful to the user by the time it would be spoken', 'It is easier to code', 'Screen readers require it', 'Assertive messages need the memory'], answer: 0, explain: 'Polite messages are status updates; by the time the queue is that long the oldest is stale, so the newest information should survive.' },
    hints: [
      `<p>Hint 1: keep a single array <code>pending</code> of <code>{message, level}</code> and the last accepted message per level with its timestamp.</p>`,
      `<p>Hint 2: to keep assertive order, insert a new assertive at the index just after the last assertive already pending.</p>`,
      `<p>Hint 3: after inserting a polite message, count polites; while count &gt; maxPolite remove the first polite found.</p>`
    ],
    solution: {
      approach: `<p>One ordered array plus a tiny "last seen" map. All the rules are local operations on that array, which keeps the logic small and testable without any DOM or timers.</p>`,
      code: { lang: 'js', run: true, code: `function createAnnouncerQueue({ maxPolite = 3, dedupeMs = 1000 } = {}) {
  let pending = [];
  const last = {}; // level -> { message, time }

  return {
    push(message, level, now) {
      const prev = last[level];
      if (prev && prev.message === message && now - prev.time < dedupeMs) return false; // duplicate burst
      last[level] = { message, time: now };

      if (level === 'assertive') {
        let at = 0;
        while (at < pending.length && pending[at].level === 'assertive') at++; // after earlier assertives
        pending.splice(at, 0, { message, level });
      } else {
        pending.push({ message, level });
        let polite = pending.filter((p) => p.level === 'polite');
        while (polite.length > maxPolite) {
          const idx = pending.findIndex((p) => p.level === 'polite'); // oldest polite
          pending.splice(idx, 1);
          polite = pending.filter((p) => p.level === 'polite');
        }
      }
      return true;
    },
    drain() {
      const out = pending.map((p) => p.message);
      pending = [];
      return out;
    }
  };
}

const q = createAnnouncerQueue({ maxPolite: 2 });
q.push('Saved', 'polite', 0);
q.push('Saved', 'polite', 300);      // dropped as duplicate
q.push('Offline', 'assertive', 400);
q.push('A', 'polite', 500);
q.push('B', 'polite', 600);          // 3 polite pending -> oldest ("Saved") is dropped
console.log(q.drain());` },
      complexity: `<p>push is O(P) in the number of pending items (small by design); drain is O(P).</p>`,
      followUps: ['Wire it to two real live regions (status and alert) with a timer that speaks one item every 1.5 seconds', 'How would you merge "3 messages" instead of dropping?']
    }
  });

  /* =====================================================================
     QUIZ
     ===================================================================== */
  quiz.push({ q: 'What do the letters in POUR stand for in WCAG?', options: ['Perceivable, Operable, Understandable, Robust', 'Public, Open, Usable, Reliable', 'Performance, Optimisation, Usability, Responsiveness', 'Page, Object, UI, Render'], answer: 0, explain: 'POUR are the four WCAG principles: content must be Perceivable, Operable, Understandable and Robust.' });
  quiz.push({ q: 'Which conformance level is the usual legal and contract target?', options: ['Level A only', 'Level AA (which includes A)', 'Level AAA', 'There is no such level system'], answer: 1, explain: 'AA includes all Level A and Level AA success criteria and is what laws, procurement rules and most clients mean by "accessible".' });
  quiz.push({ q: 'A clickable <code>&lt;div onclick&gt;</code> acting as a button is missing which of these for free that a real &lt;button&gt; gives?', options: ['Focusability, role, and Enter/Space activation', 'Only the pointer cursor', 'Only the colour', 'Nothing, they are identical'], answer: 0, explain: 'A native button is focusable, has the button role, and activates on Enter and Space. A div has none of these without extra code.' });
  quiz.push({ q: 'What is the minimum WCAG AA contrast ratio for normal-size body text?', options: ['3 : 1', '4.5 : 1', '7 : 1', '21 : 1'], answer: 1, explain: '4.5 : 1 for normal text at AA; 3 : 1 is for large text and UI components; 7 : 1 is AAA.' });
  quiz.push({ q: 'You set <code>tabindex="-1"</code> on an element. What happens?', options: ['It is removed from the page', 'It is skipped by Tab but can be focused with script or a click', 'It becomes the first Tab stop', 'It is hidden from screen readers'], answer: 1, explain: 'tabindex=-1 makes an element programmatically focusable but not part of the sequential Tab order. It is the basis of roving tabindex and focus targets.' });
  quiz.push({ q: 'In a tab list that uses roving tabindex, how many Tab presses does it take to get past the tab buttons?', options: ['One per tab', 'One total (arrow keys move between tabs)', 'Zero', 'Two per tab'], answer: 1, explain: 'Only the selected tab has tabindex=0, so the widget is a single Tab stop; arrow keys move within it.' });
  quiz.push({ q: 'When a modal dialog closes, where should keyboard focus go?', options: ['To the top of the document', 'To the element that opened the dialog', 'To the last link on the page', 'Nowhere, the browser handles it in all cases'], answer: 1, explain: 'Restoring focus to the opener lets users continue where they left off. Native &lt;dialog&gt; does this for you; custom modals must do it themselves.' });
  quiz.push({ q: 'Which attribute gives a text input its description (hint or error text) to a screen reader?', options: ['aria-label', 'aria-describedby', 'aria-controls', 'aria-hidden'], answer: 1, explain: 'aria-describedby points at the element(s) whose text becomes the accessible description, read after the name, role and state.' });
  quiz.push({ q: 'What makes a live-region announcement likely to be missed?', options: ['The region is created together with its text in the same moment', 'The text is short', 'The region has role="status"', 'The region is visually hidden with the sr-only technique'], answer: 0, explain: 'Assistive tech reacts to changes inside a region it already knows. Insert the (empty) region early and change its text later.' });
  quiz.push({ q: 'Which is the best use of <code>alt=""</code>?', options: ['A product photo that is the only description of the product', 'A purely decorative divider image', 'A logo that links to the home page', 'A chart with key data'], answer: 1, explain: 'Empty alt tells screen readers to ignore decorative images. Informative and functional images need real alt text.' });
  quiz.push({ q: 'Why is a red border alone a poor way to show a form error?', options: ['Red is hard to code', 'It relies on colour alone (WCAG 1.4.1), so some users get no signal', 'Borders cannot be styled', 'It breaks keyboard navigation'], answer: 1, explain: 'Colour must not be the only visual means of conveying information. Add text (and an icon) and link it with aria-describedby / aria-invalid.' });
  quiz.push({ q: 'What is the "first rule of ARIA"?', options: ['Always add role="button" to clickable things', 'Do not use ARIA if a native HTML element already provides the semantics', 'Use aria-label on every element', 'ARIA replaces the need for keyboard support'], answer: 1, explain: 'Native elements come with role, state and keyboard behaviour for free; ARIA only adds labels and never adds behaviour.' });
  quiz.push({ q: 'Positive tabindex values (like <code>tabindex="3"</code>) are discouraged because...', options: ['They are invalid HTML', 'They jump ahead of the natural order and make focus order hard to maintain', 'They disable the element', 'They only work in Safari'], answer: 1, explain: 'Positive values create a separate, earlier tab sequence that no longer matches the visual or DOM order, failing WCAG 2.4.3 and becoming a maintenance trap.' });

  /* =====================================================================
     INTERVIEW
     ===================================================================== */
  interview.push({ level: 'B', q: 'What is web accessibility and why should a frontend developer care?', a: `<p>Accessibility means people with different abilities (vision, hearing, motor, cognitive, temporary or situational limits) can perceive, understand, navigate and use a site. As a frontend developer I write the HTML, CSS and JavaScript that produce the accessibility tree, so my choices decide whether a screen reader, a keyboard or a voice tool can work at all. It is also a legal requirement in many places (ADA, Section 508, EU European Accessibility Act, EN 301 549) and good business: captions, keyboard shortcuts and clear contrast help everyone.</p>`, followUps: ['Name the four WCAG principles', 'Give an example of a situational limitation'] });
  interview.push({ level: 'B', q: 'What does semantic HTML mean, and why is it the first step in accessibility?', a: `<p>Semantic HTML uses elements for their meaning: button for actions, a for navigation, nav, main, header, h1-h6, ul/li, label, fieldset. The browser maps these to roles in the accessibility tree and gives free keyboard behaviour, focus and states. A page of divs produces an almost empty tree. Starting with semantics gives about 80 percent of accessibility with no ARIA and no extra JavaScript, it is smaller and more robust, and it works before scripts load.</p>`, followUps: ['When would you use ARIA anyway?', 'Which landmark elements do you always include?'] });
  interview.push({ level: 'I', q: 'You find a div with an onclick used as a button. How do you fix it, and what if you cannot change the element?', a: `<p>Best fix: replace it with a real button element (type="button"), keep the same CSS classes, and remove the click-only handler details. If I truly cannot change the element, I recreate the native contract: role="button", tabindex="0", an accessible name, Enter on keydown and Space on keyup (with preventDefault on Space to stop scrolling), a visible :focus-visible style, and a disabled path using aria-disabled plus a guard in the handler. I would also add a lint rule so it does not return.</p>`, followUps: ['Why fire Space on keyup?', 'What is wrong with role="button" alone?'] });
  interview.push({ level: 'I', q: 'Explain the accessibility tree and how you would inspect it.', a: `<p>The browser builds the DOM, then a parallel accessibility tree containing only the nodes assistive technology needs, each with a role, accessible name, state and value. Generic wrappers are pruned, hidden elements are removed. The tree is exposed via platform APIs (UI Automation, NSAccessibility, AT-SPI) to screen readers. I inspect it in Chrome DevTools (Elements, Accessibility pane or the full-page tree), in Firefox's Accessibility inspector, and indirectly with Testing Library getByRole and Playwright aria snapshots.</p>`, followUps: ['What removes an element from the tree?', 'How does aria-hidden differ from display:none?'] });
  interview.push({ level: 'I', q: 'How is an accessible name computed? Give the priority order.', a: `<p>Simplified: aria-labelledby first (text of referenced elements, even hidden ones), then aria-label, then native sources (label for form controls, alt for images, text content for buttons and links, caption, legend), then title, with placeholder as a weak last fallback. The first non-empty source wins. Practically I prefer visible text or a real label so voice-control users can say what they see, and I keep any aria-label containing the visible text (WCAG 2.5.3 Label in Name).</p>`, followUps: ['Why is title a poor accessible name?', 'When is aria-labelledby better than aria-label?'] });
  interview.push({ level: 'I', q: 'Describe how you would make an accessible tabs component.', a: `<p>Use role="tablist" containing role="tab" buttons and role="tabpanel" panels, linked with aria-controls and aria-labelledby. The selected tab has aria-selected="true" and tabindex="0"; the others tabindex="-1" (roving tabindex), so the whole list is one Tab stop. Left/Right arrows move and wrap, Home/End jump, and either focus selects (automatic activation) or Enter/Space selects (manual, for slow panels). Tab moves into the panel. Only the active panel is visible (hidden attribute). I follow the ARIA Authoring Practices pattern and test with a screen reader.</p>`, followUps: ['Automatic vs manual activation: when each?', 'How does it change for vertical tabs?'] });
  interview.push({ level: 'I', q: 'What must an accessible modal dialog do?', a: `<p>Announce itself (role="dialog" or alertdialog, aria-modal="true", an accessible name via aria-labelledby), move focus inside on open (first control, or the safest button for a destructive confirm), trap Tab and Shift+Tab, close on Escape, make the page behind inert and stop it scrolling, and restore focus to the opener on close. The simplest implementation is the native dialog element with showModal(), which provides top layer, inert background, Escape and focus return; I add the label and the right initial focus.</p>`, followUps: ['What breaks if the opener was removed from the DOM?', 'Why is aria-hidden on siblings worse than inert?'] });
  interview.push({ level: 'I', q: 'How do you calculate color contrast and what are the AA thresholds?', a: `<p>Linearise each sRGB channel (c/255, then c/12.92 if small, else ((c+0.055)/1.055)^2.4), compute relative luminance L = 0.2126 R + 0.7152 G + 0.0722 B, then ratio = (Llighter + 0.05) / (Ldarker + 0.05). AA needs 4.5:1 for normal text, 3:1 for large text (24px, or 18.66px bold) and for UI components and graphics (1.4.11). AAA needs 7:1 and 4.5:1. Disabled controls and pure decoration are exempt. I check light and dark themes, hover/focus states and text on images.</p>`, followUps: ['Why is #767676 on white notable?', 'What is APCA and is it a legal standard?'] });
  interview.push({ level: 'I', q: 'How do you build an accessible form with good validation?', a: `<p>Every control gets a visible label (for/id or wrapping), groups use fieldset and legend, hints and errors are linked with aria-describedby, required fields are marked in text and with required, and autocomplete tokens are set. On submit I show specific error text next to each field, set aria-invalid, and render an error summary with links to the fields, moving focus to the summary (or the first invalid field). I avoid colour-only errors, premature errors while typing, and disabled submit buttons.</p>`, followUps: ['Why is a placeholder not a label?', 'What do WCAG 3.3.7 and 3.3.8 require?'] });
  interview.push({ level: 'A', q: 'How do live regions work, and how would you implement toast notifications accessibly?', a: `<p>A live region (role=status/alert or aria-live polite/assertive) makes assistive tech announce text changes without moving focus. The region has to exist in the DOM before its content changes, so I mount one persistent polite region and one assertive region at app start and write messages into them (clearing first so repeats are announced). Toasts must not steal focus, must stay visible long enough (WCAG 2.2.1), be dismissible, and not be spammed: I debounce, dedupe and queue messages. Errors that need action use focus or alertdialog rather than a toast.</p>`, followUps: ['Why does a freshly inserted role=alert sometimes stay silent?', 'polite vs assertive: when is assertive justified?'] });
  interview.push({ level: 'A', q: 'How would you test accessibility in a large app and keep it from regressing?', a: `<p>Layers: ESLint jsx-a11y in the editor, component tests using Testing Library role queries plus jest-axe, E2E with Playwright and axe for key flows including keyboard-only paths and aria snapshots, Lighthouse/axe in CI with a budget that fails the build, design-system components that enforce labels and focus handling, and a manual checklist per release (keyboard, 200 and 400 percent zoom, NVDA/VoiceOver on critical flows, reduced motion, high contrast). Automation covers roughly a third to half of issues, so I add periodic expert audits and user testing with disabled people, and a clear process to triage bugs.</p>`, followUps: ['What can axe never catch?', 'How would you handle third-party widgets that are inaccessible?'] });
  interview.push({ level: 'A', q: 'What are common accessibility problems in single-page apps and how do you fix them?', a: `<p>Route changes do not move focus or announce the new page, so screen-reader users hear nothing. Fix: after navigation set document.title, move focus to the new h1 (tabindex=-1) or an announcer, and keep landmarks stable. Other issues: focus lost when the focused element is removed (move it to a sensible neighbour), dynamic content without live regions, infinite scroll that traps keyboard users away from the footer (offer a load-more button), custom components without keyboard support, client-side validation without error summaries, and loading states with no announcement (use aria-busy and a polite status).</p>`, followUps: ['How does Next.js or React Router help with route announcements?', 'How do you keep a virtualised list accessible?'] });
  interview.push({ level: 'E', q: 'ARIA vs native HTML vs custom widgets: how do you decide in a design-system component library?', a: `<p>My order is native element first, then the native element enhanced with a small amount of ARIA, then a custom widget that follows the ARIA Authoring Practices pattern exactly, with documented keyboard behaviour and tests. In a design system I make accessibility a component contract: required label props, built-in focus management, tested keyboard maps, tokens that guarantee contrast pairs, and stories with axe checks. For complex patterns (combobox, menu, dialog, date picker) I prefer a vetted headless library such as React Aria or Radix over writing my own, and I still verify with a real screen reader because support differs between NVDA, JAWS and VoiceOver.</p>`, followUps: ['How do you handle a design that cannot be built accessibly?', 'How do you version accessibility fixes without breaking consumers?'] });
  interview.push({ level: 'E', q: 'How do AI tools and agents change accessibility work, and what are the risks?', a: `<p>Two sides. AI generates a lot of UI code that tends to be div-heavy and missing labels, focus handling and keyboard support, and it can claim compliance without testing, so accessibility review moves from writing to verifying. AI also helps: drafting alt text and captions, explaining axe reports, generating Playwright keyboard tests. AI browser agents and automation read the accessibility tree, so semantic, well-named UI is also agent-friendly. Risks: generic or wrong alt text, hallucinated ARIA, overlay products that promise one-click compliance, and over-trusting automated scores. I treat AI as a fast junior who must be checked with axe, keyboard and screen-reader tests.</p>`, followUps: ['How would you prompt an assistant to review a component for a11y?', 'Why do accessibility overlays draw criticism?'] });

  registerModule({
    id: 'fe06',
    title: 'Accessibility (a11y)',
    intro: `<p>Accessibility means building pages that <b>everyone</b> can use: people who cannot see the screen, cannot use a mouse, cannot hear the video, or are simply outside in bright sunlight with one hand full. In this module you learn the <b>why</b> (people, law and business), the <b>rulebook</b> (WCAG 2.2 and its POUR principles), and the <b>craft</b>: semantic HTML and the accessibility tree, ARIA roles, states and accessible names, keyboard navigation and focus management (tab order, roving tabindex, focus traps for modals), colour contrast (you will compute the WCAG ratio yourself), accessible forms, and screen readers with live regions for toasts.</p>
      <p>Accessibility is one of the most asked-about topics in frontend interviews because it shows whether you understand how the browser, the DOM and assistive technology really fit together. It builds on <b>HTML Fundamentals</b> and <b>DOM &amp; Events</b>, and it prepares you for React components, design systems and frontend system design, where "how is it accessible?" is always a follow-up question.</p>`,
    goals: [
      'Explain <b>why accessibility matters</b> and name the four WCAG principles (POUR) and levels A, AA and AAA',
      'Choose the <b>right native element first</b> and read the <b>accessibility tree</b> (role, name, state) of any page',
      'Add <b>ARIA roles, states and properties</b> correctly, and compute an element\'s <b>accessible name</b>',
      'Make anything operable by keyboard: tab order, visible focus, skip links, <b>roving tabindex</b> tabs, an <b>accessible modal with a focus trap</b>',
      'Compute the <b>WCAG contrast ratio</b> by hand and in code, and fix failing colours',
      'Build <b>accessible forms</b> (labels, groups, hints, errors) and announce changes with <b>live regions</b>; test with axe, keyboard and a screen reader'
    ],
    prereqs: `FE 2 (HTML Fundamentals), FE 4 (DOM &amp; Events), and comfortable basic JavaScript (functions, arrays, DOM APIs). CSS basics (FE 3) help for focus styles and contrast.`,
    hours: 11,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
