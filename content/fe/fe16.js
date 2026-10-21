(function () {
var topics = [], practice = [], quiz = [], interview = [];

// Small helper: one frame that shows a component tree (level-order array, null = missing child).
function treeFrame(narr, label, arr, hl, tags, extra) {
  return { narr: narr, parts: [{ type: 'tree', label: label, arr: arr, hl: hl || {}, tags: tags || {} }].concat(extra || []) };
}

/* ===================== TOPIC 1: The framework ===================== */
topics.push({
  title: 'The Frontend System Design Framework (RADIO)',
  analogy: `<p>Before a builder lays one brick, they ask the family: <i>how many bedrooms, what budget, any wheelchair users?</i> Then they draw a blueprint (rooms and walls), decide where the pipes and wires go (data), agree on the doors between rooms (interfaces), and finally add insulation and ramps (performance and accessibility). A frontend system design interview is the same: <b>ask, draw, plan the data, agree on the doors, then polish</b>. Nobody wants a builder who starts with bricks.</p>`,
  explain: `<p><b>🟢 The plain idea.</b> In a normal coding round you get a small puzzle. In a <b>frontend system design</b> round you get a whole product ("design autocomplete", "design a news feed") and 45 minutes. The interviewer is not checking that you remember one API. They check whether you can think in an organised way. A simple five-step recipe keeps you organised. People call it <b>RADIO</b>:</p>
    ${H.table(['Letter', 'Step', 'What you do', 'Minutes (of 45)'], [
      ['<b>R</b>', 'Requirements', 'Ask what to build: users, devices, features in scope, what is out of scope, scale, offline?', '~5'],
      ['<b>A</b>', 'Architecture', 'Draw boxes: component tree, who owns state, where data is fetched, what is client vs server', '~10'],
      ['<b>D</b>', 'Data model', 'Shape of state: what is server data, UI state, URL state; normalised vs nested', '~8'],
      ['<b>I</b>', 'Interface (API)', 'Request/response contract: endpoints, pagination, errors, realtime messages', '~7'],
      ['<b>O</b>', 'Optimisations', 'Performance (load, render, network), accessibility, security, i18n, error states', '~15']
    ])}
    <p><b>R — Requirements.</b> Split them in two lists. <b>Functional</b>: what the user can do ("type, see suggestions, pick one with the keyboard"). <b>Non-functional</b>: how well it works (fast on a slow phone, works with a screen reader, handles 100,000 items, survives a flaky network). Say your assumptions out loud: "I will assume web, desktop and mobile browsers, English only, no offline mode."</p>
    <p><b>A — Architecture.</b> Draw the <b>component tree</b>. Mark who <b>owns</b> each piece of state (usually the lowest common parent of everyone who needs it). Draw arrows: data goes <i>down</i> as props, events go <i>up</i> as callbacks. Decide where fetching lives (a hook or a data-cache library) and what talks to the network.</p>
    <p><b>D — Data model (state shape).</b> Sort state into four buckets so you never mix them up:</p>
    ${H.kv([['Server state', 'copy of backend data: posts, messages (cache it, it can go stale)'], ['UI state', 'open/closed, hovered, active index (throw away on unmount)'], ['URL state', 'search query, page, filters (so links and Back button work)'], ['Form state', 'draft text, validation errors (local, short-lived)']], { label: 'Four buckets of state' })}
    <p><b>I — Interface.</b> Write the API contract like a mini document: method, path, query params, response shape, error codes. For lists, say <b>cursor vs offset</b>. For realtime, say the message envelope (<code>type</code>, <code>seq</code>, <code>payload</code>).</p>
    <p><b>O — Optimisations.</b> Pick the few that matter for <i>this</i> product: Core Web Vitals (LCP loads fast, INP reacts fast, CLS does not jump around), lazy loading, virtualization, caching, debouncing, code splitting. Then <b>accessibility</b>: keyboard path, focus, ARIA roles, screen reader announcements, contrast, reduced motion. Close with <b>error and empty states</b> and a short "what I would do next".</p>
    <p><b>🔵 Why an order matters.</b> If you jump to "I will use Redux and virtualization" before asking requirements, you may be solving the wrong problem. Spend the first five minutes asking; interviewers literally score it.</p>`,
  clues: [
    '"Design [autocomplete / news feed / chat / spreadsheet]" with no more detail — the missing detail <b>is</b> the test; ask questions first',
    '"How would you structure the components and state?" → component tree + state ownership + state buckets',
    '"What API would you want from the backend?" → write the contract yourself: cursor pagination, error shape, realtime envelope',
    '"What about slow networks / low-end phones / screen readers?" → performance budget and accessibility are expected in every answer, not bonus topics',
    '"Walk me through what happens when ..." (a keystroke, a scroll, a reconnect) → trace the data flow step by step through your own diagram'
  ],
  code: [
    { lang: 'ts', title: 'The state shape for a feed (types only)', code: `// One copy of every post, keyed by id. The feed is only an ORDER (list of ids).
type Post = { id: string; authorId: string; text: string; likeCount: number; likedByMe: boolean };
type User = { id: string; name: string; avatarUrl: string };

type FeedState = {
  postsById: Record<string, Post>;   // server state: the single source of truth
  usersById: Record<string, User>;
  feedIds: string[];                 // ordering only: ['p9', 'p7', 'p4']
  nextCursor: string | null;         // null means "no more pages"
  status: 'idle' | 'loading' | 'error';
};

// UI state lives elsewhere and is thrown away with the component.
type FeedUiState = { firstVisible: number; lastVisible: number };

const empty: FeedState = { postsById: {}, usersById: {}, feedIds: [], nextCursor: null, status: 'idle' };
console.log(Object.keys(empty).length);` },
    { lang: 'js', run: true, title: 'Normalise a nested API response (runnable)', code: `// The API sends nested data. We store each thing ONCE, by id, so a "like" updates one place.
const apiResponse = {
  items: [
    { id: 'p1', text: 'hello', likeCount: 2, author: { id: 'u1', name: 'Asha' } },
    { id: 'p2', text: 'world', likeCount: 5, author: { id: 'u1', name: 'Asha' } },
    { id: 'p3', text: 'again', likeCount: 0, author: { id: 'u2', name: 'Ben' } }
  ],
  nextCursor: 'p3'
};

function normalize(resp) {
  const postsById = {}, usersById = {}, feedIds = [];
  for (const item of resp.items) {
    usersById[item.author.id] = item.author;                 // author stored once, even if repeated
    postsById[item.id] = { id: item.id, text: item.text, likeCount: item.likeCount, authorId: item.author.id };
    feedIds.push(item.id);                                   // order only
  }
  return { postsById, usersById, feedIds, nextCursor: resp.nextCursor };
}

const state = normalize(apiResponse);
console.log('users stored:', Object.keys(state.usersById));   // 2, not 3
console.log('feed order  :', state.feedIds);
// A like touches exactly one object, and every view that reads p2 updates:
state.postsById.p2 = { ...state.postsById.p2, likeCount: state.postsById.p2.likeCount + 1 };
console.log('p2 likes now:', state.postsById.p2.likeCount);` }
  ],
  viz: [
    {
      title: 'Component tree for a search box: state down, events up',
      gen: function () {
        var arr = ['SearchPage', 'SearchBox', 'ResultList', 'Input', 'Dropdown', 'ResultItem', 'Pager'];
        return [
          treeFrame('<b>Step 1 (Architecture):</b> draw the tree first. Boxes are components. Nothing is decided about state yet.', 'Component tree', arr),
          treeFrame('<b>Who owns the state?</b> <code>query</code>, <code>results</code> and <code>status</code> are needed by both the box and the list. Their lowest common parent is <b>SearchPage</b>, so it owns them.', 'State owner', arr, { 0: 'sel' }, { 0: 'query, results, status' }),
          treeFrame('<b>Data goes down as props.</b> SearchPage passes <code>value</code> to SearchBox and <code>items</code> to ResultList. Children never reach up and change parent state directly.', 'Props flow down', arr, { 0: 'done', 1: 'ok', 2: 'ok' }, { 1: 'value', 2: 'items' }),
          treeFrame('<b>Events go up as callbacks.</b> The user types in <b>Input</b>. It calls <code>onChange</code>, which bubbles up to SearchBox, then to SearchPage, which updates <code>query</code>.', 'Events flow up', arr, { 3: 'cur', 1: 'win', 0: 'win' }, { 3: 'onChange', 1: 'onQuery', 0: 'setQuery' }),
          treeFrame('<b>Where is the network call?</b> One place: a data hook in SearchPage (<code>useSearch(query)</code>). Leaf components stay dumb and easy to test.', 'Data fetching', arr, { 0: 'sel' }, { 0: 'useSearch(query)' }),
          treeFrame('<b>Accessibility is part of the tree.</b> Each box gets a role so a screen reader understands the pattern: a combobox with a popup listbox of options.', 'ARIA roles', arr, { 3: 'ok', 4: 'ok', 5: 'ok' }, { 3: 'role=combobox', 4: 'role=listbox', 5: 'role=option' })
        ];
      }
    },
    {
      title: 'A 45-minute round, step by step (RADIO timeline)',
      gen: function () {
        var rows = [
          ['R', '0-5', 'Ask: users? devices? scale? offline? what is out of scope?', 'Written list of must-haves'],
          ['A', '5-15', 'Component tree, state owners, data flow arrows', 'Box diagram'],
          ['D', '15-23', 'State buckets, normalised shape, cache keys', 'Types / JSON sketch'],
          ['I', '23-30', 'Endpoints, pagination, errors, realtime envelope', 'Contract table'],
          ['O', '30-43', 'Performance, a11y, security, errors, trade-offs', 'Checklist with reasons'],
          ['wrap', '43-45', 'Summarise, name what you would build next', 'One-minute recap']
        ];
        var narr = [
          'Start the clock. The first five minutes belong to <b>Requirements</b>: you talk, you ask, you write. No boxes yet.',
          '<b>Architecture</b> gets the biggest early chunk. Draw the tree and mark state owners. This is where interviewers judge your taste.',
          '<b>Data model</b>: decide what is server state, UI state and URL state. Show one concrete JSON/TypeScript shape.',
          '<b>Interface</b>: write the API you wish existed. Pick cursor over offset for lists that change, and say why.',
          '<b>Optimisations</b> is the longest block. Choose the 3 to 4 that matter here and explain the <i>cost</i> of each.',
          'Wrap up. Say what you left out on purpose and what you would test first. Ending cleanly leaves a good last impression.'
        ];
        var frames = [];
        for (var i = 0; i < rows.length; i++) {
          frames.push({ narr: narr[i], parts: [{ type: 'table', label: 'Round plan', columns: ['Step', 'Minutes', 'What you do', 'Output on the board'], rows: rows.slice(0, i + 1), hl: (function () { var o = {}; o[i] = 'cur'; return o; })() }] });
        }
        return frames;
      }
    }
  ],
  examples: [
    { title: 'Requirements questions for "design autocomplete"', html: `<p>Say these out loud and note the answers. Each answer changes the design.</p>
      ${H.table(['Question you ask', 'If the answer is...', 'Design effect'], [
        ['Where does the data come from?', 'A backend search API', 'Debounce + cancel + cache; the network is the slow part'],
        ['How big is the list?', '5 to 10 suggestions', 'No virtualization needed; keep it simple'],
        ['Mobile too?', 'Yes', 'Large touch targets, no hover-only behaviour'],
        ['Keyboard and screen readers?', 'Yes, WCAG AA', 'combobox pattern, <code>aria-activedescendant</code>, live region'],
        ['Recent searches or personalised?', 'Recent only', 'Small local store, show on empty focus']
      ])}` },
    { title: 'Cursor vs offset: the contract decision', html: `<p>You propose <code>GET /feed?cursor=p9&amp;limit=20</code> and justify it. With <b>offset</b> (<code>?page=3</code>), when a new post is added at the top while you read page 2, every item shifts down by one and page 3 repeats the last item of page 2. A <b>cursor</b> says "give me 20 items after post p9", which never shifts.</p>
      ${H.table(['', 'Offset', 'Cursor'], [['New item inserted at top', '<span class="c-r">duplicate on next page</span>', '<span class="c-g">stable</span>'], ['Jump to page 50', '<span class="c-g">easy</span>', '<span class="c-r">not possible</span>'], ['Server cost deep in list', '<span class="c-r">O(offset) scan</span>', '<span class="c-g">index seek</span>']])}` },
    { title: 'Four buckets of state for a feed', html: `<p>Ask "where does each piece live?" for the feed page.</p>
      ${H.table(['Piece', 'Bucket', 'Where it lives'], [
        ['The posts themselves', 'Server state', 'Query cache keyed by id (normalised)'],
        ['Which filter tab is active (Following / For you)', 'URL state', 'Query string <code>?tab=following</code>'],
        ['Is the comment box open', 'UI state', 'Local component state'],
        ['Text typed in the comment box', 'Form state', 'Local state, saved as draft in sessionStorage']
      ])}
      <p>Mixing these is the most common beginner mistake, for example putting "is dropdown open" into the global store.</p>` }
  ],
  deepDive: `<p><b>🟣 What strong candidates add.</b> (1) <b>Trade-offs, not answers.</b> For every choice say "I pick X because Y; the cost is Z; I would switch to W if the requirement changes." That sentence is worth more than any library name. (2) <b>Numbers.</b> A feed of 10,000 posts rendered as 10,000 DOM nodes is roughly 100 MB of memory and a multi-second main-thread freeze on a mid-range phone; virtualization keeps maybe 20 nodes. Quote budgets: LCP under 2.5 s, INP under 200 ms, CLS under 0.1 (the "good" thresholds). (3) <b>Failure paths.</b> What does the UI show while loading, when empty, on error, when offline, when the token expires? Name each.</p>
    <p><b>State ownership rule.</b> Lift state to the <i>lowest</i> common parent, no higher. Putting everything in a global store makes every change re-render far away components and makes components hard to reuse. A typical split in 2026: server state in a cache library (TanStack Query or similar), a small global store only for truly app-wide things (current user, theme), URL for shareable state, local state for the rest.</p>
    <p><b>Contract thinking.</b> Version the API or make additive changes only. Return <code>nextCursor: null</code> instead of an empty page so the client knows to stop. Use a consistent error envelope (<code>{ code, message, retryAfterMs }</code>) so one error handler can decide between retry, re-login and show-message. For realtime, every message needs an <b>id</b> (dedupe) and a <b>sequence number</b> (ordering); you will see why in the chat topic.</p>
    <p><b>Accessibility as architecture.</b> Decide early which native element does the job (<code>button</code>, <code>dialog</code>, <code>input</code>). Native elements give keyboard behaviour and roles for free; custom <code>div</code> widgets need all of it rebuilt by hand. Plan focus: when a dialog opens, where does focus go, and where does it return?</p>
    <p><b>Where candidates lose points:</b> starting with a library, drawing no state ownership, ignoring errors, forgetting keyboard users, and silently assuming scale. Always say the assumption aloud so the interviewer can correct it.</p>`,
  aiEra: `<p><b>🤖 What AI changes.</b> An AI assistant can scaffold a feed or an autocomplete in seconds, so interviewers now care less about typing speed and more about <i>judgement</i>: which design, why, and what breaks. Companies increasingly allow or even expect AI tools in take-home and machine-coding rounds; they then ask you to <b>explain and extend</b> the generated code live.</p>
    <p><b>Use AI as a partner:</b> ask <code>List 10 non-functional requirements I might forget when designing a chat UI</code> to widen your checklist, or <code>Play a sceptical interviewer and attack my state shape</code> to practise defending trade-offs. Ask it to produce a failure-mode table (slow network, reorder, duplicate, offline) and check which ones your design misses.</p>
    <p><b>Where AI goes wrong:</b> it happily picks the most popular stack, stuffs everything into one global store, forgets cancellation of stale requests, skips keyboard and screen-reader behaviour, and uses offset pagination for a live feed. It also writes confident code that has no error or empty state.</p>
    <p><b>What you must still own:</b> the requirements conversation, the ownership of state, the contract, and the reasons for each trade-off. If you cannot say why a hook is there, you cannot defend it in the round.</p>`,
  problems: [
    {
      title: 'Normalise a Nested Comment Payload',
      level: 'Easy', tags: ['state shape', 'normalisation'], companies: ['Meta', 'Atlassian'],
      statement: `<p>The API returns a list of comments, each with an embedded <code>author</code> object. Convert it into a state shape with <code>commentsById</code>, <code>usersById</code> and <code>order</code> (array of comment ids), so each user and comment is stored exactly once. If the same user appears many times, there must be one user object.</p>`,
      constraints: `<p>1 ≤ comments ≤ 10<sup>4</sup>. Comment ids are unique strings. Keep the original order of the input in <code>order</code>.</p>`,
      example: `${H.table(['Input comments', 'Output'], [['c1 (Asha), c2 (Asha), c3 (Ben)', 'usersById has 2 keys (u1, u2); commentsById has 3; order = [c1, c2, c3]']])}<p>Why: Asha is stored once, so renaming her updates every comment that shows her name.</p>`,
      brute: { why: `<p>Keep the nested payload as-is. To rename a user you must walk every comment and patch each embedded copy: O(N) work and easy to miss one, so two comments show different names for the same person.</p>`, code: `function renameUserNested(comments, userId, newName) {
  // Every comment carries its own copy of the author, so we must touch all of them.
  return comments.map(function (c) {
    if (c.author.id !== userId) return c;
    return Object.assign({}, c, { author: Object.assign({}, c.author, { name: newName }) });
  });
}` },
      mcq: { q: 'What is the main benefit of storing users in a separate usersById map?', options: ['A user change is made in exactly one place', 'It makes JSON smaller on the wire', 'It removes the need for IDs', 'It avoids re-rendering entirely'], answer: 0, explain: 'A single copy per entity means one update is visible everywhere it is read. The wire size and re-renders are separate topics.' },
      hints: [
        `<p>Hint 1: the aha. The same user shows up many times. Store the user once under their id and let each comment keep only <code>authorId</code>.</p>`,
        `<p>Hint 2: use plain objects as maps keyed by id (<code>usersById[id]</code>) and an array of ids to remember the order.</p>`,
        `<p>Hint 3: loop once. For each comment: write the author to usersById (overwriting is fine), write the comment without the embedded author to commentsById, and push its id to order.</p>`
      ],
      solution: {
        approach: `<p>One pass over the input. Authors go to <code>usersById</code>, comments (with <code>authorId</code> instead of the nested object) go to <code>commentsById</code>, and ids go to <code>order</code>. A rename now touches one object.</p>`,
        code: `function normalizeComments(comments) {
  const commentsById = {};
  const usersById = {};
  const order = [];
  for (const c of comments) {
    usersById[c.author.id] = c.author;                       // stored once
    commentsById[c.id] = { id: c.id, text: c.text, authorId: c.author.id };
    order.push(c.id);                                        // preserves server order
  }
  return { commentsById, usersById, order };
}

const out = normalizeComments([
  { id: 'c1', text: 'hi', author: { id: 'u1', name: 'Asha' } },
  { id: 'c2', text: 'yo', author: { id: 'u1', name: 'Asha' } },
  { id: 'c3', text: 'hey', author: { id: 'u2', name: 'Ben' } }
]);
console.log(Object.keys(out.usersById).length, out.order.join(','));`,
        complexity: `<p>Time O(N), space O(N + U) where U is the number of distinct users. A rename is O(1).</p>`,
        followUps: ['Handle replies nested inside comments (a tree) by storing childIds per comment.', 'How do you merge a second page without duplicating entries?']
      }
    }
  ]
});

/* ===================== TOPIC 2: Autocomplete / Typeahead ===================== */
topics.push({
  title: 'Design Autocomplete / Typeahead',
  analogy: `<p>Imagine a helpful librarian. You start saying a book title: "Har...". A <b>bad</b> librarian sprints to the shelf after every single letter, and by the time they return you are already saying something else. A <b>good</b> librarian waits until you pause a moment (that is <b>debounce</b>), drops any trip that is no longer useful when you change your mind (that is <b>cancelling a stale request</b>), and remembers the answers to questions you asked this morning (that is a <b>cache</b>). While you speak, you can also point with your finger at the shelf list and say "that one" (that is <b>keyboard navigation</b>).</p>`,
  explain: `<p><b>🟢 What the user sees.</b> A text box. As they type, a short list of suggestions drops down. They can click one, or press <kbd>↓</kbd> <kbd>↑</kbd> and <kbd>Enter</kbd>. <kbd>Esc</kbd> closes the list. Looks simple, but four problems hide inside it:</p>
    ${H.table(['Problem', 'What goes wrong', 'Fix'], [
      ['Too many requests', 'Typing "react" sends 5 requests (r, re, rea, reac, react)', '<b>Debounce</b>: wait ~150 to 300 ms after the last keystroke'],
      ['Out-of-order answers', 'Answer for "rea" arrives <i>after</i> answer for "react" and overwrites it', '<b>Cancel</b> the old request (AbortController) and/or ignore any response that is not the latest'],
      ['Repeated work', 'User deletes a letter and types it again: same request twice', '<b>Cache</b> by normalised query (small LRU)'],
      ['Mouse-only widget', 'Keyboard and screen-reader users are stuck', '<b>Combobox pattern</b>: ARIA roles + arrow keys']
    ])}
    <p><b>🔵 Requirements first.</b> Functional: show up to N suggestions for the typed text, select by click or keyboard, close on Esc / outside click, handle empty and error states. Non-functional: first suggestion in under ~300 ms after the pause, no flicker, works on slow 3G, no duplicate requests, accessible.</p>
    <p><b>Component architecture</b> (see the tree below): <code>Typeahead</code> owns the state (<code>query</code>, <code>suggestions</code>, <code>activeIndex</code>, <code>isOpen</code>, <code>status</code>). <code>SearchInput</code> is the text box. <code>SuggestionList</code> renders options. The network lives in one small hook/controller, not inside the components.</p>
    <p><b>State shape:</b></p>
    ${H.kv([['query', 'what the box shows right now (updates every keystroke, instantly)'], ['debouncedQuery', 'the value we actually search for (updates after the pause)'], ['suggestions', 'array of {id, label}'], ['activeIndex', '-1 means "nothing highlighted"; else 0..n-1'], ['status', 'idle | loading | error | empty']], { label: 'Typeahead state' })}
    <p><b>Important split:</b> the box must show every keystroke immediately (never debounce the input value itself), only the <i>search</i> is debounced. If the text lags behind your fingers the widget feels broken.</p>
    <p><b>API contract:</b> <code>GET /suggest?q=rea&amp;limit=8</code> returns <code>{ q: "rea", items: [{ id, label }] }</code>. Echoing <code>q</code> in the response lets the client double-check "is this answer still for what the box says?".</p>
    <p><b>Keyboard map:</b> ↓ moves highlight down (wraps), ↑ up, <kbd>Enter</kbd> picks the highlighted item, <kbd>Esc</kbd> closes, <kbd>Home</kbd>/<kbd>End</kbd> jump. DOM focus <i>stays in the input</i>; the highlight is announced by pointing at the active option with <code>aria-activedescendant</code>.</p>`,
  clues: [
    '"Design autocomplete / search suggestions / type-ahead" — the exact name of this classic',
    '"Avoid sending a request on every keystroke" → debounce (and mention throttle as the alternative)',
    '"Results flash or show for the wrong query" → race condition; cancel stale requests with AbortController / latest-wins guard',
    '"User types the same prefix again" → cache with LRU eviction, key = normalised query',
    '"Must be usable without a mouse / screen reader" → ARIA combobox pattern, <code>aria-activedescendant</code>, live region',
    '"1M users, backend is slow or rate limited" → debounce + min length + cache + prefetch + handle 429 with back-off'
  ],
  code: [
    { lang: 'js', run: true, title: 'Debounce + LRU cache + latest-wins controller (runnable)', code: `// ---------- 1. debounce: run fn only after the user pauses for "ms" ----------
function debounce(fn, ms) {
  let timer = null;
  const wrapped = (...args) => {
    clearTimeout(timer);                       // every new keystroke restarts the countdown
    timer = setTimeout(() => fn(...args), ms);
  };
  wrapped.cancel = () => clearTimeout(timer);  // call this when the component unmounts
  return wrapped;
}

// ---------- 2. LRU cache: a Map remembers insertion order, so the first key is the oldest ----------
class LRU {
  constructor(max) { this.max = max; this.map = new Map(); }
  get(key) {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key);
    this.map.delete(key);                      // re-insert = "just used" (moves to the back)
    this.map.set(key, value);
    return value;
  }
  set(key, value) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.max) this.map.delete(this.map.keys().next().value); // evict least recently used
  }
}

// ---------- 3. a fake slow backend (aborts like fetch does) ----------
function fakeSearch(q, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve([q + ' tutorial', q + ' hooks', q + ' router']), 150);
    signal.addEventListener('abort', () => { clearTimeout(timer); const e = new Error('aborted'); e.name = 'AbortError'; reject(e); });
  });
}

// ---------- 4. the controller that glues it together ----------
function createTypeahead({ search, delay, cacheSize, show, log }) {
  const cache = new LRU(cacheSize);
  let controller = null;   // the AbortController of the request in flight
  let latest = 0;          // id of the newest search; older ids are stale

  async function run(raw) {
    const q = raw.trim().toLowerCase();                   // normalise: same key for "React " and "react"
    const myId = ++latest;
    if (controller) controller.abort();                   // cancel the stale request
    if (!q) { show([]); return; }
    const hit = cache.get(q);
    if (hit) { log('cache hit  : ' + q); show(hit); return; }
    controller = new AbortController();
    log('request    : ' + q);
    try {
      const items = await search(q, controller.signal);
      cache.set(q, items);
      if (myId !== latest) return;                        // belt and braces: ignore stale answers
      show(items);
    } catch (e) {
      if (e.name === 'AbortError') log('aborted    : ' + q); else throw e;
    }
  }
  return { onInput: debounce(run, delay) };
}

// ---------- 5. simulate a user typing (times in ms) ----------
const ta = createTypeahead({
  search: fakeSearch, delay: 40, cacheSize: 3,
  show: (items) => console.log('  dropdown  : ' + items[0] + ' ...'),
  log: (m) => console.log(m)
});
const script = [[0, 'r'], [15, 're'], [30, 'rea'], [120, 'reac'], [135, 'react'], [450, 'reactx'], [520, 'react']];
for (const [at, text] of script) setTimeout(() => ta.onInput(text), at);` },
    { lang: 'jsx', check: false, title: 'React hook version (shape only)', code: `import { useEffect, useState } from 'react';

// useDebounced returns a value that only changes after "ms" of silence.
function useDebounced(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);              // cleanup = the "restart the countdown" part
  }, [value, ms]);
  return v;
}

function useSuggestions(query) {
  const debounced = useDebounced(query.trim().toLowerCase(), 200);
  const [state, setState] = useState({ items: [], status: 'idle' });
  useEffect(() => {
    if (!debounced) { setState({ items: [], status: 'idle' }); return; }
    const ctrl = new AbortController();         // one controller per effect run
    setState((s) => ({ ...s, status: 'loading' }));
    fetch('/suggest?q=' + encodeURIComponent(debounced), { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => setState({ items: d.items, status: d.items.length ? 'idle' : 'empty' }))
      .catch((e) => { if (e.name !== 'AbortError') setState({ items: [], status: 'error' }); });
    return () => ctrl.abort();                  // the next keystroke cancels this request
  }, [debounced]);
  return state;
}` },
    { lang: 'html', title: 'ARIA combobox markup', code: `<label for="city">City</label>
<input id="city" type="text" role="combobox" autocomplete="off"
       aria-expanded="true" aria-controls="city-list"
       aria-autocomplete="list" aria-activedescendant="opt-1">
<ul id="city-list" role="listbox">
  <li id="opt-0" role="option">Paris</li>
  <li id="opt-1" role="option" aria-selected="true">Parma</li>
  <li id="opt-2" role="option">Paros</li>
</ul>
<!-- polite live region: "3 suggestions available" is read out after results change -->
<div aria-live="polite" class="sr-only">3 suggestions available</div>` }
  ],
  viz: [
    {
      title: 'Keystrokes, debounced requests and a cancelled stale response',
      input: 'd150 r@0 re@60 rea@120 reac@300 react@700 reac@1100',
      inputLabel: 'Tokens: dMS = debounce, text@time = keystroke, noguard / noabort = turn safety off',
      gen: function (input) {
        var toks = String(input).trim().split(/\s+/).filter(Boolean);
        var debounce = 300, abort = true, check = true, keys = [], m;
        toks.forEach(function (tk) {
          if ((m = tk.match(/^d(\d+)$/i))) debounce = Math.min(1000, +m[1]);
          else if (tk === 'noguard') { abort = false; check = false; }
          else if (tk === 'noabort') { abort = false; }
          else if ((m = tk.match(/^([a-z0-9]+)@(\d+)$/i))) keys.push({ t: +m[2], text: m[1] });
          else throw new Error('Use tokens like: d150 r@0 re@60 rea@120 (noguard / noabort optional)');
        });
        if (!keys.length) throw new Error('Add at least one keystroke such as r@0');
        if (keys.length > 12) throw new Error('Use at most 12 keystrokes');
        keys.sort(function (a, b) { return a.t - b.t; });
        function latency(q) { return Math.max(80, 500 - 80 * q.length); }
        var reqs = [], cache = {}, shown = '(nothing)', typed = '', fireAt = null, ki = 0, now = 0, nextId = 1, frames = [], safety = 0;
        function snapshot(narr, hlRow, mismatch) {
          var rows = reqs.map(function (r) { return ['#' + r.id, r.q, r.fired, r.status === 'cache hit' ? '-' : r.arrive, r.status]; });
          var hl = {};
          reqs.forEach(function (r, i) { hl[i] = r.status === 'shown' || r.status === 'cache hit' ? 'ok' : r.status === 'aborted' ? 'bad' : r.status === 'stale (ignored)' ? 'done' : r.status === 'SHOWN STALE' ? 'bad' : 'win'; });
          if (hlRow !== undefined) hl[hlRow] = hl[hlRow] === 'bad' ? 'bad' : 'cur';
          var inflight = reqs.filter(function (r) { return r.status === 'in-flight'; }).map(function (r) { return '#' + r.id + ' ' + r.q; });
          var vhl = {}; vhl.dropdown = mismatch ? 'bad' : 'ok';
          return { narr: narr, parts: [
            { type: 'vars', label: 'Clock and widget', vals: { time_ms: now, input_box: typed || '(empty)', dropdown_is_for: shown, debounce_timer: fireAt === null ? 'idle' : 'fires at ' + fireAt }, hl: { dropdown_is_for: mismatch ? 'bad' : 'ok' } },
            { type: 'queue', label: 'Requests in flight', items: inflight, frontLabel: 'oldest', backLabel: 'newest' },
            { type: 'table', label: 'Request log', columns: ['id', 'query', 'fired', 'arrives', 'status'], rows: rows.length ? rows : [['-', '-', '-', '-', 'none yet']], hl: hl }
          ] };
        }
        frames.push(snapshot('The user has not typed yet. The debounce is <b>' + debounce + ' ms</b>; abort is ' + (abort ? 'ON' : 'OFF') + ' and the stale-answer check is ' + (check ? 'ON' : 'OFF') + '.'));
        while (safety++ < 200) {
          var cand = [], nr = null;
          if (ki < keys.length) cand.push({ t: keys[ki].t, p: 0, k: 'key' });
          reqs.forEach(function (r) { if (r.status === 'in-flight' && (nr === null || r.arrive < nr.arrive)) nr = r; });
          if (nr) cand.push({ t: nr.arrive, p: 1, k: 'resp', r: nr });
          if (fireAt !== null) cand.push({ t: fireAt, p: 2, k: 'fire' });
          if (!cand.length) break;
          cand.sort(function (a, b) { return a.t - b.t || a.p - b.p; });
          var e = cand[0]; now = Math.max(now, e.t);
          if (e.k === 'key') {
            typed = keys[ki].text; ki++; fireAt = now + debounce;
            frames.push(snapshot('t=' + now + ': key press, box now says <b>"' + typed + '"</b>. The debounce countdown restarts and will fire at <b>t=' + fireAt + '</b> if no new key arrives.'));
          } else if (e.k === 'fire') {
            fireAt = null;
            var q = typed, note = '';
            if (abort) reqs.forEach(function (r) { if (r.status === 'in-flight') { r.status = 'aborted'; note += ' <span class="c-r">Aborted older request #' + r.id + ' ("' + r.q + '") - it is stale.</span>'; } });
            if (cache[q]) {
              reqs.push({ id: nextId++, q: q, fired: now, arrive: now, status: 'cache hit' }); shown = q;
              frames.push(snapshot('t=' + now + ': the pause is long enough. <b>"' + q + '"</b> is in the cache, so we show it instantly with <b>no network</b>.' + note, reqs.length - 1));
            } else {
              reqs.push({ id: nextId++, q: q, fired: now, arrive: now + latency(q), status: 'in-flight' });
              frames.push(snapshot('t=' + now + ': pause detected. Send request <b>#' + (nextId - 1) + '</b> for <b>"' + q + '"</b>; it will arrive at t=' + (now + latency(q)) + '.' + note, reqs.length - 1));
            }
          } else {
            var r = e.r, latestReq = null;
            reqs.forEach(function (x) { if (x.status !== 'cache hit') latestReq = x; });
            var stale = r.q !== typed;
            cache[r.q] = true;
            if (check && stale) {
              r.status = 'stale (ignored)';
              frames.push(snapshot('t=' + now + ': answer #' + r.id + ' for "' + r.q + '" arrived, but the box now says "' + typed + '". We <b>ignore</b> it for display (still cache it).', reqs.indexOf(r)));
            } else {
              r.status = stale ? 'SHOWN STALE' : 'shown'; shown = r.q;
              frames.push(snapshot('t=' + now + ': answer #' + r.id + ' for "' + r.q + '" arrived and is shown.' + (stale ? ' <span class="c-r">BUG: the box says "' + typed + '" but the dropdown is for "' + r.q + '"!</span>' : ' Dropdown matches the box.'), reqs.indexOf(r), stale));
            }
          }
        }
        var sent = reqs.filter(function (x) { return x.status !== 'cache hit'; }).length;
        frames.push(snapshot('Done. ' + keys.length + ' keystrokes produced only <b>' + sent + '</b> network request(s) (naive code would send ' + keys.length + '). Try <code>d0</code> and then <code>d0 noguard</code> to see the race bug.'));
        return frames;
      }
    },
    {
      title: 'LRU cache for suggestions (capacity 3)',
      input: '3 re rea reac re react',
      inputLabel: 'Capacity first, then queries (space separated)',
      gen: function (input) {
        var t = String(input).trim().split(/\s+/);
        var cap = parseInt(t[0], 10);
        if (!(cap >= 1 && cap <= 6) || t.length < 3) throw new Error('Format: capacity (1-6) then queries, e.g. 3 re rea reac re react');
        var qs = t.slice(1, 15), order = [], frames = [];
        frames.push({ narr: 'Empty cache with room for <b>' + cap + '</b> queries. Left side = least recently used (first to be evicted), right side = most recently used.', parts: [{ type: 'queue', label: 'LRU order', items: [], frontLabel: 'evict first', backLabel: 'newest' }] });
        qs.forEach(function (q) {
          var idx = order.indexOf(q), hl = {}, note;
          if (idx >= 0) {
            order.splice(idx, 1); order.push(q); hl[order.length - 1] = 'ok';
            note = '<span class="c-g">HIT</span> for <b>' + q + '</b>: no network. Move it to the newest end.';
          } else {
            var ev = '';
            order.push(q);
            if (order.length > cap) { ev = ' Cache is full, so evict the oldest: <span class="c-r">' + order[0] + '</span>.'; order.shift(); }
            hl[order.length - 1] = 'cur';
            note = '<span class="c-y">MISS</span> for <b>' + q + '</b>: fetch from network, then store.' + ev;
          }
          frames.push({ narr: note, parts: [{ type: 'queue', label: 'LRU order', items: order.slice(), hl: hl, frontLabel: 'evict first', backLabel: 'newest' }, { type: 'map', label: 'Cache contents', entries: order.map(function (k) { return [k, '[results]']; }), hl: (function () { var o = {}; o[q] = idx >= 0 ? 'ok' : 'cur'; return o; })() }] });
        });
        frames.push({ narr: 'Finished. A <code>Map</code> in JavaScript keeps insertion order, so "delete then set again" is all you need to move an entry to the newest end.', parts: [{ type: 'queue', label: 'LRU order', items: order.slice(), frontLabel: 'evict first', backLabel: 'newest' }] });
        return frames;
      }
    },
    {
      title: 'Typeahead component tree and keyboard flow',
      gen: function () {
        var arr = ['Typeahead', 'SearchInput', 'Suggestions', 'ClearButton', 'Spinner', 'Option', 'LiveRegion'];
        return [
          treeFrame('The component tree. <b>Typeahead</b> is the container and owns the state; the others render pieces of it.', 'Typeahead tree', arr),
          treeFrame('State lives in the container: <code>query</code>, <code>suggestions</code>, <code>activeIndex</code>, <code>isOpen</code>, <code>status</code>. Children are controlled by props.', 'State owner', arr, { 0: 'sel' }, { 0: 'query, items, activeIndex' }),
          treeFrame('The user types. The input reports every key to the container immediately (no delay) so the box never lags.', 'Typing', arr, { 1: 'cur', 0: 'win' }, { 1: 'onChange', 0: 'setQuery' }),
          treeFrame('After the pause, the data hook fetches. The list shows a spinner or the new items. Stale requests are aborted inside the hook.', 'Fetching', arr, { 0: 'sel', 2: 'ok' }, { 0: 'useSuggestions', 2: 'items' }),
          treeFrame('The user presses <kbd>↓</kbd>. Focus stays in the input; only <code>activeIndex</code> changes, and the input points at the option with <code>aria-activedescendant</code>.', 'Keyboard', arr, { 1: 'cur', 5: 'ok', 0: 'win' }, { 1: 'onKeyDown', 5: 'aria-selected', 0: 'activeIndex+1' }),
          treeFrame('A screen reader hears "5 suggestions available" from the polite live region after each result update.', 'Announcement', arr, { 6: 'sel' }, { 6: 'aria-live=polite' })
        ];
      }
    }
  ],
  examples: [
    { title: 'Debounce vs throttle: which one for search?', html: `<p>Typing "react" quickly (5 keys within 400 ms):</p>
      ${H.table(['Technique', 'What it does', 'Requests sent', 'Good for'], [
        ['No limit', 'Fire on every key', '5', 'nothing (wasteful)'],
        ['<b>Debounce 200 ms</b>', 'Wait for a pause, then fire once', '1 (for "react")', '<span class="c-g">search boxes, resize end, autosave</span>'],
        ['Throttle 200 ms', 'Fire at most once per 200 ms while typing', '2 to 3 (some stale)', 'scroll position, mouse move, drag']
      ])}
      <p>Rule of thumb: <b>debounce = "wait until they are done"</b>, <b>throttle = "keep up, but not too often"</b>. Some products use a <i>leading</i> debounce too: fire on the first key for instant feedback, then again after the pause.</p>` },
    { title: 'The out-of-order race (and why a guard is needed)', html: `<p>Without any guard, requests can come back in a different order than they were sent. Short queries often return slower because the server has more matches to rank.</p>
      ${H.table(['time', 'event', 'dropdown shows'], [['0', 'send "re" (slow)', '-'], ['40', 'send "rea" (fast)', '-'], ['150', 'answer for "rea"', 'rea results'], ['300', '<span class="c-r">answer for "re" arrives late</span>', '<span class="c-r">re results (but box says "rea")</span>']])}
      <p>Fix with either: (a) <code>AbortController</code> so the old request dies, or (b) a counter <code>latestId</code>, and only the response whose id equals the latest is allowed to update the UI. Strong answers use <b>both</b>: abort saves bandwidth, the check protects against responses that slip through.</p>`, code: { lang: 'js', code: `let latestId = 0;
async function search(q, fetchSuggestions, setState) {
  const myId = ++latestId;                 // stamp this request
  const items = await fetchSuggestions(q);
  if (myId !== latestId) return;           // a newer search started: drop this answer
  setState(items);
}` } },
    { title: 'Keyboard navigation logic (pure function, runnable)', html: `<p>Keep the arrow-key maths in a tiny pure function so it is easy to test and reuse. Note that the index wraps and that <code>-1</code> means "nothing highlighted yet".</p>`, code: { lang: 'js', run: true, code: `function nextIndex(current, key, count) {
  if (count === 0) return -1;
  if (key === 'ArrowDown') return current + 1 >= count ? 0 : current + 1;   // wrap from last to first
  if (key === 'ArrowUp') return current <= 0 ? count - 1 : current - 1;      // from -1 or 0 go to last
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return current;
}
let i = -1;
for (const k of ['ArrowDown', 'ArrowDown', 'ArrowUp', 'ArrowUp', 'ArrowUp', 'End', 'ArrowDown']) {
  i = nextIndex(i, k, 4);
  console.log(k.padEnd(10), '->', i);
}` } }
  ],
  deepDive: `<p><b>🟣 Details that separate good from great.</b></p>
    <ul>
      <li><b>IME composition.</b> Chinese, Japanese and Korean users type through an Input Method Editor. While composing, the box holds half-finished text. Listen to <code>compositionstart</code>/<code>compositionend</code> and do <b>not</b> search or treat <kbd>Enter</kbd> as "select" during composition (<code>event.isComposing</code>).</li>
      <li><b>Normalise the key.</b> Trim, lower-case and collapse spaces before caching and before requesting, so "React " and "react" share one entry. Also set a minimum length (often 1 or 2) to avoid useless broad queries.</li>
      <li><b>Prefix reuse.</b> If the server returned <i>all</i> matches for "re" (not truncated) you can filter locally for "rea" with zero requests. This only works when results are complete, so it is a design decision to state.</li>
      <li><b>Cache policy.</b> LRU with size ~50 to 100 and a TTL (for example 5 minutes) so stale suggestions expire. Cache also the "no results" answer. In memory is enough; persisting is rarely worth it.</li>
      <li><b>AbortController only cancels the browser side.</b> The server may still do the work; the saving is bandwidth, memory and not processing a useless response. Backends should be cheap per query anyway (prefix index / trie / search engine).</li>
      <li><b>Click vs blur order.</b> Clicking an option fires <code>blur</code> on the input <i>before</i> <code>click</code>, so a naive "close on blur" kills the click. Use <code>mousedown</code> with <code>preventDefault()</code> on the list, or check <code>relatedTarget</code>.</li>
      <li><b>Safe highlighting.</b> To bold the matched part do not inject server text with <code>innerHTML</code> (XSS). Split the string and render text nodes or escaped elements.</li>
      <li><b>Scroll active option into view</b> when navigating a tall list: <code>el.scrollIntoView({ block: 'nearest' })</code>.</li>
      <li><b>Rate limits and errors.</b> On 429 or 5xx back off and keep the old suggestions visible rather than a blank flash. Show a tiny "can't load suggestions" row, not a modal.</li>
      <li><b>Mobile.</b> Use <code>enterkeyhint="search"</code>, big tap targets (44 px), and avoid hover-only styling. Prefetch popular queries on focus when the box is empty (recent or trending).</li>
      <li><b>React specifics.</b> <code>useDeferredValue</code> or <code>useTransition</code> keeps typing responsive while a heavy list re-renders, but they are <i>not</i> a replacement for debouncing network calls. In effects, use the cleanup function to abort; never forget it in StrictMode where effects run twice in development.</li>
    </ul>
    <p><b>Performance numbers worth quoting:</b> a 200 ms debounce typically cuts requests by 70 to 80% for normal typing; an LRU hit turns a 200 ms round trip into under 1 ms.</p>`,
  aiEra: `<p><b>🤖 What AI changes.</b> Search boxes are shifting from "match the prefix" to <b>semantic and AI-assisted suggestions</b>: the backend may rank by meaning, or stream a generated completion. Streaming completions arrive token by token, so the same discipline applies: one active stream, cancel it when the user types again, and never mix tokens from two prompts.</p>
    <p><b>Use AI as a partner:</b> ask <code>Write a test plan for a typeahead: list race conditions, IME cases and keyboard cases</code>, or have it generate fake-timer tests (<code>vi.useFakeTimers()</code>) for your debounce. Paste your hook and ask <code>What happens in React StrictMode and when the component unmounts mid-request?</code></p>
    <p><b>Where AI goes wrong:</b> it often debounces the <i>input value</i> (so the box lags), forgets to abort or to guard against stale responses, builds a mouse-only dropdown with <code>div</code>s and no ARIA, uses <code>innerHTML</code> for highlighting, and caches by the raw string (case and spaces). It also tends to put the timer in a component body so it resets on every render.</p>
    <p><b>What you must still own:</b> deciding the delay from product feel, the cancel/ignore policy, accessibility behaviour, and being able to explain the race out loud with a timeline.</p>`,
  problems: [
    {
      title: 'Latest-Wins Search Function',
      level: 'Medium', tags: ['race condition', 'debounce', 'async'], companies: ['Google', 'Flipkart', 'Atlassian'],
      statement: `<p>Write <code>makeSearcher(fetchFn, delay)</code>. It returns a function <code>search(query)</code> that is called on every keystroke. Requirements: (1) wait <code>delay</code> ms of silence before calling <code>fetchFn(query, signal)</code>; (2) if a new search starts while an older request is in flight, abort the older one; (3) <code>search</code> returns a promise that resolves with the results <b>only for the latest call</b>, and resolves with <code>null</code> for calls that were superseded.</p>`,
      constraints: `<p>Up to 10<sup>3</sup> calls per second at worst. <code>fetchFn</code> rejects with an error named <code>AbortError</code> when its signal is aborted. Must not leak timers.</p>`,
      example: `${H.table(['t (ms)', 'call', 'result'], [['0', 'search("r")', 'null (superseded before the timer fired)'], ['30', 'search("re")', 'null (superseded)'], ['60', 'search("rea")', '<span class="c-g">results for "rea"</span> after the delay and the fetch']])}<p>Only the last call produces results; the earlier promises settle with null so callers never hang.</p>`,
      brute: { why: `<p>Call <code>fetchFn</code> on every keystroke and write each answer straight into the UI. Five keystrokes send five requests, and a slow early answer can overwrite a newer one. The wasted work is every request except the last, plus the wrong flash on screen.</p>`, code: `function makeSearcherNaive(fetchFn) {
  return async function search(query) {
    // no debounce, no abort, no stale check: the last answer to ARRIVE wins, not the last query typed
    return fetchFn(query, new AbortController().signal);
  };
}` },
      mcq: { q: 'Which pair protects against both wasted network work and a stale answer overwriting the UI?', options: ['Abort the old request and also compare a request id before using a response', 'Only add a longer debounce delay', 'Cache every response forever', 'Disable typing while loading'], answer: 0, explain: 'Abort frees the network and memory. The id check is a safety net for any response that still slips through. A longer delay only reduces how often the race happens.' },
      hints: [
        `<p>Hint 1: the aha. Two separate jobs: a <b>timer</b> that waits for silence, and a <b>stamp</b> that tells you which call is the newest. Every call must cancel the previous timer and abort the previous request.</p>`,
        `<p>Hint 2: keep three variables in the closure: <code>timer</code>, <code>controller</code> (current AbortController) and <code>latest</code> (a counter). Each call increments <code>latest</code>.</p>`,
        `<p>Hint 3: edge cases. A superseded call must still settle its promise (resolve null) or awaiting code hangs. Clear the timer before setting a new one. Swallow only AbortError; rethrow real errors.</p>`
      ],
      solution: {
        approach: `<p>Each call takes a stamp, clears the pending timer and aborts the in-flight request. The returned promise waits <code>delay</code> ms; if another call arrived meanwhile its stamp is higher, so this one resolves to <code>null</code> without touching the network. Otherwise it fetches with a fresh AbortController, and after the response checks the stamp again before returning data.</p>`,
        code: { lang: 'js', run: true, code: `function makeSearcher(fetchFn, delay) {
  let timer = null, controller = null, latest = 0, pendingResolve = null;
  return function search(query) {
    const myId = ++latest;
    clearTimeout(timer);                                  // restart the debounce window
    if (controller) controller.abort();                   // kill the older request
    if (pendingResolve) pendingResolve(null);             // the older caller gets null, not a hung promise
    return new Promise((resolve) => {
      pendingResolve = resolve;
      timer = setTimeout(async () => {
        controller = new AbortController();
        try {
          const data = await fetchFn(query, controller.signal);
          resolve(myId === latest ? data : null);         // stale answers are dropped
        } catch (e) {
          if (e.name === 'AbortError') resolve(null); else throw e;
        }
      }, delay);
    });
  };
}

// demo with a fake backend
const fake = (q, signal) => new Promise((res, rej) => {
  const t = setTimeout(() => res(q + '!'), 50);
  signal.addEventListener('abort', () => { clearTimeout(t); const e = new Error('x'); e.name = 'AbortError'; rej(e); });
});
const s = makeSearcher(fake, 30);
s('r').then((v) => console.log('r   ->', v));
setTimeout(() => s('re').then((v) => console.log('re  ->', v)), 10);
setTimeout(() => s('rea').then((v) => console.log('rea ->', v)), 20);` },
        complexity: `<p>O(1) work per call. At most one timer and one in-flight request exist at any moment. Memory is constant.</p>`,
        followUps: ['Add an LRU cache in front of fetchFn.', 'Support a "leading" option that fires immediately on the first call.', 'How would you test this with fake timers?']
      }
    }
  ]
});

/* ===================== TOPIC 3: Infinite news feed ===================== */
topics.push({
  title: 'Design an Infinite News Feed',
  analogy: `<p>Think of a <b>sushi conveyor belt</b>. The kitchen keeps putting plates on the belt, but you only look at the few plates in front of you. You do not stack the whole day's sushi on your table (that would be every post in the DOM). The belt operator remembers "the last plate I gave you" (a <b>cursor</b>), not "I have given you 40 plates" (an <b>offset</b>), so if new plates are added at the start, you never get the same plate twice. And when you tap "I like this plate", the screen shows a heart at once; if the kitchen says "sorry, failed", the heart quietly goes away. That is an <b>optimistic update</b>.</p>`,
  explain: `<p><b>🟢 What the user sees.</b> A long list of posts (text, images, like and comment buttons). Scrolling near the bottom loads more. Tapping a heart responds immediately. A little pill "5 new posts" may appear at the top.</p>
    <p><b>Requirements.</b> Functional: load the first page fast, load more on scroll, like/unlike, show new posts without jumping the page, handle empty/error/end-of-feed. Non-functional: smooth 60 fps scrolling on a mid phone, memory that does not grow forever, works on flaky networks, scroll position is restored on Back.</p>
    <p><b>Three big ideas:</b></p>
    ${H.table(['Idea', 'Problem it solves', 'How'], [
      ['<b>Cursor pagination</b>', 'New posts shift offsets, causing duplicates or skipped items', 'Ask for "20 items after post X", the server returns <code>nextCursor</code>'],
      ['<b>Virtualization (windowing)</b>', '10,000 DOM nodes freeze the page and eat memory', 'Render only items near the viewport (+ a few extra = overscan); fake the rest with spacers'],
      ['<b>Optimistic updates</b>', 'Waiting 300 ms for a like feels laggy', 'Update UI first, send request, roll back on failure']
    ])}
    <p><b>Component tree:</b> <code>FeedPage</code> → <code>Feed</code> (owns the list state) → <code>VirtualList</code> → <code>PostCard</code> (memoised so a like re-renders one card). A <code>Sentinel</code> element near the end is watched by an <code>IntersectionObserver</code>; when it becomes visible we call <code>loadMore()</code>. No scroll-event maths needed.</p>
    <p><b>State shape</b> (normalised): <code>postsById</code>, <code>feedIds</code> (order), <code>nextCursor</code> (null at the end), <code>status</code>, and <code>pendingNew</code> (ids of fresh posts waiting behind the pill). The like button reads one post by id, so changing it re-renders one card.</p>
    <p><b>API contract:</b> <code>GET /feed?cursor=&lt;opaque&gt;&amp;limit=20</code> returns <code>{ items: [...], nextCursor: "abc" | null }</code>. The cursor is <i>opaque</i>: the client never decodes it. Like: <code>PUT /posts/:id/like</code> and <code>DELETE /posts/:id/like</code> are <b>idempotent</b> (repeating them is safe), unlike a toggle endpoint which breaks on retries.</p>
    <p><b>Windowing in one picture:</b> if each post is 80 px tall and the screen shows 600 px, about 8 posts are visible. Render those 8 plus 2 above and 2 below (overscan), and put an empty <code>div</code> above of height <code>firstIndex × 80</code> and one below, so the scrollbar still believes the list is 800,000 px tall.</p>
    ${H.kv([['total posts', '10,000'], ['rendered', '12 (not 10,000)'], ['top spacer', 'first × 80 px'], ['bottom spacer', '(total - last - 1) × 80 px']], { label: 'Virtual window' })}
    <p><b>Order of work on a scroll:</b> sentinel visible → <code>loadMore()</code> (skip if already loading or no cursor) → append page, dedupe by id → window recomputes from scroll position.</p>`,
  clues: [
    '"Design Facebook / Twitter / Instagram / LinkedIn feed" (frontend version)',
    '"Thousands of posts, page becomes sluggish" → virtualization / windowing',
    '"New posts arrive while the user scrolls" → cursor pagination, "N new posts" pill, never shift the viewport',
    '"Like button must feel instant" → optimistic update with rollback and idempotent API',
    '"Return to the feed and resume where I was" → keep cache + scroll offset, restore on Back',
    '"Images jump around as they load" → reserve space with width/height or aspect-ratio (CLS)'
  ],
  code: [
    { lang: 'js', run: true, title: 'Cursor paginator with de-duplication (runnable)', code: `// ---------- fake server: newest first, ids grow over time ----------
const server = { items: [], nextId: 1 };
function publish(text) { server.items.unshift({ id: server.nextId++, text }); }
for (let i = 1; i <= 8; i++) publish('post ' + i);          // ids 8..1, newest first

const encode = (id) => btoa('after:' + id);                  // opaque to the client
const decode = (cursor) => Number(atob(cursor).split(':')[1]);

async function fetchPage({ cursor, limit }) {
  let start = 0;
  if (cursor) {
    const afterId = decode(cursor);
    start = server.items.findIndex((it) => it.id < afterId); // first item OLDER than the cursor item
    if (start === -1) start = server.items.length;
  }
  const items = server.items.slice(start, start + limit);
  const hasMore = start + limit < server.items.length;
  return { items, nextCursor: hasMore ? encode(items[items.length - 1].id) : null };
}
async function fetchByOffset(offset, limit) { return server.items.slice(offset, offset + limit); }

// ---------- the client-side paginator ----------
class FeedPager {
  constructor(fetchPageFn, limit) {
    Object.assign(this, { fetchPageFn, limit, items: [], seen: new Set(), cursor: null, hasMore: true, inflight: null, requests: 0 });
  }
  loadMore() {
    if (!this.hasMore) return Promise.resolve();            // end of feed
    if (this.inflight) return this.inflight;                // already loading: share the same promise
    this.requests++;
    this.inflight = this.fetchPageFn({ cursor: this.cursor, limit: this.limit })
      .then((page) => {
        for (const it of page.items) if (!this.seen.has(it.id)) { this.seen.add(it.id); this.items.push(it); } // dedupe by id
        this.cursor = page.nextCursor;
        this.hasMore = page.nextCursor !== null;
      })
      .finally(() => { this.inflight = null; });
    return this.inflight;
  }
}

(async () => {
  const pager = new FeedPager(fetchPage, 3);
  await pager.loadMore();                                    // page 1: ids 8,7,6
  const offsetPage1 = await fetchByOffset(0, 3);
  publish('breaking A'); publish('breaking B');              // two NEW posts arrive: ids 9, 10
  await Promise.all([pager.loadMore(), pager.loadMore()]);   // double trigger from the sentinel -> only 1 request
  const offsetPage2 = await fetchByOffset(3, 3);
  console.log('cursor feed :', pager.items.map((i) => i.id).join(','));
  console.log('offset page1:', offsetPage1.map((i) => i.id).join(','), '| page2:', offsetPage2.map((i) => i.id).join(','), '<- 7 and 6 repeated!');
  console.log('requests made by pager (page1 + page2):', pager.requests);
  while (pager.hasMore) await pager.loadMore();
  console.log('final       :', pager.items.map((i) => i.id).join(','), '| hasMore =', pager.hasMore);
})();` },
    { lang: 'js', run: true, title: 'Virtual window maths (runnable)', code: `// Which items must exist in the DOM for this scroll position?
function visibleRange({ scrollTop, viewportHeight, itemHeight, total, overscan }) {
  const first = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const last = Math.min(total - 1, Math.ceil((scrollTop + viewportHeight) / itemHeight) - 1 + overscan);
  return {
    first, last,
    topSpacer: first * itemHeight,                        // empty div above the rendered items
    bottomSpacer: (total - 1 - last) * itemHeight,        // empty div below
    rendered: last - first + 1
  };
}
const base = { viewportHeight: 600, itemHeight: 80, total: 10000, overscan: 2 };
for (const y of [0, 400, 80000, 799400]) {
  const r = visibleRange({ ...base, scrollTop: y });
  console.log('scrollTop', String(y).padStart(6), '-> render', r.first + '..' + r.last, '(' + r.rendered + ' nodes), spacers', r.topSpacer + ' / ' + r.bottomSpacer);
}` },
    { lang: 'js', run: true, title: 'Optimistic like with rollback (runnable)', code: `const state = { posts: { p1: { id: 'p1', likedByMe: false, likeCount: 10 } } };

async function setLike(postId, wantLiked, api) {
  const before = state.posts[postId];                      // remember the old value for rollback
  if (before.likedByMe === wantLiked) return;              // nothing to do (also guards double clicks)
  state.posts[postId] = { ...before, likedByMe: wantLiked, likeCount: before.likeCount + (wantLiked ? 1 : -1) };
  console.log('UI now     :', JSON.stringify(state.posts[postId]));
  try {
    await api(postId, wantLiked);                          // PUT or DELETE /posts/:id/like (idempotent)
    console.log('server says: OK');
  } catch (err) {
    state.posts[postId] = before;                          // roll back to exactly what it was
    console.log('server says: FAILED -> rolled back to', JSON.stringify(before));
  }
}

const okApi = () => new Promise((r) => setTimeout(r, 20));
const badApi = () => new Promise((_, rej) => setTimeout(() => rej(new Error('500')), 20));
(async () => { await setLike('p1', true, okApi); await setLike('p1', false, badApi); })();` },
    { lang: 'js', title: 'Sentinel + IntersectionObserver (browser code)', code: `// A tiny empty div after the last post. When it scrolls near the viewport, load more.
const sentinel = document.querySelector('#feed-sentinel');
const io = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting) pager.loadMore();        // loadMore ignores calls while loading or at the end
}, { rootMargin: '800px 0px' });                          // start loading ~1 screen BEFORE the user reaches the bottom
io.observe(sentinel);
// when the component is removed: io.disconnect();` }
  ],
  viz: [
    {
      title: 'Virtual window sliding over the feed',
      input: '20 5 1 0 3 7 12 15',
      inputLabel: 'total posts, visible rows, overscan, then top-row positions to scroll to',
      gen: function (input) {
        var t = String(input).trim().split(/\s+/).map(Number);
        if (t.length < 4 || t.some(isNaN)) throw new Error('Format: total visible overscan pos1 pos2 ... (numbers)');
        var total = t[0], vis = t[1], over = t[2], pos = t.slice(3, 12);
        if (total < 5 || total > 40 || vis < 1 || vis > total || over < 0 || over > 4) throw new Error('total 5-40, visible 1..total, overscan 0-4');
        var vals = []; for (var i = 0; i < total; i++) vals.push('P' + i);
        var H80 = 80, frames = [];
        function frame(top, why) {
          top = Math.max(0, Math.min(total - vis, top));
          var last = top + vis - 1, from = Math.max(0, top - over), to = Math.min(total - 1, last + over), hl = {}, ptr = {};
          for (var k = from; k <= to; k++) hl[k] = (k < top || k > last) ? 'ok' : 'win';
          ptr[top] = ['top'];
          if (ptr[last]) ptr[last].push('bottom'); else ptr[last] = ['bottom'];
          return { narr: why + ' Blue = visible, green = overscan (rendered but off-screen), unmarked = <b>not in the DOM at all</b>.', parts: [
            { type: 'array', label: 'Feed items (' + total + ' total)', values: vals, hl: hl, ptr: ptr, showIdx: true },
            { type: 'vars', label: 'What the browser really holds', vals: { DOM_nodes: (to - from + 1) + ' of ' + total, render_range: from + '..' + to, top_spacer_px: from * H80, bottom_spacer_px: (total - 1 - to) * H80 }, hl: { DOM_nodes: 'ok' } }
          ] };
        }
        frames.push(frame(0, 'Scroll position 0: the top ' + vis + ' posts are visible.'));
        pos.forEach(function (p) { frames.push(frame(p, 'The user scrolls so post <b>P' + Math.max(0, Math.min(total - vis, p)) + '</b> is at the top. Recompute the range: floor(scrollTop / height), then add overscan on both sides.')); });
        frames.push({ narr: 'Why overscan? When you scroll fast, the new rows must already exist, otherwise the user sees blank gaps for a moment. A couple of extra rows are cheap insurance.', parts: [{ type: 'text', html: '<b>Rule:</b> render cost depends on the <i>window size</i>, not on the total number of posts.' }] });
        return frames;
      }
    },
    {
      title: 'Offset pagination vs cursor pagination when new posts arrive',
      input: '3 2',
      inputLabel: 'page size, new posts that arrive after page 1',
      gen: function (input) {
        var t = String(input).trim().split(/\s+/).map(Number);
        var L = t[0], K = t[1];
        if (!(L >= 2 && L <= 5) || !(K >= 1 && K <= 4)) throw new Error('Format: pageSize (2-5) newPosts (1-4)');
        var server = []; for (var i = 12; i >= 1; i--) server.push(i);
        var off = [], cur = [], frames = [];
        function mark(arr) { var seen = {}, hl = {}; arr.forEach(function (v, i) { if (seen[v]) hl[i] = 'bad'; else { seen[v] = true; hl[i] = 'ok'; } }); return hl; }
        function show(narr) { return { narr: narr, parts: [{ type: 'array', label: 'Server feed (newest first)', values: server.slice(0, 14) }, { type: 'array', label: 'Offset client shows', values: off.length ? off.slice() : ['-'], hl: mark(off) }, { type: 'array', label: 'Cursor client shows', values: cur.length ? cur.slice() : ['-'], hl: mark(cur) }] }; }
        frames.push(show('The server has posts 12 down to 1 (12 is newest). Both clients are empty. Page size is <b>' + L + '</b>.'));
        var p1 = server.slice(0, L);
        off = p1.slice(); cur = p1.slice();
        var lastSeen = p1[p1.length - 1];
        frames.push(show('Page 1: offset=0 and "no cursor" give the same first ' + L + ' posts. So far so good.'));
        for (var n = 1; n <= K; n++) server.unshift(12 + n);
        frames.push(show('<b>' + K + ' new post(s) arrive</b> at the top of the server list. Every old post moved down by ' + K + ' positions.'));
        var offP2 = server.slice(L, 2 * L);
        off = off.concat(offP2);
        frames.push(show('Page 2 by <b>offset</b> ("skip ' + L + '"): the server skips ' + L + ' of the NEW list, so the last ' + Math.min(K, L) + ' post(s) of page 1 appear <span class="c-r">again (duplicates in red)</span>.'));
        var idx = server.findIndex(function (v) { return v < lastSeen; });
        var curP2 = server.slice(idx, idx + L);
        cur = cur.concat(curP2);
        frames.push(show('Page 2 by <b>cursor</b> ("after post ' + lastSeen + '"): the server finds the first post older than ' + lastSeen + '. No duplicates, nothing skipped. The new posts wait behind a "' + K + ' new posts" pill.'));
        return frames;
      }
    },
    {
      title: 'Optimistic like: instant UI, rollback on failure',
      input: 'fail',
      inputLabel: 'Server result: ok or fail',
      gen: function (input) {
        var res = String(input).trim().toLowerCase();
        if (res !== 'ok' && res !== 'fail') throw new Error('Type ok or fail');
        var frames = [];
        function f(narr, ui, net, hl) { return { narr: narr, parts: [{ type: 'vars', label: 'What the user sees', vals: ui, hl: hl || {} }, { type: 'queue', label: 'Network', items: net, frontLabel: 'sent', backLabel: 'waiting' }] }; }
        frames.push(f('A post shows <b>10 likes</b>, not liked by me. Nothing is in flight.', { heart: 'empty', likes: 10 }, []));
        frames.push(f('The user taps the heart. We <b>save a copy</b> of the old post (for rollback) and update the UI <b>immediately</b>.', { heart: 'filled', likes: 11 }, [], { heart: 'cur', likes: 'cur' }));
        frames.push(f('In the background we send <code>PUT /posts/p1/like</code>. The UI already looks done, so the tap felt instant.', { heart: 'filled', likes: 11 }, ['PUT /posts/p1/like'], { heart: 'win' }));
        if (res === 'ok') {
          frames.push(f('Server answered <b>200 OK</b>. Nothing changes on screen; our guess was right. Optionally replace local data with the server\'s count.', { heart: 'filled', likes: 11 }, [], { heart: 'ok', likes: 'ok' }));
          frames.push(f('Because PUT is idempotent, a retry after a timeout cannot double-count. A toggle endpoint would have broken here.', { heart: 'filled', likes: 11 }, [], { heart: 'ok' }));
        } else {
          frames.push(f('Server answered <b>500</b>. Our guess was wrong.', { heart: 'filled', likes: 11 }, ['PUT /posts/p1/like  (500)'], { heart: 'bad', likes: 'bad' }));
          frames.push(f('<b>Rollback</b>: restore the saved copy (not "subtract one", which breaks if other updates happened) and show a small toast "Could not like. Try again".', { heart: 'empty', likes: 10 }, [], { heart: 'cur', likes: 'cur' }));
        }
        return frames;
      }
    },
    {
      title: 'News feed component tree',
      gen: function () {
        var arr = ['FeedPage', 'TopBar', 'Feed', 'Tabs', 'Composer', 'VirtualList', 'Sentinel', null, null, null, null, 'PostCard', 'Skeleton'];
        return [
          treeFrame('The page: a top bar (tabs and composer) and the feed. Everything about posts is inside <b>Feed</b>.', 'Feed tree', arr),
          treeFrame('<b>Feed</b> owns the list state: <code>postsById</code>, <code>feedIds</code>, <code>nextCursor</code>, <code>status</code>. Tabs write the active tab into the URL (<code>?tab=following</code>).', 'State owners', arr, { 2: 'sel', 3: 'win' }, { 2: 'feed state', 3: 'URL state' }),
          treeFrame('<b>VirtualList</b> measures the scroll container and renders only the window of rows. It does not know what a post is; it just asks the parent to render row i.', 'Windowing', arr, { 5: 'cur', 11: 'ok' }, { 5: 'range 12..24', 11: 'row' }),
          treeFrame('The <b>Sentinel</b> sits after the last row. When it nears the viewport, an IntersectionObserver tells Feed to call <code>loadMore()</code>.', 'Infinite scroll trigger', arr, { 6: 'cur', 2: 'win' }, { 6: 'IntersectionObserver', 2: 'loadMore()' }),
          treeFrame('<b>PostCard</b> is memoised and reads one post by id. A like changes one entry in <code>postsById</code>, so only that card re-renders. <b>Skeleton</b> rows hold the space while loading.', 'Cheap updates', arr, { 11: 'sel', 12: 'done' }, { 11: 'React.memo', 12: 'fixed height' })
        ];
      }
    }
  ],
  examples: [
    { title: 'Worked numbers: how much does virtualization save?', html: `<p>Each post card has about 40 DOM nodes (text, avatar, buttons, icons). A feed of 5,000 posts:</p>
      ${H.table(['Approach', 'DOM nodes', 'Rough memory', 'Initial render', 'Scroll feel'], [
        ['Render everything', '5,000 × 40 = <span class="c-r">200,000</span>', '~100 MB+', 'seconds on a mid phone', 'janky'],
        ['Windowed (12 rows + overscan)', '~16 × 40 = <span class="c-g">640</span>', 'a few MB', 'a few ms', 'smooth']
      ])}
      <p>The page also keeps all 5,000 <i>data</i> objects (cheap, a few MB) but only creates DOM for the window. For extremely long sessions, drop data far from the window and re-fetch on demand.</p>` },
    { title: '"N new posts" pill instead of jumping the page', html: `<p>If new posts are inserted above while the user is reading, everything slides down and they lose their place. Better:</p>
      <ol><li>Poll (or receive a push) and store new ids in <code>pendingNew</code>.</li><li>Show a pill: "3 new posts".</li><li>When the user clicks it, prepend the posts and scroll to top.</li></ol>
      <p>If you must insert above the viewport, preserve position: measure <code>scrollHeight</code> before and after, then add the difference to <code>scrollTop</code> (CSS <code>overflow-anchor</code> helps in browsers that support it).</p>` },
    { title: 'Restore position when the user comes Back', html: `<p>Users open a post, press Back, and expect the feed exactly as it was. Keep three things: the cached pages (query cache), the cursor, and <code>scrollTop</code> (or first visible index + offset). On return, render the cached items first, then scroll. For single-page apps use <code>history.scrollRestoration = 'manual'</code> and save the position in <code>history.state</code> or <code>sessionStorage</code> keyed by URL.</p>`, code: { lang: 'js', code: `// save on the way out
window.addEventListener('pagehide', () => {
  sessionStorage.setItem('feed:scroll', String(window.scrollY));
});
// restore after cached posts rendered
const y = Number(sessionStorage.getItem('feed:scroll') || 0);
window.scrollTo(0, y);` } }
  ],
  deepDive: `<p><b>🟣 Cursor design.</b> Good cursors encode a <b>stable sort key</b>, usually <code>(createdAt, id)</code>, not just an id, because ranked or time-sorted feeds can have ties. The server builds <code>WHERE (created_at, id) &lt; (:t, :id) ORDER BY created_at DESC, id DESC LIMIT 20</code>, which an index can answer in O(log N + page). Offset pagination makes the database scan and throw away <code>offset</code> rows; page 5,000 is slow. Keep the cursor opaque (base64) so the server can change its internals.</p>
    <p><b>Ranked feeds</b> (algorithmic ordering) are trickier: ranking changes between requests, so the server often returns a snapshot id or a <i>session token</i> with the cursor so pages come from one consistent ranking. Say this out loud in the interview; it shows depth.</p>
    <p><b>Virtualization with variable heights.</b> Fixed-height rows make maths trivial. Posts vary (images, text), so libraries measure rows after render (ResizeObserver) and cache heights in an array; offsets come from prefix sums and the start index is found by <b>binary search</b> (O(log N)), which is the guided problem below. Before measurement you use an estimated height; when a real height differs, correct scroll position so the content under the user's eyes does not jump (scroll anchoring). Trade-offs of virtualization: Ctrl+F cannot find off-screen text, screen readers see only the window, and anchor links to off-screen items need extra work. Provide <code>aria-setsize</code>/<code>aria-posinset</code> or a <code>role="feed"</code> with <code>role="article"</code> children and keep a stable DOM order.</p>
    <p><b>Recycling vs windowing.</b> Windowing creates and destroys nodes as you scroll; <i>recycling</i> reuses the same N nodes by changing their content and <code>transform</code> (RecyclerView on Android works this way). Reuse is faster but leaks state between rows unless carefully reset. Also use <code>content-visibility: auto</code> as a cheap alternative for moderately long lists: the browser skips rendering off-screen sections.</p>
    <p><b>Images.</b> Use <code>loading="lazy"</code> for below-the-fold images, <code>width</code>/<code>height</code> or <code>aspect-ratio</code> to prevent layout shift (CLS), responsive <code>srcset</code>, modern formats (AVIF/WebP), a blurred low-quality placeholder, and set <code>fetchpriority="high"</code> only on the first image (it is the LCP candidate). Videos: autoplay muted only the one most visible, pause others (IntersectionObserver with thresholds).</p>
    <p><b>Optimistic update traps.</b> (1) <b>Rapid taps:</b> A then B. If A fails after B succeeded, rolling back to the pre-A snapshot undoes B. Serialise writes per post (queue them) or keep the "desired" state and reconcile with the server's final answer. (2) <b>Counts:</b> never trust a computed local count forever; replace with the server value on response. (3) <b>Offline:</b> queue the mutation, show a pending style, retry with backoff. (4) Use idempotency keys for non-idempotent writes such as "create comment".</p>
    <p><b>Realtime updates.</b> Polling every 30 to 60 s is fine for a feed; WebSocket/SSE pushes are better for like counts. Coalesce updates (batch every 500 ms) to avoid re-render storms. <b>Memory:</b> cap cached pages; drop images off-screen.</p>`,
  aiEra: `<p><b>🤖 What AI changes.</b> Feeds are increasingly <b>personalised by ML models</b> and may contain AI-generated summaries or "why you are seeing this" explanations. For the frontend this means non-deterministic ordering (so cursors need snapshot tokens), content that streams in (summaries arrive token by token inside a card), and more experiments (feature flags and A/B tests change card layouts per user).</p>
    <p><b>Use AI as a partner:</b> ask <code>Generate 30 realistic post payloads with edge cases: very long text, no image, deleted author, emoji, RTL language</code> to stress-test your card. Ask <code>Review this virtual list for scroll-jump bugs when row height changes</code> and verify its claims by reproducing them.</p>
    <p><b>Where AI goes wrong:</b> it recommends offset pagination and <code>page++</code> counters, attaches scroll listeners without throttling instead of IntersectionObserver, renders thousands of rows "because React is fast", forgets alt text and layout-shift prevention, and writes optimistic updates with no rollback or per-item queue. Its virtualization code often ignores variable heights and resize.</p>
    <p><b>What you must still own:</b> the contract (cursor, idempotent writes), the state shape, the trade-off between library and hand-rolled windowing, and a clear explanation of what the user sees during loading, failure and end-of-feed.</p>`,
  problems: [
    {
      title: 'Visible Range for a Virtual List (Variable Heights)',
      level: 'Medium', tags: ['virtualization', 'binary search', 'prefix sums'], companies: ['Meta', 'Airbnb', 'Uber'],
      statement: `<p>A feed has rows of different heights. Given the array of row <code>heights</code>, the current <code>scrollTop</code>, the <code>viewportHeight</code> and an <code>overscan</code> count, return <code>{ first, last }</code>: the indexes of the first and last rows that should be rendered (visible rows plus overscan on each side, clamped to the list). It will run on every scroll event, so it must be fast for 10<sup>5</sup> rows.</p>`,
      constraints: `<p>1 ≤ N ≤ 10<sup>5</sup>, 1 ≤ height ≤ 10<sup>4</sup>, 0 ≤ scrollTop, 0 ≤ overscan ≤ 10. Heights do not change between calls (prefix sums can be built once).</p>`,
      example: `${H.table(['heights', 'scrollTop', 'viewport', 'overscan', 'answer'], [['[50,100,50,50,200]', '120', '100', '0', 'first 1, last 3']])}<p>Row tops are 0, 50, 150, 200, 250 (total 450). Pixel 120 lies in row 1 (50 to 150). The bottom pixel 219 lies in row 3 (200 to 250). So rows 1..3 are visible.</p>`,
      brute: { why: `<p>Walk all rows from the top adding heights until you pass <code>scrollTop</code>, then continue until you pass the bottom. That is O(N) per scroll event: with 100,000 rows and 60 events per second, it burns the main thread and causes jank. The wasted work is re-adding the same heights again and again.</p>`, code: `function visibleRangeLinear(heights, scrollTop, viewportHeight, overscan) {
  let y = 0, first = -1, last = -1;
  for (let i = 0; i < heights.length; i++) {
    const top = y, bottom = y + heights[i];
    if (first === -1 && bottom > scrollTop) first = i;               // first row that ends below the top edge
    if (top < scrollTop + viewportHeight) last = i;                   // last row that starts above the bottom edge
    y = bottom;
  }
  return { first: Math.max(0, first - overscan), last: Math.min(heights.length - 1, last + overscan) };
}` },
      mcq: { q: 'Which technique makes finding the first visible row fast when heights vary?', options: ['Prefix sums of heights plus binary search', 'A bigger overscan', 'Dividing scrollTop by the average height only', 'Re-rendering every row and reading getBoundingClientRect'], answer: 0, explain: 'Prefix sums give each row\'s top offset in a sorted array, so binary search finds the row containing a pixel in O(log N). Averages are only approximate and DOM measuring all rows is O(N) and forces layout.' },
      hints: [
        `<p>Hint 1: the aha. Turn the heights into <b>row tops</b> (a running total). That array is sorted, so "which row contains pixel y" is a search problem.</p>`,
        `<p>Hint 2: build <code>offsets[i]</code> = top of row i once, with <code>offsets[N]</code> = total height. Then find the largest i with <code>offsets[i] &lt;= y</code> using binary search.</p>`,
        `<p>Hint 3: edge cases. The bottom pixel is <code>scrollTop + viewportHeight - 1</code>, but clamp it to <code>total - 1</code> if the user is near the end. Clamp first and last after adding overscan. Handle an empty list.</p>`
      ],
      solution: {
        approach: `<p>Build prefix offsets once (O(N)). On each scroll, binary-search the row containing the top pixel and the row containing the bottom pixel (O(log N) each), then widen by overscan and clamp.</p>`,
        code: { lang: 'js', run: true, code: `function buildOffsets(heights) {
  const off = [0];
  for (const h of heights) off.push(off[off.length - 1] + h);      // off[i] = top of row i, off[N] = total
  return off;
}
// largest i such that off[i] <= y  (the row that contains pixel y)
function rowAt(off, y) {
  let lo = 0, hi = off.length - 2;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;                                 // upper mid avoids an infinite loop
    if (off[mid] <= y) lo = mid; else hi = mid - 1;
  }
  return lo;
}
function visibleRange(off, scrollTop, viewportHeight, overscan) {
  const n = off.length - 1;
  if (n === 0) return null;
  const total = off[n];
  const topY = Math.min(scrollTop, total - 1);
  const bottomY = Math.min(scrollTop + viewportHeight - 1, total - 1);
  return { first: Math.max(0, rowAt(off, topY) - overscan), last: Math.min(n - 1, rowAt(off, bottomY) + overscan) };
}

const off = buildOffsets([50, 100, 50, 50, 200]);
console.log(visibleRange(off, 120, 100, 0));   // { first: 1, last: 3 }
console.log(visibleRange(off, 0, 100, 1));     // { first: 0, last: 2 }
console.log(visibleRange(off, 440, 100, 0));   // near the end: { first: 4, last: 4 }` },
        complexity: `<p>Setup O(N) once; each scroll event costs O(log N) time and O(1) extra space. Memory for offsets is O(N).</p>`,
        followUps: ['A row height changes after an image loads. Update offsets without rebuilding everything (Fenwick tree).', 'Keep the viewport stable when a row above it grows.']
      }
    }
  ]
});

/* ===================== TOPIC 4: Image carousel ===================== */
topics.push({
  title: 'Design an Image Carousel (Lazy Load, A11y, Swipe)',
  analogy: `<p>Picture a <b>shop window with a sliding strip of photos</b> behind a frame. Only one photo fits in the frame at a time. A smart shopkeeper keeps the <i>next</i> and <i>previous</i> photos ready just outside the frame (so sliding feels instant) but does not carry the whole warehouse of photos to the window (that is <b>lazy loading</b>). A blind visitor can ask "which photo is this, and how many are there?" (that is <b>accessibility</b>), and a visitor with a finger can drag the strip: if they drag far enough or flick fast, it slides to the next photo, otherwise it springs back (that is <b>swipe</b>).</p>`,
  explain: `<p><b>🟢 What the user sees.</b> One large image with left/right arrows, dots underneath, maybe auto-play. On phones, you swipe. On a keyboard, <kbd>←</kbd> and <kbd>→</kbd> work.</p>
    <p><b>Requirements.</b> Functional: next/previous, jump by dots, swipe on touch, optional loop, optional auto-play with pause. Non-functional: no layout shift while images load, only load what is needed, 60 fps animation, keyboard and screen-reader support, respects "reduce motion".</p>
    <p><b>Two ways to build the strip:</b></p>
    ${H.table(['Approach', 'How it works', 'Pros', 'Cons'], [
      ['<b>CSS scroll-snap</b>', 'A horizontal scroll container with <code>scroll-snap-type: x mandatory</code>; each slide <code>scroll-snap-align: center</code>', 'Native swipe, momentum, keyboard scrolling; almost no JS; works with find-in-page', 'Looping needs tricks; less control of animation'],
      ['<b>transform: translateX</b>', 'JS keeps <code>index</code> and <code>dragX</code>; the track moves with <code>transform</code>', 'Full control, infinite loop, custom easing', 'You re-implement touch, momentum and a11y by hand']
    ])}
    <p><b>Lean answer:</b> start with scroll-snap (less code, fewer bugs); reach for transforms only if a requirement (infinite loop, 3D effects) demands it.</p>
    <p><b>Component tree:</b> <code>Carousel</code> (state: <code>index</code>, <code>paused</code>) → <code>Track</code> → many <code>Slide</code>s (each holds an <code>img</code>); <code>Controls</code> (prev, next, pause); <code>Dots</code>; a hidden <code>LiveRegion</code> that says "Slide 3 of 6".</p>
    <p><b>Lazy loading rule.</b> Always load the current slide at high priority (it is probably the page's biggest image, the LCP element). Preload <b>index−1 and index+1</b> so the next swipe is instant. Everything else: do not even put a <code>src</code> yet (or use <code>loading="lazy"</code>). Reserve space with <code>aspect-ratio: 16 / 9</code> so nothing jumps.</p>
    <p><b>Accessibility (the "APG carousel" pattern):</b></p>
    <ul>
      <li>Container: <code>role="region"</code> + <code>aria-roledescription="carousel"</code> + a label.</li>
      <li>Each slide: <code>role="group"</code> + <code>aria-roledescription="slide"</code> + <code>aria-label="3 of 6"</code>.</li>
      <li>Buttons are real <code>&lt;button&gt;</code> elements with names ("Previous slide").</li>
      <li>Auto-play must have a visible <b>Pause</b> button (WCAG 2.2.2) and should also stop on hover/focus (APG advice). Never auto-play with <code>prefers-reduced-motion</code>.</li>
      <li>Off-screen slides should not be tabbable: use <code>inert</code> or <code>aria-hidden</code> + <code>tabindex="-1"</code> on their links.</li>
      <li>Announce changes politely only when the user triggered them (<code>aria-live="polite"</code>); keep it <code>off</code> during auto-play.</li>
    </ul>
    <p><b>Swipe in one rule.</b> On pointer release: if the finger travelled more than ~25% of the width <b>or</b> moved faster than ~0.5 px/ms, go to the neighbour in that direction; otherwise snap back. At the first/last slide (no loop) apply rubber-band resistance.</p>`,
  clues: [
    '"Design an image carousel / slider / gallery / banner"',
    '"Images are large, page must load fast" → lazy load, preload neighbours, responsive <code>srcset</code>, reserve space (CLS)',
    '"Works on mobile" → pointer events, <code>touch-action: pan-y</code>, swipe threshold + velocity',
    '"Screen reader / keyboard users" → carousel ARIA pattern, real buttons, arrow keys, pause control',
    '"Auto-rotating hero banner" → pause on hover/focus, reduced-motion, WCAG 2.2.2',
    '"Infinite looping" → clone first/last slide or modular arithmetic index'
  ],
  code: [
    { lang: 'js', run: true, title: 'Carousel state + swipe decision (runnable)', code: `// Pure logic: no DOM, so it is trivial to test.
function createCarousel(count, loop) {
  let index = 0;
  // loop: wrap around (-1 becomes count-1).  no loop: clamp inside 0..count-1
  const wrap = (i) => (loop ? ((i % count) + count) % count : Math.min(count - 1, Math.max(0, i)));
  return {
    get index() { return index; },
    next() { index = wrap(index + 1); return index; },
    prev() { index = wrap(index - 1); return index; },
    goTo(i) { index = wrap(i); return index; },
    // slides whose image should be requested: current + neighbours (duplicates removed)
    toLoad() { return [...new Set([wrap(index - 1), index, wrap(index + 1)])].sort((a, b) => a - b); },
    label() { return 'Slide ' + (index + 1) + ' of ' + count; }
  };
}

// dx: finger distance in px (negative = moved left), vx: speed in px/ms, width: slide width
function swipeDecision(dx, vx, width) {
  const farEnough = Math.abs(dx) > width * 0.25;
  const fastEnough = Math.abs(vx) > 0.5;
  if (!farEnough && !fastEnough) return 'snap back';
  return dx < 0 ? 'go next' : 'go prev';       // dragging left reveals the NEXT slide
}

const c = createCarousel(5, true);
console.log(c.label(), 'load', c.toLoad());      // slide 1: loads 4,0,1 (wrap)
c.prev();
console.log(c.label(), 'load', c.toLoad());      // slide 5: loads 3,4,0
const flat = createCarousel(5, false);
flat.prev();
console.log(flat.label(), 'load', flat.toLoad()); // clamped: still slide 1, loads 0,1
console.log(swipeDecision(-120, 0.1, 320));       // far enough -> go next
console.log(swipeDecision(-30, 0.8, 320));        // short but fast flick -> go next
console.log(swipeDecision(40, 0.1, 320));         // small and slow -> snap back` },
    { lang: 'css', title: 'Scroll-snap carousel (almost no JavaScript)', code: `.carousel { position: relative; }
.track {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;        /* always stop exactly on a slide */
  scroll-behavior: smooth;
  overscroll-behavior-x: contain;       /* do not trigger browser Back by swiping */
  scrollbar-width: none;
}
.slide {
  flex: 0 0 100%;
  scroll-snap-align: center;
  aspect-ratio: 16 / 9;                 /* reserve space: no layout shift */
}
.slide img { width: 100%; height: 100%; object-fit: cover; display: block; }
@media (prefers-reduced-motion: reduce) {
  .track { scroll-behavior: auto; }     /* respect the user's setting */
}` },
    { lang: 'html', title: 'Accessible markup', code: `<section class="carousel" role="region" aria-roledescription="carousel" aria-label="Featured photos">
  <button type="button" aria-label="Pause automatic rotation">Pause</button>
  <div class="track" aria-live="off">
    <div class="slide" role="group" aria-roledescription="slide" aria-label="1 of 3">
      <img src="photo1.avif" width="1280" height="720" alt="Sunrise over a mountain lake" fetchpriority="high">
    </div>
    <div class="slide" role="group" aria-roledescription="slide" aria-label="2 of 3">
      <img data-src="photo2.avif" width="1280" height="720" alt="Fishing boat at the harbour" loading="lazy">
    </div>
    <div class="slide" role="group" aria-roledescription="slide" aria-label="3 of 3">
      <img data-src="photo3.avif" width="1280" height="720" alt="Market stall with spices" loading="lazy">
    </div>
  </div>
  <button type="button" aria-label="Previous slide">&#8249;</button>
  <button type="button" aria-label="Next slide">&#8250;</button>
</section>` },
    { lang: 'js', title: 'Pointer-event swipe (browser code)', code: `const track = document.querySelector('.track');   // CSS: touch-action: pan-y  (we handle X, browser handles vertical scroll)
let startX = 0, startT = 0, dragging = false;

track.addEventListener('pointerdown', (e) => {
  dragging = true; startX = e.clientX; startT = performance.now();
  track.setPointerCapture(e.pointerId);            // keep receiving moves even if the finger leaves the element
});
track.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const dx = e.clientX - startX;
  track.style.transform = 'translateX(' + (-index * width + dx) + 'px)';   // the strip follows the finger 1:1
});
track.addEventListener('pointerup', (e) => {
  if (!dragging) return;
  dragging = false;
  const dx = e.clientX - startX;
  const vx = dx / Math.max(1, performance.now() - startT);              // px per ms
  const action = swipeDecision(dx, vx, width);
  if (action === 'go next') carousel.next(); else if (action === 'go prev') carousel.prev();
  render();                                          // animate to the final index (snap back if unchanged)
});` }
  ],
  viz: [
    {
      title: 'Lazy loading: only the current slide and its neighbours exist',
      input: '6 0 1 2 5 4',
      inputLabel: 'slide count, then the slides the user visits (0-based)',
      gen: function (input) {
        var t = String(input).trim().split(/\s+/).map(Number);
        if (t.length < 2 || t.some(isNaN)) throw new Error('Format: count then visited indexes, e.g. 6 0 1 2 5 4');
        var n = t[0], visits = t.slice(1, 12);
        if (n < 3 || n > 14) throw new Error('Use 3 to 14 slides');
        visits.forEach(function (v) { if (v < 0 || v >= n) throw new Error('Visited index must be between 0 and ' + (n - 1)); });
        var vals = []; for (var i = 0; i < n; i++) vals.push('S' + i);
        var loaded = {}, reqs = 0, frames = [];
        function load(i) { if (i >= 0 && i < n && !loaded[i]) { loaded[i] = true; reqs++; return true; } return false; }
        function frame(cur, why) {
          var hl = {};
          Object.keys(loaded).forEach(function (k) { hl[k] = 'ok'; });
          hl[cur] = 'cur';
          var loadedList = Object.keys(loaded).map(Number).sort(function (a, b) { return a - b; });
          return { narr: why, parts: [
            { type: 'array', label: 'Slides (amber = showing, green = image already downloaded, plain = never requested)', values: vals, hl: hl, showIdx: true },
            { type: 'vars', label: 'Network', vals: { images_downloaded: loadedList.length + ' of ' + n, image_requests: reqs, showing: 'S' + cur }, hl: { images_downloaded: 'ok' } }
          ] };
        }
        load(visits[0]); load(visits[0] + 1); load(visits[0] - 1);
        frames.push(frame(visits[0], 'Page opens on slide S' + visits[0] + '. We request its image first (high priority), then the two neighbours so a swipe feels instant.'));
        for (var k = 1; k < visits.length; k++) {
          var v = visits[k], before = reqs;
          load(v); load(v + 1); load(v - 1);
          var added = reqs - before;
          frames.push(frame(v, 'The user goes to S' + v + '. ' + (added === 0 ? '<span class="c-g">Everything needed was already loaded: 0 new requests.</span>' : 'We fetch <b>' + added + '</b> missing image(s): ' + (loaded[v] ? 'the target and its neighbours, as needed.' : '') ) + ' Jumping far (a dot click) loads that area, not the slides in between.'));
        }
        frames.push({ narr: 'Result: <b>' + reqs + '</b> image request(s) instead of ' + n + '. Each unused hero image you skip saves 100 to 300 KB of mobile data.', parts: [{ type: 'array', label: 'Slides', values: vals, hl: (function () { var o = {}; Object.keys(loaded).forEach(function (k2) { o[k2] = 'ok'; }); return o; })() }] });
        return frames;
      }
    },
    {
      title: 'Swipe decision: distance or speed',
      input: '-120 0.1',
      inputLabel: 'finger distance dx in px (negative = left), speed in px/ms',
      gen: function (input) {
        var t = String(input).trim().split(/\s+/).map(Number);
        if (t.length < 2 || t.some(isNaN)) throw new Error('Format: dx speed, e.g. -120 0.1');
        var dx = t[0], vx = Math.abs(t[1]), W = 320, thr = W * 0.25;
        var far = Math.abs(dx) > thr, fast = vx > 0.5;
        var go = far || fast, dir = dx < 0 ? 'next' : 'prev';
        var arr = ['prev', 'current', 'next'];
        var frames = [];
        frames.push({ narr: 'The slide is <b>' + W + ' px</b> wide. Rule: release past <b>25% (' + thr + ' px)</b> <i>or</i> faster than <b>0.5 px/ms</b> to change slide.', parts: [{ type: 'array', label: 'Strip', values: arr, hl: { 1: 'cur' } }, { type: 'vars', vals: { width: W, distance_threshold: thr, speed_threshold: 0.5 } }] });
        frames.push({ narr: 'Finger goes down. We remember the start x and the time, and capture the pointer so we keep getting events.', parts: [{ type: 'array', label: 'Strip', values: arr, hl: { 1: 'cur' } }, { type: 'vars', vals: { dx: 0, speed: 0 } }] });
        frames.push({ narr: 'Finger moves by <b>' + dx + ' px</b>. The strip follows the finger 1:1 using <code>transform</code> (no layout work), so it feels glued to the hand.', parts: [{ type: 'array', label: 'Strip', values: arr, hl: { 1: 'cur', 2: dx < 0 ? 'win' : '', 0: dx > 0 ? 'win' : '' } }, { type: 'bars', label: 'Drag offset px (absolute)', values: [Math.abs(dx), thr], texts: ['|dx|', 'threshold'] }, { type: 'vars', vals: { dx: dx } }] });
        frames.push({ narr: 'Finger lifts. Check 1: is |dx| = ' + Math.abs(dx) + ' greater than ' + thr + '? <b>' + (far ? 'yes' : 'no') + '</b>. Check 2: is speed ' + vx + ' greater than 0.5? <b>' + (fast ? 'yes' : 'no') + '</b>.', parts: [{ type: 'table', label: 'Decision', columns: ['check', 'value', 'limit', 'passes?'], rows: [['distance', Math.abs(dx) + ' px', thr + ' px', far ? 'yes' : 'no'], ['speed', vx + ' px/ms', '0.5 px/ms', fast ? 'yes' : 'no']], hl: { 0: far ? 'ok' : 'bad', 1: fast ? 'ok' : 'bad' } }] });
        frames.push({ narr: go ? 'At least one check passed, so we <b>go ' + dir + '</b> and animate the strip to the new slide.' : 'Neither check passed: it was a small, slow drag, so we <b>snap back</b> to the current slide.', parts: [{ type: 'array', label: 'Strip after release', values: arr, hl: go ? (dir === 'next' ? { 2: 'sel' } : { 0: 'sel' }) : { 1: 'cur' } }, { type: 'text', html: go ? 'Dragging left reveals the <b>next</b> slide, dragging right reveals the <b>previous</b> one.' : 'Tip: a small tolerance (about 10 px) before deciding "horizontal" stops tiny finger wiggles from stealing vertical scroll.' }] });
        return frames;
      }
    },
    {
      title: 'Carousel component tree',
      gen: function () {
        var arr = ['Carousel', 'Viewport', 'Controls', 'Track', 'LiveRegion', 'Arrows', 'Dots', 'Slide 1', 'Slide 2', null, null, 'Prev', 'Next', 'Dot 1', 'Dot 2'];
        return [
          treeFrame('The carousel: a <b>Viewport</b> that holds the sliding <b>Track</b>, and <b>Controls</b> to move it.', 'Carousel tree', arr),
          treeFrame('<b>Carousel</b> owns the state: <code>index</code>, <code>paused</code> and (while dragging) <code>dragX</code>. Children get these as props.', 'State owner', arr, { 0: 'sel' }, { 0: 'index, paused, dragX' }),
          treeFrame('Each <b>Slide</b> renders its image only if its index is in the load set (current ± 1). Other slides stay empty placeholders of the right size.', 'Lazy images', arr, { 7: 'cur', 8: 'ok' }, { 7: 'img loaded', 8: 'img preloaded' }),
          treeFrame('<b>Arrows</b> and <b>Dots</b> call <code>goTo(i)</code>. They are real buttons, so Tab and Enter work with no extra code.', 'Controls', arr, { 5: 'win', 6: 'win', 11: 'ok', 12: 'ok', 13: 'ok', 14: 'ok' }, { 11: 'goTo(i-1)', 12: 'goTo(i+1)', 13: 'goTo(0)', 14: 'goTo(1)' }),
          treeFrame('Auto-play lives in <b>Controls</b> with a Pause button. It is mandatory when the carousel moves by itself. Hover or focus inside the carousel pauses it too.', 'Auto-play', arr, { 2: 'cur' }, { 2: 'play / pause' }),
          treeFrame('A <b>LiveRegion</b> announces "Slide 3 of 6" after a user action, but stays silent during auto-play to avoid spamming screen-reader users.', 'Announcements', arr, { 4: 'sel' }, { 4: 'aria-live' })
        ];
      }
    }
  ],
  examples: [
    { title: 'Scroll-snap or translateX? Decide from the requirements', html: `<p>Three product requirements, three choices:</p>
      ${H.table(['Requirement', 'Choice', 'Reason'], [
        ['"Product photo gallery with swipe"', '<span class="c-g">scroll-snap</span>', 'Native momentum and keyboard scrolling; tiny JS'],
        ['"Infinite looping hero banner"', 'translateX + clones', 'Scroll-snap cannot wrap seamlessly'],
        ['"Cards peeking at the sides, 3D tilt"', 'translateX + JS', 'Needs custom per-slide transforms']
      ])}
      <p>Say the reason: "I pick the simplest tool that satisfies the requirement" is a strong senior sentence.</p>` },
    { title: 'Auto-play rules that keep it accessible', html: `<p>Moving content can be harmful (distracting, hard to read, triggers motion sickness). Checklist:</p>
      <ol><li>Start paused if <code>prefers-reduced-motion: reduce</code> is set.</li><li>Provide a visible Pause/Play button as the <b>first</b> control.</li><li>Pause while the pointer hovers or keyboard focus is inside; resume when it leaves.</li><li>Pause when the tab is hidden (<code>document.visibilityState</code>) so the timer does not jump ahead.</li><li>Do not announce each change while rotating (<code>aria-live="off"</code>).</li></ol>`, code: { lang: 'js', code: `const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let timer = null;
function play() { if (!reduce && !timer) timer = setInterval(() => carousel.next(), 5000); }
function pause() { clearInterval(timer); timer = null; }
const box = document.querySelector('.carousel');
box.addEventListener('mouseenter', pause);
box.addEventListener('focusin', pause);
document.addEventListener('visibilitychange', () => (document.hidden ? pause() : null));
play();` } },
    { title: 'Responsive images so slides are not too heavy', html: `<p>A 4000 px photo on a 390 px phone wastes ~10x the data. Use <code>srcset</code> + <code>sizes</code> and let the browser pick:</p>
      <p><code>&lt;img src="p-800.avif" srcset="p-400.avif 400w, p-800.avif 800w, p-1600.avif 1600w" sizes="100vw" width="1600" height="900" alt="..."&gt;</code></p>
      <p>Only the first slide gets <code>fetchpriority="high"</code> (it is the LCP image). All others are <code>loading="lazy"</code> or wait for the neighbour-preload rule. Give each slide a tiny blurred placeholder (a 20 px version inlined as base64) so there is no white flash.</p>` }
  ],
  deepDive: `<p><b>🟣 Infinite loop without a seam.</b> With <code>translateX</code>, clone the last slide before the first and the first slide after the last: <code>[Sn] [S1 ... Sn] [S1]</code>. When the animation finishes on a clone, instantly (no transition) jump to the real slide with the same picture. Because the picture is identical, the user sees no jump. With modular arithmetic only (3 rendered slides re-labelled as you move) you avoid clones but must re-key carefully to keep images from reloading.</p>
    <p><b>Animation performance.</b> Animate only <code>transform</code> and <code>opacity</code>: they run on the compositor thread and skip layout and paint. Add <code>will-change: transform</code> only while animating (permanent promotion wastes GPU memory). Avoid animating <code>left</code> or <code>width</code>. Measure the slide width once with a <code>ResizeObserver</code> instead of reading <code>offsetWidth</code> on every frame (forced reflow).</p>
    <p><b>Pointer events beat touch + mouse pairs.</b> One handler covers mouse, touch and pen. Set <code>touch-action: pan-y</code> so vertical page scrolling still works and horizontal drags are yours. Use <code>setPointerCapture</code>, and cancel on <code>pointercancel</code> (the browser may take over for a system gesture). Decide the gesture axis after the first ~10 px of movement; if it is vertical, release the drag.</p>
    <p><b>Rubber band and momentum.</b> At the edges (no loop) divide extra drag by a factor (for example <code>dx * 0.3</code>) so it resists. For momentum, use the release velocity to compute the target slide: <code>target = round((position + velocity * 200ms) / width)</code>, clamped to ±1 slide, then spring to it.</p>
    <p><b>Focus and tabbing.</b> Slides that are off-screen must not trap keyboard focus: set <code>inert</code> on them (supported in modern browsers) so links inside cannot be tabbed to and screen readers skip them. When a user activates Next, keep focus on the Next button (do not move it), and announce the new slide label politely. Dots are a group of buttons (not <code>role="tab"</code> unless you build the full tabs pattern) with <code>aria-current="true"</code> on the active one.</p>
    <p><b>Memory.</b> For very big galleries (hundreds of photos) also unload far-away images (<code>img.src = ''</code> or remove the node), and use a thumbnail strip that itself is virtualised. <b>SEO/SSR:</b> render the first slide on the server; the rest can hydrate later. <b>Testing:</b> test the pure index/swipe logic with unit tests, the DOM with Playwright (including keyboard-only run and a screen-reader smoke test).</p>`,
  aiEra: `<p><b>🤖 What AI changes.</b> Image-heavy UIs now meet <b>AI-generated alt text</b> and captions, automatic cropping to the "interesting" region (smart crop), and personalised ordering of banners. Alt text from a model is a good <i>first draft</i> but can be wrong, generic ("an image of a room") or even invent details.</p>
    <p><b>Use AI as a partner:</b> ask <code>Review this carousel markup against the WAI-ARIA Authoring Practices carousel pattern and list what is missing</code>; ask for <code>unit tests for a swipe decision function with edge cases (zero movement, exactly at threshold, huge velocity)</code>. Use it to batch-generate srcset variants and low-quality placeholders in a build script.</p>
    <p><b>Where AI goes wrong:</b> it ships carousels as clickable <code>div</code>s with no roles, auto-plays forever with no pause button, loads every image eagerly, forgets <code>touch-action</code> (so vertical scrolling fights the swipe), and animates <code>left</code>. It also writes <code>alt="image"</code>.</p>
    <p><b>What you must still own:</b> whether a carousel is even the right pattern (many studies show users rarely see slide 2; a grid or a single hero is often better), the reduced-motion and pause behaviour, and writing alt text that describes the purpose of the image for <i>this</i> page.</p>`,
  problems: [
    {
      title: 'Carousel Controller with Lazy Preload',
      level: 'Easy', tags: ['state machine', 'modular arithmetic', 'lazy loading'], companies: ['Amazon', 'Booking.com'],
      statement: `<p>Write <code>createCarousel(count, loop)</code> returning an object with <code>next()</code>, <code>prev()</code>, <code>goTo(i)</code>, <code>toLoad()</code> and <code>label()</code>. With <code>loop = true</code> the index wraps around; with <code>false</code> it stops at both ends. <code>toLoad()</code> returns the sorted, de-duplicated list of slide indexes whose images should be downloaded: the current slide and its two neighbours. <code>label()</code> returns text such as <code>"Slide 2 of 5"</code> for the live region.</p>`,
      constraints: `<p>1 ≤ count ≤ 10<sup>4</sup>. <code>goTo</code> may receive any integer (including negatives or values beyond the end).</p>`,
      example: `${H.table(['count, loop', 'actions', 'index', 'toLoad()'], [['5, true', 'prev() from 0', '4', '[3, 4, 0]'], ['5, false', 'prev() from 0', '0', '[0, 1]']])}<p>With looping, the neighbour of slide 0 on the left is slide 4. Without looping, the left neighbour of slide 0 is slide 0 itself, so the set shrinks.</p>`,
      brute: { why: `<p>Keep a plain counter and decrement it (it becomes -1 and indexes nothing), then eagerly request every image on page load. Wasted work: every image the user never sees is downloaded; the negative index also crashes the render.</p>`, code: `function createCarouselBrute(count, images) {
  let index = 0;
  images.forEach(function (src) { new Image().src = src; });   // downloads ALL slides immediately
  return {
    next: function () { index = index + 1; return index; },     // can run past the end
    prev: function () { index = index - 1; return index; }      // can become -1
  };
}` },
      mcq: { q: 'In a looping carousel with 5 slides, which expression gives the previous index of slide 0 safely?', options: ['((0 - 1) % 5 + 5) % 5', '(0 - 1) % 5', '0 - 1', 'Math.max(0, 0 - 1)'], answer: 0, explain: 'In JavaScript, -1 % 5 is -1 (the sign follows the dividend), so you add the count and take the remainder again to land in 0..4.' },
      hints: [
        `<p>Hint 1: the aha. All movement is "add or subtract 1, then fix the result into range". Write one small <code>wrap(i)</code> function and use it everywhere.</p>`,
        `<p>Hint 2: for looping use <code>((i % count) + count) % count</code>; for non-looping use clamping with <code>Math.min</code> and <code>Math.max</code>. Then <code>toLoad</code> is just <code>wrap(index-1), index, wrap(index+1)</code> put into a Set.</p>`,
        `<p>Hint 3: edge cases. With count 1 all three neighbours are the same slide (the Set handles it). Sort the result so it is stable. Labels are 1-based for humans: <code>index + 1</code>.</p>`
      ],
      solution: {
        approach: `<p>One <code>wrap</code> function hides the loop-or-clamp rule. State is only the index. The preload list is built through a Set to remove duplicates (edges, tiny carousels) and then sorted.</p>`,
        code: { lang: 'js', run: true, code: `function createCarousel(count, loop) {
  let index = 0;
  const wrap = (i) => (loop ? ((i % count) + count) % count : Math.min(count - 1, Math.max(0, i)));
  return {
    get index() { return index; },
    next() { index = wrap(index + 1); return index; },
    prev() { index = wrap(index - 1); return index; },
    goTo(i) { index = wrap(i); return index; },
    toLoad() { return [...new Set([wrap(index - 1), index, wrap(index + 1)])].sort((a, b) => a - b); },
    label() { return 'Slide ' + (index + 1) + ' of ' + count; }
  };
}
const a = createCarousel(5, true);
a.prev();
console.log(a.index, a.toLoad(), a.label());        // 4 [0,3,4]-> sorted [0, 3, 4]
const b = createCarousel(5, false);
b.prev();
console.log(b.index, b.toLoad());                     // 0 [0, 1]
const one = createCarousel(1, true);
one.next();
console.log(one.index, one.toLoad());                 // 0 [0]` },
        complexity: `<p>Every operation is O(1) time and space (the preload list has at most 3 entries).</p>`,
        followUps: ['Add auto-play that pauses on hover and when the tab is hidden.', 'Preload two slides ahead in the direction the user is moving.']
      }
    }
  ]
});

/* ===================== TOPIC 5: Chat UI ===================== */
topics.push({
  title: 'Design a Chat UI (WebSocket, Ordering, Unread, Reconnect)',
  analogy: `<p>Think of a <b>group chat as numbered mail</b>. The post office stamps every envelope in the group with a running number: 1, 2, 3 ... Letters can arrive jumbled (4 before 3), but because of the numbers you can always put them in order, and if envelope 3 never shows up you simply say "please resend number 3". If your phone line drops, you do not shout into a dead line: you redial after a short wait, a bit longer each time, and when you reconnect you say "the last one I got was number 12, send me everything after". Your unread badge is not a pile of letters you count by hand: it is just <i>newest number minus the number I last read</i>.</p>`,
  explain: `<p><b>🟢 What the user sees.</b> A list of conversations with unread badges, and a message thread: bubbles in order, a typing box, small ticks showing sent / delivered / read, a "typing..." hint, and a banner when the network is down.</p>
    <p><b>Requirements.</b> Functional: send and receive text in real time, ordered history that loads upwards when you scroll up, unread counts, delivery states, offline/reconnect, typing indicator. Non-functional: new messages appear in under ~200 ms, never lose or duplicate a message, correct order, battery friendly on mobile, accessible announcements.</p>
    <p><b>Transport choice:</b></p>
    ${H.table(['Option', 'Idea', 'Good for', 'Weakness'], [
      ['Short polling', 'Ask every few seconds', 'Tiny apps', 'Slow, wasteful'],
      ['Long polling / SSE', 'Server pushes down one open request', 'One-way updates (notifications)', 'Client to server still needs normal requests'],
      ['<b>WebSocket</b>', 'One open two-way connection', '<span class="c-g">Chat, games, collaboration</span>', 'You must handle reconnect, ordering, heartbeat yourself']
    ])}
    <p><b>The message envelope</b> (the API contract you design):</p>
    ${H.kv([['client to server', '{ type: "send", clientId: "c-77", convId, text }'], ['server to client', '{ type: "message", id, seq: 41, convId, senderId, text, ts, clientId }'], ['ack', '{ type: "ack", clientId: "c-77", id, seq: 41 }'], ['resume', '{ type: "resume", convId, afterSeq: 40 }']], { label: 'Four message types' })}
    <p><b>Two ids, two jobs.</b> <code>clientId</code> is made by the sender app <i>before</i> sending; it lets us show the bubble instantly (optimistic) and later match the server's echo, so we never show it twice. <code>seq</code> is a per-conversation increasing number given by the <i>server</i>; it decides the <b>order</b>. We do not sort by timestamps because phone clocks disagree.</p>
    <p><b>Receiving rule (the heart of the design):</b> keep <code>lastSeq</code> for each conversation. A message with <code>seq = lastSeq + 1</code> is shown immediately (and then any waiting held messages that now fit). A message with a higher seq is <b>held</b> in a buffer (a gap!). A message with seq ≤ lastSeq is a <b>duplicate</b> and is dropped. If a gap lasts more than a moment (say 2 s), fetch the missing range over REST: <code>GET /conversations/:id/messages?afterSeq=lastSeq</code>.</p>
    <p><b>Reconnect rule:</b> on <code>close</code>, show "reconnecting...", retry with <b>exponential backoff + jitter</b> (1 s, 2 s, 4 s, ... capped at ~30 s). On <code>open</code>, send <code>resume</code> with each active conversation's <code>lastSeq</code>, then flush the outbox (unsent messages, same <code>clientId</code> so the server can dedupe).</p>
    <p><b>Unread counts.</b> Do not count messages one by one. Keep <code>lastSeq</code> and <code>lastReadSeq</code> per conversation: <code>unread = lastSeq - lastReadSeq</code>. When the user views the bottom of a conversation (and the tab is focused), set <code>lastReadSeq = lastSeq</code> and tell the server. This survives reconnects and works across devices.</p>
    <p><b>State shape:</b> <code>conversationsById</code> (<code>lastSeq</code>, <code>lastReadSeq</code>, <code>heldBySeq</code>), <code>messageIdsByConv</code> (ordered), <code>messagesByClientId</code> / <code>byId</code>, <code>outbox</code> (pending sends), <code>connection: 'online' | 'reconnecting' | 'offline'</code>.</p>`,
  clues: [
    '"Design WhatsApp / Slack / Messenger web UI" (frontend side)',
    '"Messages arrive out of order or twice" → per-conversation sequence numbers + clientId dedupe',
    '"Network drops, then comes back" → exponential backoff with jitter, resume from lastSeq, flush outbox',
    '"Show unread badges" → lastSeq − lastReadSeq, not counting rows',
    '"Long history, user scrolls up" → cursor <code>beforeSeq</code>, prepend and keep scroll position, virtualise',
    '"Real-time" → WebSocket (or SSE), heartbeat/ping to detect dead connections'
  ],
  code: [
    { lang: 'js', run: true, title: 'Message ordering with sequence numbers (runnable)', code: `// Receives messages in ANY order and shows them in seq order, with no duplicates.
class Inbox {
  constructor() {
    this.lastSeq = 0;            // highest seq already shown (messages start at 1)
    this.held = new Map();       // seq -> message that arrived too early
    this.shown = [];             // what the chat screen displays, in order
  }
  receive(msg) {
    if (msg.seq <= this.lastSeq || this.held.has(msg.seq)) return 'duplicate #' + msg.seq + ' dropped';
    this.held.set(msg.seq, msg);
    const delivered = [];
    while (this.held.has(this.lastSeq + 1)) {            // flush every message that now fits
      const next = this.held.get(this.lastSeq + 1);
      this.held.delete(this.lastSeq + 1);
      this.lastSeq++;
      this.shown.push(next);
      delivered.push(next.seq);
    }
    return delivered.length ? 'shown ' + delivered.map((s) => '#' + s).join(' ') : 'held #' + msg.seq + ' (waiting for #' + (this.lastSeq + 1) + ')';
  }
  // the range we should ask the server for over REST when the gap lasts too long
  gap() {
    if (this.held.size === 0) return null;
    const smallestHeld = Math.min(...this.held.keys());
    return { afterSeq: this.lastSeq, upToSeq: smallestHeld - 1 };
  }
}

const inbox = new Inbox();
for (const seq of [1, 2, 4, 5, 4, 3, 8]) {
  console.log('arrive #' + seq + ' ->', inbox.receive({ seq, text: 'm' + seq }));
}
console.log('screen order  :', inbox.shown.map((m) => m.seq).join(', '));
console.log('still held    :', [...inbox.held.keys()]);
console.log('fetch missing :', JSON.stringify(inbox.gap()));   // seqs 6 and 7 never arrived
inbox.receive({ seq: 6, text: 'm6' }); inbox.receive({ seq: 7, text: 'm7' });   // the REST resync fills the gap
console.log('after resync  :', inbox.shown.map((m) => m.seq).join(', '));` },
    { lang: 'js', run: true, title: 'Reconnect back-off with jitter (runnable)', code: `// delay = min(cap, base * 2^attempt), then pick a random value in [delay/2, delay] ("equal jitter").
// Jitter stops thousands of clients from reconnecting at the exact same moment after an outage.
function backoffDelay(attempt, rand, base = 1000, cap = 30000) {
  const exp = Math.min(cap, base * Math.pow(2, attempt));
  return Math.round(exp / 2 + rand() * (exp / 2));
}
// deterministic "random" so the output is the same every run
let seed = 7;
const fakeRand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
for (let attempt = 0; attempt < 8; attempt++) {
  console.log('attempt', attempt, '-> wait', backoffDelay(attempt, fakeRand), 'ms');
}
// After a successful connection, reset attempt to 0.` },
    { lang: 'js', title: 'WebSocket client skeleton (browser code)', code: `function createChatSocket(url, inbox, getLastSeq, outbox) {
  let ws = null, attempt = 0, closedByUs = false, pingTimer = null;

  function connect() {
    ws = new WebSocket(url);
    ws.onopen = () => {
      attempt = 0;                                                    // healthy again
      ws.send(JSON.stringify({ type: 'resume', afterSeq: getLastSeq() })); // "send me what I missed"
      outbox.forEach((m) => ws.send(JSON.stringify(m)));              // re-send unacknowledged messages (same clientId)
      pingTimer = setInterval(() => ws.send('{"type":"ping"}'), 25000); // detect half-dead connections
    };
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.type === 'message') inbox.receive(msg);                 // ordering + dedupe happen in the inbox
      if (msg.type === 'ack') outbox.delete(msg.clientId);
    };
    ws.onclose = () => {
      clearInterval(pingTimer);
      if (closedByUs) return;
      const wait = backoffDelay(attempt++, Math.random);              // see the helper above
      setTimeout(connect, wait);
    };
    ws.onerror = () => ws.close();                                    // onclose will schedule the retry
  }
  connect();
  return { close() { closedByUs = true; ws.close(); } };
}` }
  ],
  viz: [
    {
      title: 'Messages arrive out of order: hold, release, drop duplicates',
      input: '1 2 4 5 3 3 8',
      inputLabel: 'Arrival order of sequence numbers',
      gen: function (input) {
        var seqs = String(input).trim().split(/[\s,]+/).map(Number);
        if (!seqs.length || seqs.some(function (x) { return !(x >= 1 && x <= 99) || x % 1 !== 0; })) throw new Error('Enter whole sequence numbers 1-99, e.g. 1 2 4 5 3 3 8');
        if (seqs.length > 14) throw new Error('Use at most 14 numbers');
        var last = 0, held = [], shown = [], frames = [];
        function f(narr, hlHeld, hlShown) {
          return { narr: narr, parts: [
            { type: 'queue', label: 'Held buffer (arrived too early)', items: held.map(function (s) { return '#' + s; }), hl: hlHeld || {}, frontLabel: 'smallest', backLabel: 'largest' },
            { type: 'queue', label: 'Chat screen (in order)', items: shown.map(function (s) { return '#' + s; }), hl: hlShown || {}, frontLabel: 'oldest', backLabel: 'newest' },
            { type: 'vars', vals: { lastSeq: last, waiting_for: last + 1 }, hl: { waiting_for: 'cur' } }
          ] };
        }
        frames.push(f('Nothing shown yet. We are waiting for message <b>#1</b>. Rule: only <code>lastSeq + 1</code> may be shown.'));
        seqs.forEach(function (s) {
          if (s <= last || held.indexOf(s) >= 0) {
            frames.push(f('<b>#' + s + '</b> arrived but we already have it. <span class="c-r">Duplicate: dropped.</span> (Networks retry, so duplicates are normal.)', {}, (function () { var o = {}; var i = shown.indexOf(s); if (i >= 0) o[i] = 'bad'; return o; })()));
            return;
          }
          if (s === last + 1) {
            shown.push(s); last = s;
            var released = [];
            held.sort(function (a, b) { return a - b; });
            while (held.length && held[0] === last + 1) { var x = held.shift(); shown.push(x); last = x; released.push(x); }
            var hs = {}; hs[shown.length - 1 - released.length] = 'ok'; released.forEach(function (r, i) { hs[shown.length - released.length + i] = 'ok'; });
            frames.push(f('<b>#' + s + '</b> is exactly the next one, so show it.' + (released.length ? ' That also unblocks held message(s) <b>' + released.map(function (r) { return '#' + r; }).join(', ') + '</b>, which are released in order.' : ''), {}, hs));
          } else {
            held.push(s); held.sort(function (a, b) { return a - b; });
            var hh = {}; hh[held.indexOf(s)] = 'cur';
            frames.push(f('<b>#' + s + '</b> arrived too early (we expected #' + (last + 1) + '). <span class="c-y">Hold it</span> in the buffer; do not show it out of order.', hh));
          }
        });
        if (held.length) {
          var missing = [];
          for (var q = last + 1; q < held[0]; q++) missing.push(q);
          frames.push(f('Still holding ' + held.map(function (h) { return '#' + h; }).join(', ') + '. Missing: <b>' + missing.map(function (m) { return '#' + m; }).join(', ') + '</b>. After a short wait, fetch them: <code>GET /messages?afterSeq=' + last + '</code>.', (function () { var o = {}; held.forEach(function (h, i) { o[i] = 'bad'; }); return o; })()));
        } else {
          frames.push(f('Everything arrived and the screen is in perfect order with no duplicates, however the network shuffled things.'));
        }
        return frames;
      }
    },
    {
      title: 'Connection drops: outbox, back-off, resume',
      input: '3',
      inputLabel: 'How many reconnect attempts fail first (0 to 5)',
      gen: function (input) {
        var fails = parseInt(String(input).trim(), 10);
        if (!(fails >= 0 && fails <= 5)) throw new Error('Enter a number from 0 to 5');
        var screen = ['#1', '#2', '#3'], outbox = [], status = 'online', lastSeq = 3, frames = [];
        function f(narr, extraVars, hl) {
          var vals = { connection: status, lastSeq: lastSeq };
          for (var k in extraVars) vals[k] = extraVars[k];
          return { narr: narr, parts: [
            { type: 'vars', label: 'Client', vals: vals, hl: hl || {} },
            { type: 'queue', label: 'Chat screen', items: screen.slice(), frontLabel: 'oldest', backLabel: 'newest' },
            { type: 'queue', label: 'Outbox (not yet acknowledged)', items: outbox.slice(), frontLabel: 'first to send', backLabel: 'last' }
          ] };
        }
        frames.push(f('Online. The screen shows messages #1 to #3 and the outbox is empty.', {}, { connection: 'ok' }));
        status = 'offline';
        frames.push(f('The Wi-Fi drops. The socket fires <code>close</code>. Show a small "Reconnecting..." banner; do <b>not</b> clear the chat.', {}, { connection: 'bad' }));
        outbox.push('c-1 "hello?"'); screen.push('c-1 (sending)');
        frames.push(f('The user still types "hello?". We create <code>clientId c-1</code>, show the bubble greyed as <i>sending</i>, and keep it in the <b>outbox</b>.', {}, { connection: 'bad' }));
        status = 'reconnecting';
        var wait = 1000;
        for (var a = 0; a < fails; a++) {
          frames.push(f('Attempt ' + (a + 1) + ': wait about <b>' + (wait / 1000) + ' s</b> (exponential back-off plus random jitter), then try to open a socket.', { next_retry_ms: wait, attempt: a + 1 }, { connection: 'cur' }));
          frames.push(f('Attempt ' + (a + 1) + ' <span class="c-r">failed</span>. Double the wait for next time (capped at ~30 s).', { next_retry_ms: Math.min(30000, wait * 2), attempt: a + 1 }, { connection: 'bad' }));
          wait = Math.min(30000, wait * 2);
        }
        status = 'online';
        frames.push(f('The socket <b>opens</b>. Reset the attempt counter to 0. Immediately send <code>resume { afterSeq: 3 }</code> so the server replays what we missed.', { attempt: 0 }, { connection: 'ok' }));
        screen.splice(3, 0, '#4', '#5'); lastSeq = 5;
        frames.push(f('The server replays <b>#4</b> and <b>#5</b>. They go through the normal ordering inbox, so lastSeq becomes 5. Our pending bubble stays at the bottom.', {}, { lastSeq: 'ok' }));
        frames.push(f('Now flush the outbox: re-send <code>c-1</code>. If the first attempt actually reached the server before the drop, the server sees the same <code>clientId</code> and does not create a second message.', {}, { connection: 'ok' }));
        screen[screen.length - 1] = '#6 (c-1)'; outbox.length = 0; lastSeq = 6;
        frames.push(f('Ack arrives: <code>{ clientId: c-1, seq: 6 }</code>. The grey bubble becomes message <b>#6</b> with a tick, and the outbox is empty. Nothing lost, nothing duplicated.', {}, { lastSeq: 'ok' }));
        return frames;
      }
    },
    {
      title: 'Unread badges from sequence numbers',
      input: 'Alice:3:5 Team:0:12 Bob:7:7',
      inputLabel: 'name:lastReadSeq:lastSeq for each conversation',
      gen: function (input) {
        var convs = String(input).trim().split(/\s+/).map(function (tk) {
          var p = tk.split(':');
          if (p.length !== 3 || isNaN(+p[1]) || isNaN(+p[2]) || +p[1] > +p[2] || +p[1] < 0) throw new Error('Use name:lastRead:lastSeq with lastRead <= lastSeq, e.g. Alice:3:5');
          return { name: p[0], read: +p[1], last: +p[2] };
        });
        if (!convs.length || convs.length > 6) throw new Error('Use 1 to 6 conversations');
        var frames = [];
        function table(hl) { return { type: 'table', label: 'Conversation list', columns: ['conversation', 'lastReadSeq', 'lastSeq', 'unread = lastSeq - lastReadSeq', 'badge'], rows: convs.map(function (c) { var u = c.last - c.read; return [c.name, c.read, c.last, u, u > 0 ? (u > 99 ? '99+' : u) : '(none)']; }), hl: hl || {} }; }
        frames.push({ narr: 'The server tells us each conversation\'s newest <code>lastSeq</code>, and we remember how far the user has read (<code>lastReadSeq</code>).', parts: [{ type: 'table', label: 'Conversation list', columns: ['conversation', 'lastReadSeq', 'lastSeq'], rows: convs.map(function (c) { return [c.name, c.read, c.last]; }) }] });
        frames.push({ narr: 'Unread is a subtraction, not a counting loop. No need to download 10,000 messages just to draw a badge.', parts: [table((function () { var o = {}; convs.forEach(function (c, i) { if (c.last > c.read) o[i] = 'cur'; }); return o; })())] });
        var first = -1; convs.forEach(function (c, i) { if (first < 0 && c.last > c.read) first = i; });
        if (first < 0) {
          frames.push({ narr: 'Everything is already read, so no badges. Try a input like <code>Alice:3:5</code>.', parts: [table()] });
          frames.push({ narr: 'A new message arrives in the first conversation: lastSeq goes up by one, and the badge appears.', parts: [table()] });
        } else {
          var c0 = convs[first];
          frames.push({ narr: 'The user opens <b>' + c0.name + '</b> and scrolls to the bottom (and the tab is focused). Set <code>lastReadSeq = lastSeq = ' + c0.last + '</code>.', parts: [table((function () { var o = {}; o[first] = 'win'; return o; })())] });
          c0.read = c0.last;
          frames.push({ narr: 'Badge cleared. We also send <code>{ type: "read", convId, upToSeq: ' + c0.last + ' }</code> so the server and the user\'s other devices clear it too.', parts: [table((function () { var o = {}; o[first] = 'ok'; return o; })())] });
        }
        convs[0].last += 1;
        frames.push({ narr: 'A new message (<code>seq ' + convs[0].last + '</code>) arrives for <b>' + convs[0].name + '</b> while it is not open: the badge goes up by exactly one.', parts: [table({ 0: 'cur' })] });
        return frames;
      }
    },
    {
      title: 'Chat UI component tree',
      gen: function () {
        var arr = ['ChatApp', 'Sidebar', 'Thread', 'ConvList', 'ConnBanner', 'MessageList', 'Composer', 'ConvItem', 'UnreadBadge', null, null, 'Bubble', 'TypingHint', 'Input', 'SendButton'];
        return [
          treeFrame('The app: a sidebar of conversations and the open thread. A connection banner lives with the sidebar so it is always visible.', 'Chat tree', arr),
          treeFrame('One socket per app, created in <b>ChatApp</b> (not in a component that mounts and unmounts). It feeds an inbox per conversation: ordering, dedupe, gaps.', 'The connection owner', arr, { 0: 'sel' }, { 0: 'WebSocket + inboxes' }),
          treeFrame('<b>MessageList</b> reads the ordered ids for the open conversation. It is virtualised and sticks to the bottom only if the user is already at the bottom.', 'Message list', arr, { 5: 'cur', 11: 'ok', 12: 'ok' }, { 5: 'virtual, stick-to-bottom', 11: 'key = clientId' }),
          treeFrame('<b>ConvItem</b> shows the last message and an <b>UnreadBadge</b> = lastSeq - lastReadSeq. Only the changed row re-renders on a new message.', 'Unread', arr, { 3: 'win', 7: 'cur', 8: 'sel' }, { 8: 'lastSeq - lastReadSeq' }),
          treeFrame('<b>Composer</b> writes to the outbox first (optimistic bubble), then to the socket. Typing events are throttled to one per ~3 s.', 'Sending', arr, { 6: 'cur', 14: 'ok', 2: 'win' }, { 6: 'outbox.add', 14: 'send(clientId)' }),
          treeFrame('<b>ConnBanner</b> shows online / reconnecting / offline from the connection state. A polite live region announces new messages for screen readers.', 'Status and a11y', arr, { 4: 'sel', 5: 'ok' }, { 4: 'reconnecting...', 5: 'role=log, aria-live' })
        ];
      }
    }
  ],
  examples: [
    { title: 'Message lifecycle on the sender\'s screen', html: `<p>Every outgoing bubble moves through states. Show them clearly (a clock, one tick, two ticks, two blue ticks, a red retry).</p>
      ${H.table(['State', 'Meaning', 'Trigger'], [
        ['<b>sending</b>', 'Saved locally in the outbox, grey', 'User pressed send'],
        ['<b>sent</b>', 'Server stored it (we have a <code>seq</code>)', '<code>ack</code> received'],
        ['<b>delivered</b>', 'Recipient device got it', 'delivery receipt'],
        ['<b>read</b>', 'Recipient saw it', 'read receipt (<code>upToSeq</code>)'],
        ['<span class="c-r">failed</span>', 'Gave up after retries', 'Show "Tap to retry"; keep the text!']
      ])}` },
    { title: 'Why sequence numbers, not timestamps', html: `<p>Alice's phone clock is 3 seconds fast, Bob's is correct. Alice sends "A" at her 12:00:05; Bob replies "B" at his true 12:00:03 (after seeing "A" at true 12:00:02). Sorting by client timestamp shows B before A: the reply appears before the question. The server stamps <code>seq</code> in the order it received them, so the order is the same for everyone. You may still <i>display</i> the timestamp, but never <i>sort</i> by it.</p>
      <p>Per-conversation counters are cheap and make gap detection trivial: a missing number is a missing message. A global counter across all conversations would show gaps that are not real.</p>` },
    { title: 'Scrolling rules that users notice', html: `<ul><li><b>Stick to bottom</b> only if the user was already within ~50 px of the bottom when the new message arrived. Otherwise do not move them; show a "New messages ↓" pill.</li><li><b>Loading older history</b> (on scroll to top) prepends rows above. Record <code>scrollHeight</code> before, and after rendering set <code>scrollTop += newScrollHeight - oldScrollHeight</code> so the same message stays under the finger.</li><li><b>Mark as read</b> only when the last message is visible <i>and</i> the tab/app is focused (<code>document.hasFocus()</code> or Page Visibility API).</li></ul>`, code: { lang: 'js', code: `function isNearBottom(el, slack = 50) {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= slack;
}
function onNewMessage(listEl, render) {
  const wasAtBottom = isNearBottom(listEl);
  render();                                          // add the bubble
  if (wasAtBottom) listEl.scrollTop = listEl.scrollHeight;   // follow the conversation
  else showNewMessagesPill();                        // do not yank the user away from what they read
}
function prependOlder(listEl, renderOlder) {
  const before = listEl.scrollHeight;
  renderOlder();
  listEl.scrollTop += listEl.scrollHeight - before;  // keep the same message in view
}` } }
  ],
  deepDive: `<p><b>🟣 Exactly-once feeling on at-least-once pipes.</b> Networks give you <i>at-least-once</i> delivery (retries cause duplicates) and <i>no ordering across reconnects</i>. A chat client builds the feeling of exactly-once and in-order by combining: (1) <b>idempotent sends</b> (<code>clientId</code> dedupe on the server), (2) <b>ordered receive</b> (per-conversation seq plus a hold buffer), (3) <b>gap repair</b> (resume by <code>afterSeq</code>). If you design this trio you have answered most of the interview.</p>
    <p><b>Gap timeout.</b> A held message might just be 20 ms late. Wait a short grace period (500 ms to 2 s) before asking the server, otherwise you issue a REST fetch for every tiny reorder. If the gap is huge (the app was suspended for hours), skip replay and reload the latest page ("snapshot"), then continue from there. Cap the hold buffer (for example 500 messages) and fall back to a full resync.</p>
    <p><b>Heartbeats.</b> A TCP connection can look open for minutes after the radio died (NAT timeouts, tunnels). Send an app-level ping every ~25 s and close if no pong arrives within ~10 s; the close triggers the normal reconnect path. Browsers cannot read WebSocket protocol-level pings, so use JSON messages. Also listen to <code>online</code>/<code>offline</code> events and <code>visibilitychange</code>: reconnect immediately when the tab becomes visible instead of waiting for the next back-off tick.</p>
    <p><b>Backoff maths.</b> Without jitter, 100,000 clients dropped by one server restart all retry at 1 s, then 2 s, then 4 s: a "thundering herd" that can knock the server down again. Add random jitter (equal or full jitter) and cap the delay. Reset the counter only after a connection has been stable for a few seconds, not merely opened, to avoid reconnect storms with flapping servers.</p>
    <p><b>Multiple tabs.</b> Each tab opening its own socket multiplies server load and notification duplicates. Use a <code>SharedWorker</code> or elect a leader tab with <code>BroadcastChannel</code> + Web Locks API to own the socket, broadcasting messages to other tabs. Notifications: only the leader shows them.</p>
    <p><b>Storage and offline.</b> Persist the outbox and recent history in IndexedDB so an app restart does not lose pending messages; the UI renders from local data first (instant open), then syncs. Encrypt if the product promises end-to-end privacy; with E2E encryption the server cannot search or generate previews, so search happens client-side.</p>
    <p><b>Rendering many messages.</b> Virtualise with reverse anchoring; group consecutive messages from the same sender within a few minutes into one visual block; date dividers are rows, not decorations on bubbles. Use stable keys (<code>clientId</code>, replaced by <code>id</code> on ack without remounting) so the bubble does not flicker when it changes from pending to sent. <b>Typing indicator</b>: send "typing" at most every 3 s; the receiver hides it after ~5 s without refresh. <b>Accessibility:</b> <code>role="log"</code> with <code>aria-live="polite"</code> on the list, announce sender and text for incoming messages only when the thread is focused; manage focus so the composer keeps it after sending; respect reduced motion for the scroll animation.</p>
    <p><b>Security notes.</b> Render message text as text (never <code>innerHTML</code>), sanitise URL previews, authenticate the socket with a short-lived token (not in the URL query when possible, because URLs end up in logs), and re-authenticate on reconnect when the token expired.</p>`,
  aiEra: `<p><b>🤖 What AI changes.</b> Chat UIs now host <b>AI assistants as participants</b>: replies stream token by token, can be stopped, regenerated or edited, and may call tools mid-message. The same ordering lessons apply, with a twist: a streamed reply is one message made of many small chunks, so each chunk needs a <code>messageId</code> and a chunk index, and the UI should render the partial text without re-ordering. "Stop generating" is cancellation (abort the stream), and "regenerate" creates a sibling branch, which makes the message list a tree, not a flat list.</p>
    <p><b>Use AI as a partner:</b> ask <code>Write a simulation that shuffles, duplicates and drops messages and checks my inbox always ends in order</code> (property-based testing is perfect here). Ask <code>List race conditions between reconnect, resume and outbox flush</code>, then try each as a test.</p>
    <p><b>Where AI goes wrong:</b> it sorts messages by <code>Date.now()</code>, renders with array index as key (flicker and wrong state), opens a socket inside a React component body so it reconnects on every render, forgets back-off (infinite tight reconnect loop), counts unread by looping over arrays, and uses <code>innerHTML</code> for message text.</p>
    <p><b>What you must still own:</b> the delivery guarantees you promise (at-least-once plus dedupe), the exact reconnect and resume protocol, the unread semantics across devices, and explaining failure scenarios one at a time on a whiteboard.</p>`,
  problems: [
    {
      title: 'Merge Pending and Server Messages',
      level: 'Medium', tags: ['dedupe', 'ordering', 'optimistic UI'], companies: ['Slack', 'Meta', 'Discord'],
      statement: `<p>The chat screen keeps a list of messages. Messages the user just sent have a <code>clientId</code> and <code>pending: true</code> but no <code>seq</code>. Messages from the server have <code>clientId</code> (echoed back) and a <code>seq</code>. Write <code>mergeMessages(existing, incoming)</code> that returns the new list: confirmed messages (with seq) sorted by seq with duplicates removed, a pending message replaced by its server version when the same <code>clientId</code> arrives, and still-pending messages kept at the bottom in their original order.</p>`,
      constraints: `<p>Up to 10<sup>4</sup> messages. <code>clientId</code> is unique per message. The same server message can arrive several times. Input arrays must not be mutated.</p>`,
      example: `${H.table(['existing', 'incoming', 'result'], [['#1 (c1), c2 pending, c4 pending', 'c2 seq 2, c3 seq 3, c1 seq 1 (again)', '#1, #2 (c2), #3 (c3), then c4 pending']])}<p>c2 turned from pending into seq 2; c1 arrived twice but appears once; c4 has no seq yet so it stays at the bottom.</p>`,
      brute: { why: `<p>Concatenate both lists and sort by timestamp. Clock differences scramble the order, duplicates stay (the pending copy and the server copy both show), and every merge re-sorts everything. The wasted work is re-sorting, and the result is wrong.</p>`, code: `function mergeBrute(existing, incoming) {
  return existing.concat(incoming).sort(function (a, b) { return a.time - b.time; });   // wrong order, duplicates remain
}` },
      mcq: { q: 'Which field should decide the order of confirmed messages in a conversation?', options: ['The server-assigned per-conversation sequence number', 'The sender\'s local timestamp', 'The order the WebSocket delivered them', 'The message text length'], answer: 0, explain: 'Local clocks disagree and delivery order can be shuffled by retries and reconnects. The server\'s sequence number is the single agreed order.' },
      hints: [
        `<p>Hint 1: the aha. One message has one identity: its <code>clientId</code>. Put everything into a Map keyed by <code>clientId</code>, and duplicates and pending-to-confirmed replacement happen by themselves.</p>`,
        `<p>Hint 2: fill the Map from <code>existing</code>, then overwrite with <code>incoming</code> entries (server data wins, mark <code>pending: false</code>). Afterwards split values into those with a <code>seq</code> and those without.</p>`,
        `<p>Hint 3: sort only the confirmed ones by <code>seq</code>; append pending ones in the order they were first inserted (a Map keeps insertion order). Do not mutate the input arrays: build new objects.</p>`
      ],
      solution: {
        approach: `<p>A Map keyed by <code>clientId</code> merges identities. Incoming server messages overwrite local pending copies. Then confirmed messages are sorted by seq, and pending ones go after, in insertion order.</p>`,
        code: { lang: 'js', run: true, code: `function mergeMessages(existing, incoming) {
  const byKey = new Map();
  for (const m of existing) byKey.set(m.clientId, m);
  for (const m of incoming) {
    const old = byKey.get(m.clientId);
    byKey.set(m.clientId, { ...old, ...m, pending: false });   // server data wins; duplicates collapse
  }
  const all = [...byKey.values()];
  const confirmed = all.filter((m) => m.seq !== undefined).sort((a, b) => a.seq - b.seq);
  const pending = all.filter((m) => m.seq === undefined);        // Map keeps insertion order
  return confirmed.concat(pending);
}

const existing = [
  { clientId: 'c1', seq: 1, text: 'a' },
  { clientId: 'c2', text: 'hi', pending: true },
  { clientId: 'c4', text: 'later', pending: true }
];
const incoming = [{ clientId: 'c2', seq: 2, text: 'hi' }, { clientId: 'c3', seq: 3, text: 'yo' }, { clientId: 'c1', seq: 1, text: 'a' }];
const out = mergeMessages(existing, incoming);
console.log(out.map((m) => m.clientId + (m.seq ? '#' + m.seq : ' (pending)')).join(', '));` },
        complexity: `<p>O(N log N) time because of the sort of confirmed messages (O(N) if you merge two already sorted lists), O(N) space.</p>`,
        followUps: ['Make it O(N + K) when existing is already sorted and incoming is a small batch.', 'What if a server message arrives whose clientId was never seen (sent from another device)?']
      }
    }
  ]
});

/* ===================== TOPIC 6: Spreadsheet grid ===================== */

// Tiny expression evaluator shared by the visualizers (numbers, A1-style refs, + - * / and parentheses).
function miniEval(src, get) {
  var tokens = String(src).match(/\d+\.?\d*|[A-Z]\d+|[-+*/()]/g) || [];
  var p = 0;
  function primary() {
    var t = tokens[p++];
    if (t === '(') { var v = expr(); p++; return v; }
    if (t === '-') return -primary();
    if (/^[A-Z]\d+$/.test(t)) return get(t);
    return parseFloat(t);
  }
  function term() { var v = primary(); while (tokens[p] === '*' || tokens[p] === '/') { var op = tokens[p++]; var r = primary(); v = op === '*' ? v * r : v / r; } return v; }
  function expr() { var v = term(); while (tokens[p] === '+' || tokens[p] === '-') { var op = tokens[p++]; var r = term(); v = op === '+' ? v + r : v - r; } return v; }
  return expr();
}

topics.push({
  title: 'Design a Google Sheets-like Grid (Virtualization, Dependency Graph, Recalculation)',
  analogy: `<p>Picture a wall of <b>sticky notes connected by strings</b>. A note that says <code>= A1 + B1</code> has two strings running into it, one from A1 and one from B1. When you change the number on note A1, you do <b>not</b> rewrite every note on the wall. You follow the strings <i>forward</i> from A1 and only refresh the notes that depend on it, and you refresh them in a smart order: a note is rewritten only after all the notes feeding it are already fresh. And since the wall is as big as a football field, you only ever look through a small <b>window</b> (the screen), so the shop only prints the notes you can see. If a string loop exists (A1 needs B1, B1 needs A1), the notes would wait for each other forever, so the sheet writes <code>#CYCLE!</code> on them.</p>`,
  explain: `<p><b>🟢 What the user sees.</b> A giant table (up to millions of cells). Click a cell, type text or a number, or a formula like <code>=SUM(A1:A5)*2</code>. Other cells update. Arrow keys move, <kbd>Enter</kbd> commits, <kbd>Esc</kbd> cancels. Column headers (A, B, C ...) and row numbers stay visible while you scroll.</p>
    <p><b>Requirements.</b> Functional: edit cells, formulas with references and ranges, instant recalculation, selection (single, range), copy/paste, undo/redo, resize columns. Non-functional: smooth scroll over 1M rows × 100 columns, edit-to-update in under ~50 ms, never freeze on a big paste, accessible grid, no wrong numbers.</p>
    <p><b>Three hard problems, three tools:</b></p>
    ${H.table(['Problem', 'Naive approach', 'Better'], [
      ['<b>Too many cells to draw</b>', 'One DOM node per cell: 100 million nodes', '<b>Virtualize in 2D</b>: render only rows and columns in the viewport (+ overscan)'],
      ['<b>Too much to store</b>', '2D array filled with empty strings', '<b>Sparse map</b> <code>{ "B7": {...} }</code>: only non-empty cells use memory'],
      ['<b>Formulas depend on each other</b>', 'Recalculate every formula on every edit', '<b>Dependency graph</b> + recompute only affected cells in <b>topological order</b>']
    ])}
    <p><b>Data model.</b> Each cell: <code>raw</code> (what the user typed, e.g. <code>"=A1+B1"</code>), <code>value</code> (the computed result shown), and graph edges. Keep two maps: <code>precedents</code> (cell → cells it reads) and <code>dependents</code> (cell → cells that read it). Dependents answer "who must recompute when I change?".</p>
    ${H.kv([['cells', '{ "C1": { raw: "=A1+B1", value: 5 } }'], ['precedents', '{ "C1": ["A1","B1"] }'], ['dependents', '{ "A1": ["C1"], "B1": ["C1"] }'], ['selection', '{ anchor: "B2", focus: "D5" }']], { label: 'Sparse state' })}
    <p><b>Recalculation algorithm</b> after editing cell X:</p>
    <ol>
      <li>Update X's raw text and fix its edges (remove old precedents, add new ones from the new formula).</li>
      <li>Find the <b>dirty set</b>: X plus everything that depends on X directly or indirectly (graph walk along <code>dependents</code>).</li>
      <li><b>Topologically sort</b> the dirty set (Kahn's algorithm): repeatedly take a cell with no unfinished inputs inside the dirty set, compute it, then release the cells that were waiting for it.</li>
      <li>If some dirty cells never become ready, they sit on a <b>cycle</b>: mark them <code>#CYCLE!</code>.</li>
      <li>Notify only the changed cells' views to re-render.</li>
    </ol>
    <p><b>Virtual window.</b> With a default column width of 100 px and row height 24 px, a 1000 × 800 px screen shows about 10 columns × 34 rows = 340 cells, even if the sheet has 100 million. Column widths and row heights can vary, so keep prefix-sum arrays and find the first visible index by binary search (as in the feed topic).</p>
    <p><b>Component tree:</b> <code>SheetApp</code> → <code>Toolbar</code> (name box + formula bar) and <code>Workbook</code> (grid + sheet tabs). The <code>GridViewport</code> contains headers, a <code>CellLayer</code> of visible cells, a <code>SelectionOverlay</code> and the in-place <code>CellEditor</code>.</p>
    <p><b>Per-cell updates.</b> If the whole grid re-renders on every edit, typing feels slow. Give each visible cell its own subscription to <code>cells[address]</code> (a small external store), so a recalculation re-renders only cells whose value changed.</p>`,
  clues: [
    '"Design Google Sheets / Excel online / a spreadsheet grid"',
    '"Millions of rows and columns" → sparse storage + 2D virtualization (not DOM per cell)',
    '"Cell depends on other cells; update when a precedent changes" → dependency graph, topological order, dirty set',
    '"A1 = B1 and B1 = A1" / "circular reference" → cycle detection (Kahn leftovers or DFS colours)',
    '"Copy-paste formulas and the references shift" → relative vs absolute references ($A$1)',
    '"Multiple users editing the same sheet" → operation log, OT or CRDT, per-cell last-writer-wins with versions'
  ],
  code: [
    { lang: 'js', run: true, title: 'Formula engine: dependency graph + topological recalculation (runnable)', code: `// ---------- helpers ----------
// SUM(A1:B2) -> (A1+A2+B1+B2); single-letter columns keep the demo short
function expandSum(src) {
  return src.replace(/SUM\\(([A-Z])(\\d+):([A-Z])(\\d+)\\)/g, (_, c1, r1, c2, r2) => {
    const cells = [];
    for (let c = c1.charCodeAt(0); c <= c2.charCodeAt(0); c++) for (let r = +r1; r <= +r2; r++) cells.push(String.fromCharCode(c) + r);
    return '(' + cells.join('+') + ')';
  });
}
const refsOf = (expr) => [...new Set(expr.match(/[A-Z]\\d+/g) || [])];

// tiny recursive-descent evaluator (never use eval on user formulas!)
function evalExpr(src, get) {
  const tokens = src.match(/\\d+\\.?\\d*|[A-Z]\\d+|[-+*/()]/g) || [];
  let p = 0;
  function primary() {
    const t = tokens[p++];
    if (t === '(') { const v = expr(); p++; return v; }
    if (t === '-') return -primary();
    if (/^[A-Z]\\d+$/.test(t)) return get(t);
    return parseFloat(t);
  }
  function term() { let v = primary(); while (tokens[p] === '*' || tokens[p] === '/') { const op = tokens[p++]; const r = primary(); v = op === '*' ? v * r : v / r; } return v; }
  function expr() { let v = term(); while (tokens[p] === '+' || tokens[p] === '-') { const op = tokens[p++]; const r = term(); v = op === '+' ? v + r : v - r; } return v; }
  return expr();
}

// ---------- the sheet ----------
class Sheet {
  constructor() { this.raw = new Map(); this.value = new Map(); this.precedents = new Map(); this.dependents = new Map(); }
  set(addr, text) {
    for (const p of this.precedents.get(addr) || []) this.dependents.get(p).delete(addr);   // drop old edges
    this.raw.set(addr, text);
    const refs = text.startsWith('=') ? refsOf(expandSum(text.slice(1))) : [];
    this.precedents.set(addr, new Set(refs));
    for (const r of refs) { if (!this.dependents.has(r)) this.dependents.set(r, new Set()); this.dependents.get(r).add(addr); }
    return this.recalc(addr);
  }
  recalc(start) {
    // 1. dirty set = start + everything downstream (depth-first walk over dependents)
    const dirty = new Set();
    const walk = (c) => { if (dirty.has(c)) return; dirty.add(c); for (const d of this.dependents.get(c) || []) walk(d); };
    walk(start);
    // 2. Kahn's algorithm on the dirty subgraph: waiting[c] = inputs of c that are ALSO dirty
    const waiting = new Map();
    for (const c of dirty) waiting.set(c, [...(this.precedents.get(c) || [])].filter((p) => dirty.has(p)).length);
    const ready = [...dirty].filter((c) => waiting.get(c) === 0);
    const order = [];
    while (ready.length) {
      const c = ready.shift();
      order.push(c);
      for (const d of this.dependents.get(c) || []) {
        if (!dirty.has(d)) continue;
        waiting.set(d, waiting.get(d) - 1);
        if (waiting.get(d) === 0) ready.push(d);
      }
    }
    // 3. evaluate in that order; anything left over is stuck in (or behind) a cycle
    for (const c of order) this.value.set(c, this.compute(c));
    for (const c of dirty) if (!order.includes(c)) this.value.set(c, '#CYCLE!');
    return order;
  }
  compute(addr) {
    const text = this.raw.get(addr);
    if (!text.startsWith('=')) return text === '' ? 0 : Number(text);
    try { return evalExpr(expandSum(text.slice(1)), (r) => { const v = this.value.get(r); return v === undefined ? 0 : v; }); }
    catch (e) { return '#ERR'; }
  }
}

const s = new Sheet();
s.set('A1', '2'); s.set('B1', '3');
s.set('C1', '=A1+B1'); s.set('D1', '=C1*2'); s.set('E1', '=A1+D1'); s.set('F1', '=SUM(A1:B1)');
const show = () => ['A1', 'B1', 'C1', 'D1', 'E1', 'F1'].map((a) => a + '=' + s.value.get(a)).join('  ');
console.log('start      :', show());
console.log('edit A1=5  : recalc order', s.set('A1', '5').join(' -> '));   // B1 is untouched
console.log('after      :', show());
console.log('edit B1=E1+1 (creates a loop):', s.set('B1', '=E1+1').join(' -> ') || '(nothing could run)');
console.log('after      :', show());` },
    { lang: 'js', run: true, title: 'Column letters, and shifting references on paste (runnable)', code: `// A=1, B=2, ... Z=26, AA=27 (like base 26 but with no zero digit)
function letterToCol(letters) {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}
function colToLetter(n) {
  let s = '';
  while (n > 0) { const rem = (n - 1) % 26; s = String.fromCharCode(65 + rem) + s; n = Math.floor((n - 1) / 26); }
  return s;
}
// Copy "=A1+$B$2" one row down and one column right: relative parts move, $absolute parts stay.
function shiftRefs(formula, dRow, dCol) {
  return formula.replace(/(\\$?)([A-Z]+)(\\$?)(\\d+)/g, (m, d1, col, d2, row) => {
    const newCol = d1 ? col : colToLetter(letterToCol(col) + dCol);
    const newRow = d2 ? row : String(Number(row) + dRow);
    return d1 + newCol + d2 + newRow;
  });
}
console.log(['A', 'Z', 'AA', 'AZ', 'ZZ', 'AAA'].map((l) => l + '=' + letterToCol(l)).join('  '));
console.log([1, 26, 27, 52, 702, 703].map(colToLetter).join('  '));
console.log(shiftRefs('=A1+$B$2', 1, 1));          // =B2+$B$2
console.log(shiftRefs('=SUM(A1:A3)*$C1', 0, 2));   // =SUM(C1:C3)*$C1` },
    { lang: 'js', title: 'Rendering only the visible cells (browser code)', code: `// grid state: scrollTop/scrollLeft come from the scroll container; colLefts/rowTops are prefix sums of widths/heights
function visibleCells(scrollTop, scrollLeft, viewH, viewW, rowTops, colLefts, overscan = 2) {
  const firstRow = Math.max(0, findIndex(rowTops, scrollTop) - overscan);
  const lastRow = Math.min(rowTops.length - 2, findIndex(rowTops, scrollTop + viewH) + overscan);
  const firstCol = Math.max(0, findIndex(colLefts, scrollLeft) - overscan);
  const lastCol = Math.min(colLefts.length - 2, findIndex(colLefts, scrollLeft + viewW) + overscan);
  const cells = [];
  for (let r = firstRow; r <= lastRow; r++) {
    for (let c = firstCol; c <= lastCol; c++) {
      cells.push({ r, c, x: colLefts[c], y: rowTops[r] });   // each is absolutely positioned inside a big spacer div
    }
  }
  return cells;                                              // typically a few hundred, never millions
}
// binary search: largest i with arr[i] <= value
function findIndex(arr, value) {
  let lo = 0, hi = arr.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (arr[mid] <= value) lo = mid; else hi = mid - 1; }
  return lo;
}` }
  ],
  viz: [
    {
      title: 'Edit one cell: dirty set, topological order, recalculation',
      input: 'A1=5',
      inputLabel: 'Edit A1 or B1, e.g. A1=5 or B1=10',
      gen: function (input) {
        var m = String(input).trim().match(/^([AB]1)\s*=\s*(-?\d+)$/i);
        if (!m) throw new Error('Type A1=<number> or B1=<number>, e.g. A1=5');
        var edit = m[1].toUpperCase(), nv = +m[2];
        var names = ['A1', 'B1', 'C1', 'D1', 'E1', 'F1'];
        var raw = { A1: '2', B1: '3', C1: '=A1+B1', D1: '=C1*2', E1: '=A1+D1', F1: '=A1+B1' };
        var deps = { A1: [], B1: [], C1: ['A1', 'B1'], D1: ['C1'], E1: ['A1', 'D1'], F1: ['A1', 'B1'] };
        var users = { A1: ['C1', 'E1', 'F1'], B1: ['C1', 'F1'], C1: ['D1'], D1: ['E1'], E1: [], F1: [] };
        var val = {};
        function ev(c) { var t = raw[c]; if (t.charAt(0) !== '=') return Number(t); return miniEval(t.slice(1), function (r) { return val[r]; }); }
        ['A1', 'B1', 'C1', 'D1', 'E1', 'F1'].forEach(function (c) { val[c] = ev(c); });
        var nodes = [
          { id: 'A1', label: 'A1', x: 8, y: 12 }, { id: 'B1', label: 'B1', x: 8, y: 48 }, { id: 'C1', label: 'C1', x: 36, y: 12 },
          { id: 'F1', label: 'F1', x: 36, y: 48 }, { id: 'D1', label: 'D1', x: 64, y: 12 }, { id: 'E1', label: 'E1', x: 92, y: 30 }
        ];
        var edges = [['A1', 'C1'], ['B1', 'C1'], ['A1', 'F1'], ['B1', 'F1'], ['C1', 'D1'], ['A1', 'E1'], ['D1', 'E1']];
        function gridPart(hl) { return { type: 'grid', label: 'Sheet (row 1)', colHead: names, rowHead: ['1'], rows: [names.map(function (c) { return val[c]; })], hl: hl || {} }; }
        function formulaPart() { return { type: 'table', label: 'Formulas', columns: ['cell', 'formula', 'reads'], rows: names.map(function (c) { return [c, raw[c], deps[c].join(', ') || '-']; }) }; }
        function graphPart(hl, ehl, tags) { return { type: 'graph', label: 'Dependency graph (arrow = feeds into)', directed: true, height: 60, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} }; }
        var frames = [];
        frames.push({ narr: 'A tiny sheet. Strings (arrows) go from a cell to the cells that <b>read</b> it. A1 and B1 hold numbers; the other four cells are formulas.', parts: [gridPart(), graphPart(), formulaPart()] });
        raw[edit] = String(nv);
        // dirty set
        var dirty = {}, stack = [edit], dl = [];
        while (stack.length) { var c = stack.pop(); if (dirty[c]) continue; dirty[c] = true; dl.push(c); users[c].forEach(function (u) { stack.push(u); }); }
        var hlEdit = {}; hlEdit[edit] = 'cur';
        var hlg = {}; hlg[0] = 'cur';
        frames.push({ narr: 'You type <b>' + nv + '</b> into <b>' + edit + '</b>. Step 1: the raw text changes. Nothing else has been recomputed yet, so the numbers elsewhere are stale.', parts: [gridPart({ ['0,' + names.indexOf(edit)]: 'cur' }), graphPart(hlEdit)] });
        var hlDirty = {}; dl.forEach(function (c2) { hlDirty[c2] = c2 === edit ? 'cur' : 'win'; });
        var skipped = names.filter(function (c2) { return !dirty[c2]; });
        frames.push({ narr: 'Step 2: follow the arrows <b>forward</b> from ' + edit + ' to collect the <b>dirty set</b>: ' + dl.length + ' cell(s) (' + names.filter(function (c2) { return dirty[c2]; }).join(', ') + ').' + (skipped.length ? ' Untouched: <span class="c-g">' + skipped.join(', ') + '</span>, so we skip their work entirely.' : ''), parts: [graphPart(hlDirty)] });
        // Kahn
        var waiting = {}; dl.forEach(function (c2) { waiting[c2] = deps[c2].filter(function (p) { return dirty[p]; }).length; });
        var wrows = names.filter(function (c2) { return dirty[c2]; }).map(function (c2) { return [c2, waiting[c2], waiting[c2] === 0 ? 'READY' : 'waiting']; });
        frames.push({ narr: 'Step 3: count, for each dirty cell, how many of its inputs are <i>also dirty</i> (still waiting to be recomputed). Cells with <b>0</b> are ready now.', parts: [graphPart(hlDirty), { type: 'table', label: 'Waiting counts', columns: ['cell', 'dirty inputs left', 'status'], rows: wrows, hl: (function () { var o = {}; wrows.forEach(function (r, i) { if (r[1] === 0) o[i] = 'ok'; }); return o; })() }] });
        var ready = dl.filter(function (c2) { return waiting[c2] === 0; }), order = [], doneHl = {};
        // recompute values in order
        var newVal = {};
        var done = {};
        while (ready.length) {
          var cur = ready.shift(); order.push(cur);
          val[cur] = ev(cur); done[cur] = true;
          var release = [];
          users[cur].forEach(function (u) { if (!dirty[u]) return; waiting[u]--; if (waiting[u] === 0) { ready.push(u); release.push(u); } });
          var h = {}; Object.keys(done).forEach(function (k) { h[k] = 'done'; }); h[cur] = 'ok';
          ready.forEach(function (r2) { h[r2] = 'win'; });
          var gh = {}; gh['0,' + names.indexOf(cur)] = 'ok';
          frames.push({ narr: 'Compute <b>' + cur + '</b> = ' + (raw[cur].charAt(0) === '=' ? raw[cur] + ' = ' : '') + '<b>' + val[cur] + '</b>.' + (release.length ? ' That frees <b>' + release.join(', ') + '</b> (all of their dirty inputs are done).' : ' Nothing new is released.'), parts: [gridPart(gh), graphPart(h), { type: 'queue', label: 'Ready queue', items: ready.slice(), frontLabel: 'next', backLabel: 'later' }, { type: 'text', html: 'Order so far: <b>' + order.join(' &rarr; ') + '</b>' }] });
        }
        frames.push({ narr: 'Done. Recalculation order: <b>' + order.join(' &rarr; ') + '</b>. Every cell was computed <i>after</i> all of its inputs, exactly once' + (skipped.length ? ', and ' + skipped.join(', ') + ' was never touched' : '') + '.', parts: [gridPart(), graphPart((function () { var o = {}; order.forEach(function (k) { o[k] = 'ok'; }); return o; })())] });
        return frames;
      }
    },
    {
      title: 'Circular references: why some cells never become ready',
      input: 'A1=B1+1 B1=C1*2 C1=A1 D1=B1+5 E1=7',
      inputLabel: 'Cells as NAME=formula (use A1..F1, references to other cells)',
      gen: function (input) {
        var toks = String(input).trim().split(/\s+/);
        var cells = {}, order0 = [];
        toks.forEach(function (tk) {
          var m = tk.match(/^([A-F]1)=(.+)$/);
          if (!m) throw new Error('Use tokens like A1=B1+1 (cells A1..F1, no spaces inside a token)');
          if (cells[m[1]] !== undefined) throw new Error('Cell ' + m[1] + ' is defined twice');
          cells[m[1]] = m[2]; order0.push(m[1]);
        });
        if (order0.length < 2 || order0.length > 6) throw new Error('Use 2 to 6 cells');
        var deps = {}, users = {};
        order0.forEach(function (c) { users[c] = []; });
        order0.forEach(function (c) {
          var rs = (cells[c].match(/[A-F]1/g) || []).filter(function (r, i, a) { return a.indexOf(r) === i && cells[r] !== undefined; });
          deps[c] = rs; rs.forEach(function (r) { users[r].push(c); });
        });
        var nodes = order0.map(function (c, i) { return { id: c, label: c, x: 10 + i * (80 / Math.max(1, order0.length - 1)), y: i % 2 === 0 ? 14 : 44 }; });
        var edges = []; order0.forEach(function (c) { deps[c].forEach(function (r) { edges.push([r, c]); }); });
        function gp(hl, ehl) { return { type: 'graph', label: 'Who feeds whom (arrow = feeds into)', directed: true, height: 60, nodes: nodes, edges: edges, hl: hl || {} }; }
        var frames = [];
        frames.push({ narr: 'Each token is a cell and its formula. We draw an arrow from every cell a formula <b>reads</b> to the formula cell.', parts: [gp(), { type: 'table', label: 'Cells', columns: ['cell', 'formula', 'reads'], rows: order0.map(function (c) { return [c, '=' + cells[c].replace(/^=/, ''), deps[c].join(', ') || '-']; }) }] });
        var waiting = {}; order0.forEach(function (c) { waiting[c] = deps[c].length; });
        var ready = order0.filter(function (c) { return waiting[c] === 0; });
        frames.push({ narr: 'Count unfinished inputs per cell. Cells with <b>0</b> can be computed first: ' + (ready.length ? '<b>' + ready.join(', ') + '</b>.' : '<span class="c-r">none!</span>'), parts: [gp((function () { var o = {}; ready.forEach(function (r) { o[r] = 'ok'; }); return o; })()), { type: 'table', columns: ['cell', 'inputs waiting'], rows: order0.map(function (c) { return [c, waiting[c]]; }), hl: (function () { var o = {}; order0.forEach(function (c, i) { if (waiting[c] === 0) o[i] = 'ok'; }); return o; })() }] });
        var done = [], vq = ready.slice();
        while (vq.length) {
          var c = vq.shift(); done.push(c);
          var rel = [];
          users[c].forEach(function (u) { waiting[u]--; if (waiting[u] === 0) { vq.push(u); rel.push(u); } });
          var h = {}; done.forEach(function (d) { h[d] = 'done'; }); h[c] = 'ok';
          frames.push({ narr: 'Compute <b>' + c + '</b>' + (rel.length ? ' and release ' + rel.join(', ') : '') + '. ', parts: [gp(h), { type: 'queue', label: 'Ready queue', items: vq.slice() }] });
        }
        var stuck = order0.filter(function (c) { return done.indexOf(c) < 0; });
        var hs = {}; done.forEach(function (d) { hs[d] = 'ok'; }); stuck.forEach(function (s) { hs[s] = 'bad'; });
        if (stuck.length) {
          frames.push({ narr: 'The ready queue is empty but <b>' + stuck.join(', ') + '</b> never became ready: each one is waiting for another stuck cell. That means a cycle (or a cell downstream of a cycle). They all show <code>#CYCLE!</code>. Cells computed fine: ' + (done.join(', ') || 'none') + '.', parts: [gp(hs), { type: 'text', html: 'Rule: <b>sorted count &lt; dirty count &rArr; cycle</b>. This check costs nothing extra: it falls out of Kahn\'s algorithm.' }] });
        } else {
          frames.push({ narr: 'All cells became ready, so there is <b>no cycle</b>. A valid calculation order is <b>' + done.join(' &rarr; ') + '</b>. Try making two cells read each other, for example <code>A1=B1+1 B1=A1</code>.', parts: [gp(hs)] });
        }
        return frames;
      }
    },
    {
      title: 'Virtual window over a huge sheet',
      input: '1 A',
      inputLabel: 'First visible row and column (e.g. 1 A or 500 C)',
      gen: function (input) {
        var t = String(input).trim().split(/\s+/);
        var row0 = parseInt(t[0], 10), col0 = (t[1] || 'A').toUpperCase();
        if (!(row0 >= 1 && row0 <= 1000000) || !/^[A-Z]$/.test(col0)) throw new Error('Format: row (1-1000000) then a column letter A-Z, e.g. 500 C');
        var ROWS = 6, COLS = 5, TOTAL_R = 1000000, TOTAL_C = 26;
        function cell(r, c) { return ((r * 31 + c * 17) % 90) + 10; }
        function view(r0, c0, narr) {
          var heads = [], rh = [], rows = [];
          for (var c = 0; c < COLS; c++) heads.push(String.fromCharCode(65 + Math.min(25, c0 + c)));
          for (var r = 0; r < ROWS; r++) { rh.push(String(r0 + r)); var line = []; for (var c2 = 0; c2 < COLS; c2++) line.push(cell(r0 + r, c0 + c2)); rows.push(line); }
          return { narr: narr, parts: [
            { type: 'grid', label: 'What is drawn (the window)', colHead: heads, rowHead: rh, rows: rows, hl: { '0,0': 'cur' } },
            { type: 'vars', label: 'Counts', vals: { sheet_cells: (TOTAL_R * TOTAL_C).toLocaleString('en-US'), dom_nodes_drawn: ROWS * COLS + ' (+ overscan)', top_spacer_px: (r0 - 1) * 24, left_spacer_px: c0 * 100 }, hl: { dom_nodes_drawn: 'ok' } }
          ] };
        }
        var c0 = col0.charCodeAt(0) - 65;
        if (c0 > TOTAL_C - COLS) c0 = TOTAL_C - COLS;
        var frames = [];
        frames.push(view(row0, c0, 'The sheet has <b>26,000,000 cells</b>, but the screen shows only about <b>' + ROWS * COLS + '</b> here. Only those are real DOM nodes; the rest do not exist. Start at row ' + row0 + ', column ' + String.fromCharCode(65 + c0) + '.'));
        frames.push(view(Math.min(TOTAL_R - ROWS, row0 + 20), c0, 'Scroll down 20 rows. We compute the first visible row from <code>scrollTop / rowHeight</code> and render a new set of cells. The scrollbar thinks the sheet is 24,000,000 px tall because of a spacer.'));
        frames.push(view(Math.min(TOTAL_R - ROWS, row0 + 20), Math.min(TOTAL_C - COLS, c0 + 3), 'Scroll right 3 columns. Same idea in the other direction: the first visible column comes from <code>scrollLeft</code> (prefix sums of column widths).'));
        frames.push(view(TOTAL_R - ROWS + 1, Math.min(TOTAL_C - COLS, c0 + 3), 'Jump to the bottom with <kbd>Ctrl</kbd>+<kbd>End</kbd>. Still only ' + ROWS * COLS + ' cells are drawn. Cost depends on the <b>screen size</b>, not the sheet size.'));
        return frames;
      }
    },
    {
      title: 'Spreadsheet component tree',
      gen: function () {
        var arr = ['SheetApp', 'Toolbar', 'Workbook', 'NameBox', 'FormulaInput', 'GridViewport', 'SheetTabs', null, null, null, null, 'Headers', 'CellLayer'];
        return [
          treeFrame('The app: a toolbar on top (name box and formula bar) and the workbook below (the grid and sheet tabs).', 'Spreadsheet tree', arr),
          treeFrame('A <b>store outside React</b> holds the sparse <code>cells</code> map, the graph and the selection. Components subscribe to just the pieces they show.', 'State owner', arr, { 0: 'sel' }, { 0: 'sheet store' }),
          treeFrame('<b>GridViewport</b> owns scroll position and computes the visible row/column window from prefix sums. It draws <b>Headers</b> and a <b>CellLayer</b>.', 'Virtual window', arr, { 5: 'cur', 11: 'ok', 12: 'ok' }, { 5: 'window r10..44, c0..9' }),
          treeFrame('Each cell in <b>CellLayer</b> subscribes to one address (<code>cells["C1"]</code>), so a recalculation re-renders only the cells whose value changed.', 'Per-cell subscription', arr, { 12: 'sel' }, { 12: 'subscribe(addr)' }),
          treeFrame('Editing: typing in a cell (or in <b>FormulaInput</b>) updates a draft; <kbd>Enter</kbd> commits to the store, which runs the recalculation. <b>NameBox</b> shows and jumps to the selected address.', 'Editing', arr, { 4: 'cur', 3: 'win', 0: 'win' }, { 4: 'draft', 3: 'B2' }),
          treeFrame('Accessibility: <code>role="grid"</code> on the viewport, <code>aria-rowindex</code>/<code>aria-colindex</code> on cells (the DOM has only a window, so indexes are explicit), one cell with <code>tabindex="0"</code> and arrow-key movement.', 'A11y', arr, { 5: 'sel' }, { 5: 'role=grid' })
        ];
      }
    }
  ],
  examples: [
    { title: 'What recomputes when A1 changes?', html: `<p>Sheet: <code>C1 = A1+B1</code>, <code>D1 = C1*2</code>, <code>E1 = A1+D1</code>, <code>F1 = SUM(B1:B3)</code>.</p>
      ${H.table(['Cell', 'Reads', 'Recomputed after editing A1?', 'Why'], [
        ['C1', 'A1, B1', '<span class="c-g">yes</span>', 'reads A1 directly'],
        ['D1', 'C1', '<span class="c-g">yes</span>', 'reads C1, which changed'],
        ['E1', 'A1, D1', '<span class="c-g">yes (after D1)</span>', 'reads A1 and D1'],
        ['F1', 'B1, B2, B3', '<span class="c-m">no</span>', 'no path from A1']
      ])}
      <p>Valid orders: <b>C1, D1, E1</b>. Computing E1 before D1 would use an old D1 (a wrong number). Topological order prevents that.</p>` },
    { title: 'Relative vs absolute references on paste', html: `<p>Copy <code>=A1*$B$1</code> from C1 and paste into C2 (one row down): the relative <code>A1</code> becomes <code>A2</code>, and the absolute <code>$B$1</code> stays. That is why a tax-rate cell is written <code>$B$1</code>. Implementation: parse references, shift the unlocked row/column parts by the paste offset (see the runnable <code>shiftRefs</code> above).</p>
      ${H.table(['Copied formula', 'Paste offset', 'Result'], [['=A1+$B$2', '+1 row, +1 col', '=B2+$B$2'], ['=SUM(A1:A3)*$C1', '+0 row, +2 cols', '=SUM(C1:C3)*$C1'], ['=$A$1', 'anywhere', '=$A$1']])}
      <p>After the paste, rebuild the edges for each pasted cell and run <b>one</b> combined recalculation for all pasted cells (union of dirty sets), not one per cell.</p>` },
    { title: 'Why #CYCLE! rather than looping forever', html: `<p>If A1 is <code>=B1+1</code> and B1 is <code>=A1+1</code>, a naive "recompute until stable" loop never stops (the numbers keep growing). With Kahn's algorithm, neither cell ever reaches "0 inputs waiting", so both are left over after the queue empties. Leftover count &gt; 0 means a cycle; we mark exactly those cells (and anything depending on them) as errors, and the app stays responsive. Excel and Sheets also offer an opt-in "iterative calculation" for intended loops with a fixed number of rounds.</p>`, code: { lang: 'js', run: true, code: `// Cycle check by Kahn: deps = cell -> cells it reads
function hasCycle(deps) {
  const cells = Object.keys(deps);
  const waiting = {}, users = {};
  cells.forEach((c) => { waiting[c] = deps[c].length; users[c] = users[c] || []; deps[c].forEach((p) => { (users[p] = users[p] || []).push(c); }); });
  const q = cells.filter((c) => waiting[c] === 0);
  let seen = 0;
  while (q.length) { const c = q.shift(); seen++; (users[c] || []).forEach((u) => { if (--waiting[u] === 0) q.push(u); }); }
  return seen < cells.length;                       // cells never processed are on or behind a cycle
}
console.log(hasCycle({ A1: [], B1: ['A1'], C1: ['B1'] }));        // false
console.log(hasCycle({ A1: ['B1'], B1: ['A1'] }));                // true` } }
  ],
  deepDive: `<p><b>🟣 Graph details.</b> A single range like <code>SUM(A1:A100000)</code> would create 100,000 edges if you expand it. Real engines store a <b>range node</b> with an interval structure (interval tree or segment tree), so "which formulas depend on A5?" is answered by stabbing queries, and the range sum itself can be cached and updated by delta (subtract old, add new) in O(1). Cross-sheet references and named ranges add more edge types. <b>Volatile functions</b> (<code>NOW()</code>, <code>RAND()</code>) are treated as always dirty on every recalculation tick.</p>
    <p><b>Topological sort choices.</b> Kahn's algorithm (BFS with in-degree counts) is natural for incremental recompute and gives cycle detection for free. DFS post-order also works and uses recursion (careful with chains of 100,000 cells: a recursion limit crash; use an explicit stack). For huge sheets compute <b>levels</b> (longest path from inputs): cells at the same level are independent and can be computed in parallel in a Web Worker. Batch operations (paste of 10,000 cells, fill-down) should collect all edits, build one dirty set, and sort once.</p>
    <p><b>Formula parsing and safety.</b> Tokenizer, then a precedence-climbing or recursive-descent parser to an AST, then an evaluator with a function table. Never call <code>eval</code> or <code>new Function</code> on user text: a shared sheet becomes a stored-XSS and data-exfiltration vector. Cache the AST per cell; only reparse on edit. Errors are values (<code>#DIV/0!</code>, <code>#REF!</code>, <code>#NAME?</code>, <code>#CYCLE!</code>) that flow through the graph, not exceptions that crash the app. Remember <code>0.1 + 0.2 !== 0.3</code> in floating point; spreadsheets format to ~15 significant digits and some use decimal arithmetic for money.</p>
    <p><b>Rendering.</b> DOM with absolutely positioned cells works to roughly a few thousand visible cells. Google Sheets draws the grid on <b>canvas</b> for speed and uses a small DOM layer for the active editor and accessibility. Trade-off: canvas means you rebuild selection, text measurement, hit-testing and screen-reader support yourself. Use <code>requestAnimationFrame</code> to coalesce scroll updates, and <code>transform: translate</code> for the layer so scroll is a compositor-only operation. <b>Frozen rows/columns</b> are separate viewports that share one scroll axis each. <b>Column resize</b> updates the prefix-sum array from the changed column onward (O(columns)), or use a Fenwick tree for O(log n).</p>
    <p><b>Selection and editing.</b> Selection is <code>anchor</code> and <code>focus</code> addresses (a rectangle is derived), not per-cell flags, so selecting a million cells is O(1). Overlay the selection rectangle as one absolutely positioned div. The in-cell editor is a single reusable <code>input</code> or <code>contenteditable</code> moved over the active cell. <b>Undo/redo</b> uses the command pattern: each edit stores the inverse (old raw text of each cell), and a paste is one undo step.</p>
    <p><b>Collaboration.</b> Multiple users editing: send <b>operations</b> ("set C1 to =A1+B1") rather than whole sheets; the server orders them and rebroadcasts. Cell edits are mostly independent, so per-cell last-writer-wins with a version (Lamport) is simple and works; structural changes (insert row, delete column) need real transformation: operational transform or a CRDT with stable row/column ids instead of numbers (otherwise "row 7" means different rows to different users). Everyone recalculates locally from the same operations, or only the server recalculates and sends values.</p>
    <p><b>Accessibility.</b> Use the ARIA grid pattern: <code>role="grid"</code>, <code>role="row"</code>, <code>role="gridcell"</code> with <code>aria-rowcount</code>/<code>aria-colcount</code> for the full size and <code>aria-rowindex</code>/<code>aria-colindex</code> per rendered cell, a roving <code>tabindex</code> (one cell tabbable), arrow-key navigation, and announcements of the new cell content. Keep an off-screen live region for formula errors.</p>`,
  aiEra: `<p><b>🤖 What AI changes.</b> Spreadsheets are becoming <b>natural-language tools</b>: "total sales by region, then chart it". An assistant turns the sentence into formulas, pivots or scripts, and can explain existing formulas in plain English. That raises new frontend problems: previewing proposed changes before applying them (a diff for cells), applying many edits as <b>one undoable step</b>, marking AI-written cells, and keeping a trace of "which cells did the AI read".</p>
    <p><b>Use AI as a partner:</b> ask it to <code>generate a grid of tricky formulas: nested parentheses, unary minus, forward references, ranges that cross, division by zero</code> as test data for your engine. Ask <code>property-test my topological recalculation: for random DAGs, compare incremental recompute with a full recompute</code>; both must always agree.</p>
    <p><b>Where AI goes wrong:</b> it evaluates formulas with <code>eval</code>, recalculates the entire sheet on every keystroke, renders a DOM node for every cell, uses recursion that overflows on long dependency chains, forgets that range expansion explodes the graph, and silently "fixes" a circular reference by guessing. As a user-facing feature, models can invent functions that do not exist or misapply relative references.</p>
    <p><b>What you must still own:</b> the engine's correctness guarantees (order, cycles, errors as values), the sandboxing of formulas, the undo model for bulk AI edits, and the explanation of how the dependency graph keeps recalculation proportional to what changed.</p>`,
  problems: [
    {
      title: 'Spreadsheet Recalculation Order',
      level: 'Hard', tags: ['topological sort', 'graph', 'cycle detection', 'dependency graph'], companies: ['Google', 'Microsoft', 'Atlassian'],
      statement: `<p>You are given <code>deps</code>, an object mapping each cell to the list of cells its formula reads (for example <code>{ C1: ['A1','B1'], D1: ['C1'] }</code>), and the name of a <code>changed</code> cell. Return the list of cells that must be recomputed, in an order where every cell appears <b>after</b> all of its inputs that are also in the list. The list starts with the changed cell. If any affected cell is part of (or sits behind) a circular reference, return <code>{ cycle: [...] }</code> with those cells instead.</p>`,
      constraints: `<p>Up to 10<sup>5</sup> cells and 3·10<sup>5</sup> edges. Cells that are not affected by the change must not be visited more than needed. No recursion deeper than a small constant (chains can be 10<sup>5</sup> long).</p>`,
      example: `${H.table(['deps', 'changed', 'answer'], [['C1:[A1,B1], D1:[C1], E1:[A1,D1], F1:[B1]', 'A1', '[A1, C1, D1, E1]  (F1 untouched)']])}<p>E1 reads A1 and D1, so it must wait for D1, which waits for C1. F1 only reads B1, so editing A1 does not affect it.</p>`,
      brute: { why: `<p>Recompute every cell, again and again, until nothing changes (a fixed point). A chain of length N needs N passes, so it is O(N²) for a long chain, it recomputes untouched cells such as F1, and on a cycle it never converges (infinite loop).</p>`, code: `function recalcBrute(deps, evaluate, maxPasses) {
  const values = {};
  for (let pass = 0; pass < maxPasses; pass++) {       // you must guess a pass limit to survive cycles
    let changed = false;
    for (const cell of Object.keys(deps)) {            // visits EVERY cell, affected or not
      const v = evaluate(cell, values);
      if (values[cell] !== v) { values[cell] = v; changed = true; }
    }
    if (!changed) return values;
  }
  return null;                                         // probably a cycle... or just too few passes
}` },
      mcq: { q: 'After Kahn\'s algorithm finishes on the affected cells, 3 of the 7 affected cells were never taken from the queue. What does that mean?', options: ['Those 3 cells are on, or depend on, a circular reference', 'The sort is correct; ignore them', 'The graph has duplicate edges', 'Those cells have no formulas'], answer: 0, explain: 'A cell is released only when all its affected inputs are done. Cells waiting on each other never reach zero, so leftover cells mean a cycle (or cells behind one).' },
      hints: [
        `<p>Hint 1: the aha. Two separate jobs: (1) <b>find</b> which cells are affected (everything reachable from the changed cell along "who reads me" arrows), (2) <b>order</b> them so inputs come first.</p>`,
        `<p>Hint 2: invert the input once to get <code>users[c]</code> (cells that read c). Collect the affected set with an explicit stack. Then run Kahn: for each affected cell count the inputs that are <i>also affected</i>; start with those at zero.</p>`,
        `<p>Hint 3: edge cases. Count only affected inputs (an unchanged input is already fresh). Use an explicit stack/queue instead of recursion. After the queue empties, if the output is shorter than the affected set, the missing cells are the cycle answer.</p>`
      ],
      solution: {
        approach: `<p>Build the reverse graph, DFS (explicit stack) from the changed cell to get the affected set, count each affected cell's affected inputs, and run Kahn's algorithm with a queue. Result length equal to the affected size means a valid order; otherwise the unprocessed cells are reported as the cycle.</p>`,
        code: { lang: 'js', run: true, code: `function recalcOrder(deps, changed) {
  // reverse graph: who reads me?
  const users = {};
  for (const cell of Object.keys(deps)) {
    for (const input of deps[cell]) (users[input] = users[input] || []).push(cell);
  }
  // 1. affected set (iterative DFS)
  const affected = new Set();
  const stack = [changed];
  while (stack.length) {
    const c = stack.pop();
    if (affected.has(c)) continue;
    affected.add(c);
    for (const u of users[c] || []) stack.push(u);
  }
  // 2. Kahn on the affected subgraph
  const waiting = new Map();
  for (const c of affected) {
    waiting.set(c, (deps[c] || []).filter((p) => affected.has(p)).length);
  }
  const queue = [...affected].filter((c) => waiting.get(c) === 0);
  const order = [];
  for (let head = 0; head < queue.length; head++) {          // index pointer: O(1) dequeue
    const c = queue[head];
    order.push(c);
    for (const u of users[c] || []) {
      waiting.set(u, waiting.get(u) - 1);
      if (waiting.get(u) === 0) queue.push(u);
    }
  }
  if (order.length === affected.size) return order;
  return { cycle: [...affected].filter((c) => !order.includes(c)) };
}

const deps = { A1: [], B1: [], C1: ['A1', 'B1'], D1: ['C1'], E1: ['A1', 'D1'], F1: ['B1'] };
console.log(recalcOrder(deps, 'A1'));                        // [ 'A1', 'C1', 'D1', 'E1' ]
console.log(recalcOrder({ ...deps, A1: ['E1'] }, 'B1'));     // A1 reads E1 -> loop A1-C1-D1-E1` },
        complexity: `<p>Time O(V' + E') where V' and E' are the affected cells and the edges among them (building the reverse graph is O(V + E) once and can be cached between edits). Space O(V). The final <code>includes</code> check is only on the error path.</p>`,
        followUps: ['Cache the reverse graph and update it incrementally when a formula changes.', 'Group cells into levels so independent cells can be computed in parallel in a worker.', 'Support ranges like SUM(A1:A100000) without 100,000 edges.']
      }
    }
  ]
});

/* ===================== TOPIC 7: Machine-coding round strategy ===================== */
topics.push({
  title: 'The Machine-Coding Round: Strategy, Skeleton and Edge Cases',
  analogy: `<p>Imagine you are asked to <b>cook a three-course dinner for guests in 60 minutes</b>. A good cook does not spend 40 minutes carving radish roses for the starter. They plan the menu in five minutes, get <i>something edible on every plate</i> first (the MVP), then improve each dish, and taste before serving. A machine-coding round is exactly this: a short, timed task ("build a star rating", "build a Kanban board") where the judges look at a <b>working result</b>, <b>clean structure</b> and <b>how you think while you cook</b>.</p>`,
  explain: `<p><b>🟢 What the round is.</b> You get 60 to 120 minutes and a spec. You build a working UI in an editor, often in plain JavaScript or React, sometimes with AI tools allowed. Then you demo and answer questions. Companies like Flipkart, Uber, Swiggy, Atlassian, Razorpay and many startups use it because it shows real skill that whiteboard quizzes cannot.</p>
    <p><b>What is judged</b> (roughly in this order):</p>
    ${H.table(['Area', 'What they look for'], [
      ['<b>Works</b>', 'The demo runs, core flow has no crash, edge cases are handled'],
      ['<b>Structure</b>', 'Small components/functions, one clear place for state, logic separate from DOM'],
      ['<b>Code quality</b>', 'Good names, no copy-paste, no dead code, consistent style'],
      ['<b>Edge cases</b>', 'Empty, loading, error, double-click, very long text, keyboard, resize'],
      ['<b>Communication</b>', 'You explain choices and trade-offs, ask good questions, accept hints']
    ])}
    <p><b>A time plan for 90 minutes:</b></p>
    ${H.table(['Minutes', 'Phase', 'What you do'], [
      ['0 to 5', 'Clarify', 'Restate the spec, ask about scope, libraries, styling, data source. Write a "must / nice / skip" list.'],
      ['5 to 15', 'Design', 'Component list, state shape, a few function signatures. 10 lines on paper or in comments.'],
      ['15 to 55', 'Build the MVP', 'Vertical slice first: one flow works end to end (render, interact, update). Commit mentally after each working piece.'],
      ['55 to 75', 'Features', 'Add the "nice" items one by one, in order of value. Re-run the flow after each.'],
      ['75 to 85', 'Edge cases and a11y', 'Empty/loading/error, keyboard, focus, long text, rapid clicks.'],
      ['85 to 90', 'Explain', 'Walk through the code, name what you would do with more time.']
    ])}
    <p><b>The skeleton that fits almost every prompt:</b> <b>one state object</b>, <b>pure functions that change state</b> (reducer), <b>one <code>render()</code> that draws from state</b>, and <b>event handlers that only dispatch</b>. If you keep that discipline, features become small additions rather than rewrites.</p>
    <p><b>MVP first, always.</b> For a Kanban board the MVP is: columns with cards render from data. Then add-card. Then move-card by button. Only then drag-and-drop. If time runs out, you still have a working app.</p>
    <p><b>The classic prompts and the one idea behind each:</b></p>
    ${H.table(['Prompt', 'The key idea'], [
      ['Star rating', 'Separate <code>value</code> (saved) from <code>hover</code> (preview); render stars from <code>hover ?? value</code>'],
      ['Tabs', 'One <code>activeIndex</code>; roving tabindex; arrow keys; <code>aria-selected</code>'],
      ['Modal', 'Focus trap, <kbd>Esc</kbd>, restore focus, lock scroll'],
      ['Nested comments', 'Recursive component + immutable tree updates by id'],
      ['File explorer tree', 'Recursive render; expanded-ids set; path-based updates'],
      ['Kanban drag-and-drop', 'State is <code>columns: { id: [cardIds] }</code>; DnD only changes that data'],
      ['Progress bar queue', 'A queue plus a concurrency limit; animate with CSS transitions or rAF'],
      ['OTP input', 'Array of N chars; auto-advance, backspace goes back, paste splits'],
      ['Pagination', 'Pure function <code>getPageItems(current, total)</code> with ellipsis rules']
    ])}`,
  clues: [
    '"You have 60 / 90 minutes to build ..." with a working demo expected — plan time before typing',
    '"Build X without using any library" → vanilla JS: state object + render + event delegation',
    '"Make it reusable / configurable" → props/options object, no hard-coded ids, callbacks like <code>onChange</code>',
    '"What would you do with more time?" → name accessibility, tests, performance, error handling, animation, in that kind of order',
    '"The interviewer may allow AI tools" → you will be judged on direction, review and explanation of the generated code'
  ],
  code: [
    { lang: 'js', run: true, title: 'A 15-line store + reducer you can type from memory (runnable)', code: `// state + reducer + subscribe: the same idea as Redux, tiny enough to write in an interview.
function createStore(reducer, initial) {
  let state = initial;
  const subs = new Set();
  return {
    getState: () => state,
    dispatch(action) { state = reducer(state, action); subs.forEach((fn) => fn(state)); },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }   // returns an unsubscribe function
  };
}

// Star rating logic as a pure reducer: value = saved rating, hover = preview while the mouse moves
function ratingReducer(state, action) {
  switch (action.type) {
    case 'hover': return { ...state, hover: action.n };
    case 'leave': return { ...state, hover: 0 };
    case 'click': return { ...state, value: state.value === action.n ? 0 : action.n };   // click the same star to clear
    default: return state;
  }
}
const draw = (s, max = 5) => {
  const shown = s.hover || s.value;                        // preview wins while hovering
  return '*'.repeat(shown) + '.'.repeat(max - shown) + '  (saved ' + s.value + ')';
};

const store = createStore(ratingReducer, { value: 0, hover: 0 });
store.subscribe((s) => console.log(draw(s)));              // render() on every change
store.dispatch({ type: 'hover', n: 3 });
store.dispatch({ type: 'click', n: 3 });
store.dispatch({ type: 'leave' });
store.dispatch({ type: 'hover', n: 5 });
store.dispatch({ type: 'leave' });
store.dispatch({ type: 'click', n: 3 });                   // same star again clears it` },
    { lang: 'js', title: 'Vanilla UI skeleton: state, render, event delegation (browser code)', code: `// 1. one state object
const state = { items: [{ id: 1, text: 'learn', done: false }], filter: 'all' };

// 2. one render function: state in, DOM out (simple version: rebuild the list)
const list = document.querySelector('#list');
function render() {
  const visible = state.items.filter((i) => state.filter === 'all' || (state.filter === 'done') === i.done);
  list.innerHTML = '';                                   // fine for small lists; escape user text by using textContent
  for (const item of visible) {
    const li = document.createElement('li');
    li.dataset.id = String(item.id);
    li.textContent = item.text;                          // textContent, never innerHTML, for user text (XSS)
    li.className = item.done ? 'done' : '';
    list.appendChild(li);
  }
}

// 3. ONE listener on the parent (event delegation) instead of one per item
list.addEventListener('click', (e) => {
  const li = e.target.closest('li');
  if (!li) return;
  const item = state.items.find((i) => i.id === Number(li.dataset.id));
  item.done = !item.done;
  render();                                              // handlers change state, then call render
});
render();` },
    { lang: 'jsx', check: false, title: 'The same star rating in React (shape only)', code: `import { useState } from 'react';

export function StarRating({ max = 5, value, defaultValue = 0, onChange }) {
  const [inner, setInner] = useState(defaultValue);      // uncontrolled fallback
  const [hover, setHover] = useState(0);
  const current = value ?? inner;                        // controlled if a value prop is given
  const shown = hover || current;

  const choose = (n) => {
    const next = n === current ? 0 : n;
    if (value === undefined) setInner(next);
    onChange?.(next);
  };
  return (
    <div role="radiogroup" aria-label="Rating" onMouseLeave={() => setHover(0)}>
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button key={n} role="radio" aria-checked={n === current} aria-label={n + ' star' + (n > 1 ? 's' : '')}
          onMouseEnter={() => setHover(n)} onClick={() => choose(n)}>
          {n <= shown ? '\\u2605' : '\\u2606'}
        </button>
      ))}
    </div>
  );
}` }
  ],
  viz: [
    {
      title: 'A 90-minute machine-coding round, minute by minute',
      gen: function () {
        var rows = [
          ['0-5', 'Clarify', 'Restate spec; ask scope; write must / nice / skip', 'Agreed scope'],
          ['5-15', 'Design', 'Components, state shape, function names', 'Plan in comments'],
          ['15-55', 'MVP', 'One end-to-end flow works (render, click, update)', '<span class="c-g">Demo-able app</span>'],
          ['55-75', 'Features', 'Nice-to-haves in order of value', 'More features, still working'],
          ['75-85', 'Edge cases', 'Empty, error, rapid clicks, keyboard, a11y', 'Robust app'],
          ['85-90', 'Explain', 'Walk through code; say what you would do next', 'Clear story']
        ];
        var narr = [
          'Minutes 0 to 5: <b>do not code</b>. Restate the problem in your own words and agree on what is in scope. This alone prevents most failures.',
          'Minutes 5 to 15: sketch the <b>component list and the state shape</b>. Ten lines is enough. Name the functions you will write.',
          'Minutes 15 to 55: build a <b>vertical slice</b>: the smallest thing that renders from state and responds to one event. This is the longest phase because it is the most valuable.',
          'Minutes 55 to 75: add the nice-to-have features <b>one at a time</b>. Re-test the main flow after each one so you never break the demo.',
          'Minutes 75 to 85: sweep the edge cases (empty, error, double-click, long text) and quick accessibility wins (labels, focus, keyboard).',
          'Minutes 85 to 90: stop typing. Walk the interviewer through your code and name what you would improve with more time.'
        ];
        var frames = [];
        for (var i = 0; i < rows.length; i++) {
          var hl = {}; hl[i] = 'cur'; for (var j = 0; j < i; j++) hl[j] = 'done';
          frames.push({ narr: narr[i], parts: [{ type: 'table', label: 'Round plan', columns: ['Minutes', 'Phase', 'What you do', 'You have'], rows: rows.slice(0, i + 1), hl: hl }] });
        }
        return frames;
      }
    },
    {
      title: 'Build order for a Kanban board: always keep a working app',
      gen: function () {
        var arr = ['KanbanBoard', 'Column: Todo', 'Column: Done', 'Card', 'AddCardForm', 'Card', 'AddCardForm'];
        var frames = [];
        frames.push(treeFrame('<b>Step 0 (design):</b> this is the final shape. We will <i>not</i> build it all at once. We build from the inside out and keep it runnable.', 'Final tree', arr));
        frames.push(treeFrame('<b>Step 1: static slice.</b> Render one column with two hard-coded cards. Ugly is fine. This proves the setup works.', 'Step 1', arr, { 1: 'cur', 3: 'cur', 0: 'win' }, { 1: 'hard-coded' }));
        frames.push(treeFrame('<b>Step 2: real state.</b> Create <code>state.columns</code> and a <code>render()</code> that draws from it. Columns and cards now come from data, not markup.', 'Step 2', arr, { 0: 'sel', 1: 'done', 3: 'done' }, { 0: 'state + render()' }));
        frames.push(treeFrame('<b>Step 3: add card.</b> The form dispatches <code>addCard(columnId, text)</code>; render again. First interactive feature, still tiny.', 'Step 3', arr, { 4: 'cur', 1: 'done', 3: 'done', 0: 'done' }, { 4: 'addCard' }));
        frames.push(treeFrame('<b>Step 4: second column and move.</b> Add the Done column and a "move right" button on each card. This tests the data model before the hard part.', 'Step 4', arr, { 2: 'cur', 5: 'cur', 6: 'cur', 1: 'done', 3: 'done', 4: 'done', 0: 'done' }, { 5: 'moveCard' }));
        frames.push(treeFrame('<b>Step 5: drag and drop.</b> Replace the buttons with <code>dragstart</code>/<code>dragover</code>/<code>drop</code>. Because the data function <code>moveCard</code> already exists, drop just calls it. Keep the buttons for keyboard users.', 'Step 5', arr, { 3: 'sel', 5: 'sel', 0: 'win' }, { 3: 'draggable', 5: 'draggable' }));
        frames.push(treeFrame('<b>Step 6: polish.</b> Empty column message, Esc cancels the form, keep the data in <code>localStorage</code>, announce moves to screen readers. If time ran out earlier you would still have a working board from step 4.', 'Step 6', arr, { 0: 'ok', 1: 'ok', 2: 'ok', 3: 'ok', 4: 'ok', 5: 'ok', 6: 'ok' }, { 0: 'persist' }));
        return frames;
      }
    }
  ],
  examples: [
    { title: 'The five-minute clarifying script', html: `<p>Say these out loud, write the answers at the top of your file as comments. Example for "build an OTP input":</p>
      ${H.table(['Ask', 'Typical answer', 'What it decides'], [
        ['How many digits?', '6, configurable', 'Props: <code>length</code>'],
        ['Digits only or letters too?', 'Digits only', 'Input filtering, <code>inputmode="numeric"</code>'],
        ['Paste support?', 'Yes', 'Split pasted text across boxes'],
        ['Libraries / framework?', 'React, no UI kit', 'Component structure'],
        ['What happens when all filled?', 'Call <code>onComplete(code)</code>', 'Callback API'],
        ['Mobile?', 'Yes', 'Autofill <code>autocomplete="one-time-code"</code>, large boxes']
      ])}` },
    { title: 'A 30-second edge-case sweep', html: `<p>Before saying "done", run this list in your head against your own demo:</p>
      <ul><li><b>Empty</b>: no data, empty string, zero items. Does it show a friendly message?</li><li><b>Many</b>: 1000 items, very long words, emoji. Does layout hold?</li><li><b>Fast</b>: double-click, spam <kbd>Enter</kbd>. Any duplicate adds or races?</li><li><b>Wrong</b>: invalid input, network error. Does the user see what to do?</li><li><b>Keyboard</b>: Tab order, <kbd>Enter</kbd>/<kbd>Space</kbd>/<kbd>Esc</kbd>. Can you finish the task without a mouse?</li><li><b>Cleanup</b>: timers and listeners removed? State reset on close?</li></ul>
      <p>Mentioning this list aloud, even if you fix only two items, scores well.</p>` },
    { title: 'How to use AI in an "AI allowed" round', html: `<p>If the rules allow AI tools, the grader watches <b>how</b> you use them. A good pattern:</p>
      <ol><li>You write the plan and state shape yourself (2 minutes).</li><li>Ask AI for <i>one</i> well-scoped piece ("write a pure <code>getPageItems</code> function with these rules and 5 test cases").</li><li><b>Read every line</b>, run it, and fix mismatches. Say what you checked.</li><li>Never paste a whole app you cannot explain; you will be asked to change it live.</li></ol>`, code: { lang: 'js', run: true, code: `// Typical AI-generated helper you must REVIEW, not trust. Is this right for edge cases?
function getPageItems(current, total, siblings = 1) {
  const pages = new Set([1, total]);
  for (let p = current - siblings; p <= current + siblings; p++) if (p >= 1 && p <= total) pages.add(p);
  const sorted = [...pages].sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('...');   // gap between kept pages
    out.push(p);
  });
  return out;
}
console.log(getPageItems(1, 10).join(' '));
console.log(getPageItems(5, 10).join(' '));
console.log(getPageItems(10, 10).join(' '));
console.log(getPageItems(1, 1).join(' '));   // review: total = 1 works? yes: set {1}` } }
  ],
  deepDive: `<p><b>🟣 Strategy details that senior candidates show.</b></p>
    <ul>
      <li><b>Vertical slice over horizontal layers.</b> Do not write all the HTML, then all the CSS, then all the JS. Take the thinnest end-to-end path (data → render → one event → state update) and get it working. Every later feature plugs into a path you already trust.</li>
      <li><b>State design is the test.</b> Most bad solutions duplicate state (for example a <code>selectedCard</code> object and also <code>card.selected</code>). Keep one source of truth and <i>derive</i> the rest. Store ids, not copies. In nested data (comments, file trees), update with a recursive function that returns new objects along the path (immutable update) or use an id-to-node map.</li>
      <li><b>Pure logic, thin UI.</b> Put decisions into plain functions (<code>getPageItems</code>, <code>nextTab</code>, <code>moveCard</code>, <code>mergeMessages</code>). They are easy to test, easy to explain, and let you hold a conversation even if the CSS is rough.</li>
      <li><b>Reusable API.</b> Name props the way a library would: <code>value</code>/<code>defaultValue</code>/<code>onChange</code> (controlled and uncontrolled), <code>disabled</code>, <code>max</code>. Do not hard-code ids or global selectors; instances should not interfere.</li>
      <li><b>CSS budget.</b> Spend at most 10 to 15% of the time on styling. Use flexbox, a few CSS variables, and system fonts. Interviewers rarely award points for gradients.</li>
      <li><b>Timers, listeners and async.</b> Clear <code>setTimeout</code>/<code>setInterval</code>, remove event listeners, abort fetches on unmount, guard against setting state after unmount, and handle out-of-order responses (the autocomplete lesson).</li>
      <li><b>Drag and drop reality.</b> Native HTML5 DnD (<code>draggable</code>, <code>dragstart</code>, <code>dragover</code> with <code>preventDefault()</code>, <code>drop</code>) is fine for a demo but has no touch support and poor accessibility. Pointer-events-based dragging or a library (dnd-kit) is the production answer; always provide a keyboard/button alternative to move items.</li>
      <li><b>Performance without over-engineering.</b> Mention memoisation, virtualization and debouncing as follow-ups unless the spec demands them; do not add them up front.</li>
      <li><b>Testing talk.</b> Name 3 test cases per feature (happy, edge, error). If time allows, write one quick unit test for the pure function. That gap between "it worked once" and "I can show it works" is what separates levels.</li>
      <li><b>When you get stuck.</b> Say what you tried, narrow the bug (log state, check the event target), and ask a precise question. Silent struggling for ten minutes is the most expensive habit.</li>
    </ul>
    <p><b>Typical failure modes:</b> over-planning for 30 minutes, building a perfect first feature while nothing else works, a giant component with no structure, copy-pasted code for similar handlers, and not running the app until the last minute. <b>Run the app after every small step.</b></p>`,
  aiEra: `<p><b>🤖 What AI changes.</b> Many companies now run machine-coding rounds in two flavours: <b>no-AI</b> (classic) and <b>AI-assisted</b> (you may use an assistant, and the interviewer watches your prompting, reviewing and debugging). In AI-assisted rounds the spec is often bigger (a small full feature), time is the same, and the grading shifts toward <i>decomposition, verification and explanation</i>. Some interviewers deliberately plant a subtle trap in the spec to see whether you test what the model produced.</p>
    <p><b>Use AI as a partner:</b> practise by giving yourself a prompt from the practice list, building it alone for 45 minutes, then asking an assistant to review for edge cases, accessibility and structure. In an AI-allowed round, delegate boring pieces (CSS reset, mock data, test cases) and keep the architecture, the state shape and the tricky logic in your own hands. Ask for small diffs, not whole files, so you can read them.</p>
    <p><b>Where AI goes wrong:</b> it over-builds (adds Redux and five files for a star rating), invents props or APIs, forgets cleanup and keyboard support, writes code that looks right but fails a boundary case (first/last item, empty list), mixes two styles in one file, and makes confident claims ("this is accessible") that are false.</p>
    <p><b>What you must still own:</b> the plan, the state model, running and testing the result, and a calm explanation of every line you submit. A candidate who says "the model suggested this, I checked these three cases, and I changed this part because ..." beats one who types fast.</p>`,
  problems: []
});

/* ===================== PRACTICE: machine-coding prompts ===================== */

practice.push({
  title: 'Star Rating Component', level: 'Easy', tags: ['machine coding', 'state', 'a11y'], companies: ['Flipkart', 'Swiggy', 'Atlassian'],
  statement: `<p>Build a reusable <code>createStarRating(root, { max, value, onChange })</code>. It shows <code>max</code> stars (default 5). Hovering a star previews that rating; leaving the stars restores the saved rating. Clicking a star saves it and calls <code>onChange(newValue)</code>; clicking the star that is already saved clears the rating to 0. It must work with the keyboard (arrow keys) and expose sensible ARIA roles.</p>`,
  constraints: `<p>1 ≤ max ≤ 10. No libraries. Several star ratings can exist on one page without interfering with each other.</p>`,
  example: `${H.table(['Action', 'Saved value', 'Stars shown'], [['initial', '0', '☆☆☆☆☆'], ['hover 4th star', '0', '★★★★☆ (preview)'], ['click 4th star', '4', '★★★★☆'], ['move mouse away', '4', '★★★★☆'], ['click 4th again', '0', '☆☆☆☆☆']])}<p>Two numbers are needed: the <b>saved</b> value and the temporary <b>hover</b> value. The display is <code>hover || saved</code>.</p>`,
  brute: { why: `<p>One handler per star with its own flag. There is no single "current rating", so hovering one star leaves old colours behind, leaving the group never resets, and clearing is impossible. Duplicate logic in every handler is also easy to break.</p>`, code: `function brokenStars(stars) {
  stars.forEach(function (star, i) {
    star.addEventListener('mouseover', function () { star.classList.add('on'); });   // colours stay on after the mouse leaves
    star.addEventListener('click', function () { for (var k = 0; k <= i; k++) stars[k].classList.add('on'); });
  });
}` },
  mcq: { q: 'Why keep both a saved value and a hover value in state?', options: ['So the preview can change while the saved rating stays intact', 'Because React requires two states', 'To make the component re-render twice', 'It is only needed for touch screens'], answer: 0, explain: 'Hover is temporary. When the mouse leaves you need the saved value to come back, which is impossible if hover overwrote it.' },
  hints: [
    `<p>Hint 1: the aha. The picture is a pure function of two numbers: <code>shown = hover || value</code>. Write one <code>paint()</code> that colours star i if <code>i &lt; shown</code>.</p>`,
    `<p>Hint 2: use event delegation on the root: one <code>mouseover</code>, one <code>mouseleave</code>, one <code>click</code>, one <code>keydown</code>, reading the star number from <code>data-n</code>.</p>`,
    `<p>Hint 3: edge cases. Clicking the saved star toggles to 0. Arrow keys clamp between 0 and max. Use <code>role="radiogroup"</code> and <code>role="radio"</code> with <code>aria-checked</code> and a readable label on each star.</p>`
  ],
  solution: {
    approach: `<p>State is just <code>current</code> and <code>hover</code>. Every event updates one of them and calls <code>paint()</code>, which is the only place that touches the stars. Delegation keeps it to four listeners regardless of <code>max</code>.</p>`,
    code: `function createStarRating(root, options) {
  const opts = Object.assign({ max: 5, value: 0, onChange: function () {} }, options);
  let current = opts.value, hover = 0;
  root.setAttribute('role', 'radiogroup');
  root.setAttribute('aria-label', 'Rating');

  const stars = [];
  for (let n = 1; n <= opts.max; n++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-label', n + (n === 1 ? ' star' : ' stars'));
    b.dataset.n = String(n);
    root.appendChild(b);
    stars.push(b);
  }
  function paint() {
    const shown = hover || current;                          // preview wins while hovering
    stars.forEach(function (b, i) {
      b.textContent = i < shown ? '\\u2605' : '\\u2606';
      b.setAttribute('aria-checked', String(i + 1 === current));
    });
  }
  function set(n) { current = n; paint(); opts.onChange(current); }

  root.addEventListener('mouseover', function (e) { const b = e.target.closest('button'); if (b) { hover = Number(b.dataset.n); paint(); } });
  root.addEventListener('mouseleave', function () { hover = 0; paint(); });
  root.addEventListener('click', function (e) {
    const b = e.target.closest('button');
    if (!b) return;
    const n = Number(b.dataset.n);
    set(n === current ? 0 : n);                              // same star again clears
  });
  root.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); set(Math.min(opts.max, current + 1)); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); set(Math.max(0, current - 1)); }
  });
  paint();
  return { get value() { return current; } };
}`,
    complexity: `<p>Each event does O(max) work in <code>paint</code>; memory is O(max) for the button list. Four listeners total thanks to delegation.</p>`,
    followUps: ['Support half stars.', 'Make it controlled from outside (a value prop).', 'Add a read-only mode that renders fractions such as 3.7 using a clipped overlay.']
  }
});

practice.push({
  title: 'Accessible Tabs', level: 'Easy', tags: ['machine coding', 'a11y', 'keyboard'], companies: ['Atlassian', 'Zoho', 'Razorpay'],
  statement: `<p>Build <code>initTabs(root)</code> for markup with <code>[role=tablist]</code> containing <code>[role=tab]</code> buttons and matching <code>[role=tabpanel]</code> sections. Clicking a tab shows its panel and hides the others. Keyboard: <kbd>←</kbd>/<kbd>→</kbd> move between tabs (wrapping), <kbd>Home</kbd>/<kbd>End</kbd> jump to the first/last, and only the active tab is in the Tab order (roving tabindex). Write the index math as a small pure function.</p>`,
  constraints: `<p>2 ≤ tabs ≤ 12. Works with any number of tab groups on one page. No frameworks.</p>`,
  example: `${H.table(['Key', 'Active tab (of 3) before', 'After'], [['ArrowRight', '2 (last)', '0 (wraps)'], ['ArrowLeft', '0', '2 (wraps)'], ['Home', '1', '0'], ['End', '1', '2']])}<p>Selecting a tab also sets <code>aria-selected="true"</code> on it and <code>tabindex="0"</code>; all the others get <code>tabindex="-1"</code>.</p>`,
  brute: { why: `<p>Toggle CSS classes on click only. Keyboard users cannot arrow between tabs (every tab is a separate Tab stop), screen readers hear no selection state, and the logic is repeated for each tab.</p>`, code: `function tabsBrute(tabs, panels) {
  tabs.forEach(function (tab, i) {
    tab.onclick = function () {
      tabs.forEach(function (t) { t.className = ''; });
      panels.forEach(function (p) { p.style.display = 'none'; });
      tab.className = 'active';
      panels[i].style.display = 'block';           // no aria-selected, no keyboard, every tab is a tab stop
    };
  });
}` },
  mcq: { q: 'What is a "roving tabindex"?', options: ['Only the active item has tabindex 0; the others have -1 and are reached with arrow keys', 'Every item has tabindex 0', 'The tabindex changes every second', 'It makes the tabs scroll horizontally'], answer: 0, explain: 'A composite widget is one Tab stop. Arrow keys move inside it, so keyboard users do not have to Tab through every tab.' },
  hints: [
    `<p>Hint 1: the aha. State is just <code>active</code> (an index). Everything else (aria-selected, tabindex, panel visibility) is derived from it in one <code>select(i)</code> function.</p>`,
    `<p>Hint 2: write <code>nextIndex(current, key, count)</code> as a pure function for ArrowLeft/ArrowRight/Home/End. Then the keydown handler is two lines.</p>`,
    `<p>Hint 3: after changing the active tab by keyboard, also call <code>.focus()</code> on it. Use the <code>hidden</code> attribute for panels so they leave the accessibility tree. Link tab and panel with <code>aria-controls</code> and <code>aria-labelledby</code>.</p>`
  ],
  solution: {
    approach: `<p>One <code>select(i)</code> sets all derived attributes. A pure <code>nextIndex</code> handles wrapping and Home/End. Click calls <code>select</code>; keydown calls <code>nextIndex</code> then <code>select</code> and focus.</p>`,
    code: `function nextIndex(current, key, count) {
  if (key === 'ArrowRight') return (current + 1) % count;
  if (key === 'ArrowLeft') return (current - 1 + count) % count;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return current;
}

function initTabs(root) {
  const tabs = Array.from(root.querySelectorAll('[role="tab"]'));
  const panels = Array.from(root.querySelectorAll('[role="tabpanel"]'));
  function select(i, moveFocus) {
    tabs.forEach(function (tab, k) {
      const on = k === i;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;                      // roving tabindex
      panels[k].hidden = !on;
    });
    if (moveFocus) tabs[i].focus();
  }
  root.querySelector('[role="tablist"]').addEventListener('click', function (e) {
    const i = tabs.indexOf(e.target.closest('[role="tab"]'));
    if (i >= 0) select(i, false);
  });
  root.querySelector('[role="tablist"]').addEventListener('keydown', function (e) {
    const current = tabs.indexOf(document.activeElement);
    if (current < 0) return;
    const next = nextIndex(current, e.key, tabs.length);
    if (next !== current || e.key === 'Home' || e.key === 'End') { e.preventDefault(); select(next, true); }
  });
  select(0, false);
}`,
    complexity: `<p>Each selection is O(T) for T tabs; memory O(T). The index maths is O(1).</p>`,
    followUps: ['Add manual activation mode (arrows move focus, Enter/Space selects).', 'Lazy-render panel content only when first shown.', 'Sync the active tab with the URL hash.']
  }
});

practice.push({
  title: 'Modal Dialog with Focus Trap', level: 'Easy', tags: ['machine coding', 'a11y', 'focus'], companies: ['Uber', 'Swiggy', 'Zomato'],
  statement: `<p>Build <code>openModal({ title, bodyText, onClose })</code> that shows a dialog over a dark overlay. Requirements: <kbd>Esc</kbd> closes it; clicking the overlay (not the dialog itself) closes it; focus moves into the dialog on open, <kbd>Tab</kbd> and <kbd>Shift+Tab</kbd> cycle only inside the dialog, and focus returns to the element that opened it on close. The page behind must not scroll while the modal is open.</p>`,
  constraints: `<p>No libraries. Only one modal at a time. Clean up all listeners on close. Use <code>role="dialog"</code>, <code>aria-modal="true"</code> and a labelled title.</p>`,
  example: `${H.table(['Step', 'What happens'], [['click "Delete" button', 'modal opens; focus is on the first control inside'], ['press Tab on the last button', 'focus wraps to the first control, not to the page behind'], ['press Esc', 'modal closes; focus returns to the "Delete" button'], ['click dark overlay', 'closes; clicking inside the dialog does not']])}<p>The trap is just two checks in a keydown handler: Tab on the last element goes to the first, Shift+Tab on the first goes to the last.</p>`,
  brute: { why: `<p>Show a <code>div</code> with <code>display: block</code> and a Close button. Keyboard users can Tab out into the page behind, screen readers still read the background, Esc does nothing, and focus is lost after closing (it jumps to the top of the page).</p>`, code: `function modalBrute(text) {
  const box = document.createElement('div');
  box.className = 'modal';
  box.innerHTML = '<p>' + text + '</p><button>Close</button>';        // also an XSS risk with innerHTML
  box.querySelector('button').onclick = function () { box.remove(); };
  document.body.appendChild(box);
}` },
  mcq: { q: 'What should you do with focus when the modal closes?', options: ['Return it to the element that opened the modal', 'Leave it on the removed element', 'Move it to the top of the page', 'Blur everything'], answer: 0, explain: 'The user was working at that control. Returning focus lets keyboard and screen-reader users continue where they left off.' },
  hints: [
    `<p>Hint 1: the aha. Opening and closing are mirror images. Save <code>document.activeElement</code> before opening; restore it on close. Remove every listener you added.</p>`,
    `<p>Hint 2: build the DOM with <code>createElement</code> and <code>textContent</code>. Find focusable elements with <code>querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')</code>.</p>`,
    `<p>Hint 3: in the keydown handler: Esc closes; Tab on the last focusable goes to the first, Shift+Tab on the first goes to the last (call <code>preventDefault</code>). Lock page scroll with <code>document.body.style.overflow = 'hidden'</code> and restore the old value.</p>`
  ],
  solution: {
    approach: `<p>Create overlay and dialog, move focus in, and listen on <code>document</code> for keydown to trap Tab and handle Esc. A single <code>close()</code> function removes the DOM and the listener, restores scroll and focus, and calls <code>onClose</code>.</p>`,
    code: `let activeModal = null;

function openModal(options) {
  if (activeModal) return;                                      // one at a time
  const opener = document.activeElement;
  const prevOverflow = document.body.style.overflow;

  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  const dialog = document.createElement('div');
  dialog.className = 'dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'modal-title');
  const h = document.createElement('h2');
  h.id = 'modal-title';
  h.textContent = options.title;                                // textContent, never innerHTML
  const p = document.createElement('p');
  p.textContent = options.bodyText;
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.textContent = 'Close';
  dialog.append(h, p, closeBtn);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';                      // lock background scroll

  const focusables = function () {
    return Array.from(dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'));
  };

  function onKey(e) {
    if (e.key === 'Escape') { close(); return; }
    if (e.key !== 'Tab') return;
    const items = focusables();
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function close() {
    document.removeEventListener('keydown', onKey);
    overlay.remove();
    document.body.style.overflow = prevOverflow;
    activeModal = null;
    if (opener && opener.focus) opener.focus();                 // give focus back
    if (options.onClose) options.onClose();
  }
  overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });   // only the dark area
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  activeModal = { close };
  focusables()[0].focus();
}`,
    complexity: `<p>Opening and closing are O(F) in the number of focusable elements; each key press does O(F) work to find the first and last. Memory O(1) beyond the DOM.</p>`,
    followUps: ['Use the native &lt;dialog&gt; element with showModal() and compare what you get for free.', 'Support stacked modals.', 'Animate in and out without breaking focus handling.']
  }
});

practice.push({
  title: 'Pagination Page List', level: 'Easy', tags: ['machine coding', 'pure function', 'edge cases'], companies: ['Amazon', 'Myntra', 'Walmart'],
  statement: `<p>Write <code>getPageItems(current, total, siblings = 1)</code> that returns the items a pagination bar should show: always the first and last page, the current page with <code>siblings</code> neighbours on each side, and <code>'...'</code> where pages are skipped. Never show a "..." for a gap of exactly one page (show that page instead). Then explain how the Prev/Next buttons use it.</p>`,
  constraints: `<p>1 ≤ total ≤ 10<sup>6</sup>; 1 ≤ current ≤ total. Output length must stay small (at most 2·siblings + 5 items), regardless of total.</p>`,
  example: `${H.table(['current, total', 'result'], [['1, 10', '1 2 ... 10'], ['5, 10', '1 ... 4 5 6 ... 10'], ['3, 10', '1 2 3 4 ... 10'], ['10, 10', '1 ... 9 10'], ['1, 3', '1 2 3']])}<p>For 3 of 10 the kept pages are 1, 2, 3, 4 and 10, so nothing is skipped on the left and there is no "..." there; only the big gap before 10 gets one.</p>`,
  brute: { why: `<p>Render a button for every page. With 1,000,000 pages the DOM would hold a million nodes and the bar overflows the screen. The wasted work is rendering buttons nobody can see or click.</p>`, code: `function allPages(total) {
  const out = [];
  for (let p = 1; p <= total; p++) out.push(p);        // a million items for a big result set
  return out;
}` },
  mcq: { q: 'With current = 5, total = 10, siblings = 1, which list is correct?', options: ['1 ... 4 5 6 ... 10', '1 2 3 4 5 6 7 8 9 10', '1 4 5 6 10', '5 6 7 8 9 10'], answer: 0, explain: 'Keep first, last, and current ± 1; gaps larger than one page get an ellipsis.' },
  hints: [
    `<p>Hint 1: the aha. Decide <b>which page numbers to keep</b> first (first, last, and the window around current), then insert ellipses between the kept numbers.</p>`,
    `<p>Hint 2: put kept numbers in a Set, sort them, and walk the sorted list: if the difference between two neighbours is exactly 2, insert the missing number; if greater than 2, insert <code>'...'</code>.</p>`,
    `<p>Hint 3: clamp the window to 1..total so you never output page 0 or total+1. Total of 1 returns just <code>[1]</code>.</p>`
  ],
  solution: {
    approach: `<p>Collect the pages to keep in a Set, sort, then build the output while checking the gap to the previous kept page: a gap of 2 means exactly one page is missing (show it), a bigger gap becomes an ellipsis.</p>`,
    code: { lang: 'js', run: true, code: `function getPageItems(current, total, siblings = 1) {
  const keep = new Set([1, total]);
  for (let p = current - siblings; p <= current + siblings; p++) {
    if (p >= 1 && p <= total) keep.add(p);
  }
  const sorted = [...keep].sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0) {
      const gap = sorted[i] - sorted[i - 1];
      if (gap === 2) out.push(sorted[i] - 1);          // only one page hidden: show it instead of "..."
      else if (gap > 2) out.push('...');
    }
    out.push(sorted[i]);
  }
  return out;
}
const show = (c, t) => console.log(c + '/' + t + ' -> ' + getPageItems(c, t).join(' '));
show(1, 10); show(5, 10); show(3, 10); show(10, 10); show(1, 3); show(1, 1); show(500000, 1000000);` },
    complexity: `<p>Time O(S log S) with S ≤ 2·siblings + 3 kept pages, effectively O(1); space O(S). It does not depend on <code>total</code>.</p>`,
    followUps: ['Add Prev/Next buttons that disable at the ends.', 'Keep the page in the URL query string and support Back.', 'Show a fixed number of slots so the bar does not change width as you navigate.']
  }
});

practice.push({
  title: 'OTP Input', level: 'Medium', tags: ['machine coding', 'forms', 'events'], companies: ['Paytm', 'PhonePe', 'Razorpay'],
  statement: `<p>Build <code>createOtp(root, { length, onComplete })</code> with <code>length</code> single-digit boxes. Typing a digit fills the box and moves focus to the next. Backspace on an empty box moves to the previous box and clears it. Non-digits are ignored. Pasting a code (e.g. "123456") fills all boxes from the focused one. When every box is filled call <code>onComplete(code)</code> once. Arrow keys move between boxes.</p>`,
  constraints: `<p>1 ≤ length ≤ 8. Digits only. Must work for mobile autofill (<code>autocomplete="one-time-code"</code>, <code>inputmode="numeric"</code>). No libraries.</p>`,
  example: `${H.table(['Action', 'Boxes', 'Focus on'], [['type 4', '4 _ _ _', 'box 2'], ['type a (letter)', '4 _ _ _', 'box 2 (ignored)'], ['type 7, then Backspace twice', '_ _ _ _', 'box 1'], ['paste 1234 in box 1', '1 2 3 4', 'after last: onComplete("1234")']])}<p>Backspace on a <i>filled</i> box clears it and stays; Backspace on an <i>empty</i> box moves back and clears the previous one.</p>`,
  brute: { why: `<p>A single text input styled to look like boxes. It cannot highlight the active digit, cursor movement and selection become confusing, and screen readers read it as one field. A naive multi-box version listens to <code>keyup</code> only, which misses paste, autofill and mobile keyboards.</p>`, code: `function otpBrute(inputs) {
  inputs.forEach(function (input, i) {
    input.onkeyup = function () {
      if (input.value && inputs[i + 1]) inputs[i + 1].focus();     // misses paste, Backspace logic, non-digits
    };
  });
}` },
  mcq: { q: 'Which event is the most reliable for reading what the user entered in each box (including mobile and paste)?', options: ['input', 'keyup', 'keypress', 'mousedown'], answer: 0, explain: 'The input event fires for every way the value can change (typing, paste, autofill, IME). keyup/keypress miss several of those.' },
  hints: [
    `<p>Hint 1: the aha. Keep the state in one array of N characters; boxes are just a view. Write <code>setAt(i, ch)</code> and <code>focusAt(i)</code> helpers so every event handler is short.</p>`,
    `<p>Hint 2: handle <code>input</code> (take the last digit typed, strip non-digits, advance), <code>keydown</code> for Backspace/arrows, and <code>paste</code> (read the clipboard text, keep digits, fill from the current box).</p>`,
    `<p>Hint 3: edge cases. Pasting more digits than remaining boxes must truncate. Call <code>onComplete</code> only when all N are filled, and again only if the user changes and re-completes. Select the content on focus so typing replaces it.</p>`
  ],
  solution: {
    approach: `<p>An array holds the digits. Each box delegates to small helpers. <code>input</code> normalises to a single digit; Backspace moves back when empty; paste distributes digits. A <code>checkComplete()</code> runs after every change.</p>`,
    code: `function createOtp(root, options) {
  const length = options.length || 6;
  const digits = new Array(length).fill('');
  const boxes = [];
  let completedCode = null;

  for (let i = 0; i < length; i++) {
    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'numeric';
    input.autocomplete = 'one-time-code';
    input.maxLength = 1;
    input.setAttribute('aria-label', 'Digit ' + (i + 1) + ' of ' + length);
    input.dataset.i = String(i);
    root.appendChild(input);
    boxes.push(input);
  }
  function focusAt(i) { if (i >= 0 && i < length) { boxes[i].focus(); boxes[i].select(); } }
  function setAt(i, ch) { digits[i] = ch; boxes[i].value = ch; }
  function checkComplete() {
    const code = digits.join('');
    if (code.length === length && code !== completedCode) { completedCode = code; options.onComplete(code); }
    if (code.length < length) completedCode = null;
  }

  root.addEventListener('input', function (e) {
    const i = Number(e.target.dataset.i);
    const ch = e.target.value.replace(/\\D/g, '').slice(-1);       // keep only the last digit typed
    setAt(i, ch);
    if (ch) focusAt(i + 1);
    checkComplete();
  });
  root.addEventListener('keydown', function (e) {
    const i = Number(e.target.dataset.i);
    if (e.key === 'Backspace' && !digits[i]) { e.preventDefault(); setAt(Math.max(0, i - 1), ''); focusAt(i - 1); checkComplete(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); focusAt(i - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); focusAt(i + 1); }
  });
  root.addEventListener('paste', function (e) {
    e.preventDefault();
    const text = (e.clipboardData.getData('text') || '').replace(/\\D/g, '');
    let i = Number(e.target.dataset.i);
    for (const ch of text) { if (i >= length) break; setAt(i, ch); i++; }
    focusAt(Math.min(i, length - 1));
    checkComplete();
  });
  focusAt(0);
}`,
    complexity: `<p>O(1) per keystroke; paste is O(L) for the pasted length (bounded by the box count). Memory O(N).</p>`,
    followUps: ['Auto-submit and show an error state with shake animation.', 'Add a resend timer.', 'Make it work in React as a controlled component.']
  }
});

practice.push({
  title: 'Progress Bar Queue', level: 'Medium', tags: ['machine coding', 'queue', 'concurrency'], companies: ['Flipkart', 'Atlassian', 'Uber'],
  statement: `<p>A page has an "Add bar" button. Each click adds a progress bar that fills from 0 to 100% over 2 seconds. At most <code>limit</code> bars (default 3) may fill at the same time; extra bars wait in a queue and start as soon as a slot frees. Implement the scheduling core as a reusable <code>TaskQueue(limit)</code> where a task is a function returning a promise, then connect it to the bars.</p>`,
  constraints: `<p>Clicks can arrive faster than bars finish (hundreds). Order is first come, first served. A task failure must free its slot. Use CSS transitions (not a 60 fps JS loop) for the fill animation.</p>`,
  example: `${H.table(['Click #', 'limit = 2', 'What happens'], [['1', 'starts immediately', 'running 1'], ['2', 'starts immediately', 'running 1, 2'], ['3', 'waits', 'queued 3'], ['bar 1 finishes', '', 'bar 3 starts automatically']])}<p>Rule: when a task finishes (success or failure), take the next waiting task, if any.</p>`,
  brute: { why: `<p>Start every bar the moment its click happens. 100 clicks start 100 simultaneous animations, which is wasteful and ignores the "at most 3" requirement. Or poll with <code>setInterval</code> to check whether a slot is free: it wastes CPU and adds delay.</p>`, code: `function addBarBrute(container) {
  const bar = document.createElement('div');
  container.appendChild(bar);
  bar.style.transition = 'width 2s linear';
  requestAnimationFrame(function () { bar.style.width = '100%'; });   // no limit at all
}` },
  mcq: { q: 'When a running task finishes, what should the queue do?', options: ['Immediately start the next waiting task (if any)', 'Wait for the user to click again', 'Restart the finished task', 'Clear the whole queue'], answer: 0, explain: 'The queue is event driven: a finished task frees a slot, so the scheduler pulls the next waiting task. No polling is needed.' },
  hints: [
    `<p>Hint 1: the aha. This is a concurrency limiter: a counter <code>running</code> and an array <code>waiting</code>. Two operations: <code>add</code> and "a task finished".</p>`,
    `<p>Hint 2: <code>add(task)</code> pushes and calls <code>next()</code>. <code>next()</code> starts tasks while <code>running &lt; limit</code> and <code>waiting</code> is not empty. Each started task calls <code>next()</code> again in a <code>finally</code>.</p>`,
    `<p>Hint 3: the bar task: create the div, force a reflow (or use rAF), set width 100% with a CSS transition, and resolve on <code>transitionend</code>. Always decrement <code>running</code> in <code>finally</code>, even on errors.</p>`
  ],
  solution: {
    approach: `<p><code>TaskQueue</code> holds <code>running</code> and a FIFO list. Starting a task increments <code>running</code>; its <code>finally</code> decrements and calls <code>next</code>. Bars are just tasks that resolve when their CSS transition ends.</p>`,
    code: { lang: 'js', run: true, code: `class TaskQueue {
  constructor(limit) { this.limit = limit; this.running = 0; this.waiting = []; }
  add(task) { this.waiting.push(task); this.next(); }
  next() {
    while (this.running < this.limit && this.waiting.length) {
      const task = this.waiting.shift();                    // first come, first served
      this.running++;
      Promise.resolve()
        .then(task)
        .catch(() => {})                                    // a failing task must not block the queue
        .finally(() => { this.running--; this.next(); });   // free the slot, start the next one
    }
  }
}

// demo: five "bars" of 60 ms each, at most 2 at a time
const q = new TaskQueue(2);
const makeBar = (id) => () => {
  console.log('start bar ' + id + ' (running now: ' + q.running + ')');
  return new Promise((resolve) => setTimeout(() => { console.log('done  bar ' + id); resolve(); }, 60));
};
for (let id = 1; id <= 5; id++) q.add(makeBar(id));
setTimeout(() => console.log('drained: running=' + q.running + ', waiting=' + q.waiting.length), 400);` },
    complexity: `<p>O(1) per add and per completion (using an index or a real queue instead of <code>shift</code> if the list is huge). No polling, no timers except the tasks themselves.</p>`,
    followUps: ['Add pause/resume and cancel for individual bars.', 'Give some bars higher priority.', 'Show "queued" vs "running" labels.']
  }
});

practice.push({
  title: 'Nested Comments (Add, Delete, Collapse)', level: 'Medium', tags: ['machine coding', 'tree', 'immutable updates', 'recursion'], companies: ['Meta', 'Reddit', 'Atlassian'],
  statement: `<p>Comments form a tree: each comment has <code>id</code>, <code>text</code>, and <code>replies</code> (an array of comments). Write pure functions <code>addReply(tree, parentId, comment)</code>, <code>removeComment(tree, id)</code> (removes the whole subtree) and <code>countAll(tree)</code>. They must not mutate the input (so that React can see the change by reference). A parentId of <code>null</code> adds a top-level comment. Then say how the recursive component and the "collapsed" set work.</p>`,
  constraints: `<p>Up to 10<sup>4</sup> comments, depth up to 100. Unchanged branches must keep the same object reference (structural sharing). Unknown ids leave the tree unchanged.</p>`,
  example: `${H.table(['Operation', 'Tree before', 'After'], [['addReply(t, "c1", {id:"c3"})', 'c1 → [c2]', 'c1 → [c2, c3]'], ['removeComment(t, "c1")', 'c1 → [c2], c4', 'c4 only (c1 and c2 gone)'], ['countAll(t)', 'c1 → [c2], c4', '3']])}<p>Only the nodes on the path from the root to the changed comment are copied; siblings keep their old references.</p>`,
  brute: { why: `<p>Deep-clone the entire tree with <code>JSON.parse(JSON.stringify(...))</code> on every change and then mutate the copy. That is O(N) per operation, creates new references for every node (so every comment component re-renders), and loses things such as <code>undefined</code> values.</p>`, code: `function addReplyBrute(tree, parentId, comment) {
  const copy = JSON.parse(JSON.stringify(tree));          // O(N) clone, every node gets a new identity
  (function walk(list) {
    for (const c of list) {
      if (c.id === parentId) c.replies.push(comment);
      walk(c.replies);
    }
  })(copy);
  return copy;
}` },
  mcq: { q: 'What is "structural sharing" in an immutable tree update?', options: ['Only nodes on the path to the change are copied; the rest are reused', 'Every node is copied', 'The tree is stored in localStorage', 'Two users share the same tree object'], answer: 0, explain: 'Reusing untouched subtrees keeps updates cheap and lets memoised components skip re-rendering because their props are the same references.' },
  hints: [
    `<p>Hint 1: the aha. A tree update is a recursive <code>map</code> that returns a new node only if something below it changed, otherwise the same node.</p>`,
    `<p>Hint 2: write a helper that maps over a list. For <code>addReply</code>: if <code>c.id === parentId</code> return <code>{ ...c, replies: [...c.replies, comment] }</code>; else recurse into replies and copy only if the result differs.</p>`,
    `<p>Hint 3: for remove, filter out the id at each level, then recurse into survivors. Compare results by reference so unchanged branches are returned as-is. Handle <code>parentId === null</code> as "append to the top-level array".</p>`
  ],
  solution: {
    approach: `<p>Each function walks the tree and rebuilds only the spine to the changed node. Reference equality of the child list tells us whether anything changed, so unaffected siblings are shared with the old tree.</p>`,
    code: { lang: 'js', run: true, code: `function addReply(tree, parentId, comment) {
  if (parentId === null) return [...tree, { ...comment, replies: comment.replies || [] }];
  let changed = false;
  const next = tree.map((c) => {
    if (c.id === parentId) { changed = true; return { ...c, replies: [...c.replies, { ...comment, replies: comment.replies || [] }] }; }
    const replies = addReply(c.replies, parentId, comment);
    if (replies !== c.replies) { changed = true; return { ...c, replies }; }    // a descendant changed: copy this node
    return c;                                                                   // untouched: reuse the same object
  });
  return changed ? next : tree;
}
function removeComment(tree, id) {
  let changed = false;
  const next = [];
  for (const c of tree) {
    if (c.id === id) { changed = true; continue; }          // drop the whole subtree
    const replies = removeComment(c.replies, id);
    if (replies !== c.replies) { changed = true; next.push({ ...c, replies }); } else next.push(c);
  }
  return changed ? next : tree;
}
const countAll = (tree) => tree.reduce((sum, c) => sum + 1 + countAll(c.replies), 0);

const t0 = [{ id: 'c1', text: 'hi', replies: [{ id: 'c2', text: 'yo', replies: [] }] }, { id: 'c4', text: 'other', replies: [] }];
const t1 = addReply(t0, 'c1', { id: 'c3', text: 'hey' });
const t2 = removeComment(t1, 'c2');
console.log('count:', countAll(t0), countAll(t1), countAll(t2));
console.log('sibling c4 shared after add:', t1[1] === t0[1]);
console.log('unknown id returns same tree:', addReply(t0, 'zzz', { id: 'x', text: '' }) === t0);` },
    complexity: `<p>O(N) time in the worst case (unknown id walks everything) but only O(depth) new objects are allocated for a hit. A Map from id to node makes lookups O(1) if you also store a parent pointer or normalised ids.</p>`,
    followUps: ['Store comments normalised (byId + childIds) and compare costs.', 'Collapse a thread by keeping a Set of collapsed ids in UI state.', 'Add "load more replies" with lazy-loaded children.']
  }
});

practice.push({
  title: 'File Explorer Tree', level: 'Medium', tags: ['machine coding', 'tree', 'recursion'], companies: ['Microsoft', 'Atlassian', 'Uber'],
  statement: `<p>Folders contain files and folders: <code>{ id, name, type: 'file' | 'folder', children? }</code>. Build the logic of a file explorer: <code>flatten(tree, expanded)</code> returns the visible rows in order (each with <code>id, name, depth, type, isOpen</code>) given a Set of expanded folder ids, and <code>renameNode(tree, id, newName)</code> returns a new tree without mutating the old one. Rows from <code>flatten</code> can feed a list or a virtual list directly.</p>`,
  constraints: `<p>Up to 10<sup>5</sup> nodes, depth up to 50. Collapsed folders hide their whole subtree. Do not use recursion deeper than the tree depth.</p>`,
  example: `${H.table(['expanded', 'visible rows'], [['{}', 'src (folder)'], ['{src}', 'src, app.js, lib (folder)'], ['{src, lib}', 'src, app.js, lib, util.js']])}<p>Indentation comes from <code>depth</code>; the open/closed arrow comes from <code>isOpen</code>.</p>`,
  brute: { why: `<p>Render every node recursively and hide collapsed ones with CSS. All N nodes exist in the DOM even when most are hidden, so a big repo freezes the page.</p>`, code: `function renderAll(node, depth, out) {
  out.push({ name: node.name, depth: depth, hidden: false });
  (node.children || []).forEach(function (c) { renderAll(c, depth + 1, out); });   // visits collapsed folders too
  return out;
}` },
  mcq: { q: 'Why store expanded folders as a Set of ids outside the tree?', options: ['UI state stays separate from data, so toggling does not copy the tree', 'Sets are faster to render', 'The tree cannot have flags', 'It prevents renaming'], answer: 0, explain: 'Expanded/collapsed is UI state. Keeping it separate means toggling touches one small Set, not the data.' },
  hints: [
    `<p>Hint 1: the aha. Walk the tree depth-first, but only go into a folder's children if its id is in the expanded Set.</p>`,
    `<p>Hint 2: use an explicit stack of <code>[node, depth]</code>, pushing children in reverse so they pop in order.</p>`,
    `<p>Hint 3: for rename, copy only the nodes on the path to the target and reuse the others, like in the comments problem.</p>`
  ],
  solution: {
    approach: `<p>An iterative DFS with a stack emits rows and descends only into expanded folders. Rename is a recursive path-copy.</p>`,
    code: { lang: 'js', run: true, code: `function flatten(root, expanded) {
  const rows = [];
  const stack = [[root, 0]];
  while (stack.length) {
    const [node, depth] = stack.pop();
    const isOpen = node.type === 'folder' && expanded.has(node.id);
    rows.push({ id: node.id, name: node.name, depth, type: node.type, isOpen });
    if (isOpen) for (let i = node.children.length - 1; i >= 0; i--) stack.push([node.children[i], depth + 1]);   // reverse keeps order
  }
  return rows;
}
function renameNode(node, id, newName) {
  if (node.id === id) return { ...node, name: newName };
  if (!node.children) return node;
  let changed = false;
  const children = node.children.map((c) => { const n = renameNode(c, id, newName); if (n !== c) changed = true; return n; });
  return changed ? { ...node, children } : node;
}
const tree = { id: 'src', name: 'src', type: 'folder', children: [
  { id: 'app', name: 'app.js', type: 'file' },
  { id: 'lib', name: 'lib', type: 'folder', children: [{ id: 'util', name: 'util.js', type: 'file' }] }] };
const show = (t, e) => flatten(t, new Set(e)).map((r) => '  '.repeat(r.depth) + (r.type === 'folder' ? (r.isOpen ? '- ' : '+ ') : '  ') + r.name).join('\\n');
console.log(show(tree, []));
console.log(show(tree, ['src', 'lib']));
console.log(show(renameNode(tree, 'util', 'helpers.js'), ['src', 'lib']));` },
    complexity: `<p>flatten is O(V) for the visible rows V (collapsed subtrees cost nothing). Rename is O(N) to find, O(depth) allocations.</p>`,
    followUps: ['Add delete and new-file operations.', 'Keyboard navigation with arrow keys (tree role).', 'Lazy-load children when a folder is first opened.']
  }
});

practice.push({
  title: 'Toast Notification Manager', level: 'Medium', tags: ['machine coding', 'timers', 'queue'], companies: ['Swiggy', 'Razorpay', 'Zomato'],
  statement: `<p>Write a <code>ToastManager({ maxVisible, onChange })</code>. <code>show(message, ttl)</code> adds a toast; at most <code>maxVisible</code> are visible, the rest wait in a queue. Each visible toast disappears after <code>ttl</code> ms. <code>pause(id)</code> / <code>resume(id)</code> stop and restart its countdown with the remaining time (for hover). <code>dismiss(id)</code> removes it immediately and lets a waiting one in. <code>onChange(visibleList)</code> is called after every change.</p>`,
  constraints: `<p>Up to 10<sup>3</sup> toasts per second in the worst case. Timers must be cleared on dismiss so nothing fires late.</p>`,
  example: `${H.table(['Call', 'visible (max 2)', 'waiting'], [['show A, B, C', 'A, B', 'C'], ['A expires', 'B, C', '-'], ['dismiss B', 'C', '-']])}<p>Pause remembers <code>remaining = ttl - elapsed</code>; resume starts a new timer with that remaining time.</p>`,
  brute: { why: `<p>Append every toast to the DOM at once with one <code>setTimeout</code> each. Fifty errors cover the screen, and hovering cannot pause because the timer is gone and the remaining time was never stored.</p>`, code: `function toastBrute(container, msg) {
  const el = document.createElement('div');
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(function () { el.remove(); }, 3000);   // no limit, no pause, no cleanup on early dismiss
}` },
  mcq: { q: 'What must you store to support pause/resume correctly?', options: ['The remaining time and the timer start time', 'Only the toast text', 'Nothing, restart from the full ttl', 'The DOM element'], answer: 0, explain: 'On pause compute remaining = remaining - (now - startedAt); on resume start a timer for exactly that remaining time.' },
  hints: [
    `<p>Hint 1: the aha. Two lists: <code>visible</code> and <code>queue</code>. After any change call <code>fill()</code> to promote queued toasts while there is room.</p>`,
    `<p>Hint 2: a toast object holds <code>{ id, message, remaining, startedAt, timer }</code>. Starting a toast sets the timer and <code>startedAt</code>.</p>`,
    `<p>Hint 3: always <code>clearTimeout</code> on pause, dismiss and expiry. Only start the countdown when a toast becomes visible, not when it is queued.</p>`
  ],
  solution: {
    approach: `<p>Visible and queued lists plus per-toast timer bookkeeping. Every mutation ends with <code>fill()</code> and a notification.</p>`,
    code: { lang: 'js', run: true, code: `class ToastManager {
  constructor({ maxVisible = 3, onChange = () => {} } = {}) { this.max = maxVisible; this.onChange = onChange; this.visible = []; this.queue = []; this.nextId = 1; }
  show(message, ttl = 3000) { const t = { id: this.nextId++, message, remaining: ttl, startedAt: 0, timer: null }; this.queue.push(t); this.fill(); return t.id; }
  fill() {
    while (this.visible.length < this.max && this.queue.length) { const t = this.queue.shift(); this.visible.push(t); this.start(t); }
    this.onChange(this.visible.map((t) => t.message));
  }
  start(t) { t.startedAt = Date.now(); t.timer = setTimeout(() => this.dismiss(t.id), t.remaining); }
  find(id) { return this.visible.find((t) => t.id === id); }
  pause(id) { const t = this.find(id); if (!t || !t.timer) return; clearTimeout(t.timer); t.timer = null; t.remaining -= Date.now() - t.startedAt; }
  resume(id) { const t = this.find(id); if (t && !t.timer) this.start(t); }
  dismiss(id) {
    const t = this.find(id);
    if (!t) { this.queue = this.queue.filter((q) => q.id !== id); return; }
    clearTimeout(t.timer);
    this.visible = this.visible.filter((v) => v.id !== id);
    this.fill();
  }
}
const m = new ToastManager({ maxVisible: 2, onChange: (v) => console.log('visible:', v.join(', ') || '(none)') });
const a = m.show('A', 60); m.show('B', 200); m.show('C', 60);
m.pause(a);
setTimeout(() => m.resume(a), 100);
setTimeout(() => m.dismiss(2), 250);` },
    complexity: `<p>O(maxVisible) per operation for lookups; O(1) amortised queue handling. At most maxVisible timers exist.</p>`,
    followUps: ['Add types (error, success) with different ttl.', 'Announce toasts with aria-live.', 'Deduplicate identical messages.']
  }
});

practice.push({
  title: 'Undo / Redo History', level: 'Medium', tags: ['machine coding', 'stack', 'state'], companies: ['Google', 'Adobe', 'Figma'],
  statement: `<p>Implement <code>createHistory(initial, limit)</code> with <code>push(state)</code>, <code>undo()</code>, <code>redo()</code>, <code>canUndo()</code>, <code>canRedo()</code> and <code>current()</code>. Pushing a new state after undoing discards the redo branch. History keeps at most <code>limit</code> past states (oldest dropped first). Pushing a state equal (by reference) to the current one does nothing.</p>`,
  constraints: `<p>States are immutable values. 1 ≤ limit ≤ 10<sup>4</sup>. All operations should be O(1) amortised.</p>`,
  example: `${H.table(['Call', 'past | present | future'], [['init "a"', '[] | a | []'], ['push b, push c', '[a,b] | c | []'], ['undo', '[a] | b | [c]'], ['push d', '[a,b] | d | []  (c discarded)']])}`,
  brute: { why: `<p>Store a full copy of the whole app state in an array and a pointer; copying and splicing on every keystroke is O(N) and memory heavy. Forgetting to truncate the future leaves a confusing "redo" after a new edit.</p>`, code: `function historyBrute() {
  let list = [], i = -1;
  return {
    push: function (s) { list = list.slice(0, i + 1).concat([JSON.parse(JSON.stringify(s))]); i++; },   // deep copy every time
    undo: function () { if (i > 0) i--; return list[i]; }
  };
}` },
  mcq: { q: 'After undo, the user types a new edit. What happens to the redo stack?', options: ['It is cleared', 'It is kept', 'It is moved to past', 'It is reversed'], answer: 0, explain: 'The new edit starts a new timeline. Keeping the old future would make redo jump to a state unrelated to the new edit.' },
  hints: [
    `<p>Hint 1: the aha. Three parts: <code>past</code> (array), <code>present</code> (value), <code>future</code> (array).</p>`,
    `<p>Hint 2: push moves present to past, sets the new present, empties future. Undo moves present to the front of future and pops past into present.</p>`,
    `<p>Hint 3: trim past to <code>limit</code> with <code>shift()</code> after push. Ignore a push equal to present.</p>`
  ],
  solution: {
    approach: `<p>The classic past/present/future triple. Immutable states are stored by reference, so snapshots cost almost nothing.</p>`,
    code: { lang: 'js', run: true, code: `function createHistory(initial, limit = 100) {
  let past = [], present = initial, future = [];
  return {
    current: () => present,
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
    push(state) {
      if (state === present) return;
      past.push(present);
      if (past.length > limit) past.shift();      // drop the oldest
      present = state;
      future = [];                                 // new timeline: redo is gone
    },
    undo() { if (!past.length) return present; future.push(present); present = past.pop(); return present; },
    redo() { if (!future.length) return present; past.push(present); present = future.pop(); return present; }
  };
}
const h = createHistory('a', 3);
h.push('b'); h.push('c');
console.log(h.undo(), h.undo(), h.redo());   // b a b
h.push('d');
console.log(h.current(), h.canRedo());       // d false
h.push('e'); h.push('f'); h.push('g');
console.log(h.undo(), h.undo(), h.undo(), h.canUndo());   // limit 3 keeps only three steps back` },
    complexity: `<p>All operations are O(1) except <code>shift</code> which is O(limit) on arrays (use a ring buffer for strict O(1)). Memory O(limit).</p>`,
    followUps: ['Group rapid keystrokes into one undo step.', 'Store patches (inverse operations) instead of full states.', 'Persist history across reloads.']
  }
});

practice.push({
  title: 'Stopwatch with Laps', level: 'Medium', tags: ['machine coding', 'timers', 'state machine'], companies: ['Amazon', 'Flipkart', 'Cred'],
  statement: `<p>Build the logic of a stopwatch: <code>createStopwatch(now)</code> where <code>now()</code> returns milliseconds (injectable for tests). It has <code>start()</code>, <code>stop()</code>, <code>lap()</code>, <code>reset()</code> and <code>elapsed()</code>. Time must stay correct even if the UI updates irregularly (do not count ticks). <code>lap()</code> records the time since the previous lap.</p>`,
  constraints: `<p>Start twice in a row must not double count. Stop then start continues from the earlier elapsed time. Handles tab throttling because the time comes from a clock, not from counting intervals.</p>`,
  example: `${H.table(['clock', 'call', 'elapsed()'], [['0', 'start', '0'], ['1500', 'lap', '1500 (lap 1 = 1500)'], ['2000', 'stop', '2000'], ['9000', 'start', '2000 (paused time ignored)'], ['9500', 'lap', '2500 (lap 2 = 1000)']])}`,
  brute: { why: `<p>Use <code>setInterval(() =&gt; ms += 10, 10)</code>. Browsers throttle timers in background tabs and intervals drift, so after a minute the display can be seconds off.</p>`, code: `function stopwatchBrute(render) {
  let ms = 0;
  setInterval(function () { ms += 10; render(ms); }, 10);   // drifts and is throttled in background tabs
}` },
  mcq: { q: 'What makes a stopwatch accurate?', options: ['Computing elapsed from clock timestamps', 'Counting setInterval ticks', 'Using a shorter interval', 'Using requestAnimationFrame only'], answer: 0, explain: 'Timers only decide when to repaint. The truth is the difference between clock readings, which does not drift.' },
  hints: [
    `<p>Hint 1: the aha. Store <code>accumulated</code> (time from finished runs) and <code>startedAt</code> (null when stopped). elapsed = accumulated + (now - startedAt if running).</p>`,
    `<p>Hint 2: stop adds the running part to accumulated and sets startedAt to null. Start does nothing if already running.</p>`,
    `<p>Hint 3: laps store the elapsed at each lap; lap duration is the difference from the previous mark.</p>`
  ],
  solution: {
    approach: `<p>A tiny state machine around two numbers and an injectable clock. The UI uses requestAnimationFrame or setInterval only to repaint.</p>`,
    code: { lang: 'js', run: true, code: `function createStopwatch(now) {
  let accumulated = 0, startedAt = null, laps = [], lastMark = 0;
  const elapsed = () => accumulated + (startedAt === null ? 0 : now() - startedAt);
  return {
    elapsed,
    laps: () => laps.slice(),
    start() { if (startedAt === null) startedAt = now(); },
    stop() { if (startedAt !== null) { accumulated += now() - startedAt; startedAt = null; } },
    lap() { const e = elapsed(); laps.push(e - lastMark); lastMark = e; return laps[laps.length - 1]; },
    reset() { accumulated = 0; startedAt = null; laps = []; lastMark = 0; }
  };
}
let clock = 0;
const sw = createStopwatch(() => clock);
sw.start(); clock = 1500; sw.lap(); clock = 2000; sw.stop();
clock = 9000; sw.start(); sw.start(); clock = 9500; sw.lap();
console.log(sw.elapsed(), sw.laps());   // 2500 [ 1500, 1000 ]` },
    complexity: `<p>All operations O(1) (lap is O(1) amortised).</p>`,
    followUps: ['Format as mm:ss.cc with padding.', 'Highlight fastest and slowest lap.', 'Persist across reload using timestamps.']
  }
});

practice.push({
  title: 'Kanban Board Drag and Drop', level: 'Hard', tags: ['machine coding', 'drag and drop', 'state'], companies: ['Atlassian', 'Trello', 'Flipkart'],
  statement: `<p>Model a Kanban board as <code>{ columns: { backlog: [ids], doing: [ids], done: [ids] }, cards: { id: {title} } }</code>. Write the pure function <code>moveCard(board, cardId, toColumn, toIndex)</code> that moves a card (within a column or across columns) and returns a new board. Then wire native HTML5 drag and drop to it, with a keyboard alternative.</p>`,
  constraints: `<p>Up to 10<sup>3</sup> cards. Dropping at the same position must return the same board object. <code>toIndex</code> is the index in the destination list <b>after</b> the card has been removed from the source. No mutation of the input.</p>`,
  example: `${H.table(['move', 'before', 'after'], [['a → backlog index 2', 'backlog [a,b,c]', 'backlog [b,c,a]'], ['b → done index 0', 'backlog [a,b,c], done [d]', 'backlog [a,c], done [b,d]']])}`,
  brute: { why: `<p>Store card position in the DOM only (order of elements) and read it back when needed. State and screen can disagree, saving is impossible, and re-rendering from scratch loses the dragged card.</p>`, code: `function dropBrute(e) {
  e.preventDefault();
  const card = document.getElementById(e.dataTransfer.getData('text'));
  e.currentTarget.appendChild(card);       // data model never changes: nothing to save, undo or test
}` },
  mcq: { q: 'Why must you provide buttons or keyboard shortcuts besides drag and drop?', options: ['Native drag and drop is not accessible to keyboard and touch users', 'Because drop events are slow', 'Browsers forbid dragging', 'To reduce CSS'], answer: 0, explain: 'HTML5 DnD needs a mouse. A "Move to ..." control calling the same moveCard function serves everyone.' },
  hints: [
    `<p>Hint 1: the aha. Dragging is only an input device. The truth is the data, so write <code>moveCard</code> first and test it alone.</p>`,
    `<p>Hint 2: copy the source list without the card, copy the destination list (the same list if same column), insert the id at <code>toIndex</code>.</p>`,
    `<p>Hint 3: in DOM wiring, dragstart stores the card id, dragover must call <code>preventDefault</code> to allow drop, drop computes the index from the pointer position and calls moveCard then render.</p>`
  ],
  solution: {
    approach: `<p>A pure move function returns a new board (sharing untouched columns). DnD handlers translate pointer events into one call to it, and render redraws from state.</p>`,
    code: { lang: 'js', run: true, code: `function moveCard(board, cardId, toColumn, toIndex) {
  const from = Object.keys(board.columns).find((c) => board.columns[c].includes(cardId));
  if (!from) return board;
  const src = board.columns[from].filter((id) => id !== cardId);       // list without the card
  const dest = from === toColumn ? src : board.columns[toColumn].slice();
  const index = Math.max(0, Math.min(toIndex, dest.length));
  const next = dest.slice(0, index).concat(cardId, dest.slice(index));
  if (from === toColumn && next.join() === board.columns[from].join()) return board;   // dropped in place
  return { ...board, columns: { ...board.columns, [from]: from === toColumn ? next : src, [toColumn]: next } };
}
const board = { cards: {}, columns: { backlog: ['a', 'b', 'c'], doing: [], done: ['d'] } };
const b1 = moveCard(board, 'a', 'backlog', 2);
const b2 = moveCard(b1, 'b', 'done', 0);
console.log(b1.columns.backlog.join(), '|', b2.columns.backlog.join(), '|', b2.columns.done.join());
console.log('same spot returns same board:', moveCard(board, 'b', 'backlog', 1) === board);` },
    alt: [{ lang: 'js', title: 'HTML5 drag and drop wiring (browser)', code: `const boardEl = document.querySelector('#board');
boardEl.addEventListener('dragstart', (e) => {
  const card = e.target.closest('[data-card]');
  if (card) e.dataTransfer.setData('text/plain', card.dataset.card);
});
boardEl.addEventListener('dragover', (e) => {
  if (e.target.closest('[data-column]')) e.preventDefault();          // required, otherwise drop never fires
});
boardEl.addEventListener('drop', (e) => {
  const col = e.target.closest('[data-column]');
  if (!col) return;
  e.preventDefault();
  const id = e.dataTransfer.getData('text/plain');
  const cards = Array.from(col.querySelectorAll('[data-card]'));
  let index = cards.findIndex((c) => e.clientY < c.getBoundingClientRect().top + c.offsetHeight / 2);
  if (index === -1) index = cards.length;                             // below every card: append
  state = moveCard(state, id, col.dataset.column, index);
  render();
});` }],
    complexity: `<p>O(N) per move for the list copies (N = cards in the two columns); other columns are shared. Drop position search is O(cards in column).</p>`,
    followUps: ['Show a placeholder line while dragging.', 'Use pointer events for touch support.', 'Persist order to the server with optimistic update and rollback.']
  }
});

practice.push({
  title: 'Virtual List Component', level: 'Hard', tags: ['machine coding', 'virtualization', 'scroll'], companies: ['Meta', 'Uber', 'Airbnb'],
  statement: `<p>Build <code>createVirtualList(container, { total, itemHeight, renderItem, overscan })</code>. The container has a fixed height and <code>overflow: auto</code>. Only the visible rows (plus overscan) exist in the DOM, positioned so the scrollbar behaves as if all <code>total</code> rows existed. Put the window calculation in a pure function.</p>`,
  constraints: `<p>total up to 10<sup>6</sup>, fixed itemHeight. Scroll handling must not do layout reads in a loop; update at most once per animation frame.</p>`,
  example: `${H.table(['total, h, viewport, scrollTop, overscan', 'rendered rows'], [['1e6, 40, 400, 0, 2', '0..11 (12 rows)'], ['1e6, 40, 400, 4000, 2', '98..111']])}<p>Row 100 starts at 4000 px, so rows 100..109 are visible; overscan adds 98, 99, 110, 111.</p>`,
  brute: { why: `<p>Create one element per item. A million rows means a million nodes, seconds of startup and gigabytes of memory.</p>`, code: `function listBrute(container, total, renderItem) {
  for (let i = 0; i < total; i++) container.appendChild(renderItem(i));   // total DOM nodes
}` },
  mcq: { q: 'What is the role of the tall spacer element inside the scroll container?', options: ['It makes the scrollbar represent the full list height', 'It holds the visible rows only', 'It prevents scrolling', 'It caches images'], answer: 0, explain: 'The spacer has height total x itemHeight, so the scroll range matches a full list while only a few rows are real.' },
  hints: [
    `<p>Hint 1: the aha. first = floor(scrollTop / h) - overscan; last = ceil((scrollTop + viewport) / h) - 1 + overscan, both clamped.</p>`,
    `<p>Hint 2: structure: container → spacer (height total*h, position relative) → row elements with position absolute and top = index*h. Reuse the existing row nodes where indexes overlap if you can.</p>`,
    `<p>Hint 3: on scroll, schedule a single requestAnimationFrame update (a flag prevents duplicates). Recompute only when first or last changed.</p>`
  ],
  solution: {
    approach: `<p>A pure <code>calcWindow</code> returns the index range; the DOM layer renders that range inside an absolutely positioned layer, updated once per frame on scroll.</p>`,
    code: { lang: 'js', run: true, code: `function calcWindow(scrollTop, viewportHeight, itemHeight, total, overscan) {
  const first = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const last = Math.min(total - 1, Math.ceil((scrollTop + viewportHeight) / itemHeight) - 1 + overscan);
  return { first, last };
}
console.log(calcWindow(0, 400, 40, 1e6, 2));        // 0..11
console.log(calcWindow(4000, 400, 40, 1e6, 2));     // 98..111
console.log(calcWindow(39999600, 400, 40, 1e6, 2)); // clamped to the end` },
    alt: [{ lang: 'js', title: 'DOM layer (browser)', code: `function createVirtualList(container, opts) {
  const spacer = document.createElement('div');
  spacer.style.position = 'relative';
  spacer.style.height = opts.total * opts.itemHeight + 'px';       // full-height illusion
  container.appendChild(spacer);
  let lastRange = '', ticking = false;

  function update() {
    ticking = false;
    const w = calcWindow(container.scrollTop, container.clientHeight, opts.itemHeight, opts.total, opts.overscan);
    const key = w.first + ':' + w.last;
    if (key === lastRange) return;                                  // same window: skip DOM work
    lastRange = key;
    spacer.textContent = '';
    for (let i = w.first; i <= w.last; i++) {
      const row = opts.renderItem(i);
      row.style.position = 'absolute';
      row.style.top = i * opts.itemHeight + 'px';
      row.style.height = opts.itemHeight + 'px';
      spacer.appendChild(row);
    }
  }
  container.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }   // at most once per frame
  });
  update();
}` }],
    complexity: `<p>Each update is O(window size), independent of total. Memory is O(window).</p>`,
    followUps: ['Support variable heights with prefix sums and binary search.', 'Recycle row nodes instead of rebuilding.', 'Add keyboard navigation and aria-setsize/aria-posinset.']
  }
});

practice.push({
  title: 'Formula Parser with Cell References', level: 'Hard', tags: ['machine coding', 'parser', 'spreadsheet'], companies: ['Google', 'Microsoft', 'Atlassian'],
  statement: `<p>Write <code>evaluate(formula, getCell)</code> for spreadsheet formulas without <code>eval</code>. Support numbers, <code>+ - * /</code>, <code>^</code> (right associative, tighter than unary minus: <code>-2^2 = -4</code>), parentheses, cell references like <code>A1</code>, ranges like <code>A1:A3</code> inside functions <code>SUM</code> and <code>MAX</code>. Errors are returned as strings: <code>#DIV/0!</code> for division by zero, <code>#NAME?</code> for an unknown function.</p>`,
  constraints: `<p>Formula length up to 10<sup>3</sup> characters. Single-letter columns are enough. Missing cells count as 0. Recursion depth is bounded by nesting.</p>`,
  example: `${H.table(['formula', 'cells', 'result'], [['1+2*3', '', '7'], ['2^3^2', '', '512'], ['-2^2', '', '-4'], ['SUM(A1:A3)*2', 'A1=1,A2=2,A3=3', '12'], ['1/0', '', '#DIV/0!'], ['FOO(1)', '', '#NAME?']])}`,
  brute: { why: `<p>Replace references with their values and call <code>eval</code>. That runs arbitrary user code (a shared sheet becomes an attack vector), cannot report spreadsheet-style errors, and treats <code>^</code> as XOR in JavaScript.</p>`, code: `function evalBrute(formula, getCell) {
  const js = formula.replace(/[A-Z]\\d+/g, function (ref) { return getCell(ref); });
  return eval(js);                   // arbitrary code execution, wrong ^ meaning
}` },
  mcq: { q: 'Which parsing technique maps naturally to operator precedence?', options: ['Recursive descent with one function per precedence level', 'Regex replace only', 'Splitting on spaces', 'JSON.parse'], answer: 0, explain: 'Each level (expression, term, power, unary, primary) calls the next tighter one, so precedence is encoded in the call structure.' },
  hints: [
    `<p>Hint 1: the aha. Tokenize first (numbers, refs, ranges, names, operators). Then parse with functions: expr (+ -) calls term (* /) calls unary calls power calls primary.</p>`,
    `<p>Hint 2: power is right associative: after a primary, if next is ^ parse another power recursively. Unary minus calls unary, so -2^2 becomes -(2^2).</p>`,
    `<p>Hint 3: ranges produce arrays; function calls collect arguments (flattened). Throw errors whose message is the spreadsheet error text and catch once at the top.</p>`
  ],
  solution: {
    approach: `<p>Tokenizer plus a precedence-based recursive-descent parser that evaluates as it goes. Errors are thrown as strings and caught at the top level, so they become the cell value.</p>`,
    code: { lang: 'js', run: true, code: `function evaluate(formula, getCell) {
  const tokens = formula.match(/\\d+\\.?\\d*|[A-Z]\\d+:[A-Z]\\d+|[A-Z]\\d+|[A-Z]+|[-+*\\/^(),]/g) || [];
  let p = 0;
  const peek = () => tokens[p];
  const rangeCells = (r) => {
    const [a, b] = r.split(':');
    const out = [];
    for (let c = a.charCodeAt(0); c <= b.charCodeAt(0); c++) for (let n = +a.slice(1); n <= +b.slice(1); n++) out.push(getCell(String.fromCharCode(c) + n));
    return out;
  };
  const num = (v) => { if (typeof v === 'string' && v[0] === '#') throw v; return v === undefined ? 0 : v; };
  function expr() { let v = term(); while (peek() === '+' || peek() === '-') { const op = tokens[p++]; const r = term(); v = op === '+' ? v + r : v - r; } return v; }
  function term() {
    let v = unary();
    while (peek() === '*' || peek() === '/') {
      const op = tokens[p++]; const r = unary();
      if (op === '/' && r === 0) throw '#DIV/0!';
      v = op === '*' ? v * r : v / r;
    }
    return v;
  }
  function unary() { if (peek() === '-') { p++; return -unary(); } return power(); }
  function power() { const base = primary(); if (peek() === '^') { p++; return Math.pow(base, unary2()); } return base; }
  function unary2() { if (peek() === '-') { p++; return -unary2(); } return power(); }   // right side: 2^-1 and 2^3^2
  function primary() {
    const t = tokens[p++];
    if (t === '(') { const v = expr(); p++; return v; }
    if (/^[A-Z]\\d+$/.test(t)) return num(getCell(t));
    if (/^[A-Z]+$/.test(t)) {                                     // function call
      const args = [];
      p++;                                                         // skip "("
      while (peek() !== ')') {
        if (peek() === ',') { p++; continue; }
        if (/^[A-Z]\\d+:[A-Z]\\d+$/.test(peek())) args.push(...rangeCells(tokens[p++]).map(num));
        else args.push(expr());
      }
      p++;                                                         // skip ")"
      if (t === 'SUM') return args.reduce((a, b) => a + b, 0);
      if (t === 'MAX') return Math.max(...args);
      throw '#NAME?';
    }
    return parseFloat(t);
  }
  try { return expr(); } catch (e) { if (typeof e === 'string') return e; throw e; }
}
const cells = { A1: 1, A2: 2, A3: 3, B1: 10 };
const get = (r) => cells[r];
for (const f of ['1+2*3', '(1+2)*3', '2^3^2', '-2^2', 'SUM(A1:A3)*2', 'MAX(A1:A3,B1)', 'A1+A2*A3', '1/0', 'FOO(1)']) console.log(f.padEnd(14), '=', evaluate(f, get));` },
    complexity: `<p>O(L) time for formula length L (single pass, each token consumed once) plus O(R) for a range of R cells; space O(depth + R).</p>`,
    followUps: ['Cache the parsed AST per cell.', 'Collect references for the dependency graph.', 'Add string and boolean values with IF.']
  }
});

practice.push({
  title: 'Reconnecting Channel with Outbox', level: 'Hard', tags: ['machine coding', 'websocket', 'state machine', 'resilience'], companies: ['Slack', 'Discord', 'Uber'],
  statement: `<p>Write <code>ReliableChannel({ connect, schedule, backoff })</code> around a socket. <code>send(text)</code> assigns a <code>clientId</code>, stores the message in an outbox, and sends it if online. When the connection closes, it schedules a reconnect after <code>backoff(attempt)</code> ms. On open it resets the attempt counter, sends <code>{type:'resume', afterSeq}</code>, then re-sends every outbox message. An <code>ack</code> removes a message from the outbox. Inject <code>connect</code> and <code>schedule</code> so the whole thing can be tested without real time.</p>`,
  constraints: `<p>No message may be lost while offline; the same <code>clientId</code> is reused on retry (server dedupes). Reconnect attempts must never overlap. Status is one of connecting, online, reconnecting.</p>`,
  example: `${H.table(['Event', 'Result'], [['send("hi") while offline', 'stored in outbox, not sent'], ['attempt 1 and 2 fail', 'waits 100 ms, then 200 ms'], ['attempt 3 opens', 'resume sent, then "hi" re-sent'], ['ack arrives', 'outbox empty']])}`,
  brute: { why: `<p>Call <code>socket.send</code> directly and reconnect immediately in <code>onclose</code>. Messages sent while offline vanish or throw, a tight reconnect loop hammers the server, and nothing tells the server which messages you already saw.</p>`, code: `function channelBrute(url) {
  let ws = new WebSocket(url);
  ws.onclose = function () { ws = new WebSocket(url); };   // instant retry loop, no outbox, no resume
  return { send: function (t) { ws.send(t); } };            // throws when not open
}` },
  mcq: { q: 'Why re-send outbox messages with the same clientId after reconnecting?', options: ['So the server can detect duplicates if the first attempt actually arrived', 'To make messages look new', 'To change the order', 'To save bandwidth'], answer: 0, explain: 'We cannot know whether the original send reached the server. A stable id makes the retry safe (idempotent).' },
  hints: [
    `<p>Hint 1: the aha. Separate intent (outbox, a Map) from transport (socket). send() always writes to the outbox first.</p>`,
    `<p>Hint 2: three handlers: onOpen (reset attempt, resume, flush), onClose (schedule open with backoff, attempt++), onMessage (ack deletes, message updates lastSeq).</p>`,
    `<p>Hint 3: only schedule one reconnect per close. Inject the scheduler and a fake connect, then drive events from a queue to test deterministically.</p>`
  ],
  solution: {
    approach: `<p>A small class holding status, attempt, outbox and lastSeq. The transport is injected, so a test drives it with an in-memory event queue.</p>`,
    code: { lang: 'js', run: true, code: `class ReliableChannel {
  constructor({ connect, schedule, backoff }) {
    Object.assign(this, { connectFn: connect, schedule, backoff, attempt: 0, outbox: new Map(), lastSeq: 0, nextId: 1, status: 'connecting', sock: null });
    this.open();
  }
  open() {
    this.sock = this.connectFn({
      onOpen: () => {
        this.attempt = 0; this.status = 'online';
        this.sock.send({ type: 'resume', afterSeq: this.lastSeq });
        for (const m of this.outbox.values()) this.sock.send(m);           // flush with the SAME clientIds
      },
      onClose: () => { this.status = 'reconnecting'; this.schedule(() => this.open(), this.backoff(this.attempt++)); },
      onMessage: (m) => {
        if (m.type === 'ack') this.outbox.delete(m.clientId);
        else if (m.type === 'message' && m.seq === this.lastSeq + 1) this.lastSeq = m.seq;
      }
    });
  }
  send(text) {
    const m = { type: 'send', clientId: 'c' + this.nextId++, text };
    this.outbox.set(m.clientId, m);
    if (this.status === 'online') this.sock.send(m);
    return m.clientId;
  }
}

// ---- deterministic test: one queue drives both timers and network events ----
const queue = [];
let connects = 0;
const log = [];
const ch = new ReliableChannel({
  schedule: (fn, ms) => queue.push({ label: 'wait ' + ms + 'ms then reconnect', fn }),
  backoff: (n) => 100 * Math.pow(2, n),
  connect: (h) => {
    const failing = ++connects <= 2;                                       // first two attempts fail
    queue.push({ label: failing ? 'connection ' + connects + ' fails' : 'connection ' + connects + ' opens', fn: failing ? h.onClose : h.onOpen });
    return { send: (m) => { log.push('sent ' + m.type + (m.text ? ' "' + m.text + '"' : '')); if (m.type === 'send') queue.push({ label: 'ack ' + m.clientId, fn: () => h.onMessage({ type: 'ack', clientId: m.clientId }) }); } };
  }
});
ch.send('hi');                                                              // offline: goes to the outbox only
while (queue.length) { const e = queue.shift(); console.log(e.label); e.fn(); }
console.log(log.join(' | '), '| outbox size:', ch.outbox.size, '| status:', ch.status);` },
    complexity: `<p>O(1) per event; flushing is O(outbox size). Memory O(pending messages).</p>`,
    followUps: ['Add jitter and a maximum delay.', 'Mark messages as failed after N attempts and expose retry.', 'Add heartbeat pings to detect dead sockets.']
  }
});

/* ===================== QUIZ ===================== */
quiz.push({ q: 'In the RADIO framework, what does the <b>D</b> stand for?', options: ['Data model (state shape)', 'Debugging', 'Deployment', 'Design tokens'], answer: 0, explain: 'RADIO = Requirements, Architecture, Data model, Interface (API), Optimisations.' });
quiz.push({ q: 'A user types "react" quickly. What does a 200 ms debounce do?', options: ['Sends one request after the typing pauses', 'Sends a request at most every 200 ms while typing', 'Delays showing typed characters by 200 ms', 'Cancels the keyboard events'], answer: 0, explain: 'Debounce waits for silence. Throttle would send periodic requests. The input text itself must never be delayed.' });
quiz.push({ q: 'The answer for "rea" arrives after the answer for "react". Which fix protects the UI?', options: ['Abort old requests and ignore any response that is not the latest', 'Increase the debounce time to 5 seconds', 'Sort suggestions alphabetically', 'Cache everything forever'], answer: 0, explain: 'Cancellation plus a latest-id check guarantees only the newest query can update the dropdown.' });
quiz.push({ q: 'Why prefer cursor pagination over offset pagination for a live feed?', options: ['New items do not shift pages, so no duplicates or skips', 'Cursors allow jumping to page 50', 'Offsets cannot be sent over HTTP', 'Cursors are shorter'], answer: 0, explain: 'A cursor says "after item X". Inserting new items at the top does not change what comes after X.' });
quiz.push({ q: 'A feed has 10,000 posts of 80 px each and a 640 px viewport. With overscan 2, roughly how many rows are rendered?', options: ['About 12', '10,000', '640', 'About 2,000'], answer: 0, explain: '640 / 80 = 8 visible rows, plus 2 overscan on each side gives about 12.' });
quiz.push({ q: 'An optimistic like fails on the server. What is the safest UI behaviour?', options: ['Restore the saved previous state and show a small error', 'Keep the heart filled', 'Reload the whole page', 'Subtract one from the count without restoring anything else'], answer: 0, explain: 'Rolling back to the saved snapshot returns exactly the old state; blind subtraction can break if other updates happened meanwhile.' });
quiz.push({ q: 'Which carousel behaviour is required for accessibility when it auto-rotates?', options: ['A visible pause control', 'A faster animation', 'Hiding the dots', 'Using only images'], answer: 0, explain: 'Moving content must be pausable (WCAG 2.2.2). Also respect prefers-reduced-motion.' });
quiz.push({ q: 'Why sort chat messages by a server sequence number instead of timestamps?', options: ['Device clocks disagree, the sequence is one agreed order', 'Timestamps are too long', 'Sequences are random', 'Browsers cannot read dates'], answer: 0, explain: 'Skewed clocks can put a reply before its question. The server-assigned per-conversation sequence is consistent for everyone.' });
quiz.push({ q: 'Why add random jitter to reconnect back-off?', options: ['So thousands of clients do not reconnect at the same instant', 'To make reconnects faster', 'To avoid using timers', 'To encrypt the socket'], answer: 0, explain: 'Without jitter a server outage ends with a synchronized thundering herd of retries.' });
quiz.push({ q: 'A conversation has lastSeq = 42 and lastReadSeq = 37. The unread badge shows:', options: ['5', '42', '37', '79'], answer: 0, explain: 'Unread = lastSeq - lastReadSeq = 5, no need to count messages individually.' });
quiz.push({ q: 'After editing one spreadsheet cell, which cells are recomputed?', options: ['That cell and all cells that depend on it, directly or indirectly', 'All cells in the sheet', 'Only the cell itself', 'Only the cells in the same row'], answer: 0, explain: 'The dependency graph lets you find the affected set and skip everything else.' });
quiz.push({ q: 'Kahn\'s algorithm finishes with some affected cells never processed. This means:', options: ['A circular reference exists among or behind those cells', 'The sheet is empty', 'The formulas are too long', 'The sort is stable'], answer: 0, explain: 'Cells in a cycle wait on each other forever, so their waiting counts never reach zero.' });
quiz.push({ q: 'In a machine-coding round, what should you build first?', options: ['A thin end-to-end working slice (MVP)', 'All the CSS', 'Every edge case', 'The final animation'], answer: 0, explain: 'A working vertical slice protects your demo; extra features are added one by one afterwards.' });
quiz.push({ q: 'What is the benefit of keeping state changes in a pure reducer or function?', options: ['It is easy to test and explain without the DOM', 'It removes the need for render', 'It makes CSS faster', 'It disables events'], answer: 0, explain: 'Pure logic can be verified with a few inputs and outputs, and keeps UI code thin.' });

/* ===================== INTERVIEW ===================== */
interview.push({ q: 'Walk me through how you would approach a frontend system design question.', level: 'B', a: `<p>I use a fixed recipe so nothing is forgotten. <b>Requirements</b>: I ask who the users are, devices, scale, what is in and out of scope, and non-functional needs such as speed and accessibility. <b>Architecture</b>: I draw the component tree and mark which component owns each piece of state, with data going down as props and events going up. <b>Data model</b>: I separate server state, UI state, URL state and form state, and show a normalised state shape. <b>Interface</b>: I write the API contract (pagination, errors, realtime messages). <b>Optimisations</b>: performance, accessibility, security, error and empty states. For each choice I state the trade-off and what would make me change it.</p>`, followUps: ['How do you decide what is out of scope?', 'Which step do you shorten if time is tight?'] });
interview.push({ q: 'Design an autocomplete. How do you avoid wasted requests and wrong results?', level: 'I', a: `<p>The input shows every keystroke immediately; only the search is debounced (about 150 to 300 ms) and requires a minimum length. Each search gets a stamp and an AbortController: starting a new search aborts the old request, and a response is applied only if its stamp is still the latest, which protects against out-of-order replies. I cache by a normalised query (trim, lower-case) in a small LRU with a TTL, and can filter locally from a complete shorter result. Keyboard support follows the ARIA combobox pattern with aria-activedescendant, and a polite live region announces the result count. On errors I keep the previous list and show a small message.</p>`, followUps: ['Debounce versus throttle here?', 'How do you handle IME composition?', 'What happens when the server returns 429?'] });
interview.push({ q: 'Why is cursor pagination better than offset pagination for a news feed?', level: 'I', a: `<p>With offset pagination ("skip 40") the meaning of a page changes when items are inserted: a new post at the top shifts everything, so the next page repeats an item or skips one. Deep offsets are also slow for the database because it scans and discards rows. A cursor encodes the position of the last item seen, usually a stable sort key such as (createdAt, id), so the server answers "20 items after this key" with an index seek. The cursor is opaque to the client, and the response returns nextCursor = null at the end. The trade-off is that you cannot jump to an arbitrary page, which a feed does not need.</p>`, followUps: ['How do ranked or personalised feeds change this?', 'How do you merge a new page without duplicates?'] });
interview.push({ q: 'How does virtualization work and what are its downsides?', level: 'I', a: `<p>Only the rows near the viewport exist in the DOM. From scrollTop and row height we compute the first and last visible index, add overscan, render those rows absolutely positioned inside a spacer whose height equals the full list height, so the scrollbar behaves normally. Cost depends on the window size, not on the list size. With variable heights we keep prefix sums and binary search. Downsides: browser find-in-page cannot see off-screen rows, screen readers see only the window (so use aria-setsize and posinset), anchor links and focus management are harder, and fast scrolling can show blanks without enough overscan.</p>`, followUps: ['How do you handle variable row heights?', 'What is content-visibility auto and when is it enough?'] });
interview.push({ q: 'Explain optimistic updates and the failure cases you must handle.', level: 'I', a: `<p>An optimistic update changes the UI immediately, sends the request in the background, and reconciles with the response. I save a snapshot before changing so a failure can restore it exactly. Failure cases: rapid repeated taps where an earlier failure would undo a later success (serialise writes per entity or keep the desired state and reconcile), counts that drift (replace with the server value on response), retries (use idempotent endpoints such as PUT and DELETE for likes, or idempotency keys), and offline use (queue the mutation and show a pending style). I also show a brief, non-blocking error message on rollback.</p>`, followUps: ['How would you do this with TanStack Query?', 'Why PUT/DELETE instead of a toggle endpoint?'] });
interview.push({ q: 'Design an accessible image carousel.', level: 'I', a: `<p>I choose CSS scroll-snap when possible for native swipe and momentum. The container is a region with aria-roledescription carousel and a label; slides are groups labelled "n of N". Controls are real buttons; arrow keys work; dots show aria-current. Auto-play is off or pausable, stops on hover and focus, respects prefers-reduced-motion, and is not announced while rotating. Off-screen slides are inert so links inside cannot be tabbed to. For performance, the current image is high priority, neighbours are preloaded, the rest lazy, images have width and height or aspect-ratio to avoid layout shift, and srcset keeps bytes small. Swipe uses pointer events with a distance or velocity threshold.</p>`, followUps: ['When would you use translateX instead of scroll-snap?', 'How do you build an infinite loop without a visible jump?'] });
interview.push({ q: 'How do you guarantee ordering and no duplicates in a chat UI over a WebSocket?', level: 'A', a: `<p>Each conversation has a server-assigned increasing sequence number, and each outgoing message has a client-generated clientId. The client keeps lastSeq: a message with seq = lastSeq + 1 is shown, then any held messages that now fit are released; a higher seq is held in a buffer; a lower or equal seq is a duplicate and dropped. If a gap persists beyond a short grace period, the client fetches the missing range over REST with afterSeq. Sends go into an outbox with the clientId, are removed on ack, and are re-sent after reconnect, so the server can dedupe. On reconnect the client sends resume with afterSeq. This yields the feeling of exactly-once, in-order delivery on top of at-least-once, unordered transport.</p>`, followUps: ['Why not sort by timestamp?', 'What if the gap is thousands of messages?', 'How do multiple tabs share one socket?'] });
interview.push({ q: 'How do you implement unread counts across devices?', level: 'I', a: `<p>I avoid counting messages. The server tracks lastSeq per conversation and the user's lastReadSeq; unread = lastSeq - lastReadSeq. The client updates lastSeq as messages arrive and sends a read receipt with upToSeq when the user has the newest message visible and the tab or app is focused. Because it is just two numbers, it survives reconnects, works on any device, and is cheap to show in a conversation list. For mentions or muted channels I keep a separate counter. The badge caps at 99+. On reconnect the resume response corrects any drift.</p>`, followUps: ['When exactly do you mark as read?', 'How would you do per-message read receipts in a group?'] });
interview.push({ q: 'Describe reconnect logic for a realtime client.', level: 'I', a: `<p>On close or error, show a reconnecting state and schedule a retry with exponential back-off, a cap (about 30 s) and random jitter so clients do not retry in lock-step. Only one reconnect may be pending. When a connection opens, reset the attempt counter (ideally after it has stayed stable briefly), authenticate (refresh the token if expired), send resume with lastSeq so missed messages are replayed, and flush the outbox using the same clientIds. A heartbeat ping detects half-dead connections, and online or visibilitychange events trigger an immediate retry. Persisting the outbox in IndexedDB protects against reloads.</p>`, followUps: ['Why reset the counter only after stability?', 'What do you show the user while offline?'] });
interview.push({ q: 'How would you design the data model and recalculation for a spreadsheet?', level: 'E', a: `<p>Store cells sparsely in a map keyed by address with raw text, computed value and cached parsed formula. Maintain two edge maps: precedents (what a cell reads) and dependents (who reads it). On edit: parse, update edges, compute the dirty set by walking dependents, topologically sort that subgraph with Kahn's algorithm (in-degree counts limited to dirty cells), evaluate in that order, and mark cells left over as #CYCLE!. Ranges should be represented as range nodes rather than thousands of edges. Volatile functions are always dirty. Batch edits such as paste into one recalculation. Rendering is virtualised in two dimensions, with per-cell subscriptions so only changed cells re-render. Formulas are parsed by our own parser, never eval.</p>`, followUps: ['How do you handle SUM over a million cells?', 'How would you parallelise recalculation?', 'How does real-time collaboration change the model?'] });
interview.push({ q: 'How do you render a very large grid efficiently, and when would you use canvas?', level: 'A', a: `<p>Virtualise in both axes: prefix sums of row heights and column widths, binary search for the first visible index, render the window plus overscan inside a big spacer, and update once per animation frame on scroll. Use transforms for positioning. Frozen panes are extra viewports. DOM works for a few hundred to a couple of thousand visible cells and gives accessibility and text selection for free. Canvas draws thousands of cells faster and is what large products use, but you must rebuild hit testing, text measurement, selection drawing, IME input and screen-reader support (usually with a hidden DOM layer for the active cell and an ARIA grid). I would start with DOM and move to canvas only when profiling shows the need.</p>`, followUps: ['How do column resizes update offsets?', 'How do you keep headers aligned while scrolling?'] });
interview.push({ q: 'What is your strategy in a 90-minute machine-coding round?', level: 'B', a: `<p>I spend five minutes clarifying scope and writing a must/nice/skip list, then ten minutes on component list, state shape and function names. I build a thin vertical slice first (render from state, one interaction, one state update) and run it often. Then I add features one by one in order of value, keeping the main flow working. Logic goes in small pure functions, the UI has one render function from state, and handlers only dispatch. Near the end I sweep edge cases (empty, error, rapid clicks, keyboard) and accessibility, and I leave five minutes to explain the code and what I would improve. I talk through decisions and ask precise questions when stuck.</p>`, followUps: ['What do you cut when you run out of time?', 'How do you use AI tools in such a round?'] });
interview.push({ q: 'How do you make a drag-and-drop Kanban board robust and accessible?', level: 'A', a: `<p>The data model is the truth: columns map to arrays of card ids, and a pure moveCard function returns the new board. Drag events only translate pointer positions into a call to that function, then the UI re-renders from state, which makes the logic testable and persistable. Native HTML5 drag and drop needs a mouse, so I add a keyboard or menu alternative ("Move to ...") calling the same function, announce moves in a live region, and use pointer events or a library such as dnd-kit for touch. I show a placeholder where the card will land, handle dropping in place as a no-op, and persist order optimistically with rollback on failure.</p>`, followUps: ['How do you store order on the server (fractional indexing)?', 'What happens if two users move the same card?'] });
interview.push({ q: 'Where do AI coding tools help in frontend design and machine-coding rounds, and where do they hurt?', level: 'I', a: `<p>They help with scaffolding, boilerplate, mock data, test case generation, checklists of edge cases and reviewing my design for blind spots. They hurt when I accept code I cannot explain: typical mistakes include offset pagination, missing request cancellation, no cleanup of timers and listeners, mouse-only widgets, innerHTML with user text, global state for everything and over-engineering. My approach is to own the requirements, state model and trade-offs, ask for small well-scoped pieces, read and run every line, test boundary cases, and be able to explain or change any part live. Interviewers increasingly grade direction, verification and explanation over typing speed.</p>`, followUps: ['How do you verify generated code quickly?', 'What would you refuse to delegate?'] });

registerModule({
  id: 'fe16',
  title: 'Frontend System Design & Machine Coding',
  intro: `<p>This module teaches you to answer the two toughest frontend interview rounds: the <b>system design</b> round ("design autocomplete, a news feed, a chat app, a spreadsheet") and the <b>machine-coding</b> round ("build a Kanban board in 90 minutes"). You first learn a repeatable framework (requirements, component architecture, state shape, API contract, performance, accessibility). Then you apply it to five classic designs, each with runnable JavaScript cores: debounce with an LRU cache, a cursor paginator, message ordering with sequence numbers and a spreadsheet dependency graph with topological recalculation. It builds on earlier modules on React, state, performance, accessibility and browser APIs.</p>`,
  goals: [
    'Run a 45-minute frontend design round with the RADIO framework and explain every trade-off',
    'Design autocomplete with debounce, request cancellation, LRU cache and accessible keyboard navigation',
    'Design an infinite feed with cursor pagination, virtualization and optimistic updates',
    'Design a chat UI that keeps order, removes duplicates, counts unread messages and survives reconnects',
    'Design a spreadsheet grid with virtualized cells and a dependency graph that recalculates in topological order',
    'Finish classic machine-coding prompts (star rating, tabs, modal, OTP, comments, tree, Kanban) with clean structure and edge cases'
  ],
  prereqs: `Accessibility (a11y), Browser APIs, Storage &amp; Networking, React Hooks Deep Dive, State Management &amp; Data Fetching, Rendering Pipeline &amp; Web Performance, and Frontend Architecture at Scale.`,
  hours: 24,
  topics: topics,
  quiz: quiz,
  interview: interview,
  practice: practice
});
})();
