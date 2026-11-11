(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  // CS / TS turn raw code into an escaped code block for interview answers.
  function CS(code) { return '<pre><code>' + H.esc(String(code).replace(/^\n+|\s+$/g, '')) + '</code></pre>'; }
  function TS(code) { return '<pre><code>' + H.esc(String(code).replace(/^\n+|\s+$/g, '')) + '</code></pre>'; }
  /* ===================== TOPIC 1: linked lists, stacks and queues ===================== */
  topics.push({
    title: 'Linked Lists, Stacks and Queues',
    analogy: `<p>A <b>linked list</b> is a treasure hunt: each clue only tells you where the next clue is, so you cannot jump to clue 7 without reading clues 1 to 6. A <b>stack</b> is a pile of plates: you take the plate you put on last. A <b>queue</b> is the line at a ticket counter: whoever came first is served first.</p>`,
    explain: `<p>These three structures appear in almost every coding round, because the code is short and the bugs are easy to see.</p>
<p><b>Linked list.</b> Each node holds a value and a link called <code>next</code>. There is no index, so most questions are solved by moving 1, 2 or 3 pointers along the chain:</p>
<table><thead><tr><th>Pattern</th><th>Solves</th></tr></thead><tbody>
<tr><td>prev / current / next</td><td>reverse a list</td></tr>
<tr><td>slow and fast pointers</td><td>middle node, cycle detection, palindrome</td></tr>
<tr><td>dummy head node</td><td>merge two lists, delete a node, anything where the first node may change</td></tr>
<tr><td>two pointers with a gap of n</td><td>the nth node from the end</td></tr></tbody></table>
<p><b>Stack</b> (last in, first out). Use it when the newest item must be handled first: matching brackets, undo, "next greater element", depth-first search.</p>
<p><b>Queue</b> (first in, first out). Use it when items must be handled in arrival order: breadth-first search, level-by-level tree printing, job processing.</p>
<p>In C# these are <code>LinkedList&lt;T&gt;</code>, <code>Stack&lt;T&gt;</code> and <code>Queue&lt;T&gt;</code>. In an interview you usually get your own small <code>ListNode</code> class with <code>val</code> and <code>next</code>. Before you write any pointer code, draw 3 boxes and the arrows between them. Most mistakes are an arrow overwritten before it was saved.</p>`,
    clues: [
      '"reverse the list", "in place", "O(1) extra space" → the prev / current / next walk',
      '"middle", "cycle", "loop", "kth from the end" → slow and fast pointers',
      '"merge sorted lists", "remove a node", "the head might change" → a dummy head node',
      '"balanced", "matching", "nested", "undo", "most recent" → a stack',
      '"next greater", "next warmer day", "span" → a monotonic stack, O(n)',
      '"in the order they arrived", "level by level", "fewest steps" → a queue',
      '"build a queue from stacks" → two stacks, pour only when the out stack is empty'
    ],
    code: [`
static ListNode Reverse(ListNode head)
{
    ListNode prev = null;
    while (head != null)
    {
        ListNode next = head.next;   // save the rest of the chain
        head.next = prev;            // turn this arrow around
        prev = head;                 // move both pointers one step
        head = next;
    }
    return prev;
}

static bool HasCycle(ListNode head)
{
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null)
    {
        slow = slow.next;
        fast = fast.next.next;
        if (slow == fast) return true;   // the fast pointer caught up: there is a loop
    }
    return false;
}`, `
static bool IsBalanced(string s)
{
    var open = new Stack<char>();
    foreach (char c in s)
    {
        if (c == '(' || c == '[' || c == '{') { open.Push(c); continue; }
        if (open.Count == 0) return false;
        char top = open.Pop();
        if ((c == ')' && top != '(') || (c == ']' && top != '[') || (c == '}' && top != '{')) return false;
    }
    return open.Count == 0;
}`],
    codeTitle: ['Two linked list patterns', 'The stack pattern: balanced brackets'],
    viz: {
      title: 'Reverse a linked list, one arrow at a time',
      input: '1 2 3 4 5',
      inputLabel: 'List values (space separated, up to 8)',
      gen: function (input) {
        var a = String(input).trim().split(/[\s,]+/).filter(Boolean).map(Number);
        if (!a.length || a.some(isNaN)) throw new Error('Enter numbers separated by spaces, for example 1 2 3 4 5');
        if (a.length > 8) throw new Error('Use at most 8 values');
        var n = a.length, next = [], frames = [], i;
        for (i = 0; i < n; i++) next.push(i + 1 < n ? i + 1 : -1);
        var code = 'ListNode prev = null;\nwhile (head != null) {\n    ListNode next = head.next;\n    head.next = prev;\n    prev = head;\n    head = next;\n}\nreturn prev;';
        function show(narr, prev, head, line, cls) {
          var ptr = {}, hl = {}, lines = {};
          if (prev >= 0) { ptr[prev] = 'prev'; hl[prev] = 'ok'; }
          if (head >= 0 && head < n) { ptr[head] = 'head'; hl[head] = 'cur'; }
          lines[line] = cls || 'cur';
          frames.push({ narr: narr, parts: [
            { type: 'list', label: 'The list (arrows show next)', values: a.slice(), next: next.slice(), ptr: ptr, hl: hl },
            { type: 'vars', vals: { prev: prev >= 0 ? a[prev] : 'null', head: head < n ? a[head] : 'null' } },
            { type: 'code', label: 'Line running', lang: 'csharp', code: code, hl: lines }
          ] });
        }
        show('Start. <b>prev</b> is null (nothing is reversed yet) and <b>head</b> is the first node.', -1, 0, 1);
        for (i = 0; i < n; i++) {
          show('Save the node after <b>' + a[i] + '</b> so the rest of the chain is not lost.', i - 1, i, 3);
          next[i] = i - 1;
          show('Turn the arrow of <b>' + a[i] + '</b> around: it now points to ' + (i > 0 ? '<b>' + a[i - 1] + '</b>' : '<b>null</b>, so it will be the last node') + '. Then move prev and head one step.', i, i + 1, 4, 'ok');
        }
        show('head is null, so the loop ends. <b>prev</b> (' + a[n - 1] + ') is the new first node. One pass: O(n) time, O(1) extra space.', n - 1, n, 8, 'sel');
        return frames;
      }
    },
    examples: [
      { title: 'Middle of a list with slow and fast pointers', html: `<p>List: 1 → 2 → 3 → 4 → 5. Slow moves 1 step, fast moves 2.</p>
<table><thead><tr><th>Step</th><th>slow</th><th>fast</th></tr></thead><tbody><tr><td>start</td><td>1</td><td>1</td></tr><tr><td>1</td><td>2</td><td>3</td></tr><tr><td>2</td><td><span class="c-g">3</span></td><td>5 (no node after it, stop)</td></tr></tbody></table>
<p>Slow is on 3, the middle. No counting pass was needed.</p>` },
      { title: 'Balanced brackets with a stack', html: `<p>Input <code>{[()]}</code>. Push openers, pop on closers.</p>
<table><thead><tr><th>Char</th><th>Action</th><th>Stack after</th></tr></thead><tbody><tr><td>{</td><td>push</td><td>{</td></tr><tr><td>[</td><td>push</td><td>{ [</td></tr><tr><td>(</td><td>push</td><td>{ [ (</td></tr><tr><td>)</td><td>pop (, it matches</td><td>{ [</td></tr><tr><td>]</td><td>pop [, it matches</td><td>{</td></tr><tr><td>}</td><td>pop {, it matches</td><td>empty</td></tr></tbody></table>
<p>The stack is empty at the end, so the string is <span class="c-g">balanced</span>.</p>` },
      { title: 'A queue made from two stacks', html: `<p>Enqueue 1, 2, 3, then dequeue twice, enqueue 4, dequeue.</p>
<table><thead><tr><th>Operation</th><th>in stack</th><th>out stack</th><th>Returned</th></tr></thead><tbody><tr><td>enqueue 1, 2, 3</td><td>1 2 3</td><td>empty</td><td></td></tr><tr><td>dequeue (out is empty: pour)</td><td>empty</td><td>3 2</td><td>1</td></tr><tr><td>dequeue</td><td>empty</td><td>3</td><td>2</td></tr><tr><td>enqueue 4</td><td>4</td><td>3</td><td></td></tr><tr><td>dequeue (out is not empty: no pour)</td><td>4</td><td>empty</td><td>3</td></tr></tbody></table>
<p>The order out is 1, 2, 3: first in, first out.</p>`, code: `
class TwoStackQueue<T>
{
    private readonly Stack<T> _in = new Stack<T>(), _out = new Stack<T>();
    public void Enqueue(T x) { _in.Push(x); }
    public T Dequeue()
    {
        if (_out.Count == 0)
            while (_in.Count > 0) _out.Push(_in.Pop());
        if (_out.Count == 0) throw new InvalidOperationException("Queue is empty");
        return _out.Pop();
    }
}` }
    ],
    deepDive: `<p><b>Why arrays usually beat linked lists in real code.</b> A <code>List&lt;T&gt;</code> keeps its items side by side in memory, so the processor loads many of them at once. Linked list nodes are separate objects spread over the heap. Walking them is slow, and each node costs extra memory for its links and object header. That is why <code>LinkedList&lt;T&gt;</code> is rare in .NET services. It earns its place when you hold a node and need O(1) removal or move-to-front, as in an LRU cache.</p>
<p><b>How the built-in types work.</b> <code>Stack&lt;T&gt;</code> is an array plus a count. <code>Queue&lt;T&gt;</code> is a circular buffer: an array with a head and a tail index that wrap around, so nothing is shifted on dequeue. Both double their array when full, which makes one add occasionally O(n) but O(1) on average.</p>
<p><b>Cycle start.</b> After slow and fast meet, move one pointer back to the head and advance both 1 step at a time. They meet at the first node of the cycle. The distance from the head to the cycle start equals the distance from the meeting point to the cycle start, going forward.</p>
<p><b>Recursion on lists.</b> A recursive reverse reads nicely but uses O(n) stack. A list of 100,000 nodes can end the process with a stack overflow, so prefer the loop.</p>
<p><b>Threads.</b> None of these collections are safe for concurrent writes. Use <code>ConcurrentQueue&lt;T&gt;</code>, <code>ConcurrentStack&lt;T&gt;</code> or <code>Channel&lt;T&gt;</code> for producer and consumer work.</p>`,
    aiEra: `<p><b>What AI changes:</b> an assistant will write "reverse a linked list" correctly in a second, so interviewers care less about recall and more about whether you can explain each pointer move and catch a wrong one.</p>
<p><b>Use AI as a partner:</b> ask <code>Give me 6 edge-case inputs for merging two sorted linked lists. Do not solve it.</code> Then trace your own code on them by hand.</p>
<p><b>Where AI goes wrong:</b> it compares node values when it should compare node references in cycle detection, forgets the final "stack must be empty" check for brackets, and sometimes mixes modern C# syntax with an old compiler target.</p>
<p><b>What you must still own:</b> drawing the boxes and arrows, choosing stack or queue from the wording, and stating time and space cost without help.</p>`,
    problems: [{
      title: 'Palindrome Linked List', level: 'Easy', tags: ['linked list', 'two pointers'], companies: ['Microsoft', 'Amazon'],
      statement: `<p>Given the head of a singly linked list, return <code>true</code> if the values read the same forwards and backwards. Try to use O(1) extra space.</p>`,
      constraints: `0 ≤ number of nodes ≤ 10<sup>5</sup>, 0 ≤ val ≤ 9`,
      example: `<p>Input: <code>1 → 2 → 2 → 1</code>. Output: <span class="c-g"><b>true</b></span>, because backwards it is also 1, 2, 2, 1.</p><p>Input: <code>1 → 2 → 3</code>. Output: <span class="c-r"><b>false</b></span>, because the first value 1 does not equal the last value 3.</p>`,
      brute: { why: `<p>Copy every value into a <code>List&lt;int&gt;</code>, then compare from both ends. It is correct and O(n) time, but it uses O(n) extra memory for the copy, which is what the interviewer asks you to remove.</p>`, code: `
class Brute
{
    public bool IsPalindrome(ListNode head)
    {
        var vals = new List<int>();
        for (ListNode n = head; n != null; n = n.next) vals.Add(n.val);
        for (int i = 0, j = vals.Count - 1; i < j; i++, j--)
            if (vals[i] != vals[j]) return false;
        return true;
    }
}` },
      mcq: { q: 'You cannot walk a singly linked list backwards. How can you still compare the back half with the front half?', options: ['Reverse the second half in place, then walk both halves forward', 'Sort the list first', 'Use binary search on the list', 'It cannot be done without copying'], answer: 0, explain: 'Once the back half is reversed, its first node is the old last node, so two forward walks compare the list from both ends.' },
      hints: [`<p>You already know two tools: find the middle with slow and fast pointers, and reverse a list in place.</p>`, `<p>Reverse the part from the middle to the end. Then compare it, node by node, with the part that starts at the head.</p>`, `<p>Recipe: find the middle, reverse from there, walk both until the reversed half ends, then reverse it back so the caller's list is unchanged. An empty list and a single node are palindromes.</p>`],
      solution: {
        approach: `<p>Find the middle with slow and fast pointers. Reverse the list from the middle onward. Now compare the front half (from <code>head</code>) with the reversed back half, one node at a time, stopping when the back half runs out. Last, reverse the back half again so the list looks as it did before the call. For an odd length, the middle node ends up at the end of the reversed half and is compared with itself, which is harmless.</p>`,
        code: `
class Solution
{
    public bool IsPalindrome(ListNode head)
    {
        ListNode slow = head, fast = head;
        while (fast != null && fast.next != null) { slow = slow.next; fast = fast.next.next; }

        ListNode second = Reverse(slow);            // reverse the back half
        ListNode a = head, b = second;
        bool same = true;
        while (b != null)
        {
            if (a.val != b.val) { same = false; break; }
            a = a.next; b = b.next;
        }
        Reverse(second);                            // put the list back as it was
        return same;
    }

    private ListNode Reverse(ListNode head)
    {
        ListNode prev = null;
        while (head != null) { ListNode next = head.next; head.next = prev; prev = head; head = next; }
        return prev;
    }
}`,
        dry: { head: ['Step', 'What happens', 'State'], rows: [
          ['1', 'Find the middle of 1 → 2 → 2 → 1', 'slow is on the second 2'],
          ['2', 'Reverse from slow', 'back half is 1 → 2, front is 1 → 2 → …'],
          ['3', 'Compare 1 with 1', 'equal'],
          ['4', 'Compare 2 with 2', 'equal, back half ends'],
          ['5', 'Reverse the back half again', '<span class="c-g">return true</span>']
        ] },
        complexity: `<p>Time O(n): one pass to find the middle, one to reverse, one to compare, one to restore. Space O(1).</p>`,
        followUps: ['Is it acceptable to change the list during the call if another thread may read it?', 'Solve it with recursion and say what the space cost is.']
      }
    }]
  });
  /* ===================== TOPIC 2: trees and graphs ===================== */
  topics.push({
    title: 'Trees and Graphs: DFS, BFS and Ordering',
    analogy: `<p>A <b>tree</b> is a company chart: one person at the top, and every other person has exactly one manager. A <b>graph</b> is a road map: towns joined by roads, with many ways to get from one town to another and roads that can bring you back to where you started. Depth-first search is exploring one road to its very end before trying the next. Breadth-first search is visiting every town 1 road away, then every town 2 roads away.</p>`,
    explain: `<p>A <b>binary tree</b> node has a value, a <code>left</code> child and a <code>right</code> child. A <b>binary search tree</b> (BST) adds one rule: everything in the left subtree is smaller than the node, everything in the right subtree is larger. A <b>graph</b> has nodes and edges and is usually stored as an adjacency list: for each node, the list of its neighbours.</p>
<p>Nearly every tree question is one of two walks:</p>
<table><thead><tr><th></th><th>Depth-first (DFS)</th><th>Breadth-first (BFS)</th></tr></thead><tbody>
<tr><td>Tool</td><td>recursion (or your own stack)</td><td>a queue</td></tr>
<tr><td>Order</td><td>down one branch, then back up</td><td>level by level</td></tr>
<tr><td>Tree questions</td><td>height, diameter, is it a BST, lowest common ancestor, path sums</td><td>level order, right-side view, minimum depth</td></tr>
<tr><td>Graph questions</td><td>connected parts, cycles, ordering with prerequisites</td><td>fewest steps, spreading over time</td></tr></tbody></table>
<p><b>The recursive recipe for trees:</b> ask "what do I need from my left child and my right child, and what do I hand to my parent?". For height: each child returns its height, you return 1 plus the larger.</p>
<p><b>The one extra rule for graphs:</b> keep a visited set. A tree cannot loop, a graph can, and without the set your code runs forever.</p>
<p><b>Ordering with prerequisites</b> (topological sort): repeatedly take a node that has no remaining prerequisites. If nodes are left over, they form a cycle.</p>`,
    clues: [
      '"level by level", "fewest moves", "shortest path" with equal step cost → BFS with a queue',
      '"height", "depth", "diameter", "path sum", "is it a valid BST" → DFS, return a value from each subtree',
      '"lowest common ancestor" → search both sides, the node where the two finds meet',
      '"grid of land and water", "islands", "regions", "flood" → a grid is a graph, DFS or BFS from each unvisited cell',
      '"prerequisites", "build order", "depends on" → topological sort, and a cycle means impossible',
      '"is there a cycle" in a directed graph → DFS with 3 states (new, in progress, done)',
      '"sorted output from a BST", "kth smallest in a BST" → in-order traversal'
    ],
    code: [`
// Level order (BFS): returns one list per level.
static List<List<int>> LevelOrder(TreeNode root)
{
    var res = new List<List<int>>();
    if (root == null) return res;
    var q = new Queue<TreeNode>();
    q.Enqueue(root);
    while (q.Count > 0)
    {
        var level = new List<int>();
        for (int i = q.Count; i > 0; i--)        // only the nodes already waiting belong to this level
        {
            TreeNode n = q.Dequeue();
            level.Add(n.val);
            if (n.left != null) q.Enqueue(n.left);
            if (n.right != null) q.Enqueue(n.right);
        }
        res.Add(level);
    }
    return res;
}

// Height (DFS): 1 + the taller child.
static int Height(TreeNode n)
{
    return n == null ? 0 : 1 + Math.Max(Height(n.left), Height(n.right));
}`],
    codeTitle: ['BFS and DFS on a binary tree'],
    viz: {
      title: 'Level order: BFS with a queue',
      input: '1 2 3 4 5 null 6',
      inputLabel: 'Tree in level order (use null for a missing child, up to 15 slots)',
      gen: function (input) {
        var raw = String(input).trim().split(/[\s,]+/).filter(Boolean);
        if (!raw.length || raw.length > 15) throw new Error('Enter 1 to 15 values, for example 1 2 3 4 5 null 6');
        var arr = raw.map(function (t) { return /^null$/i.test(t) ? null : Number(t); });
        if (arr[0] === null || arr.some(function (v) { return v !== null && isNaN(v); })) throw new Error('Use numbers, with null for a missing child. The root cannot be null');
        for (var k = 1; k < arr.length; k++) if (arr[k] !== null && arr[(k - 1) >> 1] === null) throw new Error('Slot ' + k + ' has a value but its parent is null');
        var frames = [], q = [0], state = {}, levels = [], depth = 0;
        function snap(narr) {
          var hl = {}, i;
          for (i in state) hl[i] = state[i];
          frames.push({ narr: narr, parts: [
            { type: 'tree', label: 'Tree', arr: arr.slice(), hl: hl },
            { type: 'queue', label: 'Queue (front on the left)', items: q.map(function (i) { return arr[i]; }) },
            { type: 'text', html: '<b>Levels so far:</b> ' + (levels.length ? levels.map(function (l) { return '[' + l.join(', ') + ']'; }).join(' ') : 'none yet') }
          ] });
        }
        state[0] = 'win';
        snap('Start: put the root <b>' + arr[0] + '</b> in the queue.');
        while (q.length) {
          var size = q.length, level = [];
          levels.push(level);
          for (var s = 0; s < size; s++) {
            var i = q.shift(), added = [];
            level.push(arr[i]);
            state[i] = 'cur';
            [2 * i + 1, 2 * i + 2].forEach(function (c) { if (c < arr.length && arr[c] !== null) { q.push(c); state[c] = 'win'; added.push(arr[c]); } });
            snap('Level ' + depth + ': take <b>' + arr[i] + '</b> from the front and record it. ' + (added.length ? 'Its children ' + added.join(' and ') + ' join the back of the queue.' : 'It has no children.'));
            state[i] = 'done';
          }
          depth++;
        }
        snap('The queue is empty, so every node was visited once. Result: <b>' + levels.map(function (l) { return '[' + l.join(', ') + ']'; }).join(' ') + '</b>. Time O(n).');
        return frames;
      }
    },
    examples: [
      { title: 'Why "left &lt; node &lt; right" is not enough for a BST', html: `<p>Root 5, left child 3, and 3 has a right child 8.</p>
<ul><li>Parent and child check: 3 &lt; 5 passes, 8 &gt; 3 passes. It looks fine.</li><li>But 8 sits in the <b>left</b> subtree of 5, and 8 &gt; 5. <span class="c-r">Not a BST.</span></li></ul>
<p>With ranges: node 8 must lie between 3 and 5 (above its parent 3, below the root 5). It does not, so the check fails as it should.</p>` },
      { title: 'Topological sort of 4 tasks', html: `<p>Edges: 0 → 1, 0 → 2, 1 → 3, 2 → 3 (an arrow means "must come before").</p>
<table><thead><tr><th>Step</th><th>Open prerequisites of 0, 1, 2, 3</th><th>Ready queue</th><th>Order so far</th></tr></thead><tbody><tr><td>start</td><td>0, 1, 1, 2</td><td>0</td><td></td></tr><tr><td>take 0</td><td>0, 0, 0, 2</td><td>1, 2</td><td>0</td></tr><tr><td>take 1</td><td>0, 0, 0, 1</td><td>2</td><td>0, 1</td></tr><tr><td>take 2</td><td>0, 0, 0, 0</td><td>3</td><td>0, 1, 2</td></tr><tr><td>take 3</td><td>all 0</td><td>empty</td><td><span class="c-g">0, 1, 2, 3</span></td></tr></tbody></table>
<p>All 4 tasks were output, so there is no cycle.</p>` },
      { title: 'Counting islands in a grid', html: `<p>Grid (1 is land):</p><pre>1 1 0 0
1 0 0 1
0 0 1 1</pre>
<p>Scan row by row. Cell (0,0) is land: count = 1, and the flood fill sinks (0,0), (0,1) and (1,0). The next land found is (1,3): count = 2, and the fill sinks (1,3), (2,3) and (2,2). No land is left. Answer: <b>2</b>. Every cell is looked at a fixed number of times, so the cost is O(rows × columns).</p>` }
    ],
    deepDive: `<p><b>Stack depth is the real risk.</b> Recursive DFS uses one stack frame per level. A balanced tree with a million nodes is only about 20 levels deep, but a tree shaped like a linked list is a million deep and will crash a .NET process with a stack overflow that you cannot catch. For input you do not control, use an explicit <code>Stack&lt;T&gt;</code> or BFS.</p>
<p><b>BFS gives shortest paths only when every edge costs the same.</b> With different edge weights you need Dijkstra's algorithm, which is BFS with a priority queue: O((V + E) log V). With negative weights you need Bellman-Ford.</p>
<p><b>Adjacency list or matrix.</b> A list costs O(V + E) memory and suits sparse graphs, which is nearly all real ones. A matrix costs O(V<sup>2</sup>) but answers "is there an edge from a to b" in O(1).</p>
<p><b>Balanced trees in .NET.</b> <code>SortedSet&lt;T&gt;</code> and <code>SortedDictionary&lt;K,V&gt;</code> are red-black trees, which keep the height near log n by rotating nodes on insert and delete. A plain BST fed sorted input turns into a list and every operation becomes O(n).</p>
<p><b>Where this shows up at work.</b> Build systems and package managers run a topological sort. Database indexes are B-trees, a wide cousin of the BST. A dependency injection container detects circular dependencies with the same 3-state DFS.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants produce textbook BFS and DFS reliably. The interview value has moved to choosing the right walk from the wording and to explaining what each recursive call returns.</p>
<p><b>Use AI as a partner:</b> paste your solution and ask <code>Which tree shapes would break this? List them, do not fix the code.</code> Skewed trees, a single node and duplicate values are the usual finds.</p>
<p><b>Where AI goes wrong:</b> it validates a BST by comparing only parent and child, marks nodes as visited when they leave the queue (so they are queued many times), and uses one visited flag for cycle detection in a directed graph.</p>
<p><b>What you must still own:</b> the visited set, the meaning of the return value of each recursive call, and the cost in terms of nodes and edges.</p>`,
    problems: [{
      title: 'Diameter of a Binary Tree', level: 'Easy', tags: ['tree', 'dfs'], companies: ['Meta', 'Amazon'],
      statement: `<p>The diameter of a binary tree is the number of <b>edges</b> on the longest path between any two nodes. The path does not have to pass through the root. Return the diameter.</p>`,
      constraints: `1 ≤ number of nodes ≤ 10<sup>4</sup>`,
      example: `<p>Tree: root 1 with children 2 and 3, and node 2 has children 4 and 5.</p><p>Output: <span class="c-g"><b>3</b></span>. The longest path is 4 → 2 → 1 → 3 (or 5 → 2 → 1 → 3), which has 3 edges.</p>`,
      brute: { why: `<p>At every node, compute the height of its left and right subtrees and add them. Then do the same for each child. The answer is right, but <code>Height</code> walks a whole subtree each time it is called, so a tree shaped like a chain costs O(n<sup>2</sup>).</p>`, code: `
class Brute
{
    public int DiameterOfBinaryTree(TreeNode root)
    {
        if (root == null) return 0;
        int through = Height(root.left) + Height(root.right);       // longest path that bends at this node
        return Math.Max(through, Math.Max(DiameterOfBinaryTree(root.left), DiameterOfBinaryTree(root.right)));
    }

    private int Height(TreeNode n)
    {
        return n == null ? 0 : 1 + Math.Max(Height(n.left), Height(n.right));
    }
}` },
      mcq: { q: 'The longest path that bends at a node uses…', options: ['the height of its left subtree plus the height of its right subtree', 'only the taller subtree', 'the number of nodes in the tree', 'the depth of the node'], answer: 0, explain: 'Such a path goes down the deepest route on the left and the deepest route on the right, so its edge count is left height + right height.' },
      hints: [`<p>The height function already visits every node. Could it also do the diameter work while it is there?</p>`, `<p>Let one DFS return the height of a subtree, and update a "best so far" field with left height + right height at every node.</p>`, `<p>Recipe: <code>Depth(n)</code>: if null return 0. Get left and right depth. best = max(best, left + right). Return 1 + max(left, right). The answer is best. A single node gives 0.</p>`],
      solution: {
        approach: `<p>Do one post-order DFS. Each call returns the height of its subtree (counted in nodes), and before returning it checks whether the path that bends at this node, left height + right height, beats the best seen so far. Every node is visited once, so the height work is never repeated.</p>`,
        code: `
class Solution
{
    private int _best;

    public int DiameterOfBinaryTree(TreeNode root)
    {
        _best = 0;
        Depth(root);
        return _best;
    }

    private int Depth(TreeNode n)
    {
        if (n == null) return 0;
        int left = Depth(n.left), right = Depth(n.right);
        _best = Math.Max(_best, left + right);      // edges on the path that bends here
        return 1 + Math.Max(left, right);           // height handed to the parent
    }
}`,
        dry: { head: ['Node', 'left depth', 'right depth', 'left + right', 'best', 'returns'], rows: [
          ['4', '0', '0', '0', '0', '1'],
          ['5', '0', '0', '0', '0', '1'],
          ['2', '1', '1', '2', '2', '2'],
          ['3', '0', '0', '0', '2', '1'],
          ['1', '2', '1', '3', '<span class="c-g">3</span>', '3']
        ] },
        complexity: `<p>Time O(n), each node once. Space O(h) for the recursion, h being the height of the tree.</p>`,
        followUps: ['Return the nodes on the longest path.', 'What changes if edges have weights?']
      }
    }]
  });
  /* ===================== TOPIC 3: hash maps and designed structures ===================== */
  topics.push({
    title: 'Hash Maps and Designed Structures: LRU Cache, Heap, Trie, Union-Find',
    analogy: `<p>Think of a small desk with room for only 3 open books. When you need a 4th, you put away the book you have not touched for the longest time. That is an <b>LRU cache</b>. A <b>heap</b> is a hospital waiting room where the most urgent patient is always called next. A <b>trie</b> is a paper dictionary's thumb index: all words starting with "ca" live in the same place. <b>Union-Find</b> is a set of friend groups: when two people become friends, their whole groups merge.</p>`,
    explain: `<p>"Design" questions in a coding round ask you to combine simple structures so that every operation is fast. The skill is knowing which structure gives which operation in O(1) or O(log n).</p>
<table><thead><tr><th>Structure</th><th>Fast at</th><th>Built from</th><th>Classic question</th></tr></thead><tbody>
<tr><td>Hash map</td><td>find by key, O(1) on average</td><td>array of buckets + hash function</td><td>two sum, counting, grouping</td></tr>
<tr><td>LRU cache</td><td>get, put and evict the oldest, all O(1)</td><td>hash map + doubly linked list</td><td>"design a cache with a size limit"</td></tr>
<tr><td>Heap (priority queue)</td><td>smallest (or largest) item, O(log n)</td><td>an array read as a tree</td><td>top k, merge k lists, running median</td></tr>
<tr><td>Trie</td><td>all words with a prefix, O(length)</td><td>tree of letters</td><td>autocomplete, word search</td></tr>
<tr><td>Union-Find</td><td>"same group?" and "merge groups", almost O(1)</td><td>a parent array</td><td>connected components, redundant edge</td></tr></tbody></table>
<p><b>How the LRU cache fits together.</b> The map answers "where is key K?" by pointing at a list node. The list keeps nodes in order of last use, newest at the front. On a get: find the node through the map and move it to the front. On a put into a full cache: remove the node at the back, delete its key from the map, then add the new node at the front. The node must store its key, or you could not delete it from the map when it is evicted.</p>
<p><b>Top k with a heap.</b> Keep a min-heap of only k items. When a (k + 1)th arrives, remove the smallest. What is left at the end are the k largest, in O(n log k).</p>`,
    clues: [
      '"O(1) get and put", "evict the least recently used", "fixed capacity" → hash map + doubly linked list',
      '"top k", "k largest", "k most frequent", "kth largest" → a heap of size k',
      '"merge k sorted", "always take the smallest next" → a min-heap',
      '"starts with", "prefix", "autocomplete", "dictionary of words" → a trie',
      '"connected components", "are these two connected", "redundant connection", "accounts to merge" → Union-Find',
      '"count occurrences", "seen before", "group by" → a Dictionary or HashSet',
      '"median of a stream" → two heaps, one for each half'
    ],
    code: [`
class UnionFind
{
    private readonly int[] _parent, _rank;
    public int Components { get; private set; }

    public UnionFind(int n)
    {
        _parent = new int[n]; _rank = new int[n]; Components = n;
        for (int i = 0; i < n; i++) _parent[i] = i;          // each item is its own group
    }

    public int Find(int x)
    {
        if (_parent[x] != x) _parent[x] = Find(_parent[x]);  // path compression
        return _parent[x];
    }

    public bool Union(int a, int b)
    {
        int ra = Find(a), rb = Find(b);
        if (ra == rb) return false;                          // already in one group
        if (_rank[ra] < _rank[rb]) { int t = ra; ra = rb; rb = t; }
        _parent[rb] = ra;                                    // shorter tree goes under the taller one
        if (_rank[ra] == _rank[rb]) _rank[ra]++;
        Components--;
        return true;
    }
}`],
    codeTitle: ['Union-Find with path compression and union by rank'],
    viz: {
      title: 'LRU cache: the map finds, the list orders',
      input: 'capacity 2: put A, put B, get A, put C, get B, put D, get A',
      inputLabel: 'capacity N: then put K or get K, comma separated',
      gen: function (input) {
        var m = /^\s*capacity\s+(\d+)\s*:(.*)$/i.exec(String(input));
        if (!m) throw new Error('Format: capacity 2: put A, put B, get A');
        var cap = Number(m[1]);
        if (cap < 1 || cap > 5) throw new Error('Capacity must be 1 to 5');
        var ops = m[2].split(',').map(function (s) { return s.trim(); }).filter(Boolean).map(function (s) {
          var p = /^(put|get)\s+(\w+)$/i.exec(s);
          if (!p) throw new Error('Each step must look like "put A" or "get A", got "' + s + '"');
          return [p[1].toLowerCase(), p[2]];
        });
        if (ops.length < 1 || ops.length > 14) throw new Error('Use 1 to 14 steps');
        var order = [], frames = [], hits = 0, misses = 0;
        function snap(narr, hl, evicted) {
          var parts = [
            { type: 'array', label: 'Linked list: most recently used on the left, next to evict on the right', values: order.length ? order.slice() : ['empty'], hl: order.length ? hl : {} },
            { type: 'set', label: 'Dictionary keys (each points to its list node)', items: order.slice().sort() },
            { type: 'vars', vals: { capacity: cap, size: order.length, hits: hits, misses: misses, evicted: evicted || 'none' }, hl: evicted ? { evicted: 'bad' } : {} }
          ];
          frames.push({ narr: narr, parts: parts });
        }
        snap('An empty cache with room for <b>' + cap + '</b> item' + (cap > 1 ? 's' : '') + '.', {});
        ops.forEach(function (op) {
          var k = op[1], at = order.indexOf(k);
          if (op[0] === 'get') {
            if (at < 0) { misses++; snap('<b>get ' + k + '</b>: the dictionary has no such key. <span class="c-r">Miss.</span> Nothing moves.', {}); return; }
            order.splice(at, 1); order.unshift(k); hits++;
            snap('<b>get ' + k + '</b>: found through the dictionary in O(1). <span class="c-g">Hit.</span> Its node moves to the front because it was just used.', { 0: 'ok' });
            return;
          }
          if (at >= 0) {
            order.splice(at, 1); order.unshift(k);
            snap('<b>put ' + k + '</b>: the key exists, so its value is replaced and the node moves to the front.', { 0: 'ok' });
            return;
          }
          var out = null;
          if (order.length === cap) out = order.pop();
          order.unshift(k);
          snap('<b>put ' + k + '</b>: ' + (out !== null ? 'the cache is full, so the node at the back (<span class="c-r">' + out + '</span>, least recently used) is removed from the list and the dictionary. Then ' : '') + k + ' is added at the front.', { 0: 'ok' }, out);
        });
        snap('Done. Every step was a dictionary lookup plus a few link changes: <b>O(1)</b> per get and put. Hits: ' + hits + ', misses: ' + misses + '.', {});
        return frames;
      }
    },
    examples: [
      { title: 'Top 2 most frequent with a heap of size 2', html: `<p>Input <code>[1, 1, 1, 2, 2, 3]</code>, k = 2. Counts: 1 → 3, 2 → 2, 3 → 1.</p>
<table><thead><tr><th>Add (number, count)</th><th>Heap after, smallest count first</th><th>Action</th></tr></thead><tbody><tr><td>(1, 3)</td><td>(1, 3)</td><td></td></tr><tr><td>(2, 2)</td><td>(2, 2) (1, 3)</td><td></td></tr><tr><td>(3, 1)</td><td>(3, 1) (2, 2) (1, 3)</td><td>size 3 &gt; k, remove the smallest, (3, 1)</td></tr></tbody></table>
<p>The heap now holds <span class="c-g">1 and 2</span>, the top 2.</p>` },
      { title: 'A trie holding "car", "card" and "cat"', html: `<p>All 3 words share the path c → a. After "a" the path splits into "r" and "t". The node for "r" has its end-of-word flag set (for "car") and one child "d" (for "card").</p>
<ul><li><code>Search("car")</code>: walk c, a, r. The flag is set: <span class="c-g">true</span>.</li><li><code>Search("ca")</code>: walk c, a. The node exists but its flag is not set: <span class="c-r">false</span>.</li><li><code>StartsWith("ca")</code>: the node exists: <span class="c-g">true</span>.</li></ul>
<p>Each call costs the length of the word, however many words are stored.</p>` },
      { title: 'Union-Find counting groups', html: `<p>5 people, numbered 0 to 4. Friendships: (0,1), (1,2), (3,4), (0,2).</p>
<table><thead><tr><th>Union</th><th>Result</th><th>Groups left</th></tr></thead><tbody><tr><td>start</td><td>everyone alone</td><td>5</td></tr><tr><td>(0,1)</td><td>merged</td><td>4</td></tr><tr><td>(1,2)</td><td>merged</td><td>3</td></tr><tr><td>(3,4)</td><td>merged</td><td>2</td></tr><tr><td>(0,2)</td><td><span class="c-y">already together</span>, returns false</td><td>2</td></tr></tbody></table>
<p>There are <b>2</b> groups. The last pair was already connected, which is how Union-Find spots a redundant edge.</p>`, code: `
static int CountGroups(int n, int[][] pairs)
{
    var parent = new int[n];
    for (int i = 0; i < n; i++) parent[i] = i;
    int groups = n;
    foreach (int[] p in pairs)
    {
        int a = p[0], b = p[1];
        while (parent[a] != a) a = parent[a];     // walk up to the root of a
        while (parent[b] != b) b = parent[b];     // walk up to the root of b
        if (a != b) { parent[a] = b; groups--; }
    }
    return groups;
}` }
    ],
    deepDive: `<p><b>Hash map internals in .NET.</b> <code>Dictionary&lt;K,V&gt;</code> keeps an array of buckets and an array of entries. A bucket holds the index of its first entry, and entries that collide are chained by index, not by separate node objects, which keeps memory compact. When the entries are full it grows to a larger prime size and re-places everything. String hash codes are randomised per process, so never store them or rely on them across runs.</p>
<p><b>A heap is just an array.</b> For a binary heap, the children of index i are 2i + 1 and 2i + 2. Insert adds at the end and "sifts up", remove takes the root, moves the last item to the top and "sifts down". Both are O(log n). Building a heap from n items at once is O(n). .NET's <code>PriorityQueue</code> uses a 4-way heap, has no "decrease priority" operation and is not stable for equal priorities.</p>
<p><b>Trie memory.</b> A dictionary per node is flexible but heavy. A 26-slot array is fast for lowercase letters. Production systems use compressed tries (radix trees), which merge chains of single children. ASP.NET Core routing matches URL paths with a similar tree of segments.</p>
<p><b>Union-Find limits.</b> It can only merge, never split. If edges can be removed, you need a different approach, such as processing the operations in reverse.</p>
<p><b>LRU in production.</b> A real cache also needs expiry, a memory limit, thread safety and protection against many callers rebuilding the same missing value at once. That is why you use <code>IMemoryCache</code> or <code>HybridCache</code> and keep the hand-written version for the whiteboard.</p>`,
    aiEra: `<p><b>What AI changes:</b> an assistant can print a full LRU cache faster than you can type the class name. So the interview shifts to "why a doubly linked list?", "why does the node store the key?" and "what breaks with two threads?".</p>
<p><b>Use AI as a partner:</b> ask <code>Write 10 unit tests for an LRU cache, including capacity 1 and updating an existing key. No implementation.</code> Then make your own code pass them.</p>
<p><b>Where AI goes wrong:</b> it forgets to delete the evicted key from the dictionary (a memory leak), does not move a node to the front on a read, uses <code>PriorityQueue</code> as if it were a max-heap, and claims an unlocked cache is thread-safe.</p>
<p><b>What you must still own:</b> the reason behind each structure, the cost of each operation, and the judgement to use the framework cache in real code.</p>`
  });
  /* ===================== TOPIC 4: recursion, backtracking and dynamic programming ===================== */
  topics.push({
    title: 'Recursion, Backtracking and Dynamic Programming',
    analogy: `<p><b>Recursion</b> is a set of nested boxes: to open the big box you open the smaller box inside it, until you reach a box that is simply empty. <b>Backtracking</b> is walking a maze: take a turn, and if it is a dead end, walk back to the last junction and try the other way. <b>Dynamic programming</b> is keeping a notebook: once you have worked out an answer, you write it down and never work it out again.</p>`,
    explain: `<p>These three ideas are one family. Each solves a big problem through smaller copies of itself.</p>
<table><thead><tr><th>Idea</th><th>Use it when</th><th>Typical cost</th></tr></thead><tbody>
<tr><td>Recursion</td><td>the problem contains a smaller version of itself (trees, nested data, divide and conquer)</td><td>depends, plus stack space equal to the depth</td></tr>
<tr><td>Backtracking</td><td>you must list or search <b>all</b> valid combinations (subsets, permutations, board puzzles)</td><td>exponential: 2<sup>n</sup> or n!</td></tr>
<tr><td>Dynamic programming (DP)</td><td>you need a <b>count</b> or a <b>best value</b>, and the same subproblem comes up many times</td><td>number of states × work per state</td></tr></tbody></table>
<p><b>Recursion</b> needs a base case and a step that shrinks the input.</p>
<p><b>Backtracking</b> is always the same 3 lines inside a loop: <b>choose</b> an option, <b>explore</b> with a recursive call, <b>un-choose</b> it. Skipping options that already break a rule is called pruning.</p>
<p><b>DP</b> in 5 spoken steps: say what one saved answer means (the <b>state</b>), how it is built from smaller ones (the <b>transition</b>), the smallest known answers (the <b>base case</b>), the fill <b>order</b>, and where the final <b>answer</b> sits. Write it top-down (recursion plus a cache, called memoisation) or bottom-up (loops filling a table, called tabulation).</p>
<p>The path most candidates should take in the room: write the plain recursion, notice the repeated calls, add a cache, then turn it into a table if asked.</p>`,
    clues: [
      '"all subsets", "all permutations", "all combinations", "generate every" → backtracking, and n is small (about 20 or less)',
      '"number of ways", "how many paths" → DP that adds',
      '"minimum cost", "fewest coins", "maximum profit", "longest" → DP that takes a min or max',
      '"can you reach", "is it possible to split" → DP over true and false',
      'two strings and the words "common", "edit", "match" → a 2D table of prefix against prefix',
      '"place n queens", "solve the board", "fill the grid so that" → backtracking with pruning',
      '"each item at most once" with a weight or sum limit → 0/1 knapsack',
      'n ≤ 1,000 with two inputs → an O(n × m) table is fine'
    ],
    code: [`
// Bottom-up DP: fewest coins for every amount from 0 to the target.
static int CoinChange(int[] coins, int amount)
{
    var dp = new int[amount + 1];                 // dp[a] = fewest coins that make a
    for (int a = 1; a <= amount; a++)
    {
        dp[a] = amount + 1;                       // stands for "not possible yet"
        foreach (int c in coins)
            if (c <= a) dp[a] = Math.Min(dp[a], dp[a - c] + 1);
    }
    return dp[amount] > amount ? -1 : dp[amount];
}`, `
// Backtracking: choose, explore, un-choose.
static void SubsetsFrom(int[] nums, int start, List<int> cur, List<List<int>> res)
{
    res.Add(new List<int>(cur));                  // record a copy of the current choice
    for (int i = start; i < nums.Length; i++)
    {
        cur.Add(nums[i]);                         // choose
        SubsetsFrom(nums, i + 1, cur, res);       // explore
        cur.RemoveAt(cur.Count - 1);              // un-choose
    }
}`],
    codeTitle: ['Dynamic programming: coin change', 'Backtracking: all subsets'],
    viz: {
      title: 'Coin change: filling the dp array',
      input: '1 3 4 | 6',
      inputLabel: 'coins | amount (amount up to 15)',
      gen: function (input) {
        var parts = String(input).split('|');
        if (parts.length !== 2) throw new Error('Format: coins | amount, for example 1 3 4 | 6');
        var coins = parts[0].trim().split(/[\s,]+/).filter(Boolean).map(Number), amount = Number(parts[1].trim());
        if (!coins.length || coins.length > 5 || coins.some(function (c) { return !(c >= 1) || c !== Math.floor(c); })) throw new Error('Use 1 to 5 coins, each a whole number of 1 or more');
        if (!(amount >= 1 && amount <= 15) || amount !== Math.floor(amount)) throw new Error('The amount must be a whole number from 1 to 15');
        var INF = amount + 1, dp = [0], frames = [], labels = [], a;
        for (a = 1; a <= amount; a++) dp.push(INF);
        for (a = 0; a <= amount; a++) labels.push(String(a));
        function vals() { return dp.map(function (v) { return v >= INF ? '∞' : v; }); }
        frames.push({ narr: 'dp[a] means: the fewest coins that make amount a. <b>dp[0] = 0</b> because amount 0 needs no coins. Everything else starts as "not possible yet".', parts: [
          { type: 'array', label: 'dp (index = amount)', values: vals(), hl: { 0: 'ok' }, idxLabels: labels, showIdx: true },
          { type: 'set', label: 'Coins', items: coins.slice() }
        ] });
        for (a = 1; a <= amount; a++) {
          var tries = [], best = INF, from = -1;
          coins.forEach(function (c) {
            if (c > a) { tries.push('coin ' + c + ' is too big'); return; }
            var v = dp[a - c] >= INF ? INF : dp[a - c] + 1;
            tries.push('coin ' + c + ': dp[' + (a - c) + '] + 1 = ' + (v >= INF ? '∞' : v));
            if (v < best) { best = v; from = a - c; }
          });
          dp[a] = best;
          var hl = {}; hl[a] = best >= INF ? 'bad' : 'ok'; if (from >= 0) hl[from] = 'win';
          var ptr = {}; ptr[a] = 'a';
          frames.push({ narr: 'Amount <b>' + a + '</b>. Try each coin as the last coin: ' + tries.join(', ') + '. ' + (best >= INF ? '<span class="c-r">No coin works, so it stays impossible.</span>' : 'The smallest is <b>' + best + '</b>.'), parts: [
            { type: 'array', label: 'dp (index = amount)', values: vals(), hl: hl, ptr: ptr, idxLabels: labels, showIdx: true },
            { type: 'vars', vals: { amount: a, 'dp[a]': best >= INF ? 'impossible' : best, 'built from': from >= 0 ? 'dp[' + from + ']' : 'nothing' } }
          ] });
        }
        var last = {}; last[amount] = 'sel';
        frames.push({ narr: 'Answer: ' + (dp[amount] >= INF ? '<b>-1</b>, the amount cannot be made with these coins.' : '<b>' + dp[amount] + '</b> coin' + (dp[amount] > 1 ? 's' : '') + '.') + ' Work done: ' + amount + ' amounts × ' + coins.length + ' coins, which is O(amount × coins).', parts: [
          { type: 'array', label: 'dp (index = amount)', values: vals(), hl: last, idxLabels: labels, showIdx: true }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Why plain recursive Fibonacci is slow', html: `<p><code>Fib(5)</code> calls <code>Fib(4)</code> and <code>Fib(3)</code>. <code>Fib(4)</code> calls <code>Fib(3)</code> again. Count how often each is computed:</p>
<table><thead><tr><th>Call</th><th>Fib(4)</th><th>Fib(3)</th><th>Fib(2)</th><th>Fib(1)</th><th>Fib(0)</th></tr></thead><tbody><tr><td>Times computed</td><td>1</td><td>2</td><td>3</td><td>5</td><td>3</td></tr></tbody></table>
<p>That is 15 calls for n = 5, and the number roughly doubles with each step up in n. With a cache, each value is computed <span class="c-g">once</span>: O(n).</p>` },
      { title: 'The LCS table for "ace" and "abcde"', html: `<p>Rows are letters of "ace", columns are letters of "abcde". Each cell is the LCS length of the two prefixes.</p>
<table><thead><tr><th></th><th>""</th><th>a</th><th>b</th><th>c</th><th>d</th><th>e</th></tr></thead><tbody><tr><td>""</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr><tr><td>a</td><td>0</td><td><span class="c-g">1</span></td><td>1</td><td>1</td><td>1</td><td>1</td></tr><tr><td>c</td><td>0</td><td>1</td><td>1</td><td><span class="c-g">2</span></td><td>2</td><td>2</td></tr><tr><td>e</td><td>0</td><td>1</td><td>1</td><td>2</td><td>2</td><td><span class="c-g">3</span></td></tr></tbody></table>
<p>Green cells are matches: the diagonal value plus 1. Other cells copy the larger of the cell above and the cell to the left. Answer: <b>3</b>.</p>` },
      { title: 'Backtracking tree for the subsets of [1, 2, 3]', html: `<p>Each line is one recursive call. Indentation shows the depth. Every call records the current list.</p>
<pre>[]
  [1]
    [1,2]
      [1,2,3]
    [1,3]
  [2]
    [2,3]
  [3]</pre>
<p>8 calls, 8 subsets (2<sup>3</sup>). After <code>[1,2,3]</code> the code removes 3, then 2, and tries 3 in its place: that is the "un-choose" step.</p>` }
    ],
    deepDive: `<p><b>Counting the cost of DP.</b> Time = number of distinct states × work per state. Coin change has (amount + 1) states and tries every coin, so O(amount × coins). LCS has (n + 1) × (m + 1) states with O(1) work, so O(n × m).</p>
<p><b>Top-down in C#.</b> Use a <code>Dictionary</code> or an array filled with -1 as the cache. A tuple such as <code>(int i, int j)</code> works as a dictionary key. Remember the stack: a top-down DP that goes 100,000 levels deep will overflow, where the bottom-up loop will not.</p>
<p><b>Saving memory.</b> If a row only reads the row before it, keep 2 rows. For 0/1 knapsack, one row filled from high capacity to low is enough. The price is that you can no longer walk back through the table to print the actual choices.</p>
<p><b>Greedy or DP.</b> Greedy takes the best-looking step and never looks back. It is right for coins like 1, 5, 10, 25 and wrong for 1, 3, 4. If you cannot argue why greedy is safe, use DP.</p>
<p><b>Pruning is what makes backtracking usable.</b> Check rules before going deeper, order choices so failures come early, and skip equal values at the same depth to avoid duplicate results. 8 queens has over 4 billion ways to place 8 queens on 64 squares, but backtracking row by row with pruning looks at only a few thousand partial boards.</p>
<p><b>At work.</b> Text diff is LCS, "did you mean" is edit distance, and resource planning is often a knapsack in disguise.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants know every classic DP by heart, so reciting the coin change code proves little. Interviewers now change a detail ("each coin at most once", "return the coins used") to see whether you understand the state and the transition.</p>
<p><b>Use AI as a partner:</b> write the state in one sentence yourself, then ask <code>Is this DP state enough to answer the question? Point out what information is missing, do not write code.</code></p>
<p><b>Where AI goes wrong:</b> off-by-one errors between string index and table index, the wrong loop direction in knapsack (which silently reuses an item), <code>int.MaxValue + 1</code> overflow in "infinity" values, and adding the live list instead of a copy in backtracking.</p>
<p><b>What you must still own:</b> naming the state, proving the transition on a tiny example by hand, and stating the cost as states times work.</p>`,
    problems: [{
      title: 'Unique Paths in a Grid', level: 'Medium', tags: ['dynamic programming', 'grid'], companies: ['Google', 'Amazon'],
      statement: `<p>A robot starts in the top-left cell of a grid with <code>m</code> rows and <code>n</code> columns. It can only move right or down. In how many different ways can it reach the bottom-right cell?</p>`,
      constraints: `1 ≤ m, n ≤ 100, and the answer fits in a 32-bit integer`,
      example: `<p>Input: m = 3, n = 3. Output: <span class="c-g"><b>6</b></span>.</p><p>The robot must make 2 moves right and 2 moves down in some order: RRDD, RDRD, RDDR, DRRD, DRDR, DDRR.</p>`,
      brute: { why: `<p>From each cell, count the paths going right plus the paths going down. This is correct, but the same cell is solved again and again from different routes, so the number of calls grows exponentially. A 17 by 17 grid already takes hundreds of millions of calls.</p>`, code: `
class Brute
{
    public int UniquePaths(int m, int n)
    {
        if (m == 1 || n == 1) return 1;                               // a single row or column: one way
        return UniquePaths(m - 1, n) + UniquePaths(m, n - 1);         // come from above + come from the left
    }
}` },
      mcq: { q: 'How many ways are there to reach a cell that is not in the first row or first column?', options: ['ways(cell above) + ways(cell to the left)', 'ways(cell above) × ways(cell to the left)', 'always 2', 'row index + column index'], answer: 0, explain: 'The last move into the cell is either down from above or right from the left, and those two groups of paths do not overlap, so you add them.' },
      hints: [`<p>The last move into any cell comes from above or from the left. So ways(cell) = ways(above) + ways(left).</p>`, `<p>Every cell in the first row and the first column has exactly 1 way. Fill the rest row by row.</p>`, `<p>You only need the previous row. Keep one array <code>dp</code> of length n, all 1s. For each further row, for j from 1: <code>dp[j] += dp[j - 1]</code>. Answer: <code>dp[n - 1]</code>.</p>`],
      solution: {
        approach: `<p><b>State:</b> <code>dp[j]</code> = number of ways to reach column j of the current row. <b>Base:</b> the first row is all 1s. <b>Transition:</b> when moving to the next row, the old <code>dp[j]</code> is the value from the cell above and <code>dp[j - 1]</code> (already updated) is the cell to the left, so <code>dp[j] += dp[j - 1]</code>. One array is enough.</p>`,
        code: `
class Solution
{
    public int UniquePaths(int m, int n)
    {
        var dp = new int[n];
        for (int j = 0; j < n; j++) dp[j] = 1;         // first row: one way to each cell
        for (int i = 1; i < m; i++)
            for (int j = 1; j < n; j++)
                dp[j] += dp[j - 1];                    // above (old dp[j]) + left (dp[j - 1])
        return dp[n - 1];
    }
}`,
        dry: { head: ['Row', 'dp[0]', 'dp[1]', 'dp[2]'], rows: [
          ['0 (start)', '1', '1', '1'],
          ['1', '1', '2', '3'],
          ['2', '1', '3', '<span class="c-g">6</span>']
        ] },
        complexity: `<p>Time O(m × n). Space O(n). There is also a formula: choose which (m - 1) of the (m + n - 2) moves go down.</p>`,
        followUps: ['Some cells are blocked. What changes?', 'Each cell has a cost. Find the cheapest path.']
      }
    }]
  });

  /* ===================== TOPIC 5: bits, maths and small programs ===================== */
  topics.push({
    title: 'Bits, Maths and the Small Programs Interviewers Still Ask',
    analogy: `<p>Picture a row of 8 light switches. Each switch is one <b>bit</b>: on is 1, off is 0. The whole row is one number. Bit operators let you flip, test or combine many switches in a single move, the way one master switch can change a whole wall of lights at once.</p>`,
    explain: `<p>Every integer is stored in binary. From the right, the switches are worth 1, 2, 4, 8, 16 and so on. So 13 is <code>1101</code>: 8 + 4 + 1.</p>
<table><thead><tr><th>Operator</th><th>Meaning</th><th>Example with 12 (<code>1100</code>) and 10 (<code>1010</code>)</th></tr></thead><tbody>
<tr><td><code>&amp;</code> AND</td><td>1 only where both are 1</td><td><code>1000</code> = 8</td></tr>
<tr><td><code>|</code> OR</td><td>1 where either is 1</td><td><code>1110</code> = 14</td></tr>
<tr><td><code>^</code> XOR</td><td>1 where they differ</td><td><code>0110</code> = 6</td></tr>
<tr><td><code>~</code> NOT</td><td>flip every bit</td><td><code>~12</code> = -13</td></tr>
<tr><td><code>&lt;&lt;</code>, <code>&gt;&gt;</code></td><td>shift left (× 2), shift right (÷ 2)</td><td><code>12 &lt;&lt; 1</code> = 24, <code>12 &gt;&gt; 2</code> = 3</td></tr></tbody></table>
<p>Two tricks answer most bit questions:</p>
<ul><li><code>n &amp; (n - 1)</code> removes the lowest 1 bit. Use it for "is it a power of two" and for counting 1 bits.</li><li><code>x ^ x = 0</code> and <code>x ^ 0 = x</code>. XOR-ing a list makes equal pairs vanish, which finds the single unpaired number.</li></ul>
<p>The "small programs" are the warm-ups: prime check, GCD, factorial, FizzBuzz, Armstrong number, swapping two values. They look trivial, and that is the point. The interviewer watches for clean loops, the right stopping condition (the square root for primes), and whether you mention overflow before being asked.</p>`,
    clues: [
      '"appears twice except one", "find the unique", "without extra memory" → XOR everything',
      '"power of two", "exactly one bit set" → <code>n &amp; (n - 1) == 0</code> with <code>n &gt; 0</code>',
      '"count the set bits", "Hamming weight" → clear the lowest bit in a loop, or <code>BitOperations.PopCount</code>',
      '"is it prime" → divide only up to √n. "all primes up to n" → a sieve',
      '"greatest common divisor", "simplify a fraction" → Euclid: <code>Gcd(b, a % b)</code>',
      '"without a temporary variable", "without using +" → a bit trick is expected, then say what you would really write',
      '"very large n", "factorial of 50" → overflow: use <code>long</code>, <code>checked</code> or <code>BigInteger</code>',
      '"flags", "permissions", "a set of at most 32 options" → one integer used as a bit mask'
    ],
    code: [`
static bool IsPowerOfTwo(int n) { return n > 0 && (n & (n - 1)) == 0; }

static int CountBits(int n)
{
    int count = 0;
    for (uint u = (uint)n; u != 0; u &= u - 1) count++;   // one round per 1 bit
    return count;
}

static int SingleNumber(int[] a)
{
    int x = 0;
    foreach (int v in a) x ^= v;                          // equal pairs cancel out
    return x;
}

static bool IsPrime(int n)
{
    if (n < 2) return false;
    for (int i = 2; (long)i * i <= n; i++)
        if (n % i == 0) return false;
    return true;
}

static int Gcd(int a, int b) { return b == 0 ? a : Gcd(b, a % b); }`],
    codeTitle: ['The bit and maths one-liners'],
    viz: {
      title: 'Counting 1 bits with n & (n - 1)',
      input: '44',
      inputLabel: 'A whole number from 1 to 65535',
      gen: function (input) {
        var n = Number(String(input).trim());
        if (!(n >= 1 && n <= 65535) || n !== Math.floor(n)) throw new Error('Enter a whole number from 1 to 65535');
        var width = n > 255 ? 16 : 8, frames = [], count = 0, start = n;
        function low(v) { var p = 0; while (!((v >> p) & 1)) p++; return p; }
        var first = {}; first[low(n)] = 'cur';
        frames.push({ narr: '<b>' + n + '</b> in binary. Goal: count its 1 bits without looking at every position. The lowest 1 bit is highlighted.', parts: [
          { type: 'bits', label: 'n', value: n, width: width, hl: first, showDec: true },
          { type: 'vars', vals: { count: 0 } }
        ] });
        while (n !== 0) {
          var p = low(n), hl1 = {}, hl2 = {}, i;
          hl1[p] = 'bad'; for (i = 0; i < p; i++) hl1[i] = 'win';
          hl2[p] = 'cur';
          frames.push({ narr: 'Subtract 1. The lowest 1 bit (position ' + p + ') turns to 0' + (p > 0 ? ' and the ' + p + ' zero' + (p > 1 ? 's' : '') + ' below it turn to 1.' : '.') + ' The bits above it do not change.', parts: [
            { type: 'bits', label: 'n', value: n, width: width, hl: hl2, showDec: true },
            { type: 'bits', label: 'n - 1', value: n - 1, width: width, hl: hl1, showDec: true },
            { type: 'vars', vals: { count: count } }
          ] });
          var next = n & (n - 1), hl3 = {}; hl3[p] = 'ok';
          count++;
          frames.push({ narr: 'AND them: only positions where both have a 1 survive, so bit ' + p + ' is cleared. One bit counted: <b>count = ' + count + '</b>.', parts: [
            { type: 'bits', label: 'n & (n - 1)', value: next, width: width, hl: hl3, showDec: true },
            { type: 'vars', vals: { count: count }, hl: { count: 'ok' } }
          ] });
          n = next;
        }
        frames.push({ narr: 'n is 0, so the loop stops. <b>' + start + ' has ' + count + ' one bit' + (count > 1 ? 's' : '') + '</b>, found in ' + count + ' round' + (count > 1 ? 's' : '') + '. ' + (count === 1 ? 'Exactly one round means ' + start + ' is a power of two.' : 'More than one round means ' + start + ' is not a power of two.'), parts: [
          { type: 'bits', label: 'start value', value: start, width: width, showDec: true },
          { type: 'vars', vals: { count: count, 'power of two': count === 1 ? 'yes' : 'no' }, hl: { count: 'sel' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'XOR finds the single number', html: `<p>Array <code>[4, 1, 2, 1, 2]</code>. Keep a running XOR, shown in binary.</p>
<table><thead><tr><th>Value</th><th>Binary</th><th>Running XOR</th></tr></thead><tbody><tr><td>4</td><td>100</td><td>100</td></tr><tr><td>1</td><td>001</td><td>101</td></tr><tr><td>2</td><td>010</td><td>111</td></tr><tr><td>1</td><td>001</td><td>110</td></tr><tr><td>2</td><td>010</td><td><span class="c-g">100</span> = 4</td></tr></tbody></table>
<p>Each pair switched the same bits on and then off again. Only 4 is left.</p>` },
      { title: 'Euclid on 48 and 18', html: `<table><thead><tr><th>a</th><th>b</th><th>a % b</th></tr></thead><tbody><tr><td>48</td><td>18</td><td>12</td></tr><tr><td>18</td><td>12</td><td>6</td></tr><tr><td>12</td><td>6</td><td>0</td></tr><tr><td><span class="c-g">6</span></td><td>0</td><td>stop</td></tr></tbody></table>
<p>The GCD is <b>6</b>. It works because any number that divides both a and b also divides a % b, so the pair (b, a % b) has the same common divisors and smaller numbers.</p>` },
      { title: 'Why the prime loop stops at the square root', html: `<p>Is 97 prime? √97 is about 9.8, so test only 2 to 9.</p>
<p>97 % 2 = 1, 97 % 3 = 1, 97 % 4 = 1, 97 % 5 = 2, 97 % 6 = 1, 97 % 7 = 6, 97 % 8 = 1, 97 % 9 = 7. No divider found, so 97 is <span class="c-g">prime</span> after 8 checks, not 95.</p>
<p>If 97 had a divider larger than 9.8, its partner would have to be smaller than 9.8, and we would have found that one already.</p>`, code: `
static bool IsPrime(int n)
{
    if (n < 2) return false;
    for (int i = 2; (long)i * i <= n; i++)   // the cast stops i * i from overflowing
        if (n % i == 0) return false;
    return true;
}` }
    ],
    deepDive: `<p><b>Negative numbers.</b> C# integers use two's complement: to negate, flip all bits and add 1. So -1 is all 1 bits, and <code>n &amp; -n</code> keeps only the lowest 1 bit. <code>&gt;&gt;</code> on a signed <code>int</code> copies the sign bit in from the left. Use <code>uint</code>, or <code>&gt;&gt;&gt;</code> from C# 11, when you want zeros.</p>
<p><b>Shift counts wrap.</b> For an <code>int</code>, only the low 5 bits of the shift count are used, so <code>1 &lt;&lt; 32</code> is 1, not 0. For a <code>long</code> it is the low 6 bits. Write <code>1L &lt;&lt; 40</code> when you need more than 32 bits.</p>
<p><b>Overflow.</b> C# arithmetic is unchecked by default and wraps silently. <code>checked( )</code> or the project-wide setting turns wrapping into an <code>OverflowException</code>. 20! is the largest factorial in a <code>long</code>, and Fib(92) the largest Fibonacci number. <code>System.Numerics.BigInteger</code> has no limit but is much slower.</p>
<p><b>Hardware help.</b> <code>BitOperations.PopCount</code>, <code>LeadingZeroCount</code> and <code>TrailingZeroCount</code> compile to single CPU instructions on modern processors. Use them in real code and keep the loop for the whiteboard.</p>
<p><b>Bit masks at work.</b> A <code>[Flags]</code> enum stores up to 32 or 64 yes/no options in one integer: <code>perms | Write</code> grants, <code>perms &amp; ~Write</code> revokes, <code>(perms &amp; Write) != 0</code> tests. Bloom filters and bitmap indexes are built on the same idea.</p>
<p><b>Primes at scale.</b> Trial division is fine for one number up to about 10<sup>12</sup>. For many numbers use a sieve. For the huge primes of cryptography, probabilistic tests such as Miller-Rabin are used.</p>`,
    aiEra: `<p><b>What AI changes:</b> nobody needs to remember obscure bit hacks any more, an assistant will produce them on request. What still matters is reading one and knowing if it is right, especially at the edges: 0, negative numbers and the largest <code>int</code>.</p>
<p><b>Use AI as a partner:</b> ask <code>Explain what n &amp; (n - 1) does to 40, bit by bit, then give me 3 inputs where a naive power-of-two check fails.</code></p>
<p><b>Where AI goes wrong:</b> it forgets <code>n &gt; 0</code> in the power-of-two check, uses <code>Math.Pow</code> (floating point) where exact integers are needed, writes <code>i * i &lt;= n</code> that overflows near <code>int.MaxValue</code>, and offers the XOR swap as if it were good production style.</p>
<p><b>What you must still own:</b> binary on paper, the overflow limits of <code>int</code> and <code>long</code>, and the habit of testing 0, 1, a negative and the maximum value.</p>`
  });
  /* ===================== PRACTICE: 3 Easy ===================== */
  practice.push({
    title: 'Backspace String Compare', level: 'Easy', tags: ['stack', 'two pointers', 'string'], companies: ['Google', 'Microsoft'],
    statement: `<p>Two strings <code>s</code> and <code>t</code> are typed into empty text editors. The character <code>#</code> means "backspace": it deletes the character before it, if there is one. Return <code>true</code> if both editors end up showing the same text.</p>`,
    constraints: `1 ≤ s.length, t.length ≤ 200, lowercase letters and '#' only`,
    example: `<p>Input: s = <code>"ab#c"</code>, t = <code>"ad#c"</code>. Output: <span class="c-g"><b>true</b></span>. Both become "ac".</p><p>Input: s = <code>"a#c"</code>, t = <code>"b"</code>. Output: <span class="c-r"><b>false</b></span>. "c" is not "b".</p><p>Input: s = <code>"##a"</code>, t = <code>"a"</code>. Output: <b>true</b>. A backspace on empty text does nothing.</p>`,
    brute: { why: `<p>Build the final text of each string with a stack (here a <code>StringBuilder</code> used as one): add a letter, and on <code>#</code> remove the last letter. Then compare. This is clear and O(n + m) time, but it uses O(n + m) extra memory. It is a good first answer, and the follow-up is "can you do it in O(1) space?".</p>`, code: `
class Brute
{
    public bool BackspaceCompare(string s, string t) { return Build(s) == Build(t); }

    private string Build(string s)
    {
        var sb = new StringBuilder();
        foreach (char c in s)
        {
            if (c != '#') sb.Append(c);
            else if (sb.Length > 0) sb.Length--;      // backspace: drop the last character
        }
        return sb.ToString();
    }
}` },
    mcq: { q: 'Why does scanning from the END of the string make O(1) space possible?', options: ['A backspace affects the characters before it, so from the end you know how many to skip before you reach them', 'Strings are stored backwards in memory', 'The end of the string is always shorter', 'It does not, you always need a stack'], answer: 0, explain: 'Going right to left, you meet each # before the characters it deletes, so a simple counter of pending backspaces replaces the stack.' },
    hints: [`<p>Read the strings from right to left. Each <code>#</code> you pass means "skip one of the letters still to come".</p>`, `<p>Write a helper that, given an index, moves left past backspaces and deleted letters and returns the index of the next letter that survives (or -1).</p>`, `<p>Recipe: loop while either index is ≥ 0. Move both to their next surviving letter. If one string ran out, both must have run out. If the letters differ, return false. Then step both left.</p>`],
    solution: {
      approach: `<p>Use one pointer per string, starting at the end. <code>NextKept</code> walks left: a <code>#</code> raises a skip counter, a letter is skipped while the counter is above 0, and the first letter met with the counter at 0 is a letter that really stays. Compare the surviving letters pair by pair. If one string has a surviving letter and the other has none, they differ.</p>`,
      code: `
class Solution
{
    public bool BackspaceCompare(string s, string t)
    {
        int i = s.Length - 1, j = t.Length - 1;
        while (i >= 0 || j >= 0)
        {
            i = NextKept(s, i);
            j = NextKept(t, j);
            if (i < 0 || j < 0) return i < 0 && j < 0;    // one ran out: both must have
            if (s[i] != t[j]) return false;
            i--; j--;
        }
        return true;
    }

    // Index of the next character that survives, scanning left from i, or -1.
    private int NextKept(string s, int i)
    {
        int skip = 0;
        while (i >= 0)
        {
            if (s[i] == '#') { skip++; i--; }
            else if (skip > 0) { skip--; i--; }
            else break;
        }
        return i;
    }
}`,
      dry: { head: ['Step', 'i in "ab#c"', 'j in "ad#c"', 'Compare'], rows: [
        ['1', '3 (c)', '3 (c)', 'c = c, move left'],
        ['2', '2 is #, skip b, lands on 0 (a)', '2 is #, skip d, lands on 0 (a)', 'a = a, move left'],
        ['3', '-1', '-1', '<span class="c-g">both ended: true</span>']
      ] },
      complexity: `<p>Time O(n + m): each index only moves left. Space O(1).</p>`,
      followUps: ['Add a character that deletes the whole line.', 'What if the strings arrive as streams and you cannot read them backwards?']
    }
  });

  practice.push({
    title: 'Symmetric Tree', level: 'Easy', tags: ['tree', 'dfs', 'recursion'], companies: ['Microsoft', 'LinkedIn'],
    statement: `<p>Given the root of a binary tree, return <code>true</code> if the tree is a mirror image of itself around its centre line.</p>`,
    constraints: `0 ≤ number of nodes ≤ 1000, -100 ≤ val ≤ 100`,
    example: `<p>Tree: root 1, children 2 and 2. The left 2 has children 3 and 4. The right 2 has children 4 and 3. Output: <span class="c-g"><b>true</b></span>.</p><p>Tree: root 1, children 2 and 2. Each 2 has only a right child 3. Output: <span class="c-r"><b>false</b></span>: on the left side the 3 is on the inside, on the right side it is on the outside.</p>`,
    brute: { why: `<p>Write the left subtree out as a list (node, left, right, with "#" for a missing child) and the right subtree in mirrored order (node, right, left). If the two lists are equal, the tree is symmetric. Correct and O(n), but it builds two lists of strings, O(n) extra memory, and it cannot stop early at the first difference.</p>`, code: `
class Brute
{
    public bool IsSymmetric(TreeNode root)
    {
        if (root == null) return true;
        var a = new List<string>();
        var b = new List<string>();
        Walk(root.left, a, false);
        Walk(root.right, b, true);
        return a.SequenceEqual(b);
    }

    private void Walk(TreeNode n, List<string> output, bool mirror)
    {
        if (n == null) { output.Add("#"); return; }       // marker for a missing child
        output.Add(n.val.ToString());
        Walk(mirror ? n.right : n.left, output, mirror);
        Walk(mirror ? n.left : n.right, output, mirror);
    }
}` },
    mcq: { q: 'Two subtrees A and B are mirrors of each other when their roots are equal and…', options: ['A.left mirrors B.right, and A.right mirrors B.left', 'A.left mirrors B.left, and A.right mirrors B.right', 'they have the same height', 'they have the same in-order output'], answer: 0, explain: 'A mirror swaps sides: the outside of one must match the outside of the other, and inside must match inside.' },
    hints: [`<p>Do not think about one tree. Think about two subtrees walked at the same time, one going left where the other goes right.</p>`, `<p>Write <code>IsMirror(a, b)</code>. Both null is true. Exactly one null is false. Different values is false.</p>`, `<p>Recipe: return <code>IsMirror(a.left, b.right) &amp;&amp; IsMirror(a.right, b.left)</code>. Start with <code>IsMirror(root.left, root.right)</code>. An empty tree is symmetric.</p>`],
    solution: {
      approach: `<p>Walk the left and right subtrees together. At each pair of nodes: if both are missing, this part matches. If only one is missing or the values differ, the tree is not symmetric. Otherwise compare the outer pair (left of one with right of the other) and the inner pair. The <code>&amp;&amp;</code> stops at the first mismatch.</p>`,
      code: `
class Solution
{
    public bool IsSymmetric(TreeNode root)
    {
        return root == null || IsMirror(root.left, root.right);
    }

    private bool IsMirror(TreeNode a, TreeNode b)
    {
        if (a == null || b == null) return a == b;        // both null: fine. One null: not a mirror
        return a.val == b.val
            && IsMirror(a.left, b.right)                  // outer pair
            && IsMirror(a.right, b.left);                 // inner pair
    }
}`,
      dry: { head: ['Call', 'a', 'b', 'Result'], rows: [
        ['IsMirror(2, 2)', '2', '2', 'equal, check children'],
        ['outer: IsMirror(3, 3)', '3', '3', 'equal, children all null: true'],
        ['inner: IsMirror(4, 4)', '4', '4', 'equal, children all null: true'],
        ['back at the top', '', '', '<span class="c-g">true</span>']
      ] },
      complexity: `<p>Time O(n). Space O(h) for the recursion, h being the height of the tree.</p>`,
      followUps: ['Solve it without recursion, using a queue of node pairs.', 'Return the mirror image of a tree.']
    }
  });

  practice.push({
    title: 'Counting Bits', level: 'Easy', tags: ['bits', 'dynamic programming'], companies: ['Amazon', 'Apple'],
    statement: `<p>Given an integer <code>n</code>, return an array <code>ans</code> of length n + 1 where <code>ans[i]</code> is the number of 1 bits in the binary form of i.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>5</sup>`,
    example: `<p>Input: n = 5. Output: <span class="c-g"><b>[0, 1, 1, 2, 1, 2]</b></span>.</p><p>0 = <code>0</code>, 1 = <code>1</code>, 2 = <code>10</code>, 3 = <code>11</code>, 4 = <code>100</code>, 5 = <code>101</code>.</p>`,
    brute: { why: `<p>Count the bits of every number separately by checking and shifting out one bit at a time. Each number takes up to 17 rounds for n ≤ 10<sup>5</sup>, so the total is O(n log n). It ignores the fact that the answer for a number is almost the same as the answer for a smaller number you already solved.</p>`, code: `
class Brute
{
    public int[] CountBits(int n)
    {
        var ans = new int[n + 1];
        for (int i = 0; i <= n; i++)
            for (int v = i; v > 0; v >>= 1)       // look at every bit of i
                ans[i] += v & 1;
        return ans;
    }
}` },
    mcq: { q: 'How is the bit count of i related to the bit count of i / 2 (i shifted right by 1)?', options: ['It is the same, plus 1 if i is odd', 'It is always one more', 'It is double', 'There is no relation'], answer: 0, explain: 'Shifting right drops only the last bit. So bits(i) = bits(i >> 1) + (i & 1).' },
    hints: [`<p>Write 6 and 3 in binary: <code>110</code> and <code>11</code>. What is the difference?</p>`, `<p><code>i &gt;&gt; 1</code> is i without its last bit, and it is smaller than i, so its answer is already in the array.</p>`, `<p>Recipe: <code>ans[0] = 0</code>. For i from 1 to n: <code>ans[i] = ans[i &gt;&gt; 1] + (i &amp; 1)</code>. One pass, no inner loop.</p>`],
    solution: {
      approach: `<p>This is a tiny dynamic programming problem. <b>State:</b> <code>ans[i]</code> = number of 1 bits in i. <b>Transition:</b> dropping the last bit of i gives <code>i &gt;&gt; 1</code>, whose answer is known, and the dropped bit is <code>i &amp; 1</code>. <b>Base:</b> <code>ans[0] = 0</code>.</p>`,
      code: `
class Solution
{
    public int[] CountBits(int n)
    {
        var ans = new int[n + 1];
        for (int i = 1; i <= n; i++)
            ans[i] = ans[i >> 1] + (i & 1);       // bits of i without its last bit, plus the last bit
        return ans;
    }
}`,
      dry: { head: ['i', 'binary', 'i >> 1', 'ans[i >> 1]', 'i & 1', 'ans[i]'], rows: [
        ['1', '1', '0', '0', '1', '1'], ['2', '10', '1', '1', '0', '1'], ['3', '11', '1', '1', '1', '2'], ['4', '100', '2', '1', '0', '1'], ['5', '101', '2', '1', '1', '<span class="c-g">2</span>']
      ] },
      complexity: `<p>Time O(n). Space O(1) besides the output array.</p>`,
      followUps: ['Write the transition using <code>i &amp; (i - 1)</code>.', 'What is the total number of 1 bits from 0 to n, without building the array?']
    }
  });

  /* ===================== PRACTICE: 5 Medium ===================== */
  practice.push({
    title: 'Remove the Nth Node From the End', level: 'Medium', tags: ['linked list', 'two pointers'], companies: ['Amazon', 'Meta'],
    statement: `<p>Given the head of a singly linked list, remove the nth node counted from the end and return the head. Try to do it in one pass.</p>`,
    constraints: `1 ≤ number of nodes ≤ 30, 1 ≤ n ≤ number of nodes`,
    example: `<p>Input: <code>1 → 2 → 3 → 4 → 5</code>, n = 2. Output: <span class="c-g"><b>1 → 2 → 3 → 5</b></span>. The 2nd node from the end is 4.</p><p>Input: <code>1</code>, n = 1. Output: an empty list. The head itself is removed.</p>`,
    brute: { why: `<p>Walk the list once to count the nodes, work out which position to remove from the front (length - n), then walk again to the node before it. Correct, but it needs two passes over the list, and the interviewer will ask for one.</p>`, code: `
class Brute
{
    public ListNode RemoveNthFromEnd(ListNode head, int n)
    {
        int length = 0;
        for (ListNode p = head; p != null; p = p.next) length++;     // pass 1: count

        var dummy = new ListNode(0, head);
        ListNode before = dummy;
        for (int i = 0; i < length - n; i++) before = before.next;   // pass 2: walk to the node before
        before.next = before.next.next;
        return dummy.next;
    }
}` },
    mcq: { q: 'Two pointers move at the same speed, but one starts n nodes ahead. When the front one reaches the end, where is the back one?', options: ['n nodes from the end', 'At the middle', 'At the head', 'n nodes from the head'], answer: 0, explain: 'The gap between them never changes, so when the front pointer is at the end the back pointer is exactly n behind it.' },
    hints: [`<p>You do not need the length. You need two pointers that stay exactly n nodes apart.</p>`, `<p>Start both at a dummy node placed before the head. A dummy means removing the first node needs no special case.</p>`, `<p>Recipe: move <code>fast</code> n steps. Then move both until <code>fast.next</code> is null. Now <code>slow</code> is just before the node to remove: <code>slow.next = slow.next.next</code>. Return <code>dummy.next</code>.</p>`],
    solution: {
      approach: `<p>Put a dummy node in front of the head and start <code>slow</code> and <code>fast</code> there. Move <code>fast</code> forward n steps to open a gap of n. Then move both together until <code>fast</code> is on the last node. <code>slow</code> is now the node just before the one to delete, so unlink it. Returning <code>dummy.next</code> also covers the case where the head was removed.</p>`,
      code: `
class Solution
{
    public ListNode RemoveNthFromEnd(ListNode head, int n)
    {
        var dummy = new ListNode(0, head);
        ListNode slow = dummy, fast = dummy;
        for (int i = 0; i < n; i++) fast = fast.next;      // open a gap of n nodes
        while (fast.next != null)                          // slide the gap to the end
        {
            slow = slow.next;
            fast = fast.next;
        }
        slow.next = slow.next.next;                        // unlink the target
        return dummy.next;
    }
}`,
      dry: { head: ['Step', 'slow', 'fast', 'Note'], rows: [
        ['start', 'dummy', 'dummy', 'list 1 2 3 4 5, n = 2'],
        ['open the gap', 'dummy', '2', 'fast moved 2 steps'],
        ['slide', '1', '3', ''],
        ['slide', '2', '4', ''],
        ['slide', '3', '5', 'fast.next is null, stop'],
        ['unlink', '3', '5', '<span class="c-g">3.next = 5, node 4 removed</span>']
      ] },
      complexity: `<p>Time O(length), one pass. Space O(1).</p>`,
      followUps: ['What if n can be larger than the length?', 'Remove the middle node in one pass.']
    }
  });

  practice.push({
    title: 'Daily Temperatures', level: 'Medium', tags: ['monotonic stack', 'array'], companies: ['Amazon', 'Uber'],
    statement: `<p>Given an array of daily temperatures, return an array where <code>answer[i]</code> is the number of days you must wait after day i for a warmer day. If no warmer day comes, the answer is 0.</p>`,
    constraints: `1 ≤ temperatures.length ≤ 10<sup>5</sup>, 30 ≤ temperatures[i] ≤ 100`,
    example: `<p>Input: <code>[73, 74, 75, 71, 69, 72, 76, 73]</code>. Output: <span class="c-g"><b>[1, 1, 4, 2, 1, 1, 0, 0]</b></span>.</p><p>Day 2 (75) waits 4 days for 76. Day 6 (76) is never beaten, so 0.</p>`,
    brute: { why: `<p>For each day, scan forward until a warmer day appears. With 10<sup>5</sup> days that fall steadily, every scan runs to the end: about 5 × 10<sup>9</sup> steps, far too slow. The waste is that the same later days are re-read for every earlier day.</p>`, code: `
class Brute
{
    public int[] DailyTemperatures(int[] t)
    {
        var ans = new int[t.Length];
        for (int i = 0; i < t.Length; i++)
            for (int j = i + 1; j < t.Length; j++)
                if (t[j] > t[i]) { ans[i] = j - i; break; }     // first warmer day found
        return ans;
    }
}` },
    mcq: { q: 'Which days should be kept "waiting" in a stack?', options: ['Days that have not yet found a warmer day, with the most recent on top', 'All days seen so far, sorted by temperature', 'Only the hottest day so far', 'Only the coldest day so far'], answer: 0, explain: 'A new warmer day answers the most recent waiting days first. Their temperatures always decrease from bottom to top, so you can stop popping at the first day that is not colder.' },
    hints: [`<p>When a warm day arrives, it is the answer for every earlier, colder day that is still waiting.</p>`, `<p>Keep a stack of day indexes that are still waiting. Store indexes, not temperatures, because the answer is a distance in days.</p>`, `<p>Recipe: for each day i, while the stack is not empty and the day on top is colder than day i, pop it and set its answer to i minus that index. Then push i. Days left on the stack keep 0.</p>`],
    solution: {
      approach: `<p>This is the "next greater element" pattern. The stack holds indexes of days with no answer yet, and their temperatures decrease from bottom to top. Each new day pops every colder day and gives it the distance. Each index is pushed once and popped at most once, so the nested loop is still linear.</p>`,
      code: `
class Solution
{
    public int[] DailyTemperatures(int[] t)
    {
        var ans = new int[t.Length];
        var waiting = new Stack<int>();                 // indexes of days with no warmer day yet
        for (int i = 0; i < t.Length; i++)
        {
            while (waiting.Count > 0 && t[waiting.Peek()] < t[i])
            {
                int day = waiting.Pop();
                ans[day] = i - day;                     // day i is the first warmer day
            }
            waiting.Push(i);
        }
        return ans;                                     // days still waiting keep 0
    }
}`,
      dry: { head: ['i', 't[i]', 'Popped (answer)', 'Stack of indexes after'], rows: [
        ['0', '73', '', '0'], ['1', '74', '0 (1)', '1'], ['2', '75', '1 (1)', '2'], ['3', '71', '', '2 3'], ['4', '69', '', '2 3 4'],
        ['5', '72', '4 (1), 3 (2)', '2 5'], ['6', '76', '5 (1), 2 (4)', '6'], ['7', '73', '', '6 7 → both keep 0']
      ] },
      complexity: `<p>Time O(n): every index is pushed and popped at most once. Space O(n) for the stack.</p>`,
      followUps: ['Solve it by scanning from right to left.', 'The same question on a circular list of days.']
    }
  });

  practice.push({
    title: 'Rotting Oranges', level: 'Medium', tags: ['bfs', 'grid', 'graph'], companies: ['Amazon', 'Microsoft'],
    statement: `<p>In a grid, 0 is an empty cell, 1 is a fresh orange and 2 is a rotten orange. Every minute, each fresh orange that touches a rotten one (up, down, left or right) becomes rotten. Return the number of minutes until no fresh orange is left, or -1 if that never happens.</p>`,
    constraints: `1 ≤ rows, cols ≤ 10, each cell is 0, 1 or 2`,
    example: `<p>Input:</p><pre>2 1 1
1 1 0
0 1 1</pre><p>Output: <span class="c-g"><b>4</b></span>. The rot spreads one step per minute from the top-left corner and reaches the bottom-right orange in minute 4.</p><p>Input: <code>[[2,1,1],[0,1,1],[1,0,1]]</code>. Output: <span class="c-r"><b>-1</b></span>. The orange in the bottom-left corner is cut off by empty cells.</p>`,
    brute: { why: `<p>Simulate each minute by scanning the whole grid for fresh oranges that have a rotten neighbour, then turn them all at once. Repeat until nothing changes. It is correct, but every minute re-reads every cell: O((rows × cols)<sup>2</sup>) in the worst case, for example a long snake of oranges.</p>`, code: `
class Brute
{
    public int OrangesRotting(int[][] grid)
    {
        int rows = grid.Length, cols = grid[0].Length, minutes = 0;
        while (true)
        {
            var turn = new List<int[]>();                       // fresh oranges that rot this minute
            for (int r = 0; r < rows; r++)
                for (int c = 0; c < cols; c++)
                    if (grid[r][c] == 1 && TouchesRotten(grid, r, c)) turn.Add(new[] { r, c });
            if (turn.Count == 0) break;
            foreach (int[] cell in turn) grid[cell[0]][cell[1]] = 2;
            minutes++;
        }
        foreach (int[] row in grid)
            foreach (int v in row)
                if (v == 1) return -1;                          // a fresh orange was never reached
        return minutes;
    }

    private bool TouchesRotten(int[][] g, int r, int c)
    {
        return (r > 0 && g[r - 1][c] == 2) || (r + 1 < g.Length && g[r + 1][c] == 2)
            || (c > 0 && g[r][c - 1] == 2) || (c + 1 < g[0].Length && g[r][c + 1] == 2);
    }
}` },
    mcq: { q: 'Several oranges are rotten at minute 0. How should the BFS start?', options: ['Put all rotten oranges in the queue first, then run one BFS', 'Run a separate BFS from each rotten orange and add the results', 'Start from any single rotten orange', 'Start from the fresh oranges'], answer: 0, explain: 'All rotten oranges spread at the same time. Starting the queue with all of them (multi-source BFS) makes each level of the BFS equal one minute.' },
    hints: [`<p>"Spreads one step per minute" is breadth-first search: each BFS level is one minute.</p>`, `<p>Start the queue with <b>every</b> rotten orange, and count the fresh ones while you scan the grid.</p>`, `<p>Recipe: while the queue is not empty and fresh &gt; 0: add a minute, process exactly the cells in the queue now, rot each fresh neighbour (fresh--, enqueue). At the end return minutes if fresh is 0, otherwise -1.</p>`],
    solution: {
      approach: `<p>Scan the grid once: put every rotten orange in a queue and count the fresh ones. Then run BFS level by level. One level is one minute: each cell taken from the queue turns its fresh neighbours rotten, lowers the fresh counter and queues them. Stop when no fresh orange is left or the queue is empty. If fresh oranges remain, they are unreachable.</p>`,
      code: `
class Solution
{
    public int OrangesRotting(int[][] grid)
    {
        int rows = grid.Length, cols = grid[0].Length, fresh = 0, minutes = 0;
        var q = new Queue<int[]>();
        for (int r = 0; r < rows; r++)
            for (int c = 0; c < cols; c++)
            {
                if (grid[r][c] == 2) q.Enqueue(new[] { r, c });      // every starting point
                else if (grid[r][c] == 1) fresh++;
            }

        int[] dr = { 1, -1, 0, 0 }, dc = { 0, 0, 1, -1 };
        while (q.Count > 0 && fresh > 0)
        {
            minutes++;
            for (int size = q.Count; size > 0; size--)               // one level = one minute
            {
                int[] cell = q.Dequeue();
                for (int d = 0; d < 4; d++)
                {
                    int r = cell[0] + dr[d], c = cell[1] + dc[d];
                    if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] != 1) continue;
                    grid[r][c] = 2;                                  // rot it, which also marks it visited
                    fresh--;
                    q.Enqueue(new[] { r, c });
                }
            }
        }
        return fresh == 0 ? minutes : -1;
    }
}`,
      dry: { head: ['Minute', 'Cells that rot', 'Fresh left'], rows: [
        ['0', 'start: (0,0) is rotten', '6'], ['1', '(0,1), (1,0)', '4'], ['2', '(0,2), (1,1)', '2'], ['3', '(2,1)', '1'], ['4', '(2,2)', '<span class="c-g">0 → return 4</span>']
      ] },
      complexity: `<p>Time O(rows × cols): each cell enters the queue at most once. Space O(rows × cols) for the queue.</p>`,
      followUps: ['Do it without changing the input grid.', 'Return the cell that rots last.']
    }
  });

  practice.push({
    title: 'House Robber', level: 'Medium', tags: ['dynamic programming'], companies: ['Amazon', 'Cisco'],
    statement: `<p>Houses stand in a row and <code>nums[i]</code> is the money in house i. You cannot take money from two houses that are next to each other. Return the largest total you can take.</p>`,
    constraints: `1 ≤ nums.length ≤ 100, 0 ≤ nums[i] ≤ 400`,
    example: `<p>Input: <code>[2, 7, 9, 3, 1]</code>. Output: <span class="c-g"><b>12</b></span>. Take houses 0, 2 and 4: 2 + 9 + 1.</p><p>Input: <code>[2, 1, 1, 2]</code>. Output: <b>4</b>. Take the first and the last house. "Every other house" would give only 3.</p>`,
    brute: { why: `<p>At each house, try both choices: skip it, or take it and jump over the next one. This explores every valid combination. The same "best from house i onward" is recomputed many times, so the calls grow like Fibonacci, about O(1.6<sup>n</sup>). For 100 houses that never finishes.</p>`, code: `
class Brute
{
    public int Rob(int[] nums) { return Best(nums, 0); }

    private int Best(int[] nums, int i)
    {
        if (i >= nums.Length) return 0;
        int skip = Best(nums, i + 1);                  // leave house i
        int take = nums[i] + Best(nums, i + 2);        // take house i, so house i + 1 is out
        return Math.Max(skip, take);
    }
}` },
    mcq: { q: 'Let best(i) be the most money from the first i houses. Which rule is right?', options: ['best(i) = max(best(i - 1), best(i - 2) + money in house i)', 'best(i) = best(i - 1) + money in house i', 'best(i) = max of all houses so far', 'best(i) = best(i - 2) + best(i - 1)'], answer: 0, explain: 'Either you skip house i and keep best(i - 1), or you take it and add it to the best total that ends at least two houses back.' },
    hints: [`<p>For each house there are only 2 choices: skip it, or take it. Taking it rules out the house before it.</p>`, `<p>The best total up to house i depends only on the best totals up to the previous two houses.</p>`, `<p>Recipe: keep two numbers, <code>prev2</code> and <code>prev1</code>, both 0. For each amount x: <code>cur = max(prev1, prev2 + x)</code>, then shift: <code>prev2 = prev1</code>, <code>prev1 = cur</code>. Answer: <code>prev1</code>.</p>`],
    solution: {
      approach: `<p><b>State:</b> the best total using the houses seen so far. <b>Transition:</b> for a new house worth x, either skip it (keep <code>prev1</code>) or take it (<code>prev2 + x</code>, where <code>prev2</code> is the best total that does not use the previous house). Only the last two totals are needed, so two variables replace the array.</p>`,
      code: `
class Solution
{
    public int Rob(int[] nums)
    {
        int prev2 = 0, prev1 = 0;                       // best up to two houses back, best up to the last house
        foreach (int x in nums)
        {
            int cur = Math.Max(prev1, prev2 + x);       // skip this house, or take it
            prev2 = prev1;
            prev1 = cur;
        }
        return prev1;
    }
}`,
      dry: { head: ['House value x', 'prev2 + x (take)', 'prev1 (skip)', 'cur'], rows: [
        ['2', '0 + 2 = 2', '0', '2'], ['7', '0 + 7 = 7', '2', '7'], ['9', '2 + 9 = 11', '7', '11'], ['3', '7 + 3 = 10', '11', '11'], ['1', '11 + 1 = 12', '11', '<span class="c-g">12</span>']
      ] },
      complexity: `<p>Time O(n). Space O(1).</p>`,
      followUps: ['The houses stand in a circle, so the first and last are neighbours.', 'Return which houses were chosen.']
    }
  });

  practice.push({
    title: 'Generate Parentheses', level: 'Medium', tags: ['backtracking', 'recursion', 'string'], companies: ['Google', 'Amazon'],
    statement: `<p>Given <code>n</code> pairs of round brackets, return every string that is a correctly balanced arrangement of them.</p>`,
    constraints: `1 ≤ n ≤ 8`,
    example: `<p>Input: n = 3. Output (5 strings): <span class="c-g"><b>((())), (()()), (())(), ()(()), ()()()</b></span>.</p><p>Input: n = 1. Output: <b>()</b>.</p>`,
    brute: { why: `<p>Build every string of length 2n from "(" and ")", then keep the balanced ones. There are 2<sup>2n</sup> strings: 65,536 for n = 8, of which only 1,430 are valid. Almost all of the work goes into strings that were already hopeless after a few characters.</p>`, code: `
class Brute
{
    public IList<string> GenerateParenthesis(int n)
    {
        var res = new List<string>();
        Build(new char[2 * n], 0, res);
        return res;
    }

    private void Build(char[] cur, int pos, List<string> res)
    {
        if (pos == cur.Length) { if (IsValid(cur)) res.Add(new string(cur)); return; }
        cur[pos] = '('; Build(cur, pos + 1, res);
        cur[pos] = ')'; Build(cur, pos + 1, res);
    }

    private bool IsValid(char[] s)
    {
        int open = 0;
        foreach (char c in s)
        {
            open += c == '(' ? 1 : -1;
            if (open < 0) return false;            // a closer came before its opener
        }
        return open == 0;
    }
}` },
    mcq: { q: 'While building a string left to right, when is it allowed to add a ")"?', options: ['Only when fewer ")" than "(" have been used so far', 'At any time', 'Only after all "(" are used', 'Only at even positions'], answer: 0, explain: 'A closing bracket needs an earlier unmatched opening bracket. If close < open, there is one to match.' },
    hints: [`<p>Do not generate bad strings and filter them. Never make a move that can no longer lead to a valid string.</p>`, `<p>Track two counters: how many "(" and how many ")" you have placed. You may add "(" while open &lt; n, and ")" while close &lt; open.</p>`, `<p>Recipe: <code>Go(open, close)</code>: if the string has length 2n, record it. If open &lt; n: add "(", recurse, remove it. If close &lt; open: add ")", recurse, remove it.</p>`],
    solution: {
      approach: `<p>Backtracking with pruning. Build the string one character at a time and keep two counts. Adding "(" is allowed while fewer than n are used. Adding ")" is allowed only while it has an opener to match (close &lt; open). Every string that reaches length 2n under these two rules is valid, so nothing has to be checked afterwards. After each recursive call, remove the character again (un-choose).</p>`,
      code: `
class Solution
{
    public IList<string> GenerateParenthesis(int n)
    {
        var res = new List<string>();
        Go(new StringBuilder(), 0, 0, n, res);
        return res;
    }

    private void Go(StringBuilder cur, int open, int close, int n, List<string> res)
    {
        if (cur.Length == 2 * n) { res.Add(cur.ToString()); return; }
        if (open < n)
        {
            cur.Append('(');                        // choose
            Go(cur, open + 1, close, n, res);       // explore
            cur.Length--;                           // un-choose
        }
        if (close < open)
        {
            cur.Append(')');
            Go(cur, open, close + 1, n, res);
            cur.Length--;
        }
    }
}`,
      dry: { head: ['Current string', 'open', 'close', 'Allowed next'], rows: [
        ['(empty)', '0', '0', 'only ('], ['(', '1', '0', '( or )'], ['((', '2', '0', 'only )'], ['(()', '2', '1', 'only )'], ['(())', '2', '2', '<span class="c-g">length 4: record it</span>'], ['()', '1', '1', 'only ('], ['()()', '2', '2', '<span class="c-g">record it</span>']
      ] },
      complexity: `<p>Time is proportional to the output: the number of valid strings is the nth Catalan number (1, 2, 5, 14, 42, …), each of length 2n. Space O(n) for the recursion, besides the output.</p>`,
      followUps: ['Add square and curly brackets too.', 'Count the valid strings without generating them.']
    }
  });

  /* ===================== PRACTICE: 4 Hard ===================== */
  practice.push({
    title: 'Merge k Sorted Lists', level: 'Hard', tags: ['linked list', 'divide and conquer', 'heap'], companies: ['Amazon', 'Google', 'Microsoft'],
    statement: `<p>You are given an array of <code>k</code> linked lists, each sorted in ascending order. Merge them all into one sorted linked list and return its head.</p>`,
    constraints: `0 ≤ k ≤ 10<sup>4</sup>, total nodes N ≤ 10<sup>4</sup>, lists may be empty (null)`,
    example: `<p>Input: <code>[1 → 4 → 5, 1 → 3 → 4, 2 → 6]</code>. Output: <span class="c-g"><b>1 → 1 → 2 → 3 → 4 → 4 → 5 → 6</b></span>.</p><p>Input: <code>[]</code> or <code>[null]</code>. Output: an empty list.</p>`,
    brute: { why: `<p>Copy every value into one list, sort it, and build a new linked list. It works in O(N log N) time, but it throws away the fact that each list is already sorted, allocates N new nodes, and needs O(N) extra memory. Merging the lists one after another into a growing result is not better: the result is re-walked k times, O(N × k).</p>`, code: `
class Brute
{
    public ListNode MergeKLists(ListNode[] lists)
    {
        var vals = new List<int>();
        foreach (ListNode head in lists)
            for (ListNode n = head; n != null; n = n.next) vals.Add(n.val);
        vals.Sort();

        var dummy = new ListNode(0);
        ListNode tail = dummy;
        foreach (int v in vals) { tail.next = new ListNode(v); tail = tail.next; }
        return dummy.next;
    }
}` },
    mcq: { q: 'You merge the lists in pairs, then merge the results in pairs, and so on. How many rounds are needed for k lists?', options: ['About log₂ k rounds, each touching all N nodes once', 'k rounds', 'N rounds', '1 round'], answer: 0, explain: 'Each round halves the number of lists, so there are log₂ k rounds. Every node is handled once per round: O(N log k) in total.' },
    hints: [`<p>You already know how to merge 2 sorted lists in linear time. Use that as the building block.</p>`, `<p>Merging one by one makes early nodes travel through many merges. Merge in pairs, like the merge step of merge sort, so each node is touched only log k times.</p>`, `<p>Recipe: <code>Merge(lists, lo, hi)</code>: if lo == hi return that list. mid = lo + (hi - lo) / 2. Return MergeTwo(Merge(lo, mid), Merge(mid + 1, hi)). Guard against an empty array. A min-heap holding the k front nodes is the other standard answer.</p>`],
    solution: {
      approach: `<p>Divide and conquer. Split the array of lists in half, merge each half recursively, then merge the two results with the standard two-list merge (dummy head, tail pointer). The recursion is log k deep and each level passes over all N nodes once. No new nodes are created, the existing ones are re-linked. With .NET 6 or later you can also use a <code>PriorityQueue&lt;ListNode, int&gt;</code> holding the front node of each list: take the smallest, push its next. That is also O(N log k).</p>`,
      code: `
class Solution
{
    public ListNode MergeKLists(ListNode[] lists)
    {
        if (lists == null || lists.Length == 0) return null;
        return Merge(lists, 0, lists.Length - 1);
    }

    private ListNode Merge(ListNode[] lists, int lo, int hi)
    {
        if (lo == hi) return lists[lo];
        int mid = lo + (hi - lo) / 2;
        return MergeTwo(Merge(lists, lo, mid), Merge(lists, mid + 1, hi));
    }

    private ListNode MergeTwo(ListNode a, ListNode b)
    {
        var dummy = new ListNode(0);
        ListNode tail = dummy;
        while (a != null && b != null)
        {
            if (a.val <= b.val) { tail.next = a; a = a.next; }
            else { tail.next = b; b = b.next; }
            tail = tail.next;
        }
        tail.next = a != null ? a : b;              // attach the rest
        return dummy.next;
    }
}`,
      dry: { head: ['Call', 'Merges', 'Result'], rows: [
        ['Merge(0, 2)', 'split into (0, 1) and (2, 2)', ''],
        ['Merge(0, 1)', '1→4→5 with 1→3→4', '1→1→3→4→4→5'],
        ['Merge(2, 2)', 'single list', '2→6'],
        ['back in Merge(0, 2)', '1→1→3→4→4→5 with 2→6', '<span class="c-g">1→1→2→3→4→4→5→6</span>']
      ] },
      complexity: `<p>Time O(N log k). Space O(log k) for the recursion, and no new nodes.</p>`,
      followUps: ['Write the heap version and compare the memory use.', 'The lists are too large for memory and live in files. What changes?']
    }
  });

  practice.push({
    title: 'Largest Rectangle in a Histogram', level: 'Hard', tags: ['monotonic stack', 'array'], companies: ['Google', 'Amazon', 'Adobe'],
    statement: `<p>Given the heights of the bars of a histogram, each bar 1 unit wide, return the area of the largest rectangle that fits entirely inside the bars.</p>`,
    constraints: `1 ≤ heights.length ≤ 10<sup>5</sup>, 0 ≤ heights[i] ≤ 10<sup>4</sup>`,
    example: `<p>Input: <code>[2, 1, 5, 6, 2, 3]</code>. Output: <span class="c-g"><b>10</b></span>. The bars 5 and 6 form a rectangle of height 5 and width 2.</p><p>Input: <code>[2, 4]</code>. Output: <b>4</b>.</p>`,
    brute: { why: `<p>Try every start bar, extend to the right one bar at a time while tracking the lowest bar so far, and compute the area each time. That checks all O(n<sup>2</sup>) ranges: for 10<sup>5</sup> bars about 5 × 10<sup>9</sup> steps. The waste: the lowest bar of a range is recomputed for ranges that mostly overlap.</p>`, code: `
class Brute
{
    public int LargestRectangleArea(int[] heights)
    {
        int best = 0;
        for (int i = 0; i < heights.Length; i++)
        {
            int min = int.MaxValue;
            for (int j = i; j < heights.Length; j++)
            {
                min = Math.Min(min, heights[j]);                 // lowest bar in i..j
                best = Math.Max(best, min * (j - i + 1));
            }
        }
        return best;
    }
}` },
    mcq: { q: 'For a bar of height h, how wide is the largest rectangle that uses its full height?', options: ['From just after the nearest lower bar on its left to just before the nearest lower bar on its right', 'Always 1', 'The whole histogram', 'Up to the tallest bar'], answer: 0, explain: 'The rectangle of height h can spread sideways until it meets a bar lower than h on each side.' },
    hints: [`<p>Think per bar, not per range: for each bar, how far can a rectangle of exactly that height stretch left and right?</p>`, `<p>It stretches until the first lower bar on each side. A stack of indexes with increasing heights gives you both limits: the bar below in the stack is the left limit, and the bar that causes the pop is the right limit.</p>`, `<p>Recipe: for i from 0 to n (use height 0 at i = n to flush): while the top bar is taller than the current height, pop it. Its width is i if the stack is now empty, otherwise i - top - 1. Update the best area. Then push i.</p>`],
    solution: {
      approach: `<p>Keep a stack of bar indexes whose heights increase from bottom to top. When a lower bar arrives at index i, the bar on top can go no further right, so pop it and compute its rectangle: its height times the distance between i and the new top of the stack (the nearest lower bar on the left). An extra round with height 0 at the end pops everything that is left. Each bar is pushed and popped once.</p>`,
      code: `
class Solution
{
    public int LargestRectangleArea(int[] heights)
    {
        var stack = new Stack<int>();                     // indexes, heights increasing
        int best = 0, n = heights.Length;
        for (int i = 0; i <= n; i++)
        {
            int h = i == n ? 0 : heights[i];              // height 0 at the end flushes the stack
            while (stack.Count > 0 && heights[stack.Peek()] > h)
            {
                int height = heights[stack.Pop()];
                int left = stack.Count == 0 ? -1 : stack.Peek();     // nearest lower bar on the left
                best = Math.Max(best, height * (i - left - 1));
            }
            stack.Push(i);
        }
        return best;
    }
}`,
      dry: { head: ['i', 'h', 'Popped: height × width', 'Stack after', 'best'], rows: [
        ['0', '2', '', '0', '0'], ['1', '1', '2 × 1 = 2', '1', '2'], ['2', '5', '', '1 2', '2'], ['3', '6', '', '1 2 3', '2'],
        ['4', '2', '6 × 1 = 6, 5 × 2 = 10', '1 4', '10'], ['5', '3', '', '1 4 5', '10'], ['6 (end)', '0', '3 × 1 = 3, 2 × 4 = 8, 1 × 6 = 6', '6', '<span class="c-g">10</span>']
      ] },
      complexity: `<p>Time O(n): each index is pushed once and popped once. Space O(n). Areas fit in an <code>int</code> here (at most 10<sup>4</sup> × 10<sup>5</sup> = 10<sup>9</sup>).</p>`,
      followUps: ['Find the largest rectangle of 1s in a 0/1 matrix.', 'What if the areas could overflow an <code>int</code>?']
    }
  });

  practice.push({
    title: 'Binary Tree Maximum Path Sum', level: 'Hard', tags: ['tree', 'dfs'], companies: ['Meta', 'Microsoft', 'Amazon'],
    statement: `<p>A path in a binary tree is a chain of nodes joined by edges, where each node appears at most once. The path can start and end at any node and does not need to pass through the root. Return the largest possible sum of the values on a path. A path has at least one node.</p>`,
    constraints: `1 ≤ number of nodes ≤ 3 × 10<sup>4</sup>, -1000 ≤ val ≤ 1000`,
    example: `<p>Tree: root -10, left child 9, right child 20, and 20 has children 15 and 7. Output: <span class="c-g"><b>42</b></span>, from the path 15 → 20 → 7.</p><p>Tree: a single node -3. Output: <b>-3</b>. The path cannot be empty.</p>`,
    brute: { why: `<p>For every node, compute the best path that bends at that node: its value plus the best downward path of each child (ignored when negative). The downward paths are recomputed from scratch for every node, so a chain-shaped tree costs O(n<sup>2</sup>).</p>`, code: `
class Brute
{
    public int MaxPathSum(TreeNode root)
    {
        if (root == null) return int.MinValue;
        int through = root.val + Math.Max(0, Down(root.left)) + Math.Max(0, Down(root.right));
        return Math.Max(through, Math.Max(MaxPathSum(root.left), MaxPathSum(root.right)));
    }

    // Best sum of a path that starts at n and only goes down.
    private int Down(TreeNode n)
    {
        if (n == null) return 0;
        return n.val + Math.Max(0, Math.Max(Down(n.left), Down(n.right)));
    }
}` },
    mcq: { q: 'A node can use both of its children to form a path that bends at it. What may it hand UP to its parent?', options: ['Its value plus the better ONE of its two sides (or neither)', 'Its value plus both sides', 'Only its own value', 'The best path found anywhere in its subtree'], answer: 0, explain: 'A path cannot fork. If the parent extends the path through this node, it can continue down only one side.' },
    hints: [`<p>Separate two ideas: the best path that <b>bends</b> at a node (may use both children) and the best path a node can <b>offer its parent</b> (one side only).</p>`, `<p>One post-order DFS can return the "offer" and update a global best with the "bend" value at every node.</p>`, `<p>Recipe: <code>Gain(n)</code>: null gives 0. left = max(0, Gain(left)), right = max(0, Gain(right)). best = max(best, n.val + left + right). Return n.val + max(left, right). Start best at int.MinValue, because all values may be negative.</p>`],
    solution: {
      approach: `<p>One DFS that returns, for each node, the largest sum of a path that starts at that node and goes down one side. A negative side is replaced by 0, which means "do not go that way". While the call has both side gains in hand, it also tests the path that bends here (<code>val + left + right</code>) against the best seen so far. The best must start at <code>int.MinValue</code>, not 0, so a tree of only negative values returns its largest single node.</p>`,
      code: `
class Solution
{
    private int _best;

    public int MaxPathSum(TreeNode root)
    {
        _best = int.MinValue;
        Gain(root);
        return _best;
    }

    // Largest sum of a path that starts at n and goes down one side.
    private int Gain(TreeNode n)
    {
        if (n == null) return 0;
        int left = Math.Max(0, Gain(n.left));           // drop a side that would lower the sum
        int right = Math.Max(0, Gain(n.right));
        _best = Math.Max(_best, n.val + left + right);  // the path that bends at n
        return n.val + Math.Max(left, right);           // what the parent may extend
    }
}`,
      dry: { head: ['Node', 'left gain', 'right gain', 'val + left + right', 'best', 'returns'], rows: [
        ['9', '0', '0', '9', '9', '9'], ['15', '0', '0', '15', '15', '15'], ['7', '0', '0', '7', '15', '7'], ['20', '15', '7', '42', '<span class="c-g">42</span>', '35'], ['-10', '9', '35', '34', '42', '25']
      ] },
      complexity: `<p>Time O(n), each node once. Space O(h) for the recursion.</p>`,
      followUps: ['Return the nodes on the best path.', 'The tree is 100,000 nodes deep. How do you avoid a stack overflow?']
    }
  });

  practice.push({
    title: 'Regular Expression Matching', level: 'Hard', tags: ['dynamic programming', 'string', 'recursion'], companies: ['Google', 'Meta', 'Microsoft'],
    statement: `<p>Implement matching of a whole string <code>s</code> against a pattern <code>p</code> with two special characters: <code>.</code> matches any single character, and <code>*</code> means "zero or more of the character just before it". The match must cover the entire string.</p>`,
    constraints: `1 ≤ s.length ≤ 20, 1 ≤ p.length ≤ 20, s has lowercase letters, p has lowercase letters, '.' and '*', and every '*' follows a valid character`,
    example: `<p>s = <code>"aa"</code>, p = <code>"a"</code> → <span class="c-r"><b>false</b></span> (the pattern covers only one "a").</p><p>s = <code>"aa"</code>, p = <code>"a*"</code> → <span class="c-g"><b>true</b></span>.</p><p>s = <code>"aab"</code>, p = <code>"c*a*b"</code> → <span class="c-g"><b>true</b></span>: zero "c", two "a", one "b".</p><p>s = <code>"ab"</code>, p = <code>".*"</code> → <b>true</b>: ".*" is "any character, any number of times".</p>`,
    brute: { why: `<p>Recursion that follows the rules directly: if the next pattern character is followed by <code>*</code>, either skip the pair (zero copies) or use one copy and stay on the pair. Otherwise match one character and move both forward. It is correct, but a pattern like <code>a*a*a*a*…</code> makes the same (i, j) position get solved again and again, so the time is exponential.</p>`, code: `
class Brute
{
    public bool IsMatch(string s, string p) { return Match(s, 0, p, 0); }

    private bool Match(string s, int i, string p, int j)
    {
        if (j == p.Length) return i == s.Length;                     // pattern used up: text must be too
        bool first = i < s.Length && (p[j] == '.' || p[j] == s[i]);
        if (j + 1 < p.Length && p[j + 1] == '*')
            return Match(s, i, p, j + 2)                             // use the pair zero times
                || (first && Match(s, i + 1, p, j));                 // use it once and stay on it
        return first && Match(s, i + 1, p, j + 1);
    }
}` },
    mcq: { q: 'The pattern at position j is "x*". Which two options cover every case?', options: ['Skip "x*" entirely, or match one character with x and keep "x*" for more', 'Match exactly one x, or exactly two', 'Always skip it', 'Match as many x as possible and never go back'], answer: 0, explain: '"Zero or more" is either zero (skip the pair) or one-plus-more (consume one character and stay). Taking as many as possible without going back fails for patterns such as a*a.' },
    hints: [`<p>The answer for "does s from i match p from j" depends only on i and j. There are at most 21 × 21 such pairs, so save them.</p>`, `<p>Let <code>dp[i, j]</code> be true when s[i..] matches p[j..]. Fill it from the end backwards, so the cells you need (i + 1 and j + 1, j + 2) are ready.</p>`, `<p>Recipe: dp[n, m] = true. For i from n down to 0, j from m - 1 down to 0: first = i &lt; n and (p[j] is '.' or equals s[i]). If p[j + 1] is '*': dp[i, j] = dp[i, j + 2] or (first and dp[i + 1, j]). Otherwise dp[i, j] = first and dp[i + 1, j + 1].</p>`],
    solution: {
      approach: `<p>Turn the recursion into a table. <b>State:</b> <code>dp[i, j]</code> is true when the rest of the string from i matches the rest of the pattern from j. <b>Base:</b> <code>dp[n, m]</code> is true (both used up). Row i = n (empty rest of the string) must still be filled, because patterns such as <code>a*</code> match nothing. <b>Transition:</b> the same two rules as the recursion. <b>Order:</b> from the bottom-right corner backwards. <b>Answer:</b> <code>dp[0, 0]</code>.</p>`,
      code: `
class Solution
{
    public bool IsMatch(string s, string p)
    {
        int n = s.Length, m = p.Length;
        var dp = new bool[n + 1, m + 1];          // dp[i, j]: s from i matches p from j
        dp[n, m] = true;                          // nothing left on either side
        for (int i = n; i >= 0; i--)
            for (int j = m - 1; j >= 0; j--)
            {
                bool first = i < n && (p[j] == '.' || p[j] == s[i]);
                if (j + 1 < m && p[j + 1] == '*')
                    dp[i, j] = dp[i, j + 2]                    // zero copies
                            || (first && dp[i + 1, j]);        // one copy, stay on the pair
                else
                    dp[i, j] = first && dp[i + 1, j + 1];
            }
        return dp[0, 0];
    }
}`,
      dry: { head: ['i (rest of "aa")', 'j = 0 (rest "a*")', 'j = 1 (rest "*")', 'j = 2 (rest "")'], rows: [
        ['2 (empty)', 'true: zero copies, dp[2, 2]', 'false (never read)', 'true (base)'],
        ['1 ("a")', 'true: one copy, dp[2, 0]', 'false', 'false'],
        ['0 ("aa")', '<span class="c-g">true: one copy, dp[1, 0]</span>', 'false', 'false']
      ] },
      complexity: `<p>Time O(n × m). Space O(n × m), which can be cut to two rows.</p>`,
      followUps: ['How is wildcard matching with "?" and "*" (file name style) different?', 'How do real regex engines avoid exponential time, and what is catastrophic backtracking?']
    }
  });
  /* ===================== QUIZ ===================== */
  quiz.push(
    {"q":"You reverse a singly linked list with a loop. Which line must come FIRST inside the loop?","options":["<code>head.next = prev;</code>","<code>ListNode next = head.next;</code>","<code>prev = head;</code>","<code>head = next;</code>"],"answer":1,"explain":"If you overwrite <code>head.next</code> before saving it, the rest of the list is lost. Save the next node first, then flip the link."},
    {"q":"In Floyd's cycle detection, what do you compare to decide that there is a cycle?","options":["The node references (is it the same node object)","The values of the two nodes","The number of steps taken","The length of the list"],"answer":0,"explain":"Two different nodes can hold the same value. A cycle is proven only when slow and fast point at the very same node."},
    {"q":"A queue is built from two stacks, \"in\" and \"out\". When should items be poured from \"in\" to \"out\"?","options":["On every enqueue","On every dequeue","Only when \"out\" is empty and a dequeue is requested","Only when \"in\" is full"],"answer":2,"explain":"Pouring while \"out\" still has items would put newer items on top of older ones. Pouring only when \"out\" is empty keeps first in, first out and makes dequeue amortised O(1)."},
    {"q":"Which check correctly validates a binary search tree?","options":["Each node is larger than its left child and smaller than its right child","The tree is balanced","A level-order walk gives sorted values","Each node lies inside a (low, high) range passed down from its ancestors"],"answer":3,"explain":"The rule applies to whole subtrees. A node deep in the left subtree must still be smaller than the root, which only the range check (or a sorted in-order walk) catches."},
    {"q":"You need the fewest moves from a start cell to a target cell in a grid where every move costs the same. Which approach fits?","options":["Breadth-first search with a queue","Depth-first search","Sorting the cells","Binary search"],"answer":0,"explain":"BFS visits cells in order of distance from the start, so the first time it reaches the target it has used the fewest moves. DFS finds a path, not the shortest one."},
    {"q":"Kahn's topological sort outputs fewer nodes than the graph has. What does that tell you?","options":["The graph is not connected","The graph is a tree","The graph contains a cycle","The queue was too small"],"answer":2,"explain":"Nodes on a cycle never reach in-degree 0, so they are never output. A count below n means no valid order exists."},
    {"q":"In an LRU cache made of a dictionary and a doubly linked list, why does each list node store the key as well as the value?","options":["To keep the list sorted by key","So that eviction can remove the right entry from the dictionary","To make lookups faster","Because linked lists require keys"],"answer":1,"explain":"When the last node is evicted you must also delete its dictionary entry, and the node is the only place you can read the key from."},
    {"q":"To find the k largest of n numbers with a heap in O(n log k), which heap do you keep?","options":["A max-heap of all n numbers","A max-heap of size k","Two heaps of size n / 2","A min-heap of size k"],"answer":3,"explain":"A min-heap of size k has the smallest of the current top k at its root. When a larger number arrives, the root is removed. A max-heap of everything also works but costs O(n) memory and O(n + k log n) time."},
    {"q":"Coins are 1, 3 and 4 and the amount is 6. Greedy (largest coin first) uses 3 coins. What is the best answer and which technique finds it?","options":["2 coins (3 + 3), found by dynamic programming","3 coins, greedy is always right","1 coin, found by binary search","6 coins, found by recursion"],"answer":0,"explain":"Greedy picks 4 + 1 + 1. DP tries every coin as the last coin for every amount and finds 3 + 3."},
    {"q":"In backtracking code that collects subsets, <code>res.Add(cur)</code> is used where <code>res.Add(new List&lt;int&gt;(cur))</code> was meant. What is the result?","options":["A compile error","The subsets come out in reverse order","Every entry in the result is the same list, which is empty at the end","Duplicate subsets"],"answer":2,"explain":"All entries point at the one list that keeps being changed. After the last un-choose it is empty, so the result shows 2<sup>n</sup> empty lists."},
    {"q":"What does <code>n &amp; (n - 1)</code> do to a positive integer n?","options":["Doubles it","Clears its lowest 1 bit","Sets its lowest 0 bit","Flips every bit"],"answer":1,"explain":"Subtracting 1 turns the lowest 1 into 0 and the zeros below it into 1s. AND with the original removes exactly that lowest 1 bit. If the result is 0, n was a power of two."},
    {"q":"In C#, with default compiler settings, what happens when two <code>int</code> variables are added and the true result is larger than <code>int.MaxValue</code>?","options":["An <code>OverflowException</code> is thrown","The result becomes a <code>long</code> automatically","The result is clamped to <code>int.MaxValue</code>","The value silently wraps round to a negative number"],"answer":3,"explain":"Integer arithmetic is unchecked by default, so it wraps. Use <code>checked</code>, a <code>long</code> or <code>BigInteger</code> when the size matters."}
  );
  /* ===================== INTERVIEW: section 5, data structures ===================== */
  interview.push({
    q: 'Which collection do you pick for which job, in C# and in TypeScript?', level: 'B',
    a: `<p>You pick the collection from the operation you do most often: look up by key, keep order, take the newest, take the oldest, or take the smallest.</p>
<table><thead><tr><th>Need</th><th>C#</th><th>TypeScript / JS</th><th>Cost</th></tr></thead><tbody>
<tr><td>Growing array</td><td><code>List&lt;T&gt;</code></td><td><code>Array</code></td><td>index O(1), add at end O(1) on average, insert or remove in the middle O(n)</td></tr>
<tr><td>Key to value</td><td><code>Dictionary&lt;K,V&gt;</code></td><td><code>Map</code></td><td>O(1) on average</td></tr>
<tr><td>"Have I seen it?"</td><td><code>HashSet&lt;T&gt;</code></td><td><code>Set</code></td><td>O(1) on average</td></tr>
<tr><td>Keys kept sorted</td><td><code>SortedDictionary</code>, <code>SortedSet&lt;T&gt;</code></td><td>nothing built in</td><td>O(log n)</td></tr>
<tr><td>Last in, first out</td><td><code>Stack&lt;T&gt;</code></td><td>array with <code>push</code> / <code>pop</code></td><td>O(1)</td></tr>
<tr><td>First in, first out</td><td><code>Queue&lt;T&gt;</code></td><td>array plus a head index (<code>shift</code> can cost O(n))</td><td>O(1)</td></tr>
<tr><td>Smallest first</td><td><code>PriorityQueue&lt;TElement,TPriority&gt;</code> (.NET 6 and later)</td><td>write a small heap</td><td>O(log n)</td></tr>
<tr><td>Cheap insert or remove at a known node</td><td><code>LinkedList&lt;T&gt;</code></td><td>write a class</td><td>O(1) with the node in hand</td></tr>
<tr><td>Many threads</td><td><code>ConcurrentDictionary</code>, <code>Channel&lt;T&gt;</code>, <code>BlockingCollection</code></td><td>not needed, one thread runs your code</td><td>thread-safe</td></tr>
<tr><td>Never changes</td><td><code>ImmutableArray</code>, <code>ImmutableList</code>, <code>FrozenDictionary</code> (.NET 8 and later)</td><td><code>Object.freeze</code>, <code>readonly</code> types</td><td>safe to share</td></tr>
</tbody></table>
<p>In a coding round, say the choice and the cost in one breath: "I will use a <code>Dictionary</code> so each lookup is O(1)".</p>
<blockquote><b>Say it in the interview:</b> I choose the collection from the operation I repeat most. Key lookups mean a Dictionary or HashSet, order of arrival means a Stack or Queue, and "smallest first" means a PriorityQueue.</blockquote>`,
    followUps: ['Why is inserting at the front of a <code>List&lt;T&gt;</code> slow?', 'When would you choose <code>SortedDictionary</code> over <code>Dictionary</code>?', 'What does "amortised O(1)" mean for <code>List&lt;T&gt;.Add</code>?']
  });

  interview.push({
    q: 'Reverse a singly linked list.', level: 'B',
    a: `<p>Walk the list once and turn each arrow around so it points to the node behind it.</p>
<p>A singly linked list is a chain of nodes where each node holds a value and a link (<code>next</code>) to the node after it. You need 3 pointers: <code>prev</code> (the part already reversed), <code>head</code> (the node you are on) and <code>next</code> (saved so you do not lose the rest of the chain).</p>
${CS(`
static ListNode ReverseList(ListNode head)
{
    ListNode prev = null;
    while (head != null)
    {
        ListNode next = head.next;  // 1. remember the rest
        head.next = prev;           // 2. turn the arrow around
        prev = head;                // 3. step forward
        head = next;
    }
    return prev;                    // prev is the new first node
}
`)}
<p>TypeScript is the same 4 lines:</p>
${TS(`
const reverseList = (head: ListNode | null): ListNode | null => {
  let prev: ListNode | null = null;
  while (head) { const next = head.next; head.next = prev; prev = head; head = next; }
  return prev;
};
`)}
<p><b>Time O(n), space O(1).</b> Test it with an empty list, one node and two nodes.</p>
<blockquote><b>Say it in the interview:</b> I keep three pointers, save next before I overwrite it, flip the link, and move on. One pass, O(n) time and O(1) extra space.</blockquote>`,
    followUps: ['Write it with recursion. What is the space cost then?', 'Reverse only the nodes between position left and position right.', 'Reverse the list in groups of k nodes.']
  });

  interview.push({
    q: 'Find the middle node of a linked list in one pass.', level: 'B',
    a: `<p>Move one pointer 1 step at a time and another 2 steps at a time. When the fast one reaches the end, the slow one is in the middle.</p>
<p>This is the slow and fast pointer pattern. The fast pointer covers twice the distance, so the slow pointer has covered half of the list when the fast one runs out of nodes. You do not need to count the length first.</p>
${CS(`
static ListNode MiddleNode(ListNode head)
{
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null)
    {
        slow = slow.next;          // 1 step
        fast = fast.next.next;     // 2 steps
    }
    return slow;   // even length: the second of the two middle nodes
}
`)}
<ul><li>List 1, 2, 3, 4, 5 returns node 3.</li><li>List 1, 2, 3, 4 returns node 3 (the second middle). If the interviewer wants the first middle, loop while <code>fast.next != null &amp;&amp; fast.next.next != null</code>.</li></ul>
<p><b>Time O(n), space O(1).</b></p>
<blockquote><b>Say it in the interview:</b> Slow moves one step, fast moves two. When fast hits the end, slow is at the middle, in one pass and with no extra memory.</blockquote>`,
    followUps: ['How do you return the first middle for an even length?', 'How would you delete the middle node?', 'Where else is the slow and fast pattern used?']
  });

  interview.push({
    q: 'What is the difference between a stack and a queue, and how would you build a stack yourself?', level: 'B',
    a: `<p>A stack gives back the newest item first (last in, first out). A queue gives back the oldest item first (first in, first out).</p>
<table><thead><tr><th></th><th>Stack</th><th>Queue</th></tr></thead><tbody>
<tr><td>Picture</td><td>a pile of plates</td><td>a line at a ticket counter</td></tr>
<tr><td>Add / remove in C#</td><td><code>Push</code> / <code>Pop</code>, look with <code>Peek</code></td><td><code>Enqueue</code> / <code>Dequeue</code>, look with <code>Peek</code></td></tr>
<tr><td>Typical use</td><td>undo, matching brackets, depth-first search, the call stack</td><td>breadth-first search, job queues, buffering messages</td></tr>
</tbody></table>
<p>A stack is just an array plus a count. When the array is full, double it, so a push is O(1) on average:</p>
${CS(`
class ArrayStack
{
    private int[] _items = new int[4];
    private int _count;
    public int Count { get { return _count; } }

    public void Push(int x)
    {
        if (_count == _items.Length) Array.Resize(ref _items, _count * 2);
        _items[_count++] = x;
    }

    public int Pop()
    {
        if (_count == 0) throw new InvalidOperationException("Stack is empty");
        return _items[--_count];
    }
}
`)}
<p>A queue built on an array needs a head index that wraps around (a circular buffer). That is how <code>Queue&lt;T&gt;</code> works inside. <b>Push, pop, enqueue and dequeue are all O(1).</b></p>
<blockquote><b>Say it in the interview:</b> A stack is last in, first out and a queue is first in, first out. Both are an array with one or two indexes, and every operation is O(1).</blockquote>`,
    followUps: ['What should <code>Pop</code> do on an empty stack: throw, or return a flag?', 'How does a circular buffer avoid moving items on dequeue?', 'Build a stack using two queues.']
  });

  interview.push({
    q: 'Check that the brackets in a string are balanced: ( ) [ ] { }.', level: 'B',
    a: `<p>Push every opening bracket on a stack. For every closing bracket, the top of the stack must be its partner.</p>
<p>The most recent open bracket must be the first one to close. "Most recent first" is exactly what a stack gives you.</p>
${CS(`
static bool IsValidBrackets(string s)
{
    var open = new Stack<char>();
    foreach (char c in s)
    {
        if (c == '(' || c == '[' || c == '{') { open.Push(c); continue; }
        if (open.Count == 0) return false;            // a closer with nothing open
        char top = open.Pop();
        if ((c == ')' && top != '(') || (c == ']' && top != '[') || (c == '}' && top != '{'))
            return false;                             // wrong partner
    }
    return open.Count == 0;                           // nothing left open
}
`)}
<ul><li><code>"{[()]}"</code> is valid.</li><li><code>"(]"</code> fails: wrong partner.</li><li><code>"(("</code> fails at the end: the stack is not empty.</li><li><code>")"</code> fails at once: the stack is empty.</li></ul>
<p><b>Time O(n), space O(n).</b> People often forget the last line and return true for <code>"(("</code>.</p>
<blockquote><b>Say it in the interview:</b> I push openers and pop on closers. It is valid only if every closer finds its partner on top and the stack is empty at the end. O(n) time, O(n) space.</blockquote>`,
    followUps: ['What if the string also has letters and digits?', 'Return the index of the first bad bracket instead of true or false.', 'With only one kind of bracket, can you do it in O(1) space?']
  });

  interview.push({
    q: 'What are the tree traversals, and how do you find the height of a binary tree?', level: 'B',
    a: `<p>A traversal is an order of visiting every node. The 3 depth-first orders differ only in when you handle the node compared with its children.</p>
<table><thead><tr><th>Order</th><th>Sequence</th><th>Used for</th></tr></thead><tbody>
<tr><td>In-order</td><td>left, node, right</td><td>a binary search tree comes out sorted</td></tr>
<tr><td>Pre-order</td><td>node, left, right</td><td>copying or saving a tree</td></tr>
<tr><td>Post-order</td><td>left, right, node</td><td>deleting, or computing a value from the children</td></tr>
<tr><td>Level-order</td><td>row by row, with a queue</td><td>shortest path, printing by level</td></tr>
</tbody></table>
${CS(`
static void InOrder(TreeNode n, List<int> output)
{
    if (n == null) return;
    InOrder(n.left, output);    // left
    output.Add(n.val);          // node
    InOrder(n.right, output);   // right
}

static int Height(TreeNode n)
{
    return n == null ? 0 : 1 + Math.Max(Height(n.left), Height(n.right));
}
`)}
<p>Height is a post-order idea: ask both children for their height, take the larger, add 1 for yourself. <b>Both run in O(n) time. Space is O(h)</b> for the call stack, where h is the height: about log n for a balanced tree, n for a tree that is one long chain.</p>
<blockquote><b>Say it in the interview:</b> In-order is left, node, right and gives sorted output for a BST. Height is one plus the taller child. Both visit each node once, so O(n) time and O(height) stack space.</blockquote>`,
    followUps: ['Write in-order without recursion.', 'What is the difference between height and depth?', 'How do you check that a tree is balanced in one pass?']
  });

  interview.push({
    q: 'How do you detect a cycle in a linked list?', level: 'I',
    a: `<p>Run a slow pointer and a fast pointer. If the list loops, the fast one comes round and meets the slow one. If it does not loop, the fast one falls off the end.</p>
<p>This is Floyd's cycle detection, also called tortoise and hare. Inside a loop the gap between the two pointers shrinks by 1 on every step, so they must meet.</p>
${CS(`
static bool HasCycle(ListNode head)
{
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null)
    {
        slow = slow.next;
        fast = fast.next.next;
        if (slow == fast) return true;    // same node, not same value
    }
    return false;                         // fast reached the end
}
`)}
${TS(`
const hasCycle = (head: ListNode | null): boolean => {
  let slow = head, fast = head;
  while (fast && fast.next) { slow = slow!.next; fast = fast.next.next; if (slow === fast) return true; }
  return false;
};
`)}
<p><b>Time O(n), space O(1).</b> The simple alternative is a <code>HashSet</code> of visited nodes: also O(n) time, but O(n) memory. Compare node references, never values, because two different nodes can hold the same value.</p>
<blockquote><b>Say it in the interview:</b> I use slow and fast pointers. If they meet there is a cycle, if fast reaches null there is not. It is O(n) time and O(1) space, where a hash set would need O(n) space.</blockquote>`,
    followUps: ['How do you find the node where the cycle starts?', 'How do you find the length of the cycle?', 'Why must the two pointers meet and not jump over each other?']
  });

  interview.push({
    q: 'Merge two sorted linked lists into one sorted list.', level: 'I',
    a: `<p>Keep taking the smaller of the two front nodes and attach it to the end of the result.</p>
<p>The trick is a <b>dummy node</b>: a throwaway first node, so you never need special code for "the result is still empty". You return <code>dummy.next</code>.</p>
${CS(`
static ListNode MergeSorted(ListNode a, ListNode b)
{
    var dummy = new ListNode(0);
    ListNode tail = dummy;
    while (a != null && b != null)
    {
        if (a.val <= b.val) { tail.next = a; a = a.next; }
        else                { tail.next = b; b = b.next; }
        tail = tail.next;
    }
    tail.next = a != null ? a : b;    // attach whatever is left
    return dummy.next;
}
`)}
${TS(`
const mergeSorted = (a: ListNode | null, b: ListNode | null): ListNode | null => {
  const dummy = new ListNode(0); let tail = dummy;
  while (a && b) {
    if (a.val <= b.val) { tail.next = a; a = a.next; } else { tail.next = b; b = b.next; }
    tail = tail.next!;
  }
  tail.next = a ?? b;
  return dummy.next;
};
`)}
<p><b>Time O(n + m), space O(1)</b>, because the existing nodes are re-linked and nothing is copied. Using <code>&lt;=</code> keeps equal values in their original order (a stable merge).</p>
<blockquote><b>Say it in the interview:</b> I use a dummy head and a tail pointer, attach the smaller front node each time, then attach the leftover list. O(n + m) time and O(1) extra space.</blockquote>`,
    followUps: ['Merge k sorted lists. What is the cost?', 'Write it with recursion. What is the risk?', 'How is this step used in merge sort on a linked list?']
  });

  interview.push({
    q: 'Build a queue using two stacks.', level: 'I',
    a: `<p>Push new items on an "in" stack. To remove, pop from an "out" stack, and only when "out" is empty pour everything from "in" into it.</p>
<p>Pouring one stack into another flips the order, so the oldest item ends up on top of "out". That is first in, first out.</p>
${CS(`
class TwoStackQueue<T>
{
    private readonly Stack<T> _in = new Stack<T>(), _out = new Stack<T>();
    public int Count { get { return _in.Count + _out.Count; } }

    public void Enqueue(T x) { _in.Push(x); }

    public T Dequeue()
    {
        if (_out.Count == 0)
            while (_in.Count > 0) _out.Push(_in.Pop());   // pour only when out is empty
        if (_out.Count == 0) throw new InvalidOperationException("Queue is empty");
        return _out.Pop();
    }
}
`)}
<p><b>Cost:</b> enqueue is O(1). One dequeue can cost O(n) when it pours, but each item is pushed twice and popped twice in its whole life, so the average over many calls is O(1). That average is called <b>amortised O(1)</b>. Space is O(n).</p>
<p>The classic bug is pouring while "out" still has items. That puts newer items on top of older ones and breaks the order.</p>
<blockquote><b>Say it in the interview:</b> One stack takes the pushes, the other serves the pops, and I pour only when the out stack is empty. Each item moves at most once, so dequeue is amortised O(1).</blockquote>`,
    followUps: ['Add a <code>Peek</code> method.', 'Why is it wrong to pour when the out stack is not empty?', 'Is this class safe to use from two threads?']
  });

  interview.push({
    q: 'Design a stack that returns its minimum in O(1).', level: 'I',
    a: `<p>Store, next to every value, the smallest value in the stack at the moment it was pushed.</p>
<p>When you pop, the value and its remembered minimum leave together, so the new top already knows the minimum of what remains. Nothing needs to be searched.</p>
${CS(`
class MinStack
{
    private readonly Stack<(int val, int min)> _s = new Stack<(int val, int min)>();

    public void Push(int x)
    {
        int min = _s.Count == 0 ? x : Math.Min(x, _s.Peek().min);
        _s.Push((x, min));
    }
    public int Pop() { return _s.Pop().val; }
    public int Top() { return _s.Peek().val; }
    public int GetMin() { return _s.Peek().min; }
}
`)}
<table><thead><tr><th>Push</th><th>Stack of (value, min so far)</th><th>GetMin</th></tr></thead><tbody>
<tr><td>5</td><td>(5,5)</td><td>5</td></tr><tr><td>3</td><td>(5,5) (3,3)</td><td>3</td></tr><tr><td>7</td><td>(5,5) (3,3) (7,3)</td><td>3</td></tr><tr><td>pop, pop</td><td>(5,5)</td><td>5</td></tr></tbody></table>
<p><b>Every operation is O(1). Space is O(n)</b>, one extra number per item. A second stack that holds only the minimums does the same job.</p>
<blockquote><b>Say it in the interview:</b> Each entry carries the minimum of everything beneath it, so the minimum is always on top. All operations stay O(1), at the cost of one extra number per item.</blockquote>`,
    followUps: ['Do it with a second stack that only stores a value when the minimum changes.', 'How would you build a queue with an O(1) minimum?', 'What should <code>GetMin</code> do on an empty stack?']
  });

  interview.push({
    q: 'For each number in an array, find the next greater number to its right.', level: 'I',
    a: `<p>Keep a stack of positions that are still waiting for a bigger number. Each new number answers every waiting position that is smaller than it.</p>
<p>The values on the stack always go down from bottom to top, so this is called a <b>monotonic stack</b>. Positions that never get an answer keep -1.</p>
${CS(`
static int[] NextGreater(int[] a)
{
    var res = new int[a.Length];
    for (int i = 0; i < res.Length; i++) res[i] = -1;
    var waiting = new Stack<int>();                  // indexes, values decreasing
    for (int i = 0; i < a.Length; i++)
    {
        while (waiting.Count > 0 && a[waiting.Peek()] < a[i])
            res[waiting.Pop()] = a[i];               // a[i] is their answer
        waiting.Push(i);
    }
    return res;
}
`)}
${TS(`
const nextGreater = (a: number[]): number[] => {
  const res: number[] = new Array(a.length).fill(-1), st: number[] = [];
  for (let i = 0; i < a.length; i++) {
    while (st.length && a[st[st.length - 1]] < a[i]) res[st.pop()!] = a[i];
    st.push(i);
  }
  return res;
};
`)}
<p>For <code>[2, 1, 5, 3, 6]</code> the answer is <code>[5, 5, 6, 6, -1]</code>.</p>
<p><b>Time O(n)</b>: the inner <code>while</code> looks like a second loop, but every index is pushed once and popped at most once. <b>Space O(n).</b> The brute force checks every pair and costs O(n<sup>2</sup>).</p>
<blockquote><b>Say it in the interview:</b> I keep a decreasing stack of indexes that have no answer yet. A bigger number pops them and becomes their answer. Each index is pushed and popped once, so it is O(n).</blockquote>`,
    followUps: ['What changes if the array is circular?', 'Find the number of days until a warmer temperature.', 'Why do you store indexes and not values?']
  });

  interview.push({
    q: 'How does <code>Dictionary&lt;K,V&gt;</code> find a key so fast, and what can go wrong?', level: 'I',
    a: `<p>It turns the key into a number (the hash code), uses that number to jump straight to one small bucket, and only compares the few keys in that bucket.</p>
<ol><li><code>GetHashCode()</code> gives an <code>int</code> for the key.</li><li>The hash, modulo the number of buckets, picks a bucket.</li><li>Keys that land in the same bucket (a <b>collision</b>) are chained together. <code>Equals</code> finds the right one.</li><li>When the entries fill up, the dictionary grows to a larger size and re-places every entry. This is why one <code>Add</code> is sometimes slow, but the average stays O(1).</li></ol>
<table><thead><tr><th>Thing that goes wrong</th><th>Why</th></tr></thead><tbody>
<tr><td>Key not found after you changed it</td><td>A key whose hash changes while inside the dictionary now sits in the wrong bucket. Use keys that do not change.</td></tr>
<tr><td>Two "equal" keys both stored</td><td>You overrode <code>Equals</code> but not <code>GetHashCode</code>. Equal objects must return equal hash codes.</td></tr>
<tr><td>Slow lookups</td><td>A weak hash sends many keys to the same bucket, so the worst case is O(n).</td></tr>
<tr><td>Corruption under load</td><td>It is not safe for one thread to write while others read or write. Use <code>ConcurrentDictionary</code> or a lock.</td></tr>
<tr><td>Relying on order</td><td>The order of enumeration is not promised. Use a sorted or ordered collection if order matters.</td></tr>
</tbody></table>
<p><b>Lookup, add and remove are O(1) on average and O(n) in the worst case. Space is O(n).</b></p>
<blockquote><b>Say it in the interview:</b> A dictionary hashes the key to pick a bucket and uses Equals inside the bucket, so lookups are O(1) on average. Keys must be stable and must implement GetHashCode and Equals together.</blockquote>`,
    followUps: ['Why should you use <code>TryGetValue</code> and not <code>ContainsKey</code> followed by the indexer?', 'What makes a good hash function?', 'How do <code>record</code> types and tuples behave as keys?']
  });

  interview.push({
    q: 'Print a binary tree level by level.', level: 'I',
    a: `<p>Use a queue: take a node from the front, record it, and add its children at the back. That visits the tree row by row.</p>
<p>This is breadth-first search (BFS). To know where one row ends, read the queue size at the start of each row. That many nodes belong to the current row.</p>
${CS(`
static List<List<int>> LevelOrder(TreeNode root)
{
    var res = new List<List<int>>();
    if (root == null) return res;
    var q = new Queue<TreeNode>();
    q.Enqueue(root);
    while (q.Count > 0)
    {
        var level = new List<int>();
        for (int i = q.Count; i > 0; i--)        // only the nodes of this row
        {
            TreeNode n = q.Dequeue();
            level.Add(n.val);
            if (n.left != null) q.Enqueue(n.left);
            if (n.right != null) q.Enqueue(n.right);
        }
        res.Add(level);
    }
    return res;
}
`)}
<p>A tree with root 1, children 2 and 3, and 4, 5 under node 2 gives <code>[[1], [2, 3], [4, 5]]</code>.</p>
<p><b>Time O(n). Space O(w)</b>, where w is the widest row. For a full tree the last row holds about n / 2 nodes, so the worst case is O(n).</p>
<blockquote><b>Say it in the interview:</b> Level order is BFS with a queue. I snapshot the queue size to process one row at a time. O(n) time, and space equal to the widest level.</blockquote>`,
    followUps: ['Return the rows in zigzag order.', 'Return the right-side view of the tree.', 'When is BFS better than DFS on a tree?']
  });

  interview.push({
    q: 'Check that a binary tree is a valid binary search tree.', level: 'I',
    a: `<p>Every node must sit inside a range set by its ancestors: bigger than everything on its left side, smaller than everything on its right side.</p>
<p>Checking only "left child &lt; node &lt; right child" is the well-known wrong answer. A value deep in the left subtree can still be larger than the root. So pass a low and a high limit down the tree and tighten one of them at each step.</p>
${CS(`
static bool IsBst(TreeNode n, long lo = long.MinValue, long hi = long.MaxValue)
{
    if (n == null) return true;
    if (n.val <= lo || n.val >= hi) return false;      // outside the allowed range
    return IsBst(n.left, lo, n.val)                    // left side: everything below n.val
        && IsBst(n.right, n.val, hi);                  // right side: everything above n.val
}
`)}
${TS(`
const isBst = (n: TreeNode | null, lo = -Infinity, hi = Infinity): boolean =>
  !n || (n.val > lo && n.val < hi && isBst(n.left, lo, n.val) && isBst(n.right, n.val, hi));
`)}
<p>The limits are <code>long</code> so that a node holding <code>int.MinValue</code> or <code>int.MaxValue</code> is still accepted. A second way: do an in-order walk and check that each value is larger than the one before it.</p>
<p><b>Time O(n), space O(h)</b> for the recursion, h being the height.</p>
<blockquote><b>Say it in the interview:</b> I pass down a low and a high bound and tighten them as I go, because the rule applies to whole subtrees, not just parent and child. O(n) time, O(height) space.</blockquote>`,
    followUps: ['Show a tree that passes the parent-and-child check but is not a BST.', 'How do you handle duplicate values?', 'Do the in-order version with O(1) extra variables.']
  });

  interview.push({
    q: 'Walk a graph with breadth-first search and with depth-first search.', level: 'I',
    a: `<p>BFS visits nodes in rings around the start, nearest first, using a queue. DFS follows one path as far as it can and then backs up, using recursion or a stack.</p>
<p>A graph is a set of nodes joined by edges. Store it as an <b>adjacency list</b>: for each node, the list of its neighbours. Unlike a tree, a graph can loop, so you must remember what you have seen.</p>
${CS(`
static List<int> Bfs(Dictionary<int, List<int>> g, int start)
{
    var seen = new HashSet<int> { start };
    var order = new List<int>();
    var q = new Queue<int>();
    q.Enqueue(start);
    while (q.Count > 0)
    {
        int u = q.Dequeue();
        order.Add(u);
        List<int> next;
        if (!g.TryGetValue(u, out next)) continue;
        foreach (int v in next)
            if (seen.Add(v)) q.Enqueue(v);     // Add returns false if already seen
    }
    return order;
}

static void Dfs(Dictionary<int, List<int>> g, int u, HashSet<int> seen, List<int> order)
{
    if (!seen.Add(u)) return;
    order.Add(u);
    List<int> next;
    if (g.TryGetValue(u, out next))
        foreach (int v in next) Dfs(g, v, seen, order);
}
`)}
<table><thead><tr><th></th><th>BFS</th><th>DFS</th></tr></thead><tbody>
<tr><td>Structure</td><td>queue</td><td>recursion or a stack</td></tr>
<tr><td>Best for</td><td>fewest steps in an unweighted graph</td><td>"is there a path", cycles, ordering, all combinations</td></tr></tbody></table>
<p><b>Both are O(V + E) time and O(V) space</b> (V nodes, E edges). Mark a node as seen when you add it to the queue, not when you take it out, or it can be queued many times.</p>
<blockquote><b>Say it in the interview:</b> BFS uses a queue and gives the shortest path by number of edges. DFS uses recursion and suits path and cycle questions. Both are O(V + E) with a visited set.</blockquote>`,
    followUps: ['Adjacency list or adjacency matrix: when is each better?', 'How do you return the shortest path itself, not just its length?', 'What happens to recursive DFS on a graph with a million nodes in a line?']
  });

  interview.push({
    q: 'Count the islands in a grid of land and water.', level: 'I',
    a: `<p>Scan every cell. Each time you find land you have not visited, count 1 island and then flood the whole island so you never count it again.</p>
<p>The grid is a graph in disguise: each cell is a node and its up, down, left and right neighbours are its edges. "Flood" means a DFS (or BFS) that marks every connected land cell.</p>
${CS(`
static int NumIslands(char[][] grid)
{
    int count = 0;
    for (int r = 0; r < grid.Length; r++)
        for (int c = 0; c < grid[r].Length; c++)
            if (grid[r][c] == '1') { count++; Sink(grid, r, c); }
    return count;
}

static void Sink(char[][] g, int r, int c)
{
    if (r < 0 || r >= g.Length || c < 0 || c >= g[r].Length || g[r][c] != '1') return;
    g[r][c] = '0';                   // mark as visited by turning land into water
    Sink(g, r + 1, c); Sink(g, r - 1, c); Sink(g, r, c + 1); Sink(g, r, c - 1);
}
`)}
<p><b>Time O(rows × cols)</b>: each cell is sunk at most once. <b>Space O(rows × cols)</b> in the worst case for the recursion, when the whole grid is one snake-shaped island.</p>
<ul><li>This version changes the input. Say so, and offer a separate <code>bool[,] seen</code> if the caller needs the grid untouched.</li><li>For very large grids use BFS with a queue so deep recursion cannot overflow the stack.</li></ul>
<blockquote><b>Say it in the interview:</b> I treat the grid as a graph, and every unvisited land cell starts one flood fill and adds one to the count. Each cell is visited once, so it is O(rows times columns).</blockquote>`,
    followUps: ['Return the area of the largest island.', 'Cells are added one at a time and you must report the count after each. Which structure helps?', 'What changes if diagonal neighbours also connect?']
  });

  interview.push({
    q: 'Find the lowest common ancestor of two nodes in a binary tree.', level: 'A',
    a: `<p>The lowest common ancestor (LCA) is the deepest node that has both targets somewhere below it (a node counts as below itself). Search both sides of each node: the first node that finds one target on each side is the answer.</p>
${CS(`
static TreeNode Lca(TreeNode root, TreeNode p, TreeNode q)
{
    if (root == null || root == p || root == q) return root;   // found a target, or nothing here
    TreeNode left = Lca(root.left, p, q);
    TreeNode right = Lca(root.right, p, q);
    if (left != null && right != null) return root;            // one on each side: this is it
    return left != null ? left : right;                        // pass up whatever was found
}
`)}
<p>Each call answers one question: "is p or q in this subtree, and if both are, where do they first join?"</p>
<ul><li>Both sides return a node: the targets split here, so this node is the LCA.</li><li>One side returns a node: both targets are on that side (or only one exists), so pass it up.</li><li>If p is an ancestor of q, the search stops at p and p is returned. That is correct.</li></ul>
<p><b>Time O(n), space O(h).</b> This assumes both nodes are in the tree. In a binary search tree it is simpler: walk down from the root and stop at the first node whose value lies between the two values, which costs O(h).</p>
<blockquote><b>Say it in the interview:</b> I search both subtrees. If each side finds one target, the current node is the lowest common ancestor, otherwise I pass up the side that found something. O(n) time, O(height) space.</blockquote>`,
    followUps: ['What if one of the nodes might not be in the tree?', 'How does it get simpler for a binary search tree?', 'What if every node has a parent pointer?']
  });

  interview.push({
    q: 'Order tasks so that every prerequisite comes first (topological sort). How do you know if it is impossible?', level: 'A',
    a: `<p>Keep taking a task that has no unfinished prerequisites. If you run out of such tasks while some remain, those tasks depend on each other in a circle and no order exists.</p>
<p>This is <b>Kahn's algorithm</b>. The <b>in-degree</b> of a node is how many edges point into it, which here means how many prerequisites are still open.</p>
${CS(`
// edge [a, b] means: a must come before b. Returns null when there is a cycle.
static int[] TopoSort(int n, int[][] edges)
{
    var adj = new List<int>[n];
    for (int i = 0; i < n; i++) adj[i] = new List<int>();
    var indeg = new int[n];
    foreach (int[] e in edges) { adj[e[0]].Add(e[1]); indeg[e[1]]++; }

    var ready = new Queue<int>();
    for (int i = 0; i < n; i++) if (indeg[i] == 0) ready.Enqueue(i);

    var order = new List<int>();
    while (ready.Count > 0)
    {
        int u = ready.Dequeue();
        order.Add(u);
        foreach (int v in adj[u])
            if (--indeg[v] == 0) ready.Enqueue(v);   // last prerequisite done
    }
    return order.Count == n ? order.ToArray() : null;
}
`)}
${TS(`
const topoSort = (n: number, edges: [number, number][]): number[] | null => {
  const adj: number[][] = Array.from({ length: n }, () => []);
  const indeg: number[] = new Array(n).fill(0);
  for (const [a, b] of edges) { adj[a].push(b); indeg[b]++; }
  const q: number[] = [];
  indeg.forEach((d, i) => { if (d === 0) q.push(i); });
  const order: number[] = [];
  for (let h = 0; h < q.length; h++) { const u = q[h]; order.push(u); for (const v of adj[u]) if (--indeg[v] === 0) q.push(v); }
  return order.length === n ? order : null;
};
`)}
<p><b>Time O(V + E), space O(V + E).</b> Real uses: build order of projects, package installs, database migrations, course planning.</p>
<blockquote><b>Say it in the interview:</b> I count incoming edges, start with the nodes that have none, and release neighbours as their count reaches zero. If I output fewer than n nodes there is a cycle. O(V + E).</blockquote>`,
    followUps: ['Can there be more than one valid order? How would you return the smallest one?', 'Do it with DFS.', 'How would you report which tasks form the cycle?']
  });

  interview.push({
    q: 'Detect a cycle in a directed graph using depth-first search.', level: 'A',
    a: `<p>During DFS, if you reach a node that is still on the path you are walking right now, you have gone round in a circle.</p>
<p>A plain "visited" flag is not enough in a directed graph. Two paths can lead to the same node without any loop (A to C and B to C). So each node gets one of 3 states.</p>
<table><thead><tr><th>State</th><th>Meaning</th></tr></thead><tbody>
<tr><td>0, new</td><td>not visited yet</td></tr>
<tr><td>1, in progress</td><td>on the current path (still on the call stack)</td></tr>
<tr><td>2, done</td><td>fully explored, known to be safe</td></tr></tbody></table>
${CS(`
static bool HasCycleDirected(int n, List<int>[] adj)
{
    var state = new int[n];
    for (int i = 0; i < n; i++)
        if (state[i] == 0 && Visit(i, adj, state)) return true;
    return false;
}

static bool Visit(int u, List<int>[] adj, int[] state)
{
    state[u] = 1;                                              // on the current path
    foreach (int v in adj[u])
    {
        if (state[v] == 1) return true;                        // back to the path: cycle
        if (state[v] == 0 && Visit(v, adj, state)) return true;
    }
    state[u] = 2;                                              // finished, safe
    return false;
}
`)}
<p><b>Time O(V + E), space O(V).</b> The outer loop matters: the graph may be in several pieces. For an undirected graph the rule is different: a visited neighbour that is not the node you just came from means a cycle, or use Union-Find.</p>
<blockquote><b>Say it in the interview:</b> I colour nodes new, in progress and done. An edge to an in-progress node is a back edge, which means a cycle. One visited flag would give false alarms. O(V + E).</blockquote>`,
    followUps: ['Why does a single visited set give wrong answers here?', 'How do you detect a cycle in an undirected graph?', 'How would you print the nodes of the cycle?']
  });

  interview.push({
    q: 'Design an LRU cache with O(1) get and put.', level: 'A',
    a: `<p>An LRU (least recently used) cache holds a fixed number of items and, when full, throws out the one that has gone unused the longest. Use a hash map to find an item and a doubly linked list to keep items in order of use.</p>
<ul><li>The <b>map</b> goes from key to the list node, so finding is O(1).</li><li>The <b>list</b> has the most recently used at the front. Moving a node to the front and removing the last node are O(1) because each node knows both neighbours.</li></ul>
${CS(`
class LruCache<K, V>
{
    private readonly int _cap;
    private readonly Dictionary<K, LinkedListNode<KeyValuePair<K, V>>> _map =
        new Dictionary<K, LinkedListNode<KeyValuePair<K, V>>>();
    private readonly LinkedList<KeyValuePair<K, V>> _list =
        new LinkedList<KeyValuePair<K, V>>();                 // front = most recently used

    public LruCache(int capacity)
    {
        if (capacity < 1) throw new ArgumentOutOfRangeException("capacity");
        _cap = capacity;
    }

    public bool TryGet(K key, out V value)
    {
        LinkedListNode<KeyValuePair<K, V>> node;
        if (!_map.TryGetValue(key, out node)) { value = default(V); return false; }
        _list.Remove(node);
        _list.AddFirst(node);                                 // it was just used
        value = node.Value.Value;
        return true;
    }

    public void Put(K key, V value)
    {
        LinkedListNode<KeyValuePair<K, V>> node;
        if (_map.TryGetValue(key, out node)) _list.Remove(node);      // replace old value
        else if (_map.Count == _cap)
        {
            _map.Remove(_list.Last.Value.Key);                // evict least recently used
            _list.RemoveLast();
        }
        _map[key] = _list.AddFirst(new KeyValuePair<K, V>(key, value));
    }
}
`)}
<p>In TypeScript a <code>Map</code> remembers insertion order, so it can do both jobs:</p>
${TS(`
class LruCache<K, V> {
  private map = new Map<K, V>();                 // oldest entry first
  private cap: number;
  constructor(cap: number) { this.cap = cap; }
  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined;
    const v = this.map.get(key)!;
    this.map.delete(key); this.map.set(key, v);  // move to newest
    return v;
  }
  put(key: K, value: V): void {
    this.map.delete(key);
    if (this.map.size >= this.cap) this.map.delete(this.map.keys().next().value as K);
    this.map.set(key, value);
  }
}
`)}
<p><b>Get and put are O(1). Space is O(capacity).</b> The list node stores the key as well as the value, because eviction must remove the key from the map.</p>
<blockquote><b>Say it in the interview:</b> A dictionary finds the node in O(1) and a doubly linked list keeps the usage order, so I can move to front and evict from the back in O(1). The node stores the key so eviction can clean the dictionary.</blockquote>`,
    followUps: ['Why a doubly linked list and not a singly linked one?', 'Add an expiry time to each entry.', 'How does LFU (least frequently used) differ?']
  });

  interview.push({
    q: 'Find the k most frequent numbers in an array. Where does a heap help?', level: 'A',
    a: `<p>Count each number with a dictionary, then keep only the best k in a small heap instead of sorting everything.</p>
<p>A <b>heap</b> is a structure that always hands you its smallest item (a min-heap) in O(log n). The trick: keep a min-heap of size k ordered by count. When it grows past k, remove the smallest. What survives is the top k.</p>
${CS(`
static int[] TopKFrequent(int[] nums, int k)
{
    var freq = new Dictionary<int, int>();
    foreach (int x in nums) { int c; freq.TryGetValue(x, out c); freq[x] = c + 1; }

    var heap = new PriorityQueue<int, int>();        // element = number, priority = count
    foreach (var p in freq)
    {
        heap.Enqueue(p.Key, p.Value);
        if (heap.Count > k) heap.Dequeue();          // drop the least frequent
    }

    var res = new int[heap.Count];
    for (int i = res.Length - 1; i >= 0; i--) res[i] = heap.Dequeue();   // most frequent first
    return res;
}
`)}
${TS(`
const topK = (nums: number[], k: number): number[] => {
  const freq = new Map<number, number>();
  for (const n of nums) freq.set(n, (freq.get(n) ?? 0) + 1);
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, k).map(([n]) => n);
};
`)}
<table><thead><tr><th>Approach</th><th>Time</th></tr></thead><tbody>
<tr><td>Sort all distinct numbers by count (the TypeScript version)</td><td>O(n log n)</td></tr>
<tr><td>Min-heap of size k</td><td>O(n log k)</td></tr>
<tr><td>Bucket sort: bucket i holds the numbers seen i times</td><td>O(n)</td></tr></tbody></table>
<p><b>Space O(n)</b> for the counts. <code>PriorityQueue&lt;TElement,TPriority&gt;</code> exists from .NET 6. It is a min-heap, it has no "change priority" method, and items with equal priority come out in no promised order.</p>
<blockquote><b>Say it in the interview:</b> I count with a dictionary, then keep a min-heap of size k so the least frequent falls out. That is O(n log k), better than sorting, and bucket sort can reach O(n).</blockquote>`,
    followUps: ['How do you get a max-heap from <code>PriorityQueue</code>?', 'Write the bucket sort version.', 'How would you keep a running top k over a stream?']
  });

  interview.push({
    q: 'Implement a trie (prefix tree) with insert, search and startsWith.', level: 'A',
    a: `<p>A trie stores words letter by letter along a path from the root, so words that start the same way share the same first nodes.</p>
<p>Each node has a map from a letter to a child node, plus a flag that says "a word ends here". The flag matters: after inserting "card", the path for "car" exists, but "car" is not a word unless its flag is set.</p>
${CS(`
class Trie
{
    private class Node
    {
        public Dictionary<char, Node> Kids = new Dictionary<char, Node>();
        public bool End;
    }
    private readonly Node _root = new Node();

    public void Insert(string word)
    {
        Node n = _root;
        foreach (char c in word)
        {
            Node next;
            if (!n.Kids.TryGetValue(c, out next)) { next = new Node(); n.Kids[c] = next; }
            n = next;
        }
        n.End = true;
    }

    private Node Find(string prefix)
    {
        Node n = _root;
        foreach (char c in prefix)
            if (!n.Kids.TryGetValue(c, out n)) return null;
        return n;
    }

    public bool Search(string word) { Node n = Find(word); return n != null && n.End; }
    public bool StartsWith(string prefix) { return Find(prefix) != null; }
}
`)}
<p><b>Insert, search and startsWith are O(L)</b>, L being the length of the word, no matter how many words are stored. <b>Space is O(total letters)</b> in the worst case.</p>
<ul><li>Use it for autocomplete, spell check and "does any word start with this".</li><li>A <code>HashSet&lt;string&gt;</code> is simpler and smaller if you only ever ask for whole words.</li><li>For lowercase a to z only, a 26-slot array per node is faster than a dictionary.</li></ul>
<blockquote><b>Say it in the interview:</b> A trie shares common prefixes, each node has children by letter and an end-of-word flag. Every operation costs the length of the word, which makes prefix search cheap.</blockquote>`,
    followUps: ['Return the top 5 completions for a prefix.', 'How do you delete a word?', 'How would you support a "." wildcard in search?']
  });

  interview.push({
    q: 'What is Union-Find, and how do you use it to count connected groups?', level: 'A',
    a: `<p>Union-Find (also called a disjoint set) keeps items in groups and answers two things quickly: "which group is this item in?" and "join these two groups".</p>
<p>Each item points to a parent, and the item at the top of a chain (the root) names the group. Two tricks keep the chains very short:</p>
<ul><li><b>Path compression</b>: after finding the root, point every item on the way straight at it.</li><li><b>Union by rank</b>: hang the shorter tree under the taller one.</li></ul>
${CS(`
class UnionFind
{
    private readonly int[] _parent, _rank;
    public int Components { get; private set; }

    public UnionFind(int n)
    {
        _parent = new int[n]; _rank = new int[n]; Components = n;
        for (int i = 0; i < n; i++) _parent[i] = i;          // everyone starts alone
    }

    public int Find(int x)
    {
        if (_parent[x] != x) _parent[x] = Find(_parent[x]);  // path compression
        return _parent[x];
    }

    public bool Union(int a, int b)
    {
        int ra = Find(a), rb = Find(b);
        if (ra == rb) return false;                          // already together
        if (_rank[ra] < _rank[rb]) { int t = ra; ra = rb; rb = t; }
        _parent[rb] = ra;                                    // shorter under taller
        if (_rank[ra] == _rank[rb]) _rank[ra]++;
        Components--;
        return true;
    }
}
`)}
<p>To count groups, start with n groups and call <code>Union</code> for every edge. <code>Components</code> is the answer. If <code>Union</code> returns false, that edge joins two nodes that were already connected, so it closes a cycle in an undirected graph.</p>
<p><b>Each operation is close to O(1)</b> (the exact bound is the inverse Ackermann function, below 5 for any real input). <b>Space O(n).</b></p>
<blockquote><b>Say it in the interview:</b> Union-Find keeps a parent array, with path compression and union by rank, so find and union are almost constant time. I use it for connected components and for spotting a redundant edge.</blockquote>`,
    followUps: ['When would you choose Union-Find over BFS or DFS?', 'Can Union-Find undo a union or remove an edge?', 'How is it used in Kruskal\'s minimum spanning tree?']
  });

  interview.push({
    q: 'Your LRU cache works in the whiteboard version. What changes before it goes to production in .NET?', level: 'E',
    a: `<p>The whiteboard class is not safe for many threads and has no expiry, no size control by memory and no protection against many callers rebuilding the same value. In production you normally use the framework cache and not your own.</p>
<p><b>Thread safety.</b> Even a read changes the cache, because it moves a node to the front. So a reader-writer lock does not help, and swapping the map for a <code>ConcurrentDictionary</code> is not enough: the map and the list must change together. The simple correct fix is one lock around each operation:</p>
${CS(`
class SafeLruCache<K, V>
{
    private readonly LruCache<K, V> _inner;
    private readonly object _gate = new object();

    public SafeLruCache(int capacity) { _inner = new LruCache<K, V>(capacity); }

    public bool TryGet(K key, out V value) { lock (_gate) { return _inner.TryGet(key, out value); } }
    public void Put(K key, V value) { lock (_gate) { _inner.Put(key, value); } }
}
`)}
<table><thead><tr><th>Need</th><th>What to reach for</th></tr></thead><tbody>
<tr><td>In-process cache with expiry and a size limit</td><td><code>IMemoryCache</code>. Its eviction is by priority and expiry, not a strict LRU.</td></tr>
<tr><td>Memory plus a shared cache, and one rebuild per key under load</td><td><code>HybridCache</code> (.NET 9 and later)</td></tr>
<tr><td>Several servers must see the same data</td><td>a distributed cache such as Redis</td></tr>
<tr><td>Lock contention on a hot cache</td><td>split the cache into shards, each with its own lock</td></tr></tbody></table>
<p>Also decide: how stale may data be, how you remove an entry when the source changes, and which hit-rate and eviction numbers you will measure.</p>
<blockquote><b>Say it in the interview:</b> Reads also write in an LRU, so I guard the map and the list with one lock, or shard it. In a real .NET service I would use IMemoryCache or HybridCache and focus on expiry, invalidation and metrics.</blockquote>`,
    followUps: ['What is a cache stampede and how do you prevent it?', 'Why does a reader-writer lock not help an LRU cache?', 'How do you decide the capacity?']
  });
  /* ===================== INTERVIEW: section 6, recursion and dynamic programming ===================== */
  interview.push({
    q: 'What is recursion, and what must every recursive function have?', level: 'B',
    a: `<p>Recursion is a function that solves a problem by calling itself on a smaller piece of the same problem.</p>
<p>Every recursive function needs 2 things:</p>
<ul><li>A <b>base case</b>: an input so small that the answer is known without another call.</li><li>A <b>recursive step</b> that moves towards the base case. If the input does not get smaller, the calls never stop.</li></ul>
${CS(`
static int SumDigits(int n)       // n is 0 or more
{
    if (n < 10) return n;                  // base case: a single digit
    return n % 10 + SumDigits(n / 10);     // last digit + the same problem on the rest
}
`)}
<p><code>SumDigits(472)</code> becomes 2 + <code>SumDigits(47)</code>, then 2 + 7 + <code>SumDigits(4)</code>, then 2 + 7 + 4 = 13.</p>
<p>Each call waits on the <b>call stack</b> until the calls below it return. So the space cost is the depth of the recursion, here O(number of digits). Things to know in C#:</p>
<ul><li>The stack is small (about 1 MB by default for a thread on Windows). Recursion a few tens of thousands of calls deep can crash with <code>StackOverflowException</code>, and that exception cannot be caught: the process ends.</li><li>C# does not promise to turn tail calls into loops. For deep input, write a loop or use your own <code>Stack&lt;T&gt;</code>.</li></ul>
<blockquote><b>Say it in the interview:</b> Recursion needs a base case and a step that shrinks the input. It costs stack space equal to its depth, so for very deep input I switch to a loop or an explicit stack.</blockquote>`,
    followUps: ['Can every recursion be written as a loop?', 'What is tail recursion?', 'How do you find the time cost of a recursive function?']
  });

  interview.push({
    q: 'Write Fibonacci three ways: plain recursion, with memoisation, and bottom-up.', level: 'B',
    a: `<p>Fibonacci is 0, 1, 1, 2, 3, 5, 8, where each number is the sum of the two before it. The plain recursive version is very slow because it solves the same small problems again and again. Remembering answers fixes that.</p>
${CS(`
static long FibSlow(int n)                 // O(2^n) time
{
    return n < 2 ? n : FibSlow(n - 1) + FibSlow(n - 2);
}

static long FibMemo(int n, Dictionary<int, long> memo)   // O(n) time, O(n) space
{
    if (n < 2) return n;
    long v;
    if (memo.TryGetValue(n, out v)) return v;            // already solved
    v = FibMemo(n - 1, memo) + FibMemo(n - 2, memo);
    memo[n] = v;
    return v;
}

static long Fib(int n)                     // O(n) time, O(1) space
{
    if (n < 2) return n;
    long a = 0, b = 1;
    for (int i = 2; i <= n; i++) { long c = a + b; a = b; b = c; }
    return b;
}
`)}
${TS(`
const fib = (n: number): number => { let a = 0, b = 1; for (let i = 0; i < n; i++) [a, b] = [b, a + b]; return a; };
`)}
<table><thead><tr><th>Version</th><th>Time</th><th>Space</th></tr></thead><tbody>
<tr><td>Plain recursion</td><td>O(2<sup>n</sup>)</td><td>O(n) stack</td></tr>
<tr><td>Memoisation (top-down)</td><td>O(n)</td><td>O(n)</td></tr>
<tr><td>Bottom-up with 2 variables</td><td>O(n)</td><td>O(1)</td></tr></tbody></table>
<p>Watch the size: <code>Fib(92)</code> is the largest value that fits in a <code>long</code>. A JavaScript <code>number</code> is exact only up to <code>Fib(78)</code>. Beyond that use <code>BigInteger</code> or <code>bigint</code>.</p>
<blockquote><b>Say it in the interview:</b> Plain recursion is exponential because subproblems overlap. Memoisation or a bottom-up loop makes it O(n), and since I only need the last two values the space drops to O(1).</blockquote>`,
    followUps: ['Why exactly is the plain version exponential?', 'Where does a <code>long</code> overflow, and what do you use then?', 'Can Fibonacci be computed in O(log n)?']
  });

  interview.push({
    q: 'You can climb 1 or 2 steps at a time. How many ways are there to climb n steps?', level: 'B',
    a: `<p>The last move onto step n is either a 1-step from step n - 1 or a 2-step from step n - 2, so the number of ways is the sum of the ways to reach those two steps.</p>
<p>That gives <code>ways(n) = ways(n - 1) + ways(n - 2)</code>, which is Fibonacci with a different start: there is 1 way to stand at the bottom and 1 way to reach step 1.</p>
${CS(`
static int ClimbStairs(int n)
{
    int a = 1, b = 1;                 // ways(0), ways(1)
    for (int i = 2; i <= n; i++) { int c = a + b; a = b; b = c; }
    return b;
}
`)}
<table><thead><tr><th>n</th><th>0</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th></tr></thead><tbody><tr><td>ways</td><td>1</td><td>1</td><td>2</td><td>3</td><td>5</td><td>8</td></tr></tbody></table>
<p>For n = 3 the 3 ways are 1+1+1, 1+2 and 2+1.</p>
<p><b>Time O(n), space O(1).</b> The result overflows an <code>int</code> from n = 46, so use <code>long</code> for bigger n. This is the gentlest dynamic programming question: say the recurrence out loud first, then code it.</p>
<blockquote><b>Say it in the interview:</b> The last move is one step or two, so ways of n is ways of n minus 1 plus ways of n minus 2. I keep just the last two values: O(n) time, O(1) space.</blockquote>`,
    followUps: ['What if you may take 1, 2 or 3 steps?', 'What if some steps are broken and cannot be used?', 'What if each step has a cost and you want the cheapest climb?']
  });

  interview.push({
    q: 'How do you recognise a dynamic programming problem, and what is the difference between memoisation and tabulation?', level: 'I',
    a: `<p>Dynamic programming (DP) means solving each small subproblem once, saving the answer, and building bigger answers from saved ones. You reach for it when a brute-force recursion keeps asking the same question again.</p>
<p><b>Signals in the wording:</b> "count the number of ways", "minimum or maximum cost", "longest or shortest", "can it be done", with choices at each step and inputs small enough for an O(n<sup>2</sup>) or O(n × m) table.</p>
<p><b>Five steps to say out loud:</b></p>
<ol><li><b>State</b>: what does one saved answer mean? ("dp[a] = fewest coins to make amount a")</li><li><b>Transition</b>: how does it come from smaller states?</li><li><b>Base case</b>: the smallest state you know for sure.</li><li><b>Order</b>: fill so that what you need is already there.</li><li><b>Answer</b>: which cell holds the result.</li></ol>
<table><thead><tr><th></th><th>Memoisation (top-down)</th><th>Tabulation (bottom-up)</th></tr></thead><tbody>
<tr><td>How</td><td>recursion plus a cache</td><td>loops that fill an array</td></tr>
<tr><td>Solves</td><td>only the states it needs</td><td>every state</td></tr>
<tr><td>Risk</td><td>deep recursion can overflow the stack</td><td>you must get the fill order right</td></tr>
<tr><td>Bonus</td><td>closest to the brute force, quick to write</td><td>easy to cut memory down to one or two rows</td></tr></tbody></table>
<p>If the best next step never depends on trying alternatives, a greedy rule may be enough and DP is overkill. If no subproblem repeats, it is plain divide and conquer.</p>
<blockquote><b>Say it in the interview:</b> I look for overlapping subproblems and an answer built from smaller answers. Then I name the state, the transition and the base case, and choose top-down with a cache or bottom-up with a table.</blockquote>`,
    followUps: ['Give a problem where greedy fails and DP is needed.', 'How do you work out the time cost of a DP?', 'What does "optimal substructure" mean?']
  });

  interview.push({
    q: 'Coin change: what is the fewest coins needed to make an amount?', level: 'I',
    a: `<p>Work out the answer for every amount from 1 up to the target. For each amount, try each coin as the last coin and reuse the saved answer for the rest.</p>
<p><b>State:</b> <code>dp[a]</code> = fewest coins that make amount a. <b>Transition:</b> <code>dp[a] = 1 + min(dp[a - coin])</code> over all coins that fit. <b>Base:</b> <code>dp[0] = 0</code>.</p>
${CS(`
static int CoinChange(int[] coins, int amount)        // -1 when it cannot be made
{
    var dp = new int[amount + 1];
    for (int a = 1; a <= amount; a++)
    {
        dp[a] = amount + 1;                            // "infinity": more than any real answer
        foreach (int c in coins)
            if (c <= a) dp[a] = Math.Min(dp[a], dp[a - c] + 1);
    }
    return dp[amount] > amount ? -1 : dp[amount];
}
`)}
${TS(`
const coinChange = (coins: number[], amount: number): number => {
  const dp: number[] = new Array(amount + 1).fill(Infinity); dp[0] = 0;
  for (let a = 1; a <= amount; a++) for (const c of coins) if (c <= a) dp[a] = Math.min(dp[a], dp[a - c] + 1);
  return dp[amount] === Infinity ? -1 : dp[amount];
};
`)}
<p>Coins 1, 3, 4 and amount 6: taking the biggest coin first gives 4 + 1 + 1 = 3 coins, but the best is 3 + 3 = 2 coins. That is why greedy is wrong here and DP is needed.</p>
<p><b>Time O(amount × coins), space O(amount).</b> Do not use <code>int.MaxValue</code> as the "infinity": adding 1 to it wraps round to a negative number.</p>
<blockquote><b>Say it in the interview:</b> dp of a is the fewest coins for amount a, built from dp of a minus each coin plus one. Greedy fails for coin sets like 1, 3, 4, so I use DP in O(amount times coins).</blockquote>`,
    followUps: ['Count the number of different ways to make the amount.', 'Return the coins used, not only the count.', 'For which coin systems does greedy give the right answer?']
  });

  interview.push({
    q: 'Find the length of the longest common subsequence of two strings.', level: 'I',
    a: `<p>A subsequence keeps letters in order but may skip some. Compare the strings from the front in a table: if two letters match, extend the best answer so far, and if not, take the better of skipping a letter from either string.</p>
<p><b>State:</b> <code>dp[i, j]</code> = longest common subsequence (LCS) of the first i letters of a and the first j letters of b. Row 0 and column 0 are 0, because an empty string shares nothing.</p>
${CS(`
static int Lcs(string a, string b)
{
    var dp = new int[a.Length + 1, b.Length + 1];
    for (int i = 1; i <= a.Length; i++)
        for (int j = 1; j <= b.Length; j++)
            dp[i, j] = a[i - 1] == b[j - 1]
                ? dp[i - 1, j - 1] + 1                        // match: extend the diagonal
                : Math.Max(dp[i - 1, j], dp[i, j - 1]);       // no match: drop one letter
    return dp[a.Length, b.Length];
}
`)}
<p>For "ABCBDAB" and "BDCABA" the answer is 4 (for example "BCBA"). For "abcde" and "ace" it is 3.</p>
<p><b>Time O(n × m), space O(n × m).</b> Only the previous row is ever read, so memory can drop to O(m).</p>
<ul><li><b>Subsequence</b> may skip letters. <b>Substring</b> must be one unbroken piece. Ask which one is meant.</li><li>This is the idea behind text diff tools: the lines in the LCS are the unchanged lines.</li></ul>
<blockquote><b>Say it in the interview:</b> dp of i, j is the LCS of the two prefixes. On a match I take the diagonal plus one, otherwise the larger of the cell above and the cell to the left. O(n times m) time and space.</blockquote>`,
    followUps: ['Return the subsequence itself.', 'How does the code change for the longest common substring?', 'Cut the memory to one row.']
  });

  interview.push({
    q: 'Generate all subsets of a set of numbers.', level: 'I',
    a: `<p>For every number you make one choice, take it or leave it, so n numbers give 2<sup>n</sup> subsets. Backtracking walks through all of those choices.</p>
<p><b>Backtracking</b> is "choose, explore, un-choose": add an item to the current list, recurse, then remove it so the next branch starts clean.</p>
${CS(`
static List<List<int>> Subsets(int[] nums)
{
    var res = new List<List<int>>();
    SubsetsFrom(nums, 0, new List<int>(), res);
    return res;
}

static void SubsetsFrom(int[] nums, int start, List<int> cur, List<List<int>> res)
{
    res.Add(new List<int>(cur));                 // a copy: cur keeps changing
    for (int i = start; i < nums.Length; i++)
    {
        cur.Add(nums[i]);                        // choose
        SubsetsFrom(nums, i + 1, cur, res);      // explore
        cur.RemoveAt(cur.Count - 1);             // un-choose
    }
}
`)}
${TS(`
const subsets = (nums: number[]): number[][] => {
  const res: number[][] = [], cur: number[] = [];
  const go = (start: number): void => {
    res.push([...cur]);
    for (let i = start; i < nums.length; i++) { cur.push(nums[i]); go(i + 1); cur.pop(); }
  };
  go(0);
  return res;
};
`)}
<p>For <code>[1, 2, 3]</code> the output is <code>[] [1] [1,2] [1,2,3] [1,3] [2] [2,3] [3]</code>, 8 subsets.</p>
<p><b>Time O(n × 2<sup>n</sup>)</b>: there are 2<sup>n</sup> subsets and copying one costs up to n. <b>Space O(n)</b> for the recursion, not counting the output. The <code>start</code> index is what stops <code>[2,1]</code> appearing after <code>[1,2]</code>. The most common bug is adding <code>cur</code> itself and not a copy, which leaves every entry pointing at the same, finally empty, list.</p>
<blockquote><b>Say it in the interview:</b> Each element is in or out, so there are 2 to the n subsets. I use choose, explore, un-choose with a start index, and I copy the current list when I record it.</blockquote>`,
    followUps: ['The input has duplicates. How do you avoid duplicate subsets?', 'Do it with a bit mask and no recursion.', 'Return only the subsets that add up to a target.']
  });

  interview.push({
    q: 'Generate all permutations of an array of distinct numbers.', level: 'I',
    a: `<p>A permutation is an ordering. Fill the positions one at a time: at each position try every number that is not used yet, then go on to the next position.</p>
<p>There are n choices for the first position, n - 1 for the second, and so on, which gives n! (n factorial) permutations. A <code>used</code> array remembers which numbers are already in the current ordering.</p>
${CS(`
static List<List<int>> Permutations(int[] nums)
{
    var res = new List<List<int>>();
    Permute(nums, new bool[nums.Length], new List<int>(), res);
    return res;
}

static void Permute(int[] nums, bool[] used, List<int> cur, List<List<int>> res)
{
    if (cur.Count == nums.Length) { res.Add(new List<int>(cur)); return; }
    for (int i = 0; i < nums.Length; i++)
    {
        if (used[i]) continue;
        used[i] = true; cur.Add(nums[i]);                 // choose
        Permute(nums, used, cur, res);                    // explore
        cur.RemoveAt(cur.Count - 1); used[i] = false;     // un-choose
    }
}
`)}
<p>For <code>[1, 2, 3]</code>: <code>[1,2,3] [1,3,2] [2,1,3] [2,3,1] [3,1,2] [3,2,1]</code>, 6 results.</p>
<table><thead><tr><th></th><th>Subsets</th><th>Permutations</th></tr></thead><tbody>
<tr><td>Question</td><td>which items?</td><td>in which order?</td></tr>
<tr><td>Count</td><td>2<sup>n</sup></td><td>n!</td></tr>
<tr><td>Loop starts at</td><td><code>start</code> (never look back)</td><td>0, skipping used items</td></tr></tbody></table>
<p><b>Time O(n × n!), space O(n)</b> besides the output. 10 items already give 3,628,800 results, so ask about the input size.</p>
<blockquote><b>Say it in the interview:</b> I build the ordering position by position with a used array, and undo each choice after exploring it. There are n factorial results, so this only works for small n.</blockquote>`,
    followUps: ['How do you handle duplicate numbers?', 'Generate the next permutation in sorted order without recursion.', 'Do it by swapping in place, with no <code>used</code> array.']
  });

  interview.push({
    q: 'Find the length of the longest increasing subsequence.', level: 'A',
    a: `<p>Keep a list called <code>tails</code> where <code>tails[k]</code> is the smallest value that can end an increasing run of length k + 1. Each new number either extends the longest run or lowers one of those end values. The length of the list is the answer.</p>
<p>A smaller ending value is always better, because more numbers can follow it. The list stays sorted, so a binary search finds the spot for each number.</p>
${CS(`
static int Lis(int[] a)
{
    var tails = new List<int>();
    foreach (int x in a)
    {
        int i = tails.BinarySearch(x);
        if (i < 0) i = ~i;                         // not found: ~i is where x would go
        if (i == tails.Count) tails.Add(x);        // x extends the longest run
        else tails[i] = x;                         // x is a smaller end for length i + 1
    }
    return tails.Count;
}
`)}
<table><thead><tr><th>x</th><th>tails after x</th></tr></thead><tbody>
<tr><td>10</td><td>10</td></tr><tr><td>9</td><td>9</td></tr><tr><td>2</td><td>2</td></tr><tr><td>5</td><td>2, 5</td></tr><tr><td>3</td><td>2, 3</td></tr><tr><td>7</td><td>2, 3, 7</td></tr><tr><td>101</td><td>2, 3, 7, 101</td></tr><tr><td>18</td><td>2, 3, 7, 18</td></tr></tbody></table>
<p>The answer is 4. Note that <code>tails</code> is not always a real subsequence of the input. Only its length is meaningful.</p>
<p><b>Time O(n log n), space O(n).</b> The easier version is <code>dp[i]</code> = longest run ending at i, found by looking at every earlier j, which is O(n<sup>2</sup>). Give that one first if you are unsure, then improve. This code finds a strictly increasing run. To allow equal values, place x after the last element that is not larger than it.</p>
<blockquote><b>Say it in the interview:</b> I keep the smallest possible tail for each length and binary search where each number goes. The list length is the answer in O(n log n). The simpler DP is O(n squared).</blockquote>`,
    followUps: ['Return the subsequence itself, not just its length.', 'What changes for a non-decreasing subsequence?', 'Why is the <code>tails</code> list always sorted?']
  });

  interview.push({
    q: 'Compute the edit distance between two words.', level: 'A',
    a: `<p>Edit distance (Levenshtein distance) is the smallest number of single-letter inserts, deletes and replacements that turn one word into the other. Fill a table of prefix against prefix, where each cell takes the cheapest of the 3 possible last edits.</p>
<p><b>State:</b> <code>dp[i, j]</code> = edits to turn the first i letters of a into the first j letters of b. <b>Base:</b> turning i letters into nothing costs i deletes, and nothing into j letters costs j inserts.</p>
${CS(`
static int EditDistance(string a, string b)
{
    var dp = new int[a.Length + 1, b.Length + 1];
    for (int i = 0; i <= a.Length; i++) dp[i, 0] = i;          // delete everything
    for (int j = 0; j <= b.Length; j++) dp[0, j] = j;          // insert everything
    for (int i = 1; i <= a.Length; i++)
        for (int j = 1; j <= b.Length; j++)
            dp[i, j] = a[i - 1] == b[j - 1]
                ? dp[i - 1, j - 1]                              // same letter: free
                : 1 + Math.Min(dp[i - 1, j - 1],                // replace
                      Math.Min(dp[i - 1, j],                    // delete from a
                               dp[i, j - 1]));                  // insert into a
    return dp[a.Length, b.Length];
}
`)}
${TS(`
const editDistance = (a: string, b: string): number => {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
  return dp[a.length][b.length];
};
`)}
<p>"kitten" to "sitting" is 3: replace k with s, replace e with i, insert g. "horse" to "ros" is also 3.</p>
<p><b>Time O(n × m), space O(n × m)</b>, or O(min(n, m)) if you keep only two rows. It is used in spell checkers, "did you mean" search and fuzzy matching of names.</p>
<blockquote><b>Say it in the interview:</b> dp of i, j is the cost to turn one prefix into the other. Equal letters cost nothing, otherwise it is one plus the cheapest of replace, delete and insert. O(n times m).</blockquote>`,
    followUps: ['Which cell stands for which edit, and why?', 'Return the list of edits.', 'How would you do a fuzzy search over a million product names?']
  });

  interview.push({
    q: 'Solve N-Queens: in how many ways can n queens stand on an n by n board without attacking each other?', level: 'A',
    a: `<p>Place one queen per row. In each row try every column, skip any square that an earlier queen attacks, and go back a row when a row has no safe square.</p>
<p>This is backtracking with <b>pruning</b>: a bad partial board is dropped at once, so you never look at the huge number of full boards it would lead to. To test a square in O(1), remember which columns and diagonals are taken:</p>
<ul><li>All squares on one "\\" diagonal share the same <code>row - col</code>.</li><li>All squares on one "/" diagonal share the same <code>row + col</code>.</li></ul>
${CS(`
static int CountQueens(int n)
{
    // diag is indexed by row - col + n, anti by row + col
    return PlaceQueen(0, n, new bool[n], new bool[2 * n], new bool[2 * n]);
}

static int PlaceQueen(int row, int n, bool[] cols, bool[] diag, bool[] anti)
{
    if (row == n) return 1;                               // all rows filled: one solution
    int count = 0;
    for (int c = 0; c < n; c++)
    {
        int d = row - c + n, a = row + c;
        if (cols[c] || diag[d] || anti[a]) continue;      // attacked: prune
        cols[c] = diag[d] = anti[a] = true;               // choose
        count += PlaceQueen(row + 1, n, cols, diag, anti);    // explore
        cols[c] = diag[d] = anti[a] = false;              // un-choose
    }
    return count;
}
`)}
<table><thead><tr><th>n</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>8</th></tr></thead><tbody><tr><td>solutions</td><td>1</td><td>0</td><td>0</td><td>2</td><td>10</td><td>4</td><td>92</td></tr></tbody></table>
<p><b>Time is about O(n!)</b> in the worst case (n choices in the first row, fewer in each later row), far less in practice thanks to pruning. <b>Space O(n).</b> The same shape solves Sudoku, word search and scheduling puzzles: choose, check the rules, explore, undo.</p>
<blockquote><b>Say it in the interview:</b> One queen per row, with sets for used columns and both diagonals so each safety check is O(1). I prune as soon as a square is attacked and undo each choice on the way back.</blockquote>`,
    followUps: ['Return the boards, not only the count.', 'Why do <code>row - col</code> and <code>row + col</code> identify the diagonals?', 'How would bit masks speed this up?']
  });

  interview.push({
    q: '0/1 knapsack: pick items with the highest total value without going over a weight limit.', level: 'A',
    a: `<p>For each item you decide once, take it or leave it. Keep, for every capacity from 0 to the limit, the best value found so far, and update that list item by item.</p>
<p><b>State:</b> <code>dp[c]</code> = best value that fits in capacity c using the items seen so far. <b>Transition:</b> <code>dp[c] = max(dp[c], dp[c - weight] + value)</code>, which reads "leave it" or "take it".</p>
${CS(`
static int Knapsack(int[] weight, int[] value, int capacity)
{
    var dp = new int[capacity + 1];
    for (int i = 0; i < weight.Length; i++)
        for (int c = capacity; c >= weight[i]; c--)             // backwards: each item used once
            dp[c] = Math.Max(dp[c], dp[c - weight[i]] + value[i]);
    return dp[capacity];
}
`)}
<p>Weights 1, 3, 4, 5 with values 1, 4, 5, 7 and capacity 7: the best is 9, from the items of weight 3 and 4.</p>
<p><b>Why loop the capacity backwards?</b> <code>dp[c - weight]</code> must still be the value from before this item. Going forwards would let the same item be counted twice. Going forwards on purpose solves the "unlimited copies" version, which is how coin change works.</p>
<p><b>Time O(items × capacity), space O(capacity).</b> The cost depends on the capacity number itself, so it is slow when the capacity is huge. Greedy by value per kilo is only correct when items can be cut into pieces. Subset sum, "split into two equal halves" and "target sum" are all this same problem.</p>
<blockquote><b>Say it in the interview:</b> dp of c is the best value for capacity c. For each item I go through capacities from high to low and take the better of skipping or taking the item. O(items times capacity) time, O(capacity) space.</blockquote>`,
    followUps: ['Which items were chosen?', 'What changes if each item can be used any number of times?', 'Why does greedy by value per weight fail here?']
  });

  interview.push({
    q: 'Your 2D DP table uses too much memory. How do you shrink it, and what do you give up?', level: 'E',
    a: `<p>Look at which cells each cell reads. If a row only reads the row above it, you can keep 2 rows (or even 1) and not the whole table.</p>
${CS(`
static int LcsTwoRows(string a, string b)
{
    var prev = new int[b.Length + 1];
    var cur = new int[b.Length + 1];
    for (int i = 1; i <= a.Length; i++)
    {
        for (int j = 1; j <= b.Length; j++)
            cur[j] = a[i - 1] == b[j - 1] ? prev[j - 1] + 1 : Math.Max(prev[j], cur[j - 1]);
        int[] t = prev; prev = cur; cur = t;            // this row becomes the previous row
    }
    return prev[b.Length];
}
`)}
<p>Space falls from O(n × m) to O(m). Put the shorter string in the inner loop and it is O(min(n, m)). Time stays O(n × m).</p>
<table><thead><tr><th>Technique</th><th>Works when</th></tr></thead><tbody>
<tr><td>2 rolling rows</td><td>a cell reads only the previous row and its own row</td></tr>
<tr><td>1 row, updated in place</td><td>you control the direction (backwards for 0/1 knapsack) or save the diagonal in a variable</td></tr>
<tr><td>A few variables</td><td>a cell reads a fixed number of earlier cells (Fibonacci, house robber)</td></tr>
<tr><td>Top-down with a dictionary</td><td>only a small part of the table is ever reached</td></tr></tbody></table>
<p><b>What you give up:</b> the path. To print the actual subsequence or the list of edits you walk back through the full table, and that table is gone. Your options are to keep it, to store one "where did I come from" bit per cell, or to use Hirschberg's algorithm, which rebuilds the path in linear space by divide and conquer. Also say that 5,000 × 5,000 <code>int</code> cells is about 100 MB, which is why the question matters.</p>
<blockquote><b>Say it in the interview:</b> Each row only depends on the previous one, so I keep two rows and cut memory to O(m). The trade-off is that I lose the table needed to rebuild the path, unless I store back-pointers or use Hirschberg.</blockquote>`,
    followUps: ['Do LCS with a single row.', 'When is top-down with a dictionary cheaper than a full table?', 'How do you rebuild the path if you kept the whole table?']
  });
  /* ===================== INTERVIEW: section 7, bits, maths and small programs ===================== */
  interview.push({
    q: 'Check whether a number is prime, and find the greatest common divisor of two numbers.', level: 'B',
    a: `<p>A prime is a whole number above 1 that only 1 and itself divide. You only need to try dividers up to the square root of n. The greatest common divisor (GCD) is the largest number that divides both inputs, and Euclid's method finds it by repeatedly taking remainders.</p>
${CS(`
static bool IsPrime(int n)
{
    if (n < 2) return false;
    for (int i = 2; (long)i * i <= n; i++)      // long: i * i must not overflow
        if (n % i == 0) return false;
    return true;
}

static int Gcd(int a, int b)
{
    return b == 0 ? a : Gcd(b, a % b);
}
`)}
${TS(`
const isPrime = (n: number): boolean => { if (n < 2) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
`)}
<ul><li><b>Why the square root?</b> If n = a × b, the smaller of a and b is at most √n. So if nothing up to √n divides n, nothing does.</li><li><b>GCD trace:</b> Gcd(48, 18) becomes Gcd(18, 12), then Gcd(12, 6), then Gcd(6, 0), which is 6.</li><li>The least common multiple is <code>a / Gcd(a, b) * b</code>. Divide first to avoid overflow.</li></ul>
<p><b>IsPrime is O(√n) time and O(1) space. Gcd is O(log(min(a, b))) time.</b> Edge cases to say: 0 and 1 are not prime, 2 is the only even prime, negative numbers are not prime.</p>
<blockquote><b>Say it in the interview:</b> For a prime check I only divide up to the square root, so it is O(root n). For GCD I use Euclid: replace the pair with b and a mod b until b is zero, which takes O(log n) steps.</blockquote>`,
    followUps: ['How would you list every prime up to one million?', 'How do you get the least common multiple from the GCD?', 'How can you skip even numbers to halve the work?']
  });

  interview.push({
    q: 'Write factorial, FizzBuzz and an Armstrong number check.', level: 'B',
    a: `<p>These are warm-up programs. The interviewer is checking clean loops, correct edge cases and whether you think about number size.</p>
${CS(`
static long Factorial(int n)                    // n! = 1 * 2 * 3 * ... * n
{
    long f = 1;
    for (int i = 2; i <= n; i++) f = checked(f * i);    // throws past 20! instead of a wrong answer
    return f;
}

static List<string> FizzBuzz(int n)
{
    var res = new List<string>();
    for (int i = 1; i <= n; i++)
        res.Add(i % 15 == 0 ? "FizzBuzz" : i % 3 == 0 ? "Fizz" : i % 5 == 0 ? "Buzz" : i.ToString());
    return res;
}

static bool IsArmstrong(int n)                  // 153 = 1^3 + 5^3 + 3^3
{
    int digits = n.ToString().Length;
    long sum = 0;
    for (int m = n; m > 0; m /= 10)
    {
        long p = 1;
        for (int i = 0; i < digits; i++) p *= m % 10;   // digit to the power of the digit count
        sum += p;
    }
    return sum == n;
}
`)}
<table><thead><tr><th>Program</th><th>Trap</th><th>Cost</th></tr></thead><tbody>
<tr><td>Factorial</td><td>20! is the largest that fits in a <code>long</code>. Use <code>BigInteger</code> beyond that. A loop avoids deep recursion.</td><td>O(n) time</td></tr>
<tr><td>FizzBuzz</td><td>Test "divisible by both" (15) first, or 15 prints only "Fizz".</td><td>O(n) time</td></tr>
<tr><td>Armstrong</td><td>Use whole-number powers. <code>Math.Pow</code> works in floating point and can be off by a tiny amount.</td><td>O(d<sup>2</sup>) for d digits</td></tr></tbody></table>
<p>Armstrong numbers with 3 digits are 153, 370, 371 and 407.</p>
<blockquote><b>Say it in the interview:</b> I write these with simple loops, check the combined case first in FizzBuzz, and call out overflow: factorial passes the range of a long after 20, so beyond that I would use BigInteger.</blockquote>`,
    followUps: ['How would you make FizzBuzz easy to extend with a rule for 7?', 'Why can recursion be a poor choice for factorial?', 'What does <code>checked</code> do?']
  });

  interview.push({
    q: 'Rapid fire: time and space costs you should know without thinking', level: 'B',
    a: `<p>Interviewers ask these one after another, so each answer should be one short line.</p>
<table><thead><tr><th>Question</th><th>Short answer</th></tr></thead><tbody>
<tr><td>Look up a key in a <code>Dictionary</code> or <code>HashSet</code>?</td><td>O(1) on average, O(n) in the worst case.</td></tr>
<tr><td>Push or pop on a stack, enqueue or dequeue on a queue?</td><td>O(1).</td></tr>
<tr><td>Add to or remove the smallest from a heap of n items?</td><td>O(log n). Looking at the smallest is O(1).</td></tr>
<tr><td>Search, insert or delete in a balanced binary search tree?</td><td>O(log n). An unbalanced one can fall to O(n).</td></tr>
<tr><td>BFS or DFS on a graph?</td><td>O(V + E) time, O(V) space.</td></tr>
<tr><td>Reverse a linked list, or find its middle?</td><td>O(n) time, O(1) space.</td></tr>
<tr><td>Recursion that goes d levels deep?</td><td>O(d) stack space, even if it creates no objects.</td></tr>
<tr><td>All subsets, all permutations?</td><td>2<sup>n</sup> subsets, n! permutations.</td></tr>
<tr><td>A DP over two strings of length n and m?</td><td>O(n × m) time. Space can often drop to one row.</td></tr>
<tr><td>Find and union in Union-Find?</td><td>Almost O(1) with path compression and union by rank.</td></tr>
<tr><td>Sorting n items with <code>Array.Sort</code> or <code>OrderBy</code>?</td><td>O(n log n).</td></tr>
</tbody></table>
<p>A quick size guide: n up to about 20 allows 2<sup>n</sup>, up to a few thousand allows n<sup>2</sup>, up to a million needs n log n or better.</p>
<blockquote><b>Say it in the interview:</b> Hash lookups are O(1) on average, heaps and balanced trees are O(log n), graph walks are O(V + E), and recursion costs stack space equal to its depth.</blockquote>`,
    followUps: ['What does "on average" hide for a hash table?', 'Which is larger for n = 10: 2<sup>n</sup> or n!?', 'What input size makes an O(n<sup>2</sup>) answer too slow?']
  });

  interview.push({
    q: 'How should you prepare for the coding round, and what habits matter on the day?', level: 'B',
    a: `<p>Practise by pattern, not by counting problems, and practise out loud. A simple 3-week plan covers the whole round.</p>
<table><thead><tr><th>Week</th><th>Topics</th><th>Goal</th></tr></thead><tbody>
<tr><td>1</td><td>Strings and arrays: two pointers, sliding window, hash map, prefix sums</td><td>Write each classic without looking, in C# and in TypeScript, and say the cost.</td></tr>
<tr><td>2</td><td>Matrices, stacks, queues, linked lists, trees</td><td>Draw the structure before coding. Know BFS and DFS by heart.</td></tr>
<tr><td>3</td><td>Graphs, heaps, tries, Union-Find, DP, backtracking</td><td>State the pattern, the state and the transition before writing code.</td></tr></tbody></table>
<p><b>Habits that interviewers score:</b></p>
<ul><li>Repeat the problem in your own words and ask about input size, duplicates, negatives and empty input.</li><li>Give the simple brute-force answer first with its cost, then improve it.</li><li>Name the pattern before you code ("this is a monotonic stack").</li><li>Talk while you write. Silence looks like being stuck.</li><li>Test by hand: empty, one item, duplicates, negatives, very large input.</li><li>Finish with time and space cost, and one thing you would do with more time.</li></ul>
<p>For a tech lead role, add one more layer: say how the code would behave in a real system (thread safety, memory, what you would unit test).</p>
<blockquote><b>Say it in the interview:</b> I prepare by pattern and always think out loud: clarify, brute force first, name the pattern, code, test edge cases, then state time and space.</blockquote>`,
    followUps: ['What do you do when you are stuck for more than a few minutes?', 'How do you test your code without running it?', 'How much should you use an AI assistant while practising?']
  });

  interview.push({
    q: 'In an array where every number appears twice except one, find the single one. And how do you swap two numbers without a temporary variable?', level: 'I',
    a: `<p>XOR all the numbers together. Pairs cancel to 0 and the lonely number is what remains.</p>
<p>XOR (written <code>^</code>) compares two numbers bit by bit and gives 1 where the bits differ. Three facts do all the work: <code>x ^ x = 0</code>, <code>x ^ 0 = x</code>, and the order does not matter.</p>
${CS(`
static int SingleNumber(int[] a)
{
    int x = 0;
    foreach (int v in a) x ^= v;      // equal pairs cancel out
    return x;
}

static void SwapXor(ref int a, ref int b)
{
    if (a == b) return;               // nothing to do, and safe if both refer to one variable
    a ^= b;                           // a holds a ^ b
    b ^= a;                           // b becomes the old a
    a ^= b;                           // a becomes the old b
}
`)}
${TS(`
const singleNumber = (a: number[]): number => a.reduce((x, y) => x ^ y, 0);
`)}
<p>For <code>[4, 1, 2, 1, 2]</code>: 4 ^ 1 ^ 2 ^ 1 ^ 2 = 4 ^ (1 ^ 1) ^ (2 ^ 2) = 4.</p>
<p><b>SingleNumber is O(n) time and O(1) space.</b> A <code>HashSet</code> or a dictionary of counts also works but needs O(n) memory.</p>
<p>The XOR swap is a puzzle answer, not production code. If both references point at the same variable, the unguarded version sets it to 0. In real C# write <code>(a, b) = (b, a);</code>, which is clear and just as fast.</p>
<blockquote><b>Say it in the interview:</b> XOR of a number with itself is zero, so XOR-ing the whole array leaves the single value in O(n) time and O(1) space. For swapping I would use a tuple swap in real code and mention XOR as the trick.</blockquote>`,
    followUps: ['Every number appears three times except one. Does XOR still work?', 'Two numbers appear once and the rest twice. How do you find both?', 'Find the missing number from 0 to n with XOR.']
  });

  interview.push({
    q: 'Check whether a number is a power of two, and count the 1 bits in a number.', level: 'I',
    a: `<p>A power of two has exactly one 1 bit. The expression <code>n &amp; (n - 1)</code> removes the lowest 1 bit, so if the result is 0 there was only one.</p>
<p>Why it works: subtracting 1 flips the lowest 1 bit to 0 and every 0 below it to 1. AND-ing with the original clears that bit and leaves the rest alone. Example: 12 is <code>1100</code>, 11 is <code>1011</code>, and <code>1100 &amp; 1011 = 1000</code>.</p>
${CS(`
static bool IsPowerOfTwo(int n)
{
    return n > 0 && (n & (n - 1)) == 0;
}

static int CountBits(int n)
{
    int count = 0;
    for (uint u = (uint)n; u != 0; u &= u - 1) count++;    // each round clears the lowest 1 bit
    return count;
}
`)}
${TS(`
const isPowerOfTwo = (n: number): boolean => n > 0 && (n & (n - 1)) === 0;
`)}
<ul><li>The <code>n &gt; 0</code> test is needed: 0 has no 1 bits and negative numbers are never powers of two.</li><li>The counting loop (Brian Kernighan's method) runs once per 1 bit, not once per bit. For 44 (<code>101100</code>) it runs 3 times.</li><li>The cast to <code>uint</code> makes negative input work: -1 has 32 one bits.</li><li>In real .NET code call <code>System.Numerics.BitOperations.PopCount</code> (or <code>int.PopCount</code> from .NET 7). It maps to a single CPU instruction where the processor has one.</li></ul>
<p><b>Both are O(1)</b> for a 32-bit number: at most 32 rounds, and no extra memory.</p>
<blockquote><b>Say it in the interview:</b> n and n minus 1 clears the lowest set bit. A positive number is a power of two if that gives zero, and repeating it counts the set bits in as many steps as there are ones.</blockquote>`,
    followUps: ['Count the 1 bits for every number from 0 to n in O(n).', 'How do you test for a power of four?', 'What does <code>n &amp; -n</code> give you?']
  });

  interview.push({
    q: 'Rapid fire: bit tricks', level: 'I',
    a: `<p>Bits are numbered from the right starting at 0. Each trick below is one expression that you should be able to write from memory.</p>
<table><thead><tr><th>Question</th><th>Short answer</th></tr></thead><tbody>
<tr><td>Is bit i set?</td><td><code>((n &gt;&gt; i) &amp; 1) == 1</code></td></tr>
<tr><td>Set bit i?</td><td><code>n | (1 &lt;&lt; i)</code></td></tr>
<tr><td>Clear bit i?</td><td><code>n &amp; ~(1 &lt;&lt; i)</code></td></tr>
<tr><td>Flip bit i?</td><td><code>n ^ (1 &lt;&lt; i)</code></td></tr>
<tr><td>Is n even?</td><td><code>(n &amp; 1) == 0</code>. This also works for negative numbers.</td></tr>
<tr><td>Keep only the lowest 1 bit?</td><td><code>n &amp; -n</code>. For 12 (<code>1100</code>) it gives 4.</td></tr>
<tr><td>Remove the lowest 1 bit?</td><td><code>n &amp; (n - 1)</code></td></tr>
<tr><td>Multiply or divide by 2?</td><td><code>n &lt;&lt; 1</code> and <code>n &gt;&gt; 1</code>. Write <code>* 2</code> and <code>/ 2</code> in normal code, the compiler does the rest.</td></tr>
<tr><td>What is <code>1 &lt;&lt; 32</code> for an <code>int</code> in C#?</td><td>1, not 0. Only the low 5 bits of the shift count are used. Write <code>1L &lt;&lt; 32</code> for a 64-bit result.</td></tr>
<tr><td><code>&gt;&gt;</code> on a negative <code>int</code>?</td><td>It keeps the sign (fills with 1s). <code>&gt;&gt;&gt;</code>, added in C# 11, fills with 0s.</td></tr>
<tr><td>Go through all subsets of n items?</td><td>Count a mask from 0 to <code>(1 &lt;&lt; n) - 1</code>. Bit i of the mask says whether item i is in.</td></tr>
</tbody></table>
<p>Real uses in .NET: <code>[Flags]</code> enums for permissions, compact sets of small numbers, hash functions and feature switches packed into one integer.</p>
<blockquote><b>Say it in the interview:</b> Shift a 1 to position i, then OR sets the bit, AND with the inverse clears it, XOR flips it, and AND tests it. n and n minus 1 drops the lowest set bit.</blockquote>`,
    followUps: ['How does a <code>[Flags]</code> enum use these tricks?', 'What is two\'s complement, and why is -1 all 1 bits?', 'How do you reverse the bits of a 32-bit number?']
  });

  interview.push({
    q: 'Rapid fire: small TypeScript helpers (flatten, deep clone, unique, group by, memoise)', level: 'I',
    a: `<p>Full-stack interviews often ask for a tiny utility in TypeScript and then for the C# equivalent. Know each as a one-liner.</p>
${TS(`
const flatten = (a: unknown[]): unknown[] => a.flatMap(x => (Array.isArray(x) ? flatten(x) : [x]));
const unique = <T,>(a: T[]): T[] => [...new Set(a)];
const groupBy = <T,>(a: T[], key: (x: T) => string): Record<string, T[]> =>
  a.reduce((m, x) => { (m[key(x)] ??= []).push(x); return m; }, {} as Record<string, T[]>);
const memo = <A, R>(f: (a: A) => R) => {
  const cache = new Map<A, R>();
  return (a: A): R => { if (!cache.has(a)) cache.set(a, f(a)); return cache.get(a)!; };
};
`)}
<table><thead><tr><th>Question</th><th>Short answer</th></tr></thead><tbody>
<tr><td>Flatten a nested array?</td><td>Recursion with <code>flatMap</code>, or the built-in <code>a.flat(Infinity)</code>. In C#: <code>SelectMany</code> for one level.</td></tr>
<tr><td>Deep clone an object?</td><td><code>structuredClone(obj)</code>. It handles dates, maps, sets and cycles, but throws on functions. In C# there is no built-in deep clone: write a copy method or serialise.</td></tr>
<tr><td>Remove duplicates?</td><td><code>[...new Set(a)]</code>, which keeps first-seen order. It compares objects by reference. In C#: <code>Distinct()</code>.</td></tr>
<tr><td>Group items by a key?</td><td><code>reduce</code> into an object or a <code>Map</code>, or the newer <code>Object.groupBy</code>. In C#: <code>GroupBy</code> or <code>ToLookup</code>.</td></tr>
<tr><td>Memoise a function?</td><td>Wrap it with a <code>Map</code> from argument to result. Only safe for pure functions, and the cache grows without limit unless you cap it.</td></tr>
<tr><td>Why not <code>JSON.parse(JSON.stringify(x))</code> to clone?</td><td>It drops <code>undefined</code> and functions, turns dates into strings and fails on cycles.</td></tr></tbody></table>
<p><b>Costs:</b> flatten, unique and group by are O(n) time and O(n) space. A memoised call is O(1) after the first call for that argument.</p>
<blockquote><b>Say it in the interview:</b> Flatten is recursion with flatMap, unique is a Set, group by is a reduce into a map, deep clone is structuredClone, and memoise wraps a pure function with a Map cache.</blockquote>`,
    followUps: ['How would you memoise a function with several arguments?', 'What is the difference between a shallow and a deep copy?', 'How do you remove duplicate objects by an id field?']
  });

  interview.push({
    q: 'What happens when an <code>int</code> overflows in C#, and how do you guard against it in a coding round?', level: 'I',
    a: `<p>By default nothing visible happens: the value silently wraps round, so <code>int.MaxValue + 1</code> becomes <code>int.MinValue</code> and your answer is quietly wrong.</p>
<p>An <code>int</code> holds about ±2.1 billion (2<sup>31</sup> - 1). A <code>long</code> holds about ±9.2 × 10<sup>18</sup>. Arithmetic is <b>unchecked</b> unless you ask for checking.</p>
${CS(`
static int SafeMid(int lo, int hi)
{
    return lo + (hi - lo) / 2;          // (lo + hi) / 2 can overflow for large indexes
}

static int AddChecked(int a, int b)
{
    return checked(a + b);              // throws OverflowException and never wraps
}

static long SumAll(int[] a)
{
    long sum = 0;                       // a long total for int inputs
    foreach (int x in a) sum += x;
    return sum;
}
`)}
<table><thead><tr><th>Place it bites</th><th>Fix</th></tr></thead><tbody>
<tr><td>Middle index in binary search</td><td><code>lo + (hi - lo) / 2</code></td></tr>
<tr><td>Sums and products of many values</td><td>use <code>long</code>, or <code>BigInteger</code> for factorials and big Fibonacci</td></tr>
<tr><td><code>i * i &lt;= n</code> in a prime loop</td><td>cast first: <code>(long)i * i</code></td></tr>
<tr><td><code>Math.Abs(int.MinValue)</code></td><td>throws <code>OverflowException</code>, because +2,147,483,648 does not fit</td></tr>
<tr><td>Sort comparer written as <code>a - b</code></td><td>use <code>a.CompareTo(b)</code></td></tr>
<tr><td>Hash codes</td><td>wrapping is wanted there, so <code>unchecked</code> is correct</td></tr></tbody></table>
<p>JavaScript is different: a <code>number</code> is a 64-bit float, exact for whole numbers up to 2<sup>53</sup> - 1, but the bit operators work on 32 bits.</p>
<blockquote><b>Say it in the interview:</b> C# integers wrap silently by default. I use long for sums and products, compute the midpoint as lo plus half the gap, and use checked where a wrong number would be worse than an exception.</blockquote>`,
    followUps: ['Can you turn on overflow checking for a whole project?', 'Why not use <code>long</code> or <code>decimal</code> everywhere?', 'Which type do you use for money, and why?']
  });

  interview.push({
    q: 'List all primes up to n efficiently, and compute a power quickly.', level: 'A',
    a: `<p>To list many primes, do not test each number on its own: cross out the multiples of each prime and whatever is never crossed out is prime. To raise a number to a big power, square it repeatedly, which needs only about log(exponent) multiplications.</p>
${CS(`
static List<int> PrimesUpTo(int n)                 // Sieve of Eratosthenes
{
    var primes = new List<int>();
    if (n < 2) return primes;
    var composite = new bool[n + 1];
    for (int i = 2; i <= n; i++)
    {
        if (composite[i]) continue;
        primes.Add(i);
        for (long j = (long)i * i; j <= n; j += i) composite[j] = true;   // start at i * i
    }
    return primes;
}

static long PowMod(long b, long e, long mod)       // (b ^ e) % mod, with e >= 0
{
    long result = 1 % mod;
    b %= mod;
    while (e > 0)
    {
        if ((e & 1) == 1) result = result * b % mod;   // this bit of e is set: use this power
        b = b * b % mod;                               // b, b^2, b^4, b^8 and so on
        e >>= 1;
    }
    return result;
}
`)}
<ul><li><b>Sieve:</b> starting the inner loop at i × i is safe, because every smaller multiple of i has a smaller prime factor and is crossed out already. <b>Time O(n log log n), space O(n).</b> Testing each number alone would cost O(n√n).</li><li><b>Fast power:</b> 3<sup>13</sup> with 13 = <code>1101</code> in binary is 3<sup>8</sup> × 3<sup>4</sup> × 3<sup>1</sup>, so 3 squarings and 3 multiplications replace 12 multiplications. <b>Time O(log e), space O(1).</b></li><li>Taking the remainder after every multiplication keeps the numbers small. This version is safe while <code>mod</code> is below about 3 × 10<sup>9</sup>, so the product fits in a <code>long</code>. For bigger values use <code>BigInteger.ModPow</code>.</li></ul>
<blockquote><b>Say it in the interview:</b> For many primes I use a sieve, crossing out multiples from i squared, in O(n log log n). For powers I use square and multiply, driven by the bits of the exponent, in O(log e).</blockquote>`,
    followUps: ['How would you sieve up to 10<sup>10</sup> with limited memory?', 'Where is modular exponentiation used in real systems?', 'Why does the sieve start crossing out at i × i?']
  });
  registerModule({
    id: 'tl12',
    title: 'Coding Round II: Data Structures, Recursion, DP & Bits',
    intro: `<p>This is the second half of the coding round. Part I covered strings, arrays and matrices. Here you practise the questions that need a <b>data structure</b> or a <b>technique</b>: linked lists, stacks, queues, hash maps, trees, graphs, the LRU cache, recursion, backtracking, dynamic programming, and the bit and maths warm-ups that interviewers still ask.</p>
<p>Every question has a model answer in <b>C#</b> (with a short TypeScript version where it is brief), the time and space cost, and one line to say out loud. All code on this page was compiled and run. The C# avoids the newest syntax on purpose, so it works in any online editor an interviewer may give you.</p>
<p>How to use it: read a question, say your answer out loud, write the code without looking, then open the model answer and compare.</p>`,
    goals: [
      'Pick the right collection (<code>List</code>, <code>Dictionary</code>, <code>HashSet</code>, <code>Stack</code>, <code>Queue</code>, <code>PriorityQueue</code>) from the wording of a question and state its cost',
      'Write the linked list, stack and queue classics from memory: reverse, middle, cycle, merge, balanced brackets, min stack, next greater element',
      'Walk trees and graphs with DFS and BFS, validate a BST, find a lowest common ancestor, and order tasks with a topological sort',
      'Design an LRU cache, a trie and Union-Find, and explain why each inner structure is there',
      'Turn a slow recursion into dynamic programming by naming the state, the transition and the base case, and write backtracking as choose, explore, un-choose',
      'Use XOR and <code>n &amp; (n - 1)</code>, and write prime, GCD, factorial and FizzBuzz with the right edge cases and overflow guards'
    ],
    prereqs: `<p>Do <b>Coding Round I: Strings, Arrays &amp; Matrices</b> first, because it teaches how to talk through a problem, Big-O notation and the hash map pattern. You should be comfortable with C# classes, generics and the basic collections (the <b>C# Language &amp; OOP Questions</b> module).</p>`,
    hours: 14,
    langExplain: `<p>The code here is C#, because this track prepares you for a .NET tech lead interview. Short TypeScript versions are shown for the questions that are also asked on the front-end side.</p>`,
    topics: topics, practice: practice, quiz: quiz, interview: interview
  });
})();
