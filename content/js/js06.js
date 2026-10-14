(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------------- shared little helpers for the visualizers ---------------- */
  function one(k, cls) { var h = {}; h[k] = cls; return h; }
  function esc(s) { return H.esc(String(s)); }
  function out(lines, label) {
    return { type: 'text', label: label || 'Console output', html: lines && lines.length ? '<code>' + lines.map(esc).join('<br>') + '</code>' : '<span class="c-m">(nothing printed yet)</span>' };
  }
  function note(html, label) { return { type: 'text', label: label || 'What is going on', html: html }; }
  /* step = { l: line | [lines], cls, v: {vars}, hv, st: [stack], o: [console lines], extra: [parts], narr } */
  function codeFrames(code, steps, label) {
    return steps.map(function (s) {
      var hl = {};
      [].concat(s.l === undefined ? [] : s.l).forEach(function (n) { hl[n] = s.cls || 'cur'; });
      var parts = [{ type: 'code', label: label || 'Code (highlighted line = running now)', lang: 'js', code: code, hl: hl }];
      if (s.v) parts.push({ type: 'vars', label: s.vl || 'Variables', vals: s.v, hl: s.hv || {} });
      if (s.st) parts.push({ type: 'stack', label: 'Call stack (top = running now)', items: s.st.slice(), hl: s.sh || one(s.st.length - 1, 'cur') });
      (s.extra || []).forEach(function (p) { parts.push(p); });
      if (s.o !== undefined) parts.push(out(s.o));
      return { narr: s.narr, parts: parts };
    });
  }
  /* A prototype chain drawn as zig-zag boxes (so the little tags under each box never sit on an arrow).
     levels = [{ id, label, tag? }]  — the arrow from each box points to its [[Prototype]]. */
  function chain(levels, hl, ehl, label) {
    var nodes = [], edges = [], tags = {};
    levels.forEach(function (lv, i) {
      nodes.push({ id: lv.id, label: lv.label, x: i % 2 === 0 ? 30 : 70, y: 7 + i * 12, shape: 'box' });
      if (lv.tag !== undefined) tags[lv.id] = lv.tag;
      if (i > 0) edges.push([levels[i - 1].id, lv.id]);
    });
    return { type: 'graph', label: label || 'Prototype chain (each arrow = the hidden [[Prototype]] link)', directed: true, height: 7 + levels.length * 12, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags };
  }

  /* ======================================================================
     TOPIC 1 — Objects & the prototype chain: how property lookup works
     ====================================================================== */
  topics.push({
    title: 'The Prototype Chain: How JavaScript Finds a Property',
    analogy: `<p>Imagine you need a <b>stapler</b>. First you search <b>your own desk</b>. Not there? You ask your <b>team lead</b>. Still no? You walk to the <b>office supply room</b> that the whole building shares. If even the supply room has none, the answer is simply "no stapler" — nobody panics, you just come back empty-handed.</p>
<p>That is exactly how JavaScript looks up <code>obj.something</code>. Your desk = the object's <b>own</b> properties. The team lead = its <b>prototype</b>. The supply room = <code>Object.prototype</code>, shared by almost every object. "No stapler" = <code>undefined</code>.</p>
<p>And one more rule: if you <b>buy your own stapler</b> and put it on your desk, you will always use yours from now on — but the supply room still has its own one for everybody else. That is called <b>shadowing</b>.</p>`,
    explain: `<p>JavaScript does not copy behaviour from a "class blueprint" into every object the way Java or C++ do. Instead, every object carries one <b>hidden link</b> to another object. The spec calls this hidden slot <code>[[Prototype]]</code>. The object it points to is called the object's <b>prototype</b>. That prototype has its own prototype, and so on — this linked list of objects is the <b>prototype chain</b>. It always ends with <code>null</code>.</p>
<h4>1. Reading a property walks UP the chain</h4>
<p>When you write <code>dog.eats</code>, the engine does this:</p>
<ol>
<li>Does <code>dog</code> itself have an <b>own</b> property called <code>eats</code>? If yes → return it. Done.</li>
<li>If not, follow <code>[[Prototype]]</code> to the next object and ask the same question.</li>
<li>Keep climbing. If you reach <code>null</code>, the answer is <code>undefined</code> (no error!).</li>
</ol>
${H.table(['Expression', 'Where it was found', 'Result'], [
  ['<code>dog.name</code>', 'dog itself (own)', H.c('g', "'Rex'")],
  ['<code>dog.eats</code>', '1 step up: <code>animal</code>', H.c('g', 'true')],
  ['<code>dog.toString</code>', '2 steps up: <code>Object.prototype</code>', H.c('g', 'ƒ toString()')],
  ['<code>dog.fly</code>', 'nowhere — reached <code>null</code>', H.c('r', 'undefined')]
])}
<h4>2. Methods are shared, <code>this</code> is not</h4>
<p>When a method is found on a prototype, it still runs with <code>this</code> = the object you called it on. So one <code>describe()</code> function living on <code>animal</code> can serve a million dogs, each seeing its own <code>this.name</code>. This is why prototypes save memory: <b>one copy of each method, shared by every instance</b>.</p>
<h4>3. Writing a property does NOT walk up</h4>
<p><code>dog.eats = false</code> creates (or updates) an <b>own</b> property on <code>dog</code>. The prototype is untouched, so every other object sharing that prototype still sees the old value. The new own property <b>shadows</b> (hides) the inherited one. Delete the own property and the inherited one becomes visible again.</p>
<p>Two exceptions (expert detail, explained in the deep dive): if somewhere up the chain there is a <b>setter</b> for that name, the setter runs instead; and if the inherited property is <b>read-only</b> (<code>writable: false</code>), the write is silently ignored (or throws in strict mode).</p>
<h4>4. Own vs inherited — the tools</h4>
${H.table(['Tool', 'Looks at the chain?', 'Typical use'], [
  ['<code>obj.key</code> / <code>obj[key]</code>', H.c('g', 'yes'), 'normal reading'],
  ['<code>key in obj</code>', H.c('g', 'yes'), '"can this object do X?"'],
  ['<code>Object.hasOwn(obj, key)</code> (ES2022)', H.c('r', 'no — own only'), 'safe own-property check (works even on null-prototype objects)'],
  ['<code>obj.hasOwnProperty(key)</code>', H.c('r', 'no — own only'), 'older style; breaks if the object has no <code>Object.prototype</code> in its chain'],
  ['<code>for...in</code>', H.c('g', 'yes (enumerable only)'), 'rarely what you want'],
  ['<code>Object.keys / values / entries</code>', H.c('r', 'no — own enumerable only'), 'what you usually want']
])}
<h4>5. Where does the chain end?</h4>
<p>For a plain object literal <code>{}</code>, the chain is <code>{}</code> → <code>Object.prototype</code> → <code>null</code>. For an array: <code>[]</code> → <code>Array.prototype</code> → <code>Object.prototype</code> → <code>null</code>. For a function: <code>fn</code> → <code>Function.prototype</code> → <code>Object.prototype</code> → <code>null</code>. You can read the link with <code>Object.getPrototypeOf(obj)</code>.</p>`,
    clues: [
      '"Why does <code>obj.toString()</code> work when I never defined <code>toString</code>?" → inherited from <code>Object.prototype</code> via the chain.',
      '"What is printed after I assign the property on the child?" → writes create an <b>own</b> property; the prototype is unchanged (shadowing).',
      '"<code>in</code> vs <code>hasOwnProperty</code>" or "why does <code>for...in</code> show extra keys?" → chain lookup vs own-only check.',
      '"Two instances unexpectedly share the same array" → a mutable value (array/object) living on the prototype is shared by everyone.',
      '"Prototype pollution", "<code>__proto__</code> key in user JSON", "safe deep merge" → writes reaching <code>Object.prototype</code>.',
      '"How does JS do inheritance without classes?" → delegation along the <code>[[Prototype]]</code> chain.'
    ],
    code: [{ lang: 'js', run: true, title: 'Reading walks up the chain (runnable)', code: `// animal will be the prototype of dog
const animal = {
  eats: true,
  describe() {
    // 'this' is whoever we called describe() ON, not animal
    return this.name + ' eats? ' + this.eats;
  }
};

const dog = Object.create(animal); // dog's hidden [[Prototype]] -> animal
dog.name = 'Rex';                  // own property

console.log(dog.name);             // own                      -> Rex
console.log(dog.eats);             // 1 step up (animal)       -> true
console.log(dog.describe());       // method from animal, this = dog
console.log(dog.fly);              // nowhere                  -> undefined
console.log(Object.getPrototypeOf(dog) === animal);              // true
console.log(Object.getPrototypeOf(animal) === Object.prototype); // true
console.log(Object.getPrototypeOf(Object.prototype));            // null = end
` }, { lang: 'js', run: true, title: 'Writing creates an OWN property: shadowing (runnable)', code: `const animal = { eats: true };
const dog = Object.create(animal);
const cat = Object.create(animal);

dog.eats = false;                         // creates an OWN 'eats' on dog only
console.log(dog.eats, cat.eats, animal.eats); // false true true

console.log(Object.hasOwn(dog, 'eats'));  // true  (own copy now)
console.log(Object.hasOwn(cat, 'eats'));  // false (still inherited)
console.log('eats' in cat);               // true  ('in' climbs the chain)

delete dog.eats;                          // remove the own copy...
console.log(dog.eats);                    // ...inherited one shows again -> true

// for...in walks the chain; Object.keys does not
cat.name = 'Tom';
const seen = [];
for (const k in cat) seen.push(k);
console.log(seen);              // [ 'name', 'eats' ]
console.log(Object.keys(cat));  // [ 'name' ]
` }],
    codeTitle: ['Reading walks up the chain', 'Writing creates an own property'],
    viz: {
      title: 'Watch the engine climb the chain',
      input: 'legs',
      inputLabel: 'Property name to read (e.g. name, legs, eat, toString, fly) — or "set legs" to see a write',
      gen: function (input) {
        var s = String(input === undefined ? 'legs' : input).trim();
        var m = s.match(/^(set\s+)?([A-Za-z_$][\w$]*)$/);
        if (!m) throw new Error('Type a property name like  legs  or  toString , or  set legs  to see a write');
        if (m[2].length > 24) throw new Error('Keep the property name under 25 characters');
        var isSet = !!m[1], key = m[2];
        var L = [
          { id: 'rex', label: 'rex', props: [['name', "'Rex'"], ['sound', "'woof'"]] },
          { id: 'DP', label: 'Dog.prototype', props: [['constructor', 'Dog'], ['bark', 'ƒ bark()'], ['legs', '4']] },
          { id: 'AP', label: 'Animal.prototype', props: [['constructor', 'Animal'], ['eat', 'ƒ eat()'], ['legs', '2'], ['alive', 'true']] },
          { id: 'OP', label: 'Object.prototype', props: [['constructor', 'Object'], ['toString', 'ƒ'], ['hasOwnProperty', 'ƒ'], ['valueOf', 'ƒ'], ['isPrototypeOf', 'ƒ'], ['propertyIsEnumerable', 'ƒ'], ['toLocaleString', 'ƒ'], ['__proto__', 'get/set']] },
          { id: 'NULL', label: 'null', props: [] }
        ];
        var tags = ['', '', '', '', ''];
        function lv() { return L.map(function (x, i) { return { id: x.id, label: x.label, tag: tags[i] || undefined }; }); }
        function own(i, k, cls) {
          var h = {}; if (k) h[k] = cls;
          return { type: 'map', label: 'Own properties of ' + L[i].label, entries: L[i].props.map(function (p) { return p.slice(); }), hl: h };
        }
        function find(i) { for (var j = 0; j < L[i].props.length; j++) if (L[i].props[j][0] === key) return L[i].props[j][1]; return null; }
        var frames = [];
        if (!isSet) {
          frames.push({ narr: 'We evaluate <code>rex.' + esc(key) + '</code>. The engine starts at <b>rex itself</b> and climbs the arrows until some object has an <b>own</b> property named <code>' + esc(key) + '</code>, or it reaches <code>null</code>.', parts: [chain(lv(), {}), { type: 'vars', label: 'Lookup state', vals: { key: key, levelsChecked: 0 } }] });
          var hl = {}, ehl = {};
          for (var i = 0; i < L.length; i++) {
            if (i > 0) ehl[L[i - 1].id + '-' + L[i].id] = 'cur';
            if (L[i].id === 'NULL') {
              tags[i] = 'end of chain';
              hl.NULL = 'bad';
              frames.push({ narr: 'We followed the last arrow and hit <code>null</code>. Nobody in the chain owns <code>' + esc(key) + '</code>, so <code>rex.' + esc(key) + '</code> is <span class="c-r"><b>undefined</b></span>. Note: reading a missing property is <b>not</b> an error.', parts: [chain(lv(), JSON.parse(JSON.stringify(hl)), JSON.parse(JSON.stringify(ehl))), { type: 'vars', label: 'Lookup state', vals: { key: key, levelsChecked: i, result: 'undefined' }, hl: { result: 'bad' } }] });
              frames.push({ narr: 'But be careful: <code>rex.' + esc(key) + '()</code> would throw <span class="c-r">TypeError: rex.' + esc(key) + ' is not a function</span> — because you tried to <b>call</b> <code>undefined</code>. And <code>rex.' + esc(key) + '.x</code> would throw "Cannot read properties of undefined". Optional chaining <code>rex.' + esc(key) + '?.()</code> avoids both.', parts: [chain(lv(), JSON.parse(JSON.stringify(hl))), note('Missing property → <b>undefined</b>. Using that undefined as a function or object → <b>TypeError</b>.')] });
              break;
            }
            var val = find(i);
            if (val !== null) {
              tags[i] = 'found ✓';
              hl[L[i].id] = 'ok';
              frames.push({ narr: '<b>' + esc(L[i].label) + '</b> has an own property <code>' + esc(key) + '</code> → the lookup <span class="c-g">stops right here</span> and returns <b>' + esc(val) + '</b>. ' + (i === 0 ? 'It was the object\'s own property — zero climbing needed.' : 'We climbed ' + i + ' arrow' + (i > 1 ? 's' : '') + ' to get here.'), parts: [chain(lv(), JSON.parse(JSON.stringify(hl)), JSON.parse(JSON.stringify(ehl))), own(i, key, 'ok'), { type: 'vars', label: 'Lookup state', vals: { key: key, levelsChecked: i + 1, result: val }, hl: { result: 'ok' } }] });
              var shadowed = [];
              for (var j = i + 1; j < L.length; j++) { if (find(j) !== null) shadowed.push(L[j].label + '.' + key + ' = ' + find(j)); hl[L[j].id] = 'done'; tags[j] = 'never checked'; }
              frames.push({ narr: 'First match wins. Everything above <b>' + esc(L[i].label) + '</b> is <b>never looked at</b>. ' + (shadowed.length ? 'That means <code>' + esc(shadowed.join(', ')) + '</code> is <b>shadowed</b> (hidden) for rex — it exists, but rex never sees it.' : 'Nothing higher up has this name anyway.') + (L[i].props[0] && find(i) && i > 0 && /ƒ/.test(val) ? ' If you call it, <code>this</code> will still be <b>rex</b>, not ' + esc(L[i].label) + '.' : ''), parts: [chain(lv(), JSON.parse(JSON.stringify(hl))), note(shadowed.length ? 'Shadowed: <code>' + esc(shadowed.join(', ')) + '</code>' : 'No shadowing in this lookup.', 'Shadowing check')] });
              break;
            }
            tags[i] = 'no ✗';
            var h2 = JSON.parse(JSON.stringify(hl)); h2[L[i].id] = 'cur';
            frames.push({ narr: 'Does <b>' + esc(L[i].label) + '</b> own <code>' + esc(key) + '</code>? <span class="c-r">No.</span> Follow its <code>[[Prototype]]</code> arrow to <b>' + esc(L[i + 1].label) + '</b> and ask again.', parts: [chain(lv(), h2, JSON.parse(JSON.stringify(ehl))), own(i), { type: 'vars', label: 'Lookup state', vals: { key: key, levelsChecked: i + 1 } }] });
            hl[L[i].id] = 'done';
          }
          return frames;
        }
        /* ---- write mode ---- */
        frames.push({ narr: 'We run <code>rex.' + esc(key) + " = 'mine'</code>. A write is different from a read: the engine wants to put the value <b>on rex itself</b>. It only glances up the chain to see if some ancestor has a <b>setter</b> or a <b>read-only</b> property with that name.", parts: [chain(lv(), {}), own(0)] });
        if (key === '__proto__') {
          frames.push({ narr: 'Climbing… <b>Object.prototype</b> has an <b>accessor</b> (getter/setter) called <code>__proto__</code>. Because a setter exists up the chain, the engine <b>calls the setter</b> instead of creating an own property.', parts: [chain(lv(), { OP: 'cur' }), own(3, '__proto__', 'cur')] });
          frames.push({ narr: "The <code>__proto__</code> setter tries to make the string <code>'mine'</code> rex's prototype. A string is not an object, so the setter <b>silently ignores</b> it. Nothing changes — no own property, chain untouched.", parts: [chain(lv(), { rex: 'sel' }), own(0)] });
          frames.push({ narr: 'Lesson: <code>__proto__</code> is not a normal key — it is a legacy setter on <code>Object.prototype</code>. That is exactly what attackers abuse in <b>prototype pollution</b>. Use <code>Object.getPrototypeOf / setPrototypeOf</code> instead.', parts: [chain(lv(), { OP: 'bad' }), note('Assigning <code>obj.__proto__ = someObject</code> would actually <b>re-link</b> the chain.')] });
          return frames;
        }
        var foundAt = -1;
        for (var k = 0; k < 4; k++) if (find(k) !== null) { foundAt = k; break; }
        frames.push({ narr: 'The engine checks the chain for a setter or a read-only property named <code>' + esc(key) + '</code>. ' + (foundAt > 0 ? 'It finds a plain data property on <b>' + esc(L[foundAt].label) + '</b> — a normal writable value, not a setter — so that does <b>not</b> block the write.' : foundAt === 0 ? 'rex already owns it, so it will simply be updated.' : 'Nothing found anywhere, so nothing blocks the write.'), parts: [chain(lv(), { rex: 'cur', DP: 'win', AP: 'win', OP: 'win' }), note('Setters and <code>writable:false</code> are the only things up the chain that can change a write.', 'Write rule')] });
        L[0].props = L[0].props.filter(function (p) { return p[0] !== key; }).concat([[key, "'mine'"]]);
        tags[0] = foundAt === 0 ? 'updated' : 'new own prop';
        frames.push({ narr: foundAt === 0 ? 'rex already had an own <code>' + esc(key) + '</code>, so it is simply overwritten.' : 'A brand-new <b>own</b> property <code>' + esc(key) + "</code> = 'mine' is created <b>on rex</b>. " + (foundAt > 0 ? '<b>' + esc(L[foundAt].label) + '.' + esc(key) + '</b> is still there, unchanged.' : ''), parts: [chain(lv(), { rex: 'ok' }), own(0, key, 'ok')] });
        tags[0] = 'found ✓';
        frames.push({ narr: 'Now read <code>rex.' + esc(key) + "</code> again: the very first object checked (rex) owns it → <b>'mine'</b>. " + (foundAt > 0 ? 'The inherited value is now <b>shadowed</b> for rex.' : ''), parts: [chain(lv(), { rex: 'ok', DP: 'done', AP: 'done', OP: 'done' }), { type: 'vars', vals: { result: "'mine'" }, hl: { result: 'ok' } }] });
        frames.push({ narr: 'Another dog <code>fido</code> that shares Dog.prototype still sees ' + (foundAt > 0 ? '<b>' + esc(find(foundAt)) + '</b>' : (foundAt === 0 ? 'its own value' : '<b>undefined</b>')) + ' — the prototype was <b>never modified</b>. Want the old value back on rex? <code>delete rex.' + esc(key) + '</code>.', parts: [chain([{ id: 'fido', label: 'fido' }, { id: 'DP', label: 'Dog.prototype' }, { id: 'AP', label: 'Animal.prototype' }, { id: 'OP', label: 'Object.prototype' }], { fido: 'cur' }, {}, 'fido shares the same prototypes'), note('Writes stay local. Reads are shared. That one asymmetry explains most prototype puzzles.')] });
        return frames;
      }
    },
    examples: [
      { title: 'Shadow, then un-shadow with delete', html: `<p>An own property hides the inherited one. Deleting the own property does <b>not</b> delete the inherited one — it just "uncovers" it. Notice that <code>delete</code> never climbs the chain: <code>delete dog.eats</code> when dog has no own <code>eats</code> does nothing and returns <code>true</code>.</p>
${H.table(['Step', 'dog own props', 'dog.eats'], [['start', '{}', 'true (from animal)'], ["dog.eats = 'only veggies'", "{ eats: 'only veggies' }", H.c('g', "'only veggies'")], ['delete dog.eats', '{}', 'true (from animal again)'], ['delete dog.eats (again)', '{}', 'true — delete never touches animal']])}`, code: { lang: 'js', run: true, code: `const animal = { eats: true };
const dog = Object.create(animal);
dog.eats = 'only veggies';
console.log(dog.eats);          // only veggies
delete dog.eats;
console.log(dog.eats);          // true
console.log(delete dog.eats);   // true (nothing own to delete)
console.log(animal.eats);       // true — prototype untouched` } },
      { title: 'Arrays and functions are on the chain too', html: `<p>Where does <code>[1, 2, 3].map</code> come from? Not from the array — from <code>Array.prototype</code>. And <code>hasOwnProperty</code> comes from one level higher, <code>Object.prototype</code>.</p>
${H.chips(['[1,2,3]', '→ Array.prototype (map, filter, push…)', '→ Object.prototype (toString, hasOwnProperty…)', '→ null'], { label: 'Chain of an array' })}`, code: { lang: 'js', run: true, code: `const arr = [1, 2, 3];
console.log(Object.hasOwn(arr, 'map'));                  // false: not own
console.log(Object.hasOwn(Array.prototype, 'map'));      // true: lives here
console.log(Object.getPrototypeOf(arr) === Array.prototype);                  // true
console.log(Object.getPrototypeOf(Array.prototype) === Object.prototype);     // true
console.log(Object.keys(arr));    // [ '0', '1', '2' ] — indexes ARE own properties
function greet() {}
console.log(Object.getPrototypeOf(greet) === Function.prototype);  // true
console.log(typeof greet.call);   // function — inherited from Function.prototype` } },
      { title: 'Predict the output: the shared-array trap', html: `<p>Data that lives on a prototype is shared by <b>reading</b>. Pushing into an inherited array is a <b>read</b> of <code>items</code> (then a mutation of that one array) — <b>not</b> a write of the <code>items</code> property. So every child sees the change. Assigning <code>c.items = [...]</code> would be a write and would create an own copy instead.</p>
<p>Answer: <code>[ 'a', 'b' ] [ 'a', 'b' ] true</code>, then after reassignment <code>[ 'z' ] [ 'a', 'b' ]</code>.</p>`, code: { lang: 'js', run: true, code: `const basket = { items: [] };          // ONE array on the prototype
const a = Object.create(basket);
const b = Object.create(basket);
a.items.push('a');                       // read a.items (inherited) then mutate it
b.items.push('b');
console.log(a.items, b.items, a.items === b.items); // [ 'a', 'b' ] [ 'a', 'b' ] true
a.items = ['z'];                         // a WRITE: own property on a
console.log(a.items, b.items);           // [ 'z' ] [ 'a', 'b' ]` } },
      { title: 'Primitives borrow from the chain too (auto-boxing)', html: `<p><code>'hi'.toUpperCase()</code> works even though strings are not objects. The engine temporarily wraps the primitive in a <code>String</code> object whose prototype is <code>String.prototype</code>, looks the method up there, calls it, and throws the wrapper away. That is also why <code>'hi'.custom = 1</code> silently does nothing useful: the property lands on a temporary wrapper.</p>`, code: { lang: 'js', run: true, code: `const s = 'hi';
console.log(s.toUpperCase());                         // HI
console.log(Object.getPrototypeOf(s) === String.prototype); // true
console.log((42).toFixed(1));                        // 42.0 (Number.prototype)
const t = 'hey';
t.custom = 1;               // goes onto a throwaway wrapper (sloppy mode)
console.log(t.custom);      // undefined` } },
      { title: 'Expert: a setter up the chain hijacks the write', html: `<p>Rule 3 had two exceptions. Here is the setter one: if an ancestor defines a <b>setter</b> for the name, <code>child.x = v</code> calls that setter with <code>this = child</code> — no own <code>x</code> is created. And if an ancestor's property is <code>writable: false</code>, the write is refused (silently in sloppy mode, <code>TypeError</code> in strict mode, which includes all modules and classes).</p>`, code: { lang: 'js', run: true, code: `'use strict';
const base = {
  set temp(v) { this._t = v * 2; },   // setter on the prototype
  get temp() { return this._t; }
};
const child = Object.create(base);
child.temp = 10;                          // calls base's setter with this = child
console.log(Object.hasOwn(child, 'temp'), child._t, child.temp); // false 20 20

const frozenBase = Object.freeze({ id: 1 });   // id is now read-only
const kid = Object.create(frozenBase);
try { kid.id = 2; } catch (e) { console.log(e.constructor.name); } // TypeError
console.log(kid.id);                     // 1 — still inherited
Object.defineProperty(kid, 'id', { value: 2, writable: true, enumerable: true });
console.log(kid.id);                     // 2 — defineProperty bypasses the rule` } }
    ],
    deepDive: `<p><b>The spec algorithms.</b> A read is <code>[[Get]](key, receiver)</code>: <code>OrdinaryGet</code> checks the object's own property; if absent, it calls <code>parent.[[Get]](key, receiver)</code> — note the <b>receiver</b> stays the original object, which is how inherited getters and methods see the right <code>this</code>. A write is <code>[[Set]](key, value, receiver)</code>: <code>OrdinarySet</code> looks for the property along the chain; if it finds an accessor it calls the setter with <code>this = receiver</code>; if it finds a non-writable data property it returns <code>false</code> (strict mode turns that into a <code>TypeError</code>); otherwise it defines an own data property on the receiver. <code>Object.defineProperty</code> skips all of this and always works on the target itself.</p>
<p><b>Cycles are impossible.</b> <code>Object.setPrototypeOf(a, b)</code> after <code>b</code> already inherits from <code>a</code> throws <code>TypeError: Cyclic __proto__ value</code>, so lookups always terminate.</p>
<p><b>Performance.</b> V8 does not literally walk the chain on every access. It caches the result per call site in an <b>inline cache</b> keyed by the object's hidden class (shape), and protects the assumption "the prototypes did not change" with <i>prototype validity cells</i>. Changing a prototype object (adding methods at runtime, <code>Object.setPrototypeOf</code> on a live object) invalidates those caches — MDN explicitly warns that changing [[Prototype]] is "a very slow operation". Set up prototypes once, at creation time (<code>Object.create</code>, <code>class</code>), and leave them alone. Long chains are fine for code clarity in practice because of these caches, but a megamorphic call site (dozens of different shapes) falls back to slow generic lookup.</p>
<p><b>Prototype pollution (security).</b> If code does <code>target[key] = value</code> with attacker-controlled <code>key = '__proto__'</code> (typical in naive deep-merge, query-string parsers, config loaders), the write goes through the inherited <code>__proto__</code> setter and the attacker's object is merged into <code>Object.prototype</code> — now <b>every</b> object in the process "has" <code>isAdmin: true</code>. Real CVEs hit lodash (<code>merge</code>, <code>defaultsDeep</code>), jQuery <code>extend</code>, minimist and others. Defences: skip <code>__proto__</code>, <code>constructor</code> and <code>prototype</code> keys; use <code>Object.create(null)</code> or <code>Map</code> for dictionaries; check with <code>Object.hasOwn</code>; Node's <code>--disable-proto=delete</code> flag; <code>Object.freeze(Object.prototype)</code> in hardened apps. Note that <code>JSON.parse('{"__proto__": 1}')</code> creates a harmless <b>own</b> property named <code>__proto__</code> — the danger appears when that object is later copied with plain assignment.</p>
<p><b>for...in cost.</b> <code>for...in</code> must enumerate enumerable keys of every object in the chain and de-duplicate shadowed names, which is slower and surprising. Built-in prototype methods are non-enumerable, which is the only reason <code>for...in</code> over a plain object does not list <code>toString</code>. If someone adds an enumerable property to <code>Object.prototype</code>, every <code>for...in</code> loop in the app suddenly sees it — another reason to prefer <code>Object.keys</code>.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants will happily write a <code>deepMerge</code>, a config loader or a query-string parser for you in seconds — and the naive version they produce is very often <b>vulnerable to prototype pollution</b> because it copies every key with <code>target[key] = source[key]</code>. Reviewing generated code for chain-related bugs is now a bigger part of the job than writing the loop yourself.</p>
<p><b>Use AI as a partner:</b> ask "<i>audit this merge function for prototype pollution and give me a failing test with a <code>__proto__</code> payload</i>", or "<i>generate 10 predict-the-output puzzles about shadowing and for...in, without answers</i>" for practice. Ask it to draw the chain for a given object as ASCII so you can check your mental model.</p>
<p><b>Where AI goes wrong:</b> it frequently mixes up <code>prototype</code> and <code>__proto__</code> in explanations, claims that writes "go to the prototype", forgets that <code>for...in</code> includes inherited keys, and recommends <code>obj.hasOwnProperty(k)</code> where <code>Object.hasOwn(obj, k)</code> is safer (null-prototype objects).</p>
<p><b>What you must still own:</b> the read-walks-up / write-stays-local rule, the ability to predict any lookup result in your head, and the security instinct to never let user-controlled keys reach a plain object without filtering.</p>`,
    problems: [{
      title: 'Where Does This Property Live?',
      level: 'Easy', tags: ['prototype chain', 'Object.hasOwn', 'getPrototypeOf'], companies: ['Google', 'Atlassian', 'Flipkart'],
      statement: `<p>Write <code>findOwner(obj, key)</code> that returns <code>{ owner, depth }</code>: the object in <code>obj</code>'s prototype chain that has <code>key</code> as an <b>own</b> property, and how many <code>[[Prototype]]</code> hops it took (0 = the object itself). Return <code>null</code> if no object in the chain owns <code>key</code>. It must work for non-enumerable properties, symbol keys, and null-prototype objects.</p>`,
      constraints: `Chain length ≤ 100. <code>key</code> is a string or symbol. Do not use <code>for...in</code>.`,
      example: `<p><code>findOwner(rex, 'legs')</code> where rex → Dog.prototype (has legs) → Animal.prototype (has legs) → Object.prototype → null</p>
<p>Output: ${H.c('g', '{ owner: Dog.prototype, depth: 1 }')} — the <b>first</b> owner wins (Animal.prototype.legs is shadowed). <code>findOwner(rex, 'toString')</code> → ${H.c('g', 'depth 3')}; <code>findOwner(rex, 'fly')</code> → ${H.c('r', 'null')}.</p>`,
      brute: {
        why: `<p>A first idea is to collect keys with <code>Object.keys(o)</code> at each level and test <code>includes(key)</code>. It is O(k) per level instead of O(1), and it is <b>wrong</b>: <code>Object.keys</code> skips non-enumerable properties (every built-in method, every class method!) and symbol keys, so it would say <code>toString</code> lives nowhere.</p>`,
        code: { lang: 'js', run: true, code: `function findOwnerBrute(obj, key) {
  let o = obj, depth = 0;
  while (o !== null) {
    if (Object.keys(o).includes(key)) return { owner: o, depth };  // misses non-enumerables!
    o = Object.getPrototypeOf(o);
    depth++;
  }
  return null;
}
const animal = { eats: true };
const dog = Object.create(animal);
console.log(findOwnerBrute(dog, 'eats').depth);   // 1  (works for enumerable)
console.log(findOwnerBrute(dog, 'toString'));     // null  WRONG: toString is non-enumerable` }
      },
      mcq: { q: 'Which check correctly answers "does THIS object (not its ancestors) have key k", even for objects created with Object.create(null)?', options: ['<code>k in o</code>', '<code>o.hasOwnProperty(k)</code>', '<code>Object.hasOwn(o, k)</code>', '<code>o[k] !== undefined</code>'], answer: 2, explain: '<code>in</code> and <code>o[k]</code> climb the chain; <code>o.hasOwnProperty</code> does not exist on null-prototype objects. <code>Object.hasOwn</code> is a static function, own-only, and works on anything.' },
      hints: [
        `<p>Hint 1: the chain is just a linked list. "next" is <code>Object.getPrototypeOf(o)</code> and the list ends at <code>null</code>.</p>`,
        `<p>Hint 2: at each node ask an <b>own-only</b> question that sees non-enumerable and symbol keys: <code>Object.hasOwn(o, key)</code> (or <code>Object.getOwnPropertyDescriptor(o, key) !== undefined</code>).</p>`,
        `<p>Hint 3: recipe — <code>o = obj, depth = 0</code>; while <code>o !== null</code>: if own → return; else <code>o = getPrototypeOf(o)</code>, <code>depth++</code>. After the loop return null. Primitives: wrap with <code>Object(obj)</code> first.</p>`
      ],
      solution: {
        approach: `<p>Walk the linked list of prototypes with <code>Object.getPrototypeOf</code>, asking <code>Object.hasOwn</code> at each node. The first hit is the owner (that is precisely the object a normal property read would use). <code>Object(obj)</code> lets primitives like <code>'abc'</code> work too.</p>`,
        code: { lang: 'js', run: true, code: `function findOwner(obj, key) {
  if (obj === null || obj === undefined) return null;
  let o = Object(obj);          // box primitives so 'abc' works
  let depth = 0;
  while (o !== null) {
    if (Object.hasOwn(o, key)) return { owner: o, depth };  // own-only, sees non-enumerables
    o = Object.getPrototypeOf(o);
    depth++;
  }
  return null;                  // reached the end of the chain
}

class Animal { eat() {} }
Animal.prototype.legs = 2;
class Dog extends Animal { bark() {} }
Dog.prototype.legs = 4;
const rex = new Dog();
rex.name = 'Rex';

const r1 = findOwner(rex, 'legs');
console.log(r1.owner === Dog.prototype, r1.depth);        // true 1
console.log(findOwner(rex, 'eat').depth);                  // 2
console.log(findOwner(rex, 'toString').owner === Object.prototype); // true
console.log(findOwner(rex, 'fly'));                        // null
const sym = Symbol('tag');
Animal.prototype[sym] = 'animal';
console.log(findOwner(rex, sym).depth);                    // 2
console.log(findOwner(Object.create(null), 'x'));          // null (no crash)
console.log(findOwner('abc', 'toUpperCase').owner === String.prototype); // true` },
        dry: { head: ['depth', 'o', 'Object.hasOwn(o, "legs")', 'action'], rows: [['0', 'rex', 'false', 'climb'], ['1', 'Dog.prototype', H.c('g', 'true'), H.c('g', 'return { Dog.prototype, 1 }')], ['—', 'Animal.prototype', 'never checked', 'shadowed']] },
        complexity: `<p>Time O(d) where d = chain depth (each <code>hasOwn</code> is O(1) on average). Space O(1).</p>`,
        followUps: ['Return the property <b>descriptor</b> too, so you can tell a getter from a data property.', 'List every object in the chain that owns <code>key</code> (all shadowed copies).', 'How would a Proxy in the chain change your answer? (its <code>getOwnPropertyDescriptor</code> trap can lie)']
      }
    }]
  });

  /* ======================================================================
     TOPIC 2 — prototype vs __proto__ vs constructor (the triangle)
     ====================================================================== */
  var TRI = {
    rex: { label: 'rex', x: 85, y: 56, own: { name: "'Rex'" }, proto: 'DogP' },
    DogP: { label: 'Dog.prototype', x: 75, y: 32, own: { constructor: 'Dog' }, proto: 'ObjP' },
    Dog: { label: 'Dog', x: 45, y: 56, own: { prototype: 'DogP' }, proto: 'FnP' },
    FnP: { label: 'Function.prototype', x: 30, y: 32, own: { constructor: 'Fn' }, proto: 'ObjP' },
    Fn: { label: 'Function', x: 10, y: 56, own: { prototype: 'FnP' }, proto: 'FnP' },
    Obj: { label: 'Object', x: 12, y: 8, own: { prototype: 'ObjP' }, proto: 'FnP' },
    ObjP: { label: 'Object.prototype', x: 50, y: 8, own: { constructor: 'Obj' }, proto: 'NULL' },
    NULL: { label: 'null', x: 88, y: 8, own: {}, proto: null }
  };
  function triGraph(hl, ehl, tags) {
    var nodes = [], eMap = {}, edges = [];
    Object.keys(TRI).forEach(function (id) {
      var n = TRI[id];
      nodes.push({ id: id, label: n.label, x: n.x, y: n.y, shape: id === 'NULL' ? undefined : 'box' });
      if (n.proto) eMap[id + '-' + n.proto] = ['__proto__'];
    });
    Object.keys(TRI).forEach(function (id) {
      Object.keys(TRI[id].own).forEach(function (k) {
        if (k === 'name') return;
        var key = id + '-' + TRI[id].own[k];
        (eMap[key] = eMap[key] || []).unshift(k);
      });
    });
    Object.keys(eMap).forEach(function (k) { var p = k.split('-'); edges.push([p[0], p[1], eMap[k].join(' & ')]); });
    return { type: 'graph', label: 'The prototype triangle (edge text = which property points there)', directed: true, height: 64, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} };
  }

  topics.push({
    title: 'prototype vs __proto__ vs constructor: The Triangle',
    analogy: `<p>Think of a <b>school</b> and its <b>rule book</b>.</p>
<ul>
<li>The school <b>owns</b> one master rule book and gives a reference to it to every new student. "The book this school <b>hands out</b>" = <code>School.prototype</code>. Only schools (functions) have this.</li>
<li>Each student carries "the book I <b>was given</b>" = the student's <code>__proto__</code> (properly: <code>Object.getPrototypeOf(student)</code>). Every object has this.</li>
<li>Printed inside the book's cover: "issued by <b>this school</b>" = <code>School.prototype.constructor</code>, pointing back to the school.</li>
</ul>
<p>Same book, three different <b>directions</b> of pointing. Mixing up "the book I hand out" with "the book I was given" is the #1 prototype confusion in interviews.</p>`,
    explain: `<p>There are three different things with confusingly similar names. Learn them as three arrows:</p>
${H.table(['Name', 'Who has it', 'What it points to', 'Used by'], [
  ['<code>F.prototype</code>', 'Functions that can be called with <code>new</code> (normal functions, classes)', 'The object that will become the <code>[[Prototype]]</code> of objects created by <code>new F()</code>', 'Only by <code>new</code> (and <code>instanceof</code>)'],
  ['<code>obj.__proto__</code>', 'Every object (it is an inherited getter/setter on <code>Object.prototype</code>)', 'That object\'s <b>own</b> hidden <code>[[Prototype]]</code> link — the next stop in its chain', 'Property lookup, every time'],
  ['<code>F.prototype.constructor</code>', 'The default prototype object of every function', 'Back to the function <code>F</code>', 'Nothing in the engine — it is just a convenience label']
])}
<h4>The one sentence to memorise</h4>
<p><b><code>new Dog()</code> creates an object whose <code>__proto__</code> is <code>Dog.prototype</code>.</b> So <code>rex.__proto__ === Dog.prototype</code> is <code>true</code>, but <code>rex.prototype</code> is <code>undefined</code> (rex is not a function) and <code>Dog.__proto__</code> is <code>Function.prototype</code> (Dog <i>itself</i> is an object created by the <code>Function</code> machinery).</p>
<h4><code>__proto__</code> today</h4>
<p><code>obj.__proto__</code> is a <b>legacy</b> accessor kept for web compatibility (spec Annex B). It does not exist on objects whose chain lacks <code>Object.prototype</code> (e.g. <code>Object.create(null)</code>). Modern code uses:</p>
<ul>
<li><code>Object.getPrototypeOf(obj)</code> — read the link.</li>
<li><code>Object.setPrototypeOf(obj, proto)</code> — change it (slow, avoid in hot code).</li>
<li><code>Object.create(proto)</code> — make a new object with that link from the start (best).</li>
<li>In object literals, <code>{ __proto__: proto, x: 1 }</code> is <b>standard syntax</b> that sets the prototype at creation — that one is fine.</li>
</ul>
<h4><code>constructor</code> is just a normal property</h4>
<p>Every ordinary function gets a fresh object in <code>F.prototype</code> with one non-enumerable property: <code>constructor: F</code>. Instances inherit it, so <code>rex.constructor === Dog</code>. But it is only a convention: you can overwrite it, and if you replace <code>Dog.prototype</code> with a new object literal you <b>lose</b> it (then <code>rex.constructor</code> climbs further up and finds <code>Object</code>!). Never use <code>.constructor</code> for security or type checks.</p>
<h4>Who has a <code>prototype</code> property?</h4>
${H.table(['Kind of function', 'Has <code>.prototype</code>?', 'Can use <code>new</code>?'], [
  ['<code>function F() {}</code>', H.c('g', 'yes'), H.c('g', 'yes')],
  ['<code>class C {}</code>', H.c('g', 'yes (non-writable)'), H.c('g', 'yes — only with new')],
  ['arrow <code>() =&gt; {}</code>', H.c('r', 'no'), H.c('r', 'no — TypeError')],
  ['method shorthand <code>{ m() {} }</code>, class methods', H.c('r', 'no'), H.c('r', 'no')],
  ['<code>async function</code>', H.c('r', 'no'), H.c('r', 'no')],
  ['<code>function*</code> generator', H.c('y', 'yes (prototype of its iterators)'), H.c('r', 'no')],
  ['built-in <code>Math.max</code>, bound functions', H.c('r', 'no'), 'bound: yes if target can']
])}
<h4>The top of the world</h4>
<p>Functions are objects too, so they have chains: <code>Dog → Function.prototype → Object.prototype → null</code>. And the two built-in giants point at each other: <code>Object</code> is a function (so <code>Object.__proto__ === Function.prototype</code>) and <code>Function.prototype</code> is an object (so its <code>__proto__</code> is <code>Object.prototype</code>). Hence the famous pair: <code>Object instanceof Function</code> and <code>Function instanceof Object</code> are <b>both true</b>. Even <code>Function.__proto__ === Function.prototype</code> is true — Function is its own constructor.</p>`,
    clues: [
      '"What is the difference between <code>prototype</code> and <code>__proto__</code>?" — the classic opener; answer with "hands out" vs "was given".',
      '"Predict: <code>rex.__proto__ === Dog.prototype</code>, <code>Dog.__proto__ === ?</code>, <code>rex.prototype</code>?" → the triangle diagram.',
      '"Why is <code>rex.constructor</code> suddenly <code>Object</code>?" → someone replaced <code>Dog.prototype</code> with a literal and lost <code>constructor</code>.',
      '"Is <code>Function instanceof Object</code>? Is <code>Object instanceof Function</code>?" → both true; draw the top of the triangle.',
      '"Can you call <code>new</code> on an arrow function / class method?" → no <code>prototype</code>, no <code>[[Construct]]</code>.',
      '"Should I use <code>__proto__</code>?" → legacy accessor; use <code>Object.getPrototypeOf / create</code>.'
    ],
    code: { lang: 'js', run: true, title: 'All three arrows, verified (runnable)', code: `function Dog(name) { this.name = name; }
const rex = new Dog('Rex');

// 1) prototype: the object Dog HANDS OUT to its instances
console.log(typeof Dog.prototype);                        // object
// 2) [[Prototype]] (__proto__): the object rex WAS GIVEN
console.log(Object.getPrototypeOf(rex) === Dog.prototype); // true
console.log(rex.__proto__ === Dog.prototype);              // true (legacy accessor)
// 3) constructor: points back from the prototype to the function
console.log(Dog.prototype.constructor === Dog);            // true
console.log(rex.constructor === Dog);                      // true (inherited, not own)
console.log(Object.hasOwn(rex, 'constructor'));            // false

// rex is not a function, so it has no 'prototype' property
console.log(rex.prototype);                                // undefined
// Dog itself is a function object -> its own chain
console.log(Object.getPrototypeOf(Dog) === Function.prototype);              // true
console.log(Object.getPrototypeOf(Function.prototype) === Object.prototype); // true
// the top of the world
console.log(Object instanceof Function, Function instanceof Object);         // true true
console.log(Object.getPrototypeOf(Function) === Function.prototype);         // true` },
    viz: {
      title: 'Follow a property path through the triangle',
      input: 'rex.__proto__.__proto__.constructor',
      inputLabel: 'Path from rex / Dog / Object / Function using .__proto__ .prototype .constructor — or compare two paths with ===',
      gen: function (input) {
        var src = String(input === undefined ? 'rex.__proto__.__proto__.constructor' : input).trim();
        var START = { rex: 'rex', Dog: 'Dog', Function: 'Fn', Object: 'Obj' };
        var sides = src.split('===');
        if (sides.length > 2) throw new Error('Use at most one === comparison');
        var paths = sides.map(function (sd) {
          var toks = sd.trim().split('.');
          if (!START[toks[0]]) throw new Error('Start with rex, Dog, Object or Function — e.g.  Dog.__proto__ === Function.prototype');
          if (toks.length > 9) throw new Error('Use at most 8 steps');
          toks.slice(1).forEach(function (t) { if (['__proto__', 'prototype', 'constructor'].indexOf(t) < 0) throw new Error('Each step must be .__proto__, .prototype or .constructor (got "' + t + '")'); });
          return toks;
        });
        var frames = [];
        function lbl(v) { return v === 'UNDEF' ? 'undefined' : TRI[v].label; }
        function walk(toks, sideName) {
          var cur = START[toks[0]], expr = toks[0];
          frames.push({ narr: (sideName ? sideName + ': ' : '') + 'Start at <b>' + esc(TRI[cur].label) + '</b>.' + (cur === 'rex' ? ' rex is a plain object made by <code>new Dog()</code>.' : ' This is a <b>function</b> — and functions are objects too, so they have their own chain.'), parts: [triGraph(one(cur, 'cur')), { type: 'vars', label: 'Evaluating', vals: { expression: expr, value: lbl(cur) }, hl: { value: 'cur' } }] });
          for (var i = 1; i < toks.length; i++) {
            var k = toks[i], before = expr;
            expr += '.' + k;
            if (cur === 'UNDEF' || cur === 'NULL') {
              frames.push({ narr: '<span class="c-r"><b>TypeError!</b></span> <code>' + esc(before) + '</code> is <b>' + (cur === 'NULL' ? 'null' : 'undefined') + '</b>, and you cannot read <code>.' + esc(k) + '</code> of ' + (cur === 'NULL' ? 'null' : 'undefined') + '. The evaluation stops here.', parts: [triGraph(cur === 'NULL' ? { NULL: 'bad' } : {}), { type: 'vars', label: 'Evaluating', vals: { expression: expr, value: 'TypeError' }, hl: { value: 'bad' } }] });
              return 'ERR';
            }
            var hl = {}, ehl = {}, tags = {}, narr;
            if (k === '__proto__') {
              var nxt = TRI[cur].proto;
              hl[cur] = 'cur'; hl[nxt] = 'ok'; ehl[cur + '-' + nxt] = 'ok';
              tags.ObjP = cur === 'ObjP' ? 'getter lives here' : 'getter found here';
              narr = cur === 'ObjP' ? '<b>Object.prototype</b> is where the <code>__proto__</code> <b>getter</b> itself lives. It returns Object.prototype\'s own hidden <code>[[Prototype]]</code> link → <b>null</b> (the end of every chain).' : '<b>' + esc(TRI[cur].label) + '</b> has no own <code>__proto__</code>. It inherits a <b>getter</b> from <code>Object.prototype</code> that simply returns the object\'s hidden <code>[[Prototype]]</code> link → <b>' + esc(lbl(nxt)) + '</b>.';
              cur = nxt;
            } else {
              var o = cur, path = [];
              while (o !== 'NULL' && TRI[o].own[k] === undefined) { path.push(TRI[o].label); hl[o] = 'win'; o = TRI[o].proto; }
              if (o === 'NULL') {
                hl[cur] = 'cur';
                narr = 'Look for <code>' + esc(k) + '</code>: checked ' + esc(path.join(' → ')) + ' → null. <span class="c-r">Nobody owns it</span>, so the value is <b>undefined</b>.' + (k === 'prototype' ? ' Only <b>functions</b> carry a <code>prototype</code> property; ' + esc(TRI[cur].label) + ' is not a constructor function.' : '');
                cur = 'UNDEF';
              } else {
                var val = TRI[o].own[k];
                hl[cur] = 'cur'; hl[o] = o === cur ? 'cur' : 'win'; hl[val] = 'ok'; ehl[o + '-' + val] = 'ok';
                narr = (o === cur ? '<b>' + esc(TRI[cur].label) + '</b> owns <code>' + esc(k) + '</code> directly' : '<b>' + esc(TRI[cur].label) + '</b> does not own <code>' + esc(k) + '</code>; climbing ' + esc(path.join(' → ')) + ' we find it on <b>' + esc(TRI[o].label) + '</b> (inherited)') + ' → it points to <b>' + esc(TRI[val].label) + '</b>.' + (k === 'constructor' && o !== cur ? ' This is why <code>.constructor</code> works on instances even though they never own it.' : '');
                cur = val;
              }
            }
            frames.push({ narr: narr, parts: [triGraph(hl, ehl, tags), { type: 'vars', label: 'Evaluating', vals: { expression: expr, value: lbl(cur) }, hl: { value: cur === 'UNDEF' ? 'bad' : 'ok' } }] });
          }
          return cur;
        }
        var res = [];
        paths.forEach(function (t, i) { res.push(walk(t, paths.length > 1 ? (i === 0 ? 'Left side' : 'Right side') : '')); });
        if (paths.length === 2) {
          var eq = res[0] === res[1] && res[0] !== 'ERR';
          var hl2 = {}; if (res[0] !== 'ERR' && res[0] !== 'UNDEF') hl2[res[0]] = eq ? 'ok' : 'bad'; if (res[1] !== 'ERR' && res[1] !== 'UNDEF') hl2[res[1]] = eq ? 'ok' : 'bad';
          frames.push({ narr: res[0] === 'ERR' || res[1] === 'ERR' ? 'One side threw a TypeError, so the comparison never happens.' : '<code>===</code> on objects compares <b>identity</b> (same box in memory). Left = <b>' + esc(lbl(res[0])) + '</b>, right = <b>' + esc(lbl(res[1])) + '</b> → ' + (eq ? '<span class="c-g"><b>true</b></span>' : '<span class="c-r"><b>false</b></span>') + '.', parts: [triGraph(hl2), { type: 'vars', vals: { left: res[0] === 'ERR' ? 'TypeError' : lbl(res[0]), right: res[1] === 'ERR' ? 'TypeError' : lbl(res[1]), result: res[0] === 'ERR' || res[1] === 'ERR' ? 'TypeError' : String(eq) }, hl: { result: eq ? 'ok' : 'bad' } }] });
        } else if (res[0] !== 'ERR') {
          frames.push({ narr: 'Final answer: <code>' + esc(src) + '</code> → <b>' + esc(lbl(res[0])) + '</b>. Try <code>Dog.__proto__ === Function.prototype</code>, <code>rex.prototype</code>, <code>Function.__proto__ === Function.prototype</code> or <code>Object.__proto__.__proto__.__proto__</code>.', parts: [triGraph(res[0] === 'UNDEF' ? {} : one(res[0], 'sel')), note('<code>prototype</code> = what a function <b>hands out</b>. <code>__proto__</code> = what an object <b>was given</b>. <code>constructor</code> = arrow back from a prototype to its function.', 'Remember')] });
        }
        while (frames.length < 4) frames.push({ narr: 'Every object (including functions) has exactly one <code>__proto__</code> arrow. Only functions have a <code>prototype</code> arrow. Only prototype objects have a <code>constructor</code> arrow (by default).', parts: [triGraph({}), note('Edit the path above and run again to explore.', 'Tip')] });
        return frames;
      }
    },
    examples: [
      { title: 'Predict: replacing the whole prototype loses constructor', html: `<p>Writing <code>Dog.prototype = { bark() {} }</code> swaps in a brand-new plain object. That object never had a <code>constructor</code> property, so <code>rex.constructor</code> climbs to <code>Object.prototype.constructor</code> → <code>Object</code>. Fix: add it back as a <b>non-enumerable</b> property, or just add methods one by one (<code>Dog.prototype.bark = ...</code>), or use <code>class</code>.</p>
${H.table(['Line', 'rex.constructor'], [['Default prototype', H.c('g', 'Dog')], ['After Dog.prototype = { bark }', H.c('r', 'Object')], ['After defineProperty fix', H.c('g', 'Dog')]])}`, code: { lang: 'js', run: true, code: `function Dog() {}
console.log(new Dog().constructor === Dog);   // true

Dog.prototype = { bark() { return 'woof'; } }; // whole object replaced
const rex = new Dog();
console.log(rex.bark());                       // woof
console.log(rex.constructor === Dog);          // false
console.log(rex.constructor === Object);       // true  (climbed to Object.prototype)

Object.defineProperty(Dog.prototype, 'constructor', { value: Dog, writable: true, configurable: true, enumerable: false });
console.log(rex.constructor === Dog);          // true again
console.log(Object.keys(Dog.prototype));       // [ 'bark' ] — constructor stays hidden` } },
      { title: 'Predict: old instances keep the OLD prototype', html: `<p><code>new</code> copies the <b>reference</b> in <code>F.prototype</code> into the new object at creation time. Re-assigning <code>F.prototype</code> later does not re-link objects that already exist. But <b>mutating</b> the shared prototype object is visible to everyone who links to it.</p>
${H.table(['Object', 'linked to', 'a.hello()', 'b.hello()'], [['a (made first)', 'old prototype object', "'old'", '—'], ['b (made after swap)', 'new prototype object', '—', "'new'"]])}`, code: { lang: 'js', run: true, code: `function F() {}
F.prototype.hello = function () { return 'old'; };
const a = new F();
F.prototype = { hello() { return 'new'; } };   // swap the object
const b = new F();
console.log(a.hello(), b.hello());     // old new
console.log(a instanceof F);           // false! a's chain lacks the NEW F.prototype
console.log(b instanceof F);           // true` } },
      { title: 'Arrow functions, methods and async functions have no prototype', html: `<p>Only functions that can be <b>constructed</b> get a <code>prototype</code> property. Arrow functions, method shorthand, class methods and async functions are "callable only", so <code>new</code> on them throws <code>TypeError: ... is not a constructor</code>. Classes have a prototype but <b>throw if called without</b> <code>new</code>.</p>`, code: { lang: 'js', run: true, code: `const arrow = () => {};
const obj = { method() {} };
async function load() {}
class Cat {}
console.log(arrow.prototype, obj.method.prototype, load.prototype); // undefined undefined undefined
console.log(typeof Cat.prototype);  // object
try { new arrow(); } catch (e) { console.log(e.message); }   // arrow is not a constructor
try { Cat(); } catch (e) { console.log(e.message); }         // Class constructor Cat cannot be invoked without 'new'` } },
      { title: '__proto__ in a literal vs __proto__ from JSON', html: `<p>In an object <b>literal</b>, <code>__proto__: x</code> is special syntax that <b>sets the prototype</b>. In <code>JSON.parse</code> it is just an ordinary <b>own</b> key — harmless by itself, dangerous once a naive merge copies it with <code>target[key] = value</code> (that assignment hits the inherited setter).</p>`, code: { lang: 'js', run: true, code: `const base = { greet() { return 'hi'; } };
const lit = { __proto__: base, x: 1 };        // literal syntax: sets [[Prototype]]
console.log(Object.getPrototypeOf(lit) === base, Object.hasOwn(lit, '__proto__')); // true false

const parsed = JSON.parse('{"__proto__": {"admin": true}}');
console.log(Object.hasOwn(parsed, '__proto__'));        // true — just an own key
console.log(Object.getPrototypeOf(parsed) === Object.prototype); // true — not re-linked

const copy = {};
for (const k of Object.keys(parsed)) copy[k] = parsed[k]; // naive copy hits the setter
console.log(copy.admin, Object.hasOwn(copy, 'admin'));    // true false  (inherited!)` } },
      { title: 'Functions are objects: Dog has its own chain', html: `<p>Because <code>Dog</code> is itself an object, <code>Dog.call</code>, <code>Dog.bind</code> and <code>Dog.name</code> come from somewhere: <code>call</code>/<code>bind</code> from <code>Function.prototype</code>; <code>name</code> and <code>length</code> are own properties. Static-like helpers you attach (<code>Dog.create = ...</code>) are own properties of the function — exactly what ES6 <code>static</code> does.</p>`, code: { lang: 'js', run: true, code: `function Dog(name, age) {}
Dog.create = function (n) { return new Dog(n); };   // a "static" method
console.log(Object.hasOwn(Dog, 'create'), Object.hasOwn(Dog, 'prototype')); // true true
console.log(Dog.name, Dog.length);                  // Dog 2
console.log(Object.hasOwn(Dog, 'call'));            // false — from Function.prototype
console.log(Object.getPrototypeOf(Object.getPrototypeOf(Dog)) === Object.prototype); // true` } }
    ],
    deepDive: `<p><b>Internal slots vs properties.</b> <code>[[Prototype]]</code> is an <b>internal slot</b>, not a property. You cannot see it with <code>Object.keys</code>. <code>__proto__</code> is an accessor property defined once, on <code>Object.prototype</code>, whose getter is roughly <code>function () { return Object.getPrototypeOf(this); }</code>. That is why <code>Object.create(null).__proto__</code> is <code>undefined</code>: the getter is not in that chain. <code>F.prototype</code>, by contrast, is a completely ordinary data property (writable for functions, non-writable/non-configurable for classes).</p>
<p><b>How <code>new</code> reads <code>prototype</code>.</b> <code>OrdinaryCreateFromConstructor</code> does <code>Get(F, 'prototype')</code> at construction time; if the result is not an object (e.g. someone set <code>F.prototype = 42</code>), the engine silently falls back to the realm's <code>%Object.prototype%</code>. With <code>Reflect.construct(F, args, NewTarget)</code> the prototype is read from <code>NewTarget</code>, not <code>F</code> — this is precisely how <code>class B extends A</code> makes <code>A</code>'s constructor build an object linked to <code>B.prototype</code>.</p>
<p><b>Built-in oddities.</b> <code>Function.prototype</code> is itself a <b>function</b> (callable, returns undefined) but has no <code>prototype</code> property. <code>Array.prototype</code> is itself an array (<code>Array.isArray(Array.prototype) === true</code>). <code>Object.prototype</code> is an <i>immutable prototype exotic object</i>: <code>Object.setPrototypeOf(Object.prototype, {})</code> throws — the chain's root cannot be re-pointed. <code>Function.prototype.constructor === Function</code> and <code>Function.__proto__ === Function.prototype</code>: the bootstrap circle is created by the engine at startup, not by user-level JS.</p>
<p><b>Cross-realm.</b> Each iframe, <code>vm</code> context, or worker has its own set of intrinsics, so <code>iframeArray.__proto__ !== Array.prototype</code> of the parent page. Identity checks across realms fail — which is why <code>Array.isArray</code> exists (see the instanceof topic).</p>
<p><b>Performance.</b> <code>Object.setPrototypeOf</code> and assigning <code>__proto__</code> on an existing object force V8 to change the object's hidden class map and can push it into slow "dictionary mode"; it also invalidates prototype validity cells used by inline caches across the app. Creating with the right prototype from the start (<code>Object.create</code>, <code>{ __proto__: p }</code> literal, <code>class</code>) is fast.</p>`,
    aiEra: `<p><b>What AI changes:</b> "explain prototype vs __proto__" is a question any chatbot answers instantly — so interviewers now go one level deeper: predict-the-output chains like <code>Object.__proto__.__proto__.__proto__</code>, "why did <code>constructor</code> change?", or "what does <code>new</code> read and when?". Memorised definitions no longer impress; a correct mental diagram does.</p>
<p><b>Use AI as a partner:</b> ask it to "<i>generate 15 expressions over Dog/rex/Object/Function and their expected values; I'll answer first</i>", then verify every answer in a real console — never trust the AI's answer key blindly. Ask for an ASCII triangle diagram for a 3-level class hierarchy and check every arrow.</p>
<p><b>Where AI goes wrong:</b> it often says "<code>rex.prototype</code> is <code>Dog.prototype</code>" (wrong — undefined), claims arrow functions have a prototype, or writes legacy <code>obj.__proto__ = x</code> in new code. Some generated code still sets <code>Child.prototype = Parent.prototype</code> (shared object — a bug).</p>
<p><b>What you must still own:</b> drawing the triangle from memory in 30 seconds, explaining why <code>Object instanceof Function</code> and <code>Function instanceof Object</code> are both true, and choosing <code>Object.getPrototypeOf</code>/<code>Object.create</code> over <code>__proto__</code> in code you sign off on.</p>`,
    problems: [{
      title: 'Print the Prototype Chain',
      level: 'Easy', tags: ['prototype chain', 'constructor', 'getPrototypeOf'], companies: ['Microsoft', 'Uber', 'Swiggy'],
      statement: `<p>Write <code>describeChain(value)</code> that returns a string like <code>"Dog.prototype -&gt; Animal.prototype -&gt; Object.prototype -&gt; null"</code> describing every object in the prototype chain of <code>value</code> (starting from <code>value</code>'s prototype, not <code>value</code> itself). Name a prototype <code>X.prototype</code> only when it truly is the <code>prototype</code> of its <code>constructor</code>; otherwise print <code>[object]</code>. Primitives should be boxed; <code>null</code>/<code>undefined</code> return <code>"null"</code>.</p>`,
      constraints: `Chain length ≤ 50. Do not trust <code>constructor</code> blindly: it may be missing, inherited, or lie.`,
      example: `<p><code>describeChain(new Dog())</code> → ${H.c('g', '"Dog.prototype -&gt; Animal.prototype -&gt; Object.prototype -&gt; null"')}<br><code>describeChain(Object.create({ a: 1 }))</code> → ${H.c('g', '"[object] -&gt; Object.prototype -&gt; null"')} — the middle object is an anonymous literal; its inherited <code>constructor</code> is <code>Object</code>, but <code>Object.prototype</code> is not that literal, so we refuse to call it <code>Object.prototype</code>.</p>`,
      brute: {
        why: `<p>The tempting version prints <code>p.constructor.name + '.prototype'</code> at each step. It lies whenever <code>constructor</code> is <b>inherited</b> (an anonymous object prints as "Object.prototype" twice), crashes on objects without a constructor (<code>Object.create(null)</code>), and is fooled by someone overwriting <code>constructor</code>.</p>`,
        code: { lang: 'js', run: true, code: `function describeChainBrute(v) {
  const parts = [];
  let p = Object.getPrototypeOf(Object(v));
  while (p) {
    parts.push(p.constructor.name + '.prototype');   // trusts constructor blindly
    p = Object.getPrototypeOf(p);
  }
  return parts.concat('null').join(' -> ');
}
console.log(describeChainBrute(Object.create({ a: 1 })));
// Object.prototype -> Object.prototype -> null   (WRONG: first one is an anonymous object)` }
      },
      mcq: { q: 'For <code>const o = Object.create({ a: 1 })</code>, what is <code>Object.getPrototypeOf(o).constructor</code>?', options: ['<code>undefined</code>', '<code>Object</code> — inherited from <code>Object.prototype</code>', 'The literal <code>{ a: 1 }</code>', 'It throws'], answer: 1, explain: 'The literal has no own <code>constructor</code>, so the read climbs to <code>Object.prototype.constructor</code> = <code>Object</code>. That is why you must verify <code>C.prototype === p</code> before naming it.' },
      hints: [
        `<p>Hint 1: loop with <code>p = Object.getPrototypeOf(p)</code> until <code>p === null</code>. Start from the prototype of <code>Object(value)</code> so primitives work.</p>`,
        `<p>Hint 2: read the constructor <b>only if it is own</b>: <code>Object.getOwnPropertyDescriptor(p, 'constructor')</code>. Then trust it only if <code>typeof C === 'function' &amp;&amp; C.prototype === p</code>.</p>`,
        `<p>Hint 3: edge cases — <code>null/undefined</code> input → <code>"null"</code>; anonymous classes have <code>name === ''</code> → print <code>[object]</code>; null-prototype objects end immediately. Join with <code>' -&gt; '</code> and append <code>'null'</code>.</p>`
      ],
      solution: {
        approach: `<p>Walk the chain. For each prototype, look at its <b>own</b> <code>constructor</code> descriptor (a data property, not a getter, so we do not run user code), and accept the name only if the function's <code>prototype</code> points back to this exact object — the triangle must close. This turns the unreliable <code>constructor</code> convention into a verified fact.</p>`,
        code: { lang: 'js', run: true, code: `function nameOf(p) {
  const d = Object.getOwnPropertyDescriptor(p, 'constructor');
  const C = d && 'value' in d ? d.value : undefined;        // own data property only
  if (typeof C === 'function' && C.prototype === p && C.name) return C.name + '.prototype';
  return '[object]';
}
function describeChain(value) {
  if (value === null || value === undefined) return 'null';
  const parts = [];
  let p = Object.getPrototypeOf(Object(value));   // start from the prototype
  while (p !== null) {
    parts.push(nameOf(p));
    p = Object.getPrototypeOf(p);
  }
  parts.push('null');
  return parts.join(' -> ');
}

class Animal {}
class Dog extends Animal {}
console.log(describeChain(new Dog()));
// Dog.prototype -> Animal.prototype -> Object.prototype -> null
console.log(describeChain(Object.create({ a: 1 })));  // [object] -> Object.prototype -> null
console.log(describeChain([1, 2]));                   // Array.prototype -> Object.prototype -> null
console.log(describeChain(Dog));  // [object] -> Function.prototype -> Object.prototype -> null (Dog's [[Prototype]] is Animal itself!)
console.log(describeChain('hi'));                     // String.prototype -> Object.prototype -> null
console.log(describeChain(Object.create(null)));      // null` },
        dry: { head: ['p', 'own constructor C', 'C.prototype === p?', 'printed'], rows: [['Dog.prototype', 'Dog', H.c('g', 'yes'), 'Dog.prototype'], ['Animal.prototype', 'Animal', H.c('g', 'yes'), 'Animal.prototype'], ['Object.prototype', 'Object', H.c('g', 'yes'), 'Object.prototype'], ['null', '—', '—', 'null (stop)']] },
        complexity: `<p>Time O(d), space O(d) for the output, d = chain depth.</p>`,
        followUps: ['Note the surprise: <code>describeChain(Dog)</code> starts with <code>[object]</code> because <code>Object.getPrototypeOf(Dog) === Animal</code> (a function, not a prototype object). Explain why classes do this.', 'Add a <code>maxDepth</code> guard and Proxy-safety.', 'Print own property names next to each level.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 3 — Object.create, delegation (OLOO) and null-prototype objects
     ====================================================================== */
  topics.push({
    title: 'Object.create: Linking Objects Directly (Delegation, Null Prototypes, Descriptors)',
    analogy: `<p>A new employee joins and is told: "Anything you don't know, <b>ask Priya</b>." Nobody copies Priya's brain into the new hire — the new hire just <b>delegates</b> questions to her. If Priya learns something new tomorrow, the new hire benefits instantly.</p>
<p><code>Object.create(priya)</code> is exactly that: it makes a fresh, empty object whose "ask this person" link points at <code>priya</code>. And <code>Object.create(null)</code> is a new hire told "there is <b>nobody</b> to ask" — a perfectly blank notebook that does not even know what <code>toString</code> is.</p>`,
    explain: `<p><code>Object.create(proto)</code> is the most <b>direct</b> way to use prototypes: no constructor function, no <code>new</code>, no <code>class</code>. It does one thing — <b>make a new empty object whose <code>[[Prototype]]</code> is <code>proto</code></b>.</p>
${H.table(['Call', 'New object\'s chain'], [
  ['<code>Object.create(animal)</code>', 'obj → animal → Object.prototype → null'],
  ['<code>Object.create(Object.prototype)</code>', 'same as <code>{}</code>'],
  ['<code>Object.create(null)</code>', 'obj → null (no <code>toString</code>, no <code>hasOwnProperty</code>, nothing)'],
  ['<code>Object.create(42)</code>', H.c('r', 'TypeError: Object prototype may only be an Object or null')]
])}
<h4>1. Delegation, step by step</h4>
<p>Build objects that <b>delegate</b> to other objects. This style is sometimes called <b>OLOO</b> ("Objects Linked to Other Objects"). There is no "class" at all — just objects pointing at objects:</p>
<ul>
<li><code>const animal = { walk() {...} }</code> — the shared behaviour.</li>
<li><code>const rabbit = Object.create(animal)</code> — rabbit can <code>walk()</code> by delegation.</li>
<li><code>const longEar = Object.create(rabbit)</code> — a 3-level chain, still no classes.</li>
</ul>
<h4>2. The optional second argument: property descriptors</h4>
<p><code>Object.create(proto, { x: { value: 1, enumerable: true } })</code> also defines own properties, using the same format as <code>Object.defineProperties</code>. Watch out: in a descriptor every flag you leave out defaults to <b>false</b> — so <code>{ value: 1 }</code> creates a property that is <b>read-only, hidden from <code>Object.keys</code>, and cannot be deleted</b>.</p>
${H.table(['Flag', 'Meaning', 'Default in descriptors', 'Default for <code>o.x = 1</code>'], [['<code>writable</code>', 'can be reassigned', H.c('r', 'false'), H.c('g', 'true')], ['<code>enumerable</code>', 'shows in keys / for...in / spread', H.c('r', 'false'), H.c('g', 'true')], ['<code>configurable</code>', 'can be deleted / redefined', H.c('r', 'false'), H.c('g', 'true')]])}
<h4>3. Null-prototype objects: safe dictionaries</h4>
<p>A plain <code>{}</code> already "contains" <code>constructor</code>, <code>toString</code>, <code>__proto__</code>… through its chain. If you use it as a map of user-supplied keys (word counts, HTTP headers, config), a key like <code>"constructor"</code> or <code>"__proto__"</code> collides with inherited stuff. <code>Object.create(null)</code> (or the literal <code>{ __proto__: null }</code>) gives you an object with <b>no chain at all</b> — every key is truly yours. For dynamic keys in new code, a <code>Map</code> is often even better.</p>
<h4>4. Copying vs linking</h4>
<p><code>Object.create</code> <b>links</b> (changes to the prototype show through). <code>Object.assign(target, src)</code> and spread <code>{ ...src }</code> <b>copy</b> own enumerable properties into a plain object and <b>drop the prototype</b>. Mixing behaviours into a prototype with <code>Object.assign(Dog.prototype, canSwim, canFly)</code> is the classic <b>mixin</b> pattern.</p>`,
    clues: [
      '"Create an object with a given prototype without using a constructor / class" → <code>Object.create(proto)</code>.',
      '"Implement <code>Object.create</code> polyfill" — a top-5 polyfill question (temp constructor trick).',
      '"Word count breaks on the word <i>constructor</i>" or "dictionary of arbitrary keys" → <code>Object.create(null)</code> or <code>Map</code>.',
      '"Behaviour delegation", "OLOO", "inheritance without classes" → objects linked with <code>Object.create</code>.',
      '"Why is my property not showing in <code>Object.keys</code> / not writable?" → descriptor defaults are all <code>false</code>.',
      '"Clone an object <b>including</b> its prototype" → <code>Object.create(Object.getPrototypeOf(o), Object.getOwnPropertyDescriptors(o))</code>.'
    ],
    code: [{ lang: 'js', run: true, title: 'Delegation chain with Object.create (runnable)', code: `const animal = {
  eats: true,
  walk() { return this.name + ' walks'; }
};
const rabbit = Object.create(animal);        // rabbit -> animal
rabbit.name = 'Bunny';
rabbit.jumps = true;

const longEar = Object.create(rabbit, {      // longEar -> rabbit -> animal
  earLength: { value: 10, enumerable: true } // writable/configurable default to false!
});
longEar.name = 'Long Ear';                   // own, shadows rabbit.name

console.log(longEar.walk());                 // Long Ear walks  (this = longEar)
console.log(longEar.jumps, longEar.eats);    // true true (delegated)
longEar.earLength = 99;                      // ignored: not writable (sloppy mode)
console.log(longEar.earLength);              // 10
console.log(Object.keys(longEar));           // [ 'earLength', 'name' ]

animal.sleep = function () { return this.name + ' sleeps'; };
console.log(longEar.sleep());                // Long Ear sleeps  (added later, still visible)
` }, { lang: 'js', run: true, title: 'Null-prototype dictionary (runnable)', code: `function countWords(words, dict) {
  for (const w of words) dict[w] = (dict[w] || 0) + 1;
  return dict;
}
const words = ['constructor', 'hello', 'hello'];

const bad = countWords(words, {});           // plain object: inherits 'constructor'!
console.log(typeof bad.constructor);         // string  (function source + "1" — broken)

const good = countWords(words, Object.create(null));
console.log(good.constructor, good.hello);   // 1 2
console.log('toString' in good);             // false — nothing inherited
console.log(Object.getPrototypeOf(good));    // null

const viaMap = new Map();
for (const w of words) viaMap.set(w, (viaMap.get(w) || 0) + 1);
console.log(viaMap.get('constructor'));      // 1 — Map is the modern choice
` }],
    codeTitle: ['Delegation chain', 'Null-prototype dictionary'],
    viz: [{
      title: 'Building a delegation chain with Object.create',
      gen: function () {
        var code = [
          "const animal = { eats: true, walk() {...} };",
          "const rabbit = Object.create(animal);",
          "rabbit.name = 'Bunny';",
          "const longEar = Object.create(rabbit, {",
          "  earLength: { value: 10, enumerable: true }",
          "});",
          "longEar.name = 'Long Ear';",
          "longEar.walk();        // 'Long Ear walks'",
          "longEar.earLength = 99; // ignored!",
          "const dict = Object.create(null);",
          "dict.toString = 'just a key';"
        ].join('\n');
        function mp(lbl, entries, hl) { return { type: 'map', label: lbl, entries: entries, hl: hl || {} }; }
        var A = [['eats', 'true'], ['walk', 'ƒ']], R = [], LE = [];
        var steps = [];
        steps.push({ l: 1, narr: 'A plain object literal. Its chain is <code>animal → Object.prototype → null</code>. This object will be the <b>shared behaviour</b>.', extra: [{ type: 'list', label: 'Chain of animal', values: ['animal', 'Object.prototype'], next: [1, -1], hl: { 0: 'ok' } }, mp('animal (own)', A.slice(), { eats: 'ok', walk: 'ok' })] });
        steps.push({ l: 2, narr: '<code>Object.create(animal)</code> makes a <b>new empty object</b> and sets its hidden <code>[[Prototype]]</code> to <code>animal</code>. Nothing is copied — rabbit owns zero properties.', extra: [{ type: 'list', label: 'Chain of rabbit', values: ['rabbit', 'animal', 'Object.prototype'], next: [1, 2, -1], hl: { 0: 'ok' } }, mp('rabbit (own)', []), mp('animal (own)', A.slice())] });
        R.push(['name', "'Bunny'"]);
        steps.push({ l: 3, narr: 'A write → a new <b>own</b> property on rabbit. animal is untouched.', extra: [{ type: 'list', label: 'Chain of rabbit', values: ['rabbit', 'animal', 'Object.prototype'], next: [1, 2, -1], hl: { 0: 'cur' } }, mp('rabbit (own)', R.slice(), { name: 'ok' }), mp('animal (own)', A.slice())] });
        LE.push(['earLength', '10 (read-only)']);
        steps.push({ l: [4, 5, 6], narr: 'Create longEar linked to <b>rabbit</b>, and define <code>earLength</code> through a <b>descriptor</b>. We said <code>enumerable: true</code>, but left out <code>writable</code> and <code>configurable</code>, so both are <span class="c-r">false</span>.', extra: [{ type: 'list', label: 'Chain of longEar', values: ['longEar', 'rabbit', 'animal', 'Object.prototype'], next: [1, 2, 3, -1], hl: { 0: 'ok' } }, mp('longEar (own)', LE.slice(), { earLength: 'ok' }), mp('rabbit (own)', R.slice()), mp('animal (own)', A.slice())] });
        LE.push(['name', "'Long Ear'"]);
        steps.push({ l: 7, narr: 'Write <code>name</code> on longEar → own property that <b>shadows</b> rabbit.name.', extra: [{ type: 'list', label: 'Chain of longEar', values: ['longEar', 'rabbit', 'animal', 'Object.prototype'], next: [1, 2, 3, -1], hl: { 0: 'cur' } }, mp('longEar (own)', LE.slice(), { name: 'ok' }), mp('rabbit (own)', R.slice(), { name: 'done' })] });
        steps.push({ l: 8, narr: '<code>longEar.walk</code>: not on longEar, not on rabbit, <b>found on animal</b> (2 hops). It runs with <code>this = longEar</code>, so it reads <code>this.name</code> = <b>\'Long Ear\'</b>.', extra: [{ type: 'list', label: 'Lookup of walk', values: ['longEar', 'rabbit', 'animal', 'Object.prototype'], next: [1, 2, 3, -1], hl: { 0: 'done', 1: 'done', 2: 'ok' }, ptr: { 2: 'found' } }, { type: 'vars', vals: { 'this': 'longEar', 'this.name': "'Long Ear'", result: "'Long Ear walks'" }, hl: { result: 'ok' } }], o: ['Long Ear walks'] });
        steps.push({ l: 9, cls: 'bad', narr: '<code>earLength</code> is <b>not writable</b>. In sloppy mode the write is <b>silently ignored</b>; in strict mode (modules, classes) it throws <code>TypeError: Cannot assign to read only property</code>.', extra: [mp('longEar (own)', LE.slice(), { earLength: 'bad' }), note('Descriptor defaults: writable / enumerable / configurable are all <b>false</b> unless you say otherwise.', 'Gotcha')], o: ['Long Ear walks'] });
        steps.push({ l: 10, narr: '<code>Object.create(null)</code> → an object with <b>no prototype at all</b>. Its chain is just <code>dict → null</code>.', extra: [{ type: 'list', label: 'Chain of dict', values: ['dict'], next: [-1], hl: { 0: 'sel' } }, mp('dict (own)', [])], o: ['Long Ear walks'] });
        steps.push({ l: 11, narr: 'In <code>dict</code>, <code>toString</code> is just an ordinary key — nothing inherited to collide with. Perfect for arbitrary user keys (but you cannot call <code>dict.hasOwnProperty</code>: use <code>Object.hasOwn(dict, k)</code>).', extra: [{ type: 'list', label: 'Chain of dict', values: ['dict'], next: [-1], hl: { 0: 'sel' } }, mp('dict (own)', [['toString', "'just a key'"]], { toString: 'ok' }), note('String(dict) or a template literal with dict would throw: no toString / valueOf / Symbol.toPrimitive anywhere in the chain.', 'Trade-off')], o: ['Long Ear walks'] });
        return codeFrames(code, steps);
      }
    }, {
      title: 'How the classic Object.create polyfill works',
      gen: function () {
        var code = [
          'function create(proto) {',
          '  function F() {}        // 1. throwaway empty constructor',
          '  F.prototype = proto;   // 2. point its prototype at proto',
          '  return new F();        // 3. new links the result to F.prototype',
          '}',
          'const o = create(animal);'
        ].join('\n');
        function g(hl, ehl, extraNodes, extraEdges) {
          var nodes = [{ id: 'animal', label: 'animal', x: 75, y: 10, shape: 'box' }].concat(extraNodes || []);
          return { type: 'graph', directed: true, height: 50, nodes: nodes, edges: extraEdges || [], hl: hl || {}, ehl: ehl || {} };
        }
        return codeFrames(code, [
          { l: 6, narr: 'Before ES5 there was no <code>Object.create</code>. The only tool that sets a prototype was <code>new</code>. Douglas Crockford\'s trick: borrow <code>new</code> with a dummy function.', extra: [g({ animal: 'sel' })] },
          { l: 2, narr: 'Make an <b>empty</b> function <code>F</code>. Its body does nothing, so <code>new F()</code> will add no own properties.', extra: [g({ F: 'cur' }, {}, [{ id: 'F', label: 'F (function)', x: 20, y: 10, shape: 'box' }, { id: 'FP', label: 'default F.prototype', x: 20, y: 38, shape: 'box' }], [['F', 'FP', 'prototype']])] },
          { l: 3, narr: 'Re-point <code>F.prototype</code> at <code>proto</code> (animal). The default prototype object is thrown away.', extra: [g({ F: 'cur', animal: 'ok' }, { 'F-animal': 'ok' }, [{ id: 'F', label: 'F (function)', x: 20, y: 10, shape: 'box' }], [['F', 'animal', 'prototype']])] },
          { l: 4, narr: '<code>new F()</code> creates an empty object whose <code>[[Prototype]]</code> = <code>F.prototype</code> = <b>animal</b>. Exactly what we wanted.', extra: [g({ o: 'ok', animal: 'ok' }, { 'o-animal': 'ok' }, [{ id: 'F', label: 'F (function)', x: 20, y: 10, shape: 'box' }, { id: 'o', label: 'new object o', x: 75, y: 40, shape: 'box' }], [['F', 'animal', 'prototype'], ['o', 'animal', '[[Prototype]]']])] },
          { l: 6, narr: '<code>F</code> is garbage now; only the link matters. Limitation: this trick <b>cannot</b> make a null-prototype object (<code>F.prototype = null</code> makes <code>new</code> fall back to <code>Object.prototype</code>) — modern polyfills use <code>Object.setPrototypeOf</code> or <code>{ __proto__: null }</code> for that case.', extra: [g({ o: 'sel' }, {}, [{ id: 'o', label: 'o', x: 75, y: 40, shape: 'box' }], [['o', 'animal', '[[Prototype]]']])] }
        ]);
      }
    }],
    examples: [
      { title: 'OLOO: behaviour delegation without any class', html: `<p>Kyle Simpson's OLOO style: a "base" object with an <code>init</code> method instead of a constructor, and "sub" objects linked to it. No <code>new</code>, no <code>prototype</code> property, no <code>super</code> — just <code>Object.create</code> and explicit delegation.</p>
${H.chips(['loginWidget', '→ Widget', '→ Object.prototype'], { label: 'Chain' })}`, code: { lang: 'js', run: true, code: `const Widget = {
  init(width) { this.width = width; return this; },
  render() { return '[' + this.kind() + ' ' + this.width + 'px]'; },
  kind() { return 'widget'; }
};
const Button = Object.create(Widget);           // Button delegates to Widget
Button.setup = function (width, label) {
  this.init(width);                               // delegated call, this = the button
  this.label = label;
  return this;
};
Button.kind = function () { return 'button:' + this.label; };   // "override"

const ok = Object.create(Button).setup(80, 'OK');
console.log(ok.render());                         // [button:OK 80px]
console.log(Widget.isPrototypeOf(ok));            // true` } },
      { title: 'Predict: the descriptor defaults trap', html: `<p>Everything you omit in a descriptor is <code>false</code>. So <code>secret</code> below is invisible to <code>Object.keys</code>, <code>JSON.stringify</code> and spread; it ignores writes (sloppy mode) and refuses <code>delete</code>.</p>
${H.table(['Operation', 'Result'], [['Object.keys(o)', "[ 'visible' ]"], ['o.secret = 2; o.secret', '1'], ['delete o.secret', 'false'], ['JSON.stringify(o)', '{"visible":true}']])}`, code: { lang: 'js', run: true, code: `const o = Object.create(Object.prototype, {
  secret: { value: 1 },                                // all flags false
  visible: { value: true, enumerable: true }
});
console.log(Object.keys(o));      // [ 'visible' ]
o.secret = 2;                     // silently ignored (sloppy mode)
console.log(o.secret);            // 1
console.log(delete o.secret);     // false (not configurable)
console.log(JSON.stringify(o));   // {"visible":true}
console.log(Object.getOwnPropertyDescriptor(o, 'secret'));
// { value: 1, writable: false, enumerable: false, configurable: false }` } },
      { title: 'Clone WITH the prototype (and getters) intact', html: `<p>Spread and <code>Object.assign</code> copy own enumerable <b>values</b> into a plain object: the prototype is lost and getters are run and flattened into data. To make a faithful shallow clone, copy the <b>descriptors</b> and the <b>prototype</b>:</p>
<p><code>Object.create(Object.getPrototypeOf(o), Object.getOwnPropertyDescriptors(o))</code></p>`, code: { lang: 'js', run: true, code: `class Temp {
  constructor(c) { this.c = c; }
  get f() { return this.c * 9 / 5 + 32; }
}
const t = new Temp(100);
const spread = { ...t };
console.log(spread instanceof Temp, spread.f);        // false undefined (getter was on prototype)

const clone = Object.create(Object.getPrototypeOf(t), Object.getOwnPropertyDescriptors(t));
console.log(clone instanceof Temp, clone.f);          // true 212
clone.c = 0;
console.log(clone.f, t.f);                            // 32 212 — independent own data` } },
      { title: 'Mixins: copy behaviour into a prototype', html: `<p>A class can have only one parent, but you can <b>copy</b> extra methods into its prototype with <code>Object.assign</code>. This is the "mixin" pattern. Downsides: name clashes are silent (last one wins), and <code>Object.assign</code> copies only own enumerable properties — so mixing in a <i>class's</i> prototype copies nothing (class methods are non-enumerable).</p>`, code: { lang: 'js', run: true, code: `const canSwim = { swim() { return this.name + ' swims'; } };
const canFly = { fly() { return this.name + ' flies'; } };
function Duck(name) { this.name = name; }
Object.assign(Duck.prototype, canSwim, canFly);    // copy methods in
const d = new Duck('Donald');
console.log(d.swim(), '|', d.fly());              // Donald swims | Donald flies

class Quacker { quack() { return 'quack'; } }
Object.assign(Duck.prototype, Quacker.prototype); // copies NOTHING
console.log(typeof d.quack);                      // undefined — class methods are non-enumerable` } },
      { title: 'Object.setPrototypeOf vs Object.create', html: `<p>Both produce the same chain, but <code>setPrototypeOf</code> <b>mutates</b> an existing object's link, which is slow in every engine (it invalidates optimisations). Use it only for one-time setup; prefer creating the object with the right prototype from the start.</p>`, code: { lang: 'js', run: true, code: `const proto = { hi() { return 'hi from proto'; } };
const a = Object.create(proto);                 // fast: born with the link
const b = Object.setPrototypeOf({}, proto);     // works, but re-links later (slow path)
console.log(a.hi(), b.hi());
try { Object.setPrototypeOf(proto, a); }        // would create a cycle
catch (e) { console.log(e.constructor.name + ': ' + e.message); }   // TypeError: Cyclic __proto__ value` } }
    ],
    deepDive: `<p><b>What the spec does.</b> <code>Object.create(O, Properties)</code>: (1) if <code>O</code> is not an Object and not null → <code>TypeError</code>; (2) <code>obj = OrdinaryObjectCreate(O)</code>; (3) if <code>Properties</code> is not undefined → <code>ObjectDefineProperties(obj, Properties)</code>. That is all — no constructor runs, no <code>constructor</code> property is added. This is why it is the cleanest primitive and why <code>class</code>/<code>new</code> can be explained in terms of it.</p>
<p><b>Null-prototype objects in the wild.</b> Node's <code>querystring.parse</code> and the <code>URLSearchParams</code>-to-object helpers return null-prototype objects; <code>Object.groupBy</code> (ES2024) also returns a null-prototype object, so <code>Object.groupBy(xs, f).hasOwnProperty('a')</code> throws — use <code>Object.hasOwn</code>. Module namespace objects (<code>import * as ns</code>) also have a null prototype. Template engines and JSON-schema validators use <code>Object.create(null)</code> caches to avoid key collisions. Downsides: they print as <code>[Object: null prototype] {}</code> in Node, cannot be converted to string (no <code>toString</code>/<code>Symbol.toPrimitive</code>), and some libraries assume <code>obj.hasOwnProperty</code> exists.</p>
<p><b>Dictionary mode.</b> V8 gives objects "shapes" (hidden classes). An object used as a dynamic dictionary — many keys added and deleted — gets switched to <b>dictionary mode</b> (a hash table), which is slower for property access but fine for map-like use. <code>Map</code> is designed for this workload: it preserves insertion order for any key type (including objects), has <code>size</code>, iterates in order, and has no prototype collisions at all. Rule of thumb: <b>records</b> (fixed, known keys) → objects/classes; <b>dictionaries</b> (unknown keys from data) → <code>Map</code> or <code>Object.create(null)</code>.</p>
<p><b>Polyfill subtleties.</b> The old <code>function F(){}; F.prototype = proto; return new F()</code> shim cannot create null-prototype objects (when <code>F.prototype</code> is not an object, <code>new</code> silently uses <code>Object.prototype</code>), and it ignores the second argument unless you also call <code>Object.defineProperties</code> (ES5 only). Modern polyfills handle null via <code>Object.setPrototypeOf(obj, null)</code> or the <code>{ __proto__: null }</code> literal. Also note that <code>Object.assign</code> <b>invokes</b> getters on the source and <b>setters</b> on the target, whereas <code>Object.defineProperties</code> copies the accessor functions themselves — a real difference when cloning objects with accessors.</p>`,
    aiEra: `<p><b>What AI changes:</b> generated code overwhelmingly reaches for <code>class</code>; delegation with <code>Object.create</code> appears less often, so recognising it in legacy code (and in polyfill interview rounds) is now a differentiator. AI is good at writing the <code>Object.create</code> polyfill — interviewers know that, so they ask the follow-ups: "what about <code>null</code>?", "what about the second argument?", "why did ES5 need this trick?".</p>
<p><b>Use AI as a partner:</b> paste a function that uses <code>{}</code> as a dictionary and ask "<i>which input keys break this?</i>" — a good model will list <code>constructor</code>, <code>__proto__</code>, <code>toString</code>, <code>hasOwnProperty</code>. Ask it to convert a dictionary-style object to <code>Map</code> and then review that it also changed every <code>in</code>/<code>Object.keys</code>/<code>JSON.stringify</code> usage.</p>
<p><b>Where AI goes wrong:</b> it writes <code>Object.create(proto, { x: { value: 1 } })</code> and assumes <code>x</code> is enumerable/writable; uses spread to "clone" class instances (losing the prototype); suggests <code>Object.assign</code> mixins from class prototypes (copies nothing); calls <code>dict.hasOwnProperty</code> on null-prototype objects.</p>
<p><b>What you must still own:</b> knowing when you are <b>linking</b> versus <b>copying</b>, the descriptor defaults, and the dictionary-safety reflex (<code>Map</code> or null prototype for untrusted keys).</p>`,
    problems: [{
      title: 'Polyfill Object.create (including null and descriptors)',
      level: 'Medium', tags: ['polyfill', 'Object.create', 'prototype'], companies: ['Amazon', 'Adobe', 'Paytm', 'Walmart'],
      statement: `<p>Implement <code>objectCreate(proto, propertiesObject)</code> that behaves like <code>Object.create</code>:</p>
<ul><li>Throws <code>TypeError</code> if <code>proto</code> is neither an object (functions count as objects) nor <code>null</code>.</li><li>Returns a new object whose <code>[[Prototype]]</code> is <code>proto</code> (including <code>null</code>).</li><li>If <code>propertiesObject</code> is given (not <code>undefined</code>), defines those properties with descriptor semantics.</li></ul>
<p>You may not call <code>Object.create</code>.</p>`,
      constraints: `Must work for <code>proto = null</code>. Must not run any user constructor. Must not add own <code>constructor</code> or other stray properties.`,
      example: `<p><code>const o = objectCreate({ hi() { return 'hi'; } }, { x: { value: 1, enumerable: true } })</code></p>
<p>${H.c('g', "o.hi() → 'hi'")} (delegated), ${H.c('g', 'Object.keys(o) → [ "x" ]')}, and ${H.c('g', 'Object.getPrototypeOf(objectCreate(null)) → null')}. <code>objectCreate(5)</code> → ${H.c('r', 'TypeError')}.</p>`,
      brute: {
        why: `<p>A naive "copy" version (<code>Object.assign({}, proto)</code>) is <b>not</b> Object.create: it copies values once (later changes to <code>proto</code> are not seen), drops non-enumerable methods, breaks <code>isPrototypeOf</code>/<code>instanceof</code>, and cannot produce a null-prototype object.</p>`,
        code: { lang: 'js', run: true, code: `function objectCreateBrute(proto) {
  return Object.assign({}, proto);       // COPY, not LINK
}
const base = { a: 1 };
const o = objectCreateBrute(base);
base.b = 2;                              // added later
console.log(o.b);                        // undefined — not linked
console.log(base.isPrototypeOf(o));      // false` }
      },
      mcq: { q: 'In the classic polyfill <code>function F(){}; F.prototype = proto; return new F();</code>, what happens when <code>proto</code> is <code>null</code>?', options: ['It returns a null-prototype object', '<code>new</code> ignores the non-object prototype and links to <code>Object.prototype</code>', 'It throws TypeError', 'It returns null'], answer: 1, explain: 'OrdinaryCreateFromConstructor falls back to the realm\'s %Object.prototype% when <code>F.prototype</code> is not an object, so the result silently inherits from Object.prototype — a bug for <code>Object.create(null)</code>.' },
      hints: [
        `<p>Hint 1: validate first — <code>typeof proto === 'object' || typeof proto === 'function'</code> (and note <code>typeof null === 'object'</code>, which is fine here because null is allowed).</p>`,
        `<p>Hint 2: for an object proto, use the temp-constructor trick (<code>F.prototype = proto; new F()</code>). For <code>null</code>, start from <code>{}</code> and call <code>Object.setPrototypeOf(obj, null)</code> (or use the literal <code>{ __proto__: null }</code>).</p>`,
        `<p>Hint 3: finally, if <code>propertiesObject !== undefined</code>, call <code>Object.defineProperties(obj, propertiesObject)</code> — it applies false-by-default flags exactly like the real thing. Return <code>obj</code>.</p>`
      ],
      solution: {
        approach: `<p>Three steps mirror the spec: validate, create with the right link, define properties. Use the dummy-constructor trick for object prototypes (works in any engine) and a special path for <code>null</code>, since <code>new</code> cannot produce a null-prototype object.</p>`,
        code: { lang: 'js', run: true, code: `function objectCreate(proto, propertiesObject) {
  // 1. validate: object, function or null only
  if (proto === undefined || (proto !== null && typeof proto !== 'object' && typeof proto !== 'function')) {
    throw new TypeError('Object prototype may only be an Object or null: ' + proto);
  }
  // 2. create an empty object with the correct [[Prototype]]
  let obj;
  if (proto === null) {
    obj = {};
    Object.setPrototypeOf(obj, null);    // the dummy-constructor trick cannot do null
  } else {
    function F() {}                      // empty: adds no own properties
    F.prototype = proto;
    obj = new F();                       // new links obj -> F.prototype === proto
  }
  // 3. optional descriptors (flags default to false, exactly like the real API)
  if (propertiesObject !== undefined) Object.defineProperties(obj, propertiesObject);
  return obj;
}

const base = { hi() { return 'hi'; } };
const o = objectCreate(base, { x: { value: 1, enumerable: true } });
console.log(o.hi(), Object.keys(o), Object.getPrototypeOf(o) === base);  // hi [ 'x' ] true
console.log(Object.getOwnPropertyNames(o));                  // [ 'x' ] — no stray constructor
const n = objectCreate(null);
console.log(Object.getPrototypeOf(n), 'toString' in n);      // null false
try { objectCreate(5); } catch (e) { console.log(e.name); }  // TypeError
base.later = 42;
console.log(o.later);                                        // 42 — linked, not copied` },
        dry: { head: ['call', 'validation', 'creation path', 'result chain'], rows: [['objectCreate(base, {x})', 'object ✓', 'F.prototype = base; new F()', 'o → base → Object.prototype → null'], ['objectCreate(null)', 'null ✓', '{} then setPrototypeOf(null)', 'n → null'], ['objectCreate(5)', H.c('r', 'number ✗'), '—', H.c('r', 'TypeError')]] },
        complexity: `<p>O(1) for the link, plus O(p) for <code>p</code> property descriptors. No user code runs except descriptor getters on <code>propertiesObject</code>.</p>`,
        followUps: ['Why can the dummy <code>F</code> be reused across calls in an ES5 shim, and what is the risk?', 'Implement <code>Object.setPrototypeOf</code> using only <code>__proto__</code>; when does it fail?', 'Write <code>cloneWithProto(o)</code> using your polyfill plus <code>getOwnPropertyDescriptors</code>.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 4 — Constructor functions and what `new` really does
     ====================================================================== */
  topics.push({
    title: 'Constructor Functions and the 4 Steps of new',
    analogy: `<p>Think of a <b>phone factory</b>. When an order comes in:</p>
<ol>
<li>a worker grabs an <b>empty phone shell</b>,</li>
<li>slips in the <b>shared user manual link</b> ("for help, see the manual for model X" — every phone points to the same manual, nobody prints a copy),</li>
<li>the assembly line <b>fills in this phone's own parts</b> — its serial number, its colour,</li>
<li>and the finished phone is <b>shipped</b> to you. (Unless the line manager says "ship this other box instead" — then that box goes out.)</li>
</ol>
<p>That is <code>new Phone('black')</code>, step for step. The constructor function is the assembly line; <code>Phone.prototype</code> is the shared manual.</p>`,
    explain: `<p>Before ES6 classes, JavaScript "classes" were just <b>ordinary functions</b> called with <code>new</code>. By convention their names start with a capital letter. Inside, <code>this</code> refers to the new object being built.</p>
<h4>The 4 steps of <code>new Person('Asha')</code></h4>
${H.table(['Step', 'What happens', 'Code equivalent'], [
  ['1. Create', 'A brand-new empty object is made', '<code>const obj = {}</code>'],
  ['2. Link', 'Its <code>[[Prototype]]</code> is set to <code>Person.prototype</code>', '<code>Object.setPrototypeOf(obj, Person.prototype)</code>'],
  ['3. Run', '<code>Person</code> is called with <code>this = obj</code> and your arguments', '<code>const r = Person.apply(obj, args)</code>'],
  ['4. Return', 'If the function returned an <b>object</b> (or function), that wins; otherwise <code>obj</code> is returned', '<code>return isObject(r) ? r : obj</code>']
])}
<p>Steps 1 + 2 together are exactly <code>Object.create(Person.prototype)</code>.</p>
<h4>Where to put things</h4>
<ul>
<li><b>Per-object data</b> (name, balance) → assign to <code>this</code> inside the constructor. Every instance gets its own copy.</li>
<li><b>Shared behaviour</b> (greet, deposit) → put on <code>Person.prototype</code>. One function object, shared by every instance through the chain.</li>
</ul>
${H.table(['Methods defined…', 'a.greet === b.greet', '10,000 instances × 5 methods'], [['inside the constructor (<code>this.greet = function…</code>)', H.c('r', 'false'), H.c('r', '50,000 function objects')], ['on <code>Person.prototype</code>', H.c('g', 'true'), H.c('g', '5 function objects')]])}
<h4>The return-override rule (puzzle favourite)</h4>
<ul>
<li><code>return</code> nothing / a primitive (<code>42</code>, <code>'x'</code>, <code>null</code>) → <b>ignored</b>, you get the new object.</li>
<li><code>return</code> an object, array or function → <b>that</b> is what <code>new</code> gives you, and the object built in steps 1–3 is thrown away.</li>
</ul>
<h4>Forgetting <code>new</code></h4>
<p><code>const p = Person('Asha')</code> without <code>new</code> is just a normal call: <code>p</code> is <code>undefined</code>, and in sloppy mode <code>this</code> is the <b>global object</b>, so you just created a global variable <code>name</code>! In strict mode <code>this</code> is <code>undefined</code> and you get a <code>TypeError</code>. Defences: <code>'use strict'</code>, a <code>new.target</code> check, or use <code>class</code> (which refuses to be called without <code>new</code>).</p>
<h4>Inheritance the ES5 way</h4>
<p>To make <code>Dog</code> inherit from <code>Animal</code> with plain functions you need two links: (1) inside <code>Dog</code>, run the parent constructor on the same object: <code>Animal.call(this, name)</code>; (2) link the prototypes: <code>Dog.prototype = Object.create(Animal.prototype)</code> and restore <code>Dog.prototype.constructor = Dog</code>. This is precisely what <code>class Dog extends Animal</code> automates.</p>`,
    clues: [
      '"What does the <code>new</code> keyword do?" / "Implement <code>new</code> yourself" → the 4 steps; <code>Object.create</code> + <code>apply</code> + return check.',
      '"Constructor returns an object / a number — what do you get?" → the return-override rule.',
      '"Why put methods on the prototype instead of inside the constructor?" → shared function objects, memory, <code>a.greet === b.greet</code>.',
      '"Function was called without <code>new</code> and a global variable appeared" → sloppy-mode <code>this</code> = global object.',
      '"Inheritance without <code>class</code> / in ES5" → <code>Parent.call(this)</code> + <code>Object.create(Parent.prototype)</code> + fix <code>constructor</code>.',
      '"<code>new.target</code>", "scope-safe constructor", "abstract class in JS" → checking how the function was invoked.'
    ],
    code: [{ lang: 'js', run: true, title: 'A constructor function with shared prototype methods (runnable)', code: `function Person(name, age) {
  // 'this' is the brand-new object created by 'new'
  this.name = name;     // per-instance data
  this.age = age;
}
// shared behaviour: ONE function object for all persons
Person.prototype.greet = function () {
  return 'Hi, I am ' + this.name;
};
Person.prototype.birthday = function () {
  this.age += 1;        // mutates the instance, not the prototype
  return this.age;
};

const asha = new Person('Asha', 30);
const ben = new Person('Ben', 25);
console.log(asha.greet(), '|', ben.greet());  // Hi, I am Asha | Hi, I am Ben
console.log(asha.greet === ben.greet);        // true — shared
console.log(asha.birthday(), ben.age);        // 31 25
console.log(Object.keys(asha));               // [ 'name', 'age' ] — methods are not own
console.log(asha instanceof Person);          // true
` }, { lang: 'js', run: true, title: 'ES5 inheritance done right (runnable)', code: `function Animal(name) {
  this.name = name;
}
Animal.prototype.eat = function () { return this.name + ' eats'; };

function Dog(name, breed) {
  Animal.call(this, name);        // (1) run parent constructor on THIS object
  this.breed = breed;
}
// (2) link prototypes: Dog.prototype -> Animal.prototype
Dog.prototype = Object.create(Animal.prototype);
// (3) restore the constructor link that we just overwrote (non-enumerable like the original)
Object.defineProperty(Dog.prototype, 'constructor', { value: Dog, writable: true, configurable: true });
Dog.prototype.bark = function () { return this.name + ' barks'; };

const rex = new Dog('Rex', 'lab');
console.log(rex.eat(), '|', rex.bark());       // Rex eats | Rex barks
console.log(rex instanceof Dog, rex instanceof Animal); // true true
console.log(rex.constructor === Dog);          // true
console.log(Object.keys(rex));                 // [ 'name', 'breed' ]
` }],
    codeTitle: ['Constructor function', 'ES5 inheritance'],
    viz: {
      title: 'new, step by step (try: none / object / primitive)',
      input: 'none',
      inputLabel: 'What the constructor returns: none, object, or primitive',
      gen: function (input) {
        var mode = String(input === undefined ? 'none' : input).trim().toLowerCase();
        if (['none', 'object', 'primitive'].indexOf(mode) < 0) throw new Error('Type one of: none, object, primitive');
        var retLine = mode === 'none' ? '  // (no return statement)' : mode === 'object' ? '  return { hacked: true };' : '  return 42;';
        var code = [
          'function Person(name) {',
          '  this.name = name;',
          retLine,
          '}',
          "Person.prototype.greet = function () { return 'Hi, ' + this.name; };",
          'function myNew(Ctor, ...args) {',
          '  const obj = Object.create(Ctor.prototype); // steps 1 + 2',
          '  const result = Ctor.apply(obj, args);      // step 3',
          "  const isObj = result !== null && (typeof result === 'object' || typeof result === 'function');",
          '  return isObj ? result : obj;               // step 4',
          '}',
          "const p = myNew(Person, 'Asha');"
        ].join('\n');
        function g(objProps, hl, extra) {
          var nodes = [{ id: 'P', label: 'Person (function)', x: 18, y: 10, shape: 'box' }, { id: 'PP', label: 'Person.prototype', x: 70, y: 10, shape: 'box' }];
          var edges = [['P', 'PP', 'prototype']];
          if (objProps !== null) { nodes.push({ id: 'obj', label: 'obj ' + objProps, x: 70, y: 42, shape: 'box' }); edges.push(['obj', 'PP', '[[Prototype]]']); }
          if (extra) { nodes.push({ id: 'h', label: '{ hacked: true }', x: 22, y: 42, shape: 'box' }); edges.push(['h', 'OP', '']); nodes.push({ id: 'OP', label: 'Object.prototype', x: 22, y: 58, shape: 'box' }); }
          return { type: 'graph', label: 'Objects in memory', directed: true, height: extra ? 66 : 52, nodes: nodes, edges: edges, hl: hl || {} };
        }
        var steps = [
          { l: 12, narr: "We call <code>myNew(Person, 'Asha')</code> — our own re-implementation of <code>new Person('Asha')</code>. The real <code>new</code> does exactly these steps internally.", st: ['global', 'myNew'], v: { Ctor: 'Person', args: "['Asha']" }, extra: [g(null, { P: 'cur' })] },
          { l: 7, narr: '<b>Steps 1 + 2:</b> create a new empty object and link its <code>[[Prototype]]</code> to <code>Ctor.prototype</code> (Person.prototype). <code>Object.create</code> does both in one go.', st: ['global', 'myNew'], v: { obj: '{ } → Person.prototype' }, hv: { obj: 'ok' }, extra: [g('{ }', { obj: 'ok' })] },
          { l: 8, narr: '<b>Step 3:</b> run the constructor with <code>this = obj</code> using <code>apply</code>. Now we are inside <code>Person</code>.', st: ['global', 'myNew', 'Person (this = obj)'], v: { 'this': 'obj', name: "'Asha'" }, hv: { 'this': 'cur' }, extra: [g('{ }', { obj: 'cur' })] },
          { l: 2, narr: '<code>this.name = name</code> writes an <b>own</b> property on obj.', st: ['global', 'myNew', 'Person (this = obj)'], v: { 'this': "obj { name: 'Asha' }" }, hv: { 'this': 'ok' }, extra: [g("{ name: 'Asha' }", { obj: 'ok' })] }
        ];
        if (mode === 'none') {
          steps.push({ l: 3, narr: 'No <code>return</code> statement → the function returns <code>undefined</code>.', st: ['global', 'myNew', 'Person (this = obj)'], v: { returns: 'undefined' }, extra: [g("{ name: 'Asha' }", { obj: 'ok' })] });
          steps.push({ l: [9, 10], narr: '<b>Step 4:</b> <code>result</code> is <code>undefined</code> — not an object — so myNew returns <b>obj</b>, the object we built.', st: ['global', 'myNew'], v: { result: 'undefined', isObj: 'false', returned: 'obj' }, hv: { returned: 'ok' }, extra: [g("{ name: 'Asha' }", { obj: 'sel' })] });
          steps.push({ l: 12, narr: "<code>p</code> is obj. <code>p.greet()</code> is not own, so the lookup climbs to <b>Person.prototype</b> → <code>'Hi, Asha'</code>. <code>p instanceof Person</code> → <b>true</b>.", st: ['global'], v: { p: "{ name: 'Asha' }", 'p.greet()': "'Hi, Asha'", 'p instanceof Person': 'true' }, hv: { 'p.greet()': 'ok' }, extra: [g("{ name: 'Asha' }", { obj: 'sel', PP: 'ok' })] });
        } else if (mode === 'object') {
          steps.push({ l: 3, cls: 'bad', narr: 'The constructor explicitly <b>returns an object</b> <code>{ hacked: true }</code> — a plain literal linked to Object.prototype, unrelated to obj.', st: ['global', 'myNew', 'Person (this = obj)'], v: { returns: '{ hacked: true }' }, hv: { returns: 'bad' }, extra: [g("{ name: 'Asha' }", { h: 'bad' }, true)] });
          steps.push({ l: [9, 10], narr: '<b>Step 4:</b> <code>result</code> IS an object → it <b>overrides</b>. The carefully built obj (with name and the Person.prototype link) is thrown away.', st: ['global', 'myNew'], v: { result: '{ hacked: true }', isObj: 'true', returned: 'result' }, hv: { returned: 'bad' }, extra: [g("{ name: 'Asha' }", { obj: 'done', h: 'sel' }, true)] });
          steps.push({ l: 12, narr: "<code>p</code> is <code>{ hacked: true }</code>. <code>p.name</code> → undefined, <code>p.greet</code> → undefined (calling it would throw), <code>p instanceof Person</code> → <b>false</b>. This trick is how some libraries implement singletons or return cached instances.", st: ['global'], v: { p: '{ hacked: true }', 'p.name': 'undefined', 'p instanceof Person': 'false' }, hv: { 'p instanceof Person': 'bad' }, extra: [g("{ name: 'Asha' }", { obj: 'done', h: 'sel' }, true)] });
        } else {
          steps.push({ l: 3, narr: 'The constructor returns the <b>primitive</b> <code>42</code>.', st: ['global', 'myNew', 'Person (this = obj)'], v: { returns: '42' }, hv: { returns: 'cur' }, extra: [g("{ name: 'Asha' }", { obj: 'ok' })] });
          steps.push({ l: [9, 10], narr: '<b>Step 4:</b> <code>42</code> is not an object → it is <b>ignored</b>. myNew returns obj. (Same for <code>null</code>: <code>typeof null</code> is "object", which is why we check <code>result !== null</code>.)', st: ['global', 'myNew'], v: { result: '42', isObj: 'false', returned: 'obj' }, hv: { returned: 'ok' }, extra: [g("{ name: 'Asha' }", { obj: 'sel' })] });
          steps.push({ l: 12, narr: "<code>p</code> is the normal instance: <code>p.name</code> → 'Asha', <code>p.greet()</code> → 'Hi, Asha'. Returning primitives from a constructor is pointless — <code>new</code> throws them away.", st: ['global'], v: { p: "{ name: 'Asha' }", 'p.greet()': "'Hi, Asha'" }, hv: { 'p.greet()': 'ok' }, extra: [g("{ name: 'Asha' }", { obj: 'sel', PP: 'ok' })] });
        }
        return codeFrames(code, steps);
      }
    },
    examples: [
      { title: 'Predict: methods in the constructor are NOT shared', html: `<p>Defining a method with <code>this.greet = function…</code> creates a <b>new function object per instance</b>. Works fine, costs memory, and patching <code>Person.prototype</code> later will not affect it (the own property shadows).</p>
${H.table(['', 'own keys of a', 'a.greet === b.greet'], [['methods in constructor', "[ 'name', 'greet' ]", H.c('r', 'false')], ['methods on prototype', "[ 'name' ]", H.c('g', 'true')]])}`, code: { lang: 'js', run: true, code: `function A(name) {
  this.name = name;
  this.greet = function () { return 'hi ' + this.name; };   // new function every time
}
function B(name) { this.name = name; }
B.prototype.greet = function () { return 'hi ' + this.name; };

const a1 = new A('x'), a2 = new A('y');
const b1 = new B('x'), b2 = new B('y');
console.log(Object.keys(a1), a1.greet === a2.greet);   // [ 'name', 'greet' ] false
console.log(Object.keys(b1), b1.greet === b2.greet);   // [ 'name' ] true` } },
      { title: 'Predict: the return-override rule', html: `<p>Four constructors, four outcomes. Objects (including arrays and functions) override; primitives — including <code>null</code> — are ignored.</p>
${H.table(['Constructor returns', 'new F() gives', 'instanceof F'], [['nothing', 'the new object', 'true'], ['42', 'the new object', 'true'], ['null', 'the new object', 'true'], ['[1, 2]', '[1, 2]', H.c('r', 'false')]])}`, code: { lang: 'js', run: true, code: `function R1() { this.a = 1; }
function R2() { this.a = 1; return 42; }
function R3() { this.a = 1; return null; }
function R4() { this.a = 1; return [1, 2]; }
for (const F of [R1, R2, R3, R4]) {
  const x = new F();
  console.log(F.name, JSON.stringify(x), x instanceof F);
}
// R1 {"a":1} true
// R2 {"a":1} true
// R3 {"a":1} true
// R4 [1,2] false` } },
      { title: 'Forgetting new, and the new.target guard', html: `<p>Called without <code>new</code> in sloppy mode, <code>this</code> is <code>globalThis</code> — you silently create globals. <code>new.target</code> is <code>undefined</code> in a plain call and the constructor function under <code>new</code>, so you can throw a helpful error (or auto-fix by returning <code>new Safe(...)</code>).</p>`, code: { lang: 'js', run: true, code: `function Sloppy(v) { this.leaked = v; }
const s = Sloppy(5);                     // oops: no 'new'
console.log(s, globalThis.leaked);       // undefined 5   (global pollution!)
delete globalThis.leaked;

function Safe(v) {
  if (!new.target) throw new TypeError('Safe must be called with new');
  this.v = v;
}
try { Safe(1); } catch (e) { console.log(e.message); }   // Safe must be called with new
console.log(new Safe(1).v);                              // 1

function AutoNew(v) {
  if (!new.target) return new AutoNew(v);                // "scope-safe" constructor
  this.v = v;
}
console.log(AutoNew(7) instanceof AutoNew);              // true` } },
      { title: 'Two classic WRONG ways to inherit (and why)', html: `<p><b>Wrong 1:</b> <code>Dog.prototype = Animal.prototype</code> — both names point to the <b>same object</b>, so adding <code>bark</code> to dogs also gives every animal a <code>bark</code>. <b>Wrong 2:</b> <code>Dog.prototype = new Animal()</code> — runs the parent constructor once at setup time (with no arguments) and puts its instance data on the shared prototype, so every dog shares one <code>tags</code> array.</p>`, code: { lang: 'js', run: true, code: `function Animal(name) { this.name = name; this.tags = []; }
// Wrong 1: shared prototype object
function Dog1() {}
Dog1.prototype = Animal.prototype;
Dog1.prototype.bark = function () { return 'woof'; };
console.log(typeof new Animal('cat').bark);   // function  — cats can bark now!
delete Animal.prototype.bark;

// Wrong 2: prototype is an Animal INSTANCE
function Dog2() {}
Dog2.prototype = new Animal();                // tags: [] lives on the prototype
const d1 = new Dog2(), d2 = new Dog2();
d1.tags.push('good boy');
console.log(d2.tags);                         // [ 'good boy' ] — shared array!` } },
      { title: 'Factory function vs constructor', html: `<p>A <b>factory</b> is a plain function that builds and returns an object — no <code>new</code>, no <code>this</code>, and closures give real privacy. The trade-off: methods defined inside are re-created per object (unless you attach a shared prototype with <code>Object.create</code>), and <code>instanceof</code> does not work.</p>`, code: { lang: 'js', run: true, code: `function makeCounter(start) {
  let count = start;                         // private via closure
  return {
    inc() { count += 1; return count; },
    get value() { return count; }
  };
}
const c = makeCounter(10);
c.inc(); c.inc();
console.log(c.value, c.count);               // 12 undefined  (truly private)

// factory + shared prototype: best of both
const counterProto = { inc() { this.count += 1; return this.count; } };
function makeCounter2(start) { return Object.assign(Object.create(counterProto), { count: start }); }
const x = makeCounter2(1), y = makeCounter2(5);
console.log(x.inc(), y.inc(), x.inc === y.inc);   // 2 6 true` } }
    ],
    deepDive: `<p><b>[[Call]] vs [[Construct]].</b> Every function object has an internal <code>[[Call]]</code> method; only <i>constructors</i> also have <code>[[Construct]]</code>. Ordinary <code>function</code> declarations/expressions get both; arrow functions, methods, async functions, generators and most built-in methods get only <code>[[Call]]</code>. <code>new X()</code> throws "X is not a constructor" when <code>[[Construct]]</code> is missing. Classes have <code>[[Construct]]</code> but their <code>[[Call]]</code> always throws.</p>
<p><b>What <code>[[Construct]]</code> does for a base function</b> (spec <code>OrdinaryCallEvaluateBody</code> with <code>kind = base</code>): <code>OrdinaryCreateFromConstructor(newTarget, '%Object.prototype%')</code> reads <code>newTarget.prototype</code> (falling back to <code>Object.prototype</code> if it is not an object), binds <code>this</code>, runs the body, then applies the return-override rule. With <code>Reflect.construct(F, args, G)</code> the object is linked to <code>G.prototype</code> while <code>F</code>'s body runs — the mechanism behind subclassing built-ins.</p>
<p><b>Memory and speed.</b> Methods on the prototype cost one closure total; per-instance methods cost a closure <i>per object</i> (roughly 32–64 bytes each in V8 plus the context they capture). For millions of small objects that difference dominates. Assigning all own properties in the constructor, <b>in the same order, every time</b>, lets V8 give every instance the same hidden class, keeping property access monomorphic and fast; adding properties conditionally or later forks the shape tree. V8 also uses <i>slack tracking</i>: it over-allocates in-object slots for the first few instances of a constructor, then shrinks to the observed size.</p>
<p><b>Why <code>Object.create(Parent.prototype)</code> and not <code>new Parent()</code>?</b> The second runs side effects and stores per-instance data on the shared prototype (see the example), and fails outright if <code>Parent</code> requires arguments. The ES5-era helper <code>util.inherits</code> in Node (now deprecated in favour of <code>class extends</code>) did exactly <code>Object.setPrototypeOf(ctor.prototype, superCtor.prototype)</code>. Notice that ES5 inheritance only links the <b>instance</b> side; static methods on <code>Parent</code> are not inherited by <code>Child</code> unless you also do <code>Object.setPrototypeOf(Child, Parent)</code> — something <code>class extends</code> does automatically.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI writes constructor functions mostly when it is reading or migrating <b>legacy</b> code (jQuery plugins, old Node libraries, ES5 bundles). Being able to read the ES5 inheritance pattern and translate it to <code>class</code> — or back, when a reviewer asks "what does this compile to?" — is a common real task now, often AI-assisted.</p>
<p><b>Use AI as a partner:</b> "<i>convert this ES5 constructor hierarchy to classes and list every behavioural difference</i>" (expect: methods become non-enumerable, strict mode, calling without new throws, statics inherited). Then verify with tests. Ask it to generate edge-case tests for your <code>myNew</code>: constructors returning null, arrays, functions; arrow functions; classes.</p>
<p><b>Where AI goes wrong:</b> <code>myNew</code> implementations that check <code>typeof result === 'object'</code> without excluding <code>null</code>, or forget functions; ES5 inheritance that forgets to restore <code>constructor</code> or uses <code>Child.prototype = new Parent()</code>; claiming arrow functions can be constructors.</p>
<p><b>What you must still own:</b> the 4 steps of <code>new</code> by heart, the return-override rule, why methods belong on the prototype, and how to diagnose "a global variable appeared from nowhere".</p>`,
    problems: [{
      title: 'Implement new as a Function: myNew(Ctor, ...args)',
      level: 'Medium', tags: ['polyfill', 'new', 'constructor', 'prototype'], companies: ['Amazon', 'Meta', 'Zomato', 'PhonePe'],
      statement: `<p>Write <code>myNew(Ctor, ...args)</code> that behaves like <code>new Ctor(...args)</code> for ordinary constructor functions: the result must be linked to <code>Ctor.prototype</code>, the constructor must run with <code>this</code> bound to it, and the return-override rule must be respected. Throw a <code>TypeError</code> if <code>Ctor</code> is not a function with a usable <code>prototype</code>.</p>`,
      constraints: `Do not use the <code>new</code> keyword on <code>Ctor</code>. Handle constructors returning <code>undefined</code>, primitives, <code>null</code>, objects, arrays and functions.`,
      example: `<p><code>function P(n) { this.n = n; }  P.prototype.hi = function () { return 'hi ' + this.n; };</code></p>
<p><code>myNew(P, 'x').hi()</code> → ${H.c('g', "'hi x'")}; <code>myNew(P, 'x') instanceof P</code> → ${H.c('g', 'true')}. If <code>P</code> returned <code>[1]</code> you would get ${H.c('y', '[1]')}; if it returned <code>null</code>, the new object.</p>`,
      brute: {
        why: `<p>The naive version builds a plain object and copies the prototype's methods onto it. It "works" for simple calls, but the result is not linked (so <code>instanceof</code> fails and later prototype changes are invisible), copies only enumerable properties, and ignores the return-override rule.</p>`,
        code: { lang: 'js', run: true, code: `function myNewBrute(Ctor, ...args) {
  const obj = {};
  Object.assign(obj, Ctor.prototype);   // copy, don't link
  Ctor.apply(obj, args);                // ignores what Ctor returns
  return obj;
}
function P(n) { this.n = n; }
P.prototype.hi = function () { return 'hi ' + this.n; };
const x = myNewBrute(P, 'x');
console.log(x.hi(), x instanceof P);   // hi x false  <- broken link` }
      },
      mcq: { q: 'Your <code>myNew</code> checks <code>typeof result === "object"</code> to decide whether to return <code>result</code>. Which constructor return value breaks it?', options: ['<code>undefined</code>', '<code>null</code>', '<code>42</code>', '<code>"str"</code>'], answer: 1, explain: '<code>typeof null === "object"</code>, so you would return <code>null</code> instead of the new instance. You must also treat <b>functions</b> as objects (typeof "function").' },
      hints: [
        `<p>Hint 1: steps 1 + 2 ("create" and "link") are a single call: <code>Object.create(Ctor.prototype)</code>.</p>`,
        `<p>Hint 2: step 3 is <code>Ctor.apply(obj, args)</code> — it runs the body with <code>this = obj</code>. Keep its return value.</p>`,
        `<p>Hint 3: step 4: return <code>result</code> only if <code>result !== null &amp;&amp; (typeof result === 'object' || typeof result === 'function')</code>; else return <code>obj</code>. Validate <code>typeof Ctor === 'function'</code> first; if <code>Ctor.prototype</code> is not an object, link to <code>Object.prototype</code> like the real <code>new</code>.</p>`
      ],
      solution: {
        approach: `<p>Literally transcribe the four steps. The details that separate a good answer: the <code>null</code> check, treating functions as objects, falling back to <code>Object.prototype</code> when <code>Ctor.prototype</code> is not an object, and refusing non-functions. (Real <code>new</code> also refuses arrow functions/methods — we can detect a missing <code>prototype</code> as a heuristic.)</p>`,
        code: { lang: 'js', run: true, code: `function myNew(Ctor, ...args) {
  if (typeof Ctor !== 'function' || !('prototype' in Ctor)) {
    throw new TypeError(String(Ctor && Ctor.name || Ctor) + ' is not a constructor');
  }
  const proto = Ctor.prototype;
  const isObj = (v) => v !== null && (typeof v === 'object' || typeof v === 'function');
  // steps 1 + 2: create + link (fallback mirrors the spec)
  const obj = Object.create(isObj(proto) ? proto : Object.prototype);
  // step 3: run the constructor with this = obj
  const result = Ctor.apply(obj, args);
  // step 4: object results override, primitives (incl. null) are ignored
  return isObj(result) ? result : obj;
}

function P(n) { this.n = n; }
P.prototype.hi = function () { return 'hi ' + this.n; };
const x = myNew(P, 'x');
console.log(x.hi(), x instanceof P);                        // hi x true
function RetNull() { this.a = 1; return null; }
function RetArr() { this.a = 1; return [1]; }
console.log(myNew(RetNull).a, myNew(RetArr));                // 1 [ 1 ]
try { myNew(() => {}); } catch (e) { console.log(e.name); }  // TypeError (arrow: no prototype)
function Weird() { this.ok = true; }
Weird.prototype = 5;                                         // not an object
console.log(Object.getPrototypeOf(myNew(Weird)) === Object.prototype); // true (like real new)` },
        dry: { head: ['step', 'code', 'state after'], rows: [['1+2', 'Object.create(P.prototype)', 'obj = {} → P.prototype'], ['3', "P.apply(obj, ['x'])", "obj = { n: 'x' }, result = undefined"], ['4', 'isObj(undefined)?', H.c('g', 'false → return obj')], ['use', 'x.hi()', "'hi x' (found on P.prototype)"]] },
        complexity: `<p>O(1) overhead plus the cost of running the constructor.</p>`,
        followUps: ['Support classes: why does <code>Ctor.apply(obj)</code> throw for a <code>class</code>, and how does <code>Reflect.construct(Ctor, args)</code> solve it?', 'Set <code>new.target</code> correctly inside the constructor — possible without <code>Reflect.construct</code>?', 'Implement <code>myNew</code> for a constructor that is a bound function.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 5 — ES6 classes and what they desugar to
     ====================================================================== */
  topics.push({
    title: 'ES6 Classes: Syntax, Fields, Getters — and What They Desugar To',
    analogy: `<p>A restaurant redesigns its <b>menu card</b>: nicer layout, clear sections, photos. The <b>kitchen behind it is the same kitchen</b> — same cooks, same recipes. But the new menu also adds a few <b>house rules</b>: "no walk-ins without a reservation" (you must use <code>new</code>), "kitchen is a strict no-mess zone" (strict mode), and "secret recipes stay in the safe" (<code>#private</code>).</p>
<p>ES6 <code>class</code> is that new menu. Underneath it is still a <b>function</b> plus a <b>prototype object</b> — the kitchen from the previous topics — with a handful of extra rules you must know for interviews.</p>`,
    explain: `<p>A <code>class</code> declaration creates a <b>constructor function</b> and fills its <code>prototype</code> with your methods. <code>typeof User</code> is <code>'function'</code>.</p>
<h4>The pieces of a class</h4>
${H.table(['Syntax', 'Where it ends up', 'Notes'], [
  ['<code>constructor(name) { this.name = name; }</code>', 'The body of the function <code>User</code>', 'Optional; default is empty (or <code>super(...args)</code> in a subclass)'],
  ['<code>greet() { … }</code>', '<code>User.prototype.greet</code>', H.c('b', 'non-enumerable') + ', shared, strict'],
  ['<code>get upper() { … }</code> / <code>set upper(v)</code>', 'Accessor on <code>User.prototype</code>', 'Read like a property: <code>u.upper</code>'],
  ['<code>role = \'guest\';</code> (public field)', 'Own property on <b>each instance</b>', 'Created when the constructor starts (after <code>super()</code> in subclasses)'],
  ['<code>onClick = () =&gt; this.name;</code>', 'Own property on each instance (a new arrow per object)', '<code>this</code> is permanently the instance — great for callbacks'],
  ['<code>static create() { … }</code>', '<code>User.create</code> (on the function)', 'Called on the class, not on instances'],
  ['<code>#secret</code>, <code>#helper()</code>', 'Hidden private slots (not properties at all)', 'Covered in the private-fields topic'],
  ['<code>[Symbol.iterator]() { … }</code>', 'Computed method name on the prototype', 'Makes instances iterable']
])}
<h4>"Just syntactic sugar"? Mostly — with 8 real differences</h4>
${H.table(['#', 'class', 'old function + prototype'], [
  ['1', 'Calling without <code>new</code> → ' + H.c('r', 'TypeError'), 'Runs as a normal function (bug-prone)'],
  ['2', 'Whole body is <b>strict mode</b>', 'Sloppy unless you opt in'],
  ['3', 'Methods are <b>non-enumerable</b>', 'Assigned methods are enumerable (show in <code>for...in</code>)'],
  ['4', 'Declaration is hoisted but in the <b>TDZ</b> → ReferenceError before the line', 'Function declarations are fully hoisted'],
  ['5', 'Methods are not constructors (no <code>prototype</code>)', 'Every <code>function</code> can be <code>new</code>-ed'],
  ['6', '<code>User.prototype</code> is read-only; class name is <code>const</code> inside the body', 'Both reassignable'],
  ['7', 'Fields use <b>define</b> semantics (do not trigger inherited setters)', 'Assignments in the constructor do trigger setters'],
  ['8', '<code>extends</code> links statics, supports built-ins, enforces <code>super()</code>; <code>#private</code>', 'Manual, partial, or impossible']
])}
<h4>Class fields vs methods — the most practical decision</h4>
<ul>
<li><b>Method</b> <code>greet() {}</code>: one shared function on the prototype. Cheap. But <code>this</code> is decided at call time, so <code>button.onclick = user.greet</code> loses <code>this</code>.</li>
<li><b>Arrow field</b> <code>greet = () =&gt; {}</code>: one function <b>per instance</b>, with <code>this</code> locked to that instance. Safe to pass around as a callback. Costs memory and cannot be reached with <code>super.greet()</code> from a subclass (it is not on the prototype).</li>
</ul>
<h4>Class expressions</h4>
<p>Classes are values: <code>const Shape = class { … }</code>, or passed to and returned from functions (<code>const Mixed = withLogging(class extends Base {})</code>). A named class expression's name is visible only inside its own body.</p>`,
    clues: [
      '"Is class just syntactic sugar?" → mostly, then list the real differences (new-only, strict, non-enumerable methods, TDZ, fields semantics, super/home object, private).',
      '"Convert this class to ES5" / "what does the transpiler output?" → constructor function + <code>defineProperty</code> on the prototype.',
      '"Why is <code>this</code> undefined when I pass <code>obj.method</code> as a callback?" → method on prototype; use an arrow field or <code>bind</code>.',
      '"<code>ReferenceError: Cannot access \'X\' before initialization</code>" with a class → TDZ; classes are not usable before their line.',
      '"Getter/setter", "computed property", "validation on assignment" → accessor pairs on the prototype.',
      '"Why does <code>for...in</code> not show my class methods?" → class methods are non-enumerable.'
    ],
    code: [{ lang: 'js', run: true, title: 'A modern class, and proof it is a function + prototype (runnable)', code: `class User {
  role = 'guest';                          // public field: own property per instance
  onClick = () => 'clicked by ' + this.name; // arrow field: this locked to the instance

  constructor(name) {
    this.name = name;
  }
  greet() {                                 // goes on User.prototype
    return 'Hi ' + this.name;
  }
  get upper() {                             // accessor on User.prototype
    return this.name.toUpperCase();
  }
  set upper(v) {
    this.name = String(v).toLowerCase();
  }
  static create(n) {                        // on User itself
    return new User(n);
  }
}

const u = User.create('asha');
console.log(typeof User);                               // function
console.log(Object.getPrototypeOf(u) === User.prototype); // true
console.log(Object.keys(u));                            // [ 'role', 'onClick', 'name' ]
console.log(Object.getOwnPropertyNames(User.prototype)); // [ 'constructor', 'greet', 'upper' ]
console.log(Object.keys(User.prototype));               // [] — methods are non-enumerable
console.log(u.greet(), u.upper);                        // Hi asha ASHA
u.upper = 'BEN';
console.log(u.name);                                    // ben

const detached = u.greet;                               // method loses 'this'
try { detached(); } catch (e) { console.log('TypeError:', e.message.includes('undefined')); } // TypeError: true
const cb = u.onClick;                                   // arrow field keeps 'this'
console.log(cb());                                      // clicked by ben
try { User('x'); } catch (e) { console.log(e.message); } // Class constructor User cannot be invoked without 'new'
` }],
    codeTitle: ['Class anatomy'],
    viz: {
      title: 'Class vs its desugared ES5 twin, side by side',
      gen: function () {
        var CLS = [
          'class User {',
          "  role = 'guest';",
          '  onClick = () => this.name;',
          '  constructor(name) {',
          '    this.name = name;',
          '  }',
          '  greet() {',
          "    return 'Hi ' + this.name;",
          '  }',
          '  get upper() { return this.name.toUpperCase(); }',
          '  static create(n) { return new User(n); }',
          '}'
        ].join('\n');
        var ES5 = [
          "'use strict';",
          'function User(name) {',
          "  if (!new.target) throw new TypeError(\"Class constructor User cannot be invoked without 'new'\");",
          "  Object.defineProperty(this, 'role', { value: 'guest', writable: true, enumerable: true, configurable: true });",
          "  Object.defineProperty(this, 'onClick', { value: () => this.name, writable: true, enumerable: true, configurable: true });",
          '  this.name = name;',
          '}',
          "Object.defineProperty(User.prototype, 'greet', {",
          "  value: function () { return 'Hi ' + this.name; },",
          '  writable: true, enumerable: false, configurable: true });',
          "Object.defineProperty(User.prototype, 'upper', {",
          '  get: function () { return this.name.toUpperCase(); }, enumerable: false, configurable: true });',
          "Object.defineProperty(User, 'create', {",
          '  value: function (n) { return new User(n); }, writable: true, enumerable: false, configurable: true });',
          "Object.defineProperty(User, 'prototype', { writable: false });"
        ].join('\n');
        function fr(narr, a, b, extra) {
          var ha = {}, hb = {};
          a.forEach(function (n) { ha[n] = 'cur'; });
          b.forEach(function (n) { hb[n] = 'ok'; });
          return { narr: narr, parts: [{ type: 'code', label: 'What you write (ES2022 class)', lang: 'js', code: CLS, hl: ha }, { type: 'code', label: 'Roughly what it means (hand-desugared ES5+)', lang: 'js', code: ES5, hl: hb }].concat(extra || []) };
        }
        return [
          fr('<code>class User { … }</code> creates a <b>function</b> called User. The entire class body runs in <b>strict mode</b> automatically.', [1, 12], [1, 2, 7]),
          fr('Classes refuse to be called without <code>new</code>. The real engine marks the function as a class constructor; our twin imitates it with a <code>new.target</code> check.', [1], [3], [note('This is difference #1: <code>User()</code> → TypeError instead of silently polluting globals.')]),
          fr('A <b>public field</b> becomes an <b>own, enumerable</b> property on every instance, created with <b>define</b> semantics (like <code>Object.defineProperty</code>) right when construction starts — before the constructor body\'s own code.', [2], [4]),
          fr('An <b>arrow-function field</b> is also per-instance. Because arrows capture <code>this</code> from where they are created — the constructor — <code>this</code> is locked to the instance forever. One new function object <b>per instance</b>.', [3], [5], [{ type: 'map', label: 'Own properties of new User(\'asha\')', entries: [['role', "'guest'"], ['onClick', 'ƒ (arrow, own)'], ['name', "'asha'"]], hl: { onClick: 'cur' } }]),
          fr('The <code>constructor</code> body becomes the body of the function. (Field initialisers run first, then these lines.)', [4, 5, 6], [6]),
          fr('A method goes onto <code>User.prototype</code> — shared by every instance — and is <b>non-enumerable</b>, so it never shows in <code>for...in</code> or <code>Object.keys</code>. (Real class methods also have no <code>prototype</code> and cannot be <code>new</code>-ed; a <code>function</code> expression can — a tiny imperfection in our twin.)', [7, 8, 9], [8, 9, 10], [{ type: 'map', label: 'User.prototype (all non-enumerable)', entries: [['constructor', 'User'], ['greet', 'ƒ'], ['upper', 'get']], hl: { greet: 'ok' } }]),
          fr('A getter becomes an <b>accessor property</b> on the prototype. <code>u.upper</code> looks like a field read, but runs the function with <code>this = u</code>.', [10], [11, 12]),
          fr('<code>static</code> members go on the <b>function object itself</b>, not on the prototype. So <code>User.create(\'x\')</code> works but <code>u.create</code> is <code>undefined</code>.', [11], [13, 14], [{ type: 'map', label: 'Own properties of User (the function)', entries: [['length', '1'], ['name', "'User'"], ['prototype', 'User.prototype (read-only)'], ['create', 'ƒ static']], hl: { create: 'ok', prototype: 'sel' } }]),
          fr('Finally, a class\'s <code>prototype</code> property is <b>non-writable</b>: <code>User.prototype = {}</code> silently fails (or throws in strict code). Classes protect the triangle you learned about.', [1], [15]),
          fr('Summary: the <b>shape in memory is identical</b> to the old pattern (function + prototype + chain). The class adds safety rules. Things the twin <b>cannot</b> express: <code>#private</code> fields, <code>super</code> (needs [[HomeObject]]), and real subclassing of built-ins.', [], [], [{ type: 'table', label: 'Not just sugar', columns: ['Feature', 'class', 'ES5 twin'], rows: [['new required', 'yes', 'manual check'], ['strict', 'always', 'opt-in'], ['methods enumerable', 'no', 'only via defineProperty'], ['TDZ', 'yes', 'no (hoisted)'], ['#private', 'yes', 'WeakMap emulation'], ['super.x()', 'yes', 'manual Parent.prototype.x.call(this)']], hl: { 4: 'sel', 5: 'sel' } }])
        ];
      }
    },
    examples: [
      { title: 'Predict: classes are in the TDZ before their line', html: `<p>Function declarations are hoisted <b>with</b> their value; class declarations are hoisted <b>without</b> one (like <code>let</code>), so touching the class before its line throws a <code>ReferenceError</code>.</p>
${H.table(['Code', 'Result'], [['<code>new F()</code> before <code>function F(){}</code>', H.c('g', 'works')], ['<code>new C()</code> before <code>class C {}</code>', H.c('r', 'ReferenceError: Cannot access \'C\' before initialization')]])}`, code: { lang: 'js', run: true, code: `console.log(typeof new F());          // object — function F is fully hoisted
function F() {}

try { new C(); }
catch (e) { console.log(e.name + ': ' + e.message); }  // ReferenceError: Cannot access 'C' before initialization
class C {}
console.log(typeof new C());          // object — fine after the line` } },
      { title: 'Predict: method vs arrow field as a callback', html: `<p>Passing <code>timer.tick</code> detaches the method from its object; inside, <code>this</code> is <code>undefined</code> (class bodies are strict). The arrow field version keeps working. Use arrow fields (or <code>bind</code> in the constructor) for handlers you pass around; use normal methods otherwise — they are shared and overridable.</p>`, code: { lang: 'js', run: true, code: `class Timer {
  count = 0;
  tick() { this.count++; return this.count; }        // on prototype
  safeTick = () => { this.count++; return this.count; }; // own, this locked
}
const t = new Timer();
const run = (fn) => { try { return fn(); } catch (e) { return e.constructor.name; } };
console.log(run(t.tick));      // TypeError  (this is undefined)
console.log(run(t.safeTick));  // 1
console.log(run(t.tick.bind(t)));  // 2
console.log(Object.hasOwn(t, 'safeTick'), Object.hasOwn(t, 'tick')); // true false` } },
      { title: 'Getters, setters and computed names (iterable class)', html: `<p>Accessors let you validate or compute on access. A <b>computed</b> method name like <code>[Symbol.iterator]</code> makes instances work with <code>for...of</code> and spread.</p>`, code: { lang: 'js', run: true, code: `class Range {
  constructor(from, to) { this.from = from; this.to = to; }
  get size() { return Math.max(0, this.to - this.from + 1); }
  set size(n) {
    if (!Number.isInteger(n) || n < 0) throw new RangeError('size must be a non-negative integer');
    this.to = this.from + n - 1;
  }
  *[Symbol.iterator]() {                  // generator method with a computed (symbol) name
    for (let i = this.from; i <= this.to; i++) yield i;
  }
}
const r = new Range(3, 6);
console.log(r.size, [...r]);              // 4 [ 3, 4, 5, 6 ]
r.size = 2;
console.log([...r]);                      // [ 3, 4 ]
try { r.size = -1; } catch (e) { console.log(e.name); }  // RangeError` } },
      { title: 'Expert: fields use DEFINE semantics (inherited setters are skipped)', html: `<p>A class field is installed like <code>Object.defineProperty</code>, not like <code>this.x = …</code>. So a setter defined by the parent for the same name is <b>not called</b> — the field simply shadows it. (TypeScript's old <code>useDefineForClassFields: false</code> used assignment semantics, which is why upgrading TS target changed behaviour in some codebases.)</p>`, code: { lang: 'js', run: true, code: `class Base {
  set value(v) { console.log('Base setter called with', v); this._v = v; }
  get value() { return this._v; }
}
class WithField extends Base {
  value = 1;                       // define: creates own 'value', setter NOT called
}
class WithAssign extends Base {
  constructor() { super(); this.value = 1; }   // assignment: setter IS called
}
const a = new WithField();
console.log(Object.hasOwn(a, 'value'), a._v);  // true undefined
const b = new WithAssign();                    // prints: Base setter called with 1
console.log(Object.hasOwn(b, 'value'), b._v);  // false 1` } },
      { title: 'Class expressions and anonymous classes', html: `<p>Classes are values. A named class expression's name is only visible inside its own body (handy for recursion/static factories); the variable you assign it to is what the outside sees. Anonymous classes infer their <code>name</code> from the variable.</p>`, code: { lang: 'js', run: true, code: `const Shape = class Internal {
  clone() { return new Internal(); }       // 'Internal' visible inside
};
console.log(Shape.name, typeof Internal);  // Internal undefined
console.log(new Shape().clone() instanceof Shape); // true

const Anon = class {};
console.log(Anon.name);                    // Anon (inferred)
const makeTagged = (tag) => class { tag() { return tag; } };
console.log(new (makeTagged('blue'))().tag()); // blue` } }
    ],
    deepDive: `<p><b>ClassDefinitionEvaluation</b> (what the engine does when it reaches <code>class X {}</code>): (1) create a new declarative scope where the class name is bound as an immutable binding (that is why you cannot reassign <code>X</code> inside its own body); (2) evaluate the <code>extends</code> expression, if any; (3) create the prototype object (linked to the parent's prototype or <code>Object.prototype</code>); (4) create the constructor function <code>F</code> with <code>[[ConstructorKind]]</code> base/derived, marked as a class constructor so <code>[[Call]]</code> throws; (5) define each method with <code>DefineMethodProperty</code> — enumerable <b>false</b> — and set each method's <code>[[HomeObject]]</code> (needed for <code>super</code>); (6) collect field initialisers into <code>F.[[Fields]]</code>; (7) run <code>static</code> fields and <code>static {}</code> blocks in order; (8) initialise the outer binding (leaving the TDZ).</p>
<p><b>Field initialisation order.</b> For a base class: fields are initialised <b>at the start</b> of <code>[[Construct]]</code>, before the first line of the constructor. For a derived class: fields are initialised <b>immediately after <code>super()</code> returns</b>. Consequence: a parent constructor that calls an overridden method sees the child's fields as <code>undefined</code> (classic puzzle in the next topic). Field initialisers are evaluated with <code>this</code> = the instance, each in its own function-like scope, so they can reference earlier fields.</p>
<p><b>Performance reality.</b> Class methods and prototype methods compile to the same thing in V8. Fields are installed in declaration order which gives stable hidden classes. Arrow-function fields allocate a closure per instance — negligible for a few hundred UI components, measurable for millions of objects. Getters on hot paths are inlined by TurboFan when monomorphic. Transpiling classes to ES5 (old Babel "loose" mode) changes semantics: enumerable methods, assignment-based fields, no built-in subclassing — a source of bugs when targets were raised to ES2022.</p>
<p><b>Decorators.</b> The TC39 decorators proposal (Stage 3, implemented in TypeScript 5.0+ and Babel) adds <code>@logged method() {}</code> and the <code>accessor</code> keyword (auto getter/setter backed by a private slot). Frameworks such as Angular, NestJS, MobX and Lit lean on them. They operate on exactly the structures described above: methods on the prototype, fields per instance, static members on the constructor.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI generates classes fluently, so the human value moves to <b>choosing</b>: method vs arrow field, field vs constructor assignment, class vs plain object + functions. Interviewers probe whether you know the differences behind the sugar because that is what breaks after a refactor or a TS/Babel config change.</p>
<p><b>Use AI as a partner:</b> "<i>show me the Babel output for this class at target ES5 and ES2022 and explain each difference</i>"; "<i>which of these methods are passed as callbacks and need binding?</i>"; "<i>write tests proving my ES5 desugaring matches the class (enumerability, new-only, statics)</i>".</p>
<p><b>Where AI goes wrong:</b> turning every method into an arrow field "to be safe" (memory cost, breaks <code>super.method()</code> and prototype mocking in tests), assuming fields run after the constructor body, claiming classes are "just sugar" with no differences, or putting mutable defaults on the prototype in desugared code.</p>
<p><b>What you must still own:</b> the class → prototype mapping in your head, the 8 differences, field timing, and deciding where each member should live.</p>`,
    problems: [{
      title: 'Desugar a Class by Hand',
      level: 'Medium', tags: ['class', 'desugaring', 'defineProperty', 'ES5'], companies: ['Google', 'Microsoft', 'Razorpay'],
      statement: `<p>Rewrite this class <b>without</b> the <code>class</code> keyword so that its observable behaviour matches:</p>
<pre>class Counter {
  count = 0;
  constructor(step = 1) { this.step = step; }
  inc() { this.count += this.step; return this; }
  get double() { return this.count * 2; }
  static of(step) { return new Counter(step); }
}</pre>
<p>Required: calling <code>Counter2()</code> without <code>new</code> throws <code>TypeError</code>; <code>count</code> and <code>step</code> are own enumerable properties (in that order); <code>inc</code> and <code>double</code> are <b>non-enumerable</b> on the prototype; <code>of</code> is a non-enumerable static; the code runs in strict mode.</p>`,
      constraints: `No <code>class</code> keyword. Use only functions, <code>Object.defineProperty</code> and <code>new.target</code>.`,
      example: `<p><code>Counter2.of(5).inc().inc().double</code> → ${H.c('g', '20')}; <code>Object.keys(new Counter2())</code> → ${H.c('g', "[ 'count', 'step' ]")}; <code>Object.keys(Counter2.prototype)</code> → ${H.c('g', '[]')}; <code>Counter2()</code> → ${H.c('r', 'TypeError')}.</p>`,
      brute: {
        why: `<p>The "obvious" ES5 version assigns methods with <code>Counter2.prototype.inc = function…</code>. It works for calls, but the methods become <b>enumerable</b> (they appear in <code>for...in</code> over instances), calling without <code>new</code> silently runs, and the getter cannot be written by plain assignment at all.</p>`,
        code: { lang: 'js', run: true, code: `function CounterBrute(step) { this.count = 0; this.step = step === undefined ? 1 : step; }
CounterBrute.prototype.inc = function () { this.count += this.step; return this; };
const c = new CounterBrute(2);
const keys = [];
for (const k in c) keys.push(k);
console.log(keys);          // [ 'count', 'step', 'inc' ]  <- method leaks into for...in
console.log(typeof CounterBrute(1));  // undefined, no error — and window/global got polluted
delete globalThis.count; delete globalThis.step;` }
      },
      mcq: { q: 'Which statement about the desugared <code>count = 0</code> field is accurate?', options: ['It belongs on <code>Counter2.prototype</code>', 'It is created as an own property at the start of construction, before the constructor body', 'It is created after the constructor body finishes', 'It is a static property'], answer: 1, explain: 'For a base class, field initialisers run at the very beginning of [[Construct]], before the user-written constructor code. That is why <code>count</code> comes before <code>step</code> in <code>Object.keys</code>.' },
      hints: [
        `<p>Hint 1: start the function with <code>'use strict'</code> semantics (put the directive at the top of the snippet or inside the function) and a <code>new.target</code> guard that throws a <code>TypeError</code>.</p>`,
        `<p>Hint 2: fields first (<code>this.count = 0</code> — or <code>defineProperty</code> for exact define semantics), then the body (<code>this.step = step</code> with the default). Order matters for <code>Object.keys</code>.</p>`,
        `<p>Hint 3: install <code>inc</code> (value), <code>double</code> (get) on the prototype and <code>of</code> on the function with <code>Object.defineProperty</code>, <code>enumerable: false</code>, <code>configurable: true</code> (plus <code>writable: true</code> for methods). Optionally lock <code>prototype</code> with <code>writable: false</code>.</p>`
      ],
      solution: {
        approach: `<p>Follow ClassDefinitionEvaluation: a strict function body with a new-only guard, fields initialised first with define semantics, then the constructor code; methods and accessors defined as non-enumerable on the prototype; statics defined on the function; prototype made read-only. Verify with property introspection, not just by calling methods.</p>`,
        code: { lang: 'js', run: true, code: `'use strict';
function Counter2(step) {
  if (!new.target) throw new TypeError("Class constructor Counter2 cannot be invoked without 'new'");
  // 1) fields (define semantics), in declaration order
  Object.defineProperty(this, 'count', { value: 0, writable: true, enumerable: true, configurable: true });
  // 2) constructor body (default parameter emulated)
  this.step = step === undefined ? 1 : step;
}
const def = (target, key, desc) => Object.defineProperty(target, key, Object.assign({ enumerable: false, configurable: true }, desc));
def(Counter2.prototype, 'inc', { writable: true, value: function inc() { this.count += this.step; return this; } });
def(Counter2.prototype, 'double', { get: function () { return this.count * 2; } });
def(Counter2, 'of', { writable: true, value: function of(step) { return new Counter2(step); } });
Object.defineProperty(Counter2, 'prototype', { writable: false });

console.log(Counter2.of(5).inc().inc().double);         // 20
console.log(Object.keys(new Counter2()));              // [ 'count', 'step' ]
console.log(Object.keys(Counter2.prototype));          // []
console.log(Object.keys(Counter2));                    // []
try { Counter2(); } catch (e) { console.log(e.name); } // TypeError

// compare with the real class
class Counter { count = 0; constructor(step = 1) { this.step = step; } inc() { this.count += this.step; return this; } get double() { return this.count * 2; } static of(s) { return new Counter(s); } }
console.log(Counter.of(5).inc().inc().double, Object.keys(new Counter()));  // 20 [ 'count', 'step' ]` },
        dry: { head: ['class member', 'desugared to', 'enumerable?'], rows: [['count = 0', 'defineProperty(this, count) at construction start', 'yes (own)'], ['constructor(step = 1)', 'function body + default emulation', '—'], ['inc()', 'defineProperty(Counter2.prototype, inc)', H.c('b', 'no')], ['get double()', 'accessor on Counter2.prototype', H.c('b', 'no')], ['static of()', 'defineProperty(Counter2, of)', H.c('b', 'no')]] },
        complexity: `<p>O(1) setup per member; instance creation O(number of fields).</p>`,
        followUps: ['What part of a class can you <b>not</b> desugar faithfully? (methods without <code>[[Construct]]</code>, <code>super</code> via [[HomeObject]], <code>#private</code>, TDZ.)', 'Desugar <code>class B extends A</code> as well — including statics.', 'Emulate <code>#count</code> with a WeakMap and explain the GC behaviour.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 6 — extends and super: two chains, construction order, super lookups
     ====================================================================== */
  function twoChains(hl, ehl, tags) {
    return {
      type: 'graph', label: 'Two parallel chains created by "class Dog extends Animal"', directed: true, height: 64,
      nodes: [
        { id: 'd', label: 'd (instance)', x: 82, y: 56, shape: 'box' },
        { id: 'DP', label: 'Dog.prototype', x: 70, y: 32, shape: 'box' },
        { id: 'AP', label: 'Animal.prototype', x: 70, y: 8, shape: 'box' },
        { id: 'D', label: 'Dog', x: 22, y: 32, shape: 'box' },
        { id: 'A', label: 'Animal', x: 22, y: 8, shape: 'box' },
        { id: 'FP', label: 'Function.prototype', x: 22, y: 56, shape: 'box' }
      ],
      edges: [['d', 'DP', '__proto__'], ['DP', 'AP', '__proto__'], ['D', 'A', '__proto__'], ['A', 'FP', '__proto__'], ['D', 'DP', 'prototype'], ['A', 'AP', 'prototype']],
      hl: hl || {}, ehl: ehl || {}, tags: tags || {}
    };
  }

  topics.push({
    title: 'extends and super: Two Chains, Construction Order, super.method()',
    analogy: `<p>A daughter opens a new branch of her mother's bakery. Two rules apply:</p>
<ul>
<li><b>The building must exist before you decorate it.</b> Mom's company registers the shop and builds the basic store (<code>super()</code>). Only <i>then</i> can the daughter put up her own shelves (<code>this.x = …</code>). Trying to hang shelves first is impossible — there is no shop yet.</li>
<li><b>"Do it Mom's way, plus my twist."</b> For the birthday cake, the daughter follows Mom's recipe (<code>super.bake()</code>) and then adds her own frosting.</li>
</ul>
<p>Also, the branch inherits two separate things: Mom's <b>recipes</b> (instance methods via the prototype chain) and Mom's <b>company-level policies</b> (static methods via the constructor chain).</p>`,
    explain: `<p><code>class Dog extends Animal</code> does two linking jobs at once:</p>
${H.table(['Chain', 'Link created', 'Gives you'], [
  ['Instance chain', '<code>Object.getPrototypeOf(Dog.prototype) === Animal.prototype</code>', 'dogs can call Animal\'s <b>instance methods</b>'],
  ['Constructor chain', '<code>Object.getPrototypeOf(Dog) === Animal</code>', 'Dog inherits Animal\'s <b>static</b> methods (<code>Dog.create()</code>)']
])}
<h4>Rule 1: <code>super()</code> before <code>this</code></h4>
<p>In a <b>derived</b> class (one that <code>extends</code>), the object is created <b>by the parent</b>, inside <code>super()</code>. Until <code>super()</code> returns, <code>this</code> is uninitialised (it is in a TDZ). Touching it throws <code>ReferenceError: Must call super constructor in derived class before accessing 'this'</code>. Leaving a derived constructor without calling <code>super()</code> (and without returning an object) throws too.</p>
<p>If you do not write a constructor, you get this one for free: <code>constructor(...args) { super(...args); }</code>.</p>
<h4>Rule 2: the construction order</h4>
${H.table(['#', 'What runs for new Dog(\'Rex\')'], [
  ['1', 'Dog\'s constructor starts — <code>this</code> not available yet'],
  ['2', '<code>super(\'Rex\')</code> → Animal\'s constructor runs; the object is created here, linked to <b>Dog.prototype</b> (via <code>new.target</code>)'],
  ['3', 'Animal\'s <b>fields</b> are initialised, then Animal\'s constructor body runs'],
  ['4', 'Back in Dog: <code>super()</code> returns, <code>this</code> is bound, then Dog\'s <b>fields</b> are initialised'],
  ['5', 'The rest of Dog\'s constructor body runs']
])}
<p>Consequence (a favourite trick question): if Animal's constructor calls a method that Dog overrides, the Dog version runs <b>before Dog's fields exist</b>, so it sees them as <code>undefined</code>.</p>
<h4>Rule 3: <code>super.method()</code></h4>
<p>Inside a method, <code>super.speak()</code> means: "look up <code>speak</code> starting from the <b>parent's prototype</b>, and call it with the <b>current</b> <code>this</code>". It is how you extend instead of replace. In static methods, <code>super.create()</code> looks on the parent class. The lookup starts from the object where the method was <b>defined</b> (its <code>[[HomeObject]]</code>), not from <code>this</code> — which is what makes multi-level <code>super</code> chains work correctly.</p>
<h4>What can you extend?</h4>
<ul>
<li>Other classes, and old-style constructor functions (<code>class X extends SomeES5Function</code>).</li>
<li>Built-ins: <code>Array</code>, <code>Error</code>, <code>Map</code>, <code>Promise</code>, <code>HTMLElement</code> (custom elements) — works properly because the parent creates the exotic object.</li>
<li>Any expression that evaluates to a constructor: <code>class X extends mixin(Base) {}</code>, or <code>extends null</code> (rare).</li>
</ul>`,
    clues: [
      '"<code>ReferenceError: Must call super constructor…</code>" or "can I use <code>this</code> before <code>super()</code>?" → derived constructors get their object from the parent.',
      '"Parent constructor calls an overridden method; why is the child field undefined?" → fields of the child initialise after <code>super()</code> returns.',
      '"Call the parent\'s version of a method" / "extend, don\'t replace" → <code>super.method(...)</code>.',
      '"Are static methods inherited?" → yes, via <code>Object.getPrototypeOf(Child) === Parent</code>; <code>this</code> in a static is the class it was called on.',
      '"Custom error class", "subclass Array/Map", "custom HTML element" → <code>extends</code> built-ins (+ <code>Symbol.species</code>).',
      '"Multiple inheritance in JS?" → no; use mixins (<code>Base =&gt; class extends Base {}</code>) or composition.'
    ],
    code: [{ lang: 'js', run: true, title: 'extends, super(), super.method() and inherited statics (runnable)', code: `class Animal {
  constructor(name) {
    this.name = name;
  }
  speak() {
    return this.name + ' makes a sound';
  }
  static create(name) {
    return new this(name);        // 'this' = the class it was called on
  }
}

class Dog extends Animal {
  constructor(name, breed) {
    super(name);                  // MUST come before using 'this'
    this.breed = breed;
  }
  speak() {
    return super.speak() + ' — woof!';   // parent's version + our twist
  }
}

const d = new Dog('Rex', 'lab');
console.log(d.speak());                         // Rex makes a sound — woof!
console.log(Object.getPrototypeOf(Dog.prototype) === Animal.prototype); // true (instance chain)
console.log(Object.getPrototypeOf(Dog) === Animal);                     // true (static chain)
const d2 = Dog.create('Fido');                  // static inherited; new this -> new Dog
console.log(d2 instanceof Dog, d2.speak());     // true Fido makes a sound — woof!
console.log(d instanceof Animal, Object.keys(d)); // true [ 'name', 'breed' ]
` }],
    codeTitle: ['extends and super'],
    viz: [{
      title: 'new Dog(\'Rex\'): who builds the object, and when fields appear',
      gen: function () {
        var code = [
          'class Animal {',
          '  alive = true;',
          '  constructor(name) {',
          '    this.name = name;',
          '  }',
          '}',
          'class Dog extends Animal {',
          '  legs = 4;',
          '  constructor(name) {',
          '    // this.x = 1;  <- here would throw ReferenceError',
          '    super(name);',
          "    this.sound = 'woof';",
          '  }',
          '}',
          "const d = new Dog('Rex');"
        ].join('\n');
        function own(entries, k) { return { type: 'map', label: 'Own properties of the new object (in creation order)', entries: entries, hl: k ? one(k, 'ok') : {} }; }
        return codeFrames(code, [
          { l: 15, narr: "<code>new Dog('Rex')</code>. <code>new.target</code> = <b>Dog</b>. Dog is a <b>derived</b> class, so unlike a base class it does <b>not</b> create the object itself.", st: ['global', 'Dog constructor'], v: { 'new.target': 'Dog', 'this': '<uninitialised>' }, hv: { 'this': 'bad' } },
          { l: 10, cls: 'bad', narr: 'At this point <code>this</code> is in a <b>temporal dead zone</b>. Any use of <code>this</code> (or returning without calling super) → <span class="c-r">ReferenceError: Must call super constructor in derived class before accessing \'this\'</span>.', st: ['global', 'Dog constructor'], v: { 'this': '<uninitialised>' }, hv: { 'this': 'bad' } },
          { l: 11, narr: '<code>super(name)</code> calls Animal\'s constructor, passing <code>new.target</code> = Dog along.', st: ['global', 'Dog constructor', 'Animal constructor'], v: { 'new.target': 'Dog', name: "'Rex'" } },
          { l: 3, narr: 'Animal is a <b>base</b> class, so it creates the object — linked to <b>new.target.prototype</b> = <b>Dog.prototype</b> (not Animal.prototype!). That is why the result is a Dog.', st: ['global', 'Dog constructor', 'Animal constructor'], v: { 'this': '{} → Dog.prototype' }, hv: { 'this': 'ok' }, extra: [own([])] },
          { l: 2, narr: 'Base-class <b>fields</b> are initialised first thing: <code>alive = true</code>.', st: ['global', 'Dog constructor', 'Animal constructor'], v: { 'this': '{ alive }' }, extra: [own([['alive', 'true']], 'alive')] },
          { l: 4, narr: 'Then Animal\'s constructor body: <code>this.name = name</code>.', st: ['global', 'Dog constructor', 'Animal constructor'], v: { 'this': '{ alive, name }' }, extra: [own([['alive', 'true'], ['name', "'Rex'"]], 'name')] },
          { l: 11, narr: '<code>super()</code> returns the object. Now Dog\'s <code>this</code> is <b>bound</b> to it — and <b>immediately</b> Dog\'s own fields are initialised.', st: ['global', 'Dog constructor'], v: { 'this': '{ alive, name } (now usable)' }, hv: { 'this': 'ok' }, extra: [own([['alive', 'true'], ['name', "'Rex'"]])] },
          { l: 8, narr: 'Dog\'s field <code>legs = 4</code> is added right after super() returned.', st: ['global', 'Dog constructor'], v: { 'this': '{ alive, name, legs }' }, extra: [own([['alive', 'true'], ['name', "'Rex'"], ['legs', '4']], 'legs')] },
          { l: 12, narr: 'The rest of Dog\'s constructor body runs: <code>this.sound = \'woof\'</code>.', st: ['global', 'Dog constructor'], v: { 'this': '{ alive, name, legs, sound }' }, extra: [own([['alive', 'true'], ['name', "'Rex'"], ['legs', '4'], ['sound', "'woof'"]], 'sound')] },
          { l: 15, narr: 'Done. Order of own keys: <b>alive, name, legs, sound</b> = parent fields → parent body → child fields → child body. The object sits at the bottom of the instance chain.', st: ['global'], v: { d: "Dog { alive: true, name: 'Rex', legs: 4, sound: 'woof' }" }, hv: { d: 'sel' }, extra: [twoChains({ d: 'sel', DP: 'ok', AP: 'ok' }, { 'd-DP': 'ok', 'DP-AP': 'ok' })] }
        ]);
      }
    }, {
      title: 'How super.speak() and Dog.create() are looked up',
      gen: function () {
        var code = [
          'class Animal {',
          "  speak() { return this.name + ' makes a sound'; }",
          '  static create(n) { return new this(n); }',
          '}',
          'class Dog extends Animal {',
          '  constructor(n) { super(); this.name = n; }',
          "  speak() { return super.speak() + ' — woof'; }",
          '}',
          "const d = new Dog('Rex');",
          'd.speak();',
          "Dog.create('Fido');"
        ].join('\n');
        return codeFrames(code, [
          { l: 10, narr: '<code>d.speak()</code>: normal lookup. d has no own <code>speak</code> → climb to <b>Dog.prototype</b> → found. Call it with <code>this = d</code>.', extra: [twoChains({ d: 'cur', DP: 'ok' }, { 'd-DP': 'cur' }, { DP: 'speak found' })] },
          { l: 7, narr: 'Inside Dog\'s <code>speak</code>, we hit <code>super.speak()</code>. The engine uses the method\'s <b>[[HomeObject]]</b> — the object it was defined on, <b>Dog.prototype</b> — not <code>this</code>.', v: { '[[HomeObject]]': 'Dog.prototype', 'this': 'd' }, hv: { '[[HomeObject]]': 'sel' }, extra: [twoChains({ DP: 'sel' }, {}, { DP: 'HomeObject' })] },
          { l: 7, narr: '<code>super</code> = <code>Object.getPrototypeOf(HomeObject)</code> = <b>Animal.prototype</b>. Look up <code>speak</code> there → found.', v: { 'super base': 'Animal.prototype' }, hv: { 'super base': 'ok' }, extra: [twoChains({ DP: 'done', AP: 'ok' }, { 'DP-AP': 'ok' }, { AP: 'speak found' })] },
          { l: 2, narr: 'Animal\'s <code>speak</code> runs with <code>this</code> still = <b>d</b> (super calls keep the current this). It returns <code>\'Rex makes a sound\'</code>.', st: ['global', 'Dog#speak', 'Animal#speak'], v: { 'this': 'd', 'this.name': "'Rex'" }, extra: [twoChains({ d: 'cur', AP: 'ok' })] },
          { l: 7, narr: 'Back in Dog\'s speak: append the twist → <code>\'Rex makes a sound — woof\'</code>.', st: ['global', 'Dog#speak'], o: ['Rex makes a sound — woof'], extra: [twoChains({ d: 'sel' })] },
          { l: 11, narr: '<code>Dog.create(\'Fido\')</code>: Dog (the function) has no own <code>create</code>. Its <code>[[Prototype]]</code> is <b>Animal</b> (the constructor chain) → found there. Statics are inherited!', o: ['Rex makes a sound — woof'], extra: [twoChains({ D: 'cur', A: 'ok' }, { 'D-A': 'ok' }, { A: 'create found' })] },
          { l: 3, narr: '<code>create</code> runs with <code>this = Dog</code> (we called it on Dog), so <code>new this(n)</code> builds a <b>Dog</b>, not an Animal. This is why static factories should use <code>new this()</code>.', st: ['global', 'Animal.create (this = Dog)'], v: { 'this': 'Dog', result: "Dog { name: 'Fido' }" }, hv: { result: 'ok' }, o: ['Rex makes a sound — woof'], extra: [twoChains({ D: 'sel' })] }
        ]);
      }
    }],
    examples: [
      { title: 'Predict: this before super, and forgetting super', html: `<p>Both throw a <code>ReferenceError</code> when the constructor runs (not when the class is defined). The only way out of a derived constructor without calling <code>super()</code> is to <b>return an object</b> explicitly.</p>
${H.table(['Derived constructor', 'Result'], [['<code>this.x = 1; super();</code>', H.c('r', 'ReferenceError')], ['<code>{ /* no super */ }</code>', H.c('r', 'ReferenceError at the end')], ['<code>{ return { custom: true }; }</code>', H.c('y', 'allowed — returns that object (not a Child!)')]])}`, code: { lang: 'js', run: true, code: `class A { constructor() { this.a = 1; } }
class B1 extends A { constructor() { this.x = 1; super(); } }
class B2 extends A { constructor() { /* forgot super */ } }
class B3 extends A { constructor() { return { custom: true }; } }
for (const C of [B1, B2, B3]) {
  try { const o = new C(); console.log(C.name, 'ok', JSON.stringify(o), o instanceof C); }
  catch (e) { console.log(C.name, e.name); }
}
// B1 ReferenceError
// B2 ReferenceError
// B3 ok {"custom":true} false` } },
      { title: 'Predict (classic): overridden method called from the parent constructor', html: `<p>Animal's constructor calls <code>this.describe()</code>. Because <code>this</code> is a Dog, Dog's override runs — but Dog's field <code>sound</code> has <b>not been initialised yet</b> (child fields appear only after <code>super()</code> returns). Java has a similar trap. Rule: do not call overridable methods from constructors.</p>
${H.table(['Moment', 'this.sound'], [['during Animal constructor', H.c('r', 'undefined')], ['after new Dog() returns', H.c('g', "'woof'")]])}`, code: { lang: 'js', run: true, code: `class Animal {
  constructor() {
    this.log = 'created: ' + this.describe();   // calls the OVERRIDE
  }
  describe() { return 'animal'; }
}
class Dog extends Animal {
  sound = 'woof';                                // initialised AFTER super() returns
  describe() { return 'dog says ' + this.sound; }
}
const d = new Dog();
console.log(d.log);          // created: dog says undefined
console.log(d.describe());   // dog says woof` } },
      { title: 'Extending built-ins: Array and Error', html: `<p>Because the parent creates the object, subclasses of built-ins get the real exotic behaviour (array <code>length</code> magic, error stack traces). Array methods like <code>map</code>/<code>filter</code> even return your subclass, thanks to <code>Symbol.species</code>. For errors, set <code>name</code> and pass <code>cause</code> through.</p>`, code: { lang: 'js', run: true, code: `class Stack extends Array {
  peek() { return this[this.length - 1]; }
}
const s = Stack.from([1, 2, 3]);
s.push(4);
console.log(s.peek(), s.length, Array.isArray(s));    // 4 4 true
const doubled = s.map((x) => x * 2);
console.log(doubled instanceof Stack, doubled.peek()); // true 8 (Symbol.species)

class HttpError extends Error {
  constructor(status, message, options) {
    super(message, options);          // supports { cause }
    this.name = 'HttpError';
    this.status = status;
  }
}
try { throw new HttpError(404, 'Not found', { cause: 'missing id' }); }
catch (e) {
  console.log(e instanceof HttpError, e instanceof Error, e.name, e.status, e.cause);
  // true true HttpError 404 missing id
  console.log(String(e));             // HttpError: Not found
}` } },
      { title: 'Mixins with class expressions (pseudo multiple inheritance)', html: `<p>JS classes have exactly one parent. A <b>mixin</b> is a function that takes a base class and returns a new subclass with extra behaviour. Chaining them builds a linear chain — each mixin can still call <code>super</code>.</p>
${H.chips(['Duck.prototype', '→ Flying(...)', '→ Swimming(...)', '→ Animal.prototype'], { label: 'Resulting instance chain' })}`, code: { lang: 'js', run: true, code: `class Animal { describe() { return 'animal'; } }
const Swimming = (Base) => class extends Base {
  swim() { return 'swims'; }
  describe() { return super.describe() + ' + swimmer'; }
};
const Flying = (Base) => class extends Base {
  fly() { return 'flies'; }
  describe() { return super.describe() + ' + flyer'; }
};
class Duck extends Flying(Swimming(Animal)) {}
const duck = new Duck();
console.log(duck.swim(), duck.fly());   // swims flies
console.log(duck.describe());           // animal + swimmer + flyer
console.log(duck instanceof Animal);    // true` } },
      { title: 'Expert: super is bound to where the method was DEFINED', html: `<p><code>super</code> uses the method's <code>[[HomeObject]]</code>, fixed at definition time. If you copy such a method onto another object, <code>super</code> still points at the <b>original</b> parent. It also works in object literals with method shorthand.</p>`, code: { lang: 'js', run: true, code: `const animal = { hello() { return 'animal hello'; } };
const rabbit = {
  __proto__: animal,
  hello() { return super.hello() + ' (via rabbit)'; }   // HomeObject = rabbit
};
console.log(rabbit.hello());                              // animal hello (via rabbit)

const plant = { hello() { return 'plant hello'; } };
const tree = { __proto__: plant, hello: rabbit.hello };   // borrowed method
console.log(tree.hello());   // animal hello (via rabbit) — super did NOT become plant` } }
    ],
    deepDive: `<p><b>Base vs derived [[Construct]].</b> A class with <code>extends</code> has <code>[[ConstructorKind]] = derived</code>. Its <code>[[Construct]]</code> does <b>not</b> allocate; it creates a function environment with an <b>uninitialised</b> this binding. <code>super(...args)</code> evaluates <code>GetSuperConstructor()</code> (= <code>Object.getPrototypeOf(activeFunction)</code>, so it follows the <i>constructor chain</i>, not the name), calls <code>Construct(parent, args, newTarget)</code>, binds the returned object as <code>this</code> (calling <code>super()</code> twice throws — "Super constructor may only be called once"), and then runs <code>InitializeInstanceElements</code> to install the derived class's fields and private methods. The base constructor allocated the object via <code>OrdinaryCreateFromConstructor(newTarget, …)</code>, so the instance is linked to the <b>most-derived</b> prototype even though the base allocated it.</p>
<p><b>Why ES5 could not subclass Array.</b> <code>Array.call(this)</code> ignores <code>this</code> and returns a brand-new array, so the "instance" never gets array exotic behaviour (<code>length</code> tracking). Since ES2015 the exotic object is allocated by the base built-in with the right prototype — that is why <code>class X extends Array</code> works but transpiling it to ES5 does not (Babel needed <code>Reflect.construct</code> wrappers). <code>Symbol.species</code> lets methods like <code>map</code> decide which constructor to use for derived results; it is being discouraged for new built-ins because it complicates engines and has caused security bugs.</p>
<p><b>super property access.</b> <code>super.x</code> is <code>HomeObject.[[Prototype]].[[Get]]('x', this)</code>. In static methods the HomeObject is the class constructor, so <code>super.create()</code> reads from the parent class. <code>super.x = v</code> assigns <b>to this</b> (with the parent's setter if any) — rarely useful and often surprising. Arrow functions do not have their own <code>super</code>; they capture the enclosing method's, just like <code>this</code>.</p>
<p><b>Design reality.</b> Deep inheritance trees are brittle: the "fragile base class" problem (a change in a parent silently breaks children), the constructor-calls-override trap, and tight coupling. Modern JS/TS codebases favour <b>shallow</b> hierarchies (1–2 levels, often only for framework base classes like <code>HTMLElement</code>, <code>Error</code>, or React's legacy <code>Component</code>) and <b>composition</b> (objects that hold collaborators) for everything else. <code>extends null</code> is technically allowed but the default constructor then fails at <code>super()</code>; it is a curiosity, not a tool.</p>`,
    aiEra: `<p><b>What AI changes:</b> asking an assistant to "add a subclass" is instant; AI-generated hierarchies tend to grow <b>deep</b> and full of overridden methods called from constructors. Code review shifts toward questioning whether inheritance is right at all and catching init-order bugs that tests may miss.</p>
<p><b>Use AI as a partner:</b> "<i>list every method called from a constructor in this hierarchy and whether a subclass overrides it</i>"; "<i>rewrite this 4-level class tree with composition and show what changes for callers</i>"; "<i>generate predict-the-output puzzles about construction order with parent and child fields</i>".</p>
<p><b>Where AI goes wrong:</b> touching <code>this</code> before <code>super()</code> in generated constructors, forgetting to forward <code>options</code>/<code>cause</code> in custom errors, using <code>new Animal()</code> instead of <code>new this()</code> in static factories (breaking subclasses), and claiming static methods are not inherited.</p>
<p><b>What you must still own:</b> the two chains, the exact construction order, how <code>super</code> resolves through [[HomeObject]], and the judgement call between inheritance and composition.</p>`,
    problems: [{
      title: 'ES5 inherits(Child, Parent) with Static Inheritance',
      level: 'Medium', tags: ['inheritance', 'ES5', 'prototype chain', 'statics'], companies: ['Amazon', 'Atlassian', 'Freshworks'],
      statement: `<p>Implement <code>inherits(Child, Parent)</code> for constructor functions so that after calling it:</p>
<ol><li>instances of <code>Child</code> inherit <code>Parent.prototype</code> methods (and <code>instanceof Parent</code> is true),</li><li><code>Child.prototype.constructor === Child</code> and it is non-enumerable,</li><li>static methods of <code>Parent</code> are reachable on <code>Child</code> (like <code>class extends</code>),</li><li>methods already added to <code>Child.prototype</code> <b>before</b> the call are preserved.</li></ol>
<p>Also show how <code>Child</code> calls the parent constructor and a parent method ("super" calls) in ES5 style.</p>`,
      constraints: `No <code>class</code>. Must not run <code>Parent</code> during setup. Must not share one prototype object between Child and Parent.`,
      example: `<p>After <code>inherits(Dog, Animal)</code>: ${H.c('g', 'new Dog("Rex").eat() → "Rex eats"')}, ${H.c('g', 'Dog.create("Fido") instanceof Dog → true')} (static inherited, uses <code>new this</code>), ${H.c('g', 'Object.keys(Dog.prototype) → [ "bark" ]')}.</p>`,
      brute: {
        why: `<p><code>Child.prototype = new Parent()</code> runs the parent constructor at setup time (side effects, missing arguments) and stores its instance data on the shared prototype; it also wipes out methods already on <code>Child.prototype</code>, loses <code>constructor</code>, and does nothing for statics.</p>`,
        code: { lang: 'js', run: true, code: `function Animal(name) { this.name = name; this.friends = []; }
Animal.prototype.eat = function () { return this.name + ' eats'; };
Animal.create = function (n) { return new this(n); };
function Dog(name) { Animal.call(this, name); }
Dog.prototype.bark = function () { return 'woof'; };   // added before inheriting
Dog.prototype = new Animal();                          // brute: wipes bark, runs Animal
const d = new Dog('Rex');
console.log(typeof d.bark, d.constructor === Dog, typeof Dog.create); // undefined false undefined` }
      },
      mcq: { q: 'Which line makes <code>Dog.create()</code> work when <code>create</code> is a static on <code>Animal</code>?', options: ['<code>Dog.prototype = Object.create(Animal.prototype)</code>', '<code>Object.setPrototypeOf(Dog, Animal)</code>', '<code>Animal.call(Dog)</code>', '<code>Dog.prototype.constructor = Animal</code>'], answer: 1, explain: 'Statics live on the function object. Linking <code>Dog</code> (the function) to <code>Animal</code> makes the lookup <code>Dog.create</code> climb to <code>Animal.create</code> — the constructor chain that <code>class extends</code> creates.' },
      hints: [
        `<p>Hint 1: there are <b>two</b> links to make: <code>Child.prototype → Parent.prototype</code> (instance side) and <code>Child → Parent</code> (static side).</p>`,
        `<p>Hint 2: to keep methods already on <code>Child.prototype</code>, don't replace the object — re-link it: <code>Object.setPrototypeOf(Child.prototype, Parent.prototype)</code>. That also keeps the original non-enumerable <code>constructor</code>.</p>`,
        `<p>Hint 3: "super" in ES5: in the constructor <code>Parent.call(this, ...args)</code>; in methods <code>Parent.prototype.method.call(this, ...)</code>. Return <code>Child</code> for chaining; guard that both are functions.</p>`
      ],
      solution: {
        approach: `<p>Re-link instead of replace: <code>setPrototypeOf(Child.prototype, Parent.prototype)</code> keeps existing methods and the original non-enumerable <code>constructor</code>; <code>setPrototypeOf(Child, Parent)</code> wires statics exactly like <code>class extends</code>. (Setting prototypes during one-time setup is fine; avoid it on hot objects.) "super" calls are explicit <code>.call(this)</code>s.</p>`,
        code: { lang: 'js', run: true, code: `function inherits(Child, Parent) {
  if (typeof Child !== 'function' || typeof Parent !== 'function') throw new TypeError('inherits expects two functions');
  Object.setPrototypeOf(Child.prototype, Parent.prototype); // instance chain (keeps Child's methods + constructor)
  Object.setPrototypeOf(Child, Parent);                     // static chain
  return Child;
}

function Animal(name) { this.name = name; }
Animal.prototype.eat = function () { return this.name + ' eats'; };
Animal.prototype.describe = function () { return 'animal ' + this.name; };
Animal.create = function (n) { return new this(n); };       // static using new this

function Dog(name) {
  Animal.call(this, name);                                  // "super(name)"
}
Dog.prototype.bark = function () { return 'woof'; };        // added BEFORE inherits
inherits(Dog, Animal);
Dog.prototype.describe = function () {                      // override + "super.describe()"
  return Animal.prototype.describe.call(this) + ' (a dog)';
};

const d = new Dog('Rex');
console.log(d.eat(), '|', d.bark(), '|', d.describe());   // Rex eats | woof | animal Rex (a dog)
console.log(d instanceof Dog, d instanceof Animal);        // true true
console.log(d.constructor === Dog, Object.keys(Dog.prototype)); // true [ 'bark', 'describe' ]
const f = Dog.create('Fido');
console.log(f instanceof Dog, f.eat());                    // true Fido eats` },
        dry: { head: ['lookup', 'path', 'result'], rows: [['d.bark', 'd → Dog.prototype ✓', "'woof'"], ['d.eat', 'd → Dog.prototype → Animal.prototype ✓', "'Rex eats'"], ['Dog.create', 'Dog → Animal ✓ (static chain)', 'Animal.create with this = Dog'], ['new this(n)', 'new Dog(n)', H.c('g', 'instance of Dog')]] },
        complexity: `<p>O(1) setup. Lookups cost one extra hop per inheritance level (cached by inline caches in practice).</p>`,
        followUps: ['Why is <code>Object.create(Parent.prototype)</code> + restoring <code>constructor</code> the more common textbook version, and when does it lose methods?', 'Write a <code>callSuper(this, "method", ...args)</code> helper — why is it hard to do correctly for multi-level chains without [[HomeObject]]?', 'Compare with Node\'s deprecated <code>util.inherits</code>.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 7 — #private fields/methods and static members
     ====================================================================== */
  topics.push({
    title: 'Private #fields, Private Methods and static Members (incl. static blocks)',
    analogy: `<p>Think of a <b>bank branch</b>:</p>
<ul>
<li>The <b>counter</b> is public — anyone can walk up and call <code>deposit()</code>.</li>
<li>The <b>vault</b> (<code>#balance</code>) can only be opened by staff trained <b>by this exact bank</b>. Customers cannot, other banks cannot, and even a <i>franchise</i> of this bank (a subclass) cannot use the vault key by name — it has to ask through the counter.</li>
<li>The <b>head-office notice board</b> (<code>static</code>) belongs to the bank as a whole, not to any customer: "total accounts opened: 1,204", "bank name: JS Bank".</li>
</ul>`,
    explain: `<h4>1. Private fields: <code>#name</code></h4>
<p>A name starting with <code>#</code> declared in a class body creates a <b>private slot</b> on every instance. It can only be written as <code>this.#name</code> (or <code>other.#name</code>) <b>inside that class body</b>. Anywhere else, <code>obj.#name</code> is a <b>SyntaxError</b> — the file will not even parse. It is real, engine-enforced privacy, not a naming convention.</p>
${H.table(['Question', '#private', '_underscore', 'TypeScript private', 'closure / WeakMap'], [
  ['Hidden from outside code?', H.c('g', 'yes, enforced'), H.c('r', 'no, convention'), H.c('y', 'compile-time only'), H.c('g', 'yes')],
  ['Shows in Object.keys / JSON / spread?', H.c('g', 'never'), H.c('r', 'yes'), H.c('r', 'yes (it is a normal property at runtime)'), H.c('g', 'no')],
  ['Methods shared on prototype?', H.c('g', 'yes'), H.c('g', 'yes'), H.c('g', 'yes'), 'closure: no / WeakMap: yes'],
  ['Subclass can use it by name?', H.c('r', 'no'), 'yes', 'no (protected: yes)', 'depends']
])}
<h4>2. Private methods and accessors</h4>
<p><code>#validate(x) { … }</code>, <code>get #secret()</code> — helpers that are not part of the public API. Unlike fields they are not copied per instance; the engine just marks each instance as allowed to call them.</p>
<h4>3. Rules that come up in interviews</h4>
<ul>
<li>Privacy is per <b>class</b>, not per object: a method can read <code>other.#balance</code> of another instance of the same class (great for <code>equals</code>/<code>compareTo</code>).</li>
<li>Reading <code>obj.#x</code> when <code>obj</code> was not constructed by this class throws <code>TypeError</code>. The safe test is the <b>brand check</b> <code>#x in obj</code> (ES2022) → true/false.</li>
<li>Private names are not properties: no <code>obj['#x']</code>, no <code>Reflect.ownKeys</code>, invisible to <code>Proxy</code> traps (and a Proxy around an instance breaks <code>this.#x</code>).</li>
<li>A subclass instance <b>does</b> carry the parent's private slots (the parent's constructor adds them), but subclass <b>code</b> cannot name them.</li>
</ul>
<h4>4. static members</h4>
<p><code>static</code> puts a field or method on the <b>class itself</b> (the constructor function), not on instances. Typical uses: factories (<code>User.fromJSON</code>), counters/registries, constants, caches, utilities. Inside a static method, <code>this</code> is the class the method was <b>called on</b> — which might be a subclass. Statics are inherited through the constructor chain.</p>
<p><b>Static blocks</b> (<code>static { … }</code>, ES2022) run once when the class is defined — useful for multi-step setup, try/catch around initialisation, or sharing private access with a helper declared outside.</p>
<p><b>Static private</b> (<code>static #count</code>) is a private slot on the class object only. Gotcha: inside a static method called as <code>Child.method()</code>, <code>this.#count</code> throws (Child does not have the slot) — write <code>Parent.#count</code> instead.</p>`,
    clues: [
      '"Make the balance impossible to change from outside" / "truly private state" → <code>#field</code> (or closure/WeakMap in older code).',
      '"What is the difference between TypeScript <code>private</code> and <code>#private</code>?" → compile-time check vs runtime-enforced slot.',
      '"Check if an object is a genuine instance (cannot be faked by setting the prototype)" → brand check <code>#x in obj</code>.',
      '"Count how many instances were created", "factory method", "singleton", "registry" → <code>static</code> fields/methods.',
      '"Run complex initialisation once when the class is defined" → <code>static { }</code> block.',
      '"Why does my subclass get <code>TypeError: Cannot read private member</code>?" → static private via <code>this</code>, or Proxy-wrapped instance.'
    ],
    code: [{ lang: 'js', run: true, title: 'Private state, private helper, brand check and statics (runnable)', code: `class Account {
  static #count = 0;                // private, on the class
  static bank = 'JS Bank';          // public static field
  #balance = 0;                     // private, one slot per instance
  #history = [];

  static {                          // static block: runs once at class definition
    Account.createdAt = 'class ready';
  }

  constructor(owner) {
    this.owner = owner;             // public
    Account.#count++;
  }
  deposit(amount) {
    this.#check(amount);
    this.#balance += amount;
    this.#history.push('+' + amount);
    return this;
  }
  get balance() { return this.#balance; }        // read-only view
  #check(amount) {                                // private method
    if (!(amount > 0)) throw new RangeError('amount must be positive');
  }
  hasMoreThan(other) { return this.#balance > other.#balance; } // same class -> allowed
  static isAccount(obj) { return #balance in obj; }            // brand check
  static get count() { return Account.#count; }
}

const a = new Account('Asha').deposit(50);
const b = new Account('Ben').deposit(20);
console.log(a.balance, a.hasMoreThan(b));        // 50 true
console.log(Object.keys(a), JSON.stringify(a));  // [ 'owner' ] {"owner":"Asha"}
a.balance = 1e9;                                 // no setter: ignored (sloppy script)
console.log(a.balance);                          // 50
try { a.deposit(-5); } catch (e) { console.log(e.name); }   // RangeError
const fake = Object.create(Account.prototype);   // right prototype, no private slots
console.log(fake instanceof Account, Account.isAccount(fake), Account.isAccount(a)); // true false true
try { fake.balance; } catch (e) { console.log(e.constructor.name); }   // TypeError
console.log(Account.count, Account.bank, Account.createdAt, a.count);  // 2 JS Bank class ready undefined
` }],
    codeTitle: ['Account with #private and static'],
    viz: {
      title: 'Where each member lives: instance, private slots, prototype, class',
      gen: function () {
        var code = [
          'class Account {',
          '  static #count = 0;',
          "  static bank = 'JS Bank';",
          '  #balance = 0;',
          '  static { Account.ready = true; }',
          '  constructor(owner) { this.owner = owner; Account.#count++; }',
          '  deposit(x) { this.#check(x); this.#balance += x; return this; }',
          "  #check(x) { if (x <= 0) throw new RangeError('positive only'); }",
          '  static isAccount(o) { return #balance in o; }',
          '}',
          "const a = new Account('Asha');",
          'a.deposit(50);',
          '// a.#balance   -> SyntaxError: the file would not even parse',
          'Account.isAccount(Object.create(Account.prototype)); // false'
        ].join('\n');
        function cls(c, hl) { return { type: 'map', label: 'Account (the class / constructor function)', entries: [['bank', "'JS Bank'"], ['ready', c.ready ? 'true' : '—'], ['isAccount', 'ƒ static'], ['prototype', 'Account.prototype']], hl: hl || {} }; }
        function cpriv(n, hl) { return { type: 'map', label: 'Private slots of Account (hidden)', entries: [['#count', String(n)]], hl: hl || {} }; }
        function proto(hl) { return { type: 'map', label: 'Account.prototype (shared, public)', entries: [['constructor', 'Account'], ['deposit', 'ƒ']], hl: hl || {} }; }
        function inst(own, priv, hlo, hlp) {
          return [{ type: 'map', label: 'a — public own properties', entries: own, hl: hlo || {} }, { type: 'map', label: 'a — private slots (invisible to keys, JSON, Proxy)', entries: priv, hl: hlp || {} }];
        }
        return codeFrames(code, [
          { l: 1, narr: 'When the engine reaches <code>class Account</code>, it builds the function and its prototype. <b>Instance</b> members wait; <b>static</b> members run <b>now</b>, top to bottom.', extra: [cls({}), proto()] },
          { l: 2, narr: '<code>static #count = 0</code> → a private slot on the <b>class object</b> itself. Only code inside the class body can write <code>Account.#count</code>.', extra: [cls({}), cpriv(0, { '#count': 'ok' })] },
          { l: 3, narr: '<code>static bank</code> → an ordinary own property of the function: <code>Account.bank</code>. Not visible on instances (<code>a.bank</code> is undefined).', extra: [cls({}, { bank: 'ok' }), cpriv(0)] },
          { l: 5, narr: 'The <b>static block</b> runs once, right now, in order with the other static fields. Use it for setup that needs statements (loops, try/catch).', extra: [cls({ ready: true }, { ready: 'ok' }), cpriv(0)] },
          { l: [4, 6, 11], narr: "<code>new Account('Asha')</code>: the instance gets its private slot <code>#balance = 0</code> first (fields), then the constructor body adds <code>owner</code> and bumps <code>#count</code>.", extra: inst([['owner', "'Asha'"]], [['#balance', '0']], { owner: 'ok' }, { '#balance': 'ok' }).concat([cpriv(1, { '#count': 'ok' })]) },
          { l: [7, 8, 12], narr: '<code>a.deposit(50)</code> is found on <b>Account.prototype</b> (public). Inside, it calls the private method <code>#check</code> and updates <code>#balance</code> — allowed because this code is <b>inside the class body</b>.', extra: inst([['owner', "'Asha'"]], [['#balance', '50']], {}, { '#balance': 'ok' }).concat([proto({ deposit: 'cur' })]) },
          { l: 13, cls: 'bad', narr: 'Outside the class, <code>a.#balance</code> is not a runtime error — it is a <b>SyntaxError</b>. The parser rejects the whole file before any code runs. <code>a[\'#balance\']</code> is just a different, normal (missing) property → undefined.', extra: inst([['owner', "'Asha'"]], [['#balance', '50 (locked)']], {}, { '#balance': 'bad' }).concat([{ type: 'set', label: 'Object.keys(a) / JSON.stringify(a) see only', items: ['owner'] }]) },
          { l: [9, 14], narr: 'An object made with <code>Object.create(Account.prototype)</code> passes <code>instanceof</code> (right prototype) but was never constructed, so it has <b>no private slots</b>. <code>#balance in o</code> → <b>false</b>. That is a brand check nobody can fake.', extra: [{ type: 'table', label: 'instanceof vs brand check', columns: ['object', 'instanceof Account', '#balance in o'], rows: [['a (real)', 'true', 'true'], ['Object.create(Account.prototype)', 'true', 'false'], ['{ owner: \'x\' }', 'false', 'false']], hl: { 1: 'sel' } }] },
          { l: 1, narr: 'Summary of homes: <b>instance</b> = public own props + private slots; <b>prototype</b> = shared public methods/accessors (private methods are attached per instance as a "permission", not a property); <b>class</b> = statics + static private slots.', extra: [cls({ ready: true }), cpriv(1), proto()].concat(inst([['owner', "'Asha'"]], [['#balance', '50']])) }
        ]);
      }
    },
    examples: [
      { title: 'Predict: private fields are invisible to every reflection API', html: `<p>Keys, entries, JSON, spread, <code>Object.getOwnPropertyNames</code>, <code>Reflect.ownKeys</code>, <code>structuredClone</code> (which also drops the prototype) — none of them see <code>#</code> slots. <code>u['#pin']</code> is an unrelated normal property name.</p>
${H.table(['API', 'Result for new User()'], [['Object.keys', "[ 'name' ]"], ['Reflect.ownKeys', "[ 'name' ]"], ["u['#pin']", 'undefined'], ['{ ...u }', "{ name: 'asha' }"]])}`, code: { lang: 'js', run: true, code: `class User {
  #pin = 1234;
  name = 'asha';
  checkPin(p) { return p === this.#pin; }
}
const u = new User();
console.log(Object.keys(u), Reflect.ownKeys(u));   // [ 'name' ] [ 'name' ]
console.log(u['#pin'], JSON.stringify(u));         // undefined {"name":"asha"}
console.log({ ...u }, u.checkPin(1234));           // { name: 'asha' } true
const copy = structuredClone(u);
console.log(copy instanceof User, Object.keys(copy)); // false [ 'name' ]` } },
      { title: 'Predict: subclasses cannot name the parent\'s private field', html: `<p>Child instances <b>have</b> the parent's slot (the parent constructor added it), but code in the child class cannot write <code>this.#secret</code> — that would be a SyntaxError unless the child declares its <b>own</b> <code>#secret</code>, which is a completely separate slot. Expose what children need via a (possibly protected-by-convention) method.</p>`, code: { lang: 'js', run: true, code: `class Parent {
  #secret = 'parent-secret';
  reveal() { return this.#secret; }        // children can call this
}
class Child extends Parent {
  #secret = 'child-secret';                // a DIFFERENT slot with the same spelling
  childReveal() { return this.#secret; }
}
const c = new Child();
console.log(c.reveal());       // parent-secret  (Parent's code sees Parent's slot)
console.log(c.childReveal());  // child-secret   (Child's code sees Child's slot)` } },
      { title: 'Predict: static private + subclass + this = TypeError', html: `<p>In a static method, <code>this</code> is whatever class you called it on. When called as <code>Sub.next()</code>, <code>this.#id</code> asks <b>Sub</b> for a private slot that only <b>Base</b> has → <code>TypeError</code>. Write <code>Base.#id</code> explicitly.</p>`, code: { lang: 'js', run: true, code: `class Base {
  static #id = 0;
  static nextBad() { return ++this.#id; }    // depends on 'this'
  static nextGood() { return ++Base.#id; }   // always the Base slot
}
class Sub extends Base {}
console.log(Base.nextBad());                 // 1
try { Sub.nextBad(); } catch (e) { console.log(e.constructor.name); }  // TypeError
console.log(Sub.nextGood(), Sub.nextGood()); // 2 3` } },
      { title: 'Before #: closures, WeakMaps and TypeScript private', html: `<p>Older code achieves privacy with a <b>WeakMap</b> keyed by the instance (methods stay on the prototype; entries are garbage-collected with the instance) or with <b>closures</b> (simple, but every instance gets its own method copies). TypeScript's <code>private</code> keyword disappears at runtime — the data is a normal, enumerable property.</p>`, code: { lang: 'js', run: true, code: `const _balance = new WeakMap();           // module-private
class OldAccount {
  constructor() { _balance.set(this, 0); }
  deposit(x) { _balance.set(this, _balance.get(this) + x); return this; }
  get balance() { return _balance.get(this); }
}
const o = new OldAccount().deposit(30);
console.log(o.balance, Object.keys(o));   // 30 []

// What TS 'private balance = 0' compiles to: a normal public property
class TsCompiled { constructor() { this.balance = 0; } }
console.log(Object.keys(new TsCompiled())); // [ 'balance' ] — visible at runtime` } },
      { title: 'Expert: Proxy + private fields do not mix', html: `<p>Private slots are attached to the <b>target</b> object. When a method runs with <code>this</code> = the <b>proxy</b>, <code>this.#x</code> looks for the slot on the proxy and throws. Fixes: bind methods to the target in the <code>get</code> trap, or avoid wrapping instances that use <code>#</code>. This bites reactive frameworks (Vue 3 docs warn about it) and mocking libraries.</p>`, code: { lang: 'js', run: true, code: `class Box {
  #v = 42;
  get value() { return this.#v; }
}
const p = new Proxy(new Box(), {});
try { console.log(p.value); } catch (e) { console.log(e.constructor.name); } // TypeError

const fixed = new Proxy(new Box(), {
  get(target, key) {
    const v = Reflect.get(target, key, target);   // receiver = target, not proxy
    return typeof v === 'function' ? v.bind(target) : v;
  }
});
console.log(fixed.value);    // 42` } },
      { title: 'Static factory, cache and a singleton', html: `<p>Statics shine for <b>named constructors</b> (<code>Color.fromHex</code>), <b>caches/registries</b> shared by all instances, and <b>singletons</b>. A private constructor does not exist in JS, but a private static token can stop outside code from calling <code>new</code> directly.</p>`, code: { lang: 'js', run: true, code: `class Config {
  static #instance = null;
  static #token = Symbol('internal');
  constructor(token) {
    if (token !== Config.#token) throw new TypeError('Use Config.get()');
    this.loadedAt = 'boot';
  }
  static get() {
    return Config.#instance ??= new Config(Config.#token);   // lazy singleton
  }
}
console.log(Config.get() === Config.get());   // true
try { new Config(); } catch (e) { console.log(e.message); }  // Use Config.get()

class Color {
  static #cache = new Map();
  constructor(r, g, b) { Object.assign(this, { r, g, b }); Object.freeze(this); }
  static fromHex(hex) {
    if (!Color.#cache.has(hex)) {
      const n = parseInt(hex.slice(1), 16);
      Color.#cache.set(hex, new Color(n >> 16, (n >> 8) & 255, n & 255));
    }
    return Color.#cache.get(hex);
  }
}
console.log(Color.fromHex('#ff8000'), Color.fromHex('#ff8000') === Color.fromHex('#ff8000'));
// Color { r: 255, g: 128, b: 0 } true` } }
    ],
    deepDive: `<p><b>How private names work.</b> Each <code>#x</code> declaration creates a unique <b>Private Name</b> value when the class is evaluated (evaluate the same class expression twice → two different private names). Instances carry a <code>[[PrivateElements]]</code> list. <code>this.#x</code> does <code>PrivateFieldFind(obj, name)</code>: if the object has no element for that exact Private Name → <code>TypeError</code>. Private methods are not stored per instance as functions; <code>PrivateMethodOrAccessorAdd</code> records a "brand" on the instance during construction, and the method itself lives once on the class. That is why <code>#m in obj</code> works for methods too.</p>
<p><b>Lexical scoping.</b> Private names are resolved <b>lexically</b> like variables: any code physically inside the class body (including nested functions, arrow functions, nested classes, and static blocks) can use them. The static-block "friend" pattern exploits this: <code>let getX; class A { #x; static { getX = (a) =&gt; a.#x; } }</code> exports a controlled accessor to the rest of the module. <code>eval</code> inside the class body can also see them.</p>
<p><b>The "return override" trick.</b> Because a base constructor may return any object, a subclass whose parent returns an arbitrary object will <b>stamp its private fields onto that object</b> — this can attach private state to frozen objects or even to objects created elsewhere (used in polyfills for "private symbols"). It is also why proposals like "nonextensible applies to privates" are discussed in TC39.</p>
<p><b>Performance.</b> V8 implements private fields with special private symbols on the object, so access speed matches normal properties and they participate in hidden classes and inline caches. Brand checks and private methods are cheap. Older Babel transpilation used <code>WeakMap</code>s (one per field) — noticeably slower and memory-hungry, a reason to target ES2022+ today (private fields since Node 12, private methods since Node 14.6; <code>#x in obj</code> needs Node 16.4+ / Chrome 91+ / Safari 15+, and static blocks Node 16.11+ / Chrome 94+ / Safari 16.4+ — all fine in any 2026 runtime).</p>
<p><b>Statics and inheritance.</b> A public static field is an own property of the class that <b>declares</b> it; subclasses only <b>read</b> it through the constructor chain (<code>Object.getPrototypeOf(Child) === Parent</code>), exactly like static methods. A static field mutated via <code>this.counter++</code> in a method called on a subclass creates an own <code>counter</code> on the subclass (a write → shadowing!) — a subtle bug when you wanted one shared counter.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI often produces TypeScript with <code>private</code> keywords and assumes the data is hidden at runtime; or produces <code>_underscore</code> fields because of older training data. Knowing when you need <b>runtime</b> privacy (library boundaries, security-sensitive tokens, multi-tenant objects) is a human judgement.</p>
<p><b>Use AI as a partner:</b> "<i>convert these underscore fields to #private and list everything that will break</i>" (expect: JSON serialisation, tests reading internals, Proxies, subclasses touching fields, <code>structuredClone</code>); "<i>add a brand-checked static isX to this class</i>"; "<i>find static methods that use this.#x and could be called on a subclass</i>".</p>
<p><b>Where AI goes wrong:</b> writing <code>obj['#x']</code> as if it accessed the private field; putting <code>#x</code> on instances and expecting subclasses to read it; wrapping <code>#</code>-using instances in Proxies (reactive stores) without the bind fix; static counters incremented via <code>this</code> from subclasses.</p>
<p><b>What you must still own:</b> choosing the right level of privacy (convention vs compile-time vs runtime), designing a small public surface, and the rules for statics with inheritance.</p>`,
    problems: [{
      title: 'Bank Account with True Privacy and a Brand Check',
      level: 'Medium', tags: ['private fields', 'static', 'encapsulation', 'brand check'], companies: ['Stripe', 'Razorpay', 'Goldman Sachs'],
      statement: `<p>Build <code>class Account</code> with:</p>
<ul><li>a private balance (cannot be read or changed except through methods), and a private transaction log,</li><li><code>deposit(x)</code> and <code>withdraw(x)</code> (chainable; reject non-positive amounts with <code>RangeError</code>; reject overdrafts with <code>Error('insufficient funds')</code>),</li><li>a read-only <code>balance</code> getter and a <code>history()</code> method that returns a <b>copy</b> of the log,</li><li>auto-incrementing ids from a private static counter (<code>acc-1</code>, <code>acc-2</code>, …),</li><li><code>static transfer(from, to, amount)</code> that works only on genuine accounts (brand check) and is atomic (no money lost if the withdrawal fails).</li></ul>`,
      constraints: `No public field may expose the balance. <code>Object.keys(account)</code> must be <code>['id']</code>. Use <code>#</code> syntax, not WeakMap.`,
      example: `<p><code>const a = new Account(); a.deposit(100); const b = new Account();</code><br><code>Account.transfer(a, b, 30)</code> → ${H.c('g', 'a.balance 70, b.balance 30')}.<br><code>Account.transfer(a, b, 500)</code> → ${H.c('r', 'Error: insufficient funds')} and both balances unchanged. <code>Account.transfer({ balance: 1e9 }, b, 5)</code> → ${H.c('r', 'TypeError')}.</p>`,
      brute: {
        why: `<p>The underscore version "works" until someone writes <code>acc._balance = 1e9</code> — nothing stops it. A fake object <code>{ _balance: 1e9, withdraw(){…} }</code> passes duck-typing checks in <code>transfer</code>, and <code>history()</code> returning the internal array lets callers rewrite the log.</p>`,
        code: { lang: 'js', run: true, code: `class AccountBrute {
  constructor() { this._balance = 0; this._log = []; }
  deposit(x) { this._balance += x; this._log.push(x); return this; }
  get balance() { return this._balance; }
  history() { return this._log; }          // leaks the real array
}
const acc = new AccountBrute().deposit(10);
acc._balance = 1e9;                        // anyone can do this
acc.history().push('forged');
console.log(acc.balance, acc.history());   // 1000000000 [ 10, 'forged' ]` }
      },
      mcq: { q: 'In <code>static transfer(from, to, amt)</code>, what is the most reliable way to reject objects that merely look like accounts?', options: ['<code>from instanceof Account</code>', '<code>typeof from.withdraw === "function"</code>', '<code>#balance in from &amp;&amp; #balance in to</code>', '<code>from.constructor === Account</code>'], answer: 2, explain: '<code>instanceof</code> and <code>constructor</code> can be faked with <code>Object.create(Account.prototype)</code> or by assigning properties. Only objects actually constructed by Account have the <code>#balance</code> slot, so the brand check cannot be forged.' },
      hints: [
        `<p>Hint 1: fields: <code>static #nextId = 1; #balance = 0; #log = [];</code> and a public <code>id</code> assigned in the constructor from <code>Account.#nextId++</code> (use the class name, not <code>this</code>, in statics).</p>`,
        `<p>Hint 2: put validation in a private method <code>#amount(x)</code>; <code>withdraw</code> checks funds <b>before</b> mutating. <code>history()</code> returns <code>[...this.#log]</code>.</p>`,
        `<p>Hint 3: <code>transfer</code>: brand-check both with <code>#balance in obj</code> (throw <code>TypeError</code>), then <code>from.withdraw(amt)</code> first — if it throws, nothing was deposited — then <code>to.deposit(amt)</code>. Because <code>transfer</code> is inside the class it may also read <code>from.#balance</code> directly.</p>`
      ],
      solution: {
        approach: `<p>All state is in private slots; the public surface is <code>id</code>, <code>balance</code> (getter only), <code>deposit</code>, <code>withdraw</code>, <code>history</code> and the static <code>transfer</code>. Withdrawal validates before mutating, so <code>transfer</code> can rely on "withdraw first, deposit second" for atomicity. The brand check rejects forged objects.</p>`,
        code: { lang: 'js', run: true, code: `class Account {
  static #nextId = 1;
  #balance = 0;
  #log = [];

  constructor() {
    this.id = 'acc-' + Account.#nextId++;          // class name, not this (subclass-safe)
  }
  #amount(x) {
    if (typeof x !== 'number' || !(x > 0) || !Number.isFinite(x)) throw new RangeError('amount must be a positive number');
    return x;
  }
  deposit(x) {
    this.#balance += this.#amount(x);
    this.#log.push({ type: 'deposit', amount: x });
    return this;
  }
  withdraw(x) {
    this.#amount(x);
    if (x > this.#balance) throw new Error('insufficient funds');   // check BEFORE mutating
    this.#balance -= x;
    this.#log.push({ type: 'withdraw', amount: x });
    return this;
  }
  get balance() { return this.#balance; }
  history() { return this.#log.map((e) => ({ ...e })); }          // defensive copy
  static transfer(from, to, amount) {
    if (!(#balance in from) || !(#balance in to)) throw new TypeError('transfer needs two genuine accounts');
    from.withdraw(amount);       // throws -> nothing changed anywhere
    to.deposit(amount);
  }
}

const a = new Account().deposit(100), b = new Account();
Account.transfer(a, b, 30);
console.log(a.id, a.balance, b.id, b.balance);                 // acc-1 70 acc-2 30
try { Account.transfer(a, b, 500); } catch (e) { console.log(e.message, a.balance, b.balance); } // insufficient funds 70 30
try { Account.transfer({ balance: 1e9 }, b, 5); } catch (e) { console.log(e.name); }         // TypeError
console.log(Object.keys(a), JSON.stringify(a));                // [ 'id' ] {"id":"acc-1"}
a.history().push('forged');
console.log(a.history().length);                               // 2 — internal log untouched` },
        dry: { head: ['call', 'check', 'a.#balance', 'b.#balance'], rows: [['a.deposit(100)', '100 > 0 ✓', '100', '0'], ['transfer(a, b, 30)', 'brands ✓, 30 ≤ 100 ✓', '70', '30'], ['transfer(a, b, 500)', H.c('r', '500 > 70 → throw before mutating'), '70', '30'], ['transfer(fake, b, 5)', H.c('r', '#balance in fake → false'), '70', '30']] },
        complexity: `<p>All operations O(1) except <code>history()</code>, which is O(n) for the defensive copy.</p>`,
        followUps: ['Make it safe for subclasses (<code>class Savings extends Account</code>) — which parts already are?', 'Add an <code>#frozen</code> flag and a static <code>freeze(account)</code> only the class can call.', 'How would you serialise and restore an account (toJSON / static fromJSON) without exposing a public setter?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 8 — instanceof, isPrototypeOf, Symbol.hasInstance and type checks
     ====================================================================== */
  topics.push({
    title: 'instanceof Under the Hood (and Better Type Checks)',
    analogy: `<p>A club checks membership by looking for the club's <b>official stamp</b> anywhere in your passport's pages — not by your name, not by how you dress. <code>x instanceof Dog</code> flips through <code>x</code>'s prototype chain page by page, looking for <b>that exact object</b> <code>Dog.prototype</code>.</p>
<p>Two consequences: someone can <b>forge</b> a passport by gluing in the right page (<code>Object.setPrototypeOf</code>), and a member of the <b>identical club in another city</b> (another iframe/realm) gets rejected, because their stamp is a different physical stamp — even though it looks the same.</p>`,
    explain: `<p><code>x instanceof C</code> answers one precise question: <b>"Does <code>C.prototype</code> appear anywhere in <code>x</code>'s prototype chain?"</b> It compares object <b>identity</b> at each step.</p>
<h4>The algorithm (simplified)</h4>
<ol>
<li>If <code>C</code> is not an object → <code>TypeError</code>. If <code>C</code> has a <code>Symbol.hasInstance</code> method, return what it says (classes can customise <code>instanceof</code>).</li>
<li>Otherwise <code>C</code> must be callable, else <code>TypeError: Right-hand side of 'instanceof' is not callable</code>.</li>
<li>If <code>x</code> is a primitive (number, string, boolean, null, undefined, symbol, bigint) → <code>false</code>. No boxing happens.</li>
<li>Let <code>target = C.prototype</code>. Walk <code>p = Object.getPrototypeOf(x)</code>, then its prototype, … If some <code>p === target</code> → <code>true</code>. If you reach <code>null</code> → <code>false</code>.</li>
</ol>
${H.table(['Expression', 'Why', 'Result'], [
  ['<code>rex instanceof Animal</code>', 'Animal.prototype is 2 hops up', H.c('g', 'true')],
  ['<code>[] instanceof Object</code>', 'Array.prototype → Object.prototype', H.c('g', 'true')],
  ['<code>Object.create(null) instanceof Object</code>', 'chain is empty', H.c('r', 'false')],
  ["<code>'hi' instanceof String</code>", 'primitive', H.c('r', 'false')],
  ["<code>new String('hi') instanceof String</code>", 'wrapper object', H.c('g', 'true')],
  ['<code>Object.create(Dog.prototype) instanceof Dog</code>', 'chain has Dog.prototype — no constructor ran!', H.c('y', 'true (forged)')]
])}
<h4>Related tools</h4>
<ul>
<li><code>Dog.prototype.isPrototypeOf(x)</code> — the same walk, but you name the prototype object directly. Works for <code>Object.create</code>-style objects that have no constructor function at all.</li>
<li><code>Object.getPrototypeOf(x) === Dog.prototype</code> — "is it <b>directly</b> a Dog" (not a subclass).</li>
</ul>
<h4>When <code>instanceof</code> lies</h4>
<ul>
<li><b>Changed prototypes</b>: <code>Object.setPrototypeOf</code>, or replacing <code>C.prototype</code> after instances exist (old instances become "not instances").</li>
<li><b>Cross-realm</b>: an array from an iframe or <code>vm</code> context has a <i>different</i> <code>Array.prototype</code>, so <code>arr instanceof Array</code> is <b>false</b>. Use <code>Array.isArray</code>. Same problem with multiple copies of a library in <code>node_modules</code> (two different <code>class Foo</code>s).</li>
<li><b>Primitives</b> always give false; use <code>typeof</code> for them.</li>
</ul>
<h4>The type-check toolbox</h4>
${H.table(['You want to know…', 'Use'], [
  ['primitive type (string, number, bigint, boolean, symbol, undefined, function)', '<code>typeof x</code> (beware: <code>typeof null === \'object\'</code>)'],
  ['is it an array (any realm)?', '<code>Array.isArray(x)</code>'],
  ['built-in kind (Date, RegExp, Map…) robustly', "<code>Object.prototype.toString.call(x)</code> → '[object Date]'"],
  ['was it built by my class (unforgeable)?', 'brand check <code>#field in x</code>'],
  ['does it inherit from C (normal case)?', '<code>x instanceof C</code>'],
  ['does it have the method I need?', "duck typing: <code>typeof x.then === 'function'</code>"]
])}`,
    clues: [
      '"Implement <code>instanceof</code> yourself" → walk <code>Object.getPrototypeOf</code> comparing with <code>C.prototype</code>.',
      '"<code>arr instanceof Array</code> is false for an array from an iframe" → cross-realm; use <code>Array.isArray</code>.',
      '"Predict: <code>\'str\' instanceof String</code>, <code>Object.create(null) instanceof Object</code>, <code>Function instanceof Object</code>" → algorithm edge cases.',
      '"Make <code>instanceof</code> return true for objects that match an interface" → <code>static [Symbol.hasInstance]</code>.',
      '"How do you reliably check the type of a value in JS?" → the toolbox: typeof / isArray / toString tag / brand check / duck typing.',
      '"Two copies of the same library and <code>instanceof</code> fails" → identity-based check across module instances.'
    ],
    code: { lang: 'js', run: true, title: 'instanceof walks the chain by identity (runnable)', code: `class Animal {}
class Dog extends Animal {}
class Cat extends Animal {}
const rex = new Dog();

console.log(rex instanceof Dog, rex instanceof Animal, rex instanceof Object); // true true true
console.log(rex instanceof Cat);                       // false
console.log(Animal.prototype.isPrototypeOf(rex));      // true (same walk)
console.log(Object.getPrototypeOf(rex) === Animal.prototype); // false: not DIRECTLY an Animal

console.log('hi' instanceof String, new String('hi') instanceof String); // false true
console.log(Object.create(null) instanceof Object);    // false (empty chain)

const forged = Object.create(Dog.prototype);           // no constructor ever ran
console.log(forged instanceof Dog);                    // true — instanceof only checks the chain

Object.setPrototypeOf(rex, Cat.prototype);             // re-link (slow, demo only)
console.log(rex instanceof Dog, rex instanceof Cat);   // false true

try { rex instanceof {}; } catch (e) { console.log(e.constructor.name); } // TypeError (RHS not callable)
` },
    viz: {
      title: 'Run instanceof step by step',
      input: 'rex Animal',
      inputLabel: 'value and constructor — values: rex, fake, arr, obj, bare, fn, num, str · constructors: Dog, Animal, Cat, Object, Array, Function',
      gen: function (input) {
        var VALS = {
          rex: { desc: "new Dog() (Dog extends Animal)", chain: ['Dog.prototype', 'Animal.prototype', 'Object.prototype'] },
          fake: { desc: 'Object.create(Dog.prototype) — no constructor ran', chain: ['Dog.prototype', 'Animal.prototype', 'Object.prototype'] },
          arr: { desc: '[1, 2]', chain: ['Array.prototype', 'Object.prototype'] },
          obj: { desc: '{ a: 1 }', chain: ['Object.prototype'] },
          bare: { desc: 'Object.create(null)', chain: [] },
          fn: { desc: 'function () {}', chain: ['Function.prototype', 'Object.prototype'] },
          num: { desc: '42 (primitive)', prim: true },
          str: { desc: "'hi' (primitive)", prim: true }
        };
        var CTORS = ['Dog', 'Animal', 'Cat', 'Object', 'Array', 'Function'];
        var t = String(input === undefined ? 'rex Animal' : input).trim().split(/\s+/);
        if (t.length !== 2 || !VALS[t[0]] || CTORS.indexOf(t[1]) < 0) throw new Error('Type a value and a constructor, e.g. "rex Animal", "arr Object", "bare Object", "str String"… values: ' + Object.keys(VALS).join(', ') + '; constructors: ' + CTORS.join(', '));
        var v = VALS[t[0]], C = t[1], target = C + '.prototype', frames = [];
        var expr = t[0] + ' instanceof ' + C;
        frames.push({ narr: 'Evaluate <code>' + esc(expr) + '</code>, where <code>' + esc(t[0]) + '</code> = ' + esc(v.desc) + '.', parts: [{ type: 'vars', label: 'instanceof', vals: { left: t[0], right: C }, hl: {} }, note('Question being asked: does <b>' + esc(target) + '</b> appear anywhere in ' + esc(t[0]) + '\'s prototype chain?')] });
        frames.push({ narr: 'Step 1: is the right side an object with a custom <code>Symbol.hasInstance</code>? <b>' + esc(C) + '</b> only has the default one inherited from <code>Function.prototype</code>, which runs the ordinary algorithm. Is it callable? Yes → continue.', parts: [{ type: 'vars', label: 'instanceof', vals: { right: C, 'custom hasInstance': 'no', callable: 'yes' }, hl: { callable: 'ok' } }] });
        if (v.prim) {
          frames.push({ narr: 'Step 2: the left side is a <b>primitive</b>. <code>instanceof</code> does <b>not</b> box primitives — it returns <span class="c-r"><b>false</b></span> immediately. (Use <code>typeof</code> for primitives.)', parts: [{ type: 'vars', label: 'instanceof', vals: { left: v.desc, result: 'false' }, hl: { result: 'bad' } }] });
          frames.push({ narr: 'Compare: <code>Object(' + esc(t[0]) + ')</code> would create a wrapper object whose chain starts at ' + (t[0] === 'num' ? 'Number' : 'String') + '.prototype — then <code>instanceof Object</code> would be true. Primitives themselves never are.', parts: [{ type: 'list', label: 'Chain of the WRAPPER object (not the primitive)', values: ['Object(' + t[0] + ')', (t[0] === 'num' ? 'Number' : 'String') + '.prototype', 'Object.prototype'], next: [1, 2, -1], hl: { 0: 'done' } }] });
          return frames;
        }
        var nodes = [t[0]].concat(v.chain);
        frames.push({ narr: 'Step 2: <code>target = ' + esc(C) + '.prototype</code>. Now walk the chain starting from <code>Object.getPrototypeOf(' + esc(t[0]) + ')</code>.', parts: [{ type: 'list', label: 'Chain of ' + t[0], values: nodes, next: nodes.map(function (_, i) { return i + 1 < nodes.length ? i + 1 : -1; }), hl: { 0: 'cur' } }, { type: 'vars', vals: { target: target }, hl: { target: 'sel' } }] });
        if (!v.chain.length) {
          frames.push({ narr: '<code>Object.getPrototypeOf(' + esc(t[0]) + ')</code> is <b>null</b> right away — the chain is empty. Nothing can match → <span class="c-r"><b>false</b></span>. Even <code>instanceof Object</code> is false for null-prototype objects!', parts: [{ type: 'list', label: 'Chain of ' + t[0], values: [t[0]], next: [-1], hl: { 0: 'bad' } }, { type: 'vars', vals: { target: target, p: 'null', result: 'false' }, hl: { result: 'bad' } }] });
          return frames;
        }
        for (var i = 0; i < v.chain.length; i++) {
          var hit = v.chain[i] === target, hl = {}, ptr = {};
          for (var j = 1; j <= i; j++) hl[j] = 'done';
          hl[i + 1] = hit ? 'ok' : 'cur'; ptr[i + 1] = 'p';
          frames.push({ narr: 'Hop ' + (i + 1) + ': <code>p = ' + esc(v.chain[i]) + '</code>. Is <code>p === ' + esc(target) + '</code>? ' + (hit ? '<span class="c-g"><b>Yes — same object!</b></span> Return <b>true</b>.' : '<span class="c-r">No.</span> Move to <code>Object.getPrototypeOf(p)</code>.'), parts: [{ type: 'list', label: 'Chain of ' + t[0], values: nodes, next: nodes.map(function (_, k) { return k + 1 < nodes.length ? k + 1 : -1; }), hl: hl, ptr: ptr }, { type: 'vars', vals: { target: target, p: v.chain[i], 'p === target': String(hit) }, hl: { 'p === target': hit ? 'ok' : 'bad' } }] });
          if (hit) {
            frames.push({ narr: '<code>' + esc(expr) + '</code> → <span class="c-g"><b>true</b></span>.' + (t[0] === 'fake' ? ' Notice: <b>no constructor ever ran</b> for fake — instanceof only looks at the chain, so it can be fooled. A <code>#private</code> brand check cannot.' : ' It took ' + (i + 1) + ' hop' + (i ? 's' : '') + '.'), parts: [{ type: 'vars', vals: { result: 'true', hops: i + 1 }, hl: { result: 'ok' } }, note('Equivalent: <code>' + esc(C) + '.prototype.isPrototypeOf(' + esc(t[0]) + ')</code>')] });
            return frames;
          }
        }
        frames.push({ narr: 'Next <code>Object.getPrototypeOf(Object.prototype)</code> is <b>null</b> — end of chain, no match. <code>' + esc(expr) + '</code> → <span class="c-r"><b>false</b></span>.', parts: [{ type: 'list', label: 'Chain of ' + t[0], values: nodes, next: nodes.map(function (_, k) { return k + 1 < nodes.length ? k + 1 : -1; }), hl: (function () { var h = {}; for (var k = 1; k < nodes.length; k++) h[k] = 'done'; return h; })() }, { type: 'vars', vals: { target: target, p: 'null', result: 'false' }, hl: { result: 'bad' } }] });
        return frames;
      }
    },
    examples: [
      { title: 'Predict: replacing C.prototype orphans old instances', html: `<p><code>instanceof</code> reads <code>C.prototype</code> <b>now</b>. Objects created before the swap point to the <b>old</b> prototype object, so they stop being "instances". Classes protect against this (their <code>prototype</code> is read-only).</p>
${H.table(['', 'before swap', 'after swap'], [['old instanceof F', H.c('g', 'true'), H.c('r', 'false')], ['new instanceof F', '—', H.c('g', 'true')]])}`, code: { lang: 'js', run: true, code: `function F() {}
const old = new F();
console.log(old instanceof F);   // true
F.prototype = {};                // swap
const fresh = new F();
console.log(old instanceof F, fresh instanceof F);   // false true

class K {}
K.prototype = {};                // ignored: class prototype is non-writable (sloppy)
console.log(new K() instanceof K);                   // true` } },
      { title: 'Cross-realm: why Array.isArray exists', html: `<p>Each realm (iframe, Web Worker, Node <code>vm</code> context) has its own <code>Array</code> and <code>Array.prototype</code>. An array created in another realm fails <code>instanceof Array</code> in yours. <code>Array.isArray</code> checks the internal "is an Array exotic object" flag instead, and <code>Object.prototype.toString.call</code> reads the tag. This snippet uses Node's <code>vm</code> module, so it runs in Node rather than in the browser sandbox.</p>`, code: { lang: 'js', code: `const vm = require('vm');
const foreign = vm.runInNewContext('[1, 2, 3]');   // array from another realm
console.log(foreign instanceof Array);             // false — different Array.prototype
console.log(Array.isArray(foreign));               // true
console.log(Object.prototype.toString.call(foreign)); // [object Array]` } },
      { title: 'Customising instanceof with Symbol.hasInstance', html: `<p>If the right-hand side has a <code>Symbol.hasInstance</code> method, <code>instanceof</code> just calls it. Useful for <b>interface-like</b> checks (duck typing behind a familiar syntax) — but surprising to readers, so use sparingly.</p>`, code: { lang: 'js', run: true, code: `class Even {
  static [Symbol.hasInstance](n) { return Number.isInteger(n) && n % 2 === 0; }
}
console.log(2 instanceof Even, 3 instanceof Even);   // true false — primitives allowed here!

const Thenable = {
  [Symbol.hasInstance](x) { return x != null && typeof x.then === 'function'; }
};
console.log(Promise.resolve(1) instanceof Thenable);  // true
console.log({ then() {} } instanceof Thenable);       // true
console.log({} instanceof Thenable);                  // false` } },
      { title: 'The type-check toolbox in action', html: `<p>Pick the tool by the question. <code>typeof</code> for primitives (watch out for <code>null</code>), <code>Array.isArray</code> for arrays, <code>Object.prototype.toString</code> tags for built-ins, <code>instanceof</code> for your own class hierarchies.</p>
${H.table(['value', 'typeof', 'toString tag'], [['null', "'object' (historic bug)", '[object Null]'], ['[]', "'object'", '[object Array]'], ['new Date()', "'object'", '[object Date]'], ['() =&gt; 1', "'function'", '[object Function]'], ['10n', "'bigint'", '[object BigInt]']])}`, code: { lang: 'js', run: true, code: `const tag = (x) => Object.prototype.toString.call(x).slice(8, -1);
const samples = [null, undefined, 1, 'a', 10n, Symbol('s'), [], {}, new Date(0), /re/, new Map(), () => 1, Promise.resolve()];
for (const x of samples) {
  console.log(String(typeof x).padEnd(9), tag(x));
}
class Temp { get [Symbol.toStringTag]() { return 'Temperature'; } }
console.log(tag(new Temp()));   // Temperature — custom tag` } },
      { title: 'Predict: the top-of-the-world instanceof puzzle', html: `<p>Use the algorithm, not intuition. <code>Function instanceof Function</code>: Function's chain is Function.prototype → Object.prototype → null, and the target is <code>Function.prototype</code> → <b>true</b>. <code>Object instanceof Object</code>: Object → Function.prototype → Object.prototype ✓ → <b>true</b>. <code>Dog instanceof Animal</code> (classes): Dog's chain starts with <b>Animal itself</b>, then Function.prototype — never Animal.prototype → <b>false</b>.</p>`, code: { lang: 'js', run: true, code: `class Animal {}
class Dog extends Animal {}
console.log(Function instanceof Function);  // true
console.log(Object instanceof Object);      // true
console.log(Function instanceof Object);    // true
console.log(Object instanceof Function);    // true
console.log(Dog instanceof Animal);         // false (Dog is a function, not an animal)
console.log(Dog instanceof Function);       // true
console.log(Animal.isPrototypeOf(Dog));     // true — the static chain` } }
    ],
    deepDive: `<p><b>Spec path.</b> <code>InstanceofOperator(V, target)</code>: (1) if <code>target</code> is not an Object → TypeError; (2) <code>instOfHandler = GetMethod(target, @@hasInstance)</code>; if defined, return <code>ToBoolean(Call(handler, target, « V »))</code>; (3) if target is not callable → TypeError; (4) return <code>OrdinaryHasInstance(target, V)</code>. Every function inherits <code>Function.prototype[Symbol.hasInstance]</code> (non-writable, so it cannot be overwritten by plain assignment on a function — you must use <code>static [Symbol.hasInstance]</code> or <code>defineProperty</code>), which calls <code>OrdinaryHasInstance</code>.</p>
<p><b>OrdinaryHasInstance(C, O)</b>: if <code>C</code> is a <b>bound function</b>, recurse with its target function (so <code>x instanceof f.bind(null)</code> works like <code>x instanceof f</code>); if <code>O</code> is not an object → false; <code>P = Get(C, 'prototype')</code>, and if P is not an object → <b>TypeError</b> (e.g. <code>x instanceof (() =&gt; {})</code> throws "Function has non-object prototype 'undefined' in instanceof check"); then loop <code>O = O.[[GetPrototypeOf]]()</code> comparing with <code>SameValue</code>. Proxies participate: the walk calls the <code>getPrototypeOf</code> trap, so a Proxy can make itself an "instance" of anything.</p>
<p><b>Speed.</b> V8 optimises <code>instanceof</code> with known constant right-hand sides into a short loop or even a constant when the object's map is known. A custom <code>Symbol.hasInstance</code> defeats that and costs a call. In hot code, checking a <b>brand</b> or a discriminant field (<code>x.kind === 'circle'</code>, as in TypeScript discriminated unions) is both faster and more robust than deep <code>instanceof</code> chains.</p>
<p><b>Real-world failure modes.</b> Duplicate package versions (two copies of <code>class ValidationError</code> after a bad dependency resolution) make <code>err instanceof ValidationError</code> false — libraries like AWS SDK v3 and RxJS moved to name/brand checks or <code>Symbol.for</code>-based markers for this reason. Errors crossing <code>postMessage</code>/<code>structuredClone</code> lose custom prototypes. Serialised data (JSON) never satisfies <code>instanceof</code> — you must rehydrate with a factory (<code>User.fromJSON</code>). Node's <code>util.types.isPromise</code>/<code>isDate</code> and <code>Error.isError</code> (a recent proposal, already shipping in some engines) exist precisely because realm-safe checks are hard.</p>`,
    aiEra: `<p><b>What AI changes:</b> generated code sprinkles <code>instanceof</code> checks freely — <code>if (err instanceof AxiosError)</code>, <code>if (data instanceof Array)</code> — which fail across realms, bundles, and duplicate packages. Knowing when identity checks are fragile is now a key review skill, especially in micro-frontends and serverless code where realms and bundles multiply.</p>
<p><b>Use AI as a partner:</b> "<i>find every instanceof in this repo and tell me which could see cross-realm or JSON-deserialised values</i>"; "<i>write a myInstanceof with tests for bound functions, Symbol.hasInstance, primitives and null-prototype objects</i>"; "<i>generate tricky instanceof predict-the-output puzzles involving Function and Object</i>".</p>
<p><b>Where AI goes wrong:</b> <code>myInstanceof</code> implementations that box primitives (returning true for <code>'a' instanceof String</code>), loop on <code>__proto__</code> (crashes on null-prototype objects in some engines), forget the non-callable TypeError, or claim <code>Array.isArray</code> and <code>instanceof Array</code> are equivalent.</p>
<p><b>What you must still own:</b> the exact algorithm, its failure modes, and picking the right check (typeof, isArray, tag, brand, discriminant, duck typing) for the situation.</p>`,
    problems: [{
      title: 'Implement instanceof: myInstanceof(value, Ctor)',
      level: 'Easy', tags: ['polyfill', 'instanceof', 'prototype chain'], companies: ['Amazon', 'Flipkart', 'CRED', 'Adobe'],
      statement: `<p>Implement <code>myInstanceof(value, Ctor)</code> that returns the same boolean as <code>value instanceof Ctor</code> for ordinary constructors. Requirements: primitives → <code>false</code>; non-callable <code>Ctor</code> → <code>TypeError</code>; respect a custom <code>Ctor[Symbol.hasInstance]</code> if <code>Ctor</code> defines its own; work with null-prototype objects.</p>`,
      constraints: `Do not use the <code>instanceof</code> operator or <code>isPrototypeOf</code>. Chains are finite (no cycles possible).`,
      example: `<p><code>myInstanceof(new Dog(), Animal)</code> → ${H.c('g', 'true')} (Animal.prototype is 2 hops up); <code>myInstanceof('hi', String)</code> → ${H.c('r', 'false')}; <code>myInstanceof(Object.create(null), Object)</code> → ${H.c('r', 'false')}; <code>myInstanceof({}, {})</code> → ${H.c('r', 'TypeError')}.</p>`,
      brute: {
        why: `<p>A common first attempt compares <code>value.constructor === Ctor</code>. It ignores inheritance (a Dog is not reported as an Animal), is fooled by any object with a fake <code>constructor</code> property, and crashes on <code>null</code>/<code>undefined</code> and returns <code>true</code> for primitives via boxing (<code>'a'.constructor === String</code>).</p>`,
        code: { lang: 'js', run: true, code: `function myInstanceofBrute(value, Ctor) {
  return value.constructor === Ctor;          // only the direct class, easily faked
}
class Animal {}
class Dog extends Animal {}
console.log(myInstanceofBrute(new Dog(), Animal));        // false  (wrong)
console.log(myInstanceofBrute('hi', String));             // true   (wrong: primitive)
console.log(myInstanceofBrute({ constructor: Dog }, Dog));// true   (wrong: faked)` }
      },
      mcq: { q: 'Your loop compares each prototype <code>p</code> with what?', options: ['<code>Ctor</code>', '<code>Ctor.prototype</code>', '<code>Ctor.constructor</code>', '<code>Object.getPrototypeOf(Ctor)</code>'], answer: 1, explain: 'Instances are linked to <code>Ctor.prototype</code> (that is what <code>new</code> set up), so that is the object to look for in the chain. Comparing with <code>Ctor</code> itself is the classic mistake.' },
      hints: [
        `<p>Hint 1: guard clauses first — non-callable <code>Ctor</code> → throw; if <code>Ctor</code> has its <b>own</b> or inherited-from-a-class <code>Symbol.hasInstance</code> that differs from <code>Function.prototype[Symbol.hasInstance]</code>, delegate to it.</p>`,
        `<p>Hint 2: primitives: <code>value === null || (typeof value !== 'object' &amp;&amp; typeof value !== 'function')</code> → false.</p>`,
        `<p>Hint 3: <code>target = Ctor.prototype</code> (throw if it is not an object); <code>p = Object.getPrototypeOf(value)</code>; while <code>p !== null</code>: if <code>p === target</code> return true; <code>p = Object.getPrototypeOf(p)</code>. Return false.</p>`
      ],
      solution: {
        approach: `<p>Mirror the spec: validate the right side, honour a custom <code>Symbol.hasInstance</code>, short-circuit primitives, then walk the linked list of prototypes comparing by identity with <code>Ctor.prototype</code>. Use <code>Object.getPrototypeOf</code> (not <code>__proto__</code>) so null-prototype objects and Proxies behave correctly.</p>`,
        code: { lang: 'js', run: true, code: `function myInstanceof(value, Ctor) {
  if (Ctor === null || (typeof Ctor !== 'object' && typeof Ctor !== 'function')) {
    throw new TypeError("Right-hand side of 'instanceof' is not an object");
  }
  const custom = Ctor[Symbol.hasInstance];
  if (custom !== undefined && custom !== Function.prototype[Symbol.hasInstance]) {
    return Boolean(custom.call(Ctor, value));                  // user-defined rule
  }
  if (typeof Ctor !== 'function') throw new TypeError("Right-hand side of 'instanceof' is not callable");
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) return false; // primitives
  const target = Ctor.prototype;
  if (target === null || (typeof target !== 'object' && typeof target !== 'function')) {
    throw new TypeError('Function has non-object prototype in instanceof check');
  }
  let p = Object.getPrototypeOf(value);
  while (p !== null) {
    if (p === target) return true;          // identity, not structure
    p = Object.getPrototypeOf(p);
  }
  return false;
}

class Animal {}
class Dog extends Animal {}
class Even { static [Symbol.hasInstance](n) { return n % 2 === 0; } }
const cases = [[new Dog(), Animal], [new Dog(), Array], ['hi', String], [new String('hi'), String],
  [Object.create(null), Object], [[], Object], [Function, Object], [4, Even]];
for (const [v, C] of cases) console.log(C.name, myInstanceof(v, C) === (v instanceof C), myInstanceof(v, C));
try { myInstanceof({}, {}); } catch (e) { console.log(e.name); }   // TypeError` },
        dry: { head: ['p', 'target = Animal.prototype', 'p === target?', 'next'], rows: [['Dog.prototype', 'Animal.prototype', 'no', 'getPrototypeOf'], ['Animal.prototype', 'Animal.prototype', H.c('g', 'yes'), H.c('g', 'return true')]] },
        complexity: `<p>Time O(d) where d = chain depth; space O(1).</p>`,
        followUps: ['Handle bound functions like the spec (<code>myInstanceof(x, F.bind(null))</code>).', 'Write a realm-safe <code>isArrayLike</code> / <code>isPlainObject</code> helper.', 'Why does <code>Function.prototype[Symbol.hasInstance]</code> have to be non-writable?']
      }
    }]
  });

  /* =========================== PRACTICE: EASY =========================== */
  practice.push({
    title: 'Split Own vs Inherited Keys',
    level: 'Easy', tags: ['for...in', 'Object.hasOwn', 'prototype chain'], companies: ['Amazon', 'Zoho', 'Swiggy'],
    statement: `<p>Write <code>splitKeys(obj)</code> that returns <code>{ own, inherited }</code>: two arrays with the <b>enumerable string keys</b> that <code>for...in</code> would visit, split by whether the key lives on the object itself or somewhere up its prototype chain. It must not crash on objects made with <code>Object.create(null)</code>.</p>`,
    constraints: `Keep the order in which <code>for...in</code> visits keys. Chain length ≤ 50. Shadowed keys must appear only once (as own).`,
    example: `<p><code>base = { kind: 'animal', describe() {} }</code>, <code>dog = Object.create(base)</code>, <code>dog.name = 'Rex'</code>, <code>dog.kind = 'dog'</code></p>
<p>Output: own = ${H.c('g', "['name', 'kind']")}, inherited = ${H.c('b', "['describe']")}. <code>kind</code> exists on both, but the own one <b>shadows</b> the inherited one, so <code>for...in</code> lists it once — as own.</p>`,
    brute: {
      why: `<p>The textbook loop uses <code>obj.hasOwnProperty(key)</code>. That method is <b>inherited from Object.prototype</b>, so on a null-prototype object it does not exist and the loop crashes. It can also be shadowed by an own property called <code>hasOwnProperty</code> (a classic trick in pentests and JSON payloads).</p>`,
      code: { lang: 'js', run: true, code: `function splitKeysBrute(obj) {
  const own = [], inherited = [];
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) own.push(key);   // relies on an INHERITED method
    else inherited.push(key);
  }
  return { own, inherited };
}
console.log(splitKeysBrute({ a: 1 }));                 // works on a normal object
const dict = Object.create(null);
dict.word = 3;
try { splitKeysBrute(dict); } catch (e) { console.log('crash:', e.message); }
console.log(splitKeysBrute({ hasOwnProperty: () => false, x: 1 })); // lies: x is reported as inherited` }
    },
    mcq: { q: 'An object has an own key <code>kind</code> and its prototype also has <code>kind</code>. How many times does <code>for...in</code> visit <code>kind</code>?', options: ['0', '1', '2', 'It depends on the engine'], answer: 1, explain: 'The spec de-duplicates: a key already seen (or shadowed by a non-enumerable own key) is skipped further up the chain. So it is visited once, and it is the own one.' },
    hints: [
      `<p>Hint 1: <code>for...in</code> already walks the whole chain for you and handles shadowing. You only need to classify each key.</p>`,
      `<p>Hint 2: use the static <code>Object.hasOwn(obj, key)</code> — it does not depend on anything inherited, so null-prototype objects and fake <code>hasOwnProperty</code> keys cannot fool it.</p>`,
      `<p>Hint 3: recipe — two arrays; <code>for (const key in obj)</code>: push into <code>own</code> if <code>Object.hasOwn</code>, else into <code>inherited</code>. Return both. Remember class methods are non-enumerable, so they never show up — that is correct behaviour.</p>`
    ],
    solution: {
      approach: `<p>Let <code>for...in</code> do the chain walking (it visits enumerable string keys of the object, then its prototype, and so on, skipping duplicates) and classify each key with <code>Object.hasOwn</code>, the only own-check that is safe on every object. Symbols and non-enumerable properties are intentionally excluded, matching <code>for...in</code>.</p>`,
      code: { lang: 'js', run: true, code: `function splitKeys(obj) {
  const own = [], inherited = [];
  for (const key in obj) {                      // own + inherited ENUMERABLE string keys
    (Object.hasOwn(obj, key) ? own : inherited).push(key);
  }
  return { own, inherited };
}

const base = { kind: 'animal', describe() { return 'I am ' + this.name; } };
const dog = Object.create(base);
dog.name = 'Rex';
dog.kind = 'dog';                               // shadows base.kind
console.log(splitKeys(dog));                    // { own: ['name','kind'], inherited: ['describe'] }

const dict = Object.create(null);               // no prototype at all
dict.apple = 2;
console.log(splitKeys(dict));                   // { own: ['apple'], inherited: [] }

class Cat { constructor() { this.lives = 9; } meow() {} }
console.log(splitKeys(new Cat()));              // meow is non-enumerable: { own: ['lives'], inherited: [] }
console.log(splitKeys({ hasOwnProperty: () => false, x: 1 })); // not fooled` },
      dry: { head: ['for...in visits', 'Object.hasOwn(dog, key)?', 'goes to'], rows: [['name', 'true', H.c('g', 'own')], ['kind', 'true', H.c('g', 'own')], ['kind (on base)', '—', H.c('m', 'skipped: already seen')], ['describe', 'false', H.c('b', 'inherited')]] },
      complexity: `<p>Time O(total enumerable keys along the chain), space O(keys) for the result.</p>`,
      followUps: ['Also include symbol keys and non-enumerable keys (use <code>Reflect.ownKeys</code> per level).', 'Return the depth at which each inherited key was found.', 'Why do linters flag <code>for...in</code> without an own-check (eslint <code>guard-for-in</code>)?']
    }
  });

  practice.push({
    title: 'Move Methods onto the Prototype',
    level: 'Easy', tags: ['constructor functions', 'prototype', 'memory'], companies: ['Microsoft', 'Paytm', 'Razorpay'],
    statement: `<p>A game creates 10,000 <code>Player</code> objects with a constructor function that assigns <code>this.addPoints = function () {...}</code> inside the constructor. Refactor it so all players <b>share one copy</b> of each method, then write the same thing as a <code>class</code>. Prove the sharing with <code>===</code>.</p>`,
    constraints: `Behaviour must not change: <code>addPoints(n)</code> adds to <code>score</code> and returns <code>this</code> (for chaining); <code>toString()</code> prints <code>"name: score"</code>. Own keys of each player must be only <code>name</code> and <code>score</code>.`,
    example: `<p>Before: ${H.c('r', 'a.addPoints === b.addPoints → false')} (10,000 function objects). After: ${H.c('g', 'a.addPoints === b.addPoints → true')} (1 function on <code>Player.prototype</code>, found by every player through the chain). <code>String(p.addPoints(5).addPoints(2))</code> → <code>"P1: 7"</code>.</p>`,
    brute: {
      why: `<p>Each <code>new Player()</code> runs the constructor body again, so a <b>brand-new function object</b> (plus its closure) is created per instance. 10,000 players = 10,000 identical functions: more memory, more GC work, and patching the method later means touching every object.</p>`,
      code: { lang: 'js', run: true, code: `function Player(name) {
  this.name = name;
  this.score = 0;
  this.addPoints = function (n) { this.score += n; return this; };  // new copy EVERY time
}
const a = new Player('A'), b = new Player('B');
console.log(a.addPoints === b.addPoints);   // false: two different functions
console.log(Object.keys(a));                // ['name', 'score', 'addPoints']` }
    },
    mcq: { q: 'After the refactor, where does the engine find <code>p.addPoints</code>?', options: ['On <code>p</code> itself', 'On <code>Player.prototype</code>, one hop up the chain', 'On <code>Player</code> (the function)', 'On <code>Object.prototype</code>'], answer: 1, explain: '<code>new Player()</code> links <code>p.[[Prototype]]</code> to <code>Player.prototype</code>. The lookup misses on <code>p</code>, climbs one hop and finds the shared method there.' },
    hints: [
      `<p>Hint 1: data that differs per player (name, score) stays in the constructor; behaviour that is identical moves out.</p>`,
      `<p>Hint 2: <code>Player.prototype.addPoints = function (n) {...}</code>. Inside it, <code>this</code> is still the player because it is called as <code>p.addPoints()</code>.</p>`,
      `<p>Hint 3: in a <code>class</code>, every method written in the body is automatically put on <code>Player.prototype</code> (and made non-enumerable). Do not use arrow functions for these methods — an arrow class field would be a per-instance copy again.</p>`
    ],
    solution: {
      approach: `<p>Keep per-instance state in the constructor and put shared behaviour on <code>Constructor.prototype</code>. All instances delegate to the same function via the prototype chain. The <code>class</code> syntax does exactly this for you — methods in the class body land on the prototype as non-enumerable properties.</p>`,
      code: { lang: 'js', run: true, code: `// ES5 style: methods on the prototype
function Player(name) {
  this.name = name;      // per-instance data
  this.score = 0;
}
Player.prototype.addPoints = function (n) { this.score += n; return this; };
Player.prototype.toString = function () { return this.name + ': ' + this.score; };

const players = Array.from({ length: 10000 }, (_, i) => new Player('P' + i));
console.log(players[0].addPoints === players[9999].addPoints); // true: ONE shared function
console.log(String(players[1].addPoints(5).addPoints(2)));     // P1: 7
console.log(Object.keys(players[0]));                          // ['name', 'score']

// Modern equivalent: class methods live on PlayerC.prototype automatically
class PlayerC {
  constructor(name) { this.name = name; this.score = 0; }
  addPoints(n) { this.score += n; return this; }
  toString() { return this.name + ': ' + this.score; }
}
const x = new PlayerC('X'), y = new PlayerC('Y');
console.log(x.addPoints === y.addPoints);                       // true
console.log(Object.getOwnPropertyNames(PlayerC.prototype));     // ['constructor','addPoints','toString']

// Trap: an arrow-function class FIELD is per-instance again
class PlayerArrow { score = 0; addPoints = (n) => { this.score += n; return this; }; }
console.log(new PlayerArrow().addPoints === new PlayerArrow().addPoints); // false` },
      dry: { head: ['step', 'what exists', 'function objects for addPoints'], rows: [['brute: new Player x 10,000', 'own addPoints on every object', H.c('r', '10,000')], ['refactor: define on prototype once', 'Player.prototype.addPoints', H.c('g', '1')], ['p.addPoints(5)', 'miss on p → hit on Player.prototype', H.c('g', '1 (shared)')]] },
      complexity: `<p>Memory for methods drops from O(N) to O(1); each call costs one extra chain hop, which V8 inline caches make practically free.</p>`,
      followUps: ['When is a per-instance arrow function actually the right choice (hint: passing <code>this.handleClick</code> as a callback)?', 'Measure the difference with <code>process.memoryUsage()</code> for 1M objects.', 'What happens to existing players if you later replace <code>Player.prototype.addPoints</code>?']
    }
  });

  practice.push({
    title: 'Fix the Shared-Array-on-the-Prototype Bug',
    level: 'Easy', tags: ['prototype', 'shared state', 'class fields'], companies: ['Uber', 'Meesho', 'Walmart'],
    statement: `<p>A teammate wrote a shopping <code>Basket</code> with the item list on the prototype "to save memory". Adding an apple to one basket makes it appear in <b>every</b> basket. Explain why reads and <code>push</code> hit the shared array while <code>this.count++</code> on a prototype number does <b>not</b> leak, then fix the class.</p>`,
    constraints: `Each basket must have its own independent <code>items</code> array. <code>add(x)</code> returns <code>this</code>. <code>total()</code> returns the item count.`,
    example: `<p><code>a.add('apple')</code>; then <code>b.items</code> → before the fix ${H.c('r', "['apple']")} (leak!); after the fix ${H.c('g', '[]')}.</p>`,
    brute: {
      why: `<p><code>this.items.push(x)</code> is a <b>read</b> of <code>this.items</code> (which climbs to the one shared array on the prototype) followed by a mutation of that array. No write to <code>this.items</code> ever happens, so no own property is created — every basket mutates the same object. By contrast <code>this.count++</code> is a <b>write</b> to <code>this.count</code>, which creates an own property and shadows the prototype's number.</p>`,
      code: { lang: 'js', run: true, code: `function Basket() {}
Basket.prototype.items = [];          // ONE array shared by all baskets
Basket.prototype.count = 0;           // a primitive on the prototype
Basket.prototype.add = function (x) {
  this.items.push(x);                 // read + mutate the shared array
  this.count++;                       // write: creates an OWN count on this basket
  return this;
};
const a = new Basket(), b = new Basket();
a.add('apple');
console.log(b.items);                          // ['apple']  <- the bug
console.log(a.count, b.count);                 // 1 0       <- primitives did not leak
console.log(Object.hasOwn(a, 'items'), Object.hasOwn(a, 'count')); // false true` }
    },
    mcq: { q: 'Which line creates an OWN property on the basket?', options: ['<code>this.items.push(x)</code>', '<code>this.items.length</code>', '<code>this.count++</code>', 'None of them'], answer: 2, explain: '<code>this.count++</code> is <code>this.count = this.count + 1</code> — an assignment to <code>this.count</code>, so <code>[[Set]]</code> defines an own property. <code>push</code> only reads <code>this.items</code> and mutates the array it got.' },
    hints: [
      `<p>Hint 1: ask of every line: "is this a write to a property of <code>this</code>, or a read followed by mutating whatever came back?"</p>`,
      `<p>Hint 2: mutable state (arrays, objects, Maps) must be created per instance — in the constructor or as a class field (<code>items = [];</code>), because field initialisers run once per <code>new</code>.</p>`,
      `<p>Hint 3: keep only shared, read-only things on the prototype: methods and true constants.</p>`
    ],
    solution: {
      approach: `<p>Create the array per instance. With a class, a field initialiser <code>items = []</code> is evaluated on every construction, so each basket gets its own array as an own property. Methods stay on the prototype.</p>`,
      code: { lang: 'js', run: true, code: `class Basket {
  items = [];                 // class field: a NEW array for every instance
  add(x) { this.items.push(x); return this; }
  total() { return this.items.length; }
}
const a = new Basket(), b = new Basket();
a.add('apple').add('pear');
console.log(a.items, b.items);                 // ['apple','pear'] []
console.log(a.total(), b.total());             // 2 0
console.log(Object.hasOwn(a, 'items'));        // true: own property now
console.log(a.add === b.add);                  // true: methods still shared

// ES5 fix, for comparison
function Basket5() { this.items = []; }       // per instance
Basket5.prototype.add = function (x) { this.items.push(x); return this; };
const c = new Basket5(), d = new Basket5();
c.add(1);
console.log(c.items, d.items);                 // [1] []` },
      dry: { head: ['line', 'kind of access', 'touches'], rows: [['this.items.push(x) (bug)', 'read, then mutate', H.c('r', 'shared prototype array')], ['this.count++', 'write', H.c('g', 'new own property')], ['items = [] (fix)', 'field defined per new', H.c('g', 'own array per basket')]] },
      complexity: `<p>O(1) per add; memory is O(items) per basket, which is what you want.</p>`,
      followUps: ['Is <code>static DEFAULT_ITEMS = []</code> safe? When would it leak?', 'Write a lint-style check that flags arrays/objects assigned to <code>X.prototype</code>.', 'How does Vue 2\'s "data must be a function" rule solve the same problem?']
    }
  });

  practice.push({
    title: 'Temperature: Static Factories and an Instance Counter',
    level: 'Easy', tags: ['static', 'private fields', 'factory'], companies: ['Google', 'Adobe', 'PhonePe'],
    statement: `<p>Build a <code>Temperature</code> class that stores degrees Celsius in a private field, exposes <code>celsius</code> and <code>fahrenheit</code> getters, and has static factories <code>fromFahrenheit(f)</code> and <code>fromKelvin(k)</code>. Also keep a <b>class-wide</b> counter of how many temperatures were ever created, readable through a static getter <code>Temperature.created</code> but not writable from outside.</p>`,
    constraints: `Constructor throws <code>TypeError</code> for non-numbers or <code>NaN</code>. Factories must also work on subclasses (a subclass factory returns a subclass instance).`,
    example: `<p><code>Temperature.fromFahrenheit(212).celsius</code> → ${H.c('g', '100')}; <code>Temperature.fromKelvin(0).toString()</code> → ${H.c('g', "'-273.1°C'")}; after creating 3 objects <code>Temperature.created</code> → ${H.c('g', '3')}; <code>Temperature.created = 99</code> has ${H.c('r', 'no effect')}.</p>`,
    brute: {
      why: `<p>Putting the counter on the instance (<code>this.count++</code>) gives every object its own counter that is always 1. A global variable works but anyone can overwrite it, and it is not tied to the class.</p>`,
      code: { lang: 'js', run: true, code: `class TemperatureBrute {
  count = 0;
  constructor(c) { this.c = c; this.count++; }     // per-instance: always 1
}
const t1 = new TemperatureBrute(10), t2 = new TemperatureBrute(20);
console.log(t1.count, t2.count);                  // 1 1 — not a class-wide count
console.log(t2.c = 'oops', t2.c);                 // public data, no validation` }
    },
    mcq: { q: 'Inside <code>static fromFahrenheit(f)</code>, why write <code>new this(...)</code> rather than <code>new Temperature(...)</code>?', options: ['It is faster', 'In a static method called as <code>Sub.fromFahrenheit()</code>, <code>this</code> is <code>Sub</code>, so the factory builds the right subclass', 'Because <code>Temperature</code> is not defined inside the class', 'There is no difference'], answer: 1, explain: 'Static methods are called on the class, so <code>this</code> is whatever class was used in the call — <code>Temperature</code> or a subclass. <code>new this()</code> respects that.' },
    hints: [
      `<p>Hint 1: anything shared by the whole class (counters, caches, factories) belongs to the class object itself: <code>static</code>.</p>`,
      `<p>Hint 2: <code>static #created = 0</code> + <code>static get created()</code> gives read-only access from outside.</p>`,
      `<p>Hint 3: access the private static as <code>Temperature.#created</code>, not <code>this.#created</code>: when a subclass calls the static method, <code>this</code> is the subclass, which does <b>not</b> have the private static slot → TypeError.</p>`
    ],
    solution: {
      approach: `<p>Instance state (<code>#celsius</code>) is a private instance field; class-wide state (<code>#created</code>) is a private static field exposed through a static getter. Factories are static methods that convert units and call <code>new this(...)</code> so subclasses inherit working factories through the constructor chain (<code>Object.getPrototypeOf(Sub) === Temperature</code>).</p>`,
      code: { lang: 'js', run: true, code: `class Temperature {
  static #created = 0;                       // class-wide, private
  static get created() { return Temperature.#created; }   // read-only view

  static fromFahrenheit(f) { return new this((f - 32) * 5 / 9); }
  static fromKelvin(k) { return new this(k - 273.15); }

  #celsius;                                  // per instance, private
  constructor(celsius) {
    if (typeof celsius !== 'number' || Number.isNaN(celsius)) {
      throw new TypeError('celsius must be a number, got ' + celsius);
    }
    this.#celsius = celsius;
    Temperature.#created++;                  // NOT this.#created (subclass-safe)
  }
  get celsius() { return this.#celsius; }
  get fahrenheit() { return this.#celsius * 9 / 5 + 32; }
  toString() { return this.#celsius.toFixed(1) + '°C'; }
}

class LabTemperature extends Temperature {
  toString() { return '[lab] ' + super.toString(); }
}

console.log(Temperature.fromFahrenheit(212).celsius);   // 100
console.log(Temperature.fromKelvin(0).toString());      // -273.1°C
const lab = LabTemperature.fromFahrenheit(32);          // static inherited, builds a LabTemperature
console.log(lab instanceof LabTemperature, String(lab)); // true [lab] 0.0°C
console.log(new Temperature(25).fahrenheit);            // 77
try { Temperature.created = 99; }                       // getter only: ignored (sloppy) or TypeError (strict)
catch (e) { console.log('cannot write created:', e.name); }
console.log(Temperature.created);                       // 4
try { new Temperature('hot'); } catch (e) { console.log(e.name + ': ' + e.message); }` },
      dry: { head: ['call', 'this inside static', 'object built', 'created'], rows: [['Temperature.fromFahrenheit(212)', 'Temperature', 'Temperature(100)', '1'], ['Temperature.fromKelvin(0)', 'Temperature', 'Temperature(-273.15)', '2'], ['LabTemperature.fromFahrenheit(32)', 'LabTemperature', 'LabTemperature(0)', '3'], ['new Temperature(25)', '—', 'Temperature(25)', H.c('g', '4')]] },
      complexity: `<p>All operations O(1).</p>`,
      followUps: ['Add a static cache so <code>Temperature.of(0)</code> returns the same frozen object every time.', 'Make <code>Temperature</code> sortable: implement <code>static compare(a, b)</code>.', 'Why would <code>this.#created++</code> inside the constructor be a bug?']
    }
  });

  /* =========================== PRACTICE: MEDIUM =========================== */
  practice.push({
    title: 'Method Resolution Table for a Class Hierarchy',
    level: 'Medium', tags: ['Reflect.ownKeys', 'descriptors', 'inheritance', 'tooling'], companies: ['Atlassian', 'Microsoft', 'Postman'],
    statement: `<p>Write <code>methodTable(Cls)</code> that lists every member reachable from instances of <code>Cls</code> through the prototype chain (stop before <code>Object.prototype</code>). For each name return <code>{ name, kind, definedIn, overrides }</code> where <code>kind</code> is <code>'method'</code>, <code>'getter/setter'</code> or <code>'data'</code>, <code>definedIn</code> is the class whose prototype provides the member <b>that will actually run</b>, and <code>overrides</code> lists the ancestor classes whose same-named member is shadowed. Skip <code>constructor</code>.</p>`,
    constraints: `Must see class methods (they are non-enumerable) and symbol-keyed methods such as <code>[Symbol.iterator]</code>. Hierarchy depth ≤ 20.`,
    example: `<p><code>class Animal { speak(){} get legs(){} }</code>, <code>class Dog extends Animal { speak(){} fetch(){} }</code></p>
<p>Output for Dog: ${H.c('g', "speak → Dog (overrides Animal)")}, ${H.c('g', 'fetch → Dog')}, ${H.c('b', 'legs → Animal, getter/setter')}. Exactly what a property read would find: the <b>first</b> owner on the chain wins.</p>`,
    brute: {
      why: `<p><code>Object.keys(Cls.prototype)</code> and <code>for...in</code> both return <b>nothing</b>, because class methods are defined as non-enumerable. They also skip symbol keys and ignore everything above the first level.</p>`,
      code: { lang: 'js', run: true, code: `class Animal { speak() { return '...'; } }
class Dog extends Animal { speak() { return 'Woof'; } fetch() {} }
console.log(Object.keys(Dog.prototype));          // []  class methods are non-enumerable
const seen = [];
for (const k in new Dog()) seen.push(k);
console.log(seen);                                 // []  for...in sees nothing either` }
    },
    mcq: { q: 'Which call lists ALL own keys of a prototype object, including non-enumerable and symbol keys?', options: ['<code>Object.keys(p)</code>', '<code>Object.getOwnPropertyNames(p)</code>', '<code>Reflect.ownKeys(p)</code>', '<code>Object.entries(p)</code>'], answer: 2, explain: '<code>Object.keys</code>/<code>entries</code> are enumerable strings only; <code>getOwnPropertyNames</code> includes non-enumerables but not symbols; <code>Reflect.ownKeys</code> returns both strings and symbols, enumerable or not.' },
    hints: [
      `<p>Hint 1: walk <code>p = Cls.prototype</code>, then <code>Object.getPrototypeOf(p)</code>, until you reach <code>Object.prototype</code> or <code>null</code>.</p>`,
      `<p>Hint 2: at each level, <code>Reflect.ownKeys(p)</code> + <code>Object.getOwnPropertyDescriptor(p, key)</code> tells you the kind: <code>typeof d.value === 'function'</code> → method; <code>d.get || d.set</code> → accessor; else data.</p>`,
      `<p>Hint 3: use a <code>Map</code> keyed by property key. The first time you see a key, that level is the winner (<code>definedIn</code>); every later sighting is an ancestor it overrides. Name the level by <code>p.constructor.name</code> when <code>p</code> owns a <code>constructor</code>.</p>`
    ],
    solution: {
      approach: `<p>Walk the prototype chain from most-derived to least-derived, enumerating <b>all</b> own keys at each level with <code>Reflect.ownKeys</code>. The first level that owns a key is the one a lookup would use, so record it as <code>definedIn</code>; later levels with the same key are pushed into <code>overrides</code>. Descriptors reveal the member kind without calling getters.</p>`,
      code: { lang: 'js', run: true, code: `function methodTable(Cls) {
  const rows = new Map();                                   // key -> row (insertion order kept)
  let p = Cls.prototype;
  while (p !== null && p !== Object.prototype) {
    const owner = Object.hasOwn(p, 'constructor') ? p.constructor.name : '(anonymous)';
    for (const key of Reflect.ownKeys(p)) {                 // strings + symbols, enumerable or not
      if (key === 'constructor') continue;
      const d = Object.getOwnPropertyDescriptor(p, key);    // read descriptor: never runs a getter
      const kind = typeof d.value === 'function' ? 'method' : (d.get || d.set) ? 'getter/setter' : 'data';
      const name = typeof key === 'symbol' ? key.toString() : key;
      if (!rows.has(key)) rows.set(key, { name, kind, definedIn: owner, overrides: [] });
      else rows.get(key).overrides.push(owner);             // shadowed ancestor
    }
    p = Object.getPrototypeOf(p);
  }
  return [...rows.values()];
}

class Animal {
  speak() { return '...'; }
  get legs() { return 4; }
  toString() { return 'Animal'; }
}
class Dog extends Animal {
  speak() { return 'Woof'; }
  fetch() { return 'ball'; }
  *[Symbol.iterator]() { yield 'tail'; }
}
class Puppy extends Dog {
  speak() { return 'Yip'; }
}
for (const r of methodTable(Puppy)) {
  console.log(r.name.padEnd(22), r.kind.padEnd(14), 'from ' + r.definedIn,
              r.overrides.length ? '(overrides ' + r.overrides.join(', ') + ')' : '');
}
console.log(new Puppy().speak());   // Yip: matches the table's definedIn` },
      dry: { head: ['level (p)', 'keys found', 'table change'], rows: [['Puppy.prototype', 'speak', 'speak → Puppy'], ['Dog.prototype', 'speak, fetch, Symbol.iterator', 'speak.overrides += Dog; add fetch, Symbol.iterator'], ['Animal.prototype', 'speak, legs, toString', 'speak.overrides += Animal; add legs, toString'], ['Object.prototype', '—', H.c('m', 'stop')]] },
      complexity: `<p>Time O(total own keys along the chain), space O(distinct keys).</p>`,
      followUps: ['Also list static members by walking the constructor chain (<code>Object.getPrototypeOf(Dog) === Animal</code>).', 'Flag "accidental overrides": a subclass method that shadows a parent getter.', 'Why can you never list <code>#private</code> members this way?']
    }
  });

  practice.push({
    title: 'Abstract Base Class with new.target',
    level: 'Medium', tags: ['new.target', 'abstract class', 'template method', 'polymorphism'], companies: ['Amazon', 'Salesforce', 'Intuit'],
    statement: `<p>JavaScript has no <code>abstract</code> keyword. Build a <code>Shape</code> base class that (1) cannot be instantiated directly, (2) refuses to construct any subclass that did not implement <code>area()</code> — failing <b>at construction time</b>, not later, and (3) provides a template method <code>describe()</code> that calls the subclass's <code>area()</code>. Then implement <code>Circle</code> (private radius) and <code>Square</code> and sort a mixed list by area.</p>`,
    constraints: `A grandchild class that inherits <code>area()</code> from its parent is valid. Do not call <code>area()</code> inside the constructor (subclass fields are not initialised yet).`,
    example: `<p><code>new Shape()</code> → ${H.c('r', 'TypeError: Shape is abstract')}; <code>class Blob extends Shape {}; new Blob()</code> → ${H.c('r', 'TypeError: Blob must implement area()')}; <code>new Circle(1).describe()</code> → ${H.c('g', "'circle with area 3.14'")}.</p>`,
    brute: {
      why: `<p>The naive base class only throws inside <code>area()</code>. A broken subclass constructs fine and explodes much later, far from the bug (maybe in production, maybe only on one code path). It also allows <code>new Shape()</code>.</p>`,
      code: { lang: 'js', run: true, code: `class Shape {
  area() { throw new Error('not implemented'); }
  describe() { return 'area ' + this.area(); }
}
class Blob extends Shape {}                 // forgot area()
const b = new Blob();                       // no error here...
const s = new Shape();                      // ...or here
try { b.describe(); } catch (e) { console.log('late failure:', e.message); }` }
    },
    mcq: { q: 'Inside <code>Shape</code>\'s constructor during <code>new Square(2)</code>, what is <code>new.target</code>?', options: ['<code>Shape</code>', '<code>Square</code>', '<code>undefined</code>', 'The new object'], answer: 1, explain: '<code>new.target</code> is the constructor that <code>new</code> was applied to, and it is passed along through <code>super()</code> calls. So the base sees the most-derived class — that is also how the new object gets <code>Square.prototype</code> as its prototype.' },
    hints: [
      `<p>Hint 1: <code>if (new.target === Shape) throw ...</code> blocks direct instantiation while allowing subclasses.</p>`,
      `<p>Hint 2: to check "did someone override <code>area</code>?", compare <b>references</b>: <code>this.area === Shape.prototype.area</code>. The lookup on <code>this</code> climbs from the most-derived prototype, so an inherited override from a middle class also counts.</p>`,
      `<p>Hint 3: comparing references never runs subclass code, so it is safe even though subclass fields (like <code>#r</code>) do not exist yet.</p>`
    ],
    solution: {
      approach: `<p>Use <code>new.target</code> to reject the base class itself, and a reference comparison on the prototype chain to reject subclasses that did not override <code>area</code>. Because <code>this</code> already has the subclass prototype at the start of the base constructor, <code>this.area</code> resolves to the most-derived implementation without executing it. <code>describe()</code> is a template method: the base defines the algorithm, subclasses fill in the step.</p>`,
      code: { lang: 'js', run: true, code: `class Shape {
  constructor(name) {
    if (new.target === Shape) throw new TypeError('Shape is abstract: instantiate a subclass');
    if (this.area === Shape.prototype.area) {          // reference check, does not call area()
      throw new TypeError(new.target.name + ' must implement area()');
    }
    this.name = name;
  }
  area() { throw new Error('abstract'); }
  describe() { return this.name + ' with area ' + this.area().toFixed(2); }   // template method
}

class Circle extends Shape {
  #r;
  constructor(r) { super('circle'); this.#r = r; }     // #r exists only AFTER super() returns
  area() { return Math.PI * this.#r ** 2; }
}
class Square extends Shape {
  constructor(side) { super('square'); this.side = side; }
  area() { return this.side ** 2; }
}
class Cube extends Square {                            // inherits area() from Square: valid
  constructor(side) { super(side); this.name = 'cube face'; }
}

for (const make of [() => new Shape('x'), () => { class Blob extends Shape {} return new Blob('blob'); }]) {
  try { make(); } catch (e) { console.log(e.name + ': ' + e.message); }
}
const shapes = [new Square(3), new Circle(1), new Cube(2), new Circle(2)];
shapes.sort((a, b) => a.area() - b.area());
for (const s of shapes) console.log(s.describe());` },
      dry: { head: ['call', 'new.target', 'this.area resolves to', 'result'], rows: [['new Shape()', 'Shape', '—', H.c('r', 'TypeError: abstract')], ['new Blob()', 'Blob', 'Shape.prototype.area', H.c('r', 'TypeError: must implement')], ['new Circle(1)', 'Circle', 'Circle.prototype.area', H.c('g', 'ok')], ['new Cube(2)', 'Cube', 'Square.prototype.area (inherited)', H.c('g', 'ok')]] },
      complexity: `<p>Construction check O(chain depth); sorting O(n log n) area calls.</p>`,
      followUps: ['Generalise: <code>static abstract = [\'area\', \'perimeter\']</code> checked in the base constructor.', 'How does TypeScript\'s <code>abstract</code> keyword differ (compile-time only, erased at runtime)?', 'Why is calling <code>this.area()</code> from the base constructor dangerous for <code>Circle</code>?']
    }
  });

  practice.push({
    title: 'Mixins with Class Factories',
    level: 'Medium', tags: ['mixins', 'extends expression', 'super', 'composition'], companies: ['Microsoft', 'Shopify', 'LinkedIn'],
    statement: `<p>JavaScript classes have single inheritance, but <code>extends</code> accepts <b>any expression</b>. Write two mixins as class factories — <code>Serializable(Base)</code> (adds <code>serialize()</code> returning JSON with a <code>type</code> tag) and <code>Eventful(Base)</code> (adds <code>on(event, fn)</code>/<code>emit(event, ...args)</code> with <b>private</b> listener storage) — and compose them into <code>class User extends Serializable(Eventful(Model))</code>. Print the resulting prototype chain.</p>`,
    constraints: `Mixins must cooperate through <code>super</code> (each may override and call the next). Private listener state must not appear in the JSON.`,
    example: `<p><code>u.rename('Bo')</code> fires <code>'rename'</code> listeners; <code>u.serialize()</code> → ${H.c('g', '{"type":"User","name":"Bo","age":30}')}. Chain: ${H.c('b', 'User → Serializable → Eventful → Model → Object')}.</p>`,
    brute: {
      why: `<p>The classic "object mixin" copies methods with <code>Object.assign(User.prototype, mixin)</code>. It is a one-time <b>snapshot</b>: <code>Object.assign</code> <i>invokes getters</i> and stores their current value, the last mixin silently overwrites name clashes, <code>super</code> cannot reach the "previous" implementation, and there is nowhere to keep truly private state.</p>`,
      code: { lang: 'js', run: true, code: `const TimestampMixin = {
  get createdAt() { return Date.now(); },              // meant to be live
  describe() { return 'mixin describe'; }
};
const LoggerMixin = { describe() { return 'logger describe'; } };
class User { describe() { return 'user describe'; } }
Object.assign(User.prototype, TimestampMixin, LoggerMixin);
const d = Object.getOwnPropertyDescriptor(User.prototype, 'createdAt');
console.log('getter kept?', typeof d.get === 'function');   // false: flattened to a number
console.log(new User().describe());                        // logger describe: user's own was overwritten` }
    },
    mcq: { q: 'In <code>class User extends Serializable(Eventful(Model))</code>, how many objects sit between <code>User.prototype</code> and <code>Model.prototype</code> in the chain?', options: ['0 — methods are copied', '1', '2 — one prototype per mixin class', 'It depends on how many methods the mixins have'], answer: 2, explain: 'Each factory call creates a real class whose prototype is a link in the chain: User.prototype → Serializable-class.prototype → Eventful-class.prototype → Model.prototype.' },
    hints: [
      `<p>Hint 1: a mixin is just <code>const M = (Base) =&gt; class extends Base { ... }</code>. Calling it creates a new subclass of whatever base you pass in.</p>`,
      `<p>Hint 2: give the inner class a name (<code>class Serializable extends Base</code>) so stack traces and <code>constructor.name</code> are readable.</p>`,
      `<p>Hint 3: private fields declared in the mixin (<code>#handlers = new Map()</code>) are installed when <code>super()</code> chains through that class — and <code>JSON.stringify</code>/spread never see them.</p>`
    ],
    solution: {
      approach: `<p>Each mixin is a function that takes a base class and returns a subclass of it. Composing calls nests real classes, so you get a genuine prototype chain: methods are shared (not copied), <code>super</code> works across mixins, getters stay live, and each mixin can own private fields. The order of composition is the method resolution order.</p>`,
      code: { lang: 'js', run: true, code: `const Eventful = (Base) => class Eventful extends Base {
  #handlers = new Map();                                  // truly private per instance
  on(event, fn) {
    if (!this.#handlers.has(event)) this.#handlers.set(event, []);
    this.#handlers.get(event).push(fn);
    return this;
  }
  emit(event, ...args) {
    for (const fn of this.#handlers.get(event) || []) fn.apply(this, args);
    return this;
  }
};

const Serializable = (Base) => class Serializable extends Base {
  toJSON() { return { type: this.constructor.name, ...this }; }  // own enumerable props only
  serialize() { return JSON.stringify(this); }
  describe() { return 'serializable ' + super.describe(); }      // cooperates via super
};

class Model {
  constructor(props) { Object.assign(this, props); }
  describe() { return 'model'; }
}

class User extends Serializable(Eventful(Model)) {
  rename(name) {
    const old = this.name;
    this.name = name;
    return this.emit('rename', old, name);
  }
}

const u = new User({ name: 'Al', age: 30 });
u.on('rename', (from, to) => console.log('renamed', from, '->', to));
u.rename('Bo');
console.log(u.serialize());             // {"type":"User","name":"Bo","age":30}
console.log(u.describe());              // serializable model
console.log(u instanceof Model);        // true

const names = [];
for (let p = Object.getPrototypeOf(u); p; p = Object.getPrototypeOf(p)) names.push(p.constructor.name);
console.log(names.join(' -> '));        // User -> Serializable -> Eventful -> Model -> Object` },
      dry: { head: ['step', 'what happens'], rows: [['Eventful(Model)', 'creates class Eventful extends Model'], ['Serializable(…)', 'creates class Serializable extends that Eventful'], ['new User(props)', 'super() chain: Serializable → Eventful (installs #handlers) → Model (assigns props)'], ['u.describe()', 'miss on User.prototype → Serializable.describe → super → Model.describe'], ['u.serialize()', H.c('g', 'toJSON spreads own props only; #handlers invisible')]] },
      complexity: `<p>Each mixin adds one prototype hop per lookup (cached by inline caches). Applying a mixin creates a new class each call — memoise it if the same combination is built often.</p>`,
      followUps: ['Make <code>u instanceof Eventful</code> work by adding a <code>Symbol.hasInstance</code> brand to the factory.', 'Memoise mixin applications with a <code>WeakMap&lt;Base, Mixed&gt;</code>.', 'How do TypeScript mixins type the <code>Base</code> parameter (<code>new (...args: any[]) =&gt; {}</code>)?']
    }
  });

  practice.push({
    title: 'Deep Clone That Keeps Prototypes and Accessors',
    level: 'Medium', tags: ['Object.create', 'descriptors', 'WeakMap', 'cycles'], companies: ['Google', 'Flipkart', 'Atlassian'],
    statement: `<p>Write <code>cloneDeep(value)</code> that copies objects <b>without losing their identity as class instances</b>: the clone must have the same prototype (so methods and <code>instanceof</code> still work), keep getters/setters as accessors, keep non-enumerable and read-only properties, deep-copy nested data, handle <code>Date</code>, <code>Map</code>, <code>Set</code>, arrays and <b>cycles</b>.</p>`,
    constraints: `Functions are shared, not copied. Objects with <code>#private</code> fields cannot be truly cloned this way — detect nothing, but document the limitation. Depth ≤ 1000.`,
    example: `<p><code>p = new Point(1, 2)</code> with a getter <code>len</code> and a non-enumerable <code>id</code>. <code>{...p}</code> → ${H.c('r', 'plain object, no methods, len frozen to a number, id lost')}. <code>cloneDeep(p)</code> → ${H.c('g', 'Point instance, getter still live, id kept')}.</p>`,
    brute: {
      why: `<p>Spread, <code>Object.assign</code> and <code>JSON.parse(JSON.stringify(x))</code> all produce <b>plain objects</b>: the prototype is gone, getters are evaluated once and replaced by values, non-enumerable properties vanish, and JSON also breaks Dates, Maps, <code>undefined</code> and cycles. <code>structuredClone</code> handles cycles and Dates but also drops the prototype.</p>`,
      code: { lang: 'js', run: true, code: `class Point {
  constructor(x, y) { this.x = x; this.y = y; Object.defineProperty(this, 'id', { value: 7, enumerable: false }); }
  get len() { return Math.hypot(this.x, this.y); }
  norm() { return this.len; }
}
const p = new Point(3, 4);
const s = { ...p };
console.log(s instanceof Point, typeof s.norm, s.id);       // false undefined undefined
const sc = structuredClone(p);
console.log(sc instanceof Point, Object.keys(sc));          // false ['x','y']` }
    },
    mcq: { q: 'Which expression makes a SHALLOW clone with the same prototype and exact property descriptors?', options: ['<code>{ ...obj }</code>', '<code>Object.assign(Object.create(Object.getPrototypeOf(obj)), obj)</code>', '<code>Object.create(Object.getPrototypeOf(obj), Object.getOwnPropertyDescriptors(obj))</code>', '<code>structuredClone(obj)</code>'], answer: 2, explain: '<code>Object.create(proto, descriptors)</code> sets the prototype and defines each property exactly as described: accessors stay accessors, non-enumerable stays non-enumerable. The <code>Object.assign</code> version keeps the prototype but still flattens getters and skips non-enumerables.' },
    hints: [
      `<p>Hint 1: the one-liner shallow version is <code>Object.create(Object.getPrototypeOf(o), Object.getOwnPropertyDescriptors(o))</code>. Go deep by cloning each descriptor's <code>value</code> recursively.</p>`,
      `<p>Hint 2: a <code>WeakMap</code> from original → clone, filled <b>before</b> recursing, makes cycles (and shared references) work.</p>`,
      `<p>Hint 3: built-ins with internal slots (<code>Date</code>, <code>Map</code>, <code>Set</code>) cannot be rebuilt from properties — handle them explicitly before the generic object branch. Arrays: start from <code>[]</code> so the clone is a real array.</p>`
    ],
    solution: {
      approach: `<p>Recursive clone with a <code>WeakMap</code> memo. Primitives and functions return as-is. Special-case <code>Date</code>, <code>Map</code>, <code>Set</code> and arrays. For everything else create an empty object with the <b>same prototype</b>, register it in the memo, then copy each own descriptor (strings and symbols): data descriptors get their <code>value</code> cloned deeply, accessor descriptors are copied as-is so getters stay live. Finally mirror frozen/sealed state.</p>`,
      code: { lang: 'js', run: true, code: `function cloneDeep(value, seen = new WeakMap()) {
  if (value === null || typeof value !== 'object') return value;   // primitives, functions
  if (seen.has(value)) return seen.get(value);                       // cycle / shared ref

  if (value instanceof Date) return new Date(value.getTime());
  if (value instanceof Map) {
    const m = new Map(); seen.set(value, m);
    for (const [k, v] of value) m.set(cloneDeep(k, seen), cloneDeep(v, seen));
    return m;
  }
  if (value instanceof Set) {
    const s = new Set(); seen.set(value, s);
    for (const v of value) s.add(cloneDeep(v, seen));
    return s;
  }
  const out = Array.isArray(value) ? [] : Object.create(Object.getPrototypeOf(value));
  seen.set(value, out);                                              // register BEFORE recursing
  const descs = Object.getOwnPropertyDescriptors(value);
  for (const key of Reflect.ownKeys(descs)) {
    const d = descs[key];
    if ('value' in d) d.value = cloneDeep(d.value, seen);            // deep-copy data
    Object.defineProperty(out, key, d);                              // accessors stay accessors
  }
  if (Object.isFrozen(value)) Object.freeze(out);
  else if (Object.isSealed(value)) Object.seal(out);
  return out;
}

class Point {
  constructor(x, y) { this.x = x; this.y = y; Object.defineProperty(this, 'id', { value: 7, enumerable: false }); }
  get len() { return Math.hypot(this.x, this.y); }
}
const p = new Point(3, 4);
const c = cloneDeep(p);
console.log(c instanceof Point, c.len, c.id, c !== p);             // true 5 7 true
c.x = 6; c.y = 8;
console.log(c.len, p.len);                                          // 10 5 (independent, getter live)

const graph = { name: 'root', when: new Date(0), tags: new Set(['a']), kids: [] };
graph.kids.push({ parent: graph });                                // cycle
const g2 = cloneDeep(graph);
console.log(g2.kids[0].parent === g2, g2.when.getTime(), g2.tags.has('a'), g2.tags !== graph.tags);

class Secret { #v = 1; get v() { return this.#v; } }
try { cloneDeep(new Secret()).v; } catch (e) { console.log('private fields are not cloneable:', e.name); }` },
      dry: { head: ['visit', 'branch', 'memo after'], rows: [['graph', 'generic object (proto Object.prototype)', 'graph→g2'], ['graph.when', 'Date', '—'], ['graph.tags', 'Set', 'tags→tags2'], ['graph.kids', 'array', 'kids→kids2'], ['kids[0]', 'generic object', '…'], ['kids[0].parent', H.c('g', 'memo hit → g2'), 'cycle closed']] },
      complexity: `<p>Time O(n) over all reachable properties; space O(n) for the memo and the copy.</p>`,
      followUps: ['Let classes customise cloning with a <code>[Symbol.for(\'clone\')]()</code> method (how Immer/structuredClone-like libraries do it).', 'Why does cloning a <code>#private</code>-based object always fail, and what is the idiomatic alternative (a <code>clone()</code> method inside the class)?', 'Add support for typed arrays and <code>RegExp</code>.']
    }
  });

  practice.push({
    title: 'Private-State Stack with MinStack Subclass',
    level: 'Medium', tags: ['#private', 'brand check', 'Symbol.iterator', 'super'], companies: ['Amazon', 'Bloomberg', 'Goldman Sachs'],
    statement: `<p>Implement a <code>Stack</code> whose storage is a <b>private</b> field, with <code>push</code> (chainable), <code>pop</code> (throws <code>RangeError</code> when empty), <code>peek</code>, a <code>size</code> getter, iteration from top to bottom, <code>static from(iterable)</code> and <code>static isStack(x)</code> using an ergonomic brand check. Then write <code>MinStack extends Stack</code> with O(1) <code>min()</code>. Show why the underscore convention (<code>_items</code>) is not enough.</p>`,
    constraints: `<code>MinStack.from([5, 2, 8])</code> must return a <code>MinStack</code>. Outside code must not be able to break the min invariant.`,
    example: `<p><code>MinStack.from([5, 2, 8]).min()</code> → ${H.c('g', '2')}; after one <code>pop()</code> and another <code>pop()</code>, <code>min()</code> → ${H.c('g', '5')}. <code>[...Stack.from([1,2,3])]</code> → ${H.c('g', '[3, 2, 1]')}. <code>Stack.isStack({})</code> → ${H.c('r', 'false')}.</p>`,
    brute: {
      why: `<p>With <code>this._items</code> anyone can reach in and mutate the array (<code>s._items.length = 0</code>), silently breaking <code>MinStack</code>'s parallel min-array invariant. "Private by convention" is a promise, not a guarantee.</p>`,
      code: { lang: 'js', run: true, code: `class StackU { constructor() { this._items = []; } push(x) { this._items.push(x); return this; } pop() { return this._items.pop(); } }
class MinStackU extends StackU {
  constructor() { super(); this._mins = []; }
  push(x) { super.push(x); this._mins.push(Math.min(x, this._mins.length ? this._mins[this._mins.length - 1] : x)); return this; }
  min() { return this._mins[this._mins.length - 1]; }
}
const s = new MinStackU().push(5).push(1);
s._items.length = 0;                       // outside code "helps"
console.log(s.pop(), s.min());             // undefined 1  <- invariant broken` }
    },
    mcq: { q: 'What does <code>#items in obj</code> do?', options: ['Checks for a public property named "#items"', 'Returns true only if <code>obj</code> was constructed by this class (it has the private slot), without throwing', 'Throws if <code>obj</code> is not a Stack', 'Reads the private field'], answer: 1, explain: 'The ergonomic brand check (ES2022) tests for the private name. It never throws for objects lacking it (it does throw if the right side is not an object), and it cannot be faked with <code>Object.create(Stack.prototype)</code>.' },
    hints: [
      `<p>Hint 1: <code>#items = []</code> as a field; all methods use <code>this.#items</code>. Accessing it on a non-Stack throws <code>TypeError</code> — a free brand check.</p>`,
      `<p>Hint 2: <code>static from(it) { const s = new this(); ... }</code> — <code>this</code> is the class the method was called on, so subclasses work. The subclass keeps its own <code>#mins</code>; it cannot see the parent's <code>#items</code> and does not need to.</p>`,
      `<p>Hint 3: <code>MinStack.push(x)</code>: <code>super.push(x)</code>, then push <code>min(x, current min)</code>. <code>pop()</code>: call <code>super.pop()</code> first (it throws on empty), then pop <code>#mins</code>.</p>`
    ],
    solution: {
      approach: `<p>Hard-private fields enforce encapsulation at the language level: only code lexically inside the class body can read <code>#items</code>, and the subclass maintains its own private <code>#mins</code>, coordinating only through the public/protected-by-convention API (<code>super.push</code>/<code>super.pop</code>). <code>static from</code> uses <code>new this()</code> so it is inherited correctly, and <code>#items in x</code> is an unforgeable brand check.</p>`,
      code: { lang: 'js', run: true, code: `class Stack {
  #items = [];
  static from(iterable) {
    const s = new this();                    // subclass-aware
    for (const x of iterable) s.push(x);     // virtual call: MinStack.push for MinStack
    return s;
  }
  static isStack(x) { return typeof x === 'object' && x !== null && #items in x; }
  push(x) { this.#items.push(x); return this; }
  pop() {
    if (this.#items.length === 0) throw new RangeError('pop from empty stack');
    return this.#items.pop();
  }
  peek() { return this.#items[this.#items.length - 1]; }
  get size() { return this.#items.length; }
  *[Symbol.iterator]() { for (let i = this.#items.length - 1; i >= 0; i--) yield this.#items[i]; }
  toString() { return 'Stack(' + [...this].join(', ') + ')'; }
}

class MinStack extends Stack {
  #mins = [];                                  // its own private slot
  push(x) {
    super.push(x);
    const m = this.#mins.length ? Math.min(x, this.#mins[this.#mins.length - 1]) : x;
    this.#mins.push(m);
    return this;
  }
  pop() {
    const v = super.pop();                     // throws first if empty, keeping arrays in sync
    this.#mins.pop();
    return v;
  }
  min() {
    if (this.size === 0) throw new RangeError('min of empty stack');
    return this.#mins[this.#mins.length - 1];
  }
}

const ms = MinStack.from([5, 2, 8]);
console.log(ms instanceof MinStack, ms.min(), String(ms));   // true 2 Stack(8, 2, 5)
ms.pop(); ms.pop();
console.log(ms.min(), ms.size);                              // 5 1
console.log([...Stack.from([1, 2, 3])]);                     // [3, 2, 1]
console.log(Stack.isStack(ms), Stack.isStack({}), Stack.isStack(Object.create(Stack.prototype))); // true false false
console.log(ms._items, Object.keys(ms));                     // undefined []  nothing to tamper with
try { new Stack().pop(); } catch (e) { console.log(e.name + ': ' + e.message); }` },
      dry: { head: ['op', '#items (Stack)', '#mins (MinStack)', 'min()'], rows: [['push 5', '[5]', '[5]', '5'], ['push 2', '[5,2]', '[5,2]', '2'], ['push 8', '[5,2,8]', '[5,2,2]', '2'], ['pop → 8', '[5,2]', '[5,2]', '2'], ['pop → 2', '[5]', '[5]', H.c('g', '5')]] },
      complexity: `<p>All operations O(1) (amortised for push); iteration O(n). Extra O(n) space for the min array.</p>`,
      followUps: ['Reduce MinStack memory by storing <code>[value, count]</code> runs in <code>#mins</code>.', 'Why can\'t <code>MinStack</code> read <code>this.#items</code> even though it extends <code>Stack</code>?', 'How would you expose a "protected" hook to subclasses without making it public?']
    }
  });

  practice.push({
    title: 'Fix the Overridden-Method-in-Parent-Constructor Bug',
    level: 'Medium', tags: ['class fields', 'initialisation order', 'super', 'factory'], companies: ['Meta', 'Atlassian', 'Swiggy'],
    statement: `<p>A UI base class calls <code>this.render()</code> from its constructor. A subclass <code>Label</code> declares a field <code>text = 'Hello'</code> and overrides <code>render()</code> to print it — but it prints <code>undefined</code>. Explain the exact construction order that causes this, then redesign so subclasses can rely on their fields during the first render.</p>`,
    constraints: `Keep the "render once on creation" behaviour for callers. Do not use timers or microtasks to defer rendering.`,
    example: `<p><code>new Label()</code> today prints ${H.c('r', "'Label: undefined'")}. After the fix, <code>Label.create()</code> prints ${H.c('g', "'Label: Hello'")} and <code>Label.create({ text: 'Hi' })</code> prints ${H.c('g', "'Label: Hi'")}.</p>`,
    brute: {
      why: `<p>For a derived class, <code>new Label()</code> runs <code>Widget</code>'s constructor first (via the implicit <code>super()</code>). Subclass field initialisers run only <b>after</b> <code>super()</code> returns. But <code>this.render</code> already resolves to <code>Label.prototype.render</code> because the object was created with the subclass prototype. So the override runs before its fields exist.</p>`,
      code: { lang: 'js', run: true, code: `class Widget {
  constructor() { this.render(); }          // calls an overridable method too early
  render() { console.log('Widget'); }
}
class Label extends Widget {
  text = 'Hello';                            // initialised AFTER Widget's constructor returns
  render() { console.log('Label: ' + this.text); }
}
const l = new Label();                       // Label: undefined
console.log(l.text);                         // Hello (too late)` }
    },
    mcq: { q: 'During <code>new Label()</code>, which runs first?', options: ['Label\'s field initialisers', 'Widget\'s constructor body', 'Label\'s constructor body after super()', 'They run in parallel'], answer: 1, explain: 'Order: Label\'s (implicit) constructor calls super() → Widget creates the object with Label.prototype and runs its body → super() returns → Label\'s fields are initialised → rest of Label\'s constructor. The overridden render() runs in step 2, before step 4.' },
    hints: [
      `<p>Hint 1: rule of thumb from Java/C# too: never call overridable methods from a constructor.</p>`,
      `<p>Hint 2: split creation into two phases: construct (fields ready) → initialise/mount. A static factory can run both: <code>static create(...a) { const w = new this(...a); w.mount(); return w; }</code>.</p>`,
      `<p>Hint 3: alternative: pass the data up through <code>super(props)</code> and let the base store it before rendering — but then subclass <i>fields</i> still are not ready, so the factory is the cleaner fix.</p>`
    ],
    solution: {
      approach: `<p>Make the constructor do only cheap, non-virtual setup, and move the first render into a separate <code>mount()</code> phase. A static factory <code>create()</code> (inherited by every subclass, using <code>new this</code>) guarantees callers still get a rendered widget, and by the time <code>mount()</code> runs, every class in the hierarchy has finished initialising its fields.</p>`,
      code: { lang: 'js', run: true, code: `class Widget {
  #mounted = false;
  constructor(props = {}) { this.props = props; }      // no virtual calls here
  static create(props) {
    const w = new this(props);                          // phase 1: all fields initialised
    w.mount();                                          // phase 2: safe to call overrides
    return w;
  }
  mount() {
    if (this.#mounted) return this;
    this.#mounted = true;
    this.render();
    return this;
  }
  render() { console.log('Widget'); }
}

class Label extends Widget {
  text = 'Hello';
  constructor(props) {
    super(props);
    if (props && props.text) this.text = props.text;   // fields exist now
  }
  render() { console.log('Label: ' + this.text); }
}

class BoldLabel extends Label {
  weight = 700;
  render() { console.log('<b weight=' + this.weight + '> ' + this.text); }
}

Label.create();                      // Label: Hello
Label.create({ text: 'Hi' });        // Label: Hi
BoldLabel.create({ text: 'Big' });   // <b weight=700> Big
const raw = new Label();             // constructing alone renders nothing
console.log('raw text ready:', raw.text);` },
      dry: { head: ['step (Label.create())', 'this.text', 'output'], rows: [['new Label() → super() → Widget body', 'undefined', '—'], ['super returns, field text = "Hello"', 'Hello', '—'], ['Label body (props.text?)', 'Hello', '—'], ['w.mount() → this.render()', 'Hello', H.c('g', 'Label: Hello')]] },
      complexity: `<p>No asymptotic change; one extra method call per creation.</p>`,
      followUps: ['How do React class components and Web Components (<code>connectedCallback</code>) solve the same two-phase problem?', 'With TypeScript <code>useDefineForClassFields</code>, how can a redeclared field overwrite a value set by the base constructor?', 'Write a test that would have caught this bug.']
    }
  });

  /* =========================== PRACTICE: HARD =========================== */
  practice.push({
    title: 'Implement [[Get]] and [[Set]] by Hand',
    level: 'Hard', tags: ['spec', 'descriptors', 'receiver', 'getters/setters'], companies: ['Google', 'Meta', 'Bloomberg'],
    statement: `<p>Implement <code>getProp(obj, key, receiver = obj)</code> and <code>setProp(obj, key, value, receiver = obj)</code> that behave exactly like <code>Reflect.get</code> and <code>Reflect.set</code> on ordinary objects — <b>without</b> using <code>obj[key]</code>, <code>Reflect.get/set</code> or <code>in</code>. Use only <code>Object.getOwnPropertyDescriptor</code>, <code>Object.getPrototypeOf</code>, <code>Object.defineProperty</code> and <code>Object.isExtensible</code>. Verify against the real thing on a test suite.</p>`,
    constraints: `Must handle: own/inherited data, inherited getters (run with <code>this = receiver</code>), inherited setters (no own property created), read-only inherited data (write fails, returns <code>false</code>), getter-only accessors, non-extensible receivers, null-prototype objects, symbol keys.`,
    example: `<p><code>base = Object.freeze({ id: 1 })</code>, <code>kid = Object.create(base)</code>: <code>setProp(kid, 'id', 2)</code> → ${H.c('r', 'false')} and <code>kid</code> gets ${H.c('r', 'no')} own <code>id</code>. With <code>base = { set t(v) { this._t = v * 2; } }</code>: <code>setProp(kid, 't', 5)</code> → ${H.c('g', 'true')}, <code>kid._t === 10</code>, and <code>t</code> is still ${H.c('g', 'not own')} on kid.</p>`,
    brute: {
      why: `<p>The "obvious" mental model — "reads walk up, writes always create an own property" — is wrong in two cases: an inherited <b>setter</b> intercepts the write (nothing is created on the object), and an inherited <b>read-only</b> property blocks the write entirely. A naive implementation that always defines an own property silently diverges from the engine in exactly the cases interviewers ask about.</p>`,
      code: { lang: 'js', run: true, code: `function naiveSet(obj, key, value) {
  Object.defineProperty(obj, key, { value, writable: true, enumerable: true, configurable: true });
  return true;
}
const base = { set t(v) { this._t = v * 2; } };
const a = Object.create(base), b = Object.create(base);
naiveSet(a, 't', 5);
console.log(Object.hasOwn(a, 't'), a._t);        // true undefined   (setter skipped!)
console.log(Reflect.set(b, 't', 5), Object.hasOwn(b, 't'), b._t); // true false 10   (real engine)` }
    },
    mcq: { q: '<code>kid</code> inherits a <b>non-writable</b> <code>id</code> from its prototype. What does <code>Reflect.set(kid, \'id\', 2)</code> do?', options: ['Creates an own <code>id = 2</code> on kid, shadowing the parent', 'Changes the parent\'s <code>id</code>', 'Returns <code>false</code> and changes nothing (strict-mode assignment would throw)', 'Throws in all modes'], answer: 2, explain: 'OrdinarySet finds the inherited data descriptor with writable: false and returns false. That is the "override mistake" — frozen prototypes block same-named own properties on children. <code>Object.defineProperty(kid, \'id\', ...)</code> bypasses this.' },
    hints: [
      `<p>Hint 1: both algorithms start with the same loop — walk from <code>obj</code> up with <code>getPrototypeOf</code> until you find an own descriptor for <code>key</code> (or reach null).</p>`,
      `<p>Hint 2: get: data descriptor → its <code>value</code>; accessor → <code>get.call(receiver)</code> or <code>undefined</code>. Set: accessor → <code>set.call(receiver, value)</code> (no setter → false); data with <code>writable: false</code> → false; writable data or not found → define/update on the <b>receiver</b>.</p>`,
      `<p>Hint 3: "define/update on the receiver" has its own rules: if the receiver already owns <code>key</code> as a data property, it must be writable and you only change <code>value</code>; if it owns an accessor → false; if it does not own it, it must be extensible, then define <code>{ value, writable, enumerable, configurable: true }</code>.</p>`
    ],
    solution: {
      approach: `<p>Translate <code>OrdinaryGet</code> and <code>OrdinarySet</code> from the spec. Both find the first own descriptor along the chain. Get returns the value or calls the getter with the <b>receiver</b> (the original object, not the prototype that owns the getter). Set delegates to an accessor's setter with the receiver, refuses on a read-only data property, and otherwise performs the write on the receiver — which is the only way a write ever creates a property.</p>`,
      code: { lang: 'js', run: true, code: `function findDesc(obj, key) {
  for (let o = obj; o !== null; o = Object.getPrototypeOf(o)) {
    const d = Object.getOwnPropertyDescriptor(o, key);
    if (d) return d;
  }
  return undefined;
}

function getProp(obj, key, receiver = obj) {
  const d = findDesc(obj, key);
  if (!d) return undefined;
  if ('value' in d) return d.value;
  return d.get ? d.get.call(receiver) : undefined;        // receiver, not the owner
}

function setProp(obj, key, value, receiver = obj) {
  const d = findDesc(obj, key);
  if (d && !('value' in d)) {                              // accessor somewhere on the chain
    if (!d.set) return false;                              // getter-only
    d.set.call(receiver, value);
    return true;
  }
  if (d && !d.writable) return false;                      // read-only blocks the write
  if (receiver === null || typeof receiver !== 'object' && typeof receiver !== 'function') return false;
  const own = Object.getOwnPropertyDescriptor(receiver, key);
  if (own) {
    if (!('value' in own) || !own.writable) return false;
    Object.defineProperty(receiver, key, { value });       // update value only, keep attributes
    return true;
  }
  if (!Object.isExtensible(receiver)) return false;
  Object.defineProperty(receiver, key, { value, writable: true, enumerable: true, configurable: true });
  return true;
}

// ---- compare with the engine on twin objects ----
const sym = Symbol('s');
const makers = {
  ownData: () => ({ x: 1 }),
  inheritedData: () => Object.create({ x: 1 }),
  inheritedReadOnly: () => Object.create(Object.freeze({ x: 1 })),
  inheritedSetter: () => Object.create({ get x() { return this._x; }, set x(v) { this._x = v * 2; } }),
  getterOnly: () => Object.create({ get x() { return 42; } }),
  nonExtensible: () => Object.preventExtensions(Object.create({ y: 1 })),
  nullProto: () => Object.create(null),
  symbolKey: () => Object.create({ [sym]: 'inherited' })
};
const snapshot = (o) => JSON.stringify(Reflect.ownKeys(o).map((k) => [String(k), Object.getOwnPropertyDescriptor(o, k).value]));
let allOk = true;
for (const [name, make] of Object.entries(makers)) {
  const key = name === 'symbolKey' ? sym : 'x';
  const mine = make(), real = make();
  const r1 = [getProp(mine, key), setProp(mine, key, 5), getProp(mine, key), snapshot(mine)];
  const r2 = [Reflect.get(real, key), Reflect.set(real, key, 5), Reflect.get(real, key), snapshot(real)];
  const ok = JSON.stringify(r1) === JSON.stringify(r2);
  allOk = allOk && ok;
  console.log(name.padEnd(18), ok ? 'MATCH' : 'DIFF', 'set ->', r1[1], ' after get ->', r1[2]);
}
console.log('all match:', allOk);` },
      dry: { head: ['case', 'descriptor found', 'set result', 'own prop created?'], rows: [['ownData', 'own data, writable', 'true', 'updated in place'], ['inheritedData', 'proto data, writable', 'true', H.c('g', 'yes (shadow)')], ['inheritedReadOnly', 'proto data, writable: false', H.c('r', 'false'), 'no'], ['inheritedSetter', 'proto accessor with set', 'true', 'no (setter wrote _x)'], ['getterOnly', 'proto accessor, no set', H.c('r', 'false'), 'no'], ['nonExtensible', 'none', H.c('r', 'false'), 'no']] },
      complexity: `<p>O(d) per get/set where d is chain depth; O(1) extra space.</p>`,
      followUps: ['Extend <code>setProp</code> for a Proxy in the chain (call its <code>set</code> trap with the receiver).', 'Explain the "override mistake" and why SES/hardened JS fixes it for frozen intrinsics.', 'How do <code>super.x = v</code> assignments use a receiver different from the starting object?']
    }
  });

  practice.push({
    title: 'Multiple Inheritance with a Proxy Prototype',
    level: 'Hard', tags: ['Proxy', 'Reflect', 'receiver', 'MRO'], companies: ['Microsoft', 'Adobe', 'Stripe'],
    statement: `<p>A prototype chain is a single linked list, so an object can inherit from only one parent. Write <code>multiProto(...parents)</code> that returns a <b>Proxy</b> you can use as a prototype so that lookups try each parent <b>in order</b> (first match wins, like a simplified Python MRO). Reads must keep <code>this</code> = the original object for inherited getters, <code>in</code> must work, and writes must still create own properties on the object (or run an inherited setter). Also write <code>conflicts(...parents)</code> listing names defined by more than one parent.</p>`,
    constraints: `Parents may change later and the change must be visible (live delegation, not a copy). ≤ 10 parents.`,
    example: `<p><code>class Duck { constructor(n) { this.name = n; } }</code>, <code>Object.setPrototypeOf(Duck.prototype, multiProto(Swimmer, Flyer))</code></p>
<p><code>d.swim()</code> → ${H.c('g', "'Donald swims'")}, <code>d.fly()</code> → ${H.c('g', "'Donald flies'")}, <code>'fly' in d</code> → ${H.c('g', 'true')}. Both parents define <code>move</code>: ${H.c('y', 'Swimmer wins (listed first)')}.</p>`,
    brute: {
      why: `<p><code>Object.assign(Duck.prototype, Swimmer, Flyer)</code> copies once: later changes to a parent are invisible, getters are flattened into values, and clashes are resolved by "last one wins" silently.</p>`,
      code: { lang: 'js', run: true, code: `const Swimmer = { swim() { return this.name + ' swims'; }, move() { return 'paddle'; } };
const Flyer = { fly() { return this.name + ' flies'; }, move() { return 'flap'; } };
class Duck { constructor(n) { this.name = n; } }
Object.assign(Duck.prototype, Swimmer, Flyer);
const d = new Duck('Donald');
console.log(d.move());                  // flap: last copy silently won
Flyer.dive = function () { return 'dive'; };
console.log(typeof d.dive);             // undefined: the copy is a stale snapshot` }
    },
    mcq: { q: 'When <code>d.swim</code> is read and <code>d</code> lacks it, the engine calls the prototype proxy\'s <code>get(target, key, receiver)</code> trap. What is <code>receiver</code>?', options: ['The proxy itself', 'The target object', '<code>d</code> — the object the lookup started from', '<code>Duck.prototype</code>'], answer: 2, explain: 'The receiver is threaded through every [[Get]] up the chain unchanged. Passing it on via <code>Reflect.get(parent, key, receiver)</code> makes inherited getters run with <code>this = d</code>.' },
    hints: [
      `<p>Hint 1: a Proxy can sit anywhere in a prototype chain. The engine calls its <code>get</code>, <code>set</code> and <code>has</code> traps when the lookup reaches it.</p>`,
      `<p>Hint 2: <code>get(target, key, receiver)</code>: for each parent, <code>if (key in parent) return Reflect.get(parent, key, receiver)</code>. <code>has</code>: <code>parents.some(p =&gt; key in p)</code>.</p>`,
      `<p>Hint 3: <code>set(target, key, value, receiver)</code>: if a parent has the key, <code>Reflect.set(parent, key, value, receiver)</code> — OrdinarySet then runs a setter with the receiver or defines an own property on the receiver. Otherwise <code>Reflect.set(target, key, value, receiver)</code> does the same against an empty target.</p>`
    ],
    solution: {
      approach: `<p>Put a Proxy over an empty null-prototype target into the chain. Its traps fan out to the parents in priority order, always forwarding the original <b>receiver</b> through <code>Reflect</code>, which preserves normal semantics: inherited getters/methods see the right <code>this</code>, writes land on the object or hit an inherited setter, and delegation is live because nothing is copied. A separate helper reports name clashes so the order is a conscious decision.</p>`,
      code: { lang: 'js', run: true, code: `function multiProto(...parents) {
  return new Proxy(Object.create(null), {
    get(target, key, receiver) {
      for (const p of parents) if (key in p) return Reflect.get(p, key, receiver);
      return undefined;
    },
    has(target, key) {
      return parents.some((p) => key in p);
    },
    set(target, key, value, receiver) {
      for (const p of parents) if (key in p) return Reflect.set(p, key, value, receiver);
      return Reflect.set(target, key, value, receiver);   // defines own prop on receiver
    }
  });
}

function conflicts(...parents) {
  const seen = new Map();
  for (const p of parents) {
    for (const k of Reflect.ownKeys(p)) seen.set(k, (seen.get(k) || 0) + 1);
  }
  return [...seen].filter(([, n]) => n > 1).map(([k]) => String(k));
}

const Swimmer = { swim() { return this.name + ' swims'; }, move() { return 'paddle'; } };
const Flyer = {
  fly() { return this.name + ' flies'; },
  move() { return 'flap'; },
  get altitude() { return this._alt || 0; },
  set altitude(v) { this._alt = Math.max(0, v); }
};

class Duck {
  constructor(name) { this.name = name; }
  quack() { return this.name + ' quacks'; }
}
Object.setPrototypeOf(Duck.prototype, multiProto(Swimmer, Flyer));

const d = new Duck('Donald');
console.log(d.quack(), '|', d.swim(), '|', d.fly());     // own class, parent 1, parent 2
console.log('fly' in d, 'dive' in d, d.move());          // true false paddle (Swimmer first)
d.altitude = -50;                                        // inherited setter runs with this = d
console.log(d.altitude, Object.hasOwn(d, 'altitude'), d._alt);  // 0 false 0
d.color = 'white';                                       // ordinary write: own property
console.log(Object.keys(d));                             // ['name', '_alt', 'color']
Flyer.dive = function () { return this.name + ' dives'; };
console.log(d.dive());                                   // live delegation: Donald dives
console.log('conflicts:', conflicts(Swimmer, Flyer));    // ['move']: Swimmer wins by order` },
      dry: { head: ['access', 'own on d?', 'Duck.prototype?', 'proxy trap', 'result'], rows: [['d.quack', 'no', 'yes', '—', 'Donald quacks'], ['d.swim', 'no', 'no', 'get → Swimmer has it', 'Donald swims'], ['d.move', 'no', 'no', 'get → Swimmer first', H.c('y', 'paddle')], ['d.altitude = -50', 'no', 'no', 'set → Flyer setter, receiver d', '_alt = 0 on d'], ['d.color = …', 'no', 'no', 'set → target, receiver d', H.c('g', 'own color on d')]] },
      complexity: `<p>Each missed lookup costs O(parents × depth) and Proxy traps defeat inline caching, so this is far slower than a normal chain — fine for tooling or config objects, not for hot paths.</p>`,
      followUps: ['Implement C3 linearisation (Python\'s real MRO) for diamond hierarchies.', 'Make <code>d instanceof Flyer</code>-style checks work with a <code>Symbol.hasInstance</code> helper.', 'Why is composition (has-a) usually better than any multiple-inheritance trick?']
    }
  });

  practice.push({
    title: 'A Closed, Type-Safe Enum Class',
    level: 'Hard', tags: ['static blocks', '#private', 'brand check', 'freeze'], companies: ['Amazon', 'Uber', 'Atlassian'],
    statement: `<p>Implement <code>Color</code> as a <b>closed enum</b>: exactly the instances <code>Color.RED</code>, <code>Color.GREEN</code>, <code>Color.BLUE</code> exist; <code>new Color(...)</code> from outside throws; subclassing is rejected; instances are frozen and carry private <code>name</code>/<code>hex</code>; <code>Color.values()</code>, <code>Color.from('GREEN')</code>, <code>Color.isColor(x)</code> (unforgeable), <code>toString()</code> and <code>toJSON()</code> work; <code>Color.RED = ...</code> cannot replace a member.</p>`,
    constraints: `No module-level variables outside the class. Identity comparison (<code>===</code>) must be the way to compare colours.`,
    example: `<p><code>Color.from('GREEN') === Color.GREEN</code> → ${H.c('g', 'true')}; <code>new Color('PINK', '#f0f')</code> → ${H.c('r', 'TypeError')}; <code>Color.isColor(Object.create(Color.prototype))</code> → ${H.c('r', 'false')}; <code>JSON.stringify({ c: Color.RED })</code> → ${H.c('g', '{"c":"RED"}')}.</p>`,
    brute: {
      why: `<p>A frozen object of strings (<code>{ RED: 'RED' }</code>) is not type-safe: any string <code>'RED'</code> is equally valid, typos pass silently, and you cannot attach behaviour. A plain class with public static instances can be constructed again, mutated and faked with <code>Object.create</code>.</p>`,
      code: { lang: 'js', run: true, code: `class ColorLoose {
  static RED = new ColorLoose('RED');
  constructor(name) { this.name = name; }
}
const fake = new ColorLoose('RED');
console.log(fake === ColorLoose.RED);            // false: two "REDs"
ColorLoose.RED.name = 'PURPLE';                  // mutable
ColorLoose.RED = null;                           // replaceable
console.log(ColorLoose.RED);                     // null` }
    },
    mcq: { q: 'Why can <code>static RED = new Color(...)</code> run while a later static block sets a private <code>#locked</code> flag that makes the constructor throw?', options: ['Static fields and static blocks run once, top to bottom, during class definition — RED is created before the block locks the door', 'Static fields are lazy', 'The constructor is not called for static fields', 'Private statics are ignored during definition'], answer: 0, explain: 'Static elements (fields and <code>static { }</code> blocks) are evaluated in source order when the class is defined. So member creation happens first, then the static block flips the lock and freezes the class.' },
    hints: [
      `<p>Hint 1: a private static flag (<code>static #locked = false</code>) checked in the constructor; flip it in a <code>static { }</code> block after the members are declared.</p>`,
      `<p>Hint 2: <code>new.target !== Color</code> → throw, to forbid subclasses. <code>Object.freeze(this)</code> in the constructor and <code>Object.freeze(Color)</code> in the static block make members and statics read-only.</p>`,
      `<p>Hint 3: keep a private static <code>Map</code> name → instance for <code>from()</code>/<code>values()</code>; brand-check with <code>#name in x</code>.</p>`
    ],
    solution: {
      approach: `<p>Use static initialisation order as a one-time construction window: static fields create the members, a static block then locks construction and freezes the class object, so <code>Color.RED</code> becomes a non-writable, non-configurable property. Instance data is private and instances are frozen, so they are immutable singletons compared by identity. <code>#name in x</code> gives an unforgeable type check that prototype tricks cannot fake.</p>`,
      code: { lang: 'js', run: true, code: `class Color {
  static #locked = false;
  static #byName = new Map();

  static RED = new Color('RED', '#ff0000');
  static GREEN = new Color('GREEN', '#00ff00');
  static BLUE = new Color('BLUE', '#0000ff');

  static {
    Color.#locked = true;          // no more instances after this point
    Object.freeze(Color);          // RED/GREEN/BLUE become read-only, no new statics
  }

  #name; #hex;
  constructor(name, hex) {
    if (new.target !== Color) throw new TypeError('Color cannot be subclassed');
    if (Color.#locked) throw new TypeError('Color is a closed enum: use Color.RED, Color.GREEN or Color.BLUE');
    this.#name = name;
    this.#hex = hex;
    Color.#byName.set(name, this);
    Object.freeze(this);           // no public props can ever be added
  }

  static values() { return [...Color.#byName.values()]; }
  static from(name) {
    const c = Color.#byName.get(name);
    if (!c) throw new RangeError('Unknown Color: ' + name);
    return c;
  }
  static isColor(x) { return typeof x === 'object' && x !== null && #name in x; }

  get name() { return this.#name; }
  get hex() { return this.#hex; }
  toString() { return 'Color.' + this.#name; }
  toJSON() { return this.#name; }
}

console.log(Color.values().map(String));                 // ['Color.RED','Color.GREEN','Color.BLUE']
console.log(Color.from('GREEN') === Color.GREEN, Color.BLUE.hex);
console.log(JSON.stringify({ c: Color.RED }));           // {"c":"RED"}
for (const attempt of [
  () => new Color('PINK', '#f0f'),
  () => { class Neon extends Color {} return new Neon('NEON', '#0ff'); },
  () => { 'use strict'; Color.RED = null; },
  () => Color.from('PURPLE'),
  () => Object.create(Color.prototype).name
]) {
  try { attempt(); console.log('allowed?!'); } catch (e) { console.log(e.name + ': ' + e.message); }
}
console.log(Color.isColor(Color.RED), Color.isColor(Object.create(Color.prototype)), Color.isColor('RED'));
const describe = (c) => {
  switch (c) {                                           // identity switch
    case Color.RED: return 'stop';
    case Color.GREEN: return 'go';
    default: return 'wait';
  }
};
console.log(describe(Color.GREEN), describe(Color.BLUE));` },
      dry: { head: ['class definition step', '#locked', 'effect'], rows: [['static #locked, #byName', 'false', 'private statics created'], ['static RED = new Color(…)', 'false', H.c('g', 'RED created, registered, frozen')], ['GREEN, BLUE', 'false', H.c('g', 'created')], ['static { … }', H.c('y', 'true'), 'class frozen'], ['later: new Color(\'PINK\')', 'true', H.c('r', 'TypeError')]] },
      complexity: `<p><code>from</code> O(1) via the Map; <code>values</code> O(k); <code>isColor</code> O(1).</p>`,
      followUps: ['Add <code>ordinal</code> and <code>static compare(a, b)</code> for sorting.', 'Compare with TypeScript <code>enum</code> / <code>as const</code> unions — what exists at runtime?', 'Why does the subclass check have to come before the lock check?']
    }
  });

  practice.push({
    title: 'Schema-Driven Model Base Class (Accessors on Prototypes)',
    level: 'Hard', tags: ['static inheritance', 'defineProperty', '#private', 'metaprogramming'], companies: ['Salesforce', 'Shopify', 'Stripe'],
    statement: `<p>Build an ORM-style <code>Model</code> base class. Subclasses declare <code>static fields = { name: 'string', age: 'number' }</code>; a subclass of a subclass adds its own fields and <b>inherits</b> the parent's. Instances validate types on every assignment, track which fields are dirty, and serialise to JSON. Requirements: field accessors are installed <b>once per class on that class's prototype</b> (not per instance), data lives in a private field, and <code>Model</code> itself is abstract.</p>`,
    constraints: `Missing or unknown props in the constructor throw <code>TypeError</code>. Accessor installation must be lazy (first construction) and idempotent. Up to 10 levels of subclassing.`,
    example: `<p><code>class Person extends Model { static fields = { name: 'string', age: 'number' } }</code>, <code>class Employee extends Person { static fields = { salary: 'number' } }</code></p>
<p><code>Employee.schema()</code> → ${H.c('g', '{ name, age, salary }')}; <code>e.age = 'old'</code> → ${H.c('r', 'TypeError')}; after <code>e.salary = 99</code>, <code>e.dirty</code> → ${H.c('g', "['salary']")}; <code>Object.hasOwn(Person.prototype, 'name')</code> → ${H.c('g', 'true')} (shared accessor).</p>`,
    brute: {
      why: `<p>Defining accessors inside the constructor with <code>Object.defineProperty(this, ...)</code> creates <b>new getter/setter closures for every instance</b> (memory grows with N × fields), and keeping data in a public <code>_data</code> object lets anyone bypass validation.</p>`,
      code: { lang: 'js', run: true, code: `class PersonBrute {
  constructor(props) {
    this._data = {};
    for (const k of ['name', 'age']) {
      Object.defineProperty(this, k, {                    // per-instance closures
        get() { return this._data[k]; },
        set(v) { this._data[k] = v; }, enumerable: true
      });
      this[k] = props[k];
    }
  }
}
const a = new PersonBrute({ name: 'A', age: 1 }), b = new PersonBrute({ name: 'B', age: 2 });
const ga = Object.getOwnPropertyDescriptor(a, 'name').get, gb = Object.getOwnPropertyDescriptor(b, 'name').get;
console.log(ga === gb);            // false: duplicated per instance
a._data.age = 'not a number';      // validation bypassed
console.log(a.age);` }
    },
    mcq: { q: 'An accessor for <code>name</code> is defined on <code>Person.prototype</code>. An <code>Employee</code> instance <code>e</code> reads <code>e.name</code>. Which <code>this</code> does the getter see?', options: ['<code>Person.prototype</code>', '<code>Employee.prototype</code>', '<code>e</code>', '<code>undefined</code>'], answer: 2, explain: 'The lookup climbs e → Employee.prototype → Person.prototype, finds the accessor, and calls the getter with the receiver, which is still <code>e</code>. That is why one shared accessor can serve every instance.' },
    hints: [
      `<p>Hint 1: the constructor chain is a prototype chain too: <code>Object.getPrototypeOf(Employee) === Person</code>. Walk it from <code>new.target</code> up to <code>Model</code>, and read each class's <b>own</b> <code>fields</code> (<code>Object.hasOwn(C, 'fields')</code>) — an inherited static would be counted twice.</p>`,
      `<p>Hint 2: install accessors for class C's own fields on <code>C.prototype</code> once; remember which classes are prepared in a private static <code>WeakSet</code>.</p>`,
      `<p>Hint 3: the getter/setter functions are written lexically inside <code>Model</code>'s body, so they may use <code>this.#data</code> even though they are installed on subclass prototypes — private names are lexically scoped, and every instance got <code>#data</code> from <code>Model</code>'s constructor.</p>`
    ],
    solution: {
      approach: `<p>The schema is assembled by walking the <b>constructor chain</b> (statics are inherited through <code>[[Prototype]]</code> of the class functions). On first construction of each class, accessors for that class's own fields are defined on its prototype, so every instance shares them and lookups find them by climbing the instance chain. Values live in a private <code>#data</code> object installed by <code>Model</code>'s constructor; setters validate and record dirtiness; <code>new.target</code> makes <code>Model</code> abstract.</p>`,
      code: { lang: 'js', run: true, code: `class Model {
  static #prepared = new WeakSet();             // classes whose accessors exist
  #data = Object.create(null);
  #dirty = new Set();

  static schema() {                             // merged fields along the constructor chain
    const chain = [];
    for (let C = this; C && C !== Model; C = Object.getPrototypeOf(C)) chain.unshift(C);
    return Object.assign({}, ...chain.map((C) => (Object.hasOwn(C, 'fields') ? C.fields : {})));
  }

  static #prepare(Leaf) {
    for (let C = Leaf; C && C !== Model; C = Object.getPrototypeOf(C)) {
      if (Model.#prepared.has(C)) break;        // parents above are prepared too
      const own = Object.hasOwn(C, 'fields') ? C.fields : {};
      for (const [key, type] of Object.entries(own)) {
        Object.defineProperty(C.prototype, key, {
          get() { return this.#data[key]; },
          set(v) {
            if (typeof v !== type) throw new TypeError(this.constructor.name + '.' + key + ' must be a ' + type + ', got ' + typeof v);
            this.#data[key] = v;
            this.#dirty.add(key);
          },
          enumerable: false, configurable: true
        });
      }
      Model.#prepared.add(C);
    }
  }

  constructor(props = {}) {
    if (new.target === Model) throw new TypeError('Model is abstract');
    Model.#prepare(new.target);
    const schema = new.target.schema();
    for (const k of Object.keys(props)) {
      if (!(k in schema)) throw new TypeError(new.target.name + ': unknown field ' + k);
    }
    for (const k of Object.keys(schema)) {
      if (!(k in props)) throw new TypeError(new.target.name + ': missing field ' + k);
      this[k] = props[k];                       // goes through the shared setter (validates)
    }
    this.#dirty.clear();
  }
  get dirty() { return [...this.#dirty]; }
  toJSON() { return { type: this.constructor.name, ...this.#data }; }
}

class Person extends Model { static fields = { name: 'string', age: 'number' }; }
class Employee extends Person {
  static fields = { salary: 'number' };
  raise(pct) { this.salary = Math.round(this.salary * (1 + pct / 100)); return this; }
}

const e = new Employee({ name: 'Asha', age: 31, salary: 100 });
console.log(Employee.schema());                               // { name, age, salary }
console.log(e.name, e.age, e.salary, e.dirty);                // Asha 31 100 []
e.raise(10);
console.log(e.salary, e.dirty);                               // 110 ['salary']
console.log(JSON.stringify(e));                               // {"type":"Employee","name":"Asha","age":31,"salary":110}
console.log(Object.hasOwn(Person.prototype, 'name'), Object.hasOwn(Employee.prototype, 'salary'), Object.keys(e));
const p2 = new Person({ name: 'Ben', age: 40 });
const g1 = Object.getOwnPropertyDescriptor(Person.prototype, 'name').get;
console.log('shared accessor used by both:', g1.call(e), g1.call(p2));
for (const bad of [() => { e.age = 'old'; }, () => new Model({}), () => new Person({ name: 'X' }), () => new Person({ name: 'X', age: 1, role: 'dev' })]) {
  try { bad(); } catch (err) { console.log(err.name + ': ' + err.message); }
}` },
      dry: { head: ['step', 'what happens'], rows: [['new Employee({…})', 'new.target = Employee; Model constructor runs first (installs #data, #dirty)'], ['#prepare(Employee)', 'Employee not prepared → salary accessor on Employee.prototype; Person not prepared → name, age on Person.prototype'], ['schema()', 'chain [Person, Employee] → { name, age, salary }'], ['this.name = …', 'climbs e → Employee.prototype → Person.prototype: setter with this = e'], ['e.raise(10)', H.c('g', 'salary setter validates, marks dirty')], ['new Person(…) later', H.c('m', 'Person already prepared → skip')]] },
      complexity: `<p>Preparation O(fields) once per class; each get/set O(chain depth) (inline-cached) + O(1) work; memory O(fields) per class instead of per instance.</p>`,
      followUps: ['What breaks if a subclass declares a public class field with the same name as a schema field (own data property shadows the accessor)?', 'Replace <code>typeof</code> strings with validator functions and support optional fields.', 'How do decorators (TC39 Stage 3, TypeScript 5) let you write <code>@field(\'string\') name;</code> instead of a static schema?']
    }
  });

  /* =========================== QUIZ =========================== */
  quiz.push(
    { q: `<code>const a = { x: 1 }; const b = Object.create(a); b.x = 2;</code> What is <code>a.x</code>?`, options: ['1', '2', 'undefined', 'TypeError'], answer: 0, explain: 'Writing <code>b.x</code> creates an OWN property on <code>b</code> that shadows <code>a.x</code>. Writes never travel up the chain (unless an inherited setter or a read-only property intercepts them), so <code>a.x</code> stays 1.' },
    { q: `Which statement about <code>prototype</code> and <code>__proto__</code> is correct?`, options: ['Every object has a <code>prototype</code> property', '<code>fn.prototype</code> is the object that instances created by <code>new fn()</code> will be linked to; <code>obj.__proto__</code> is (an accessor for) the link itself', 'They are two names for the same property', '<code>__proto__</code> exists only on functions'], answer: 1, explain: 'Only (most) functions have <code>.prototype</code>, used by <code>new</code>. Every object has an internal <code>[[Prototype]]</code> slot, exposed by the legacy <code>Object.prototype.__proto__</code> accessor and properly by <code>Object.getPrototypeOf</code>.' },
    { q: `What does <code>Object.getPrototypeOf(Object.create(null))</code> return, and what does <code>String(Object.create(null))</code> do?`, options: ['<code>Object.prototype</code>; returns "[object Object]"', '<code>null</code>; throws TypeError (no toString/valueOf to convert with)', '<code>undefined</code>; returns ""', '<code>null</code>; returns "null"'], answer: 1, explain: 'A null-prototype object inherits nothing — no <code>toString</code>, no <code>valueOf</code> — so converting it to a primitive throws "Cannot convert object to primitive value". That is why such objects are safe dictionaries.' },
    { q: `<code>function F() { this.a = 1; return { b: 2 }; }</code> What is <code>new F()</code>?`, options: ['<code>{ a: 1 }</code>', '<code>{ b: 2 }</code>', '<code>{ a: 1, b: 2 }</code>', 'TypeError'], answer: 1, explain: 'Step 4 of <code>new</code>: if the constructor returns an object, that object is the result and the freshly built <code>this</code> is discarded. Returning a primitive would be ignored.' },
    { q: `<code>function Dog() {} Dog.prototype = { bark() {} }; const d = new Dog();</code> What is <code>d.constructor === Dog</code>?`, options: ['true', 'false — it is <code>Object</code>', 'TypeError', 'undefined'], answer: 1, explain: 'Replacing <code>Dog.prototype</code> with a literal throws away the default <code>constructor</code> property, so the lookup continues to <code>Object.prototype.constructor</code>, which is <code>Object</code>. Fix: add <code>constructor: Dog</code> (ideally non-enumerable).' },
    { q: `What is <code>typeof class A {}</code>?`, options: ['"class"', '"object"', '"function"', '"constructor"'], answer: 2, explain: 'A class is a special kind of function (with a <code>[[IsClassConstructor]]</code> flag that makes calling it without <code>new</code> throw). Its methods live on <code>A.prototype</code>, exactly like a constructor function.' },
    { q: `Which is NOT true of ES6 classes compared with ES5 constructor functions?`, options: ['Class bodies are always strict mode', 'Class methods are non-enumerable', 'Class declarations are hoisted and usable before the line that declares them', 'Calling a class without <code>new</code> throws'], answer: 2, explain: 'Class declarations are hoisted like <code>let</code>: the binding exists but is in the Temporal Dead Zone, so using the class before its declaration throws a ReferenceError. Function declarations, by contrast, are fully hoisted.' },
    { q: `In a derived class constructor, what happens if you access <code>this</code> before calling <code>super()</code>?`, options: ['<code>this</code> is <code>undefined</code>', 'ReferenceError — <code>this</code> is uninitialised until the parent constructor creates the object', 'It works but fields are missing', 'TypeError only in strict mode'], answer: 1, explain: 'For derived classes, the object is allocated by the BASE constructor. Until <code>super()</code> returns, the <code>this</code> binding is uninitialised, so any access throws a ReferenceError.' },
    { q: `<code>class A { static hi() { return 'hi'; } } class B extends A {}</code> Why does <code>B.hi()</code> work?`, options: ['Statics are copied to B at definition time', '<code>extends</code> sets <code>Object.getPrototypeOf(B) === A</code>, so the lookup on the function B climbs to A', 'Because B.prototype inherits from A.prototype', 'It does not work'], answer: 1, explain: '<code>extends</code> builds two chains: <code>B.prototype → A.prototype</code> (instance methods) and <code>B → A</code> (statics). Nothing is copied — <code>B.hi</code> is found by delegation.' },
    { q: `What does <code>super.greet()</code> inside a class method use to find <code>greet</code>?`, options: ['<code>this.__proto__.__proto__</code>', 'The method\'s <code>[[HomeObject]]</code>\'s prototype — fixed when the method is defined, independent of <code>this</code>', 'The parent constructor function', 'Whatever <code>Object.getPrototypeOf(this)</code> is at call time'], answer: 1, explain: 'Methods remember the object they were defined on (<code>[[HomeObject]]</code>). <code>super.greet</code> looks up <code>Object.getPrototypeOf(HomeObject).greet</code> and calls it with the current <code>this</code>. Using <code>this.__proto__.__proto__</code> instead causes infinite recursion in 3-level hierarchies.' },
    { q: `<code>class C { #x = 1; static has(o) { return #x in o; } }</code> What is <code>C.has(Object.create(C.prototype))</code>?`, options: ['true', 'false', 'TypeError', 'undefined'], answer: 1, explain: 'Private fields are installed on objects by the constructor, not inherited through prototypes. An object merely linked to <code>C.prototype</code> never ran the constructor, so it has no <code>#x</code> slot: the brand check is false.' },
    { q: `How does <code>obj instanceof C</code> decide its answer (with no custom <code>Symbol.hasInstance</code>)?`, options: ['Checks <code>obj.constructor === C</code>', 'Walks <code>obj</code>\'s prototype chain looking for <code>C.prototype</code> by identity', 'Compares the shapes of the objects', 'Checks whether C\'s constructor ran on obj'], answer: 1, explain: 'OrdinaryHasInstance walks <code>Object.getPrototypeOf(obj)</code> repeatedly and returns true if it ever equals <code>C.prototype</code>. So reassigning <code>C.prototype</code> later, or <code>Object.setPrototypeOf</code>, changes the answer.' },
    { q: `An array created inside an iframe is passed to the parent page. What is <code>arr instanceof Array</code> in the parent, and what should you use?`, options: ['true; nothing needed', 'false (different realm, different Array.prototype); use <code>Array.isArray(arr)</code>', 'TypeError; use <code>typeof</code>', 'false; use <code>arr.constructor === Array</code>'], answer: 1, explain: 'Each realm (iframe, worker, vm context) has its own built-ins. The array\'s chain contains the iframe\'s <code>Array.prototype</code>, not the parent\'s. <code>Array.isArray</code> checks the internal array-exotic-ness and is realm-safe; the <code>constructor</code> check fails for the same reason.' },
    { q: `<code>class P { constructor() { this.init(); } init() {} } class K extends P { v = 5; init() { console.log(this.v); } }</code> What does <code>new K()</code> print?`, options: ['5', 'undefined', 'ReferenceError', 'Nothing'], answer: 1, explain: 'P\'s constructor runs first (inside the implicit <code>super()</code>) and calls the overridden <code>K.prototype.init</code>, but K\'s field <code>v</code> is only initialised after <code>super()</code> returns. So <code>this.v</code> is still undefined.' }
  );

  /* =========================== INTERVIEW =========================== */
  interview.push(
    {
      q: 'What is the prototype chain, and what happens when you read <code>obj.foo</code>?', level: 'B',
      a: `<p>Every object has a hidden link, <code>[[Prototype]]</code>, to another object (or <code>null</code>). Reading <code>obj.foo</code> first checks <code>obj</code>'s own properties; if <code>foo</code> is not there, the engine follows the link and checks that object, and so on, until it finds the property or hits <code>null</code> (then the result is <code>undefined</code>). That linked list is the prototype chain. It is how <code>[1,2].map</code> works: <code>map</code> is not on your array, it lives on <code>Array.prototype</code>, one hop up. If the property found is a getter, it runs with <code>this</code> = the original object. Writes are different: <code>obj.foo = 1</code> normally creates an <b>own</b> property on <code>obj</code> (shadowing), unless an inherited setter or a read-only inherited property intercepts it.</p>`,
      followUps: ['What ends every chain?', 'Why is <code>for...in</code> affected by the chain but <code>Object.keys</code> is not?', 'How do engines make chain lookups fast (inline caches, hidden classes)?']
    },
    {
      q: 'Explain the difference between <code>prototype</code>, <code>__proto__</code> and <code>constructor</code>.', level: 'B',
      a: `<p><code>F.prototype</code> is an ordinary property that exists on (normal) functions and classes; it is the object that <b>future instances</b> created by <code>new F()</code> get linked to. <code>obj.__proto__</code> is a legacy accessor on <code>Object.prototype</code> that reads/writes an object's <b>actual</b> <code>[[Prototype]]</code> link; the modern API is <code>Object.getPrototypeOf</code>/<code>setPrototypeOf</code>. <code>constructor</code> is a property that lives on <code>F.prototype</code> pointing back to <code>F</code>, so instances inherit it. The triangle: <code>new F().__proto__ === F.prototype</code> and <code>F.prototype.constructor === F</code>. Functions themselves are objects whose own <code>__proto__</code> is <code>Function.prototype</code>.</p>`,
      followUps: ['Why don\'t arrow functions have a <code>prototype</code>?', 'What breaks when you overwrite <code>F.prototype = {...}</code>?', 'What is <code>Function.__proto__ === Function.prototype</code> and why?']
    },
    {
      q: 'What exactly does the <code>new</code> keyword do? Implement it.', level: 'I',
      a: `<p>Four steps: (1) create a fresh empty object; (2) link its <code>[[Prototype]]</code> to <code>Ctor.prototype</code> (falling back to <code>Object.prototype</code> if that is not an object); (3) call <code>Ctor</code> with <code>this</code> bound to the new object and the given arguments; (4) if the call returned an object (or function), use that; otherwise return the new object. A polyfill: <code>function myNew(C, ...args) { const proto = (typeof C.prototype === 'object' &amp;&amp; C.prototype) || Object.prototype; const obj = Object.create(proto); const r = C.apply(obj, args); return (r !== null &amp;&amp; (typeof r === 'object' || typeof r === 'function')) ? r : obj; }</code>. It cannot fully emulate classes (they throw when called without <code>new</code>, and derived classes let the base allocate the object) — <code>Reflect.construct</code> is the exact primitive.</p>`,
      followUps: ['Why does returning a primitive from a constructor get ignored?', 'What is <code>new.target</code> and how would you emulate it?', 'How does <code>Reflect.construct(Base, args, Derived)</code> differ?']
    },
    {
      q: 'Are ES6 classes "just syntactic sugar"?', level: 'I',
      a: `<p>Mostly, but not entirely. The core model is identical: a class is a function, methods live on <code>Class.prototype</code>, instances are linked to it, <code>extends</code> wires two prototype chains. But classes add things ES5 cannot express exactly: they throw when called without <code>new</code>; bodies are strict; methods are non-enumerable and are not constructors; declarations are in the TDZ until evaluated; derived constructors let the <b>base</b> allocate <code>this</code> (which is what makes subclassing built-ins like <code>Array</code>, <code>Error</code> and <code>Map</code> work properly); <code>super</code> uses the method's <code>[[HomeObject]]</code>; and <code>#private</code> fields/methods, static blocks and the <code>#x in obj</code> brand check have no ES5 equivalent (WeakMaps approximate privacy). So: sugar for the shape, real semantics for construction and privacy.</p>`,
      followUps: ['Why couldn\'t ES5 properly subclass <code>Array</code>?', 'How did Babel emulate private fields?', 'What does TypeScript\'s <code>private</code> keyword compile to?']
    },
    {
      q: 'How does <code>extends</code> work under the hood, and how does <code>super</code> find methods?', level: 'I',
      a: `<p><code>class B extends A</code> sets up <b>two</b> links: <code>Object.getPrototypeOf(B.prototype) === A.prototype</code> so instances inherit A's methods, and <code>Object.getPrototypeOf(B) === A</code> so B inherits A's statics. In the constructor, <code>super(...)</code> calls A as a constructor with <code>new.target = B</code>; A allocates the object with <code>B.prototype</code> as its prototype, then B's fields are initialised and the rest of B's constructor runs. <code>super.method()</code> in a method looks up <code>method</code> on <code>Object.getPrototypeOf(HomeObject)</code>, where HomeObject is the object the method was defined on (e.g. <code>B.prototype</code>), and calls it with the current <code>this</code>. Because HomeObject is fixed, <code>super</code> is static: copying a method to another object does not change what <code>super</code> refers to.</p>`,
      followUps: ['Why must you call <code>super()</code> before using <code>this</code>?', 'Can you <code>extends null</code>? What happens?', 'What does <code>extends</code> accept on the right side (any expression → mixins)?']
    },
    {
      q: 'Write ES5-style inheritance between two constructor functions. What are the classic mistakes?', level: 'I',
      a: `<p>Correct version: <code>function Dog(name) { Animal.call(this, name); }</code> (run parent's per-instance setup), <code>Dog.prototype = Object.create(Animal.prototype)</code> (link the chains without running Animal), <code>Object.defineProperty(Dog.prototype, 'constructor', { value: Dog, writable: true, configurable: true })</code> (restore the lost constructor), and optionally <code>Object.setPrototypeOf(Dog, Animal)</code> for static inheritance. Mistakes: <code>Dog.prototype = Animal.prototype</code> (shared object — adding a Dog method adds it to every Animal); <code>Dog.prototype = new Animal()</code> (runs the constructor with no args and puts instance data on the shared prototype); forgetting <code>Animal.call(this)</code> (missing own fields); forgetting <code>constructor</code>; and adding methods <b>before</b> replacing the prototype, which throws them away.</p>`,
      followUps: ['How does Babel\'s <code>_inherits</code> helper do it?', 'How would you call the parent\'s version of an overridden method in ES5?', 'Why is <code>Object.create</code> better than <code>new Animal()</code> here?']
    },
    {
      q: 'What does <code>Object.create</code> do, and when would you use <code>Object.create(null)</code>?', level: 'B',
      a: `<p><code>Object.create(proto, descriptors?)</code> makes a new empty object whose <code>[[Prototype]]</code> is <code>proto</code>, optionally defining properties with full descriptors. It is pure delegation with no constructor involved — the most direct way to say "this object should fall back to that one". <code>Object.create(null)</code> makes an object with <b>no</b> prototype: it inherits nothing, so keys like <code>toString</code>, <code>constructor</code> or <code>__proto__</code> are just ordinary keys. That makes it a safe dictionary for untrusted keys (no prototype pollution through <code>__proto__</code> writes, no false positives from <code>'toString' in dict</code>). Today a <code>Map</code> is often better still, but null-prototype objects remain common for JSON-like lookups and in libraries.</p>`,
      followUps: ['Write a polyfill for <code>Object.create</code> using a temporary constructor.', 'Why does <code>dict.hasOwnProperty(k)</code> throw on a null-prototype object?', 'Map vs null-prototype object: trade-offs?']
    },
    {
      q: 'How do <code>#private</code> fields differ from the underscore convention, closures and TypeScript <code>private</code>?', level: 'I',
      a: `<p><code>_name</code> is only a naming hint — fully public. TypeScript <code>private</code> is checked at compile time and erased, so at runtime the property is public and visible to <code>Object.keys</code>/<code>JSON.stringify</code>. Closure privacy (variables in the constructor) is real but costs per-instance function copies and cannot be shared across instances of the same class. <code>#name</code> is enforced by the engine: the name is lexically scoped to the class body, the value lives in a hidden per-object slot (not a property), it is invisible to reflection, Proxies, <code>Object.keys</code> and JSON, and accessing it on an object without the slot throws a <code>TypeError</code> — a built-in brand check. Other instances of the same class <b>can</b> read it (class-private, not object-private), and subclasses cannot (they are not in the lexical scope).</p>`,
      followUps: ['Why do Proxies around objects with private fields often break?', 'What does <code>#x in obj</code> add over try/catch?', 'How can a subclass get "protected" access?']
    },
    {
      q: 'What are static members and static blocks? How are they inherited?', level: 'I',
      a: `<p><code>static</code> members belong to the class (the constructor function object), not to instances: factories (<code>Temperature.fromFahrenheit</code>), caches, constants, counters, <code>Array.from</code>-style helpers. Static fields are initialised once when the class is defined, in source order; a <code>static { ... }</code> block runs arbitrary initialisation code at that point with access to private statics — e.g. computing a lookup table or exposing a private accessor to a friend function. Statics are inherited because <code>extends</code> links the constructors: <code>Object.getPrototypeOf(Sub) === Base</code>, so <code>Sub.create()</code> finds <code>Base.create</code> and runs it with <code>this = Sub</code> — which is why factories should use <code>new this()</code>. Private statics are the exception: <code>this.#count</code> inside a static method fails when called on a subclass; use <code>Base.#count</code>.</p>`,
      followUps: ['When is the class binding available inside a static field initialiser?', 'Static method vs a plain module-level function: which and why?', 'How would you implement a singleton with a static field?']
    },
    {
      q: 'How does <code>instanceof</code> work, when does it give surprising results, and what are the alternatives?', level: 'I',
      a: `<p><code>x instanceof C</code> first checks <code>C[Symbol.hasInstance]</code>; by default (<code>Function.prototype[Symbol.hasInstance]</code>) it walks <code>x</code>'s prototype chain and returns true if any link is <code>C.prototype</code> (by identity). Primitives return false. Surprises: it is <b>realm-specific</b> (arrays from iframes, objects from <code>vm</code> contexts or duplicated npm packages fail); changing <code>C.prototype</code> after creating instances makes old instances fail; <code>Object.create(C.prototype)</code> passes without ever running the constructor; and a custom <code>Symbol.hasInstance</code> can make it return anything. Alternatives: <code>Array.isArray</code> and other built-in checks, private-field brand checks (<code>#x in obj</code>) for your own classes, <code>Object.prototype.toString.call(x)</code> tags, or duck typing / schema validation at boundaries.</p>`,
      followUps: ['Implement <code>instanceof</code> without using it.', 'Why might two copies of the same library in node_modules break <code>instanceof</code>?', 'What does <code>Object.prototype.isPrototypeOf</code> do differently?']
    },
    {
      q: 'Why is it dangerous to call an overridable method from a constructor in JavaScript?', level: 'A',
      a: `<p>Because of construction order in derived classes. <code>new Child()</code> calls <code>super()</code> first; the base constructor runs while <code>this</code> already has <code>Child.prototype</code> as its prototype, so <code>this.method()</code> dispatches to <b>Child</b>'s override — but Child's class fields are only initialised <b>after</b> <code>super()</code> returns, and Child's constructor body has not run yet. The override therefore sees <code>undefined</code> fields (or reads private fields that do not exist yet and throws a TypeError). Fixes: keep constructors free of virtual calls; use a two-phase pattern (<code>static create()</code> that constructs then calls <code>init()</code>/<code>mount()</code>); pass needed data up via <code>super(props)</code>; or use lifecycle hooks (like <code>connectedCallback</code> in Web Components).</p>`,
      followUps: ['How do Java and C# behave in the same situation?', 'How does TypeScript\'s <code>useDefineForClassFields</code> change field semantics?', 'Which frameworks use two-phase initialisation and why?']
    },
    {
      q: 'What is prototype pollution and how do you defend against it?', level: 'A',
      a: `<p>Prototype pollution happens when attacker-controlled keys reach code like <code>target[key] = value</code> or a recursive merge. With <code>key = '__proto__'</code> (or <code>constructor.prototype</code>), the write goes through the inherited <code>__proto__</code> accessor and modifies <code>Object.prototype</code>, so <b>every</b> object in the process suddenly inherits properties like <code>isAdmin: true</code>. This has hit lodash <code>merge</code>, jQuery <code>extend</code>, minimist and many config/query parsers, leading to auth bypasses, DoS and even RCE through template engines. Defences: reject <code>__proto__</code>, <code>constructor</code> and <code>prototype</code> keys in merges; use <code>Map</code> or <code>Object.create(null)</code> for untrusted dictionaries; check <code>Object.hasOwn</code> before reading options; validate input with schemas; freeze <code>Object.prototype</code> in hardened environments; run Node with <code>--disable-proto=delete</code> or <code>throw</code>.</p>`,
      followUps: ['Why is <code>JSON.parse(\'{"__proto__":{}}\')</code> alone harmless?', 'Write a safe <code>deepMerge</code>.', 'How can pollution turn into RCE (gadgets)?']
    },
    {
      q: 'Inheritance vs composition in JavaScript: when would you use mixins, and what are their pitfalls?', level: 'A',
      a: `<p>Class inheritance is fine for genuine is-a relationships with a shallow hierarchy (e.g. <code>ValidationError extends Error</code>, framework base classes). For sharing behaviour across unrelated classes, prefer composition: hold a helper object (<code>this.emitter = new EventEmitter()</code>) or use functions. Mixins via class factories (<code>const Eventful = B =&gt; class extends B {...}</code>) give multiple-behaviour reuse while keeping a real prototype chain, live delegation, <code>super</code> cooperation and private fields. Pitfalls: name collisions resolved by composition order, deep chains that are hard to debug, <code>instanceof</code> not working for the mixin itself (each application creates a new class), and constructor-argument plumbing. Object-copy mixins (<code>Object.assign(proto, mixin)</code>) are worse: they snapshot, flatten getters and silently overwrite.</p>`,
      followUps: ['How do React hooks replace mixins (the "mixins considered harmful" story)?', 'How do you type mixins in TypeScript?', 'When does a deep hierarchy become a smell?']
    },
    {
      q: 'How do engines like V8 optimise prototype-based property access, and what code patterns hurt performance?', level: 'E',
      a: `<p>V8 gives objects <b>hidden classes</b> (maps/shapes) describing their layout, and each property access site has an <b>inline cache</b> that remembers "for objects of shape S, the property is at offset k (or on prototype P)". For inherited lookups, prototypes are put in a special dictionary-to-fast mode and protected by <i>prototype validity cells</i>: as long as no prototype on the chain changes, the cached result stays valid and the lookup costs about as much as an own property read. Patterns that hurt: <code>Object.setPrototypeOf</code>/<code>__proto__</code> on live objects (invalidates caches and deoptimises), adding methods to prototypes after hot code ran, creating objects with properties added in different orders or conditionally (many shapes → polymorphic/megamorphic sites), <code>delete</code> on hot objects (falls back to dictionary mode), and huge numbers of classes flowing through one call site. Advice: define prototypes once, initialise all fields in the constructor/class fields in the same order, prefer <code>Object.create</code> at creation time over mutating prototypes later.</p>`,
      followUps: ['What is the difference between monomorphic, polymorphic and megamorphic inline caches?', 'Why do class fields help shape stability?', 'How would you measure this (<code>--trace-ic</code>, benchmarks)?']
    }
  );

  registerModule({
    id: 'js06',
    title: 'Prototypes, Classes & Inheritance',
    intro: `<p>Java and C++ copy behaviour from a class blueprint into every object. JavaScript does something simpler and stranger: every object has a hidden <b>link to another object</b>, and when it cannot find a property on itself, it <b>asks that object</b>. That chain of links — the <b>prototype chain</b> — is the real engine behind every method call you have ever made in JS, including <code>[].map</code>, <code>'hi'.toUpperCase()</code> and every ES6 <code>class</code>.</p>
<p>In this module you will build the whole picture from the ground up: how a property lookup climbs the chain and why writes do not; the famous <code>prototype</code> vs <code>__proto__</code> vs <code>constructor</code> triangle; <code>Object.create</code> and pure delegation; constructor functions and exactly what <code>new</code> does in four steps; how <code>class</code> is (mostly) sugar over all of that — and the places where it is <b>not</b> just sugar; <code>extends</code>/<code>super</code> with its two parallel chains; truly private <code>#fields</code> and <code>static</code> members; and finally how <code>instanceof</code> really decides "is-a".</p>
<p>Interviews love this area for <b>predict-the-output</b> puzzles and <b>polyfill</b> rounds (<code>Object.create</code>, <code>new</code>, <code>instanceof</code>, ES5 <code>extends</code>). Every topic has a step-by-step visualizer, runnable examples, and practice problems that build those exact muscles.</p>`,
    goals: [
      'Predict the result of any property read or write by walking the prototype chain in your head (including shadowing, setters and read-only inherited properties)',
      'Draw the <code>prototype</code> / <code>__proto__</code> / <code>constructor</code> triangle for any class hierarchy, including <code>Function</code> and <code>Object</code> at the top',
      'Implement <code>Object.create</code>, <code>new</code>, <code>instanceof</code> and ES5-style inheritance from scratch and explain every line',
      'Write modern classes with <code>extends</code>/<code>super</code>, <code>#private</code> fields and methods, <code>static</code> members and static blocks — and explain what each desugars to',
      'Spot the classic traps: lost <code>constructor</code>, shared mutable state on prototypes, <code>this</code> before <code>super()</code>, overridden methods called from a parent constructor, cross-realm <code>instanceof</code>'
    ],
    prereqs: `JS 4 (Scope, Hoisting, TDZ &amp; Closures) and JS 5 (<code>this</code>, call/apply/bind &amp; Arrow Functions) — you must be comfortable with how <code>this</code> is decided at call time. JS 2 (objects, spread, destructuring) is assumed.`,
    hours: 12,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
