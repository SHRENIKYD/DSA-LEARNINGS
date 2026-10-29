(function () {
var topics = [], practice = [], quiz = [], interview = [];

// helper: a step-by-step illustration. Input is "step: detail; step: detail" (2-8 items).
// Each frame adds one row to a table; the last frame shows a takeaway.
function stepsViz(title, inputLabel, input, cols, startNarr, rowNarr, finalHtml) {
  return {
    title: title, input: input, inputLabel: inputLabel,
    gen: function (inp) {
      var items = String(inp || '').split(';').map(function (s) { return s.trim(); }).filter(Boolean);
      if (items.length < 2 || items.length > 8) throw new Error('Give 2-8 items separated by ";" like: ' + input.split(';').slice(0, 2).join(';'));
      var rows = items.map(function (s) {
        var k = s.indexOf(':');
        if (k < 1) throw new Error('Each item needs "name: detail", for example: ' + input.split(';')[0]);
        return [s.slice(0, k).trim().slice(0, 40), s.slice(k + 1).trim().slice(0, 140)];
      });
      var frames = [{ narr: startNarr, parts: [{ type: 'table', label: title, columns: cols, rows: [], hl: {} }] }];
      for (var i = 0; i < rows.length; i++) {
        var hl = {}; hl[i] = 'cur';
        frames.push({ narr: rowNarr(rows[i], i), parts: [{ type: 'table', label: title, columns: cols, rows: rows.slice(0, i + 1).map(function (r) { return r.slice(); }), hl: hl }] });
      }
      var hl2 = {}; rows.forEach(function (r, i) { hl2[i] = 'ok'; });
      frames.push({ narr: 'All steps done. ' + finalHtml, parts: [{ type: 'table', label: title, columns: cols, rows: rows.map(function (r) { return r.slice(); }), hl: hl2 }, { type: 'text', label: 'Takeaway', html: '<p>' + finalHtml + '</p>' }] });
      return frames;
    }
  };
}

// helper: a scenario problem. weak = weak approach, strong = model answer.
function sp(o) {
  return {
    title: o.title, level: o.level, tags: o.tags,
    statement: '<p><b>Situation:</b> ' + o.situation + '</p><p><b>Your task:</b> ' + o.task + '</p>',
    constraints: o.constraints || 'No coding. Use any general AI assistant your employer approves. Names and numbers are invented.',
    example: '<p><b>A weak approach looks like:</b> ' + o.weak + '</p><p>' + H.c('r', o.weakWhy) + '</p>',
    brute: { why: '<p><b>Weak approach:</b> ' + o.weak + '</p><p>' + H.c('r', 'Why it fails: ') + o.weakWhy + '</p>' },
    mcq: o.mcq,
    hints: o.hints,
    solution: {
      approach: '<p><b>Strong approach (model answer):</b> ' + o.strong + '</p>',
      complexity: '<p>Not applicable: this is a judgement exercise. Time check: ' + (o.time || 'the AI part should take minutes; your checking is the part you must never skip') + '.</p>',
      followUps: o.followUps || ['What would you check before sending this?', 'What would change if the information were confidential?']
    }
  };
}
function mq(q, o, a, e) { return { q: q, options: o, answer: a, explain: e }; }
function box(label, text) { return { lang: 'text', title: label, code: text, check: false }; }

// ---------- TOPIC 1: Writing, editing and email ----------
topics.push({
  title: 'Writing, Editing and Email: AI as Your First-Draft Partner',
  analogy: `<p>Think of an AI assistant as a quick, keen new colleague who has read a lot but has never met your customers, your boss or your company. Give them a clear brief and they hand you a decent first draft in seconds. Give them nothing and they write something polite, generic and slightly wrong. You are still the editor whose name goes on it.</p>`,
  explain: `<p><b>The plain idea:</b> a chat assistant (a tool like ChatGPT, Claude, Gemini or Microsoft Copilot where you type a request in everyday words) is very good at turning rough notes into tidy text, and tidy text into a different tone or length. ai01 explained why: it predicts likely words, so it is fluent, but it does not know <i>your</i> facts unless you give them.</p>
  <p><b>The brief that works</b> has five parts. Remember them as <b>W-A-T-C-H</b>:</p>` +
  H.table(['Letter', 'Means', 'Example (HR)'], [
    ['W', 'What you want written', 'A reply to a candidate who was not selected'],
    ['A', 'Audience', 'An external candidate who reached the final interview'],
    ['T', 'Tone', 'Warm, respectful, short; no legal language'],
    ['C', 'Content you supply (the facts)', 'Role: Office Manager. We will keep her CV for 6 months. Contact: Priya'],
    ['H', 'How long and what shape', 'Under 120 words, 3 short paragraphs']]) +
  `<p><b>Editing is often more useful than writing from nothing.</b> Paste your own draft and ask: "Make this clearer for a busy manager. Keep my meaning. Show me what you changed." You keep your voice, and you learn from the changes.</p>
  <p><b>Email</b> is the most common daily use: replying to a long thread, softening a blunt message, turning bullet points into a polite request, or writing three subject lines to choose from. A <i>thread</i> is the chain of earlier emails; if you want the AI to reply to it, you must paste or share the relevant part (and only the part that is safe to share, see Topic 7).</p>`,
  clues: ['"Can you make this sound more professional?" → edit with a stated tone and audience', '"I have to write to an upset customer" → draft with AI, then add real facts and a human apology', '"I am not a confident writer" → paste your draft and ask for changes with explanations', '"This email is too long" → ask for a version under N words that keeps the key request', '"Write a job ad / policy / newsletter" → give the facts first; never let the AI invent them'],
  code: box('Weak brief vs strong brief (plain text you could type)', `WEAK:   Write an email to a customer about the delay.

STRONG: Write an email to a small-business customer whose
        office-chair order (order 4471) is 6 days late because
        of a supplier problem. New delivery date: 14 November.
        Tone: honest and apologetic, not grovelling.
        Offer: free delivery on their next order.
        Length: under 120 words. End with my name, Sam.`),
  codeTitle: 'Weak vs strong brief',
  viz: stepsViz('From rough notes to a sent email', 'step: what happens; ... (2-8 items)',
    'Notes: three bullet points from the sales call; Brief: what, audience, tone, facts, length; Draft: AI writes version 1; Check: names, dates, prices, promises; Edit: add one personal line only you could write; Send: from your account, under your name',
    ['Step', 'What happens'],
    'Watch a sales rep turn messy call notes into a follow-up email. The AI only does one of these steps.',
    function (r, i) { return 'Step ' + (i + 1) + ': <b>' + H.esc(r[0]) + '</b>. ' + H.esc(r[1]) + '.'; },
    'The AI wrote the draft, but you supplied the facts, checked them and owned the result.'),
  examples: [
    { title: 'HR: rejection email', html: `<p>An HR assistant gives the W-A-T-C-H brief above. The draft is good but says "we will keep your details on file indefinitely". Company policy is 6 months. She fixes it. <b>Lesson:</b> AI fills gaps with typical wording, and typical is not always your policy.</p>` },
    { title: 'Sales: softening a blunt message', html: `<p>A sales manager writes "Your payment is late again, pay by Friday." He asks the AI: "Keep the Friday deadline, make it firm but friendly, keep it under 60 words." He gets a version that keeps the deadline and the relationship.</p>` },
    { title: 'Teaching: a letter to parents', html: `<p>A teacher pastes her notes about a school trip (date, cost, what to bring) and asks for a parent letter "for parents who may read English as a second language: short sentences, no idioms". She checks the date and the cost line by line before printing.</p>` }
  ],
  deepDive: `<p><b>Why AI writing sounds "samey":</b> because it predicts the most likely words, the default style is the average of what it has read: polite, a bit wordy, fond of phrases like "I hope this email finds you well". Readers now spot this. Fix it by giving a short sample of your own writing and saying "match this style", and by cutting the first and last sentence of most drafts.</p>
  <p><b>Accuracy risks in writing:</b> made-up specifics (a refund policy, a date, a statistic), promises you cannot keep ("we guarantee delivery tomorrow") and wrong names. Check every number, name, date and promise.</p>
  <p><b>When not to use AI for writing:</b> condolence notes, apologies for serious mistakes, performance feedback about a real person, and anything legally binding. You can still ask for structure ideas, but the words should be yours, and legal or HR wording must go through the right person.</p>
  <p><b>Disclosure:</b> some workplaces, schools and publishers ask you to say when AI helped. Follow your organisation's policy.</p>`,
  aiEra: `<p><b>What has changed:</b> AI is now built into the tools people already use: email, word processors and chat apps often offer "draft", "rewrite" or "summarise" buttons. That makes AI writing easy to use without thinking, which is exactly the risk.</p>
  <p><b>What stays human:</b> knowing what you want to say, knowing the reader, the facts, and the judgement about whether a message should be sent at all. A good writer with AI is faster. A weak writer with AI produces more weak writing, faster.</p>
  <p><b>Good habit:</b> ask the AI to <i>explain</i> its edits ("list the three biggest changes and why"). Over a few weeks you become a better writer, not just a faster one.</p>`,
  problems: [sp({
    title: 'The Late-Order Email', level: 'Easy', tags: ['writing', 'email', 'customer service'],
    situation: 'You work in customer service for an office furniture company. Order 4471 for a small business is 6 days late because a supplier shipped the wrong parts. The new date is 14 November. Your manager allows a free-delivery voucher for delayed orders.',
    task: 'Write the brief you would give the AI, and list what you would check in its draft before sending.',
    weak: '"Write an apology email for a late order." Then send the first draft.',
    weakWhy: 'The AI does not know the order, the new date or the voucher, so it either stays vague or invents details such as a refund you never offered.',
    mcq: mq('What is the single most important thing missing from "Write an apology email for a late order"?', ['A request for a longer email', 'The real facts: order, new date and what you can offer', 'The word "please"', 'A request to use bullet points'], 1, 'Without facts the AI has to guess, and guesses become wrong promises.'),
    hints: ['Hint 1: Think about what the AI cannot possibly know about this order unless you tell it.', 'Hint 2: Use a simple checklist for your brief: what, audience, tone, facts, length.', 'Hint 3: Before sending, look at every date, number, name and promise in the draft and compare them with your system.'],
    strong: 'Brief: "Write an email to a small-business customer about order 4471 (office chairs). It is 6 days late because our supplier sent the wrong parts. New delivery date: 14 November. Apologise sincerely without grovelling. Offer free delivery on their next order. Under 120 words. Sign off as Sam, Customer Service." Checks before sending: (1) order number and date match the order system; (2) the offer is exactly the approved voucher, with no extra refund or guarantee added; (3) no blame on a named supplier if your policy forbids it; (4) the customer\'s name is spelled right; (5) one human line added, such as "I know you needed these for your new starters." Then send from your own account.'
  })]
});

// ---------- TOPIC 2: Research with sources ----------
topics.push({
  title: 'Research With Sources, and Checking Them',
  analogy: `<p>Asking an AI a research question is like asking a well-read friend at dinner. They answer quickly and confidently, and they are usually roughly right. But you would not put "my friend said so" in a report to your boss. You ask "where did you read that?" and then you go and look.</p>`,
  explain: `<p><b>Two kinds of answers:</b></p>` +
  H.table(['Kind', 'Where the answer comes from', 'Main risk'], [
    ['From memory', 'What the model learned in training (ai01): may be months or years out of date', 'Made-up facts and invented sources (hallucinations)'],
    ['With web search or your files', 'The tool searches the web or your documents and shows links (citations) next to its claims', 'The link exists but does not say what the AI claims, or the source is weak']]) +
  `<p>A <b>citation</b> is a link or reference showing where a claim came from. Many assistants now offer a web search or "deep research" mode that reads many pages and writes a report with citations. That is a big improvement, but a citation is a <i>claim to check</i>, not proof.</p>
  <p><b>The three-check routine</b> for anything that matters:</p>
  <ol><li><b>Open it:</b> click the link. Does the page exist?</li><li><b>Find it:</b> does the page actually say the thing, with the same number and the same date?</li><li><b>Judge it:</b> is the source trustworthy for this kind of claim (a government statistics office, a regulator, the company's own site, a peer-reviewed study) or is it a random blog?</li></ol>
  <p><b>Good research prompts</b> ask for sources, dates and uncertainty: "Find the current statutory minimum annual leave in Ireland. Give the official government source, the date it was last updated, and say if you are unsure."</p>`,
  clues: ['"Can you find out what competitors charge?" → research with search, then verify each figure on the source page', '"Is this regulation still current?" → only trust an official, dated source', '"I need a statistic for my slide" → never use a number you have not seen on the original page', '"The AI gave me a study title" → search for the study yourself; it may not exist', '"Summarise the latest news on..." → model memory is out of date; use a search-enabled tool'],
  viz: stepsViz('Checking one AI claim', 'step: what you do; ... (2-8 items)',
    'Claim: "62% of UK shoppers prefer click-and-collect (Source A)"; Open: the link works and loads a market-research page; Find: the page says 62% but for 2019, not now; Judge: a survey by a parking company, 1,000 people; Decide: do not use it, search for a recent official figure; Record: note the source and date you finally used',
    ['Step', 'Result'],
    'A marketing assistant is building a slide. Follow one claim from the AI through the three checks.',
    function (r, i) { return '<b>' + H.esc(r[0]) + '</b>: ' + H.esc(r[1]) + (i === 2 ? '. Notice the date problem: the link was real, but the claim was out of date.' : '.'); },
    'A real link is not the same as a correct claim. Open it, find the exact words, and judge the source.'),
  examples: [
    { title: 'Finance: an exchange-rate assumption', html: `<p>A finance analyst asks an assistant without search for "the current euro-dollar rate". It gives a number from its training data. For anything time-sensitive (rates, prices, laws, who holds a job) use a live, official source, or a search-enabled tool, and check it.</p>` },
    { title: 'Healthcare admin: a policy question', html: `<p>A clinic administrator asks how long patient records must be kept. The AI answers with a confident number. Rules vary by country, region and record type. She uses the answer only as a starting point, then finds the official guidance from her health authority and confirms with her records manager.</p>` },
    { title: 'Marketing: a fake study', html: `<p>An AI writes "According to a 2023 Harvard study, 70% of customers...". The marketer searches for the study and cannot find it. It was invented. The sentence is deleted. If you cannot find it, it does not go in.</p>` }
  ],
  deepDive: `<p><b>Why invented sources happen:</b> as ai01 explained, the model produces plausible text. A citation is just text with a familiar shape (author, year, title), so the model can produce a plausible-looking one that does not exist. Search-enabled tools reduce this because they quote real pages, but they can still misread a page, mix two pages, or pick a weak source.</p>
  <p><b>Primary vs secondary sources:</b> a primary source is the original (the statistics office table, the law, the company's annual report). A secondary source reports on it (a news article). For numbers and rules, go to the primary source.</p>
  <p><b>Dates matter:</b> always note "as of" dates. Prices, laws and job titles change. Write "as of October 2026, per the official site" in your notes.</p>
  <p><b>Bias in research:</b> the AI tends to give the most common view. Ask "what are the strongest arguments against this?" to see the other side.</p>`,
  aiEra: `<p><b>What has changed:</b> research that used to take an afternoon of searching can now start with a cited report in minutes. That frees time for the part that matters: checking, comparing and deciding.</p>
  <p><b>New risk:</b> more of the web itself is now AI-written, so a search can surface low-quality AI pages that repeat each other. Prefer official, named, dated sources.</p>
  <p><b>Interview angle:</b> employers like hearing "I use AI to find sources quickly, and I always open and check the ones I rely on". It shows speed and judgement together.</p>`,
  problems: [sp({
    title: 'The Competitor Price Table', level: 'Medium', tags: ['research', 'sources', 'sales'],
    situation: 'Your sales director wants a one-page table comparing your product with three competitors (price tier, main features, contract length) for a meeting tomorrow. An AI with web search gives you a neat table with links.',
    task: 'Describe how you would check the table and what you would write on the page so readers know how reliable it is.',
    weak: 'Paste the AI table straight into the slide because it has links.',
    weakWhy: 'Links can be outdated, wrong or not say what the table claims. Prices and contract terms change often, and the director will repeat these figures to a customer.',
    mcq: mq('A citation link opens a real competitor page, but the page shows a different price. What do you do?', ['Keep the AI number, the link proves it', 'Use the price on the page, note the date, and flag that the AI was wrong', 'Average the two numbers', 'Remove the competitor'], 1, 'The original page is the source of truth. Record the date you checked.'),
    hints: ['Hint 1: Every cell in the table is a separate claim. Which cells are most likely to change?', 'Hint 2: Use the three checks for each: open the link, find the exact words, judge the source.', 'Hint 3: Add an "as of" date and mark anything you could not confirm, instead of guessing.'],
    strong: '(1) Treat each cell as a claim. (2) For each competitor, open the official pricing and product pages (not reviews or blogs) and confirm price tier, features and contract terms. (3) Where the page differs from the AI, use the page and note it. (4) Where pricing is "contact sales" or not public, write "not published" instead of a number. (5) Add a footer: "Checked on official websites, 29 October 2026. Prices change; confirm before quoting to customers." (6) Keep a short list of the links you used so anyone can recheck. This takes about 20 minutes and protects the director from quoting a wrong figure to a customer.'
  })]
});

// ---------- TOPIC 3: Summarising documents and meetings ----------
topics.push({
  title: 'Summarising Documents and Meetings',
  analogy: `<p>A summary is like the trailer of a film: it should show you what the film is about without changing the plot. A bad trailer gives away the wrong ending or makes a drama look like a comedy. An AI summary can do the same, so you need to know when to watch the full film.</p>`,
  explain: `<p><b>The plain idea:</b> you can give an AI a long document (a report, contract, policy, research paper) or a meeting recording or transcript (a written record of what people said) and ask for a short version. Tools such as Microsoft Teams with Copilot or Google Meet with Gemini can, depending on your company's licence and settings, produce meeting notes and action items automatically.</p>
  <p><b>Ask for a useful shape, not just "summarise":</b></p>` +
  H.table(['Purpose', 'Ask for'], [
    ['Decide something', 'Key points, options, risks, and what is still unclear'],
    ['After a meeting', 'Decisions made, action items with owner and due date, open questions'],
    ['Read a contract or policy', 'What I must do, deadlines, costs, and anything unusual; quote the exact clause for each point'],
    ['Brief your boss', '3 bullet points and one recommended next step']]) +
  `<p><b>Ask for quotes or page numbers.</b> "For each point, give the section number" lets you check quickly. If the AI cannot point to where something is, be suspicious.</p>
  <p><b>Know the limits:</b> summaries can miss the one sentence that matters (an exception, a penalty, a "not"), can merge two speakers, and can make a tentative idea sound like a decision. Very long files may be only partly read; ask "did you read the whole document?" and check the end yourself.</p>
  <p><b>Consent and privacy:</b> recording or transcribing a meeting usually needs everyone to know, and sometimes to agree. Follow your company's rules and local law, and announce it at the start.</p>`,
  clues: ['"Can you send round the notes?" → AI draft of decisions and actions, checked by the organiser', '"I do not have time to read this 60-page report" → structured summary with section numbers, then read the key sections', '"What does this contract mean for us?" → summary is a starting point; legal questions go to legal', '"Who agreed to do what?" → ask for owner and date per action item', '"Was it decided or just discussed?" → check against the transcript before circulating'],
  viz: stepsViz('Meeting to action list', 'step: what happens; ... (2-8 items)',
    'Before: tell everyone the meeting will be transcribed; During: people talk, transcript is created; Draft: AI lists decisions, actions, open questions; Check: organiser compares actions to her own notes; Fix: "Ali will look into it" was not a decision, mark as open; Send: notes go out within the hour, owners confirm',
    ['Step', 'What happens'],
    'An operations manager uses an AI recap after a weekly supplier meeting.',
    function (r) { return '<b>' + H.esc(r[0]) + '</b>: ' + H.esc(r[1]) + '.'; },
    'The AI saves the typing. The human makes sure "discussed" is not reported as "decided".'),
  examples: [
    { title: 'Operations: weekly meeting recap', html: `<p>Prompt: "From this transcript, list (1) decisions, (2) action items as a table with owner and due date, (3) open questions. If an owner or date was not said, write 'not stated', do not guess." The "do not guess" line stops the AI inventing deadlines.</p>` },
    { title: 'Finance: a 40-page supplier contract', html: `<p>A finance officer asks for "payment terms, late-payment penalties, price-increase rules and termination notice, each with its clause number". She reads those clauses herself. The summary showed her where to look; it did not replace legal review.</p>` },
    { title: 'Teaching: research for a lesson', html: `<p>A teacher summarises a long education report into "five findings a teacher could act on, with the page number for each". She opens two of the pages to check the findings are described fairly before sharing with colleagues.</p>` }
  ],
  deepDive: `<p><b>Why summaries go wrong:</b> to shorten, the AI must choose what to drop. It tends to keep what is repeated and drop what is mentioned once, but in contracts and policies the most important point (an exception, a fee) is often mentioned once. Negations ("not", "unless", "except") are easy to lose.</p>
  <p><b>Transcripts have errors too:</b> speech-to-text can mishear names, numbers and accents. "Fifteen" can become "fifty". Check numbers in meeting notes against what people meant.</p>
  <p><b>Length and attention:</b> tools have a limit on how much text they can consider at once (often called the context window). Large files may be cut or skimmed. Ask the tool to work section by section for very long documents.</p>
  <p><b>Who should read the full thing:</b> anyone signing, approving, or advising others on the document. A summary is for orientation, not for sign-off.</p>`,
  aiEra: `<p><b>What has changed:</b> automatic meeting notes are now common, so more people skip meetings and read the recap. That makes the recap's accuracy more important, not less.</p>
  <p><b>Good practice:</b> one named person owns and corrects the notes before they go out. Mark drafts "AI-drafted, checked by [name]".</p>
  <p><b>Interview angle:</b> a strong answer about meeting AI mentions both time saved and two safeguards: consent to record, and a human check of decisions and owners.</p>`,
  problems: [sp({
    title: 'Notes That Assigned the Wrong Person', level: 'Medium', tags: ['summarising', 'meetings', 'operations'],
    situation: 'After a project meeting, the AI recap says "Maria will deliver the new rota by Friday." In the meeting, Maria said she might be able to help if someone else drafted it. The recap is about to be sent to 12 people.',
    task: 'Explain what went wrong, how you would fix this recap, and how you would prevent it next time.',
    weak: 'Send it anyway; people can correct it if it is wrong.',
    weakWhy: 'Maria now looks responsible for something she never agreed to, and the real task has no owner. Wrong notes create conflict and missed deadlines.',
    mcq: mq('Which instruction most reduces invented owners and dates in AI meeting notes?', ['"Make it shorter"', '"If an owner or date was not clearly agreed, write \'not stated\'"', '"Use bullet points"', '"Write in a friendly tone"'], 1, 'Telling the AI it may say "not stated" removes the pressure to fill gaps with guesses.'),
    hints: ['Hint 1: Was it a decision, or an idea someone mentioned? Summaries often blur the two.', 'Hint 2: Check each action item against the transcript or your own notes before sending.', 'Hint 3: Next time, change the prompt so the AI is allowed to say an owner or date is unknown.'],
    strong: 'What went wrong: the AI turned a tentative offer ("might help") into a firm commitment, because summaries compress uncertain words. Fix: check every action item against the transcript; change this one to "Rota: owner not agreed. Maria offered to help review a draft." Ask the meeting lead to assign an owner, and message Maria privately so she is not surprised. Prevention: (1) prompt: "List only actions where someone clearly agreed; mark owner or date as \'not stated\' if unclear; list tentative offers under open questions"; (2) one person checks the recap before it goes out; (3) at the end of each meeting, read the actions aloud so people confirm them while everyone is still there.'
  })]
});

// ---------- TOPIC 4: Spreadsheets and data in plain words ----------
topics.push({
  title: 'Spreadsheets and Data Questions in Plain Words',
  analogy: `<p>Using AI with a spreadsheet is like asking a fast assistant to count stock in a warehouse. They will come back quickly with a number. But if they counted the wrong shelf, or counted the returns twice, the number is confidently wrong. You give a clear question, then spot-check a few shelves yourself.</p>`,
  explain: `<p><b>The plain idea:</b> you can now ask questions about a spreadsheet in everyday words: "Which region had the biggest drop in sales from Q2 to Q3?" Spreadsheet tools such as Microsoft Excel with Copilot and Google Sheets with Gemini can, where your licence includes them, answer questions, suggest charts and help write formulas. General chat assistants can also analyse a file you upload.</p>
  <p><b>A few words to know:</b> a <b>formula</b> is an instruction in a cell that calculates something (like adding a column). A <b>pivot table</b> is a summary table that groups and totals data (sales per region per month). A <b>column header</b> is the name at the top of each column.</p>` +
  H.table(['Good task for AI', 'Why'], [
    ['"Explain what this formula does, in plain words"', 'Easy to check, great for learning'],
    ['"Write a formula that totals sales where region is North"', 'You can test it on a few rows'],
    ['"Suggest a chart to show the monthly trend"', 'Low risk, you can see the chart'],
    ['"Find rows where the end date is before the start date"', 'Data cleaning; you check the rows it found']]) +
  `<p><b>Write data questions clearly:</b> say which columns, which time period, and what counts. "Average order value for September 2026, excluding refunds, using columns Order Total and Status" is far better than "how are sales doing?"</p>
  <p><b>Always spot-check:</b> pick two or three rows and work the answer out by hand or with a simple filter. Check the totals: does the row count match? Does the grand total match the finance report?</p>`,
  clues: ['"I am not an Excel person" → ask AI to write and explain the formula, then test it on a few rows', '"What does this formula do?" → plain-English explanation is a safe, high-value use', '"The numbers look off" → check filters, duplicates, blanks and totals before trusting any answer', '"Can you make a chart for the board?" → AI suggests; you check the axis, labels and source', '"The file has customer details" → remove or replace personal columns before uploading to a tool your company has not approved'],
  viz: stepsViz('Asking a spreadsheet question safely', 'step: what happens; ... (2-8 items)',
    'Question: average order value in September, excluding refunds; Prepare: remove customer names and emails, keep Order Total, Status, Date; Ask: name the columns and the rule for refunds; Answer: AI says 84.20 and shows its formula; Spot-check: filter September, hide refunds, check 3 rows and the count; Result: count was off by 12, blank Status rows were included, fix and rerun',
    ['Step', 'What happens'],
    'A retail analyst asks an AI about an order spreadsheet.',
    function (r, i) { return '<b>' + H.esc(r[0]) + '</b>: ' + H.esc(r[1]) + (i === 4 ? '. This is the step people skip, and the one that catches problems.' : '.'); },
    'The question was clear, the data was safe to share, and a two-minute spot-check caught a real error.'),
  examples: [
    { title: 'Finance: understanding an inherited spreadsheet', html: `<p>A new finance assistant inherits a budget file full of long formulas. She asks the AI to "explain the formula in cell F12 step by step in plain English". Now she understands it, and she can spot that it still points to last year's tab.</p>` },
    { title: 'HR: headcount by department', html: `<p>An HR officer needs headcount per department. She removes names, salaries and ID numbers first, keeping only Department and Start Date, then asks for a pivot table. She checks the grand total matches the HR system.</p>` },
    { title: 'Sales: a pipeline chart', html: `<p>A sales lead asks for "a bar chart of deal value by stage, largest first". The chart is good, but the AI included lost deals. Spotting it takes one look at the stage labels. She asks it to exclude "Closed lost".</p>` }
  ],
  deepDive: `<p><b>Typical silent errors:</b> blank cells counted as zero, duplicate rows, text that looks like numbers ("1,200" stored as text), mixed date formats (03/04 as March or April), hidden or filtered rows, and totals rows counted again as data. The AI may not mention any of these.</p>
  <p><b>Correlation is not cause:</b> AI may say "sales rose after the campaign, so the campaign worked". Something else may explain it (season, price change). Ask "what else could explain this?"</p>
  <p><b>Reproducibility:</b> a number in a chat window cannot be rechecked next month. Prefer answers as a formula or a pivot table in the file, so anyone can see how it was calculated.</p>
  <p><b>Sensitive data:</b> spreadsheets often hold personal data (names, salaries, health information). Use only approved tools, and remove columns the question does not need.</p>`,
  aiEra: `<p><b>What has changed:</b> people who could never write a formula can now ask questions of their data. That is a big gain for operations, HR, sales and finance staff.</p>
  <p><b>What has not changed:</b> someone still has to know whether the answer is sensible. "Our average order is 8,420" in a shop that sells socks is clearly wrong; noticing that is a human skill called <i>sense-checking</i>.</p>
  <p><b>Career tip:</b> being the person who can ask good data questions and check the answers is a valued skill in non-technical roles. It does not need coding.</p>`,
  problems: [sp({
    title: 'The Too-Good Sales Number', level: 'Medium', tags: ['spreadsheets', 'data', 'sales'],
    situation: 'You ask an AI to total Q3 sales from an exported spreadsheet. It says 1.9 million. Last quarter was 950,000, and nobody expected sales to double. Your manager wants the number for a board slide in an hour.',
    task: 'Explain what you would check, in what order, before giving your manager any number.',
    weak: 'Send 1.9 million: the AI calculated it, so it must be right.',
    weakWhy: 'A doubling with no known reason is a red flag. Common causes are duplicated rows or a totals row counted as data. A wrong number on a board slide damages trust.',
    mcq: mq('A total is almost exactly double what you expected. What is the most likely cause to check first?', ['The AI is lying on purpose', 'Rows counted twice, for example a totals row or duplicated export', 'The chart colours', 'The font size'], 1, 'An answer close to 2x often means double-counting.'),
    hints: ['Hint 1: An answer close to exactly double is a strong clue. What could make every sale count twice?', 'Hint 2: Look at the bottom of the sheet and at the row count before and after removing duplicates.', 'Hint 3: Compare with an independent source, like the finance system total, before you report anything.'],
    strong: '(1) Sense-check: a doubling with no known cause is suspicious, so do not report it yet. (2) Check the data: scroll to the bottom for a "Total" row that was counted as a sale; remove duplicate rows (the export may have run twice); confirm the date column only covers July to September; check for refunds or cancelled orders that should be excluded. (3) Recalculate with a simple SUM in the sheet, not only in the chat, so the method is visible. (4) Compare with an independent source, such as the finance system or last month\'s report. (5) Tell your manager the confirmed number and, in one line, what you corrected ("the export included a totals row, now removed"). If you cannot confirm in time, say so rather than guess.',
    time: 'about 15 minutes of checking; the AI answer took seconds'
  })]
});

// ---------- TOPIC 5: Presentations, translation and brainstorming ----------
topics.push({
  title: 'Presentations, Translation and Brainstorming',
  analogy: `<p>For ideas and slides, AI is like a whiteboard session with a colleague who never runs out of suggestions. Most suggestions are ordinary, a few are great, and some are nonsense. Your job is to pick, combine and improve. For translation, it is like a talented bilingual friend: great for everyday text, but you would still hire a certified translator for a legal contract.</p>`,
  explain: `<p><b>Presentations:</b> AI can turn notes into a slide outline, suggest a story order, write speaker notes, and (in tools such as PowerPoint with Copilot or Google Slides with Gemini, where licensed) build draft slides. The best results come from telling it the audience, the one message they should remember, and the time you have: "10-minute update to the leadership team; key message: we should move the launch two weeks; 6 slides max".</p>
  <p><b>A good slide outline</b> has one idea per slide, a headline that states the point ("Returns fell 18% after the new size guide"), and evidence under it. Ask the AI for headlines that state points, not topics.</p>
  <p><b>Translation:</b> modern AI translates everyday text well and can match tone ("formal Spanish for a client"). Use it for first drafts, understanding a message, or internal communication. For legal, medical, safety or published material, have a qualified human translator or a native speaker review it.</p>
  <p><b>Brainstorming:</b> ask for many options, then filter. Good prompts set constraints and ask for variety: "Give 15 ideas for a staff wellbeing week with a budget under 500 and no extra time off; mix cheap, fun and serious ideas; mark the 3 easiest to run." Then ask the AI to argue against your favourite idea.</p>`,
  clues: ['"I have a presentation tomorrow and only notes" → outline with one point per slide, then add your real data', '"Can you translate this for our Spanish client?" → AI draft plus native-speaker review for anything important', '"We need ideas for..." → ask for many varied ideas with constraints, then pick and test', '"Make it more engaging" → ask for a story structure: problem, evidence, recommendation', '"This is going on our website / in a contract" → professional translation and review'],
  viz: stepsViz('Notes to a 6-slide deck', 'slide: headline; ... (2-8 items)',
    'Slide 1: Recommendation: move launch by two weeks; Slide 2: Supplier test showed 1 in 20 units faulty; Slide 3: Fix is ready, testing takes 10 days; Slide 4: Cost of delay vs cost of recalls; Slide 5: New timeline and owners; Slide 6: Decision needed today',
    ['Slide', 'Headline (states the point)'],
    'An operations lead asked the AI for a 6-slide outline with point-stating headlines. Watch the story build.',
    function (r, i) { return '<b>' + H.esc(r[0]) + '</b>: "' + H.esc(r[1]) + '". ' + (i === 0 ? 'Lead with the answer; busy leaders may only see this slide.' : 'Each slide supports the first one.'); },
    'Every number on these slides must come from your own data, not from the AI.'),
  examples: [
    { title: 'Marketing: campaign brainstorm', html: `<p>A marketer asks for 20 taglines for a reusable water bottle for students, "no puns about water, under 6 words". She shortlists 4, tests them with 5 students, and the winner is a mix of two AI ideas plus her own word.</p>` },
    { title: 'Healthcare admin: patient letter translation', html: `<p>A clinic needs an appointment letter in Polish. Staff use AI for a draft, then a Polish-speaking colleague checks it. They find a mistranslated instruction about fasting before a blood test. For health instructions, human review is not optional.</p>` },
    { title: 'Teaching: lesson ideas', html: `<p>A teacher asks for "five hands-on activities to teach fractions to 9-year-olds using items found in a classroom". She adapts two, drops one that needs scissors for a large group, and adds her own.</p>` }
  ],
  deepDive: `<p><b>Why brainstorm output feels generic:</b> the model gives likely answers first. Push for variety: "give 5 obvious ideas, then 5 unusual ones, then 5 that a competitor would never try". Ask it to take a role: "you are a sceptical finance director, what worries you?"</p>
  <p><b>Translation pitfalls:</b> idioms, names of products and laws, units, dates (US vs UK formats), formality levels, and gendered language. Machine translation may sound fluent while changing meaning, so fluency is not proof of accuracy. Back-translation (translating back to the original language) can catch big mistakes but not subtle ones.</p>
  <p><b>Slides and images:</b> AI-generated images can contain errors (odd hands, fake text) and may raise copyright questions. Use your company's approved image sources for external materials.</p>
  <p><b>Accessibility:</b> ask the AI to check slide text for jargon, to write alt text (a short description of an image for people using screen readers), and to keep fonts and contrast readable.</p>`,
  aiEra: `<p><b>What has changed:</b> making a first draft of a deck or translating a message used to take hours or a paid service; now it takes minutes. The bottleneck is having a clear message and real evidence.</p>
  <p><b>What stays human:</b> knowing what your audience cares about, choosing which idea to back, and presenting with conviction. AI cannot stand up in the meeting for you.</p>
  <p><b>Watch for sameness:</b> if everyone uses the same tools with the same prompts, everyone's slides and ideas look alike. Your own examples and data are what make your work stand out.</p>`,
  problems: [sp({
    title: 'Translate the Safety Notice', level: 'Hard', tags: ['translation', 'healthcare', 'risk'],
    situation: 'You work in admin at a care home. A new hand-hygiene notice must be posted in English, Romanian and Tagalog for staff, by tomorrow morning. Nobody in the office speaks Romanian or Tagalog. Your manager suggests "just use AI".',
    task: 'Decide how to use AI here, what the risks are, and what you would do before the notice goes up.',
    weak: 'Paste the notice into an AI, print the translations, and pin them up.',
    weakWhy: 'Safety instructions must be exactly right. A fluent but wrong translation (for example of how long to wash hands, or when to wear gloves) could harm residents, and nobody could spot the error.',
    mcq: mq('What is the best use of AI for a safety notice in a language nobody in the office speaks?', ['Post the AI translation as final', 'Use the AI draft, then have a fluent speaker check it before posting', 'Do not translate at all', 'Translate only the title'], 1, 'AI makes a fast first draft; a fluent person confirms meaning for anything safety-critical.'),
    hints: ['Hint 1: Ask what happens if one instruction is translated wrongly, and who would notice.', 'Hint 2: AI can still help with speed. Who could check the draft quickly? Think about staff who speak these languages.', 'Hint 3: Simplify the English first: short sentences and pictures translate more reliably.'],
    strong: '(1) Simplify the English notice first: short sentences, numbers as digits ("wash for 20 seconds"), no idioms, and add pictures of each step. Simpler text translates more reliably. (2) Use an approved AI tool to draft the Romanian and Tagalog versions; the notice has no personal data, so it is safe to paste. (3) Ask staff members who speak each language as a first language to check the drafts against the English, line by line, and correct them. They are also the readers, so they will spot unclear wording. (4) If no fluent checker is available by morning, post the English and picture version now and the translations once checked; a wrong safety translation is worse than a short delay. (5) Note on the file who checked each version and when. (6) For official or regulated documents, use your organisation\'s professional translation service.',
    time: 'AI draft in minutes; checking with fluent staff about 30 minutes'
  })]
});

// ---------- TOPIC 6: Checking AI output before you use it ----------
topics.push({
  title: 'Checking AI Output Before You Use It',
  analogy: `<p>Using AI output without checking is like signing a document your new assistant prepared without reading it. Most days it would be fine. The one day it is not, your signature is on it. A quick, routine check, like a pilot's pre-flight checklist, catches problems before they take off.</p>`,
  explain: `<p><b>The plain idea:</b> AI output can be fluent and wrong at the same time (ai01 called this hallucination). You are responsible for anything you send, publish or act on. So build a short routine and use it every time the stakes are more than trivial.</p>
  <p><b>The F-A-C-T-S check:</b></p>` +
  H.table(['Letter', 'Ask yourself', 'Example'], [
    ['F', 'Facts: are names, numbers, dates and quotes correct?', 'Is the client really called Ms Okafor? Is the deadline the 14th?'],
    ['A', 'Assumptions: what did the AI guess that I did not tell it?', 'It assumed a 30-day refund policy; ours is 14'],
    ['C', 'Context: does it fit my company, country and audience?', 'US spelling and US law in a UK letter'],
    ['T', 'Tone: would I be happy if the reader saw how it was written?', 'Too casual for a complaint reply'],
    ['S', 'Sensitive: does it reveal anything private or promise anything risky?', 'Mentions another customer\'s name']]) +
  `<p><b>Match effort to stakes.</b> A brainstorm list needs a glance. An email to a customer needs F-A-C-T-S. Anything legal, medical, financial or public needs an expert or a second person.</p>
  <p><b>Useful tricks:</b> ask the AI "what in your answer are you least sure about?"; ask it to list its assumptions; compare with a second source; read the output aloud (awkward or wrong sentences stand out).</p>`,
  clues: ['"It sounds right" → sounding right is not a check; use F-A-C-T-S', '"It is going to a customer / the public / the board" → full check, maybe a second reviewer', '"Legal, medical or money decision" → expert review required', '"The AI said it is sure" → confidence is not evidence', '"Quick internal brainstorm" → light check is fine'],
  viz: stepsViz('F-A-C-T-S on a customer reply', 'check: finding; ... (2-8 items)',
    'Facts: invoice number correct, but due date says 15th not 14th; Assumptions: AI assumed a late fee we do not charge; Context: uses "check" instead of "cheque" for a UK client; Tone: fine, polite and clear; Sensitive: no other customer data, no new promises; Result: three fixes, then send',
    ['Check', 'Finding'],
    'An accounts assistant runs the five checks on an AI-drafted payment reminder.',
    function (r) { var ok = /fine|no other|correct, but/i.test(r[1]); return '<b>' + H.esc(r[0]) + '</b>: ' + H.esc(r[1]) + '. ' + (ok ? '' : 'Something to fix.'); },
    'Two minutes of checking found three problems that the reader would have noticed.'),
  examples: [
    { title: 'HR: policy answer', html: `<p>An employee asks HR about parental leave. An HR adviser asks the AI to draft a reply. It quotes general rules, not the company's enhanced policy. F (facts) and C (context) catch it; she uses the real policy document.</p>` },
    { title: 'Finance: a calculation', html: `<p>An AI says a 3% price rise on 12,500 is 375 and the new total is 12,875. Quick check: 1% of 12,500 is 125, times 3 is 375. Correct. Simple mental maths is a powerful check.</p>` },
    { title: 'Marketing: a product claim', html: `<p>An AI-written product description says the bottle is "BPA-free and dishwasher safe". The marketer checks with the product team: it is BPA-free, but hand-wash only. A false product claim can break advertising rules, so it is removed.</p>` }
  ],
  deepDive: `<p><b>Automation bias:</b> people tend to trust output from machines more than they should, especially when it is well formatted. Studies of people working with automated systems have repeatedly shown this effect. The polished look of AI text makes it stronger. Name it, and use a checklist.</p>
  <p><b>Errors cluster in specifics:</b> the general shape of an answer is usually fine; the risk is in the details: numbers, names, dates, quotes, legal or medical specifics, and anything recent.</p>
  <p><b>Four-eyes principle:</b> for high-stakes items, a second person checks. This is common in finance and healthcare already, and it applies to AI-drafted work too.</p>
  <p><b>Keep a record:</b> for important work, keep the prompt, the output, and what you changed. It helps if questions come up later and helps your team improve their prompts.</p>`,
  aiEra: `<p><b>What has changed:</b> producing content is now cheap, so checking is where the value is. Employers increasingly describe the skill they want as "using AI with good judgement".</p>
  <p><b>AI can help check:</b> you can ask a second AI chat to review a draft for errors or unclear parts. It catches some problems, but it can share the same blind spots, so it does not replace you checking facts against real sources.</p>
  <p><b>Interview angle:</b> when asked "how do you make sure AI output is right?", describe your routine (like F-A-C-T-S) and a real example of an error you caught.</p>`,
  problems: [sp({
    title: 'The Board Summary With One Wrong Number', level: 'Hard', tags: ['checking', 'finance', 'judgement'],
    situation: 'You are an executive assistant. Your CEO asks you to turn the 30-page quarterly finance report into a one-page summary for board members tonight. The AI summary reads beautifully. You have 45 minutes.',
    task: 'Plan how you will check the summary in the time you have, and what you will do if you cannot confirm something.',
    weak: 'Skim it, it reads well, send it.',
    weakWhy: 'Board members make decisions from this page. One wrong figure or a missing risk (for example a dropped "not") could mislead them, and it goes out under the CEO\'s name.',
    mcq: mq('With limited time, which parts of an AI summary deserve the most checking?', ['Adjectives and style', 'Numbers, dates, risks and anything that sounds like a decision', 'Paragraph length', 'The title'], 1, 'Errors cluster in specifics, and those are what readers act on.'),
    hints: ['Hint 1: You cannot check every word in 45 minutes. Which parts would cause the most harm if wrong?', 'Hint 2: Every number in the summary should be traced to a page in the report.', 'Hint 3: Decide in advance what you will do with a claim you cannot confirm: remove it, or flag it.'],
    strong: '(1) Ask the AI to give the page number for every figure and claim in its summary. (2) Spend most of the time on specifics: trace each number to its page and check it matches exactly, including units (thousands vs millions) and periods (quarter vs year to date). (3) Check the risks section of the report yourself and make sure each major risk appears in the summary; summaries often drop the one-off warnings. (4) Look for words that change meaning: "not", "unless", "expected" vs "confirmed". (5) Read it aloud once for tone and clarity. (6) Anything you cannot confirm in time, remove it or mark it "to be confirmed". (7) Send it to the CEO (not directly to the board) with a note: "AI-drafted, all figures checked against the report; one item marked TBC." The CEO approves it before it goes to the board.',
    time: 'about 45 minutes, mostly on numbers and risks'
  })]
});

// ---------- TOPIC 7: What never to paste ----------
topics.push({
  title: 'What Never to Paste Into an AI Tool',
  analogy: `<p>Pasting into an AI tool is like handing a document to someone outside your office. With an approved, company-contracted tool it is like handing it to a trusted supplier under a signed agreement. With a random free app it is like leaving it on a train seat. Before you paste, ask: would I be allowed to hand this to that person?</p>`,
  explain: `<p><b>The plain idea:</b> what you type or upload into an AI tool leaves your computer and goes to the company that runs the tool. Depending on the product, the plan and the settings, it may be stored, reviewed for safety, or used to improve future models. Business and enterprise versions usually offer stronger protections than free personal ones, but the details differ by product and change over time, so <b>your company's AI policy is the rule to follow</b>.</p>
  <p><b>Never paste into an unapproved tool (and be careful even with approved ones):</b></p>` +
  H.table(['Type of information', 'Examples'], [
    ['Personal data about people', 'Names with addresses, phone numbers, ID or passport numbers, dates of birth'],
    ['Special or sensitive personal data', 'Health records, diagnoses, disability, religion, sexual orientation, criminal records'],
    ['Money and access details', 'Bank card numbers, account numbers, passwords, security codes, login links'],
    ['Confidential business information', 'Unreleased results, merger plans, pricing deals, contracts under negotiation, trade secrets'],
    ['Other people\'s confidential material', 'A client\'s documents under a non-disclosure agreement (NDA, a contract promising to keep information secret)'],
    ['HR matters', 'Performance reviews, disciplinary notes, salaries of named people, grievances']]) +
  `<p><b>Personal data</b> is any information that can identify a living person. Laws such as the EU and UK GDPR (General Data Protection Regulation) and healthcare rules like HIPAA in the US control how it may be used. Sharing it with an unapproved service can break the law, not just a policy.</p>
  <p><b>Safe habits:</b> (1) use only tools your organisation approves; (2) <b>remove or replace</b> identifying details before pasting ("Customer A", "[NAME]", round the numbers); (3) share only what the task needs; (4) if you paste something by mistake, tell your manager or IT/security team straight away. Reporting quickly is what limits the damage.</p>`,
  clues: ['"Can I just paste the customer list?" → no, unless the tool is approved for that data; remove names and contact details first', '"It is a free tool, it is fine" → free personal tools may store or reuse your data; check policy', '"Summarise this patient file" → health data needs an approved, compliant tool, or do not use AI', '"Help me write a review of my employee" → describe the situation without names or personal details', '"I already pasted it" → report it immediately'],
  viz: stepsViz('Redacting before you paste', 'original: safe version; ... (2-8 items)',
    'Name Jane Okafor: [EMPLOYEE A]; Email jane.o@example.com: removed; Salary 41,250: "mid-range salary"; Diagnosis of back injury: "a health-related absence"; Manager Tom Price: [MANAGER]; Question about return-to-work plan: kept, this is what you need help with',
    ['Original detail', 'What you paste instead'],
    'An HR adviser wants help drafting a return-to-work plan. Watch each sensitive detail get replaced before anything is pasted.',
    function (r) { return '<b>' + H.esc(r[0]) + '</b> becomes <b>' + H.esc(r[1]) + '</b>.'; },
    'The AI gets everything it needs to help, and nothing that identifies the person.'),
  examples: [
    { title: 'Healthcare admin: a complaint letter', html: `<p>A clinic administrator wants help replying to a complaint. Instead of pasting the patient's letter, she writes: "A patient waited 3 hours for an appointment and missed work. Draft a sincere reply explaining we have added a second receptionist on Mondays." No name, no medical details.</p>` },
    { title: 'Sales: a contract under NDA', html: `<p>A salesperson wants to understand a client's contract terms. The contract is under an NDA. He uses only the company-approved AI tool that legal has cleared for contracts, or asks the legal team. He does not paste it into a personal chatbot on his phone.</p>` },
    { title: 'Finance: a mistake reported fast', html: `<p>A finance assistant pastes a spreadsheet into a personal AI app and then notices it contains supplier bank details. She tells her manager and the security team within the hour. They follow the incident process. Reporting quickly is the right move, not hiding it.</p>` }
  ],
  deepDive: `<p><b>Why approved tools are different:</b> companies sign business agreements with AI providers that set rules on storing, using and deleting data, and they can turn on settings such as limiting how long data is kept. A personal free account has none of those company protections. Check your company's approved list and policy.</p>
  <p><b>Connected tools need extra care:</b> some assistants can read your email, files and calendar. That is useful but means the AI may see confidential items you did not deliberately share. Only connect what you need.</p>
  <p><b>Anonymising is harder than it looks:</b> removing a name is not always enough. "The only female manager in our Leeds office who joined in March" identifies one person. Remove combinations of details that point to someone.</p>
  <p><b>Screenshots and files count too:</b> an uploaded screenshot can contain names in the background, and a spreadsheet can contain hidden columns or tabs.</p>`,
  aiEra: `<p><b>What has changed:</b> AI is now in phones, browsers, email and office tools, often switched on by default. It is easy to share data without noticing. Pause before you paste or click "summarise".</p>
  <p><b>Employers expect this:</b> many organisations now run AI training and have written AI policies. Knowing what not to share is often the first thing they check.</p>
  <p><b>Interview angle:</b> a non-tech candidate who says "I always check the approved tools list and remove personal details first" sounds trustworthy and ready for the job.</p>`,
  problems: [sp({
    title: 'Paste, Redact or Refuse?', level: 'Medium', tags: ['privacy', 'data protection', 'HR'],
    situation: 'Your company approves one business AI assistant for general work but bans health and payment data in it. You have five tasks: (1) improve a public job advert; (2) summarise a sick-note letter from an employee; (3) write a reminder to a customer whose card payment failed, with the card number in the notes; (4) draft feedback for a team member who keeps missing deadlines; (5) tidy up last year\'s published annual report text.',
    task: 'For each task decide: paste as is, redact first, or do not use AI. Explain why.',
    weak: 'It is the approved tool, so paste everything.',
    weakWhy: 'Approved does not mean approved for all data. The policy bans health and payment data, and feedback about a named person is sensitive HR material.',
    mcq: mq('Which of these is safe to paste as is into the approved tool?', ['The sick-note letter', 'The customer notes with the card number', 'The published annual report text', 'The named employee\'s performance notes'], 2, 'Published text is already public, so there is nothing to protect.'),
    hints: ['Hint 1: Sort each task by the most sensitive thing in it: public, personal, health, or payment.', 'Hint 2: Many tasks can still use AI if you remove the sensitive part and keep the question.', 'Hint 3: Health and payment data are banned by this policy, so redacting may still not be enough for the sick note.'],
    strong: '(1) Job advert: paste as is; it is public. Check the AI does not add requirements that could be discriminatory. (2) Sick-note letter: do not use AI; it is health data, banned by the policy. Read it yourself; if you need help with wording a reply, describe the situation in general terms with no health details. (3) Failed payment reminder: redact. Remove the card number and name; ask for "a polite reminder that a card payment failed, with a link to update payment details". Add the customer\'s name yourself afterwards. (4) Feedback: redact. Describe the pattern without the name or identifying details ("a team member missed 3 of the last 5 deadlines") and ask for a supportive, specific structure. Write the final version yourself. (5) Annual report: paste as is; it is published. Rule of thumb: public is fine, personal needs redacting, and anything the policy bans stays out.'
  })]
});

// ---------- TOPIC 8: Building good habits ----------
topics.push({
  title: 'Building Good AI Habits at Work',
  analogy: `<p>Getting good with AI is like getting fit: one hard session does little, but small habits every day add up. A shared recipe book also helps. If your team keeps the prompts that work, each person does not have to rediscover them, just like a kitchen that writes down its best recipes.</p>`,
  explain: `<p><b>The plain idea:</b> people who get real value from AI are not the ones with secret prompts; they are the ones with steady habits. Six habits cover most of it:</p>` +
  H.table(['Habit', 'In practice'], [
    ['1. Start with the goal', 'Before typing, say in one sentence what a good result looks like'],
    ['2. Give context, not just commands', 'Audience, facts, examples of good output (more in the next module, ai34)'],
    ['3. Iterate', 'Treat the first answer as a draft; ask for changes: "shorter", "more formal", "add a table"'],
    ['4. Check before use', 'F-A-C-T-S for anything that leaves your desk'],
    ['5. Protect data', 'Approved tools only; redact; share the minimum'],
    ['6. Keep what works', 'Save good prompts in a shared team document (a "prompt library")']]) +
  `<p><b>Pick the right tasks.</b> Good fits: first drafts, rewording, summaries you will check, idea lists, explaining things, formatting. Poor fits: final decisions about people, anything you cannot check, very recent facts without search, and tasks where the thinking is the point (your own learning, a personal reflection).</p>
  <p><b>Measure honestly.</b> Notice whether AI actually saves you time once you include checking and fixing. For some tasks it does a lot; for others, doing it yourself is faster.</p>
  <p><b>Be open about it.</b> Follow your organisation's rules on telling people when AI helped, and never present AI work as your own expert judgement when it is not.</p>`,
  clues: ['"How do you use AI in your day-to-day work?" → describe habits and checks, with a concrete example', '"My team uses it differently" → suggest a shared prompt library and simple rules', '"Is it really saving time?" → measure including checking time', '"Should I use AI for this?" → ask: can I check it, and is the data safe to share?', '"The first answer was bad" → iterate with specific feedback instead of giving up'],
  viz: stepsViz('A week of building the habit', 'day: habit practised; ... (2-8 items)',
    'Monday: use AI for one email draft, check it with F-A-C-T-S; Tuesday: summarise a report, ask for page numbers; Wednesday: ask AI to explain one spreadsheet formula; Thursday: brainstorm 15 ideas, keep 3; Friday: save the 2 best prompts in the team document; Next week: note which tasks really saved time',
    ['Day', 'Habit practised'],
    'A new operations coordinator builds AI habits one small step a day.',
    function (r) { return '<b>' + H.esc(r[0]) + '</b>: ' + H.esc(r[1]) + '.'; },
    'Small, regular practice with checking built in beats one long session.'),
  examples: [
    { title: 'Operations: a team prompt library', html: `<p>An operations team keeps a shared document with their best prompts: "supplier delay email", "weekly meeting recap", "explain this formula". Each entry has the prompt, an example output, and "what to check". New starters get useful fast.</p>` },
    { title: 'Teaching: knowing when not to use it', html: `<p>A teacher uses AI to create practice questions and simplify reading texts, but writes report comments about each child herself, because they need personal knowledge and care, and include personal information.</p>` },
    { title: 'Sales: measuring the real gain', html: `<p>A sales rep notices that AI cuts proposal drafting from 2 hours to 40 minutes including checks, but slows down quick replies because he over-edits. He keeps it for proposals and stops using it for one-line replies.</p>` }
  ],
  deepDive: `<p><b>Skill fade:</b> if you always let AI write, your own writing and thinking can get weaker. Keep doing some tasks yourself, especially in areas you are still learning, and use AI as a coach ("critique my draft") rather than a ghost-writer.</p>
  <p><b>Same tool, different results:</b> AI answers vary between runs and between tools. Do not rely on one lucky answer; a saved prompt makes results more consistent, but you still check.</p>
  <p><b>Shadow AI:</b> using unapproved AI tools at work is sometimes called "shadow AI". It is common and risky, because the company cannot protect data it does not know is shared. If the approved tools do not meet your needs, tell your manager rather than working around the policy.</p>
  <p><b>Tools change fast:</b> features, names and limits change often. Learn the habits, which last, rather than memorising one product's buttons.</p>`,
  aiEra: `<p><b>Where this is going:</b> AI is moving from chat windows into every tool and into assistants that can take actions (send, book, update records). Good habits (clear goals, checking, protecting data) matter even more when the AI can act, not just suggest. Later modules (ai35, ai36) cover automation and risks.</p>
  <p><b>What employers look for:</b> not prompt tricks, but people who use AI to do more and better work, safely, and who help their team do the same.</p>
  <p><b>Your advantage:</b> people from non-technical backgrounds often understand the customer, the process and the risks better than anyone. Combined with good AI habits, that is a strong profile.</p>`,
  problems: [sp({
    title: 'Rolling Out AI Habits to a Small Team', level: 'Hard', tags: ['habits', 'team', 'operations'],
    situation: 'You lead a 6-person customer support team. Two people use AI for everything and sometimes send wrong answers; two refuse to use it at all; two use personal free apps on their phones. Your company has one approved AI assistant and a short AI policy.',
    task: 'Plan the first month to get the team using AI well and safely.',
    weak: 'Send everyone the policy link and say "use AI responsibly".',
    weakWhy: 'Nothing changes: no shared practice, no examples, no checks. The risky habits (unchecked answers, personal apps) continue.',
    mcq: mq('What is the most urgent problem to fix first in this team?', ['People who refuse to use AI', 'Customer data going into personal, unapproved apps', 'Prompt wording style', 'Which font AI emails use'], 1, 'Data going into unapproved tools is a live privacy risk; the others can be improved gradually.'),
    hints: ['Hint 1: Rank the problems by harm: which one could cause a data incident today?', 'Hint 2: People copy what works. Shared examples and prompts change habits faster than rules alone.', 'Hint 3: Include a simple check step and a way to measure whether quality and speed actually improve.'],
    strong: 'Week 1: fix the biggest risk. Explain plainly why personal apps are not allowed for customer data, show everyone how to use the approved assistant, and make it easy to switch. Week 2: agree three or four tasks where AI helps (first drafts of replies, summarising long tickets, translating simple messages) and two where it does not (refund decisions, complaints about staff). Week 3: build a shared prompt library together: the enthusiasts share prompts that work, the sceptics review them for errors. Both groups add value. Add a simple rule: every AI-drafted reply gets a F-A-C-T-S check before sending. Week 4: measure. Compare reply time and quality (re-opened tickets, customer ratings) before and after, and ask the team what helped. Keep what works, drop what does not, and update the library monthly.',
    time: 'one month, about an hour a week of team time'
  })]
});

// ---------- PRACTICE ARENA ----------
practice.push(sp({
  title: 'Shorten the Policy Email', level: 'Easy', tags: ['writing', 'HR'],
  situation: 'HR has a 600-word email announcing a new hybrid-working policy. Staff complain it is too long. The policy itself is final and published on the intranet.',
  task: 'Write the request you would give the AI and say what you would check.',
  weak: '"Make this shorter."',
  weakWhy: 'The AI may cut the important parts (dates, who it applies to) and keep the friendly filler.',
  mcq: mq('What should a shortening request always protect?', ['The greeting', 'Key facts: dates, who it applies to, what people must do', 'Every adjective', 'The original length'], 1, 'Tell the AI what must survive the cut.'),
  hints: ['Hint 1: Decide which three facts every reader must still get after shortening.', 'Hint 2: Give a target length and the audience.', 'Hint 3: Compare the short version with the policy for every date and rule.'],
  strong: 'Request: "Shorten this email to under 150 words for all staff. Keep: start date 1 December, that it applies to office-based staff only, the minimum of 2 office days a week, and the intranet link. Use 3 short bullet points for the rules. Keep a friendly tone." Checks: compare each date and rule against the published policy; make sure nothing new was added (the AI might add "flexible Fridays" from general knowledge); keep the link working. Then send from HR as usual.'
}));
practice.push(sp({
  title: 'Explain the Formula', level: 'Easy', tags: ['spreadsheets', 'finance'],
  situation: 'You inherit a budget spreadsheet. Cell H20 has a long formula nobody on your team understands. The file contains only department budget totals, no personal data, and your company AI tool is approved for internal finance files.',
  task: 'Describe how you would use AI to understand the formula and how you would confirm the explanation is right.',
  weak: 'Ask "is this formula right?" and accept "yes".',
  weakWhy: 'The AI does not know what the formula is supposed to do, so it cannot say if it is right. A "yes" tells you nothing.',
  mcq: mq('What is the best way to confirm an AI explanation of a formula?', ['Trust it if it is detailed', 'Test it: change one input value and see if the result changes as the explanation predicts', 'Ask the AI again', 'Delete the formula'], 1, 'A small test turns an explanation into something you have checked.'),
  hints: ['Hint 1: Ask for an explanation step by step in plain words, not a yes/no verdict.', 'Hint 2: Tell it what you think the formula should do, so it can compare.', 'Hint 3: Try one change in a copy of the file and see if the result moves as explained.'],
  strong: 'Ask: "Explain the formula in H20 step by step in plain English. What cells does it use and what does each part do? I think it should total this year\'s travel budget for all departments; does it do that?" Then confirm in a copy of the file: change one travel value and check H20 changes by the same amount; check that the ranges cover all departments and the right year\'s tab. If anything is off (for example it points to last year\'s tab), note it and ask the file owner before changing it.'
}));
practice.push(sp({
  title: 'Brainstorm a Team Event', level: 'Easy', tags: ['brainstorming', 'HR'],
  situation: 'You organise a team-building afternoon for 25 people, budget 600, in a city centre, and two team members use wheelchairs.',
  task: 'Write a brainstorming prompt and explain how you would choose from the ideas.',
  weak: '"Give me team building ideas."',
  weakWhy: 'You get generic lists, some over budget and some not accessible, and must filter everything yourself.',
  mcq: mq('Which constraint matters most to include in this prompt?', ['Favourite colour', 'Accessibility for wheelchair users, plus budget and group size', 'The weather last year', 'Nothing, keep it open'], 1, 'Constraints that would rule out an idea belong in the prompt.'),
  hints: ['Hint 1: List what would immediately rule an idea out.', 'Hint 2: Ask for a mix of types and a short reason for each.', 'Hint 3: Check accessibility and prices directly with venues; the AI cannot confirm them.'],
  strong: 'Prompt: "Give 12 ideas for a team afternoon for 25 people in a city centre, total budget 600, fully wheelchair accessible. Mix active, creative and relaxed ideas. For each: one line, rough cost per person, and any accessibility question to ask the venue." Choosing: shortlist 3 with the team (a quick poll), then contact venues directly to confirm step-free access, accessible toilets and prices; the AI cannot know those for sure. Pick the one that the two wheelchair users are happy with, not just the most popular.'
}));
practice.push(sp({
  title: 'Research a Supplier Claim', level: 'Medium', tags: ['research', 'operations'],
  situation: 'A new packaging supplier says their boxes are "100% recycled and certified". An AI search says the same and links to the supplier\'s website.',
  task: 'Explain why this is not yet verified and how you would check it.',
  weak: 'The AI found a link, so it is confirmed.',
  weakWhy: 'The link is the supplier\'s own marketing. That is the claim repeated, not independent evidence.',
  mcq: mq('What is the strongest evidence for a certification claim?', ['The supplier\'s homepage', 'The certifying body\'s own public register listing the supplier', 'An AI answer', 'A blog review'], 1, 'Go to the independent source that issues the certificate.'),
  hints: ['Hint 1: Who is the source behind the link, and do they have an interest in the claim?', 'Hint 2: Certifications are issued by an organisation. Where would it publish who holds them?', 'Hint 3: Ask the supplier for the certificate number and expiry date and check them yourself.'],
  strong: 'The AI link is the supplier\'s own site, so it only repeats the claim. Steps: (1) ask the supplier which certification and for the certificate number and expiry date; (2) check the certifying organisation\'s public register or contact it; (3) confirm the certificate covers the exact product you are buying, not just the company; (4) record what you checked and the date. If you use the claim in your own marketing, have it reviewed, since false green claims can break advertising rules.'
}));
practice.push(sp({
  title: 'Recap for a Client Call', level: 'Medium', tags: ['summarising', 'sales', 'email'],
  situation: 'After a sales call, your AI tool produces a recap with next steps, including "we agreed a 15% discount". You remember offering "up to 10% if they sign this month".',
  task: 'Decide what to do before the recap goes to the client.',
  weak: 'Send the recap to the client as generated.',
  weakWhy: 'You would put a 15% discount in writing that you never offered. The client may hold you to it.',
  mcq: mq('What is the safest response?', ['Send it and hope they do not notice', 'Correct the figure against the transcript or your notes before sending', 'Delete the recap and send nothing', 'Ask the AI if it is sure'], 1, 'Written commercial terms must match what was actually agreed.'),
  hints: ['Hint 1: Anything about price or terms in writing can become a commitment.', 'Hint 2: Check the transcript at the moment the discount was discussed. Was it "fifteen" or "fifty"? A condition?', 'Hint 3: Rewrite terms in exact words, including the condition.'],
  strong: 'Do not send yet. Check the transcript at that point: speech-to-text may have misheard, or the AI may have dropped the condition. Rewrite the line exactly: "We can offer up to 10% if the agreement is signed by 30 November." Check every other number, date and promise in the recap. Then send from your own account. If your company requires approval for discounts, get it first. Next time, prompt: "List any prices or terms exactly as said, including conditions; if unclear, mark for review."'
}));
practice.push(sp({
  title: 'Parent Newsletter in Three Languages', level: 'Medium', tags: ['translation', 'teaching'],
  situation: 'A primary school sends a monthly newsletter. Many families speak Arabic or Urdu at home. The newsletter has event dates, a reminder about a uniform change, and a note on a nit (head lice) outbreak.',
  task: 'Plan how to use AI for the translations and what needs human review.',
  weak: 'Translate everything with AI and send it.',
  weakWhy: 'Dates and health instructions must be exactly right, and the head lice note is sensitive. A mistake could confuse or upset families.',
  mcq: mq('Which part most needs a fluent human check?', ['The school logo', 'The health instructions and dates', 'The greeting', 'The headteacher\'s name'], 1, 'Instructions people act on, and dates, carry the most risk.'),
  hints: ['Hint 1: Separate parts that are just friendly news from parts people must act on.', 'Hint 2: Simplify the English before translating.', 'Hint 3: Find fluent speakers in your school community or staff to check.'],
  strong: '(1) Simplify the English: short sentences, dates written as "Tuesday 12 November", no idioms. (2) Use the approved AI tool to translate; no personal data is included. (3) Ask a fluent staff member or a parent volunteer for each language to check the dates and the head lice and uniform instructions line by line, and the tone of the sensitive note. (4) Keep the dates in numbers too, so they are clear in any language. (5) Save the checked translations as templates for next month. If no checker is available, send the English with a note offering a translated call or meeting.'
}));
practice.push(sp({
  title: 'Should AI Read the CVs?', level: 'Medium', tags: ['HR', 'judgement', 'privacy'],
  situation: 'You have 180 applications for a role. A colleague suggests pasting all the CVs into a chatbot and asking it to rank the top 10.',
  task: 'Explain the risks and suggest a better way to use AI in this process.',
  weak: 'Paste all CVs into a chatbot and invite the top 10.',
  weakWhy: 'CVs are personal data; ranking candidates by AI can be unfair and may be regulated as high-risk in some places; and you cannot explain why someone was rejected.',
  mcq: mq('Which use of AI in hiring is lowest risk?', ['Ranking candidates automatically', 'Helping write a clear, inclusive job advert and interview questions', 'Rejecting CVs without human review', 'Guessing personality from photos'], 1, 'Helping with wording keeps humans making decisions about people.'),
  hints: ['Hint 1: Think about whose data is in the CVs and what they agreed to.', 'Hint 2: Decisions about people must be explainable and fair. Can a chatbot ranking be explained?', 'Hint 3: Use AI around the decision (adverts, criteria, question lists), not as the decider.'],
  strong: 'Risks: CVs are personal data and should not go into an unapproved tool; AI ranking can repeat biases (for example against career gaps or certain names); you could not explain a rejection; and laws in some places (for example the EU AI Act treats AI used for recruitment as high-risk) add obligations. Better: use AI to help write a clear, inclusive advert and a scoring guide based on the job\'s real requirements, then have trained people score CVs against the guide. If your company has an approved, legally reviewed recruitment tool, use it as designed, with human review of every decision. Ask HR and legal before using AI on applications.'
}));
practice.push(sp({
  title: 'Monthly Report From Messy Notes', level: 'Medium', tags: ['writing', 'operations', 'presentations'],
  situation: 'Each month you write a 2-page operations report from scattered notes, ticket counts and a spreadsheet of delivery times. It takes you half a day.',
  task: 'Design a repeatable way to use AI for this report and say where you must still do the work yourself.',
  weak: 'Each month, paste everything and ask "write my report".',
  weakWhy: 'Results change every month, numbers are not checked, and the structure drifts, so readers lose trust.',
  mcq: mq('What makes AI help most repeatable from month to month?', ['A saved prompt with a fixed structure and a checklist', 'A new prompt each time', 'Longer pasted notes', 'Asking it to be creative'], 0, 'A saved template gives consistent output and a consistent check.'),
  hints: ['Hint 1: Same report every month means the prompt can be a reusable template.', 'Hint 2: Calculate key numbers in the spreadsheet yourself and give them to the AI, rather than letting it calculate.', 'Hint 3: Add a short check list at the end of your template.'],
  strong: 'Create a saved prompt: "Write the monthly operations report using this structure: 1) headline in one sentence, 2) key numbers table, 3) what went well, 4) problems and actions, 5) next month. Use only the facts below; if something is missing, write [MISSING]." Each month: calculate the key numbers in the spreadsheet yourself (on-time delivery %, ticket counts) and paste them with your notes; let the AI draft; check every number against the sheet; write the "problems and actions" judgement yourself; keep the template in the team prompt library. Time drops from half a day to about an hour, and the numbers stay trustworthy.'
}));
practice.push(sp({
  title: 'The Wrong-Recipient Paste', level: 'Hard', tags: ['privacy', 'incident', 'healthcare'],
  situation: 'A colleague in a dental practice pasted a list of 40 patients (names, phone numbers, treatment notes) into a free personal AI app to "make a call list". She tells you an hour later and asks you not to tell anyone.',
  task: 'Explain what you should do and why.',
  weak: 'Agree to keep quiet; the app probably will not do anything with it.',
  weakWhy: 'This is health data shared with an unapproved service, which can be a reportable data breach under data protection law. Hiding it removes the chance to limit harm and can make things worse for everyone.',
  mcq: mq('What is the right first action?', ['Keep it secret', 'Report it to the practice manager or data protection lead quickly', 'Post about it online', 'Ask the AI to forget it and move on'], 1, 'Fast reporting lets the organisation follow its breach process and limit harm.'),
  hints: ['Hint 1: What kind of data was it, and where did it go?', 'Hint 2: Organisations usually have a short legal deadline to assess and report data breaches.', 'Hint 3: Supporting your colleague and reporting are not opposites.'],
  strong: 'Kindly tell your colleague it must be reported, and offer to go with her. Report it straight away to the practice manager or the data protection lead. Treatment notes are health data, and sharing them with an unapproved service can be a personal data breach; under laws such as the UK and EU GDPR, organisations generally have 72 hours to report certain breaches to the regulator once they become aware. The lead will decide what to do (for example delete the chat and account data where possible, assess risk, notify if required). Afterwards, suggest a fix for the root cause: an approved way to make call lists, and short training. Reporting early protects patients and usually goes better for the person who made the mistake than a hidden problem found later.'
}));
practice.push(sp({
  title: 'AI Says the Law Changed', level: 'Hard', tags: ['research', 'HR', 'legal'],
  situation: 'While updating the staff handbook, an AI tells you a new law increased statutory sick pay from next month and gives an article link. Your manager wants the handbook updated today.',
  task: 'Plan how you would verify this and what you would do if you cannot verify it today.',
  weak: 'Update the handbook today based on the AI and the article.',
  weakWhy: 'Employment law details (dates, amounts, who qualifies) must be exact. Articles can be about proposals, other countries, or out of date. Wrong pay rules affect real wages.',
  mcq: mq('Which source settles what the law says?', ['A news article', 'The official government or legislation website and your employment adviser', 'The AI', 'A forum post'], 1, 'Laws are published officially; legal advice confirms how they apply to you.'),
  hints: ['Hint 1: Is it a law that has passed, a proposal, or a different country?', 'Hint 2: Find the official government page and note the start date and amount.', 'Hint 3: If you cannot confirm today, do not publish a guess. Tell your manager what is still unknown.'],
  strong: '(1) Open the article and check: which country, is it passed or proposed, what date and amount. (2) Find the official government guidance or legislation page and confirm the start date, the new rate and who qualifies. (3) Ask your employment law adviser or HR lead to confirm how it applies to your contracts. (4) If confirmed, update the handbook and note "as of [date], source: [official page]". (5) If not confirmed today, tell your manager clearly: "AI flagged a possible change; I could not confirm it from an official source yet; I have asked our adviser and will update when confirmed." Publishing a guess about pay is worse than a one-day delay.'
}));
practice.push(sp({
  title: 'The Board Asks "Did AI Write This?"', level: 'Hard', tags: ['ethics', 'disclosure', 'presentations'],
  situation: 'You used AI to draft a strategy paper for a charity board, then checked and rewrote large parts. A trustee asks in the meeting: "Did AI write this?" Your charity has no written AI policy yet.',
  task: 'Prepare an honest answer and a follow-up suggestion for the charity.',
  weak: 'Say "no", because you rewrote most of it.',
  weakWhy: 'It is not true, and if it comes out later it damages trust in you and the paper. Trustees also have a right to understand how the work was made.',
  mcq: mq('What is the best answer?', ['Deny it', 'Explain honestly how AI helped and how you checked it', 'Refuse to answer', 'Blame a colleague'], 1, 'Honesty plus explaining your checks builds trust.'),
  hints: ['Hint 1: Separate what the AI did from what you did.', 'Hint 2: Mention your checks: facts, numbers, data you kept out.', 'Hint 3: Use the question as a chance to suggest a simple policy.'],
  strong: 'Answer: "Yes, I used an AI assistant for the first draft and the structure. I then checked every figure against our accounts, rewrote the recommendations myself, and did not put any personal data about beneficiaries into the tool. The judgements in the paper are mine and I am happy to explain them." Follow-up: suggest the board agrees a short AI policy: which tools are approved, what data must never be entered (especially beneficiary and donor data), when to disclose AI use, and who checks AI-assisted documents. Offer to draft it, with AI help, clearly labelled.'
}));
practice.push(sp({
  title: 'Choose the Right Task for AI', level: 'Hard', tags: ['habits', 'judgement'],
  situation: 'A busy practice manager at a vet clinic lists her week: (a) reply to 30 routine booking emails, (b) decide which nurse gets promoted, (c) summarise a new 50-page medicines guidance document, (d) write a sympathy card to a client whose dog died, (e) analyse last year\'s appointment no-show rates by weekday, (f) draft a social media post about vaccination week.',
  task: 'For each task, say whether AI should help, how, and what the human must still do.',
  weak: 'Use AI for all of them to save as much time as possible.',
  weakWhy: 'Some tasks are decisions about people or need personal care, and some need careful expert checking. Blanket use risks unfair decisions and cold, wrong or unsafe output.',
  mcq: mq('Which task should AI not decide?', ['Draft a social post', 'Choose who gets promoted', 'Summarise guidance for a first read', 'Suggest replies to booking emails'], 1, 'Decisions about people need human judgement and accountability.'),
  hints: ['Hint 1: Sort tasks into: drafting, analysing, deciding about people, and personal care.', 'Hint 2: For each, ask "can I check it?" and "is the data safe to share?"', 'Hint 3: AI can still support hard tasks indirectly, like helping structure criteria, without making the decision.'],
  strong: '(a) Yes: AI drafts replies from a saved template; remove client details where possible and check dates and times before sending. (b) AI does not decide; at most it helps write fair criteria. The decision, based on evidence, is hers. Do not paste staff reviews into unapproved tools. (c) Yes, for orientation: ask for key changes with section numbers, then read the sections on doses and storage herself; medicines guidance needs expert reading. (d) Write it herself; a personal note is the point. (e) Yes: remove client names, ask for no-show rate by weekday, spot-check one or two weekdays by hand. (f) Yes: AI drafts, she checks the vaccine facts and dates with the vet. Rule: AI drafts and analyses; humans decide about people, check expert content and handle personal moments.'
}));

// ---------- QUIZ ----------
quiz.push(mq('You ask an AI to write a customer email but give no order details. What is it most likely to do?', ['Refuse to answer', 'Fill the gaps with typical-sounding but possibly wrong details', 'Ask your manager', 'Look up your order system'], 1, 'Without your facts it guesses, and guesses look like real details.'));
quiz.push(mq('An AI answer includes a citation link. What does that prove?', ['The claim is true', 'Only that there is a page to check; you still need to open it and confirm', 'The source is official', 'The AI searched the whole web'], 1, 'A citation is a claim to check, not proof.'));
quiz.push(mq('Which prompt gives the most useful meeting recap?', ['"Summarise the meeting"', '"List decisions, actions with owner and date, and open questions; write \'not stated\' if unclear"', '"Make it short"', '"Write it nicely"'], 1, 'A clear shape and permission to say "not stated" prevents invented details.'));
quiz.push(mq('An AI says total sales doubled, which nobody expected. What should you check first?', ['The colours of the chart', 'Duplicated rows or a totals row counted as data', 'Whether the AI was polite', 'The file name'], 1, 'An unexpected near-double often means double-counting.'));
quiz.push(mq('What is "personal data"?', ['Any data stored on your laptop', 'Information that can identify a living person', 'Only passwords', 'Only medical records'], 1, 'Names, contact details, ID numbers and combinations that point to someone all count.'));
quiz.push(mq('Which of these is generally safe to paste into an approved work AI tool?', ['A patient\'s treatment notes', 'Your company\'s already-published press release', 'A colleague\'s salary and review', 'A customer\'s bank card number'], 1, 'Public information has nothing to protect; the others are personal or sensitive.'));
quiz.push(mq('You pasted confidential data into an unapproved AI app by mistake. What now?', ['Delete the chat and say nothing', 'Report it to your manager or security team quickly', 'Paste more to explain', 'Wait to see if anything happens'], 1, 'Fast reporting lets your organisation limit the harm and follow legal steps.'));
quiz.push(mq('For a safety notice translated by AI, what is the right final step?', ['Print it straight away', 'Have a fluent speaker check it before posting', 'Translate it back once and trust that', 'Make the font bigger'], 1, 'Fluent output can still change meaning; a fluent human confirms it.'));
quiz.push(mq('In the F-A-C-T-S check, what does "A" stand for?', ['Audience', 'Assumptions the AI made that you did not tell it', 'Accuracy of spelling', 'Approval'], 1, 'Spotting hidden assumptions, such as a refund policy, catches many errors.'));
quiz.push(mq('Which task is the poorest fit for AI to do on its own?', ['Drafting a newsletter', 'Deciding which employee to promote', 'Suggesting slide headlines', 'Explaining a formula'], 1, 'Decisions about people need human judgement, fairness and accountability.'));
quiz.push(mq('What is a "prompt library"?', ['A list of banned words', 'A shared document of prompts that work well, with examples and what to check', 'A software program', 'The AI\'s training data'], 1, 'Teams save and share good prompts so everyone benefits.'));
quiz.push(mq('Why is a good slide headline like "Returns fell 18% after the new size guide" better than "Returns"?', ['It is longer', 'It states the point, so readers get the message even if they read nothing else', 'AI prefers it', 'It uses a number'], 1, 'Point-stating headlines carry the story.'));
quiz.push(mq('What is "automation bias"?', ['AI preferring certain topics', 'People trusting machine output more than they should', 'Faster typing', 'A spreadsheet error'], 1, 'Polished AI output makes this bias stronger, so use a checklist.'));
quiz.push(mq('You need the current statutory minimum leave in a country. Which is best?', ['An AI answer from memory', 'The official government page, with the date checked', 'A forum post', 'A colleague\'s guess'], 1, 'Laws change; the official, dated source is the one to rely on.'));

// ---------- INTERVIEW ----------
function iq(q, a, f) { interview.push({ q: q, a: a, level: 'B', followUps: f }); }
iq('How do you use AI tools in your day-to-day work?', `<p>Give two or three concrete uses and your safeguards. For example: "I use our approved assistant for first drafts of customer emails and for summarising long reports. I give it the facts and audience, then check names, numbers and promises before sending. I never paste customer personal data. It saves me about an hour a day, mostly on drafting." Specific tasks, a check, a data rule and a realistic benefit show judgement, not hype.</p>`, ['Which task does it not help with?', 'How do you know it saves time?']);
iq('Tell me about a time AI gave you a wrong answer. How did you catch it?', `<p>Use a short STAR story (Situation, Task, Action, Result). For example: an AI summary of a supplier contract said there was no late-payment penalty; I asked for clause numbers, read the clause, and found a 2% monthly fee in an exception. I corrected the summary and now always ask for references. The point is to show that you check specifics and changed your process.</p>`, ['What do you check first now?', 'Did you tell anyone?']);
iq('What information would you never put into an AI tool?', `<p>Personal data about customers, patients or staff (names with contact details, ID numbers), health information, payment details and passwords, confidential business plans or contracts under NDA, and HR matters about named people, unless the company has specifically approved a tool for that data. Even then, share only what the task needs and redact the rest. Mention that you follow the company AI policy and approved tools list.</p>`, ['What if the tool is company-approved?', 'How would you redact a document?']);
iq('How do you check that information from an AI is accurate?', `<p>Describe a routine. For facts I open the sources and check the exact words and date; for numbers I trace them to the original or do a quick sense-check; for anything legal, medical or financial I use the official source or an expert. I use a simple checklist (facts, assumptions, context, tone, sensitive data) and spend most time on numbers, names, dates and promises, where errors cluster.</p>`, ['What if there is no time to check?', 'Do you trust citations?']);
iq('Would you use AI to write a message to an upset customer?', `<p>Yes, for structure and tone, but carefully. I would give it the facts (what went wrong, what we can offer, policy limits), ask for a sincere, non-defensive reply, then check every promise and add a personal line in my own words. I would not paste the customer's personal details into an unapproved tool, and for serious complaints I would make sure the final words are mine and a manager has seen it.</p>`, ['What would you never let the AI promise?', 'How do you keep it from sounding robotic?']);
iq('Some colleagues are worried AI will replace their jobs. How would you talk to them?', `<p>Acknowledge the concern honestly: some tasks will change. Then focus on what is in their control: AI is good at drafts and routine text, while judgement, relationships, knowledge of customers and checking quality become more valuable. Offer practical help: show one task where AI saves time, share prompts, and agree safe rules. Avoid promising that nothing will change, and point them to any training the company offers.</p>`, ['How would you help a colleague who refuses to try it?', 'What skills become more valuable?']);
iq('How would you introduce AI to a team that has never used it?', `<p>Start small and safe: confirm approved tools and the data rules, pick two or three low-risk, high-volume tasks (drafting routine emails, summarising notes), show examples, and build a shared prompt library. Add one rule: check before sending. After a month, measure time saved and quality, keep what works, and expand gradually. Involve sceptics as reviewers, since they spot errors well.</p>`, ['How would you measure success?', 'What would you not use it for at first?']);
iq('Do you tell people when you have used AI in your work?', `<p>I follow my organisation's policy on disclosure, and where there is none I lean towards being open when it matters to the reader, for example for reports, published content or anything where the reader might assume it is entirely my own expert work. I am clear about what the AI did and what I checked or decided. The final work and its accuracy are my responsibility either way.</p>`, ['What if a client asks directly?', 'Would you label internal emails?']);
iq('Give an example of using AI with spreadsheets or data without coding.', `<p>For example: "I asked our approved assistant to explain a formula in a budget file in plain words, then tested it by changing one value in a copy. Another time I asked for no-show rates by weekday after removing client names, and spot-checked two weekdays by hand." Show a clear question, data protection and a spot-check.</p>`, ['What errors do spreadsheets hide?', 'How did you know the answer was sensible?']);
iq('When is it better not to use AI?', `<p>When the task is a decision about people (hiring, promotion, discipline), when it needs personal care (condolences, serious apologies), when I cannot check the result, when the data is too sensitive for any approved tool, or when the thinking is the point, such as learning a skill. Also when it is simply faster to do it myself. Knowing when not to use it is part of using it well.</p>`, ['Can you give a real example?', 'What about legal documents?']);
iq('How do you stay up to date with AI tools at work?', `<p>I focus on habits that last (clear briefs, checking, data protection) rather than memorising features, because product features change often. I read our IT announcements and policy updates, try new features on low-risk tasks, share what works with my team, and check the provider's official help pages before relying on a feature. I also follow one or two trusted newsletters rather than social media hype.</p>`, ['What was the last thing you learned?', 'How do you judge a new tool?']);
iq('A manager asks you to use AI to produce a report by tomorrow that would normally take a week. What do you do?', `<p>Agree on scope and quality first: what decisions will the report support and which numbers must be exact. Use AI for structure, drafting and summarising sources, but reserve time for checking every figure and key claim against originals. Be transparent about anything I could not verify and mark it. If a full-quality report is not possible by tomorrow, propose a shorter verified version now and the full one later.</p>`, ['What would you cut first?', 'How do you flag uncertainty?']);
iq('What is a hallucination, and why does it matter for your job?', `<p>In simple terms, it is when the AI states something false as if it were true, such as a fake statistic, a non-existent study or a wrong policy detail, because it produces likely-sounding text rather than checked facts. It matters because I am responsible for what I send. If I pass on a hallucinated fact to a customer, patient or my boss, the error becomes mine. That is why I check specifics before using AI output.</p>`, ['How do you spot one?', 'Do search-enabled tools solve it?']);

registerModule({
  id: 'ai33',
  title: 'AI for Everyone: AI at Work Without Code',
  intro: `<p>You do not need to code to get real value from AI at work. This module shows people in HR, sales, marketing, operations, teaching, finance and healthcare admin how to use everyday AI assistants for writing and email, research with sources, summarising documents and meetings, asking spreadsheet questions in plain words, presentations, translation and brainstorming.</p><p>Just as important, you will learn to <b>check AI output before you use it</b>, to know <b>what never to paste into an AI tool</b>, and to build habits that make you faster and more trusted. Every exercise is a realistic work situation with a weak and a strong approach. No coding anywhere.</p>`,
  goals: [
    'Write clear briefs for drafting and editing emails, letters and reports, and check the result',
    'Research with sources and verify each claim by opening, finding and judging the source',
    'Get useful summaries of documents and meetings, with owners, dates and references you can check',
    'Ask spreadsheet and data questions in plain words and spot-check the answers',
    'Use AI for slides, translation and brainstorming, knowing when a human expert must review',
    'Apply a quick checking routine (F-A-C-T-S) and decide what may never be pasted into an AI tool',
    'Build lasting team habits: approved tools, a shared prompt library and honest measurement'
  ],
  prereqs: `<p>Module ai01 (AI, ML and GenAI in plain English) explains what these tools are and why they make mistakes; this module does not repeat those definitions. No technical background or coding is needed. The next module, ai34, goes deeper into giving AI the right context.</p>`,
  hours: 5,
  langExplain: `<p>This module has no code. The few grey text boxes are example wording you could type into an AI assistant, not programs.</p>`,
  topics: topics, practice: practice, quiz: quiz, interview: interview
});
})();
