(function () { var topics = [], practice = [], quiz = [], interview = [];

// C# and TypeScript snippet helpers.
function CS(code, title) { var o = { lang: 'csharp', code: code }; if (title) o.title = title; return o; }
function TS(code, title) { var o = { lang: 'ts', code: code }; if (title) o.title = title; return o; }

// Coding problem builder: brute force and solution are both C#.
function P(o) {
  return {
    title: o.t, level: o.l, tags: o.tags, companies: o.co,
    statement: o.s, constraints: o.c, example: o.ex,
    brute: { why: o.bw, code: CS(o.bc) },
    mcq: { q: o.q[0], options: o.q[1], answer: o.q[2], explain: o.q[3] },
    hints: ['<p>Hint 1: ' + o.h[0] + '</p>', '<p>Hint 2: ' + o.h[1] + '</p>', '<p>Hint 3: ' + o.h[2] + '</p>'],
    solution: { approach: o.a, code: CS(o.sc), dry: { head: o.dh, rows: o.dr }, complexity: o.cx, followUps: o.f }
  };
}

// Parse a list of integers from a visualizer input box.
function ints(text, max) {
  var a = String(text).trim().split(/[\s,]+/).filter(function (x) { return x !== ''; }).map(Number);
  if (!a.length || a.some(function (x) { return isNaN(x) || Math.floor(x) !== x; })) throw new Error('Enter whole numbers separated by spaces, for example: 2 7 11 15');
  if (a.length > max) throw new Error('Use at most ' + max + ' numbers');
  return a;
}

// ---------- TOPIC 1 ----------
topics.push({
  title: 'How to Approach a Coding Question Out Loud',
  analogy: `<p>Think of a <b>plumber</b> you called for a leak. A good one does not start cutting pipes. They ask where the water comes from, look at the pipe, tell you the simple fix and the better fix, do the work, then <b>turn the tap on to test it</b> before they leave. A coding round is the same visit. The interviewer is the home owner, and they are watching <i>how you work</i>, not only whether the leak stops.</p>`,
  explain: `<p><b>The plain idea:</b> every coding question, easy or hard, is answered with the same 5 steps. Say each step out loud, so the interviewer can follow your thinking and help you.</p>
    <ol>
      <li><b>Restate and ask.</b> Repeat the problem in your own words. Ask about the input: how big, can it be empty or null, are there duplicates, negatives, upper and lower case?</li>
      <li><b>Work one small example by hand.</b> Write the input and the expected output. Name 2 or 3 edge cases (empty, one item, all the same).</li>
      <li><b>Give the brute force first.</b> The slow, obvious answer, with its cost. Then improve it with a known pattern.</li>
      <li><b>Write clean code.</b> Good names, small helper methods, no clever tricks you cannot explain.</li>
      <li><b>Test and state the cost.</b> Walk your example through the code line by line (a <b>dry run</b>), then one edge case. Finish with time and space <b>Big-O</b>, which is how the work grows as the input grows.</li>
    </ol>
    <p><b>Patterns and the words that signal them:</b></p>
    <table>
      <thead><tr><th>Pattern</th><th>Words in the question</th></tr></thead>
      <tbody>
        <tr><td>Hash map or hash set</td><td>count, duplicates, pair that adds up to, anagram</td></tr>
        <tr><td>Two pointers</td><td>sorted array, palindrome, remove in place</td></tr>
        <tr><td>Sliding window</td><td>longest or shortest substring or subarray with a rule</td></tr>
        <tr><td>Prefix sums</td><td>many range sums, subarray sum equals K</td></tr>
        <tr><td>Stack</td><td>matching brackets, next greater element</td></tr>
        <tr><td>Binary search</td><td>sorted data, "smallest value that satisfies"</td></tr>
        <tr><td>BFS or DFS</td><td>grid, islands, shortest path, connected</td></tr>
        <tr><td>Dynamic programming</td><td>how many ways, minimum cost, overlapping sub-problems</td></tr>
        <tr><td>Heap</td><td>top K, merge K sorted lists, running median</td></tr>
      </tbody>
    </table>`,
  clues: ['"Walk me through your thinking"', '"What is the time and space complexity?"', '"Can you do better than O(n<sup>2</sup>)?"', '"What edge cases would you test?"', '"Assume the input fits in memory" or "n can be up to 10<sup>5</sup>": a size limit tells you the target Big-O', '"Do it in place" or "without extra space": O(1) space is expected', '"You may use any language": pick the one you can type without looking things up'],
  code: [CS(`// Step 3a: brute force. Try every pair. O(n^2) time, O(1) space.
static int[] TwoSumBrute(int[] nums, int target)
{
    for (int i = 0; i < nums.Length; i++)
        for (int j = i + 1; j < nums.Length; j++)
            if (nums[i] + nums[j] == target) return new[] { i, j };
    return new int[0];
}`), CS("static int[] TwoSum(int[] nums, int target)\n{\n    var seen = new Dictionary<int, int>();      // value -> index\n    for (int i = 0; i < nums.Length; i++)\n    {\n        if (seen.TryGetValue(target - nums[i], out int j)) return new[] { j, i };\n        seen[nums[i]] = i;\n    }\n    return new int[0];                          // no pair\n}   // O(n) time, O(n) space")],
  codeTitle: ['Say the brute force first (C#)', 'Then the improved answer: one pass with a hash map (C#)'],
  viz: {
    title: 'The 5 steps on one question: Two Sum',
    input: '2 7 11 15 | 9',
    inputLabel: 'Numbers | target',
    gen: function (input) {
      var parts = String(input).split('|');
      if (parts.length !== 2) throw new Error('Use the format: 2 7 11 15 | 9');
      var a = ints(parts[0], 10), target = ints(parts[1], 1)[0];
      var code = 'var seen = new Dictionary<int, int>();   // value -> index\nfor (int i = 0; i < nums.Length; i++)\n{\n    if (seen.TryGetValue(target - nums[i], out int j))\n        return new[] { j, i };\n    seen[nums[i]] = i;\n}\nreturn new int[0];';
      var frames = [];
      frames.push({ narr: '<b>Step 1, restate and ask.</b> "I get a list of whole numbers and a target. I return the positions of 2 numbers that add up to the target." Ask: can numbers repeat? Is there always an answer? Can I use the same item twice?', parts: [{ type: 'array', label: 'nums', values: a, showIdx: true }, { type: 'vars', vals: { target: target } }] });
      frames.push({ narr: '<b>Step 2, small example and edge cases.</b> Write the input you see here and the answer you expect. Edge cases to name: empty list, no valid pair, the same value twice such as 3 + 3 = 6.', parts: [{ type: 'array', label: 'nums', values: a, showIdx: true }, { type: 'table', label: 'Edge cases to say out loud', columns: ['Case', 'Expected'], rows: [['empty list', 'empty result'], ['no pair adds up', 'empty result'], ['3, 3 with target 6', 'positions 0 and 1']] }] });
      var pairs = a.length * (a.length - 1) / 2;
      frames.push({ narr: '<b>Step 3, brute force.</b> Try every pair: ' + a.length + ' numbers give <b>' + pairs + '</b> pairs. That is O(n<sup>2</sup>) time. Then improve: "for each number I need to know if (target - number) was seen before. A hash map answers that in O(1)."', parts: [{ type: 'table', label: 'Brute force vs improved', columns: ['Approach', 'Time', 'Space'], rows: [['Every pair, 2 loops', 'O(n^2)', 'O(1)'], ['One pass + hash map', 'O(n)', 'O(n)']], hl: { 1: 'sel' } }] });
      var seen = [], found = null;
      for (var i = 0; i < a.length && !found; i++) {
        var want = target - a[i], j = -1;
        for (var k = 0; k < seen.length; k++) if (seen[k][0] === want) j = seen[k][1];
        var ptr = {}, hl = {}, mh = {};
        ptr[i] = 'i'; hl[i] = 'cur';
        if (j >= 0) {
          hl[j] = 'ok'; hl[i] = 'ok'; mh[String(want)] = 'ok'; found = [j, i];
          frames.push({ narr: '<b>Step 4 and 5, code and dry run.</b> i = ' + i + ': I need ' + target + ' - ' + a[i] + ' = <b>' + want + '</b>. It is in the map at index ' + j + '. <span class="c-g">Return [' + j + ', ' + i + '].</span>', parts: [{ type: 'array', label: 'nums', values: a, ptr: ptr, hl: hl, showIdx: true }, { type: 'map', label: 'seen (value to index)', entries: seen.slice(), hl: mh }, { type: 'code', lang: 'csharp', code: code, hl: { 4: 'cur', 5: 'ok' } }] });
        } else {
          frames.push({ narr: '<b>Step 4 and 5, code and dry run.</b> i = ' + i + ': I need ' + target + ' - ' + a[i] + ' = <b>' + want + '</b>. Not in the map yet, so I store ' + a[i] + ' with its index.', parts: [{ type: 'array', label: 'nums', values: a, ptr: ptr, hl: hl, showIdx: true }, { type: 'map', label: 'seen (value to index)', entries: seen.slice() }, { type: 'code', lang: 'csharp', code: code, hl: { 4: 'cur', 6: 'ok' } }] });
          seen.push([a[i], i]);
        }
      }
      if (!found) frames.push({ narr: 'The loop ended with no pair. The code returns an <b>empty array</b>. Saying what happens when there is no answer is part of the test.', parts: [{ type: 'array', label: 'nums', values: a, showIdx: true }, { type: 'map', label: 'seen', entries: seen.slice() }] });
      frames.push({ narr: '<b>Finish with the cost.</b> "One pass, and each map lookup is O(1) on average, so time is O(n). The map can hold every number, so space is O(n). I traded memory for speed."', parts: [{ type: 'vars', label: 'Final answer', vals: { result: found ? '[' + found.join(', ') + ']' : '[] (none)', time: 'O(n)', space: 'O(n)' }, hl: { result: 'ok' } }] });
      return frames;
    }
  },
  examples: [
    { title: 'Clarifying questions for "find the duplicates in an array"', html: `<p>Before any code, ask 4 short questions. Each one can change the answer:</p>
      <table><thead><tr><th>Question</th><th>Why it matters</th></tr></thead><tbody>
      <tr><td>How large can the array be?</td><td>100 items: anything works. 10 million: you need O(n).</td></tr>
      <tr><td>Is it sorted?</td><td>Sorted means duplicates sit side by side, no extra memory needed.</td></tr>
      <tr><td>Do I return true or false, or the duplicate values?</td><td>Changes the return type and when you can stop early.</td></tr>
      <tr><td>May I change the input array?</td><td>Sorting in place is only allowed if the caller does not mind.</td></tr>
      </tbody></table>` },
    { title: 'Reading the size limit to guess the expected Big-O', html: `<p>A computer does roughly 100 million simple steps per second. Use that to pick the target:</p>
      <table><thead><tr><th>n up to</th><th>What will pass</th><th>Typical tool</th></tr></thead><tbody>
      <tr><td>20</td><td>O(2<sup>n</sup>)</td><td>try every subset</td></tr>
      <tr><td>1,000</td><td>O(n<sup>2</sup>)</td><td>2 nested loops</td></tr>
      <tr><td>100,000</td><td>O(n log n) or O(n)</td><td>sort, hash map, two pointers</td></tr>
      <tr><td>1,000,000,000</td><td>O(log n) or O(1)</td><td>binary search, maths</td></tr>
      </tbody></table>` },
    { title: 'A 45 minute round, minute by minute', html: `<p>A common split that leaves time to test:</p>
      <ul><li><b>0 to 5:</b> restate, ask questions, write the example.</li>
      <li><b>5 to 12:</b> brute force and the better idea, agreed with the interviewer <i>before</i> typing.</li>
      <li><b>12 to 32:</b> write the code, talking as you go.</li>
      <li><b>32 to 40:</b> dry run, fix bugs, edge cases.</li>
      <li><b>40 to 45:</b> Big-O, trade-offs, what you would change for production.</li></ul>
      <p>If you are still silent at minute 10, say the brute force. A working slow answer beats a half-written fast one.</p>` }
  ],
  deepDive: `<p><b>What is scored.</b> Most companies score 4 things, not 1: problem solving (did you find a sound approach), coding (is it correct and readable), verification (did you test it yourself) and communication. A candidate who reaches the optimal answer in silence can score lower than one who reaches a slightly slower answer while explaining every choice.</p>
    <p><b>The tech lead bar.</b> For a lead, the interviewer also listens for the things you would say in a code review: clear names, input validation at the edge, not changing the caller's array without saying so, <code>long</code> where <code>int</code> could overflow (2,147,483,647 is the largest <code>int</code>), and a sentence on how you would unit test it.</p>
    <p><b>C# details that cost people time.</b> Online editors may run an older compiler, so know the classic forms too: <code>new[] { 1, 2 }</code> as well as the C# 12 collection expression <code>[1, 2]</code>; <code>TryGetValue</code> as well as <code>GetValueOrDefault</code>; <code>s.Substring(0, n)</code> as well as the C# 8 range <code>s[..n]</code>. <code>Array.Sort</code> is O(n log n) and not stable, LINQ <code>OrderBy</code> is stable. <code>Dictionary</code> and <code>HashSet</code> are O(1) on average, not in the worst case.</p>
    <p><b>Average vs worst case.</b> When you say "O(1) lookup", add "on average". It shows you know hash collisions exist.</p>`,
  aiEra: `<p><b>What AI changes:</b> an assistant can write Two Sum in a second, so memorised answers are worth less. What is still tested is whether you can <i>judge</i> code: spot the missed edge case, state the cost, choose between 2 working answers. Some companies now run rounds where an AI assistant is allowed and score how well you direct and check it.</p>
    <p><b>Use AI as a practice partner:</b> ask it <code>Give me the problem only, then act as an interviewer and wait for my questions</code>, or <code>Here is my solution, list the edge cases it fails, do not rewrite it</code>.</p>
    <p><b>Where AI goes wrong:</b> off-by-one errors at the ends of a loop, integer overflow, code that uses a newer C# feature than the editor supports, and confident but wrong Big-O claims (for example calling a loop with <code>List.Contains</code> inside it O(n)).</p>
    <p><b>What you must still own:</b> the 5 steps, the dry run by hand, and the trade-off sentence at the end.</p>`
});


// ---------- TOPIC 2 ----------
topics.push({
  title: 'String Problems: Two Pointers, Counting, Windows and Stacks',
  analogy: `<p>A C# string is like a word <b>printed on a ticket</b>. You can read any letter, but you cannot rub one out. To change it you print a new ticket. Most string questions are then one of 4 small jobs: put <b>a finger on each end</b> and walk inwards (reverse, palindrome), keep a <b>tally sheet</b> of letters (anagram, first unique letter), slide a <b>paper frame</b> along the word (longest part with no repeat), or stack <b>plates</b> for things that must close in reverse order (brackets).</p>`,
  explain: `<p><b>The plain idea:</b> a string is a read-only list of characters. You can index it (<code>s[i]</code>) and ask its length, but every "change" builds a new string. So for building text in a loop, use <code>StringBuilder</code> or a <code>char[]</code>.</p>
    <table>
      <thead><tr><th>Tool</th><th>How it works</th><th>Classic questions</th></tr></thead>
      <tbody>
        <tr><td><b>Two pointers</b></td><td>index <code>i</code> from the left, <code>j</code> from the right, move towards each other</td><td>reverse, palindrome</td></tr>
        <tr><td><b>Counting</b></td><td><code>int[26]</code> for a to z, or <code>Dictionary&lt;char, int&gt;</code> for anything</td><td>anagram, first unique character, frequency</td></tr>
        <tr><td><b>Sliding window</b></td><td>keep a start and an end index, grow the end, move the start when a rule breaks</td><td>longest substring without repeats, smallest window containing letters</td></tr>
        <tr><td><b>Stack</b></td><td>push openers, pop on closers</td><td>valid brackets</td></tr>
        <tr><td><b>Run counting</b></td><td>compare each letter with the one before it</td><td>compression (aaabbc to a3b2c1)</td></tr>
      </tbody>
    </table>
    <p><b>Always ask 3 things:</b> does upper and lower case matter, is it only a to z or any character, and can the string be empty or null?</p>`,
  clues: ['"without using the built-in Reverse"', '"ignoring case, spaces and punctuation"', '"are these two words made of the same letters?"', '"first character that does not repeat"', '"longest substring that ..." (sliding window)', '"are the brackets balanced?" (stack)', '"only lowercase English letters" (an <code>int[26]</code> is enough)', '"aaabbc becomes a3b2c1"'],
  code: [CS("static bool IsPalindrome(string s)\n{\n    int i = 0, j = s.Length - 1;\n    while (i < j)\n    {\n        if (!char.IsLetterOrDigit(s[i])) i++;         // skip spaces and commas\n        else if (!char.IsLetterOrDigit(s[j])) j--;\n        else if (char.ToLowerInvariant(s[i++]) != char.ToLowerInvariant(s[j--]))\n            return false;\n    }\n    return true;\n}   // O(n) time, O(1) space"), CS("static char? FirstUnique(string s)\n{\n    var count = new Dictionary<char, int>();\n    foreach (char c in s)\n    {\n        count.TryGetValue(c, out int n);   // n is 0 when the key is missing\n        count[c] = n + 1;\n    }\n    foreach (char c in s)                  // second pass keeps the original order\n        if (count[c] == 1) return c;\n    return null;\n}   // O(n) time, O(k) space, k = distinct characters"), CS("static int LongestUnique(string s)\n{\n    var last = new Dictionary<char, int>();    // character -> last index seen\n    int best = 0, start = 0;\n    for (int i = 0; i < s.Length; i++)\n    {\n        if (last.TryGetValue(s[i], out int prev) && prev >= start)\n            start = prev + 1;                  // jump past the repeated character\n        last[s[i]] = i;\n        best = Math.Max(best, i - start + 1);\n    }\n    return best;\n}   // \"abcabcbb\" -> 3; O(n) time, O(k) space")],
  codeTitle: ['Two pointers: palindrome check', 'Counting: first character that does not repeat', 'Sliding window: longest substring without repeats'],
  viz: {
    title: 'Sliding window: longest substring without repeating characters',
    input: 'abcabcbb',
    inputLabel: 'Text (up to 14 characters)',
    gen: function (input) {
      var s = String(input);
      if (!s.length) throw new Error('Type a short word, for example: abcabcbb');
      if (s.length > 14) throw new Error('Use at most 14 characters');
      var chars = s.split(''), last = {}, order = [], start = 0, best = 0, bestStart = 0, frames = [];
      var code = 'if (last.TryGetValue(s[i], out int prev) && prev >= start)\n    start = prev + 1;      // jump past the repeat\nlast[s[i]] = i;\nbest = Math.Max(best, i - start + 1);';
      frames.push({ narr: 'The window is the part between <b>start</b> and <b>i</b>. Rule: no letter may appear twice inside it. The map remembers the last index of each letter.', parts: [{ type: 'array', label: 's', values: chars, showIdx: true }, { type: 'vars', vals: { start: 0, best: 0 } }] });
      for (var i = 0; i < chars.length; i++) {
        var c = chars[i], prev = last[c], jumped = prev !== undefined && prev >= start, note;
        if (jumped) { start = prev + 1; note = '<span class="c-r">"' + c + '" is already in the window at index ' + prev + '.</span> Move start to ' + start + '.'; }
        else if (prev !== undefined) note = '"' + c + '" was seen at index ' + prev + ', but that is <b>left of start</b>, so it does not count.';
        else note = '"' + c + '" is new.';
        if (last[c] === undefined) order.push(c);
        last[c] = i;
        var len = i - start + 1, improved = len > best;
        if (improved) { best = len; bestStart = start; }
        var ptr = {}, hl = {}, mh = {};
        ptr[i] = 'i'; if (start !== i) ptr[start] = 'start'; else ptr[i] = ['start', 'i'];
        hl[i] = jumped ? 'bad' : 'ok'; mh[c] = 'cur';
        frames.push({ narr: 'i = ' + i + ': ' + note + ' Window length = ' + len + (improved ? ', <span class="c-g">a new best</span>.' : ', best stays ' + best + '.'), parts: [
          { type: 'array', label: 's (window in blue)', values: chars, range: [start, i], ptr: ptr, hl: hl, showIdx: true },
          { type: 'map', label: 'last index of each letter', entries: order.map(function (k) { return [k, last[k]]; }), hl: mh },
          { type: 'vars', vals: { start: start, i: i, best: best }, hl: improved ? { best: 'ok' } : {} },
          { type: 'code', lang: 'csharp', code: code, hl: jumped ? { 1: 'cur', 2: 'bad' } : { 1: 'cur', 3: 'ok' } }
        ] });
      }
      var fh = {};
      for (var k = bestStart; k < bestStart + best; k++) fh[k] = 'sel';
      frames.push({ narr: 'Done. The longest part without a repeat is <b>"' + s.substr(bestStart, best) + '"</b>, length <b>' + best + '</b>. Each letter was visited once, so time is O(n). The map holds at most one entry per different letter.', parts: [{ type: 'array', label: 's', values: chars, hl: fh, showIdx: true }, { type: 'vars', vals: { answer: best, time: 'O(n)', space: 'O(k) different letters' }, hl: { answer: 'ok' } }] });
      return frames;
    }
  },
  examples: [
    { title: 'Palindrome with two pointers: "A man, a plan"', html: `<p>Skip anything that is not a letter or digit, and compare in lower case.</p>
      <table><thead><tr><th>i points at</th><th>j points at</th><th>Action</th></tr></thead><tbody>
      <tr><td>A</td><td>n</td><td>a vs n: <span class="c-r">different, return false</span></td></tr>
      </tbody></table>
      <p>Now the full phrase "A man, a plan, a canal: Panama": every pair matches (a-a, m-m, a-a, n-n ...) until the pointers cross, so the answer is <span class="c-g">true</span>. The check uses no extra memory: O(n) time, O(1) space.</p>` },
    { title: 'Anagram with one tally sheet: "listen" and "silent"', html: `<p>Add 1 for each letter of the first word and take away 1 for each letter of the second. If every count ends at 0, the letters are the same.</p>
      <table><thead><tr><th>Letter</th><th>e</th><th>i</th><th>l</th><th>n</th><th>s</th><th>t</th></tr></thead><tbody>
      <tr><td>after "listen"</td><td>+1</td><td>+1</td><td>+1</td><td>+1</td><td>+1</td><td>+1</td></tr>
      <tr><td>after "silent"</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr>
      </tbody></table>
      <p>All zero, so they are anagrams. Sorting both words also works but costs O(n log n). Counting is O(n).</p>`, code: CS("static bool IsAnagram(string a, string b)\n{\n    if (a.Length != b.Length) return false;\n    var cnt = new int[26];                 // lowercase a to z only\n    for (int i = 0; i < a.Length; i++) { cnt[a[i] - 'a']++; cnt[b[i] - 'a']--; }\n    foreach (int x in cnt) if (x != 0) return false;\n    return true;\n}   // O(n) time, O(1) space") },
    { title: 'Compression: "aaabbc" becomes "a3b2c1"', html: `<p>Walk the string and compare each letter with the one before it. When the letter changes (or the string ends), write the letter and how long the run was.</p>
      <table><thead><tr><th>i</th><th>s[i]</th><th>same as before?</th><th>run</th><th>output so far</th></tr></thead><tbody>
      <tr><td>1</td><td>a</td><td>yes</td><td>2</td><td></td></tr>
      <tr><td>2</td><td>a</td><td>yes</td><td>3</td><td></td></tr>
      <tr><td>3</td><td>b</td><td>no</td><td>1</td><td>a3</td></tr>
      <tr><td>4</td><td>b</td><td>yes</td><td>2</td><td>a3</td></tr>
      <tr><td>5</td><td>c</td><td>no</td><td>1</td><td>a3b2</td></tr>
      <tr><td>6</td><td>(end)</td><td>no</td><td>1</td><td>a3b2c1</td></tr>
      </tbody></table>
      <p>The loop runs to <code>i == s.Length</code> on purpose, so the last run is written without extra code after the loop.</p>`, code: CS("static string Compress(string s)\n{\n    if (s.Length == 0) return s;\n    var sb = new StringBuilder();\n    int run = 1;\n    for (int i = 1; i <= s.Length; i++)\n    {\n        if (i < s.Length && s[i] == s[i - 1]) run++;\n        else { sb.Append(s[i - 1]).Append(run); run = 1; }   // the run ended: write it\n    }\n    return sb.ToString();\n}   // \"aaabbc\" -> \"a3b2c1\"; O(n) time") }
  ],
  deepDive: `<p><b>Immutable strings.</b> In .NET a string never changes after it is created. <code>s += "x"</code> inside a loop copies the whole string each time, so n appends cost 1 + 2 + ... + n character copies, which is O(n<sup>2</sup>). <code>StringBuilder</code> keeps a growing buffer and makes it O(n).</p>
    <p><b>Characters are UTF-16 units.</b> A <code>char</code> is 16 bits. Most letters are 1 <code>char</code>, but an emoji is 2 (a surrogate pair), and "é" can be a letter plus an accent mark. Reversing <code>char</code> by <code>char</code> breaks both. For real text use <code>StringInfo</code> (text elements) or <code>EnumerateRunes()</code> (code points). In an interview, say the assumption: "I assume plain ASCII letters".</p>
    <p><b>Comparing.</b> Use <code>StringComparison.Ordinal</code> or <code>OrdinalIgnoreCase</code> for keys, file names and protocol text. Culture-aware compare can surprise you: in the Turkish culture, upper-case "i" is "İ", not "I". For the same reason use <code>ToLowerInvariant</code>, not <code>ToLower</code>, in algorithms.</p>
    <p><b>Counting arrays.</b> <code>int[26]</code> only works for a to z. For any ASCII use <code>int[128]</code>, for any character use a <code>Dictionary&lt;char, int&gt;</code>. A fixed-size array counts as O(1) space because it does not grow with the input.</p>
    <p><b>Substring cost.</b> <code>Substring</code> allocates a new string. Inside a loop, pass start and end indexes instead, or use <code>ReadOnlySpan&lt;char&gt;</code> (<code>s.AsSpan()</code>), which is a view with no copy.</p>`,
  aiEra: `<p><b>What AI changes:</b> string puzzles are the first thing an assistant solves well, so interviewers now push on the parts a tool skips: "what if the text has emoji?", "what is the cost of that <code>Substring</code> inside the loop?", "which comparison did you use and why?".</p>
    <p><b>Use AI as a partner:</b> <code>Give me 8 edge-case inputs for a palindrome checker, with expected results, no code</code> is a good way to build a test list. Then run your own code against them.</p>
    <p><b>Where AI goes wrong:</b> it often sorts both strings for an anagram check when counting is cheaper, forgets the <code>prev &gt;= start</code> test in the sliding window (try "abba"), builds the result with <code>+=</code> in a loop, and assumes lowercase letters without saying so.</p>
    <p><b>What you must still own:</b> naming the assumption about the character set, and choosing between a counting array and a dictionary.</p>`,
  problems: [P({
    t: 'Is One String a Rotation of Another?', l: 'Easy', tags: ['strings', 'guided'], co: ['Microsoft', 'Amazon'],
    s: `<p>Given two strings <code>a</code> and <code>b</code>, return true if <code>b</code> can be made by cutting <code>a</code> at one point and swapping the two pieces. Example: cut "waterbottle" after "wat" and you get "erbottle" + "wat".</p>`,
    c: `0 ≤ length ≤ 10<sup>5</sup>. Compare exact characters (case matters).`,
    ex: `<p><b>a</b> = "waterbottle", <b>b</b> = "erbottlewat" gives <span class="c-g">true</span>.</p><p><b>a</b> = "abc", <b>b</b> = "acb" gives <span class="c-r">false</span>: same letters, but no single cut produces it.</p>`,
    bw: `<p>Try every cut point: build each rotation of <code>a</code> and compare it with <code>b</code>. There are n cut points and each one builds and compares a string of length n, so it is O(n<sup>2</sup>).</p>`,
    bc: "static bool IsRotationBrute(string a, string b)\n{\n    if (a.Length != b.Length) return false;\n    if (a.Length == 0) return true;\n    for (int shift = 0; shift < a.Length; shift++)      // try every cut point\n    {\n        string turned = a.Substring(shift) + a.Substring(0, shift);\n        if (turned == b) return true;\n    }\n    return false;\n}   // O(n^2) time, O(n) space",
    q: ['If a = "abcd", which string contains every rotation of a as a continuous part?', ['"abcdabcd"', '"abcddcba"', '"dcba"', '"abcd"'], 0, 'Writing a twice puts every cut point in the middle: bcda, cdab and dabc all appear inside "abcdabcd".'],
    h: ['A rotation moves the front piece to the back. What do you see if you write the word twice in a row?', 'Check the lengths first. Then search for b inside a + a.', 'Edge cases: two empty strings are rotations of each other; different lengths are never rotations. Recipe: if lengths differ return false; return (a + a) contains b.'],
    a: `<p>If <code>a = x + y</code> then a rotation is <code>y + x</code>. Write <code>a</code> twice: <code>x + y + x + y</code>. The middle part is exactly <code>y + x</code>. So <code>b</code> is a rotation only if it has the same length as <code>a</code> and appears inside <code>a + a</code>. The length check matters: without it "ab" would wrongly match "abab".</p>`,
    sc: "static bool IsRotation(string a, string b)\n{\n    if (a.Length != b.Length) return false;     // different lengths can never match\n    return (a + a).IndexOf(b, StringComparison.Ordinal) >= 0;   // every rotation lives inside a + a\n}   // O(n) space; time is O(n) on typical input (the search is the cost)",
    dh: ['Step', 'Value', 'Result'],
    dr: [['Lengths equal?', '11 and 11', 'yes, continue'], ['a + a', 'waterbottlewaterbottle', '22 characters'], ['Search for b', 'erbottlewat', 'found at index 3'], ['Return', '', '<span class="c-g">true</span>']],
    cx: `<p>Time: building <code>a + a</code> is O(n), and the search is O(n) on normal text (a naive search can reach O(n<sup>2</sup>) on text like "aaaa...ab"). Space: O(n) for the doubled string.</p>`,
    f: ['How would you do it with O(1) extra space?', 'How many different rotations does a string of length n have?']
  })]
});


// ---------- TOPIC 3 ----------
topics.push({
  title: 'Array Problems: Hash Maps, Two Pointers, Running Totals and Binary Search',
  analogy: `<p>An array is a <b>row of numbered lockers</b>. Opening locker 57 is instant, because you walk straight to the number. Finding <i>which</i> locker holds a red bag means opening them one by one, unless you keep a <b>notebook</b> that says "red bag: locker 57" (a hash map), or the lockers are <b>in order</b> and you can open the middle one and throw away half the row each time (binary search).</p>`,
  explain: `<p><b>The plain idea:</b> reading <code>a[i]</code> is O(1), searching is O(n). Almost every array question is about avoiding a second loop. There are 6 tools for that:</p>
    <table>
      <thead><tr><th>Tool</th><th>Replaces</th><th>Classic questions</th></tr></thead>
      <tbody>
        <tr><td><b>Hash map or set</b></td><td>the inner "have I seen this?" loop</td><td>two sum, duplicates, subarray sum equals K</td></tr>
        <tr><td><b>Read and write pointers</b></td><td>a second array</td><td>remove duplicates in place, move zeros</td></tr>
        <tr><td><b>Left and right pointers</b></td><td>trying every pair</td><td>container with most water, three sum, trapping rain water</td></tr>
        <tr><td><b>Running total</b></td><td>re-adding a range every time</td><td>maximum subarray (Kadane), best time to buy and sell</td></tr>
        <tr><td><b>Binary search</b></td><td>a linear scan of sorted data</td><td>find a value, rotated sorted array</td></tr>
        <tr><td><b>Sort first</b></td><td>messy comparisons</td><td>merge intervals, three sum</td></tr>
      </tbody>
    </table>
    <p><b>Always ask 4 things:</b> is the array sorted, can it hold negatives or duplicates, may I change it in place, and can it be empty?</p>`,
  clues: ['"find two numbers that add up to" (hash map)', '"in place" or "O(1) extra space" (read and write pointers)', '"contiguous subarray with the largest sum" (Kadane)', '"the array is sorted" (binary search or two pointers)', '"rotate by k" (three reversals)', '"merge overlapping" (sort by start, then one pass)', '"without using division" (products from the left and from the right)', '"n up to 10<sup>5</sup>" (O(n<sup>2</sup>) is too slow)'],
  code: [CS("static int MaxSubArray(int[] a)\n{\n    int best = a[0], cur = a[0];\n    for (int i = 1; i < a.Length; i++)\n    {\n        cur = Math.Max(a[i], cur + a[i]);       // extend the run, or start fresh here\n        best = Math.Max(best, cur);\n    }\n    return best;\n}   // [-2,1,-3,4,-1,2,1,-5,4] -> 6; O(n) time, O(1) space"), CS("static int RemoveDuplicates(int[] a)\n{\n    if (a.Length == 0) return 0;\n    int w = 1;                                  // next free slot\n    for (int r = 1; r < a.Length; r++)\n        if (a[r] != a[w - 1]) a[w++] = a[r];    // new value: keep it\n    return w;                                   // count of unique values\n}   // O(n) time, O(1) space"), CS("static int BinarySearch(int[] a, int target)\n{\n    int lo = 0, hi = a.Length - 1;\n    while (lo <= hi)\n    {\n        int mid = lo + (hi - lo) / 2;           // avoids int overflow of lo + hi\n        if (a[mid] == target) return mid;\n        if (a[mid] < target) lo = mid + 1;      // target is to the right\n        else hi = mid - 1;                      // target is to the left\n    }\n    return -1;\n}   // O(log n) time, O(1) space")],
  codeTitle: ['Running total: maximum subarray (Kadane)', 'Read and write pointers: remove duplicates from a sorted array', 'Binary search'],
  viz: [{
    title: 'Kadane: largest sum of a continuous run',
    input: '-2 1 -3 4 -1 2 1 -5 4',
    inputLabel: 'Numbers (space separated)',
    gen: function (input) {
      var a = ints(input, 12), frames = [];
      var code = 'cur = Math.Max(a[i], cur + a[i]);   // extend, or start fresh\nbest = Math.Max(best, cur);';
      var cur = a[0], best = a[0], start = 0, bestL = 0, bestR = 0;
      frames.push({ narr: 'At every position ask one question: is it better to <b>extend</b> the run that ends just before me, or to <b>start fresh</b> here? Begin with cur = best = a[0] = ' + a[0] + '.', parts: [{ type: 'bars', label: 'a', values: a, hl: { 0: 'cur' } }, { type: 'vars', vals: { cur: cur, best: best } }] });
      for (var i = 1; i < a.length; i++) {
        var ext = cur + a[i], fresh = a[i] > ext;
        if (fresh) { cur = a[i]; start = i; } else cur = ext;
        var improved = cur > best;
        if (improved) { best = cur; bestL = start; bestR = i; }
        var hl = {};
        for (var k = start; k <= i; k++) hl[k] = 'win';
        hl[i] = 'cur';
        frames.push({ narr: 'i = ' + i + ', a[i] = ' + a[i] + '. Extend gives ' + ext + ', fresh gives ' + a[i] + '. ' + (fresh ? '<span class="c-y">Start fresh</span>: the old run only drags the total down.' : 'Extend the run.') + ' cur = <b>' + cur + '</b>' + (improved ? ', <span class="c-g">new best</span>.' : ', best stays ' + best + '.'), parts: [
          { type: 'bars', label: 'a (current run in blue)', values: a, hl: hl },
          { type: 'vars', vals: { i: i, cur: cur, best: best }, hl: improved ? { best: 'ok' } : {} },
          { type: 'code', lang: 'csharp', code: code, hl: improved ? { 1: 'cur', 2: 'ok' } : { 1: 'cur' } }
        ] });
      }
      var fh = {};
      for (var j = bestL; j <= bestR; j++) fh[j] = 'sel';
      frames.push({ narr: 'Answer: <b>' + best + '</b>, from index ' + bestL + ' to ' + bestR + '. One pass and two variables: O(n) time, O(1) space. Trying every start and end would be O(n<sup>2</sup>).', parts: [{ type: 'bars', label: 'best run in purple', values: a, hl: fh }, { type: 'vars', vals: { best: best, time: 'O(n)', space: 'O(1)' }, hl: { best: 'ok' } }] });
      return frames;
    }
  }, {
    title: 'Binary search: halve the search area each step',
    input: '1 3 5 7 9 11 13 15 17 | 13',
    inputLabel: 'Sorted numbers | target',
    gen: function (input) {
      var parts = String(input).split('|');
      if (parts.length !== 2) throw new Error('Use the format: 1 3 5 7 9 | 7');
      var a = ints(parts[0], 16), target = ints(parts[1], 1)[0], frames = [];
      for (var k = 1; k < a.length; k++) if (a[k] < a[k - 1]) throw new Error('The numbers must be sorted from small to large');
      var lo = 0, hi = a.length - 1, found = -1;
      frames.push({ narr: 'The array is sorted, so one look at the middle tells us which half can be thrown away. Search area: index ' + lo + ' to ' + hi + '. Target: <b>' + target + '</b>.', parts: [{ type: 'array', label: 'a', values: a, range: [lo, hi], ptr: (function () { var p = {}; p[lo] = 'lo'; p[hi] = lo === hi ? ['lo', 'hi'] : 'hi'; return p; })(), showIdx: true }] });
      while (lo <= hi) {
        var mid = lo + Math.floor((hi - lo) / 2), ptr = {}, hl = {}, note;
        ptr[mid] = 'mid'; hl[mid] = 'cur';
        if (a[mid] === target) { found = mid; hl[mid] = 'ok'; note = 'a[' + mid + '] = ' + a[mid] + ' <span class="c-g">is the target. Return ' + mid + '.</span>'; }
        else if (a[mid] < target) note = 'a[' + mid + '] = ' + a[mid] + ' is <b>too small</b>. Everything left of it is smaller still, so lo = mid + 1 = ' + (mid + 1) + '.';
        else note = 'a[' + mid + '] = ' + a[mid] + ' is <b>too big</b>. Everything right of it is bigger still, so hi = mid - 1 = ' + (mid - 1) + '.';
        frames.push({ narr: 'lo = ' + lo + ', hi = ' + hi + ', mid = lo + (hi - lo) / 2 = ' + mid + '. ' + note, parts: [{ type: 'array', label: 'a (search area in blue)', values: a, range: [lo, hi], ptr: ptr, hl: hl, showIdx: true }, { type: 'vars', vals: { lo: lo, mid: mid, hi: hi, target: target } }] });
        if (found >= 0) break;
        if (a[mid] < target) lo = mid + 1; else hi = mid - 1;
      }
      if (found < 0) frames.push({ narr: 'lo (' + lo + ') has passed hi (' + hi + '), so the search area is empty. <span class="c-r">Return -1.</span> Note that lo is now the position where the target would be inserted.', parts: [{ type: 'array', label: 'a', values: a, showIdx: true }, { type: 'vars', vals: { lo: lo, hi: hi, result: -1 }, hl: { result: 'bad' } }] });
      frames.push({ narr: 'Each step halves the area, so ' + a.length + ' items need at most ' + (Math.floor(Math.log(a.length) / Math.LN2) + 1) + ' looks. That is O(log n) time and O(1) space. A million items need only 20 looks.', parts: [{ type: 'table', label: 'Items vs looks', columns: ['n', 'Linear scan (worst)', 'Binary search (worst)'], rows: [['16', '16', '5'], ['1,000', '1,000', '10'], ['1,000,000', '1,000,000', '20']] }] });
      return frames;
    }
  }],
  examples: [
    { title: 'Rotate right by k with three reversals', html: `<p>Rotate [1, 2, 3, 4, 5] right by k = 2. The last 2 items must come to the front.</p>
      <table><thead><tr><th>Step</th><th>Array</th></tr></thead><tbody>
      <tr><td>Start</td><td>1 2 3 4 5</td></tr>
      <tr><td>Reverse everything</td><td>5 4 3 2 1</td></tr>
      <tr><td>Reverse the first k = 2</td><td><span class="c-g">4 5</span> 3 2 1</td></tr>
      <tr><td>Reverse the rest</td><td><span class="c-g">4 5</span> <span class="c-b">1 2 3</span></td></tr>
      </tbody></table>
      <p>Always do <code>k %= n</code> first: rotating 5 items by 7 is the same as rotating by 2.</p>`, code: CS("static void Rotate(int[] a, int k)\n{\n    if (a.Length == 0) return;\n    k %= a.Length;                              // k can be bigger than the array\n    Array.Reverse(a);                           // 1 2 3 4 5 -> 5 4 3 2 1\n    Array.Reverse(a, 0, k);                     // first k back in order\n    Array.Reverse(a, k, a.Length - k);          // the rest back in order\n}   // O(n) time, O(1) space") },
    { title: 'Move zeros to the end with a read and a write pointer', html: `<p><code>r</code> reads every item. <code>w</code> marks where the next non-zero item belongs.</p>
      <table><thead><tr><th>r</th><th>a[r]</th><th>Action</th><th>Array after</th><th>w</th></tr></thead><tbody>
      <tr><td>0</td><td>0</td><td>skip</td><td>0 1 0 3 12</td><td>0</td></tr>
      <tr><td>1</td><td>1</td><td>swap a[0], a[1]</td><td>1 0 0 3 12</td><td>1</td></tr>
      <tr><td>2</td><td>0</td><td>skip</td><td>1 0 0 3 12</td><td>1</td></tr>
      <tr><td>3</td><td>3</td><td>swap a[1], a[3]</td><td>1 3 0 0 12</td><td>2</td></tr>
      <tr><td>4</td><td>12</td><td>swap a[2], a[4]</td><td>1 3 12 0 0</td><td>3</td></tr>
      </tbody></table>
      <p>The order of the non-zero items is kept, and no second array is used.</p>`, code: CS("static void MoveZeroes(int[] a)\n{\n    int w = 0;                                  // where the next non-zero goes\n    for (int r = 0; r < a.Length; r++)\n        if (a[r] != 0)\n        {\n            int t = a[w]; a[w] = a[r]; a[r] = t;   // swapping with itself is harmless\n            w++;\n        }\n}   // O(n) time, O(1) space") },
    { title: 'Product of all other items, without division', html: `<p>For [1, 2, 3, 4], the answer at each index is (product of everything to the left) times (product of everything to the right).</p>
      <table><thead><tr><th>index</th><th>0</th><th>1</th><th>2</th><th>3</th></tr></thead><tbody>
      <tr><td>a</td><td>1</td><td>2</td><td>3</td><td>4</td></tr>
      <tr><td>left products (pass 1)</td><td>1</td><td>1</td><td>2</td><td>6</td></tr>
      <tr><td>right products (pass 2)</td><td>24</td><td>12</td><td>4</td><td>1</td></tr>
      <tr><td>result = left × right</td><td><b>24</b></td><td><b>12</b></td><td><b>8</b></td><td><b>6</b></td></tr>
      </tbody></table>
      <p>Division would be shorter, but it breaks when the array holds a zero.</p>`, code: CS("static int[] ProductExceptSelf(int[] a)\n{\n    var res = new int[a.Length];\n    int left = 1;\n    for (int i = 0; i < a.Length; i++) { res[i] = left; left *= a[i]; }        // product of everything before i\n    int right = 1;\n    for (int i = a.Length - 1; i >= 0; i--) { res[i] *= right; right *= a[i]; } // times everything after i\n    return res;\n}   // O(n) time, O(1) extra space") }
  ],
  deepDive: `<p><b>Why Kadane is correct.</b> The best run ending at index i either is just <code>a[i]</code>, or is the best run ending at i - 1 plus <code>a[i]</code>. There is no third choice, so one variable is enough. This is the smallest example of dynamic programming.</p>
    <p><b>Binary search bugs.</b> Three places go wrong: the middle (<code>(lo + hi) / 2</code> can overflow <code>int</code> when both are above 1 billion, so write <code>lo + (hi - lo) / 2</code>), the loop test (<code>lo &lt;= hi</code> when <code>hi</code> is the last index, <code>lo &lt; hi</code> when <code>hi</code> is one past it), and forgetting <code>mid + 1</code> or <code>mid - 1</code>, which loops forever.</p>
    <p><b>Overflow.</b> Sums and products of <code>int</code> values silently wrap around in C# by default. Use <code>long</code> for totals, or a <code>checked</code> block if you want an exception instead.</p>
    <p><b>Arrays in .NET.</b> <code>int[]</code> has a fixed length. <code>List&lt;int&gt;</code> wraps an array and doubles it when full, so <code>Add</code> is O(1) averaged over many calls, but <code>Insert(0, x)</code> and <code>RemoveAt(0)</code> are O(n) because every item shifts. <code>Array.Sort</code> uses introsort (quicksort that falls back to heapsort): O(n log n), in place, not stable.</p>
    <p><b>Hash map cost.</b> <code>Dictionary</code> lookups are O(1) on average. The price is memory, and for small arrays a simple loop can be faster in practice. Say so when asked about trade-offs.</p>`,
  aiEra: `<p><b>What AI changes:</b> an assistant will produce Kadane or Two Sum instantly, so the follow-up is where you are tested: "return the indexes of the run, not just the sum", "what if all numbers are negative?", "now the array is a stream and does not fit in memory".</p>
    <p><b>Use AI as a partner:</b> <code>Write a brute force version of this function and 200 random tests that compare it with mine</code> is the fastest way to find an off-by-one error. The same idea was used to check every solution in this module.</p>
    <p><b>Where AI goes wrong:</b> it starts Kadane with <code>best = 0</code> (wrong for all-negative input), uses <code>(lo + hi) / 2</code>, sorts when the question needs the original indexes, and forgets to skip duplicates in three sum.</p>
    <p><b>What you must still own:</b> choosing the tool from the wording, and the dry run that proves the edges are right.</p>`,
  problems: [P({
    t: 'Two Sum in a Sorted Array', l: 'Easy', tags: ['arrays', 'two pointers', 'guided'], co: ['Amazon', 'Microsoft', 'Adobe'],
    s: `<p>The array <code>a</code> is sorted from small to large. Return the indexes of 2 different positions whose values add up to <code>target</code>, or an empty array if there is no such pair. Use O(1) extra space.</p>`,
    c: `2 ≤ n ≤ 10<sup>5</sup>, values and target fit in <code>int</code>. If several pairs work, return any one.`,
    ex: `<p><b>a</b> = [2, 7, 11, 15], <b>target</b> = 9 gives <span class="c-g">[0, 1]</span> because 2 + 7 = 9.</p><p><b>a</b> = [1, 2, 4], <b>target</b> = 10 gives <span class="c-r">[]</span>.</p>`,
    bw: `<p>Check every pair with 2 loops. It is correct but O(n<sup>2</sup>): for 100,000 items that is about 5 billion checks. It also ignores the gift in the question, which is that the array is sorted.</p>`,
    bc: "static int[] TwoSumSortedBrute(int[] a, int target)\n{\n    for (int i = 0; i < a.Length; i++)\n        for (int j = i + 1; j < a.Length; j++)\n            if (a[i] + a[j] == target) return new[] { i, j };\n    return new int[0];\n}   // O(n^2) time, O(1) space",
    q: ['Left points at the smallest value, right at the largest, and their sum is too big. What do you move?', ['Right, one step left', 'Left, one step right', 'Both', 'Neither, restart'], 0, 'The sum must shrink. Moving left to the right can only make it bigger, so the largest value cannot be part of any answer with what remains: drop it.'],
    h: ['Sorted data means the smallest value is at one end and the largest at the other. Add those two.', 'Keep one index at each end. Too small: move the left one. Too big: move the right one.', 'Stop when the two indexes meet. Add as long to avoid overflow. Recipe: l = 0, r = n - 1; while l &lt; r: compare a[l] + a[r] with target and move one side.'],
    a: `<p>Put <code>l</code> at the start and <code>r</code> at the end. If the sum is too small, the only way to grow it is to move <code>l</code> right. If it is too big, the only way to shrink it is to move <code>r</code> left. Each step removes one value that cannot be in any answer, so after at most n steps you have the pair or you know there is none. The hash map version also works, but it uses O(n) memory that the sorted order makes unnecessary.</p>`,
    sc: "static int[] TwoSumSorted(int[] a, int target)\n{\n    int l = 0, r = a.Length - 1;\n    while (l < r)\n    {\n        long sum = (long)a[l] + a[r];\n        if (sum == target) return new[] { l, r };\n        if (sum < target) l++;                  // need a bigger sum: move the small end up\n        else r--;                               // need a smaller sum: move the big end down\n    }\n    return new int[0];\n}   // O(n) time, O(1) space",
    dh: ['l', 'r', 'a[l] + a[r]', 'Action'],
    dr: [['0', '3', '2 + 15 = 17', 'too big, r--'], ['0', '2', '2 + 11 = 13', 'too big, r--'], ['0', '1', '2 + 7 = 9', '<span class="c-g">found, return [0, 1]</span>']],
    cx: `<p>Time O(n): each step moves one pointer and they meet after at most n - 1 steps. Space O(1).</p>`,
    f: ['The array is not sorted and you must return the original indexes. What changes?', 'How does this become the inner loop of three sum?']
  })]
});


// ---------- TOPIC 4 ----------
topics.push({
  title: 'Matrix Problems: Rotate, Spiral, Search and Grid Walks',
  analogy: `<p>A matrix is a <b>cinema seating plan</b>: every seat has a row number and a seat number. Walking it in spiral order is like <b>mowing a lawn from the outside in</b>: along the top edge, down the right edge, back along the bottom, up the left, then the same again on the smaller lawn that is left. Counting islands on a map is like <b>painting each island once</b>: when you find unpainted land, you paint everything connected to it and add 1 to your count.</p>`,
  explain: `<p><b>The plain idea:</b> a matrix (2D array) is a table of values. You reach a cell with 2 indexes, <b>row first, then column</b>: <code>m[r][c]</code>. Most bugs are mixed-up rows and columns, or stepping off the edge.</p>
    <p><b>Two kinds in C#:</b></p>
    <table>
      <thead><tr><th></th><th>Jagged array <code>int[][]</code></th><th>Rectangular array <code>int[,]</code></th></tr></thead>
      <tbody>
        <tr><td>What it is</td><td>an array of row arrays</td><td>one block with 2 dimensions</td></tr>
        <tr><td>Read a cell</td><td><code>m[r][c]</code></td><td><code>m[r, c]</code></td></tr>
        <tr><td>Rows and columns</td><td><code>m.Length</code>, <code>m[0].Length</code></td><td><code>m.GetLength(0)</code>, <code>m.GetLength(1)</code></td></tr>
        <tr><td>Rows of different length</td><td>allowed</td><td>not possible</td></tr>
      </tbody>
    </table>
    <p><b>The 4 matrix tools:</b></p>
    <ul>
      <li><b>Shrinking borders</b> (top, bottom, left, right) for spiral order.</li>
      <li><b>Transpose, then reverse each row</b> to rotate 90 degrees clockwise. Transpose means swap <code>m[i][j]</code> with <code>m[j][i]</code>.</li>
      <li><b>Start in a corner</b> to search a matrix whose rows and columns are both sorted.</li>
      <li><b>Depth-first or breadth-first search</b> (DFS, BFS) for islands and shortest paths. The 4 neighbours of a cell are up, down, left and right.</li>
    </ul>`,
  clues: ['"rotate the image by 90 degrees in place"', '"print the matrix in spiral order"', '"each row and each column is sorted"', '"count the islands" or "connected regions" (DFS or BFS)', '"shortest path in a grid" or "fewest steps" (BFS, never DFS)', '"if a cell is 0, set its whole row and column to 0"', '"m x n grid" with 4-direction moves', '"in place" on a matrix (use the matrix itself to store marks)'],
  code: [CS("static void Rotate90(int[][] m)\n{\n    int n = m.Length;\n    for (int i = 0; i < n; i++)\n        for (int j = i + 1; j < n; j++)\n        {\n            int t = m[i][j]; m[i][j] = m[j][i]; m[j][i] = t;   // transpose: flip over the diagonal\n        }\n    foreach (int[] row in m) Array.Reverse(row);               // then mirror each row\n}   // O(n^2) time, O(1) space"), CS("static List<int> Spiral(int[][] m)\n{\n    var res = new List<int>();\n    int top = 0, bottom = m.Length - 1, left = 0, right = m[0].Length - 1;\n    while (top <= bottom && left <= right)\n    {\n        for (int c = left; c <= right; c++) res.Add(m[top][c]);        // go right\n        top++;\n        for (int r = top; r <= bottom; r++) res.Add(m[r][right]);      // go down\n        right--;\n        if (top <= bottom)\n        {\n            for (int c = right; c >= left; c--) res.Add(m[bottom][c]); // go left\n            bottom--;\n        }\n        if (left <= right)\n        {\n            for (int r = bottom; r >= top; r--) res.Add(m[r][left]);   // go up\n            left++;\n        }\n    }\n    return res;\n}   // O(rows * cols) time, O(1) extra space"), CS("static bool SearchMatrix(int[][] m, int target)\n{\n    int r = 0, c = m[0].Length - 1;             // start at the top-right corner\n    while (r < m.Length && c >= 0)\n    {\n        if (m[r][c] == target) return true;\n        if (m[r][c] > target) c--;              // too big: this whole column is out\n        else r++;                               // too small: this whole row is out\n    }\n    return false;\n}   // O(rows + cols) time, O(1) space")],
  codeTitle: ['Rotate 90 degrees clockwise in place', 'Spiral order', 'Search a matrix with sorted rows and sorted columns'],
  viz: {
    title: 'Spiral order: walk the border, then shrink it',
    input: '3 x 4',
    inputLabel: 'Rows x columns (up to 5 x 6)',
    gen: function (input) {
      var mt = /^\s*(\d+)\s*[x× ,]\s*(\d+)\s*$/i.exec(String(input));
      if (!mt) throw new Error('Use the format: 3 x 4');
      var R = Number(mt[1]), C = Number(mt[2]);
      if (R < 1 || C < 1 || R > 5 || C > 6) throw new Error('Rows 1 to 5, columns 1 to 6');
      var m = [], r, c, n = 1;
      for (r = 0; r < R; r++) { m.push([]); for (c = 0; c < C; c++) m[r].push(n++); }
      var frames = [], done = {}, out = [];
      var top = 0, bottom = R - 1, left = 0, right = C - 1;
      function snap(narr, cells) {
        var hl = {};
        Object.keys(done).forEach(function (k) { hl[k] = 'done'; });
        cells.forEach(function (k) { hl[k] = 'cur'; });
        frames.push({ narr: narr, parts: [
          { type: 'grid', label: 'matrix (yellow = read in this step, faded = already read)', rows: m.map(function (row) { return row.slice(); }), hl: hl },
          { type: 'vars', label: 'borders', vals: { top: top, bottom: bottom, left: left, right: right } },
          { type: 'array', label: 'output', values: out.slice() }
        ] });
        cells.forEach(function (k) { done[k] = true; });
      }
      snap('Keep 4 borders: top, bottom, left, right. Walk one edge, then move that border inwards so the edge is never read again.', []);
      while (top <= bottom && left <= right) {
        var cells = [];
        for (c = left; c <= right; c++) { cells.push(top + ',' + c); out.push(m[top][c]); }
        snap('<b>Go right</b> along row top = ' + top + '. Then top++ so this row is finished.', cells);
        top++;
        cells = [];
        for (r = top; r <= bottom; r++) { cells.push(r + ',' + right); out.push(m[r][right]); }
        if (cells.length) snap('<b>Go down</b> column right = ' + right + '. Then right--.', cells);
        right--;
        if (top <= bottom) {
          cells = [];
          for (c = right; c >= left; c--) { cells.push(bottom + ',' + c); out.push(m[bottom][c]); }
          if (cells.length) snap('<b>Go left</b> along row bottom = ' + bottom + '. The check <code>top &lt;= bottom</code> passed, so this row was not read already. Then bottom--.', cells);
          bottom--;
        } else if (left <= right) snap('<span class="c-y">Skip the walk left</span>: top has passed bottom, so there is no unread row. Without this check a single row would be printed twice.', []);
        if (left <= right) {
          cells = [];
          for (r = bottom; r >= top; r--) { cells.push(r + ',' + left); out.push(m[r][left]); }
          if (cells.length) snap('<b>Go up</b> column left = ' + left + '. Then left++.', cells);
          left++;
        }
      }
      snap('The borders have crossed, so every cell was read exactly once: <b>' + (R * C) + '</b> values. Time O(rows × columns), and only 4 extra variables.', []);
      return frames;
    }
  },
  examples: [
    { title: 'Rotate 90 degrees clockwise = transpose + reverse each row', html: `<table><thead><tr><th>Start</th><th>After transpose (swap m[i][j] and m[j][i])</th><th>After reversing each row</th></tr></thead><tbody>
      <tr><td>1 2 3</td><td>1 4 7</td><td><b>7 4 1</b></td></tr>
      <tr><td>4 5 6</td><td>2 5 8</td><td><b>8 5 2</b></td></tr>
      <tr><td>7 8 9</td><td>3 6 9</td><td><b>9 6 3</b></td></tr>
      </tbody></table>
      <p>Check one cell: the 1 started top-left and ends top-right, which is what a clockwise quarter turn does. The inner loop starts at <code>j = i + 1</code>, so each pair is swapped once. Starting at 0 would swap everything twice and undo the work.</p>` },
    { title: 'Staircase search in a matrix sorted both ways', html: `<p>Find 6. Start at the top-right corner. From there, left is smaller and down is bigger, so every look removes a whole row or column.</p>
      <table><thead><tr><th></th><th>c0</th><th>c1</th><th>c2</th></tr></thead><tbody>
      <tr><td>r0</td><td>1</td><td>4</td><td>7</td></tr>
      <tr><td>r1</td><td>2</td><td>5</td><td>8</td></tr>
      <tr><td>r2</td><td>3</td><td>6</td><td>9</td></tr>
      </tbody></table>
      <p>7 is too big: go left. 4 is too small: go down. 5 is too small: go down. <span class="c-g">6 found.</span> At most rows + columns looks.</p>` },
    { title: 'Counting islands by sinking them', html: `<p>Scan the grid. Each time you meet a 1 that is still land, add 1 to the count and "sink" (set to 0) every land cell connected to it, so it is never counted again.</p>
      <table><thead><tr><th>Grid</th><th>What happens</th></tr></thead><tbody>
      <tr><td>1 1 0 0</td><td>(0,0) is land: count = 1, sink (0,0), (0,1), (1,0)</td></tr>
      <tr><td>1 0 0 1</td><td>(1,3) is land: count = 2, sink (1,3), (2,3)</td></tr>
      <tr><td>0 0 0 1</td><td>nothing left</td></tr>
      </tbody></table>
      <p>Answer: <b>2</b>. Every cell is looked at a fixed number of times, so the cost is O(rows × columns).</p>`, code: CS("static int NumIslands(char[][] g)\n{\n    int count = 0;\n    for (int i = 0; i < g.Length; i++)\n        for (int j = 0; j < g[0].Length; j++)\n            if (g[i][j] == '1') { count++; Sink(g, i, j); }   // new island: erase all of it\n    return count;\n}\n\nstatic void Sink(char[][] g, int i, int j)\n{\n    if (i < 0 || j < 0 || i >= g.Length || j >= g[0].Length || g[i][j] != '1') return;\n    g[i][j] = '0';                              // mark as visited\n    Sink(g, i + 1, j); Sink(g, i - 1, j); Sink(g, i, j + 1); Sink(g, i, j - 1);\n}   // O(rows * cols) time; recursion can go rows * cols deep") }
  ],
  deepDive: `<p><b>Jagged or rectangular?</b> <code>int[][]</code> is what most interview sites use, and reading a cell is usually faster because the runtime has its best optimisations for one-dimensional arrays. <code>int[,]</code> is one continuous block of memory, guarantees equal row lengths, and is fine for fixed tables such as a visited grid (<code>bool[,]</code>).</p>
    <p><b>Marking visited cells.</b> Three choices: change the grid itself (cheapest, but it destroys the caller's data, so say it), keep a separate <code>bool[,]</code>, or keep a <code>HashSet</code> of positions (slowest). In BFS, mark a cell when you <i>add it to the queue</i>, not when you take it out, or the same cell is queued many times.</p>
    <p><b>Recursion depth.</b> A recursive DFS on a 1,000 × 1,000 grid of all land can go 1,000,000 calls deep. The default thread stack in .NET is about 1 MB, and a <code>StackOverflowException</code> cannot be caught: the process dies. For large grids use a <code>Queue</code> or <code>Stack</code> of your own.</p>
    <p><b>Why BFS for shortest path.</b> BFS visits cells in rings: all cells 1 step away, then 2 steps, and so on. The first time it reaches the target is therefore the fewest steps. DFS finds <i>a</i> path, not the shortest one. BFS only works like this when every step costs the same. With different costs you need Dijkstra's algorithm.</p>
    <p><b>Memory order.</b> Walking row by row is faster than column by column, because a row sits together in memory and the CPU cache loads it in one go.</p>`,
  aiEra: `<p><b>What AI changes:</b> assistants write a correct spiral or island counter most of the time, so the questions move to judgement: "this grid has 10 million cells, what breaks?", "you changed my input, is that acceptable?", "why BFS and not DFS here?".</p>
    <p><b>Use AI as a partner:</b> ask <code>Print the matrix after each step of my rotate function for a 3 x 3 input</code>, and compare it with the table you wrote by hand. Seeing the grid after every step is the quickest way to catch a swapped index.</p>
    <p><b>Where AI goes wrong:</b> spiral code that prints a single row or column twice (the 2 missing border checks), rotating a non-square matrix "in place" (impossible, the shape changes), marking BFS cells too late, and recursion on very large grids.</p>
    <p><b>What you must still own:</b> drawing the small grid, naming rows and columns clearly (<code>r</code>, <code>c</code>, not <code>i</code>, <code>j</code>, <code>x</code>, <code>y</code> mixed), and the bounds check.</p>`,
  problems: [P({
    t: 'Flood Fill (the Paint Bucket Tool)', l: 'Easy', tags: ['matrix', 'dfs', 'guided'], co: ['Google', 'Amazon', 'Microsoft'],
    s: `<p>An image is a grid of colour numbers. Starting from the pixel at row <code>sr</code>, column <code>sc</code>, change that pixel and every pixel connected to it <b>with the same starting colour</b> (up, down, left, right) to <code>color</code>. Return the image.</p>`,
    c: `1 ≤ rows, columns ≤ 50. Colours are 0 to 65,535. The start cell is inside the grid.`,
    ex: `<table><thead><tr><th>Before</th><th>After (start at row 1, column 1, new colour 2)</th></tr></thead><tbody>
      <tr><td>1 1 1</td><td><span class="c-g">2 2 2</span></td></tr>
      <tr><td>1 1 0</td><td><span class="c-g">2 2</span> 0</td></tr>
      <tr><td>1 0 1</td><td><span class="c-g">2</span> 0 1</td></tr></tbody></table>
      <p>The 1 in the bottom-right corner stays: it only touches the others diagonally, and diagonals do not count.</p>`,
    bw: `<p>Sweep the whole grid again and again. In each sweep, mark any cell of the old colour that touches an already marked cell. Stop when a sweep marks nothing. One sweep can add only 1 cell in the worst case (a long snake shape), so it can take as many sweeps as there are cells: O((rows × columns)<sup>2</sup>).</p>`,
    bc: "static int[][] FloodFillBrute(int[][] img, int sr, int sc, int color)\n{\n    int old = img[sr][sc];\n    if (old == color) return img;\n    int rows = img.Length, cols = img[0].Length;\n    var painted = new bool[rows, cols];\n    painted[sr, sc] = true;\n    bool changed = true;\n    while (changed)                             // keep sweeping the whole grid\n    {\n        changed = false;\n        for (int r = 0; r < rows; r++)\n            for (int c = 0; c < cols; c++)\n            {\n                if (painted[r, c] || img[r][c] != old) continue;\n                bool touches = (r > 0 && painted[r - 1, c]) || (r + 1 < rows && painted[r + 1, c])\n                            || (c > 0 && painted[r, c - 1]) || (c + 1 < cols && painted[r, c + 1]);\n                if (touches) { painted[r, c] = true; changed = true; }\n            }\n    }\n    for (int r = 0; r < rows; r++)\n        for (int c = 0; c < cols; c++)\n            if (painted[r, c]) img[r][c] = color;\n    return img;\n}   // up to O((rows * cols)^2) time",
    q: ['The start pixel already has the new colour. What should the code do?', ['Return the image unchanged', 'Recurse anyway, it will stop on its own', 'Throw an exception', 'Paint the whole image'], 0, 'If old and new colour are equal, painting a cell does not mark it as visited, so the recursion would bounce between neighbours forever. Return early.'],
    h: ['Painting a cell with the new colour also marks it as "done", as long as the new colour is different from the old one.', 'Write one recursive method: stop if off the grid or not the old colour, else paint and call it for the 4 neighbours.', 'Edge case: old colour equals new colour, return at once. Recipe: old = img[sr][sc]; if old == color return; Paint(sr, sc).'],
    a: `<p>Remember the old colour. From the start cell, do a depth-first walk: if the cell is off the grid, or is not the old colour, stop. Otherwise paint it and visit its 4 neighbours. Because a painted cell no longer has the old colour, it is never entered twice, so no separate "visited" grid is needed. The one trap is when the new colour equals the old colour: then nothing ever changes and the recursion never stops, so return before starting.</p>`,
    sc: "static int[][] FloodFill(int[][] img, int sr, int sc, int color)\n{\n    int old = img[sr][sc];\n    if (old != color) Paint(img, sr, sc, old, color);   // same colour: nothing to do\n    return img;\n}\n\nstatic void Paint(int[][] img, int r, int c, int old, int color)\n{\n    if (r < 0 || c < 0 || r >= img.Length || c >= img[0].Length) return;   // off the grid\n    if (img[r][c] != old) return;               // other colour, or already painted\n    img[r][c] = color;                          // painting is also the \"visited\" mark\n    Paint(img, r + 1, c, old, color); Paint(img, r - 1, c, old, color);\n    Paint(img, r, c + 1, old, color); Paint(img, r, c - 1, old, color);\n}   // O(rows * cols) time, O(rows * cols) stack in the worst case",
    dh: ['Call', 'Cell colour', 'Action'],
    dr: [['Paint(1,1)', '1 (old)', 'paint 2, visit 4 neighbours'], ['Paint(2,1)', '0', 'not old colour, return'], ['Paint(0,1)', '1 (old)', 'paint 2'], ['Paint(0,2)', '1 (old)', 'paint 2'], ['Paint(0,0)', '1 (old)', 'paint 2'], ['Paint(1,0)', '1 (old)', 'paint 2'], ['Paint(2,0)', '1 (old)', 'paint 2'], ['Paint(1,2)', '0', 'not old colour, return'], ['Paint(2,2)', 'never called', 'its only neighbours are 0, so the walk never reaches it']],
    cx: `<p>Time O(rows × columns): each cell is painted at most once and looked at from at most 4 sides. Space O(rows × columns) for the call stack in the worst case (one long snake of the same colour).</p>`,
    f: ['Rewrite it with a queue so that a huge image cannot overflow the stack.', 'How would you also fill diagonal neighbours?']
  })]
});


// ---------- PRACTICE: 3 Easy ----------
practice.push(P({
  t: 'Valid Palindrome After Deleting At Most One Character', l: 'Easy', tags: ['strings', 'two pointers'], co: ['Meta', 'Amazon', 'Microsoft'],
  s: `<p>Given a string <code>s</code>, return true if it is a palindrome (reads the same both ways), or can become one by deleting <b>at most one</b> character.</p>`,
  c: `1 ≤ length ≤ 10<sup>5</sup>, lowercase letters only.`,
  ex: `<p><b>"abca"</b> gives <span class="c-g">true</span>: delete "b" (or "c") and "aca" is left.</p><p><b>"abc"</b> gives <span class="c-r">false</span>: no single delete helps.</p>`,
  bw: `<p>Delete each character in turn and test what is left. That is n deletes and each test reads n characters: O(n<sup>2</sup>) time, plus a new string for every try. For 100,000 characters it is far too slow.</p>`,
  bc: "static bool ValidPalindromeIIBrute(string s)\n{\n    if (IsPlainPalindrome(s)) return true;\n    for (int skip = 0; skip < s.Length; skip++)         // delete each character in turn\n        if (IsPlainPalindrome(s.Remove(skip, 1))) return true;\n    return false;\n}\n\nstatic bool IsPlainPalindrome(string s)\n{\n    for (int i = 0, j = s.Length - 1; i < j; i++, j--)\n        if (s[i] != s[j]) return false;\n    return true;\n}   // O(n^2) time, O(n) space",
  q: ['The pointers meet a mismatch at i and j. Which deletes are worth trying?', ['Only s[i] or s[j]', 'Any character in the string', 'Only the middle character', 'Both s[i] and s[j] together'], 0, 'Everything outside i..j already matched. A delete anywhere else would leave this mismatch in place, so the one delete must remove s[i] or s[j].'],
  h: ['Walk in from both ends like a normal palindrome check. What do you know when the first mismatch appears?', 'At the first mismatch, try skipping the left character, or skipping the right one, and check the rest with a plain helper.', 'You only get one delete, so the helper must be a strict check. Recipe: while i &lt; j: if different, return check(i + 1, j) or check(i, j - 1); else i++, j--. Return true.'],
  a: `<p>Use two pointers from the ends. While the characters match, move inwards. At the <b>first mismatch</b> the one allowed delete must be spent on one of those two characters, so check if the part without the left one, or the part without the right one, is a strict palindrome. You never need to go back, because everything outside the pointers already matched.</p>`,
  sc: "static bool ValidPalindromeII(string s)\n{\n    int i = 0, j = s.Length - 1;\n    while (i < j)\n    {\n        if (s[i] != s[j])                       // first mismatch: spend the one delete here\n            return IsPalRange(s, i + 1, j) || IsPalRange(s, i, j - 1);\n        i++; j--;\n    }\n    return true;\n}\n\nstatic bool IsPalRange(string s, int i, int j)\n{\n    while (i < j) if (s[i++] != s[j--]) return false;\n    return true;\n}   // O(n) time, O(1) space",
  dh: ['i', 'j', 's[i], s[j]', 'Action'],
  dr: [['0', '3', 'a, a', 'match, move in'], ['1', '2', 'b, c', 'mismatch: try the 2 skips'], ['2', '2', 'skip b: "c"', '<span class="c-g">palindrome, return true</span>']],
  cx: `<p>Time O(n): the main walk and at most 2 helper walks. Space O(1), no new strings.</p>`,
  f: ['Allow up to k deletes. Why does this simple idea stop working?', 'Return the index of the character to delete.']
}));

practice.push(P({
  t: 'Merge a Sorted Array Into Another, In Place', l: 'Easy', tags: ['arrays', 'two pointers'], co: ['Microsoft', 'Meta', 'Bloomberg'],
  s: `<p>Array <code>a</code> has <code>m</code> sorted values followed by <code>n</code> empty slots. Array <code>b</code> has <code>n</code> sorted values. Merge <code>b</code> into <code>a</code> so that <code>a</code> is fully sorted. Do not create another array.</p>`,
  c: `0 ≤ m, n ≤ 10<sup>5</sup>, <code>a.Length == m + n</code>.`,
  ex: `<p><b>a</b> = [1, 3, 5, _, _, _], m = 3, <b>b</b> = [2, 4, 6], n = 3 gives <span class="c-g">[1, 2, 3, 4, 5, 6]</span>.</p>`,
  bw: `<p>Copy <code>b</code> into the empty tail and sort the whole array. It works, but sorting costs O((m + n) log(m + n)) and throws away the fact that both halves were already sorted.</p>`,
  bc: "static void MergeInPlaceBrute(int[] a, int m, int[] b, int n)\n{\n    for (int i = 0; i < n; i++) a[m + i] = b[i];        // drop b into the empty tail\n    Array.Sort(a, 0, m + n);                            // then sort everything again\n}   // O((m + n) log(m + n)) time",
  q: ['Why fill the array from the back and not from the front?', ['The back of a is empty, so nothing useful is overwritten', 'It is faster for the CPU cache', 'Sorting needs it', 'The front cannot be indexed'], 0, 'Writing at the front would overwrite values of a that have not been read yet. The free slots are at the back, and the biggest values belong there.'],
  h: ['Where is the free space, and which values belong there: the smallest or the largest?', 'Use 3 indexes: the last real value of a, the last value of b, and the last slot of a. Write the bigger of the two values.', 'Loop while b still has values. If a runs out first, keep copying b. If b runs out first, the rest of a is already in place.'],
  a: `<p>The empty slots are at the end, so fill from the end with the largest values first. Compare the last unmerged value of <code>a</code> with the last unmerged value of <code>b</code>, write the bigger one into the last free slot, and step back. The write index never catches up with the read index of <code>a</code>, so no value is lost. When <code>b</code> is used up, whatever is left in <code>a</code> is already sorted and in the right place.</p>`,
  sc: "static void MergeInPlace(int[] a, int m, int[] b, int n)\n{\n    int i = m - 1, j = n - 1, w = m + n - 1;    // fill from the back, biggest first\n    while (j >= 0)\n    {\n        if (i >= 0 && a[i] > b[j]) a[w--] = a[i--];\n        else a[w--] = b[j--];\n    }                                           // when b is used up, the rest of a is already in place\n}   // O(m + n) time, O(1) space",
  dh: ['i (a)', 'j (b)', 'w', 'Compare', 'a after the write'],
  dr: [['2', '2', '5', '5 vs 6: write 6', '1 3 5 _ _ 6'], ['2', '1', '4', '5 vs 4: write 5', '1 3 5 _ 5 6'], ['1', '1', '3', '3 vs 4: write 4', '1 3 5 4 5 6'], ['1', '0', '2', '3 vs 2: write 3', '1 3 3 4 5 6'], ['0', '0', '1', '1 vs 2: write 2', '1 2 3 4 5 6'], ['0', '-1', '0', 'b is used up: stop', '<span class="c-g">1 2 3 4 5 6</span>']],
  cx: `<p>Time O(m + n): every value is written once. Space O(1).</p>`,
  f: ['Merge k sorted arrays. Which data structure helps?', 'What if the empty slots were at the front of a?']
}));

practice.push(P({
  t: 'Search Insert Position', l: 'Easy', tags: ['arrays', 'binary search'], co: ['Amazon', 'Google', 'Adobe'],
  s: `<p>Given a sorted array of different numbers and a target, return the index of the target. If it is not there, return the index where it would be inserted to keep the array sorted.</p>`,
  c: `0 ≤ n ≤ 10<sup>5</sup>. The expected cost is O(log n).`,
  ex: `<p><b>[1, 3, 5, 6]</b>, target 5 gives <span class="c-g">2</span>. Target 2 gives <span class="c-g">1</span> (between 1 and 3). Target 7 gives <span class="c-g">4</span> (after the end).</p>`,
  bw: `<p>Scan from the left and return the first index whose value is not smaller than the target. Correct, but O(n): it ignores that the array is sorted, and the question asks for O(log n).</p>`,
  bc: "static int SearchInsertBrute(int[] a, int target)\n{\n    for (int i = 0; i < a.Length; i++)\n        if (a[i] >= target) return i;           // first value that is not smaller\n    return a.Length;\n}   // O(n) time",
  q: ['In this version hi starts at a.Length, not a.Length - 1. Why?', ['The answer can be one past the last index', 'To avoid an overflow', 'It makes the loop run once more for safety', 'Arrays in C# start at 1'], 0, 'If the target is bigger than every value, the insert position is n. The search range must include every possible answer.'],
  h: ['You are looking for the first index whose value is greater than or equal to the target.', 'Binary search on the range [0, n]. If a[mid] is too small, the answer is right of mid. Otherwise mid itself may be the answer.', 'Loop while lo &lt; hi. Too small: lo = mid + 1. Otherwise: hi = mid (not mid - 1). Return lo. Empty array returns 0.'],
  a: `<p>This is binary search for a <b>boundary</b>, not for an exact value: find the first position whose value is not smaller than the target. Keep a range [lo, hi] that always contains the answer. If <code>a[mid]</code> is smaller than the target, the answer must be to the right, so <code>lo = mid + 1</code>. Otherwise <code>mid</code> could be the answer, so keep it with <code>hi = mid</code>. When <code>lo == hi</code>, that is the answer. This pattern is called "lower bound".</p>`,
  sc: "static int SearchInsert(int[] a, int target)\n{\n    int lo = 0, hi = a.Length;                  // the answer lies in [lo, hi]\n    while (lo < hi)\n    {\n        int mid = lo + (hi - lo) / 2;\n        if (a[mid] < target) lo = mid + 1;      // mid is too small: answer is to the right\n        else hi = mid;                          // mid could be the answer: keep it\n    }\n    return lo;\n}   // O(log n) time, O(1) space",
  dh: ['lo', 'hi', 'mid', 'a[mid] vs 2', 'Action'],
  dr: [['0', '4', '2', '5 ≥ 2', 'hi = 2'], ['0', '2', '1', '3 ≥ 2', 'hi = 1'], ['0', '1', '0', '1 &lt; 2', 'lo = 1'], ['1', '1', '', 'lo == hi', '<span class="c-g">return 1</span>']],
  cx: `<p>Time O(log n), space O(1).</p>`,
  f: ['The array has duplicates. Return the first and the last position of the target.', 'Which built-in .NET method does this, and what does a negative result mean?']
}));

// ---------- PRACTICE: 5 Medium ----------
practice.push(P({
  t: 'Find All Anagrams of a Pattern in a String', l: 'Medium', tags: ['strings', 'sliding window', 'counting'], co: ['Amazon', 'Meta', 'Uber'],
  s: `<p>Given strings <code>s</code> and <code>p</code>, return every start index in <code>s</code> where a substring of length <code>p.Length</code> is an anagram of <code>p</code> (same letters, any order).</p>`,
  c: `1 ≤ lengths ≤ 3 × 10<sup>4</sup>, lowercase letters only.`,
  ex: `<p><b>s</b> = "cbaebabacd", <b>p</b> = "abc" gives <span class="c-g">[0, 6]</span>: "cba" starts at 0 and "bac" starts at 6.</p>`,
  bw: `<p>Take every window of length m, sort its letters, and compare with the sorted pattern. There are about n windows and each sort costs O(m log m), so O(n × m log m). Each window is sorted from scratch even though it differs from the last one by only 2 letters.</p>`,
  bc: "static List<int> FindAnagramsBrute(string s, string p)\n{\n    var res = new List<int>();\n    char[] want = p.ToCharArray(); Array.Sort(want);\n    string key = new string(want);\n    for (int i = 0; i + p.Length <= s.Length; i++)\n    {\n        char[] w = s.Substring(i, p.Length).ToCharArray();\n        Array.Sort(w);                          // sort every window again\n        if (new string(w) == key) res.Add(i);\n    }\n    return res;\n}   // O(n * m log m) time",
  q: ['The window slides one step right. How many letter counts change?', ['2: one letter enters, one leaves', 'All 26', 'm of them', 'None'], 0, 'Only the new letter on the right and the old letter on the left change. That is why the window can be updated in O(1).'],
  h: ['Neighbouring windows share all but 2 letters. Do not recount.', 'Keep need[26] = how many of each letter the window still lacks, and one number "missing" = total letters still lacking.', 'Entering letter: if need was above 0 before the decrease, missing--. Leaving letter: if need was 0 or more before the increase, missing++. When missing is 0, record i - m + 1.'],
  a: `<p>Slide a window of fixed length m over <code>s</code>. <code>need[c]</code> starts as the count of each letter in <code>p</code>. When a letter enters the window, decrease its need. If the need was positive, that letter was useful, so <code>missing</code> goes down. When a letter leaves, increase its need. If the need was 0 or more before the increase, the window just lost a useful letter, so <code>missing</code> goes up. A negative need means "the window has extra copies of this letter". Whenever <code>missing</code> is 0, the window is an anagram.</p>`,
  sc: "static List<int> FindAnagrams(string s, string p)\n{\n    var res = new List<int>();\n    if (p.Length > s.Length) return res;\n    var need = new int[26];\n    foreach (char c in p) need[c - 'a']++;\n    int missing = p.Length;                     // letters of p not yet covered by the window\n    for (int i = 0; i < s.Length; i++)\n    {\n        if (need[s[i] - 'a']-- > 0) missing--;          // new letter enters on the right\n        if (i >= p.Length && need[s[i - p.Length] - 'a']++ >= 0) missing++;   // old letter leaves on the left\n        if (missing == 0) res.Add(i - p.Length + 1);\n    }\n    return res;\n}   // O(n) time, O(1) space",
  dh: ['i', 'enters', 'leaves', 'missing', 'Result'],
  dr: [['0', 'c', '', '2', ''], ['1', 'b', '', '1', ''], ['2', 'a', '', '0', '<span class="c-g">add 0</span>'], ['3', 'e (not needed)', 'c (was useful)', '1', ''], ['6', 'b (extra copy)', 'e', '1', 'window "bab"'], ['8', 'c', 'a (extra copy)', '0', '<span class="c-g">add 6</span>'], ['9', 'd', 'b (was useful)', '1', '']],
  cx: `<p>Time O(n): each letter enters once and leaves once. Space O(1): a fixed array of 26 counts.</p>`,
  f: ['Return true as soon as any permutation of p appears in s.', 'The text can hold any Unicode letter. What replaces the int[26]?']
}));

practice.push(P({
  t: 'Compress a Character Array In Place', l: 'Medium', tags: ['strings', 'two pointers'], co: ['Microsoft', 'Apple', 'Goldman Sachs'],
  s: `<p>Given a <code>char[]</code>, compress it in place: each run of the same character becomes the character followed by the run length, but a run of length 1 is written without a number. Return the new length. Lengths of 10 or more are written as several digit characters.</p>`,
  c: `1 ≤ n ≤ 2,000. Use O(1) extra space.`,
  ex: `<p><b>['a','a','b','b','c','c','c']</b> gives length <span class="c-g">6</span> and the array starts with <b>a 2 b 2 c 3</b>.</p><p><b>['a']</b> gives length 1, unchanged. 12 b's give <b>b 1 2</b>.</p>`,
  bw: `<p>Build the compressed text in a <code>StringBuilder</code> and copy it back. The time is fine, O(n), but it uses O(n) extra memory, and the question asks for O(1).</p>`,
  bc: "static int CompressCharsBrute(char[] chars)\n{\n    var sb = new StringBuilder();\n    int i = 0;\n    while (i < chars.Length)\n    {\n        int j = i;\n        while (j < chars.Length && chars[j] == chars[i]) j++;   // end of this run\n        sb.Append(chars[i]);\n        if (j - i > 1) sb.Append(j - i);\n        i = j;\n    }\n    for (int k = 0; k < sb.Length; k++) chars[k] = sb[k];       // copy back\n    return sb.Length;\n}   // O(n) time, but O(n) extra space",
  q: ['Why can the write index never overtake the read index?', ['A run of k characters is written with at most k characters', 'Because the array is sorted', 'Because digits are smaller than letters', 'It can, so a buffer is needed'], 0, 'A run of 1 writes 1 character. A run of k ≥ 2 writes 1 letter plus the digits of k, which is never more than k characters. So the output never needs more room than was already read.'],
  h: ['The compressed form is never longer than the original. So you can write into the same array you are reading.', 'Use a read index that jumps over whole runs and a write index that writes the letter and then the digits.', 'For the digits, turn the run length into a string and write each character. Skip the number when the run is 1.'],
  a: `<p>Use two indexes. <code>read</code> walks to the end of each run and so knows its length. <code>write</code> stores the character and then, only if the run is longer than 1, each digit of the length. Since a run of k characters never needs more than k output characters, <code>write</code> stays at or behind <code>read</code> and nothing unread is overwritten.</p>`,
  sc: "static int CompressChars(char[] chars)\n{\n    int write = 0, read = 0;\n    while (read < chars.Length)\n    {\n        char c = chars[read];\n        int start = read;\n        while (read < chars.Length && chars[read] == c) read++;   // walk to the end of the run\n        chars[write++] = c;\n        int run = read - start;\n        if (run > 1)\n            foreach (char d in run.ToString()) chars[write++] = d; // 12 is written as '1', '2'\n    }\n    return write;\n}   // O(n) time, O(1) extra space",
  dh: ['Run', 'read after the run', 'Written', 'write'],
  dr: [['a × 2', '2', 'a, 2', '2'], ['b × 2', '4', 'b, 2', '4'], ['c × 3', '7', 'c, 3', '<span class="c-g">6 (returned)</span>']],
  cx: `<p>Time O(n). Extra space O(1) (the few digits of one number).</p>`,
  f: ['Write the matching decompress method.', 'When is this kind of compression worse than no compression?']
}));

practice.push(P({
  t: 'Maximum Product Subarray', l: 'Medium', tags: ['arrays', 'running total'], co: ['Amazon', 'LinkedIn', 'Microsoft'],
  s: `<p>Given an integer array, return the largest product of any non-empty continuous run of values.</p>`,
  c: `1 ≤ n ≤ 2 × 10<sup>4</sup>, values from -10 to 10. The answer fits in <code>int</code>.`,
  ex: `<p><b>[2, 3, -2, 4]</b> gives <span class="c-g">6</span> (2 × 3).</p><p><b>[-2, 3, -4]</b> gives <span class="c-g">24</span>: two negatives multiply to a positive.</p>`,
  bw: `<p>For every start index, multiply forward and remember the best product seen. Two nested loops: O(n<sup>2</sup>).</p>`,
  bc: "static int MaxProductBrute(int[] a)\n{\n    int best = a[0];\n    for (int i = 0; i < a.Length; i++)\n    {\n        int prod = 1;\n        for (int j = i; j < a.Length; j++)\n        {\n            prod *= a[j];                       // product of a[i..j]\n            best = Math.Max(best, prod);\n        }\n    }\n    return best;\n}   // O(n^2) time",
  q: ['Why is tracking only the largest product so far not enough?', ['A very negative product can become the largest after one more negative number', 'Products cannot be compared', 'Zero resets nothing', 'The array may be unsorted'], 0, 'Multiplying by a negative flips the order: the smallest (most negative) product becomes the largest. So you must carry both.'],
  h: ['This is Kadane with multiplication. What does a negative number do to "largest" and "smallest"?', 'Keep the largest and the smallest product of a run ending at the current index.', 'When the current value is negative, swap the two before updating. A zero makes both restart, which the max and min with x handle for you.'],
  a: `<p>For sums, Kadane keeps one number: the best run ending here. For products that is not enough, because a negative value turns the smallest product into the largest. So keep two: <code>hi</code> (largest product ending here) and <code>lo</code> (smallest). When the current value is negative, swap them, then update each with "start fresh at x, or extend". The answer is the largest <code>hi</code> ever seen.</p>`,
  sc: "static int MaxProduct(int[] a)\n{\n    int best = a[0], hi = a[0], lo = a[0];      // biggest and smallest product ending here\n    for (int i = 1; i < a.Length; i++)\n    {\n        int x = a[i];\n        if (x < 0) { int t = hi; hi = lo; lo = t; }     // a negative swaps their roles\n        hi = Math.Max(x, hi * x);\n        lo = Math.Min(x, lo * x);\n        best = Math.Max(best, hi);\n    }\n    return best;\n}   // O(n) time, O(1) space",
  dh: ['x', 'swap?', 'hi', 'lo', 'best'],
  dr: [['-2 (start)', '', '-2', '-2', '-2'], ['3', 'no', 'max(3, -6) = 3', 'min(3, -6) = -6', '3'], ['-4', 'yes: hi = -6, lo = 3', 'max(-4, 24) = 24', 'min(-4, -12) = -12', '<span class="c-g">24</span>']],
  cx: `<p>Time O(n), space O(1).</p>`,
  f: ['Values can be large. How do you guard against overflow?', 'Return the start and end index of the best run.']
}));

practice.push(P({
  t: 'Search a Fully Sorted Matrix', l: 'Medium', tags: ['matrix', 'binary search'], co: ['Amazon', 'Microsoft', 'Oracle'],
  s: `<p>Each row of the matrix is sorted, and the first value of every row is greater than the last value of the row above. Return true if <code>target</code> is in the matrix. The expected cost is O(log(rows × columns)).</p>`,
  c: `1 ≤ rows, columns ≤ 100.`,
  ex: `<table><tbody><tr><td>1</td><td>3</td><td>5</td><td>7</td></tr><tr><td>10</td><td>11</td><td><span class="c-g">16</span></td><td>20</td></tr><tr><td>23</td><td>30</td><td>34</td><td>60</td></tr></tbody></table><p>Target 16 gives <span class="c-g">true</span>. Target 13 gives <span class="c-r">false</span>.</p>`,
  bw: `<p>Look at every cell: O(rows × columns). It uses none of the ordering.</p>`,
  bc: "static bool SearchSortedMatrixBrute(int[][] m, int target)\n{\n    foreach (int[] row in m)\n        foreach (int x in row)\n            if (x == target) return true;\n    return false;\n}   // O(rows * cols) time",
  q: ['Flat index 6 in a matrix with 4 columns is which cell?', ['row 1, column 2', 'row 2, column 1', 'row 6, column 0', 'row 0, column 6'], 0, 'row = 6 / 4 = 1 (whole-number division), column = 6 % 4 = 2.'],
  h: ['Read row after row and the values form one long sorted list.', 'Binary search over indexes 0 to rows × columns - 1.', 'Convert a flat index with row = mid / columns and column = mid % columns. Divide by the number of columns, not rows.'],
  a: `<p>Because each row continues where the previous one ended, the matrix is one sorted list that has been cut into rows. Run a normal binary search on the flat indexes 0 to rows × columns - 1, and turn each middle index into a cell with <code>mid / cols</code> and <code>mid % cols</code>. Do not copy the matrix into a list: that would cost O(rows × columns) and defeat the purpose.</p>`,
  sc: "static bool SearchSortedMatrix(int[][] m, int target)\n{\n    int rows = m.Length, cols = m[0].Length;\n    int lo = 0, hi = rows * cols - 1;           // pretend it is one long sorted array\n    while (lo <= hi)\n    {\n        int mid = lo + (hi - lo) / 2;\n        int x = m[mid / cols][mid % cols];      // flat index -> row, column\n        if (x == target) return true;\n        if (x < target) lo = mid + 1; else hi = mid - 1;\n    }\n    return false;\n}   // O(log(rows * cols)) time, O(1) space",
  dh: ['lo', 'hi', 'mid', 'cell', 'value vs 16', 'Action'],
  dr: [['0', '11', '5', '[1][1]', '11 &lt; 16', 'lo = 6'], ['6', '11', '8', '[2][0]', '23 &gt; 16', 'hi = 7'], ['6', '7', '6', '[1][2]', '16 = 16', '<span class="c-g">return true</span>']],
  cx: `<p>Time O(log(rows × columns)), space O(1).</p>`,
  f: ['Rows and columns are sorted, but a row does not continue the one above. Which search do you use, and what does it cost?', 'Do two binary searches instead (first the row, then inside it). Is that faster?']
}));

practice.push(P({
  t: 'Rotting Oranges (Spread From Many Starting Points)', l: 'Medium', tags: ['matrix', 'bfs'], co: ['Amazon', 'Microsoft', 'Walmart'],
  s: `<p>In a grid, 0 is an empty cell, 1 is a fresh orange and 2 is a rotten orange. Every minute, each fresh orange that touches a rotten one (up, down, left, right) becomes rotten. Return the number of minutes until no fresh orange is left, or -1 if that never happens.</p>`,
  c: `1 ≤ rows, columns ≤ 10.`,
  ex: `<table><tbody><tr><td><span class="c-r">2</span></td><td>1</td><td>1</td></tr><tr><td>1</td><td>1</td><td>0</td></tr><tr><td>0</td><td>1</td><td>1</td></tr></tbody></table><p>Answer <span class="c-g">4</span>. The orange in the bottom-right corner is 4 steps away from the rotten one.</p>`,
  bw: `<p>Simulate minute by minute: sweep the whole grid, collect the fresh oranges that touch a rotten one, rot them, repeat. Each sweep costs rows × columns and there can be that many minutes, so O((rows × columns)<sup>2</sup>).</p>`,
  bc: "static int OrangesRottingBrute(int[][] g)\n{\n    int rows = g.Length, cols = g[0].Length, minutes = 0;\n    while (true)\n    {\n        var turn = new List<int[]>();           // fresh oranges that rot this minute\n        for (int r = 0; r < rows; r++)\n            for (int c = 0; c < cols; c++)\n            {\n                if (g[r][c] != 1) continue;\n                bool nextToRotten = (r > 0 && g[r - 1][c] == 2) || (r + 1 < rows && g[r + 1][c] == 2)\n                                 || (c > 0 && g[r][c - 1] == 2) || (c + 1 < cols && g[r][c + 1] == 2);\n                if (nextToRotten) turn.Add(new[] { r, c });\n            }\n        if (turn.Count == 0) break;\n        foreach (int[] cell in turn) g[cell[0]][cell[1]] = 2;\n        minutes++;\n    }\n    foreach (int[] row in g) foreach (int x in row) if (x == 1) return -1;\n    return minutes;\n}   // O((rows * cols)^2) time in the worst case",
  q: ['Several oranges are rotten at the start. How do you begin the BFS?', ['Put all of them in the queue before the loop', 'Run a separate BFS from each and take the maximum', 'Start from the top-left one', 'Sort them first'], 0, 'All rotten oranges act at the same time. Loading them all at minute 0 makes the BFS rings grow from every source together. Separate searches would give wrong, too-large times.'],
  h: ['Rot spreads one step per minute from every rotten orange at once. That is BFS levels.', 'Queue all rotten cells first, count the fresh ones, then process the queue one whole level per minute.', 'Stop when no fresh orange is left, so you do not count an extra minute. At the end, fresh &gt; 0 means -1. No fresh oranges at the start means 0.'],
  a: `<p>This is a breadth-first search with <b>many starting points</b>. Put every rotten orange in the queue and count the fresh ones. Then repeat: take everything that is in the queue right now (one level), rot the fresh neighbours and add them. Each level is one minute. Counting fresh oranges gives both the stop test and the -1 answer without a final scan.</p>`,
  sc: "static int OrangesRotting(int[][] g)\n{\n    int rows = g.Length, cols = g[0].Length, fresh = 0, minutes = 0;\n    var q = new Queue<int[]>();\n    for (int r = 0; r < rows; r++)\n        for (int c = 0; c < cols; c++)\n        {\n            if (g[r][c] == 2) q.Enqueue(new[] { r, c });   // every rotten orange starts at minute 0\n            else if (g[r][c] == 1) fresh++;\n        }\n    int[] dr = { 1, -1, 0, 0 }, dc = { 0, 0, 1, -1 };\n    while (q.Count > 0 && fresh > 0)\n    {\n        minutes++;\n        for (int size = q.Count; size > 0; size--)         // one whole level = one minute\n        {\n            int[] cell = q.Dequeue();\n            for (int k = 0; k < 4; k++)\n            {\n                int nr = cell[0] + dr[k], nc = cell[1] + dc[k];\n                if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || g[nr][nc] != 1) continue;\n                g[nr][nc] = 2;\n                fresh--;\n                q.Enqueue(new[] { nr, nc });\n            }\n        }\n    }\n    return fresh == 0 ? minutes : -1;\n}   // O(rows * cols) time and space",
  dh: ['Minute', 'Cells that rot', 'Fresh left'],
  dr: [['0', 'start: (0,0) is rotten', '6'], ['1', '(0,1), (1,0)', '4'], ['2', '(0,2), (1,1)', '2'], ['3', '(2,1)', '1'], ['4', '(2,2)', '<span class="c-g">0, return 4</span>']],
  cx: `<p>Time O(rows × columns): each cell enters the queue at most once. Space O(rows × columns) for the queue.</p>`,
  f: ['Return the time at which each orange rots.', 'The method changes the caller\'s grid. How would you avoid that?']
}));

// ---------- PRACTICE: 4 Hard ----------
practice.push(P({
  t: 'First Missing Positive', l: 'Hard', tags: ['arrays', 'in place'], co: ['Amazon', 'Google', 'Microsoft'],
  s: `<p>Given an unsorted integer array, return the smallest positive whole number (1, 2, 3 ...) that is not in it. Use O(n) time and O(1) extra space.</p>`,
  c: `1 ≤ n ≤ 10<sup>5</sup>, values can be negative, zero or very large. You may change the array.`,
  ex: `<p><b>[3, 4, -1, 1]</b> gives <span class="c-g">2</span>. <b>[1, 2, 0]</b> gives <span class="c-g">3</span>. <b>[7, 8, 9]</b> gives <span class="c-g">1</span>.</p>`,
  bw: `<p>Put everything in a <code>HashSet</code> and count up from 1 until a number is absent. O(n) time, but O(n) extra memory, which the question forbids. Sorting first would save the memory but cost O(n log n).</p>`,
  bc: "static int FirstMissingPositiveBrute(int[] a)\n{\n    var seen = new HashSet<int>(a);\n    int x = 1;\n    while (seen.Contains(x)) x++;               // count up until a number is absent\n    return x;\n}   // O(n) time, but O(n) extra space",
  q: ['An array has n items. What is the largest value the answer can have?', ['n + 1', 'n', 'The largest value in the array plus 1', 'There is no limit'], 0, 'The best case is that the array holds exactly 1 to n, and then the answer is n + 1. So only values 1 to n matter, and the array itself has room to record them.'],
  h: ['The answer is between 1 and n + 1. Values outside 1 to n can be ignored.', 'Use the array as its own lookup table: value v belongs at index v - 1. Swap values to their home.', 'Keep swapping at index i until the value there is out of range or already home (this also stops on duplicates). Then the first index i with a[i] != i + 1 gives the answer i + 1.'],
  a: `<p>Only the numbers 1 to n can affect the answer, and an array of n slots has exactly one slot for each: value v goes to index v - 1. Walk the array, and while the current value is in range and not yet at home, swap it to its home. The test <code>a[a[i] - 1] != a[i]</code> also stops when the home already holds the same value, so duplicates cannot loop forever. Afterwards, the first index whose value is not index + 1 names the missing number. If every slot is right, the answer is n + 1.</p>`,
  sc: "static int FirstMissingPositive(int[] a)\n{\n    int n = a.Length;\n    for (int i = 0; i < n; i++)\n        while (a[i] >= 1 && a[i] <= n && a[a[i] - 1] != a[i])   // value v belongs at index v - 1\n        {\n            int home = a[i] - 1;\n            int t = a[home]; a[home] = a[i]; a[i] = t;\n        }\n    for (int i = 0; i < n; i++)\n        if (a[i] != i + 1) return i + 1;        // first seat with the wrong guest\n    return n + 1;\n}   // O(n) time, O(1) space",
  dh: ['i', 'Action', 'Array'],
  dr: [['0', '3 goes home to index 2', '-1 4 3 1'], ['0', '-1 is out of range: move on', '-1 4 3 1'], ['1', '4 goes home to index 3', '-1 1 3 4'], ['1', '1 goes home to index 0', '1 -1 3 4'], ['2, 3', '3 and 4 are home', '1 -1 3 4'], ['scan', 'index 1 holds -1, not 2', '<span class="c-g">return 2</span>']],
  cx: `<p>Time O(n): every swap puts one value in its final place, so there are at most n swaps in total, even though there is a loop inside a loop. Space O(1).</p>`,
  f: ['You may not change the array and may use only O(1) space. Is O(n) time still possible?', 'Why would marking with negative signs fail on this input without a clean-up step?']
}));

practice.push(P({
  t: 'Median of Two Sorted Arrays', l: 'Hard', tags: ['arrays', 'binary search'], co: ['Google', 'Amazon', 'Apple'],
  s: `<p>Given two sorted arrays, return the median of all their values together. The median is the middle value, or the average of the 2 middle values when the total count is even. The expected cost is O(log(m + n)).</p>`,
  c: `0 ≤ m, n ≤ 1,000, m + n ≥ 1.`,
  ex: `<p><b>[1, 3]</b> and <b>[2]</b> give <span class="c-g">2.0</span> (merged: 1, 2, 3).</p><p><b>[1, 2]</b> and <b>[3, 4]</b> give <span class="c-g">2.5</span> (average of 2 and 3).</p>`,
  bw: `<p>Merge both arrays into one sorted array and read the middle. O(m + n) time and memory. It is a fine first answer, but it does more work than needed: you only need to know where the middle is, not the full order.</p>`,
  bc: "static double MedianBrute(int[] a, int[] b)\n{\n    var all = new int[a.Length + b.Length];\n    int i = 0, j = 0, k = 0;\n    while (i < a.Length && j < b.Length) all[k++] = a[i] <= b[j] ? a[i++] : b[j++];\n    while (i < a.Length) all[k++] = a[i++];\n    while (j < b.Length) all[k++] = b[j++];\n    int n = all.Length;\n    return n % 2 == 1 ? all[n / 2] : (all[n / 2 - 1] + all[n / 2]) / 2.0;\n}   // O(m + n) time and space",
  q: ['You take i values from the first array for the left half. How many must come from the second array?', ['half - i, where half = (m + n + 1) / 2', 'i as well', 'n - i', 'Any number'], 0, 'The left half has a fixed size. Once i is chosen, j is forced. That is why a search over one number is enough.'],
  h: ['The median splits all values into a left half and a right half of equal size, with everything on the left not greater than everything on the right.', 'Choose how many values (i) the left half takes from the shorter array. Then the count from the other array is fixed. Binary search i.', 'A cut is correct when aLeft ≤ bRight and bLeft ≤ aRight. Use int.MinValue and int.MaxValue for a cut at an end. Odd total: the answer is the largest value on the left.'],
  a: `<p>Do not merge. Instead, look for a <b>cut</b>: take <code>i</code> values from <code>a</code> and <code>j = half - i</code> from <code>b</code> for the left half. The cut is right when the last value on the left of each array is not greater than the first value on the right of the other array. If <code>a</code> gave too many (its left value is greater than <code>b</code>'s right value), move <code>i</code> down, otherwise up. That is a binary search on <code>i</code>, done on the shorter array so that <code>j</code> never goes negative. The median is then the largest left value, or its average with the smallest right value.</p>`,
  sc: "static double Median(int[] a, int[] b)\n{\n    if (a.Length > b.Length) return Median(b, a);       // binary search the shorter one\n    int m = a.Length, n = b.Length, half = (m + n + 1) / 2;\n    int lo = 0, hi = m;\n    while (true)\n    {\n        int i = lo + (hi - lo) / 2;             // take i items from a ...\n        int j = half - i;                       // ... and j items from b for the left half\n        int aLeft = i == 0 ? int.MinValue : a[i - 1], aRight = i == m ? int.MaxValue : a[i];\n        int bLeft = j == 0 ? int.MinValue : b[j - 1], bRight = j == n ? int.MaxValue : b[j];\n        if (aLeft > bRight) hi = i - 1;         // took too many from a\n        else if (bLeft > aRight) lo = i + 1;    // took too few from a\n        else\n        {\n            int leftMax = Math.Max(aLeft, bLeft);\n            if ((m + n) % 2 == 1) return leftMax;\n            return ((long)leftMax + Math.Min(aRight, bRight)) / 2.0;\n        }\n    }\n}   // O(log(min(m, n))) time, O(1) space",
  dh: ['i', 'j', 'aLeft, aRight', 'bLeft, bRight', 'Action'],
  dr: [['1', '1', '1, 2', '3, 4', 'bLeft 3 &gt; aRight 2: lo = 2'], ['2', '0', '2, +max', '-min, 3', 'valid cut'], ['', '', 'left max = 2', 'right min = 3', '<span class="c-g">(2 + 3) / 2 = 2.5</span>']],
  cx: `<p>Time O(log(min(m, n))), space O(1).</p>`,
  f: ['Find the k-th smallest value of the two arrays.', 'Why is the average computed with a long?']
}));

practice.push(P({
  t: 'Longest Valid Parentheses', l: 'Hard', tags: ['strings', 'stack'], co: ['Amazon', 'Meta', 'Bloomberg'],
  s: `<p>Given a string of only "(" and ")", return the length of the longest continuous part that is a valid bracket sequence.</p>`,
  c: `0 ≤ length ≤ 3 × 10<sup>4</sup>.`,
  ex: `<p><b>")()())"</b> gives <span class="c-g">4</span>: the part "()()".</p><p><b>"(()"</b> gives <span class="c-g">2</span>.</p>`,
  bw: `<p>For every start index, walk right and keep a count of open brackets. If the count drops below 0, stop. Whenever it is exactly 0, the part so far is valid. Two nested loops: O(n<sup>2</sup>).</p>`,
  bc: "static int LongestValidParenthesesBrute(string s)\n{\n    int best = 0;\n    for (int i = 0; i < s.Length; i++)\n    {\n        int open = 0;\n        for (int j = i; j < s.Length; j++)\n        {\n            if (s[j] == '(') open++; else open--;\n            if (open < 0) break;                // a ')' with no partner: this start is dead\n            if (open == 0) best = Math.Max(best, j - i + 1);\n        }\n    }\n    return best;\n}   // O(n^2) time",
  q: ['Why does the stack hold indexes and not the bracket characters?', ['To measure a length you need positions', 'Characters cannot be pushed on a stack', 'To save memory', 'Because the brackets are all the same'], 0, 'The length of a valid part is "current index minus the index just before the part started". Only indexes can give that.'],
  h: ['When a ")" closes a "(", how far back does the valid part reach?', 'Keep a stack of indexes. The bottom item is always "the index just before the current valid stretch". Start it with -1.', 'On "(" push the index. On ")" pop; if the stack is now empty push this index as the new base, otherwise the length is i minus the top of the stack.'],
  a: `<p>Use a stack of indexes, starting with -1 as a base. Push the index of every "(". On a ")", pop once. If the stack is now empty, this ")" had no partner, so it becomes the new base. Otherwise the top of the stack is the position just before the valid part that ends here, so its length is <code>i - top</code>. Two valid parts side by side, like "()()", join up automatically because the base under them did not move.</p>`,
  sc: "static int LongestValidParentheses(string s)\n{\n    var st = new Stack<int>();\n    st.Push(-1);                                // index just before the current valid stretch\n    int best = 0;\n    for (int i = 0; i < s.Length; i++)\n    {\n        if (s[i] == '(') st.Push(i);\n        else\n        {\n            st.Pop();                           // match the latest '(' (or use up the base)\n            if (st.Count == 0) st.Push(i);      // unmatched ')': new base\n            else best = Math.Max(best, i - st.Peek());\n        }\n    }\n    return best;\n}   // O(n) time, O(n) space",
  dh: ['i', 'char', 'Stack after', 'best'],
  dr: [['start', '', '[-1]', '0'], ['0', ')', 'pop, empty: push 0, so [0]', '0'], ['1', '(', '[0, 1]', '0'], ['2', ')', '[0]: length 2 - 0', '2'], ['3', '(', '[0, 3]', '2'], ['4', ')', '[0]: length 4 - 0', '<span class="c-g">4</span>'], ['5', ')', 'pop, empty: push 5, so [5]', '4']],
  cx: `<p>Time O(n), space O(n) for the stack. A two-pass counter version reaches O(1) space.</p>`,
  f: ['Solve it with O(1) extra space using two scans.', 'Return the substring, not just the length.']
}));

practice.push(P({
  t: 'Shortest Grid Path When You May Break k Walls', l: 'Hard', tags: ['matrix', 'bfs', 'state'], co: ['Google', 'Amazon', 'Uber'],
  s: `<p>In a grid, 0 is an open cell and 1 is a wall. You start top-left and want to reach bottom-right, moving up, down, left or right. You may walk through at most <code>k</code> walls. Return the fewest steps, or -1 if it is not possible. The start and end cells are open.</p>`,
  c: `1 ≤ rows, columns ≤ 40, 0 ≤ k ≤ rows × columns.`,
  ex: `<table><tbody><tr><td><span class="c-g">0</span></td><td>0</td><td>0</td></tr><tr><td><span class="c-y">1</span></td><td>1</td><td>0</td></tr><tr><td><span class="c-g">0</span></td><td>0</td><td>0</td></tr><tr><td><span class="c-g">0</span></td><td>1</td><td>1</td></tr><tr><td><span class="c-g">0</span></td><td><span class="c-g">0</span></td><td><span class="c-g">0</span></td></tr></tbody></table><p>With k = 1 the answer is <span class="c-g">6</span>: go straight down through the wall at row 1, then along the bottom. Without breaking a wall it takes 10 steps.</p>`,
  bw: `<p>Try every possible path with recursion and backtracking, and keep the shortest. The number of paths grows exponentially with the grid size, so even a 10 × 10 grid is too much.</p>`,
  bc: "static int ShortestPathKBrute(int[][] g, int k)\n{\n    var seen = new bool[g.Length, g[0].Length];\n    int best = Explore(g, 0, 0, k, 0, seen);\n    return best == int.MaxValue ? -1 : best;\n}\n\nstatic int Explore(int[][] g, int r, int c, int k, int steps, bool[,] seen)\n{\n    if (r < 0 || c < 0 || r >= g.Length || c >= g[0].Length || seen[r, c]) return int.MaxValue;\n    if (g[r][c] == 1 && --k < 0) return int.MaxValue;   // out of wall breaks\n    if (r == g.Length - 1 && c == g[0].Length - 1) return steps;\n    seen[r, c] = true;                          // try every simple path\n    int best = Math.Min(\n        Math.Min(Explore(g, r + 1, c, k, steps + 1, seen), Explore(g, r - 1, c, k, steps + 1, seen)),\n        Math.Min(Explore(g, r, c + 1, k, steps + 1, seen), Explore(g, r, c - 1, k, steps + 1, seen)));\n    seen[r, c] = false;\n    return best;\n}   // exponential time",
  q: ['Why is a plain visited grid (true or false per cell) wrong here?', ['Reaching a cell with more wall breaks left can lead to a better result later', 'BFS does not need visited marks', 'Walls cannot be marked', 'The grid is too large'], 0, 'Two visits to the same cell are not equal: one may have 0 breaks left, the other 2. The state is (cell, breaks left), not just the cell.'],
  h: ['Fewest steps with equal step cost means BFS. But what exactly is a "state" here?', 'A state is (row, column, breaks left). For each cell remember the largest number of breaks you ever arrived with.', 'Skip a move if you already reached that cell with the same or more breaks left: BFS got there no later, so the old visit is at least as good. Entering a wall costs 1 break; negative means not allowed.'],
  a: `<p>Run a breadth-first search where the state is the cell <b>plus how many wall breaks are left</b>. BFS reaches states in order of steps, so the first time the end cell comes out of the queue, its step count is the answer. To keep the search small, store for each cell the most breaks you have ever had on arrival. A new arrival with the same or fewer breaks came later (or at the same time) and can do nothing the earlier one could not, so drop it. Initialising that table with -1 also makes "breaks would go negative" fail the same test.</p>`,
  sc: "static int ShortestPathK(int[][] g, int k)\n{\n    int rows = g.Length, cols = g[0].Length;\n    var left = new int[rows, cols];             // most wall breaks we still had on reaching a cell\n    for (int r = 0; r < rows; r++)\n        for (int c = 0; c < cols; c++) left[r, c] = -1;\n    var q = new Queue<int[]>();                 // { row, col, breaks left, steps }\n    q.Enqueue(new[] { 0, 0, k, 0 });\n    left[0, 0] = k;\n    int[] dr = { 1, -1, 0, 0 }, dc = { 0, 0, 1, -1 };\n    while (q.Count > 0)\n    {\n        int[] cur = q.Dequeue();\n        if (cur[0] == rows - 1 && cur[1] == cols - 1) return cur[3];\n        for (int d = 0; d < 4; d++)\n        {\n            int nr = cur[0] + dr[d], nc = cur[1] + dc[d];\n            if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;\n            int rest = cur[2] - g[nr][nc];      // walking into a wall costs one break\n            if (rest <= left[nr, nc]) continue; // came here before with at least as many breaks\n            left[nr, nc] = rest;\n            q.Enqueue(new[] { nr, nc, rest, cur[3] + 1 });\n        }\n    }\n    return -1;\n}   // O(rows * cols * k) time and space",
  dh: ['Step', 'State (row, col, breaks left)', 'Note'],
  dr: [['0', '(0,0,1)', 'start'], ['1', '(1,0,0) and (0,1,1)', 'going down breaks the wall'], ['2', '(2,0,0), (1,1,0), (0,2,1)', '(1,1) is reached with 0 breaks'], ['3', '(3,0,0), (2,1,0), (1,2,1)', 'keep expanding ring by ring'], ['4', '(4,0,0), ...', ''], ['5', '(4,1,0), ...', ''], ['6', '(4,2,0)', '<span class="c-g">end cell: return 6</span>']],
  cx: `<p>Time and space O(rows × columns × k): each cell can be re-queued at most once per higher break count.</p>`,
  f: ['If k is at least rows + columns - 2, what is the answer without any search?', 'Steps now have different costs. Which algorithm replaces BFS?']
}));


// ---------- QUIZ ----------
quiz.push(
  { q: `The interviewer finishes reading the question. What is the best first move?`, options: [`Start typing the optimal solution`, `Restate the problem and ask about the input (size, empty, duplicates)`, `Ask which pattern they want`, `Write unit tests`], answer: 1, explain: `Restating shows you understood, and the answers (size, duplicates, empty input) decide which approach is acceptable. Typing first risks solving the wrong problem.` },
  { q: `You are told n can be 100,000. Which approach is too slow?`, options: [`O(n)`, `O(n log n)`, `O(n<sup>2</sup>)`, `O(log n)`], answer: 2, explain: `100,000 squared is 10 billion steps, far over the rough limit of 100 million per second. O(n log n) is about 1.7 million steps.` },
  { q: `What does this loop cost for n appends in C#? <code>string s = ""; foreach (var p in parts) s += p;</code>`, options: [`O(n), strings grow in place`, `O(n<sup>2</sup>), each += copies the whole string so far`, `O(log n)`, `O(1)`], answer: 1, explain: `Strings are immutable, so every += allocates a new string and copies everything. The copies add up to O(n<sup>2</sup>). StringBuilder makes it O(n).` },
  { q: `In the sliding window for "longest substring without repeats", why test <code>prev &gt;= start</code> before moving start?`, options: [`To avoid a null reference`, `An old position left of the window must not pull start backwards`, `To keep the dictionary small`, `It is only a speed-up`], answer: 1, explain: `For "abba", at the last "a" the stored index is 0, which is already outside the window (start is 2). Without the test, start would jump back to 1 and the window would wrongly contain two b's.` },
  { q: `Which data structure checks whether brackets like <code>([{}])</code> are balanced?`, options: [`Queue`, `Stack`, `HashSet`, `Sorted list`], answer: 1, explain: `Brackets close in the reverse order they opened: last in, first out. That is a stack. Push openers, pop on closers and compare.` },
  { q: `Two Sum with a <code>Dictionary</code> costs:`, options: [`O(n) time, O(1) space`, `O(n) time, O(n) space`, `O(n log n) time, O(1) space`, `O(n<sup>2</sup>) time, O(n) space`], answer: 1, explain: `One pass with O(1) average lookups gives O(n) time. The dictionary can end up holding every value, so space is O(n). It trades memory for speed.` },
  { q: `Kadane's algorithm is started with <code>best = 0</code>. Which input shows the bug?`, options: [`[1, 2, 3]`, `[-3, -1, -2]`, `[0, 0]`, `[5]`], answer: 1, explain: `The correct answer is -1 (the single item -1). Starting best at 0 returns 0, which is the sum of an empty run, and an empty run is not allowed. Start with a[0].` },
  { q: `Why write <code>mid = lo + (hi - lo) / 2</code> in binary search?`, options: [`It is faster`, `<code>lo + hi</code> can overflow int for very large indexes`, `It rounds up`, `It avoids division by zero`], answer: 1, explain: `If lo and hi are both above about 1.07 billion, lo + hi exceeds int.MaxValue and wraps to a negative number. hi - lo never overflows.` },
  { q: `To rotate an array right by k in place with O(1) extra space, you:`, options: [`Shift every item right by one, k times`, `Reverse all, reverse the first k, reverse the rest`, `Copy to a new array`, `Sort it`], answer: 1, explain: `Three reversals move the last k items to the front in O(n) time and O(1) space. Shifting one step k times is O(n × k). Remember k %= n first.` },
  { q: `Rotating a square matrix 90 degrees clockwise in place is done by:`, options: [`Reverse each row, then reverse each column`, `Transpose, then reverse each row`, `Transpose twice`, `Reverse each column only`], answer: 1, explain: `Transpose swaps m[i][j] with m[j][i]. Reversing each row then gives the clockwise turn. Transpose then reverse each <i>column</i> would turn it anticlockwise.` },
  { q: `A matrix has sorted rows and sorted columns. Where does the O(rows + columns) search start?`, options: [`Top-left corner`, `Top-right corner`, `The centre`, `Any cell`], answer: 1, explain: `At the top-right, moving left gives smaller values and moving down gives bigger ones, so each comparison removes a row or a column. Top-left has bigger values in both directions, so it tells you nothing. Bottom-left also works.` },
  { q: `Why is BFS, not DFS, used for the fewest steps in a grid?`, options: [`BFS uses less memory`, `BFS reaches cells in order of distance, so the first arrival is the shortest`, `DFS cannot run on grids`, `BFS never needs a visited mark`], answer: 1, explain: `BFS explores all cells at distance 1, then 2, and so on. DFS dives down one path and may reach the target by a long way round first.` }
);


// ---------- INTERVIEW: 1. How to approach coding questions ----------
interview.push({ q: `How do you approach a coding question in an interview?`, level: 'B', a: `<p>I follow the same 5 steps every time, and I say each one out loud.</p>
    <ol>
      <li><b>Restate and ask.</b> Repeat the problem in my own words and confirm the input, the output and the limits: size, duplicates, upper and lower case, empty or null, negative numbers.</li>
      <li><b>Small example.</b> Work one example by hand and name the edge cases.</li>
      <li><b>Brute force, then better.</b> Give the simple slow answer with its cost, then improve it with a known tool: hash map, two pointers, sliding window, sorting, stack, prefix sums or binary search.</li>
      <li><b>Clean code.</b> Meaningful names and small helper methods.</li>
      <li><b>Test and cost.</b> Dry-run the example and one edge case, then state time and space complexity.</li>
    </ol>
    <p>The order matters. Asking first stops you solving the wrong problem, and giving the brute force first means you always have a working answer on the table.</p>
    <blockquote><b>Say it in the interview:</b> I restate the problem and ask about the input, work a small example, give the brute force and then improve it, write clean code, and finish with a dry run and the time and space complexity.</blockquote>`,
  followUps: [`Which of the 5 steps do candidates skip most often?`, `What do you do if the interviewer says "just start coding"?`] });

interview.push({ q: `What is Big-O, and how do you state time and space complexity?`, level: 'B', a: `<p>Big-O describes how the work grows when the input grows. It ignores constant factors and keeps only the fastest-growing part.</p>
    <table>
      <thead><tr><th>Big-O</th><th>Name</th><th>Example</th></tr></thead>
      <tbody>
        <tr><td>O(1)</td><td>constant</td><td>read <code>a[i]</code>, dictionary lookup (average)</td></tr>
        <tr><td>O(log n)</td><td>logarithmic</td><td>binary search</td></tr>
        <tr><td>O(n)</td><td>linear</td><td>one loop over the array</td></tr>
        <tr><td>O(n log n)</td><td></td><td>sorting</td></tr>
        <tr><td>O(n<sup>2</sup>)</td><td>quadratic</td><td>2 nested loops, every pair</td></tr>
        <tr><td>O(2<sup>n</sup>)</td><td>exponential</td><td>every subset</td></tr>
      </tbody>
    </table>
    <p><b>Time</b> counts steps. <b>Space</b> counts the <i>extra</i> memory you allocate, not the input itself. Always say both, and say what n is. For a matrix, use rows × columns. For 2 inputs, use 2 letters, for example O(n + m).</p>
    <blockquote><b>Say it in the interview:</b> Big-O is how the cost grows with the input size. This solution is O(n) time because it makes one pass, and O(n) extra space because of the dictionary.</blockquote>`,
  followUps: [`What is the difference between average case and worst case for a Dictionary lookup?`, `Why is O(2n) written as O(n)?`, `What does "amortised O(1)" mean for List.Add?`] });

interview.push({ q: `Which clarifying questions do you ask before you write any code?`, level: 'B', a: `<p>I ask about anything that could change the solution, and I keep it to about a minute.</p>
    <table>
      <thead><tr><th>Ask about</th><th>Example question</th><th>Why</th></tr></thead>
      <tbody>
        <tr><td>Size</td><td>How large can the input be?</td><td>decides the Big-O you need</td></tr>
        <tr><td>Empty or null</td><td>Can the array be empty? Can the string be null?</td><td>the most common crash</td></tr>
        <tr><td>Duplicates</td><td>Can values repeat?</td><td>changes hash map and pointer logic</td></tr>
        <tr><td>Range</td><td>Negative numbers? Only a to z? Does case matter?</td><td>decides <code>int[26]</code> vs dictionary, and overflow risk</td></tr>
        <tr><td>Order</td><td>Is the input sorted?</td><td>opens binary search and two pointers</td></tr>
        <tr><td>Output</td><td>Indexes or values? One answer or all? What if there is none?</td><td>changes the return type</td></tr>
        <tr><td>Side effects</td><td>May I change the input?</td><td>in-place solutions need permission</td></tr>
      </tbody>
    </table>
    <p>If the interviewer says "you decide", state the assumption and write it as a comment.</p>
    <blockquote><b>Say it in the interview:</b> Before coding I confirm the size of the input, whether it can be empty or contain duplicates or negatives, whether it is sorted, and exactly what I should return when there is no answer.</blockquote>`,
  followUps: [`What do you do when the interviewer answers "what do you think?"`, `Do you validate arguments (null checks) in interview code?`] });

interview.push({ q: `Which words in a question point to which pattern?`, level: 'I', a: `<p>Most questions contain a few words that give the pattern away. I listen for them while the question is read.</p>
    <table>
      <thead><tr><th>Pattern</th><th>Typical signals</th></tr></thead>
      <tbody>
        <tr><td>Hash map or set</td><td>counting, duplicates, pair sums, anagrams</td></tr>
        <tr><td>Two pointers</td><td>sorted array, palindromes, remove duplicates in place</td></tr>
        <tr><td>Sliding window</td><td>longest or shortest substring or subarray with a condition</td></tr>
        <tr><td>Prefix sums</td><td>many range-sum queries, subarray sum equals K</td></tr>
        <tr><td>Stack</td><td>matching brackets, next greater element, evaluating an expression</td></tr>
        <tr><td>Binary search</td><td>sorted data, "smallest value that satisfies a condition"</td></tr>
        <tr><td>BFS or DFS</td><td>grids, graphs, trees, connected groups</td></tr>
        <tr><td>Dynamic programming</td><td>overlapping sub-problems: counts, minimum or maximum, "how many ways"</td></tr>
        <tr><td>Heap</td><td>top K, merge K sorted lists, running median</td></tr>
      </tbody>
    </table>
    <p>The size limit is a signal too: n up to 100,000 rules out O(n<sup>2</sup>).</p>
    <blockquote><b>Say it in the interview:</b> I look for signal words. "Pair that sums to" means a hash map, "sorted" means binary search or two pointers, "longest substring" means a sliding window, and a grid means BFS or DFS.</blockquote>`,
  followUps: [`A question has negative numbers and asks for a subarray with sum K. Why does a sliding window fail?`, `When would you sort first even though it costs O(n log n)?`] });

interview.push({ q: `Rapid fire: what do common C# collection operations cost?`, level: 'I', a: `<p>These costs decide whether a loop is O(n) or secretly O(n<sup>2</sup>).</p>
    <table>
      <thead><tr><th>Question</th><th>Short answer</th></tr></thead>
      <tbody>
        <tr><td><code>list[i]</code> or <code>array[i]</code>?</td><td>O(1)</td></tr>
        <tr><td><code>List.Add</code>?</td><td>O(1) amortised: now and then the inner array doubles</td></tr>
        <tr><td><code>List.Contains</code>, <code>IndexOf</code>, <code>Remove</code>?</td><td>O(n), a linear scan</td></tr>
        <tr><td><code>List.Insert(0, x)</code>, <code>RemoveAt(0)</code>?</td><td>O(n), everything shifts</td></tr>
        <tr><td><code>Dictionary</code> or <code>HashSet</code> add and lookup?</td><td>O(1) on average</td></tr>
        <tr><td><code>SortedDictionary</code> add and lookup?</td><td>O(log n), a balanced tree</td></tr>
        <tr><td><code>Stack</code> push and pop, <code>Queue</code> enqueue and dequeue?</td><td>O(1)</td></tr>
        <tr><td><code>Array.Sort</code>, <code>List.Sort</code>?</td><td>O(n log n), not stable</td></tr>
        <tr><td>LINQ <code>OrderBy</code>?</td><td>O(n log n), stable, allocates</td></tr>
        <tr><td><code>s += x</code> in a loop of n?</td><td>O(n<sup>2</sup>) in total, use <code>StringBuilder</code></td></tr>
        <tr><td><code>PriorityQueue</code> enqueue and dequeue (.NET 6 and later)?</td><td>O(log n)</td></tr>
      </tbody>
    </table>
    <blockquote><b>Say it in the interview:</b> Lists index in O(1) but search in O(n), dictionaries and hash sets look up in O(1) on average, sorting is O(n log n), and string concatenation in a loop is O(n squared).</blockquote>`,
  followUps: [`Why is <code>list.Contains</code> inside a loop a red flag in a code review?`, `What does "stable sort" mean and when does it matter?`] });

interview.push({ q: `What do you do when you are stuck, or cannot find the optimal solution?`, level: 'A', a: `<p>I keep talking and I make the problem smaller. A working slow answer with clear reasoning scores far better than silence.</p>
    <ul>
      <li><b>Lock in the brute force.</b> Say it, give its cost, and offer to code it. Now there is a fallback.</li>
      <li><b>Find the wasted work.</b> Ask "what am I computing again and again?" A repeated search suggests a hash map. A repeated sum suggests a running total.</li>
      <li><b>Change the input.</b> Would it be easier if the data were sorted? If I solved it for 1 item, then 2?</li>
      <li><b>Go through the tools.</b> Hash map, two pointers, sliding window, stack, binary search, BFS. Say why each fits or not.</li>
      <li><b>Take the hint.</b> Interviewers give hints on purpose. Using one well is a good sign, ignoring one is a bad sign.</li>
      <li><b>Be honest about gaps.</b> "This is O(n log n). I believe O(n) exists with a hash map, here is my idea" is a strong sentence.</li>
    </ul>
    <p>As a lead you are also judged on how you behave under pressure: calm, structured, open to input.</p>
    <blockquote><b>Say it in the interview:</b> If I am stuck I code the brute force first so we have a working answer, then I look for the repeated work in it and try the standard tools one by one, thinking out loud so you can steer me.</blockquote>`,
  followUps: [`You realise halfway that your approach is wrong. What do you say?`, `How do you use the last 5 minutes if the code is not finished?`] });

// ---------- INTERVIEW: 2. Strings ----------
interview.push({ q: `Reverse a string without using the built-in reverse.`, level: 'B', a: `<p>Copy the string to a character array, swap the two ends, and move both indexes towards the middle.</p>
    <pre><code>static string Reverse(string s)
{
    char[] a = s.ToCharArray();          // a string cannot be changed, so copy it
    for (int i = 0, j = a.Length - 1; i &lt; j; i++, j--)
    {
        char t = a[i]; a[i] = a[j]; a[j] = t;   // swap the two ends, move inwards
    }
    return new string(a);
}   // O(n) time, O(n) space</code></pre>
    <p>The copy is needed because C# strings are immutable (they cannot be changed). The loop stops when the indexes meet, so a middle character stays where it is. Empty and 1-character strings work without special code.</p>
    <p>In TypeScript the spread <code>[...s]</code> splits by code point, which is safer for emoji than <code>split("")</code>:</p>
    <pre><code>const reverse = (s: string): string =&gt; {
  const a = [...s];                 // spread splits by code point, so most emoji survive
  for (let i = 0, j = a.length - 1; i &lt; j; i++, j--) [a[i], a[j]] = [a[j], a[i]];
  return a.join("");
};</code></pre>
    <blockquote><b>Say it in the interview:</b> I copy the string to a char array and swap from both ends with two pointers. It is O(n) time and O(n) space, because strings are immutable in C#.</blockquote>`,
  followUps: [`Why not build the result with <code>result = s[i] + result</code> in a loop?`, `Does this work for a string that contains emoji?`, `Reverse only the vowels of the string.`] });

interview.push({ q: `Check whether a string is a palindrome, ignoring case and anything that is not a letter or digit.`, level: 'B', a: `<p>Walk in from both ends, skip characters that are not letters or digits, and compare the rest in lower case.</p>
    <pre><code>static bool IsPalindrome(string s)
{
    int i = 0, j = s.Length - 1;
    while (i &lt; j)
    {
        if (!char.IsLetterOrDigit(s[i])) i++;         // skip spaces and commas
        else if (!char.IsLetterOrDigit(s[j])) j--;
        else if (char.ToLowerInvariant(s[i++]) != char.ToLowerInvariant(s[j--]))
            return false;
    }
    return true;
}   // O(n) time, O(1) space</code></pre>
    <p>"A man, a plan, a canal: Panama" returns true. No new string is built, so the extra memory is O(1). A simpler version cleans the string first and compares it with its reverse, but that uses O(n) extra memory.</p>
    <p>Edge cases: an empty string, or one with only punctuation, counts as a palindrome here. Say that out loud and check that it is what the interviewer wants.</p>
    <blockquote><b>Say it in the interview:</b> Two pointers from both ends, skipping non-alphanumeric characters and comparing in lower case. O(n) time and O(1) space.</blockquote>`,
  followUps: [`Why <code>ToLowerInvariant</code> and not <code>ToLower</code>?`, `Is it still a palindrome if you may delete one character?`] });

interview.push({ q: `Count how often each character appears, and find the first character that does not repeat.`, level: 'B', a: `<p>Count every character in a dictionary, then walk the string a second time and return the first character whose count is 1.</p>
    <pre><code>static char? FirstUnique(string s)
{
    var count = new Dictionary&lt;char, int&gt;();
    foreach (char c in s)
    {
        count.TryGetValue(c, out int n);   // n is 0 when the key is missing
        count[c] = n + 1;
    }
    foreach (char c in s)                  // second pass keeps the original order
        if (count[c] == 1) return c;
    return null;
}   // O(n) time, O(k) space, k = distinct characters</code></pre>
    <p>The second pass goes over the <b>string</b>, not the dictionary, because the question asks for the first one in the original order. For "swiss" the counts are s = 3, w = 1, i = 1, and the answer is "w". On modern .NET the two counting lines can be written as <code>count[c] = count.GetValueOrDefault(c) + 1</code>.</p>
    <p>TypeScript, same idea with a <code>Map</code>:</p>
    <pre><code>const firstUnique = (s: string): string | null =&gt; {
  const count = new Map&lt;string, number&gt;();
  for (const c of s) count.set(c, (count.get(c) ?? 0) + 1);
  for (const c of s) if (count.get(c) === 1) return c;
  return null;
};</code></pre>
    <blockquote><b>Say it in the interview:</b> Two passes: first I count the characters in a dictionary, then I scan the string again and return the first one with a count of 1. O(n) time, and space depends on the number of different characters.</blockquote>`,
  followUps: [`How would you do it if the input is only lowercase a to z?`, `The characters arrive as a stream. How do you report the first unique one at any moment?`] });

interview.push({ q: `Check whether two strings are anagrams of each other.`, level: 'B', a: `<p>Two strings are anagrams when they have the same letters with the same counts. Count up for one string and down for the other, and every count must end at 0.</p>
    <pre><code>static bool IsAnagram(string a, string b)
{
    if (a.Length != b.Length) return false;
    var cnt = new int[26];                 // lowercase a to z only
    for (int i = 0; i &lt; a.Length; i++) { cnt[a[i] - 'a']++; cnt[b[i] - 'a']--; }
    foreach (int x in cnt) if (x != 0) return false;
    return true;
}   // O(n) time, O(1) space</code></pre>
    <p>The length check is a cheap early exit. The <code>int[26]</code> only works for lowercase a to z, so state that assumption. For any character use a <code>Dictionary&lt;char, int&gt;</code>.</p>
    <table>
      <thead><tr><th>Approach</th><th>Time</th><th>Extra space</th></tr></thead>
      <tbody>
        <tr><td>Sort both and compare</td><td>O(n log n)</td><td>O(n)</td></tr>
        <tr><td>Count letters</td><td>O(n)</td><td>O(1), 26 counters</td></tr>
      </tbody>
    </table>
    <blockquote><b>Say it in the interview:</b> I count letters: plus one for the first string, minus one for the second, and all 26 counters must be zero. That is O(n) time and constant space, better than sorting.</blockquote>`,
  followUps: [`How do you handle upper case, spaces and accents?`, `Find all anagrams of a short word inside a long text.`] });

interview.push({ q: `Count the words in a sentence, reverse the order of the words, and capitalise each word.`, level: 'B', a: `<p>All three are a split followed by a join. The detail to get right is extra spaces.</p>
    <pre><code>static int WordCount(string s) =&gt;          // null separator = split on any whitespace
    s.Split((char[])null, StringSplitOptions.RemoveEmptyEntries).Length;

static string ReverseWords(string s) =&gt;
    string.Join(" ", s.Split((char[])null, StringSplitOptions.RemoveEmptyEntries).Reverse());

static string Capitalise(string s) =&gt;
    string.Join(" ", s.Split(' ').Select(w =&gt;
        w.Length == 0 ? w : char.ToUpper(w[0]) + w.Substring(1).ToLower()));</code></pre>
    <ul>
      <li>Passing <code>null</code> as the separator splits on any whitespace, and <code>RemoveEmptyEntries</code> drops the empty pieces that double spaces create. So "  a   b " has 2 words, not 6.</li>
      <li><code>Capitalise</code> splits on single spaces and keeps empty pieces, so the original spacing is kept.</li>
      <li>Each method is O(n) time and O(n) space.</li>
    </ul>
    <p>TypeScript uses a regular expression for the split:</p>
    <pre><code>const wordCount = (s: string) =&gt; (s.trim() ? s.trim().split(/\\s+/).length : 0);
const reverseWords = (s: string) =&gt; s.trim().split(/\\s+/).reverse().join(" ");</code></pre>
    <blockquote><b>Say it in the interview:</b> I split on whitespace and remove empty entries so that extra spaces do not create empty words, then count, reverse or transform the pieces and join them again. Each is O(n).</blockquote>`,
  followUps: [`Reverse the words in place in a <code>char[]</code> with O(1) extra space.`, `What does <code>"a,b,,c".Split(',')</code> return?`] });

interview.push({ q: `Why are strings immutable in C#, and when do you use StringBuilder?`, level: 'B', a: `<p>A C# string can never be changed after it is created, so every "change" makes a new string. Use <code>StringBuilder</code> when you build text in a loop.</p>
    <pre><code>static string JoinSlow(string[] parts)
{
    string s = "";
    foreach (string p in parts) s += p;    // copies everything so far, every time: O(n^2)
    return s;
}
static string JoinFast(string[] parts)
{
    var sb = new StringBuilder();
    foreach (string p in parts) sb.Append(p);   // appends into a growing buffer: O(n)
    return sb.ToString();
}</code></pre>
    <p><b>Why immutable?</b></p>
    <ul>
      <li>Safe to share between threads without locks.</li>
      <li>Safe as a dictionary key: the hash code can never change while it is in the table.</li>
      <li>Lets the runtime reuse equal literals (interning).</li>
    </ul>
    <p><b>Rule of thumb:</b> a few fixed joins (<code>a + b + c</code>, or an interpolated string) are fine, because the compiler turns them into one call. A loop with an unknown number of appends needs <code>StringBuilder</code> or <code>string.Join</code>.</p>
    <blockquote><b>Say it in the interview:</b> Strings are immutable, so concatenating in a loop copies the whole string every time and becomes O(n squared). StringBuilder appends into a buffer, which makes it O(n).</blockquote>`,
  followUps: [`What is string interning?`, `When is <code>string.Join</code> or <code>string.Concat</code> better than StringBuilder?`] });

interview.push({ q: `Group a list of words so that anagrams are together.`, level: 'I', a: `<p>Give every word a key that is the same for all its anagrams, and collect the words in a dictionary under that key. The simplest key is the word with its letters sorted.</p>
    <pre><code>static List&lt;List&lt;string&gt;&gt; GroupAnagrams(string[] words)
{
    var groups = new Dictionary&lt;string, List&lt;string&gt;&gt;();
    foreach (string w in words)
    {
        char[] k = w.ToCharArray(); Array.Sort(k);
        string key = new string(k);        // "eat", "tea", "ate" all become "aet"
        if (!groups.TryGetValue(key, out var list)) groups[key] = list = new List&lt;string&gt;();
        list.Add(w);
    }
    return groups.Values.ToList();
}   // O(n * k log k) time, O(n * k) space</code></pre>
    <p>["eat", "tea", "tan", "ate", "nat", "bat"] gives [eat, tea, ate], [tan, nat], [bat].</p>
    <p>With n words of length k, sorting each key costs O(k log k), so the total is O(n × k log k). A faster key is the 26 letter counts written as text, such as "1#0#0#...", which is O(n × k). With LINQ the whole method is one <code>GroupBy</code> on the sorted word.</p>
    <pre><code>const groupAnagrams = (words: string[]): string[][] =&gt; {
  const map = new Map&lt;string, string[]&gt;();
  for (const w of words) {
    const key = [...w].sort().join("");
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(w);
  }
  return [...map.values()];
};</code></pre>
    <blockquote><b>Say it in the interview:</b> I use a dictionary whose key is the sorted letters of each word, so all anagrams land in the same list. It is O(n times k log k), or O(n times k) with a letter-count key.</blockquote>`,
  followUps: [`Write the letter-count key version.`, `Why is the sorted string a safe dictionary key, but a <code>char[]</code> is not?`] });

interview.push({ q: `Find the longest common prefix of a list of strings.`, level: 'I', a: `<p>Take the first word as the guess, and shorten it by one letter until every other word starts with it.</p>
    <pre><code>static string LongestCommonPrefix(string[] strs)
{
    if (strs.Length == 0) return "";
    string prefix = strs[0];
    for (int i = 1; i &lt; strs.Length; i++)
        while (!strs[i].StartsWith(prefix, StringComparison.Ordinal))
            prefix = prefix.Substring(0, prefix.Length - 1);   // drop the last letter
    return prefix;
}   // O(n * m) time, m = length of the first word</code></pre>
    <p>["flower", "flow", "flight"] gives "fl". ["dog", "car"] gives "". The loop always ends, because every string starts with the empty string. On C# 8 or later the shortening can be written <code>prefix[..^1]</code>.</p>
    <p><code>StringComparison.Ordinal</code> compares raw characters. Without it, <code>StartsWith</code> uses the current culture, which is slower and can give surprising answers.</p>
    <p>Another approach compares column by column: look at character 0 of every word, then character 1, and stop at the first difference. Same cost, no substrings.</p>
    <blockquote><b>Say it in the interview:</b> I start with the first word as the prefix and trim it from the end until every word starts with it. The cost is proportional to the total number of characters compared.</blockquote>`,
  followUps: [`Write the column by column version.`, `How would a trie help if you had many prefix queries?`] });

interview.push({ q: `Compress a string with run-length encoding: "aaabbc" becomes "a3b2c1".`, level: 'I', a: `<p>Walk the string, count how long each run of the same letter is, and write the letter and the count when the run ends.</p>
    <pre><code>static string Compress(string s)
{
    if (s.Length == 0) return s;
    var sb = new StringBuilder();
    int run = 1;
    for (int i = 1; i &lt;= s.Length; i++)
    {
        if (i &lt; s.Length &amp;&amp; s[i] == s[i - 1]) run++;
        else { sb.Append(s[i - 1]).Append(run); run = 1; }   // the run ended: write it
    }
    return sb.ToString();
}   // "aaabbc" -&gt; "a3b2c1"; O(n) time</code></pre>
    <ul>
      <li>The loop runs to <code>i == s.Length</code> on purpose. That extra step writes the last run, so no code is repeated after the loop.</li>
      <li><code>StringBuilder</code> keeps it O(n). With <code>+=</code> it would be O(n<sup>2</sup>).</li>
      <li>"abc" becomes "a1b1c1", which is longer than the input. Many interviewers ask you to return the original when the result is not shorter.</li>
    </ul>
    <blockquote><b>Say it in the interview:</b> One pass with a run counter and a StringBuilder: when the letter changes or the string ends, I append the letter and the count. O(n) time and O(n) space for the output.</blockquote>`,
  followUps: [`Write the decoder. What goes wrong if the text itself contains digits?`, `Do it in place in a <code>char[]</code>.`] });

interview.push({ q: `Check whether the brackets in a string are valid, for example "([]{})".`, level: 'I', a: `<p>Push every opening bracket on a stack. For every closing bracket, the top of the stack must be the matching opener.</p>
    <pre><code>static bool IsValid(string s)
{
    var open = new Dictionary&lt;char, char&gt; { [')'] = '(', [']'] = '[', ['}'] = '{' };
    var st = new Stack&lt;char&gt;();
    foreach (char c in s)
    {
        if (c == '(' || c == '[' || c == '{') st.Push(c);
        else if (open.ContainsKey(c))
        {
            if (st.Count == 0 || st.Pop() != open[c]) return false;
        }
    }
    return st.Count == 0;                  // nothing may stay open
}   // O(n) time, O(n) space</code></pre>
    <p>There are 3 ways to fail, and each has its own line:</p>
    <ul>
      <li>a closer with an empty stack, like ")": <code>st.Count == 0</code></li>
      <li>the wrong type, like "(]": the popped opener does not match</li>
      <li>openers left at the end, like "((": the final <code>st.Count == 0</code></li>
    </ul>
    <p>Other characters are ignored, so it also works on real code or maths. A single counter is enough only when there is just one kind of bracket.</p>
    <blockquote><b>Say it in the interview:</b> I use a stack: push openers, and on a closer pop and check that it matches. At the end the stack must be empty. O(n) time and O(n) space.</blockquote>`,
  followUps: [`Return the position of the first bracket that is wrong.`, `What is the smallest number of brackets to remove to make it valid?`] });

interview.push({ q: `Find the length of the longest substring without repeating characters.`, level: 'I', a: `<p>Slide a window over the string. Remember the last index of every character, and when a character repeats inside the window, move the start to just after its earlier position.</p>
    <pre><code>static int LongestUnique(string s)
{
    var last = new Dictionary&lt;char, int&gt;();    // character -&gt; last index seen
    int best = 0, start = 0;
    for (int i = 0; i &lt; s.Length; i++)
    {
        if (last.TryGetValue(s[i], out int prev) &amp;&amp; prev &gt;= start)
            start = prev + 1;                  // jump past the repeated character
        last[s[i]] = i;
        best = Math.Max(best, i - start + 1);
    }
    return best;
}   // "abcabcbb" -&gt; 3; O(n) time, O(k) space</code></pre>
    <p>The test <code>prev &gt;= start</code> is the part people forget. For "abba", when the last "a" arrives, its old index 0 is already outside the window (start is 2). Without the test, start would jump <i>back</i> to 1 and the answer would be wrong.</p>
    <p>The brute force checks every substring: O(n<sup>2</sup>) or worse. Here each character is visited once.</p>
    <blockquote><b>Say it in the interview:</b> Sliding window with a dictionary of last positions. When I see a repeat inside the window I jump the start past it. One pass, so O(n) time, and O(k) space for k different characters.</blockquote>`,
  followUps: [`Return the substring itself, not only its length.`, `Allow each character at most 2 times.`] });

interview.push({ q: `Rapid fire: C# string traps in coding rounds`, level: 'I', a: `<p>Short facts that are often asked as quick follow-ups.</p>
    <table>
      <thead><tr><th>Question</th><th>Short answer</th></tr></thead>
      <tbody>
        <tr><td>Does <code>==</code> on strings compare references?</td><td>No. It compares the characters (ordinal).</td></tr>
        <tr><td>What does <code>"😀".Length</code> return?</td><td>2. Length counts UTF-16 units, not visible characters.</td></tr>
        <tr><td>Digit character to number?</td><td><code>c - '0'</code>. Letter index: <code>c - 'a'</code>.</td></tr>
        <tr><td>Second argument of <code>Substring(2, 3)</code>?</td><td>A length, not an end index. JavaScript <code>substring</code> takes an end index.</td></tr>
        <tr><td>Null, empty or only spaces?</td><td><code>string.IsNullOrWhiteSpace(s)</code></td></tr>
        <tr><td>Case-insensitive compare?</td><td><code>string.Equals(a, b, StringComparison.OrdinalIgnoreCase)</code>, not <code>ToLower()</code> on both</td></tr>
        <tr><td>Can you write <code>s[0] = 'x'</code>?</td><td>No, strings are read-only. Use a <code>char[]</code> or <code>StringBuilder</code>.</td></tr>
        <tr><td>Sort the letters of a string?</td><td><code>ToCharArray()</code>, <code>Array.Sort</code>, <code>new string(arr)</code></td></tr>
      </tbody>
    </table>
    <blockquote><b>Say it in the interview:</b> String equality compares content, Length counts UTF-16 units, Substring takes a start and a length, and for comparisons in algorithms I use ordinal rules.</blockquote>`,
  followUps: [`What is the difference between <code>Ordinal</code> and <code>InvariantCulture</code> comparison?`, `What does <code>ReadOnlySpan&lt;char&gt;</code> give you over <code>Substring</code>?`] });

interview.push({ q: `Find the longest palindromic substring.`, level: 'A', a: `<p>Treat every position as the middle of a palindrome and expand outwards while the two sides match. Keep the longest one found.</p>
    <pre><code>static string LongestPalindrome(string s)
{
    int start = 0, len = 0;
    for (int c = 0; c &lt; s.Length; c++)
        for (int even = 0; even &lt;= 1; even++)     // odd centre, then even centre
        {
            int l = c, r = c + even;
            while (l &gt;= 0 &amp;&amp; r &lt; s.Length &amp;&amp; s[l] == s[r]) { l--; r++; }
            if (r - l - 1 &gt; len) { len = r - l - 1; start = l + 1; }
        }
    return s.Substring(start, len);
}   // O(n^2) time, O(1) space</code></pre>
    <ul>
      <li>There are 2 kinds of centre: a single character ("aba") and the gap between 2 characters ("abba"). The inner loop tries both.</li>
      <li>After the <code>while</code>, <code>l</code> and <code>r</code> are one step outside the palindrome, so its length is <code>r - l - 1</code> and it starts at <code>l + 1</code>.</li>
      <li>"babad" gives "bab", and "cbbd" gives "bb".</li>
    </ul>
    <table>
      <thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
      <tbody>
        <tr><td>Check every substring</td><td>O(n<sup>3</sup>)</td><td>O(1)</td></tr>
        <tr><td>Expand around the centre</td><td>O(n<sup>2</sup>)</td><td>O(1)</td></tr>
        <tr><td>Manacher's algorithm</td><td>O(n)</td><td>O(n)</td></tr>
      </tbody>
    </table>
    <blockquote><b>Say it in the interview:</b> I expand around each of the 2n minus 1 centres, odd and even, and keep the longest. That is O(n squared) time and O(1) space. Manacher's algorithm does it in O(n), but it is rarely expected.</blockquote>`,
  followUps: [`Count all palindromic substrings with the same idea.`, `Why is the dynamic programming table version worse here?`] });

interview.push({ q: `Your string reverse breaks on emoji and accented letters. Why, and how do you fix it?`, level: 'A', a: `<p>A C# <code>char</code> is one UTF-16 unit, and one visible character can be made of several of them. Reversing unit by unit tears those groups apart.</p>
    <ul>
      <li><b>Surrogate pairs:</b> an emoji such as 😀 is 2 <code>char</code> values. Swapped, they are invalid text.</li>
      <li><b>Combining marks:</b> "é" can be "e" plus an accent mark. Reversed, the accent lands on the wrong letter.</li>
    </ul>
    <p>The fix is to reverse whole <b>text elements</b> (what a user sees as one character):</p>
    <pre><code>static string ReverseText(string s)
{
    int[] starts = StringInfo.ParseCombiningCharacters(s);  // where each visible character begins
    var sb = new StringBuilder(s.Length);
    for (int i = starts.Length - 1; i &gt;= 0; i--)
    {
        int end = i + 1 &lt; starts.Length ? starts[i + 1] : s.Length;
        sb.Append(s, starts[i], end - starts[i]);           // copy the whole unit
    }
    return sb.ToString();
}</code></pre>
    <p><code>StringInfo</code> is in <code>System.Globalization</code>. On .NET 5 and later it follows the Unicode rules for grapheme clusters, so most multi-part emoji stay whole. <code>EnumerateRunes()</code> is a lighter option that keeps surrogate pairs together but not combining marks. In JavaScript, <code>[...s]</code> splits by code point and <code>Intl.Segmenter</code> splits by grapheme.</p>
    <blockquote><b>Say it in the interview:</b> A char is a UTF-16 code unit, not a character. Emoji and combining accents use several units, so I reverse by text element with StringInfo instead of char by char.</blockquote>`,
  followUps: [`What is the difference between a code unit, a code point and a grapheme?`, `How does this affect a "maximum 50 characters" validation rule?`] });

interview.push({ q: `Find the smallest window in a string that contains all the characters of another string.`, level: 'E', a: `<p>Grow a window to the right until it covers every needed character, then shrink it from the left while it still does. The smallest window seen is the answer.</p>
    <pre><code>static string MinWindow(string s, string t)
{
    var need = new int[128];                    // ASCII only
    foreach (char c in t) need[c]++;
    int missing = t.Length, left = 0, bestStart = 0, bestLen = int.MaxValue;
    for (int right = 0; right &lt; s.Length; right++)
    {
        if (need[s[right]]-- &gt; 0) missing--;    // this character was still needed
        while (missing == 0)                    // window covers t: try to shrink
        {
            if (right - left + 1 &lt; bestLen) { bestLen = right - left + 1; bestStart = left; }
            if (++need[s[left++]] &gt; 0) missing++;   // we gave back a needed one
        }
    }
    return bestLen == int.MaxValue ? "" : s.Substring(bestStart, bestLen);
}   // O(n + m) time, O(1) space</code></pre>
    <ul>
      <li><code>need[c]</code> is how many more of <code>c</code> the window needs. Below 0 means the window has spare copies.</li>
      <li><code>missing</code> is the total still needed. When it is 0 the window is valid, so there is no need to compare 2 count tables at every step.</li>
      <li>"ADOBECODEBANC" with "ABC" gives "BANC".</li>
    </ul>
    <p>Both edges only move forward, so each character enters and leaves once: O(n + m) time. The <code>int[128]</code> is O(1) space but assumes ASCII. Use a dictionary for other text. The brute force tests every substring, which is O(n<sup>2</sup>) or worse.</p>
    <blockquote><b>Say it in the interview:</b> Sliding window with a need table and a missing counter. I expand right until nothing is missing, then shrink left while the window stays valid. Linear time, constant space for ASCII.</blockquote>`,
  followUps: [`Why is one <code>missing</code> counter better than comparing two count arrays?`, `What changes if the characters must appear in the same order as in the pattern?`] });


// ---------- INTERVIEW: 3. Arrays ----------
interview.push({ q: `Two Sum: return the indexes of two numbers that add up to a target.`, level: 'B', a: `<p>Walk the array once, and for each number ask a dictionary whether the partner (<code>target - number</code>) was seen before.</p>
    <pre><code>static int[] TwoSum(int[] nums, int target)
{
    var seen = new Dictionary&lt;int, int&gt;();      // value -&gt; index
    for (int i = 0; i &lt; nums.Length; i++)
    {
        if (seen.TryGetValue(target - nums[i], out int j)) return new[] { j, i };
        seen[nums[i]] = i;
    }
    return new int[0];                          // no pair
}   // O(n) time, O(n) space</code></pre>
    <p>The check comes <b>before</b> the insert, so an item is never paired with itself, and [3, 3] with target 6 correctly returns [0, 1]. On C# 12 the returns can be written <code>[j, i]</code> and <code>[]</code>.</p>
    <table>
      <thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
      <tbody>
        <tr><td>Every pair, 2 loops</td><td>O(n<sup>2</sup>)</td><td>O(1)</td></tr>
        <tr><td>One pass + dictionary</td><td>O(n)</td><td>O(n)</td></tr>
      </tbody>
    </table>
    <pre><code>const twoSum = (nums: number[], target: number): number[] =&gt; {
  const seen = new Map&lt;number, number&gt;();     // value -&gt; index
  for (let i = 0; i &lt; nums.length; i++) {
    const j = seen.get(target - nums[i]);
    if (j !== undefined) return [j, i];
    seen.set(nums[i], i);
  }
  return [];
};</code></pre>
    <blockquote><b>Say it in the interview:</b> The brute force tries every pair in O(n squared). With a dictionary from value to index I check for the complement in O(1), so it is one pass: O(n) time and O(n) space.</blockquote>`,
  followUps: [`The array is sorted. Can you avoid the extra memory?`, `Return all pairs, without duplicates.`, `What happens if several pairs are valid?`] });

interview.push({ q: `Remove duplicates from a sorted array in place and return the new length.`, level: 'B', a: `<p>Because the array is sorted, duplicates are neighbours. One index reads every item, a second index writes each new value at the front.</p>
    <pre><code>static int RemoveDuplicates(int[] a)
{
    if (a.Length == 0) return 0;
    int w = 1;                                  // next free slot
    for (int r = 1; r &lt; a.Length; r++)
        if (a[r] != a[w - 1]) a[w++] = a[r];    // new value: keep it
    return w;                                   // count of unique values
}   // O(n) time, O(1) space</code></pre>
    <p>For [1, 1, 2, 2, 2, 3] the front of the array becomes 1, 2, 3 and the method returns 3. What is behind index 3 does not matter: an array cannot shrink in C#, so the caller uses the returned length.</p>
    <p><code>a[w - 1]</code> is the last value kept. Comparing with it, and not with <code>a[r - 1]</code>, is what makes the "keep at most 2 copies" follow-up a one-character change.</p>
    <blockquote><b>Say it in the interview:</b> Read and write pointers: I copy a value forward only when it differs from the last one I kept. O(n) time, O(1) space, and I return the count of unique values.</blockquote>`,
  followUps: [`Allow each value to appear at most twice.`, `The array is not sorted and order must be kept. What now?`] });

interview.push({ q: `Move all zeros to the end of an array while keeping the order of the other items.`, level: 'B', a: `<p>Keep a write index for the next non-zero position. Every time the read index finds a non-zero value, swap it into the write position.</p>
    <pre><code>static void MoveZeroes(int[] a)
{
    int w = 0;                                  // where the next non-zero goes
    for (int r = 0; r &lt; a.Length; r++)
        if (a[r] != 0)
        {
            int t = a[w]; a[w] = a[r]; a[r] = t;   // swapping with itself is harmless
            w++;
        }
}   // O(n) time, O(1) space</code></pre>
    <p>[0, 1, 0, 3, 12] becomes [1, 3, 12, 0, 0]. Everything left of <code>w</code> is non-zero and in its original order, and everything between <code>w</code> and <code>r</code> is zero. When <code>w == r</code> the swap does nothing, which is harmless.</p>
    <p>On C# 7 or later the swap can be one line: <code>(a[w], a[r]) = (a[r], a[w]);</code></p>
    <p>A common weaker answer removes each zero and appends it. With a <code>List</code> that is O(n<sup>2</sup>), because every removal shifts the rest.</p>
    <blockquote><b>Say it in the interview:</b> Two pointers: the read pointer scans, the write pointer marks the next non-zero slot, and I swap. One pass, O(n) time, O(1) space, and the order is kept.</blockquote>`,
  followUps: [`Move the zeros to the front instead.`, `How many writes does your version do, and can you reduce them?`] });

interview.push({ q: `How do you find out whether an array contains duplicates, and which values are duplicated?`, level: 'B', a: `<p>Put each value in a <code>HashSet</code>. <code>Add</code> returns false when the value is already there, and that is the duplicate.</p>
    <pre><code>static bool HasDuplicate(int[] a)
{
    var seen = new HashSet&lt;int&gt;();
    foreach (int x in a)
        if (!seen.Add(x)) return true;          // Add returns false if x is already there
    return false;
}   // O(n) time, O(n) space

static List&lt;int&gt; FindDuplicates(int[] a)
{
    var seen = new HashSet&lt;int&gt;();
    var dups = new HashSet&lt;int&gt;();
    foreach (int x in a) if (!seen.Add(x)) dups.Add(x);
    return dups.ToList();
}</code></pre>
    <table>
      <thead><tr><th>Approach</th><th>Time</th><th>Space</th><th>Note</th></tr></thead>
      <tbody>
        <tr><td>Compare every pair</td><td>O(n<sup>2</sup>)</td><td>O(1)</td><td>only for tiny inputs</td></tr>
        <tr><td>Sort, compare neighbours</td><td>O(n log n)</td><td>O(1)</td><td>changes the array</td></tr>
        <tr><td>HashSet</td><td>O(n)</td><td>O(n)</td><td>stops at the first duplicate</td></tr>
      </tbody>
    </table>
    <p>The second set in <code>FindDuplicates</code> makes sure a value that appears 3 times is reported once. In TypeScript the yes or no check is one line:</p>
    <pre><code>const hasDuplicate = (a: number[]) =&gt; new Set(a).size !== a.length;</code></pre>
    <blockquote><b>Say it in the interview:</b> I add each value to a HashSet and use the fact that Add returns false for a value that is already present. That is O(n) time and O(n) space. Sorting first would trade the memory for O(n log n) time.</blockquote>`,
  followUps: [`The values are 1 to n. Find the duplicate with O(1) extra space.`, `Write it with LINQ <code>GroupBy</code>. What does that cost?`] });

interview.push({ q: `An array holds the numbers 0 to n with exactly one missing. Find the missing number.`, level: 'B', a: `<p>The numbers 0 to n add up to n × (n + 1) / 2. Subtract the real sum of the array, and what is left is the missing number.</p>
    <pre><code>static int MissingNumber(int[] a)               // holds 0..n with one number missing
{
    long expected = (long)a.Length * (a.Length + 1) / 2;
    long actual = 0;
    foreach (int x in a) actual += x;
    return (int)(expected - actual);
}

static int MissingNumberXor(int[] a)            // no overflow risk at all
{
    int x = a.Length;
    for (int i = 0; i &lt; a.Length; i++) x ^= i ^ a[i];
    return x;
}   // both: O(n) time, O(1) space</code></pre>
    <ul>
      <li>For [3, 0, 1]: n is 3, expected sum is 6, actual sum is 4, so 2 is missing.</li>
      <li>The sum is kept in a <code>long</code>, because n × (n + 1) overflows <code>int</code> once n is above about 46,000.</li>
      <li>The XOR version needs no large numbers. XOR-ing a value with itself gives 0, so after XOR-ing every index and every value, only the missing number is left.</li>
    </ul>
    <p>Both avoid sorting (O(n log n)) and a hash set (O(n) memory).</p>
    <blockquote><b>Say it in the interview:</b> I subtract the actual sum from n times n plus 1 over 2, using a long to avoid overflow, or I XOR all indexes and values. Both are O(n) time and O(1) space.</blockquote>`,
  followUps: [`Two numbers are missing. How do you find both?`, `Why does XOR cancel pairs?`] });

interview.push({ q: `Merge two sorted arrays into one sorted array.`, level: 'B', a: `<p>Keep one index in each array, copy the smaller front value into the result, and move that index forward. When one array runs out, copy the rest of the other.</p>
    <pre><code>static int[] Merge(int[] a, int[] b)
{
    var res = new int[a.Length + b.Length];
    int i = 0, j = 0, k = 0;
    while (i &lt; a.Length &amp;&amp; j &lt; b.Length)
        res[k++] = a[i] &lt;= b[j] ? a[i++] : b[j++];   // take the smaller front item
    while (i &lt; a.Length) res[k++] = a[i++];          // leftovers
    while (j &lt; b.Length) res[k++] = b[j++];
    return res;
}   // O(n + m) time, O(n + m) space</code></pre>
    <p>Using <code>&lt;=</code> takes from <code>a</code> first when the values are equal. That keeps the merge <b>stable</b>, which means equal items stay in their original order.</p>
    <p>This is the merge step of merge sort. Joining the arrays and calling <code>Array.Sort</code> also works, but it costs O((n + m) log(n + m)) and ignores that the inputs were already sorted.</p>
    <blockquote><b>Say it in the interview:</b> Two pointers, one per array: I always take the smaller front element, then copy whatever is left. O(n + m) time and O(n + m) space for the result.</blockquote>`,
  followUps: [`The first array has free space at its end. Merge in place.`, `Merge k sorted arrays.`] });

interview.push({ q: `Write binary search.`, level: 'B', a: `<p>In a sorted array, compare the target with the middle item and throw away the half that cannot hold it. Repeat until found or nothing is left.</p>
    <pre><code>static int BinarySearch(int[] a, int target)
{
    int lo = 0, hi = a.Length - 1;
    while (lo &lt;= hi)
    {
        int mid = lo + (hi - lo) / 2;           // avoids int overflow of lo + hi
        if (a[mid] == target) return mid;
        if (a[mid] &lt; target) lo = mid + 1;      // target is to the right
        else hi = mid - 1;                      // target is to the left
    }
    return -1;
}   // O(log n) time, O(1) space</code></pre>
    <p>3 details to get right:</p>
    <ul>
      <li><code>lo + (hi - lo) / 2</code>, because <code>lo + hi</code> can overflow <code>int</code>.</li>
      <li><code>lo &lt;= hi</code>, because a range of 1 item still has to be checked.</li>
      <li><code>mid + 1</code> and <code>mid - 1</code>. Reusing <code>mid</code> can loop forever.</li>
    </ul>
    <p>Each step halves the range, so 1,000,000 items take about 20 steps. In production code use <code>Array.BinarySearch</code>, which returns a negative number when the value is absent (the bitwise complement of the insert position).</p>
    <blockquote><b>Say it in the interview:</b> Binary search halves a sorted range each step: O(log n) time, O(1) space. I compute mid as lo plus half the distance to avoid overflow, and loop while lo is less than or equal to hi.</blockquote>`,
  followUps: [`Find the first position of a value that appears many times.`, `Write it recursively. What is the space cost?`] });

interview.push({ q: `Find the second largest number in an array.`, level: 'B', a: `<p>Keep the largest and the second largest value seen so far, and update both in one pass.</p>
    <pre><code>static int? SecondLargest(int[] a)
{
    int? first = null, second = null;
    foreach (int x in a)
    {
        if (first == null || x &gt; first) { second = first; first = x; }
        else if (x != first &amp;&amp; (second == null || x &gt; second)) second = x;
    }
    return second;                              // null: no second distinct value
}   // O(n) time, O(1) space</code></pre>
    <ul>
      <li>When a new maximum arrives, the old maximum becomes the second.</li>
      <li><code>x != first</code> skips copies of the maximum, so [5, 1, 9, 9, 7] returns 7, not 9. Ask if that is the meaning the interviewer wants.</li>
      <li>Nullable values (<code>int?</code>) mean "none yet". That is safer than starting with <code>int.MinValue</code>, which gives a wrong answer when the array really contains that value.</li>
    </ul>
    <p>Sorting and taking the second item from the end is O(n log n) and still needs the duplicate rule. This is O(n).</p>
    <blockquote><b>Say it in the interview:</b> One pass with two variables, first and second. A bigger value pushes first down into second. O(n) time, O(1) space, and I return null when there is no second distinct value.</blockquote>`,
  followUps: [`Find the k-th largest. Which data structure do you use?`, `Do it with LINQ and explain the cost.`] });

interview.push({ q: `Find the contiguous subarray with the largest sum (Kadane's algorithm).`, level: 'I', a: `<p>Walk the array once. At each item either extend the current run or start a new run at this item, whichever is larger. Remember the best run seen.</p>
    <pre><code>static int MaxSubArray(int[] a)
{
    int best = a[0], cur = a[0];
    for (int i = 1; i &lt; a.Length; i++)
    {
        cur = Math.Max(a[i], cur + a[i]);       // extend the run, or start fresh here
        best = Math.Max(best, cur);
    }
    return best;
}   // [-2,1,-3,4,-1,2,1,-5,4] -&gt; 6; O(n) time, O(1) space</code></pre>
    <p><code>cur</code> is the best sum of a run that <b>ends</b> at index i. If the earlier run is negative, it only makes things worse, so <code>Math.Max</code> drops it. Start both variables with <code>a[0]</code>, not 0, or an all-negative array wrongly returns 0.</p>
    <p>Brute force tries every start and end: O(n<sup>2</sup>). Kadane is O(n) time and O(1) space. TypeScript:</p>
    <pre><code>const maxSubArray = (a: number[]): number =&gt; {
  let best = a[0], cur = a[0];
  for (let i = 1; i &lt; a.length; i++) {
    cur = Math.max(a[i], cur + a[i]);
    best = Math.max(best, cur);
  }
  return best;
};</code></pre>
    <blockquote><b>Say it in the interview:</b> Kadane's algorithm: the best run ending here is either this element alone or the previous best run plus this element. I track that and the overall best in one pass, O(n) time and O(1) space.</blockquote>`,
  followUps: [`Return the start and end indexes too.`, `What changes for the largest product?`, `The array is circular. How do you adapt it?`] });

interview.push({ q: `Rotate an array to the right by k steps, in place.`, level: 'I', a: `<p>Reverse the whole array, then reverse the first k items, then reverse the rest.</p>
    <pre><code>static void Rotate(int[] a, int k)
{
    if (a.Length == 0) return;
    k %= a.Length;                              // k can be bigger than the array
    Array.Reverse(a);                           // 1 2 3 4 5 -&gt; 5 4 3 2 1
    Array.Reverse(a, 0, k);                     // first k back in order
    Array.Reverse(a, k, a.Length - k);          // the rest back in order
}   // O(n) time, O(1) space</code></pre>
    <table>
      <thead><tr><th>Step (k = 2)</th><th>Array</th></tr></thead>
      <tbody>
        <tr><td>Start</td><td>1 2 3 4 5</td></tr>
        <tr><td>Reverse all</td><td>5 4 3 2 1</td></tr>
        <tr><td>Reverse first 2</td><td>4 5 3 2 1</td></tr>
        <tr><td>Reverse the rest</td><td>4 5 1 2 3</td></tr>
      </tbody>
    </table>
    <p><code>k %= a.Length</code> handles k larger than the array, and the empty check stops a divide-by-zero. The other answers are weaker: copying to a new array is O(n) extra space, and shifting by one step k times is O(n × k).</p>
    <blockquote><b>Say it in the interview:</b> Three reversals: the whole array, then the first k, then the remainder. O(n) time and O(1) space, and I reduce k modulo the length first.</blockquote>`,
  followUps: [`Rotate to the left instead.`, `Why does the reversal trick work?`] });

interview.push({ q: `Merge overlapping intervals.`, level: 'I', a: `<p>Sort the intervals by start. Then go through them once: if the current one starts before the last merged one ends, stretch the last one, otherwise begin a new one.</p>
    <pre><code>static int[][] MergeIntervals(int[][] iv)
{
    var res = new List&lt;int[]&gt;();
    foreach (int[] cur in iv.OrderBy(x =&gt; x[0]))    // sort by start
    {
        int[] last = res.Count &gt; 0 ? res[res.Count - 1] : null;
        if (last != null &amp;&amp; cur[0] &lt;= last[1])
            last[1] = Math.Max(last[1], cur[1]);    // overlap: stretch the last one
        else
            res.Add(new[] { cur[0], cur[1] });      // gap: start a new one
    }
    return res.ToArray();
}   // O(n log n) time, O(n) space</code></pre>
    <p>[8,10], [1,3], [2,6], [15,18] gives [1,6], [8,10], [15,18].</p>
    <ul>
      <li><code>Math.Max</code> matters for an interval that sits inside another, like [1,10] and [2,3].</li>
      <li><code>&lt;=</code> treats touching intervals such as [1,4] and [4,5] as overlapping. Confirm that rule.</li>
      <li>New arrays are added, so the caller's intervals are not changed.</li>
    </ul>
    <p>The sort dominates the cost: O(n log n). Real uses are calendar bookings and joining time ranges. TypeScript:</p>
    <pre><code>const mergeIntervals = (iv: number[][]): number[][] =&gt; {
  const res: number[][] = [];
  for (const [s, e] of [...iv].sort((a, b) =&gt; a[0] - b[0])) {
    const last = res[res.length - 1];
    if (last &amp;&amp; s &lt;= last[1]) last[1] = Math.max(last[1], e);
    else res.push([s, e]);
  }
  return res;
};</code></pre>
    <blockquote><b>Say it in the interview:</b> Sort by start time, then one pass: overlap means extend the end of the last merged interval, otherwise add a new one. O(n log n) because of the sort.</blockquote>`,
  followUps: [`Insert one new interval into a list that is already sorted and merged.`, `How many meeting rooms are needed for a set of meetings?`] });

interview.push({ q: `Product of array except self, without using division.`, level: 'I', a: `<p>The answer at index i is the product of everything left of i times the product of everything right of i. Compute the left products in one pass and multiply in the right products in a second pass.</p>
    <pre><code>static int[] ProductExceptSelf(int[] a)
{
    var res = new int[a.Length];
    int left = 1;
    for (int i = 0; i &lt; a.Length; i++) { res[i] = left; left *= a[i]; }        // product of everything before i
    int right = 1;
    for (int i = a.Length - 1; i &gt;= 0; i--) { res[i] *= right; right *= a[i]; } // times everything after i
    return res;
}   // O(n) time, O(1) extra space</code></pre>
    <table>
      <thead><tr><th>index</th><th>0</th><th>1</th><th>2</th><th>3</th></tr></thead>
      <tbody>
        <tr><td>a</td><td>1</td><td>2</td><td>3</td><td>4</td></tr>
        <tr><td>after pass 1 (left)</td><td>1</td><td>1</td><td>2</td><td>6</td></tr>
        <tr><td>after pass 2 (× right)</td><td>24</td><td>12</td><td>8</td><td>6</td></tr>
      </tbody>
    </table>
    <p>Dividing the total product by <code>a[i]</code> looks simpler, but it fails when the array contains a zero. The result array is not counted as extra space, so this is O(1) extra.</p>
    <blockquote><b>Say it in the interview:</b> Two passes: first I store the product of everything to the left of each index, then I multiply by a running product from the right. O(n) time, O(1) extra space, and it handles zeros.</blockquote>`,
  followUps: [`What happens with one zero? With two zeros?`, `How would you handle overflow?`] });

interview.push({ q: `Best time to buy and sell a stock once for the largest profit.`, level: 'I', a: `<p>Walk through the prices once, remember the lowest price so far, and at each day check the profit of selling today.</p>
    <pre><code>static int MaxProfit(int[] prices)
{
    int min = int.MaxValue, best = 0;
    foreach (int p in prices)
    {
        min = Math.Min(min, p);                 // cheapest day so far
        best = Math.Max(best, p - min);         // sell today?
    }
    return best;
}   // O(n) time, O(1) space</code></pre>
    <p>For [7, 1, 5, 3, 6, 4] the lowest price becomes 1 on day 2, and selling at 6 gives a profit of 5. If prices only fall, the answer stays 0, which means "do not trade".</p>
    <p>The lowest price always comes from an <b>earlier</b> day, so the rule "buy before you sell" is respected automatically. The brute force tries every buy day with every later sell day: O(n<sup>2</sup>).</p>
    <blockquote><b>Say it in the interview:</b> One pass tracking the minimum price so far and the best profit if I sold today. O(n) time and O(1) space.</blockquote>`,
  followUps: [`You may buy and sell as many times as you like. What changes?`, `How is this related to Kadane's algorithm?`] });

interview.push({ q: `Container with most water: pick two lines that hold the most water.`, level: 'I', a: `<p>Start with the two outermost lines, and always move the shorter one inwards.</p>
    <pre><code>static int MaxArea(int[] h)
{
    int l = 0, r = h.Length - 1, best = 0;
    while (l &lt; r)
    {
        best = Math.Max(best, Math.Min(h[l], h[r]) * (r - l));
        if (h[l] &lt; h[r]) l++; else r--;         // move the shorter wall
    }
    return best;
}   // O(n) time, O(1) space</code></pre>
    <p>The water held is width × the <b>shorter</b> line. Moving inwards makes the width smaller, so the only hope for more water is a taller short side. Moving the taller line can never help, because the shorter one still limits the height. That is why no pair that matters is skipped.</p>
    <p>For [1, 8, 6, 2, 5, 4, 8, 3, 7] the answer is 49: the lines of height 8 and 7 are 7 apart.</p>
    <blockquote><b>Say it in the interview:</b> Two pointers at the ends. The area is the width times the shorter line, and I move the shorter line inwards because moving the taller one cannot increase the area. O(n) time, O(1) space, against O(n squared) for all pairs.</blockquote>`,
  followUps: [`Prove that moving the shorter line never skips the best answer.`, `How is this different from trapping rain water?`] });

interview.push({ q: `Sort an array that contains only 0, 1 and 2 in one pass (Dutch national flag).`, level: 'I', a: `<p>Use 3 indexes that split the array into zones: zeros before <code>lo</code>, twos after <code>hi</code>, and <code>mid</code> scans the unknown part between them.</p>
    <pre><code>static void SortColors(int[] a)                 // values are only 0, 1 or 2
{
    int lo = 0, mid = 0, hi = a.Length - 1;
    while (mid &lt;= hi)
    {
        if (a[mid] == 0) { int t = a[lo]; a[lo] = a[mid]; a[mid] = t; lo++; mid++; }
        else if (a[mid] == 1) mid++;
        else { int t = a[hi]; a[hi] = a[mid]; a[mid] = t; hi--; }   // do not move mid: recheck
    }
}   // O(n) time, O(1) space, one pass</code></pre>
    <ul>
      <li>0: swap it to the front zone, and move both <code>lo</code> and <code>mid</code>.</li>
      <li>1: it is already in the right zone, move <code>mid</code>.</li>
      <li>2: swap it to the back zone and move <code>hi</code>, but do <b>not</b> move <code>mid</code>. The value that came back has not been looked at yet.</li>
    </ul>
    <p>Counting the zeros, ones and twos and then rewriting the array is also O(n), but it takes 2 passes and only works for plain numbers, not for objects with a key. The same 3-way split is the heart of quicksort for arrays with many equal values.</p>
    <blockquote><b>Say it in the interview:</b> Three pointers, lo, mid and hi. Zeros are swapped to the front, twos to the back, ones stay. One pass, O(n) time, O(1) space.</blockquote>`,
  followUps: [`Why is <code>mid</code> not advanced after swapping with <code>hi</code>?`, `Is this sort stable?`] });

interview.push({ q: `Find the element that appears more than half the time (majority element).`, level: 'I', a: `<p>Keep one candidate and a vote count. The same value adds a vote, a different value removes one, and at 0 votes you pick a new candidate.</p>
    <pre><code>static int MajorityElement(int[] a)             // some value fills more than half
{
    int candidate = 0, votes = 0;
    foreach (int x in a)
    {
        if (votes == 0) candidate = x;          // pick a new candidate
        votes += x == candidate ? 1 : -1;       // same value votes for, others against
    }
    return candidate;
}   // O(n) time, O(1) space</code></pre>
    <p>This is the Boyer-Moore voting algorithm. Each "minus" cancels one majority item against one other item. The majority value has more than half of all items, so it cannot be cancelled out completely and is the one left standing.</p>
    <p>For [2, 2, 1, 1, 1, 2, 2] the answer is 2.</p>
    <p><b>Important:</b> it is only correct if a majority really exists. If that is not promised, do a second pass to count the candidate. A dictionary of counts is also O(n) time, but it uses O(n) memory.</p>
    <blockquote><b>Say it in the interview:</b> Boyer-Moore voting: one candidate and one counter, cancelling different values against each other. O(n) time, O(1) space, plus a verification pass if a majority is not guaranteed.</blockquote>`,
  followUps: [`Find all values that appear more than n / 3 times.`, `Why can there be at most 2 such values?`] });

interview.push({ q: `Count the subarrays whose sum equals K.`, level: 'A', a: `<p>Keep a running sum, and count how many earlier running sums equal <code>sum - k</code>. Each of those marks the start of a subarray that ends here and adds up to k.</p>
    <pre><code>static int SubarraySum(int[] a, int k)
{
    var freq = new Dictionary&lt;int, int&gt; { [0] = 1 };   // running sum -&gt; times seen
    int sum = 0, count = 0;
    foreach (int x in a)
    {
        sum += x;
        if (freq.TryGetValue(sum - k, out int c)) count += c;   // c earlier cuts give sum k
        freq.TryGetValue(sum, out int f);
        freq[sum] = f + 1;
    }
    return count;
}   // works with negatives; O(n) time, O(n) space</code></pre>
    <ul>
      <li>The sum of items i to j is <code>prefix[j] - prefix[i - 1]</code>. So "equals k" means an earlier prefix of exactly <code>sum - k</code>.</li>
      <li>The seed <code>[0] = 1</code> stands for the empty prefix. It counts subarrays that start at index 0.</li>
      <li>Look up first, then store, so that k = 0 does not count the empty subarray.</li>
    </ul>
    <p>A sliding window does not work here, because with negative numbers a longer window can have a smaller sum. For [1, 1, 1] and k = 2 the answer is 2.</p>
    <blockquote><b>Say it in the interview:</b> Prefix sums with a dictionary of how often each running sum has occurred. For each position I add the count of sum minus k. O(n) time, O(n) space, and it works with negative numbers.</blockquote>`,
  followUps: [`Why is the dictionary seeded with 0 mapped to 1?`, `Return the longest subarray with sum K.`, `Count subarrays whose sum is divisible by K.`] });

interview.push({ q: `Three Sum: find all unique triplets that add up to zero.`, level: 'A', a: `<p>Sort the array. Fix the first number, then use two pointers on the rest to find pairs that bring the total to 0.</p>
    <pre><code>static List&lt;int[]&gt; ThreeSum(int[] nums)
{
    Array.Sort(nums);
    var res = new List&lt;int[]&gt;();
    for (int i = 0; i &lt; nums.Length - 2; i++)
    {
        if (i &gt; 0 &amp;&amp; nums[i] == nums[i - 1]) continue;      // same first number: skip
        int l = i + 1, r = nums.Length - 1;
        while (l &lt; r)
        {
            int s = nums[i] + nums[l] + nums[r];
            if (s &lt; 0) l++;
            else if (s &gt; 0) r--;
            else
            {
                res.Add(new[] { nums[i], nums[l], nums[r] });
                while (l &lt; r &amp;&amp; nums[l] == nums[l + 1]) l++;  // skip repeats
                while (l &lt; r &amp;&amp; nums[r] == nums[r - 1]) r--;
                l++; r--;
            }
        }
    }
    return res;
}   // O(n^2) time</code></pre>
    <p>Duplicates are skipped in 2 places: the same first number is never used twice, and after a hit both pointers move past equal values. Because the array is sorted, that is enough, and no <code>HashSet</code> of triplets is needed.</p>
    <p>[-1, 0, 1, 2, -1, -4] gives [-1, -1, 2] and [-1, 0, 1].</p>
    <p>Cost: O(n log n) to sort plus O(n) for the two pointers for each first number, so O(n<sup>2</sup>) in total. The brute force with 3 loops is O(n<sup>3</sup>).</p>
    <blockquote><b>Say it in the interview:</b> Sort, fix one number, and run two pointers on the remainder, skipping equal values to avoid duplicate triplets. O(n squared) time.</blockquote>`,
  followUps: [`Find the triplet whose sum is closest to a target.`, `How would you extend it to four sum?`] });

interview.push({ q: `Search for a value in a rotated sorted array.`, level: 'A', a: `<p>It is still binary search. At every step one half is properly sorted, so check whether the target lies inside that half, and otherwise go to the other half.</p>
    <pre><code>static int SearchRotated(int[] a, int target)
{
    int lo = 0, hi = a.Length - 1;
    while (lo &lt;= hi)
    {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] == target) return mid;
        if (a[lo] &lt;= a[mid])                    // left half is sorted
        {
            if (a[lo] &lt;= target &amp;&amp; target &lt; a[mid]) hi = mid - 1; else lo = mid + 1;
        }
        else                                    // right half is sorted
        {
            if (a[mid] &lt; target &amp;&amp; target &lt;= a[hi]) lo = mid + 1; else hi = mid - 1;
        }
    }
    return -1;
}   // O(log n) time, O(1) space</code></pre>
    <p>For [4, 5, 6, 7, 0, 1, 2] and target 0: mid is 7 and the left half 4..7 is sorted, but 0 is not in that range, so go right. Then mid is 1, the left half [0, 1] is sorted and contains 0, so go left and find it at index 4.</p>
    <p><code>a[lo] &lt;= a[mid]</code> uses <code>&lt;=</code> so that a range of 1 or 2 items is handled. The method assumes all values are different. With duplicates, <code>a[lo] == a[mid]</code> tells you nothing and the worst case becomes O(n).</p>
    <blockquote><b>Say it in the interview:</b> Modified binary search: one half is always sorted, so I test whether the target is inside the sorted half and discard the other. O(log n) time, O(1) space, assuming distinct values.</blockquote>`,
  followUps: [`Find the smallest element, which is the rotation point.`, `What breaks when duplicates are allowed?`] });

interview.push({ q: `Sliding window maximum: return the maximum of every window of size k.`, level: 'A', a: `<p>Keep a double-ended queue (deque) of indexes whose values go from large to small. The front is always the maximum of the current window.</p>
    <pre><code>static int[] MaxSlidingWindow(int[] a, int k)
{
    var dq = new LinkedList&lt;int&gt;();             // indexes; their values go downhill
    var res = new List&lt;int&gt;();
    for (int i = 0; i &lt; a.Length; i++)
    {
        if (dq.Count &gt; 0 &amp;&amp; dq.First.Value &lt;= i - k) dq.RemoveFirst();         // left the window
        while (dq.Count &gt; 0 &amp;&amp; a[dq.Last.Value] &lt;= a[i]) dq.RemoveLast();      // can never win now
        dq.AddLast(i);
        if (i &gt;= k - 1) res.Add(a[dq.First.Value]);                            // front = max
    }
    return res.ToArray();
}   // O(n) time, O(k) space</code></pre>
    <ul>
      <li>Drop the front when it has left the window.</li>
      <li>Before adding a new item, remove smaller items from the back. They are older <i>and</i> smaller, so they can never win.</li>
    </ul>
    <p>[1, 3, -1, -3, 5, 3, 6, 7] with k = 3 gives [3, 3, 5, 5, 6, 7].</p>
    <p>Every index is added once and removed at most once, so the total is O(n), not O(n × k). .NET has no built-in deque. <code>LinkedList&lt;int&gt;</code> gives O(1) at both ends. In JavaScript, <code>shift()</code> on an array is O(n), so use a head index when it matters.</p>
    <blockquote><b>Say it in the interview:</b> A monotonic deque of indexes with decreasing values. I drop indexes that left the window from the front and smaller values from the back, so the front is always the maximum. O(n) time, O(k) space.</blockquote>`,
  followUps: [`Why does the deque store indexes and not values?`, `Solve it with a heap. What does that cost?`] });

interview.push({ q: `Trapping rain water: how much water is held between the bars?`, level: 'E', a: `<p>The water above a bar is the lower of the tallest bar on its left and the tallest on its right, minus its own height. Two pointers compute this without extra arrays.</p>
    <pre><code>static int Trap(int[] h)
{
    int l = 0, r = h.Length - 1, lmax = 0, rmax = 0, water = 0;
    while (l &lt; r)
    {
        if (h[l] &lt; h[r])                        // the left side is the lower wall
        {
            lmax = Math.Max(lmax, h[l]);
            water += lmax - h[l];
            l++;
        }
        else
        {
            rmax = Math.Max(rmax, h[r]);
            water += rmax - h[r];
            r--;
        }
    }
    return water;
}   // [0,1,0,2,1,0,1,3,2,1,2,1] -&gt; 6; O(n) time, O(1) space</code></pre>
    <p><b>Why it works:</b> if <code>h[l] &lt; h[r]</code>, a wall at least as tall as <code>h[l]</code> exists on the right. So the water at <code>l</code> is limited only by the highest bar seen on the left, <code>lmax</code>, which we already know. The same holds mirrored for the right side.</p>
    <table>
      <thead><tr><th>Approach</th><th>Time</th><th>Space</th></tr></thead>
      <tbody>
        <tr><td>For each bar, scan left and right</td><td>O(n<sup>2</sup>)</td><td>O(1)</td></tr>
        <tr><td>Two arrays: leftMax and rightMax</td><td>O(n)</td><td>O(n)</td></tr>
        <tr><td>Two pointers</td><td>O(n)</td><td>O(1)</td></tr>
      </tbody>
    </table>
    <p>[0,1,0,2,1,0,1,3,2,1,2,1] holds 6 units.</p>
    <blockquote><b>Say it in the interview:</b> Water at each bar is the minimum of the left and right maximum minus the bar height. With two pointers I always process the lower side, whose limit is already known. O(n) time, O(1) space.</blockquote>`,
  followUps: [`Explain the version with two helper arrays first.`, `Solve it with a stack.`, `What changes for a 2D height map?`] });

interview.push({ q: `Find the longest subarray whose sum is at most K.`, level: 'E', a: `<p>If all numbers are zero or more, a sliding window is enough: add each item on the right, and remove items from the left while the sum is above K. That is O(n).</p>
    <p>With negative numbers the window breaks, because removing an item can make the sum <i>bigger</i>. Then use prefix sums. The subarray from l to r has a sum of at most K when <code>pre[l] &gt;= pre[r] - K</code>, and we want the <b>earliest</b> such l. A running maximum of the prefixes never goes down, so it can be binary searched:</p>
    <pre><code>static int LongestAtMostK(int[] a, int k)
{
    int n = a.Length, best = 0;
    var pre = new long[n + 1];                  // pre[i] = sum of the first i items
    var top = new long[n + 1];                  // top[i] = biggest pre[0..i], never goes down
    for (int i = 0; i &lt; n; i++)
    {
        pre[i + 1] = pre[i] + a[i];
        top[i + 1] = Math.Max(top[i], pre[i + 1]);
    }
    for (int r = 1; r &lt;= n; r++)
    {
        long want = pre[r] - k;                 // need the earliest l with pre[l] &gt;= want
        int lo = 0, hi = r;
        while (lo &lt; hi)
        {
            int mid = (lo + hi) / 2;
            if (top[mid] &gt;= want) hi = mid; else lo = mid + 1;
        }
        best = Math.Max(best, r - lo);
    }
    return best;
}   // O(n log n) time, O(n) space</code></pre>
    <p>The first index where the running maximum reaches the wanted value is also an index where the prefix itself reaches it. That is why searching <code>top</code> is valid.</p>
    <blockquote><b>Say it in the interview:</b> For non-negative numbers I use a sliding window in O(n). With negatives I use prefix sums and binary search a running maximum of the prefixes for the earliest valid start, which is O(n log n).</blockquote>`,
  followUps: [`Why does the sliding window fail with negative numbers?`, `Find the shortest subarray with sum at least K. Which structure does that need?`] });


// ---------- INTERVIEW: 4. Matrices ----------
interview.push({ q: `How do you declare and walk a 2D array in C#, and sum its rows and columns?`, level: 'B', a: `<p>C# has 2 kinds of 2D array, and you walk both with a row loop around a column loop.</p>
    <table>
      <thead><tr><th></th><th>Jagged <code>int[][]</code></th><th>Rectangular <code>int[,]</code></th></tr></thead>
      <tbody>
        <tr><td>Meaning</td><td>array of row arrays</td><td>one block, 2 dimensions</td></tr>
        <tr><td>Cell</td><td><code>m[r][c]</code></td><td><code>m[r, c]</code></td></tr>
        <tr><td>Sizes</td><td><code>m.Length</code>, <code>m[r].Length</code></td><td><code>GetLength(0)</code>, <code>GetLength(1)</code></td></tr>
        <tr><td>Rows of different length</td><td>yes</td><td>no</td></tr>
      </tbody>
    </table>
    <pre><code>static int[] RowSums(int[][] m)
{
    var sums = new int[m.Length];
    for (int r = 0; r &lt; m.Length; r++)
        for (int c = 0; c &lt; m[r].Length; c++) sums[r] += m[r][c];
    return sums;
}

static int[] ColSums(int[,] m)                  // rectangular array version
{
    int rows = m.GetLength(0), cols = m.GetLength(1);
    var sums = new int[cols];
    for (int r = 0; r &lt; rows; r++)
        for (int c = 0; c &lt; cols; c++) sums[c] += m[r, c];
    return sums;
}   // both: O(rows * cols) time</code></pre>
    <p>For [[1,2,3],[4,5,6]] the row sums are 6 and 15, and the column sums are 5, 7 and 9. Jagged arrays are the usual choice in interviews, and reading a cell is generally faster with them. Every full walk is O(rows × columns).</p>
    <blockquote><b>Say it in the interview:</b> A jagged array is an array of arrays indexed m[r][c], a rectangular array is one block indexed m[r, c] with GetLength. I walk either with nested loops, rows outside and columns inside, in O(rows times columns).</blockquote>`,
  followUps: [`Why is walking row by row faster than column by column?`, `What does <code>m.Length</code> return for an <code>int[3, 4]</code>?`] });

interview.push({ q: `Transpose a matrix and sum its two diagonals.`, level: 'B', a: `<p>Transposing turns rows into columns: the value at row r, column c moves to row c, column r. The diagonals of a square matrix are the cells <code>[i][i]</code> and <code>[i][n - 1 - i]</code>.</p>
    <pre><code>static int[][] Transpose(int[][] m)
{
    int rows = m.Length, cols = m[0].Length;
    var t = new int[cols][];
    for (int c = 0; c &lt; cols; c++)
    {
        t[c] = new int[rows];
        for (int r = 0; r &lt; rows; r++) t[c][r] = m[r][c];   // row r, col c -&gt; row c, col r
    }
    return t;
}

static (int main, int anti) Diagonals(int[][] m)   // square matrix
{
    int n = m.Length, a = 0, b = 0;
    for (int i = 0; i &lt; n; i++) { a += m[i][i]; b += m[i][n - 1 - i]; }
    return (a, b);
}</code></pre>
    <ul>
      <li>A 2 × 3 matrix becomes 3 × 2, so a new matrix is needed. Only a square matrix can be transposed in place, by swapping across the main diagonal.</li>
      <li>For an odd size, the centre cell is on both diagonals. If the question asks for one total, subtract it once.</li>
      <li>The diagonals come back as a tuple, a C# 7 feature.</li>
    </ul>
    <p>TypeScript is short with <code>map</code>:</p>
    <pre><code>const transpose = (m: number[][]) =&gt; m[0].map((_, c) =&gt; m.map(row =&gt; row[c]));
const rowSums = (m: number[][]) =&gt; m.map(r =&gt; r.reduce((s, x) =&gt; s + x, 0));
const colSums = (m: number[][]) =&gt; m[0].map((_, c) =&gt; m.reduce((s, r) =&gt; s + r[c], 0));</code></pre>
    <blockquote><b>Say it in the interview:</b> Transpose swaps the row and column index, so t[c][r] equals m[r][c], and it is O(rows times columns). The main diagonal is m[i][i] and the anti-diagonal is m[i][n minus 1 minus i], both in one O(n) loop.</blockquote>`,
  followUps: [`Transpose a square matrix in place.`, `Check whether a matrix is symmetric.`] });

interview.push({ q: `Generate the first n rows of Pascal's triangle.`, level: 'B', a: `<p>Every row starts and ends with 1, and each number in between is the sum of the 2 numbers above it.</p>
    <pre><code>static List&lt;List&lt;int&gt;&gt; Pascal(int rows)
{
    var t = new List&lt;List&lt;int&gt;&gt;();
    for (int i = 0; i &lt; rows; i++)
    {
        var row = new List&lt;int&gt;(new int[i + 1]);    // i + 1 zeros
        row[0] = row[i] = 1;                        // both ends are 1
        for (int j = 1; j &lt; i; j++)
            row[j] = t[i - 1][j - 1] + t[i - 1][j]; // the two numbers above
        t.Add(row);
    }
    return t;
}   // O(rows^2) time and space</code></pre>
    <table>
      <thead><tr><th>Row</th><th>Values</th></tr></thead>
      <tbody>
        <tr><td>0</td><td>1</td></tr>
        <tr><td>1</td><td>1 1</td></tr>
        <tr><td>2</td><td>1 2 1</td></tr>
        <tr><td>3</td><td>1 3 3 1</td></tr>
        <tr><td>4</td><td>1 4 6 4 1</td></tr>
      </tbody></table>
    <p>The rows have different lengths, so this is a natural jagged structure. The total number of cells is 1 + 2 + ... + n, which makes it O(n<sup>2</sup>) time and space. The values grow fast: row 34 already holds a number above <code>int.MaxValue</code>, so use <code>long</code> for bigger triangles.</p>
    <blockquote><b>Say it in the interview:</b> Each row has ones at both ends and every inner value is the sum of the two values above it in the previous row. Building n rows is O(n squared) time and space.</blockquote>`,
  followUps: [`Return only row k using O(k) memory.`, `What do the numbers in row n mean in maths?`] });

interview.push({ q: `Rotate a square image 90 degrees clockwise, in place.`, level: 'I', a: `<p>Transpose the matrix (swap across the main diagonal), then reverse each row.</p>
    <pre><code>static void Rotate90(int[][] m)
{
    int n = m.Length;
    for (int i = 0; i &lt; n; i++)
        for (int j = i + 1; j &lt; n; j++)
        {
            int t = m[i][j]; m[i][j] = m[j][i]; m[j][i] = t;   // transpose: flip over the diagonal
        }
    foreach (int[] row in m) Array.Reverse(row);               // then mirror each row
}   // O(n^2) time, O(1) space</code></pre>
    <table>
      <thead><tr><th>Start</th><th>Transposed</th><th>Rows reversed</th></tr></thead>
      <tbody>
        <tr><td>1 2 3</td><td>1 4 7</td><td>7 4 1</td></tr>
        <tr><td>4 5 6</td><td>2 5 8</td><td>8 5 2</td></tr>
        <tr><td>7 8 9</td><td>3 6 9</td><td>9 6 3</td></tr>
      </tbody>
    </table>
    <p>The inner loop starts at <code>j = i + 1</code>. Starting at 0 would swap every pair twice and put everything back. On C# 7 or later the swap can be a tuple: <code>(m[i][j], m[j][i]) = (m[j][i], m[i][j]);</code></p>
    <p>It only works in place for a square matrix. TypeScript:</p>
    <pre><code>const rotate90 = (m: number[][]): void =&gt; {
  const n = m.length;
  for (let i = 0; i &lt; n; i++)
    for (let j = i + 1; j &lt; n; j++) [m[i][j], m[j][i]] = [m[j][i], m[i][j]];
  m.forEach(r =&gt; r.reverse());
};</code></pre>
    <blockquote><b>Say it in the interview:</b> Transpose, then reverse each row. Both steps are in place, so it is O(n squared) time for n squared cells and O(1) extra space.</blockquote>`,
  followUps: [`Rotate anticlockwise. Which step changes?`, `Rotate a matrix that is not square.`, `Do it layer by layer with 4-way swaps.`] });

interview.push({ q: `Return the elements of a matrix in spiral order.`, level: 'I', a: `<p>Keep 4 borders (top, bottom, left, right). Walk the top row, the right column, the bottom row and the left column, and move each border inwards after its walk.</p>
    <pre><code>static List&lt;int&gt; Spiral(int[][] m)
{
    var res = new List&lt;int&gt;();
    int top = 0, bottom = m.Length - 1, left = 0, right = m[0].Length - 1;
    while (top &lt;= bottom &amp;&amp; left &lt;= right)
    {
        for (int c = left; c &lt;= right; c++) res.Add(m[top][c]);        // go right
        top++;
        for (int r = top; r &lt;= bottom; r++) res.Add(m[r][right]);      // go down
        right--;
        if (top &lt;= bottom)
        {
            for (int c = right; c &gt;= left; c--) res.Add(m[bottom][c]); // go left
            bottom--;
        }
        if (left &lt;= right)
        {
            for (int r = bottom; r &gt;= top; r--) res.Add(m[r][left]);   // go up
            left++;
        }
    }
    return res;
}   // O(rows * cols) time, O(1) extra space</code></pre>
    <p>The 2 <code>if</code> checks are the important part. After the top row and right column are done, there may be no row or column left. Without the checks, a single row or a single column would be read twice.</p>
    <p>[[1,2,3],[4,5,6],[7,8,9]] gives 1, 2, 3, 6, 9, 8, 7, 4, 5. Test it with a 1 × 3 and a 3 × 1 matrix too.</p>
    <blockquote><b>Say it in the interview:</b> Four borders that shrink after each edge is walked, with a check before the bottom row and the left column so a single row or column is not repeated. O(rows times columns) time, and O(1) space besides the output.</blockquote>`,
  followUps: [`Fill an n × n matrix with 1 to n² in spiral order.`, `Write it with a direction array and a visited grid. Which version do you prefer?`] });

interview.push({ q: `Search for a value in a matrix whose rows and columns are both sorted.`, level: 'I', a: `<p>Start at the top-right corner. If the value there is too big, move left. If it is too small, move down.</p>
    <pre><code>static bool SearchMatrix(int[][] m, int target)
{
    int r = 0, c = m[0].Length - 1;             // start at the top-right corner
    while (r &lt; m.Length &amp;&amp; c &gt;= 0)
    {
        if (m[r][c] == target) return true;
        if (m[r][c] &gt; target) c--;              // too big: this whole column is out
        else r++;                               // too small: this whole row is out
    }
    return false;
}   // O(rows + cols) time, O(1) space</code></pre>
    <p>From the top-right corner, everything to the left is smaller and everything below is bigger. So each comparison removes a whole column or a whole row. The walk looks like a staircase and takes at most rows + columns steps.</p>
    <table>
      <thead><tr><th>Approach</th><th>Time</th></tr></thead>
      <tbody>
        <tr><td>Scan every cell</td><td>O(rows × columns)</td></tr>
        <tr><td>Binary search each row</td><td>O(rows × log columns)</td></tr>
        <tr><td>Staircase from the top-right</td><td>O(rows + columns)</td></tr>
      </tbody>
    </table>
    <p>The bottom-left corner works as well. The top-left does not, because both directions get bigger and you learn nothing.</p>
    <blockquote><b>Say it in the interview:</b> I start at the top-right corner and move left when the value is too big and down when it is too small, so every step discards a row or a column. O(rows plus columns) time, O(1) space.</blockquote>`,
  followUps: [`Each row also continues from the previous row. What faster search is possible?`, `Count how many values are smaller than the target.`] });

interview.push({ q: `Set matrix zeroes: if a cell is 0, set its whole row and column to 0.`, level: 'I', a: `<p>Do it in 2 passes: first remember which rows and columns contain a zero, then write the zeros.</p>
    <pre><code>static void SetZeroes(int[][] m)
{
    var rows = new HashSet&lt;int&gt;();
    var cols = new HashSet&lt;int&gt;();
    for (int i = 0; i &lt; m.Length; i++)          // pass 1: only remember
        for (int j = 0; j &lt; m[0].Length; j++)
            if (m[i][j] == 0) { rows.Add(i); cols.Add(j); }
    for (int i = 0; i &lt; m.Length; i++)          // pass 2: write the zeros
        for (int j = 0; j &lt; m[0].Length; j++)
            if (rows.Contains(i) || cols.Contains(j)) m[i][j] = 0;
}   // O(rows * cols) time, O(rows + cols) space</code></pre>
    <p>The trap is doing it in 1 pass. If you zero a row the moment you see a 0, later cells in that row look like original zeros, and they wipe out their columns too. The whole matrix can turn to 0.</p>
    <table>
      <thead><tr><th>Before</th><th>After</th></tr></thead>
      <tbody>
        <tr><td>1 1 1</td><td>1 0 1</td></tr>
        <tr><td>1 0 1</td><td>0 0 0</td></tr>
        <tr><td>1 1 1</td><td>1 0 1</td></tr>
      </tbody>
    </table>
    <p>Time is O(rows × columns). The 2 sets use O(rows + columns) memory. Two <code>bool[]</code> arrays do the same job a little faster.</p>
    <blockquote><b>Say it in the interview:</b> Two passes: the first records the rows and columns that contain a zero, the second clears them. O(rows times columns) time and O(rows plus columns) extra space.</blockquote>`,
  followUps: [`Can you do it with O(1) extra space?`, `Why not copy the whole matrix?`] });

interview.push({ q: `Count the number of islands in a grid of land and water.`, level: 'A', a: `<p>Scan every cell. When you find land that has not been visited, add 1 to the count and "sink" the whole island with a depth-first search, so it is never counted again.</p>
    <pre><code>static int NumIslands(char[][] g)
{
    int count = 0;
    for (int i = 0; i &lt; g.Length; i++)
        for (int j = 0; j &lt; g[0].Length; j++)
            if (g[i][j] == '1') { count++; Sink(g, i, j); }   // new island: erase all of it
    return count;
}

static void Sink(char[][] g, int i, int j)
{
    if (i &lt; 0 || j &lt; 0 || i &gt;= g.Length || j &gt;= g[0].Length || g[i][j] != '1') return;
    g[i][j] = '0';                              // mark as visited
    Sink(g, i + 1, j); Sink(g, i - 1, j); Sink(g, i, j + 1); Sink(g, i, j - 1);
}   // O(rows * cols) time; recursion can go rows * cols deep</code></pre>
    <ul>
      <li><code>Sink</code> stops when it is off the grid or on water. Otherwise it turns the cell to water and visits the 4 neighbours.</li>
      <li>Changing '1' to '0' is the visited mark. It saves memory but destroys the input, so say so, or use a <code>bool[,]</code>.</li>
      <li>Each cell is sunk at most once and looked at a fixed number of times: O(rows × columns).</li>
    </ul>
    <p>The risk is recursion depth. One huge island can go rows × columns calls deep and overflow the stack. For big grids use a queue (BFS) or your own stack.</p>
    <blockquote><b>Say it in the interview:</b> I scan the grid, and each time I hit unvisited land I count one island and flood-fill it with DFS, marking cells as visited. O(rows times columns) time. For very large grids I would switch to an iterative BFS.</blockquote>`,
  followUps: [`Return the size of the largest island.`, `Diagonal cells also count as connected. What changes?`, `Solve it with union-find.`] });

interview.push({ q: `Find the shortest path from the top-left to the bottom-right of a grid with walls.`, level: 'A', a: `<p>Use breadth-first search (BFS). It visits cells in order of distance, so the first time it reaches the target, that is the shortest path.</p>
    <pre><code>static int ShortestPath(int[][] grid)           // 0 = open, 1 = wall
{
    int n = grid.Length, m = grid[0].Length;
    if (grid[0][0] == 1 || grid[n - 1][m - 1] == 1) return -1;
    var q = new Queue&lt;(int r, int c, int d)&gt;();
    q.Enqueue((0, 0, 1));
    grid[0][0] = 1;                             // mark visited when we enqueue
    int[] dr = { 1, -1, 0, 0 }, dc = { 0, 0, 1, -1 };
    while (q.Count &gt; 0)
    {
        var (r, c, d) = q.Dequeue();
        if (r == n - 1 &amp;&amp; c == m - 1) return d; // first arrival is the shortest
        for (int k = 0; k &lt; 4; k++)
        {
            int nr = r + dr[k], nc = c + dc[k];
            if (nr &gt;= 0 &amp;&amp; nc &gt;= 0 &amp;&amp; nr &lt; n &amp;&amp; nc &lt; m &amp;&amp; grid[nr][nc] == 0)
            {
                grid[nr][nc] = 1;
                q.Enqueue((nr, nc, d + 1));
            }
        }
    }
    return -1;                                  // no way through
}   // O(n * m) time and space; d counts cells on the path</code></pre>
    <ul>
      <li>The queue holds the cell and its distance. Here the distance counts cells, so the start is 1.</li>
      <li>A cell is marked visited <b>when it is added</b> to the queue. Marking it later lets the same cell be queued many times.</li>
    </ul>
    <p>DFS would find <i>a</i> path, not the shortest. BFS is right only because every step costs the same. In JavaScript, use an index into the array as the queue head, because <code>shift()</code> is O(n).</p>
    <blockquote><b>Say it in the interview:</b> BFS from the start, storing each cell with its distance and marking cells visited when they are enqueued. The first time I dequeue the target I return its distance. O(rows times columns) time and space.</blockquote>`,
  followUps: [`Return the path itself, not only its length.`, `Cells have different costs. Which algorithm now?`, `You may also move diagonally. What changes?`] });

interview.push({ q: `Do "set matrix zeroes" with O(1) extra space.`, level: 'A', a: `<p>Use the first row and the first column of the matrix itself as the notebook that records which rows and columns must be cleared.</p>
    <pre><code>static void SetZeroesInPlace(int[][] m)
{
    int rows = m.Length, cols = m[0].Length;
    bool firstRow = false, firstCol = false;
    for (int j = 0; j &lt; cols; j++) if (m[0][j] == 0) firstRow = true;
    for (int i = 0; i &lt; rows; i++) if (m[i][0] == 0) firstCol = true;
    for (int i = 1; i &lt; rows; i++)              // use row 0 and column 0 as the notebook
        for (int j = 1; j &lt; cols; j++)
            if (m[i][j] == 0) { m[i][0] = 0; m[0][j] = 0; }
    for (int i = 1; i &lt; rows; i++)
        for (int j = 1; j &lt; cols; j++)
            if (m[i][0] == 0 || m[0][j] == 0) m[i][j] = 0;
    if (firstRow) for (int j = 0; j &lt; cols; j++) m[0][j] = 0;   // the notebook itself, last
    if (firstCol) for (int i = 0; i &lt; rows; i++) m[i][0] = 0;
}   // O(rows * cols) time, O(1) space</code></pre>
    <p>The order is what makes it correct:</p>
    <ol>
      <li>Remember in 2 booleans whether the first row and first column contain a zero <b>of their own</b>, before they are used as markers.</li>
      <li>Scan the inner cells. A zero at (i, j) writes a zero to <code>m[i][0]</code> and <code>m[0][j]</code>.</li>
      <li>Clear the inner cells from the markers.</li>
      <li>Clear the first row and the first column <b>last</b>. Doing it earlier would destroy the markers.</li>
    </ol>
    <p>Time stays O(rows × columns), extra space is 2 booleans. The code is harder to read.</p>
    <blockquote><b>Say it in the interview:</b> I reuse the first row and first column as marker storage, with two booleans to remember whether they themselves need clearing, and I clear them last. O(1) extra space.</blockquote>`,
  followUps: [`What goes wrong if you clear the first row before the inner cells?`, `When would you choose the simpler O(rows + columns) version?`] });

interview.push({ q: `The grid has 10 million cells and your recursive island counter crashes. What do you change?`, level: 'E', a: `<p>Recursion depth is the problem, so replace the call stack with a queue of my own on the heap.</p>
    <pre><code>static int NumIslandsBfs(char[][] g)
{
    int rows = g.Length, cols = g[0].Length, count = 0;
    int[] dr = { 1, -1, 0, 0 }, dc = { 0, 0, 1, -1 };
    var q = new Queue&lt;int&gt;();                   // a cell is stored as r * cols + c
    for (int i = 0; i &lt; rows; i++)
        for (int j = 0; j &lt; cols; j++)
        {
            if (g[i][j] != '1') continue;
            count++;
            g[i][j] = '0';
            q.Enqueue(i * cols + j);
            while (q.Count &gt; 0)
            {
                int cell = q.Dequeue(), r = cell / cols, c = cell % cols;
                for (int k = 0; k &lt; 4; k++)
                {
                    int nr = r + dr[k], nc = c + dc[k];
                    if (nr &lt; 0 || nc &lt; 0 || nr &gt;= rows || nc &gt;= cols || g[nr][nc] != '1') continue;
                    g[nr][nc] = '0';            // mark before enqueue: no cell enters twice
                    q.Enqueue(nr * cols + nc);
                }
            }
        }
    return count;
}   // O(rows * cols) time, no recursion at all</code></pre>
    <p><b>Why it crashed:</b> one large island can make the DFS 10 million calls deep. A thread stack in .NET is about 1 MB by default, and <code>StackOverflowException</code> cannot be caught: the process ends.</p>
    <p><b>What else matters at this size:</b></p>
    <ul>
      <li>Storing a cell as one <code>int</code> (<code>r * cols + c</code>) avoids allocating an object or tuple for every cell.</li>
      <li>If the grid does not fit in memory, read it row by row and join labels with union-find, keeping only 2 rows in memory.</li>
    </ul>
    <blockquote><b>Say it in the interview:</b> The recursive DFS overflows the stack, and that cannot be caught in .NET. I switch to an iterative BFS with an explicit queue of packed cell indexes: the same O(rows times columns) time, but the memory is on the heap.</blockquote>`,
  followUps: [`Why not just run the DFS on a thread with a bigger stack?`, `How does the union-find version work with only 2 rows in memory?`] });

// ---------- MODULE ----------
quiz.forEach(function (q, i) {            // spread the correct option over different positions
  var k = i % q.options.length;
  q.options = q.options.slice(k).concat(q.options.slice(0, k));
  q.answer = (q.answer - k + q.options.length) % q.options.length;
});

registerModule({
  id: 'tl11',
  title: 'Coding Round I: Strings, Arrays & Matrices',
  lang: 'csharp',
  intro: `<p>Most tech lead loops still include a live coding round. It is rarely about a clever trick. The interviewer wants to see that you can take a small problem, <b>ask the right questions, find a sensible approach, write clean C#, test it yourself and state its cost</b>. This module is the first of two coding rounds. It covers how to approach a question out loud, then the string, array and matrix problems that come up again and again, from "reverse a string" to "trapping rain water".</p>
    <p>Every answer gives the plain idea first, then the C# solution with its time and space complexity, and a line you can say out loud. Short TypeScript versions are shown where they are brief, because full-stack roles often let you pick. Every solution here was compiled and run against tests before it was written down. The second coding module covers data structures, recursion, dynamic programming and bits.</p>`,
  goals: [
    'Follow the same 5 steps on any coding question: restate, example, brute force then better, clean code, test and complexity',
    'Pick the pattern from the wording: hash map, two pointers, sliding window, prefix sums, stack, binary search, BFS or DFS',
    'Write the classic string solutions in C# from memory: reverse, palindrome, anagram, first unique character, compression',
    'Write the classic array solutions: two sum, maximum subarray, rotation, duplicates, merge and binary search',
    'Rotate, spiral-walk and search a matrix, and count islands or find a shortest path in a grid',
    'State time and space complexity for every answer and explain the trade-off you chose'
  ],
  prereqs: `<p>You should be able to write loops, methods, arrays, <code>List</code> and <code>Dictionary</code> in C#. If Big-O is new to you, read the first two answers in the interview list before anything else. No earlier module of this track is required.</p>`,
  langExplain: `<p>The solutions are in C# because this track prepares for a .NET tech lead interview. The ideas (two pointers, hash maps, sliding windows, BFS) are the same in every language, and short TypeScript versions are shown for several answers.</p>`,
  hours: 12,
  topics: topics, practice: practice, quiz: quiz, interview: interview
});
})();
