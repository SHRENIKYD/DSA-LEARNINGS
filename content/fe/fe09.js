(function () {
var topics = [], practice = [], quiz = [], interview = [];
// helpers: J = React/JSX snippet (needs React, so not compiled), R = plain JS snippet that runs in the sandbox
var J = function (code, title) { return { lang: 'jsx', code: code, title: title, check: false }; };
var R = function (code, title) { return { lang: 'js', code: code, title: title, run: true }; };

/* ============================ TOPIC 1: useState ============================ */
topics.push({
  title: 'useState: State Is a Snapshot, Updates Are Queued',
  analogy: `<p>Think of a <b>flipbook</b>. Every page (a <b>render</b>) is a photograph of your screen. The number written on that photo is the state, and it can never change - ink is dry. When you call <code>setCount(5)</code> you do not scribble on the photo you are holding. You drop a note in a <b>request box</b>: "next page, please show 5". React reads the box after your event handler finishes and draws a brand-new page.</p>
    <p>Most beginner bugs ("why is my state still the old value right after I set it?") disappear once you see state as <i>photos</i>, not as a <i>variable you edit</i>.</p>`,
  explain: `<p>A <b>hook</b> is a function whose name starts with <code>use</code> and that lets a plain function component <i>remember</i> things between renders. <code>useState</code> is the first one everybody meets:</p>
    <pre>const [count, setCount] = useState(0);</pre>
    <p>You get a pair: the <b>current value</b> for this render, and a <b>setter</b> that asks React for a new render with a new value. The initial value (<code>0</code>) is only used on the very first render.</p>
    <p><b>Snapshot rule:</b> inside one render, <code>count</code> is a constant. Three calls of <code>setCount(count + 1)</code> in one click all read the <i>same</i> photo (<code>count = 0</code>), so they all say "make it 1".</p>
    ${H.table(['Click handler code', 'What each line asks for', 'Next render shows'], [
      ['<code>setCount(count + 1)</code> x 3', 'set 1, set 1, set 1 (count is frozen at 0)', H.c('r', '1')],
      ['<code>setCount(c =&gt; c + 1)</code> x 3', 'take latest, add 1 - three times in a row', H.c('g', '3')]
    ])}
    <p>The second form is called an <b>updater function</b>. React lines up the updaters in a queue and feeds each one the result of the previous one. Use it whenever the new value depends on the old value.</p>
    <p><b>Other rules you must know:</b></p>
    <ul>
      <li><b>Never mutate</b> objects or arrays in state. Make a copy: <code>setUser({ ...user, age: 31 })</code>, <code>setList([...list, item])</code>. React compares by identity (<code>Object.is</code>), so a mutated object looks "unchanged" and the screen does not update.</li>
      <li><b>Lazy initial state:</b> <code>useState(() =&gt; readFromDisk())</code> runs the function only once. Writing <code>useState(readFromDisk())</code> calls it on every render and throws the result away.</li>
      <li><b>Same value, no work:</b> setting state to a value that is <code>Object.is</code>-equal to the current one lets React skip the re-render.</li>
      <li><b>Batching:</b> several setters in one event produce <i>one</i> re-render (React 18 does this everywhere: timeouts, promises, native events).</li>
    </ul>`,
  clues: [
    '"the value is still old right after I call the setter" -> snapshot rule, state does not change mid-render',
    '"clicking increments by 1 instead of 3" -> use the updater form <code>setX(x =&gt; x + 1)</code>',
    '"the new value depends on the previous value" -> always updater function',
    '"I pushed to the array but the screen did not change" -> you mutated; copy then set',
    '"expensive initial value is computed on every render" -> lazy initializer <code>useState(() =&gt; ...)</code>',
    '"form with many fields in one object" -> spread the old object, change one key'
  ],
  code: [
    J(`import { useState } from 'react';

export function Counter() {
  // count is a CONSTANT for this render; setCount asks for the next render
  const [count, setCount] = useState(0);

  function addThreeWrong() {
    setCount(count + 1); // "make it 0 + 1"
    setCount(count + 1); // "make it 0 + 1"  (same photo!)
    setCount(count + 1); // "make it 0 + 1"
  }

  function addThreeRight() {
    setCount(c => c + 1); // queue: +1
    setCount(c => c + 1); // queue: +1 on top of the previous result
    setCount(c => c + 1); // queue: +1 again
  }

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={addThreeWrong}>+3 (wrong, gives +1)</button>
      <button onClick={addThreeRight}>+3 (right)</button>
    </div>
  );
}`, 'Snapshot vs updater function (React)'),
    R(`// A tiny model of how React processes the setState queue.
function makeState(initial) {
  let state = initial;
  let queue = [];
  return {
    get: () => state,
    set: (update) => queue.push(update),      // only records the request
    flush() {                                  // React does this after the handler ends
      for (const u of queue) state = typeof u === 'function' ? u(state) : u;
      queue = [];
      return state;
    }
  };
}

// Case 1: three plain values - all computed from the SAME snapshot
const a = makeState(0);
const snapshotA = a.get();            // the "photo": 0
a.set(snapshotA + 1); a.set(snapshotA + 1); a.set(snapshotA + 1);
console.log('plain  ->', a.flush());   // 1

// Case 2: three updater functions - each sees the previous result
const b = makeState(0);
b.set(c => c + 1); b.set(c => c + 1); b.set(c => c + 1);
console.log('updater ->', b.flush());  // 3

// Case 3: mixing - plain value replaces, updater continues from it
const c = makeState(10);
c.set(5); c.set(n => n * 2);
console.log('mixed  ->', c.flush());    // 10`, 'Runnable model of the update queue')
  ],
  codeTitle: ['React: the triple-click bug and its fix', 'Plain JS model of the update queue (run it)'],
  viz: {
    title: 'Three setCount calls: plain value vs updater function',
    input: 'plain',
    inputLabel: 'Type plain or fn (updater function)',
    gen: function (input) {
      var mode = String(input || 'plain').trim().toLowerCase();
      if (mode !== 'plain' && mode !== 'fn') throw new Error('Type "plain" (setCount(count + 1)) or "fn" (setCount(c => c + 1))');
      var frames = [], q = [], i, label;
      frames.push({ narr: '<b>Render #1.</b> React calls <code>Counter()</code>. <code>useState(0)</code> hands back <b>count = 0</b>. This number is frozen for the whole function call.', parts: [
        { type: 'vars', label: 'Snapshot of render #1', vals: { count: 0 } },
        { type: 'queue', label: 'Update queue (React keeps it)', items: [], frontLabel: 'first', backLabel: 'last' } ] });
      frames.push({ narr: 'The user clicks the button. The handler from <b>render #1</b> runs - it can only see <code>count = 0</code>.', parts: [
        { type: 'vars', label: 'Snapshot of render #1', vals: { count: 0 }, hl: { count: 'cur' } },
        { type: 'queue', label: 'Update queue', items: [] } ] });
      for (i = 1; i <= 3; i++) {
        label = mode === 'plain' ? 'set(0 + 1)' : 'set(c => c + 1)';
        q.push(label);
        frames.push({ narr: 'Line ' + i + ' of the handler: <code>' + (mode === 'plain' ? 'setCount(count + 1)' : 'setCount(c =&gt; c + 1)') + '</code>. It does <b>not</b> change anything now - it just drops a note in the queue.' + (mode === 'plain' ? ' The note says "1" because <code>count</code> is still 0.' : ' The note is a recipe, not a number.'), parts: [
          { type: 'vars', label: 'Snapshot of render #1', vals: { count: 0 } },
          { type: 'queue', label: 'Update queue', items: q.slice(), hl: (function () { var h = {}; h[q.length - 1] = 'ok'; return h; })() } ] });
      }
      frames.push({ narr: 'The handler is finished. Now React empties the queue, starting from the stored state <b>0</b>.', parts: [
        { type: 'vars', label: 'Stored state', vals: { state: 0 }, hl: { state: 'cur' } },
        { type: 'queue', label: 'Update queue', items: q.slice() } ] });
      var st = 0, rows = [];
      for (i = 0; i < 3; i++) {
        var before = st;
        st = mode === 'plain' ? 1 : st + 1;
        rows.push([String(i + 1), q[i], String(before), String(st)]);
        frames.push({ narr: 'Process note #' + (i + 1) + ': ' + (mode === 'plain' ? 'replace the state with <b>1</b>' : 'run the recipe on <b>' + before + '</b> to get <b>' + st + '</b>') + '.', parts: [
          { type: 'table', label: 'Queue processing', columns: ['#', 'note', 'state before', 'state after'], rows: rows.map(function (r) { return r.slice(); }), hl: (function () { var h = {}; h[i] = 'ok'; return h; })() },
          { type: 'vars', label: 'Stored state', vals: { state: st }, hl: { state: 'ok' } } ] });
      }
      frames.push({ narr: '<b>Render #2.</b> React calls <code>Counter()</code> again; <code>useState</code> now returns <b>count = ' + st + '</b>. ' + (mode === 'plain' ? '<span class="c-r">Three clicks worth of code gave +1. The three notes all started from the same photo.</span>' : '<span class="c-g">Each updater saw the previous result, so we got +3.</span>'), parts: [
        { type: 'vars', label: 'Snapshot of render #2', vals: { count: st }, hl: { count: mode === 'plain' ? 'bad' : 'ok' } },
        { type: 'queue', label: 'Update queue', items: [] } ] });
      return frames;
    }
  },
  examples: [
    { title: 'The "setTimeout shows the old value" surprise', html: `<p>You click "+1" and then immediately click "Show". After 3 seconds an alert pops up with the <b>old</b> number. Why? The alert callback was created in the render where you clicked, so it holds <i>that</i> photo of <code>count</code>. This is a feature: the alert tells you what the screen showed when you clicked.</p>`, code: J(`function Demo() {
  const [count, setCount] = useState(0);
  function showLater() {
    // this arrow function captures the count of THIS render
    setTimeout(() => alert('You clicked when count was ' + count), 3000);
  }
  return <button onClick={() => { setCount(count + 1); showLater(); }}>click</button>;
}`) },
    { title: 'Lazy initial state', html: `<p>Reading <code>localStorage</code> and parsing JSON takes time. <code>useState(parse())</code> runs <code>parse()</code> on <b>every</b> render (React ignores the result after the first). Pass a function instead and React calls it once.</p>`, code: J(`// bad: parseSaved() runs on every render
const [todos, setTodos] = useState(parseSaved());
// good: parseSaved runs once, on the first render only
const [todos2, setTodos2] = useState(() => parseSaved());`) },
    { title: 'Updating objects and arrays without mutation', html: `<p>Rule: <b>copy, change the copy, set the copy</b>. Spread (<code>...</code>) copies one level. For arrays use <code>map</code>, <code>filter</code> and <code>[...list, x]</code> - never <code>push</code>, <code>splice</code>, <code>sort</code> on the state itself.</p>`, code: R(`const user = { name: 'Asha', address: { city: 'Pune' }, tags: ['a'] };

// change a nested field: copy EVERY level on the path
const moved = { ...user, address: { ...user.address, city: 'Delhi' } };
console.log(user.address.city, '->', moved.address.city);   // Pune -> Delhi
console.log('same object?', user === moved);                // false -> React re-renders

// arrays: add, remove, replace without mutating
const tags = ['a', 'b', 'c'];
console.log([...tags, 'd']);                       // add
console.log(tags.filter(t => t !== 'b'));          // remove
console.log(tags.map(t => (t === 'c' ? 'C' : t))); // replace
console.log(tags);                                 // untouched`) },
    { title: 'Setting the same value does nothing', html: `<p><code>setCount(5)</code> when count is already 5 lets React skip the re-render. That is why <code>setUser(user)</code> after mutating <code>user.name = 'x'</code> never refreshes the UI: it is literally the same object.</p>` }
  ],
  deepDive: `<p><b>How the bail-out really works.</b> React compares the new state to the old with <code>Object.is</code>. If equal, it may skip rendering the component and its children (it can still call your component once more before deciding - harmless but surprising when you log).</p>
    <p><b>Updater functions must be pure.</b> In development, Strict Mode calls them twice to catch side effects. Do not call <code>fetch</code>, change refs or touch the DOM inside <code>setX(prev =&gt; ...)</code>.</p>
    <p><b>Where does state live?</b> Not inside your function (it is destroyed after each call). React stores it in a <i>fiber</i> - an object per component instance - in a list indexed by hook call order (see "Rules of Hooks"). Because state belongs to the <i>position in the tree</i>, changing a component's <code>key</code> throws the state away; that is a clean way to "reset a form".</p>
    <p><b>Do not mirror props into state.</b> <code>useState(props.price)</code> copies the price once and never updates. If a value can be computed from props/state during render, just compute it (<code>const total = price * qty</code>). Extra state means extra chances to be out of sync.</p>
    <p><b>Scheduling.</b> Setters inside an event handler are batched; React 18's automatic batching extends this to timeouts and promises. If you truly need the DOM updated synchronously you can wrap a setter in <code>flushSync</code> - rare and slow. The setter function itself has a <b>stable identity</b>, so it is safe to omit from dependency arrays.</p>`,
  aiEra: `<p><b>What AI changes:</b> assistants write React fast, and the most common slip they make is exactly this chapter: three <code>setCount(count + 1)</code> lines, <code>items.push(x); setItems(items)</code>, or <code>useState(props.value)</code> that silently goes stale. The code looks fine and even passes a quick manual click.</p>
    <p><b>Use AI as a partner:</b> paste a component and ask <code>List every place where state is mutated or where an update depends on the previous value but is not an updater function. Do not rewrite the code.</code> You still read the answers critically.</p>
    <p><b>Tooling note:</b> the React Compiler (stable since 2025) auto-memoizes components, but it cannot fix a wrong update. The ESLint plugin <code>eslint-plugin-react-hooks</code> catches some mistakes; reasoning about snapshots catches the rest.</p>
    <p><b>What you must still own:</b> explaining to an interviewer, in two sentences, why <code>count</code> did not change after <code>setCount</code> - "state is a snapshot per render; the setter schedules the next render".</p>`,
  problems: [
    {
      title: 'Add Three Per Click',
      level: 'Easy', tags: ['useState', 'updater function', 'batching'], companies: ['Flipkart', 'Atlassian'],
      statement: `<p>A <code>ScoreBoard</code> component has a button "+3 points". The author wrote three <code>setScore(score + 1)</code> calls, but each click adds only 1. Fix it so one click adds exactly 3, and also add a "Double" button that doubles the score. Pressing "+3" and then immediately "Double" inside <b>one</b> handler (button "Combo") must give <code>(score + 3) * 2</code>.</p>`,
      constraints: `Function component with <code>useState</code> only. No extra state, no refs. React 18.`,
      example: `<p>Start <code>score = 1</code>.</p>${H.table(['Action', 'Expected next score', 'Buggy score'], [['+3', '4', H.c('r', '2')], ['Combo (+3 then double)', '(1+3)*2 = 8', H.c('r', '2')]])}<p>The bug: every line reads the frozen <code>score = 1</code> from the current render.</p>`,
      brute: {
        why: `<p>Calling <code>setScore(score + 1)</code> three times reads the same snapshot three times, so the queue is [2, 2, 2] and the result is 2. Copy-pasting the line more times never helps; the wasted work is that every line recomputes from stale data instead of from the latest queue result.</p>`,
        code: J(`function ScoreBoard() {
  const [score, setScore] = useState(1);
  const addThree = () => {
    setScore(score + 1);
    setScore(score + 1);
    setScore(score + 1);
  };
  const combo = () => {
    addThree();
    setScore(score * 2); // reads the old score too
  };
  return <button onClick={combo}>{score}</button>;
}`, 'Buggy version')
      },
      mcq: { q: 'Inside one click handler you call setScore(score + 1) three times. What does React use as the value of score in all three calls?', options: ['The value from the current render, the same for all three', 'The value after the previous setScore call', 'A random one of the queued values'], answer: 0, explain: 'score is a plain constant captured by this render. No setter call can change it. Only the updater form setScore(s => s + 1) reads the queue result.' },
      hints: [
        `<p>Hint 1: the three lines all read the same <code>score</code> constant. Nothing between them changes it. You need a way to say "add 1 to <i>whatever the latest value is</i>".</p>`,
        `<p>Hint 2: <code>useState</code> setters accept a function: <code>setScore(prev =&gt; prev + 1)</code>. React calls it with the result of the previous queue item.</p>`,
        `<p>Hint 3: recipe: write an <code>add(n)</code> helper using <code>setScore(prev =&gt; prev + n)</code>, call it once for +3, and use <code>setScore(prev =&gt; prev * 2)</code> for double. The Combo handler calls both in order; the queue gives (1+3)*2 = 8.</p>`
      ],
      solution: {
        approach: `<p>Every update that depends on the old value becomes an <b>updater function</b>. The queue is processed in order, so Combo gives <code>1 -&gt; 4 -&gt; 8</code>.</p>`,
        code: J(`import { useState } from 'react';

export function ScoreBoard() {
  const [score, setScore] = useState(1);

  // each call queues "take the latest value and add n"
  const add = (n) => setScore(prev => prev + n);
  const double = () => setScore(prev => prev * 2);

  const combo = () => {
    add(3);   // queue: prev => prev + 3
    double(); // queue: prev => prev * 2  (runs after the first one)
  };

  return (
    <div>
      <p>Score: {score}</p>
      <button onClick={() => add(3)}>+3 points</button>
      <button onClick={double}>Double</button>
      <button onClick={combo}>Combo</button>
    </div>
  );
}`, 'Fixed with updater functions'),
        alt: [R(`// Plain JS model: run the queue for the Combo click starting from score = 1
let score = 1;
const queue = [prev => prev + 3, prev => prev * 2];
for (const update of queue) score = update(score);
console.log('score after combo =', score); // 8`, 'Queue run for Combo (runnable)')],
        dry: { head: ['Queue item', 'prev', 'returns'], rows: [['prev => prev + 3', '1', '4'], ['prev => prev * 2', '4', '8']] },
        complexity: `<p>O(1) per click: each queued updater is a constant-time function and React renders once per event.</p>`,
        followUps: ['What happens if one handler mixes setScore(10) and setScore(s => s + 1)?', 'Why is it safe to leave setScore out of a dependency array?']
      }
    }
  ]
});

/* ============================ TOPIC 2: Rules of Hooks ============================ */
topics.push({
  title: 'Rules of Hooks: Why Call Order Is Everything',
  analogy: `<p>Picture a <b>row of numbered lockers</b> at a gym. When you walk in, the attendant says "first thing you store goes in locker 0, second in locker 1, third in locker 2". Next visit you say "give me my first thing" and get locker 0. The attendant never asks <i>what</i> the item is called - only <i>in which order</i> you ask.</p>
    <p>Hooks work exactly like that. React keeps a list of slots for each component and hands them out by <b>call order</b>. If on a later visit you skip one request, every later request opens the <b>wrong locker</b>.</p>`,
  explain: `<p>The two rules of hooks sound like bureaucracy until you see the locker row:</p>
    <ol>
      <li><b>Only call hooks at the top level</b> of your component or custom hook - never inside <code>if</code>, loops, nested functions, <code>try/catch</code>, or after an early <code>return</code>.</li>
      <li><b>Only call hooks from React functions</b> - function components or other hooks (names starting with <code>use</code>).</li>
    </ol>
    <p><b>Why?</b> React does not know your variable names. Inside, each component instance has a list of hook records. During a render a hidden <b>cursor</b> starts at 0; each <code>useState</code>/<code>useEffect</code>/<code>useRef</code> call takes the record under the cursor and moves it forward by one.</p>
    ${H.table(['Render', 'Call order', 'Slots in memory', 'Result'], [
      ['#1 (loggedIn = true)', 'name, age, city, effect', '[ "Ann", 30, "Pune", effect ]', H.c('g', 'slots created')],
      ['#2 (loggedIn = false)', 'name, city, effect', 'same 4 slots', H.c('r', 'city reads slot 1 = 30, effect meets a state slot -> crash')]
    ])}
    <p>React notices the mismatch and throws <code>Rendered fewer hooks than expected</code> (or <code>more</code>). Sometimes two <code>useState</code> calls swap silently and you just see a wrong value - an even nastier bug.</p>
    <p><b>The fix is almost always the same:</b> keep the hook call unconditional and put the <i>condition inside</i> (inside the effect body, inside the JSX, or in an early return placed <i>after</i> all hooks).</p>
    ${H.table(['Instead of', 'Write'], [
      ['<code>if (id) useEffect(load, [id])</code>', '<code>useEffect(() =&gt; { if (id) load(); }, [id])</code>'],
      ['<code>if (!user) return null;</code> then <code>useState</code>', 'all hooks first, <code>if (!user) return null;</code> afterwards'],
      ['hook in <code>onClick</code> / <code>map</code> callback', 'move the hook into a child component rendered per item']
    ])}`,
  clues: [
    '"Rendered more hooks than during the previous render" -> a hook sits after an early return or inside a condition',
    '"Rendered fewer hooks than expected" -> a hook is skipped on some renders',
    '"React Hook X is called conditionally" (ESLint rules-of-hooks) -> move the condition inside',
    '"hook inside a loop / callback / event handler" -> extract a child component',
    '"why must custom hooks start with use?" -> so the linter can recognise them and enforce the rules',
    '"explain how useState remembers things" -> slots array + cursor, matched by call order'
  ],
  code: [
    R(`// A MINI "React": every hook call takes the next slot, matched by CALL ORDER only.
let slots = [];     // memory that survives between renders
let cursor = 0;     // reset to 0 at the start of every render

function useState(initial) {
  const i = cursor++;
  if (i >= slots.length) slots.push({ kind: 'state', value: initial });   // first render: create
  const slot = slots[i];
  if (slot.kind !== 'state') throw new Error('Hook order changed at slot ' + i + ': slot holds ' + slot.kind + ' but got useState');
  return [slot.value, (v) => { slot.value = v; }];
}
function useEffect(fn, deps) {
  const i = cursor++;
  if (i >= slots.length) slots.push({ kind: 'effect', deps });
  const slot = slots[i];
  if (slot.kind !== 'effect') throw new Error('Hook order changed at slot ' + i + ': slot holds ' + slot.kind + ' but got useEffect');
  slot.deps = deps;
}
function render(Component, props) {
  cursor = 0;
  const out = Component(props);
  if (cursor < slots.length) throw new Error('Rendered fewer hooks than expected');
  return out;
}

// BAD component: the age hook is conditional
function BadProfile({ loggedIn }) {
  const [name] = useState('Ann');
  let age = 'n/a';
  if (loggedIn) { [age] = useState(30); }       // breaks the rule
  const [city] = useState('Pune');
  useEffect(() => {}, []);
  return name + ' / ' + age + ' / ' + city;
}

console.log('render 1:', render(BadProfile, { loggedIn: true }));
try {
  console.log('render 2:', render(BadProfile, { loggedIn: false }));
} catch (e) {
  console.log('render 2 crashed ->', e.message);
}

// GOOD component: hooks always run; the condition only decides what we SHOW
slots = [];
function GoodProfile({ loggedIn }) {
  const [name] = useState('Ann');
  const [age] = useState(30);
  const [city] = useState('Pune');
  useEffect(() => {}, []);
  return name + ' / ' + (loggedIn ? age : 'n/a') + ' / ' + city;
}
console.log('good 1:', render(GoodProfile, { loggedIn: true }));
console.log('good 2:', render(GoodProfile, { loggedIn: false }));`, 'Mini hooks runtime: why order matters (run it)'),
    J(`// WRONG: early return BEFORE the hooks
function Profile({ user }) {
  if (!user) return <p>Please log in</p>;   // render 1 stops here: 0 hooks ran
  const [tab, setTab] = useState('info');   // render 2 (user arrives): 1 hook ran -> crash
  return <Tabs tab={tab} onChange={setTab} />;
}

// RIGHT: hooks first, early return after
function ProfileFixed({ user }) {
  const [tab, setTab] = useState('info');   // always runs, always slot 0
  if (!user) return <p>Please log in</p>;
  return <Tabs tab={tab} onChange={setTab} />;
}`, 'The classic early-return mistake')
  ],
  codeTitle: ['Plain JS: a mini hooks runtime with a slots array', 'React: early return before vs after hooks'],
  viz: {
    title: 'Hook slots across renders - what a conditional hook breaks',
    input: 'T F',
    inputLabel: 'loggedIn for each render, T or F (1 to 5 values)',
    gen: function (input) {
      var toks = String(input || 'T F').trim().toUpperCase().split(/[\s,]+/).filter(Boolean), t;
      if (!toks.length || toks.length > 5 || toks.some(function (x) { return x !== 'T' && x !== 'F'; })) throw new Error('Type 1 to 5 values of T or F, for example: T F');
      var defs = {
        name: { kind: 'state', code: 'useState("Ann")', val: '"Ann"' },
        age: { kind: 'state', code: 'if (loggedIn) useState(30)', val: '30' },
        city: { kind: 'state', code: 'useState("Pune")', val: '"Pune"' },
        eff: { kind: 'effect', code: 'useEffect(fn, [])', val: 'effect' }
      };
      var frames = [], slots = [], dead = false;
      function slotText(s) { return s.kind === 'state' ? 'state ' + s.val : 'effect'; }
      for (var r = 0; r < toks.length && !dead; r++) {
        var order = ['name'];
        if (toks[r] === 'T') order.push('age');
        order.push('city', 'eff');
        var log = [];
        frames.push({ narr: '<b>Render #' + (r + 1) + '</b> with <code>loggedIn = ' + (toks[r] === 'T' ? 'true' : 'false') + '</code>. The cursor is reset to 0. This render will call ' + order.length + ' hooks, in this order: ' + order.join(', ') + '.' + (slots.length ? ' Memory already holds ' + slots.length + ' slots from before.' : ' Memory is empty, so slots will be created.'), parts: [
          { type: 'array', label: 'Slots in memory (by index)', values: slots.length ? slots.map(slotText) : ['(empty)'], showIdx: true } ] });
        for (var i = 0; i < order.length && !dead; i++) {
          var d = defs[order[i]], hl = {}, msg, verdict;
          if (i >= slots.length) {
            if (r === 0) { slots.push({ kind: d.kind, val: d.val, owner: order[i] }); verdict = 'created'; hl[i] = 'ok'; msg = 'First render: no slot ' + i + ' yet, so React creates it for <code>' + d.code + '</code>.'; }
            else { dead = true; verdict = 'CRASH'; msg = '<span class="c-r">Slot ' + i + ' does not exist - this render asks for more hooks than the last one. React throws "Rendered more hooks than during the previous render".</span>'; }
          } else if (slots[i].kind !== d.kind) {
            dead = true; hl[i] = 'bad'; verdict = 'CRASH';
            msg = '<span class="c-r">Slot ' + i + ' holds a <b>' + slots[i].kind + '</b> but this call is a <b>' + d.kind + '</b>. React cannot match them and throws an error.</span>';
          } else if (slots[i].owner !== order[i]) {
            hl[i] = 'bad'; verdict = 'WRONG DATA';
            msg = '<span class="c-r">Slot ' + i + ' belongs to <code>' + slots[i].owner + '</code>, but <code>' + order[i] + '</code> asked for it. It silently receives ' + slots[i].val + '!</span>';
          } else { hl[i] = 'ok'; verdict = 'ok'; msg = 'Slot ' + i + ' matches. <code>' + order[i] + '</code> gets its remembered value.'; }
          log.push([String(i), d.code, 'slot ' + i, i < slots.length ? slotText(slots[i]) : '-', verdict]);
          frames.push({ narr: 'Cursor at ' + i + ': ' + msg, parts: [
            { type: 'array', label: 'Slots in memory', values: slots.map(slotText), hl: hl, ptr: (function () { var p = {}; if (i < slots.length) p[i] = 'cursor'; return p; })(), showIdx: true },
            { type: 'table', label: 'Hook calls this render', columns: ['call', 'code', 'reads', 'slot holds', 'verdict'], rows: log.map(function (x) { return x.slice(); }), hl: (function () { var h = {}; h[log.length - 1] = verdict === 'ok' || verdict === 'created' ? 'ok' : 'bad'; return h; })() } ] });
        }
        if (!dead && order.length < slots.length) {
          dead = true;
          frames.push({ narr: '<span class="c-r">The render finished but only ' + order.length + ' of ' + slots.length + ' slots were used. React throws "Rendered fewer hooks than expected".</span> Even if nothing had crashed earlier, the data was already mixed up.', parts: [
            { type: 'array', label: 'Slots in memory', values: slots.map(slotText), hl: (function () { var h = {}; for (var k = order.length; k < slots.length; k++) h[k] = 'bad'; return h; })(), showIdx: true } ] });
        }
      }
      if (!dead) frames.push({ narr: '<span class="c-g">All renders matched the same slot order - no problems. Try "T F" to see a break.</span>', parts: [
        { type: 'array', label: 'Slots in memory', values: slots.map(slotText), hl: (function () { var h = {}; slots.forEach(function (s, k) { h[k] = 'ok'; }); return h; })(), showIdx: true } ] });
      return frames;
    }
  },
  examples: [
    { title: 'Early return before a hook', html: `<p>A very common crash: show a loading message first, then declare more state. On the first render (<code>data</code> is null) zero hooks after the return run; when data arrives, one more hook runs. Rule of thumb: <b>hooks first, returns after</b>.</p>`, code: J(`function Post({ id }) {
  const [post, setPost] = useState(null);
  useEffect(() => { loadPost(id).then(setPost); }, [id]);
  if (!post) return <p>Loading...</p>;      // safe: all hooks already ran
  return <h1>{post.title}</h1>;
}`) },
    { title: 'Put the condition inside the hook', html: `<p>You can still run code "only sometimes". Keep the hook call at the top level and move the <code>if</code> into the function you pass to it.</p>`, code: J(`// wrong
// if (enabled) useEffect(() => startTracking(), []);

// right
useEffect(() => {
  if (!enabled) return;                 // the condition lives INSIDE
  const stop = startTracking();
  return () => stop();
}, [enabled]);`) },
    { title: 'Hooks inside a loop: extract a component', html: `<p>You want a toggle per list item. <code>items.map(i =&gt; { const [open, setOpen] = useState(false); ... })</code> breaks the rules - the number of hooks depends on the list length. Make an <code>&lt;Item /&gt;</code> component; each instance gets its own slots.</p>`, code: J(`function Item({ title }) {
  const [open, setOpen] = useState(false);   // one slot list PER Item instance
  return <li onClick={() => setOpen(!open)}>{title} {open && '(open)'}</li>;
}
const List = ({ items }) => <ul>{items.map(i => <Item key={i.id} title={i.title} />)}</ul>;`) },
    { title: 'Same slots, different instances', html: `<p>Two <code>&lt;Counter /&gt;</code> components on one page do not share state: each instance has <b>its own</b> list of slots. The slots are tied to the component's place in the tree (and its <code>key</code>), not to the function code.</p>` }
  ],
  deepDive: `<p><b>What React really stores.</b> Each component instance is a <b>fiber</b>. Its <code>memoizedState</code> field points to a <i>linked list</i> of hook objects (not a literal array - the array picture is an easy mental model of the same idea). Every hook object has a <code>memoizedState</code> (value), <code>queue</code> (pending updates) and <code>next</code> pointer. On a render React walks that list in step with your calls.</p>
    <p><b>Dev vs production.</b> In development React compares hook <i>names</i> per slot (a "hook types changed" warning that prints a little table). In production it just trusts the order.</p>
    <p><b>Exceptions.</b> React 19's <code>use(promiseOrContext)</code> is allowed inside conditions and loops because it does not take a slot in the same way - but it still cannot be called inside <code>try/catch</code> or event handlers. Classic hooks like <code>useState</code> have no such exception.</p>
    <p><b>The lint rule.</b> <code>react-hooks/rules-of-hooks</code> (error) and <code>react-hooks/exhaustive-deps</code> (warning) use the "name starts with use" convention to find hooks. Keep both on. The React Compiler also relies on these rules to analyse your code safely.</p>
    <p><b>Why not named lookups?</b> Named hooks (<code>useState('age')</code>) would need unique strings and would break when two custom hooks both name a field <code>'value'</code>. Order-based slots make hooks composable: a custom hook can call five hooks inside, and the parent never needs to know their names.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI-generated components frequently add a quick <code>if (!data) return null;</code> near the top and then keep adding hooks below it as you ask for features. Each change looks tiny; the crash only appears when data arrives later.</p>
    <p><b>Use AI as a partner:</b> ask <code>Explain this "Rendered more hooks" error in this component and tell me which line breaks the rules. Do not change the logic.</code> Then verify against the slot-list model in your head.</p>
    <p><b>Guard rail:</b> keep <code>eslint-plugin-react-hooks</code> enabled in the repo so a broken suggestion fails in your editor, not in production. Many AI tools now read lint output and self-correct.</p>
    <p><b>What you must still own:</b> being able to draw the slots on a whiteboard. "React matches hooks by call order, so the order must never change" is the sentence interviewers listen for.</p>`,
  problems: [
    {
      title: 'Fix the Hooks Crash After Login',
      level: 'Easy', tags: ['rules of hooks', 'early return'], companies: ['Swiggy', 'Zomato'],
      statement: `<p>A <code>Dashboard</code> component shows "Please log in" while <code>user</code> is <code>null</code>, then renders a tabbed view once the user arrives. Users report the white-screen error <b>"Rendered more hooks than during the previous render"</b> right after login. Find the cause and fix it without removing any feature.</p>`,
      constraints: `Keep one <code>useState</code> for the active tab and one <code>useEffect</code> that sets the document title to the user's name. Do not split into extra components unless needed.`,
      example: `${H.table(['Render', 'user', 'Hooks that actually run'], [['#1', 'null', '0 (return happens first)'], ['#2', '{ name: "Ann" }', '2 (useState + useEffect)']])}<p>Render 1 used 0 slots, render 2 asks for 2 - React sees a different number of hooks and throws.</p>`,
      brute: {
        why: `<p>Wrapping the hooks in an <code>if (user)</code> block, or leaving the early return where it is, keeps the number of hook calls dependent on data. That is not a fix, it is the bug. The wasted effort: guessing at try/catch around hooks instead of understanding the slot list.</p>`,
        code: J(`function Dashboard({ user }) {
  if (!user) return <p>Please log in</p>;      // hooks below are skipped on render 1
  const [tab, setTab] = useState('home');
  useEffect(() => { document.title = user.name; }, [user]);
  return <Tabs tab={tab} onChange={setTab} />;
}`, 'Buggy Dashboard')
      },
      mcq: { q: 'Which change removes the crash?', options: ['Move the early return below every hook call', 'Wrap the hooks in try/catch', 'Rename the component to start with use', 'Call useState twice'], answer: 0, explain: 'The number and order of hook calls must be the same on every render. Putting the return after all hooks guarantees that. try/catch and renaming do not change the call count.' },
      hints: [
        `<p>Hint 1: count how many hooks run in render 1 (user is null) versus render 2. The numbers are different - that is the whole bug.</p>`,
        `<p>Hint 2: the hooks must run in <i>both</i> renders. So they have to be above the early <code>return</code>.</p>`,
        `<p>Hint 3: recipe: (1) declare <code>useState</code> first, (2) declare <code>useEffect</code> next and guard with <code>if (!user) return;</code> inside it, (3) then do <code>if (!user) return ...</code> for the JSX.</p>`
      ],
      solution: {
        approach: `<p>Hooks always run in the same order; the "no user" condition moves inside the effect and after the hooks for the JSX.</p>`,
        code: J(`import { useState, useEffect } from 'react';

export function Dashboard({ user }) {
  // 1) ALL hooks first - same count, same order on every render
  const [tab, setTab] = useState('home');

  useEffect(() => {
    if (!user) return;                 // the condition lives inside the effect
    document.title = user.name;
  }, [user]);

  // 2) only now decide what to show
  if (!user) return <p>Please log in</p>;

  return <Tabs tab={tab} onChange={setTab} />;
}`, 'Fixed Dashboard'),
        alt: [R(`// Count hook calls per render for the buggy and the fixed component.
function countHooks(component, props) {
  let calls = 0;
  const useState = (v) => { calls++; return [v, () => {}]; };
  const useEffect = () => { calls++; };
  component(props, useState, useEffect);
  return calls;
}
const buggy = (p, useState, useEffect) => { if (!p.user) return; useState('home'); useEffect(); };
const fixed = (p, useState, useEffect) => { useState('home'); useEffect(); if (!p.user) return; };

for (const [name, comp] of [['buggy', buggy], ['fixed', fixed]]) {
  console.log(name, 'render 1:', countHooks(comp, { user: null }), 'hooks | render 2:', countHooks(comp, { user: { name: 'Ann' } }), 'hooks');
}`, 'Counting hook calls (runnable)')],
        dry: { head: ['Version', 'Render 1 hooks', 'Render 2 hooks', 'React says'], rows: [['buggy', '0', '2', 'Rendered more hooks'], ['fixed', '2', '2', 'OK']] },
        complexity: `<p>No change in cost: two hook calls per render. The fix is purely about <b>consistent call order</b>.</p>`,
        followUps: ['What if I need the hook only for logged-in users? (Extract a LoggedInView child component.)', 'How does the lint rule detect this?']
      }
    }
  ]
});

/* ============================ TOPIC 3: useEffect ============================ */
topics.push({
  title: 'useEffect: Dependencies, Cleanup and the Infinite Loop',
  analogy: `<p>Imagine you rent a <b>hotel room</b>. When you arrive you set up your stuff (the effect). When you move to a <b>different room</b> you must first pack up the old one (the cleanup) and then set up in the new room. If you stay in the same room, nobody touches your stuff. When you check out (unmount), you pack up one last time.</p>
    <p>The <b>dependency array</b> is the rule that says "which things count as a change of room". The <b>cleanup</b> is the packing-up step that stops you leaving a mess (open connections, running timers, extra event listeners) behind.</p>`,
  explain: `<p>Rendering must stay <b>pure</b>: given props and state, return JSX, nothing else. But real apps need to talk to the outside world: fetch data, subscribe to a socket, set the page title, add a scroll listener. <code>useEffect</code> is where that work goes. React runs your effect <b>after</b> it has put the new screen on the page.</p>
    <pre>useEffect(() =&gt; {
  // setup: runs after render
  return () =&gt; { /* cleanup: runs before the next setup, and on unmount */ };
}, [dep1, dep2]);</pre>
    ${H.table(['Dependency array', 'When does the effect run?', 'Typical use'], [
      ['<i>no array</i>', 'after <b>every</b> render', 'rare; almost always a mistake'],
      ['<code>[]</code>', 'once after the first render (and cleanup on unmount)', 'one-time setup: subscribe, start a timer'],
      ['<code>[id, query]</code>', 'first render, then whenever <code>id</code> or <code>query</code> changed', 'fetch for the current id']
    ])}
    <p><b>The order of events</b> when a dependency changes: render -&gt; screen updated -&gt; <b>cleanup of the previous effect</b> (using the old values it captured) -&gt; <b>new effect</b> (using the new values). The cleanup always belongs to the render that created it.</p>
    <p><b>Dependency honesty rule:</b> list <i>every</i> reactive value (props, state, functions made inside the component) that your effect reads. Not because React is picky - because the effect function is a <b>closure</b> over one render, and a missing dependency means it keeps using an old photo of that value (see "Stale Closures").</p>
    <p><b>Comparison is by <code>Object.is</code>:</b> numbers and strings compare by value; objects, arrays and functions compare by identity. A new <code>{}</code> or <code>[]</code> or arrow function created during render is a <i>different</i> thing every render - the root of most infinite loops.</p>
    <p><b>When NOT to use an effect:</b> if you can calculate something from props/state during render (filtered list, full name, total price), do it in render. Effects are for syncing with things <i>outside</i> React.</p>`,
  clues: [
    '"subscribe / unsubscribe", "add and remove listener", "start and clear a timer" -> effect with cleanup',
    '"runs on every render" / "network request fired in a loop" / "Maximum update depth exceeded" -> missing or unstable dependency array',
    '"fetch when the id changes" -> dependency array <code>[id]</code> plus abort/ignore cleanup',
    '"runs twice in development" -> Strict Mode mounts, unmounts and re-mounts to check your cleanup',
    '"value inside effect is old" -> missing dependency (stale closure)',
    '"derive state from props in an effect" -> you probably do not need an effect; compute during render'
  ],
  code: [
    J(`import { useEffect, useState } from 'react';

function UserCard({ userId }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const controller = new AbortController();   // lets us cancel the request

    fetch('/api/users/' + userId, { signal: controller.signal })
      .then(res => res.json())
      .then(setUser)
      .catch(err => { if (err.name !== 'AbortError') console.error(err); });

    // cleanup: runs before the next effect (userId changed) and on unmount
    return () => controller.abort();
  }, [userId]);                                  // re-run only when userId changes

  return user ? <h2>{user.name}</h2> : <p>Loading...</p>;
}`, 'Fetch with a dependency and abort cleanup (React)'),
    R(`// Mini model of useEffect: compare deps, run previous cleanup, run the new effect.
function sameDeps(a, b) {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => Object.is(x, b[i]));
}
let saved = null;   // what React remembers: { deps, cleanup }

function runEffect(effect, deps) {
  if (saved && sameDeps(saved.deps, deps)) { console.log('  deps same -> skip'); return; }
  if (saved && saved.cleanup) saved.cleanup();          // 1) pack up the old room
  saved = { deps, cleanup: effect() };                  // 2) set up the new room
}

function render(userId) {
  console.log('render userId=' + userId);
  runEffect(() => {
    console.log('  effect : subscribe to user ' + userId);
    return () => console.log('  cleanup: unsubscribe from user ' + userId); // remembers ITS userId
  }, [userId]);
}

[1, 1, 2, 2, 3].forEach(render);
console.log('unmount');
if (saved.cleanup) saved.cleanup();`, 'Effect timeline model (run it)')
  ],
  codeTitle: ['React: effect with dependency and abort cleanup', 'Plain JS: effect/cleanup timeline model'],
  viz: [
    {
      title: 'Effect and cleanup timeline across renders',
      input: '1 1 2 2 3',
      inputLabel: 'userId on each render (2 to 8 values, space separated)',
      gen: function (input) {
        var vals = String(input || '').trim().split(/[\s,]+/).filter(Boolean);
        if (vals.length < 2 || vals.length > 8) throw new Error('Enter 2 to 8 values like: 1 1 2 2 3');
        var frames = [], rows = [], prev = null, i, hl;
        function copy() { return rows.map(function (r) { return r.slice(); }); }
        function cols() { return ['render', 'userId', 'deps changed?', 'cleanup ran', 'effect ran']; }
        for (i = 0; i < vals.length; i++) {
          var v = vals[i], changed = i === 0 || v !== prev;
          rows.push([String(i + 1), v, i === 0 ? 'first render' : (changed ? 'yes (' + prev + ' -> ' + v + ')' : 'no'), '', '']);
          hl = {}; hl[rows.length - 1] = 'cur';
          frames.push({ narr: '<b>Render #' + (i + 1) + '</b> with <code>userId = ' + v + '</code>. React builds the screen and commits it. ' + (i === 0 ? 'First time: the effect must run.' : changed ? 'Dependency <code>[' + prev + ']</code> vs <code>[' + v + ']</code>: <b>changed</b>.' : 'Dependency <code>[' + prev + ']</code> vs <code>[' + v + ']</code>: <b>same</b>, so React skips the effect.'), parts: [
            { type: 'vars', label: 'This render', vals: { userId: v, 'previous deps': prev === null ? '-' : '[' + prev + ']' }, hl: { userId: 'cur' } },
            { type: 'table', label: 'Timeline', columns: cols(), rows: copy(), hl: hl } ] });
          if (changed) {
            if (i > 0) {
              rows[rows.length - 1][3] = 'unsubscribe ' + prev;
              hl = {}; hl[rows.length - 1] = 'bad';
              frames.push({ narr: 'Before running the new effect, React runs the <b>cleanup</b> that the previous effect returned. That cleanup remembers <code>userId = ' + prev + '</code> (its own render), so it unsubscribes from the right user.', parts: [
                { type: 'vars', label: 'Cleanup uses the old closure', vals: { 'closure userId': prev }, hl: { 'closure userId': 'bad' } },
                { type: 'table', label: 'Timeline', columns: cols(), rows: copy(), hl: hl } ] });
            }
            rows[rows.length - 1][4] = 'subscribe ' + v;
            hl = {}; hl[rows.length - 1] = 'ok';
            frames.push({ narr: 'Now the <b>effect</b> runs and subscribes to user <b>' + v + '</b>. It also returns the next cleanup for later.', parts: [
              { type: 'queue', label: 'Active subscription', items: ['user ' + v], hl: { 0: 'ok' } },
              { type: 'table', label: 'Timeline', columns: cols(), rows: copy(), hl: hl } ] });
          } else {
            rows[rows.length - 1][3] = '-'; rows[rows.length - 1][4] = '- (skipped)';
          }
          prev = v;
        }
        rows.push(['unmount', '-', '-', 'unsubscribe ' + prev, '-']);
        hl = {}; hl[rows.length - 1] = 'bad';
        frames.push({ narr: 'The component leaves the screen (<b>unmount</b>). One last cleanup runs so the subscription to user ' + prev + ' does not leak.', parts: [
          { type: 'queue', label: 'Active subscription', items: [] },
          { type: 'table', label: 'Timeline', columns: cols(), rows: copy(), hl: hl } ] });
        return frames;
      }
    },
    {
      title: 'Why an effect can loop forever (and the fix)',
      input: 'object-dep',
      inputLabel: 'Type: no-deps, object-dep, or fixed',
      gen: function (input) {
        var mode = String(input || 'object-dep').trim().toLowerCase();
        if (['no-deps', 'object-dep', 'fixed'].indexOf(mode) < 0) throw new Error('Type no-deps, object-dep or fixed');
        var codeTxt = {
          'no-deps': 'useEffect(() => {\n  setCount(c => c + 1);\n});            // no array: runs after EVERY render',
          'object-dep': 'const params = { role: filter };   // new object each render\nuseEffect(() => {\n  fetchUsers(params).then(setUsers);\n}, [params]);',
          'fixed': 'useEffect(() => {\n  fetchUsers({ role: filter }).then(setUsers);\n}, [filter]);       // primitive dependency'
        };
        var frames = [], rows = [], max = 5, n, hl;
        function copy() { return rows.map(function (r) { return r.slice(); }); }
        frames.push({ narr: 'The component code for the <b>' + mode + '</b> case. Watch what happens after each render.', parts: [
          { type: 'code', label: 'Component', lang: 'js', code: codeTxt[mode], hl: { 1: 'cur' } } ] });
        for (n = 1; n <= (mode === 'fixed' ? 2 : max); n++) {
          var changed, why;
          if (mode === 'no-deps') { changed = true; why = 'no dependency array, so React runs the effect after every render'; }
          else if (mode === 'object-dep') { changed = true; why = n === 1 ? 'first render' : 'deps [params#' + (n - 1) + '] vs [params#' + n + ']: new object, <code>Object.is</code> says different'; }
          else { changed = n === 1; why = n === 1 ? 'first render' : 'deps [filter] vs [filter]: same string, skip'; }
          rows.push([String(n), why.replace(/<[^>]*>/g, ''), changed ? 'RUNS' : 'skipped', changed && mode !== 'fixed' ? 'new state -> render ' + (n + 1) : (changed ? 'new users -> render 2' : 'nothing')]);
          hl = {}; hl[rows.length - 1] = changed ? (mode === 'fixed' ? 'ok' : 'bad') : 'ok';
          frames.push({ narr: '<b>Render #' + n + '.</b> ' + why.charAt(0).toUpperCase() + why.slice(1) + '. ' + (changed ? (mode === 'fixed' ? 'The effect runs once and stores the result.' : 'The effect runs and sets state with a <b>new</b> value, which schedules render ' + (n + 1) + '.') : '<span class="c-g">No effect, no new state, no more renders. The loop is over.</span>'), parts: [
            { type: 'table', label: 'Render log', columns: ['render', 'dependency check', 'effect', 'then'], rows: copy(), hl: hl },
            { type: 'vars', label: 'Counters', vals: { 'renders so far': n, 'effect runs': rows.filter(function (r) { return r[2] === 'RUNS'; }).length }, hl: { 'effect runs': mode === 'fixed' ? 'ok' : 'bad' } } ] });
        }
        if (mode !== 'fixed') frames.push({ narr: '<span class="c-r">...and so on forever.</span> In the browser you see a frozen tab, a flood of network requests, or the error "Maximum update depth exceeded". The cause: <b>every run of the effect creates a reason for the next run</b>.', parts: [
          { type: 'table', label: 'Render log', columns: ['render', 'dependency check', 'effect', 'then'], rows: copy().concat([['6, 7, 8 ...', 'same story', 'RUNS', 'forever']]), hl: { 5: 'bad' } } ] });
        else frames.push({ narr: 'Fix recap: depend on the <b>primitive</b> (<code>filter</code>), or build the object <i>inside</i> the effect, or memoize it. Always ask: "what value really decides when to re-fetch?"', parts: [
          { type: 'code', label: 'Fixed component', lang: 'js', code: codeTxt.fixed, hl: { 3: 'ok' } } ] });
        return frames;
      }
    }
  ],
  examples: [
    { title: 'Event listener with cleanup', html: `<p>Add a listener in the effect and <b>remove the same function</b> in the cleanup. Forget the cleanup and every re-mount (or dependency change) stacks another listener - the "my handler fires 5 times" bug.</p>`, code: J(`function WindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);   // same function reference
  }, []);                                                          // setWidth is stable
  return <p>{width}px</p>;
}`) },
    { title: 'Ignoring out-of-date responses', html: `<p>If the user changes <code>query</code> quickly, an older request may finish <i>after</i> a newer one. The cleanup flips a flag so the stale answer is thrown away.</p>`, code: J(`useEffect(() => {
  let ignore = false;
  search(query).then(results => { if (!ignore) setResults(results); });
  return () => { ignore = true; };        // the old effect's flag becomes true
}, [query]);`) },
    { title: 'Strict Mode runs your effect twice', html: `<p>In development, React 18/19 Strict Mode does <b>mount -&gt; unmount -&gt; mount</b> once to prove your cleanup is correct. If your effect "breaks" when run twice (duplicate subscriptions, double analytics), the cleanup is missing. This does not happen in production builds.</p>`, code: R(`// Simulating Strict Mode: setup, cleanup, setup again
let connections = 0;
function setup() { connections++; console.log('connect, open connections =', connections); return () => { connections--; console.log('disconnect, open connections =', connections); }; }
const cleanup1 = setup();   // first mount
cleanup1();                 // Strict Mode pretend-unmount
const cleanup2 = setup();   // real mount
console.log('final open connections:', connections); // 1 -> no leak, because cleanup existed`) },
    { title: 'You might not need an effect', html: `<p>Bad: an effect that copies props into state ("when <code>items</code> changes, filter them and <code>setVisible</code>"). It renders twice and can flash old data. Good: <code>const visible = items.filter(...)</code> during render (wrap in <code>useMemo</code> only if it is truly slow).</p>`, code: J(`// extra state + effect (avoid)
const [visible, setVisible] = useState([]);
useEffect(() => { setVisible(items.filter(i => i.done === showDone)); }, [items, showDone]);

// derive during render (prefer)
const visible2 = items.filter(i => i.done === showDone);`) }
  ],
  deepDive: `<p><b>Timing.</b> <code>useEffect</code> callbacks run after the browser has painted (React schedules them, usually right after paint). Use <code>useLayoutEffect</code> when you must measure the DOM and change something <i>before</i> the user sees the frame (tooltips, scroll restoration); it blocks painting, so use it sparingly. On the server neither runs.</p>
    <p><b>Order guarantees.</b> For one component: all cleanups of the previous render run first, then all new effects, in declaration order. Across components: children's effects run before parents'. Cleanups for an unmounting component run before effects of mounting ones.</p>
    <p><b>Event handlers vs effects.</b> If something happens <i>because the user did something</i> (click, submit), do it in the event handler - you know exactly what happened. An effect is for "this component is now on screen with these values, so keep the outside world in sync". Putting a POST request in an effect that watches <code>submitted</code> is a classic design smell.</p>
    <p><b>Fixing dependency pain without lying.</b> (1) Move the object/function <i>inside</i> the effect. (2) Depend on a primitive. (3) Use an updater <code>setX(x =&gt; ...)</code> so you need not read <code>x</code>. (4) Wrap with <code>useMemo</code>/<code>useCallback</code> if it must be shared. (5) In new React, <code>useEffectEvent</code> lets an effect read the latest value without re-running (the "latest handler" pattern). Never silence the lint rule with a comment unless you can explain why.</p>
    <p><b>Data fetching reality.</b> Hand-written fetch effects are fine to learn and for small apps, but they miss caching, retries, deduplication and race handling. Production apps usually use React Query, SWR, or framework loaders (covered in the State Management module). Interviewers still ask you to write the effect by hand - with abort cleanup.</p>`,
  aiEra: `<p><b>What AI changes:</b> assistants love <code>useEffect</code>. Ask for "derived data" and you often get an effect plus extra state, which causes double renders and loops. They also write <code>// eslint-disable-next-line react-hooks/exhaustive-deps</code> to make warnings disappear - that hides stale-closure bugs instead of fixing them.</p>
    <p><b>Use AI as a partner:</b> <code>Review these effects. For each one say: is it syncing with an external system, or could it be computed during render or handled in an event handler? List missing cleanup.</code> That turns the model into a reviewer, not an author.</p>
    <p><b>Watch for:</b> missing <code>AbortController</code>, effects that fetch on every keystroke without debounce, and objects in dependency arrays. Run the app in Strict Mode and watch the Network tab: duplicate calls reveal bad cleanup.</p>
    <p><b>What you must still own:</b> drawing the render -&gt; cleanup -&gt; effect timeline on a whiteboard, and explaining why the cleanup sees the <i>old</i> values.</p>`,
  problems: [
    {
      title: 'Explain and Fix an Infinite Effect Loop',
      level: 'Medium', tags: ['useEffect', 'dependencies', 'infinite loop', 'referential equality'], companies: ['Meta', 'Uber', 'Razorpay'],
      statement: `<p>A <code>UserList</code> component takes a <code>filter</code> prop and loads users when it changes. After deploying, the network tab shows hundreds of identical requests per second and the tab freezes. <b>Explain exactly why it loops</b>, then fix it so the request is made once per distinct <code>filter</code>.</p>`,
      constraints: `The API helper <code>fetchUsers(params)</code> returns a promise of a <b>new array</b> every call. You may not change <code>fetchUsers</code>. Keep a single <code>useEffect</code>.`,
      example: `${H.table(['Step', 'What happens'], [['render 1', '<code>params = {role: "admin"}</code> (object #1) -&gt; effect runs'], ['effect', 'fetch resolves -&gt; <code>setUsers(new array)</code>'], ['render 2', 'new <code>params</code> object #2 !== #1 -&gt; effect runs again'], ['...', 'repeat forever']])}<p>Two things feed each other: a <b>new object dependency</b> and an effect that <b>sets state</b>.</p>`,
      brute: {
        why: `<p>"Just remove the dependency array" or "add an eslint-disable comment" makes the effect run after <i>every</i> render - still a loop, just more honest. Adding <code>setTimeout</code> throttles the symptom. The wasted work is one fetch per render forever, because the dependency changes identity on every render even though its content never changes.</p>`,
        code: J(`function UserList({ filter }) {
  const [users, setUsers] = useState([]);
  const params = { role: filter };            // brand-new object every render
  useEffect(() => {
    fetchUsers(params).then(setUsers);        // new array -> state changes -> render again
  }, [params]);                               // new identity every time -> effect again
  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
}`, 'Looping version')
      },
      mcq: { q: 'Which dependency array is the right fix if the effect only needs the filter text?', options: ['[filter]', '[params]', '[users]', 'no dependency array'], answer: 0, explain: '[filter] is a string, so Object.is compares it by value and it only changes when the filter really changes. [params] is a new object each render; [users] changes after every fetch and loops; no array runs every render.' },
      hints: [
        `<p>Hint 1: an effect runs again when a dependency is different according to <code>Object.is</code>. Is <code>{ role: 'admin' } === { role: 'admin' }</code>?</p>`,
        `<p>Hint 2: the loop needs two parts: something that makes the effect re-run (unstable dependency) and something the effect does that causes another render (<code>setUsers</code>). Breaking either part stops it; the first is the real bug.</p>`,
        `<p>Hint 3: recipe: build the params object <i>inside</i> the effect, depend only on the primitive <code>filter</code>, and add a cleanup flag so a slow older response cannot overwrite a newer one.</p>`
      ],
      solution: {
        approach: `<p><b>Why it looped:</b> <code>params</code> is recreated on every render, so React sees a changed dependency each time and re-runs the effect; the effect sets state to a new array which causes another render, creating another <code>params</code>, and so on.</p>
          <p><b>Fix:</b> the effect should depend on what truly decides the request - the string <code>filter</code> - and construct the object inside.</p>`,
        code: J(`import { useEffect, useState } from 'react';

export function UserList({ filter }) {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    let ignore = false;                          // guards against out-of-order responses
    const params = { role: filter };             // created INSIDE: not a dependency
    fetchUsers(params).then(list => { if (!ignore) setUsers(list); });
    return () => { ignore = true; };
  }, [filter]);                                  // primitive: only changes when filter changes

  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
}`, 'Fixed version'),
        alt: [R(`// Simulate renders: count how often the effect runs for each dependency choice.
function simulate(useStableDep, cap) {
  let prevDep, effectRuns = 0, renders = 0, users = [];
  while (renders < cap) {
    renders++;
    const filter = 'admin';
    const params = { role: filter };                 // new object each render
    const dep = useStableDep ? filter : params;
    if (renders === 1 || !Object.is(dep, prevDep)) { // effect runs?
      effectRuns++;
      users = [{ id: 1 }];                           // fetchUsers returns a NEW array every time
      prevDep = dep;
      continue;                                      // new state value -> another render
    }
    break;                                           // nothing changed -> loop ends
  }
  return { renders, effectRuns };
}
console.log('deps [params] ->', simulate(false, 8), '(stopped by our cap of 8!)');
console.log('deps [filter] ->', simulate(true, 8));`, 'Loop simulation (runnable)')],
        dry: { head: ['Render', 'dep [params]', 'effect', 'dep [filter]', 'effect'], rows: [['1', 'obj#1', 'runs', '"admin"', 'runs'], ['2', 'obj#2 (new)', 'runs', '"admin" (same)', 'skipped'], ['3', 'obj#3 (new)', 'runs', '"admin"', 'skipped']] },
        complexity: `<p>Before: unbounded requests (one per render, forever). After: exactly one request per distinct <code>filter</code> value, O(changes).</p>`,
        followUps: ['What if the filter were an object prop passed by the parent? (Depend on its fields, or memoize it in the parent with useMemo.)', 'How would AbortController improve on the ignore flag?']
      }
    }
  ]
});

/* ============================ TOPIC 4: Stale closures ============================ */
topics.push({
  title: 'Stale Closures: When a Function Remembers Old Values',
  analogy: `<p>On Monday you print the <b>price list</b> and hand a copy to a delivery boy. On Wednesday prices change and you print a new list - but the boy keeps charging customers from <b>Monday's copy</b> because nobody gave him the new one.</p>
    <p>Each render prints a new price list (the values of <code>props</code> and <code>state</code>). Any function created in that render - a click handler, a <code>setInterval</code> callback, an effect - keeps the copy from <i>its</i> render. If that function lives longer than one render (a timer, a listener, a promise), it may keep reading an <b>old copy</b>. That is a <b>stale closure</b>.</p>`,
  explain: `<p>This is not a React trick, it is plain JavaScript. A <b>closure</b> is a function plus the variables around it when it was created. In a React component, <code>const [count, setCount] = useState(0)</code> creates a <b>brand-new constant <code>count</code> on every render</b>. A function made in render #1 sees render #1's <code>count</code> forever.</p>
    <p>The classic bug - a counter that sticks at 1:</p>
    <pre>useEffect(() =&gt; {
  const id = setInterval(() =&gt; setCount(count + 1), 1000); // count is 0 here, forever
  return () =&gt; clearInterval(id);
}, []);   // "run once" -&gt; the callback is never replaced</pre>
    <p>The effect ran once, in render #1, so the interval keeps the callback that saw <code>count = 0</code>. Every second it says "set count to 0 + 1". The screen shows 1 and never moves.</p>
    ${H.table(['Fix', 'How it works', 'Trade-off'], [
      ['<b>Updater function</b> <code>setCount(c =&gt; c + 1)</code>', 'does not read <code>count</code> at all; React supplies the latest value', 'best choice when you only need the previous state'],
      ['<b>Add the dependency</b> <code>[count]</code>', 'effect re-runs, old interval cleared, new callback sees new count', 'timer restarts every change; fine for short effects'],
      ['<b>Ref to the latest value</b> <code>ref.current = count</code>', 'callback reads <code>ref.current</code>, which always holds the newest value', 'mutable escape hatch; use for "latest callback" patterns'],
      ['<b>useReducer</b> <code>dispatch({ type: "tick" })</code>', 'reducer receives current state; <code>dispatch</code> never changes', 'great when logic grows']
    ])}
    <p><b>Where stale closures hide:</b> <code>setInterval</code>/<code>setTimeout</code> callbacks, event listeners added in effects, debounced/throttled functions, <code>useCallback</code> with a missing dependency, async functions that <code>await</code> then use state, and WebSocket <code>onmessage</code> handlers.</p>
    <p><b>Bonus:</b> sometimes the "stale" value is what you want. An alert shown 3 seconds after a click should show what the screen displayed <i>when you clicked</i>. Know which behaviour you are after.</p>`,
  clues: [
    '"counter works the first time then stops / sticks at 1" -> interval callback closed over initial state',
    '"setTimeout/alert shows the old value" -> closure from the render where it was created',
    '"my event listener sees old props" -> effect with <code>[]</code> but reads props inside',
    '"useCallback returns an old function" -> dependency array missing a value it uses',
    '"exhaustive-deps warning: missing dependency" -> the lint rule is warning about exactly this',
    '"read latest state without re-subscribing" -> updater function or ref (or <code>useEffectEvent</code>)'
  ],
  code: [
    J(`import { useState, useEffect, useRef } from 'react';

// BUG: sticks at 1
function BrokenTimer() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setCount(count + 1), 1000);  // stale: count is 0
    return () => clearInterval(id);
  }, []);
  return <h1>{count}</h1>;
}

// FIX 1: updater function - no need to read count
function TimerUpdater() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setCount(c => c + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return <h1>{count}</h1>;
}

// FIX 2: ref always holds the latest value
function TimerRef() {
  const [count, setCount] = useState(0);
  const latest = useRef(count);
  latest.current = count;                        // updated on every render
  useEffect(() => {
    const id = setInterval(() => setCount(latest.current + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return <h1>{count}</h1>;
}`, 'The bug and two fixes (React)'),
    R(`// Simulate four timer strategies for 5 ticks and print what the SCREEN shows.
function simulate(strategy, ticks) {
  let state = 0;                         // React's stored state
  const ref = { current: 0 };
  let tickCallback = null;               // the function the interval keeps calling
  const shown = [];

  function render() {
    const count = state;                 // the snapshot of THIS render (a new const each time)
    ref.current = count;
    shown.push(count);
    const make = {
      bug:     () => count + 1,                  // captured count
      updater: () => (c) => c + 1,               // does not capture count
      deps:    () => count + 1,                  // captured, but the callback is replaced every render
      ref:     () => ref.current + 1             // reads the latest through the ref
    }[strategy];
    if (tickCallback === null || strategy === 'deps') tickCallback = make;  // effect re-runs only for deps
  }

  render();
  for (let t = 0; t < ticks; t++) {
    const update = tickCallback();
    const next = typeof update === 'function' ? update(state) : update;
    if (!Object.is(next, state)) { state = next; render(); }   // same value -> React skips render
  }
  return shown;
}

for (const s of ['bug', 'updater', 'deps', 'ref']) {
  console.log(s.padEnd(8), 'screen over time:', simulate(s, 5).join(' -> '));
}`, 'Four strategies, one table of results (run it)')
  ],
  codeTitle: ['React: broken timer and two fixes', 'Plain JS: simulate the strategies'],
  viz: {
    title: 'Stale closure vs fixes: what the interval callback can see',
    input: 'bug 5',
    inputLabel: 'strategy (bug, updater, deps, ref) and ticks (3 to 8)',
    gen: function (input) {
      var p = String(input || 'bug 5').trim().toLowerCase().split(/[\s,]+/);
      var mode = p[0], ticks = parseInt(p[1] || '5', 10);
      if (['bug', 'updater', 'deps', 'ref'].indexOf(mode) < 0 || isNaN(ticks) || ticks < 3 || ticks > 8) throw new Error('Format: strategy ticks, for example "bug 5". Strategies: bug, updater, deps, ref');
      var live = 0, renderNo = 1, cbRender = 1, cbCaptured = 0, rows = [], frames = [], t;
      var desc = {
        bug: 'The effect ran once with <code>[]</code>. The interval keeps the callback from <b>render #1</b>, which captured <code>count = 0</code>.',
        updater: 'The callback is <code>c =&gt; c + 1</code>. It captures nothing, React feeds it the latest state.',
        deps: 'Dependency <code>[count]</code>: after each render the old interval is cleared and a new one is created with a fresh closure.',
        ref: 'The callback reads <code>latest.current</code>, a box that every render overwrites with the newest count.'
      };
      frames.push({ narr: '<b>Render #1</b>: <code>count = 0</code>. The effect starts an interval. ' + desc[mode], parts: [
        { type: 'vars', label: 'Closures', vals: { 'live count (screen)': 0, 'callback made in render': 1, 'count that callback captured': mode === 'updater' ? 'nothing' : (mode === 'ref' ? 'reads ref' : 0) }, hl: { 'live count (screen)': 'ok' } },
        { type: 'text', html: 'Strategy: <b>' + mode + '</b>' } ] });
      for (t = 1; t <= ticks; t++) {
        var arg, newLive, expl;
        if (mode === 'bug') { arg = cbCaptured + 1; newLive = arg; expl = 'callback computes <code>0 + 1 = 1</code> (its photo is stale)'; }
        else if (mode === 'updater') { arg = 'c =&gt; c + 1'; newLive = live + 1; expl = 'React runs the updater on the latest state <b>' + live + '</b> and gets <b>' + newLive + '</b>'; }
        else if (mode === 'deps') { arg = cbCaptured + 1; newLive = arg; expl = 'callback from render #' + cbRender + ' captured <b>' + cbCaptured + '</b>, so <code>' + cbCaptured + ' + 1</code>'; }
        else { arg = 'ref.current + 1'; newLive = live + 1; expl = 'the ref holds the newest count <b>' + live + '</b>, so <code>' + live + ' + 1</code>'; }
        var changed = newLive !== live, argText = String(arg);
        var rowCaptured = mode === 'updater' ? '-' : (mode === 'ref' ? 'ref = ' + live : String(cbCaptured));
        rows.push([String(t), 'render #' + cbRender, rowCaptured, argText.replace(/&gt;/g, '>'), String(newLive), changed ? 'yes' : 'no (same value)']);
        var msg = '<b>Tick ' + t + '.</b> ' + expl + '. ' + (changed ? 'State becomes <b>' + newLive + '</b>, React re-renders.' : '<span class="c-r">Same value as before, so React skips the render. The screen is stuck.</span>');
        live = newLive;
        if (changed) { renderNo++; if (mode === 'deps') { cbRender = renderNo; cbCaptured = live; msg += ' The effect re-runs: old interval cleared, new callback captures <b>' + live + '</b>.'; } }
        var h = {}; h[rows.length - 1] = changed ? 'ok' : 'bad';
        frames.push({ narr: msg, parts: [
          { type: 'vars', label: 'Closures', vals: { 'live count (screen)': live, 'callback made in render': mode === 'updater' ? 'render #1 (captures nothing)' : cbRender, 'count that callback captured': mode === 'updater' ? 'nothing' : (mode === 'ref' ? 'reads ref' : cbCaptured) }, hl: { 'live count (screen)': changed ? 'ok' : 'bad' } },
          { type: 'table', label: 'Tick log', columns: ['tick', 'callback from', 'captured count', 'setCount(arg)', 'new state', 're-render?'], rows: rows.map(function (r) { return r.slice(); }), hl: h } ] });
      }
      frames.push({ narr: mode === 'bug' ? '<span class="c-r">After ' + ticks + ' ticks the screen shows ' + live + ', but it should show ' + ticks + '.</span> Try the strategies <code>updater</code>, <code>deps</code> and <code>ref</code> - they all reach ' + ticks + '.' : '<span class="c-g">The screen reached ' + live + ' as expected.</span> ' + (mode === 'deps' ? 'Cost: the interval was torn down and rebuilt on every tick.' : 'The interval was created once and never torn down.'), parts: [
        { type: 'vars', label: 'Result', vals: { 'expected': ticks, 'screen shows': live }, hl: { 'screen shows': live === ticks ? 'ok' : 'bad' } } ] });
      return frames;
    }
  },
  examples: [
    { title: 'Why closures are the cause (plain JS)', html: `<p>No React needed to reproduce it. Each call of <code>makeRender(n)</code> creates a new <code>n</code> and a function that remembers it - just like each render creates a new <code>count</code>. The function stored early keeps the early value.</p>`, code: R(`function makeRender(count) {
  return { log: () => console.log('callback sees count =', count) };
}
const render1 = makeRender(0);
const render2 = makeRender(1);
const render3 = makeRender(2);

const intervalCallback = render1.log;   // the timer was created during render 1
intervalCallback();                      // 0 (stale!)
intervalCallback();                      // 0
render3.log();                           // 2 (a function from the newest render is fine)`) },
    { title: 'Alert after 3 seconds: stale or fresh?', html: `<p>Two requirements, two answers. "Show what the user saw when they clicked" -&gt; the plain closure is <b>correct</b>. "Show the newest message even if it changed during the 3 seconds" -&gt; read from a ref.</p>`, code: J(`function Message({ text }) {
  const latest = useRef(text);
  latest.current = text;

  const showSnapshot = () => setTimeout(() => alert('clicked at: ' + text), 3000);          // closure
  const showLatest = () => setTimeout(() => alert('right now: ' + latest.current), 3000);   // ref
  return <><button onClick={showSnapshot}>snapshot</button><button onClick={showLatest}>latest</button></>;
}`) },
    { title: 'Event listener with a missing dependency', html: `<p>A key listener registered once with <code>[]</code> reads <code>score</code> from render #1. The lint rule <code>exhaustive-deps</code> warns about this. Fix by re-subscribing on change (cheap for listeners) or by an updater.</p>`, code: J(`useEffect(() => {
  const onKey = (e) => { if (e.key === ' ') setScore(s => s + 1); };   // updater: no stale score
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}, []);`) },
    { title: 'async/await keeps the old render', html: `<p>After an <code>await</code>, the code continues in the same function call, so it still sees the props and state of the render that started it - even if the user changed things meanwhile. That is why requests need an <code>ignore</code> flag or an AbortController.</p>` }
  ],
  deepDive: `<p><b>Closures capture variables, not magic.</b> JavaScript closures capture <i>bindings</i>. React makes it feel like "snapshots" because every render calls your function again, creating fresh <code>const</code> bindings. A <code>let</code> or a mutable object (<code>ref.current</code>) is shared between renders, so closures see its newest value. That is the entire reason refs work as an escape hatch.</p>
    <p><b>The "latest ref" pattern</b> keeps a stable callback that always calls the newest logic: <code>const cb = useRef(fn); useLayoutEffect(() =&gt; { cb.current = fn; });</code> and then use <code>cb.current(...)</code> inside the interval. This is the heart of the well-known <code>useInterval</code> hook. Official React now has <code>useEffectEvent</code> for the same purpose: a function that always sees latest props/state but is <i>not</i> a dependency of the effect.</p>
    <p><b>Updater functions and reducers.</b> Because <code>dispatch</code> and the <code>setState</code> setter have stable identity, callbacks that only call them never go stale. Moving logic into a reducer removes whole classes of stale-closure bugs: the reducer is called by React with the real current state.</p>
    <p><b>Trade-off of the dependency fix.</b> Adding <code>[count]</code> re-creates the interval each tick: for a 1-second ticker the drift is tiny, but for a 10 ms animation or a WebSocket you would reconnect constantly. Choose updater or ref in those cases.</p>
    <p><b>Memoized callbacks.</b> <code>useCallback(fn, [])</code> is a stale-closure factory if <code>fn</code> reads state. The React Compiler can analyse and memoize correctly, but it assumes you follow the rules and will not rescue code that intentionally lies about dependencies.</p>`,
  aiEra: `<p><b>What AI changes:</b> a model asked for "a timer hook" often returns the broken version (<code>[]</code> plus <code>setCount(count + 1)</code>) because it looks like thousands of examples online. It can also "fix" the lint warning by deleting the dependency, which preserves the bug.</p>
    <p><b>Use AI as a partner:</b> paste a hook and ask <code>Trace three renders. For each function created inside, list which render's values it can see. Where could a value be stale?</code> This forces the right mental model. Then ask for the smallest fix (updater, ref or dependency) and its trade-off.</p>
    <p><b>Debugging tip:</b> add <code>console.log('render', count)</code> in the component and <code>console.log('tick sees', count)</code> inside the callback. If the two numbers disagree, you have found a stale closure in seconds.</p>
    <p><b>What you must still own:</b> choosing between updater, ref and dependency based on the requirement - "show clicked-at value" versus "always newest value" - something a model cannot know without you.</p>`,
  problems: [
    {
      title: 'Fix the Stale-Closure Interval Bug',
      level: 'Medium', tags: ['stale closure', 'setInterval', 'useRef', 'useEffect'], companies: ['Google', 'Amazon', 'PhonePe'],
      statement: `<p>This <code>Countdown</code> component starts at 10 and should tick down every second, stop at 0, and call <code>onDone()</code> exactly once. Instead it shows 9 and freezes. Fix it. Also make sure that if the parent passes a <b>new</b> <code>onDone</code> function on every render, the <b>latest</b> one is the one that is called, without restarting the timer.</p>`,
      constraints: `One interval for the whole countdown (do not restart it each second). Clean up on unmount. React 18, function components only.`,
      example: `${H.table(['Second', 'Buggy screen', 'Expected'], [['0', '10', '10'], ['1', '9', '9'], ['2', H.c('r', '9 (stuck)'), '8'], ['10', H.c('r', '9'), '0 and onDone() called once']])}<p>The interval callback closed over <code>seconds = 10</code>, so it always computes 10 - 1.</p>`,
      brute: {
        why: `<p>Re-creating the interval whenever <code>seconds</code> changes (dependency <code>[seconds]</code>) works but tears down and builds a timer every second, and it re-subscribes whenever the parent's <code>onDone</code> changes. Using <code>setTimeout</code> chains has the same cost. The real fix avoids reading the changing values inside a long-lived callback.</p>`,
        code: J(`function Countdown({ onDone }) {
  const [seconds, setSeconds] = useState(10);
  useEffect(() => {
    const id = setInterval(() => {
      setSeconds(seconds - 1);               // stale: seconds is always 10
      if (seconds - 1 === 0) onDone();       // also stale
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return <h1>{seconds}</h1>;
}`, 'Buggy version')
      },
      mcq: { q: 'Which approach keeps ONE interval alive for the whole countdown and still reads the newest onDone?', options: ['Updater for the number plus a ref that stores the latest onDone', 'Add [seconds, onDone] as dependencies', 'Use setTimeout inside render', 'Declare seconds with let'], answer: 0, explain: 'The updater needs no dependency and a ref always holds the latest callback, so the effect can safely use [] and never restart. Adding the dependencies recreates the interval.' },
      hints: [
        `<p>Hint 1: the interval callback was created in render 1. What value of <code>seconds</code> can it see? Which tools let a long-lived function read the <i>latest</i> value?</p>`,
        `<p>Hint 2: two separate problems: (a) the changing number - use <code>setSeconds(s =&gt; s - 1)</code>; (b) the changing parent callback - store it in a ref that you refresh every render.</p>`,
        `<p>Hint 3: calling <code>onDone</code> inside the updater is a side effect (Strict Mode runs updaters twice). Better: a second effect that watches <code>seconds === 0</code>, or check inside an effect with <code>[seconds]</code>.</p>`
      ],
      solution: {
        approach: `<p>One interval, created once. The number uses an updater. The parent's callback lives in a ref refreshed on each render. A small separate effect reacts to <code>seconds === 0</code> and calls the latest <code>onDone</code> exactly once and stops the timer by unmounting logic.</p>`,
        code: J(`import { useState, useEffect, useRef } from 'react';

export function Countdown({ onDone }) {
  const [seconds, setSeconds] = useState(10);

  // always holds the newest onDone, without being a dependency
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; });

  // ONE interval for the whole life of the component
  useEffect(() => {
    const id = setInterval(() => {
      setSeconds(s => (s > 0 ? s - 1 : 0));    // updater: never stale
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // react to reaching zero (runs when seconds changes, calls the newest onDone once)
  useEffect(() => {
    if (seconds === 0) onDoneRef.current();
  }, [seconds]);

  return <h1>{seconds}</h1>;
}`, 'Fixed Countdown'),
        alt: [R(`// Plain JS model: 3 seconds, interval created once, latest callback read from a box.
let seconds = 3;
const onDoneRef = { current: () => console.log('done (v1)') };
const timer = setInterval(() => {
  seconds = seconds > 0 ? seconds - 1 : 0;              // updater-style: based on the latest value
  console.log('tick ->', seconds);
  if (seconds === 0) { onDoneRef.current(); clearInterval(timer); }
}, 50);
setTimeout(() => { onDoneRef.current = () => console.log('done (v2, newest callback)'); }, 70); // parent re-rendered`, 'Countdown model (runnable)')],
        dry: { head: ['Tick', 'Callback reads', 'New seconds', 'Note'], rows: [['1', 'updater: s=10', '9', 'screen 9'], ['2', 'updater: s=9', '8', 'not stuck'], ['10', 'updater: s=1', '0', 'effect calls onDone once']] },
        complexity: `<p>O(1) work per tick, one timer for the component's life. Compared with the dependency approach (timer rebuilt every second) this avoids needless clearInterval/setInterval churn.</p>`,
        followUps: ['How would useEffectEvent simplify the onDone ref?', 'What changes if the countdown must pause and resume?']
      }
    }
  ]
});

/* ============================ TOPIC 5: useRef ============================ */
topics.push({
  title: 'useRef: A Box That Survives Renders Without Re-Rendering',
  analogy: `<p>State is the <b>scoreboard</b> in a stadium: whenever the number changes, the board lights up and everybody looks at it. A ref is your <b>private notebook</b> in your pocket. You can write in it all day and the stadium does not react - but the notebook is still with you tomorrow.</p>
    <p>Use the scoreboard (state) for things the screen must show. Use the notebook (ref) for things your code needs to remember but the screen does not care about: a timer id, the previous value, a button element you want to focus.</p>`,
  explain: `<p><code>useRef(initial)</code> returns <b>one object</b> <code>{ current: initial }</code>. React gives you the <i>same object</i> on every render. You may read and change <code>ref.current</code> whenever you like, and React will <b>not</b> re-render because of it.</p>
    ${H.table(['', 'useState', 'useRef'], [
      ['Changing it re-renders?', H.c('g', 'Yes'), H.c('r', 'No')],
      ['Survives between renders?', 'Yes', 'Yes'],
      ['How to change', 'setter (never mutate)', 'just assign <code>ref.current = x</code> (mutable)'],
      ['Safe to read during render?', 'Yes', H.c('r', 'Avoid - may be out of date, breaks purity')],
      ['Use for', 'anything shown on screen', 'DOM nodes, timer/socket ids, previous values, "latest" copies']
    ])}
    <p><b>Three jobs of a ref:</b></p>
    <ol>
      <li><b>Touch a DOM element.</b> Put <code>ref={myRef}</code> on a tag; after the screen is committed, <code>myRef.current</code> is the real DOM node. Use it to <code>focus()</code>, <code>scrollIntoView()</code>, measure, or play a video.</li>
      <li><b>Remember a value that is not UI.</b> Interval ids (so you can clear them), an <code>AbortController</code>, a "has this already run?" flag, a render counter.</li>
      <li><b>Keep the latest value for long-lived callbacks</b> (the fix for stale closures).</li>
    </ol>
    <p><b>Gotcha:</b> because changing a ref does not re-render, the screen can show an <i>old</i> ref value until something else triggers a render. If the user must see it, it belongs in state.</p>
    <p><b>Rule:</b> do not read or write <code>ref.current</code> <i>while rendering</i> (the only exception is setting it once if empty). Do it in event handlers and effects. Rendering must stay a pure calculation.</p>`,
  clues: [
    '"focus the input on mount / after click", "scroll to element", "measure width" -> DOM ref',
    '"store a timer id / interval id so I can clear it later" -> ref (no re-render needed)',
    '"value from the previous render" -> <code>usePrevious</code> built with a ref + effect',
    '"update without re-rendering", "mutable instance variable" -> ref',
    '"count how many times the component rendered" -> ref counter (state would loop)',
    '"read the latest state inside a setTimeout / listener" -> latest-value ref'
  ],
  code: [
    J(`import { useRef, useEffect, useState } from 'react';

function SearchBox() {
  const inputRef = useRef(null);          // will hold the real <input> element
  const renders = useRef(0);              // plain number, not shown on screen
  const timerId = useRef(null);           // remembers a timeout id between renders

  renders.current += 1;                   // allowed here: only a debug counter

  useEffect(() => {
    inputRef.current.focus();             // DOM is ready: focus on mount
  }, []);

  function onChange() {
    clearTimeout(timerId.current);        // cancel the previous pending timeout
    timerId.current = setTimeout(() => console.log('typed:', inputRef.current.value), 300);
  }

  return <input ref={inputRef} onChange={onChange} placeholder="type here" />;
}

// usePrevious: the classic ref + effect combo
function usePrevious(value) {
  const ref = useRef();
  useEffect(() => { ref.current = value; });  // runs AFTER the render, so render still sees the old value
  return ref.current;
}`, 'Three jobs of useRef (React)'),
    R(`// Model: a ref is just ONE object kept alive by React; state changes cause new "photos".
const ref = { current: undefined };      // created once (same object every render)
const history = [];

function renderComponent(value) {
  const previous = ref.current;          // read during render: still the OLD value
  history.push({ value, previous });
  // ...the effect runs after the render and updates the box
  ref.current = value;
}

[1, 1, 5, 5, 2].forEach(renderComponent);
history.forEach((h, i) => console.log('render #' + (i + 1), 'value =', h.value, '| previous =', h.previous));
// Notice render #2: value 1, previous 1. usePrevious gives the previous RENDER, not the previous CHANGE.`, 'Ref survives renders (run it)')
  ],
  codeTitle: ['React: focus, timer id, usePrevious', 'Plain JS: a ref model'],
  viz: {
    title: 'State vs ref: what re-renders and what the screen shows',
    input: 's r r s r o',
    inputLabel: 'actions: s = setState (+1), r = ref.current += 1, o = other re-render (e.g. parent)',
    gen: function (input) {
      var acts = String(input || 's r r s').trim().toLowerCase().split(/[\s,]+/).filter(Boolean);
      if (acts.length < 2 || acts.length > 10 || acts.some(function (a) { return ['s', 'r', 'o'].indexOf(a) < 0; })) throw new Error('Use 2 to 10 letters from s, r, o, e.g. "s r r s"');
      var state = 0, ref = 0, shownState = 0, shownRef = 0, renders = 1, rows = [], frames = [], i;
      function parts(hl, extra) {
        var vals = { 'state (in React)': state, 'ref.current (in the box)': ref, 'screen: state': shownState, 'screen: ref': shownRef };
        var out = [{ type: 'vars', label: 'Memory vs screen', vals: vals, hl: hl || {} }, { type: 'bars', label: 'Renders so far', values: [renders], texts: [String(renders)] }];
        if (rows.length) out.push({ type: 'table', label: 'Log', columns: ['#', 'action', 'state', 'ref.current', 're-render?', 'screen shows (state / ref)'], rows: rows.map(function (r) { return r.slice(); }), hl: extra || {} });
        return out;
      }
      frames.push({ narr: 'First render. The component shows <code>state = 0</code> and <code>ref.current = 0</code>. The ref box now exists and React will hand us the same box every time.', parts: parts({ 'screen: state': 'ok', 'screen: ref': 'ok' }) });
      for (i = 0; i < acts.length; i++) {
        var a = acts[i], rerender, msg, h = {};
        if (a === 's') { state++; rerender = true; msg = '<b>setState</b>: state becomes ' + state + '. React schedules a render, and that render reads <b>both</b> state and the ref box.'; }
        else if (a === 'r') { ref++; rerender = false; msg = '<b>ref.current += 1</b>: the box now holds ' + ref + ', but <span class="c-r">nothing re-renders</span>. The screen still shows the old number.'; }
        else { rerender = true; msg = '<b>Another re-render</b> (for example the parent updated). The component runs again and picks up whatever is in the ref box right now.'; }
        if (rerender) { renders++; shownState = state; shownRef = ref; msg += ' The screen now shows state ' + shownState + ' and ref ' + shownRef + '.'; }
        rows.push([String(i + 1), a === 's' ? 'setState' : (a === 'r' ? 'ref += 1' : 'other render'), String(state), String(ref), rerender ? 'yes' : 'no', shownState + ' / ' + shownRef]);
        h[rows.length - 1] = rerender ? 'ok' : 'cur';
        var hv = { 'screen: ref': shownRef !== ref ? 'bad' : 'ok' };
        if (a === 'r') hv['ref.current (in the box)'] = 'cur';
        if (a === 's') hv['state (in React)'] = 'cur';
        frames.push({ narr: msg, parts: parts(hv, h) });
      }
      frames.push({ narr: shownRef !== ref ? '<span class="c-r">The ref and the screen disagree (' + ref + ' vs ' + shownRef + ').</span> That is the trade-off: refs are great for hidden bookkeeping, not for things the user must see.' : 'Everything is in sync right now, but only because a render happened after the last ref change.', parts: parts({}) });
      return frames;
    }
  },
  examples: [
    { title: 'Focus an input after a click', html: `<p>Refs let you give an order to a DOM node, which is not something JSX props can describe. Never use <code>document.getElementById</code> inside React - the ref is safer (it follows the component's own element).</p>`, code: J(`function Form() {
  const nameRef = useRef(null);
  return (
    <>
      <input ref={nameRef} />
      <button onClick={() => nameRef.current.focus()}>Focus name</button>
    </>
  );
}`) },
    { title: 'Counting renders without an infinite loop', html: `<p>If you used <code>useState</code> to count renders, every <code>setCount</code> would cause another render and loop. A ref counter is silent. Handy for debugging "why is this re-rendering so often".</p>`, code: J(`function Debug() {
  const count = useRef(0);
  count.current++;                        // a debug-only write during render
  console.log('render number', count.current);
  return null;
}`) },
    { title: 'Keeping a stopwatch id', html: `<p>A stopwatch needs the interval id in two different places: start (set it) and stop (clear it). State would re-render for nothing; a local <code>let</code> is recreated each render and forgets. A ref is the right tool.</p>`, code: J(`function Stopwatch() {
  const [ms, setMs] = useState(0);
  const idRef = useRef(null);
  const start = () => { if (idRef.current === null) idRef.current = setInterval(() => setMs(m => m + 10), 10); };
  const stop = () => { clearInterval(idRef.current); idRef.current = null; };
  useEffect(() => stop, []);               // clear on unmount
  return <><b>{(ms / 1000).toFixed(2)}s</b><button onClick={start}>Start</button><button onClick={stop}>Stop</button></>;
}`) },
    { title: 'Callback refs for measuring', html: `<p>Instead of an object you can pass a <b>function</b> to <code>ref</code>. React calls it with the node when it appears and with <code>null</code> when it goes away - perfect for measuring an element the moment it mounts without an extra effect.</p>`, code: J(`const [height, setHeight] = useState(0);
const measure = useCallback(node => { if (node) setHeight(node.getBoundingClientRect().height); }, []);
return <div ref={measure}>Content</div>;`) }
  ],
  deepDive: `<p><b>What a ref really is.</b> <code>useRef</code> is nearly <code>useState(() =&gt; ({ current: initial }))[0]</code>: an object created once and stored in the hook slot, with no setter. Mutating it bypasses React entirely, which is both its power and its danger.</p>
    <p><b>DOM refs timing.</b> React sets <code>ref.current</code> during the commit phase (before layout effects and effects run) and sets it back to <code>null</code> when the element is removed. So inside <code>useEffect</code> a DOM ref is ready, inside render on the first pass it is still <code>null</code>.</p>
    <p><b>Refs to components.</b> A ref on your own component does nothing unless the component forwards it. In React 19 <code>ref</code> is simply a prop on function components; in React 18 you wrap the component in <code>forwardRef</code>. <code>useImperativeHandle</code> lets a child expose a small API (<code>focus()</code>, <code>reset()</code>) instead of its whole DOM node.</p>
    <p><b>usePrevious quirks.</b> It returns the value from the previous <i>render</i>. If the component re-renders for another reason, <code>previous === current</code>. If you want "the last value that was different", store both and update only when <code>!Object.is(prev, value)</code>. Concurrent rendering can also render without committing, which is why the ref is updated in an effect and not during render.</p>
    <p><b>When not to use a ref.</b> If a value must change what the user sees, use state. If a value can be derived from props/state, compute it. Refs for "just one more flag" turn into hidden state machines that are hard to debug and break under Strict Mode and concurrent features.</p>`,
  aiEra: `<p><b>What AI changes:</b> assistants reach for <code>useRef</code> quickly - sometimes correctly (focus, timers), sometimes to dodge a dependency warning by hiding state in a ref, which makes the UI silently stop updating. They also read <code>ref.current</code> during render and call it "optimization".</p>
    <p><b>Use AI as a partner:</b> ask <code>For every useRef in this file, classify it: DOM node, instance variable, or latest-value copy. Flag any that holds data the UI displays.</code> Anything in the last group is probably a bug.</p>
    <p><b>Testing tip:</b> Testing Library focuses on what the user sees. A ref used for focus is testable with <code>expect(input).toHaveFocus()</code>; ask AI to write that test and check it fails when you remove the effect.</p>
    <p><b>What you must still own:</b> the sentence "state is for UI, refs are for things React does not need to know about" and the ability to explain why changing a ref does not update the screen.</p>`,
  problems: [
    {
      title: 'Build usePrevious',
      level: 'Easy', tags: ['useRef', 'custom hook', 'useEffect'], companies: ['Microsoft', 'Cred'],
      statement: `<p>Write a hook <code>usePrevious(value)</code> that returns the value the argument had on the <b>previous render</b> (or <code>undefined</code> on the first render). Use it in a <code>PriceTag</code> that shows an arrow: green up when the price rose, red down when it fell. Do not add extra renders.</p>`,
      constraints: `Works for numbers, strings and objects. No state inside the hook. Must not cause extra re-renders.`,
      example: `${H.table(['Render', 'price', 'usePrevious(price)', 'Arrow'], [['1', '100', 'undefined', '-'], ['2', '120', '100', H.c('g', 'up')], ['3', '90', '120', H.c('r', 'down')]])}<p>On render 2 the hook returns 100 even though the ref is updated to 120 afterwards - because the effect runs after render.</p>`,
      brute: {
        why: `<p>Keeping the old value in <code>useState</code> and updating it in an effect works but causes <b>one extra render for every change</b>, and on that extra render the "previous" already equals the current value, so the arrow flickers away. State is the wrong tool: nobody needs to display the box itself.</p>`,
        code: J(`function usePreviousState(value) {
  const [prev, setPrev] = useState();
  useEffect(() => { setPrev(value); }, [value]);   // extra render, then prev === value
  return prev;
}`, 'State-based version (extra renders)')
      },
      mcq: { q: 'Why does usePrevious update the ref inside useEffect instead of during render?', options: ['So the render still reads the OLD value, and the update happens after the screen is committed', 'Because refs cannot be changed in render at all', 'To make the hook run twice', 'Because effects run before render'], answer: 0, explain: 'Effects run after the render. During the render the ref still holds the previous value (that is what we return); afterwards the effect stores the new one for next time. It also keeps render pure and safe for concurrent rendering.' },
      hints: [
        `<p>Hint 1: you need a place that remembers a value between renders but does not trigger a render when written. Which hook offers that?</p>`,
        `<p>Hint 2: return the ref's current content during render, and overwrite it later, after render. Which hook runs "after render"?</p>`,
        `<p>Hint 3: recipe: <code>const ref = useRef();</code> <code>useEffect(() =&gt; { ref.current = value; });</code> <code>return ref.current;</code>. No dependency array, so it updates after every render.</p>`
      ],
      solution: {
        approach: `<p>A ref stores the value silently; an effect with no dependency array refreshes it <i>after</i> each render. The hook returns what the ref held <i>before</i> that refresh.</p>`,
        code: J(`import { useRef, useEffect } from 'react';

export function usePrevious(value) {
  const ref = useRef(undefined);        // survives renders, never triggers one
  useEffect(() => {
    ref.current = value;                // runs AFTER the render finished
  });                                   // no deps: update on every render
  return ref.current;                   // during render: still last render's value
}

export function PriceTag({ price }) {
  const prev = usePrevious(price);
  const arrow = prev === undefined ? '' : price > prev ? 'UP' : price < prev ? 'DOWN' : '';
  return <span className={arrow.toLowerCase()}>{price} {arrow}</span>;
}

// Variant: previous DIFFERENT value (ignores renders where nothing changed)
export function usePreviousDistinct(value) {
  const state = useRef({ prev: undefined, curr: value });
  if (!Object.is(state.current.curr, value)) {
    state.current = { prev: state.current.curr, curr: value };   // allowed: derived bookkeeping only
  }
  return state.current.prev;
}`, 'usePrevious and a distinct variant'),
        alt: [R(`// Runnable model of the hook over a list of renders
function makeUsePrevious() {
  const ref = { current: undefined };
  return function usePrevious(value) {
    const seen = ref.current;      // read during render
    ref.current = value;           // stands in for the effect that runs after render
    return seen;
  };
}
const usePrevious = makeUsePrevious();
for (const price of [100, 120, 90, 90]) {
  const prev = usePrevious(price);
  const arrow = prev === undefined ? '-' : price > prev ? 'up' : price < prev ? 'down' : 'same';
  console.log('price', price, 'prev', prev, 'arrow', arrow);
}`, 'Hook model (runnable)')],
        dry: { head: ['Render', 'value', 'ref before render', 'returns', 'ref after effect'], rows: [['1', '100', 'undefined', 'undefined', '100'], ['2', '120', '100', '100', '120'], ['3', '90', '120', '120', '90']] },
        complexity: `<p>O(1) time and space per render and no extra re-renders (compared with the state version, which renders twice per change).</p>`,
        followUps: ['How do you get the previous value that was actually different?', 'Why can this hook disagree with reality in concurrent rendering if updated during render?']
      }
    }
  ]
});

/* ============================ TOPIC 6: useMemo / useCallback / React.memo ============================ */
topics.push({
  title: 'useMemo, useCallback and React.memo: Caching Without Fooling Yourself',
  analogy: `<p>A chef gets the same order twice: "pasta for 4". If nothing changed (same table, same guests), the smart chef reuses the <b>sauce already made</b> instead of cooking it again. That is <code>useMemo</code>: remember the result of slow work, as long as the ingredients (dependencies) are the same.</p>
    <p>Now the waiter hands the kitchen a <b>new note</b> every time, even though it says the same thing. The kitchen cannot tell it is the same, so it re-cooks. A new function or object created in every render is that "new note": same content, different identity. <code>useCallback</code> and <code>useMemo</code> keep the <i>same note</i> so a <code>React.memo</code> child can say "nothing changed, skip".</p>`,
  explain: `<p>First, the default: <b>when a component re-renders, all of its children re-render too</b> (even if their props are the same). Usually that is fast and fine. Memoization is only for the cases where it is measurably slow.</p>
    ${H.table(['Tool', 'What it remembers', 'Skips what?'], [
      ['<code>useMemo(() =&gt; compute(a, b), [a, b])</code>', 'the <b>result</b> of a calculation', 'the calculation itself'],
      ['<code>useCallback(fn, [a, b])</code>', 'the <b>function</b> (same as <code>useMemo(() =&gt; fn, deps)</code>)', 'creating a new function identity'],
      ['<code>React.memo(Child)</code>', 'the last <b>props</b> of a component', 're-rendering the child if props are shallow-equal']
    ])}
    <p><b>Identity is the key idea.</b> <code>{} === {}</code> is <code>false</code> and <code>(() =&gt; 1) === (() =&gt; 1)</code> is <code>false</code>. Every render creates new objects, arrays and functions. A <code>React.memo</code> child that receives <code>onClick={() =&gt; add()}</code> sees a different prop every time, so memo does nothing. Wrap the handler in <code>useCallback</code> and the identity stays the same until a dependency changes.</p>
    <p><b>How the cache works:</b> React keeps <i>one</i> remembered entry per hook: the last dependencies and the last result. On each render it compares the new dependencies to the saved ones with <code>Object.is</code>. Equal -&gt; <span class="c-g">hit</span>, return the saved result. Different -&gt; <span class="c-r">miss</span>, recompute and overwrite. It is not a big lookup table: going 5 -&gt; 6 -&gt; 5 recomputes at the second 5.</p>
    <p><b>When to use them:</b></p>
    <ul>
      <li>The calculation is really slow (sorting/filtering thousands of items) - measure with the Profiler or <code>console.time</code> first.</li>
      <li>A value is a <b>dependency</b> of an effect, or the <b>props</b> of a <code>memo</code> child, or the <b>value of a context</b>, and you need a stable identity.</li>
    </ul>
    <p><b>When not to:</b> cheap work, everything "just in case", or to fix a logic bug. Each memo has a cost (the comparison and memory), and wrong dependencies create stale closures. In React 19 the <b>React Compiler</b> can add this caching automatically at build time.</p>`,
  clues: [
    '"typing in one input makes the whole big list lag" -> memoize the expensive derived list and/or the row component',
    '"child re-renders even though its props look the same" -> unstable function/object identity; memo + useCallback/useMemo',
    '"React.memo does not work" -> a prop is a new object/array/function each render',
    '"useEffect runs too often because of an object dependency" -> stabilise it with useMemo or move it inside',
    '"should I wrap everything in useMemo?" -> no, measure first; only for slow work or identity needs',
    '"Context consumers re-render on every provider render" -> memoize the context value'
  ],
  code: [
    J(`import { useMemo, useCallback, useState, memo } from 'react';

const Row = memo(function Row({ item, onSelect }) {
  console.log('render row', item.id);                 // watch how often this prints
  return <li onClick={() => onSelect(item.id)}>{item.name}</li>;
});

export function ProductList({ items }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [dark, setDark] = useState(false);            // unrelated state

  // 1) cache the slow filter: only re-runs when items or query change
  const visible = useMemo(
    () => items.filter(i => i.name.toLowerCase().includes(query.toLowerCase())),
    [items, query]
  );

  // 2) stable function identity so memo(Row) can skip re-rendering
  const handleSelect = useCallback((id) => setSelected(id), []);   // setSelected is stable

  return (
    <div className={dark ? 'dark' : ''}>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <button onClick={() => setDark(d => !d)}>theme</button>
      <ul>{visible.map(i => <Row key={i.id} item={i} onSelect={handleSelect} />)}</ul>
      <p>selected: {selected}</p>
    </div>
  );
}`, 'useMemo + useCallback + React.memo working together'),
    R(`// Model of useMemo: ONE saved entry (deps + result). Compare with Object.is.
function makeUseMemo() {
  let saved = null;
  return function useMemo(compute, deps) {
    if (saved && deps.length === saved.deps.length && deps.every((d, i) => Object.is(d, saved.deps[i]))) {
      return { value: saved.value, hit: true };
    }
    const value = compute();
    saved = { deps, value };
    return { value, hit: false };
  };
}

let expensiveCalls = 0;
const useMemo = makeUseMemo();
const slowSquare = (n) => { expensiveCalls++; return n * n; };

for (const n of [5, 5, 6, 6, 5]) {
  const r = useMemo(() => slowSquare(n), [n]);
  console.log('n =', n, '->', r.value, r.hit ? 'HIT (reused)' : 'MISS (computed)');
}
console.log('slowSquare ran', expensiveCalls, 'times for 5 renders');   // 3: only one entry is kept

// useCallback is the same idea for functions: same deps -> same function object
const useCallback = (fn, deps) => makeUseMemo()(() => fn, deps).value;
const f1 = () => 1, f2 = () => 1;
console.log('different arrows equal?', f1 === f2);   // false -> this is why memo children re-render`, 'useMemo cache model (run it)')
  ],
  codeTitle: ['React: list with useMemo, useCallback, memo', 'Plain JS: a one-entry cache model'],
  viz: [
    {
      title: 'useMemo cache: hit or miss on each render',
      input: '5 5 6 6 5',
      inputLabel: 'dependency value on each render (numbers, up to 10)',
      gen: function (input) {
        var vals = String(input || '').trim().split(/[\s,]+/).filter(Boolean).map(Number);
        if (vals.length < 2 || vals.length > 10 || vals.some(isNaN)) throw new Error('Enter 2 to 10 numbers like: 5 5 6 6 5');
        var frames = [], cache = [], calls = 0, hits = 0, rows = [], i;
        function copy() { return rows.map(function (r) { return r.slice(); }); }
        frames.push({ narr: 'The component calls <code>useMemo(() =&gt; slowSquare(n), [n])</code> on every render. React keeps <b>one</b> saved entry: the last deps and the last result. It starts empty.', parts: [
          { type: 'map', label: 'useMemo saved entry (deps -> result)', entries: [] },
          { type: 'vars', label: 'Counters', vals: { 'slowSquare calls': 0, hits: 0 } } ] });
        for (i = 0; i < vals.length; i++) {
          var n = vals[i], hit = cache.length > 0 && cache[0][0] === '[' + n + ']';
          if (hit) {
            hits++;
            rows.push([String(i + 1), String(n), 'HIT', String(n * n), String(calls)]);
            frames.push({ narr: '<b>Render ' + (i + 1) + '</b>, n = ' + n + '. Saved deps <code>' + cache[0][0] + '</code> equal new deps <code>[' + n + ']</code> by <code>Object.is</code>. <span class="c-g">Cache hit</span>: return <b>' + n * n + '</b> without calling <code>slowSquare</code>.', parts: [
              { type: 'map', label: 'useMemo saved entry', entries: cache.map(function (e) { return e.slice(); }), hl: (function () { var h = {}; h[cache[0][0]] = 'ok'; return h; })() },
              { type: 'table', label: 'Render log', columns: ['render', 'n', 'result', 'value', 'slowSquare calls so far'], rows: copy(), hl: (function () { var h = {}; h[rows.length - 1] = 'ok'; return h; })() } ] });
          } else {
            calls++;
            var was = cache.length ? cache[0][0] : 'nothing';
            cache = [['[' + n + ']', n * n]];
            rows.push([String(i + 1), String(n), 'MISS', String(n * n), String(calls)]);
            frames.push({ narr: '<b>Render ' + (i + 1) + '</b>, n = ' + n + '. Saved deps were <code>' + was + '</code>, new deps are <code>[' + n + ']</code>. <span class="c-r">Cache miss</span>: run <code>slowSquare(' + n + ')</code> = <b>' + n * n + '</b> and overwrite the single saved entry.' + (i > 0 && vals.slice(0, i).indexOf(n) >= 0 && vals[i - 1] !== n ? ' Note: we computed ' + n + ' before, but React only keeps the <i>latest</i> entry.' : ''), parts: [
              { type: 'map', label: 'useMemo saved entry', entries: cache.map(function (e) { return e.slice(); }), hl: (function () { var h = {}; h[cache[0][0]] = 'cur'; return h; })() },
              { type: 'table', label: 'Render log', columns: ['render', 'n', 'result', 'value', 'slowSquare calls so far'], rows: copy(), hl: (function () { var h = {}; h[rows.length - 1] = 'bad'; return h; })() } ] });
          }
        }
        frames.push({ narr: 'Summary: ' + vals.length + ' renders, only <b>' + calls + '</b> expensive calls and <b>' + hits + '</b> cache hits. If your number does not change between renders (typical when other state changes), the work is skipped.', parts: [
          { type: 'vars', label: 'Totals', vals: { renders: vals.length, 'slowSquare calls': calls, hits: hits }, hl: { 'slowSquare calls': 'cur', hits: 'ok' } } ] });
        return frames;
      }
    },
    {
      title: 'React.memo child: does a new function prop break it?',
      input: 'plain 4',
      inputLabel: 'plain or callback, then parent renders (2 to 6)',
      gen: function (input) {
        var p = String(input || 'plain 4').trim().toLowerCase().split(/[\s,]+/);
        var mode = p[0], n = parseInt(p[1] || '4', 10);
        if (['plain', 'callback'].indexOf(mode) < 0 || isNaN(n) || n < 2 || n > 6) throw new Error('Format: plain 4  or  callback 4');
        var frames = [], rows = [], fnId = 1, i;
        function copy() { return rows.map(function (r) { return r.slice(); }); }
        function graph(parentHl, childHl) {
          var hl = {}; hl.Parent = parentHl; hl.Child = childHl;
          return { type: 'graph', label: 'Component tree', directed: true, height: 40, nodes: [{ id: 'Parent', label: 'Parent (typing)', x: 22, y: 20, shape: 'box', w: 26 }, { id: 'Child', label: 'memo(Child)', x: 74, y: 20, shape: 'box', w: 24 }], edges: [['Parent', 'Child', 'onSave']], hl: hl };
        }
        frames.push({ narr: 'A parent has an input (state) and a <code>memo(Child)</code> that receives <code>onSave</code>. Mode: <b>' + mode + '</b> (' + (mode === 'plain' ? '<code>const onSave = () =&gt; save()</code> in the body' : '<code>const onSave = useCallback(() =&gt; save(), [])</code>') + '). Each keystroke re-renders the parent.', parts: [graph('', ''), { type: 'text', html: 'Question: does the child re-render when the parent only changed its own text?' }] });
        for (i = 1; i <= n; i++) {
          if (mode === 'plain' && i > 1) fnId++;
          var first = i === 1, same = mode === 'callback' || first ? !first : false;
          var childRenders = first || mode === 'plain';
          rows.push([String(i), first ? 'first render' : 'typed a letter', 'fn#' + fnId, first ? '-' : (same ? 'same' : 'different'), childRenders ? 'RE-RENDERS' : 'skipped']);
          var h = {}; h[rows.length - 1] = childRenders ? (first ? 'cur' : 'bad') : 'ok';
          frames.push({ narr: '<b>Parent render ' + i + '.</b> ' + (first ? 'Everything renders for the first time. <code>onSave</code> is function #' + fnId + '.' : (mode === 'plain' ? 'A brand-new <code>onSave</code> (function #' + fnId + ') is created. memo compares props with <code>Object.is</code>: #' + (fnId - 1) + ' vs #' + fnId + ' differ, so <span class="c-r">the child must re-render</span>.' : '<code>useCallback</code> returns the saved function #1. memo sees the same prop, so <span class="c-g">the child is skipped</span>.')), parts: [
            graph('cur', childRenders ? 'cur' : 'done'),
            { type: 'table', label: 'Log', columns: ['parent render', 'cause', 'onSave', 'prop vs last', 'child'], rows: copy(), hl: h } ] });
        }
        var cr = rows.filter(function (r) { return r[4] === 'RE-RENDERS'; }).length;
        frames.push({ narr: 'Result: the child rendered <b>' + cr + '</b> of ' + n + ' times. ' + (mode === 'plain' ? 'The <code>memo</code> wrapper was wasted effort. Try <code>callback ' + n + '</code>.' : 'Only the first render. This is what <code>memo</code> + <code>useCallback</code> buys you.'), parts: [
          { type: 'vars', label: 'Child renders', vals: { 'parent renders': n, 'child renders': cr }, hl: { 'child renders': mode === 'plain' ? 'bad' : 'ok' } } ] });
        return frames;
      }
    }
  ],
  examples: [
    { title: 'Filtering 5000 items on every keystroke', html: `<p>Typing in a search box re-renders the page on each letter. The filter only needs to run when <code>items</code> or <code>query</code> changes. If the parent also has a theme toggle, flipping the theme should not redo the filter. That is the natural place for <code>useMemo</code>.</p>`, code: J(`const visible = useMemo(() => {
  console.time('filter');
  const out = items.filter(i => i.title.includes(query));
  console.timeEnd('filter');           // measure before you decide it is needed
  return out;
}, [items, query]);`) },
    { title: 'Inline objects defeat React.memo', html: `<p><code>&lt;Chart style={{ width: 200 }} /&gt;</code> creates a new <code>style</code> object every render, so a memoized <code>Chart</code> never skips. Fix: move constants outside the component, or <code>useMemo</code> them when they depend on state.</p>`, code: J(`const CHART_STYLE = { width: 200 };           // created once, outside the component

function Dashboard({ color }) {
  const options = useMemo(() => ({ color, animate: false }), [color]);  // depends on a prop
  return <Chart style={CHART_STYLE} options={options} />;
}`) },
    { title: 'Stabilise a context value', html: `<p>A provider that writes <code>value={{ user, logout }}</code> hands every consumer a new object each time the provider re-renders. Memoize the value so consumers only re-render when <code>user</code> truly changes.</p>`, code: J(`function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const logout = useCallback(() => setUser(null), []);
  const value = useMemo(() => ({ user, logout }), [user, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}`) },
    { title: 'useMemo is a hint, not a promise', html: `<p>React may throw away cached values (for example to free memory) and recompute. Your code must still be correct if the calculation runs again. Never put side effects (fetch, logging you rely on, mutation) inside <code>useMemo</code>.</p>` }
  ],
  deepDive: `<p><b>Cost model.</b> Each <code>useMemo</code>/<code>useCallback</code> call still allocates the callback or array of dependencies on every render and does the comparison. For tiny work this is more expensive than recomputing. A good rule: memoize when the work takes more than about a millisecond (Profiler / <code>console.time</code>) <i>or</i> when identity matters for an effect, a memo child or a context.</p>
    <p><b>Shallow equality.</b> <code>React.memo</code> compares each prop with <code>Object.is</code>. You can pass a custom comparison function as the second argument, but that is rarely a good idea: comparing deep objects costs the same as re-rendering and hides bugs.</p>
    <p><b>Children as props.</b> A parent that renders <code>{children}</code> passes the <i>same element objects</i> down when it re-renders because of its own state - that is why "lifting content up" (passing <code>children</code>) often fixes slowness without any memo at all. Also consider moving state <b>down</b> into a small component so the big tree is not re-rendered by typing.</p>
    <p><b>React Compiler.</b> The compiler (stable in React 19 era tooling) analyses components and inserts equivalent caching automatically, which makes most manual <code>useMemo</code>/<code>useCallback</code>/<code>memo</code> unnecessary in new code. You still need to understand identity: the compiler relies on the rules of React, and manual memoization remains valid and sometimes needed for effect dependencies.</p>
    <p><b>Expensive renders vs expensive calculations.</b> useMemo helps with calculations done during render. If the cost is rendering 10,000 DOM nodes, use virtualization (windowing) or pagination instead of memoizing; no cache makes 10,000 rows cheap.</p>`,
  aiEra: `<p><b>What AI changes:</b> assistants over-memoize. You often get <code>useCallback</code> around every handler and <code>useMemo</code> around string concatenation, plus wrong dependency arrays that cause stale closures. It looks "professional" and costs readability and sometimes correctness.</p>
    <p><b>Use AI as a partner:</b> <code>Here is a React Profiler flamegraph description and my component. Which re-renders are unnecessary and what is the simplest fix - moving state down, children-as-props, or memoization? Justify with identity reasoning.</code> That makes it explain the cause rather than sprinkle hooks.</p>
    <p><b>Measure, do not guess:</b> the React DevTools Profiler's "Why did this render?" tells you exactly which prop or hook changed. Ask AI to help interpret it, but let the Profiler be the source of truth.</p>
    <p><b>What you must still own:</b> the identity story. In an interview, say "a new function or object each render breaks memo; useCallback/useMemo keep the same reference until dependencies change".</p>`,
  problems: [
    {
      title: 'Stop the Big List Re-Rendering',
      level: 'Medium', tags: ['useMemo', 'useCallback', 'React.memo', 'performance'], companies: ['Flipkart', 'Atlassian', 'Walmart'],
      statement: `<p>A product page renders 2000 <code>Row</code> components and has three pieces of state: <code>query</code> (search box), <code>selectedId</code>, and <code>cartCount</code> (a button that increments). Clicking the cart button currently re-filters all products and re-renders every row, so the UI janks. Optimize so that: (1) the cart button does <b>not</b> re-filter or re-render any row; (2) typing in the search box re-renders only rows whose item changed or newly appeared; (3) selecting a row re-renders only the rows whose selected state changed.</p>`,
      constraints: `No external libraries. Keep behavior identical. <code>items</code> comes from props and its identity is stable.`,
      example: `${H.table(['Action', 'Before', 'After'], [['Click cart', '2000 rows render + filter runs', H.c('g', '0 rows render, filter skipped')], ['Select row 7', '2000 rows render', H.c('g', '2 rows render (old and new selection)')]])}<p>The reason: the parent re-renders on any state change and passes new function/prop identities to every child.</p>`,
      brute: {
        why: `<p>Doing nothing means each state change re-runs <code>items.filter</code> (O(N)) and re-renders N rows. Wrapping only <code>Row</code> in <code>memo</code> is not enough: <code>onSelect</code> is a new function each render and <code>selected</code> is derived as a new object, so every row's props still differ. The waste is N renders per irrelevant click.</p>`,
        code: J(`function ProductPage({ items }) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const visible = items.filter(i => i.name.includes(query));         // runs on EVERY render
  return (
    <div>
      <button onClick={() => setCartCount(c => c + 1)}>Cart {cartCount}</button>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <ul>{visible.map(i => (
        <Row key={i.id} item={i} selected={i.id === selectedId} onSelect={() => setSelectedId(i.id)} />
      ))}</ul>
    </div>
  );
}
function Row({ item, selected, onSelect }) { return <li className={selected ? 'sel' : ''} onClick={onSelect}>{item.name}</li>; }`, 'Unoptimized page')
      },
      mcq: { q: 'You wrapped Row in React.memo but rows still re-render on every click. Which prop is the most likely culprit?', options: ['onSelect={() => setSelectedId(i.id)} - a new function on each parent render', 'key={i.id}', 'item={i} (same object each time)', 'selected (a boolean)'], answer: 0, explain: 'The inline arrow is a new function every render, so Object.is says the prop changed and memo cannot skip. key is not a prop the child sees, item keeps identity, and booleans compare by value.' },
      hints: [
        `<p>Hint 1: three separate problems - the filter runs too often, the function prop changes identity, and <code>Row</code> is not skipped even when its props match.</p>`,
        `<p>Hint 2: <code>useMemo</code> for the filter with <code>[items, query]</code>; <code>React.memo</code> on <code>Row</code>; give every row the <i>same</i> handler by passing the id back as an argument (<code>onSelect(item.id)</code>) and wrapping the handler in <code>useCallback</code>.</p>`,
        `<p>Hint 3: recipe: Row calls <code>onSelect(item.id)</code> itself. Parent: <code>const handleSelect = useCallback(id =&gt; setSelectedId(id), [])</code>. Pass <code>selected={item.id === selectedId}</code> - a boolean, compared by value.</p>`
      ],
      solution: {
        approach: `<p>Cache the derived list, memoize the row, and give all rows one stable handler. Booleans like <code>selected</code> compare by value, so only the two rows whose flag changed re-render on selection.</p>`,
        code: J(`import { useMemo, useCallback, useState, memo } from 'react';

const Row = memo(function Row({ item, selected, onSelect }) {
  return (
    <li className={selected ? 'sel' : ''} onClick={() => onSelect(item.id)}>
      {item.name}
    </li>
  );
});

export function ProductPage({ items }) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [cartCount, setCartCount] = useState(0);

  // re-runs only when items or query change, NOT when cartCount changes
  const visible = useMemo(
    () => items.filter(i => i.name.toLowerCase().includes(query.toLowerCase())),
    [items, query]
  );

  // one function for every row; setSelectedId is stable so deps are []
  const handleSelect = useCallback(id => setSelectedId(id), []);

  return (
    <div>
      <button onClick={() => setCartCount(c => c + 1)}>Cart {cartCount}</button>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <ul>
        {visible.map(i => (
          <Row key={i.id} item={i} selected={i.id === selectedId} onSelect={handleSelect} />
        ))}
      </ul>
    </div>
  );
}`, 'Optimized page'),
        alt: [R(`// Model: count filter runs and row renders for 3 user actions.
let filterRuns = 0, rowRenders = 0;
const items = Array.from({ length: 2000 }, (_, i) => ({ id: i, name: 'item ' + i }));

function makeApp(optimized) {
  let cache = null, rowProps = new Map();
  return function render(query, selectedId) {
    // useMemo: skip the filter when deps are unchanged
    if (!optimized || !cache || cache.query !== query) {
      filterRuns++;
      cache = { query, list: items.filter(i => i.name.includes(query)) };
    }
    for (const item of cache.list) {
      const props = item.id === selectedId;          // memo compares the selected flag
      if (!optimized || rowProps.get(item.id) !== props) { rowRenders++; rowProps.set(item.id, props); }
    }
  };
}

for (const optimized of [false, true]) {
  filterRuns = 0; rowRenders = 0;
  const render = makeApp(optimized);
  render('', null);                 // first render
  const before = rowRenders;
  render('', null);                 // click cart: query and selection unchanged
  render('', 7);                    // select row 7
  console.log(optimized ? 'optimized' : 'plain    ', '| filter runs', filterRuns, '| row renders after first paint', rowRenders - before);
}`, 'Counting filter runs and row renders (runnable)')],
        dry: { head: ['Action', 'Filter runs?', 'Rows re-rendered'], rows: [['Click cart', 'no (deps same)', '0'], ['Select row 7', 'no', '1 (row 7 becomes selected)'], ['Select row 9', 'no', '2 (row 7 deselected, row 9 selected)'], ['Type "a"', 'yes (query changed)', 'only rows that appear or change']] },
        complexity: `<p>Click cart: O(1) (no filter, no row renders). Select: O(1) row renders plus the parent's O(N) map of elements. Type: O(N) filter, then only changed rows render. (Creating the N React elements in <code>visible.map</code> is still O(N); for huge lists add virtualization.)</p>`,
        followUps: ['At 100,000 rows what would you add? (Virtualization / windowing.)', 'How could you avoid the parent re-rendering at all? (Move the cart button into its own component.)']
      }
    }
  ]
});

/* ============================ TOPIC 7: useReducer ============================ */
topics.push({
  title: 'useReducer: One Rulebook for Complex State',
  analogy: `<p>At a bank you do not walk into the vault and change your balance yourself. You fill a <b>slip</b> ("deposit 500") and hand it to the <b>teller</b>. The teller follows a fixed <b>rulebook</b>: look at the current ledger, apply the slip, write the new ledger. If the slip says nonsense ("withdraw 9 lakh" with 500 in the account) the rulebook decides what happens.</p>
    <p>That is <code>useReducer</code>: components send <b>actions</b> (slips) with <code>dispatch</code>; one <b>reducer</b> function (the rulebook) turns <code>(oldState, action)</code> into the <code>newState</code>. All the "what can happen to this data" logic lives in one place.</p>`,
  explain: `<p>With <code>useState</code> every place that changes data needs to know <i>how</i> to change it. When one user action must update four values consistently (loading flag, error, data, retry count), the setters scatter around your component and sometimes get out of sync ("loading is true AND there is an error?").</p>
    <pre>const [state, dispatch] = useReducer(reducer, initialState);

function reducer(state, action) {
  switch (action.type) {
    case 'added':   return { ...state, items: [...state.items, action.item] };
    case 'removed': return { ...state, items: state.items.filter(i =&gt; i.id !== action.id) };
    default: throw new Error('Unknown action: ' + action.type);
  }
}</pre>
    <p><b>Rules of a reducer:</b></p>
    <ul>
      <li><b>Pure:</b> same inputs, same output; no fetch, no random, no <code>Date.now()</code>, no mutation of <code>state</code>.</li>
      <li><b>Returns a new state object</b> (or the very same one to signal "nothing changed").</li>
      <li><b>Actions describe what happened</b> ("item_added"), not what to set ("setItems"). The reducer decides the consequences.</li>
    </ul>
    ${H.table(['', 'useState', 'useReducer'], [
      ['Best for', 'one independent value (a toggle, a text field)', 'several related values, or next state depends on rules'],
      ['Where logic lives', 'inside each event handler', 'in one reducer function'],
      ['Testing', 'render the component', 'call the reducer like a normal function'],
      ['Stale closures', 'possible when reading state in callbacks', 'rare: reducer always receives the latest state'],
      ['<code>dispatch</code> identity', 'setter is stable', 'dispatch is stable (safe to pass down, omit from deps)']
    ])}
    <p><b>Typical upgrade path:</b> start with <code>useState</code>. When you notice "three setters in one handler", "impossible combinations", or the same update logic copied into several handlers, switch to <code>useReducer</code>. It pairs beautifully with <code>useContext</code> for app-wide state (see the Context topic) and is the idea behind Redux.</p>
    <p><b>Model as a state machine.</b> Replace several booleans with one <code>status</code> ("idle", "loading", "success", "error") and let the reducer refuse invalid moves (for example "resolved" while idle). Impossible states become unrepresentable.</p>`,
  clues: [
    '"several pieces of state change together" / "setters scattered across handlers" -> useReducer',
    '"isLoading and isError can both be true" -> impossible states, use a status field in a reducer',
    '"next state depends on previous state and the type of event" -> reducer',
    '"complex form with many fields and validation" -> single reducer with field/validate/reset actions',
    '"undo/redo", "history", "wizard steps" -> reducer holding past/present/future',
    '"how is this different from Redux?" -> same pattern, local to a component (or shared via context)'
  ],
  code: [
    J(`import { useReducer, useState } from 'react';

const initial = { items: [], nextId: 1 };

function reducer(state, action) {
  switch (action.type) {
    case 'add':
      return { items: [...state.items, { id: state.nextId, text: action.text, done: false }], nextId: state.nextId + 1 };
    case 'toggle':
      return { ...state, items: state.items.map(i => (i.id === action.id ? { ...i, done: !i.done } : i)) };
    case 'remove':
      return { ...state, items: state.items.filter(i => i.id !== action.id) };
    case 'clearDone':
      return { ...state, items: state.items.filter(i => !i.done) };
    default:
      throw new Error('Unknown action: ' + action.type);   // fail loudly on typos
  }
}

export function Todos() {
  const [state, dispatch] = useReducer(reducer, initial);
  const [text, setText] = useState('');                     // pure UI input: useState is fine
  return (
    <div>
      <input value={text} onChange={e => setText(e.target.value)} />
      <button onClick={() => { dispatch({ type: 'add', text }); setText(''); }}>Add</button>
      <button onClick={() => dispatch({ type: 'clearDone' })}>Clear done</button>
      <ul>
        {state.items.map(i => (
          <li key={i.id} onClick={() => dispatch({ type: 'toggle', id: i.id })}>
            {i.done ? '[x] ' : '[ ] '}{i.text}
            <button onClick={() => dispatch({ type: 'remove', id: i.id })}>x</button>
          </li>
        ))}
      </ul>
    </div>
  );
}`, 'Todo list with useReducer (React)'),
    R(`// The reducer is a PURE function, so we can run it without React at all.
const initial = { items: [], nextId: 1 };

function reducer(state, action) {
  switch (action.type) {
    case 'add':       return { items: [...state.items, { id: state.nextId, text: action.text, done: false }], nextId: state.nextId + 1 };
    case 'toggle':    return { ...state, items: state.items.map(i => (i.id === action.id ? { ...i, done: !i.done } : i)) };
    case 'remove':    return { ...state, items: state.items.filter(i => i.id !== action.id) };
    case 'clearDone': return { ...state, items: state.items.filter(i => !i.done) };
    default: throw new Error('Unknown action: ' + action.type);
  }
}

const show = (s) => '[' + s.items.map(i => (i.done ? 'x ' : '. ') + i.text).join(', ') + ']';
const actions = [
  { type: 'add', text: 'Milk' }, { type: 'add', text: 'Eggs' }, { type: 'toggle', id: 1 },
  { type: 'add', text: 'Tea' }, { type: 'remove', id: 2 }, { type: 'clearDone' }
];

let state = initial;
for (const action of actions) {
  const next = reducer(state, action);                 // (oldState, action) -> newState
  console.log(JSON.stringify(action).padEnd(34), show(state), '->', show(next));
  state = next;
}
console.log('original untouched:', show(initial));     // we never mutated anything`, 'Run the reducer over an action list')
  ],
  codeTitle: ['React: todo list with useReducer', 'Plain JS: a reducer is just a function (run it)'],
  viz: {
    title: 'Reducer state transitions for a todo list',
    input: 'add:Milk add:Eggs toggle:1 add:Tea remove:2 clear',
    inputLabel: 'actions: add:text, toggle:id, remove:id, clear (removes done items)',
    gen: function (input) {
      var toks = String(input || '').trim().split(/\s+/).filter(Boolean);
      if (toks.length < 2 || toks.length > 10) throw new Error('Enter 2 to 10 actions like: add:Milk toggle:1 remove:1 clear');
      var state = { items: [], nextId: 1 }, rows = [], frames = [], i;
      function show(s) { return s.items.length ? s.items.map(function (x) { return (x.done ? '[x] ' : '[ ] ') + x.id + ':' + x.text; }).join(', ') : '(empty)'; }
      function reducer(s, a) {
        if (a.type === 'add') return { items: s.items.concat([{ id: s.nextId, text: a.text, done: false }]), nextId: s.nextId + 1 };
        if (a.type === 'toggle') return { items: s.items.map(function (x) { return x.id === a.id ? { id: x.id, text: x.text, done: !x.done } : x; }), nextId: s.nextId };
        if (a.type === 'remove') return { items: s.items.filter(function (x) { return x.id !== a.id; }), nextId: s.nextId };
        if (a.type === 'clear') return { items: s.items.filter(function (x) { return !x.done; }), nextId: s.nextId };
        throw new Error('Unknown action "' + a.type + '". Use add, toggle, remove, clear');
      }
      frames.push({ narr: 'Initial state: no items, <code>nextId = 1</code>. Components never change it directly; they <code>dispatch</code> an action and the reducer returns the next state.', parts: [
        { type: 'vars', label: 'state', vals: { items: 0, nextId: 1 } },
        { type: 'array', label: 'items', values: ['(empty)'] } ] });
      for (i = 0; i < toks.length; i++) {
        var seg = toks[i].split(':'), a = { type: seg[0].toLowerCase() };
        if (a.type === 'add') { if (!seg[1]) throw new Error('add needs text, like add:Milk'); a.text = seg.slice(1).join(':'); }
        else if (a.type === 'toggle' || a.type === 'remove') { a.id = parseInt(seg[1], 10); if (isNaN(a.id)) throw new Error(a.type + ' needs an id number, like ' + a.type + ':1'); }
        var before = show(state), next = reducer(state, a);
        var noChange = JSON.stringify(next) === JSON.stringify(state);
        rows.push([String(i + 1), toks[i], before, show(next)]);
        var hl = {}; hl[rows.length - 1] = noChange ? 'bad' : 'ok';
        var why = a.type === 'add' ? 'Reducer: copy the items, append a new one with id ' + state.nextId + ', bump <code>nextId</code>.' : a.type === 'toggle' ? (noChange ? 'No item has id ' + a.id + ', so the reducer returns an unchanged copy.' : 'Reducer: map over items; the one with id ' + a.id + ' gets <code>done</code> flipped.') : a.type === 'remove' ? (noChange ? 'No item with id ' + a.id + ', nothing to remove.' : 'Reducer: filter out id ' + a.id + '.') : 'Reducer: keep only items that are not done.';
        state = next;
        frames.push({ narr: '<b>dispatch(' + toks[i] + ')</b>. ' + why, parts: [
          { type: 'table', label: 'Transitions (old state -> new state)', columns: ['#', 'action', 'state before', 'state after'], rows: rows.map(function (r) { return r.slice(); }), hl: hl },
          { type: 'array', label: 'items now', values: state.items.length ? state.items.map(function (x) { return (x.done ? 'done ' : 'todo ') + x.text; }) : ['(empty)'], hl: (function () { var h = {}; state.items.forEach(function (x, k) { h[k] = x.done ? 'done' : 'cur'; }); return h; })() },
          { type: 'vars', label: 'state', vals: { items: state.items.length, nextId: state.nextId } } ] });
      }
      frames.push({ narr: 'Every transition went through one function. To unit-test the logic you can call <code>reducer(state, action)</code> with no React, no DOM and no mocking.', parts: [
        { type: 'table', label: 'Full transition log', columns: ['#', 'action', 'state before', 'state after'], rows: rows.map(function (r) { return r.slice(); }) } ] });
      return frames;
    }
  },
  examples: [
    { title: 'A fetch state machine removes impossible states', html: `<p>Four booleans allow 16 combinations, most of them nonsense. One <code>status</code> string has four meaningful values. The reducer only allows legal moves, e.g. only <code>loading -&gt; success</code>.</p>`, code: J(`function fetchReducer(state, action) {
  switch (action.type) {
    case 'start':   return { status: 'loading', data: state.data, error: null };
    case 'success': return state.status === 'loading' ? { status: 'success', data: action.data, error: null } : state;
    case 'failure': return state.status === 'loading' ? { status: 'error', data: state.data, error: action.error } : state;
    case 'reset':   return { status: 'idle', data: null, error: null };
    default: return state;
  }
}`) },
    { title: 'Forms: one action type for many fields', html: `<p>A signup form with 8 fields does not need 8 <code>useState</code> calls. One <code>field</code> action carrying the name and value keeps the reducer tiny, and a <code>reset</code> action restores the initial values in one go.</p>`, code: J(`const initialForm = { name: '', email: '', city: '' };
function formReducer(state, action) {
  if (action.type === 'field') return { ...state, [action.name]: action.value };
  if (action.type === 'reset') return initialForm;
  return state;
}
// <input name="email" onChange={e => dispatch({ type: 'field', name: e.target.name, value: e.target.value })} />`) },
    { title: 'Undo / redo with past, present, future', html: `<p>Because state changes are plain data, history is easy: keep arrays of past and future states and move between them. This is a favourite machine-coding question (see practice).</p>`, code: R(`function history(state, action) {
  const { past, present, future } = state;
  switch (action.type) {
    case 'set':  return { past: [...past, present], present: action.value, future: [] };
    case 'undo': return past.length ? { past: past.slice(0, -1), present: past[past.length - 1], future: [present, ...future] } : state;
    case 'redo': return future.length ? { past: [...past, present], present: future[0], future: future.slice(1) } : state;
    default: return state;
  }
}
let s = { past: [], present: 0, future: [] };
for (const a of [{ type: 'set', value: 1 }, { type: 'set', value: 2 }, { type: 'undo' }, { type: 'undo' }, { type: 'redo' }]) {
  s = history(s, a);
  console.log(a.type.padEnd(5), 'present =', s.present, '| past =', s.past, '| future =', s.future);
}`) },
    { title: 'Lazy init and reset with the key trick', html: `<p><code>useReducer(reducer, arg, init)</code> calls <code>init(arg)</code> once, handy for reading saved data. To reset an entire component tree to its initial state, change its <code>key</code>; React throws away the old state and starts fresh.</p>` }
  ],
  deepDive: `<p><b>Why it is "just" a fold.</b> If you have the actions in order, the current state is <code>actions.reduce(reducer, initial)</code> - the same <code>reduce</code> you know from arrays, hence the name. This is why you can replay a bug report (list of actions), time-travel in Redux DevTools, and test with a plain array of actions.</p>
    <p><b>Strict Mode and purity.</b> React may call your reducer twice in development with the same inputs to detect impurity. A reducer that pushes into <code>state.items</code> (mutation) or generates an id with <code>Math.random()</code> will behave strangely. Generate ids <i>in the event handler</i> and put them into the action; the reducer then stays deterministic.</p>
    <p><b>Bail-out.</b> If the reducer returns the exact same state object, React skips the render. Returning <code>{ ...state }</code> always renders. In "invalid transition" branches, return <code>state</code> itself.</p>
    <p><b>Where side effects go.</b> Reducers decide the next state only. Fetching, timers and navigation belong in event handlers or effects that dispatch the result as an action (<code>{ type: 'success', data }</code>). Libraries like Redux Toolkit add thunks and Immer for the same structure at scale.</p>
    <p><b>Performance with context.</b> Putting <code>state</code> and <code>dispatch</code> in one context re-renders every consumer on any change. Split into <code>StateContext</code> and <code>DispatchContext</code>: components that only dispatch never re-render because <code>dispatch</code> has a stable identity.</p>
    <p><b>Immutable updates by hand.</b> Nested state means nested spreads. That is where Immer (<code>useImmerReducer</code>, or Redux Toolkit slices) helps: you write "mutating" code on a draft and it produces the immutable result.</p>`,
  aiEra: `<p><b>What AI changes:</b> assistants can convert a pile of <code>useState</code> hooks into a reducer in seconds - which is great - but they often (1) mutate <code>state</code> inside the reducer, (2) make actions that are really setters (<code>SET_LOADING</code>, <code>SET_ERROR</code>) so the spaghetti just moves, or (3) put <code>fetch</code> inside the reducer.</p>
    <p><b>Use AI as a partner:</b> <code>Here are my useState hooks and handlers. List the legal states as a table and the events that move between them. Then write a reducer whose actions are events, not setters. Include unit tests that call the reducer directly.</code> Reviewing the state table is where your judgement matters.</p>
    <p><b>Free test generation:</b> because the reducer is pure, AI-generated tests are easy to check: input state, action, expected state. Add a test for every invalid transition.</p>
    <p><b>What you must still own:</b> choosing the right events and states for the domain. A model can transform code; deciding what "loading while already loading" should do is product logic.</p>`,
  problems: [
    {
      title: 'Turn useState Spaghetti into useReducer',
      level: 'Medium', tags: ['useReducer', 'state machine', 'refactor'], companies: ['Atlassian', 'Zerodha', 'Microsoft'],
      statement: `<p>A <code>SaveButton</code> component tracks a save request with four <code>useState</code> hooks: <code>isSaving</code>, <code>error</code>, <code>savedAt</code>, <code>attempts</code>. Handlers update them in different orders and a bug lets <code>isSaving</code> and <code>error</code> both be true. Refactor to a single <code>useReducer</code> with a <code>status</code> field (<code>idle | saving | saved | failed</code>) with these events: <code>SAVE</code> (starts a save, ignored if already saving, counts attempts), <code>SUCCESS</code> (only valid while saving), <code>FAILURE</code> (only valid while saving, stores the message) and <code>RESET</code>.</p>`,
      constraints: `Reducer must be pure and ignore invalid events by returning the same state object. Timestamps are passed in via the action. React 18.`,
      example: `${H.table(['Action sequence', 'Resulting state'], [['SAVE, SUCCESS(10:00)', '<code>{ status: "saved", attempts: 1, savedAt: "10:00", error: null }</code>'], ['SAVE, SAVE', 'second SAVE ignored: still <code>saving</code>, attempts = 1'], ['SUCCESS (while idle)', 'ignored: still <code>idle</code>'], ['SAVE, FAILURE("net"), SAVE', 'attempts = 2, error cleared when a new save starts']])}`,
      brute: {
        why: `<p>Keeping four independent states means every handler must remember to reset the others in the right order (<code>setError(null)</code>, <code>setIsSaving(true)</code>, ...). Forget one and you get impossible combinations like saving-with-an-error. The wasted work is repeating that bookkeeping in each handler, with 16 possible boolean combinations and only 4 valid ones.</p>`,
        code: J(`function SaveButton({ save }) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [savedAt, setSavedAt] = useState(null);
  const [attempts, setAttempts] = useState(0);

  async function onClick() {
    setIsSaving(true);
    setAttempts(attempts + 1);            // stale if clicked fast
    try {
      await save();
      setSavedAt(Date.now());
      setIsSaving(false);
    } catch (e) {
      setError(e.message);                // forgot setIsSaving(false)!
    }
  }
  return <button disabled={isSaving} onClick={onClick}>{error || (savedAt ? 'Saved' : 'Save')}</button>;
}`, 'Four independent states')
      },
      mcq: { q: 'Why should the SUCCESS action be ignored when status is not "saving"?', options: ['A late or duplicate response must not move the machine into an impossible state', 'To make the reducer impure', 'Because dispatch cannot be called twice', 'To avoid using switch statements'], answer: 0, explain: 'Responses can arrive late (after RESET) or twice. By accepting SUCCESS only in the saving state, the reducer guarantees status always describes reality, which is the point of a state machine.' },
      hints: [
        `<p>Hint 1: write down the valid states and which events are allowed from each. Four states: idle, saving, saved, failed.</p>`,
        `<p>Hint 2: the reducer receives <code>(state, action)</code>. Check <code>state.status</code> before applying <code>SUCCESS</code>/<code>FAILURE</code>, and return <code>state</code> (the same object) when the move is not allowed.</p>`,
        `<p>Hint 3: recipe: <code>SAVE</code> -&gt; if saving return state, else <code>{ status: 'saving', attempts: attempts + 1, error: null, savedAt }</code>. Component: <code>dispatch({ type: 'SAVE' })</code> then <code>await save()</code> and dispatch the result; derive <code>disabled</code> from <code>status === 'saving'</code>.</p>`
      ],
      solution: {
        approach: `<p>One <code>status</code> plus data fields replace four loose states. Events are what happened (SAVE, SUCCESS, FAILURE, RESET); the reducer decides what each means in each status and ignores illegal moves.</p>`,
        code: J(`import { useReducer } from 'react';

const initial = { status: 'idle', attempts: 0, savedAt: null, error: null };

export function saveReducer(state, action) {
  switch (action.type) {
    case 'SAVE':
      if (state.status === 'saving') return state;                         // already saving: ignore
      return { ...state, status: 'saving', attempts: state.attempts + 1, error: null };
    case 'SUCCESS':
      if (state.status !== 'saving') return state;                         // late / duplicate response
      return { ...state, status: 'saved', savedAt: action.at };
    case 'FAILURE':
      if (state.status !== 'saving') return state;
      return { ...state, status: 'failed', error: action.message };
    case 'RESET':
      return initial;
    default:
      return state;
  }
}

export function SaveButton({ save }) {
  const [state, dispatch] = useReducer(saveReducer, initial);

  async function onClick() {
    dispatch({ type: 'SAVE' });
    try {
      await save();
      dispatch({ type: 'SUCCESS', at: Date.now() });                       // time passed in, reducer stays pure
    } catch (e) {
      dispatch({ type: 'FAILURE', message: e.message });
    }
  }

  const label = { idle: 'Save', saving: 'Saving...', saved: 'Saved', failed: 'Retry: ' + state.error }[state.status];
  return <button disabled={state.status === 'saving'} onClick={onClick}>{label}</button>;
}`, 'Single reducer with a status machine'),
        alt: [R(`const initial = { status: 'idle', attempts: 0, savedAt: null, error: null };
function saveReducer(state, action) {
  switch (action.type) {
    case 'SAVE':    return state.status === 'saving' ? state : { ...state, status: 'saving', attempts: state.attempts + 1, error: null };
    case 'SUCCESS': return state.status !== 'saving' ? state : { ...state, status: 'saved', savedAt: action.at };
    case 'FAILURE': return state.status !== 'saving' ? state : { ...state, status: 'failed', error: action.message };
    case 'RESET':   return initial;
    default:        return state;
  }
}
const events = [{ type: 'SUCCESS', at: '09:59' }, { type: 'SAVE' }, { type: 'SAVE' }, { type: 'FAILURE', message: 'net' }, { type: 'SAVE' }, { type: 'SUCCESS', at: '10:00' }, { type: 'SUCCESS', at: '10:01' }];
let s = initial;
for (const e of events) {
  const next = saveReducer(s, e);
  console.log(e.type.padEnd(8), next === s ? '(ignored)' : '', JSON.stringify(next));
  s = next;
}`, 'Run the state machine (runnable)')],
        dry: { head: ['Event', 'status before', 'status after', 'attempts'], rows: [['SUCCESS', 'idle', 'idle (ignored)', '0'], ['SAVE', 'idle', 'saving', '1'], ['SAVE', 'saving', 'saving (ignored)', '1'], ['FAILURE', 'saving', 'failed', '1'], ['SAVE', 'failed', 'saving', '2'], ['SUCCESS', 'saving', 'saved', '2']] },
        complexity: `<p>O(1) per event. State size is constant: 4 fields, and only 4 reachable statuses instead of 16 boolean combinations.</p>`,
        followUps: ['How would you cancel an in-flight save on RESET? (AbortController in a ref plus ignoring late events.)', 'Where would you put a retry-with-backoff? (Outside the reducer, in an effect that dispatches SAVE.)']
      }
    }
  ]
});

/* ============================ TOPIC 8: useContext ============================ */
topics.push({
  title: 'useContext: Sharing Data Without Passing It Hand to Hand',
  analogy: `<p>In an office building, the <b>Wi-Fi password</b> is on a board in the lobby. You could pass it floor by floor on sticky notes ("prop drilling"): the 5th floor needs it, so floors 1, 2, 3 and 4 must carry a note they never use. Or you put it on <b>the lobby board</b> and anyone who needs it just looks it up.</p>
    <p><b>Context</b> is the lobby board. A <code>Provider</code> pins a value to the board for everyone below it in the tree; <code>useContext</code> is "walk to the board and read it". When the value on the board changes, every reader is told to look again.</p>`,
  explain: `<p><b>The problem:</b> a deeply nested component (a theme toggle, the current user, the language) needs data from the top of the app. Passing it as props through every level in between is boring and fragile.</p>
    <p><b>Three steps:</b></p>
    <ol>
      <li><b>Create:</b> <code>const ThemeContext = createContext('light');</code> (the argument is a <i>default</i> used only when there is no provider above).</li>
      <li><b>Provide:</b> <code>&lt;ThemeContext.Provider value={theme}&gt; ...children... &lt;/ThemeContext.Provider&gt;</code> (React 19 also allows <code>&lt;ThemeContext value={theme}&gt;</code>).</li>
      <li><b>Consume:</b> <code>const theme = useContext(ThemeContext);</code> in any component below.</li>
    </ol>
    <p><b>Rules to remember:</b></p>
    <ul>
      <li>The <b>nearest</b> provider above wins; nested providers override outer ones for their subtree.</li>
      <li>When the provider's <code>value</code> changes (by <code>Object.is</code>), <b>every component that calls <code>useContext</code> for it re-renders</b> - even if it is wrapped in <code>React.memo</code>. Components that do not consume it are unaffected.</li>
      <li>Context does not manage state. State lives in a normal <code>useState</code>/<code>useReducer</code> inside the provider component; context only <i>delivers</i> it.</li>
    </ul>
    <p><b>Classic pitfall:</b> <code>value={{ theme, toggle }}</code> creates a <b>new object each time the provider component renders</b>. If the provider's parent re-renders for unrelated reasons, all consumers re-render too. Fix: <code>useMemo</code> the value (and <code>useCallback</code> the functions).</p>
    ${H.table(['Use context for', 'Avoid context for'], [
      ['theme, locale, current user, feature flags - values read by many components, changing rarely', 'fast-changing data (mouse position, typing), big server caches (use a data library), anything only 1-2 levels deep (just pass props)']
    ])}
    <p><b>Make it pleasant:</b> hide the raw context behind a custom hook <code>useTheme()</code> that throws a helpful error if used outside the provider.</p>`,
  clues: [
    '"prop drilling" / "pass props through 5 levels" -> context (or composition)',
    '"theme", "dark mode", "locale", "auth user available everywhere" -> context',
    '"all consumers re-render when anything in the context changes" -> split contexts, memoize the value',
    '"useContext returns undefined / default value" -> component is outside the Provider',
    '"context vs Redux" -> context delivers values; Redux/Zustand add selectors, middleware, devtools',
    '"React.memo child still re-renders" -> it consumes a context whose value changed'
  ],
  code: [
    J(`import { createContext, useContext, useState, useMemo, useCallback } from 'react';

const ThemeContext = createContext(null);          // null = "no provider above"

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');      // the STATE lives here
  const toggle = useCallback(() => setTheme(t => (t === 'light' ? 'dark' : 'light')), []);

  // memoize: consumers re-render only when theme (or toggle) really changes
  const value = useMemo(() => ({ theme, toggle }), [theme, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (ctx === null) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}

function ThemeButton() {
  const { theme, toggle } = useTheme();             // any depth below the provider
  return <button onClick={toggle}>Theme: {theme}</button>;
}

export default function App() {
  return (
    <ThemeProvider>
      <Layout />      {/* no theme props anywhere in between */}
    </ThemeProvider>
  );
}`, 'Theme provider with a guarded hook (React)'),
    R(`// Model: useContext = walk UP the tree and take the NEAREST provider's value.
function node(name, parent, provides) { return { name, parent, provides }; }
function useContext(ctxName, from) {
  for (let n = from; n; n = n.parent) {
    if (n.provides && ctxName in n.provides) return n.provides[ctxName];
  }
  return 'default-light';                     // no provider above: the createContext default
}

const app      = node('App', null, null);
const outer    = node('Provider(dark)', app, { theme: 'dark' });
const sidebar  = node('Sidebar', outer, null);
const inner    = node('Provider(blue)', outer, { theme: 'blue' });   // nested override
const content  = node('Content', inner, null);
const orphan   = node('Footer (outside any provider)', app, null);

for (const n of [sidebar, content, orphan]) {
  console.log(n.name.padEnd(32), '-> theme =', useContext('theme', n));
}`, 'Nearest provider wins (run it)')
  ],
  codeTitle: ['React: provider, guarded hook, consumer', 'Plain JS: the nearest-provider lookup'],
  viz: {
    title: 'Who re-renders when the provider re-renders?',
    input: 'inline',
    inputLabel: 'value style: inline (new object each render) or memo (useMemo)',
    gen: function (input) {
      var mode = String(input || 'inline').trim().toLowerCase();
      if (mode !== 'inline' && mode !== 'memo') throw new Error('Type inline or memo');
      var counts = { Provider: 1, Layout: 1, Sidebar: 1, Content: 1, ThemeButton: 1 }, frames = [], log = [];
      function g(hlmap) {
        var nodes = [
          { id: 'App', label: 'App', x: 50, y: 6, shape: 'box', w: 14 },
          { id: 'Provider', label: 'ThemeProvider', x: 50, y: 20, shape: 'box', w: 24 },
          { id: 'Layout', label: 'Layout (memo)', x: 50, y: 34, shape: 'box', w: 24 },
          { id: 'Sidebar', label: 'Sidebar (memo)', x: 18, y: 50, shape: 'box', w: 24 },
          { id: 'Content', label: 'Content (useContext)', x: 50, y: 50, shape: 'box', w: 28 },
          { id: 'ThemeButton', label: 'ThemeButton (useContext)', x: 83, y: 50, shape: 'box', w: 32 }
        ];
        var tags = {}; Object.keys(counts).forEach(function (k) { tags[k] = 'x' + counts[k]; });
        return { type: 'graph', label: 'Component tree (x = times rendered)', directed: true, height: 60, nodes: nodes, tags: tags, hl: hlmap,
          edges: [['App', 'Provider'], ['Provider', 'Layout'], ['Layout', 'Sidebar'], ['Layout', 'Content'], ['Layout', 'ThemeButton']] };
      }
      // table has 4 columns; keep log rows 4 long, remember wasted flag separately
      var wastedFlags = [];
      function tableOk() {
        var rows = log.map(function (r) { return r.slice(0, 4); });
        var h = {}; if (rows.length) h[rows.length - 1] = wastedFlags[rows.length - 1] ? 'bad' : 'ok';
        return { type: 'table', label: 'Render log', columns: ['event', 'theme', 'context value', 'consumers re-rendered?'], rows: rows, hl: h };
      }
      var all = { App: 'ok', Provider: 'ok', Layout: 'ok', Sidebar: 'ok', Content: 'ok', ThemeButton: 'ok' };
      frames.push({ narr: 'First render of the whole tree with <code>theme = "light"</code>. ' + (mode === 'inline' ? 'The provider writes <code>value={{ theme, toggle }}</code> - a brand-new object each time it renders.' : 'The provider uses <code>useMemo(() =&gt; ({ theme, toggle }), [theme, toggle])</code>, so the object only changes when theme changes.') + ' Only <b>Content</b> and <b>ThemeButton</b> call <code>useContext</code>.', parts: [g(all)] });
      // event 2: unrelated App re-render
      counts.Provider++;
      var hl2 = { App: 'cur', Provider: 'cur', Layout: 'done', Sidebar: 'done', Content: 'done', ThemeButton: 'done' };
      frames.push({ narr: '<b>App re-renders for an unrelated reason</b> (say it owns a counter). ThemeProvider renders again with the <i>same</i> theme. Layout and Sidebar are wrapped in <code>memo</code> with no changing props, so React skips them.', parts: [g(hl2)] });
      if (mode === 'inline') {
        counts.Content++; counts.ThemeButton++;
        log.push(['App re-render (unrelated)', 'light', 'new object', 'yes']); wastedFlags.push(true);
        frames.push({ narr: '<span class="c-r">Problem:</span> the provider built a <b>new</b> value object. React compares it with <code>Object.is</code> - different identity - so both consumers are told to re-render even though nothing they care about changed. This is wasted work.', parts: [g({ App: 'done', Provider: 'done', Layout: 'done', Sidebar: 'done', Content: 'bad', ThemeButton: 'bad' }), tableOk()] });
      } else {
        log.push(['App re-render (unrelated)', 'light', 'same object', 'no']); wastedFlags.push(false);
        frames.push({ narr: '<span class="c-g">Memoized value:</span> <code>useMemo</code> returned the saved object, same identity, so <code>Object.is</code> says unchanged and no consumer is notified. Both consumers stay untouched.', parts: [g({ App: 'done', Provider: 'done', Layout: 'done', Sidebar: 'done', Content: 'done', ThemeButton: 'done' }), tableOk()] });
      }
      // event 3: toggle
      counts.Provider++; counts.Content++; counts.ThemeButton++;
      log.push(['click ThemeButton (toggle)', 'dark', 'new value', 'yes']); wastedFlags.push(false);
      frames.push({ narr: '<b>The user clicks the toggle.</b> <code>setTheme("dark")</code> runs inside the provider. The value really changed, so both consumers re-render - <b>even though Layout (their parent) is memoized and skipped</b>. Context updates jump straight to the readers. Sidebar does not read the context, so it stays idle.', parts: [g({ App: 'done', Provider: 'cur', Layout: 'done', Sidebar: 'done', Content: 'ok', ThemeButton: 'ok' }), tableOk()] });
      // event 4: unrelated again
      counts.Provider++;
      if (mode === 'inline') {
        counts.Content++; counts.ThemeButton++;
        log.push(['App re-render (unrelated)', 'dark', 'new object', 'yes']); wastedFlags.push(true);
        frames.push({ narr: 'Another unrelated App render. With the inline object the consumers re-render <b>again</b>. In a big app with 200 consumers this adds up.', parts: [g({ App: 'done', Provider: 'done', Layout: 'done', Sidebar: 'done', Content: 'bad', ThemeButton: 'bad' }), tableOk()] });
      } else {
        log.push(['App re-render (unrelated)', 'dark', 'same object', 'no']); wastedFlags.push(false);
        frames.push({ narr: 'Another unrelated App render. The memoized value keeps its identity, so no consumer re-renders.', parts: [g({ App: 'done', Provider: 'done', Layout: 'done', Sidebar: 'done', Content: 'done', ThemeButton: 'done' }), tableOk()] });
      }
      frames.push({ narr: 'Totals for the consumers: <b>Content rendered ' + counts.Content + ' times</b>, ThemeButton ' + counts.ThemeButton + ' times. ' + (mode === 'inline' ? 'Run it again with <code>memo</code> to compare - only the real change should cost renders.' : 'Only the one real theme change cost a render.'), parts: [g(all), tableOk()] });
      return frames;
    }
  },
  examples: [
    { title: 'Prop drilling vs context', html: `<p>Without context the <code>user</code> must be handed down through <code>App -&gt; Layout -&gt; Header -&gt; Menu -&gt; Avatar</code>, even though only Avatar uses it. Often a simpler fix comes first: <b>composition</b>. Pass the finished <code>&lt;Avatar user={user} /&gt;</code> element down as <code>children</code> or a prop, so the middle layers do not need to know about <code>user</code>.</p>`, code: J(`// composition: Layout does not know about user
function App() {
  const user = useCurrentUser();
  return <Layout header={<Header avatar={<Avatar user={user} />} />} />;
}`) },
    { title: 'Custom hook with a friendly error', html: `<p>If someone forgets the provider, <code>useContext</code> silently returns the default and you get confusing <code>undefined</code> errors later. Make the default <code>null</code> and throw a clear message in your <code>useX</code> hook. Also export the hook, not the raw context.</p>`, code: J(`export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}`) },
    { title: 'Split state and dispatch contexts', html: `<p>Components that only <i>trigger</i> actions (a button) should not re-render when the data changes. Put <code>state</code> and <code>dispatch</code> in two contexts. <code>dispatch</code> never changes identity, so dispatch-only consumers never re-render.</p>`, code: J(`const CartStateContext = createContext(null);
const CartDispatchContext = createContext(null);

function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });
  return (
    <CartDispatchContext.Provider value={dispatch}>
      <CartStateContext.Provider value={state}>{children}</CartStateContext.Provider>
    </CartDispatchContext.Provider>
  );
}`) },
    { title: 'Nested providers: local override', html: `<p>Wrap one section in its own provider to override the value just for that part of the tree - a "dark card inside a light page", or a different language preview. Components read the <b>nearest</b> one above them.</p>` }
  ],
  deepDive: `<p><b>How propagation works.</b> When a provider's value changes, React walks the subtree below it and marks every fiber that <i>read</i> that context (React remembers this in each fiber's dependency list) as needing an update. This bypasses <code>memo</code> and <code>shouldComponentUpdate</code> on the way, which is why a consumer deep below a memoized parent still updates.</p>
    <p><b>No selectors.</b> A context consumer re-renders when the <i>whole</i> value changes, even if it only reads one field. Mitigations: split contexts by update frequency (theme vs user vs cart), memoize the value, keep the state close to the consumers, or use an external store with selectors (Zustand, Redux, <code>useSyncExternalStore</code>). A proposed <code>use-context-selector</code> style API is available as a library; React itself does not have built-in selectors.</p>
    <p><b>Server Components.</b> Context does not exist in Server Components. In Next.js/React 19 you create a small <code>'use client'</code> provider component and render it near the top of the tree; its server-rendered children can still be passed through as <code>children</code>.</p>
    <p><b>React 19 additions.</b> <code>&lt;Ctx value={x}&gt;</code> works as a provider directly, and <code>use(Ctx)</code> can read a context inside conditions and loops (it does not follow the strict hook-order rule). <code>useContext</code> keeps working.</p>
    <p><b>Dark mode in production.</b> Real theme providers also read <code>localStorage</code>, fall back to the <code>prefers-color-scheme</code> media query, set a <code>data-theme</code> attribute on <code>&lt;html&gt;</code> (so CSS variables switch without re-rendering everything), and avoid a flash of the wrong theme by setting it in an inline script before React loads.</p>`,
  aiEra: `<p><b>What AI changes:</b> models love to wrap an entire app in five providers "just in case", and to put everything (user, cart, UI flags, form values) into one giant context. The result is a slow app where typing in a search box re-renders half the tree.</p>
    <p><b>Use AI as a partner:</b> ask <code>For each context in this app, list who consumes it, how often its value changes, and whether the value object is stable. Suggest splits or an external store for the hot ones.</code> Then confirm with the React DevTools Profiler ("Context changed" shows as a reason).</p>
    <p><b>Do not accept:</b> contexts whose default value is a fake object (hides missing-provider bugs), inline <code>value={{...}}</code> objects in providers high in the tree, and "global state" for data that is really server data (that belongs in a query library).</p>
    <p><b>What you must still own:</b> deciding what is truly app-wide and rarely changing, and explaining the memoized-value and re-render behavior clearly.</p>`,
  problems: [
    {
      title: 'Build a Theme Context',
      level: 'Medium', tags: ['useContext', 'custom hook', 'localStorage', 'useMemo'], companies: ['Airbnb', 'Razorpay', 'Cred'],
      statement: `<p>Build a theme system: a <code>ThemeProvider</code> that stores <code>"light"</code> or <code>"dark"</code>, a <code>useTheme()</code> hook returning <code>{ theme, toggle }</code>, and a <code>ThemeButton</code> deep inside the tree. Requirements: (1) the initial theme comes from <code>localStorage</code>, falling back to the OS preference (<code>prefers-color-scheme</code>), falling back to light; (2) every change is saved to <code>localStorage</code> and sets <code>data-theme</code> on <code>document.documentElement</code>; (3) using <code>useTheme</code> outside the provider throws a helpful error; (4) consumers must not re-render when the provider re-renders with the same theme.</p>`,
      constraints: `React 18 or 19. No libraries. Guard storage access with try/catch (it can throw in private windows).`,
      example: `${H.table(['Saved value', 'OS prefers dark?', 'Initial theme'], [['"dark"', 'no', 'dark (saved wins)'], ['(none)', 'yes', 'dark'], ['(none)', 'no', 'light'], ['"banana"', 'yes', 'dark (invalid saved value ignored)']])}`,
      brute: {
        why: `<p>Passing <code>theme</code> and <code>toggle</code> as props through Layout -&gt; Sidebar -&gt; Menu -&gt; ThemeButton forces every intermediate component to carry props it does not use, and each one re-renders whenever the theme changes. Adding a second consumer means editing the whole chain again.</p>`,
        code: J(`function App() {
  const [theme, setTheme] = useState('light');
  return <Layout theme={theme} setTheme={setTheme} />;
}
const Layout = ({ theme, setTheme }) => <Sidebar theme={theme} setTheme={setTheme} />;
const Sidebar = ({ theme, setTheme }) => <Menu theme={theme} setTheme={setTheme} />;
const Menu = ({ theme, setTheme }) => <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme}</button>;`, 'Prop drilling through 3 layers')
      },
      mcq: { q: 'Why wrap the provider value in useMemo?', options: ['So consumers do not re-render when the provider re-renders but theme is unchanged', 'Because context values must be memoized to work at all', 'To make toggle run faster', 'To persist the value in localStorage'], answer: 0, explain: 'A fresh { theme, toggle } object each render has a new identity, so every consumer re-renders. useMemo keeps the same object until theme changes.' },
      hints: [
        `<p>Hint 1: three pieces: a context object, a provider component that owns the state, and a hook that reads the context.</p>`,
        `<p>Hint 2: use lazy initial state <code>useState(() =&gt; readInitialTheme())</code> so storage and <code>matchMedia</code> are read once. Use an effect to save to storage and update the HTML attribute when <code>theme</code> changes.</p>`,
        `<p>Hint 3: recipe: <code>createContext(null)</code>; <code>toggle = useCallback(...)</code> with an updater; <code>value = useMemo(() =&gt; ({ theme, toggle }), [theme, toggle])</code>; <code>useTheme</code> throws when the context is <code>null</code>.</p>`
      ],
      solution: {
        approach: `<p>The provider owns the state (lazy init: saved -&gt; OS preference -&gt; light), syncs side effects in one effect, and exposes a memoized value. The hook guards against missing providers.</p>`,
        code: J(`import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

const ThemeContext = createContext(null);

function readInitialTheme() {
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;          // ignore garbage values
  } catch (e) { /* storage blocked: fall through */ }
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readInitialTheme);               // lazy: function reference

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);       // CSS variables switch
    try { localStorage.setItem('theme', theme); } catch (e) { /* ignore */ }
  }, [theme]);

  const toggle = useCallback(() => setTheme(t => (t === 'light' ? 'dark' : 'light')), []);
  const value = useMemo(() => ({ theme, toggle }), [theme, toggle]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (ctx === null) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}

export function ThemeButton() {
  const { theme, toggle } = useTheme();
  return <button onClick={toggle} aria-pressed={theme === 'dark'}>Theme: {theme}</button>;
}`, 'ThemeProvider + useTheme'),
        alt: [R(`// Pure model of the initial-theme decision (the part you can unit test without React)
function pickTheme(saved, osPrefersDark) {
  if (saved === 'light' || saved === 'dark') return saved;
  return osPrefersDark ? 'dark' : 'light';
}
const cases = [['dark', false], [null, true], [null, false], ['banana', true], ['light', true]];
for (const [saved, os] of cases) {
  console.log('saved =', String(saved).padEnd(7), 'os dark =', String(os).padEnd(5), '->', pickTheme(saved, os));
}`, 'Initial theme decision (runnable)')],
        dry: { head: ['Saved', 'OS dark?', 'Result', 'Why'], rows: [['"dark"', 'false', 'dark', 'saved wins'], ['null', 'true', 'dark', 'OS preference'], ['"banana"', 'true', 'dark', 'invalid saved ignored']] },
        complexity: `<p>O(1) work per toggle; one storage read at start. Consumers re-render only when <code>theme</code> changes thanks to the memoized value.</p>`,
        followUps: ['How do you avoid a flash of the wrong theme on page load? (Inline script before React that sets data-theme.)', 'How would you add a third "system" option that follows OS changes? (matchMedia change listener in an effect.)']
      }
    }
  ]
});

/* ============================ TOPIC 9: Custom hooks ============================ */
topics.push({
  title: 'Custom Hooks: Your Own Reusable Power Tools',
  analogy: `<p>A recipe card says "make tea: boil water, add leaves, wait 3 minutes, strain". You do not copy the recipe into every dish - you keep one <b>card</b> and follow it each time. But each person who follows it makes <b>their own cup</b>; they do not share one cup.</p>
    <p>A custom hook is that recipe card. It is an ordinary function whose name starts with <code>use</code> and which calls other hooks (<code>useState</code>, <code>useEffect</code>...) inside. You reuse the <i>logic</i> everywhere, but every component that calls it gets its <b>own private state</b>.</p>`,
  explain: `<p>When two components need the same "state + effect" combination (a debounced value, data fetching, a window-size listener), you do not copy-paste. You <b>extract</b> it into a custom hook:</p>
    <pre>function useToggle(initial = false) {
  const [on, setOn] = useState(initial);
  const toggle = useCallback(() =&gt; setOn(o =&gt; !o), []);
  return [on, toggle];
}
// usage: const [open, toggleOpen] = useToggle();</pre>
    <p><b>What a custom hook is not:</b> it does not share state between components. Two components calling <code>useToggle()</code> get two separate booleans. (To share, lift state up or use context.)</p>
    <p><b>Rules:</b> the name must start with <code>use</code> (the linter relies on it); follow the rules of hooks inside it; return whatever is convenient - an array for 2 values (callers can rename), an object for more.</p>
    ${H.table(['Hook', 'Built from', 'Gotcha'], [
      ['<code>useDebounce(value, ms)</code>', 'useState + useEffect + setTimeout', 'must clear the timer in cleanup'],
      ['<code>useFetch(url)</code>', 'useState/useReducer + useEffect + AbortController', 'abort on url change and unmount; ignore late replies'],
      ['<code>useLocalStorage(key, init)</code>', 'useState (lazy init) + useEffect', 'JSON parse errors, storage can throw'],
      ['<code>useEventListener(type, handler)</code>', 'useEffect + useRef for the latest handler', 'remove the same function you added'],
      ['<code>useWindowSize()</code>', 'useState + resize listener', 'SSR has no <code>window</code>']
    ])}
    <p><b>Design checklist for a good hook:</b> (1) one clear job; (2) clean up everything it starts; (3) return <b>stable</b> function identities (<code>useCallback</code>) so callers can use them in dependency arrays; (4) accept simple arguments and treat object arguments carefully (identity!); (5) handle loading/error states explicitly; (6) test it with <code>renderHook</code> from React Testing Library.</p>
    <p><b>The debounce idea:</b> "wait until the user stops typing for X ms". Every keystroke cancels the previous timer and starts a new one. Only the last timer survives long enough to fire. The "cancel" is exactly the effect cleanup.</p>
    <p><b>The race-condition idea:</b> if you fetch for id 1 (slow) then id 2 (fast), response 2 can arrive <i>before</i> response 1. If both write to state, the older answer wins and the screen shows the wrong user. Cleanup that aborts or ignores the old request fixes it.</p>`,
  clues: [
    '"reuse stateful logic between components" -> custom hook',
    '"search as you type", "don\'t call the API on every keystroke" -> useDebounce',
    '"data fetching hook", "loading / error / data" -> useFetch with cleanup',
    '"results flicker or show the wrong item when switching quickly" -> race condition; abort or ignore stale response',
    '"two components must share the same state" -> NOT a custom hook alone; lift state or use context',
    '"write your own useLocalStorage / useToggle / usePrevious / useInterval" -> classic machine-coding hook questions'
  ],
  code: [
    J(`import { useState, useEffect } from 'react';

// 1) useDebounce: returns the value only after it stopped changing for 'delay' ms
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);   // start a timer for this value
    return () => clearTimeout(id);                              // cleanup cancels it if value changes first
  }, [value, delay]);
  return debounced;
}

// 2) useFetch: loading / error / data with abort cleanup
export function useFetch(url) {
  const [state, setState] = useState({ data: null, error: null, loading: !!url });

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    setState(s => ({ ...s, loading: true, error: null }));

    fetch(url, { signal: controller.signal })
      .then(res => { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
      .then(data => setState({ data, error: null, loading: false }))
      .catch(err => {
        if (err.name === 'AbortError') return;                  // we cancelled it ourselves: not an error
        setState({ data: null, error: err, loading: false });
      });

    return () => controller.abort();                            // url changed or unmounted
  }, [url]);

  return state;
}

// usage
function Search() {
  const [text, setText] = useState('');
  const query = useDebounce(text, 300);
  const { data, loading, error } = useFetch(query ? '/api/search?q=' + encodeURIComponent(query) : null);
  return (
    <>
      <input value={text} onChange={e => setText(e.target.value)} />
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error.message}</p>}
      {data && <ul>{data.map(r => <li key={r.id}>{r.title}</li>)}</ul>}
    </>
  );
}`, 'useDebounce, useFetch and how they combine (React)'),
    R(`// Debounce with a VIRTUAL clock so we can see the timing without waiting.
function debounceTrace(events, delay) {
  let timer = null;                   // { value, fireAt } or null
  const fired = [];
  const flushUntil = (t) => { if (timer && timer.fireAt <= t) { fired.push('t=' + timer.fireAt + ' fired "' + timer.value + '"'); timer = null; } };

  for (const [value, t] of events) {
    flushUntil(t);                                   // did the old timer fire before this keystroke?
    if (timer) console.log('t=' + t + ' keystroke "' + value + '": cancel timer for "' + timer.value + '"');
    else console.log('t=' + t + ' keystroke "' + value + '": no timer pending');
    timer = { value, fireAt: t + delay };            // cleanup + new effect = cancel and restart
  }
  flushUntil(Infinity);
  return fired;
}

const typing = [['h', 0], ['he', 120], ['hel', 240], ['hell', 900], ['hello', 1000]];
const result = debounceTrace(typing, 300);
console.log('--- API calls actually made ---');
result.forEach(r => console.log(r));`, 'Debounce timeline model (run it)')
  ],
  codeTitle: ['React: useDebounce + useFetch + usage', 'Plain JS: debounce with a virtual clock'],
  viz: [
    {
      title: 'useDebounce timeline: timers started and cancelled',
      input: 'h:0 he:120 hel:240 hell:900 hello:1000',
      inputLabel: 'keystrokes as text:time-in-ms (delay is 300 ms)',
      gen: function (input) {
        var delay = 300;
        var evs = String(input || '').trim().split(/\s+/).filter(Boolean).map(function (tok) {
          var i = tok.lastIndexOf(':'); if (i < 1) throw new Error('Use text:time like h:0 he:120');
          var t = Number(tok.slice(i + 1)); if (isNaN(t) || t < 0) throw new Error('Time must be a number of ms');
          return { v: tok.slice(0, i), t: t };
        });
        if (evs.length < 2 || evs.length > 8) throw new Error('Enter 2 to 8 keystrokes');
        evs.sort(function (a, b) { return a.t - b.t; });
        var frames = [], timer = null, debounced = '', calls = 0, log = [], typed = '', i;
        function parts(hlv) {
          return [
            { type: 'vars', label: 'State', vals: { 'text (typed)': typed || '-', 'debounced': debounced || '-', 'API calls': calls }, hl: hlv || {} },
            { type: 'queue', label: 'Pending timer (only one can exist)', items: timer ? ['"' + timer.v + '" fires at t=' + timer.at] : [] },
            { type: 'table', label: 'Log', columns: ['time', 'what happened'], rows: log.map(function (r) { return r.slice(); }), hl: log.length ? (function () { var h = {}; h[log.length - 1] = 'cur'; return h; })() : {} }
          ];
        }
        function fireIfDue(limit) {
          if (timer && timer.at <= limit) {
            debounced = timer.v; calls++;
            log.push(['t=' + timer.at + 'ms', 'timer fires: debounced = "' + timer.v + '" -> search API called']);
            frames.push({ narr: 'No keystroke arrived for <b>' + delay + ' ms</b>, so the timer survives and fires at t=' + timer.at + '. <code>setDebounced("' + timer.v + '")</code> runs and the component re-renders with the new debounced value, which triggers the fetch.', parts: parts({ debounced: 'ok', 'API calls': 'ok' }) });
            timer = null;
          }
        }
        frames.push({ narr: 'Setup: <code>useDebounce(text, 300)</code>. Each time <code>text</code> changes the effect starts a 300 ms timer and returns a cleanup that cancels it.', parts: parts() });
        for (i = 0; i < evs.length; i++) {
          fireIfDue(evs[i].t);
          typed = evs[i].v;
          var had = timer;
          log.push(['t=' + evs[i].t + 'ms', 'typed "' + typed + '"' + (had ? ' - cleanup cancels timer for "' + had.v + '"' : '') + ' - start timer firing at t=' + (evs[i].t + delay)]);
          timer = { v: typed, at: evs[i].t + delay };
          frames.push({ narr: '<b>t=' + evs[i].t + ' ms:</b> text becomes "' + typed + '". ' + (had ? '<span class="c-r">The cleanup runs first and cancels the old timer for "' + had.v + '".</span> ' : '') + 'Then the new effect starts a timer to fire at t=' + (evs[i].t + delay) + '.', parts: parts({ 'text (typed)': 'cur' }) });
        }
        fireIfDue(Infinity);
        frames.push({ narr: evs.length + ' keystrokes produced only <b>' + calls + '</b> API call' + (calls === 1 ? '' : 's') + '. Without debounce it would have been ' + evs.length + '. The user paused long enough only at the points where a timer fired.', parts: parts({ 'API calls': 'sel' }) });
        return frames;
      }
    },
    {
      title: 'Race condition: fast switch, slow first response',
      input: '800 200',
      inputLabel: 'latency in ms of request 1 and request 2 (user switches at t=100)',
      gen: function (input) {
        var p = String(input || '800 200').trim().split(/[\s,]+/).map(Number);
        if (p.length !== 2 || p.some(function (x) { return isNaN(x) || x < 1 || x > 5000; })) throw new Error('Enter two latencies like: 800 200');
        var gap = 100, l1 = p[0], l2 = p[1];
        var evs = [{ t: 0, k: 'send', id: 1 }, { t: gap, k: 'send', id: 2 }, { t: l1, k: 'resp', id: 1 }, { t: gap + l2, k: 'resp', id: 2 }];
        evs.sort(function (a, b) { return a.t - b.t || (a.k === 'send' ? -1 : 1); });
        var frames = [], naive = '-', safe = '-', latest = 0, rows = [], first = true;
        frames.push({ narr: 'A page shows user details for <code>id</code>. The user picks id 1, then 100 ms later switches to id 2. Request 1 takes <b>' + l1 + ' ms</b>, request 2 takes <b>' + l2 + ' ms</b>. We compare a hook <b>without cleanup</b> and one <b>with cleanup</b> (abort or ignore flag).', parts: [
          { type: 'vars', label: 'Screen', vals: { 'without cleanup': '-', 'with cleanup': '-' } } ] });
        evs.forEach(function (e) {
          var note;
          if (e.k === 'send') { latest = e.id; note = 'request ' + e.id + ' sent' + (e.id === 2 ? ' - cleanup for id 1 runs: abort / set ignore = true' : ''); }
          else {
            naive = 'user ' + e.id;
            if (e.id === latest) { safe = 'user ' + e.id; note = 'response ' + e.id + ' arrives - applied by both versions'; }
            else note = 'response ' + e.id + ' arrives LATE - naive version applies it, safe version ignores it';
          }
          rows.push(['t=' + e.t + 'ms', note, naive, safe]);
          var h = {}; h[rows.length - 1] = 'cur';
          frames.push({ narr: '<b>t=' + e.t + ' ms:</b> ' + note + '.' + (e.k === 'resp' && e.id !== latest ? ' <span class="c-r">The naive screen now shows a stale user.</span>' : ''), parts: [
            { type: 'table', label: 'Timeline', columns: ['time', 'event', 'screen WITHOUT cleanup', 'screen WITH cleanup'], rows: rows.map(function (r) { return r.slice(); }), hl: h },
            { type: 'vars', label: 'Screen now', vals: { 'without cleanup': naive, 'with cleanup': safe }, hl: { 'without cleanup': naive === 'user 2' || naive === '-' ? 'ok' : 'bad', 'with cleanup': 'ok' } } ] });
        });
        frames.push({ narr: (naive === 'user 2' ? 'Here the responses came back in order, so both versions end on user 2. Try <code>800 200</code>: the slow first response arrives last and overwrites the right answer in the naive version.' : '<span class="c-r">Final screen without cleanup: ' + naive + '</span> - but the user asked for user 2! With cleanup the screen correctly ends on <b>' + safe + '</b>.'), parts: [
          { type: 'vars', label: 'Final screen', vals: { 'without cleanup': naive, 'with cleanup': safe }, hl: { 'without cleanup': naive === 'user 2' ? 'ok' : 'bad', 'with cleanup': 'ok' } } ] });
        return frames;
      }
    }
  ],
  examples: [
    { title: 'useToggle and useLocalStorage', html: `<p>The two smallest useful hooks. Notice how <code>useLocalStorage</code> mirrors <code>useState</code>'s shape so it is a drop-in replacement, and how it protects against broken JSON and blocked storage.</p>`, code: J(`function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : initial;      // lazy: read once
    } catch (e) { return initial; }                          // bad JSON or blocked storage
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore quota errors */ }
  }, [key, value]);
  return [value, setValue];
}`) },
    { title: 'Each call has its own state', html: `<p>Hooks share <i>logic</i>, not <i>data</i>. This tiny factory shows it: every call to <code>makeCounterHook()</code> creates a new private variable, just like every component instance creates its own slots.</p>`, code: R(`function makeCounterHook() {
  let count = 0;                                 // private to this "component instance"
  return { increment: () => ++count, read: () => count };
}
const headerCounter = makeCounterHook();
const footerCounter = makeCounterHook();
headerCounter.increment(); headerCounter.increment();
footerCounter.increment();
console.log('header:', headerCounter.read(), 'footer:', footerCounter.read());   // 2 and 1, not shared`) },
    { title: 'useEventListener with the latest handler', html: `<p>Keep the listener registered once, but always call the newest handler by storing it in a ref. This removes both the re-subscribe churn and the stale-closure bug.</p>`, code: J(`function useEventListener(type, handler, target = window) {
  const saved = useRef(handler);
  useEffect(() => { saved.current = handler; });          // refresh every render
  useEffect(() => {
    const listener = (e) => saved.current(e);
    target.addEventListener(type, listener);
    return () => target.removeEventListener(type, listener);
  }, [type, target]);                                      // handler is NOT a dependency
}`) },
    { title: 'Subscribing to external data safely', html: `<p>For browser values that change outside React (online status, media queries, a store) the official tool is <code>useSyncExternalStore</code>. It avoids tearing in concurrent rendering and handles the server snapshot.</p>`, code: J(`function useOnlineStatus() {
  return useSyncExternalStore(
    (notify) => {
      window.addEventListener('online', notify);
      window.addEventListener('offline', notify);
      return () => { window.removeEventListener('online', notify); window.removeEventListener('offline', notify); };
    },
    () => navigator.onLine,     // client snapshot
    () => true                  // server snapshot
  );
}`) }
  ],
  deepDive: `<p><b>Why custom hooks compose.</b> Because hooks are matched by call order inside one component, a custom hook is just "more hook calls inserted in the same list". <code>useSearch</code> may call <code>useDebounce</code> and <code>useFetch</code> and the parent never needs to know how many slots they use. This is why the rules of hooks make composition possible.</p>
    <p><b>API design.</b> Return an array for 1-2 values you expect callers to rename (<code>[value, setValue]</code>), an object for 3+ (<code>{ data, error, loading, refetch }</code>). Return stable callbacks. Accept an options object but remember it is a new object each render: read fields out of it for dependencies. Document what is re-run when arguments change.</p>
    <p><b>Debounce vs throttle.</b> Debounce waits for quiet (search box, auto-save). Throttle lets the function run at most once per interval (scroll, resize, drag). A <code>useDebouncedCallback</code> variant keeps the timer id in a ref and also exposes <code>cancel</code> and <code>flush</code>.</p>
    <p><b>When not to hand-write useFetch.</b> A production-grade data hook needs caching, request de-duplication, retries with backoff, revalidation on focus, pagination and optimistic updates. That is what React Query/SWR, RTK Query, Apollo or framework loaders (Next.js, Remix) provide. Writing it by hand is an excellent interview and learning exercise, not a production strategy beyond small apps.</p>
    <p><b>Server rendering.</b> Effects do not run on the server, so a hook that reads <code>window</code> or <code>localStorage</code> in render breaks SSR. Read them in effects or lazy initial state guarded by <code>typeof window !== 'undefined'</code>, and for hydration safety start from a server-compatible value and update after mount (or use <code>useSyncExternalStore</code> with a server snapshot).</p>
    <p><b>Testing.</b> <code>renderHook(() =&gt; useDebounce(v, 300))</code> with fake timers (<code>jest.useFakeTimers()</code> / <code>vi.useFakeTimers()</code>) lets you assert timing without waiting. For <code>useFetch</code> mock <code>fetch</code> and assert the abort signal fires on rerender with a new URL.</p>`,
  aiEra: `<p><b>What AI changes:</b> asking an assistant for "a useFetch hook" returns something that works on the happy path in seconds. The usual defects: no abort on URL change, no handling of non-2xx (fetch only rejects on network errors), dependency arrays with the whole <code>options</code> object (infinite loop), and state updates after unmount.</p>
    <p><b>Use AI as a partner:</b> have it write the hook <i>and</i> a list of failure scenarios, then turn each scenario into a test with fake timers. For example <code>Write tests for useDebounce: rapid typing, delay change, unmount during pending timer.</code> If the generated hook fails its own tests you learned something about both.</p>
    <p><b>Production reality in 2026:</b> before adding a custom data-fetching hook, check whether the project already uses TanStack Query, SWR, or a framework data API; AI tools will happily duplicate them. Custom hooks shine for UI logic (debounce, keyboard shortcuts, media queries) that libraries do not cover.</p>
    <p><b>What you must still own:</b> the design contract of the hook - what triggers it, what it cleans up, what it returns - and the ability to explain race conditions and cleanup order from memory.</p>`,
  problems: [
    {
      title: 'Implement useDebounce for Search',
      level: 'Medium', tags: ['custom hook', 'useEffect', 'cleanup', 'debounce'], companies: ['Google', 'Flipkart', 'Swiggy'],
      statement: `<p>Write <code>useDebounce(value, delay)</code> that returns a copy of <code>value</code> that only updates after <code>value</code> has stayed unchanged for <code>delay</code> milliseconds. Use it in a <code>SearchBox</code> so the (fake) <code>searchApi(query)</code> is called only when the user pauses typing for 300 ms, and never for an empty query. The hook must clean up when unmounted or when <code>delay</code> changes.</p>`,
      constraints: `No libraries (no lodash). Must work for any value type. At most one pending timer per hook instance. React 18+.`,
      example: `${H.table(['t (ms)', 'User types', 'Timer', 'API call?'], [['0', '"h"', 'start (fires 300)', 'no'], ['120', '"he"', H.c('r', 'cancel') + ' + start (fires 420)', 'no'], ['240', '"hel"', H.c('r', 'cancel') + ' + start (fires 540)', 'no'], ['540', '(pause)', 'fires', H.c('g', 'search("hel")')]])}<p>Three keystrokes, one API call.</p>`,
      brute: {
        why: `<p>Calling the API inside <code>onChange</code> sends one request per keystroke: typing "hello" makes 5 requests, and the responses can arrive out of order. Wrapping the handler with a plain <code>setTimeout</code> (without cancelling the previous timer) just delays all 5 calls instead of reducing them - the wasted work is still 5 requests.</p>`,
        code: J(`function SearchBox() {
  const [results, setResults] = useState([]);
  const onChange = (e) => {
    const q = e.target.value;
    setTimeout(() => searchApi(q).then(setResults), 300);   // every keystroke still fires, only later
  };
  return <input onChange={onChange} />;
}`, 'Delays every call, cancels none')
      },
      mcq: { q: 'In useDebounce, what actually cancels the previous timer when the value changes?', options: ['The effect cleanup function calling clearTimeout', 'React automatically clears all timers', 'The dependency array', 'setState batching'], answer: 0, explain: 'Before the effect runs again for the new value, React runs the previous effect\'s cleanup, which calls clearTimeout(id). Only the timer from the last value survives.' },
      hints: [
        `<p>Hint 1: you need two values: the live one (updates every keystroke) and the debounced one (updates late). The debounced one is state inside the hook.</p>`,
        `<p>Hint 2: an effect depending on <code>[value, delay]</code> starts <code>setTimeout(() =&gt; setDebounced(value), delay)</code>. What should its cleanup do?</p>`,
        `<p>Hint 3: recipe: <code>useState(value)</code> for the initial debounced value (so first render is immediate); effect with timer; cleanup <code>clearTimeout</code>. In <code>SearchBox</code> a second effect depends on the debounced query and calls the API with an ignore flag.</p>`
      ],
      solution: {
        approach: `<p>The hook stores the delayed copy in state. Each change of <code>value</code> restarts a timer; the cleanup cancels the previous one, so only the last value in a burst gets through. The component reacts to the debounced value, not to every keystroke.</p>`,
        code: J(`import { useState, useEffect } from 'react';

export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);          // value or delay changed (or unmounted): cancel
  }, [value, delay]);

  return debounced;
}

export function SearchBox() {
  const [text, setText] = useState('');
  const query = useDebounce(text.trim(), 300);
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!query) { setResults([]); return; }  // never call the API for an empty query
    let ignore = false;
    searchApi(query).then(list => { if (!ignore) setResults(list); });
    return () => { ignore = true; };         // drop late replies for old queries
  }, [query]);

  return (
    <div>
      <input value={text} onChange={e => setText(e.target.value)} placeholder="Search..." />
      <ul>{results.map(r => <li key={r.id}>{r.title}</li>)}</ul>
    </div>
  );
}`, 'useDebounce + SearchBox'),
        alt: [R(`// Plain JS version: a debounce function (what the hook does internally), run with real short timers.
function debounce(fn, delay) {
  let id = null;
  return (...args) => {
    clearTimeout(id);                         // cancel the previous pending call
    id = setTimeout(() => fn(...args), delay);
  };
}
const calls = [];
const search = debounce((q) => { calls.push(q); console.log('API called with', q); }, 50);

['h', 'he', 'hel'].forEach((q, i) => setTimeout(() => search(q), i * 20));   // quick typing
setTimeout(() => search('hello'), 200);                                       // pause, then one more
setTimeout(() => console.log('total API calls:', calls.length), 400);`, 'debounce function (runnable)')],
        dry: { head: ['t (ms)', 'text', 'timer action', 'debounced value'], rows: [['0', 'h', 'start (fire 300)', '"" (initial)'], ['120', 'he', 'cancel, start (fire 420)', '""'], ['240', 'hel', 'cancel, start (fire 540)', '""'], ['540', 'hel', 'fires', '"hel" -> API']] },
        complexity: `<p>O(1) per keystroke (one clearTimeout and one setTimeout). Network calls drop from one per keystroke to roughly one per pause.</p>`,
        followUps: ['How would you add leading-edge debounce (fire immediately, then ignore)?', 'How do you flush the debounce when the user presses Enter?']
      }
    }
  ]
});

/* ============================ PRACTICE (Easy -> Medium -> Hard) ============================ */

practice.push({
  title: 'useToggle Hook', level: 'Easy', tags: ['custom hook', 'useState', 'useCallback'], companies: ['Swiggy', 'Meesho'],
  statement: `<p>Menus, modals, accordions and checkboxes all need a boolean that flips. Write <code>useToggle(initial = false)</code> that returns <code>[value, toggle, setValue]</code>. <code>toggle</code> must keep the <b>same function identity</b> between renders and must work correctly even when called twice in one event handler.</p>`,
  constraints: `React 18. No libraries. <code>toggle</code> must be safe to put in a dependency array or pass to a <code>React.memo</code> child.`,
  example: `${H.table(['Calls in one handler', 'Result'], [['toggle()', 'true'], ['toggle(); toggle();', 'false (two flips)'], ['setValue(true)', 'true']])}<p>If <code>toggle</code> were written as <code>setOn(!on)</code>, the double call would flip only once (both read the same snapshot).</p>`,
  brute: {
    why: `<p>Writing <code>setOn(!on)</code> inside a new arrow function on every render makes two problems: two calls in one handler give a single flip (stale snapshot), and the function has a new identity each render so memoized children re-render.</p>`,
    code: J(`function useToggleBad(initial = false) {
  const [on, setOn] = useState(initial);
  const toggle = () => setOn(!on);        // reads the snapshot, new identity each render
  return [on, toggle];
}`, 'Snapshot + unstable identity')
  },
  mcq: { q: 'Which toggle implementation survives two calls in one click handler?', options: ['setOn(o => !o)', 'setOn(!on)', 'on = !on', 'setOn(on ? false : true)'], answer: 0, explain: 'Only the updater form reads the latest queued value. The others all use the frozen snapshot of on from this render.' },
  hints: [
    `<p>Hint 1: the new value depends on the old value, so use the updater form of the setter.</p>`,
    `<p>Hint 2: to keep the function identity stable wrap it in <code>useCallback</code>. Its dependency array can be empty because the setter is stable and the updater needs no outer variable.</p>`,
    `<p>Hint 3: recipe: <code>const [value, setValue] = useState(initial)</code>; <code>const toggle = useCallback(() =&gt; setValue(v =&gt; !v), [])</code>; return <code>[value, toggle, setValue]</code>.</p>`
  ],
  solution: {
    approach: `<p>Updater function for correctness, <code>useCallback</code> with <code>[]</code> for a stable identity, and expose the raw setter for explicit open/close.</p>`,
    code: J(`import { useState, useCallback } from 'react';

export function useToggle(initial = false) {
  const [value, setValue] = useState(initial);
  const toggle = useCallback(() => setValue(v => !v), []);   // stable, never stale
  return [value, toggle, setValue];
}

// usage
function Accordion() {
  const [open, toggleOpen] = useToggle();
  return (
    <section>
      <button onClick={toggleOpen} aria-expanded={open}>Details</button>
      {open && <p>Hidden content</p>}
    </section>
  );
}`, 'useToggle'),
    alt: [R(`// Model: two toggles in one handler with updater functions
let value = false;
const queue = [];
const toggle = () => queue.push(v => !v);
toggle(); toggle();                                  // one click handler, two calls
for (const u of queue) value = u(value);
console.log('after two toggles:', value);            // false`, 'Queue model (runnable)')],
    complexity: `<p>O(1) time and space; no re-renders beyond the state change itself.</p>`,
    followUps: ['How would you make it work with a controlled prop (value and onChange from the parent)?', 'Why is it fine to omit setValue from dependency arrays?']
  }
});

practice.push({
  title: 'useDocumentTitle with Cleanup', level: 'Easy', tags: ['useEffect', 'cleanup', 'custom hook'], companies: ['Zoho', 'Infosys'],
  statement: `<p>Write <code>useDocumentTitle(title)</code> that sets <code>document.title</code> while the component is mounted and <b>restores the previous title</b> when it unmounts (so leaving the "Inbox (3)" page does not leave a wrong title behind). It must update when <code>title</code> changes.</p>`,
  constraints: `Use <code>useEffect</code>. Do not set the title during render.`,
  example: `${H.table(['Event', 'document.title'], [['page loads', '"My App"'], ['Inbox mounts with "Inbox (3)"', '"Inbox (3)"'], ['count changes to 4', '"Inbox (4)"'], ['Inbox unmounts', '"My App" (restored)']])}`,
  brute: {
    why: `<p>Assigning <code>document.title = title</code> in the component body mutates the outside world during render (impure, runs twice in Strict Mode, runs even if the render is discarded) and never restores the old title on unmount.</p>`,
    code: J(`function Inbox({ count }) {
  document.title = 'Inbox (' + count + ')';     // side effect during render, never restored
  return <h1>Inbox</h1>;
}`, 'Side effect in render')
  },
  mcq: { q: 'When does the cleanup of useEffect(() => { ...; return cleanup; }, [title]) run?', options: ['Before the next effect run (title changed) and when the component unmounts', 'Only on unmount', 'Before every render, even if title is the same', 'Never automatically'], answer: 0, explain: 'React runs the previous effect cleanup right before running the effect again (dependencies changed) and once more on unmount.' },
  hints: [
    `<p>Hint 1: a side effect on the outside world (the page title) belongs in <code>useEffect</code>, not in the render body.</p>`,
    `<p>Hint 2: inside the effect, remember the old title in a local variable <i>before</i> you change it. The cleanup can read that variable because it is a closure.</p>`,
    `<p>Hint 3: recipe: <code>useEffect(() =&gt; { const prev = document.title; document.title = title; return () =&gt; { document.title = prev; }; }, [title]);</code></p>`
  ],
  solution: {
    approach: `<p>The effect saves the previous title in a closure, sets the new one, and the cleanup restores it. With <code>[title]</code> the pair runs again whenever the title changes, and the cleanup chain always restores correctly.</p>`,
    code: J(`import { useEffect } from 'react';

export function useDocumentTitle(title) {
  useEffect(() => {
    const previous = document.title;       // captured by this effect's closure
    document.title = title;
    return () => { document.title = previous; };
  }, [title]);
}

function Inbox({ count }) {
  useDocumentTitle('Inbox (' + count + ')');
  return <h1>Inbox</h1>;
}`, 'useDocumentTitle'),
    alt: [R(`// Model with a fake document: three title changes then unmount
const doc = { title: 'My App' };
let cleanup = null;
function effect(title) {
  if (cleanup) cleanup();                 // previous cleanup runs first
  const previous = doc.title;
  doc.title = title;
  cleanup = () => { doc.title = previous; };
}
effect('Inbox (3)'); console.log(doc.title);
effect('Inbox (4)'); console.log(doc.title);
cleanup(); console.log('after unmount:', doc.title);`, 'Cleanup chain (runnable)')],
    complexity: `<p>O(1) per title change.</p>`,
    followUps: ['What happens with two components using the hook at once? (Last mount wins; unmount order matters - a stack of titles is the robust fix.)', 'How does a framework like Next.js handle titles instead?']
  }
});

practice.push({
  title: 'Focus Input on Mount and on Demand', level: 'Easy', tags: ['useRef', 'DOM', 'useEffect'], companies: ['Paytm', 'TCS'],
  statement: `<p>Build a <code>SearchBar</code> with a text input and a "Clear" button. The input must receive focus automatically when the component first appears, and clicking "Clear" must empty it and put the focus back in the input. Do not use <code>document.getElementById</code>.</p>`,
  constraints: `React 18, function component, <code>useRef</code> and <code>useEffect</code> only. Controlled input.`,
  example: `${H.table(['Action', 'Result'], [['page opens', 'cursor already blinking in the input'], ['type "abc", click Clear', 'input empty, cursor back in the input']])}<p>After clicking the button the browser moves focus to the button; our code must move it back.</p>`,
  brute: {
    why: `<p>Looking up the element with <code>document.getElementById</code> works until the component renders twice on a page (duplicate ids) or the id changes; it also bypasses React. Calling <code>focus()</code> during render fails on the first render because the DOM node does not exist yet.</p>`,
    code: J(`function SearchBarBad() {
  const [text, setText] = useState('');
  const clear = () => { setText(''); document.getElementById('q').focus(); };
  return (<><input id="q" value={text} onChange={e => setText(e.target.value)} /><button onClick={clear}>Clear</button></>);
}`, 'getElementById approach')
  },
  mcq: { q: 'Where can you safely call inputRef.current.focus() right after the first render?', options: ['Inside useEffect with [] dependencies', 'In the component body before return', 'Inside the JSX expression', 'Outside the component'], answer: 0, explain: 'During the first render ref.current is still null. After React commits the DOM it sets the ref, and effects run after that, so useEffect is the right place.' },
  hints: [
    `<p>Hint 1: a ref gives you the real DOM node after it is on the page. Attach it with <code>ref={inputRef}</code>.</p>`,
    `<p>Hint 2: on mount use an effect with <code>[]</code>. For the button, call <code>inputRef.current.focus()</code> in the click handler.</p>`,
    `<p>Hint 3: recipe: <code>const inputRef = useRef(null)</code>; effect <code>inputRef.current?.focus()</code>; <code>clear</code> sets text to <code>''</code> and focuses. Focus can be called immediately; it does not wait for the re-render.</p>`
  ],
  solution: {
    approach: `<p>One ref for the input; an effect focuses on mount; the clear handler resets state and focuses directly.</p>`,
    code: J(`import { useRef, useEffect, useState } from 'react';

export function SearchBar() {
  const [text, setText] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();            // DOM node exists now
  }, []);

  function clear() {
    setText('');
    inputRef.current?.focus();            // button took focus on click; give it back
  }

  return (
    <div>
      <input ref={inputRef} value={text} onChange={e => setText(e.target.value)} placeholder="Search..." />
      <button onClick={clear}>Clear</button>
    </div>
  );
}`, 'SearchBar with ref focus'),
    complexity: `<p>O(1). Refs do not cause re-renders; the only re-render is from the state change.</p>`,
    followUps: ['How would you focus the first invalid field after a failed submit?', 'What changes if the input lives inside a child component? (forwardRef, or ref as a prop in React 19.)']
  }
});

practice.push({
  title: 'useWindowSize Hook', level: 'Easy', tags: ['useEffect', 'event listener', 'cleanup', 'SSR'], companies: ['Adobe', 'Myntra'],
  statement: `<p>Write <code>useWindowSize()</code> returning <code>{ width, height }</code> that updates when the browser window is resized. It must remove its listener on unmount, and it must not crash when rendered on the server where <code>window</code> does not exist.</p>`,
  constraints: `No libraries. A resize can fire dozens of times per second: the hook should not do heavy work per event.`,
  example: `${H.table(['Event', 'Returned value'], [['first render (browser 1024x768)', '{ width: 1024, height: 768 }'], ['user drags window to 600x768', '{ width: 600, height: 768 }'], ['component unmounts', 'listener removed']])}`,
  brute: {
    why: `<p>Reading <code>window.innerWidth</code> directly in render gives the right number only at that moment and never triggers a re-render on resize. Adding a listener without removing it leaks a new listener every time the component re-mounts.</p>`,
    code: J(`function Width() {
  window.addEventListener('resize', () => console.log(window.innerWidth));   // leaks, never updates UI
  return <p>{window.innerWidth}</p>;                                          // crashes on the server
}`, 'Leaky listener')
  },
  mcq: { q: 'Why must the cleanup call removeEventListener with the SAME function that was added?', options: ['removeEventListener matches by reference; a different function would not be removed', 'Because functions are copied by value', 'React forbids anonymous functions', 'To keep the dependency array empty'], answer: 0, explain: 'The browser identifies listeners by function identity. Create the handler once inside the effect and pass that exact reference to both add and remove.' },
  hints: [
    `<p>Hint 1: the width is a piece of UI state that changes over time; the resize event is the outside world telling you about it.</p>`,
    `<p>Hint 2: start with a server-safe initial value (zeros or <code>undefined</code>), then read the real size inside the effect and subscribe to <code>resize</code>.</p>`,
    `<p>Hint 3: recipe: <code>useState({ width: 0, height: 0 })</code>; effect: define <code>update</code>, call it once, <code>addEventListener</code>, cleanup removes it. For heavy work, throttle with <code>requestAnimationFrame</code>.</p>`
  ],
  solution: {
    approach: `<p>Effect-based subscription. Start from a server-safe value, sync after mount, listen with one stable handler, and unsubscribe on unmount. A rAF guard batches rapid resize events to at most one state update per frame.</p>`,
    code: J(`import { useState, useEffect } from 'react';

export function useWindowSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });   // same on server and first client render

  useEffect(() => {
    let frame = 0;
    const update = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    const onResize = () => {
      cancelAnimationFrame(frame);                // at most one update per animation frame
      frame = requestAnimationFrame(update);
    };
    update();                                     // read the real size once after mount
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(frame);
    };
  }, []);

  return size;
}`, 'useWindowSize'),
    complexity: `<p>O(1) per frame; listeners: exactly one while mounted. Memory is constant.</p>`,
    followUps: ['How would you build useMediaQuery with matchMedia instead?', 'Would useSyncExternalStore be better here? Why?']
  }
});

practice.push({
  title: 'useLocalStorage Hook', level: 'Medium', tags: ['custom hook', 'localStorage', 'lazy init', 'useEffect'], companies: ['Atlassian', 'Zomato'],
  statement: `<p>Implement <code>useLocalStorage(key, initialValue)</code> with the same API as <code>useState</code>: returns <code>[value, setValue]</code>. It must (1) read the saved JSON once on first render, (2) save every change, (3) support updater functions <code>setValue(v =&gt; v + 1)</code>, (4) never crash if storage is blocked or the saved JSON is broken, and (5) keep multiple browser tabs in sync using the <code>storage</code> event.</p>`,
  constraints: `JSON-serialisable values. Lazy initial state. Remove listeners on unmount.`,
  example: `${H.table(['Situation', 'Hook returns'], [['no saved value', 'initialValue'], ['saved "42"', '42'], ['saved "{oops" (broken)', 'initialValue (error swallowed)'], ['other tab writes "7"', 'updates to 7 here via storage event']])}`,
  brute: {
    why: `<p>Calling <code>JSON.parse(localStorage.getItem(key))</code> inside <code>useState(...)</code> without a function runs parse on <b>every</b> render, and throws on bad JSON or when storage is blocked, which would crash the whole component tree.</p>`,
    code: J(`function useLocalStorageBad(key, initial) {
  const [value, setValue] = useState(JSON.parse(localStorage.getItem(key)) ?? initial);   // runs every render, can throw
  localStorage.setItem(key, JSON.stringify(value));                                       // side effect in render
  return [value, setValue];
}`, 'Eager read, write in render')
  },
  mcq: { q: 'Why pass a function to useState(() => readFromStorage())?', options: ['The function runs only on the first render instead of every render', 'It makes the value update when storage changes', 'It prevents JSON errors', 'It makes the setter stable'], answer: 0, explain: 'Lazy initialisation avoids re-running a slow read (and parse) on every render. It does not by itself handle errors or tab sync.' },
  hints: [
    `<p>Hint 1: reading storage is slow and can throw, so do it lazily and wrap it in try/catch.</p>`,
    `<p>Hint 2: write to storage in an effect that depends on <code>[key, value]</code>, not during render. Other tabs announce changes with a <code>storage</code> event on <code>window</code>.</p>`,
    `<p>Hint 3: recipe: lazy <code>useState(read)</code>; effect to write; second effect: on <code>storage</code> events where <code>e.key === key</code> parse <code>e.newValue</code> and <code>setValue</code>. Note: the storage event does not fire in the tab that made the change.</p>`
  ],
  solution: {
    approach: `<p>Lazy read with a safe parser, an effect to persist, and a storage listener for cross-tab sync. The returned setter is the plain state setter so updater functions work for free.</p>`,
    code: J(`import { useState, useEffect, useRef } from 'react';

function read(key, initial) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? initial : JSON.parse(raw);
  } catch (e) {
    return initial;                         // blocked storage or broken JSON
  }
}

export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => read(key, initialValue));
  const fallback = useRef(initialValue);       // only needed as the answer when a key is removed

  // persist on every change
  useEffect(() => {
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* quota or blocked */ }
  }, [key, value]);

  // sync from other tabs
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== key) return;
      setValue(e.newValue === null ? fallback.current : read(key, fallback.current));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key]);

  return [value, setValue];
}`, 'useLocalStorage'),
    alt: [R(`// Model of the safe read, with a fake storage so it runs anywhere
const storage = { good: '42', bad: '{oops' };
function read(key, initial) {
  try {
    const raw = storage[key];
    return raw === undefined ? initial : JSON.parse(raw);
  } catch (e) { return initial; }
}
console.log('missing ->', read('none', 'default'));
console.log('good    ->', read('good', 0));
console.log('broken  ->', read('bad', 'fallback'));`, 'Safe read (runnable)')],
    complexity: `<p>O(size of value) per save because of JSON serialisation; one parse at start. Avoid storing huge objects.</p>`,
    followUps: ['Why does the storage event not fire in the same tab?', 'How would you debounce writes for fast-changing values?']
  }
});

practice.push({
  title: 'useFetch with Abort Cleanup', level: 'Medium', tags: ['custom hook', 'fetch', 'AbortController', 'race condition'], companies: ['Amazon', 'Uber', 'Flipkart'],
  statement: `<p>Write <code>useFetch(url)</code> returning <code>{ data, error, loading }</code>. When <code>url</code> changes or the component unmounts, the in-flight request must be <b>aborted</b>, and an aborted request must not be reported as an error. Non-2xx responses must be reported as errors (<code>fetch</code> only rejects on network failure). If <code>url</code> is falsy, do nothing.</p>`,
  constraints: `No libraries. Never update state after unmount or for a stale URL. Use <code>AbortController</code>.`,
  example: `${H.table(['t', 'Event', 'Screen'], [['0', 'url = /u/1 (slow, 800 ms)', 'loading'], ['100', 'url becomes /u/2 (fast, 200 ms)', 'loading, request 1 aborted'], ['300', 'response 2', 'shows user 2'], ['800', 'response 1 would arrive', H.c('g', 'never applied (aborted)')]])}`,
  brute: {
    why: `<p>A plain <code>fetch(url).then(setData)</code> in an effect has no cleanup: with a slow first and fast second request, the older response overwrites the newer one (wrong data on screen), and a response after unmount triggers a warning and wasted work.</p>`,
    code: J(`function useFetchBad(url) {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch(url).then(r => r.json()).then(setData);   // no abort, no error handling, race condition
  }, [url]);
  return data;
}`, 'No cleanup')
  },
  mcq: { q: 'The abort rejects the fetch promise with an AbortError. How should the hook treat it?', options: ['Ignore it: we cancelled on purpose, and do not set error state', 'Show it to the user as a network error', 'Retry the request', 'Throw it again'], answer: 0, explain: 'AbortError is the expected result of our own cleanup. Reporting it would flash an error every time the URL changes.' },
  hints: [
    `<p>Hint 1: each effect run creates its own <code>AbortController</code>; the cleanup of that same run aborts it.</p>`,
    `<p>Hint 2: pass <code>controller.signal</code> to <code>fetch</code>. In <code>.catch</code> check <code>err.name === 'AbortError'</code> and return quietly.</p>`,
    `<p>Hint 3: recipe: set <code>loading: true</code> at the start, check <code>res.ok</code>, parse JSON, set the final state; cleanup <code>controller.abort()</code>. Keep state in one object to avoid half-updated combinations.</p>`
  ],
  solution: {
    approach: `<p>One effect per URL with its own controller. The cleanup aborts the old request before the new one starts, which removes the race. One state object holds loading/data/error so the three can never disagree.</p>`,
    code: J(`import { useState, useEffect } from 'react';

export function useFetch(url) {
  const [state, setState] = useState({ data: null, error: null, loading: Boolean(url) });

  useEffect(() => {
    if (!url) { setState({ data: null, error: null, loading: false }); return; }

    const controller = new AbortController();
    setState(prev => ({ data: prev.data, error: null, loading: true }));

    fetch(url, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error('HTTP ' + res.status);   // fetch does not reject on 404/500
        return res.json();
      })
      .then(data => setState({ data, error: null, loading: false }))
      .catch(err => {
        if (err.name === 'AbortError') return;                  // our own cancellation: ignore
        setState({ data: null, error: err, loading: false });
      });

    return () => controller.abort();                            // url changed or unmounted
  }, [url]);

  return state;
}`, 'useFetch'),
    alt: [R(`// Timeline model of the race: request 1 is slow, request 2 is fast
function simulate(withCleanup) {
  let screen = '-', latest = 0;
  const events = [
    { t: 0, run: () => { latest = 1; } },
    { t: 100, run: () => { latest = 2; } },           // url changed: cleanup would abort request 1
    { t: 300, run: () => { screen = 'user 2'; } },    // response 2 (fast)
    { t: 800, run: () => { if (!withCleanup || latest === 1) screen = 'user 1'; } }   // response 1 (slow)
  ];
  events.forEach(e => e.run());
  return screen;
}
console.log('without cleanup the screen ends on:', simulate(false));
console.log('with cleanup the screen ends on   :', simulate(true));`, 'Race model (runnable)')],
    complexity: `<p>O(1) extra work per URL change; at most one request is active at a time per hook instance.</p>`,
    followUps: ['How would you add caching so going back to a previous URL is instant?', 'How would you add a manual refetch function?']
  }
});

practice.push({
  title: 'useInterval with Pause and Latest Callback', level: 'Medium', tags: ['custom hook', 'stale closure', 'useRef', 'setInterval'], companies: ['Google', 'Microsoft', 'Cred'],
  statement: `<p>Write <code>useInterval(callback, delayMs)</code>. It calls <code>callback</code> every <code>delayMs</code> milliseconds. Rules: (1) the callback must always be the <b>latest</b> one (it may read current state and props), (2) changing the callback must <b>not</b> restart the timer, (3) passing <code>null</code> as the delay pauses the interval, and (4) the timer is cleared on unmount. Then use it to build a <code>Clock</code> that can be paused and resumed.</p>`,
  constraints: `One interval per delay value. No stale state in the callback. React 18.`,
  example: `${H.table(['Change', 'What the timer does'], [['parent re-renders with a new callback', 'same interval keeps running; next tick calls the newest callback'], ['delay changes 1000 -> 500', 'old interval cleared, new one started'], ['delay becomes null', 'interval cleared (paused)'], ['unmount', 'interval cleared']])}`,
  brute: {
    why: `<p>Putting <code>callback</code> in the effect dependency array restarts the timer on every render (the callback is a new function each time), so a ticking clock that re-renders every second keeps resetting its own timer and drifts. Using <code>[]</code> instead freezes the first callback with its stale state.</p>`,
    code: J(`function useIntervalBad(callback, delay) {
  useEffect(() => {
    const id = setInterval(callback, delay);
    return () => clearInterval(id);
  }, [callback, delay]);          // callback is new every render: timer restarts constantly
}`, 'Restarts on every render')
  },
  mcq: { q: 'How does the latest-callback pattern avoid restarting the interval?', options: ['The interval calls savedCallback.current(), and a ref is refreshed after every render', 'It adds callback to the dependency array', 'It uses setTimeout inside render', 'It stores the callback in state'], answer: 0, explain: 'The effect that owns the interval depends only on the delay. Inside, it calls ref.current(), and a separate effect keeps ref.current pointing at the newest callback.' },
  hints: [
    `<p>Hint 1: two jobs with different lifetimes: remembering the newest callback (every render) and running the timer (only when the delay changes).</p>`,
    `<p>Hint 2: store the callback in a ref and update it in an effect with no dependency array. The interval effect depends on <code>[delay]</code> only.</p>`,
    `<p>Hint 3: recipe: <code>if (delay === null) return;</code> at the top of the interval effect, then <code>setInterval(() =&gt; saved.current(), delay)</code> with cleanup <code>clearInterval</code>.</p>`
  ],
  solution: {
    approach: `<p>Two effects: one keeps <code>savedCallback.current</code> fresh, the other owns the interval and depends only on <code>delay</code>. <code>null</code> pauses by skipping the setup.</p>`,
    code: J(`import { useEffect, useRef, useState } from 'react';

export function useInterval(callback, delay) {
  const saved = useRef(callback);

  useEffect(() => { saved.current = callback; });      // always the newest function

  useEffect(() => {
    if (delay === null) return;                        // paused
    const id = setInterval(() => saved.current(), delay);
    return () => clearInterval(id);
  }, [delay]);                                         // callback is NOT a dependency
}

export function Clock() {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(true);
  useInterval(() => setSeconds(seconds + 1), running ? 1000 : null);   // reads current seconds safely
  return (
    <div>
      <h1>{seconds}s</h1>
      <button onClick={() => setRunning(r => !r)}>{running ? 'Pause' : 'Resume'}</button>
    </div>
  );
}`, 'useInterval + Clock'),
    alt: [R(`// Runnable model: virtual clock, the callback is swapped mid-way but the timer is created only once.
let timersCreated = 0;
const saved = { current: () => console.log('v1 tick') };
const timer = setInterval(() => saved.current(), 40);
timersCreated++;
setTimeout(() => { saved.current = () => console.log('v2 tick (newest callback, same timer)'); }, 60);
setTimeout(() => { clearInterval(timer); console.log('timers created:', timersCreated); }, 170);`, 'Latest callback, one timer (runnable)')],
    complexity: `<p>O(1) per tick; exactly one live interval while mounted and not paused.</p>`,
    followUps: ['How would useEffectEvent simplify this?', 'Why can setInterval drift and how could requestAnimationFrame or a Date.now() comparison help?']
  }
});

practice.push({
  title: 'Stopwatch with useReducer', level: 'Medium', tags: ['useReducer', 'useEffect', 'timers', 'machine coding'], companies: ['Swiggy', 'Atlassian', 'Uber'],
  statement: `<p>Build a stopwatch that supports <b>Start</b>, <b>Stop</b>, <b>Lap</b> and <b>Reset</b>. Keep all logic in one reducer with state <code>{ running, elapsedMs, laps }</code> and actions <code>start</code>, <code>stop</code>, <code>tick</code> (adds elapsed time), <code>lap</code> (records the current time, only while running) and <code>reset</code>. The interval must run only while <code>running</code> is true.</p>`,
  constraints: `Reducer is pure. Display as mm:ss.cs. The interval is cleaned up on stop and unmount. Ignore invalid actions (lap while stopped).`,
  example: `${H.table(['Action', 'running', 'elapsedMs', 'laps'], [['start', 'true', '0', '[]'], ['tick x 3 (10 ms each)', 'true', '30', '[]'], ['lap', 'true', '30', '[30]'], ['stop', 'false', '30', '[30]'], ['lap (ignored)', 'false', '30', '[30]'], ['reset', 'false', '0', '[]']])}`,
  brute: {
    why: `<p>Four separate <code>useState</code> hooks plus <code>setElapsed(elapsed + 10)</code> inside the interval is a stale-closure trap (the time sticks), and the Lap button can read an out-of-date elapsed value. Rules for what is allowed in each mode end up scattered across handlers.</p>`,
    code: J(`function StopwatchBad() {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [laps, setLaps] = useState([]);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsed(elapsed + 10), 10);   // stale: elapsed never grows
    return () => clearInterval(id);
  }, [running]);
  return <button onClick={() => setLaps([...laps, elapsed])}>Lap</button>;
}`, 'Stale elapsed')
  },
  mcq: { q: 'Why is tick better modelled as an action with a delta than as setElapsed(elapsed + 10)?', options: ['The reducer receives the latest state, so no stale closure is possible', 'dispatch is slower', 'It avoids using setInterval', 'It lets the reducer be impure'], answer: 0, explain: 'The interval callback only calls dispatch (stable). The reducer, called by React with the up-to-date state, adds the delta. Nothing is captured from an old render.' },
  hints: [
    `<p>Hint 1: list the legal events from each mode. Start is only useful when stopped; lap only when running.</p>`,
    `<p>Hint 2: the interval effect depends on <code>[state.running]</code> and just dispatches <code>{ type: 'tick', ms: 10 }</code>.</p>`,
    `<p>Hint 3: recipe: reducer cases return the same <code>state</code> object for invalid moves. Format time with <code>Math.floor</code> and <code>padStart</code>. Real elapsed time is better computed from <code>Date.now()</code> to avoid drift; mention it as an improvement.</p>`
  ],
  solution: {
    approach: `<p>A reducer owns the rules; the component translates button clicks into actions and an effect turns the passing of time into <code>tick</code> actions only while running.</p>`,
    code: J(`import { useReducer, useEffect } from 'react';

const initial = { running: false, elapsedMs: 0, laps: [] };

export function stopwatchReducer(state, action) {
  switch (action.type) {
    case 'start': return state.running ? state : { ...state, running: true };
    case 'stop':  return state.running ? { ...state, running: false } : state;
    case 'tick':  return state.running ? { ...state, elapsedMs: state.elapsedMs + action.ms } : state;
    case 'lap':   return state.running ? { ...state, laps: [...state.laps, state.elapsedMs] } : state;
    case 'reset': return initial;
    default:      return state;
  }
}

const fmt = ms => {
  const m = String(Math.floor(ms / 60000)).padStart(2, '0');
  const s = String(Math.floor(ms / 1000) % 60).padStart(2, '0');
  const cs = String(Math.floor(ms / 10) % 100).padStart(2, '0');
  return m + ':' + s + '.' + cs;
};

export function Stopwatch() {
  const [state, dispatch] = useReducer(stopwatchReducer, initial);

  useEffect(() => {
    if (!state.running) return;
    const id = setInterval(() => dispatch({ type: 'tick', ms: 10 }), 10);   // dispatch is stable
    return () => clearInterval(id);
  }, [state.running]);

  return (
    <div>
      <h1>{fmt(state.elapsedMs)}</h1>
      <button onClick={() => dispatch({ type: state.running ? 'stop' : 'start' })}>{state.running ? 'Stop' : 'Start'}</button>
      <button onClick={() => dispatch({ type: 'lap' })} disabled={!state.running}>Lap</button>
      <button onClick={() => dispatch({ type: 'reset' })}>Reset</button>
      <ol>{state.laps.map((l, i) => <li key={i}>{fmt(l)}</li>)}</ol>
    </div>
  );
}`, 'Stopwatch'),
    alt: [R(`const initial = { running: false, elapsedMs: 0, laps: [] };
function reducer(state, a) {
  switch (a.type) {
    case 'start': return state.running ? state : { ...state, running: true };
    case 'stop':  return state.running ? { ...state, running: false } : state;
    case 'tick':  return state.running ? { ...state, elapsedMs: state.elapsedMs + a.ms } : state;
    case 'lap':   return state.running ? { ...state, laps: [...state.laps, state.elapsedMs] } : state;
    case 'reset': return initial;
    default:      return state;
  }
}
let s = initial;
const script = [{ type: 'start' }, { type: 'tick', ms: 10 }, { type: 'tick', ms: 10 }, { type: 'tick', ms: 10 }, { type: 'lap' }, { type: 'stop' }, { type: 'lap' }, { type: 'tick', ms: 10 }, { type: 'reset' }];
for (const a of script) { const n = reducer(s, a); console.log(a.type.padEnd(6), n === s ? '(ignored)' : '', JSON.stringify(n)); s = n; }`, 'Reducer over a script (runnable)')],
    complexity: `<p>O(1) per action; O(L) memory for L laps. One interval exists only while running.</p>`,
    followUps: ['How do you remove drift? (Store startTime and compute elapsed = Date.now() - startTime on each tick.)', 'How would you persist laps across reloads?']
  }
});

practice.push({
  title: 'useClickOutside Hook', level: 'Medium', tags: ['custom hook', 'useRef', 'event listener', 'dropdown'], companies: ['Atlassian', 'Booking.com', 'PhonePe'],
  statement: `<p>Write <code>useClickOutside(ref, handler)</code> that calls <code>handler(event)</code> whenever the user presses the mouse or touches the screen <b>outside</b> the element held by <code>ref</code>. Use it to close a dropdown. Requirements: ignore clicks inside the element; always call the <b>latest</b> handler without re-subscribing every render; remove listeners on unmount.</p>`,
  constraints: `Listen on <code>document</code> for <code>mousedown</code> and <code>touchstart</code>. The ref may be <code>null</code> before mount.`,
  example: `${H.table(['Click target', 'Handler called?'], [['inside the dropdown panel', 'no'], ['on the page background', H.c('g', 'yes, dropdown closes')], ['on a child of the panel', 'no (contains() check)']])}`,
  brute: {
    why: `<p>Adding <code>onClick</code> to a full-screen overlay div breaks stacking and scroll, and putting the handler in the effect's dependency array re-subscribes document listeners every render. Checking <code>event.target === ref.current</code> misses clicks on child elements.</p>`,
    code: J(`useEffect(() => {
  const onDown = (e) => { if (e.target !== ref.current) handler(e); };   // children count as "outside"!
  document.addEventListener('mousedown', onDown);
  return () => document.removeEventListener('mousedown', onDown);
}, [handler]);                                                            // re-subscribes each render`, 'Wrong check and unstable deps')
  },
  mcq: { q: 'How do you correctly test that a click happened inside the panel?', options: ['ref.current.contains(event.target)', 'event.target === ref.current', 'event.currentTarget === document', 'ref.current.value'], answer: 0, explain: 'contains() is true for the element itself and all its descendants, so clicks on inner buttons and text are counted as inside.' },
  hints: [
    `<p>Hint 1: the browser tells you where the click happened (<code>event.target</code>). The DOM node can tell you whether that target is inside it (<code>contains</code>).</p>`,
    `<p>Hint 2: attach one listener to <code>document</code> in an effect; remove it in the cleanup. The handler may change often, so keep it in a ref.</p>`,
    `<p>Hint 3: recipe: <code>saved.current = handler</code> each render; in the listener <code>const el = ref.current; if (!el || el.contains(e.target)) return; saved.current(e);</code>.</p>`
  ],
  solution: {
    approach: `<p>Document-level listener registered once, "latest handler" ref pattern, and a <code>contains</code> check.</p>`,
    code: J(`import { useEffect, useRef, useState } from 'react';

export function useClickOutside(ref, handler) {
  const saved = useRef(handler);
  useEffect(() => { saved.current = handler; });          // newest handler, no re-subscribe

  useEffect(() => {
    const listener = (event) => {
      const el = ref.current;
      if (!el || el.contains(event.target)) return;       // ignore inside clicks and unmounted
      saved.current(event);
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref]);
}

export function Dropdown() {
  const [open, setOpen] = useState(false);
  const panel = useRef(null);
  useClickOutside(panel, () => setOpen(false));
  return (
    <div ref={panel}>
      <button onClick={() => setOpen(o => !o)}>Menu</button>
      {open && <ul><li>Profile</li><li>Logout</li></ul>}
    </div>
  );
}`, 'useClickOutside'),
    complexity: `<p>O(1) per click (one <code>contains</code> check, which walks up the DOM ancestors). Two document listeners while mounted.</p>`,
    followUps: ['How do you also close on the Escape key?', 'What breaks when the dropdown renders inside a portal? (The DOM parent differs; use the portal node as the ref target.)']
  }
});

practice.push({
  title: 'Fix the Delayed Alert (Snapshot vs Latest)', level: 'Medium', tags: ['stale closure', 'useRef', 'setTimeout', 'async'], companies: ['Meta', 'Amazon', 'Walmart'],
  statement: `<p>A chat component has a <code>draft</code> text box and a button "Send in 3s". Product wants this behavior: after 3 seconds the app sends the text that is in the box <b>at that moment</b> (so edits made during the 3 seconds are included). The current code sends the text from the moment of the click. Fix it. Also explain when the "snapshot at click time" behavior would actually be the right one.</p>`,
  constraints: `Pending timers must be cancelled on unmount. Clicking twice should send once (restart the delay). Use hooks only.`,
  example: `${H.table(['t', 'Action', 'Buggy sends', 'Correct sends'], [['0', 'type "hi", click Send in 3s', '', ''], ['1', 'edit to "hi there"', '', ''], ['3', 'timer fires', H.c('r', '"hi"'), H.c('g', '"hi there"')]])}`,
  brute: {
    why: `<p>The timeout callback is created in the click handler of the render where the user clicked, so it closes over that render's <code>draft</code>. Re-clicking to refresh does not help: it schedules another stale callback. The wasted effort is chasing it with extra state instead of reading the latest value from a ref.</p>`,
    code: J(`function ChatBad() {
  const [draft, setDraft] = useState('');
  const sendLater = () => setTimeout(() => send(draft), 3000);   // draft is the click-time snapshot
  return (<><input value={draft} onChange={e => setDraft(e.target.value)} /><button onClick={sendLater}>Send in 3s</button></>);
}`, 'Click-time snapshot')
  },
  mcq: { q: 'Which statement about the snapshot behavior is true?', options: ['It is correct when you want to report what the user saw at click time (e.g. analytics)', 'It is always a bug', 'It only happens in class components', 'It disappears if you use async/await'], answer: 0, explain: 'Closures capture the render they were created in. Sometimes that is exactly the desired meaning ("user clicked while the cart total was X"). Choose the ref only when you need the latest value.' },
  hints: [
    `<p>Hint 1: the callback inside <code>setTimeout</code> was created by a past render. Where can a long-lived function read the newest value from?</p>`,
    `<p>Hint 2: keep <code>draft</code> in a ref (updated every render) and read <code>ref.current</code> inside the timeout.</p>`,
    `<p>Hint 3: recipe: <code>const latest = useRef(draft); latest.current = draft;</code> (or update in an effect). Store the timer id in another ref, clear it before starting a new one and in an unmount effect.</p>`
  ],
  solution: {
    approach: `<p>A "latest value" ref for the text and a timer-id ref for cancelling. The timeout reads <code>latest.current</code> at fire time. The click-time snapshot remains the right tool for analytics-style reporting.</p>`,
    code: J(`import { useState, useRef, useEffect } from 'react';

export function Chat({ send }) {
  const [draft, setDraft] = useState('');
  const latest = useRef(draft);
  const timer = useRef(null);

  useEffect(() => { latest.current = draft; });            // refresh after every render

  useEffect(() => () => clearTimeout(timer.current), []);  // cancel pending send on unmount

  function sendLater() {
    clearTimeout(timer.current);                           // double click restarts the delay
    timer.current = setTimeout(() => send(latest.current), 3000);   // reads the value AT FIRE TIME
  }

  return (
    <div>
      <input value={draft} onChange={e => setDraft(e.target.value)} />
      <button onClick={sendLater}>Send in 3s</button>
    </div>
  );
}`, 'Latest-value ref'),
    alt: [R(`// Model: draft changes while a timer is pending
const latest = { current: 'hi' };
const clickTimeSnapshot = latest.current;               // what a plain closure would hold
setTimeout(() => { latest.current = 'hi there'; }, 20); // user keeps typing
setTimeout(() => {
  console.log('closure sends :', clickTimeSnapshot);
  console.log('ref sends     :', latest.current);
}, 60);`, 'Closure vs ref (runnable)')],
    complexity: `<p>O(1). At most one pending timer; no re-subscriptions.</p>`,
    followUps: ['How does useEffectEvent express "read latest value without making it a dependency"?', 'What should happen if the component unmounts after the user pressed send but before 3 seconds? (Product decision: cancel or still send.)']
  }
});

practice.push({
  title: 'Build a Mini Hooks Runtime', level: 'Hard', tags: ['hooks internals', 'closures', 'machine coding', 'plain JS'], companies: ['Meta', 'Google', 'Atlassian'],
  statement: `<p>Without React, implement <code>createRoot(Component)</code> returning <code>{ render(props), unmount() }</code> plus the hooks <code>useState</code> (with updater functions and lazy init), <code>useEffect(fn, deps)</code> (runs <b>after</b> render, only when deps changed, runs the previous cleanup first, cleans up on unmount), <code>useRef</code> and <code>useMemo</code>. Calling a state setter must schedule a re-render (batched: several setters in the same tick give one render). If the hook order changes between renders, throw an error like React does.</p>`,
  constraints: `Plain JavaScript, no libraries. Hooks are matched by call order using a slots array and a cursor. The output must be deterministic so it can be printed.`,
  example: `${H.table(['Step', 'Expected log'], [['first render', 'render count=0, then effect: setup'], ['setCount(c=>c+1) twice in one tick', 'ONE render with count=2'], ['deps unchanged', 'no effect run'], ['unmount', 'cleanup runs']])}`,
  brute: {
    why: `<p>Keeping each hook's value in one module-level variable (or a variable per hook name) makes every component instance share the same state and cannot support two <code>useState</code> calls in one component. The reason React uses a per-component list of slots indexed by call order is exactly to avoid this.</p>`,
    code: `// Naive: one global value. Two useState calls overwrite each other.
let stored;
function useState(initial) {
  if (stored === undefined) stored = initial;
  return [stored, (v) => { stored = v; }];
}
const [a] = useState(1);
const [b] = useState(2);
console.log(a, b);   // 1 1 (b should be 2)`
  },
  mcq: { q: 'Why must the runtime reset the cursor to 0 at the start of every render?', options: ['So the first hook call of the new render finds slot 0 again', 'To clear all stored state', 'To run effects', 'To avoid infinite loops'], answer: 0, explain: 'The slot list is persistent; the cursor says "which hook call am I on?". Starting again at 0 makes call number n always meet slot n.' },
  hints: [
    `<p>Hint 1: you need two module-level things per root: <code>slots</code> (persistent array) and <code>cursor</code> (reset before each render).</p>`,
    `<p>Hint 2: each hook does <code>const i = cursor++</code>; if the slot does not exist it creates it (first render), otherwise it checks the slot kind and reuses it. Effects are collected during render and executed after it.</p>`,
    `<p>Hint 3: schedule re-renders with a microtask flag so several setters collapse into one render. Run <i>all</i> cleanups of changed effects first, then all new effects, then store the new deps.</p>`
  ],
  solution: {
    approach: `<p>Per-root closure holding <code>slots</code>, <code>cursor</code> and a list of pending effects. State setters push updates into the slot's queue and schedule a microtask render; the next render drains the queue in order. Effects compare deps with <code>Object.is</code> and run after the render completes.</p>`,
    code: R(`let current = null;   // the root currently rendering (so hooks know where to store things)

function sameDeps(a, b) {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => Object.is(x, b[i]));
}

function createRoot(Component) {
  const root = { slots: [], cursor: 0, props: {}, effects: [], scheduled: false, unmounted: false, output: undefined };

  function slotFor(kind, make) {
    const i = root.cursor++;
    if (i >= root.slots.length) root.slots.push(Object.assign({ kind }, make()));   // first render: create
    const slot = root.slots[i];
    if (slot.kind !== kind) throw new Error('Hook order changed at slot ' + i + ': expected ' + slot.kind + ', got ' + kind);
    return slot;
  }

  function schedule() {
    if (root.scheduled || root.unmounted) return;
    root.scheduled = true;
    Promise.resolve().then(() => { root.scheduled = false; if (!root.unmounted) render(root.props); });   // batch in a microtask
  }

  root.useState = function (initial) {
    const slot = slotFor('state', () => ({ value: typeof initial === 'function' ? initial() : initial, queue: [] }));
    for (const u of slot.queue) slot.value = typeof u === 'function' ? u(slot.value) : u;   // drain queued updates in order
    slot.queue = [];
    if (!slot.set) slot.set = (u) => { slot.queue.push(u); schedule(); };                  // stable setter
    return [slot.value, slot.set];
  };

  root.useRef = function (initial) {
    return slotFor('ref', () => ({ box: { current: initial } })).box;
  };

  root.useMemo = function (fn, deps) {
    const slot = slotFor('memo', () => ({ deps: null, value: undefined }));
    if (!sameDeps(slot.deps, deps)) { slot.value = fn(); slot.deps = deps; }
    return slot.value;
  };

  root.useEffect = function (fn, deps) {
    const slot = slotFor('effect', () => ({ deps: null, cleanup: undefined, ran: false }));
    if (!slot.ran || !deps || !sameDeps(slot.deps, deps)) root.effects.push({ slot, fn, deps });   // no deps array = every render
  };

  function render(props) {
    root.props = props;
    root.cursor = 0;
    root.effects = [];
    const prev = current; current = root;
    try { root.output = Component(props); } finally { current = prev; }
    if (root.cursor !== root.slots.length) throw new Error('Rendered fewer hooks than expected');
    for (const e of root.effects) if (e.slot.cleanup) { e.slot.cleanup(); e.slot.cleanup = undefined; }   // 1) all cleanups
    for (const e of root.effects) { e.slot.cleanup = e.fn(); e.slot.deps = e.deps; e.slot.ran = true; }    // 2) all effects
    return root.output;
  }

  return {
    render,
    unmount() {
      root.unmounted = true;
      for (const s of root.slots) if (s.kind === 'effect' && s.cleanup) s.cleanup();
    },
    hooks: root
  };
}

// ---------- demo component using the hooks ----------
let app;
function Counter(props) {
  const { useState, useEffect, useRef, useMemo } = app.hooks;
  const [count, setCount] = useState(() => props.start);
  const renders = useRef(0);
  renders.current++;
  const doubled = useMemo(() => { console.log('  (useMemo computes doubled)'); return count * 2; }, [count]);
  useEffect(() => {
    console.log('  effect: setup for count=' + count);
    return () => console.log('  effect: cleanup for count=' + count);
  }, [count]);
  console.log('render #' + renders.current + ' count=' + count + ' doubled=' + doubled);
  Counter.setCount = setCount;
  return { count, doubled };
}

async function main() {
  app = createRoot(Counter);
  app.render({ start: 0 });
  console.log('-- two updates in the same tick');
  Counter.setCount(c => c + 1);
  Counter.setCount(c => c + 1);
  await Promise.resolve(); await Promise.resolve();            // let the microtask render run
  console.log('-- update to the same value 2 -> effect deps unchanged');
  Counter.setCount(2);
  await Promise.resolve(); await Promise.resolve();
  console.log('-- unmount');
  app.unmount();
  console.log('-- hook order check');
  try {
    const bad = createRoot(function Bad(p) { const h = bad.hooks; if (p.flag) h.useState(1); h.useEffect(() => {}, []); });
    bad.render({ flag: true });
    bad.render({ flag: false });
  } catch (e) { console.log('error:', e.message); }
}
main();`, 'mini-react.js (run it)'),
    complexity: `<p>Each hook call is O(1) (cursor step plus a deps comparison of length d). A render is O(h * d) for h hooks. Setters are O(1) and coalesce into one render per tick.</p>`,
    followUps: ['Add useReducer and useCallback on top of this runtime.', 'How would you skip re-rendering when the final state equals the old state (bail-out)?', 'How would layout effects differ from effects here?']
  }
});

practice.push({
  title: 'useUndoRedo Hook', level: 'Hard', tags: ['useReducer', 'custom hook', 'history', 'machine coding'], companies: ['Figma', 'Atlassian', 'Adobe'],
  statement: `<p>Write <code>useUndoRedo(initial, { limit = 50 })</code> returning <code>{ state, set, undo, redo, canUndo, canRedo, reset }</code>. <code>set</code> accepts a value or an updater function, pushes the old state onto the history (limited to <code>limit</code> entries; the oldest is dropped) and clears the redo stack. Setting a value equal to the current one (<code>Object.is</code>) must not create a history entry. All functions must have stable identity.</p>`,
  constraints: `Built on <code>useReducer</code> with <code>{ past, present, future }</code>. Pure reducer. O(1) per operation (apart from array copying of at most <code>limit</code> items).`,
  example: `${H.table(['Action', 'past', 'present', 'future'], [['initial', '[]', '0', '[]'], ['set(1), set(2)', '[0,1]', '2', '[]'], ['undo', '[0]', '1', '[2]'], ['redo', '[0,1]', '2', '[]'], ['undo, set(9)', '[0,1]', '9', '[] (redo cleared)']])}`,
  brute: {
    why: `<p>Storing the whole history as one array plus an index in two separate <code>useState</code> hooks makes the pair easy to desync (the index can point past the array after a trim), and copying the whole array on every change is wasteful. A single reducer keeps all three parts consistent in one atomic step.</p>`,
    code: J(`function useUndoBad(initial) {
  const [history, setHistory] = useState([initial]);
  const [index, setIndex] = useState(0);
  const set = (v) => { setHistory([...history.slice(0, index + 1), v]); setIndex(index + 1); };   // two updates, stale reads
  const undo = () => setIndex(index - 1);                                                           // can go below 0
  return { state: history[index], set, undo };
}`, 'Two states that can desync')
  },
  mcq: { q: 'After undo, the user types a new value. What must happen to the redo stack?', options: ['It is cleared, the future that no longer exists must not be reachable', 'It is kept so redo still works', 'It is moved to the past', 'It is sorted'], answer: 0, explain: 'A new edit starts a new timeline. Keeping the old future would let redo jump to a state unrelated to the current one.' },
  hints: [
    `<p>Hint 1: the whole timeline is three pieces of data - what came before, what is now, what would come after. Keep them together in one object.</p>`,
    `<p>Hint 2: <code>set</code> pushes <code>present</code> onto <code>past</code> and empties <code>future</code>; <code>undo</code> moves the last of <code>past</code> into <code>present</code> and pushes the old present to the front of <code>future</code>; <code>redo</code> is the mirror image.</p>`,
    `<p>Hint 3: use <code>useCallback</code> with <code>[]</code> for each dispatcher (dispatch is stable). Resolve updater functions inside the reducer (it has the latest present). Trim with <code>past.slice(-limit)</code>.</p>`
  ],
  solution: {
    approach: `<p>One reducer with three-part state. All transitions are small pure array operations. Updater functions resolve against the latest <code>present</code> inside the reducer so there are no stale reads.</p>`,
    code: J(`import { useReducer, useCallback } from 'react';

function makeReducer(limit) {
  return function reducer(state, action) {
    const { past, present, future } = state;
    switch (action.type) {
      case 'set': {
        const next = typeof action.value === 'function' ? action.value(present) : action.value;
        if (Object.is(next, present)) return state;                       // no change: no history entry
        return { past: [...past, present].slice(-limit), present: next, future: [] };
      }
      case 'undo':
        if (!past.length) return state;
        return { past: past.slice(0, -1), present: past[past.length - 1], future: [present, ...future] };
      case 'redo':
        if (!future.length) return state;
        return { past: [...past, present].slice(-limit), present: future[0], future: future.slice(1) };
      case 'reset':
        return { past: [], present: action.value, future: [] };
      default:
        return state;
    }
  };
}

export function useUndoRedo(initial, { limit = 50 } = {}) {
  const [state, dispatch] = useReducer(makeReducer(limit), { past: [], present: initial, future: [] });

  const set = useCallback(value => dispatch({ type: 'set', value }), []);
  const undo = useCallback(() => dispatch({ type: 'undo' }), []);
  const redo = useCallback(() => dispatch({ type: 'redo' }), []);
  const reset = useCallback(value => dispatch({ type: 'reset', value: value === undefined ? initial : value }), [initial]);

  return { state: state.present, set, undo, redo, reset, canUndo: state.past.length > 0, canRedo: state.future.length > 0 };
}`, 'useUndoRedo'),
    alt: [R(`function makeReducer(limit) {
  return function reducer(state, a) {
    const { past, present, future } = state;
    switch (a.type) {
      case 'set': {
        const next = typeof a.value === 'function' ? a.value(present) : a.value;
        return Object.is(next, present) ? state : { past: [...past, present].slice(-limit), present: next, future: [] };
      }
      case 'undo': return past.length ? { past: past.slice(0, -1), present: past[past.length - 1], future: [present, ...future] } : state;
      case 'redo': return future.length ? { past: [...past, present].slice(-limit), present: future[0], future: future.slice(1) } : state;
      default: return state;
    }
  };
}
const reducer = makeReducer(3);   // tiny limit to show trimming
let s = { past: [], present: 0, future: [] };
const script = [{ type: 'set', value: 1 }, { type: 'set', value: 2 }, { type: 'set', value: 2 }, { type: 'set', value: v => v + 1 }, { type: 'set', value: 4 }, { type: 'undo' }, { type: 'undo' }, { type: 'redo' }, { type: 'set', value: 99 }];
for (const a of script) {
  s = reducer(s, a);
  console.log((a.type + (a.value !== undefined && typeof a.value !== 'function' ? '(' + a.value + ')' : '')).padEnd(9), 'past', JSON.stringify(s.past), 'present', s.present, 'future', JSON.stringify(s.future));
}`, 'Reducer script (runnable)')],
    complexity: `<p>O(limit) per set/redo because of array copy (limit is a small constant, so O(1) in practice); undo is O(limit) as well. Memory O(limit + future length).</p>`,
    followUps: ['How would you coalesce rapid typing into one history entry?', 'How would you store diffs instead of full snapshots for large documents?']
  }
});

practice.push({
  title: 'Cart with Context + useReducer (Split Contexts)', level: 'Hard', tags: ['useContext', 'useReducer', 'performance', 'React.memo'], companies: ['Amazon', 'Flipkart', 'Shopify'],
  statement: `<p>Build a shopping cart store: <code>CartProvider</code>, hooks <code>useCart()</code> (state: items and derived totals) and <code>useCartDispatch()</code>. Actions: <code>add</code> (increments quantity if the product exists), <code>remove</code>, <code>setQty</code> (qty &lt;= 0 removes the item). Requirement: an <code>AddToCartButton</code> that only dispatches must <b>not</b> re-render when the cart contents change, and the totals must be computed once per cart change, not once per consumer render.</p>`,
  constraints: `Two contexts (state and dispatch). Memoize the value of the state context. <code>React.memo</code> on the button. Reducer is pure and returns the same state for no-op actions.`,
  example: `${H.table(['Action', 'Cart items', 'Total'], [['add(A, 100)', 'A x1', '100'], ['add(A, 100)', 'A x2', '200'], ['add(B, 50)', 'A x2, B x1', '250'], ['setQty(A, 0)', 'B x1', '50']])}<p>While these happen, <code>AddToCartButton</code> renders only once because it reads only the dispatch context.</p>`,
  brute: {
    why: `<p>One context holding <code>{ state, dispatch, total }</code> as a fresh object means <b>every</b> consumer re-renders on every cart change, including buttons that only call <code>dispatch</code>. Computing the total inside each consumer repeats O(items) work per consumer per render.</p>`,
    code: J(`function CartProviderBad({ children }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });
  const total = state.items.reduce((s, i) => s + i.price * i.qty, 0);
  return <CartContext.Provider value={{ state, dispatch, total }}>{children}</CartContext.Provider>;   // new object each render
}`, 'One context, unstable value')
  },
  mcq: { q: 'Why does a component that only reads the dispatch context never re-render on cart changes?', options: ['dispatch has a stable identity, so that context value never changes', 'Because it is wrapped in useMemo', 'Context never re-renders memo components', 'Because dispatch is async'], answer: 0, explain: 'useReducer returns the same dispatch function for the life of the component. The dispatch context value never changes, so its consumers are not notified.' },
  hints: [
    `<p>Hint 1: split by <i>how often the value changes</i>. State changes on every action; dispatch never changes.</p>`,
    `<p>Hint 2: put derived data (<code>total</code>, <code>count</code>) next to the state in a <code>useMemo</code> keyed on <code>state.items</code> so it is computed once per change.</p>`,
    `<p>Hint 3: recipe: reducer handles <code>add/remove/setQty</code> returning <code>state</code> unchanged if nothing matches; two providers nested; custom hooks with guard errors; wrap the button in <code>memo</code> so parent re-renders do not reach it.</p>`
  ],
  solution: {
    approach: `<p>Two contexts with a memoized state value. Derived totals live in the same memo. Hooks give friendly errors outside the provider.</p>`,
    code: J(`import { createContext, useContext, useReducer, useMemo, memo } from 'react';

const CartStateContext = createContext(null);
const CartDispatchContext = createContext(null);

function cartReducer(state, action) {
  switch (action.type) {
    case 'add': {
      const found = state.items.find(i => i.id === action.item.id);
      return found
        ? { items: state.items.map(i => (i.id === found.id ? { ...i, qty: i.qty + 1 } : i)) }
        : { items: [...state.items, { ...action.item, qty: 1 }] };
    }
    case 'remove':
      return { items: state.items.filter(i => i.id !== action.id) };
    case 'setQty':
      if (action.qty <= 0) return { items: state.items.filter(i => i.id !== action.id) };
      return { items: state.items.map(i => (i.id === action.id ? { ...i, qty: action.qty } : i)) };
    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });

  // derived once per cart change, shared by all consumers
  const value = useMemo(() => ({
    items: state.items,
    count: state.items.reduce((n, i) => n + i.qty, 0),
    total: state.items.reduce((sum, i) => sum + i.price * i.qty, 0)
  }), [state.items]);

  return (
    <CartDispatchContext.Provider value={dispatch}>
      <CartStateContext.Provider value={value}>{children}</CartStateContext.Provider>
    </CartDispatchContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartStateContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
export function useCartDispatch() {
  const ctx = useContext(CartDispatchContext);
  if (!ctx) throw new Error('useCartDispatch must be used inside <CartProvider>');
  return ctx;
}

// reads ONLY dispatch: renders once, no matter how the cart changes
export const AddToCartButton = memo(function AddToCartButton({ product }) {
  const dispatch = useCartDispatch();
  console.log('render AddToCartButton', product.id);
  return <button onClick={() => dispatch({ type: 'add', item: product })}>Add {product.name}</button>;
});

export function CartBadge() {
  const { count, total } = useCart();            // re-renders when the cart changes, as it should
  return <span>{count} items - {total}</span>;
}`, 'Cart store with split contexts'),
    alt: [R(`function cartReducer(state, a) {
  switch (a.type) {
    case 'add': {
      const found = state.items.find(i => i.id === a.item.id);
      return found ? { items: state.items.map(i => (i.id === found.id ? { ...i, qty: i.qty + 1 } : i)) }
                   : { items: [...state.items, { ...a.item, qty: 1 }] };
    }
    case 'remove': return { items: state.items.filter(i => i.id !== a.id) };
    case 'setQty': return a.qty <= 0 ? { items: state.items.filter(i => i.id !== a.id) }
                                     : { items: state.items.map(i => (i.id === a.id ? { ...i, qty: a.qty } : i)) };
    default: return state;
  }
}
const derive = (s) => ({ count: s.items.reduce((n, i) => n + i.qty, 0), total: s.items.reduce((t, i) => t + i.price * i.qty, 0) });
let s = { items: [] };
const A = { id: 'A', price: 100 }, B = { id: 'B', price: 50 };
for (const a of [{ type: 'add', item: A }, { type: 'add', item: A }, { type: 'add', item: B }, { type: 'setQty', id: 'A', qty: 0 }]) {
  s = cartReducer(s, a);
  console.log(a.type.padEnd(7), JSON.stringify(derive(s)), s.items.map(i => i.id + 'x' + i.qty).join(','));
}`, 'Cart reducer (runnable)')],
    complexity: `<p>Each action is O(n) in distinct items (map/filter). Totals are computed once per change (O(n)) instead of once per consumer. Dispatch-only consumers cost O(0) re-renders on cart changes.</p>`,
    followUps: ['Persist the cart to localStorage without re-rendering consumers.', 'When is a store library (Zustand with selectors) better than context here?']
  }
});

practice.push({
  title: 'useDebouncedCallback with cancel and flush', level: 'Hard', tags: ['custom hook', 'useRef', 'debounce', 'timers'], companies: ['Google', 'Atlassian', 'Stripe'],
  statement: `<p>Write <code>useDebouncedCallback(fn, delay)</code> returning a debounced function <code>debounced(...args)</code> that also has <code>.cancel()</code> (drop the pending call) and <code>.flush()</code> (run the pending call immediately). Requirements: the returned function has <b>stable identity</b> across renders; it always calls the <b>latest</b> <code>fn</code> with the <b>latest arguments</b> of the last call; pending calls are cancelled on unmount. Use it for an auto-save field that also saves immediately on blur.</p>`,
  constraints: `No libraries. Timers in refs, not state. Changing <code>fn</code> must not reset the pending timer.`,
  example: `${H.table(['t', 'Call', 'Result'], [['0', 'debounced("a")', 'timer 300'], ['100', 'debounced("ab")', 'old timer cancelled, new timer 400'], ['150', 'flush()', 'fn("ab") runs now, timer cleared'], ['500', '(nothing)', 'no second call']])}`,
  brute: {
    why: `<p>Creating the debounced function with <code>useCallback(debounce(fn, delay), [fn])</code> re-creates it whenever <code>fn</code> changes (new inline function every render), losing the pending timer so calls are not merged; storing the timer in state causes extra renders on every keystroke.</p>`,
    code: J(`const debounced = useCallback(debounce(save, 300), [save]);   // new debounced fn (and new timer) every render
// <input onChange={e => debounced(e.target.value)} />`, 'Rebuilt every render')
  },
  mcq: { q: 'Where should the pending timer id live?', options: ['In a ref, because changing it must not cause a render', 'In state', 'In a global variable shared by all components', 'In the dependency array'], answer: 0, explain: 'The timer id is bookkeeping, not UI. A ref survives renders without triggering one. A global would be shared between component instances.' },
  hints: [
    `<p>Hint 1: three things must survive renders without causing them: the timer id, the latest <code>fn</code>, and the last arguments.</p>`,
    `<p>Hint 2: build the debounced function once with <code>useMemo(..., [delay])</code> (or <code>useRef</code>) and let it call <code>fnRef.current(...lastArgs.current)</code>.</p>`,
    `<p>Hint 3: recipe: <code>debounced = (...args) =&gt; { lastArgs.current = args; clearTimeout(t.current); t.current = setTimeout(run, delay); }</code>, <code>cancel</code> clears and nulls the args, <code>flush</code> runs only if args are pending. Add an unmount effect calling <code>cancel</code>.</p>`
  ],
  solution: {
    approach: `<p>Refs hold the latest function, the pending arguments and the timer id. The debounced function is created once per delay value, so its identity is stable. <code>flush</code> runs the pending call at once; unmount cancels.</p>`,
    code: J(`import { useRef, useMemo, useEffect, useState } from 'react';

export function useDebouncedCallback(fn, delay = 300) {
  const fnRef = useRef(fn);
  const timer = useRef(null);
  const pending = useRef(null);                 // array of args, or null when nothing is waiting

  useEffect(() => { fnRef.current = fn; });     // newest fn without touching the timer

  const api = useMemo(() => {
    const run = () => {
      timer.current = null;
      const args = pending.current;
      pending.current = null;
      if (args) fnRef.current(...args);
    };
    const debounced = (...args) => {
      pending.current = args;                   // last call wins
      clearTimeout(timer.current);
      timer.current = setTimeout(run, delay);
    };
    debounced.cancel = () => { clearTimeout(timer.current); timer.current = null; pending.current = null; };
    debounced.flush = () => { if (pending.current) { clearTimeout(timer.current); run(); } };
    return debounced;
  }, [delay]);

  useEffect(() => () => api.cancel(), [api]);   // cancel on unmount (or when delay changes)
  return api;
}

export function AutoSaveField({ save }) {
  const [text, setText] = useState('');
  const debouncedSave = useDebouncedCallback(save, 500);
  return (
    <input
      value={text}
      onChange={e => { setText(e.target.value); debouncedSave(e.target.value); }}
      onBlur={() => debouncedSave.flush()}      // leaving the field saves immediately
    />
  );
}`, 'useDebouncedCallback'),
    alt: [R(`// Plain JS version of the same logic, with real (short) timers
function createDebounced(getFn, delay) {
  let timer = null, pending = null;
  const run = () => { timer = null; const args = pending; pending = null; if (args) getFn()(...args); };
  const debounced = (...args) => { pending = args; clearTimeout(timer); timer = setTimeout(run, delay); };
  debounced.cancel = () => { clearTimeout(timer); timer = null; pending = null; };
  debounced.flush = () => { if (pending) { clearTimeout(timer); run(); } };
  return debounced;
}
let fn = (v) => console.log('save v1:', v);
const save = createDebounced(() => fn, 60);

save('a'); save('ab');                       // merged: only 'ab' will be saved
setTimeout(() => { fn = (v) => console.log('save v2 (newest fn):', v); save('abc'); }, 120);
setTimeout(() => save.flush(), 130);         // flush runs the pending call right now
setTimeout(() => { save('x'); save.cancel(); console.log('cancelled: nothing more should print'); }, 200);`, 'Debounce with flush/cancel (runnable)')],
    complexity: `<p>O(1) per call. One timer per hook instance. Pending state is a single argument array.</p>`,
    followUps: ['Add leading and trailing edge options.', 'How is throttling different, and how would you build useThrottledCallback?']
  }
});

practice.push({
  title: 'useTypeahead: Debounce + Abort + Cache', level: 'Hard', tags: ['custom hook', 'autocomplete', 'AbortController', 'cache', 'system design'], companies: ['Google', 'Amazon', 'Uber', 'Airbnb'],
  statement: `<p>Write <code>useTypeahead(query, { delay = 250, minChars = 2, fetcher })</code> returning <code>{ results, loading, error }</code>. It must: (1) wait until the user pauses for <code>delay</code> ms, (2) not search for fewer than <code>minChars</code> characters (clear the results), (3) <b>abort</b> the in-flight request when a newer query starts, (4) cache results per normalized query (trim, lowercase) in a ref so typing "ab", "abc", back to "ab" does not hit the network again, and (5) never show results for a query that is no longer current.</p>`,
  constraints: `<code>fetcher(query, signal)</code> returns a promise of an array. Cache lives in a <code>useRef(new Map())</code>. Limit the cache to 50 entries (drop the oldest).`,
  example: `${H.table(['User types', 'Network', 'Why'], [['"a"', 'none', 'below minChars'], ['"ab" (pause)', 'fetch("ab")', 'first search'], ['"abc" quickly, then "abcd"', 'fetch("abcd") only; abc is never sent', 'debounce'], ['back to "ab"', 'none', 'cache hit']])}`,
  brute: {
    why: `<p>Fetching on every keystroke sends many requests (one per letter), responses arrive out of order and overwrite newer results, and there is no memory of earlier searches so editing the query repeats work. Each of those three problems needs its own fix: debounce, abort, cache.</p>`,
    code: J(`function useTypeaheadBad(query) {
  const [results, setResults] = useState([]);
  useEffect(() => {
    fetch('/api/search?q=' + query).then(r => r.json()).then(setResults);   // every keystroke, any order
  }, [query]);
  return results;
}`, 'No debounce, no abort, no cache')
  },
  mcq: { q: 'The user types "ab", pauses, then types "abc" while the "ab" request is still in flight. What should happen?', options: ['After the debounce for "abc" starts its request, the "ab" request is aborted and its result is never shown', 'Both results are merged', 'The "abc" request waits for "ab" to finish', 'The "ab" result replaces "abc"'], answer: 0, explain: 'The effect cleanup for the old query aborts its request (and marks it ignored). Only the latest query may update the screen.' },
  hints: [
    `<p>Hint 1: split the work in two: first derive a stable <code>debouncedQuery</code> (reuse a <code>useDebounce</code>), then run a single effect keyed on that value.</p>`,
    `<p>Hint 2: inside the effect check <code>minChars</code>, then the cache, then fetch with an <code>AbortController</code>; cleanup aborts. The cache check must happen before setting <code>loading</code>.</p>`,
    `<p>Hint 3: normalise with <code>query.trim().toLowerCase()</code>. A <code>Map</code> keeps insertion order, so the first key is the oldest: <code>cache.delete(cache.keys().next().value)</code> trims it.</p>`
  ],
  solution: {
    approach: `<p>Three layers: debounce the input, check an in-memory cache, otherwise fetch with abort. A single state object keeps <code>results/loading/error</code> consistent. Cleanup guarantees only the current query can write results.</p>`,
    code: J(`import { useState, useEffect, useRef } from 'react';
import { useDebounce } from './useDebounce';

export function useTypeahead(query, { delay = 250, minChars = 2, fetcher }) {
  const debounced = useDebounce(query.trim().toLowerCase(), delay);
  const cache = useRef(new Map());                          // query -> results, survives renders
  const [state, setState] = useState({ results: [], loading: false, error: null });

  useEffect(() => {
    if (debounced.length < minChars) {
      setState({ results: [], loading: false, error: null });
      return;
    }
    const hit = cache.current.get(debounced);
    if (hit) {                                              // cache hit: no network
      setState({ results: hit, loading: false, error: null });
      return;
    }

    const controller = new AbortController();
    setState(prev => ({ results: prev.results, loading: true, error: null }));

    fetcher(debounced, controller.signal)
      .then(results => {
        cache.current.set(debounced, results);
        if (cache.current.size > 50) cache.current.delete(cache.current.keys().next().value);   // drop oldest
        setState({ results, loading: false, error: null });
      })
      .catch(err => {
        if (err.name === 'AbortError') return;              // superseded by a newer query
        setState({ results: [], loading: false, error: err });
      });

    return () => controller.abort();                        // newer query or unmount
  }, [debounced, minChars, fetcher]);

  return state;
}`, 'useTypeahead'),
    alt: [R(`// Model of the cache layer: count network calls for a typing session (debounce already applied)
const cache = new Map();
let network = 0;
const fakeFetch = (q) => { network++; return [q + ' result 1', q + ' result 2']; };

function search(q, minChars = 2) {
  q = q.trim().toLowerCase();
  if (q.length < minChars) return { source: 'skipped (too short)', results: [] };
  if (cache.has(q)) return { source: 'cache', results: cache.get(q) };
  const results = fakeFetch(q);
  cache.set(q, results);
  if (cache.size > 50) cache.delete(cache.keys().next().value);
  return { source: 'network', results };
}
for (const q of ['a', 'ab', 'abc', 'AB ', 'abc']) {
  const r = search(q);
  console.log(JSON.stringify(q).padEnd(7), r.source.padEnd(20), 'results:', r.results.length);
}
console.log('network calls:', network);   // 2: "ab" and "abc"`, 'Cache layer (runnable)')],
    complexity: `<p>Per settled query: O(1) cache lookup, otherwise one network call. Memory bounded by 50 entries. Abort ensures at most one request is in flight.</p>`,
    followUps: ['How would you add keyboard navigation (arrow keys, Enter) and ARIA combobox attributes?', 'How would you add a TTL to cached entries?', 'Why is the fetcher in the dependency array, and how do you keep it stable?']
  }
});

/* ============================ QUIZ ============================ */
quiz.push({ q: 'A click handler runs <code>setCount(count + 1)</code> three times. With <code>count = 0</code>, what does the next render show?', options: ['3', '1', '0', 'It throws an error'], answer: 1, explain: 'All three lines read the same snapshot (count = 0), so each queues "set to 1". The result is 1. Use setCount(c =&gt; c + 1) to get 3.' });
quiz.push({ q: 'Which sentence about the rules of hooks is correct?', options: ['Hooks may be called inside if statements if the condition never changes', 'Hooks must be called in the same order on every render of a component', 'Hooks can be called from any JavaScript function', 'Hooks are matched to state by variable name'], answer: 1, explain: 'React matches hooks to their stored slots by call order. Conditional calls or early returns before a hook change that order and break the matching.' });
quiz.push({ q: 'An effect is <code>useEffect(() =&gt; { subscribe(id); return () =&gt; unsubscribe(id); }, [id])</code>. <code>id</code> changes from 1 to 2. In what order do things happen?', options: ['subscribe(2), then unsubscribe(1)', 'unsubscribe(1), then subscribe(2)', 'only subscribe(2) runs; cleanup runs on unmount only', 'unsubscribe(2), then subscribe(1)'], answer: 1, explain: 'React runs the previous effect cleanup (which remembers id = 1) first, then the new effect with id = 2.' });
quiz.push({ q: 'What does an effect with an empty dependency array <code>[]</code> do?', options: ['Runs after every render', 'Never runs', 'Runs once after the first render and cleans up on unmount', 'Runs only when props change'], answer: 2, explain: 'With [] there is nothing to compare against, so the effect runs once after mount and its cleanup runs on unmount (twice in dev Strict Mode on purpose).' });
quiz.push({ q: 'A counter built with <code>setInterval(() =&gt; setCount(count + 1), 1000)</code> inside <code>useEffect(..., [])</code> sticks at 1. Which fix keeps ONE interval running?', options: ['Change it to setCount(c =&gt; c + 1)', 'Remove the cleanup function', 'Call setInterval in the render body', 'Add a second useState'], answer: 0, explain: 'The updater does not read the stale count; React supplies the latest state. The interval can be created once and never goes stale.' });
quiz.push({ q: 'You change <code>ref.current</code> inside an event handler. What happens on screen?', options: ['The component re-renders immediately', 'Nothing re-renders; the new value is visible only after some other render', 'React throws an error', 'The ref is reset to its initial value'], answer: 1, explain: 'Refs are mutable boxes React does not watch. Changing them never triggers a render. Use state for values the UI must display.' });
quiz.push({ q: 'How many entries does <code>useMemo</code> keep in its cache?', options: ['Unlimited, one per distinct dependency list', 'One: the last dependencies and last result', 'Ten', 'None; it only works with React.memo'], answer: 1, explain: 'useMemo remembers only the most recent dependencies and result. Going 5 to 6 and back to 5 recomputes the second 5.' });
quiz.push({ q: 'You wrapped a child in <code>React.memo</code> but it still re-renders every time the parent does. The parent passes <code>onSave={() =&gt; save()}</code>. Why?', options: ['memo only works with class components', 'A new function is created each render, so the prop is never equal by Object.is', 'The child has no key', 'memo needs a dependency array'], answer: 1, explain: 'React.memo compares props with Object.is. A fresh arrow function each render is always "different". Wrap it in useCallback (or avoid passing it).' });
quiz.push({ q: 'When is <code>useReducer</code> usually a better choice than <code>useState</code>?', options: ['For a single boolean flag', 'When several related values change together following rules', 'When you want to avoid immutability', 'When you need refs'], answer: 1, explain: 'A reducer centralises the transition rules for related state (loading/error/data, forms, carts) and is easy to test as a pure function. A single flag does not need it.' });
quiz.push({ q: 'A Provider uses <code>value={{ user, logout }}</code> inline. What is the main downside?', options: ['Context cannot hold objects', 'Every provider re-render creates a new object, re-rendering all consumers even if user did not change', 'logout becomes undefined', 'It stops useContext from working'], answer: 1, explain: 'A new object has a new identity, so Object.is sees a change. Memoize the value with useMemo (and functions with useCallback) to limit consumer re-renders.' });
quiz.push({ q: 'What is the purpose of <code>controller.abort()</code> in the cleanup of a fetching effect?', options: ['To make fetch faster', 'To cancel the old request so a slow stale response cannot overwrite newer data', 'To clear the browser cache', 'To retry the request'], answer: 1, explain: 'When the URL changes or the component unmounts, the old request is cancelled. This prevents race conditions and wasted work; the AbortError is ignored on purpose.' });
quiz.push({ q: 'Why does <code>usePrevious</code> update its ref inside <code>useEffect</code> instead of during render?', options: ['So the render still returns the old value, and the update happens after the screen is committed', 'Because effects run before render', 'Because refs cannot be written in event handlers', 'To make the hook re-render twice'], answer: 0, explain: 'During render the ref still holds the previous render value, which is what we return. The effect then stores the new value for the next render, keeping rendering pure.' });
quiz.push({ q: 'Two components both call <code>const [on, toggle] = useToggle()</code>. What do they share?', options: ['The same boolean state', 'The same function code but separate state', 'Nothing, the hook throws', 'The same slots array'], answer: 1, explain: 'Custom hooks share logic, not data. Each component instance owns its own slots, so each gets its own boolean. To share state, lift it up or use context.' });

/* ============================ INTERVIEW ============================ */
interview.push({ q: 'What is a hook, and why were hooks introduced?', level: 'B', a: `<p>A hook is a special function (name starts with <code>use</code>) that lets a function component use React features such as state, lifecycle-like effects, refs and context. Before hooks (React 16.8, 2019) these were only available in class components. Hooks solved three problems: <b>reusing stateful logic</b> without wrapper components or render props (custom hooks), <b>splitting related code</b> that classes spread across lifecycle methods (setup and teardown now sit together in one effect), and the confusion around <code>this</code> and binding in classes. Hooks work by React keeping a list of slots per component instance and handing them out in call order, which is why the rules of hooks exist.</p>`, followUps: ['Can a class component use hooks?', 'What are the two rules of hooks and why do they exist?'] });
interview.push({ q: 'Explain why <code>setCount(count + 1)</code> called three times only increments once, and how to fix it.', level: 'B', a: `<p>Every render gets its own constant <code>count</code>; state is a snapshot for that render. The three calls all compute <code>0 + 1</code> from the same snapshot and queue "set to 1". React applies the queue in order and ends at 1. Fix: use the updater form <code>setCount(c =&gt; c + 1)</code>; React calls each updater with the result of the previous one, giving 3. Use the updater whenever the next value depends on the previous one. It also avoids stale closures in timers and listeners. Updaters must be pure because Strict Mode may call them twice in development.</p>`, followUps: ['When would passing a plain value be the right choice?', 'What happens if you mix setCount(5) and setCount(c => c + 1) in one handler?'] });
interview.push({ q: 'Walk me through useEffect: dependencies, cleanup and when each runs.', level: 'B', a: `<p>The effect function runs <b>after</b> React has committed the render to the screen. The dependency array lists the reactive values the effect reads: no array means after every render, <code>[]</code> means after the first render only, <code>[a, b]</code> means after the first render and whenever <code>a</code> or <code>b</code> changes (compared with <code>Object.is</code>). If the effect returns a function, that is the cleanup: React runs it before running the effect again (because dependencies changed) and when the component unmounts. The cleanup closes over the values of the render that created it, so it undoes exactly what that effect set up. Typical uses are subscriptions, timers, event listeners and aborting fetches. In development Strict Mode runs setup, cleanup, setup once to verify cleanup correctness.</p>`, followUps: ['Why do objects and arrays in the dependency array cause extra runs?', 'What is the difference between useEffect and useLayoutEffect?'] });
interview.push({ q: 'What are the rules of hooks, and what actually breaks if you call a hook conditionally?', level: 'I', a: `<p>Rule 1: call hooks only at the top level of a component or custom hook - never inside conditions, loops, nested functions or after an early return. Rule 2: call them only from React function components or custom hooks. React stores hook data per component instance in an ordered structure (a linked list of hook objects, easiest to picture as an array of slots) and a cursor increments on every hook call during a render. The n-th call always meets the n-th slot. If a condition changes the number or order of calls, the cursor and slots go out of sync: a <code>useEffect</code> may meet a state slot (error "Rendered fewer hooks" or "more hooks"), or two <code>useState</code> calls may swap values silently. The fix is to keep hook calls unconditional and put the condition inside the hook or in the JSX.</p>`, followUps: ['How does the eslint plugin detect hook calls?', 'Is React 19 use() subject to the same rule?'] });
interview.push({ q: 'What is a stale closure in React? Give an example and three ways to fix it.', level: 'I', a: `<p>A function created in one render keeps the props and state of that render. If it lives longer (a <code>setInterval</code> callback, a listener registered in an effect with <code>[]</code>, a debounced function, an async function after <code>await</code>), it keeps reading old values. Example: <code>useEffect(() =&gt; { setInterval(() =&gt; setCount(count + 1), 1000) }, [])</code> always computes <code>0 + 1</code>, so the counter sticks at 1. Fixes: (1) an updater function <code>setCount(c =&gt; c + 1)</code> that needs no outside value; (2) list the value as a dependency so the effect and its closure are recreated (accepting the restart cost); (3) keep the latest value in a ref and read <code>ref.current</code> inside the long-lived function, or use <code>useEffectEvent</code>. Moving logic into a reducer also removes the problem since <code>dispatch</code> is stable and the reducer always receives current state.</p>`, followUps: ['When is a stale value actually the desired behavior?', 'How would you debug it quickly?'] });
interview.push({ q: 'When would you use useRef instead of useState?', level: 'I', a: `<p>Use <code>useState</code> for anything the UI displays: changing it must re-render. Use <code>useRef</code> for values React does not need to know about: DOM nodes (focus, scroll, measure), timer or subscription ids, an <code>AbortController</code>, a render counter, a previous value, the latest version of a callback. Changing <code>ref.current</code> does not trigger a render and the same object is returned on every render. Do not read or write refs during render (except lazy initialisation) because it makes rendering impure and unpredictable with concurrent features. If a ref holds data that appears on screen, the screen will go stale; that is a sign it should be state.</p>`, followUps: ['How do refs and the DOM interact in the commit phase?', 'How do you pass a ref to a child component in React 18 vs 19?'] });
interview.push({ q: 'Explain useMemo, useCallback and React.memo. When should you NOT use them?', level: 'I', a: `<p><code>useMemo(fn, deps)</code> caches the result of a calculation; <code>useCallback(fn, deps)</code> caches the function itself (equivalent to <code>useMemo(() =&gt; fn, deps)</code>); <code>React.memo(Component)</code> skips re-rendering a component when its props are shallow-equal. They are tools around <b>referential identity</b>: objects, arrays and functions are new each render, so memo children see "changed" props unless identity is stabilised. Use them when a calculation is measurably slow, when a value is a dependency of an effect, a prop of a memoized child, or a context value. Avoid them for cheap work, "just in case", or to patch logic bugs: they cost comparison and memory, and wrong dependencies create stale closures. First consider moving state down or passing children to avoid the re-render at all. The React Compiler can add much of this automatically.</p>`, followUps: ['Does useMemo guarantee the value will never be recomputed?', 'How does React.memo compare props, and can you customise it?'] });
interview.push({ q: 'How does useReducer differ from useState, and why is the reducer pure?', level: 'I', a: `<p><code>useReducer(reducer, initial)</code> returns <code>[state, dispatch]</code>. Components dispatch <b>actions</b> describing what happened; the pure function <code>reducer(state, action)</code> returns the next state. It is better than <code>useState</code> when multiple related values change together, next state depends on rules or the previous state, or you want the logic in one testable place (you can call the reducer without React). It must be pure because React may call it more than once (Strict Mode, concurrent rendering, re-running after an interrupted render) and expects identical output for identical input: no mutation, no fetch, no random or time reads. Side effects belong in handlers or effects that dispatch results. <code>dispatch</code> has a stable identity, which helps with dependency arrays and context splitting.</p>`, followUps: ['How would you model a fetch lifecycle with a reducer?', 'Where do async actions fit with useReducer?'] });
interview.push({ q: 'How does useContext work and what are its performance pitfalls?', level: 'I', a: `<p><code>createContext(default)</code> makes a context; a Provider supplies <code>value</code> to its subtree; <code>useContext(Ctx)</code> reads the nearest provider's value and subscribes the component to it. When the value changes (by <code>Object.is</code>) every consuming component re-renders, even if wrapped in <code>React.memo</code>, and there are no built-in selectors, so a component re-renders even if it only uses one field. Pitfalls: inline <code>value={{...}}</code> creates a new object per provider render; large, fast-changing global state in one context re-renders everything. Mitigations: memoize the value, split state and dispatch contexts (or split by update frequency), keep state close to where it is used, pass <code>children</code> through so parents do not re-render, or use an external store with selectors (Zustand, Redux, <code>useSyncExternalStore</code>). Context is a delivery mechanism, not a state manager.</p>`, followUps: ['Context vs Redux - when would you pick each?', 'Why can a memoized child still update when a context changes?'] });
interview.push({ q: 'Design and write a <code>useDebounce</code> hook. How would you handle fast typing and unmount?', level: 'I', a: `<p>Keep the delayed copy in state: <code>const [debounced, setDebounced] = useState(value)</code>. In an effect depending on <code>[value, delay]</code> start <code>setTimeout(() =&gt; setDebounced(value), delay)</code> and return a cleanup that calls <code>clearTimeout</code>. With fast typing, each change runs the previous cleanup (cancelling the earlier timer) before starting a new one, so only the last value survives a pause. On unmount the cleanup cancels the pending timer, preventing a state update after the component is gone. Consumers use the debounced value in their own effect to fire the search. Variants: a <code>useDebouncedCallback</code> keeps the timer id in a ref and exposes <code>cancel</code> and <code>flush</code>; leading-edge debounce fires immediately then ignores; throttle limits to once per interval.</p>`, followUps: ['How would you test it?', 'Debounce vs throttle - when to use which?'] });
interview.push({ q: 'You see a fetch effect causing a flood of requests. How do you diagnose and fix it?', level: 'A', a: `<p>First reproduce and look at which dependency changes: the Network tab shows the pattern and the React DevTools Profiler ("why did this render") plus a <code>console.log</code> of dependencies show what differs. The usual causes: (1) an object, array or function created during render is in the dependency array, so identity changes every render; (2) the effect sets state that feeds its own dependencies, forming a loop; (3) no dependency array. Fixes: depend on primitives, move the object creation inside the effect, memoize with <code>useMemo</code>/<code>useCallback</code> if it must be shared, use updater functions to avoid depending on state, and add cleanup (<code>AbortController</code>) so overlapping requests cancel. Longer term, move data fetching to a library (React Query, SWR) or a framework loader which de-duplicates and caches requests.</p>`, followUps: ['How would you add a regression test for this?', 'What does Strict Mode do that can reveal this earlier?'] });
interview.push({ q: 'How would you implement <code>useState</code> and <code>useEffect</code> from scratch in plain JavaScript?', level: 'A', a: `<p>Keep a module-level (per root) <code>slots</code> array and a <code>cursor</code> reset to 0 before each render. <code>useState</code>: <code>const i = cursor++</code>; if the slot is missing create it with the initial value (call it if it is a function); return the value and a setter that pushes updates into the slot and schedules a re-render (batched with a microtask flag); apply queued updates (functions get the previous value) when reading the slot. <code>useEffect(fn, deps)</code>: take the next slot holding the previous deps and cleanup; if deps are missing or differ (<code>Object.is</code> per item) record the effect in a list. After render finishes, run all changed effects' cleanups first, then run the effects and store their returned cleanups and new deps. Unmount runs remaining cleanups. Calling hooks in a different order would misalign slots, so check slot kinds and throw. This is exactly the model React uses (with linked lists on fibers).</p>`, followUps: ['How would you add useRef, useMemo and useCallback?', 'How do layout effects and passive effects differ in scheduling?'] });
interview.push({ q: 'Why does React run effects twice in development Strict Mode, and what bugs does that reveal?', level: 'A', a: `<p>In development, Strict Mode (default in many frameworks) mounts a component, immediately unmounts it (running cleanups) and mounts it again. Components also render twice and reducers/updaters are called twice. The purpose is to surface impure rendering and missing cleanup early, and to prepare for features that preserve state while hiding parts of the UI (Offscreen/Activity), where effects may be torn down and set up repeatedly. It reveals bugs such as: subscriptions or timers without cleanup (leaks and duplicate events), analytics sent twice because the effect assumed it runs once, fetch calls that are not cancelled, and render-time mutations. The right response is to make the effect symmetric - setup and cleanup that fully undo each other - not to add a "ran already" flag. In production the extra pass does not happen.</p>`, followUps: ['How do you deal with analytics that must fire once?', 'What is the Activity / Offscreen component and how does it relate?'] });
interview.push({ q: 'How do you decide between lifting state, context, useReducer and an external store for shared state?', level: 'E', a: `<p>Start with the smallest scope: local <code>useState</code>; if two siblings need it, lift to the nearest common parent; if the prop chain gets deep and the data changes rarely (theme, locale, auth user), use context; if transitions are complex use <code>useReducer</code> (alone or with context). Move to an external store (Zustand, Redux Toolkit, Jotai, <code>useSyncExternalStore</code>) when many components need <i>parts</i> of fast-changing state and need selectors, middleware, devtools or persistence. Server data (lists, entities, caches) is a different category: use React Query/SWR/framework data APIs for caching, revalidation and mutations, not hand-rolled global state. Criteria: update frequency, number of consumers, need for selectors, debugging needs, team conventions and bundle cost. Always memoize context values and split contexts by change rate. Premature global state makes apps harder to reason about and slower.</p>`, followUps: ['How would you migrate a context-heavy app that is slow?', 'How do React Server Components change this decision?'] });
interview.push({ q: 'How do concurrent features and the React Compiler change how you think about hooks?', level: 'E', a: `<p>Concurrent rendering means React may start a render, pause, throw it away and restart, so renders must be <b>pure and idempotent</b>: no writes to refs or outside variables during render, no side effects, reducers and updaters that can run more than once. Effects stay the only place for side effects. <code>useTransition</code>/<code>useDeferredValue</code> let you keep input responsive by marking slow updates as non-urgent; <code>useSyncExternalStore</code> prevents tearing when reading external data. The React Compiler (build-time) analyses components that follow the Rules of React and inserts memoization automatically, making most manual <code>useMemo</code>/<code>useCallback</code>/<code>memo</code> unnecessary and reducing "forgot a dependency" performance bugs; it relies on pure rendering, so code that mutates props or reads refs in render can be skipped or flagged. New primitives such as <code>use()</code>, <code>useActionState</code>, <code>useOptimistic</code> and <code>useEffectEvent</code> move more patterns into the framework. The fundamentals - snapshots, identity, cleanup, call order - stay the same.</p>`, followUps: ['What code makes the compiler bail out?', 'How would you use useDeferredValue instead of debounce for filtering a big list?'] });

registerModule({
  id: 'fe09',
  title: 'React Hooks Deep Dive',
  intro: `<p>Hooks are the heart of modern React, and they are also where most interview questions (and most real bugs) live: "why did my counter stick at 1?", "why is this effect running forever?", "why does this child re-render?". This module explains hooks the way you would explain them to a friend: <b>state is a photograph of one render</b>, <b>hooks are numbered lockers matched by call order</b>, <b>effects are set-up-and-pack-up pairs</b>, and <b>closures remember old photos</b>.</p>
    <p>You will go through <code>useState</code>, <code>useEffect</code> (dependencies and cleanup), <code>useRef</code>, <code>useMemo</code> / <code>useCallback</code> / <code>React.memo</code>, <code>useReducer</code>, <code>useContext</code>, custom hooks, the rules of hooks and stale closures. Each topic has a step-by-step visualizer, plain-JS models you can run to see the idea without React, guided problems, and a practice set (useDebounce, usePrevious, useFetch with abort, fixing a stale-closure interval, converting <code>useState</code> spaghetti to <code>useReducer</code>, a theme context, explaining an infinite effect loop and a mini hooks runtime).</p>
    <p>It builds directly on React Fundamentals (components, props, state) and leads into State Management and React Internals.</p>`,
  goals: [
    'Explain why state is a <b>snapshot per render</b> and use updater functions correctly',
    'Draw the <b>slots-and-cursor</b> model and explain exactly why hooks must be called in the same order',
    'Write effects with correct <b>dependencies and cleanup</b>, and diagnose an infinite effect loop in minutes',
    'Spot and fix <b>stale closures</b> using updaters, refs or dependencies, and choose between them',
    'Use <code>useRef</code>, <code>useMemo</code>, <code>useCallback</code> and <code>React.memo</code> deliberately, understanding referential identity and when NOT to memoize',
    'Model complex state with <code>useReducer</code> and share it with <code>useContext</code> without needless re-renders',
    'Build reusable <b>custom hooks</b> (useDebounce, usePrevious, useFetch with abort, useLocalStorage, useInterval) the way interviewers expect'
  ],
  prereqs: `<b>React Fundamentals</b> (components, JSX, props, state, re-rendering), <b>DOM &amp; Events</b>, and <b>Browser APIs, Storage &amp; Networking</b> (fetch, AbortController, localStorage). Comfort with JavaScript closures (see the JavaScript track) helps a lot.`,
  hours: 14,
  topics: topics,
  practice: practice,
  quiz: quiz,
  interview: interview
});
})();
