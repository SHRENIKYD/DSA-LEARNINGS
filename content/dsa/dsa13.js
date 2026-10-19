(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  // ---------- small shared helpers for the visualizers ----------
  function parseNums(input, def, maxN, minN) {
    var s = (input === undefined || input === null) ? def : String(input);
    var toks = s.trim().split(/[\s,]+/).filter(function (x) { return x.length; });
    if (toks.length < (minN || 1)) throw new Error('Enter at least ' + (minN || 1) + ' whole numbers separated by spaces, e.g. "' + def + '"');
    var a = toks.map(Number);
    if (a.some(function (x) { return isNaN(x) || !isFinite(x) || Math.floor(x) !== x; })) throw new Error('Enter whole numbers separated by spaces, e.g. "' + def + '"');
    if (a.length > maxN) throw new Error('Please use at most ' + maxN + ' numbers so the picture fits on screen.');
    return a;
  }
  function one(i, cls) { var h = {}; if (i !== undefined && i !== null && i >= 0) h[i] = cls; return h; }
  function parseOps(input, def, allowed) {
    var s = (input === undefined || input === null) ? def : String(input);
    var raw = s.split(/[,;\n]+/).map(function (x) { return x.trim(); }).filter(function (x) { return x.length; });
    if (!raw.length) throw new Error('Enter operations separated by commas, e.g. "' + def + '"');
    if (raw.length > 16) throw new Error('Please use at most 16 operations.');
    return raw.map(function (r) {
      var p = r.split(/\s+/), name = p[0].toLowerCase();
      if (allowed.indexOf(name) < 0) throw new Error('Unknown operation "' + r + '". Allowed: ' + allowed.join(', ') + '. Example: "' + def + '"');
      if (name === 'push') {
        var v = Number(p[1]);
        if (p.length !== 2 || isNaN(v) || Math.floor(v) !== v) throw new Error('"push" needs one whole number, e.g. "push 5"');
        return { op: 'push', v: v };
      }
      if (p.length !== 1) throw new Error('"' + name + '" takes no number. Example: "' + def + '"');
      return { op: name };
    });
  }

  // =====================================================================
  // TOPIC 1 — Stack (LIFO) vs Queue (FIFO) in Java
  // =====================================================================
  topics.push({
    title: 'Stack (LIFO) vs Queue (FIFO) — and which container to use',
    analogy: `<p><b>Stack = a pile of plates</b> in a kitchen. You always put a clean plate on <b>top</b>, and you always take the plate from the <b>top</b>. The plate you put last is the first one you use. That is <b>LIFO</b>: <i>Last In, First Out</i>.</p>
      <p><b>Queue = the line at a movie ticket counter.</b> New people join at the <b>back</b>, the person at the <b>front</b> gets served first. Whoever came first leaves first. That is <b>FIFO</b>: <i>First In, First Out</i>.</p>`,
    explain: `<p>Both are just lists where you are <b>only allowed to touch the ends</b>. That small rule is exactly what makes them powerful: every add/remove is <b>O(1)</b>, and the order things come out tells you something useful (most recent first, or oldest first).</p>
      ${H.arr([3, 5, 8], { label: 'stack (top is right)', hl: { 2: 'y' }, ptr: { 2: 'top' } })}
      ${H.arr([3, 5, 8], { label: 'queue (front is left)', hl: { 0: 'y' }, ptr: { 0: 'front', 2: 'back' } })}
      <p>Put in 3, then 5, then 8. The stack gives them back as ${H.c('y', '8, 5, 3')} (newest first). The queue gives them back as ${H.c('y', '3, 5, 8')} (oldest first).</p>
      <h4>The cheat sheet (Java names)</h4>
      ${H.table(['What you want', 'Stack style (ArrayDeque)', 'Queue style (ArrayDeque)', 'If empty...'], [
        ['add', '<code>push(x)</code> → goes on top', '<code>offer(x)</code> → joins the back', '—'],
        ['remove', '<code>pop()</code> → removes top', '<code>poll()</code> → removes front', 'pop() throws, poll() returns null'],
        ['look only', '<code>peek()</code> → top', '<code>peek()</code> → front', 'returns null'],
        ['is it empty?', '<code>isEmpty()</code>', '<code>isEmpty()</code>', '—'],
        ['size', '<code>size()</code>', '<code>size()</code>', '—']
      ])}
      <p>Declare them as <code>Deque&lt;Integer&gt; st = new ArrayDeque&lt;&gt;();</code> and <code>Queue&lt;Integer&gt; q = new ArrayDeque&lt;&gt;();</code>. A <b>Deque</b> ("deck", double-ended queue) lets you work at both ends: <code>offerFirst / offerLast / pollFirst / pollLast / peekFirst / peekLast</code>. We need that later for the sliding window.</p>
      <h4>The same tools in other languages</h4>
      ${H.table(['language', 'stack', 'queue', 'both ends (deque)'], [
        ['Java', '<code>ArrayDeque</code>: push / pop / peek', '<code>ArrayDeque</code>: offer / poll / peek', '<code>ArrayDeque</code>: offerFirst / pollLast …'],
        ['Python', '<code>list</code>: append / pop / <code>[-1]</code>', '<code>collections.deque</code>: append / popleft', '<code>deque</code>: appendleft / pop …'],
        ['JavaScript', 'array: push / pop / <code>[length - 1]</code>', 'array + head index (<code>shift()</code> is O(n))', 'no built-in; head/tail indices over an array'],
        ['C++', '<code>std::stack</code> (or <code>vector</code>)', '<code>std::queue</code>: push / front / pop', '<code>std::deque</code>: push_front / pop_back …']
      ])}
      <p>Empty behaviour differs too: Java <code>poll()</code> returns <code>null</code>, Python <code>[].pop()</code> raises <code>IndexError</code>, JS <code>[].pop()</code> quietly returns <code>undefined</code>, and C++ <code>top()</code>/<code>pop()</code> on an empty container is undefined behaviour. In every language: check for empty first.</p>
      <h4>Java only: why NOT the old <code>Stack</code> class?</h4>
      <ul>
        <li><code>java.util.Stack</code> is from Java 1.0 and extends <code>Vector</code>. Every method is <b>synchronized</b> (it takes a lock each call) → slower for no benefit in single-threaded code.</li>
        <li>It lets you do <code>get(i)</code>, <code>add(index, x)</code>, <code>remove(index)</code> — touching the middle breaks the "only the top" idea and invites bugs.</li>
        <li>The Java docs themselves say: <i>prefer <code>Deque</code> / <code>ArrayDeque</code></i>. <code>ArrayDeque</code> is a growable circular array: fast and cache friendly.</li>
      </ul>
      <h4>Three classic traps</h4>
      <ul>
        <li>${H.c('r', 'ArrayDeque refuses null')} — <code>push(null)</code> throws. Use a sentinel value instead.</li>
        <li>${H.c('r', 'Comparing two Integer objects with ==')} — <code>st.peek() == q.peek()</code> compares <i>references</i>; it works for small numbers (-128..127 are cached) and silently fails for bigger ones. Use <code>.equals()</code> or unbox to <code>int</code> first.</li>
        <li>${H.c('r', 'Calling pop() on an empty stack')} — always check <code>isEmpty()</code> first (very common in bracket problems).</li>
      </ul>`,
    clues: [
      '"Most recent", "undo", "go back", "matching / nested" → <b>stack</b> (LIFO).',
      '"In the order they arrived", "first come first served", "level by level" → <b>queue</b> (FIFO).',
      'Need to add/remove at <b>both ends</b> (e.g. a sliding window) → <b>deque</b> (<code>ArrayDeque</code> / <code>collections.deque</code> / <code>std::deque</code>; in JS an array with head and tail indices).',
      'Java: you see <code>Stack&lt;Integer&gt;</code> in old code → in interviews prefer <code>Deque&lt;Integer&gt; st = new ArrayDeque&lt;&gt;()</code>.',
      'Recursion that might go 10<sup>5</sup> deep (stack overflow risk) → simulate it with your own explicit stack.'
    ],
    code: [{ lang: 'java', code: `
import java.util.*;

class StackQueueDemo {
    public static void main(String[] args) {
        // ---------- STACK (LIFO) with ArrayDeque ----------
        Deque<Integer> stack = new ArrayDeque<>();
        stack.push(3);                       // stack: [3]          top = 3
        stack.push(5);                       // stack: [5, 3]       top = 5
        stack.push(8);                       // stack: [8, 5, 3]    top = 8
        System.out.println(stack.peek());    // 8 -> look at the top, do NOT remove
        System.out.println(stack.pop());     // 8 -> remove the top
        System.out.println(stack.pop());     // 5
        System.out.println(stack.size());    // 1 -> only 3 is left

        // ---------- QUEUE (FIFO) with ArrayDeque ----------
        Queue<Integer> queue = new ArrayDeque<>();
        queue.offer(3);                      // queue: front [3] back
        queue.offer(5);                      // queue: front [3, 5] back
        queue.offer(8);                      // queue: front [3, 5, 8] back
        System.out.println(queue.peek());    // 3 -> the oldest item (front)
        System.out.println(queue.poll());    // 3 -> remove the front
        System.out.println(queue.poll());    // 5

        // ---------- DEQUE: work at BOTH ends ----------
        Deque<Integer> dq = new ArrayDeque<>();
        dq.offerLast(1);                     // [1]
        dq.offerLast(2);                     // [1, 2]
        dq.offerFirst(0);                    // [0, 1, 2]
        System.out.println(dq.peekFirst());  // 0
        System.out.println(dq.peekLast());   // 2
        dq.pollLast();                       // [0, 1]
        dq.pollFirst();                      // [1]

        // ---------- Safe empty handling ----------
        Deque<Integer> empty = new ArrayDeque<>();
        System.out.println(empty.peek());    // null (no exception)
        System.out.println(empty.poll());    // null (no exception)
        if (!empty.isEmpty()) {              // ALWAYS guard pop()
            empty.pop();                     // pop() on empty would throw NoSuchElementException
        }

        // ---------- Integer comparison trap ----------
        Deque<Integer> a = new ArrayDeque<>();
        Deque<Integer> b = new ArrayDeque<>();
        a.push(1000);
        b.push(1000);
        boolean wrong = a.peek() == b.peek();            // compares object references: false!
        boolean right = a.peek().equals(b.peek());       // compares values: true
        int x = a.peek(), y = b.peek();                  // or unbox to int first
        System.out.println(wrong + " " + right + " " + (x == y));
    }
}`,
      alt: [{ lang: 'python', run: true, code: `from collections import deque

# ---------- STACK (LIFO) with a list ----------
stack = []
stack.append(3)                  # [3]        top = 3
stack.append(5)                  # [3, 5]     top = 5
stack.append(8)                  # [3, 5, 8]  top = 8
print(stack[-1])                 # 8 -> look at the top, do NOT remove
print(stack.pop())               # 8 -> remove the top
print(stack.pop())               # 5
print(len(stack))                # 1 -> only 3 is left

# ---------- QUEUE (FIFO) with collections.deque ----------
queue = deque()
queue.append(3)                  # front [3] back
queue.append(5)                  # front [3, 5] back
queue.append(8)                  # front [3, 5, 8] back
print(queue[0])                  # 3 -> the oldest item (front)
print(queue.popleft())           # 3 -> O(1); list.pop(0) would be O(n)
print(queue.popleft())           # 5

# ---------- DEQUE: work at BOTH ends ----------
dq = deque()
dq.append(1)                     # [1]
dq.append(2)                     # [1, 2]
dq.appendleft(0)                 # [0, 1, 2]
print(dq[0], dq[-1])             # 0 2
dq.pop()                         # [0, 1]
dq.popleft()                     # [1]

# ---------- Safe empty handling ----------
empty = []
print(empty[-1] if empty else None)   # None: guard before peeking
if empty:                             # ALWAYS guard pop(): [].pop() raises IndexError
    empty.pop()

# ---------- Value vs identity ----------
a, b = [1000], [int("1000")]
print(a[-1] is b[-1], a[-1] == b[-1])  # False True: compare values with ==, never "is"` }, { lang: 'js', run: true, code: `// ---------- STACK (LIFO) with an array ----------
const stack = [];
stack.push(3);                                // [3]        top = 3
stack.push(5);                                // [3, 5]     top = 5
stack.push(8);                                // [3, 5, 8]  top = 8
console.log(stack[stack.length - 1]);         // 8 -> look at the top, do NOT remove
console.log(stack.pop());                     // 8 -> remove the top
console.log(stack.pop());                     // 5
console.log(stack.length);                    // 1 -> only 3 is left

// ---------- QUEUE (FIFO): array + head index ----------
// array.shift() is O(n), so a queue keeps a head pointer instead.
const queue = [];
let head = 0;
queue.push(3);                                // front [3] back
queue.push(5);                                // front [3, 5] back
queue.push(8);                                // front [3, 5, 8] back
console.log(queue[head]);                     // 3 -> the oldest item (front)
console.log(queue[head++]);                   // 3 -> remove the front in O(1)
console.log(queue[head++]);                   // 5

// ---------- Both ends: fine for small arrays ----------
const dq = [1, 2];
dq.unshift(0);                                // [0, 1, 2] (unshift is O(n))
console.log(dq[0], dq[dq.length - 1]);        // 0 2
dq.pop();                                     // [0, 1]
dq.shift();                                   // [1]

// ---------- Safe empty handling ----------
const empty = [];
console.log(empty.pop());                     // undefined: no exception, so check length
console.log(empty[empty.length - 1]);         // undefined

// ---------- Value vs reference ----------
const a = [1000], b = [1000];
console.log(a[0] === b[0], a === b);          // true false: numbers by value, arrays by reference` }, { lang: 'cpp', code: `int main() {
    // ---------- STACK (LIFO) ----------
    stack<int> st;
    st.push(3);                                  // top = 3
    st.push(5);                                  // top = 5
    st.push(8);                                  // top = 8
    cout << st.top() << "\\n";                    // 8 -> look at the top, do NOT remove
    st.pop();                                    // pop() returns void: read top() first
    cout << st.top() << "\\n";                    // 5
    st.pop();
    cout << st.size() << "\\n";                   // 1 -> only 3 is left

    // ---------- QUEUE (FIFO) ----------
    queue<int> q;
    q.push(3);                                   // front [3] back
    q.push(5);                                   // front [3, 5] back
    q.push(8);                                   // front [3, 5, 8] back
    cout << q.front() << "\\n";                   // 3 -> the oldest item (front)
    q.pop();                                     // remove the front
    cout << q.front() << "\\n";                   // 5

    // ---------- DEQUE: work at BOTH ends in O(1) ----------
    deque<int> dq;
    dq.push_back(1);                             // [1]
    dq.push_back(2);                             // [1, 2]
    dq.push_front(0);                            // [0, 1, 2]
    cout << dq.front() << " " << dq.back() << "\\n";   // 0 2
    dq.pop_back();                               // [0, 1]
    dq.pop_front();                              // [1]

    // ---------- Safe empty handling ----------
    stack<int> empty;
    if (!empty.empty()) empty.pop();             // top()/pop() on an empty stack is undefined behaviour
    cout << boolalpha << empty.empty() << "\\n";  // true
    return 0;
}` }] }, { lang: 'java', code: `
import java.util.*;

class LegacyStackWarning {
    public static void main(String[] args) {
        // Works, but NOT recommended: synchronized (slow) and allows middle access.
        Stack<Integer> old = new Stack<>();
        old.push(1);
        old.push(2);
        int middle = old.get(0);       // legal on Stack -> breaks the LIFO idea
        System.out.println(middle + " " + old.peek());

        // Recommended replacement: same push / pop / peek names.
        Deque<Integer> st = new ArrayDeque<>();
        st.push(1);
        st.push(2);
        System.out.println(st.peek()); // 2
    }
}`,
      alt: [{ lang: 'python', run: true, code: `import queue

# queue.LifoQueue is a thread-safe stack: every call takes a lock (slow for one thread).
old = queue.LifoQueue()
old.put(1)
old.put(2)
print(old.get())        # 2

# For algorithms use a plain list: append = push, pop() = pop, [-1] = peek.
st = []
st.append(1)
st.append(2)
middle = st[0]          # legal on a list, but it breaks the "only the top" idea
print(middle, st[-1])   # 1 2` }, { lang: 'js', run: true, code: `// JS has no Stack class: an array is the stack. It also allows middle access,
// so stick to push / pop / [length - 1] to keep the LIFO idea.
const st = [];
st.push(1);
st.push(2);
const middle = st[0];                       // legal, but breaks the "only the top" rule
console.log(middle, st[st.length - 1]);     // 1 2` }, { lang: 'cpp', code: `int main() {
    // A vector allows middle access; std::stack is an adaptor that hides it.
    vector<int> v{1, 2};
    cout << v[0] << " " << v.back() << "\\n";   // 1 2: middle access is legal on a vector

    stack<int> st;                              // only push / pop / top / size / empty
    st.push(1);
    st.push(2);
    cout << st.top() << "\\n";                   // 2
    return 0;
}` }] }],
    codeTitle: ['Stack, Queue and Deque with ArrayDeque', 'Legacy Stack vs ArrayDeque'],
    examples: [
      {
        title: 'Browser Back button = stack, printer jobs = queue',
        html: `<p>You visit pages A → B → C. The browser <b>pushes</b> each page on a history stack. Pressing Back <b>pops</b> C and shows B — the most recent page first. A printer works the other way: jobs from Asha, Ben and Chen print in the order they were sent (<b>FIFO</b>), so nobody can "cut the line".</p>
          ${H.table(['action', 'history stack (top right)', 'printer queue (front left)'], [
            ['visit A / send job Asha', 'A', 'Asha'],
            ['visit B / send job Ben', 'A B', 'Asha Ben'],
            ['visit C / send job Chen', 'A B <b>C</b>', '<b>Asha</b> Ben Chen'],
            ['Back / print one', 'A B (C popped)', 'Ben Chen (Asha printed)']
          ])}
          <p>Same three inputs, opposite output order. The question is always: <b>"who should leave first — the newest or the oldest?"</b></p>`
      },
      {
        title: 'Reverse a word with a stack (and why it is O(N))',
        html: `<p>Push every character of <code>"CODE"</code>, then pop them all: you get <code>"EDOC"</code>. Each character is pushed once and popped once → 2N steps → O(N) time, O(N) extra space. This "push everything, pop everything" move is the simplest way to <b>reverse</b> any sequence — and it is exactly what the call stack does when recursion "unwinds".</p>
          ${H.arr(['C', 'O', 'D', 'E'], { label: 'push order', hl: { 3: 'g' } })}
          ${H.arr(['E', 'D', 'O', 'C'], { label: 'pop order', hl: { 0: 'g' } })}`,
        code: { lang: 'java', code: `String reverse(String s) {
    Deque<Character> st = new ArrayDeque<>();
    for (char c : s.toCharArray()) st.push(c);      // C, O, D, E -> E on top
    StringBuilder sb = new StringBuilder();
    while (!st.isEmpty()) sb.append(st.pop());      // E, D, O, C
    return sb.toString();
}`,
      alt: [{ lang: 'python', code: `def reverse(s: str) -> str:
    st = list(s)                                   # C, O, D, E -> E on top
    return ''.join(st.pop() for _ in range(len(st)))   # E, D, O, C` }, { lang: 'js', code: `function reverse(s) {
  const st = [...s];                      // C, O, D, E -> E on top
  let out = '';
  while (st.length) out += st.pop();      // E, D, O, C
  return out;
}` }, { lang: 'cpp', code: `string reverseWord(const string& s) {
    stack<char> st;
    for (char c : s) st.push(c);          // C, O, D, E -> E on top
    string out;
    while (!st.empty()) { out += st.top(); st.pop(); }   // E, D, O, C
    return out;
}` }] }
      },
      {
        title: 'Explicit stack instead of recursion (DFS without StackOverflowError)',
        html: `<p>A recursive DFS on a 10<sup>5</sup>-long chain can crash (Java <code>StackOverflowError</code>, Python <code>RecursionError</code> after ~1000 frames, JS <code>RangeError</code>, a C++ segfault) because every call uses a frame on the thread's call stack. Replace the hidden call stack with your <b>own</b> stack on the heap: push the start, then loop "pop one, push its unvisited neighbours". Same order idea, no crash.</p>
          <p>Swap the stack for a queue and the <b>same loop</b> becomes BFS (level by level). That one-word change — <code>pop()</code> vs <code>poll()</code> — is the cleanest demonstration of LIFO vs FIFO you will ever see.</p>`,
        code: { lang: 'java', code: `List<Integer> dfsOrder(List<List<Integer>> adj, int start) {
    List<Integer> order = new ArrayList<>();
    boolean[] seen = new boolean[adj.size()];
    Deque<Integer> st = new ArrayDeque<>();
    st.push(start);
    while (!st.isEmpty()) {
        int u = st.pop();                       // LIFO -> goes deep first
        if (seen[u]) continue;
        seen[u] = true;
        order.add(u);
        for (int v : adj.get(u)) if (!seen[v]) st.push(v);
    }
    return order;
}`,
      alt: [{ lang: 'python', code: `def dfs_order(adj: list[list[int]], start: int) -> list[int]:
    order, seen = [], [False] * len(adj)
    st = [start]                       # our own stack lives on the heap: no recursion limit
    while st:
        u = st.pop()                   # LIFO -> goes deep first
        if seen[u]:
            continue
        seen[u] = True
        order.append(u)
        st.extend(v for v in adj[u] if not seen[v])
    return order` }, { lang: 'js', code: `function dfsOrder(adj, start) {
  const order = [], seen = new Array(adj.length).fill(false);
  const st = [start];                    // our own stack: no call-stack overflow
  while (st.length) {
    const u = st.pop();                  // LIFO -> goes deep first
    if (seen[u]) continue;
    seen[u] = true;
    order.push(u);
    for (const v of adj[u]) if (!seen[v]) st.push(v);
  }
  return order;
}` }, { lang: 'cpp', code: `vector<int> dfsOrder(const vector<vector<int>>& adj, int start) {
    vector<int> order;
    vector<bool> seen(adj.size(), false);
    vector<int> st{start};               // our own stack on the heap: no 8 MB limit
    while (!st.empty()) {
        int u = st.back(); st.pop_back(); // LIFO -> goes deep first
        if (seen[u]) continue;
        seen[u] = true;
        order.push_back(u);
        for (int v : adj[u]) if (!seen[v]) st.push_back(v);
    }
    return order;
}` }] }
      },
      {
        title: 'Picking the right method name (exception vs special value)',
        html: `<p>Java gives every queue operation in two flavours (Python and C++ have one flavour each: Python raises, C++ is undefined on empty; JS returns <code>undefined</code>). Mixing them up is a classic bug source:</p>
          ${H.table(['operation', 'throws if it fails', 'returns special value'], [
            ['insert at back', '<code>add(x)</code> / <code>addLast(x)</code>', '<code>offer(x)</code> → false'],
            ['remove front', '<code>remove()</code> / <code>pop()</code>', '<code>poll()</code> → null'],
            ['look at front', '<code>element()</code> / <code>getFirst()</code>', '<code>peek()</code> → null']
          ])}
          <p>On an <code>ArrayDeque</code> (unbounded) <code>offer</code> never fails, but <code>poll()</code> returning <code>null</code> and then auto-unboxing into <code>int</code> throws a <code>NullPointerException</code> one line later — far from the real mistake.</p>`
      }
    ],
    deepDive: `<p><b>How ArrayDeque really works.</b> It is a <b>circular buffer</b>: one <code>Object[]</code> plus a <code>head</code> index and a <code>tail</code> index. <code>addFirst</code> moves head one slot left (wrapping to the end with modular arithmetic), <code>addLast</code> writes at tail and moves it right. No element is ever shifted, so both ends are O(1). When the array fills up it grows (the default constructor starts with about 16 slots; small arrays roughly double, large ones grow by ~50%) and copies the elements into the new array in order — an O(N) step that happens so rarely that each insert is still <b>amortized O(1)</b>.</p>
      <p><b>ArrayDeque vs LinkedList.</b> <code>LinkedList</code> also implements <code>Deque</code> but allocates a node object (~24–40 bytes plus the boxed value) per element and chases pointers all over the heap → poor cache locality and extra garbage-collection work. In benchmarks <code>ArrayDeque</code> is typically several times faster for stack/queue work. <code>LinkedList</code> allows <code>null</code>; <code>ArrayDeque</code> does not (it uses <code>null</code> internally to mean "empty slot").</p>
      <p><b>Boxing cost.</b> <code>Deque&lt;Integer&gt;</code> stores references to <code>Integer</code> objects. For hot loops with 10<sup>6</sup>+ operations, competitive programmers use a plain <code>int[] st = new int[n]; int top = 0;</code> — push is <code>st[top++] = x</code>, pop is <code>st[--top]</code>. Zero allocation, fastest possible. You can say this in an interview as a performance follow-up.</p>
      <p><b>Concurrency.</b> Neither <code>ArrayDeque</code> nor <code>LinkedList</code> is thread-safe. For producer/consumer queues use <code>ArrayBlockingQueue</code>, <code>LinkedBlockingQueue</code> (blocking <code>put/take</code>) or the lock-free <code>ConcurrentLinkedDeque</code>. The legacy <code>Stack</code> is synchronized, but "synchronized per call" still does not make <i>check-then-pop</i> atomic, so it is not a real fix anyway.</p>
      <p><b>Iteration order trap.</b> Iterating a <code>Deque</code> used as a stack goes <b>top → bottom</b> (most recent first), while <code>java.util.Stack</code> iterates bottom → top (it is a Vector). Printing both gives opposite orders.</p>`,
    aiEra: `<p><b>What AI changes:</b> any assistant will happily type <code>Deque&lt;Integer&gt; st = new ArrayDeque&lt;&gt;()</code> for you, so memorising syntax is worth less. What is worth <b>more</b> is instantly recognising <i>which</i> discipline a problem needs (newest-first vs oldest-first vs both ends) — that decision comes before any code is generated, and a wrong decision makes the AI write perfect code for the wrong algorithm.</p>
      <p><b>Use AI as a partner:</b> ask <code>"Here is my stack-based solution. List 6 adversarial inputs (empty, one element, all same, max size) and predict where it throws."</code> or <code>"Convert this recursive DFS to an explicit-stack version and explain why the visit order may differ."</code></p>
      <p><b>Where AI goes wrong:</b> it still suggests the legacy <code>Stack</code> class, pushes <code>null</code> into an <code>ArrayDeque</code>, compares <code>Integer</code> objects with <code>==</code>, or mixes <code>push</code> (front) with <code>offer</code> (back) on the same deque and silently gets the order wrong. Read every generated deque call and ask "which end?"</p>
      <p><b>What you must still own:</b> explaining LIFO/FIFO with an analogy, the amortized-growth argument, and spotting when recursion depth will blow the call stack.</p>`,
    viz: [{
      title: 'Same items, two rules: stack vs queue',
      input: '3 5 8 2',
      inputLabel: 'Numbers to insert (space separated, up to 8)',
      gen: function (input) {
        var a = parseNums(input, '3 5 8 2', 8, 1);
        var st = [], q = [], frames = [], outS = [], outQ = [];
        function vv() { return { type: 'vars', label: 'came out so far', vals: { 'stack out': outS.length ? outS.join(', ') : '—', 'queue out': outQ.length ? outQ.join(', ') : '—' } }; }
        frames.push({ narr: 'We will put the <b>same numbers</b> into a stack (pile of plates) and a queue (ticket line), then take them all out and compare the order.', parts: [
          { type: 'array', label: 'numbers to insert', values: a },
          { type: 'stack', label: 'Stack (ArrayDeque, push/pop)', items: [] },
          { type: 'queue', label: 'Queue (ArrayDeque, offer/poll)', items: [] }
        ] });
        for (var i = 0; i < a.length; i++) {
          st.push(a[i]); q.push(a[i]);
          frames.push({ narr: '<code>stack.push(' + a[i] + ')</code> puts it on the <b>top</b>. <code>queue.offer(' + a[i] + ')</code> puts it at the <b>back</b> of the line.', parts: [
            { type: 'array', label: 'numbers to insert', values: a, hl: one(i, 'cur'), ptr: one(i, 'next') },
            { type: 'stack', label: 'Stack (ArrayDeque, push/pop)', items: st.slice(), hl: one(st.length - 1, 'ok') },
            { type: 'queue', label: 'Queue (ArrayDeque, offer/poll)', items: q.slice(), hl: one(q.length - 1, 'ok') }
          ] });
        }
        while (st.length) {
          frames.push({ narr: 'Now remove one from each. <code>pop()</code> takes the <b>top</b> plate (' + st[st.length - 1] + ', the newest). <code>poll()</code> serves the <b>front</b> person (' + q[0] + ', the oldest).', parts: [
            { type: 'stack', label: 'Stack (ArrayDeque, push/pop)', items: st.slice(), hl: one(st.length - 1, 'bad') },
            { type: 'queue', label: 'Queue (ArrayDeque, offer/poll)', items: q.slice(), hl: one(0, 'bad') },
            vv()
          ] });
          outS.push(st.pop()); outQ.push(q.shift());
        }
        frames.push({ narr: 'Done. The stack gave them back <b>reversed</b> (LIFO: last in, first out). The queue gave them back in the <b>same order</b> (FIFO: first in, first out).', parts: [
          { type: 'array', label: 'stack output order', values: outS.slice(), hl: one(0, 'sel') },
          { type: 'array', label: 'queue output order', values: outQ.slice(), hl: one(0, 'sel') },
          vv()
        ] });
        return frames;
      }
    }, {
      title: 'Inside ArrayDeque: a circular buffer with head and tail',
      input: 'addLast 1, addLast 2, addFirst 0, addLast 3, pollFirst, addLast 4, addLast 5, addLast 6, pollLast',
      inputLabel: 'Ops: addFirst x / push x, addLast x / offer x, pollFirst / pop / poll, pollLast (comma separated, up to 14)',
      gen: function (input) {
        var s = (input === undefined || input === null) ? '' : String(input);
        var raw = s.split(/[,;\n]+/).map(function (x) { return x.trim(); }).filter(function (x) { return x.length; });
        if (!raw.length) throw new Error('Enter operations like "addLast 1, addFirst 0, pollFirst"');
        if (raw.length > 14) throw new Error('Please use at most 14 operations.');
        var alias = { push: 'addfirst', offer: 'addlast', pop: 'pollfirst', poll: 'pollfirst', addfirst: 'addfirst', addlast: 'addlast', pollfirst: 'pollfirst', polllast: 'polllast', offerfirst: 'addfirst', offerlast: 'addlast' };
        var ops = raw.map(function (r) {
          var p = r.split(/\s+/), name = alias[p[0].toLowerCase()];
          if (!name) throw new Error('Unknown operation "' + r + '". Use addFirst x, addLast x, pollFirst, pollLast (or push/offer/pop/poll).');
          if (name === 'addfirst' || name === 'addlast') {
            var v = Number(p[1]);
            if (p.length !== 2 || isNaN(v) || Math.floor(v) !== v) throw new Error('"' + p[0] + '" needs one whole number, e.g. "addLast 5"');
            return { op: name, v: v };
          }
          return { op: name };
        });
        var cap = 4, buf = [null, null, null, null], head = 0, size = 0, frames = [];
        function show(hl, extra) {
          var vals = buf.map(function (x) { return x === null ? '·' : x; }), ptr = {};
          var tail = (head + size) % cap;
          if (size === 0) ptr[head] = 'head=tail';
          else if (tail === head) ptr[head] = 'head=tail';
          else { ptr[head] = 'head'; ptr[tail] = 'tail'; }
          var logical = [];
          for (var k = 0; k < size; k++) logical.push(buf[(head + k) % cap]);
          return [
            { type: 'array', label: 'elements[] (capacity ' + cap + ')', values: vals, hl: hl || {}, ptr: ptr, showIdx: true },
            { type: 'queue', label: 'what the user sees (first → last)', items: logical, frontLabel: 'first', backLabel: 'last' },
            { type: 'vars', vals: Object.assign({ head: head, tail: tail, size: size }, extra || {}) }
          ];
        }
        frames.push({ narr: 'A tiny ArrayDeque with <b>4 slots</b> (the real one starts with about 16). <b>head</b> = index of the first element, <b>tail</b> = the next free slot after the last element. Nothing is ever shifted.', parts: show() });
        function grow() {
          var nb = [], k;
          for (k = 0; k < size; k++) nb.push(buf[(head + k) % cap]);
          var old = cap;
          cap = cap * 2;
          while (nb.length < cap) nb.push(null);
          buf = nb; head = 0;
          var h = {};
          for (k = 0; k < size; k++) h[k] = 'win';
          frames.push({ narr: 'The buffer was <span class="c-r">full</span> (' + old + '/' + old + '). Grow: allocate ' + cap + ' slots and copy the elements <b>in logical order</b> starting at index 0. This O(N) copy is rare, so adds stay <b>amortized O(1)</b>.', parts: show(h, { grew: old + ' → ' + cap }) });
        }
        ops.forEach(function (o) {
          var h = {}, idx;
          if (o.op === 'addfirst' || o.op === 'addlast') {
            if (size === cap) grow();
            if (o.op === 'addfirst') {
              head = (head - 1 + cap) % cap; buf[head] = o.v; idx = head; size++;
              h[idx] = 'ok';
              frames.push({ narr: '<code>addFirst(' + o.v + ')</code>: head moves one step <b>left</b> — (head - 1 + cap) % cap = <b>' + head + '</b> — and ' + o.v + ' is written there. ' + (idx === cap - 1 ? 'It <b>wrapped around</b> to the end of the array!' : '') + ' <span class="c-g">O(1)</span>.', parts: show(h) });
            } else {
              idx = (head + size) % cap; buf[idx] = o.v; size++;
              h[idx] = 'ok';
              frames.push({ narr: '<code>addLast(' + o.v + ')</code>: write at tail index <b>' + idx + '</b>, then tail moves right (with wrap-around). <span class="c-g">O(1)</span>.', parts: show(h) });
            }
            return;
          }
          if (!size) { frames.push({ narr: '<code>' + o.op + '()</code> on an empty deque returns <b>null</b> (pollFirst/pollLast never throw). Nothing changes.', parts: show({}, { returned: 'null' }) }); return; }
          if (o.op === 'pollfirst') {
            idx = head; var v1 = buf[idx]; h[idx] = 'bad';
            frames.push({ narr: '<code>pollFirst()</code>: take the element at head (' + v1 + ').', parts: show(h, { returned: v1 }) });
            buf[idx] = null; head = (head + 1) % cap; size--;
            frames.push({ narr: 'Clear the slot (set to null so the garbage collector can free it) and move head one step right → head = <b>' + head + '</b>.', parts: show({}, { returned: v1 }) });
          } else {
            idx = (head + size - 1) % cap; var v2 = buf[idx]; h[idx] = 'bad';
            frames.push({ narr: '<code>pollLast()</code>: take the element just before tail (index ' + idx + ', value ' + v2 + ').', parts: show(h, { returned: v2 }) });
            buf[idx] = null; size--;
            frames.push({ narr: 'Clear the slot and move tail one step left. Both ends work in <b>O(1)</b> — that is why ArrayDeque is a great stack <i>and</i> queue.', parts: show({}, { returned: v2 }) });
          }
        });
        frames.push({ narr: 'Done. Notice the elements can sit in any slots (even wrapped around), but head + size always tells us the logical order. Middle insert/remove is <b>not</b> supported — and you never need it for a stack or queue.', parts: show() });
        return frames;
      }
    }],
    problems: [{
      title: 'Implement Stack using Queues',
      level: 'Easy',
      tags: ['stack', 'queue', 'design'],
      companies: ['Amazon', 'Microsoft', 'Bloomberg'],
      statement: `<p>Implement a LIFO stack <code>MyStack</code> with <code>push(x)</code>, <code>pop()</code>, <code>top()</code> and <code>empty()</code> using <b>only queue operations</b>: add to back, peek/remove from front, size and isEmpty.</p>`,
      constraints: `1 ≤ x ≤ 9, at most 100 calls; pop and top are only called on a non-empty stack`,
      example: `${H.table(['call', 'returns', 'stack (bottom→top)'], [
        ['push(1)', '—', '1'], ['push(2)', '—', '1, 2'], ['top()', '<span class="c-p">2</span>', '1, 2'],
        ['pop()', '<span class="c-p">2</span>', '1'], ['empty()', '<span class="c-p">false</span>', '1']
      ])}<p>The <b>last</b> item pushed comes out first, even though a queue alone would give the <b>first</b> one.</p>`,
      brute: {
        why: `<p>Keep items in queue <code>q1</code> in arrival order. To pop, move the first <code>size - 1</code> items into helper queue <code>q2</code>, remove the last remaining one, then swap the queues. Every <code>pop</code> <b>and</b> every <code>top</code> costs O(N), and the code juggles two queues — easy to get wrong. It works, but we can make the expensive part happen only once per element and keep reads O(1).</p>`,
        code: `
import java.util.*;

class MyStackTwoQueues {
    private Queue<Integer> q1 = new ArrayDeque<>();
    private Queue<Integer> q2 = new ArrayDeque<>();

    public void push(int x) { q1.offer(x); }            // O(1)

    public int pop() {
        while (q1.size() > 1) q2.offer(q1.poll());      // move all but the newest: O(N)
        int last = q1.poll();
        Queue<Integer> t = q1; q1 = q2; q2 = t;          // swap roles
        return last;
    }

    public int top() {
        int x = pop();                                   // O(N) again just to peek
        push(x);
        return x;
    }

    public boolean empty() { return q1.isEmpty(); }
}`
      },
      mcq: {
        q: 'The queue (front→back) is <code>3, 2, 1</code>, meaning 3 is the stack top. We push 4 with the "rotate after push" trick. What does the queue look like after the rotation?',
        options: ['<code>3, 2, 1, 4</code>', '<code>4, 3, 2, 1</code>', '<code>1, 2, 3, 4</code>', '<code>4, 1, 2, 3</code>'],
        answer: 1,
        explain: 'Offer 4 → <code>3, 2, 1, 4</code>. Then rotate size-1 = 3 times (poll front, offer back): 2,1,4,3 → 1,4,3,2 → 4,3,2,1. The newest item is at the front, so poll() returns it first.'
      },
      hints: [
        `<p>Aha: a queue gives you the <b>oldest</b> item. If, right after every push, you move all the older items behind the new one, the newest item ends up at the <b>front</b> — so the queue front is always the stack top.</p>`,
        `<p>One queue is enough (<code>ArrayDeque</code> / <code>deque</code> / <code>std::queue</code>; in JS an array with a head index). <code>push(x)</code>: <code>offer(x)</code>, then repeat <code>size - 1</code> times: <code>offer(poll())</code>. Now <code>pop()</code> = <code>poll()</code>, <code>top()</code> = <code>peek()</code>.</p>`,
        `<p>Edge cases: rotating <code>size - 1</code> times (not <code>size</code>, which would undo the work); a single element needs zero rotations; <code>empty()</code> = <code>q.isEmpty()</code>. Recipe: push → offer, rotate n-1; pop → poll; top → peek; empty → isEmpty. Push becomes O(N), everything else O(1).</p>`
      ],
      tests: { cls: "MyStack", sigs: {"MyStack":"","push":"int -> void","pop":"-> int","top":"-> int","empty":"-> bool"}, cases: [
        {"ops":["MyStack","push","push","top","pop","empty"],"args":[[],[1],[2],[],[],[]],"out":[null,null,null,2,2,false]},
        {"ops":["MyStack","empty"],"args":[[],[]],"out":[null,true]},
        {"ops":["MyStack","push","top","pop","empty"],"args":[[],[9],[],[],[]],"out":[null,null,9,9,true]},
        {"ops":["MyStack","push","push","push","pop","pop","pop","empty"],"args":[[],[1],[2],[3],[],[],[],[]],"out":[null,null,null,null,3,2,1,true]},
        {"ops":["MyStack","push","push","pop","push","top","pop","top"],"args":[[],[4],[5],[],[6],[],[],[]],"out":[null,null,null,5,null,6,6,4]},
        {"ops":["MyStack","push","push","push","top","pop","top","empty"],"args":[[],[7],[7],[7],[],[],[],[]],"out":[null,null,null,null,7,7,7,false]},
        {"ops":["MyStack","push","push","push","push","push","push","pop","pop","pop","pop","pop","pop","empty"],"args":[[],[1],[2],[3],[4],[5],[6],[],[],[],[],[],[],[]],"out":[null,null,null,null,null,null,null,6,5,4,3,2,1,true]}
      ] },
      solution: {
        approach: `<p>Pay the O(N) cost <b>once at push time</b> by rotating the queue so the newest element sits at the front. Reads (<code>top</code>) and removals (<code>pop</code>) become O(1). Choose this when pops/tops are more frequent than pushes; choose the two-queue version when pushes dominate.</p>`,
        code: `
import java.util.*;

class MyStack {
    private final Queue<Integer> q = new ArrayDeque<>();   // front of q = top of stack

    public void push(int x) {
        q.offer(x);                                    // newest goes to the back...
        for (int i = 0; i < q.size() - 1; i++) {
            q.offer(q.poll());                         // ...then every older item walks behind it
        }
    }

    public int pop() { return q.poll(); }              // front = newest = stack top
    public int top() { return q.peek(); }
    public boolean empty() { return q.isEmpty(); }

    public static void main(String[] args) {
        MyStack st = new MyStack();
        st.push(1); st.push(2); st.push(3);
        System.out.println(st.top());   // 3
        System.out.println(st.pop());   // 3
        System.out.println(st.pop());   // 2
        System.out.println(st.empty()); // false
    }
}`,
        dry: {
          head: ['call', 'after offer (front→back)', 'rotations', 'queue after (front→back)', 'returns'],
          rows: [
            ['push(1)', '1', '0', '1', '—'],
            ['push(2)', '1, 2', '1: move 1 behind', '<span class="c-g">2</span>, 1', '—'],
            ['push(3)', '2, 1, 3', '2: move 2, then 1', '<span class="c-g">3</span>, 2, 1', '—'],
            ['top()', '—', '—', '3, 2, 1', '<span class="c-p">3</span>'],
            ['pop()', '—', '—', '2, 1', '<span class="c-p">3</span>'],
            ['pop()', '—', '—', '1', '<span class="c-p">2</span>']
          ]
        },
        alt: [{ lang: 'python', code: `from collections import deque


class MyStack:
    def __init__(self):
        self.q = deque()                 # left end of q = top of the stack

    def push(self, x: int) -> None:
        self.q.append(x)                 # newest goes to the back...
        for _ in range(len(self.q) - 1):
            self.q.append(self.q.popleft())   # ...then every older item walks behind it

    def pop(self) -> int:
        return self.q.popleft()          # front = newest = stack top

    def top(self) -> int:
        return self.q[0]

    def empty(self) -> bool:
        return not self.q` }, { lang: 'js', code: `// A tiny FIFO queue: array + head index (array.shift() would be O(n)).
class Queue {
  constructor() { this.items = []; this.head = 0; }
  offer(x) { this.items.push(x); }
  poll() {
    const x = this.items[this.head++];
    if (this.head * 2 > this.items.length) { this.items = this.items.slice(this.head); this.head = 0; }
    return x;
  }
  peek() { return this.items[this.head]; }
  size() { return this.items.length - this.head; }
  isEmpty() { return this.size() === 0; }
}

class MyStack {
  constructor() { this.q = new Queue(); }        // front of q = top of the stack

  push(x) {
    this.q.offer(x);                             // newest goes to the back...
    for (let i = 0; i < this.q.size() - 1; i++) {
      this.q.offer(this.q.poll());               // ...then every older item walks behind it
    }
  }

  pop() { return this.q.poll(); }                // front = newest = stack top
  top() { return this.q.peek(); }
  empty() { return this.q.isEmpty(); }
}` }, { lang: 'cpp', code: `class MyStack {
    queue<int> q;                        // front of q = top of the stack
public:
    void push(int x) {
        q.push(x);                       // newest goes to the back...
        for (size_t i = 0; i + 1 < q.size(); i++) {
            q.push(q.front());           // ...then every older item walks behind it
            q.pop();
        }
    }
    int pop() { int x = q.front(); q.pop(); return x; }   // front = newest = stack top
    int top() { return q.front(); }
    bool empty() { return q.empty(); }
};` }],
        complexity: `<p><b>push O(N)</b> (N - 1 rotations), <b>pop / top / empty O(1)</b>. Space O(N). Unlike the queue-from-two-stacks trick, these simple queue designs have <b>no</b> amortized O(1) version: with one or two queues some operation pays O(N) each time (nothing is "moved once and done"), you only choose which one.</p>`,
        followUps: ['Which version would you choose if the workload is 90% push?', 'How would you add getMin() in O(1) to this stack?', 'Why is queue-from-two-stacks amortized O(1) while this design is not? (Hint: does any element get moved only once?)']
      }
    }]
  });

  // =====================================================================
  // TOPIC 2 — Balanced Parentheses
  // =====================================================================
  topics.push({
    title: 'Balanced Parentheses — matching brackets with a stack',
    analogy: `<p>Think of <b>Russian nesting dolls</b> or <b>boxes inside boxes</b>. You open a big box, then a medium box inside it, then a small box. To close them properly you must close the <b>small one first</b> (the one you opened last), then the medium, then the big. If you try to close the big box while the small one is still open, something is wrong.</p>
      <p>"The last thing I opened is the first thing I must close" — that is exactly a stack.</p>`,
    explain: `<p>Read the string left to right:</p>
      <ul>
        <li>${H.c('g', 'Opening bracket')} <code>( [ {</code> → <b>push</b> it. It is "waiting for its partner".</li>
        <li>${H.c('y', 'Closing bracket')} <code>) ] }</code> → it must match the <b>most recent unmatched opener</b>, which is the <b>top</b> of the stack. If the stack is empty or the top is the wrong type → ${H.c('r', 'invalid')}. Otherwise <b>pop</b>.</li>
        <li>At the end the stack must be <b>empty</b> (no opener left waiting).</li>
      </ul>
      ${H.arr(['{', '[', '(', ')', ']', '}'], { label: 'valid', hl: { 2: 'g', 3: 'g', 1: 'b', 4: 'b', 0: 'p', 5: 'p' } })}
      ${H.arr(['(', '[', ')', ']'], { label: 'invalid', hl: { 1: 'y', 2: 'r' } })}
      <p>In <code>([)]</code> the <code>)</code> arrives while the top of the stack is ${H.c('y', '[')} — the inner box was not closed first → ${H.c('r', 'mismatch')}.</p>
      ${H.table(['string', 'why it fails', 'what the stack sees'], [
        ['<code>(]</code>', 'wrong type', 'top is ( but got ]'],
        ['<code>())</code>', 'closer with nothing open', 'stack empty when ) arrives'],
        ['<code>((</code>', 'something never closed', 'stack not empty at the end'],
        ['<code>([)]</code>', 'wrong nesting order', 'top is [ but got )']
      ])}
      <p><b>Special case — only one bracket type <code>()</code>:</b> you don't even need a stack, just a counter: <code>+1</code> for <code>(</code>, <code>-1</code> for <code>)</code>; it must never go below 0 and must end at 0.</p>`,
    clues: [
      '"Valid parentheses", "balanced brackets", "well-formed", "properly nested" → stack of openers.',
      '"Matching pairs" where the <b>latest open</b> must be <b>closed first</b> → LIFO → stack.',
      'Only one bracket type → a simple <b>counter</b> (balance) is enough.',
      '"Minimum additions/removals to make valid", "longest valid parentheses", "score of parentheses" → same stack idea (often store <b>indices</b>).',
      'HTML/XML tag matching, undo of nested operations → same pattern.'
    ],
    code: [{ lang: 'java', code: `
import java.util.*;

class Brackets {
    // Map each closer to the opener it needs. Easy to extend with '<' '>' later.
    private static final Map<Character, Character> PARTNER = Map.of(')', '(', ']', '[', '}', '{');

    static boolean isValid(String s) {
        Deque<Character> st = new ArrayDeque<>();
        for (char ch : s.toCharArray()) {
            if (PARTNER.containsValue(ch)) {
                st.push(ch);                                   // opener: wait for a partner
            } else if (PARTNER.containsKey(ch)) {
                if (st.isEmpty() || !st.pop().equals(PARTNER.get(ch))) return false;   // equals, not ==
            }                                                  // any other char: ignore it
        }
        return st.isEmpty();
    }

    // Only '(' and ')': a counter replaces the stack -> O(1) extra space
    static boolean isValidSingleType(String s) {
        int balance = 0;
        for (char ch : s.toCharArray()) {
            if (ch == '(') balance++;
            else if (ch == ')' && --balance < 0) return false;   // closed more than opened
        }
        return balance == 0;
    }

    public static void main(String[] args) {
        System.out.println(isValid("a*(b+[c-d])"));   // true  (letters are ignored)
        System.out.println(isValid("{[}]"));          // false
        System.out.println(isValidSingleType("(()())")); // true
        System.out.println(isValidSingleType("())(")); // false
    }
}`,
      alt: [{ lang: 'python', run: true, code: `PARTNER = {')': '(', ']': '[', '}': '{'}     # each closer -> the opener it needs


def is_valid(s: str) -> bool:
    st = []
    for ch in s:
        if ch in '([{':
            st.append(ch)                        # opener: wait for a partner
        elif ch in PARTNER:
            if not st or st.pop() != PARTNER[ch]:
                return False                     # nothing open, or wrong type
    return not st                                # any other char is ignored


def is_valid_single_type(s: str) -> bool:
    balance = 0                                  # only '(' and ')': a counter is enough
    for ch in s:
        if ch == '(':
            balance += 1
        elif ch == ')':
            balance -= 1
            if balance < 0:
                return False                     # closed more than opened
    return balance == 0


print(is_valid("a*(b+[c-d])"))       # True  (letters are ignored)
print(is_valid("{[}]"))              # False
print(is_valid_single_type("(()())"))  # True
print(is_valid_single_type("())("))  # False` }, { lang: 'js', run: true, code: `const PARTNER = new Map([[')', '('], [']', '['], ['}', '{']]);   // closer -> opener

function isValid(s) {
  const st = [];
  for (const ch of s) {
    if (ch === '(' || ch === '[' || ch === '{') st.push(ch);       // opener: wait
    else if (PARTNER.has(ch)) {
      if (st.length === 0 || st.pop() !== PARTNER.get(ch)) return false;
    }                                                              // other chars: ignore
  }
  return st.length === 0;
}

// Only '(' and ')': a counter replaces the stack -> O(1) extra space
function isValidSingleType(s) {
  let balance = 0;
  for (const ch of s) {
    if (ch === '(') balance++;
    else if (ch === ')' && --balance < 0) return false;            // closed more than opened
  }
  return balance === 0;
}

console.log(isValid('a*(b+[c-d])'));       // true  (letters are ignored)
console.log(isValid('{[}]'));              // false
console.log(isValidSingleType('(()())'));  // true
console.log(isValidSingleType('())('));    // false` }, { lang: 'cpp', code: `// Map each closer to the opener it needs. Easy to extend with '<' '>' later.
const unordered_map<char, char> PARTNER{{')', '('}, {']', '['}, {'}', '{'}};

bool isValid(const string& s) {
    string st;                                     // a string works as a char stack
    for (char ch : s) {
        if (ch == '(' || ch == '[' || ch == '{') st.push_back(ch);   // opener: wait
        else if (auto it = PARTNER.find(ch); it != PARTNER.end()) {
            if (st.empty() || st.back() != it->second) return false;
            st.pop_back();
        }                                          // any other char: ignore it
    }
    return st.empty();
}

// Only '(' and ')': a counter replaces the stack -> O(1) extra space
bool isValidSingleType(const string& s) {
    int balance = 0;
    for (char ch : s) {
        if (ch == '(') balance++;
        else if (ch == ')' && --balance < 0) return false;   // closed more than opened
    }
    return balance == 0;
}

int main() {
    cout << boolalpha << isValid("a*(b+[c-d])") << "\\n";    // true
    cout << isValid("{[}]") << "\\n";                        // false
    cout << isValidSingleType("(()())") << "\\n";            // true
    cout << isValidSingleType("())(") << "\\n";              // false
}` }] }, { lang: 'python', run: true, title: 'Same idea in Python (runnable)', code: `def is_valid(s):
    partner = {')': '(', ']': '[', '}': '{'}
    st = []
    for ch in s:
        if ch in '([{':
            st.append(ch)                 # opener waits on the stack
        elif ch in partner:
            if not st or st.pop() != partner[ch]:
                return False              # nothing open, or wrong type
    return not st                         # leftovers were never closed

for t in ["()[]{}", "([)]", "{[()()]}", "((", "))"]:
    print(t, is_valid(t))` }],
    codeTitle: ['Map-based checker + counter shortcut'],
    examples: [
      {
        title: 'Valid nested example: {[()()]}',
        html: `${H.table(['char', 'action', 'stack after'], [
          ['{', 'push', '{'], ['[', 'push', '{ ['], ['(', 'push', '{ [ ('], [')', 'top ( matches → pop', '{ ['],
          ['(', 'push', '{ [ ('], [')', 'pop', '{ ['], [']', 'top [ matches → pop', '{'], ['}', 'pop', '<span class="c-g">empty → valid</span>']
        ])}<p>The stack height at any moment equals the <b>current nesting depth</b>. Max height here is 3 — that is the deepest nesting.</p>`
      },
      {
        title: 'Counter is enough for one type: "(()" and "())("',
        html: `<p>For only <code>(</code> and <code>)</code>, track <code>balance</code>:</p>
          ${H.table(['string', 'balance after each char', 'verdict'], [
            ['<code>(()</code>', '1, 2, 1', '<span class="c-r">ends at 1 → invalid</span> (one ( never closed)'],
            ['<code>())(</code>', '1, 0, <b>-1</b>', '<span class="c-r">went negative → invalid</span> (a ) with nothing open)'],
            ['<code>(())</code>', '1, 2, 1, 0', '<span class="c-g">never negative, ends at 0 → valid</span>']
          ])}
          <p>Why it fails for several types: <code>([)]</code> has balanced counts for each type, but the <b>order</b> is wrong — only a stack remembers <i>which</i> opener is most recent.</p>`
      },
      {
        title: 'Minimum additions to make valid: "())(("',
        html: `<p>Use the counter idea and count the repairs: when balance would go below 0, we need an extra <code>(</code> (count it, keep balance at 0). At the end, every unclosed <code>(</code> needs a <code>)</code>.</p>
          ${H.table(['char', 'balance', 'extra ( needed'], [['(', '1', '0'], [')', '0', '0'], [')', '0 (would be -1)', '<span class="c-r">1</span>'], ['(', '1', '1'], ['(', '2', '1']])}
          <p>Answer = 1 (extra opens) + 2 (final balance) = <b>3</b>. This is LeetCode 921 and runs in O(N) time, O(1) space.</p>`,
        code: { lang: 'java', code: `int minAddToMakeValid(String s) {
    int balance = 0, extraOpens = 0;
    for (char c : s.toCharArray()) {
        if (c == '(') balance++;
        else if (balance > 0) balance--;   // this ) closes an earlier (
        else extraOpens++;                 // unmatched ) -> must add a ( before it
    }
    return extraOpens + balance;           // plus a ) for every still-open (
}`,
      alt: [{ lang: 'python', code: `def min_add_to_make_valid(s: str) -> int:
    balance = extra_opens = 0
    for c in s:
        if c == '(':
            balance += 1
        elif balance > 0:
            balance -= 1           # this ) closes an earlier (
        else:
            extra_opens += 1       # unmatched ) -> must add a ( before it
    return extra_opens + balance   # plus a ) for every still-open (` }, { lang: 'js', code: `function minAddToMakeValid(s) {
  let balance = 0, extraOpens = 0;
  for (const c of s) {
    if (c === '(') balance++;
    else if (balance > 0) balance--;   // this ) closes an earlier (
    else extraOpens++;                 // unmatched ) -> must add a ( before it
  }
  return extraOpens + balance;         // plus a ) for every still-open (
}` }, { lang: 'cpp', code: `int minAddToMakeValid(const string& s) {
    int balance = 0, extraOpens = 0;
    for (char c : s) {
        if (c == '(') balance++;
        else if (balance > 0) balance--;   // this ) closes an earlier (
        else extraOpens++;                 // unmatched ) -> must add a ( before it
    }
    return extraOpens + balance;           // plus a ) for every still-open (
}` }] }
      },
      {
        title: 'Store indices to find WHERE it breaks',
        html: `<p>Real editors highlight the unmatched bracket. Push the <b>index</b> instead of the character: when a closer has no partner, its own index is the error; at the end, every index left on the stack is an unclosed opener. The same "stack of indices" idea powers <i>Longest Valid Parentheses</i> and <i>Minimum Remove to Make Valid Parentheses</i> (see the Practice Arena).</p>
          ${H.arr(['(', 'a', ')', ')', '(', 'b'], { label: 'input', hl: { 3: 'r', 4: 'r' } })}
          <p>Index 3 is an unmatched <code>)</code>; index 4 is an unclosed <code>(</code>. Remove both → <code>(a)b</code>.</p>`
      }
    ],
    deepDive: `<p><b>Why a stack is the right tool (and the theory behind it).</b> Balanced brackets form a <i>context-free</i> language (the Dyck language). Regular expressions cannot match arbitrarily deep nesting because they have no memory of depth; a stack is exactly the extra memory a <b>pushdown automaton</b> needs. Every parser for JSON, HTML, Java or SQL contains this idea, usually inside a recursive-descent parser where the call stack plays the role of your explicit stack.</p>
      <p><b>Correctness proof sketch.</b> Invariant: after processing a prefix, the stack holds exactly the unmatched openers of that prefix, in order of appearance. A closer can only legally close the most recent unmatched opener (otherwise two pairs would cross, like <code>([)]</code>). So comparing with the top is both necessary and sufficient, and the string is valid iff no comparison fails and the final stack is empty.</p>
      <p><b>Performance details.</b> In Java, <code>Deque&lt;Character&gt;</code> boxes every char (Java caches <code>Character</code> values 0–127, so ASCII brackets do not allocate, but there is still indirection). A <code>char[] st = new char[n]; int top = 0;</code> is faster and trivially O(N) space. Early exits: odd length → false; if the stack ever holds more than <code>n - i</code> openers it can never be closed in time.</p>
      <p><b>Variants you should recognise:</b> wildcard <code>*</code> that can be <code>(</code>, <code>)</code> or empty (LeetCode 678) — greedy with a <i>range</i> of possible balances <code>[lo, hi]</code>; score of parentheses (LC 856) — the stack stores partial scores; generate all valid strings (LC 22) — backtracking where <code>close ≤ open ≤ n</code>; reverse substrings in brackets (LC 1190) — stack of StringBuilders or a "wormhole" pair index trick.</p>`,
    aiEra: `<p><b>What AI changes:</b> "valid parentheses" is the most memorised interview problem in existence; every model writes it flawlessly, and interviewers know that. Expect them to jump straight to a <b>twist</b>: wildcards, minimum removals, reporting positions, streaming input, or extending to HTML tags. Your value is adapting the invariant, not reciting the code.</p>
      <p><b>Use AI as a partner:</b> <code>"Generate 10 tricky bracket strings including empty-stack closers, leftovers, and crossing pairs, with expected answers"</code> — then run your solution against them. Or ask it to <code>"explain the Dyck-language view of this problem in 5 lines"</code> to deepen your understanding.</p>
      <p><b>Where AI goes wrong:</b> generated code sometimes calls <code>pop()</code> without checking <code>isEmpty()</code> (crash on <code>")"</code>), forgets the final <code>isEmpty()</code> check (accepts <code>"(("</code>), or uses a counter for multiple bracket types (accepts <code>"([)]"</code>). These three bugs are exactly what you should test first.</p>
      <p><b>What you must still own:</b> the invariant ("stack = unmatched openers in order"), when a counter suffices, and how to switch to indices when the question asks <i>where</i> or <i>how many</i>.</p>`,
    viz: {
      title: 'Bracket matching with a stack',
      input: '{[()()]}(',
      inputLabel: 'Brackets only: ( ) [ ] { }  (up to 16)',
      gen: function (input) {
        var s = (input === undefined ? '{[()()]}(' : String(input)).replace(/\s+/g, '');
        if (!s.length) throw new Error('Type some brackets, e.g. {[()]}');
        if (/[^()\[\]{}]/.test(s)) throw new Error('Use only the bracket characters ( ) [ ] { } — for example {[()]}');
        if (s.length > 16) throw new Error('Please use at most 16 brackets.');
        var ch = s.split(''), st = [], frames = [], pair = { ')': '(', ']': '[', '}': '{' };
        frames.push({ narr: 'Scan left to right. Openers wait on the stack; every closer must match the <b>top</b> (the most recent opener).', parts: [
          { type: 'array', label: 'string', values: ch },
          { type: 'stack', label: 'open brackets waiting', items: [] }
        ] });
        for (var i = 0; i < ch.length; i++) {
          var c = ch[i], hlA = {}, k;
          for (k = 0; k < i; k++) hlA[k] = 'done';
          if (!pair[c]) {
            st.push(c); hlA[i] = 'ok';
            frames.push({ narr: '<b>' + c + '</b> is an opener → <span class="c-g">push</span> it. It now waits for its partner.', parts: [
              { type: 'array', label: 'string', values: ch, hl: hlA, ptr: one(i, 'i') },
              { type: 'stack', label: 'open brackets waiting', items: st.slice(), hl: one(st.length - 1, 'ok') }
            ] });
          } else if (!st.length) {
            hlA[i] = 'bad';
            frames.push({ narr: '<b>' + c + '</b> is a closer but the stack is <span class="c-r">empty</span> — nothing is open to close. <b>Invalid.</b>', parts: [
              { type: 'array', label: 'string', values: ch, hl: hlA, ptr: one(i, 'i') },
              { type: 'stack', label: 'open brackets waiting', items: [] },
              { type: 'vars', vals: { result: 'false' }, hl: { result: 'bad' } }
            ] });
            frames.push({ narr: 'Rule recap: a closer with an empty stack can never be fixed later, so we stop right away and return <b>false</b>.', parts: [
              { type: 'vars', vals: { result: 'false', 'stopped at index': i }, hl: { result: 'bad' } }
            ] });
            return frames;
          } else if (st[st.length - 1] !== pair[c]) {
            hlA[i] = 'bad';
            frames.push({ narr: '<b>' + c + '</b> needs <b>' + pair[c] + '</b> on top, but the top is <span class="c-r">' + st[st.length - 1] + '</span>. Wrong partner → <b>mismatch, invalid</b>.', parts: [
              { type: 'array', label: 'string', values: ch, hl: hlA, ptr: one(i, 'i') },
              { type: 'stack', label: 'open brackets waiting', items: st.slice(), hl: one(st.length - 1, 'bad') },
              { type: 'vars', vals: { result: 'false' }, hl: { result: 'bad' } }
            ] });
            frames.push({ narr: 'Rule recap: the most recent opener must be closed first. Since it was not, we return <b>false</b> immediately.', parts: [
              { type: 'vars', vals: { result: 'false', 'stopped at index': i }, hl: { result: 'bad' } }
            ] });
            return frames;
          } else {
            hlA[i] = 'sel';
            frames.push({ narr: '<b>' + c + '</b> matches the top <b>' + pair[c] + '</b> → a pair is complete, <b>pop</b> the opener.', parts: [
              { type: 'array', label: 'string', values: ch, hl: hlA, ptr: one(i, 'i') },
              { type: 'stack', label: 'top matches → about to pop', items: st.slice(), hl: one(st.length - 1, 'sel') }
            ] });
            st.pop();
          }
        }
        if (st.length) {
          var bad = {};
          for (var j = 0; j < st.length; j++) bad[j] = 'bad';
          frames.push({ narr: 'End of string, but <span class="c-r">' + st.length + ' opener(s)</span> are still waiting with no partner → <b>invalid</b>.', parts: [
            { type: 'array', label: 'string', values: ch },
            { type: 'stack', label: 'unclosed openers', items: st.slice(), hl: bad },
            { type: 'vars', vals: { result: 'false' }, hl: { result: 'bad' } }
          ] });
        } else {
          frames.push({ narr: 'End of string and the stack is <span class="c-g">empty</span> — every opener found its partner in the right order → <b>valid</b>.', parts: [
            { type: 'array', label: 'string', values: ch },
            { type: 'stack', label: 'open brackets waiting', items: [] },
            { type: 'vars', vals: { result: 'true' }, hl: { result: 'ok' } }
          ] });
        }
        return frames;
      }
    },
    problems: [{
      title: 'Valid Parentheses',
      level: 'Easy',
      tags: ['stack', 'string'],
      statement: `<p>Given a string <code>s</code> containing only the characters <code>( ) [ ] { }</code>, return <code>true</code> if it is valid. Valid means: every opening bracket is closed by the <b>same type</b> of bracket, and brackets are closed in the <b>correct order</b> (inner ones first).</p>`,
      constraints: `1 ≤ s.length ≤ 10<sup>4</sup>, s contains only <code>()[]{}</code>`,
      example: `${H.arr(['(', '[', ']', '{', '}', ')'], { hl: { 0: 'p', 5: 'p', 1: 'g', 2: 'g', 3: 'b', 4: 'b' } })}
        <p>Output: ${H.c('g', 'true')} — ${H.c('g', '[ ]')} and ${H.c('b', '{ }')} close inside ${H.c('p', '( )')}.</p>
        ${H.arr(['(', ']'], { hl: { 1: 'r' } })}
        <p>Output: ${H.c('r', 'false')} — <code>]</code> arrives but the open bracket is <code>(</code>.</p>`,
      brute: {
        why: `<p>Keep deleting every adjacent pair <code>()</code>, <code>[]</code>, <code>{}</code> until nothing changes; valid if the string becomes empty. Each pass is O(N) and may delete only one pair, so up to N/2 passes → <b>O(N<sup>2</sup>)</b>. The waste: after each deletion we rescan the whole string from the start instead of remembering what was open.</p>`,
        code: `
boolean isValidBrute(String s) {
    String prev = "";
    while (!s.equals(prev)) {              // repeat while the last pass changed something
        prev = s;
        s = s.replace("()", "").replace("[]", "").replace("{}", "");
    }
    return s.isEmpty();                    // everything cancelled -> valid
}`
      },
      mcq: {
        q: 'You are scanning <code>{[(</code> and the next character is <code>]</code>. What happens?',
        options: ['Pop <code>(</code> and continue', 'Return false: the top is <code>(</code>, not <code>[</code>', 'Skip it, maybe it matches later', 'Push <code>]</code> onto the stack'],
        answer: 1,
        explain: 'The most recently opened bracket is <code>(</code>. A <code>]</code> cannot close it, and the inner <code>(</code> must be closed first, so the string is already invalid.'
      },
      hints: [
        `<p>Aha: a closing bracket must always match the <b>most recent opener that is still open</b>. "Most recent" = last in → first out.</p>`,
        `<p>Use a stack of characters (<code>ArrayDeque</code> / <code>list</code> / array / <code>std::string</code> or <code>std::stack</code>). Push openers. On a closer, compare it with <code>st.pop()</code>. A small map (or a switch) tells you which opener each closer needs.</p>`,
        `<p>Traps: a closer when the stack is <b>empty</b> (e.g. <code>")("</code>) → false, don't call pop on empty; the stack must be <b>empty at the end</b> (e.g. <code>"(("</code>); odd length → instantly false. Recipe: for each ch: if opener → push; else if empty or pop() ≠ partner(ch) → false. Return st.isEmpty().</p>`
      ],
      tests: { sig: "string -> bool", fn: "isValid", cases: [
        [["()"],true],
        [["()[]{}"],true],
        [["(]"],false],
        [["([)]"],false],
        [["{[]}"],true],
        [["("],false],
        [[")"],false],
        [["(("],false],
        [[")("],false],
        [["(()"],false],
        [["{[()()]}"],true],
        [["([]{})"],true],
        [["]"],false]
      ] },
      solution: {
        approach: `<p>One left-to-right scan; the stack holds openers still waiting for a partner.</p>`,
        code: `
import java.util.*;

class Solution {
    public boolean isValid(String s) {
        if (s.length() % 2 == 1) return false;          // odd length can never pair up
        Deque<Character> st = new ArrayDeque<>();       // openers waiting for a partner
        for (char ch : s.toCharArray()) {
            if (ch == '(' || ch == '[' || ch == '{') {
                st.push(ch);                            // opener: wait on the stack
            } else {
                if (st.isEmpty()) return false;         // closer but nothing is open
                char top = st.pop();                    // most recent unmatched opener
                if (ch == ')' && top != '(') return false;
                if (ch == ']' && top != '[') return false;
                if (ch == '}' && top != '{') return false;
            }
        }
        return st.isEmpty();                            // leftovers = never closed
    }

    public static void main(String[] args) {
        Solution sol = new Solution();
        System.out.println(sol.isValid("([]{})"));     // true
        System.out.println(sol.isValid("(]"));         // false
        System.out.println(sol.isValid("([)]"));       // false
    }
}`,
        dry: {
          head: ['i', 'ch', 'stack before (bottom→top)', 'action', 'stack after'],
          rows: [
            ['0', '(', '[ ]', '<span class="c-g">opener → push</span>', '[ ( ]'],
            ['1', '[', '[ ( ]', '<span class="c-g">push</span>', '[ ( [ ]'],
            ['2', ']', '[ ( [ ]', 'top [ matches → pop', '[ ( ]'],
            ['3', '{', '[ ( ]', '<span class="c-g">push</span>', '[ ( { ]'],
            ['4', '}', '[ ( { ]', 'top { matches → pop', '[ ( ]'],
            ['5', ')', '[ ( ]', 'top ( matches → pop', '[ ]'],
            ['end', '—', '[ ]', 'stack empty', '<span class="c-g">true</span>']
          ]
        },
        alt: [{ lang: 'python', code: `class Solution:
    def is_valid(self, s: str) -> bool:
        if len(s) % 2:                       # odd length can never pair up
            return False
        partner = {')': '(', ']': '[', '}': '{'}
        st = []                              # openers waiting for a partner
        for ch in s:
            if ch in partner:                # closer: must match the latest opener
                if not st or st.pop() != partner[ch]:
                    return False
            else:
                st.append(ch)                # opener: wait on the stack
        return not st                        # leftovers were never closed` }, { lang: 'js', code: `function isValid(s) {
  if (s.length % 2 === 1) return false;          // odd length can never pair up
  const partner = { ')': '(', ']': '[', '}': '{' };
  const st = [];                                 // openers waiting for a partner
  for (const ch of s) {
    if (ch in partner) {                         // closer: must match the latest opener
      if (st.length === 0 || st.pop() !== partner[ch]) return false;
    } else {
      st.push(ch);                               // opener: wait on the stack
    }
  }
  return st.length === 0;                        // leftovers were never closed
}` }, { lang: 'cpp', code: `class Solution {
public:
    bool isValid(const string& s) {
        if (s.size() % 2 == 1) return false;     // odd length can never pair up
        string st;                               // a string works as a stack of chars
        for (char ch : s) {
            if (ch == '(' || ch == '[' || ch == '{') {
                st.push_back(ch);                // opener: wait on the stack
            } else {
                char need = ch == ')' ? '(' : ch == ']' ? '[' : '{';
                if (st.empty() || st.back() != need) return false;
                st.pop_back();                   // matched pair
            }
        }
        return st.empty();                       // leftovers were never closed
    }
};` }],
        complexity: `<p><b>Time O(N)</b>: each character is looked at once and pushed/popped at most once. <b>Space O(N)</b>: in the worst case (all openers, like <code>((((</code>) every character sits on the stack.</p>`
      }
    }]
  });

  // =====================================================================
  // TOPIC 3 — Min Stack
  // =====================================================================
  topics.push({
    title: 'Min Stack — get the minimum in O(1)',
    analogy: `<p>Imagine a pile of exam papers. On each paper you also write a small sticky note: <b>"lowest score in the pile from here down"</b>. When you add a paper, you only compare its score with the note on the paper below it. When you remove the top paper, the paper underneath already has the correct note. You never have to search the whole pile.</p>`,
    explain: `<p>A normal stack can push/pop/top in O(1), but finding the minimum would mean scanning everything: O(N). Trick: <b>store the minimum-so-far together with each value</b>.</p>
      ${H.table(['operation', 'stack of (value, minSoFar) bottom→top', 'getMin()'], [
        ['push 5', '(5,5)', '5'],
        ['push 3', '(5,5) (3,<b>3</b>)', '3'],
        ['push 7', '(5,5) (3,3) (7,<b>3</b>)', '3'],
        ['push 2', '(5,5) (3,3) (7,3) (2,<b>2</b>)', '<span class="c-p">2</span>'],
        ['pop', '(5,5) (3,3) (7,3)', '<span class="c-p">3</span> — restored for free!'],
      ])}
      <p>When we pop the 2, the paper below still says "min = 3", so the old minimum comes back automatically. New min on push = <code>min(x, minBelow)</code>.</p>
      <p><b>Two ways to store it:</b> (1) one stack of pairs <code>int[]{value, min}</code>; (2) two stacks — a value stack and a min stack that you push to only when <code>x ≤ current min</code> (saves space when many big values arrive). Note the <code>≤</code>: duplicates of the minimum must be pushed too, or popping one copy would lose the min.</p>`,
    clues: [
      '"Design a stack that supports push, pop, top and <b>retrieving the minimum</b> in <b>constant time</b>" → pair each value with min-so-far.',
      '"Max stack", "stack with getMax" → same trick with max.',
      '"O(1) per operation" in a design problem → precompute the answer at push time and save it.',
      'Queue with getMin → build it from two min-stacks (combine Topic 8 with this one).'
    ],
    code: [{ lang: 'java', code: `
import java.util.*;

// Space-saving variant: a second stack that only stores "new record lows".
class MinStackTwoStacks {
    private final Deque<Integer> vals = new ArrayDeque<>();
    private final Deque<Integer> mins = new ArrayDeque<>();   // top = current minimum

    public void push(int x) {
        vals.push(x);
        if (mins.isEmpty() || x <= mins.peek()) mins.push(x);  // <= keeps duplicate minimums
    }

    public void pop() {
        int x = vals.pop();                                   // unbox to int before comparing
        if (x == mins.peek()) mins.pop();                     // int == Integer -> value compare
    }

    public int top() { return vals.peek(); }
    public int getMin() { return mins.peek(); }

    public static void main(String[] args) {
        MinStackTwoStacks s = new MinStackTwoStacks();
        s.push(5); s.push(2); s.push(2); s.push(9);
        System.out.println(s.getMin()); // 2
        s.pop(); s.pop();                // removes 9, then one of the 2s
        System.out.println(s.getMin()); // 2 (the duplicate kept it alive)
        s.pop();
        System.out.println(s.getMin()); // 5
    }
}`,
      alt: [{ lang: 'python', run: true, code: `class MinStackTwoStacks:
    """Space-saving variant: a second stack that only stores "new record lows"."""

    def __init__(self):
        self.vals = []
        self.mins = []                            # top = current minimum

    def push(self, x: int) -> None:
        self.vals.append(x)
        if not self.mins or x <= self.mins[-1]:   # <= keeps duplicate minimums
            self.mins.append(x)

    def pop(self) -> None:
        if self.vals.pop() == self.mins[-1]:      # ints compare by value with ==
            self.mins.pop()

    def top(self) -> int:
        return self.vals[-1]

    def get_min(self) -> int:
        return self.mins[-1]


s = MinStackTwoStacks()
for x in (5, 2, 2, 9):
    s.push(x)
print(s.get_min())   # 2
s.pop(); s.pop()     # removes 9, then one of the 2s
print(s.get_min())   # 2 (the duplicate kept it alive)
s.pop()
print(s.get_min())   # 5` }, { lang: 'js', run: true, code: `// Space-saving variant: a second stack that only stores "new record lows".
class MinStackTwoStacks {
  constructor() { this.vals = []; this.mins = []; }       // mins top = current minimum

  push(x) {
    this.vals.push(x);
    const m = this.mins;
    if (m.length === 0 || x <= m[m.length - 1]) m.push(x);   // <= keeps duplicate minimums
  }

  pop() {
    if (this.vals.pop() === this.mins[this.mins.length - 1]) this.mins.pop();
  }

  top() { return this.vals[this.vals.length - 1]; }
  getMin() { return this.mins[this.mins.length - 1]; }
}

const s = new MinStackTwoStacks();
[5, 2, 2, 9].forEach((x) => s.push(x));
console.log(s.getMin());   // 2
s.pop(); s.pop();          // removes 9, then one of the 2s
console.log(s.getMin());   // 2 (the duplicate kept it alive)
s.pop();
console.log(s.getMin());   // 5` }, { lang: 'cpp', code: `// Space-saving variant: a second stack that only stores "new record lows".
class MinStackTwoStacks {
    stack<int> vals, mins;                       // mins.top() = current minimum
public:
    void push(int x) {
        vals.push(x);
        if (mins.empty() || x <= mins.top()) mins.push(x);   // <= keeps duplicate minimums
    }
    void pop() {
        if (vals.top() == mins.top()) mins.pop();
        vals.pop();
    }
    int top() { return vals.top(); }
    int getMin() { return mins.top(); }
};

int main() {
    MinStackTwoStacks s;
    for (int x : {5, 2, 2, 9}) s.push(x);
    cout << s.getMin() << "\\n";   // 2
    s.pop(); s.pop();             // removes 9, then one of the 2s
    cout << s.getMin() << "\\n";   // 2 (the duplicate kept it alive)
    s.pop();
    cout << s.getMin() << "\\n";   // 5
}` }] }, { lang: 'java', code: `
import java.util.*;

// O(1) extra space trick: store an "encoded" value when a new minimum arrives.
class MinStackEncoded {
    private final Deque<Long> st = new ArrayDeque<>();
    private long min;

    public void push(int x) {
        if (st.isEmpty()) { st.push((long) x); min = x; return; }
        if (x >= min) { st.push((long) x); return; }
        st.push(2L * x - min);   // encoded value is < x, which flags "min changed here"
        min = x;
    }

    public void pop() {
        long t = st.pop();
        if (t < min) min = 2 * min - t;   // decode: recover the previous minimum
    }

    public int top() {
        long t = st.peek();
        return (int) (t < min ? min : t); // a flagged entry means the real value is min
    }

    public int getMin() { return (int) min; }

    public static void main(String[] args) {
        MinStackEncoded s = new MinStackEncoded();
        s.push(5); s.push(3); s.push(7); s.push(1);
        System.out.println(s.getMin() + " " + s.top());  // 1 1
        s.pop();
        System.out.println(s.getMin() + " " + s.top());  // 3 7
        s.pop(); s.pop();
        System.out.println(s.getMin() + " " + s.top());  // 5 5
    }
}`,
      alt: [{ lang: 'python', run: true, code: `class MinStackEncoded:
    """O(1) extra space: store an "encoded" value when a new minimum arrives."""

    def __init__(self):
        self.st = []
        self.min = 0

    def push(self, x: int) -> None:
        if not self.st:
            self.st.append(x)
            self.min = x
        elif x >= self.min:
            self.st.append(x)
        else:
            self.st.append(2 * x - self.min)   # encoded value < x flags "min changed here"
            self.min = x                       # Python ints never overflow

    def pop(self) -> None:
        t = self.st.pop()
        if t < self.min:
            self.min = 2 * self.min - t        # decode: recover the previous minimum

    def top(self) -> int:
        t = self.st[-1]
        return self.min if t < self.min else t  # a flagged entry means the real value is min

    def get_min(self) -> int:
        return self.min


s = MinStackEncoded()
for x in (5, 3, 7, 1):
    s.push(x)
print(s.get_min(), s.top())   # 1 1
s.pop()
print(s.get_min(), s.top())   # 3 7
s.pop(); s.pop()
print(s.get_min(), s.top())   # 5 5` }, { lang: 'js', run: true, code: `// O(1) extra space: store an "encoded" value when a new minimum arrives.
// 2x - min stays far below 2^53 for 32-bit inputs, so Number is exact here.
class MinStackEncoded {
  constructor() { this.st = []; this.min = 0; }

  push(x) {
    if (this.st.length === 0) { this.st.push(x); this.min = x; return; }
    if (x >= this.min) { this.st.push(x); return; }
    this.st.push(2 * x - this.min);       // encoded value < x flags "min changed here"
    this.min = x;
  }

  pop() {
    const t = this.st.pop();
    if (t < this.min) this.min = 2 * this.min - t;   // decode: recover the previous minimum
  }

  top() {
    const t = this.st[this.st.length - 1];
    return t < this.min ? this.min : t;   // a flagged entry means the real value is min
  }

  getMin() { return this.min; }
}

const s = new MinStackEncoded();
[5, 3, 7, 1].forEach((x) => s.push(x));
console.log(s.getMin(), s.top());   // 1 1
s.pop();
console.log(s.getMin(), s.top());   // 3 7
s.pop(); s.pop();
console.log(s.getMin(), s.top());   // 5 5` }, { lang: 'cpp', code: `// O(1) extra space trick: store an "encoded" value when a new minimum arrives.
class MinStackEncoded {
    stack<long long> st;                 // long long: 2x - min overflows int near +-2^31
    long long mn = 0;
public:
    void push(int x) {
        if (st.empty()) { st.push(x); mn = x; return; }
        if (x >= mn) { st.push(x); return; }
        st.push(2LL * x - mn);           // encoded value < x flags "min changed here"
        mn = x;
    }
    void pop() {
        long long t = st.top(); st.pop();
        if (t < mn) mn = 2 * mn - t;     // decode: recover the previous minimum
    }
    int top() {
        long long t = st.top();
        return (int)(t < mn ? mn : t);   // a flagged entry means the real value is min
    }
    int getMin() { return (int)mn; }
};

int main() {
    MinStackEncoded s;
    for (int x : {5, 3, 7, 1}) s.push(x);
    cout << s.getMin() << " " << s.top() << "\\n";   // 1 1
    s.pop();
    cout << s.getMin() << " " << s.top() << "\\n";   // 3 7
    s.pop(); s.pop();
    cout << s.getMin() << " " << s.top() << "\\n";   // 5 5
}` }] }],
    codeTitle: ['Two-stack variant (stores only record lows)', 'Encoded O(1)-extra-space variant (uses long)'],
    examples: [
      {
        title: 'Why ≤ and not &lt; in the two-stack version',
        html: `<p>Push 2, then push 2 again. With <code>&lt;</code>, the second 2 is <b>not</b> pushed to <code>mins</code>:</p>
          ${H.table(['op', 'vals', 'mins with &lt;', 'mins with ≤'], [
            ['push 2', '2', '2', '2'], ['push 2', '2 2', '2', '2 2'],
            ['pop (2)', '2', '<span class="c-r">(empty!)</span> — popped the only 2', '2'],
            ['getMin()', '2', '<span class="c-r">crash / wrong</span>', '<span class="c-g">2</span>']
          ])}<p>Duplicates of the current minimum must each have their own entry.</p>`
      },
      {
        title: 'Max Stack is the same trick mirrored',
        html: `<p>Store <code>max(x, maxBelow)</code> instead. Push 1, 4, 2 → notes 1, 4, 4. <code>getMax()</code> = 4; pop the 2 → still 4; pop the 4 → note 1. The harder LeetCode 716 version adds <code>popMax()</code>, which removes the max from the <i>middle</i> — that needs a <code>TreeMap</code> + doubly linked list (O(log N)), because a plain stack cannot delete from the middle.</p>`
      },
      {
        title: 'Encoded trick on numbers: push 5, 3, 7, 1',
        html: `${H.table(['op', 'stored', 'min after', 'note'], [
          ['push 5', '5', '5', 'first element'],
          ['push 3', '2·3 - 5 = <b>1</b>', '3', '1 &lt; 3 → flag "min changed"'],
          ['push 7', '7', '3', '7 ≥ 3, stored as-is'],
          ['push 1', '2·1 - 3 = <b>-1</b>', '1', '-1 &lt; 1 → flag'],
          ['pop', 'removes -1', '2·1 - (-1) = <b>3</b>', 'decode previous min'],
          ['pop', 'removes 7', '3', 'normal'],
          ['pop', 'removes 1', '2·3 - 1 = <b>5</b>', 'decode again']
        ])}<p>Why does it work? When x &lt; min, the stored value <code>2x - min = x - (min - x)</code> is <b>less than x</b>, the new min. Normal entries are always ≥ min. So "stored &lt; min" is an unambiguous flag, and <code>2·min - stored</code> recovers the old min. Use a 64-bit type (<code>long</code> / <code>long long</code>): <code>2x - min</code> overflows a 32-bit int for values near ±2<sup>31</sup>. Python ints never overflow, and JS numbers are exact here because the values stay far below 2<sup>53</sup>.</p>`
      }
    ],
    deepDive: `<p><b>Three designs, one invariant.</b> Every Min Stack keeps "minimum of the elements at or below each position" available in O(1). (1) Pairs: simplest, 2N ints. (2) Two stacks: the min stack only grows on new record lows (≤), so for random data it stays tiny (expected O(log N) entries for a random permutation, since record lows of a random sequence are rare), worst case N for a decreasing input. (3) Encoding: O(1) extra memory beyond the values but needs <code>long</code> and is harder to explain — mention it as a follow-up, do not lead with it.</p>
      <p><b>Why not a heap?</b> A <code>PriorityQueue</code> gives getMin in O(1) but pop of an arbitrary (the top-of-stack) element costs O(N) in Java (<code>remove(Object)</code> scans), or O(log N) with lazy deletion. The stack's LIFO order is what makes the precomputed "min below me" trick valid: the elements below the top never change while the top exists.</p>
      <p><b>Min Queue.</b> A queue does not have this property (the front leaves while newer items stay), so you combine two Min Stacks with the queue-from-two-stacks trick (amortized O(1)), or use a monotonic deque (Topic 9). This "two stacks with aggregates" pattern generalises to any associative operation (gcd, max, sum, matrix product) and is used for sliding-window aggregates in stream processing.</p>
      <p><b>Production note:</b> immutable persistent stacks (linked nodes that point downward) let each node cache aggregates exactly like this, which is how functional languages get O(1) undo with history.</p>`,
    aiEra: `<p><b>What AI changes:</b> the pair-based Min Stack is a 15-line answer any assistant produces instantly. Interviewers now probe <b>why</b> it is correct ("what invariant does each entry hold?") and the follow-ups: two-stack ≤ subtlety, O(1)-space encoding with overflow, Max Stack with popMax, Min Queue. Those are where candidates separate.</p>
      <p><b>Use AI as a partner:</b> <code>"Write a randomized test that compares my MinStack against a brute force that scans the stack, 10,000 random operations"</code> — this kind of differential test is the fastest way to catch the ≤ bug or an <code>Integer ==</code> comparison bug.</p>
      <p><b>Where AI goes wrong:</b> generated two-stack versions frequently compare <code>vals.peek() == mins.peek()</code> on <code>Integer</code> objects (works below 128, fails above), use <code>&lt;</code> instead of <code>≤</code>, or implement the encoded version with <code>int</code> and overflow. Always check boxing and boundaries.</p>
      <p><b>What you must still own:</b> stating the invariant in one sentence, picking the variant that fits the memory constraint, and explaining why the trick works for stacks but not directly for queues.</p>`,
    viz: {
      title: 'Min Stack: every plate remembers the min below it',
      input: 'push 5, push 3, push 7, push 2, getMin, pop, getMin, pop, pop, getMin',
      inputLabel: 'Ops: push x, pop, top, getMin (comma separated)',
      gen: function (input) {
        var ops = parseOps(input, 'push 5, push 3, push 7, push 2, getMin, pop, getMin', ['push', 'pop', 'top', 'getmin']);
        var vals = [], mins = [], frames = [];
        frames.push({ narr: 'Two side-by-side stacks of the same height: the value, and the <b>minimum of everything at or below it</b>.', parts: [
          { type: 'stack', label: 'values', items: [] }, { type: 'stack', label: 'min so far', items: [] }
        ] });
        ops.forEach(function (o) {
          if (o.op === 'push') {
            var m = mins.length ? Math.min(o.v, mins[mins.length - 1]) : o.v;
            vals.push(o.v); mins.push(m);
            frames.push({ narr: '<code>push(' + o.v + ')</code>: new min-so-far = min(' + o.v + ', ' + (mins.length > 1 ? mins[mins.length - 2] : 'nothing') + ') = <b>' + m + '</b>. Saved next to the value.', parts: [
              { type: 'stack', label: 'values', items: vals.slice(), hl: one(vals.length - 1, 'ok') },
              { type: 'stack', label: 'min so far', items: mins.slice(), hl: one(mins.length - 1, 'ok') }
            ] });
          } else if (!vals.length) {
            frames.push({ narr: '<code>' + o.op + '()</code> on an <span class="c-r">empty</span> stack — not allowed (LeetCode guarantees it never happens). We skip it.', parts: [
              { type: 'stack', label: 'values', items: [] }, { type: 'stack', label: 'min so far', items: [] }
            ] });
          } else if (o.op === 'pop') {
            frames.push({ narr: '<code>pop()</code> removes ' + vals[vals.length - 1] + ' and its note. The note below already holds the correct older minimum.', parts: [
              { type: 'stack', label: 'values', items: vals.slice(), hl: one(vals.length - 1, 'bad') },
              { type: 'stack', label: 'min so far', items: mins.slice(), hl: one(mins.length - 1, 'bad') }
            ] });
            vals.pop(); mins.pop();
          } else if (o.op === 'top') {
            frames.push({ narr: '<code>top()</code> = <b>' + vals[vals.length - 1] + '</b> (just peek, O(1)).', parts: [
              { type: 'stack', label: 'values', items: vals.slice(), hl: one(vals.length - 1, 'sel') },
              { type: 'stack', label: 'min so far', items: mins.slice() }
            ] });
          } else {
            frames.push({ narr: '<code>getMin()</code> = read the top note = <b>' + mins[mins.length - 1] + '</b>. No scanning needed → O(1).', parts: [
              { type: 'stack', label: 'values', items: vals.slice() },
              { type: 'stack', label: 'min so far', items: mins.slice(), hl: one(mins.length - 1, 'sel') }
            ] });
          }
        });
        frames.push({ narr: 'Every operation touched only the top → all O(1). The price: one extra number stored per element.', parts: [
          { type: 'stack', label: 'values', items: vals.slice() }, { type: 'stack', label: 'min so far', items: mins.slice() }
        ] });
        return frames;
      }
    },
    problems: [{
      title: 'Min Stack',
      level: 'Medium',
      tags: ['stack', 'design'],
      statement: `<p>Design a stack that supports <code>push(val)</code>, <code>pop()</code>, <code>top()</code> and <code>getMin()</code> (smallest element in the stack), <b>each in O(1) time</b>. Calls to pop/top/getMin are only made on a non-empty stack.</p>`,
      constraints: `-2<sup>31</sup> ≤ val ≤ 2<sup>31</sup> - 1, at most 3·10<sup>4</sup> calls in total`,
      example: `${H.table(['call', 'stack (bottom→top)', 'returns'], [
        ['push(-2)', '-2', '—'], ['push(0)', '-2, 0', '—'], ['push(-3)', '-2, 0, -3', '—'],
        ['getMin()', '-2, 0, -3', '<span class="c-p">-3</span>'], ['pop()', '-2, 0', '—'],
        ['top()', '-2, 0', '<span class="c-p">0</span>'], ['getMin()', '-2, 0', '<span class="c-p">-2</span> (the -3 is gone)']
      ])}`,
      brute: {
        why: `<p>Use a normal stack and, on <code>getMin()</code>, loop over all elements to find the smallest. That is <b>O(N) per getMin</b>; with 3·10<sup>4</sup> calls on a big stack it is ~10<sup>9</sup> steps. The waste: we recompute a minimum that hardly changes between calls.</p>`,
        code: `
import java.util.*;

class MinStackBrute {
    private final Deque<Integer> st = new ArrayDeque<>();
    public void push(int val) { st.push(val); }
    public void pop() { st.pop(); }
    public int top() { return st.peek(); }
    public int getMin() {
        int min = Integer.MAX_VALUE;
        for (int x : st) min = Math.min(min, x);   // scans the whole stack every time: O(N)
        return min;
    }
}`
      },
      mcq: {
        q: 'Stack (bottom→top) is 4, 1, 6 with min-so-far notes 4, 1, 1. We pop twice. What should getMin() return, and why is it O(1)?',
        options: ['1, because 1 was the smallest ever', '4, read directly from the note on the remaining element', '6, the last pushed value', 'We must rescan, so it is O(N)'],
        answer: 1,
        explain: 'After two pops only (4, note 4) remains. The note was saved when 4 was pushed, so we just read it.'
      },
      hints: [
        `<p>Aha: the minimum of the stack only depends on <b>what is below</b> the top. When you push <code>x</code>, the new min is <code>min(x, oldMin)</code>, and when you pop you want <code>oldMin</code> back — so <b>save it</b> at push time.</p>`,
        `<p>Use one stack whose entries are pairs <code>{value, minSoFar}</code> (<code>int[]</code> / tuple / two parallel arrays / <code>pair&lt;int,int&gt;</code>). Or two stacks: values, and mins (push to mins when <code>x ≤ mins.peek()</code>; on pop, pop mins too if the popped value equals <code>mins.peek()</code>).</p>`,
        `<p>Traps: with the two-stack version use <code>≤</code> (not <code>&lt;</code>) so duplicate minimums are kept; in Java, compare <code>Integer</code> objects with <code>.equals</code> or unbox first (Python, JS and C++ compare numbers by value). Recipe: push → newMin = empty ? x : min(x, top.min); push {x, newMin}. pop → pop. top → peek()[0]. getMin → peek()[1].</p>`
      ],
      tests: { cls: "MinStack", sigs: {"MinStack":"","push":"int -> void","pop":"-> void","top":"-> int","getMin":"-> int"}, cases: [
        {"ops":["MinStack","push","push","push","getMin","pop","top","getMin"],"args":[[],[-2],[0],[-3],[],[],[],[]],"out":[null,null,null,null,-3,null,0,-2]},
        {"ops":["MinStack","push","getMin","top"],"args":[[],[5],[],[]],"out":[null,null,5,5]},
        {"ops":["MinStack","push","push","push","push","getMin","pop","getMin","pop","getMin"],"args":[[],[2],[2],[1],[1],[],[],[],[],[]],"out":[null,null,null,null,null,1,null,1,null,2]},
        {"ops":["MinStack","push","push","getMin","top","pop","getMin"],"args":[[],[2147483647],[-2147483648],[],[],[],[]],"out":[null,null,null,-2147483648,-2147483648,null,2147483647]},
        {"ops":["MinStack","push","push","push","getMin","pop","getMin","pop","getMin"],"args":[[],[1],[2],[3],[],[],[],[],[]],"out":[null,null,null,null,1,null,1,null,1]},
        {"ops":["MinStack","push","push","push","getMin","pop","getMin","pop","getMin"],"args":[[],[3],[2],[1],[],[],[],[],[]],"out":[null,null,null,null,1,null,2,null,3]},
        {"ops":["MinStack","push","push","pop","push","getMin","top"],"args":[[],[0],[-1],[],[4],[],[]],"out":[null,null,null,null,null,0,4]}
      ] },
      solution: {
        approach: `<p>Each stack entry carries its own "minimum of everything at or below me".</p>`,
        code: `
import java.util.*;

class MinStack {
    // each entry: [0] = the value, [1] = minimum of this entry and everything below it
    private final Deque<int[]> st = new ArrayDeque<>();

    public void push(int val) {
        int minBelow = st.isEmpty() ? val : st.peek()[1];   // min of the stack before this push
        st.push(new int[]{val, Math.min(val, minBelow)});  // remember the new minimum with the value
    }

    public void pop() {
        st.pop();               // the entry below already knows its own minimum
    }

    public int top() {
        return st.peek()[0];    // value on top
    }

    public int getMin() {
        return st.peek()[1];    // min saved at push time -> O(1)
    }

    public static void main(String[] args) {
        MinStack ms = new MinStack();
        ms.push(-2); ms.push(0); ms.push(-3);
        System.out.println(ms.getMin()); // -3
        ms.pop();
        System.out.println(ms.top());    // 0
        System.out.println(ms.getMin()); // -2
    }
}`,
        dry: {
          head: ['call', 'entry pushed / removed', 'stack of {val,min} bottom→top', 'returns'],
          rows: [
            ['push(-2)', '{-2, -2}', '{-2,-2}', '—'],
            ['push(0)', '{0, min(0,-2) = -2}', '{-2,-2} {0,-2}', '—'],
            ['push(-3)', '{-3, min(-3,-2) = -3}', '{-2,-2} {0,-2} {-3,-3}', '—'],
            ['getMin()', 'read top[1]', 'unchanged', '<span class="c-p">-3</span>'],
            ['pop()', '<span class="c-r">remove {-3,-3}</span>', '{-2,-2} {0,-2}', '—'],
            ['top()', 'read top[0]', 'unchanged', '<span class="c-p">0</span>'],
            ['getMin()', 'read top[1]', 'unchanged', '<span class="c-p">-2</span>']
          ]
        },
        alt: [{ lang: 'python', code: `class MinStack:
    def __init__(self):
        self.st = []                        # each entry: (value, min of it and everything below)

    def push(self, val: int) -> None:
        low = min(val, self.st[-1][1]) if self.st else val
        self.st.append((val, low))          # remember the new minimum with the value

    def pop(self) -> None:
        self.st.pop()                       # the entry below already knows its own minimum

    def top(self) -> int:
        return self.st[-1][0]

    def getMin(self) -> int:
        return self.st[-1][1]               # min saved at push time -> O(1)` }, { lang: 'js', code: `class MinStack {
  constructor() {
    this.vals = [];                         // the values
    this.mins = [];                         // mins[i] = minimum of vals[0..i]
  }

  push(val) {
    const n = this.mins.length;
    this.vals.push(val);
    this.mins.push(n === 0 ? val : Math.min(val, this.mins[n - 1]));
  }

  pop() { this.vals.pop(); this.mins.pop(); }   // the entry below already knows its min
  top() { return this.vals[this.vals.length - 1]; }
  getMin() { return this.mins[this.mins.length - 1]; }   // saved at push time -> O(1)
}` }, { lang: 'cpp', code: `class MinStack {
    vector<pair<int, int>> st;              // {value, min of it and everything below}
public:
    void push(int val) {
        int low = st.empty() ? val : min(val, st.back().second);
        st.push_back({val, low});           // remember the new minimum with the value
    }
    void pop() { st.pop_back(); }           // the entry below already knows its minimum
    int top() { return st.back().first; }
    int getMin() { return st.back().second; }   // min saved at push time -> O(1)
};` }],
        complexity: `<p><b>Time O(1)</b> for every operation: each one touches only the top entry. <b>Space O(N)</b>: two ints per element instead of one (still linear).</p>`
      }
    }]
  });

  // =====================================================================
  // TOPIC 4 — Infix / Postfix evaluation basics
  // =====================================================================
  topics.push({
    title: 'Infix → Postfix and evaluating Postfix (RPN) with a stack',
    analogy: `<p>Think of a <b>kitchen counter</b>. Postfix is a recipe written like: "put 3 on the counter, put 4 on the counter, put 2 on the counter, now <b>multiply</b> the top two things, now <b>add</b> the top two things". You never need brackets or rules like "multiply before add" — the order of the instructions already says what happens first. The counter is your stack.</p>`,
    explain: `<p>Three ways to write the same sum:</p>
      ${H.table(['name', 'operator position', 'example', 'value'], [
        ['<b>Infix</b> (how humans write)', 'between operands', '<code>3 + 4 * 2</code>', '11'],
        ['<b>Postfix</b> / RPN', 'after operands', '<code>3 4 2 * +</code>', '11'],
        ['<b>Prefix</b> / Polish', 'before operands', '<code>+ 3 * 4 2</code>', '11']
      ])}
      <p>Infix needs precedence rules (<code>*</code> before <code>+</code>) and brackets. Postfix needs <b>neither</b>, which is why calculators and compilers like it.</p>
      <h4>1) Evaluate postfix — one stack of numbers</h4>
      <ul><li>Number → ${H.c('g', 'push')}.</li><li>Operator → ${H.c('r', 'pop b')} (top), ${H.c('r', 'pop a')} (next), push ${H.c('y', 'a op b')}. Order matters for <code>-</code> and <code>/</code>: the <b>first</b> pop is the <b>right</b> operand.</li></ul>
      ${H.table(['token', 'action', 'stack after'], [
        ['3', 'push', '3'], ['4', 'push', '3 4'], ['2', 'push', '3 4 2'],
        ['*', 'b=2, a=4 → 4*2 = 8', '3 8'], ['+', 'b=8, a=3 → 3+8 = 11', '11'],
        ['5', 'push', '11 5'], ['-', 'b=5, a=11 → 11-5 = 6', '<span class="c-p">6</span>']
      ])}
      <h4>2) Convert infix → postfix (Shunting-Yard, by Dijkstra) — one stack of operators</h4>
      <ul>
        <li>Operand → write it straight to the output.</li>
        <li><code>(</code> → push. <code>)</code> → pop operators to output until the matching <code>(</code>, then throw the <code>(</code> away.</li>
        <li>Operator <code>op</code> → first pop (to output) every operator on top that must happen <b>before</b> it: higher precedence, or same precedence and left-associative (<code>^</code> is right-associative, so it does not pop another <code>^</code>). Then push <code>op</code>.</li>
        <li>End → pop everything left to the output.</li>
      </ul>
      ${H.table(['char', 'output so far', 'operator stack (bottom→top)', 'why'], [
        ['a', 'a', '', 'operand'], ['+', 'a', '+', 'empty stack → push'], ['b', 'ab', '+', 'operand'],
        ['*', 'ab', '+ *', '* beats +, so + stays'], ['(', 'ab', '+ * (', 'always push ('],
        ['c', 'abc', '+ * (', 'operand'], ['-', 'abc', '+ * ( -', '( blocks popping'], ['d', 'abcd', '+ * ( -', 'operand'],
        [')', 'abcd-', '+ *', 'pop until ('], ['end', '<span class="c-p">abcd-*+</span>', '', 'pop the rest']
      ])}`,
    clues: [
      '"Evaluate reverse Polish notation", "postfix expression" → stack of numbers, pop two on each operator.',
      '"Basic calculator", "evaluate the expression string with + - * / and parentheses" → operator stack + operand stack (or convert to postfix first).',
      '"Convert infix to postfix / prefix" → Shunting-Yard with precedence.',
      'Result must truncate toward zero → Java and C++ integer <code>/</code> already do that; Python <code>//</code> rounds <b>down</b> (use <code>int(a / b)</code> or fix the sign); JS needs <code>Math.trunc(a / b)</code>.',
      'Prefix (Polish) evaluation → same as postfix but scan <b>right to left</b>, and the first pop is the <b>left</b> operand.'
    ],
    code: { lang: 'java', code: `
import java.util.*;

class ExpressionBasics {
    // precedence: bigger number = do it earlier
    static int prec(char op) {
        if (op == '+' || op == '-') return 1;
        if (op == '*' || op == '/') return 2;
        if (op == '^') return 3;
        return -1;                                     // '(' is never popped by an operator
    }

    // "a+b*(c-d)" -> "abcd-*+"   (operands are single letters or digits)
    static String infixToPostfix(String s) {
        StringBuilder out = new StringBuilder();
        Deque<Character> ops = new ArrayDeque<>();
        for (char ch : s.toCharArray()) {
            if (Character.isLetterOrDigit(ch)) {
                out.append(ch);                        // operands go straight to the output
            } else if (ch == '(') {
                ops.push(ch);
            } else if (ch == ')') {
                while (!ops.isEmpty() && ops.peek() != '(') out.append(ops.pop());
                ops.pop();                             // discard the '('
            } else {
                // pop operators that must run BEFORE ch
                while (!ops.isEmpty() && ops.peek() != '('
                        && (prec(ops.peek()) > prec(ch)
                            || (prec(ops.peek()) == prec(ch) && ch != '^'))) {   // '^' is right-associative
                    out.append(ops.pop());
                }
                ops.push(ch);
            }
        }
        while (!ops.isEmpty()) out.append(ops.pop());  // flush remaining operators
        return out.toString();
    }

    // tokens like {"3","4","2","*","+"} -> 11
    static long evalPostfix(String[] tokens) {
        Deque<Long> st = new ArrayDeque<>();
        for (String t : tokens) {
            if (t.equals("+") || t.equals("-") || t.equals("*") || t.equals("/")) {
                long b = st.pop();                     // FIRST pop = RIGHT operand
                long a = st.pop();                     // second pop = left operand
                if (t.equals("+")) st.push(a + b);
                else if (t.equals("-")) st.push(a - b);
                else if (t.equals("*")) st.push(a * b);
                else st.push(a / b);                   // truncates toward zero
            } else {
                st.push(Long.parseLong(t));            // a number (may be negative like "-7")
            }
        }
        return st.pop();
    }

    public static void main(String[] args) {
        System.out.println(infixToPostfix("a+b*(c-d)"));                          // abcd-*+
        System.out.println(evalPostfix("3 4 2 * + 5 -".split(" ")));             // 6
    }
}`,
      alt: [{ lang: 'python', run: true, code: `PREC = {'+': 1, '-': 1, '*': 2, '/': 2, '^': 3}   # bigger number = do it earlier


def infix_to_postfix(s: str) -> str:
    """"a+b*(c-d)" -> "abcd-*+" (operands are single letters or digits)."""
    out, ops = [], []
    for ch in s:
        if ch.isalnum():
            out.append(ch)                       # operands go straight to the output
        elif ch == '(':
            ops.append(ch)
        elif ch == ')':
            while ops[-1] != '(':
                out.append(ops.pop())
            ops.pop()                            # discard the '('
        else:
            # pop operators that must run BEFORE ch ('^' is right-associative)
            while ops and ops[-1] != '(' and (PREC[ops[-1]] > PREC[ch] or
                                              (PREC[ops[-1]] == PREC[ch] and ch != '^')):
                out.append(ops.pop())
            ops.append(ch)
    out.extend(reversed(ops))                    # flush remaining operators
    return ''.join(out)


def eval_postfix(tokens: list[str]) -> int:
    st = []
    for t in tokens:
        if t in ('+', '-', '*', '/'):
            b, a = st.pop(), st.pop()            # FIRST pop = RIGHT operand
            if t == '+': st.append(a + b)
            elif t == '-': st.append(a - b)
            elif t == '*': st.append(a * b)
            else:
                q = abs(a) // abs(b)             # truncate toward zero (// alone floors)
                st.append(q if (a < 0) == (b < 0) else -q)
        else:
            st.append(int(t))                    # a number (may be negative like "-7")
    return st.pop()


print(infix_to_postfix("a+b*(c-d)"))             # abcd-*+
print(eval_postfix("3 4 2 * + 5 -".split()))     # 6` }, { lang: 'js', run: true, code: `const PREC = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 3 };   // bigger number = do it earlier

// "a+b*(c-d)" -> "abcd-*+"   (operands are single letters or digits)
function infixToPostfix(s) {
  let out = '';
  const ops = [];
  for (const ch of s) {
    if (/[A-Za-z0-9]/.test(ch)) {
      out += ch;                                 // operands go straight to the output
    } else if (ch === '(') {
      ops.push(ch);
    } else if (ch === ')') {
      while (ops[ops.length - 1] !== '(') out += ops.pop();
      ops.pop();                                 // discard the '('
    } else {
      // pop operators that must run BEFORE ch ('^' is right-associative)
      while (ops.length && ops[ops.length - 1] !== '(' &&
             (PREC[ops[ops.length - 1]] > PREC[ch] ||
              (PREC[ops[ops.length - 1]] === PREC[ch] && ch !== '^'))) {
        out += ops.pop();
      }
      ops.push(ch);
    }
  }
  while (ops.length) out += ops.pop();           // flush remaining operators
  return out;
}

// tokens like ["3","4","2","*","+"] -> 11
function evalPostfix(tokens) {
  const st = [];
  for (const t of tokens) {
    if ('+-*/'.includes(t) && t.length === 1) {
      const b = st.pop(), a = st.pop();          // FIRST pop = RIGHT operand
      st.push(t === '+' ? a + b : t === '-' ? a - b : t === '*' ? a * b : Math.trunc(a / b));
    } else {
      st.push(Number(t));                        // a number (may be negative like "-7")
    }
  }
  return st.pop();
}

console.log(infixToPostfix('a+b*(c-d)'));        // abcd-*+
console.log(evalPostfix('3 4 2 * + 5 -'.split(' ')));   // 6` }, { lang: 'cpp', code: `// precedence: bigger number = do it earlier
int prec(char op) {
    if (op == '+' || op == '-') return 1;
    if (op == '*' || op == '/') return 2;
    if (op == '^') return 3;
    return -1;                                     // '(' is never popped by an operator
}

// "a+b*(c-d)" -> "abcd-*+"   (operands are single letters or digits)
string infixToPostfix(const string& s) {
    string out, ops;                               // ops: a string used as a char stack
    for (char ch : s) {
        if (isalnum((unsigned char)ch)) {
            out += ch;                             // operands go straight to the output
        } else if (ch == '(') {
            ops.push_back(ch);
        } else if (ch == ')') {
            while (ops.back() != '(') { out += ops.back(); ops.pop_back(); }
            ops.pop_back();                        // discard the '('
        } else {
            // pop operators that must run BEFORE ch ('^' is right-associative)
            while (!ops.empty() && ops.back() != '(' &&
                   (prec(ops.back()) > prec(ch) || (prec(ops.back()) == prec(ch) && ch != '^'))) {
                out += ops.back(); ops.pop_back();
            }
            ops.push_back(ch);
        }
    }
    while (!ops.empty()) { out += ops.back(); ops.pop_back(); }   // flush the rest
    return out;
}

// tokens like {"3","4","2","*","+"} -> 11
long long evalPostfix(const vector<string>& tokens) {
    vector<long long> st;
    for (const string& t : tokens) {
        if (t == "+" || t == "-" || t == "*" || t == "/") {
            long long b = st.back(); st.pop_back();   // FIRST pop = RIGHT operand
            long long a = st.back(); st.pop_back();   // second pop = left operand
            if (t == "+") st.push_back(a + b);
            else if (t == "-") st.push_back(a - b);
            else if (t == "*") st.push_back(a * b);
            else st.push_back(a / b);                  // truncates toward zero
        } else {
            st.push_back(stoll(t));                    // a number (may be negative like "-7")
        }
    }
    return st.back();
}

int main() {
    cout << infixToPostfix("a+b*(c-d)") << "\\n";                                 // abcd-*+
    cout << evalPostfix({"3", "4", "2", "*", "+", "5", "-"}) << "\\n";            // 6
}` }] },
    codeTitle: 'Infix → postfix and postfix evaluation',
    examples: [
      {
        title: 'Evaluate "5 1 2 + 4 * + 3 -" (Wikipedia\'s classic)',
        html: `${H.table(['token', 'action', 'stack after'], [
          ['5', 'push', '5'], ['1', 'push', '5 1'], ['2', 'push', '5 1 2'], ['+', '1 + 2 = 3', '5 3'],
          ['4', 'push', '5 3 4'], ['*', '3 * 4 = 12', '5 12'], ['+', '5 + 12 = 17', '17'], ['3', 'push', '17 3'], ['-', '17 - 3 = 14', '<span class="c-p">14</span>']
        ])}<p>Infix form: <code>5 + (1 + 2) * 4 - 3</code> = 14. Notice the postfix needed no brackets: the position of <code>+</code> right after <code>1 2</code> already says "do this first".</p>`
      },
      {
        title: 'Operand order matters: "7 2 -" and "7 2 /"',
        html: `<p>Pop gives <b>b = 2</b> first (top), then <b>a = 7</b>. Compute <code>a - b = 5</code> and <code>a / b = 3</code>. If you write <code>b - a</code> you get <span class="c-r">-5</span> — the single most common bug in RPN code. Java's and C++'s <code>/</code> truncate toward zero: <code>-7 / 2 = -3</code> (not -4), which matches what LeetCode 150 expects. Python's <code>-7 // 2</code> is <span class="c-r">-4</span> (it floors), so use <code>int(a / b)</code>; in JS write <code>Math.trunc(a / b)</code>.</p>`
      },
      {
        title: 'Right-associative power: a^b^c',
        html: `<p><code>2^3^2</code> means <code>2^(3^2) = 2^9 = 512</code>, not <code>(2^3)^2 = 64</code>. In Shunting-Yard, an incoming <code>^</code> does <b>not</b> pop a <code>^</code> of equal precedence from the stack:</p>
          ${H.table(['char', 'output', 'ops stack'], [['a', 'a', ''], ['^', 'a', '^'], ['b', 'ab', '^'], ['^', 'ab', '^ ^ (no pop: right-assoc)'], ['c', 'abc', '^ ^'], ['end', '<span class="c-p">abc^^</span>', '']])}
          <p>For a left-associative operator like <code>-</code>: <code>a-b-c</code> → <code>ab-c-</code> = <code>(a-b)-c</code>, because the second <code>-</code> pops the first.</p>`
      },
      {
        title: 'Prefix (Polish) evaluation: "- + 2 3 4"',
        html: `<p>Scan <b>right to left</b>. Push 4, 3, 2. Then <code>+</code>: pop <b>a = 2</b> (first pop is now the LEFT operand), pop b = 3 → 5. Then <code>-</code>: pop a = 5, pop b = 4 → <b>1</b>. Infix: <code>(2 + 3) - 4 = 1</code>.</p>`,
        code: { lang: 'java', code: `long evalPrefix(String[] t) {
    Deque<Long> st = new ArrayDeque<>();
    for (int i = t.length - 1; i >= 0; i--) {
        String s = t[i];
        if (s.length() == 1 && "+-*/".indexOf(s.charAt(0)) >= 0) {
            long a = st.pop(), b = st.pop();     // right-to-left: first pop is the LEFT operand
            switch (s.charAt(0)) {
                case '+' -> st.push(a + b);
                case '-' -> st.push(a - b);
                case '*' -> st.push(a * b);
                default -> st.push(a / b);
            }
        } else st.push(Long.parseLong(s));
    }
    return st.pop();
}`,
      alt: [{ lang: 'python', code: `def eval_prefix(t: list[str]) -> int:
    st = []
    for s in reversed(t):                      # scan right to left
        if s in ('+', '-', '*', '/'):
            a, b = st.pop(), st.pop()          # right-to-left: first pop is the LEFT operand
            if s == '+': st.append(a + b)
            elif s == '-': st.append(a - b)
            elif s == '*': st.append(a * b)
            else:
                q = abs(a) // abs(b)           # truncate toward zero
                st.append(q if (a < 0) == (b < 0) else -q)
        else:
            st.append(int(s))
    return st.pop()` }, { lang: 'js', code: `function evalPrefix(t) {
  const st = [];
  for (let i = t.length - 1; i >= 0; i--) {    // scan right to left
    const s = t[i];
    if (s.length === 1 && '+-*/'.includes(s)) {
      const a = st.pop(), b = st.pop();        // right-to-left: first pop is the LEFT operand
      st.push(s === '+' ? a + b : s === '-' ? a - b : s === '*' ? a * b : Math.trunc(a / b));
    } else st.push(Number(s));
  }
  return st.pop();
}` }, { lang: 'cpp', code: `long long evalPrefix(const vector<string>& t) {
    vector<long long> st;
    for (int i = (int)t.size() - 1; i >= 0; i--) {   // scan right to left
        const string& s = t[i];
        if (s.size() == 1 && string("+-*/").find(s[0]) != string::npos) {
            long long a = st.back(); st.pop_back();   // right-to-left: first pop is the LEFT operand
            long long b = st.back(); st.pop_back();
            switch (s[0]) {
                case '+': st.push_back(a + b); break;
                case '-': st.push_back(a - b); break;
                case '*': st.push_back(a * b); break;
                default:  st.push_back(a / b);
            }
        } else st.push_back(stoll(s));
    }
    return st.back();
}` }] }
      }
    ],
    deepDive: `<p><b>Why postfix exists.</b> Postfix (Reverse Polish Notation, popularised by HP calculators and the Forth/PostScript languages) is what compilers effectively produce: the JVM itself is a <b>stack machine</b>. <code>a + b * c</code> compiles to bytecode like <code>iload a; iload b; iload c; imul; iadd</code> — literally postfix evaluated on the operand stack of the current frame. Python's bytecode and WebAssembly are stack machines too.</p>
      <p><b>Shunting-Yard correctness.</b> The operator stack is always ordered by increasing "binding strength" from bottom to top (ignoring parentheses, which act as barriers). An incoming operator pops everything that binds at least as tightly (strictly tighter for right-associative ones), so higher-precedence work is emitted first. Each token is pushed and popped at most once → O(N). Dijkstra published it in 1961.</p>
      <p><b>Production pitfalls.</b> (1) Unary minus: <code>-3 + 4</code> or <code>2 * (-x)</code> — a <code>-</code> at the start or right after <code>(</code> / another operator is unary; real parsers treat it as a separate, higher-precedence operator or push a 0 first. (2) Multi-digit numbers: read the whole number with an inner loop. (3) Errors: mismatched parentheses show up as a <code>(</code> left on the stack at the end or a <code>)</code> with no <code>(</code>. (4) Overflow: use <code>long</code> for intermediate values.</p>
      <p><b>Two-stack direct evaluation.</b> Instead of producing postfix, you can evaluate infix directly with an <b>operand stack</b> and an <b>operator stack</b>: whenever Shunting-Yard would output an operator, apply it to the top two operands instead. This is how LeetCode 224/227/772 ("Basic Calculator I/II/III") are usually solved; Calculator II (no parentheses) even collapses to a single stack where <code>*</code> and <code>/</code> are applied immediately and <code>-x</code> is pushed as a negative number.</p>
      <p><b>Beyond:</b> a full parser uses <b>recursive descent</b> or <b>Pratt parsing</b> (precedence climbing), which is Shunting-Yard written with the call stack. Expression trees (AST) are what you get if each operator pops two subtrees instead of two numbers.</p>`,
    aiEra: `<p><b>What AI changes:</b> nobody hand-writes an expression parser in production any more — you use a library or ask an assistant. But "Basic Calculator" remains a top interview problem precisely because it tests careful state handling (unary minus, multi-digit numbers, parentheses, operand order) that AI-generated code frequently fumbles on edge cases.</p>
      <p><b>Use AI as a partner:</b> <code>"Give me 15 expressions with unary minus, nested parentheses, spaces and division truncation, plus expected values computed by a reference evaluator"</code>. Then run your code on all of them. Also useful: <code>"Show the JVM bytecode for a + b * c and map each instruction to a postfix token"</code>.</p>
      <p><b>Where AI goes wrong:</b> swapped operands for <code>-</code> and <code>/</code>; using floating-point division instead of truncation; treating <code>^</code> as left-associative; forgetting unary minus after <code>(</code>; evaluating with <code>eval()</code>/script engines — a security hole if the expression comes from users.</p>
      <p><b>What you must still own:</b> the precedence/associativity rule for popping, the operand-order rule, and a clear verbal walkthrough with a stack table — interviewers grade the explanation as much as the code.</p>`,
    viz: [{
      title: 'Evaluating a postfix expression',
      input: '3 4 2 * + 5 -',
      inputLabel: 'Postfix tokens separated by spaces (numbers and + - * /)',
      gen: function (input) {
        var s = input === undefined ? '3 4 2 * + 5 -' : String(input);
        var toks = s.trim().split(/\s+/).filter(function (x) { return x.length; });
        if (toks.length < 3) throw new Error('Enter at least 3 tokens, e.g. "3 4 2 * + 5 -"');
        if (toks.length > 16) throw new Error('Please use at most 16 tokens.');
        toks.forEach(function (t) { if (!/^-?\d+$/.test(t) && '+-*/'.indexOf(t) < 0) throw new Error('Token "' + t + '" is not a whole number or + - * /'); });
        var st = [], frames = [];
        frames.push({ narr: 'Read tokens left to right. Numbers wait on the stack; an operator grabs the <b>top two</b>.', parts: [
          { type: 'array', label: 'tokens', values: toks }, { type: 'stack', label: 'number stack', items: [] }
        ] });
        for (var i = 0; i < toks.length; i++) {
          var t = toks[i], hl = {}, k;
          for (k = 0; k < i; k++) hl[k] = 'done';
          hl[i] = 'cur';
          if (/^-?\d+$/.test(t)) {
            st.push(Number(t));
            frames.push({ narr: '<b>' + t + '</b> is a number → <span class="c-g">push</span>.', parts: [
              { type: 'array', label: 'tokens', values: toks, hl: hl, ptr: one(i, 'i') },
              { type: 'stack', label: 'number stack', items: st.slice(), hl: one(st.length - 1, 'ok') }
            ] });
          } else {
            if (st.length < 2) throw new Error('Not a valid postfix expression: operator "' + t + '" at position ' + i + ' needs two numbers before it.');
            var b = st[st.length - 1], a = st[st.length - 2], r;
            if (t === '/' && b === 0) throw new Error('Division by zero at position ' + i + '.');
            r = t === '+' ? a + b : t === '-' ? a - b : t === '*' ? a * b : Math.trunc(a / b);
            frames.push({ narr: 'Operator <b>' + t + '</b>: pop <b>b = ' + b + '</b> (top, the right side) and <b>a = ' + a + '</b> (the left side).', parts: [
              { type: 'array', label: 'tokens', values: toks, hl: hl, ptr: one(i, 'i') },
              { type: 'stack', label: 'number stack', items: st.slice(), hl: (function () { var h = {}; h[st.length - 1] = 'bad'; h[st.length - 2] = 'bad'; return h; })() }
            ] });
            st.pop(); st.pop(); st.push(r);
            frames.push({ narr: 'Compute a ' + t + ' b = ' + a + ' ' + t + ' ' + b + ' = <b>' + r + '</b> and push the result back.' + (t === '/' ? ' (integer division truncates toward zero)' : ''), parts: [
              { type: 'array', label: 'tokens', values: toks, hl: hl, ptr: one(i, 'i') },
              { type: 'stack', label: 'number stack', items: st.slice(), hl: one(st.length - 1, 'ok') }
            ] });
          }
        }
        if (st.length !== 1) throw new Error('Not a valid postfix expression: ' + st.length + ' numbers are left over at the end (should be exactly 1).');
        frames.push({ narr: 'All tokens used and exactly one number is left → the answer is <b>' + st[0] + '</b>.', parts: [
          { type: 'stack', label: 'number stack', items: st.slice(), hl: { 0: 'sel' } }, { type: 'vars', vals: { answer: st[0] }, hl: { answer: 'sel' } }
        ] });
        return frames;
      }
    }, {
      title: 'Shunting-Yard: infix → postfix with an operator stack',
      input: 'a+b*(c-d)^e^f',
      inputLabel: 'Infix with single-letter/digit operands and + - * / ^ ( )  (up to 20 chars)',
      gen: function (input) {
        var s = (input === undefined || input === null ? 'a+b*(c-d)^e^f' : String(input)).replace(/\s+/g, '');
        if (!s.length) throw new Error('Type an infix expression such as a+b*(c-d)');
        if (s.length > 20) throw new Error('Please use at most 20 characters.');
        if (/[^A-Za-z0-9+\-*\/^()]/.test(s)) throw new Error('Use single letters/digits, + - * / ^ and parentheses only, e.g. a+b*(c-d)');
        function prec(c) { return c === '+' || c === '-' ? 1 : c === '*' || c === '/' ? 2 : c === '^' ? 3 : -1; }
        var ch = s.split(''), ops = [], out = [], frames = [];
        function parts(i, hlOps, note) {
          var hl = {}, k;
          for (k = 0; k < i; k++) hl[k] = 'done';
          if (i < ch.length) hl[i] = 'cur';
          var p = [
            { type: 'array', label: 'infix', values: ch, hl: hl, ptr: i < ch.length ? one(i, 'i') : {} },
            { type: 'stack', label: 'operator stack', items: ops.slice(), hl: hlOps || {} },
            { type: 'array', label: 'postfix output', values: out.length ? out.slice() : ['—'], hl: note ? one(out.length - 1, 'ok') : {} }
          ];
          return p;
        }
        frames.push({ narr: 'Operands go straight to the output. Operators wait on the stack until we know nothing stronger is coming. Precedence: <b>^</b> (3, right-assoc) &gt; <b>* /</b> (2) &gt; <b>+ -</b> (1).', parts: parts(0) });
        for (var i = 0; i < ch.length; i++) {
          var c = ch[i];
          if (/[A-Za-z0-9]/.test(c)) {
            out.push(c);
            frames.push({ narr: '<b>' + c + '</b> is an operand → write it to the output immediately.', parts: parts(i, {}, true) });
          } else if (c === '(') {
            ops.push(c);
            frames.push({ narr: '<b>(</b> → <span class="c-g">push</span>. It acts as a wall: nothing below it can be popped until the matching <b>)</b>.', parts: parts(i, one(ops.length - 1, 'ok')) });
          } else if (c === ')') {
            var popped = [];
            while (ops.length && ops[ops.length - 1] !== '(') { popped.push(ops[ops.length - 1]); out.push(ops.pop()); }
            if (!ops.length) throw new Error('Mismatched parentheses: a ) at position ' + i + ' has no matching (.');
            var hlB = one(ops.length - 1, 'bad');
            frames.push({ narr: '<b>)</b> → <span class="c-r">pop</span> operators to the output until the matching <b>(</b>' + (popped.length ? ' (moved: ' + popped.join(' ') + ')' : '') + ', then throw the ( away.', parts: parts(i, hlB, popped.length > 0) });
            ops.pop();
          } else {
            var moved = [];
            while (ops.length && ops[ops.length - 1] !== '(' && (prec(ops[ops.length - 1]) > prec(c) || (prec(ops[ops.length - 1]) === prec(c) && c !== '^'))) {
              moved.push(ops[ops.length - 1]); out.push(ops.pop());
            }
            if (moved.length) {
              frames.push({ narr: 'Operator <b>' + c + '</b> arrives. On top: ' + moved.join(', ') + ' bind(s) at least as tightly' + (c === '^' ? '' : ' (equal precedence + left-assoc counts)') + ' → <span class="c-r">pop</span> them to the output first.', parts: parts(i, {}, true) });
            }
            ops.push(c);
            frames.push({ narr: '<span class="c-g">Push ' + c + '</span>. ' + (c === '^' && ops.length > 1 && ops[ops.length - 2] === '^' ? 'Note: ^ is <b>right-associative</b>, so it did <b>not</b> pop the ^ below it.' : 'It must wait: the next operator might bind more tightly.'), parts: parts(i, one(ops.length - 1, 'ok')) });
          }
        }
        if (ops.indexOf('(') >= 0) throw new Error('Mismatched parentheses: a ( was never closed.');
        if (ops.length) {
          var hlAll = {};
          for (var k = 0; k < ops.length; k++) hlAll[k] = 'bad';
          frames.push({ narr: 'End of input → <span class="c-r">pop</span> every remaining operator (top first) to the output.', parts: parts(ch.length, hlAll) });
          while (ops.length) out.push(ops.pop());
        }
        frames.push({ narr: 'Postfix = <b>' + out.join(' ') + '</b>. Evaluate it with the number stack from the previous visualizer — no brackets or precedence rules needed any more.', parts: [
          { type: 'array', label: 'infix', values: ch },
          { type: 'array', label: 'postfix output', values: out.slice(), hl: (function () { var h = {}; for (var q = 0; q < out.length; q++) h[q] = 'sel'; return h; })() }
        ] });
        return frames;
      }
    }],
    problems: [{
      title: 'Evaluate Reverse Polish Notation',
      level: 'Medium',
      tags: ['stack', 'math', 'expression'],
      companies: ['Amazon', 'LinkedIn', 'Google'],
      statement: `<p>You are given an array of string <code>tokens</code> that represents an arithmetic expression in <b>Reverse Polish Notation</b> (postfix). Valid operators are <code>+ - * /</code>; each operand is an integer (possibly negative, like <code>"-11"</code>). Division truncates toward zero. Return the value of the expression. The input is always valid and there is no division by zero.</p>`,
      constraints: `1 ≤ tokens.length ≤ 10<sup>4</sup>, operands in [-200, 200], every intermediate result fits in a 32-bit int`,
      example: `<p>tokens = <code>["4","13","5","/","+"]</code></p>
        ${H.table(['token', 'stack after'], [['4', '4'], ['13', '4 13'], ['5', '4 13 5'], ['/', '4 ' + H.c('y', '2') + ' (13/5 truncates to 2)'], ['+', H.c('g', '6')]])}
        <p>Output: <b>6</b>, i.e. <code>4 + (13 / 5)</code>.</p>`,
      brute: {
        why: `<p>Repeatedly scan the list for the first operator, replace "a b op" by its result, and rebuild the list. Each reduction is O(N) (find + rebuild), and there are up to N/2 operators → <b>O(N<sup>2</sup>)</b>. The waste: after each reduction we start scanning from the beginning again, although everything to the left of the operator was already "waiting" in the right order — exactly what a stack remembers.</p>`,
        code: `
int evalRPNBrute(String[] tokens) {
    List<String> list = new ArrayList<>(Arrays.asList(tokens));
    while (list.size() > 1) {
        for (int i = 2; i < list.size(); i++) {
            String op = list.get(i);
            if (op.equals("+") || op.equals("-") || op.equals("*") || op.equals("/")) {
                int a = Integer.parseInt(list.get(i - 2)), b = Integer.parseInt(list.get(i - 1));
                int r = op.equals("+") ? a + b : op.equals("-") ? a - b : op.equals("*") ? a * b : a / b;
                list.subList(i - 2, i + 1).clear();       // remove "a b op" (O(N) shift)
                list.add(i - 2, String.valueOf(r));       // put the result back
                break;                                    // rescan from the start
            }
        }
    }
    return Integer.parseInt(list.get(0));
}`
      },
      mcq: {
        q: 'The stack (bottom→top) is <code>10 3</code> and the next token is <code>"-"</code>. What is pushed?',
        options: ['-7', '7', '13', '30'],
        answer: 1,
        explain: 'First pop is the RIGHT operand b = 3, second pop is the LEFT operand a = 10. Result a - b = 10 - 3 = 7.'
      },
      hints: [
        `<p>Aha: in postfix, an operator always applies to the <b>two most recent unused values</b>. "Most recent" → a stack.</p>`,
        `<p>Use a stack of numbers. Number → push. Operator → <code>b = pop()</code>, <code>a = pop()</code>, push <code>a op b</code>. The answer is the single value left.</p>`,
        `<p>Traps: <code>"-11"</code> is a number, not an operator — check for operators by exact string match (or length 1), not by the first character; operand order for - and /; truncate toward zero (automatic in Java and C++, <code>int(a / b)</code> in Python, <code>Math.trunc</code> in JS). Recipe: for t in tokens: if t is one of + - * /: b=pop, a=pop, push(apply); else push(parseInt(t)). return pop().</p>`
      ],
      tests: { sig: "string[] -> int", fn: "evalRPN", cases: [
        [[["2","1","+","3","*"]],9],
        [[["4","13","5","/","+"]],6],
        [[["10","6","9","3","+","-11","*","/","*","17","+","5","+"]],22],
        [[["5"]],5],
        [[["-11"]],-11],
        [[["7","-2","/"]],-3],
        [[["-7","2","/"]],-3],
        [[["0","3","/"]],0],
        [[["10","3","-"]],7],
        [[["200","200","*","200","*","200","*"]],1600000000],
        [[["-200","200","*","200","*","200","*"]],-1600000000]
      ] },
      solution: {
        approach: `<p>Single left-to-right scan with a stack of numbers; each operator consumes the top two and pushes its result.</p>`,
        code: `
import java.util.*;

class Solution {
    public int evalRPN(String[] tokens) {
        Deque<Integer> st = new ArrayDeque<>();
        for (String t : tokens) {
            switch (t) {
                case "+" -> st.push(st.pop() + st.pop());          // order does not matter
                case "*" -> st.push(st.pop() * st.pop());
                case "-" -> { int b = st.pop(), a = st.pop(); st.push(a - b); }   // order matters!
                case "/" -> { int b = st.pop(), a = st.pop(); st.push(a / b); }   // truncates toward 0
                default -> st.push(Integer.parseInt(t));          // handles "-11" too
            }
        }
        return st.pop();
    }

    public static void main(String[] args) {
        Solution s = new Solution();
        System.out.println(s.evalRPN(new String[]{"2", "1", "+", "3", "*"}));    // 9
        System.out.println(s.evalRPN(new String[]{"4", "13", "5", "/", "+"}));   // 6
        System.out.println(s.evalRPN(new String[]{"10", "6", "9", "3", "+", "-11", "*", "/", "*", "17", "+", "5", "+"})); // 22
    }
}`,
        alt: [{ lang: 'js', code: `function evalRPN(tokens) {
  const st = [];
  for (const t of tokens) {
    if (t === '+' || t === '-' || t === '*' || t === '/') {
      const b = st.pop(), a = st.pop();          // first pop is the RIGHT operand
      if (t === '+') st.push(a + b);
      else if (t === '-') st.push(a - b);
      else if (t === '*') st.push(a * b);
      else st.push(Math.trunc(a / b));           // truncate toward zero (not Math.floor)
    } else {
      st.push(Number(t));                        // "-11" is a number, not an operator
    }
  }
  return st.pop();
}` }, { lang: 'cpp', code: `class Solution {
public:
    int evalRPN(const vector<string>& tokens) {
        vector<long long> st;                    // long long: no overflow while combining
        for (const string& t : tokens) {
            if (t == "+" || t == "-" || t == "*" || t == "/") {
                long long b = st.back(); st.pop_back();   // first pop is the RIGHT operand
                long long a = st.back(); st.pop_back();
                if (t == "+") st.push_back(a + b);
                else if (t == "-") st.push_back(a - b);
                else if (t == "*") st.push_back(a * b);
                else st.push_back(a / b);        // C++ division truncates toward zero
            } else {
                st.push_back(stoll(t));          // handles "-11" too
            }
        }
        return (int)st.back();
    }
};` }, { lang: 'python', code: `def eval_rpn(tokens):
    st = []
    for t in tokens:
        if t in ('+', '-', '*', '/'):
            b, a = st.pop(), st.pop()      # first pop is the RIGHT operand
            if t == '+': st.append(a + b)
            elif t == '-': st.append(a - b)
            elif t == '*': st.append(a * b)
            else: st.append(int(a / b))    # int() truncates toward zero (// would floor!)
        else:
            st.append(int(t))
    return st.pop()

print(eval_rpn(["4", "13", "5", "/", "+"]))  # 6`, run: true }],
        dry: {
          head: ['token', 'action', 'stack after (bottom→top)'],
          rows: [
            ['2', 'push', '2'], ['1', 'push', '2 1'], ['+', 'b=1, a=2 → 3', '3'],
            ['3', 'push', '3 3'], ['*', 'b=3, a=3 → 9', '<span class="c-p">9</span>']
          ]
        },
        complexity: `<p><b>Time O(N)</b>: each token is processed once with O(1) stack work. <b>Space O(N)</b>: up to about N/2 numbers can wait on the stack (e.g. many operands before the operators).</p>`,
        followUps: ['Convert an infix string to RPN first (Shunting-Yard), then evaluate.', 'Support unary minus and the ^ operator.', 'Build an expression tree instead of a number.']
      }
    }]
  });

  // =====================================================================
  // TOPIC 5 — Monotonic Stack: Next Greater Element
  // =====================================================================
  topics.push({
    title: 'Monotonic Stack — Next Greater Element',
    analogy: `<p>People stand in a line, all facing <b>right</b>. Each person wants to know: <b>"who is the first person to my right who is taller than me?"</b></p>
      <p>Walk along the line. Short people who are still waiting for an answer raise their hand. When a tall person walks past, <b>every waiting person shorter than them</b> gets their answer at once ("it's you!") and lowers their hand. The people still waiting always form a <b>tall → short</b> staircase, because anyone shorter behind a newcomer would already have been answered by them.</p>`,
    explain: `<p>Brute force asks every element to scan right: O(N<sup>2</sup>). The monotonic stack keeps only the <b>elements still waiting for an answer</b>. Their values are always <b>decreasing</b> from bottom to top — that's why it's called "monotonic".</p>
      ${H.arr([4, 5, 2, 10, 8], { label: 'a', hl: { 3: 'y' } })}
      ${H.arr([5, 10, 10, -1, -1], { label: 'NGE', hl: { 1: 'g', 2: 'g' } })}
      <p>When ${H.c('y', '10')} arrives, the waiting stack holds 5 and 2 (decreasing). 10 beats both → ${H.c('g', 'both get answer 10')} and are popped. Then 10 waits itself.</p>
      <p><b>Why O(N)?</b> Each index is <b>pushed once</b> and <b>popped at most once</b>. The inner <code>while</code> loop may look scary, but over the whole run it pops at most N times in total → 2N operations.</p>
      <h4>The four siblings (memorize this table)</h4>
      ${H.table(['want', 'scan', 'pop while', 'answer comes from', 'stack shape'], [
        ['Next Greater (to the right)', 'left → right', '<code>a[top] &lt; x</code>', 'popped index gets <code>x</code>', 'decreasing'],
        ['Next Smaller (to the right)', 'left → right', '<code>a[top] &gt; x</code>', 'popped index gets <code>x</code>', 'increasing'],
        ['Previous Greater (to the left)', 'left → right', '<code>a[top] &lt;= x</code>', 'top after popping', 'decreasing'],
        ['Previous Smaller (to the left)', 'left → right', '<code>a[top] &gt;= x</code>', 'top after popping', 'increasing']
      ])}
      <p>Store <b>indices</b>, not values: from an index you can get the value <i>and</i> the distance (needed for "how many days until...").</p>`,
    clues: [
      '"<b>Next greater</b> / next smaller element", "first element to the right that is bigger".',
      '"<b>Nearest to the left</b> that is greater/smaller", "previous greater".',
      '"How many days until a warmer temperature" → distance to next greater (store indices).',
      '"For each element, how far can it extend" / "span" / "visible people" → monotonic stack.',
      '<code>N ≤ 10<sup>5</sup></code> and the naive answer is "for each i scan right" (O(N<sup>2</sup>)) → monotonic stack makes it O(N).',
      '"Circular array" next greater → loop <code>i</code> from 0 to 2N-1 and use <code>i % n</code>.'
    ],
    code: [{ lang: 'java', code: `
import java.util.*;

class MonotonicFamily {
    // Next Greater to the right (value), -1 if none. Stack: indices, values decreasing.
    static int[] nextGreater(int[] a) {
        int n = a.length; int[] res = new int[n]; Arrays.fill(res, -1);
        Deque<Integer> st = new ArrayDeque<>();
        for (int i = 0; i < n; i++) {
            while (!st.isEmpty() && a[st.peek()] < a[i]) res[st.pop()] = a[i];
            st.push(i);
        }
        return res;
    }

    // Previous Smaller to the left (index), -1 if none. Stack: indices, values increasing.
    static int[] prevSmallerIndex(int[] a) {
        int n = a.length; int[] res = new int[n];
        Deque<Integer> st = new ArrayDeque<>();
        for (int i = 0; i < n; i++) {
            while (!st.isEmpty() && a[st.peek()] >= a[i]) st.pop();   // not strictly smaller -> useless
            res[i] = st.isEmpty() ? -1 : st.peek();
            st.push(i);
        }
        return res;
    }

    // Next Greater in a CIRCULAR array: walk the array twice, push only on the first lap.
    static int[] nextGreaterCircular(int[] a) {
        int n = a.length; int[] res = new int[n]; Arrays.fill(res, -1);
        Deque<Integer> st = new ArrayDeque<>();
        for (int i = 0; i < 2 * n; i++) {
            int x = a[i % n];
            while (!st.isEmpty() && a[st.peek()] < x) res[st.pop()] = x;
            if (i < n) st.push(i);
        }
        return res;
    }

    public static void main(String[] args) {
        int[] a = {4, 5, 2, 10, 8};
        System.out.println(Arrays.toString(nextGreater(a)));          // [5, 10, 10, -1, -1]
        System.out.println(Arrays.toString(prevSmallerIndex(a)));     // [-1, 0, -1, 2, 2]
        System.out.println(Arrays.toString(nextGreaterCircular(new int[]{1, 2, 1}))); // [2, -1, 2]
    }
}`,
      alt: [{ lang: 'python', run: true, code: `def next_greater(a):
    """Next Greater to the right (value), -1 if none. Stack: indices, values decreasing."""
    res, st = [-1] * len(a), []
    for i, x in enumerate(a):
        while st and a[st[-1]] < x:
            res[st.pop()] = x
        st.append(i)
    return res


def prev_smaller_index(a):
    """Previous Smaller to the left (index), -1 if none. Stack: indices, values increasing."""
    res, st = [], []
    for i, x in enumerate(a):
        while st and a[st[-1]] >= x:     # not strictly smaller -> useless
            st.pop()
        res.append(st[-1] if st else -1)
        st.append(i)
    return res


def next_greater_circular(a):
    """Walk the array twice, push only on the first lap."""
    n = len(a)
    res, st = [-1] * n, []
    for i in range(2 * n):
        x = a[i % n]
        while st and a[st[-1]] < x:
            res[st.pop()] = x
        if i < n:
            st.append(i)
    return res


a = [4, 5, 2, 10, 8]
print(next_greater(a))                   # [5, 10, 10, -1, -1]
print(prev_smaller_index(a))             # [-1, 0, -1, 2, 2]
print(next_greater_circular([1, 2, 1]))  # [2, -1, 2]` }, { lang: 'js', run: true, code: `const top = (st) => st[st.length - 1];

// Next Greater to the right (value), -1 if none. Stack: indices, values decreasing.
function nextGreater(a) {
  const res = new Array(a.length).fill(-1), st = [];
  for (let i = 0; i < a.length; i++) {
    while (st.length && a[top(st)] < a[i]) res[st.pop()] = a[i];
    st.push(i);
  }
  return res;
}

// Previous Smaller to the left (index), -1 if none. Stack: indices, values increasing.
function prevSmallerIndex(a) {
  const res = [], st = [];
  for (let i = 0; i < a.length; i++) {
    while (st.length && a[top(st)] >= a[i]) st.pop();   // not strictly smaller -> useless
    res.push(st.length ? top(st) : -1);
    st.push(i);
  }
  return res;
}

// Next Greater in a CIRCULAR array: walk the array twice, push only on the first lap.
function nextGreaterCircular(a) {
  const n = a.length, res = new Array(n).fill(-1), st = [];
  for (let i = 0; i < 2 * n; i++) {
    const x = a[i % n];
    while (st.length && a[top(st)] < x) res[st.pop()] = x;
    if (i < n) st.push(i);
  }
  return res;
}

const a = [4, 5, 2, 10, 8];
console.log(nextGreater(a));                 // [ 5, 10, 10, -1, -1 ]
console.log(prevSmallerIndex(a));            // [ -1, 0, -1, 2, 2 ]
console.log(nextGreaterCircular([1, 2, 1])); // [ 2, -1, 2 ]` }, { lang: 'cpp', code: `// Next Greater to the right (value), -1 if none. Stack: indices, values decreasing.
vector<int> nextGreater(const vector<int>& a) {
    vector<int> res(a.size(), -1), st;
    for (int i = 0; i < (int)a.size(); i++) {
        while (!st.empty() && a[st.back()] < a[i]) { res[st.back()] = a[i]; st.pop_back(); }
        st.push_back(i);
    }
    return res;
}

// Previous Smaller to the left (index), -1 if none. Stack: indices, values increasing.
vector<int> prevSmallerIndex(const vector<int>& a) {
    vector<int> res(a.size()), st;
    for (int i = 0; i < (int)a.size(); i++) {
        while (!st.empty() && a[st.back()] >= a[i]) st.pop_back();   // not strictly smaller
        res[i] = st.empty() ? -1 : st.back();
        st.push_back(i);
    }
    return res;
}

// Next Greater in a CIRCULAR array: walk the array twice, push only on the first lap.
vector<int> nextGreaterCircular(const vector<int>& a) {
    int n = a.size();
    vector<int> res(n, -1), st;
    for (int i = 0; i < 2 * n; i++) {
        int x = a[i % n];
        while (!st.empty() && a[st.back()] < x) { res[st.back()] = x; st.pop_back(); }
        if (i < n) st.push_back(i);
    }
    return res;
}

void print(const vector<int>& v) {
    for (int x : v) cout << x << " ";
    cout << "\\n";
}

int main() {
    vector<int> a{4, 5, 2, 10, 8};
    print(nextGreater(a));                   // 5 10 10 -1 -1
    print(prevSmallerIndex(a));              // -1 0 -1 2 2
    print(nextGreaterCircular({1, 2, 1}));   // 2 -1 2
}` }] }, { lang: 'python', run: true, title: 'Daily Temperatures in Python (runnable)', code: `def daily_temperatures(t):
    ans = [0] * len(t)
    st = []                                  # indices of days still waiting, temps decreasing
    for i, x in enumerate(t):
        while st and t[st[-1]] < x:          # today is warmer than those waiting days
            j = st.pop()
            ans[j] = i - j                   # distance, not value -> that's why we store indices
        st.append(i)
    return ans

print(daily_temperatures([73, 74, 75, 71, 69, 72, 76, 73]))  # [1, 1, 4, 2, 1, 1, 0, 0]` }],
    codeTitle: ['The monotonic family in one place'],
    examples: [
      {
        title: 'Daily Temperatures: answer is a DISTANCE',
        html: `${H.arr([73, 74, 75, 71, 69, 72, 76, 73], { label: 'temps', hl: { 2: 'y', 6: 'g' } })}
          ${H.arr([1, 1, 4, 2, 1, 1, 0, 0], { label: 'wait days', hl: { 2: 'y' } })}
          <p>Day 2 (75°) waits while 71, 69 and 72 arrive (none are warmer), then day 6 (${H.c('g', '76°')}) pops it: answer = 6 - 2 = <b>4</b>. Because the answer is <code>i - j</code>, we must store <b>indices</b> on the stack.</p>`
      },
      {
        title: 'Equal values: strict vs non-strict pop',
        html: `<p>Array <code>[2, 2, 3]</code>. With <code>while a[top] &lt; x</code> (strict), the second 2 does <b>not</b> pop the first → both 2s get answer 3. With <code>≤</code>, the second 2 would pop the first and give it answer <span class="c-r">2</span> — wrong for "strictly greater". Rule of thumb: the comparison in the <code>while</code> is the <b>opposite</b> of the answer condition. "Next strictly greater" → pop while <code>&lt;</code>. "Next greater-or-equal" → pop while <code>≤</code>.</p>`
      },
      {
        title: 'Circular array: [1, 2, 1]',
        html: `${H.table(['i', 'i % n', 'value', 'action', 'res'], [
          ['0', '0', '1', 'push 0', '[-1,-1,-1]'], ['1', '1', '2', 'pop 0 → res[0]=2, push 1', '[2,-1,-1]'], ['2', '2', '1', 'push 2', '[2,-1,-1]'],
          ['3', '0', '1', '1 is not &gt; 1, no push (2nd lap)', '[2,-1,-1]'], ['4', '1', '2', 'pop 2 → res[2]=2', '<span class="c-g">[2,-1,2]</span>'], ['5', '2', '1', 'nothing', '[2,-1,2]']
        ])}<p>The last element found its answer by "wrapping around" to the start. The maximum (2) stays -1.</p>`
      },
      {
        title: 'Next Greater Element I (two arrays + HashMap)',
        html: `<p><code>nums1 = [4, 1, 2]</code> is a subset of <code>nums2 = [1, 3, 4, 2]</code>. Run the monotonic stack once on <code>nums2</code> and store <code>value → next greater</code> in a <code>HashMap</code>: {1→3, 3→4, 4→-1, 2→-1}. Then each query is an O(1) lookup → answers <code>[-1, 3, -1]</code>. Total O(N + M) instead of O(N·M).</p>`
      }
    ],
    deepDive: `<p><b>The amortized argument, precisely.</b> The inner <code>while</code> can pop many items in one iteration, so a single step can be O(N). But define the potential Φ = stack size. Each iteration does 1 push (+1) and k pops (−k) with actual cost 1 + k, so amortized cost = (1 + k) + (1 − k) = 2. Over N steps the total is ≤ 2N → <b>O(N)</b>. This is the same "each element enters once, leaves once" argument used for the two-pointer and deque techniques.</p>
      <p><b>Why the stack is monotonic.</b> Invariant: the stack holds exactly the indices that have not yet found their next greater element. If index j sits above index i on the stack (j &gt; i) and a[j] &gt; a[i], then j would have popped i when it arrived. So values must be non-increasing from bottom to top. The invariant also gives correctness: when x pops i, x is the <b>first</b> greater element after i, because every element between i and x was ≤ a[i] (otherwise it would have popped i earlier).</p>
      <p><b>Both answers in one pass.</b> When x pops i, x is the next greater of i; at the same moment, after popping, the new top is the previous greater-or-equal of x. Many solutions (sum of subarray minimums, largest rectangle) collect left and right boundaries in a single scan this way.</p>
      <p><b>Right-to-left variant.</b> Scanning from the right, keep candidates for "next greater": pop everything ≤ a[i] (they are hidden behind a[i]), then the top is the answer for i, then push i. Same O(N), sometimes easier to reason about because the answer is read immediately.</p>
      <p><b>Performance:</b> with N = 10<sup>6</sup>, using an <code>int[]</code> as the stack instead of <code>ArrayDeque&lt;Integer&gt;</code> avoids a million boxed objects and is typically 3–5× faster in Java. The same idea elsewhere: a <code>vector&lt;int&gt;</code> in C++, an <code>Int32Array</code> with a top index in JS. In Python a plain <code>list</code> is already the fastest stack.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants recognise "next greater element" instantly and produce the monotonic stack. The interview signal has moved to <b>pattern transfer</b>: can you see that "days until warmer", "car fleets", "visible people in a queue", "remove K digits" and "132 pattern" are all the same tool in disguise, and pick the right pop condition and stack order?</p>
      <p><b>Use AI as a partner:</b> <code>"Give me 5 problems that secretly reduce to previous-smaller-element, without naming the technique"</code> — then practise spotting it. Or <code>"Explain the potential-function proof that this loop is O(N)"</code> to prepare for the "isn't that O(N²)?" follow-up.</p>
      <p><b>Where AI goes wrong:</b> mixing up strict and non-strict comparisons (wrong answers on duplicates), storing values when distances are needed, forgetting the second lap for circular arrays, or claiming O(N²) because of the nested loop. Test duplicates and strictly increasing/decreasing arrays first.</p>
      <p><b>What you must still own:</b> the four-sibling table (next/previous × greater/smaller), the invariant, and the amortized O(N) explanation in your own words.</p>`,
    viz: {
      title: 'Next Greater Element with a monotonic stack',
      input: '4 5 2 10 8 3 9',
      inputLabel: 'Array (space separated, up to 12)',
      gen: function (input) {
        var a = parseNums(input, '4 5 2 10 8 3 9', 12, 2);
        var n = a.length, ans = a.map(function () { return '?'; }), st = [], frames = [];
        function stItems() { return st.map(function (k) { return 'i' + k + ' (' + a[k] + ')'; }); }
        frames.push({ narr: 'Stack = indices still <b>waiting</b> for a taller number to their right. Answers start as "?".', parts: [
          { type: 'array', label: 'a', values: a }, { type: 'stack', label: 'waiting indices', items: [] }, { type: 'array', label: 'NGE answer', values: ans.slice() }
        ] });
        for (var i = 0; i < n; i++) {
          var popped = [];
          if (st.length && a[st[st.length - 1]] < a[i]) {
            var hlS = {}, j = st.length - 1;
            while (j >= 0 && a[st[j]] < a[i]) { hlS[j] = 'bad'; popped.push(st[j]); j--; }
            frames.push({ narr: '<b>' + a[i] + '</b> arrives. It is taller than the waiting ' + popped.map(function (k) { return a[k]; }).join(', ') + ' → they <span class="c-r">pop</span> and their next greater is ' + a[i] + '.', parts: [
              { type: 'array', label: 'a', values: a, hl: one(i, 'cur'), ptr: one(i, 'i') },
              { type: 'stack', label: 'waiting indices', items: stItems(), hl: hlS },
              { type: 'array', label: 'NGE answer', values: ans.slice() }
            ] });
            var hlAns = {};
            popped.forEach(function (k) { ans[k] = a[i]; hlAns[k] = 'ok'; });
            st.length = j + 1;
            frames.push({ narr: 'Answers filled: ' + popped.map(function (k) { return 'NGE[' + k + '] = ' + a[i]; }).join(', ') + '. Stopped because ' + (st.length ? 'top ' + a[st[st.length - 1]] + ' is not smaller than ' + a[i] : 'the stack is empty') + '.', parts: [
              { type: 'array', label: 'a', values: a, hl: one(i, 'cur'), ptr: one(i, 'i') },
              { type: 'stack', label: 'waiting indices', items: stItems() },
              { type: 'array', label: 'NGE answer', values: ans.slice(), hl: hlAns }
            ] });
          }
          st.push(i);
          frames.push({ narr: (popped.length ? '' : '<b>' + a[i] + '</b> is not taller than the top, nobody gets answered. ') + '<span class="c-g">Push index ' + i + '</span>: now ' + a[i] + ' waits for its own taller number. Stack values stay decreasing.', parts: [
            { type: 'array', label: 'a', values: a, hl: one(i, 'cur'), ptr: one(i, 'i') },
            { type: 'stack', label: 'waiting indices', items: stItems(), hl: one(st.length - 1, 'ok') },
            { type: 'array', label: 'NGE answer', values: ans.slice() }
          ] });
        }
        var hlEnd = {};
        st.forEach(function (k) { ans[k] = -1; hlEnd[k] = 'sel'; });
        frames.push({ narr: 'End of array. Whoever is still waiting has <b>no taller number</b> to the right → answer <b>-1</b>. Each index was pushed once and popped at most once → O(N).', parts: [
          { type: 'array', label: 'a', values: a },
          { type: 'stack', label: 'never answered', items: stItems() },
          { type: 'array', label: 'NGE answer', values: ans.slice(), hl: hlEnd }
        ] });
        return frames;
      }
    },
    after: `<p><b>Circular version</b> (LeetCode 503): the array wraps around. Loop <code>i</code> from <code>0</code> to <code>2n-1</code>, use <code>a[i % n]</code>, and only push when <code>i &lt; n</code>. The second lap lets the elements at the end find a greater element at the start.</p>`,
    problems: [{
      title: 'Next Greater Element',
      level: 'Medium',
      tags: ['monotonic stack', 'array'],
      statement: `<p>Given an integer array <code>a</code> of size <code>N</code>, for every element find the <b>first element to its right that is strictly greater</b>. If none exists, the answer is <code>-1</code>. Return the answers as an array.</p>`,
      constraints: `1 ≤ N ≤ 10<sup>5</sup>, -10<sup>9</sup> ≤ a[i] ≤ 10<sup>9</sup>`,
      example: `${H.arr([4, 5, 2, 10, 8], { label: 'a' })}${H.arr([5, 10, 10, -1, -1], { label: 'out', hl: { 0: 'g', 1: 'g', 2: 'g', 3: 'r', 4: 'r' } })}
        <p>4 → ${H.c('g', '5')} (right next to it). 5 → skip 2, ${H.c('g', '10')}. 2 → ${H.c('g', '10')}. 10 and 8 → nothing bigger on their right → ${H.c('r', '-1')}.</p>`,
      brute: {
        why: `<p>For each <code>i</code>, walk right until a bigger number appears. For a decreasing array like <code>9 8 7 ... 1</code> every walk goes to the end → N<sup>2</sup>/2 ≈ 5·10<sup>9</sup> steps for N = 10<sup>5</sup>. The waste: the same small numbers are re-scanned by every element to their left.</p>`,
        code: `
int[] nextGreaterBrute(int[] a) {
    int n = a.length;
    int[] ans = new int[n];
    for (int i = 0; i < n; i++) {
        ans[i] = -1;
        for (int j = i + 1; j < n; j++) {
            if (a[j] > a[i]) { ans[i] = a[j]; break; }   // first bigger one to the right
        }
    }
    return ans;
}`
      },
      mcq: {
        q: 'The waiting stack (values, bottom→top) is <code>9, 6, 4</code>. Next number is <code>7</code>. What happens?',
        options: ['Only 4 is popped, answer 7; then push 7 → <code>9, 6, 7</code>', '4 and 6 are popped with answer 7; then push 7 → <code>9, 7</code>', 'All three are popped', 'Nothing is popped because 9 &gt; 7'],
        answer: 1,
        explain: 'Pop while the top is smaller than 7: 4 &lt; 7 pop, 6 &lt; 7 pop, 9 &gt; 7 stop. Push 7. The stack stays decreasing: 9, 7.'
      },
      hints: [
        `<p>Aha: if a number <code>x</code> arrives and is bigger than some earlier waiting numbers, <code>x</code> is the answer for <b>all</b> of them at once — they are finished and can leave. Whoever is still waiting must be at least as big as everything that came after them, so the waiting numbers always form a <b>decreasing</b> sequence.</p>`,
        `<p>Use a stack of <b>indices</b>. For each <code>i</code>: while the stack is not empty and <code>a[top] &lt; a[i]</code> → pop the top and set <code>ans[top] = a[i]</code>. Then push <code>i</code>.</p>`,
        `<p>Traps: fill <code>ans</code> with <code>-1</code> first (leftovers never get popped); "strictly greater" means use <code>&lt;</code> in the while, so equal values keep waiting; store indices, not values, so you know <i>where</i> to write. Recipe: ans = all -1; for i in 0..n-1: pop smaller tops and give them a[i]; push i.</p>`
      ],
      tests: { sig: "int[] -> int[]", fn: "nextGreater", cases: [
        [[[4,5,2,10,8]],[5,10,10,-1,-1]],
        [[[5]],[-1]],
        [[[2,2,2]],[-1,-1,-1]],
        [[[2,2,3]],[3,3,-1]],
        [[[1,2,3,4]],[2,3,4,-1]],
        [[[4,3,2,1]],[-1,-1,-1,-1]],
        [[[-1000000000,1000000000,-5,0,-5]],[1000000000,-1,0,-1,-1]],
        [[[6,8,0,1,3]],[8,-1,1,3,-1]],
        [[{"$range":[100000,0,-1]}],{"$rep":-1,"n":100000}]
      ] },
      solution: {
        approach: `<p>Left-to-right scan with a decreasing stack of indices still waiting for an answer.</p>`,
        code: `
import java.util.*;

class Solution {
    public int[] nextGreater(int[] a) {
        int n = a.length;
        int[] ans = new int[n];
        Arrays.fill(ans, -1);                         // default: no greater element
        Deque<Integer> st = new ArrayDeque<>();       // indices waiting, values decreasing
        for (int i = 0; i < n; i++) {
            // a[i] answers every waiting element that is smaller than it
            while (!st.isEmpty() && a[st.peek()] < a[i]) {
                ans[st.pop()] = a[i];
            }
            st.push(i);                               // now a[i] waits for its own answer
        }
        return ans;                                   // indices left in the stack keep -1
    }

    public static void main(String[] args) {
        System.out.println(Arrays.toString(new Solution().nextGreater(new int[]{4, 5, 2, 10, 8})));
        // [5, 10, 10, -1, -1]
    }
}`,
        dry: {
          head: ['i', 'a[i]', 'popped (gets answer a[i])', 'stack after (indices: values)', 'ans'],
          rows: [
            ['0', '4', '—', '0:4', '[-1,-1,-1,-1,-1]'],
            ['1', '5', '<span class="c-r">0:4</span> → ans[0]=5', '1:5', '[<span class="c-g">5</span>,-1,-1,-1,-1]'],
            ['2', '2', '— (2 &lt; 5)', '1:5, 2:2', '[5,-1,-1,-1,-1]'],
            ['3', '10', '<span class="c-r">2:2, 1:5</span> → ans[2]=10, ans[1]=10', '3:10', '[5,<span class="c-g">10</span>,<span class="c-g">10</span>,-1,-1]'],
            ['4', '8', '— (8 &lt; 10)', '3:10, 4:8', '[5,10,10,-1,-1]'],
            ['end', '—', 'indices 3, 4 stay → -1', '3:10, 4:8', '<span class="c-p">[5,10,10,-1,-1]</span>']
          ]
        },
        alt: [{ lang: 'python', code: `class Solution:
    def next_greater(self, a: list[int]) -> list[int]:
        ans = [-1] * len(a)                 # default: no greater element
        st = []                             # indices waiting, values decreasing
        for i, x in enumerate(a):
            while st and a[st[-1]] < x:     # x answers every smaller waiting element
                ans[st.pop()] = x
            st.append(i)                    # now x waits for its own answer
        return ans` }, { lang: 'js', code: `function nextGreater(a) {
  const ans = new Array(a.length).fill(-1);   // default: no greater element
  const st = [];                              // indices waiting, values decreasing
  for (let i = 0; i < a.length; i++) {
    while (st.length && a[st[st.length - 1]] < a[i]) {
      ans[st.pop()] = a[i];                   // a[i] answers every smaller waiting element
    }
    st.push(i);                               // now a[i] waits for its own answer
  }
  return ans;
}` }, { lang: 'cpp', code: `class Solution {
public:
    vector<int> nextGreater(const vector<int>& a) {
        int n = a.size();
        vector<int> ans(n, -1);                  // default: no greater element
        vector<int> st;                          // indices waiting, values decreasing
        for (int i = 0; i < n; i++) {
            while (!st.empty() && a[st.back()] < a[i]) {
                ans[st.back()] = a[i];           // a[i] answers every smaller waiting element
                st.pop_back();
            }
            st.push_back(i);                     // now a[i] waits for its own answer
        }
        return ans;
    }
};` }],
        complexity: `<p><b>Time O(N)</b>: every index is pushed once and popped at most once, so the inner while runs at most N times <i>in total</i> (≈ 2N operations). <b>Space O(N)</b>: the stack (e.g. a fully decreasing array keeps everyone waiting) plus the answer array.</p>`
      }
    }]
  });

  // =====================================================================
  // TOPIC 6 — Stock Span (previous greater element)
  // =====================================================================
  topics.push({
    title: 'Monotonic Stack — Stock Span (previous greater)',
    analogy: `<p>You are standing in a line facing <b>left</b> (towards the people who came before you). You count how many people in a row, starting with yourself, are <b>not taller than you</b> — you stop counting at the first person who is <b>taller</b>. That count is your "span".</p>
      <p>A stock trader asks the same thing: "for how many days in a row, up to today, has the price been ≤ today's price?"</p>`,
    explain: `<p>Span of day <code>i</code> = distance back to the <b>previous strictly greater</b> price: <code>span[i] = i - prevGreaterIndex</code> (use <code>-1</code> when there is none, so span = <code>i + 1</code>).</p>
      ${H.arr([100, 80, 60, 70, 60, 75, 85], { label: 'price', hl: { 5: 'y', 1: 'p', 2: 'b', 3: 'b', 4: 'b' } })}
      ${H.arr([1, 1, 1, 2, 1, 4, 6], { label: 'span', hl: { 5: 'y' } })}
      <p>Day 5 (price ${H.c('y', '75')}): looking left, ${H.c('b', '60, 70, 60')} are all ≤ 75, then ${H.c('p', '80')} is taller → span = 5 - 1 = <b>4</b> (days 2, 3, 4, 5).</p>
      <p>Same monotonic-stack idea, but this time the answer is the <b>top that survives</b> after popping: pop every index whose price is <code>≤ price[i]</code> (they are hidden behind today's taller price forever), then the top is the previous greater. Stack values stay <b>strictly decreasing</b>.</p>
      ${H.table(['i', 'price', 'popped (≤ price)', 'previous greater', 'span'], [
        ['0', '100', '—', 'none (-1)', '0-(-1) = 1'], ['1', '80', '—', '0 (100)', '1'], ['2', '60', '—', '1 (80)', '1'],
        ['3', '70', '60', '1 (80)', '2'], ['4', '60', '—', '3 (70)', '1'], ['5', '75', '60, 70', '1 (80)', '<span class="c-y">4</span>'], ['6', '85', '75, 80', '0 (100)', '6']
      ])}`,
    clues: [
      '"How many consecutive days before today (including today) the price was ≤ today\'s price" → stock span.',
      '"<b>Nearest to the left</b> that is greater" / "previous greater element" → pop smaller-or-equal, read the top.',
      '"Online" / "called one day at a time" (StockSpanner) → stack of <code>(price, span)</code> pairs; a big span absorbs the small ones.',
      '"Number of visible people", "how far back can I see" → same left-looking stack.'
    ],
    examples: [
      {
        title: 'Strictly increasing prices: spans 1, 2, 3, 4',
        html: `${H.arr([10, 20, 30, 40], { label: 'price' })}${H.arr([1, 2, 3, 4], { label: 'span', hl: { 3: 'g' } })}
          <p>Every new day is taller than everything before it, so it <span class="c-r">pops the whole stack</span> and finds no previous greater (index -1): span = i + 1. The stack never holds more than one element — yet the total work is still 2N.</p>`
      },
      {
        title: 'Strictly decreasing prices: every span is 1',
        html: `${H.arr([90, 70, 50, 30], { label: 'price' })}${H.arr([1, 1, 1, 1], { label: 'span' })}
          <p>Nobody is ever popped: each previous day is taller, so the previous greater is just <code>i - 1</code>. The stack grows to N — this is the worst case for <b>space</b>, O(N).</p>`
      },
      {
        title: 'Online StockSpanner: absorbing spans',
        html: `<p>Calls: next(100), next(80), next(60), next(70), next(60), next(75), next(85).</p>
          ${H.table(['price', 'popped pairs (price, span)', 'span = 1 + popped spans', 'stack after'], [
            ['100', '—', '1', '(100,1)'], ['80', '—', '1', '(100,1) (80,1)'], ['60', '—', '1', '… (60,1)'],
            ['70', '(60,1)', '1 + 1 = 2', '(100,1) (80,1) (70,2)'], ['60', '—', '1', '… (70,2) (60,1)'],
            ['75', '(60,1) (70,2)', '1 + 1 + 2 = <b>4</b>', '(100,1) (80,1) (75,4)'],
            ['85', '(75,4) (80,1)', '1 + 4 + 1 = <b>6</b>', '(100,1) (85,6)']
          ])}<p>No indices needed: each popped pair carries the number of days it had already "swallowed".</p>`
      },
      {
        title: 'Same tool, new story: "visible people to the left"',
        html: `<p>"For each building, how many consecutive buildings to its left are not taller?" is span − 1. "Index of the nearest taller building on the left" is the previous-greater index itself. When a problem says <i>look back until something bigger blocks you</i>, reach for this stack.</p>`
      }
    ],
    deepDive: `<p><b>Previous greater = what survives.</b> In Next Greater (Topic 5), the answer was given to the <b>popped</b> elements. In Stock Span, the answer is the <b>survivor</b> on top after popping. Both views happen in the same loop; recognising which one the question needs is the whole skill.</p>
      <p><b>Why ≤ (pop equal prices).</b> The span counts days with price <b>≤</b> today, so an equal earlier price is inside the span and cannot be the blocker. Popping equals also keeps the stack <b>strictly</b> decreasing, which bounds the stack size by the number of distinct "record highs from the right".</p>
      <p><b>Online amortized cost.</b> For the <code>StockSpanner</code> class, each call is amortized O(1): every price is pushed once and popped at most once over the lifetime of the object. A single call can still take O(N) (e.g. a new all-time high after N decreasing prices) — mention this if asked about latency guarantees (p99 vs average).</p>
      <p><b>Memory in streaming systems.</b> The stack only keeps prices that are still potential blockers (a strictly decreasing staircase). For real price streams that rise over time, it stays small. For adversarial decreasing streams it grows linearly; a production system would cap history (e.g. only the last 365 days) and then you need a deque that can also drop old items from the bottom — exactly the monotonic deque of Topic 9.</p>
      <p><b>Overflow:</b> spans are at most N ≤ 10<sup>5</sup>, so <code>int</code> is safe; prices are only compared, never added.</p>`,
    aiEra: `<p><b>What AI changes:</b> "stock span" is a textbook classic; AI tools solve it instantly. Interviewers therefore like the <b>online</b> form (no array, one call at a time) and ask for the amortized vs worst-case latency discussion — reasoning that has to come from you.</p>
      <p><b>Use AI as a partner:</b> ask it to <code>"generate a stream of 10^5 prices that makes a single next() call as slow as possible"</code> and measure; or <code>"rewrite my StockSpanner with a fixed int[] stack and compare speed"</code>.</p>
      <p><b>Where AI goes wrong:</b> using <code>&lt;</code> instead of <code>≤</code> (equal prices break the span), returning <code>1</code> instead of <code>i + 1</code> when the stack is empty, or storing only prices in the online version and losing the absorbed counts.</p>
      <p><b>What you must still own:</b> recognising "look left until blocked by something taller" in disguised wording and choosing between storing indices (offline array) and (price, span) pairs (online stream).</p>`,
    viz: {
      title: 'Stock span: popping smaller prices',
      input: '100 80 60 70 60 75 85',
      inputLabel: 'Prices (space separated, up to 12)',
      gen: function (input) {
        var p = parseNums(input, '100 80 60 70 60 75 85', 12, 2);
        var n = p.length, span = p.map(function () { return '?'; }), st = [], frames = [];
        function items() { return st.map(function (k) { return 'day ' + k + ' (' + p[k] + ')'; }); }
        frames.push({ narr: 'Stack = earlier days that are still "visible" (taller than everything after them). Their prices are decreasing.', parts: [
          { type: 'bars', label: 'price', values: p }, { type: 'stack', label: 'candidate previous-greater days', items: [] }, { type: 'array', label: 'span', values: span.slice() }
        ] });
        for (var i = 0; i < n; i++) {
          var j = st.length - 1, hlS = {}, popped = [];
          while (j >= 0 && p[st[j]] <= p[i]) { hlS[j] = 'bad'; popped.push(st[j]); j--; }
          if (popped.length) {
            var hb = {};
            popped.forEach(function (k) { hb[k] = 'bad'; });
            hb[i] = 'cur';
            frames.push({ narr: 'Day ' + i + ' price <b>' + p[i] + '</b>. The days with price ' + popped.map(function (k) { return p[k]; }).join(', ') + ' are ≤ ' + p[i] + ' → <span class="c-r">pop</span>. They are hidden behind today forever.', parts: [
              { type: 'bars', label: 'price', values: p, hl: hb, ptr: one(i, 'i') },
              { type: 'stack', label: 'candidate previous-greater days', items: items(), hl: hlS },
              { type: 'array', label: 'span', values: span.slice() }
            ] });
          }
          st.length = j + 1;
          var prev = st.length ? st[st.length - 1] : -1;
          span[i] = i - prev;
          var hb2 = {}, k2;
          for (k2 = prev + 1; k2 < i; k2++) hb2[k2] = 'win';
          hb2[i] = 'cur';
          if (prev >= 0) hb2[prev] = 'sel';
          st.push(i);
          frames.push({ narr: (prev >= 0 ? 'Top is day ' + prev + ' (price ' + p[prev] + ') — the previous greater. ' : 'Stack empty — nobody earlier is taller. ') + 'span = ' + i + ' - (' + prev + ') = <b>' + span[i] + '</b>. <span class="c-g">Push day ' + i + '</span>.', parts: [
            { type: 'bars', label: 'price', values: p, hl: hb2, ptr: one(i, 'i') },
            { type: 'stack', label: 'candidate previous-greater days', items: items(), hl: one(st.length - 1, 'ok') },
            { type: 'array', label: 'span', values: span.slice(), hl: one(i, 'ok') }
          ] });
        }
        frames.push({ narr: 'All spans found in one pass. Every day was pushed once and popped at most once → O(N).', parts: [
          { type: 'bars', label: 'price', values: p }, { type: 'array', label: 'span', values: span.slice(), hl: (function () { var h = {}; for (var q = 0; q < n; q++) h[q] = 'sel'; return h; })() }
        ] });
        return frames;
      }
    },
    after: `<p><b>Online version</b> (LeetCode 901 — <code>StockSpanner.next(price)</code>, prices arrive one per call, no array): store pairs <code>(price, span)</code>. On a new price, pop every pair with price ≤ today and <b>add their spans</b> to today's span (they already "swallowed" the days behind them).</p>`,
    code: { lang: 'java', code: `
import java.util.*;

class StockSpanner {
    private final Deque<int[]> st = new ArrayDeque<>();   // {price, span}, prices strictly decreasing

    public int next(int price) {
        int span = 1;                                      // today counts
        while (!st.isEmpty() && st.peek()[0] <= price) {
            span += st.pop()[1];                           // absorb the days that day already covered
        }
        st.push(new int[]{price, span});
        return span;
    }

    public static void main(String[] args) {
        StockSpanner s = new StockSpanner();
        int[] prices = {100, 80, 60, 70, 60, 75, 85};
        for (int p : prices) System.out.print(s.next(p) + " ");   // 1 1 1 2 1 4 6
    }
}`,
      alt: [{ lang: 'python', run: true, code: `class StockSpanner:
    def __init__(self):
        self.st = []                          # (price, span), prices strictly decreasing

    def next(self, price: int) -> int:
        span = 1                              # today counts
        while self.st and self.st[-1][0] <= price:
            span += self.st.pop()[1]          # absorb the days that day already covered
        self.st.append((price, span))
        return span


s = StockSpanner()
print(*(s.next(p) for p in [100, 80, 60, 70, 60, 75, 85]))   # 1 1 1 2 1 4 6` }, { lang: 'js', run: true, code: `class StockSpanner {
  constructor() { this.st = []; }             // [price, span], prices strictly decreasing

  next(price) {
    let span = 1;                             // today counts
    while (this.st.length && this.st[this.st.length - 1][0] <= price) {
      span += this.st.pop()[1];               // absorb the days that day already covered
    }
    this.st.push([price, span]);
    return span;
  }
}

const s = new StockSpanner();
console.log([100, 80, 60, 70, 60, 75, 85].map((p) => s.next(p)).join(' '));   // 1 1 1 2 1 4 6` }, { lang: 'cpp', code: `class StockSpanner {
    vector<pair<int, int>> st;                // {price, span}, prices strictly decreasing
public:
    int next(int price) {
        int span = 1;                         // today counts
        while (!st.empty() && st.back().first <= price) {
            span += st.back().second;         // absorb the days that day already covered
            st.pop_back();
        }
        st.push_back({price, span});
        return span;
    }
};

int main() {
    StockSpanner s;
    for (int p : {100, 80, 60, 70, 60, 75, 85}) cout << s.next(p) << " ";   // 1 1 1 2 1 4 6
    cout << "\\n";
}` }] },
    codeTitle: 'Online StockSpanner (LeetCode 901)',
    problems: [{
      title: 'Stock Span Problem',
      level: 'Medium',
      tags: ['monotonic stack', 'previous greater'],
      statement: `<p>Given daily stock prices <code>price[0..N-1]</code>, the <b>span</b> of day <code>i</code> is the number of consecutive days ending at day <code>i</code> (including day <code>i</code>) on which the price was <b>less than or equal to</b> <code>price[i]</code>. Return the span of every day.</p>`,
      constraints: `1 ≤ N ≤ 10<sup>5</sup>, 1 ≤ price[i] ≤ 10<sup>9</sup>`,
      example: `${H.arr([100, 80, 60, 70, 60, 75, 85], { label: 'price', hl: { 6: 'y' } })}${H.arr([1, 1, 1, 2, 1, 4, 6], { label: 'span', hl: { 6: 'g' } })}
        <p>Day 6 price ${H.c('y', '85')}: days 1..6 (80, 60, 70, 60, 75, 85) are all ≤ 85, and day 0 (100) is taller → span ${H.c('g', '6')}.</p>`,
      brute: {
        why: `<p>For each day walk left while the price is ≤ today. For an increasing price list (1, 2, 3, ...) day <code>i</code> walks all the way back → 1 + 2 + ... + N ≈ N<sup>2</sup>/2 steps. The waste: once a big day has "covered" a stretch, later days re-walk that same stretch one day at a time.</p>`,
        code: `
int[] spanBrute(int[] price) {
    int n = price.length;
    int[] span = new int[n];
    for (int i = 0; i < n; i++) {
        int j = i;
        while (j >= 0 && price[j] <= price[i]) j--;   // walk left until a taller price
        span[i] = i - j;
    }
    return span;
}`
      },
      mcq: {
        q: 'Stack of (index: price) bottom→top is <code>0:100, 1:80, 3:70</code>. Day 4 has price 75. What is span[4]?',
        options: ['1', '2', '3', '5'],
        answer: 2,
        explain: 'Pop 3:70 (70 ≤ 75). Top is now 1:80 &gt; 75 → previous greater is index 1. span = 4 - 1 = 3.'
      },
      hints: [
        `<p>Aha: the span stops at the first <b>taller</b> day to the left, so <code>span[i] = i - (index of previous greater)</code>. If no taller day exists, use index <code>-1</code>.</p>`,
        `<p>Keep a stack of indices with <b>strictly decreasing</b> prices. For day <code>i</code>: pop while <code>price[top] ≤ price[i]</code>; then the top (if any) is the previous greater. Push <code>i</code>.</p>`,
        `<p>Traps: use <code>≤</code> (equal prices are included in the span, so they must be popped); empty stack → span is <code>i + 1</code>, not 1. Recipe: for i: pop smaller-or-equal; prev = empty ? -1 : peek; span[i] = i - prev; push i.</p>`
      ],
      tests: { sig: "int[] -> int[]", fn: "calculateSpan", cases: [
        [[[100,80,60,70,60,75,85]],[1,1,1,2,1,4,6]],
        [[[7]],[1]],
        [[[10,20,30,40]],[1,2,3,4]],
        [[[90,70,50,30]],[1,1,1,1]],
        [[[5,5,5,5]],[1,2,3,4]],
        [[[1000000000,1,1000000000]],[1,1,3]],
        [[[3,1,2,1,3]],[1,1,2,1,5]],
        [[{"$range":[1,100001,1]}],{"$range":[1,100001,1]}]
      ] },
      solution: {
        approach: `<p>Previous-greater-element with a strictly decreasing stack of indices.</p>`,
        code: `
import java.util.*;

class Solution {
    public int[] calculateSpan(int[] price) {
        int n = price.length;
        int[] span = new int[n];
        Deque<Integer> st = new ArrayDeque<>();        // indices, prices strictly decreasing
        for (int i = 0; i < n; i++) {
            // days with price <= today are inside today's span and can never block a later day
            while (!st.isEmpty() && price[st.peek()] <= price[i]) {
                st.pop();
            }
            int prevGreater = st.isEmpty() ? -1 : st.peek();   // first taller day on the left
            span[i] = i - prevGreater;
            st.push(i);
        }
        return span;
    }

    public static void main(String[] args) {
        int[] p = {100, 80, 60, 70, 60, 75, 85};
        System.out.println(Arrays.toString(new Solution().calculateSpan(p)));   // [1, 1, 1, 2, 1, 4, 6]
    }
}`,
        dry: {
          head: ['i', 'price', 'popped', 'prevGreater', 'span', 'stack after (i:price)'],
          rows: [
            ['0', '100', '—', '-1', '1', '0:100'],
            ['1', '80', '—', '0', '1', '0:100, 1:80'],
            ['2', '60', '—', '1', '1', '0:100, 1:80, 2:60'],
            ['3', '70', '<span class="c-r">2:60</span>', '1', '2', '0:100, 1:80, 3:70'],
            ['4', '60', '—', '3', '1', '0:100, 1:80, 3:70, 4:60'],
            ['5', '75', '<span class="c-r">4:60, 3:70</span>', '1', '<span class="c-g">4</span>', '0:100, 1:80, 5:75'],
            ['6', '85', '<span class="c-r">5:75, 1:80</span>', '0', '<span class="c-g">6</span>', '0:100, 6:85']
          ]
        },
        alt: [{ lang: 'python', code: `class Solution:
    def calculate_span(self, price: list[int]) -> list[int]:
        span = []
        st = []                                   # indices, prices strictly decreasing
        for i, p in enumerate(price):
            while st and price[st[-1]] <= p:      # inside today's span, can never block later
                st.pop()
            prev_greater = st[-1] if st else -1   # first taller day on the left
            span.append(i - prev_greater)
            st.append(i)
        return span` }, { lang: 'js', code: `function calculateSpan(price) {
  const span = new Array(price.length);
  const st = [];                                  // indices, prices strictly decreasing
  for (let i = 0; i < price.length; i++) {
    while (st.length && price[st[st.length - 1]] <= price[i]) st.pop();
    const prevGreater = st.length ? st[st.length - 1] : -1;   // first taller day on the left
    span[i] = i - prevGreater;
    st.push(i);
  }
  return span;
}` }, { lang: 'cpp', code: `class Solution {
public:
    vector<int> calculateSpan(const vector<int>& price) {
        int n = price.size();
        vector<int> span(n), st;                  // st: indices, prices strictly decreasing
        for (int i = 0; i < n; i++) {
            while (!st.empty() && price[st.back()] <= price[i]) st.pop_back();
            int prevGreater = st.empty() ? -1 : st.back();   // first taller day on the left
            span[i] = i - prevGreater;
            st.push_back(i);
        }
        return span;
    }
};` }],
        complexity: `<p><b>Time O(N)</b>: each day is pushed once and popped at most once, so all the while-loops together do at most N pops. <b>Space O(N)</b> for the stack (a strictly decreasing price list keeps every day on it).</p>`
      }
    }]
  });

  // =====================================================================
  // TOPIC 7 — Largest Rectangle in Histogram
  // =====================================================================
  topics.push({
    title: 'Monotonic Stack — Largest Rectangle in Histogram',
    analogy: `<p>A row of buildings of different heights stands side by side. You want to paint the <b>biggest rectangular banner</b> across them, and the banner can only be as tall as the <b>shortest</b> building it covers.</p>
      <p>Ask each building: "If the banner is exactly <b>my</b> height, how far can it stretch left and right?" It stretches until it hits a <b>shorter</b> building on each side. So we need, for every bar, the <b>nearest smaller bar on the left and on the right</b>.</p>`,
    explain: `<p>For bar <code>i</code>: <code>area = h[i] × (rightSmaller - leftSmaller - 1)</code>.</p>
      ${H.arr([2, 1, 5, 6, 2, 3], { label: 'h', hl: { 2: 'b', 3: 'b', 1: 'r', 4: 'r' } })}
      <p>For the bar of height 5 (index 2): nearest smaller on the left is ${H.c('r', 'index 1 (h=1)')}, on the right is ${H.c('r', 'index 4 (h=2)')}. Width = 4 - 1 - 1 = 2, area = 5 × 2 = ${H.c('p', '10')} — the answer.</p>
      <h4>One pass with an increasing stack</h4>
      <ul>
        <li>Keep indices whose heights are <b>increasing</b> from bottom to top.</li>
        <li>When bar <code>i</code> is <b>shorter or equal</b> to the top, the top bar can't stretch further right: its right boundary is <code>i</code>. Pop it; its left boundary is the <b>new top</b> (the nearest smaller on the left) or <code>-1</code> if the stack is empty. Width = <code>i - left - 1</code>.</li>
        <li>At the end, pretend there is an extra bar of height <b>0</b> at index <code>n</code>. It is shorter than everything, so it pops (and measures) every bar still on the stack.</li>
      </ul>
      ${H.table(['when popped', 'bar height', 'left (new top)', 'right (i)', 'width', 'area'], [
        ['i=1', '2', '-1', '1', '1', '2'], ['i=4', '6', '2', '4', '1', '6'], ['i=4', '5', '1', '4', '2', '<span class="c-p">10</span>'],
        ['i=6 (end)', '3', '4', '6', '1', '3'], ['i=6 (end)', '2', '1', '6', '4', '8'], ['i=6 (end)', '1', '-1', '6', '6', '6']
      ])}`,
    clues: [
      '"<b>Largest rectangle</b> in a histogram", "max area under bars of width 1".',
      '"For each element, the largest window where it is the <b>minimum</b>" → nearest smaller on both sides.',
      '"Maximal rectangle of 1s in a binary matrix" → build a histogram per row, then this algorithm.',
      '"Sum of subarray minimums", "max of (min × length)" → same left/right smaller boundaries.',
      '<code>N ≤ 10<sup>5</sup></code> and O(N<sup>2</sup>) expand-from-each-bar is too slow → monotonic stack O(N).'
    ],
    code: { lang: 'java', code: `
import java.util.*;

class HistogramTwoPass {
    // Easier to explain version: compute both boundaries explicitly, then one formula.
    static long largestRectangle(int[] h) {
        int n = h.length;
        int[] left = new int[n], right = new int[n];
        Deque<Integer> st = new ArrayDeque<>();
        for (int i = 0; i < n; i++) {                     // previous strictly smaller
            while (!st.isEmpty() && h[st.peek()] >= h[i]) st.pop();
            left[i] = st.isEmpty() ? -1 : st.peek();
            st.push(i);
        }
        st.clear();
        for (int i = n - 1; i >= 0; i--) {                // next strictly smaller
            while (!st.isEmpty() && h[st.peek()] >= h[i]) st.pop();
            right[i] = st.isEmpty() ? n : st.peek();
            st.push(i);
        }
        long best = 0;
        for (int i = 0; i < n; i++) {
            best = Math.max(best, (long) h[i] * (right[i] - left[i] - 1));   // long: no overflow
        }
        return best;
    }

    public static void main(String[] args) {
        System.out.println(largestRectangle(new int[]{2, 1, 5, 6, 2, 3}));   // 10
        System.out.println(largestRectangle(new int[]{2, 4}));               // 4
    }
}`,
      alt: [{ lang: 'python', run: true, code: `def largest_rectangle(h: list[int]) -> int:
    """Easier to explain version: compute both boundaries explicitly, then one formula."""
    n = len(h)
    left, right, st = [-1] * n, [n] * n, []
    for i in range(n):                       # previous strictly smaller
        while st and h[st[-1]] >= h[i]:
            st.pop()
        if st:
            left[i] = st[-1]
        st.append(i)
    st = []
    for i in range(n - 1, -1, -1):           # next strictly smaller
        while st and h[st[-1]] >= h[i]:
            st.pop()
        if st:
            right[i] = st[-1]
        st.append(i)
    return max(h[i] * (right[i] - left[i] - 1) for i in range(n))


print(largest_rectangle([2, 1, 5, 6, 2, 3]))   # 10
print(largest_rectangle([2, 4]))               # 4` }, { lang: 'js', run: true, code: `// Easier to explain version: compute both boundaries explicitly, then one formula.
function largestRectangle(h) {
  const n = h.length, left = new Array(n).fill(-1), right = new Array(n).fill(n);
  let st = [];
  for (let i = 0; i < n; i++) {                       // previous strictly smaller
    while (st.length && h[st[st.length - 1]] >= h[i]) st.pop();
    if (st.length) left[i] = st[st.length - 1];
    st.push(i);
  }
  st = [];
  for (let i = n - 1; i >= 0; i--) {                  // next strictly smaller
    while (st.length && h[st[st.length - 1]] >= h[i]) st.pop();
    if (st.length) right[i] = st[st.length - 1];
    st.push(i);
  }
  let best = 0;
  for (let i = 0; i < n; i++) best = Math.max(best, h[i] * (right[i] - left[i] - 1));
  return best;
}

console.log(largestRectangle([2, 1, 5, 6, 2, 3]));   // 10
console.log(largestRectangle([2, 4]));               // 4` }, { lang: 'cpp', code: `// Easier to explain version: compute both boundaries explicitly, then one formula.
long long largestRectangle(const vector<int>& h) {
    int n = h.size();
    vector<int> left(n, -1), right(n, n), st;
    for (int i = 0; i < n; i++) {                     // previous strictly smaller
        while (!st.empty() && h[st.back()] >= h[i]) st.pop_back();
        if (!st.empty()) left[i] = st.back();
        st.push_back(i);
    }
    st.clear();
    for (int i = n - 1; i >= 0; i--) {                // next strictly smaller
        while (!st.empty() && h[st.back()] >= h[i]) st.pop_back();
        if (!st.empty()) right[i] = st.back();
        st.push_back(i);
    }
    long long best = 0;
    for (int i = 0; i < n; i++) best = max(best, 1LL * h[i] * (right[i] - left[i] - 1));   // 64-bit
    return best;
}

int main() {
    cout << largestRectangle({2, 1, 5, 6, 2, 3}) << "\\n";   // 10
    cout << largestRectangle({2, 4}) << "\\n";               // 4
}` }] },
    codeTitle: 'Two-pass version (left/right smaller arrays)',
    examples: [
      {
        title: 'Equal heights: [3, 3, 3]',
        html: `${H.arr([3, 3, 3], { label: 'h', hl: { 0: 'b', 1: 'b', 2: 'b' } })}
          <p>With the one-pass <code>≥</code> rule, bar 1 pops bar 0 (width 1, area 3) and bar 2 pops bar 1 (left = -1 now, width 2, area 6). The sentinel pops bar 2 with left = -1, width 3 → <b>9</b>. Earlier equal bars get an <i>underestimated</i> width, but the <b>last</b> equal bar always gets the full width — so the maximum is still correct.</p>`
      },
      {
        title: 'Increasing histogram [1, 2, 3, 4, 5]',
        html: `<p>Nothing is popped until the sentinel. Then, popping from the top: 5×1 = 5, 4×2 = 8, 3×3 = <b>9</b>, 2×4 = 8, 1×5 = 5. Answer <b>9</b>. Every bar's right wall is the end of the array.</p>
          ${H.table(['popped bar', 'height', 'left wall', 'width', 'area'], [['4', '5', '3', '1', '5'], ['3', '4', '2', '2', '8'], ['2', '3', '1', '3', '<span class="c-p">9</span>'], ['1', '2', '0', '4', '8'], ['0', '1', '-1', '5', '5']])}`
      },
      {
        title: 'Maximal Rectangle in a binary matrix',
        html: `<p>Treat each row as the ground of a histogram: <code>heights[c]</code> = number of consecutive 1s ending at this row in column c (reset to 0 on a 0). Run the histogram algorithm per row.</p>
          ${H.table(['row', 'matrix row', 'heights', 'best in row'], [
            ['0', '1 0 1 0 0', '1 0 1 0 0', '1'], ['1', '1 0 1 1 1', '2 0 2 1 1', '3'],
            ['2', '1 1 1 1 1', '3 1 3 2 2', '<span class="c-p">6</span>'], ['3', '1 0 0 1 0', '4 0 0 3 0', '4']
          ])}<p>Answer 6 (rows 1–2, columns 2–4). Total O(R·C).</p>`
      },
      {
        title: 'Zero-height bars split the histogram',
        html: `<p><code>[4, 0, 4]</code>: the 0 pops the first 4 (area 4) and blocks every rectangle from crossing it. The answer is <b>4</b>, not 8. The sentinel 0 at the end is just one more such wall.</p>`
      }
    ],
    deepDive: `<p><b>Why every candidate is checked.</b> The optimal rectangle has some shortest bar <code>m</code>. It cannot extend past the nearest strictly smaller bar on either side, and extending to them is always allowed. So the optimal area equals <code>h[m] × (right[m] − left[m] − 1)</code> for some m — checking all N bars covers it. The one-pass stack computes exactly these boundaries: <code>i</code> is the first bar ≤ on the right, the new top is the nearest strictly smaller on the left.</p>
      <p><b>The duplicates subtlety.</b> Popping on <code>≥</code> means an equal bar to the right is treated as a wall, which underestimates the width for earlier equal bars. That is fine: among a run of equal-height bars, the last one popped sees the whole run. If you pop on <code>&gt;</code> instead, equal bars stay on the stack and the earliest one gets the full width. Either choice is correct as long as one bar of each equal group measures the full width — a good point to make aloud.</p>
      <p><b>Overflow.</b> With heights up to 10<sup>4</sup> and N up to 10<sup>5</sup> the area fits in int (10<sup>9</sup> &lt; 2.1·10<sup>9</sup>), but with heights up to 10<sup>9</sup> you need <code>long</code> / <code>long long</code> (Python ints never overflow; JS numbers are exact up to 2<sup>53</sup>). Mention it before the interviewer does.</p>
      <p><b>Related problems using the same boundaries:</b> Maximal Rectangle (per-row histograms, O(R·C)); Sum of Subarray Minimums (each a[i] is the min of <code>(i − left) × (right − i)</code> subarrays — careful with duplicates: use strict on one side and non-strict on the other to avoid double counting); Maximum Score of a Good Subarray; Trapping Rain Water (stack-based variant pops a "valley" floor and measures water between its walls).</p>
      <p><b>Alternatives:</b> divide and conquer around the minimum (O(N log N) with a segment tree for range-min, O(N²) worst case without), or a sparse table. The stack is optimal: O(N) time, and you cannot do better since every bar must be read.</p>`,
    aiEra: `<p><b>What AI changes:</b> Largest Rectangle is a famous "hard" problem; an assistant writes the sentinel version in seconds. What it cannot do for you in the interview room is <b>explain</b> why the popped bar's left wall is the new top, why the sentinel is needed, and why duplicates do not break correctness. Those explanations are what the interviewer grades.</p>
      <p><b>Use AI as a partner:</b> <code>"Generate 1000 random histograms (length ≤ 8, heights ≤ 5) and compare my stack solution with the O(N²) brute force"</code> — small random tests are excellent at finding sentinel and duplicate bugs. Then ask <code>"Which of my variable names would confuse a reader?"</code>.</p>
      <p><b>Where AI goes wrong:</b> forgetting to flush the stack at the end (missing the increasing-histogram answer), using <code>i - top</code> as the width instead of <code>i - left - 1</code>, and int overflow when constraints are larger. Also, for Sum of Subarray Minimums it often uses strict comparisons on both sides and double counts duplicates.</p>
      <p><b>What you must still own:</b> the "each bar as the shortest bar" reformulation — once you see it, the stack is the natural tool.</p>`,
    viz: {
      title: 'Largest rectangle: bars + increasing stack',
      input: '2 1 5 6 2 3',
      inputLabel: 'Bar heights 0..30 (space separated, up to 12)',
      gen: function (input) {
        var h = parseNums(input, '2 1 5 6 2 3', 12, 2);
        if (h.some(function (x) { return x < 0 || x > 30; })) throw new Error('Heights must be between 0 and 30.');
        var n = h.length, hs = h.concat([0]), st = [], frames = [], best = 0, bestTxt = '—';
        var idxL = h.map(function (_, k) { return String(k); }).concat(['end']);
        function items() { return st.map(function (k) { return 'i' + k + ' (h=' + h[k] + ')'; }); }
        frames.push({ narr: 'The last bar labelled "end" is an imaginary bar of height 0 — it will flush the stack at the end. Stack heights will stay <b>increasing</b>.', parts: [
          { type: 'bars', label: 'heights', values: hs, idxLabels: idxL, hl: one(n, 'done') },
          { type: 'stack', label: 'indices (heights increasing)', items: [] },
          { type: 'vars', vals: { maxArea: 0 } }
        ] });
        for (var i = 0; i <= n; i++) {
          var cur = i === n ? 0 : h[i];
          while (st.length && h[st[st.length - 1]] >= cur) {
            var top = st[st.length - 1];
            var left = st.length > 1 ? st[st.length - 2] : -1;
            var w = i - left - 1, area = h[top] * w, hb = {}, k;
            for (k = left + 1; k < i; k++) hb[k] = 'win';
            hb[top] = 'bad'; hb[i] = 'cur';
            var improved = area > best;
            if (improved) { best = area; bestTxt = 'height ' + h[top] + ' × width ' + w; }
            frames.push({ narr: (i === n ? 'The imaginary 0-height bar' : 'Bar ' + i + ' (h=' + cur + ')') + ' is ≤ top bar ' + top + ' (h=' + h[top] + ') → <span class="c-r">pop ' + top + '</span>. Its right wall is ' + (i === n ? 'the end' : 'index ' + i) + ', its left wall is ' + (left >= 0 ? 'index ' + left + ' (the new top)' : 'nothing (stack empty → -1)') + '. Width = ' + i + ' - (' + left + ') - 1 = ' + w + ', area = ' + h[top] + ' × ' + w + ' = <b>' + area + '</b>' + (improved ? ' → <span class="c-g">new best!</span>' : '.'), parts: [
              { type: 'bars', label: 'heights (blue = rectangle of the popped bar)', values: hs, idxLabels: idxL, hl: hb, ptr: one(i, 'i') },
              { type: 'stack', label: 'indices (heights increasing)', items: items(), hl: one(st.length - 1, 'bad') },
              { type: 'vars', vals: { area: area, maxArea: best, best: bestTxt }, hl: improved ? { maxArea: 'ok' } : {} }
            ] });
            st.pop();
          }
          if (i < n) {
            st.push(i);
            frames.push({ narr: 'Push bar ' + i + ' (h=' + h[i] + '). It is taller than the top, so it can still stretch to the right — we don\'t know its right wall yet.', parts: [
              { type: 'bars', label: 'heights', values: hs, idxLabels: idxL, hl: one(i, 'ok'), ptr: one(i, 'i') },
              { type: 'stack', label: 'indices (heights increasing)', items: items(), hl: one(st.length - 1, 'ok') },
              { type: 'vars', vals: { maxArea: best, best: bestTxt } }
            ] });
          }
        }
        frames.push({ narr: 'Stack empty, every bar measured exactly once. Largest rectangle = <b>' + best + '</b> (' + bestTxt + ').', parts: [
          { type: 'bars', label: 'heights', values: h },
          { type: 'vars', vals: { maxArea: best, best: bestTxt }, hl: { maxArea: 'sel' } }
        ] });
        return frames;
      }
    },
    problems: [{
      title: 'Largest Rectangle in Histogram',
      level: 'Hard',
      tags: ['monotonic stack', 'nearest smaller'],
      statement: `<p>Given an array <code>heights</code> where <code>heights[i]</code> is the height of a bar of width 1, return the area of the <b>largest rectangle</b> that fits entirely inside the histogram.</p>`,
      constraints: `1 ≤ N ≤ 10<sup>5</sup>, 0 ≤ heights[i] ≤ 10<sup>4</sup>`,
      example: `${H.arr([2, 1, 5, 6, 2, 3], { label: 'heights', hl: { 2: 'b', 3: 'b' } })}
        <p>Output: ${H.c('p', '10')}. The rectangle covers ${H.c('b', 'bars 2 and 3')} (heights 5 and 6) at height 5: 5 × 2 = 10. Other candidates: height 2 across bars 2..5 → 2 × 4 = 8, height 1 across everything → 6.</p>`,
      brute: {
        why: `<p>For each bar, expand left and right while neighbours are ≥ it, then compute height × width. Each expansion can cover the whole array → <b>O(N<sup>2</sup>)</b> = 10<sup>10</sup> for N = 10<sup>5</sup>. The waste: neighbouring bars re-discover the same walls over and over.</p>`,
        code: `
int largestRectangleBrute(int[] h) {
    int n = h.length, best = 0;
    for (int i = 0; i < n; i++) {
        int l = i, r = i;
        while (l - 1 >= 0 && h[l - 1] >= h[i]) l--;   // stretch left
        while (r + 1 < n && h[r + 1] >= h[i]) r++;    // stretch right
        best = Math.max(best, h[i] * (r - l + 1));
    }
    return best;
}`
      },
      mcq: {
        q: 'While popping bar <code>top</code> at position <code>i</code>, the stack below it has index <code>L</code> on top. What is the width of the rectangle with height <code>h[top]</code>?',
        options: ['<code>i - top</code>', '<code>i - L - 1</code>', '<code>top - L</code>', '<code>i - L + 1</code>'],
        answer: 1,
        explain: '<code>L</code> is the nearest smaller bar on the left and <code>i</code> the nearest smaller (or equal) on the right; the rectangle covers the bars strictly between them: <code>i - L - 1</code> bars. With an empty stack, use L = -1.'
      },
      hints: [
        `<p>Aha: the best rectangle has the height of some bar <code>i</code> (its shortest bar). For that bar, width = distance between the <b>nearest shorter bar on the left</b> and the <b>nearest shorter bar on the right</b>, minus one.</p>`,
        `<p>Keep a stack of indices with <b>increasing</b> heights. When <code>h[i] ≤ h[top]</code>, pop <code>top</code>: right wall = <code>i</code>, left wall = new top (or -1). Compute <code>h[top] × (i - left - 1)</code>.</p>`,
        `<p>Traps: bars still on the stack at the end must be measured — loop <code>i</code> up to <code>n</code> with height 0 at <code>i == n</code>; empty stack → left = -1 (rectangle reaches index 0); use a 64-bit type (<code>long</code> / <code>long long</code>) or check that 10<sup>4</sup> × 10<sup>5</sup> = 10<sup>9</sup> fits in a 32-bit int (it does, barely). Recipe: for i in 0..n: cur = (i==n ? 0 : h[i]); while stack and h[top] ≥ cur: pop, measure; push i.</p>`
      ],
      tests: { sig: "int[] -> int", fn: "largestRectangleArea", cases: [
        [[[2,1,5,6,2,3]],10],
        [[[2,4]],4],
        [[[0]],0],
        [[[5]],5],
        [[[3,3,3]],9],
        [[[1,2,3,4,5]],9],
        [[[5,4,3,2,1]],9],
        [[[4,0,4]],4],
        [[[10000,10000,10000]],30000],
        [[[0,0,0]],0],
        [[[6,2,5,4,5,1,6]],12],
        [[{"$rep":10000,"n":100000}],1000000000],
        [[{"$range":[10000,0,-1]}],25005000]
      ] },
      solution: {
        approach: `<p>Increasing stack; each bar is measured at the moment it is popped (when its right wall appears).</p>`,
        code: `
import java.util.*;

class Solution {
    public int largestRectangleArea(int[] heights) {
        int n = heights.length, best = 0;
        Deque<Integer> st = new ArrayDeque<>();            // indices, heights increasing
        for (int i = 0; i <= n; i++) {
            int cur = (i == n) ? 0 : heights[i];           // height-0 sentinel flushes the stack
            while (!st.isEmpty() && heights[st.peek()] >= cur) {
                int top = st.pop();                        // this bar cannot stretch past i
                int left = st.isEmpty() ? -1 : st.peek();  // nearest smaller bar on the left
                int width = i - left - 1;                  // bars strictly between the two walls
                best = Math.max(best, heights[top] * width);
            }
            st.push(i);
        }
        return best;
    }

    public static void main(String[] args) {
        System.out.println(new Solution().largestRectangleArea(new int[]{2, 1, 5, 6, 2, 3}));   // 10
    }
}`,
        dry: {
          head: ['i', 'cur h', 'popped → (left, width, area)', 'best', 'stack after (i:h)'],
          rows: [
            ['0', '2', '—', '0', '0:2'],
            ['1', '1', '<span class="c-r">0</span> → (-1, 1, 2)', '2', '1:1'],
            ['2', '5', '—', '2', '1:1, 2:5'],
            ['3', '6', '—', '2', '1:1, 2:5, 3:6'],
            ['4', '2', '<span class="c-r">3</span> → (2, 1, 6); <span class="c-r">2</span> → (1, 2, 10)', '<span class="c-g">10</span>', '1:1, 4:2'],
            ['5', '3', '—', '10', '1:1, 4:2, 5:3'],
            ['6 (sentinel)', '0', '<span class="c-r">5</span> → (4, 1, 3); <span class="c-r">4</span> → (1, 4, 8); <span class="c-r">1</span> → (-1, 6, 6)', '<span class="c-p">10</span>', '6 (sentinel)']
          ]
        },
        alt: [{ lang: 'python', code: `class Solution:
    def largest_rectangle_area(self, heights: list[int]) -> int:
        best = 0
        st = []                                   # indices, heights increasing
        for i, cur in enumerate(heights + [0]):   # height-0 sentinel flushes the stack
            while st and heights[st[-1]] >= cur:
                top = st.pop()                    # this bar cannot stretch past i
                left = st[-1] if st else -1       # nearest smaller bar on the left
                best = max(best, heights[top] * (i - left - 1))
            st.append(i)
        return best` }, { lang: 'js', code: `function largestRectangleArea(heights) {
  const n = heights.length, st = [];             // st: indices, heights increasing
  let best = 0;
  for (let i = 0; i <= n; i++) {
    const cur = i === n ? 0 : heights[i];        // height-0 sentinel flushes the stack
    while (st.length && heights[st[st.length - 1]] >= cur) {
      const top = st.pop();                      // this bar cannot stretch past i
      const left = st.length ? st[st.length - 1] : -1;   // nearest smaller bar on the left
      best = Math.max(best, heights[top] * (i - left - 1));
    }
    st.push(i);
  }
  return best;
}` }, { lang: 'cpp', code: `class Solution {
public:
    int largestRectangleArea(const vector<int>& heights) {
        int n = heights.size();
        long long best = 0;                      // 64-bit area is safe for any input size
        vector<int> st;                          // indices, heights increasing
        for (int i = 0; i <= n; i++) {
            int cur = (i == n) ? 0 : heights[i]; // height-0 sentinel flushes the stack
            while (!st.empty() && heights[st.back()] >= cur) {
                int top = st.back(); st.pop_back();       // this bar cannot stretch past i
                int left = st.empty() ? -1 : st.back();   // nearest smaller bar on the left
                best = max(best, 1LL * heights[top] * (i - left - 1));
            }
            st.push_back(i);
        }
        return (int)best;
    }
};` }],
        complexity: `<p><b>Time O(N)</b>: each index is pushed once and popped once; every pop does O(1) work. <b>Space O(N)</b> for the stack (an increasing histogram keeps every bar on it until the end).</p>`
      }
    }]
  });

  // =====================================================================
  // TOPIC 8 — Queue using two Stacks (amortized O(1))
  // =====================================================================
  topics.push({
    title: 'Queue using Two Stacks — amortized O(1)',
    analogy: `<p>A cafeteria has two tray piles. Washed trays are always dropped on the <b>"in" pile</b>. Customers always take from the <b>"out" pile</b>. When the out pile is empty, a worker picks up the in pile one tray at a time and builds the out pile — this <b>flips the order</b>, so the tray that was washed <b>first</b> is now on <b>top</b>. Oldest tray is served first: a queue made of two stacks!</p>
      <p>The flip is a lot of work at once, but each tray is flipped <b>only once</b> in its life.</p>`,
    explain: `<p>Two stacks: <code>in</code> (receives new items) and <code>out</code> (serves the front).</p>
      <ul>
        <li><b>push(x)</b>: <code>in.push(x)</code>. Always O(1).</li>
        <li><b>pop() / peek()</b>: if <code>out</code> is empty, move <b>everything</b> from <code>in</code> to <code>out</code> (this reverses the order). Then pop/peek <code>out</code>.</li>
        <li><b>empty()</b>: both stacks empty.</li>
      </ul>
      ${H.table(['step', 'in (bottom→top)', 'out (bottom→top)', 'note'], [
        ['push 1, 2, 3', '1 2 3', '', 'oldest (1) is buried at the bottom of in'],
        ['pop()', '', '3 2 <span class="c-y">1</span>', 'out empty → transfer: order flips, 1 on top'],
        ['', '', '3 2', 'pop returns <span class="c-p">1</span>'],
        ['push 4', '4', '3 2', 'new items never disturb out'],
        ['pop()', '4', '3', 'out not empty → returns <span class="c-p">2</span>, no transfer']
      ])}
      <h4>What does "amortized O(1)" mean?</h4>
      <p>One single pop can cost O(N) (a big transfer). But follow one item through its whole life: pushed into <code>in</code> once, moved to <code>out</code> once, popped from <code>out</code> once → <b>at most 4 stack operations per item</b>. So N queue operations cost at most ~4N stack operations total → <b>O(1) on average per operation</b>. "Amortized" = the cost of the rare expensive step, spread across all the cheap ones (like paying rent monthly, even though you sign the contract once).</p>
      <p>${H.c('r', 'Important rule')}: only transfer when <code>out</code> is <b>empty</b>. If you pour <code>in</code> on top of a non-empty <code>out</code>, newer items land above older ones and the order breaks.</p>`,
    clues: [
      '"Implement a queue using only stack operations (push to top, peek/pop from top, size, isEmpty)".',
      '"Amortized O(1)" / "each element is moved at most once" → the two-stack trick.',
      'The reverse ("implement a stack using queues") → one queue, rotate it after each push (push O(N)).',
      '"Queue with getMin/getMax" → two Min Stacks combined with this trick.'
    ],
    code: { lang: 'java', code: `
import java.util.*;

// Queue with O(1) amortized getMin: two stacks where every entry stores {value, minSoFar}.
class MinQueue {
    private final Deque<int[]> in = new ArrayDeque<>();
    private final Deque<int[]> out = new ArrayDeque<>();

    private static void pushWithMin(Deque<int[]> st, int x) {
        int m = st.isEmpty() ? x : Math.min(x, st.peek()[1]);
        st.push(new int[]{x, m});
    }

    public void offer(int x) { pushWithMin(in, x); }

    public int poll() {
        if (out.isEmpty()) {
            while (!in.isEmpty()) pushWithMin(out, in.pop()[0]);   // re-compute mins while moving
        }
        return out.pop()[0];
    }

    public int getMin() {
        if (in.isEmpty()) return out.peek()[1];
        if (out.isEmpty()) return in.peek()[1];
        return Math.min(in.peek()[1], out.peek()[1]);              // min of both halves
    }

    public static void main(String[] args) {
        MinQueue q = new MinQueue();
        q.offer(4); q.offer(2); q.offer(7);
        System.out.println(q.getMin()); // 2
        q.poll();                       // removes 4
        q.poll();                       // removes 2
        System.out.println(q.getMin()); // 7
        q.offer(1);
        System.out.println(q.getMin()); // 1
    }
}`,
      alt: [{ lang: 'python', run: true, code: `class MinQueue:
    """Queue with O(1) amortized get_min: two stacks of (value, min_so_far)."""

    def __init__(self):
        self.inbox, self.outbox = [], []

    @staticmethod
    def _push(st, x):
        st.append((x, min(x, st[-1][1]) if st else x))

    def offer(self, x: int) -> None:
        self._push(self.inbox, x)

    def poll(self) -> int:
        if not self.outbox:
            while self.inbox:
                self._push(self.outbox, self.inbox.pop()[0])   # re-compute mins while moving
        return self.outbox.pop()[0]

    def get_min(self) -> int:
        return min(st[-1][1] for st in (self.inbox, self.outbox) if st)   # min of both halves


q = MinQueue()
for x in (4, 2, 7):
    q.offer(x)
print(q.get_min())   # 2
q.poll()             # removes 4
q.poll()             # removes 2
print(q.get_min())   # 7
q.offer(1)
print(q.get_min())   # 1` }, { lang: 'js', run: true, code: `// Queue with O(1) amortized getMin: two stacks where every entry stores [value, minSoFar].
class MinQueue {
  constructor() { this.in = []; this.out = []; }

  static pushWithMin(st, x) {
    st.push([x, st.length ? Math.min(x, st[st.length - 1][1]) : x]);
  }

  offer(x) { MinQueue.pushWithMin(this.in, x); }

  poll() {
    if (this.out.length === 0) {
      while (this.in.length) MinQueue.pushWithMin(this.out, this.in.pop()[0]);   // re-compute mins
    }
    return this.out.pop()[0];
  }

  getMin() {
    const tops = [this.in, this.out].filter((st) => st.length).map((st) => st[st.length - 1][1]);
    return Math.min(...tops);                 // min of both halves
  }
}

const q = new MinQueue();
[4, 2, 7].forEach((x) => q.offer(x));
console.log(q.getMin());   // 2
q.poll();                  // removes 4
q.poll();                  // removes 2
console.log(q.getMin());   // 7
q.offer(1);
console.log(q.getMin());   // 1` }, { lang: 'cpp', code: `// Queue with O(1) amortized getMin: two stacks where every entry stores {value, minSoFar}.
class MinQueue {
    vector<pair<int, int>> in, out;
    static void pushWithMin(vector<pair<int, int>>& st, int x) {
        st.push_back({x, st.empty() ? x : min(x, st.back().second)});
    }
public:
    void offer(int x) { pushWithMin(in, x); }
    int poll() {
        if (out.empty()) {
            while (!in.empty()) { pushWithMin(out, in.back().first); in.pop_back(); }   // re-compute mins
        }
        int x = out.back().first;
        out.pop_back();
        return x;
    }
    int getMin() {
        if (in.empty()) return out.back().second;
        if (out.empty()) return in.back().second;
        return min(in.back().second, out.back().second);   // min of both halves
    }
};

int main() {
    MinQueue q;
    for (int x : {4, 2, 7}) q.offer(x);
    cout << q.getMin() << "\\n";   // 2
    q.poll();                     // removes 4
    q.poll();                     // removes 2
    cout << q.getMin() << "\\n";   // 7
    q.offer(1);
    cout << q.getMin() << "\\n";   // 1
}` }] },
    codeTitle: 'Bonus: Min Queue = two Min Stacks',
    examples: [
      {
        title: 'Count the moves: 4 pushes then 4 pops',
        html: `${H.table(['call', 'stack operations', 'running total'], [
          ['push 1..4', '4 × in.push', '4'], ['pop() #1', 'transfer 4 items (8 ops) + out.pop', '13'],
          ['pop() #2', 'out.pop', '14'], ['pop() #3', 'out.pop', '15'], ['pop() #4', 'out.pop', '<b>16</b>']
        ])}<p>8 queue operations cost 16 stack operations = <b>2 per queue operation on average</b>, even though pop #1 alone cost 9. That is amortized O(1) in action.</p>`
      },
      {
        title: 'The broken "eager" version',
        html: `<p>If you transfer from <code>in</code> to <code>out</code> on <b>every</b> pop (even when out is not empty), the order breaks: in = [3], out = [2] (2 on top). Pouring in gives out = [2, 3] with <span class="c-r">3 on top</span> → pop returns 3 although 2 is older. Transfer <b>only when out is empty</b>.</p>`
      },
      {
        title: 'Worst-case latency vs average',
        html: `<p>Push 10<sup>6</sup> items, then pop once: that single pop moves 10<sup>6</sup> items. The average stays O(1), but in a latency-sensitive system (a game loop, a trading engine) that one slow call might matter. Fix options: a circular-buffer queue (<code>ArrayDeque</code>, true O(1) except rare growth), or "incremental" transfer tricks used in real-time functional queues.</p>`
      },
      {
        title: 'Real-life two-stack queues',
        html: `<p>Functional languages (Haskell, Clojure, Scala) implement immutable queues as a <b>front list + reversed back list</b> — exactly this idea, because immutable singly linked lists are stacks. The "Banker's queue" by Okasaki makes the amortized bound hold even when old versions of the queue are reused.</p>`
      }
    ],
    deepDive: `<p><b>Formal amortized analysis (accounting method).</b> Charge each <code>push</code> 3 credits: 1 pays for the push itself, 2 are saved on the item. When a transfer happens, each moved item spends its 2 saved credits for its pop-from-in and push-to-out. The final pop-from-out costs 1. So every operation is covered by a constant amount → amortized O(1). The <b>potential method</b> gives the same result with Φ = 2 × |in|.</p>
      <p><b>Why amortized ≠ average-case.</b> Average-case depends on random inputs; amortized is a <b>worst-case guarantee over any sequence</b>: no matter what an adversary does, N operations cost O(N) total. The only thing it does not bound is a single operation's latency.</p>
      <p><b>The opposite direction.</b> A stack from queues (Topic 1's guided problem) has no such trick with one or two queues: rotating moves every element on every push, so nothing is "moved once and done".</p>
      <p><b>Generalisation: two-stack aggregates.</b> If each stack entry stores an aggregate (min, max, gcd, sum of an associative operation) of the entries below it, the queue can answer the aggregate of the whole window as <code>combine(in.agg, out.agg)</code>. This gives O(1) amortized sliding-window min/max/gcd for any associative operation — even non-invertible ones like gcd where prefix sums do not work. Streaming engines use this "two-stacks" trick for sliding window aggregations.</p>
      <p><b>Reality check:</b> in production you would just use the library queue (<code>ArrayDeque</code>, <code>collections.deque</code>, <code>std::queue</code>). The two-stack design matters for interviews, immutable/functional data structures, and aggregate windows.</p>`,
    aiEra: `<p><b>What AI changes:</b> any assistant can implement MyQueue in seconds; the classic follow-up "what does amortized mean and prove it" is what interviewers actually listen for. With AI writing boilerplate, being able to give a crisp accounting or potential argument is a differentiator.</p>
      <p><b>Use AI as a partner:</b> <code>"Simulate 20 random queue operations on my two-stack queue and a reference ArrayDeque and print where they differ"</code>; <code>"Explain the banker's queue and why persistence breaks naive amortization"</code> for a deeper dive.</p>
      <p><b>Where AI goes wrong:</b> transferring on every pop, forgetting that <code>peek()</code> needs the transfer too, checking only one stack in <code>empty()</code>, or describing amortized cost as "average over random inputs".</p>
      <p><b>What you must still own:</b> the one-line reason each element moves at most once, the difference between amortized and worst-case latency, and when the aggregate version (Min Queue) is the right tool.</p>`,
    viz: {
      title: 'Queue from two stacks: in, out and the transfer',
      input: 'push 1, push 2, push 3, pop, push 4, peek, pop, pop, pop',
      inputLabel: 'Ops: push x, pop, peek, empty (comma separated)',
      gen: function (input) {
        var ops = parseOps(input, 'push 1, push 2, push 3, pop, push 4, pop', ['push', 'pop', 'peek', 'empty']);
        var inS = [], outS = [], frames = [], moves = 0;
        function parts(hin, hout, extra) {
          var p = [{ type: 'stack', label: 'in (new items land here)', items: inS.slice(), hl: hin || {} }, { type: 'stack', label: 'out (front of queue on top)', items: outS.slice(), hl: hout || {} }];
          p.push({ type: 'vars', vals: Object.assign({ 'queue front→back': outS.slice().reverse().concat(inS).join(', ') || '—', 'total stack moves': moves }, extra || {}) });
          return p;
        }
        frames.push({ narr: 'Two empty stacks. <b>in</b> receives new items, <b>out</b> serves the oldest item from its top.', parts: parts() });
        ops.forEach(function (o) {
          if (o.op === 'push') {
            inS.push(o.v); moves++;
            frames.push({ narr: '<code>push(' + o.v + ')</code> → just <span class="c-g">push onto in</span>. O(1), the out stack is untouched.', parts: parts(one(inS.length - 1, 'ok'), {}) });
            return;
          }
          if (o.op === 'empty') {
            frames.push({ narr: '<code>empty()</code> → both stacks empty? <b>' + (!inS.length && !outS.length) + '</b>.', parts: parts({}, {}, { 'empty()': String(!inS.length && !outS.length) }) });
            return;
          }
          if (!inS.length && !outS.length) {
            frames.push({ narr: '<code>' + o.op + '()</code> on an <span class="c-r">empty</span> queue — not allowed, we skip it.', parts: parts() });
            return;
          }
          if (!outS.length) {
            var cnt = inS.length;
            frames.push({ narr: '<code>' + o.op + '()</code> but <b>out is empty</b>. The oldest item (' + inS[0] + ') is buried at the bottom of in. Time to transfer all ' + cnt + ' item(s).', parts: parts((function () { var h = {}; for (var k = 0; k < inS.length; k++) h[k] = 'cur'; h[0] = 'sel'; return h; })(), {}) });
            while (inS.length) { outS.push(inS.pop()); moves += 2; }
            frames.push({ narr: 'Moved them one by one (pop from in, push to out). The order <b>flipped</b>: the oldest item ' + outS[outS.length - 1] + ' is now on <b>top</b> of out. Each item will only ever be moved once.', parts: parts({}, (function () { var h = {}; for (var k = 0; k < outS.length; k++) h[k] = 'ok'; h[outS.length - 1] = 'sel'; return h; })()) });
          }
          var front = outS[outS.length - 1];
          if (o.op === 'peek') {
            frames.push({ narr: '<code>peek()</code> → look at the top of out: <b>' + front + '</b> (nothing removed).', parts: parts({}, one(outS.length - 1, 'sel'), { returned: front }) });
          } else {
            frames.push({ narr: '<code>pop()</code> → <span class="c-r">pop from out</span>: returns <b>' + front + '</b>, the oldest item still in the queue.', parts: parts({}, one(outS.length - 1, 'bad'), { returned: front }) });
            outS.pop(); moves++;
          }
        });
        frames.push({ narr: 'Done. Count the moves: every item costs at most push-to-in, pop-from-in, push-to-out, pop-from-out = 4 operations. That is why the queue is <b>amortized O(1)</b>.', parts: parts() });
        return frames;
      }
    },
    problems: [{
      title: 'Implement Queue using Stacks',
      level: 'Easy',
      tags: ['stack', 'queue', 'design', 'amortized'],
      statement: `<p>Implement a FIFO queue <code>MyQueue</code> with <code>push(x)</code>, <code>pop()</code>, <code>peek()</code> and <code>empty()</code>, using <b>only two stacks</b> and only standard stack operations (push to top, peek/pop from top, size, isEmpty). Follow-up: make every operation <b>amortized O(1)</b>.</p>`,
      constraints: `1 ≤ x ≤ 9, at most 100 calls; pop and peek are only called on a non-empty queue`,
      example: `${H.table(['call', 'returns', 'queue front→back'], [
        ['push(1)', '—', '1'], ['push(2)', '—', '1, 2'], ['peek()', '<span class="c-p">1</span>', '1, 2'],
        ['pop()', '<span class="c-p">1</span>', '2'], ['push(3)', '—', '2, 3'], ['pop()', '<span class="c-p">2</span>', '3'],
        ['empty()', '<span class="c-p">false</span>', '3'], ['pop()', '<span class="c-p">3</span>', '(empty)']
      ])}<p>The first item pushed is always the first one returned — FIFO.</p>`,
      brute: {
        why: `<p>Keep everything in one stack. To pop the front (at the bottom), move all items to a helper stack, pop the one on top, then move everything <b>back</b>. Each pop/peek costs O(N) <b>every time</b> → O(N<sup>2</sup>) for N operations. The waste: moving the items back undoes the useful reversal we just paid for.</p>`,
        code: `
import java.util.*;

class MyQueueSlow {
    private final Deque<Integer> main = new ArrayDeque<>();
    private final Deque<Integer> help = new ArrayDeque<>();

    public void push(int x) { main.push(x); }

    public int pop() {
        while (!main.isEmpty()) help.push(main.pop());   // reverse: front is now on top
        int front = help.pop();
        while (!help.isEmpty()) main.push(help.pop());   // move everything back: wasted work
        return front;
    }

    public int peek() {
        while (!main.isEmpty()) help.push(main.pop());
        int front = help.peek();
        while (!help.isEmpty()) main.push(help.pop());
        return front;
    }

    public boolean empty() { return main.isEmpty(); }
}`
      },
      mcq: {
        q: 'in = [4, 5] (5 on top), out = [3] (3 on top). We call <code>pop()</code>. What happens?',
        options: ['Transfer 5 and 4 onto out first, then pop', 'Pop 3 from out — no transfer because out is not empty', 'Pop 5 from in', 'Pop 4 from in'],
        answer: 1,
        explain: '3 is older than 4 and 5 (it was transferred earlier), so it is the front. Transfer only when out is empty; otherwise newer items would land on top of older ones.'
      },
      hints: [
        `<p>Aha: pouring one stack into another <b>reverses</b> the order. A reversed stack has the <b>oldest</b> item on top — exactly the queue front.</p>`,
        `<p>Two stacks: <code>in</code> for pushes, <code>out</code> for pops/peeks. Only when <code>out</code> is empty, pour <b>all</b> of <code>in</code> into it.</p>`,
        `<p>Traps: never transfer while <code>out</code> still has items (breaks the order); <code>empty()</code> must check <b>both</b> stacks; peek also needs the transfer step. Recipe: push → in.push(x). pop/peek → if out empty: while in not empty out.push(in.pop()); then out.pop()/out.peek(). empty → in.isEmpty() &amp;&amp; out.isEmpty().</p>`
      ],
      tests: { cls: "MyQueue", sigs: {"MyQueue":"","push":"int -> void","pop":"-> int","peek":"-> int","empty":"-> bool"}, cases: [
        {"ops":["MyQueue","push","push","peek","pop","push","pop","empty","pop"],"args":[[],[1],[2],[],[],[3],[],[],[]],"out":[null,null,null,1,1,null,2,false,3]},
        {"ops":["MyQueue","empty"],"args":[[],[]],"out":[null,true]},
        {"ops":["MyQueue","push","peek","pop","empty"],"args":[[],[9],[],[],[]],"out":[null,null,9,9,true]},
        {"ops":["MyQueue","push","push","push","push","pop","pop","pop","pop","empty"],"args":[[],[1],[2],[3],[4],[],[],[],[],[]],"out":[null,null,null,null,null,1,2,3,4,true]},
        {"ops":["MyQueue","push","push","pop","push","push","pop","peek","pop","pop","empty"],"args":[[],[1],[2],[],[3],[4],[],[],[],[],[]],"out":[null,null,null,1,null,null,2,3,3,4,true]},
        {"ops":["MyQueue","push","push","push","peek","pop","peek","empty"],"args":[[],[5],[5],[6],[],[],[],[]],"out":[null,null,null,null,5,5,5,false]}
      ] },
      solution: {
        approach: `<p>Lazy transfer: <code>out</code> is refilled only when it runs dry, so every element moves once.</p>`,
        code: `
import java.util.*;

class MyQueue {
    private final Deque<Integer> in = new ArrayDeque<>();   // newest on top
    private final Deque<Integer> out = new ArrayDeque<>();  // oldest on top

    public void push(int x) {
        in.push(x);                         // O(1): new items always go to "in"
    }

    // Refill "out" only when it is empty. Pouring reverses the order -> oldest ends on top.
    private void shiftIfNeeded() {
        if (out.isEmpty()) {
            while (!in.isEmpty()) {
                out.push(in.pop());
            }
        }
    }

    public int pop() {
        shiftIfNeeded();
        return out.pop();                   // front of the queue
    }

    public int peek() {
        shiftIfNeeded();
        return out.peek();
    }

    public boolean empty() {
        return in.isEmpty() && out.isEmpty();   // items may hide in either stack
    }

    public static void main(String[] args) {
        MyQueue q = new MyQueue();
        q.push(1); q.push(2);
        System.out.println(q.peek());   // 1
        System.out.println(q.pop());    // 1
        q.push(3);
        System.out.println(q.pop());    // 2
        System.out.println(q.empty());  // false
        System.out.println(q.pop());    // 3
    }
}`,
        dry: {
          head: ['call', 'in (bottom→top)', 'out (bottom→top)', 'what happens', 'returns'],
          rows: [
            ['push(1)', '1', '', 'in.push', '—'],
            ['push(2)', '1 2', '', 'in.push', '—'],
            ['peek()', '', '2 1', '<span class="c-y">out empty → transfer 2 then 1</span>', '<span class="c-p">1</span>'],
            ['pop()', '', '2', 'out not empty → out.pop', '<span class="c-p">1</span>'],
            ['push(3)', '3', '2', 'in.push (out untouched)', '—'],
            ['pop()', '3', '', 'out.pop', '<span class="c-p">2</span>'],
            ['empty()', '3', '', 'in has 3', '<span class="c-p">false</span>'],
            ['pop()', '', '', '<span class="c-y">out empty → transfer 3</span>, out.pop', '<span class="c-p">3</span>']
          ]
        },
        alt: [{ lang: 'python', code: `class MyQueue:
    def __init__(self):
        self.inbox = []                 # newest on top (end of the list)
        self.outbox = []                # oldest on top

    def push(self, x: int) -> None:
        self.inbox.append(x)            # O(1): new items always go to the inbox

    def _shift(self) -> None:
        if not self.outbox:             # refill only when empty, or the order breaks
            while self.inbox:
                self.outbox.append(self.inbox.pop())

    def pop(self) -> int:
        self._shift()
        return self.outbox.pop()        # front of the queue

    def peek(self) -> int:
        self._shift()
        return self.outbox[-1]

    def empty(self) -> bool:
        return not self.inbox and not self.outbox   # items may hide in either stack` }, { lang: 'js', code: `class MyQueue {
  constructor() {
    this.in = [];                       // newest on top (end of the array)
    this.out = [];                      // oldest on top
  }

  push(x) { this.in.push(x); }          // O(1): new items always go to "in"

  shift() {                             // refill only when empty, or the order breaks
    if (this.out.length === 0) {
      while (this.in.length) this.out.push(this.in.pop());
    }
  }

  pop() { this.shift(); return this.out.pop(); }               // front of the queue
  peek() { this.shift(); return this.out[this.out.length - 1]; }
  empty() { return this.in.length === 0 && this.out.length === 0; }
}` }, { lang: 'cpp', code: `class MyQueue {
    stack<int> in, out;                 // in: newest on top, out: oldest on top
    void shiftIfNeeded() {
        if (out.empty()) {              // refill only when empty, or the order breaks
            while (!in.empty()) { out.push(in.top()); in.pop(); }
        }
    }
public:
    void push(int x) { in.push(x); }    // O(1): new items always go to "in"
    int pop() { shiftIfNeeded(); int x = out.top(); out.pop(); return x; }
    int peek() { shiftIfNeeded(); return out.top(); }
    bool empty() { return in.empty() && out.empty(); }   // items may hide in either stack
};` }],
        complexity: `<p><b>push O(1)</b>. <b>pop/peek amortized O(1)</b>: a single call can move many items, but each item is moved from <code>in</code> to <code>out</code> <b>at most once</b> in its life, so N operations do at most ~4N stack steps. <b>Space O(N)</b> for the items.</p>`
      }
    }]
  });

  // =====================================================================
  // TOPIC 9 — Monotonic Deque: Sliding Window Maximum
  // =====================================================================
  topics.push({
    title: 'Monotonic Deque — Sliding Window Maximum',
    analogy: `<p>A coach watches a group of K kids walking past in a line and must always shout who is the <b>tallest in the current group</b>. Smart trick: when a new tall kid joins, every <b>shorter kid who joined earlier</b> can be forgotten forever — the new kid is taller <b>and</b> will stay in the group longer, so those shorter kids can never be the tallest again.</p>
      <p>The coach's short list is therefore always sorted <b>tallest (oldest) → shortest (newest)</b>. The tallest is at the front — until they walk out of the group.</p>`,
    explain: `<p>A <b>deque</b> lets us remove from both ends. We store <b>indices</b> whose values are <b>decreasing</b> from front to back.</p>
      <p>For each new index <code>i</code>:</p>
      <ol>
        <li>${H.c('r', 'Front expired?')} If the front index is <code>≤ i - k</code>, it has left the window → <code>pollFirst()</code>.</li>
        <li>${H.c('r', 'Back is useless?')} While the back value is <code>≤ a[i]</code> → <code>pollLast()</code> (shorter and older than the newcomer).</li>
        <li>${H.c('g', 'Join')}: <code>offerLast(i)</code>.</li>
        <li>${H.c('p', 'Answer')}: once the first window is full (<code>i ≥ k - 1</code>), the max is <code>a[front]</code>.</li>
      </ol>
      ${H.arr([1, 3, -1, -3, 5, 3, 6, 7], { label: 'a, k = 3', hl: { 1: 'b', 2: 'b', 3: 'b' } })}
      ${H.table(['window', 'deque (indices: values) front→back', 'max'], [
        ['[1 3 -1]', '1:3, 2:-1', '3'], ['[3 -1 -3]', '1:3, 2:-1, 3:-3', '3'], ['[-1 -3 5]', '4:5 (1 expired, -1 and -3 beaten)', '5'],
        ['[-3 5 3]', '4:5, 5:3', '5'], ['[5 3 6]', '6:6', '6'], ['[3 6 7]', '7:7', '7']
      ])}
      <p><b>Why O(N)?</b> Every index enters the deque once and leaves it at most once (from the front or the back) → ≤ 2N deque operations, compared to O(N·K) for re-scanning each window.</p>
      <p>Containers: Java <code>ArrayDeque</code> (<code>peekFirst / pollFirst / peekLast / pollLast / offerLast</code>), Python <code>collections.deque</code> (<code>dq[0] / popleft / dq[-1] / pop / append</code>), C++ <code>std::deque</code> (<code>front / pop_front / back / pop_back / push_back</code>); JS has no deque, but each index enters only once, so an array with a <code>head</code> pointer works. For a <b>sliding window minimum</b>, flip the comparison (keep values increasing).</p>`,
    clues: [
      '"<b>Maximum (or minimum) in every window of size K</b>", "sliding window max".',
      'Window <b>slides by one</b> and you need the max/min each time — a heap gives O(N log N), a monotonic deque gives O(N).',
      '"Longest subarray where max - min ≤ limit" → two monotonic deques (one for max, one for min).',
      '"Shortest subarray with sum ≥ K" with negatives, "constrained subsequence sum", "jump game VI" → DP + monotonic deque.',
      '<code>N ≤ 10<sup>5</sup>, K ≤ N</code> → O(N·K) can be 10<sup>10</sup>; need O(N).'
    ],
    code: [{ lang: 'java', code: `
import java.util.*;

class DequeWindows {
    // Longest subarray where (max - min) <= limit: one decreasing deque for max, one increasing for min.
    static int longestSubarray(int[] a, int limit) {
        Deque<Integer> maxD = new ArrayDeque<>(), minD = new ArrayDeque<>();
        int left = 0, best = 0;
        for (int right = 0; right < a.length; right++) {
            while (!maxD.isEmpty() && a[maxD.peekLast()] < a[right]) maxD.pollLast();
            while (!minD.isEmpty() && a[minD.peekLast()] > a[right]) minD.pollLast();
            maxD.offerLast(right);
            minD.offerLast(right);
            while (a[maxD.peekFirst()] - a[minD.peekFirst()] > limit) {   // window invalid -> shrink
                left++;
                if (maxD.peekFirst() < left) maxD.pollFirst();
                if (minD.peekFirst() < left) minD.pollFirst();
            }
            best = Math.max(best, right - left + 1);
        }
        return best;
    }

    // Sliding window MINIMUM: same as maximum with the comparison flipped.
    static int[] windowMin(int[] a, int k) {
        int[] res = new int[a.length - k + 1];
        Deque<Integer> dq = new ArrayDeque<>();                 // values increasing front -> back
        for (int i = 0; i < a.length; i++) {
            if (!dq.isEmpty() && dq.peekFirst() <= i - k) dq.pollFirst();
            while (!dq.isEmpty() && a[dq.peekLast()] >= a[i]) dq.pollLast();
            dq.offerLast(i);
            if (i >= k - 1) res[i - k + 1] = a[dq.peekFirst()];
        }
        return res;
    }

    public static void main(String[] args) {
        System.out.println(longestSubarray(new int[]{8, 2, 4, 7}, 4));                 // 2
        System.out.println(longestSubarray(new int[]{10, 1, 2, 4, 7, 2}, 5));          // 4
        System.out.println(Arrays.toString(windowMin(new int[]{4, 2, 12, 3, 8, 1}, 3)));  // [2, 2, 3, 1]
    }
}`,
      alt: [{ lang: 'python', run: true, code: `from collections import deque


def longest_subarray(a, limit):
    """Longest subarray with max - min <= limit: one deque for max, one for min."""
    max_d, min_d = deque(), deque()
    left = best = 0
    for right, x in enumerate(a):
        while max_d and a[max_d[-1]] < x:
            max_d.pop()
        while min_d and a[min_d[-1]] > x:
            min_d.pop()
        max_d.append(right)
        min_d.append(right)
        while a[max_d[0]] - a[min_d[0]] > limit:   # window invalid -> shrink
            left += 1
            if max_d[0] < left:
                max_d.popleft()
            if min_d[0] < left:
                min_d.popleft()
        best = max(best, right - left + 1)
    return best


def window_min(a, k):
    """Sliding window MINIMUM: same as maximum with the comparison flipped."""
    dq, res = deque(), []                         # values increasing front -> back
    for i, x in enumerate(a):
        if dq and dq[0] <= i - k:
            dq.popleft()
        while dq and a[dq[-1]] >= x:
            dq.pop()
        dq.append(i)
        if i >= k - 1:
            res.append(a[dq[0]])
    return res


print(longest_subarray([8, 2, 4, 7], 4))          # 2
print(longest_subarray([10, 1, 2, 4, 7, 2], 5))   # 4
print(window_min([4, 2, 12, 3, 8, 1], 3))         # [2, 2, 3, 1]` }, { lang: 'js', run: true, code: `// Longest subarray where (max - min) <= limit: one decreasing deque for max, one increasing for min.
// Each index enters a deque once, so arrays with a head pointer work as deques.
function longestSubarray(a, limit) {
  const maxD = [], minD = [];
  let maxH = 0, minH = 0, left = 0, best = 0;
  for (let right = 0; right < a.length; right++) {
    while (maxD.length > maxH && a[maxD[maxD.length - 1]] < a[right]) maxD.pop();
    while (minD.length > minH && a[minD[minD.length - 1]] > a[right]) minD.pop();
    maxD.push(right);
    minD.push(right);
    while (a[maxD[maxH]] - a[minD[minH]] > limit) {   // window invalid -> shrink
      left++;
      if (maxD[maxH] < left) maxH++;
      if (minD[minH] < left) minH++;
    }
    best = Math.max(best, right - left + 1);
  }
  return best;
}

// Sliding window MINIMUM: same as maximum with the comparison flipped.
function windowMin(a, k) {
  const dq = [], res = [];                    // values increasing front -> back
  let head = 0;
  for (let i = 0; i < a.length; i++) {
    if (dq.length > head && dq[head] <= i - k) head++;
    while (dq.length > head && a[dq[dq.length - 1]] >= a[i]) dq.pop();
    dq.push(i);
    if (i >= k - 1) res.push(a[dq[head]]);
  }
  return res;
}

console.log(longestSubarray([8, 2, 4, 7], 4));           // 2
console.log(longestSubarray([10, 1, 2, 4, 7, 2], 5));    // 4
console.log(windowMin([4, 2, 12, 3, 8, 1], 3));          // [ 2, 2, 3, 1 ]` }, { lang: 'cpp', code: `// Longest subarray where (max - min) <= limit: one decreasing deque for max, one increasing for min.
int longestSubarray(const vector<int>& a, int limit) {
    deque<int> maxD, minD;
    int left = 0, best = 0;
    for (int right = 0; right < (int)a.size(); right++) {
        while (!maxD.empty() && a[maxD.back()] < a[right]) maxD.pop_back();
        while (!minD.empty() && a[minD.back()] > a[right]) minD.pop_back();
        maxD.push_back(right);
        minD.push_back(right);
        while (a[maxD.front()] - a[minD.front()] > limit) {   // window invalid -> shrink
            left++;
            if (maxD.front() < left) maxD.pop_front();
            if (minD.front() < left) minD.pop_front();
        }
        best = max(best, right - left + 1);
    }
    return best;
}

// Sliding window MINIMUM: same as maximum with the comparison flipped.
vector<int> windowMin(const vector<int>& a, int k) {
    deque<int> dq;                                  // values increasing front -> back
    vector<int> res;
    for (int i = 0; i < (int)a.size(); i++) {
        if (!dq.empty() && dq.front() <= i - k) dq.pop_front();
        while (!dq.empty() && a[dq.back()] >= a[i]) dq.pop_back();
        dq.push_back(i);
        if (i >= k - 1) res.push_back(a[dq.front()]);
    }
    return res;
}

int main() {
    cout << longestSubarray({8, 2, 4, 7}, 4) << "\\n";           // 2
    cout << longestSubarray({10, 1, 2, 4, 7, 2}, 5) << "\\n";    // 4
    for (int x : windowMin({4, 2, 12, 3, 8, 1}, 3)) cout << x << " ";   // 2 2 3 1
    cout << "\\n";
}` }] }, { lang: 'python', run: true, title: 'Sliding window maximum in Python (runnable)', code: `from collections import deque

def max_sliding_window(nums, k):
    dq, res = deque(), []          # indices, values decreasing front -> back
    for i, x in enumerate(nums):
        if dq and dq[0] <= i - k:  # front left the window
            dq.popleft()
        while dq and nums[dq[-1]] <= x:
            dq.pop()               # beaten by a newer, bigger value
        dq.append(i)
        if i >= k - 1:
            res.append(nums[dq[0]])
    return res

print(max_sliding_window([1, 3, -1, -3, 5, 3, 6, 7], 3))  # [3, 3, 5, 5, 6, 7]` }],
    codeTitle: ['Two deques (max − min ≤ limit) + window minimum'],
    examples: [
      {
        title: 'k = 1 and k = N (edge cases)',
        html: `<p><b>k = 1</b>: every window is a single element, so the answer is the array itself; the deque never holds more than one index. <b>k = N</b>: one window, the answer is the global maximum; nothing ever expires. Good quick tests for off-by-one errors in <code>i ≥ k − 1</code> and <code>dq.peekFirst() ≤ i − k</code>.</p>`
      },
      {
        title: 'Window minimum: [4, 2, 12, 3, 8, 1], k = 3',
        html: `${H.table(['window', 'deque (values, increasing)', 'min'], [
          ['[4 2 12]', '2, 12', '2'], ['[2 12 3]', '2, 3 (12 beaten by 3)', '2'], ['[12 3 8]', '3, 8 (2 expired)', '3'], ['[3 8 1]', '1 (all beaten)', '1']
        ])}<p>Flip the comparison: pop the back while it is <b>≥</b> the newcomer, keeping values increasing.</p>`
      },
      {
        title: 'Two deques: longest subarray with max − min ≤ 5 in [10, 1, 2, 4, 7, 2]',
        html: `<p>Grow <code>right</code>; when <code>max − min &gt; 5</code>, move <code>left</code> forward and drop expired fronts. The window [2, 4, 7, 2] (indices 2..5) has max 7, min 2, difference 5 → length <b>4</b>. The deques give the window max and min in O(1) each step, so the whole scan is O(N).</p>`
      },
      {
        title: 'Heap alternative and why it is slower',
        html: `<p>A max-heap of (value, index) with <b>lazy deletion</b> also works: push each element, and while the top's index is outside the window, pop it. That is O(N log N) and uses more memory. The deque wins because it throws away dominated elements immediately instead of keeping them sorted.</p>`
      }
    ],
    deepDive: `<p><b>Dominance is the key idea.</b> Index j is <i>dominated</i> by a later index i if a[i] ≥ a[j]: i is at least as good and leaves the window later, so j can never be the answer again. The deque stores exactly the non-dominated indices of the current window, which forces values to be decreasing and indices increasing — so the front is both the oldest survivor and the maximum.</p>
      <p><b>Complexity.</b> Each index is added once and removed once (either expired from the front or dominated at the back) → at most 2N deque operations → O(N) time, O(k) extra space. This beats a heap (O(N log k)) and a balanced tree/<code>TreeMap</code> with counts (O(N log k)), and a sparse table (O(N log N) preprocessing, O(1) query — useful only when windows have arbitrary sizes).</p>
      <p><b>Monotonic deque + DP.</b> Many DP recurrences look like <code>dp[i] = a[i] + max(dp[i-k..i-1])</code> (Jump Game VI, Constrained Subsequence Sum). The inner max over a sliding range is exactly sliding window maximum, so the DP drops from O(N·k) to O(N). Shortest Subarray with Sum ≥ K (with negatives) uses an <b>increasing</b> deque of prefix sums: pop the front while it forms a valid answer (it can only get longer later), pop the back while it is ≥ the current prefix (dominated). This family is called "monotone queue optimisation".</p>
      <p><b>Ties.</b> Popping with <code>≤</code> keeps only the newest copy of equal values, which stays in the window longest — correct and slightly smaller deques. Popping with <code>&lt;</code> also works because the expiry check uses indices.</p>
      <p><b>Container details:</b> in Java use <code>ArrayDeque&lt;Integer&gt;</code> with <code>peekFirst/pollFirst/peekLast/pollLast/offerLast</code>; for maximum speed, a plain <code>int[] dq</code> with <code>head</code> and <code>tail</code> indices (no wrap needed because each index enters once) removes all boxing.</p>`,
    aiEra: `<p><b>What AI changes:</b> sliding window maximum is a well-known hard problem and every model produces the deque solution. Interviewers increasingly test whether you can <b>reuse</b> the deque inside something else — two deques for max − min, a deque of prefix sums for "shortest subarray with sum ≥ K", or a deque inside a DP transition.</p>
      <p><b>Use AI as a partner:</b> <code>"Give me a DP problem whose transition is a sliding window max, but don't tell me which one"</code>, or ask it to <code>"write a brute-force O(N·k) checker and fuzz my deque solution with random arrays including duplicates and negatives"</code>.</p>
      <p><b>Where AI goes wrong:</b> storing values instead of indices (cannot detect expiry), using <code>while</code> for expiry but with <code>&lt;</code> instead of <code>≤ i − k</code> (off-by-one), answering before the first window is full, and using a heap without removing expired elements.</p>
      <p><b>What you must still own:</b> the dominance argument in one sentence ("newer and bigger means the older one is useless forever") and the ability to spot a "max/min over a sliding range" hidden inside a larger problem.</p>`,
    viz: {
      title: 'Sliding window maximum with a deque of indices',
      input: '1 3 -1 -3 5 3 6 7 | 3',
      inputLabel: 'array | k   (up to 14 numbers)',
      gen: function (input) {
        var s = input === undefined ? '1 3 -1 -3 5 3 6 7 | 3' : String(input);
        var sp = s.split('|');
        if (sp.length !== 2) throw new Error('Format: numbers | k   e.g. "1 3 -1 -3 5 3 6 7 | 3"');
        var a = parseNums(sp[0], '1 3 -1 -3 5 3 6 7', 14, 2);
        var k = Number(sp[1].trim());
        if (!sp[1].trim().length || isNaN(k) || Math.floor(k) !== k || k < 1 || k > a.length) throw new Error('k must be a whole number between 1 and the array length.');
        var n = a.length, dq = [], res = [], frames = [];
        function items() { return dq.map(function (x) { return 'i' + x + ' (' + a[x] + ')'; }); }
        frames.push({ narr: 'Window size k = ' + k + '. The deque keeps indices whose values <b>decrease</b> from front to back; the front is always the window maximum.', parts: [
          { type: 'array', label: 'a', values: a }, { type: 'queue', label: 'deque of indices', items: [], frontLabel: 'front (max)', backLabel: 'back' }
        ] });
        for (var i = 0; i < n; i++) {
          var lo = Math.max(0, i - k + 1), notes = [], hlQ = {}, removed = false;
          if (dq.length && dq[0] <= i - k) {
            hlQ[0] = 'bad'; removed = true;
            notes.push('front index ' + dq[0] + ' is outside the window [' + lo + '..' + i + '] → <span class="c-r">pollFirst</span>');
          }
          var j = dq.length - 1, beaten = [];
          while (j >= (removed ? 1 : 0) && a[dq[j]] <= a[i]) { hlQ[j] = 'bad'; beaten.push(a[dq[j]]); j--; }
          if (beaten.length) notes.push('back value(s) ' + beaten.join(', ') + ' ≤ ' + a[i] + ' can never be a max again → <span class="c-r">pollLast</span>');
          if (notes.length) {
            frames.push({ narr: 'i = ' + i + ' (value ' + a[i] + '): ' + notes.join('; ') + '.', parts: [
              { type: 'array', label: 'a', values: a, range: [lo, i], hl: one(i, 'cur'), ptr: one(i, 'i') },
              { type: 'queue', label: 'deque of indices', items: items(), hl: hlQ, frontLabel: 'front (max)', backLabel: 'back' },
              { type: 'array', label: 'window maxima', values: res.length ? res.slice() : ['—'] }
            ] });
            if (removed) dq.shift();
            dq.length = j + 1 - (removed ? 1 : 0);
          }
          dq.push(i);
          var full = i >= k - 1;
          if (full) res.push(a[dq[0]]);
          var hA = one(i, 'cur');
          if (full) hA[dq[0]] = 'sel';
          frames.push({ narr: '<span class="c-g">offerLast(' + i + ')</span>. ' + (full ? 'Window [' + lo + '..' + i + '] is full → max = a[front] = a[' + dq[0] + '] = <b>' + a[dq[0]] + '</b>.' : 'The first window is not full yet (need ' + k + ' items), no answer yet.'), parts: [
            { type: 'array', label: 'a', values: a, range: [lo, i], hl: hA, ptr: one(i, 'i') },
            { type: 'queue', label: 'deque of indices', items: items(), hl: (function () { var h = {}; h[dq.length - 1] = 'ok'; if (full) h[0] = 'sel'; return h; })(), frontLabel: 'front (max)', backLabel: 'back' },
            { type: 'array', label: 'window maxima', values: res.length ? res.slice() : ['—'], hl: full ? one(res.length - 1, 'ok') : {} }
          ] });
        }
        frames.push({ narr: 'Done: ' + res.length + ' windows. Every index entered the deque once and left at most once → O(N) total.', parts: [
          { type: 'array', label: 'a', values: a }, { type: 'array', label: 'window maxima', values: res.slice(), hl: (function () { var h = {}; for (var q = 0; q < res.length; q++) h[q] = 'sel'; return h; })() }
        ] });
        return frames;
      }
    },
    problems: [{
      title: 'Sliding Window Maximum',
      level: 'Hard',
      tags: ['monotonic deque', 'sliding window'],
      statement: `<p>Given an array <code>nums</code> and a window size <code>k</code>, a window of size <code>k</code> slides from the far left to the far right, one step at a time. Return an array with the <b>maximum of each window</b>.</p>`,
      constraints: `1 ≤ k ≤ N ≤ 10<sup>5</sup>, -10<sup>4</sup> ≤ nums[i] ≤ 10<sup>4</sup>`,
      example: `${H.arr([1, 3, -1, -3, 5, 3, 6, 7], { label: 'nums', hl: { 2: 'b', 3: 'b', 4: 'y' } })}<p>k = 3 → output ${H.arr([3, 3, 5, 5, 6, 7], { label: 'max', hl: { 2: 'g' } })}</p>
        <p>For example the window ${H.c('b', '[-1, -3,')} ${H.c('y', '5]')} (indices 2..4) has maximum ${H.c('g', '5')}. There are N - k + 1 = 6 windows.</p>`,
      brute: {
        why: `<p>For each of the N - k + 1 windows, loop over its k items to find the max → <b>O(N·K)</b>; with N = 10<sup>5</sup> and k = 5·10<sup>4</sup> that is ~2.5·10<sup>9</sup>. The waste: neighbouring windows share k - 1 items, but we re-scan them all every time.</p>`,
        code: `
int[] maxSlidingWindowBrute(int[] nums, int k) {
    int n = nums.length;
    int[] res = new int[n - k + 1];
    for (int start = 0; start + k <= n; start++) {
        int best = Integer.MIN_VALUE;
        for (int j = start; j < start + k; j++) best = Math.max(best, nums[j]);   // rescan whole window
        res[start] = best;
    }
    return res;
}`
      },
      mcq: {
        q: 'k = 3, deque (front→back) holds <code>2:9, 4:6</code> (index:value). Now i = 5 arrives with value 7. What is the deque after processing i = 5?',
        options: ['<code>2:9, 4:6, 5:7</code>', '<code>5:7</code>', '<code>4:6, 5:7</code>', '<code>2:9, 5:7</code>'],
        answer: 1,
        explain: 'The window is now indices [3..5]. Front index 2 ≤ 5 - 3 = 2, so it has expired → pollFirst (even though 9 is big!). Then the back value 6 ≤ 7 → pollLast. Finally offerLast(5). Deque = <code>5:7</code>, and the window max is 7.'
      },
      hints: [
        `<p>Aha: if <code>j &lt; i</code> and <code>a[j] ≤ a[i]</code>, then <code>a[j]</code> can <b>never</b> be the maximum of any future window — <code>a[i]</code> is at least as big and stays longer. So we can throw <code>j</code> away for good.</p>`,
        `<p>Use a deque of indices with values decreasing from front to back. Front = current max. Remove from the <b>front</b> when the index leaves the window; remove from the <b>back</b> when beaten by the newcomer.</p>`,
        `<p>Traps: store <b>indices</b> (you need them to detect expiry); the expiry test is <code>front ≤ i - k</code>; only record answers when <code>i ≥ k - 1</code>; result length is <code>n - k + 1</code>. Recipe: for i: drop expired front; pop back while a[back] ≤ a[i]; offerLast(i); if i ≥ k-1: res[i-k+1] = a[front].</p>`
      ],
      tests: { sig: "int[] int -> int[]", fn: "maxSlidingWindow", cases: [
        [[[1,3,-1,-3,5,3,6,7],3],[3,3,5,5,6,7]],
        [[[1],1],[1]],
        [[[4,2,7],1],[4,2,7]],
        [[[4,2,7],3],[7]],
        [[[9,8,7,6,5],2],[9,8,7,6]],
        [[[-10000,-10000,-9999],2],[-10000,-9999]],
        [[[2,2,2,2],2],[2,2,2]],
        [[[1,3,1,2,0,5],3],[3,3,2,5]],
        [[{"$range":[0,100000,1]},50000],{"$range":[49999,100000,1]}]
      ] },
      solution: {
        approach: `<p>Monotonic (decreasing) deque of indices; the front is the max of the current window.</p>`,
        code: `
import java.util.*;

class Solution {
    public int[] maxSlidingWindow(int[] nums, int k) {
        int n = nums.length;
        int[] res = new int[n - k + 1];
        Deque<Integer> dq = new ArrayDeque<>();           // indices, values decreasing front -> back
        for (int i = 0; i < n; i++) {
            // 1) the front index fell out of the window [i-k+1 .. i]
            if (!dq.isEmpty() && dq.peekFirst() <= i - k) {
                dq.pollFirst();
            }
            // 2) smaller-or-equal values at the back can never be a max again
            while (!dq.isEmpty() && nums[dq.peekLast()] <= nums[i]) {
                dq.pollLast();
            }
            // 3) the newcomer joins at the back
            dq.offerLast(i);
            // 4) once the first window is complete, the front holds the max
            if (i >= k - 1) {
                res[i - k + 1] = nums[dq.peekFirst()];
            }
        }
        return res;
    }

    public static void main(String[] args) {
        int[] r = new Solution().maxSlidingWindow(new int[]{1, 3, -1, -3, 5, 3, 6, 7}, 3);
        System.out.println(Arrays.toString(r));           // [3, 3, 5, 5, 6, 7]
    }
}`,
        dry: {
          head: ['i', 'nums[i]', 'expired front', 'popped from back', 'deque after (i:val)', 'res'],
          rows: [
            ['0', '1', '—', '—', '0:1', '—'],
            ['1', '3', '—', '<span class="c-r">0:1</span>', '1:3', '—'],
            ['2', '-1', '—', '—', '1:3, 2:-1', '[3]'],
            ['3', '-3', '— (1 &gt; 0)', '—', '1:3, 2:-1, 3:-3', '[3,3]'],
            ['4', '5', '<span class="c-r">1:3</span> (1 ≤ 1)', '<span class="c-r">3:-3, 2:-1</span>', '4:5', '[3,3,5]'],
            ['5', '3', '—', '—', '4:5, 5:3', '[3,3,5,5]'],
            ['6', '6', '— (4 &gt; 3)', '<span class="c-r">5:3, 4:5</span>', '6:6', '[3,3,5,5,6]'],
            ['7', '7', '—', '<span class="c-r">6:6</span>', '7:7', '<span class="c-p">[3,3,5,5,6,7]</span>']
          ]
        },
        alt: [{ lang: 'python', code: `from collections import deque


class Solution:
    def max_sliding_window(self, nums: list[int], k: int) -> list[int]:
        dq, res = deque(), []              # indices, values decreasing front -> back
        for i, x in enumerate(nums):
            if dq and dq[0] <= i - k:      # 1) the front fell out of the window
                dq.popleft()
            while dq and nums[dq[-1]] <= x:
                dq.pop()                   # 2) beaten by a newer, bigger value
            dq.append(i)                   # 3) the newcomer joins at the back
            if i >= k - 1:
                res.append(nums[dq[0]])    # 4) the front holds the window max
        return res` }, { lang: 'js', code: `function maxSlidingWindow(nums, k) {
  // Each index enters once, so a plain array with a head pointer is a fine deque.
  const dq = new Int32Array(nums.length);
  let head = 0, tail = 0;                      // live part is dq[head..tail-1]
  const res = [];
  for (let i = 0; i < nums.length; i++) {
    if (head < tail && dq[head] <= i - k) head++;                   // front left the window
    while (head < tail && nums[dq[tail - 1]] <= nums[i]) tail--;    // dominated at the back
    dq[tail++] = i;
    if (i >= k - 1) res.push(nums[dq[head]]);                       // front = window max
  }
  return res;
}` }, { lang: 'cpp', code: `class Solution {
public:
    vector<int> maxSlidingWindow(const vector<int>& nums, int k) {
        deque<int> dq;                           // indices, values decreasing front -> back
        vector<int> res;
        for (int i = 0; i < (int)nums.size(); i++) {
            if (!dq.empty() && dq.front() <= i - k) dq.pop_front();          // expired
            while (!dq.empty() && nums[dq.back()] <= nums[i]) dq.pop_back(); // dominated
            dq.push_back(i);
            if (i >= k - 1) res.push_back(nums[dq.front()]);                 // window max
        }
        return res;
    }
};` }],
        complexity: `<p><b>Time O(N)</b>: each index is offered once and polled at most once (front or back) → at most 2N deque operations. <b>Space O(k)</b>: the deque only holds indices inside the current window (plus the O(N - k + 1) output).</p>`
      }
    }]
  });

  // =====================================================================
  // PRACTICE ARENA — Easy
  // =====================================================================
  practice.push({
    title: 'Backspace String Compare',
    level: 'Easy',
    tags: ['stack', 'string', 'simulation'],
    companies: ['Google', 'Meta', 'Amazon'],
    statement: `<p>Given two strings <code>s</code> and <code>t</code>, return <code>true</code> if they are equal when both are typed into empty text editors. <code>#</code> means a backspace. Backspacing an empty editor keeps it empty.</p>`,
    constraints: `1 ≤ s.length, t.length ≤ 200; only lowercase letters and <code>#</code>`,
    example: `<p>s = <code>"ab#c"</code> → typed result ${H.c('g', '"ac"')}; t = <code>"ad#c"</code> → ${H.c('g', '"ac"')}. Output <b>true</b>.</p>
      <p>s = <code>"a#c"</code> → "c", t = <code>"b"</code> → "b". Output ${H.c('r', 'false')}.</p>`,
    brute: {
      why: `<p>Find the first <code>#</code>, cut it and the character before it out of the string, repeat. Every cut builds a new string (O(N)), and there can be N cuts → <b>O(N<sup>2</sup>)</b>. The waste: we rebuild the whole string to undo one character, while the "last typed character" is exactly the top of a stack.</p>`,
      code: `
boolean backspaceCompareBrute(String s, String t) {
    return apply(s).equals(apply(t));
}

String apply(String s) {
    while (s.contains("#")) {
        int i = s.indexOf('#');
        // remove the '#' and the character before it (if any)
        s = (i > 0 ? s.substring(0, i - 1) : "") + s.substring(i + 1);
    }
    return s;
}`
    },
    mcq: { q: 'Which structure naturally models "backspace deletes the most recently typed character"?', options: ['Queue', 'Stack', 'HashSet', 'Sorted array'], answer: 1, explain: 'Backspace removes the newest character first: last in, first out.' },
    hints: [
      `<p>Aha: typing pushes a character, backspace pops the newest one. The final text is whatever is left on the stack, from bottom to top.</p>`,
      `<p>A growable string is a perfect char stack: Java <code>StringBuilder</code> (<code>append</code> / <code>deleteCharAt(length - 1)</code>), a Python <code>list</code> joined at the end, a JS array, or a C++ <code>std::string</code> (<code>push_back</code> / <code>pop_back</code>). Build both strings, then compare.</p>`,
      `<p>Edge cases: <code>#</code> on an empty editor does nothing (check length &gt; 0); strings like <code>"##a"</code>. Follow-up: O(1) extra space by walking both strings from the <b>end</b> with a "skip" counter.</p>`
    ],
    tests: { sig: "string string -> bool", fn: "backspaceCompare", cases: [
      [["ab#c","ad#c"],true],
      [["a#c","b"],false],
      [["ab##","c#d#"],true],
      [["a##c","#a#c"],true],
      [["###","#"],true],
      [["bxj##tw","bxo#j##tw"],true],
      [["y#fo##f","y#f#o##f"],true],
      [["abc","abd"],false],
      [["a","aa#"],true]
    ] },
    solution: {
      approach: `<p>Simulate the editor with a character stack for each string and compare the results.</p>`,
      code: `
class Solution {
    private String type(String s) {
        StringBuilder st = new StringBuilder();          // used as a stack of characters
        for (char c : s.toCharArray()) {
            if (c != '#') st.append(c);                  // type a character = push
            else if (st.length() > 0) st.deleteCharAt(st.length() - 1);   // backspace = pop
        }
        return st.toString();
    }

    public boolean backspaceCompare(String s, String t) {
        return type(s).equals(type(t));
    }

    public static void main(String[] args) {
        System.out.println(new Solution().backspaceCompare("ab#c", "ad#c"));   // true
        System.out.println(new Solution().backspaceCompare("a#c", "b"));       // false
    }
}`,
      dry: { head: ['char of "ab#c"', 'action', 'stack'], rows: [['a', 'push', 'a'], ['b', 'push', 'ab'], ['#', 'pop', 'a'], ['c', 'push', '<span class="c-g">ac</span>']] },
      alt: [{ lang: 'python', code: `class Solution:
    def backspace_compare(self, s: str, t: str) -> bool:
        def typed(text: str) -> str:
            st = []                          # a list is the character stack
            for c in text:
                if c != '#':
                    st.append(c)             # type a character = push
                elif st:
                    st.pop()                 # backspace = pop (ignored when empty)
            return ''.join(st)
        return typed(s) == typed(t)` }, { lang: 'js', code: `function backspaceCompare(s, t) {
  const typed = (text) => {
    const st = [];                         // array as a character stack
    for (const c of text) {
      if (c !== '#') st.push(c);           // type a character = push
      else st.pop();                       // backspace = pop (pop on [] is harmless)
    }
    return st.join('');
  };
  return typed(s) === typed(t);
}` }, { lang: 'cpp', code: `class Solution {
    static string typed(const string& text) {
        string st;                           // std::string as a character stack
        for (char c : text) {
            if (c != '#') st.push_back(c);   // type a character = push
            else if (!st.empty()) st.pop_back();   // backspace = pop
        }
        return st;
    }
public:
    bool backspaceCompare(const string& s, const string& t) { return typed(s) == typed(t); }
};` }],
      complexity: `<p><b>Time O(N + M)</b>, <b>space O(N + M)</b> for the two builders. The two-pointer-from-the-end version keeps O(N + M) time with O(1) space.</p>`,
      followUps: ['Do it in O(1) extra space.', 'What if the editor also supports an "undo" command?']
    }
  });

  practice.push({
    title: 'Remove All Adjacent Duplicates in String',
    level: 'Easy',
    tags: ['stack', 'string'],
    companies: ['Meta', 'Bloomberg'],
    statement: `<p>Given a string <code>s</code> of lowercase letters, repeatedly remove two <b>adjacent equal</b> letters until no such pair remains. Return the final string (it is unique).</p>`,
    constraints: `1 ≤ s.length ≤ 10<sup>5</sup>`,
    example: `<p><code>"abbaca"</code>: remove ${H.c('r', '"bb"')} → <code>"aaca"</code>, remove ${H.c('r', '"aa"')} → <code>"ca"</code>. Output ${H.c('g', '"ca"')}. Removing a pair can create a <b>new</b> pair from the letters around it — that "chain reaction" is what a stack handles for free.</p>`,
    brute: {
      why: `<p>Scan for an adjacent equal pair, cut it out, start again from the beginning. Up to N/2 removals, each O(N) → <b>O(N<sup>2</sup>)</b> = 5·10<sup>9</sup> for N = 10<sup>5</sup>. The waste: after a cut, only the two letters <i>next to the cut</i> can form a new pair, yet we rescan everything.</p>`,
      code: `
String removeDuplicatesBrute(String s) {
    boolean changed = true;
    while (changed) {
        changed = false;
        for (int i = 0; i + 1 < s.length(); i++) {
            if (s.charAt(i) == s.charAt(i + 1)) {
                s = s.substring(0, i) + s.substring(i + 2);   // cut the pair, rebuild: O(N)
                changed = true;
                break;                                        // rescan from the start
            }
        }
    }
    return s;
}`
    },
    mcq: { q: 'The stack holds <code>c a</code> (a on top). The next letter is <code>a</code>. What happens?', options: ['Push a → c a a', 'Pop a → c', 'Pop both → empty', 'Ignore the new a'], answer: 1, explain: 'The new letter equals the top, so the pair cancels: pop the top and do not push the new letter.' },
    hints: [
      `<p>Aha: the only letter that can pair with the next one is the <b>last surviving</b> letter — the top of a stack.</p>`,
      `<p>Use a growable string as the stack (<code>StringBuilder</code> / list / array / <code>std::string</code>): if the last char equals the current one, delete it; otherwise append.</p>`,
      `<p>Edge cases: everything cancels (<code>"abba"</code> → ""), no duplicates at all. Recipe: for c in s: if sb not empty and last == c → delete last, else append c. Return sb.</p>`
    ],
    tests: { sig: "string -> string", fn: "removeDuplicates", cases: [
      [["abbaca"],"ca"],
      [["azxxzy"],"ay"],
      [["a"],"a"],
      [["aa"],""],
      [["abba"],""],
      [["aaa"],"a"],
      [["abc"],"abc"],
      [["aabbccd"],"d"],
      [[{"$rep":"a","n":100000}],""],
      [[{"$concat":[{"$rep":"ab","n":50000},"c"]}],{"$concat":[{"$rep":"ab","n":50000},"c"]}]
    ] },
    solution: {
      approach: `<p>One pass; the builder holds the letters that survived so far, and each new letter either cancels the top or is pushed.</p>`,
      code: `
class Solution {
    public String removeDuplicates(String s) {
        StringBuilder st = new StringBuilder();
        for (char c : s.toCharArray()) {
            int n = st.length();
            if (n > 0 && st.charAt(n - 1) == c) st.deleteCharAt(n - 1);   // pair cancels
            else st.append(c);                                          // survives for now
        }
        return st.toString();
    }

    public static void main(String[] args) {
        System.out.println(new Solution().removeDuplicates("abbaca"));   // ca
    }
}`,
      dry: { head: ['char', 'top before', 'action', 'stack'], rows: [['a', '—', 'push', 'a'], ['b', 'a', 'push', 'ab'], ['b', 'b', '<span class="c-r">pop</span>', 'a'], ['a', 'a', '<span class="c-r">pop</span>', '(empty)'], ['c', '—', 'push', 'c'], ['a', 'c', 'push', '<span class="c-g">ca</span>']] },
      alt: [{ lang: 'python', code: `class Solution:
    def remove_duplicates(self, s: str) -> str:
        st = []
        for c in s:
            if st and st[-1] == c:
                st.pop()                 # pair cancels
            else:
                st.append(c)             # survives for now
        return ''.join(st)` }, { lang: 'js', code: `function removeDuplicates(s) {
  const st = [];
  for (const c of s) {
    if (st.length && st[st.length - 1] === c) st.pop();   // pair cancels
    else st.push(c);                                      // survives for now
  }
  return st.join('');
}` }, { lang: 'cpp', code: `class Solution {
public:
    string removeDuplicates(const string& s) {
        string st;
        for (char c : s) {
            if (!st.empty() && st.back() == c) st.pop_back();   // pair cancels
            else st.push_back(c);                               // survives for now
        }
        return st;
    }
};` }],
      complexity: `<p><b>Time O(N)</b>: each letter is pushed once and popped at most once. <b>Space O(N)</b> for the builder.</p>`,
      followUps: ['Remove groups of K equal adjacent letters (LeetCode 1209): store (char, count) pairs.']
    }
  });

  practice.push({
    title: 'Next Greater Element I (two arrays)',
    level: 'Easy',
    tags: ['monotonic stack', 'hashmap'],
    companies: ['Amazon', 'Bloomberg'],
    statement: `<p><code>nums1</code> is a subset of <code>nums2</code>; all values are <b>distinct</b>. For each <code>x</code> in <code>nums1</code>, find the first element to the right of <code>x</code>'s position in <code>nums2</code> that is greater than <code>x</code>, or <code>-1</code>.</p>`,
    constraints: `1 ≤ nums1.length ≤ nums2.length ≤ 1000, values distinct, 0 ≤ value ≤ 10<sup>4</sup>`,
    example: `<p>nums1 = <code>[4, 1, 2]</code>, nums2 = <code>[1, 3, 4, 2]</code> → output <code>[-1, 3, -1]</code>.</p>
      <p>4 has nothing bigger to its right → ${H.c('r', '-1')}; 1 → ${H.c('g', '3')}; 2 is last → ${H.c('r', '-1')}.</p>`,
    brute: {
      why: `<p>For each query, find it in <code>nums2</code> and scan right: O(N·M) up to 10<sup>6</sup> — fine for these limits but it does not scale. The waste: every query re-walks the same parts of <code>nums2</code>.</p>`,
      code: `
int[] nextGreaterElementBrute(int[] nums1, int[] nums2) {
    int[] res = new int[nums1.length];
    for (int q = 0; q < nums1.length; q++) {
        res[q] = -1;
        int pos = 0;
        while (nums2[pos] != nums1[q]) pos++;                 // find it
        for (int j = pos + 1; j < nums2.length; j++) {
            if (nums2[j] > nums1[q]) { res[q] = nums2[j]; break; }
        }
    }
    return res;
}`
    },
    mcq: { q: 'Why can we store answers in a <code>HashMap</code> keyed by value?', options: ['Because the values are distinct', 'Because nums2 is sorted', 'Because HashMap is faster than arrays', 'We cannot'], answer: 0, explain: 'Distinct values mean each value has exactly one position in nums2, so value → next greater is well defined.' },
    hints: [
      `<p>Aha: compute the next greater element for <b>every</b> value of <code>nums2</code> once, then answer queries by lookup.</p>`,
      `<p>Monotonic decreasing stack over <code>nums2</code>; when <code>x</code> pops <code>y</code>, record <code>next[y] = x</code> in a hash map.</p>`,
      `<p>Values left on the stack have no greater element → look them up with a default of -1 (<code>getOrDefault</code> / <code>dict.get(v, -1)</code>). Recipe: for x in nums2: while top &lt; x: map[pop] = x; push x. Then res[i] = map[nums1[i]] or -1.</p>`
    ],
    tests: { sig: "int[] int[] -> int[]", fn: "nextGreaterElement", cases: [
      [[[4,1,2],[1,3,4,2]],[-1,3,-1]],
      [[[2,4],[1,2,3,4]],[3,-1]],
      [[[5],[5]],[-1]],
      [[[0],[0,10000]],[10000]],
      [[[3,2,1],[3,2,1]],[-1,-1,-1]],
      [[[1,3,5,2,4],[6,5,4,3,2,1,7]],[7,7,7,7,7]],
      [[[1,2,3],[1,2,3]],[2,3,-1]]
    ] },
    solution: {
      approach: `<p>Monotonic stack on nums2 + a hash map (<code>HashMap</code> / <code>dict</code> / <code>Map</code> / <code>unordered_map</code>) from value to its next greater value.</p>`,
      code: `
import java.util.*;

class Solution {
    public int[] nextGreaterElement(int[] nums1, int[] nums2) {
        Map<Integer, Integer> next = new HashMap<>();
        Deque<Integer> st = new ArrayDeque<>();          // values, decreasing bottom -> top
        for (int x : nums2) {
            while (!st.isEmpty() && st.peek() < x) next.put(st.pop(), x);
            st.push(x);
        }
        int[] res = new int[nums1.length];
        for (int i = 0; i < nums1.length; i++) res[i] = next.getOrDefault(nums1[i], -1);
        return res;
    }

    public static void main(String[] args) {
        System.out.println(Arrays.toString(new Solution().nextGreaterElement(new int[]{4, 1, 2}, new int[]{1, 3, 4, 2})));   // [-1, 3, -1]
    }
}`,
      alt: [{ lang: 'python', code: `class Solution:
    def next_greater_element(self, nums1: list[int], nums2: list[int]) -> list[int]:
        nxt = {}                              # value -> its next greater value in nums2
        st = []                               # values, decreasing bottom -> top
        for x in nums2:
            while st and st[-1] < x:
                nxt[st.pop()] = x
            st.append(x)
        return [nxt.get(x, -1) for x in nums1]` }, { lang: 'js', code: `function nextGreaterElement(nums1, nums2) {
  const next = new Map();                 // value -> its next greater value in nums2
  const st = [];                          // values, decreasing bottom -> top
  for (const x of nums2) {
    while (st.length && st[st.length - 1] < x) next.set(st.pop(), x);
    st.push(x);
  }
  return nums1.map((x) => (next.has(x) ? next.get(x) : -1));
}` }, { lang: 'cpp', code: `class Solution {
public:
    vector<int> nextGreaterElement(const vector<int>& nums1, const vector<int>& nums2) {
        unordered_map<int, int> next;           // value -> its next greater value in nums2
        vector<int> st;                         // values, decreasing bottom -> top
        for (int x : nums2) {
            while (!st.empty() && st.back() < x) { next[st.back()] = x; st.pop_back(); }
            st.push_back(x);
        }
        vector<int> res;
        for (int x : nums1) {
            auto it = next.find(x);
            res.push_back(it == next.end() ? -1 : it->second);
        }
        return res;
    }
};` }],
      complexity: `<p><b>Time O(N + M)</b>: one monotonic pass over nums2 plus O(1) lookups. <b>Space O(N)</b> for the map and stack.</p>`,
      followUps: ['What if values are not distinct? (Map by index instead.)']
    }
  });

  // =====================================================================
  // PRACTICE ARENA — Medium
  // =====================================================================
  practice.push({
    title: 'Daily Temperatures',
    level: 'Medium',
    tags: ['monotonic stack', 'next greater'],
    companies: ['Amazon', 'Meta', 'Google', 'Uber'],
    statement: `<p>Given daily temperatures, return an array <code>answer</code> where <code>answer[i]</code> is the number of days you have to wait after day <code>i</code> for a <b>warmer</b> temperature, or 0 if there is no such day.</p>`,
    constraints: `1 ≤ N ≤ 10<sup>5</sup>, 30 ≤ temperature ≤ 100`,
    example: `${H.arr([73, 74, 75, 71, 69, 72, 76, 73], { label: 'temps' })}${H.arr([1, 1, 4, 2, 1, 1, 0, 0], { label: 'answer', hl: { 2: 'g' } })}<p>Day 2 (75) waits 4 days until day 6 (76).</p>`,
    brute: {
      why: `<p>For each day scan forward to the first warmer day: O(N<sup>2</sup>) in the worst case (temperatures decreasing then one hot day at the end) = 5·10<sup>9</sup>. Waste: cold days are rescanned by every earlier day.</p>`,
      code: `
int[] dailyTemperaturesBrute(int[] t) {
    int n = t.length;
    int[] ans = new int[n];
    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            if (t[j] > t[i]) { ans[i] = j - i; break; }
        }
    }
    return ans;
}`
    },
    mcq: { q: 'What should the stack store for this problem?', options: ['Temperatures', 'Indices', 'Answers', 'Differences'], answer: 1, explain: 'The answer is a distance (j - i), so you need positions; the temperature can be read from the index.' },
    hints: [
      `<p>Aha: this is "next greater element", but the answer is the <b>distance</b> to it.</p>`,
      `<p>Decreasing stack of indices. When day <code>i</code> is warmer than the top day <code>j</code>, pop and set <code>ans[j] = i - j</code>.</p>`,
      `<p>Strictly warmer → pop while <code>t[top] &lt; t[i]</code> (equal temperatures keep waiting). Days left on the stack keep 0. Optimisation: temperatures are bounded (30..100), so a right-to-left "next occurrence" array also works.</p>`
    ],
    tests: { sig: "int[] -> int[]", fn: "dailyTemperatures", cases: [
      [[[73,74,75,71,69,72,76,73]],[1,1,4,2,1,1,0,0]],
      [[[30,40,50,60]],[1,1,1,0]],
      [[[30,60,90]],[1,1,0]],
      [[[50]],[0]],
      [[[70,70,70]],[0,0,0]],
      [[[100,90,80,30]],[0,0,0,0]],
      [[[55,38,53,81,61,93,97,32,43,78]],[3,1,1,2,1,1,0,1,1,0]],
      [[{"$concat":[{"$rep":99,"n":99999},[100]]}],{"$concat":[{"$range":[99999,0,-1]},[0]]}]
    ] },
    solution: {
      approach: `<p>Monotonic decreasing stack of indices; each pop fills one answer with the distance.</p>`,
      code: `
import java.util.*;

class Solution {
    public int[] dailyTemperatures(int[] t) {
        int n = t.length;
        int[] ans = new int[n];
        int[] st = new int[n];                 // int[] stack: faster than Deque<Integer>
        int top = 0;
        for (int i = 0; i < n; i++) {
            while (top > 0 && t[st[top - 1]] < t[i]) {
                int j = st[--top];             // day j finally sees a warmer day
                ans[j] = i - j;
            }
            st[top++] = i;
        }
        return ans;                            // remaining days keep 0
    }

    public static void main(String[] args) {
        System.out.println(Arrays.toString(new Solution().dailyTemperatures(new int[]{73, 74, 75, 71, 69, 72, 76, 73})));
    }
}`,
      dry: { head: ['i', 't[i]', 'popped → ans', 'stack (indices)'], rows: [['0', '73', '—', '0'], ['1', '74', '0 → 1', '1'], ['2', '75', '1 → 1', '2'], ['3', '71', '—', '2 3'], ['4', '69', '—', '2 3 4'], ['5', '72', '4 → 1, 3 → 2', '2 5'], ['6', '76', '5 → 1, 2 → <span class="c-g">4</span>', '6'], ['7', '73', '—', '6 7']] },
      alt: [{ lang: 'python', code: `class Solution:
    def daily_temperatures(self, t: list[int]) -> list[int]:
        ans = [0] * len(t)
        st = []                              # indices of days still waiting, temps decreasing
        for i, x in enumerate(t):
            while st and t[st[-1]] < x:      # today is warmer than those waiting days
                j = st.pop()
                ans[j] = i - j               # distance, so the stack stores indices
            st.append(i)
        return ans                           # remaining days keep 0` }, { lang: 'js', code: `function dailyTemperatures(t) {
  const n = t.length;
  const ans = new Array(n).fill(0);
  const st = new Int32Array(n);            // typed array as a fixed-size stack
  let top = 0;
  for (let i = 0; i < n; i++) {
    while (top > 0 && t[st[top - 1]] < t[i]) {
      const j = st[--top];                 // day j finally sees a warmer day
      ans[j] = i - j;
    }
    st[top++] = i;
  }
  return ans;                              // remaining days keep 0
}` }, { lang: 'cpp', code: `class Solution {
public:
    vector<int> dailyTemperatures(const vector<int>& t) {
        int n = t.size();
        vector<int> ans(n, 0), st;             // st: indices, temperatures decreasing
        for (int i = 0; i < n; i++) {
            while (!st.empty() && t[st.back()] < t[i]) {
                ans[st.back()] = i - st.back();   // day finally sees a warmer day
                st.pop_back();
            }
            st.push_back(i);
        }
        return ans;                            // remaining days keep 0
    }
};` }],
      complexity: `<p><b>Time O(N)</b> (each index pushed and popped once), <b>space O(N)</b>.</p>`
    }
  });

  practice.push({
    title: 'Next Greater Element II (circular array)',
    level: 'Medium',
    tags: ['monotonic stack', 'circular'],
    companies: ['Amazon', 'Google'],
    statement: `<p>Given a <b>circular</b> integer array (the element after the last is the first), return the next greater number for every element, searching circularly; <code>-1</code> if none exists.</p>`,
    constraints: `1 ≤ N ≤ 10<sup>4</sup>, -10<sup>9</sup> ≤ nums[i] ≤ 10<sup>9</sup>`,
    example: `<p><code>[1, 2, 3, 4, 3]</code> → <code>[2, 3, 4, -1, 4]</code>. The last 3 wraps around and finds ${H.c('g', '4')}; the maximum 4 gets ${H.c('r', '-1')}.</p>`,
    brute: {
      why: `<p>For each i, look at the next N − 1 positions <code>(i + d) % n</code>: O(N<sup>2</sup>) = 10<sup>8</sup>. It passes small limits but repeats the same comparisons for neighbouring elements.</p>`,
      code: `
int[] nextGreaterCircularBrute(int[] a) {
    int n = a.length;
    int[] res = new int[n];
    for (int i = 0; i < n; i++) {
        res[i] = -1;
        for (int d = 1; d < n; d++) {
            if (a[(i + d) % n] > a[i]) { res[i] = a[(i + d) % n]; break; }
        }
    }
    return res;
}`
    },
    mcq: { q: 'In the two-lap trick, why do we only push indices during the first lap?', options: ['To save memory only', 'Second-lap positions are the same elements; they only need to ANSWER waiting ones, not wait again', 'Because the second lap is sorted', 'It is a bug; we should push both laps'], answer: 1, explain: 'Every element already waits once (from lap 1). In lap 2 the elements act only as potential answers for the ones still waiting.' },
    hints: [
      `<p>Aha: walking the array <b>twice</b> simulates the wrap-around: an element near the end sees the start of the array during the second lap.</p>`,
      `<p>Loop <code>i</code> from 0 to <code>2n − 1</code>, use <code>x = a[i % n]</code>; pop smaller tops and give them x; push <code>i</code> only if <code>i &lt; n</code>.</p>`,
      `<p>Fill the result with -1 first; the global maximum (and equal copies) will never be popped. Duplicates: strictly greater → pop while <code>a[top] &lt; x</code>.</p>`
    ],
    tests: { sig: "int[] -> int[]", fn: "nextGreaterElements", cases: [
      [[[1,2,1]],[2,-1,2]],
      [[[1,2,3,4,3]],[2,3,4,-1,4]],
      [[[5]],[-1]],
      [[[3,3,3]],[-1,-1,-1]],
      [[[5,4,3,2,1]],[-1,5,5,5,5]],
      [[[-1000000000,1000000000,0]],[1000000000,-1,1000000000]],
      [[[1,5,3,6,8]],[5,6,6,8,-1]],
      [[{"$rep":7,"n":10000}],{"$rep":-1,"n":10000}]
    ] },
    solution: {
      approach: `<p>Monotonic stack over a doubled (virtual) array.</p>`,
      code: `
import java.util.*;

class Solution {
    public int[] nextGreaterElements(int[] a) {
        int n = a.length;
        int[] res = new int[n];
        Arrays.fill(res, -1);
        Deque<Integer> st = new ArrayDeque<>();
        for (int i = 0; i < 2 * n; i++) {
            int x = a[i % n];
            while (!st.isEmpty() && a[st.peek()] < x) res[st.pop()] = x;
            if (i < n) st.push(i);               // each index waits only once
        }
        return res;
    }

    public static void main(String[] args) {
        System.out.println(Arrays.toString(new Solution().nextGreaterElements(new int[]{1, 2, 3, 4, 3})));   // [2, 3, 4, -1, 4]
    }
}`,
      alt: [{ lang: 'python', code: `class Solution:
    def next_greater_elements(self, a: list[int]) -> list[int]:
        n = len(a)
        res = [-1] * n
        st = []
        for i in range(2 * n):               # two laps simulate the wrap-around
            x = a[i % n]
            while st and a[st[-1]] < x:
                res[st.pop()] = x
            if i < n:
                st.append(i)                 # each index waits only once
        return res` }, { lang: 'js', code: `function nextGreaterElements(a) {
  const n = a.length;
  const res = new Array(n).fill(-1);
  const st = [];
  for (let i = 0; i < 2 * n; i++) {        // two laps simulate the wrap-around
    const x = a[i % n];
    while (st.length && a[st[st.length - 1]] < x) res[st.pop()] = x;
    if (i < n) st.push(i);                 // each index waits only once
  }
  return res;
}` }, { lang: 'cpp', code: `class Solution {
public:
    vector<int> nextGreaterElements(const vector<int>& a) {
        int n = a.size();
        vector<int> res(n, -1), st;
        for (int i = 0; i < 2 * n; i++) {       // two laps simulate the wrap-around
            int x = a[i % n];
            while (!st.empty() && a[st.back()] < x) { res[st.back()] = x; st.pop_back(); }
            if (i < n) st.push_back(i);         // each index waits only once
        }
        return res;
    }
};` }],
      complexity: `<p><b>Time O(N)</b>: 2N iterations, each index pushed once and popped at most once. <b>Space O(N)</b>.</p>`
    }
  });

  practice.push({
    title: 'Minimum Remove to Make Valid Parentheses',
    level: 'Medium',
    tags: ['stack', 'parentheses', 'string'],
    companies: ['Meta', 'Amazon', 'Bloomberg'],
    statement: `<p>Given a string <code>s</code> of <code>(</code>, <code>)</code> and lowercase letters, remove the <b>minimum</b> number of parentheses so the result is valid. Return any valid result.</p>`,
    constraints: `1 ≤ s.length ≤ 10<sup>5</sup>`,
    example: `<p><code>"lee(t(c)o)de)"</code> → <code>"lee(t(c)o)de"</code>: the last ${H.c('r', ')')} has no partner.</p>
      <p><code>"))(("</code> → <code>""</code>: every bracket is unmatched.</p>`,
    brute: {
      why: `<p>BFS over strings: remove one bracket in every possible way, then two, ... and stop at the first valid string. That is exponential in the number of brackets. The waste: we try removing brackets that are perfectly matched, while a stack can tell us <i>exactly</i> which ones are unmatched.</p>`,
      code: `
String minRemoveBrute(String s) {
    Queue<String> q = new ArrayDeque<>();
    Set<String> seen = new HashSet<>();
    q.offer(s);
    seen.add(s);
    while (!q.isEmpty()) {
        String cur = q.poll();
        if (isValid(cur)) return cur;                    // first valid = fewest removals
        for (int i = 0; i < cur.length(); i++) {
            char c = cur.charAt(i);
            if (c != '(' && c != ')') continue;
            String next = cur.substring(0, i) + cur.substring(i + 1);
            if (seen.add(next)) q.offer(next);
        }
    }
    return "";
}

boolean isValid(String s) {
    int balance = 0;
    for (char c : s.toCharArray()) {
        if (c == '(') balance++;
        else if (c == ')' && --balance < 0) return false;
    }
    return balance == 0;
}`
    },
    mcq: { q: 'After scanning, the stack still holds indices 0 and 7. What are they?', options: ['Matched opens', 'Unmatched ( that must be removed', 'Unmatched ) that must be removed', 'Letters'], answer: 1, explain: 'Only ( indices are pushed. Anything left at the end never found a ), so it must be deleted.' },
    hints: [
      `<p>Aha: a bracket must be removed only if it is <b>unmatched</b>. A ) is unmatched if no ( is open when it arrives; a ( is unmatched if it is still open at the end.</p>`,
      `<p>Push <b>indices</b> of ( on a stack. On ): pop if possible, otherwise mark this ) for removal. At the end, mark every index still on the stack.</p>`,
      `<p>Build the answer in one pass, skipping marked indices (a boolean array or a set). Avoid deleting characters from the middle of a string in a loop — that is O(N<sup>2</sup>) in every language.</p>`
    ],
    tests: { sig: "string -> string", fn: "minRemoveToMakeValid", check: "(args, out, exp) => { if (typeof out !== 'string' || out.length !== exp.length) return false; let b = 0; for (const c of out) { if (c === '(') b++; else if (c === ')' && --b < 0) return false; } if (b !== 0) return false; const s = args[0]; let i = 0; for (const c of s) if (i < out.length && out[i] === c) i++; if (i !== out.length) return false; const letters = (x) => x.replace(/[()]/g, ''); return letters(out) === letters(s); }", cases: [
      [["lee(t(c)o)de)"],"lee(t(co)de)"],
      [["a)b(c)d"],"ab(c)d"],
      [["))(("],""],
      [["(a(b(c)d)"],"a(b(c)d)"],
      [["abc"],"abc"],
      [["("],""],
      [[")"],""],
      [["()"],"()"],
      [[")(a)("],"(a)"]
    ] },
    solution: {
      approach: `<p>Stack of indices finds every unmatched bracket in one pass; a second pass copies the rest.</p>`,
      code: `
import java.util.*;

class Solution {
    public String minRemoveToMakeValid(String s) {
        int n = s.length();
        boolean[] drop = new boolean[n];
        Deque<Integer> open = new ArrayDeque<>();        // indices of unmatched '('
        for (int i = 0; i < n; i++) {
            char c = s.charAt(i);
            if (c == '(') open.push(i);
            else if (c == ')') {
                if (open.isEmpty()) drop[i] = true;      // nothing to close
                else open.pop();                         // matched pair
            }
        }
        while (!open.isEmpty()) drop[open.pop()] = true; // never closed
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < n; i++) if (!drop[i]) sb.append(s.charAt(i));
        return sb.toString();
    }

    public static void main(String[] args) {
        System.out.println(new Solution().minRemoveToMakeValid("lee(t(c)o)de)"));   // lee(t(c)o)de
        System.out.println(new Solution().minRemoveToMakeValid("a)b(c)d"));         // ab(c)d
    }
}`,
      alt: [{ lang: 'python', code: `class Solution:
    def min_remove_to_make_valid(self, s: str) -> str:
        drop = set()
        open_idx = []                        # indices of unmatched '('
        for i, c in enumerate(s):
            if c == '(':
                open_idx.append(i)
            elif c == ')':
                if open_idx:
                    open_idx.pop()           # matched pair
                else:
                    drop.add(i)              # nothing to close
        drop.update(open_idx)                # never closed
        return ''.join(c for i, c in enumerate(s) if i not in drop)` }, { lang: 'js', code: `function minRemoveToMakeValid(s) {
  const chars = [...s];
  const open = [];                         // indices of unmatched '('
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] === '(') open.push(i);
    else if (chars[i] === ')') {
      if (open.length) open.pop();         // matched pair
      else chars[i] = '';                  // nothing to close: drop it
    }
  }
  for (const i of open) chars[i] = '';     // never closed: drop it
  return chars.join('');
}` }, { lang: 'cpp', code: `class Solution {
public:
    string minRemoveToMakeValid(const string& s) {
        vector<bool> drop(s.size(), false);
        vector<int> open;                       // indices of unmatched '('
        for (int i = 0; i < (int)s.size(); i++) {
            if (s[i] == '(') open.push_back(i);
            else if (s[i] == ')') {
                if (!open.empty()) open.pop_back();   // matched pair
                else drop[i] = true;                  // nothing to close
            }
        }
        for (int i : open) drop[i] = true;      // never closed
        string res;
        for (int i = 0; i < (int)s.size(); i++) if (!drop[i]) res += s[i];
        return res;
    }
};` }],
      complexity: `<p><b>Time O(N)</b>, <b>space O(N)</b> for the stack and marks. Minimality: each removed bracket is provably unmatched in every valid subsequence.</p>`,
      followUps: ['Return ALL valid strings with the minimum removals (LeetCode 301, BFS/backtracking).', 'Do it with O(1) extra space besides the output (two counter passes).']
    }
  });

  practice.push({
    title: 'Asteroid Collision',
    level: 'Medium',
    tags: ['stack', 'simulation'],
    companies: ['Amazon', 'Uber', 'Lyft'],
    statement: `<p>Each integer is an asteroid: absolute value = size, sign = direction (positive → right, negative → left), all moving at the same speed. When two meet, the smaller one explodes; equal sizes both explode. Asteroids moving the same direction never meet. Return the state after all collisions.</p>`,
    constraints: `2 ≤ N ≤ 10<sup>4</sup>, -1000 ≤ a[i] ≤ 1000, a[i] ≠ 0`,
    example: `${H.table(['input', 'output', 'why'], [['[5, 10, -5]', '[5, 10]', '-5 hits 10 and explodes'], ['[8, -8]', '[]', 'equal → both explode'], ['[10, 2, -5]', '[10]', '-5 destroys 2, then dies against 10'], ['[-2, -1, 1, 2]', '[-2, -1, 1, 2]', 'left-movers on the left never meet right-movers']])}`,
    brute: {
      why: `<p>Repeatedly look for an adjacent pair "positive then negative", resolve it, and restart: up to N collisions × O(N) rescans and list shifts → <b>O(N<sup>2</sup>)</b>. The waste: a left-moving asteroid only ever collides with the <b>most recent</b> surviving right-mover — a stack top.</p>`,
      code: `
int[] asteroidBrute(int[] asteroids) {
    List<Integer> list = new ArrayList<>();
    for (int a : asteroids) list.add(a);
    boolean changed = true;
    while (changed) {
        changed = false;
        for (int i = 0; i + 1 < list.size(); i++) {
            int l = list.get(i), r = list.get(i + 1);
            if (l > 0 && r < 0) {                       // they meet
                if (l > -r) list.remove(i + 1);
                else if (l < -r) list.remove(i);
                else { list.remove(i + 1); list.remove(i); }
                changed = true;
                break;
            }
        }
    }
    int[] res = new int[list.size()];
    for (int i = 0; i < res.length; i++) res[i] = list.get(i);
    return res;
}`
    },
    mcq: { q: 'Stack (bottom→top) is <code>[-3, 4, 2]</code>. Asteroid <code>-5</code> arrives. Final stack?', options: ['[-3, 4, 2, -5]', '[-3, -5]', '[-3, 4]', '[-5]'], answer: 1, explain: '-5 destroys 2 and 4 (both smaller). The top is now -3, also moving left, so no collision: push -5.' },
    hints: [
      `<p>Aha: only a <b>negative</b> asteroid arriving after <b>positive</b> ones causes collisions, and it hits the closest (most recent) positive first.</p>`,
      `<p>Stack of survivors. For a negative <code>a</code>: while the top is positive and smaller than <code>|a|</code>, pop it. Then handle the equal case (pop, a dies) and the bigger case (a dies).</p>`,
      `<p>Use an <code>alive</code> flag for the current asteroid. Push only if it survives. Positive asteroids are always pushed (they move away from everything on the left).</p>`
    ],
    tests: { sig: "int[] -> int[]", fn: "asteroidCollision", cases: [
      [[[5,10,-5]],[5,10]],
      [[[8,-8]],[]],
      [[[10,2,-5]],[10]],
      [[[-2,-1,1,2]],[-2,-1,1,2]],
      [[[1,-2,-2,-2]],[-2,-2,-2]],
      [[[1000,-1000]],[]],
      [[[-1000,1000]],[-1000,1000]],
      [[[1,2,3,-10]],[-10]],
      [[[3,-1,-2]],[3]],
      [[[-5,5]],[-5,5]],
      [[{"$concat":[{"$rep":1,"n":9999},[-1000]]}],[-1000]]
    ] },
    solution: {
      approach: `<p>Stack of surviving asteroids; each incoming left-mover fights the stack top until it dies or the top is no longer a right-mover.</p>`,
      code: `
import java.util.*;

class Solution {
    public int[] asteroidCollision(int[] asteroids) {
        Deque<Integer> st = new ArrayDeque<>();
        for (int a : asteroids) {
            boolean alive = true;
            while (alive && a < 0 && !st.isEmpty() && st.peek() > 0) {
                int top = st.peek();
                if (top < -a) st.pop();                          // top explodes, a continues
                else if (top == -a) { st.pop(); alive = false; } // both explode
                else alive = false;                              // a explodes
            }
            if (alive) st.push(a);
        }
        int[] res = new int[st.size()];
        for (int i = res.length - 1; i >= 0; i--) res[i] = st.pop();   // stack top is the rightmost
        return res;
    }

    public static void main(String[] args) {
        System.out.println(Arrays.toString(new Solution().asteroidCollision(new int[]{10, 2, -5})));   // [10]
    }
}`,
      dry: { head: ['a', 'fight', 'stack after'], rows: [['10', '—', '10'], ['2', '—', '10 2'], ['-5', '<span class="c-r">2 pops</span>; 10 &gt; 5 → -5 dies', '<span class="c-g">10</span>']] },
      alt: [{ lang: 'python', code: `class Solution:
    def asteroid_collision(self, asteroids: list[int]) -> list[int]:
        st = []                              # survivors; the end of the list is the rightmost
        for a in asteroids:
            alive = True
            while alive and a < 0 and st and st[-1] > 0:
                if st[-1] < -a:
                    st.pop()                 # top explodes, a keeps flying
                elif st[-1] == -a:
                    st.pop()                 # both explode
                    alive = False
                else:
                    alive = False            # a explodes
            if alive:
                st.append(a)
        return st` }, { lang: 'js', code: `function asteroidCollision(asteroids) {
  const st = [];                           // survivors; the end of the array is the rightmost
  for (const a of asteroids) {
    let alive = true;
    while (alive && a < 0 && st.length && st[st.length - 1] > 0) {
      const top = st[st.length - 1];
      if (top < -a) st.pop();              // top explodes, a keeps flying
      else if (top === -a) { st.pop(); alive = false; }   // both explode
      else alive = false;                  // a explodes
    }
    if (alive) st.push(a);
  }
  return st;
}` }, { lang: 'cpp', code: `class Solution {
public:
    vector<int> asteroidCollision(const vector<int>& asteroids) {
        vector<int> st;                         // survivors; back() is the rightmost
        for (int a : asteroids) {
            bool alive = true;
            while (alive && a < 0 && !st.empty() && st.back() > 0) {
                if (st.back() < -a) st.pop_back();                          // top explodes
                else if (st.back() == -a) { st.pop_back(); alive = false; } // both explode
                else alive = false;                                         // a explodes
            }
            if (alive) st.push_back(a);
        }
        return st;
    }
};` }],
      complexity: `<p><b>Time O(N)</b>: each asteroid is pushed and popped at most once. <b>Space O(N)</b>.</p>`
    }
  });

  practice.push({
    title: 'Decode String',
    level: 'Medium',
    tags: ['stack', 'string', 'nested'],
    companies: ['Google', 'Amazon', 'Bloomberg'],
    statement: `<p>Decode a string encoded as <code>k[encoded]</code>, meaning <code>encoded</code> is repeated exactly <code>k</code> times. Encodings can be nested. Digits only appear as repeat counts.</p>`,
    constraints: `1 ≤ s.length ≤ 30; k in [1, 300]; output length ≤ 10<sup>5</sup>`,
    example: `<p><code>"3[a2[c]]"</code> → inner ${H.c('b', '"2[c]" = "cc"')} → <code>"3[acc]"</code> → ${H.c('g', '"accaccacc"')}.</p>
      <p><code>"2[abc]3[cd]ef"</code> → <code>"abcabccdcdcdef"</code>.</p>`,
    brute: {
      why: `<p>Find the innermost bracket (first <code>]</code> and the nearest <code>[</code> before it), expand it, rebuild the string, repeat. Each expansion rebuilds the whole (possibly huge) string → roughly O(levels × output length). Acceptable for tiny inputs but wasteful: a stack expands each level exactly once, in place.</p>`,
      code: `
String decodeBrute(String s) {
    int close;
    while ((close = s.indexOf(']')) >= 0) {
        int open = s.lastIndexOf('[', close);            // innermost '[' for this ']'
        int start = open;
        while (start > 0 && Character.isDigit(s.charAt(start - 1))) start--;
        int times = Integer.parseInt(s.substring(start, open));
        String expanded = s.substring(open + 1, close).repeat(times);
        s = s.substring(0, start) + expanded + s.substring(close + 1);
    }
    return s;
}`
    },
    mcq: { q: 'When we read <code>[</code>, what must we save before starting a fresh inner string?', options: ['Nothing', 'Only the count k', 'The count k and the string built so far', 'The index of ['], answer: 2, explain: 'After the inner part is finished we need to repeat it k times and append it to the outer string we were building — both must be restored.' },
    hints: [
      `<p>Aha: brackets nest, so the most recently opened <code>[</code> closes first — a stack of "where was I?" states.</p>`,
      `<p>Two stacks: counts and outer strings built so far. On <code>[</code> push (k, current) and reset; on <code>]</code> pop them and append <code>current × k</code> to the outer builder.</p>`,
      `<p>Multi-digit counts like <code>"12[a]"</code>: build <code>k = k * 10 + digit</code>. Reset k after pushing. Letters just append to the current builder.</p>`
    ],
    tests: { sig: "string -> string", fn: "decodeString", cases: [
      [["3[a]2[bc]"],"aaabcbc"],
      [["3[a2[c]]"],"accaccacc"],
      [["2[abc]3[cd]ef"],"abcabccdcdcdef"],
      [["abc"],"abc"],
      [["10[a]"],"aaaaaaaaaa"],
      [["2[2[2[a]]]"],"aaaaaaaa"],
      [["1[x]"],"x"],
      [["ab3[c]d"],"abcccd"]
    ] },
    solution: {
      approach: `<p>Stack of (repeat count, outer string) frames — the explicit version of a recursive descent parser.</p>`,
      code: `
import java.util.*;

class Solution {
    public String decodeString(String s) {
        Deque<Integer> counts = new ArrayDeque<>();
        Deque<StringBuilder> outers = new ArrayDeque<>();
        StringBuilder cur = new StringBuilder();
        int k = 0;
        for (char c : s.toCharArray()) {
            if (Character.isDigit(c)) {
                k = k * 10 + (c - '0');                  // multi-digit count
            } else if (c == '[') {
                counts.push(k);                          // remember how many times
                outers.push(cur);                        // remember what came before
                cur = new StringBuilder();
                k = 0;
            } else if (c == ']') {
                int times = counts.pop();
                StringBuilder outer = outers.pop();
                outer.append(cur.toString().repeat(times));
                cur = outer;                             // continue the outer level
            } else {
                cur.append(c);
            }
        }
        return cur.toString();
    }

    public static void main(String[] args) {
        System.out.println(new Solution().decodeString("3[a2[c]]"));        // accaccacc
        System.out.println(new Solution().decodeString("2[abc]3[cd]ef"));   // abcabccdcdcdef
    }
}`,
      dry: { head: ['char', 'action', 'cur', 'stacks (count, outer)'], rows: [['3', 'k=3', '""', '—'], ['[', 'push (3, "")', '""', '(3,"")'], ['a', 'append', 'a', '(3,"")'], ['2', 'k=2', 'a', '(3,"")'], ['[', 'push (2, "a")', '""', '(3,"") (2,"a")'], ['c', 'append', 'c', '…'], [']', 'pop (2,"a") → "a"+"cc"', 'acc', '(3,"")'], [']', 'pop (3,"") → "" + "acc"×3', '<span class="c-g">accaccacc</span>', '—']] },
      alt: [{ lang: 'python', code: `class Solution:
    def decode_string(self, s: str) -> str:
        st = []                              # frames of (repeat count, outer parts)
        cur, k = [], 0
        for c in s:
            if c.isdigit():
                k = k * 10 + int(c)          # multi-digit count
            elif c == '[':
                st.append((k, cur))          # remember the count and what came before
                cur, k = [], 0
            elif c == ']':
                times, outer = st.pop()
                outer.append(''.join(cur) * times)
                cur = outer                  # continue the outer level
            else:
                cur.append(c)
        return ''.join(cur)` }, { lang: 'js', code: `function decodeString(s) {
  const st = [];                           // frames of [repeat count, outer string]
  let cur = '', k = 0;
  for (const c of s) {
    if (c >= '0' && c <= '9') {
      k = k * 10 + Number(c);              // multi-digit count
    } else if (c === '[') {
      st.push([k, cur]);                   // remember the count and what came before
      cur = ''; k = 0;
    } else if (c === ']') {
      const [times, outer] = st.pop();
      cur = outer + cur.repeat(times);     // continue the outer level
    } else {
      cur += c;
    }
  }
  return cur;
}` }, { lang: 'cpp', code: `class Solution {
public:
    string decodeString(const string& s) {
        vector<pair<int, string>> st;           // frames of (repeat count, outer string)
        string cur;
        int k = 0;
        for (char c : s) {
            if (isdigit((unsigned char)c)) {
                k = k * 10 + (c - '0');         // multi-digit count
            } else if (c == '[') {
                st.push_back({k, move(cur)});   // remember the count and what came before
                cur.clear(); k = 0;
            } else if (c == ']') {
                auto [times, outer] = move(st.back());
                st.pop_back();
                for (int i = 0; i < times; i++) outer += cur;
                cur = move(outer);              // continue the outer level
            } else {
                cur += c;
            }
        }
        return cur;
    }
};` }],
      complexity: `<p><b>Time O(output length)</b> (each output character is written a bounded number of times per nesting level), <b>space O(output length)</b>.</p>`
    }
  });

  practice.push({
    title: 'Remove K Digits',
    level: 'Medium',
    tags: ['monotonic stack', 'greedy'],
    companies: ['Google', 'Amazon', 'Microsoft'],
    statement: `<p>Given a non-negative integer as a string <code>num</code> and an integer <code>k</code>, remove exactly <code>k</code> digits so the remaining number is as <b>small</b> as possible. Return it without leading zeros ("0" if empty).</p>`,
    constraints: `1 ≤ k ≤ num.length ≤ 10<sup>5</sup>; num has no leading zeros except "0" itself`,
    example: `<p><code>"1432219"</code>, k = 3 → remove ${H.c('r', '4, 3, 2')} → ${H.c('g', '"1219"')}.</p><p><code>"10200"</code>, k = 1 → remove 1 → "0200" → <code>"200"</code>. <code>"10"</code>, k = 2 → <code>"0"</code>.</p>`,
    brute: {
      why: `<p>Remove one digit at a time, k times, each time trying all N positions and keeping the smallest string: O(k·N<sup>2</sup>) → far too slow for 10<sup>5</sup>. The waste: the best digit to remove is simply the first one that is bigger than its right neighbour — a monotonic stack finds all of them in one pass.</p>`,
      code: `
String removeKdigitsBrute(String num, int k) {
    for (int r = 0; r < k; r++) {
        String best = null;
        for (int i = 0; i < num.length(); i++) {
            String cand = num.substring(0, i) + num.substring(i + 1);
            if (best == null || cand.compareTo(best) < 0) best = cand;   // same length -> lexicographic = numeric
        }
        num = best;
    }
    int i = 0;
    while (i < num.length() - 1 && num.charAt(i) == '0') i++;
    num = num.substring(i);
    return num.isEmpty() ? "0" : num;
}`
    },
    mcq: { q: 'Stack is <code>1 4</code>, next digit is <code>3</code>, k = 3. What do we do?', options: ['Push 3', 'Pop 4 (k becomes 2), then push 3', 'Pop 4 and 1', 'Skip 3'], answer: 1, explain: 'A bigger digit before a smaller one should be removed (14… &gt; 13…). Pop 4, k-1; top 1 &lt; 3 stops; push 3.' },
    hints: [
      `<p>Aha: to minimise a number, its <b>leftmost</b> digits matter most. If a digit is bigger than the one after it, removing it always makes the number smaller.</p>`,
      `<p>Keep an <b>increasing</b> stack of digits. While <code>k &gt; 0</code> and the top is bigger than the current digit, pop (k--). Then push.</p>`,
      `<p>If k is still &gt; 0 at the end (e.g. "12345"), remove from the end. Strip leading zeros. Empty → "0". A growable string (or a list of digits) works as the stack.</p>`
    ],
    tests: { sig: "string int -> string", fn: "removeKdigits", cases: [
      [["1432219",3],"1219"],
      [["10200",1],"200"],
      [["10",2],"0"],
      [["9",1],"0"],
      [["12345",2],"123"],
      [["112",1],"11"],
      [["100",1],"0"],
      [["1111",2],"11"],
      [["54321",2],"321"],
      [["10001",4],"0"],
      [[{"$rep":"9","n":100000},99999],"9"]
    ] },
    solution: {
      approach: `<p>Greedy with a monotonic increasing stack: every pop removes a "peak" digit, the most valuable removal available.</p>`,
      code: `
class Solution {
    public String removeKdigits(String num, int k) {
        StringBuilder st = new StringBuilder();
        for (char c : num.toCharArray()) {
            while (k > 0 && st.length() > 0 && st.charAt(st.length() - 1) > c) {
                st.deleteCharAt(st.length() - 1);   // remove a bigger digit before a smaller one
                k--;
            }
            st.append(c);
        }
        st.setLength(st.length() - k);              // still need removals: cut the largest tail
        int i = 0;
        while (i < st.length() - 1 && st.charAt(i) == '0') i++;   // strip leading zeros
        String res = st.substring(i);
        return res.isEmpty() ? "0" : res;
    }

    public static void main(String[] args) {
        System.out.println(new Solution().removeKdigits("1432219", 3));   // 1219
        System.out.println(new Solution().removeKdigits("10200", 1));     // 200
        System.out.println(new Solution().removeKdigits("10", 2));        // 0
    }
}`,
      dry: { head: ['digit', 'pops (k after)', 'stack'], rows: [['1', '—', '1'], ['4', '—', '14'], ['3', '<span class="c-r">4</span> (2)', '13'], ['2', '<span class="c-r">3</span> (1)', '12'], ['2', '—', '122'], ['1', '<span class="c-r">2</span> (0)', '121'], ['9', '—', '<span class="c-g">1219</span>']] },
      alt: [{ lang: 'python', code: `class Solution:
    def remove_kdigits(self, num: str, k: int) -> str:
        st = []                              # digits, non-decreasing bottom -> top
        for c in num:
            while k and st and st[-1] > c:
                st.pop()                     # a bigger digit before a smaller one goes
                k -= 1
            st.append(c)
        if k:
            del st[-k:]                      # still need removals: cut the largest tail
        return ''.join(st).lstrip('0') or '0'` }, { lang: 'js', code: `function removeKdigits(num, k) {
  const st = [];                           // digits, non-decreasing bottom -> top
  for (const c of num) {
    while (k > 0 && st.length && st[st.length - 1] > c) {
      st.pop();                            // a bigger digit before a smaller one goes
      k--;
    }
    st.push(c);
  }
  st.length -= k;                          // still need removals: cut the largest tail
  let i = 0;
  while (i < st.length - 1 && st[i] === '0') i++;   // strip leading zeros
  return st.length ? st.slice(i).join('') : '0';
}` }, { lang: 'cpp', code: `class Solution {
public:
    string removeKdigits(const string& num, int k) {
        string st;                              // digits, non-decreasing bottom -> top
        for (char c : num) {
            while (k > 0 && !st.empty() && st.back() > c) { st.pop_back(); k--; }
            st.push_back(c);
        }
        st.resize(st.size() - k);               // still need removals: cut the largest tail
        size_t i = st.find_first_not_of('0');
        return i == string::npos ? "0" : st.substr(i);
    }
};` }],
      complexity: `<p><b>Time O(N)</b>, <b>space O(N)</b>.</p>`,
      followUps: ['Make the number as LARGE as possible instead.', 'Remove Duplicate Letters / Smallest Subsequence of Distinct Characters (LC 316/1081).']
    }
  });

  practice.push({
    title: 'Sum of Subarray Minimums',
    level: 'Medium',
    tags: ['monotonic stack', 'contribution technique'],
    companies: ['Amazon', 'Google'],
    statement: `<p>Given an integer array <code>arr</code>, return the sum of <code>min(b)</code> over every contiguous subarray <code>b</code>, modulo 10<sup>9</sup> + 7.</p>`,
    constraints: `1 ≤ N ≤ 3·10<sup>4</sup>, 1 ≤ arr[i] ≤ 3·10<sup>4</sup>`,
    example: `<p><code>[3, 1, 2, 4]</code>: subarrays and minimums: [3]=3, [1]=1, [2]=2, [4]=4, [3,1]=1, [1,2]=1, [2,4]=2, [3,1,2]=1, [1,2,4]=1, [3,1,2,4]=1. Sum = ${H.c('g', '17')}.</p>`,
    brute: {
      why: `<p>For every start i, extend j to the right keeping a running minimum: O(N<sup>2</sup>) = 9·10<sup>8</sup> — too slow. The waste: we never ask "for how many subarrays is a[i] the minimum?", which can be answered with two nearest-smaller boundaries.</p>`,
      code: `
int sumSubarrayMinsBrute(int[] arr) {
    long MOD = 1_000_000_007L, sum = 0;
    for (int i = 0; i < arr.length; i++) {
        int mn = Integer.MAX_VALUE;
        for (int j = i; j < arr.length; j++) {
            mn = Math.min(mn, arr[j]);
            sum = (sum + mn) % MOD;
        }
    }
    return (int) sum;
}`
    },
    mcq: { q: 'a[i] = 1 at index 1 of [3, 1, 2, 4]. Previous smaller index = -1, next smaller-or-equal index = 4. Contribution?', options: ['1', '1 × 2 × 3 = 6', '1 × 4 = 4', '1 × 2 = 2'], answer: 1, explain: 'Left choices: i − left = 2 (start at 0 or 1). Right choices: right − i = 3 (end at 1, 2 or 3). 2 × 3 = 6 subarrays have 1 as their minimum.' },
    hints: [
      `<p>Aha (contribution technique): instead of summing per subarray, ask for each element how many subarrays it is the minimum of, and add <code>a[i] × count</code>.</p>`,
      `<p>count = <code>(i − left[i]) × (right[i] − i)</code> where left = previous <b>strictly</b> smaller index and right = next smaller-<b>or-equal</b> index. Two monotonic stack passes.</p>`,
      `<p>Duplicates: strict on one side, non-strict on the other, so each subarray is counted exactly once. Use 64-bit arithmetic (<code>long</code> / <code>long long</code>; JS numbers are exact here, Python never overflows) and take the mod. Default left = -1, right = n.</p>`
    ],
    tests: { sig: "int[] -> int", fn: "sumSubarrayMins", cases: [
      [[[3,1,2,4]],17],
      [[[11,81,94,43,3]],444],
      [[[1]],1],
      [[[2,2,2]],12],
      [[[1,2,3,4]],20],
      [[[4,3,2,1]],20],
      [[[30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000,30000]],354499993],
      [[{"$rep":30000,"n":30000}],449905500]
    ] },
    solution: {
      approach: `<p>Nearest smaller boundaries with monotonic stacks + contribution counting.</p>`,
      code: `
import java.util.*;

class Solution {
    public int sumSubarrayMins(int[] arr) {
        final long MOD = 1_000_000_007L;
        int n = arr.length;
        int[] left = new int[n], right = new int[n];
        Deque<Integer> st = new ArrayDeque<>();
        for (int i = 0; i < n; i++) {                       // previous STRICTLY smaller
            while (!st.isEmpty() && arr[st.peek()] >= arr[i]) st.pop();
            left[i] = st.isEmpty() ? -1 : st.peek();
            st.push(i);
        }
        st.clear();
        for (int i = n - 1; i >= 0; i--) {                  // next smaller OR EQUAL
            while (!st.isEmpty() && arr[st.peek()] > arr[i]) st.pop();
            right[i] = st.isEmpty() ? n : st.peek();
            st.push(i);
        }
        long sum = 0;
        for (int i = 0; i < n; i++) {
            long count = (long) (i - left[i]) * (right[i] - i);   // subarrays where arr[i] is the min
            sum = (sum + arr[i] * count) % MOD;
        }
        return (int) sum;
    }

    public static void main(String[] args) {
        System.out.println(new Solution().sumSubarrayMins(new int[]{3, 1, 2, 4}));   // 17
    }
}`,
      dry: { head: ['i', 'a[i]', 'left', 'right', 'count', 'contribution'], rows: [['0', '3', '-1', '1', '1×1 = 1', '3'], ['1', '1', '-1', '4', '2×3 = 6', '6'], ['2', '2', '1', '4', '1×2 = 2', '4'], ['3', '4', '2', '4', '1×1 = 1', '4'], ['', '', '', '', 'total', '<span class="c-g">17</span>']] },
      alt: [{ lang: 'python', code: `class Solution:
    def sum_subarray_mins(self, arr: list[int]) -> int:
        MOD = 10**9 + 7
        n = len(arr)
        left, right = [-1] * n, [n] * n
        st = []
        for i, x in enumerate(arr):              # previous STRICTLY smaller
            while st and arr[st[-1]] >= x:
                st.pop()
            if st:
                left[i] = st[-1]
            st.append(i)
        st = []
        for i in range(n - 1, -1, -1):           # next smaller OR EQUAL
            while st and arr[st[-1]] > arr[i]:
                st.pop()
            if st:
                right[i] = st[-1]
            st.append(i)
        # arr[i] is the minimum of (i - left) * (right - i) subarrays
        return sum(x * (i - left[i]) * (right[i] - i) for i, x in enumerate(arr)) % MOD` }, { lang: 'js', code: `function sumSubarrayMins(arr) {
  const MOD = 1_000_000_007, n = arr.length;
  const left = new Array(n).fill(-1), right = new Array(n).fill(n);
  let st = [];
  for (let i = 0; i < n; i++) {                       // previous STRICTLY smaller
    while (st.length && arr[st[st.length - 1]] >= arr[i]) st.pop();
    if (st.length) left[i] = st[st.length - 1];
    st.push(i);
  }
  st = [];
  for (let i = n - 1; i >= 0; i--) {                  // next smaller OR EQUAL
    while (st.length && arr[st[st.length - 1]] > arr[i]) st.pop();
    if (st.length) right[i] = st[st.length - 1];
    st.push(i);
  }
  let sum = 0;
  for (let i = 0; i < n; i++) {
    // count * value <= 9e8 * 3e4 < 2^53, so Number stays exact before the mod
    sum = (sum + arr[i] * (i - left[i]) * (right[i] - i)) % MOD;
  }
  return sum;
}` }, { lang: 'cpp', code: `class Solution {
public:
    int sumSubarrayMins(const vector<int>& arr) {
        const long long MOD = 1'000'000'007LL;
        int n = arr.size();
        vector<int> left(n, -1), right(n, n), st;
        for (int i = 0; i < n; i++) {                     // previous STRICTLY smaller
            while (!st.empty() && arr[st.back()] >= arr[i]) st.pop_back();
            if (!st.empty()) left[i] = st.back();
            st.push_back(i);
        }
        st.clear();
        for (int i = n - 1; i >= 0; i--) {                // next smaller OR EQUAL
            while (!st.empty() && arr[st.back()] > arr[i]) st.pop_back();
            if (!st.empty()) right[i] = st.back();
            st.push_back(i);
        }
        long long sum = 0;
        for (int i = 0; i < n; i++) {
            long long count = 1LL * (i - left[i]) * (right[i] - i);   // subarrays with min arr[i]
            sum = (sum + arr[i] * count) % MOD;
        }
        return (int)sum;
    }
};` }],
      complexity: `<p><b>Time O(N)</b>, <b>space O(N)</b>. Max product 3·10<sup>4</sup> × 9·10<sup>8</sup> ≈ 2.7·10<sup>13</sup> fits in a long.</p>`,
      followUps: ['Sum of subarray ranges (max − min) — LC 2104.', 'Why would strict comparisons on both sides double-count [2, 2]?']
    }
  });

  practice.push({
    title: 'Design Circular Queue',
    level: 'Medium',
    tags: ['queue', 'design', 'circular buffer'],
    companies: ['Amazon', 'Microsoft', 'Apple'],
    statement: `<p>Design a fixed-capacity circular queue with <code>enQueue(v)</code>, <code>deQueue()</code> (both return success), <code>Front()</code>, <code>Rear()</code> (return -1 if empty), <code>isEmpty()</code> and <code>isFull()</code>. All operations must be O(1). Do not use a built-in queue.</p>`,
    constraints: `1 ≤ k ≤ 1000, 0 ≤ value ≤ 1000, at most 3000 calls`,
    example: `${H.table(['call', 'returns', 'buffer (k = 3)'], [['enQueue(1)', 'true', '[1, ·, ·]'], ['enQueue(2)', 'true', '[1, 2, ·]'], ['enQueue(3)', 'true', '[1, 2, 3]'], ['enQueue(4)', '<span class="c-r">false</span> (full)', '[1, 2, 3]'], ['Rear()', '3', ''], ['deQueue()', 'true', '[·, 2, 3] head → 1'], ['enQueue(4)', 'true', '[<b>4</b>, 2, 3] wrapped!'], ['Rear()', '<span class="c-g">4</span>', '']])}`,
    brute: {
      why: `<p>Use an <code>ArrayList</code>; <code>deQueue</code> = <code>remove(0)</code>, which shifts every remaining element left → <b>O(N)</b> per dequeue. The waste: moving data that did not change, when we could just move a <code>head</code> index.</p>`,
      code: `
import java.util.*;

class MyCircularQueueSlow {
    private final List<Integer> list = new ArrayList<>();
    private final int cap;
    public MyCircularQueueSlow(int k) { cap = k; }
    public boolean enQueue(int v) { if (list.size() == cap) return false; list.add(v); return true; }
    public boolean deQueue() { if (list.isEmpty()) return false; list.remove(0); return true; }   // O(N) shift
    public int Front() { return list.isEmpty() ? -1 : list.get(0); }
    public int Rear() { return list.isEmpty() ? -1 : list.get(list.size() - 1); }
    public boolean isEmpty() { return list.isEmpty(); }
    public boolean isFull() { return list.size() == cap; }
}`
    },
    mcq: { q: 'k = 4, head = 3, size = 2. At which index is the Rear element?', options: ['4', '0', '1', '3'], answer: 1, explain: 'Rear = (head + size − 1) % k = (3 + 2 − 1) % 4 = 0. The queue wrapped around.' },
    hints: [
      `<p>Aha: never move elements — move <b>indices</b> and let them wrap around with <code>% k</code>.</p>`,
      `<p>Store <code>int[] data</code>, <code>head</code> and <code>size</code>. Insert at <code>(head + size) % k</code>; remove by <code>head = (head + 1) % k</code>; rear at <code>(head + size − 1) % k</code>.</p>`,
      `<p>Keeping <code>size</code> avoids the classic "head == tail: empty or full?" ambiguity (the alternative is wasting one slot). Check full/empty before enQueue/deQueue.</p>`
    ],
    tests: { cls: "MyCircularQueue", sigs: {"MyCircularQueue":"int","enQueue":"int -> bool","deQueue":"-> bool","Front":"-> int","Rear":"-> int","isEmpty":"-> bool","isFull":"-> bool"}, cases: [
      {"ops":["MyCircularQueue","enQueue","enQueue","enQueue","enQueue","Rear","isFull","deQueue","enQueue","Rear"],"args":[[3],[1],[2],[3],[4],[],[],[],[4],[]],"out":[null,true,true,true,false,3,true,true,true,4]},
      {"ops":["MyCircularQueue","isEmpty","Front","Rear","deQueue"],"args":[[1],[],[],[],[]],"out":[null,true,-1,-1,false]},
      {"ops":["MyCircularQueue","enQueue","isFull","enQueue","Front","Rear","deQueue","isEmpty","Front"],"args":[[1],[7],[],[8],[],[],[],[],[]],"out":[null,true,true,false,7,7,true,true,-1]},
      {"ops":["MyCircularQueue","enQueue","enQueue","deQueue","enQueue","enQueue","deQueue","enQueue","Front","Rear","isFull"],"args":[[3],[1],[2],[],[3],[4],[],[5],[],[],[]],"out":[null,true,true,true,true,true,true,true,3,5,true]},
      {"ops":["MyCircularQueue","enQueue","enQueue","deQueue","deQueue","deQueue","isEmpty","enQueue","Front","Rear"],"args":[[2],[0],[1000],[],[],[],[],[6],[],[]],"out":[null,true,true,true,true,false,true,true,6,6]},
      {"ops":["MyCircularQueue","enQueue","Rear","Rear","deQueue","enQueue","Rear","deQueue","Front","deQueue","deQueue","Front"],"args":[[8],[3],[],[],[],[9],[],[],[],[],[],[]],"out":[null,true,3,3,true,true,9,true,-1,false,false,-1]}
    ] },
    solution: {
      approach: `<p>Array + head index + size: every operation is a couple of arithmetic steps.</p>`,
      code: `
class MyCircularQueue {
    private final int[] data;
    private int head = 0, size = 0;

    public MyCircularQueue(int k) { data = new int[k]; }

    public boolean enQueue(int value) {
        if (isFull()) return false;
        data[(head + size) % data.length] = value;    // first free slot after the last element
        size++;
        return true;
    }

    public boolean deQueue() {
        if (isEmpty()) return false;
        head = (head + 1) % data.length;              // just move the front forward
        size--;
        return true;
    }

    public int Front() { return isEmpty() ? -1 : data[head]; }
    public int Rear() { return isEmpty() ? -1 : data[(head + size - 1) % data.length]; }
    public boolean isEmpty() { return size == 0; }
    public boolean isFull() { return size == data.length; }

    public static void main(String[] args) {
        MyCircularQueue q = new MyCircularQueue(3);
        System.out.println(q.enQueue(1) + " " + q.enQueue(2) + " " + q.enQueue(3) + " " + q.enQueue(4)); // true true true false
        System.out.println(q.Rear() + " " + q.deQueue() + " " + q.enQueue(4) + " " + q.Rear());          // 3 true true 4
    }
}`,
      alt: [{ lang: 'python', code: `class MyCircularQueue:
    def __init__(self, k: int):
        self.data = [0] * k
        self.head = 0
        self.size = 0

    def enQueue(self, value: int) -> bool:
        if self.isFull():
            return False
        self.data[(self.head + self.size) % len(self.data)] = value   # first free slot
        self.size += 1
        return True

    def deQueue(self) -> bool:
        if self.isEmpty():
            return False
        self.head = (self.head + 1) % len(self.data)   # just move the front forward
        self.size -= 1
        return True

    def Front(self) -> int:
        return -1 if self.isEmpty() else self.data[self.head]

    def Rear(self) -> int:
        return -1 if self.isEmpty() else self.data[(self.head + self.size - 1) % len(self.data)]

    def isEmpty(self) -> bool:
        return self.size == 0

    def isFull(self) -> bool:
        return self.size == len(self.data)` }, { lang: 'js', code: `class MyCircularQueue {
  constructor(k) {
    this.data = new Int32Array(k);
    this.head = 0;
    this.size = 0;
  }

  enQueue(value) {
    if (this.isFull()) return false;
    this.data[(this.head + this.size) % this.data.length] = value;   // first free slot
    this.size++;
    return true;
  }

  deQueue() {
    if (this.isEmpty()) return false;
    this.head = (this.head + 1) % this.data.length;   // just move the front forward
    this.size--;
    return true;
  }

  Front() { return this.isEmpty() ? -1 : this.data[this.head]; }
  Rear() { return this.isEmpty() ? -1 : this.data[(this.head + this.size - 1) % this.data.length]; }
  isEmpty() { return this.size === 0; }
  isFull() { return this.size === this.data.length; }
}` }, { lang: 'cpp', code: `class MyCircularQueue {
    vector<int> data;
    int head = 0, size = 0;
public:
    explicit MyCircularQueue(int k) : data(k) {}

    bool enQueue(int value) {
        if (isFull()) return false;
        data[(head + size) % data.size()] = value;   // first free slot after the last element
        size++;
        return true;
    }

    bool deQueue() {
        if (isEmpty()) return false;
        head = (head + 1) % data.size();             // just move the front forward
        size--;
        return true;
    }

    int Front() { return isEmpty() ? -1 : data[head]; }
    int Rear() { return isEmpty() ? -1 : data[(head + size - 1) % data.size()]; }
    bool isEmpty() { return size == 0; }
    bool isFull() { return size == (int)data.size(); }
};` }],
      complexity: `<p><b>All operations O(1)</b>, <b>space O(k)</b>. This is the same circular-buffer idea used inside <code>ArrayDeque</code>, Linux kernel ring buffers and network card queues.</p>`,
      followUps: ['Make it thread-safe for one producer and one consumer (lock-free ring buffer).', 'Design a circular DEQUE (LC 641).']
    }
  });

  practice.push({
    title: 'Validate Stack Sequences',
    level: 'Medium',
    tags: ['stack', 'simulation'],
    companies: ['Google', 'Amazon'],
    statement: `<p>Given two permutations <code>pushed</code> and <code>popped</code> of distinct values, return <code>true</code> if they could be the result of push and pop operations on an initially empty stack (pushes in the order of <code>pushed</code>, pops in the order of <code>popped</code>).</p>`,
    constraints: `1 ≤ N ≤ 1000, values distinct, popped is a permutation of pushed`,
    example: `<p>pushed = [1,2,3,4,5], popped = [4,5,3,2,1] → ${H.c('g', 'true')}: push 1..4, pop 4, push 5, pop 5, 3, 2, 1.</p><p>popped = [4,3,5,1,2] → ${H.c('r', 'false')}: 1 cannot leave before 2 because 2 is on top of it.</p>`,
    brute: {
      why: `<p>Try every interleaving of pushes and pops with backtracking: exponential. The waste: there is never a real choice — if the top equals the next value to pop, popping now is always safe (it could not be popped later if we buried it).</p>`,
      code: `
boolean validateBrute(int[] pushed, int[] popped) {
    return go(pushed, popped, 0, 0, new ArrayDeque<>());
}

boolean go(int[] pu, int[] po, int i, int j, Deque<Integer> st) {
    if (j == po.length) return true;
    if (!st.isEmpty() && st.peek() == po[j]) {            // option 1: pop now
        int x = st.pop();
        boolean ok = go(pu, po, i, j + 1, st);
        st.push(x);
        if (ok) return true;
    }
    if (i < pu.length) {                                   // option 2: push next
        st.push(pu[i]);
        boolean ok = go(pu, po, i + 1, j, st);
        st.pop();
        if (ok) return true;
    }
    return false;
}`
    },
    mcq: { q: 'Why is greedy popping (pop whenever top == popped[j]) always safe?', options: ['Because values are sorted', 'Values are distinct: if we push more on top of it, that value can never come out before them', 'Because the stack is small', 'It is not always safe'], answer: 1, explain: 'With distinct values, delaying the pop only buries the needed value under newer items, which must leave first — that contradicts the popped order.' },
    hints: [
      `<p>Aha: simulate the real stack. Push values in order; whenever the top is the next value that must be popped, pop it.</p>`,
      `<p>Keep a pointer <code>j</code> into <code>popped</code>. After each push: <code>while top == popped[j]</code> → pop, j++.</p>`,
      `<p>Answer: did we pop everything (<code>j == n</code>, equivalently the stack is empty)? In Java, compare <code>st.peek()</code> (Integer) with an <code>int</code> so it unboxes, or use an <code>int[]</code> stack; other languages compare numbers by value.</p>`
    ],
    tests: { sig: "int[] int[] -> bool", fn: "validateStackSequences", cases: [
      [[[1,2,3,4,5],[4,5,3,2,1]],true],
      [[[1,2,3,4,5],[4,3,5,1,2]],false],
      [[[1],[1]],true],
      [[[1,2],[1,2]],true],
      [[[1,2],[2,1]],true],
      [[[1,2,3],[3,1,2]],false],
      [[[2,1,0],[1,2,0]],true],
      [[[1,2,3,4],[1,2,3,4]],true],
      [[{"$range":[0,1000,1]},{"$range":[999,-1,-1]}],true]
    ] },
    solution: {
      approach: `<p>Greedy simulation of the stack.</p>`,
      code: `
import java.util.*;

class Solution {
    public boolean validateStackSequences(int[] pushed, int[] popped) {
        Deque<Integer> st = new ArrayDeque<>();
        int j = 0;
        for (int x : pushed) {
            st.push(x);
            while (!st.isEmpty() && st.peek() == popped[j]) {   // Integer == int -> unboxed compare
                st.pop();
                j++;
            }
        }
        return j == popped.length;
    }

    public static void main(String[] args) {
        System.out.println(new Solution().validateStackSequences(new int[]{1, 2, 3, 4, 5}, new int[]{4, 5, 3, 2, 1}));   // true
        System.out.println(new Solution().validateStackSequences(new int[]{1, 2, 3, 4, 5}, new int[]{4, 3, 5, 1, 2}));   // false
    }
}`,
      alt: [{ lang: 'python', code: `class Solution:
    def validate_stack_sequences(self, pushed: list[int], popped: list[int]) -> bool:
        st, j = [], 0
        for x in pushed:
            st.append(x)
            while st and st[-1] == popped[j]:    # pop greedily whenever the top is due
                st.pop()
                j += 1
        return j == len(popped)` }, { lang: 'js', code: `function validateStackSequences(pushed, popped) {
  const st = [];
  let j = 0;
  for (const x of pushed) {
    st.push(x);
    while (st.length && st[st.length - 1] === popped[j]) {   // pop greedily when due
      st.pop();
      j++;
    }
  }
  return j === popped.length;
}` }, { lang: 'cpp', code: `class Solution {
public:
    bool validateStackSequences(const vector<int>& pushed, const vector<int>& popped) {
        stack<int> st;
        size_t j = 0;
        for (int x : pushed) {
            st.push(x);
            while (!st.empty() && st.top() == popped[j]) {   // pop greedily when due
                st.pop();
                j++;
            }
        }
        return j == popped.size();
    }
};` }],
      complexity: `<p><b>Time O(N)</b>, <b>space O(N)</b>.</p>`
    }
  });

  // =====================================================================
  // PRACTICE ARENA — Hard
  // =====================================================================
  practice.push({
    title: 'Maximal Rectangle',
    level: 'Hard',
    tags: ['monotonic stack', 'histogram', 'matrix'],
    companies: ['Google', 'Amazon', 'Meta'],
    statement: `<p>Given a binary matrix of <code>'0'</code> and <code>'1'</code> characters, find the largest rectangle containing only 1s and return its area.</p>`,
    constraints: `1 ≤ rows, cols ≤ 200`,
    example: `${H.table(['row', 'cells', 'histogram heights'], [['0', '1 0 1 0 0', '1 0 1 0 0'], ['1', '1 0 1 1 1', '2 0 2 1 1'], ['2', '1 1 1 1 1', '3 1 3 2 2'], ['3', '1 0 0 1 0', '4 0 0 3 0']])}<p>Output ${H.c('g', '6')}: rows 1–2 × columns 2–4. In row 2's histogram, height 2 spans columns 2..4 → 2 × 3 = 6.</p>`,
    brute: {
      why: `<p>Try every top-left and bottom-right corner and check that the rectangle is all 1s: O(R<sup>3</sup>·C<sup>3</sup>) in the naive form — hopeless at 200 × 200. The waste: rectangles sharing the same bottom row share almost all their work, which the per-row histogram captures.</p>`,
      code: `
int maximalRectangleBrute(char[][] m) {
    int R = m.length, C = R == 0 ? 0 : m[0].length, best = 0;
    for (int r1 = 0; r1 < R; r1++)
        for (int c1 = 0; c1 < C; c1++)
            for (int r2 = r1; r2 < R; r2++)
                for (int c2 = c1; c2 < C; c2++) {
                    boolean ok = true;
                    for (int r = r1; r <= r2 && ok; r++)
                        for (int c = c1; c <= c2 && ok; c++)
                            if (m[r][c] != '1') ok = false;
                    if (ok) best = Math.max(best, (r2 - r1 + 1) * (c2 - c1 + 1));
                }
    return best;
}`
    },
    mcq: { q: 'How is heights[c] updated when moving to the next row?', options: ['heights[c] = 1 always', 'heights[c] + 1 if the cell is 1, else 0', 'max(heights[c], 1)', 'heights[c] + cell value, never reset'], answer: 1, explain: 'A 0 breaks the vertical run of 1s, so the bar height resets to 0.' },
    hints: [
      `<p>Aha: fix the <b>bottom row</b> of the rectangle. The 1s above each column form a histogram; the best rectangle with that bottom is the largest rectangle in that histogram.</p>`,
      `<p>Maintain <code>int[] heights</code> across rows (add 1 or reset to 0) and call the O(C) monotonic-stack histogram routine for each row.</p>`,
      `<p>Total O(R·C). Reuse the sentinel trick (height 0 at index C). Compare cells with the character <code>'1'</code> (a one-letter string in Python and JS), not the number 1.</p>`
    ],
    tests: { sig: "char[][] -> int", fn: "maximalRectangle", cases: [
      [[[["1","0","1","0","0"],["1","0","1","1","1"],["1","1","1","1","1"],["1","0","0","1","0"]]],6],
      [[[["0"]]],0],
      [[[["1"]]],1],
      [[[["1","1","1","1"],["1","1","1","1"],["1","1","1","1"]]],12],
      [[[["1","0","1","1","1"]]],3],
      [[[["1"],["1"],["0"],["1"]]],2],
      [[[["0","1"],["1","0"]]],1],
      [[[["0","1","1","0"],["1","1","1","1"],["0","1","1","1"]]],6]
    ] },
    solution: {
      approach: `<p>Row-by-row histograms + Largest Rectangle in Histogram (Topic 7).</p>`,
      code: `
import java.util.*;

class Solution {
    public int maximalRectangle(char[][] matrix) {
        if (matrix.length == 0) return 0;
        int cols = matrix[0].length, best = 0;
        int[] h = new int[cols];
        for (char[] row : matrix) {
            for (int c = 0; c < cols; c++) h[c] = row[c] == '1' ? h[c] + 1 : 0;
            best = Math.max(best, largest(h));
        }
        return best;
    }

    private int largest(int[] h) {
        int n = h.length, best = 0;
        Deque<Integer> st = new ArrayDeque<>();
        for (int i = 0; i <= n; i++) {
            int cur = i == n ? 0 : h[i];
            while (!st.isEmpty() && h[st.peek()] >= cur) {
                int top = st.pop();
                int left = st.isEmpty() ? -1 : st.peek();
                best = Math.max(best, h[top] * (i - left - 1));
            }
            st.push(i);
        }
        return best;
    }

    public static void main(String[] args) {
        char[][] m = { "10100".toCharArray(), "10111".toCharArray(), "11111".toCharArray(), "10010".toCharArray() };
        System.out.println(new Solution().maximalRectangle(m));   // 6
    }
}`,
      alt: [{ lang: 'python', code: `class Solution:
    def maximal_rectangle(self, matrix: list[list[str]]) -> int:
        if not matrix:
            return 0
        h = [0] * len(matrix[0])
        best = 0
        for row in matrix:
            # bar height = consecutive '1's ending at this row
            h = [v + 1 if c == '1' else 0 for v, c in zip(h, row)]
            best = max(best, self._largest(h))
        return best

    @staticmethod
    def _largest(h: list[int]) -> int:
        best, st = 0, []                       # increasing stack of indices
        for i, cur in enumerate(h + [0]):      # height-0 sentinel flushes the stack
            while st and h[st[-1]] >= cur:
                top = st.pop()
                left = st[-1] if st else -1
                best = max(best, h[top] * (i - left - 1))
            st.append(i)
        return best` }, { lang: 'js', code: `function maximalRectangle(matrix) {
  if (matrix.length === 0) return 0;
  const cols = matrix[0].length;
  const h = new Array(cols).fill(0);
  const largest = () => {
    const st = [];                         // increasing stack of indices
    let best = 0;
    for (let i = 0; i <= cols; i++) {
      const cur = i === cols ? 0 : h[i];   // height-0 sentinel flushes the stack
      while (st.length && h[st[st.length - 1]] >= cur) {
        const top = st.pop();
        const left = st.length ? st[st.length - 1] : -1;
        best = Math.max(best, h[top] * (i - left - 1));
      }
      st.push(i);
    }
    return best;
  };
  let best = 0;
  for (const row of matrix) {
    for (let c = 0; c < cols; c++) h[c] = row[c] === '1' ? h[c] + 1 : 0;
    best = Math.max(best, largest());
  }
  return best;
}` }, { lang: 'cpp', code: `class Solution {
    static int largest(const vector<int>& h) {
        int n = h.size(), best = 0;
        vector<int> st;                          // increasing stack of indices
        for (int i = 0; i <= n; i++) {
            int cur = i == n ? 0 : h[i];         // height-0 sentinel flushes the stack
            while (!st.empty() && h[st.back()] >= cur) {
                int top = st.back(); st.pop_back();
                int left = st.empty() ? -1 : st.back();
                best = max(best, h[top] * (i - left - 1));
            }
            st.push_back(i);
        }
        return best;
    }
public:
    int maximalRectangle(const vector<vector<char>>& matrix) {
        if (matrix.empty()) return 0;
        vector<int> h(matrix[0].size(), 0);
        int best = 0;
        for (const auto& row : matrix) {
            for (size_t c = 0; c < h.size(); c++) h[c] = row[c] == '1' ? h[c] + 1 : 0;
            best = max(best, largest(h));
        }
        return best;
    }
};` }],
      complexity: `<p><b>Time O(R·C)</b>, <b>space O(C)</b>.</p>`,
      followUps: ['Largest SQUARE of 1s (DP, LC 221).', 'Count all submatrices of 1s (LC 1504) with the same histogram + stack idea.']
    }
  });

  practice.push({
    title: 'Trapping Rain Water (stack method)',
    level: 'Hard',
    tags: ['monotonic stack', 'two pointers'],
    companies: ['Amazon', 'Google', 'Goldman Sachs', 'Meta'],
    statement: `<p>Given non-negative bar heights (width 1 each), compute how much rain water is trapped between the bars. Solve it with a monotonic stack (layer by layer).</p>`,
    constraints: `1 ≤ N ≤ 2·10<sup>4</sup>, 0 ≤ height[i] ≤ 10<sup>5</sup>`,
    example: `${H.arr([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1], { label: 'height' })}<p>Output ${H.c('g', '6')}. E.g. the valley at index 5 (height 0) between walls 2 (index 3) and 3 (index 7) holds water in two horizontal layers.</p>`,
    brute: {
      why: `<p>For each bar, scan left for the tallest wall and right for the tallest wall; water = <code>min(leftMax, rightMax) − h[i]</code>. O(N<sup>2</sup>). The waste: the same maxima are recomputed for every bar (prefix/suffix max arrays or a stack fix it).</p>`,
      code: `
int trapBrute(int[] h) {
    int water = 0;
    for (int i = 0; i < h.length; i++) {
        int lm = 0, rm = 0;
        for (int j = 0; j <= i; j++) lm = Math.max(lm, h[j]);
        for (int j = i; j < h.length; j++) rm = Math.max(rm, h[j]);
        water += Math.min(lm, rm) - h[i];
    }
    return water;
}`
    },
    mcq: { q: 'We pop a "floor" bar of height 1. The new top (left wall) has height 2 and the current bar (right wall) has height 3, 2 positions apart (width 1). Water added?', options: ['1 × (2 − 1) = 1', '1 × (3 − 1) = 2', '2 × 1 = 2', '0'], answer: 0, explain: 'Water level is limited by the shorter wall: min(2, 3) − floor 1 = 1, times width (i − left − 1) = 1.' },
    hints: [
      `<p>Aha: water fills <b>horizontal layers</b>. When a taller bar arrives, it closes a "valley" whose floor is the popped bar and whose left wall is the new stack top.</p>`,
      `<p>Decreasing stack of indices. While <code>h[top] &lt; h[i]</code>: pop the floor; if the stack is empty there is no left wall (break); else add <code>(i − left − 1) × (min(h[left], h[i]) − h[floor])</code>.</p>`,
      `<p>Equal heights give a 0-height layer — harmless. The stack approach is O(N) time and space; the two-pointer approach is O(1) space — mention both.</p>`
    ],
    tests: { sig: "int[] -> int", fn: "trap", cases: [
      [[[0,1,0,2,1,0,1,3,2,1,2,1]],6],
      [[[4,2,0,3,2,5]],9],
      [[[1]],0],
      [[[3,0,3]],3],
      [[[1,2,3,4]],0],
      [[[5,0,0,0,5]],15],
      [[[100000,0,100000]],100000],
      [[[2,2,2]],0],
      [[[5,4,1,2]],1],
      [[{"$concat":[[100000],{"$rep":0,"n":19998},[100000]]}],1999800000]
    ] },
    solution: {
      approach: `<p>Monotonic decreasing stack; each pop measures one horizontal layer of water above the popped floor.</p>`,
      code: `
import java.util.*;

class Solution {
    public int trap(int[] height) {
        Deque<Integer> st = new ArrayDeque<>();          // indices, heights decreasing
        int water = 0;
        for (int i = 0; i < height.length; i++) {
            while (!st.isEmpty() && height[st.peek()] < height[i]) {
                int floor = st.pop();                     // bottom of the valley
                if (st.isEmpty()) break;                  // no left wall: water would spill
                int left = st.peek();
                int width = i - left - 1;
                int level = Math.min(height[left], height[i]) - height[floor];
                water += width * level;
            }
            st.push(i);
        }
        return water;
    }

    public static void main(String[] args) {
        System.out.println(new Solution().trap(new int[]{0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1}));   // 6
        System.out.println(new Solution().trap(new int[]{4, 2, 0, 3, 2, 5}));                     // 9
    }
}`,
      alt: [{ lang: 'python', code: `class Solution:
    def trap(self, height: list[int]) -> int:
        st, water = [], 0                       # indices, heights decreasing
        for i, h in enumerate(height):
            while st and height[st[-1]] < h:
                floor = st.pop()                # bottom of the valley
                if not st:
                    break                       # no left wall: water would spill
                left = st[-1]
                level = min(height[left], h) - height[floor]
                water += (i - left - 1) * level
            st.append(i)
        return water` }, { lang: 'js', code: `function trap(height) {
  const st = [];                          // indices, heights decreasing
  let water = 0;
  for (let i = 0; i < height.length; i++) {
    while (st.length && height[st[st.length - 1]] < height[i]) {
      const floor = st.pop();             // bottom of the valley
      if (!st.length) break;              // no left wall: water would spill
      const left = st[st.length - 1];
      const level = Math.min(height[left], height[i]) - height[floor];
      water += (i - left - 1) * level;
    }
    st.push(i);
  }
  return water;
}` }, { lang: 'cpp', code: `class Solution {
public:
    int trap(const vector<int>& height) {
        vector<int> st;                          // indices, heights decreasing
        long long water = 0;                     // 64-bit sum: no overflow worries
        for (int i = 0; i < (int)height.size(); i++) {
            while (!st.empty() && height[st.back()] < height[i]) {
                int floor = st.back(); st.pop_back();   // bottom of the valley
                if (st.empty()) break;                  // no left wall: water would spill
                int left = st.back();
                long long level = min(height[left], height[i]) - height[floor];
                water += (i - left - 1) * level;
            }
            st.push_back(i);
        }
        return (int)water;
    }
};` }],
      complexity: `<p><b>Time O(N)</b>, <b>space O(N)</b>. Two-pointer version: O(N) time, O(1) space.</p>`,
      followUps: ['Trapping Rain Water II on a 2D grid (min-heap from the borders, LC 407).', 'Prove the two-pointer version correct.']
    }
  });

  practice.push({
    title: 'Basic Calculator (+, -, parentheses)',
    level: 'Hard',
    tags: ['stack', 'expression', 'parsing'],
    companies: ['Google', 'Meta', 'Amazon', 'Microsoft'],
    statement: `<p>Evaluate a string expression with non-negative integers, <code>+</code>, <code>-</code>, parentheses and spaces. Unary minus is allowed (e.g. <code>"-(2 + 3)"</code>). Do not use any built-in eval.</p>`,
    constraints: `1 ≤ s.length ≤ 3·10<sup>5</sup>; the expression is valid; every intermediate value fits in a 32-bit int`,
    example: `<p><code>"(1+(4+5+2)-3)+(6+8)"</code> → ${H.c('g', '23')}. <code>"- (3 + (4 + 5))"</code> → ${H.c('g', '-12')}.</p>`,
    brute: {
      why: `<p>Repeatedly find the innermost parentheses, evaluate the flat expression inside, substitute the number back into the string, repeat. Each substitution rebuilds the string → <b>O(N<sup>2</sup>)</b> for deep nesting, and substituted negatives create awkward <code>"--"</code> sequences. A stack saves the outer state once per <code>(</code> instead.</p>`,
      code: `
int calculateBrute(String s) {
    s = s.replace(" ", "");
    int close;
    while ((close = s.indexOf(')')) >= 0) {
        int open = s.lastIndexOf('(', close);
        long v = evalFlat(s.substring(open + 1, close));
        s = s.substring(0, open) + v + s.substring(close + 1);   // may create "--5" or "+-5"
    }
    return (int) evalFlat(s);
}

long evalFlat(String e) {                    // only digits, '+' and '-'
    long total = 0, num = 0;
    int sign = 1;
    boolean inNum = false;
    for (int i = 0; i < e.length(); i++) {
        char c = e.charAt(i);
        if (Character.isDigit(c)) { num = num * 10 + (c - '0'); inNum = true; }
        else {
            if (inNum) { total += sign * num; num = 0; inNum = false; sign = 1; }
            if (c == '-') sign = -sign;      // "--" cancels, "+-" stays negative
        }
    }
    if (inNum) total += sign * num;
    return total;
}`
    },
    mcq: { q: 'On reading <code>(</code>, what do we push?', options: ['Only the current number', 'The result so far and the sign in front of the (', 'Nothing; recursion is required', 'The index of ('], answer: 1, explain: 'Inside the parentheses we start a fresh result. On ), result = savedResult + savedSign × innerResult.' },
    hints: [
      `<p>Aha: with only + and -, an expression is a sum of signed numbers. Parentheses just apply a sign to a whole group.</p>`,
      `<p>Keep <code>result</code>, <code>sign</code>, <code>num</code>. On <code>(</code>: push result and sign, reset. On <code>)</code>: finish the inner result, then <code>result = popSign × result + popResult</code>.</p>`,
      `<p>Multi-digit numbers: <code>num = num*10 + d</code>. Spaces: skip. Unary minus is handled automatically because result starts at 0 ("-x" = "0 - x"). Pop order: sign was pushed last, so pop it first.</p>`
    ],
    tests: { sig: "string -> int", fn: "calculate", cases: [
      [["1 + 1"],2],
      [[" 2-1 + 2 "],3],
      [["(1+(4+5+2)-3)+(6+8)"],23],
      [["- (3 + (4 + 5))"],-12],
      [["-2+ 1"],-1],
      [["2147483647"],2147483647],
      [["1-(     -2)"],3],
      [["-(-(-5))"],-5],
      [["0"],0],
      [["(7)-(0)+(4)"],11],
      [[{"$concat":[{"$rep":"1+","n":100000},"1"]}],100001],
      [[{"$concat":[{"$rep":"(","n":50000},"7",{"$rep":")","n":50000}]}],7]
    ] },
    solution: {
      approach: `<p>Single pass with a stack of (result, sign) frames for each open parenthesis.</p>`,
      code: `
import java.util.*;

class Solution {
    public int calculate(String s) {
        Deque<Integer> st = new ArrayDeque<>();
        int result = 0, sign = 1, num = 0;
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (Character.isDigit(c)) {
                num = num * 10 + (c - '0');
            } else if (c == '+' || c == '-') {
                result += sign * num;                 // close the previous number
                num = 0;
                sign = (c == '+') ? 1 : -1;
            } else if (c == '(') {
                st.push(result);                      // save the outer state
                st.push(sign);
                result = 0;
                sign = 1;
            } else if (c == ')') {
                result += sign * num;                 // finish the inner expression
                num = 0;
                result *= st.pop();                   // sign in front of '(' (pushed last)
                result += st.pop();                   // result before '('
            }                                         // spaces are ignored
        }
        return result + sign * num;
    }

    public static void main(String[] args) {
        Solution sol = new Solution();
        System.out.println(sol.calculate("(1+(4+5+2)-3)+(6+8)"));   // 23
        System.out.println(sol.calculate("- (3 + (4 + 5))"));       // -12
        System.out.println(sol.calculate(" 2-1 + 2 "));             // 3
    }
}`,
      dry: { head: ['char', 'result', 'sign', 'num', 'stack'], rows: [['-', '0', '-1', '0', '—'], ['(', '0', '1', '0', '0, -1'], ['3', '0', '1', '3', '0, -1'], ['+', '3', '1', '0', '0, -1'], ['(', '0', '1', '0', '0, -1, 3, 1'], ['4 + 5', '4', '1', '5', '…'], [')', '9 → ×1 +3 = 12', '1', '0', '0, -1'], [')', '12 → ×(-1) + 0 = <span class="c-g">-12</span>', '1', '0', '—']] },
      alt: [{ lang: 'python', code: `class Solution:
    def calculate(self, s: str) -> int:
        st = []                                # saved (result, sign) for each open '('
        result, sign, num = 0, 1, 0
        for c in s:
            if c.isdigit():
                num = num * 10 + int(c)
            elif c in '+-':
                result += sign * num           # close the previous number
                num = 0
                sign = 1 if c == '+' else -1
            elif c == '(':
                st.append((result, sign))      # save the outer state
                result, sign = 0, 1
            elif c == ')':
                result += sign * num           # finish the inner expression
                num = 0
                outer, outer_sign = st.pop()
                result = outer + outer_sign * result
        return result + sign * num             # spaces were ignored` }, { lang: 'js', code: `function calculate(s) {
  const st = [];                           // saved [result, sign] for each open '('
  let result = 0, sign = 1, num = 0;
  for (const c of s) {
    if (c >= '0' && c <= '9') {
      num = num * 10 + (c.charCodeAt(0) - 48);
    } else if (c === '+' || c === '-') {
      result += sign * num;                // close the previous number
      num = 0;
      sign = c === '+' ? 1 : -1;
    } else if (c === '(') {
      st.push([result, sign]);             // save the outer state
      result = 0; sign = 1;
    } else if (c === ')') {
      result += sign * num;                // finish the inner expression
      num = 0;
      const [outer, outerSign] = st.pop();
      result = outer + outerSign * result;
    }                                      // spaces are ignored
  }
  return result + sign * num;
}` }, { lang: 'cpp', code: `class Solution {
public:
    int calculate(const string& s) {
        vector<pair<long long, int>> st;        // saved {result, sign} for each open '('
        long long result = 0, num = 0;
        int sign = 1;
        for (char c : s) {
            if (isdigit((unsigned char)c)) {
                num = num * 10 + (c - '0');
            } else if (c == '+' || c == '-') {
                result += sign * num;           // close the previous number
                num = 0;
                sign = c == '+' ? 1 : -1;
            } else if (c == '(') {
                st.push_back({result, sign});   // save the outer state
                result = 0; sign = 1;
            } else if (c == ')') {
                result += sign * num;           // finish the inner expression
                num = 0;
                auto [outer, outerSign] = st.back();
                st.pop_back();
                result = outer + outerSign * result;
            }                                   // spaces are ignored
        }
        return (int)(result + sign * num);
    }
};` }],
      complexity: `<p><b>Time O(N)</b>, <b>space O(depth of nesting)</b>.</p>`,
      followUps: ['Add * and / (Basic Calculator II / III): apply * and / immediately, push signed terms.', 'Support variables and return a simplified polynomial (LC 770).']
    }
  });

  practice.push({
    title: 'Longest Valid Parentheses',
    level: 'Hard',
    tags: ['stack', 'parentheses', 'dp'],
    companies: ['Amazon', 'Google', 'ByteDance'],
    statement: `<p>Given a string of <code>(</code> and <code>)</code>, return the length of the longest <b>contiguous</b> well-formed parentheses substring.</p>`,
    constraints: `0 ≤ s.length ≤ 3·10<sup>4</sup>`,
    example: `<p><code>")()())"</code> → ${H.c('g', '4')} for <code>"()()"</code>. <code>"(()"</code> → 2. <code>""</code> → 0.</p>`,
    brute: {
      why: `<p>For every start i, extend j with a running balance; whenever balance is 0 the substring is valid, and when it goes negative stop. O(N<sup>2</sup>) = 9·10<sup>8</sup>. The waste: a valid run is rediscovered from every start inside it.</p>`,
      code: `
int longestValidBrute(String s) {
    int best = 0;
    for (int i = 0; i < s.length(); i++) {
        int bal = 0;
        for (int j = i; j < s.length(); j++) {
            bal += s.charAt(j) == '(' ? 1 : -1;
            if (bal < 0) break;                        // a ')' with nothing open
            if (bal == 0) best = Math.max(best, j - i + 1);
        }
    }
    return best;
}`
    },
    mcq: { q: 'Why do we push -1 onto the stack before scanning?', options: ['To avoid an empty-stack exception only', 'It marks "the index just before the current valid run", so length = i − top works from index 0', 'It is the answer for an empty string', 'It counts unmatched )'], answer: 1, explain: 'The stack bottom always holds the last position that cannot be part of a valid run. Starting with -1 lets a run that begins at index 0 be measured as i − (−1).' },
    hints: [
      `<p>Aha: store <b>indices</b>. The bottom of the stack is a "barrier": the last unmatched <code>)</code> (or -1). Above it are unmatched <code>(</code>.</p>`,
      `<p><code>(</code> → push i. <code>)</code> → pop; if the stack becomes empty, push i as the new barrier; else the current valid length is <code>i − peek()</code>.</p>`,
      `<p>Alternative O(1) space: two counter scans (left→right and right→left). DP also works: <code>dp[i]</code> = longest valid ending at i.</p>`
    ],
    tests: { sig: "string -> int", fn: "longestValidParentheses", cases: [
      [[")()())"],4],
      [["(()"],2],
      [[""],0],
      [["()(())"],6],
      [["()(()"],2],
      [["(((("],0],
      [["))))"],0],
      [["(()())"],6],
      [[")("],0],
      [["()"],2],
      [[{"$rep":"()","n":15000}],30000]
    ] },
    solution: {
      approach: `<p>Stack of indices with a barrier at the bottom; every match measures the run back to the nearest barrier or unmatched (.</p>`,
      code: `
import java.util.*;

class Solution {
    public int longestValidParentheses(String s) {
        Deque<Integer> st = new ArrayDeque<>();
        st.push(-1);                                     // barrier before index 0
        int best = 0;
        for (int i = 0; i < s.length(); i++) {
            if (s.charAt(i) == '(') {
                st.push(i);
            } else {
                st.pop();                                // match the latest '(' (or remove barrier)
                if (st.isEmpty()) st.push(i);            // unmatched ')' becomes the new barrier
                else best = Math.max(best, i - st.peek());
            }
        }
        return best;
    }

    public static void main(String[] args) {
        System.out.println(new Solution().longestValidParentheses(")()())"));   // 4
        System.out.println(new Solution().longestValidParentheses("(()"));      // 2
    }
}`,
      dry: { head: ['i', 'char', 'action', 'stack', 'best'], rows: [['0', ')', 'pop -1 → empty → push 0', '0', '0'], ['1', '(', 'push', '0 1', '0'], ['2', ')', 'pop 1 → len 2 − 0 = 2', '0', '2'], ['3', '(', 'push', '0 3', '2'], ['4', ')', 'pop 3 → len 4 − 0 = 4', '0', '<span class="c-g">4</span>'], ['5', ')', 'pop 0 → empty → push 5', '5', '4']] },
      alt: [{ lang: 'python', code: `class Solution:
    def longest_valid_parentheses(self, s: str) -> int:
        st = [-1]                             # barrier before index 0
        best = 0
        for i, c in enumerate(s):
            if c == '(':
                st.append(i)
            else:
                st.pop()                      # match the latest '(' (or remove the barrier)
                if not st:
                    st.append(i)              # unmatched ')' becomes the new barrier
                else:
                    best = max(best, i - st[-1])
        return best` }, { lang: 'js', code: `function longestValidParentheses(s) {
  const st = [-1];                        // barrier before index 0
  let best = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') {
      st.push(i);
    } else {
      st.pop();                           // match the latest '(' (or remove the barrier)
      if (!st.length) st.push(i);         // unmatched ')' becomes the new barrier
      else best = Math.max(best, i - st[st.length - 1]);
    }
  }
  return best;
}` }, { lang: 'cpp', code: `class Solution {
public:
    int longestValidParentheses(const string& s) {
        vector<int> st{-1};                      // barrier before index 0
        int best = 0;
        for (int i = 0; i < (int)s.size(); i++) {
            if (s[i] == '(') {
                st.push_back(i);
            } else {
                st.pop_back();                   // match the latest '(' (or remove the barrier)
                if (st.empty()) st.push_back(i); // unmatched ')' becomes the new barrier
                else best = max(best, i - st.back());
            }
        }
        return best;
    }
};` }],
      complexity: `<p><b>Time O(N)</b>, <b>space O(N)</b> (O(1) with the two-scan counter method).</p>`
    }
  });

  practice.push({
    title: 'Shortest Subarray with Sum at Least K',
    level: 'Hard',
    tags: ['monotonic deque', 'prefix sum'],
    companies: ['Google', 'Amazon', 'Goldman Sachs'],
    statement: `<p>Given an integer array <code>nums</code> (values may be <b>negative</b>) and an integer <code>k</code>, return the length of the shortest non-empty contiguous subarray with sum ≥ <code>k</code>, or <code>-1</code>.</p>`,
    constraints: `1 ≤ N ≤ 10<sup>5</sup>, -10<sup>5</sup> ≤ nums[i] ≤ 10<sup>5</sup>, 1 ≤ k ≤ 10<sup>9</sup>`,
    example: `<p><code>[2, -1, 2]</code>, k = 3 → ${H.c('g', '3')} (the whole array). <code>[1, 2]</code>, k = 4 → ${H.c('r', '-1')}. Negatives break the normal sliding window, because shrinking the window can <i>increase</i> its sum.</p>`,
    brute: {
      why: `<p>Prefix sums + check every pair (i, j): O(N<sup>2</sup>) = 10<sup>10</sup>. The waste: many starting points i are useless — if a later prefix is smaller or equal, it is a better start (shorter and larger difference).</p>`,
      code: `
int shortestSubarrayBrute(int[] nums, int k) {
    int n = nums.length, best = Integer.MAX_VALUE;
    long[] pre = new long[n + 1];
    for (int i = 0; i < n; i++) pre[i + 1] = pre[i] + nums[i];
    for (int i = 0; i < n; i++)
        for (int j = i + 1; j <= n; j++)
            if (pre[j] - pre[i] >= k) { best = Math.min(best, j - i); break; }
    return best == Integer.MAX_VALUE ? -1 : best;
}`
    },
    mcq: { q: 'Deque holds prefix indices with increasing prefix values. Why pop the BACK while pre[back] ≥ pre[j]?', options: ['To keep memory low only', 'j is a later start with a smaller-or-equal prefix: it gives larger sums and shorter subarrays, so back is dominated', 'Because the deque must be sorted by index', 'To find the maximum'], answer: 1, explain: 'For any future end, starting at j beats starting at back: shorter length and at least as large a sum.' },
    hints: [
      `<p>Aha: with prefix sums, we need <code>pre[j] − pre[i] ≥ k</code> with the largest i &lt; j. Some i's are dominated and can be discarded forever.</p>`,
      `<p>Increasing deque of prefix indices. For each j: (1) while <code>pre[j] − pre[front] ≥ k</code>, record <code>j − front</code> and poll the front (it can only give longer answers later); (2) while <code>pre[back] ≥ pre[j]</code>, poll the back; (3) offer j.</p>`,
      `<p>Use 64-bit prefix sums (they reach 10<sup>10</sup>; JS doubles are exact there). Include index 0 (pre[0] = 0). Answer -1 if nothing was recorded.</p>`
    ],
    tests: { sig: "int[] int -> int", fn: "shortestSubarray", cases: [
      [[[1],1],1],
      [[[1,2],4],-1],
      [[[2,-1,2],3],3],
      [[[84,-37,32,40,95],167],3],
      [[[-28,81,-20,28,-29],89],3],
      [[[-100000,100000],100000],1],
      [[[5,-100000,5],10],-1],
      [[[17,85,93,-45,-21],150],2],
      [[[1,1,1,1],4],4],
      [[{"$rep":100000,"n":100000},1000000000],10000],
      [[{"$concat":[[-100000],{"$rep":1,"n":99999}]},99999],99999]
    ] },
    solution: {
      approach: `<p>Monotonic increasing deque over prefix sums: front pops record answers, back pops remove dominated starts.</p>`,
      code: `
import java.util.*;

class Solution {
    public int shortestSubarray(int[] nums, int k) {
        int n = nums.length;
        long[] pre = new long[n + 1];
        for (int i = 0; i < n; i++) pre[i + 1] = pre[i] + nums[i];
        Deque<Integer> dq = new ArrayDeque<>();      // prefix indices, pre[] increasing
        int best = n + 1;
        for (int j = 0; j <= n; j++) {
            while (!dq.isEmpty() && pre[j] - pre[dq.peekFirst()] >= k) {
                best = Math.min(best, j - dq.pollFirst());   // a later j would only be longer
            }
            while (!dq.isEmpty() && pre[dq.peekLast()] >= pre[j]) {
                dq.pollLast();                               // dominated start
            }
            dq.offerLast(j);
        }
        return best <= n ? best : -1;
    }

    public static void main(String[] args) {
        System.out.println(new Solution().shortestSubarray(new int[]{2, -1, 2}, 3));   // 3
        System.out.println(new Solution().shortestSubarray(new int[]{1, 2}, 4));       // -1
        System.out.println(new Solution().shortestSubarray(new int[]{84, -37, 32, 40, 95}, 167));   // 3
    }
}`,
      dry: { head: ['j', 'pre[j]', 'front pops (answer)', 'back pops', 'deque'], rows: [['0', '0', '—', '—', '0'], ['1', '2', '—', '—', '0 1'], ['2', '1', '—', '1 (2 ≥ 1)', '0 2'], ['3', '3', '0 → len 3', '—', '<span class="c-g">2 3</span>']] },
      alt: [{ lang: 'python', code: `from collections import deque
from itertools import accumulate


class Solution:
    def shortest_subarray(self, nums: list[int], k: int) -> int:
        pre = [0, *accumulate(nums)]            # pre[j] = sum of nums[0..j-1]
        dq = deque()                            # prefix indices, pre[] increasing
        best = len(nums) + 1
        for j, p in enumerate(pre):
            while dq and p - pre[dq[0]] >= k:
                best = min(best, j - dq.popleft())   # a later j would only be longer
            while dq and pre[dq[-1]] >= p:
                dq.pop()                        # dominated start
            dq.append(j)
        return best if best <= len(nums) else -1` }, { lang: 'js', code: `function shortestSubarray(nums, k) {
  const n = nums.length;
  const pre = new Float64Array(n + 1);      // sums reach 1e10: exact in a double
  for (let i = 0; i < n; i++) pre[i + 1] = pre[i] + nums[i];
  const dq = new Int32Array(n + 1);         // each index enters once: head/tail pointers
  let head = 0, tail = 0, best = n + 1;
  for (let j = 0; j <= n; j++) {
    while (head < tail && pre[j] - pre[dq[head]] >= k) {
      best = Math.min(best, j - dq[head++]);   // a later j would only be longer
    }
    while (head < tail && pre[dq[tail - 1]] >= pre[j]) tail--;   // dominated start
    dq[tail++] = j;
  }
  return best <= n ? best : -1;
}` }, { lang: 'cpp', code: `class Solution {
public:
    int shortestSubarray(const vector<int>& nums, int k) {
        int n = nums.size();
        vector<long long> pre(n + 1, 0);         // long long: sums reach 1e10
        for (int i = 0; i < n; i++) pre[i + 1] = pre[i] + nums[i];
        deque<int> dq;                           // prefix indices, pre[] increasing
        int best = n + 1;
        for (int j = 0; j <= n; j++) {
            while (!dq.empty() && pre[j] - pre[dq.front()] >= k) {
                best = min(best, j - dq.front());   // a later j would only be longer
                dq.pop_front();
            }
            while (!dq.empty() && pre[dq.back()] >= pre[j]) dq.pop_back();   // dominated
            dq.push_back(j);
        }
        return best <= n ? best : -1;
    }
};` }],
      complexity: `<p><b>Time O(N)</b> (each index enters and leaves the deque once), <b>space O(N)</b>.</p>`,
      followUps: ['Why does the plain sliding window fail with negative numbers?', 'Constrained Subsequence Sum (LC 1425) — DP + monotonic deque.']
    }
  });

  // =====================================================================
  // QUIZ
  // =====================================================================
  quiz.push(
    { q: 'You push 1, 2, 3 into a stack and offer 1, 2, 3 into a queue, then remove one item from each. What comes out?', options: ['Stack 1, queue 1', 'Stack 3, queue 1', 'Stack 3, queue 3', 'Stack 1, queue 3'], answer: 1, explain: 'Stack = LIFO (newest, 3). Queue = FIFO (oldest, 1).' },
    { q: 'Why is <code>ArrayDeque</code> preferred over <code>java.util.Stack</code>?', options: ['Stack cannot store integers', 'Stack is synchronized (slower) and extends Vector, exposing middle access', 'ArrayDeque allows null values', 'Stack has O(N) push'], answer: 1, explain: 'Stack is a legacy synchronized Vector subclass. ArrayDeque is an unsynchronized circular buffer with O(1) operations at both ends (and it rejects null).' },
    { q: 'What does <code>new ArrayDeque&lt;Integer&gt;().poll()</code> return?', options: ['Throws NoSuchElementException', 'null', '0', '-1'], answer: 1, explain: 'poll/peek return null on an empty deque; pop/remove/element throw.' },
    { q: 'In bracket matching, the string is <code>"(]"</code>. When <code>]</code> arrives, the stack top is <code>(</code>. Result?', options: ['Push ] and continue', 'Invalid immediately', 'Pop ( and continue', 'Valid'], answer: 1, explain: 'A closer must match the most recent opener. ( cannot be closed by ].' },
    { q: 'Postfix <code>6 2 3 + -</code> evaluates to:', options: ['1', '7', '-1', '11'], answer: 0, explain: '2 3 + = 5; then 6 5 - = 1 (first pop is the right operand).' },
    { q: 'For "next greater element to the right", the stack (bottom→top) values are always:', options: ['Increasing', 'Non-increasing (decreasing)', 'Random', 'Sorted by index descending'], answer: 1, explain: 'A bigger arrival pops all smaller waiting values, so the ones that remain form a non-increasing staircase.' },
    { q: 'The monotonic stack loop has a <code>while</code> inside a <code>for</code>. Total time for N elements?', options: ['O(N²)', 'O(N log N)', 'O(N)', 'O(N√N)'], answer: 2, explain: 'Each index is pushed once and popped at most once, so the while loop runs at most N times in total.' },
    { q: 'Largest rectangle: bar <code>top</code> is popped at index <code>i</code> and the new stack top is <code>L</code>. Width?', options: ['i − top', 'i − L − 1', 'i − L + 1', 'top − L'], answer: 1, explain: 'The rectangle spans strictly between the nearest smaller bars L and i.' },
    { q: 'Queue from two stacks: when should you move items from <code>in</code> to <code>out</code>?', options: ['After every push', 'Before every pop', 'Only when out is empty', 'Never'], answer: 2, explain: 'Transferring into a non-empty out would put newer items above older ones and break FIFO order.' },
    { q: 'Sliding window maximum, k = 3. Deque (front→back, index:value) = <code>3:8, 5:4</code>; i = 6 arrives with value 5. Deque after processing?', options: ['3:8, 5:4, 6:5', '3:8, 6:5', '6:5', '5:4, 6:5'], answer: 2, explain: 'The window is now [4..6]. Front index 3 ≤ 6 − 3 = 3, so it has expired → pollFirst (even though 8 is big). Then back value 4 ≤ 5 → pollLast. Offer 6 → deque = 6:5, window max 5.' },
    { q: 'Stock span with prices <code>[100, 80, 60, 70]</code>. Span of day 3 (price 70)?', options: ['1', '2', '3', '4'], answer: 1, explain: '60 ≤ 70 is popped; previous greater is 80 at index 1 → span = 3 − 1 = 2.' },
    { q: 'Which clue most strongly suggests a monotonic deque rather than a monotonic stack?', options: ['"next greater element"', '"maximum of every window of size K"', '"valid parentheses"', '"evaluate postfix"'], answer: 1, explain: 'Window problems need to drop expired elements from the old end and dominated ones from the new end — both ends → deque.' }
  );

  // =====================================================================
  // INTERVIEW Q&A
  // =====================================================================
  interview.push(
    { q: 'Stack vs queue: explain the difference and give two real uses of each.', level: 'B', a: `<p>A <b>stack</b> is LIFO — the last item added is the first removed (pile of plates). Uses: function call stack, undo/redo, browser back button, DFS, bracket matching, expression evaluation. A <b>queue</b> is FIFO — the oldest item leaves first (ticket line). Uses: BFS, task schedulers, printer spooling, message queues (Kafka/SQS consumers), rate-limiting buffers. Both support O(1) insert/remove at their ends; the difference is only <i>which</i> end you remove from.</p>`, followUps: ['What is a deque and when would you need one?', 'How does the JVM use a stack?'] },
    { q: 'How would you implement a stack and a queue in Java, and why not use <code>Stack</code> or <code>LinkedList</code>?', level: 'B', a: `<p>Use <code>Deque&lt;Integer&gt; st = new ArrayDeque&lt;&gt;()</code> with <code>push/pop/peek</code> for a stack and <code>Queue&lt;Integer&gt; q = new ArrayDeque&lt;&gt;()</code> with <code>offer/poll/peek</code> for a queue. <code>Stack</code> extends <code>Vector</code>: every call is synchronized (unneeded overhead) and it exposes index access that breaks LIFO. <code>LinkedList</code> allocates a node per element and has poor cache locality. <code>ArrayDeque</code> is a resizable circular array: O(1) amortized at both ends, compact, fast. One caveat: it rejects <code>null</code>.</p>`, followUps: ['What happens when ArrayDeque is full?', 'Which methods throw on empty and which return null?'] },
    { q: 'Walk me through checking whether a bracket string is valid. What are the failure cases?', level: 'B', a: `<p>Scan left to right with a stack of openers. Opener → push. Closer → if the stack is empty, invalid (nothing to close); else pop and check the popped opener matches the closer's type, otherwise invalid. At the end the stack must be empty, otherwise some opener was never closed. Failure cases: <code>")("</code> (empty-stack closer), <code>"(]"</code> (wrong type), <code>"([)]"</code> (wrong order), <code>"(("</code> (leftovers). Time O(N), space O(N); with a single bracket type a counter suffices (O(1) space).</p>`, followUps: ['How would you return the index of the first error?', 'What changes if there is a wildcard * that can be ( ) or empty?'] },
    { q: 'Design a stack that returns the minimum in O(1). What variations do you know?', level: 'I', a: `<p>Store with every element the minimum of itself and everything below it — e.g. a stack of <code>int[]{value, minSoFar}</code>. Push computes <code>min(x, top.min)</code>; pop needs no work because the entry below already holds its own min; getMin reads the top. All O(1), space 2N. Variations: (1) two stacks where the min stack is pushed only when <code>x ≤ currentMin</code> (the ≤ keeps duplicates), saving space for random data; (2) an encoded single-variable version storing <code>2x − min</code> when a new min arrives, which needs <code>long</code> to avoid overflow. The trick works because a stack's lower elements never change while the top exists.</p>`, followUps: ['How would you build a Max Stack with popMax()?', 'How do you get a queue with O(1) getMin?'] },
    { q: 'Explain the monotonic stack. Why is it O(N) even though there is a nested loop?', level: 'I', a: `<p>A monotonic stack keeps indices whose values are sorted (increasing or decreasing) from bottom to top. For "next greater", each new element pops every smaller waiting element — it is their answer — and then waits itself, keeping the stack decreasing. Although the <code>while</code> sits inside a <code>for</code>, each index is pushed exactly once and popped at most once, so the total number of pops over the whole run is ≤ N. Total work ≤ 2N → O(N). Formally: potential = stack size; each step has amortized cost 2.</p>`, followUps: ['Which comparison do you use for strictly greater vs greater-or-equal?', 'How do you handle a circular array?'] },
    { q: 'Give the four variants (next/previous × greater/smaller) and how the code differs.', level: 'I', a: `<p>Scanning left to right: <b>next greater</b> — pop while <code>a[top] &lt; x</code>, popped elements get x; stack decreasing. <b>Next smaller</b> — pop while <code>a[top] &gt; x</code>; stack increasing. <b>Previous greater</b> — pop while <code>a[top] ≤ x</code>, then the surviving top is the answer for x. <b>Previous smaller</b> — pop while <code>a[top] ≥ x</code>, surviving top is the answer. Rule of thumb: "next" answers come from <i>popped</i> elements; "previous" answers come from the <i>survivor</i>. Flip strict/non-strict depending on whether equal values should count.</p>`, followUps: ['Get both previous and next smaller in a single pass.', 'Why store indices rather than values?'] },
    { q: 'Solve Largest Rectangle in Histogram in O(N) and explain correctness.', level: 'A', a: `<p>The best rectangle uses some bar as its shortest bar; for that bar, the rectangle extends to the nearest strictly smaller bar on each side, so area = <code>h[i] × (right − left − 1)</code>. Keep an increasing stack of indices. When <code>h[i] ≤ h[top]</code>, the top bar's right boundary is i; pop it, its left boundary is the new top (or -1); compute its area. Append a sentinel bar of height 0 at index n to flush the stack. Each bar is pushed/popped once → O(N) time, O(N) space. With duplicates, earlier equal bars get underestimated widths but the last one of the run measures the full width, so the max is still right.</p>`, followUps: ['Extend to Maximal Rectangle in a binary matrix.', 'When do you need long for the area?'] },
    { q: 'Implement a queue with two stacks. Prove the amortized complexity.', level: 'I', a: `<p>Stacks <code>in</code> and <code>out</code>. Push goes to <code>in</code>. Pop/peek: if <code>out</code> is empty, move everything from <code>in</code> to <code>out</code> (reversing the order so the oldest is on top), then pop/peek <code>out</code>. Each element is pushed to in once, moved once (pop + push) and popped from out once: at most 4 stack operations over its lifetime, so N queue operations cost O(N) total → amortized O(1). Accounting view: charge 3 credits per push; 2 are saved to pay for the later transfer. A single pop can still be O(N), which matters for latency-sensitive systems.</p>`, followUps: ['Why must the transfer only happen when out is empty?', 'Can you implement a stack with queues in amortized O(1)?'] },
    { q: 'How does a monotonic deque solve sliding window maximum? Compare with a heap.', level: 'A', a: `<p>Keep a deque of indices with decreasing values. For each i: drop the front if it left the window (<code>front ≤ i − k</code>); drop back indices whose values are ≤ a[i] because a newer, bigger value dominates them forever; offer i; once <code>i ≥ k − 1</code>, the front is the window max. Each index enters and leaves once → O(N), space O(k). A max-heap with lazy deletion works in O(N log N) and keeps dominated elements around; a <code>TreeMap</code> of counts is O(N log k). The deque is optimal and simpler once you understand the dominance argument.</p>`, followUps: ['Longest subarray with max − min ≤ limit.', 'Where does a monotonic deque appear inside DP?'] },
    { q: 'How do you evaluate an infix expression like <code>3 + 4 * (2 - 1)</code>?', level: 'A', a: `<p>Option 1: convert to postfix with Shunting-Yard (operands to output; operators wait on a stack and pop those with higher precedence, or equal precedence if left-associative; <code>(</code> is a barrier; <code>)</code> pops to the matching <code>(</code>), then evaluate postfix with a number stack (operator pops b then a, pushes a op b). Option 2: evaluate directly with two stacks (operands and operators), applying an operator whenever Shunting-Yard would output it. Watch for multi-digit numbers, unary minus, right-associative <code>^</code>, integer division truncation and overflow. O(N) time and space. Never use a script-engine eval on user input.</p>`, followUps: ['How would you build an expression tree?', 'How do you detect a unary minus?'] },
    { q: 'Your recursive DFS throws StackOverflowError on a 10<sup>5</sup>-node chain. What do you do?', level: 'I', a: `<p>The JVM thread stack (often 512 KB–1 MB by default) holds one frame per recursive call, so deep recursion overflows. Fixes: (1) rewrite with an explicit <code>ArrayDeque</code> stack on the heap — push the start node, loop pop/process/push neighbours (for exact pre/post-order you may push (node, state) pairs); (2) run the recursion in a <code>new Thread(null, task, "dfs", 1 &lt;&lt; 26)</code> with a bigger stack size; (3) restructure the algorithm (BFS, union-find) if order does not matter. Option 1 is the robust production answer.</p>`, followUps: ['How do you do an iterative post-order traversal?', 'Why might the iterative DFS visit neighbours in a different order?'] },
    { q: 'What clues in a problem statement point to stacks, monotonic stacks or deques?', level: 'I', a: `<p><b>Stack:</b> "valid/balanced", "nested", "undo", "most recent", "evaluate expression", "decode k[...]", "simplify path", "collisions", or recursion that may be too deep. <b>Monotonic stack:</b> "next/previous greater or smaller", "days until warmer", "span", "how far can it extend", "largest rectangle", "sum of subarray minimums", "remove k digits to make smallest", N ≤ 10<sup>5</sup> with an obvious O(N<sup>2</sup>) "scan right for each element". <b>Queue:</b> "level by level", "in arrival order", "shortest steps" (BFS). <b>Monotonic deque:</b> "max/min of every window of size K", "longest subarray with max − min ≤ limit", "shortest subarray with sum ≥ K with negatives", DP with a sliding max transition.</p>`, followUps: ['Name a problem that looks like a sliding window but needs a deque.', 'What changes when the array is circular?'] },
    { q: 'Design a bounded, thread-safe producer–consumer queue. Which Java classes would you use and why?', level: 'E', a: `<p>For bounded blocking semantics use <code>ArrayBlockingQueue</code> (single lock, fixed array, fair option) or <code>LinkedBlockingQueue</code> (separate put/take locks, higher throughput, optionally bounded). Producers call <code>put</code> (blocks when full = back-pressure), consumers <code>take</code> (blocks when empty); use <code>offer/poll</code> with timeouts to avoid hanging forever. For non-blocking high-throughput cases, <code>ConcurrentLinkedQueue</code>/<code>ConcurrentLinkedDeque</code> (lock-free CAS), or an LMAX Disruptor-style ring buffer when latency matters. Never wrap <code>ArrayDeque</code> in ad-hoc synchronization when the standard classes exist; and remember that check-then-act sequences need a single lock even on synchronized collections.</p>`, followUps: ['How does a lock-free single-producer single-consumer ring buffer work?', 'How do you shut down consumers cleanly (poison pill)?'] },
    { q: 'An AI assistant generated a monotonic stack solution that passes the samples. How do you review it before trusting it?', level: 'A', a: `<p>(1) Restate the invariant and check the code maintains it: stack order, what is stored (indices vs values), and whether answers come from popped elements or survivors. (2) Check the comparison: strict vs non-strict against the problem's definition, especially with duplicates. (3) Check boundaries: empty stack defaults (-1, n, 0), the sentinel or final flush, window expiry (<code>≤ i − k</code>), circular second lap. (4) Check types: <code>Integer ==</code> comparisons, int overflow in areas/sums, modulo. (5) Run a differential test: a brute force O(N<sup>2</sup>) on thousands of small random arrays including duplicates, all-equal, increasing and decreasing inputs. Only then trust it.</p>`, followUps: ['Write the random test harness in 5 lines.', 'Which bug do models make most often on Sum of Subarray Minimums?'] }
  );

  registerModule({
    id: 'dsa13',
    title: 'Stacks & Queues',
    intro: `<p>Stacks and queues are the simplest data structures with the biggest pay-off in interviews. A <b>stack</b> (pile of plates, newest first) and a <b>queue</b> (ticket line, oldest first) only let you touch their ends — and that one restriction turns many O(N<sup>2</sup>) brute forces into clean O(N) scans.</p>
      <p>In this module you will start with the right container in each language (Java's <code>ArrayDeque</code> and why it replaced the old <code>Stack</code> class, Python's <code>list</code> and <code>deque</code>, JS arrays, C++ <code>stack</code>/<code>queue</code>/<code>deque</code>), then use stacks for <b>bracket matching</b>, <b>min stack</b> design and <b>expression evaluation</b> (infix → postfix, RPN). Next comes the star of the module: the <b>monotonic stack</b> — next greater element, stock span and the famous largest rectangle in a histogram — where you will watch elements get <span class="c-r">popped (red)</span> and <span class="c-g">pushed (green)</span> step by step. Finally you will build a <b>queue from two stacks</b> (and learn what <i>amortized O(1)</i> really means) and the <b>monotonic deque</b> for sliding window maximum.</p>
      <p>Every topic opens with an everyday analogy, then a visualizer, worked examples, an expert deep dive and a section on working alongside AI. The Practice Arena mixes classic and disguised problems so you learn to <b>spot</b> the pattern from the wording.</p>`,
    goals: [
      'Use a stack, a queue and a deque correctly in your language (<code>ArrayDeque</code> / <code>list</code> + <code>deque</code> / arrays / <code>std::stack</code>, <code>queue</code>, <code>deque</code>) and explain their empty-container and performance traps',
      'Solve bracket-matching, min-stack and expression-evaluation problems (RPN, infix → postfix) with a clear invariant',
      'Recognise next/previous greater/smaller questions and solve them in O(N) with a monotonic stack, including stock span and largest rectangle in a histogram',
      'Build a queue from two stacks and prove amortized O(1) with the "each element moves once" argument',
      'Use a monotonic deque for sliding window maximum/minimum and spot it inside harder problems (max − min ≤ limit, DP transitions)',
      'Read the clues in a question ("next greater", "nearest smaller", "valid parentheses", "window of size K") and pick the right structure in under a minute'
    ],
    prereqs: `DSA 1 (Programming Foundations), DSA 2 (Time/Space Complexity), DSA 5 (Arrays & Prefix Sums) and DSA 6 (Two Pointers & Sliding Window). DSA 12 (Linked Lists) helps for the "how is it stored" deep dives but is not required.`,
    hours: 14,
    langNotes: {
      java: `<p><b>Java:</b> use <code>ArrayDeque</code> for stacks (<code>push/pop/peek</code>), queues (<code>offer/poll/peek</code>) and deques (<code>offerFirst/pollLast</code> …); avoid the legacy synchronized <code>Stack</code> and node-heavy <code>LinkedList</code>. <code>ArrayDeque</code> rejects <code>null</code>; <code>poll/peek</code> return <code>null</code> on empty while <code>pop/remove</code> throw. Compare boxed <code>Integer</code> values with <code>.equals</code> or unbox first: <code>==</code> only works for -128..127. <code>int</code> overflow wraps silently, so use <code>long</code> for areas, sums and the encoded Min Stack. Integer <code>/</code> truncates toward zero, as RPN expects. Deep recursion overflows after roughly 10<sup>4</sup> frames: use an explicit stack. For hot loops an <code>int[]</code> with a <code>top</code> index avoids boxing. <code>PriorityQueue</code> is a min-heap.</p>`,
      python: `<p><b>Python:</b> a <code>list</code> is the stack (<code>append</code>, <code>pop()</code>, <code>[-1]</code>). For a queue or deque use <code>collections.deque</code> (<code>append</code>, <code>popleft</code>, <code>appendleft</code>, <code>pop</code>), because <code>list.pop(0)</code> is O(n). <code>[].pop()</code> raises <code>IndexError</code>, so check for empty first. Ints never overflow. But <code>//</code> rounds <b>down</b> (<code>-7 // 2 == -4</code>), so truncate toward zero with <code>int(a / b)</code> or fix the sign by hand. Recursion stops at about 1000 frames: use an explicit stack, or <code>sys.setrecursionlimit</code> together with <code>threading.stack_size</code>. Build strings in a list and <code>"".join</code> them. <code>heapq</code> is a min-heap only (negate values for a max-heap). Compare numbers with <code>==</code>, never <code>is</code>.</p>`,
      js: `<p><b>JavaScript:</b> an array is the stack (<code>push</code>, <code>pop</code>, <code>a[a.length - 1]</code>). <code>shift()</code> and <code>unshift()</code> are O(n), so build queues and monotonic deques from an array (or <code>Int32Array</code>) with a <code>head</code> index. Each index enters once, so it never needs to wrap. <code>[].pop()</code> quietly returns <code>undefined</code> instead of throwing. <code>Number</code> is exact only up to 2<sup>53</sup>; use <code>BigInt</code> past that. Division gives fractions, so RPN needs <code>Math.trunc(a / b)</code>. <code>%</code> keeps the dividend's sign, and <code>|0</code> truncates to 32 bits. <code>sort()</code> compares strings unless you pass <code>(a, b) =&gt; a - b</code>. Recursion depth is about 10<sup>4</sup> frames. <b>There is no built-in heap</b>: write a small <code>MinHeap</code> when you need one (this module's solutions do not).</p>`,
      cpp: `<p><b>C++:</b> <code>std::stack</code> and <code>std::queue</code> are adaptors over <code>deque</code>. A <code>vector</code> (<code>push_back/back/pop_back</code>) is often the simplest stack, and <code>std::deque</code> gives O(1) at both ends. <code>pop()</code> returns <code>void</code>, so read <code>top()</code>/<code>front()</code> first. Calling them on an empty container is <b>undefined behaviour</b>, not an exception. Signed overflow is also undefined behaviour: use <code>long long</code> for areas, prefix sums and the encoded Min Stack. <code>/</code> truncates toward zero. The default stack is about 8 MB, so very deep recursion can crash: prefer an explicit stack. Pass containers by <code>const&amp;</code>. <code>map</code> is O(log n), <code>unordered_map</code> O(1) on average, and <code>priority_queue</code> is a <b>max</b>-heap.</p>`
    },
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
