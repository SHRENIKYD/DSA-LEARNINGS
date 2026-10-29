(function () { var topics = [], practice = [], quiz = [], interview = [];

// Small helper: build a step-by-step table visualizer (one row revealed per frame).
function stepTable(title, label, columns, rows, narrs, finalNarr) {
  return {
    title: title,
    gen: function () {
      var frames = [];
      for (var i = 0; i < rows.length; i++) {
        var hl = {}; hl[i] = 'cur';
        frames.push({ narr: narrs[i], parts: [{ type: 'table', label: label, columns: columns, rows: rows.slice(0, i + 1).map(function (r) { return r.slice(); }), hl: hl }] });
      }
      var all = {}; for (var j = 0; j < rows.length; j++) all[j] = 'ok';
      frames.push({ narr: finalNarr, parts: [{ type: 'table', label: label, columns: columns, rows: rows.map(function (r) { return r.slice(); }), hl: all }] });
      return frames;
    }
  };
}

topics.push({
  title: 'The Main AI Assistants and What Each Does Best',
  analogy: `<p>Choosing an AI assistant is like choosing a <b>restaurant</b>. Most of them can make you a decent meal, but each has a speciality: one is famous for curry, one for pizza, one is open late and cheap. You do not need to be loyal to one restaurant; you pick the one that fits tonight's meal, budget and company.</p>`,
  explain: `<p>An <b>AI assistant</b> is an app or website where you chat with a <b>large language model (LLM)</b>, a program trained on huge amounts of text that predicts useful replies. As of late 2026 the five big general assistants are:</p>
  ${H.table(['Assistant', 'Made by', 'Often chosen for'], [
    ['ChatGPT', 'OpenAI', 'All-rounder: writing, coding help, images, voice, custom assistants, the largest ecosystem of add-ons'],
    ['Claude', 'Anthropic', 'Long documents, careful writing, coding and reasoning; strong at following detailed instructions'],
    ['Gemini', 'Google', 'Works inside Google apps (Gmail, Docs, Drive), handles very long inputs, video and images; good for Google Workspace users'],
    ['Microsoft Copilot', 'Microsoft', 'Built into Windows, Edge and (on business plans) Word, Excel, Outlook and Teams; good if you live in Microsoft 365'],
    ['Perplexity', 'Perplexity AI', 'An "answer engine": searches the web first and shows numbered sources for every claim']
  ])}
  <p>Two words you will see a lot:</p>
  <ul>
    <li><b>Assistant vs model.</b> The <i>assistant</i> is the app (ChatGPT). The <i>model</i> is the brain inside it (for example a GPT, Claude or Gemini model). One assistant may let you switch between several models, and Perplexity and Copilot can use models from other companies.</li>
    <li><b>Open-weight model.</b> A model whose trained "weights" (the numbers that make up its brain) are published so anyone can download and run it. Families include <b>Llama</b> (Meta), <b>Qwen</b> (Alibaba), <b>DeepSeek</b>, <b>Mistral</b> and <b>Gemma</b> (Google). You will meet them in the local-models topic.</li>
  </ul>
  <p><b>The honest truth:</b> the top assistants are close in quality for everyday tasks, and the lead changes every few months. Pick by <b>fit</b> (which apps you already use, what features you need, privacy rules, budget) rather than by hype.</p>`,
  clues: ['"Which AI should I use?" → ask back: for what task, with which apps, under which privacy rules, on what budget', '"I need sources I can click" → a search-first assistant such as Perplexity, or any assistant with web search turned on', '"Everything we do is in Google Docs / Microsoft 365" → the assistant built into that suite saves copy-pasting', '"Summarise this 200-page PDF" → an assistant that handles long inputs well', 'Interview: "Which AI tools do you use and why?" → name the tool, the task and the reason, not just the brand'],
  viz: stepTable('Matching assistants to strengths', 'Assistant → typical best fit', ['Assistant', 'Typical best fit', 'Watch out for'], [
    ['ChatGPT', 'General all-rounder, images, voice', 'Free tier limits; check data settings'],
    ['Claude', 'Long documents, writing, coding', 'Usage limits on heavy use'],
    ['Gemini', 'Google apps, very long and video inputs', 'Activity / history settings'],
    ['Copilot', 'Windows and Microsoft 365 work', 'Business features need business plans'],
    ['Perplexity', 'Web research with citations', 'Sources can still be misread']
  ], ['<b>ChatGPT</b> is the best-known all-rounder with the broadest feature set.', '<b>Claude</b> is popular for long documents, writing and code.', '<b>Gemini</b> shines when your life is in Google apps.', '<b>Copilot</b> fits people working in Windows and Microsoft 365.', '<b>Perplexity</b> searches first and cites sources, ideal for quick research.'], 'All five are good. The right one depends on <b>your task and your tools</b>, and you can use more than one.'),
  examples: [
    { title: 'Student in a Google school', html: `<p>Notes live in Google Docs and email in Gmail. Gemini can read those files (when you allow it), so it avoids copy-pasting. For a coding question the student may still prefer another assistant; mixing is fine.</p>` },
    { title: 'Office worker in Microsoft 365', html: `<p>Meetings in Teams, reports in Word. If the employer provides Microsoft 365 Copilot, it can summarise meetings and draft in Word using company data under the company's privacy terms. Using a personal chatbot for company files may break policy.</p>` },
    { title: 'Fact-checking a news claim', html: `<p>Perplexity (or any assistant with web search on) shows sources. You still <b>open the sources</b> and check that they say what the summary claims.</p>` }
  ],
  deepDive: `<p><b>Assistants are bundles.</b> Each product = a model + a user interface + tools (web search, code running, file reading, image making) + memory + integrations + a privacy policy. Two assistants using similar-strength models can feel very different because of these extras.</p>
  <p><b>Benchmarks vs your work.</b> Vendors publish scores on public tests (benchmarks). They are useful signals, but models can be tuned to them and they rarely match your exact task. The best test is your own: run the same three real tasks through two or three assistants and compare.</p>
  <p><b>Lock-in.</b> Memory, custom assistants and saved projects make switching harder over time. Keep important prompts and instructions in your own notes so you can move them.</p>
  <p><b>Fairness note.</b> No vendor wins everything. Strengths listed here are typical reputations as of late 2026, not permanent facts; verify on current product pages.</p>`,
  aiEra: `<p>In interviews and at work, "I use AI" is no longer interesting; <b>how you choose and check</b> is. A strong engineer can say: "For research I use a search-first tool and open the sources; for long specs I use an assistant with a large context window; for company code I only use the tool my employer approved."</p>
  <p>Expect your toolkit to change every year. The skill that lasts is comparing tools on your own tasks, reading privacy terms, and keeping your prompts portable.</p>`,
  problems: [{
    title: 'Pick an Assistant for Three People',
    level: 'Easy', tags: ['tool choice'],
    statement: `<p>Recommend an assistant for: (a) Priya, whose team uses Google Workspace and who wants help drafting emails from her Gmail; (b) Tom, a journalist who must show sources for every fact; (c) Lee, whose company pays for Microsoft 365 with Copilot and forbids pasting company files into other tools. Give one reason each.</p>`,
    constraints: `One assistant and one reason per person.`,
    example: `<p>(b) Tom → Perplexity (or any assistant with web search on), because it cites sources for each claim. He still opens and checks them.</p>`,
    brute: { why: `<p><b>Weak answer:</b> "Use ChatGPT for everyone, it is the most popular." It ignores Priya's Gmail integration, Tom's need for citations and Lee's company policy.</p>` },
    mcq: { q: 'What matters most for Lee?', options: ['Company policy on approved tools', 'Which model topped a benchmark this week', 'Which app has the nicest colours'], answer: 0, explain: 'Policy decides which tool he may use with company data; quality comes second.' },
    hints: [`<p>Hint 1: look at where each person's data already lives.</p>`, `<p>Hint 2: one person needs visible sources; that points to search-first tools.</p>`, `<p>Hint 3: when an employer approves one tool and forbids others, policy beats preference.</p>`],
    solution: { approach: `<p><b>Strong answer:</b> (a) Priya → Gemini, because it is built into Google Workspace and can draft from her Gmail when she grants access, saving copy-paste. (b) Tom → Perplexity, because it searches the web and shows numbered sources; he clicks each source and confirms the quote before publishing. (c) Lee → Microsoft 365 Copilot, because it is the employer-approved tool, works inside Word/Outlook/Teams, and keeps company data under the company's agreement. The principle: choose by where the data lives, the feature needed, and the rules you must follow.</p>`, complexity: `<p>Judgement exercise; no Big-O applies.</p>` }
  }]
});

topics.push({
  title: 'Fast Models vs Reasoning Models',
  analogy: `<p>Ask a friend "what is 7 × 8?" and they answer instantly. Ask them to plan a two-week trip on a budget and they say "let me think" and take a few minutes with a notepad. <b>Fast models</b> are the instant friend; <b>reasoning models</b> are the friend with the notepad. Both are useful, for different questions.</p>`,
  explain: `<p>Most assistants now offer two kinds of model (sometimes chosen automatically):</p>
  <ul>
    <li><b>Fast (or "instant") models</b> reply in a second or two. Great for rewriting, summarising, simple questions, brainstorming and chat.</li>
    <li><b>Reasoning (or "thinking") models</b> first work through the problem in hidden steps, then answer. This takes longer (seconds to minutes) and uses more of your usage limit, but is much better at multi-step maths, tricky debugging, planning and careful analysis.</li>
  </ul>
  ${H.table(['Task', 'Better choice', 'Why'], [
    ['Fix grammar in an email', 'Fast', 'Simple; speed matters'],
    ['Summarise a short article', 'Fast', 'No deep logic needed'],
    ['Find the bug in a 200-line function', 'Reasoning', 'Must trace many steps'],
    ['Solve a probability puzzle', 'Reasoning', 'Multi-step maths'],
    ['Plan a database migration', 'Reasoning', 'Many constraints to balance']
  ])}
  <p>Products name these differently (for example "Thinking", "Extended thinking", "Think Deeper", "Pro" or a model picker), and many now have an <b>auto</b> mode that decides for you. The names change often, so look for the words <i>thinking</i> or <i>reasoning</i> in the model menu.</p>
  <p><b>Rule of thumb:</b> start fast; switch to reasoning when the first answer is shallow, wrong, or the task has many steps.</p>`,
  clues: ['"Quick rewrite / translate / summarise" → fast model', '"Step by step", "prove", "debug", "plan", "trade-offs" → reasoning model', '"It answered instantly but the maths is wrong" → retry with reasoning on', '"I keep hitting my limit" → use fast models for easy tasks and save reasoning for hard ones', 'Interview: "How do you balance cost and quality?" → route easy tasks to cheap/fast models'],
  code: [{ lang: 'python', run: true, title: 'A tiny model router (stdlib only)', code: `# Decide fast vs reasoning from simple signals in the task description.
HARD_WORDS = ["debug", "prove", "plan", "optimi", "trade-off", "tradeoff",
              "step by step", "why does", "design", "probability", "migrate"]

def route(task, steps_guess=1):
    """Return 'reasoning' for multi-step or tricky tasks, else 'fast'."""
    text = task.lower()
    hits = [w for w in HARD_WORDS if w in text]
    if steps_guess >= 3 or hits:
        return "reasoning", hits
    return "fast", hits

tasks = [
    ("Fix the grammar in this email", 1),
    ("Debug why this function returns None", 2),
    ("Plan a zero-downtime database migration", 5),
    ("Translate this sentence into Spanish", 1),
]
for t, s in tasks:
    choice, why = route(t, s)
    print(f"{choice:9} <- {t}  (signals: {why or 'none'}, steps={s})")
` }],
  codeTitle: ['Route a task to a fast or reasoning model'],
  viz: {
    title: 'Fast vs reasoning on the same question',
    gen: function () {
      function v(mode, time, cost, quality, hl) { return { type: 'vars', label: mode, vals: { time: time, 'usage cost': cost, 'answer quality': quality }, hl: hl || {} }; }
      return [
        { narr: 'Question: "My train leaves at 14:50, the trip takes 2 h 35 min with a 25-min delay. When do I arrive?" A <b>fast</b> model replies instantly.', parts: [v('Fast model', '1 s', 'low', '?', { time: 'ok' })] },
        { narr: 'The fast answer says 17:25, but it forgot the delay. Fast models sometimes skip a step.', parts: [v('Fast model', '1 s', 'low', 'wrong (17:25)', { 'answer quality': 'bad' })] },
        { narr: 'A <b>reasoning</b> model works in hidden steps: 14:50 + 2:35 = 17:25, then + 0:25 = 17:50.', parts: [v('Reasoning model', '10 s', 'higher', 'thinking…', { time: 'cur' })] },
        { narr: 'It answers 17:50 correctly but took longer and used more of your limit.', parts: [v('Reasoning model', '10 s', 'higher', 'right (17:50)', { 'answer quality': 'ok' })] },
        { narr: 'Lesson: use fast for simple tasks; switch to reasoning when steps pile up. And still check the arithmetic yourself.', parts: [v('Fast model', '1 s', 'low', 'easy tasks'), v('Reasoning model', 'slower', 'higher', 'hard tasks', { 'answer quality': 'sel' })] }
      ];
    }
  },
  examples: [
    { title: 'Email polish', html: `<p>Fast model. A reasoning model would give almost the same result, just slower and with more usage.</p>` },
    { title: 'Off-by-one bug hunt', html: `<p>The fast model guesses "add a null check". The reasoning model traces the loop and finds the range ends one too early. Worth the wait.</p>` },
    { title: 'Auto mode got it wrong', html: `<p>An auto router picked a fast model for a tricky logic puzzle. If the answer looks shallow, pick the thinking model manually and ask again.</p>` }
  ],
  deepDive: `<p><b>What "reasoning" means here.</b> Reasoning models are trained to produce long internal chains of intermediate steps before the final answer ("test-time compute"). More thinking tokens usually means better results on hard problems, but also more time and cost. Some products let you set an effort level.</p>
  <p><b>Not magic.</b> Reasoning models can still be confidently wrong, and on easy tasks they can "overthink". They do not have more facts than the fast model; they just use more steps. For facts, web search matters more than thinking.</p>
  <p><b>Cost.</b> On free plans, reasoning modes often have smaller limits. In APIs, they cost more because thinking tokens are billed. A common production pattern is a <b>router</b>: cheap model first, escalate to the strong one only when needed.</p>`,
  aiEra: `<p>Knowing when to "turn the thinking on" is a practical skill. Engineers who route easy tasks to fast models and hard ones to reasoning models get better answers and spend less. In system design interviews, "use a small fast model for classification and a large reasoning model only for complex cases" is a sound cost/quality trade-off to mention.</p>
  <p>Whatever the model, keep verifying: reasoning reduces mistakes, it does not remove them.</p>`,
  problems: [{
    title: 'Fast or Thinking?',
    level: 'Easy', tags: ['model choice'],
    statement: `<p>For each task choose a fast or a reasoning model and give one reason: (a) turn bullet notes into a friendly Slack message; (b) work out why a recursive function overflows the stack only for some inputs; (c) translate a menu; (d) compare three cloud architectures against five requirements.</p>`,
    constraints: `One choice plus one reason each.`,
    example: `<p>(a) Fast: simple rewriting, speed matters, no multi-step logic.</p>`,
    brute: { why: `<p><b>Weak answer:</b> "Always use the strongest thinking model." It wastes time and usage limits on easy tasks and you hit the cap before the hard task arrives.</p>` },
    mcq: { q: 'Which task benefits most from a reasoning model?', options: ['Comparing architectures against many requirements', 'Translating a menu', 'Rewriting notes as a message'], answer: 0, explain: 'Many constraints to balance → multi-step thinking pays off.' },
    hints: [`<p>Hint 1: count how many steps each task really needs.</p>`, `<p>Hint 2: rewriting and translating are mostly one step.</p>`, `<p>Hint 3: tracing code paths and weighing trade-offs are many steps.</p>`],
    solution: { approach: `<p><b>Strong answer:</b> (a) Fast: a simple transformation where speed matters. (b) Reasoning: it must trace recursion depth for different inputs, a multi-step analysis. (c) Fast: translation of short text is a single step; check key words. (d) Reasoning: weighing three options against five requirements is a structured, multi-step comparison. Start fast, escalate when the task has many steps or the first answer is shallow.</p>`, complexity: `<p>Judgement exercise; no Big-O applies.</p>` }
  }]
});
topics.push({
  title: 'Free vs Paid Plans and Usage Limits',
  analogy: `<p>AI plans work like a <b>gym membership</b>. The free pass lets you in at quiet hours with basic machines. The standard membership gives more time and better equipment. The premium tier adds a personal trainer and no queues. Businesses buy group memberships with extra rules about who sees what.</p>`,
  explain: `<p>Every major assistant has a similar ladder (as of late 2026). Exact prices and limits change often, so <b>always check the vendor's current pricing page</b>.</p>
  ${H.table(['Tier', 'What you usually get', 'Who it suits'], [
    ['Free', 'Good everyday model, limited messages, limited or slower access to the best models and features', 'Trying tools, light use, students'],
    ['Individual paid (mid tier)', 'Much higher limits, the strongest models, reasoning, deep research, larger file uploads', 'Daily heavy users'],
    ['Premium / "max" tiers', 'Even higher limits, earliest access to new features, more agent and research runs', 'Power users whose work depends on it'],
    ['Team / business / enterprise', 'Admin controls, shared workspaces, stronger privacy terms (usually no training on your data by default), single sign-on', 'Companies'],
    ['API (pay per use)', 'Pay per token for building your own apps; separate from the chat subscription', 'Developers']
  ])}
  <p>Key terms:</p>
  <ul>
    <li><b>Usage limit / rate limit</b>: a cap on how many messages (or how much work) you can do in a time window. Heavier work (long files, reasoning, images) uses up the cap faster. When you hit it you wait, or get moved to a lighter model.</li>
    <li><b>Token</b>: a small chunk of text (roughly ¾ of an English word). APIs charge per million tokens in and out.</li>
    <li><b>Context window</b>: how much text the model can read at once, measured in tokens. Paid tiers sometimes allow larger windows.</li>
  </ul>
  <p><b>Should you pay?</b> If you hit the free limit several times a week, or you need a paid-only feature for real work, a single paid plan is usually worth it. Paying for three assistants at once rarely is. Students should check for education discounts and what their school already provides.</p>`,
  clues: ['"I keep hitting the limit" → upgrade, spread work across tools, or use fast models for easy tasks', '"Can I use the subscription in my app?" → no, apps use the separately billed API', '"Company data" → business/enterprise plan with admin and privacy controls', '"How much will this cost?" → estimate tokens × price per token; check the current pricing page', '"Is the free tier enough?" → test it on a real week of tasks before paying'],
  code: [{ lang: 'python', run: true, title: 'API cost estimator (made-up example prices)', code: `# Estimate a monthly API bill. Prices here are EXAMPLE numbers only:
# always read the vendor's current pricing page.
def monthly_cost(requests_per_day, tokens_in, tokens_out,
                 price_in_per_m, price_out_per_m, days=30):
    total_in = requests_per_day * tokens_in * days
    total_out = requests_per_day * tokens_out * days
    cost = total_in / 1e6 * price_in_per_m + total_out / 1e6 * price_out_per_m
    return total_in, total_out, round(cost, 2)

# A support bot: 500 chats/day, 1,500 tokens in, 300 tokens out each.
for name, p_in, p_out in [("small fast model", 0.5, 2.0), ("large reasoning model", 5.0, 20.0)]:
    tin, tout, c = monthly_cost(500, 1500, 300, p_in, p_out)
    print(f"{name:22} in={tin:,} out={tout:,} tokens -> about \${c} / month")
` }],
  codeTitle: ['Estimate monthly token cost'],
  viz: stepTable('Climbing the plan ladder', 'Plan tiers (check current pricing pages)', ['Tier', 'Limits', 'Best for'], [
    ['Free', 'Lowest; may switch to lighter model when busy', 'Trying and light use'],
    ['Individual paid', 'Much higher; best models; deep research', 'Daily users'],
    ['Premium', 'Highest individual limits; earliest features', 'Power users'],
    ['Business / enterprise', 'Admin, privacy terms, shared spaces', 'Companies'],
    ['API', 'Pay per token, separate bill', 'Building apps']
  ], ['Start on <b>free</b>: enough for many learners.', '<b>Individual paid</b> removes most friction for daily users.', '<b>Premium</b> only makes sense if you constantly hit paid limits.', '<b>Business</b> plans add admin control and stronger data terms.', 'The <b>API</b> is a separate product for developers, billed per token.'], 'Climb only as high as your real usage needs. Re-check prices before deciding.'),
  examples: [
    { title: 'Student on free tiers', html: `<p>Uses two free assistants: when one hits its limit, switches to the other. Saves reasoning mode for hard homework. Cost: zero.</p>` },
    { title: 'Freelancer upgrading', html: `<p>Hits the free limit daily while writing proposals from long PDFs. One paid plan saves hours per week, easily worth a monthly fee.</p>` },
    { title: 'Subscription ≠ API', html: `<p>A developer pays for a chat plan and expects their app to use it. It does not: the app needs an API key with its own pay-per-token bill.</p>` }
  ],
  deepDive: `<p><b>Why limits exist.</b> Running large models costs real GPU time. Vendors share capacity by capping use per window, and heavier requests (long context, reasoning, images, video, agent runs) count more.</p>
  <p><b>Estimating API cost.</b> cost ≈ (input tokens ÷ 1M × input price) + (output tokens ÷ 1M × output price). Output tokens usually cost several times more than input. Reasoning models also bill their hidden thinking tokens. Caching repeated prompts and routing easy requests to small models are the usual savings.</p>
  <p><b>Hidden costs.</b> Your time verifying, switching between tools, and the risk of using an unapproved tool at work matter as much as the monthly fee.</p>`,
  aiEra: `<p>Treat AI spend like any other tool budget: measure what you use, pick the cheapest tier that does the job, and review it every few months because prices and limits shift. In system design, being able to estimate token cost per request and per month is now a standard back-of-envelope skill.</p>`,
  problems: [{
    title: 'Free, Paid or Business?',
    level: 'Easy', tags: ['plans'],
    statement: `<p>Recommend a tier: (a) a student asking a few questions a day; (b) a consultant who summarises long client PDFs all day and hits limits by noon; (c) a 40-person company that wants staff to use AI on internal documents.</p>`,
    constraints: `One tier and one reason each. Do not quote prices.`,
    example: `<p>(a) Free: light use rarely hits the cap.</p>`,
    brute: { why: `<p><b>Weak answer:</b> "Everyone should buy the top premium plan." Costly for the student, and personal plans do not give the company admin or data controls.</p>` },
    mcq: { q: 'What is the main reason the company should not let staff use personal free accounts for internal documents?', options: ['No admin or business data protections', 'Free accounts are always slower', 'Free accounts cannot read text'], answer: 0, explain: 'Business plans add admin control and stronger data terms; personal accounts do not.' },
    hints: [`<p>Hint 1: match tier to how often each person hits limits.</p>`, `<p>Hint 2: who controls the data matters for a company.</p>`, `<p>Hint 3: free → individual paid → business plan.</p>`],
    solution: { approach: `<p><b>Strong answer:</b> (a) Free tier: a few questions a day fits the free limits; save reasoning mode for hard problems. (b) Individual paid plan: daily heavy use and long files make higher limits and stronger models worth it; check the current pricing page. (c) A business or enterprise plan: admin controls, shared workspaces, single sign-on, and contract terms that by default do not train on company data. Also write a short policy on what may be uploaded.</p>`, complexity: `<p>Judgement exercise; no Big-O applies.</p>` }
  }]
});

topics.push({
  title: 'Power Features: Deep Research, Files, Voice, Images and Agents',
  analogy: `<p>A modern assistant is like a <b>Swiss Army knife</b>: the main blade is chat, but there are also scissors (file analysis), a magnifying glass (deep research), a whistle (voice), a pen (images) and a little robot that runs errands (agent). Knowing which tool to fold out saves time.</p>`,
  explain: `<p>As of late 2026 most big assistants offer some version of these features (names and availability differ by plan and country):</p>
  ${H.table(['Feature', 'What it does', 'Good for', 'Check'], [
    ['Web search', 'Looks things up live and cites links', 'Current events, prices, docs', 'Open the links'],
    ['Deep research', 'Spends minutes searching many sources, then writes a report with citations', 'Market scans, literature reviews, comparisons', 'Spot-check key claims and sources'],
    ['File analysis', 'Reads PDFs, spreadsheets, images; some run code on data', 'Summaries, charts, finding numbers', 'Recompute important numbers'],
    ['Voice mode', 'Talk and listen in real time', 'Practice interviews, language learning, hands-free', 'Do not share private info aloud in public'],
    ['Image generation / understanding', 'Makes images from text; reads photos and screenshots', 'Diagrams, mockups, reading a whiteboard', 'Check text in images; respect rights'],
    ['Agent mode', 'Takes multi-step actions: browses sites, fills forms, uses apps', 'Repetitive web tasks', 'Approve each sensitive step']
  ])}
  <p><b>Deep research</b> deserves a note: it is not just "search". The assistant plans sub-questions, reads dozens of pages and writes a long cited report. ChatGPT, Gemini, Claude and Perplexity all offer a research mode. It is slower and usage-limited, so use it for questions worth a report.</p>
  <p><b>Agent</b> here means an assistant that can <i>act</i> (click, type, call tools), not just talk. Agents can make mistakes with real consequences, so they usually pause for your confirmation before purchases, sending messages or logging in.</p>`,
  clues: ['"Give me a cited overview of …" → deep research', '"What does this spreadsheet say?" → file analysis (with code execution if available)', '"Practice speaking" → voice mode', '"Book / fill / click for me" → agent mode with confirmations', '"Latest version / today\'s news" → web search on; the model alone may be out of date'],
  viz: {
    title: 'How a deep-research run works',
    gen: function () {
      var nodes = [
        { id: 'Q', label: 'Your question', x: 8, y: 25, shape: 'box' },
        { id: 'P', label: 'Plan sub-questions', x: 32, y: 10, shape: 'box' },
        { id: 'S', label: 'Search + read pages', x: 58, y: 10, shape: 'box' },
        { id: 'R', label: 'Cited report', x: 58, y: 42, shape: 'box' },
        { id: 'Y', label: 'You verify', x: 88, y: 42, shape: 'box' }
      ];
      var edges = [['Q', 'P'], ['P', 'S'], ['S', 'S', 'loop'], ['S', 'R'], ['R', 'Y']];
      function g(ehl, hl, tags) { return { type: 'graph', directed: true, height: 52, nodes: nodes, edges: [['Q', 'P'], ['P', 'S'], ['S', 'R'], ['R', 'Y']], ehl: ehl, hl: hl, tags: tags || {} }; }
      return [
        { narr: 'You ask a big question, e.g. "Compare three note-taking apps for students on privacy and price".', parts: [g({}, { Q: 'cur' })] },
        { narr: 'The assistant breaks it into <b>sub-questions</b> (privacy policy of each app, current price, offline support…).', parts: [g({ 'Q-P': 'cur' }, { P: 'cur' })] },
        { narr: 'It <b>searches and reads</b> many pages, often for several minutes, refining as it learns.', parts: [g({ 'P-S': 'cur' }, { S: 'cur' }, { S: 'many sources' })] },
        { narr: 'It writes a <b>report with citations</b>.', parts: [g({ 'S-R': 'ok' }, { R: 'ok' })] },
        { narr: 'You <b>open key citations</b> and check they really say what the report claims. Reports can still misread or cite weak sources.', parts: [g({ 'R-Y': 'sel' }, { Y: 'sel' }, { Y: 'owner' })] }
      ];
    }
  },
  examples: [
    { title: 'Spreadsheet question', html: `<p>Upload a sales CSV and ask "which month grew fastest?". A tool that runs code computes it; still glance at the code or recompute one value yourself.</p>` },
    { title: 'Interview practice by voice', html: `<p>Voice mode plays the interviewer and asks follow-ups. Speaking out loud is closer to a real interview than typing.</p>` },
    { title: 'Agent stops at payment', html: `<p>An agent fills a conference registration form and pauses before payment for you to confirm. That pause is a feature; never disable it for money or messages.</p>` }
  ],
  deepDive: `<p><b>File analysis internals.</b> Text from PDFs is extracted and placed in the context window; very large files may be split and only relevant chunks retrieved (a technique called retrieval). Scanned PDFs need OCR (reading text from images), which can introduce errors. Tables are a weak spot: verify numbers.</p>
  <p><b>Deep research risks.</b> Citation errors (a source that does not say the claim), outdated pages, and over-reliance on popular but low-quality sites. Ask it to prefer official and primary sources, and to list what it could not confirm.</p>
  <p><b>Agent safety.</b> Agents that browse can meet <b>prompt injection</b>: hidden text on a web page telling the AI to do something you did not ask. Keep agents away from sensitive accounts unless needed, and review actions.</p>`,
  aiEra: `<p>These features turn assistants from "answer machines" into "work machines". The skill shifts from asking to <b>delegating and checking</b>: give a clear brief, pick the right feature, and verify outputs before they go anywhere important. Knowing which feature exists in which plan also saves you from paying for things you do not need.</p>`,
  problems: [{
    title: 'Which Feature Fits?',
    level: 'Medium', tags: ['features'],
    statement: `<p>Pick a feature and one safety check for: (a) a cited 3-page overview of laws on e-scooters in your country; (b) totals per region from a 5,000-row spreadsheet; (c) practising a behavioural interview out loud; (d) filling the same web form for 20 conference talks.</p>`,
    constraints: `Feature + one check per task.`,
    example: `<p>(a) Deep research; check: open the official government source for each key rule.</p>`,
    brute: { why: `<p><b>Weak answer:</b> "Just paste it into chat and ask." The 5,000-row file may not fit or be summarised loosely, the law overview would rely on the model's possibly old memory, and nobody checks anything.</p>` },
    mcq: { q: 'For exact totals from a big spreadsheet, what is the most reliable feature?', options: ['File analysis that runs code on the data', 'Voice mode', 'Image generation'], answer: 0, explain: 'Running code computes real totals instead of guessing from text.' },
    hints: [`<p>Hint 1: which tasks need fresh outside information?</p>`, `<p>Hint 2: which task needs exact computation rather than prose?</p>`, `<p>Hint 3: anything that acts for you needs a confirm step.</p>`],
    solution: { approach: `<p><b>Strong answer:</b> (a) Deep research with web sources; check the official government pages for each rule because laws change. (b) File analysis with code execution; recompute one region by hand or with a spreadsheet formula. (c) Voice mode; ask it to play a strict interviewer and give feedback, and avoid sharing real confidential project details. (d) Agent mode; do one form yourself first, let the agent do the next while you watch, and keep it pausing before each submit. The principle: pick the feature built for the job and match the check to the risk.</p>`, complexity: `<p>Judgement exercise; no Big-O applies.</p>` }
  }]
});

topics.push({
  title: 'Privacy and Data-Training Settings',
  analogy: `<p>Talking to an AI app is like talking to a <b>shop assistant who may take notes</b>. Some shops use the notes to train new staff, some keep them for a while for security, and some let you ask "please do not write this down". You should know which shop you are in before telling them your bank details.</p>`,
  explain: `<p>Three questions to ask about any assistant:</p>
  <ol>
    <li><b>Is my data used to train future models?</b> On many consumer plans the answer can be yes unless you switch it off. On business, enterprise and API plans vendors generally say they do not train on your data by default.</li>
    <li><b>How long is it kept?</b> (retention). Even with training off, chats may be kept for a while for safety and legal reasons.</li>
    <li><b>Who can see it?</b> Shared links, team workspaces and human safety review can expose content.</li>
  </ol>
  <p>Where to look (as of late 2026; menu names change, so search the vendor's help centre for "data controls" or "model training"):</p>
  ${H.table(['Assistant', 'Typical setting', 'Where'], [
    ['ChatGPT', '"Improve the model for everyone" toggle; temporary chats', 'Settings → Data controls'],
    ['Claude', 'A model-improvement / "help improve Claude" choice', 'Settings → Privacy'],
    ['Gemini', 'Activity setting (Keep Activity / Gemini Apps Activity)', 'Gemini activity settings in your Google account'],
    ['Microsoft Copilot', '"Model training on text" and "on voice" toggles', 'Profile → Account / Settings → Privacy'],
    ['Perplexity', 'AI data retention / training toggle', 'Settings → Preferences or account settings']
  ])}
  <p><b>Important:</b> opting out usually affects <b>future</b> chats, may take time to apply, and does not stop the vendor keeping data for safety, abuse or legal reasons. The safest rule is still: <b>do not paste secrets, passwords, or other people's personal data</b> into any tool your organisation has not approved.</p>`,
  clues: ['"Is it safe to paste this?" → check plan type, training setting and company policy first', '"Company or customer data" → approved business plan only', '"Turn off training" → look for data controls / privacy in settings', '"I deleted the chat" → deletion and opt-out do not undo past training or retention for safety', '"Highly sensitive / regulated data" → consider an approved enterprise tool or a local model'],
  viz: stepTable('Privacy checklist before pasting', 'Ask in order', ['Step', 'Question', 'If the answer is bad']
  , [
    ['1', 'Is this tool approved for this data?', 'Stop; use the approved tool'],
    ['2', 'Is training on my chats switched off (or not applicable)?', 'Switch it off in settings'],
    ['3', 'Does the text contain secrets or personal data?', 'Redact or use placeholders'],
    ['4', 'Will I share this chat by link?', 'Remove sensitive parts first'],
    ['5', 'Is it so sensitive no cloud tool should see it?', 'Use a local model or no AI']
  ], ['First: is the tool <b>approved</b> for this kind of data?', 'Second: check the <b>training setting</b>.', 'Third: <b>redact</b> secrets and personal details.', 'Fourth: be careful with <b>shared links</b>.', 'Fifth: some data should never leave your machine.'], 'Run this checklist every time the data is not public. It takes 20 seconds.'),
  examples: [
    { title: 'Opt-out on a personal account', html: `<p>Before using a free assistant for personal finances, a user opens the data or privacy settings and turns off the model-training toggle, then uses placeholders instead of real account numbers.</p>` },
    { title: 'Leaked API key', html: `<p>A developer pasted a config file containing a key. Opting out now does not erase it. Correct move: <b>rotate (replace) the key immediately</b> and tell the security team.</p>` },
    { title: 'Medical notes', html: `<p>A clinic wants summaries of patient notes. A consumer chatbot is the wrong tool; they need an approved enterprise or locally hosted solution that meets health-data rules.</p>` }
  ],
  deepDive: `<p><b>Consumer vs commercial terms.</b> Vendors usually have separate terms for consumer apps and for business/API products. Commercial terms commonly exclude training on customer content by default and add data-processing agreements. Read which one covers you.</p>
  <p><b>Temporary / incognito chats.</b> Several assistants offer chats that are not saved to history or used for training, though they may still be retained for a short time for safety.</p>
  <p><b>Memory features.</b> Assistants that "remember" you across chats store personal facts. Review and delete memories in settings, or turn memory off.</p>
  <p><b>Regional law.</b> Rules such as the GDPR in Europe give rights to access and delete data; availability of features and defaults can vary by country.</p>`,
  aiEra: `<p>Data leaks through AI tools are a real workplace risk, and interviewers increasingly ask about it. Show that you check settings, follow approved-tool policies, redact by habit, and know that a leaked secret must be rotated. That judgement is worth more than any prompt trick.</p>`,
  problems: [{
    title: 'Can I Paste This?',
    level: 'Medium', tags: ['privacy'],
    statement: `<p>Decide paste / redact first / do not paste, and say which setting or tool to use: (a) a public news article; (b) a production log with customer emails and a database password; (c) your own CV; (d) your employer's unreleased product roadmap, and the only tool you have is a personal free account.</p>`,
    constraints: `One decision + one reason each.`,
    example: `<p>(a) Paste: public text has no privacy risk.</p>`,
    brute: { why: `<p><b>Weak answer:</b> "Turn off training and paste anything." Opt-out does not stop retention, does not make a tool approved by your employer, and the password is already a secret that must never be shared.</p>` },
    mcq: { q: 'You pasted a real database password by mistake. First action?', options: ['Rotate (change) the password and report it', 'Delete the chat and forget it', 'Turn off training'], answer: 0, explain: 'Assume the secret is exposed; changing it makes the leaked value useless.' },
    hints: [`<p>Hint 1: public vs personal vs company-confidential data.</p>`, `<p>Hint 2: secrets are never pasted, even redacted logs need checking.</p>`, `<p>Hint 3: company confidential data needs a company-approved tool.</p>`],
    solution: { approach: `<p><b>Strong answer:</b> (a) Paste freely; it is public. (b) Redact first: remove the password and replace emails with placeholders like user1@example.com; ideally use the employer-approved tool. If the password was ever exposed, rotate it. (c) Paste, after turning off training if you prefer, and remove your phone number and address if not needed. (d) Do not paste: confidential company data must only go into a tool your employer approved under business terms; a personal free account is not approved, even with training off.</p>`, complexity: `<p>Judgement exercise; no Big-O applies.</p>` }
  }]
});
topics.push({
  title: 'Open-Weight Models and Running AI Locally',
  analogy: `<p>Using a cloud assistant is like <b>eating at a restaurant</b>: great food, no cooking, but you go to their place and follow their rules. Running a model locally is like <b>cooking at home</b>: you need a kitchen (hardware) and some effort, the food may be simpler, but nothing leaves your house and nobody limits how often you cook.</p>`,
  explain: `<p><b>Open-weight</b> models publish their trained weights so you can download and run them yourself. ("Open-weight" is more precise than "open-source", because training data and code are often not published, and licences vary.) Main families as of late 2026:</p>
  ${H.table(['Family', 'From', 'Known for'], [
    ['Llama', 'Meta', 'Widely used, huge community of fine-tunes and tooling'],
    ['Qwen', 'Alibaba', 'Many sizes, strong at coding and multilingual tasks'],
    ['DeepSeek', 'DeepSeek', 'Strong reasoning models; large models often used via cloud hosts'],
    ['Mistral', 'Mistral AI (France)', 'Efficient models, popular in Europe'],
    ['Gemma', 'Google', 'Small, efficient models that run on laptops and phones']
  ])}
  <p>Tools that make running them easy:</p>
  <ul>
    <li><b>Ollama</b>: a free app with a command line; <code>ollama run &lt;model&gt;</code> downloads and starts a model, and it offers a local API other apps can call.</li>
    <li><b>LM Studio</b>: a desktop app with a point-and-click interface for finding, downloading and chatting with models, plus a local server.</li>
  </ul>
  <p><b>Size matters.</b> Models are described by <b>parameters</b> (e.g. 8B = 8 billion numbers). More parameters usually means smarter but needs more memory. <b>Quantization</b> stores each number with fewer bits (e.g. 4-bit instead of 16-bit) so the model fits on smaller machines with a small quality loss.</p>
  <p><b>When is local worth it?</b> Private or offline work, learning how models work, high-volume simple tasks with no per-use bill, or experiments. <b>When not?</b> When you need the very best quality, deep research, or you have an ordinary laptop: the biggest cloud models are still stronger than what fits on a typical laptop.</p>`,
  clues: ['"Data must not leave the device" → local model', '"No internet on the plane" → local model', '"I need the best possible answer" → top cloud model', '"Will a 70B model run on my 16 GB laptop?" → check memory: probably not without heavy quantization', '"Open-source?" → say open-weight and check the licence'],
  code: [{ lang: 'python', run: true, title: 'Will this model fit in my memory? (rough estimate)', code: `# Rough rule: memory ≈ parameters × bytes per parameter × 1.2 overhead.
# Real numbers vary by tool and context length; this is a first check only.
BYTES = {16: 2.0, 8: 1.0, 4: 0.5}

def needed_gb(params_billion, bits):
    return params_billion * BYTES[bits] * 1.2

def fits(params_billion, bits, memory_gb):
    need = needed_gb(params_billion, bits)
    return need <= memory_gb * 0.8, round(need, 1)   # keep ~20% free for the OS

for size in [4, 8, 14, 32, 70]:
    for bits in [16, 4]:
        ok, need = fits(size, bits, memory_gb=16)
        print(f"{size:>3}B at {bits:>2}-bit needs ~{need:>5} GB -> {'fits' if ok else 'too big'} on 16 GB")
` }],
  codeTitle: ['Estimate whether a model fits your machine'],
  viz: {
    title: 'Quantization shrinks a model',
    gen: function () {
      var labels = ['16-bit', '8-bit', '4-bit'];
      var gb = [19, 10, 5];
      var frames = [{ narr: 'An <b>8B</b> model at full 16-bit precision needs about 19 GB of memory (8 billion × 2 bytes + overhead). Too big for a 16 GB laptop.', parts: [{ type: 'bars', label: 'GB needed (8B model)', values: [gb[0]], idxLabels: [labels[0]], hl: { 0: 'bad' } }] }];
      frames.push({ narr: 'At <b>8-bit</b> each number takes 1 byte: about 10 GB. Fits, with a tiny quality loss.', parts: [{ type: 'bars', label: 'GB needed (8B model)', values: gb.slice(0, 2), idxLabels: labels.slice(0, 2), hl: { 1: 'ok' } }] });
      frames.push({ narr: 'At <b>4-bit</b> about 5 GB. Runs on many laptops; quality drops a little more.', parts: [{ type: 'bars', label: 'GB needed (8B model)', values: gb.slice(), idxLabels: labels.slice(), hl: { 2: 'ok' } }] });
      frames.push({ narr: 'Tools like Ollama and LM Studio usually offer quantized versions by default, which is why local AI became practical.', parts: [{ type: 'bars', label: 'GB needed (8B model)', values: gb.slice(), idxLabels: labels.slice(), hl: { 2: 'sel' } }, { type: 'text', label: 'Trade-off', html: 'Smaller memory ↔ slightly lower quality. A bigger model at 4-bit often beats a smaller one at 16-bit.' }] });
      return frames;
    }
  },
  examples: [
    { title: 'Private journaling', html: `<p>A user runs a small Gemma or Llama model in LM Studio to summarise personal journal entries. Nothing leaves the laptop, no account needed.</p>` },
    { title: 'Offline on a flight', html: `<p>A developer pulls a Qwen coding model with Ollama before the flight and uses it to explain code offline. Slower and weaker than a cloud model, but available.</p>` },
    { title: 'When local is not worth it', html: `<p>A student with an 8 GB laptop tries to run a very large model; it crawls or fails. The free tier of a cloud assistant would have been faster and better.</p>` }
  ],
  deepDive: `<p><b>Licences.</b> Open-weight licences range from permissive (Apache 2.0, MIT) to custom licences with usage conditions. Check before using one in a product.</p>
  <p><b>Speed.</b> Local speed depends mostly on memory bandwidth and whether the model fits in GPU or unified memory. Apple-silicon Macs and PCs with a recent GPU do well; CPU-only runs are slow for larger models.</p>
  <p><b>Context length</b> also uses memory (the "KV cache"), so long documents need more RAM than the weights alone.</p>
  <p><b>Security.</b> Download models from official sources; a local API port should not be exposed to the internet. Local does not mean safe from bad output: verify answers as usual.</p>
  <p><b>Middle ground.</b> Many open-weight models are also hosted by cloud providers, giving you open models without your own hardware.</p>`,
  aiEra: `<p>Open-weight models make AI something you can own, inspect and fine-tune. Knowing how to run one locally, estimate its memory and explain quantization is a practical skill for engineers and a common interview topic for privacy-sensitive designs ("run a small model on-device, escalate to the cloud only when needed").</p>`,
  problems: [{
    title: 'Local or Cloud?',
    level: 'Medium', tags: ['local models'],
    statement: `<p>Decide local or cloud for: (a) a lawyer summarising confidential contracts, firm has no approved cloud AI; (b) a beginner with an 8 GB laptop wanting the best help on homework; (c) a hobbyist wanting to learn how models work and experiment for free.</p>`,
    constraints: `Choice + reason + one practical step each.`,
    example: `<p>(c) Local: install Ollama or LM Studio and try a small model.</p>`,
    brute: { why: `<p><b>Weak answer:</b> "Local is always better because it is private." It ignores weak hardware and the lower quality of small models.</p>` },
    mcq: { q: 'What does 4-bit quantization mainly do?', options: ['Shrinks memory needs with a small quality loss', 'Makes the model smarter', 'Connects the model to the internet'], answer: 0, explain: 'Fewer bits per weight → less memory, slightly lower quality.' },
    hints: [`<p>Hint 1: ask who must never be able to see the data.</p>`, `<p>Hint 2: how much memory does the machine have?</p>`, `<p>Hint 3: learning goals favour local experimenting.</p>`],
    solution: { approach: `<p><b>Strong answer:</b> (a) Local (or wait for an approved enterprise tool): contracts are confidential and no cloud tool is approved; run a mid-size open-weight model via LM Studio on a capable machine and still check summaries against the text. (b) Cloud: an 8 GB laptop can only run small models; a free cloud tier gives better answers. Turn off training in settings. (c) Local: install Ollama, run a small Gemma or Llama model, compare 4-bit and 8-bit versions to see the quality/memory trade-off.</p>`, complexity: `<p>Judgement exercise; no Big-O applies.</p>` }
  }]
});

topics.push({
  title: 'Choosing by Task and Keeping Up',
  analogy: `<p>A good mechanic does not ask "what is the best tool?" but "what is the job?". A <b>decision guide</b> is the mechanic's habit written down: look at the job, pick the tool, check the work. And because new tools arrive every month, the mechanic reads the catalogue now and then, without throwing away the toolbox each time.</p>`,
  explain: `<p>A simple decision guide (ask in order):</p>
  <ol>
    <li><b>Data:</b> is it confidential? → approved business tool or local model only.</li>
    <li><b>Freshness:</b> does it need today's information or sources? → web search / deep research / Perplexity-style tool.</li>
    <li><b>Where you work:</b> Google Workspace → Gemini; Microsoft 365 → Copilot; code editor → a coding assistant (later lessons).</li>
    <li><b>Difficulty:</b> many steps? → reasoning model; simple? → fast model.</li>
    <li><b>Input size and type:</b> long PDFs, video, spreadsheets, images → an assistant whose file features and context window fit.</li>
    <li><b>Budget and limits:</b> free tier first; pay when limits block real work.</li>
  </ol>
  <p><b>Keeping up without burning out:</b></p>
  <ul>
    <li>Follow official sources: each vendor's release notes, changelog and pricing page.</li>
    <li>Keep a <b>personal test set</b>: 3–5 real tasks you rerun when a new model arrives. If it does not beat your current tool on your tasks, ignore the hype.</li>
    <li>Re-check privacy settings after major updates; defaults sometimes change.</li>
    <li>Keep prompts and custom instructions in your own notes so switching is cheap.</li>
    <li>Write "as of" dates in your notes: AI facts expire.</li>
  </ul>`,
  clues: ['"Which is best?" → "best for what task, data and budget?"', '"A new model just launched" → run your personal test set before switching', '"The setting moved" → check the vendor help centre, not old blog posts', '"Need sources" → search-first; "need privacy" → approved or local; "need depth" → reasoning', 'Interview: "How do you stay current?" → official changelogs + own benchmark tasks + dated notes'],
  code: [{ lang: 'python', run: true, title: 'A requirements-based tool picker', code: `# Turn the decision guide into code. Order matters: privacy first.
def pick_tool(confidential=False, approved_business_tool=None, needs_sources=False,
              suite=None, many_steps=False, offline=False):
    if offline:
        return "local open-weight model (Ollama / LM Studio)"
    if confidential:
        return approved_business_tool or "local open-weight model (no approved cloud tool)"
    if needs_sources:
        return "search-first assistant or deep research, then open the sources"
    if suite == "google":
        base = "Gemini"
    elif suite == "microsoft":
        base = "Microsoft Copilot"
    else:
        base = "any major assistant you know well"
    return base + (" with a reasoning model" if many_steps else " with a fast model")

cases = [
    dict(needs_sources=True),
    dict(confidential=True, approved_business_tool="company's enterprise assistant"),
    dict(confidential=True),
    dict(suite="google", many_steps=True),
    dict(offline=True),
    dict(),
]
for c in cases:
    print(c, "->", pick_tool(**c))
` }],
  codeTitle: ['Decision guide as a function'],
  viz: stepTable('Walking the decision guide', 'Scenario: summarise a confidential 80-page PDF of internal specs', ['Question', 'Answer', 'Effect on choice'], [
    ['Confidential?', 'Yes', 'Only approved business tool or local'],
    ['Needs web sources?', 'No', 'No deep research needed'],
    ['Where do we work?', 'Microsoft 365, Copilot approved', 'Microsoft 365 Copilot'],
    ['Many steps?', 'Moderate', 'Reasoning if summary is shallow'],
    ['Input size?', '80 pages', 'Check file size limit; split if needed']
  ], ['Privacy comes <b>first</b>: it removes most options.', 'No fresh outside info is needed.', 'The approved tool sits in their suite.', 'Start fast; escalate to reasoning if needed.', 'Check that the file fits.'], 'Answer: the approved Microsoft 365 Copilot, verifying key numbers against the PDF.'),
  examples: [
    { title: 'New model hype', html: `<p>A new model tops a leaderboard. You rerun your 4 saved tasks: it wins on 2, ties on 2. You switch only for coding tasks where it won.</p>` },
    { title: 'Setting renamed', html: `<p>An old blog says "turn off X in Settings", but the menu changed. The vendor's help centre shows the new path. Prefer official docs.</p>` },
    { title: 'Two-tool habit', html: `<p>Many people keep one main assistant plus one search-first tool. That covers most needs without paying for everything.</p>` }
  ],
  deepDive: `<p><b>Build your own mini benchmark.</b> Pick tasks you actually do (a bug, a summary, an email, a research question). Write what a good answer must include. Score each tool blind if possible. Rerun every few months.</p>
  <p><b>Beware of leaderboards.</b> Public rankings measure specific tests or crowd votes; they can be gamed and may not reflect your language, domain or style.</p>
  <p><b>Portability.</b> Store prompts, instructions and examples as text files. Prefer tools that let you export chats and data.</p>
  <p><b>Organisation level.</b> Teams should keep an approved-tools list, a data-classification rule (what may go where) and an owner who reviews new tools quarterly.</p>`,
  aiEra: `<p>The half-life of AI product knowledge is months. What lasts is the method: classify the data, match the feature, pick fast vs reasoning, verify, and re-test when things change. Interviewers value candidates who can explain this reasoning far more than a list of brand names.</p>`,
  problems: [{
    title: 'Run the Decision Guide',
    level: 'Medium', tags: ['decision guide'],
    statement: `<p>Use the six-step guide for: "A startup founder wants a cited comparison of three payment providers' fees and fraud tools, to share with investors next week. Data is public. Team uses Google Workspace."</p>`,
    constraints: `Walk all six steps and give a final choice and a verification step.`,
    example: `<p>Step 1 (data): public → any tool allowed.</p>`,
    brute: { why: `<p><b>Weak answer:</b> "Ask Gemini because they use Google." It skips the need for fresh, cited information and verification for investors.</p>` },
    mcq: { q: 'Which step decides most here?', options: ['Freshness / need for sources', 'Offline use', 'Confidentiality'], answer: 0, explain: 'Fees change and investors need citations.' },
    hints: [`<p>Hint 1: the data is public, so privacy does not narrow choices.</p>`, `<p>Hint 2: fees change; sources are required.</p>`, `<p>Hint 3: deep research + check official fee pages.</p>`],
    solution: { approach: `<p><b>Strong answer:</b> (1) Data public → no restriction. (2) Needs current, cited facts → deep research (Gemini's fits their Google Workspace, Perplexity or ChatGPT also work). (3) Google Workspace → Gemini can save the report to Docs. (4) Comparison has several steps → research mode already reasons. (5) Input is the web, no big files. (6) Use the plan they have; pay only if research limits block them. Verification: open each provider's official pricing page, confirm every fee, and date the document "as of" because fees change.</p>`, complexity: `<p>Judgement exercise; no Big-O applies.</p>` }
  }]
});
// ---------- PRACTICE ----------
function P(title, level, tags, statement, constraints, example, bruteWhy, mcq, hints, approach, followUps) {
  practice.push({ title: title, level: level, tags: tags, statement: statement, constraints: constraints, example: example,
    brute: { why: bruteWhy }, mcq: mcq, hints: hints, solution: { approach: approach, complexity: '<p>Judgement exercise: evaluate by the quality of your reasoning, not by Big-O.</p>', followUps: followUps } });
}

P('Assistant or Model?', 'Easy', ['basics'],
  `<p>Your friend says "I use GPT, so I use ChatGPT, same thing". Explain the difference between an assistant and a model in two sentences, with one example of an assistant that can use models from more than one company.</p>`,
  `Two or three sentences.`,
  `<p>The assistant is the app; the model is the brain inside it.</p>`,
  `<p><b>Weak answer:</b> "They are the same." It hides the fact that one app may offer several models and features beyond the model.</p>`,
  { q: 'Which is an assistant rather than a model family?', options: ['Perplexity', 'Llama', 'Qwen'], answer: 0, explain: 'Perplexity is an app; Llama and Qwen are model families.' },
  [`<p>Hint 1: think of the app versus the engine inside it.</p>`, `<p>Hint 2: an app adds search, files, memory and settings.</p>`, `<p>Hint 3: some apps let you choose models from different vendors.</p>`],
  `<p><b>Strong answer:</b> An <b>assistant</b> is the product you use (app, website, features like web search, files, memory, privacy settings); a <b>model</b> is the trained language model inside that generates the replies. ChatGPT is OpenAI's assistant running OpenAI's GPT models. Perplexity and Microsoft Copilot are examples of assistants that can use models from more than one company, so the same model can feel different in different apps because of the features around it.</p>`,
  ['Why might the same model give different answers in two apps?']);

P('Fresh Facts Needed', 'Easy', ['web search'],
  `<p>You ask an assistant "what is the latest version of Python?" and it gives an old version with confidence. What happened and how do you fix it?</p>`,
  `Explain cause + fix.`,
  `<p>Models learn from data up to a cutoff date.</p>`,
  `<p><b>Weak answer:</b> "The AI is broken; use another one." Every model has a knowledge cutoff; switching without web search may repeat the problem.</p>`,
  { q: 'What is the best fix?', options: ['Turn on web search or check python.org', 'Ask the same question louder', 'Use a reasoning model'], answer: 0, explain: 'Freshness needs search or an official source; reasoning does not add new facts.' },
  [`<p>Hint 1: ask when the model was last trained on data.</p>`, `<p>Hint 2: what feature brings in today's information?</p>`, `<p>Hint 3: the official source is the final check.</p>`],
  `<p><b>Strong answer:</b> Models have a <b>knowledge cutoff</b>: they only know what was in their training data, so recent releases are missing, and they may answer confidently anyway. Fix: enable web search (or use a search-first assistant such as Perplexity) and ask it to cite its source, then confirm on the official site (python.org downloads page). For any "latest", price or version question, prefer search plus an official source over the model's memory.</p>`,
  ['Which other question types are cutoff-sensitive?']);

P('Hit the Limit', 'Easy', ['plans'],
  `<p>You are on a free plan and hit the usage limit every afternoon while practising coding questions. List three options before deciding to pay, and when paying makes sense.</p>`,
  `Three options + a rule for paying.`,
  `<p>Option: use a fast model for easy questions.</p>`,
  `<p><b>Weak answer:</b> "Buy the most expensive plan immediately." You might not need it; cheaper fixes exist.</p>`,
  { q: 'Which uses the limit fastest?', options: ['Long files with reasoning mode', 'Short questions on a fast model', 'Reading old chats'], answer: 0, explain: 'Heavy inputs and thinking consume more of the cap.' },
  [`<p>Hint 1: what consumes the limit fastest?</p>`, `<p>Hint 2: could another free tool cover overflow?</p>`, `<p>Hint 3: pay when limits block real work regularly.</p>`],
  `<p><b>Strong answer:</b> (1) Use the fast model for simple questions and reserve reasoning for hard ones. (2) Start a new chat instead of dragging a very long conversation (long context costs more each message). (3) Use a second free assistant for overflow. Pay for one individual plan when you hit limits several times a week on work that matters (job prep counts), after checking the current pricing page and any student discount.</p>`,
  ['How would you check whether the paid tier actually helps?']);

P('Research Report Check', 'Medium', ['deep research', 'verification'],
  `<p>A deep-research report says "Company X's app has 50 million users (source 4)". How do you verify it before putting it in a presentation?</p>`,
  `Give a step-by-step check.`,
  `<p>Open source 4 first.</p>`,
  `<p><b>Weak answer:</b> "It has a citation, so it is true." Citations can point to pages that say something else, are outdated, or are low quality.</p>`,
  { q: 'Source 4 is a blog quoting no one. What next?', options: ['Find a primary source like the company report', 'Accept it', 'Ask the AI to rephrase'], answer: 0, explain: 'Primary sources beat second-hand claims.' },
  [`<p>Hint 1: does the source actually say it?</p>`, `<p>Hint 2: ask how old and how reliable that source is.</p>`, `<p>Hint 3: find the primary source and date the fact.</p>`],
  `<p><b>Strong answer:</b> 1) Open source 4 and search the page for the number; check it says 50 million and for what (monthly active users? downloads?). 2) Check the date: user numbers change. 3) Judge reliability: company filings, official press releases or reputable news beat anonymous blogs. 4) If weak, find the primary source yourself. 5) In the slide, cite the primary source with "as of" date and the exact metric. If you cannot confirm it, drop the number.</p>`,
  ['How would you prompt the research tool to prefer primary sources?']);

P('Spreadsheet Numbers', 'Medium', ['file analysis'],
  `<p>You upload a 10,000-row sales spreadsheet and ask for the total revenue per country. The assistant gives a neat table. What could go wrong and how do you check?</p>`,
  `Name two risks and two checks.`,
  `<p>Risk: only part of the file was read.</p>`,
  `<p><b>Weak answer:</b> "The table looks professional, ship it." Format is not evidence of correctness.</p>`,
  { q: 'Most reliable sign the totals were computed, not guessed?', options: ['The assistant ran code over the full file and shows it', 'The answer is long', 'The table is colourful'], answer: 0, explain: 'Code execution over the real data is checkable.' },
  [`<p>Hint 1: ask whether the whole file was actually read.</p>`, `<p>Hint 2: was it computed or written from memory-like guessing?</p>`, `<p>Hint 3: recompute one country yourself as a spot check.</p>`],
  `<p><b>Strong answer:</b> Risks: the file was truncated or only sampled; text-only models may "estimate" numbers instead of computing; currency or duplicate rows mishandled. Checks: use the code-execution/data-analysis feature and read the code it ran (does it load all rows, group by country, sum the right column?); recompute one or two countries with a spreadsheet pivot table; check that the grand total matches the column sum.</p>`,
  ['What if the file is too big to upload?']);

P('Voice Practice Safely', 'Medium', ['voice', 'privacy'],
  `<p>You want to practise behavioural interviews using voice mode on the train. What settings and habits make this useful and safe?</p>`,
  `Two usefulness tips, two safety tips.`,
  `<p>Ask it to act as a strict interviewer.</p>`,
  `<p><b>Weak answer:</b> "Just start talking." You might share confidential project details aloud and in the transcript.</p>`,
  { q: 'Which detail is safest to replace with a placeholder?', options: ['Your employer\'s confidential client name', 'The word "team"', 'Your favourite colour'], answer: 0, explain: 'Confidential names should not go into transcripts.' },
  [`<p>Hint 1: set the role and feedback style.</p>`, `<p>Hint 2: voice chats may be stored like text chats.</p>`, `<p>Hint 3: check the voice training setting.</p>`],
  `<p><b>Strong answer:</b> Useful: tell it to act as a strict interviewer, ask one question at a time, follow up, and give STAR-based feedback at the end; ask for a transcript summary to review. Safe: replace confidential client and project names with placeholders, avoid speaking private details in public, and check whether the assistant has a separate voice training setting (Copilot, for example, has separate text and voice training toggles) and turn it off if you prefer.</p>`,
  ['How would you measure progress over weeks?']);

P('Open-Weight Licence Check', 'Medium', ['local models', 'licences'],
  `<p>Your team wants to ship a product feature using an open-weight model. What must you check before choosing a family?</p>`,
  `List four checks.`,
  `<p>Check: the licence allows commercial use.</p>`,
  `<p><b>Weak answer:</b> "It is open, so we can do anything." Open-weight licences differ and some have conditions.</p>`,
  { q: 'Why say "open-weight" instead of "open-source"?', options: ['Weights are public but data/code may not be', 'They mean exactly the same', 'Open-weight models cannot be downloaded'], answer: 0, explain: 'Publishing weights is not the same as publishing everything.' },
  [`<p>Hint 1: start with the legal side: what does the licence allow?</p>`, `<p>Hint 2: then measure quality on your own real tasks.</p>`, `<p>Hint 3: then check hardware needs and hosting cost.</p>`],
  `<p><b>Strong answer:</b> (1) Licence: commercial use allowed? any user-count or acceptable-use conditions? (2) Quality on your own test set in your languages and domain. (3) Size and hardware: does it fit your GPUs at the needed speed, with quantization if needed? (4) Ecosystem and support: tooling (e.g. runs in Ollama/vLLM), update cadence, safety tuning. Also consider hosted options from cloud providers and keep an evaluation set to compare new releases.</p>`,
  ['How would you compare two families fairly?']);

P('Team Approved-Tools Policy', 'Medium', ['policy', 'privacy'],
  `<p>Draft a five-line AI tools policy for a 10-person design agency that handles client work.</p>`,
  `Five short rules.`,
  `<p>Rule 1: client files only in the approved business plan.</p>`,
  `<p><b>Weak answer:</b> "Use AI responsibly." Too vague to follow.</p>`,
  { q: 'Which rule matters most for client trust?', options: ['Client data only in approved tools with no training', 'Use dark mode', 'Always use the newest model'], answer: 0, explain: 'Client data protection is the core risk.' },
  [`<p>Hint 1: classify the data: public, internal, client-confidential.</p>`, `<p>Hint 2: name the approved tool and settings.</p>`, `<p>Hint 3: include what to do after a mistake.</p>`],
  `<p><b>Strong answer:</b> 1) Approved tool: the agency's business-plan assistant; client material only there. 2) Personal accounts: public info only; training turned off. 3) Never paste passwords, contracts or personal data of clients' customers. 4) Check AI output (facts, image rights) before it goes to a client, and follow each client's rules on AI use. 5) Report mistakes the same day; rotate any leaked secret. Owner reviews this list each quarter as tools change.</p>`,
  ['How would you enforce rule 2?']);

P('Choose the Stack for a Researcher', 'Hard', ['decision guide'],
  `<p>A PhD student reads 30 papers a month, writes in LaTeX, codes in Python, has a small budget, and some unpublished data is confidential. Design their AI toolkit (max two paid things) and rules.</p>`,
  `Cover research, reading, writing, coding, confidential data, budget.`,
  `<p>Search-first or deep research for finding papers.</p>`,
  `<p><b>Weak answer:</b> "Pay for every assistant." Over budget and still no plan for confidential data.</p>`,
  { q: 'Where should the confidential unpublished data go?', options: ['University-approved tool or a local model', 'Any free chatbot with training on', 'A public forum'], answer: 0, explain: 'Sensitive data needs approved or local processing.' },
  [`<p>Hint 1: split tasks by data sensitivity.</p>`, `<p>Hint 2: one paid general assistant may cover reading, writing and coding.</p>`, `<p>Hint 3: local model for confidential data; verify citations.</p>`],
  `<p><b>Strong answer:</b> Research: a search-first tool or deep research on the free tier for discovery, always opening the actual papers. Reading and writing: one paid general assistant with long-file support for summarising papers and editing LaTeX, training off. Coding: the same assistant or a free coding tool (covered in later lessons). Confidential data: whatever the university approves, otherwise a local open-weight model via Ollama or LM Studio on a capable machine. Rules: never cite a paper you have not opened; date notes; keep a 4-task personal test set and re-evaluate each term; check student pricing.</p>`,
  ['What would change with zero budget?']);

P('Vendor Comparison Without Bias', 'Hard', ['evaluation'],
  `<p>Your manager asks "Which assistant should our 50-person support team buy?" Design a fair two-week evaluation.</p>`,
  `Cover tasks, scoring, privacy, cost, decision.`,
  `<p>Use 20 real (redacted) tickets as tasks.</p>`,
  `<p><b>Weak answer:</b> "Read a leaderboard and buy the top one." Leaderboards do not measure your tickets, privacy terms or admin needs.</p>`,
  { q: 'Why score answers blind?', options: ['To reduce brand bias', 'To save electricity', 'Because vendors require it'], answer: 0, explain: 'Hiding which tool wrote an answer makes scoring fairer.' },
  [`<p>Hint 1: real team tasks beat public benchmarks.</p>`, `<p>Hint 2: non-quality criteria often decide.</p>`, `<p>Hint 3: write the rubric before testing.</p>`],
  `<p><b>Strong answer:</b> 1) Shortlist 2–3 assistants with business plans that meet privacy needs (no training on data, data-processing agreement, SSO, admin). 2) Build a test set of 20–30 redacted real tickets plus a rubric (correct, policy-compliant, tone, time saved). 3) Run each tool, score blind with two reviewers. 4) Pilot with 5 agents for a week, track time per ticket and errors. 5) Compare total cost (seats, limits) from current pricing pages, integrations with the help desk, and support. 6) Decide, document "as of" date, re-evaluate yearly.</p>`,
  ['What would make you rule out a tool immediately?']);

P('Local vs Cloud Cost Break-Even', 'Hard', ['cost', 'local models'],
  `<p>A team runs 2 million simple classification requests a month through a cloud API. Someone proposes buying a GPU server to run a small open-weight model locally. Explain how you would decide, using rough numbers you define yourself.</p>`,
  `Show the comparison method; label all prices as assumptions.`,
  `<p>Cloud cost = requests × tokens × price per token.</p>`,
  `<p><b>Weak answer:</b> "Local is free after you buy the GPU." Ignores power, maintenance, engineer time, quality differences and idle capacity.</p>`,
  { q: 'Which cost is easiest to forget for local hosting?', options: ['Engineer time to maintain it', 'The GPU itself', 'The model download'], answer: 0, explain: 'Operations time is real and recurring.' },
  [`<p>Hint 1: compute monthly cloud cost from tokens.</p>`, `<p>Hint 2: spread hardware cost over its life and add running costs.</p>`, `<p>Hint 3: quality must be equal on your test set before cost matters.</p>`],
  `<p><b>Strong answer:</b> First check quality: run both models on a labelled sample; if the small local model is not accurate enough, stop. Cloud (assumed): 2M requests × 500 tokens = 1B tokens; at an assumed $0.20 per million → about $200/month. Local (assumed): server $8,000 over 36 months ≈ $220/month + power and hosting + several engineer hours monthly. Here cloud wins. Local wins when volume is much higher, data must stay in-house, or latency/offline needs demand it. Re-run with current pricing pages; label every number as an assumption.</p>`,
  ['At what volume would local break even in your example?']);

P('Keeping Up Plan', 'Hard', ['keeping up'],
  `<p>Design a sustainable process for an engineering team to keep up with AI tool changes without chasing every launch.</p>`,
  `Cover sources, cadence, evaluation, privacy re-checks, ownership.`,
  `<p>Monthly 30-minute review by a rotating owner.</p>`,
  `<p><b>Weak answer:</b> "Everyone follows AI news on social media." Noisy, uneven and not tied to your tasks.</p>`,
  { q: 'Best signal that a new model is worth switching to?', options: ['It beats your current tool on your own test set', 'It trends on social media', 'It has a bigger number in its name'], answer: 0, explain: 'Your own tasks decide, not hype.' },
  [`<p>Hint 1: official changelogs over social posts.</p>`, `<p>Hint 2: keep a fixed, versioned evaluation set of real tasks.</p>`, `<p>Hint 3: re-check privacy and pricing on a schedule.</p>`],
  `<p><b>Strong answer:</b> Owner: a rotating "AI tools steward" each quarter. Sources: vendor release notes, pricing pages, privacy/help centres for the approved tools, plus one trusted newsletter. Cadence: a monthly 30-minute review; urgent only for security or policy changes. Evaluation: a versioned set of 10 real team tasks with a rubric; a new model must beat the incumbent before adoption. Privacy: after each major update, re-check training/retention defaults and admin settings. Output: a dated one-page "current recommendations" doc and an approved-tools list.</p>`,
  ['How would you retire a tool?']);
// ---------- QUIZ ----------
function Q(q, options, answer, explain) { quiz.push({ q: q, options: options, answer: answer, explain: explain }); }
Q('What is the difference between an AI assistant and a model?', ['The assistant is the app; the model is the engine that generates text', 'They are the same thing', 'A model is always free; an assistant always costs money'], 0, 'Assistants wrap models with features like search, files and settings.');
Q('Which assistant is best known for searching the web first and showing numbered sources?', ['Perplexity', 'Gemma', 'LM Studio'], 0, 'Perplexity is designed as a search-first answer engine.');
Q('When should you switch to a reasoning ("thinking") model?', ['For multi-step problems like debugging or planning', 'For fixing a typo', 'Whenever you want a faster reply'], 0, 'Reasoning models spend extra steps, worth it for hard tasks.');
Q('What does "open-weight" mean?', ['The trained weights are published so you can download and run the model', 'The model is free on every website', 'The training data is fully public'], 0, 'Weights are public; data and code may not be.');
Q('Which tool lets you run open-weight models locally with a simple command?', ['Ollama', 'Perplexity', 'Microsoft Teams'], 0, 'Ollama downloads and runs models on your machine.');
Q('What does 4-bit quantization do?', ['Stores weights with fewer bits to save memory, with a small quality loss', 'Makes the model four times smarter', 'Adds web search'], 0, 'Fewer bits → smaller memory footprint.');
Q('Turning off the model-training setting usually…', ['Affects future chats, not data already used or kept for safety', 'Deletes everything ever sent', 'Makes any tool approved by your employer'], 0, 'Opt-outs are forward-looking and do not end all retention.');
Q('Your app needs to call a model. What do you use?', ['The vendor\'s API, billed per token', 'Your chat subscription login', 'A screenshot of the chat'], 0, 'Chat plans and APIs are separate products.');
Q('A deep-research report cites a source. What should you do?', ['Open the source and confirm it says the claim', 'Trust it because it has a number', 'Delete the citation'], 0, 'Citations can be wrong or misread.');
Q('Which is the strongest reason to run a model locally?', ['The data must not leave your device', 'You want the very highest quality answer', 'Your laptop has 4 GB of RAM'], 0, 'Privacy/offline needs are the main reason.');
Q('Roughly how much memory do an 8B model\'s weights need at 16-bit?', ['About 16 GB plus overhead', 'About 1 GB', 'About 200 GB'], 0, '8 billion × 2 bytes ≈ 16 GB.');
Q('Best way to decide whether a newly launched model is better for you?', ['Rerun your own small set of real tasks', 'Check social media likes', 'Pick the one with the newest name'], 0, 'Your tasks are the benchmark that matters.');
Q('Which plan type usually adds admin controls and does not train on company data by default?', ['Business / enterprise plans', 'Free consumer plans', 'Any plan with dark mode'], 0, 'Commercial terms typically exclude training by default.');

// ---------- INTERVIEW ----------
function I(q, level, a, followUps) { interview.push({ q: q, level: level, a: a, followUps: followUps }); }
I('Which AI assistants do you use and why?', 'B', `<p>I pick by task. For everyday writing and coding questions I use one general assistant I know well; for anything needing current facts I use web search or a search-first tool like Perplexity and open the sources; for long documents I use an assistant that handles long inputs; at work I only use the tool my employer approved. I compare tools on my own tasks every few months rather than following hype.</p>`, ['How do you compare them?', 'What would make you switch?']);
I('Explain fast models vs reasoning models.', 'B', `<p>Fast models answer immediately and are ideal for simple tasks such as rewriting or summarising. Reasoning models work through intermediate steps before answering, which takes longer and uses more of a usage limit or budget, but they do much better on multi-step problems like debugging, maths and planning. I start fast and escalate when the task has many steps or the first answer is shallow. Neither removes the need to verify.</p>`, ['Why can reasoning models still be wrong?', 'How would you route between them in a product?']);
I('What is an open-weight model and when would you use one?', 'I', `<p>An open-weight model publishes its trained weights so anyone can download and run it, e.g. Llama, Qwen, DeepSeek, Mistral and Gemma. I would use one when data must stay on my hardware, when I need offline use, when high volume makes per-token pricing expensive, or when I want to fine-tune or inspect the model. I check the licence first and test quality on my own tasks, since the largest closed models are often still stronger.</p>`, ['Why not call it open-source?', 'How do you host one?']);
I('How do you protect privacy when using AI tools?', 'B', `<p>I only put work data into tools my employer approved, usually business plans that do not train on our data by default. On personal accounts I switch off model-training in the data or privacy settings and use temporary chats when available. I never paste secrets or other people's personal data, I redact logs, and if something leaks I rotate the secret and report it immediately. Opt-outs are forward-looking, so habits matter more than settings.</p>`, ['What does opting out not cover?', 'How would you handle a leak?']);
I('How do you estimate the monthly cost of an LLM feature?', 'I', `<p>I estimate requests per day, average input and output tokens per request, and multiply by the current per-million-token prices from the vendor's pricing page, remembering that output tokens usually cost more and reasoning models bill thinking tokens. Then I add headroom for retries and growth, and look at savings: caching repeated prompts, shorter prompts, and routing easy requests to a cheaper model. I label all prices with an "as of" date.</p>`, ['Which lever saves the most?', 'How would you monitor it?']);
I('When is running a model locally not worth it?', 'I', `<p>When the hardware is weak (a model that barely fits will be slow), when you need top quality or features like deep research and fresh web results, or when volume is low so a cloud plan is cheaper than buying and maintaining a GPU. Local also means you own updates, security and monitoring. I would choose a hosted open-weight model or an approved cloud plan instead in those cases.</p>`, ['What hardware matters most?', 'What is the middle ground?']);
I('Explain quantization to a non-technical person.', 'B', `<p>A model is billions of numbers. Normally each number is stored precisely, using lots of memory. Quantization stores each number more roughly, like rounding prices to the nearest dollar, so the whole model needs maybe a quarter of the memory. Answers get slightly worse, but the model can now run on a normal laptop. Tools like Ollama and LM Studio usually give you these smaller versions by default.</p>`, ['Is a big 4-bit model better than a small 16-bit one?']);
I('How do you verify a deep-research report?', 'I', `<p>I treat it as a draft. I open the citations behind the key claims to confirm they say what the report says, check dates because facts age, prefer primary sources such as official docs and filings, and look for claims with no citation. I ask the tool to list what it could not confirm. Anything I cannot verify I remove or mark as unconfirmed before sharing.</p>`, ['How do you prompt for better sources?']);
I('Your company has no AI policy. What would you propose?', 'A', `<p>A short policy: one approved business-plan assistant with admin controls and no-training terms; a data-classification rule saying what may go into which tool; a ban on secrets and customer personal data in unapproved tools; a requirement to verify AI output before it reaches customers or production; a same-day reporting path for leaks; and a named owner who reviews tools and settings quarterly. I would start with a pilot and gather feedback before rolling out.</p>`, ['How would you get adoption?', 'How do you handle shadow AI use?']);
I('How do you keep up with AI tools without wasting time?', 'B', `<p>I follow official sources (release notes, pricing and privacy pages) for the tools I use, and keep a small personal test set of real tasks. When something new launches I rerun those tasks; if it does not clearly win, I ignore it. I store my prompts in notes so switching is cheap, re-check privacy settings after big updates, and date my notes because AI facts expire fast.</p>`, ['What is in your test set?']);
I('Design a fair evaluation to pick an AI assistant for a team.', 'A', `<p>Shortlist tools that meet privacy and admin requirements first. Build a test set of real, redacted tasks with a written rubric. Run each tool, score blind with two reviewers, and pilot with a few users measuring time saved and error rates. Compare total cost from current pricing pages, integrations and support. Decide, document with a date, and re-evaluate on a schedule, since the leader changes over months.</p>`, ['How large should the test set be?', 'What would disqualify a vendor?']);
I('A product needs an assistant on-device for privacy, but some questions are hard. Design the model setup.', 'E', `<p>Use a small quantized open-weight model on the device for most requests, so data stays local and latency is low. Add a router: if confidence is low or the task is complex, ask the user for consent and send a minimised, redacted request to a stronger cloud model under business terms that exclude training. Log decisions locally, evaluate both paths on a test set, and let enterprise admins disable cloud fallback entirely. Track model updates and re-test each release.</p>`, ['How do you measure confidence?', 'What data do you strip before escalation?']);

registerModule({
  id: 'ai28',
  title: 'AI Tools: Choosing Your AI Assistant',
  intro: `<p>There are many AI assistants (ChatGPT, Claude, Gemini, Microsoft Copilot, Perplexity) plus open-weight models such as Llama, Qwen, DeepSeek, Mistral and Gemma that you can run yourself. This lesson teaches you <b>which one to use and why</b>: fast vs reasoning models, free vs paid plans, deep research, files, voice, images and agents, privacy and training settings, running models locally with Ollama or LM Studio, and a simple decision guide.</p><p>Products change monthly, so everything here is described <b>as of late 2026</b> and you learn a method that outlasts the brand names. Always check current pricing and settings pages.</p>`,
  goals: [
    'Describe what ChatGPT, Claude, Gemini, Microsoft Copilot and Perplexity are each typically best at',
    'Choose between fast and reasoning models for a task',
    'Pick a plan tier and estimate API cost without relying on exact prices',
    'Use deep research, file analysis, voice, image and agent features with the right checks',
    'Find and change data-training settings and know what opting out does not cover',
    'Decide when running an open-weight model locally is worth it and estimate whether it fits',
    'Apply a decision guide and a personal test set to keep up as tools change'
  ],
  prereqs: `<p>Module ai02 (Using AI Tools Effectively) covers prompting and verifying output; this lesson builds on it. No coding is required; the optional Python demos use only the standard library.</p>`,
  langExplain: `<p>The runnable demos are in Python only because they are tiny decision helpers; the ideas apply to any language.</p>`,
  hours: 4,
  topics: topics, practice: practice, quiz: quiz, interview: interview
});
})();
