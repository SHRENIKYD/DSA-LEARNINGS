(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- small helpers shared by the visualizers of this module ---------- */
  function F(narr, parts) { return { narr: narr, parts: parts }; }
  function C(label, code, hl) { return { type: 'code', label: label, lang: 'js', code: code, hl: hl || {} }; }
  function V(label, vals, hl) { return { type: 'vars', label: label, vals: vals, hl: hl || {} }; }
  function T(html, label) { return { type: 'text', label: label, html: html }; }
  function TB(label, columns, rows, hl) { return { type: 'table', label: label, columns: columns, rows: rows.map(function (r) { return r.slice(); }), hl: hl || {} }; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function show(v) { return v === undefined ? 'undefined' : esc(JSON.stringify(v)); }

  /* =====================================================================
     TOPIC 1: expect() and matchers: what "equal" really means
     ===================================================================== */
  function traceEquals(a, b, strict, path, rows) {
    var p = path || 'root';
    if (Object.is(a, b)) { rows.push([p, show(a), show(b), 'Object.is → same']); return true; }
    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) { rows.push([p, show(a), show(b), 'different primitives → FAIL']); return false; }
    if (Array.isArray(a) !== Array.isArray(b)) { rows.push([p, 'array?' + Array.isArray(a), 'array?' + Array.isArray(b), 'array vs object → FAIL']); return false; }
    if (Array.isArray(a) && a.length !== b.length) { rows.push([p, 'length ' + a.length, 'length ' + b.length, 'array lengths differ → FAIL']); return false; }
    var keys = function (o) { return Object.keys(o).filter(function (k) { return strict || o[k] !== undefined; }); };
    var ka = keys(a), kb = keys(b);
    rows.push([p, '{' + ka.join(',') + '}', '{' + kb.join(',') + '}', 'compare keys' + (strict ? ' (undefined counts)' : ' (undefined ignored)')]);
    if (ka.length !== kb.length) { rows.push([p, ka.length + ' keys', kb.length + ' keys', 'key count differs → FAIL']); return false; }
    for (var i = 0; i < ka.length; i++) {
      var k = ka[i];
      if (!Object.prototype.hasOwnProperty.call(b, k)) { rows.push([p + '.' + k, 'present', 'missing', 'FAIL']); return false; }
      if (!traceEquals(a[k], b[k], strict, p + '.' + k, rows)) return false;
    }
    return true;
  }
  function equalityFrames(input) {
    var parts = String(input || '').split('|');
    if (parts.length !== 2) throw new Error('Type two JSON values separated by |, e.g. {"a":1} | {"a":1}');
    var a, b;
    try { a = JSON.parse(parts[0]); b = JSON.parse(parts[1]); } catch (e) { throw new Error('Both sides must be valid JSON, e.g. {"a":[1,2]} | {"a":[1,2]}'); }
    var fr = [];
    var code = 'const received = ' + JSON.stringify(a) + ';\nconst expected = ' + JSON.stringify(b) + ';\nexpect(received).toBe(expected);\nexpect(received).toEqual(expected);\nexpect(received).toStrictEqual(expected);';
    fr.push(F('Three matchers, three different questions. <code>toBe</code> asks "is it the <b>same thing</b>?" (Object.is). <code>toEqual</code> asks "does it have the <b>same contents</b>?" (recursive). <code>toStrictEqual</code> adds "and the same <b>shape</b>, including undefined keys and classes".', [C('my.test.js', code, { 1: 'cur', 2: 'cur' })]));
    var same = Object.is(a, b);
    fr.push(F('<code>toBe</code>: JSON.parse made two separate values. For objects and arrays that means two different references, so Object.is is <b>' + same + '</b>' + (typeof a === 'object' && a !== null ? ' even if they look identical. This is the #1 beginner surprise.' : '.'), [C('my.test.js', code, { 3: same ? 'ok' : 'bad' }), V('toBe', { 'Object.is(received, expected)': String(same), result: same ? 'PASS' : 'FAIL' }, { result: same ? 'ok' : 'bad' })]));
    var rows = [], r1 = traceEquals(a, b, false, 'root', rows);
    for (var i = 1; i <= Math.min(rows.length, 12); i++) {
      fr.push(F('<code>toEqual</code> walks both values recursively. Step ' + i + ': at <code>' + esc(rows[i - 1][0]) + '</code> → ' + rows[i - 1][3] + '.', [C('my.test.js', code, { 4: 'cur' }), TB('toEqual walk', ['path', 'received', 'expected', 'decision'], rows.slice(0, i), (function () { var h = {}; h[i - 1] = /FAIL/.test(rows[i - 1][3]) ? 'bad' : 'cur'; return h; })())]));
    }
    fr.push(F('<code>toEqual</code> result: <b>' + (r1 ? 'PASS' : 'FAIL') + '</b>.', [C('my.test.js', code, { 4: r1 ? 'ok' : 'bad' }), TB('toEqual walk', ['path', 'received', 'expected', 'decision'], rows.slice(0, 12))]));
    var rows2 = [], r2 = traceEquals(a, b, true, 'root', rows2);
    fr.push(F('<code>toStrictEqual</code> repeats the walk but treats <code>{ a: undefined }</code> and <code>{}</code> as different, checks array sparseness and requires the same class (a plain object is not equal to a class instance with the same fields). Result: <b>' + (r2 ? 'PASS' : 'FAIL') + '</b>.', [C('my.test.js', code, { 5: r2 ? 'ok' : 'bad' }), TB('toStrictEqual walk', ['path', 'received', 'expected', 'decision'], rows2.slice(0, 12))]));
    fr.push(F('<b>Summary.</b> Primitives: use <code>toBe</code>. Objects/arrays you built: <code>toStrictEqual</code> (safest) or <code>toEqual</code>. Same instance (a cache returned the same object): <code>toBe</code>.', [TB('verdicts', ['matcher', 'result'], [['toBe', same ? 'PASS' : 'FAIL'], ['toEqual', r1 ? 'PASS' : 'FAIL'], ['toStrictEqual', r2 ? 'PASS' : 'FAIL']])]));
    return fr;
  }

  topics.push({
    title: 'expect() and Matchers: What "Equal" Really Means',
    analogy: `<p>Imagine checking a parcel at a warehouse. <b>toBe</b> is checking the <b>tracking number</b>: is this the very same box? <b>toEqual</b> is opening both boxes and comparing what is inside, ignoring empty packing slots. <b>toStrictEqual</b> is the fussy inspector who also checks that the <b>box brand</b> matches and counts the empty slots too. A matcher is just a function that answers yes or no and, when it says no, writes a helpful note explaining why.</p>`,
    explain: `<p>🟢 Every assertion in Jest and Vitest looks like <code>expect(received).matcher(expected)</code>. <code>expect</code> wraps the value; the matcher compares it and <b>throws an error</b> when the check fails. The test runner catches that error and marks the test as failed. That is the whole trick: <b>a failing test is a test that threw</b>.</p>
      ${H.table(['matcher', 'question it asks', 'example that passes'], [
        ['<code>toBe(x)</code>', 'same value by <code>Object.is</code>', '<code>expect(2 + 2).toBe(4)</code>'],
        ['<code>toEqual(x)</code>', 'same contents, recursively; undefined props ignored', '<code>expect({ a: 1, b: undefined }).toEqual({ a: 1 })</code>'],
        ['<code>toStrictEqual(x)</code>', 'toEqual + undefined props, sparse arrays and classes must match', '<code>expect([1, 2]).toStrictEqual([1, 2])</code>'],
        ['<code>toBeCloseTo(x, d)</code>', 'floats within half of 10<sup>-d</sup> (default d = 2)', '<code>expect(0.1 + 0.2).toBeCloseTo(0.3)</code>'],
        ['<code>toThrow(e?)</code>', 'calling the function throws (optionally matching e)', '<code>expect(() =&gt; JSON.parse("{")).toThrow(SyntaxError)</code>'],
        ['<code>toMatchObject(x)</code>', 'received contains at least these properties', '<code>expect(user).toMatchObject({ role: "admin" })</code>'],
        ['<code>toContain / toContainEqual</code>', 'array has item by === / by deep equality', '<code>expect([{ id: 1 }]).toContainEqual({ id: 1 })</code>']
      ])}
      <p><b>.not</b> flips any matcher: <code>expect(x).not.toBe(null)</code>. <b>Asymmetric matchers</b> sit <i>inside</i> an expected value and match a whole category: <code>expect.any(Number)</code>, <code>expect.stringMatching(/^id-/)</code>, <code>expect.objectContaining({ ok: true })</code>, <code>expect.arrayContaining([3])</code>. They are how you say "an id, I do not care which one".</p>
      <p><b>Snapshots</b> (<code>toMatchSnapshot</code>, <code>toMatchInlineSnapshot</code>) store the serialized value the first time and compare later runs against it. They are cheap to write and easy to abuse: a 400-line snapshot that everyone updates with <code>-u</code> without reading tests nothing.</p>`,
    clues: ['"toBe vs toEqual" / "why does expect({}).toBe({}) fail?" → reference identity vs deep equality', '"0.1 + 0.2 test fails" → <code>toBeCloseTo</code>, never toBe on floats', '"the id is random / the timestamp changes" → asymmetric matchers (<code>expect.any</code>, <code>expect.stringMatching</code>)', '"test passes but undefined field slipped through" → <code>toStrictEqual</code>', '"expect(fn()).toThrow does not work" → pass a function: <code>expect(() =&gt; fn()).toThrow()</code>', '"huge snapshot, everyone runs -u" → snapshot pitfalls; prefer small targeted assertions or inline snapshots'],
    code: [{ lang: 'js', run: true, title: 'A matcher is a function that throws (runnable)', code: `
      // The core of every assertion library: compare, and throw a helpful error when the check fails.
      function expect(received) {
        return {
          toBe(expected) {
            if (!Object.is(received, expected))
              throw new Error('expected ' + JSON.stringify(received) + ' to be ' + JSON.stringify(expected));
          },
          toEqual(expected) {
            // a cheap deep check for plain data (the real one is recursive and smarter)
            if (JSON.stringify(received) !== JSON.stringify(expected))
              throw new Error('expected ' + JSON.stringify(received) + ' to equal ' + JSON.stringify(expected));
          }
        };
      }
      function test(name, fn) {
        try { fn(); console.log('PASS', name); }
        catch (e) { console.log('FAIL', name, '->', e.message); } // the runner catches the throw
      }

      test('numbers with toBe', () => expect(2 + 2).toBe(4));
      test('objects with toBe (fails: two references)', () => expect({ a: 1 }).toBe({ a: 1 }));
      test('objects with toEqual', () => expect({ a: 1 }).toEqual({ a: 1 }));
      test('floats with toBe (fails)', () => expect(0.1 + 0.2).toBe(0.3));
      test('Object.is says NaN is NaN', () => expect(NaN).toBe(NaN));
    ` }, { lang: 'js', check: false, title: 'Real matchers in Vitest (same names in Jest)', code: `
      import { describe, it, expect } from 'vitest'; // Jest: globals, or import from '@jest/globals'
      import { createUser } from './user.js';

      describe('createUser', () => {
        it('fills defaults and generates an id', () => {
          const u = createUser({ name: 'Ada' });
          expect(u).toEqual({
            id: expect.stringMatching(/^usr_/),     // any id with the right prefix
            name: 'Ada',
            createdAt: expect.any(Date),            // any Date instance
            roles: expect.arrayContaining(['reader'])
          });
        });

        it('rejects an empty name', () => {
          expect(() => createUser({ name: '' })).toThrow(/name is required/);
        });

        it('keeps the money math honest', () => {
          expect(0.1 + 0.2).toBeCloseTo(0.3, 5);    // |diff| < 0.000005
        });

        it('renders the label (inline snapshot, small and reviewed)', () => {
          expect(createUser({ name: 'Ada' }).label).toMatchInlineSnapshot('"Ada (reader)"');
        });
      });
    ` }],
    codeTitle: ['Matchers from scratch', 'Real matchers'],
    viz: {
      title: 'toBe vs toEqual vs toStrictEqual, step by step',
      input: '{"a":1,"b":[1,2],"c":null} | {"a":1,"b":[1,2],"c":null}',
      inputLabel: 'Two JSON values separated by | (try {"a":1,"b":null} | {"a":1} or {"x":[1,2]} | {"x":[1,3]})',
      gen: equalityFrames
    },
    examples: [
      { title: 'Predict the result: five classic matcher traps', html: `${H.table(['assertion', 'result', 'why'], [
        ['<code>expect([1, 2]).toBe([1, 2])</code>', H.c('r', 'FAIL'), 'two different array objects'],
        ['<code>expect({ a: 1, b: undefined }).toEqual({ a: 1 })</code>', H.c('g', 'PASS'), 'toEqual ignores undefined properties'],
        ['<code>expect({ a: 1, b: undefined }).toStrictEqual({ a: 1 })</code>', H.c('r', 'FAIL'), 'toStrictEqual counts the undefined key'],
        ['<code>expect(0).toEqual(-0)</code>', H.c('r', 'FAIL'), 'primitives are compared with Object.is, and Object.is(0, -0) is false'],
        ['<code>expect(NaN).toBe(NaN)</code>', H.c('g', 'PASS'), 'Object.is(NaN, NaN) is true, unlike ===']
      ])}`, code: { lang: 'js', run: true, code: `
        console.log(Object.is([1, 2], [1, 2])); // false -> toBe fails
        console.log(Object.is(0, -0));          // false -> even toEqual(0, -0) fails
        console.log(Object.is(NaN, NaN));       // true  -> toBe(NaN) passes
        console.log(NaN === NaN);               // false -> why Jest uses Object.is, not ===
      ` } },
      { title: 'toThrow needs a function, not a call', html: `<p><code>expect(parse('{')).toThrow()</code> calls <code>parse</code> <b>before</b> <code>expect</code> runs, so the error escapes and the test crashes with the parse error instead of a clean assertion. Wrap it: <code>expect(() =&gt; parse('{')).toThrow(SyntaxError)</code>. For promises use <code>await expect(p).rejects.toThrow('boom')</code>.</p>`, code: { lang: 'js', run: true, code: `
        function toThrow(fn) {
          if (typeof fn !== 'function') return 'matcher error: received value must be a function';
          try { fn(); } catch (e) { return 'PASS (threw ' + e.name + ')'; }
          return 'FAIL (did not throw)';
        }
        console.log(toThrow(() => JSON.parse('{')));     // PASS (threw SyntaxError)
        try { toThrow(JSON.parse('{')); }                  // the error escapes BEFORE toThrow runs
        catch (e) { console.log('test crashed with', e.name); }
      ` } },
      { title: 'Snapshot pitfalls, in one table', html: `${H.table(['smell', 'what goes wrong', 'better'], [
        ['Huge component snapshot', 'nobody reads the diff, <code>-u</code> becomes a reflex', 'assert the 2 or 3 things that matter'],
        ['Dates, random ids in output', 'snapshot changes every run', 'fake the clock, or use property matchers: <code>toMatchSnapshot({ id: expect.any(String) })</code>'],
        ['Snapshot of implementation details', 'refactors break tests without changing behaviour', 'snapshot user-visible output only'],
        ['New snapshot written in CI', 'test "passes" with whatever the code produced', 'run Jest with <code>--ci</code>, which fails instead of writing']
      ])}` }
    ],
    deepDive: `<p>🟣 <b>How deep equality works in Jest.</b> <code>toEqual</code> calls an internal <code>equals(a, b, customTesters)</code> (from Jasmine's <code>eq</code>). It first lets asymmetric matchers decide (anything with an <code>asymmetricMatch</code> method), then checks <code>Object.is</code>, then compares by type tag (<code>Object.prototype.toString</code>): Dates by time, RegExps by source and flags, Errors by message, arrays by length and items, Maps and Sets by their entries (order-free for Sets), and plain objects by own enumerable keys including symbol keys. It tracks visited pairs so <b>circular structures</b> do not loop. <code>toStrictEqual</code> adds a type-equality tester (same constructor), a sparse-array tester and an undefined-property tester.</p>
      <p><b>Failure messages are the product.</b> A matcher returns <code>{ pass, message }</code>; the message is a function so the expensive diff is only built when needed. <code>expect.extend({ toBeWithinRange(received, lo, hi) { ... } })</code> lets you add your own; Vitest supports the same API and Jest-compatible custom matchers. In TypeScript you augment the <code>Matchers</code> interface (Vitest: <code>declare module 'vitest' { interface Assertion&lt;T&gt; { ... } }</code>).</p>
      <p><b>Soft assertions and polls.</b> Vitest has <code>expect.soft</code> (keep going after a failure, report all) and <code>expect.poll(fn).toBe(x)</code> (retry until true). Playwright's <code>expect(locator)</code> matchers are <i>web-first</i>: they retry automatically until a timeout. <b>expect.assertions(n)</b> / <b>expect.hasAssertions()</b> guard async tests whose assertions might silently never run.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants write assertions fast but love <code>toBeTruthy()</code> and <code>toBeDefined()</code>, which pass for almost anything, and they paste giant snapshots. Both make a suite green and useless.</p>
      <p><b>Work alongside it:</b> ask <code>Replace every toBeTruthy/toBeDefined with the most specific matcher</code> and <code>For each test, say which bug it would catch</code>. When a generated test fails, read the matcher diff yourself before letting AI "fix" it; often the fix weakens the assertion.</p>
      <p><b>You must still own:</b> choosing toBe vs toEqual vs toStrictEqual, knowing that toEqual ignores undefined, and deciding what the expected value <i>should</i> be, rather than copying what the code currently returns.</p>`,
    problems: [{
      title: 'Build a Tiny expect() with toBe, toEqual, toStrictEqual, toThrow and .not',
      level: 'Medium', tags: ['matchers', 'deep equality', 'Object.is', 'testing'], companies: ['Meta', 'Atlassian', 'Shopify'],
      statement: `<p>Write <code>expect(received)</code> returning an object with <code>toBe</code>, <code>toEqual</code>, <code>toStrictEqual</code> and <code>toThrow</code>, plus a <code>not</code> object with the same four matchers inverted. A failing matcher throws an <code>Error</code> whose message is exactly <code>expect(received).toBe(expected)</code> (or <code>.not.toBe</code>, <code>.toEqual</code>, and so on: the matcher name with <code>(expected)</code>).</p>
        <ul><li><code>toBe</code>: <code>Object.is</code>.</li>
        <li><code>toEqual</code>: recursive; primitives by <code>Object.is</code>; arrays must have the same length; object properties whose value is <code>undefined</code> are ignored; class is ignored.</li>
        <li><code>toStrictEqual</code>: like toEqual, but undefined-valued keys count and both values must have the same prototype.</li>
        <li><code>toThrow(expected?)</code>: received must be a function (otherwise throw <code>Error('received value must be a function')</code>, even under .not); passes when calling it throws and the error matches: no argument = any error, a string = the message contains it, a class = <code>instanceof</code>.</li></ul>`,
      constraints: `Values are JSON-like data plus class instances; nesting depth ≤ 1000; no cycles.`,
      example: `<p><code>expect({ a: 1, b: undefined }).toEqual({ a: 1 })</code> → ${H.c('g', 'passes')}. <code>expect({ a: 1, b: undefined }).toStrictEqual({ a: 1 })</code> → ${H.c('r', 'throws "expect(received).toStrictEqual(expected)"')} because strict mode counts the key b. <code>expect(() =&gt; { throw new TypeError("bad id") }).toThrow("bad")</code> → passes.</p>`,
      brute: { why: `<p>Comparing with <code>JSON.stringify(a) === JSON.stringify(b)</code> looks like deep equality but is wrong in several ways: key order matters (<code>{a:1,b:2}</code> vs <code>{b:2,a:1}</code> fail), <code>NaN</code> and <code>null</code> both become <code>null</code>, <code>-0</code> becomes <code>0</code>, class instances equal plain objects, and Dates become strings.</p>`,
        code: { lang: 'js', run: true, code: `
          const naiveEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
          console.log(naiveEqual({ a: 1, b: 2 }, { b: 2, a: 1 })); // false, but they ARE equal
          console.log(naiveEqual([NaN], [null]));                  // true, but they are NOT
          console.log(naiveEqual(-0, 0));                          // true, Jest says not equal
        ` } },
      mcq: { q: 'Why does a matcher <b>throw</b> instead of returning false?', options: ['So the test function stops at the first failure and the runner can catch the error and report it', 'Because returning false is not allowed in JavaScript', 'Throwing is faster than returning', 'So the next assertion still runs'], answer: 0, explain: 'The runner wraps each test in try/catch. A throw stops the test immediately and carries a message, which is exactly what you want: a returned false would be silently ignored.' },
      hints: [
        `<p>Hint 1: Write one helper <code>equals(a, b, strict)</code> and one <code>check(pass, name)</code> that throws <code>'expect(received).' + name + '(expected)'</code> when pass is wrong for the current mode (normal or not).</p>`,
        `<p>Hint 2: equals: <code>Object.is</code> first; then if either side is not a non-null object, return false; array-ness must match; arrays need equal length; in strict mode compare <code>Object.getPrototypeOf</code>; collect keys (dropping undefined-valued ones unless strict) and recurse.</p>`,
        `<p>Hint 3: Build the matchers with a factory <code>make(isNot)</code> so <code>not</code> is the same code with the pass flag flipped. For toThrow, check the function type first, then try/catch, then compare the caught error with the argument (string → includes, function → instanceof).</p>`
      ],
      solution: {
        approach: `<p>One recursive <code>equals</code> handles both toEqual and toStrictEqual through a <code>strict</code> flag. A factory <code>make(isNot)</code> builds the four matchers once for the normal mode and once for <code>.not</code>; each computes <code>pass</code> and calls <code>check</code>, which throws when <code>pass === isNot</code>.</p>`,
        code: { lang: 'js', run: true, code: `
          function equals(a, b, strict) {
            if (Object.is(a, b)) return true;                       // same primitive or same reference
            if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
            if (Array.isArray(a) !== Array.isArray(b)) return false;
            if (Array.isArray(a) && a.length !== b.length) return false;
            if (strict && Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false; // same class
            const keys = (o) => Object.keys(o).filter((k) => strict || o[k] !== undefined);
            const ka = keys(a), kb = keys(b);
            if (ka.length !== kb.length) return false;
            for (const k of ka) {
              if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
              if (!equals(a[k], b[k], strict)) return false;
            }
            return true;
          }

          function expect(received) {
            function make(isNot) {
              const prefix = 'expect(received).' + (isNot ? 'not.' : '');
              const check = (pass, name) => {
                if (pass === isNot) throw new Error(prefix + name + '(expected)');
              };
              return {
                toBe: (expected) => check(Object.is(received, expected), 'toBe'),
                toEqual: (expected) => check(equals(received, expected, false), 'toEqual'),
                toStrictEqual: (expected) => check(equals(received, expected, true), 'toStrictEqual'),
                toThrow: (expected) => {
                  if (typeof received !== 'function') throw new Error('received value must be a function');
                  let thrown = false, err;
                  try { received(); } catch (e) { thrown = true; err = e; }
                  let pass = thrown;
                  if (thrown && typeof expected === 'string') pass = String(err && err.message).includes(expected);
                  if (thrown && typeof expected === 'function') pass = err instanceof expected;
                  check(pass, 'toThrow');
                }
              };
            }
            const api = make(false);
            api.not = make(true);
            return api;
          }

          const attempt = (fn) => { try { fn(); return 'pass'; } catch (e) { return e.message; } };
          console.log(attempt(() => expect({ a: 1, b: undefined }).toEqual({ a: 1 })));       // pass
          console.log(attempt(() => expect({ a: 1, b: undefined }).toStrictEqual({ a: 1 }))); // expect(received).toStrictEqual(expected)
          console.log(attempt(() => expect([1, 2]).not.toBe([1, 2])));                        // pass
          console.log(attempt(() => expect(() => { throw new TypeError('bad id'); }).toThrow('bad'))); // pass
        ` },
        dry: { head: ['call', 'equals path', 'pass', 'isNot', 'outcome'], rows: [
          ['toEqual({a:1,b:undefined}, {a:1})', 'keys [a] vs [a] → a: Object.is(1,1)', 'true', 'false', 'returns quietly'],
          ['toStrictEqual(same)', 'keys [a,b] vs [a] → count differs', 'false', 'false', H.c('r', 'throws')],
          ['not.toBe([1,2], [1,2])', 'Object.is → false', 'false', 'true', 'returns quietly'],
          ['toThrow("bad")', 'threw TypeError("bad id"), includes "bad"', 'true', 'false', 'returns quietly']
        ] },
        complexity: `<p>equals is O(total size of the two values) time and O(depth) stack. Each matcher is O(1) on top of that.</p>`,
        followUps: ['Add <code>expect.any(Class)</code> as an asymmetric matcher that equals() recognizes.', 'Detect cycles with a stack of visited pairs.', 'Produce a diff (path of the first mismatch) in the failure message.']
      },
      tests: { sig: 'int -> string', fn: 'chk', harness: { js: `
function chk(k) {
  var at = function (fn) { try { fn(); return 'pass'; } catch (e) { return e.message; } };
  function Pt(x) { this.x = x; }
  if (k === 0) return [at(function () { expect(2 + 2).toBe(4); }), at(function () { expect([1]).toBe([1]); }), at(function () { expect(NaN).toBe(NaN); })];
  if (k === 1) return [at(function () { expect({ a: 1, b: undefined }).toEqual({ a: 1 }); }), at(function () { expect({ a: 1, b: undefined }).toStrictEqual({ a: 1 }); })];
  if (k === 2) return [at(function () { expect(0).toEqual(-0); }), at(function () { expect([1, 2]).toEqual([1, 2, undefined]); }), at(function () { expect({ a: [1, { b: 2 }] }).toEqual({ a: [1, { b: 2 }] }); })];
  if (k === 3) return [at(function () { expect(new Pt(1)).toEqual({ x: 1 }); }), at(function () { expect(new Pt(1)).toStrictEqual({ x: 1 }); }), at(function () { expect(new Pt(1)).toStrictEqual(new Pt(1)); })];
  if (k === 4) return [at(function () { expect([1, 2]).not.toBe([1, 2]); }), at(function () { expect(3).not.toBe(3); }), at(function () { expect({ a: 1 }).not.toEqual({ a: 2 }); }), at(function () { expect({ a: 1 }).not.toStrictEqual({ a: 1 }); })];
  if (k === 5) { var bad = function () { throw new TypeError('bad id'); }; return [at(function () { expect(bad).toThrow(); }), at(function () { expect(bad).toThrow('bad'); }), at(function () { expect(bad).toThrow('nope'); }), at(function () { expect(bad).toThrow(TypeError); }), at(function () { expect(bad).toThrow(RangeError); })]; }
  if (k === 6) return [at(function () { expect(function () {}).toThrow(); }), at(function () { expect(function () {}).not.toThrow(); }), at(function () { expect(42).toThrow(); }), at(function () { expect(42).not.toThrow(); })];
  if (k === 7) { var a = 'end', b = 'end'; for (var i = 0; i < 1000; i++) { a = { k: a }; b = { k: b }; } var c = { k: 'END' }; for (var j = 0; j < 999; j++) c = { k: c }; return [at(function () { expect(a).toEqual(b); }), at(function () { expect(a).toEqual(c); })]; }
  if (k === 8) return [at(function () { expect([1, 2]).toEqual({ 0: 1, 1: 2 }); }), at(function () { expect(null).toEqual({}); }), at(function () { expect({}).toEqual({}); })];
}` }, cases: [
        [[0], ['pass', 'expect(received).toBe(expected)', 'pass']],
        [[1], ['pass', 'expect(received).toStrictEqual(expected)']],
        [[2], ['expect(received).toEqual(expected)', 'expect(received).toEqual(expected)', 'pass']],
        [[3], ['pass', 'expect(received).toStrictEqual(expected)', 'pass']],
        [[4], ['pass', 'expect(received).not.toBe(expected)', 'pass', 'expect(received).not.toStrictEqual(expected)']],
        [[5], ['pass', 'pass', 'expect(received).toThrow(expected)', 'pass', 'expect(received).toThrow(expected)']],
        [[6], ['expect(received).toThrow(expected)', 'pass', 'received value must be a function', 'received value must be a function']],
        [[7], ['pass', 'expect(received).toEqual(expected)']],
        [[8], ['expect(received).toEqual(expected)', 'expect(received).toEqual(expected)', 'pass']]
      ] }
    }]
  });

  /* =====================================================================
     TOPIC 2: The test runner: describe/it, setup and teardown, async tests
     ===================================================================== */
  var HOOK_CODE = "beforeAll(() => log('outer beforeAll'));\nbeforeEach(() => log('outer beforeEach'));\nafterEach(() => log('outer afterEach'));\nafterAll(() => log('outer afterAll'));\ntest('outer test N', ...);\ndescribe('inner', () => {\n  beforeEach(() => log('inner beforeEach'));\n  afterEach(() => log('inner afterEach'));\n  test('inner test N', ...);\n});";
  function hookFrames(input) {
    var m = String(input || '').split(',').map(function (s) { return parseInt(s, 10); });
    if (m.length !== 2 || m.some(function (x) { return isNaN(x) || x < 0 || x > 4; })) throw new Error('Type two counts 0..4: outer tests, inner tests (e.g. 2,1)');
    var outer = m[0], inner = m[1], fr = [], log = [];
    fr.push(F('<b>Phase 1, collection.</b> The runner executes every <code>describe</code> body <b>synchronously</b> to build a tree of tests and hooks. No test runs yet. That is why code placed directly inside describe (not in a hook or test) runs before every test, once, at load time.', [C('order.test.js', HOOK_CODE, { 6: 'cur' }), T('Tree: root { ' + outer + ' outer test(s), describe inner { ' + inner + ' test(s) } }')]));
    function step(line, msg, kind) { log.push(msg); fr.push(F(kind, [C('order.test.js', HOOK_CODE, (function () { var h = {}; h[line] = 'cur'; return h; })()), { type: 'array', label: 'log so far', values: log.slice() }])); }
    if (outer + inner === 0) { fr.push(F('No tests at all: Jest and Vitest skip the beforeAll/afterAll hooks of a describe that has no tests.', [{ type: 'array', label: 'log', values: ['(nothing)'] }])); fr.push(F('Add a test to see hooks run.', [T('Try 2,1.')])); fr.push(F('Rule to remember: beforeEach outside-in, afterEach inside-out, beforeAll/afterAll once per block that has tests.', [T('Like nested try/finally blocks.')])); return fr; }
    step(1, 'outer beforeAll', '<b>beforeAll</b> runs once, before the first test of its block. Use it for expensive shared setup (start a server, open a DB).');
    for (var i = 1; i <= outer; i++) {
      step(2, 'outer beforeEach', 'Before <b>outer test ' + i + '</b>: every enclosing beforeEach runs, outermost first.');
      step(5, 'outer test ' + i, 'The test body runs. It gets a fresh state from beforeEach, so it cannot depend on another test.');
      step(3, 'outer afterEach', 'afterEach runs even if the test failed. Put cleanup here (restore mocks, clear the DOM).');
    }
    for (var j = 1; j <= inner; j++) {
      step(2, 'outer beforeEach', 'Entering <b>inner test ' + j + '</b>: the OUTER beforeEach runs first ...');
      step(7, 'inner beforeEach', '... then the inner one. Setup goes outside-in.');
      step(9, 'inner test ' + j, 'The inner test body runs.');
      step(8, 'inner afterEach', 'Teardown goes inside-out: inner afterEach first ...');
      step(3, 'outer afterEach', '... then the outer one. Like nested try/finally blocks.');
    }
    step(4, 'outer afterAll', '<b>afterAll</b> runs once after the last test. ' + (outer + inner) + ' test(s) ran with ' + log.length + ' log lines.');
    return fr;
  }

  topics.push({
    title: 'The Test Runner: Lifecycle, Hooks, Isolation and Async Tests',
    analogy: `<p>A test runner is a <b>restaurant kitchen during service</b>. Before opening, the chef preps once (<b>beforeAll</b>). Before each dish, the station is wiped and set (<b>beforeEach</b>). The dish is cooked (<b>the test</b>). After each dish the station is cleaned (<b>afterEach</b>), even if the dish was burnt. At closing time the kitchen is shut down (<b>afterAll</b>). If one dish reuses yesterday's leftovers (shared state), it might taste fine today and awful tomorrow: that is a test that depends on order.</p>`,
    explain: `<p>🟢 A test file runs in two phases. <b>Collection:</b> the runner executes every <code>describe</code> callback right away to register tests and hooks. <b>Execution:</b> it then runs each test, wrapping it with hooks:</p>
      ${H.table(['hook', 'runs', 'typical use'], [
        ['<code>beforeAll</code>', 'once before the first test in its block', 'start a server, seed a DB, <code>server.listen()</code> for MSW'],
        ['<code>beforeEach</code>', 'before every test, outer blocks first', 'fresh objects, <code>vi.useFakeTimers()</code>, render'],
        ['<code>afterEach</code>', 'after every test (pass or fail), inner blocks first', '<code>vi.restoreAllMocks()</code>, <code>server.resetHandlers()</code>, cleanup'],
        ['<code>afterAll</code>', 'once after the last test in its block', 'close connections, <code>server.close()</code>']
      ])}
      <p><b>Isolation rules:</b> each test must pass alone and in any order. Files run in parallel workers, each with its own module registry, so module-level state does not leak between files, but it <b>does</b> leak between tests in the same file unless you reset it.</p>
      <p><b>Async tests</b> come in three styles: return a promise, use <code>async/await</code>, or (Jest only, legacy) take a <code>done</code> callback. The runner waits for the promise or for <code>done()</code>; if neither happens within the timeout (Jest 5 s, Vitest 5 s by default), the test fails. Forgetting to <code>await</code> or <code>return</code> is the classic bug: the test finishes before the assertion runs and passes vacuously. Vitest does not support <code>done</code> in tests; return a promise instead.</p>
      <p><b>Focus and skip:</b> <code>it.only</code>, <code>it.skip</code>, <code>it.todo</code>, <code>it.each(table)</code> for data-driven tests, <code>describe.concurrent</code> (Vitest) to run tests in a file concurrently.</p>`,
    clues: ['"test passes alone but fails in the full suite" → shared state between tests, missing reset in beforeEach/afterEach', '"in what order do nested hooks run?" → beforeEach outside-in, afterEach inside-out', '"async test always passes" → missing await/return, or assertions never reached (use <code>expect.assertions(n)</code>)', '"Exceeded timeout of 5000 ms" → a promise never settled or done() never called', '"setup is slow" → move it to beforeAll, but only for read-only shared data', '"run the same test with 10 inputs" → <code>it.each</code> / <code>test.each</code>'],
    code: [{ lang: 'js', run: true, title: 'Hook order, measured (runnable mini runner)', code: `
      const log = [];
      const root = { name: 'root', hooks: { beforeAll: [], beforeEach: [], afterEach: [], afterAll: [] }, items: [] };
      let current = root;
      const hook = (kind) => (fn) => current.hooks[kind].push(fn);
      const beforeAll = hook('beforeAll'), beforeEach = hook('beforeEach'), afterEach = hook('afterEach'), afterAll = hook('afterAll');
      function test(name, fn) { current.items.push({ name, fn }); }
      function describe(name, body) {
        const s = { name, hooks: { beforeAll: [], beforeEach: [], afterEach: [], afterAll: [] }, items: [] };
        current.items.push({ suite: s });
        const prev = current; current = s; body(); current = prev;   // collection phase: body runs NOW
      }
      function run(s, chain) {
        chain = chain.concat([s]);
        s.hooks.beforeAll.forEach((h) => h());
        for (const it of s.items) {
          if (it.suite) { run(it.suite, chain); continue; }
          chain.forEach((c) => c.hooks.beforeEach.forEach((h) => h()));          // outside-in
          try { it.fn(); log.push('PASS ' + it.name); } catch (e) { log.push('FAIL ' + it.name); }
          chain.slice().reverse().forEach((c) => c.hooks.afterEach.forEach((h) => h())); // inside-out
        }
        s.hooks.afterAll.forEach((h) => h());
      }

      beforeAll(() => log.push('outer beforeAll'));
      beforeEach(() => log.push('outer beforeEach'));
      afterEach(() => log.push('outer afterEach'));
      test('A', () => {});
      describe('inner', () => {
        log.push('(describe body runs during collection)');
        beforeEach(() => log.push('inner beforeEach'));
        afterEach(() => log.push('inner afterEach'));
        test('B', () => { throw new Error('boom'); });
      });
      run(root, []);
      console.log(log.join('\\n'));
    ` }, { lang: 'js', check: false, title: 'Async tests the right way (Jest / Vitest)', code: `
      import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
      import { fetchUser } from './api.js';

      describe('fetchUser', () => {
        let db;
        beforeEach(() => { db = createTestDb(); });   // fresh state for every test
        afterEach(() => { db.close(); vi.restoreAllMocks(); });

        it('resolves with the user (async/await)', async () => {
          await expect(fetchUser(db, 1)).resolves.toEqual({ id: 1, name: 'Ada' });
        });

        it('rejects for a missing user', async () => {
          expect.assertions(1);                       // guard: fails if the catch never runs
          try { await fetchUser(db, 999); }
          catch (e) { expect(e.message).toMatch(/not found/); }
        });

        // BUG: no await/return, so the test ends before the promise settles and passes vacuously
        it('looks fine but tests nothing', () => {
          fetchUser(db, 999).then((u) => expect(u).toBeNull());
        });

        it.each([
          [1, 'Ada'],
          [2, 'Linus']
        ])('user %i is called %s', async (id, name) => {
          expect((await fetchUser(db, id)).name).toBe(name);
        });
      });
    ` }],
    codeTitle: ['Mini runner', 'Async tests'],
    viz: {
      title: 'Which hook runs when?',
      input: '2,1',
      inputLabel: 'Outer tests, inner tests (0..4 each), e.g. 2,1',
      gen: hookFrames
    },
    examples: [
      { title: 'Predict the log: nested hooks', html: `<p>With one outer test A and one inner test B, the log is ${H.chips(['beforeAll', 'outer before', 'A', 'outer after', 'outer before', 'inner before', 'B', 'inner after', 'outer after', 'afterAll'])}. Rule of thumb: hooks wrap tests like nested <code>try/finally</code> blocks.</p>` },
      { title: 'The order-dependent test', html: `<p>Test 1 pushes into a module-level array, test 2 expects it to have length 1. Run test 2 alone (<code>it.only</code>) and it fails; shuffle (<code>vitest --sequence.shuffle</code>, <code>jest --randomize</code>) and it fails half the time. Fix: create the array in <code>beforeEach</code>.</p>`, code: { lang: 'js', run: true, code: `
        let cart = [];                                    // shared by every test: the bug
        const tests = {
          'adds an item': () => { cart.push('apple'); return cart.length === 1; },
          'has exactly one item': () => cart.length === 1  // only true if the first test ran first
        };
        for (const order of [['adds an item', 'has exactly one item'], ['has exactly one item', 'adds an item']]) {
          cart = [];
          console.log(order.map((n) => n + ': ' + (tests[n]() ? 'PASS' : 'FAIL')).join(' | '));
        }
      ` } },
      { title: 'Forgotten await, visualized', html: `${H.table(['time', 'with await', 'without await'], [['t0', 'test starts', 'test starts'], ['t1', 'waits for promise', 'test function returns → runner marks PASS'], ['t2', 'assertion runs → real result', 'assertion runs after the test ended (ignored or blamed on a later test)']])}<p>Lint rules <code>@vitest/no-floating-promises</code>-style checks, <code>jest/valid-expect</code> and <code>expect.assertions</code> catch this.</p>` }
    ],
    deepDive: `<p>🟣 <b>Jest-circus and Vitest internals.</b> Jest's default runner (<code>jest-circus</code>) builds a tree of <code>describe</code> blocks during collection and then walks it, emitting events (<code>test_start</code>, <code>hook_failure</code>, ...) that reporters consume. A failing <code>beforeAll</code> fails every test in its block; a failing <code>beforeEach</code> skips the test body but afterEach still runs. Vitest has a similar runner (<code>@vitest/runner</code>) and returns cleanup functions from hooks: <code>beforeEach(() =&gt; { const s = start(); return () =&gt; s.stop(); })</code>.</p>
      <p><b>Workers and isolation.</b> Jest runs files in a worker pool (<code>jest-worker</code>), each file in a fresh <code>vm</code> context with its own module registry; <code>--runInBand</code> uses one process (good for debugging). Vitest runs files in <code>forks</code> (child processes, the default since 2.0) or <code>threads</code> (worker_threads), with <code>isolate: true</code> by default; turning isolation off is faster but lets state leak between files. Tests <i>inside</i> a file run sequentially unless you use <code>test.concurrent</code>.</p>
      <p><b>Timeouts and open handles.</b> A test that resolves but leaves a timer or socket open can keep the process alive: Jest prints "did not exit one second after the test run" and <code>--detectOpenHandles</code> finds the culprit. Always close servers in afterAll and use fake timers or <code>unref()</code> for long intervals.</p>`,
    aiEra: `<p><b>What AI changes:</b> generated tests often share a mutable fixture at module level, call async code without awaiting it, and use <code>done</code> in Vitest (not supported). They look plausible and pass.</p>
      <p><b>Work alongside it:</b> ask <code>Make every test independent: move shared state into beforeEach and add cleanup in afterEach</code>, and run the suite with <code>--sequence.shuffle</code> (Vitest) or <code>--randomize</code> (Jest) to prove it.</p>
      <p><b>You must still own:</b> the hook order, what belongs in beforeAll vs beforeEach (read-only vs mutable state), and spotting a test that can pass without its assertion ever running.</p>`,
    problems: [{
      title: 'Mini Test Runner with Nested Hooks, skip and done-style Async Tests',
      level: 'Hard', tags: ['test runner', 'hooks', 'async', 'event loop'], companies: ['Meta', 'Vercel', 'Microsoft'],
      statement: `<p>Write <code>createRunner()</code> returning <code>{ describe, it, beforeAll, beforeEach, afterEach, afterAll, defer, run }</code>.</p>
        <ul><li><code>describe(name, body)</code> runs <code>body</code> immediately (collection) and registers tests and hooks into that block. <code>it(name, fn)</code> registers a test; <code>it.skip(name, fn)</code> registers a skipped one. Items run in declaration order.</li>
        <li><code>run()</code> returns an array of <code>[fullName, status]</code> where fullName joins describe names and the test name with <code>" &gt; "</code>, and status is <code>"pass"</code>, <code>"skip"</code> or <code>"fail: &lt;message&gt;"</code>.</li>
        <li>beforeAll runs once before a block's items (if it throws, every test in that block and its children fails with that message; the block's other hooks still follow normal rules but no test body runs). beforeEach hooks run outer → inner, then the test, then afterEach inner → outer. afterEach always runs; the first error wins. If a beforeEach throws, the test body is skipped. afterAll runs once after the block's items; an error there adds a result <code>[blockName + " &gt; afterAll", "fail: msg"]</code>. Skipped tests run no hooks.</li>
        <li><b>Async:</b> a function declared with one parameter is async and gets <code>done(err?)</code>. Work is scheduled with <code>defer(cb)</code>, which appends to a FIFO queue. After calling an async function, the runner runs queued callbacks until done is called or the queue is empty; empty without done → error <code>"timeout"</code>. An exception thrown by a queued callback fails the current function.</li></ul>`,
      constraints: `Up to 10<sup>4</sup> tests and depth ≤ 50. Hooks and tests are synchronous or done-style; no real timers.`,
      example: `<p>Outer beforeEach logs "oB", inner beforeEach "iB", inner afterEach "iA", outer afterEach "oA". For test <code>inner &gt; x</code> the log is ${H.chips(['oB', 'iB', 'x', 'iA', 'oA'])}. An async test that calls <code>defer(() =&gt; done())</code> passes; one that never calls done gets ${H.c('r', 'fail: timeout')}.</p>`,
      brute: { why: `<p>Running tests as they are declared (no collection phase) means a <code>describe</code>'s beforeEach registered after its first test is missed, hooks cannot wrap tests from outer blocks, and async tests are not awaited, so they "pass" before their assertions run.</p>`,
        code: { lang: 'js', run: true, code: `
          const results = [];
          function itNow(name, fn) {           // runs immediately: no hooks, no waiting
            try { fn(() => {}); results.push([name, 'pass']); } catch (e) { results.push([name, 'fail']); }
          }
          const later = [];
          itNow('async but never checked', (done) => { later.push(() => { throw new Error('too late'); }); });
          console.log(results);                // [ [ 'async but never checked', 'pass' ] ]  (wrong)
        ` } },
      mcq: { q: 'An afterEach hook throws, but the test body already passed. What should the test report?', options: ['Failed, because cleanup errors usually mean leaked state that will poison later tests', 'Passed, hooks do not count', 'Skipped', 'The runner should crash'], answer: 0, explain: 'Jest and Vitest both fail the test when its afterEach throws. Hiding the error would let broken cleanup make later tests flaky.' },
      hints: [
        `<p>Hint 1: Model blocks as <code>{ name, items, beforeAll, beforeEach, afterEach, afterAll }</code>. Keep a <code>current</code> pointer; <code>describe</code> creates a child, sets current, runs the body, restores current.</p>`,
        `<p>Hint 2: Write <code>runFn(fn)</code> returning an Error or null. For <code>fn.length === 1</code> pass a <code>done</code> closure that sets <code>finished</code>, then loop <code>while (!finished &amp;&amp; queue.length) queue.shift()()</code> inside try/catch.</p>`,
        `<p>Hint 3: Recurse with the chain of blocks from root to here and an inherited beforeAll error. For each test: skip → no hooks; inherited error → fail; else beforeEach (stop at first error), body if no error, all afterEach in reverse keeping the first error.</p>`
      ],
      solution: {
        approach: `<p>Collection builds a tree; execution walks it with the chain of ancestors so every test can be wrapped by every enclosing beforeEach/afterEach. One helper, <code>runFn</code>, runs sync or done-style functions and turns any outcome into "error or null", which keeps the hook logic simple. The deferred queue stands in for the event loop so async behaviour is deterministic.</p>`,
        code: { lang: 'js', run: true, code: `
          function createRunner() {
            const mk = (name) => ({ name, items: [], beforeAll: [], beforeEach: [], afterEach: [], afterAll: [] });
            const root = mk('');
            let current = root;
            const queue = [];

            function runFn(fn) {                               // -> Error | null
              try {
                if (fn.length === 0) { fn(); return null; }
                let finished = false, error = null;
                fn((err) => { if (!finished) { finished = true; error = err || null; } });
                while (!finished && queue.length) {
                  const task = queue.shift();
                  try { task(); } catch (e) { finished = true; error = e; }
                }
                return finished ? error : new Error('timeout');
              } catch (e) { return e; }
            }

            function runBlock(block, chain, inherited, results) {
              chain = chain.concat([block]);
              let err = inherited;
              if (!err && block.items.length) for (const h of block.beforeAll) { err = runFn(h); if (err) break; }
              for (const item of block.items) {
                if (item.block) { runBlock(item.block, chain, err, results); continue; }
                const name = chain.map((b) => b.name).filter(Boolean).concat(item.name).join(' > ');
                if (item.skip) { results.push([name, 'skip']); continue; }
                if (err) { results.push([name, 'fail: ' + err.message]); continue; }
                let e = null;
                for (const b of chain) for (const h of b.beforeEach) if (!e) e = runFn(h);   // outer -> inner
                if (!e) e = runFn(item.fn);
                for (const b of chain.slice().reverse()) for (const h of b.afterEach) {       // inner -> outer
                  const e2 = runFn(h); if (!e) e = e2;
                }
                results.push([name, e ? 'fail: ' + e.message : 'pass']);
              }
              if (block.items.length) for (const h of block.afterAll) {
                const e = runFn(h);
                if (e) results.push([(block.name || 'root') + ' > afterAll', 'fail: ' + e.message]);
              }
            }

            const it = (name, fn) => { current.items.push({ name, fn }); };
            it.skip = (name, fn) => { current.items.push({ name, fn, skip: true }); };
            return {
              it,
              describe(name, body) {
                const b = mk(name);
                current.items.push({ block: b });
                const prev = current; current = b;
                try { body(); } finally { current = prev; }
              },
              beforeAll: (fn) => current.beforeAll.push(fn),
              beforeEach: (fn) => current.beforeEach.push(fn),
              afterEach: (fn) => current.afterEach.push(fn),
              afterAll: (fn) => current.afterAll.push(fn),
              defer: (cb) => queue.push(cb),
              run() { const results = []; runBlock(root, [], null, results); return results; }
            };
          }

          const r = createRunner(), log = [];
          r.beforeEach(() => log.push('oB'));
          r.afterEach(() => log.push('oA'));
          r.describe('inner', () => {
            r.beforeEach(() => log.push('iB'));
            r.afterEach(() => log.push('iA'));
            r.it('x', () => log.push('x'));
            r.it('async ok', (done) => r.defer(() => done()));
            r.it('async never', (done) => {});
          });
          console.log(r.run());
          console.log(log.join(' '));
        ` },
        dry: { head: ['step', 'chain', 'action', 'log / result'], rows: [
          ['collect', '[root]', 'describe("inner") runs body now', 'tree built'],
          ['test x', '[root, inner]', 'beforeEach outer → inner', 'oB iB'],
          ['', '', 'body', 'x'],
          ['', '', 'afterEach inner → outer', 'iA oA → pass'],
          ['async ok', '', 'done passed in, queue has 1 task', 'task calls done → pass'],
          ['async never', '', 'queue empty, done not called', H.c('r', 'fail: timeout')]
        ] },
        complexity: `<p>O(T × D) hook calls for T tests at depth D, plus the work of the tests themselves. Memory O(tests + hooks).</p>`,
        followUps: ['Add <code>it.only</code>: if any test is focused, run only focused tests.', 'Support promise-returning tests (needs a real async run()).', 'Add a per-test retry count and report "flaky" when a retry passes.']
      },
      tests: { sig: 'int -> string', fn: 'chk', harness: { js: `
function chk(k) {
  var r = createRunner(), log = [];
  if (k === 0) {
    r.beforeAll(function () { log.push('oBA'); }); r.beforeEach(function () { log.push('oB'); }); r.afterEach(function () { log.push('oA'); }); r.afterAll(function () { log.push('oAA'); });
    r.it('a', function () { log.push('a'); });
    r.describe('in', function () { r.beforeEach(function () { log.push('iB'); }); r.afterEach(function () { log.push('iA'); }); r.it('b', function () { log.push('b'); }); });
    return [r.run(), log];
  }
  if (k === 1) {
    r.afterEach(function () { log.push('clean'); });
    r.it('boom', function () { throw new Error('boom'); });
    r.it('ok', function () {});
    return [r.run(), log];
  }
  if (k === 2) {
    r.describe('db', function () {
      r.beforeAll(function () { throw new Error('no db'); });
      r.afterEach(function () { log.push('A'); });
      r.it('t1', function () { log.push('t1'); });
      r.describe('deep', function () { r.it('t2', function () { log.push('t2'); }); });
    });
    r.it('t3', function () {});
    return [r.run(), log];
  }
  if (k === 3) {
    r.beforeEach(function () { log.push('B1'); throw new Error('setup'); });
    r.beforeEach(function () { log.push('B2'); });
    r.afterEach(function () { log.push('A'); });
    r.it('t', function () { log.push('t'); });
    return [r.run(), log];
  }
  if (k === 4) {
    r.it('ok', function (done) { r.defer(function () { r.defer(function () { done(); }); }); });
    r.it('never', function (done) {});
    r.it('err', function (done) { r.defer(function () { done(new Error('bad')); }); });
    r.it('throwsLater', function (done) { r.defer(function () { throw new Error('late'); }); });
    return r.run();
  }
  if (k === 5) {
    r.beforeEach(function () { log.push('B'); });
    r.it.skip('s', function () { log.push('s'); });
    r.it('t', function () { log.push('t'); });
    r.afterEach(function () { throw new Error('cleanup'); });
    return [r.run(), log];
  }
  if (k === 6) {
    r.describe('empty', function () { r.beforeAll(function () { log.push('never'); }); r.afterAll(function () { log.push('never2'); }); });
    r.describe('s', function () { r.afterAll(function () { throw new Error('teardown'); }); r.it('t', function () {}); });
    return [r.run(), log];
  }
  if (k === 7) {
    var count = 0;
    r.beforeEach(function () { count++; });
    r.describe('big', function () { for (var i = 0; i < 10000; i++) r.it('t' + i, function () {}); });
    var res = r.run();
    return [res.length, count, res[9999][0], res.every(function (x) { return x[1] === 'pass'; })];
  }
  if (k === 8) {
    var b = r;
    function nest(d) { if (d === 0) { b.it('leaf', function () {}); return; } b.describe('d' + d, function () { nest(d - 1); }); }
    nest(3);
    return r.run();
  }
}` }, cases: [
        [[0], [[['a', 'pass'], ['in > b', 'pass']], ['oBA', 'oB', 'a', 'oA', 'oB', 'iB', 'b', 'iA', 'oA', 'oAA']]],
        [[1], [[['boom', 'fail: boom'], ['ok', 'pass']], ['clean', 'clean']]],
        [[2], [[['db > t1', 'fail: no db'], ['db > deep > t2', 'fail: no db'], ['t3', 'pass']], []]],
        [[3], [[['t', 'fail: setup']], ['B1', 'A']]],
        [[4], [['ok', 'pass'], ['never', 'fail: timeout'], ['err', 'fail: bad'], ['throwsLater', 'fail: late']]],
        [[5], [[['s', 'skip'], ['t', 'fail: cleanup']], ['B', 't']]],
        [[6], [[['s > t', 'pass'], ['s > afterAll', 'fail: teardown']], []]],
        [[7], [10000, 10000, 'big > t9999', true]],
        [[8], [['d3 > d2 > d1 > leaf', 'pass']]]
      ] }
    }]
  });

  /* =====================================================================
     TOPIC 3: Mocks, spies and stubs
     ===================================================================== */
  var MOCK_CODE = "const double = vi.fn((x) => {\n  if (x === 'boom') throw new Error('boom');\n  return x * 2;\n});\nfor (const a of args) {\n  try { double(a); } catch {}\n}\nexpect(double).toHaveBeenCalledTimes(args.length);";
  function mockFrames(input) {
    var args = String(input || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    if (!args.length || args.length > 8) throw new Error('Type 1 to 8 comma-separated arguments, e.g. 2, 5, boom');
    var vals = args.map(function (a) { return isNaN(Number(a)) ? a : Number(a); });
    var calls = [], results = [], fr = [];
    fr.push(F('<code>vi.fn(impl)</code> (Jest: <code>jest.fn</code>) returns a <b>function that remembers</b>. It runs your implementation and records every call in <code>double.mock</code>.', [C('mock.test.js', MOCK_CODE, { 1: 'cur' }), V('double.mock', { calls: '[]', results: '[]' })]));
    vals.forEach(function (v, i) {
      calls.push([show(v)]);
      var res;
      if (v === 'boom') res = ['throw', 'Error: boom']; else if (typeof v === 'number') res = ['return', String(v * 2)]; else res = ['return', 'NaN'];
      results.push(res);
      fr.push(F('Call ' + (i + 1) + ': <code>double(' + show(v) + ')</code>. The arguments are appended to <code>mock.calls</code>; the outcome goes to <code>mock.results</code> as <b>' + res[0] + '</b>' + (res[0] === 'throw' ? ' (the error is still thrown to the caller)' : '') + '.', [C('mock.test.js', MOCK_CODE, res[0] === 'throw' ? { 2: 'bad' } : { 3: 'cur' }), TB('double.mock.calls', ['#', 'args'], calls.map(function (c, j) { return [j, c[0]]; }), (function () { var h = {}; h[i] = 'ok'; return h; })()), TB('double.mock.results', ['#', 'type', 'value'], results.map(function (r, j) { return [j, r[0], r[1]]; }), (function () { var h = {}; h[i] = res[0] === 'throw' ? 'bad' : 'ok'; return h; })())]));
    });
    fr.push(F('Assertions read the record: <code>toHaveBeenCalledTimes(' + vals.length + ')</code> passes, <code>toHaveBeenLastCalledWith(' + show(vals[vals.length - 1]) + ')</code> passes, <code>toHaveBeenNthCalledWith(1, ' + show(vals[0]) + ')</code> passes (1-based).', [C('mock.test.js', MOCK_CODE, { 8: 'ok' }), TB('double.mock.calls', ['#', 'args'], calls.map(function (c, j) { return [j, c[0]]; }))]));
    fr.push(F('<code>double.mockClear()</code> empties calls and results but keeps the implementation. <code>mockReset()</code> also drops the implementation (Jest: returns undefined afterwards; Vitest 3: back to the original impl). <code>mockRestore()</code> additionally puts back the original method for spies made with spyOn.', [V('after mockClear()', { calls: '[]', results: '[]', implementation: 'kept' }, { calls: 'done', results: 'done' })]));
    return fr;
  }

  topics.push({
    title: 'Test Doubles: Mocks, Spies, Stubs and Fakes',
    analogy: `<p>Filming a car-crash scene, you do not crash the real star: you use a <b>stunt double</b>. Some doubles only <b>stand in</b> (a <i>dummy</i>), some <b>say scripted lines</b> (a <i>stub</i> returns canned answers), some <b>take notes</b> on everything said to them (a <i>spy</i> records calls), some are <b>strict directors</b> who fail the scene if lines come in the wrong order (a <i>mock</i> with expectations), and some are <b>cheaper working copies</b> (a <i>fake</i>, like an in-memory database). Pick the lightest double that gets the shot.</p>`,
    explain: `<p>🟢 A <b>test double</b> replaces a real dependency so the test is fast, deterministic and focused. In Jest and Vitest one tool does almost all of it: <code>jest.fn()</code> / <code>vi.fn()</code>.</p>
      ${H.table(['kind', 'what it does', 'Jest / Vitest'], [
        ['stub', 'returns canned values', '<code>vi.fn().mockReturnValue(42)</code>, <code>.mockResolvedValue(user)</code>'],
        ['spy', 'records calls, keeps real behaviour', '<code>vi.spyOn(obj, "save")</code>'],
        ['mock', 'stub + you assert on how it was called', '<code>expect(send).toHaveBeenCalledWith("ada@x.io", expect.any(String))</code>'],
        ['fake', 'working lightweight implementation', 'in-memory repo, fake timers, MSW for HTTP'],
        ['dummy', 'placeholder argument never used', '<code>{}</code> or <code>vi.fn()</code>']
      ])}
      <p>Every mock function has <code>.mock.calls</code> (array of argument arrays), <code>.mock.results</code> (<code>{ type: 'return' | 'throw', value }</code>), <code>.mock.instances</code>, <code>.mock.lastCall</code>. Program it with <code>mockReturnValue</code>, <code>mockReturnValueOnce</code> (queue, used first), <code>mockImplementation</code>, <code>mockResolvedValue</code>, <code>mockRejectedValue</code>.</p>
      <p><b>Three resets</b> (interview favourite): <code>mockClear</code> wipes the record; <code>mockReset</code> wipes the record and the programmed behaviour; <code>mockRestore</code> also puts the original method back on a <code>spyOn</code> target. Config flags <code>clearMocks</code>, <code>resetMocks</code>, <code>restoreMocks</code> do this before each test automatically.</p>
      <p><b>Rule of thumb:</b> mock what you do not own and what is slow or random (network, clock, randomness, payment SDK). Do not mock the unit you are testing, and avoid mocking your own small helpers: over-mocking tests the mocks, not the code.</p>`,
    clues: ['"verify the email service was called with ..." → mock function + <code>toHaveBeenCalledWith</code>', '"keep the real method but count calls" → <code>spyOn</code>', '"mock leaks into the next test" → <code>restoreMocks</code> / <code>vi.restoreAllMocks()</code> in afterEach', '"first call fails, second succeeds" → <code>mockRejectedValueOnce(...).mockResolvedValueOnce(...)</code>', '"mockClear vs mockReset vs mockRestore" → record / behaviour / original method', '"tests break on every refactor" → over-mocking internals; mock at the boundary'],
    code: [{ lang: 'js', run: true, title: 'A spy that records calls (runnable)', code: `
      // The heart of jest.fn / vi.fn: a wrapper that writes down every call.
      function fn(impl = () => undefined) {
        const mock = { calls: [], results: [] };
        function mocked(...args) {
          mock.calls.push(args);
          try {
            const value = impl.apply(this, args);
            mock.results.push({ type: 'return', value });
            return value;
          } catch (error) {
            mock.results.push({ type: 'throw', value: error.message });
            throw error;                       // the caller still sees the error
          }
        }
        mocked.mock = mock;
        return mocked;
      }

      const sendEmail = fn((to) => { if (!to.includes('@')) throw new Error('bad address'); return 'queued'; });
      sendEmail('ada@example.com');
      try { sendEmail('nobody'); } catch {}
      console.log(sendEmail.mock.calls);       // [ [ 'ada@example.com' ], [ 'nobody' ] ]
      console.log(sendEmail.mock.results);     // [ { type: 'return', value: 'queued' }, { type: 'throw', value: 'bad address' } ]
    ` }, { lang: 'js', check: false, title: 'Mocks and spies in Vitest (Jest: replace vi with jest)', code: `
      import { describe, it, expect, vi, afterEach } from 'vitest';
      import { checkout } from './checkout.js';
      import * as analytics from './analytics.js';

      afterEach(() => vi.restoreAllMocks());     // put every spied method back

      describe('checkout', () => {
        it('charges the card once and emails a receipt', async () => {
          const charge = vi.fn().mockResolvedValue({ id: 'ch_1', status: 'paid' });   // stub
          const sendReceipt = vi.fn();                                                   // mock
          const track = vi.spyOn(analytics, 'track').mockImplementation(() => {});      // spy, silenced

          await checkout({ total: 30 }, { charge, sendReceipt });

          expect(charge).toHaveBeenCalledTimes(1);
          expect(charge).toHaveBeenCalledWith({ amount: 3000, currency: 'usd' });
          expect(sendReceipt).toHaveBeenCalledWith(expect.objectContaining({ chargeId: 'ch_1' }));
          expect(track).toHaveBeenLastCalledWith('purchase', { total: 30 });
        });

        it('retries once when the card network times out', async () => {
          const charge = vi.fn()
            .mockRejectedValueOnce(new Error('ETIMEDOUT'))
            .mockResolvedValueOnce({ id: 'ch_2', status: 'paid' });
          await checkout({ total: 5 }, { charge, sendReceipt: vi.fn() });
          expect(charge).toHaveBeenCalledTimes(2);
        });
      });
    ` }],
    codeTitle: ['Spy from scratch', 'vi.fn and spyOn'],
    viz: {
      title: 'What a mock function writes down',
      input: '2, 5, boom, 7',
      inputLabel: 'Arguments to call double() with (comma-separated, "boom" throws)',
      gen: mockFrames
    },
    examples: [
      { title: 'mockClear vs mockReset vs mockRestore', html: `${H.table(['method', 'calls/results', 'programmed behaviour', 'original method (spyOn)'], [
        ['<code>mockClear()</code>', H.c('r', 'wiped'), 'kept', 'still replaced'],
        ['<code>mockReset()</code>', H.c('r', 'wiped'), H.c('r', 'removed') + ' (Jest → returns undefined; Vitest 3 → original impl)', 'still replaced'],
        ['<code>mockRestore()</code>', H.c('r', 'wiped'), H.c('r', 'removed'), H.c('g', 'restored')]
      ])}<p>Set <code>restoreMocks: true</code> in config so spies never leak between tests.</p>` },
      { title: 'Dependency injection beats module mocking', html: `<p>If <code>checkout(cart, deps)</code> receives its collaborators as arguments, the test passes <code>vi.fn()</code>s directly: no hoisting magic, no module registry, works the same in Jest, Vitest and plain Node. Module mocking (next topics) is for code you cannot change.</p>`, code: { lang: 'js', run: true, code: `
        function makeGreeter(clock) {                  // the dependency comes in from outside
          return (name) => (clock.hour() < 12 ? 'Good morning, ' : 'Good evening, ') + name;
        }
        const morning = { hour: () => 9 }, evening = { hour: () => 20 };  // hand-written stubs
        console.log(makeGreeter(morning)('Ada'));   // Good morning, Ada
        console.log(makeGreeter(evening)('Ada'));   // Good evening, Ada
      ` } },
      { title: 'Over-mocking smell', html: `<p>A test that mocks <code>validate</code>, <code>format</code> and <code>save</code> and then asserts they were called in order will pass even if <code>format</code> is completely broken, and fail if you merge validate into save. It tests the <b>wiring</b>, not the <b>behaviour</b>. Prefer a fake repository and assert on the saved data.</p>` }
    ],
    deepDive: `<p>🟣 <b>How spyOn works.</b> <code>vi.spyOn(obj, 'm')</code> reads <code>obj.m</code>, replaces the property with a mock that by default calls the original, and remembers the descriptor so <code>mockRestore</code> can put it back. It only intercepts calls that go <b>through the object property</b>. If a module calls its own function directly (<code>export function a() { return b(); }</code>), spying on the namespace's <code>b</code> does not affect that internal call in ESM, because <code>a</code> holds a direct binding to <code>b</code>. That is why spying on ESM exports often "does nothing", and why Vitest refuses to spy on non-configurable ESM namespace properties.</p>
      <p><b>Getters and classes.</b> <code>spyOn(obj, 'prop', 'get')</code> spies on accessors. To mock a class, mock the constructor function: <code>vi.fn(function () { this.save = vi.fn(); })</code> or use module mocking with automock, which replaces every method with a mock returning undefined. <code>mock.instances</code> and <code>mock.contexts</code> record <code>this</code>.</p>
      <p><b>Typing mocks.</b> In TypeScript use <code>vi.mocked(fn)</code> / <code>jest.mocked(fn)</code> to get a typed mock, and <code>vi.fn&lt;(id: number) =&gt; Promise&lt;User&gt;&gt;()</code> to type the signature, so programming a wrong return value is a compile error.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI loves to mock everything, including the function under test's own helpers, and then asserts on call counts. The result is a brittle mirror of the implementation.</p>
      <p><b>Work alongside it:</b> ask <code>Which of these mocks could be replaced by the real code or a fake?</code> and <code>Rewrite this test to assert on outputs and side effects at the boundary only</code>.</p>
      <p><b>You must still own:</b> the decision of where the boundary is, the reset strategy (clear/reset/restore), and noticing when a mock's canned value hides a bug the real dependency would expose.</p>`,
    problems: [{
      title: 'Implement a Mock Function: calls, results, mockImplementation, mockClear, mockReset',
      level: 'Medium', tags: ['mock', 'spy', 'closures', 'testing'], companies: ['Google', 'Stripe', 'Airbnb'],
      statement: `<p>Write <code>fn(impl?)</code> returning a callable mock. Calling it records the argument array in <code>mock.calls</code> and the outcome in <code>mock.results</code> as <code>{ type: 'return', value }</code> or <code>{ type: 'throw', value: error }</code> (the error is rethrown). It also forwards <code>this</code>. Add methods (each returns the mock, for chaining):</p>
        <ul><li><code>mockImplementation(f)</code>: use f from now on.</li><li><code>mockReturnValue(v)</code>: same as <code>mockImplementation(() =&gt; v)</code>.</li><li><code>mockClear()</code>: empty calls and results, keep the implementation.</li><li><code>mockReset()</code>: mockClear and drop the implementation (Jest style: returns undefined).</li></ul>
        <p>Also expose <code>mock.lastCall</code> (the last argument array, or <code>undefined</code>) as a getter.</p>`,
      constraints: `Up to 10<sup>5</sup> calls. The original <code>impl</code> may be undefined (then the mock returns undefined).`,
      example: `<p><code>const m = fn((a, b) =&gt; a + b); m(1, 2); m(3, 4);</code> → <code>m.mock.calls</code> = ${H.c('b', '[[1,2],[3,4]]')}, results values ${H.c('g', '[3, 7]')}, <code>m.mock.lastCall</code> = [3,4]. After <code>m.mockReset()</code>, <code>m(1, 2)</code> returns ${H.c('r', 'undefined')} and calls has one entry.</p>`,
      brute: { why: `<p>A global array of calls shared by all mocks mixes up records between functions, and storing only arguments (not results) makes it impossible to assert that a call threw. Recording <code>arguments</code> by reference is also a bug if the caller later mutates its array.</p>`,
        code: { lang: 'js', run: true, code: `
          const ALL_CALLS = [];                          // one shared log: every mock writes here
          const naiveFn = (impl) => (...args) => { ALL_CALLS.push(args); return impl(...args); };
          const a = naiveFn((x) => x), b = naiveFn((x) => x * 2);
          a(1); b(2);
          console.log(ALL_CALLS);                        // [[1],[2]]: which mock got which call?
        ` } },
      mcq: { q: 'After <code>m.mockClear()</code>, what does <code>m(5)</code> return if m was <code>fn(x =&gt; x * 10)</code>?', options: ['50, the implementation is kept', 'undefined', 'It throws', '5'], answer: 0, explain: 'mockClear only empties the record (calls/results). mockReset would also drop the implementation.' },
      hints: [
        `<p>Hint 1: Keep state in a closure: <code>let current = impl</code> and an object <code>mock = { calls: [], results: [] }</code> attached as a property of the returned function.</p>`,
        `<p>Hint 2: Use a regular <code>function mocked(...args)</code> (not an arrow) so you can call <code>current.apply(this, args)</code>. Push to calls before running so a throwing call is still counted.</p>`,
        `<p>Hint 3: Clear by assigning new empty arrays (or setting length = 0). Reset = clear + <code>current = undefined</code>. Define lastCall with <code>Object.defineProperty(mock, 'lastCall', { get })</code>. Return <code>mocked</code> from every method.</p>`
      ],
      solution: {
        approach: `<p>A closure holds the current implementation and the record. The returned function records arguments, runs the implementation with the same <code>this</code>, records the outcome and rethrows errors. Methods mutate the closure and return the same function for chaining.</p>`,
        code: { lang: 'js', run: true, code: `
          function fn(impl) {
            let current = impl;
            const mock = { calls: [], results: [] };
            Object.defineProperty(mock, 'lastCall', {
              get: () => (mock.calls.length ? mock.calls[mock.calls.length - 1] : undefined)
            });
            function mocked(...args) {
              mock.calls.push(args);                       // record first: throwing calls count too
              try {
                const value = current ? current.apply(this, args) : undefined;
                mock.results.push({ type: 'return', value });
                return value;
              } catch (error) {
                mock.results.push({ type: 'throw', value: error });
                throw error;
              }
            }
            mocked.mock = mock;
            mocked.mockImplementation = (f) => { current = f; return mocked; };
            mocked.mockReturnValue = (v) => mocked.mockImplementation(() => v);
            mocked.mockClear = () => { mock.calls.length = 0; mock.results.length = 0; return mocked; };
            mocked.mockReset = () => { mocked.mockClear(); current = undefined; return mocked; };
            return mocked;
          }

          const m = fn((a, b) => a + b);
          m(1, 2); m(3, 4);
          console.log(m.mock.calls, m.mock.results.map((r) => r.value), m.mock.lastCall); // [[1,2],[3,4]] [3,7] [3,4]
          m.mockReset();
          console.log(m(1, 2), m.mock.calls.length);                                       // undefined 1
        ` },
        dry: { head: ['action', 'calls', 'results', 'returns'], rows: [
          ['m(1, 2)', '[[1,2]]', '[return 3]', '3'],
          ['m(3, 4)', '[[1,2],[3,4]]', '[return 3, return 7]', '7'],
          ['m.mockReset()', '[]', '[]', 'm (chain)'],
          ['m(1, 2)', '[[1,2]]', '[return undefined]', 'undefined']
        ] },
        complexity: `<p>O(1) per call plus storing the arguments: O(calls) memory, which is why huge loops with mocks can be slow.</p>`,
        followUps: ['Add <code>mockReturnValueOnce</code> with a FIFO queue (see the practice arena).', 'Record <code>this</code> in <code>mock.contexts</code>.', 'Write <code>spyOn(obj, key)</code> on top of fn with <code>mockRestore</code>.']
      },
      tests: { sig: 'int -> string', fn: 'chk', harness: { js: `
function chk(k) {
  if (k === 0) { var m = fn(function (a, b) { return a + b; }); m(1, 2); m(3, 4); return [m.mock.calls, m.mock.results, m.mock.lastCall]; }
  if (k === 1) { var e = fn(); return [e(), e(1), e.mock.calls, e.mock.lastCall === undefined ? 'has' : 'none']; }
  if (k === 2) { var z = fn(); return [z.mock.lastCall === undefined, z.mock.calls.length]; }
  if (k === 3) { var t = fn(function (x) { if (x < 0) throw new Error('neg'); return x; }), out = []; try { t(-1); } catch (er) { out.push(er.message); } t(2); return [out, t.mock.calls, t.mock.results.map(function (r) { return [r.type, r.type === 'throw' ? r.value.message : r.value]; })]; }
  if (k === 4) { var c = fn(function (x) { return x * 10; }); c(1); var same = c.mockClear() === c; return [same, c.mock.calls.length, c(5), c.mock.calls]; }
  if (k === 5) { var r = fn(function () { return 'impl'; }); r(); r.mockReset(); return [r(), r.mock.calls.length, r.mock.results]; }
  if (k === 6) { var ch = fn().mockReturnValue(7); var a = ch(), b = ch(1); ch.mockImplementation(function (x) { return -x; }); return [a, b, ch(3)]; }
  if (k === 7) { var obj = { base: 10, add: fn(function (x) { return this.base + x; }) }; return obj.add(5); }
  if (k === 8) { var big = fn(function (i) { return i * 2; }); for (var i = 0; i < 100000; i++) big(i); return [big.mock.calls.length, big.mock.results[99999].value, big.mock.lastCall]; }
  if (k === 9) { var mut = fn(), arr = [1]; mut(arr); arr.push(2); return mut.mock.calls; }
}` }, cases: [
        [[0], [[[1, 2], [3, 4]], [{ type: 'return', value: 3 }, { type: 'return', value: 7 }], [3, 4]]],
        [[1], [null, null, [[], [1]], 'none']],
        [[2], [true, 0]],
        [[3], [['neg'], [[-1], [2]], [['throw', 'neg'], ['return', 2]]]],
        [[4], [true, 0, 50, [[5]]]],
        [[5], [null, 1, [{ type: 'return', value: null }]]],
        [[6], [7, 7, -3]],
        [[7], 15],
        [[8], [100000, 199998, [99999]]],
        [[9], [[[1, 2]]]]
      ] }
    }]
  });

  /* =====================================================================
     TOPIC 4: Fake timers and testing async code
     ===================================================================== */
  function timerFrames(input) {
    var parts = String(input || '').split('|');
    if (parts.length !== 2) throw new Error('Format: name@delay, name@delay | advanceMs   e.g. a@100, b@50 | 120');
    var adv = parseInt(parts[1], 10);
    var specs = parts[0].split(',').map(function (s) { return s.trim(); }).filter(Boolean).map(function (s) { var m = s.split('@'); return { name: m[0].trim(), delay: parseInt(m[1], 10) }; });
    if (isNaN(adv) || adv < 0 || adv > 100000 || !specs.length || specs.length > 8 || specs.some(function (t) { return !t.name || isNaN(t.delay) || t.delay < 0; })) throw new Error('Format: name@delay, name@delay | advanceMs (up to 8 timers, delays ≥ 0)');
    var now = 0, timers = specs.map(function (t, i) { return { id: i + 1, name: t.name, at: t.delay }; }), fired = [], fr = [];
    var tbl = function () { return TB('pending timers (fake clock)', ['id', 'callback', 'fires at'], timers.map(function (t) { return [t.id, t.name, t.at + ' ms']; })); };
    fr.push(F('<code>vi.useFakeTimers()</code> (Jest: <code>jest.useFakeTimers()</code>) swaps <code>setTimeout</code>, <code>setInterval</code>, <code>Date</code> and friends for a <b>virtual clock</b>. Scheduling a timer just writes it in a list; <b>nothing runs</b> and no real time passes.', [V('clock', { now: '0 ms' }), tbl(), { type: 'array', label: 'fired', values: ['(nothing)'] }]));
    fr.push(F('You call <code>vi.advanceTimersByTime(' + adv + ')</code>. The clock will move to <b>' + adv + ' ms</b>, firing every timer due on the way, <b>earliest first</b>; ties fire in the order they were created.', [V('clock', { now: '0 ms', target: adv + ' ms' }, { target: 'cur' }), tbl()]));
    while (true) {
      var due = timers.filter(function (t) { return t.at <= adv; }).sort(function (a, b) { return a.at - b.at || a.id - b.id; });
      if (!due.length) break;
      var t = due[0]; now = t.at; timers = timers.filter(function (x) { return x !== t; }); fired.push(t.name + ' @' + t.at);
      fr.push(F('Jump the clock straight to <b>' + t.at + ' ms</b> (no waiting) and run <code>' + esc(t.name) + '</code>. Inside the callback, <code>Date.now()</code> reads ' + t.at + '.', [V('clock', { now: now + ' ms', target: adv + ' ms' }, { now: 'ok' }), tbl(), { type: 'array', label: 'fired', values: fired.slice(), hl: (function () { var h = {}; h[fired.length - 1] = 'ok'; return h; })() }]));
    }
    fr.push(F('No timer is due before ' + adv + ' ms any more, so the clock parks at <b>' + adv + ' ms</b>. ' + (timers.length ? timers.length + ' timer(s) still wait for a later advance.' : 'All timers ran.') + ' A 10-minute debounce now takes 0 real milliseconds to test.', [V('clock', { now: adv + ' ms' }, { now: 'sel' }), tbl(), { type: 'array', label: 'fired', values: fired.length ? fired.slice() : ['(nothing)'] }]));
    fr.push(F('Remember: <code>advanceTimersByTime</code> only runs <b>timers</b>. Promise callbacks (microtasks) queued by those timers run when the test awaits. Use the async variant <code>await vi.advanceTimersByTimeAsync(ms)</code> when timers and promises interleave, and call <code>vi.useRealTimers()</code> in afterEach.', [T('timers → macrotask list (faked) · promises → microtask queue (real)')]));
    return fr;
  }

  topics.push({
    title: 'Fake Timers and Testing Async Code',
    analogy: `<p>Testing a "remind me in 10 minutes" feature by actually waiting 10 minutes is silly. Instead you become the <b>clockmaker</b>: you freeze every clock in the building, then turn the hands forward by hand. "Advance 10 minutes" and the alarm rings instantly. <b>Fake timers</b> give your test that power. Promises are like the post office: letters (microtasks) are only delivered when you step outside (<code>await</code>), so even a clockmaker must pause and let the mail through.</p>`,
    explain: `<p>🟢 Code with <code>setTimeout</code>, <code>setInterval</code>, debounce, retry backoff, polling or <code>Date.now()</code> is slow and flaky to test with real time. Fake timers replace these globals with a <b>virtual clock</b> you control:</p>
      ${H.table(['Vitest', 'Jest', 'what it does'], [
        ['<code>vi.useFakeTimers()</code>', '<code>jest.useFakeTimers()</code>', 'install the fake clock (setTimeout, setInterval, Date, performance...)'],
        ['<code>vi.advanceTimersByTime(ms)</code>', '<code>jest.advanceTimersByTime(ms)</code>', 'move time forward, firing due timers in order'],
        ['<code>vi.runAllTimers()</code>', '<code>jest.runAllTimers()</code>', 'fire until no timers remain (guards against infinite loops)'],
        ['<code>vi.runOnlyPendingTimers()</code>', '<code>jest.runOnlyPendingTimers()</code>', 'fire only timers that exist now (safe with setInterval)'],
        ['<code>await vi.advanceTimersByTimeAsync(ms)</code>', '<code>await jest.advanceTimersByTimeAsync(ms)</code>', 'same, but flushes promises between timers'],
        ['<code>vi.setSystemTime(date)</code>', '<code>jest.setSystemTime(date)</code>', 'pretend "now" is a fixed date'],
        ['<code>vi.useRealTimers()</code>', '<code>jest.useRealTimers()</code>', 'restore (do it in afterEach)']
      ])}
      <p><b>Async rules of thumb:</b> <code>await</code> or <code>return</code> every promise in a test; use <code>await expect(p).resolves.toBe(x)</code> / <code>.rejects.toThrow()</code>; never use real <code>sleep</code> to "wait long enough". When code awaits a promise <i>and then</i> sets a timer, the sync <code>advanceTimersByTime</code> may fire too early, before the promise chain scheduled the timer: switch to the <code>...Async</code> variants.</p>
      <p><b>Under the hood</b> both Jest ("modern" timers, the default since Jest 27) and Vitest use <code>@sinonjs/fake-timers</code>. Vitest does not fake <code>process.nextTick</code> or <code>queueMicrotask</code> unless you list them in <code>toFake</code>.</p>`,
    clues: ['"debounce / throttle / retry with backoff / polling" → fake timers + advanceTimersByTime', '"test takes 30 seconds because of setTimeout" → fake timers', '"timer callback never ran even after advancing" → it was scheduled after an await: use advanceTimersByTimeAsync', '"runAllTimers hangs or aborts" → a setInterval reschedules forever: use runOnlyPendingTimers', '"expiry / today / birthday logic" → <code>setSystemTime</code>', '"async test passes even when broken" → missing await, use <code>.resolves/.rejects</code> or expect.assertions'],
    code: [{ lang: 'js', run: true, title: 'A virtual clock in 25 lines (runnable)', code: `
      function createClock() {
        let now = 0, nextId = 1;
        const timers = new Map();                         // id -> { id, at, cb }
        const earliest = (limit) => {
          let best = null;
          for (const t of timers.values())
            if (t.at <= limit && (!best || t.at < best.at || (t.at === best.at && t.id < best.id))) best = t;
          return best;
        };
        return {
          now: () => now,
          setTimeout(cb, ms) { const id = nextId++; timers.set(id, { id, at: now + Math.max(0, ms), cb }); return id; },
          clearTimeout(id) { timers.delete(id); },
          advanceTimersByTime(ms) {
            const target = now + ms;
            for (let t; (t = earliest(target)); ) { timers.delete(t.id); now = t.at; t.cb(); }
            now = target;
          }
        };
      }

      // A debounced save: only the LAST call within 300 ms should run.
      const clock = createClock();
      function debounce(fn, wait) {
        let id = null;
        return (...args) => { clock.clearTimeout(id); id = clock.setTimeout(() => fn(...args), wait); };
      }
      const saved = [];
      const save = debounce((text) => saved.push(text + ' @' + clock.now()), 300);
      save('h'); clock.advanceTimersByTime(100);
      save('he'); clock.advanceTimersByTime(100);
      save('hey');
      clock.advanceTimersByTime(299); console.log(saved);   // []  not yet
      clock.advanceTimersByTime(1);   console.log(saved);   // [ 'hey @500' ]
    ` }, { lang: 'js', check: false, title: 'Fake timers in Vitest (Jest: jest.*)', code: `
      import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
      import { debounce } from './debounce.js';
      import { fetchWithRetry } from './retry.js';

      beforeEach(() => { vi.useFakeTimers(); });
      afterEach(() => { vi.useRealTimers(); });

      it('debounce calls once with the last value', () => {
        const spy = vi.fn();
        const d = debounce(spy, 300);
        d('a'); d('b'); d('c');
        vi.advanceTimersByTime(299);
        expect(spy).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(spy).toHaveBeenCalledExactlyOnceWith('c');   // Vitest 3; Jest: toHaveBeenCalledTimes(1) + toHaveBeenCalledWith
      });

      it('retries with exponential backoff (timers AND promises)', async () => {
        const request = vi.fn()
          .mockRejectedValueOnce(new Error('503'))
          .mockRejectedValueOnce(new Error('503'))
          .mockResolvedValue('ok');
        const p = fetchWithRetry(request, { base: 1000 });   // waits 1000, then 2000 ms
        await vi.advanceTimersByTimeAsync(3000);              // flushes promises between timers
        await expect(p).resolves.toBe('ok');
        expect(request).toHaveBeenCalledTimes(3);
      });

      it('knows what day it is', () => {
        vi.setSystemTime(new Date('2026-02-28T12:00:00Z'));
        expect(new Date().getUTCDate()).toBe(28);
      });
    ` }],
    codeTitle: ['Virtual clock', 'Fake timers in Vitest'],
    viz: {
      title: 'Advancing a fake clock',
      input: 'a@100, b@50, c@100, d@300 | 120',
      inputLabel: 'Timers as name@delay, then | and how far to advance (ms)',
      gen: timerFrames
    },
    examples: [
      { title: 'Why the timer did not fire: await before setTimeout', html: `<p><code>async function poll() { await check(); setTimeout(poll, 1000); }</code>. The test calls <code>poll()</code> then <code>vi.advanceTimersByTime(1000)</code> synchronously. At that moment <code>check()</code>'s promise has not resolved, so <code>setTimeout</code> has <b>not been called yet</b>: nothing is pending, nothing fires. ${H.c('g', 'Fix')}: <code>await vi.advanceTimersByTimeAsync(1000)</code>, which lets microtasks run between steps.</p>`, code: { lang: 'js', run: true, code: `
        const pending = [];                           // our fake timer list
        const fakeSetTimeout = (cb) => pending.push(cb);
        async function poll() { await Promise.resolve('checked'); fakeSetTimeout(() => {}); }
        poll();
        console.log('timers right after poll():', pending.length);       // 0: still waiting on the await
        Promise.resolve().then(() => console.log('after microtasks:', pending.length)); // 1
      ` } },
      { title: 'runAllTimers vs runOnlyPendingTimers with setInterval', html: `${H.table(['call', 'interval that reschedules itself'], [['<code>runAllTimers()</code>', H.c('r', 'keeps firing until the loop limit, then throws "Aborting after running N timers"')], ['<code>runOnlyPendingTimers()</code>', H.c('g', 'fires the timers that exist now, once; new ones wait')], ['<code>advanceTimersByTime(5000)</code>', H.c('g', 'fires exactly the ticks within 5 s')]])}` },
      { title: 'Promise assertions cheat sheet', html: `${H.table(['goal', 'write'], [['resolves to a value', '<code>await expect(p).resolves.toEqual(x)</code>'], ['rejects with a message', '<code>await expect(p).rejects.toThrow("boom")</code>'], ['make sure a catch block ran', '<code>expect.assertions(1)</code> at the top'], ['wait for something to become true', '<code>await vi.waitFor(() =&gt; expect(x).toBe(1))</code> (Vitest), RTL <code>waitFor</code>']])}<p>Note the <code>await</code> in front of <code>expect(...).resolves</code>: without it the assertion is a floating promise.</p>` }
    ],
    deepDive: `<p>🟣 <b>How fake timers work.</b> <code>@sinonjs/fake-timers</code> installs replacement globals backed by a sorted list of timer records <code>{ id, callAt, func, args, interval? }</code>. <code>tick(ms)</code> repeatedly takes the earliest timer with <code>callAt ≤ target</code>, sets the clock to <code>callAt</code>, runs it (re-inserting intervals at <code>callAt + interval</code>), and finally sets the clock to the target. Timers created during a tick that fall inside the window also fire. <code>runAll</code> stops after a loop limit (Jest's <code>timerLimit</code> option, 100 000 by default) to catch infinite rescheduling. The async variants <code>await</code> a resolved promise between timers so pending microtasks run.</p>
      <p><b>What is faked:</b> Jest fakes <code>Date</code>, <code>setTimeout</code>/<code>setInterval</code>/<code>setImmediate</code> and their clears, <code>process.nextTick</code>, <code>queueMicrotask</code>, <code>requestAnimationFrame</code>, <code>performance.now</code> and more; use <code>doNotFake: ['nextTick']</code> to keep some real. Vitest's default <code>toFake</code> list leaves <code>nextTick</code> and <code>queueMicrotask</code> real. Faking <code>nextTick</code> can deadlock libraries that rely on it, a common source of "my test hangs".</p>
      <p><b>Promises are never faked.</b> Native promise jobs live in the engine's microtask queue, which fake timers cannot control; only <code>await</code> drains it. That is why <code>flushPromises = () =&gt; new Promise(r =&gt; setImmediate(r))</code> exists in older codebases (with fake timers, prefer the async advance helpers). Libraries using real time internally (some HTTP clients' timeouts) may also need <code>shouldAdvanceTime: true</code>.</p>`,
    aiEra: `<p><b>What AI changes:</b> generated tests often "wait" with <code>await new Promise(r =&gt; setTimeout(r, 500))</code>, which is slow and flaky, or mix fake timers with real network calls and hang.</p>
      <p><b>Work alongside it:</b> ask <code>Rewrite these tests with fake timers; no real waiting allowed; use the async advance helper where promises and timers interleave</code>. Then lower the debounce to 1 ms in the code and check that the tests still describe the intended timing.</p>
      <p><b>You must still own:</b> the difference between macrotasks (faked) and microtasks (not faked), and choosing between runAllTimers, runOnlyPendingTimers and advanceTimersByTime.</p>`,
    problems: [{
      title: 'Build a Fake Clock: setTimeout, clearTimeout, advanceTimersByTime, runAllTimers',
      level: 'Medium', tags: ['fake timers', 'scheduler', 'event loop', 'testing'], companies: ['Google', 'Uber', 'Netflix'],
      statement: `<p>Write <code>createFakeClock()</code> returning <code>{ now, setTimeout, clearTimeout, advanceTimersByTime, runAllTimers, getTimerCount }</code>, starting at time 0.</p>
        <ul><li><code>setTimeout(cb, ms, ...args)</code> returns increasing ids from 1; a negative or missing delay counts as 0. The callback receives <code>args</code>.</li>
        <li><code>advanceTimersByTime(ms)</code> fires every timer due at or before <code>now + ms</code>, earliest first, ties by id. Before each callback the clock is set to that timer's time; timers created by callbacks that fall in the window fire too. Afterwards <code>now()</code> is exactly the target.</li>
        <li><code>runAllTimers()</code> fires timers until none remain, moving the clock to each one; if more than 1000 timers fire in one call, throw <code>Error('Aborting after running 1000 timers')</code>.</li>
        <li><code>clearTimeout(id)</code> cancels (unknown ids are ignored); <code>getTimerCount()</code> is the number pending.</li></ul>`,
      constraints: `Up to 3000 timers alive at once; delays up to 10<sup>9</sup> ms.`,
      example: `<p>Timers a@100, b@50, c@100, then <code>advanceTimersByTime(120)</code> → fires ${H.chips(['b @50', 'a @100', 'c @100'])} (a before c: same time, smaller id) and <code>now()</code> = ${H.c('g', '120')}.</p>`,
      brute: { why: `<p>Advancing one millisecond at a time and checking every timer works but costs O(ms × timers): advancing a 10-minute debounce is 600 000 steps per timer. Jumping straight to the next due time skips all the empty milliseconds.</p>`,
        code: { lang: 'js', run: true, code: `
          function advanceSlow(state, ms) {
            for (let i = 0; i < ms; i++) {                 // one tick per millisecond: wasteful
              state.now++;
              for (const t of state.timers.filter((t) => t.at === state.now)) { t.cb(); state.timers.splice(state.timers.indexOf(t), 1); }
            }
          }
          const st = { now: 0, timers: [{ at: 600000, cb: () => console.log('fired after 600000 loop steps') }] };
          advanceSlow(st, 600000);
        ` } },
      mcq: { q: 'A callback at 10 ms schedules another timer with delay 0. You called advanceTimersByTime(10). Does the new timer fire?', options: ['Yes, it is due at 10 ms, which is inside the window', 'No, timers created during a tick always wait for the next advance', 'Only with runAllTimers', 'It depends on the real clock'], answer: 0, explain: 'The new timer is due at now (10) + 0 = 10 ≤ target 10, so the loop picks it up. This matches sinon fake timers.' },
      hints: [
        `<p>Hint 1: Store timers in a Map id → <code>{ id, at, cb, args }</code>. <code>at = now + max(0, ms || 0)</code>.</p>`,
        `<p>Hint 2: Write <code>earliest(limit)</code> that returns the timer with the smallest (at, id) among those with <code>at ≤ limit</code>. advance = loop: take earliest(target), delete it, set now = at, call it.</p>`,
        `<p>Hint 3: Re-query earliest after every callback because callbacks can add or clear timers. runAllTimers = earliest(Infinity) in a loop with a counter. Set now = target at the end of advance.</p>`
      ],
      solution: {
        approach: `<p>A map of pending timers plus a "pick the earliest due" helper. Advancing is a loop that jumps the clock to the next due timer instead of ticking, so cost depends on the number of timers, not on milliseconds. Re-scanning after each callback handles timers added or cleared by callbacks.</p>`,
        code: { lang: 'js', run: true, code: `
          function createFakeClock() {
            let now = 0, nextId = 1;
            const timers = new Map();
            function earliest(limit) {
              let best = null;
              for (const t of timers.values())
                if (t.at <= limit && (!best || t.at < best.at || (t.at === best.at && t.id < best.id))) best = t;
              return best;
            }
            function fire(t) { timers.delete(t.id); now = t.at; t.cb(...t.args); }
            return {
              now: () => now,
              setTimeout(cb, ms, ...args) {
                const delay = Number(ms) > 0 ? Number(ms) : 0;
                const id = nextId++;
                timers.set(id, { id, at: now + delay, cb, args });
                return id;
              },
              clearTimeout(id) { timers.delete(id); },
              advanceTimersByTime(ms) {
                const target = now + ms;
                for (let t = earliest(target); t; t = earliest(target)) fire(t);
                now = target;
              },
              runAllTimers() {
                let count = 0;
                while (timers.size) {
                  if (++count > 1000) throw new Error('Aborting after running 1000 timers');
                  fire(earliest(Infinity));
                }
              },
              getTimerCount: () => timers.size
            };
          }

          const clock = createFakeClock(), log = [];
          clock.setTimeout(() => log.push('a@' + clock.now()), 100);
          clock.setTimeout(() => log.push('b@' + clock.now()), 50);
          clock.setTimeout(() => log.push('c@' + clock.now()), 100);
          clock.advanceTimersByTime(120);
          console.log(log, clock.now());   // [ 'b@50', 'a@100', 'c@100' ] 120
        ` },
        dry: { head: ['step', 'pending (id:at)', 'picked', 'now', 'log'], rows: [
          ['start, target 120', '1:100, 2:50, 3:100', '-', '0', '[]'],
          ['earliest ≤ 120', '1:100, 3:100', '2 (50)', '50', '[b@50]'],
          ['earliest ≤ 120', '3:100', '1 (100, smaller id)', '100', '[b@50, a@100]'],
          ['earliest ≤ 120', '-', '3 (100)', '100', '[b, a, c]'],
          ['none due', '-', '-', '120', 'done']
        ] },
        complexity: `<p>O(T) per fired timer with the linear scan, O(T²) to drain T timers. A binary heap keyed by (at, id) makes it O(log T) each, which is what sinon effectively achieves with its sorted structure.</p>`,
        followUps: ['Add <code>setInterval</code> (re-insert at at + interval) and <code>runOnlyPendingTimers</code>.', 'Add <code>setSystemTime</code> that shifts Date.now() without firing timers.', 'Replace the scan with a binary heap.']
      },
      tests: { sig: 'int -> string', fn: 'chk', harness: { js: `
function chk(k) {
  var c = createFakeClock(), log = [];
  var rec = function (n) { return function () { log.push(n + '@' + c.now()); }; };
  if (k === 0) { c.setTimeout(rec('a'), 100); c.setTimeout(rec('b'), 50); c.setTimeout(rec('c'), 100); c.advanceTimersByTime(120); return [log, c.now(), c.getTimerCount()]; }
  if (k === 1) { c.setTimeout(function () { log.push('a@' + c.now()); c.setTimeout(rec('b'), 5); c.setTimeout(rec('z'), 0); }, 10); c.advanceTimersByTime(12); var mid = log.slice(); c.advanceTimersByTime(3); return [mid, log, c.now()]; }
  if (k === 2) { var id = c.setTimeout(rec('x'), 10); c.clearTimeout(id); c.clearTimeout(999); var id2 = c.setTimeout(rec('y'), 10); c.advanceTimersByTime(100); return [id, id2, log, c.getTimerCount()]; }
  if (k === 3) { c.setTimeout(rec('neg'), -5); c.setTimeout(rec('none')); c.advanceTimersByTime(0); return [log, c.now()]; }
  if (k === 4) { c.setTimeout(function (a, b) { log.push(a + b); }, 5, 2, 3); c.advanceTimersByTime(5); return log; }
  if (k === 5) { c.setTimeout(function () { log.push(c.now()); c.setTimeout(function () { log.push(c.now()); c.setTimeout(function () { log.push(c.now()); }, 30); }, 20); }, 10); c.runAllTimers(); return [log, c.now(), c.getTimerCount()]; }
  if (k === 6) { var loop = function () { c.setTimeout(loop, 1); }; c.setTimeout(loop, 1); try { c.runAllTimers(); return 'no error'; } catch (e) { return [e.message, c.now()]; } }
  if (k === 7) { c.setTimeout(rec('t'), 100); c.advanceTimersByTime(99); var before = [log.length, c.getTimerCount()]; c.advanceTimersByTime(1); return [before, log, c.getTimerCount()]; }
  if (k === 8) { var fired = []; for (var i = 0; i < 3000; i++) (function (j) { c.setTimeout(function () { fired.push([c.now(), j]); }, (j * 7) % 1000); })(i); c.advanceTimersByTime(1000); var ok = true; for (var q = 1; q < fired.length; q++) { var p = fired[q - 1], r = fired[q]; if (p[0] > r[0] || (p[0] === r[0] && p[1] > r[1])) ok = false; } return [fired.length, ok, c.now(), fired[0], fired[2999]]; }
  if (k === 9) { var a = c.setTimeout(rec('a'), 10); c.setTimeout(function () { log.push('b@' + c.now()); c.clearTimeout(a2); }, 5); var a2 = c.setTimeout(rec('late'), 8); c.advanceTimersByTime(20); return [log, a]; }
}` }, cases: [
        [[0], [['b@50', 'a@100', 'c@100'], 120, 0]],
        [[1], [['a@10', 'z@10'], ['a@10', 'z@10', 'b@15'], 15]],
        [[2], [1, 2, ['y@10'], 0]],
        [[3], [['neg@0', 'none@0'], 0]],
        [[4], [5]],
        [[5], [[10, 30, 60], 60, 0]],
        [[6], ['Aborting after running 1000 timers', 1000]],
        [[7], [[0, 1], ['t@100'], 0]],
        [[8], [3000, true, 1000, [0, 0], [999, 2857]]],
        [[9], [['b@5', 'a@10'], 1]]
      ] }
    }]
  });

  /* =====================================================================
     TOPIC 5: Module mocking and network doubles (MSW)
     ===================================================================== */
  var MSW_HANDLERS = [['GET', '/users/:id', 'user from params'], ['POST', '/users', '201 created'], ['GET', '/files/*', 'any file'], ['*', '/health', 'ok for every method']];
  function matchPath(pattern, path) {
    var ps = pattern.split('/').filter(Boolean), us = path.split('/').filter(Boolean), params = {};
    for (var i = 0; i < ps.length; i++) {
      if (ps[i] === '*' && i === ps.length - 1) return params;
      if (i >= us.length) return null;
      if (ps[i][0] === ':') params[ps[i].slice(1)] = decodeURIComponent(us[i]);
      else if (ps[i] !== us[i]) return null;
    }
    return ps.length === us.length ? params : null;
  }
  function mswFrames(input) {
    var m = String(input || '').trim().split(/\s+/);
    if (m.length !== 2 || m[1][0] !== '/') throw new Error('Type METHOD /path, e.g. GET /users/42?tab=1');
    var method = m[0].toUpperCase(), url = m[1], q = url.indexOf('?'), path = q >= 0 ? url.slice(0, q) : url, fr = [];
    var rows = MSW_HANDLERS.map(function (h) { return [h[0], h[1], h[2], '']; });
    fr.push(F('Your code calls <code>fetch("' + esc(url) + '", { method: "' + method + '" })</code>. MSW intercepts it <b>at the network layer</b> (Node: interceptors on http/fetch; browser: a Service Worker). Your app code is unchanged and unaware.', [T('request: <b>' + method + ' ' + esc(url) + '</b> → path <code>' + esc(path) + '</code>' + (q >= 0 ? ', query <code>' + esc(url.slice(q + 1)) + '</code> (ignored for matching)' : '')), TB('handlers (first match wins)', ['method', 'path', 'response', 'check'], rows)]));
    for (var i = 0; i < MSW_HANDLERS.length; i++) {
      var h = MSW_HANDLERS[i], mOk = h[0] === '*' || h[0] === method, params = mOk ? matchPath(h[1], path) : null;
      rows[i][3] = !mOk ? 'method differs' : params ? 'MATCH ' + JSON.stringify(params) : 'path differs';
      var hl = {}; hl[i] = params ? 'ok' : 'bad';
      fr.push(F('Handler ' + (i + 1) + ': <code>' + h[0] + ' ' + h[1] + '</code> → ' + (params ? '<b>match</b>' + (Object.keys(params).length ? ', path params ' + esc(JSON.stringify(params)) : '') + '. Its resolver runs and returns the mocked response.' : 'no match (' + rows[i][3] + '), try the next one.'), [TB('handlers (first match wins)', ['method', 'path', 'response', 'check'], rows, hl)]));
      if (params) { fr.push(F('Response: <b>' + esc(h[2]) + '</b>. Your component or service receives it exactly as if a real server answered: status, headers, JSON body. The test asserts on what the <b>user sees</b>, not on fetch calls.', [T('<span class="c-g">' + esc(h[2]) + '</span>')])); fr.push(F('Per-test override: <code>server.use(http.get("/users/:id", () =&gt; new HttpResponse(null, { status: 500 })))</code> <b>prepends</b> a handler, so it is checked first and wins for this test only. <code>server.resetHandlers()</code> in afterEach removes it.', [TB('handlers after server.use()', ['method', 'path', 'response'], [['GET', '/users/:id', '500 (override)']].concat(MSW_HANDLERS.map(function (x) { return x.slice(); })), { 0: 'sel' })])); return fr; }
    }
    fr.push(F('No handler matched. With <code>server.listen({ onUnhandledRequest: "error" })</code> the request fails loudly, so a forgotten endpoint never silently hits the real network.', [T('<span class="c-r">[MSW] Error: intercepted a request without a matching request handler: ' + method + ' ' + esc(url) + '</span>')]));
    fr.push(F('Fix: add a handler globally, or override for one test with <code>server.use(http.get("/x", ...))</code>; <code>server.resetHandlers()</code> in afterEach drops such overrides.', [T('server.use() prepends, so per-test overrides beat the defaults.')]));
    return fr;
  }

  topics.push({
    title: 'Module Mocking and Network Doubles: jest.mock, vi.mock and MSW',
    analogy: `<p>Rehearsing a play when one actor is absent: you can rewrite the script so their lines vanish (<b>dependency injection</b>), you can secretly swap the actor in the cast list before the curtain rises (<b>module mocking</b>, which must happen before anyone reads the cast list, hence "hoisting"), or you can leave the cast alone and put a <b>stand-in at the stage door</b> who answers every knock exactly like the real actor would (<b>MSW</b>, intercepting the network). The stage-door stand-in is the least intrusive: the play itself does not change at all.</p>`,
    explain: `<p>🟢 <b>Module mocking</b> replaces what <code>import</code>/<code>require</code> returns for a module, for this test file only.</p>
      ${H.table(['', 'Jest', 'Vitest'], [
        ['replace a module', '<code>jest.mock("./api", () =&gt; ({ getUser: jest.fn() }))</code>', '<code>vi.mock("./api", () =&gt; ({ getUser: vi.fn() }))</code>'],
        ['automock every export', '<code>jest.mock("./api")</code>', '<code>vi.mock("./api")</code> (or a <code>__mocks__</code> folder)'],
        ['keep the rest real', '<code>{ ...jest.requireActual("./api"), getUser: jest.fn() }</code>', '<code>async (importOriginal) =&gt; ({ ...(await importOriginal()), getUser: vi.fn() })</code>'],
        ['variables in the factory', 'name must start with <code>mock</code>', 'create them with <code>vi.hoisted(() =&gt; ...)</code>'],
        ['native ESM', '<code>jest.unstable_mockModule</code> + <code>await import()</code>', 'works out of the box']
      ])}
      <p><b>Hoisting:</b> <code>jest.mock</code> and <code>vi.mock</code> calls are moved to the <b>top of the file</b> by a transform, before the imports run, so the module under test imports the mock. That is why the factory cannot use ordinary variables declared below it.</p>
      <p><b>Network doubles:</b> rather than mocking <code>fetch</code> or axios, <b>Mock Service Worker (MSW)</b> intercepts real requests and answers from handlers:</p>
      <p><code>http.get('/api/users/:id', ({ params }) =&gt; HttpResponse.json({ id: params.id }))</code></p>
      <p>Start it with <code>setupServer(...handlers)</code> from <code>msw/node</code> in tests (<code>setupWorker</code> in the browser), <code>server.listen({ onUnhandledRequest: 'error' })</code> in beforeAll, <code>server.resetHandlers()</code> in afterEach, <code>server.close()</code> in afterAll. Override per test with <code>server.use(...)</code>, which prepends handlers so they win. The same handlers can power Storybook and local development.</p>`,
    clues: ['"mock the API call in a component test" → MSW handler (not mocking fetch)', '"vi.mock factory: cannot access variable before initialization" → hoisting; use <code>vi.hoisted</code> / <code>mock</code>-prefixed names in Jest', '"mock one export, keep the others" → <code>requireActual</code> / <code>importOriginal</code>', '"test error state: server returns 500" → <code>server.use(http.get(url, () =&gt; new HttpResponse(null, { status: 500 })))</code>', '"a test accidentally hit production" → <code>onUnhandledRequest: "error"</code>', '"spyOn an ESM export does nothing" → live bindings; mock the module or inject the dependency'],
    code: [{ lang: 'js', run: true, title: 'Handler matching, the core of MSW (runnable)', code: `
      // Path patterns with :params; first matching handler wins; unmatched requests fail loudly.
      function match(pattern, path) {
        const p = pattern.split('/').filter(Boolean), u = path.split('/').filter(Boolean), params = {};
        if (p.length !== u.length) return null;
        for (let i = 0; i < p.length; i++) {
          if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(u[i]);
          else if (p[i] !== u[i]) return null;
        }
        return params;
      }
      const handlers = [
        { method: 'GET', path: '/users/:id', resolve: ({ params }) => ({ status: 200, body: { id: params.id, name: 'Ada' } }) },
        { method: 'GET', path: '/users', resolve: () => ({ status: 200, body: [] }) }
      ];
      function fakeFetch(method, url) {
        const path = url.split('?')[0];
        for (const h of handlers) {
          const params = h.method === method ? match(h.path, path) : null;
          if (params) return h.resolve({ params });
        }
        throw new Error('[MSW] unhandled ' + method + ' ' + url);
      }
      console.log(fakeFetch('GET', '/users/42?tab=posts'));   // { status: 200, body: { id: '42', name: 'Ada' } }
      handlers.unshift({ method: 'GET', path: '/users/:id', resolve: () => ({ status: 500, body: 'boom' }) }); // like server.use()
      console.log(fakeFetch('GET', '/users/42').status);       // 500: the override wins
      try { fakeFetch('DELETE', '/users/42'); } catch (e) { console.log(e.message); }
    ` }, { lang: 'js', check: false, title: 'MSW 2 + Vitest setup and a per-test override', code: `
      // test/server.js
      import { setupServer } from 'msw/node';
      import { http, HttpResponse } from 'msw';

      export const handlers = [
        http.get('/api/users/:id', ({ params }) => HttpResponse.json({ id: params.id, name: 'Ada' })),
        http.post('/api/users', async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({ id: '7', ...body }, { status: 201 });
        })
      ];
      export const server = setupServer(...handlers);

      // vitest.setup.js (setupFiles)
      import { beforeAll, afterEach, afterAll } from 'vitest';
      import { server } from './test/server.js';
      beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
      afterEach(() => server.resetHandlers());      // drop per-test overrides
      afterAll(() => server.close());

      // profile.test.js
      import { it, expect, vi } from 'vitest';
      import { http, HttpResponse } from 'msw';
      import { server } from './test/server.js';
      import { loadProfile } from './profile.js';

      // module mock for something that is not HTTP (hoisted above the imports)
      const { track } = vi.hoisted(() => ({ track: vi.fn() }));
      vi.mock('./analytics.js', () => ({ track }));

      it('shows a friendly error when the API fails', async () => {
        server.use(http.get('/api/users/:id', () => new HttpResponse(null, { status: 500 })));
        await expect(loadProfile('1')).resolves.toEqual({ error: 'Could not load profile' });
        expect(track).toHaveBeenCalledWith('profile_error', { status: 500 });
      });
    ` }],
    codeTitle: ['Handler matching', 'MSW + vi.mock'],
    viz: {
      title: 'Which MSW handler answers this request?',
      input: 'GET /users/42?tab=posts',
      inputLabel: 'METHOD /path (try POST /users, PUT /health, GET /files/a/b.png, DELETE /users/1)',
      gen: mswFrames
    },
    examples: [
      { title: 'Why vi.mock is hoisted (and what breaks)', html: `<p>You write <code>const fake = vi.fn(); vi.mock('./api', () =&gt; ({ get: fake }));</code>. After hoisting, the <code>vi.mock</code> factory sits <b>above</b> <code>const fake</code>, and when it runs, <code>fake</code> is in its temporal dead zone: ${H.c('r', 'ReferenceError')}. Jest forbids out-of-scope variables in factories unless the name starts with <code>mock</code> (and even then it must be initialized before the factory runs, which is lazy at first import). Vitest provides <code>vi.hoisted</code> to declare values that are hoisted too.</p>`, code: { lang: 'js', run: true, code: `
        // What the transform effectively produces: the mock registration runs first.
        const registry = {};
        function viMock(name, factory) { registry[name] = factory; }   // hoisted call
        viMock('./api', () => ({ get: fake }));                          // references fake...
        try { registry['./api'](); }                                     // ...the import runs the factory now
        catch (e) { console.log(e.name + ': ' + e.message); }
        const fake = () => 'data';                                       // declared too late
      ` } },
      { title: 'Choose the lightest double', html: `${H.table(['situation', 'best tool'], [['your function takes collaborators as parameters', 'pass <code>vi.fn()</code> (dependency injection)'], ['HTTP from a component or service', 'MSW handlers'], ['a third-party SDK with side effects (analytics, payments)', '<code>vi.mock</code> the SDK module'], ['time / randomness', 'fake timers, <code>vi.spyOn(Math, "random")</code>'], ['database', 'real DB in a container (Testcontainers) for integration tests; in-memory fake for unit tests']])}` },
      { title: 'Unhandled request policy', html: `<p><code>onUnhandledRequest</code> can be <code>"warn"</code> (default: log and let it through), <code>"error"</code> (fail the request: recommended in tests), <code>"bypass"</code> (silently pass through), or a function to decide per request. With <code>"error"</code>, a new API call added to a component without a handler makes the test fail instead of reaching a real server.</p>` }
    ],
    deepDive: `<p>🟣 <b>How module mocking works.</b> Jest owns the module system: every <code>require</code> goes through <code>jest-runtime</code>, which checks a mock registry first, and <code>babel-plugin-jest-hoist</code> lifts <code>jest.mock</code> calls above imports (which Babel has already turned into <code>require</code>). For native ESM, imports are linked before any code runs, so Jest needs <code>jest.unstable_mockModule</code> followed by a dynamic <code>await import()</code>. Vitest hoists <code>vi.mock</code> in its Vite transform and rewrites static imports into dynamic ones in test files, so ESM mocking works naturally. Mocks apply to the whole module graph of that test file, including transitive imports.</p>
      <p><b>How MSW works.</b> In Node, <code>@mswjs/interceptors</code> patches <code>http</code>/<code>https</code> <code>ClientRequest</code>, <code>XMLHttpRequest</code> and global <code>fetch</code> to route requests through your handlers; in the browser a real Service Worker intercepts <code>fetch</code> events. Handlers use standard <code>Request</code>/<code>Response</code> objects (MSW 2), support path params and wildcards, <code>{ once: true }</code> one-shot handlers, delays (<code>await delay(200)</code>), streaming, GraphQL (<code>graphql.query("GetUser", ...)</code>) and WebSockets. Because it works at the network boundary, the same test covers your fetch wrapper, retries, JSON parsing and UI states.</p>
      <p><b>Contract drift</b> is the risk: mocks can lie when the real API changes. Generate handlers or types from the OpenAPI spec, add a few contract tests (Pact) or integration tests against a real staging API, and keep fixtures realistic.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI often mocks <code>global.fetch</code> with a hand-rolled object that lacks <code>ok</code>/<code>status</code>/<code>headers</code>, or writes <code>vi.mock</code> factories that reference variables declared later. Both produce confusing failures.</p>
      <p><b>Work alongside it:</b> ask <code>Generate MSW 2 handlers for these OpenAPI endpoints with realistic fixtures, including 404 and 500 variants</code>, then review the fixtures against real responses. Ask it to explain hoisting errors rather than silencing them.</p>
      <p><b>You must still own:</b> where to cut (DI vs module mock vs network), the reset strategy (<code>resetHandlers</code>, <code>restoreMocks</code>) and keeping mocks honest with the real contract.</p>`,
    problems: [{
      title: 'MSW-style Request Handler Resolution with Params, Overrides, once and Fallthrough',
      level: 'Hard', tags: ['msw', 'routing', 'mocking', 'network'], companies: ['Shopify', 'Atlassian', 'GitHub'],
      statement: `<p>Write <code>createMockServer(handlers, options)</code>. A handler is <code>{ method, path, resolver, once? }</code>; <code>resolver(req)</code> gets <code>{ method, path, params, query }</code> and returns a response object, or <code>undefined</code> to fall through to the next matching handler. The server has:</p>
        <ul><li><code>handle(method, url)</code>: strip an origin (<code>http://host</code> or <code>https://host</code>), split off the query (parse <code>a=1&amp;b=2</code> into an object, last value wins), drop a trailing slash. Try handlers in order; a handler matches when its method equals the request method (case-insensitive) or is <code>"*"</code>, and its path matches: literal segments equal, <code>:name</code> captures one segment (URI-decoded), a final <code>*</code> matches zero or more remaining segments. The first resolver returning a value wins; a <code>once</code> handler is then marked used and skipped afterwards.</li>
        <li>Unhandled: with <code>onUnhandledRequest: "error"</code> (default) throw <code>Error('Unhandled request: ' + METHOD + ' ' + url)</code> (METHOD upper-cased, url as given); with <code>"bypass"</code> return <code>null</code>.</li>
        <li><code>use(...hs)</code> prepends runtime handlers (the newest call first, keeping the order inside one call); <code>resetHandlers()</code> removes all runtime handlers.</li></ul>`,
      constraints: `Up to 1000 handlers and 10<sup>4</sup> requests; paths up to 20 segments.`,
      example: `<p>Handlers <code>GET /users/:id</code> → <code>{ status: 200, body: params.id }</code>. <code>handle("get", "https://api.test/users/42/?x=1")</code> → ${H.c('g', '{ status: 200, body: "42" }')}. After <code>use({ method: "GET", path: "/users/:id", resolver: () =&gt; ({ status: 500 }), once: true })</code> the next call returns 500, the one after that returns 200 again.</p>`,
      brute: { why: `<p>Mocking <code>fetch</code> per test with <code>mockResolvedValueOnce</code> couples tests to call order and to the HTTP client: switch from fetch to axios, or add one extra request, and every mock is wrong. A route table with patterns describes the API once.</p>`,
        code: { lang: 'js', run: true, code: `
          const responses = [{ status: 200, body: '42' }, { status: 200, body: [] }];   // order-dependent script
          const fetchMock = () => responses.shift();
          console.log(fetchMock('/users/42'), fetchMock('/users'), fetchMock('/users/1')); // third call: undefined
        ` } },
      mcq: { q: 'In MSW, why does <code>server.use()</code> PREPEND handlers?', options: ['So a per-test override takes precedence over the default handler for the same route', 'Because arrays only support unshift', 'So handlers run in parallel', 'To make resetHandlers faster'], answer: 0, explain: 'First match wins. Prepending lets a test say "for this test only, GET /user returns 500" without removing the default handler; resetHandlers() then drops the override.' },
      hints: [
        `<p>Hint 1: Normalize the URL first: remove <code>scheme://host</code>, split at <code>?</code>, parse the query with split('&amp;') and split('='), remove a trailing slash.</p>`,
        `<p>Hint 2: Match by walking pattern segments: <code>*</code> as the last segment returns the params immediately; <code>:x</code> captures; anything else must be equal; at the end the segment counts must be equal.</p>`,
        `<p>Hint 3: Keep two arrays, <code>runtime</code> and <code>initial</code>; the active list is <code>runtime.concat(initial)</code>. <code>use</code> does <code>runtime = hs.concat(runtime)</code>. Skip used once-handlers; a resolver returning undefined means "continue".</p>`
      ],
      solution: {
        approach: `<p>Normalize the URL, then scan the active handler list (runtime overrides first) for the first handler whose method and path pattern match and whose resolver returns something. Path matching is a segment-by-segment walk that collects params. Once-handlers are marked used only when they actually answer.</p>`,
        code: { lang: 'js', run: true, code: `
          function createMockServer(handlers, options = {}) {
            const initial = handlers.map((h) => ({ ...h, used: false }));
            let runtime = [];
            const policy = options.onUnhandledRequest || 'error';

            function matchPath(pattern, path) {
              const p = pattern.split('/').filter(Boolean), u = path.split('/').filter(Boolean), params = {};
              for (let i = 0; i < p.length; i++) {
                if (p[i] === '*' && i === p.length - 1) return params;     // wildcard eats the rest
                if (i >= u.length) return null;
                if (p[i][0] === ':') params[p[i].slice(1)] = decodeURIComponent(u[i]);
                else if (p[i] !== u[i]) return null;
              }
              return p.length === u.length ? params : null;
            }

            function normalize(url) {
              let rest = url.replace(/^https?:[/][/][^/?]*/, '');             // drop scheme://host
              const q = rest.indexOf('?'), query = {};
              if (q >= 0) {
                for (const pair of rest.slice(q + 1).split('&')) {
                  if (!pair) continue;
                  const eq = pair.indexOf('=');
                  const k = eq >= 0 ? pair.slice(0, eq) : pair, v = eq >= 0 ? pair.slice(eq + 1) : '';
                  query[decodeURIComponent(k)] = decodeURIComponent(v);
                }
                rest = rest.slice(0, q);
              }
              if (rest.length > 1 && rest.endsWith('/')) rest = rest.slice(0, -1);
              return { path: rest || '/', query };
            }

            return {
              use(...hs) { runtime = hs.map((h) => ({ ...h, used: false })).concat(runtime); },
              resetHandlers() { runtime = []; },
              handle(method, url) {
                const m = method.toUpperCase(), { path, query } = normalize(url);
                for (const h of runtime.concat(initial)) {
                  if (h.used) continue;
                  if (h.method !== '*' && h.method.toUpperCase() !== m) continue;
                  const params = matchPath(h.path, path);
                  if (!params) continue;
                  const res = h.resolver({ method: m, path, params, query });
                  if (res === undefined) continue;                            // fall through
                  if (h.once) h.used = true;
                  return res;
                }
                if (policy === 'bypass') return null;
                throw new Error('Unhandled request: ' + m + ' ' + url);
              }
            };
          }

          const server = createMockServer([
            { method: 'GET', path: '/users/:id', resolver: ({ params }) => ({ status: 200, body: params.id }) }
          ]);
          console.log(server.handle('get', 'https://api.test/users/42/?x=1'));  // { status: 200, body: '42' }
          server.use({ method: 'GET', path: '/users/:id', resolver: () => ({ status: 500 }), once: true });
          console.log(server.handle('GET', '/users/1').status, server.handle('GET', '/users/1').status); // 500 200
        ` },
        dry: { head: ['request', 'active list', 'checked', 'result'], rows: [
          ['GET /users/42/?x=1', '[default]', 'path /users/42 matches :id', '200 "42"'],
          ['use(once 500)', '[once500, default]', '-', '-'],
          ['GET /users/1', '[once500, default]', 'once500 matches → mark used', '500'],
          ['GET /users/1', '[once500(used), default]', 'skip used, default matches', '200 "1"'],
          ['DELETE /users/1', 'same', 'no method match', H.c('r', 'throws Unhandled request')]
        ] },
        complexity: `<p>O(H × S) per request for H handlers and S path segments. Real MSW is the same linear scan; route tries are unnecessary at test scale.</p>`,
        followUps: ['Add <code>restoreHandlers()</code> that revives used once-handlers.', 'Support optional segments like <code>/users/:id?</code>.', 'Record every request for assertions ("expect exactly one POST /orders").']
      },
      tests: { sig: 'int -> string', fn: 'chk', harness: { js: `
function chk(k) {
  var users = { method: 'GET', path: '/users/:id', resolver: function (r) { return { status: 200, body: r.params.id }; } };
  var list = { method: 'GET', path: '/users', resolver: function (r) { return { status: 200, body: r.query }; } };
  var files = { method: 'get', path: '/files/*', resolver: function (r) { return { status: 200, body: r.path }; } };
  var health = { method: '*', path: '/health', resolver: function (r) { return { status: 200, body: r.method }; } };
  var s = createMockServer([users, list, files, health]);
  var at = function (m, u) { try { return s.handle(m, u); } catch (e) { return e.message; } };
  if (k === 0) return [at('get', 'https://api.test/users/42/?x=1'), at('GET', '/users/a%20b')];
  if (k === 1) return [at('GET', '/users?page=2&page=3&q=ada'), at('GET', 'http://localhost:3000/users/'), at('GET', '/users?flag')];
  if (k === 2) return [at('GET', '/files'), at('GET', '/files/a/b.png'), at('PUT', '/health'), at('delete', '/health/')];
  if (k === 3) return [at('DELETE', '/users/1'), at('GET', '/users/1/posts'), at('GET', '/nope?x=1')];
  if (k === 4) { s.use({ method: 'GET', path: '/users/:id', resolver: function () { return { status: 500 }; }, once: true }); return [at('GET', '/users/1'), at('GET', '/users/1')]; }
  if (k === 5) { s.use({ method: 'GET', path: '/users/:id', resolver: function () { return { status: 401 }; } }); s.use({ method: 'GET', path: '/users/:id', resolver: function () { return { status: 403 }; } }, { method: 'GET', path: '/users/:id', resolver: function () { return { status: 404 }; } }); var a = at('GET', '/users/1'); s.resetHandlers(); return [a, at('GET', '/users/1')]; }
  if (k === 6) { s.use({ method: 'GET', path: '/users/:id', resolver: function (r) { return r.params.id === 'me' ? { status: 200, body: 'self' } : undefined; } }); return [at('GET', '/users/me'), at('GET', '/users/7')]; }
  if (k === 7) { var b = createMockServer([], { onUnhandledRequest: 'bypass' }); var h2 = createMockServer([health]); return [b.handle('GET', '/x'), (function () { try { return h2.handle('POST', '/'); } catch (e) { return e.message; } })()]; }
  if (k === 8) { var many = []; for (var i = 0; i < 1000; i++) many.push({ method: 'GET', path: '/r' + i + '/:id', resolver: (function (j) { return function (r) { return { status: 200, body: j + ':' + r.params.id }; }; })(i) }); var big = createMockServer(many), last; for (var q = 0; q < 10000; q++) last = big.handle('GET', '/r' + (q % 1000) + '/' + q); return last; }
}` }, cases: [
        [[0], [{ status: 200, body: '42' }, { status: 200, body: 'a b' }]],
        [[1], [{ status: 200, body: { page: '3', q: 'ada' } }, { status: 200, body: {} }, { status: 200, body: { flag: '' } }]],
        [[2], [{ status: 200, body: '/files' }, { status: 200, body: '/files/a/b.png' }, { status: 200, body: 'PUT' }, { status: 200, body: 'DELETE' }]],
        [[3], ['Unhandled request: DELETE /users/1', 'Unhandled request: GET /users/1/posts', 'Unhandled request: GET /nope?x=1']],
        [[4], [{ status: 500 }, { status: 200, body: '1' }]],
        [[5], [{ status: 403 }, { status: 200, body: '1' }]],
        [[6], [{ status: 200, body: 'self' }, { status: 200, body: '7' }]],
        [[7], [null, 'Unhandled request: POST /']],
        [[8], { status: 200, body: '999:9999' }]
      ] }
    }]
  });

  /* =====================================================================
     TOPIC 6: Integration and E2E: React Testing Library and Playwright
     ===================================================================== */
  var ROLE_ELEMS = [['h1', '', 'Checkout', 'heading'], ['input', 'email', 'Email', 'textbox'], ['input', 'checkbox', 'Remember me', 'checkbox'], ['button', '', 'Save draft', 'button'], ['button', '', 'Pay now', 'button'], ['a', 'href', 'Terms', 'link'], ['div', 'role=button', 'Help', 'button']];
  function roleFrames(input) {
    var m = String(input || '').trim().match(/^(\w+)(?:\s+(.+))?$/);
    if (!m) throw new Error('Type a role and optional name, e.g. button Pay now');
    var role = m[1].toLowerCase(), name = m[2] ? m[2].trim() : null, fr = [], rows = [], hits = [];
    fr.push(F('<code>screen.getByRole("' + esc(role) + '"' + (name ? ', { name: "' + esc(name) + '" }' : '') + ')</code> does not look at CSS classes or test ids. It walks the <b>accessibility tree</b>: what a screen reader would announce. Each element gets a <b>role</b> (explicit <code>role=</code> or implicit from its tag) and an <b>accessible name</b> (label, aria-label or text).', [TB('accessibility tree', ['element', 'role', 'name', 'check'], ROLE_ELEMS.map(function (e) { return ['&lt;' + e[0] + (e[1] ? ' ' + e[1] : '') + '&gt;', e[3], e[2], '']; }))]));
    ROLE_ELEMS.forEach(function (e, i) {
      var ok = e[3] === role && (name === null || e[2].toLowerCase() === name.toLowerCase());
      if (ok) hits.push(e[2]);
      rows = ROLE_ELEMS.map(function (x, j) { return ['&lt;' + x[0] + (x[1] ? ' ' + x[1] : '') + '&gt;', x[3], x[2], j < i ? (rows[j] ? rows[j][3] : '') : j === i ? (ok ? 'MATCH' : e[3] !== role ? 'role ' + e[3] : 'name differs') : '']; });
      var hl = {}; hl[i] = ok ? 'ok' : 'done';
      fr.push(F('&lt;' + e[0] + (e[1] ? ' ' + e[1] : '') + '&gt; has role <b>' + e[3] + '</b>' + (e[1] === 'role=button' ? ' (explicit role: a div acting as a button)' : ' (implicit)') + ' and name "' + e[2] + '" → ' + (ok ? '<b>match</b>' : 'skip') + '.', [TB('accessibility tree', ['element', 'role', 'name', 'check'], rows, hl)]));
    });
    var verdict = hits.length === 1 ? '<span class="c-g">returns the element "' + esc(hits[0]) + '"</span>' : hits.length === 0 ? '<span class="c-r">throws: Unable to find an accessible element with the role "' + esc(role) + '"' + (name ? ' and name "' + esc(name) + '"' : '') + '</span>' : '<span class="c-r">throws: Found multiple elements with the role "' + esc(role) + '"</span> → add a name, or use getAllByRole';
    fr.push(F('<b>' + hits.length + ' match(es).</b> getBy expects exactly one: ' + verdict + '. queryBy returns null for zero; findBy retries (default 1000 ms) for elements that appear later. Playwright\'s <code>page.getByRole</code> uses the same idea and is strict: acting on a locator that matches several elements throws.', [T(verdict)]));
    return fr;
  }

  topics.push({
    title: 'Integration and E2E: React Testing Library Principles and Playwright',
    analogy: `<p>A <b>unit test</b> checks one Lego brick. An <b>integration test</b> checks that a few bricks snap together into a working door (component + hooks + API layer with MSW). An <b>end-to-end test</b> hires a <b>mystery shopper</b> to walk through the real shop in a real browser: find the "Pay now" button by its label, click it, wait patiently for the receipt. The shopper does not know how the shop is wired, so you can rebuild the back room and the test still passes, as long as customers can still pay.</p>`,
    explain: `<p>🟢 <b>The guiding principle</b> (Kent C. Dodds, RTL): <i>"The more your tests resemble the way your software is used, the more confidence they can give you."</i> Query by what users perceive, act like users, assert on what users see.</p>
      ${H.table(['RTL query priority', 'example', 'why'], [
        ['1. <code>getByRole</code>', '<code>getByRole("button", { name: /pay now/i })</code>', 'what assistive tech sees; tests accessibility for free'],
        ['2. <code>getByLabelText</code>', '<code>getByLabelText("Email")</code>', 'how users find form fields'],
        ['3. <code>getByPlaceholderText</code>, <code>getByText</code>, <code>getByDisplayValue</code>', '<code>getByText("Order placed")</code>', 'visible text'],
        ['4. <code>getByAltText</code>, <code>getByTitle</code>', '<code>getByAltText("Logo")</code>', 'semantic attributes'],
        ['5. <code>getByTestId</code>', '<code>getByTestId("chart")</code>', 'escape hatch when nothing else works']
      ])}
      <p><b>Variants:</b> <code>getBy</code> throws if 0 or more than 1 match; <code>queryBy</code> returns null for 0 (use for "is not there"); <code>findBy</code> returns a promise and retries until it appears (default 1000 ms); the <code>All</code> versions return arrays. Use <code>userEvent</code> (<code>const user = userEvent.setup(); await user.click(btn)</code>) over <code>fireEvent</code>: it simulates the full sequence (pointer, focus, keydown, input, keyup).</p>
      <p>🔵 <b>Playwright</b> drives real Chromium, Firefox and WebKit. Its <b>locators</b> (<code>page.getByRole</code>, <code>getByLabel</code>, <code>getByText</code>, <code>getByTestId</code>) are lazy and <b>strict</b>; actions <b>auto-wait</b> until the element is attached, visible, stable, enabled and receives events; <b>web-first assertions</b> like <code>await expect(locator).toHaveText("Paid")</code> retry until they pass or time out (5 s default; a test has 30 s). Fixtures (<code>{ page, context, request }</code>) give each test an isolated browser context. <code>page.route()</code> mocks network, <code>storageState</code> reuses login, <code>trace: "on-first-retry"</code> records a time-travel trace for debugging CI failures.</p>`,
    clues: ['"how should I select this element in a test?" → <code>getByRole</code> with a name, test id last', '"element appears after fetch" → <code>findBy*</code> / Playwright web-first assertion, never a fixed sleep', '"assert something is NOT rendered" → <code>queryBy*</code> + <code>not.toBeInTheDocument()</code>', '"E2E test flaky on CI" → auto-waiting locators, traces, isolated contexts, no shared accounts', '"log in once for all tests" → Playwright setup project + <code>storageState</code>', '"test across Chrome, Firefox, Safari" → Playwright projects'],
    code: [{ lang: 'js', run: true, title: 'getByRole vs queryByRole vs getAllByRole (runnable model)', code: `
      // A tiny accessibility tree and the three query flavours.
      const tree = [
        { tag: 'button', name: 'Save draft' },
        { tag: 'button', name: 'Pay now' },
        { tag: 'a', href: '/terms', name: 'Terms' },
        { tag: 'div', role: 'button', name: 'Help' }       // explicit role
      ];
      const roleOf = (el) => el.role || ({ button: 'button', a: el.href ? 'link' : 'generic' })[el.tag] || 'generic';
      const all = (role, name) => tree.filter((el) => roleOf(el) === role && (name === undefined || name.test(el.name)));
      const getByRole = (role, opts = {}) => {
        const found = all(role, opts.name);
        if (found.length === 0) throw new Error('Unable to find an accessible element with the role "' + role + '"');
        if (found.length > 1) throw new Error('Found multiple elements with the role "' + role + '"');
        return found[0];
      };
      const queryByRole = (role, opts = {}) => all(role, opts.name)[0] || null;

      console.log(getByRole('button', { name: /pay/i }).name);    // Pay now
      console.log(all('button').map((e) => e.name));              // [ 'Save draft', 'Pay now', 'Help' ]
      try { getByRole('button'); } catch (e) { console.log(e.message); }   // multiple
      console.log(queryByRole('checkbox'));                       // null (use for "not there")
    ` }, { lang: 'js', check: false, title: 'RTL integration test + Playwright E2E test', code: `
      // CheckoutForm.test.jsx (Vitest + React Testing Library + MSW from the previous topic)
      import { render, screen } from '@testing-library/react';
      import userEvent from '@testing-library/user-event';
      import { http, HttpResponse } from 'msw';
      import { server } from './test/server.js';
      import { CheckoutForm } from './CheckoutForm.jsx';

      it('pays and shows the receipt', async () => {
        const user = userEvent.setup();
        render(<CheckoutForm />);
        await user.type(screen.getByLabelText(/email/i), 'ada@example.com');
        await user.click(screen.getByRole('button', { name: /pay now/i }));
        expect(await screen.findByRole('status')).toHaveTextContent(/payment received/i);
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });

      it('shows an error when the payment API fails', async () => {
        server.use(http.post('/api/pay', () => HttpResponse.json({ error: 'declined' }, { status: 402 })));
        const user = userEvent.setup();
        render(<CheckoutForm />);
        await user.type(screen.getByLabelText(/email/i), 'ada@example.com');
        await user.click(screen.getByRole('button', { name: /pay now/i }));
        expect(await screen.findByRole('alert')).toHaveTextContent(/declined/i);
      });

      // e2e/checkout.spec.ts (Playwright)
      import { test, expect } from '@playwright/test';

      test.use({ storageState: 'playwright/.auth/user.json' });   // logged in by a setup project

      test('checkout happy path', async ({ page }) => {
        await page.route('**/api/pay', (route) => route.fulfill({ json: { ok: true, id: 'ch_1' } }));
        await page.goto('/checkout');
        await page.getByLabel('Email').fill('ada@example.com');
        await page.getByRole('button', { name: 'Pay now' }).click();          // auto-waits until actionable
        await expect(page.getByRole('status')).toHaveText(/payment received/i); // retries up to 5 s
        await expect(page).toHaveURL(/\\/orders\\/ch_1/);
      });
    ` }],
    codeTitle: ['Query flavours', 'RTL + Playwright'],
    viz: {
      title: 'How getByRole finds an element',
      input: 'button Pay now',
      inputLabel: 'Role and optional name (try: button, link Terms, textbox Email, checkbox)',
      gen: roleFrames
    },
    examples: [
      { title: 'Pyramid, trophy, or honeycomb?', html: `${H.table(['shape', 'idea', 'when it fits'], [['Pyramid (Cohn)', 'many unit, fewer integration, few E2E', 'logic-heavy libraries and back ends'], ['Testing Trophy (Dodds)', 'static types + lint at the base, <b>most tests integration</b>, some unit, few E2E', 'front-end apps: components + hooks + API together'], ['Honeycomb (Spotify)', 'mostly integration tests of each service through its API', 'microservices']])}<p>Common thread: E2E tests are the slowest and flakiest, so keep a thin layer covering critical user journeys (sign up, pay, core flow).</p>` },
      { title: 'Why not test implementation details', html: `<p>Asserting <code>component.state.isOpen === true</code> or that <code>useEffect</code> ran twice breaks when you refactor to <code>useReducer</code>, even though users see no change (a <b>false negative</b>), and it can pass while the button is invisible (a <b>false positive</b>). Assert <code>expect(screen.getByRole('dialog')).toBeVisible()</code> instead.</p>` },
      { title: 'Playwright debugging toolkit', html: `${H.table(['tool', 'use'], [['<code>npx playwright test --ui</code>', 'watch mode with time travel'], ['<code>--debug</code> / <code>page.pause()</code>', 'step through with the inspector'], ['<code>trace: "on-first-retry"</code>', 'trace.zip with DOM snapshots, network, console for every action'], ['<code>npx playwright codegen</code>', 'record actions to generate locators'], ['<code>--shard=1/4</code>', 'split the suite across CI machines']])}` }
    ],
    deepDive: `<p>🟣 <b>How getByRole computes names.</b> RTL (via <code>dom-testing-library</code>) builds roles from ARIA in HTML rules (<code>aria-query</code>) and computes accessible names with <code>dom-accessibility-api</code>, following the W3C accname algorithm: <code>aria-labelledby</code>, then <code>aria-label</code>, then native labelling (<code>&lt;label for&gt;</code>, <code>alt</code>, <code>&lt;legend&gt;</code>), then text content for roles that allow naming from content. Elements hidden from the accessibility tree (<code>display:none</code>, <code>aria-hidden</code>, <code>hidden</code>) are excluded unless <code>{ hidden: true }</code>. This is relatively slow on large DOMs; it is still the right default.</p>
      <p><b>Playwright actionability.</b> Before <code>click()</code>, Playwright checks the element is attached, visible, stable (not animating, same bounding box on two consecutive animation frames), enabled and that it receives pointer events at the click point (not covered by an overlay); it retries until the action timeout. Locators re-resolve on every use, so a re-render that replaces the node does not cause stale-element errors (a classic Selenium pain). Each test gets a fresh <code>BrowserContext</code> (cookies, storage isolated) while reusing the browser process, which is why isolation is cheap.</p>
      <p><b>Component tests vs E2E.</b> jsdom has no layout, so visibility, scrolling and CSS-dependent behaviour need a real browser: Vitest Browser Mode (Playwright provider) or Playwright component testing. Keep E2E for journeys across pages and real back ends; use <code>page.route</code> or a seeded test environment to make data deterministic, and never share one user account across parallel workers.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI-generated component tests often query by class names or <code>container.querySelector</code>, wrap everything in <code>act()</code> manually, and use <code>waitFor</code> with side effects inside. Generated Playwright tests frequently add <code>page.waitForTimeout(3000)</code>.</p>
      <p><b>Work alongside it:</b> ask <code>Rewrite queries to follow the RTL priority list; remove manual act() and fixed timeouts; use findBy or web-first assertions</code>. Playwright's codegen and its MCP/agent tooling can draft E2E flows from a live app; review every locator for stability.</p>
      <p><b>You must still own:</b> which journeys deserve E2E, what counts as user-visible behaviour, and the data/isolation strategy that keeps E2E tests deterministic.</p>`,
    problems: [{
      title: 'Implement getByRole / queryByRole / getAllByRole / queryAllByRole',
      level: 'Medium', tags: ['testing-library', 'accessibility', 'queries', 'dom'], companies: ['Meta', 'Airbnb', 'Spotify'],
      statement: `<p>You get a flat list of elements <code>{ id, tag, type?, href?, role?, label?, text?, hidden? }</code>. Write <code>createScreen(elements)</code> returning <code>getByRole</code>, <code>queryByRole</code>, <code>getAllByRole</code>, <code>queryAllByRole</code>, each <code>(role, options?)</code> with options <code>{ name?, hidden? }</code>, returning element <b>ids</b>.</p>
        <ul><li><b>Role:</b> explicit <code>role</code> wins; otherwise implicit: <code>button</code>→button; <code>a</code> with href→link (without href: none); <code>h1</code>..<code>h6</code>→heading; <code>input</code> type checkbox→checkbox, radio→radio, submit/button→button, anything else→textbox; <code>textarea</code>→textbox; <code>select</code>→combobox; <code>img</code>→img; <code>ul</code>/<code>ol</code>→list; <code>li</code>→listitem; <code>nav</code>→navigation; other tags have no role.</li>
        <li><b>Name:</b> <code>label</code> if present, else <code>text</code>, else ""; trimmed with inner whitespace collapsed. A string <code>name</code> option must equal it exactly; a RegExp must <code>test</code> it.</li>
        <li>Elements with <code>hidden: true</code> are ignored unless <code>options.hidden</code> is true.</li>
        <li>Errors: zero matches for get/getAll → <code>Unable to find an accessible element with the role "R"</code>; more than one for get/query → <code>Found multiple elements with the role "R"</code>; both followed by <code> and name "N"</code> for a string name or <code> and name /re/flags</code> for a RegExp. queryBy returns null, queryAll returns [].</li></ul>`,
      constraints: `Up to 10<sup>5</sup> elements per query.`,
      example: `<p>Elements: button "Save draft" (id 1), button "Pay now" (id 2), div role=button "Help" (id 3). <code>getByRole("button", { name: /pay/i })</code> → ${H.c('g', '2')}. <code>getByRole("button")</code> → ${H.c('r', 'Found multiple elements with the role "button"')}. <code>getAllByRole("button")</code> → [1, 2, 3].</p>`,
      brute: { why: `<p>Selecting by CSS classes or test ids (<code>querySelector(".btn-primary")</code>) passes even when the button has no accessible name or is a div that keyboard users cannot reach, and breaks when a designer renames a class. Role queries test the contract users and screen readers rely on.</p>`,
        code: { lang: 'js', run: true, code: `
          const els = [{ id: 1, tag: 'div', cls: 'btn-primary', text: '' }];   // an unlabeled div "button"
          const byClass = (c) => els.find((e) => e.cls === c);
          console.log(byClass('btn-primary').id);   // 1: test passes, yet screen readers cannot find it
        ` } },
      mcq: { q: 'You want to assert an error message is NOT shown. Which query?', options: ['queryByRole("alert") and expect it to be null', 'getByRole("alert") inside try/catch', 'findByRole("alert")', 'getAllByRole("alert").length === 0'], answer: 0, explain: 'queryBy returns null when nothing matches, which is exactly the "absent" case. getBy and getAllBy throw on zero matches, and findBy waits and then rejects.' },
      hints: [
        `<p>Hint 1: Write <code>roleOf(el)</code> as an explicit-role check followed by a switch on tag, and <code>nameOf(el)</code> = <code>(label ?? text ?? "").trim().split(/\\s+/).join(" ")</code> (or a replace of whitespace runs).</p>`,
        `<p>Hint 2: One core function <code>matches(role, opts)</code> filters by hidden, role and name, and returns the ids. The four queries only differ in what they do with 0, 1 or many results.</p>`,
        `<p>Hint 3: Build the suffix once: string → <code> and name "N"</code>, RegExp → <code> and name </code> + String(re). Reset <code>re.lastIndex</code> or avoid the g flag issue by creating a non-global copy.</p>`
      ],
      solution: {
        approach: `<p>Compute role and accessible name per element with small pure helpers, filter once, and let each query decide what 0, 1 or many matches mean. The error text follows Testing Library's wording so failures read the same as in a real project.</p>`,
        code: { lang: 'js', run: true, code: `
          function createScreen(elements) {
            const INPUT = { checkbox: 'checkbox', radio: 'radio', submit: 'button', button: 'button' };
            function roleOf(el) {
              if (el.role) return el.role;
              switch (el.tag) {
                case 'button': return 'button';
                case 'a': return el.href ? 'link' : null;
                case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': return 'heading';
                case 'input': return INPUT[el.type] || 'textbox';
                case 'textarea': return 'textbox';
                case 'select': return 'combobox';
                case 'img': return 'img';
                case 'ul': case 'ol': return 'list';
                case 'li': return 'listitem';
                case 'nav': return 'navigation';
                default: return null;
              }
            }
            const nameOf = (el) => String(el.label ?? el.text ?? '').trim().split(/\\s+/).filter(Boolean).join(' ');
            function nameMatches(actual, wanted) {
              if (wanted === undefined) return true;
              if (wanted instanceof RegExp) return new RegExp(wanted.source, wanted.flags.replace('g', '')).test(actual);
              return actual === wanted;
            }
            function find(role, opts = {}) {
              return elements
                .filter((el) => (opts.hidden || !el.hidden) && roleOf(el) === role && nameMatches(nameOf(el), opts.name))
                .map((el) => el.id);
            }
            function suffix(role, opts = {}) {
              let s = ' the role "' + role + '"';
              if (typeof opts.name === 'string') s += ' and name "' + opts.name + '"';
              else if (opts.name instanceof RegExp) s += ' and name ' + String(opts.name);
              return s;
            }
            const none = (role, opts) => new Error('Unable to find an accessible element with' + suffix(role, opts));
            const many = (role, opts) => new Error('Found multiple elements with' + suffix(role, opts));
            return {
              queryAllByRole: (role, opts) => find(role, opts),
              getAllByRole(role, opts) { const r = find(role, opts); if (!r.length) throw none(role, opts); return r; },
              queryByRole(role, opts) { const r = find(role, opts); if (r.length > 1) throw many(role, opts); return r.length ? r[0] : null; },
              getByRole(role, opts) { const r = find(role, opts); if (!r.length) throw none(role, opts); if (r.length > 1) throw many(role, opts); return r[0]; }
            };
          }

          const screen = createScreen([
            { id: 1, tag: 'button', text: 'Save draft' },
            { id: 2, tag: 'button', text: '  Pay   now ' },
            { id: 3, tag: 'div', role: 'button', label: 'Help' }
          ]);
          console.log(screen.getByRole('button', { name: /pay/i }));   // 2
          console.log(screen.getAllByRole('button'));                   // [ 1, 2, 3 ]
          try { screen.getByRole('button'); } catch (e) { console.log(e.message); }
          console.log(screen.queryByRole('link'));                      // null
        ` },
        dry: { head: ['query', 'matches', 'rule', 'result'], rows: [
          ['getByRole("button", /pay/i)', '[2]', 'exactly one', '2'],
          ['getAllByRole("button")', '[1, 2, 3]', 'one or more', '[1, 2, 3]'],
          ['getByRole("button")', '[1, 2, 3]', 'more than one', H.c('r', 'Found multiple ...')],
          ['queryByRole("link")', '[]', 'zero is fine', 'null']
        ] },
        complexity: `<p>O(N × L) per query for N elements and name length L. Real Testing Library is much heavier (it computes styles and accessible names by the W3C algorithm), which is why getByRole can be slow on huge trees.</p>`,
        followUps: ['Add <code>level</code> for headings (h2 → level 2).', 'Add <code>findByRole</code> that retries with a fake clock until found or timeout.', 'Support <code>aria-labelledby</code> by looking up other elements\' text.']
      },
      tests: { sig: 'int -> string', fn: 'chk', harness: { js: `
function chk(k) {
  var els = [
    { id: 1, tag: 'button', text: 'Save draft' }, { id: 2, tag: 'button', text: '  Pay   now ' }, { id: 3, tag: 'div', role: 'button', label: 'Help' },
    { id: 4, tag: 'a', href: '/terms', text: 'Terms' }, { id: 5, tag: 'a', text: 'Not a link' }, { id: 6, tag: 'h2', text: 'Checkout' },
    { id: 7, tag: 'input', type: 'email', label: 'Email' }, { id: 8, tag: 'input', type: 'checkbox', label: 'Remember me' }, { id: 9, tag: 'input', type: 'submit', label: 'Send' },
    { id: 10, tag: 'button', text: 'Secret', hidden: true }, { id: 11, tag: 'textarea', label: 'Notes' }, { id: 12, tag: 'span', text: 'plain' }, { id: 13, tag: 'input', label: 'Name' }
  ];
  var s = createScreen(els);
  var at = function (f) { try { return f(); } catch (e) { return e.message; } };
  if (k === 0) return [at(function () { return s.getByRole('button', { name: /pay/i }); }), at(function () { return s.getByRole('button', { name: 'Pay now' }); }), at(function () { return s.getAllByRole('button'); })];
  if (k === 1) return [at(function () { return s.getByRole('button'); }), at(function () { return s.queryByRole('button'); }), at(function () { return s.getByRole('button', { name: /a/ }); })];
  if (k === 2) return [at(function () { return s.getAllByRole('link'); }), at(function () { return s.getByRole('heading'); }), at(function () { return s.queryAllByRole('textbox'); }), at(function () { return s.getByRole('checkbox'); })];
  if (k === 3) return [at(function () { return s.queryByRole('dialog'); }), at(function () { return s.queryAllByRole('dialog'); }), at(function () { return s.getAllByRole('dialog'); }), at(function () { return s.getByRole('link', { name: 'Nope' }); }), at(function () { return s.getByRole('link', { name: /zzz/i }); })];
  if (k === 4) return [at(function () { return s.getByRole('button', { name: 'Secret' }); }), at(function () { return s.getByRole('button', { name: 'Secret', hidden: true }); })];
  if (k === 5) return [at(function () { return s.getByRole('button', { name: 'pay now' }); }), at(function () { return s.getByRole('button', { name: 'Pay' }); }), at(function () { return s.queryByRole('generic'); })];
  if (k === 6) { var g = /e/g; return [at(function () { return s.queryAllByRole('button', { name: g }); }), at(function () { return s.queryAllByRole('button', { name: g }); })]; }
  if (k === 7) { var big = []; for (var i = 0; i < 100000; i++) big.push({ id: i, tag: i % 2 ? 'button' : 'li', text: 'item ' + i }); var b = createScreen(big); return [b.getByRole('button', { name: 'item 99999' }), b.queryAllByRole('listitem').length, at(function () { return b.getByRole('listitem'); })]; }
  if (k === 8) { var e = createScreen([]); return [at(function () { return e.getByRole('button'); }), e.queryByRole('button'), e.queryAllByRole('button')]; }
}` }, cases: [
        [[0], [2, 2, [1, 2, 3, 9]]],
        [[1], ['Found multiple elements with the role "button"', 'Found multiple elements with the role "button"', 'Found multiple elements with the role "button" and name /a/']],
        [[2], [[4], 6, [7, 11, 13], 8]],
        [[3], [null, [], 'Unable to find an accessible element with the role "dialog"', 'Unable to find an accessible element with the role "link" and name "Nope"', 'Unable to find an accessible element with the role "link" and name /zzz/i']],
        [[4], ['Unable to find an accessible element with the role "button" and name "Secret"', 10]],
        [[5], ['Unable to find an accessible element with the role "button" and name "pay now"', 'Unable to find an accessible element with the role "button" and name "Pay"', null]],
        [[6], [[1, 3, 9], [1, 3, 9]]],
        [[7], [99999, 50000, 'Found multiple elements with the role "listitem"']],
        [[8], ['Unable to find an accessible element with the role "button"', null, []]]
      ] }
    }]
  });

  /* =====================================================================
     TOPIC 7: Coverage and its limits, flaky tests, TDD
     ===================================================================== */
  var SIGN_CODE = "function sign(n) {\n  if (n > 0) {\n    return 'pos';\n  } else if (n < 0) {\n    return 'neg';\n  }\n  return 'zero';\n}";
  function coverageFrames(input) {
    var ns = String(input || '').split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s !== ''; }).map(Number);
    if (!ns.length || ns.length > 6 || ns.some(isNaN)) throw new Error('Type 1 to 6 numbers to call sign() with, e.g. 3, -1');
    var lines = {}, br = {}, fr = [], STM = [2, 3, 4, 5, 7], BR = ['2:true', '2:false', '4:true', '4:false'];
    function pct(c, t) { return Math.floor(100000 * c / t / 10) / 100; }
    function snap() {
      var lc = STM.filter(function (l) { return lines[l]; }).length, bc = BR.filter(function (b) { return br[b]; }).length;
      return [V('coverage', { lines: lc + '/5 = ' + pct(lc, 5) + '%', branches: bc + '/4 = ' + pct(bc, 4) + '%', functions: (Object.keys(lines).length ? 1 : 0) + '/1' }, {}), TB('branch outcomes', ['branch', 'taken?'], BR.map(function (b) { return [b, br[b] ? 'yes' : 'no']; }), (function () { var h = {}; BR.forEach(function (b, i) { h[i] = br[b] ? 'ok' : 'bad'; }); return h; })())];
    }
    fr.push(F('Coverage tools (V8 or Istanbul) count which <b>statements</b>, <b>branches</b> (each side of every if/?:/&amp;&amp;/||/switch case) and <b>functions</b> ran during the tests. <code>sign</code> has 5 statements and 2 ifs = 4 branch outcomes.', [C('sign.js', SIGN_CODE, {})].concat(snap())));
    ns.forEach(function (n) {
      var hl = { 2: 'ok' }; lines[2] = 1;
      if (n > 0) { lines[3] = 1; br['2:true'] = 1; hl[3] = 'ok'; }
      else { br['2:false'] = 1; lines[4] = 1; hl[4] = 'ok'; if (n < 0) { lines[5] = 1; br['4:true'] = 1; hl[5] = 'ok'; } else { lines[7] = 1; br['4:false'] = 1; hl[7] = 'ok'; } }
      fr.push(F('Test calls <code>sign(' + n + ')</code>. Green lines ran. Coverage only records that code <b>executed</b>; it does not know whether any assertion checked the result.', [C('sign.js', SIGN_CODE, hl)].concat(snap())));
    });
    var missing = STM.filter(function (l) { return !lines[l]; });
    fr.push(F(missing.length ? 'Uncovered lines: <b>' + missing.join(', ') + '</b>. A test that reaches them is missing: that is the real value of coverage, a map of what you have <b>never</b> exercised.' : '100% lines and branches. Still, a test like <code>sign(3); sign(-1); sign(0);</code> <b>with no expect()</b> would score the same 100%. Coverage measures execution, not verification; mutation testing measures verification.', [C('sign.js', SIGN_CODE, (function () { var h = {}; missing.forEach(function (l) { h[l] = 'bad'; }); return h; })())].concat(snap())));
    fr.push(F('<b>Reading the report:</b> aim tests at the red lines and untaken branches first; then ask, for each covered line, "would a test fail if this line were wrong?" That second question is what mutation testing automates.', [TB('what each metric asks', ['metric', 'question'], [['lines/statements', 'did it run at least once?'], ['branches', 'did every if/else, ?:, &amp;&amp;, || outcome happen?'], ['functions', 'was it called at least once?'], ['mutation score', 'would a test notice a change?']])]));
    return fr;
  }

  topics.push({
    title: 'Coverage and Its Limits, Flaky Tests, and TDD in Interviews',
    analogy: `<p>Coverage is a <b>map of the rooms a security guard walked through</b>. A room never visited is definitely unchecked: useful! But walking through a room is not the same as checking it: the guard may stroll past an open safe. 100% coverage means every room was visited, not that every safe was locked. A <b>flaky test</b> is a smoke alarm that sometimes rings for toast: after a few false alarms, people pull the battery, and then the real fire goes unnoticed.</p>`,
    explain: `<p>🟢 <b>Coverage metrics:</b> <i>statements</i>/<i>lines</i> (ran at least once), <i>branches</i> (each outcome of every decision), <i>functions</i> (called at least once). Branch coverage is the most honest of the three. Turn it on with <code>vitest run --coverage</code> (provider <code>v8</code> by default, or <code>istanbul</code>) or <code>jest --coverage</code> (Babel/Istanbul instrumentation by default, or <code>coverageProvider: "v8"</code>). Enforce floors with <code>coverageThreshold</code> (Jest) or <code>coverage.thresholds</code> (Vitest) so CI fails if coverage drops.</p>
      <p><b>Limits:</b> coverage counts execution, not assertions; it cannot see missing code (an unhandled case you never wrote); 100% targets push people to test trivial getters. Use it to find <b>untested areas</b>, set a sensible floor (say 80% branches) and ratchet it, and use <b>mutation testing</b> (Stryker) to check that tests actually detect changes.</p>
      ${H.table(['flaky test cause', 'fix'], [
        ['real time, sleeps, timeouts', 'fake timers, web-first assertions, <code>findBy</code>'],
        ['shared state / order dependence', 'fresh state in beforeEach, run with shuffle'],
        ['real network or third-party API', 'MSW / <code>page.route</code>, hermetic test data'],
        ['randomness, dates, time zones, locale', 'seeded RNG, <code>setSystemTime</code>, fixed TZ in CI'],
        ['races in async UI', 'await the user-visible result, not an internal flag'],
        ['resource limits in CI (CPU, parallel workers sharing a DB)', 'isolated data per worker, fewer workers, longer but bounded timeouts']
      ])}
      <p><b>Process for flakes:</b> detect (rerun history, Playwright marks "flaky" when a retry passes), quarantine with an owner and deadline, reproduce (<code>--repeat-each=50</code>, <code>vitest --retry</code> off, stress CPU), fix the root cause, then un-quarantine. Retries hide flakes; they are a bandage, not a cure.</p>
      <p><b>TDD</b> is <b>red → green → refactor</b>: write a failing test for the next tiny behaviour, write the simplest code to pass it, clean up with tests green. In a coding interview a lightweight version shines: state 3–5 example cases (including edge cases) <i>before</i> coding, turn them into asserts, and run them at the end.</p>`,
    clues: ['"we have 95% coverage but bugs still ship" → coverage ≠ assertions; mutation testing, behaviour-focused tests', '"which coverage metric matters most?" → branch coverage', '"test fails 1 in 20 runs on CI" → flaky: timing, shared state, network, randomness; quarantine + root cause', '"should we just add retries?" → retries hide flakes; track and fix', '"how would you test this?" in an interview → list cases first (TDD-lite), edge cases, then code', '"enforce coverage in CI" → coverageThreshold / coverage.thresholds'],
    code: [{ lang: 'js', run: true, title: 'Coverage with zero assertions (runnable)', code: `
      // Instrument a function the way Istanbul does: a counter per statement and per branch.
      const cov = { s: { 2: 0, 3: 0, 5: 0, 6: 0, 7: 0 }, b: { 'if1:T': 0, 'if1:F': 0, 'if2:T': 0, 'if2:F': 0 } };
      function sign(n) {
        cov.s[2]++; if (n > 0) { cov.b['if1:T']++; cov.s[3]++; return 'pos'; }
        cov.b['if1:F']++;
        cov.s[5]++; if (n < 0) { cov.b['if2:T']++; cov.s[6]++; return 'neg'; }
        cov.b['if2:F']++; cov.s[7]++; return 'ZERO?!';          // bug: should be 'zero'
      }
      // A "test" that calls everything but asserts nothing:
      sign(5); sign(-5); sign(0);
      const pct = (o) => Math.round(100 * Object.values(o).filter((x) => x > 0).length / Object.keys(o).length);
      console.log('statements', pct(cov.s) + '%', 'branches', pct(cov.b) + '%'); // 100% 100%
      console.log('sign(0) =', sign(0), '<- bug shipped with 100% coverage');
    ` }, { lang: 'js', check: false, title: 'Coverage thresholds and retries in config', code: `
      // vitest.config.js
      import { defineConfig } from 'vitest/config';
      export default defineConfig({
        test: {
          coverage: {
            provider: 'v8',                       // or 'istanbul'
            reporter: ['text', 'html', 'lcov'],
            include: ['src/**'],
            thresholds: { lines: 85, branches: 80, functions: 85, statements: 85 }
          },
          sequence: { shuffle: true }             // surface order-dependent tests
        }
      });

      // jest.config.js
      module.exports = {
        collectCoverageFrom: ['src/**/*.{js,ts}'],
        coverageThreshold: { global: { branches: 80, lines: 85 } },
        randomize: true                           // Jest 29.2+
      };

      // playwright.config.ts
      import { defineConfig } from '@playwright/test';
      export default defineConfig({
        retries: process.env.CI ? 2 : 0,          // a test that passes on retry is reported as "flaky"
        use: { trace: 'on-first-retry' },
        reporter: [['html'], ['json', { outputFile: 'results.json' }]]
      });
    ` }],
    codeTitle: ['Coverage without asserts', 'Thresholds and retries'],
    viz: {
      title: 'Lines and branches lighting up',
      input: '3, -1',
      inputLabel: 'Numbers to call sign() with (try 3 alone, then 3, -1, 0)',
      gen: coverageFrames
    },
    examples: [
      { title: 'Line coverage 100%, branch coverage 50%', html: `<p><code>function fee(vip) { let f = 10; if (vip) f = 0; return f; }</code>. One test with <code>fee(true)</code> runs every line (100% lines) but never takes the "vip is false" path: branch coverage is ${H.c('r', '50%')}. Bugs love the untaken branch, which is why branch coverage is the metric to watch.</p>` },
      { title: 'Mutation testing in one table', html: `${H.table(['mutant (Stryker changes your code)', 'test suite result', 'meaning'], [['<code>n &gt; 0</code> → <code>n &gt;= 0</code>', H.c('g', 'a test fails (killed)'), 'tests check the boundary'], ['<code>return "zero"</code> → <code>return ""</code>', H.c('r', 'all tests pass (survived)'), 'nothing asserts the zero case'], ['remove <code>cache.clear()</code>', H.c('r', 'survived'), 'missing test for cache invalidation']])}<p>Mutation score = killed / total mutants. It is slow (re-runs tests per mutant), so run it nightly or on changed files.</p>` },
      { title: 'TDD-lite in an interview', html: `<ol><li>Restate the problem and write 4–6 example cases as a table: normal, empty, single, duplicates, boundary, invalid.</li><li>Pick the simplest approach and code it.</li><li>Turn the table into asserts (<code>console.assert</code> or a tiny <code>eq</code> helper) and run them.</li><li>When one fails, debug from the failing case, not by rereading everything.</li></ol><p>Interviewers read this as engineering maturity, and it catches off-by-one errors before they do.</p>` }
    ],
    deepDive: `<p>🟣 <b>How coverage is collected.</b> <i>Istanbul</i> instruments source code: it rewrites each statement, branch and function to bump a counter (<code>cov_xyz.s[3]++</code>) and writes a JSON map from counters to source locations. <i>V8 coverage</i> uses the engine's built-in block counters (no instrumentation, so faster and more faithful to real execution) and converts byte ranges back to source through source maps; historically it was less precise for branches and ignore-comments, and Vitest 3 added AST-aware remapping to make V8 reports match Istanbul's accuracy. Reports merge per-file data; <code>lcov</code> feeds tools like Codecov, which can enforce <b>patch coverage</b> (coverage of changed lines only), a more useful gate than a global number.</p>
      <p><b>Flake detection at scale.</b> Large teams store every test result with its commit. A test that both passes and fails <b>on the same commit</b> is flaky by definition (the code did not change). Systems compute a flip rate over a window, auto-quarantine above a threshold, file a ticket and keep running the test in the background to confirm a fix. Playwright's JSON reporter gives each test an outcome of <code>expected</code>, <code>unexpected</code>, <code>flaky</code> or <code>skipped</code>, which makes this easy to build.</p>
      <p><b>TDD trade-offs.</b> TDD shines for pure logic, bug fixes (write the failing regression test first) and APIs you are designing. It is awkward for exploratory UI and spikes. Outside-in TDD (start from an acceptance test, then unit tests) and property-based testing (<code>fast-check</code>: "for all inputs, decode(encode(x)) equals x") complement it.</p>`,
    aiEra: `<p><b>What AI changes:</b> asking AI to "increase coverage to 90%" produces tests that call code without meaningful assertions: the number goes up, the safety does not. AI is also tempted to "fix" a flaky test by adding a retry or a longer timeout.</p>
      <p><b>Work alongside it:</b> ask for <code>tests that would kill these surviving mutants</code> (paste Stryker output), or <code>find the root cause of this flake from the trace; do not add retries or sleeps</code>. AI is good at enumerating edge cases for a TDD list; you choose which ones matter.</p>
      <p><b>You must still own:</b> the coverage policy (branch focus, patch coverage, sensible floors), the flake process (detect, quarantine, fix), and the judgement that a green suite actually protects the behaviour users depend on.</p>`,
    problems: [{
      title: 'Coverage Calculator: Lines, Branches, Functions, Uncovered Ranges and Thresholds',
      level: 'Medium', tags: ['coverage', 'istanbul', 'sets', 'ranges'], companies: ['Microsoft', 'Atlassian', 'Datadog'],
      statement: `<p>Write <code>computeCoverage(spec, run, thresholds)</code>.</p>
        <ul><li><code>spec = { statements: [lineNumbers], branches: [[line, outcomeCount]], functions: [names] }</code> describes the file (statement lines may repeat; count each line once).</li>
        <li><code>run = { lines: [executed lines, repeats allowed], branches: [[line, outcomeIndex]], functions: [called names] }</code>. Hits that are not in the spec are ignored.</li>
        <li>Percent uses Istanbul's rule: <code>Math.floor(100000 * covered / total / 10) / 100</code>, and 100 when total is 0.</li>
        <li>Return <code>{ lines, branches, functions, uncovered, failures }</code>: <code>uncovered</code> lists the uncovered statement lines ascending, with runs of consecutive integers collapsed, as a string like <code>"3-5,9"</code> (empty string if none). <code>failures</code> lists, in the order lines, branches, functions, a string <code>"&lt;metric&gt;: &lt;pct&gt;% &lt; &lt;threshold&gt;%"</code> for every metric whose threshold is given and not met.</li></ul>`,
      constraints: `Up to 10<sup>5</sup> statements, branches and hits.`,
      example: `<p>Statements [2,3,4,5,7], branches [[2,2],[4,2]], functions ["sign"]; run lines [2,3,2,4,5], branches [[2,0],[2,1],[4,0]], functions ["sign"]; thresholds { branches: 80 } → lines ${H.c('y', '80')}, branches ${H.c('r', '75')}, functions 100, uncovered ${H.c('r', '"7"')}, failures ["branches: 75% &lt; 80%"].</p>`,
      brute: { why: `<p>Checking each statement with <code>run.lines.includes(line)</code> is O(S × H): with 10<sup>5</sup> of each, that is 10<sup>10</sup> comparisons. And forgetting to de-duplicate repeated hits counts a line run twice as "two covered lines", pushing the percentage over 100.</p>`,
        code: { lang: 'js', run: true, code: `
          function linePctNaive(statements, hits) {
            const covered = hits.filter((h) => statements.includes(h)).length;   // counts repeats!
            return (100 * covered) / statements.length;
          }
          console.log(linePctNaive([1, 2], [1, 1, 1]));   // 150 (nonsense)
        ` } },
      mcq: { q: 'One test calls <code>fee(true)</code> for <code>let f = 10; if (vip) f = 0; return f;</code>. Line vs branch coverage?', options: ['Lines 100%, branches 50%', 'Lines 50%, branches 100%', 'Both 100%', 'Both 50%'], answer: 0, explain: 'Every line ran, but only the true outcome of the if was taken. Branch coverage counts each outcome, so 1 of 2.' },
      hints: [
        `<p>Hint 1: Turn everything into Sets: unique statement lines, hit lines, branch keys like <code>"line:index"</code>, function names. Covered = size of the intersection.</p>`,
        `<p>Hint 2: Only branch hits whose key exists in the spec count (index &lt; outcomeCount); total branches = sum of outcome counts. Write <code>percent(c, t)</code> once with the floor rule.</p>`,
        `<p>Hint 3: For ranges, walk the sorted uncovered lines keeping <code>start</code> and <code>prev</code>; when <code>line !== prev + 1</code>, close the current range (<code>start === prev ? start : start + "-" + prev</code>).</p>`
      ],
      solution: {
        approach: `<p>Sets make every metric an intersection count in O(n). The Istanbul percent formula floors to two decimals so reports never round up past a threshold. Uncovered ranges are a single pass over the sorted uncovered lines.</p>`,
        code: { lang: 'js', run: true, code: `
          function percent(covered, total) {
            return total > 0 ? Math.floor((100000 * covered) / total / 10) / 100 : 100;
          }
          function toRanges(sorted) {
            const out = [];
            for (let i = 0; i < sorted.length; ) {
              let j = i;
              while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
              out.push(i === j ? String(sorted[i]) : sorted[i] + '-' + sorted[j]);
              i = j + 1;
            }
            return out.join(',');
          }
          function computeCoverage(spec, run, thresholds = {}) {
            const stmts = [...new Set(spec.statements)].sort((a, b) => a - b);
            const hitLines = new Set(run.lines || []);
            const uncoveredLines = stmts.filter((l) => !hitLines.has(l));

            const branchKeys = new Set();
            for (const [line, n] of spec.branches) for (let i = 0; i < n; i++) branchKeys.add(line + ':' + i);
            const hitBranches = new Set((run.branches || []).map(([l, i]) => l + ':' + i).filter((k) => branchKeys.has(k)));

            const fns = new Set(spec.functions);
            const hitFns = new Set((run.functions || []).filter((f) => fns.has(f)));

            const result = {
              lines: percent(stmts.length - uncoveredLines.length, stmts.length),
              branches: percent(hitBranches.size, branchKeys.size),
              functions: percent(hitFns.size, fns.size),
              uncovered: toRanges(uncoveredLines),
              failures: []
            };
            for (const metric of ['lines', 'branches', 'functions'])
              if (thresholds[metric] !== undefined && result[metric] < thresholds[metric])
                result.failures.push(metric + ': ' + result[metric] + '% < ' + thresholds[metric] + '%');
            return result;
          }

          console.log(computeCoverage(
            { statements: [2, 3, 4, 5, 7], branches: [[2, 2], [4, 2]], functions: ['sign'] },
            { lines: [2, 3, 2, 4, 5], branches: [[2, 0], [2, 1], [4, 0]], functions: ['sign'] },
            { branches: 80 }
          ));
        ` },
        dry: { head: ['metric', 'covered', 'total', 'percent'], rows: [
          ['lines', '{2,3,4,5} of {2,3,4,5,7}', '5', '80'],
          ['branches', '{2:0, 2:1, 4:0}', '4', '75 → below 80, failure'],
          ['functions', '{sign}', '1', '100'],
          ['uncovered', '[7]', '-', '"7"']
        ] },
        complexity: `<p>O(S log S + B + H) time for sorting statements and scanning hits; O(S + B) memory.</p>`,
        followUps: ['Add per-file results and a merged total (sum covered and totals, not average percentages).', 'Compute patch coverage: only lines changed in a diff.', 'Report the functions never called by name.']
      },
      tests: { sig: 'int -> string', fn: 'chk', harness: { js: `
function chk(k) {
  var spec = { statements: [2, 3, 4, 5, 7], branches: [[2, 2], [4, 2]], functions: ['sign'] };
  if (k === 0) return computeCoverage(spec, { lines: [2, 3, 2, 4, 5], branches: [[2, 0], [2, 1], [4, 0]], functions: ['sign'] }, { branches: 80 });
  if (k === 1) return computeCoverage(spec, { lines: [], branches: [], functions: [] }, { lines: 1, branches: 0, functions: 50 });
  if (k === 2) return computeCoverage({ statements: [], branches: [], functions: [] }, { lines: [1], branches: [[1, 0]], functions: ['x'] }, { lines: 100 });
  if (k === 3) return computeCoverage({ statements: [1, 2, 3, 3, 5, 6, 7, 10, 12, 13], branches: [[3, 3]], functions: ['a', 'b', 'c'] }, { lines: [5, 99, 12], branches: [[3, 2], [3, 5], [9, 0]], functions: ['b', 'zzz'] }, {});
  if (k === 4) return computeCoverage({ statements: [1, 2, 3], branches: [[1, 2]], functions: ['f', 'g', 'h'] }, { lines: [1, 2], branches: [[1, 0]], functions: ['f', 'f'] }, { lines: 66.67, functions: 33.33 });
  if (k === 5) { var st = [], hits = []; for (var i = 1; i <= 100000; i++) { st.push(i); if (i % 3) hits.push(i); } var r = computeCoverage({ statements: st, branches: [], functions: [] }, { lines: hits }, {}); return [r.lines, r.uncovered.split(',').length, r.uncovered.slice(0, 8), r.branches]; }
  if (k === 6) return computeCoverage({ statements: [4, 1, 3, 2], branches: [], functions: [] }, { lines: [] }, { lines: 0 });
}` }, cases: [
        [[0], { lines: 80, branches: 75, functions: 100, uncovered: '7', failures: ['branches: 75% < 80%'] }],
        [[1], { lines: 0, branches: 0, functions: 0, uncovered: '2-5,7', failures: ['lines: 0% < 1%', 'functions: 0% < 50%'] }],
        [[2], { lines: 100, branches: 100, functions: 100, uncovered: '', failures: [] }],
        [[3], { lines: 22.22, branches: 33.33, functions: 33.33, uncovered: '1-3,6-7,10,13', failures: [] }],
        [[4], { lines: 66.66, branches: 50, functions: 33.33, uncovered: '3', failures: ['lines: 66.66% < 66.67%'] }],
        [[5], [66.66, 33333, '3,6,9,12', 100]],
        [[6], { lines: 0, branches: 100, functions: 100, uncovered: '1-4', failures: [] }]
      ] }
    }]
  });

  /* =====================================================================
     PRACTICE ARENA
     ===================================================================== */
  practice.push({
    title: 'toBeCloseTo: Floating-Point Assertions Done Right',
    level: 'Easy', tags: ['matchers', 'floating point'], companies: ['Stripe', 'Robinhood'],
    statement: `<p>Write <code>toBeCloseTo(received, expected, numDigits = 2)</code> returning <code>true</code> or <code>false</code> with Jest's rule: pass when <code>|expected - received| &lt; 10<sup>-numDigits</sup> / 2</code>. Special cases: if both are <code>Infinity</code> with the same sign, pass; any other infinity or any <code>NaN</code> fails.</p>`,
    constraints: `0 ≤ numDigits ≤ 15. Inputs are numbers (including ±Infinity and NaN).`,
    example: `<p><code>toBeCloseTo(0.1 + 0.2, 0.3)</code> → ${H.c('g', 'true')} (difference 5.5e-17 &lt; 0.005). <code>toBeCloseTo(0.31, 0.3)</code> → ${H.c('r', 'false')} (0.01 is not &lt; 0.005). <code>toBeCloseTo(5, 5.4, 0)</code> → true (0.4 &lt; 0.5).</p>`,
    brute: { why: `<p><code>received === expected</code> fails on <code>0.1 + 0.2</code> because binary floating point cannot store 0.1 exactly. A fixed epsilon like 1e-9 ignores the precision the test actually cares about (cents vs micro-units).</p>`,
      code: { lang: 'js', run: true, code: `
        console.log(0.1 + 0.2 === 0.3);            // false
        console.log(0.1 + 0.2);                    // 0.30000000000000004
      ` } },
    mcq: { q: 'Why does Infinity need a special case?', options: ['Infinity - Infinity is NaN, and NaN < x is always false, so equal infinities would fail', 'Infinity cannot be compared at all', 'Math.abs(Infinity) throws', 'It does not need one'], answer: 0, explain: 'The subtraction of two equal infinities is NaN, so the general rule would reject them. Jest explicitly treats same-sign infinities as close.' },
    hints: [
      `<p>Hint 1: Handle the non-finite cases first: same infinity → true; anything else non-finite → false.</p>`,
      `<p>Hint 2: The tolerance is <code>Math.pow(10, -numDigits) / 2</code>.</p>`,
      `<p>Hint 3: Use strict <code>&lt;</code>, not <code>&lt;=</code>, and remember the default parameter value for numDigits.</p>`
    ],
    solution: {
      approach: `<p>Special-case infinities and NaN, then compare the absolute difference with half a unit in the last requested decimal place.</p>`,
      code: { lang: 'js', run: true, code: `
        function toBeCloseTo(received, expected, numDigits = 2) {
          if (received === Infinity && expected === Infinity) return true;
          if (received === -Infinity && expected === -Infinity) return true;
          if (!Number.isFinite(received) || !Number.isFinite(expected)) return false;   // NaN or mixed infinities
          return Math.abs(expected - received) < Math.pow(10, -numDigits) / 2;
        }
        console.log(toBeCloseTo(0.1 + 0.2, 0.3), toBeCloseTo(0.31, 0.3), toBeCloseTo(5, 5.4, 0)); // true false true
      ` },
      complexity: `<p>O(1) time and memory: a few comparisons and one subtraction.</p>`
    },
    tests: { sig: 'int -> string', fn: 'chk', harness: { js: `
function chk(k) {
  if (k === 0) return [toBeCloseTo(0.1 + 0.2, 0.3), toBeCloseTo(0.31, 0.3), toBeCloseTo(0.304, 0.3)];
  if (k === 1) return [toBeCloseTo(1.23, 1.2, 1), toBeCloseTo(1.26, 1.2, 1), toBeCloseTo(5, 5.4, 0), toBeCloseTo(5, 6, 0)];
  if (k === 2) return [toBeCloseTo(Infinity, Infinity), toBeCloseTo(-Infinity, -Infinity), toBeCloseTo(-Infinity, Infinity), toBeCloseTo(Infinity, 1e308)];
  if (k === 3) return [toBeCloseTo(NaN, NaN), toBeCloseTo(NaN, 0), toBeCloseTo(0, NaN)];
  if (k === 4) return [toBeCloseTo(0, -0), toBeCloseTo(1e-10, 0, 9), toBeCloseTo(1e-10, 0, 10), toBeCloseTo(100, 100.004)];
  if (k === 5) return [toBeCloseTo(-1.5, -1.504), toBeCloseTo(-1.5, -1.506), toBeCloseTo(3, 3, 15)];
}` }, cases: [
      [[0], [true, false, true]], [[1], [true, false, true, false]], [[2], [true, true, false, false]],
      [[3], [false, false, false]], [[4], [true, true, false, true]], [[5], [true, false, true]]
    ] }
  });

  practice.push({
    title: 'Format test.each Titles (%s, %d, %i, %j, %#, %%)',
    level: 'Easy', tags: ['test.each', 'strings', 'parsing'], companies: ['Atlassian', 'Shopify'],
    statement: `<p><code>test.each</code> builds one test name per data row from a template. Write <code>formatTitle(template, row, index)</code> that replaces placeholders left to right: <code>%s</code> → <code>String(v)</code>, <code>%d</code> → <code>String(Number(v))</code>, <code>%i</code> → <code>String(parseInt(v, 10))</code>, <code>%j</code> → <code>JSON.stringify(v)</code>. These four consume the next value of <code>row</code>; when values run out the placeholder stays as written. <code>%#</code> → the row index and <code>%%</code> → a literal <code>%</code> consume nothing. Extra values are ignored; any other <code>%x</code> is left alone.</p>`,
    constraints: `Template length ≤ 10<sup>5</sup>; row has up to 100 values.`,
    example: `<p><code>formatTitle("adds %i + %i = %i", [1, 2, 3], 0)</code> → ${H.c('g', '"adds 1 + 2 = 3"')}. <code>formatTitle("%# case: %s", ["x"], 4)</code> → ${H.c('g', '"4 case: x"')}. <code>formatTitle("100%% of %s", ["tests"], 0)</code> → "100% of tests".</p>`,
    brute: { why: `<p>Replacing each placeholder type with a separate <code>replace</code> call breaks ordering: all <code>%s</code> are filled before any <code>%d</code>, so <code>"%d then %s"</code> takes the wrong values. One left-to-right scan is required.</p>`,
      code: { lang: 'js', run: true, code: `
        function naive(t, row) {
          let i = 0;
          return t.replace(/%s/g, () => String(row[i++])).replace(/%d/g, () => String(row[i++]));
        }
        console.log(naive('%d then %s', [1, 'a']));   // "a then 1": the values come out swapped
      ` } },
    mcq: { q: 'Why must <code>%%</code> be handled in the same scan as the other placeholders?', options: ['Otherwise "%%s" could be read as "%" followed by a %s placeholder', 'Because % is not allowed in strings', 'For speed only', 'It must not; it can be done afterwards'], answer: 0, explain: 'In one left-to-right regex pass, %% is matched as a unit first, so the s after it stays a plain letter.' },
    hints: [
      `<p>Hint 1: One regex <code>/%[sdij#%]/g</code> with a replacer function visits placeholders left to right.</p>`,
      `<p>Hint 2: Keep a counter of consumed values; <code>%#</code> and <code>%%</code> do not move it.</p>`,
      `<p>Hint 3: If the counter reaches <code>row.length</code>, return the match unchanged.</p>`
    ],
    solution: {
      approach: `<p>A single regex replace with a callback: a closure counter tracks the next row value, and each placeholder type formats it.</p>`,
      code: { lang: 'js', run: true, code: `
        function formatTitle(template, row, index) {
          let next = 0;
          return template.replace(/%[sdij#%]/g, (m) => {
            if (m === '%%') return '%';
            if (m === '%#') return String(index);
            if (next >= row.length) return m;                 // no value left: keep placeholder
            const v = row[next++];
            if (m === '%s') return String(v);
            if (m === '%d') return String(Number(v));
            if (m === '%i') return String(parseInt(v, 10));
            return JSON.stringify(v);                         // %j
          });
        }
        console.log(formatTitle('adds %i + %i = %i', [1, 2, 3], 0));
        console.log(formatTitle('%# case: %s', ['x'], 4));
      ` },
      complexity: `<p>O(template length + total output length).</p>`
    },
    tests: { sig: 'string string int -> string', fn: 'chk', harness: { js: `
function chk(t, rowJson, i) { return formatTitle(t, JSON.parse(rowJson), i); }` }, cases: [
      [['adds %i + %i = %i', '[1,2,3]', 0], 'adds 1 + 2 = 3'],
      [['%# case: %s', '["x"]', 4], '4 case: x'],
      [['100%% of %s', '["tests"]', 0], '100% of tests'],
      [['%j', '[{"a":1}]', 0], '{"a":1}'],
      [['%d and %i', '["3.7",-3.7]', 0], '3.7 and -3'],
      [['%s %s', '["only"]', 0], 'only %s'],
      [['no placeholders', '[1,2]', 9], 'no placeholders'],
      [['%d', '["abc"]', 0], 'NaN'],
      [['%%s %x %s', '["v"]', 0], '%s %x v'],
      [['%s|%j|%s', '[null,null,true]', 1], 'null|null|true'],
      [['', '[]', 0], '']
    ] }
  });

  practice.push({
    title: 'Call-Count Matchers: toHaveBeenCalledWith, NthCalledWith, LastCalledWith',
    level: 'Easy', tags: ['mocks', 'matchers', 'deep equality'], companies: ['Google', 'Amazon'],
    statement: `<p>Given <code>calls</code> (a mock's <code>mock.calls</code>: an array of argument arrays), write <code>assertCalls(calls, matcher, arg)</code> returning a boolean for:</p>
      <ul><li><code>"toHaveBeenCalled"</code>: at least one call.</li><li><code>"toHaveBeenCalledTimes"</code>: exactly <code>arg</code> calls.</li><li><code>"toHaveBeenCalledWith"</code>: <b>some</b> call's arguments deep-equal the array <code>arg</code>.</li><li><code>"toHaveBeenLastCalledWith"</code>: the last call deep-equals <code>arg</code>.</li><li><code>"toHaveBeenNthCalledWith"</code>: <code>arg = [n, ...expected]</code>, 1-based.</li></ul>
      <p>Deep equality compares arrays by length and items, objects by keys and values, primitives with <code>Object.is</code>.</p>`,
    constraints: `Up to 10<sup>5</sup> calls; values are JSON data.`,
    example: `<p><code>calls = [["a", 1], ["b", { x: 2 }]]</code>: <code>toHaveBeenCalledWith ["b", { x: 2 }]</code> → ${H.c('g', 'true')}; <code>toHaveBeenNthCalledWith [1, "b", { x: 2 }]</code> → ${H.c('r', 'false')} (the first call was "a"); <code>toHaveBeenCalledTimes 2</code> → true.</p>`,
    brute: { why: `<p>Checking <code>calls.includes(expectedArgs)</code> uses reference equality, so a freshly written array never matches. Each call must be compared deeply.</p>`,
      code: { lang: 'js', run: true, code: `
        const calls = [['a', 1]];
        console.log(calls.includes(['a', 1]));   // false: different array object
      ` } },
    mcq: { q: 'Are NthCalledWith indexes 0-based or 1-based?', options: ['1-based: toHaveBeenNthCalledWith(1, ...) is the first call', '0-based like arrays', 'Negative from the end', 'It depends on the runner'], answer: 0, explain: 'Jest and Vitest both use 1-based n for nthCalledWith; mock.calls itself is a normal 0-based array.' },
    hints: [
      `<p>Hint 1: Write <code>deepEqual(a, b)</code> once (Object.is, then arrays, then objects).</p>`,
      `<p>Hint 2: Each matcher is a one-liner over <code>calls</code>: <code>some</code>, <code>length</code>, last element, element <code>n - 1</code>.</p>`,
      `<p>Hint 3: Guard empty calls and n out of range: they are simply false.</p>`
    ],
    solution: {
      approach: `<p>A small recursive deepEqual plus a switch on the matcher name.</p>`,
      code: { lang: 'js', run: true, code: `
        function deepEqual(a, b) {
          if (Object.is(a, b)) return true;
          if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;
          if (Array.isArray(a) !== Array.isArray(b)) return false;
          const ka = Object.keys(a), kb = Object.keys(b);
          return ka.length === kb.length && ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]));
        }
        function assertCalls(calls, matcher, arg) {
          switch (matcher) {
            case 'toHaveBeenCalled': return calls.length > 0;
            case 'toHaveBeenCalledTimes': return calls.length === arg;
            case 'toHaveBeenCalledWith': return calls.some((c) => deepEqual(c, arg));
            case 'toHaveBeenLastCalledWith': return calls.length > 0 && deepEqual(calls[calls.length - 1], arg);
            case 'toHaveBeenNthCalledWith': {
              const n = arg[0];
              return n >= 1 && n <= calls.length && deepEqual(calls[n - 1], arg.slice(1));
            }
            default: throw new Error('unknown matcher ' + matcher);
          }
        }
        console.log(assertCalls([['a', 1], ['b', { x: 2 }]], 'toHaveBeenCalledWith', ['b', { x: 2 }])); // true
      ` },
      complexity: `<p>O(total size of the calls) for the "with" matchers, O(1) for counts.</p>`
    },
    tests: { sig: 'string string string -> bool', fn: 'chk', harness: { js: `
function chk(callsJson, m, argJson) { return assertCalls(JSON.parse(callsJson), m, JSON.parse(argJson)); }` }, cases: [
      [['[["a",1],["b",{"x":2}]]', 'toHaveBeenCalledWith', '["b",{"x":2}]'], true],
      [['[["a",1],["b",{"x":2}]]', 'toHaveBeenNthCalledWith', '[1,"b",{"x":2}]'], false],
      [['[["a",1],["b",{"x":2}]]', 'toHaveBeenNthCalledWith', '[2,"b",{"x":2}]'], true],
      [['[["a",1],["b",{"x":2}]]', 'toHaveBeenCalledTimes', '2'], true],
      [['[]', 'toHaveBeenCalled', 'null'], false],
      [['[]', 'toHaveBeenLastCalledWith', '[]'], false],
      [['[[]]', 'toHaveBeenLastCalledWith', '[]'], true],
      [['[["a",1]]', 'toHaveBeenCalledWith', '["a",1,null]'], false],
      [['[["a",1]]', 'toHaveBeenNthCalledWith', '[3,"a",1]'], false],
      [['[[{"a":[1,2]}],[{"a":[1,3]}]]', 'toHaveBeenLastCalledWith', '[{"a":[1,3]}]'], true],
      [['[[1],[2]]', 'toHaveBeenCalledWith', '[{"0":2}]'], false]
    ] }
  });

  practice.push({
    title: 'Asymmetric Matchers: any, anything, stringMatching, objectContaining, arrayContaining',
    level: 'Medium', tags: ['matchers', 'deep equality', 'polymorphism'], companies: ['Meta', 'Stripe'],
    statement: `<p>Implement factories that return matcher objects with an <code>asymmetricMatch(value)</code> method, and an <code>equals(received, expected)</code> that honours them anywhere inside <code>expected</code>:</p>
      <ul><li><code>any(Ctor)</code>: for <code>Number</code>, <code>String</code>, <code>Boolean</code>, <code>Function</code> check <code>typeof</code> (or instanceof the wrapper); for <code>Object</code> check <code>typeof value === "object"</code>; otherwise <code>instanceof Ctor</code>.</li>
      <li><code>anything()</code>: anything except <code>null</code> and <code>undefined</code>.</li>
      <li><code>stringContaining(s)</code> / <code>stringMatching(re)</code>: value is a string and contains s / matches re.</li>
      <li><code>objectContaining(obj)</code>: value is a non-null object and, for every key of obj, has that key and <code>equals(value[key], obj[key])</code>.</li>
      <li><code>arrayContaining(arr)</code>: value is an array and every item of arr equals some item of value.</li></ul>
      <p><code>equals</code>: if expected has <code>asymmetricMatch</code>, return its result; otherwise Object.is, then arrays (same length, items) and plain objects (same keys) recursively.</p>`,
    constraints: `Nesting depth ≤ 100; arrays up to 10<sup>3</sup> items for arrayContaining.`,
    example: `<p><code>equals({ id: "usr_9", at: new Date(), tags: ["a", "b"] }, { id: stringMatching(/^usr_/), at: any(Date), tags: arrayContaining(["b"]) })</code> → ${H.c('g', 'true')}.</p>`,
    brute: { why: `<p>Comparing a generated id or timestamp with a fixed literal makes the test fail on every run, so people delete the field from the assertion entirely and lose the check that it exists and has the right shape.</p>`,
      code: { lang: 'js', run: true, code: `
        const user = { id: 'usr_' + Date.now(), name: 'Ada' };
        console.log(JSON.stringify(user) === JSON.stringify({ id: 'usr_123', name: 'Ada' })); // false every run
      ` } },
    mcq: { q: 'Why is the asymmetric matcher placed in the EXPECTED value and checked first?', options: ['equals sees the matcher object before comparing types, so it can accept a whole category of received values', 'Because received values cannot be objects', 'For performance', 'Matchers only work at the top level'], answer: 0, explain: 'The matcher replaces the normal comparison at that position. Checking it first means a string received value can match stringMatching even though a matcher object is not a string.' },
    hints: [
      `<p>Hint 1: Each factory returns <code>{ asymmetricMatch: (v) =&gt; boolean }</code>. Put the check <code>if (expected &amp;&amp; typeof expected.asymmetricMatch === "function")</code> at the top of equals.</p>`,
      `<p>Hint 2: objectContaining and arrayContaining call <code>equals</code> recursively, so nested matchers work.</p>`,
      `<p>Hint 3: For any(), map primitives' constructors to typeof names; Object → typeof object; else instanceof.</p>`
    ],
    solution: {
      approach: `<p>Matchers are objects with one method; <code>equals</code> delegates to them before any structural comparison and the container matchers recurse back into equals.</p>`,
      code: { lang: 'js', run: true, code: `
        const TYPEOF = new Map([[Number, 'number'], [String, 'string'], [Boolean, 'boolean'], [Function, 'function']]);
        const any = (Ctor) => ({ asymmetricMatch: (v) => {
          if (TYPEOF.has(Ctor)) return typeof v === TYPEOF.get(Ctor) || v instanceof Ctor;
          if (Ctor === Object) return typeof v === 'object';
          return v instanceof Ctor;
        } });
        const anything = () => ({ asymmetricMatch: (v) => v !== null && v !== undefined });
        const stringContaining = (s) => ({ asymmetricMatch: (v) => typeof v === 'string' && v.includes(s) });
        const stringMatching = (re) => ({ asymmetricMatch: (v) => typeof v === 'string' && new RegExp(re.source, re.flags.replace('g', '')).test(v) });
        const objectContaining = (obj) => ({ asymmetricMatch: (v) => typeof v === 'object' && v !== null &&
          Object.keys(obj).every((k) => Object.prototype.hasOwnProperty.call(v, k) && equals(v[k], obj[k])) });
        const arrayContaining = (arr) => ({ asymmetricMatch: (v) => Array.isArray(v) && arr.every((e) => v.some((x) => equals(x, e))) });

        function equals(a, b) {
          if (b && typeof b.asymmetricMatch === 'function') return b.asymmetricMatch(a);
          if (Object.is(a, b)) return true;
          if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;
          if (Array.isArray(a) !== Array.isArray(b)) return false;
          if (Array.isArray(a)) return a.length === b.length && a.every((x, i) => equals(x, b[i]));
          const ka = Object.keys(a), kb = Object.keys(b);
          return ka.length === kb.length && kb.every((k) => Object.prototype.hasOwnProperty.call(a, k) && equals(a[k], b[k]));
        }

        console.log(equals(
          { id: 'usr_9', at: new Date(), tags: ['a', 'b'] },
          { id: stringMatching(/^usr_/), at: any(Date), tags: arrayContaining(['b']) }
        )); // true
      ` },
      complexity: `<p>O(size) for structural parts; arrayContaining is O(|arr| × |value|) comparisons.</p>`
    },
    tests: { sig: 'int -> string', fn: 'chk', harness: { js: `
function chk(k) {
  if (k === 0) return equals({ id: 'usr_9', at: new Date(0), tags: ['a', 'b'] }, { id: stringMatching(/^usr_/), at: any(Date), tags: arrayContaining(['b']) });
  if (k === 1) return [equals(5, any(Number)), equals(new Number(5), any(Number)), equals('5', any(Number)), equals(function () {}, any(Function)), equals([], any(Object)), equals('x', any(Object)), equals([], any(Array))];
  if (k === 2) return [equals(0, anything()), equals('', anything()), equals(null, anything()), equals(undefined, anything()), equals({ a: undefined }, { a: anything() })];
  if (k === 3) return [equals('hello world', stringContaining('lo w')), equals(42, stringContaining('4')), equals('ABC', stringMatching(/b/i)), equals('abc', stringMatching(/x/))];
  if (k === 4) return [equals({ a: 1, b: 2, c: { d: 3, e: 4 } }, objectContaining({ c: objectContaining({ d: 3 }) })), equals({ a: 1 }, objectContaining({ a: 1, b: undefined })), equals(null, objectContaining({})), equals({ a: [1, 2] }, objectContaining({ a: [1, 2] }))];
  if (k === 5) return [equals([1, 2, 3], arrayContaining([3, 1])), equals([1, 2, 3], arrayContaining([4])), equals([{ id: 1 }, { id: 2 }], arrayContaining([{ id: 2 }])), equals([1], arrayContaining([])), equals('abc', arrayContaining([]))];
  if (k === 6) return [equals([1, { x: 'id-1' }], [any(Number), { x: stringMatching(/^id-/) }]), equals({ a: 1 }, { a: 1, b: anything() }), equals({ a: 1, b: 2 }, { a: any(Number) })];
  if (k === 7) { var big = []; for (var i = 0; i < 1000; i++) big.push({ n: i }); var want = []; for (var j = 999; j >= 0; j -= 3) want.push({ n: j }); return [equals(big, arrayContaining(want)), equals(big, arrayContaining([{ n: 1000 }]))]; }
}` }, cases: [
      [[0], true],
      [[1], [true, true, false, true, true, false, true]],
      [[2], [true, true, false, false, false]],
      [[3], [true, false, true, false]],
      [[4], [true, false, false, true]],
      [[5], [true, false, true, true, false]],
      [[6], [true, false, false]],
      [[7], [true, false]]
    ] }
  });

  practice.push({
    title: 'spyOn with mockImplementation and mockRestore (Own vs Inherited Methods)',
    level: 'Medium', tags: ['spy', 'prototypes', 'property descriptors'], companies: ['Microsoft', 'Netflix'],
    statement: `<p>Write <code>spyOn(obj, key)</code>. If <code>obj[key]</code> is not a function, throw <code>TypeError('Cannot spy on ' + key + ': not a function')</code>. Otherwise install an <b>own</b> property <code>obj[key]</code> = a spy that records each call's arguments in <code>spy.calls</code>, and by default calls the original with the same <code>this</code>. The spy has <code>mockImplementation(f)</code> (use f instead; returns the spy) and <code>mockRestore()</code>: if the method was an own property, put the original back; if it was inherited (for example from a class prototype), <b>delete</b> the own property so the prototype method shows through again. Spying twice on the same key wraps the current function (no special handling).</p>`,
    constraints: `Up to 10<sup>5</sup> calls.`,
    example: `<p><code>class Repo { save(x) { return "saved " + x; } }</code>, <code>const r = new Repo(); const s = spyOn(r, "save");</code> → <code>r.save(1)</code> returns ${H.c('g', '"saved 1"')} and <code>s.calls</code> = [[1]]. After <code>s.mockRestore()</code>, <code>Object.hasOwn(r, "save")</code> is ${H.c('b', 'false')} again.</p>`,
    brute: { why: `<p>Restoring with <code>obj[key] = original</code> for an inherited method leaves a permanent own property on the instance (or on a shared object), so later prototype changes no longer apply to it and <code>hasOwnProperty</code> checks change: a subtle leak between tests.</p>`,
      code: { lang: 'js', run: true, code: `
        class Repo { save() { return 'v1'; } }
        const r = new Repo();
        const original = r.save;
        r.save = () => 'spy';
        r.save = original;                                   // "restore"
        Repo.prototype.save = () => 'v2';                   // later change to the class
        console.log(r.save(), Object.hasOwn(r, 'save'));    // v1 true  <- stuck on the old method
      ` } },
    mcq: { q: 'Your code calls <code>helper()</code> directly inside the same ES module. You <code>vi.spyOn(moduleNs, "helper")</code>. Why is the spy never called?', options: ['The internal call uses the local binding, not the namespace property the spy replaced', 'spyOn only works on classes', 'The spy needs mockRestore first', 'ESM functions cannot be called twice'], answer: 0, explain: 'A spy replaces a property on an object. Code that does not read that property (a direct local call) never sees it. Mock the module or inject the dependency instead.' },
    hints: [
      `<p>Hint 1: Remember <code>hadOwn = Object.prototype.hasOwnProperty.call(obj, key)</code> and <code>original = obj[key]</code> before replacing.</p>`,
      `<p>Hint 2: The spy must be a regular function so <code>impl.apply(this, args)</code> keeps the receiver.</p>`,
      `<p>Hint 3: Restore: <code>hadOwn ? (obj[key] = original) : delete obj[key]</code>.</p>`
    ],
    solution: {
      approach: `<p>Record whether the property was own, wrap the original in a recording function, and restore by either reassigning or deleting.</p>`,
      code: { lang: 'js', run: true, code: `
        function spyOn(obj, key) {
          const original = obj[key];
          if (typeof original !== 'function') throw new TypeError('Cannot spy on ' + key + ': not a function');
          const hadOwn = Object.prototype.hasOwnProperty.call(obj, key);
          let impl = original;
          function spy(...args) {
            spy.calls.push(args);
            return impl.apply(this, args);
          }
          spy.calls = [];
          spy.mockImplementation = (f) => { impl = f; return spy; };
          spy.mockRestore = () => { if (hadOwn) obj[key] = original; else delete obj[key]; };
          obj[key] = spy;
          return spy;
        }

        class Repo { constructor() { this.n = 0; } save(x) { this.n++; return 'saved ' + x; } }
        const r = new Repo(), s = spyOn(r, 'save');
        console.log(r.save(1), s.calls, r.n);                  // saved 1 [ [ 1 ] ] 1
        s.mockRestore();
        console.log(Object.hasOwn(r, 'save'), r.save(2));      // false saved 2
      ` },
      complexity: `<p>O(1) per call plus argument storage.</p>`
    },
    tests: { sig: 'int -> string', fn: 'chk', harness: { js: `
function chk(k) {
  function Repo() { this.n = 0; }
  Repo.prototype.save = function (x) { this.n++; return 'saved ' + x; };
  var at = function (f) { try { return f(); } catch (e) { return e.name + ': ' + e.message; } };
  if (k === 0) { var r = new Repo(), s = spyOn(r, 'save'); var out = r.save(1); return [out, s.calls, r.n, Object.prototype.hasOwnProperty.call(r, 'save')]; }
  if (k === 1) { var r1 = new Repo(), s1 = spyOn(r1, 'save'); s1.mockRestore(); Repo.prototype.save = function () { return 'v2'; }; return [Object.prototype.hasOwnProperty.call(r1, 'save'), r1.save()]; }
  if (k === 2) { var o = { greet: function (n) { return 'hi ' + n; } }, orig = o.greet, s2 = spyOn(o, 'greet'); s2.mockImplementation(function (n) { return 'mocked ' + n; }); var a = o.greet('x'); s2.mockRestore(); return [a, o.greet === orig, o.greet('y'), s2.calls]; }
  if (k === 3) return [at(function () { spyOn({ v: 1 }, 'v'); }), at(function () { spyOn({}, 'missing'); })];
  if (k === 4) { var c = { base: 3, add: function (x) { return this.base + x; } }; var s4 = spyOn(c, 'add'); return [c.add(4), s4.mockImplementation(function (x) { return this.base * x; }) === s4, c.add(4)]; }
  if (k === 5) { var m = { f: function () { return 'orig'; } }, first = spyOn(m, 'f'), second = spyOn(m, 'f'); m.f(); second.mockRestore(); var afterSecond = m.f === first; first.mockRestore(); return [first.calls.length, second.calls.length, afterSecond, m.f()]; }
  if (k === 6) { var b = { f: function (i) { return i; } }, s6 = spyOn(b, 'f'), sum = 0; for (var i = 0; i < 100000; i++) sum += b.f(i); return [s6.calls.length, sum, s6.calls[99999]]; }
}` }, cases: [
      [[0], ['saved 1', [[1]], 1, true]],
      [[1], [false, 'v2']],
      [[2], ['mocked x', true, 'hi y', [['x']]]],
      [[3], ['TypeError: Cannot spy on v: not a function', 'TypeError: Cannot spy on missing: not a function']],
      [[4], [7, true, 12]],
      [[5], [1, 1, true, 'orig']],
      [[6], [100000, 4999950000, [99999]]]
    ] }
  });

  practice.push({
    title: 'mockReturnValueOnce Queues: Once, Default, Original, Reset',
    level: 'Medium', tags: ['mocks', 'queues', 'closures'], companies: ['Stripe', 'Uber'],
    statement: `<p>Write <code>createMock(impl?)</code>. When called, it records the arguments in <code>mock.calls</code> and picks what to run in this order: (1) the oldest entry of the <b>once queue</b> (FIFO), (2) the <b>default implementation</b>, which starts as <code>impl</code>, (3) otherwise return <code>undefined</code>. Methods, all returning the mock:</p>
      <ul><li><code>mockReturnValueOnce(v)</code>, <code>mockImplementationOnce(f)</code>: push to the once queue.</li><li><code>mockReturnValue(v)</code>, <code>mockImplementation(f)</code>: replace the default implementation.</li><li><code>mockClear()</code>: empty <code>mock.calls</code> only.</li><li><code>mockReset()</code>: empty calls, the once queue and the default implementation (Jest semantics).</li></ul>`,
    constraints: `Up to 10<sup>5</sup> queued values and calls.`,
    example: `<p><code>createMock(() =&gt; "real").mockReturnValueOnce("a").mockReturnValueOnce("b")</code> called 3 times → ${H.chips(['a', 'b', 'real'])}. After <code>mockReset()</code> it returns ${H.c('r', 'undefined')}.</p>`,
    brute: { why: `<p>Using <code>Array.prototype.shift</code> on a huge queue is O(n) per call, so draining 10<sup>5</sup> once-values costs 5·10<sup>9</sup> element moves in the worst engines. A head index makes each step O(1).</p>`,
      code: { lang: 'js', run: true, code: `
        const q = Array.from({ length: 5 }, (_, i) => i);
        while (q.length) q.shift();      // fine for 5 items; quadratic-ish for 100000 in the worst case
        console.log('drained');
      ` } },
    mcq: { q: 'Test 1 queues <code>mockReturnValueOnce("x")</code> but never calls the mock. Test 2 (same mock, only <code>mockClear()</code> between tests) calls it. What does test 2 get?', options: ['"x": mockClear does not empty the once queue, so it leaks into test 2', 'undefined', 'The original implementation', 'An error'], answer: 0, explain: 'mockClear only clears the call record. Use mockReset (or the resetMocks config) to drop leftover queued values between tests.' },
    hints: [
      `<p>Hint 1: Store the once queue as an array of functions (wrap values as <code>() =&gt; v</code>) plus a head index.</p>`,
      `<p>Hint 2: On call: if <code>head &lt; queue.length</code> use <code>queue[head++]</code>, else the default implementation, else undefined.</p>`,
      `<p>Hint 3: Reset sets queue = [], head = 0, def = undefined and clears calls.</p>`
    ],
    solution: {
      approach: `<p>A closure holds the once queue with a moving head, the default implementation and the call record; every method mutates that state and returns the mock for chaining.</p>`,
      code: { lang: 'js', run: true, code: `
        function createMock(impl) {
          let def = impl, queue = [], head = 0;
          function mock(...args) {
            mock.mock.calls.push(args);
            const f = head < queue.length ? queue[head++] : def;
            return f ? f.apply(this, args) : undefined;
          }
          mock.mock = { calls: [] };
          mock.mockImplementationOnce = (f) => { queue.push(f); return mock; };
          mock.mockReturnValueOnce = (v) => mock.mockImplementationOnce(() => v);
          mock.mockImplementation = (f) => { def = f; return mock; };
          mock.mockReturnValue = (v) => mock.mockImplementation(() => v);
          mock.mockClear = () => { mock.mock.calls = []; return mock; };
          mock.mockReset = () => { mock.mockClear(); queue = []; head = 0; def = undefined; return mock; };
          return mock;
        }
        const m = createMock(() => 'real').mockReturnValueOnce('a').mockReturnValueOnce('b');
        console.log(m(), m(), m());           // a b real
        console.log(m.mockReset()());         // undefined
      ` },
      complexity: `<p>O(1) per call and per queued value.</p>`
    },
    tests: { sig: 'int -> string', fn: 'chk', harness: { js: `
function chk(k) {
  if (k === 0) { var m = createMock(function () { return 'real'; }).mockReturnValueOnce('a').mockReturnValueOnce('b'); return [m(), m(), m(), m.mock.calls.length]; }
  if (k === 1) { var r = createMock(function () { return 'real'; }); r(); r.mockReset(); return [r(), r.mock.calls.length]; }
  if (k === 2) { var c = createMock().mockReturnValueOnce('x'); c.mockClear(); return [c.mock.calls.length, c(), c()]; }
  if (k === 3) { var d = createMock(function () { return 1; }).mockReturnValue(2).mockImplementationOnce(function (a, b) { return a * b; }); return [d(3, 4), d(), d()]; }
  if (k === 4) { var e = createMock().mockReturnValueOnce(1); e.mockReset(); e.mockReturnValue('after'); return [e(), e()]; }
  if (k === 5) { var o = { v: 5, f: createMock(function () { return this.v; }) }; o.f.mockImplementationOnce(function () { return this.v * 2; }); return [o.f(), o.f()]; }
  if (k === 6) { var big = createMock(function () { return -1; }); for (var i = 0; i < 100000; i++) big.mockReturnValueOnce(i); var s = 0; for (var j = 0; j < 100000; j++) s += big(); return [s, big(), big.mock.calls.length]; }
  if (k === 7) { var n = createMock(); return [n(), n.mock.calls]; }
}` }, cases: [
      [[0], ['a', 'b', 'real', 3]], [[1], [null, 1]], [[2], [0, 'x', null]], [[3], [12, 2, 2]],
      [[4], ['after', 'after']], [[5], [10, 5]], [[6], [4999950000, -1, 100001]], [[7], [null, [[]]]]
    ] }
  });

  practice.push({
    title: 'Fake setInterval and runOnlyPendingTimers',
    level: 'Medium', tags: ['fake timers', 'intervals', 'scheduler'], companies: ['Google', 'Slack'],
    statement: `<p>Extend a fake clock with intervals. Write <code>createClock()</code> with <code>now()</code>, <code>setTimeout(cb, ms)</code>, <code>setInterval(cb, ms)</code>, <code>clearTimer(id)</code>, <code>advanceTimersByTime(ms)</code>, <code>runOnlyPendingTimers()</code> and <code>getTimerCount()</code>. Ids start at 1 and are shared by both kinds. Delays below 0 become 0 for timeouts; interval periods below 1 become 1. An interval fires at <code>start + p, start + 2p, ...</code>, keeping its id; clearing it from inside its own callback stops it. Timers fire earliest first, ties by the time they were (re)scheduled, then by id. <code>runOnlyPendingTimers()</code> follows sinon's <code>runToLast</code>: advance the clock to the latest due time among timers pending <b>right now</b> (do nothing if none), firing everything due up to then, including timers created during the run.</p>`,
    constraints: `Up to 1000 timers; total fired timers per call ≤ 10<sup>5</sup>.`,
    example: `<p><code>setInterval(tick, 100)</code>, <code>setTimeout(done, 250)</code>, then <code>advanceTimersByTime(300)</code> → ${H.chips(['tick@100', 'tick@200', 'done@250', 'tick@300'])}. With only the interval pending, <code>runOnlyPendingTimers()</code> fires it once and leaves it scheduled (count stays 1).</p>`,
    brute: { why: `<p>Implementing an interval as a timeout that schedules a new timeout with a <b>new id</b> breaks <code>clearInterval(id)</code>: the id you hold refers to the first timeout only. And <code>runAllTimers</code> with a live interval never terminates.</p>`,
      code: { lang: 'js', run: true, code: `
        let fired = 0;
        const pending = [() => fired++];
        let guard = 0;
        while (pending.length && guard++ < 1000) { pending.shift()(); pending.push(() => fired++); } // interval reschedules forever
        console.log('fired', fired, '(stopped only by the guard)');
      ` } },
    mcq: { q: 'Which call is safe with a live <code>setInterval</code>?', options: ['runOnlyPendingTimers or advanceTimersByTime', 'runAllTimers', 'Neither', 'Only real timers'], answer: 0, explain: 'runAllTimers keeps firing because the interval always has a next tick; it aborts at the loop limit. Advancing by a fixed time or running only pending timers terminates.' },
    hints: [
      `<p>Hint 1: Store <code>{ id, at, seq, cb, period }</code>; a sequence number set at every (re)schedule gives the tie order.</p>`,
      `<p>Hint 2: Firing an interval: set <code>at += period</code> and a new seq <b>before</b> calling cb (so clearTimer inside cb removes it); a timeout is deleted before calling.</p>`,
      `<p>Hint 3: runOnlyPendingTimers = if any timers, <code>advanceTimersByTime(max(at) - now)</code>.</p>`
    ],
    solution: {
      approach: `<p>One map of timers, each with a due time and a scheduling sequence number. The advance loop always picks the smallest (at, seq), reschedules intervals in place and deletes timeouts. runOnlyPendingTimers reduces to an advance to the latest currently-known due time.</p>`,
      code: { lang: 'js', run: true, code: `
        function createClock() {
          let now = 0, nextId = 1, seq = 0;
          const timers = new Map();
          function add(cb, ms, period) {
            const id = nextId++;
            timers.set(id, { id, at: now + (period ? period : Math.max(0, ms || 0)), seq: seq++, cb, period });
            return id;
          }
          function earliest(limit) {
            let best = null;
            for (const t of timers.values())
              if (t.at <= limit && (!best || t.at < best.at || (t.at === best.at && t.seq < best.seq))) best = t;
            return best;
          }
          const api = {
            now: () => now,
            setTimeout: (cb, ms) => add(cb, ms, 0),
            setInterval: (cb, ms) => add(cb, ms, Math.max(1, ms || 0)),
            clearTimer: (id) => { timers.delete(id); },
            getTimerCount: () => timers.size,
            advanceTimersByTime(ms) {
              const target = now + ms;
              for (let t = earliest(target); t; t = earliest(target)) {
                now = t.at;
                if (t.period) { t.at += t.period; t.seq = seq++; } else timers.delete(t.id);
                t.cb();
              }
              now = target;
            },
            runOnlyPendingTimers() {
              if (!timers.size) return;
              let last = -Infinity;
              for (const t of timers.values()) last = Math.max(last, t.at);
              api.advanceTimersByTime(last - now);
            }
          };
          return api;
        }
        const c = createClock(), log = [];
        c.setInterval(() => log.push('tick@' + c.now()), 100);
        c.setTimeout(() => log.push('done@' + c.now()), 250);
        c.advanceTimersByTime(300);
        console.log(log);    // [ 'tick@100', 'tick@200', 'done@250', 'tick@300' ]
      ` },
      complexity: `<p>O(T) per fired timer with a linear scan over T live timers.</p>`
    },
    tests: { sig: 'int -> string', fn: 'chk', harness: { js: `
function chk(k) {
  var c = createClock(), log = [];
  var rec = function (n) { return function () { log.push(n + '@' + c.now()); }; };
  if (k === 0) { c.setInterval(rec('tick'), 100); c.setTimeout(rec('done'), 250); c.advanceTimersByTime(300); return [log, c.getTimerCount()]; }
  if (k === 1) { var id = c.setInterval(function () { log.push(c.now()); if (log.length === 3) c.clearTimer(id); }, 10); c.advanceTimersByTime(100); return [log, c.getTimerCount(), c.now()]; }
  if (k === 2) { c.setInterval(rec('i'), 100); c.runOnlyPendingTimers(); var a = log.slice(); c.runOnlyPendingTimers(); return [a, log, c.getTimerCount(), c.now()]; }
  if (k === 3) { c.runOnlyPendingTimers(); c.setTimeout(rec('t'), 50); c.setTimeout(function () { log.push('u@' + c.now()); c.setTimeout(rec('inner'), 10); c.setTimeout(rec('far'), 500); }, 30); c.runOnlyPendingTimers(); return [log, c.now(), c.getTimerCount()]; }
  if (k === 4) { c.setInterval(rec('z'), 0); c.advanceTimersByTime(3); return [log, c.getTimerCount()]; }
  if (k === 5) { c.setInterval(rec('a'), 50); c.setInterval(rec('b'), 50); c.advanceTimersByTime(100); return log; }
  if (k === 6) { c.setInterval(rec('p'), 30); c.setTimeout(rec('q'), 60); c.advanceTimersByTime(60); return log; }
  if (k === 7) { var n = 0; c.setInterval(function () { n++; }, 1); c.advanceTimersByTime(100000); return [n, c.now()]; }
}` }, cases: [
      [[0], [['tick@100', 'tick@200', 'done@250', 'tick@300'], 1]],
      [[1], [[10, 20, 30], 0, 100]],
      [[2], [['i@100'], ['i@100', 'i@200'], 1, 200]],
      [[3], [['u@30', 'inner@40', 't@50'], 50, 1]],
      [[4], [['z@1', 'z@2', 'z@3'], 1]],
      [[5], ['a@50', 'b@50', 'a@100', 'b@100']],
      [[6], ['p@30', 'q@60', 'p@60']],
      [[7], [100000, 100000]]
    ] }
  });

  practice.push({
    title: 'Snapshot Store: Written, Updated, Failed in CI, Obsolete',
    level: 'Medium', tags: ['snapshots', 'hash map', 'ci'], companies: ['Meta', 'Vercel'],
    statement: `<p>Model Jest's snapshot bookkeeping. Write <code>runSnapshots(stored, results, mode)</code>. <code>stored</code> maps snapshot keys to strings; <code>results</code> is the list of <code>[testName, value]</code> produced by <code>toMatchSnapshot()</code> calls in this run, in order. The key of a call is <code>testName + " " + n</code>, where n counts that test name's calls so far (1-based), exactly like Jest's <code>exports[\`renders 1\`]</code>.</p>
      <ul><li>Key exists and value equal → <code>"pass"</code>.</li><li>Key exists, value differs → <code>"updated"</code> in mode <code>"update"</code> (store the new value), otherwise <code>"fail: mismatch"</code>.</li><li>Key missing → <code>"fail: not written (--ci)"</code> in mode <code>"ci"</code>, otherwise <code>"written"</code> (store it).</li><li>Stored keys not produced in this run are <b>obsolete</b>; mode <code>"update"</code> deletes them, other modes keep them.</li></ul>
      <p>Return <code>{ statuses: [[key, status]], obsolete: sortedKeys, store: sortedEntries }</code> (entries as <code>[key, value]</code> pairs sorted by key).</p>`,
    constraints: `Up to 10<sup>4</sup> results and stored keys.`,
    example: `<p>stored <code>{ "renders 1": "&lt;a&gt;" }</code>, results <code>[["renders", "&lt;a&gt;"], ["renders", "&lt;b&gt;"]]</code>, default mode → ${H.c('g', 'renders 1: pass')}, ${H.c('b', 'renders 2: written')}. In <code>"ci"</code> mode the second becomes ${H.c('r', 'fail: not written (--ci)')}: CI must never invent a baseline.</p>`,
    brute: { why: `<p>Keying snapshots only by test name makes the second <code>toMatchSnapshot()</code> in a test overwrite the first, and writing missing snapshots in CI lets a broken render become the new "truth" without a human ever reviewing it.</p>`,
      code: { lang: 'js', run: true, code: `
        const store = {};
        for (const [name, v] of [['renders', '<a>'], ['renders', '<b>']]) store[name] = v;   // second call overwrites the first
        console.log(store);   // { renders: '<b>' }
      ` } },
    mcq: { q: 'Why does Jest refuse to write new snapshots when run with <code>--ci</code>?', options: ['A snapshot written in CI was never reviewed, so the test would pass with whatever the code produced', 'CI machines cannot write files', 'Snapshots are too slow in CI', 'It only affects inline snapshots'], answer: 0, explain: 'The first write of a snapshot is the moment a human approves the baseline. In CI nobody reviews it, so a missing snapshot should fail and be committed from a developer machine.' },
    hints: [
      `<p>Hint 1: Keep a <code>Map</code> testName → counter to build keys, and a Set of keys seen in this run.</p>`,
      `<p>Hint 2: Copy <code>stored</code> into a new object first and mutate the copy according to the mode.</p>`,
      `<p>Hint 3: Obsolete = stored keys not in the seen Set, sorted; delete them from the copy only in update mode. Sort entries with <code>Object.entries(copy).sort()</code> by key.</p>`
    ],
    solution: {
      approach: `<p>Build each call's key with a per-name counter, decide its status with a small table of (exists, equal, mode), then compute obsolete keys as stored minus seen.</p>`,
      code: { lang: 'js', run: true, code: `
        function runSnapshots(stored, results, mode) {
          const store = { ...stored }, counts = new Map(), seen = new Set(), statuses = [];
          for (const [name, value] of results) {
            const n = (counts.get(name) || 0) + 1;
            counts.set(name, n);
            const key = name + ' ' + n;
            seen.add(key);
            let status;
            if (Object.prototype.hasOwnProperty.call(stored, key)) {
              if (stored[key] === value) status = 'pass';
              else if (mode === 'update') { store[key] = value; status = 'updated'; }
              else status = 'fail: mismatch';
            } else if (mode === 'ci') status = 'fail: not written (--ci)';
            else { store[key] = value; status = 'written'; }
            statuses.push([key, status]);
          }
          const obsolete = Object.keys(stored).filter((k) => !seen.has(k)).sort();
          if (mode === 'update') for (const k of obsolete) delete store[k];
          const entries = Object.entries(store).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
          return { statuses, obsolete, store: entries };
        }
        console.log(runSnapshots({ 'renders 1': '<a>' }, [['renders', '<a>'], ['renders', '<b>']], 'default'));
      ` },
      complexity: `<p>O(R + S log S) for R results and S stored keys.</p>`
    },
    tests: { sig: 'int -> string', fn: 'chk', harness: { js: `
function chk(k) {
  if (k === 0) return runSnapshots({ 'renders 1': '<a>' }, [['renders', '<a>'], ['renders', '<b>']], 'default');
  if (k === 1) return runSnapshots({ 'renders 1': '<a>' }, [['renders', '<a>'], ['renders', '<b>']], 'ci');
  if (k === 2) return runSnapshots({ 'a 1': 'x', 'old 1': 'y' }, [['a', 'z']], 'default');
  if (k === 3) return runSnapshots({ 'a 1': 'x', 'old 1': 'y' }, [['a', 'z']], 'update');
  if (k === 4) return runSnapshots({ 'b 1': '1', 'a 1': '2' }, [], 'default');
  if (k === 5) return runSnapshots({}, [['t', 'v'], ['u', 'w'], ['t', 'v2']], 'update');
  if (k === 6) { var st = {}, res = []; for (var i = 0; i < 10000; i++) { st['x ' + (i + 1)] = String(i); res.push(['x', String(i)]); } var r = runSnapshots(st, res, 'ci'); return [r.statuses.filter(function (s) { return s[1] === 'pass'; }).length, r.obsolete.length, r.store.length]; }
}` }, cases: [
      [[0], { statuses: [['renders 1', 'pass'], ['renders 2', 'written']], obsolete: [], store: [['renders 1', '<a>'], ['renders 2', '<b>']] }],
      [[1], { statuses: [['renders 1', 'pass'], ['renders 2', 'fail: not written (--ci)']], obsolete: [], store: [['renders 1', '<a>']] }],
      [[2], { statuses: [['a 1', 'fail: mismatch']], obsolete: ['old 1'], store: [['a 1', 'x'], ['old 1', 'y']] }],
      [[3], { statuses: [['a 1', 'updated']], obsolete: ['old 1'], store: [['a 1', 'z']] }],
      [[4], { statuses: [], obsolete: ['a 1', 'b 1'], store: [['a 1', '2'], ['b 1', '1']] }],
      [[5], { statuses: [['t 1', 'written'], ['u 1', 'written'], ['t 2', 'written']], obsolete: [], store: [['t 1', 'v'], ['t 2', 'v2'], ['u 1', 'w']] }],
      [[6], [10000, 0, 10000]]
    ] }
  });

  practice.push({
    title: 'Flaky-Test Detector over CI Run History',
    level: 'Medium', tags: ['flaky tests', 'hash map', 'sorting'], companies: ['Google', 'Uber', 'Datadog'],
    statement: `<p>CI stores every result as <code>[testName, commitSha, "pass" | "fail"]</code>. A test is <b>flaky on a commit</b> if that same commit has both a pass and a fail for it (the code did not change, the result did). Write <code>detectFlaky(history)</code> returning <code>[name, flakyCommits, failRate]</code> for every test flaky on at least one commit, where <code>failRate = Math.round(100 × fails / runs)</code> over all its runs. Sort by flakyCommits descending, then failRate descending, then name ascending. A test that always fails is <b>broken</b>, not flaky.</p>`,
    constraints: `Up to 10<sup>5</sup> history rows.`,
    example: `<p>Rows: login c1 pass, login c1 fail, cart c1 fail, cart c2 fail, search c1 pass → ${H.c('y', '[["login", 1, 50]]')}. cart fails consistently (a real bug), search is healthy.</p>`,
    brute: { why: `<p>Flagging any test with at least one failure mixes real regressions with flakes, and comparing every pair of rows to find pass/fail pairs is O(n²). Grouping by (test, commit) answers it in one pass.</p>`,
      code: { lang: 'js', run: true, code: `
        const history = [['cart', 'c1', 'fail'], ['cart', 'c2', 'fail'], ['login', 'c1', 'pass'], ['login', 'c1', 'fail']];
        console.log([...new Set(history.filter((r) => r[2] === 'fail').map((r) => r[0]))]); // ['cart','login']: cart is broken, not flaky
      ` } },
    mcq: { q: 'Why group by commit instead of looking at the pass rate alone?', options: ['A pass and a fail on the same commit proves nondeterminism; different commits could just be a real fix or regression', 'Commits are smaller than test names', 'Pass rate cannot be computed', 'Grouping is required by Jest'], answer: 0, explain: 'If code changed between runs, a different result may be legitimate. Only same-code disagreement is proof of flakiness.' },
    hints: [
      `<p>Hint 1: Map test → Map commit → { pass, fail } flags, plus per-test counters of runs and fails.</p>`,
      `<p>Hint 2: flakyCommits = number of commits where both flags are set.</p>`,
      `<p>Hint 3: Filter flakyCommits &gt; 0 and sort with a three-key comparator (use <code>a &lt; b</code> for names, not subtraction).</p>`
    ],
    solution: {
      approach: `<p>One pass groups results by test and commit; a second pass over tests counts commits that saw both outcomes; then filter and sort.</p>`,
      code: { lang: 'js', run: true, code: `
        function detectFlaky(history) {
          const tests = new Map();
          for (const [name, commit, outcome] of history) {
            if (!tests.has(name)) tests.set(name, { runs: 0, fails: 0, commits: new Map() });
            const t = tests.get(name);
            t.runs++;
            if (outcome === 'fail') t.fails++;
            const c = t.commits.get(commit) || { pass: false, fail: false };
            c[outcome] = true;
            t.commits.set(commit, c);
          }
          const out = [];
          for (const [name, t] of tests) {
            let flaky = 0;
            for (const c of t.commits.values()) if (c.pass && c.fail) flaky++;
            if (flaky) out.push([name, flaky, Math.round((100 * t.fails) / t.runs)]);
          }
          return out.sort((a, b) => b[1] - a[1] || b[2] - a[2] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
        }
        console.log(detectFlaky([['login', 'c1', 'pass'], ['login', 'c1', 'fail'], ['cart', 'c1', 'fail'], ['cart', 'c2', 'fail'], ['search', 'c1', 'pass']]));
      ` },
      complexity: `<p>O(n + T log T) for n rows and T flaky tests.</p>`
    },
    tests: { sig: 'int -> string', fn: 'chk', harness: { js: `
function chk(k) {
  if (k === 0) return detectFlaky([['login', 'c1', 'pass'], ['login', 'c1', 'fail'], ['cart', 'c1', 'fail'], ['cart', 'c2', 'fail'], ['search', 'c1', 'pass']]);
  if (k === 1) return detectFlaky([['a', 'c1', 'pass'], ['a', 'c1', 'fail'], ['a', 'c2', 'fail'], ['a', 'c2', 'pass'], ['a', 'c3', 'pass'], ['b', 'c1', 'fail'], ['b', 'c1', 'fail'], ['b', 'c1', 'pass'], ['c', 'c1', 'pass'], ['c', 'c2', 'fail']]);
  if (k === 2) return detectFlaky([]);
  if (k === 3) return detectFlaky([['x', 'c1', 'pass'], ['x', 'c1', 'fail'], ['y', 'c9', 'fail'], ['y', 'c9', 'pass'], ['w', 'c1', 'pass'], ['w', 'c1', 'fail'], ['w', 'c1', 'fail'], ['w', 'c1', 'fail']]);
  if (k === 4) { var h = []; for (var i = 0; i < 1000; i++) { for (var c = 0; c < 10; c++) h.push(['t' + i, 'c' + c, 'pass']); if (i % 10 === 0) h.push(['t' + i, 'c0', 'fail']); } var r = detectFlaky(h); return [r.length, r[0], r[r.length - 1]]; }
  if (k === 5) return detectFlaky([['solo', 'c1', 'fail'], ['solo', 'c1', 'pass']]);
}` }, cases: [
      [[0], [['login', 1, 50]]],
      [[1], [['a', 2, 40], ['b', 1, 67]]],
      [[2], []],
      [[3], [['w', 1, 75], ['x', 1, 50], ['y', 1, 50]]],
      [[4], [100, ['t0', 1, 9], ['t990', 1, 9]]],
      [[5], [['solo', 1, 50]]]
    ] }
  });

  practice.push({
    title: 'Balance Test Files Across CI Shards by Duration',
    level: 'Medium', tags: ['sharding', 'greedy', 'scheduling'], companies: ['Microsoft', 'Shopify', 'GitHub'],
    statement: `<p>Playwright's <code>--shard=i/n</code> and Jest's <code>--shard</code> split files across machines. Splitting by count ignores that one file may take 10× longer. Write <code>shardByDuration(files, n)</code> using the <b>Longest Processing Time</b> greedy rule: sort files by duration descending (ties by name ascending), then give each file to the shard with the smallest total, breaking ties by fewer files, then by lower index. Return an array of n shards, each <code>[total, [fileNames in assignment order]]</code>.</p>`,
    constraints: `1 ≤ n ≤ 64; up to 10<sup>4</sup> files; durations are integers ≥ 0.`,
    example: `<p>Files a:5, b:4, c:3, d:3, e:2 with n = 2 → a→S0, b→S1, c→S1 (4 &lt; 5), d→S0 (5 &lt; 7), e→S1 (7 &lt; 8): ${H.c('g', '[[8, [a, d]], [9, [b, c, e]]]')}. Wall time is 9 instead of 10+ for a count split like [a, b, c] / [d, e].</p>`,
    brute: { why: `<p>Splitting the sorted file list into equal-count chunks (what <code>--shard</code> does without timing data) can put every slow E2E file on one machine; trying every assignment to find the perfect split is n<sup>files</sup>, hopeless. LPT is a 4/3-approximation that is fast and good in practice.</p>`,
      code: { lang: 'js', run: true, code: `
        const files = [['a', 5], ['b', 4], ['c', 3], ['d', 3], ['e', 2]];
        const half = Math.ceil(files.length / 2);
        const sum = (xs) => xs.reduce((s, f) => s + f[1], 0);
        console.log(sum(files.slice(0, half)), sum(files.slice(half)));  // 12 5: one machine does most of the work
      ` } },
    mcq: { q: 'Why sort the longest files first?', options: ['Big items placed early can be balanced by many small items later; placing them last creates an unfixable imbalance', 'Alphabetical order is not allowed', 'It makes the code shorter', 'Long files must run first to warm caches'], answer: 0, explain: 'Greedy assignment smooths totals with each new item. If a huge item arrives last, whichever shard gets it becomes the bottleneck. Longest-first is the classic LPT rule.' },
    hints: [
      `<p>Hint 1: Copy and sort: <code>(a, b) =&gt; b[1] - a[1] || (a[0] &lt; b[0] ? -1 : 1)</code>.</p>`,
      `<p>Hint 2: For each file scan the n shards for the best (total, file count, index).</p>`,
      `<p>Hint 3: n ≤ 64 so a linear scan per file is fine (a min-heap would make it O(log n)). Empty input → n empty shards.</p>`
    ],
    solution: {
      approach: `<p>Sort longest first, then place each file on the currently lightest shard. With small n a linear scan is simplest and fast enough.</p>`,
      code: { lang: 'js', run: true, code: `
        function shardByDuration(files, n) {
          const shards = Array.from({ length: n }, () => [0, []]);
          const sorted = files.slice().sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
          for (const [name, ms] of sorted) {
            let best = 0;
            for (let i = 1; i < n; i++) {
              const s = shards[i], b = shards[best];
              if (s[0] < b[0] || (s[0] === b[0] && s[1].length < b[1].length)) best = i;
            }
            shards[best][0] += ms;
            shards[best][1].push(name);
          }
          return shards;
        }
        console.log(JSON.stringify(shardByDuration([['a', 5], ['b', 4], ['c', 3], ['d', 3], ['e', 2]], 2)));
      ` },
      complexity: `<p>O(F log F + F × n) time, O(F) memory.</p>`
    },
    tests: { sig: 'int -> string', fn: 'chk', harness: { js: `
function chk(k) {
  var f5 = [['a', 5], ['b', 4], ['c', 3], ['d', 3], ['e', 2]];
  if (k === 0) return shardByDuration(f5, 2);
  if (k === 1) return shardByDuration(f5, 3);
  if (k === 2) return shardByDuration([['x', 1]], 3);
  if (k === 3) return shardByDuration([['b', 2], ['a', 2], ['c', 2]], 2);
  if (k === 4) return shardByDuration([], 2);
  if (k === 5) return shardByDuration([['z', 0], ['y', 0]], 2);
  if (k === 6) { var fs = []; for (var i = 0; i < 10000; i++) fs.push(['f' + i, (i % 100) + 1]); var r = shardByDuration(fs, 8), tot = r.map(function (s) { return s[0]; }); var cnt = r.reduce(function (s, x) { return s + x[1].length; }, 0); return [tot.reduce(function (a, b) { return a + b; }, 0), cnt, r.length, Math.max.apply(null, tot) - Math.min.apply(null, tot) <= 100]; }
  if (k === 7) return shardByDuration(f5, 1);
}` }, cases: [
      [[0], [[8, ['a', 'd']], [9, ['b', 'c', 'e']]]],
      [[1], [[5, ['a']], [6, ['b', 'e']], [6, ['c', 'd']]]],
      [[2], [[1, ['x']], [0, []], [0, []]]],
      [[3], [[4, ['a', 'c']], [2, ['b']]]],
      [[4], [[0, []], [0, []]]],
      [[5], [[0, ['y']], [0, ['z']]]],
      [[6], [505000, 10000, 8, true]],
      [[7], [[17, ['a', 'b', 'c', 'd', 'e']]]]
    ] }
  });

  practice.push({
    title: 'Affected Tests from an Import Graph (--changed / --onlyChanged)',
    level: 'Hard', tags: ['graphs', 'bfs', 'reverse edges', 'ci'], companies: ['Meta', 'Vercel', 'Nx'],
    statement: `<p><code>vitest --changed</code> and <code>jest --onlyChanged</code> run only tests affected by changed files. Write <code>affectedTests(graph, changed)</code>. <code>graph</code> maps a file to the files it imports (an imported file may not be a key itself). A <b>test file</b> is any file name ending in <code>.test.js</code>. Return <code>{ tests, untested }</code>: <code>tests</code> = sorted test files that are changed themselves or transitively import a changed file; <code>untested</code> = sorted, de-duplicated changed files that are not tests and that no test reaches (a coverage gap worth flagging). Graphs may contain cycles and chains up to 10<sup>5</sup> long, so do not recurse.</p>`,
    constraints: `Up to 10<sup>5</sup> files and edges.`,
    example: `<p><code>a.test.js → a.js → util.js</code>, <code>b.test.js → b.js</code>. Changed <code>["util.js"]</code> → ${H.c('g', 'tests ["a.test.js"]')}, untested []. Changed <code>["b.js", "orphan.js"]</code> → tests ["b.test.js"], ${H.c('r', 'untested ["orphan.js"]')}.</p>`,
    brute: { why: `<p>For every test file, DFS its whole import tree and check whether it hits a changed file: O(tests × graph). With thousands of tests sharing a big core, that repeats the same traversal thousands of times. Walking <b>backwards</b> from the changed files visits each file once.</p>`,
      code: { lang: 'js', run: true, code: `
        function testReaches(graph, test, target, seen = new Set()) {   // recursive and repeated per test
          if (test === target) return true;
          if (seen.has(test)) return false;
          seen.add(test);
          return (graph[test] || []).some((d) => testReaches(graph, d, target, seen));
        }
        console.log(testReaches({ 't.test.js': ['a.js'], 'a.js': ['b.js'] }, 't.test.js', 'b.js')); // true
      ` } },
    mcq: { q: 'Why build the reverse graph (importers) instead of walking imports?', options: ['Starting from the few changed files and walking to importers touches only affected files, each once', 'Reverse graphs use less memory in every case', 'Imports cannot be walked', 'To detect cycles'], answer: 0, explain: 'The question is "who depends on X?", which is reachability along reversed edges. One BFS from all changed files answers it for every test at once.' },
    hints: [
      `<p>Hint 1: Build <code>importers: Map&lt;file, file[]&gt;</code> by reversing every edge.</p>`,
      `<p>Hint 2: Multi-source BFS from all changed files with a visited Set (handles cycles) and an explicit queue (no recursion).</p>`,
      `<p>Hint 3: For the gap report, run a small BFS from each distinct changed non-test file and stop as soon as it reaches any test file; if it never does, the file is untested. Sort both outputs at the end.</p>`
    ],
    solution: {
      approach: `<p>Reverse the edges once. A multi-source BFS from the changed files collects every reachable test. For the gap report, run a BFS per distinct changed non-test file that stops as soon as it meets a test file (early exit keeps it cheap in practice).</p>`,
      code: { lang: 'js', run: true, code: `
        function affectedTests(graph, changed) {
          const isTest = (f) => f.endsWith('.test.js');
          const importers = new Map();
          for (const [file, deps] of Object.entries(graph))
            for (const d of deps) {
              if (!importers.has(d)) importers.set(d, []);
              importers.get(d).push(file);
            }
          function bfs(sources, stopAtTest) {
            const seen = new Set(sources), queue = [...seen], tests = [];
            for (let head = 0; head < queue.length; head++) {
              const f = queue[head];
              if (isTest(f)) { tests.push(f); if (stopAtTest) return tests; }
              for (const imp of importers.get(f) || [])
                if (!seen.has(imp)) { seen.add(imp); queue.push(imp); }
            }
            return tests;
          }
          const tests = bfs(changed, false).sort();
          const untested = [...new Set(changed)].filter((f) => !isTest(f) && bfs([f], true).length === 0).sort();
          return { tests, untested };
        }
        const g = { 'a.test.js': ['a.js'], 'a.js': ['util.js'], 'b.test.js': ['b.js'], 'b.js': [], 'util.js': [] };
        console.log(affectedTests(g, ['util.js']), affectedTests(g, ['b.js', 'orphan.js']));
      ` },
      complexity: `<p>O(V + E) for the main BFS. The gap check is O(C × (V + E)) in the worst case for C changed files, usually far less because it stops at the first test.</p>`
    },
    tests: { sig: 'int -> string', fn: 'chk', harness: { js: `
function chk(k) {
  var g = { 'a.test.js': ['a.js'], 'a.js': ['util.js'], 'b.test.js': ['b.js'], 'b.js': [], 'util.js': [] };
  if (k === 0) return affectedTests(g, ['util.js']);
  if (k === 1) return affectedTests(g, ['b.js', 'orphan.js']);
  if (k === 2) return affectedTests({ 'x.js': ['y.js'], 'y.js': ['x.js'], 'x.test.js': ['x.js'] }, ['y.js']);
  if (k === 3) return affectedTests(g, ['b.test.js']);
  if (k === 4) return affectedTests(g, []);
  if (k === 5) return affectedTests({ 'a.test.js': ['shared.js'], 'b.test.js': ['shared.js'], 'c.test.js': ['c.js'], 'shared.js': ['config.js'] }, ['config.js', 'c.js', 'config.js']);
  if (k === 6) { var big = { 't.test.js': ['m0'] }; for (var i = 0; i < 100000; i++) big['m' + i] = i < 99999 ? ['m' + (i + 1)] : []; return affectedTests(big, ['m99999', 'lone.js', 'm5000']); }
  if (k === 7) return affectedTests({ 'p.test.js': ['q.test.js'], 'q.test.js': ['lib.js'] }, ['lib.js', 'dead.js']);
}` }, cases: [
      [[0], { tests: ['a.test.js'], untested: [] }],
      [[1], { tests: ['b.test.js'], untested: ['orphan.js'] }],
      [[2], { tests: ['x.test.js'], untested: [] }],
      [[3], { tests: ['b.test.js'], untested: [] }],
      [[4], { tests: [], untested: [] }],
      [[5], { tests: ['a.test.js', 'b.test.js', 'c.test.js'], untested: [] }],
      [[6], { tests: ['t.test.js'], untested: ['lone.js'] }],
      [[7], { tests: ['p.test.js', 'q.test.js'], untested: ['dead.js'] }]
    ] }
  });

  practice.push({
    title: 'Retry Runner with Playwright Outcomes: expected, unexpected, flaky, skipped',
    level: 'Hard', tags: ['retries', 'flaky tests', 'state machine', 'playwright'], companies: ['Microsoft', 'Atlassian', 'Spotify'],
    statement: `<p>Write <code>runWithRetries(tests, opts)</code>. Each test is <code>{ title, attempts, skip?, expectFail? }</code> where <code>attempts</code> scripts the outcome of each run (<code>"pass"</code>/<code>"fail"</code>; when attempts run out, the last one repeats). Options: <code>{ retries, maxFailures = 0, failOnFlaky = false }</code>.</p>
      <ul><li>A run is <b>ok</b> if its outcome is <code>"fail"</code> for an <code>expectFail</code> test (Playwright's <code>test.fail()</code>), otherwise <code>"pass"</code>.</li>
      <li>Run a test until a run is ok or <code>retries + 1</code> runs were made. Status: ok on the first run → <code>"expected"</code>; ok on a later run → <code>"flaky"</code>; never ok → <code>"unexpected"</code>.</li>
      <li><code>skip</code> tests → <code>"skipped"</code> with 0 runs. Once <code>maxFailures &gt; 0</code> unexpected tests have happened, every later test is <code>"skipped"</code> with 0 runs.</li>
      <li>Return <code>{ results: [[title, status, runs]], stats: { expected, unexpected, flaky, skipped }, exitCode }</code> where exitCode is 1 if any unexpected, or if <code>failOnFlaky</code> and any flaky; else 0.</li></ul>`,
    constraints: `Up to 10<sup>4</sup> tests; 0 ≤ retries ≤ 10.`,
    example: `<p>retries = 2: a ["pass"] → ${H.c('g', 'expected, 1 run')}; b ["fail", "pass"] → ${H.c('y', 'flaky, 2 runs')}; c ["fail"] → ${H.c('r', 'unexpected, 3 runs')}; d skip → skipped. Exit code 1 because of c.</p>`,
    brute: { why: `<p>Reporting only "passed after retries" as plain green hides the flake: dashboards show 100% green while the suite wastes CI minutes and the race condition stays in the product. Retries must be visible as a separate outcome.</p>`,
      code: { lang: 'js', run: true, code: `
        function naiveRetry(attempts, retries) {
          for (let i = 0; i <= retries; i++) if (attempts[Math.min(i, attempts.length - 1)] === 'pass') return 'passed';
          return 'failed';
        }
        console.log(naiveRetry(['fail', 'fail', 'pass'], 2));   // "passed": the flake is invisible
      ` } },
    mcq: { q: 'With <code>test.fail()</code>, the test body suddenly passes. What does Playwright report?', options: ['A failure: the test was expected to fail, so passing is unexpected (time to remove the annotation)', 'Passed', 'Skipped', 'Flaky'], answer: 0, explain: 'test.fail() inverts expectations: failing is the expected outcome. A pass means the known bug got fixed, and Playwright flags it so you remove the annotation.' },
    hints: [
      `<p>Hint 1: Write <code>outcome(t, i) = t.attempts[Math.min(i, t.attempts.length - 1)]</code> and <code>ok = outcome === (t.expectFail ? "fail" : "pass")</code>.</p>`,
      `<p>Hint 2: Loop <code>runs</code> from 1 to retries + 1, break on ok. Status from (ok, runs).</p>`,
      `<p>Hint 3: Check skip and the maxFailures budget before running a test; count stats as you push results; compute exitCode at the end.</p>`
    ],
    solution: {
      approach: `<p>Each test is a tiny state machine: run, check against the expectation, retry while budget remains. A running count of unexpected results implements maxFailures, and the stats object is filled as results are recorded.</p>`,
      code: { lang: 'js', run: true, code: `
        function runWithRetries(tests, opts) {
          const { retries, maxFailures = 0, failOnFlaky = false } = opts;
          const stats = { expected: 0, unexpected: 0, flaky: 0, skipped: 0 }, results = [];
          for (const t of tests) {
            if (t.skip || (maxFailures > 0 && stats.unexpected >= maxFailures)) {
              stats.skipped++; results.push([t.title, 'skipped', 0]); continue;
            }
            const want = t.expectFail ? 'fail' : 'pass';
            let runs = 0, ok = false;
            while (runs < retries + 1 && !ok) {
              ok = t.attempts[Math.min(runs, t.attempts.length - 1)] === want;
              runs++;
            }
            const status = !ok ? 'unexpected' : runs === 1 ? 'expected' : 'flaky';
            stats[status]++;
            results.push([t.title, status, runs]);
          }
          const exitCode = stats.unexpected > 0 || (failOnFlaky && stats.flaky > 0) ? 1 : 0;
          return { results, stats, exitCode };
        }
        console.log(JSON.stringify(runWithRetries([
          { title: 'a', attempts: ['pass'] }, { title: 'b', attempts: ['fail', 'pass'] },
          { title: 'c', attempts: ['fail'] }, { title: 'd', skip: true, attempts: ['pass'] }
        ], { retries: 2 })));
      ` },
      complexity: `<p>O(tests × (retries + 1)).</p>`
    },
    tests: { sig: 'int -> string', fn: 'chk', harness: { js: `
function chk(k) {
  var four = [{ title: 'a', attempts: ['pass'] }, { title: 'b', attempts: ['fail', 'pass'] }, { title: 'c', attempts: ['fail'] }, { title: 'd', skip: true, attempts: ['pass'] }];
  if (k === 0) return runWithRetries(four, { retries: 2 });
  if (k === 1) return runWithRetries(four, { retries: 0 });
  if (k === 2) return runWithRetries([{ title: 'known bug', expectFail: true, attempts: ['fail'] }, { title: 'fixed bug', expectFail: true, attempts: ['pass'] }], { retries: 1 });
  if (k === 3) { var f = [{ title: 'f', attempts: ['fail', 'fail', 'pass'] }]; var r1 = runWithRetries(f, { retries: 2, failOnFlaky: true }), r2 = runWithRetries(f, { retries: 2 }); return [r1.results, r1.exitCode, r2.exitCode]; }
  if (k === 4) return runWithRetries([{ title: 'x', attempts: ['fail'] }, { title: 'y', attempts: ['pass'] }, { title: 'z', attempts: ['pass'] }], { retries: 1, maxFailures: 1 });
  if (k === 5) return runWithRetries([], { retries: 3 });
  if (k === 6) { var ts = []; for (var i = 0; i < 10000; i++) ts.push({ title: 't' + i, attempts: i % 3 === 0 ? ['fail', 'pass'] : ['pass'] }); var r = runWithRetries(ts, { retries: 1 }); return [r.stats, r.results.reduce(function (s, x) { return s + x[2]; }, 0), r.exitCode]; }
  if (k === 7) return runWithRetries([{ title: 'p', attempts: ['fail', 'fail', 'fail', 'pass'] }], { retries: 2 });
}` }, cases: [
      [[0], { results: [['a', 'expected', 1], ['b', 'flaky', 2], ['c', 'unexpected', 3], ['d', 'skipped', 0]], stats: { expected: 1, unexpected: 1, flaky: 1, skipped: 1 }, exitCode: 1 }],
      [[1], { results: [['a', 'expected', 1], ['b', 'unexpected', 1], ['c', 'unexpected', 1], ['d', 'skipped', 0]], stats: { expected: 1, unexpected: 2, flaky: 0, skipped: 1 }, exitCode: 1 }],
      [[2], { results: [['known bug', 'expected', 1], ['fixed bug', 'unexpected', 2]], stats: { expected: 1, unexpected: 1, flaky: 0, skipped: 0 }, exitCode: 1 }],
      [[3], [[['f', 'flaky', 3]], 1, 0]],
      [[4], { results: [['x', 'unexpected', 2], ['y', 'skipped', 0], ['z', 'skipped', 0]], stats: { expected: 0, unexpected: 1, flaky: 0, skipped: 2 }, exitCode: 1 }],
      [[5], { results: [], stats: { expected: 0, unexpected: 0, flaky: 0, skipped: 0 }, exitCode: 0 }],
      [[6], [{ expected: 6666, unexpected: 0, flaky: 3334, skipped: 0 }, 13334, 0]],
      [[7], { results: [['p', 'unexpected', 3]], stats: { expected: 0, unexpected: 1, flaky: 0, skipped: 0 }, exitCode: 1 }]
    ] }
  });

  practice.push({
    title: 'Mini Mutation Tester: Do Your Tests Notice When the Code Changes?',
    level: 'Hard', tags: ['mutation testing', 'test quality', 'parsing', 'Function constructor'], companies: ['Google', 'Atlassian', 'ThoughtWorks'],
    statement: `<p>Coverage says code <i>ran</i>; mutation testing asks whether tests would <i>notice</i> a bug. Write <code>mutationTest(source, params, cases)</code>. <code>source</code> is a JS expression whose tokens are separated by single spaces (e.g. <code>"a &gt; 0 &amp;&amp; b &gt; 0"</code>); the function under test is <code>new Function(...params, "return (" + source + ");")</code>. <code>cases</code> are <code>[args, expected]</code> pairs.</p>
      <ul><li>First run the original on every case; if case i fails (result not <code>Object.is</code> expected), throw <code>Error("original fails case " + i)</code>.</li>
      <li>Mutation operators (one token replaced per mutant, mutants in token order): <code>+ ↔ -</code>, <code>* ↔ /</code>, <code>&lt; → &lt;=</code>, <code>&lt;= → &lt;</code>, <code>&gt; → &gt;=</code>, <code>&gt;= → &gt;</code>, <code>=== ↔ !==</code>, <code>&amp;&amp; ↔ ||</code>, <code>true ↔ false</code>.</li>
      <li>A mutant is <b>killed</b> if some case's result differs (by Object.is) or it throws; otherwise it <b>survived</b>.</li>
      <li>Return <code>{ total, killed, survived, score }</code> with survived as strings <code>"tokenIndex:from-&gt;to"</code> and <code>score = total ? Math.floor(100 × killed / total) : 100</code>.</li></ul>`,
    constraints: `Up to 300 tokens and 50 cases.`,
    example: `<p><code>"a &gt; 0 &amp;&amp; b &gt; 0"</code> with cases (1,1)→true and (−1,1)→false: mutant <code>a &gt;= 0</code> survives (no case has a = 0), <code>&amp;&amp; → ||</code> is killed by (−1,1), <code>b &gt;= 0</code> survives (no case has b = 0). ${H.c('r', 'score 33')}: the tests never probe the boundaries. Add (0,1)→false and (1,0)→false and the score becomes ${H.c('g', '100')}.</p>`,
    brute: { why: `<p>Judging test quality by coverage alone: the two cases above already give 100% line and branch coverage of the expression, yet two boundary bugs would ship. Only mutating the code and re-running the tests reveals the gap.</p>`,
      code: { lang: 'js', run: true, code: `
        const f = (a, b) => a > 0 && b > 0;
        const buggy = (a, b) => a >= 0 && b > 0;              // a realistic off-by-one
        const cases = [[[1, 1], true], [[-1, 1], false]];
        console.log(cases.every(([args, want]) => buggy(...args) === want)); // true: the suite cannot tell
      ` } },
    mcq: { q: 'A mutant changes <code>a &lt;= b ? a : b</code> (min) to <code>a &lt; b ? a : b</code> and no test can kill it. Why?', options: ['It is an equivalent mutant: when a equals b both branches return the same value', 'The tests are missing a case', 'The mutation operator is wrong', 'Mutation testing does not work on ternaries'], answer: 0, explain: 'Some mutants behave identically to the original for every input. They survive no matter what, which is why a 100% mutation score is not always reachable and survivors need human review.' },
    hints: [
      `<p>Hint 1: <code>tokens = source.split(" ")</code>; a lookup object maps each mutable token to its replacement.</p>`,
      `<p>Hint 2: Write <code>compile(tokens)</code> → <code>new Function(...params, "return (" + tokens.join(" ") + ");")</code> and <code>passesAll(fn)</code> with try/catch (a throw means failing).</p>`,
      `<p>Hint 3: Check the original first. For each index with a mapping, copy the tokens, replace one, compile, and record killed or survived. Compute the floor score at the end.</p>`
    ],
    solution: {
      approach: `<p>Tokenize once, generate one mutant per mutable token with an operator table, compile each mutant with the Function constructor and run the same cases. Any differing result or exception kills it.</p>`,
      code: { lang: 'js', run: true, code: `
        const MUTATE = { '+': '-', '-': '+', '*': '/', '/': '*', '<': '<=', '<=': '<', '>': '>=', '>=': '>',
          '===': '!==', '!==': '===', '&&': '||', '||': '&&', 'true': 'false', 'false': 'true' };

        function mutationTest(source, params, cases) {
          const tokens = source.split(' ');
          const compile = (toks) => new Function(...params, 'return (' + toks.join(' ') + ');');
          const failingCase = (fn) => {
            for (let i = 0; i < cases.length; i++) {
              try { if (!Object.is(fn(...cases[i][0]), cases[i][1])) return i; }
              catch (e) { return i; }
            }
            return -1;
          };
          const bad = failingCase(compile(tokens));
          if (bad >= 0) throw new Error('original fails case ' + bad);

          let total = 0, killed = 0;
          const survived = [];
          tokens.forEach((tok, i) => {
            if (!Object.prototype.hasOwnProperty.call(MUTATE, tok)) return;
            total++;
            const mutant = tokens.slice();
            mutant[i] = MUTATE[tok];
            if (failingCase(compile(mutant)) >= 0) killed++;
            else survived.push(i + ':' + tok + '->' + MUTATE[tok]);
          });
          return { total, killed, survived, score: total ? Math.floor((100 * killed) / total) : 100 };
        }

        console.log(mutationTest('a > 0 && b > 0', ['a', 'b'], [[[1, 1], true], [[-1, 1], false]]));
        console.log(mutationTest('a > 0 && b > 0', ['a', 'b'], [[[1, 1], true], [[0, 1], false], [[1, 0], false]]));
      ` },
      complexity: `<p>O(M × C × E): M mutants, C cases, E cost of evaluating the expression, plus compiling each mutant. Real tools (Stryker) cut this with coverage analysis: only tests that cover the mutated line are run.</p>`
    },
    tests: { sig: 'int -> string', fn: 'chk', harness: { js: `
function chk(k) {
  var at = function (f) { try { return f(); } catch (e) { return e.message; } };
  if (k === 0) return mutationTest('a > 0 && b > 0', ['a', 'b'], [[[1, 1], true], [[0, 1], false], [[1, 0], false]]);
  if (k === 1) return mutationTest('a > 0 && b > 0', ['a', 'b'], [[[1, 1], true], [[-1, 1], false]]);
  if (k === 2) return mutationTest('x * 2 + 1', ['x'], [[[0], 1], [[3], 7]]);
  if (k === 3) return mutationTest('x * 2 + 1', ['x'], [[[0], 1]]);
  if (k === 4) return mutationTest('n === 0 || false', ['n'], [[[0], true], [[5], false]]);
  if (k === 5) return mutationTest('a <= b ? a : b', ['a', 'b'], [[[1, 2], 1], [[2, 1], 1], [[3, 3], 3]]);
  if (k === 6) return at(function () { return mutationTest('a + b', ['a', 'b'], [[[1, 2], 4]]); });
  if (k === 7) return mutationTest('a', ['a'], [[[1], 1]]);
  if (k === 8) { var t = ['a']; for (var i = 0; i < 100; i++) t.push('+', 'a'); var r = mutationTest(t.join(' '), ['a'], [[[1], 101]]); return [r.total, r.killed, r.score]; }
}` }, cases: [
      [[0], { total: 3, killed: 3, survived: [], score: 100 }],
      [[1], { total: 3, killed: 1, survived: ['1:>->>=', '5:>->>='], score: 33 }],
      [[2], { total: 2, killed: 2, survived: [], score: 100 }],
      [[3], { total: 2, killed: 1, survived: ['1:*->/'], score: 50 }],
      [[4], { total: 3, killed: 3, survived: [], score: 100 }],
      [[5], { total: 1, killed: 0, survived: ['1:<=-><'], score: 0 }],
      [[6], 'original fails case 0'],
      [[7], { total: 0, killed: 0, survived: [], score: 100 }],
      [[8], [100, 100, 100]]
    ] }
  });

  /* =====================================================================
     QUIZ
     ===================================================================== */
  quiz.push({ q: `What does <code>expect({ a: 1 }).toBe({ a: 1 })</code> do?`, options: ['Fails: toBe uses Object.is, and these are two different objects', 'Passes: the contents are the same', 'Throws a syntax error', 'Passes only in Vitest'], answer: 0, explain: `toBe checks identity. Use toEqual or toStrictEqual to compare contents.` });
  quiz.push({ q: `Which assertion FAILS?`, options: ['<code>expect({ a: 1, b: undefined }).toStrictEqual({ a: 1 })</code>', '<code>expect({ a: 1, b: undefined }).toEqual({ a: 1 })</code>', '<code>expect(NaN).toBe(NaN)</code>', '<code>expect([1, 2]).toEqual([1, 2])</code>'], answer: 0, explain: `toStrictEqual counts keys whose value is undefined; toEqual ignores them. Object.is(NaN, NaN) is true.` });
  quiz.push({ q: `With one outer and one inner <code>describe</code>, in which order do the afterEach hooks run after an inner test?`, options: ['Inner afterEach, then outer afterEach', 'Outer afterEach, then inner afterEach', 'In declaration order of the file', 'Only the inner one runs'], answer: 0, explain: `Setup goes outside-in and teardown inside-out, like nested try/finally blocks.` });
  quiz.push({ q: `An async test calls <code>fetchUser().then(u =&gt; expect(u.name).toBe('Ada'))</code> without <code>await</code> or <code>return</code>. What happens if the name is wrong?`, options: ['The test likely passes, because it finished before the assertion ran', 'The test fails with a clear message', 'The runner waits automatically for all promises', 'It throws a syntax error'], answer: 0, explain: `The runner only waits for a returned promise. A floating promise's assertion runs after the test is already marked as passed.` });
  quiz.push({ q: `What is the difference between <code>mockClear()</code> and <code>mockReset()</code> in Jest?`, options: ['mockClear empties calls/results; mockReset also removes programmed implementations and return values', 'They are identical', 'mockReset restores the original method of a spy', 'mockClear removes the implementation'], answer: 0, explain: `mockRestore is the one that also puts a spied method back. In Vitest 3, mockReset resets to the original implementation passed to vi.fn.` });
  quiz.push({ q: `With fake timers on, which call is unsafe when the code has a <code>setInterval</code> that never stops?`, options: ['runAllTimers()', 'advanceTimersByTime(1000)', 'runOnlyPendingTimers()', 'getTimerCount()'], answer: 0, explain: `runAllTimers keeps firing until no timers remain, which never happens with a live interval; it aborts at the loop limit.` });
  quiz.push({ q: `Code does <code>await check(); setTimeout(next, 1000)</code>. The test calls it, then immediately <code>vi.advanceTimersByTime(1000)</code>. Why does next not run?`, options: ['The setTimeout has not been scheduled yet because the await has not resumed; use advanceTimersByTimeAsync', 'Fake timers do not support setTimeout', 'The delay must be smaller', 'next must be a spy'], answer: 0, explain: `Fake timers do not control the microtask queue. The async variant flushes promises between steps.` });
  quiz.push({ q: `Why does <code>vi.mock('./api', () =&gt; ({ get: fakeGet }))</code> fail with a ReferenceError when <code>const fakeGet = vi.fn()</code> is declared above it?`, options: ['vi.mock is hoisted above the declaration, so fakeGet is in its temporal dead zone; use vi.hoisted', 'vi.mock cannot use vi.fn', 'Factories must be async', 'The path must be absolute'], answer: 0, explain: `Mocks are registered before imports run, which means before your const line. Jest has the same rule (only mock-prefixed names allowed).` });
  quiz.push({ q: `In MSW, how do you make one test return a 500 for an endpoint that normally succeeds?`, options: ['server.use(http.get(url, () =&gt; new HttpResponse(null, { status: 500 }))) and resetHandlers in afterEach', 'Edit the shared handlers array inside the test', 'Mock global fetch with mockRejectedValue', 'Stop the server'], answer: 0, explain: `server.use prepends runtime handlers so they win; resetHandlers removes them after the test.` });
  quiz.push({ q: `Which React Testing Library query should you prefer for a submit button?`, options: ['getByRole("button", { name: /submit/i })', 'getByTestId("submit-btn")', 'container.querySelector(".btn-submit")', 'getByText("Submit") on a div'], answer: 0, explain: `Role queries match what users and assistive technology perceive; test ids are the last resort.` });
  quiz.push({ q: `You need to assert that an error banner is NOT on the screen. Which query?`, options: ['queryByRole("alert") expecting null', 'getByRole("alert") expecting null', 'findByRole("alert")', 'getAllByRole("alert") expecting []'], answer: 0, explain: `getBy and getAllBy throw when nothing matches; queryBy returns null.` });
  quiz.push({ q: `Why are Playwright tests with locators less flaky than tests with fixed waits?`, options: ['Actions auto-wait for the element to be visible, stable and enabled, and expect(locator) assertions retry until a timeout', 'Playwright runs tests slower', 'Locators cache DOM nodes forever', 'Playwright disables animations in the app code'], answer: 0, explain: `Auto-waiting plus web-first assertions replace sleep-based guessing with condition-based waiting.` });
  quiz.push({ q: `A single test calls <code>fee(true)</code> for <code>let f = 10; if (vip) f = 0; return f;</code>. What are line and branch coverage?`, options: ['Lines 100%, branches 50%', 'Lines 50%, branches 50%', 'Both 100%', 'Lines 100%, branches 0%'], answer: 0, explain: `Every line ran but only the true outcome of the if was taken.` });
  quiz.push({ q: `A test passes and fails on the SAME commit across CI runs. What is the best first response?`, options: ['Treat it as flaky: quarantine with an owner, reproduce with repeated runs, and fix the root cause', 'Add three retries and move on', 'Delete the test', 'Increase every timeout to 60 s'], answer: 0, explain: `Same code, different result means nondeterminism. Retries only hide it; the cause (timing, shared state, network, randomness) must be fixed.` });
  quiz.push({ q: `Which statement about 100% coverage is true?`, options: ['It proves every line ran, not that any assertion checked the results', 'It proves the code has no bugs', 'It means mutation testing will score 100%', 'It is required by Jest to run tests'], answer: 0, explain: `Coverage measures execution. Mutation testing measures whether tests detect changes.` });

  /* =====================================================================
     INTERVIEW
     ===================================================================== */
  interview.push({ q: `Explain the test pyramid and the testing trophy. How would you split tests for a React front end?`, a: `<p>The <b>pyramid</b> says: many fast unit tests, fewer integration tests, very few slow E2E tests, because cost and flakiness grow as you go up. The <b>trophy</b> (Kent C. Dodds) adapts it to front ends: static analysis (TypeScript, ESLint) at the base, a thin layer of unit tests for pure logic, the <b>largest</b> layer of integration tests (component + hooks + data layer with MSW, using React Testing Library), and a few E2E tests for critical journeys. For a React app I would unit-test reducers, formatters and validation; integration-test each screen's behaviour (render, type, click, see result, error states) with MSW at the network edge; and keep 5–20 Playwright tests for sign-up, checkout and other money paths, run on every PR with traces on retry. The rule behind both shapes: buy the most confidence per second of CI time and per hour of maintenance.</p>`, level: 'I', followUps: ['When would you invert the pyramid?', 'Where do visual regression and contract tests fit?', 'How do you keep the E2E layer from growing out of control?'] });
  interview.push({ q: `What is the difference between toBe, toEqual and toStrictEqual? Give a case where each one matters.`, a: `<p><code>toBe</code> uses <code>Object.is</code>: right for primitives and for checking that a cache returns the <b>same instance</b>. <code>toEqual</code> compares recursively by value and ignores properties whose value is <code>undefined</code> and the object's class: good for plain data. <code>toStrictEqual</code> also requires the same keys including undefined ones, the same class (prototype) and matching sparseness: safest for API payloads, where <code>{ id: 1, name: undefined }</code> vs <code>{ id: 1 }</code> is a real difference once serialized. Gotchas: <code>expect(0).toEqual(-0)</code> fails because primitives use Object.is; <code>expect(NaN).toBe(NaN)</code> passes; floats need <code>toBeCloseTo</code>. For partial checks use <code>toMatchObject</code> or <code>expect.objectContaining</code>.</p>`, level: 'B', followUps: ['How does toEqual handle circular objects?', 'When would you write a custom matcher?', 'What do asymmetric matchers solve?'] });
  interview.push({ q: `Mocks, stubs, spies and fakes: what is the difference, and when do you mock?`, a: `<p>A <b>stub</b> returns canned answers; a <b>spy</b> records calls while (optionally) keeping real behaviour; a <b>mock</b> is a double you assert interactions on; a <b>fake</b> is a working lightweight implementation (in-memory repo, fake timers, MSW). In Jest/Vitest, <code>jest.fn()</code>/<code>vi.fn()</code> covers stub/spy/mock and <code>spyOn</code> wraps existing methods. I mock what is slow, nondeterministic or not mine: network, clock, randomness, payment/analytics SDKs, at the <b>boundary</b>. I avoid mocking the unit's own collaborators inside the module, because then tests mirror the implementation and break on refactors while missing real bugs. I prefer dependency injection or a fake over module mocking, and configure <code>restoreMocks</code> so doubles never leak between tests.</p>`, level: 'I', followUps: ['Explain mockClear vs mockReset vs mockRestore.', 'Why can spying on an ESM export fail?', 'What is the London vs Detroit school of TDD?'] });
  interview.push({ q: `How do fake timers work, and what goes wrong when timers and promises interleave?`, a: `<p>Fake timers (Jest's modern timers and Vitest, both built on <code>@sinonjs/fake-timers</code>) replace <code>setTimeout</code>, <code>setInterval</code>, <code>Date</code> and friends with a virtual clock holding a sorted list of timers. <code>advanceTimersByTime(ms)</code> repeatedly takes the earliest due timer, sets the clock to its time and runs it, including timers created along the way, then parks the clock at the target. Promises are <b>not</b> faked: their callbacks live in the engine's microtask queue, which only drains when your test awaits. So code like <code>await fetch(); setTimeout(retry, 1000)</code> has not scheduled its timer when a synchronous advance runs. The fix is <code>await vi.advanceTimersByTimeAsync(ms)</code> (Jest 29.5+ has the same), which flushes microtasks between timers. Also: use <code>runOnlyPendingTimers</code> with intervals, restore real timers in afterEach, and be careful faking <code>nextTick</code> because some libraries depend on it.</p>`, level: 'I', followUps: ['How would you test exponential backoff with jitter?', 'What does setSystemTime change and not change?', 'Why can a test hang with fake timers?'] });
  interview.push({ q: `How do jest.mock and vi.mock work under the hood? Why are they hoisted?`, a: `<p>Imports are evaluated before the rest of the file, so a mock must be registered <b>before</b> the module under test imports the dependency. Jest's <code>babel-plugin-jest-hoist</code> moves <code>jest.mock()</code> calls to the top of the file (after Babel turned imports into requires), and <code>jest-runtime</code> consults its mock registry on every require. Because the factory runs before your variables are initialized, Jest only allows out-of-scope variables whose names start with <code>mock</code>. Native ESM links imports before running any code, so Jest needs <code>jest.unstable_mockModule</code> plus a dynamic <code>await import()</code>. Vitest hoists <code>vi.mock</code> in its Vite transform and rewrites static imports in the test file into dynamic imports, so ESM mocking just works; <code>vi.hoisted()</code> declares values that are hoisted along with it, and <code>importOriginal</code> lets you keep real exports. Mocks are per test file because each file has its own module registry.</p>`, level: 'A', followUps: ['How do you mock only one export of a module?', 'What is __mocks__ automocking?', 'How do you reset module state between tests (resetModules)?'] });
  interview.push({ q: `Why do many teams prefer MSW over mocking fetch or axios directly?`, a: `<p>Mocking fetch couples tests to the HTTP client and to call order: switching from fetch to axios, adding a header, or adding a second request breaks every test, and the mocked object often lacks <code>ok</code>, <code>status</code> or <code>headers</code>, so error paths are not really tested. <b>MSW</b> intercepts at the network layer (interceptors for http/fetch/XHR in Node, a Service Worker in the browser) and answers from route handlers with real <code>Request</code>/<code>Response</code> objects. Your fetch wrapper, retries, JSON parsing and UI states all run for real. Handlers are declared once and reused in unit, integration tests, Storybook and local dev; tests override them with <code>server.use()</code> and clean up with <code>resetHandlers()</code>; <code>onUnhandledRequest: 'error'</code> guarantees no test silently hits a real server. The trade-off is contract drift, which you control by generating handlers or types from the OpenAPI spec and adding a few contract or staging tests.</p>`, level: 'I', followUps: ['How would you test a loading spinner with MSW?', 'How do you simulate a network failure vs an HTTP 500?', 'How do you keep MSW fixtures in sync with the real API?'] });
  interview.push({ q: `What are the guiding principles of React Testing Library? What does a good component test look like?`, a: `<p>RTL's principle is <i>"the more your tests resemble the way your software is used, the more confidence they give you"</i>. So: render the component with real children; find elements the way users do, by role and accessible name first (<code>getByRole('button', { name: /save/i })</code>), then label, then text, with test ids as a last resort; interact with <code>userEvent</code> (<code>const user = userEvent.setup(); await user.click(...)</code>), which simulates real event sequences; and assert on visible outcomes (<code>findByRole('status')</code>, <code>toBeVisible</code>, <code>toHaveTextContent</code>), not on state, props or hook calls. Use <code>queryBy</code> for absence and <code>findBy</code> for things that appear asynchronously; avoid manual <code>act()</code> and side effects inside <code>waitFor</code>. Mock at the network edge with MSW. A good test reads like a user story and survives refactors such as useState → useReducer.</p>`, level: 'I', followUps: ['Why is getByRole slow on big trees and what can you do?', 'When is jsdom not enough?', 'How do you test a custom hook?'] });
  interview.push({ q: `How does Playwright reduce flakiness compared to older E2E tools?`, a: `<p>Four mechanisms. <b>Auto-waiting</b>: before an action, Playwright waits until the element is attached, visible, stable (not animating), enabled and actually receives events at the click point, instead of you guessing with sleeps. <b>Web-first assertions</b>: <code>await expect(locator).toHaveText('Paid')</code> retries until it passes or times out (5 s default). <b>Locators</b> are lazy and re-resolved on every use, so a re-render that replaces the DOM node does not cause stale-element errors, and they are strict, failing if they match several elements. <b>Isolation</b>: every test gets a fresh browser context (cookies, storage) cheaply, so tests do not leak state. Add <code>page.route</code> for deterministic network data, <code>storageState</code> to reuse login from a setup project, retries with <code>trace: 'on-first-retry'</code> for debugging, and per-worker test data so parallel workers never share an account.</p>`, level: 'I', followUps: ['How do you handle authentication across many tests?', 'How do you debug a test that only fails in CI?', 'When would you mock the network in E2E and when not?'] });
  interview.push({ q: `What does code coverage tell you and what does it not? How would you set a coverage policy?`, a: `<p>Coverage tells you which statements, branches and functions <b>executed</b> during tests. It is excellent at showing what was <b>never</b> exercised. It does not tell you whether anything was asserted, whether the right behaviour was checked, or whether a missing case (code you never wrote) exists; a test with no expect can reach 100%. Branch coverage is the most informative metric. My policy: collect coverage on every CI run (V8 provider in Vitest, or Istanbul), enforce a reasonable floor (say 80% branches) with <code>coverage.thresholds</code>/<code>coverageThreshold</code> so it cannot silently drop, gate on <b>patch coverage</b> of changed lines rather than chasing a global number, exclude generated code, and periodically run <b>mutation testing</b> (Stryker) on critical modules to check that tests actually catch changes. Never set 100% as a target: it rewards trivial tests.</p>`, level: 'I', followUps: ['V8 vs Istanbul coverage: trade-offs?', 'What is an equivalent mutant?', 'How do you merge coverage from unit and E2E runs?'] });
  interview.push({ q: `A test fails about once every 20 CI runs. Walk me through how you handle it.`, a: `<p>First confirm it is flaky, not broken: look at history for passes and failures on the <b>same commit</b>. Then contain it: quarantine (skip in the blocking job but keep running it in a non-blocking job), assign an owner and a deadline, so the main build stays trustworthy. Reproduce: run it in a loop (<code>--repeat-each=50</code> in Playwright, a loop or <code>--sequence.shuffle</code> in Vitest, <code>--randomize</code> in Jest), under CPU stress or with more workers, and collect traces, logs and screenshots. Check the usual causes: real time and sleeps (use fake timers or web-first assertions), order dependence and shared state (fresh setup per test), real network and shared test data (MSW, per-worker data), randomness, dates, time zones and locale (seed, setSystemTime, fixed TZ), and races between UI and async work (await the visible result). Fix the root cause, run the loop again to verify, and un-quarantine. Retries are only a temporary bandage and must be reported as "flaky", not "passed".</p>`, level: 'A', followUps: ['How would you build automatic flaky-test detection?', 'When is a retry acceptable?', 'How do you prevent new flaky tests from being merged?'] });
  interview.push({ q: `How would you use TDD in a live coding interview without slowing down?`, a: `<p>I use a light version. After clarifying the problem I write 4–6 example cases as a small table: a normal case, the empty input, a single element, duplicates or ties, a boundary value and an invalid input if relevant. That takes two minutes, confirms my understanding with the interviewer and often reveals the edge cases that shape the algorithm. Then I code the simplest correct approach, turn the table into asserts with a tiny helper (<code>const eq = (a, b) =&gt; console.assert(JSON.stringify(a) === JSON.stringify(b), a, b)</code>) and run them. When one fails I debug from that case. In a practical "build a feature" interview I go further: red → green → refactor per behaviour, committing in small steps. This shows the interviewer how I would work on the team, and it catches off-by-one errors before they do.</p>`, level: 'B', followUps: ['What are the downsides of strict TDD?', 'How does property-based testing complement example tests?', 'How do you choose which edge cases to test first?'] });
  interview.push({ q: `Snapshot tests: when are they useful and how do they go wrong?`, a: `<p>Snapshots store the serialized output once and fail when it changes. They are useful for <b>small, stable, reviewed</b> outputs: an error message, a generated config, a CLI's help text, a compact component tree, ideally as <code>toMatchInlineSnapshot</code> so the expected value sits in the test file. They go wrong when they are huge (nobody reads the 300-line diff, so <code>-u</code> becomes a reflex and the test asserts nothing), when they contain non-deterministic data (dates, ids: use fake time or property matchers like <code>toMatchSnapshot({ id: expect.any(String) })</code>), when they capture implementation details that change on every refactor, and when CI writes new snapshots (run Jest with <code>--ci</code> so missing snapshots fail). Obsolete snapshots should be cleaned with <code>-u</code>. If you cannot say which behaviour a snapshot protects, replace it with two or three targeted assertions.</p>`, level: 'I', followUps: ['How are snapshot keys named and why does order matter?', 'What is visual regression testing and how is it different?', 'How do you review snapshot changes in a PR?'] });
  interview.push({ q: `Jest or Vitest for a new TypeScript project in 2026, and what changes when migrating?`, a: `<p>For a Vite-based or ESM-first TypeScript project I would choose <b>Vitest</b>: it reuses the Vite config (aliases, plugins, TS and JSX transforms without Babel), handles native ESM and module mocking smoothly, is fast in watch mode, and has a Jest-compatible API (<code>describe</code>, <code>it</code>, <code>expect</code>, snapshots) plus extras like Browser Mode, <code>expect.poll</code>, in-source tests and workspaces/projects. Jest remains a solid choice for existing large suites and React Native, and Jest 30 improved ESM and performance. Migrating is mostly mechanical: replace <code>jest.fn/mock/spyOn</code> with <code>vi.*</code>, import globals or enable <code>globals: true</code>, convert <code>done</code> callbacks to promises, turn <code>jest.requireActual</code> into <code>importOriginal</code>, move variables used in mock factories into <code>vi.hoisted</code>, check fake-timer differences (Vitest does not fake nextTick by default) and mockReset semantics, and port config such as setupFiles, environment (jsdom/happy-dom) and coverage thresholds.</p>`, level: 'A', followUps: ['What is the cost of test isolation (forks vs threads)?', 'How would you run the same tests in a real browser?', 'How do you speed up a slow test suite?'] });

  registerModule({
    id: 'js16',
    title: 'Testing JavaScript: Unit, Integration & E2E',
    intro: `<p>This module takes you from "I can write an <code>it()</code>" to "I can design and debug a test suite" in Jest, Vitest, React Testing Library and Playwright. You will see what an assertion really is (a function that throws), how deep equality and asymmetric matchers work, and how the test runner collects tests and wraps them in setup and teardown hooks, including async tests.</p>
      <p>Then come the tools that make tests fast and deterministic: <b>mocks, spies and stubs</b>, <b>fake timers</b>, <b>module mocking</b> and <b>MSW</b> for the network. After that, <b>integration and E2E</b> tests with RTL's user-centred queries and Playwright's auto-waiting locators. The last topic covers <b>coverage and its limits</b>, <b>flaky tests</b> and <b>TDD in interviews</b>. It builds on the Tooling, Build &amp; Testing module of the front-end track and goes deeper on how these tools work inside.</p>
      <p>Each topic has an analogy, a step-by-step visualizer, worked examples, a deep dive and AI-era advice. The guided and practice problems have you build small versions of the tools in plain JavaScript (expect, a runner, a mock, a fake clock, a handler router, getByRole, a coverage calculator, a flaky-test detector, a mutation tester), so you understand them well enough to explain them in an interview.</p>`,
    goals: [
      'Choose the right matcher (toBe, toEqual, toStrictEqual, toBeCloseTo, asymmetric matchers) and explain how deep equality and snapshot testing work and fail',
      'Predict the hook order of nested describe blocks, keep tests isolated, and write async tests that cannot pass vacuously',
      'Use mocks, spies, stubs and fakes at the right boundary, and explain mockClear vs mockReset vs mockRestore',
      'Test timers, debounce and retries with fake timers, including the promise/timer interleaving trap',
      'Mock modules with jest.mock/vi.mock (hoisting, partial mocks) and the network with MSW handlers and per-test overrides',
      'Write user-centred integration tests with React Testing Library and stable E2E tests with Playwright locators, web-first assertions and isolation',
      'Explain what coverage measures and misses, run a flaky-test process, and use TDD-lite in a coding interview'
    ],
    prereqs: `JS 7 (Asynchronous JavaScript: callbacks, promises, async/await and the event loop) and JS 9 (modules, iterators, Map/Set, Proxy). Some React helps for the Testing Library examples. The front-end module "Tooling, Build &amp; Testing" introduces Jest, Vitest, RTL and Playwright; this module goes deeper.`,
    hours: 12,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
