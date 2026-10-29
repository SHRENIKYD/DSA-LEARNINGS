(function () {
var topics = [], practice = [], quiz = [], interview = [];

function mq(q, o, a, e) { return { q: q, options: o, answer: a, explain: e }; }
// Scenario problem builder (no code): weak answer = "brute", model answer = solution.approach
function SP(title, level, tags, statement, constraints, example, weak, mcq, hints, approach, followUps) {
  return { title: title, level: level, tags: tags, statement: statement, constraints: constraints, example: example,
    brute: { why: weak }, mcq: mcq, hints: hints,
    solution: { approach: approach, complexity: '<p>Judgement exercise: judge your answer by whether it names the real risk, a proportionate safeguard and who decides, not by length.</p>', followUps: followUps || [] } };
}
function has(text, words) { var t = String(text).toLowerCase(); return words.some(function (w) { return t.indexOf(w) >= 0; }); }
// Visualizer: reads "item: detail; item: detail", adds one row per frame, then labels each row with classify(row) -> [label, cls]
function rowsViz(title, inputLabel, input, cols, startNarr, classify, finalHtml) {
  return {
    title: title, input: input, inputLabel: inputLabel,
    gen: function (inp) {
      var items = String(inp || '').split(';').map(function (s) { return s.trim(); }).filter(Boolean);
      if (items.length < 2 || items.length > 8) throw new Error('Give 2-8 items separated by ";" like: ' + input.split(';').slice(0, 2).join(';'));
      var rows = items.map(function (s) {
        var k = s.indexOf(':');
        if (k < 1) throw new Error('Each item needs "name: detail", e.g. ' + input.split(';')[0]);
        return [s.slice(0, k).trim().slice(0, 50), s.slice(k + 1).trim().slice(0, 140)];
      });
      var frames = [{ narr: startNarr, parts: [{ type: 'table', label: title, columns: cols, rows: [], hl: {} }] }];
      var done = [], hlAll = {};
      for (var i = 0; i < rows.length; i++) {
        var c = classify(rows[i]);
        done.push([rows[i][0], rows[i][1], c[0]]);
        var hl = {}; hl[i] = 'cur'; hlAll[i] = c[1];
        frames.push({ narr: '<b>' + H.esc(rows[i][0]) + '</b>: ' + c[2], parts: [{ type: 'table', label: title, columns: cols, rows: done.map(function (r) { return r.slice(); }), hl: hl }] });
      }
      frames.push({ narr: 'Summary: green rows look fine, amber rows need a check, red rows need to stop or change.', parts: [{ type: 'table', label: title, columns: cols, rows: done.map(function (r) { return r.slice(); }), hl: hlAll }, { type: 'text', label: 'Takeaway', html: finalHtml }] });
      return frames;
    }
  };
}

// ---------- TOPIC 1: Hallucinations ----------
topics.push({
  title: 'Hallucinations: Confident, Fluent and Wrong',
  analogy: `<p>Think of a very eager new intern who never says "I don't know". Ask them for the date of a meeting and they will give you a date, in a calm, confident voice, even when they are guessing. Most of the time they are right. The problem is that they <b>sound exactly the same</b> when they are wrong. You would never send their work to a client without checking it. Treat an AI chatbot the same way.</p>`,
  explain: `<p><b>The plain idea:</b> a <b>hallucination</b> is when an AI tool states something false as if it were true: a made-up fact, a quote nobody said, a book or court case that does not exist, a wrong number. It happens because a chatbot (a "large language model") works by predicting likely-sounding next words from patterns in its training text. It is built to produce fluent text, not to look facts up in a trusted database, so a fluent guess and a true fact can look identical.</p>` +
    H.table(['Where it bites', 'Real, documented example'], [
      ['Law', 'In <i>Mata v. Avianca</i> (US federal court, New York, 2023) lawyers filed a brief citing court cases that ChatGPT had invented. The judge fined the lawyers and their firm $5,000.'],
      ['Customer service', 'In <i>Moffatt v. Air Canada</i> (British Columbia Civil Resolution Tribunal, 2024) the airline\'s website chatbot gave a passenger wrong information about a bereavement fare refund. The tribunal ruled the airline was responsible for what its chatbot said and ordered it to pay.'],
      ['Everyday work', 'Summaries that add a decision the meeting never made, or a statistic with a source link that leads nowhere.']]) +
    `<p><b>How to spot one (no tech needed):</b></p><ul><li><b>Specifics with no source:</b> exact numbers, dates, names, quotes and citations are where errors hide. Ask "where does this come from?" and open the source yourself.</li><li><b>Too neat:</b> a perfect quote that says exactly what you hoped for.</li><li><b>Links and references</b> that do not open, or open to a page that says something else.</li><li><b>Ask again:</b> regenerate or ask in a new chat. If the "fact" changes each time, it was a guess.</li><li><b>Check against the original</b> when the AI summarised a document you have.</li></ul><p>Tools that search the web or work only from documents you give them hallucinate less, but they still can. The rule: <b>the higher the stakes, the more you check</b>.</p>`,
  clues: ['"Can we trust what the chatbot tells customers?"', 'A source, quote or statistic you cannot find anywhere else', '"The AI said it, so it must be right"', 'High-stakes output: legal, medical, financial, public statements', 'An answer that changes when you ask the same question again'],
  viz: rowsViz('Fact-check an AI answer, claim by claim', 'Claim: what you found when checking; ... (2-8 items)',
    'Revenue grew 12% in 2024: matches the annual report; CEO quote about growth: no source found; Founded in 1998: company website says 1998; Study by Stanford on remote work: link opens a different study',
    ['Claim', 'What checking showed', 'Verdict'],
    'Split the AI answer into separate claims, then check each one against an original source. A single wrong claim can sink the whole document.',
    function (r) {
      if (has(r[1], ['no source', 'not found', 'cannot find', 'different', 'wrong', 'does not', 'invented', 'fake'])) return ['Do not use', 'bad', 'checking failed, so treat it as a possible hallucination: remove it or find a real source.'];
      if (has(r[1], ['matches', 'says', 'confirmed', 'same'])) return ['OK', 'ok', 'an original source confirms it. Keep it and cite the original, not the chatbot.'];
      return ['Check', 'cur', 'not clearly confirmed yet. Look for the original before using it.'];
    },
    '<p>Only claims confirmed by an original source survive. Cite the source, never "ChatGPT said".</p>'),
  examples: [
    { title: 'The invented citation', html: `<p>You ask for "three studies showing four-day weeks raise productivity". The answer lists three studies with authors and years. Two exist; one has a real author but a title they never wrote. Only opening each study catches it.</p>` },
    { title: 'The confident summary', html: `<p>A meeting summary says "the team agreed to launch on 3 March". The transcript shows someone <i>suggested</i> 3 March and nobody agreed. Summaries can turn possibilities into decisions; check action items against the notes.</p>` },
    { title: 'Asking it to flag uncertainty', html: `<p>Adding "If you are not sure, say so, and mark which statements need checking" helps the tool be more careful. It does not remove the need to check, because a tool can be confidently wrong about how sure it is.</p>` }
  ],
  deepDive: `<p><b>Why it cannot simply be switched off:</b> the same ability that lets an AI write a fresh paragraph in your style is what lets it produce a fresh "fact". Companies reduce hallucinations by connecting the AI to search or to your documents and by training it to say "I don't know", but no current general-purpose chatbot is error-free, and makers say so in their own warnings.</p><p><b>Who is responsible?</b> The Air Canada case shows a pattern courts and regulators keep repeating: if you publish or act on an AI answer, it is <b>your</b> answer. "The AI made a mistake" did not work as a defence. The same goes for a report you hand to your boss.</p><p><b>Where it is most dangerous:</b> anything a reader cannot easily check (medical, legal, financial advice, facts about real people) and anything that is acted on automatically without a person reading it first.</p>`,
  aiEra: `<p><b>Working with it, not against it:</b> use AI for drafting, structure and ideas, where a wrong guess is cheap and you will read every line anyway. Use it for facts only with a source you open yourself. Prefer tools that show their sources, and ask "quote the exact sentence from the document that supports this".</p><p><b>Team habit:</b> any AI-assisted output that leaves the team (a client email, a report, a public post) gets a named human checker for facts, numbers and quotes. The technical module ai13 explains how engineers build automatic checks; for everyone else, the habit of opening the source is the main defence.</p>`,
  problems: [SP('Spot the Hallucination Risk in a Plan', 'Easy', ['hallucination', 'review'],
    `<p>Your marketing team plans to ask a chatbot to write a "fact sheet" on your product with industry statistics, a quote from a well-known analyst, and three customer success numbers, and to post it on the website the same day. List the hallucination risks and the checks you would add.</p>`,
    `<p>No technical tools needed. Name at least three risky items and one check per item.</p>`,
    `<p>Risky items: the industry statistics (could be invented or out of date), the analyst quote (could be fabricated, and quoting a real person falsely is a serious problem), the customer numbers (the AI does not know your customers' real results).</p>`,
    `<p>Publish it after reading it once "because it sounds right". Fluent text is not checked text, and the quote alone could embarrass the company and the analyst.</p>`,
    mq('Which part of the plan is the most dangerous to publish unchecked?', ['The quote attributed to a real analyst', 'The friendly tone', 'The headline font', 'The length'], 0, 'A made-up quote from a real, named person can mislead readers and harm that person; it must be verified at the source or removed.'),
    ['Hint 1: hallucinations hide in specifics: numbers, names, quotes, dates.', 'Hint 2: for each specific, ask "what original source would prove this?"', 'Hint 3: the AI cannot know your own customers\' results; those must come from your own records.'],
    `<p><b>Risks and checks.</b> (1) <b>Industry statistics</b>: each number needs an original, dated source (a report you open and read); otherwise cut it. (2) <b>Analyst quote</b>: never publish a quote you cannot find in the analyst's own published words; best is to ask the analyst or drop it. (3) <b>Customer numbers</b>: take them only from your own records with the customer's permission to publish them. (4) <b>Process</b>: no same-day publishing; a named person checks every fact against its source and signs off. (5) Use the AI for the structure and wording, and paste in the verified facts yourself.</p>`,
    ['What would you do if the analyst quote cannot be found?', 'How would you explain this check to a manager in a hurry?'])]
});

// ---------- TOPIC 2: Bias and fairness ----------
topics.push({
  title: 'Bias and Fairness: When AI Repeats Old Unfairness',
  analogy: `<p>Imagine teaching a new hiring assistant only by showing them the last ten years of who your company hired. If the company mostly hired men for engineering, the assistant will quietly learn "men are a good fit for engineering", even though nobody told them that. AI learns from past data the same way, so it can copy past unfairness at a much larger scale.</p>`,
  explain: `<p><b>The plain idea:</b> <b>bias</b> in AI means the system works better for some groups of people than others, or treats them unfairly, often along lines such as gender, race, age, disability or language. <b>Fairness</b> is the goal of making outcomes just for everyone affected. Bias usually comes from the <b>data</b> (history, or who was left out), from <b>what the system was told to predict</b>, or from <b>how it is used</b>.</p>` +
    H.table(['Well-documented case', 'What happened'], [
      ['Amazon recruiting tool (reported by Reuters, 2018)', 'An experimental CV-ranking tool learned from ten years of past applications, mostly from men, and downgraded CVs containing the word "women\'s" (as in "women\'s chess club"). Amazon said it was never used on its own to judge candidates and dropped the project.'],
      ['"Gender Shades" study (Buolamwini and Gebru, 2018)', 'Commercial face-analysis products guessed gender far less accurately for darker-skinned women (error rates up to about 35%) than for lighter-skinned men (under 1%).'],
      ['Wrongful arrest in Detroit (2020)', 'Robert Williams was arrested after a face-recognition search wrongly matched him to a shoplifting suspect. The city later settled his case and changed its police rules on using face recognition.'],
      ['Dutch childcare benefits scandal (2010s)', 'Tax authorities used risk-scoring, including nationality as a factor, and thousands of families were wrongly accused of fraud. The government resigned in 2021 over the scandal.']]) +
    `<p><b>Generative AI too:</b> image and text tools can repeat stereotypes, for example drawing "a doctor" mostly as a man, or writing a weaker reference letter for one name than another. These are easy to test: ask the same thing with only the name or group changed and compare.</p><p><b>What fairness questions to ask:</b> Who could be harmed? Was the system tested on people like them? Can a person ask for a human review? Is there a way to report a wrong decision?</p>`,
  clues: ['AI used to screen, rank, score or approve people (jobs, loans, housing, school, benefits)', '"The data is neutral, it is just history"', 'Face recognition used to identify people', 'Results tested only on one group, language or region', 'No way for a person to appeal an automated decision'],
  viz: rowsViz('Swap-test: change only the name or group', 'Version: how the AI answered; ... (2-8 items)',
    'Reference for James: strong, leader, confident; Reference for Aisha: strong, leader, confident; Reference for Maria: helpful, kind, supportive; Reference for Wei: strong, leader, confident',
    ['Version', 'AI answer', 'Same as the first?'],
    'A simple fairness check anyone can run: ask the same question several times changing only one detail (a name, gender, age), then compare the answers side by side.',
    function (r) {
      if (has(r[1], ['helpful', 'kind', 'supportive', 'lower', 'reject', 'weaker'])) return ['Different', 'bad', 'the wording changed even though only the name changed. That is a sign of bias worth reporting.'];
      return ['Same', 'ok', 'same qualities as the others. Good, but one test is not proof of fairness.'];
    },
    '<p>One swap-test proves nothing either way, but a pattern of differences is a warning. Real fairness testing uses many examples and the people affected.</p>'),
  examples: [
    { title: 'Hiring screener', html: `<p>A recruiter wants an AI tool to rank 2,000 applicants. Questions to ask the vendor: Has it been tested for differences by gender, age, ethnicity and disability? Can candidates request a human review? Does the law where you hire require an audit? (New York City, for example, has required independent bias audits of automated hiring tools since 2023.)</p>` },
    { title: 'Language bias', html: `<p>A support chatbot answers English questions well but gives shorter, less accurate answers in Hindi or Swahili. That is unfair to customers who write in those languages. Testing in every language you serve is part of fairness.</p>` },
    { title: 'Image stereotype', html: `<p>You ask an image tool for "a CEO" ten times and get ten men in suits. For a company slide, that quietly repeats a stereotype. Fix it by being specific in your request and reviewing images before use.</p>` }
  ],
  deepDive: `<p><b>Why "just remove gender" does not work:</b> other details can stand in for it, such as a women's college, a career gap, a postcode or a hobby. That is why bias testing looks at <i>outcomes</i> for different groups, not only at which columns were removed.</p><p><b>Fair for whom?</b> There are several reasonable definitions of fairness (equal approval rates, equal error rates, and others) and they can conflict. Choosing one is a values decision, so it should involve people beyond the tech team: legal, HR, affected users.</p><p><b>Law:</b> many countries already ban discrimination in hiring, lending and housing whether a person or a machine decides. The EU AI Act also treats AI in hiring, credit scoring and education as "high-risk" with extra duties (see the regulation topic).</p>`,
  aiEra: `<p><b>Your role as a non-technical user:</b> you are often the person who notices bias first, because you see the real cases. Keep examples, report patterns, and insist on a human review path for decisions about people.</p><p><b>Good practice:</b> do not let AI make final decisions about people on its own; use it to assist, with a human who can overrule it. Ask vendors for their fairness testing results in writing. Run your own swap-tests before rollout and repeat them after updates, because a tool can change when the vendor updates its model.</p>`,
  problems: [SP('Check a Hiring Tool for Fairness Before Rollout', 'Medium', ['bias', 'hiring'],
    `<p>HR wants to buy an AI tool that reads CVs and gives every applicant a score from 1 to 100; anyone under 40 is rejected automatically. Write five questions you would ask the vendor and two changes you would make to the plan.</p>`,
    `<p>Plain English. Think about testing, appeals, humans and the law.</p>`,
    `<p>Example question: "Show us results of testing whether scores differ by gender, age and ethnicity for equally qualified people."</p>`,
    `<p>"The vendor is big, so it must be fair." Size is not evidence; the Amazon tool came from a very large company.</p>`,
    mq('What is the biggest problem in the plan as written?', ['Automatic rejection with no human ever looking', 'Scores from 1 to 100', 'Reading CVs', 'Buying from a vendor'], 0, 'Fully automatic rejection removes the chance to catch bias or errors, and in many places it also raises legal issues about automated decisions.'),
    ['Hint 1: think of the Amazon CV case: where could the bias come from?', 'Hint 2: who checks a wrong rejection, and how would the applicant ever know?', 'Hint 3: hiring is listed as high-risk under the EU AI Act, and some cities require audits.'],
    `<p><b>Questions:</b> (1) What data was the tool trained on, and from which countries and industries? (2) What bias testing have you done by gender, age, ethnicity and disability, and can we see the results? (3) Will you support an independent audit, as NYC Local Law 144 requires for such tools there? (4) How do you explain why a candidate got their score? (5) What changes when you update the model, and do you tell us? <b>Changes:</b> (a) no automatic rejection: a trained person reviews low scores, at least until testing shows the tool is fair, and candidates are told AI is used and can ask for human review; (b) run a pilot alongside the existing process and compare outcomes by group before any decision depends on it. Involve HR, legal and data-protection people.</p>`,
    ['What would you do if the vendor refuses to share test results?'])]
});

// ---------- TOPIC 3: Privacy ----------
topics.push({
  title: 'Privacy and Confidential Data: What You May Paste',
  analogy: `<p>Typing into an AI chat is like handing a document to a helpful stranger at a print shop. Most of the time nothing bad happens. But you would not hand them your customer list, a colleague's medical note or your company's unreleased plans, because once it leaves your hands you no longer control where it goes or who sees it.</p>`,
  explain: `<p><b>The plain idea:</b> what you type or upload into an AI tool is sent to the company that runs it. Depending on the product and its settings, it may be stored, reviewed by staff for safety, or used to train future versions. <b>Personal data</b> means any information about an identifiable person (name, email, phone, ID number, health, salary). <b>Confidential data</b> means business information that is not public (contracts, source code, plans, passwords).</p>` +
    H.table(['Usually fine', 'Only in an approved company tool', 'Never paste'], [
      ['Public information, your own general questions, made-up examples', 'Internal documents, draft plans, customer emails with names removed', 'Passwords and access keys, card or bank numbers, ID numbers, health records, other people\'s personal data without a legal basis, anything under a confidentiality agreement']]) +
    `<p><b>A real lesson:</b> in 2023 Samsung restricted staff use of public chatbots after employees reportedly pasted internal source code and meeting notes into ChatGPT. Nobody was hacked; the data simply left the company.</p><p><b>Consumer vs business versions:</b> many AI providers offer business or enterprise plans whose contracts say your data is not used for training, with admin controls. Free personal accounts often have different defaults. Check your company's approved list and the tool's settings, not your assumptions.</p><p><b>The law:</b> in the EU and UK, the <b>GDPR</b> (General Data Protection Regulation) applies to personal data whether or not AI is involved. Italy's data-protection authority temporarily blocked ChatGPT in 2023 and fined OpenAI €15 million in December 2024 over how it handled personal data. Other countries (for example India's Digital Personal Data Protection Act, and many US states) have their own privacy laws.</p>`,
  clues: ['"Can I paste this customer email into ChatGPT?"', 'Names, emails, ID numbers, health or salary details in the text', 'A free personal account used for work', 'Uploading whole spreadsheets or contracts', 'Unreleased product plans, financials or source code'],
  viz: rowsViz('Traffic-light: may this go into an AI tool?', 'Item: what it contains; ... (2-8 items)',
    'Blog draft: public product info only; Customer complaint: name and email of customer; Sales forecast: unreleased quarterly numbers; Staff list: salaries and home addresses; Login help: admin password',
    ['Item', 'Contains', 'Decision'],
    'Before pasting, look at <b>what</b> the text contains, not what it is called. Each row gets a traffic light.',
    function (r) {
      if (has(r[1], ['password', 'salar', 'health', 'medical', 'card', 'bank', 'passport', 'address', 'id number', 'key'])) return ['Never', 'bad', 'contains secrets or sensitive personal data. Do not paste it into any AI tool unless a specific, approved process says otherwise.'];
      if (has(r[1], ['name', 'email', 'phone', 'unreleased', 'internal', 'contract', 'customer', 'confidential'])) return ['Approved tool only', 'cur', 'personal or confidential. Remove names and details, or use only your company-approved AI tool.'];
      return ['OK', 'ok', 'public or harmless. Fine for a general AI tool.'];
    },
    '<p>When in doubt: remove names and numbers, use the approved tool, or ask your data-protection contact.</p>'),
  examples: [
    { title: 'Removing personal details', html: `<p>Instead of "Write a reply to Priya Shah (priya@shop.com), order 55812, who says her card was charged twice", paste "Write a polite reply to a customer who says their card was charged twice and wants a refund." The AI needs the situation, not the person.</p>` },
    { title: 'Meeting transcripts', html: `<p>An AI note-taker records a call with an outside client. Did everyone agree to being recorded and transcribed? In many places consent or notice is legally required. Tell people at the start and follow your company's rules.</p>` },
    { title: 'Settings matter', html: `<p>Many chatbots let you turn off "use my chats to improve the model" or use temporary chats. That helps, but it does not make it acceptable to paste a password or a patient's record.</p>` }
  ],
  deepDive: `<p><b>Why deleting later is not enough:</b> once text is sent, you cannot be sure every copy is gone (logs, backups, safety reviews). Treat sending as permanent.</p><p><b>Training vs storage:</b> "we don't train on your data" is not the same as "we don't store your data". Business contracts usually spell out both, plus where the data is kept (which matters for EU rules on transferring data abroad).</p><p><b>Confidentiality agreements:</b> pasting a client's document into an outside tool may break an NDA (non-disclosure agreement) even if no law is broken. Professional rules for lawyers, doctors and accountants add their own limits.</p><p><b>Not legal advice:</b> privacy law differs by country and sector; your company's privacy or legal team decides what is allowed for your data.</p>`,
  aiEra: `<p><b>Good habits:</b> use only the AI tools your organisation approves for work; strip names, numbers and identifiers before pasting; never paste secrets; keep the minimum needed for the task. If you pasted something you should not have, tell your security or privacy contact quickly: a leaked password can be changed, but only if someone knows.</p><p>The engineering version of this (automatic redaction, data-loss prevention tools) is covered in ai13; here the point is the everyday judgement call before you press Enter.</p>`,
  problems: [SP('Decide What May Be Shared With an AI Tool', 'Easy', ['privacy', 'confidential data'],
    `<p>You want help writing a performance review. You have: (a) the employee's name, (b) their salary, (c) three examples of their work this year, (d) a note from HR about a health-related absence, (e) your company's review template. Your company has an approved enterprise AI tool. Decide what you share and how.</p>`,
    `<p>Decide item by item: share, share after editing, or do not share.</p>`,
    `<p>(e) The template is fine. (d) Health information is sensitive and not needed to improve the wording.</p>`,
    `<p>Paste everything into a free personal chatbot "to get the best result". That exposes sensitive personal data with no need.</p>`,
    mq('Which item should never go into the AI tool for this task?', ['The health-related absence note', 'The review template', 'Work examples with the name removed', 'A request for a polite tone'], 0, 'Health data is a special, sensitive category in many privacy laws, and the AI does not need it to help with wording.'),
    ['Hint 1: ask "does the AI need this to help with the wording?"', 'Hint 2: health and salary are especially sensitive.', 'Hint 3: use the approved tool, and replace the name with "the employee".'],
    `<p>Use the <b>approved enterprise tool</b>, not a personal account. (a) Name: do not share; write "the employee". (b) Salary: do not share; it is not needed for wording. (c) Work examples: share after removing names of the employee, colleagues and clients. (d) Health note: never share; it is sensitive personal data and must not influence the review wording anyway. (e) Template: share. Then read the draft yourself: the review is your judgement, and you must be able to stand behind every sentence.</p>`,
    ['What if the approved tool is down and the deadline is today?'])]
});

// ---------- TOPIC 4: Copyright ----------
topics.push({
  title: 'Copyright: Who Owns AI Output (It Depends Where You Are)',
  analogy: `<p>Copyright is like a fence around a creative work that says "the person who made this decides how it is copied". AI raises two new questions about that fence: was it okay to learn from everyone else's fenced gardens to build the tool, and does anyone own the new garden the tool grows for you? Different countries are answering differently, and many answers are still being decided in court.</p>`,
  explain: `<p><b>Two separate questions:</b></p><ol><li><b>Input:</b> was it lawful to train AI on books, articles, images and music without asking the creators? Many lawsuits are testing this. For example, the New York Times sued OpenAI and Microsoft in 2023 (still being fought); Getty Images sued Stability AI in the UK, where the High Court gave a first ruling in November 2025 that mostly went against Getty but on narrow grounds; in the US, authors sued Anthropic and agreed a settlement of about $1.5 billion in 2025 over books obtained from pirate sites. Outcomes differ by country and by facts.</li><li><b>Output:</b> can you own what the AI makes for you?</li></ol>` +
    H.table(['Place', 'Plain-English position (as of late 2026)'], [
      ['United States', 'Copyright needs a <b>human author</b>. The Copyright Office says purely AI-generated material is not protected, but human creative choices (selecting, arranging, editing, your own added text) can be. Courts agreed in <i>Thaler v. Perlmutter</i>; the Supreme Court declined to hear an appeal in March 2026.'],
      ['United Kingdom', 'The law has an older rule for "computer-generated works" with no human author, giving a shorter protection to the person who made the arrangements. How it applies to modern AI is untested and the government has consulted on changing it.'],
      ['China', 'A Beijing court (2023) gave copyright to a person for an AI image because of their many creative choices in prompts and settings. Other cases may go differently.'],
      ['EU', 'Generally requires the author\'s "own intellectual creation", which points to human input. Separately, the EU AI Act makes general-purpose AI makers publish a summary of training content and respect creators\' opt-outs.']]) +
    `<p><b>Practical upshot:</b> do not assume you own pure AI output, and do not assume it is free of someone else's rights. If something matters commercially (a logo, a book, a campaign), add real human creative work, keep records of what you did, check the tool's terms, and ask your legal team. This lesson is general education, not legal advice.</p>`,
  clues: ['"Can we trademark or copyright this AI-made logo?"', '"Make it look like [famous artist / brand]"', 'Publishing AI images or text commercially', 'A client contract that says you deliver original work you own', 'Using AI to copy a competitor\'s text or style'],
  viz: rowsViz('How much human authorship is in this work?', 'Step: who did it; ... (2-8 items)',
    'Idea and brief: human wrote it; First draft image: AI generated it; Choosing 1 of 20 images: human selected; Redrawing the face and adding text: human edited by hand; Final colour pass: AI filter',
    ['Step', 'Who did it', 'Counts toward human authorship? (US approach, simplified)'],
    'Under the US approach, protection follows <b>human creative choices</b>. Walk through how the work was made.',
    function (r) {
      if (has(r[1], ['by hand', 'edited', 'wrote', 'drew', 'arranged', 'human'])) return ['Likely yes', 'ok', 'a human made creative choices here; these parts can count.'];
      if (has(r[1], ['selected', 'chose'])) return ['Maybe', 'cur', 'selection and arrangement can count if creative, but just picking one output may not be enough.'];
      return ['Likely no', 'bad', 'material generated by AI alone is not protected under the US approach.'];
    },
    '<p>Keep a simple record of human contributions for important work. Other countries differ, and courts are still deciding edge cases.</p>'),
  examples: [
    { title: 'The comic book case', html: `<p>In 2023 the US Copyright Office reviewed the comic <i>Zarya of the Dawn</i>: it protected the author's text and the selection and arrangement of images, but not the individual Midjourney-generated images themselves.</p>` },
    { title: '"In the style of"', html: `<p>Style itself is generally not owned, but copying recognisable characters, logos or large chunks of text can infringe. Asking for "a poster in the style of a famous brand" can also create trademark and reputation problems. Safer: describe the look you want in your own words.</p>` },
    { title: 'Tool terms', html: `<p>Many AI tools say in their terms that you own the output as far as the law allows, and some business plans offer legal protection if you are sued for copyright. Read what your plan actually says; it cannot give you rights the law does not.</p>` }
  ],
  deepDive: `<p><b>Why it is unsettled:</b> copyright laws were written before generative AI. Courts are applying old ideas (fair use in the US, text and data mining exceptions in the EU and UK) to new facts, and early decisions can be appealed or overtaken by new laws. Expect change.</p><p><b>Workplace angle:</b> your employment contract usually gives your employer the rights to your work. If your work includes AI output with uncertain ownership, that uncertainty passes to the company, which is why many company policies require disclosure for client deliverables and creative assets.</p><p><b>Open-source and code:</b> AI coding assistants can sometimes reproduce licensed code; companies handle that with filters and reviews.</p>`,
  aiEra: `<p><b>Safe habits:</b> treat AI output as a draft you transform; avoid prompts that ask to copy a named living artist, a brand or a specific text; check images and text for recognisable logos, characters and passages; keep notes on your human contributions; ask legal before registering, selling or licensing AI-heavy work.</p><p><b>Respecting creators:</b> beyond the law, many people care whether creators were paid or asked. Being open about AI use (see the disclosure topic) helps keep trust with audiences and clients.</p>`,
  problems: [SP('Can We Own the AI Logo?', 'Medium', ['copyright', 'ownership'],
    `<p>A small business in the US used an image tool to make a new logo in ten minutes and wants to register it and print it on all products. Explain the copyright risk in plain words and suggest a safer process.</p>`,
    `<p>Plain English; no legal citations required. Say clearly what is uncertain.</p>`,
    `<p>Key point: under the US approach, a logo generated entirely by AI may not get copyright protection, so a competitor could copy it.</p>`,
    `<p>"The tool's terms say we own it, so we are fine." Terms cannot create copyright the law does not grant, and they do not prevent the image from resembling someone else's mark.</p>`,
    mq('Under the US approach, what most improves the chance of protection?', ['Meaningful human creative work on the final design', 'Using a paid AI plan', 'Writing a longer prompt', 'Saying "copyright" in the footer'], 0, 'The US Copyright Office looks for human authorship; prompts alone have generally not been enough.'),
    ['Hint 1: copyright and trademark are different; a logo usually relies on trademark too.', 'Hint 2: who made the creative choices in the final design?', 'Hint 3: check the design does not look like an existing brand.'],
    `<p><b>Risk:</b> in the US, purely AI-generated images generally do not get copyright, so the business may not be able to stop others copying the image as artwork. A logo can still often be protected as a <b>trademark</b> (which protects brand identity in trade, under different rules), but the design must not be confusingly similar to someone else's mark, and AI tools can produce lookalikes. <b>Safer process:</b> use the AI for rough ideas; have a designer (or the owner) redraw and develop the final logo by hand, keeping drafts as a record; run a trademark search; read the tool's terms; ask a lawyer before registering. This is uncertain territory and differs by country, so the plan should say "get advice" rather than assume.</p>`,
    ['How would the answer change for a business in China or the UK?'])]
});

// ---------- TOPIC 5: Deepfakes ----------
topics.push({
  title: 'Deepfakes and Misinformation',
  analogy: `<p>For most of history, a voice on the phone or a face on a video call was proof of who you were talking to, like a signature. Deepfakes make that signature easy to forge. So we need a new habit, like the one banks already use: before acting on an unusual request, call back on a number you already trust.</p>`,
  explain: `<p><b>The plain idea:</b> a <b>deepfake</b> is a fake but realistic image, video or voice recording made with AI, usually showing a real person doing or saying something they never did. <b>Misinformation</b> is false information spread by mistake; <b>disinformation</b> is spread on purpose to deceive.</p>` +
    H.table(['Real case', 'What happened'], [
      ['Arup, Hong Kong (early 2024)', 'An employee joined a video call with what looked like the company\'s finance chief and colleagues. All were deepfakes. The employee made transfers totalling about HK$200 million (around US$25 million). Arup confirmed it was the victim.'],
      ['New Hampshire robocall (January 2024)', 'An AI-cloned voice resembling President Biden told voters not to vote in a primary election. The US FCC then ruled that AI-generated voices in robocalls fall under existing robocall rules and fined the consultant behind it $6 million.'],
      ['Non-consensual intimate images', 'Fake sexual images of real people, including teenagers, have caused serious harm. The US TAKE IT DOWN Act (signed May 2025) made publishing such images a crime and requires platforms to remove them after a valid request.']]) +
    `<p><b>How to protect yourself and your team:</b></p><ul><li><b>Verify through a second channel</b> for any unusual or urgent request involving money, passwords or data: call back on a known number, or use an agreed code word.</li><li><b>Slow down when pressured:</b> urgency and secrecy are classic scam signals.</li><li><b>Check before sharing</b> shocking images or clips: who first posted it? Do trusted news outlets report it? A reverse image search can find older originals.</li><li>Do not rely on spotting visual glitches; fakes keep improving.</li></ul>`,
  clues: ['An urgent request for money or data over voice or video', '"Keep this confidential, do not tell anyone"', 'A shocking clip of a public figure shared without a source', 'A voice message from a family member asking for money', 'Plans to use a real person\'s face or voice in AI-made content'],
  viz: rowsViz('Scam signal checker for an unusual request', 'Signal: what you noticed; ... (2-8 items)',
    'Channel: video call from the CFO; Urgency: must transfer today; Secrecy: do not tell the team; Request: transfer to a new account; Verification: called CFO back on known number',
    ['Signal', 'What you noticed', 'Risk'],
    'Deepfake scams look normal on the surface. Score the <b>situation</b>, not how real the face or voice looks.',
    function (r) {
      if (has(r[1], ['called', 'verified', 'known number', 'code word', 'in person'])) return ['Safeguard', 'ok', 'an independent check through a trusted channel. This is what stops deepfake fraud.'];
      if (has(r[1], ['today', 'urgent', 'secret', 'tell', 'new account', 'gift card', 'password'])) return ['Red flag', 'bad', 'classic pressure signal. Pause and verify.'];
      return ['Note', 'cur', 'not a red flag on its own, but stay alert.'];
    },
    '<p>Any red flag plus money or data means: stop, verify by calling back on a known number, and follow the approval process.</p>'),
  examples: [
    { title: 'Family voice scam', html: `<p>A parent gets a call: their child\'s voice crying, asking for money urgently. Families can agree a secret code word in advance, and hang up and call the person back directly.</p>` },
    { title: 'Viral image check', html: `<p>An image of an "explosion" near a famous building spreads online. Before sharing: is it on reliable news sites? Is the official account of the place saying anything? Reverse image search shows whether it appeared earlier. If unsure, do not share.</p>` },
    { title: 'Using a real person\'s likeness at work', html: `<p>A team wants an AI video of the CEO giving a holiday message. Get the CEO's written consent, label it clearly as AI-generated, and keep it to that use. Using someone's face or voice without consent can break laws and destroys trust.</p>` }
  ],
  deepDive: `<p><b>Labels and watermarks:</b> some AI tools add invisible watermarks or attach "content credentials" (a record of how a file was made, from the C2PA standard backed by companies such as Adobe, Microsoft and Google). These help, but labels can be stripped and many tools do not add them, so absence of a label proves nothing.</p><p><b>Rules are arriving:</b> the EU AI Act requires deepfakes to be disclosed as AI-generated, and China has required labels on AI-generated content since September 2025. Many US states have laws on election deepfakes and intimate images.</p><p><b>The "liar's dividend":</b> once fakes are common, real evidence can be dismissed as "probably AI". That is another reason to rely on trusted sources and verification processes.</p>`,
  aiEra: `<p><b>Team habits:</b> write down a verification rule for payments and data requests ("any new payee or urgent transfer needs a call-back on a known number and a second approver"), train staff with real examples, and make it safe for people to say "I need to verify this" even to a senior boss.</p><p><b>When you create content:</b> label AI-generated images, voices and videos of people, get consent from anyone shown, and never make content that could mislead people about real events.</p>`,
  problems: [SP('Stop the Deepfake Payment', 'Medium', ['deepfake', 'fraud'],
    `<p>A finance assistant receives a video call from someone who looks and sounds like the CEO, asking for an urgent confidential transfer of €400,000 to a new supplier before the end of the day. Write the steps the assistant should take, and one process change for the company.</p>`,
    `<p>Assume the video looks completely real.</p>`,
    `<p>Step one: do not act on the call itself; verify through a different, trusted channel.</p>`,
    `<p>"It looked exactly like her, so it was her." In the Arup case the faces looked real too.</p>`,
    mq('What is the strongest single protection here?', ['Calling the CEO back on a number already on file', 'Looking for glitches in the video', 'Asking the caller to confirm their name', 'Doing the transfer in two smaller parts'], 0, 'An independent channel defeats the fake, because the attacker controls only the call they started.'),
    ['Hint 1: list the red flags: urgency, secrecy, new account.', 'Hint 2: verification must use a channel the caller does not control.', 'Hint 3: a good process does not depend on one person spotting a fake.'],
    `<p><b>Steps:</b> (1) Do not transfer during or right after the call. (2) Note the red flags: urgency, secrecy, a new payee. (3) Call the CEO back on a number from the company directory, or message them through a known internal channel. (4) Follow the normal payment process: new suppliers need bank details confirmed by a separate call to the supplier and approval by a second person. (5) If it is fake, report it to security immediately. <b>Process change:</b> a written rule that any new payee or urgent transfer above a set amount needs a call-back and two approvers, no exceptions for seniority, and short training using real deepfake cases.</p>`,
    ['How would you make staff feel safe questioning a senior leader?'])]
});

// ---------- TOPIC 6: Regulation ----------
topics.push({
  title: 'The EU AI Act and Other Rules, in Plain Words',
  analogy: `<p>The EU AI Act works like food safety rules. A few things are banned outright (poison). Risky products (baby food) need strict checks before they reach shelves. Some products just need an honest label (contains nuts). Most things (a loaf of bread) need nothing special. The rules depend on what the AI is <b>used for</b>, not on how clever it is.</p>`,
  explain: `<p><b>The EU AI Act</b> is the European Union's law on artificial intelligence. It entered into force on <b>1 August 2024</b> and applies in stages. It covers companies that offer or use AI in the EU, including companies based elsewhere. It sorts AI uses into risk levels:</p>` +
    H.table(['Risk level', 'Plain meaning', 'Examples'], [
      ['Unacceptable: banned', 'Uses seen as a clear threat to people\'s rights', 'Social scoring of people; AI that manipulates people in harmful ways or exploits vulnerable groups; emotion recognition at work or school (with narrow exceptions); scraping the internet for faces to build face databases; most real-time face identification in public by police'],
      ['High-risk: allowed with strict duties', 'AI that affects people\'s safety or important life chances', 'Screening job applicants, credit scoring, deciding access to education or public benefits, AI in medical devices or critical infrastructure'],
      ['Transparency duties', 'People must be told', 'Chatbots must make clear you are talking to AI; deepfakes and AI-generated content must be labelled'],
      ['Minimal risk: no new duties', 'Everyday low-stakes uses', 'Spam filters, AI in video games, writing help']]) +
    `<p><b>Timeline (as of late 2026):</b></p>` +
    H.table(['Date', 'What applies'], [
      ['1 Aug 2024', 'Law enters into force'],
      ['2 Feb 2025', 'Bans on unacceptable practices; duty for organisations to ensure staff have enough "AI literacy"'],
      ['2 Aug 2025', 'Rules for makers of general-purpose AI models (the big models behind chatbots)'],
      ['2 Aug 2026', 'Transparency duties and most remaining rules, including enforcement'],
      ['2 Dec 2027', 'High-risk duties for uses like hiring, credit and education (moved from August 2026 by a 2026 amendment, the "Digital Omnibus")'],
      ['2 Aug 2028', 'High-risk duties for AI built into regulated products such as medical devices (also moved by that amendment)']]) +
    `<p><b>Fines</b> can reach €35 million or 7% of worldwide yearly turnover for banned practices, with lower caps for other breaches.</p><p><b>Elsewhere:</b> the <b>US</b> has no single federal AI law; existing laws on discrimination, consumer protection and privacy still apply, plus state and city laws (for example NYC's bias-audit rule for hiring tools and state laws on deepfakes). <b>China</b> has rules for generative AI services and required labels on AI-generated content from September 2025. <b>South Korea</b>'s AI Basic Act took effect in January 2026. The <b>UK</b> has so far relied on existing regulators rather than one AI law. Rules are changing quickly; check the current position for your country.</p><p><i>This is general education, not legal advice. For decisions about your organisation, ask a qualified lawyer.</i></p>`,
  clues: ['AI used in hiring, lending, education, health or public services', 'Selling or using AI with customers in the EU', '"Do we need to tell users they are talking to a bot?"', 'Emotion detection on employees or students', 'Generating realistic images or video of people'],
  viz: rowsViz('Classify AI uses under the EU AI Act (simplified)', 'Use: what it does; ... (2-8 items)',
    'Spam filter: sorts junk email; CV screener: ranks job applicants; Website chatbot: answers customer questions; Social score: rates citizens behaviour for benefits; Emotion camera: tracks employee emotions at work; Loan model: scores credit applications',
    ['Use', 'What it does', 'Likely risk level'],
    'Classify by <b>what the AI is used for</b>. This simplified check uses keywords; real classification needs the legal text and expert advice.',
    function (r) {
      var t = r[1];
      if (has(t, ['social score', 'rates citizens', 'emotion', 'manipulat', 'scrap'])) return ['Banned', 'bad', 'this matches a prohibited practice (in force since February 2025).'];
      if (has(t, ['applicant', 'hiring', 'credit', 'loan', 'exam', 'student', 'benefit', 'medical'])) return ['High-risk', 'cur', 'affects someone\'s job, money, education or health: strict duties (risk management, human oversight, documentation).'];
      if (has(t, ['chatbot', 'customer questions', 'deepfake', 'generates images', 'talk'])) return ['Transparency', 'win', 'people must be told they are dealing with AI or AI-made content.'];
      return ['Minimal', 'ok', 'low stakes: no new duties, though good practice still applies.'];
    },
    '<p>Same technology, different risk: a chatbot answering shop questions is a transparency case; the same chatbot deciding loan approvals would be high-risk.</p>'),
  examples: [
    { title: 'Same tool, different risk', html: `<p>An AI that summarises documents is minimal risk for summarising news, but if it is used to rank which students get a scholarship, the <i>use</i> becomes high-risk.</p>` },
    { title: 'AI literacy duty', html: `<p>Since February 2025, organisations that provide or use AI systems in the EU must take steps so their staff understand the AI they work with well enough. A short, role-based training like this module is the kind of thing that helps.</p>` },
    { title: 'Non-EU company', html: `<p>A US company sells an AI hiring tool to a German employer. The Act can apply to the US company too, because the tool is used in the EU.</p>` }
  ],
  deepDive: `<p><b>Who has duties:</b> the Act separates <b>providers</b> (who make or sell an AI system) from <b>deployers</b> (organisations that use it). Deployers of high-risk systems must, for example, use them as instructed, assign human oversight and keep logs. Most office workers are on the deployer side.</p><p><b>Why dates moved:</b> standards and guidance for high-risk systems were not ready in time, so in 2026 the EU adopted an amendment (often called the Digital Omnibus on AI) that pushed the high-risk dates back. Bans, AI literacy, general-purpose model rules and the transparency duties kept their original timing (with a short extra period, to December 2026, for labelling by tools already on the market). Further changes are possible, which is why you should check the official EU sources.</p><p><b>Other frameworks:</b> voluntary guides such as the US NIST AI Risk Management Framework and the ISO/IEC 42001 management standard help companies organise AI governance.</p>`,
  aiEra: `<p><b>What it means for you:</b> before your team adopts an AI tool, ask "what is it used for, and does it affect people's jobs, money, education, health or rights?" If yes, involve legal and compliance early. Make sure customers know when they are talking to a bot. Label AI-generated media of people.</p><p>ai17 covers regulation from an engineer's and career angle; this topic is the version you can explain to any colleague in two minutes.</p>`,
  problems: [SP('Classify Four Use Cases Under the EU AI Act', 'Medium', ['eu ai act', 'risk levels'],
    `<p>A company operating in the EU plans four AI uses: (a) a tool that drafts marketing emails; (b) a chatbot on the website answering product questions; (c) software ranking candidates for promotion; (d) a camera system that reads employees' facial expressions to measure their mood. Classify each into a risk level and give the main consequence.</p>`,
    `<p>Use the four levels: banned, high-risk, transparency, minimal. Not legal advice; give your reasoning.</p>`,
    `<p>(b) Transparency: people must be told they are chatting with an AI.</p>`,
    `<p>"All four are AI, so all four are high-risk." The Act depends on the use, and one of these is actually banned.</p>`,
    mq('Which of the four is a banned practice?', ['Reading employees\' emotions at work', 'Drafting marketing emails', 'The product chatbot', 'Ranking candidates for promotion'], 0, 'Emotion recognition in the workplace is prohibited (with narrow medical or safety exceptions) since February 2025.'),
    ['Hint 1: ask what each one decides or affects.', 'Hint 2: work decisions about people are high-risk; emotion recognition at work is on the banned list.', 'Hint 3: chatting with customers triggers a "tell them it is AI" duty.'],
    `<p>(a) <b>Minimal risk</b>: no new legal duties; still check facts, and label AI content where required (e.g. realistic media). (b) <b>Transparency</b>: users must be told they are talking to AI (from August 2026). (c) <b>High-risk</b>: AI used for decisions on promotion is listed as high-risk; duties for deployers include human oversight, using it as instructed, keeping logs and informing workers, applying from December 2027 after the 2026 amendment; plan now. (d) <b>Banned</b>: emotion recognition in the workplace is prohibited (narrow medical/safety exceptions); drop the plan. Confirm with legal counsel because details and dates can change.</p>`,
    ['What would change if (c) only suggested training courses?'])]
});

// ---------- TOPIC 7: Policies and disclosure ----------
topics.push({
  title: 'Company AI Policies and Disclosing AI Use',
  analogy: `<p>A company AI policy is like the rules for using the company car: which cars you may take, where you may drive, what you must never carry, and who to call after a scrape. Disclosure is like the "student driver" sign: it tells people what to expect so nobody is misled.</p>`,
  explain: `<p><b>The plain idea:</b> an <b>AI policy</b> is a short set of rules from your organisation saying which AI tools you may use, for what, with what data, and who checks the result. <b>Disclosure</b> means telling people when AI played a meaningful role in something they receive.</p>` +
    H.table(['A good policy answers', 'Example rule'], [
      ['Which tools?', 'Only tools on the approved list, used with your work account'],
      ['Which data?', 'No customer personal data, secrets or confidential client material, except in approved tools for approved tasks'],
      ['Which uses are off-limits?', 'No final decisions about people (hiring, firing, grades) by AI alone'],
      ['Who checks?', 'A named human reviews anything sent outside the team'],
      ['When to disclose?', 'To clients and the public when AI produced substantial content, and always for AI images or voices of real people'],
      ['What if something goes wrong?', 'Report leaks or harmful outputs to a named contact quickly, without blame']]) +
    `<p><b>When to disclose:</b> always when a law or a client contract requires it (EU chatbot and deepfake rules, some publishers, courts and universities); whenever a reasonable person would feel misled if they found out later; and in academic and journalistic work where authorship matters. Using AI to fix spelling usually needs no label; a report largely drafted by AI, or an image of a person, usually does.</p><p><b>How to disclose:</b> short, honest and specific: what AI did and what humans did. Example: "This summary was drafted with an AI tool and reviewed and edited by our analyst team."</p>`,
  clues: ['"Are we allowed to use ChatGPT for this?"', 'Client deliverables, published articles, school or job applications', 'Customer-facing chatbots', 'No written rules, so everyone guesses', 'Staff using personal accounts for work ("shadow AI")'],
  viz: rowsViz('Does this need an AI disclosure?', 'Output: how AI was used; ... (2-8 items)',
    'Internal email: AI fixed grammar; Client report: AI drafted most sections; Website chat: AI answers customers; Ad campaign: AI image of a realistic person; Brainstorm notes: AI suggested ideas',
    ['Output', 'How AI was used', 'Disclose?'],
    'Ask: is it leaving the team, did AI make a substantial part, and could anyone be misled?',
    function (r) {
      var t = r[1];
      if (has(t, ['answers customers', 'chatbot', 'realistic person', 'voice', 'image of', 'video'])) return ['Yes, required', 'bad', 'people interact with AI or see AI-made media of people: clearly tell them (and in the EU this is a legal duty).'];
      if (has(t, ['drafted most', 'wrote', 'generated'])) return ['Yes, usually', 'cur', 'AI made a substantial part of something others rely on: disclose and say how humans reviewed it.'];
      return ['Usually not', 'ok', 'minor help on internal or early-stage work: a label is normally not needed, unless your policy says otherwise.'];
    },
    '<p>When unsure, disclose. Honesty costs little; being found out later costs trust.</p>'),
  examples: [
    { title: 'A one-page policy', html: `<p>(1) Use approved tools only. (2) Never paste secrets or personal data. (3) You own what you send: check facts, numbers and quotes. (4) No AI-only decisions about people. (5) Disclose AI use in client and public work. (6) Report problems to the named contact. Short policies are read; long ones are not.</p>` },
    { title: 'Shadow AI', html: `<p>If the official tool is slow or blocked, people quietly use personal accounts, which is worse for data. Good policies give people an approved tool that works, not just a list of bans.</p>` },
    { title: 'Disclosure wording', html: `<p>Weak: "Made with AI." Better: "Images in this brochure were created with an AI tool from our designer's briefs and then edited by our design team. Product photos are real."</p>` }
  ],
  deepDive: `<p><b>Why policies fail:</b> they are written once and never updated, ban everything (driving use underground), or are vague ("use AI responsibly"). Better: concrete examples of allowed and forbidden uses, a simple data traffic light, an owner, and a review date.</p><p><b>Sector rules:</b> courts in several countries require lawyers to disclose or verify AI-assisted filings; many universities and journals have AI-use rules; advertising standards bodies expect that AI imagery does not mislead. Your policy should point to the ones that affect your work.</p><p><b>Disclosure is not a shield:</b> labelling something "AI-generated" does not excuse errors, bias or infringement in it.</p>`,
  aiEra: `<p><b>Make it practical:</b> pair the policy with short training (which also helps meet the EU's AI literacy duty), a list of approved tools and approved uses, ready-made disclosure sentences, and a friendly contact person. Review it every few months, because tools and rules change fast.</p>`,
  problems: [SP('Write an AI Disclosure for a Client Report', 'Easy', ['disclosure', 'policy'],
    `<p>Your consultancy used an AI tool to draft the first version of a 20-page market report, then analysts checked every number against sources and rewrote the conclusions. The charts were made by hand. Write a disclosure of two or three sentences for the client.</p>`,
    `<p>Honest, specific, short, no jargon.</p>`,
    `<p>It should say what AI did, what people did, and who is accountable.</p>`,
    `<p>Say nothing, because "the analysts checked it". If the client's contract or policy requires disclosure, or they later find out, trust is damaged.</p>`,
    mq('What makes a disclosure useful?', ['It says what AI did and what humans checked', 'It is as long as possible', 'It names the AI model version only', 'It blames the AI for any errors'], 0, 'Readers need to know the role of AI and that people are accountable for the result.'),
    ['Hint 1: three parts: AI role, human role, accountability.', 'Hint 2: be specific about which parts were human-only (the charts).', 'Hint 3: avoid both hiding it and over-dramatising it.'],
    `<p>Model disclosure: "An AI writing tool was used to produce an early draft of the text in this report. Our analysts verified every figure against the cited sources, rewrote the conclusions and prepared all charts themselves. [Firm name] is fully responsible for the contents." Also check the client contract for specific AI clauses and confirm no client confidential data was put into a non-approved tool.</p>`,
    ['How would the wording change for a public blog post?'])]
});

// ---------- TOPIC 8: Environment + checklist ----------
topics.push({
  title: 'Environmental Cost and a Responsible-Use Checklist',
  analogy: `<p>Each AI request is like switching on a light for a few seconds: tiny alone, but billions of switches add up to a power station. And a responsible-use checklist is like a pilot's pre-flight checklist: experts still use it, because it catches the obvious thing everyone forgot.</p>`,
  explain: `<p><b>Environmental cost in plain words:</b> AI runs in <b>data centres</b>, large buildings full of computers that use electricity and often water for cooling. Training a large model uses a lot of energy once; answering billions of questions uses energy continuously.</p>` +
    H.table(['Figure', 'Source'], [
      ['Data centres used about 415 TWh of electricity in 2024, around 1.5% of the world\'s electricity, projected to roughly double to about 945 TWh by 2030, with AI the biggest driver', 'International Energy Agency, <i>Energy and AI</i> (2025)'],
      ['A typical (median) Gemini text prompt used about 0.24 watt-hours of energy and about 0.26 millilitres of water (about five drops) by Google\'s own measurement', 'Google, August 2025; covers text prompts only, excludes training'],
      ['Images, video and long "thinking" or agent tasks use much more than a short text answer', 'Widely reported; exact amounts vary by provider and are often not published']]) +
    `<p>So a single short question is small (roughly like a few seconds of a TV), but total demand is growing fast, and it can strain local power grids and water supplies near data centres. Reasonable habits: use AI where it helps, prefer smaller or faster models for simple tasks, avoid generating dozens of images or videos you will not use, and ask vendors for their energy and emissions reporting.</p><p><b>The team responsible-use checklist</b> (brings the whole module together):</p><ol><li><b>Purpose:</b> what is it for, and who could be harmed?</li><li><b>Data:</b> what goes in? Approved tool only, no secrets or unnecessary personal data.</li><li><b>Accuracy:</b> who checks facts, numbers and quotes before use?</li><li><b>Fairness:</b> does it affect people? Test across groups; keep a human decision-maker and an appeal path.</li><li><b>Rights:</b> any copyright, likeness or contract issues?</li><li><b>Rules:</b> which laws apply (EU AI Act level, privacy, sector rules)? Ask legal when unsure.</li><li><b>Transparency:</b> do people know AI is involved?</li><li><b>Security:</b> how would we detect fraud or misuse, and who is the incident contact?</li><li><b>Cost and footprint:</b> is AI the right tool, and the right size of tool?</li><li><b>Review:</b> who owns it, and when do we check it again?</li></ol>`,
  clues: ['"Let\'s add AI to everything"', 'Generating large volumes of images or video', 'Sustainability or ESG reporting questions', 'A new AI project with no named owner', '"We will figure out the risks after launch"'],
  viz: rowsViz('Run the team checklist on a planned AI use', 'Check: your answer; ... (2-8 items)',
    'Purpose: summarise support tickets weekly; Data: customer names included, free tool; Accuracy: team lead reviews summary; Fairness: does not decide about people; Transparency: internal only; Review: no owner yet',
    ['Check', 'Answer', 'Status'],
    'Go through the checklist one line at a time. A single red line is enough to pause the launch.',
    function (r) {
      var t = r[1];
      if (has(t, ['free tool', 'personal account', 'no owner', 'nobody', 'not checked', 'unknown', 'none'])) return ['Fix first', 'bad', 'a gap that could cause harm. Fix it before launch.'];
      if (has(t, ['yet', 'maybe', 'later', 'not sure'])) return ['Check', 'cur', 'not settled yet. Decide and write it down.'];
      return ['OK', 'ok', 'answered clearly.'];
    },
    '<p>Fix the red lines (for example: switch to the approved tool and remove names; name an owner), then launch with a review date.</p>'),
  examples: [
    { title: 'Right-sizing', html: `<p>A team uses the largest "thinking" model to fix spelling in emails. A smaller, faster model (or the spellchecker) does the job with less cost and energy. Match the tool to the task.</p>` },
    { title: 'Checklist on a real plan', html: `<p>Plan: AI writes product descriptions for 5,000 items. Checklist finds: accuracy (who checks sizes and materials?), rights (no copying competitor text), transparency (none needed for plain descriptions under most rules), review (sample 5% weekly). Launch with those fixes.</p>` },
    { title: 'Asking vendors', html: `<p>"Where are your data centres? Do you publish energy, emissions and water figures? Do you offer smaller models?" Some vendors publish this; when they do not, that is useful information too.</p>` }
  ],
  deepDive: `<p><b>Why numbers vary so much:</b> energy per request depends on the model size, the length of the answer, the hardware, how full the data centre is, and how electricity is produced locally. Company figures may count different things (for example, including or excluding training). Compare carefully and prefer published methods.</p><p><b>Bigger picture:</b> AI can also help the environment (better grid planning, materials research), and the IEA notes uncertainty in its own forecasts. The honest summary: individual use is small, total growth is significant, and choices by companies and governments matter most.</p><p><b>Checklists are living documents:</b> rerun them when the tool, the data, the users or the law changes.</p>`,
  aiEra: `<p><b>Turning the checklist into a habit:</b> put it in your project template, make a named owner responsible, and keep a one-line record of each answer. That record helps if a client, auditor or regulator later asks how you decided, and it is often the simplest way to show the "AI literacy" and care that new rules expect.</p>`,
  problems: [SP('Run the Responsible-Use Checklist on a Plan', 'Medium', ['checklist', 'governance'],
    `<p>A school office plans to use a free chatbot to write personalised emails to parents about each student's attendance and behaviour, by pasting in the student's record. Run the ten-point checklist and give your recommendation.</p>`,
    `<p>Point out at least four problems and say how to fix each.</p>`,
    `<p>Data problem: student records are personal data about children, pasted into a free, unapproved tool.</p>`,
    `<p>"It saves time, so just try it." Speed does not outweigh children's privacy or wrong statements sent to parents.</p>`,
    mq('What should change first?', ['Stop pasting student records into a free chatbot', 'Make the emails longer', 'Use a different font', 'Send them at night'], 0, 'Children\'s personal data needs the strongest care; use an approved, contracted tool and minimal data, or do not use AI for this.'),
    ['Hint 1: start with the data line of the checklist.', 'Hint 2: who checks each email before it reaches a parent?', 'Hint 3: think about fairness in how behaviour is described.'],
    `<p><b>Purpose:</b> fine in principle. <b>Data:</b> fails; student records are children's personal data; use only an approved tool under a proper agreement, and send only what is needed (e.g. attendance figures without full records), or use templates without AI. <b>Accuracy:</b> a staff member must check every email. <b>Fairness:</b> AI wording about behaviour could be harsher for some students; use agreed neutral templates and review. <b>Transparency:</b> parents should know if AI drafts these messages, per school policy. <b>Rules:</b> privacy law (e.g. GDPR in Europe) applies; ask the data-protection lead. <b>Review:</b> name an owner and review after one term. <b>Recommendation:</b> do not launch as planned; pilot with an approved tool, minimal data, templates and human sign-off.</p>`,
    ['What would make you comfortable approving the pilot?'])]
});

// ---------- PRACTICE ARENA ----------
function PP() { practice.push(SP.apply(null, arguments)); }

PP('Paste or Not? Five Quick Decisions', 'Easy', ['privacy'],
  `<p>For each, decide "fine in any tool", "approved tool only, after editing", or "never": (1) a public press release; (2) a customer complaint with name and phone; (3) the Wi-Fi admin password; (4) next quarter's unannounced price list; (5) a made-up example sentence.</p>`,
  `<p>One decision and one reason per item.</p>`,
  `<p>(3) Never: passwords are secrets and must never go into an AI tool.</p>`,
  `<p>"Everything is fine if I delete the chat afterwards." Deleting does not guarantee every copy is gone.</p>`,
  mq('Which item is "never"?', ['The admin password', 'The press release', 'The made-up sentence', 'None of them'], 0, 'Secrets such as passwords and keys never go into AI tools.'),
  ['Hint 1: public and made-up content is low risk.', 'Hint 2: personal and unreleased business data needs the approved tool and editing.', 'Hint 3: secrets such as passwords and keys are always a no.'],
  `<p>(1) Fine in any tool: it is already public. (2) Approved tool only, after removing the name and phone; the AI only needs the complaint itself. (3) Never: a password is a secret; if it was pasted anywhere, change it. (4) Approved tool only, and only if your policy allows confidential plans there; otherwise do not. (5) Fine anywhere: invented examples contain no real data. The rule: look at what the text contains, not where it came from.</p>`,
  ['What would you do if you realise you pasted item 3 yesterday?']);

PP('Is This Quote Real?', 'Easy', ['hallucination'],
  `<p>A chatbot gives you a powerful quote "from Marie Curie" for your presentation, with no source. Describe how you would check it in under five minutes, and what you do if you cannot confirm it.</p>`,
  `<p>No special tools; normal web search is fine.</p>`,
  `<p>Search the exact words in quotation marks and look for a reliable original source, not quote websites copying each other.</p>`,
  `<p>Use it because it "sounds like her". Misattributed quotes are very common, and AI can invent them.</p>`,
  mq('What counts as good confirmation?', ['The quote in her own writings or a reliable biography with a citation', 'Five quote websites listing it', 'The chatbot saying it is sure', 'It sounds like her style'], 0, 'Quote sites often copy each other; you need an original or a carefully cited source.'),
  ['Hint 1: search the exact phrase in quotation marks.', 'Hint 2: look for the original book, letter or speech.', 'Hint 3: if not confirmed, rephrase as your own words.'],
  `<p>Search the exact phrase in quotation marks; ignore quote-collection websites; look for the original (her writings, a reliable biography or a reference library page with a citation). Ask the chatbot "which document and page is this from?" and check that document. If you cannot confirm it within a few minutes, do not attribute it: rewrite the idea in your own words or pick a quote you can verify. Never cite "ChatGPT" as the source of a quote.</p>`,
  ['Why do invented quotes often attach to famous names?']);

PP('Label the Chatbot', 'Easy', ['disclosure', 'transparency'],
  `<p>Your online shop (selling in the EU) is launching an AI chat assistant called "Sam". Write the first message Sam shows customers, and say why.</p>`,
  `<p>One or two sentences for the message, one for the reason.</p>`,
  `<p>The message must make clear Sam is an AI, not a person.</p>`,
  `<p>"Hi, I'm Sam from customer care!" with no mention of AI. Customers may think they are talking to a person.</p>`,
  mq('Why must Sam say it is an AI?', ['EU transparency rules require people to be told they are interacting with AI', 'It is shorter', 'To avoid customer questions', 'It is optional good manners only'], 0, 'The EU AI Act\'s transparency duties apply from August 2026 to chatbots interacting with people.'),
  ['Hint 1: who does the customer think they are talking to?', 'Hint 2: offer customers an easy way to reach a human person.', 'Hint 3: keep the message friendly, short and honest.'],
  `<p>Message: "Hi, I'm Sam, an AI assistant. I can help with orders, sizes and returns. I can make mistakes, so for anything important or if you'd like a person, type 'human' and our team will help." <b>Why:</b> under the EU AI Act's transparency duties, people must be told they are interacting with an AI unless it is obvious; it also builds trust and gives an easy route to a human for complaints or mistakes.</p>`,
  ['Where else should the AI label appear?']);

PP('Spot the Risks in an HR Plan', 'Medium', ['bias', 'privacy', 'eu ai act'],
  `<p>An HR team in Spain plans to upload all staff performance reviews into a chatbot and ask it "which 10% of employees should we let go?" List every risk you can find (aim for five) and suggest a safer alternative.</p>`,
  `<p>Cover privacy, fairness, accuracy, law and process.</p>`,
  `<p>Risk: the AI would be making, or strongly steering, a decision about people's jobs, which is high-risk under the EU AI Act.</p>`,
  `<p>"The AI is neutral, so this is fairer than managers." AI can copy biases in the reviews and cannot explain itself reliably.</p>`,
  mq('Under the EU AI Act, AI used for decisions about ending employment is:', ['High-risk', 'Minimal risk', 'Banned', 'Not covered'], 0, 'Employment decisions such as promotion and termination are a listed high-risk area.'),
  ['Hint 1: whose data is uploaded, and to what tool?', 'Hint 2: reviews may already contain bias; what does the AI learn from them?', 'Hint 3: who is accountable for each decision?'],
  `<p><b>Risks:</b> (1) Privacy: all staff reviews are personal data; uploading them to a chatbot needs a lawful basis and an approved tool under GDPR. (2) Fairness: reviews can reflect manager bias (e.g. against part-time workers or people on leave); the AI can amplify it. (3) Accuracy: the AI may invent reasons or misread reviews. (4) Law: AI for termination decisions is high-risk under the EU AI Act, with oversight and worker-information duties; employment law and works councils also apply. (5) Accountability: "the AI chose" is not an acceptable reason for anyone losing their job. <b>Safer:</b> do not use AI to pick people; if at all, use an approved tool only to summarise anonymised trends, with HR and legal deciding through the normal fair process.</p>`,
  ['What could AI legitimately help HR with here?']);

PP('Copyright in Three Countries', 'Medium', ['copyright'],
  `<p>A freelance illustrator works for clients in the US, UK and China and makes images mostly with AI plus some hand editing. Explain in plain words how ownership of the output may differ, and what they should put in their contracts.</p>`,
  `<p>Do not claim certainty where the law is unsettled.</p>`,
  `<p>US: protection depends on human creative contribution; pure AI parts are not protected.</p>`,
  `<p>"I made it, so I own it everywhere." Ownership of AI-assisted work differs by country and is still being decided.</p>`,
  mq('Which statement is most accurate?', ['Rules on owning AI output differ by country and are still changing', 'AI output is owned by the AI company everywhere', 'AI output is always public domain everywhere', 'Paying for the tool guarantees copyright'], 0, 'The US, UK, China and EU take different approaches, and courts are still deciding cases.'),
  ['Hint 1: the US focuses on human authorship.', 'Hint 2: the UK has an untested "computer-generated works" rule; a Chinese court protected an AI image based on creative choices.', 'Hint 3: contracts should be honest about AI use and what rights can be promised.'],
  `<p><b>US:</b> only human-authored parts (hand edits, selection and arrangement) are likely protected; purely AI-generated parts probably are not. <b>UK:</b> an old rule protects "computer-generated works" for the person who made the arrangements, but how it applies to modern AI is untested and under review. <b>China:</b> a Beijing court protected an AI image because of the user's creative choices; later cases may differ. <b>Contracts:</b> disclose AI use, describe the human work, avoid promising "exclusive copyright" in AI-heavy parts, confirm the client accepts this, keep records of the process, and get local legal advice for high-value work. General education, not legal advice.</p>`,
  ['How should the price or terms change for fully hand-made work?']);

PP('Respond to a Viral Clip', 'Medium', ['deepfake', 'misinformation'],
  `<p>A video showing your company's CEO insulting customers spreads on social media. The CEO says it never happened. As the communications lead, outline your first six steps.</p>`,
  `<p>Balance speed with accuracy; do not assume either way without checking.</p>`,
  `<p>Step: preserve copies and find where it was first posted.</p>`,
  `<p>Instantly post "this is a deepfake" before checking. If it turns out to be real or partly real, trust collapses.</p>`,
  mq('Why verify before declaring it fake?', ['Real clips are sometimes falsely called deepfakes, and being wrong destroys trust', 'Verification is legally required within one hour', 'Deepfakes are always obvious', 'It does not matter'], 0, 'The "liar\'s dividend" works both ways: accuracy is what keeps credibility.'),
  ['Hint 1: collect evidence and the original source.', 'Hint 2: involve experts and check the CEO\'s known schedule.', 'Hint 3: report to platforms and communicate honestly.'],
  `<p>(1) Save copies, links and timestamps; find the earliest post. (2) Check facts: where was the CEO at that time, is there original footage, does the background match? (3) Bring in a specialist or forensic service and legal. (4) Post a holding statement: "We are aware of a video and are urgently checking it; we will update shortly." (5) If confirmed fake, publish evidence, report it to platforms for removal, and consider police or legal action; if real, apologise and act. (6) Brief staff and customer-service teams with approved wording, and review the response afterwards.</p>`,
  ['How would content credentials on official videos help in future?']);

PP('Draft a One-Page Team AI Policy', 'Medium', ['policy'],
  `<p>Your 15-person marketing team has no AI rules and people use various free tools. Write a one-page policy outline with six rules.</p>`,
  `<p>Concrete, short, practical. Include an owner and a review date.</p>`,
  `<p>Rule: use only approved tools with work accounts.</p>`,
  `<p>"Use AI responsibly." Too vague: nobody knows what is allowed.</p>`,
  mq('Why give people an approved tool rather than only bans?', ['Bans alone push people to hidden personal accounts ("shadow AI")', 'Approved tools never make mistakes', 'Bans are illegal', 'To save electricity'], 0, 'People use AI anyway; an approved option keeps data safer.'),
  ['Hint 1: tools, data, checking, people decisions, disclosure, incidents.', 'Hint 2: make each rule concrete enough to be testable.', 'Hint 3: name an owner and a review date.'],
  `<p><b>1. Tools:</b> use only [approved tool], with your work account. <b>2. Data:</b> never paste passwords, customer personal data or unreleased plans outside it; remove names when possible. <b>3. Checking:</b> you are responsible for everything you publish; check facts, figures, quotes and links. <b>4. Rights:</b> no prompts copying named artists, brands or competitor text; AI images of real people need consent and a label. <b>5. Disclosure:</b> follow our disclosure wording for client and public work, and label AI chat and realistic AI media. <b>6. Problems:</b> report leaks, harmful outputs or suspected deepfake fraud to [owner] the same day; no blame for honest reports. <b>Owner:</b> marketing ops lead. <b>Review:</b> every six months, with a short training for all staff.</p>`,
  ['How would you check whether people actually follow it?']);

PP('Is AI the Right Tool? (Cost and Footprint)', 'Medium', ['environment'],
  `<p>A team plans to generate 50 AI images for every social post to "pick the best one", 20 posts a week, using the largest model. Discuss the environmental and practical cost, and suggest a better approach.</p>`,
  `<p>No exact energy numbers required; reason in plain terms.</p>`,
  `<p>1,000 images a week, most thrown away; image generation uses far more energy than a short text answer.</p>`,
  `<p>"One image is tiny, so it doesn't matter." Volume is what adds up.</p>`,
  mq('What reduces footprint most here?', ['Generating far fewer images with a clearer brief', 'Using a dark-mode screen', 'Posting less text', 'Changing the file name'], 0, 'Most of the cost comes from generating and discarding many images.'),
  ['Hint 1: count the total images generated per week.', 'Hint 2: what share of those images are simply thrown away?', 'Hint 3: better briefs and smaller models reduce waste.'],
  `<p>That is 1,000 images a week, about 980 discarded. Image generation uses much more energy than short text answers, so waste adds up, along with cost and review time. Better: write a clear brief (style, colours, subject) and generate 3-5 options; reuse templates and real photos where possible; use a smaller or faster model for drafts; and ask the vendor for its energy and emissions reporting. Track the time saved to check whether the AI step is worth it at all.</p>`,
  ['How would you explain this trade-off to a manager focused on speed?']);

PP('Classify Eight Use Cases Under the EU AI Act', 'Hard', ['eu ai act'],
  `<p>Classify each (banned, high-risk, transparency, minimal): (1) a game with AI enemies; (2) an exam-proctoring AI that flags cheating and affects grades; (3) a tool scoring people on social behaviour for access to public housing; (4) an AI voice reading the news on a website; (5) a bank's credit-scoring AI; (6) an email spam filter; (7) an app that scrapes social media photos to build a face database; (8) an AI writing assistant for staff.</p>`,
  `<p>Simplified exercise; say where it depends on details. Not legal advice.</p>`,
  `<p>(5) High-risk: credit scoring of individuals is a listed high-risk use.</p>`,
  `<p>Classify by how advanced the technology seems. The Act classifies by use and its impact on people.</p>`,
  mq('Which pair is banned?', ['(3) social scoring and (7) untargeted face scraping', '(1) and (6)', '(4) and (8)', '(2) and (5)'], 0, 'Social scoring and building face databases by untargeted scraping are prohibited practices.'),
  ['Hint 1: find the two clearly banned practices first.', 'Hint 2: education and credit decisions are high-risk.', 'Hint 3: synthetic voice content needs a label.'],
  `<p>(1) Minimal. (2) High-risk: AI used to evaluate students or detect cheating in exams is in the education category. (3) Banned: social scoring. (4) Transparency: AI-generated audio must be disclosed (texts on public-interest matters have specific rules too, with exceptions for human-edited content). (5) High-risk: creditworthiness of people (fraud-detection uses are treated differently). (6) Minimal. (7) Banned: untargeted scraping of facial images to build recognition databases. (8) Minimal, though if it generates content published to the public, labelling duties may apply. Dates: bans since Feb 2025, transparency from Aug 2026, these high-risk duties from Dec 2027 after the 2026 amendment.</p>`,
  ['Which details could move (8) into another category?']);

PP('Full Risk Review of a Customer Chatbot', 'Hard', ['checklist', 'hallucination', 'privacy'],
  `<p>An online pharmacy in Germany wants a chatbot that answers questions about medicines, orders and delivery, using customers' order history. Run the full ten-point checklist and decide: launch, launch with changes, or do not launch.</p>`,
  `<p>Address every checklist line. Think about health information and what happens when the bot is wrong.</p>`,
  `<p>Biggest risk: wrong medicine advice (a hallucination) could hurt someone; the Air Canada case shows the company is responsible for its bot.</p>`,
  `<p>"Add a disclaimer that answers may be wrong." Disclaimers do not stop harm or remove the company's responsibility.</p>`,
  mq('Which change matters most?', ['Limit the bot to orders and delivery, and route medicine questions to a pharmacist', 'Make the bot friendlier', 'Add more emojis', 'Answer faster'], 0, 'Reducing scope removes the most dangerous kind of error.'),
  ['Hint 1: separate low-stakes questions (delivery) from high-stakes ones (dosage).', 'Hint 2: order history reveals health information: special-category data under GDPR.', 'Hint 3: think about labels, human handover, logging and an owner.'],
  `<p><b>Purpose:</b> fine for orders and delivery; medical advice is high-stakes. <b>Data:</b> order history reveals health data, a special category under GDPR; minimise it, use a contracted provider, involve the data-protection officer. <b>Accuracy:</b> no free-form medicine advice; route those to a pharmacist; answer only from approved information. <b>Fairness:</b> test in the languages customers use. <b>Rights:</b> use licensed medicine information. <b>Rules:</b> GDPR, health and pharmacy rules, EU AI Act transparency. <b>Transparency:</b> say it is an AI and offer a human. <b>Security:</b> verify identity before showing orders; monitor misuse. <b>Footprint:</b> a modest model suffices. <b>Review:</b> named owner, sample conversations weekly. <b>Decision:</b> launch with changes: orders and delivery only at first.</p>`,
  ['What evidence would you need before allowing medicine questions?']);

PP('Design a Deepfake-Resistant Payment Process', 'Hard', ['deepfake', 'process'],
  `<p>A mid-size company's finance team handles about 200 payments a week. After hearing about the Arup case, the CFO asks you to redesign the process so a convincing fake video or voice call cannot trigger a payment. Describe the process and how you would roll it out.</p>`,
  `<p>Must still allow genuinely urgent payments.</p>`,
  `<p>Core: no payment is approved based only on a call, video or email; changes to bank details are verified through a separate known channel.</p>`,
  `<p>"Train people to spot fake videos." Detection by eye is unreliable; process must not depend on it.</p>`,
  mq('What is the design principle?', ['Never let a single channel or person authorise an unusual payment', 'Ban video calls', 'Only the CEO can approve payments', 'Use stronger passwords only'], 0, 'Independent verification plus separation of duties defeats impersonation.'),
  ['Hint 1: separate requesting, verifying and approving.', 'Hint 2: define what counts as "unusual" (new payee, changed bank details, urgency, amount).', 'Hint 3: give a fast but safe urgent path and practise it.'],
  `<p><b>Rules:</b> (1) Requests through the payment system only, never just by call, chat or video. (2) New payees or changed bank details: confirm by calling the supplier on a number from existing records, never from the request. (3) Two approvers above a threshold; the requester cannot approve. (4) "Urgent and confidential" triggers more checks, not fewer. (5) Urgent path: two named senior approvers verify with each other via known numbers; target under an hour. <b>Rollout:</b> leadership states publicly they will never bypass it; short training with real cases; a test call each quarter; easy reporting; review after three months.</p>`,
  ['How do you handle a senior leader who insists on bypassing the process?']);

PP('Write an AI Use Statement for a Public Report', 'Hard', ['disclosure', 'copyright', 'hallucination'],
  `<p>A charity is publishing a 40-page public report. AI was used to (a) transcribe and summarise 60 interviews, (b) translate quotes from Spanish, (c) draft the executive summary, and (d) create two illustrations. Write the AI use statement and list checks needed before publishing.</p>`,
  `<p>Statement 80-150 words; checks as a list.</p>`,
  `<p>Disclose each use and the human check for each.</p>`,
  `<p>"AI tools were used in preparing this report." Too vague to be meaningful.</p>`,
  mq('Which check protects the people interviewed most?', ['Interviewees consented to AI processing and quotes are checked against recordings', 'Using larger fonts', 'Adding more illustrations', 'Publishing faster'], 0, 'Consent and accurate quoting protect participants\' privacy and words.'),
  ['Hint 1: one line per AI use, with the human check.', 'Hint 2: consent and privacy for interview recordings.', 'Hint 3: illustrations: rights and labels.'],
  `<p><b>Statement:</b> "We used AI tools in four ways. Interview recordings were transcribed and summarised with an approved AI tool; staff checked every quote against the recordings. Spanish quotes were machine-translated and reviewed by a native speaker. The executive summary was drafted with AI and rewritten by the authors, who verified all figures. The two illustrations on pages 5 and 18 were generated with AI and edited by our designer; they do not depict real people. The authors are responsible for the content." <b>Checks:</b> interviewee consent; approved tool and data handling; quotes against recordings; translation reviewed; figures traced to sources; illustrations reviewed for resemblance to real people or others' work; final human sign-off.</p>`,
  ['Would you disclose AI spellchecking too? Why or why not?']);

// ---------- QUIZ ----------
function Q(q, o, a, e) { quiz.push({ q: q, options: o, answer: a, explain: e }); }
Q('What is an AI "hallucination"?', ['A confident but false statement made by an AI tool', 'An AI that stops responding', 'A picture made by AI', 'A virus in the AI'], 0, 'Chatbots predict likely-sounding text, so they can state false things fluently.');
Q('In <i>Mata v. Avianca</i> (2023), what went wrong?', ['Lawyers filed a brief citing court cases invented by ChatGPT', 'An airline chatbot sold free tickets', 'A deepfake judge appeared in court', 'A court banned AI'], 0, 'The court sanctioned the lawyers $5,000 for submitting fake citations.');
Q('What did the Air Canada chatbot case (2024) establish in that tribunal?', ['The company was responsible for what its chatbot told a customer', 'Chatbots are legal persons', 'Customers must check every chatbot answer themselves', 'Airlines cannot use chatbots'], 0, 'The tribunal rejected the idea that the chatbot was separately responsible.');
Q('Why did Amazon\'s experimental CV-ranking tool show bias against women?', ['It learned from ten years of mostly male applications', 'Engineers programmed it to do so', 'Women submitted fewer CVs that year', 'It could not read PDFs'], 0, 'Bias in historical data was learned and repeated.');
Q('A simple "swap test" for bias means:', ['Asking the same thing with only a name or group changed and comparing answers', 'Swapping AI vendors', 'Switching the computer off and on', 'Changing the font'], 0, 'If only the name changed but the answer changed, that is a warning sign.');
Q('Which item should never be pasted into any AI chat tool?', ['A system password', 'A public press release', 'A made-up example', 'A general question about grammar'], 0, 'Secrets must never leave controlled systems; change a password if it was exposed.');
Q('Under the US approach as of 2026, a picture generated entirely by AI from a short prompt is:', ['Generally not protected by copyright', 'Owned by the AI company by law', 'Protected for 70 years', 'Automatically a trademark'], 0, 'US copyright requires human authorship; the Supreme Court declined to review <i>Thaler v. Perlmutter</i> in March 2026.');
Q('In the 2024 Arup fraud, what tricked the employee?', ['A video call where the executives were deepfakes', 'A fake website', 'A virus on the laptop', 'A forged paper cheque'], 0, 'About HK$200 million was transferred after a deepfake video meeting.');
Q('The best defence against a deepfake voice or video request for money is:', ['Verifying through a separate, known channel before acting', 'Looking closely for glitches', 'Asking the caller to repeat themselves', 'Acting fast to save time'], 0, 'The attacker controls the call, not your known phone directory.');
Q('Under the EU AI Act, emotion recognition of employees at work is:', ['Banned (with narrow medical or safety exceptions)', 'Minimal risk', 'Only a transparency case', 'Not covered'], 0, 'It is on the prohibited list, applying since 2 February 2025.');
Q('Under the EU AI Act, an AI that screens job applicants is classified as:', ['High-risk', 'Banned', 'Minimal risk', 'Exempt'], 0, 'Employment uses are listed as high-risk, with oversight and documentation duties.');
Q('After the 2026 amendment, when do high-risk duties for uses like hiring and credit apply?', ['2 December 2027', '1 August 2024', '2 February 2025', 'They were cancelled'], 0, 'The "Digital Omnibus" moved them from August 2026 to December 2027; bans and transparency kept their dates.');
Q('Which statement about AI\'s environmental cost is best supported?', ['One short text prompt is small, but total data-centre electricity demand is growing fast', 'AI uses no electricity', 'Each prompt uses as much energy as a car trip', 'Data centres use no water'], 0, 'Google measured about 0.24 Wh per median Gemini text prompt; the IEA projects data-centre demand roughly doubling by 2030.');
Q('A good AI disclosure says:', ['What AI did, what humans checked and who is responsible', 'Only "Made with AI"', 'Nothing, to avoid worry', 'The full prompt history'], 0, 'Specific, short and honest disclosures help readers judge the work.');

// ---------- INTERVIEW ----------
function I(q, level, a, f) { interview.push({ q: q, level: level, a: a, followUps: f }); }
I('Explain AI hallucinations to a colleague with no tech background.', 'B', `<p>A chatbot writes by predicting words that sound right, not by looking facts up, so sometimes it states something false in the same confident tone as something true: a fake statistic, quote or court case. It is not lying on purpose; it has no built-in sense of "I don't know". So I treat it like a fast, eager intern: great for drafts, but every fact, number and quote gets checked against an original source before it leaves the team. The higher the stakes, the more checking.</p>`, ['Give a real example.', 'How would you spot one quickly?']);
I('How would you decide what your team may paste into an AI tool?', 'B', `<p>I would use a simple traffic light. Green: public information and made-up examples, fine anywhere. Amber: internal or customer information, only in the company-approved tool, with names and identifiers removed. Red: passwords and keys, payment and ID numbers, health data and anything under an NDA, never. I would make sure an approved tool exists so people do not use personal accounts, and give people a contact for when they are unsure or make a mistake.</p>`, ['What if the approved tool is not good enough?', 'Why is deleting the chat not enough?']);
I('Give a real example of AI bias and what it teaches.', 'B', `<p>Amazon's experimental CV-ranking tool, reported by Reuters in 2018, learned from ten years of mostly male applicants and downgraded CVs mentioning "women's", for example a women's chess club. Amazon dropped it. The lesson is that AI learns from history, so if history was unfair, the AI repeats it at scale, and removing an obvious field like gender does not fix it because other details stand in for it. You need outcome testing across groups, human review and an appeal path.</p>`, ['What is a swap test?', 'Name another documented case.']);
I('Who owns content created with AI?', 'I', `<p>It depends on the country and is still changing, so I would avoid a definitive answer. In the US, copyright requires a human author: purely AI-generated material is generally not protected, but human creative choices like editing, selecting and arranging can be; the courts upheld this in <i>Thaler v. Perlmutter</i>. The UK has an older, untested rule for computer-generated works; a Chinese court protected an AI image based on the user's creative choices. Separately, lawsuits test whether training on copyrighted works was lawful. For important work, add real human creativity, keep records, read tool terms and ask legal.</p>`, ['What is the difference between copyright and trademark here?', 'What does "in the style of" risk?']);
I('Explain the EU AI Act in two minutes.', 'I', `<p>It is the EU's law on AI, in force since August 2024, and it sorts AI by use into risk levels. A few uses are banned, such as social scoring, harmful manipulation, emotion recognition at work or school, and scraping faces to build databases; those bans apply since February 2025. High-risk uses, like hiring, credit, education and medical devices, are allowed with duties such as risk management, human oversight and documentation; after a 2026 amendment they apply from December 2027, or August 2028 for AI inside regulated products. Chatbots and deepfakes have transparency duties from August 2026. Most everyday AI is minimal risk. Fines can reach €35 million or 7% of global turnover. It also applies to non-EU companies whose AI is used in the EU.</p>`, ['What is the AI literacy duty?', 'Provider vs deployer?']);
I('How would you protect a company from deepfake fraud?', 'I', `<p>I would not rely on people spotting fakes, because they keep improving; in the Arup case the faces looked real. Instead, process: no payment or data release based only on a call, video or email; changes to bank details verified on a known number; two approvers above a threshold; urgency and secrecy treated as reasons for more checks; a fast but safe urgent path; and leaders stating openly they will never ask anyone to bypass it. Plus short training with real cases and easy reporting.</p>`, ['How do you test the process?', 'What about deepfakes of the CEO on social media?']);
I('When should a team disclose AI use?', 'I', `<p>Always when law, a client contract or an institution requires it, for example EU chatbot and deepfake rules, courts, journals and universities. Also when AI made a substantial part of something others rely on, and whenever a reasonable reader would feel misled to find out later. Always for AI-generated images, voices or videos of real-looking people. Minor help like spelling usually needs no label. A good disclosure says what AI did, what humans checked and who is responsible; a label does not excuse errors.</p>`, ['Write a one-sentence disclosure.', 'Can disclosure be overdone?']);
I('What should a company AI policy contain?', 'I', `<p>Short and concrete: which tools are approved; a data traffic light of what may never be pasted; a rule that people own and check what they send; no AI-only decisions about people; disclosure rules with ready-made wording; rules on likeness and copyright; how to report problems without blame; a named owner and review date; and short training. It should give people a working approved tool, because bans alone push use into personal accounts.</p>`, ['How do you measure whether it works?', 'What is shadow AI?']);
I('How significant is AI\'s environmental impact?', 'I', `<p>Per request it is small: Google measured a median Gemini text prompt at about 0.24 watt-hours and 0.26 millilitres of water. But totals are large and growing: the International Energy Agency estimated data centres used about 415 TWh in 2024, about 1.5% of world electricity, and projected about 945 TWh by 2030, with AI the main driver. Images, video and long agent tasks use far more than short text. So I would right-size tools, avoid waste such as generating hundreds of discarded images, and ask vendors for their energy reporting.</p>`, ['Why do published figures vary so much?', 'Does AI help the environment too?']);
I('Walk me through a responsible-use checklist for a new AI project.', 'A', `<p>Ten questions: purpose and who could be harmed; data, using approved tools with no unnecessary personal data or secrets; accuracy and who checks; fairness, testing across groups with a human decision-maker and appeal path; rights such as copyright, likeness and contracts; rules such as EU AI Act level, privacy and sector law, involving legal when unsure; transparency to users; security and incident contact; cost and footprint, meaning whether AI is the right and right-sized tool; and review, with a named owner and a date. A single red line pauses launch until fixed. I write down each answer, which helps with audits and literacy duties.</p>`, ['Apply it to a support chatbot.', 'Who should sign off?']);
I('A manager wants AI to decide which employees get a bonus. What do you say?', 'A', `<p>I would push back on AI deciding, and offer a safer role. Bonus decisions affect people's pay, so bias and errors cause real harm; AI can copy bias in past reviews and cannot reliably explain itself. In the EU, AI used for decisions about workers is high-risk, with oversight and information duties, and employment and privacy law apply everywhere. A safer use: AI helps summarise each person's documented achievements in an approved tool, while managers decide using clear criteria, with calibration and an appeal process. I would involve HR and legal early.</p>`, ['What if the tool is only "advisory"?', 'How would you test it for fairness?']);
I('How do you stay current on AI rules when they keep changing?', 'A', `<p>I treat dates and rules as things to re-check, not memorise. I follow official sources first, such as the EU's AI Act pages and Official Journal, national regulators and data-protection authorities, plus a couple of reputable law-firm or news summaries, and I note the date I last checked. The EU AI Act already changed its high-risk dates by a 2026 amendment, and US state laws like Colorado's were rewritten before taking effect, so I would put a review date in our policy and ask legal for anything decision-critical. I would also be clear in conversations that I am giving general information, not legal advice.</p>`, ['Which source would you trust most?', 'How often should a policy be reviewed?']);

registerModule({
  id: 'ai36',
  title: 'AI for Everyone: AI Risks, Ethics & Regulation in Plain English',
  langExplain: `<p><b>About the code here.</b> This module has no programming code. It is written for people without a tech background: the problems are real-world scenarios (spot the risk, decide what may be shared, classify a use under the EU AI Act, write a disclosure), and the visualizers build simple tables you can edit with your own examples.</p>`,
  intro: `<p>AI tools are useful, and they also bring new risks: confident wrong answers, unfair treatment of some groups, leaked private data, unclear ownership, convincing fakes and new laws to follow. This module explains each one in plain English with real, documented cases, and gives you practical habits and a checklist your team can use the same day.</p><p>You will learn to spot hallucinations, run a simple bias check, decide what may be pasted into an AI tool, understand who owns AI output in different countries, defend against deepfake fraud, explain the EU AI Act's risk levels and dates, write AI disclosures and policies, and weigh AI's environmental cost. <i>This is general education, not legal advice; laws differ by country and are changing, so check current official sources and ask a qualified lawyer for decisions.</i></p>`,
  goals: [
    'Spot likely hallucinations and check AI claims against original sources',
    'Recognise bias using real cases and run a simple swap test',
    'Decide what may and may not be shared with an AI tool',
    'Explain why ownership of AI output differs by country and is still unsettled',
    'Protect yourself and your team from deepfake fraud and misinformation',
    'Classify AI uses under the EU AI Act risk levels and know the key dates',
    'Write an AI disclosure, a short team AI policy and run a responsible-use checklist'
  ],
  prereqs: `<p>Module ai01 (AI, ML and GenAI in plain English) first. No coding or technical background is needed.</p>`,
  hours: 5,
  topics: topics, practice: practice, quiz: quiz, interview: interview
});
})();
