(function () { var topics = [], practice = [], quiz = [], interview = [];

// helper: a scenario problem with no code. weak = the vague first attempt, approach = a strong model answer.
function sp(title, level, tags, statement, constraints, example, weak, mcq, hints, approach, followUps) {
  return {
    title: title, level: level, tags: tags,
    statement: statement, constraints: constraints, example: example,
    brute: { why: '<p><b>Weak first attempt:</b> ' + weak + '</p>' },
    mcq: mcq,
    hints: hints,
    solution: { approach: approach, complexity: '<p>Not applicable: this is a judgement exercise about wording and context, not a calculation.</p>', followUps: followUps || [] }
  };
}
function mq(q, o, a, e) { return { q: q, options: o, answer: a, explain: e }; }

// helper: a visualizer that reads "item; item; item" and checks each item with a rule.
// rule(item) returns [label, verdict text, cls] where cls is 'ok', 'bad' or 'cur'.
function checkViz(title, inputLabel, input, cols, intro, rule, summary) {
  return {
    title: title, input: input, inputLabel: inputLabel,
    gen: function (inp) {
      var items = String(inp || '').split(';').map(function (s) { return s.trim(); }).filter(Boolean);
      if (items.length < 2 || items.length > 8) throw new Error('Give 2 to 8 items separated by semicolons, for example: ' + input.split(';').slice(0, 2).join(';'));
      items = items.map(function (s) { return s.slice(0, 120); });
      var rows = [], hl = {}, frames = [{ narr: intro, parts: [{ type: 'table', label: title, columns: cols, rows: [], hl: {} }] }];
      var good = 0;
      for (var i = 0; i < items.length; i++) {
        var r = rule(items[i]);
        rows.push([H.esc(items[i]), r[0], r[1]]);
        if (r[2] === 'ok') good++;
        var h = {}; Object.keys(hl).forEach(function (k) { h[k] = hl[k]; }); h[i] = 'cur';
        frames.push({ narr: '<b>' + H.esc(items[i]) + '</b>: ' + r[1], parts: [{ type: 'table', label: title, columns: cols, rows: rows.map(function (x) { return x.slice(); }), hl: h }] });
        hl[i] = r[2];
      }
      frames.push({ narr: summary(good, items.length), parts: [{ type: 'table', label: title, columns: cols, rows: rows.map(function (x) { return x.slice(); }), hl: hl }, { type: 'text', label: 'Verdict', html: '<p>' + good + ' of ' + items.length + ' items pass the check.</p>' }] });
      return frames;
    }
  };
}
function has(t, words) { t = String(t).toLowerCase(); return words.some(function (w) { return t.indexOf(w) >= 0; }); }

// ---------- TOPIC 1 ----------
topics.push({
  title: 'Why AI Only Knows What You Give It',
  analogy: `<p>Think of a brilliant temp worker who arrives on their first morning. They are well read and quick, but they have never met your boss, never seen your files and do not know that your company hates long emails. If you say "write the update", they will write <i>an</i> update, a generic one. Everything specific has to come from you. An AI chat assistant is that temp, every single time you open a new chat.</p>`,
  explain: `<p><b>The plain idea:</b> an AI assistant such as ChatGPT, Claude or Gemini learned general knowledge from a huge amount of text before you ever used it. That gives it grammar, common facts and writing styles. It does <b>not</b> know your company, your customers, your boss, last week's meeting or what "the Henderson file" means, unless that information is put in front of it.</p>
  <p>The information the AI can see while it answers is called its <b>context</b>. Context includes your message, earlier messages in the same chat, any files you attach, and any standing settings (custom instructions, project instructions, memory) that the app quietly adds. Anything outside the context does not exist for the AI.</p>
  <p>When a detail is missing, the AI does not stop and ask (most of the time). It <b>fills the gap with the most typical guess</b>. That is why vague requests get bland, average answers, and sometimes confident wrong ones. The guess is not lying on purpose; it is pattern-matching on what usually comes next.</p>
  ${H.table(['What you said', 'What the AI had to guess', 'Likely result'], [
    ['"Write a reply to this customer."', 'Tone, your refund policy, whether you can offer anything', 'Polite, generic, may promise a refund you cannot give'],
    ['"Summarise this report."', 'Who reads it, how long, what they care about', 'A medium-length summary of everything, highlighting the wrong parts'],
    ['"Make a plan for the launch."', 'Dates, team size, budget, what launch means here', 'A textbook plan that fits no real company']
  ])}
  <p><b>Rule of thumb:</b> if a new colleague would need to ask you a question before doing the task well, put the answer in your message.</p>`,
  clues: ['The answer is "fine but generic" → the AI was missing context, not intelligence', 'The AI invents a policy, a name or a number → it guessed a detail you never gave it', '"It doesn\'t know about our product" → it can only know what is in the chat, a file, or a connected tool', 'A colleague would ask a follow-up question → put that answer in the request', 'Interview: "How do you get good results from AI?" → talk about context first, wording second'],
  viz: {
    title: 'What the AI can see when it answers',
    gen: function () {
      var nodes = [
        { id: 'K', label: 'General training', x: 10, y: 12, shape: 'box' },
        { id: 'S', label: 'Settings and memory', x: 10, y: 32, shape: 'box' },
        { id: 'F', label: 'Attached files', x: 10, y: 52, shape: 'box' },
        { id: 'M', label: 'Your message', x: 40, y: 52, shape: 'box' },
        { id: 'C', label: 'Context', x: 52, y: 28, shape: 'box' },
        { id: 'A', label: 'Answer', x: 85, y: 28, shape: 'box' },
        { id: 'X', label: 'Your inbox, files, meetings', x: 85, y: 52, shape: 'box', w: 26 }
      ];
      function g(ehl, hl, tags) { return { type: 'graph', directed: true, height: 62, nodes: nodes, edges: [['K', 'C', 'background'], ['S', 'C', 'added by app'], ['F', 'C', 'text read'], ['M', 'C', 'you type'], ['C', 'A', 'writes']], ehl: ehl, hl: hl, tags: tags || {} }; }
      return [
        { narr: 'The AI already has <b>general knowledge</b> from training: language, common facts, typical writing. It knows nothing personal about you or your job.', parts: [g({ 'K-C': 'cur' }, { K: 'cur' })] },
        { narr: 'You type a <b>message</b>. This is usually the biggest and most important piece of context.', parts: [g({ 'M-C': 'ok' }, { M: 'ok' })] },
        { narr: 'If you attach a <b>file</b>, the app turns it into text (or reads the image) and adds it to the context.', parts: [g({ 'F-C': 'ok' }, { F: 'ok' })] },
        { narr: 'The app may quietly add <b>standing settings</b>: custom instructions, project instructions, saved memories.', parts: [g({ 'S-C': 'ok' }, { S: 'ok' }, { S: 'often invisible' })] },
        { narr: 'Everything in the <b>context</b> box is all the AI works from when it writes the answer.', parts: [g({ 'C-A': 'sel' }, { C: 'sel', A: 'sel' })] },
        { narr: 'Your real inbox, shared drive and meetings are <b>not connected</b> unless you paste them, attach them or switch on a connector. The AI fills any gap with a typical guess.', parts: [g({}, { X: 'bad' }, { X: 'not visible' })] }
      ];
    }
  },
  examples: [
    { title: 'The invented refund policy', html: `<p>Priya asks "reply to this angry customer". The AI writes a lovely apology and offers a full refund within 30 days. Her company only gives store credit. The AI did not know; it used the most common policy it has seen. <b>Fix:</b> paste the actual policy into the request.</p>` },
    { title: 'Same request, two levels of context', html: `<p><span class="c-r">Thin:</span> "Write a welcome email for new staff."<br><span class="c-g">Rich:</span> "Write a welcome email for new warehouse staff starting Monday at our Leeds site. They start at 7am, need steel-toe boots, and meet Sam at Gate 2. Friendly, under 150 words." The second needs almost no editing.</p>` },
    { title: 'The AI asks back (when you let it)', html: `<p>Ending with "Before you start, ask me up to three questions about anything you need to know" turns guessing into asking. Many people find this the easiest single habit that improves results.</p>` }
  ],
  deepDive: `<p><b>Why it does not remember last week.</b> Each chat is, by default, a fresh start. Some apps now offer <b>memory</b> (topic 6) that carries a few facts across chats, but it is selective, and you should not assume it holds the detail you need today.</p>
  <p><b>The context window.</b> The AI can only read a limited amount at once; this limit is called the <b>context window</b>. It is large today (often hundreds of pages), but not unlimited, and very long chats or many big files can push older material out or make it harder for the AI to focus.</p>
  <p><b>Knowledge cut-off.</b> General knowledge stops at a training date. Without a web search feature switched on, the AI may not know recent events, new laws or this year's prices. When the topic is recent, give it the source or ask it to search and cite.</p>
  <p><b>Connected tools change the picture.</b> Some workplace AI can be connected to email, calendars or shared drives. Then it <i>can</i> look things up, but only what the connection allows, and it still may pick the wrong document. You remain responsible for pointing it at the right material.</p>`,
  aiEra: `<p><b>Why this matters now:</b> AI assistants are built into email, documents, spreadsheets and chat tools at many workplaces. The people who get the most from them are not the ones with clever "magic words"; they are the ones who hand over the right background, the way they would brief a new colleague.</p>
  <p><b>A useful mindset:</b> you are the manager, the AI is a fast but brand-new assistant. Your job is to brief, check and decide. Its job is to draft, organise and suggest. This lesson is about the briefing part, which people sometimes call <b>context engineering</b>: deciding what information the AI should see, and where to put it so you do not repeat yourself.</p>
  <p><b>Old habit vs new habit:</b> the old habit was searching for the perfect prompt template online. The new habit is building your own small library of context (a project, a template, a style guide) for the tasks you actually do every week.</p>`,
  problems: [sp('Spot the Missing Context', 'Easy', ['context', 'basics'],
    `<p>Your manager forwards a message: "Can you use AI to draft our reply to Greenfield Ltd about the delay?" You type: <b>"Write a reply to Greenfield about the delay."</b> List at least five pieces of information the AI does not have and would have to guess.</p>`,
    `<p>No real company data needed: invent plausible details. Aim for five or more missing items.</p>`,
    `<p>One missing item: <b>how long</b> the delay is. Without it the AI may write "a short delay" or invent "two weeks".</p>`,
    `"Write a reply to Greenfield about the delay." The AI will invent the reason, the new date and maybe an apology discount, because it has none of the facts.`,
    mq('What is the most likely problem with the one-line request?', ['The AI will refuse it', 'The AI will fill missing facts with typical guesses', 'The AI will ask for a password', 'The AI cannot write emails'], 1, 'Missing facts are filled with the most typical guess, which may be wrong for your situation.'),
    [`<p>Hint 1: Imagine handing this to a temp on their first day. What would they ask you before writing?</p>`, `<p>Hint 2: Think in groups: facts about the delay, facts about the relationship, and facts about the reply itself.</p>`, `<p>Hint 3: Check reason, new date, what you can offer, who signs, tone, length, and the earlier messages from Greenfield.</p>`],
    `<p>Missing context: (1) <b>what</b> is delayed (an order, a report, a building job); (2) <b>why</b> it is delayed, and how much you are willing to say; (3) the <b>new date</b> and how confident you are; (4) <b>what you can offer</b> (nothing, a discount, partial delivery) and what you must not promise; (5) the <b>relationship</b>: new client or ten-year partner, already annoyed or not; (6) <b>who signs</b> and in what voice; (7) <b>length and tone</b>; (8) Greenfield's <b>own message</b>, so the reply answers what they actually asked. A good request includes these facts or pastes the email thread, then says "do not promise anything not listed here". The pattern: every gap you leave becomes a guess the AI makes on your behalf.</p>`,
    ['Which of these could you safely leave out?', 'How would you ask the AI to tell you what it still needs?'])]
});

// ---------- TOPIC 2 ----------
topics.push({
  title: 'The Briefing Recipe: Role, Goal, Audience, Format and Examples',
  analogy: `<p>Ordering a cake from a baker goes better when you say who it is for (a five-year-old's party), what it must do (feed 20 kids), what it should look like (a dinosaur, two layers) and show a photo you liked. Say only "one cake, please" and you get the plain sponge in the window. A good AI request is a cake order: occasion, purpose, look and a picture.</p>`,
  explain: `<p><b>The plain idea:</b> most good requests answer five questions. You do not need fancy wording, just these ingredients:</p>
  ${H.table(['Ingredient', 'Question it answers', 'Example words'], [
    ['<b>Role</b>', 'Whose point of view should the AI take?', '"Act as an experienced HR adviser in a small UK charity."'],
    ['<b>Goal</b>', 'What is this for, and what does success look like?', '"I need staff to sign up for the new pension scheme by Friday."'],
    ['<b>Audience</b>', 'Who reads the result, and what do they already know?', '"Warehouse staff, many with English as a second language."'],
    ['<b>Format</b>', 'Shape, length, tone', '"A short email, under 120 words, three bullet points, warm tone."'],
    ['<b>Examples</b>', 'What does good look like?', '"Here is last year\'s email that people liked: ..."']
  ])}
  <p>Two extras help often: <b>background facts</b> (the details only you know, such as dates, policies, names) and <b>limits</b> (what not to do: "do not mention salary", "no jargon").</p>
  <p><b>Why examples are so powerful:</b> describing a style in words ("friendly but professional") is vague. Showing one example of the style is precise. The AI is very good at copying a pattern it can see. One or two short examples usually beat a paragraph of description. If you give several, make them different from each other so the AI copies the style rather than the exact words.</p>
  <p><b>Order that works:</b> background first, then the task, then the format. Put pasted material in a clearly marked block, for example after a line saying "Customer email below:".</p>`,
  clues: ['"Make it sound better" with no audience → add who reads it', 'Output is too long or too formal → you did not state format and tone', 'Wants it "like last time" → paste last time\'s version as an example', 'Role words ("act as a…") without facts → role alone is not enough; add background', 'Interview: "Walk me through how you write a request" → role, goal, audience, format, examples, limits'],
  viz: checkViz('Does this request have the five ingredients?', 'Requests separated by semicolons', 'Write a newsletter; Act as our HR lead and write a 100-word email to warehouse staff about the pension deadline Friday, warm tone, like this example: ...; Summarise this for my boss in 5 bullets; Make this better',
    ['Request', 'Ingredients found', 'Verdict'],
    'Each request is scanned for <b>role</b>, <b>goal / audience</b>, <b>format</b> and <b>example</b> words. More ingredients means less guessing.',
    function (t) {
      var found = [];
      if (has(t, ['act as', 'you are', 'as our', 'as an', 'as a '])) found.push('role');
      if (has(t, ['for my', 'to ', 'staff', 'boss', 'customer', 'team', 'reader'])) found.push('audience');
      if (has(t, ['word', 'bullet', 'table', 'tone', 'short', 'email', 'list', 'line'])) found.push('format');
      if (has(t, ['example', 'like this', 'like last'])) found.push('example');
      var n = found.length;
      return [found.join(', ') || 'none', n >= 3 ? 'Rich enough: little left to guess.' : n === 2 ? 'Partly there: add the missing ingredients.' : 'Thin: the AI will guess almost everything.', n >= 3 ? 'ok' : 'bad'];
    },
    function (g, n) { return g + ' of ' + n + ' requests are well briefed. The rest will get generic answers. Add role, audience, format and an example to each.'; }),
  examples: [
    { title: 'Before and after: meeting summary', html: `<p><span class="c-r">Before:</span> "Summarise these meeting notes."<br><span class="c-g">After:</span> "Act as a project coordinator. Summarise the notes below for the finance director, who was not at the meeting and cares about cost and dates. Format: three headings (Decisions, Money, Next steps), at most 150 words. Do not include who said what."</p>` },
    { title: 'An example sets the style', html: `<p>A shop owner wants product descriptions. Instead of explaining her brand voice, she pastes two descriptions she wrote herself and says "Write one for the blue mug in the same style, same length." The result sounds like her.</p>` },
    { title: 'Limits stop surprises', html: `<p>A school office asks for a letter to parents about a closed road. Adding "Do not speculate about when the road will reopen; we do not know" prevents the AI from inventing a date to sound helpful.</p>` }
  ],
  deepDive: `<p><b>Role is the weakest ingredient on its own.</b> "Act as a world-class marketer" changes the tone a little but adds no facts. Role works best together with background: "You are writing as the marketing lead of a 12-person bakery in Bristol that sells mainly to cafés."</p>
  <p><b>Examples can be copied too closely.</b> If you give one example, the AI may reuse its exact phrases. Say "match the style, not the words", or give two examples that differ.</p>
  <p><b>Asking for a plan first.</b> For bigger tasks (a report, a proposal) ask for an outline first, correct it, then ask for the full draft. Fixing an outline is quicker than fixing ten paragraphs.</p>
  <p><b>Let it ask questions.</b> Ending with "If anything important is missing, ask me before you write" often works well, because it turns hidden guesses into visible questions.</p>
  <p><b>Long is not the same as good.</b> A clear, well-ordered request of six lines usually beats a rambling one of thirty. Cut anything the AI does not need for this task.</p>`,
  aiEra: `<p><b>From "prompting" to "briefing":</b> early advice about AI was full of tricks and magic phrases. Today's assistants are better at understanding plain language, so tricks matter less and <b>information</b> matters more. A clear brief written the way you would brief a colleague is the reliable approach.</p>
  <p><b>Where this shows up at work:</b> writing emails, drafting reports, preparing presentations, rewriting text for a different audience, turning notes into action lists. The recipe is the same for all of them.</p>
  <p><b>What stays human:</b> deciding the goal and the audience is your judgement. The AI can suggest options ("who might read this?"), but only you know what your manager actually wants this time.</p>`,
  problems: [sp('Rewrite a Vague Request', 'Easy', ['briefing', 'rewrite'],
    `<p>Leah runs volunteers at a food bank. She typed: <b>"Write something to get more volunteers."</b> Rewrite it using role, goal, audience, format, an example and one limit. Invent sensible facts.</p>`,
    `<p>Your rewrite should be 4 to 10 lines. No technical words needed.</p>`,
    `<p>Audience could be "retired people in our town who use the local Facebook group", which changes the tone completely compared to students.</p>`,
    `"Write a really good, engaging post to get more volunteers, make it amazing." Adding adjectives is not adding context: the AI still does not know who, where, when or how long.`,
    mq('Which addition helps the AI most?', ['"Make it really engaging"', '"Shifts are Saturday 9-12 at St Mark\'s hall; we need 6 people"', '"You are the best writer in the world"', '"Please"'], 1, 'Concrete facts remove guesses. Adjectives and flattery do not.'),
    [`<p>Hint 1: Start with the facts only Leah knows: where, when, what volunteers actually do.</p>`, `<p>Hint 2: Pick one audience and one channel; a Facebook post and a poster need different formats.</p>`, `<p>Hint 3: Add a short example of a past post that worked, and one thing to avoid, such as guilt-tripping.</p>`],
    `<p>Strong rewrite: "<b>Role:</b> you are helping the volunteer coordinator of Hillside Food Bank. <b>Goal:</b> recruit 6 new volunteers for Saturday shifts (9am to 12pm at St Mark's hall) before December. <b>Audience:</b> retired and semi-retired people in our town who read the community Facebook group. <b>Format:</b> a Facebook post, under 100 words, friendly and plain, ending with how to sign up (message this page or call 01234 567890). <b>Example of a post that worked:</b> 'Got a spare Saturday morning? ...' Match its warmth, not its words. <b>Limit:</b> do not use guilt or statistics about hunger; keep it upbeat." Each part removes a guess: who to address, what to ask for, how long, how to respond and what tone to avoid.</p>`,
    ['How would you change it for students on Instagram?', 'What would you check before posting?'])]
});

// ---------- TOPIC 3 ----------
topics.push({
  title: 'Attaching Files: What Happens to Them',
  analogy: `<p>Handing a file to an AI is like handing a stack of papers to a speed-reader in a hurry. They read the words quickly, but a blurry photocopy, a chart with no labels or a 400-page binder makes them skim, miss things or misread numbers. And once you hand the papers over, they have left your desk, so think about what is in them first.</p>`,
  explain: `<p><b>The plain idea:</b> most AI chat apps let you attach files: documents, PDFs, spreadsheets, slides and images. When you do, the app usually <b>extracts the text</b> (and, for many apps, looks at images) and puts it into the context alongside your message. The AI then reads that text like any other part of your request.</p>
  ${H.table(['File type', 'What usually happens', 'Watch out for'], [
    ['Word document or clean PDF', 'Text is extracted and read', 'Headers, footnotes and tables may lose their layout'],
    ['Scanned PDF or photo of paper', 'The app must read the image; quality matters', 'Handwriting, faint copies and stamps get misread'],
    ['Spreadsheet', 'Rows are read as text, or analysed with a built-in calculation tool in some apps', 'Hidden sheets, merged cells, formulas vs values, very large files'],
    ['Slides', 'Slide text is extracted; pictures may or may not be understood', 'Meaning carried only by a diagram can be missed'],
    ['Image or screenshot', 'The AI describes and reads what it sees', 'Small text and dense charts can be misread']
  ])}
  <p><b>What a file does NOT do:</b> attaching a file does not mean the AI will read every line with equal care. With very long files, the AI may focus on some parts and skim others. It also does not automatically check that the file is current or correct; if you attach last year's price list, you will get last year's prices.</p>
  <p><b>Privacy first:</b> attaching a file sends its content to the AI provider. Follow your employer's AI policy. Do not attach customer personal data, health records, passwords or confidential contracts to a personal account. Work accounts often have different data terms from free personal ones; check which you are using.</p>
  <p><b>Good habit:</b> say what the file is and what to use it for: "Attached is our 2026 returns policy (4 pages). Use only this policy when answering. If the answer is not in it, say so."</p>`,
  clues: ['"It ignored part of my document" → the file was long or messy; point to the section you need', 'Numbers from a scan are slightly wrong → image reading errors; check against the original', 'Answer uses outdated facts → the attached file or the AI\'s general knowledge was out of date', '"Can I upload this?" → check what is in it and your company\'s AI policy first', 'Interview: "How do you use AI with documents?" → say what the file is for, limit the answer to it, verify key facts'],
  viz: checkViz('Should I attach this file?', 'Files separated by semicolons', 'Public brochure PDF; Spreadsheet of customer names and phone numbers; Our anonymised survey results; Scanned handwritten invoice; Draft blog post',
    ['File', 'Check', 'Decision'],
    'Before attaching, ask two questions: <b>is it safe to share</b> under my company policy, and <b>will the AI be able to read it well</b>?',
    function (t) {
      if (has(t, ['customer', 'phone', 'patient', 'salary', 'password', 'personal', 'medical', 'contract'])) return ['Contains personal or confidential data', 'Do not attach to a personal account; remove the sensitive parts or use an approved work tool.', 'bad'];
      if (has(t, ['scan', 'handwrit', 'photo', 'blurry'])) return ['Image of paper', 'OK to try, but check every number and name against the original.', 'cur'];
      return ['Safe and readable', 'Attach it and say what it is for.', 'ok'];
    },
    function (g, n) { return g + ' of ' + n + ' files are fine to attach as they are. Red items need removing or anonymising first; amber items need careful checking.'; }),
  examples: [
    { title: 'Point to the part that matters', html: `<p>A 60-page tender document is attached and the AI misses a deadline buried on page 41. Better: "In the attached tender, find every date and deadline, list them with page numbers, and quote the sentence each comes from." Quotes let you check quickly.</p>` },
    { title: 'Spreadsheet surprises', html: `<p>An office manager attaches a budget spreadsheet. The AI totals only the visible sheet, not the hidden "Q4" sheet. Lesson: tell it which sheets and columns to use, and check one total yourself.</p>` },
    { title: 'Making a file safe to share', html: `<p>Before attaching staff survey comments, an HR assistant removes names and replaces departments with codes (Team A, Team B), keeping only what the AI needs to find themes.</p>` }
  ],
  deepDive: `<p><b>Where the file goes.</b> In a normal chat, an attached file belongs to that conversation. In a project or Gem (topic 5), files you add become <b>knowledge</b> used by every chat in that space. Providers also have rules about how long files are kept and whether data may be used to improve their models; these differ by product and plan, and settings exist to control some of this. Read your provider's privacy page and your employer's policy rather than assuming.</p>
  <p><b>Big collections.</b> When a project holds many files, some apps search the files and pull in only the parts that look relevant to your question, rather than reading everything every time. That is efficient, but it can miss a passage that uses different words. Asking for quotes and page numbers helps you spot misses.</p>
  <p><b>Format tips.</b> Plain text or clean digital documents work best. If a PDF is a scan, a clearer copy or a typed version gives better results. For tables, pasting the table as text sometimes works better than attaching a picture of it.</p>`,
  aiEra: `<p><b>From copying to attaching:</b> a few years ago people pasted text into chat boxes. Now you can drop in whole reports, slide decks and spreadsheets, and many workplace tools can reach shared drives directly. That saves time, but it also makes it easier to share too much.</p>
  <p><b>New risk:</b> the more you attach, the more the AI has to choose from. Attach the <b>right</b> files, not <b>all</b> the files. A focused, current document beats a folder of drafts.</p>
  <p><b>New skill:</b> asking the AI to cite where in the file each claim comes from, and then spot-checking those places. This turns "trust me" into "here is the page", which is what your manager will want anyway.</p>`,
  problems: [sp('Prepare a File Before Attaching', 'Medium', ['files', 'privacy'],
    `<p>Tom works in a small accounting firm. He wants AI to find common complaints in a spreadsheet of 300 client feedback comments. The spreadsheet has columns: client name, email, phone, date, comment, staff member. Describe what he should do to the file and what he should write when attaching it.</p>`,
    `<p>Assume the firm allows an approved AI tool for anonymised data only.</p>`,
    `<p>The <b>comment</b> column is what the AI needs. Client <b>email</b> and <b>phone</b> add nothing to finding themes.</p>`,
    `Attach the full spreadsheet and type "what are the main complaints?". Personal data leaves the firm unnecessarily, and staff names may lead to unfair blame in the summary.`,
    mq('Which columns should Tom keep?', ['All of them, for context', 'Comment and date only (plus a coded staff team if needed)', 'Client name only', 'None, he should not use AI'], 1, 'Keep only what the task needs. Themes come from the comment text; dates help spot trends.'),
    [`<p>Hint 1: Ask which columns the task actually needs to find themes. Everything else is risk with no benefit.</p>`, `<p>Hint 2: Replace anything personal with codes, and check comments themselves for names typed inside them.</p>`, `<p>Hint 3: When attaching, say what the file is, what to produce, and ask for example quotes per theme so he can check.</p>`],
    `<p><b>Prepare the file:</b> delete client name, email and phone; replace staff member with a team code if team patterns matter, or delete it; search the comment text for names or account numbers that clients typed and remove them; keep date and comment. Save as a new file so the original stays untouched. <b>Attach with a brief:</b> "Attached: 300 anonymised client feedback comments from 2026 (columns: date, comment). Goal: find the 5 most common complaint themes for our partners' meeting. For each theme give a one-line description, how many comments mention it (approximately), and two short quotes. If a comment fits no theme, put it under Other. Do not guess at causes beyond what the comments say." Then spot-check: read ten random comments and see whether the themes fit. This protects clients, follows policy and makes the answer checkable.</p>`,
    ['What if some comments are in Welsh or Polish?', 'How could he check the counts are roughly right?'])]
});

// ---------- TOPIC 4 ----------
topics.push({
  title: 'Custom Instructions: Standing Orders for Every Chat',
  analogy: `<p>A regular café customer does not explain their order every morning; the barista already knows "oat milk, no sugar, large". Custom instructions are your standing order with the AI: a short note about you and how you like answers, which the app adds to every new chat so you do not have to repeat it.</p>`,
  explain: `<p><b>The plain idea:</b> <b>custom instructions</b> (also called personal preferences or personalisation, depending on the app) are a settings box where you write, once, things that should apply to all your chats. The app quietly adds that text to the context of every new conversation.</p>
  <p><b>Where to find them (as of late 2026; menus move, so check your app's help page):</b></p>
  <ul>
    <li><b>ChatGPT:</b> under Settings, then Personalization, there is a custom instructions area where you can say what ChatGPT should know about you and how it should respond. Instructions apply to new chats until you change or turn them off.</li>
    <li><b>Claude</b> and <b>Gemini</b> also offer account-level settings where you can describe yourself or give standing instructions; look in Settings. Gemini's version has been renamed during 2026, so the label you see may differ from older guides.</li>
  </ul>
  <p><b>What belongs in them:</b> things that are true for <i>almost every</i> chat.</p>
  ${H.table(['Good for custom instructions', 'Better in a single message or a project'], [
    ['"I work in HR at a 200-person UK charity."', '"This email is to the trustees about the pension change."'],
    ['"Use British spelling."', '"This one needs to be under 100 words."'],
    ['"Be direct; skip long introductions."', '"Use the tone of the attached example."'],
    ['"When you are unsure, say so."', 'Details of one client or one project']
  ])}
  <p><b>Keep them short.</b> A few clear lines work better than a long essay. Everything you write here is added to <i>every</i> chat, including ones where it does not fit, so specific details can cause odd answers elsewhere.</p>`,
  clues: ['"I keep typing the same thing at the start of every chat" → move it into custom instructions', 'The AI uses American spelling or a tone you dislike in every chat → a standing preference is missing', 'A strange detail appears in unrelated chats → check custom instructions and memory for something too specific', 'One project needs different rules → use project instructions, which override or add to the general ones', 'Interview: "How have you set up your AI tools?" → describe a short, general set of standing instructions'],
  viz: checkViz('Custom instruction or one-off message?', 'Possible instructions separated by semicolons', 'Use British spelling; This report is for the board meeting on 3 March; I am a school business manager; Make the Henderson email apologetic; Say when you are not sure',
    ['Line', 'Applies to', 'Where it belongs'],
    'Custom instructions are added to <b>every</b> chat. Only things that are nearly always true should go there.',
    function (t) {
      if (has(t, ['this ', 'report', 'email', 'meeting', 'henderson', 'today', 'march'])) return ['One task', 'Put it in the message (or a project for that piece of work).', 'bad'];
      return ['Almost every chat', 'Good custom instruction.', 'ok'];
    },
    function (g, n) { return g + ' of ' + n + ' lines are general enough for custom instructions. Task-specific lines would leak into unrelated chats.'; }),
  examples: [
    { title: 'A short, useful set', html: `<p>"I am an office manager at a 40-person architecture firm in Dublin. Use British/Irish spelling. Prefer short answers with a clear recommendation first. When you are unsure or the answer depends on law or tax rules, say so and suggest who I should check with."</p>` },
    { title: 'Too specific causes leaks', html: `<p>Sara wrote "Always mention our spring sale" in her custom instructions. Weeks later, the AI slipped the sale into a condolence card. Campaign details belong in a project or a single message, not standing instructions.</p>` },
    { title: 'Turning them off for one task', html: `<p>Some apps let you start a temporary or incognito chat, or switch off personalisation, when you want an answer without your usual settings, for example to see how a neutral reader would describe your company.</p>` }
  ],
  deepDive: `<p><b>Order of layers.</b> In most apps, the layers stack: the app's own built-in rules, then your account-level custom instructions, then project or Gem instructions, then memory, then your message. When layers conflict, the more specific one usually wins: OpenAI says ChatGPT project instructions override your general custom instructions inside that project. If an answer behaves oddly, check each layer.</p>
  <p><b>They are not commands to the company.</b> Writing "do not store my data" in custom instructions does not change how data is stored. Privacy and data controls live in the app's settings and your organisation's agreements, not in text you type to the AI.</p>
  <p><b>Workplace accounts.</b> In company-managed accounts, administrators may control which personalisation features are available. If you cannot find a setting, ask IT before using a personal account.</p>
  <p><b>Review them every few months.</b> Jobs change. An outdated line ("I am new to Excel") quietly shapes every answer.</p>`,
  aiEra: `<p><b>Why this feature exists:</b> as AI assistants moved from novelty to daily tool, people grew tired of retyping the same background. Custom instructions are the simplest way to make every chat start from "knows who I am".</p>
  <p><b>The trade-off:</b> convenience versus surprise. A standing instruction saves typing, but it also influences answers you did not expect it to. Keep it general and you get the benefit without the surprises.</p>
  <p><b>Good practice:</b> write your instructions like a short profile for a new assistant: who you are, how you like information, what to do when unsure. Then put anything about a specific piece of work in a project, a template or the message itself.</p>`,
  problems: [sp('Sort Lines into the Right Place', 'Medium', ['custom instructions', 'projects'],
    `<p>Marco is a sales coordinator. He wants to set up his AI assistant and has written these lines: (1) "I coordinate sales for a garden furniture wholesaler in Italy and the UK." (2) "Use British English unless I write in Italian." (3) "The Q3 price list is attached; use it for all quotes." (4) "Keep emails under 150 words." (5) "Client Rossi prefers formal Italian." (6) "If you are unsure of a figure, say so." Decide where each line belongs: custom instructions, a project, or a single message.</p>`,
    `<p>Assume Marco does many kinds of tasks, not only quotes.</p>`,
    `<p>Line (1) is true in every chat, so it suits custom instructions.</p>`,
    `Put all six lines into custom instructions. The price list and Rossi's preference then appear in chats about holidays and spreadsheets, and the price list goes out of date silently.`,
    mq('Where does the Q3 price list belong?', ['Custom instructions', 'A project for quotes, as a knowledge file', 'Nowhere, the AI knows prices', 'Typed into every message'], 1, 'A file used for one kind of work belongs in a project for that work, where it can be updated in one place.'),
    [`<p>Hint 1: Ask of each line "is this true for almost every chat I will ever have?"</p>`, `<p>Hint 2: Files and details used for one kind of repeated work suit a project or workspace.</p>`, `<p>Hint 3: Details about one client in one email can go in the message itself or in the quotes project.</p>`],
    `<p><b>Custom instructions:</b> (1) his role, (2) language rule, (6) "say when unsure" — all apply to nearly every chat. (4) "under 150 words" is borderline: if almost all his AI use is email, keep it; otherwise put it in an email template. <b>A "Quotes" project:</b> (3) the Q3 price list as a knowledge file, plus instructions like "use only the attached price list; if an item is missing, say so", and (5) client preferences such as Rossi's (or put Rossi's preference in the message when writing to Rossi). When Q4 prices arrive, he replaces one file in one place. The principle: general and lasting → custom instructions; shared by one kind of task → project; one-off → message.</p>`,
    ['What should he do when the Q4 price list arrives?', 'What would go wrong if a colleague used his project?'])]
});

// ---------- TOPIC 5 ----------
topics.push({
  title: 'Projects and Workspaces: ChatGPT Projects, Claude Projects and Gemini Gems',
  analogy: `<p>A project is like a labelled ring binder for one piece of work. The front page has instructions ("this binder is for the Leeds office move; keep answers short"), the pockets hold the key documents, and every new page you add sits next to them. Open the binder and everything you need is already there, instead of carrying loose papers into every meeting.</p>`,
  explain: `<p><b>The plain idea:</b> a <b>project</b> (or <b>workspace</b>) is a named space in an AI app that groups together <b>instructions</b>, <b>files</b> and <b>chats</b> for one area of work. Every new chat started inside it automatically gets those instructions and files as context, so you set them up once.</p>
  ${H.table(['Product (late 2026)', 'What it is', 'What you can put in it'], [
    ['<b>ChatGPT Projects</b>', 'Folders that group chats, files and instructions', 'Project instructions (which OpenAI says override your general custom instructions inside the project), files, and the project\'s chats; OpenAI describes projects as remembering the chats and files inside them. Business, Enterprise and Edu users can share projects with teammates.'],
    ['<b>Claude Projects</b>', 'Self-contained workspaces with their own chat history and knowledge', 'Project instructions and "project knowledge" files. Available on free accounts with a limit on how many projects, and on paid plans; Team and Enterprise members can share projects with view or edit permission. On paid plans, Claude switches to searching the knowledge when it gets very large.'],
    ['<b>Gemini Gems</b>', 'Custom versions of Gemini you set up for a repeated task', 'A name, instructions and knowledge files (from your device or Google Drive). Gems can be shared, with view or edit access, similar to sharing a Drive file.']
  ])}
  <p>Exact limits, plan availability and menu names change often. Check the product's help page before you rely on a detail. (Some reports in 2026 suggest Google may fold Gems into a newer feature; we could not confirm this from Google, so check Gemini's help pages.)</p>
  <p><b>When to use a project:</b></p>
  <ul>
    <li>You do the <b>same kind of task again and again</b> (weekly reports, customer replies, lesson plans).</li>
    <li>The task needs the <b>same reference documents</b> each time (a style guide, a policy, a price list).</li>
    <li>You want <b>chats about one piece of work kept together</b> and separate from everything else.</li>
    <li>A <b>team</b> should work from the same instructions and files (where sharing is available on your plan).</li>
  </ul>
  <p><b>When not to bother:</b> a one-off question, or something you will never repeat. A normal chat is fine.</p>`,
  clues: ['"I upload the same style guide every week" → make a project with it as a knowledge file', 'Different clients get mixed up in answers → one project per client keeps contexts separate', 'Team members get inconsistent AI answers → a shared project with shared instructions (if your plan allows)', '"Build me a reusable assistant for X" → a Gem or a project with clear instructions', 'One-off question → normal chat; a project is overkill'],
  viz: {
    title: 'Inside a project: what every new chat gets',
    input: 'Weekly report project; Instructions: short, British spelling, finance director audience; Files: style guide, KPI definitions; Chat: week 42 report',
    inputLabel: 'Name; Instructions: ...; Files: ...; Chat: ...',
    gen: function (inp) {
      var parts = String(inp || '').split(';').map(function (s) { return s.trim(); });
      if (parts.length < 4) throw new Error('Give 4 parts: name; Instructions: ...; Files: ...; Chat: ...');
      var name = H.esc(parts[0].slice(0, 30)), ins = H.esc(parts[1].replace(/^instructions:\s*/i, '').slice(0, 80)), files = H.esc(parts[2].replace(/^files:\s*/i, '').slice(0, 80)), chat = H.esc(parts[3].replace(/^chat:\s*/i, '').slice(0, 40));
      var nodes = [
        { id: 'P', label: name, x: 50, y: 8, shape: 'box', w: 30 },
        { id: 'I', label: 'Instructions', x: 15, y: 30, shape: 'box' },
        { id: 'F', label: 'Knowledge files', x: 50, y: 30, shape: 'box' },
        { id: 'H', label: 'Earlier chats', x: 85, y: 30, shape: 'box' },
        { id: 'C', label: chat, x: 50, y: 55, shape: 'box', w: 30 }
      ];
      function g(ehl, hl, tags) { return { type: 'graph', directed: true, height: 64, nodes: nodes, edges: [['P', 'I'], ['P', 'F'], ['P', 'H'], ['I', 'C', 'added'], ['F', 'C', 'used'], ['H', 'C', 'maybe']], ehl: ehl, hl: hl, tags: tags || {} }; }
      return [
        { narr: 'You create a project called <b>' + name + '</b>. It is an empty binder until you fill it.', parts: [g({}, { P: 'cur' })] },
        { narr: 'You write <b>project instructions</b> once: ' + ins + '.', parts: [g({ 'P-I': 'ok' }, { I: 'ok' })] },
        { narr: 'You add <b>knowledge files</b>: ' + files + '. They stay in the project for every chat.', parts: [g({ 'P-F': 'ok' }, { I: 'ok', F: 'ok' })] },
        { narr: 'You start a new chat: <b>' + chat + '</b>. The instructions are added automatically.', parts: [g({ 'I-C': 'cur' }, { C: 'cur' })] },
        { narr: 'The knowledge files are available to the chat, so you do not upload them again.', parts: [g({ 'I-C': 'ok', 'F-C': 'cur' }, { C: 'cur', F: 'ok' })] },
        { narr: 'Depending on the product and settings, the chat may also draw on <b>earlier chats in the same project</b> (project memory). Chats in other projects stay out.', parts: [g({ 'I-C': 'ok', 'F-C': 'ok', 'H-C': 'cur' }, { H: 'cur' }, { H: 'product-specific' })] },
        { narr: 'Result: each new chat starts fully briefed. Update a file or instruction <b>once</b> and every future chat uses the new version.', parts: [g({ 'I-C': 'sel', 'F-C': 'sel' }, { C: 'sel' }, { C: 'briefed' })] }
      ];
    }
  },
  examples: [
    { title: 'A teacher\'s Gem', html: `<p>A Year 6 teacher sets up a Gem called "Reading questions" with instructions: "Write 5 comprehension questions for 10-11 year olds: 2 retrieval, 2 inference, 1 vocabulary. UK spelling. Include an answer key." Each week she just pastes the new passage.</p>` },
    { title: 'One project per client', html: `<p>A freelance copywriter keeps a project per client, each with that client's brand guide and approved past work. Answers for the organic bakery never borrow the tone of the law firm, because each project only sees its own files.</p>` },
    { title: 'A shared team project', html: `<p>A customer-support team on a business plan shares a project containing the returns policy and the tone guide, with instructions to quote the policy section used. When the policy changes, one person updates the file for everyone.</p>` }
  ],
  deepDive: `<p><b>Instructions vs knowledge.</b> A simple way to think about it: <b>instructions</b> say <i>how to behave</i> (tone, format, rules, what to do when unsure); <b>knowledge files</b> say <i>what is true</i> (policies, facts, examples). Do not bury rules inside a 40-page file and hope they are followed; put rules in the instructions.</p>
  <p><b>Big knowledge collections.</b> When a project holds a lot of material, apps may search it and bring in only the passages that look relevant (Anthropic describes this for Claude Projects on paid plans). That means the AI may not "see" every file for every question. Asking it to quote and name the file it used helps you check.</p>
  <p><b>Stale files are the main danger.</b> A project makes a file feel permanent. If the policy changes and nobody updates the project, every answer is confidently out of date. Put a date in each file name and review the project regularly.</p>
  <p><b>Sharing has two sides.</b> Sharing a project or Gem shares its instructions; sharing attached files may need their own permissions (Google notes Drive files in a shared Gem may need separate access). Before sharing, check nothing private is in the files or instructions.</p>`,
  aiEra: `<p><b>Why projects caught on:</b> people found they were doing the same setup every time: upload the style guide, paste the instructions, explain the audience. Projects and Gems turn that setup into a reusable workspace, which is the non-coder's version of what developers call building an AI app.</p>
  <p><b>From personal trick to team asset:</b> once projects can be shared, a good set of instructions and files becomes something the whole team benefits from, like a good template or checklist. Someone needs to own it, keep it current and tell people when it changes.</p>
  <p><b>Choose features, not brands:</b> the three products differ in details and change often. The lasting skill is knowing what goes in instructions, what goes in files, and when a reusable space is worth setting up.</p>`,
  problems: [sp('Project Instructions or a Single Message?', 'Medium', ['projects', 'instructions'],
    `<p>Aisha writes the monthly newsletter for a housing association. Every month she: explains the audience (tenants, many older, some with low literacy), pastes the style guide, reminds the AI to avoid jargon like "voids" and "arrears", gives the month's news items, and asks for a 400-word draft. Design a project: what goes in the project instructions, what goes in knowledge files, and what she types each month.</p>`,
    `<p>Assume she uses a project feature in her organisation's approved AI app.</p>`,
    `<p>The <b>audience description</b> never changes from month to month, so it belongs in the project instructions.</p>`,
    `Keep doing it all by hand every month. It works, but it takes 15 minutes, and the month she forgets the jargon rule, a newsletter goes out mentioning "voids".`,
    mq('Where should this month\'s news items go?', ['Project instructions', 'A knowledge file', 'The monthly message', 'Custom instructions'], 2, 'They change every month, so they belong in the message for that month\'s chat.'),
    [`<p>Hint 1: Sort everything by how often it changes: never, rarely, or every month.</p>`, `<p>Hint 2: Rules about behaviour go in instructions; reference documents go in files.</p>`, `<p>Hint 3: The monthly message should be short: the news items and anything special this month.</p>`],
    `<p><b>Project instructions (rarely change):</b> "You help write the monthly tenant newsletter for Brookside Housing. Readers are tenants, many older, some with low literacy. Use short sentences and everyday words (aim for a reading age of about 9-11). Never use internal jargon such as voids, arrears, or SLA; use 'empty homes', 'rent owed', 'response times'. Length about 400 words with a short headline for each item. Follow the style guide file. If a news item is unclear, ask me rather than guess." <b>Knowledge files:</b> the style guide (dated), one or two past newsletters that tenants liked, as examples of tone. <b>Monthly message:</b> "Here are this month's 4 items: ... The repairs item is the most important; put it first." The result: a 2-minute monthly task, the jargon rule always applies, and if the style guide changes she replaces one file.</p>`,
    ['How would she hand this over to a colleague covering her holiday?', 'What should she check every month before publishing?'])]
});

// ---------- TOPIC 6 ----------
topics.push({
  title: 'Memory: What the AI Remembers About You and How to Control It',
  analogy: `<p>Memory is like a helpful receptionist who jots notes on a card about you: "prefers mornings", "has two kids", "works in payroll". Next visit they greet you knowingly. Useful, but you should be able to read the card, cross things out, and ask them not to write anything about today's visit.</p>`,
  explain: `<p><b>The plain idea:</b> <b>memory</b> is a feature that lets an AI app carry some information from past chats into new ones, without you retyping it. It is different from custom instructions (which you write yourself) and from a project (which you deliberately fill). Memory is often <b>picked up automatically</b> from what you say, which is why it is important to know how to see and control it.</p>
  <p><b>What the main apps offer (late 2026; check help pages, as names change):</b></p>
  ${H.table(['App', 'How memory works', 'How to see, edit or turn it off'], [
    ['<b>ChatGPT</b>', 'Two kinds: <b>saved memories</b> (details it keeps, often because you asked) and <b>reference chat history</b> (drawing on past conversations)', 'Settings → Personalization: manage memories to view and delete them, and toggles to turn either kind off. Turning memory off does not delete what is already saved. <b>Temporary Chat</b> does not use or create memories.'],
    ['<b>Claude</b>', 'Saves memory as topics while you chat; each project has its own separate memory', 'Settings → (a section about you) → Manage memory to read, edit or delete topics; a switch to stop memory from chats, a pause option, and a reset that deletes everything. <b>Incognito chats</b> are not saved to memory or history. Projects can be set to not use account memory.'],
    ['<b>Gemini</b>', 'Can remember details you ask it to, and can use past chats; Google renamed these settings in 2026', 'In Gemini settings you can view, edit and delete what is saved and turn the features on or off. Exact menu names vary; search Gemini Help for "memory" or "saved info".']
  ])}
  <p><b>You can also just ask.</b> In most apps, saying "remember that I work in payroll" or "forget what I said about my health" works in the chat, and you can then check the memory list to confirm.</p>
  <p><b>Why control matters:</b> memory can hold wrong or outdated facts ("is training for a marathon" from last year), sensitive information you mentioned in passing, or details from one piece of work that leak into another. Review it now and then, the way you would tidy a contacts list.</p>`,
  clues: ['The AI mentions something you said weeks ago → memory or chat-history reference is on', 'Answers assume an old job or old circumstances → outdated memory; edit or delete it', 'A sensitive topic → use a temporary or incognito chat, or switch memory off first', 'Two clients\' details mixing → separate projects, and check project memory settings', 'Interview: "How do you manage privacy with AI tools?" → mention viewing, deleting and turning off memory, and temporary chats'],
  viz: checkViz('Memory review: keep, edit or delete?', 'Memory entries separated by semicolons', 'Works as payroll officer at a school; Prefers bullet points; Is training for the 2025 marathon; Has a hospital appointment about anxiety; Manages the Henderson account',
    ['Saved memory', 'Question', 'Action'],
    'Review each saved memory: is it <b>still true</b>, is it <b>useful in most chats</b>, and is it <b>OK to keep</b>?',
    function (t) {
      if (has(t, ['hospital', 'anxiety', 'medical', 'health', 'divorce', 'debt', 'password'])) return ['Sensitive', 'Delete unless you truly want it used; consider a temporary/incognito chat next time.', 'bad'];
      if (has(t, ['2024', '2025', 'old', 'used to'])) return ['Outdated?', 'Edit or delete: stale facts quietly shape answers.', 'bad'];
      if (has(t, ['account', 'client', 'henderson', 'project'])) return ['One piece of work', 'Better in a project for that client than in general memory.', 'cur'];
      return ['General and true', 'Keep.', 'ok'];
    },
    function (g, n) { return g + ' of ' + n + ' memories are worth keeping as they are. Tidy the rest so they stop shaping unrelated answers.'; }),
  examples: [
    { title: 'An outdated memory', html: `<p>Ben changed jobs from retail to logistics, but the AI keeps framing answers around shops. He opens the memory list, finds "works as a retail store manager", and edits it. The next answers fit his new job.</p>` },
    { title: 'A private question', html: `<p>Before asking about a family member's medical condition, Hana starts a temporary (ChatGPT) or incognito (Claude) chat, so nothing from it is added to memory or influences later work chats.</p>` },
    { title: 'Keeping clients apart', html: `<p>A consultant uses one project per client and, in Claude, turns off the project's use of account memory for a confidential client, so nothing from other chats leaks in.</p>` }
  ],
  deepDive: `<p><b>Deleting a chat is not always deleting a memory.</b> OpenAI notes that deleting a ChatGPT conversation does not remove a saved memory that came from it; you delete the memory separately. Check how your app handles this.</p>
  <p><b>Off is not the same as erased.</b> Switching memory off usually stops new memories and stops using old ones; it may not delete what is stored. Claude, for example, distinguishes pausing memory from resetting it, and resetting cannot be undone.</p>
  <p><b>Memory is a summary, not a recording.</b> Apps decide what seems worth remembering. They can get it wrong or miss what mattered. For anything important (a policy, a client's requirements), do not rely on memory; put it in a project file or the message.</p>
  <p><b>Workplace accounts:</b> administrators may turn memory features on or off for everyone, and data rules may differ from personal accounts. If memory behaves differently at work, that may be why.</p>`,
  aiEra: `<p><b>A newer feature:</b> memory across chats arrived in mainstream assistants only in the last few years and is still evolving quickly. It makes assistants feel more personal, but it also means the AI's picture of you is built partly without your typing it deliberately.</p>
  <p><b>The healthy habit:</b> treat memory like your phone's location or photo permissions. Know it is there, look at it occasionally, switch it off when it does not suit you, and use temporary or incognito chats for one-off private questions.</p>
  <p><b>In interviews and at work:</b> being able to explain these controls in plain words, and to help colleagues use them, is a practical sign of responsible AI use.</p>`,
  problems: [sp('Clean Up Memory Before a Sensitive Task', 'Medium', ['memory', 'privacy'],
    `<p>Grace is an HR assistant. Her AI app's memory list includes: "Works in HR at Corbin Logistics", "Prefers short answers", "Is dealing with a grievance from an employee called D. Patel", "Is pregnant", "Is learning Excel (2024)". She is about to use AI to help draft general staff guidance on flexible working. What should she change and how should she run the task?</p>`,
    `<p>Assume her app lets her view, edit and delete memories and offers a temporary or incognito chat.</p>`,
    `<p>"Is dealing with a grievance from D. Patel" names an employee in an ongoing case; it should not be stored in personal memory.</p>`,
    `Ignore memory and start drafting. The guidance might be shaped by the grievance or her own pregnancy, and an employee's name stays stored in a personal AI memory.`,
    mq('What is the right first step for the D. Patel memory?', ['Leave it, it helps context', 'Delete it, and keep case details only in approved HR systems', 'Rename it to "D.P."', 'Turn off the computer'], 1, 'Named employee cases are confidential HR data. Delete it from memory and keep case work in approved systems.'),
    [`<p>Hint 1: Go through each memory and ask: true? useful in most chats? OK to keep?</p>`, `<p>Hint 2: Personal and confidential items should be deleted, not just ignored, and work case details belong in approved systems.</p>`, `<p>Hint 3: For the guidance itself, consider whether personal memory should influence it at all; a project or a temporary chat may be cleaner.</p>`],
    `<p><b>Review memory:</b> keep "Works in HR at Corbin Logistics" and "Prefers short answers". <b>Delete</b> the D. Patel grievance memory (confidential, names an employee; also tell the AI "forget the grievance" and confirm it is gone from the list). <b>Delete or keep private</b> "Is pregnant": it is her own choice, but it could colour HR guidance, and it is personal health information. <b>Edit</b> "Is learning Excel (2024)" or delete it as outdated. <b>Run the task</b> in a project for HR policy writing that contains the company's current flexible-working policy and relevant legal summary from an approved source, with instructions like "Write neutral guidance for all staff; do not refer to any individual case". If she prefers, use a temporary or incognito chat so nothing personal is applied or saved. Finally, check the draft against the official policy and have HR leadership approve it.</p>`,
    ['How often should she review memory?', 'What would she tell a colleague who has never opened the memory settings?'])]
});

// ---------- TOPIC 7 ----------
topics.push({
  title: 'Reusable Prompt Templates for Your Job',
  analogy: `<p>A good recipe card lets you cook the same dish well every time without thinking hard, and you only change the ingredients that vary (two servings or six). A prompt template is your recipe card for a task you do every week: fixed steps written once, with blanks for the parts that change.</p>`,
  explain: `<p><b>The plain idea:</b> a <b>prompt template</b> is a saved request with <b>fixed parts</b> (role, goal, audience, format, rules) and <b>blanks</b> for what changes each time, often written in square brackets like [CUSTOMER EMAIL] or [DATE]. You keep it somewhere handy (a document, a notes app, a text-expander, or the instructions of a project or Gem) and fill in the blanks when you need it.</p>
  <p><b>How to build one in four steps:</b></p>
  <ol>
    <li><b>Pick a task you repeat</b> at least weekly: meeting notes, customer replies, job adverts, lesson plans, weekly updates.</li>
    <li><b>Write one excellent request by hand</b> using the briefing recipe, and keep improving it until the answer needs little editing.</li>
    <li><b>Mark the parts that change</b> with clear blanks in capitals and square brackets.</li>
    <li><b>Test it on three different real cases</b> (a simple one, a messy one, an unusual one). Fix what breaks.</li>
  </ol>
  ${H.table(['Part', 'Example (weekly team update)'], [
    ['Role and goal (fixed)', '"You help me write the weekly update for my operations team."'],
    ['Audience (fixed)', '"Read by 12 warehouse supervisors on their phones."'],
    ['Format (fixed)', '"Three headings: Done, Coming up, Help needed. Under 200 words. No jargon."'],
    ['Rules (fixed)', '"Only use the notes I give. If something is unclear, list it at the end as a question."'],
    ['Blank (changes)', '"Notes for this week: [PASTE NOTES]"']
  ])}
  <p><b>Template or project?</b> A template is portable: you can paste it into any app, or share it in a team document. A project or Gem stores the fixed parts inside one app so you only paste the blank. Many people do both: write the template first, then turn it into a project once it works.</p>`,
  clues: ['"I write the same kind of request every week" → turn it into a template with blanks', 'Results vary a lot week to week → the fixed parts are not written down', 'A colleague asks "what do you type to get that?" → share the template', 'Template gives poor results on unusual cases → test on varied examples and add rules', 'Interview: "How would you roll out AI to your team?" → shared, tested templates for common tasks'],
  viz: checkViz('Is this line fixed or a blank?', 'Template lines separated by semicolons', 'You help me reply to customer complaints for an online plant shop; Customer email: [PASTE EMAIL]; Tone: warm, apologetic, no blame; Order number: [ORDER NO]; Under 120 words; Offer only what our policy allows: [POLICY OPTION]',
    ['Template line', 'Type', 'Comment'],
    'A template mixes <b>fixed parts</b> (the same every time) and <b>blanks</b> (in square brackets) that you fill in.',
    function (t) {
      if (t.indexOf('[') >= 0 && t.indexOf(']') > t.indexOf('[')) return ['Blank', 'Fill this in each time; never leave the brackets in.', 'cur'];
      return ['Fixed', 'Written once, tested, reused.', 'ok'];
    },
    function (g, n) { return g + ' of ' + n + ' lines are fixed and tested once. The blanks are all you change each time, so results stay consistent.'; }),
  examples: [
    { title: 'Recruiter: job advert template', html: `<p>"You write job adverts for [COMPANY], a [SIZE/TYPE] organisation. Role: [JOB TITLE]. Key duties: [LIST]. Must-haves: [LIST]. Salary: [RANGE]. Write a 250-word advert in plain English, avoid gendered or age-coded words, and end with how to apply: [HOW]."</p>` },
    { title: 'Teacher: parent email template', html: `<p>"Write a short, friendly email to parents of Year [X] about [EVENT] on [DATE]. Include what to bring: [ITEMS]. Reading age about 12. Under 120 words. Do not add any details I have not given."</p>` },
    { title: 'Testing catches a gap', html: `<p>A support template worked for normal complaints but promised refunds to customers outside the 30-day window. Adding the rule "If the order is older than 30 days, offer store credit only" fixed it. Testing on an unusual case found the gap before a customer did.</p>` }
  ],
  deepDive: `<p><b>Write blanks that cannot be missed.</b> Use capitals and brackets ([CUSTOMER NAME]), and add a rule "If any bracket is still unfilled, stop and ask me". This prevents sending "Dear [NAME]" to a client.</p>
  <p><b>Include a "what good looks like" example.</b> One short sample answer inside the template makes results much more consistent than a description of the style.</p>
  <p><b>Version your templates.</b> Put a date or version at the top. When you improve one, note why ("v3: added 30-day refund rule"). In a team, one person owns each template.</p>
  <p><b>Store them where you work.</b> A shared document, a team wiki, a notes app or a text-expander tool. If your organisation's AI app supports shared projects or Gems, a tested template can become one.</p>
  <p><b>Check outputs still.</b> A template makes results consistent, including consistently wrong if the template has a flaw. Spot-check regularly.</p>`,
  aiEra: `<p><b>From one clever user to a whole team:</b> templates are how good AI practice spreads in an organisation. Instead of everyone experimenting alone, the best tested requests become shared tools, much like shared email templates or checklists.</p>
  <p><b>Your job, made reusable:</b> the most useful templates encode what <i>you</i> know: your audience, your standards, the mistakes to avoid. That knowledge is why your templates work better than generic ones found online.</p>
  <p><b>Next step:</b> once a template is stable, you can often move it into a project or Gem, and later into simple automations (covered in later modules of this section).</p>`,
  problems: [sp('Turn a Repeated Request into a Template', 'Medium', ['templates', 'reuse'],
    `<p>Every Monday, Jordan (an events coordinator) asks AI to turn booking notes into a confirmation email for each venue. Last week's request was: "Write a confirmation to The Old Mill for our team away-day on 14 November, 25 people, arriving 9:30, need vegetarian lunch for 6 and a projector. Friendly, short, sign off as Jordan." Turn this into a reusable template and say how Jordan should test it.</p>`,
    `<p>The template should work for any venue and event.</p>`,
    `<p>"The Old Mill" changes every time, so it becomes [VENUE NAME].</p>`,
    `Copy last week's request and edit the details by hand each time. One week Jordan forgets to change the date and confirms the wrong day.`,
    mq('Which rule best prevents a half-filled template being sent?', ['"Be accurate"', '"If any [BRACKET] is unfilled, ask me instead of writing"', '"Use capital letters"', '"Check your work"'], 1, 'A concrete stop rule turns a silent mistake into a question.'),
    [`<p>Hint 1: Underline every detail that would change next week: venue, date, numbers, needs.</p>`, `<p>Hint 2: Keep the fixed parts (tone, length, sign-off, what to include) as written rules.</p>`, `<p>Hint 3: Test with a simple booking, one with many special needs, and one with a missing detail.</p>`],
    `<p><b>Template:</b> "You write booking confirmation emails for me, Jordan, events coordinator at [COMPANY]. Venue: [VENUE NAME]. Event: [EVENT TYPE] on [DATE], [NUMBER] people, arriving [TIME]. Catering: [CATERING DETAILS, including dietary needs with numbers]. Equipment: [EQUIPMENT]. Other requests: [OTHER or NONE]. Write a friendly email under 120 words that confirms every detail above as a short list, asks the venue to reply to confirm, and signs off as Jordan. Do not add details I have not given. If any [BRACKET] is unfilled, ask me instead of writing." <b>Testing:</b> (1) last week's Old Mill booking, compared with the email actually sent; (2) a booking with three dietary needs and accessibility requirements, to check nothing is dropped; (3) a booking with the time left blank, to check it asks. Save as "Venue confirmation v1" in a shared doc, and consider moving the fixed part into a project.</p>`,
    ['How would you adapt it for cancellations?', 'Who should own the template if the team shares it?'])]
});

// ---------- TOPIC 8 ----------
topics.push({
  title: 'Long Conversations, Drift, Starting Fresh and Checking Against Your Sources',
  analogy: `<p>A long phone call that wanders across ten topics ends with both people fuzzy on what was agreed at the start. A fresh call with a short recap ("Here is where we got to") is clearer. AI chats work the same way. And just as you would check a colleague's figures against the original spreadsheet before sending them to the boss, you check AI answers against your sources.</p>`,
  explain: `<p><b>Why answers drift.</b> In a long chat, everything said so far is part of the context. Over time:</p>
  <ul>
    <li>Early instructions get <b>outweighed</b> by everything after them, so the AI starts ignoring "keep it under 100 words".</li>
    <li>Old drafts, corrections and abandoned ideas <b>pile up</b>, and the AI may mix bits of version 2 into version 5.</li>
    <li>Very long chats can exceed what the app keeps in view, so it may <b>summarise or drop</b> older parts.</li>
    <li>A wrong assumption early on keeps <b>shaping</b> later answers.</li>
  </ul>
  <p><b>When to start fresh:</b> the topic has changed; the AI keeps repeating a mistake after two corrections; it has forgotten an instruction; or the chat is long and messy. <b>How:</b> ask the AI for a short summary of decisions so far, check and correct it, then paste it into a new chat (or into a project) along with the latest version of the work.</p>
  <p><b>Checking against your sources.</b> AI can state wrong facts confidently, sometimes called <b>hallucination</b> (making up plausible-sounding details). Even with your files attached it can misread a number or mix two documents. Before anything important leaves your hands:</p>
  ${H.table(['Check', 'How'], [
    ['Names, numbers, dates', 'Compare each one with the original document or system'],
    ['Quotes and claims about a file', 'Ask for the exact quote and where it is, then look'],
    ['Policies, law, money, health', 'Check the official source or ask the responsible person'],
    ['Anything not in your sources', 'Ask "which parts are not from my documents?" and treat those as unverified'],
    ['Overall sense', 'Would you sign your name to it? If not, fix it']
  ])}`,
  clues: ['"It forgot what I told it earlier" → long chat drift; restate or start fresh with a summary', 'The same mistake comes back after two corrections → start a new chat', 'Old draft wording reappears → too many versions in one chat', 'A precise number or quote you did not expect → check it against the source', 'Interview: "How do you make sure AI output is accurate?" → sources, quotes, spot checks, human sign-off'],
  viz: {
    title: 'A conversation drifting, and the reset',
    input: '100',
    inputLabel: 'Word limit you gave at the start (20-500)',
    gen: function (inp) {
      var lim = parseInt(String(inp).trim(), 10);
      if (!(lim >= 20 && lim <= 500)) throw new Error('Enter a word limit between 20 and 500, for example 100');
      var lens = [Math.round(lim * 0.9), Math.round(lim * 1.0), Math.round(lim * 1.3), Math.round(lim * 1.7), Math.round(lim * 2.1), Math.round(lim * 0.95)];
      var labels = ['Turn 1', 'Turn 4', 'Turn 9', 'Turn 15', 'Turn 22', 'New chat'];
      var notes = ['Instruction fresh: answer is within the limit.', 'Still fine; the instruction is recent.', 'Many messages later, answers creep longer. The early instruction is getting outweighed.', 'Old drafts and side topics fill the chat; the limit is mostly ignored.', 'You correct it twice, but it keeps slipping. Time to reset.', 'New chat with a short checked summary plus the instruction: back within the limit.'];
      var frames = [];
      for (var i = 0; i < lens.length; i++) {
        var hl = {}; for (var j = 0; j <= i; j++) hl[j] = lens[j] > lim ? 'bad' : 'ok'; hl[i] = i === lens.length - 1 ? 'sel' : (lens[i] > lim ? 'bad' : 'cur');
        frames.push({ narr: '<b>' + labels[i] + '</b>: about ' + lens[i] + ' words (limit ' + lim + '). ' + notes[i], parts: [{ type: 'bars', label: 'Answer length per turn', values: lens.slice(0, i + 1), idxLabels: labels.slice(0, i + 1), hl: hl }] });
      }
      return frames;
    }
  },
  examples: [
    { title: 'Reset with a summary', html: `<p>After 40 messages planning a conference, the AI keeps suggesting a venue the team already rejected. Rahul asks: "Summarise the decisions we have made, in 10 bullets." He corrects two bullets, opens a new chat, pastes the summary and continues. The rejected venue never comes back.</p>` },
    { title: 'Checking a figure', html: `<p>An AI summary of a grant report says "funding rose 18%". Checking the attached report shows 8%. The AI misread a table. Asking "quote the line that gives this figure" would have caught it immediately.</p>` },
    { title: 'Not in the sources', html: `<p>A policy summary includes a sentence about a "14-day cooling-off period" that is not in the company policy at all; it came from general knowledge. Asking "Which statements are not from the attached document?" flags it.</p>` }
  ],
  deepDive: `<p><b>Why corrections stop working.</b> Each correction adds more text, including the wrong version you are correcting. After a few rounds, the chat contains several wrong versions and one right instruction; a fresh start removes the clutter.</p>
  <p><b>Summaries can also be wrong.</b> When you ask the AI to summarise a long chat before resetting, read the summary carefully. A mistake in it is carried forward into every later answer.</p>
  <p><b>Grounding.</b> Telling the AI "use only the attached documents; if the answer is not there, say so" reduces made-up facts but does not remove them. Asking for quotes with locations makes checking quick.</p>
  <p><b>Web search features.</b> When the AI searches the web, it may show links. Open the important ones: a link can be real while the claim attributed to it is wrong or out of date.</p>
  <p><b>You are accountable.</b> Your name is on the email, report or decision. "The AI said so" is not accepted as an excuse by managers, clients or regulators.</p>`,
  aiEra: `<p><b>Bigger memories, same habits:</b> AI apps can handle longer conversations than before, and some summarise older parts automatically. That helps, but drift still happens, and automatic summaries can drop the one instruction you cared about. Starting fresh deliberately is still a useful skill.</p>
  <p><b>Checking is the new proofreading:</b> as AI drafts more of our work, the human role shifts from writing every word to checking facts, judging tone and approving. Building a habit of quick, targeted checks (names, numbers, dates, quotes, policy) is what makes AI safe to use at work.</p>
  <p><b>A simple routine:</b> brief well → draft → check against sources → fix → approve. If a chat gets messy, summarise, reset and continue.</p>`,
  problems: [sp('Fix a Drifting Conversation', 'Hard', ['drift', 'fresh start', 'verification'],
    `<p>Nadia has spent 60 messages with an AI on a proposal for a new staff wellbeing programme. At the start she said: "Budget is 12,000 pounds, audience is the leadership team, maximum 2 pages." Now the AI writes 4 pages, mentions a 20,000-pound budget, and keeps adding a gym membership idea she rejected. Give a step-by-step plan to recover, and say what she must check before sending.</p>`,
    `<p>Assume her app has projects and lets her start new chats. Do not rely on the AI fixing itself in the same chat.</p>`,
    `<p>Correcting it a third time in the same chat adds more noise; the rejected gym idea is still in the history.</p>`,
    `Keep correcting in the same chat: "No, 12,000! No gym!" Each round adds more text, the old wrong versions stay in view, and drift continues.`,
    mq('What is the best first move?', ['Correct it again, more firmly', 'Ask for a summary of decisions, check it, and start a new chat with it', 'Delete the app', 'Accept the 4 pages'], 1, 'A checked summary in a fresh chat removes the clutter and the wrong versions while keeping the decisions.'),
    [`<p>Hint 1: Separate what was decided from all the drafts and dead ends in the chat.</p>`, `<p>Hint 2: A new chat (ideally in a project with the fixed facts as instructions) starts clean.</p>`, `<p>Hint 3: Before sending, check every number, claim and idea against her own notes and the approved budget.</p>`],
    `<p><b>Recover:</b> (1) In the old chat, ask: "List the decisions we have made: budget, audience, length, ideas accepted, ideas rejected." (2) Read and correct the list herself: budget 12,000 pounds, leadership audience, 2 pages, gym membership rejected. (3) Create a project (or a fresh chat) with instructions: "Proposal for the leadership team. Budget is exactly 12,000 pounds. Maximum 2 pages (about 800 words). Do not include gym membership. Use only the ideas listed." Add the latest good draft as a file. (4) Ask for a revised draft and an outline first if the structure has wandered. <b>Check before sending:</b> every number against the approved budget sheet; every claim about benefits or costs against her sources (ask "which statements are not from my notes?"); length; that rejected ideas are gone; tone fits leadership. Then she reads it as if she were the director. This fixes drift (fresh context), prevents repeats (clear rules), and catches errors (source checks).</p>`,
    ['How could she avoid this next time?', 'What if the AI\'s summary of decisions is itself wrong?'])]
});

// ---------- PRACTICE ----------
function P(title, level, tags, statement, example, weak, mcq, hints, approach) {
  practice.push(sp(title, level, tags, statement, '<p>No technical knowledge needed. Invent realistic details where the scenario leaves gaps, and keep to your employer\'s AI policy.</p>', example, weak, mcq, hints, approach, ['What would you check before using the answer?', 'How would you explain your choice to a colleague?']));
}
P('Add the Audience', 'Easy', ['briefing', 'audience'],
  `<p>A clinic receptionist asks AI: "Explain our new online booking system." The explanation is accurate but full of terms like "portal" and "two-factor authentication", and patients are confused. Rewrite the request.</p>`,
  `<p>The real readers are elderly patients, many not confident online.</p>`,
  `"Explain it more simply." Better, but the AI still does not know who the readers are or what they need to do.`,
  mq('What was mainly missing?', ['A role', 'The audience and what they need to do', 'The word "please"', 'A longer request'], 1, 'Without the audience, the AI wrote for a general, more technical reader.'),
  [`<p>Hint 1: Describe the readers: age, confidence with technology, what they want to achieve.</p>`, `<p>Hint 2: Ask for steps they can follow, in a format they can print or read on a phone.</p>`, `<p>Hint 3: Ban or explain the confusing words, and give a reading level and length.</p>`],
  `<p>"Explain our new online booking system to patients aged mostly over 65, many not confident with computers or smartphones. Goal: they can book a GP appointment on their own. Format: a numbered list of at most 7 steps, one short sentence each, suitable to print on one A5 sheet. Avoid technical words; if you must use one (such as 'code sent by text message'), explain it in brackets. End with the phone number for help: [NUMBER]. Here are the actual steps from our system guide: [PASTE]." This fixes the audience, the goal, the format and the facts, so the explanation fits the patients rather than a generic reader.</p>`);
P('One Example Beats a Paragraph', 'Easy', ['examples', 'style'],
  `<p>A café owner writes three paragraphs describing her "cosy, slightly cheeky, local" Instagram voice, but the AI's captions sound like a bank. What should she change?</p>`,
  `<p>She has 30 old captions she wrote herself that customers loved.</p>`,
  `Add more adjectives: "very cosy, extra cheeky, super local". Adjectives are vague; the AI still has to guess what she means.`,
  mq('What should she add?', ['More adjectives', 'Two or three of her own captions as examples', 'A request to "be creative"', 'A longer description of the café'], 1, 'Real examples show the style precisely.'),
  [`<p>Hint 1: The AI copies patterns it can see better than ones it is told about.</p>`, `<p>Hint 2: Choose examples that differ from each other so it copies the voice, not the words.</p>`, `<p>Hint 3: Say "match the style and length, not the exact phrases", and give this week's facts.</p>`],
  `<p>Paste two or three of her best past captions, chosen to be different (a new cake, a rainy day, a staff birthday), then: "Write a caption in the same voice and length for: new pumpkin muffins, Saturday only, 3 pounds. Match the style, not the exact phrases. One emoji at most." Then save the examples and rules in a project or Gem so she only types the new item each week. Examples work because "cosy and cheeky" means different things to different writers, while her real captions show exactly what she means.</p>`);
P('Temporary Chat for a Private Question', 'Easy', ['memory', 'privacy'],
  `<p>Sam uses ChatGPT for work with memory turned on. He wants to ask about his own debt problems privately and does not want this to affect work chats. What should he do?</p>`,
  `<p>He does not want to turn memory off permanently.</p>`,
  `Ask in a normal chat and hope it is not remembered. It may be saved and influence later answers.`,
  mq('Which option fits best?', ['A normal chat', 'A Temporary Chat, which does not use or create memories', 'Custom instructions', 'A shared project'], 1, 'OpenAI states Temporary Chats do not reference or create memories.'),
  [`<p>Hint 1: Look for an option that is separate from memory just for this one chat.</p>`, `<p>Hint 2: ChatGPT calls it Temporary Chat; Claude calls the similar feature an incognito chat.</p>`, `<p>Hint 3: Afterwards, check the memory list in settings to make sure nothing was saved from earlier chats about it.</p>`],
  `<p>Start a <b>Temporary Chat</b>, which OpenAI says does not reference memories or create new ones. Ask the question there. Afterwards, open Settings → Personalization → manage memories and delete anything about debt from earlier chats, because turning memory off later would not delete it. Also remember the answer is general information: for real debt advice, he should check with a free, reputable debt advice service in his country. This keeps the private topic separate, keeps memory on for work, and points him to a reliable source.</p>`);
P('Choose the Right Home for Each Instruction', 'Medium', ['custom instructions', 'projects', 'templates'],
  `<p>A marketing assistant has five things she keeps typing: (a) "I work for a vegan skincare brand", (b) "UK spelling", (c) the 12-page brand guide, (d) "This post is for Black Friday", (e) a weekly "summarise these campaign numbers into 5 bullets for my manager" request. Place each in custom instructions, a project, a template, or the message.</p>`,
  `<p>(b) applies to every chat she ever has.</p>`,
  `Put everything in custom instructions. Black Friday then appears in every chat for weeks, and the 12-page guide cannot go there anyway.`,
  mq('Where should the weekly summary request go?', ['Custom instructions', 'A reusable template (or a project for campaign reporting)', 'Memory', 'Nowhere'], 1, 'It repeats weekly with changing numbers: a template with a blank, or a project.'),
  [`<p>Hint 1: Ask how often each item applies: every chat, one kind of work, or one task.</p>`, `<p>Hint 2: Long reference documents belong as files in a project.</p>`, `<p>Hint 3: A repeated request with changing data is the definition of a template.</p>`],
  `<p>(a) and (b) → <b>custom instructions</b>: true for nearly every chat. (c) → <b>a project</b> for brand content, as a knowledge file with instructions "follow the brand guide". (d) → <b>the message</b>: one campaign, one time. (e) → <b>a template</b>: "Summarise the campaign numbers below into 5 bullets for my manager, biggest change first, plain English, no more than 80 words: [PASTE NUMBERS]", possibly stored in a reporting project. Matching each item to how widely and how long it applies keeps chats briefed without leaks.</p>`);
P('Brief for a File Summary', 'Medium', ['files', 'verification'],
  `<p>A council officer must summarise a 90-page consultation report for councillors. Her first attempt, "summarise the attached", gave a bland overview that missed objections from residents. Write a better request.</p>`,
  `<p>Councillors care most about residents' objections and costs.</p>`,
  `"Summarise the attached in more detail." Longer, but still not focused on what councillors need, and nothing to check against.`,
  mq('Which addition makes the summary easiest to check?', ['"Be accurate"', '"Give page numbers and short quotes for each key point"', '"Use bullet points"', '"Write more"'], 1, 'Page numbers and quotes let her verify each point quickly.'),
  [`<p>Hint 1: Say who reads it and what they care about most.</p>`, `<p>Hint 2: Name the sections or themes to cover so nothing key is skipped.</p>`, `<p>Hint 3: Ask for page references and quotes, and for anything uncertain to be flagged.</p>`],
  `<p>"Attached: the 2026 Riverside Parking consultation report (90 pages). Audience: councillors deciding next week, who have 5 minutes to read. Summarise in at most 1 page: (1) the proposal in 2 sentences; (2) the main resident objections, grouped into themes, with how many responses mention each if the report gives numbers; (3) costs and who pays; (4) open questions. For each point give the page number and a short quote. Use only the report. If something is unclear or missing, say so rather than guess." Then she checks several quotes and every figure against the pages given. Focus, structure and references turn a bland overview into a checkable briefing.</p>`);
P('Spot the Drift', 'Medium', ['drift', 'fresh start'],
  `<p>A recruiter's 50-message chat with AI about job adverts starts mixing details: a nurse advert mentions "coding skills" from an earlier software role. What is happening and what should he do?</p>`,
  `<p>He wrote adverts for four different roles in the same chat.</p>`,
  `Tell it "no coding for nurses" and continue. Two more roles later, it borrows something else from earlier adverts.`,
  mq('Why did "coding skills" appear?', ['The AI thinks nurses code', 'Earlier adverts in the same chat are still in its context and bleed into new ones', 'A bug in the app', 'Custom instructions'], 1, 'Everything in the chat is context; earlier roles bleed into later ones.'),
  [`<p>Hint 1: Think about what is in the context when he asks for the nurse advert.</p>`, `<p>Hint 2: Separate tasks need separate chats, or a template that starts each one clean.</p>`, `<p>Hint 3: Check each advert against the actual job description before posting.</p>`],
  `<p>This is context bleed in a long chat: the software advert is still in view and its details leak into the nurse advert. Fix: start a <b>new chat per role</b>, using a tested job-advert template (or a recruitment project whose instructions hold the fixed rules, such as inclusive language and length). Paste only that role's job description. Before posting, compare the advert line by line with the official job description: duties, requirements, salary and location. One role per chat stops the bleed; checking catches anything that still slips through.</p>`);
P('Memory Is Getting in the Way', 'Medium', ['memory', 'control'],
  `<p>Lin used Claude to plan her wedding last year. Now, at work, its answers keep suggesting "celebration" themes and mention her partner. What should she do in the app, and what should she do in future?</p>`,
  `<p>She wants to keep some useful memories about her job.</p>`,
  `Turn off memory entirely and lose the useful parts, or ignore it and keep getting odd answers.`,
  mq('What is the most targeted fix?', ['Delete her account', 'Open memory settings and delete or edit the wedding-related memories', 'Write "ignore weddings" in every message', 'Use a different computer'], 1, 'Editing specific memories fixes the cause and keeps the useful ones.'),
  [`<p>Hint 1: Find where the app lets you view saved memory.</p>`, `<p>Hint 2: Delete only what no longer applies; keep the work-related memories.</p>`, `<p>Hint 3: For future personal planning, use a separate project or an incognito chat.</p>`],
  `<p>In Claude, open the memory section of Settings (Anthropic's help describes a Manage option next to your memory), read the topics, and delete or edit those about the wedding and her partner, keeping the job-related ones. She can also tell Claude in chat "forget the wedding planning" and then confirm in the list. In future, keep personal planning in its own project (Claude keeps a separate memory per project, and a project can be set not to use account memory) or use an incognito chat. Targeted edits keep the benefits of memory without the leaks.</p>`);
P('Design a Gem for a Repeated Task', 'Medium', ['gems', 'projects'],
  `<p>A property manager writes about ten repair-request replies a week in Gemini at work. Each must confirm the issue, give a priority (emergency within 24 hours, urgent within 5 days, routine within 28 days) and say what the tenant should do now. Design a Gem: name, instructions and knowledge files.</p>`,
  `<p>The priority rules come from the company's repairs policy.</p>`,
  `Write each reply from scratch in a normal chat, re-explaining the priority rules each time and sometimes getting them wrong.`,
  mq('Where should the priority rules live?', ['Typed into each request', 'In the Gem\'s instructions, with the full repairs policy as a knowledge file', 'In memory', 'In custom instructions'], 1, 'Rules in the instructions and the full policy as knowledge make every chat consistent.'),
  [`<p>Hint 1: List what never changes between replies: tone, structure, priority rules.</p>`, `<p>Hint 2: Put rules in instructions; put the policy document in knowledge.</p>`, `<p>Hint 3: Tell it what to do when the priority is unclear, and what each reply must include.</p>`],
  `<p><b>Name:</b> "Repair replies". <b>Instructions:</b> "You draft replies to tenants' repair requests for [COMPANY]. Classify each request using the attached repairs policy: emergency (attend within 24 hours), urgent (within 5 days), routine (within 28 days). Each reply: thank the tenant, restate the problem in one sentence, state the priority and timeframe, give any safety step to take now (from the policy only), and give the contact number. Under 120 words, plain and polite. If the priority is unclear, say so at the top for me to decide; never promise a date. Do not invent safety advice." <b>Knowledge:</b> the current repairs policy (dated) and two good past replies. Each week he pastes the tenant's message only, then checks the priority against the policy before sending. Gems can be shared with colleagues if their accounts allow it.</p>`);
P('Untangle a Shared Project', 'Hard', ['projects', 'team', 'maintenance'],
  `<p>A team of five shares a customer-support project. Answers have become inconsistent: some quote last year's returns window (60 days) instead of this year's (30 days). The project has 14 files, including three versions of the returns policy, and instructions written by someone who left. Plan a clean-up.</p>`,
  `<p>Assume sharing is available on their business plan and one person can edit the project.</p>`,
  `Add a fourth file called "returns policy FINAL". Now there are four versions and the AI may still pick an old one.`,
  mq('What is the main cause of the wrong answers?', ['The AI is broken', 'Outdated, conflicting files in the project knowledge', 'Too few files', 'The team types too fast'], 1, 'Conflicting versions mean the AI may use whichever looks relevant, including the old one.'),
  [`<p>Hint 1: Conflicting files are the root cause. One fact should live in one current file.</p>`, `<p>Hint 2: Re-read the instructions as if new: are they still true, and do they say what to do when unsure?</p>`, `<p>Hint 3: Give the project an owner and a review routine, and test it on known questions after cleaning.</p>`],
  `<p>(1) <b>Inventory:</b> list all 14 files with date and purpose. (2) <b>Remove</b> old policy versions and anything outdated or duplicate; keep one current returns policy named with its date ("Returns policy 2026-09"). (3) <b>Rewrite instructions:</b> "Answer only from the knowledge files. Returns window is defined in the returns policy file. Quote the section you used. If the files do not answer the question, say so and suggest escalation." (4) <b>Test</b> with ten real past questions whose correct answers are known, including returns at day 29 and day 45. (5) <b>Assign an owner</b> who updates files when policy changes and reviews the project monthly. (6) <b>Tell the team</b> what changed and to check quoted policy sections before replying. One current source, clear rules, tests and ownership turn a messy shared project back into a reliable tool.</p>`);
P('Build a Template Library for a New Starter', 'Hard', ['templates', 'onboarding'],
  `<p>You are a team leader in an insurance claims office. New staff use AI inconsistently and sometimes paste customer data into personal accounts. Design a small starter kit: which three templates you would write, where they live, and the rules that go with them.</p>`,
  `<p>Your company provides an approved work AI tool; personal accounts are not allowed for customer data.</p>`,
  `Send new starters a link to a "100 best prompts" website. Generic, untested, and nothing about your rules or data.`,
  mq('Which rule belongs at the top of every template?', ['"Be creative"', '"Use the approved work tool only; never paste customer names, policy numbers or medical details into personal accounts"', '"Write long answers"', '"Use emojis"'], 1, 'Data rules must travel with the templates so they are seen every time.'),
  [`<p>Hint 1: Pick the three most frequent writing tasks in a claims office.</p>`, `<p>Hint 2: Each template needs fixed parts, clear blanks, and a checking step.</p>`, `<p>Hint 3: Store them where staff already work, with an owner, a version and the data rules.</p>`],
  `<p><b>Templates:</b> (1) <i>Claim acknowledgement letter</i>: fixed tone, required items (reference, next steps, timescale), blanks for [CLAIM TYPE] and [DATE RECEIVED]; (2) <i>Summarise a claim file for a handler</i>: fixed headings (what happened, documents received, missing items, open questions), "quote the document for each fact", "do not assess liability"; (3) <i>Plain-English explanation of a decision</i>: reading age about 12, "use only the decision notes provided", "never state a payout amount not given". <b>Where:</b> as shared projects in the approved work tool if it supports them, plus a team document with the same text, each with a version and owner. <b>Rules on top:</b> approved tool only; no customer data in personal accounts; check every name, number and date against the claim system; the handler, not the AI, makes and signs decisions. <b>Rollout:</b> a 30-minute walkthrough, then review ten outputs per starter in week one. This makes good practice the easy default.</p>`);
P('Rescue a Messy Report Chat', 'Hard', ['drift', 'verification', 'projects'],
  `<p>A charity's fundraising officer has a 120-message chat drafting an annual impact report. It now contains three versions of the numbers (draft, revised, final), two abandoned structures, and comments from four colleagues pasted in. The latest draft says 4,200 families helped; the final figures say 3,850. Plan the rescue and the checks.</p>`,
  `<p>The report goes to donors, so wrong numbers would damage trust.</p>`,
  `Ask "please use the final numbers" and carry on. The AI has three sets of numbers in view and may mix them again in the next section.`,
  mq('Why is "please use the final numbers" not enough?', ['The AI cannot read', 'All three versions remain in the chat, so mixing can continue', 'Numbers are not allowed', 'It is enough'], 1, 'Clearing the old versions out of the context is the real fix.'),
  [`<p>Hint 1: The context holds conflicting numbers. The fix is to remove the old ones, not to argue with them.</p>`, `<p>Hint 2: Put the single final figures in one file and the agreed structure in instructions.</p>`, `<p>Hint 3: Check every number in the final draft against the finance-approved figures, not against the chat.</p>`],
  `<p>(1) <b>Decide the facts yourself:</b> get the finance-approved figures sheet; it is the only source of numbers. (2) <b>Summarise and choose:</b> ask the old chat for the agreed structure and key messages, then correct it. (3) <b>Start clean:</b> create a project "Impact report 2026" with instructions ("Use only the figures file for numbers; quote the line used; if a number is missing, write [CHECK]"), the figures file, the agreed structure, and a short, edited list of colleague comments that were accepted. (4) <b>Redraft section by section</b> in fresh chats. (5) <b>Check:</b> list every number in the draft and tick each against the figures sheet (3,850, not 4,200); check stories and quotes have permission; ask "which statements are not supported by the files?"; have a second person read it. Clean context plus source checks protects donor trust.</p>`);
P('Set Up Context for a Whole Role', 'Hard', ['custom instructions', 'projects', 'memory', 'templates'],
  `<p>Fatima has just become an operations manager at a mid-sized nursery chain. She will use one approved AI app for: weekly staff rotas notes, parent communications, Ofsted-style policy summaries, and personal learning about management. Design her complete setup: custom instructions, projects, memory settings and templates, and explain why each piece goes where it does.</p>`,
  `<p>Children's data and staff personal data must not be shared with AI.</p>`,
  `One long chat for everything, with memory on and no rules. Parent letters pick up management jargon, policies get mixed, and sensitive data risks being remembered.`,
  mq('Which setup best keeps parent letters consistent?', ['Memory', 'A "Parent communications" project with tone rules and examples', 'One long chat', 'Custom instructions only'], 1, 'A dedicated project holds the rules and examples for that kind of writing only.'),
  [`<p>Hint 1: Separate what is true everywhere (custom instructions) from each area of work (projects).</p>`, `<p>Hint 2: Decide memory settings with privacy in mind, especially for children and staff data.</p>`, `<p>Hint 3: Templates cover the repeated tasks inside each project; checks cover facts and policy.</p>`],
  `<p><b>Custom instructions:</b> "I am an operations manager at a UK nursery chain. UK spelling. Be concise, recommendation first. Say when something depends on regulations and suggest checking the official guidance." <b>Projects:</b> (1) <i>Parent communications</i>: warm, plain tone rules, two approved past letters, "never include children's names or details"; (2) <i>Policy summaries</i>: current policy documents with dates, "quote section numbers; say if the policy does not cover it"; (3) <i>Rotas and operations</i>: instructions to work only with role codes, not staff names or health details; (4) <i>Management learning</i>: personal, no work data. <b>Memory:</b> review it monthly; keep it for general preferences; turn off account memory for projects where that is possible and helpful, and never let children's or staff personal data into it; use temporary or incognito chats for sensitive personal questions. <b>Templates:</b> parent letter, policy summary and weekly update, each with blanks and a "check against source" step. <b>Checks:</b> every policy claim against the official document; every date and number; a colleague reads anything going to all parents. Each piece sits where its scope matches, so context is always right and data stays safe.</p>`);

// ---------- QUIZ ----------
function Q(q, o, a, e) { quiz.push({ q: q, options: o, answer: a, explain: e }); }
Q('You ask an AI to "reply to this complaint" and it offers a refund your company does not give. Why?', ['It is being dishonest on purpose', 'It filled a missing fact with a typical guess', 'Refunds are always required by law', 'The app is broken'], 1, 'Missing context is filled with the most common pattern it has seen.');
Q('Which ingredient usually improves style matching the most?', ['A dramatic role like "world\'s best writer"', 'One or two real examples of the style you want', 'Saying "please"', 'Longer adjectives'], 1, 'Examples show the style precisely; descriptions are vague.');
Q('Which line belongs in custom instructions?', ['"This email is to the Henderson account"', '"Use British spelling"', '"Make this one under 50 words"', '"Here is the Q3 report"'], 1, 'Custom instructions are for things true in almost every chat.');
Q('According to OpenAI, inside a ChatGPT project, project instructions...', ['are ignored', 'override your general custom instructions', 'delete your memories', 'apply to all your other projects'], 1, 'OpenAI states project instructions apply inside that project and override global custom instructions.');
Q('What is a Gemini Gem?', ['A paid add-on for images', 'A custom version of Gemini with its own instructions and optional knowledge files', 'A type of memory', 'A file format'], 1, 'Gems are reusable, customised setups for repeated tasks.');
Q('In ChatGPT, what does a Temporary Chat do with memory?', ['Saves everything twice', 'Does not use or create memories', 'Deletes all memories', 'Shares memory with your team'], 1, 'OpenAI states Temporary Chats do not reference or create memories.');
Q('You turn off ChatGPT\'s saved memories. What happens to memories already saved?', ['They are deleted instantly', 'They are not deleted; you delete them separately', 'They move to a project', 'They are emailed to you'], 1, 'OpenAI notes turning memory off does not delete existing memories.');
Q('A project holds three versions of the same policy. What is the likely result?', ['The AI merges them perfectly', 'Answers may use an outdated version', 'The project stops working', 'Nothing changes'], 1, 'Conflicting files lead to inconsistent, sometimes outdated answers.');
Q('After two corrections, the AI keeps repeating the same mistake in a long chat. Best move?', ['Correct it in capital letters', 'Summarise decisions, check them and start a new chat', 'Give up on AI', 'Add more examples to the same chat'], 1, 'A fresh context without the wrong versions stops the repeat.');
Q('Best way to make an AI summary of a long document easy to check?', ['Ask it to be accurate', 'Ask for page numbers and short quotes for each point', 'Ask for a longer summary', 'Ask twice and pick the nicer one'], 1, 'Quotes and locations let you verify quickly.');
Q('What should a reusable template include for parts that change?', ['Nothing, you retype it', 'Clear blanks like [CUSTOMER NAME] and a rule to ask if any are unfilled', 'Random examples', 'The previous customer\'s details'], 1, 'Clear blanks plus a stop rule prevent half-filled requests.');
Q('Before attaching a spreadsheet of client feedback, what should you do first?', ['Nothing', 'Remove personal details not needed for the task and check your AI policy', 'Convert it to a picture', 'Add more columns'], 1, 'Share only what the task needs, under your employer\'s rules.');

// ---------- INTERVIEW ----------
function I(q, level, a, f) { interview.push({ q: q, a: a, level: level, followUps: f }); }
I('Why does an AI assistant give generic answers to vague requests?', 'B', `<p>It only works from what is in its context: my message, attached files, earlier messages and any saved settings. It does not know my company, audience or constraints. When those are missing it fills gaps with the most typical pattern it learned, which produces average, generic writing and occasionally confident wrong details. The fix is to give the facts a new colleague would ask for.</p>`, ['How would you get the AI to tell you what is missing?', 'Give an example from your own work.']);
I('Walk me through how you brief an AI for a task.', 'B', `<p>I cover role (whose voice), goal (what the result is for), audience (who reads it and what they know), format (length, structure, tone) and an example of good output, plus background facts and limits ("do not promise dates"). For larger pieces I ask for an outline first. I often finish with "ask me if anything important is missing". Then I check facts against my sources before using it.</p>`, ['Which ingredient do people most often forget?', 'When is a role alone not enough?']);
I('What is the difference between custom instructions, a project and memory?', 'I', `<p>Custom instructions are text I write once that applies to every chat: my role, spelling, preferred style. A project (or a Gem in Gemini) is a workspace for one area of work with its own instructions and files, applied to chats inside it. Memory is information the app carries across chats, often picked up automatically from what I say, which I can view, edit or turn off. General goes in instructions, one area of work in a project, and memory I review regularly.</p>`, ['What happens when they conflict?', 'Which would you use for a client style guide?']);
I('When would you set up a project or Gem instead of using a normal chat?', 'I', `<p>When a task repeats, needs the same reference documents each time, or should be kept separate from other work, for example weekly reports, one client's content, or support replies based on a policy. A project saves setup time, makes results consistent and, where sharing is available, lets a team use the same instructions. For a one-off question I use a normal chat. I also make sure someone owns the project and keeps its files current.</p>`, ['How do you stop project files going out of date?', 'What should never go in a shared project?']);
I('How do you control what an AI remembers about you?', 'I', `<p>I check the memory settings: in ChatGPT, Settings then Personalization lets me view and delete saved memories and turn memory or chat-history reference off; in Claude, a memory section in settings lets me read, edit or delete topics, pause or reset memory, and projects have separate memory. I know that turning memory off may not delete what is stored. For private one-off questions I use a temporary or incognito chat, and I review memories every few months for outdated or sensitive items.</p>`, ['Why might deleting a chat not be enough?', 'How would you explain this to a non-technical colleague?']);
I('What happens when you attach a file to an AI chat, and what do you watch out for?', 'B', `<p>The app usually extracts the text, or reads images, and adds it to the context. Clean digital documents work best; scans, handwriting, complex tables and hidden spreadsheet sheets can be misread or skipped, and very long files may be skimmed. The content is sent to the provider, so I remove personal or confidential data not needed and follow my employer's policy. I tell the AI what the file is for and ask for quotes and page numbers so I can check.</p>`, ['How would you handle a scanned invoice?', 'What would you never attach?']);
I('Why do long AI conversations drift, and what do you do about it?', 'I', `<p>Everything in the chat stays in context, so early instructions are outweighed by later text, old drafts and corrections pile up, and very long chats may be summarised or trimmed by the app. Wrong versions stay in view and get mixed back in. When the topic changes, an instruction is forgotten, or a mistake keeps returning after two corrections, I ask for a summary of decisions, correct it, and start a new chat or move the fixed facts into a project.</p>`, ['What if the summary is wrong?', 'How do you prevent drift in the first place?']);
I('How do you check that AI output is accurate before you use it?', 'B', `<p>I check names, numbers and dates against the original documents or systems, ask the AI to quote and locate the source of each key claim, and ask which statements are not from my documents so I can treat them as unverified. For policy, legal, financial or health matters I check the official source or the responsible person. Finally I ask whether I would sign my name to it, because I am accountable, not the tool.</p>`, ['Give an example of an error you caught.', 'How much checking is enough for a routine email?']);
I('How would you create a reusable prompt template for a task in your job?', 'I', `<p>I pick a task I repeat weekly, write one excellent request using role, goal, audience, format, examples and rules, and refine it until outputs need little editing. Then I replace the changing details with clear blanks such as [DATE] and add "if any bracket is unfilled, ask me". I test on a simple, a messy and an unusual case, fix gaps, and save it with a version number where I work, or move the fixed part into a project.</p>`, ['How would you share templates across a team?', 'What do you do when a template starts giving poor results?']);
I('A colleague says "AI is useless, it never understands what I want." How would you help?', 'A', `<p>I would look at one of their real requests together. Usually it lacks audience, purpose, format or facts. We would rewrite it with the briefing recipe, add an example of what good looks like, and compare the results. If they repeat that task, we would save it as a template or a project. I would also show them how to start fresh when a chat drifts and how to check facts, so they trust the output for the right reasons.</p>`, ['What if their task is not a good fit for AI?', 'How would you measure whether it helped?']);
I('How would you roll out good AI context habits across a non-technical team?', 'A', `<p>Start with the team's three most common writing tasks and build tested templates or shared projects for them, each with an owner, version and data rules (approved tool only, no personal data where not allowed). Run a short session on briefing, attaching files safely, memory controls, starting fresh and checking sources. Review sample outputs in the first weeks, collect what worked, and update templates. Measure time saved and error rates rather than how often people use the tool.</p>`, ['How do you handle someone using a personal account for customer data?', 'Who should own shared projects?']);
I('What are the risks of putting too much into custom instructions or memory?', 'A', `<p>Everything there shapes every chat, including unrelated ones, so specific details leak into odd places, like a sales promotion appearing in a condolence note. Outdated facts quietly skew answers, sensitive information can be stored and reused, and when answers go wrong it is harder to see why because these layers are often invisible. I keep standing instructions short and general, put work-specific context in projects or messages, and review memory regularly.</p>`, ['How would you debug an odd answer caused by a hidden setting?', 'What is a good length for custom instructions?']);

registerModule({
  id: 'ai34',
  title: 'AI for Everyone: Giving AI the Right Context',
  intro: `<p>An AI assistant only knows what you give it. This module is for people <b>without a technical background</b> who want better, more reliable answers at work. You will learn to brief an AI the way you would brief a new colleague, attach files safely, set up custom instructions, use projects and Gems for repeated work, control what the AI remembers, build reusable templates for your own job, recover when long chats drift, and check every answer against your sources.</p><p>No code. Every exercise is a real workplace scenario: rewriting vague requests, deciding where instructions belong, cleaning up memory, and rescuing a messy conversation. Product menus change often, so the lesson names features as they were described on official help pages in late 2026 and tells you to check your own app.</p>`,
  goals: [
    'Explain why an AI only knows what is in its context and spot the missing details in a request',
    'Rewrite vague requests using role, goal, audience, format, examples and limits',
    'Attach files safely, say what they are for, and ask for quotes you can check',
    'Decide what belongs in custom instructions, a project or Gem, a template, or a single message',
    'View, edit and turn off AI memory, and use temporary or incognito chats for private questions',
    'Recognise drift in long conversations, restart with a checked summary, and verify answers against your sources'
  ],
  prereqs: `<p>Take <b>ai33 "AI at Work Without Code"</b> first, so you are comfortable opening and chatting with an AI assistant. No technical knowledge is needed. Developers who want the technical side should continue with ai24 (Context Engineering for LLM Apps and Agents).</p>`,
  hours: 4,
  langExplain: `<p>This module has no code in any language: it is about everyday use of AI chat apps, so every exercise is a written scenario.</p>`,
  topics: topics, practice: practice, quiz: quiz, interview: interview
});
})();
