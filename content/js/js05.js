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
    var key = String(input === undefined ? 'obj.fn()' : input).replace(/\s+/g, '').replace(/;$/, '').replace(/^new(?=[A-Za-z])/, 'new ');
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

  /* =====================================================================
     TOPIC 3: explicit binding - call / apply / bind
     ===================================================================== */
  topics.push({
    title: 'Explicit Binding: call, apply and bind',
    analogy: `<p>Imagine a bank clerk who does whatever the customer in front of them asks. Normally the customer is whoever walks up (implicit binding). But you can also hand the clerk a signed letter: <b>"for this one errand, act on behalf of Asha."</b> That one-time letter is <code>call</code> (the details listed one by one) or <code>apply</code> (the details stapled as one list).</p>
      <p><code>bind</code> is different: it is a <b>permanent ID badge</b>. You do not run the errand now; you get back a new clerk who will <i>always</i> act for Asha, no matter who walks up later. You can even pre-fill part of the form on the badge (partial arguments).</p>`,
    explain: `<p><b>🟢 The plain idea.</b> Every function has three built-in methods that let <b>you</b> choose <code>this</code> instead of leaving it to the call-site:</p>
      ${H.table(['Method', 'Calls the function now?', 'How arguments are given', 'Returns'], [
        ['<code>fn.call(thisArg, a, b)</code>', H.c('g', 'yes'), 'one by one (C = Comma)', 'fn\'s result'],
        ['<code>fn.apply(thisArg, [a, b])</code>', H.c('g', 'yes'), 'as one array (A = Array)', 'fn\'s result'],
        ['<code>fn.bind(thisArg, a)</code>', H.c('r', 'no'), 'some now (pre-filled), rest later', 'a NEW function with this locked']
      ])}
      <p>Memory trick: <b>C</b>all = <b>C</b>omma, <b>A</b>pply = <b>A</b>rray, <b>B</b>ind = <b>B</b>adge (keep for later).</p>
      <p><b>🔵 Three everyday uses:</b></p>
      <ol>
        <li><b>Fix a lost <code>this</code>.</b> <code>setTimeout(user.greet.bind(user), 100)</code> or in a class constructor <code>this.save = this.save.bind(this)</code>.</li>
        <li><b>Borrow a method</b> from another object without copying it: <code>Array.prototype.slice.call(arguments)</code>, <code>Object.prototype.toString.call(value)</code> (a reliable type tag like <code>"[object Array]"</code>).</li>
        <li><b>Partial application</b>: pre-fill arguments. <code>const double = multiply.bind(null, 2); double(21) // 42</code>. Passing <code>null</code> as thisArg says "this function does not use this".</li>
      </ol>
      <p><b>Rules worth memorising:</b></p>
      <ul>
        <li>A bound function is <b>locked forever</b>. Calling <code>.call(other)</code>, <code>.apply(other)</code> or even <code>.bind(other)</code> on it cannot change its <code>this</code> (extra <i>arguments</i> still get appended). The <b>only</b> thing stronger than bind is <code>new</code>.</li>
        <li>Explicit beats implicit: <code>obj.fn.call(other)</code> → this is <code>other</code>.</li>
        <li><code>thisArg</code> of <code>null</code>/<code>undefined</code>: strict functions get exactly that; sloppy functions get <code>globalThis</code> instead. Primitives like <code>5</code> are boxed into objects in sloppy mode, kept raw in strict mode (topic 7).</li>
        <li>Today, spread (<code>Math.max(...nums)</code>) has replaced most <code>apply</code> calls, and <code>Reflect.apply(fn, thisArg, args)</code> is the safest form when <code>fn.apply</code> might have been overwritten.</li>
      </ul>`,
    clues: [
      '"Borrow a method", "array-like", <code>arguments</code>, NodeList → <code>Array.prototype.X.call(arrayLike, ...)</code>',
      '"Call this function with a specific object as context" → <code>call</code>/<code>apply</code>; "for later / as a callback" → <code>bind</code>',
      '"Implement <code>Function.prototype.bind</code> / <code>call</code> / <code>apply</code> polyfill" → classic machine-coding round',
      '"Pre-fill some arguments" or "create add5 from add" → partial application with <code>bind(null, ...)</code>',
      '"What is the difference between call, apply and bind?" → timing (now vs later) + argument shape (list vs array)',
      'A bound function called with <code>.call(other)</code> or passed to <code>new</code> → bind is permanent, only <code>new</code> overrides it'
    ],
    code: [{ lang: 'js', run: true, title: 'call vs apply vs bind (runnable)', code: `
      'use strict';
      function introduce(greeting, punctuation) {
        return greeting + ', I am ' + this.name + punctuation;
      }
      const asha = { name: 'Asha' };
      const ben = { name: 'Ben' };

      // call: run NOW, arguments one by one
      console.log(introduce.call(asha, 'Hello', '!'));      // Hello, I am Asha!

      // apply: run NOW, arguments as an array
      console.log(introduce.apply(ben, ['Hi', '?']));       // Hi, I am Ben?

      // bind: DON'T run, return a new function with this (and 'Hey') locked in
      const heyAsha = introduce.bind(asha, 'Hey');
      console.log(typeof heyAsha, heyAsha.name);            // function bound introduce
      console.log(heyAsha('.'));                            // Hey, I am Asha.

      // A bound function cannot be re-pointed - not by call, not by bind
      console.log(heyAsha.call(ben, '!!'));                 // Hey, I am Asha!!
      console.log(heyAsha.bind(ben)('~'));                  // Hey, I am Asha~
    ` }],
    codeTitle: ['Runnable: the three methods side by side'],
    viz: [{
      title: 'call, apply, bind stepped line by line',
      gen: function () {
        var code = [
          'function introduce(greeting, p) {',
          '  return greeting + ", I am " + this.name + p;',
          '}',
          'const asha = { name: "Asha" }, ben = { name: "Ben" };',
          'introduce.call(asha, "Hello", "!");',
          'introduce.apply(ben, ["Hi", "?"]);',
          'const heyAsha = introduce.bind(asha, "Hey");',
          'heyAsha(".");',
          'heyAsha.call(ben, "!!");'
        ].join('\n');
        function boundGraph(hl, ehl) {
          return { type: 'graph', label: 'What bind() builds: a wrapper with 3 hidden slots', directed: true, height: 46,
            nodes: [{ id: 'B', label: 'heyAsha (bound function)', x: 22, y: 22, shape: 'box' },
              { id: 'T', label: '[[BoundTargetFunction]] introduce', x: 70, y: 6, shape: 'box' },
              { id: 'TH', label: '[[BoundThis]] asha', x: 70, y: 22, shape: 'box' },
              { id: 'A', label: '[[BoundArguments]] ["Hey"]', x: 70, y: 38, shape: 'box' }],
            edges: [['B', 'T'], ['B', 'TH'], ['B', 'A']], hl: hl || {}, ehl: ehl || {} };
        }
        return [
          F('One function, two objects. <code>introduce</code> uses <code>this.name</code>, so its output depends entirely on what <code>this</code> is at each call.', [C('explicit.js', code, { 1: 'win', 2: 'win' }), V('Objects', { asha: '{ name: "Asha" }', ben: '{ name: "Ben" }' })]),
          F('<b>call</b>: first argument is <code>this</code>, the rest are passed one by one. The function runs <b>immediately</b>.', [C('explicit.js', code, { 5: 'cur' }), S('Call stack', ['(module)', 'introduce'], { 1: 'cur' }), V('introduce frame', { 'this': 'asha', greeting: '"Hello"', p: '"!"' }, { 'this': 'sel' })]),
          F('Result: <code>"Hello, I am Asha!"</code>. Explicit binding beat the default: the call-site has no dot, yet <code>this</code> is asha.', [C('explicit.js', code, { 5: 'ok', 2: 'cur' }), T('<pre>Hello, I am Asha!</pre>', 'Console')]),
          F('<b>apply</b>: same thing, but the arguments come as <b>one array</b>. Handy when you already have the arguments in a list.', [C('explicit.js', code, { 6: 'cur' }), { type: 'array', label: 'argsArray unpacked into parameters', values: ['"Hi"', '"?"'], idxLabels: ['greeting', 'p'] }, V('introduce frame', { 'this': 'ben', greeting: '"Hi"', p: '"?"' }, { 'this': 'sel' })]),
          F('<b>bind</b> does NOT call anything. It returns a brand-new function object that remembers the target, the this value, and any pre-filled arguments.', [C('explicit.js', code, { 7: 'cur' }), boundGraph({ B: 'ok' }, {})]),
          F('Calling <code>heyAsha(".")</code>: a bare call! But a bound function ignores the call-site. It calls the target with <code>[[BoundThis]]</code> and puts the bound arguments FIRST, then the new ones.', [C('explicit.js', code, { 8: 'cur' }), boundGraph({ B: 'cur', TH: 'sel', A: 'win' }, { 'B-TH': 'ok', 'B-A': 'ok', 'B-T': 'ok' }), V('introduce frame', { 'this': 'asha', greeting: '"Hey" (pre-filled)', p: '"." (new)' }, { 'this': 'sel' })]),
          F('<code>heyAsha.call(ben, "!!")</code>: someone tries to re-point it to ben. <b>Ignored.</b> The thisArg <code>ben</code> is thrown away; only the extra argument <code>"!!"</code> is used. Output: <code>"Hey, I am Asha!!"</code>.', [C('explicit.js', code, { 9: 'bad' }), boundGraph({ TH: 'sel' }, {}), V('introduce frame', { 'this': 'asha (still!)', 'ben passed?': 'ignored', p: '"!!"' }, { 'this': 'sel', 'ben passed?': 'bad' })]),
          F('Summary. call and apply = "run now with this this". bind = "make a new function with this locked". Locked means locked: only <code>new</code> can override a bound this (topic 4).', [{ type: 'table', label: 'Cheat sheet', columns: ['', 'runs now?', 'args', 'can be re-bound?'], rows: [['call', 'yes', 'a, b, c', '-'], ['apply', 'yes', '[a, b, c]', '-'], ['bind', 'no, returns fn', 'partial + later', 'no (only new beats it)']], hl: { 2: 'sel' } }])
        ];
      }
    }, {
      title: 'Inside a call() polyfill: the temporary-method trick',
      input: 'Asha',
      inputLabel: 'Name stored on the context object',
      gen: function (input) {
        var nm = String(input === undefined ? 'Asha' : input).trim().slice(0, 12) || 'Asha';
        var code = [
          'Function.prototype.myCall = function (ctx, ...args) {',
          '  ctx = ctx == null ? globalThis : Object(ctx);',
          '  const key = Symbol("fn");      // unique, cannot clash',
          '  ctx[key] = this;               // this = the function',
          '  const result = ctx[key](...args); // implicit binding!',
          '  delete ctx[key];               // leave no trace',
          '  return result;',
          '};',
          'greet.myCall(user, "Hi");'
        ].join('\n');
        var obj = [['name', '"' + nm + '"']];
        return [
          F('How can plain JavaScript make <code>this</code> = user without using call? Trick: <b>temporarily make the function a method of user</b>, then call it with a dot. Implicit binding does the rest.', [C('myCall.js', code, { 9: 'cur' }), { type: 'map', label: 'user object', entries: obj.slice() }]),
          F('Inside myCall, <code>this</code> is <b>greet</b> (because we called <code>greet.myCall(...)</code>: implicit binding on a function object!). <code>ctx</code> is user. null/undefined would become globalThis; a primitive would be wrapped by <code>Object()</code>.', [C('myCall.js', code, { 1: 'cur', 2: 'cur' }), V('myCall frame', { 'this': 'greet (the function)', ctx: 'user', args: '["Hi"]' }, { 'this': 'win' })]),
          F('Make a <b>Symbol</b> key. A plain name like <code>"fn"</code> could overwrite a real property of user; a Symbol is guaranteed unique and is skipped by <code>for...in</code> and <code>JSON.stringify</code>.', [C('myCall.js', code, { 3: 'cur' }), V('myCall frame', { key: 'Symbol(fn)' }, { key: 'ok' })]),
          F('Attach greet to user under that secret key.', [C('myCall.js', code, { 4: 'cur' }), { type: 'map', label: 'user object', entries: obj.concat([['Symbol(fn)', 'greet']]), hl: { 'Symbol(fn)': 'ok' } }]),
          F('Call it <b>as a method</b>: <code>ctx[key](...args)</code>. The base of the reference is ctx, so inside greet <code>this = user</code>. Output: <code>"Hi, ' + H.esc(nm) + '"</code>.', [C('myCall.js', code, { 5: 'cur' }), S('Call stack', ['myCall', 'greet  this=user'], { 1: 'ok' }), { type: 'map', label: 'user object', entries: obj.concat([['Symbol(fn)', 'greet']]), hl: { 'Symbol(fn)': 'cur' } }]),
          F('Clean up: delete the temporary key so user looks exactly as before, then return the result.', [C('myCall.js', code, { 6: 'ok', 7: 'ok' }), { type: 'map', label: 'user object (restored)', entries: obj.slice(), hl: { name: 'ok' } }]),
          F('Known gaps of this polyfill (good interview talking points): it cannot attach a property to a <b>frozen</b> object; a strict target should receive primitives unboxed and null as null, but this version boxes them. Real engines do neither trick: they set the this slot directly.', [T('Edge cases: <code>Object.freeze(ctx)</code> → assignment fails · strict <code>this</code> should stay <code>5</code>, not <code>Number {5}</code> · use <code>Reflect.apply</code> in production', 'Limits')])
        ];
      }
    }],
    examples: [
      { title: 'Borrowing methods from built-ins', html: `<p>Built-in methods are written generically: they only need <code>this</code> to look a certain way (have a <code>length</code> and indexes, for example). So you can lend them to other objects.</p>${H.table(['Borrow', 'Used for'], [['<code>Array.prototype.map.call("abc", fn)</code>', 'map over a string\'s characters'], ['<code>Object.prototype.toString.call(x)</code>', 'reliable type tag'], ['<code>Object.prototype.hasOwnProperty.call(o, k)</code>', 'safe own-key check (modern: <code>Object.hasOwn</code>)']])}`,
        code: { lang: 'js', run: true, code: `
          // 1. arguments is array-LIKE (has length + indexes) but has no array methods
          function sumAll() {
            const args = Array.prototype.slice.call(arguments);  // borrow slice
            return args.reduce((a, b) => a + b, 0);
          }
          console.log(sumAll(1, 2, 3));                                   // 6

          // 2. map over a string by lending Array's map to it
          console.log(Array.prototype.map.call('abc', (c) => c.toUpperCase()).join('-')); // A-B-C

          // 3. the most reliable type check in JS
          const tag = (x) => Object.prototype.toString.call(x).slice(8, -1);
          console.log(tag([]), tag(null), tag(new Date(0)), tag(/x/)); // Array Null Date RegExp

          // 4. objects without a prototype have no hasOwnProperty of their own
          const dict = Object.create(null); dict.k = 1;
          console.log(Object.prototype.hasOwnProperty.call(dict, 'k'), Object.hasOwn(dict, 'k')); // true true
        ` } },
      { title: 'Partial application with bind', html: `<p><code>bind</code> can pre-fill arguments from the left. The new function's <code>length</code> shrinks by the number of pre-filled arguments, and its <code>name</code> gets a <code>"bound "</code> prefix (handy in stack traces).</p>${H.kv([['multiply.length', '2'], ['double.length', '1'], ['double.name', '"bound multiply"']])}`,
        code: { lang: 'js', run: true, code: `
          function multiply(a, b) { return a * b; }
          const double = multiply.bind(null, 2);   // null: multiply does not use this
          const triple = multiply.bind(null, 3);
          console.log(double(21), triple(5));       // 42 15
          console.log(multiply.length, double.length, JSON.stringify(double.name)); // 2 1 "bound multiply"

          // Real-world: a logger with a fixed prefix
          const log = console.log.bind(console, '[payments]');
          log('charge ok', 42);                     // [payments] charge ok 42
        ` } },
      { title: 'apply vs spread for "many arguments" functions', html: `<p>Before ES2015, <code>Math.max.apply(null, nums)</code> was the only way to pass an array as separate arguments. Spread does the same and reads better. Both share a gotcha: with an <b>empty</b> array, <code>Math.max()</code> returns ${H.c('r', '-Infinity')}. And for <b>huge</b> arrays (hundreds of thousands of items) both can blow the engine's argument limit, so use a loop or <code>reduce</code> there.</p>`,
        code: { lang: 'js', run: true, code: `
          const nums = [4, 9, 2];
          console.log(Math.max.apply(null, nums));   // 9 (old school)
          console.log(Math.max(...nums));            // 9 (new school)
          console.log(Math.max(...[]));              // -Infinity  (careful!)
          const safeMax = (a) => a.length ? a.reduce((m, x) => (x > m ? x : m)) : undefined;
          console.log(safeMax([]), safeMax(nums));    // undefined 9
        ` } },
      { title: 'Output puzzle: bind twice, then call', html: `<p>Predict all four lines. Remember: the <b>first</b> bind wins forever; later binds can still add arguments.</p>${H.table(['Expression', 'Output'], [['f()', 'A'], ['g = f.bind(B); g()', 'A'], ['h = f.bind(B, 1); h(2)', 'A 1 2'], ['f.call(B)', 'A']])}`,
        code: { lang: 'js', run: true, code: `
          function show(x, y) { return [this.id, x, y].filter((v) => v !== undefined).join(' '); }
          const A = { id: 'A' }, B = { id: 'B' };
          const f = show.bind(A);
          console.log(f());                 // A
          const g = f.bind(B);  console.log(g());       // A  (re-bind ignored)
          const h = f.bind(B, 1); console.log(h(2));    // A 1 2 (args still added)
          console.log(f.call(B));           // A
        ` } },
      { title: 'Bind once, not in a loop or render', html: `<p><code>bind</code> creates a <b>new function object every time</b>. Calling it inside a loop or a UI render means new identities each time, which breaks <code>removeEventListener</code> (it needs the same function reference) and defeats memoisation. Bind once and reuse.</p>`,
        code: { lang: 'js', run: true, code: `
          const handler = { id: 7, onEvent() { return this.id; } };
          const a = handler.onEvent.bind(handler);
          const b = handler.onEvent.bind(handler);
          console.log(a === b);          // false - two different functions!
          console.log(a(), b());         // 7 7 - same behaviour, different identity
          // So: store the bound function once, e.g. this.onEvent = this.onEvent.bind(this)
        ` } }
    ],
    deepDive: `<p><b>🟣 Bound function exotic objects.</b> <code>bind</code> returns a special object with three internal slots: <code>[[BoundTargetFunction]]</code>, <code>[[BoundThis]]</code>, <code>[[BoundArguments]]</code>. Its <code>[[Call]]</code> ignores the incoming this and calls the target with BoundThis and BoundArguments ++ new args. Its <code>[[Construct]]</code> (only present if the target is constructible) <b>ignores BoundThis entirely</b> and constructs the target, which is why <code>new</code> beats <code>bind</code>. Bound functions have <b>no</b> own <code>prototype</code> property; <code>x instanceof bound</code> forwards to the target's prototype.</p>
      <p><b>Properties:</b> <code>bound.name === "bound " + target.name</code>; <code>bound.length === max(0, target.length - boundArgs.length)</code>. Binding a bound function nests wrappers: the inner BoundThis still wins.</p>
      <p><b>call and apply are themselves functions</b>, which enables the "uncurry this" idiom used inside Node.js core (its "primordials"): <code>const slice = Function.prototype.call.bind(Array.prototype.slice); slice(arrayLike, 1)</code>. This protects library code from user code that monkey-patches <code>Array.prototype.slice</code> or <code>Function.prototype.call</code>. <code>Reflect.apply(fn, thisArg, args)</code> is the clean modern equivalent and throws if args is not array-like.</p>
      <p><b>Puzzle level:</b> <code>fn.call.call(other, ctx)</code> calls <code>other</code> with <code>this = ctx</code>, because the outer <code>.call</code> runs <code>Function.prototype.call</code> with this = other. Do not write this in production, but interviewers love it.</p>
      <p><b>Performance:</b> V8 inlines <code>fn.call(...)</code> and <code>fn.apply(x, arguments)</code> patterns well. <code>apply</code> with a huge array copies every element onto the stack, hence the RangeError on very large inputs. Bound functions used to be slow in older V8; since around 2017 they are optimised like normal calls. The real cost is allocation: each <code>bind</code> is a new object.</p>`,
    aiEra: `<p><b>🤖 What AI changes:</b> polyfill questions (<code>myCall</code>, <code>myBind</code>) are now trivially generated by assistants, so interviewers push on <b>edge cases</b>: <code>new</code> on a bound function, primitives as thisArg, frozen objects, symbol keys, <code>length</code>/<code>name</code>. Know why each line exists, not just the code.</p>
      <p><b>Use AI as a partner:</b> generate a test table: <code>Write 12 console.assert tests comparing my myBind against native bind, including new, instanceof, partial args, and re-binding</code>. Running AI-written tests against your hand-written polyfill is a great drill.</p>
      <p><b>Where AI goes wrong:</b> it often writes <code>context.fn = this</code> (clobbers a real <code>fn</code> property), forgets to <code>delete</code> it, or claims you can "re-bind" a bound function. It also sometimes suggests <code>.bind(this)</code> inside JSX render or loops, creating a new function every render. <b>What you must still own:</b> choosing between call/apply/bind/arrow for each situation and explaining the bound-function precedence rules out loud.</p>`,
    problems: [{
      title: 'Implement Function.prototype.myCall',
      level: 'Medium', tags: ['this', 'call', 'polyfill', 'Symbol'], companies: ['Google', 'Microsoft', 'Swiggy', 'PayPal'],
      statement: `<p>Implement <code>Function.prototype.myCall(thisArg, ...args)</code> without using the built-in <code>call</code>, <code>apply</code>, <code>bind</code> or <code>Reflect.apply</code>. It must call the function immediately with <code>this</code> set to <code>thisArg</code> and return its result. Follow sloppy-mode rules: <code>null</code>/<code>undefined</code> become <code>globalThis</code>, primitives are wrapped into objects. The context object must look unchanged afterwards (no leftover properties, no clobbered properties).</p>`,
      constraints: `thisArg may be any value; the context may already have a property named <code>fn</code>; up to 10<sup>4</sup> arguments.`,
      example: `<p><code>function intro(g) { return g + ' ' + this.name; }</code></p><p><code>intro.myCall({ name: 'Ana', fn: 1 }, 'Hi')</code> → ${H.c('g', '"Hi Ana"')} and the object still has <code>fn: 1</code> afterwards. A naive <code>ctx.fn = this</code> version would ${H.c('r', 'overwrite and then delete')} the user's own <code>fn</code> property.</p>`,
      brute: { why: `<p>The textbook version stores the function under a fixed name like <code>fn</code>. It works in the happy path, but (1) it destroys any existing <code>fn</code> property on the context, (2) it crashes on <code>null</code> (cannot set a property of null) and on primitives (setting a property on <code>5</code> does nothing in sloppy code, throws in strict code), and (3) the temporary key would show up in <code>for...in</code> or <code>JSON.stringify</code> if the function reads them.</p>`,
        code: `
          Function.prototype.naiveCall = function (ctx, ...args) {
            ctx.fn = this;                  // clobbers ctx.fn, crashes on null
            const result = ctx.fn(...args); // implicit binding gives this = ctx
            delete ctx.fn;                  // also deletes the user's own fn!
            return result;
          };
        ` },
      mcq: { q: 'Why use a <code>Symbol()</code> as the temporary property key?', options: ['Symbols make the call faster', 'A Symbol is unique, so it can never clash with or overwrite an existing property, and it is hidden from for...in / JSON', 'Symbols are required by the spec for call', 'It makes this undefined'], answer: 1, explain: 'Every <code>Symbol()</code> is unique, so no user property can collide with it, and symbol keys are skipped by for...in and JSON.stringify.' },
      hints: [
        `<p>Hint 1: Without call/apply, the only way to choose <code>this</code> is implicit binding: make the function a temporary method of the context and call it with a dot or brackets.</p>`,
        `<p>Hint 2: Inside <code>myCall</code>, <code>this</code> is the function itself (you called <code>fn.myCall(...)</code>). Use a <code>Symbol</code> key so you never clash with real properties.</p>`,
        `<p>Hint 3: Normalise the context: <code>ctx == null ? globalThis : Object(ctx)</code>. Recipe: normalise → key = Symbol() → ctx[key] = this → result = ctx[key](...args) → delete in a <code>finally</code> (so it is cleaned even if the function throws) → return result.</p>`
      ],
      solution: {
        approach: `<p>Turn explicit binding into implicit binding. Attach the function to the (normalised) context under a fresh <code>Symbol</code>, call it through the context, and always remove the key in <code>finally</code>. A guard throws a <code>TypeError</code> if myCall is borrowed onto something that is not a function.</p>`,
        code: { lang: 'js', run: true, code: `
          Function.prototype.myCall = function (ctx, ...args) {
            if (typeof this !== 'function') throw new TypeError('myCall must be called on a function');
            // sloppy-mode semantics: null/undefined -> global object, primitives -> wrapper objects
            ctx = ctx == null ? globalThis : Object(ctx);
            const key = Symbol('myCall');        // unique key: cannot clash with real props
            ctx[key] = this;                     // "this" here is the function being called
            try {
              return ctx[key](...args);          // implicit binding: this = ctx
            } finally {
              delete ctx[key];                   // always clean up, even if fn throws
            }
          };

          function intro(greeting) { return greeting + ' ' + this.name; }
          const ana = { name: 'Ana', fn: 1 };
          console.log(intro.myCall(ana, 'Hi'));                       // Hi Ana
          console.log(JSON.stringify(ana));                          // {"name":"Ana","fn":1}
          function typeOfThis() { return typeof this; }
          console.log(typeOfThis.myCall(5));                          // object (boxed, sloppy rules)
          console.log(typeOfThis.myCall(null) === typeof globalThis); // true
          function boom() { throw new Error('inside'); }
          try { boom.myCall(ana); } catch (e) { console.log(e.message, Object.getOwnPropertySymbols(ana).length); } // inside 0
        ` },
        dry: { head: ['step', 'ctx', 'action', 'ctx keys after'], rows: [
          ['1', '{name, fn}', 'ctx is an object, keep it', 'name, fn'],
          ['2', 'same', 'key = Symbol(myCall)', 'name, fn'],
          ['3', 'same', 'ctx[key] = intro', 'name, fn, Symbol(myCall)'],
          ['4', 'same', '<span class="c-g">ctx[key]("Hi") → this = ctx → "Hi Ana"</span>', 'name, fn, Symbol(myCall)'],
          ['5', 'same', 'finally: delete ctx[key]', 'name, fn (unchanged)']
        ] },
        complexity: `<p>O(1) extra work plus the cost of the call itself; spreading <code>args</code> is O(n) in the number of arguments.</p>`,
        followUps: ['Make it respect strict-mode targets (no boxing of primitives, keep null).', 'What breaks if ctx is frozen? How would you detect and fall back?', 'Now write myApply in two lines on top of myCall.']
      }
    }]
  });

  /* =====================================================================
     TOPIC 4: new binding + precedence of the rules
     ===================================================================== */
  topics.push({
    title: 'new Binding and the Precedence of the Four Rules',
    analogy: `<p>Think of a packing station. When an order arrives with the word <b>new</b> on it, the station: (1) takes a <b>fresh empty box</b>, (2) sticks the <b>company label</b> on it (so the box knows which catalogue of shared tools it can use: the prototype), (3) hands the box to the worker (the constructor function) who <b>fills it</b>, where "this box" means the fresh one, and (4) ships the box. Only if the worker deliberately hands back a <i>different</i> box does that one get shipped instead.</p>
      <p>And when several instructions clash ("use Asha's box", "use the box on the left", "NEW box"), the station has a fixed pecking order: <b>NEW beats everything</b>, then a written instruction (call/apply/bind), then "the box on the left" (the dot), then the fallback.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> Putting <code>new</code> in front of a call turns the function into a <b>constructor</b> for that one call. JavaScript does four steps for you:</p>
      ${H.table(['Step', 'What new does', 'Hand-written equivalent'], [
        ['1', 'Create a fresh empty object', '<code>const obj = {}</code>'],
        ['2', 'Link it to the constructor\'s <code>prototype</code>', '<code>Object.setPrototypeOf(obj, Fn.prototype)</code>'],
        ['3', 'Run the function with <code>this = obj</code>', '<code>const r = Fn.apply(obj, args)</code>'],
        ['4', 'Return obj, <b>unless</b> the function returned its own object', '<code>return (r is an object) ? r : obj</code>']
      ])}
      <p>Step 4 has a twist interviewers love: returning a <b>primitive</b> (<code>return 5</code>, <code>return "hi"</code>) is <b>ignored</b> and you still get the new object; returning an <b>object or function</b> replaces it.</p>
      <p>Not everything can be used with <code>new</code>: <b>arrow functions</b>, <b>object method shorthand</b> (<code>{ m() {} }</code>), <b>async</b> functions and <b>generators</b> throw <code>TypeError: ... is not a constructor</code>. In the other direction, <b>classes</b> must be called with <code>new</code>; calling <code>Person()</code> on a class throws.</p>
      <p><b>🔵 Precedence: when rules fight.</b> Ask the questions in this order; the first YES wins:</p>
      ${H.chips([H.c('p', '0. arrow? → outer this'), H.c('p', '1. new? → new object'), H.c('b', '2. call/apply/bind? → given object'), H.c('g', '3. obj.fn()? → obj'), H.c('y', '4. default → undefined / globalThis')], { label: 'strongest → weakest' })}
      ${H.table(['Fight', 'Winner', 'Result'], [
        ['<code>obj.fn.call(other)</code>: implicit vs explicit', 'explicit', 'other'],
        ['<code>obj.boundFn()</code> where <code>boundFn = fn.bind(x)</code>', 'bind', 'x'],
        ['<code>new boundFn()</code>: bind vs new', H.c('p', 'new'), 'a fresh object (x ignored, partial args kept)'],
        ['<code>new obj.Fn()</code>: implicit vs new', H.c('p', 'new'), 'a fresh object, not obj'],
        ['<code>arrow.call(x)</code> or <code>new arrow()</code>', 'arrow', 'outer this / TypeError']
      ])}`,
    clues: [
      '"What does <code>new</code> do?" / "implement <code>new</code>" / "write myNew" → the 4 steps, especially the return-object rule',
      'A constructor with <code>return {...}</code> or <code>return 5</code> in an output question → objects replace, primitives are ignored',
      '<code>new</code> applied to a bound function → new wins over bind, partial arguments still apply',
      '"Make a constructor safe if called without new" → <code>new.target</code> guard (or use a class)',
      '<code>TypeError: x is not a constructor</code> → arrow, method shorthand, async or generator function used with new',
      '"Order of precedence of this rules" → new &gt; explicit (bind/call/apply) &gt; implicit &gt; default; arrows ignore all of them'
    ],
    code: [{ lang: 'js', run: true, title: 'Rules in a fight (runnable)', code: `
      'use strict';
      function who() { return this === undefined ? 'undefined' : (this.id || 'fresh object'); }
      function Make(x) { this.made = x; }

      const a = { id: 'a', who };
      const b = { id: 'b' };

      console.log('implicit         :', a.who());               // a
      console.log('explicit > impl. :', a.who.call(b));         // b
      const whoB = who.bind(b);
      a.whoB = whoB;
      console.log('bind > implicit  :', a.whoB());              // b
      console.log('bind > call      :', whoB.call(a));          // b

      const MakeBound = Make.bind(b, 42);   // bind this=b and first arg=42
      const m = new MakeBound();            // new beats bind
      console.log('new > bind       :', JSON.stringify(m), 'b untouched:', b.made === undefined); // {"made":42} true
      console.log('instanceof       :', m instanceof Make, m instanceof MakeBound);            // true true
    ` }],
    codeTitle: ['Runnable: precedence proven'],
    viz: [{
      title: 'The four steps of new',
      input: 'Asha',
      inputLabel: 'Name passed to new Person(name)',
      gen: function (input) {
        var nm = String(input === undefined ? 'Asha' : input).trim().slice(0, 14) || 'Asha';
        var code = [
          'function Person(name) {',
          '  this.name = name;',
          '}',
          'Person.prototype.hi = function () { return "Hi " + this.name; };',
          'const p = new Person("' + nm + '");',
          'p.hi();'
        ].join('\n');
        function g(hl, ehl, objLabel, tags) {
          return { type: 'graph', label: 'Objects in memory', directed: true, height: 50,
            nodes: [{ id: 'P', label: 'Person (function)', x: 18, y: 8, shape: 'box' },
              { id: 'PP', label: 'Person.prototype { hi }', x: 70, y: 8, shape: 'box' },
              { id: 'O', label: objLabel, x: 70, y: 40, shape: 'box' },
              { id: 'p', label: 'variable p', x: 18, y: 40, shape: 'box' }],
            edges: [['P', 'PP', '.prototype']].concat(ehl.link ? [['O', 'PP', '[[Prototype]]']] : []).concat(ehl.p ? [['p', 'O']] : []),
            hl: hl, ehl: ehl.e || {}, tags: tags || {} };
        }
        return [
          F('Before the call: <code>Person</code> is an ordinary function. Every normal function automatically gets a <code>prototype</code> object; we added a shared method <code>hi</code> to it.', [C('new.js', code, { 1: 'win', 4: 'win' }), g({ P: 'win', PP: 'win' }, { e: {} }, '(nothing yet)')]),
          F('<b>Step 1.</b> <code>new Person(...)</code> starts. The engine creates a <b>fresh, empty object</b>.', [C('new.js', code, { 5: 'cur' }), g({ O: 'ok' }, { e: {} }, '{} (fresh)', { O: 'step 1' })]),
          F('<b>Step 2.</b> Link the new object to <code>Person.prototype</code>. This is how the object will later find <code>hi</code> even though hi is not stored on it.', [C('new.js', code, { 5: 'cur' }), g({ O: 'ok', PP: 'cur' }, { link: true, e: { 'O-PP': 'ok' } }, '{} (fresh)', { O: 'step 2' })]),
          F('<b>Step 3.</b> Call Person with <code>this = the new object</code>. Line 2 writes <code>name</code> onto it.', [C('new.js', code, { 2: 'cur' }), S('Call stack', ['(module)', 'Person  [new]'], { 1: 'cur' }), V('Person frame', { 'this': 'the fresh object', name: '"' + nm + '"' }, { 'this': 'sel' }), g({ O: 'cur' }, { link: true, e: { 'O-PP': 'done' } }, '{ name: "' + nm + '" }', { O: 'step 3' })]),
          F('<b>Step 4.</b> Person did not return an object (it returned undefined), so <code>new</code> returns the fresh object, stored in <code>p</code>. If Person had returned <code>{ other: true }</code>, p would be that object instead; a returned primitive would be ignored.', [C('new.js', code, { 5: 'ok' }), g({ O: 'sel', p: 'ok' }, { p: true, link: true, e: { 'p-O': 'ok', 'O-PP': 'done' } }, '{ name: "' + nm + '" }', { O: 'p' })]),
          F('<code>p.hi()</code>: "hi" is not on p, so the lookup follows the [[Prototype]] link and finds it on Person.prototype. It is called as <code>p.hi()</code>, so implicit binding makes <code>this = p</code>. Output: <code>"Hi ' + H.esc(nm) + '"</code>.', [C('new.js', code, { 6: 'cur' }), g({ O: 'sel', PP: 'cur' }, { p: true, link: true, e: { 'O-PP': 'cur', 'p-O': 'done' } }, '{ name: "' + nm + '" }', { O: 'this' }), V('hi frame', { 'this': 'p', 'found hi on': 'Person.prototype' }, { 'this': 'sel' })]),
          F('Recap of new in one line: <b>fresh object → link prototype → run with this = object → return it (unless an object was returned)</b>. That line is exactly what you implement in the myNew problem below.', [{ type: 'table', label: 'new in 4 steps', columns: ['#', 'step', 'code'], rows: [['1', 'create', 'obj = {}'], ['2', 'link', 'Object.setPrototypeOf(obj, Person.prototype)'], ['3', 'run', 'r = Person.apply(obj, args)'], ['4', 'return', 'r is object ? r : obj']] }])
        ];
      }
    }, {
      title: 'Precedence in the decision flow (try new bound())',
      input: 'new bound()',
      inputLabel: 'Call-site: new bound() | obj.bound() | bound.call(obj) | fn.call(o) | obj.fn() | new Fn() | obj.arrow()',
      gen: flowFrames
    }],
    examples: [
      { title: 'new done by hand vs the real thing', html: `<p>Writing the four steps yourself is the best way to remember them. Both objects end up with the same shape and the same prototype.</p>${H.kv([['real.name', '"Asha"'], ['manual.name', '"Asha"'], ['same prototype?', 'true']], { hl: { 'same prototype?': 'g' } })}`,
        code: { lang: 'js', run: true, code: `
          function Person(name) { this.name = name; }
          Person.prototype.hi = function () { return 'Hi ' + this.name; };

          const real = new Person('Asha');

          const manual = Object.create(Person.prototype);   // steps 1 + 2
          const r = Person.call(manual, 'Asha');             // step 3
          const result = (r !== null && typeof r === 'object') ? r : manual; // step 4

          console.log(real.hi(), '|', result.hi());          // Hi Asha | Hi Asha
          console.log(Object.getPrototypeOf(real) === Object.getPrototypeOf(result)); // true
        ` } },
      { title: 'Output puzzle: what a constructor returns', html: `<p>Predict <code>a</code>, <code>b</code>, <code>c</code>. Objects (including arrays and functions) replace the new object; primitives are silently ignored.</p>${H.table(['Constructor returns', 'new gives you'], [['nothing', 'the new object'], ['5 (primitive)', H.c('g', 'the new object')], ['{ hijacked: true }', H.c('r', 'that returned object')]])}`,
        code: { lang: 'js', run: true, code: `
          function A() { this.x = 1; }
          function B() { this.x = 1; return 5; }                    // primitive: ignored
          function C() { this.x = 1; return { hijacked: true }; }   // object: replaces
          const a = new A(), b = new B(), c = new C();
          console.log(JSON.stringify(a), JSON.stringify(b), JSON.stringify(c));
          // {"x":1} {"x":1} {"hijacked":true}
          console.log(c instanceof C);                               // false! c is a plain object
        ` } },
      { title: 'new.target: a constructor that refuses to be called bare', html: `<p><code>new.target</code> is <code>undefined</code> in a normal call and refers to the constructor when called with <code>new</code>. Older code used <code>if (!(this instanceof User))</code> for the same "auto-new" trick. Classes do it for you by throwing.</p>`,
        code: { lang: 'js', run: true, code: `
          function User(name) {
            if (!new.target) return new User(name);   // called without new? fix it
            this.name = name;
          }
          const u1 = new User('Ana');
          const u2 = User('Ben');                    // no new, still works
          console.log(u1.name, u2.name, u2 instanceof User);   // Ana Ben true

          class Strict { constructor() { this.ok = true; } }
          try { Strict(); } catch (e) { console.log(e.constructor.name + ': ' + e.message); }
        ` } },
      { title: 'What cannot be used with new', html: `<p>Only functions with an internal <code>[[Construct]]</code> method can be <code>new</code>-ed: classic <code>function</code> declarations/expressions, classes and bound versions of those. Arrows, method shorthand, async functions and generators cannot.</p>${H.chips([H.c('g', 'function F(){}'), H.c('g', 'class K{}'), H.c('r', '() => {}'), H.c('r', '{ m() {} }.m'), H.c('r', 'async function'), H.c('r', 'function*')], { label: 'constructible?' })}`,
        code: { lang: 'js', run: true, code: `
          const candidates = {
            arrow: () => {},
            shorthand: { m() {} }.m,
            asyncFn: async function () {},
            generator: function* () {},
            classic: function () {}
          };
          for (const [name, fn] of Object.entries(candidates)) {
            try { new fn(); console.log(name.padEnd(10), 'OK'); }
            catch (e) { console.log(name.padEnd(10), 'TypeError'); }
          }
        ` } }
    ],
    deepDive: `<p><b>🟣 [[Call]] vs [[Construct]].</b> Function objects may have two internal methods. <code>f()</code> uses <code>[[Call]]</code>; <code>new f()</code> uses <code>[[Construct]]</code>. Arrows, methods, async and generator functions are created without [[Construct]], hence "is not a constructor". Classes have [[Construct]] but their [[Call]] always throws.</p>
      <p><b>Base vs derived constructors.</b> For a base constructor, [[Construct]] runs <code>OrdinaryCreateFromConstructor(newTarget, "%Object.prototype%")</code>: it reads <code>newTarget.prototype</code>, and if that is not an object it falls back to <code>Object.prototype</code>. For a <b>derived</b> class (<code>extends</code>), no object is created up front: <code>this</code> is <b>uninitialised</b> until <code>super(...)</code> returns, so touching <code>this</code> before super throws a <code>ReferenceError</code>. The parent constructor allocates the object using <code>new.target.prototype</code>, which is how <code>class Dog extends Animal</code> ends up with Dog's prototype even though Animal created it. Class fields are installed right after super returns (or at the start of a base constructor).</p>
      <p><b>Return override details:</b> a derived constructor that returns a non-undefined primitive throws a TypeError, while a base constructor silently ignores it. Returning an object from a constructor is used for singletons and for Proxies (<code>return new Proxy(this, handler)</code>).</p>
      <p><b>Why new beats bind:</b> a bound function's [[Construct]] calls <code>Construct(target, boundArgs ++ args, newTarget)</code> and never passes [[BoundThis]]. And <code>Reflect.construct(Target, args, NewTarget)</code> lets you choose the prototype explicitly, which is the clean way to build a <code>new</code>-aware bind polyfill.</p>
      <p><b>Performance:</b> V8 tracks "initial maps" (hidden classes) per constructor. Assigning the same properties in the same order inside the constructor gives all instances one shape, keeping property access fast. Adding properties later or in different orders creates shape splits.</p>`,
    aiEra: `<p><b>🤖 What AI changes:</b> in modern code you will mostly write <code>class</code> and rarely see raw constructor functions, but interview rounds still ask "implement new" because it tests whether you understand prototypes and <code>this</code> together. Assistants can produce myNew instantly; the interview value is in edge cases.</p>
      <p><b>Use AI as a partner:</b> ask <code>Generate edge cases where my myNew differs from native new</code>. Good answers: constructor returns a function, prototype is a primitive, target is a class, target is an arrow. Then fix your polyfill or document the limitation.</p>
      <p><b>Where AI goes wrong:</b> it often writes <code>typeof result === "object" ? result : obj</code>, which wrongly returns <code>null</code> (typeof null is "object") and ignores returned functions. It may also claim bind wins over new. <b>What you must still own:</b> the four steps, the precise return rule, and the precedence order with a one-line reason for each fight.</p>`,
    problems: [{
      title: 'Implement myNew(Ctor, ...args)',
      level: 'Medium', tags: ['new', 'prototype', 'polyfill'], companies: ['Amazon', 'Adobe', 'Walmart'],
      statement: `<p>Write <code>myNew(Ctor, ...args)</code> that behaves like <code>new Ctor(...args)</code> for ordinary constructor functions: create an object linked to <code>Ctor.prototype</code>, run <code>Ctor</code> with <code>this</code> = that object, and return the right thing according to the return-override rule. Throw a <code>TypeError</code> if <code>Ctor</code> is not a function.</p>`,
      constraints: `Ctor is a classic function (not a class or arrow); its prototype may have been replaced by a non-object; Ctor may return a primitive, null, an object or a function.`,
      example: `<p><code>function Car(m) { this.model = m; }</code> → <code>myNew(Car, 'EV')</code> gives ${H.c('g', '{ model: "EV" }')} with <code>instanceof Car === true</code>.</p><p><code>function W() { return null; }</code> → <code>myNew(W)</code> must give ${H.c('g', 'the new object')}, not null, because <code>null</code> is a primitive even though <code>typeof null === "object"</code>.</p>`,
      brute: { why: `<p>A common first try forgets the prototype link (so methods on <code>Ctor.prototype</code> are missing and <code>instanceof</code> fails) and ignores the return-override rule. Another frequent bug is <code>typeof r === 'object'</code>, which treats <code>null</code> as an object and misses returned functions.</p>`,
        code: `
          // BROKEN: no prototype link, ignores the return rule
          function myNewNaive(Ctor, ...args) {
            const obj = {};                 // not linked to Ctor.prototype
            Ctor.apply(obj, args);          // result of Ctor thrown away
            return obj;
          }
        ` },
      mcq: { q: '<code>function F() { this.a = 1; return null; }</code>. What should <code>myNew(F)</code> return?', options: ['null', '{ a: 1 }', 'undefined', 'It throws'], answer: 1, explain: '<code>null</code> is a primitive value, so the return override does not apply; you get the freshly built object.' },
      hints: [
        `<p>Hint 1: Steps 1 and 2 are one call: <code>Object.create(proto)</code> makes an empty object already linked to <code>proto</code>.</p>`,
        `<p>Hint 2: Step 3 is explicit binding: <code>const r = Ctor.apply(obj, args)</code>. Step 4: return r only if it is a non-null object or a function.</p>`,
        `<p>Hint 3: If <code>Ctor.prototype</code> is not an object (someone set it to 5), native new falls back to <code>Object.prototype</code>. Recipe: check function → proto = isObject(Ctor.prototype) ? Ctor.prototype : Object.prototype → obj = Object.create(proto) → r = Ctor.apply(obj, args) → isObject(r) ? r : obj.</p>`
      ],
      solution: {
        approach: `<p>Translate the four spec steps directly. Use one helper <code>isObj(v)</code> = <code>v !== null &amp;&amp; (typeof v === 'object' || typeof v === 'function')</code> for both the prototype fallback and the return rule. For classes you would need <code>Reflect.construct</code>, because class constructors refuse <code>apply</code>.</p>`,
        code: { lang: 'js', run: true, code: `
          function myNew(Ctor, ...args) {
            if (typeof Ctor !== 'function') throw new TypeError(String(Ctor) + ' is not a constructor');
            const isObj = (v) => v !== null && (typeof v === 'object' || typeof v === 'function');
            const proto = isObj(Ctor.prototype) ? Ctor.prototype : Object.prototype;
            const obj = Object.create(proto);          // steps 1 + 2
            const result = Ctor.apply(obj, args);      // step 3: this = obj
            return isObj(result) ? result : obj;       // step 4: return override rule
          }

          function Car(model) { this.model = model; }
          Car.prototype.drive = function () { return this.model + ' drives'; };
          const c = myNew(Car, 'EV');
          console.log(c.drive(), c instanceof Car);            // EV drives true

          function NullReturner() { this.a = 1; return null; }
          console.log(JSON.stringify(myNew(NullReturner)));    // {"a":1}

          function FnReturner() { return function inner() {}; }
          console.log(typeof myNew(FnReturner));               // function

          function Odd() {} Odd.prototype = 5;                 // broken prototype
          console.log(Object.getPrototypeOf(myNew(Odd)) === Object.prototype); // true
        ` },
        dry: { head: ['step', 'call', 'value', 'note'], rows: [
          ['check', 'typeof Car', '"function"', 'ok'],
          ['1+2', 'Object.create(Car.prototype)', '{} → Car.prototype', 'linked'],
          ['3', 'Car.apply(obj, ["EV"])', 'obj = { model: "EV" }, result = undefined', 'this = obj'],
          ['4', 'isObj(undefined)?', 'false', '<span class="c-g">return obj</span>']
        ] },
        complexity: `<p>O(1) besides the constructor's own work.</p>`,
        followUps: ['Support ES classes with <code>Reflect.construct(Ctor, args)</code>.', 'Why must the check be <code>typeof result === "function"</code> too?', 'How would you also set <code>new.target</code> correctly?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 5: arrow functions and lexical this
     ===================================================================== */
  var ARROW_CASES = {
    'arrow-in-method': {
      code: ['const timer = {', '  secs: 0,', '  start() {', '    setTimeout(() => {', '      this.secs++;      // which this?', '    }, 0);', '  }', '};', 'timer.start();'],
      call: 9, inner: 5, kind: 'arrow',
      verdict: 'The arrow has no own this, so the lookup goes out to start(), whose this is timer. <span class="c-g">timer.secs becomes 1.</span>'
    },
    'function-in-method': {
      code: ['const timer = {', '  secs: 0,', '  start() {', '    setTimeout(function () {', '      this.secs++;      // which this?', '    }, 0);', '  }', '};', 'timer.start();'],
      call: 9, inner: 5, kind: 'function',
      verdict: 'The inner normal function gets its OWN this, chosen by whoever calls it: the timer system, not timer. <span class="c-r">this.secs is not timer.secs (NaN on window in a browser, a Timeout object in Node).</span>'
    },
    'arrow-as-method': {
      code: ['"use strict"; // (module code)', 'const timer = {', '  secs: 0,', '  start: () => {', '    this.secs++;        // which this?', '  }', '};', 'timer.start();', ''],
      call: 8, inner: 5, kind: 'arrow-top',
      verdict: 'The arrow is written directly in the object literal. An object literal is NOT a scope, so the next scope out is the module, where this is undefined. <span class="c-r">TypeError: Cannot read properties of undefined.</span>'
    }
  };
  topics.push({
    title: 'Arrow Functions and Lexical this',
    analogy: `<p>Imagine a sticky note on an office wall that says <b>"return this stapler to THIS office"</b>. Whoever later picks up the note and wherever they carry it, "this office" still means the office where the note was <b>written</b>. Nobody can re-label it.</p>
      <p>An arrow function is that sticky note. It has no <code>this</code> of its own; the word <code>this</code> inside it simply means <b>"the this of the place I was written in"</b>. A normal function is the opposite: a fresh form that asks <i>"who is holding me right now?"</i> every time it is used. That is why arrows are perfect for small callbacks inside methods, and the wrong tool for the methods themselves.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> An arrow function <code>(x) =&gt; x * 2</code> is a shorter way to write a function, <b>but</b> it also behaves differently: it does <b>not</b> get its own <code>this</code>. When you write <code>this</code> inside an arrow, JavaScript looks <b>outward</b> to the surrounding code, exactly like it looks up any outer variable. This is called <b>lexical this</b> ("lexical" = decided by where the code is written).</p>
      <p>Arrows are missing four things that normal functions have:</p>
      ${H.table(['Arrows have no own...', 'So inside an arrow it means...'], [
        ['<code>this</code>', 'the outer function\'s (or module\'s) this'],
        ['<code>arguments</code>', 'the outer function\'s arguments (use <code>...rest</code> instead)'],
        ['<code>super</code>, <code>new.target</code>', 'the outer method\'s ones'],
        ['<code>prototype</code> / [[Construct]]', 'cannot be used with <code>new</code>']
      ])}
      <p>Consequences you must know cold:</p>
      <ul>
        <li><b>None of the four binding rules can change an arrow's this.</b> <code>arrow.call(x)</code>, <code>arrow.bind(x)</code>, <code>obj.arrow()</code> all ignore the requested this (arguments still work). <code>new arrow()</code> throws.</li>
        <li><b>Great for callbacks inside methods:</b> <code>setTimeout(() =&gt; this.tick(), 100)</code>, <code>this.items.map(i =&gt; i * this.rate)</code>, <code>fetch(url).then(r =&gt; this.save(r))</code>. Before ES2015 people wrote <code>var self = this;</code> or used <code>.bind(this)</code> for the same job.</li>
        <li><b>Bad as object or prototype methods:</b> <code>{ total: () =&gt; this.items }</code> does NOT see the object, because an object literal <code>{ }</code> is not a scope; this comes from the code <i>around</i> the object.</li>
        <li><b>Class field arrows</b> <code>handle = () =&gt; { this... }</code> are a popular way to get "auto-bound" methods: fields run with this = the instance, so the arrow captures the instance. Trade-off: one new function per instance and nothing on the prototype.</li>
      </ul>
      ${H.table(['Situation', 'Use'], [
        ['Callback inside a method that needs the method\'s this', H.c('g', 'arrow')],
        ['Method on an object literal or class prototype', H.c('g', 'method shorthand / normal function')],
        ['DOM handler that needs the element as this', H.c('g', 'normal function (or use event.currentTarget)')],
        ['Constructor / something used with new', H.c('g', 'class or normal function')],
        ['Pure helper that never touches this', 'either (arrow is shorter)']
      ])}`,
    clues: [
      '<code>setTimeout</code>/<code>setInterval</code>/<code>.then</code>/<code>.map</code> callback inside a method that uses <code>this</code> → arrow function (lexical this)',
      'Object literal with <code>method: () =&gt; this.x</code> in an output question → this is NOT the object; it is the outer scope\'s this',
      '"Can you change an arrow\'s this with call/bind?" → no; thisArg is ignored, arguments still pass',
      '<code>arguments</code> used inside an arrow → it belongs to the enclosing normal function (or is a ReferenceError at module top level)',
      'React-style <code>handleClick = () =&gt; {}</code> class fields → auto-binding via arrow, per-instance cost',
      '"Old code uses <code>var self = this</code> / <code>that = this</code>" → the pre-ES2015 version of an arrow callback'
    ],
    code: [{ lang: 'js', run: true, title: 'Arrow vs function inside a method (runnable)', code: `
      'use strict';
      const team = {
        name: 'Core',
        members: ['ana', 'ben'],
        withArrow() {
          // arrow: "this" is looked up outward -> withArrow's this -> team
          return this.members.map((m) => m + '@' + this.name);
        },
        withFunction() {
          // normal function: gets its OWN this; map calls it with this = undefined
          return this.members.map(function (m) {
            return m + '@' + (this === undefined ? 'undefined' : this.name);
          });
        },
        withThisArg() {
          // old-school fix 1: map's second argument sets this for the callback
          return this.members.map(function (m) { return m + '@' + this.name; }, this);
        },
        withSelf() {
          const self = this;       // old-school fix 2: copy this into a normal variable
          return this.members.map(function (m) { return m + '@' + self.name; });
        }
      };
      console.log(team.withArrow().join(', '));     // ana@Core, ben@Core
      console.log(team.withFunction().join(', '));  // ana@undefined, ben@undefined
      console.log(team.withThisArg().join(', '));   // ana@Core, ben@Core
      console.log(team.withSelf().join(', '));      // ana@Core, ben@Core
    ` }],
    codeTitle: ['Runnable: four ways to reach the outer this'],
    viz: [{
      title: 'Lexical this: walking out through the scopes',
      input: 'arrow-in-method',
      inputLabel: 'Case: arrow-in-method | function-in-method | arrow-as-method',
      gen: function (input) {
        var key = String(input === undefined ? 'arrow-in-method' : input).trim();
        var cs = ARROW_CASES[key];
        if (!cs) throw new Error('Pick one of: ' + Object.keys(ARROW_CASES).join(' | '));
        var code = cs.code.join('\n');
        function scopes(hl, ehl, tags) {
          var innerLabel = cs.kind === 'function' ? 'inner function: OWN this' : 'arrow: NO own this';
          var midLabel = cs.kind === 'arrow-top' ? '{ } object literal (not a scope)' : 'start(): this = timer';
          return { type: 'graph', label: 'Where does the inner code find this?', directed: true, height: 54,
            nodes: [{ id: 'I', label: innerLabel, x: 24, y: 8, shape: 'box' },
              { id: 'M', label: midLabel, x: 24, y: 27, shape: 'box' },
              { id: 'G', label: 'module: this = undefined', x: 24, y: 46, shape: 'box' },
              { id: 'R', label: cs.kind === 'function' ? 'set by the CALLER (timer system)' : 'answer', x: 76, y: 8, shape: 'box' }],
            edges: [['I', 'M', 'look out'], ['M', 'G', 'look out'], ['I', 'R', cs.kind === 'function' ? 'own' : '']],
            hl: hl, ehl: ehl, tags: tags || {} };
        }
        var fr = [];
        fr.push(F('Case <b>' + key + '</b>. The question is always the same: on the line <code>this.secs++</code>, what is <code>this</code>?', [C('case.js', code, { 5: 'cur' }), scopes({}, {})]));
        fr.push(F('The call-site <code>' + cs.code[cs.call - 1].trim() + '</code> runs. ' + (cs.kind === 'arrow-top' ? 'timer.start is an arrow, so the dot in <code>timer.start()</code> is ignored completely.' : 'start() is called with a dot, so start\'s this = <b>timer</b> (implicit binding).'),
          [C('case.js', code, { 9: 'cur', 8: cs.kind === 'arrow-top' ? 'cur' : '' }), S('Call stack', ['(module)', cs.kind === 'arrow-top' ? 'start (arrow)' : 'start  this=timer'], { 1: 'cur' }), V('start', { 'this': cs.kind === 'arrow-top' ? '(no own this)' : 'timer' }, { 'this': cs.kind === 'arrow-top' ? 'bad' : 'ok' })]));
        if (cs.kind !== 'arrow-top') {
          fr.push(F('start() schedules the inner callback and returns. Later, when the timer fires, the event loop calls the callback <b>bare</b>; there is no <code>timer.</code> in front of it.', [C('case.js', code, { 4: 'cur' }), { type: 'queue', label: 'Task queue', items: ['callback (no object attached)'], hl: { 0: 'cur' } }, S('Call stack', ['(event loop)', 'callback'], { 1: 'cur' })]));
        }
        if (cs.kind === 'function') {
          fr.push(F('The inner callback is a <b>normal</b> function, so it gets its OWN this, decided by its caller. The timer system chooses it: window in browsers, a Timeout object in Node. The scope chain is never consulted for this.', [C('case.js', code, { 5: 'bad' }), scopes({ I: 'cur', R: 'bad' }, { 'I-R': 'bad' }, { R: 'not timer!' })]));
        } else {
          fr.push(F('The code is inside an <b>arrow</b>. It has no this slot, so JavaScript walks outward exactly like for a normal variable.', [C('case.js', code, { 5: 'cur' }), scopes({ I: 'cur' }, {})]));
          if (cs.kind === 'arrow') {
            fr.push(F('Next scope out is <b>start()</b>, a normal function called as <code>timer.start()</code>. It has a this: <b>timer</b>. Stop here.', [scopes({ I: 'done', M: 'sel' }, { 'I-M': 'ok' }, { M: 'found' }), V('Resolved', { 'this': 'timer' }, { 'this': 'sel' })]));
          } else {
            fr.push(F('The next thing out is the object literal <code>{ ... }</code>. Braces of an object are <b>not</b> a scope, they hold no this. Keep walking.', [scopes({ I: 'done', M: 'bad' }, { 'I-M': 'done' }, { M: 'skipped' })]));
            fr.push(F('Reached the module scope. In an ES module (and in any strict top-level code inside a function) this is <b>undefined</b>.', [scopes({ I: 'done', M: 'done', G: 'sel' }, { 'I-M': 'done', 'M-G': 'ok' }, { G: 'found' }), V('Resolved', { 'this': 'undefined' }, { 'this': 'bad' })]));
          }
        }
        fr.push(F('Verdict: ' + cs.verdict, [C('case.js', code, { 5: cs.kind === 'arrow' ? 'ok' : 'bad' }), T('Rule: <b>arrow → look outward where it was written</b>; <b>normal function → ask the call-site</b>. Try the other two cases in the input box.', 'Takeaway')]));
        return fr;
      }
    }],
    examples: [
      { title: 'Output puzzle: arrow as an object method', html: `<p>The classic trap. An object literal does not create a scope, so the arrow's this comes from the function that <b>built</b> the object. Here that function is called bare in strict code, so this is <code>undefined</code>.</p>${H.table(['Call', 'Output', 'Why'], [['c.viaMethod()', H.c('g', '0'), 'method shorthand: implicit binding'], ['c.viaArrow()', H.c('r', 'undefined'), 'arrow: outer this = build()\'s this = undefined']])}`,
        code: { lang: 'js', run: true, code: `
          'use strict';
          function build() {
            return {
              n: 0,
              viaMethod() { return this.n; },          // this = the object
              viaArrow: () => (this === undefined ? 'undefined' : this.n) // this = build()'s this
            };
          }
          const c = build();          // build called bare -> its this is undefined
          console.log(c.viaMethod()); // 0
          console.log(c.viaArrow());  // undefined
        ` } },
      { title: 'call, apply and bind cannot move an arrow', html: `<p>Explicit binding is ignored for arrows (no error, the thisArg just vanishes). Arguments still arrive. This is why "use <code>.bind</code> to fix it" never works on an arrow that captured the wrong this.</p>${H.kv([['arrow.call(other)', 'outer this'], ['arrow.bind(other)()', 'outer this'], ['arguments', 'still passed']])}`,
        code: { lang: 'js', run: true, code: `
          const owner = {
            tag: 'owner',
            make() { return (x) => this.tag + ':' + x; }   // captures make()'s this
          };
          const arrow = owner.make();
          const other = { tag: 'other' };
          console.log(arrow('a'));                 // owner:a
          console.log(arrow.call(other, 'b'));     // owner:b   (thisArg ignored)
          console.log(arrow.bind(other)('c'));     // owner:c
          console.log(arrow.apply(other, ['d']));  // owner:d
        ` } },
      { title: 'arguments inside an arrow belongs to the outer function', html: `<p>Arrows have no <code>arguments</code> object either. Inside <code>outer</code>, the arrow sees <code>outer</code>'s arguments, not its own. Modern code uses rest parameters <code>(...args)</code> everywhere instead.</p>`,
        code: { lang: 'js', run: true, code: `
          function outer() {
            const inner = () => arguments[0];      // outer's arguments!
            return inner('IGNORED');
          }
          console.log(outer('from outer'));        // from outer

          const modern = (...args) => args.length; // rest parameters work in arrows
          console.log(modern(1, 2, 3));            // 3
        ` } },
      { title: 'Class field arrows vs prototype methods', html: `<p>Class fields run once per instance with <code>this</code> = the new instance, so an arrow field captures the instance forever: it survives being detached. The price: each instance gets its <b>own</b> copy of the function, and it is not on the prototype (so <code>super.method()</code> and prototype-based mocking cannot reach it).</p>${H.table(['', 'prototype method', 'arrow class field'], [['survives detaching?', H.c('r', 'no'), H.c('g', 'yes')], ['copies in memory', '1 shared', 'one per instance'], ['on prototype?', 'yes', 'no'], ['overridable via super?', 'yes', 'awkward']])}`,
        code: { lang: 'js', run: true, code: `
          class Button {
            label = 'OK';
            onClickArrow = () => this.label;          // field: per instance, this captured
            onClickMethod() { return this?.label; }    // prototype: shared, this dynamic
          }
          const a = new Button(), b = new Button();
          const { onClickArrow, onClickMethod } = a;   // detach both
          console.log(onClickArrow());                 // OK
          console.log(onClickMethod());                // undefined (lost this)
          console.log(a.onClickArrow === b.onClickArrow, a.onClickMethod === b.onClickMethod); // false true
          console.log('onClickArrow' in Button.prototype); // false
        ` } },
      { title: 'When NOT to use an arrow: needing the dynamic this', html: `<p>Some APIs deliberately pass a useful <code>this</code>: DOM listeners pass the element, jQuery passes the element, Mocha passes the test context, and <code>Array.prototype.map</code> passes its <code>thisArg</code>. An arrow throws that away. In a browser: <code>btn.addEventListener('click', function () { this.disabled = true; })</code> works; the arrow version would target the outer this. With arrows, use <code>event.currentTarget</code> instead.</p>`,
        code: { lang: 'js', run: true, code: `
          const scale = { factor: 10 };
          const nums = [1, 2, 3];
          // map's thisArg is honoured by a normal function...
          console.log(nums.map(function (n) { return n * this.factor; }, scale).join(' ')); // 10 20 30
          // ...but ignored by an arrow (its this comes from outside)
          const viaArrow = (function () {
            'use strict';
            return nums.map((n) => (this === undefined ? 'no-this' : n * this.factor), scale).join(' ');
          })();
          console.log(viaArrow);                                                              // no-this no-this no-this
        ` } }
    ],
    deepDive: `<p><b>🟣 How lexical this works in the spec.</b> An arrow function's <code>[[ThisMode]]</code> is <b>lexical</b>. When called, <code>OrdinaryCallBindThis</code> does nothing, and its function environment reports <code>HasThisBinding() = false</code>. Evaluating <code>this</code> runs <code>GetThisEnvironment()</code>, which walks outward until it finds an environment that HAS a this binding (a normal function, a class field initializer, a module, or the global environment). So the arrow does not "copy" this at creation; it <b>looks it up live</b> in the enclosing function's environment each time.</p>
      <p>That live lookup matters in one famous edge case: in a derived class constructor, an arrow created <b>before</b> <code>super()</code> and called <b>after</b> it sees the initialised this, because it reads the constructor's environment, which super() has since filled in. Calling it before super() throws a ReferenceError.</p>
      <p><b>Arrows also cannot be:</b> generators (no <code>yield</code>), constructors, or have duplicate parameter names. They have no <code>prototype</code> property, which makes them slightly cheaper to create. Returning an object literal needs parentheses: <code>() =&gt; ({ a: 1 })</code>, otherwise the braces are a function body and you get <code>undefined</code>.</p>
      <p><b>Production trade-offs of arrow class fields:</b> memory is O(instances × methods), which matters for thousands of list rows; prototype-level spies like <code>jest.spyOn(Button.prototype, 'onClick')</code> cannot see them; subclasses cannot call <code>super.onClick()</code>. An alternative is binding in the constructor (<code>this.onClick = this.onClick.bind(this)</code>, still per instance) or keeping prototype methods and wrapping at the use site (<code>onClick={() =&gt; this.onClick()}</code>). In React function components (the 2026 default) none of this applies; closures replace <code>this</code> entirely.</p>`,
    aiEra: `<p><b>🤖 What AI changes:</b> assistants default to arrows everywhere because they are short. That is usually right for callbacks and helpers, but they also generate <code>const api = { get: () =&gt; this.client.get() }</code> (broken) and arrow class fields on hot classes that get instantiated thousands of times.</p>
      <p><b>Use AI as a partner:</b> ask <code>Mark each function in this file: does it read this? Is it an arrow? Is that correct?</code> It produces a good audit table quickly. Also ask it to convert legacy <code>var self = this</code> code to arrows; then verify each converted callback really wanted the outer this, not a dynamic one (DOM handlers, jQuery, Mocha).</p>
      <p><b>Where AI goes wrong:</b> it "fixes" an arrow's wrong this with <code>.bind()</code> (no effect), or claims arrows "inherit this from the object they are defined in". <b>What you must still own:</b> the lookup-outward rule, knowing that object literals are not scopes, and choosing arrow vs method vs field arrow based on reuse, memory, testing and inheritance needs.</p>`,
    problems: [{
      title: 'Fix the Stopwatch That Never Counts',
      level: 'Easy', tags: ['arrow functions', 'lexical this', 'timers'], companies: ['Zomato', 'Razorpay', 'Shopify'],
      statement: `<p>A <code>Stopwatch</code> class has <code>start(ticks)</code> which should increase <code>this.elapsed</code> once per timer tick, <code>ticks</code> times, and then call <code>this.onDone(this.elapsed)</code>. The given version uses <code>setInterval(function () { this.elapsed++; ... })</code> and never counts. Rewrite <code>start</code> so the callback sees the instance, and make sure the interval is cleared.</p>`,
      constraints: `1 ≤ ticks ≤ 10; tick interval 5 ms; do not use globals; the class body is strict.`,
      example: `<p><code>new Stopwatch(total =&gt; console.log('done', total)).start(3)</code> prints ${H.c('g', 'done 3')}. The broken version's callback has <code>this</code> = ${H.c('r', 'the timer object / window')}, so <code>this.elapsed</code> is not the instance's field and <code>this.onDone</code> is not a function.</p>`,
      brute: { why: `<p>The callback is a <b>normal</b> function, so its this is chosen by the timer system, not by the class. <code>this.elapsed++</code> writes to the wrong object, the instance stays at 0, and <code>this.onDone</code> is undefined, so it throws on the first tick. Rebinding inside every tick or copying fields to globals are wasteful fixes.</p>`,
        code: `
          class BrokenStopwatch {
            constructor(onDone) { this.elapsed = 0; this.onDone = onDone; }
            start(ticks) {
              const id = setInterval(function () {
                this.elapsed++;                       // this is NOT the stopwatch
                if (this.elapsed === ticks) {
                  clearInterval(id);
                  this.onDone(this.elapsed);          // TypeError: not a function
                }
              }, 5);
            }
          }
        ` },
      mcq: { q: 'Which change makes the interval callback see the Stopwatch instance with the least code?', options: ['Add "use strict"', 'Turn the callback into an arrow function', 'Call start with new', 'Move elapsed to a global variable'], answer: 1, explain: 'An arrow has no own this; it reads start()\'s this, which is the instance because start is called as <code>sw.start()</code>.' },
      hints: [
        `<p>Hint 1: Ask "who calls the callback?" The timer system calls it bare, so a normal function gets the wrong this.</p>`,
        `<p>Hint 2: An arrow looks up this from <code>start</code>, and start's this is the instance (implicit binding at <code>sw.start(3)</code>). Alternatives: <code>.bind(this)</code> or <code>const self = this</code>.</p>`,
        `<p>Hint 3: Keep the interval id, clear it when <code>elapsed === ticks</code>, and only then call onDone. Recipe: reset elapsed → id = setInterval(() =&gt; { elapsed++; if done: clearInterval(id); onDone(elapsed) }, 5).</p>`
      ],
      solution: {
        approach: `<p>Replace the inner normal function with an arrow so <code>this</code> is resolved lexically from <code>start</code>. Everything else stays the same. Also guard against calling start twice by clearing any previous interval.</p>`,
        code: { lang: 'js', run: true, code: `
          class Stopwatch {
            constructor(onDone) { this.elapsed = 0; this.onDone = onDone; this.id = null; }
            start(ticks) {
              clearInterval(this.id);                 // safe if start is called twice
              this.elapsed = 0;
              this.id = setInterval(() => {           // arrow: this = the instance
                this.elapsed++;
                if (this.elapsed === ticks) {
                  clearInterval(this.id);
                  this.onDone(this.elapsed);
                }
              }, 5);
              return this;                            // allow chaining
            }
          }
          new Stopwatch((total) => console.log('done', total)).start(3);   // done 3
        ` },
        dry: { head: ['tick', 'this inside arrow', 'elapsed', 'action'], rows: [
          ['start', 'sw (from sw.start)', '0', 'schedule interval'],
          ['1', 'sw', '1', 'continue'],
          ['2', 'sw', '2', 'continue'],
          ['3', 'sw', '3', '<span class="c-g">clearInterval, onDone(3)</span>']
        ] },
        complexity: `<p>O(ticks) timer callbacks, O(1) memory.</p>`,
        followUps: ['Add <code>stop()</code> and <code>reset()</code>; does <code>stop</code> need an arrow too?', 'Write the same fix with <code>.bind(this)</code> and with <code>const self = this</code>; compare.', 'If start is passed as a callback (<code>button.onclick = sw.start</code>), does the arrow inside still save you?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 6: losing this in callbacks
     ===================================================================== */
  var LOSE_CASES = {
    detached: { call: 'setTimeout(counter.inc, 0);', item: 'inc (bare function)', inner: 'inc', thisv: 'window (browser) / Timeout object (Node)', ok: false,
      why: 'Writing <code>counter.inc</code> as an argument evaluates it to a plain function value. setTimeout receives ONLY the function; the counter is not passed along.' },
    arrow: { call: 'setTimeout(() => counter.inc(), 0);', item: '() => counter.inc()', inner: 'arrow, then inc', thisv: 'counter', ok: true,
      why: 'We pass a small arrow instead. setTimeout still calls it bare (which is fine: the arrow does not need a this), and INSIDE it we write the full call <code>counter.inc()</code>, dot included.' },
    bound: { call: 'setTimeout(counter.inc.bind(counter), 0);', item: 'bound inc (this locked)', inner: 'bound inc → inc', thisv: 'counter', ok: true,
      why: 'We pass a bound function. setTimeout calls it bare, but bound functions ignore the call-site and always use [[BoundThis]] = counter.' }
  };
  topics.push({
    title: 'Losing this in Callbacks (and Every Way to Fix It)',
    analogy: `<p>You hand a courier a letter that says <b>"deliver this to my desk"</b>, but you do not write your name or address on it. The courier company (setTimeout, an event system, a Promise) delivers it later, and "my desk" now means whoever happens to open it: the courier's own desk.</p>
      <p>Passing <code>obj.method</code> as a callback is exactly that: you hand over the function <b>without</b> the object. The fixes are all ways of writing the address on the letter: wrap it (<code>() =&gt; obj.method()</code>), stamp it permanently (<code>bind</code>), or tell the courier explicitly (a <code>thisArg</code> parameter).</p>`,
    explain: `<p><b>🟢 The plain idea.</b> When you pass <code>obj.method</code> to another function, you pass <b>only the function</b>. Later, someone else calls it, and <b>they</b> decide <code>this</code>. Usually they call it bare, so you get default binding: <code>undefined</code> in strict code (crash on <code>this.x</code>) or <code>globalThis</code> in sloppy code (silent wrong value).</p>
      <p><b>Who calls your callback, and with what this?</b></p>
      ${H.table(['Caller', 'this given to a normal-function callback'], [
        ['<code>setTimeout</code> / <code>setInterval</code>', 'browser: <code>window</code> · Node: the <code>Timeout</code> object'],
        ['<code>arr.map / forEach / filter</code>', '<code>undefined</code> (strict) / globalThis (sloppy), or the optional <b>thisArg</b> you pass'],
        ['<code>promise.then(cb)</code>', '<code>undefined</code> (strict) / globalThis (sloppy)'],
        ['<code>el.addEventListener("click", cb)</code>', 'the element (<code>event.currentTarget</code>)'],
        ['Node <code>EventEmitter.on(evt, cb)</code>', 'the emitter instance'],
        ['Your own higher-order function <code>retry(fn)</code>', 'whatever you wrote: usually a bare <code>fn()</code>']
      ])}
      <p><b>🔵 The fixes, from most to least common in 2026 code:</b></p>
      <ol>
        <li><b>Arrow wrapper at the call-site:</b> <code>setTimeout(() =&gt; obj.method(), 0)</code>. Clear, works for any arguments (<code>(...a) =&gt; obj.method(...a)</code>), and always reads the latest <code>obj.method</code>.</li>
        <li><b>Bind once</b>, store it, reuse it: <code>this.onResize = this.onResize.bind(this)</code> in a constructor. Required when you must later <code>removeEventListener</code> the very same function.</li>
        <li><b>Arrow class field:</b> <code>onResize = () =&gt; {...}</code>. Auto-bound per instance.</li>
        <li><b>thisArg parameter</b> where the API offers one: <code>arr.forEach(fn, obj)</code>, <code>Array.from(x, fn, obj)</code>.</li>
        <li><b>Do not use this at all:</b> closures/factory functions (<code>createCounter()</code> returning functions) cannot lose a receiver they never had. Common in modern functional code and React hooks.</li>
      </ol>
      ${H.chips([H.c('r', 'setTimeout(obj.m)'), H.c('g', 'setTimeout(() => obj.m())'), H.c('g', 'setTimeout(obj.m.bind(obj))')], { label: 'lost vs kept' })}`,
    clues: [
      '"Why does <code>this.x</code> become undefined inside <code>setTimeout</code> / <code>.then</code> / <code>forEach</code>?" → method passed as a callback, receiver lost',
      '<code>removeEventListener</code> "does not work" → a new <code>.bind()</code> or arrow was created for add and another for remove; keep one reference',
      '"Pass a class method as a prop / callback" (React, Vue, Angular, Node streams) → bind in constructor, arrow field, or arrow wrapper',
      '<code>TypeError: Cannot read properties of undefined (reading \'...\')</code> right after a refactor that destructured or passed a method → lost this',
      '"What is this inside an event listener?" → the element (currentTarget) for normal functions, outer this for arrows',
      '"thisArg" parameter in an API signature (<code>forEach(cb, thisArg)</code>) → explicit binding offered by the caller'
    ],
    code: [{ lang: 'js', run: true, title: 'Lost and fixed in timers, arrays and promises (runnable)', code: `
      'use strict';
      class Counter {
        constructor() { this.count = 0; }
        inc() {
          if (this === undefined) return 'LOST (this is undefined)';
          if (!(this instanceof Counter)) return 'LOST (this is some other object)';
          this.count++;
          return 'ok, count = ' + this.count;
        }
      }
      const c = new Counter();

      console.log('array, detached :', [1].map(c.inc)[0]);                 // LOST (undefined)
      console.log('array, thisArg  :', [1].map(c.inc, c)[0]);              // ok, count = 1
      console.log('array, arrow    :', [1].map(() => c.inc())[0]);         // ok, count = 2

      Promise.resolve().then(c.inc).then((r) => console.log('promise, detached:', r));               // LOST
      Promise.resolve().then(c.inc.bind(c)).then((r) => console.log('promise, bound   :', r));       // ok

      setTimeout(function () {
        // timers: the HOST picks this (window in browsers, a Timeout object in Node)
        setTimeout(c.inc, 0);                                       // lost, result discarded
        setTimeout(() => console.log('timer, arrow     :', c.inc()), 0);
      }, 0);
    ` }],
    codeTitle: ['Runnable: three callers, three fixes'],
    viz: [{
      title: 'A detached method travelling through the task queue',
      input: 'detached',
      inputLabel: 'How we pass it: detached | arrow | bound',
      gen: function (input) {
        var key = String(input === undefined ? 'detached' : input).trim().toLowerCase();
        var cs = LOSE_CASES[key];
        if (!cs) throw new Error('Type one of: detached | arrow | bound');
        var code = ['const counter = {', '  count: 0,', '  inc() { this.count++; }', '};', cs.call, '// ... later the timer fires ...'].join('\n');
        return [
          F('We want <code>counter.inc</code> to run later. The question: when the timer fires, will <code>inc</code> still know about <code>counter</code>?', [C('callback.js', code, { 5: 'cur' }), V('counter', { count: 0 })]),
          F('<b>Passing the argument.</b> ' + cs.why, [C('callback.js', code, { 5: 'cur' }), { type: 'map', label: 'What setTimeout actually receives', entries: [['callback', cs.item], ['object attached?', key === 'detached' ? 'none' : (key === 'arrow' ? 'inside the arrow body' : 'locked inside bound fn')]], hl: { 'object attached?': cs.ok ? 'ok' : 'bad' } }]),
          F('setTimeout stores the callback in the <b>task queue</b> and returns immediately. The current code finishes; the call stack empties.', [S('Call stack', ['(empty)']), { type: 'queue', label: 'Task (macrotask) queue', items: [cs.item], hl: { 0: 'cur' } }]),
          F('The event loop picks the task and calls the callback the only way it can: <b>bare</b>, <code>callback()</code>. There is no <code>counter.</code> in front.', [{ type: 'queue', label: 'Task queue', items: [] }, S('Call stack', ['(event loop)', cs.inner], { 1: 'cur' })]),
          F('Inside inc, <code>this</code> = <b>' + cs.thisv + '</b>. ' + (cs.ok ? '<span class="c-g">The receiver survived.</span>' : '<span class="c-r">The receiver is lost: <code>this.count++</code> touches the wrong object (or throws in strict code with an undefined this).</span>'),
            [C('callback.js', code, { 3: cs.ok ? 'ok' : 'bad' }), V('inc frame', { 'this': cs.thisv }, { 'this': cs.ok ? 'ok' : 'bad' }), V('counter', { count: cs.ok ? 1 : 0 }, { count: cs.ok ? 'ok' : 'bad' })]),
          F('Comparison of the three ways to pass it. Try the other inputs to watch the receiver survive.', [{ type: 'table', label: 'Passing counter.inc to a callback API', columns: ['How passed', 'this in inc', 'counter.count'], rows: [['setTimeout(counter.inc)', 'host-chosen', '0 (bug)'], ['setTimeout(() => counter.inc())', 'counter', '1'], ['setTimeout(counter.inc.bind(counter))', 'counter', '1']], hl: { 0: key === 'detached' ? 'bad' : '', 1: key === 'arrow' ? 'ok' : '', 2: key === 'bound' ? 'ok' : '' } }])
        ];
      }
    }],
    examples: [
      { title: 'Higher-order helpers drop the receiver too', html: `<p>Your own utility functions (retry, debounce, once, memoize) call the function you give them. If they call it bare, any method passed in loses <code>this</code>. Either the caller wraps it, or the helper forwards <code>this</code> with <code>fn.apply(this, args)</code> (see practice problems).</p>`,
        code: { lang: 'js', run: true, code: `
          'use strict';
          function twice(fn) { return [fn(), fn()]; }       // calls fn bare
          const api = {
            calls: 0,
            ping() { this.calls++; return 'pong#' + this.calls; }
          };
          try { twice(api.ping); } catch (e) { console.log('detached:', e.message); }
          console.log('wrapped :', twice(() => api.ping()).join(', '));      // pong#1, pong#2
          console.log('bound   :', twice(api.ping.bind(api)).join(', '));    // pong#3, pong#4
        ` } },
      { title: 'Libraries can choose a useful this (EventEmitter style)', html: `<p>Some callers deliberately pass a meaningful <code>this</code>. Node's <code>EventEmitter</code> calls normal-function listeners with <code>this</code> = the emitter; DOM listeners get the element. Below is a tiny emitter that does the same with <code>call</code>. An arrow listener ignores it and keeps its outer this.</p>${H.kv([['function listener', 'this = emitter'], ['arrow listener', 'this = outer scope']])}`,
        code: { lang: 'js', run: true, code: `
          'use strict';
          class MiniEmitter {
            constructor(name) { this.name = name; this.handlers = []; }
            on(fn) { this.handlers.push(fn); return this; }
            emit(data) { this.handlers.forEach((h) => h.call(this, data)); } // this = emitter
          }
          const bus = new MiniEmitter('orders');
          bus.on(function (d) { console.log('function listener: this.name =', this.name, '| data =', d); });
          const app = {
            name: 'app',
            wire(emitter) {   // the arrow below captures wire()'s this = app
              emitter.on((d) => console.log('arrow listener: this.name =', this.name, '| data =', d));
            }
          };
          app.wire(bus);
          bus.emit(42);
        ` } },
      { title: 'DOM listeners: element as this, and the removeEventListener trap', html: `<p>Browser-only code (no Run button). A normal function listener gets the element as <code>this</code>. If you need your component instead, bind <b>once</b> and keep the reference, because <code>removeEventListener</code> only removes the exact same function object.</p>${H.table(['Listener', 'this', 'Removable later?'], [['function () {}', 'the element', 'yes, if you kept a reference'], ['this.onClick.bind(this) written twice', 'component', H.c('r', 'no: two different functions')], ['this.onClick bound once in constructor', 'component', H.c('g', 'yes')]])}`,
        code: { lang: 'js', code: `
          class Toolbar {
            constructor(el) {
              this.el = el;
              this.clicks = 0;
              this.onClick = this.onClick.bind(this);      // bind ONCE, store it
              el.addEventListener('click', this.onClick);
            }
            onClick(event) {
              this.clicks++;                               // this = Toolbar instance
              event.currentTarget.dataset.clicks = String(this.clicks); // the element is still reachable
            }
            destroy() {
              this.el.removeEventListener('click', this.onClick); // same reference -> removed
            }
          }
          // BUG version: el.removeEventListener('click', this.onClick.bind(this)) removes nothing
          new Toolbar(document.querySelector('#toolbar'));
        ` } },
      { title: 'Output puzzle: which lines throw?', html: `<p>Predict before running. Class bodies are strict, so a lost this is <code>undefined</code> and reading a property throws.</p>${H.table(['Line', 'Result'], [['[1,2].forEach(s.add)', H.c('r', 'throws')], ['[1,2].forEach(s.add, s)', H.c('g', 'ok')], ['[1,2].forEach(x => s.add(x))', H.c('g', 'ok')], ['[1,2].forEach(s.addArrow)', H.c('g', 'ok')]])}`,
        code: { lang: 'js', run: true, code: `
          class Summer {
            total = 0;
            add(x) { this.total += x; }
            addArrow = (x) => { this.total += x; };
          }
          const s = new Summer();
          const tries = {
            'forEach(s.add)': () => [1, 2].forEach(s.add),
            'forEach(s.add, s)': () => [1, 2].forEach(s.add, s),
            'forEach(x => s.add(x))': () => [1, 2].forEach((x) => s.add(x)),
            'forEach(s.addArrow)': () => [1, 2].forEach(s.addArrow)
          };
          for (const [label, run] of Object.entries(tries)) {
            try { run(); console.log(label.padEnd(24), 'ok, total =', s.total); }
            catch (e) { console.log(label.padEnd(24), 'throws:', e.constructor.name); }
          }
        ` } }
    ],
    deepDive: `<p><b>🟣 Why the host decides.</b> A callback is just a function value; the spec gives the <b>caller</b> full control of the thisArgument via <code>Call(F, thisArgument, args)</code>. Each API documents its choice: <code>Array.prototype.forEach</code> uses the optional <code>thisArg</code> (default undefined); Promise reaction jobs call handlers with <code>undefined</code>; the HTML spec invokes timer callbacks with the global object's WindowProxy as this; the DOM invokes listeners with <code>event.currentTarget</code>; Node's timers pass the <code>Timeout</code> instance and Node's EventEmitter uses <code>Reflect.apply(listener, this, args)</code> with the emitter. So "what is this in a callback" is always answered by "read the caller's contract".</p>
      <p><b>Choosing a fix in production:</b> (1) arrow wrappers are cheapest to reason about and pick up method replacement (useful for mocking/hot-reload); (2) bind-once is needed for identity (unsubscribe, memoised props); (3) arrow class fields trade memory and prototype access for convenience; (4) <code>thisArg</code> avoids allocation entirely but only some APIs have it. Avoid creating a new bound function or arrow on every render when the callee compares function identity (React <code>memo</code>, <code>useEffect</code> dependency arrays); use <code>useCallback</code> or a stable reference.</p>
      <p><b>Unhandled detail:</b> in sloppy code, a lost this silently becomes <code>globalThis</code>, so <code>this.count++</code> creates a global <code>count = NaN</code> with no error. Turning on strict mode (or using modules/classes) converts that silent corruption into an immediate TypeError, which is why linters such as ESLint's <code>no-invalid-this</code> and TypeScript's <code>noImplicitThis</code> exist. TypeScript can also declare a <code>this</code> parameter: <code>function inc(this: Counter) {}</code> makes the compiler reject detached calls.</p>`,
    aiEra: `<p><b>🤖 What AI changes:</b> lost-this bugs are among the most common things people paste into AI chats, and assistants fix them well when the stack trace is included. The risk is the <i>type</i> of fix: an assistant may add <code>.bind(this)</code> inline in a render loop or listener registration, creating a new function each time and breaking <code>removeEventListener</code> or memoisation.</p>
      <p><b>Use AI as a partner:</b> ask it to list every API in your code that takes a callback and what <code>this</code> each passes; then grep for methods passed without wrappers. Ask for an ESLint config with <code>no-invalid-this</code> and TS <code>noImplicitThis</code> to catch these automatically.</p>
      <p><b>Where AI goes wrong:</b> claiming <code>setTimeout</code> gives <code>undefined</code> in Node (it gives a Timeout object), or that arrows "bind this to the callback's caller". <b>What you must still own:</b> knowing that the caller chooses this, matching the fix to the need (identity, memory, inheritance), and recognising the bug from a one-line symptom in an interview.</p>`,
    problems: [{
      title: 'autoBind: Bind Every Method of an Instance',
      level: 'Medium', tags: ['bind', 'prototype chain', 'callbacks'], companies: ['Meta', 'Atlassian', 'Grab'],
      statement: `<p>Write <code>autoBind(instance)</code> that walks the instance's prototype chain (stopping before <code>Object.prototype</code>) and, for every <b>method</b> (a plain function value, not <code>constructor</code>, not a getter/setter), sets an own property on the instance holding a version bound to the instance. Methods nearer the instance (subclass overrides) must win over parent ones. Return the instance. After that, detached calls like <code>const { save } = repo; save()</code> work.</p>`,
      constraints: `Up to 5 levels of inheritance, up to 100 methods; getters must not be invoked during binding; existing own properties must not be overwritten.`,
      example: `<p><code>class A { hi() { return 'A:' + this.n; } }</code> <code>class B extends A { hi() { return 'B:' + this.n; } bye() { return this.n; } }</code></p><p><code>const b = autoBind(Object.assign(new B(), { n: 1 }))</code>; <code>const { hi, bye } = b</code>; <code>hi()</code> → ${H.c('g', '"B:1"')} (the override, not A's), <code>bye()</code> → ${H.c('g', '1')}.</p>`,
      brute: { why: `<p>Looping with <code>for...in</code> finds nothing, because class methods are <b>non-enumerable</b>. Using <code>instance[key]</code> on every key would also <b>invoke getters</b> (side effects) and bind the constructor. And walking parent-first would let parent methods overwrite child overrides.</p>`,
        code: `
          // BROKEN: for...in skips non-enumerable class methods, so nothing gets bound
          function autoBindNaive(obj) {
            for (const key in obj) {
              if (typeof obj[key] === 'function') obj[key] = obj[key].bind(obj);
            }
            return obj;
          }
        ` },
      mcq: { q: 'Why read methods with <code>Object.getOwnPropertyDescriptor</code> instead of <code>proto[key]</code>?', options: ['It is faster', 'It lets you skip getters/setters without running them, and see non-enumerable methods', 'It binds automatically', 'proto[key] is not allowed on classes'], answer: 1, explain: 'A descriptor shows whether the property is a data property (has <code>value</code>) or an accessor (<code>get</code>/<code>set</code>), without invoking the getter.' },
      hints: [
        `<p>Hint 1: Class methods live on prototypes and are non-enumerable. Use <code>Object.getOwnPropertyNames(proto)</code> (plus symbols if you like) at each level of <code>Object.getPrototypeOf</code>.</p>`,
        `<p>Hint 2: Walk from the instance's prototype upward. Skip a key if the instance already has an own property with that name; since the nearest level is visited first, child overrides win automatically.</p>`,
        `<p>Hint 3: For each name: descriptor = getOwnPropertyDescriptor(proto, name); skip if name === "constructor", or no <code>value</code>, or value is not a function; else <code>instance[name] = desc.value.bind(instance)</code>. Stop when proto is null or Object.prototype.</p>`
      ],
      solution: {
        approach: `<p>Walk the prototype chain nearest-first, inspect property <b>descriptors</b> (so getters are not triggered and non-enumerable methods are visible), and define bound copies as own properties. Skipping names already present as own properties both preserves user data and makes child overrides win.</p>`,
        code: { lang: 'js', run: true, code: `
          function autoBind(instance) {
            let proto = Object.getPrototypeOf(instance);
            while (proto && proto !== Object.prototype) {
              for (const key of Reflect.ownKeys(proto)) {          // names + symbols, incl. non-enumerable
                if (key === 'constructor' || Object.prototype.hasOwnProperty.call(instance, key)) continue;
                const desc = Object.getOwnPropertyDescriptor(proto, key);
                if (!desc || typeof desc.value !== 'function') continue; // skip getters/setters/data
                instance[key] = desc.value.bind(instance);           // own, bound copy
              }
              proto = Object.getPrototypeOf(proto);                  // go one level up
            }
            return instance;
          }

          class A { hi() { return 'A:' + this.n; } get loud() { throw new Error('getter ran!'); } }
          class B extends A { hi() { return 'B:' + this.n; } bye() { return this.n; } }
          const b = autoBind(Object.assign(new B(), { n: 1 }));
          const { hi, bye } = b;
          console.log(hi(), bye());                       // B:1 1
          console.log(Object.keys(b).join(','));          // n,hi,bye
        ` },
        dry: { head: ['level', 'key', 'decision', 'own keys after'], rows: [
          ['B.prototype', 'constructor', 'skip', 'n'],
          ['B.prototype', 'hi', 'bind B.hi', 'n, hi'],
          ['B.prototype', 'bye', 'bind', 'n, hi, bye'],
          ['A.prototype', 'hi', '<span class="c-y">skip: already own (child wins)</span>', 'n, hi, bye'],
          ['A.prototype', 'loud', 'skip: accessor, getter NOT run', 'n, hi, bye'],
          ['Object.prototype', '-', 'stop', 'n, hi, bye']
        ] },
        complexity: `<p>O(total methods across the chain); one bound function per method per instance (memory O(methods) per instance).</p>`,
        followUps: ['Add an <code>exclude</code> list or a filter predicate.', 'Bind lazily on first access using a getter on the prototype instead of eagerly per instance.', 'Why might autoBind on every instance of a list item be a bad idea for memory?']
      }
    }]
  });
  registerModule({ id: 'js05', title: 'this, call/apply/bind & Arrow Functions', intro: '<p>x</p>', goals: [], prereqs: 'x', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview });
})();
