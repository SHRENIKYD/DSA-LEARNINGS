(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- shared helpers for the visualizers of this module ---------- */
  function F(narr, parts) { return { narr: narr, parts: parts }; }
  function C(label, code, hl) { return { type: 'code', label: label, lang: 'js', code: code, hl: hl || {} }; }
  function V(label, vals, hl) { return { type: 'vars', label: label, vals: vals, hl: hl || {} }; }
  function T(html, label) { return { type: 'text', label: label, html: html }; }
  function S(label, items, hl) { return { type: 'stack', label: label, items: items, hl: hl || {} }; }

  /* The "who is this?" decision flow, shared by topic 1 and topic 4 */
  var FLOW_SETUP = [
    'function fn() { return this; }',
    'function strictFn() { "use strict"; return this; }',
    'function Fn() { this.made = true; }',
    'const o = { name: "o" };',
    'const bound = fn.bind(o);',
    'const arrow = () => this;',
    'const obj = { name: "obj", fn, bound, arrow };'
  ];
  var FLOW_CASES = {
    'fn()': { path: ['Q1', 'Q2', 'Q3', 'Q4', 'Q5'], ans: 'A6', val: 'globalThis (window in a page, global in Node)', def: 1,
      why: ['fn is a normal function, not an arrow.', 'There is no <code>new</code> keyword.', 'No call/apply and fn is not a bound function.', 'Nothing sits before a dot: it is a bare call.', 'fn has no "use strict", so it is sloppy mode.'] },
    'strictFn()': { path: ['Q1', 'Q2', 'Q3', 'Q4', 'Q5'], ans: 'A5', val: 'undefined', def: 2,
      why: ['strictFn is a normal function.', 'No <code>new</code>.', 'No call/apply/bind.', 'Bare call, no object before a dot.', 'strictFn starts with "use strict" so the default is <b>undefined</b>, not the global object.'] },
    'obj.fn()': { path: ['Q1', 'Q2', 'Q3', 'Q4'], ans: 'A4', val: 'obj', def: 1,
      why: ['fn is a normal function.', 'No <code>new</code>.', 'Plain dot call, no call/apply, fn is not bound.', 'YES: <code>obj</code> is right before the dot at the moment of the call.'] },
    'fn.call(o)': { path: ['Q1', 'Q2', 'Q3'], ans: 'A3', val: 'o', def: 1,
      why: ['fn is a normal function.', 'No <code>new</code>.', 'YES: <code>.call(o)</code> hands o over explicitly.'] },
    'fn.apply(o)': { path: ['Q1', 'Q2', 'Q3'], ans: 'A3', val: 'o', def: 1,
      why: ['fn is a normal function.', 'No <code>new</code>.', 'YES: <code>.apply(o)</code> is call with an array of arguments.'] },
    'bound()': { path: ['Q1', 'Q2', 'Q3'], ans: 'A3', val: 'o (locked in by bind)', def: 5,
      why: ['bound is a bound function, not an arrow.', 'No <code>new</code>.', 'YES: bound was made by <code>fn.bind(o)</code>; its this is locked to o forever.'] },
    'obj.bound()': { path: ['Q1', 'Q2', 'Q3'], ans: 'A3', val: 'o (bind beats the dot)', def: 5,
      why: ['bound is not an arrow.', 'No <code>new</code>.', 'YES: it is a bound function. The dot (obj.) is asked later, so it never gets a vote. bind wins over implicit.'] },
    'bound.call(obj)': { path: ['Q1', 'Q2', 'Q3'], ans: 'A3', val: 'o (a bound function ignores call)', def: 5,
      why: ['bound is not an arrow.', 'No <code>new</code>.', 'YES, explicit, but bound already carries a locked this. The thisArg given to .call is thrown away: result is still o.'] },
    'new Fn()': { path: ['Q1', 'Q2'], ans: 'A2', val: 'a brand-new object { made: true }', def: 3,
      why: ['Fn is a normal function (arrows cannot be used with new).', 'YES: <code>new</code> creates a fresh object and passes it in as this.'] },
    'new bound()': { path: ['Q1', 'Q2'], ans: 'A2', val: 'a brand-new object (o is ignored)', def: 5,
      why: ['bound is not an arrow.', 'YES: <code>new</code> is asked BEFORE bind, so it wins. The o locked by bind is ignored (partial arguments still apply).'] },
    'arrow()': { path: ['Q1'], ans: 'A1', val: 'whatever this was where the arrow was written', def: 6,
      why: ['YES: arrows have no this of their own. They read it from the surrounding code, like any other outer variable.'] },
    'obj.arrow()': { path: ['Q1'], ans: 'A1', val: 'outer this, NOT obj', def: 6,
      why: ['YES: arrow. The dot in obj.arrow() is never even asked. An object literal is not a scope, so the arrow sees the this of the code around the object.'] },
    'arrow.call(o)': { path: ['Q1'], ans: 'A1', val: 'outer this (call cannot change an arrow)', def: 6,
      why: ['YES: arrow. call/apply/bind still pass arguments, but the thisArg is silently ignored.'] }
  };
  var FLOW_Q = { Q1: 'Q2', Q2: 'Q3', Q3: 'Q4', Q4: 'Q5', Q5: 'A6' };
  var FLOW_YES = { Q1: 'A1', Q2: 'A2', Q3: 'A3', Q4: 'A4', Q5: 'A5' };
  function flowGraph(hl, ehl, tags) {
    return {
      type: 'graph', label: 'Who is <code>this</code>? Ask top to bottom, first YES wins', directed: true, height: 102,
      nodes: [
        { id: 'Q1', label: '1. Arrow function?', x: 22, y: 6, shape: 'box' },
        { id: 'A1', label: "this = outer scope's this", x: 74, y: 6, shape: 'box' },
        { id: 'Q2', label: '2. Called with new?', x: 22, y: 22, shape: 'box' },
        { id: 'A2', label: 'this = brand-new object', x: 74, y: 22, shape: 'box' },
        { id: 'Q3', label: '3. call / apply / bind?', x: 22, y: 38, shape: 'box' },
        { id: 'A3', label: 'this = the object passed', x: 74, y: 38, shape: 'box' },
        { id: 'Q4', label: '4. obj.fn() dot call?', x: 22, y: 54, shape: 'box' },
        { id: 'A4', label: 'this = obj before the dot', x: 74, y: 54, shape: 'box' },
        { id: 'Q5', label: '5. Function is strict?', x: 22, y: 70, shape: 'box' },
        { id: 'A5', label: 'this = undefined', x: 74, y: 70, shape: 'box' },
        { id: 'A6', label: 'this = globalThis', x: 22, y: 92, shape: 'box' }
      ],
      edges: [['Q1', 'A1', 'yes'], ['Q1', 'Q2', 'no'], ['Q2', 'A2', 'yes'], ['Q2', 'Q3', 'no'], ['Q3', 'A3', 'yes'], ['Q3', 'Q4', 'no'], ['Q4', 'A4', 'yes'], ['Q4', 'Q5', 'no'], ['Q5', 'A5', 'yes'], ['Q5', 'A6', 'no']],
      hl: hl, ehl: ehl, tags: tags || {}
    };
  }
  function flowFrames(input) {
    var key = String(input === undefined ? 'obj.fn()' : input).replace(/\s+/g, '').replace(/;$/, '');
    var cs = FLOW_CASES[key];
    if (!cs) throw new Error('Type one call from this list: ' + Object.keys(FLOW_CASES).join('  |  '));
    var codeTxt = FLOW_SETUP.concat([key + ';   // <- the call-site we are judging']).join('\n');
    var callLine = FLOW_SETUP.length + 1, frames = [], hl = {}, ehl = {}, lh = {};
    lh[callLine] = 'cur';
    frames.push(F('We judge the call <code>' + key + '</code>. Rule of thumb: <b>ignore where the function was written; look at how it is called</b> (except arrows). Walk the questions from the top. The first YES decides <code>this</code>.',
      [flowGraph({}, {}), C('Setup + the call-site', codeTxt, lh)]));
    for (var i = 0; i < cs.path.length; i++) {
      var q = cs.path[i], last = i === cs.path.length - 1, yes = last && FLOW_YES[q] === cs.ans;
      var h = {}, k;
      for (k in hl) h[k] = hl[k];
      h[q] = 'cur';
      var e2 = {};
      for (k in ehl) e2[k] = ehl[k];
      var l2 = {}; l2[callLine] = 'cur'; l2[cs.def] = 'win';
      frames.push(F('<b>Question ' + q.slice(1) + ':</b> ' + cs.why[i] + ' ' + (yes ? '<span class="c-g">Answer: YES, stop here.</span>' : (last ? '<span class="c-y">Answer: NO, fall through to the last box.</span>' : '<span class="c-m">Answer: NO, move down.</span>')),
        [flowGraph(h, e2), C('Setup + the call-site (blue = the function being called)', codeTxt, l2)]));
      hl[q] = 'done';
      if (yes) ehl[q + '-' + cs.ans] = 'ok';
      else ehl[q + '-' + FLOW_Q[q]] = 'done';
    }
    var hf = {}, kk;
    for (kk in hl) hf[kk] = hl[kk];
    hf[cs.ans] = 'sel';
    var tg = {}; tg[cs.ans] = 'result';
    frames.push(F('Result for <code>' + key + '</code>: <b>this = ' + cs.val + '</b>.', [flowGraph(hf, ehl, tg), V('Inside the function', { 'call-site': key, 'this': cs.val }, { 'this': 'sel' })]));
    frames.push(F('Recap: the order of the questions IS the precedence. <b>arrow (lexical) → new → explicit (call/apply/bind) → implicit (dot) → default (undefined in strict, globalThis in sloppy)</b>. Try another call in the input box, e.g. <code>new bound()</code> or <code>obj.arrow()</code>.',
      [{ type: 'table', label: 'Binding rules, strongest first', columns: ['#', 'Rule', 'Call looks like', 'this is'], rows: [['0', 'lexical (arrow)', 'arrow()', 'outer this'], ['1', 'new', 'new Fn()', 'new object'], ['2', 'explicit', 'fn.call(o) / bind', 'o'], ['3', 'implicit', 'obj.fn()', 'obj'], ['4', 'default', 'fn()', 'undefined / globalThis']], hl: { 0: cs.ans === 'A1' ? 'sel' : '', 1: cs.ans === 'A2' ? 'sel' : '', 2: cs.ans === 'A3' ? 'sel' : '', 3: cs.ans === 'A4' ? 'sel' : '', 4: (cs.ans === 'A5' || cs.ans === 'A6') ? 'sel' : '' } }]));
    return frames;
  }

  /* =====================================================================
     TOPIC 1: what this is + default binding
     ===================================================================== */
  topics.push({
    title: 'What this Really Is: the Call-Site Rule & Default Binding',
    analogy: `<p>Think of the word <b>"my"</b> in the sentence <i>"Please pass me my phone."</i> The sentence was written once, but <b>whoever says it</b> decides whose phone it means. If Asha says it, it is Asha's phone. If Ben says it, it is Ben's.</p>
      <p>A JavaScript function is that sentence, and <code>this</code> is the word "my". It is decided by <b>who is calling right now</b>, not by where the sentence was written. And if a sentence is shouted with no speaker at all? Old (sloppy) JavaScript shrugs and says "it must be the building owner's phone" (the global object). Strict JavaScript says "nobody's phone" (<code>undefined</code>), which is safer: you notice the mistake at once.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> <code>this</code> is a <b>hidden extra parameter</b> that every normal function gets. You never write it in the parameter list; JavaScript fills it in <b>at the moment of the call</b>, based on <b>how</b> the call is written. That place in the code where the function is called is named the <b>call-site</b>.</p>
      <p>So the golden rule of this module is short:</p>
      <blockquote><b>To find <code>this</code>, do not look at the function. Look at the call-site.</b> (The one exception: arrow functions, which have no <code>this</code> of their own; topic 5.)</blockquote>
      <p>There are exactly <b>four binding rules</b> (plus the arrow exception), checked in this order of strength:</p>
      ${H.table(['Strength', 'Rule', 'Call-site looks like', 'this becomes'], [
        ['1 (strongest)', H.c('p', 'new binding'), '<code>new Fn()</code>', 'a brand-new object'],
        ['2', H.c('b', 'explicit binding'), '<code>fn.call(o)</code>, <code>fn.apply(o)</code>, <code>fn.bind(o)()</code>', '<code>o</code>'],
        ['3', H.c('g', 'implicit binding'), '<code>obj.fn()</code>', '<code>obj</code> (the thing left of the dot)'],
        ['4 (fallback)', H.c('y', 'default binding'), '<code>fn()</code>', '<code>undefined</code> in strict mode, <code>globalThis</code> in sloppy mode']
      ])}
      <p><b>Default binding</b> is the "nobody claimed it" case: a bare call like <code>fn()</code> with no dot, no <code>new</code>, no <code>call</code>. What happens then depends on <b>strict mode</b>:</p>
      <ul>
        <li><b>Sloppy mode</b> (the old default for scripts): <code>this</code> becomes the <b>global object</b>. In a browser that is <code>window</code>; in Node it is <code>global</code>. Since 2020 both are reachable by one name: <code>globalThis</code>.</li>
        <li><b>Strict mode</b> (<code>"use strict"</code>, and automatically inside <b>classes</b> and <b>ES modules</b>): <code>this</code> is simply <code>undefined</code>. Touching <code>this.x</code> then throws a <code>TypeError</code>, so the bug shouts at you instead of silently writing to the global object.</li>
      </ul>
      ${H.kv([['fn()  (sloppy)', 'globalThis'], ['fn()  (strict)', 'undefined'], ['obj.fn()', 'obj'], ['fn.call(o)', 'o'], ['new Fn()', 'new object']], { label: 'Same function, different call-sites', hl: { 'fn()  (strict)': 'g' } })}
      <p><b>Two myths to drop right now:</b> (1) "<code>this</code> is the function itself": no, a function does not point at itself through <code>this</code>. (2) "<code>this</code> is the function's scope": no, scope (which variables you can see) is decided where the code is <i>written</i>; <code>this</code> is decided where the function is <i>called</i>. They are two separate systems.</p>`,
    clues: [
      '"What does this print?" with a function called bare, like <code>fn()</code> or <code>const f = obj.m; f()</code> → default binding',
      'A constructor called <b>without</b> <code>new</code> and globals mysteriously appear → sloppy default binding leaked onto <code>globalThis</code>',
      '<code>TypeError: Cannot read properties of undefined (reading \'x\')</code> inside a method → strict-mode default binding (this is undefined)',
      '"It works in the browser console but breaks in a module / class" → modules and classes are strict, so the default switched from globalThis to undefined',
      '"Is <code>this</code> decided at definition time or call time?" → call time (except arrows)',
      '"What is <code>this</code> at the top level?" → depends on environment: script = window, ES module = undefined, Node CommonJS = module.exports'
    ],
    code: [{ lang: 'js', run: true, title: 'One function, four call-sites (runnable)', code: `
      // whoAmI does not decide its own "this" - the CALL-SITE does.
      function whoAmI() {
        if (this === undefined) return 'undefined (strict default)';
        if (this === globalThis) return 'globalThis (sloppy default)';
        return 'an object labelled "' + this.label + '"';
      }

      function whoAmIStrict() {
        'use strict';                      // strict only inside this function
        return this === undefined ? 'undefined (strict default)' : 'something else';
      }

      const card = { label: 'card', whoAmI };   // same function stored on an object

      console.log('1.', whoAmI());                        // default, sloppy -> globalThis
      console.log('2.', whoAmIStrict());                  // default, strict -> undefined
      console.log('3.', card.whoAmI());                   // implicit -> card
      console.log('4.', whoAmI.call({ label: 'box' }));   // explicit -> box
      console.log('5.', new whoAmI() instanceof whoAmI);  // new -> fresh object (prints true)
    ` }],
    codeTitle: ['Runnable: the call-site decides'],
    viz: [{
      title: 'Who is this? Decision flow (type any call-site)',
      input: 'obj.fn()',
      inputLabel: 'Call-site: fn() | strictFn() | obj.fn() | fn.call(o) | bound() | obj.bound() | new Fn() | new bound() | arrow() | obj.arrow() | arrow.call(o)',
      gen: flowFrames
    }, {
      title: 'Default binding: sloppy vs strict, step by step',
      gen: function () {
        var code = [
          'function setColor(c) {',
          '  this.color = c;          // who is this?',
          '}',
          'setColor("red");          // bare call, sloppy',
          'console.log(globalThis.color); // "red" leaked!',
          '',
          'function setColorStrict(c) {',
          '  "use strict";',
          '  this.color = c;',
          '}',
          'setColorStrict("blue");   // bare call, strict'
        ].join('\n');
        return [
          F('Two functions doing the same job. One is sloppy (no directive), one is strict. Both are called <b>bare</b>: no dot, no <code>new</code>, no <code>call</code>. That means <b>default binding</b>.', [C('default-binding.js', code, { 4: 'cur', 11: 'cur' }), S('Call stack', ['(top-level script)']), V('globalThis', { color: '(not set)' })]),
          F('Line 4 calls <code>setColor("red")</code>. JavaScript must fill the hidden <code>this</code> parameter. Nobody is in front of a dot, so the fallback rule applies.', [C('default-binding.js', code, { 4: 'cur' }), S('Call stack', ['(top-level script)', 'setColor("red")'], { 1: 'cur' }), V('setColor frame', { c: '"red"', 'this': '?' }, { 'this': 'cur' })]),
          F('setColor is <b>sloppy</b>, so a missing <code>this</code> is replaced by the <b>global object</b>. Line 2 therefore writes <code>globalThis.color = "red"</code>. No error, no warning.', [C('default-binding.js', code, { 2: 'bad' }), S('Call stack', ['(top-level script)', 'setColor("red")'], { 1: 'cur' }), V('setColor frame', { c: '"red"', 'this': 'globalThis' }, { 'this': 'bad' }), V('globalThis', { color: '"red"' }, { color: 'bad' })]),
          F('Back at top level, line 5 proves it: a global variable appeared out of nowhere. In a big app this silently overwrites real globals; a classic hard-to-find bug.', [C('default-binding.js', code, { 5: 'bad' }), S('Call stack', ['(top-level script)']), V('globalThis', { color: '"red"' }, { color: 'bad' })]),
          F('Line 11 calls <code>setColorStrict("blue")</code>, again bare. The function body starts with <code>"use strict"</code>.', [C('default-binding.js', code, { 11: 'cur', 8: 'win' }), S('Call stack', ['(top-level script)', 'setColorStrict("blue")'], { 1: 'cur' }), V('setColorStrict frame', { c: '"blue"', 'this': '?' }, { 'this': 'cur' })]),
          F('In strict mode the missing <code>this</code> stays <b>undefined</b>. No silent swap for the global object.', [C('default-binding.js', code, { 9: 'cur' }), V('setColorStrict frame', { c: '"blue"', 'this': 'undefined' }, { 'this': 'ok' })]),
          F('<code>undefined.color = "blue"</code> throws <b>TypeError: Cannot set properties of undefined (setting \'color\')</b>. Loud failure at the exact line = easy fix. That is why strict mode (and modules/classes, which are strict automatically) are the modern default.', [C('default-binding.js', code, { 9: 'bad' }), V('Result', { sloppy: 'silent global leak', strict: 'TypeError at once' }, { sloppy: 'bad', strict: 'ok' })])
        ];
      }
    }],
    examples: [
      { title: 'Forgetting new leaks globals (sloppy mode)', html: `<p>A constructor called without <code>new</code> is just a bare call, so default binding kicks in. In sloppy mode <code>this</code> is the global object, so the "instance fields" land on <code>globalThis</code> and the function returns <code>undefined</code>.</p>${H.kv([['p', 'undefined'], ['globalThis.nick', '"Ana" (leaked)']], { hl: { 'globalThis.nick': 'r' } })}`,
        code: { lang: 'js', run: true, code: `
          function Person(nick) {
            this.nick = nick;          // meant for the new object...
          }
          const p = Person('Ana');     // ...but we forgot "new"
          console.log('p =', p);                         // undefined (no return statement)
          console.log('globalThis.nick =', globalThis.nick); // 'Ana' - leaked onto the global object
          delete globalThis.nick;      // clean up our mess
        ` } },
      { title: 'Strict mode turns the leak into a loud error', html: `<p>Same mistake, but the function is strict. Now <code>this</code> is <code>undefined</code>, and writing a property on <code>undefined</code> throws. ${H.c('g', 'Loud and early beats silent and wrong.')}</p>`,
        code: { lang: 'js', run: true, code: `
          function StrictPerson(nick) {
            'use strict';
            this.nick = nick;          // this is undefined here when called bare
          }
          try {
            StrictPerson('Ana');
          } catch (e) {
            console.log(e.constructor.name + ': ' + e.message);
          }
        ` } },
      { title: 'Strictness belongs to the CALLED function, not the caller', html: `<p>A very common trick question. <code>caller</code> is strict, <code>sloppy</code> is not. When <code>caller</code> calls <code>sloppy()</code> bare, which rule wins? The mode of the function <b>being called</b>, because that function's own code decides what to do with a missing <code>this</code>.</p>${H.table(['Function', 'Strict?', 'this when called bare'], [['caller', 'yes', 'undefined'], ['sloppy', 'no', H.c('y', 'globalThis')]])}`,
        code: { lang: 'js', run: true, code: `
          function sloppy() {
            return this === globalThis;   // sloppy code: missing this -> global object
          }
          function caller() {
            'use strict';
            return sloppy();              // strict caller, but sloppy callee
          }
          console.log(caller());          // true  -> the callee's mode wins
        ` } },
      { title: 'Myth buster: this is NOT the function itself', html: `<p>Beginners write <code>this.count++</code> inside a function hoping to count its own calls. <code>this</code> is not the function, so <code>tick.count</code> never changes. In sloppy mode the bare call even creates <code>globalThis.count = NaN</code>. Fix: refer to the function by name, or better, use a closure.</p>`,
        code: { lang: 'js', run: true, code: `
          function tick() {
            this.count++;              // this is globalThis here, not tick!
          }
          tick.count = 0;
          tick(); tick(); tick();
          console.log('tick.count =', tick.count);           // 0
          console.log('globalThis.count =', globalThis.count); // NaN (undefined + 1)
          delete globalThis.count;

          // Fix with a closure: no "this" needed at all
          function makeCounter() { let n = 0; return () => ++n; }
          const next = makeCounter();
          next(); next();
          console.log('closure counter =', next());          // 3
        ` } },
      { title: 'Same expression, different hosts: top-level this', html: `<p>Outside any function, <code>this</code> is set by the <b>environment</b>, not by the four rules:</p>${H.table(['Where the code runs', 'top-level this'], [['Browser classic &lt;script&gt;', '<code>window</code>'], ['Browser or Node ES module (<code>type="module"</code>, .mjs)', H.c('g', '<code>undefined</code>')], ['Node CommonJS file (.js with require)', '<code>module.exports</code> (an empty object {})'], ['Web Worker', '<code>self</code>']])}<p>This is why many "what does this print?" puzzles have no single answer unless the interviewer says where the code runs. Say so out loud; it scores points.</p>` }
    ],
    deepDive: `<p><b>🟣 How the engine really does it.</b> In the spec, every normal function call goes through <code>OrdinaryCallBindThis(F, calleeContext, thisArgument)</code>:</p>
      <ol>
        <li>If the function's <code>[[ThisMode]]</code> is <b>lexical</b> (arrow functions), do nothing: the function environment has no own this binding, so lookups go outward like a normal variable.</li>
        <li>If <code>[[ThisMode]]</code> is <b>strict</b>, use <code>thisArgument</code> exactly as given (even <code>undefined</code>, <code>null</code>, or a primitive like <code>5</code>).</li>
        <li>Otherwise (<b>sloppy</b>): if <code>thisArgument</code> is <code>undefined</code> or <code>null</code>, use the realm's global this; else wrap it with <code>ToObject</code> (so <code>5</code> becomes a <code>Number</code> object).</li>
      </ol>
      <p>Where does <code>thisArgument</code> come from? When the engine evaluates <code>obj.fn()</code>, the left side <code>obj.fn</code> produces a <b>Reference</b> (base = <code>obj</code>, name = <code>"fn"</code>). The base becomes thisArgument. A bare <code>fn()</code> yields a reference whose base is an environment record, which gives <code>undefined</code>. That single detail explains every rule in the next topics: the dot keeps the base; copying the function into a variable throws the base away.</p>
      <p><b>Strictness is lexical</b>: it is a property of the function's source text ("use strict" directive, or living inside a class body or an ES module). That is why the callee's mode wins in the earlier example. Note: a function with default, rest, or destructured parameters <b>cannot</b> contain its own <code>"use strict"</code> directive (SyntaxError); put it at file level instead.</p>
      <p><b>Production reality:</b> almost all modern code (ES modules, classes, TypeScript output with <code>"alwaysStrict"</code>, bundlers) is strict, so the default binding today is effectively <code>undefined</code>. The sloppy "global object" behaviour still bites in old scripts, in inline <code>onclick</code> attributes, and in quick console experiments, which is exactly where interview puzzles live. Performance-wise, <code>this</code> is just the "receiver" register in V8; there is no runtime cost to using it, but the sloppy-mode <code>ToObject</code> boxing of primitives allocates a wrapper object on every call.</p>`,
    aiEra: `<p><b>🤖 What AI changes:</b> assistants write most boilerplate methods now, and they usually get <code>this</code> right inside classes. Where they slip is the <b>environment</b>: they answer "what is top-level this?" with <code>window</code> even when your code is an ES module or Node CommonJS, and they forget that an inline handler or legacy script is sloppy.</p>
      <p><b>Use AI as a partner:</b> ask <code>Give me 8 tricky "what does this log" snippets about default binding; do not show answers</code>, solve them by hand with the five-question flow, then ask it to check. Paste a <code>TypeError: Cannot read properties of undefined</code> stack trace and ask "which call-site lost its receiver?"; it is good at spotting the detached method.</p>
      <p><b>Where AI goes wrong:</b> it may "fix" a lost-this bug by switching a file to sloppy mode or by adding a global; reject that. It also invents rules like "this is the enclosing object" for object literals. <b>What you must still own:</b> reading a call-site and naming the rule in one sentence, knowing the strict vs sloppy fallback, and asking which host (browser script, module, Node) the code runs in.</p>`
  });

  /* =====================================================================
     TOPIC 2: implicit binding
     ===================================================================== */
  var IMP_CASES = {
    'user.greet()': { base: 'user', kept: true, out: 'Hi, I am Asha', steps: ['Evaluate <code>user.greet</code>: look up "greet" on <b>user</b>. Found the function. The engine remembers a <b>reference</b> = (base: user, name: "greet").', 'The call <code>( )</code> is applied <b>directly</b> to that reference, so the base survives.'] },
    'user.pet.greet()': { base: 'user.pet', kept: true, out: 'Hi, I am Rex', steps: ['Evaluate <code>user.pet</code> first (just a value), then <code>.greet</code> on it. Reference = (base: <b>user.pet</b>, name: "greet").', 'Only the object <b>immediately</b> left of the last dot counts. user is not involved.'] },
    'kid.greet()': { base: 'kid', kept: true, out: 'Hi, I am Mia', steps: ['"greet" is not on kid itself. The lookup walks up the prototype chain and finds it on <b>user</b>. But the reference still has base: <b>kid</b>.', 'Where the method was FOUND does not matter. The object you called it THROUGH (the receiver) becomes this.'] },
    'g()': { base: null, kept: false, out: 'TypeError: Cannot read properties of undefined (reading "name")', steps: ['Earlier, <code>const g = user.greet;</code> copied only the <b>function value</b> into g. Functions do not remember the object they came from.', 'Now <code>g()</code> is a bare call: reference base is an environment, not an object. Implicit binding is LOST.'] },
    '(user.greet)()': { base: 'user', kept: true, out: 'Hi, I am Asha', steps: ['Grouping parentheses <code>( )</code> return the reference <b>unchanged</b> (the spec says so explicitly).', 'So the call still sees base: user. Parentheses alone do NOT lose this.'] },
    '(0,user.greet)()': { base: null, kept: false, out: 'TypeError: Cannot read properties of undefined (reading "name")', steps: ['The comma operator evaluates both sides and returns the right side as a <b>plain value</b> (GetValue), not a reference.', 'Bare function value, no base. This trick is used on purpose by bundlers to call a function WITHOUT a receiver.'] },
    'user?.greet()': { base: 'user', kept: true, out: 'Hi, I am Asha', steps: ['Optional chaining checks user is not null/undefined, then evaluates <code>.greet</code> as a normal member reference.', 'The base is preserved. <code>user.greet?.()</code> keeps it too.'] }
  };
  function impGraph(hl, ehl, tags) {
    return { type: 'graph', label: 'Objects point at the function. The function points at nobody.', directed: true, height: 52,
      nodes: [
        { id: 'user', label: 'user { name: "Asha" }', x: 18, y: 8, shape: 'box' },
        { id: 'pet', label: 'pet { name: "Rex" }', x: 18, y: 26, shape: 'box' },
        { id: 'kid', label: 'kid { name: "Mia" }', x: 18, y: 44, shape: 'box' },
        { id: 'fn', label: 'function greet', x: 74, y: 26, shape: 'box' },
        { id: 'g', label: 'variable g', x: 74, y: 46, shape: 'box' }
      ],
      edges: [['user', 'fn', '.greet'], ['pet', 'fn', '.greet'], ['user', 'pet', '.pet'], ['kid', 'user', '[[Prototype]]'], ['g', 'fn']],
      hl: hl, ehl: ehl, tags: tags || {} };
  }
  topics.push({
    title: 'Implicit Binding: the Dot Rule and How It Gets Lost',
    analogy: `<p>Think of a hotel phone extension, say <b>"dial 0 for reception"</b>. Dial 0 from a room in Hotel A and Hotel A's reception answers. Dial the very same 0 from Hotel B and Hotel B answers. The number did not change; <b>the building you dialled from</b> did.</p>
      <p>In <code>obj.fn()</code>, <code>obj</code> is the building. Now copy "0" onto a sticky note and dial it from a phone box on the street: no hotel answers. That is <b>implicit loss</b>: you carried the function away from its object, so the call no longer has a building.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> When a function is called <b>through</b> an object with a dot (or brackets), that object becomes <code>this</code>:</p>
      ${H.table(['Call-site', 'this', 'Why'], [
        ['<code>user.greet()</code>', H.c('g', 'user'), 'user is left of the dot'],
        ['<code>user["greet"]()</code>', H.c('g', 'user'), 'brackets work exactly like the dot'],
        ['<code>user.pet.greet()</code>', H.c('g', 'user.pet'), 'only the LAST object before the call counts'],
        ['<code>kid.greet()</code> (greet lives on kid\'s prototype)', H.c('g', 'kid'), 'the receiver counts, not where the method was found']
      ])}
      <p><b>🔵 The key fact:</b> a function is a value. It does <b>not</b> remember which object it was stored in. The same function can sit on ten objects. The dot is only a <b>temporary</b> link that exists during that one call expression.</p>
      <p>So the moment the function leaves the <code>obj.fn( )</code> shape, the link is gone. This is called <b>implicit loss</b>, and it is the number-one <code>this</code> bug:</p>
      ${H.table(['Losing move', 'Example', 'this becomes'], [
        ['Assign to a variable', '<code>const g = user.greet; g()</code>', H.c('r', 'default (undefined / globalThis)')],
        ['Destructure a method', '<code>const { greet } = user; greet()</code>', H.c('r', 'default')],
        ['Pass as a callback', '<code>setTimeout(user.greet, 0)</code>, <code>arr.map(obj.fn)</code>', H.c('r', 'whatever the caller chooses')],
        ['Comma / assignment / logical operator', '<code>(0, user.greet)()</code>, <code>(x || user.greet)()</code>', H.c('r', 'default')],
        ['Return it from a function', '<code>getMethod()()</code>', H.c('r', 'default')]
      ])}
      <p>And moves that <b>keep</b> it: plain grouping parentheses <code>(user.greet)()</code>, optional chaining <code>user?.greet()</code> and <code>user.greet?.()</code>, and tagged templates written as <code>user.tag\`hi\`</code>.</p>
      <p><b>Method chaining</b> is implicit binding used on purpose: each method ends with <code>return this</code>, so the next <code>.method()</code> is again called on the same object: <code>cart.add(1).add(2).total()</code>.</p>`,
    clues: [
      '<code>const fn = obj.method; fn()</code> or <code>const { method } = obj</code> → implicit loss, default binding',
      'A method passed as an argument: <code>setTimeout(obj.m)</code>, <code>arr.forEach(obj.m)</code>, <code>promise.then(obj.m)</code> → the caller, not obj, decides this',
      '<code>a.b.c.fn()</code> "what is this?" → only <code>a.b.c</code>, the last object before the call',
      'Method found on the prototype → this is still the object you called it on (receiver)',
      '<code>(0, obj.fn)()</code> or <code>(obj.fn = obj.fn)()</code> puzzles → operators return plain values, the base is dropped',
      '"Fluent API", "chainable", "builder pattern" → methods return <code>this</code>'
    ],
    code: [{ lang: 'js', run: true, title: 'Kept vs lost, side by side (runnable)', code: `
      'use strict';
      function describe(t) { return t === undefined ? 'undefined' : t.label; }

      const user = {
        label: 'user',
        greet() { return describe(this); },
        pet: { label: 'pet', greet() { return describe(this); } }
      };
      const kid = Object.create(user);   // kid's prototype is user
      kid.label = 'kid';

      console.log('user.greet()      ->', user.greet());        // user
      console.log('user.pet.greet()  ->', user.pet.greet());    // pet (last object wins)
      console.log('kid.greet()       ->', kid.greet());         // kid (receiver, not owner)
      console.log('(user.greet)()    ->', (user.greet)());      // user (parens keep the reference)
      console.log('user?.greet()     ->', user?.greet());       // user

      const g = user.greet;              // copy the function value only
      console.log('g()               ->', g());                 // undefined (lost!)
      console.log('(0, user.greet)() ->', (0, user.greet)());   // undefined (comma returns a value)
      const { greet } = user;
      console.log('destructured      ->', greet());             // undefined
    ` }],
    codeTitle: ['Runnable: every keep/lose move'],
    viz: [{
      title: 'The dot rule: is the base object kept or dropped?',
      input: 'g()',
      inputLabel: 'Expression: user.greet() | user.pet.greet() | kid.greet() | g() | (user.greet)() | (0,user.greet)() | user?.greet()',
      gen: function (input) {
        var key = String(input === undefined ? 'g()' : input).replace(/\s+/g, '');
        var cs = IMP_CASES[key];
        if (!cs) throw new Error('Pick one of: ' + Object.keys(IMP_CASES).join('  |  '));
        var code = [
          '"use strict";',
          'const user = { name: "Asha", greet() { return "Hi, I am " + this.name; } };',
          'user.pet = { name: "Rex", greet: user.greet };',
          'const kid = Object.create(user); kid.name = "Mia";',
          'const g = user.greet;      // copies the function only',
          key + ';'
        ].join('\n');
        var fr = [];
        fr.push(F('Setup: three objects and one function. Notice the arrows in the picture: objects point <b>to</b> greet, but greet points to <b>nobody</b>. We now evaluate <code>' + key + '</code>.',
          [impGraph({}, {}), C('implicit.js', code, { 6: 'cur' })]));
        var hlA = {}, ehA = {};
        if (cs.base === 'user') { hlA.user = 'cur'; ehA['user-fn'] = 'cur'; }
        else if (cs.base === 'user.pet') { hlA.user = 'done'; hlA.pet = 'cur'; ehA['user-pet'] = 'done'; ehA['pet-fn'] = 'cur'; }
        else if (cs.base === 'kid') { hlA.kid = 'cur'; hlA.user = 'win'; ehA['kid-user'] = 'cur'; ehA['user-fn'] = 'cur'; }
        else { hlA.g = 'cur'; ehA['g-fn'] = 'cur'; }
        hlA.fn = 'win';
        fr.push(F('<b>Step 1, find the function.</b> ' + cs.steps[0], [impGraph(hlA, ehA), V('Reference record', { base: cs.base === null ? '(none: plain value)' : cs.base, name: '"greet"' }, { base: cs.base === null ? 'bad' : 'ok' })]));
        fr.push(F('<b>Step 2, is the base still attached when ( ) runs?</b> ' + cs.steps[1], [impGraph(hlA, ehA), V('At the call', { 'base kept?': cs.kept ? 'yes' : 'no', rule: cs.kept ? 'implicit binding' : 'default binding (strict)' }, { 'base kept?': cs.kept ? 'ok' : 'bad' })]));
        var hlB = {}; hlB.fn = 'cur';
        if (cs.kept) hlB[cs.base === 'user.pet' ? 'pet' : cs.base] = 'sel';
        var tg = {};
        if (cs.kept) tg[cs.base === 'user.pet' ? 'pet' : cs.base] = 'this';
        fr.push(F('<b>Step 3, run greet.</b> this = ' + (cs.kept ? '<b>' + cs.base + '</b>' : '<b>undefined</b> (strict file)') + '.', [impGraph(hlB, {}, tg), S('Call stack', ['(module)', 'greet  this=' + (cs.kept ? cs.base : 'undefined')], { 1: cs.kept ? 'ok' : 'bad' }), V('greet frame', { 'this': cs.kept ? cs.base : 'undefined', 'this.name': cs.kept ? 'read OK' : 'throws' }, { 'this': cs.kept ? 'sel' : 'bad' })]));
        fr.push(F('Output: <code>' + cs.out + '</code>. ' + (cs.kept ? '<span class="c-g">Base kept, implicit binding worked.</span>' : '<span class="c-r">Base dropped. Fix with <code>user.greet.bind(user)</code>, an arrow wrapper <code>() =&gt; user.greet()</code>, or call it as <code>user.greet()</code>.</span>'),
          [T('<pre>' + cs.out + '</pre>', 'Console'), T('Rule of thumb: <b>the dot must be touching the parentheses</b> at the moment of the call: <code>obj.fn()</code>. Anything that turns <code>obj.fn</code> into a plain value first (a variable, an argument, an operator) drops the object.')]));
        return fr;
      }
    }],
    examples: [
      { title: 'Deep chain: only the last object counts', html: `<p>For <code>company.team.lead.introduce()</code>, the engine evaluates <code>company.team.lead</code> as an ordinary value, then calls <code>introduce</code> on it. So <code>this</code> is <code>lead</code>, and <code>this.team</code> is <code>undefined</code> unless lead has its own team property.</p>${H.chips(['company', 'team', H.c('g', 'lead ← this'), 'introduce()'], { label: 'chain' })}`,
        code: { lang: 'js', run: true, code: `
          const company = {
            name: 'Acme',
            team: {
              name: 'Platform',
              lead: {
                name: 'Zoe',
                introduce() { return 'I am ' + this.name + ', team = ' + this.team; }
              }
            }
          };
          console.log(company.team.lead.introduce()); // I am Zoe, team = undefined
        ` } },
      { title: 'Prototype methods use the receiver', html: `<p>Shared methods live once on a prototype, yet each object sees itself as <code>this</code>. That is the whole reason prototypes (and classes) work: one function, many receivers.</p>${H.kv([['dog.speak()', 'this = dog'], ['cat.speak()', 'this = cat'], ['speak is stored on', 'animal (shared)']])}`,
        code: { lang: 'js', run: true, code: `
          const animal = {
            speak() { return this.sound + '!'; }   // stored ONCE here
          };
          const dog = Object.create(animal); dog.sound = 'Woof';
          const cat = Object.create(animal); cat.sound = 'Meow';
          console.log(dog.speak(), cat.speak());     // Woof! Meow!
          console.log(dog.speak === cat.speak);      // true - the very same function
        ` } },
      { title: 'Output puzzle: the method that returns a method', html: `<p>Predict each line before running. The trick is line 3: <code>obj.getGetter()</code> runs with <code>this = obj</code>, but it returns a <b>plain function</b> which is then called bare.</p>${H.table(['Line', 'Output', 'Rule'], [['1', 'obj', 'implicit'], ['2', 'obj', 'implicit'], ['3', H.c('r', 'undefined'), 'returned function called bare → default (strict)']])}`,
        code: { lang: 'js', run: true, code: `
          'use strict';
          const obj = {
            label: 'obj',
            who() { return this === undefined ? 'undefined' : this.label; },
            getGetter() { return this.who; }        // returns the function value
          };
          console.log(obj.who());                   // obj
          console.log(obj.getGetter() === obj.who); // true
          console.log(obj.getGetter()());           // undefined - called bare!
        ` } },
      { title: 'Chainable API with return this', html: `<p>A builder keeps implicit binding alive across calls by returning <code>this</code>. Each <code>.add()</code> is called on whatever the previous call returned, which is the same object.</p>${H.arr(['cart', '.add(5)', '.add(10)', '.discount(0.1)', '.total()'], { hl: { 4: 'g' } })}`,
        code: { lang: 'js', run: true, code: `
          const cart = {
            items: [],
            pct: 0,
            add(price) { this.items.push(price); return this; },      // return the receiver
            discount(p) { this.pct = p; return this; },
            total() { return this.items.reduce((s, x) => s + x, 0) * (1 - this.pct); }
          };
          console.log(cart.add(5).add(10).discount(0.1).total());     // 13.5
        ` } },
      { title: 'Destructuring a class instance method', html: `<p>Modern code destructures all the time: <code>const { save } = repo;</code>. If <code>save</code> uses <code>this</code>, it breaks, and since class bodies are strict, the error is a <code>TypeError</code>, not a silent global write.</p>`,
        code: { lang: 'js', run: true, code: `
          class Repo {
            constructor() { this.rows = []; }
            save(row) { this.rows.push(row); return this.rows.length; }
          }
          const repo = new Repo();
          const { save } = repo;            // implicit binding lost here
          try {
            save('a');
          } catch (e) {
            console.log('Lost this:', e.message);
          }
          const save2 = repo.save.bind(repo);  // fix: bind once
          console.log('Bound save ->', save2('b'));   // 1
        ` } }
    ],
    deepDive: `<p><b>🟣 Reference Records.</b> The spec models <code>obj.fn</code> as a <b>Reference Record</b> { [[Base]]: obj, [[ReferencedName]]: "fn" }. A call expression <code>MemberExpression Arguments</code> checks: if the callee evaluated to a property reference, thisValue = the base; otherwise thisValue = <code>undefined</code>. Almost every operator calls <code>GetValue()</code> on its operand, turning the reference into a plain value: assignment, comma, <code>||</code>, <code>&amp;&amp;</code>, <code>??</code>, the ternary, <code>void</code>, being an argument. The one exception is the <b>grouping operator</b> <code>( )</code>, which is defined to return its inner reference untouched. That is the whole story behind <code>(obj.fn)()</code> vs <code>(0, obj.fn)()</code>.</p>
      <p><b>The receiver through the prototype chain.</b> Property lookup <code>[[Get]](key, Receiver)</code> walks prototypes to FIND the value but keeps passing the original receiver. That is why getters defined on a prototype also see the instance as <code>this</code>, and why <code>Reflect.get(target, key, receiver)</code> takes a receiver argument (crucial when writing Proxies).</p>
      <p><b>super calls</b> are special: <code>super.method()</code> looks the method up on the parent prototype (via the method's internal <code>[[HomeObject]]</code>) but calls it with the <b>current</b> <code>this</code>, not with the parent prototype. So inherited code still sees the instance.</p>
      <p><b>Performance:</b> V8 optimises <code>obj.method()</code> with inline caches keyed on the object's hidden class. A detached function costs nothing extra, but wrappers like <code>bind</code> or arrow wrappers add one small extra call frame; JIT inlining usually removes it. The real cost of implicit loss is never speed, it is correctness.</p>`,
    aiEra: `<p><b>🤖 What AI changes:</b> code assistants destructure aggressively (<code>const { fetchUser } = api</code>) because it looks clean. If <code>api</code> is a class instance or an SDK client whose methods use <code>this</code>, that suggestion is a latent <code>TypeError</code>. Many real SDKs (database clients, HTTP clients) are classes, so this matters.</p>
      <p><b>Use AI as a partner:</b> ask it <code>List every place in this file where a method is detached from its object (assigned, destructured, passed as a callback)</code>. It is fast at this mechanical scan. Then you decide, per spot, whether the method actually uses <code>this</code>.</p>
      <p><b>Where AI goes wrong:</b> it claims parentheses lose <code>this</code> (they do not), or that a method "belongs" to the object where it was defined (it does not; the receiver wins). <b>What you must still own:</b> the reference mental model (base + name), recognising receiver vs owner in prototype puzzles, and choosing the right fix: call through the object, <code>bind</code> once, or wrap in an arrow.</p>`,
    problems: [{
      title: 'Call a Method by Path Without Losing this',
      level: 'Medium', tags: ['this', 'implicit binding', 'apply'], companies: ['Atlassian', 'Uber', 'Flipkart'],
      statement: `<p>Write <code>callPath(root, path, ...args)</code>. <code>path</code> is a dotted string like <code>"api.users.find"</code>. Walk <code>root</code> along the path and <b>call</b> the final function with the given arguments, making sure that inside it <code>this</code> is the object that <b>holds</b> it (exactly as if you had written <code>root.api.users.find(...args)</code>). Throw a <code>TypeError</code> if any step is missing or the last value is not a function.</p>`,
      constraints: `1 ≤ path segments ≤ 20; segments are non-empty property names; the target may rely on <code>this</code>.`,
      example: `<p><code>root = { api: { users: { list: ['a','b'], find(i) { return this.list[i]; } } } }</code></p><p><code>callPath(root, 'api.users.find', 1)</code> → ${H.c('g', '"b"')}. Inside <code>find</code>, <code>this</code> must be ${H.c('b', 'root.api.users')}, the object right before the last dot. A naive version that grabs the function and calls it bare gets <code>this = undefined</code> and crashes on <code>this.list</code>.</p>`,
      brute: { why: `<p>The obvious one-liner reduces the whole path to the function and calls it. It finds the right function, but calling a plain function value is a <b>bare call</b>: the parent object was thrown away by <code>reduce</code>, so <code>this</code> is <code>undefined</code> (strict) or <code>globalThis</code> (sloppy).</p>`,
        code: `
          // BROKEN: finds the function but loses its object
          function callPathNaive(root, path, ...args) {
            const fn = path.split('.').reduce((obj, key) => obj[key], root);
            return fn(...args);   // bare call -> this is undefined in strict code
          }
        ` },
      mcq: { q: 'After walking to the function, which object must become <code>this</code>?', options: ['root', 'The object that contains the last key (the parent)', 'The function itself', 'globalThis'], answer: 1, explain: '<code>a.b.c()</code> binds this to <code>a.b</code>, the object immediately left of the final dot. So remember the parent while walking.' },
      hints: [
        `<p>Hint 1: Implicit binding uses the object right before the LAST dot. So you must stop one step early and keep that parent object.</p>`,
        `<p>Hint 2: Split the path, walk all keys except the last to get <code>parent</code>, then read <code>fn = parent[last]</code> and call <code>fn.apply(parent, args)</code> or simply <code>parent[last](...args)</code>.</p>`,
        `<p>Hint 3: Edge cases: a missing segment (<code>parent == null</code>) and a non-function target should throw a clear <code>TypeError</code>. Recipe: keys = path.split('.'); last = keys.pop(); walk; check; call.</p>`
      ],
      solution: {
        approach: `<p>Walk to the <b>parent</b> of the final key, not to the function itself. Then call through the parent so implicit binding gives the right <code>this</code>. Using <code>Reflect.apply(fn, parent, args)</code> makes the binding explicit and also works if the target object has overridden <code>apply</code>.</p>`,
        code: { lang: 'js', run: true, code: `
          'use strict';
          function callPath(root, path, ...args) {
            const keys = path.split('.');
            const last = keys.pop();                 // the method name
            let parent = root;
            for (const k of keys) {                  // walk to the PARENT object
              if (parent == null) throw new TypeError('Missing segment before "' + k + '"');
              parent = parent[k];
            }
            if (parent == null) throw new TypeError('Cannot read "' + last + '" of ' + parent);
            const fn = parent[last];
            if (typeof fn !== 'function') throw new TypeError(path + ' is not a function');
            return Reflect.apply(fn, parent, args);  // this = parent, exactly like parent[last](...args)
          }

          const root = { api: { users: { list: ['a', 'b'], find(i) { return this.list[i]; } } } };
          console.log(callPath(root, 'api.users.find', 1));     // b
          try { callPath(root, 'api.orders.find', 0); } catch (e) { console.log(e.message); }
          try { callPath(root, 'api.users.list', 0); } catch (e) { console.log(e.message); }
        ` },
        dry: { head: ['step', 'key', 'parent after step', 'note'], rows: [
          ['split', '-', 'root', 'keys = [api, users], last = find'],
          ['1', 'api', 'root.api', 'walk'],
          ['2', 'users', 'root.api.users', 'walk; this is the parent'],
          ['read', 'find', 'fn = parent.find', 'typeof fn is function'],
          ['call', '-', '<span class="c-g">this = root.api.users</span>', 'returns list[1] = "b"']
        ] },
        complexity: `<p>Time O(k) for k path segments; space O(k) for the split array.</p>`,
        followUps: ['Support bracket paths like <code>"a.items[0].run"</code>.', 'Return a pre-bound function instead of calling (a "getMethod" helper).', 'What changes if a segment is a getter that uses <code>this</code>?']
      }
    }]
  });
  registerModule({ id: 'js05', title: 'this, call/apply/bind & Arrow Functions', intro: '<p>x</p>', goals: [], prereqs: 'x', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview });
})();
