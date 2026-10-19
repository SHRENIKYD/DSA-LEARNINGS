(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  // Level order of a chain 0, 1, ..., n-1 where each node hangs on the left ('l') or right ('r'). Used by big test cases.
  // f(i) gives node i's value (default: i).
  function m14chain(n, side, f) {
    f = f || function (i) { return i; };
    var out = [f(0)];
    for (var i = 1; i < n; i++) { if (side === 'l') out.push(f(i), null); else out.push(null, f(i)); }
    if (side === 'l') out.pop();
    return out;
  }

  /* ---------- shared helpers for the tree visualizers ---------- */
  var NUL = /^(null|nil|none|n|#|x|-)$/i;

  // Parse "1 2 3 null 5" into heap-style slots: children of slot i live at 2i+1 and 2i+2.
  function parseTreeStr(s) {
    s = String(s === undefined || s === null ? '' : s).trim();
    if (!s) throw new Error('Type the tree as level-order slots, e.g. "1 2 3 null 5" (null = empty slot).');
    var toks = s.split(/[\s,]+/).filter(function (t) { return t.length; });
    if (toks.length > 31) throw new Error('Please keep the tree to at most 31 slots (5 levels) so it fits on screen.');
    var a = toks.map(function (t) {
      if (NUL.test(t)) return null;
      if (!/^-?\d+$/.test(t)) throw new Error('"' + t + '" is not a whole number or null. Example: "1 2 3 null 5".');
      return Number(t);
    });
    if (a[0] === null) throw new Error('The root (first slot) cannot be null.');
    for (var i = 1; i < a.length; i++) {
      if (a[i] !== null && a[(i - 1) >> 1] === null) {
        throw new Error('Slot ' + i + ' holds ' + a[i] + ' but its parent slot ' + ((i - 1) >> 1) +
          ' is null. Slots work like a heap: children of slot i are 2i+1 and 2i+2.');
      }
    }
    while (a.length && a[a.length - 1] === null) a.pop();
    return a;
  }
  // Split "left part | right part"
  function splitBar(input, def2) {
    var s = String(input === undefined || input === null ? '' : input);
    var p = s.split('|');
    return [p[0], p.length > 1 ? p.slice(1).join('|').trim() : (def2 || '')];
  }
  function parseNums(s, what) {
    s = String(s || '').trim();
    if (!s) throw new Error('Please type some whole numbers for ' + what + '.');
    return s.split(/[\s,]+/).filter(function (t) { return t.length; }).map(function (t) {
      if (!/^-?\d+$/.test(t)) throw new Error('"' + t + '" is not a whole number (' + what + ').');
      return Number(t);
    });
  }
  function ex(a, i) { return i < a.length && a[i] !== null && a[i] !== undefined; }
  function o1(k, v) { var o = {}; o[k] = v; return o; }
  function cpy(o) { var r = {}; for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) r[k] = o[k]; return r; }
  function nodesOf(a) { var r = []; for (var i = 0; i < a.length; i++) if (ex(a, i)) r.push(i); return r; }
  function needUnique(a) {
    var seen = {};
    nodesOf(a).forEach(function (i) {
      if (seen[a[i]]) throw new Error('This visualizer finds nodes by value, so please use distinct values (' + a[i] + ' repeats).');
      seen[a[i]] = 1;
    });
  }
  function slotOf(a, v) { for (var i = 0; i < a.length; i++) if (ex(a, i) && a[i] === v) return i; return -1; }

  // ----- BST built from linked node objects, drawn by converting to slots -----
  function bstIns(r, v) {
    if (!r) return { val: v, left: null, right: null };
    if (v < r.val) r.left = bstIns(r.left, v);
    else if (v > r.val) r.right = bstIns(r.right, v);
    else throw new Error('Value ' + v + ' appears twice. Use distinct values for the BST.');
    return r;
  }
  function bstFrom(vals) {
    var root = null;
    if (vals.length > 20) throw new Error('Please use at most 20 values.');
    vals.forEach(function (v) { root = bstIns(root, v); });
    return root;
  }
  // Convert linked tree to slots + value->slot index. Throws if deeper than 4 levels.
  function toArr(root) {
    var a = [], idx = {};
    (function go(n, i) {
      if (!n) return;
      if (i >= 31) throw new Error('The tree grew deeper than 5 levels, which will not fit on screen. Try inserting a middle value first so it stays bushy.');
      while (a.length <= i) a.push(null);
      a[i] = n.val; idx[n.val] = i;
      go(n.left, 2 * i + 1); go(n.right, 2 * i + 2);
    })(root, 0);
    return { arr: a, idx: idx };
  }
  // value-keyed highlight map -> slot-keyed map
  function hv(r, m) {
    var o = {};
    for (var k in m) if (Object.prototype.hasOwnProperty.call(m, k) && r.idx[k] !== undefined) o[r.idx[k]] = m[k];
    return o;
  }
  function inorderVals(n, out) { if (!n) return out; inorderVals(n.left, out); out.push(n.val); inorderVals(n.right, out); return out; }
  /* ===================== TOPIC 1: Terminology ===================== */
  topics.push({
    title: 'Tree Terminology: Root, Leaf, Depth, Height & Friends',
    analogy: `<p>Think of a <b>family tree</b> or your company's <b>org chart</b>. The CEO sits at the top (the <b>root</b>). Each manager has people reporting to them (their <b>children</b>), and the manager is their <b>parent</b>. Interns with nobody under them are the <b>leaves</b>. Your laptop's <b>folders</b> work the same way: <code>C:</code> holds folders, which hold more folders, which finally hold files (leaves). There are no loops: a folder is never inside itself.</p>`,
    explain: `<p>A <b>tree</b> is a bunch of boxes (called <b>nodes</b>) joined by lines (called <b>edges</b>), with one special top node and <b>no cycles</b>. A <b>binary tree</b> is a tree where every node has <b>at most 2 children</b>: a <code>left</code> and a <code>right</code>.</p>
<pre>
            1          ← root (depth 0)
          /   \\
         2     3       ← depth 1  (2 and 3 are siblings)
        / \\     \\
       4   5     6     ← depth 2  (4, 5, 6 are leaves)
</pre>
${H.table(['Word', 'Plain meaning', 'In the picture'], [
  ['<b>Root</b>', 'The top node. It has no parent.', H.c('p', '1')],
  ['<b>Parent / Child</b>', 'A node directly above / directly below, joined by one edge.', '2 is the parent of 4 and 5'],
  ['<b>Siblings</b>', 'Children of the same parent.', '2 and 3; 4 and 5'],
  ['<b>Leaf</b>', 'A node with no children.', H.c('g', '4, 5, 6')],
  ['<b>Internal node</b>', 'Any node that is not a leaf.', '1, 2, 3'],
  ['<b>Edge</b>', 'A line from parent to child. A tree with N nodes always has N − 1 edges.', '6 nodes → 5 edges'],
  ['<b>Depth</b> (level)', 'How many edges you walk DOWN from the root to reach the node.', 'depth(5) = 2'],
  ['<b>Height</b>', 'Length of the longest path from the node DOWN to a leaf. In this module we count <b>nodes</b>: empty = 0, leaf = 1.', 'height(1) = 3, height(3) = 2'],
  ['<b>Subtree</b>', 'A node plus everything below it.', 'subtree of 2 = {2, 4, 5}'],
  ['<b>Ancestor / Descendant</b>', 'Anyone on the path up to the root / anyone below you.', 'ancestors of 6: 3, 1'],
  ['<b>Degree</b>', 'Number of children of a node.', 'degree(2) = 2, degree(3) = 1']
])}
<p><b>Shapes you will hear about:</b></p>
<ul>
<li><b>Full</b>: every node has 0 or 2 children (never exactly 1).</li>
<li><b>Complete</b>: every level is filled except maybe the last, which is filled from the left (this is how a heap looks).</li>
<li><b>Perfect</b>: all levels completely full. Level <code>d</code> holds 2<sup>d</sup> nodes, so a perfect tree of height h has 2<sup>h</sup> − 1 nodes.</li>
<li><b>Skewed</b>: every node has only one child, so the tree is really a linked list. Height = N (the worst case).</li>
<li><b>Balanced</b>: height stays around log₂N. With N = 10<sup>6</sup> that is only about 20 levels!</li>
</ul>
<p><b>Binary Search Tree (BST)</b> is a binary tree with an ordering rule: everything in the <b>left</b> subtree is <b>smaller</b> than the node, everything in the <b>right</b> subtree is <b>bigger</b>. We use it in the second half of this module.</p>
<p>In code a node is just a small object with a value and two links (a class in Java, Python and JavaScript, a struct in C++):</p>`,
    clues: [
      '"Given the <b>root</b> of a binary tree…" → you get a <code>TreeNode</code>; think recursion (solve left, solve right, combine) or BFS (level by level).',
      '"<b>depth</b> / <b>level</b> / <b>distance from root</b>" → counted top-down (pass depth as a parameter, or BFS level count).',
      '"<b>height</b> / <b>longest path down</b> / <b>bottom-up</b>" → postorder: children answer first, the parent combines.',
      '"<b>leaf</b>" → a node with <code>left == null &amp;&amp; right == null</code>; many path problems stop there.',
      '<code>N ≤ 10<sup>5</sup></code> nodes and the tree may be <b>skewed</b> → recursion depth can be 10<sup>5</sup>; consider an iterative version with your own stack.',
      'Tree input in LeetCode style like <code>[1,null,2,3]</code> → level order, <code>null</code> = missing child.'
    ],
    code: [{ lang: 'java', code: `
// The standard node used in almost every tree problem.
class TreeNode {
    int val;            // the data stored in this box
    TreeNode left;      // link to the left child (null if none)
    TreeNode right;     // link to the right child (null if none)
    TreeNode() {}
    TreeNode(int val) { this.val = val; }
    TreeNode(int val, TreeNode left, TreeNode right) {
        this.val = val; this.left = left; this.right = right;
    }
}

class BuildTree {
    // Build a tree from LeetCode-style level order, e.g. {1, null, 2, 3}.
    // null means "no child here". Children of null slots are NOT listed.
    static TreeNode build(Integer[] a) {
        if (a.length == 0 || a[0] == null) return null;
        TreeNode root = new TreeNode(a[0]);
        Queue<TreeNode> q = new LinkedList<>();   // parents waiting for children
        q.add(root);
        int i = 1;                                  // next value to hand out
        while (!q.isEmpty() && i < a.length) {
            TreeNode parent = q.poll();
            if (i < a.length && a[i] != null) {     // give a left child
                parent.left = new TreeNode(a[i]);
                q.add(parent.left);
            }
            i++;
            if (i < a.length && a[i] != null) {     // give a right child
                parent.right = new TreeNode(a[i]);
                q.add(parent.right);
            }
            i++;
        }
        return root;
    }

    // Count nodes: me (1) + everyone on the left + everyone on the right.
    static int count(TreeNode n) {
        if (n == null) return 0;
        return 1 + count(n.left) + count(n.right);
    }

    // Count leaves: a node with no children counts as 1.
    static int leaves(TreeNode n) {
        if (n == null) return 0;
        if (n.left == null && n.right == null) return 1;
        return leaves(n.left) + leaves(n.right);
    }

    public static void main(String[] args) {
        TreeNode root = build(new Integer[]{1, 2, 3, 4, 5, null, 6});
        System.out.println(count(root) + " nodes, " + leaves(root) + " leaves"); // 6 nodes, 3 leaves
    }
}`, alt: [{ lang: 'python', run: true, code: `from collections import deque

# The standard node used in almost every tree problem.
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val          # the data stored in this box
        self.left = left        # link to the left child (None if none)
        self.right = right      # link to the right child (None if none)

def build(a):
    # Build a tree from LeetCode-style level order, e.g. [1, None, 2, 3].
    # None means "no child here". Children of None slots are NOT listed.
    if not a or a[0] is None:
        return None
    root = TreeNode(a[0])
    q = deque([root])           # parents waiting for children
    i = 1                       # next value to hand out
    while q and i < len(a):
        parent = q.popleft()
        if i < len(a) and a[i] is not None:      # give a left child
            parent.left = TreeNode(a[i])
            q.append(parent.left)
        i += 1
        if i < len(a) and a[i] is not None:      # give a right child
            parent.right = TreeNode(a[i])
            q.append(parent.right)
        i += 1
    return root

def count(n):
    # me (1) + everyone on the left + everyone on the right
    return 0 if n is None else 1 + count(n.left) + count(n.right)

def leaves(n):
    if n is None:
        return 0
    if n.left is None and n.right is None:       # no children -> a leaf
        return 1
    return leaves(n.left) + leaves(n.right)

root = build([1, 2, 3, 4, 5, None, 6])
print(count(root), "nodes,", leaves(root), "leaves")   # 6 nodes, 3 leaves
` }, { lang: 'js', run: true, code: `// The standard node used in almost every tree problem.
class TreeNode {
  constructor(val = 0, left = null, right = null) {
    this.val = val;       // the data stored in this box
    this.left = left;     // link to the left child (null if none)
    this.right = right;   // link to the right child (null if none)
  }
}

// Build a tree from LeetCode-style level order, e.g. [1, null, 2, 3].
// null means "no child here". Children of null slots are NOT listed.
function build(a) {
  if (!a.length || a[0] === null) return null;
  const root = new TreeNode(a[0]);
  const q = [root];                   // parents waiting for children
  let head = 0, i = 1;                // read index instead of shift(), which is O(n)
  while (head < q.length && i < a.length) {
    const parent = q[head++];
    if (i < a.length && a[i] !== null) { parent.left = new TreeNode(a[i]); q.push(parent.left); }
    i++;
    if (i < a.length && a[i] !== null) { parent.right = new TreeNode(a[i]); q.push(parent.right); }
    i++;
  }
  return root;
}

// me (1) + everyone on the left + everyone on the right
const count = (n) => (n ? 1 + count(n.left) + count(n.right) : 0);

function leaves(n) {
  if (!n) return 0;
  if (!n.left && !n.right) return 1;  // no children -> a leaf
  return leaves(n.left) + leaves(n.right);
}

const root = build([1, 2, 3, 4, 5, null, 6]);
console.log(count(root) + ' nodes, ' + leaves(root) + ' leaves');   // 6 nodes, 3 leaves
` }, { lang: 'cpp', code: `// The standard node used in almost every tree problem.
struct TreeNode {
    int val;            // the data stored in this box
    TreeNode* left;     // link to the left child (nullptr if none)
    TreeNode* right;    // link to the right child (nullptr if none)
    TreeNode(int v = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(v), left(l), right(r) {}
};

// Build a tree from LeetCode-style level order. nullopt means "no child here".
TreeNode* build(const vector<optional<int>>& a) {
    if (a.empty() || !a[0]) return nullptr;
    TreeNode* root = new TreeNode(*a[0]);
    queue<TreeNode*> q;                 // parents waiting for children
    q.push(root);
    size_t i = 1;                       // next value to hand out
    while (!q.empty() && i < a.size()) {
        TreeNode* parent = q.front(); q.pop();
        if (i < a.size() && a[i]) { parent->left = new TreeNode(*a[i]); q.push(parent->left); }
        i++;
        if (i < a.size() && a[i]) { parent->right = new TreeNode(*a[i]); q.push(parent->right); }
        i++;
    }
    return root;
}

// me (1) + everyone on the left + everyone on the right
int count(TreeNode* n) { return n ? 1 + count(n->left) + count(n->right) : 0; }

int leaves(TreeNode* n) {
    if (!n) return 0;
    if (!n->left && !n->right) return 1;    // no children -> a leaf
    return leaves(n->left) + leaves(n->right);
}

int main() {
    TreeNode* root = build({1, 2, 3, 4, 5, nullopt, 6});
    cout << count(root) << " nodes, " << leaves(root) << " leaves\\n";   // 6 nodes, 3 leaves
}
` }] }],
    codeTitle: ['TreeNode + build from level order + counting'],
    viz: {
      title: 'Tour of tree words',
      input: '1 2 3 4 5 null 6',
      inputLabel: 'Tree slots (level order; children of slot i are 2i+1, 2i+2; null = empty)',
      gen: function (input) {
        var a = parseTreeStr(input);
        var nodes = nodesOf(a), F = [];
        var depth = function (i) { return Math.floor(Math.log2(i + 1)); };
        var hgt = function (i) { return ex(a, i) ? 1 + Math.max(hgt(2 * i + 1), hgt(2 * i + 2)) : 0; };
        var leaves = nodes.filter(function (i) { return !ex(a, 2 * i + 1) && !ex(a, 2 * i + 2); });
        F.push({ narr: 'Here is our tree. Each circle is a <b>node</b>, each line is an <b>edge</b>. It has ' + nodes.length + ' nodes and therefore ' + (nodes.length - 1) + ' edges (every node except the root hangs from exactly one edge).', parts: [
          { type: 'tree', label: 'Binary tree', arr: a.slice() },
          { type: 'vars', vals: { nodes: nodes.length, edges: nodes.length - 1 } }] });
        F.push({ narr: 'The <b>root</b> is ' + a[0] + ': the top node, the only one without a parent. Every walk through the tree starts here, just like a CEO at the top of an org chart.', parts: [
          { type: 'tree', label: 'Binary tree', arr: a.slice(), hl: { 0: 'sel' }, tags: { 0: 'root' } }] });
        var par = -1;
        for (var k = 0; k < nodes.length; k++) { var p = nodes[k]; if (ex(a, 2 * p + 1) || ex(a, 2 * p + 2)) { par = p; break; } }
        if (par >= 0) {
          var hl = o1(par, 'cur'), tg = o1(par, 'parent'), eh = {};
          [2 * par + 1, 2 * par + 2].forEach(function (c) { if (ex(a, c)) { hl[c] = 'ok'; tg[c] = 'child'; eh[c] = 'ok'; } });
          var both = ex(a, 2 * par + 1) && ex(a, 2 * par + 2);
          F.push({ narr: 'Node ' + a[par] + ' is a <b>parent</b>; the green node(s) directly below are its <b>children</b>.' + (both ? ' Two children of the same parent are called <b>siblings</b>.' : '') + ' In a binary tree a parent has at most 2 children: left and right.', parts: [
            { type: 'tree', label: 'Binary tree', arr: a.slice(), hl: hl, tags: tg, ehl: eh }] });
        }
        var lh = {}, lt = {};
        leaves.forEach(function (i) { lh[i] = 'ok'; lt[i] = 'leaf'; });
        F.push({ narr: 'The <b>leaves</b> are nodes with no children: ' + leaves.map(function (i) { return a[i]; }).join(', ') + '. In code: <code>left == null &amp;&amp; right == null</code>.', parts: [
          { type: 'tree', label: 'Binary tree', arr: a.slice(), hl: lh, tags: lt },
          { type: 'vars', vals: { leaves: leaves.length, internal: nodes.length - leaves.length } }] });
        var dt = {};
        nodes.forEach(function (i) { dt[i] = 'd=' + depth(i); });
        F.push({ narr: '<b>Depth</b> = number of edges from the root down to the node. It is measured from the TOP: root has depth 0, its children depth 1, and so on. All nodes with the same depth form a <b>level</b>.', parts: [
          { type: 'tree', label: 'Depth (top-down)', arr: a.slice(), tags: dt }] });
        var ht = {};
        nodes.forEach(function (i) { ht[i] = 'h=' + hgt(i); });
        F.push({ narr: '<b>Height</b> is measured from the BOTTOM: how many nodes are on the longest path from this node down to a leaf. Leaves have height 1, an empty spot has height 0, and the root\'s height (' + hgt(0) + ') is the height of the whole tree.', parts: [
          { type: 'tree', label: 'Height (bottom-up, counting nodes)', arr: a.slice(), tags: ht },
          { type: 'vars', vals: { treeHeight: hgt(0) } }] });
        if (ex(a, 1)) {
          var sh = {}, stack = [1];
          while (stack.length) { var x = stack.pop(); if (!ex(a, x)) continue; sh[x] = 'win'; stack.push(2 * x + 1, 2 * x + 2); }
          F.push({ narr: 'A <b>subtree</b> is a node plus everything hanging below it. The blue nodes form the left subtree of the root. Every subtree is itself a tree, which is why recursion works so well on trees.', parts: [
            { type: 'tree', label: 'Left subtree of the root', arr: a.slice(), hl: sh }] });
        }
        var deep = nodes[nodes.length - 1], ah = o1(deep, 'cur'), at = o1(deep, 'me'), q = deep;
        while (q > 0) { q = (q - 1) >> 1; ah[q] = 'sel'; at[q] = 'anc'; }
        F.push({ narr: 'Walk from node ' + a[deep] + ' up to the root: every purple node on that path is an <b>ancestor</b> of ' + a[deep] + ' (and ' + a[deep] + ' is their <b>descendant</b>). The lowest node that is an ancestor of two nodes is their <b>LCA</b> — we will meet it later.', parts: [
          { type: 'tree', label: 'Ancestors', arr: a.slice(), hl: ah, tags: at }] });
        var perfect = Math.pow(2, hgt(0)) - 1;
        F.push({ narr: 'Summary: ' + nodes.length + ' nodes, ' + (nodes.length - 1) + ' edges, height ' + hgt(0) + '. A <b>perfect</b> tree of this height would hold 2<sup>' + hgt(0) + '</sup> − 1 = ' + perfect + ' nodes' + (perfect === nodes.length ? ' — and ours is perfect!' : '; ours has ' + (perfect - nodes.length) + ' empty spot(s).'), parts: [
          { type: 'tree', label: 'Binary tree', arr: a.slice(), hl: { 0: 'sel' } },
          { type: 'vars', vals: { nodes: nodes.length, edges: nodes.length - 1, height: hgt(0), leaves: leaves.length, perfectWouldHave: perfect } }] });
        return F;
      }
    },
    after: `<p><b>About the visualizer input:</b> our boxes use <b>slot numbering</b> (like a heap): slot 0 is the root, and the children of slot <code>i</code> sit in slots <code>2i+1</code> and <code>2i+2</code>, with <code>null</code> for empty slots. LeetCode's format is shorter: it skips the children of null nodes. For small trees they usually look the same.</p>`,
    examples: [
      {
        title: 'Count everything in a perfect tree of 7 nodes',
        html: `<pre>
            1
          /   \\
         2     3
        / \\   / \\
       4   5 6   7
</pre>
${H.table(['Question', 'Answer', 'Why'], [
  ['Nodes N', '7', 'count the circles'],
  ['Edges', '6', 'every node except the root hangs from exactly one edge → N − 1'],
  ['Leaves', H.c('g', '4, 5, 6, 7'), 'no children'],
  ['Height (nodes)', '3', '2<sup>3</sup> − 1 = 7, so it is perfect'],
  ['Nodes on level 2', '4', 'level d holds at most 2<sup>d</sup> = 2<sup>2</sup>'],
  ['Depth of 6', '2', '1 → 3 → 6 is two edges']
])}
<p>Handy fact: in a <b>full</b> binary tree (0 or 2 children everywhere) leaves = internal nodes + 1. Here 4 = 3 + 1.</p>`
      },
      {
        title: 'Same million nodes, two very different heights',
        html: `<p>Put N = 1,000,000 values into a tree.</p>
${H.table(['Shape', 'Height', 'Cost to walk root → deepest leaf'], [
  ['Balanced (bushy)', H.c('g', '≈ 20'), 'log₂(1,000,000) ≈ 19.9 → about 20 steps'],
  ['Skewed (a chain)', H.c('r', '1,000,000'), 'every node has one child → it is just a linked list']
])}
<p>That is why almost every tree complexity is written as <b>O(h)</b> and then explained twice: "O(log N) if balanced, O(N) if skewed". Interviewers love asking "and what if the tree is skewed?"</p>`
      },
      {
        title: 'Depth goes down, height comes up — compute both',
        html: `<p>Depth is passed <b>down</b> as a parameter (the parent knows its own depth and adds 1). Height comes <b>up</b> as a return value (children answer first). For node 2 in the picture above: depth = ${H.c('b', '1')}, height = ${H.c('p', '2')}.</p>`,
        code: { lang: 'java', code: `
class DepthHeight {
    // DEPTH: top-down. The caller tells me my depth.
    static void printDepths(TreeNode n, int depth) {
        if (n == null) return;
        System.out.println(n.val + " is at depth " + depth);
        printDepths(n.left, depth + 1);   // my children are one level deeper
        printDepths(n.right, depth + 1);
    }

    // HEIGHT: bottom-up. My children tell me their heights.
    static int height(TreeNode n) {
        if (n == null) return 0;                 // empty spot has height 0
        return 1 + Math.max(height(n.left), height(n.right));
    }

    public static void main(String[] args) {
        TreeNode root = new TreeNode(1,
                new TreeNode(2, new TreeNode(4), new TreeNode(5)),
                new TreeNode(3, null, new TreeNode(6)));
        printDepths(root, 0);
        System.out.println("height of tree = " + height(root));   // 3
    }
}`, alt: [{ lang: 'python', run: true, code: `class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val, self.left, self.right = val, left, right

# DEPTH: top-down. The caller tells me my depth.
def print_depths(n, depth=0):
    if n is None:
        return
    print(n.val, "is at depth", depth)
    print_depths(n.left, depth + 1)      # my children are one level deeper
    print_depths(n.right, depth + 1)

# HEIGHT: bottom-up. My children tell me their heights.
def height(n):
    if n is None:
        return 0                         # empty spot has height 0
    return 1 + max(height(n.left), height(n.right))

root = TreeNode(1, TreeNode(2, TreeNode(4), TreeNode(5)), TreeNode(3, None, TreeNode(6)))
print_depths(root)
print("height of tree =", height(root))  # 3
` }, { lang: 'js', run: true, code: `class TreeNode {
  constructor(val = 0, left = null, right = null) { this.val = val; this.left = left; this.right = right; }
}

// DEPTH: top-down. The caller tells me my depth.
function printDepths(n, depth = 0) {
  if (!n) return;
  console.log(n.val + ' is at depth ' + depth);
  printDepths(n.left, depth + 1);    // my children are one level deeper
  printDepths(n.right, depth + 1);
}

// HEIGHT: bottom-up. My children tell me their heights.
function height(n) {
  if (!n) return 0;                  // empty spot has height 0
  return 1 + Math.max(height(n.left), height(n.right));
}

const root = new TreeNode(1, new TreeNode(2, new TreeNode(4), new TreeNode(5)), new TreeNode(3, null, new TreeNode(6)));
printDepths(root);
console.log('height of tree = ' + height(root));   // 3
` }, { lang: 'cpp', code: `// TreeNode as defined in the first lesson
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int v = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(v), left(l), right(r) {}
};

// DEPTH: top-down. The caller tells me my depth.
void printDepths(TreeNode* n, int depth) {
    if (!n) return;
    cout << n->val << " is at depth " << depth << '\\n';
    printDepths(n->left, depth + 1);     // my children are one level deeper
    printDepths(n->right, depth + 1);
}

// HEIGHT: bottom-up. My children tell me their heights.
int height(TreeNode* n) {
    if (!n) return 0;                    // empty spot has height 0
    return 1 + max(height(n->left), height(n->right));
}

int main() {
    TreeNode* root = new TreeNode(1, new TreeNode(2, new TreeNode(4), new TreeNode(5)),
                                     new TreeNode(3, nullptr, new TreeNode(6)));
    printDepths(root, 0);
    cout << "height of tree = " << height(root) << '\\n';   // 3
}
` }] }
      },
      {
        title: 'Complete trees fit in an array (no pointers needed)',
        html: `<p>If a tree is <b>complete</b> (filled level by level, left to right), store it in an array: the node at index <code>i</code> has children at <code>2i + 1</code> and <code>2i + 2</code>, and its parent at <code>(i − 1) / 2</code>.</p>
${H.arr([1, 2, 3, 4, 5, 6, 7], { label: 'tree stored by levels', hl: { 1: 'b', 3: 'g', 4: 'g' } })}
<p>Index 1 holds ${H.c('b', '2')}; its children are at 3 and 4 → ${H.c('g', '4 and 5')}. This is exactly how a <b>heap</b> (next module) is stored, and how our visualizers number their slots.</p>`
      }
    ],
    deepDive: `<p><b>Why N − 1 edges?</b> Every node except the root has exactly one parent, so it owns exactly one edge going up. N nodes, one is the root, so N − 1 edges. A connected graph with N nodes and N − 1 edges is always a tree (no cycle can exist) — this is a common "is this graph a valid tree?" check in the Graphs module.</p>
<p><b>Counting facts worth memorising:</b></p>
<ul>
<li>Level d holds at most 2<sup>d</sup> nodes; a tree of height h holds at most 2<sup>h</sup> − 1 nodes.</li>
<li>So the <b>minimum</b> height for N nodes is ⌈log₂(N + 1)⌉. For N = 7 that is 3; for N = 8 it is 4.</li>
<li>A tree with N nodes has exactly <b>N + 1 null child links</b> (2N slots, N − 1 used). A recursive traversal therefore makes 2N + 1 calls in total — still O(N).</li>
<li>The number of different binary tree <b>shapes</b> with N nodes is the Catalan number C<sub>N</sub>: 1, 1, 2, 5, 14, 42… (N = 3 gives 5 shapes). That is why "how many structurally unique BSTs" is a DP problem.</li>
</ul>
<p><b>Memory reality:</b> a Java <code>TreeNode</code> costs about 24 bytes (12-byte object header + 4-byte int + two 4-byte compressed references), so 10<sup>6</sup> nodes ≈ 24 MB before the values. A C++ node (an int plus two 8-byte pointers) is also about 24 bytes; a Python node object is several times bigger, and JavaScript objects sit in between. Nodes are scattered around the heap, so walking a tree is "pointer chasing" with many cache misses — one reason databases use wide <b>B-trees</b> (hundreds of children per node, one disk page per node) instead of binary trees, and why heaps use the array layout.</p>
<p><b>N-ary trees</b> (folders, the DOM, JSON) store a list of children (<code>List&lt;Node&gt;</code> in Java, a <code>list</code> in Python, an array in JavaScript, <code>vector&lt;Node*&gt;</code> in C++). Every idea in this module carries over: preorder = parent before children, postorder = children before parent, BFS = level by level. A classic trick turns any N-ary tree into a binary tree: <b>left-child, right-sibling</b>.</p>`,
    aiEra: `<p><b>What AI changes:</b> boilerplate is free. An assistant writes the <code>TreeNode</code> class, a level-order builder and a pretty printer in seconds, and can draw ASCII trees for your test cases. Use that time on thinking, not typing.</p>
<p><b>Use AI as a partner:</b> <code>Give me 6 tricky binary trees for testing (empty, single node, skewed left, skewed right, perfect, zig-zag) in LeetCode array format, and draw each one</code>. Then predict depth/height yourself before checking.</p>
<p><b>Where AI goes wrong:</b> height definitions. Some sources count <b>edges</b> (leaf = 0, empty = −1), LeetCode's "maximum depth" counts <b>nodes</b> (leaf = 1). Generated code often mixes the two and is off by one. It also confuses "complete" and "full" and quietly assumes the tree is balanced when quoting O(log N).</p>
<p><b>Trees are everywhere in AI tooling:</b> code assistants edit your program as an <b>abstract syntax tree</b> (tree-sitter), the browser DOM is a tree, JSON tool-call arguments are trees, decision trees and gradient-boosted trees are still workhorses, and search methods like tree-of-thought or Monte-Carlo tree search explore a tree of possibilities.</p>
<p><b>What you must still own:</b> stating which definition you use out loud in the interview ("I'll count height in nodes, empty = 0"), and knowing when O(h) means log N and when it means N.</p>`
  });
  /* ===================== TOPIC 2: Recursive DFS ===================== */
  topics.push({
    title: 'Preorder, Inorder, Postorder (Recursive DFS)',
    analogy: `<p>Imagine walking through the <b>folders</b> on your computer.</p>
<ul>
<li><b>Preorder</b> (Me → Left → Right): you <b>print a folder's name first</b>, then open its sub-folders. That is how a table of contents is printed: chapter title, then its sections.</li>
<li><b>Inorder</b> (Left → Me → Right): like reading a family photo row <b>from left to right</b>. On a BST this gives the numbers in <b>sorted order</b>.</li>
<li><b>Postorder</b> (Left → Right → Me): to know a folder's <b>total size</b> you must first add up its sub-folders. Children report first, the parent goes last — like a manager waiting for every team's report before writing the summary.</li>
</ul>`,
    explain: `<p><b>DFS</b> (Depth-First Search) means: go as deep as you can down one branch before coming back. All three orders visit the exact same nodes along the exact same path; the <b>only</b> difference is <b>when you write down</b> the current node.</p>
<pre>
            1
          /   \\
         2     3
        / \\     \\
       4   5     6
</pre>
${H.table(['Order', 'Rule', 'Output', 'When to use'], [
  ['<b>Preorder</b>', H.c('y', 'Me') + ', Left, Right', H.c('g', '1 2 4 5 3 6'), 'copy / serialize a tree, print a folder listing'],
  ['<b>Inorder</b>', 'Left, ' + H.c('y', 'Me') + ', Right', H.c('g', '4 2 5 1 3 6'), 'BST → sorted order, k-th smallest, validate BST'],
  ['<b>Postorder</b>', 'Left, Right, ' + H.c('y', 'Me'), H.c('g', '4 5 2 6 3 1'), 'height, diameter, balanced check, delete a tree, folder sizes']
])}
<p><b>How the recursion really runs:</b> each call <code>f(node)</code> is a sticky note placed on a pile (the <b>call stack</b>). When <code>f(2)</code> calls <code>f(4)</code>, the note for 4 goes on top. When <code>f(4)</code> finishes, its note is removed and we continue <code>f(2)</code> exactly where we stopped. The pile is never taller than the tree's height, so extra space is <b>O(h)</b>: about log₂N for a bushy tree, but N for a skewed one.</p>
<p><b>Trick to remember:</b> the name tells you where <b>Me</b> goes: <b>pre</b> = before the children, <b>in</b> = in between, <b>post</b> = after.</p>`,
    clues: [
      '"Return the <b>preorder / inorder / postorder</b> traversal" → direct DFS; the word says where to record the node.',
      '"<b>BST</b>" + "<b>sorted</b>" / "k-th smallest" / "validate" → inorder (BST inorder is always increasing).',
      '"Answer for a node depends on its <b>children\'s answers</b>" (height, size, sum, balanced, diameter) → postorder.',
      '"<b>Copy</b>, <b>clone</b>, <b>serialize</b> the tree" or "<b>root-to-leaf path</b>" → preorder (decide at the node, then go down).',
      'Each node visited once → <b>O(N)</b> time; recursion uses <b>O(h)</b> stack space (h = height).'
    ],
    code: { lang: 'java', code: `
class Traversals {
    // PREORDER: Me, Left, Right
    static void preorder(TreeNode node, List<Integer> out) {
        if (node == null) return;      // empty spot: nothing to do
        out.add(node.val);             // 1) write me down FIRST
        preorder(node.left, out);      // 2) then my whole left side
        preorder(node.right, out);     // 3) then my whole right side
    }

    // INORDER: Left, Me, Right   (BST -> sorted order)
    static void inorder(TreeNode node, List<Integer> out) {
        if (node == null) return;
        inorder(node.left, out);       // 1) everything smaller / to my left
        out.add(node.val);             // 2) me IN the middle
        inorder(node.right, out);      // 3) everything to my right
    }

    // POSTORDER: Left, Right, Me   (children report before the parent)
    static void postorder(TreeNode node, List<Integer> out) {
        if (node == null) return;
        postorder(node.left, out);
        postorder(node.right, out);
        out.add(node.val);             // write me down LAST
    }

    public static void main(String[] args) {
        // Tree:      1
        //          /   \\
        //         2     3
        //        / \\     \\
        //       4   5     6
        TreeNode root = new TreeNode(1,
                new TreeNode(2, new TreeNode(4), new TreeNode(5)),
                new TreeNode(3, null, new TreeNode(6)));
        List<Integer> a = new ArrayList<>(), b = new ArrayList<>(), c = new ArrayList<>();
        preorder(root, a); inorder(root, b); postorder(root, c);
        System.out.println(a + " " + b + " " + c); // [1,2,4,5,3,6] [4,2,5,1,3,6] [4,5,2,6,3,1]
    }
}`, alt: [{ lang: 'python', run: true, code: `class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val, self.left, self.right = val, left, right

# PREORDER: Me, Left, Right
def preorder(node, out):
    if node is None:
        return                       # empty spot: nothing to do
    out.append(node.val)             # 1) write me down FIRST
    preorder(node.left, out)         # 2) then my whole left side
    preorder(node.right, out)        # 3) then my whole right side

# INORDER: Left, Me, Right   (BST -> sorted order)
def inorder(node, out):
    if node is None:
        return
    inorder(node.left, out)
    out.append(node.val)             # me IN the middle
    inorder(node.right, out)

# POSTORDER: Left, Right, Me   (children report before the parent)
def postorder(node, out):
    if node is None:
        return
    postorder(node.left, out)
    postorder(node.right, out)
    out.append(node.val)             # write me down LAST

# Tree:      1
#          /   \\
#         2     3
#        / \\     \\
#       4   5     6
root = TreeNode(1, TreeNode(2, TreeNode(4), TreeNode(5)), TreeNode(3, None, TreeNode(6)))
a, b, c = [], [], []
preorder(root, a); inorder(root, b); postorder(root, c)
print(a, b, c)   # [1, 2, 4, 5, 3, 6] [4, 2, 5, 1, 3, 6] [4, 5, 2, 6, 3, 1]
` }, { lang: 'js', run: true, code: `class TreeNode {
  constructor(val = 0, left = null, right = null) { this.val = val; this.left = left; this.right = right; }
}

// PREORDER: Me, Left, Right
function preorder(node, out) {
  if (!node) return;              // empty spot: nothing to do
  out.push(node.val);             // 1) write me down FIRST
  preorder(node.left, out);       // 2) then my whole left side
  preorder(node.right, out);      // 3) then my whole right side
}

// INORDER: Left, Me, Right   (BST -> sorted order)
function inorder(node, out) {
  if (!node) return;
  inorder(node.left, out);
  out.push(node.val);             // me IN the middle
  inorder(node.right, out);
}

// POSTORDER: Left, Right, Me   (children report before the parent)
function postorder(node, out) {
  if (!node) return;
  postorder(node.left, out);
  postorder(node.right, out);
  out.push(node.val);             // write me down LAST
}

const root = new TreeNode(1, new TreeNode(2, new TreeNode(4), new TreeNode(5)), new TreeNode(3, null, new TreeNode(6)));
const a = [], b = [], c = [];
preorder(root, a); inorder(root, b); postorder(root, c);
console.log(a.join(','), b.join(','), c.join(','));   // 1,2,4,5,3,6 4,2,5,1,3,6 4,5,2,6,3,1
` }, { lang: 'cpp', code: `// TreeNode as defined in the first lesson
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int v = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(v), left(l), right(r) {}
};

// PREORDER: Me, Left, Right
void preorder(TreeNode* node, vector<int>& out) {
    if (!node) return;               // empty spot: nothing to do
    out.push_back(node->val);        // 1) write me down FIRST
    preorder(node->left, out);       // 2) then my whole left side
    preorder(node->right, out);      // 3) then my whole right side
}

// INORDER: Left, Me, Right   (BST -> sorted order)
void inorder(TreeNode* node, vector<int>& out) {
    if (!node) return;
    inorder(node->left, out);
    out.push_back(node->val);        // me IN the middle
    inorder(node->right, out);
}

// POSTORDER: Left, Right, Me   (children report before the parent)
void postorder(TreeNode* node, vector<int>& out) {
    if (!node) return;
    postorder(node->left, out);
    postorder(node->right, out);
    out.push_back(node->val);        // write me down LAST
}

int main() {
    TreeNode* root = new TreeNode(1, new TreeNode(2, new TreeNode(4), new TreeNode(5)),
                                     new TreeNode(3, nullptr, new TreeNode(6)));
    vector<int> a, b, c;             // passed by reference: one shared list each
    preorder(root, a); inorder(root, b); postorder(root, c);
    for (auto* v : {&a, &b, &c}) {
        for (int x : *v) cout << x << ' ';
        cout << "| ";
    }
    cout << '\\n';                    // 1 2 4 5 3 6 | 4 2 5 1 3 6 | 4 5 2 6 3 1 |
}
` }] },
    codeTitle: 'All three recursive traversals',
    viz: {
      title: 'Recursive traversal with the call stack',
      input: '1 2 3 4 5 null 6 | in',
      inputLabel: 'tree slots | pre or in or post',
      gen: function (input) {
        var sp = splitBar(input, 'in'), a = parseTreeStr(sp[0]);
        var mode = (sp[1] || 'in').toLowerCase();
        if (['pre', 'in', 'post'].indexOf(mode) < 0) throw new Error('After the | write pre, in or post.');
        var F = [], stack = [], out = [], printed = {};
        var name = { pre: 'Preorder (Me, Left, Right)', 'in': 'Inorder (Left, Me, Right)', post: 'Postorder (Left, Right, Me)' }[mode];
        function snap(narr, cur, cls) {
          var hl = {};
          for (var k in printed) hl[k] = 'ok';
          stack.forEach(function (i) { if (!printed[i]) hl[i] = 'win'; });
          if (cur !== undefined) hl[cur] = cls || 'cur';
          F.push({ narr: narr, parts: [
            { type: 'tree', label: name, arr: a.slice(), hl: hl },
            { type: 'stack', label: 'Call stack (top = running now)', items: stack.map(function (i) { return 'f(' + a[i] + ')'; }), hl: stack.length ? o1(stack.length - 1, 'cur') : {} },
            { type: 'array', label: 'output', values: out.slice(), hl: out.length ? o1(out.length - 1, 'ok') : {} }] });
        }
        function visit(i, why) { out.push(a[i]); printed[i] = 1; snap('<b>Write down ' + a[i] + '</b> — ' + why, i, 'sel'); }
        function kids(i) {
          var L = 2 * i + 1, R = 2 * i + 2, s = [];
          if (!ex(a, L)) s.push('left'); if (!ex(a, R)) s.push('right');
          return s.length ? ' (its ' + s.join(' and ') + ' child is empty, so that call returns at once)' : '';
        }
        function go(i) {
          stack.push(i);
          if (mode === 'pre') {
            out.push(a[i]); printed[i] = 1;
            snap('Call <code>f(' + a[i] + ')</code> → preorder writes the node <b>as soon as we arrive</b>: output ' + a[i] + '. Next we dive left.' + kids(i), i, 'sel');
          } else {
            snap('Call <code>f(' + a[i] + ')</code> and put its note on the stack. We must finish the <b>left</b> side before ' + (mode === 'in' ? 'writing ' + a[i] : 'touching ' + a[i]) + '.' + kids(i), i);
          }
          if (ex(a, 2 * i + 1)) go(2 * i + 1);
          if (mode === 'in') visit(i, 'the whole left side of ' + a[i] + ' is done, so in-order puts it here, between left and right.');
          if (ex(a, 2 * i + 2)) go(2 * i + 2);
          if (mode === 'post') visit(i, 'both children of ' + a[i] + ' have reported back, so postorder writes the parent last.');
          stack.pop();
          snap('<code>f(' + a[i] + ')</code> is finished; remove its note. ' + (stack.length ? 'Control goes back to <code>f(' + a[stack[stack.length - 1]] + ')</code>, which continues right where it paused.' : 'The stack is empty, so the traversal is complete.'), i, 'done');
        }
        snap('We run <b>' + name + '</b>. Blue = waiting on the stack, amber = running now, green = already written to the output.');
        go(0);
        F.push({ narr: 'Done! ' + name + ' = <b>' + out.join(' ') + '</b>. The stack never got taller than the tree height, which is why recursion needs O(h) extra space.', parts: [
          { type: 'tree', label: name, arr: a.slice(), hl: (function () { var h = {}; nodesOf(a).forEach(function (i) { h[i] = 'ok'; }); return h; })() },
          { type: 'array', label: 'output', values: out.slice() }] });
        return F;
      }
    },
    examples: [
      {
        title: 'Expression tree: prefix, infix and postfix for free',
        html: `<p>The expression <code>(2 + 3) * 4</code> stored as a tree: operators inside, numbers at the leaves.</p>
<pre>
          *
         / \\
        +   4
       / \\
      2   3
</pre>
${H.table(['Order', 'Output', 'Name in maths'], [
  ['Preorder', H.c('g', '* + 2 3 4'), 'prefix / Polish notation'],
  ['Inorder', H.c('y', '2 + 3 * 4'), 'infix — loses the brackets! (needs them added back)'],
  ['Postorder', H.c('p', '2 3 + 4 *'), 'postfix / Reverse Polish — what a stack calculator evaluates']
])}
<p>Postorder is also how you <b>evaluate</b> it: compute both children, then apply the operator. (2 + 3) = 5, then 5 * 4 = ${H.c('g', '20')}.</p>`,
        code: { lang: 'python', run: true, title: 'Evaluate an expression tree (postorder) — runnable', code: `class Node:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def pre(n):  return [] if n is None else [n.val] + pre(n.left) + pre(n.right)
def ino(n):  return [] if n is None else ino(n.left) + [n.val] + ino(n.right)
def post(n): return [] if n is None else post(n.left) + post(n.right) + [n.val]

def evaluate(n):
    # leaves are numbers; inner nodes are operators -> children first (postorder)
    if n.left is None and n.right is None:
        return n.val
    a, b = evaluate(n.left), evaluate(n.right)
    return {'+': a + b, '-': a - b, '*': a * b, '/': a / b}[n.val]

tree = Node('*', Node('+', Node(2), Node(3)), Node(4))
print('pre :', pre(tree))
print('in  :', ino(tree))
print('post:', post(tree))
print('value =', evaluate(tree))   # 20` }
      },
      {
        title: 'Sum of all nodes — postorder in one line',
        html: `<p>"My subtree's total = my value + left total + right total". Children answer first, so it is postorder thinking. For the tree 1, 2, 3, 4, 5, null, 6 the answer is 1 + (2 + 4 + 5) + (3 + 6) = ${H.c('g', '21')}.</p>`,
        code: { lang: 'java', code: `
int sum(TreeNode n) {
    if (n == null) return 0;                    // empty subtree adds nothing
    return n.val + sum(n.left) + sum(n.right);  // me + whole left + whole right
}`, alt: [{ lang: 'python', code: `def tree_sum(n):
    if n is None:
        return 0                                     # empty subtree adds nothing
    return n.val + tree_sum(n.left) + tree_sum(n.right)   # me + whole left + whole right
` }, { lang: 'js', code: `function sum(n) {
  if (!n) return 0;                                  // empty subtree adds nothing
  return n.val + sum(n.left) + sum(n.right);         // me + whole left + whole right
}
` }, { lang: 'cpp', code: `// TreeNode as defined in the first lesson
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int v = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(v), left(l), right(r) {}
};

long long sum(TreeNode* n) {
    if (!n) return 0;                                // empty subtree adds nothing
    return n->val + sum(n->left) + sum(n->right);    // me + whole left + whole right
}
` }] }
      },
      {
        title: 'All root-to-leaf paths — preorder with "undo"',
        html: `<p>Preorder decides at a node <b>before</b> going down, so it is perfect for carrying a path. Add the node, go down, and <b>remove</b> it when you come back (backtracking). For the tree 1 → (2 → 4, 5), (3 → 6) the paths are ${H.c('g', '1→2→4, 1→2→5, 1→3→6')}.</p>`,
        code: { lang: 'java', code: `
class Paths {
    static void paths(TreeNode n, List<Integer> path, List<List<Integer>> out) {
        if (n == null) return;
        path.add(n.val);                                   // choose: step onto this node
        if (n.left == null && n.right == null) {
            out.add(new ArrayList<>(path));                // a leaf ends a path -> save a COPY
        } else {
            paths(n.left, path, out);                      // explore
            paths(n.right, path, out);
        }
        path.remove(path.size() - 1);                      // un-choose: step back up
    }
}`, alt: [{ lang: 'python', code: `def paths(n, path, out):
    if n is None:
        return
    path.append(n.val)                               # choose: step onto this node
    if n.left is None and n.right is None:
        out.append(path.copy())                      # a leaf ends a path -> save a COPY
    else:
        paths(n.left, path, out)                     # explore
        paths(n.right, path, out)
    path.pop()                                       # un-choose: step back up
` }, { lang: 'js', code: `function paths(n, path, out) {
  if (!n) return;
  path.push(n.val);                                  // choose: step onto this node
  if (!n.left && !n.right) {
    out.push([...path]);                             // a leaf ends a path -> save a COPY
  } else {
    paths(n.left, path, out);                        // explore
    paths(n.right, path, out);
  }
  path.pop();                                        // un-choose: step back up
}
` }, { lang: 'cpp', code: `// TreeNode as defined in the first lesson
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int v = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(v), left(l), right(r) {}
};

void paths(TreeNode* n, vector<int>& path, vector<vector<int>>& out) {
    if (!n) return;
    path.push_back(n->val);                          // choose: step onto this node
    if (!n->left && !n->right) {
        out.push_back(path);                         // a leaf ends a path -> push_back copies it
    } else {
        paths(n->left, path, out);                   // explore
        paths(n->right, path, out);
    }
    path.pop_back();                                 // un-choose: step back up
}
` }] }
      }
    ],
    deepDive: `<p><b>Why O(N):</b> every node is entered exactly once, plus one quick call for each of the N + 1 null links, so 2N + 1 calls of O(1) work each.</p>
<p><b>Why O(h) space and when it bites:</b> the call stack holds one frame per node on the current root-to-node path. Default limits are small in every language: Java's thread stack (often 512 KB–1 MB) fits roughly 10,000–20,000 simple frames (then <code>StackOverflowError</code>), Node.js about 10,000 (<code>RangeError</code>), Python stops at 1,000 frames by default (<code>RecursionError</code>), and C++ gets about 8 MB before it simply crashes. So a skewed tree of 10<sup>5</sup> nodes is a problem everywhere. Fixes: (1) go iterative (next topic), (2) give recursion more room: a Java thread with a bigger stack (<code>new Thread(null, task, "big", 1 &lt;&lt; 26).start()</code>), or Python's <code>sys.setrecursionlimit</code> together with <code>threading.stack_size</code>, (3) choose an algorithm that is naturally iterative (BFS). Java, Python and Node do <b>not</b> eliminate tail calls, so "make it tail recursive" does not help.</p>
<p><b>Which order to choose — a decision rule:</b> if the node needs information <b>from its parent</b> (depth, path so far, allowed range) → pass it down = preorder style. If the node needs information <b>from its children</b> (height, size, sum, "is balanced") → return it up = postorder style. Many hard problems use <b>both</b>: parameters going down and return values coming up.</p>
<p><b>Uniqueness:</b> one traversal alone does not identify a tree (preorder 1 2 could be "2 is left child" or "2 is right child"). Inorder + preorder (or + postorder) does, with distinct values — see the construction topic. Including <code>null</code> markers in a preorder makes it unique on its own; that is how trees are serialized.</p>
<p><b>Morris traversal</b> gets inorder/preorder in O(1) extra space by temporarily pointing each predecessor's empty right link back to the current node ("threads"), then removing it. It is a great "can you do it without extra space?" follow-up, but it mutates the tree while running, so it is not safe for concurrent readers.</p>`,
    aiEra: `<p><b>What AI changes:</b> all three traversals are one-liners an assistant will autocomplete before you finish typing the method name. The interview value moved from "can you write it" to "do you know <b>which</b> one the problem needs and why".</p>
<p><b>Use AI as a partner:</b> <code>Here is my tree problem. Without solving it, tell me whether the node needs info from its parent, from its children, or both.</code> — then check if you agree. Or ask it to produce a call-stack trace for a 6-node tree and compare with your hand trace.</p>
<p><b>Where AI goes wrong:</b> it happily writes recursion for inputs of 10<sup>5</sup> nodes without mentioning stack depth, forgets to copy the list when saving a path (<code>out.add(path)</code> instead of <code>new ArrayList&lt;&gt;(path)</code>; <code>path.copy()</code> in Python, <code>[...path]</code> in JavaScript), and forgets the "undo" step in backtracking, so every path ends up identical.</p>
<p><b>What you must still own:</b> tracing a recursion by hand on a whiteboard, explaining O(h) stack space, and picking pre/in/post order from the wording in under a minute.</p>`
  });
  /* ===================== TOPIC 3: Iterative traversals ===================== */
  topics.push({
    title: 'Iterative Traversals with an Explicit Stack',
    analogy: `<p>You are exploring a big <b>office building</b> floor by floor, always taking the <b>left</b> corridor first. To find your way back you drop a <b>sticky note at every door</b> you pass, stacking them in your pocket. When you hit a dead end, you pull the <b>top</b> sticky note (the most recent door) and continue from there. That pocket pile is a <b>stack</b>, and it is exactly what recursion was secretly doing for you.</p>`,
    explain: `<p>Recursion uses the computer's <b>call stack</b>. If the tree is skewed with 10<sup>5</sup> nodes, that stack may overflow (<code>StackOverflowError</code> in Java, <code>RecursionError</code> in Python, <code>RangeError</code> in JavaScript, a crash in C++). The fix: keep your <b>own</b> stack (<code>ArrayDeque</code> in Java, a list in Python, an array in JavaScript, <code>std::stack</code> in C++) and do the same work in a loop.</p>
<p><b>Iterative inorder</b> (the most asked one) in plain words:</p>
<ol>
<li><b>Slide left:</b> while <code>cur</code> is not null, push it and move to <code>cur.left</code>. (Everything pushed is "waiting for its left side to finish".)</li>
<li><b>Pop:</b> the top node has no unfinished left side any more → write it down.</li>
<li><b>Turn right:</b> set <code>cur = popped.right</code> and repeat from step 1.</li>
<li>Stop when <code>cur == null</code> <b>and</b> the stack is empty.</li>
</ol>
${H.table(['Step', 'Action', 'stack (bottom → top)', 'output'], [
  ['1', 'push 1, push 2, push 4', '[1, 2, 4]', ''],
  ['2', 'pop 4, write, go to 4.right (null)', '[1, 2]', H.c('g', '4')],
  ['3', 'pop 2, write, go to 2.right = 5', '[1]', H.c('g', '4 2')],
  ['4', 'push 5; pop 5, write', '[1]', H.c('g', '4 2 5')],
  ['5', 'pop 1, write, go right to 3 …', '[ ]', H.c('g', '4 2 5 1 …')]
])}
<p><b>Iterative preorder</b> is even easier: push root; loop { pop, write, push <b>right</b> then <b>left</b> } (left is pushed last so it comes out first).</p>
<p><b>Iterative postorder</b> (two stacks): do a "Me, Right, Left" walk using stack 1 and drop every popped node onto stack 2. Stack 2 popped from top gives "Left, Right, Me" = postorder, because reversing "Me, Right, Left" gives exactly that.</p>`,
    clues: [
      '"Do it <b>without recursion</b>" / "<b>iteratively</b>" → explicit <code>Deque</code> used as a stack.',
      'Tree depth may reach <code>10<sup>5</sup></code> (skewed / "linked-list-like" tree) → recursion risks a stack overflow; go iterative.',
      '"<b>BST iterator</b>" / "next smallest" / "pause and resume the traversal" → iterative inorder (the stack remembers where you stopped).',
      '"Stop early when you find the k-th / first bad node" → iterative loop makes early exit easy.',
      'Need postorder iteratively → two stacks, or reverse of a (Me, Right, Left) preorder.'
    ],
    code: [{ lang: 'java', code: `
class IterativeTraversals {
    // PREORDER (Me, Left, Right)
    static List<Integer> preorder(TreeNode root) {
        List<Integer> out = new ArrayList<>();
        if (root == null) return out;
        Deque<TreeNode> st = new ArrayDeque<>();
        st.push(root);
        while (!st.isEmpty()) {
            TreeNode n = st.pop();
            out.add(n.val);                         // Me
            if (n.right != null) st.push(n.right);  // pushed first -> comes out later
            if (n.left != null) st.push(n.left);    // pushed last  -> comes out next
        }
        return out;
    }

    // INORDER (Left, Me, Right)
    static List<Integer> inorder(TreeNode root) {
        List<Integer> out = new ArrayList<>();
        Deque<TreeNode> st = new ArrayDeque<>();
        TreeNode cur = root;
        while (cur != null || !st.isEmpty()) {
            while (cur != null) {       // slide all the way left
                st.push(cur);
                cur = cur.left;
            }
            cur = st.pop();             // leftmost unfinished node
            out.add(cur.val);           // Me
            cur = cur.right;            // now handle its right subtree
        }
        return out;
    }

    // POSTORDER (Left, Right, Me) with two stacks
    static List<Integer> postorder(TreeNode root) {
        List<Integer> out = new ArrayList<>();
        if (root == null) return out;
        Deque<TreeNode> s1 = new ArrayDeque<>(), s2 = new ArrayDeque<>();
        s1.push(root);
        while (!s1.isEmpty()) {
            TreeNode n = s1.pop();
            s2.push(n);                              // collect in Me, Right, Left order
            if (n.left != null) s1.push(n.left);
            if (n.right != null) s1.push(n.right);
        }
        while (!s2.isEmpty()) out.add(s2.pop().val); // reversed -> Left, Right, Me
        return out;
    }
}`, alt: [{ lang: 'python', code: `# PREORDER (Me, Left, Right)
def preorder(root):
    out, stack = [], [root] if root else []
    while stack:
        n = stack.pop()
        out.append(n.val)                    # Me
        if n.right:
            stack.append(n.right)            # pushed first -> comes out later
        if n.left:
            stack.append(n.left)             # pushed last  -> comes out next
    return out

# INORDER (Left, Me, Right)
def inorder(root):
    out, stack, cur = [], [], root
    while cur or stack:
        while cur:                           # slide all the way left
            stack.append(cur)
            cur = cur.left
        cur = stack.pop()                    # leftmost unfinished node
        out.append(cur.val)                  # Me
        cur = cur.right                      # now handle its right subtree
    return out

# POSTORDER (Left, Right, Me): collect Me, Right, Left, then reverse
def postorder(root):
    out, stack = [], [root] if root else []
    while stack:
        n = stack.pop()
        out.append(n.val)
        if n.left:
            stack.append(n.left)
        if n.right:
            stack.append(n.right)
    return out[::-1]                         # the reversed list plays the second stack
` }, { lang: 'js', code: `// PREORDER (Me, Left, Right)
function preorder(root) {
  const out = [], stack = root ? [root] : [];
  while (stack.length) {
    const n = stack.pop();
    out.push(n.val);                         // Me
    if (n.right) stack.push(n.right);        // pushed first -> comes out later
    if (n.left) stack.push(n.left);          // pushed last  -> comes out next
  }
  return out;
}

// INORDER (Left, Me, Right)
function inorder(root) {
  const out = [], stack = [];
  let cur = root;
  while (cur || stack.length) {
    while (cur) { stack.push(cur); cur = cur.left; }   // slide all the way left
    cur = stack.pop();                       // leftmost unfinished node
    out.push(cur.val);                       // Me
    cur = cur.right;                         // now handle its right subtree
  }
  return out;
}

// POSTORDER (Left, Right, Me): collect Me, Right, Left, then reverse
function postorder(root) {
  const out = [], stack = root ? [root] : [];
  while (stack.length) {
    const n = stack.pop();
    out.push(n.val);
    if (n.left) stack.push(n.left);
    if (n.right) stack.push(n.right);
  }
  return out.reverse();                      // the reversed array plays the second stack
}
` }, { lang: 'cpp', code: `// TreeNode as defined in the first lesson
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int v = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(v), left(l), right(r) {}
};

// PREORDER (Me, Left, Right)
vector<int> preorder(TreeNode* root) {
    vector<int> out;
    if (!root) return out;
    stack<TreeNode*> st;
    st.push(root);
    while (!st.empty()) {
        TreeNode* n = st.top(); st.pop();
        out.push_back(n->val);                   // Me
        if (n->right) st.push(n->right);         // pushed first -> comes out later
        if (n->left) st.push(n->left);           // pushed last  -> comes out next
    }
    return out;
}

// INORDER (Left, Me, Right)
vector<int> inorder(TreeNode* root) {
    vector<int> out;
    stack<TreeNode*> st;
    TreeNode* cur = root;
    while (cur || !st.empty()) {
        while (cur) { st.push(cur); cur = cur->left; }   // slide all the way left
        cur = st.top(); st.pop();                // leftmost unfinished node
        out.push_back(cur->val);                 // Me
        cur = cur->right;                        // now handle its right subtree
    }
    return out;
}

// POSTORDER (Left, Right, Me) with two stacks
vector<int> postorder(TreeNode* root) {
    vector<int> out;
    if (!root) return out;
    stack<TreeNode*> s1, s2;
    s1.push(root);
    while (!s1.empty()) {
        TreeNode* n = s1.top(); s1.pop();
        s2.push(n);                              // collect in Me, Right, Left order
        if (n->left) s1.push(n->left);
        if (n->right) s1.push(n->right);
    }
    while (!s2.empty()) { out.push_back(s2.top()->val); s2.pop(); }   // reversed -> Left, Right, Me
    return out;
}
` }] }],
    codeTitle: ['Iterative preorder, inorder, postorder'],
    viz: [{
      title: 'Iterative inorder: slide left, pop, turn right',
      input: '1 2 3 4 5 null 6',
      inputLabel: 'Tree slots (level order, null = empty)',
      gen: function (input) {
        var a = parseTreeStr(input), F = [], st = [], out = [], done = {}, cur = 0;
        function snap(narr, focus, cls) {
          var hl = {};
          for (var k in done) hl[k] = 'ok';
          st.forEach(function (i) { hl[i] = 'win'; });
          if (focus !== undefined && focus >= 0) hl[focus] = cls || 'cur';
          F.push({ narr: narr, parts: [
            { type: 'tree', label: 'Tree (blue = on stack, green = written)', arr: a.slice(), hl: hl },
            { type: 'stack', label: 'Explicit stack (top at the top)', items: st.map(function (i) { return a[i]; }), hl: st.length ? o1(st.length - 1, 'cur') : {} },
            { type: 'array', label: 'output', values: out.slice(), hl: out.length ? o1(out.length - 1, 'ok') : {} },
            { type: 'vars', vals: { cur: cur >= 0 && ex(a, cur) ? a[cur] : 'null', stackSize: st.length } }] });
        }
        snap('Start with <code>cur</code> = root (' + a[0] + ') and an empty stack. Rule: slide left pushing everything, pop when you fall off, then turn right.', 0);
        var guard = 0;
        while ((cur >= 0 && ex(a, cur)) || st.length) {
          if (++guard > 100) break;
          while (cur >= 0 && ex(a, cur)) {
            st.push(cur);
            var nx = 2 * cur + 1;
            var pushed = cur;
            cur = ex(a, nx) ? nx : -1;
            snap('Push ' + a[pushed] + ' (it must wait until its left side is finished) and move <code>cur</code> to its left child' + (cur >= 0 ? ' ' + a[cur] + '.' : ', which is <b>null</b> — we fell off the left edge.'), pushed);
          }
          var p = st.pop();
          out.push(a[p]); done[p] = 1;
          var r = 2 * p + 2;
          cur = ex(a, r) ? r : -1;
          snap('Pop ' + a[p] + ': nothing is left of it any more, so <b>write ' + a[p] + '</b>. Then turn to its right child' + (cur >= 0 ? ' ' + a[cur] + ' and slide left from there.' : ' — null, so next loop we simply pop again.'), p, 'sel');
        }
        F.push({ narr: '<code>cur</code> is null <b>and</b> the stack is empty → finished. Inorder = <b>' + out.join(' ') + '</b>. Every node was pushed once and popped once → O(N) time, stack at most height h.', parts: [
          { type: 'tree', label: 'All nodes written', arr: a.slice(), hl: (function () { var h = {}; nodesOf(a).forEach(function (i) { h[i] = 'ok'; }); return h; })() },
          { type: 'stack', label: 'Explicit stack', items: [] },
          { type: 'array', label: 'output', values: out.slice() }] });
        return F;
      }
    }, {
      title: 'Iterative preorder (1 stack) and postorder (2 stacks)',
      input: '1 2 3 4 5 null 6 | post',
      inputLabel: 'tree slots | pre or post',
      gen: function (input) {
        var sp = splitBar(input, 'post'), a = parseTreeStr(sp[0]), mode = (sp[1] || 'post').toLowerCase();
        if (mode !== 'pre' && mode !== 'post') throw new Error('After the | write pre or post.');
        var F = [], s1 = [0], s2 = [], out = [], seen = {};
        function parts(focus) {
          var hl = {};
          for (var k in seen) hl[k] = 'ok';
          s1.forEach(function (i) { hl[i] = 'win'; });
          if (focus !== undefined) hl[focus] = 'cur';
          var p = [{ type: 'tree', label: mode === 'pre' ? 'Preorder (Me, Left, Right)' : 'Postorder via two stacks', arr: a.slice(), hl: hl },
            { type: 'stack', label: mode === 'pre' ? 'stack' : 'stack 1 (work pile)', items: s1.map(function (i) { return a[i]; }), hl: s1.length ? o1(s1.length - 1, 'cur') : {} }];
          if (mode === 'post') p.push({ type: 'stack', label: 'stack 2 (collects Me, Right, Left)', items: s2.map(function (i) { return a[i]; }) });
          p.push({ type: 'array', label: 'output', values: out.slice() });
          return p;
        }
        F.push({ narr: mode === 'pre' ? 'Push the root. Loop: pop, write, then push <b>right first, left second</b> so the left child pops out next.' : 'Push the root on stack 1. Loop: pop from stack 1, drop it on stack 2, push <b>left then right</b> on stack 1. Stack 2 ends up holding the exact reverse of postorder.', parts: parts(0) });
        while (s1.length) {
          var n = s1.pop(), L = 2 * n + 1, R = 2 * n + 2, pushed = [];
          seen[n] = 1;
          if (mode === 'pre') {
            out.push(a[n]);
            if (ex(a, R)) { s1.push(R); pushed.push(a[R]); }
            if (ex(a, L)) { s1.push(L); pushed.push(a[L]); }
            F.push({ narr: 'Pop ' + a[n] + ' and <b>write it</b> (Me comes first in preorder). ' + (pushed.length ? 'Push ' + pushed.join(' then ') + ' — the left child is on top, so it is processed next.' : 'It is a leaf, nothing to push.'), parts: parts(n) });
          } else {
            s2.push(n);
            if (ex(a, L)) { s1.push(L); pushed.push(a[L]); }
            if (ex(a, R)) { s1.push(R); pushed.push(a[R]); }
            F.push({ narr: 'Pop ' + a[n] + ' from stack 1 and drop it on stack 2. ' + (pushed.length ? 'Push ' + pushed.join(' then ') + ' on stack 1 (right on top → we go Me, Right, Left).' : 'Leaf, nothing to push.'), parts: parts(n) });
          }
        }
        if (mode === 'post') {
          while (s2.length) {
            var t = s2.pop();
            out.push(a[t]);
            F.push({ narr: 'Stack 1 is empty. Now pop stack 2 from the top: <b>' + a[t] + '</b>. Reversing "Me, Right, Left" gives "Left, Right, Me" = postorder.', parts: parts(t) });
          }
        }
        F.push({ narr: (mode === 'pre' ? 'Preorder' : 'Postorder') + ' = <b>' + out.join(' ') + '</b>. Each node is pushed and popped a constant number of times → O(N).', parts: [
          { type: 'tree', label: 'Done', arr: a.slice() },
          { type: 'array', label: 'output', values: out.slice() }] });
        return F;
      }
    }],
    problems: [{
      title: 'Binary Tree Inorder Traversal (Iterative)',
      level: 'Easy',
      tags: ['stack', 'inorder', 'iterative'],
      statement: `<p>Given the <code>root</code> of a binary tree, return the <b>inorder</b> traversal of its values (Left, Me, Right). <b>Do not use recursion</b> — use your own stack.</p>`,
      constraints: `0 ≤ number of nodes ≤ 10<sup>5</sup> (the tree may be completely skewed), −100 ≤ Node.val ≤ 100`,
      example: `<pre>
         1
       /   \\
      2     3
     / \\
    4   5
</pre><p>Input: <code>root = [1,2,3,4,5]</code> → Output: ${H.c('g', '[4, 2, 5, 1, 3]')}</p>
<p><b>Why:</b> before writing 1 we must finish its whole left side (4, 2, 5). Inside that side, before writing 2 we finish its left (4). So 4 first, then 2, then 2's right (5), then ${H.c('y', '1')}, then 3.</p>`,
      brute: {
        why: `<p>The "obvious" answer is plain recursion. It is O(N), but with a <b>skewed</b> tree of 10<sup>5</sup> nodes the recursion goes 10<sup>5</sup> calls deep and a default call stack can overflow (Python already stops at 1,000). A truly brute force alternative without recursion — repeatedly scanning for "the leftmost node not yet printed" from the root — costs O(N·h), i.e. O(N<sup>2</sup>) on a skewed tree, because we walk the same path again and again.</p>`,
        code: `
          List<Integer> inorderRecursive(TreeNode root) {
              List<Integer> out = new ArrayList<>();
              walk(root, out);
              return out;
          }
          void walk(TreeNode n, List<Integer> out) {
              if (n == null) return;
              walk(n.left, out);   // can go 100000 calls deep on a skewed tree
              out.add(n.val);
              walk(n.right, out);
          }`
      },
      mcq: {
        q: 'You popped node X from the stack. Why is it safe to write X right now?',
        options: ['Because X is a leaf', 'Because everything in X\'s left subtree has already been written', 'Because X is the root', 'Because the stack is now empty'],
        answer: 1,
        explain: 'X was pushed while sliding left, and it is only popped after its left side was fully processed. That is exactly the "Left before Me" rule of inorder. X need not be a leaf (it may still have a right child).'
      },
      hints: [
        `<p><b>Aha:</b> the first node inorder writes is the <b>leftmost</b> node. Every node you pass on the way down to it is "waiting" for its left side. Those waiting nodes are finished in reverse order of arrival → last-in, first-out → a <b>stack</b>.</p>`,
        `<p>Use a stack (<code>ArrayDeque</code> in Java, a list in Python, an array in JavaScript, <code>std::stack</code> in C++) and a pointer <code>cur</code>. Inner loop: push <code>cur</code>, go <code>cur = cur.left</code>. When it becomes null: <code>cur = st.pop()</code>, record it, then <code>cur = cur.right</code>.</p>`,
        `<p><b>Traps:</b> the outer loop condition must be <code>cur != null || !st.isEmpty()</code> (both!) — after popping the root, the stack is empty but its right subtree is still to do. Empty tree → return empty list. <b>Recipe:</b> cur = root; while (cur or stack): slide left pushing; pop → add val; cur = popped.right.</p>`
      ],
      tests: { sig: 'TreeNode int -> list<int>', fn: 'judge', harness: {
        java: "class Check {\n    // n > 0: right-leaning chain of n nodes, n < 0: left-leaning; node i (0 = root) holds val(i).\n    // Built here because a tree this deep is too big to write out as a test literal.\n    static TreeNode chain(int n, java.util.function.IntUnaryOperator val) {\n        TreeNode root = null;\n        for (int i = Math.abs(n) - 1; i >= 0; i--) {\n            TreeNode t = new TreeNode(val.applyAsInt(i));\n            if (n > 0) t.right = root; else t.left = root;\n            root = t;\n        }\n        return root;\n    }\n\n    static List<Integer> judge(TreeNode root, int n) {\n        if (n != 0) root = chain(n, i -> (i % 201) - 100);\n        return new Solution().inorderTraversal(root);\n    }\n}",
        python: "# n > 0: right-leaning chain of n nodes, n < 0: left-leaning; node i (0 = root) holds val(i).\ndef _chain(n, val):\n    root = None\n    for i in range(abs(n) - 1, -1, -1):\n        t = TreeNode(val(i))\n        if n > 0:\n            t.right = root\n        else:\n            t.left = root\n        root = t\n    return root\n\ndef judge(root, n):\n    if n:\n        root = _chain(n, lambda i: (i % 201) - 100)\n    return Solution().inorder_traversal(root)",
        js: "// n > 0: right-leaning chain of n nodes, n < 0: left-leaning; node i (0 = root) holds val(i).\nfunction chain__(n, val) {\n  let root = null;\n  for (let i = Math.abs(n) - 1; i >= 0; i--) {\n    const t = new TreeNode(val(i));\n    if (n > 0) t.right = root; else t.left = root;\n    root = t;\n  }\n  return root;\n}\n\nfunction judge(root, n) {\n  if (n) root = chain__(n, (i) => (i % 201) - 100);\n  return inorderTraversal(root);\n}",
        cpp: "// n > 0: right-leaning chain of n nodes, n < 0: left-leaning; node i (0 = root) holds val(i).\nTreeNode* chain__(int n, function<int(int)> val) {\n    TreeNode* root = nullptr;\n    for (int i = abs(n) - 1; i >= 0; i--) {\n        TreeNode* t = new TreeNode(val(i));\n        if (n > 0) t->right = root; else t->left = root;\n        root = t;\n    }\n    return root;\n}\n\nvector<int> judge(TreeNode* root, int n) {\n    if (n) root = chain__(n, [](int i) { return (i % 201) - 100; });\n    return Solution().inorderTraversal(root);\n}"
      }, cases: [
        [[[1,2,3,4,5],0],[4,2,5,1,3]],
        [[[],0],[]],
        [[[1],0],[1]],
        [[[1,null,2,3],0],[1,3,2]],
        [[[3,9,20,null,null,15,7],0],[9,3,15,20,7]],
        [[[-5,-5,0,null,7,7,-100],0],[-5,7,-5,7,0,-100]],
        [[[1,2,3,4,null,null,5,6,null,null,7],0],[6,4,2,1,3,5,7]],
        [[[71,90,-48,-41,null,-77,null,null,null,20,null,-79],0],[-41,90,71,-79,20,-77,-48]],
        [[[-100,-34,-70,-5,null,72,null,null,null,-98,43,null,58,null,-92,null,-23],0],[-5,-34,-100,-98,58,-23,72,43,-92,-70]],
        [[[-38,-79,-77,77,39,-62,null,null,null,5,null,null,56],0],[77,-79,5,39,-38,-62,56,-77]],
        [[[-100,-99,null,-98,null,-97,null,-96,null,-95,null,-94,null,-93,null,-92,null,-91,null,-90,null,-89,null,-88,null,-87,null,-86,null,-85,null,-84,null,-83,null,-82,null,-81,null,-80,null,-79,null,-78,null,-77,null,-76,null,-75,null,-74,null,-73,null,-72,null,-71,null,-70,null,-69,null,-68,null,-67,null,-66,null,-65,null,-64,null,-63,null,-62,null,-61,null,-60,null,-59,null,-58,null,-57,null,-56,null,-55,null,-54,null,-53,null,-52,null,-51,null,-50,null,-49,null,-48,null,-47,null,-46,null,-45,null,-44,null,-43,null,-42,null,-41,null,-40,null,-39,null,-38,null,-37,null,-36,null,-35,null,-34,null,-33,null,-32,null,-31,null,-30,null,-29,null,-28,null,-27,null,-26,null,-25,null,-24,null,-23,null,-22,null,-21,null,-20,null,-19,null,-18,null,-17,null,-16,null,-15,null,-14,null,-13,null,-12,null,-11,null,-10,null,-9,null,-8,null,-7,null,-6,null,-5,null,-4,null,-3,null,-2,null,-1,null,0,null,1,null,2,null,3,null,4,null,5,null,6,null,7,null,8,null,9,null,10,null,11,null,12,null,13,null,14,null,15,null,16,null,17,null,18,null,19,null,20,null,21,null,22,null,23,null,24,null,25,null,26,null,27,null,28,null,29,null,30,null,31,null,32,null,33,null,34,null,35,null,36,null,37,null,38,null,39,null,40,null,41,null,42,null,43,null,44,null,45,null,46,null,47,null,48,null,49,null,50,null,51,null,52,null,53,null,54,null,55,null,56,null,57,null,58,null,59,null,60,null,61,null,62,null,63,null,64,null,65,null,66,null,67,null,68,null,69,null,70,null,71,null,72,null,73,null,74,null,75,null,76,null,77,null,78,null,79,null,80,null,81,null,82,null,83,null,84,null,85,null,86,null,87,null,88,null,89,null,90,null,91,null,92,null,93,null,94,null,95,null,96,null,97,null,98,null,99,null,100,null,-100,null,-99,null,-98,null,-97,null,-96,null,-95,null,-94,null,-93,null,-92,null,-91,null,-90,null,-89,null,-88,null,-87,null,-86,null,-85,null,-84,null,-83,null,-82,null,-81,null,-80,null,-79,null,-78,null,-77,null,-76,null,-75,null,-74,null,-73,null,-72,null,-71,null,-70,null,-69,null,-68,null,-67,null,-66,null,-65,null,-64,null,-63,null,-62,null,-61,null,-60,null,-59,null,-58,null,-57,null,-56,null,-55,null,-54,null,-53,null,-52,null,-51,null,-50,null,-49,null,-48,null,-47,null,-46,null,-45,null,-44,null,-43,null,-42,null,-41,null,-40,null,-39,null,-38,null,-37,null,-36,null,-35,null,-34,null,-33,null,-32,null,-31,null,-30,null,-29,null,-28,null,-27,null,-26,null,-25,null,-24,null,-23,null,-22,null,-21,null,-20,null,-19,null,-18,null,-17,null,-16,null,-15,null,-14,null,-13,null,-12,null,-11,null,-10,null,-9,null,-8,null,-7,null,-6,null,-5,null,-4,null,-3,null,-2,null,-1,null,0,null,1,null,2,null,3,null,4,null,5,null,6,null,7,null,8,null,9,null,10,null,11,null,12,null,13,null,14,null,15,null,16,null,17,null,18,null,19,null,20,null,21,null,22,null,23,null,24,null,25,null,26,null,27,null,28,null,29,null,30,null,31,null,32,null,33,null,34,null,35,null,36,null,37,null,38,null,39,null,40,null,41,null,42,null,43,null,44,null,45,null,46,null,47,null,48,null,49,null,50,null,51,null,52,null,53,null,54,null,55,null,56,null,57,null,58,null,59,null,60,null,61,null,62,null,63,null,64,null,65,null,66,null,67,null,68,null,69,null,70,null,71,null,72,null,73,null,74,null,75,null,76,null,77,null,78,null,79,null,80,null,81,null,82,null,83,null,84,null,85,null,86,null,87,null,88,null,89,null,90,null,91,null,92,null,93,null,94,null,95,null,96,null,97,null,98,null,99,null,100,null,-100,null,-99,null,-98,null,-97,null,-96,null,-95,null,-94,null,-93,null,-92,null,-91,null,-90,null,-89,null,-88,null,-87,null,-86,null,-85,null,-84,null,-83,null,-82,null,-81,null,-80,null,-79,null,-78,null,-77,null,-76,null,-75,null,-74,null,-73,null,-72,null,-71,null,-70,null,-69,null,-68,null,-67,null,-66,null,-65,null,-64,null,-63,null,-62,null,-61,null,-60,null,-59,null,-58,null,-57,null,-56,null,-55,null,-54,null,-53,null,-52,null,-51,null,-50,null,-49,null,-48,null,-47,null,-46,null,-45,null,-44,null,-43,null,-42,null,-41,null,-40,null,-39,null,-38,null,-37,null,-36,null,-35,null,-34,null,-33,null,-32,null,-31,null,-30,null,-29,null,-28,null,-27,null,-26,null,-25,null,-24,null,-23,null,-22,null,-21,null,-20,null,-19,null,-18,null,-17,null,-16,null,-15,null,-14,null,-13,null,-12,null,-11,null,-10,null,-9,null,-8,null,-7,null,-6,null,-5,null,-4,null,-3,null,-2,null,-1,null,0,null,1,null,2,null,3,null,4,null,5,null,6,null,7,null,8,null,9,null,10,null,11,null,12,null,13,null,14,null,15,null,16,null,17,null,18,null,19,null,20,null,21,null,22,null,23,null,24,null,25,null,26,null,27,null,28,null,29,null,30,null,31,null,32,null,33,null,34,null,35,null,36,null,37,null,38,null,39,null,40,null,41,null,42,null,43,null,44,null,45,null,46,null,47,null,48,null,49,null,50,null,51,null,52,null,53,null,54,null,55,null,56,null,57,null,58,null,59,null,60,null,61,null,62,null,63,null,64,null,65,null,66,null,67,null,68,null,69,null,70,null,71,null,72,null,73,null,74,null,75,null,76,null,77,null,78,null,79,null,80,null,81,null,82,null,83,null,84,null,85,null,86,null,87,null,88,null,89,null,90,null,91,null,92,null,93,null,94,null,95,null,96,null,97,null,98,null,99,null,100,null,-100,null,-99,null,-98,null,-97,null,-96,null,-95,null,-94,null,-93,null,-92,null,-91,null,-90,null,-89,null,-88,null,-87,null,-86,null,-85,null,-84,null,-83,null,-82,null,-81,null,-80,null,-79,null,-78,null,-77,null,-76,null,-75,null,-74,null,-73,null,-72,null,-71,null,-70,null,-69,null,-68,null,-67,null,-66,null,-65,null,-64,null,-63,null,-62,null,-61,null,-60,null,-59,null,-58,null,-57,null,-56,null,-55,null,-54,null,-53,null,-52,null,-51,null,-50,null,-49,null,-48,null,-47,null,-46,null,-45,null,-44,null,-43,null,-42,null,-41,null,-40,null,-39,null,-38,null,-37,null,-36,null,-35,null,-34,null,-33,null,-32,null,-31,null,-30,null,-29,null,-28,null,-27,null,-26,null,-25,null,-24,null,-23,null,-22,null,-21,null,-20,null,-19,null,-18,null,-17,null,-16,null,-15,null,-14,null,-13,null,-12,null,-11,null,-10,null,-9,null,-8,null,-7,null,-6,null,-5,null,-4,null,-3,null,-2,null,-1,null,0,null,1,null,2,null,3,null,4,null,5,null,6,null,7,null,8,null,9,null,10,null,11,null,12,null,13,null,14,null,15,null,16,null,17,null,18,null,19,null,20,null,21,null,22,null,23,null,24,null,25,null,26,null,27,null,28,null,29,null,30,null,31,null,32,null,33,null,34,null,35,null,36,null,37,null,38,null,39,null,40,null,41,null,42,null,43,null,44,null,45,null,46,null,47,null,48,null,49,null,50,null,51,null,52,null,53,null,54,null,55,null,56,null,57,null,58,null,59,null,60,null,61,null,62,null,63,null,64,null,65,null,66,null,67,null,68,null,69,null,70,null,71,null,72,null,73,null,74,null,75,null,76,null,77,null,78,null,79,null,80,null,81,null,82,null,83,null,84,null,85,null,86,null,87,null,88,null,89,null,90,null,91,null,92,null,93,null,94,null,95,null,96,null,97,null,98,null,99,null,100,null,-100,null,-99,null,-98,null,-97,null,-96,null,-95,null,-94,null,-93,null,-92,null,-91,null,-90,null,-89,null,-88,null,-87,null,-86,null,-85,null,-84,null,-83,null,-82,null,-81,null,-80,null,-79,null,-78,null,-77,null,-76,null,-75,null,-74,null,-73,null,-72,null,-71,null,-70,null,-69,null,-68,null,-67,null,-66,null,-65,null,-64,null,-63,null,-62,null,-61,null,-60,null,-59,null,-58,null,-57,null,-56,null,-55,null,-54,null,-53,null,-52,null,-51,null,-50,null,-49,null,-48,null,-47,null,-46,null,-45,null,-44,null,-43,null,-42,null,-41,null,-40,null,-39,null,-38,null,-37,null,-36,null,-35,null,-34,null,-33,null,-32,null,-31,null,-30,null,-29,null,-28,null,-27,null,-26,null,-25,null,-24,null,-23,null,-22,null,-21,null,-20,null,-19,null,-18,null,-17,null,-16,null,-15,null,-14,null,-13,null,-12,null,-11,null,-10,null,-9,null,-8,null,-7,null,-6,null,-5,null,-4,null,-3,null,-2,null,-1,null,0,null,1,null,2,null,3,null,4,null,5,null,6,null,7,null,8,null,9,null,10,null,11,null,12,null,13,null,14,null,15,null,16,null,17,null,18,null,19,null,20,null,21,null,22,null,23,null,24,null,25,null,26,null,27,null,28,null,29,null,30,null,31,null,32,null,33,null,34,null,35,null,36,null,37,null,38,null,39,null,40,null,41,null,42,null,43,null,44,null,45,null,46,null,47,null,48,null,49,null,50,null,51,null,52,null,53,null,54,null,55,null,56,null,57,null,58,null,59,null,60,null,61,null,62,null,63,null,64,null,65,null,66,null,67,null,68,null,69,null,70,null,71,null,72,null,73,null,74,null,75,null,76,null,77,null,78,null,79,null,80,null,81,null,82,null,83,null,84,null,85,null,86,null,87,null,88,null,89,null,90,null,91,null,92,null,93,null,94,null,95],0],[95,94,93,92,91,90,89,88,87,86,85,84,83,82,81,80,79,78,77,76,75,74,73,72,71,70,69,68,67,66,65,64,63,62,61,60,59,58,57,56,55,54,53,52,51,50,49,48,47,46,45,44,43,42,41,40,39,38,37,36,35,34,33,32,31,30,29,28,27,26,25,24,23,22,21,20,19,18,17,16,15,14,13,12,11,10,9,8,7,6,5,4,3,2,1,0,-1,-2,-3,-4,-5,-6,-7,-8,-9,-10,-11,-12,-13,-14,-15,-16,-17,-18,-19,-20,-21,-22,-23,-24,-25,-26,-27,-28,-29,-30,-31,-32,-33,-34,-35,-36,-37,-38,-39,-40,-41,-42,-43,-44,-45,-46,-47,-48,-49,-50,-51,-52,-53,-54,-55,-56,-57,-58,-59,-60,-61,-62,-63,-64,-65,-66,-67,-68,-69,-70,-71,-72,-73,-74,-75,-76,-77,-78,-79,-80,-81,-82,-83,-84,-85,-86,-87,-88,-89,-90,-91,-92,-93,-94,-95,-96,-97,-98,-99,-100,100,99,98,97,96,95,94,93,92,91,90,89,88,87,86,85,84,83,82,81,80,79,78,77,76,75,74,73,72,71,70,69,68,67,66,65,64,63,62,61,60,59,58,57,56,55,54,53,52,51,50,49,48,47,46,45,44,43,42,41,40,39,38,37,36,35,34,33,32,31,30,29,28,27,26,25,24,23,22,21,20,19,18,17,16,15,14,13,12,11,10,9,8,7,6,5,4,3,2,1,0,-1,-2,-3,-4,-5,-6,-7,-8,-9,-10,-11,-12,-13,-14,-15,-16,-17,-18,-19,-20,-21,-22,-23,-24,-25,-26,-27,-28,-29,-30,-31,-32,-33,-34,-35,-36,-37,-38,-39,-40,-41,-42,-43,-44,-45,-46,-47,-48,-49,-50,-51,-52,-53,-54,-55,-56,-57,-58,-59,-60,-61,-62,-63,-64,-65,-66,-67,-68,-69,-70,-71,-72,-73,-74,-75,-76,-77,-78,-79,-80,-81,-82,-83,-84,-85,-86,-87,-88,-89,-90,-91,-92,-93,-94,-95,-96,-97,-98,-99,-100,100,99,98,97,96,95,94,93,92,91,90,89,88,87,86,85,84,83,82,81,80,79,78,77,76,75,74,73,72,71,70,69,68,67,66,65,64,63,62,61,60,59,58,57,56,55,54,53,52,51,50,49,48,47,46,45,44,43,42,41,40,39,38,37,36,35,34,33,32,31,30,29,28,27,26,25,24,23,22,21,20,19,18,17,16,15,14,13,12,11,10,9,8,7,6,5,4,3,2,1,0,-1,-2,-3,-4,-5,-6,-7,-8,-9,-10,-11,-12,-13,-14,-15,-16,-17,-18,-19,-20,-21,-22,-23,-24,-25,-26,-27,-28,-29,-30,-31,-32,-33,-34,-35,-36,-37,-38,-39,-40,-41,-42,-43,-44,-45,-46,-47,-48,-49,-50,-51,-52,-53,-54,-55,-56,-57,-58,-59,-60,-61,-62,-63,-64,-65,-66,-67,-68,-69,-70,-71,-72,-73,-74,-75,-76,-77,-78,-79,-80,-81,-82,-83,-84,-85,-86,-87,-88,-89,-90,-91,-92,-93,-94,-95,-96,-97,-98,-99,-100,100,99,98,97,96,95,94,93,92,91,90,89,88,87,86,85,84,83,82,81,80,79,78,77,76,75,74,73,72,71,70,69,68,67,66,65,64,63,62,61,60,59,58,57,56,55,54,53,52,51,50,49,48,47,46,45,44,43,42,41,40,39,38,37,36,35,34,33,32,31,30,29,28,27,26,25,24,23,22,21,20,19,18,17,16,15,14,13,12,11,10,9,8,7,6,5,4,3,2,1,0,-1,-2,-3,-4,-5,-6,-7,-8,-9,-10,-11,-12,-13,-14,-15,-16,-17,-18,-19,-20,-21,-22,-23,-24,-25,-26,-27,-28,-29,-30,-31,-32,-33,-34,-35,-36,-37,-38,-39,-40,-41,-42,-43,-44,-45,-46,-47,-48,-49,-50,-51,-52,-53,-54,-55,-56,-57,-58,-59,-60,-61,-62,-63,-64,-65,-66,-67,-68,-69,-70,-71,-72,-73,-74,-75,-76,-77,-78,-79,-80,-81,-82,-83,-84,-85,-86,-87,-88,-89,-90,-91,-92,-93,-94,-95,-96,-97,-98,-99,-100,100,99,98,97,96,95,94,93,92,91,90,89,88,87,86,85,84,83,82,81,80,79,78,77,76,75,74,73,72,71,70,69,68,67,66,65,64,63,62,61,60,59,58,57,56,55,54,53,52,51,50,49,48,47,46,45,44,43,42,41,40,39,38,37,36,35,34,33,32,31,30,29,28,27,26,25,24,23,22,21,20,19,18,17,16,15,14,13,12,11,10,9,8,7,6,5,4,3,2,1,0,-1,-2,-3,-4,-5,-6,-7,-8,-9,-10,-11,-12,-13,-14,-15,-16,-17,-18,-19,-20,-21,-22,-23,-24,-25,-26,-27,-28,-29,-30,-31,-32,-33,-34,-35,-36,-37,-38,-39,-40,-41,-42,-43,-44,-45,-46,-47,-48,-49,-50,-51,-52,-53,-54,-55,-56,-57,-58,-59,-60,-61,-62,-63,-64,-65,-66,-67,-68,-69,-70,-71,-72,-73,-74,-75,-76,-77,-78,-79,-80,-81,-82,-83,-84,-85,-86,-87,-88,-89,-90,-91,-92,-93,-94,-95,-96,-97,-98,-99,-100]],
        [[[100,null,99,null,98,null,97,null,96,null,95,null,94,null,93,null,92,null,91,null,90,null,89,null,88,null,87,null,86,null,85,null,84,null,83,null,82,null,81,null,80,null,79,null,78,null,77,null,76,null,75,null,74,null,73,null,72,null,71,null,70,null,69,null,68,null,67,null,66,null,65,null,64,null,63,null,62,null,61,null,60,null,59,null,58,null,57,null,56,null,55,null,54,null,53,null,52,null,51,null,50,null,49,null,48,null,47,null,46,null,45,null,44,null,43,null,42,null,41,null,40,null,39,null,38,null,37,null,36,null,35,null,34,null,33,null,32,null,31,null,30,null,29,null,28,null,27,null,26,null,25,null,24,null,23,null,22,null,21,null,20,null,19,null,18,null,17,null,16,null,15,null,14,null,13,null,12,null,11,null,10,null,9,null,8,null,7,null,6,null,5,null,4,null,3,null,2,null,1,null,0,null,-1,null,-2,null,-3,null,-4,null,-5,null,-6,null,-7,null,-8,null,-9,null,-10,null,-11,null,-12,null,-13,null,-14,null,-15,null,-16,null,-17,null,-18,null,-19,null,-20,null,-21,null,-22,null,-23,null,-24,null,-25,null,-26,null,-27,null,-28,null,-29,null,-30,null,-31,null,-32,null,-33,null,-34,null,-35,null,-36,null,-37,null,-38,null,-39,null,-40,null,-41,null,-42,null,-43,null,-44,null,-45,null,-46,null,-47,null,-48,null,-49,null,-50,null,-51,null,-52,null,-53,null,-54,null,-55,null,-56,null,-57,null,-58,null,-59,null,-60,null,-61,null,-62,null,-63,null,-64,null,-65,null,-66,null,-67,null,-68,null,-69,null,-70,null,-71,null,-72,null,-73,null,-74,null,-75,null,-76,null,-77,null,-78,null,-79,null,-80,null,-81,null,-82,null,-83,null,-84,null,-85,null,-86,null,-87,null,-88,null,-89,null,-90,null,-91,null,-92,null,-93,null,-94,null,-95,null,-96,null,-97,null,-98,null,-99,null,-100,null,100,null,99,null,98,null,97,null,96,null,95,null,94,null,93,null,92,null,91,null,90,null,89,null,88,null,87,null,86,null,85,null,84,null,83,null,82,null,81,null,80,null,79,null,78,null,77,null,76,null,75,null,74,null,73,null,72,null,71,null,70,null,69,null,68,null,67,null,66,null,65,null,64,null,63,null,62,null,61,null,60,null,59,null,58,null,57,null,56,null,55,null,54,null,53,null,52,null,51,null,50,null,49,null,48,null,47,null,46,null,45,null,44,null,43,null,42,null,41,null,40,null,39,null,38,null,37,null,36,null,35,null,34,null,33,null,32,null,31,null,30,null,29,null,28,null,27,null,26,null,25,null,24,null,23,null,22,null,21,null,20,null,19,null,18,null,17,null,16,null,15,null,14,null,13,null,12,null,11,null,10,null,9,null,8,null,7,null,6,null,5,null,4,null,3,null,2,null,1,null,0,null,-1,null,-2,null,-3,null,-4,null,-5,null,-6,null,-7,null,-8,null,-9,null,-10,null,-11,null,-12,null,-13,null,-14,null,-15,null,-16,null,-17,null,-18,null,-19,null,-20,null,-21,null,-22,null,-23,null,-24,null,-25,null,-26,null,-27,null,-28,null,-29,null,-30,null,-31,null,-32,null,-33,null,-34,null,-35,null,-36,null,-37,null,-38,null,-39,null,-40,null,-41,null,-42,null,-43,null,-44,null,-45,null,-46,null,-47,null,-48,null,-49,null,-50,null,-51,null,-52,null,-53,null,-54,null,-55,null,-56,null,-57,null,-58,null,-59,null,-60,null,-61,null,-62,null,-63,null,-64,null,-65,null,-66,null,-67,null,-68,null,-69,null,-70,null,-71,null,-72,null,-73,null,-74,null,-75,null,-76,null,-77,null,-78,null,-79,null,-80,null,-81,null,-82,null,-83,null,-84,null,-85,null,-86,null,-87,null,-88,null,-89,null,-90,null,-91,null,-92,null,-93,null,-94,null,-95,null,-96,null,-97,null,-98,null,-99,null,-100,null,100,null,99,null,98,null,97,null,96,null,95,null,94,null,93,null,92,null,91,null,90,null,89,null,88,null,87,null,86,null,85,null,84,null,83,null,82,null,81,null,80,null,79,null,78,null,77,null,76,null,75,null,74,null,73,null,72,null,71,null,70,null,69,null,68,null,67,null,66,null,65,null,64,null,63,null,62,null,61,null,60,null,59,null,58,null,57,null,56,null,55,null,54,null,53,null,52,null,51,null,50,null,49,null,48,null,47,null,46,null,45,null,44,null,43,null,42,null,41,null,40,null,39,null,38,null,37,null,36,null,35,null,34,null,33,null,32,null,31,null,30,null,29,null,28,null,27,null,26,null,25,null,24,null,23,null,22,null,21,null,20,null,19,null,18,null,17,null,16,null,15,null,14,null,13,null,12,null,11,null,10,null,9,null,8,null,7,null,6,null,5,null,4,null,3,null,2,null,1,null,0,null,-1,null,-2,null,-3,null,-4,null,-5,null,-6,null,-7,null,-8,null,-9,null,-10,null,-11,null,-12,null,-13,null,-14,null,-15,null,-16,null,-17,null,-18,null,-19,null,-20,null,-21,null,-22,null,-23,null,-24,null,-25,null,-26,null,-27,null,-28,null,-29,null,-30,null,-31,null,-32,null,-33,null,-34,null,-35,null,-36,null,-37,null,-38,null,-39,null,-40,null,-41,null,-42,null,-43,null,-44,null,-45,null,-46,null,-47,null,-48,null,-49,null,-50,null,-51,null,-52,null,-53,null,-54,null,-55,null,-56,null,-57,null,-58,null,-59,null,-60,null,-61,null,-62,null,-63,null,-64,null,-65,null,-66,null,-67,null,-68,null,-69,null,-70,null,-71,null,-72,null,-73,null,-74,null,-75,null,-76,null,-77,null,-78,null,-79,null,-80,null,-81,null,-82,null,-83,null,-84,null,-85,null,-86,null,-87,null,-88,null,-89,null,-90,null,-91,null,-92,null,-93,null,-94,null,-95,null,-96,null,-97,null,-98,null,-99,null,-100,null,100,null,99,null,98,null,97,null,96,null,95,null,94,null,93,null,92,null,91,null,90,null,89,null,88,null,87,null,86,null,85,null,84,null,83,null,82,null,81,null,80,null,79,null,78,null,77,null,76,null,75,null,74,null,73,null,72,null,71,null,70,null,69,null,68,null,67,null,66,null,65,null,64,null,63,null,62,null,61,null,60,null,59,null,58,null,57,null,56,null,55,null,54,null,53,null,52,null,51,null,50,null,49,null,48,null,47,null,46,null,45,null,44,null,43,null,42,null,41,null,40,null,39,null,38,null,37,null,36,null,35,null,34,null,33,null,32,null,31,null,30,null,29,null,28,null,27,null,26,null,25,null,24,null,23,null,22,null,21,null,20,null,19,null,18,null,17,null,16,null,15,null,14,null,13,null,12,null,11,null,10,null,9,null,8,null,7,null,6,null,5,null,4],0],[100,99,98,97,96,95,94,93,92,91,90,89,88,87,86,85,84,83,82,81,80,79,78,77,76,75,74,73,72,71,70,69,68,67,66,65,64,63,62,61,60,59,58,57,56,55,54,53,52,51,50,49,48,47,46,45,44,43,42,41,40,39,38,37,36,35,34,33,32,31,30,29,28,27,26,25,24,23,22,21,20,19,18,17,16,15,14,13,12,11,10,9,8,7,6,5,4,3,2,1,0,-1,-2,-3,-4,-5,-6,-7,-8,-9,-10,-11,-12,-13,-14,-15,-16,-17,-18,-19,-20,-21,-22,-23,-24,-25,-26,-27,-28,-29,-30,-31,-32,-33,-34,-35,-36,-37,-38,-39,-40,-41,-42,-43,-44,-45,-46,-47,-48,-49,-50,-51,-52,-53,-54,-55,-56,-57,-58,-59,-60,-61,-62,-63,-64,-65,-66,-67,-68,-69,-70,-71,-72,-73,-74,-75,-76,-77,-78,-79,-80,-81,-82,-83,-84,-85,-86,-87,-88,-89,-90,-91,-92,-93,-94,-95,-96,-97,-98,-99,-100,100,99,98,97,96,95,94,93,92,91,90,89,88,87,86,85,84,83,82,81,80,79,78,77,76,75,74,73,72,71,70,69,68,67,66,65,64,63,62,61,60,59,58,57,56,55,54,53,52,51,50,49,48,47,46,45,44,43,42,41,40,39,38,37,36,35,34,33,32,31,30,29,28,27,26,25,24,23,22,21,20,19,18,17,16,15,14,13,12,11,10,9,8,7,6,5,4,3,2,1,0,-1,-2,-3,-4,-5,-6,-7,-8,-9,-10,-11,-12,-13,-14,-15,-16,-17,-18,-19,-20,-21,-22,-23,-24,-25,-26,-27,-28,-29,-30,-31,-32,-33,-34,-35,-36,-37,-38,-39,-40,-41,-42,-43,-44,-45,-46,-47,-48,-49,-50,-51,-52,-53,-54,-55,-56,-57,-58,-59,-60,-61,-62,-63,-64,-65,-66,-67,-68,-69,-70,-71,-72,-73,-74,-75,-76,-77,-78,-79,-80,-81,-82,-83,-84,-85,-86,-87,-88,-89,-90,-91,-92,-93,-94,-95,-96,-97,-98,-99,-100,100,99,98,97,96,95,94,93,92,91,90,89,88,87,86,85,84,83,82,81,80,79,78,77,76,75,74,73,72,71,70,69,68,67,66,65,64,63,62,61,60,59,58,57,56,55,54,53,52,51,50,49,48,47,46,45,44,43,42,41,40,39,38,37,36,35,34,33,32,31,30,29,28,27,26,25,24,23,22,21,20,19,18,17,16,15,14,13,12,11,10,9,8,7,6,5,4,3,2,1,0,-1,-2,-3,-4,-5,-6,-7,-8,-9,-10,-11,-12,-13,-14,-15,-16,-17,-18,-19,-20,-21,-22,-23,-24,-25,-26,-27,-28,-29,-30,-31,-32,-33,-34,-35,-36,-37,-38,-39,-40,-41,-42,-43,-44,-45,-46,-47,-48,-49,-50,-51,-52,-53,-54,-55,-56,-57,-58,-59,-60,-61,-62,-63,-64,-65,-66,-67,-68,-69,-70,-71,-72,-73,-74,-75,-76,-77,-78,-79,-80,-81,-82,-83,-84,-85,-86,-87,-88,-89,-90,-91,-92,-93,-94,-95,-96,-97,-98,-99,-100,100,99,98,97,96,95,94,93,92,91,90,89,88,87,86,85,84,83,82,81,80,79,78,77,76,75,74,73,72,71,70,69,68,67,66,65,64,63,62,61,60,59,58,57,56,55,54,53,52,51,50,49,48,47,46,45,44,43,42,41,40,39,38,37,36,35,34,33,32,31,30,29,28,27,26,25,24,23,22,21,20,19,18,17,16,15,14,13,12,11,10,9,8,7,6,5,4]],
        [[[],-100000],Array.from({ length: 100000 }, (_, k) => ((99999 - k) % 201) - 100)]
      ] },
      solution: {
        approach: `<p>Simulate the recursion: the stack holds nodes whose left side is in progress. Slide left, pop, record, turn right.</p>`,
        code: `
          class Solution {
              public List<Integer> inorderTraversal(TreeNode root) {
                  List<Integer> out = new ArrayList<>();
                  Deque<TreeNode> st = new ArrayDeque<>();  // nodes waiting for their left side
                  TreeNode cur = root;
                  // keep going while there is a node to explore OR someone still waiting
                  while (cur != null || !st.isEmpty()) {
                      // 1) slide as far left as possible, remembering every node we pass
                      while (cur != null) {
                          st.push(cur);
                          cur = cur.left;
                      }
                      // 2) the top node has no unfinished left side -> it is next in order
                      cur = st.pop();
                      out.add(cur.val);
                      // 3) its right subtree comes after it; explore that next
                      cur = cur.right;
                  }
                  return out;
              }
          }`,
        alt: [{ lang: 'python', code: `class Solution:
    def inorder_traversal(self, root):
        out, stack, cur = [], [], root      # stack = nodes waiting for their left side
        while cur or stack:
            while cur:                       # slide left, remembering the path
                stack.append(cur)
                cur = cur.left
            cur = stack.pop()                # its left side is done -> write it
            out.append(cur.val)
            cur = cur.right                  # then do its right subtree
        return out
` }, { lang: 'js', code: `function inorderTraversal(root) {
  const out = [], stack = [];   // stack = nodes waiting for their left side
  let cur = root;
  while (cur || stack.length) {
    while (cur) {               // slide left, remembering the path
      stack.push(cur);
      cur = cur.left;
    }
    cur = stack.pop();          // its left side is done -> write it
    out.push(cur.val);
    cur = cur.right;            // then do its right subtree
  }
  return out;
}
` }, { lang: 'cpp', code: `// LeetCode-style node (the judge normally provides it)
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(x), left(l), right(r) {}
};

class Solution {
public:
    vector<int> inorderTraversal(TreeNode* root) {
        vector<int> out;
        stack<TreeNode*> st;                 // nodes waiting for their left side
        TreeNode* cur = root;
        while (cur || !st.empty()) {
            while (cur) {                    // slide left, remembering the path
                st.push(cur);
                cur = cur->left;
            }
            cur = st.top(); st.pop();        // its left side is done -> write it
            out.push_back(cur->val);
            cur = cur->right;                // then do its right subtree
        }
        return out;
    }
};
` }],
        dry: {
          head: ['step', 'action', 'stack (bottom→top)', 'cur after', 'output'],
          rows: [
            ['1', 'slide left: push 1, 2, 4', '[1, 2, 4]', 'null', '[]'],
            ['2', 'pop 4, add, go right', '[1, 2]', 'null', H.c('g', '[4]')],
            ['3', 'pop 2, add, go right', '[1]', '5', H.c('g', '[4, 2]')],
            ['4', 'slide left: push 5', '[1, 5]', 'null', '[4, 2]'],
            ['5', 'pop 5, add, go right', '[1]', 'null', H.c('g', '[4, 2, 5]')],
            ['6', 'pop 1, add, go right', '[ ]', '3', H.c('g', '[4, 2, 5, 1]')],
            ['7', 'slide left: push 3', '[3]', 'null', '[4, 2, 5, 1]'],
            ['8', 'pop 3, add, go right', '[ ]', 'null', H.c('p', '[4, 2, 5, 1, 3]') + ' → stop']
          ]
        },
        complexity: `<p><b>Time O(N)</b>: every node is pushed exactly once and popped exactly once. <b>Space O(h)</b>: the stack only holds one root-to-current path, so about log₂N for a bushy tree and N for a skewed one — but it lives on the heap, so no stack overflow.</p>`
      }
    }],
    examples: [
      {
        title: 'Trace iterative preorder on a 5-node tree',
        html: `<p>Tree <code>[1, 2, 3, 4, 5]</code>. Rule: pop, write, push right, push left.</p>
${H.table(['pop', 'write', 'push', 'stack after (bottom → top)'], [
  ['1', H.c('g', '1'), '3, 2', '[3, 2]'],
  ['2', H.c('g', '2'), '5, 4', '[3, 5, 4]'],
  ['4', H.c('g', '4'), '—', '[3, 5]'],
  ['5', H.c('g', '5'), '—', '[3]'],
  ['3', H.c('g', '3'), '—', '[ ]']
])}
<p>Output ${H.c('p', '1 2 4 5 3')} — same as the recursive preorder. Pushing <b>right first</b> is the whole trick.</p>`
      },
      {
        title: 'Postorder with ONE stack (the "last visited" trick)',
        html: `<p>Slide left like inorder, but when you reach a node, only write it if its right side is empty <b>or</b> was just finished (<code>top.right == last</code>). Otherwise go right first. This is the version interviewers ask for when you mention the two-stack trick.</p>`,
        code: { lang: 'java', code: `
List<Integer> postorderOneStack(TreeNode root) {
    List<Integer> out = new ArrayList<>();
    Deque<TreeNode> st = new ArrayDeque<>();
    TreeNode cur = root, last = null;                 // last = node written most recently
    while (cur != null || !st.isEmpty()) {
        while (cur != null) { st.push(cur); cur = cur.left; }   // slide left
        TreeNode top = st.peek();
        if (top.right != null && top.right != last) {
            cur = top.right;                          // right side not done yet -> go there
        } else {
            out.add(top.val);                         // both sides done -> write me
            last = st.pop();
        }
    }
    return out;
}`, alt: [{ lang: 'python', code: `def postorder_one_stack(root):
    out, stack = [], []
    cur, last = root, None                   # last = node written most recently
    while cur or stack:
        while cur:                           # slide left
            stack.append(cur)
            cur = cur.left
        top = stack[-1]
        if top.right and top.right is not last:
            cur = top.right                  # right side not done yet -> go there
        else:
            out.append(top.val)              # both sides done -> write me
            last = stack.pop()
    return out
` }, { lang: 'js', code: `function postorderOneStack(root) {
  const out = [], stack = [];
  let cur = root, last = null;               // last = node written most recently
  while (cur || stack.length) {
    while (cur) { stack.push(cur); cur = cur.left; }   // slide left
    const top = stack[stack.length - 1];
    if (top.right && top.right !== last) {
      cur = top.right;                       // right side not done yet -> go there
    } else {
      out.push(top.val);                     // both sides done -> write me
      last = stack.pop();
    }
  }
  return out;
}
` }, { lang: 'cpp', code: `// TreeNode as defined in the first lesson
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int v = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(v), left(l), right(r) {}
};

vector<int> postorderOneStack(TreeNode* root) {
    vector<int> out;
    stack<TreeNode*> st;
    TreeNode *cur = root, *last = nullptr;   // last = node written most recently
    while (cur || !st.empty()) {
        while (cur) { st.push(cur); cur = cur->left; }   // slide left
        TreeNode* top = st.top();
        if (top->right && top->right != last) {
            cur = top->right;                // right side not done yet -> go there
        } else {
            out.push_back(top->val);         // both sides done -> write me
            last = top;
            st.pop();
        }
    }
    return out;
}
` }] }
      },
      {
        title: 'Morris inorder: O(1) extra space',
        html: `<p>No stack at all. Before going left, find the <b>predecessor</b> (rightmost node of the left subtree) and make its right pointer point back to the current node, like leaving a rope to climb back up. The second time you arrive you remove the rope and write the node. Each edge is walked at most a few times → still O(N).</p>`,
        code: { lang: 'java', code: `
List<Integer> morrisInorder(TreeNode root) {
    List<Integer> out = new ArrayList<>();
    TreeNode cur = root;
    while (cur != null) {
        if (cur.left == null) {                 // nothing on the left: write and go right
            out.add(cur.val);
            cur = cur.right;
        } else {
            TreeNode pred = cur.left;           // find rightmost node of the left subtree
            while (pred.right != null && pred.right != cur) pred = pred.right;
            if (pred.right == null) {           // first visit: leave a rope back to cur
                pred.right = cur;
                cur = cur.left;
            } else {                            // second visit: left side done
                pred.right = null;              // remove the rope (restore the tree)
                out.add(cur.val);
                cur = cur.right;
            }
        }
    }
    return out;
}`, alt: [{ lang: 'python', code: `def morris_inorder(root):
    out, cur = [], root
    while cur:
        if cur.left is None:                 # nothing on the left: write and go right
            out.append(cur.val)
            cur = cur.right
        else:
            pred = cur.left                  # find rightmost node of the left subtree
            while pred.right and pred.right is not cur:
                pred = pred.right
            if pred.right is None:           # first visit: leave a rope back to cur
                pred.right = cur
                cur = cur.left
            else:                            # second visit: left side done
                pred.right = None            # remove the rope (restore the tree)
                out.append(cur.val)
                cur = cur.right
    return out
` }, { lang: 'js', code: `function morrisInorder(root) {
  const out = [];
  let cur = root;
  while (cur) {
    if (!cur.left) {                         // nothing on the left: write and go right
      out.push(cur.val);
      cur = cur.right;
    } else {
      let pred = cur.left;                   // find rightmost node of the left subtree
      while (pred.right && pred.right !== cur) pred = pred.right;
      if (!pred.right) {                     // first visit: leave a rope back to cur
        pred.right = cur;
        cur = cur.left;
      } else {                               // second visit: left side done
        pred.right = null;                   // remove the rope (restore the tree)
        out.push(cur.val);
        cur = cur.right;
      }
    }
  }
  return out;
}
` }, { lang: 'cpp', code: `// TreeNode as defined in the first lesson
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int v = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(v), left(l), right(r) {}
};

vector<int> morrisInorder(TreeNode* root) {
    vector<int> out;
    TreeNode* cur = root;
    while (cur) {
        if (!cur->left) {                    // nothing on the left: write and go right
            out.push_back(cur->val);
            cur = cur->right;
        } else {
            TreeNode* pred = cur->left;      // find rightmost node of the left subtree
            while (pred->right && pred->right != cur) pred = pred->right;
            if (!pred->right) {              // first visit: leave a rope back to cur
                pred->right = cur;
                cur = cur->left;
            } else {                         // second visit: left side done
                pred->right = nullptr;       // remove the rope (restore the tree)
                out.push_back(cur->val);
                cur = cur->right;
            }
        }
    }
    return out;
}
` }] }
      }
    ],
    deepDive: `<p><b>Pick a fast stack.</b> Python: a plain list (<code>append</code> / <code>pop</code>). JavaScript: an array (<code>push</code> / <code>pop</code>). C++: <code>std::stack</code> or a <code>vector</code>. Java: use <code>ArrayDeque</code>, not <code>Stack</code>: <code>java.util.Stack</code> extends the old synchronized <code>Vector</code>: every push/pop takes a lock. <code>ArrayDeque</code> is a resizable circular array, faster and the officially recommended stack. Remember it <b>refuses null</b>, so never push a null child — check first.</p>
<p><b>Space:</b> the explicit stack still holds up to h nodes (O(h)), but it lives on the <b>heap</b>, which is measured in gigabytes instead of the thread stack's ~1 MB. That is the real reason iterative versions survive 10<sup>5</sup>-deep skewed trees.</p>
<p><b>One template for all three orders:</b> push pairs <code>(node, visited)</code>. When you pop an unvisited node, push its parts back in reverse of the desired order, marking the node itself as visited — e.g. for inorder push (right, false), (node, true), (left, false). When you pop a visited node, write it. Slower by a constant, but you only memorise one loop.</p>
<p><b>Iterators:</b> the iterative inorder is exactly what a "BST iterator" or a database <b>range scan</b> does: the stack is the iterator's saved state, <code>next()</code> runs one pop + slide-left, and the amortised cost per call is O(1) (each node is pushed and popped once over the whole iteration) with O(h) memory.</p>
<p><b>Morris trade-offs:</b> O(1) space and O(N) time, but it writes to the tree (temporarily), so it is not allowed on read-only or shared trees, and a crash halfway leaves the tree corrupted.</p>`,
    aiEra: `<p><b>What AI changes:</b> converting recursion into a loop with an explicit stack is a mechanical refactor that assistants do well, so you can ask for it and spend your effort on verifying it.</p>
<p><b>Use AI as a partner:</b> <code>Convert this recursive postorder to an iterative one with ONE stack and explain what the stack holds at each step for the tree [1,2,3,4,5].</code> Then trace it yourself — the explanation is often wrong even when the code is right.</p>
<p><b>Where AI goes wrong:</b> the outer condition <code>cur != null || !st.isEmpty()</code> is frequently written with only one half, which silently drops the right subtree of the root; postorder one-stack versions often loop forever because <code>last</code> is not updated; and generated Java code sometimes uses <code>Stack</code> or pushes null into <code>ArrayDeque</code> (NullPointerException).</p>
<p><b>What you must still own:</b> being able to say what the stack <b>means</b> ("nodes whose left side is in progress") — that invariant is what lets you write any variant (k-th smallest, iterator, early exit) on the spot.</p>`
  });
  /* ===================== TOPIC 4: Level order BFS ===================== */
  topics.push({
    title: 'Level Order Traversal (BFS with a Queue)',
    analogy: `<p>A company sends out a big announcement. The <b>CEO</b> hears it first, then <b>all the VPs</b>, then <b>all the managers</b>, then <b>all the staff</b> — one whole floor of the org chart at a time. Or think of <b>ripples in a pond</b>: the circle closest to the stone appears first, then the next ring, then the next. Whoever was told first passes it on first: that is a <b>queue</b> (first in, first out), like a line at a ticket counter.</p>`,
    explain: `<p><b>BFS</b> (Breadth-First Search) visits the tree <b>level by level</b>, left to right. DFS dives deep; BFS spreads wide.</p>
<pre>
            3          level 0 → [3]
          /   \\
         9     20      level 1 → [9, 20]
              /  \\
            15    7    level 2 → [15, 7]
</pre>
<p><b>Recipe:</b></p>
<ol>
<li>Put the root in a queue.</li>
<li>While the queue is not empty: read <code>size = queue.size()</code>. That number is <b>exactly how many nodes are on the current level</b>.</li>
<li>Repeat <code>size</code> times: take a node from the front, record it, add its left child then its right child to the back.</li>
<li>After those <code>size</code> nodes, one level is complete — save it and go to the next.</li>
</ol>
${H.table(['level', 'queue at start', 'size', 'taken out', 'added to back'], [
  ['0', '[3]', '1', H.c('y', '3'), '9, 20'],
  ['1', '[9, 20]', '2', H.c('y', '9, 20'), '15, 7'],
  ['2', '[15, 7]', '2', H.c('y', '15, 7'), '—']
])}
<p>The <code>size</code> snapshot is the key trick: children added during this level go to the <b>back</b> of the queue and wait for the next round, so levels never mix.</p>`,
    clues: [
      '"<b>level by level</b>", "<b>level order</b>", "each depth", "row by row" → BFS with a queue + <code>size</code> snapshot.',
      '"<b>minimum depth</b>", "<b>nearest</b> leaf", "first level where…" → BFS stops as soon as it finds it (DFS would explore everything).',
      '"<b>zigzag</b>", "average of each level", "largest value in each row", "right side view" → same BFS, small change in what you record per level.',
      '"connect next pointers on the same level" / "width of each level" → BFS level grouping.',
      'Each node enters and leaves the queue once → <b>O(N)</b> time; queue holds at most one level → O(width) space.'
    ],
    viz: {
      title: 'BFS: the queue moves one level at a time',
      input: '3 9 20 null null 15 7',
      inputLabel: 'Tree slots (level order, null = empty)',
      gen: function (input) {
        var a = parseTreeStr(input), F = [], q = [0], levels = [], doneSet = {}, lvl = 0;
        function draw(narr, cur, levelNow, extraHl) {
          var hl = {};
          for (var k in doneSet) hl[k] = 'done';
          q.forEach(function (i) { hl[i] = 'win'; });
          if (extraHl) for (var e in extraHl) hl[e] = extraHl[e];
          if (cur !== undefined) hl[cur] = 'cur';
          F.push({ narr: narr, parts: [
            { type: 'tree', label: 'Tree (blue = waiting in queue)', arr: a.slice(), hl: hl },
            { type: 'queue', label: 'BFS queue', items: q.map(function (i) { return a[i]; }), hl: q.length ? o1(0, 'cur') : {} },
            { type: 'array', label: 'current level ' + lvl, values: levelNow.slice() },
            { type: 'text', label: 'result so far', html: levels.length ? levels.map(function (l) { return '[' + l.join(', ') + ']'; }).join(' ') : '<i>empty</i>' }] });
        }
        draw('Put the root ' + a[0] + ' into the queue. The queue holds nodes that are discovered but not yet processed.', undefined, []);
        while (q.length) {
          var size = q.length, cur = [];
          draw('<b>Level ' + lvl + ' starts.</b> The queue holds ' + size + ' node(s) right now, so this level has exactly <code>size = ' + size + '</code> nodes. We will take out exactly that many.', undefined, cur);
          for (var s = 0; s < size; s++) {
            var n = q.shift(), L = 2 * n + 1, R = 2 * n + 2, add = [];
            cur.push(a[n]); doneSet[n] = 1;
            var nh = {};
            if (ex(a, L)) { q.push(L); add.push(a[L]); nh[L] = 'ok'; }
            if (ex(a, R)) { q.push(R); add.push(a[R]); nh[R] = 'ok'; }
            draw('Take <b>' + a[n] + '</b> from the front (' + (s + 1) + ' of ' + size + ') and add it to level ' + lvl + '. ' + (add.length ? 'Its children ' + add.join(', ') + ' join the <b>back</b> of the queue (they belong to the next level).' : 'No children to add.'), n, cur, nh);
          }
          levels.push(cur.slice());
          draw('Level ' + lvl + ' is complete: [' + cur.join(', ') + ']. ' + (q.length ? 'Whatever is in the queue now is exactly the next level.' : 'The queue is empty, so there is no next level.'), undefined, cur);
          lvl++;
        }
        return F;
      }
    },
    problems: [{
      title: 'Binary Tree Level Order Traversal',
      level: 'Medium',
      tags: ['bfs', 'queue'],
      statement: `<p>Given the <code>root</code> of a binary tree, return the values <b>level by level</b>, from left to right, as a list of lists.</p>`,
      constraints: `0 ≤ number of nodes ≤ 2000, −1000 ≤ Node.val ≤ 1000`,
      example: `<p>Input: <code>root = [3,9,20,null,null,15,7]</code></p>
<pre>
      3
    /   \\
   9     20
        /  \\
      15    7
</pre><p>Output: ${H.c('g', '[[3], [9, 20], [15, 7]]')}</p><p><b>Why:</b> ${H.c('y', '3')} is alone at depth 0; ${H.c('y', '9 and 20')} are at depth 1 (left to right); ${H.c('y', '15 and 7')} are at depth 2.</p>`,
      brute: {
        why: `<p>Find the height h, then for every depth d run a fresh DFS from the root that collects nodes at depth d. Each DFS walks the whole tree, so total work is O(N·h) — O(N<sup>2</sup>) for a skewed tree. The waste: the top of the tree is re-walked for every single level.</p>`,
        code: `
          List<List<Integer>> levelOrderBrute(TreeNode root) {
              List<List<Integer>> res = new ArrayList<>();
              int h = height(root);
              for (int d = 0; d < h; d++) {          // one full DFS per level
                  List<Integer> row = new ArrayList<>();
                  collect(root, 0, d, row);
                  res.add(row);
              }
              return res;
          }
          int height(TreeNode n) { return n == null ? 0 : 1 + Math.max(height(n.left), height(n.right)); }
          void collect(TreeNode n, int depth, int target, List<Integer> row) {
              if (n == null) return;
              if (depth == target) { row.add(n.val); return; }
              collect(n.left, depth + 1, target, row);
              collect(n.right, depth + 1, target, row);
          }`
      },
      mcq: {
        q: 'Inside the while-loop, why do we save <code>int size = q.size()</code> BEFORE the inner for-loop?',
        options: ['To know the total number of nodes in the tree', 'Because children added during the loop would otherwise get mixed into the current level', 'Because Queue.size() is slow', 'To skip null children'],
        answer: 1,
        explain: 'While processing level d we keep adding level d+1 children to the back. If we used q.size() live, the loop would run into those children too. Snapshotting the size freezes "how many belong to this level".'
      },
      hints: [
        `<p><b>Aha:</b> if you process nodes in the order you discover them, you automatically go level by level — parents are discovered before children. "First discovered, first processed" = FIFO = <b>queue</b>.</p>`,
        `<p>Use a queue (<code>ArrayDeque</code> in Java, <code>collections.deque</code> in Python, <code>std::queue</code> in C++; in JavaScript an array with a read index, because <code>shift()</code> is O(n)). Outer loop per level: <code>size = q.size()</code>; inner loop <code>size</code> times: take the front node, add its value to the row, add its non-null left then right child to the back.</p>`,
        `<p><b>Traps:</b> empty tree → return empty list (do not put null in the queue — Java's <code>ArrayDeque</code> even throws on it). Add left before right to keep left-to-right order. <b>Recipe:</b> q = [root]; while q: size; row = []; repeat size: n = poll; row.add; push kids; res.add(row).</p>`
      ],
      tests: { sig: 'TreeNode -> list<list<int>>', fn: 'levelOrder', cases: [
        [[[1,2,3,4,5]],[[1],[2,3],[4,5]]],
        [[[]],[]],
        [[[1]],[[1]]],
        [[[1,null,2,3]],[[1],[2],[3]]],
        [[[3,9,20,null,null,15,7]],[[3],[9,20],[15,7]]],
        [[[-5,-5,0,null,7,7,-100]],[[-5],[-5,0],[7,7,-100]]],
        [[[1,2,3,4,null,null,5,6,null,null,7]],[[1],[2,3],[4,5],[6,7]]],
        [[[-79,-60,-61,null,-87,null,-100,null,-10]],[[-79],[-60,-61],[-87,-100],[-10]]],
        [[[-51,87,56,-70,71,null,null,null,null,null,-77,null,90,null,-82]],[[-51],[87,56],[-70,71],[-77],[90],[-82]]],
        [[[18,null,-59,-30,null,-26,null,null,77]],[[18],[-59],[-30],[-26],[77]]],
        [[[0,1,null,2,null,3,null,4,null,5,null,6,null,7,null,8,null,9,null,10,null,11,null,12,null,13,null,14,null,15,null,16,null,17,null,18,null,19,null,20,null,21,null,22,null,23,null,24,null,25,null,26,null,27,null,28,null,29,null,30,null,31,null,32,null,33,null,34,null,35,null,36,null,37,null,38,null,39,null,40,null,41,null,42,null,43,null,44,null,45,null,46,null,47,null,48,null,49,null,50,null,51,null,52,null,53,null,54,null,55,null,56,null,57,null,58,null,59,null,60,null,61,null,62,null,63,null,64,null,65,null,66,null,67,null,68,null,69,null,70,null,71,null,72,null,73,null,74,null,75,null,76,null,77,null,78,null,79,null,80,null,81,null,82,null,83,null,84,null,85,null,86,null,87,null,88,null,89,null,90,null,91,null,92,null,93,null,94,null,95,null,96,null,97,null,98,null,99,null,100,null,101,null,102,null,103,null,104,null,105,null,106,null,107,null,108,null,109,null,110,null,111,null,112,null,113,null,114,null,115,null,116,null,117,null,118,null,119,null,120,null,121,null,122,null,123,null,124,null,125,null,126,null,127,null,128,null,129,null,130,null,131,null,132,null,133,null,134,null,135,null,136,null,137,null,138,null,139,null,140,null,141,null,142,null,143,null,144,null,145,null,146,null,147,null,148,null,149,null,150,null,151,null,152,null,153,null,154,null,155,null,156,null,157,null,158,null,159,null,160,null,161,null,162,null,163,null,164,null,165,null,166,null,167,null,168,null,169,null,170,null,171,null,172,null,173,null,174,null,175,null,176,null,177,null,178,null,179,null,180,null,181,null,182,null,183,null,184,null,185,null,186,null,187,null,188,null,189,null,190,null,191,null,192,null,193,null,194,null,195,null,196,null,197,null,198,null,199,null,200,null,201,null,202,null,203,null,204,null,205,null,206,null,207,null,208,null,209,null,210,null,211,null,212,null,213,null,214,null,215,null,216,null,217,null,218,null,219,null,220,null,221,null,222,null,223,null,224,null,225,null,226,null,227,null,228,null,229,null,230,null,231,null,232,null,233,null,234,null,235,null,236,null,237,null,238,null,239,null,240,null,241,null,242,null,243,null,244,null,245,null,246,null,247,null,248,null,249,null,250,null,251,null,252,null,253,null,254,null,255,null,256,null,257,null,258,null,259,null,260,null,261,null,262,null,263,null,264,null,265,null,266,null,267,null,268,null,269,null,270,null,271,null,272,null,273,null,274,null,275,null,276,null,277,null,278,null,279,null,280,null,281,null,282,null,283,null,284,null,285,null,286,null,287,null,288,null,289,null,290,null,291,null,292,null,293,null,294,null,295,null,296,null,297,null,298,null,299]],[[0],[1],[2],[3],[4],[5],[6],[7],[8],[9],[10],[11],[12],[13],[14],[15],[16],[17],[18],[19],[20],[21],[22],[23],[24],[25],[26],[27],[28],[29],[30],[31],[32],[33],[34],[35],[36],[37],[38],[39],[40],[41],[42],[43],[44],[45],[46],[47],[48],[49],[50],[51],[52],[53],[54],[55],[56],[57],[58],[59],[60],[61],[62],[63],[64],[65],[66],[67],[68],[69],[70],[71],[72],[73],[74],[75],[76],[77],[78],[79],[80],[81],[82],[83],[84],[85],[86],[87],[88],[89],[90],[91],[92],[93],[94],[95],[96],[97],[98],[99],[100],[101],[102],[103],[104],[105],[106],[107],[108],[109],[110],[111],[112],[113],[114],[115],[116],[117],[118],[119],[120],[121],[122],[123],[124],[125],[126],[127],[128],[129],[130],[131],[132],[133],[134],[135],[136],[137],[138],[139],[140],[141],[142],[143],[144],[145],[146],[147],[148],[149],[150],[151],[152],[153],[154],[155],[156],[157],[158],[159],[160],[161],[162],[163],[164],[165],[166],[167],[168],[169],[170],[171],[172],[173],[174],[175],[176],[177],[178],[179],[180],[181],[182],[183],[184],[185],[186],[187],[188],[189],[190],[191],[192],[193],[194],[195],[196],[197],[198],[199],[200],[201],[202],[203],[204],[205],[206],[207],[208],[209],[210],[211],[212],[213],[214],[215],[216],[217],[218],[219],[220],[221],[222],[223],[224],[225],[226],[227],[228],[229],[230],[231],[232],[233],[234],[235],[236],[237],[238],[239],[240],[241],[242],[243],[244],[245],[246],[247],[248],[249],[250],[251],[252],[253],[254],[255],[256],[257],[258],[259],[260],[261],[262],[263],[264],[265],[266],[267],[268],[269],[270],[271],[272],[273],[274],[275],[276],[277],[278],[279],[280],[281],[282],[283],[284],[285],[286],[287],[288],[289],[290],[291],[292],[293],[294],[295],[296],[297],[298],[299]]]
      ] },
      solution: {
        approach: `<p>BFS with a queue; the size snapshot cuts the stream into levels.</p>`,
        code: `
          class Solution {
              public List<List<Integer>> levelOrder(TreeNode root) {
                  List<List<Integer>> res = new ArrayList<>();
                  if (root == null) return res;            // ArrayDeque cannot hold null
                  Queue<TreeNode> q = new ArrayDeque<>();
                  q.offer(root);
                  while (!q.isEmpty()) {
                      int size = q.size();                 // nodes on THIS level only
                      List<Integer> row = new ArrayList<>();
                      for (int i = 0; i < size; i++) {
                          TreeNode n = q.poll();           // front of the line
                          row.add(n.val);
                          if (n.left != null) q.offer(n.left);   // next level waits at the back
                          if (n.right != null) q.offer(n.right);
                      }
                      res.add(row);                        // one level finished
                  }
                  return res;
              }
          }`,
        alt: [{ lang: 'python', code: `from collections import deque

class Solution:
    def level_order(self, root):
        if root is None:
            return []
        res, q = [], deque([root])
        while q:
            row = []
            for _ in range(len(q)):          # size snapshot = this level only
                n = q.popleft()              # O(1), unlike list.pop(0)
                row.append(n.val)
                if n.left:
                    q.append(n.left)
                if n.right:
                    q.append(n.right)
            res.append(row)
        return res
` }, { lang: 'js', code: `function levelOrder(root) {
  const res = [];
  let level = root ? [root] : [];   // one array per level: no O(n) shift()
  while (level.length) {
    res.push(level.map((n) => n.val));
    const next = [];
    for (const n of level) {
      if (n.left) next.push(n.left);
      if (n.right) next.push(n.right);
    }
    level = next;
  }
  return res;
}
` }, { lang: 'cpp', code: `// LeetCode-style node (the judge normally provides it)
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(x), left(l), right(r) {}
};

class Solution {
public:
    vector<vector<int>> levelOrder(TreeNode* root) {
        vector<vector<int>> res;
        if (!root) return res;
        queue<TreeNode*> q;
        q.push(root);
        while (!q.empty()) {
            int size = q.size();             // nodes on THIS level only
            vector<int>& row = res.emplace_back();
            while (size--) {
                TreeNode* n = q.front(); q.pop();
                row.push_back(n->val);
                if (n->left) q.push(n->left);
                if (n->right) q.push(n->right);
            }
        }
        return res;
    }
};
` }],
        dry: {
          head: ['level', 'size', 'polled (in order)', 'offered', 'queue after level', 'row'],
          rows: [
            ['0', '1', '3', '9, 20', '[9, 20]', H.c('g', '[3]')],
            ['1', '2', '9, 20', '15, 7 (from 20)', '[15, 7]', H.c('g', '[9, 20]')],
            ['2', '2', '15, 7', '—', '[ ]', H.c('g', '[15, 7]')],
            ['end', '—', '—', '—', 'empty → stop', H.c('p', '[[3],[9,20],[15,7]]')]
          ]
        },
        complexity: `<p><b>Time O(N)</b>: each node is offered once and polled once. <b>Space O(W)</b> where W is the widest level (up to about N/2 for the bottom level of a full tree), plus the output itself.</p>`
      }
    }],
    examples: [
      {
        title: 'Zigzag level order — flip every other row',
        html: `<p>Same BFS, but on odd levels reverse the row (or add values at the front of a deque). Tree <code>[3,9,20,null,null,15,7]</code>:</p>
${H.table(['level', 'BFS row', 'direction', 'saved'], [
  ['0', '[3]', '→', H.c('g', '[3]')],
  ['1', '[9, 20]', '←', H.c('g', '[20, 9]')],
  ['2', '[15, 7]', '→', H.c('g', '[15, 7]')]
])}`,
        code: { lang: 'java', code: `
List<List<Integer>> zigzag(TreeNode root) {
    List<List<Integer>> res = new ArrayList<>();
    if (root == null) return res;
    Queue<TreeNode> q = new ArrayDeque<>();
    q.offer(root);
    boolean leftToRight = true;
    while (!q.isEmpty()) {
        int size = q.size();
        LinkedList<Integer> row = new LinkedList<>();
        for (int i = 0; i < size; i++) {
            TreeNode n = q.poll();
            if (leftToRight) row.addLast(n.val); else row.addFirst(n.val);  // flip cheaply
            if (n.left != null) q.offer(n.left);
            if (n.right != null) q.offer(n.right);
        }
        res.add(row);
        leftToRight = !leftToRight;
    }
    return res;
}`, alt: [{ lang: 'python', code: `from collections import deque

def zigzag(root):
    res = []
    if root is None:
        return res
    q = deque([root])
    left_to_right = True
    while q:
        row = deque()
        for _ in range(len(q)):
            n = q.popleft()
            if left_to_right:
                row.append(n.val)
            else:
                row.appendleft(n.val)        # flip cheaply: O(1) at the front of a deque
            if n.left:
                q.append(n.left)
            if n.right:
                q.append(n.right)
        res.append(list(row))
        left_to_right = not left_to_right
    return res
` }, { lang: 'js', code: `function zigzag(root) {
  const res = [];
  let level = root ? [root] : [];
  let leftToRight = true;
  while (level.length) {
    const row = level.map((n) => n.val);
    res.push(leftToRight ? row : row.reverse());   // reverse the finished row (unshift would be O(n) each)
    level = level.flatMap((n) => [n.left, n.right].filter(Boolean));
    leftToRight = !leftToRight;
  }
  return res;
}
` }, { lang: 'cpp', code: `// TreeNode as defined in the first lesson
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int v = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(v), left(l), right(r) {}
};

vector<vector<int>> zigzag(TreeNode* root) {
    vector<vector<int>> res;
    if (!root) return res;
    queue<TreeNode*> q;
    q.push(root);
    bool leftToRight = true;
    while (!q.empty()) {
        int size = q.size();
        deque<int> row;
        for (int i = 0; i < size; i++) {
            TreeNode* n = q.front(); q.pop();
            if (leftToRight) row.push_back(n->val); else row.push_front(n->val);   // flip cheaply
            if (n->left) q.push(n->left);
            if (n->right) q.push(n->right);
        }
        res.emplace_back(row.begin(), row.end());
        leftToRight = !leftToRight;
    }
    return res;
}
` }] }
      },
      {
        title: 'Minimum depth — BFS stops at the first leaf',
        html: `<p>For <code>[3,9,20,null,null,15,7]</code> the nearest leaf is ${H.c('g', '9')} at level 1, so the minimum depth is ${H.c('g', '2')} nodes. BFS meets 9 in the second round and returns immediately; it never touches 15 or 7. On a huge tree whose shallowest leaf is near the top, this saves almost all the work. DFS would have to explore every path to be sure.</p>`,
        code: { lang: 'java', code: `
int minDepth(TreeNode root) {
    if (root == null) return 0;
    Queue<TreeNode> q = new ArrayDeque<>();
    q.offer(root);
    int depth = 1;
    while (!q.isEmpty()) {
        int size = q.size();
        for (int i = 0; i < size; i++) {
            TreeNode n = q.poll();
            if (n.left == null && n.right == null) return depth;  // first leaf = nearest leaf
            if (n.left != null) q.offer(n.left);
            if (n.right != null) q.offer(n.right);
        }
        depth++;
    }
    return depth;
}`, alt: [{ lang: 'python', code: `from collections import deque

def min_depth(root):
    if root is None:
        return 0
    q, depth = deque([root]), 1
    while q:
        for _ in range(len(q)):
            n = q.popleft()
            if n.left is None and n.right is None:
                return depth                 # first leaf = nearest leaf
            if n.left:
                q.append(n.left)
            if n.right:
                q.append(n.right)
        depth += 1
    return depth
` }, { lang: 'js', code: `function minDepth(root) {
  if (!root) return 0;
  let level = [root], depth = 1;
  while (level.length) {
    const next = [];
    for (const n of level) {
      if (!n.left && !n.right) return depth;   // first leaf = nearest leaf
      if (n.left) next.push(n.left);
      if (n.right) next.push(n.right);
    }
    level = next;
    depth++;
  }
  return depth;
}
` }, { lang: 'cpp', code: `// TreeNode as defined in the first lesson
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int v = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(v), left(l), right(r) {}
};

int minDepth(TreeNode* root) {
    if (!root) return 0;
    queue<TreeNode*> q;
    q.push(root);
    int depth = 1;
    while (!q.empty()) {
        int size = q.size();
        for (int i = 0; i < size; i++) {
            TreeNode* n = q.front(); q.pop();
            if (!n->left && !n->right) return depth;   // first leaf = nearest leaf
            if (n->left) q.push(n->left);
            if (n->right) q.push(n->right);
        }
        depth++;
    }
    return depth;
}
` }] }
      },
      {
        title: 'Per-level statistics: average and maximum',
        html: `<p>Inside the level loop keep a running <code>sum</code> and <code>max</code>. For <code>[3,9,20,null,null,15,7]</code>: averages ${H.c('g', '[3.0, 14.5, 11.0]')}, maxima ${H.c('p', '[3, 20, 15]')}. Use a <code>long</code> or <code>double</code> for the sum — values up to 2<sup>31</sup> − 1 overflow an <code>int</code> when added.</p>`,
        code: { lang: 'java', code: `
List<Double> averageOfLevels(TreeNode root) {
    List<Double> res = new ArrayList<>();
    Queue<TreeNode> q = new ArrayDeque<>();
    if (root != null) q.offer(root);
    while (!q.isEmpty()) {
        int size = q.size();
        long sum = 0;                                  // long: avoid int overflow
        for (int i = 0; i < size; i++) {
            TreeNode n = q.poll();
            sum += n.val;
            if (n.left != null) q.offer(n.left);
            if (n.right != null) q.offer(n.right);
        }
        res.add((double) sum / size);
    }
    return res;
}`, alt: [{ lang: 'python', code: `def average_of_levels(root):
    res, level = [], [root] if root else []
    while level:
        res.append(sum(n.val for n in level) / len(level))   # Python ints never overflow
        level = [c for n in level for c in (n.left, n.right) if c]
    return res
` }, { lang: 'js', code: `function averageOfLevels(root) {
  const res = [];
  let level = root ? [root] : [];
  while (level.length) {
    const sum = level.reduce((s, n) => s + n.val, 0);   // exact while sums stay below 2^53
    res.push(sum / level.length);
    level = level.flatMap((n) => [n.left, n.right].filter(Boolean));
  }
  return res;
}
` }, { lang: 'cpp', code: `// TreeNode as defined in the first lesson
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int v = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(v), left(l), right(r) {}
};

vector<double> averageOfLevels(TreeNode* root) {
    vector<double> res;
    queue<TreeNode*> q;
    if (root) q.push(root);
    while (!q.empty()) {
        int size = q.size();
        long long sum = 0;                   // long long: avoid int overflow
        for (int i = 0; i < size; i++) {
            TreeNode* n = q.front(); q.pop();
            sum += n->val;
            if (n->left) q.push(n->left);
            if (n->right) q.push(n->right);
        }
        res.push_back((double)sum / size);
    }
    return res;
}
` }] }
      }
    ],
    deepDive: `<p><b>Memory: BFS vs DFS.</b> BFS keeps one whole level in the queue: for a perfect tree the last level holds (N + 1) / 2 nodes, so BFS space is O(N) on wide trees. DFS keeps one path: O(h) — tiny on a bushy tree but O(N) on a skewed one. So: wide and shallow → DFS is lighter; deep and thin → BFS is lighter.</p>
<p><b>Levels with DFS too:</b> pass <code>depth</code> down and do <code>if (depth == res.size()) res.add(new ArrayList&lt;&gt;()); res.get(depth).add(val);</code>. Visiting left before right keeps each row left-to-right. Handy when the interviewer says "now do it recursively".</p>
<p><b>Other ways to mark level boundaries:</b> push a <code>null</code> marker after each level (in Java that needs <code>LinkedList</code>, because <code>ArrayDeque</code> refuses null), or keep two lists <code>current</code> and <code>next</code> and swap. The size snapshot is the cleanest.</p>
<p><b>Completeness check:</b> run BFS and enqueue children even when they are null (in Java use <code>LinkedList</code>; Python's <code>deque</code>, JavaScript arrays and <code>std::queue</code> accept nulls). A tree is <b>complete</b> exactly when, after the first null you dequeue, every remaining entry is also null.</p>
<p><b>Width with positions:</b> give the root position 0 and children <code>2p + 1</code> / <code>2p + 2</code>. The width of a level is <code>last − first + 1</code>. On deep skewed trees positions explode past 2<sup>63</sup>, so re-base each level (subtract the first position of the level) — a classic follow-up.</p>
<p><b>Why "breadth-first" matters later:</b> on an unweighted graph BFS finds shortest paths because it reaches everything at distance d before anything at distance d + 1. Trees are the gentle introduction; Graphs I reuses the exact same loop plus a visited set.</p>`,
    aiEra: `<p><b>What AI changes:</b> the BFS skeleton is the most autocompleted loop in interview prep. Expect any assistant to write it perfectly; the variations (zigzag, right view, averages, min depth) are one-line changes it also handles.</p>
<p><b>Use AI as a partner:</b> <code>List 10 LeetCode tree problems that are really "level order + one change per level" and name the change for each.</code> Turning a family of problems into one template is the fastest way to prepare.</p>
<p><b>Where AI goes wrong:</b> using <code>q.size()</code> live in the for-loop condition instead of a snapshot (levels mix), offering null children into <code>ArrayDeque</code>, using <code>int</code> sums for averages, and claiming BFS is O(log N) space "for balanced trees" (it is O(N) — the bottom level is half the tree).</p>
<p><b>What you must still own:</b> explaining <b>why</b> the size snapshot isolates a level and choosing BFS vs DFS on memory grounds when the interviewer asks "what if the tree is very wide?"</p>`
  });
  /* ===================== TOPIC 5: Left / Right view ===================== */
  topics.push({
    title: 'Left View & Right View',
    analogy: `<p>Picture a <b>stadium</b> with rows of seats (rows = tree levels). Stand at the far <b>left</b> wall and look across: in every row you only see the <b>first person</b> sitting closest to you — everyone behind is hidden. Walk to the <b>right</b> wall and you see the <b>last person</b> of every row instead. A tree's left/right view is exactly that: <b>one node per level</b>, the first or the last.</p>`,
    explain: `<pre>
            1            ← level 0: only 1
          /   \\
         2     3         ← level 1: left sees 2, right sees 3
          \\     \\
           5     4       ← level 2: left sees 5, right sees 4
</pre>
<p>Left view = ${H.c('g', '[1, 2, 5]')}, Right view = ${H.c('p', '[1, 3, 4]')}. Notice: 5 is in the <b>right</b> subtree of 2 but it is still the leftmost node on its level, so the left view sees it. You can't just "keep going left".</p>
<p><b>Way 1 — BFS:</b> do level order with the <code>size</code> snapshot. In each level, the node at position <code>0</code> is the left view; the node at position <code>size − 1</code> is the right view.</p>
<p><b>Way 2 — DFS with depth:</b> walk preorder but visit <b>left before right</b> (for left view). Keep a list <code>ans</code>. The first time you reach a new depth (<code>depth == ans.size()</code>), that node is the first one ever seen on that level → add it. For the right view, simply visit <b>right before left</b>.</p>
${H.table(['visit (left-first)', 'depth', 'ans.size()', 'new depth?', 'ans'], [
  ['1', '0', '0', H.c('g', 'yes'), '[1]'],
  ['2', '1', '1', H.c('g', 'yes'), '[1, 2]'],
  ['5', '2', '2', H.c('g', 'yes'), '[1, 2, 5]'],
  ['3', '1', '3', H.c('r', 'no'), '[1, 2, 5]'],
  ['4', '2', '3', H.c('r', 'no'), '[1, 2, 5]']
])}`,
    clues: [
      '"<b>Right side view</b>" / "what you see standing on the right" → last node of each level.',
      '"<b>Left view</b>" / "first node of every level" → first node of each level.',
      '"one value <b>per level</b>" → BFS with size snapshot, or DFS with a <code>depth</code> parameter and <code>depth == ans.size()</code> check.',
      'Watch out: a deeper node from the <b>other</b> subtree can be visible (the "5 under 2" case) — never just follow one side.',
      'N up to 10<sup>4</sup>–10<sup>5</sup> → one traversal, O(N).'
    ],
    viz: {
      title: 'Left / Right view with BFS',
      input: '1 2 3 null 5 null 4 | left',
      inputLabel: 'tree slots | left or right',
      gen: function (input) {
        var sp = splitBar(input, 'left'), a = parseTreeStr(sp[0]), side = (sp[1] || 'left').toLowerCase();
        if (side !== 'left' && side !== 'right') throw new Error('After the | write left or right.');
        var F = [], q = [0], view = [], viewIdx = {}, done = {}, lvl = 0;
        function draw(narr, cur, tags) {
          var hl = {};
          for (var k in done) hl[k] = 'done';
          q.forEach(function (i) { hl[i] = 'win'; });
          for (var v in viewIdx) hl[v] = 'sel';
          if (cur !== undefined) hl[cur] = viewIdx[cur] ? 'sel' : 'cur';
          F.push({ narr: narr, parts: [
            { type: 'tree', label: side === 'left' ? 'Left view (purple = visible)' : 'Right view (purple = visible)', arr: a.slice(), hl: hl, tags: cpy(tags) },
            { type: 'queue', label: 'BFS queue', items: q.map(function (i) { return a[i]; }) },
            { type: 'array', label: side + ' view', values: view.slice(), hl: view.length ? o1(view.length - 1, 'sel') : {} },
            { type: 'vars', vals: { level: lvl, size: cur === undefined ? q.length : '-' } }] });
        }
        var tags = {};
        draw('We sweep the tree level by level. In each level the ' + (side === 'left' ? '<b>first</b>' : '<b>last</b>') + ' node taken from the queue is the one you would see from the ' + side + '.', undefined, tags);
        while (q.length) {
          var size = q.length;
          for (var s = 0; s < size; s++) {
            var n = q.shift();
            done[n] = 1;
            tags[n] = 'pos ' + s;
            if (ex(a, 2 * n + 1)) q.push(2 * n + 1);
            if (ex(a, 2 * n + 2)) q.push(2 * n + 2);
            var pick = side === 'left' ? s === 0 : s === size - 1;
            if (pick) { view.push(a[n]); viewIdx[n] = 1; }
            draw('Level ' + lvl + ', node ' + (s + 1) + ' of ' + size + ': <b>' + a[n] + '</b>. ' + (pick ? '<span class="c-p">It is the ' + (side === 'left' ? 'first' : 'last') + ' node on this level → visible from the ' + side + '!</span>' : 'It is hidden behind the ' + (side === 'left' ? 'first node of this level' : 'node that will come last on this level') + '.') + ' Its children go to the back of the queue.', n, tags);
          }
          lvl++;
        }
        F.push({ narr: side.charAt(0).toUpperCase() + side.slice(1) + ' view = <b>[' + view.join(', ') + ']</b> — exactly one node per level, ' + view.length + ' levels in total.', parts: [
          { type: 'tree', label: 'Visible nodes', arr: a.slice(), hl: (function () { var h = {}; for (var v in viewIdx) h[v] = 'sel'; return h; })() },
          { type: 'array', label: side + ' view', values: view.slice() }] });
        return F;
      }
    },
    problems: [{
      title: 'Left & Right Side View of a Binary Tree',
      level: 'Medium',
      tags: ['bfs', 'dfs', 'views'],
      statement: `<p>Given the <code>root</code> of a binary tree, imagine standing on its <b>right</b> side and return the values you can see, from top to bottom. Then do the same for the <b>left</b> side.</p>`,
      constraints: `0 ≤ number of nodes ≤ 100 (interview versions go up to 10<sup>5</sup>), −100 ≤ Node.val ≤ 100`,
      example: `<p>Input: <code>root = [1,2,3,null,5,null,4]</code></p>
<pre>
       1
     /   \\
    2     3
     \\     \\
      5     4
</pre><p>Right view: ${H.c('p', '[1, 3, 4]')} &nbsp; Left view: ${H.c('g', '[1, 2, 5]')}</p>
<p><b>Why:</b> level 1 is [2, 3]: last = ${H.c('p', '3')}, first = ${H.c('g', '2')}. Level 2 is [5, 4]: last = ${H.c('p', '4')}, first = ${H.c('g', '5')} — even though 5 hangs on the <i>right</i> of 2.</p>`,
      brute: {
        why: `<p>Brute: build every level as a full list (or, worse, for each depth d run a separate DFS to find the first/last node at depth d → O(N·h) = O(N<sup>2</sup>) for skewed trees). Storing all levels also wastes memory when you only need one value per level.</p>`,
        code: `
          List<Integer> rightViewBrute(TreeNode root) {
              List<Integer> res = new ArrayList<>();
              for (int d = 0; ; d++) {
                  List<Integer> row = new ArrayList<>();
                  collect(root, 0, d, row);       // full DFS for every depth
                  if (row.isEmpty()) break;
                  res.add(row.get(row.size() - 1));
              }
              return res;
          }
          void collect(TreeNode n, int depth, int target, List<Integer> row) {
              if (n == null) return;
              if (depth == target) { row.add(n.val); return; }
              collect(n.left, depth + 1, target, row);
              collect(n.right, depth + 1, target, row);
          }`
      },
      mcq: {
        q: 'Using DFS for the RIGHT view, which order should you visit children, and when do you record a node?',
        options: ['Left then right; record every leaf', 'Right then left; record when depth == ans.size()', 'Left then right; record when depth == ans.size()', 'Right then left; record the last node at each depth'],
        answer: 1,
        explain: 'Going right first means the first node you meet at every new depth is the rightmost one. depth == ans.size() is true exactly once per depth: the first arrival.'
      },
      hints: [
        `<p><b>Aha:</b> the view keeps <b>exactly one node per level</b> — the first (left view) or last (right view) node of that level in left-to-right order.</p>`,
        `<p>BFS: queue + <code>size</code> snapshot; record the node when <code>i == 0</code> (left) or <code>i == size - 1</code> (right). DFS alternative: pass <code>depth</code>; if <code>depth == ans.size()</code> add the node; recurse left-first for left view, right-first for right view.</p>`,
        `<p><b>Traps:</b> empty tree → empty list; do not "walk only the right edge" (the hidden-deeper-node case). <b>Recipe (right view, BFS):</b> q=[root]; while q: size; for i in 0..size-1: n=poll; if i==size-1 add n.val; offer kids.</p>`
      ],
      tests: { sig: 'TreeNode -> list<list<int>>', fn: 'judge', harness: {
        java: "class Check {\n    static List<List<Integer>> judge(TreeNode root) {\n        Solution s = new Solution();\n        return List.of(s.rightSideView(root), s.leftSideView(root));\n    }\n}",
        python: "def judge(root):\n    s = Solution()\n    return [s.right_side_view(root), s.left_side_view(root)]",
        js: "function judge(root) {\n  const s = new Solution();\n  return [s.rightSideView(root), s.leftSideView(root)];\n}",
        cpp: "vector<vector<int>> judge(TreeNode* root) {\n    Solution s;\n            return {s.rightSideView(root), s.leftSideView(root)};\n}"
      }, cases: [
        [[[1,2,3,null,5,null,4]],[[1,3,4],[1,2,5]]],
        [[[]],[[],[]]],
        [[[7]],[[7],[7]]],
        [[[1,2]],[[1,2],[1,2]]],
        [[[1,null,3]],[[1,3],[1,3]]],
        [[[1,2,3,4]],[[1,3,4],[1,2,4]]],
        [[[1,2,3,null,5,6,null,8]],[[1,3,6,8],[1,2,5,8]]],
        [[[-57,-86,11,-100,25,-50,53,null,-41,null,null,null,null,-98,null,99,null,null,null,null,23,null,-31]],[[-57,11,53,-98,99,23,-31],[-57,-86,-100,-41,99,23,-31]]],
        [[[84,null,22,-31,11,null,null,null,19,-79,null,-63,-20,null,null,-84,null,-66,null,58,62]],[[84,22,11,19,-79,-20,-84,-66,62],[84,22,-31,19,-79,-63,-84,-66,58]]],
        [[[0,1,null,2,null,3,null,4,null,5,null,6,null,7,null,8,null,9,null,10,null,11,null,12,null,13,null,14,null,15,null,16,null,17,null,18,null,19,null,20,null,21,null,22,null,23,null,24,null,25,null,26,null,27,null,28,null,29,null,30,null,31,null,32,null,33,null,34,null,35,null,36,null,37,null,38,null,39,null,40,null,41,null,42,null,43,null,44,null,45,null,46,null,47,null,48,null,49,null,50,null,51,null,52,null,53,null,54,null,55,null,56,null,57,null,58,null,59,null,60,null,61,null,62,null,63,null,64,null,65,null,66,null,67,null,68,null,69,null,70,null,71,null,72,null,73,null,74,null,75,null,76,null,77,null,78,null,79,null,80,null,81,null,82,null,83,null,84,null,85,null,86,null,87,null,88,null,89,null,90,null,91,null,92,null,93,null,94,null,95,null,96,null,97,null,98,null,99,null,0,null,1,null,2,null,3,null,4,null,5,null,6,null,7,null,8,null,9,null,10,null,11,null,12,null,13,null,14,null,15,null,16,null,17,null,18,null,19,null,20,null,21,null,22,null,23,null,24,null,25,null,26,null,27,null,28,null,29,null,30,null,31,null,32,null,33,null,34,null,35,null,36,null,37,null,38,null,39,null,40,null,41,null,42,null,43,null,44,null,45,null,46,null,47,null,48,null,49,null,50,null,51,null,52,null,53,null,54,null,55,null,56,null,57,null,58,null,59,null,60,null,61,null,62,null,63,null,64,null,65,null,66,null,67,null,68,null,69,null,70,null,71,null,72,null,73,null,74,null,75,null,76,null,77,null,78,null,79,null,80,null,81,null,82,null,83,null,84,null,85,null,86,null,87,null,88,null,89,null,90,null,91,null,92,null,93,null,94,null,95,null,96,null,97,null,98,null,99]],[[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99],[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99]]]
      ] },
      solution: {
        approach: `<p>BFS for the right view; DFS with depth for the left view (both shown).</p>`,
        code: `
          class Solution {
              // RIGHT VIEW with BFS: last node of each level
              public List<Integer> rightSideView(TreeNode root) {
                  List<Integer> ans = new ArrayList<>();
                  if (root == null) return ans;
                  Queue<TreeNode> q = new ArrayDeque<>();
                  q.offer(root);
                  while (!q.isEmpty()) {
                      int size = q.size();
                      for (int i = 0; i < size; i++) {
                          TreeNode n = q.poll();
                          if (i == size - 1) ans.add(n.val);   // last on this level -> visible
                          if (n.left != null) q.offer(n.left);
                          if (n.right != null) q.offer(n.right);
                      }
                  }
                  return ans;
              }

              // LEFT VIEW with DFS: first node reached at each new depth
              public List<Integer> leftSideView(TreeNode root) {
                  List<Integer> ans = new ArrayList<>();
                  dfs(root, 0, ans);
                  return ans;
              }
              private void dfs(TreeNode n, int depth, List<Integer> ans) {
                  if (n == null) return;
                  if (depth == ans.size()) ans.add(n.val); // first time at this depth
                  dfs(n.left, depth + 1, ans);             // left first -> leftmost wins
                  dfs(n.right, depth + 1, ans);            // (swap these two for right view)
              }
          }`,
        alt: [{ lang: 'python', code: `class Solution:
    # RIGHT VIEW with BFS: last node of each level
    def right_side_view(self, root):
        ans, level = [], [root] if root else []
        while level:
            ans.append(level[-1].val)
            level = [c for n in level for c in (n.left, n.right) if c]
        return ans

    # LEFT VIEW with DFS: first node reached at each new depth
    def left_side_view(self, root):
        ans, stack = [], [(root, 0)] if root else []
        while stack:                         # iterative preorder, left before right
            n, depth = stack.pop()
            if depth == len(ans):
                ans.append(n.val)            # first time at this depth
            if n.right:
                stack.append((n.right, depth + 1))
            if n.left:
                stack.append((n.left, depth + 1))   # pushed last -> popped first
        return ans
` }, { lang: 'js', code: `class Solution {
  // RIGHT VIEW with BFS: last node of each level
  rightSideView(root) {
    const ans = [];
    let level = root ? [root] : [];
    while (level.length) {
      ans.push(level[level.length - 1].val);
      level = level.flatMap((n) => [n.left, n.right].filter(Boolean));
    }
    return ans;
  }

  // LEFT VIEW with DFS: first node reached at each new depth
  leftSideView(root) {
    const ans = [];
    const dfs = (n, depth) => {
      if (!n) return;
      if (depth === ans.length) ans.push(n.val);   // first time at this depth
      dfs(n.left, depth + 1);                      // left first -> leftmost wins
      dfs(n.right, depth + 1);
    };
    dfs(root, 0);
    return ans;
  }
}
` }, { lang: 'cpp', code: `// LeetCode-style node (the judge normally provides it)
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(x), left(l), right(r) {}
};

class Solution {
public:
    // RIGHT VIEW with BFS: last node of each level
    vector<int> rightSideView(TreeNode* root) {
        vector<int> ans;
        if (!root) return ans;
        queue<TreeNode*> q;
        q.push(root);
        while (!q.empty()) {
            int size = q.size();
            for (int i = 0; i < size; i++) {
                TreeNode* n = q.front(); q.pop();
                if (i == size - 1) ans.push_back(n->val);   // last on this level
                if (n->left) q.push(n->left);
                if (n->right) q.push(n->right);
            }
        }
        return ans;
    }

    // LEFT VIEW with DFS: first node reached at each new depth
    vector<int> leftSideView(TreeNode* root) {
        vector<int> ans;
        dfs(root, 0, ans);
        return ans;
    }

private:
    void dfs(TreeNode* n, int depth, vector<int>& ans) {
        if (!n) return;
        if (depth == (int)ans.size()) ans.push_back(n->val);   // first time at this depth
        dfs(n->left, depth + 1, ans);                          // left first -> leftmost wins
        dfs(n->right, depth + 1, ans);
    }
};
` }],
        dry: {
          head: ['level', 'size', 'nodes in order', 'i == 0 (left)', 'i == size−1 (right)'],
          rows: [
            ['0', '1', '1', H.c('g', '1'), H.c('p', '1')],
            ['1', '2', '2, 3', H.c('g', '2'), H.c('p', '3')],
            ['2', '2', '5, 4', H.c('g', '5'), H.c('p', '4')],
            ['result', '—', '—', H.c('g', '[1, 2, 5]'), H.c('p', '[1, 3, 4]')]
          ]
        },
        complexity: `<p><b>Time O(N)</b>: every node visited once. <b>Space</b>: BFS queue O(W) (widest level); DFS recursion O(h) (height). Output is O(h) values.</p>`
      }
    }],
    examples: [
      {
        title: 'Skewed tree: both views are the whole tree',
        html: `<p>Tree <code>[1, null, 2, null, 3]</code> is a chain going right: 1 → 2 → 3. Every level has exactly one node, so it is both first and last on its level.</p>
<p>Left view = ${H.c('g', '[1, 2, 3]')}, right view = ${H.c('p', '[1, 2, 3]')}. A common wrong answer for the left view is <code>[1]</code> ("there is nothing on the left") — but the left view is about the <b>first node per level</b>, not about left children.</p>`
      },
      {
        title: 'A deep LEFT node shows up in the RIGHT view',
        html: `<pre>
         1
        / \\
       2   3
      /
     4
</pre>
<p>Right view = ${H.c('p', '[1, 3, 4]')}. Level 2 contains only ${H.c('y', '4')}, which hangs on the far left, yet nothing to its right hides it. Code that just walks <code>root.right.right…</code> returns [1, 3] and fails this test case — it is the #1 bug in this problem.</p>`
      },
      {
        title: 'DFS right view with the depth == size check',
        html: `<p>Visit right child first. The first node to arrive at each new depth is the rightmost on that level. For the tree above: visit 1 (depth 0, new) → 3 (depth 1, new) → back to 2 (depth 1, not new) → 4 (depth 2, new). Answer ${H.c('p', '[1, 3, 4]')}.</p>`,
        code: { lang: 'java', code: `
class RightView {
    List<Integer> rightSideView(TreeNode root) {
        List<Integer> ans = new ArrayList<>();
        dfs(root, 0, ans);
        return ans;
    }
    void dfs(TreeNode n, int depth, List<Integer> ans) {
        if (n == null) return;
        if (depth == ans.size()) ans.add(n.val);   // first visitor of this depth
        dfs(n.right, depth + 1, ans);              // right first -> rightmost arrives first
        dfs(n.left, depth + 1, ans);
    }
}`, alt: [{ lang: 'python', code: `def right_side_view(root):
    ans = []

    def dfs(n, depth):
        if n is None:
            return
        if depth == len(ans):
            ans.append(n.val)                # first visitor of this depth
        dfs(n.right, depth + 1)              # right first -> rightmost arrives first
        dfs(n.left, depth + 1)

    dfs(root, 0)
    return ans
` }, { lang: 'js', code: `function rightSideView(root) {
  const ans = [];
  const dfs = (n, depth) => {
    if (!n) return;
    if (depth === ans.length) ans.push(n.val);   // first visitor of this depth
    dfs(n.right, depth + 1);                     // right first -> rightmost arrives first
    dfs(n.left, depth + 1);
  };
  dfs(root, 0);
  return ans;
}
` }, { lang: 'cpp', code: `// TreeNode as defined in the first lesson
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int v = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(v), left(l), right(r) {}
};

class RightView {
public:
    vector<int> rightSideView(TreeNode* root) {
        vector<int> ans;
        dfs(root, 0, ans);
        return ans;
    }

private:
    void dfs(TreeNode* n, int depth, vector<int>& ans) {
        if (!n) return;
        if (depth == (int)ans.size()) ans.push_back(n->val);   // first visitor of this depth
        dfs(n->right, depth + 1, ans);                         // right first -> rightmost arrives first
        dfs(n->left, depth + 1, ans);
    }
};
` }] }
      }
    ],
    deepDive: `<p><b>Why does <code>depth == ans.size()</code> work?</b> <code>ans</code> holds exactly one value for each depth 0 … ans.size() − 1 already seen. DFS goes deeper one level at a time, so the first time it reaches a new depth d, ans.size() is exactly d. Any later node at depth d sees ans.size() &gt; d and is ignored. Because we visit the preferred side first, the first arrival is the leftmost (or rightmost) node at that depth — a short induction on the visiting order.</p>
<p><b>BFS or DFS?</b> Both are O(N) time. BFS space is the widest level (up to N/2); DFS space is the height. For a balanced tree with 10<sup>6</sup> nodes that is ~500,000 queue entries vs ~20 stack frames — DFS wins. For a 10<sup>5</sup>-long chain DFS risks stack overflow while BFS holds one node at a time.</p>
<p><b>Do not confuse with boundary traversal.</b> The "boundary" of a tree = left boundary (excluding leaves) + all leaves left to right + right boundary bottom-up. The left boundary follows left children (falling back to right only when there is no left), which is <b>not</b> the same as the left view.</p>
<p><b>Generalisations:</b> the same "first per group" idea gives top/bottom views (group = column instead of level), the leftmost value in the bottom row (BFS, remember the first value of the last level), and views of N-ary trees (just loop over children in order).</p>`,
    aiEra: `<p><b>What AI changes:</b> "right side view" is a well-known problem; an assistant will produce the BFS solution instantly. The value you add is testing it against the hidden-node case and choosing the version that fits the memory limits.</p>
<p><b>Use AI as a partner:</b> <code>Generate 5 binary trees where walking only the right edge gives the wrong right-side view.</code> These adversarial tests are the habit interviewers look for.</p>
<p><b>Where AI goes wrong:</b> explanations often say "the right view is the rightmost path", which is false; DFS versions sometimes recurse left first while claiming to compute the right view; and some generated answers return the view bottom-up.</p>
<p><b>What you must still own:</b> the one-sentence definition ("first/last node of every level") and the depth == size invariant — with those you can derive either version on a whiteboard.</p>`
  });
  /* ===================== TOPIC 6: Top / Bottom view ===================== */
  topics.push({
    title: 'Top View & Bottom View (Horizontal Distance + Map)',
    analogy: `<p>Imagine the tree is a set of <b>lamps hanging from a ceiling</b> at different heights, arranged in vertical <b>columns</b>. A <b>drone above</b> the room sees only the <b>highest lamp</b> in each column (top view). A person <b>lying on the floor</b> looking up sees only the <b>lowest lamp</b> in each column (bottom view). So we need two things: which <b>column</b> each node is in, and which one is highest/lowest in that column.</p>`,
    explain: `<p><b>Horizontal distance (hd)</b> = the column number. Root is column <code>0</code>. Going to a left child: <code>hd − 1</code>. Going right: <code>hd + 1</code>.</p>
<pre>
                1  (hd 0)
             /     \\
       (−1) 2       3 (+1)
           / \\     / \\
     (−2) 4   5   6   7 (+2)
            (0)   (0)
</pre>
<p>Column 0 holds <b>1, 5 and 6</b>. From the top you see ${H.c('g', '1')}; from the bottom you see the last one at the lowest level, ${H.c('p', '6')} (5 and 6 are on the same level; by convention the one that comes later in level order wins).</p>
<p><b>Recipe:</b> BFS with a queue of <code>(node, hd)</code> pairs plus a map from hd to value whose columns come out sorted left to right (<code>TreeMap</code> in Java, <code>std::map</code> in C++; in Python or JavaScript use a <code>dict</code> / <code>Map</code> and sort its keys at the end).</p>
<ul>
<li><b>Top view:</b> put <code>hd → value</code> <b>only if hd is not in the map yet</b> (first arrival = highest, because BFS reaches upper levels first).</li>
<li><b>Bottom view:</b> <b>always overwrite</b> <code>hd → value</code> (last arrival = lowest).</li>
</ul>
${H.table(['BFS order', 'hd', 'top map', 'bottom map'], [
  ['1', '0', H.c('g', 'put 0→1'), 'put 0→1'],
  ['2', '−1', H.c('g', 'put −1→2'), 'put −1→2'],
  ['3', '+1', H.c('g', 'put 1→3'), 'put 1→3'],
  ['4', '−2', H.c('g', 'put −2→4'), 'put −2→4'],
  ['5', '0', H.c('r', 'skip (has 1)'), H.c('y', 'overwrite 0→5')],
  ['6', '0', H.c('r', 'skip'), H.c('y', 'overwrite 0→6')],
  ['7', '+2', H.c('g', 'put 2→7'), 'put 2→7']
])}
<p>Top view = ${H.c('g', '[4, 2, 1, 3, 7]')}, bottom view = ${H.c('p', '[4, 2, 6, 3, 7]')}.</p>
<p><b>Why BFS and not plain DFS?</b> A DFS might reach a <b>deep</b> node in some column before a <b>shallow</b> one (e.g. a long left branch that swings back right). BFS visits shallow levels first, so "first seen = highest" is guaranteed. (DFS works too if you also store the depth and compare.)</p>`,
    clues: [
      '"<b>top view</b>" / "visible from above" → first node per hd in BFS order.',
      '"<b>bottom view</b>" / "visible from below" → last node per hd in BFS order (overwrite).',
      '"<b>vertical</b> order / columns / horizontal distance" → (node, hd) pairs + a map sorted by hd (<code>TreeMap</code> / <code>std::map</code>, or sort the keys at the end).',
      'Output "from leftmost column to rightmost" → sorted keys → an ordered map, or track <code>minHd</code> and shift into an array.',
      'Ties at the same level and column → the problem states the rule (usually: later in level order wins for bottom view).'
    ],
    viz: {
      title: 'Top / Bottom view: hd tags and a column map',
      input: '1 2 3 4 5 6 7 | top',
      inputLabel: 'tree slots | top or bottom',
      gen: function (input) {
        var sp = splitBar(input, 'top'), a = parseTreeStr(sp[0]), mode = (sp[1] || 'top').toLowerCase();
        if (mode !== 'top' && mode !== 'bottom') throw new Error('After the | write top or bottom.');
        var F = [], q = [[0, 0]], map = {}, mapSlot = {}, tags = {}, done = {};
        function entries() {
          return Object.keys(map).map(Number).sort(function (x, y) { return x - y; }).map(function (k) { return [k, map[k]]; });
        }
        function draw(narr, cur, mhl) {
          var hl = {};
          for (var k in done) hl[k] = 'done';
          q.forEach(function (p) { hl[p[0]] = 'win'; });
          for (var h in mapSlot) hl[mapSlot[h]] = 'sel';
          if (cur !== undefined) hl[cur] = 'cur';
          F.push({ narr: narr, parts: [
            { type: 'tree', label: 'Tree (tag = horizontal distance)', arr: a.slice(), hl: hl, tags: cpy(tags) },
            { type: 'queue', label: 'BFS queue of (node, hd)', items: q.map(function (p) { return a[p[0]] + ' (hd ' + p[1] + ')'; }) },
            { type: 'map', label: mode + ' view map: hd → value (sorted)', entries: entries(), hl: mhl || {} }] });
        }
        tags[0] = 'hd 0';
        draw('Root ' + a[0] + ' starts in column <b>hd = 0</b>. Left child = hd − 1, right child = hd + 1. We use BFS so higher levels are always seen before lower ones.', undefined);
        while (q.length) {
          var p = q.shift(), n = p[0], hd = p[1], L = 2 * n + 1, R = 2 * n + 2;
          done[n] = 1;
          if (ex(a, L)) { q.push([L, hd - 1]); tags[L] = 'hd ' + (hd - 1); }
          if (ex(a, R)) { q.push([R, hd + 1]); tags[R] = 'hd ' + (hd + 1); }
          var had = map.hasOwnProperty(hd), narr, mh = {};
          if (mode === 'top') {
            if (!had) { map[hd] = a[n]; mapSlot[hd] = n; mh[String(hd)] = 'ok'; narr = 'Take ' + a[n] + ' (hd ' + hd + '). Column ' + hd + ' is empty in the map, so <span class="c-g">' + a[n] + ' is the highest node there → put it</span>.'; }
            else { mh[String(hd)] = 'bad'; narr = 'Take ' + a[n] + ' (hd ' + hd + '). Column ' + hd + ' already has ' + map[hd] + ', which sits higher up → <span class="c-r">' + a[n] + ' is hidden from the top, skip</span>.'; }
          } else {
            var old = map[hd];
            map[hd] = a[n]; mapSlot[hd] = n; mh[String(hd)] = had ? 'cur' : 'ok';
            narr = 'Take ' + a[n] + ' (hd ' + hd + '). ' + (had ? 'Column ' + hd + ' had ' + old + ', but ' + a[n] + ' is <b>lower or later</b> → <span class="c-y">overwrite</span>; from below, ' + a[n] + ' blocks ' + old + '.' : 'Column ' + hd + ' is new → put ' + a[n] + '.');
          }
          draw(narr + ' Children join the queue with their hd.', n, mh);
        }
        var res = entries().map(function (e) { return e[1]; });
        F.push({ narr: 'Read the map from the smallest hd to the largest: ' + mode + ' view = <b>[' + res.join(', ') + ']</b>.', parts: [
          { type: 'tree', label: mode + ' view nodes', arr: a.slice(), hl: (function () { var h = {}; for (var k in mapSlot) h[mapSlot[k]] = 'sel'; return h; })(), tags: cpy(tags) },
          { type: 'map', label: 'final map', entries: entries() },
          { type: 'array', label: mode + ' view', values: res }] });
        return F;
      }
    },
    problems: [{
      title: 'Top View and Bottom View of a Binary Tree',
      level: 'Medium',
      tags: ['bfs', 'treemap', 'horizontal distance'],
      statement: `<p>Given the <code>root</code> of a binary tree, return its <b>top view</b> and its <b>bottom view</b>: for each vertical column from left to right, the node visible from above (topmost) and from below (bottommost). If two nodes share the same column and the same level, the one that comes <b>later in level order</b> is the bottom-view node.</p>`,
      constraints: `1 ≤ number of nodes ≤ 10<sup>5</sup>, 1 ≤ Node.val ≤ 10<sup>5</sup>`,
      example: `<p>Input slots: <code>[20, 8, 22, 5, 3, null, 25, null, null, 10, 14]</code></p>
<pre>
              20 (0)
            /    \\
        (−1) 8     22 (+1)
          /  \\       \\
    (−2) 5    3 (0)   25 (+2)
            /   \\
      (−1) 10    14 (+1)
</pre>
<p>Top view: ${H.c('g', '[5, 8, 20, 22, 25]')} &nbsp; Bottom view: ${H.c('p', '[5, 10, 3, 14, 25]')}</p>
<p><b>Why:</b> column 0 holds 20 (top) and ${H.c('p', '3')} (bottom). Column −1 holds 8 (top) and ${H.c('p', '10')} (lower). Column +1 holds 22 and ${H.c('p', '14')}.</p>`,
      brute: {
        why: `<p>Brute: DFS to list every node with its (hd, depth). Then for each column from min to max, scan the whole list to find the smallest / largest depth. That is O(N × number of columns) ≈ O(N<sup>2</sup>) for wide trees. The waste: re-scanning all N nodes for every column.</p>`,
        code: `
          List<Integer> topViewBrute(TreeNode root) {
              List<int[]> all = new ArrayList<>();    // {hd, depth, value}
              collect(root, 0, 0, all);
              int lo = Integer.MAX_VALUE, hi = Integer.MIN_VALUE;
              for (int[] e : all) { lo = Math.min(lo, e[0]); hi = Math.max(hi, e[0]); }
              List<Integer> res = new ArrayList<>();
              for (int hd = lo; hd <= hi; hd++) {     // one full scan per column
                  int bestDepth = Integer.MAX_VALUE, val = 0;
                  for (int[] e : all) if (e[0] == hd && e[1] < bestDepth) { bestDepth = e[1]; val = e[2]; }
                  res.add(val);
              }
              return res;
          }
          void collect(TreeNode n, int hd, int depth, List<int[]> all) {
              if (n == null) return;
              all.add(new int[]{hd, depth, n.val});
              collect(n.left, hd - 1, depth + 1, all);
              collect(n.right, hd + 1, depth + 1, all);
          }`
      },
      mcq: {
        q: 'For the TOP view with BFS, a node arrives at column hd = −1 but the map already has hd −1. What do you do?',
        options: ['Overwrite it — newer is better', 'Skip it — the earlier one is higher up and blocks it', 'Store both values', 'Restart BFS from that node'],
        answer: 1,
        explain: 'BFS reaches nodes level by level, so the node already stored for that column is on the same or a higher level. From above, the higher one hides the new one. (For the bottom view you would overwrite.)'
      },
      hints: [
        `<p><b>Aha:</b> give every node a column number: root 0, left = hd − 1, right = hd + 1. Top view = topmost node per column, bottom view = bottommost node per column.</p>`,
        `<p>BFS over (node, hd) pairs and a map hd → value (<code>TreeMap</code> / <code>std::map</code> keep it sorted; in Python or JavaScript sort the keys at the end). Top: write only if hd is new (<code>putIfAbsent</code> / <code>setdefault</code> / <code>try_emplace</code>). Bottom: always overwrite. Finally read the values in column order.</p>`,
        `<p><b>Traps:</b> plain DFS gives wrong answers for the top view (a deep node can arrive first) unless you also compare depths. hd can be negative — that is why we use a map, not an array index. <b>Recipe:</b> enqueue (root, 0); while queue: poll (n, hd); update map; enqueue (left, hd−1), (right, hd+1); return map values.</p>`
      ],
      tests: { sig: 'TreeNode -> list<list<int>>', fn: 'judge', harness: {
        java: "class Check {\n    static List<List<Integer>> judge(TreeNode root) {\n        Solution s = new Solution();\n        return List.of(s.topView(root), s.bottomView(root));\n    }\n}",
        python: "def judge(root):\n    s = Solution()\n    return [s.top_view(root), s.bottom_view(root)]",
        js: "function judge(root) {\n  const s = new Solution();\n  return [s.topView(root), s.bottomView(root)];\n}",
        cpp: "vector<vector<int>> judge(TreeNode* root) {\n    Solution s;\n            return {s.topView(root), s.bottomView(root)};\n}"
      }, cases: [
        [[[20,8,22,5,3,null,25,null,null,10,14]],[[5,8,20,22,25],[5,10,3,14,25]]],
        [[[1]],[[1],[1]]],
        [[[1,2,3]],[[2,1,3],[2,1,3]]],
        [[[1,2,3,null,4,5]],[[2,1,3],[2,5,3]]],
        [[[1,2,null,3,null,4]],[[4,3,2,1],[4,3,2,1]]],
        [[[1,2,3,4,5,6,7]],[[4,2,1,3,7],[4,2,6,3,7]]],
        [[[1,2,3,null,4,null,null,null,5,null,6]],[[2,1,3,6],[2,4,5,6]]],
        [[[39,50,32,43,26,36,49,null,91,null,null,5,null,38,null,47,null,18,null,null,null,null,null,null,28]],[[43,50,39,32,49],[18,28,36,38,49]]],
        [[[1,null,25,null,95,52,75,81,88,null,77,24,null,null,null,null,76,85,null,null,98,32]],[[32,85,24,1,25,95,75,77,76,98],[32,85,24,81,52,88,75,77,76,98]]]
      ] },
      solution: {
        approach: `<p>BFS with (node, hd) and an ordered column map: keep the first value for the top view, overwrite for the bottom view.</p>`,
        code: `
          class Solution {
              public List<Integer> topView(TreeNode root) { return view(root, true); }
              public List<Integer> bottomView(TreeNode root) { return view(root, false); }

              private List<Integer> view(TreeNode root, boolean top) {
                  List<Integer> res = new ArrayList<>();
                  if (root == null) return res;
                  TreeMap<Integer, Integer> col = new TreeMap<>();   // hd -> visible value, sorted by hd
                  Queue<TreeNode> nodes = new ArrayDeque<>();
                  Queue<Integer> hds = new ArrayDeque<>();           // hd of the node at the same position
                  nodes.offer(root); hds.offer(0);
                  while (!nodes.isEmpty()) {
                      TreeNode n = nodes.poll();
                      int hd = hds.poll();
                      if (top) col.putIfAbsent(hd, n.val);  // first (highest) one stays
                      else col.put(hd, n.val);              // last (lowest) one wins
                      if (n.left != null)  { nodes.offer(n.left);  hds.offer(hd - 1); }
                      if (n.right != null) { nodes.offer(n.right); hds.offer(hd + 1); }
                  }
                  res.addAll(col.values());                 // leftmost column first
                  return res;
              }
          }`,
        alt: [{ lang: 'python', code: `from collections import deque

class Solution:
    def top_view(self, root):
        return self._view(root, top=True)

    def bottom_view(self, root):
        return self._view(root, top=False)

    def _view(self, root, top):
        if root is None:
            return []
        col = {}                             # hd -> visible value
        q = deque([(root, 0)])
        while q:                             # BFS: higher rows come first
            n, hd = q.popleft()
            if not top or hd not in col:
                col[hd] = n.val              # top keeps the first, bottom the last
            if n.left:
                q.append((n.left, hd - 1))
            if n.right:
                q.append((n.right, hd + 1))
        return [col[hd] for hd in sorted(col)]
` }, { lang: 'js', code: `class Solution {
  topView(root) { return this.view(root, true); }
  bottomView(root) { return this.view(root, false); }

  view(root, top) {
    if (!root) return [];
    const col = new Map();                  // hd -> visible value
    const q = [[root, 0]];
    for (let i = 0; i < q.length; i++) {    // BFS with a read index instead of shift()
      const [n, hd] = q[i];
      if (!top || !col.has(hd)) col.set(hd, n.val);   // top keeps the first, bottom the last
      if (n.left) q.push([n.left, hd - 1]);
      if (n.right) q.push([n.right, hd + 1]);
    }
    return [...col.keys()].sort((a, b) => a - b).map((hd) => col.get(hd));
  }
}
` }, { lang: 'cpp', code: `// LeetCode-style node (the judge normally provides it)
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(x), left(l), right(r) {}
};

class Solution {
public:
    vector<int> topView(TreeNode* root) { return view(root, true); }
    vector<int> bottomView(TreeNode* root) { return view(root, false); }

private:
    vector<int> view(TreeNode* root, bool top) {
        vector<int> res;
        if (!root) return res;
        map<int, int> col;                          // hd -> visible value, sorted by hd
        queue<pair<TreeNode*, int>> q;
        q.push({root, 0});
        while (!q.empty()) {
            auto [n, hd] = q.front(); q.pop();
            if (top) col.try_emplace(hd, n->val);   // first (highest) one stays
            else col[hd] = n->val;                  // last (lowest) one wins
            if (n->left) q.push({n->left, hd - 1});
            if (n->right) q.push({n->right, hd + 1});
        }
        for (auto& [hd, v] : col) res.push_back(v);  // leftmost column first
        return res;
    }
};
` }],
        dry: {
          head: ['BFS node', 'hd', 'top map (first one stays)', 'bottom map (put)'],
          rows: [
            ['20', '0', H.c('g', '0→20'), '0→20'],
            ['8', '−1', H.c('g', '−1→8'), '−1→8'],
            ['22', '+1', H.c('g', '1→22'), '1→22'],
            ['5', '−2', H.c('g', '−2→5'), '−2→5'],
            ['3', '0', H.c('r', 'skip (20 stays)'), H.c('y', '0→3')],
            ['25', '+2', H.c('g', '2→25'), '2→25'],
            ['10', '−1', H.c('r', 'skip (8 stays)'), H.c('y', '−1→10')],
            ['14', '+1', H.c('r', 'skip (22 stays)'), H.c('y', '1→14')],
            ['result', '', H.c('p', '[5, 8, 20, 22, 25]'), H.c('p', '[5, 10, 3, 14, 25]')]
          ]
        },
        complexity: `<p><b>Time O(N log N)</b>: each of the N nodes does one ordered-map operation costing O(log C) where C = number of columns (≤ N). Using a hash map plus tracking min/max hd brings it to O(N). <b>Space O(N)</b> for the queues and the map.</p>`
      }
    }],
    after: `<p><b>Related:</b> <i>Vertical Order Traversal</i> uses the same (node, hd) idea but keeps <b>all</b> nodes of each column (sorted by level, then value) instead of just the top or bottom one.</p>`,
    examples: [
      {
        title: 'Perfect tree 1..7: top vs bottom',
        html: `<p>Columns: 4 (−2), 2 (−1), {1, 5, 6} (0), 3 (+1), 7 (+2).</p>
${H.table(['hd', 'nodes (top → bottom)', 'top view', 'bottom view'], [
  ['−2', '4', '4', '4'],
  ['−1', '2', '2', '2'],
  ['0', '1, then 5 and 6 (same level)', H.c('g', '1'), H.c('p', '6') + ' (later in level order)'],
  ['+1', '3', '3', '3'],
  ['+2', '7', '7', '7']
])}
<p>Top = ${H.c('g', '[4, 2, 1, 3, 7]')}, bottom = ${H.c('p', '[4, 2, 6, 3, 7]')}. Only column 0 differs.</p>`
      },
      {
        title: 'Why a plain DFS gets the top view WRONG',
        html: `<pre>
          1 (0)
         /  \\
    (−1) 2    3 (+1)
          \\
           4 (0)
            \\
             5 (+1)
</pre>
<p>Preorder DFS visits 1, 2, 4, ${H.c('r', '5')}, 3. Node 5 (depth 3) reaches column +1 <b>before</b> node 3 (depth 1). With "first one stays" the DFS answer is [2, 1, ${H.c('r', '5')}] — wrong. BFS visits by level (1, 2, 3, 4, 5) so column +1 gets ${H.c('g', '3')} first: correct top view ${H.c('g', '[2, 1, 3]')}. Try it in the visualizer with <code>1 2 3 null 4 null null null null null 5 | top</code>.</p>`
      },
      {
        title: 'Vertical order traversal — keep the whole column',
        html: `<p>Instead of one node per column, keep a list per column (BFS order gives top-to-bottom). For the perfect tree 1..7: ${H.c('g', '[[4], [2], [1, 5, 6], [3], [7]]')}. LeetCode 987 adds a tie rule (same row and column → sort by value), which needs (row, col, value) triples and a sort.</p>`,
        code: { lang: 'java', code: `
List<List<Integer>> verticalOrder(TreeNode root) {
    List<List<Integer>> res = new ArrayList<>();
    if (root == null) return res;
    Map<Integer, List<Integer>> cols = new HashMap<>();
    Queue<TreeNode> nodes = new ArrayDeque<>();
    Queue<Integer> hds = new ArrayDeque<>();
    nodes.offer(root); hds.offer(0);
    int minHd = 0, maxHd = 0;                      // track range -> no TreeMap needed
    while (!nodes.isEmpty()) {
        TreeNode n = nodes.poll();
        int hd = hds.poll();
        cols.computeIfAbsent(hd, k -> new ArrayList<>()).add(n.val);
        minHd = Math.min(minHd, hd);
        maxHd = Math.max(maxHd, hd);
        if (n.left != null)  { nodes.offer(n.left);  hds.offer(hd - 1); }
        if (n.right != null) { nodes.offer(n.right); hds.offer(hd + 1); }
    }
    for (int hd = minHd; hd <= maxHd; hd++) res.add(cols.get(hd));   // every hd in range exists
    return res;
}`, alt: [{ lang: 'python', code: `from collections import defaultdict, deque

def vertical_order(root):
    if root is None:
        return []
    cols = defaultdict(list)                 # hd -> values, top to bottom
    q = deque([(root, 0)])
    while q:
        n, hd = q.popleft()
        cols[hd].append(n.val)
        if n.left:
            q.append((n.left, hd - 1))
        if n.right:
            q.append((n.right, hd + 1))
    # every hd between min and max exists, so a range walk is enough (no sorting)
    return [cols[hd] for hd in range(min(cols), max(cols) + 1)]
` }, { lang: 'js', code: `function verticalOrder(root) {
  if (!root) return [];
  const cols = new Map();                    // hd -> values, top to bottom
  const q = [[root, 0]];
  let minHd = 0, maxHd = 0;                  // track the range -> no sorting needed
  for (let i = 0; i < q.length; i++) {       // read index instead of shift()
    const [n, hd] = q[i];
    if (!cols.has(hd)) cols.set(hd, []);
    cols.get(hd).push(n.val);
    minHd = Math.min(minHd, hd);
    maxHd = Math.max(maxHd, hd);
    if (n.left) q.push([n.left, hd - 1]);
    if (n.right) q.push([n.right, hd + 1]);
  }
  const res = [];
  for (let hd = minHd; hd <= maxHd; hd++) res.push(cols.get(hd));   // every hd in range exists
  return res;
}
` }, { lang: 'cpp', code: `// TreeNode as defined in the first lesson
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int v = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(v), left(l), right(r) {}
};

vector<vector<int>> verticalOrder(TreeNode* root) {
    vector<vector<int>> res;
    if (!root) return res;
    unordered_map<int, vector<int>> cols;    // hd -> values, top to bottom
    queue<pair<TreeNode*, int>> q;
    q.push({root, 0});
    int minHd = 0, maxHd = 0;                // track the range -> no ordered map needed
    while (!q.empty()) {
        auto [n, hd] = q.front(); q.pop();
        cols[hd].push_back(n->val);
        minHd = min(minHd, hd);
        maxHd = max(maxHd, hd);
        if (n->left) q.push({n->left, hd - 1});
        if (n->right) q.push({n->right, hd + 1});
    }
    for (int hd = minHd; hd <= maxHd; hd++) res.push_back(move(cols[hd]));   // every hd in range exists
    return res;
}
` }] }
      }
    ],
    deepDive: `<p><b>Every column between min and max is non-empty.</b> Moving from a parent to a child changes hd by exactly 1, so the set of columns used is a contiguous range [minHd, maxHd]. That is why the code above can loop from minHd to maxHd without null checks, and why you can replace the map by an array of size 2N + 1 with offset N (hd + N is always in [0, 2N]). Result: O(N) instead of O(N log N).</p>
<p><b>The range is at most [−h, +h]</b>: you cannot be further sideways than you are deep. A skewed-left chain uses columns 0, −1, −2, …</p>
<p><b>DFS can work</b> if you store <code>(depth, value)</code> per column and replace only when the new depth is smaller (top) or larger-or-equal (bottom). But "equal depth" ties then depend on DFS order, which may differ from the level-order rule the problem states. BFS gives the expected tie behaviour for free.</p>
<p><b>Ties in the bottom view:</b> GeeksforGeeks' version says "if two nodes share column and level, take the later one in level order" — BFS + <code>put</code> does that. LeetCode 987 (vertical order) instead sorts ties by value. Always ask which rule applies.</p>
<p><b>Real world:</b> this is a projection — the same idea as computing a skyline or which buildings are visible from the air, and as z-buffering in graphics (keep the nearest object per pixel).</p>`,
    aiEra: `<p><b>What AI changes:</b> top/bottom views are classic GfG problems, so assistants produce working BFS + ordered-map code immediately. Your edge is knowing the subtle DFS failure and the O(N) array optimisation.</p>
<p><b>Use AI as a partner:</b> <code>Write a brute-force top view that sorts (hd, depth, value) triples, then generate 200 random trees and compare it with my BFS version.</code> Differential testing against a slow-but-obvious version is the best way to trust generated code.</p>
<p><b>Where AI goes wrong:</b> recursive DFS solutions for the top view that pass simple tests but fail the "deep node reaches a column first" case, inconsistent tie rules in the bottom view, and array offsets that are too small (using N/2 instead of N).</p>
<p><b>What you must still own:</b> explaining <b>why</b> BFS order guarantees "first = highest", and asking the tie-breaking question before coding.</p>`
  });
  /* ===================== TOPIC 7: Height & Diameter ===================== */
  topics.push({
    title: 'Height & Diameter (Bottom-Up Recursion)',
    analogy: `<p><b>Height:</b> a manager wants to know "how many layers of people are under me, including me?" She can't see everyone, so she asks each direct report the same question, takes the <b>bigger</b> answer and adds <b>1</b> for herself. Answers flow <b>up</b> from the interns.</p>
<p><b>Diameter:</b> the longest <b>phone chain</b> between any two people in the company, where messages can only travel along manager-report lines. That chain goes up from one person to some "bend" manager and back down to another person. At every manager, the longest chain bending there = (depth of the left team) + (depth of the right team).</p>`,
    explain: `<p><b>Height</b> (counting nodes): <code>height(null) = 0</code>, <code>height(node) = 1 + max(height(left), height(right))</code>. This is <b>postorder</b>: children first, then the parent combines.</p>
<p><b>Diameter</b> = number of <b>edges</b> on the longest path between any two nodes. The path has a highest point (the "bend"). If the bend is node X, the path goes down X's left side as far as possible and down X's right side as far as possible, so its length is <code>height(X.left) + height(X.right)</code> edges.</p>
<pre>
            1
           /
          2          ← bend here: left height 2 + right height 2 = 4
         / \\
        4   5
       /     \\
      8       9        diameter = 4  (8-4-2-5-9), does NOT pass the root!
</pre>
${H.table(['node (postorder)', 'left h', 'right h', 'height = 1+max', 'path through = lh+rh', 'best'], [
  ['8', '0', '0', '1', '0', '0'],
  ['4', '1', '0', '2', '1', '1'],
  ['9', '0', '0', '1', '0', '1'],
  ['5', '0', '1', '2', '1', '1'],
  ['2', '2', '2', '3', H.c('g', '4'), H.c('g', '4')],
  ['1', '3', '0', '4', '3', H.c('p', '4')]
])}
<p><b>The big trick:</b> one function <b>returns</b> the height (what the parent needs) and, as a side effect, <b>updates a global best</b> with <code>lh + rh</code> (what the question asks). Computing height separately for each node would repeat work and cost O(N<sup>2</sup>).</p>`,
    clues: [
      '"<b>maximum depth</b>" / "<b>height</b>" → <code>1 + max(left, right)</code>, postorder.',
      '"<b>longest path between any two nodes</b>" / "<b>diameter</b>" / "may or may not pass through the root" → return height, track <code>max(lh + rh)</code> globally.',
      '"Count <b>edges</b>" vs "count <b>nodes</b>" — read carefully: diameter in nodes = edges + 1.',
      'If your first idea calls <code>height()</code> inside another recursion → O(N<sup>2</sup>); fold both into one bottom-up pass.',
      'Same pattern solves "maximum path <b>sum</b>", "longest univalue path", "balanced check".'
    ],
    viz: {
      title: 'Bottom-up heights and the best diameter',
      input: '1 2 null 4 5 null null 8 null null 9',
      inputLabel: 'Tree slots (level order, null = empty)',
      gen: function (input) {
        var a = parseTreeStr(input), F = [], h = {}, tags = {}, best = 0, bestAt = -1, done = {}, cs = [];
        function draw(narr, cur, cls) {
          var hl = {};
          for (var k in done) hl[k] = 'done';
          if (bestAt >= 0) hl[bestAt] = 'sel';
          if (cur !== undefined) hl[cur] = cls || 'cur';
          F.push({ narr: narr, parts: [
            { type: 'tree', label: 'Tags: h = height returned to the parent', arr: a.slice(), hl: hl, tags: cpy(tags) },
            { type: 'stack', label: 'Call stack (top = running now)', items: cs.map(function (k) { return 'f(' + a[k] + ')'; }), hl: cs.length ? o1(cs.length - 1, 'cur') : {} },
            { type: 'vars', label: 'global answer', vals: { diameter: best, bendAt: bestAt >= 0 ? a[bestAt] : '-' }, hl: { diameter: 'ok' } }] });
        }
        draw('We go <b>postorder</b>: a node can only answer after both children have answered. Empty children report height 0.');
        (function go(i) {
          if (!ex(a, i)) return 0;
          cs.push(i);
          var lh = go(2 * i + 1), rh = go(2 * i + 2);
          var me = 1 + Math.max(lh, rh), through = lh + rh, improved = through > best;
          h[i] = me; tags[i] = 'h=' + me; done[i] = 1;
          if (improved) { best = through; bestAt = i; }
          draw('Node <b>' + a[i] + '</b>: left says ' + lh + ', right says ' + rh + '. Height = 1 + max(' + lh + ', ' + rh + ') = <b>' + me + '</b> (sent up to the parent). Longest path bending here = ' + lh + ' + ' + rh + ' = ' + through + ' edges' + (improved ? ' → <span class="c-g">new best diameter!</span>' : ' (best stays ' + best + ').'), i, improved ? 'ok' : 'cur');
          cs.pop();
          return me;
        })(0);
        draw('Done. Height of the tree = <b>' + h[0] + '</b> (root\'s answer). Diameter = <b>' + best + '</b> edges, bending at node ' + a[bestAt] + (bestAt === 0 ? ' (the root).' : ' — not the root, which is why we track a global best instead of only looking at the root.'), bestAt, 'sel');
        return F;
      }
    },
    problems: [{
      title: 'Height (Max Depth) & Diameter of a Binary Tree',
      level: 'Easy',
      tags: ['postorder', 'recursion'],
      statement: `<p>Given the <code>root</code> of a binary tree, return (a) its <b>maximum depth</b> — the number of nodes on the longest root-to-leaf path — and (b) its <b>diameter</b> — the number of <b>edges</b> on the longest path between any two nodes (the path may or may not pass through the root).</p>`,
      constraints: `1 ≤ number of nodes ≤ 10<sup>4</sup>, −100 ≤ Node.val ≤ 100`,
      example: `<p>Input: <code>root = [1,2,3,4,5]</code></p>
<pre>
        1
       / \\
      2   3
     / \\
    4   5
</pre><p>Max depth = ${H.c('g', '3')} (1 → 2 → 4). Diameter = ${H.c('p', '3')}: the path ${H.c('p', '4 → 2 → 1 → 3')} has 3 edges (so does 5 → 2 → 1 → 3).</p>`,
      brute: {
        why: `<p>Brute: diameter(node) = max( height(left) + height(right), diameter(left), diameter(right) ), calling a separate <code>height()</code> each time. Each height call walks a whole subtree, and we call it at every node → O(N<sup>2</sup>) on a skewed tree. The wasted work: the same subtree heights are recomputed again and again by every ancestor.</p>`,
        code: `
          int height(TreeNode n) {
              if (n == null) return 0;
              return 1 + Math.max(height(n.left), height(n.right));
          }
          int diameterBrute(TreeNode n) {
              if (n == null) return 0;
              int through = height(n.left) + height(n.right);  // recomputed for every node
              return Math.max(through, Math.max(diameterBrute(n.left), diameterBrute(n.right)));
          }`
      },
      mcq: {
        q: 'At node X the left subtree has height 3 and the right subtree has height 2. What is the longest path (in edges) whose highest point is X?',
        options: ['3', '4', '5', '6'],
        answer: 2,
        explain: 'Go down the left side 3 edges and down the right side 2 edges: 3 + 2 = 5 edges. (With height counted in nodes, height h below X means h edges from X to the deepest node.)'
      },
      hints: [
        `<p><b>Aha:</b> every path has a highest node (the bend). If the bend is X, the best path there is <code>height(X.left) + height(X.right)</code> edges. So the diameter is the maximum of that over all X.</p>`,
        `<p>Write one recursive <code>int height(TreeNode n)</code> that returns <code>1 + max(lh, rh)</code> and, before returning, updates a field <code>best = max(best, lh + rh)</code>. No extra data structure needed.</p>`,
        `<p><b>Traps:</b> diameter counts <b>edges</b> (not nodes); reset <code>best = 0</code> before each call; a single node has diameter 0. <b>Recipe:</b> height(null)=0; lh=height(left); rh=height(right); best=max(best,lh+rh); return 1+max(lh,rh). Max depth = height(root); diameter = best.</p>`
      ],
      tests: { sig: 'TreeNode int -> int[]', fn: 'judge', harness: {
        java: "class Check {\n    // n > 0: right-leaning chain of n nodes, n < 0: left-leaning; node i (0 = root) holds val(i).\n    // Built here because a tree this deep is too big to write out as a test literal.\n    static TreeNode chain(int n, java.util.function.IntUnaryOperator val) {\n        TreeNode root = null;\n        for (int i = Math.abs(n) - 1; i >= 0; i--) {\n            TreeNode t = new TreeNode(val.applyAsInt(i));\n            if (n > 0) t.right = root; else t.left = root;\n            root = t;\n        }\n        return root;\n    }\n\n    static int[] judge(TreeNode root, int n) {\n        if (n != 0) root = chain(n, i -> 1);\n        Solution s = new Solution();\n        return new int[]{s.maxDepth(root), s.diameterOfBinaryTree(root)};\n    }\n}",
        python: "# n > 0: right-leaning chain of n nodes, n < 0: left-leaning; node i (0 = root) holds val(i).\ndef _chain(n, val):\n    root = None\n    for i in range(abs(n) - 1, -1, -1):\n        t = TreeNode(val(i))\n        if n > 0:\n            t.right = root\n        else:\n            t.left = root\n        root = t\n    return root\n\ndef judge(root, n):\n    if n:\n        root = _chain(n, lambda i: 1)\n    s = Solution()\n    return [s.max_depth(root), s.diameter_of_binary_tree(root)]",
        js: "// n > 0: right-leaning chain of n nodes, n < 0: left-leaning; node i (0 = root) holds val(i).\nfunction chain__(n, val) {\n  let root = null;\n  for (let i = Math.abs(n) - 1; i >= 0; i--) {\n    const t = new TreeNode(val(i));\n    if (n > 0) t.right = root; else t.left = root;\n    root = t;\n  }\n  return root;\n}\n\nfunction judge(root, n) {\n  if (n) root = chain__(n, (i) => 1);\n  const s = new Solution();\n  return [s.maxDepth(root), s.diameterOfBinaryTree(root)];\n}",
        cpp: "// n > 0: right-leaning chain of n nodes, n < 0: left-leaning; node i (0 = root) holds val(i).\nTreeNode* chain__(int n, function<int(int)> val) {\n    TreeNode* root = nullptr;\n    for (int i = abs(n) - 1; i >= 0; i--) {\n        TreeNode* t = new TreeNode(val(i));\n        if (n > 0) t->right = root; else t->left = root;\n        root = t;\n    }\n    return root;\n}\n\nvector<int> judge(TreeNode* root, int n) {\n    if (n) root = chain__(n, [](int i) { return 1; });\n    Solution s;\n            return {s.maxDepth(root), s.diameterOfBinaryTree(root)};\n}"
      }, cases: [
        [[[1,2,3,4,5],0],[3,3]],
        [[[1],0],[1,0]],
        [[[1,2],0],[2,1]],
        [[[1,null,2,null,3],0],[3,2]],
        [[[1,2,null,3,4,5,null,null,6,7,null,null,8],0],[5,6]],
        [[[3,9,20,null,null,15,7],0],[3,3]],
        [[[12,-12,95,86,null,-100,null,null,-17,-9,null,null,-67,null,null,null,-11,47,null,-59,47,null,null,null,27,null,-13,null,-89],0],[11,13]],
        [[[26,-35,41,null,null,-7,-99,-20,null,10,null,null,null,-41,38,-2,null,-85,null,69,-61,null,null,-36,-14],0],[8,8]],
        [[[1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1],0],[400,399]],
        [[[],10000],[10000,9999]],
        [[[],-10000],[10000,9999]]
      ] },
      solution: {
        approach: `<p>One postorder pass returns heights upward and records the best "left height + right height" on the way. The code runs that postorder with a loop instead of recursion: it lists the nodes parents-first with a stack, then walks the list backwards, so every child is finished before its parent. A skewed tree of 10<sup>4</sup> nodes would otherwise need 10<sup>4</sup> nested calls, which can overflow the call stack.</p>`,
        code: `
          class Solution {
              public int maxDepth(TreeNode root) {
                  if (root == null) return 0;
                  Queue<TreeNode> q = new ArrayDeque<>();
                  q.offer(root);
                  int depth = 0;
                  while (!q.isEmpty()) {                       // one loop turn per level
                      depth++;
                      for (int i = q.size(); i > 0; i--) {
                          TreeNode n = q.poll();
                          if (n.left != null) q.offer(n.left);
                          if (n.right != null) q.offer(n.right);
                      }
                  }
                  return depth;
              }

              public int diameterOfBinaryTree(TreeNode root) {
                  List<TreeNode> order = new ArrayList<>();    // parents before children
                  Deque<TreeNode> st = new ArrayDeque<>();
                  st.push(root);
                  while (!st.isEmpty()) {
                      TreeNode n = st.pop();
                      order.add(n);
                      if (n.left != null) st.push(n.left);
                      if (n.right != null) st.push(n.right);
                  }
                  Map<TreeNode, Integer> height = new HashMap<>();   // height in nodes
                  int best = 0;                                // longest path (in edges) found so far
                  for (int i = order.size() - 1; i >= 0; i--) {      // backwards: children first (postorder)
                      TreeNode n = order.get(i);
                      int lh = height.getOrDefault(n.left, 0);
                      int rh = height.getOrDefault(n.right, 0);
                      best = Math.max(best, lh + rh);          // longest path that bends at n
                      height.put(n, 1 + Math.max(lh, rh));     // what my parent needs
                  }
                  return best;
              }
          }`,
        alt: [{ lang: 'python', code: `class Solution:
    def max_depth(self, root):
        depth, level = 0, [root] if root else []
        while level:                         # count levels with BFS (no recursion limit)
            depth += 1
            level = [c for n in level for c in (n.left, n.right) if c]
        return depth

    def diameter_of_binary_tree(self, root):
        # postorder without recursion: reversed (me, right, left) order = children before parents
        order, stack = [], [root] if root else []
        while stack:
            n = stack.pop()
            order.append(n)
            stack.extend(c for c in (n.left, n.right) if c)
        height, best = {None: 0}, 0          # height in nodes; None = empty spot
        for n in reversed(order):
            lh, rh = height[n.left], height[n.right]
            best = max(best, lh + rh)        # longest path that bends at n
            height[n] = 1 + max(lh, rh)
        return best
` }, { lang: 'js', code: `class Solution {
  // BFS level count: no recursion, so a 10^4-deep tree is fine
  maxDepth(root) {
    let depth = 0, level = root ? [root] : [];
    while (level.length) {
      depth++;
      level = level.flatMap((n) => [n.left, n.right].filter(Boolean));
    }
    return depth;
  }

  diameterOfBinaryTree(root) {
    // postorder without recursion: reversed (me, right, left) order = children before parents
    const order = [], stack = root ? [root] : [];
    while (stack.length) {
      const n = stack.pop();
      order.push(n);
      if (n.left) stack.push(n.left);
      if (n.right) stack.push(n.right);
    }
    const height = new Map();                   // node -> height in nodes
    const h = (n) => (n ? height.get(n) : 0);
    let best = 0;
    for (let i = order.length - 1; i >= 0; i--) {
      const n = order[i], lh = h(n.left), rh = h(n.right);
      best = Math.max(best, lh + rh);           // longest path that bends at n
      height.set(n, 1 + Math.max(lh, rh));
    }
    return best;
  }
}
` }, { lang: 'cpp', code: `// LeetCode-style node (the judge normally provides it)
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(x), left(l), right(r) {}
};

class Solution {
public:
    int maxDepth(TreeNode* root) {
        if (!root) return 0;
        return 1 + max(maxDepth(root->left), maxDepth(root->right));
    }

    int diameterOfBinaryTree(TreeNode* root) {
        int best = 0;
        height(root, best);
        return best;
    }

private:
    // Returns the height in nodes; updates best (passed by reference).
    int height(TreeNode* n, int& best) {
        if (!n) return 0;
        int lh = height(n->left, best), rh = height(n->right, best);
        best = max(best, lh + rh);           // longest path that bends at n
        return 1 + max(lh, rh);
    }
};
` }],
        dry: {
          head: ['node (postorder)', 'lh', 'rh', 'lh + rh', 'best', 'returns'],
          rows: [
            ['4', '0', '0', '0', '0', '1'],
            ['5', '0', '0', '0', '0', '1'],
            ['2', '1', '1', '2', H.c('g', '2'), '2'],
            ['3', '0', '0', '0', '2', '1'],
            ['1', '2', '1', '3', H.c('p', '3'), H.c('g', '3 = max depth')]
          ]
        },
        complexity: `<p><b>Time O(N)</b>: each node is visited exactly once and does O(1) work. <b>Space O(N)</b> for the node list and the height map. The recursive form needs O(h) call stack instead: log N if balanced, but N on a skewed tree, which is what overflows.</p>`
      }
    }],
    examples: [
      {
        title: 'Edges or nodes? The same tree, two answers',
        html: `<p>Tree: 1 → 2 → 3 (a chain of 3 nodes).</p>
${H.table(['Convention', 'empty', 'leaf', 'this tree', 'used by'], [
  ['count <b>nodes</b>', '0', '1', H.c('g', '3'), 'LeetCode "maximum depth", this module'],
  ['count <b>edges</b>', '−1', '0', H.c('p', '2'), 'CLRS / many textbooks, AVL papers']
])}
<p>Diameter is almost always in <b>edges</b> (here 2). If a problem asks for nodes on the longest path, it is edges + 1. Say your convention out loud before coding.</p>`
      },
      {
        title: 'The diameter avoids the root',
        html: `<pre>
        1
       /
      2
     / \\
    3   4
   /     \\
  5       6
</pre>
<p>Through the root: height(left) + height(right) = 3 + 0 = 3. But at node 2: 2 + 2 = ${H.c('g', '4')} (path 5-3-2-4-6). A solution that only checks the root returns 3 — wrong. That is why we update a <b>global best at every node</b>.</p>`
      },
      {
        title: 'Same skeleton, new question: maximum path sum',
        html: `<p>Replace "height" by "best downward sum" and "lh + rh" by "node + left gain + right gain". Negative branches are dropped with <code>max(0, …)</code>. For the tree <code>[-10, 9, 20, null, null, 15, 7]</code>: at 20 the path 15 → 20 → 7 sums to ${H.c('g', '42')}, the answer.</p>`,
        code: { lang: 'java', code: `
class MaxPathSum {
    int best = Integer.MIN_VALUE;
    int maxPathSum(TreeNode root) { gain(root); return best; }
    // best sum of a path that starts at n and goes DOWN (what the parent can use)
    int gain(TreeNode n) {
        if (n == null) return 0;
        int l = Math.max(0, gain(n.left));     // ignore a branch that would lower the sum
        int r = Math.max(0, gain(n.right));
        best = Math.max(best, n.val + l + r);  // path that bends at n
        return n.val + Math.max(l, r);         // parent may continue only one side
    }
}`, alt: [{ lang: 'python', code: `def max_path_sum(root):
    best = float('-inf')

    # best sum of a path that starts at n and goes DOWN (what the parent can use)
    def gain(n):
        nonlocal best
        if n is None:
            return 0
        l = max(0, gain(n.left))             # ignore a branch that would lower the sum
        r = max(0, gain(n.right))
        best = max(best, n.val + l + r)      # path that bends at n
        return n.val + max(l, r)             # parent may continue only one side

    gain(root)
    return best
` }, { lang: 'js', code: `function maxPathSum(root) {
  let best = -Infinity;
  // best sum of a path that starts at n and goes DOWN (what the parent can use)
  const gain = (n) => {
    if (!n) return 0;
    const l = Math.max(0, gain(n.left));     // ignore a branch that would lower the sum
    const r = Math.max(0, gain(n.right));
    best = Math.max(best, n.val + l + r);    // path that bends at n
    return n.val + Math.max(l, r);           // parent may continue only one side
  };
  gain(root);
  return best;
}
` }, { lang: 'cpp', code: `// TreeNode as defined in the first lesson
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int v = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(v), left(l), right(r) {}
};

class MaxPathSum {
    int best = INT_MIN;

    // best sum of a path that starts at n and goes DOWN (what the parent can use)
    int gain(TreeNode* n) {
        if (!n) return 0;
        int l = max(0, gain(n->left));       // ignore a branch that would lower the sum
        int r = max(0, gain(n->right));
        best = max(best, n->val + l + r);    // path that bends at n
        return n->val + max(l, r);           // parent may continue only one side
    }

public:
    int maxPathSum(TreeNode* root) { gain(root); return best; }
};
` }] }
      }
    ],
    deepDive: `<p><b>Why the one-pass version is O(N):</b> each node is visited once and does O(1) work after its children return. The brute version calls <code>height()</code> (O(size of subtree)) at every node; the sum of subtree sizes equals the sum of depths, which is Θ(N log N) for a balanced tree and Θ(N<sup>2</sup>) for a chain.</p>
<p><b>"Return one thing, record another"</b> is the most reusable tree pattern: the return value is what the <b>parent</b> can extend (a downward path, so only one side), while the global records the answer that may <b>bend</b> at this node (both sides). Diameter, max path sum, longest univalue path, longest zig-zag path, and "binary tree cameras" are all this shape. If you dislike fields, return a small array <code>int[]{height, best}</code> or a record.</p>
<p><b>N-ary trees:</b> keep the two largest child heights (top1, top2); the bend through the node is top1 + top2. <b>General trees given as edges</b> (Graphs): the diameter is found by BFS from any node to the farthest node A, then BFS from A to the farthest node B; dist(A, B) is the diameter. That two-BFS trick only works on trees (no cycles).</p>
<p><b>Height iteratively:</b> BFS and count levels — no recursion depth issues. For a 10<sup>5</sup>-node chain, recursive height may overflow the stack; BFS will not.</p>
<p><b>Overflow:</b> path sums of 3·10<sup>4</sup> nodes with values up to 1000 fit in an <code>int</code>, but always check: N × max|value| must stay below 2.1·10<sup>9</sup>, else use <code>long</code>.</p>`,
    aiEra: `<p><b>What AI changes:</b> height and diameter are among the most-memorised snippets; an assistant writes them flawlessly. Interviews now push on the <b>pattern</b>: "solve max path sum / longest univalue path using the same idea".</p>
<p><b>Use AI as a partner:</b> <code>Give me 5 problems that use "return downward value, update global with both sides" and only show the recurrence for each.</code> Then write the code yourself.</p>
<p><b>Where AI goes wrong:</b> mixing edge and node conventions (returning diameter + 1), initialising <code>best = 0</code> for max path sum (wrong when every value is negative — start at the smallest value: <code>Integer.MIN_VALUE</code>, <code>-inf</code>, <code>-Infinity</code> or <code>INT_MIN</code>), and returning <code>val + l + r</code> to the parent (a path cannot fork).</p>
<p><b>What you must still own:</b> the reason the parent may only take one side, and the O(N) vs O(N<sup>2</sup>) argument.</p>`
  });
  /* ===================== TOPIC 8: Balanced tree ===================== */
  topics.push({
    title: 'Balanced Tree Check (Height-Balanced)',
    analogy: `<p>Think of a <b>mobile toy hanging over a baby's cot</b>: at every hook, the two sides must hang at nearly the same depth, otherwise it tilts. Or a <b>see-saw</b> at every joint: a difference of one level is fine, two or more and it crashes. A tree is <b>height-balanced</b> if <b>every single node</b> passes this see-saw test, not just the root.</p>`,
    explain: `<p><b>Rule:</b> for <b>every</b> node, <code>|height(left) − height(right)| ≤ 1</code>.</p>
<pre>
          1             at 1: left height 3, right height 1 → difference 2 ✗
         / \\
        2   2           at 2 (left): 2 vs 1 → fine
       / \\
      3   3
     / \\
    4   4
</pre>
<p><b>Slow way:</b> at each node call <code>height()</code> on both sides, then recurse into the children. Heights get recomputed many times → O(N<sup>2</sup>) on a skewed tree.</p>
<p><b>Fast way (one bottom-up pass):</b> make <code>check(node)</code> return the height if the subtree is balanced, or a special signal <code>−1</code> meaning "already broken". Each node:</p>
<ol>
<li>Ask left. If it says −1, return −1 immediately (no need to look further).</li>
<li>Ask right. Same.</li>
<li>If <code>|lh − rh| &gt; 1</code> → return −1.</li>
<li>Else return <code>1 + max(lh, rh)</code>.</li>
</ol>
${H.table(['node', 'lh', 'rh', '|lh−rh|', 'returns'], [
  ['4, 4 (leaves)', '0', '0', '0', '1'],
  ['3 (with kids)', '1', '1', '0', '2'],
  ['3 (leaf)', '0', '0', '0', '1'],
  ['2 (left)', '2', '1', '1', '3'],
  ['2 (right)', '0', '0', '0', '1'],
  ['1 (root)', '3', '1', H.c('r', '2'), H.c('r', '−1 → NOT balanced')]
])}`,
    clues: [
      '"<b>height-balanced</b>" / "depth of the two subtrees of <b>every</b> node never differs by more than 1" → bottom-up height with −1 sentinel.',
      '"Is it an <b>AVL</b>-like tree?" → same balance rule (AVL also needs the BST order).',
      'Any "check a property at every node that depends on child heights/sizes" → return a value + use a sentinel for failure.',
      'If you see <code>height()</code> being called inside a recursive check → O(N<sup>2</sup>) warning sign; fold into one pass.',
      '"Convert sorted array / list to a <b>height-balanced</b> BST" or "balance a BST" → build from the middle element; the balance rule is what the output must satisfy.'
    ],
    viz: {
      title: 'Balanced check: heights flow up, −1 means broken',
      input: '1 2 2 3 3 null null 4 4',
      inputLabel: 'Tree slots (level order, null = empty)',
      gen: function (input) {
        var a = parseTreeStr(input), F = [], tags = {}, hl = {}, broken = false, cs = [];
        function draw(narr, cur, cls) {
          var h = cpy(hl);
          if (cur !== undefined) h[cur] = cls || 'cur';
          F.push({ narr: narr, parts: [
            { type: 'tree', label: 'Tag = value returned (height, or −1 = unbalanced)', arr: a.slice(), hl: h, tags: cpy(tags) },
            { type: 'stack', label: 'Call stack (top = running now)', items: cs.map(function (k) { return 'f(' + a[k] + ')'; }), hl: cs.length ? o1(cs.length - 1, 'cur') : {} },
            { type: 'vars', vals: { balancedSoFar: broken ? 'NO' : 'yes' }, hl: { balancedSoFar: broken ? 'bad' : 'ok' } }] });
        }
        draw('Postorder walk. Each node returns its height if its subtree is balanced, or <b>−1</b> as an alarm if something below is broken.');
        function go(i) {
          if (!ex(a, i)) return 0;
          cs.push(i);
          var r = body(i);
          cs.pop();
          return r;
        }
        var res = go(0);
        function body(i) {
          var lh = go(2 * i + 1);
          if (lh === -1) { tags[i] = '-1'; hl[i] = 'bad'; draw('Node ' + a[i] + ': its left side already sent the alarm −1, so ' + a[i] + ' passes −1 straight up without even looking right.', i, 'bad'); return -1; }
          var rh = go(2 * i + 2);
          if (rh === -1) { tags[i] = '-1'; hl[i] = 'bad'; draw('Node ' + a[i] + ': its right side sent −1, so pass −1 up.', i, 'bad'); return -1; }
          var d = Math.abs(lh - rh);
          if (d > 1) {
            broken = true; tags[i] = '-1'; hl[i] = 'bad';
            draw('Node <b>' + a[i] + '</b>: left height ' + lh + ', right height ' + rh + ', difference <b>' + d + ' &gt; 1</b> → <span class="c-r">this see-saw tips over! Return −1.</span>', i, 'bad');
            return -1;
          }
          var me = 1 + Math.max(lh, rh);
          tags[i] = 'h=' + me; hl[i] = 'ok';
          draw('Node ' + a[i] + ': left ' + lh + ', right ' + rh + ', difference ' + d + ' ≤ 1 → fine. Return height 1 + max = <b>' + me + '</b>.', i, 'ok');
          return me;
        }
        draw(res === -1 ? 'The root returned −1 → the tree is <b>NOT</b> height-balanced.' : 'The root returned height ' + res + ' (not −1) → the tree <b>IS</b> height-balanced: every node passed the see-saw test.', 0, res === -1 ? 'bad' : 'sel');
        return F;
      }
    },
    problems: [{
      title: 'Balanced Binary Tree',
      level: 'Easy',
      tags: ['postorder', 'height'],
      statement: `<p>Given a binary tree, return <code>true</code> if it is <b>height-balanced</b>: for every node, the heights of its left and right subtrees differ by at most 1.</p>`,
      constraints: `0 ≤ number of nodes ≤ 5000, −10<sup>4</sup> ≤ Node.val ≤ 10<sup>4</sup>`,
      example: `<p>Input: <code>root = [1,2,2,3,3,null,null,4,4]</code> → Output: ${H.c('r', 'false')}</p>
<p><b>Why:</b> at the root, the left subtree (2 → 3 → 4) has height ${H.c('y', '3')} but the right subtree (just 2) has height ${H.c('y', '1')}. 3 − 1 = 2 &gt; 1.</p>
<p>Input: <code>root = [3,9,20,null,null,15,7]</code> → Output: ${H.c('g', 'true')} (heights 1 vs 2 at the root, and all lower nodes are fine).</p>`,
      brute: {
        why: `<p>Top-down: at each node compute <code>height(left)</code> and <code>height(right)</code> from scratch, compare, then recurse into both children. Every node's height gets recomputed by each of its ancestors → O(N<sup>2</sup>) for a skewed tree (5000<sup>2</sup> = 2.5·10<sup>7</sup>, OK here, but not for 10<sup>5</sup>).</p>`,
        code: `
          int height(TreeNode n) {
              return n == null ? 0 : 1 + Math.max(height(n.left), height(n.right));
          }
          boolean isBalancedBrute(TreeNode n) {
              if (n == null) return true;
              if (Math.abs(height(n.left) - height(n.right)) > 1) return false;
              return isBalancedBrute(n.left) && isBalancedBrute(n.right);  // heights recomputed below
          }`
      },
      mcq: {
        q: 'A tree where the ROOT\'s two subtrees have equal height. Is it guaranteed to be balanced?',
        options: ['Yes, the root decides everything', 'No, some lower node might still have a difference of 2 or more', 'Yes, if it has an odd number of nodes', 'Only if it is a BST'],
        answer: 1,
        explain: 'Balance must hold at EVERY node. Example: root with two long single-child chains of equal length — the root is fine, but each chain node has heights like 2 vs 0.'
      },
      hints: [
        `<p><b>Aha:</b> a node's balance check needs exactly the two child <b>heights</b> — which a postorder pass computes anyway. So check balance <b>while</b> computing height.</p>`,
        `<p>No extra data structure. Return an <code>int</code>: the height when balanced, or <code>−1</code> as a "broken" signal. Check for −1 right after each child call so you stop early.</p>`,
        `<p><b>Traps:</b> empty tree is balanced (return 0, not −1); the −1 must be passed up even if the current node itself looks fine. <b>Recipe:</b> check(null)=0; lh=check(left), if −1 return −1; rh=check(right), if −1 return −1; if |lh−rh|&gt;1 return −1; return 1+max. Answer = check(root) != −1.</p>`
      ],
      tests: { sig: 'TreeNode int -> bool', fn: 'judge', harness: {
        java: "class Check {\n    // n > 0: right-leaning chain of n nodes, n < 0: left-leaning; node i (0 = root) holds val(i).\n    // Built here because a tree this deep is too big to write out as a test literal.\n    static TreeNode chain(int n, java.util.function.IntUnaryOperator val) {\n        TreeNode root = null;\n        for (int i = Math.abs(n) - 1; i >= 0; i--) {\n            TreeNode t = new TreeNode(val.applyAsInt(i));\n            if (n > 0) t.right = root; else t.left = root;\n            root = t;\n        }\n        return root;\n    }\n\n    static boolean judge(TreeNode root, int n) {\n        if (n != 0) root = chain(n, i -> 0);\n        return new Solution().isBalanced(root);\n    }\n}",
        python: "# n > 0: right-leaning chain of n nodes, n < 0: left-leaning; node i (0 = root) holds val(i).\ndef _chain(n, val):\n    root = None\n    for i in range(abs(n) - 1, -1, -1):\n        t = TreeNode(val(i))\n        if n > 0:\n            t.right = root\n        else:\n            t.left = root\n        root = t\n    return root\n\ndef judge(root, n):\n    if n:\n        root = _chain(n, lambda i: 0)\n    return Solution().is_balanced(root)",
        js: "// n > 0: right-leaning chain of n nodes, n < 0: left-leaning; node i (0 = root) holds val(i).\nfunction chain__(n, val) {\n  let root = null;\n  for (let i = Math.abs(n) - 1; i >= 0; i--) {\n    const t = new TreeNode(val(i));\n    if (n > 0) t.right = root; else t.left = root;\n    root = t;\n  }\n  return root;\n}\n\nfunction judge(root, n) {\n  if (n) root = chain__(n, (i) => 0);\n  return isBalanced(root);\n}",
        cpp: "// n > 0: right-leaning chain of n nodes, n < 0: left-leaning; node i (0 = root) holds val(i).\nTreeNode* chain__(int n, function<int(int)> val) {\n    TreeNode* root = nullptr;\n    for (int i = abs(n) - 1; i >= 0; i--) {\n        TreeNode* t = new TreeNode(val(i));\n        if (n > 0) t->right = root; else t->left = root;\n        root = t;\n    }\n    return root;\n}\n\nbool judge(TreeNode* root, int n) {\n    if (n) root = chain__(n, [](int i) { return 0; });\n    return Solution().isBalanced(root);\n}"
      }, cases: [
        [[[1,2,2,3,3,null,null,4,4],0],false],
        [[[3,9,20,null,null,15,7],0],true],
        [[[],0],true],
        [[[1],0],true],
        [[[1,2],0],true],
        [[[1,null,2,null,3],0],false],
        [[[1,2,2,3,null,null,3,4,null,null,4],0],false],
        [[[1,2,3,4,5,6,null,8],0],true],
        [[[4,2,6,1,3,5,7],0],true],
        [[[0,1,3,4,2,null,5,null,7,null,null,8,6,null,9],0],false],
        [[[],-5000],false],
        [[[],5000],false]
      ] },
      solution: {
        approach: `<p>Bottom-up height with a −1 sentinel meaning "unbalanced somewhere below".</p>`,
        code: `
          class Solution {
              public boolean isBalanced(TreeNode root) {
                  return check(root) != -1;
              }

              // Returns height if balanced, otherwise -1.
              private int check(TreeNode n) {
                  if (n == null) return 0;             // empty tree: height 0, balanced
                  int lh = check(n.left);
                  if (lh == -1) return -1;             // left side broken -> stop early
                  int rh = check(n.right);
                  if (rh == -1) return -1;             // right side broken
                  if (Math.abs(lh - rh) > 1) return -1; // I am the broken one
                  return 1 + Math.max(lh, rh);         // balanced: report my height
              }
          }`,
        alt: [{ lang: 'python', code: `class Solution:
    def is_balanced(self, root):
        # children before parents: reverse a (me, right, left) walk instead of recursing
        order, stack = [], [root] if root else []
        while stack:
            n = stack.pop()
            order.append(n)
            stack.extend(c for c in (n.left, n.right) if c)
        height = {None: 0}
        for n in reversed(order):
            lh, rh = height[n.left], height[n.right]
            if abs(lh - rh) > 1:
                return False                 # I am the broken one
            height[n] = 1 + max(lh, rh)
        return True
` }, { lang: 'js', code: `function isBalanced(root) {
  // height if balanced, otherwise -1
  const check = (n) => {
    if (!n) return 0;
    const lh = check(n.left);
    if (lh < 0) return -1;
    const rh = check(n.right);
    if (rh < 0 || Math.abs(lh - rh) > 1) return -1;
    return 1 + Math.max(lh, rh);
  };
  return check(root) >= 0;
}
` }, { lang: 'cpp', code: `// LeetCode-style node (the judge normally provides it)
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(x), left(l), right(r) {}
};

class Solution {
public:
    bool isBalanced(TreeNode* root) { return check(root) != -1; }

private:
    // Returns height if balanced, otherwise -1.
    int check(TreeNode* n) {
        if (!n) return 0;
        int lh = check(n->left);
        if (lh == -1) return -1;
        int rh = check(n->right);
        if (rh == -1 || abs(lh - rh) > 1) return -1;
        return 1 + max(lh, rh);
    }
};
` }],
        dry: {
          head: ['call (postorder)', 'lh', 'rh', '|lh − rh|', 'returns'],
          rows: [
            ['4 (left leaf)', '0', '0', '0', '1'],
            ['4 (right leaf)', '0', '0', '0', '1'],
            ['3 (parent of the 4s)', '1', '1', '0', '2'],
            ['3 (leaf)', '0', '0', '0', '1'],
            ['2 (left child of root)', '2', '1', '1', '3'],
            ['2 (right child of root)', '0', '0', '0', '1'],
            ['1 (root)', '3', '1', H.c('r', '2'), H.c('r', '−1 → false')]
          ]
        },
        complexity: `<p><b>Time O(N)</b>: each node is visited once (and we may stop even earlier). <b>Space O(h)</b> recursion stack.</p>`
      }
    }],
    examples: [
      {
        title: 'Balanced: [3, 9, 20, null, null, 15, 7]',
        html: `${H.table(['node', 'lh', 'rh', 'diff', 'returns'], [
  ['9', '0', '0', '0', '1'],
  ['15', '0', '0', '0', '1'],
  ['7', '0', '0', '0', '1'],
  ['20', '1', '1', '0', '2'],
  ['3', '1', '2', '1', H.c('g', '3 → balanced')]
])}<p>A difference of exactly 1 is allowed.</p>`
      },
      {
        title: 'The root looks perfect, the tree is still NOT balanced',
        html: `<pre>
          1
         / \\
        2   2
       /     \\
      3       3
     /         \\
    4           4
</pre>
<p>At the root: left height 3, right height 3 → difference 0. But at the left ${H.c('r', '2')}: left height 2, right height 0 → difference ${H.c('r', '2')}. Answer: ${H.c('r', 'false')}. Checking only the root is the classic mistake. Try it: <code>1 2 2 3 null null 3 4 null null null null null null 4</code>.</p>`
      },
      {
        title: 'How short can an AVL-balanced tree be? (Fibonacci-like)',
        html: `<p>Let N(h) be the fewest nodes in a height-balanced tree of height h. The sparsest one has one child of height h − 1 and the other of height h − 2:</p>
<p><code>N(h) = N(h − 1) + N(h − 2) + 1</code>, with N(1) = 1, N(2) = 2.</p>
${H.arr([1, 2, 4, 7, 12, 20, 33, 54], { label: 'N(h) for h = 1..8' })}
<p>These grow like Fibonacci numbers (≈ 1.618<sup>h</sup>), so h ≤ about 1.44 · log₂N. That is the proof that "balanced" trees really have O(log N) height.</p>`
      }
    ],
    deepDive: `<p><b>Different meanings of "balanced":</b></p>
<ul>
<li><b>Height-balanced (AVL rule)</b>: at every node the heights differ by ≤ 1 → height ≤ 1.44 log₂N. AVL trees keep this after every insert/delete using rotations.</li>
<li><b>Red-black trees</b>: looser — the longest root-to-leaf path is at most twice the shortest → height ≤ 2 log₂(N + 1). Fewer rotations on updates, so they are used by Java's <code>TreeMap</code>/<code>TreeSet</code>, C++ <code>std::map</code> and the Linux kernel scheduler.</li>
<li><b>Weight-balanced</b>: compares subtree <b>sizes</b> instead of heights.</li>
<li><b>B-trees</b>: all leaves at exactly the same depth, with many keys per node — what databases and file systems use.</li>
</ul>
<p><b>Why the −1 sentinel is safe:</b> real heights are ≥ 0, so −1 can never be confused with a valid answer. It also gives <b>early exit</b>: once any subtree is broken, every ancestor returns immediately after one comparison. In languages with nullable types you could return <code>Optional</code>/<code>null</code>; but a sentinel int is the fastest in every language.</p>
<p><b>Rebalancing intuition:</b> when an insert makes a node's difference 2, a <b>rotation</b> (a constant number of pointer swaps) lifts the heavy child up and pushes the node down, restoring the rule while keeping BST order. You don't need to code AVL rotations in most interviews, but you should know they exist and cost O(1) each, O(log N) per insert overall.</p>
<p><b>"Make it balanced" follow-up</b> (LeetCode 1382): do an inorder walk to get a sorted list, then rebuild by always picking the middle element as the root — O(N) time, perfectly balanced.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI writes the O(N) check instantly. What interviewers now probe is <b>your understanding</b>: why balance gives O(log N), and how real libraries keep trees balanced.</p>
<p><b>Use AI as a partner:</b> <code>Explain a left-right AVL rotation using a 3-node example and draw before/after</code>, then redraw it from memory. Or ask for random trees and compare the brute O(N<sup>2</sup>) check with your O(N) version on 1,000 cases.</p>
<p><b>Where AI goes wrong:</b> returning <code>false</code> from inside a height function (mixing types), forgetting to propagate the −1 from a child, checking only at the root, or claiming that "balanced" means "complete".</p>
<p><b>What you must still own:</b> the definition (every node, not just the root), the sentinel trick, and being able to say which balanced trees power library ordered maps (<code>TreeMap</code>, <code>std::map</code>) and databases.</p>`
  });
  /* ===================== TOPIC 9: LCA ===================== */
  topics.push({
    title: 'Lowest Common Ancestor (LCA) in a Binary Tree and in a BST',
    analogy: `<p>Two cousins want to know their <b>closest shared ancestor</b> in the family tree. Each cousin traces their parents, grandparents… upward. The <b>first</b> person who appears in both family lines is the LCA. In an <b>org chart</b>: for two employees, the LCA is the <b>lowest-level manager</b> who has both of them in their team — the person you escalate to when the two disagree.</p>`,
    explain: `<p><b>LCA(p, q)</b> = the deepest node that has both p and q in its subtree. A node counts as its own ancestor, so if q is under p, then LCA = p.</p>
<pre>
              3
           /     \\
          5       1
         / \\     / \\
        6   2   0   8
           / \\
          7   4
</pre>
<p>LCA(6, 4) = ${H.c('p', '5')}. LCA(5, 1) = ${H.c('p', '3')}. LCA(5, 4) = ${H.c('p', '5')} (4 is under 5).</p>
<h4>In a plain binary tree (no ordering): ask both sides</h4>
<p>Each call <code>lca(node)</code> answers: "Did you find p or q (or their LCA) in your subtree?"</p>
<ul>
<li>If <code>node</code> is null → return null (found nothing).</li>
<li>If <code>node</code> is p or q → return node (found one; anything below doesn't matter — if the other is below, this node is the LCA anyway).</li>
<li>Ask left and right. If <b>both</b> return something → p and q are on different sides → <b>this node is the split point = LCA</b>.</li>
<li>If only one side returns something → pass that up.</li>
</ul>
<h4>In a BST: just follow the signs</h4>
<p>Because left &lt; node &lt; right, compare values while walking down from the root:</p>
<ul>
<li>both p and q <b>smaller</b> than node → LCA is on the <b>left</b>, go left;</li>
<li>both <b>bigger</b> → go <b>right</b>;</li>
<li>otherwise they split here (or one equals node) → <b>node is the LCA</b>.</li>
</ul>
${H.table(['BST walk for p = 3, q = 5', 'compare', 'move'], [
  ['at 6', '3 &lt; 6 and 5 &lt; 6', 'go left'],
  ['at 2', '3 &gt; 2 and 5 &gt; 2', 'go right'],
  ['at 4', '3 &lt; 4 &lt; 5 → split', H.c('p', 'answer 4')]
])}
<p>The BST version touches only one root-to-node path → <b>O(h)</b> time and O(1) extra space when written as a loop.</p>`,
    clues: [
      '"<b>lowest common ancestor</b>", "<b>closest shared parent</b>", "first meeting point going up" → LCA.',
      'Tree is a <b>BST</b> → use value comparisons, walk one path, O(h).',
      'Plain binary tree, no parent pointers → recursive "return what you found" postorder, O(N).',
      '"<b>distance between two nodes</b>" → depth(p) + depth(q) − 2·depth(LCA).',
      'Nodes have <b>parent pointers</b> → it becomes "intersection of two linked lists" (walk up both).'
    ],
    code: [{ lang: 'java', code: `
class LCA {
    // Plain binary tree: O(N) time, O(h) stack
    static TreeNode lcaBinaryTree(TreeNode node, TreeNode p, TreeNode q) {
        if (node == null || node == p || node == q) return node; // nothing, or found one
        TreeNode left = lcaBinaryTree(node.left, p, q);
        TreeNode right = lcaBinaryTree(node.right, p, q);
        if (left != null && right != null) return node;  // p and q on different sides
        return left != null ? left : right;               // pass up whatever was found
    }

    // BST: O(h) time, O(1) space
    static TreeNode lcaBST(TreeNode root, TreeNode p, TreeNode q) {
        TreeNode cur = root;
        while (cur != null) {
            if (p.val < cur.val && q.val < cur.val) cur = cur.left;        // both smaller
            else if (p.val > cur.val && q.val > cur.val) cur = cur.right;  // both bigger
            else return cur;                                               // split point
        }
        return null;
    }
}`, alt: [{ lang: 'python', code: `# Plain binary tree: O(N) time, O(h) stack
def lca_binary_tree(node, p, q):
    if node is None or node is p or node is q:
        return node                          # nothing, or found one
    left = lca_binary_tree(node.left, p, q)
    right = lca_binary_tree(node.right, p, q)
    if left and right:
        return node                          # p and q on different sides
    return left or right                     # pass up whatever was found

# BST: O(h) time, O(1) space
def lca_bst(root, p, q):
    cur = root
    while cur:
        if p.val < cur.val and q.val < cur.val:
            cur = cur.left                   # both smaller
        elif p.val > cur.val and q.val > cur.val:
            cur = cur.right                  # both bigger
        else:
            return cur                       # split point
    return None
` }, { lang: 'js', code: `// Plain binary tree: O(N) time, O(h) stack
function lcaBinaryTree(node, p, q) {
  if (!node || node === p || node === q) return node;   // nothing, or found one
  const left = lcaBinaryTree(node.left, p, q);
  const right = lcaBinaryTree(node.right, p, q);
  if (left && right) return node;                       // p and q on different sides
  return left || right;                                 // pass up whatever was found
}

// BST: O(h) time, O(1) space
function lcaBST(root, p, q) {
  let cur = root;
  while (cur) {
    if (p.val < cur.val && q.val < cur.val) cur = cur.left;          // both smaller
    else if (p.val > cur.val && q.val > cur.val) cur = cur.right;    // both bigger
    else return cur;                                                 // split point
  }
  return null;
}
` }, { lang: 'cpp', code: `// TreeNode as defined in the first lesson
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int v = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(v), left(l), right(r) {}
};

// Plain binary tree: O(N) time, O(h) stack
TreeNode* lcaBinaryTree(TreeNode* node, TreeNode* p, TreeNode* q) {
    if (!node || node == p || node == q) return node;   // nothing, or found one
    TreeNode* left = lcaBinaryTree(node->left, p, q);
    TreeNode* right = lcaBinaryTree(node->right, p, q);
    if (left && right) return node;                     // p and q on different sides
    return left ? left : right;                         // pass up whatever was found
}

// BST: O(h) time, O(1) space
TreeNode* lcaBST(TreeNode* root, TreeNode* p, TreeNode* q) {
    TreeNode* cur = root;
    while (cur) {
        if (p->val < cur->val && q->val < cur->val) cur = cur->left;          // both smaller
        else if (p->val > cur->val && q->val > cur->val) cur = cur->right;    // both bigger
        else return cur;                                                      // split point
    }
    return nullptr;
}
` }] }],
    codeTitle: ['LCA: binary tree (recursive) and BST (iterative)'],
    viz: [{
      title: 'LCA in a binary tree: what each subtree reports',
      input: '3 5 1 6 2 0 8 null null 7 4 | 6 4',
      inputLabel: 'tree slots | p q (two values in the tree)',
      gen: function (input) {
        var sp = splitBar(input, ''), a = parseTreeStr(sp[0]);
        needUnique(a);
        var pq = parseNums(sp[1], 'p and q');
        if (pq.length !== 2) throw new Error('After the | type exactly two values, e.g. "6 4".');
        var P = pq[0], Q = pq[1];
        if (slotOf(a, P) < 0 || slotOf(a, Q) < 0) throw new Error('Both p and q must be values that exist in the tree.');
        var F = [], tags = {}, hl = {}, cs = [];
        hl[slotOf(a, P)] = 'win'; hl[slotOf(a, Q)] = 'win';
        function draw(narr, cur, cls) {
          var h = cpy(hl);
          if (cur !== undefined) h[cur] = cls || 'cur';
          F.push({ narr: narr, parts: [
            { type: 'tree', label: 'Tag = what this subtree reports upward', arr: a.slice(), hl: h, tags: cpy(tags) },
            { type: 'stack', label: 'Call stack (top = running now)', items: cs.map(function (k) { return 'lca(' + a[k] + ')'; }), hl: cs.length ? o1(cs.length - 1, 'cur') : {} },
            { type: 'vars', vals: { p: P, q: Q } }] });
        }
        draw('Find the LCA of <b>' + P + '</b> and <b>' + Q + '</b> (blue). Every call reports up: "null" (found nothing), "p/q" (found one of them), or the LCA itself.');
        function go(i) {
          if (!ex(a, i)) return -1;
          cs.push(i);
          var r0 = body(i);
          cs.pop();
          return r0;
        }
        var ans = go(0);
        function body(i) {
          if (a[i] === P || a[i] === Q) {
            tags[i] = '→' + a[i]; hl[i] = 'ok';
            draw('Node <b>' + a[i] + '</b> is one of our targets → report <b>' + a[i] + '</b> upward right away. We don\'t look below: if the other target is down there, ' + a[i] + ' is the LCA anyway.', i, 'ok');
            return i;
          }
          var L = go(2 * i + 1), R = go(2 * i + 2), r;
          if (L >= 0 && R >= 0) {
            r = i; tags[i] = 'LCA'; hl[i] = 'sel';
            draw('Node <b>' + a[i] + '</b>: left reports ' + a[L] + ' and right reports ' + a[R] + '. The two targets are on <b>different sides</b>, so ' + a[i] + ' is where their paths meet → <span class="c-p">LCA = ' + a[i] + '</span>.', i, 'sel');
          } else if (L >= 0 || R >= 0) {
            r = L >= 0 ? L : R; tags[i] = '→' + a[r];
            draw('Node ' + a[i] + ': only the ' + (L >= 0 ? 'left' : 'right') + ' side found something (' + a[r] + '). Pass it up unchanged.', i);
          } else {
            r = -1; tags[i] = '→null'; hl[i] = 'done';
            draw('Node ' + a[i] + ': neither side found p or q → report <b>null</b>.', i, 'done');
          }
          return r;
        }
        draw('The root\'s report is the answer: <b>LCA(' + P + ', ' + Q + ') = ' + a[ans] + '</b>.', ans, 'sel');
        return F;
      }
    }, {
      title: 'LCA in a BST: follow the comparisons',
      input: '6 2 8 0 4 7 9 3 5 | 3 5',
      inputLabel: 'values inserted into a BST in this order | p q',
      gen: function (input) {
        var sp = splitBar(input, ''), root = bstFrom(parseNums(sp[0], 'the BST values')), r = toArr(root);
        var pq = parseNums(sp[1], 'p and q');
        if (pq.length !== 2) throw new Error('After the | type exactly two values, e.g. "3 5".');
        var P = pq[0], Q = pq[1];
        if (r.idx[P] === undefined || r.idx[Q] === undefined) throw new Error('Both p and q must be values in the BST.');
        var F = [], path = {}, base = {};
        base[P] = 'win'; base[Q] = 'win';
        function draw(narr, curVal, cls) {
          var m = cpy(base);
          for (var k in path) m[k] = 'done';
          if (curVal !== undefined) m[curVal] = cls || 'cur';
          F.push({ narr: narr, parts: [
            { type: 'tree', label: 'BST (blue = p and q)', arr: r.arr.slice(), hl: hv(r, m) },
            { type: 'vars', vals: { p: P, q: Q, cur: curVal === undefined ? '-' : curVal } }] });
        }
        draw('BST rule: left side &lt; node &lt; right side. We start at the root and only look at values — no need to search both sides.');
        var cur = root;
        while (cur) {
          if (P < cur.val && Q < cur.val) {
            draw('At <b>' + cur.val + '</b>: both ' + P + ' and ' + Q + ' are <b>smaller</b>, so both live in the left subtree → the meeting point is further left. Go left.', cur.val);
            path[cur.val] = 1; cur = cur.left;
          } else if (P > cur.val && Q > cur.val) {
            draw('At <b>' + cur.val + '</b>: both ' + P + ' and ' + Q + ' are <b>bigger</b>, so both live in the right subtree. Go right.', cur.val);
            path[cur.val] = 1; cur = cur.right;
          } else {
            draw('At <b>' + cur.val + '</b>: ' + (P === cur.val || Q === cur.val ? cur.val + ' is itself one of the targets and the other one is below it' : 'one target is smaller and one is bigger — they <b>split</b> here') + ' → <span class="c-p">LCA = ' + cur.val + '</span>.', cur.val, 'sel');
            break;
          }
        }
        draw('Done in ' + (Object.keys(path).length + 1) + ' steps — only one root-to-node path was walked, so the cost is O(height), not O(N).', cur ? cur.val : undefined, 'sel');
        return F;
      }
    }],
    problems: [{
      title: 'Lowest Common Ancestor of a Binary Tree',
      level: 'Medium',
      tags: ['recursion', 'postorder', 'lca'],
      statement: `<p>Given a binary tree and two <b>different</b> nodes <code>p</code> and <code>q</code> that both exist in the tree, return their <b>lowest common ancestor</b>: the deepest node that has both p and q as descendants (a node is a descendant of itself).</p>`,
      constraints: `2 ≤ number of nodes ≤ 10<sup>5</sup>, all values unique, p ≠ q, both exist in the tree`,
      example: `<p>Input: <code>root = [3,5,1,6,2,0,8,null,null,7,4]</code>, p = ${H.c('b', '6')}, q = ${H.c('b', '4')} → Output: ${H.c('p', '5')}</p>
<pre>
              3
           /     \\
         [5]      1
         / \\     / \\
        6   2   0   8
           / \\
          7   4
</pre><p><b>Why:</b> 6 is in 5's left subtree, 4 is in 5's right subtree (under 2). Going any lower (6 or 2) loses one of them; going higher (3) is not the <i>lowest</i>.</p>`,
      brute: {
        why: `<p>Brute: find the root-to-p path and the root-to-q path (each by a full DFS that copies paths), then walk both lists until they differ; the last common node is the LCA. It is O(N) but needs two traversals plus two path lists. An even slower version checks, for every node, "does my subtree contain both p and q?" → O(N<sup>2</sup>) because each check walks a subtree again.</p>`,
        code: `
          TreeNode lcaBrute(TreeNode root, TreeNode p, TreeNode q) {
              List<TreeNode> a = new ArrayList<>(), b = new ArrayList<>();
              path(root, p, a);
              path(root, q, b);
              TreeNode ans = null;
              for (int i = 0; i < a.size() && i < b.size() && a.get(i) == b.get(i); i++) ans = a.get(i);
              return ans;
          }
          boolean path(TreeNode n, TreeNode target, List<TreeNode> out) {
              if (n == null) return false;
              out.add(n);
              if (n == target || path(n.left, target, out) || path(n.right, target, out)) return true;
              out.remove(out.size() - 1);   // dead end: undo
              return false;
          }`
      },
      mcq: {
        q: 'In the recursive LCA, the left call returns node 6 and the right call returns node 4. What should the current node return?',
        options: ['6, because left is checked first', 'null', 'Itself — p and q are on different sides, so this is the LCA', '4, because it is deeper'],
        answer: 2,
        explain: 'If each side found one target, the paths from the two targets meet exactly at the current node. That makes it the lowest common ancestor.'
      },
      hints: [
        `<p><b>Aha:</b> the LCA is the only node where p and q end up on <b>different sides</b> (or the node is p/q itself with the other below it). So every subtree just needs to report "what did I find?"</p>`,
        `<p>No extra structure: recursion returns a <code>TreeNode</code>. Return the node itself if it is p or q; otherwise combine left and right results: both non-null → me; one non-null → that one; none → null.</p>`,
        `<p><b>Traps:</b> compare nodes by reference (<code>node == p</code>), not just value, unless values are unique; do not keep searching below p once found. Deep skewed trees can overflow the stack (10<sup>5</sup>) — fine in most judges, else use parent map + set. <b>Recipe:</b> if null/p/q return node; L = rec(left); R = rec(right); return L&amp;&amp;R ? node : (L != null ? L : R).</p>`
      ],
      tests: { sig: 'TreeNode int int int -> int', fn: 'judge', harness: {
        java: "class Check {\n    // n > 0: right-leaning chain of n nodes, n < 0: left-leaning; node i (0 = root) holds val(i).\n    // Built here because a tree this deep is too big to write out as a test literal.\n    static TreeNode chain(int n, java.util.function.IntUnaryOperator val) {\n        TreeNode root = null;\n        for (int i = Math.abs(n) - 1; i >= 0; i--) {\n            TreeNode t = new TreeNode(val.applyAsInt(i));\n            if (n > 0) t.right = root; else t.left = root;\n            root = t;\n        }\n        return root;\n    }\n\n    static TreeNode find(TreeNode root, int v) {\n        Deque<TreeNode> st = new ArrayDeque<>();\n        st.push(root);\n        while (!st.isEmpty()) {\n            TreeNode t = st.pop();\n            if (t.val == v) return t;\n            if (t.left != null) st.push(t.left);\n            if (t.right != null) st.push(t.right);\n        }\n        return null;\n    }\n\n    static int judge(TreeNode root, int p, int q, int n) {\n        if (n != 0) root = chain(n, i -> i);\n        // the judge passes the real nodes of this tree, so find them first\n        return new Solution().lowestCommonAncestor(root, find(root, p), find(root, q)).val;\n    }\n}",
        python: "# n > 0: right-leaning chain of n nodes, n < 0: left-leaning; node i (0 = root) holds val(i).\ndef _chain(n, val):\n    root = None\n    for i in range(abs(n) - 1, -1, -1):\n        t = TreeNode(val(i))\n        if n > 0:\n            t.right = root\n        else:\n            t.left = root\n        root = t\n    return root\n\ndef _find(root, v):\n    st = [root]\n    while st:\n        t = st.pop()\n        if t.val == v:\n            return t\n        st.extend(c for c in (t.left, t.right) if c)\n\ndef judge(root, p, q, n):\n    if n:\n        root = _chain(n, lambda i: i)\n    return Solution().lowest_common_ancestor(root, _find(root, p), _find(root, q)).val",
        js: "// n > 0: right-leaning chain of n nodes, n < 0: left-leaning; node i (0 = root) holds val(i).\nfunction chain__(n, val) {\n  let root = null;\n  for (let i = Math.abs(n) - 1; i >= 0; i--) {\n    const t = new TreeNode(val(i));\n    if (n > 0) t.right = root; else t.left = root;\n    root = t;\n  }\n  return root;\n}\n\nfunction find__(root, v) {\n  const st = [root];\n  while (st.length) {\n    const t = st.pop();\n    if (t.val === v) return t;\n    if (t.left) st.push(t.left);\n    if (t.right) st.push(t.right);\n  }\n  return null;\n}\n\nfunction judge(root, p, q, n) {\n  if (n) root = chain__(n, (i) => i);\n  return lowestCommonAncestor(root, find__(root, p), find__(root, q)).val;\n}",
        cpp: "// n > 0: right-leaning chain of n nodes, n < 0: left-leaning; node i (0 = root) holds val(i).\nTreeNode* chain__(int n, function<int(int)> val) {\n    TreeNode* root = nullptr;\n    for (int i = abs(n) - 1; i >= 0; i--) {\n        TreeNode* t = new TreeNode(val(i));\n        if (n > 0) t->right = root; else t->left = root;\n        root = t;\n    }\n    return root;\n}\n\nTreeNode* find__(TreeNode* root, int v) {\n    vector<TreeNode*> st{root};\n    while (!st.empty()) {\n        TreeNode* t = st.back(); st.pop_back();\n        if (t->val == v) return t;\n        if (t->left) st.push_back(t->left);\n        if (t->right) st.push_back(t->right);\n    }\n    return nullptr;\n}\n\nint judge(TreeNode* root, int p, int q, int n) {\n    if (n) root = chain__(n, [](int i) { return i; });\n    return Solution().lowestCommonAncestor(root, find__(root, p), find__(root, q))->val;\n}"
      }, cases: [
        [[[3,5,1,6,2,0,8,null,null,7,4],6,4,0],5],
        [[[3,5,1,6,2,0,8,null,null,7,4],5,1,0],3],
        [[[3,5,1,6,2,0,8,null,null,7,4],5,4,0],5],
        [[[3,5,1,6,2,0,8,null,null,7,4],7,8,0],3],
        [[[1,2],1,2,0],1],
        [[[1,2],2,1,0],1],
        [[[-1,0,3,-2,4,null,null,8],8,4,0],0],
        [[[0,1,null,2,null,3,null,4,null,5,null,6,null,7,null,8,null,9,null,10,null,11,null,12,null,13,null,14,null,15,null,16,null,17,null,18,null,19,null,20,null,21,null,22,null,23,null,24,null,25,null,26,null,27,null,28,null,29,null,30,null,31,null,32,null,33,null,34,null,35,null,36,null,37,null,38,null,39,null,40,null,41,null,42,null,43,null,44,null,45,null,46,null,47,null,48,null,49,null,50,null,51,null,52,null,53,null,54,null,55,null,56,null,57,null,58,null,59,null,60,null,61,null,62,null,63,null,64,null,65,null,66,null,67,null,68,null,69,null,70,null,71,null,72,null,73,null,74,null,75,null,76,null,77,null,78,null,79,null,80,null,81,null,82,null,83,null,84,null,85,null,86,null,87,null,88,null,89,null,90,null,91,null,92,null,93,null,94,null,95,null,96,null,97,null,98,null,99,null,100,null,101,null,102,null,103,null,104,null,105,null,106,null,107,null,108,null,109,null,110,null,111,null,112,null,113,null,114,null,115,null,116,null,117,null,118,null,119,null,120,null,121,null,122,null,123,null,124,null,125,null,126,null,127,null,128,null,129,null,130,null,131,null,132,null,133,null,134,null,135,null,136,null,137,null,138,null,139,null,140,null,141,null,142,null,143,null,144,null,145,null,146,null,147,null,148,null,149,null,150,null,151,null,152,null,153,null,154,null,155,null,156,null,157,null,158,null,159,null,160,null,161,null,162,null,163,null,164,null,165,null,166,null,167,null,168,null,169,null,170,null,171,null,172,null,173,null,174,null,175,null,176,null,177,null,178,null,179,null,180,null,181,null,182,null,183,null,184,null,185,null,186,null,187,null,188,null,189,null,190,null,191,null,192,null,193,null,194,null,195,null,196,null,197,null,198,null,199,null,200,null,201,null,202,null,203,null,204,null,205,null,206,null,207,null,208,null,209,null,210,null,211,null,212,null,213,null,214,null,215,null,216,null,217,null,218,null,219,null,220,null,221,null,222,null,223,null,224,null,225,null,226,null,227,null,228,null,229,null,230,null,231,null,232,null,233,null,234,null,235,null,236,null,237,null,238,null,239,null,240,null,241,null,242,null,243,null,244,null,245,null,246,null,247,null,248,null,249,null,250,null,251,null,252,null,253,null,254,null,255,null,256,null,257,null,258,null,259,null,260,null,261,null,262,null,263,null,264,null,265,null,266,null,267,null,268,null,269,null,270,null,271,null,272,null,273,null,274,null,275,null,276,null,277,null,278,null,279,null,280,null,281,null,282,null,283,null,284,null,285,null,286,null,287,null,288,null,289,null,290,null,291,null,292,null,293,null,294,null,295,null,296,null,297,null,298,null,299],299,150,0],150],
        [[[-32,-25,39,null,null,-45,21,-44,10,8,-47,null,-21,24,-38,-14,null,null,15],8,24,0],39],
        [[[],99999,50000,-100000],50000],
        [[[],0,99999,-100000],0]
      ] },
      solution: {
        approach: `<p>Postorder "report what you found"; the first node that gets reports from both sides is the LCA. Written recursively it is five lines, but a skewed tree of 10<sup>5</sup> nodes would need 10<sup>5</sup> nested calls and overflow the call stack. So the code makes the same reports with a loop: list the nodes parents-first with a stack, then walk that list backwards so every child reports before its parent.</p>`,
        code: `
          class Solution {
              public TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {
                  List<TreeNode> order = new ArrayList<>();          // parents before children
                  Deque<TreeNode> st = new ArrayDeque<>();
                  st.push(root);
                  while (!st.isEmpty()) {
                      TreeNode n = st.pop();
                      order.add(n);
                      if (n.left != null) st.push(n.left);
                      if (n.right != null) st.push(n.right);
                  }
                  Map<TreeNode, TreeNode> report = new HashMap<>();  // what each subtree found (absent = nothing)
                  for (int i = order.size() - 1; i >= 0; i--) {      // backwards: children report first
                      TreeNode n = order.get(i);
                      if (n == p || n == q) { report.put(n, n); continue; }   // found a target
                      TreeNode left = report.get(n.left);            // what is on my left?
                      TreeNode right = report.get(n.right);          // what is on my right?
                      if (left != null && right != null) report.put(n, n);   // one on each side -> I am the LCA
                      else report.put(n, left != null ? left : right);       // pass up the one found (or null)
                  }
                  return report.get(root);
              }
          }`,
        alt: [{ lang: 'python', code: `class Solution:
    def lowest_common_ancestor(self, root, p, q):
        order, stack = [], [root]            # parents before children
        while stack:
            n = stack.pop()
            order.append(n)
            stack.extend(c for c in (n.left, n.right) if c)
        report = {None: None}                # what each subtree found
        for n in reversed(order):            # children report first
            if n is p or n is q:
                report[n] = n                # found a target
                continue
            left, right = report[n.left], report[n.right]
            report[n] = n if left and right else (left or right)   # both sides -> I am the LCA
        return report[root]
` }, { lang: 'js', code: `function lowestCommonAncestor(root, p, q) {
  const order = [], stack = [root];              // parents before children
  while (stack.length) {
    const n = stack.pop();
    order.push(n);
    if (n.left) stack.push(n.left);
    if (n.right) stack.push(n.right);
  }
  const report = new Map();                      // what each subtree found (absent = nothing)
  const got = (n) => (n ? report.get(n) : null);
  for (let i = order.length - 1; i >= 0; i--) {  // children report first
    const n = order[i];
    if (n === p || n === q) { report.set(n, n); continue; }   // found a target
    const left = got(n.left), right = got(n.right);
    report.set(n, left && right ? n : (left || right));      // both sides -> I am the LCA
  }
  return report.get(root);
}
` }, { lang: 'cpp', code: `// LeetCode-style node (the judge normally provides it)
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(x), left(l), right(r) {}
};

class Solution {
public:
    TreeNode* lowestCommonAncestor(TreeNode* root, TreeNode* p, TreeNode* q) {
        // empty spot -> found nothing; p or q itself -> found a target
        if (!root || root == p || root == q) return root;
        TreeNode* left = lowestCommonAncestor(root->left, p, q);
        TreeNode* right = lowestCommonAncestor(root->right, p, q);
        if (left && right) return root;      // one target on each side
        return left ? left : right;
    }
};
` }],
        dry: {
          head: ['node', 'left reports', 'right reports', 'returns', 'reason'],
          rows: [
            ['6', '—', '—', H.c('g', '6'), 'node == p'],
            ['7', 'null', 'null', 'null', 'nothing found'],
            ['4', '—', '—', H.c('g', '4'), 'node == q'],
            ['2', 'null', '4', '4', 'pass up the found one'],
            ['5', '6', '4', H.c('p', '5'), 'both sides found → split point'],
            ['0', 'null', 'null', 'null', 'nothing'],
            ['8', 'null', 'null', 'null', 'nothing'],
            ['1', 'null', 'null', 'null', 'nothing'],
            ['3', '5', 'null', H.c('p', '5'), 'pass up → final answer 5']
          ]
        },
        complexity: `<p><b>Time O(N)</b>: every node is listed once and reports once. <b>Space O(N)</b> for the list and the report map (the recursive version needs O(h) call stack, which is N on a skewed tree). For a <b>BST</b>, the comparison walk is O(h) time and O(1) space.</p>`
      }
    }],
    examples: [
      {
        title: 'One node is the ancestor of the other',
        html: `<p>In the tree <code>[3,5,1,6,2,0,8,null,null,7,4]</code>, LCA(${H.c('b', '5')}, ${H.c('b', '4')}) = ${H.c('p', '5')}. The recursion reaches 5 and returns it at once without looking below. Its parent 3 gets "5" from the left and null from the right, so it passes 5 up. We never even confirmed that 4 is under 5 — the problem promises both exist, so that is safe.</p>`
      },
      {
        title: 'Distance between two nodes using the LCA',
        html: `<p><code>dist(p, q) = depth(p) + depth(q) − 2 · depth(LCA)</code>. For p = 6, q = 4: depth(6) = 2, depth(4) = 3, LCA = 5 with depth 1 → 2 + 3 − 2 = ${H.c('g', '3')} edges (6 → 5 → 2 → 4). The two paths from the root share the part above the LCA, and we subtract it twice.</p>`,
        code: { lang: 'java', code: `
class Distance {
    int dist(TreeNode root, TreeNode p, TreeNode q) {
        TreeNode lca = lca(root, p, q);
        return depth(lca, p, 0) + depth(lca, q, 0);   // walk down from the LCA
    }
    TreeNode lca(TreeNode n, TreeNode p, TreeNode q) {
        if (n == null || n == p || n == q) return n;
        TreeNode l = lca(n.left, p, q), r = lca(n.right, p, q);
        return (l != null && r != null) ? n : (l != null ? l : r);
    }
    // edges from n down to target, or -1 if target is not below n
    int depth(TreeNode n, TreeNode target, int d) {
        if (n == null) return -1;
        if (n == target) return d;
        int l = depth(n.left, target, d + 1);
        return l != -1 ? l : depth(n.right, target, d + 1);
    }
}`, alt: [{ lang: 'python', code: `def dist(root, p, q):
    def lca(n):
        if n is None or n is p or n is q:
            return n
        l, r = lca(n.left), lca(n.right)
        return n if l and r else (l or r)

    # edges from n down to target, or -1 if target is not below n
    def depth(n, target, d):
        if n is None:
            return -1
        if n is target:
            return d
        l = depth(n.left, target, d + 1)
        return l if l != -1 else depth(n.right, target, d + 1)

    a = lca(root)
    return depth(a, p, 0) + depth(a, q, 0)   # walk down from the LCA
` }, { lang: 'js', code: `function dist(root, p, q) {
  const lca = (n) => {
    if (!n || n === p || n === q) return n;
    const l = lca(n.left), r = lca(n.right);
    return l && r ? n : (l || r);
  };
  // edges from n down to target, or -1 if target is not below n
  const depth = (n, target, d) => {
    if (!n) return -1;
    if (n === target) return d;
    const l = depth(n.left, target, d + 1);
    return l !== -1 ? l : depth(n.right, target, d + 1);
  };
  const a = lca(root);
  return depth(a, p, 0) + depth(a, q, 0);    // walk down from the LCA
}
` }, { lang: 'cpp', code: `// TreeNode as defined in the first lesson
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int v = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(v), left(l), right(r) {}
};

class Distance {
public:
    int dist(TreeNode* root, TreeNode* p, TreeNode* q) {
        TreeNode* a = lca(root, p, q);
        return depth(a, p, 0) + depth(a, q, 0);   // walk down from the LCA
    }

private:
    TreeNode* lca(TreeNode* n, TreeNode* p, TreeNode* q) {
        if (!n || n == p || n == q) return n;
        TreeNode *l = lca(n->left, p, q), *r = lca(n->right, p, q);
        return (l && r) ? n : (l ? l : r);
    }
    // edges from n down to target, or -1 if target is not below n
    int depth(TreeNode* n, TreeNode* target, int d) {
        if (!n) return -1;
        if (n == target) return d;
        int l = depth(n->left, target, d + 1);
        return l != -1 ? l : depth(n->right, target, d + 1);
    }
};
` }] }
      },
      {
        title: 'With parent pointers it becomes "intersection of two lists"',
        html: `<p>If every node knows its parent, walk up from p storing every ancestor in a set, then walk up from q until you hit one in the set. Or use the two-pointer trick from Linked Lists: when a pointer reaches the root's parent (null), restart it at the other node; both travel the same total distance and meet at the LCA. O(h) time.</p>`,
        code: { lang: 'java', code: `
class Node { int val; Node left, right, parent; }

class ParentLCA {
    Node lca(Node p, Node q) {
        Node a = p, b = q;
        while (a != b) {                    // each pointer walks depth(p) + depth(q) steps max
            a = (a == null) ? q : a.parent;
            b = (b == null) ? p : b.parent;
        }
        return a;
    }
}`, alt: [{ lang: 'python', code: `class Node:
    def __init__(self, val, parent=None):
        self.val, self.parent = val, parent
        self.left = self.right = None

def lca(p, q):
    a, b = p, q
    while a is not b:                        # each pointer walks depth(p) + depth(q) steps max
        a = q if a is None else a.parent
        b = p if b is None else b.parent
    return a
` }, { lang: 'js', code: `class Node {
  constructor(val, parent = null) { this.val = val; this.parent = parent; this.left = null; this.right = null; }
}

function lca(p, q) {
  let a = p, b = q;
  while (a !== b) {                          // each pointer walks depth(p) + depth(q) steps max
    a = a === null ? q : a.parent;
    b = b === null ? p : b.parent;
  }
  return a;
}
` }, { lang: 'cpp', code: `struct Node { int val; Node *left = nullptr, *right = nullptr, *parent = nullptr; };

Node* lca(Node* p, Node* q) {
    Node *a = p, *b = q;
    while (a != b) {                         // each pointer walks depth(p) + depth(q) steps max
        a = a ? a->parent : q;
        b = b ? b->parent : p;
    }
    return a;
}
` }] }
      },
      {
        title: 'BST shortcut on numbers',
        html: `<p>BST built from 6, 2, 8, 0, 4, 7, 9, 3, 5. LCA(2, 8): at 6, 2 &lt; 6 &lt; 8 → split → ${H.c('p', '6')}. LCA(3, 5): 6 → left to 2 → right to 4 → split → ${H.c('p', '4')}. LCA(2, 4): at 6 go left; at 2 one target equals the node → ${H.c('p', '2')}. Only one path is walked each time.</p>`
      }
    ],
    deepDive: `<p><b>Why the recursive version is correct:</b> define f(node) = "p or q if exactly one is in this subtree (or the node itself is one), the LCA if both are, null if neither". The base cases match that definition, and the combine step does too: both children non-null means p and q sit in different subtrees, so no deeper node contains both — the current node is the lowest one that does.</p>
<p><b>The hidden assumption:</b> the standard code assumes <b>both</b> nodes exist. If q might be missing, it returns p (wrong). Fix (LeetCode 1644): traverse the whole tree, count how many targets were actually found, and return the LCA only if the count is 2. Do not short-circuit at p.</p>
<p><b>Many queries?</b> One query is O(N); 10<sup>5</sup> queries would be O(N·Q) = 10<sup>10</sup>. Precompute instead:</p>
<ul>
<li><b>Binary lifting</b>: up[k][v] = 2<sup>k</sup>-th ancestor. Lift the deeper node to the same depth, then lift both while their ancestors differ. O(N log N) build, O(log N) per query. (Covered in Advanced Graph Algorithms.)</li>
<li><b>Euler tour + sparse table</b>: LCA becomes a range-minimum query on depths, O(1) per query.</li>
<li><b>Tarjan's offline LCA</b> with Union-Find answers all queries in one DFS.</li>
</ul>
<p><b>BST version subtleties:</b> it works even when p or q is not actually in the tree (it returns the split point), so validate existence if required. With duplicates allowed, define which side equal keys go to first. The loop version uses O(1) space, the recursive one O(h).</p>
<p><b>Real world:</b> LCA is "nearest common manager" in HR systems, the merge base in <b>git</b> (the common ancestor commit of two branches — on a DAG, but the same idea), and the closest common category in taxonomies.</p>`,
    aiEra: `<p><b>What AI changes:</b> LCA is a top-10 interview problem; any assistant writes the 5-line recursion. Interviewers therefore go straight to follow-ups: nodes may be missing, parent pointers, many queries, BST vs general tree.</p>
<p><b>Use AI as a partner:</b> <code>Explain why my LCA returns the wrong answer when q is not in the tree, and propose a fix that still runs in one pass.</code> Or ask it to generate the binary-lifting version and then explain each line back to it.</p>
<p><b>Where AI goes wrong:</b> comparing by value when values may repeat (should compare references), using the BST shortcut on a plain binary tree, and claiming the BST version is O(log N) without saying "if balanced".</p>
<p><b>What you must still own:</b> the "report what you found" invariant, the existence assumption, and how to scale to many queries.</p>`
  });
  /* ===================== TOPIC 10: BST search & insert ===================== */
  topics.push({
    title: 'BST Search & Insert (and Min, Max, Floor, Ceil)',
    analogy: `<p>Remember the game <b>"I'm thinking of a number — higher or lower?"</b> Every answer throws away half of the possibilities. A Binary Search Tree is that game frozen into a structure. Or think of a <b>library</b>: at each junction a sign says "A–M go left, N–Z go right". You never walk down the wrong aisle, so you reach the book after a handful of turns instead of checking every shelf.</p>`,
    explain: `<p>A <b>Binary Search Tree (BST)</b> is a binary tree with one promise at <b>every</b> node:</p>
<p style="text-align:center"><b>everything in the left subtree &lt; node &lt; everything in the right subtree</b></p>
<pre>
              50
           /      \\
         30        70
        /  \\      /  \\
      20    40   60    80
</pre>
<p>Note the word <b>everything</b>: 40 is right of 30 (bigger than 30) but also inside 50's <b>left</b> subtree, so it must be smaller than 50. It is.</p>
<h4>Search: one comparison per level</h4>
<p>Start at the root. Equal → found. Smaller → go left. Bigger → go right. Fell off (null) → not in the tree.</p>
${H.table(['search 60', 'compare', 'move'], [
  ['at 50', '60 &gt; 50', 'go right'],
  ['at 70', '60 &lt; 70', 'go left'],
  ['at 60', H.c('g', 'equal'), H.c('g', 'found in 3 steps')]
])}
<h4>Insert: search until you fall off, then hang the new node there</h4>
<p>Insert 65: 65 &gt; 50 → right; 65 &lt; 70 → left; 65 &gt; 60 → right; empty → ${H.c('g', '65 becomes the right child of 60')}. New nodes are <b>always added as leaves</b>; nothing else moves.</p>
<h4>Free extras</h4>
<ul>
<li><b>Min</b> = keep going left; <b>Max</b> = keep going right.</li>
<li><b>Floor(x)</b> = largest value ≤ x; <b>Ceil(x)</b> = smallest value ≥ x. Search for x and remember the best candidate seen on the way.</li>
<li><b>Inorder</b> of a BST is <b>sorted</b>: 20 30 40 50 60 70 80.</li>
</ul>
<p><b>Cost:</b> every operation walks one root-to-leaf path → <b>O(h)</b>. Balanced: h ≈ log₂N (20 steps for a million keys). But insert keys in sorted order (10, 20, 30, …) and every new key goes right: the tree becomes a chain and h = N.</p>`,
    clues: [
      '"Given a <b>BST</b>…" → use the ordering: one comparison tells you which half to ignore; aim for <b>O(h)</b>, not O(N).',
      '"<b>search</b> / <b>insert</b> / <b>closest value</b> / floor / ceil in a BST" → single root-to-leaf walk, remember the best candidate.',
      '"<b>sorted</b> order" + "tree" → inorder of a BST; "<b>dynamic</b> sorted set with inserts" → BST / ordered map (<code>TreeMap</code>, <code>std::map</code>).',
      '"Values are inserted in <b>increasing</b> order" → warning: plain BST degenerates into a linked list (h = N).',
      'Need predecessor / successor / range queries with updates → a library ordered set or map: <code>TreeMap</code> / <code>TreeSet</code> in Java, <code>std::map</code> / <code>std::set</code> in C++ (red-black trees, O(log N) guaranteed). Python and JavaScript have none built in: use <code>sortedcontainers.SortedList</code>, or a sorted array with binary search when updates are rare.'
    ],
    code: [{ lang: 'java', code: `
class BST {
    TreeNode root;

    // SEARCH (iterative): O(h) time, O(1) space
    TreeNode search(int key) {
        TreeNode cur = root;
        while (cur != null && cur.val != key) {
            cur = (key < cur.val) ? cur.left : cur.right;   // throw away half each step
        }
        return cur;   // null if not found
    }

    // INSERT (recursive): returns the (possibly new) root of this subtree
    TreeNode insert(TreeNode node, int key) {
        if (node == null) return new TreeNode(key);         // fell off -> new leaf here
        if (key < node.val) node.left = insert(node.left, key);
        else if (key > node.val) node.right = insert(node.right, key);
        // key == node.val: duplicate, ignore (a BST "set")
        return node;
    }

    // INSERT (iterative): walk down remembering the parent
    void insertIter(int key) {
        TreeNode fresh = new TreeNode(key);
        if (root == null) { root = fresh; return; }
        TreeNode cur = root, parent = null;
        while (cur != null) {
            parent = cur;
            if (key == cur.val) return;                      // duplicate
            cur = (key < cur.val) ? cur.left : cur.right;
        }
        if (key < parent.val) parent.left = fresh; else parent.right = fresh;
    }

    int min() { TreeNode c = root; while (c.left != null) c = c.left; return c.val; }
    int max() { TreeNode c = root; while (c.right != null) c = c.right; return c.val; }

    // FLOOR: largest value <= x, or null if none
    Integer floor(int x) {
        Integer best = null;
        TreeNode cur = root;
        while (cur != null) {
            if (cur.val == x) return x;
            if (cur.val < x) { best = cur.val; cur = cur.right; }  // candidate, try bigger
            else cur = cur.left;                                  // too big, go smaller
        }
        return best;
    }

    // CEIL: smallest value >= x, or null if none
    Integer ceil(int x) {
        Integer best = null;
        TreeNode cur = root;
        while (cur != null) {
            if (cur.val == x) return x;
            if (cur.val > x) { best = cur.val; cur = cur.left; }   // candidate, try smaller
            else cur = cur.right;
        }
        return best;
    }

    public static void main(String[] args) {
        BST t = new BST();
        for (int v : new int[]{50, 30, 70, 20, 40, 60, 80}) t.root = t.insert(t.root, v);
        System.out.println(t.search(60) != null);          // true
        System.out.println(t.floor(65) + " " + t.ceil(65)); // 60 70
        System.out.println(t.min() + " " + t.max());       // 20 80
    }
}`, alt: [{ lang: 'python', run: true, code: `class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val, self.left, self.right = val, left, right

class BST:
    def __init__(self):
        self.root = None

    # SEARCH (iterative): O(h) time, O(1) space
    def search(self, key):
        cur = self.root
        while cur and cur.val != key:
            cur = cur.left if key < cur.val else cur.right   # throw away half each step
        return cur                                           # None if not found

    # INSERT (recursive): returns the (possibly new) root of this subtree
    def insert(self, node, key):
        if node is None:
            return TreeNode(key)                             # fell off -> new leaf here
        if key < node.val:
            node.left = self.insert(node.left, key)
        elif key > node.val:
            node.right = self.insert(node.right, key)
        return node                                          # duplicate: ignored (a BST "set")

    def min(self):
        c = self.root
        while c.left:
            c = c.left
        return c.val

    def max(self):
        c = self.root
        while c.right:
            c = c.right
        return c.val

    # FLOOR: largest value <= x, or None if none
    def floor(self, x):
        best, cur = None, self.root
        while cur:
            if cur.val == x:
                return x
            if cur.val < x:
                best, cur = cur.val, cur.right               # candidate, try bigger
            else:
                cur = cur.left                               # too big, go smaller
        return best

    # CEIL: smallest value >= x, or None if none
    def ceil(self, x):
        best, cur = None, self.root
        while cur:
            if cur.val == x:
                return x
            if cur.val > x:
                best, cur = cur.val, cur.left                # candidate, try smaller
            else:
                cur = cur.right
        return best

t = BST()
for v in [50, 30, 70, 20, 40, 60, 80]:
    t.root = t.insert(t.root, v)
print(t.search(60) is not None)       # True
print(t.floor(65), t.ceil(65))        # 60 70
print(t.min(), t.max())               # 20 80
` }, { lang: 'js', run: true, code: `class TreeNode {
  constructor(val = 0, left = null, right = null) { this.val = val; this.left = left; this.right = right; }
}

class BST {
  constructor() { this.root = null; }

  // SEARCH (iterative): O(h) time, O(1) space
  search(key) {
    let cur = this.root;
    while (cur && cur.val !== key) cur = key < cur.val ? cur.left : cur.right;   // throw away half
    return cur;                                         // null if not found
  }

  // INSERT (recursive): returns the (possibly new) root of this subtree
  insert(node, key) {
    if (!node) return new TreeNode(key);                // fell off -> new leaf here
    if (key < node.val) node.left = this.insert(node.left, key);
    else if (key > node.val) node.right = this.insert(node.right, key);
    return node;                                        // duplicate: ignored (a BST "set")
  }

  min() { let c = this.root; while (c.left) c = c.left; return c.val; }
  max() { let c = this.root; while (c.right) c = c.right; return c.val; }

  // FLOOR: largest value <= x, or null if none
  floor(x) {
    let best = null, cur = this.root;
    while (cur) {
      if (cur.val === x) return x;
      if (cur.val < x) { best = cur.val; cur = cur.right; }   // candidate, try bigger
      else cur = cur.left;                                    // too big, go smaller
    }
    return best;
  }

  // CEIL: smallest value >= x, or null if none
  ceil(x) {
    let best = null, cur = this.root;
    while (cur) {
      if (cur.val === x) return x;
      if (cur.val > x) { best = cur.val; cur = cur.left; }    // candidate, try smaller
      else cur = cur.right;
    }
    return best;
  }
}

const t = new BST();
for (const v of [50, 30, 70, 20, 40, 60, 80]) t.root = t.insert(t.root, v);
console.log(t.search(60) !== null);            // true
console.log(t.floor(65) + ' ' + t.ceil(65));   // 60 70
console.log(t.min() + ' ' + t.max());          // 20 80
` }, { lang: 'cpp', code: `// TreeNode as defined in the first lesson
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int v = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(v), left(l), right(r) {}
};

class BST {
public:
    TreeNode* root = nullptr;

    // SEARCH (iterative): O(h) time, O(1) space
    TreeNode* search(int key) {
        TreeNode* cur = root;
        while (cur && cur->val != key) cur = key < cur->val ? cur->left : cur->right;   // throw away half
        return cur;                                          // nullptr if not found
    }

    // INSERT (recursive): returns the (possibly new) root of this subtree
    TreeNode* insert(TreeNode* node, int key) {
        if (!node) return new TreeNode(key);                 // fell off -> new leaf here
        if (key < node->val) node->left = insert(node->left, key);
        else if (key > node->val) node->right = insert(node->right, key);
        return node;                                         // duplicate: ignored (a BST "set")
    }

    int minVal() { TreeNode* c = root; while (c->left) c = c->left; return c->val; }
    int maxVal() { TreeNode* c = root; while (c->right) c = c->right; return c->val; }

    // FLOOR: largest value <= x, or nullopt if none
    optional<int> floor(int x) {
        optional<int> best;
        for (TreeNode* cur = root; cur;) {
            if (cur->val == x) return x;
            if (cur->val < x) { best = cur->val; cur = cur->right; }   // candidate, try bigger
            else cur = cur->left;                                      // too big, go smaller
        }
        return best;
    }

    // CEIL: smallest value >= x, or nullopt if none
    optional<int> ceil(int x) {
        optional<int> best;
        for (TreeNode* cur = root; cur;) {
            if (cur->val == x) return x;
            if (cur->val > x) { best = cur->val; cur = cur->left; }    // candidate, try smaller
            else cur = cur->right;
        }
        return best;
    }
};

int main() {
    BST t;
    for (int v : {50, 30, 70, 20, 40, 60, 80}) t.root = t.insert(t.root, v);
    cout << boolalpha << (t.search(60) != nullptr) << '\\n';     // true
    cout << *t.floor(65) << ' ' << *t.ceil(65) << '\\n';         // 60 70
    cout << t.minVal() << ' ' << t.maxVal() << '\\n';            // 20 80
}
` }] }, { lang: 'python', run: true, title: 'Same BST in Python (runnable)', code: `class Node:
    def __init__(self, val):
        self.val, self.left, self.right = val, None, None

def insert(node, key):
    if node is None:
        return Node(key)                 # fell off the tree: new leaf
    if key < node.val:
        node.left = insert(node.left, key)
    elif key > node.val:
        node.right = insert(node.right, key)
    return node

def search(node, key):
    steps = 0
    while node is not None and node.val != key:
        steps += 1
        node = node.left if key < node.val else node.right
    return node is not None, steps

def inorder(node):
    return [] if node is None else inorder(node.left) + [node.val] + inorder(node.right)

def height(node):
    return 0 if node is None else 1 + max(height(node.left), height(node.right))

root = None
for v in [50, 30, 70, 20, 40, 60, 80]:
    root = insert(root, v)
print('inorder (sorted):', inorder(root))
print('search 60 ->', search(root, 60))
print('search 65 ->', search(root, 65))

chain = None
for v in range(1, 8):                     # sorted inserts -> a chain
    chain = insert(chain, v)
print('height bushy =', height(root), ' height sorted-insert =', height(chain))` }],
    codeTitle: ['BST search, insert, min/max, floor/ceil', 'Runnable Python version'],
    viz: {
      title: 'Build a BST by inserting, then search it',
      input: '50 30 70 20 40 60 80 | 65',
      inputLabel: 'values to insert (in order) | value to search',
      gen: function (input) {
        var sp = splitBar(input, '');
        var vals = parseNums(sp[0], 'the values to insert');
        if (vals.length > 20) throw new Error('Please insert at most 20 values.');
        var target = sp[1] ? parseNums(sp[1], 'the search value')[0] : vals[vals.length - 1];
        var F = [], root = null, r = { arr: [], idx: {} };
        function draw(narr, m, i, vv) {
          var ahl = {}, ptr = {};
          for (var k = 0; k < vals.length; k++) ahl[k] = k < i ? 'done' : '';
          if (i >= 0 && i < vals.length) { ahl[i] = 'cur'; ptr[i] = 'next'; }
          var parts = [];
          parts.push(r.arr.length ? { type: 'tree', label: 'BST', arr: r.arr.slice(), hl: hv(r, m || {}) } : { type: 'text', label: 'BST', html: '<i>empty tree</i>' });
          parts.push({ type: 'array', label: 'values to insert', values: vals.slice(), hl: ahl, ptr: ptr });
          parts.push({ type: 'vars', vals: vv || {} });
          F.push({ narr: narr, parts: parts });
        }
        draw('We start with an <b>empty</b> tree and insert the values one by one. Each new value walks down from the root (smaller → left, bigger → right) and becomes a <b>leaf</b> where it falls off.', {}, 0, { inserted: 0 });
        for (var i = 0; i < vals.length; i++) {
          var v = vals[i], path = [], steps = [], cur = root, dup = false;
          while (cur) {
            path.push(cur.val);
            if (v === cur.val) { dup = true; break; }
            steps.push(v + (v < cur.val ? ' &lt; ' : ' &gt; ') + cur.val + ' → ' + (v < cur.val ? 'left' : 'right'));
            cur = v < cur.val ? cur.left : cur.right;
          }
          var m = {};
          path.forEach(function (x) { m[x] = 'win'; });
          if (dup) {
            m[v] = 'bad';
            draw('Insert <b>' + v + '</b>: ' + (steps.length ? steps.join(', ') + ', ' : '') + 'then we meet ' + v + ' itself → <span class="c-r">duplicate, ignored</span> (this BST stores each value once).', m, i, { inserting: v, compares: path.length });
            continue;
          }
          root = bstIns(root, v);
          r = toArr(root);
          m[v] = 'ok';
          draw('Insert <b>' + v + '</b>: ' + (steps.length ? steps.join(', ') + ' → empty spot' : 'tree is empty') + ' → <span class="c-g">' + v + ' hangs here as a new leaf</span>. ' + path.length + ' comparison(s) = the depth of the new node.', m, i + 1, { inserting: v, compares: path.length });
        }
        var hgt = (function h(n) { return n ? 1 + Math.max(h(n.left), h(n.right)) : 0; })(root);
        draw('All values inserted. Height = <b>' + hgt + '</b> for ' + Object.keys(r.idx).length + ' nodes. Inorder (left, me, right) reads them sorted: <b>' + inorderVals(root, []).join(' ') + '</b>. Now we search for <b>' + target + '</b>.', {}, vals.length, { height: hgt, searchFor: target });
        var c = root, seen = {}, n = 0, best = { fl: null, ce: null };
        while (c) {
          n++;
          seen[c.val] = 'done';
          var m2 = {};
          for (var s in seen) m2[s] = 'done';
          if (c.val === target) {
            m2[c.val] = 'sel';
            draw('At <b>' + c.val + '</b>: equal to ' + target + ' → <span class="c-g">FOUND after ' + n + ' comparison(s)</span>. We ignored every other branch, which is why search is O(h).', m2, vals.length, { target: target, cur: c.val, compares: n });
            return F;
          }
          if (target < c.val) best.ce = c.val; else best.fl = c.val;
          m2[c.val] = 'cur';
          draw('At <b>' + c.val + '</b>: ' + target + (target < c.val ? ' &lt; ' : ' &gt; ') + c.val + ' → the whole ' + (target < c.val ? 'right' : 'left') + ' side is useless, go <b>' + (target < c.val ? 'left' : 'right') + '</b>.', m2, vals.length, { target: target, cur: c.val, compares: n, floorSoFar: best.fl === null ? '-' : best.fl, ceilSoFar: best.ce === null ? '-' : best.ce });
          c = target < c.val ? c.left : c.right;
        }
        draw('We fell off the tree → <span class="c-r">' + target + ' is not in the BST</span>. Bonus: the last candidates give floor(' + target + ') = <b>' + (best.fl === null ? 'none' : best.fl) + '</b> and ceil(' + target + ') = <b>' + (best.ce === null ? 'none' : best.ce) + '</b>, and an insert of ' + target + ' would hang exactly where we fell off.', {}, vals.length, { target: target, compares: n, floor: best.fl === null ? 'none' : best.fl, ceil: best.ce === null ? 'none' : best.ce });
        return F;
      }
    },
    examples: [
      {
        title: 'Found vs not found: count the comparisons',
        html: `<p>BST from 50, 30, 70, 20, 40, 60, 80.</p>
${H.table(['search', 'path', 'comparisons', 'result'], [
  ['60', '50 → 70 → 60', '3', H.c('g', 'found')],
  ['20', '50 → 30 → 20', '3', H.c('g', 'found')],
  ['65', '50 → 70 → 60 → (right is null)', '3', H.c('r', 'not found')],
  ['5', '50 → 30 → 20 → (left is null)', '3', H.c('r', 'not found')]
])}
<p>Never more than the height (3) — compared with up to 7 checks in an unsorted list.</p>`
      },
      {
        title: 'Insertion order decides the shape',
        html: `${H.table(['insert order', 'shape', 'height'], [
  ['40, 20, 60, 10, 30, 50, 70', 'perfectly bushy', H.c('g', '3')],
  ['10, 20, 30, 40, 50, 60, 70', 'chain going right', H.c('r', '7')],
  ['70, 60, 50, 40, 30, 20, 10', 'chain going left', H.c('r', '7')]
])}
<p>Same 7 keys, very different speed. Random insertion order gives an expected height of about 2.99 · log₂N — fine on average — but real data often arrives sorted (timestamps, IDs). That is why libraries use <b>self-balancing</b> trees. Try <code>10 20 30 40 50 | 50</code> in the visualizer.</p>`
      },
      {
        title: 'Floor and ceil of 65',
        html: `<p>Walk for 65 in the same BST: at 50 (≤ 65 → floor candidate ${H.c('b', '50')}, go right), at 70 (≥ 65 → ceil candidate ${H.c('p', '70')}, go left), at 60 (≤ 65 → floor candidate ${H.c('b', '60')}, go right), fall off. Floor(65) = ${H.c('b', '60')}, ceil(65) = ${H.c('p', '70')}. The answer is always one of the nodes on the search path.</p>`
      },
      {
        title: 'In real code: the library ordered set (TreeSet, std::set, …)',
        html: `<p>You rarely hand-roll a BST in production. Java's <code>TreeSet</code>/<code>TreeMap</code> and C++'s <code>std::set</code>/<code>std::map</code> are red-black trees with every operation above built in and O(log N) guaranteed. Python has no built-in one (use <code>bisect</code> on a sorted list, or the third-party <code>sortedcontainers</code>), and neither does JavaScript (a sorted array plus binary search). The tabs below show each.</p>`,
        code: { lang: 'java', code: `
TreeSet<Integer> set = new TreeSet<>(List.of(50, 30, 70, 20, 40, 60, 80));
System.out.println(set.floor(65));      // 60  (largest <= 65)
System.out.println(set.ceiling(65));    // 70  (smallest >= 65)
System.out.println(set.lower(60));      // 50  (strictly smaller)
System.out.println(set.higher(60));     // 70  (strictly bigger)
System.out.println(set.first() + " " + set.last());      // 20 80
System.out.println(set.subSet(30, true, 60, true));      // [30, 40, 50, 60] range query`, alt: [{ lang: 'python', run: true, code: `from bisect import bisect_left, bisect_right

# Python has no built-in balanced BST; a sorted list + bisect answers the same queries.
# (Inserts into a list are O(n); the third-party sortedcontainers.SortedList makes them fast.)
s = sorted([50, 30, 70, 20, 40, 60, 80])
print(s[bisect_right(s, 65) - 1])          # 60  floor: largest <= 65
print(s[bisect_left(s, 65)])               # 70  ceiling: smallest >= 65
print(s[bisect_left(s, 60) - 1])           # 50  lower: strictly smaller
print(s[bisect_right(s, 60)])              # 70  higher: strictly bigger
print(s[0], s[-1])                         # 20 80
print(s[bisect_left(s, 30):bisect_right(s, 60)])   # [30, 40, 50, 60] range query
` }, { lang: 'js', run: true, code: `// JavaScript has no built-in ordered set: keep a sorted array and binary search it.
const s = [50, 30, 70, 20, 40, 60, 80].sort((a, b) => a - b);   // numeric comparator!
// first index whose value is >= x (or > x when strict)
function lowerBound(a, x, strict = false) {
  let lo = 0, hi = a.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (strict ? a[mid] <= x : a[mid] < x) lo = mid + 1; else hi = mid;
  }
  return lo;
}
console.log(s[lowerBound(s, 65, true) - 1]);   // 60  floor: largest <= 65
console.log(s[lowerBound(s, 65)]);             // 70  ceiling: smallest >= 65
console.log(s[lowerBound(s, 60) - 1]);         // 50  lower: strictly smaller
console.log(s[lowerBound(s, 60, true)]);       // 70  higher: strictly bigger
console.log(s[0] + ' ' + s[s.length - 1]);     // 20 80
console.log(s.slice(lowerBound(s, 30), lowerBound(s, 60, true)));   // [30, 40, 50, 60] range query
` }, { lang: 'cpp', code: `// std::set is a red-black tree: every query below is O(log n).
set<int> s{50, 30, 70, 20, 40, 60, 80};
cout << *prev(s.upper_bound(65)) << '\\n';   // 60  floor: largest <= 65
cout << *s.lower_bound(65) << '\\n';         // 70  ceiling: smallest >= 65
cout << *prev(s.lower_bound(60)) << '\\n';   // 50  lower: strictly smaller
cout << *s.upper_bound(60) << '\\n';         // 70  higher: strictly bigger
cout << *s.begin() << ' ' << *s.rbegin() << '\\n';   // 20 80
for (auto it = s.lower_bound(30); it != s.upper_bound(60); ++it) cout << *it << ' ';   // 30 40 50 60
` }] }
      }
    ],
    deepDive: `<p><b>Expected vs worst height:</b> for N keys inserted in random order, the expected depth of a node is about 2 ln N ≈ 1.39 log₂N and the expected height about 4.311 ln N ≈ 2.99 log₂N. Sorted or nearly sorted input gives height N, so every operation becomes O(N) — the same as a linked list.</p>
<p><b>Self-balancing trees fix the worst case</b> by rotating after inserts/deletes: <b>AVL</b> (strict, faster lookups), <b>red-black</b> (looser, fewer rotations; Java <code>TreeMap</code>, C++ <code>std::map</code>), <b>treaps</b> and <b>skip lists</b> (randomised; Redis sorted sets use a skip list), <b>splay trees</b> (recently used keys move to the top). On disk, <b>B-trees / B+ trees</b> store hundreds of keys per node so a lookup costs 3–4 disk reads even for billions of rows — every SQL index you will create is one.</p>
<p><b>Duplicates:</b> pick a policy and say it: ignore (set semantics), keep a <b>count</b> field in the node (multiset — best), or send equal keys consistently to one side (e.g. right) — but then "left &lt; node ≤ right" changes how search and validation must work.</p>
<p><b>Recursive vs iterative:</b> the recursive insert is elegant (<code>node.left = insert(node.left, key)</code> re-links on the way back up) but uses O(h) stack; the iterative version keeps a <code>parent</code> pointer and uses O(1) extra space — matters when h can be 10<sup>5</sup>.</p>
<p><b>BST vs hash map:</b> hashing (<code>HashMap</code> / <code>dict</code> / <code>Map</code> / <code>unordered_map</code>) gives O(1) average lookups but no order. Choose a BST / ordered map when you need sorted iteration, floor/ceil, k-th smallest, or range queries ("all keys between 30 and 60") — hashing cannot answer those without scanning everything.</p>`,
    aiEra: `<p><b>What AI changes:</b> nobody hand-writes BST insert at work; you call the library's ordered map (<code>TreeMap</code>, <code>std::map</code>). Interviews still ask it because it proves you understand O(h) and the ordering invariant — and AI makes it trivial to generate tests for your version.</p>
<p><b>Use AI as a partner:</b> <code>Generate 20 random insert sequences and, for each, the expected inorder output and height, so I can test my BST.</code> Or ask: <code>Which java.util.TreeMap method answers "largest key strictly less than x"?</code> (<code>lowerKey</code>).</p>
<p><b>Where AI goes wrong:</b> claiming BST operations are "O(log N)" without the word <b>balanced</b>, forgetting to re-link (<code>insert(node.left, key)</code> without assigning the result, so the new node is lost), and silently allowing duplicates on both sides, which breaks search.</p>
<p><b>What you must still own:</b> the invariant (whole subtrees, not just children), the O(h) argument with the sorted-input worst case, and knowing when to reach for an ordered map vs a hash map in an answer.</p>`,
    problems: [{
      title: 'Insert into a Binary Search Tree',
      level: 'Medium',
      tags: ['bst', 'recursion'],
      companies: ['Amazon', 'Microsoft', 'Google'],
      statement: `<p>You are given the <code>root</code> of a BST and a value <code>val</code> that is <b>not</b> already in the tree. Insert it and return the root of the updated BST. Any valid BST is accepted, but the simplest one adds <code>val</code> as a new leaf.</p>`,
      constraints: `0 ≤ number of nodes ≤ 10<sup>4</sup>, −10<sup>8</sup> ≤ Node.val, val ≤ 10<sup>8</sup>, all values unique`,
      example: `<p>Input: <code>root = [4,2,7,1,3]</code>, val = ${H.c('g', '5')}</p>
<pre>
        4                    4
       / \\                 /   \\
      2   7      →        2     7
     / \\                 / \\   /
    1   3               1   3 [5]
</pre><p>Output: ${H.c('g', '[4,2,7,1,3,5]')}. <b>Why:</b> 5 &gt; 4 → go right to 7; 5 &lt; 7 → go left; empty → 5 becomes the left child of 7. Nothing else moves.</p>`,
      brute: {
        why: `<p>Brute: read every value with an inorder walk (O(N)), add the new value, sort (O(N log N)), and rebuild a whole new balanced BST from the sorted list. It works, but we touched all N nodes to add one, when the ordering tells us exactly where the new leaf belongs after h comparisons.</p>`,
        code: `
          TreeNode insertBrute(TreeNode root, int val) {
              List<Integer> all = new ArrayList<>();
              collect(root, all);                 // O(N)
              all.add(val);
              Collections.sort(all);              // O(N log N)
              return build(all, 0, all.size() - 1);
          }
          void collect(TreeNode n, List<Integer> out) {
              if (n == null) return;
              collect(n.left, out); out.add(n.val); collect(n.right, out);
          }
          TreeNode build(List<Integer> a, int lo, int hi) {
              if (lo > hi) return null;
              int mid = (lo + hi) >>> 1;          // middle element becomes the root
              return new TreeNode(a.get(mid), build(a, lo, mid - 1), build(a, mid + 1, hi));
          }`
      },
      mcq: {
        q: 'Where does a newly inserted value end up in a plain (non-balancing) BST?',
        options: ['Always at the root', 'Always as a new leaf, where the search for it falls off the tree', 'In the middle of the tree, pushing nodes down', 'At the end of the inorder list'],
        answer: 1,
        explain: 'The search path for a missing value ends at a null link; that link is exactly where the value must live to keep the BST rule, so it becomes a leaf. No existing node moves.'
      },
      hints: [
        `<p><b>Aha:</b> searching for <code>val</code> would fail at exactly one null link. That empty spot is the only place where <code>val</code> keeps every "left &lt; node &lt; right" promise.</p>`,
        `<p>No extra data structure. Recursively: <code>if (node == null) return new TreeNode(val)</code>; otherwise recurse into the correct side and <b>assign</b> the result back (<code>node.left = insert(node.left, val)</code>). Iteratively: walk with a <code>parent</code> pointer.</p>`,
        `<p><b>Traps:</b> empty tree → the new node is the root; forgetting to assign the recursive result loses the node. <b>Recipe:</b> insert(n): if n null → new node; if val &lt; n.val → n.left = insert(n.left) else n.right = insert(n.right); return n.</p>`
      ],
      tests: { sig: 'TreeNode int int -> TreeNode', fn: 'judge', check: "(args, out, exp) => { if (!Array.isArray(out)) out = []; const L = [], R = [], ok = out.length === 0 || out[0] !== null; const nodes = []; if (out.length && out[0] !== null) nodes.push(0); let i = 1; for (let k = 0; k < nodes.length && i < out.length; k++) { const p = nodes[k]; if (i < out.length && out[i] !== null) { L[p] = i; nodes.push(i); } i++; if (i < out.length && out[i] !== null) { R[p] = i; nodes.push(i); } i++; } const seq = []; const st = []; let x = nodes.length ? 0 : undefined; while (x !== undefined || st.length) { while (x !== undefined) { st.push(x); x = L[x]; } x = st.pop(); seq.push(out[x]); x = R[x]; } return ok && JSON.stringify(seq) === JSON.stringify(exp); }", harness: {
        java: "class Check {\n    // n > 0: right-leaning chain of n nodes, n < 0: left-leaning; node i (0 = root) holds val(i).\n    // Built here because a tree this deep is too big to write out as a test literal.\n    static TreeNode chain(int n, java.util.function.IntUnaryOperator val) {\n        TreeNode root = null;\n        for (int i = Math.abs(n) - 1; i >= 0; i--) {\n            TreeNode t = new TreeNode(val.applyAsInt(i));\n            if (n > 0) t.right = root; else t.left = root;\n            root = t;\n        }\n        return root;\n    }\n\n    static TreeNode judge(TreeNode root, int val, int n) {\n        if (n != 0) root = chain(n, i -> i);\n        return new Solution().insertIntoBST(root, val);\n    }\n}",
        python: "# n > 0: right-leaning chain of n nodes, n < 0: left-leaning; node i (0 = root) holds val(i).\ndef _chain(n, val):\n    root = None\n    for i in range(abs(n) - 1, -1, -1):\n        t = TreeNode(val(i))\n        if n > 0:\n            t.right = root\n        else:\n            t.left = root\n        root = t\n    return root\n\ndef judge(root, val, n):\n    if n:\n        root = _chain(n, lambda i: i)\n    return Solution().insert_into_bst(root, val)",
        js: "// n > 0: right-leaning chain of n nodes, n < 0: left-leaning; node i (0 = root) holds val(i).\nfunction chain__(n, val) {\n  let root = null;\n  for (let i = Math.abs(n) - 1; i >= 0; i--) {\n    const t = new TreeNode(val(i));\n    if (n > 0) t.right = root; else t.left = root;\n    root = t;\n  }\n  return root;\n}\n\nfunction judge(root, val, n) {\n  if (n) root = chain__(n, (i) => i);\n  return insertIntoBST(root, val);\n}",
        cpp: "// n > 0: right-leaning chain of n nodes, n < 0: left-leaning; node i (0 = root) holds val(i).\nTreeNode* chain__(int n, function<int(int)> val) {\n    TreeNode* root = nullptr;\n    for (int i = abs(n) - 1; i >= 0; i--) {\n        TreeNode* t = new TreeNode(val(i));\n        if (n > 0) t->right = root; else t->left = root;\n        root = t;\n    }\n    return root;\n}\n\nTreeNode* judge(TreeNode* root, int val, int n) {\n    if (n) root = chain__(n, [](int i) { return i; });\n    return Solution().insertIntoBST(root, val);\n}"
      }, cases: [
        [[[4,2,7,1,3],5,0],[1,2,3,4,5,7]],
        [[[],5,0],[5]],
        [[[40,20,60,10,30,50,70],25,0],[10,20,25,30,40,50,60,70]],
        [[[5],3,0],[3,5]],
        [[[5],8,0],[5,8]],
        [[[4,2,7,1,3,null,null,null,null,null,null],0,0],[0,1,2,3,4,7]],
        [[[-100000000,null,100000000],0,0],[-100000000,0,100000000]],
        [[[10,5,15,3,7,12,18],100000000,0],[3,5,7,10,12,15,18,100000000]],
        [[[],10000,10000],{'$range': [0,10001]}],
        [[[],-1,10000],{'$range': [-1,10000]}]
      ] },
      solution: {
        approach: `<p>Walk down like a search, remembering the last node you stood on; when the next link is empty, hang the new node there. A loop is enough (no recursion), so a skewed tree of 10<sup>4</sup> nodes cannot overflow the call stack.</p>`,
        code: `
          class Solution {
              public TreeNode insertIntoBST(TreeNode root, int val) {
                  TreeNode fresh = new TreeNode(val);
                  if (root == null) return fresh;               // empty tree: the new node is the root
                  TreeNode cur = root;
                  while (true) {
                      if (val < cur.val) {                      // belongs on the smaller side
                          if (cur.left == null) { cur.left = fresh; return root; }    // empty spot: new leaf
                          cur = cur.left;
                      } else {                                  // belongs on the bigger side
                          if (cur.right == null) { cur.right = fresh; return root; }
                          cur = cur.right;
                      }
                  }
              }
          }`,
        alt: [{ lang: 'python', code: `class Solution:
    def insert_into_bst(self, root, val):
        new = TreeNode(val)
        if root is None:
            return new
        cur = root
        while True:                      # iterative: O(1) extra space
            if val < cur.val:
                if cur.left is None:
                    cur.left = new
                    return root
                cur = cur.left
            else:
                if cur.right is None:
                    cur.right = new
                    return root
                cur = cur.right` }, { lang: 'js', code: `function insertIntoBST(root, val) {
  const node = new TreeNode(val);
  if (!root) return node;
  let cur = root;
  for (;;) {                         // iterative: O(1) extra space
    if (val < cur.val) {
      if (!cur.left) { cur.left = node; return root; }
      cur = cur.left;
    } else {
      if (!cur.right) { cur.right = node; return root; }
      cur = cur.right;
    }
  }
}
` }, { lang: 'cpp', code: `// LeetCode-style node (the judge normally provides it)
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(x), left(l), right(r) {}
};

class Solution {
public:
    TreeNode* insertIntoBST(TreeNode* root, int val) {
        // walk a pointer to the empty link where val belongs
        TreeNode** link = &root;
        while (*link) link = val < (*link)->val ? &(*link)->left : &(*link)->right;
        *link = new TreeNode(val);
        return root;
    }
};
` }],
        dry: {
          head: ['cur', 'compare', 'next link', 'action'],
          rows: [
            ['4', '5 &gt; 4', '4.right = 7', 'move to 7'],
            ['7', '5 &lt; 7', '7.left = null', H.c('g', 'create node 5 as 7.left')],
            ['—', '—', '—', H.c('p', 'return root 4 → [4,2,7,1,3,5]')]
          ]
        },
        complexity: `<p><b>Time O(h)</b>: one comparison per level — O(log N) if balanced, O(N) if skewed. <b>Space O(1)</b>: the loop keeps only <code>cur</code> (the recursive version needs O(h) call stack).</p>`,
        followUps: ['What if duplicates are allowed? (store a count, or send equal keys right consistently)', 'Keep the tree balanced after many inserts (AVL / red-black rotations)', 'Insert a whole sorted array so the tree is balanced (pick the middle as root)']
      }
    }]
  });
  /* ===================== TOPIC 11: BST delete ===================== */
  // Nodes with stable ids so highlights survive value copies during delete.
  var NID = 0;
  function idIns(r, v) {
    if (!r) return { id: 'n' + (NID++), val: v, left: null, right: null };
    if (v < r.val) r.left = idIns(r.left, v);
    else if (v > r.val) r.right = idIns(r.right, v);
    else throw new Error('Value ' + v + ' appears twice. Use distinct values for the BST.');
    return r;
  }
  function idArr(root) {
    var a = [], slot = {};
    (function go(n, i) {
      if (!n) return;
      if (i >= 31) throw new Error('The tree grew deeper than 5 levels, which will not fit on screen. Insert a middle value first so it stays bushy.');
      while (a.length <= i) a.push(null);
      a[i] = n.val; slot[n.id] = i;
      go(n.left, 2 * i + 1); go(n.right, 2 * i + 2);
    })(root, 0);
    return { arr: a, slot: slot };
  }
  function idHl(r, m) { var o = {}; for (var k in m) if (r.slot[k] !== undefined) o[r.slot[k]] = m[k]; return o; }
  function idInorder(n, out) { if (!n) return out; idInorder(n.left, out); out.push(n.val); idInorder(n.right, out); return out; }

  topics.push({
    title: 'BST Delete: Leaf, One Child, Two Children',
    analogy: `<p>Someone leaves a company with a strict <b>seniority chart</b> (juniors on the left, seniors on the right).</p>
<ul>
<li>An <b>intern with no reports</b> leaves → just remove their box.</li>
<li>A <b>manager with one report</b> leaves → that report moves up into the manager's spot; the order is still fine.</li>
<li>A <b>manager with two teams</b> leaves → you can't put two people in one chair. You promote the <b>"next in line"</b>: the most junior person in the senior team (the smallest value on the right). They fit perfectly between both teams. Then you fill <b>their</b> old chair, which is easy because they had at most one report.</li>
</ul>`,
    explain: `<p>First <b>find</b> the node (like a search). Then one of three cases:</p>
<pre>
              50
           /      \\
         30        70
        /  \\      /  \\
      20    40   60    80
                   \\
                    65
</pre>
${H.table(['Case', 'Example', 'What to do', 'Result'], [
  ['<b>1. Leaf</b> (no children)', 'delete 20', 'Return null to the parent: 30.left = null', '30 now has only 40'],
  ['<b>2. One child</b>', 'delete 60', 'Return the only child to the parent: 70.left = 65', '65 moves up with its whole subtree'],
  ['<b>3. Two children</b>', 'delete 50', 'Find the <b>inorder successor</b> = smallest in the right subtree (go right once, then left all the way): ' + H.c('p', '60') + '. Copy 60 into the node. Then delete 60 from the right subtree (it has no left child, so it is case 1 or 2).', 'root becomes 60, 65 takes 60\'s old spot']
])}
<p><b>Why the successor works:</b> it is bigger than everything on the left (it came from the right side) and smaller than everything else on the right (it is the minimum there). So it can sit in the root's chair without breaking any promise. The <b>inorder predecessor</b> (largest on the left) works equally well.</p>
<p><b>Why deleting the successor is easy:</b> the successor is the leftmost node of the right subtree, so it has <b>no left child</b>. At most one child → case 1 or case 2.</p>
<p>The recursive code returns "the new root of this subtree" from every call, and every parent re-links with <code>node.left = delete(node.left, key)</code>. That one habit handles all three cases, including deleting the root.</p>`,
    clues: [
      '"<b>Delete</b> a node / remove a key from a <b>BST</b> and return the root" → search, then the 3-case split.',
      '"Must still be a valid BST" → two-children case needs the <b>inorder successor</b> (or predecessor).',
      '"Return the (possibly new) <b>root</b>" → recursive re-link pattern <code>node.left = delete(node.left, key)</code>.',
      '"Delete is called many times / tree must stay fast" → mention self-balancing trees or lazy deletion.',
      '"Trim the BST to [low, high]" → same re-link pattern, deleting whole subtrees at once.'
    ],
    code: { lang: 'java', code: `
class BSTDelete {
    // Returns the root of this subtree after deleting key (if present).
    static TreeNode deleteNode(TreeNode node, int key) {
        if (node == null) return null;                       // key not found: nothing changes
        if (key < node.val) {
            node.left = deleteNode(node.left, key);          // it lives on the left
        } else if (key > node.val) {
            node.right = deleteNode(node.right, key);        // it lives on the right
        } else {
            // found it
            if (node.left == null) return node.right;        // case 1 (both null) or case 2 (only right)
            if (node.right == null) return node.left;        // case 2 (only left)
            // case 3: two children -> inorder successor = min of right subtree
            TreeNode succ = node.right;
            while (succ.left != null) succ = succ.left;
            node.val = succ.val;                             // copy successor into this chair
            node.right = deleteNode(node.right, succ.val);   // remove the successor's old copy
        }
        return node;
    }

    static void inorder(TreeNode n, StringBuilder sb) {
        if (n == null) return;
        inorder(n.left, sb); sb.append(n.val).append(' '); inorder(n.right, sb);
    }

    public static void main(String[] args) {
        TreeNode root = null;
        for (int v : new int[]{50, 30, 70, 20, 40, 60, 80, 65}) root = insert(root, v);
        root = deleteNode(root, 50);                       // two children
        StringBuilder sb = new StringBuilder();
        inorder(root, sb);
        System.out.println("root=" + root.val + " inorder=" + sb);  // root=60 inorder=20 30 40 60 65 70 80
    }

    static TreeNode insert(TreeNode n, int v) {
        if (n == null) return new TreeNode(v);
        if (v < n.val) n.left = insert(n.left, v); else n.right = insert(n.right, v);
        return n;
    }
}`, alt: [{ lang: 'python', run: true, code: `class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val, self.left, self.right = val, left, right

# Returns the root of this subtree after deleting key (if present).
def delete_node(node, key):
    if node is None:
        return None                          # key not found: nothing changes
    if key < node.val:
        node.left = delete_node(node.left, key)      # it lives on the left
    elif key > node.val:
        node.right = delete_node(node.right, key)    # it lives on the right
    else:
        if node.left is None:
            return node.right                # case 1 (both None) or case 2 (only right)
        if node.right is None:
            return node.left                 # case 2 (only left)
        succ = node.right                    # case 3: min of the right subtree
        while succ.left:
            succ = succ.left
        node.val = succ.val                  # copy successor into this chair
        node.right = delete_node(node.right, succ.val)   # remove its old copy
    return node

def insert(n, v):
    if n is None:
        return TreeNode(v)
    if v < n.val:
        n.left = insert(n.left, v)
    else:
        n.right = insert(n.right, v)
    return n

def inorder(n):
    return inorder(n.left) + [n.val] + inorder(n.right) if n else []

root = None
for v in [50, 30, 70, 20, 40, 60, 80, 65]:
    root = insert(root, v)
root = delete_node(root, 50)                 # two children
print("root=%d inorder=%s" % (root.val, inorder(root)))   # root=60 inorder=[20, 30, 40, 60, 65, 70, 80]
` }, { lang: 'js', run: true, code: `class TreeNode {
  constructor(val = 0, left = null, right = null) { this.val = val; this.left = left; this.right = right; }
}

// Returns the root of this subtree after deleting key (if present).
function deleteNode(node, key) {
  if (!node) return null;                          // key not found: nothing changes
  if (key < node.val) node.left = deleteNode(node.left, key);         // it lives on the left
  else if (key > node.val) node.right = deleteNode(node.right, key);  // it lives on the right
  else {
    if (!node.left) return node.right;             // case 1 (both null) or case 2 (only right)
    if (!node.right) return node.left;             // case 2 (only left)
    let succ = node.right;                         // case 3: min of the right subtree
    while (succ.left) succ = succ.left;
    node.val = succ.val;                           // copy successor into this chair
    node.right = deleteNode(node.right, succ.val); // remove its old copy
  }
  return node;
}

function insert(n, v) {
  if (!n) return new TreeNode(v);
  if (v < n.val) n.left = insert(n.left, v); else n.right = insert(n.right, v);
  return n;
}
const inorder = (n) => (n ? [...inorder(n.left), n.val, ...inorder(n.right)] : []);

let root = null;
for (const v of [50, 30, 70, 20, 40, 60, 80, 65]) root = insert(root, v);
root = deleteNode(root, 50);                       // two children
console.log('root=' + root.val + ' inorder=' + inorder(root).join(' '));   // root=60 inorder=20 30 40 60 65 70 80
` }, { lang: 'cpp', code: `// TreeNode as defined in the first lesson
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int v = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(v), left(l), right(r) {}
};

// Returns the root of this subtree after deleting key (if present).
TreeNode* deleteNode(TreeNode* node, int key) {
    if (!node) return nullptr;                            // key not found: nothing changes
    if (key < node->val) node->left = deleteNode(node->left, key);          // it lives on the left
    else if (key > node->val) node->right = deleteNode(node->right, key);   // it lives on the right
    else {
        if (!node->left) { TreeNode* r = node->right; delete node; return r; }   // case 1 or 2
        if (!node->right) { TreeNode* l = node->left; delete node; return l; }   // case 2
        TreeNode* succ = node->right;                     // case 3: min of the right subtree
        while (succ->left) succ = succ->left;
        node->val = succ->val;                            // copy successor into this chair
        node->right = deleteNode(node->right, succ->val); // remove its old copy
    }
    return node;
}

TreeNode* insert(TreeNode* n, int v) {
    if (!n) return new TreeNode(v);
    if (v < n->val) n->left = insert(n->left, v); else n->right = insert(n->right, v);
    return n;
}

void inorder(TreeNode* n, ostream& out) {
    if (!n) return;
    inorder(n->left, out); out << n->val << ' '; inorder(n->right, out);
}

int main() {
    TreeNode* root = nullptr;
    for (int v : {50, 30, 70, 20, 40, 60, 80, 65}) root = insert(root, v);
    root = deleteNode(root, 50);                          // two children
    cout << "root=" << root->val << " inorder=";
    inorder(root, cout);
    cout << '\\n';                                         // root=60 inorder=20 30 40 60 65 70 80
}
` }] },
    codeTitle: 'Recursive BST delete with the inorder successor',
    viz: {
      title: 'Delete step by step (with the call stack)',
      input: '50 30 70 20 40 60 80 65 | 50',
      inputLabel: 'values inserted into a BST | key to delete',
      gen: function (input) {
        var sp = splitBar(input, '');
        var vals = parseNums(sp[0], 'the BST values');
        if (vals.length > 20) throw new Error('Please use at most 20 values.');
        if (!sp[1]) throw new Error('After the | type the key to delete, e.g. "... | 50".');
        var key = parseNums(sp[1], 'the key to delete')[0];
        NID = 0;
        var root = null;
        vals.forEach(function (v) { root = idIns(root, v); });
        var F = [], cs = [], missing = false;
        function draw(narr, m, extra) {
          var r = idArr(root);
          var parts = [];
          parts.push(r.arr.length ? { type: 'tree', label: 'BST', arr: r.arr.slice(), hl: idHl(r, m || {}) } : { type: 'text', label: 'BST', html: '<i>empty tree</i>' });
          parts.push({ type: 'stack', label: 'Call stack: del(node, key)', items: cs.slice(), hl: cs.length ? o1(cs.length - 1, 'cur') : {} });
          parts.push({ type: 'array', label: 'inorder (must stay sorted)', values: idInorder(root, []) });
          if (extra) parts.push({ type: 'vars', vals: extra });
          F.push({ narr: narr, parts: parts });
        }
        draw('Our BST. We will delete <b>' + key + '</b>. Each call <code>del(node, key)</code> returns the new root of its subtree, and the parent re-links to whatever comes back.', {}, { key: key });
        function del(n, k) {
          if (!n) {
            cs.push('del(null, ' + k + ')');
            missing = true;
            draw('Reached an empty spot: <b>' + k + '</b> is not here → return null (nothing changes).', {}, { key: k });
            cs.pop();
            return null;
          }
          cs.push('del(' + n.val + ', ' + k + ')');
          var m = {};
          m[n.id] = 'cur';
          if (k < n.val) {
            draw('At <b>' + n.val + '</b>: ' + k + ' &lt; ' + n.val + ' → the key can only be on the left. Call <code>' + n.val + '.left = del(left, ' + k + ')</code>.', m, { key: k });
            n.left = del(n.left, k);
          } else if (k > n.val) {
            draw('At <b>' + n.val + '</b>: ' + k + ' &gt; ' + n.val + ' → go right. Call <code>' + n.val + '.right = del(right, ' + k + ')</code>.', m, { key: k });
            n.right = del(n.right, k);
          } else {
            m[n.id] = 'bad';
            if (!n.left && !n.right) {
              draw('Found <b>' + k + '</b>. It is a <b>leaf</b> (case 1) → return <b>null</b>; the parent simply forgets it.', m, { key: k, 'case': '1: leaf' });
              cs.pop();
              return null;
            }
            if (!n.left || !n.right) {
              var child = n.left || n.right, mm = cpy(m);
              mm[child.id] = 'ok';
              draw('Found <b>' + k + '</b>. It has <b>one child</b> (' + child.val + ') — case 2 → return that child; it moves up into ' + k + '\'s spot together with its whole subtree.', mm, { key: k, 'case': '2: one child' });
              cs.pop();
              return child;
            }
            var s = n.right, path = {};
            path[n.id] = 'bad';
            path[s.id] = 'win';
            draw('Found <b>' + k + '</b> with <b>two children</b> (case 3). We need the inorder <b>successor</b>: step right once to ' + s.val + '…', path, { key: k, 'case': '3: two children', succ: s.val });
            while (s.left) {
              s = s.left;
              path[s.id] = 'win';
              draw('…then keep going <b>left</b> to ' + s.val + ' (smaller values live on the left).', path, { key: k, 'case': '3: two children', succ: s.val });
            }
            path[s.id] = 'sel';
            draw('Successor = <b>' + s.val + '</b>: the smallest value bigger than ' + k + '. It has no left child, so removing it later is easy.', path, { key: k, succ: s.val });
            var sv = s.val;
            n.val = sv;
            var cm = {};
            cm[n.id] = 'sel'; cm[s.id] = 'bad';
            draw('Copy <b>' + sv + '</b> into the chair of ' + k + '. For a moment ' + sv + ' appears twice (red = old copy). Next: delete the old ' + sv + ' from the right subtree.', cm, { key: k, copied: sv });
            n.right = del(n.right, sv);
          }
          var back = {};
          back[n.id] = 'ok';
          draw('Back in <code>del(' + n.val + ')</code>: links fixed, return node ' + n.val + ' to its parent.', back, { key: k });
          cs.pop();
          return n;
        }
        root = del(root, key);
        var fin = idInorder(root, []);
        F.push({ narr: (missing ? 'Key ' + key + ' was not in the tree, so nothing changed. ' : 'Done. ') + (fin.length ? 'Inorder is still sorted (<b>' + fin.join(' ') + '</b>), so the tree is still a valid BST.' : 'The tree is now empty.') + ' Work done: one root-to-leaf walk (plus the successor walk) → O(h).', parts: [
          root ? { type: 'tree', label: 'BST after delete', arr: idArr(root).arr } : { type: 'text', label: 'BST after delete', html: '<i>empty tree</i>' },
          { type: 'array', label: 'inorder', values: fin }] });
        return F;
      }
    },
    examples: [
      {
        title: 'Case 1 — delete the leaf 20',
        html: `<p>50 → 30 → 20. 20 has no children, so <code>del(20)</code> returns null and 30 sets <code>30.left = null</code>. Inorder before: 20 30 40 50 60 65 70 80; after: ${H.c('g', '30 40 50 60 65 70 80')}. Try <code>50 30 70 20 40 60 80 65 | 20</code>.</p>`
      },
      {
        title: 'Case 2 — delete 60 (only a right child 65)',
        html: `<p><code>del(60)</code> returns its only child 65, so 70 sets <code>70.left = 65</code>. 65 is bigger than 50 and smaller than 70, exactly like 60 was, so the order holds. If 65 had its own children they would move up together with it — no other node changes.</p>`
      },
      {
        title: 'Case 3 — delete the root 50',
        html: `${H.table(['step', 'action', 'tree change'], [
  ['1', 'found 50: two children', '—'],
  ['2', 'successor: right to 70, left to 60, 60.left is null → stop', '—'],
  ['3', 'copy 60 into the root', 'root shows 60'],
  ['4', 'delete 60 from the right subtree: one child (65) → case 2', '70.left = 65'],
  ['5', 'result', H.c('g', 'inorder 20 30 40 60 65 70 80')]
])}`
      },
      {
        title: 'Predecessor version (mirror image)',
        html: `<p>Instead of the minimum on the right, use the <b>maximum on the left</b> (go left once, then right all the way). For deleting 50 that is ${H.c('p', '40')}. Both are correct; some implementations alternate between them to avoid always shrinking the same side.</p>`,
        code: { lang: 'java', code: `
TreeNode deleteWithPredecessor(TreeNode node, int key) {
    if (node == null) return null;
    if (key < node.val) node.left = deleteWithPredecessor(node.left, key);
    else if (key > node.val) node.right = deleteWithPredecessor(node.right, key);
    else {
        if (node.left == null) return node.right;
        if (node.right == null) return node.left;
        TreeNode pred = node.left;                       // max of the left subtree
        while (pred.right != null) pred = pred.right;
        node.val = pred.val;
        node.left = deleteWithPredecessor(node.left, pred.val);
    }
    return node;
}`, alt: [{ lang: 'python', code: `def delete_with_predecessor(node, key):
    if node is None:
        return None
    if key < node.val:
        node.left = delete_with_predecessor(node.left, key)
    elif key > node.val:
        node.right = delete_with_predecessor(node.right, key)
    else:
        if node.left is None:
            return node.right
        if node.right is None:
            return node.left
        pred = node.left                     # max of the left subtree
        while pred.right:
            pred = pred.right
        node.val = pred.val
        node.left = delete_with_predecessor(node.left, pred.val)
    return node
` }, { lang: 'js', code: `function deleteWithPredecessor(node, key) {
  if (!node) return null;
  if (key < node.val) node.left = deleteWithPredecessor(node.left, key);
  else if (key > node.val) node.right = deleteWithPredecessor(node.right, key);
  else {
    if (!node.left) return node.right;
    if (!node.right) return node.left;
    let pred = node.left;                    // max of the left subtree
    while (pred.right) pred = pred.right;
    node.val = pred.val;
    node.left = deleteWithPredecessor(node.left, pred.val);
  }
  return node;
}
` }, { lang: 'cpp', code: `// TreeNode as defined in the first lesson
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int v = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(v), left(l), right(r) {}
};

TreeNode* deleteWithPredecessor(TreeNode* node, int key) {
    if (!node) return nullptr;
    if (key < node->val) node->left = deleteWithPredecessor(node->left, key);
    else if (key > node->val) node->right = deleteWithPredecessor(node->right, key);
    else {
        if (!node->left) return node->right;
        if (!node->right) return node->left;
        TreeNode* pred = node->left;         // max of the left subtree
        while (pred->right) pred = pred->right;
        node->val = pred->val;
        node->left = deleteWithPredecessor(node->left, pred->val);
    }
    return node;
}
` }] }
      }
    ],
    deepDive: `<p><b>Copy value vs move node:</b> the code above copies the successor's value into the node. That is fine in interviews, but in real systems a node may carry a big payload or be referenced from elsewhere (an iterator, a handle). Then you <b>splice</b> the successor node itself into place by re-linking pointers instead of copying data. Java's <code>TreeMap</code> copies key/value into the entry; most C++ implementations relink nodes so iterators stay valid.</p>
<p><b>Cost:</b> finding the key is O(h); finding the successor continues down the same subtree, and deleting it is another walk from the right child — total O(h).</p>
<p><b>Long-term shape:</b> Hibbard's asymmetric deletion (always successor) tends to make random BSTs less balanced after many insert/delete rounds (average depth drifts toward √N in experiments). Alternating successor/predecessor helps; self-balancing trees fix it properly with rotations (AVL: O(log N) rotations worst case on delete; red-black: at most 3 rotations).</p>
<p><b>Lazy deletion:</b> databases and some caches only <b>mark</b> a key as deleted (a "tombstone") and clean up later in bulk. Deletes become O(h) searches with no restructuring, at the cost of wasted space until compaction (e.g. LSM-tree storage engines like RocksDB/Cassandra).</p>
<p><b>Edge cases to say out loud:</b> key not present (return root unchanged), deleting the root (the returned value becomes the new root — callers must use it), a tree with a single node (becomes empty), and duplicates (decide the policy first).</p>`,
    aiEra: `<p><b>What AI changes:</b> the 3-case delete is a known snippet; assistants produce it reliably. The interview value is in the explanation of <b>why</b> the successor keeps the BST valid and in handling the edge cases without hesitation.</p>
<p><b>Use AI as a partner:</b> <code>Write a property-based test: random inserts, random deletes, after every step assert that inorder is sorted and contains exactly the expected keys.</code> Run it against your own delete — this catches nearly every bug.</p>
<p><b>Where AI goes wrong:</b> finding the successor but then deleting it with a separate search from the <b>root</b> (still correct but confusing when values were copied), forgetting to return/assign the new subtree root, or writing "case 3: replace with the left child" which breaks the ordering.</p>
<p><b>What you must still own:</b> the three cases, the reason the successor has no left child, and the re-link pattern that makes deleting the root just another case.</p>`,
    problems: [{
      title: 'Delete Node in a BST',
      level: 'Medium',
      tags: ['bst', 'recursion'],
      companies: ['Amazon', 'Microsoft', 'Uber', 'Bloomberg'],
      statement: `<p>Given the <code>root</code> of a BST and a <code>key</code>, delete the node with that key (if it exists) and return the root of the updated tree, which must still be a valid BST.</p>`,
      constraints: `0 ≤ number of nodes ≤ 10<sup>4</sup>, −10<sup>5</sup> ≤ Node.val, key ≤ 10<sup>5</sup>, all values unique. Follow-up: O(h) time.`,
      example: `<p>Input: <code>root = [5,3,6,2,4,null,7]</code>, key = ${H.c('r', '3')}</p>
<pre>
        5                   5
       / \\                / \\
      3   6       →       4   6
     / \\   \\             /     \\
    2   4   7           2       7
</pre><p>Output: ${H.c('g', '[5,4,6,2,null,null,7]')}. <b>Why:</b> 3 has two children; its successor is ${H.c('p', '4')} (right once, no left child). Copy 4 into 3's place, then delete the old 4 (a leaf). Using the predecessor 2 instead gives <code>[5,2,6,null,4,null,7]</code> — also accepted.</p>`,
      brute: {
        why: `<p>Brute: collect all values by inorder (O(N)), drop the key, and rebuild a balanced BST from the remaining sorted list (O(N)). Correct, but it rebuilds the whole tree to remove one node and allocates N new nodes; the ordering already tells us the key's location in O(h).</p>`,
        code: `
          TreeNode deleteBrute(TreeNode root, int key) {
              List<Integer> keep = new ArrayList<>();
              collect(root, key, keep);                       // sorted, without the key
              return build(keep, 0, keep.size() - 1);
          }
          void collect(TreeNode n, int key, List<Integer> out) {
              if (n == null) return;
              collect(n.left, key, out);
              if (n.val != key) out.add(n.val);
              collect(n.right, key, out);
          }
          TreeNode build(List<Integer> a, int lo, int hi) {
              if (lo > hi) return null;
              int mid = (lo + hi) >>> 1;
              return new TreeNode(a.get(mid), build(a, lo, mid - 1), build(a, mid + 1, hi));
          }`
      },
      mcq: {
        q: 'The node to delete has two children. Which value can safely replace it?',
        options: ['Its left child', 'The smallest value in its right subtree (inorder successor)', 'The largest value in its right subtree', 'Any leaf of the tree'],
        answer: 1,
        explain: 'The successor is larger than everything on the left and smaller than everything else on the right, so every BST promise still holds. (The largest value on the LEFT — the predecessor — also works.) The left child may have its own right subtree with bigger values, so it is not safe.'
      },
      hints: [
        `<p><b>Aha:</b> deleting a leaf or a node with one child is trivial — return the other side. The only hard case is two children, and you can turn it into an easy case by swapping in the successor (which never has a left child).</p>`,
        `<p>Write <code>TreeNode deleteNode(node, key)</code> that returns the new root of the subtree; recurse left/right by comparison and re-link: <code>node.left = deleteNode(node.left, key)</code>. Successor: <code>s = node.right; while (s.left != null) s = s.left;</code></p>`,
        `<p><b>Traps:</b> key missing → return the tree unchanged; deleting the root → return value is the new root; after copying the successor's value, delete <b>that value</b> from <code>node.right</code> (not the original key). <b>Recipe:</b> null → null; compare and recurse; found: no left → return right; no right → return left; else copy min of right, delete it from right.</p>`
      ],
      tests: { sig: 'TreeNode int int -> TreeNode', fn: 'judge', check: "(args, out, exp) => { if (!Array.isArray(out)) out = []; const L = [], R = [], ok = out.length === 0 || out[0] !== null; const nodes = []; if (out.length && out[0] !== null) nodes.push(0); let i = 1; for (let k = 0; k < nodes.length && i < out.length; k++) { const p = nodes[k]; if (i < out.length && out[i] !== null) { L[p] = i; nodes.push(i); } i++; if (i < out.length && out[i] !== null) { R[p] = i; nodes.push(i); } i++; } const seq = []; const st = []; let x = nodes.length ? 0 : undefined; while (x !== undefined || st.length) { while (x !== undefined) { st.push(x); x = L[x]; } x = st.pop(); seq.push(out[x]); x = R[x]; } return ok && JSON.stringify(seq) === JSON.stringify(exp); }", harness: {
        java: "class Check {\n    // n > 0: right-leaning chain of n nodes, n < 0: left-leaning; node i (0 = root) holds val(i).\n    // Built here because a tree this deep is too big to write out as a test literal.\n    static TreeNode chain(int n, java.util.function.IntUnaryOperator val) {\n        TreeNode root = null;\n        for (int i = Math.abs(n) - 1; i >= 0; i--) {\n            TreeNode t = new TreeNode(val.applyAsInt(i));\n            if (n > 0) t.right = root; else t.left = root;\n            root = t;\n        }\n        return root;\n    }\n\n    static TreeNode judge(TreeNode root, int key, int n) {\n        if (n != 0) root = chain(n, i -> i);\n        return new Solution().deleteNode(root, key);\n    }\n}",
        python: "# n > 0: right-leaning chain of n nodes, n < 0: left-leaning; node i (0 = root) holds val(i).\ndef _chain(n, val):\n    root = None\n    for i in range(abs(n) - 1, -1, -1):\n        t = TreeNode(val(i))\n        if n > 0:\n            t.right = root\n        else:\n            t.left = root\n        root = t\n    return root\n\ndef judge(root, key, n):\n    if n:\n        root = _chain(n, lambda i: i)\n    return Solution().delete_node(root, key)",
        js: "// n > 0: right-leaning chain of n nodes, n < 0: left-leaning; node i (0 = root) holds val(i).\nfunction chain__(n, val) {\n  let root = null;\n  for (let i = Math.abs(n) - 1; i >= 0; i--) {\n    const t = new TreeNode(val(i));\n    if (n > 0) t.right = root; else t.left = root;\n    root = t;\n  }\n  return root;\n}\n\nfunction judge(root, key, n) {\n  if (n) root = chain__(n, (i) => i);\n  return deleteNode(root, key);\n}",
        cpp: "// n > 0: right-leaning chain of n nodes, n < 0: left-leaning; node i (0 = root) holds val(i).\nTreeNode* chain__(int n, function<int(int)> val) {\n    TreeNode* root = nullptr;\n    for (int i = abs(n) - 1; i >= 0; i--) {\n        TreeNode* t = new TreeNode(val(i));\n        if (n > 0) t->right = root; else t->left = root;\n        root = t;\n    }\n    return root;\n}\n\nTreeNode* judge(TreeNode* root, int key, int n) {\n    if (n) root = chain__(n, [](int i) { return i; });\n    return Solution().deleteNode(root, key);\n}"
      }, cases: [
        [[[5,3,6,2,4,null,7],3,0],[2,4,5,6,7]],
        [[[5,3,6,2,4,null,7],0,0],[2,3,4,5,6,7]],
        [[[],0,0],[]],
        [[[5],5,0],[]],
        [[[5,3,6,2,4,null,7],5,0],[2,3,4,6,7]],
        [[[5,3,6,2,4,null,7],7,0],[2,3,4,5,6]],
        [[[50,30,70,20,40,60,80,null,null,35,45,55,65],30,0],[20,35,40,45,50,55,60,65,70,80]],
        [[[2,1],2,0],[1]],
        [[[1,null,2],1,0],[2]],
        [[[-100000,null,100000],100000,0],[-100000]],
        [[[],9999,10000],{'$range': [0,9999]}],
        [[[],0,10000],{'$range': [1,10000]}],
        [[[],5000,10000],{'$concat': [{'$range': [0,5000]},{'$range': [5001,10000]}]}]
      ] },
      solution: {
        approach: `<p>Search for the key while remembering its parent; three cases at the target; the two-children case is reduced to an easy delete via the inorder successor (copy its value, then remove the successor, which has no left child). A loop does the walking, so a skewed tree of 10<sup>4</sup> nodes cannot overflow the call stack the way the recursive version can.</p>`,
        code: `
          class Solution {
              public TreeNode deleteNode(TreeNode root, int key) {
                  TreeNode parent = null, cur = root;
                  while (cur != null && cur.val != key) {         // search, remembering the parent
                      parent = cur;
                      cur = key < cur.val ? cur.left : cur.right;
                  }
                  if (cur == null) return root;                   // not found
                  if (cur.left != null && cur.right != null) {    // two children:
                      TreeNode sp = cur, succ = cur.right;        //   min of the right subtree
                      while (succ.left != null) { sp = succ; succ = succ.left; }
                      cur.val = succ.val;                         //   take its value
                      parent = sp; cur = succ;                    //   now remove the successor (no left child)
                  }
                  TreeNode child = cur.left != null ? cur.left : cur.right;   // leaf or one child
                  if (parent == null) return child;               // we removed the root
                  if (parent.left == cur) parent.left = child; else parent.right = child;
                  return root;
              }
          }`,
        alt: [{ lang: 'python', code: `class Solution:
    def delete_node(self, root, key):
        parent, cur = None, root
        while cur and cur.val != key:        # search, remembering the parent
            parent, cur = cur, (cur.left if key < cur.val else cur.right)
        if cur is None:
            return root                      # key not found
        if cur.left and cur.right:           # two children: copy the successor's value,
            sp, succ = cur, cur.right        # then delete the successor node instead
            while succ.left:
                sp, succ = succ, succ.left
            cur.val = succ.val
            parent, cur = sp, succ           # the successor has no left child
        child = cur.left or cur.right        # now cur has at most one child
        if parent is None:
            return child                     # we removed the root
        if parent.left is cur:
            parent.left = child
        else:
            parent.right = child
        return root
` }, { lang: 'js', code: `function deleteNode(root, key) {
  let parent = null, cur = root;
  while (cur && cur.val !== key) {               // search, remembering the parent
    parent = cur;
    cur = key < cur.val ? cur.left : cur.right;
  }
  if (!cur) return root;                         // key not found
  if (cur.left && cur.right) {                   // two children: copy the successor's value,
    let sp = cur, succ = cur.right;              // then delete the successor node instead
    while (succ.left) { sp = succ; succ = succ.left; }
    cur.val = succ.val;
    parent = sp; cur = succ;                     // the successor has no left child
  }
  const child = cur.left || cur.right;           // now cur has at most one child
  if (!parent) return child;                     // we removed the root
  if (parent.left === cur) parent.left = child; else parent.right = child;
  return root;
}
` }, { lang: 'cpp', code: `// LeetCode-style node (the judge normally provides it)
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(x), left(l), right(r) {}
};

class Solution {
public:
    TreeNode* deleteNode(TreeNode* root, int key) {
        if (!root) return nullptr;                       // not found
        if (key < root->val) root->left = deleteNode(root->left, key);
        else if (key > root->val) root->right = deleteNode(root->right, key);
        else {
            if (!root->left) { TreeNode* r = root->right; delete root; return r; }
            if (!root->right) { TreeNode* l = root->left; delete root; return l; }
            TreeNode* succ = root->right;                // two children:
            while (succ->left) succ = succ->left;        //   min of the right subtree
            root->val = succ->val;                       //   take its value
            root->right = deleteNode(root->right, succ->val);
        }
        return root;
    }
};
` }],
        dry: {
          head: ['step', 'situation', 'action', 'parent / cur'],
          rows: [
            ['search', '3 &lt; 5', 'go left', '5 / 3'],
            ['found 3', 'two children', 'successor = 4 (right once, no left); copy 4 into the node', '3 → now 4'],
            ['switch target', 'remove the old 4', 'parent = node (now 4), cur = old 4 (a leaf)', '4 / 4'],
            ['unlink', 'old 4 has no child', 'parent.right = null', H.c('p', 'root 5 → [5,4,6,2,null,null,7]')]
          ]
        },
        complexity: `<p><b>Time O(h)</b>: one walk to the key plus one walk to the successor in the same subtree. <b>Space O(1)</b>: the loop keeps two pointers (the recursive version needs O(h) call stack).</p>`,
        followUps: ['Do it iteratively with O(1) extra space', 'Delete all nodes outside [low, high] (Trim a BST)', 'Delete when duplicates are stored with a count field']
      }
    }]
  });
  /* ===================== TOPIC 12: Validate BST & k-th smallest ===================== */
  topics.push({
    title: 'Validate a BST & Find the K-th Smallest (Inorder Superpowers)',
    analogy: `<p><b>Validate:</b> a building has floors for different <b>age groups</b>. The front-door guard says "left wing: under 50, right wing: 50 and over". Inside the left wing another guard narrows it: "left: under 30, right: 30 to 49". Each guard passes a <b>range</b> down. A guest who is fine for <i>their</i> guard but breaks the front-door rule (a 35-year-old in the right wing) is still a violation — you must remember <b>all</b> the rules above you, not just your parent's.</p>
<p><b>K-th smallest:</b> people stand in a <b>queue sorted by height</b>. To find the 3rd shortest you don't sort anyone; you just count 1, 2, 3 from the front. A BST's inorder walk <i>is</i> that sorted queue.</p>`,
    explain: `<h4>Validate: the classic trap</h4>
<pre>
          5
         / \\
        1   6
           / \\
          3   7
</pre>
<p>Every parent–child pair looks fine (1 &lt; 5, 6 &gt; 5, 3 &lt; 6, 7 &gt; 6) but ${H.c('r', '3')} sits in the <b>right</b> subtree of 5, so it must be &gt; 5. ${H.c('r', 'Not a BST.')} Checking only children is wrong.</p>
<p><b>Fix 1 — pass a range down (preorder):</b> each node must satisfy <code>lo &lt; val &lt; hi</code>. Going left, the node's value becomes the new <code>hi</code>; going right, it becomes the new <code>lo</code>.</p>
${H.table(['node', 'allowed range', 'ok?'], [
  ['5', '(−∞, +∞)', H.c('g', 'yes')],
  ['1', '(−∞, 5)', H.c('g', 'yes')],
  ['6', '(5, +∞)', H.c('g', 'yes')],
  ['3', '(5, 6)', H.c('r', 'NO: 3 ≤ 5')]
])}
<p><b>Fix 2 — inorder must be strictly increasing:</b> walk inorder keeping the previous value; any <code>val ≤ prev</code> means invalid. Here inorder is 1 5 ${H.c('r', '3')} 6 7 → 3 ≤ 5 → invalid.</p>
<h4>K-th smallest: count during inorder</h4>
<p>Inorder visits a BST in sorted order, so the k-th node it writes is the answer. Use the iterative inorder and <b>stop</b> as soon as the counter hits k — no need to visit the rest. Cost O(h + k).</p>
${H.table(['BST from 5 3 6 2 4 1, k = 3', 'inorder so far', 'count'], [
  ['pop 1', '1', '1'],
  ['pop 2', '1 2', '2'],
  ['pop 3', '1 2 3', H.c('g', '3 → answer 3')]
])}`,
    clues: [
      '"Determine if it is a <b>valid BST</b>" → range (lo, hi) passed down, or strictly increasing inorder.',
      'Values can be the 32-bit extremes (−2<sup>31</sup> and 2<sup>31</sup> − 1) → use 64-bit bounds (<code>long</code> / <code>long long</code>), infinite bounds (Python / JavaScript) or "no bound" nulls, never ±2<sup>31</sup> sentinels.',
      '"<b>k-th smallest</b> / k-th largest in a BST" → inorder (or reverse inorder) with a counter and early stop.',
      '"Two nodes were <b>swapped by mistake</b>" / "minimum difference between any two nodes" → inorder neighbours.',
      '"BST is <b>modified often</b> and k-th is asked often" → store subtree sizes in each node → O(h) per query.'
    ],
    code: [{ lang: 'java', code: `
class InorderPowers {
    // VALIDATE with ranges. Long bounds so Integer.MIN_VALUE / MAX_VALUE nodes are fine.
    static boolean isValidBST(TreeNode root) {
        return valid(root, Long.MIN_VALUE, Long.MAX_VALUE);
    }
    static boolean valid(TreeNode n, long lo, long hi) {
        if (n == null) return true;                          // empty tree is a valid BST
        if (n.val <= lo || n.val >= hi) return false;       // breaks a rule from some ancestor
        return valid(n.left, lo, n.val)                      // left side: must be < n.val
            && valid(n.right, n.val, hi);                    // right side: must be > n.val
    }

    // VALIDATE with inorder: values must be strictly increasing.
    static Integer prev;                                     // null = nothing seen yet
    static boolean isValidInorder(TreeNode root) { prev = null; return inorder(root); }
    static boolean inorder(TreeNode n) {
        if (n == null) return true;
        if (!inorder(n.left)) return false;
        if (prev != null && n.val <= prev) return false;     // not strictly increasing
        prev = n.val;
        return inorder(n.right);
    }

    // K-TH SMALLEST: iterative inorder, stop at the k-th pop.
    static int kthSmallest(TreeNode root, int k) {
        Deque<TreeNode> st = new ArrayDeque<>();
        TreeNode cur = root;
        while (cur != null || !st.isEmpty()) {
            while (cur != null) { st.push(cur); cur = cur.left; }
            cur = st.pop();
            if (--k == 0) return cur.val;                    // this is the k-th in sorted order
            cur = cur.right;
        }
        throw new IllegalArgumentException("k is larger than the number of nodes");
    }
}`, alt: [{ lang: 'python', code: `import math

# VALIDATE with ranges. Infinite bounds, so any int value fits inside at the start.
def is_valid_bst(root):
    def valid(n, lo, hi):
        if n is None:
            return True                          # empty tree is a valid BST
        if not lo < n.val < hi:
            return False                         # breaks a rule from some ancestor
        return valid(n.left, lo, n.val) and valid(n.right, n.val, hi)
    return valid(root, -math.inf, math.inf)

# VALIDATE with inorder: values must be strictly increasing.
def is_valid_inorder(root):
    def inorder(n):                              # generator: yields values in sorted order
        if n:
            yield from inorder(n.left)
            yield n.val
            yield from inorder(n.right)
    vals = list(inorder(root))
    return all(a < b for a, b in zip(vals, vals[1:]))

# K-TH SMALLEST: iterative inorder, stop at the k-th pop.
def kth_smallest(root, k):
    stack, cur = [], root
    while cur or stack:
        while cur:
            stack.append(cur)
            cur = cur.left
        cur = stack.pop()
        k -= 1
        if k == 0:
            return cur.val                       # this is the k-th in sorted order
        cur = cur.right
    raise ValueError("k is larger than the number of nodes")
` }, { lang: 'js', code: `// VALIDATE with ranges. Infinite bounds, so any value fits inside at the start.
function isValidBST(root) {
  const valid = (n, lo, hi) => {
    if (!n) return true;                         // empty tree is a valid BST
    if (n.val <= lo || n.val >= hi) return false; // breaks a rule from some ancestor
    return valid(n.left, lo, n.val) && valid(n.right, n.val, hi);
  };
  return valid(root, -Infinity, Infinity);
}

// VALIDATE with inorder: values must be strictly increasing.
function isValidInorder(root) {
  let prev = null;                               // null = nothing seen yet
  const inorder = (n) => {
    if (!n) return true;
    if (!inorder(n.left)) return false;
    if (prev !== null && n.val <= prev) return false;   // not strictly increasing
    prev = n.val;
    return inorder(n.right);
  };
  return inorder(root);
}

// K-TH SMALLEST: iterative inorder, stop at the k-th pop.
function kthSmallest(root, k) {
  const stack = [];
  let cur = root;
  while (cur || stack.length) {
    while (cur) { stack.push(cur); cur = cur.left; }
    cur = stack.pop();
    if (--k === 0) return cur.val;               // this is the k-th in sorted order
    cur = cur.right;
  }
  throw new RangeError('k is larger than the number of nodes');
}
` }, { lang: 'cpp', code: `// TreeNode as defined in the first lesson
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int v = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(v), left(l), right(r) {}
};

// VALIDATE with ranges. long long bounds so INT_MIN / INT_MAX nodes are fine.
bool valid(TreeNode* n, long long lo, long long hi) {
    if (!n) return true;                             // empty tree is a valid BST
    if (n->val <= lo || n->val >= hi) return false;  // breaks a rule from some ancestor
    return valid(n->left, lo, n->val) && valid(n->right, n->val, hi);
}
bool isValidBST(TreeNode* root) { return valid(root, LLONG_MIN, LLONG_MAX); }

// VALIDATE with inorder: values must be strictly increasing.
bool inorderCheck(TreeNode* n, optional<int>& prev) {    // empty optional = nothing seen yet
    if (!n) return true;
    if (!inorderCheck(n->left, prev)) return false;
    if (prev && n->val <= *prev) return false;           // not strictly increasing
    prev = n->val;
    return inorderCheck(n->right, prev);
}
bool isValidInorder(TreeNode* root) { optional<int> prev; return inorderCheck(root, prev); }

// K-TH SMALLEST: iterative inorder, stop at the k-th pop.
int kthSmallest(TreeNode* root, int k) {
    stack<TreeNode*> st;
    TreeNode* cur = root;
    while (cur || !st.empty()) {
        while (cur) { st.push(cur); cur = cur->left; }
        cur = st.top(); st.pop();
        if (--k == 0) return cur->val;                   // this is the k-th in sorted order
        cur = cur->right;
    }
    throw invalid_argument("k is larger than the number of nodes");
}
` }] }, { lang: 'java', code: `
// FOLLOW-UP: k-th smallest in O(h) when the tree changes often.
// Every node stores the size of its subtree ("order-statistic tree").
class SizedNode {
    int val, size = 1;                    // size = nodes in this subtree, including me
    SizedNode left, right;
    SizedNode(int v) { val = v; }
}

class OrderStatisticBST {
    static int size(SizedNode n) { return n == null ? 0 : n.size; }

    static SizedNode insert(SizedNode n, int v) {
        if (n == null) return new SizedNode(v);
        if (v < n.val) n.left = insert(n.left, v); else n.right = insert(n.right, v);
        n.size = 1 + size(n.left) + size(n.right);        // keep sizes up to date on the way up
        return n;
    }

    // k is 1-based
    static int kth(SizedNode n, int k) {
        while (n != null) {
            int leftCount = size(n.left);
            if (k == leftCount + 1) return n.val;          // exactly leftCount smaller values -> me
            if (k <= leftCount) n = n.left;                 // answer is among the smaller values
            else { k -= leftCount + 1; n = n.right; }       // skip left side and me
        }
        throw new IllegalArgumentException("k out of range");
    }

    public static void main(String[] args) {
        SizedNode root = null;
        for (int v : new int[]{5, 3, 6, 2, 4, 1}) root = insert(root, v);
        System.out.println(kth(root, 3));   // 3
        System.out.println(kth(root, 6));   // 6
    }
}`, alt: [{ lang: 'python', run: true, code: `# FOLLOW-UP: k-th smallest in O(h) when the tree changes often.
# Every node stores the size of its subtree ("order-statistic tree").
class SizedNode:
    def __init__(self, val):
        self.val, self.size = val, 1         # size = nodes in this subtree, including me
        self.left = self.right = None

def size(n):
    return n.size if n else 0

def insert(n, v):
    if n is None:
        return SizedNode(v)
    if v < n.val:
        n.left = insert(n.left, v)
    else:
        n.right = insert(n.right, v)
    n.size = 1 + size(n.left) + size(n.right)   # keep sizes up to date on the way up
    return n

def kth(n, k):                               # k is 1-based
    while n:
        left_count = size(n.left)
        if k == left_count + 1:
            return n.val                     # exactly left_count smaller values -> me
        if k <= left_count:
            n = n.left                       # answer is among the smaller values
        else:
            k -= left_count + 1              # skip the left side and me
            n = n.right
    raise IndexError("k out of range")

root = None
for v in [5, 3, 6, 2, 4, 1]:
    root = insert(root, v)
print(kth(root, 3))   # 3
print(kth(root, 6))   # 6
` }, { lang: 'js', run: true, code: `// FOLLOW-UP: k-th smallest in O(h) when the tree changes often.
// Every node stores the size of its subtree ("order-statistic tree").
class SizedNode {
  constructor(val) { this.val = val; this.size = 1; this.left = null; this.right = null; }
}
const size = (n) => (n ? n.size : 0);

function insert(n, v) {
  if (!n) return new SizedNode(v);
  if (v < n.val) n.left = insert(n.left, v); else n.right = insert(n.right, v);
  n.size = 1 + size(n.left) + size(n.right);   // keep sizes up to date on the way up
  return n;
}

// k is 1-based
function kth(n, k) {
  while (n) {
    const leftCount = size(n.left);
    if (k === leftCount + 1) return n.val;     // exactly leftCount smaller values -> me
    if (k <= leftCount) n = n.left;            // answer is among the smaller values
    else { k -= leftCount + 1; n = n.right; }  // skip the left side and me
  }
  throw new RangeError('k out of range');
}

let root = null;
for (const v of [5, 3, 6, 2, 4, 1]) root = insert(root, v);
console.log(kth(root, 3));   // 3
console.log(kth(root, 6));   // 6
` }, { lang: 'cpp', code: `// FOLLOW-UP: k-th smallest in O(h) when the tree changes often.
// Every node stores the size of its subtree ("order-statistic tree").
struct SizedNode {
    int val, size = 1;                       // size = nodes in this subtree, including me
    SizedNode *left = nullptr, *right = nullptr;
    explicit SizedNode(int v) : val(v) {}
};

int size(SizedNode* n) { return n ? n->size : 0; }

SizedNode* insert(SizedNode* n, int v) {
    if (!n) return new SizedNode(v);
    if (v < n->val) n->left = insert(n->left, v); else n->right = insert(n->right, v);
    n->size = 1 + size(n->left) + size(n->right);   // keep sizes up to date on the way up
    return n;
}

// k is 1-based
int kth(SizedNode* n, int k) {
    while (n) {
        int leftCount = size(n->left);
        if (k == leftCount + 1) return n->val;     // exactly leftCount smaller values -> me
        if (k <= leftCount) n = n->left;           // answer is among the smaller values
        else { k -= leftCount + 1; n = n->right; } // skip the left side and me
    }
    throw out_of_range("k out of range");
}

int main() {
    SizedNode* root = nullptr;
    for (int v : {5, 3, 6, 2, 4, 1}) root = insert(root, v);
    cout << kth(root, 3) << '\\n';   // 3
    cout << kth(root, 6) << '\\n';   // 6
}
` }] }],
    codeTitle: ['Validate BST (two ways) + k-th smallest', 'Follow-up: subtree sizes for O(h) k-th queries'],
    viz: [{
      title: 'Validate with ranges passed down',
      input: '5 1 6 null null 3 7',
      inputLabel: 'Tree slots (level order, null = empty)',
      gen: function (input) {
        var a = parseTreeStr(input), F = [], cs = [], tags = {}, hl = {};
        function lo(x) { return x === null ? '−∞' : String(x); }
        function hi(x) { return x === null ? '+∞' : String(x); }
        function draw(narr, cur, cls, v) {
          var h = cpy(hl);
          if (cur !== undefined) h[cur] = cls || 'cur';
          F.push({ narr: narr, parts: [
            { type: 'tree', label: 'Tag = allowed range (lo, hi)', arr: a.slice(), hl: h, tags: cpy(tags) },
            { type: 'stack', label: 'Call stack: valid(node, lo, hi)', items: cs.slice(), hl: cs.length ? o1(cs.length - 1, 'cur') : {} },
            { type: 'vars', vals: v || {} }] });
        }
        draw('Each node gets an <b>allowed range</b> from its ancestors. The root may be anything: (−∞, +∞). Going left, my value becomes the upper limit; going right, it becomes the lower limit.');
        var ok = (function go(i, L, R) {
          if (!ex(a, i)) return true;
          cs.push('valid(' + a[i] + ', ' + lo(L) + ', ' + hi(R) + ')');
          tags[i] = '(' + lo(L) + ',' + hi(R) + ')';
          var good = (L === null || a[i] > L) && (R === null || a[i] < R);
          if (!good) {
            hl[i] = 'bad';
            draw('Node <b>' + a[i] + '</b> must be inside (' + lo(L) + ', ' + hi(R) + ') but it is not → <span class="c-r">rule broken by an ancestor\'s limit</span>. Return <b>false</b>.', i, 'bad', { node: a[i], lo: lo(L), hi: hi(R), ok: 'NO' });
            cs.pop();
            return false;
          }
          hl[i] = 'ok';
          draw('Node <b>' + a[i] + '</b> is inside (' + lo(L) + ', ' + hi(R) + ') ✓. Check its left side with range (' + lo(L) + ', ' + a[i] + ') and its right side with (' + a[i] + ', ' + hi(R) + ').', i, 'cur', { node: a[i], lo: lo(L), hi: hi(R), ok: 'yes' });
          if (!go(2 * i + 1, L, a[i])) {
            hl[i] = 'bad';
            draw('Left side of ' + a[i] + ' reported false → pass <b>false</b> up immediately.', i, 'bad');
            cs.pop();
            return false;
          }
          if (!go(2 * i + 2, a[i], R)) {
            hl[i] = 'bad';
            draw('Right side of ' + a[i] + ' reported false → pass <b>false</b> up immediately.', i, 'bad');
            cs.pop();
            return false;
          }
          draw('Both sides of ' + a[i] + ' are valid → return <b>true</b>.', i, 'ok');
          cs.pop();
          return true;
        })(0, null, null);
        draw(ok ? 'Every node fit its range → this <b>is</b> a valid BST.' : 'Some node broke a range → this is <b>NOT</b> a valid BST, even if every parent–child pair looked fine.', 0, ok ? 'sel' : 'bad', { answer: ok ? 'valid' : 'invalid' });
        return F;
      }
    }, {
      title: 'K-th smallest: iterative inorder with a counter',
      input: '5 3 6 2 4 1 | 3',
      inputLabel: 'values inserted into a BST | k',
      gen: function (input) {
        var sp = splitBar(input, '');
        var root = bstFrom(parseNums(sp[0], 'the BST values')), r = toArr(root);
        var n = Object.keys(r.idx).length;
        var k = sp[1] ? parseNums(sp[1], 'k')[0] : 1;
        if (k < 1 || k > n) throw new Error('k must be between 1 and ' + n + ' (the number of nodes).');
        var F = [], st = [], out = [], m = {}, cur = root, count = 0;
        function draw(narr, focus, cls) {
          var mm = cpy(m);
          st.forEach(function (x) { mm[x.val] = 'win'; });
          if (focus !== undefined) mm[focus] = cls || 'cur';
          F.push({ narr: narr, parts: [
            { type: 'tree', label: 'BST (blue = on stack, green = counted)', arr: r.arr.slice(), hl: hv(r, mm) },
            { type: 'stack', label: 'Explicit stack', items: st.map(function (x) { return x.val; }), hl: st.length ? o1(st.length - 1, 'cur') : {} },
            { type: 'array', label: 'sorted so far (inorder)', values: out.slice(), hl: out.length ? o1(out.length - 1, count === k ? 'sel' : 'ok') : {} },
            { type: 'vars', vals: { k: k, count: count }, hl: { count: count === k ? 'ok' : '' } }] });
        }
        draw('Inorder of a BST = values in sorted order. We run the iterative inorder and <b>count pops</b>; the k-th pop is the answer (k = ' + k + ').');
        while (cur || st.length) {
          var pushed = [];
          while (cur) { st.push(cur); pushed.push(cur.val); cur = cur.left; }
          if (pushed.length) draw('Slide left pushing <b>' + pushed.join(', ') + '</b>: smaller values are always further left, so the smallest unvisited value is at the bottom of this slide.');
          var p = st.pop();
          count++; out.push(p.val); m[p.val] = 'ok';
          if (count === k) {
            m[p.val] = 'sel';
            draw('Pop <b>' + p.val + '</b> → count = ' + count + ' = k → <span class="c-p">the ' + k + '-th smallest is ' + p.val + '</span>. We stop now; the rest of the tree is never visited.', p.val, 'sel');
            break;
          }
          draw('Pop <b>' + p.val + '</b>: count = ' + count + ' (need ' + k + '). Next, explore its right subtree' + (p.right ? ' starting at ' + p.right.val + '.' : ' — empty.'), p.val, 'ok');
          cur = p.right;
        }
        F.push({ narr: 'Answer: <b>' + out[out.length - 1] + '</b>. Work done: the slide down (h) plus k pops → O(h + k), not O(N).', parts: [
          { type: 'tree', label: 'BST', arr: r.arr.slice(), hl: hv(r, o1(out[out.length - 1], 'sel')) },
          { type: 'array', label: 'first k values in sorted order', values: out.slice(), hl: o1(out.length - 1, 'sel') }] });
        return F;
      }
    }],
    examples: [
      {
        title: 'Extreme values: [2147483647] and [-2147483648, null, 2147483647]',
        html: `<p>A single node with value 2<sup>31</sup> − 1 (Java <code>Integer.MAX_VALUE</code>, C++ <code>INT_MAX</code>) is a valid BST. If your code starts with <code>hi = Integer.MAX_VALUE</code> and checks <code>val &lt; hi</code>, it wrongly says ${H.c('r', 'false')}. Use 64-bit bounds (<code>Long.MIN_VALUE</code> / <code>LLONG_MIN</code>), bounds where <code>null</code> means "no limit", or <code>-inf</code> / <code>-Infinity</code> in Python / JavaScript. The second tree is valid too: MAX is right of MIN.</p>`
      },
      {
        title: 'Duplicates: [2, 2, 2] is NOT valid (strict BST)',
        html: `<p>The usual definition says <b>strictly</b> less on the left and <b>strictly</b> greater on the right. Inorder is 2 2 2 — not strictly increasing → ${H.c('r', 'invalid')}. Some textbooks allow "left ≤ node &lt; right"; ask the interviewer and adjust the comparison (<code>&lt;=</code> vs <code>&lt;</code>) to match.</p>`
      },
      {
        title: 'K-th LARGEST = reverse inorder (right, me, left)',
        html: `<p>Mirror the walk: slide <b>right</b>, pop, go <b>left</b>. For the BST of 5 3 6 2 4 1 the reverse inorder is 6 5 4 3 2 1, so the 2nd largest is ${H.c('g', '5')}. Equivalent: k-th largest = (N − k + 1)-th smallest, but that needs N first.</p>`,
        code: { lang: 'java', code: `
int kthLargest(TreeNode root, int k) {
    Deque<TreeNode> st = new ArrayDeque<>();
    TreeNode cur = root;
    while (cur != null || !st.isEmpty()) {
        while (cur != null) { st.push(cur); cur = cur.right; }   // slide RIGHT
        cur = st.pop();
        if (--k == 0) return cur.val;
        cur = cur.left;                                            // then go LEFT
    }
    return -1;   // k larger than the tree
}`, alt: [{ lang: 'python', code: `def kth_largest(root, k):
    stack, cur = [], root
    while cur or stack:
        while cur:                           # slide RIGHT
            stack.append(cur)
            cur = cur.right
        cur = stack.pop()
        k -= 1
        if k == 0:
            return cur.val
        cur = cur.left                       # then go LEFT
    return -1                                # k larger than the tree
` }, { lang: 'js', code: `function kthLargest(root, k) {
  const stack = [];
  let cur = root;
  while (cur || stack.length) {
    while (cur) { stack.push(cur); cur = cur.right; }   // slide RIGHT
    cur = stack.pop();
    if (--k === 0) return cur.val;
    cur = cur.left;                                      // then go LEFT
  }
  return -1;                                             // k larger than the tree
}
` }, { lang: 'cpp', code: `// TreeNode as defined in the first lesson
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int v = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(v), left(l), right(r) {}
};

int kthLargest(TreeNode* root, int k) {
    stack<TreeNode*> st;
    TreeNode* cur = root;
    while (cur || !st.empty()) {
        while (cur) { st.push(cur); cur = cur->right; }  // slide RIGHT
        cur = st.top(); st.pop();
        if (--k == 0) return cur->val;
        cur = cur->left;                                 // then go LEFT
    }
    return -1;                                           // k larger than the tree
}
` }] }
      },
      {
        title: 'Recover a BST where two nodes were swapped',
        html: `<p>Inorder of a correct BST: 1 2 3 4 5. Swap 2 and 4 → inorder ${H.c('r', '1 4 3 2 5')}. The "drops" (where a value is smaller than the previous one) are 4 → 3 and 3 → 2. The first wrong node is the <b>bigger</b> value of the first drop (${H.c('r', '4')}), the second is the <b>smaller</b> value of the last drop (${H.c('r', '2')}). Swap their values back. When the swapped nodes are neighbours in inorder there is only one drop — both nodes come from it.</p>`
      }
    ],
    deepDive: `<p><b>Why both validation methods are equivalent:</b> a binary tree is a BST exactly when its inorder sequence is strictly increasing. (⇒) by induction, inorder lists the left subtree (all smaller), then the node, then the right subtree (all bigger). (⇐) if some node X had a value in its left subtree ≥ X, that value appears before X in inorder, contradicting "increasing". The range method proves the same thing top-down.</p>
<p><b>Which to choose:</b> the range version stops at the first bad node and naturally handles "left ≤ node" variants by changing one comparison. The inorder version is shorter iteratively and reuses the iterative inorder you already know. Both are O(N) time, O(h) space.</p>
<p><b>Common wrong solutions</b> interviewers watch for: (1) comparing only with children; (2) using <code>int</code> sentinels ±2<sup>31</sup>; (3) a <code>static</code> <code>prev</code> that is not reset between test cases (fails on the online judge's second test); (4) computing max of left subtree and min of right subtree at every node without caching → O(N<sup>2</sup>) on skewed trees (fine if you return (min, max) bottom-up in one pass).</p>
<p><b>K-th smallest at scale:</b> one query is O(h + k). If the tree changes and k-th queries are frequent, augment each node with its <b>subtree size</b> (an order-statistic tree): k-th is then O(h) and so is <b>rank(x)</b> (how many values are smaller than x). Insert/delete must update sizes along the path. This is how databases answer <code>OFFSET</code>-style or percentile queries quickly, and it is the idea behind <b>Fenwick/segment trees</b> later.</p>
<p><b>Streaming alternative:</b> if values arrive in no particular order and you only need the k-th smallest, a <b>max-heap of size k</b> (next module) gives O(N log k) without any tree.</p>`,
    aiEra: `<p><b>What AI changes:</b> "Validate BST" is famous precisely because the obvious child-only check is wrong — and AI assistants still sometimes produce it or the <code>Integer.MIN_VALUE</code> sentinel bug. These are perfect problems to practise <b>reviewing</b> generated code.</p>
<p><b>Use AI as a partner:</b> <code>Here is my isValidBST. Give me the smallest tree on which it fails, or prove it is correct.</code> Also: <code>Generate the order-statistic (size-augmented) BST and explain how delete updates the sizes.</code></p>
<p><b>Where AI goes wrong:</b> child-only comparisons; non-strict comparisons (accepting duplicates); a class-level <code>prev</code> never reset; k-th smallest that collects the entire inorder list into an array (O(N) space and time even when k = 1).</p>
<p><b>What you must still own:</b> the counterexample tree (5, 1, 6, 3, 7), the equivalence "BST ⇔ strictly increasing inorder", and the subtree-size follow-up.</p>`,
    problems: [{
      title: 'Validate Binary Search Tree',
      level: 'Medium',
      tags: ['bst', 'dfs', 'inorder'],
      companies: ['Amazon', 'Meta', 'Microsoft', 'Bloomberg'],
      statement: `<p>Given the <code>root</code> of a binary tree, determine whether it is a valid BST: for every node, all values in its left subtree are <b>strictly less</b> and all values in its right subtree are <b>strictly greater</b>, and both subtrees are BSTs.</p>`,
      constraints: `1 ≤ number of nodes ≤ 10<sup>4</sup>, −2<sup>31</sup> ≤ Node.val ≤ 2<sup>31</sup> − 1`,
      example: `<p>Input: <code>root = [5,1,4,null,null,3,6]</code> → Output: ${H.c('r', 'false')} — the right child 4 is smaller than 5.</p>
<p>Input: <code>root = [5,1,6,null,null,3,7]</code> → Output: ${H.c('r', 'false')} — trickier: every parent–child pair is fine, but ${H.c('r', '3')} is in 5's right subtree and 3 &lt; 5.</p>
<p>Input: <code>root = [2,1,3]</code> → Output: ${H.c('g', 'true')}.</p>`,
      brute: {
        why: `<p>Brute: for every node, compute the max of its left subtree and the min of its right subtree with separate full traversals, and check <code>maxLeft &lt; node &lt; minRight</code>. Correct, but every node re-scans its subtrees → O(N<sup>2</sup>) on a skewed tree. The waste: the same subtree minimums/maximums are recomputed by each ancestor.</p>`,
        code: `
          boolean isValidBrute(TreeNode n) {
              if (n == null) return true;
              if (n.left != null && maxOf(n.left) >= n.val) return false;
              if (n.right != null && minOf(n.right) <= n.val) return false;
              return isValidBrute(n.left) && isValidBrute(n.right);
          }
          int maxOf(TreeNode n) {   // full scan of the subtree
              int m = n.val;
              if (n.left != null) m = Math.max(m, maxOf(n.left));
              if (n.right != null) m = Math.max(m, maxOf(n.right));
              return m;
          }
          int minOf(TreeNode n) {
              int m = n.val;
              if (n.left != null) m = Math.min(m, minOf(n.left));
              if (n.right != null) m = Math.min(m, minOf(n.right));
              return m;
          }`
      },
      mcq: {
        q: 'You move from node 50 to its RIGHT child, and the range passed into 50 was (30, 70). What range does the right child get?',
        options: ['(30, 50)', '(50, 70)', '(50, +∞)', '(−∞, 70)'],
        answer: 1,
        explain: 'Going right, the child must be bigger than 50 (new lower bound) and must still respect every older limit, including the upper bound 70 inherited from above.'
      },
      hints: [
        `<p><b>Aha:</b> a node is constrained by <b>all</b> its ancestors, not just its parent. Those constraints always collapse into a single open interval (lo, hi).</p>`,
        `<p>Recursive helper <code>valid(node, lo, hi)</code> with <code>long</code> bounds. Left child gets (lo, node.val); right child gets (node.val, hi). Alternatively: iterative inorder and compare with the previous value.</p>`,
        `<p><b>Traps:</b> values equal to ±2<sup>31</sup> (use long or null bounds); duplicates are invalid (use <code>&lt;=</code>/<code>&gt;=</code> for the failure test). <b>Recipe:</b> null → true; if val ≤ lo or val ≥ hi → false; return valid(left, lo, val) &amp;&amp; valid(right, val, hi).</p>`
      ],
      tests: { sig: 'TreeNode int -> bool', fn: 'judge', harness: {
        java: "class Check {\n    // n > 0: right-leaning chain of n nodes, n < 0: left-leaning; node i (0 = root) holds val(i).\n    // Built here because a tree this deep is too big to write out as a test literal.\n    static TreeNode chain(int n, java.util.function.IntUnaryOperator val) {\n        TreeNode root = null;\n        for (int i = Math.abs(n) - 1; i >= 0; i--) {\n            TreeNode t = new TreeNode(val.applyAsInt(i));\n            if (n > 0) t.right = root; else t.left = root;\n            root = t;\n        }\n        return root;\n    }\n\n    static boolean judge(TreeNode root, int n) {\n        if (n != 0) root = chain(n, i -> i);\n        return new Solution().isValidBST(root);\n    }\n}",
        python: "# n > 0: right-leaning chain of n nodes, n < 0: left-leaning; node i (0 = root) holds val(i).\ndef _chain(n, val):\n    root = None\n    for i in range(abs(n) - 1, -1, -1):\n        t = TreeNode(val(i))\n        if n > 0:\n            t.right = root\n        else:\n            t.left = root\n        root = t\n    return root\n\ndef judge(root, n):\n    if n:\n        root = _chain(n, lambda i: i)\n    return Solution().is_valid_bst(root)",
        js: "// n > 0: right-leaning chain of n nodes, n < 0: left-leaning; node i (0 = root) holds val(i).\nfunction chain__(n, val) {\n  let root = null;\n  for (let i = Math.abs(n) - 1; i >= 0; i--) {\n    const t = new TreeNode(val(i));\n    if (n > 0) t.right = root; else t.left = root;\n    root = t;\n  }\n  return root;\n}\n\nfunction judge(root, n) {\n  if (n) root = chain__(n, (i) => i);\n  return isValidBST(root);\n}",
        cpp: "// n > 0: right-leaning chain of n nodes, n < 0: left-leaning; node i (0 = root) holds val(i).\nTreeNode* chain__(int n, function<int(int)> val) {\n    TreeNode* root = nullptr;\n    for (int i = abs(n) - 1; i >= 0; i--) {\n        TreeNode* t = new TreeNode(val(i));\n        if (n > 0) t->right = root; else t->left = root;\n        root = t;\n    }\n    return root;\n}\n\nbool judge(TreeNode* root, int n) {\n    if (n) root = chain__(n, [](int i) { return i; });\n    return Solution().isValidBST(root);\n}"
      }, cases: [
        [[[5,1,4,null,null,3,6],0],false],
        [[[5,1,6,null,null,3,7],0],false],
        [[[2,1,3],0],true],
        [[[1],0],true],
        [[[2,2,2],0],false],
        [[[1,1],0],false],
        [[[2147483647],0],true],
        [[[-2147483647,null,2147483647],0],true],
        [[[2147483647,2147483646],0],true],
        [[[10,5,15,null,null,6,20],0],false],
        [[[3,1,5,0,2,4,6],0],true],
        [[[-455,-930,559,-974,-881,389,700,null,-964,null,-586,-140,429,613,978,null,null,-765,-467,-174,123,427,516,null,null,931,null,-839,-624,null,null,-385,null,110,326,394,null,null,null,794,null,null,-837,-726,null,-439,null,56,null,301,365,null,398,773,null,null,null,null,null,null,null,null,null,126,311,null,null,null,null,null,null,null,251,null,313,177],0],true],
        [[[],10000],true],
        [[[],-10000],false]
      ] },
      solution: {
        approach: `<p>Pass the allowed open interval down; fail as soon as a node falls outside it. The code keeps its own stack of (node, lo, hi) instead of recursing, because a skewed tree of 10<sup>4</sup> nodes would otherwise overflow the call stack.</p>`,
        code: `
          class Solution {
              // one pending check: this node must fit strictly inside (lo, hi)
              private record Frame(TreeNode node, long lo, long hi) {}

              public boolean isValidBST(TreeNode root) {
                  Deque<Frame> st = new ArrayDeque<>();
                  st.push(new Frame(root, Long.MIN_VALUE, Long.MAX_VALUE));   // long: int extremes still fit
                  while (!st.isEmpty()) {
                      Frame f = st.pop();
                      TreeNode n = f.node();
                      if (n.val <= f.lo() || n.val >= f.hi()) return false;   // outside the allowed window
                      if (n.left != null) st.push(new Frame(n.left, f.lo(), n.val));    // left: below me
                      if (n.right != null) st.push(new Frame(n.right, n.val, f.hi()));  // right: above me
                  }
                  return true;
              }
          }`,
        alt: [{ lang: 'python', code: `class Solution:
    def is_valid_bst(self, root):
        stack, prev, cur = [], None, root
        while cur or stack:
            while cur:                       # slide left
                stack.append(cur)
                cur = cur.left
            cur = stack.pop()
            if prev is not None and cur.val <= prev:
                return False                 # inorder must be strictly increasing
            prev = cur.val
            cur = cur.right
        return True` }, { lang: 'js', code: `function isValidBST(root) {
  // explicit stack of [node, lo, hi]: every node must sit strictly inside (lo, hi)
  const stack = root ? [[root, -Infinity, Infinity]] : [];
  while (stack.length) {
    const [n, lo, hi] = stack.pop();
    if (n.val <= lo || n.val >= hi) return false;   // outside the allowed window
    if (n.left) stack.push([n.left, lo, n.val]);
    if (n.right) stack.push([n.right, n.val, hi]);
  }
  return true;
}
` }, { lang: 'cpp', code: `// LeetCode-style node (the judge normally provides it)
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(x), left(l), right(r) {}
};

class Solution {
public:
    bool isValidBST(TreeNode* root) { return valid(root, LLONG_MIN, LLONG_MAX); }

private:
    // long long bounds, so INT_MIN / INT_MAX values are still inside the window
    bool valid(TreeNode* n, long long lo, long long hi) {
        if (!n) return true;
        if (n->val <= lo || n->val >= hi) return false;
        return valid(n->left, lo, n->val) && valid(n->right, n->val, hi);
    }
};
` }],
        dry: {
          head: ['step', 'lo', 'hi', 'check', 'result'],
          rows: [
            ['pop 5', '−∞', '+∞', '−∞ &lt; 5 &lt; +∞', H.c('g', 'ok, push 1 (−∞, 5) and 6 (5, +∞)')],
            ['pop 6', '5', '+∞', '6 inside', H.c('g', 'ok, push 3 (5, 6) and 7 (6, +∞)')],
            ['pop 7', '6', '+∞', '7 inside', H.c('g', 'ok, leaf')],
            ['pop 3', '5', '6', H.c('r', '3 ≤ 5'), H.c('r', 'false (answer)')]
          ]
        },
        complexity: `<p><b>Time O(N)</b>: each node is checked once (often fewer with early exit). <b>Space O(N)</b> worst case for the explicit stack (O(h) for the recursive form, which is N on a skewed tree).</p>`,
        followUps: ['Allow duplicates on the left (left ≤ node &lt; right)', 'Return the size of the largest subtree that is a valid BST', 'Recover a BST in which exactly two nodes were swapped']
      }
    }, {
      title: 'Kth Smallest Element in a BST',
      level: 'Medium',
      tags: ['bst', 'inorder', 'stack'],
      companies: ['Amazon', 'Google', 'Uber'],
      statement: `<p>Given the <code>root</code> of a BST and an integer <code>k</code>, return the <b>k-th smallest</b> value (1-indexed) among all node values.</p>`,
      constraints: `1 ≤ k ≤ n ≤ 10<sup>4</sup>, 0 ≤ Node.val ≤ 10<sup>4</sup>. Follow-up: the BST is modified often and you need k-th smallest frequently.`,
      example: `<p>Input: <code>root = [5,3,6,2,4,null,null,1]</code>, k = ${H.c('b', '3')} → Output: ${H.c('g', '3')}</p>
<pre>
          5
         / \\
        3   6
       / \\
      2   4
     /
    1
</pre><p><b>Why:</b> sorted values are 1, 2, ${H.c('g', '3')}, 4, 5, 6 — the third is 3. Inorder produces exactly this sequence, so we stop at the third value written.</p>`,
      brute: {
        why: `<p>Brute: collect every value (any traversal), sort the list, return element k − 1. O(N log N) time and O(N) memory, ignoring that a BST is already sorted. Slightly better: full inorder into a list (O(N)) — but still visits all N nodes even when k = 1.</p>`,
        code: `
          int kthSmallestBrute(TreeNode root, int k) {
              List<Integer> all = new ArrayList<>();
              collect(root, all);
              Collections.sort(all);            // ignores the BST order completely
              return all.get(k - 1);
          }
          void collect(TreeNode n, List<Integer> out) {
              if (n == null) return;
              out.add(n.val);
              collect(n.left, out);
              collect(n.right, out);
          }`
      },
      mcq: {
        q: 'Why can we stop the inorder walk as soon as the counter reaches k?',
        options: ['Because the stack is empty then', 'Because inorder of a BST produces values in increasing order, so the first k values written are the k smallest', 'Because the k-th node is always a leaf', 'Because the right subtree is always empty'],
        answer: 1,
        explain: 'Inorder = sorted order for a BST. The k-th value it produces is the k-th smallest; nothing visited later can be smaller.'
      },
      hints: [
        `<p><b>Aha:</b> a BST's inorder sequence is already sorted. The k-th smallest is simply the k-th node the inorder walk writes.</p>`,
        `<p>Use the iterative inorder (stack + slide left) and decrement k on every pop; return when it hits 0. This stops early instead of building a full list.</p>`,
        `<p><b>Traps:</b> k is 1-based; don't collect all values first. Follow-up: store subtree sizes so each query is O(h). <b>Recipe:</b> cur = root; loop: slide left pushing; pop; if --k == 0 return val; cur = popped.right.</p>`
      ],
      tests: { sig: 'TreeNode int -> int', fn: 'kthSmallest', cases: [
        [[[5,3,6,2,4,null,null,1],3],3],
        [[[3,1,4,null,2],1],1],
        [[[1],1],1],
        [[[5,3,6,2,4,null,null,1],6],6],
        [[[2,1,3],2],2],
        [[[0,null,10000],2],10000],
        [[[4982,901,8329,681,2335,6076,9259,433,null,2282,3956,6030,7402,8992,9626,74,null,1213,2333,2392,4300,5609,null,6107,7951,8380,9159,null,null,null,null,924,1858,null,null,null,3464,4133,4778,null,5836,null,6436,7790,8307,8371,8597,null,null,null,1157,1521,2072,3268,3502,null,4145,4431,null,null,null,null,null,null,7818,null,null,null,null,8467,null,934,null,null,null,null,2274,2432,null,null,null,null,null,null,null,null,null,null,8472,null,null,2152,null,null,2798],37],7790],
        [[[10000,9999,null,9998,null,9997,null,9996,null,9995,null,9994,null,9993,null,9992,null,9991,null,9990,null,9989,null,9988,null,9987,null,9986,null,9985,null,9984,null,9983,null,9982,null,9981,null,9980,null,9979,null,9978,null,9977,null,9976,null,9975,null,9974,null,9973,null,9972,null,9971,null,9970,null,9969,null,9968,null,9967,null,9966,null,9965,null,9964,null,9963,null,9962,null,9961,null,9960,null,9959,null,9958,null,9957,null,9956,null,9955,null,9954,null,9953,null,9952,null,9951,null,9950,null,9949,null,9948,null,9947,null,9946,null,9945,null,9944,null,9943,null,9942,null,9941,null,9940,null,9939,null,9938,null,9937,null,9936,null,9935,null,9934,null,9933,null,9932,null,9931,null,9930,null,9929,null,9928,null,9927,null,9926,null,9925,null,9924,null,9923,null,9922,null,9921,null,9920,null,9919,null,9918,null,9917,null,9916,null,9915,null,9914,null,9913,null,9912,null,9911,null,9910,null,9909,null,9908,null,9907,null,9906,null,9905,null,9904,null,9903,null,9902,null,9901,null,9900,null,9899,null,9898,null,9897,null,9896,null,9895,null,9894,null,9893,null,9892,null,9891,null,9890,null,9889,null,9888,null,9887,null,9886,null,9885,null,9884,null,9883,null,9882,null,9881,null,9880,null,9879,null,9878,null,9877,null,9876,null,9875,null,9874,null,9873,null,9872,null,9871,null,9870,null,9869,null,9868,null,9867,null,9866,null,9865,null,9864,null,9863,null,9862,null,9861,null,9860,null,9859,null,9858,null,9857,null,9856,null,9855,null,9854,null,9853,null,9852,null,9851,null,9850,null,9849,null,9848,null,9847,null,9846,null,9845,null,9844,null,9843,null,9842,null,9841,null,9840,null,9839,null,9838,null,9837,null,9836,null,9835,null,9834,null,9833,null,9832,null,9831,null,9830,null,9829,null,9828,null,9827,null,9826,null,9825,null,9824,null,9823,null,9822,null,9821,null,9820,null,9819,null,9818,null,9817,null,9816,null,9815,null,9814,null,9813,null,9812,null,9811,null,9810,null,9809,null,9808,null,9807,null,9806,null,9805,null,9804,null,9803,null,9802,null,9801,null,9800,null,9799,null,9798,null,9797,null,9796,null,9795,null,9794,null,9793,null,9792,null,9791,null,9790,null,9789,null,9788,null,9787,null,9786,null,9785,null,9784,null,9783,null,9782,null,9781,null,9780,null,9779,null,9778,null,9777,null,9776,null,9775,null,9774,null,9773,null,9772,null,9771,null,9770,null,9769,null,9768,null,9767,null,9766,null,9765,null,9764,null,9763,null,9762,null,9761,null,9760,null,9759,null,9758,null,9757,null,9756,null,9755,null,9754,null,9753,null,9752,null,9751,null,9750,null,9749,null,9748,null,9747,null,9746,null,9745,null,9744,null,9743,null,9742,null,9741,null,9740,null,9739,null,9738,null,9737,null,9736,null,9735,null,9734,null,9733,null,9732,null,9731,null,9730,null,9729,null,9728,null,9727,null,9726,null,9725,null,9724,null,9723,null,9722,null,9721,null,9720,null,9719,null,9718,null,9717,null,9716,null,9715,null,9714,null,9713,null,9712,null,9711,null,9710,null,9709,null,9708,null,9707,null,9706,null,9705,null,9704,null,9703,null,9702,null,9701,null,9700,null,9699,null,9698,null,9697,null,9696,null,9695,null,9694,null,9693,null,9692,null,9691,null,9690,null,9689,null,9688,null,9687,null,9686,null,9685,null,9684,null,9683,null,9682,null,9681,null,9680,null,9679,null,9678,null,9677,null,9676,null,9675,null,9674,null,9673,null,9672,null,9671,null,9670,null,9669,null,9668,null,9667,null,9666,null,9665,null,9664,null,9663,null,9662,null,9661,null,9660,null,9659,null,9658,null,9657,null,9656,null,9655,null,9654,null,9653,null,9652,null,9651,null,9650,null,9649,null,9648,null,9647,null,9646,null,9645,null,9644,null,9643,null,9642,null,9641,null,9640,null,9639,null,9638,null,9637,null,9636,null,9635,null,9634,null,9633,null,9632,null,9631,null,9630,null,9629,null,9628,null,9627,null,9626,null,9625,null,9624,null,9623,null,9622,null,9621,null,9620,null,9619,null,9618,null,9617,null,9616,null,9615,null,9614,null,9613,null,9612,null,9611,null,9610,null,9609,null,9608,null,9607,null,9606,null,9605,null,9604,null,9603,null,9602,null,9601,null,9600,null,9599,null,9598,null,9597,null,9596,null,9595,null,9594,null,9593,null,9592,null,9591,null,9590,null,9589,null,9588,null,9587,null,9586,null,9585,null,9584,null,9583,null,9582,null,9581,null,9580,null,9579,null,9578,null,9577,null,9576,null,9575,null,9574,null,9573,null,9572,null,9571,null,9570,null,9569,null,9568,null,9567,null,9566,null,9565,null,9564,null,9563,null,9562,null,9561,null,9560,null,9559,null,9558,null,9557,null,9556,null,9555,null,9554,null,9553,null,9552,null,9551,null,9550,null,9549,null,9548,null,9547,null,9546,null,9545,null,9544,null,9543,null,9542,null,9541,null,9540,null,9539,null,9538,null,9537,null,9536,null,9535,null,9534,null,9533,null,9532,null,9531,null,9530,null,9529,null,9528,null,9527,null,9526,null,9525,null,9524,null,9523,null,9522,null,9521,null,9520,null,9519,null,9518,null,9517,null,9516,null,9515,null,9514,null,9513,null,9512,null,9511,null,9510,null,9509,null,9508,null,9507,null,9506,null,9505,null,9504,null,9503,null,9502,null,9501],1],9501]
      ] },
      solution: {
        approach: `<p>Iterative inorder with a countdown; stop at the k-th pop.</p>`,
        code: `
          class Solution {
              public int kthSmallest(TreeNode root, int k) {
                  Deque<TreeNode> st = new ArrayDeque<>();
                  TreeNode cur = root;
                  while (cur != null || !st.isEmpty()) {
                      while (cur != null) {          // smallest unvisited values are down-left
                          st.push(cur);
                          cur = cur.left;
                      }
                      cur = st.pop();
                      if (--k == 0) return cur.val;  // k-th value in sorted order
                      cur = cur.right;
                  }
                  return -1;                         // unreachable when 1 <= k <= n
              }
          }`,
        alt: [{ lang: 'python', code: `class Solution:
    def kth_smallest(self, root, k):
        stack, cur = [], root
        while True:
            while cur:                       # smallest unvisited values are down-left
                stack.append(cur)
                cur = cur.left
            cur = stack.pop()
            k -= 1
            if k == 0:
                return cur.val               # k-th value in sorted order
            cur = cur.right
` }, { lang: 'js', code: `function kthSmallest(root, k) {
  const stack = [];
  let cur = root;
  while (cur || stack.length) {
    while (cur) { stack.push(cur); cur = cur.left; }   // smallest values are down-left
    cur = stack.pop();
    if (--k === 0) return cur.val;                     // k-th value in sorted order
    cur = cur.right;
  }
  return -1;                                           // unreachable when 1 <= k <= n
}
` }, { lang: 'cpp', code: `// LeetCode-style node (the judge normally provides it)
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(x), left(l), right(r) {}
};

class Solution {
public:
    int kthSmallest(TreeNode* root, int k) {
        stack<TreeNode*> st;
        TreeNode* cur = root;
        while (cur || !st.empty()) {
            while (cur) { st.push(cur); cur = cur->left; }   // smallest values are down-left
            cur = st.top(); st.pop();
            if (--k == 0) return cur->val;                  // k-th value in sorted order
            cur = cur->right;
        }
        return -1;                                          // unreachable when 1 <= k <= n
    }
};
` }],
        dry: {
          head: ['step', 'stack (bottom→top)', 'pop', 'k after', 'next cur'],
          rows: [
            ['slide', '[5, 3, 2, 1]', '—', '3', '—'],
            ['1', '[5, 3, 2]', '1', '2', 'null'],
            ['2', '[5, 3]', '2', '1', 'null'],
            ['3', '[5]', '3', H.c('g', '0 → return 3'), '—']
          ]
        },
        complexity: `<p><b>Time O(h + k)</b>: slide down once, then k pops (each pop's right-subtree slide is paid for by later pops). <b>Space O(h)</b>. Follow-up with subtree sizes: O(h) per query and per update.</p>`,
        followUps: ['k-th largest (reverse inorder)', 'Frequent inserts/deletes + frequent queries → subtree sizes (order-statistic tree)', 'Find the median of a BST in O(h) extra space']
      }
    }]
  });
  /* ===================== TOPIC 13: Construct from traversals ===================== */
  topics.push({
    title: 'Construct a Tree from Traversals (Preorder/Postorder + Inorder)',
    analogy: `<p>A team photo was taken, and you also have the <b>speaking order</b> at the meeting. The rule at this company: <b>the boss of every group speaks first</b> (that is preorder). In the photo, every boss stands <b>between</b> their left team and their right team (that is inorder).</p>
<p>So: the first speaker is the big boss. Find them in the photo — everyone standing to their left is the left team, everyone to their right is the right team. The next speaker is the boss of the left team, and you repeat inside that smaller group. Two clues together rebuild the whole org chart.</p>`,
    explain: `<p><b>Preorder</b> tells you <b>who the root is</b> (always the first value). <b>Inorder</b> tells you <b>who is left and who is right</b> of that root. Together they pin down the tree exactly (when values are distinct).</p>
<p>Example: preorder ${H.c('p', '[3, 9, 20, 15, 7]')}, inorder ${H.c('b', '[9, 3, 15, 20, 7]')}.</p>
${H.table(['step', 'next preorder value = root', 'inorder window', 'left part', 'right part'], [
  ['1', H.c('p', '3'), '[9, 3, 15, 20, 7]', '[9]', '[15, 20, 7]'],
  ['2', H.c('p', '9'), '[9]', '—', '—'],
  ['3', H.c('p', '20'), '[15, 20, 7]', '[15]', '[7]'],
  ['4', H.c('p', '15'), '[15]', '—', '—'],
  ['5', H.c('p', '7'), '[7]', '—', '—']
])}
<pre>
        3
       / \\
      9   20
         /  \\
        15    7
</pre>
<p><b>Recipe:</b> keep a pointer into preorder. <code>build(lo, hi)</code> builds the subtree whose inorder values are <code>in[lo..hi]</code>: take the next preorder value as the root, find its index <code>m</code> in inorder (a <b>hash map</b> — <code>HashMap</code> / <code>dict</code> / <code>Map</code> / <code>unordered_map</code> — makes this O(1)), build the left from <code>in[lo..m−1]</code>, then the right from <code>in[m+1..hi]</code>. The left must be built first, because preorder lists the whole left subtree before the right one.</p>
<ul>
<li><b>Postorder + inorder:</b> the root is the <b>last</b> value. Read postorder from the end, and build the <b>right</b> subtree first (backwards postorder is Me, Right, Left).</li>
<li><b>Preorder + postorder:</b> not unique in general (a single child could be left or right) — only unique for full binary trees.</li>
<li><b>BST from preorder alone:</b> enough, because the BST's inorder is just the sorted preorder. Even better: use an upper bound and build in O(N).</li>
</ul>`,
    clues: [
      '"<b>Construct</b> / <b>build</b> / reconstruct the binary tree from its <b>preorder and inorder</b> (or inorder and postorder)" → root from pre/post, split by inorder index.',
      '"All values are <b>unique</b>" → you can map value → inorder index with a hash map (O(1) lookups).',
      'N up to 3000 or more → avoid linear search for the root and array copies (O(N<sup>2</sup>)); use indices + map → O(N).',
      '"Construct BST from <b>preorder</b>" → only one traversal needed; use an upper-bound recursion, O(N).',
      '"<b>Serialize / deserialize</b>" → preorder with null markers is enough by itself.'
    ],
    code: [{ lang: 'java', code: `
class BuildTrees {
    // ---------- preorder + inorder ----------
    private int preIdx;                          // next preorder value to use as a root
    private Map<Integer, Integer> inPos;         // value -> index in inorder

    public TreeNode buildPreIn(int[] preorder, int[] inorder) {
        inPos = new HashMap<>();
        for (int i = 0; i < inorder.length; i++) inPos.put(inorder[i], i);
        preIdx = 0;
        return buildPI(preorder, 0, inorder.length - 1);
    }
    // builds the subtree whose inorder values are inorder[lo..hi]
    private TreeNode buildPI(int[] pre, int lo, int hi) {
        if (lo > hi) return null;                // empty window -> no subtree
        TreeNode root = new TreeNode(pre[preIdx++]);
        int m = inPos.get(root.val);             // split point in inorder
        root.left = buildPI(pre, lo, m - 1);     // left FIRST: preorder lists it next
        root.right = buildPI(pre, m + 1, hi);
        return root;
    }

    // ---------- inorder + postorder ----------
    private int postIdx;
    public TreeNode buildInPost(int[] inorder, int[] postorder) {
        inPos = new HashMap<>();
        for (int i = 0; i < inorder.length; i++) inPos.put(inorder[i], i);
        postIdx = postorder.length - 1;          // root is the LAST postorder value
        return buildIP(postorder, 0, inorder.length - 1);
    }
    private TreeNode buildIP(int[] post, int lo, int hi) {
        if (lo > hi) return null;
        TreeNode root = new TreeNode(post[postIdx--]);
        int m = inPos.get(root.val);
        root.right = buildIP(post, m + 1, hi);   // RIGHT first: backwards postorder = Me, Right, Left
        root.left = buildIP(post, lo, m - 1);
        return root;
    }

    // ---------- BST from preorder only, O(N) ----------
    private int bi;
    public TreeNode bstFromPreorder(int[] pre) {
        bi = 0;
        return buildB(pre, Integer.MAX_VALUE);
    }
    // builds a subtree using values while they are < bound
    private TreeNode buildB(int[] pre, int bound) {
        if (bi == pre.length || pre[bi] > bound) return null;
        TreeNode root = new TreeNode(pre[bi++]);
        root.left = buildB(pre, root.val);       // left values must be < root
        root.right = buildB(pre, bound);         // right values only need to be < my bound
        return root;
    }
}`, alt: [{ lang: 'python', code: `# ---------- preorder + inorder ----------
def build_pre_in(preorder, inorder):
    pos = {v: i for i, v in enumerate(inorder)}  # value -> index in inorder
    it = iter(preorder)                          # next preorder value = next root
    def build(lo, hi):                           # subtree whose inorder values are inorder[lo..hi]
        if lo > hi:
            return None                          # empty window -> no subtree
        root = TreeNode(next(it))
        m = pos[root.val]                        # split point in inorder
        root.left = build(lo, m - 1)             # left FIRST: preorder lists it next
        root.right = build(m + 1, hi)
        return root
    return build(0, len(inorder) - 1)

# ---------- inorder + postorder ----------
def build_in_post(inorder, postorder):
    pos = {v: i for i, v in enumerate(inorder)}
    it = reversed(postorder)                     # root is the LAST postorder value
    def build(lo, hi):
        if lo > hi:
            return None
        root = TreeNode(next(it))
        m = pos[root.val]
        root.right = build(m + 1, hi)            # RIGHT first: backwards postorder = Me, Right, Left
        root.left = build(lo, m - 1)
        return root
    return build(0, len(inorder) - 1)

# ---------- BST from preorder only, O(N) ----------
def bst_from_preorder(pre):
    i = 0
    def build(bound):                            # uses values while they are < bound
        nonlocal i
        if i == len(pre) or pre[i] > bound:
            return None
        root = TreeNode(pre[i])
        i += 1
        root.left = build(root.val)              # left values must be < root
        root.right = build(bound)                # right values only need to be < my bound
        return root
    return build(float('inf'))
` }, { lang: 'js', code: `// ---------- preorder + inorder ----------
function buildPreIn(preorder, inorder) {
  const pos = new Map(inorder.map((v, i) => [v, i]));   // value -> index in inorder
  let pre = 0;                                          // next preorder value = next root
  const build = (lo, hi) => {                           // subtree for inorder[lo..hi]
    if (lo > hi) return null;                           // empty window -> no subtree
    const root = new TreeNode(preorder[pre++]);
    const m = pos.get(root.val);                        // split point in inorder
    root.left = build(lo, m - 1);                       // left FIRST: preorder lists it next
    root.right = build(m + 1, hi);
    return root;
  };
  return build(0, inorder.length - 1);
}

// ---------- inorder + postorder ----------
function buildInPost(inorder, postorder) {
  const pos = new Map(inorder.map((v, i) => [v, i]));
  let post = postorder.length - 1;                      // root is the LAST postorder value
  const build = (lo, hi) => {
    if (lo > hi) return null;
    const root = new TreeNode(postorder[post--]);
    const m = pos.get(root.val);
    root.right = build(m + 1, hi);                      // RIGHT first: backwards postorder = Me, Right, Left
    root.left = build(lo, m - 1);
    return root;
  };
  return build(0, inorder.length - 1);
}

// ---------- BST from preorder only, O(N) ----------
function bstFromPreorder(pre) {
  let i = 0;
  const build = (bound) => {                            // uses values while they are < bound
    if (i === pre.length || pre[i] > bound) return null;
    const root = new TreeNode(pre[i++]);
    root.left = build(root.val);                        // left values must be < root
    root.right = build(bound);                          // right values only need to be < my bound
    return root;
  };
  return build(Infinity);
}
` }, { lang: 'cpp', code: `// TreeNode as defined in the first lesson
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int v = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(v), left(l), right(r) {}
};

class BuildTrees {
    unordered_map<int, int> inPos;               // value -> index in inorder
    int idx = 0;                                 // next value to use as a root

    // builds the subtree whose inorder values are inorder[lo..hi]
    TreeNode* buildPI(const vector<int>& pre, int lo, int hi) {
        if (lo > hi) return nullptr;             // empty window -> no subtree
        TreeNode* root = new TreeNode(pre[idx++]);
        int m = inPos[root->val];                // split point in inorder
        root->left = buildPI(pre, lo, m - 1);    // left FIRST: preorder lists it next
        root->right = buildPI(pre, m + 1, hi);
        return root;
    }
    TreeNode* buildIP(const vector<int>& post, int lo, int hi) {
        if (lo > hi) return nullptr;
        TreeNode* root = new TreeNode(post[idx--]);
        int m = inPos[root->val];
        root->right = buildIP(post, m + 1, hi);  // RIGHT first: backwards postorder = Me, Right, Left
        root->left = buildIP(post, lo, m - 1);
        return root;
    }
    // builds a subtree using values while they are < bound
    TreeNode* buildB(const vector<int>& pre, int bound) {
        if (idx == (int)pre.size() || pre[idx] > bound) return nullptr;
        TreeNode* root = new TreeNode(pre[idx++]);
        root->left = buildB(pre, root->val);     // left values must be < root
        root->right = buildB(pre, bound);        // right values only need to be < my bound
        return root;
    }
    void index(const vector<int>& inorder) {
        inPos.clear();
        for (int i = 0; i < (int)inorder.size(); i++) inPos[inorder[i]] = i;
    }

public:
    TreeNode* buildPreIn(const vector<int>& preorder, const vector<int>& inorder) {
        index(inorder);
        idx = 0;
        return buildPI(preorder, 0, (int)inorder.size() - 1);
    }
    TreeNode* buildInPost(const vector<int>& inorder, const vector<int>& postorder) {
        index(inorder);
        idx = (int)postorder.size() - 1;         // root is the LAST postorder value
        return buildIP(postorder, 0, (int)inorder.size() - 1);
    }
    TreeNode* bstFromPreorder(const vector<int>& pre) {
        idx = 0;
        return buildB(pre, INT_MAX);
    }
};
` }] }],
    codeTitle: ['Build from preorder+inorder, inorder+postorder, and a BST from preorder'],
    viz: {
      title: 'Rebuild the tree from preorder + inorder',
      input: '3 9 20 15 7 | 9 3 15 20 7',
      inputLabel: 'preorder | inorder (distinct values)',
      gen: function (input) {
        var sp = splitBar(input, '');
        if (!sp[1]) throw new Error('Type the preorder, then |, then the inorder. Example: "3 9 20 15 7 | 9 3 15 20 7".');
        var pre = parseNums(sp[0], 'the preorder'), ino = parseNums(sp[1], 'the inorder');
        if (pre.length !== ino.length) throw new Error('Both lists must have the same length.');
        if (pre.length > 15) throw new Error('Please use at most 15 values.');
        var pos = {};
        ino.forEach(function (v, i) {
          if (pos[v] !== undefined) throw new Error('Values must be distinct (' + v + ' repeats).');
          pos[v] = i;
        });
        pre.forEach(function (v) { if (pos[v] === undefined) throw new Error(v + ' is in the preorder but not in the inorder.'); });
        var F = [], arr = [], cs = [], pi = 0, made = {};
        function treePart(hlSlot) {
          if (!arr.length) return { type: 'text', label: 'Tree being built', html: '<i>nothing yet</i>' };
          var h = {};
          for (var k in made) h[k] = 'done';
          if (hlSlot !== undefined) h[hlSlot] = 'ok';
          return { type: 'tree', label: 'Tree being built', arr: arr.slice(), hl: h };
        }
        function draw(narr, lo, hi, m, slot) {
          var phl = {}, pptr = {}, ihl = {};
          for (var j = 0; j < pi; j++) phl[j] = 'done';
          if (pi > 0 && m !== undefined) { phl[pi - 1] = 'sel'; pptr[pi - 1] = 'root'; }
          else if (pi < pre.length) pptr[pi] = 'next';
          if (m !== undefined) {
            for (var t = lo; t < m; t++) ihl[t] = 'win';
            for (var u = m + 1; u <= hi; u++) ihl[u] = 'cur';
            ihl[m] = 'sel';
          }
          F.push({ narr: narr, parts: [
            { type: 'array', label: 'preorder (root comes first)', values: pre.slice(), hl: phl, ptr: pptr },
            { type: 'array', label: 'inorder (blue = left part, amber = right part)', values: ino.slice(), hl: ihl, range: lo !== undefined && lo <= hi ? [lo, hi] : undefined, ptr: m !== undefined ? o1(m, 'm') : {} },
            treePart(slot),
            { type: 'stack', label: 'Call stack: build(lo..hi)', items: cs.slice(), hl: cs.length ? o1(cs.length - 1, 'cur') : {} }] });
        }
        draw('Preorder starts with the root of the whole tree. Inorder shows, for any root, who is on its left and who is on its right. We call <code>build(0..' + (ino.length - 1) + ')</code> for the whole inorder window.');
        function build(lo, hi, slot) {
          if (lo > hi) return;
          if (pi >= pre.length) throw new Error('These two lists cannot come from the same tree.');
          var v = pre[pi++], m = pos[v];
          if (m < lo || m > hi) throw new Error('These two lists cannot come from the same tree (' + v + ' is outside its inorder window).');
          if (slot >= 31) throw new Error('This tree is deeper than 5 levels and will not fit on screen. Try a bushier tree.');
          while (arr.length <= slot) arr.push(null);
          arr[slot] = v;
          cs.push('build(' + lo + '..' + hi + ') → ' + v);
          var nl = m - lo, nr = hi - m;
          draw('Next preorder value <b>' + v + '</b> is the root of window in[' + lo + '..' + hi + ']. In inorder it is at index ' + m + ': <b>' + nl + '</b> value(s) on its left (blue) form its left subtree, <b>' + nr + '</b> on its right (amber) form its right subtree.', lo, hi, m, slot);
          made[slot] = 1;
          if (nl > 0) build(lo, m - 1, 2 * slot + 1);
          if (nr > 0) build(m + 1, hi, 2 * slot + 2);
          cs.pop();
          draw('Subtree rooted at <b>' + v + '</b> is complete' + (nl + nr === 0 ? ' (it is a leaf: both windows were empty)' : '') + '. Return to the caller.', undefined, undefined, undefined, slot);
        }
        build(0, ino.length - 1, 0);
        if (pi !== pre.length) throw new Error('These two lists cannot come from the same tree.');
        var all = {};
        for (var s = 0; s < arr.length; s++) if (arr[s] !== null) all[s] = 'ok';
        F.push({ narr: 'Done! Every preorder value was used exactly once, in order, and each inorder split took O(1) thanks to the value → index map. Total O(N).', parts: [
          { type: 'tree', label: 'Rebuilt tree', arr: arr.slice(), hl: all },
          { type: 'array', label: 'preorder', values: pre.slice() },
          { type: 'array', label: 'inorder', values: ino.slice() }] });
        return F;
      }
    },
    examples: [
      {
        title: 'Hand trace: pre [1, 2, 4, 5, 3], in [4, 2, 5, 1, 3]',
        html: `${H.table(['root', 'inorder window', 'left window', 'right window'], [
  ['1', '[4, 2, 5, 1, 3]', '[4, 2, 5]', '[3]'],
  ['2', '[4, 2, 5]', '[4]', '[5]'],
  ['4', '[4]', '—', '—'],
  ['5', '[5]', '—', '—'],
  ['3', '[3]', '—', '—']
])}
<p>Result: 1 with children 2 and 3; 2 with children 4 and 5. Notice the preorder values are consumed strictly left to right — that is why a single global index works.</p>`
      },
      {
        title: 'Inorder + postorder: build the RIGHT side first',
        html: `<p>in ${H.c('b', '[9, 3, 15, 20, 7]')}, post ${H.c('p', '[9, 15, 7, 20, 3]')}. Read postorder from the end: 3 (root), then 20 — which belongs to the <b>right</b> window [15, 20, 7] — then 7 (right of 20), then 15, then 9. Reading backwards gives Me, Right, Left, so the right subtree must be built before the left. Same tree as the visualizer's default.</p>`
      },
      {
        title: 'Why preorder + postorder is not enough',
        html: `<p>pre ${H.c('p', '[1, 2]')}, post ${H.c('p', '[2, 1]')}. Tree A: 2 is the <b>left</b> child of 1. Tree B: 2 is the <b>right</b> child of 1. Both give exactly these two lists. Only inorder separates left from right. (If every node has 0 or 2 children — a full tree — pre + post is unique again; LeetCode 889 accepts any valid answer.)</p>`
      },
      {
        title: 'BST from preorder only: [8, 5, 1, 7, 10, 12]',
        html: `<p>Use an upper bound. 8 is the root (bound ∞). Left of 8 takes values &lt; 8: 5, then left of 5 takes &lt; 5: 1; 7 is not &lt; 5 so it becomes 5's right (bound 8). 10 is not &lt; 8, so the left side of 8 is finished; 10 becomes 8's right, and 12 becomes 10's right. Result ${H.c('g', '[8, 5, 10, 1, 7, null, 12]')}. Each value is read once → O(N).</p>`,
        code: { lang: 'java', code: `
class BstFromPre {
    static int i = 0;
    static TreeNode build(int[] pre, int bound) {
        if (i == pre.length || pre[i] > bound) return null;   // value belongs to an ancestor's right side
        TreeNode root = new TreeNode(pre[i++]);
        root.left = build(pre, root.val);                     // children on the left must be < root
        root.right = build(pre, bound);
        return root;
    }
    public static void main(String[] args) {
        TreeNode root = build(new int[]{8, 5, 1, 7, 10, 12}, Integer.MAX_VALUE);
        System.out.println(root.val + " " + root.left.val + " " + root.right.val);  // 8 5 10
    }
}`, alt: [{ lang: 'python', run: true, code: `class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def build(pre):
    i = 0
    def go(bound):
        nonlocal i
        if i == len(pre) or pre[i] > bound:
            return None                      # value belongs to an ancestor's right side
        root = TreeNode(pre[i])
        i += 1
        root.left = go(root.val)             # children on the left must be < root
        root.right = go(bound)
        return root
    return go(float('inf'))

root = build([8, 5, 1, 7, 10, 12])
print(root.val, root.left.val, root.right.val)   # 8 5 10
` }, { lang: 'js', run: true, code: `class TreeNode {
  constructor(val = 0, left = null, right = null) { this.val = val; this.left = left; this.right = right; }
}

function build(pre) {
  let i = 0;
  const go = (bound) => {
    if (i === pre.length || pre[i] > bound) return null;   // value belongs to an ancestor's right side
    const root = new TreeNode(pre[i++]);
    root.left = go(root.val);                              // children on the left must be < root
    root.right = go(bound);
    return root;
  };
  return go(Infinity);
}

const root = build([8, 5, 1, 7, 10, 12]);
console.log(root.val + ' ' + root.left.val + ' ' + root.right.val);   // 8 5 10
` }, { lang: 'cpp', code: `// TreeNode as defined in the first lesson
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int v = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(v), left(l), right(r) {}
};

int i = 0;
TreeNode* build(const vector<int>& pre, int bound) {
    if (i == (int)pre.size() || pre[i] > bound) return nullptr;   // value belongs to an ancestor's right side
    TreeNode* root = new TreeNode(pre[i++]);
    root->left = build(pre, root->val);                           // children on the left must be < root
    root->right = build(pre, bound);
    return root;
}

int main() {
    TreeNode* root = build({8, 5, 1, 7, 10, 12}, INT_MAX);
    cout << root->val << ' ' << root->left->val << ' ' << root->right->val << '\\n';   // 8 5 10
}
` }] }
      }
    ],
    deepDive: `<p><b>Why it is O(N):</b> each preorder value creates exactly one node, the map lookup is O(1), and empty windows return immediately (N + 1 of them). The naive version that scans inorder for the root (O(N) per node) and copies sub-arrays (<code>Arrays.copyOfRange</code>) is O(N<sup>2</sup>) for skewed trees — 9·10<sup>6</sup> operations for N = 3000, and far worse memory churn.</p>
<p><b>Correctness in one sentence:</b> preorder of any subtree is "root, then the entire left subtree's preorder, then the right's", and the inorder window tells us exactly how many nodes the left subtree has — so after building the left part, the global preorder pointer is exactly at the right subtree's root.</p>
<p><b>Duplicates break uniqueness:</b> with pre [1, 1] and in [1, 1] the second 1 could be a left or a right child. Interview problems therefore promise distinct values; if not, you need extra info (e.g. null markers).</p>
<p><b>Iterative O(N) build</b> (no recursion, no map): walk preorder with a stack; keep pushing as left children until the stack top equals the next inorder value, then pop while it matches and attach the next preorder value as a right child. Useful when depth can reach 10<sup>5</sup>.</p>
<p><b>Serialization:</b> a single preorder with explicit null markers (<code>1,2,#,#,3,4,#,#,5,#,#</code>) is uniquely decodable — this is how LeetCode, Protocol Buffers' nested messages, and many config formats store trees. Level order with nulls (LeetCode's display format) is also unique.</p>
<p><b>Other pairs:</b> level order + inorder works too (the root is the first level-order value; filter level order into left/right lists), but naïve filtering costs O(N<sup>2</sup>).</p>`,
    aiEra: `<p><b>What AI changes:</b> "build tree from preorder and inorder" is a staple; assistants output the hash-map solution. The interview has moved toward explaining <b>why</b> the left subtree is built first, why pre + post is ambiguous, and handling deep trees.</p>
<p><b>Use AI as a partner:</b> <code>Write a test that generates random trees with distinct values, computes preorder/inorder, rebuilds, and compares the serialized trees.</code> Round-trip tests are the gold standard for any encode/decode code, including the serializers you will write in system design.</p>
<p><b>Where AI goes wrong:</b> building the right subtree first in the preorder version (or left first in the postorder one), using a shared preorder index but slicing arrays at the same time (double bookkeeping), and claiming pre + post always works.</p>
<p><b>What you must still own:</b> the window/index reasoning (how many nodes go left), the O(N) vs O(N<sup>2</sup>) difference, and the uniqueness conditions.</p>`,
    problems: [{
      title: 'Construct Binary Tree from Preorder and Inorder Traversal',
      level: 'Medium',
      tags: ['divide and conquer', 'hashmap', 'recursion'],
      companies: ['Amazon', 'Microsoft', 'Meta', 'Bloomberg'],
      statement: `<p>Given two integer arrays <code>preorder</code> and <code>inorder</code> of the same binary tree (all values <b>unique</b>), construct and return the tree.</p>`,
      constraints: `1 ≤ n ≤ 3000, −3000 ≤ value ≤ 3000, all values unique, both arrays describe the same tree`,
      example: `<p>Input: preorder = ${H.c('p', '[3,9,20,15,7]')}, inorder = ${H.c('b', '[9,3,15,20,7]')} → Output: ${H.c('g', '[3,9,20,null,null,15,7]')}</p>
<p><b>Why:</b> 3 is first in preorder → root. In inorder, [9] is left of 3 and [15, 20, 7] is right. The next preorder value 9 roots the left window; then 20 roots the right window, splitting it into [15] and [7].</p>`,
      brute: {
        why: `<p>Brute: for every root, linearly search inorder for its index and copy the left/right pieces of both arrays into new arrays before recursing. Each level does O(N) scanning and copying → O(N<sup>2</sup>) time and lots of garbage on skewed trees. The waste: re-searching and re-copying data we already have, when indices and a value → index map suffice.</p>`,
        code: `
          TreeNode buildBrute(int[] pre, int[] in) {
              if (pre.length == 0) return null;
              TreeNode root = new TreeNode(pre[0]);
              int m = 0;
              while (in[m] != pre[0]) m++;                      // linear search: O(N)
              root.left = buildBrute(Arrays.copyOfRange(pre, 1, m + 1), Arrays.copyOfRange(in, 0, m));
              root.right = buildBrute(Arrays.copyOfRange(pre, m + 1, pre.length), Arrays.copyOfRange(in, m + 1, in.length));
              return root;                                       // copies: O(N) per level
          }`
      },
      mcq: {
        q: 'The root sits at index m of the current inorder window in[lo..hi]. How many nodes does its left subtree have?',
        options: ['m', 'm − lo', 'hi − m', 'm − lo + 1'],
        answer: 1,
        explain: 'Everything in the window strictly left of the root, positions lo..m−1, belongs to the left subtree: m − lo nodes. (That count is also how many preorder values right after the root belong to the left subtree.)'
      },
      hints: [
        `<p><b>Aha:</b> preorder's first value is always the root; inorder splits the remaining values into "left of root" and "right of root". Then the same thing happens recursively inside each side.</p>`,
        `<p>Use a hash map from value to inorder index and a single counter <code>preIdx</code> that walks preorder. <code>build(lo, hi)</code> works only with inorder indices — no array copies.</p>`,
        `<p><b>Traps:</b> build the <b>left</b> subtree before the right (preorder order); stop when <code>lo &gt; hi</code>; reset <code>preIdx</code> per call of the main method. <b>Recipe:</b> map; preIdx = 0; build(lo, hi): if lo &gt; hi null; root = pre[preIdx++]; m = map[root]; root.left = build(lo, m−1); root.right = build(m+1, hi).</p>`
      ],
      tests: { sig: 'int[] int[] -> TreeNode', fn: 'buildTree', cases: [
        [[[3,9,20,15,7],[9,3,15,20,7]],[3,9,20,null,null,15,7]],
        [[[-1],[-1]],[-1]],
        [[[1,2],[2,1]],[1,2]],
        [[[1,2],[1,2]],[1,null,2]],
        [[[1,2,4,5,3,6,7],[4,2,5,1,6,3,7]],[1,2,3,4,5,6,7]],
        [[[1,2,3,4,5],[5,4,3,2,1]],[1,2,null,3,null,4,null,5]],
        [[[-631,1772,2884,2396,-1277,-818,2324,2993,-201],[1772,2884,2396,-631,2993,2324,-201,-818,-1277]],[-631,1772,-1277,null,2884,-818,null,null,2396,2324,null,null,null,2993,-201]],
        [[[-2240,-2241,1278,-1945,-1790,380,-1320,-1170,-2129,-2107,210,-1898,2542,1127,32,-1437],[-1790,-1945,1278,-1320,380,-2241,-2129,-1170,-2240,1127,2542,-1898,32,210,-1437,-2107]],[-2240,-2241,-2107,1278,-1170,210,null,-1945,380,-2129,null,-1898,-1437,-1790,null,-1320,null,null,null,2542,32,null,null,null,null,null,null,1127]],
        [[{'$range': [0,3000]},{'$range': [2999,-1,-1]}],m14chain(3000, 'l')]
      ] },
      solution: {
        approach: `<p>Divide and conquer on inorder windows, consuming preorder left to right; O(1) split lookups via a map.</p>`,
        code: `
          class Solution {
              private int preIdx;
              private Map<Integer, Integer> inPos;

              public TreeNode buildTree(int[] preorder, int[] inorder) {
                  inPos = new HashMap<>();
                  for (int i = 0; i < inorder.length; i++) inPos.put(inorder[i], i);
                  preIdx = 0;
                  return build(preorder, 0, inorder.length - 1);
              }

              private TreeNode build(int[] pre, int lo, int hi) {
                  if (lo > hi) return null;                    // empty window
                  int val = pre[preIdx++];                     // next root in preorder
                  TreeNode root = new TreeNode(val);
                  int m = inPos.get(val);                      // where it splits the window
                  root.left = build(pre, lo, m - 1);           // left subtree comes next in preorder
                  root.right = build(pre, m + 1, hi);
                  return root;
              }
          }`,
        alt: [{ lang: 'python', code: `import sys

class Solution:
    def build_tree(self, preorder, inorder):
        sys.setrecursionlimit(max(1000, 2 * len(inorder) + 100))   # a skewed tree recurses n deep
        pos = {v: i for i, v in enumerate(inorder)}
        it = iter(preorder)                  # consumes preorder left to right

        def build(lo, hi):
            if lo > hi:
                return None
            val = next(it)
            node = TreeNode(val)
            m = pos[val]
            node.left = build(lo, m - 1)     # left first!
            node.right = build(m + 1, hi)
            return node

        return build(0, len(inorder) - 1)` }, { lang: 'js', code: `function buildTree(preorder, inorder) {
  const pos = new Map(inorder.map((v, i) => [v, i]));
  let pre = 0;                                   // next root in preorder
  const build = (lo, hi) => {
    if (lo > hi) return null;
    const node = new TreeNode(preorder[pre++]);
    const m = pos.get(node.val);                 // where it splits the window
    node.left = build(lo, m - 1);                // left subtree comes next in preorder
    node.right = build(m + 1, hi);
    return node;
  };
  return build(0, inorder.length - 1);
}
` }, { lang: 'cpp', code: `// LeetCode-style node (the judge normally provides it)
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(x), left(l), right(r) {}
};

class Solution {
public:
    TreeNode* buildTree(vector<int>& preorder, vector<int>& inorder) {
        unordered_map<int, int> pos;
        for (int i = 0; i < (int)inorder.size(); i++) pos[inorder[i]] = i;
        int pre = 0;
        // a recursive lambda: it receives itself as the first argument
        auto build = [&](auto&& self, int lo, int hi) -> TreeNode* {
            if (lo > hi) return nullptr;
            TreeNode* node = new TreeNode(preorder[pre++]);   // next root in preorder
            int m = pos[node->val];
            node->left = self(self, lo, m - 1);
            node->right = self(self, m + 1, hi);
            return node;
        };
        return build(build, 0, (int)inorder.size() - 1);
    }
};
` }],
        dry: {
          head: ['call build(lo, hi)', 'preIdx → root', 'm', 'left window', 'right window'],
          rows: [
            ['(0, 4)', '0 → 3', '1', '(0, 0)', '(2, 4)'],
            ['(0, 0)', '1 → 9', '0', '(0, −1) empty', '(1, 0) empty'],
            ['(2, 4)', '2 → 20', '3', '(2, 2)', '(4, 4)'],
            ['(2, 2)', '3 → 15', '2', 'empty', 'empty'],
            ['(4, 4)', '4 → 7', '4', 'empty', H.c('g', 'empty → done')]
          ]
        },
        complexity: `<p><b>Time O(N)</b>: one node per preorder value, O(1) map lookup each. <b>Space O(N)</b> for the map plus O(h) recursion.</p>`,
        followUps: ['Build from inorder + postorder (root last, right subtree first)', 'Build a BST from preorder only in O(N)', 'Do it iteratively with a stack for very deep trees']
      }
    }]
  });
  /* ===================== PRACTICE: Easy ===================== */
  practice.push({
    title: 'Same Tree',
    level: 'Easy',
    tags: ['dfs', 'recursion'],
    companies: ['Amazon', 'Bloomberg', 'Microsoft'],
    statement: `<p>Given the roots <code>p</code> and <code>q</code> of two binary trees, return <code>true</code> if they are <b>exactly the same</b>: same shape and same value in every position.</p>`,
    constraints: `0 ≤ nodes in each tree ≤ 100, −10<sup>4</sup> ≤ Node.val ≤ 10<sup>4</sup>`,
    example: `<p><code>p = [1,2,3]</code>, <code>q = [1,2,3]</code> → ${H.c('g', 'true')}.</p>
<p><code>p = [1,2]</code>, <code>q = [1,null,2]</code> → ${H.c('r', 'false')}: same values, but 2 is a <b>left</b> child in p and a <b>right</b> child in q — the shapes differ.</p>`,
    brute: {
      why: `<p>Serialize both trees into strings (preorder with a marker for null) and compare the strings. It works and is O(N), but builds two strings of size O(N) and cannot stop at the first difference until both are fully built.</p>`,
      code: `
        boolean isSameBrute(TreeNode p, TreeNode q) {
            StringBuilder a = new StringBuilder(), b = new StringBuilder();
            ser(p, a); ser(q, b);
            return a.toString().equals(b.toString());
        }
        void ser(TreeNode n, StringBuilder sb) {
            if (n == null) { sb.append("#,"); return; }   // null marker keeps the shape
            sb.append(n.val).append(',');
            ser(n.left, sb); ser(n.right, sb);
        }`
    },
    mcq: { q: 'Comparing only the preorder value lists (without null markers) of the two trees is…', options: ['Enough', 'Not enough: different shapes can give the same list', 'Enough if values are unique', 'Only wrong for empty trees'], answer: 1, explain: '[1,2] and [1,null,2] both have preorder 1, 2. Null markers (or a structural recursion) are needed to capture shape.' },
    hints: [
      `<p><b>Aha:</b> two trees are equal when their roots match and their left subtrees are equal and their right subtrees are equal — a definition that is already recursive.</p>`,
      `<p>No data structure needed: recurse on pairs <code>(p, q)</code>. Handle the null cases first: both null → true; one null → false.</p>`,
      `<p><b>Recipe:</b> if both null return true; if one null or values differ return false; return same(p.left, q.left) &amp;&amp; same(p.right, q.right). The <code>&amp;&amp;</code> stops at the first mismatch.</p>`
    ],
    tests: { sig: 'TreeNode TreeNode -> bool', fn: 'isSameTree', cases: [
      [[[1,2,3],[1,2,3]],true],
      [[[1,2],[1,null,2]],false],
      [[[1,2,1],[1,1,2]],false],
      [[[],[]],true],
      [[[],[0]],false],
      [[[0],[0]],true],
      [[[1,2,3,4],[1,2,3,null,4]],false],
      [[[-10000,10000],[-10000,10000]],true],
      [[[1,null,2,3],[1,null,2,null,3]],false]
    ] },
    solution: {
      approach: `<p>Walk both trees in lockstep; any shape or value difference returns false immediately.</p>`,
      code: `
        class Solution {
            public boolean isSameTree(TreeNode p, TreeNode q) {
                if (p == null && q == null) return true;     // both empty here
                if (p == null || q == null) return false;    // shape differs
                if (p.val != q.val) return false;            // value differs
                return isSameTree(p.left, q.left) && isSameTree(p.right, q.right);
            }
        }`,
      alt: [{ lang: 'python', code: `class Solution:
    def is_same_tree(self, p, q):
        if p is None or q is None:
            return p is q                    # both empty -> True, one empty -> False
        return (p.val == q.val
                and self.is_same_tree(p.left, q.left)
                and self.is_same_tree(p.right, q.right))
` }, { lang: 'js', code: `function isSameTree(p, q) {
  if (!p || !q) return p === q;      // both empty -> true, one empty -> false
  return p.val === q.val && isSameTree(p.left, q.left) && isSameTree(p.right, q.right);
}
` }, { lang: 'cpp', code: `// LeetCode-style node (the judge normally provides it)
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(x), left(l), right(r) {}
};

class Solution {
public:
    bool isSameTree(TreeNode* p, TreeNode* q) {
        if (!p || !q) return p == q;         // both empty -> true, one empty -> false
        return p->val == q->val && isSameTree(p->left, q->left) && isSameTree(p->right, q->right);
    }
};
` }],
      dry: { head: ['pair', 'check', 'result'], rows: [['(1, 1)', 'values equal', 'recurse'], ['(2, null)', 'one side null', H.c('r', 'false')], ['back at (1, 1)', 'left failed', H.c('r', 'false (short-circuit)')]] },
      complexity: `<p><b>Time O(min(N, M))</b> — stops at the first difference. <b>Space O(h)</b> recursion.</p>`,
      followUps: ['Is q a subtree of p? (Subtree of Another Tree)', 'Are the trees equal up to swapping children at any node? (Flip Equivalent)']
    }
  });

  practice.push({
    title: 'Symmetric Tree',
    level: 'Easy',
    tags: ['dfs', 'bfs', 'mirror'],
    companies: ['Amazon', 'Microsoft', 'LinkedIn'],
    statement: `<p>Given the <code>root</code> of a binary tree, check whether it is a <b>mirror of itself</b> (symmetric around its centre line).</p>`,
    constraints: `1 ≤ nodes ≤ 1000, −100 ≤ Node.val ≤ 100`,
    example: `<pre>
        1
       / \\
      2   2
     / \\ / \\
    3  4 4  3
</pre><p>Output ${H.c('g', 'true')}: the left 2's ${H.c('b', 'outer')} child 3 matches the right 2's ${H.c('b', 'outer')} child 3, and the ${H.c('y', 'inner')} 4s match each other. <code>[1,2,2,null,3,null,3]</code> → ${H.c('r', 'false')} (both 3s are right children).</p>`,
    brute: {
      why: `<p>Build a mirrored <b>copy</b> of the tree (O(N) extra nodes), then check if the copy equals the original with Same Tree. Correct and O(N), but allocates a whole second tree just to compare.</p>`,
      code: `
        boolean isSymmetricBrute(TreeNode root) {
            return same(root, mirror(root));
        }
        TreeNode mirror(TreeNode n) {
            if (n == null) return null;
            return new TreeNode(n.val, mirror(n.right), mirror(n.left));   // new nodes!
        }
        boolean same(TreeNode a, TreeNode b) {
            if (a == null || b == null) return a == b;
            return a.val == b.val && same(a.left, b.left) && same(a.right, b.right);
        }`
    },
    mcq: { q: 'When comparing nodes a (left side) and b (right side) for symmetry, which pairs must match next?', options: ['a.left with b.left, a.right with b.right', 'a.left with b.right, a.right with b.left', 'a.left with a.right', 'Only the values of a and b'], answer: 1, explain: 'In a mirror, the outer children (a.left, b.right) face each other and the inner children (a.right, b.left) face each other.' },
    hints: [
      `<p><b>Aha:</b> the tree is symmetric when its left subtree is the <b>mirror image</b> of its right subtree. Mirror = same values with left and right swapped at every level.</p>`,
      `<p>Write <code>isMirror(a, b)</code> on two nodes at once — like Same Tree but crossing the children. An iterative version puts pairs into a queue.</p>`,
      `<p><b>Recipe:</b> isMirror(a, b): both null → true; one null → false; return a.val == b.val &amp;&amp; isMirror(a.left, b.right) &amp;&amp; isMirror(a.right, b.left). Answer = isMirror(root.left, root.right).</p>`
    ],
    tests: { sig: 'TreeNode -> bool', fn: 'isSymmetric', cases: [
      [[[1,2,2,3,4,4,3]],true],
      [[[1,2,2,null,3,null,3]],false],
      [[[1]],true],
      [[[1,2]],false],
      [[[1,2,2]],true],
      [[[1,2,2,2,null,2]],false],
      [[[1,2,3]],false],
      [[[-100,5,5,null,-7,-7,null]],true],
      [[[1,2,2,3,null,null,3,4,null,null,4]],true]
    ] },
    solution: {
      approach: `<p>Compare the two halves as mirror images, crossing outer and inner children.</p>`,
      code: `
        class Solution {
            public boolean isSymmetric(TreeNode root) {
                return root == null || isMirror(root.left, root.right);
            }
            private boolean isMirror(TreeNode a, TreeNode b) {
                if (a == null && b == null) return true;
                if (a == null || b == null) return false;
                return a.val == b.val
                    && isMirror(a.left, b.right)     // outer pair
                    && isMirror(a.right, b.left);    // inner pair
            }
        }`,
      alt: [{ lang: 'python', code: `from collections import deque

class Solution:
    def is_symmetric(self, root):
        q = deque([(root.left, root.right)])
        while q:
            a, b = q.popleft()
            if a is None and b is None:
                continue
            if a is None or b is None or a.val != b.val:
                return False
            q.append((a.left, b.right))      # outer
            q.append((a.right, b.left))      # inner
        return True` }, { lang: 'js', code: `function isSymmetric(root) {
  const mirror = (a, b) => {
    if (!a || !b) return a === b;
    return a.val === b.val
      && mirror(a.left, b.right)     // outer pair
      && mirror(a.right, b.left);    // inner pair
  };
  return !root || mirror(root.left, root.right);
}
` }, { lang: 'cpp', code: `// LeetCode-style node (the judge normally provides it)
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(x), left(l), right(r) {}
};

class Solution {
public:
    bool isSymmetric(TreeNode* root) { return !root || mirror(root->left, root->right); }

private:
    bool mirror(TreeNode* a, TreeNode* b) {
        if (!a || !b) return a == b;
        return a->val == b->val
            && mirror(a->left, b->right)     // outer pair
            && mirror(a->right, b->left);    // inner pair
    }
};
` }],
      dry: { head: ['pair (a, b)', 'values', 'next pairs'], rows: [['(2, 2)', 'equal', '(3,3) outer, (4,4) inner'], ['(3, 3)', 'equal', '(null,null) ×2'], ['(4, 4)', 'equal', H.c('g', 'all matched → true')]] },
      complexity: `<p><b>Time O(N)</b>, <b>space O(h)</b> recursive or O(W) with the queue.</p>`,
      followUps: ['Make the tree symmetric by inverting one half', 'Check symmetry of an N-ary tree']
    }
  });

  practice.push({
    title: 'Invert Binary Tree',
    level: 'Easy',
    tags: ['dfs', 'bfs'],
    companies: ['Google', 'Amazon', 'Meta'],
    statement: `<p>Given the <code>root</code> of a binary tree, <b>invert</b> it (mirror it left ↔ right at every node) and return its root.</p>`,
    constraints: `0 ≤ nodes ≤ 100, −100 ≤ Node.val ≤ 100`,
    example: `<pre>
       4                 4
     /   \\             /   \\
    2     7    →      7     2
   / \\   / \\         / \\   / \\
  1   3 6   9       9   6 3   1
</pre><p>Output ${H.c('g', '[4,7,2,9,6,3,1]')}. Every node swaps its two children; doing it at every node mirrors the whole tree. Inorder flips from 1 2 3 4 6 7 9 to 9 7 6 4 3 2 1.</p>`,
    brute: {
      why: `<p>Collect each level with BFS, reverse every level list, and rebuild a new tree from the reversed levels (with null placeholders). Much more code, O(N) extra memory for the copy, and easy to get wrong with missing children — when a simple swap at every node does the job in place.</p>`,
      code: `
        TreeNode invertCopy(TreeNode n) {
            // builds a brand-new mirrored tree: O(N) extra nodes
            if (n == null) return null;
            TreeNode copy = new TreeNode(n.val);
            copy.left = invertCopy(n.right);
            copy.right = invertCopy(n.left);
            return copy;
        }`
    },
    mcq: { q: 'Which traversal order can you use to invert the tree in place?', options: ['Only preorder', 'Only postorder', 'Preorder, postorder or level order — any order that swaps every node exactly once', 'Only inorder'], answer: 2, explain: 'Each node just needs its children swapped once. Careful with plain inorder: after swapping at a node, the "right" subtree you visit next is the one you already processed.' },
    hints: [
      `<p><b>Aha:</b> the mirror of a tree = swap the root's two children, then mirror each child. Every node does the same tiny job.</p>`,
      `<p>No extra structure for recursion; or use a queue (BFS) to visit every node iteratively and swap its children.</p>`,
      `<p><b>Traps:</b> save one child in a temp variable before overwriting. Avoid naive inorder (it swaps one subtree twice). <b>Recipe:</b> if null return; swap(left, right); invert(left); invert(right); return root.</p>`
    ],
    tests: { sig: 'TreeNode -> TreeNode', fn: 'invertTree', cases: [
      [[[4,2,7,1,3,6,9]],[4,7,2,9,6,3,1]],
      [[[1,2,3,4,5]],[1,3,2,null,null,5,4]],
      [[[]],[]],
      [[[1]],[1]],
      [[[1,null,2,3]],[1,2,null,null,3]],
      [[[3,9,20,null,null,15,7]],[3,20,9,7,15]],
      [[[-5,-5,0,null,7,7,-100]],[-5,0,-5,-100,7,7]],
      [[[1,2,3,4,null,null,5,6,null,null,7]],[1,3,2,5,null,null,4,7,null,null,6]],
      [[[-21,22,-43,62,-3,null,53,null,null,84,-53,-48,-39,null,null,null,null,12,12,-18,null,-42]],[-21,-43,22,53,null,-3,62,-39,-48,-53,84,null,null,null,-18,12,12,null,null,null,null,null,null,null,null,null,-42]],
      [[[-43,64,-62,null,-30,48,77,null,39,-72,43,null,26,null,null,4,null,null,41,null,-63]],[-43,-62,64,77,48,-30,null,26,null,43,-72,39,null,-63,null,41,null,null,4]],
      [[[-61,-58,-58,-49,-83]],[-61,-58,-58,null,null,-83,-49]]
    ] },
    solution: {
      approach: `<p>Swap children at every node (preorder); return the same root.</p>`,
      code: `
        class Solution {
            public TreeNode invertTree(TreeNode root) {
                if (root == null) return null;
                TreeNode tmp = root.left;     // swap my two children
                root.left = root.right;
                root.right = tmp;
                invertTree(root.left);        // then mirror each side
                invertTree(root.right);
                return root;
            }
        }`,
      alt: [{ lang: 'python', code: `class Solution:
    def invert_tree(self, root):
        if root:
            # tuple assignment swaps the two (already mirrored) children
            root.left, root.right = self.invert_tree(root.right), self.invert_tree(root.left)
        return root
` }, { lang: 'js', code: `function invertTree(root) {
  if (!root) return null;
  // destructuring swaps the two (already mirrored) children
  [root.left, root.right] = [invertTree(root.right), invertTree(root.left)];
  return root;
}
` }, { lang: 'cpp', code: `// LeetCode-style node (the judge normally provides it)
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(x), left(l), right(r) {}
};

class Solution {
public:
    TreeNode* invertTree(TreeNode* root) {
        if (!root) return nullptr;
        swap(root->left, root->right);       // swap my two children
        invertTree(root->left);              // then mirror each side
        invertTree(root->right);
        return root;
    }
};
` }],
      dry: { head: ['node', 'before (L, R)', 'after (L, R)'], rows: [['4', '(2, 7)', '(7, 2)'], ['7', '(6, 9)', '(9, 6)'], ['2', '(1, 3)', H.c('g', '(3, 1)')]] },
      complexity: `<p><b>Time O(N)</b>, <b>space O(h)</b> (O(W) with BFS).</p>`,
      followUps: ['Do it iteratively with a queue', 'Invert only the nodes at odd levels (LeetCode 2415)']
    }
  });

  practice.push({
    title: 'Path Sum (Root-to-Leaf)',
    level: 'Easy',
    tags: ['dfs', 'preorder'],
    companies: ['Amazon', 'Microsoft', 'Meta'],
    statement: `<p>Given the <code>root</code> of a binary tree and an integer <code>targetSum</code>, return <code>true</code> if some <b>root-to-leaf</b> path has values adding up to <code>targetSum</code>.</p>`,
    constraints: `0 ≤ nodes ≤ 5000, −1000 ≤ Node.val ≤ 1000, −1000 ≤ targetSum ≤ 1000`,
    example: `<p><code>root = [5,4,8,11,null,13,4,7,2,null,null,null,1]</code>, targetSum = 22 → ${H.c('g', 'true')} because ${H.c('g', '5 + 4 + 11 + 2 = 22')} and 2 is a leaf. A path that stops at a non-leaf does not count: with root = [1,2] and target 1 the answer is ${H.c('r', 'false')} (1 alone is not a leaf path).</p>`,
    brute: {
      why: `<p>List every root-to-leaf path explicitly (copying the path at each leaf), then sum each list. Copying costs O(h) per leaf, so O(N·h) time and memory — up to O(N<sup>2</sup>) on bad shapes. We only need a running total, not the paths.</p>`,
      code: `
        boolean hasPathSumBrute(TreeNode root, int target) {
            List<List<Integer>> paths = new ArrayList<>();
            collect(root, new ArrayList<>(), paths);
            for (List<Integer> p : paths) {
                int s = 0;
                for (int v : p) s += v;
                if (s == target) return true;
            }
            return false;
        }
        void collect(TreeNode n, List<Integer> path, List<List<Integer>> out) {
            if (n == null) return;
            path.add(n.val);
            if (n.left == null && n.right == null) out.add(new ArrayList<>(path));
            collect(n.left, path, out);
            collect(n.right, path, out);
            path.remove(path.size() - 1);
        }`
    },
    mcq: { q: 'Where must the "remaining == 0" check happen?', options: ['At every node', 'Only at leaves', 'Only at the root', 'At null children'], answer: 1, explain: 'The path must end at a leaf. Checking at null children is a classic bug: a node with ONE child would be treated as a path end.' },
    hints: [
      `<p><b>Aha:</b> pass the <b>remaining</b> sum down: at each node subtract its value. At a leaf, the path works if the remaining sum is exactly 0.</p>`,
      `<p>Plain preorder recursion with an extra parameter; no list needed. Values can be negative, so you cannot stop early when the sum "gets too big".</p>`,
      `<p><b>Recipe:</b> if null return false; rem = target − val; if leaf return rem == 0; return go(left, rem) || go(right, rem). Empty tree → false.</p>`
    ],
    tests: { sig: 'TreeNode int int -> bool', fn: 'judge', harness: {
      java: "class Check {\n    // n > 0: right-leaning chain of n nodes, n < 0: left-leaning; node i (0 = root) holds val(i).\n    // Built here because a tree this deep is too big to write out as a test literal.\n    static TreeNode chain(int n, java.util.function.IntUnaryOperator val) {\n        TreeNode root = null;\n        for (int i = Math.abs(n) - 1; i >= 0; i--) {\n            TreeNode t = new TreeNode(val.applyAsInt(i));\n            if (n > 0) t.right = root; else t.left = root;\n            root = t;\n        }\n        return root;\n    }\n\n    static boolean judge(TreeNode root, int target, int n) {\n        if (n != 0) root = chain(n, i -> i % 2 == 0 ? 1 : -1);\n        return new Solution().hasPathSum(root, target);\n    }\n}",
      python: "# n > 0: right-leaning chain of n nodes, n < 0: left-leaning; node i (0 = root) holds val(i).\ndef _chain(n, val):\n    root = None\n    for i in range(abs(n) - 1, -1, -1):\n        t = TreeNode(val(i))\n        if n > 0:\n            t.right = root\n        else:\n            t.left = root\n        root = t\n    return root\n\ndef judge(root, target, n):\n    if n:\n        root = _chain(n, lambda i: 1 if i % 2 == 0 else -1)\n    return Solution().has_path_sum(root, target)",
      js: "// n > 0: right-leaning chain of n nodes, n < 0: left-leaning; node i (0 = root) holds val(i).\nfunction chain__(n, val) {\n  let root = null;\n  for (let i = Math.abs(n) - 1; i >= 0; i--) {\n    const t = new TreeNode(val(i));\n    if (n > 0) t.right = root; else t.left = root;\n    root = t;\n  }\n  return root;\n}\n\nfunction judge(root, target, n) {\n  if (n) root = chain__(n, (i) => i % 2 == 0 ? 1 : -1);\n  return hasPathSum(root, target);\n}",
      cpp: "// n > 0: right-leaning chain of n nodes, n < 0: left-leaning; node i (0 = root) holds val(i).\nTreeNode* chain__(int n, function<int(int)> val) {\n    TreeNode* root = nullptr;\n    for (int i = abs(n) - 1; i >= 0; i--) {\n        TreeNode* t = new TreeNode(val(i));\n        if (n > 0) t->right = root; else t->left = root;\n        root = t;\n    }\n    return root;\n}\n\nbool judge(TreeNode* root, int target, int n) {\n    if (n) root = chain__(n, [](int i) { return i % 2 == 0 ? 1 : -1; });\n    return Solution().hasPathSum(root, target);\n}"
    }, cases: [
      [[[5,4,8,11,null,13,4,7,2,null,null,null,1],22,0],true],
      [[[5,4,8,11,null,13,4,7,2,null,null,null,1],26,0],true],
      [[[5,4,8,11,null,13,4,7,2,null,null,null,1],18,0],true],
      [[[5,4,8,11,null,13,4,7,2,null,null,null,1],27,0],true],
      [[[1,2],1,0],false],
      [[[1,2],3,0],true],
      [[[],0,0],false],
      [[[-3],-3,0],true],
      [[[1,-2,-3,1,3,-2,null,-1],-1,0],true],
      [[[0,1,1],0,0],false],
      [[[-1000,1000],0,0],true],
      [[[],0,-5000],true],
      [[[],1,5000],false]
    ] },
    solution: {
      approach: `<p>Top-down DFS carrying the remaining target; test only at leaves.</p>`,
      code: `
        class Solution {
            public boolean hasPathSum(TreeNode root, int targetSum) {
                if (root == null) return false;
                int rem = targetSum - root.val;                  // what the rest of the path must add
                if (root.left == null && root.right == null) return rem == 0;   // leaf: path ends here
                return hasPathSum(root.left, rem) || hasPathSum(root.right, rem);
            }
        }`,
      alt: [{ lang: 'python', code: `class Solution:
    def has_path_sum(self, root, target_sum):
        stack = [(root, target_sum)] if root else []   # (node, what the rest of the path must add)
        while stack:
            n, rem = stack.pop()
            rem -= n.val
            if n.left is None and n.right is None and rem == 0:
                return True                  # a leaf closes a matching path
            stack.extend((c, rem) for c in (n.left, n.right) if c)
        return False
` }, { lang: 'js', code: `function hasPathSum(root, targetSum) {
  if (!root) return false;
  const rem = targetSum - root.val;
  if (!root.left && !root.right) return rem === 0;   // leaf: the path ends here
  return hasPathSum(root.left, rem) || hasPathSum(root.right, rem);
}
` }, { lang: 'cpp', code: `// LeetCode-style node (the judge normally provides it)
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(x), left(l), right(r) {}
};

class Solution {
public:
    bool hasPathSum(TreeNode* root, int targetSum) {
        if (!root) return false;
        int rem = targetSum - root->val;
        if (!root->left && !root->right) return rem == 0;   // leaf: the path ends here
        return hasPathSum(root->left, rem) || hasPathSum(root->right, rem);
    }
};
` }],
      dry: { head: ['node', 'remaining after node', 'leaf?', 'result'], rows: [['5', '17', 'no', 'recurse'], ['4', '13', 'no', 'recurse'], ['11', '2', 'no', 'recurse'], ['7', '−5', 'yes', H.c('r', 'false')], ['2', '0', 'yes', H.c('g', 'true')]] },
      complexity: `<p><b>Time O(N)</b>, <b>space O(h)</b>.</p>`,
      followUps: ['Return all such paths (Path Sum II, backtracking)', 'Count paths that start anywhere and go down (Path Sum III, prefix sums + hash map)']
    }
  });

  practice.push({
    title: 'Convert Sorted Array to Height-Balanced BST',
    level: 'Easy',
    tags: ['bst', 'divide and conquer'],
    companies: ['Amazon', 'Microsoft', 'Airbnb'],
    statement: `<p>Given an integer array <code>nums</code> sorted in increasing order, build a <b>height-balanced</b> BST containing all its values.</p>`,
    constraints: `1 ≤ n ≤ 10<sup>4</sup>, −10<sup>4</sup> ≤ nums[i] ≤ 10<sup>4</sup>, strictly increasing`,
    example: `${H.arr([-10, -3, 0, 5, 9], { label: 'nums', hl: { 2: 'p' } })}<p>Output e.g. ${H.c('g', '[0,-3,9,-10,null,5]')}: the middle value ${H.c('p', '0')} becomes the root, [−10, −3] builds the left subtree and [5, 9] the right. Several answers are valid as long as every node's subtrees differ in height by at most 1 — the code below picks the lower middle and returns ${H.c('g', '[0,-10,5,null,-3,null,9]')}, also correct.</p>`,
    brute: {
      why: `<p>Insert the values one by one into an empty BST. Because they arrive <b>sorted</b>, each new value goes to the far right and the "tree" becomes a chain of height n — a valid BST, but not balanced, and building it costs O(n<sup>2</sup>).</p>`,
      code: `
        TreeNode sortedToBSTBrute(int[] nums) {
            TreeNode root = null;
            for (int x : nums) root = insert(root, x);   // sorted input -> a chain!
            return root;
        }
        TreeNode insert(TreeNode n, int v) {
            if (n == null) return new TreeNode(v);
            if (v < n.val) n.left = insert(n.left, v); else n.right = insert(n.right, v);
            return n;
        }`
    },
    mcq: { q: 'Which element should be the root of the subtree built from nums[lo..hi]?', options: ['nums[lo]', 'nums[hi]', 'nums[(lo + hi) / 2], the middle', 'The largest element'], answer: 2, explain: 'The middle splits the remaining values into two halves whose sizes differ by at most 1, so heights also differ by at most 1.' },
    hints: [
      `<p><b>Aha:</b> the array is already the BST's inorder. Pick the root so that half the values are on each side: the <b>middle</b> element.</p>`,
      `<p>Divide and conquer on index ranges: <code>build(lo, hi)</code> returns the root for <code>nums[lo..hi]</code>. No copying of sub-arrays.</p>`,
      `<p><b>Recipe:</b> if lo &gt; hi return null; mid = (lo + hi) &gt;&gt;&gt; 1; node = nums[mid]; node.left = build(lo, mid−1); node.right = build(mid+1, hi). Use <code>&gt;&gt;&gt; 1</code> to avoid overflow habits.</p>`
    ],
    tests: { sig: 'int[] -> TreeNode', fn: 'sortedArrayToBST', check: "(args, out, exp) => { if (!Array.isArray(out) || !out.length || out[0] === null) return false; const L = [], R = [], nodes = [0]; let i = 1; for (let k = 0; k < nodes.length && i < out.length; k++) { const p = nodes[k]; if (i < out.length && out[i] !== null) { L[p] = i; nodes.push(i); } i++; if (i < out.length && out[i] !== null) { R[p] = i; nodes.push(i); } i++; } const seq = []; let bal = true; const h = (x) => { if (x === undefined) return 0; const a = h(L[x]); seq.push(out[x]); const b = h(R[x]); if (Math.abs(a - b) > 1) bal = false; return 1 + Math.max(a, b); }; h(0); return bal && JSON.stringify(seq) === JSON.stringify(exp); }", cases: [
      [[[-10,-3,0,5,9]],[-10,-3,0,5,9]],
      [[[1,3]],[1,3]],
      [[[7]],[7]],
      [[[-10000,10000]],[-10000,10000]],
      [[[1,2,3,4,5,6,7]],[1,2,3,4,5,6,7]],
      [[[1,2,3,4,5,6,7,8]],[1,2,3,4,5,6,7,8]],
      [[[-500,-499,-498,-497,-496,-495,-494,-493,-492,-491,-490,-489,-488,-487,-486,-485,-484,-483,-482,-481,-480,-479,-478,-477,-476,-475,-474,-473,-472,-471,-470,-469,-468,-467,-466,-465,-464,-463,-462,-461,-460,-459,-458,-457,-456,-455,-454,-453,-452,-451,-450,-449,-448,-447,-446,-445,-444,-443,-442,-441,-440,-439,-438,-437,-436,-435,-434,-433,-432,-431,-430,-429,-428,-427,-426,-425,-424,-423,-422,-421,-420,-419,-418,-417,-416,-415,-414,-413,-412,-411,-410,-409,-408,-407,-406,-405,-404,-403,-402,-401,-400,-399,-398,-397,-396,-395,-394,-393,-392,-391,-390,-389,-388,-387,-386,-385,-384,-383,-382,-381,-380,-379,-378,-377,-376,-375,-374,-373,-372,-371,-370,-369,-368,-367,-366,-365,-364,-363,-362,-361,-360,-359,-358,-357,-356,-355,-354,-353,-352,-351,-350,-349,-348,-347,-346,-345,-344,-343,-342,-341,-340,-339,-338,-337,-336,-335,-334,-333,-332,-331,-330,-329,-328,-327,-326,-325,-324,-323,-322,-321,-320,-319,-318,-317,-316,-315,-314,-313,-312,-311,-310,-309,-308,-307,-306,-305,-304,-303,-302,-301,-300,-299,-298,-297,-296,-295,-294,-293,-292,-291,-290,-289,-288,-287,-286,-285,-284,-283,-282,-281,-280,-279,-278,-277,-276,-275,-274,-273,-272,-271,-270,-269,-268,-267,-266,-265,-264,-263,-262,-261,-260,-259,-258,-257,-256,-255,-254,-253,-252,-251,-250,-249,-248,-247,-246,-245,-244,-243,-242,-241,-240,-239,-238,-237,-236,-235,-234,-233,-232,-231,-230,-229,-228,-227,-226,-225,-224,-223,-222,-221,-220,-219,-218,-217,-216,-215,-214,-213,-212,-211,-210,-209,-208,-207,-206,-205,-204,-203,-202,-201,-200,-199,-198,-197,-196,-195,-194,-193,-192,-191,-190,-189,-188,-187,-186,-185,-184,-183,-182,-181,-180,-179,-178,-177,-176,-175,-174,-173,-172,-171,-170,-169,-168,-167,-166,-165,-164,-163,-162,-161,-160,-159,-158,-157,-156,-155,-154,-153,-152,-151,-150,-149,-148,-147,-146,-145,-144,-143,-142,-141,-140,-139,-138,-137,-136,-135,-134,-133,-132,-131,-130,-129,-128,-127,-126,-125,-124,-123,-122,-121,-120,-119,-118,-117,-116,-115,-114,-113,-112,-111,-110,-109,-108,-107,-106,-105,-104,-103,-102,-101,-100,-99,-98,-97,-96,-95,-94,-93,-92,-91,-90,-89,-88,-87,-86,-85,-84,-83,-82,-81,-80,-79,-78,-77,-76,-75,-74,-73,-72,-71,-70,-69,-68,-67,-66,-65,-64,-63,-62,-61,-60,-59,-58,-57,-56,-55,-54,-53,-52,-51,-50,-49,-48,-47,-46,-45,-44,-43,-42,-41,-40,-39,-38,-37,-36,-35,-34,-33,-32,-31,-30,-29,-28,-27,-26,-25,-24,-23,-22,-21,-20,-19,-18,-17,-16,-15,-14,-13,-12,-11,-10,-9,-8,-7,-6,-5,-4,-3,-2,-1,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,254,255,256,257,258,259,260,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276,277,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292,293,294,295,296,297,298,299,300,301,302,303,304,305,306,307,308,309,310,311,312,313,314,315,316,317,318,319,320,321,322,323,324,325,326,327,328,329,330,331,332,333,334,335,336,337,338,339,340,341,342,343,344,345,346,347,348,349,350,351,352,353,354,355,356,357,358,359,360,361,362,363,364,365,366,367,368,369,370,371,372,373,374,375,376,377,378,379,380,381,382,383,384,385,386,387,388,389,390,391,392,393,394,395,396,397,398,399,400,401,402,403,404,405,406,407,408,409,410,411,412,413,414,415,416,417,418,419,420,421,422,423,424,425,426,427,428,429,430,431,432,433,434,435,436,437,438,439,440,441,442,443,444,445,446,447,448,449,450,451,452,453,454,455,456,457,458,459,460,461,462,463,464,465,466,467,468,469,470,471,472,473,474,475,476,477,478,479,480,481,482,483,484,485,486,487,488,489,490,491,492,493,494,495,496,497,498,499,500,501,502,503,504,505,506,507,508,509,510,511,512,513,514,515,516,517,518,519,520,521,522]],[-500,-499,-498,-497,-496,-495,-494,-493,-492,-491,-490,-489,-488,-487,-486,-485,-484,-483,-482,-481,-480,-479,-478,-477,-476,-475,-474,-473,-472,-471,-470,-469,-468,-467,-466,-465,-464,-463,-462,-461,-460,-459,-458,-457,-456,-455,-454,-453,-452,-451,-450,-449,-448,-447,-446,-445,-444,-443,-442,-441,-440,-439,-438,-437,-436,-435,-434,-433,-432,-431,-430,-429,-428,-427,-426,-425,-424,-423,-422,-421,-420,-419,-418,-417,-416,-415,-414,-413,-412,-411,-410,-409,-408,-407,-406,-405,-404,-403,-402,-401,-400,-399,-398,-397,-396,-395,-394,-393,-392,-391,-390,-389,-388,-387,-386,-385,-384,-383,-382,-381,-380,-379,-378,-377,-376,-375,-374,-373,-372,-371,-370,-369,-368,-367,-366,-365,-364,-363,-362,-361,-360,-359,-358,-357,-356,-355,-354,-353,-352,-351,-350,-349,-348,-347,-346,-345,-344,-343,-342,-341,-340,-339,-338,-337,-336,-335,-334,-333,-332,-331,-330,-329,-328,-327,-326,-325,-324,-323,-322,-321,-320,-319,-318,-317,-316,-315,-314,-313,-312,-311,-310,-309,-308,-307,-306,-305,-304,-303,-302,-301,-300,-299,-298,-297,-296,-295,-294,-293,-292,-291,-290,-289,-288,-287,-286,-285,-284,-283,-282,-281,-280,-279,-278,-277,-276,-275,-274,-273,-272,-271,-270,-269,-268,-267,-266,-265,-264,-263,-262,-261,-260,-259,-258,-257,-256,-255,-254,-253,-252,-251,-250,-249,-248,-247,-246,-245,-244,-243,-242,-241,-240,-239,-238,-237,-236,-235,-234,-233,-232,-231,-230,-229,-228,-227,-226,-225,-224,-223,-222,-221,-220,-219,-218,-217,-216,-215,-214,-213,-212,-211,-210,-209,-208,-207,-206,-205,-204,-203,-202,-201,-200,-199,-198,-197,-196,-195,-194,-193,-192,-191,-190,-189,-188,-187,-186,-185,-184,-183,-182,-181,-180,-179,-178,-177,-176,-175,-174,-173,-172,-171,-170,-169,-168,-167,-166,-165,-164,-163,-162,-161,-160,-159,-158,-157,-156,-155,-154,-153,-152,-151,-150,-149,-148,-147,-146,-145,-144,-143,-142,-141,-140,-139,-138,-137,-136,-135,-134,-133,-132,-131,-130,-129,-128,-127,-126,-125,-124,-123,-122,-121,-120,-119,-118,-117,-116,-115,-114,-113,-112,-111,-110,-109,-108,-107,-106,-105,-104,-103,-102,-101,-100,-99,-98,-97,-96,-95,-94,-93,-92,-91,-90,-89,-88,-87,-86,-85,-84,-83,-82,-81,-80,-79,-78,-77,-76,-75,-74,-73,-72,-71,-70,-69,-68,-67,-66,-65,-64,-63,-62,-61,-60,-59,-58,-57,-56,-55,-54,-53,-52,-51,-50,-49,-48,-47,-46,-45,-44,-43,-42,-41,-40,-39,-38,-37,-36,-35,-34,-33,-32,-31,-30,-29,-28,-27,-26,-25,-24,-23,-22,-21,-20,-19,-18,-17,-16,-15,-14,-13,-12,-11,-10,-9,-8,-7,-6,-5,-4,-3,-2,-1,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,254,255,256,257,258,259,260,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276,277,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292,293,294,295,296,297,298,299,300,301,302,303,304,305,306,307,308,309,310,311,312,313,314,315,316,317,318,319,320,321,322,323,324,325,326,327,328,329,330,331,332,333,334,335,336,337,338,339,340,341,342,343,344,345,346,347,348,349,350,351,352,353,354,355,356,357,358,359,360,361,362,363,364,365,366,367,368,369,370,371,372,373,374,375,376,377,378,379,380,381,382,383,384,385,386,387,388,389,390,391,392,393,394,395,396,397,398,399,400,401,402,403,404,405,406,407,408,409,410,411,412,413,414,415,416,417,418,419,420,421,422,423,424,425,426,427,428,429,430,431,432,433,434,435,436,437,438,439,440,441,442,443,444,445,446,447,448,449,450,451,452,453,454,455,456,457,458,459,460,461,462,463,464,465,466,467,468,469,470,471,472,473,474,475,476,477,478,479,480,481,482,483,484,485,486,487,488,489,490,491,492,493,494,495,496,497,498,499,500,501,502,503,504,505,506,507,508,509,510,511,512,513,514,515,516,517,518,519,520,521,522]],
      [[[-3,-2,-1,0]],[-3,-2,-1,0]],
      [[{'$range': [-10000,10000,2]}],{'$range': [-10000,10000,2]}]
    ] },
    solution: {
      approach: `<p>Middle element as root, recurse on both halves.</p>`,
      code: `
        class Solution {
            public TreeNode sortedArrayToBST(int[] nums) {
                return build(nums, 0, nums.length - 1);
            }
            private TreeNode build(int[] a, int lo, int hi) {
                if (lo > hi) return null;
                int mid = (lo + hi) >>> 1;                 // middle -> balanced halves
                TreeNode node = new TreeNode(a[mid]);
                node.left = build(a, lo, mid - 1);         // smaller half
                node.right = build(a, mid + 1, hi);        // bigger half
                return node;
            }
        }`,
      alt: [{ lang: 'python', code: `class Solution:
    def sorted_array_to_bst(self, nums):
        def build(lo, hi):
            if lo > hi:
                return None
            mid = (lo + hi) // 2             # middle -> balanced halves
            return TreeNode(nums[mid], build(lo, mid - 1), build(mid + 1, hi))

        return build(0, len(nums) - 1)
` }, { lang: 'js', code: `function sortedArrayToBST(nums) {
  const build = (lo, hi) => {
    if (lo > hi) return null;
    const mid = (lo + hi) >> 1;                      // middle -> balanced halves
    return new TreeNode(nums[mid], build(lo, mid - 1), build(mid + 1, hi));
  };
  return build(0, nums.length - 1);
}
` }, { lang: 'cpp', code: `// LeetCode-style node (the judge normally provides it)
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(x), left(l), right(r) {}
};

class Solution {
public:
    TreeNode* sortedArrayToBST(vector<int>& nums) { return build(nums, 0, (int)nums.size() - 1); }

private:
    TreeNode* build(const vector<int>& a, int lo, int hi) {
        if (lo > hi) return nullptr;
        int mid = lo + (hi - lo) / 2;        // middle -> balanced halves
        return new TreeNode(a[mid], build(a, lo, mid - 1), build(a, mid + 1, hi));
    }
};
` }],
      dry: { head: ['range', 'mid', 'root'], rows: [['[0..4]', '2', '0'], ['[0..1]', '0', '−10 (right child −3)'], ['[3..4]', '3', H.c('g', '5 (right child 9)')]] },
      complexity: `<p><b>Time O(n)</b>, <b>space O(log n)</b> recursion (the result tree is balanced).</p>`,
      followUps: ['Same from a sorted linked list (slow/fast pointer or inorder simulation)', 'Balance an existing BST (inorder → this)']
    }
  });
  /* ===================== PRACTICE: Medium ===================== */
  practice.push({
    title: 'Binary Tree Zigzag Level Order Traversal',
    level: 'Medium',
    tags: ['bfs', 'deque'],
    companies: ['Amazon', 'Microsoft', 'Bloomberg', 'Meta'],
    statement: `<p>Return the level order traversal of a binary tree, but alternate direction: level 0 left → right, level 1 right → left, level 2 left → right, and so on.</p>`,
    constraints: `0 ≤ nodes ≤ 2000, −100 ≤ Node.val ≤ 100`,
    example: `<p><code>root = [3,9,20,null,null,15,7]</code> → ${H.c('g', '[[3], [20, 9], [15, 7]]')}. Level 1 is [9, 20] in normal order and is reversed because it is an odd level.</p>`,
    brute: {
      why: `<p>Run normal level order, then reverse every odd level (<code>Collections.reverse</code> / <code>row[::-1]</code> / <code>reverse()</code> / <code>std::reverse</code>). Still O(N) overall, but it does an extra pass per level and is the version interviewers ask you to improve ("can you produce each row in the right order directly?").</p>`,
      code: `
        List<List<Integer>> zigzagBrute(TreeNode root) {
            List<List<Integer>> res = new ArrayList<>();
            if (root == null) return res;
            Queue<TreeNode> q = new ArrayDeque<>();
            q.offer(root);
            while (!q.isEmpty()) {
                int size = q.size();
                List<Integer> row = new ArrayList<>();
                for (int i = 0; i < size; i++) {
                    TreeNode n = q.poll();
                    row.add(n.val);
                    if (n.left != null) q.offer(n.left);
                    if (n.right != null) q.offer(n.right);
                }
                if (res.size() % 2 == 1) Collections.reverse(row);   // extra pass
                res.add(row);
            }
            return res;
        }`
    },
    mcq: { q: 'To avoid reversing, how can you build an odd level row directly?', options: ['Visit children right-to-left in the queue', 'Add each value at the FRONT of a deque/LinkedList on odd levels', 'Sort the row', 'Use a stack instead of a queue for the whole BFS'], answer: 1, explain: 'Keep the queue in normal order (so the next levels stay correct) and only change where values are placed in the row: addFirst on odd levels.' },
    hints: [
      `<p><b>Aha:</b> the visiting order of BFS doesn't need to change — only the order in which each level is <b>written</b> alternates.</p>`,
      `<p>Standard BFS with the size snapshot plus a boolean <code>leftToRight</code>. Use a deque for the row (<code>LinkedList</code> in Java, <code>collections.deque</code> in Python, <code>std::deque</code> in C++) and add at the back or the front depending on the flag. In JavaScript fill the row, then reverse it (<code>unshift</code> is O(n)).</p>`,
      `<p><b>Traps:</b> don't change the order children are enqueued (that scrambles deeper levels). Empty tree → empty list. <b>Recipe:</b> BFS; per level make a deque row; addLast if leftToRight else addFirst; flip the flag after each level.</p>`
    ],
    tests: { sig: 'TreeNode -> list<list<int>>', fn: 'zigzagLevelOrder', cases: [
      [[[1,2,3,4,5]],[[1],[3,2],[4,5]]],
      [[[]],[]],
      [[[1]],[[1]]],
      [[[1,null,2,3]],[[1],[2],[3]]],
      [[[3,9,20,null,null,15,7]],[[3],[20,9],[15,7]]],
      [[[-5,-5,0,null,7,7,-100]],[[-5],[0,-5],[7,7,-100]]],
      [[[1,2,3,4,null,null,5,6,null,null,7]],[[1],[3,2],[4,5],[7,6]]],
      [[[18,72,null,-55,-72,null,28,null,34,null,null,null,-24]],[[18],[72],[-55,-72],[34,28],[-24]]],
      [[[-83,-35,-79,null,57,null,-52,null,-7]],[[-83],[-79,-35],[57,-52],[-7]]],
      [[[97,-95,-86,83,null,null,null,null,-87]],[[97],[-86,-95],[83],[-87]]]
    ] },
    solution: {
      approach: `<p>BFS with level snapshots; alternate between addLast and addFirst when building each row.</p>`,
      code: `
        class Solution {
            public List<List<Integer>> zigzagLevelOrder(TreeNode root) {
                List<List<Integer>> res = new ArrayList<>();
                if (root == null) return res;
                Queue<TreeNode> q = new ArrayDeque<>();
                q.offer(root);
                boolean leftToRight = true;
                while (!q.isEmpty()) {
                    int size = q.size();
                    LinkedList<Integer> row = new LinkedList<>();
                    for (int i = 0; i < size; i++) {
                        TreeNode n = q.poll();
                        if (leftToRight) row.addLast(n.val); else row.addFirst(n.val);
                        if (n.left != null) q.offer(n.left);      // queue order never changes
                        if (n.right != null) q.offer(n.right);
                    }
                    res.add(row);
                    leftToRight = !leftToRight;
                }
                return res;
            }
        }`,
      alt: [{ lang: 'python', code: `class Solution:
    def zigzag_level_order(self, root):
        res, level = [], [root] if root else []
        while level:
            vals = [n.val for n in level]
            res.append(vals if len(res) % 2 == 0 else vals[::-1])   # odd levels reversed
            level = [c for n in level for c in (n.left, n.right) if c]
        return res
` }, { lang: 'js', code: `function zigzagLevelOrder(root) {
  const res = [];
  let level = root ? [root] : [];
  while (level.length) {
    const vals = level.map((n) => n.val);
    res.push(res.length % 2 === 0 ? vals : vals.reverse());   // odd levels reversed
    level = level.flatMap((n) => [n.left, n.right].filter(Boolean));
  }
  return res;
}
` }, { lang: 'cpp', code: `// LeetCode-style node (the judge normally provides it)
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(x), left(l), right(r) {}
};

class Solution {
public:
    vector<vector<int>> zigzagLevelOrder(TreeNode* root) {
        vector<vector<int>> res;
        if (!root) return res;
        queue<TreeNode*> q;
        q.push(root);
        while (!q.empty()) {
            int size = q.size();
            vector<int> row(size);
            bool leftToRight = res.size() % 2 == 0;
            for (int i = 0; i < size; i++) {
                TreeNode* n = q.front(); q.pop();
                row[leftToRight ? i : size - 1 - i] = n->val;   // write straight into place
                if (n->left) q.push(n->left);
                if (n->right) q.push(n->right);
            }
            res.push_back(move(row));
        }
        return res;
    }
};
` }],
      dry: { head: ['level', 'BFS order', 'flag', 'row'], rows: [['0', '3', '→', '[3]'], ['1', '9, 20', '←', H.c('g', '[20, 9]')], ['2', '15, 7', '→', '[15, 7]']] },
      complexity: `<p><b>Time O(N)</b>, <b>space O(W)</b> for the queue.</p>`,
      followUps: ['Two-stack version without a queue', 'Spiral order of a matrix — the same alternating idea']
    }
  });

  practice.push({
    title: 'Maximum Width of Binary Tree',
    level: 'Medium',
    tags: ['bfs', 'indexing'],
    companies: ['Amazon', 'Google', 'Microsoft'],
    statement: `<p>The <b>width</b> of a level is the number of positions between its leftmost and rightmost non-null nodes, counting the null positions in between (as if the level were part of a complete tree). Return the maximum width over all levels.</p>`,
    constraints: `1 ≤ nodes ≤ 3000, −100 ≤ Node.val ≤ 100, the answer fits in a 32-bit signed integer`,
    example: `<p><code>root = [1,3,2,5,3,null,9]</code> → ${H.c('g', '4')}. The last level is 5, 3, (null), 9: from position 0 to position 3 → width 4.</p>`,
    brute: {
      why: `<p>BFS that also enqueues <b>null placeholders</b> for every missing child so each level is "complete", then trims leading/trailing nulls and measures. On a deep skewed tree the placeholder count doubles every level: 2<sup>depth</sup> entries — impossible for depth 3000.</p>`,
      code: `
        int widthBrute(TreeNode root) {
            List<TreeNode> level = new ArrayList<>();
            level.add(root);
            int best = 0;
            while (level.stream().anyMatch(Objects::nonNull)) {
                int l = 0, r = level.size() - 1;
                while (level.get(l) == null) l++;
                while (level.get(r) == null) r--;
                best = Math.max(best, r - l + 1);
                List<TreeNode> next = new ArrayList<>();
                for (TreeNode n : level) {                     // placeholders double each level
                    next.add(n == null ? null : n.left);
                    next.add(n == null ? null : n.right);
                }
                level = next;
            }
            return best;
        }`
    },
    mcq: { q: 'Nodes are numbered root = 0, children 2p+1 and 2p+2. Why subtract the first position of each level?', options: ['To sort the level', 'To keep the numbers small so they never overflow on deep trees', 'Because positions must start at 1', 'It changes the answer'], answer: 1, explain: 'Positions double every level; on a deep chain they exceed 2^63. Re-basing each level to start at 0 keeps them bounded by the level width without changing differences.' },
    hints: [
      `<p><b>Aha:</b> give every node its heap index (root 0, children 2p+1, 2p+2). Width of a level = last index − first index + 1. No placeholders needed.</p>`,
      `<p>BFS with a parallel queue of positions (use <code>long</code>). For each level remember the first position and subtract it from every position on that level before computing children.</p>`,
      `<p><b>Recipe:</b> q = [(root, 0)]; per level: first = position of front; for each node p' = p − first; push (left, 2p'+1), (right, 2p'+2); best = max(best, lastP' + 1).</p>`
    ],
    tests: { sig: 'TreeNode -> int', fn: 'widthOfBinaryTree', cases: [
      [[[1,3,2,5,3,null,9]],4],
      [[[1,3,2,5,null,null,9,6,null,7]],7],
      [[[1,3,2,5]],2],
      [[[1]],1],
      [[[1,2,3,4,5,6,7]],4],
      [[[1,2,null,3,null,4]],1],
      [[[0,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,0,null,1,2]],2],
      [[[0,null,0,1,null,null,2,3,null,null,4,5,null,null,6,7,null,null,8,9,null,null,10,11,null,null,12,13,null,null,14,15,null,null,16,17,null,null,18,19,null,null,20,21,null,null,22,23,null,null,24,25,null,null,26,27,null,null,28,29,null,null,30,31,null,null,32,33,null,null,34,35,null,null,36,37,null,null,38,39,null,null,40,41,null,null,42,43,null,null,44,45,null,null,46,47,null,null,48,49,null,null,50,51,null,null,52,53,null,null,54,55,null,null,56,57,null,null,58,59,null,null,60,61,null,null,62,63,null,null,64,65,null,null,66,67,null,null,68,69]],1],
      [[[1,2,3,-1,null,null,-2,-1,null,null,-2,-1,null,null,-2,-1,null,null,-2,-1,null,null,-2,-1,null,null,-2,-1,null,null,-2,-1,null,null,-2,-1,null,null,-2,-1,null,null,-2,-1,null,null,-2,-1,null,null,-2,-1,null,null,-2,-1,null,null,-2,-1,null,null,-2,-1,null,null,-2,-1,null,null,-2,-1,null,null,-2,-1,null,null,-2,-1,null,null,-2,-1,null,null,-2,-1,null,null,-2,-1,null,null,-2,-1,null,null,-2,-1,null,null,-2,-1,null,null,-2,-1,null,null,-2,-1,null,null,-2,-1,null,null,-2]],1073741824]
    ] },
    solution: {
      approach: `<p>BFS with heap-style positions, re-based per level.</p>`,
      code: `
        class Solution {
            public int widthOfBinaryTree(TreeNode root) {
                Deque<TreeNode> q = new ArrayDeque<>();
                Deque<Long> pos = new ArrayDeque<>();
                q.offer(root); pos.offer(0L);
                long best = 0;
                while (!q.isEmpty()) {
                    int size = q.size();
                    long first = pos.peekFirst(), last = 0;
                    for (int i = 0; i < size; i++) {
                        TreeNode n = q.poll();
                        long p = pos.poll() - first;             // re-base: level starts at 0
                        last = p;
                        if (n.left != null)  { q.offer(n.left);  pos.offer(2 * p + 1); }
                        if (n.right != null) { q.offer(n.right); pos.offer(2 * p + 2); }
                    }
                    best = Math.max(best, last + 1);
                }
                return (int) best;
            }
        }`,
      alt: [{ lang: 'python', code: `class Solution:
    def width_of_binary_tree(self, root):
        best, level = 0, [(root, 0)]         # (node, position in a complete tree)
        while level:
            first = level[0][1]
            best = max(best, level[-1][1] - first + 1)
            # re-base on the first position so numbers stay small
            level = [(c, 2 * (p - first) + k)
                     for n, p in level
                     for k, c in ((1, n.left), (2, n.right)) if c]
        return best
` }, { lang: 'js', code: `function widthOfBinaryTree(root) {
  let best = 0;
  let level = [[root, 0]];                 // [node, position in a complete tree]
  while (level.length) {
    const first = level[0][1];
    best = Math.max(best, level[level.length - 1][1] - first + 1);
    const next = [];
    for (const [n, p] of level) {
      const q = p - first;                 // re-base so numbers stay far below 2^53
      if (n.left) next.push([n.left, 2 * q + 1]);
      if (n.right) next.push([n.right, 2 * q + 2]);
    }
    level = next;
  }
  return best;
}
` }, { lang: 'cpp', code: `// LeetCode-style node (the judge normally provides it)
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(x), left(l), right(r) {}
};

class Solution {
public:
    int widthOfBinaryTree(TreeNode* root) {
        long long best = 0;
        queue<pair<TreeNode*, long long>> q;     // (node, position in a complete tree)
        q.push({root, 0});
        while (!q.empty()) {
            int size = q.size();
            long long first = q.front().second, last = 0;
            for (int i = 0; i < size; i++) {
                auto [n, p0] = q.front(); q.pop();
                long long p = p0 - first;        // re-base: the level starts at 0
                last = p;
                if (n->left) q.push({n->left, 2 * p + 1});
                if (n->right) q.push({n->right, 2 * p + 2});
            }
            best = max(best, last + 1);
        }
        return (int)best;
    }
};
` }],
      dry: { head: ['level', 'positions (re-based)', 'width'], rows: [['0', '1@0', '1'], ['1', '3@0, 2@1', '2'], ['2', '5@0, 3@1, 9@3', H.c('g', '4')]] },
      complexity: `<p><b>Time O(N)</b>, <b>space O(W)</b>.</p>`,
      followUps: ['Do it with DFS by storing the first position seen at each depth', 'Why must positions be 64-bit even after re-basing?']
    }
  });

  practice.push({
    title: 'Count Good Nodes in Binary Tree',
    level: 'Medium',
    tags: ['dfs', 'preorder'],
    companies: ['Microsoft', 'Amazon'],
    statement: `<p>A node X is <b>good</b> if on the path from the root to X there is no node with a value <b>greater</b> than X. Return the number of good nodes.</p>`,
    constraints: `1 ≤ nodes ≤ 10<sup>5</sup>, −10<sup>4</sup> ≤ Node.val ≤ 10<sup>4</sup>`,
    example: `<p><code>root = [3,1,4,3,null,1,5]</code> → ${H.c('g', '4')}: the root ${H.c('g', '3')}, ${H.c('g', '4')} (path 3 → 4), ${H.c('g', '5')} (3 → 4 → 5) and the lower ${H.c('g', '3')} (3 → 1 → 3, equal is allowed). 1 under 3 is not good, nor is 1 under 4.</p>`,
    brute: {
      why: `<p>For each node, walk the path from the root again to find the maximum on it (for example by searching for the node from the root while recording the path). That repeats the same prefix of the path for every node → O(N·h), O(N<sup>2</sup>) on a skewed tree of 10<sup>5</sup> nodes.</p>`,
      code: `
        int goodBrute(TreeNode root) {
            List<TreeNode> all = new ArrayList<>();
            gather(root, all);
            int count = 0;
            for (TreeNode x : all) if (maxOnPath(root, x) <= x.val) count++;   // re-walk per node
            return count;
        }
        void gather(TreeNode n, List<TreeNode> out) { if (n == null) return; out.add(n); gather(n.left, out); gather(n.right, out); }
        // max value on the path root -> target (Integer.MIN_VALUE if target not below n)
        int maxOnPath(TreeNode n, TreeNode target) {
            if (n == null) return Integer.MIN_VALUE;
            if (n == target) return n.val;
            int below = Math.max(maxOnPath(n.left, target), maxOnPath(n.right, target));
            return below == Integer.MIN_VALUE ? below : Math.max(below, n.val);
        }`
    },
    mcq: { q: 'What should be passed DOWN to each recursive call?', options: ['The depth', 'The maximum value seen so far on the path from the root', 'The number of good nodes so far', 'The parent node'], answer: 1, explain: 'A node is good exactly when its value is >= the maximum of all values above it, so that maximum is the only information needed from the ancestors.' },
    hints: [
      `<p><b>Aha:</b> "no bigger value above me" = "my value ≥ the max of my ancestors". Carry that max down the path.</p>`,
      `<p>Preorder DFS with a parameter <code>maxSoFar</code>; return the count of good nodes in the subtree (or use a counter field).</p>`,
      `<p><b>Traps:</b> equal values count as good (≥, not &gt;); for 10<sup>5</sup>-deep chains consider an iterative stack of (node, max) pairs. <b>Recipe:</b> go(n, mx): if null 0; good = n.val ≥ mx; mx2 = max(mx, n.val); return (good?1:0) + go(left, mx2) + go(right, mx2).</p>`
    ],
    tests: { sig: 'TreeNode int -> int', fn: 'judge', harness: {
      java: "class Check {\n    // n > 0: right-leaning chain of n nodes, n < 0: left-leaning; node i (0 = root) holds val(i).\n    // Built here because a tree this deep is too big to write out as a test literal.\n    static TreeNode chain(int n, java.util.function.IntUnaryOperator val) {\n        TreeNode root = null;\n        for (int i = Math.abs(n) - 1; i >= 0; i--) {\n            TreeNode t = new TreeNode(val.applyAsInt(i));\n            if (n > 0) t.right = root; else t.left = root;\n            root = t;\n        }\n        return root;\n    }\n\n    static int judge(TreeNode root, int n) {\n        if (n != 0) root = chain(n, i -> (i * 7919) % 20001 - 10000);\n        return new Solution().goodNodes(root);\n    }\n}",
      python: "# n > 0: right-leaning chain of n nodes, n < 0: left-leaning; node i (0 = root) holds val(i).\ndef _chain(n, val):\n    root = None\n    for i in range(abs(n) - 1, -1, -1):\n        t = TreeNode(val(i))\n        if n > 0:\n            t.right = root\n        else:\n            t.left = root\n        root = t\n    return root\n\ndef judge(root, n):\n    if n:\n        root = _chain(n, lambda i: (i * 7919) % 20001 - 10000)\n    return Solution().good_nodes(root)",
      js: "// n > 0: right-leaning chain of n nodes, n < 0: left-leaning; node i (0 = root) holds val(i).\nfunction chain__(n, val) {\n  let root = null;\n  for (let i = Math.abs(n) - 1; i >= 0; i--) {\n    const t = new TreeNode(val(i));\n    if (n > 0) t.right = root; else t.left = root;\n    root = t;\n  }\n  return root;\n}\n\nfunction judge(root, n) {\n  if (n) root = chain__(n, (i) => (i * 7919) % 20001 - 10000);\n  return goodNodes(root);\n}",
      cpp: "// n > 0: right-leaning chain of n nodes, n < 0: left-leaning; node i (0 = root) holds val(i).\nTreeNode* chain__(int n, function<int(int)> val) {\n    TreeNode* root = nullptr;\n    for (int i = abs(n) - 1; i >= 0; i--) {\n        TreeNode* t = new TreeNode(val(i));\n        if (n > 0) t->right = root; else t->left = root;\n        root = t;\n    }\n    return root;\n}\n\nint judge(TreeNode* root, int n) {\n    if (n) root = chain__(n, [](int i) { return (i * 7919) % 20001 - 10000; });\n    return Solution().goodNodes(root);\n}"
    }, cases: [
      [[[3,1,4,3,null,1,5],0],4],
      [[[3,3,null,4,2],0],3],
      [[[1],0],1],
      [[[-10000],0],1],
      [[[5,4,3,2,1],0],1],
      [[[2,null,4,10,8,null,null,4],0],4],
      [[[0,0,0,0],0],4],
      [[[-2049,-6595,2277,null,-7825,null,3419,null,null,null,-432,-4630,-6887,9934,-6067,2562,null,-1500,null,null,8647,null,1673,null,null,null,8069],0],5],
      [[[0,0,null,1,null,1,null,2,null,2,null,3,null,3,null,4,null,4,null,5,null,5,null,6,null,6,null,7,null,7,null,8,null,8,null,9,null,9,null,10,null,10,null,11,null,11,null,12,null,12,null,13,null,13,null,14,null,14,null,15,null,15,null,16,null,16,null,17,null,17,null,18,null,18,null,19,null,19,null,20,null,20,null,21,null,21,null,22,null,22,null,23,null,23,null,24,null,24,null,25,null,25,null,26,null,26,null,27,null,27,null,28,null,28,null,29,null,29,null,30,null,30,null,31,null,31,null,32,null,32,null,33,null,33,null,34,null,34,null,35,null,35,null,36,null,36,null,37,null,37,null,38,null,38,null,39,null,39,null,40,null,40,null,41,null,41,null,42,null,42,null,43,null,43,null,44,null,44,null,45,null,45,null,46,null,46,null,47,null,47,null,48,null,48,null,49,null,49,null,50,null,50,null,51,null,51,null,52,null,52,null,53,null,53,null,54,null,54,null,55,null,55,null,56,null,56,null,57,null,57,null,58,null,58,null,59,null,59,null,60,null,60,null,61,null,61,null,62,null,62,null,63,null,63,null,64,null,64,null,65,null,65,null,66,null,66,null,67,null,67,null,68,null,68,null,69,null,69,null,70,null,70,null,71,null,71,null,72,null,72,null,73,null,73,null,74,null,74,null,75,null,75,null,76,null,76,null,77,null,77,null,78,null,78,null,79,null,79,null,80,null,80,null,81,null,81,null,82,null,82,null,83,null,83,null,84,null,84,null,85,null,85,null,86,null,86,null,87,null,87,null,88,null,88,null,89,null,89,null,90,null,90,null,91,null,91,null,92,null,92,null,93,null,93,null,94,null,94,null,95,null,95,null,96,null,96,null,97,null,97,null,98,null,98,null,99,null,99,null,100,null,100,null,101,null,101,null,102,null,102,null,103,null,103,null,104,null,104,null,105,null,105,null,106,null,106,null,107,null,107,null,108,null,108,null,109,null,109,null,110,null,110,null,111,null,111,null,112,null,112,null,113,null,113,null,114,null,114,null,115,null,115,null,116,null,116,null,117,null,117,null,118,null,118,null,119,null,119,null,120,null,120,null,121,null,121,null,122,null,122,null,123,null,123,null,124,null,124,null,125,null,125,null,126,null,126,null,127,null,127,null,128,null,128,null,129,null,129,null,130,null,130,null,131,null,131,null,132,null,132,null,133,null,133,null,134,null,134,null,135,null,135,null,136,null,136,null,137,null,137,null,138,null,138,null,139,null,139,null,140,null,140,null,141,null,141,null,142,null,142,null,143,null,143,null,144,null,144,null,145,null,145,null,146,null,146,null,147,null,147,null,148,null,148,null,149,null,149,null,150,null,150,null,151,null,151,null,152,null,152,null,153,null,153,null,154,null,154,null,155,null,155,null,156,null,156,null,157,null,157,null,158,null,158,null,159,null,159,null,160,null,160,null,161,null,161,null,162,null,162,null,163,null,163,null,164,null,164,null,165,null,165,null,166,null,166,null,167,null,167,null,168,null,168,null,169,null,169,null,170,null,170,null,171,null,171,null,172,null,172,null,173,null,173,null,174,null,174,null,175,null,175,null,176,null,176,null,177,null,177,null,178,null,178,null,179,null,179,null,180,null,180,null,181,null,181,null,182,null,182,null,183,null,183,null,184,null,184,null,185,null,185,null,186,null,186,null,187,null,187,null,188,null,188,null,189,null,189,null,190,null,190,null,191,null,191,null,192,null,192,null,193,null,193,null,194,null,194,null,195,null,195,null,196,null,196,null,197,null,197,null,198,null,198,null,199,null,199,null,200,null,200,null,201,null,201,null,202,null,202,null,203,null,203,null,204,null,204,null,205,null,205,null,206,null,206,null,207,null,207,null,208,null,208,null,209,null,209,null,210,null,210,null,211,null,211,null,212,null,212,null,213,null,213,null,214,null,214,null,215,null,215,null,216,null,216,null,217,null,217,null,218,null,218,null,219,null,219,null,220,null,220,null,221,null,221,null,222,null,222,null,223,null,223,null,224,null,224,null,225,null,225,null,226,null,226,null,227,null,227,null,228,null,228,null,229,null,229,null,230,null,230,null,231,null,231,null,232,null,232,null,233,null,233,null,234,null,234,null,235,null,235,null,236,null,236,null,237,null,237,null,238,null,238,null,239,null,239,null,240,null,240,null,241,null,241,null,242,null,242,null,243,null,243,null,244,null,244,null,245,null,245,null,246,null,246,null,247,null,247,null,248,null,248,null,249,null,249],0],500],
      [[[],-100000],14]
    ] },
    solution: {
      approach: `<p>Top-down DFS carrying the path maximum.</p>`,
      code: `
        class Solution {
            public int goodNodes(TreeNode root) {
                // explicit stacks instead of recursion: the tree can be a 10^5-deep chain
                Deque<TreeNode> nodes = new ArrayDeque<>();
                Deque<Integer> maxAbove = new ArrayDeque<>();   // largest value on the path above each node
                nodes.push(root); maxAbove.push(Integer.MIN_VALUE);
                int good = 0;
                while (!nodes.isEmpty()) {
                    TreeNode n = nodes.pop();
                    int maxSoFar = maxAbove.pop();
                    if (n.val >= maxSoFar) good++;               // nobody above me is bigger
                    int mx = Math.max(maxSoFar, n.val);          // new max for my children
                    if (n.left != null) { nodes.push(n.left); maxAbove.push(mx); }
                    if (n.right != null) { nodes.push(n.right); maxAbove.push(mx); }
                }
                return good;
            }
        }`,
      alt: [{ lang: 'python', code: `class Solution:
    def good_nodes(self, root):
        count, stack = 0, [(root, root.val)]  # (node, max value above it)
        while stack:
            n, mx = stack.pop()
            if n.val >= mx:
                count += 1                   # nobody above is bigger
            mx = max(mx, n.val)
            stack.extend((c, mx) for c in (n.left, n.right) if c)
        return count
` }, { lang: 'js', code: `function goodNodes(root) {
  let count = 0;
  const stack = [[root, root.val]];        // [node, max value above it]
  while (stack.length) {
    const [n, mx] = stack.pop();
    if (n.val >= mx) count++;              // nobody above is bigger
    const m = Math.max(mx, n.val);
    if (n.left) stack.push([n.left, m]);
    if (n.right) stack.push([n.right, m]);
  }
  return count;
}
` }, { lang: 'cpp', code: `// LeetCode-style node (the judge normally provides it)
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(x), left(l), right(r) {}
};

class Solution {
public:
    int goodNodes(TreeNode* root) {
        int count = 0;
        vector<pair<TreeNode*, int>> st{{root, root->val}};   // (node, max value above it)
        while (!st.empty()) {
            auto [n, mx] = st.back(); st.pop_back();
            if (n->val >= mx) count++;                        // nobody above is bigger
            int m = max(mx, n->val);
            if (n->left) st.push_back({n->left, m});
            if (n->right) st.push_back({n->right, m});
        }
        return count;
    }
};
` }],
      dry: { head: ['node', 'maxSoFar', 'good?', 'max passed down'], rows: [['3 (root)', '−∞', H.c('g', 'yes'), '3'], ['1', '3', H.c('r', 'no'), '3'], ['3 (under 1)', '3', H.c('g', 'yes'), '3'], ['4', '3', H.c('g', 'yes'), '4'], ['1 (under 4)', '4', H.c('r', 'no'), '4'], ['5', '4', H.c('g', 'yes → total 4'), '5']] },
      complexity: `<p><b>Time O(N)</b>, <b>space O(N)</b> worst case for the stacks. A recursive version is shorter but needs O(h) call stack, which overflows on a 10<sup>5</sup>-deep chain.</p>`,
      followUps: ['Return the good nodes themselves', 'Count nodes equal to the average of their subtree (bottom-up instead of top-down)']
    }
  });

  practice.push({
    title: 'Binary Search Tree Iterator',
    level: 'Medium',
    tags: ['bst', 'stack', 'design', 'iterator'],
    companies: ['Meta', 'Google', 'Amazon', 'Microsoft'],
    statement: `<p>Implement <code>BSTIterator</code> over a BST: <code>next()</code> returns the next smallest value, <code>hasNext()</code> says whether one exists. Calls must run in <b>O(1) amortised</b> time using <b>O(h)</b> memory.</p>`,
    constraints: `1 ≤ nodes ≤ 10<sup>5</sup>, at most 10<sup>5</sup> calls, next() is only called when hasNext() is true`,
    example: `<p>BST <code>[7,3,15,null,null,9,20]</code>. Calls: next → ${H.c('g', '3')}, next → ${H.c('g', '7')}, hasNext → true, next → ${H.c('g', '9')}, next → 15, next → 20, hasNext → ${H.c('r', 'false')}. The values come out in sorted order because this is a paused inorder walk.</p>`,
    brute: {
      why: `<p>Flatten the whole tree into a sorted list in the constructor (inorder) and walk an index. next() is O(1), but memory is O(N) instead of O(h), and the constructor does all N steps even if the caller only wants the first few values.</p>`,
      code: `
        class BSTIteratorBrute {
            private final List<Integer> vals = new ArrayList<>();
            private int i = 0;
            BSTIteratorBrute(TreeNode root) { fill(root); }          // O(N) memory up front
            private void fill(TreeNode n) { if (n == null) return; fill(n.left); vals.add(n.val); fill(n.right); }
            int next() { return vals.get(i++); }
            boolean hasNext() { return i < vals.size(); }
        }`
    },
    mcq: { q: 'Why is next() O(1) amortised even though one call may push many nodes?', options: ['Because the tree is balanced', 'Because every node is pushed once and popped once over the whole iteration', 'Because ArrayDeque is O(1)', 'It is actually O(log N) per call'], answer: 1, explain: 'Total work across all N calls is O(N) (one push and one pop per node), so the average per call is O(1), even if a single call slides down a long left chain.' },
    hints: [
      `<p><b>Aha:</b> an iterative inorder can be <b>paused</b>: its stack is the complete saved state. next() = one step of that loop.</p>`,
      `<p>Keep a stack of nodes. Helper <code>pushLeft(n)</code> pushes n and all its left descendants. Constructor: pushLeft(root). next(): pop, then pushLeft(popped.right).</p>`,
      `<p><b>Recipe:</b> hasNext = !stack.isEmpty(); next: node = pop(); pushLeft(node.right); return node.val. Space stays O(h) because the stack holds one path.</p>`
    ],
    tests: { cls: 'BSTIterator', sigs: {BSTIterator: "TreeNode",next: "-> int",hasNext: "-> bool"}, cases: [
      {ops: ["BSTIterator","next","next","hasNext","next","next","next","hasNext"],args: [[[7,3,15,null,null,9,20]],[],[],[],[],[],[],[]],out: [null,3,7,true,9,15,20,false]},
      {ops: ["BSTIterator","hasNext","next","hasNext"],args: [[[1]],[],[],[]],out: [null,true,1,false]},
      {ops: ["BSTIterator","hasNext","next","hasNext","next","hasNext"],args: [[[2,1]],[],[],[],[],[]],out: [null,true,1,true,2,false]},
      {ops: ["BSTIterator","next","next","next","hasNext"],args: [[[1,null,2,null,3]],[],[],[],[]],out: [null,1,2,3,false]},
      {ops: ["BSTIterator","hasNext","next","next","next","next","next","next","next","next","next","hasNext"],args: [[[50,30,70,20,40,60,80,null,null,35,null,null,65]],[],[],[],[],[],[],[],[],[],[],[]],out: [null,true,20,30,35,40,50,60,65,70,80,false]},
      {ops: ["BSTIterator","next","next","next","next","next","next","next","next","next","next","hasNext","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","hasNext"],args: [[[516,138,733,-175,405,732,816,-372,-132,394,null,702,null,null,null,-787,-260,-165,-107,244,null,527,null,-975,-621,null,-213,null,null,null,77,null,379,null,null,null,null,null,-601,null,null,-18,null,312]],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]],out: [null,-975,-787,-621,-601,-372,-260,-213,-175,-165,-132,true,-107,-18,77,138,244,312,379,394,405,516,527,702,732,733,816,false]},
      {ops: ["BSTIterator","hasNext","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","next","hasNext"],args: [[[200,199,null,198,null,197,null,196,null,195,null,194,null,193,null,192,null,191,null,190,null,189,null,188,null,187,null,186,null,185,null,184,null,183,null,182,null,181,null,180,null,179,null,178,null,177,null,176,null,175,null,174,null,173,null,172,null,171,null,170,null,169,null,168,null,167,null,166,null,165,null,164,null,163,null,162,null,161,null,160,null,159,null,158,null,157,null,156,null,155,null,154,null,153,null,152,null,151,null,150,null,149,null,148,null,147,null,146,null,145,null,144,null,143,null,142,null,141,null,140,null,139,null,138,null,137,null,136,null,135,null,134,null,133,null,132,null,131,null,130,null,129,null,128,null,127,null,126,null,125,null,124,null,123,null,122,null,121,null,120,null,119,null,118,null,117,null,116,null,115,null,114,null,113,null,112,null,111,null,110,null,109,null,108,null,107,null,106,null,105,null,104,null,103,null,102,null,101,null,100,null,99,null,98,null,97,null,96,null,95,null,94,null,93,null,92,null,91,null,90,null,89,null,88,null,87,null,86,null,85,null,84,null,83,null,82,null,81,null,80,null,79,null,78,null,77,null,76,null,75,null,74,null,73,null,72,null,71,null,70,null,69,null,68,null,67,null,66,null,65,null,64,null,63,null,62,null,61,null,60,null,59,null,58,null,57,null,56,null,55,null,54,null,53,null,52,null,51,null,50,null,49,null,48,null,47,null,46,null,45,null,44,null,43,null,42,null,41,null,40,null,39,null,38,null,37,null,36,null,35,null,34,null,33,null,32,null,31,null,30,null,29,null,28,null,27,null,26,null,25,null,24,null,23,null,22,null,21,null,20,null,19,null,18,null,17,null,16,null,15,null,14,null,13,null,12,null,11,null,10,null,9,null,8,null,7,null,6,null,5,null,4,null,3,null,2,null,1]],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]],out: [null,true,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,false]}
    ] },
    solution: {
      approach: `<p>Controlled iterative inorder: the stack holds the leftmost path of the unvisited part.</p>`,
      code: `
        class BSTIterator {
            private final Deque<TreeNode> st = new ArrayDeque<>();

            public BSTIterator(TreeNode root) { pushLeft(root); }

            private void pushLeft(TreeNode n) {
                while (n != null) { st.push(n); n = n.left; }   // smallest values end up on top
            }

            public int next() {
                TreeNode n = st.pop();          // smallest unvisited value
                pushLeft(n.right);              // its successor candidates
                return n.val;
            }

            public boolean hasNext() { return !st.isEmpty(); }
        }`,
      alt: [{ lang: 'python', code: `class BSTIterator:
    def __init__(self, root):
        self.stack = []
        self._push_left(root)

    def _push_left(self, n):
        while n:                             # smallest values end up on top
            self.stack.append(n)
            n = n.left

    def next(self):
        n = self.stack.pop()
        self._push_left(n.right)             # its successors
        return n.val

    def hasNext(self):
        return bool(self.stack)
` }, { lang: 'js', code: `class BSTIterator {
  constructor(root) {
    this.stack = [];
    this.pushLeft(root);
  }

  pushLeft(n) {
    for (; n; n = n.left) this.stack.push(n);   // smallest values end up on top
  }

  next() {
    const n = this.stack.pop();
    this.pushLeft(n.right);                      // its successors
    return n.val;
  }

  hasNext() {
    return this.stack.length > 0;
  }
}
` }, { lang: 'cpp', code: `// LeetCode-style node (the judge normally provides it)
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(x), left(l), right(r) {}
};

class BSTIterator {
    stack<TreeNode*> st;

    void pushLeft(TreeNode* n) {
        for (; n; n = n->left) st.push(n);   // smallest values end up on top
    }

public:
    BSTIterator(TreeNode* root) { pushLeft(root); }

    int next() {
        TreeNode* n = st.top(); st.pop();
        pushLeft(n->right);                  // its successors
        return n->val;
    }

    bool hasNext() { return !st.empty(); }
};
` }],
      dry: { head: ['call', 'stack before (top last)', 'returns', 'stack after'], rows: [['init', '—', '—', '[7, 3]'], ['next', '[7, 3]', '3', '[7]'], ['next', '[7]', '7', '[15, 9]'], ['next', '[15, 9]', '9', '[15]'], ['next', '[15]', '15', '[20]'], ['next', '[20]', '20', H.c('g', '[ ] → hasNext false')]] },
      complexity: `<p><b>next(): O(1) amortised</b>, O(h) worst for one call. <b>hasNext(): O(1)</b>. <b>Space O(h)</b>.</p>`,
      followUps: ['Add a prev() method (two stacks or store visited values)', 'Two Sum IV on a BST in O(h) space with a forward and a backward iterator']
    }
  });

  practice.push({
    title: 'Construct Binary Tree from Inorder and Postorder Traversal',
    level: 'Medium',
    tags: ['divide and conquer', 'hashmap'],
    companies: ['Amazon', 'Microsoft', 'Bloomberg'],
    statement: `<p>Given <code>inorder</code> and <code>postorder</code> traversals of the same binary tree (all values unique), build and return the tree.</p>`,
    constraints: `1 ≤ n ≤ 3000, −3000 ≤ value ≤ 3000, values unique`,
    example: `<p>inorder = ${H.c('b', '[9,3,15,20,7]')}, postorder = ${H.c('p', '[9,15,7,20,3]')} → ${H.c('g', '[3,9,20,null,null,15,7]')}. The <b>last</b> postorder value 3 is the root; inorder puts [9] on its left and [15,20,7] on its right. Reading postorder backwards (3, 20, 7, 15, 9) gives roots in Me, Right, Left order.</p>`,
    brute: {
      why: `<p>Take the last postorder value as root, scan inorder linearly to find it, copy the left and right sub-arrays of both traversals and recurse. Linear search + copying at every node → O(n<sup>2</sup>) time and memory churn on skewed trees.</p>`,
      code: `
        TreeNode buildBrute(int[] in, int[] post) {
            int n = in.length;
            if (n == 0) return null;
            TreeNode root = new TreeNode(post[n - 1]);
            int m = 0;
            while (in[m] != root.val) m++;                      // O(n) search
            root.left = buildBrute(Arrays.copyOfRange(in, 0, m), Arrays.copyOfRange(post, 0, m));
            root.right = buildBrute(Arrays.copyOfRange(in, m + 1, n), Arrays.copyOfRange(post, m, n - 1));
            return root;
        }`
    },
    mcq: { q: 'Reading postorder from the END with one shared index, which subtree must you build first?', options: ['Left', 'Right', 'Either', 'Whichever window is larger'], answer: 1, explain: 'Postorder is Left, Right, Me. Backwards it is Me, Right, Left — so after the root the next values belong to the RIGHT subtree.' },
    hints: [
      `<p><b>Aha:</b> postorder's <b>last</b> element is the root. Inorder splits the rest into left and right, exactly like the preorder version.</p>`,
      `<p>A hash map value → inorder index; a counter <code>postIdx</code> starting at n − 1 and moving left; <code>build(lo, hi)</code> on inorder windows.</p>`,
      `<p><b>Traps:</b> build <b>right before left</b>. <b>Recipe:</b> if lo &gt; hi null; root = post[postIdx--]; m = map[root]; root.right = build(m+1, hi); root.left = build(lo, m−1).</p>`
    ],
    tests: { sig: 'int[] int[] -> TreeNode', fn: 'buildTree', cases: [
      [[[9,3,15,20,7],[9,15,7,20,3]],[3,9,20,null,null,15,7]],
      [[[-1],[-1]],[-1]],
      [[[2,1],[2,1]],[1,2]],
      [[[1,2],[2,1]],[1,null,2]],
      [[[4,2,5,1,6,3,7],[4,5,2,6,7,3,1]],[1,2,3,4,5,6,7]],
      [[[5,4,3,2,1],[5,4,3,2,1]],[1,2,null,3,null,4,null,5]],
      [[[1772,2884,2396,-631,2993,2324,-201,-818,-1277],[2396,2884,1772,2993,-201,2324,-818,-1277,-631]],[-631,1772,-1277,null,2884,-818,null,null,2396,2324,null,null,null,2993,-201]],
      [[[-1790,-1945,1278,-1320,380,-2241,-2129,-1170,-2240,1127,2542,-1898,32,210,-1437,-2107],[-1790,-1945,-1320,380,1278,-2129,-1170,-2241,1127,2542,32,-1898,-1437,210,-2107,-2240]],[-2240,-2241,-2107,1278,-1170,210,null,-1945,380,-2129,null,-1898,-1437,-1790,null,-1320,null,null,null,2542,32,null,null,null,null,null,null,1127]],
      [[{'$range': [0,3000]},{'$range': [2999,-1,-1]}],m14chain(3000, 'r')]
    ] },
    solution: {
      approach: `<p>Mirror of the preorder construction: consume postorder from the end, right subtree first.</p>`,
      code: `
        class Solution {
            private int postIdx;
            private Map<Integer, Integer> pos;

            public TreeNode buildTree(int[] inorder, int[] postorder) {
                pos = new HashMap<>();
                for (int i = 0; i < inorder.length; i++) pos.put(inorder[i], i);
                postIdx = postorder.length - 1;
                return build(postorder, 0, inorder.length - 1);
            }
            private TreeNode build(int[] post, int lo, int hi) {
                if (lo > hi) return null;
                TreeNode root = new TreeNode(post[postIdx--]);   // last unused postorder value
                int m = pos.get(root.val);
                root.right = build(post, m + 1, hi);              // right first!
                root.left = build(post, lo, m - 1);
                return root;
            }
        }`,
      alt: [{ lang: 'python', code: `import sys

class Solution:
    def build_tree(self, inorder, postorder):
        sys.setrecursionlimit(max(1000, 2 * len(inorder) + 100))   # a skewed tree recurses n deep
        pos = {v: i for i, v in enumerate(inorder)}
        post = list(postorder)               # pop() from the end: roots in Me, Right, Left order

        def build(lo, hi):
            if lo > hi:
                return None
            node = TreeNode(post.pop())
            m = pos[node.val]
            node.right = build(m + 1, hi)    # right first!
            node.left = build(lo, m - 1)
            return node

        return build(0, len(inorder) - 1)
` }, { lang: 'js', code: `function buildTree(inorder, postorder) {
  const pos = new Map(inorder.map((v, i) => [v, i]));
  let post = postorder.length - 1;               // last unused postorder value
  const build = (lo, hi) => {
    if (lo > hi) return null;
    const node = new TreeNode(postorder[post--]);
    const m = pos.get(node.val);
    node.right = build(m + 1, hi);               // right first!
    node.left = build(lo, m - 1);
    return node;
  };
  return build(0, inorder.length - 1);
}
` }, { lang: 'cpp', code: `// LeetCode-style node (the judge normally provides it)
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(x), left(l), right(r) {}
};

class Solution {
public:
    TreeNode* buildTree(vector<int>& inorder, vector<int>& postorder) {
        unordered_map<int, int> pos;
        for (int i = 0; i < (int)inorder.size(); i++) pos[inorder[i]] = i;
        int post = (int)postorder.size() - 1;      // last unused postorder value
        auto build = [&](auto&& self, int lo, int hi) -> TreeNode* {
            if (lo > hi) return nullptr;
            TreeNode* node = new TreeNode(postorder[post--]);
            int m = pos[node->val];
            node->right = self(self, m + 1, hi);   // right first!
            node->left = self(self, lo, m - 1);
            return node;
        };
        return build(build, 0, (int)inorder.size() - 1);
    }
};
` }],
      dry: { head: ['build(lo, hi)', 'root (postIdx)', 'm', 'then'], rows: [['(0, 4)', '3 (4)', '1', 'right (2, 4)'], ['(2, 4)', '20 (3)', '3', 'right (4, 4)'], ['(4, 4)', '7 (2)', '4', 'leaf'], ['(2, 2)', '15 (1)', '2', 'leaf'], ['(0, 0)', '9 (0)', '0', H.c('g', 'leaf → done')]] },
      complexity: `<p><b>Time O(n)</b>, <b>space O(n)</b> for the map + O(h) recursion.</p>`,
      followUps: ['Construct from preorder + postorder of a FULL binary tree', 'Why is the pair (preorder, postorder) not enough in general?']
    }
  });

  practice.push({
    title: 'All Nodes Distance K in Binary Tree',
    level: 'Medium',
    tags: ['bfs', 'graph', 'parent map'],
    companies: ['Amazon', 'Meta', 'Google'],
    statement: `<p>Given the <code>root</code>, a <code>target</code> node and an integer <code>k</code>, return the values of all nodes exactly <code>k</code> edges away from the target (in any order). Paths may go <b>up</b> through parents.</p>`,
    constraints: `1 ≤ nodes ≤ 500, values unique, 0 ≤ k ≤ 1000`,
    example: `<p><code>root = [3,5,1,6,2,0,8,null,null,7,4]</code>, target = ${H.c('b', '5')}, k = 2 → ${H.c('g', '[7, 4, 1]')}. 7 and 4 are two steps <b>down</b> (5 → 2 → 7/4); 1 is reached by going <b>up</b> to 3 and down to 1.</p>`,
    brute: {
      why: `<p>For every node, compute its distance to the target separately (e.g. via LCA: depth(x) + depth(t) − 2·depth(lca)) and keep those at distance k. Each distance costs O(N) → O(N<sup>2</sup>) overall, redoing the same walks again and again.</p>`,
      code: `
        List<Integer> distanceKBrute(TreeNode root, TreeNode target, int k) {
            List<TreeNode> all = new ArrayList<>();
            gather(root, all);
            List<Integer> res = new ArrayList<>();
            for (TreeNode x : all) {
                TreeNode l = lca(root, x, target);
                if (depth(l, x) + depth(l, target) == k) res.add(x.val);   // O(N) per node
            }
            return res;
        }
        void gather(TreeNode n, List<TreeNode> out) { if (n == null) return; out.add(n); gather(n.left, out); gather(n.right, out); }
        TreeNode lca(TreeNode n, TreeNode p, TreeNode q) {
            if (n == null || n == p || n == q) return n;
            TreeNode a = lca(n.left, p, q), b = lca(n.right, p, q);
            return a != null && b != null ? n : (a != null ? a : b);
        }
        int depth(TreeNode from, TreeNode to) {               // edges from 'from' down to 'to', -1 if absent
            if (from == null) return -1;
            if (from == to) return 0;
            int d = depth(from.left, to);
            if (d < 0) d = depth(from.right, to);
            return d < 0 ? -1 : d + 1;
        }`
    },
    mcq: { q: 'What turns this tree problem into a simple BFS?', options: ['Sorting the values', 'Recording each node\'s parent so you can move up as well as down — the tree becomes an undirected graph', 'Using a TreeMap', 'Inorder traversal'], answer: 1, explain: 'With parent links every node has up to 3 neighbours (left, right, parent). A BFS from the target for k rounds (with a visited set) finds exactly the nodes at distance k.' },
    hints: [
      `<p><b>Aha:</b> distance in a tree is just distance in an undirected graph. The only missing edges are the "up" ones — so store each node's parent.</p>`,
      `<p>One DFS fills <code>Map&lt;TreeNode, TreeNode&gt; parent</code>. Then BFS from the target with a <code>visited</code> set, expanding left, right and parent; stop after k levels.</p>`,
      `<p><b>Traps:</b> without <code>visited</code> you bounce between a child and its parent forever; k = 0 → [target]. <b>Recipe:</b> map parents; queue = [target]; repeat k times: expand one whole level; the queue is the answer.</p>`
    ],
    tests: { sig: 'TreeNode int int -> list<int>', fn: 'judge', cmp: 'set', harness: {
      java: "class Check {\n    static TreeNode find(TreeNode root, int v) {\n        Deque<TreeNode> st = new ArrayDeque<>();\n        st.push(root);\n        while (!st.isEmpty()) {\n            TreeNode t = st.pop();\n            if (t.val == v) return t;\n            if (t.left != null) st.push(t.left);\n            if (t.right != null) st.push(t.right);\n        }\n        return null;\n    }\n\n    static List<Integer> judge(TreeNode root, int target, int k) {\n        // the judge passes the real target node of this tree, so find it first\n        return new Solution().distanceK(root, find(root, target), k);\n    }\n}",
      python: "def _find(root, v):\n    st = [root]\n    while st:\n        t = st.pop()\n        if t.val == v:\n            return t\n        st.extend(c for c in (t.left, t.right) if c)\n\ndef judge(root, target, k):\n    return Solution().distance_k(root, _find(root, target), k)",
      js: "function find__(root, v) {\n  const st = [root];\n  while (st.length) {\n    const t = st.pop();\n    if (t.val === v) return t;\n    if (t.left) st.push(t.left);\n    if (t.right) st.push(t.right);\n  }\n  return null;\n}\n\nfunction judge(root, target, k) {\n  return distanceK(root, find__(root, target), k);\n}",
      cpp: "TreeNode* find__(TreeNode* root, int v) {\n    vector<TreeNode*> st{root};\n    while (!st.empty()) {\n        TreeNode* t = st.back(); st.pop_back();\n        if (t->val == v) return t;\n        if (t->left) st.push_back(t->left);\n        if (t->right) st.push_back(t->right);\n    }\n    return nullptr;\n}\n\nvector<int> judge(TreeNode* root, int target, int k) {\n    return Solution().distanceK(root, find__(root, target), k);\n}"
    }, cases: [
      [[[3,5,1,6,2,0,8,null,null,7,4],5,2],[1,4,7]],
      [[[3,5,1,6,2,0,8,null,null,7,4],5,0],[5]],
      [[[3,5,1,6,2,0,8,null,null,7,4],7,3],[3,6]],
      [[[3,5,1,6,2,0,8,null,null,7,4],3,1],[1,5]],
      [[[3,5,1,6,2,0,8,null,null,7,4],6,4],[0,8]],
      [[[3,5,1,6,2,0,8,null,null,7,4],3,1000],[]],
      [[[1],1,3],[]],
      [[[1],1,0],[1]],
      [[[0,1,null,3,2],2,1],[1]],
      [[[491,390,185,212,451,249,277,null,null,318,null,99,114,446,22,32,null,425,293,null,null,378,272,null,null,null,323,null,419,null,51],185,3],[212,272,293,378,425,451]]
    ] },
    solution: {
      approach: `<p>Parent map + level-limited BFS from the target.</p>`,
      code: `
        class Solution {
            public List<Integer> distanceK(TreeNode root, TreeNode target, int k) {
                Map<TreeNode, TreeNode> parent = new HashMap<>();
                linkParents(root, null, parent);
                Queue<TreeNode> q = new ArrayDeque<>();
                Set<TreeNode> seen = new HashSet<>();
                q.offer(target); seen.add(target);
                for (int d = 0; d < k && !q.isEmpty(); d++) {          // expand k whole levels
                    int size = q.size();
                    for (int i = 0; i < size; i++) {
                        TreeNode n = q.poll();
                        for (TreeNode nb : new TreeNode[]{n.left, n.right, parent.get(n)}) {
                            if (nb != null && seen.add(nb)) q.offer(nb);   // neighbours: down, down, up
                        }
                    }
                }
                List<Integer> res = new ArrayList<>();
                for (TreeNode n : q) res.add(n.val);                     // exactly distance k
                return res;
            }
            private void linkParents(TreeNode n, TreeNode p, Map<TreeNode, TreeNode> parent) {
                if (n == null) return;
                parent.put(n, p);
                linkParents(n.left, n, parent);
                linkParents(n.right, n, parent);
            }
        }`,
      alt: [{ lang: 'python', code: `from collections import defaultdict, deque

class Solution:
    def distance_k(self, root, target, k):
        graph = defaultdict(list)
        stack = [(root, None)]
        while stack:                         # turn the tree into an undirected graph
            n, parent = stack.pop()
            if parent:
                graph[n].append(parent)
                graph[parent].append(n)
            stack.extend((c, n) for c in (n.left, n.right) if c)
        seen, level = {target}, [target]
        for _ in range(k):                   # expand k whole rings
            nxt = []
            for n in level:
                for nb in graph[n]:
                    if nb not in seen:
                        seen.add(nb)
                        nxt.append(nb)
            level = nxt
        return [n.val for n in level]
` }, { lang: 'js', code: `function distanceK(root, target, k) {
  const parent = new Map();                      // node -> parent (object keys work in a Map)
  const stack = [root];
  parent.set(root, null);
  while (stack.length) {
    const n = stack.pop();
    for (const c of [n.left, n.right]) if (c) { parent.set(c, n); stack.push(c); }
  }
  const seen = new Set([target]);
  let level = [target];
  for (let d = 0; d < k && level.length; d++) {  // expand k whole rings
    const next = [];
    for (const n of level) {
      for (const nb of [n.left, n.right, parent.get(n)]) {
        if (nb && !seen.has(nb)) { seen.add(nb); next.push(nb); }
      }
    }
    level = next;
  }
  return level.map((n) => n.val);
}
` }, { lang: 'cpp', code: `// LeetCode-style node (the judge normally provides it)
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(x), left(l), right(r) {}
};

class Solution {
public:
    vector<int> distanceK(TreeNode* root, TreeNode* target, int k) {
        unordered_map<TreeNode*, TreeNode*> parent;
        vector<TreeNode*> st{root};
        parent[root] = nullptr;
        while (!st.empty()) {                      // link every node to its parent
            TreeNode* n = st.back(); st.pop_back();
            for (TreeNode* c : {n->left, n->right})
                if (c) { parent[c] = n; st.push_back(c); }
        }
        unordered_set<TreeNode*> seen{target};
        vector<TreeNode*> level{target};
        for (int d = 0; d < k && !level.empty(); d++) {   // expand k whole rings
            vector<TreeNode*> next;
            for (TreeNode* n : level)
                for (TreeNode* nb : {n->left, n->right, parent[n]})
                    if (nb && seen.insert(nb).second) next.push_back(nb);
            level = move(next);
        }
        vector<int> res;
        for (TreeNode* n : level) res.push_back(n->val);
        return res;
    }
};
` }],
      dry: { head: ['round', 'queue after round', 'distance'], rows: [['start', '[5]', '0'], ['1', '[6, 2, 3]', '1'], ['2', H.c('g', '[7, 4, 1]'), '2 → answer']] },
      complexity: `<p><b>Time O(N)</b>, <b>space O(N)</b> for the parent map, visited set and queue.</p>`,
      followUps: ['Solve without a parent map (DFS returning distance to target)', 'Amount of time for a fire/infection to spread from a node to the whole tree']
    }
  });

  practice.push({
    title: 'Recover Binary Search Tree',
    level: 'Medium',
    tags: ['bst', 'inorder'],
    companies: ['Amazon', 'Microsoft', 'Bloomberg'],
    statement: `<p>Exactly two nodes of a BST had their values <b>swapped</b> by mistake. Recover the tree without changing its structure.</p>`,
    constraints: `2 ≤ nodes ≤ 1000, −2<sup>31</sup> ≤ Node.val ≤ 2<sup>31</sup> − 1. Follow-up: O(1) extra space (Morris).`,
    example: `<p><code>root = [1,3,null,null,2]</code> → ${H.c('g', '[3,1,null,null,2]')}. Inorder is ${H.c('r', '3 2 1')} instead of 1 2 3: the drops are 3 → 2 and 2 → 1, so the swapped values are ${H.c('r', '3')} (first drop's bigger) and ${H.c('r', '1')} (last drop's smaller). Swap them back.</p>`,
    brute: {
      why: `<p>Copy the inorder values into a list, sort it, then walk the tree in inorder again and overwrite each node with the sorted values. O(N log N) time and O(N) memory, and it rewrites every node even though only two are wrong.</p>`,
      code: `
        void recoverBrute(TreeNode root) {
            List<Integer> vals = new ArrayList<>();
            collect(root, vals);
            Collections.sort(vals);
            int[] i = {0};
            rewrite(root, vals, i);
        }
        void collect(TreeNode n, List<Integer> out) { if (n == null) return; collect(n.left, out); out.add(n.val); collect(n.right, out); }
        void rewrite(TreeNode n, List<Integer> vals, int[] i) {
            if (n == null) return;
            rewrite(n.left, vals, i);
            n.val = vals.get(i[0]++);                         // overwrite in sorted order
            rewrite(n.right, vals, i);
        }`
    },
    mcq: { q: 'Inorder is 1 4 3 2 5 (two values swapped). Which two nodes are wrong?', options: ['4 and 3', '3 and 2', '4 and 2', '1 and 5'], answer: 2, explain: 'Drops at 4→3 and 3→2. First wrong = bigger of the first drop (4); second wrong = smaller of the last drop (2). Swapping 4 and 2 gives 1 2 3 4 5.' },
    hints: [
      `<p><b>Aha:</b> in a correct BST inorder is increasing. Swapping two values creates one or two "drops" where <code>prev &gt; cur</code>.</p>`,
      `<p>Inorder walk with a <code>prev</code> pointer. At the first drop record <code>first = prev</code>; at every drop record <code>second = cur</code>. Swap their values at the end.</p>`,
      `<p><b>Traps:</b> adjacent swapped nodes produce only ONE drop — the rule above still works because second is set at that drop. Compare nodes, not just values. <b>Recipe:</b> inorder; if prev != null &amp;&amp; prev.val &gt; cur.val: if first == null first = prev; second = cur; then swap values.</p>`
    ],
    tests: { sig: 'TreeNode -> void', fn: 'recoverTree', mutate: 0, cases: [
      [[[1,3,null,null,2]],[3,1,null,null,2]],
      [[[3,1,4,null,null,2]],[2,1,4,null,null,3]],
      [[[2,null,1]],[1,null,2]],
      [[[1,2]],[2,1]],
      [[[5,3,8,9,4,7,1]],[5,3,8,1,4,7,9]],
      [[[4,3,8,1,5,7,9]],[5,3,8,1,4,7,9]],
      [[[0,2147483647,-2147483647]],[0,-2147483647,2147483647]],
      [[[-8472,-9713,-5844,null,null,-6260,4609,-6429,-6023,3909,5600,null,null,null,null,-3990,4124,4834,8865,-4130,2297,4039,4404,null,null,8529,9306,null,-4122,564,3227,null,null,null,null,6154,8843,null,null,null,null,18,null,null,3464,6082,null,null,null,-418,20,null,null,null,null,null,null,null,855]],[-8472,-9713,-5844,null,null,-6260,4609,-6429,-6023,3909,5600,null,null,null,null,-3990,4124,4834,8865,-4130,2297,4039,4404,null,null,8529,9306,null,-4122,855,3227,null,null,null,null,6154,8843,null,null,null,null,18,null,null,3464,6082,null,null,null,-418,20,null,null,null,null,null,null,null,564]],
      [[[999,null,1,null,2,null,3,null,4,null,5,null,6,null,7,null,8,null,9,null,10,null,11,null,12,null,13,null,14,null,15,null,16,null,17,null,18,null,19,null,20,null,21,null,22,null,23,null,24,null,25,null,26,null,27,null,28,null,29,null,30,null,31,null,32,null,33,null,34,null,35,null,36,null,37,null,38,null,39,null,40,null,41,null,42,null,43,null,44,null,45,null,46,null,47,null,48,null,49,null,50,null,51,null,52,null,53,null,54,null,55,null,56,null,57,null,58,null,59,null,60,null,61,null,62,null,63,null,64,null,65,null,66,null,67,null,68,null,69,null,70,null,71,null,72,null,73,null,74,null,75,null,76,null,77,null,78,null,79,null,80,null,81,null,82,null,83,null,84,null,85,null,86,null,87,null,88,null,89,null,90,null,91,null,92,null,93,null,94,null,95,null,96,null,97,null,98,null,99,null,100,null,101,null,102,null,103,null,104,null,105,null,106,null,107,null,108,null,109,null,110,null,111,null,112,null,113,null,114,null,115,null,116,null,117,null,118,null,119,null,120,null,121,null,122,null,123,null,124,null,125,null,126,null,127,null,128,null,129,null,130,null,131,null,132,null,133,null,134,null,135,null,136,null,137,null,138,null,139,null,140,null,141,null,142,null,143,null,144,null,145,null,146,null,147,null,148,null,149,null,150,null,151,null,152,null,153,null,154,null,155,null,156,null,157,null,158,null,159,null,160,null,161,null,162,null,163,null,164,null,165,null,166,null,167,null,168,null,169,null,170,null,171,null,172,null,173,null,174,null,175,null,176,null,177,null,178,null,179,null,180,null,181,null,182,null,183,null,184,null,185,null,186,null,187,null,188,null,189,null,190,null,191,null,192,null,193,null,194,null,195,null,196,null,197,null,198,null,199,null,200,null,201,null,202,null,203,null,204,null,205,null,206,null,207,null,208,null,209,null,210,null,211,null,212,null,213,null,214,null,215,null,216,null,217,null,218,null,219,null,220,null,221,null,222,null,223,null,224,null,225,null,226,null,227,null,228,null,229,null,230,null,231,null,232,null,233,null,234,null,235,null,236,null,237,null,238,null,239,null,240,null,241,null,242,null,243,null,244,null,245,null,246,null,247,null,248,null,249,null,250,null,251,null,252,null,253,null,254,null,255,null,256,null,257,null,258,null,259,null,260,null,261,null,262,null,263,null,264,null,265,null,266,null,267,null,268,null,269,null,270,null,271,null,272,null,273,null,274,null,275,null,276,null,277,null,278,null,279,null,280,null,281,null,282,null,283,null,284,null,285,null,286,null,287,null,288,null,289,null,290,null,291,null,292,null,293,null,294,null,295,null,296,null,297,null,298,null,299,null,300,null,301,null,302,null,303,null,304,null,305,null,306,null,307,null,308,null,309,null,310,null,311,null,312,null,313,null,314,null,315,null,316,null,317,null,318,null,319,null,320,null,321,null,322,null,323,null,324,null,325,null,326,null,327,null,328,null,329,null,330,null,331,null,332,null,333,null,334,null,335,null,336,null,337,null,338,null,339,null,340,null,341,null,342,null,343,null,344,null,345,null,346,null,347,null,348,null,349,null,350,null,351,null,352,null,353,null,354,null,355,null,356,null,357,null,358,null,359,null,360,null,361,null,362,null,363,null,364,null,365,null,366,null,367,null,368,null,369,null,370,null,371,null,372,null,373,null,374,null,375,null,376,null,377,null,378,null,379,null,380,null,381,null,382,null,383,null,384,null,385,null,386,null,387,null,388,null,389,null,390,null,391,null,392,null,393,null,394,null,395,null,396,null,397,null,398,null,399,null,400,null,401,null,402,null,403,null,404,null,405,null,406,null,407,null,408,null,409,null,410,null,411,null,412,null,413,null,414,null,415,null,416,null,417,null,418,null,419,null,420,null,421,null,422,null,423,null,424,null,425,null,426,null,427,null,428,null,429,null,430,null,431,null,432,null,433,null,434,null,435,null,436,null,437,null,438,null,439,null,440,null,441,null,442,null,443,null,444,null,445,null,446,null,447,null,448,null,449,null,450,null,451,null,452,null,453,null,454,null,455,null,456,null,457,null,458,null,459,null,460,null,461,null,462,null,463,null,464,null,465,null,466,null,467,null,468,null,469,null,470,null,471,null,472,null,473,null,474,null,475,null,476,null,477,null,478,null,479,null,480,null,481,null,482,null,483,null,484,null,485,null,486,null,487,null,488,null,489,null,490,null,491,null,492,null,493,null,494,null,495,null,496,null,497,null,498,null,499,null,500,null,501,null,502,null,503,null,504,null,505,null,506,null,507,null,508,null,509,null,510,null,511,null,512,null,513,null,514,null,515,null,516,null,517,null,518,null,519,null,520,null,521,null,522,null,523,null,524,null,525,null,526,null,527,null,528,null,529,null,530,null,531,null,532,null,533,null,534,null,535,null,536,null,537,null,538,null,539,null,540,null,541,null,542,null,543,null,544,null,545,null,546,null,547,null,548,null,549,null,550,null,551,null,552,null,553,null,554,null,555,null,556,null,557,null,558,null,559,null,560,null,561,null,562,null,563,null,564,null,565,null,566,null,567,null,568,null,569,null,570,null,571,null,572,null,573,null,574,null,575,null,576,null,577,null,578,null,579,null,580,null,581,null,582,null,583,null,584,null,585,null,586,null,587,null,588,null,589,null,590,null,591,null,592,null,593,null,594,null,595,null,596,null,597,null,598,null,599,null,600,null,601,null,602,null,603,null,604,null,605,null,606,null,607,null,608,null,609,null,610,null,611,null,612,null,613,null,614,null,615,null,616,null,617,null,618,null,619,null,620,null,621,null,622,null,623,null,624,null,625,null,626,null,627,null,628,null,629,null,630,null,631,null,632,null,633,null,634,null,635,null,636,null,637,null,638,null,639,null,640,null,641,null,642,null,643,null,644,null,645,null,646,null,647,null,648,null,649,null,650,null,651,null,652,null,653,null,654,null,655,null,656,null,657,null,658,null,659,null,660,null,661,null,662,null,663,null,664,null,665,null,666,null,667,null,668,null,669,null,670,null,671,null,672,null,673,null,674,null,675,null,676,null,677,null,678,null,679,null,680,null,681,null,682,null,683,null,684,null,685,null,686,null,687,null,688,null,689,null,690,null,691,null,692,null,693,null,694,null,695,null,696,null,697,null,698,null,699,null,700,null,701,null,702,null,703,null,704,null,705,null,706,null,707,null,708,null,709,null,710,null,711,null,712,null,713,null,714,null,715,null,716,null,717,null,718,null,719,null,720,null,721,null,722,null,723,null,724,null,725,null,726,null,727,null,728,null,729,null,730,null,731,null,732,null,733,null,734,null,735,null,736,null,737,null,738,null,739,null,740,null,741,null,742,null,743,null,744,null,745,null,746,null,747,null,748,null,749,null,750,null,751,null,752,null,753,null,754,null,755,null,756,null,757,null,758,null,759,null,760,null,761,null,762,null,763,null,764,null,765,null,766,null,767,null,768,null,769,null,770,null,771,null,772,null,773,null,774,null,775,null,776,null,777,null,778,null,779,null,780,null,781,null,782,null,783,null,784,null,785,null,786,null,787,null,788,null,789,null,790,null,791,null,792,null,793,null,794,null,795,null,796,null,797,null,798,null,799,null,800,null,801,null,802,null,803,null,804,null,805,null,806,null,807,null,808,null,809,null,810,null,811,null,812,null,813,null,814,null,815,null,816,null,817,null,818,null,819,null,820,null,821,null,822,null,823,null,824,null,825,null,826,null,827,null,828,null,829,null,830,null,831,null,832,null,833,null,834,null,835,null,836,null,837,null,838,null,839,null,840,null,841,null,842,null,843,null,844,null,845,null,846,null,847,null,848,null,849,null,850,null,851,null,852,null,853,null,854,null,855,null,856,null,857,null,858,null,859,null,860,null,861,null,862,null,863,null,864,null,865,null,866,null,867,null,868,null,869,null,870,null,871,null,872,null,873,null,874,null,875,null,876,null,877,null,878,null,879,null,880,null,881,null,882,null,883,null,884,null,885,null,886,null,887,null,888,null,889,null,890,null,891,null,892,null,893,null,894,null,895,null,896,null,897,null,898,null,899,null,900,null,901,null,902,null,903,null,904,null,905,null,906,null,907,null,908,null,909,null,910,null,911,null,912,null,913,null,914,null,915,null,916,null,917,null,918,null,919,null,920,null,921,null,922,null,923,null,924,null,925,null,926,null,927,null,928,null,929,null,930,null,931,null,932,null,933,null,934,null,935,null,936,null,937,null,938,null,939,null,940,null,941,null,942,null,943,null,944,null,945,null,946,null,947,null,948,null,949,null,950,null,951,null,952,null,953,null,954,null,955,null,956,null,957,null,958,null,959,null,960,null,961,null,962,null,963,null,964,null,965,null,966,null,967,null,968,null,969,null,970,null,971,null,972,null,973,null,974,null,975,null,976,null,977,null,978,null,979,null,980,null,981,null,982,null,983,null,984,null,985,null,986,null,987,null,988,null,989,null,990,null,991,null,992,null,993,null,994,null,995,null,996,null,997,null,998,null,0]],[0,null,1,null,2,null,3,null,4,null,5,null,6,null,7,null,8,null,9,null,10,null,11,null,12,null,13,null,14,null,15,null,16,null,17,null,18,null,19,null,20,null,21,null,22,null,23,null,24,null,25,null,26,null,27,null,28,null,29,null,30,null,31,null,32,null,33,null,34,null,35,null,36,null,37,null,38,null,39,null,40,null,41,null,42,null,43,null,44,null,45,null,46,null,47,null,48,null,49,null,50,null,51,null,52,null,53,null,54,null,55,null,56,null,57,null,58,null,59,null,60,null,61,null,62,null,63,null,64,null,65,null,66,null,67,null,68,null,69,null,70,null,71,null,72,null,73,null,74,null,75,null,76,null,77,null,78,null,79,null,80,null,81,null,82,null,83,null,84,null,85,null,86,null,87,null,88,null,89,null,90,null,91,null,92,null,93,null,94,null,95,null,96,null,97,null,98,null,99,null,100,null,101,null,102,null,103,null,104,null,105,null,106,null,107,null,108,null,109,null,110,null,111,null,112,null,113,null,114,null,115,null,116,null,117,null,118,null,119,null,120,null,121,null,122,null,123,null,124,null,125,null,126,null,127,null,128,null,129,null,130,null,131,null,132,null,133,null,134,null,135,null,136,null,137,null,138,null,139,null,140,null,141,null,142,null,143,null,144,null,145,null,146,null,147,null,148,null,149,null,150,null,151,null,152,null,153,null,154,null,155,null,156,null,157,null,158,null,159,null,160,null,161,null,162,null,163,null,164,null,165,null,166,null,167,null,168,null,169,null,170,null,171,null,172,null,173,null,174,null,175,null,176,null,177,null,178,null,179,null,180,null,181,null,182,null,183,null,184,null,185,null,186,null,187,null,188,null,189,null,190,null,191,null,192,null,193,null,194,null,195,null,196,null,197,null,198,null,199,null,200,null,201,null,202,null,203,null,204,null,205,null,206,null,207,null,208,null,209,null,210,null,211,null,212,null,213,null,214,null,215,null,216,null,217,null,218,null,219,null,220,null,221,null,222,null,223,null,224,null,225,null,226,null,227,null,228,null,229,null,230,null,231,null,232,null,233,null,234,null,235,null,236,null,237,null,238,null,239,null,240,null,241,null,242,null,243,null,244,null,245,null,246,null,247,null,248,null,249,null,250,null,251,null,252,null,253,null,254,null,255,null,256,null,257,null,258,null,259,null,260,null,261,null,262,null,263,null,264,null,265,null,266,null,267,null,268,null,269,null,270,null,271,null,272,null,273,null,274,null,275,null,276,null,277,null,278,null,279,null,280,null,281,null,282,null,283,null,284,null,285,null,286,null,287,null,288,null,289,null,290,null,291,null,292,null,293,null,294,null,295,null,296,null,297,null,298,null,299,null,300,null,301,null,302,null,303,null,304,null,305,null,306,null,307,null,308,null,309,null,310,null,311,null,312,null,313,null,314,null,315,null,316,null,317,null,318,null,319,null,320,null,321,null,322,null,323,null,324,null,325,null,326,null,327,null,328,null,329,null,330,null,331,null,332,null,333,null,334,null,335,null,336,null,337,null,338,null,339,null,340,null,341,null,342,null,343,null,344,null,345,null,346,null,347,null,348,null,349,null,350,null,351,null,352,null,353,null,354,null,355,null,356,null,357,null,358,null,359,null,360,null,361,null,362,null,363,null,364,null,365,null,366,null,367,null,368,null,369,null,370,null,371,null,372,null,373,null,374,null,375,null,376,null,377,null,378,null,379,null,380,null,381,null,382,null,383,null,384,null,385,null,386,null,387,null,388,null,389,null,390,null,391,null,392,null,393,null,394,null,395,null,396,null,397,null,398,null,399,null,400,null,401,null,402,null,403,null,404,null,405,null,406,null,407,null,408,null,409,null,410,null,411,null,412,null,413,null,414,null,415,null,416,null,417,null,418,null,419,null,420,null,421,null,422,null,423,null,424,null,425,null,426,null,427,null,428,null,429,null,430,null,431,null,432,null,433,null,434,null,435,null,436,null,437,null,438,null,439,null,440,null,441,null,442,null,443,null,444,null,445,null,446,null,447,null,448,null,449,null,450,null,451,null,452,null,453,null,454,null,455,null,456,null,457,null,458,null,459,null,460,null,461,null,462,null,463,null,464,null,465,null,466,null,467,null,468,null,469,null,470,null,471,null,472,null,473,null,474,null,475,null,476,null,477,null,478,null,479,null,480,null,481,null,482,null,483,null,484,null,485,null,486,null,487,null,488,null,489,null,490,null,491,null,492,null,493,null,494,null,495,null,496,null,497,null,498,null,499,null,500,null,501,null,502,null,503,null,504,null,505,null,506,null,507,null,508,null,509,null,510,null,511,null,512,null,513,null,514,null,515,null,516,null,517,null,518,null,519,null,520,null,521,null,522,null,523,null,524,null,525,null,526,null,527,null,528,null,529,null,530,null,531,null,532,null,533,null,534,null,535,null,536,null,537,null,538,null,539,null,540,null,541,null,542,null,543,null,544,null,545,null,546,null,547,null,548,null,549,null,550,null,551,null,552,null,553,null,554,null,555,null,556,null,557,null,558,null,559,null,560,null,561,null,562,null,563,null,564,null,565,null,566,null,567,null,568,null,569,null,570,null,571,null,572,null,573,null,574,null,575,null,576,null,577,null,578,null,579,null,580,null,581,null,582,null,583,null,584,null,585,null,586,null,587,null,588,null,589,null,590,null,591,null,592,null,593,null,594,null,595,null,596,null,597,null,598,null,599,null,600,null,601,null,602,null,603,null,604,null,605,null,606,null,607,null,608,null,609,null,610,null,611,null,612,null,613,null,614,null,615,null,616,null,617,null,618,null,619,null,620,null,621,null,622,null,623,null,624,null,625,null,626,null,627,null,628,null,629,null,630,null,631,null,632,null,633,null,634,null,635,null,636,null,637,null,638,null,639,null,640,null,641,null,642,null,643,null,644,null,645,null,646,null,647,null,648,null,649,null,650,null,651,null,652,null,653,null,654,null,655,null,656,null,657,null,658,null,659,null,660,null,661,null,662,null,663,null,664,null,665,null,666,null,667,null,668,null,669,null,670,null,671,null,672,null,673,null,674,null,675,null,676,null,677,null,678,null,679,null,680,null,681,null,682,null,683,null,684,null,685,null,686,null,687,null,688,null,689,null,690,null,691,null,692,null,693,null,694,null,695,null,696,null,697,null,698,null,699,null,700,null,701,null,702,null,703,null,704,null,705,null,706,null,707,null,708,null,709,null,710,null,711,null,712,null,713,null,714,null,715,null,716,null,717,null,718,null,719,null,720,null,721,null,722,null,723,null,724,null,725,null,726,null,727,null,728,null,729,null,730,null,731,null,732,null,733,null,734,null,735,null,736,null,737,null,738,null,739,null,740,null,741,null,742,null,743,null,744,null,745,null,746,null,747,null,748,null,749,null,750,null,751,null,752,null,753,null,754,null,755,null,756,null,757,null,758,null,759,null,760,null,761,null,762,null,763,null,764,null,765,null,766,null,767,null,768,null,769,null,770,null,771,null,772,null,773,null,774,null,775,null,776,null,777,null,778,null,779,null,780,null,781,null,782,null,783,null,784,null,785,null,786,null,787,null,788,null,789,null,790,null,791,null,792,null,793,null,794,null,795,null,796,null,797,null,798,null,799,null,800,null,801,null,802,null,803,null,804,null,805,null,806,null,807,null,808,null,809,null,810,null,811,null,812,null,813,null,814,null,815,null,816,null,817,null,818,null,819,null,820,null,821,null,822,null,823,null,824,null,825,null,826,null,827,null,828,null,829,null,830,null,831,null,832,null,833,null,834,null,835,null,836,null,837,null,838,null,839,null,840,null,841,null,842,null,843,null,844,null,845,null,846,null,847,null,848,null,849,null,850,null,851,null,852,null,853,null,854,null,855,null,856,null,857,null,858,null,859,null,860,null,861,null,862,null,863,null,864,null,865,null,866,null,867,null,868,null,869,null,870,null,871,null,872,null,873,null,874,null,875,null,876,null,877,null,878,null,879,null,880,null,881,null,882,null,883,null,884,null,885,null,886,null,887,null,888,null,889,null,890,null,891,null,892,null,893,null,894,null,895,null,896,null,897,null,898,null,899,null,900,null,901,null,902,null,903,null,904,null,905,null,906,null,907,null,908,null,909,null,910,null,911,null,912,null,913,null,914,null,915,null,916,null,917,null,918,null,919,null,920,null,921,null,922,null,923,null,924,null,925,null,926,null,927,null,928,null,929,null,930,null,931,null,932,null,933,null,934,null,935,null,936,null,937,null,938,null,939,null,940,null,941,null,942,null,943,null,944,null,945,null,946,null,947,null,948,null,949,null,950,null,951,null,952,null,953,null,954,null,955,null,956,null,957,null,958,null,959,null,960,null,961,null,962,null,963,null,964,null,965,null,966,null,967,null,968,null,969,null,970,null,971,null,972,null,973,null,974,null,975,null,976,null,977,null,978,null,979,null,980,null,981,null,982,null,983,null,984,null,985,null,986,null,987,null,988,null,989,null,990,null,991,null,992,null,993,null,994,null,995,null,996,null,997,null,998,null,999]]
    ] },
    solution: {
      approach: `<p>Find the inversion(s) in the inorder sequence and swap the two offending nodes' values.</p>`,
      code: `
        class Solution {
            private TreeNode first, second, prev;

            public void recoverTree(TreeNode root) {
                first = second = prev = null;
                inorder(root);
                int t = first.val; first.val = second.val; second.val = t;   // swap back
            }
            private void inorder(TreeNode n) {
                if (n == null) return;
                inorder(n.left);
                if (prev != null && prev.val > n.val) {     // a drop in the sorted order
                    if (first == null) first = prev;        // first drop: the bigger one is wrong
                    second = n;                             // last drop: the smaller one is wrong
                }
                prev = n;
                inorder(n.right);
            }
        }`,
      alt: [{ lang: 'python', code: `class Solution:
    def recover_tree(self, root):
        first = second = prev = None
        stack, cur = [], root
        while stack or cur:                  # iterative inorder
            while cur:
                stack.append(cur)
                cur = cur.left
            cur = stack.pop()
            if prev and prev.val > cur.val:  # a drop in sorted order
                if first is None:
                    first = prev             # first drop: the bigger one
                second = cur                 # last drop: the smaller one
            prev = cur
            cur = cur.right
        first.val, second.val = second.val, first.val
` }, { lang: 'js', code: `function recoverTree(root) {
  let first = null, second = null, prev = null;
  const stack = [];
  let cur = root;
  while (cur || stack.length) {                  // iterative inorder
    while (cur) { stack.push(cur); cur = cur.left; }
    cur = stack.pop();
    if (prev && prev.val > cur.val) {            // a drop in sorted order
      if (!first) first = prev;                  // first drop: the bigger one
      second = cur;                              // last drop: the smaller one
    }
    prev = cur;
    cur = cur.right;
  }
  [first.val, second.val] = [second.val, first.val];
}
` }, { lang: 'cpp', code: `// LeetCode-style node (the judge normally provides it)
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(x), left(l), right(r) {}
};

class Solution {
    TreeNode *first = nullptr, *second = nullptr, *prev = nullptr;

    void inorder(TreeNode* n) {
        if (!n) return;
        inorder(n->left);
        if (prev && prev->val > n->val) {    // a drop in the sorted order
            if (!first) first = prev;        // first drop: the bigger one is wrong
            second = n;                      // last drop: the smaller one is wrong
        }
        prev = n;
        inorder(n->right);
    }

public:
    void recoverTree(TreeNode* root) {
        inorder(root);
        swap(first->val, second->val);       // swap back
    }
};
` }],
      dry: { head: ['inorder pair (prev, cur)', 'drop?', 'first', 'second'], rows: [['(3, 2)', H.c('r', 'yes'), '3', '2'], ['(2, 1)', H.c('r', 'yes'), '3', '1'], ['end', '—', '3', H.c('g', '1 → swap values')]] },
      complexity: `<p><b>Time O(N)</b>, <b>space O(h)</b> (O(1) with Morris inorder).</p>`,
      followUps: ['Do it in O(1) space with Morris traversal', 'What if more than two nodes might be misplaced? (sort-and-rewrite becomes necessary)']
    }
  });
  /* ===================== PRACTICE: Hard ===================== */
  practice.push({
    title: 'Binary Tree Maximum Path Sum',
    level: 'Hard',
    tags: ['postorder', 'dfs', 'global answer'],
    companies: ['Meta', 'Amazon', 'Google', 'Microsoft', 'DoorDash'],
    statement: `<p>A <b>path</b> is any sequence of nodes connected by edges, each used at most once; it need not pass through the root and has at least one node. Return the maximum possible sum of node values on a path.</p>`,
    constraints: `1 ≤ nodes ≤ 3·10<sup>4</sup>, −1000 ≤ Node.val ≤ 1000`,
    example: `<p><code>root = [-10,9,20,null,null,15,7]</code> → ${H.c('g', '42')} from the path ${H.c('g', '15 → 20 → 7')}. Including −10 would only lower the sum. <code>root = [-3]</code> → ${H.c('r', '-3')}: the path must contain at least one node, so the answer can be negative.</p>`,
    brute: {
      why: `<p>Try every node as the "bend" of the path; for each, compute the best downward path into the left and right child with a fresh recursion. Every bend re-walks its subtrees → O(N<sup>2</sup>) for skewed trees (9·10<sup>8</sup> steps at the limit).</p>`,
      code: `
        int maxPathBrute(TreeNode root) {
            if (root == null) return Integer.MIN_VALUE;
            int through = root.val + Math.max(0, down(root.left)) + Math.max(0, down(root.right));
            return Math.max(through, Math.max(maxPathBrute(root.left), maxPathBrute(root.right)));
        }
        int down(TreeNode n) {          // best path starting at n going down (recomputed every time)
            if (n == null) return 0;
            return n.val + Math.max(0, Math.max(down(n.left), down(n.right)));
        }`
    },
    mcq: { q: 'What should the recursive helper RETURN to the parent?', options: ['val + leftGain + rightGain', 'val + max(leftGain, rightGain), where negative gains are clipped to 0', 'The best path sum anywhere in the subtree', 'max(leftGain, rightGain)'], answer: 1, explain: 'The parent can extend the path into only ONE side (a path cannot fork). The two-sided sum val + left + right is a candidate answer recorded in the global maximum, not returned.' },
    hints: [
      `<p><b>Aha:</b> every path has a highest node. At that node the best path = node + best downward gain on the left + best downward gain on the right — but a gain below 0 should be skipped (use 0).</p>`,
      `<p>Postorder helper <code>gain(n)</code> returns n.val + max(0, gain(left), gain(right))… more precisely n.val + max(l, r) with l, r clipped at 0; it updates a field <code>best</code> with n.val + l + r.</p>`,
      `<p><b>Traps:</b> initialise <code>best</code> to the smallest possible value (<code>Integer.MIN_VALUE</code> / <code>-inf</code> / <code>-Infinity</code> / <code>INT_MIN</code>) or to the root's value (all-negative trees); never return the forked sum. <b>Recipe:</b> gain(null)=0; l=max(0,gain(left)); r=max(0,gain(right)); best=max(best,val+l+r); return val+max(l,r).</p>`
    ],
    tests: { sig: 'TreeNode int -> int', fn: 'judge', harness: {
      java: "class Check {\n    // n > 0: right-leaning chain of n nodes, n < 0: left-leaning; node i (0 = root) holds val(i).\n    // Built here because a tree this deep is too big to write out as a test literal.\n    static TreeNode chain(int n, java.util.function.IntUnaryOperator val) {\n        TreeNode root = null;\n        for (int i = Math.abs(n) - 1; i >= 0; i--) {\n            TreeNode t = new TreeNode(val.applyAsInt(i));\n            if (n > 0) t.right = root; else t.left = root;\n            root = t;\n        }\n        return root;\n    }\n\n    static int judge(TreeNode root, int n) {\n        if (n != 0) root = chain(n, i -> (i * 37) % 2001 - 1000);\n        return new Solution().maxPathSum(root);\n    }\n}",
      python: "# n > 0: right-leaning chain of n nodes, n < 0: left-leaning; node i (0 = root) holds val(i).\ndef _chain(n, val):\n    root = None\n    for i in range(abs(n) - 1, -1, -1):\n        t = TreeNode(val(i))\n        if n > 0:\n            t.right = root\n        else:\n            t.left = root\n        root = t\n    return root\n\ndef judge(root, n):\n    if n:\n        root = _chain(n, lambda i: (i * 37) % 2001 - 1000)\n    return Solution().max_path_sum(root)",
      js: "// n > 0: right-leaning chain of n nodes, n < 0: left-leaning; node i (0 = root) holds val(i).\nfunction chain__(n, val) {\n  let root = null;\n  for (let i = Math.abs(n) - 1; i >= 0; i--) {\n    const t = new TreeNode(val(i));\n    if (n > 0) t.right = root; else t.left = root;\n    root = t;\n  }\n  return root;\n}\n\nfunction judge(root, n) {\n  if (n) root = chain__(n, (i) => (i * 37) % 2001 - 1000);\n  return maxPathSum(root);\n}",
      cpp: "// n > 0: right-leaning chain of n nodes, n < 0: left-leaning; node i (0 = root) holds val(i).\nTreeNode* chain__(int n, function<int(int)> val) {\n    TreeNode* root = nullptr;\n    for (int i = abs(n) - 1; i >= 0; i--) {\n        TreeNode* t = new TreeNode(val(i));\n        if (n > 0) t->right = root; else t->left = root;\n        root = t;\n    }\n    return root;\n}\n\nint judge(TreeNode* root, int n) {\n    if (n) root = chain__(n, [](int i) { return (i * 37) % 2001 - 1000; });\n    return Solution().maxPathSum(root);\n}"
    }, cases: [
      [[[1,2,3],0],6],
      [[[-10,9,20,null,null,15,7],0],42],
      [[[-3],0],-3],
      [[[2,-1],0],2],
      [[[-2,-1],0],-1],
      [[[5,4,8,11,null,13,4,7,2,null,null,null,1],0],48],
      [[[-1000,-1000,-1000],0],-1000],
      [[[1,-2,3],0],4],
      [[[537,633,100,33,-932,710,299,null,612,null,722,null,-584,null,239,null,780,265,-165,null,null,null,621,null,null,null,null,null,-276,null,52,-640,-656,null,null,-631,-479,79,null,null,null,949,-872,null,null,null,460],0],3906],
      [[[1000,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000,null,1000],0],300000],
      [[[],-30000],17254],
      [[[],30000],17254]
    ] },
    solution: {
      approach: `<p>One postorder pass: return the best one-sided gain, record the best two-sided path.</p>`,
      code: `
        class Solution {
            public int maxPathSum(TreeNode root) {
                // postorder without recursion (3 * 10^4 nested calls would overflow the stack):
                // list nodes parents-first, then walk the list backwards so children come first
                List<TreeNode> order = new ArrayList<>();
                Deque<TreeNode> st = new ArrayDeque<>();
                st.push(root);
                while (!st.isEmpty()) {
                    TreeNode n = st.pop();
                    order.add(n);
                    if (n.left != null) st.push(n.left);
                    if (n.right != null) st.push(n.right);
                }
                Map<TreeNode, Integer> gain = new HashMap<>();  // best downward path starting at a node
                int best = Integer.MIN_VALUE;                   // answer may be negative
                for (int i = order.size() - 1; i >= 0; i--) {
                    TreeNode n = order.get(i);
                    int l = Math.max(0, gain.getOrDefault(n.left, 0));    // drop a branch that hurts
                    int r = Math.max(0, gain.getOrDefault(n.right, 0));
                    best = Math.max(best, n.val + l + r);       // path bending at n
                    gain.put(n, n.val + Math.max(l, r));        // parent can use only one side
                }
                return best;
            }
        }`,
      alt: [{ lang: 'python', code: `class Solution:
    def max_path_sum(self, root):
        order, stack = [], [root]            # parents before children
        while stack:
            n = stack.pop()
            order.append(n)
            stack.extend(c for c in (n.left, n.right) if c)
        gain, best = {None: 0}, root.val     # best downward path from a node
        for n in reversed(order):            # children before parents
            left = max(0, gain[n.left])      # drop a branch that hurts
            right = max(0, gain[n.right])
            best = max(best, n.val + left + right)   # path bending at n
            gain[n] = n.val + max(left, right)       # parent can use one side only
        return best
` }, { lang: 'js', code: `function maxPathSum(root) {
  const order = [], stack = [root];              // parents before children
  while (stack.length) {
    const n = stack.pop();
    order.push(n);
    if (n.left) stack.push(n.left);
    if (n.right) stack.push(n.right);
  }
  const gain = new Map();                        // best downward path from a node
  const g = (n) => (n ? gain.get(n) : 0);
  let best = -Infinity;                          // the answer may be negative
  for (let i = order.length - 1; i >= 0; i--) {  // children before parents
    const n = order[i];
    const l = Math.max(0, g(n.left));            // drop a branch that hurts
    const r = Math.max(0, g(n.right));
    best = Math.max(best, n.val + l + r);        // path bending at n
    gain.set(n, n.val + Math.max(l, r));         // parent can use one side only
  }
  return best;
}
` }, { lang: 'cpp', code: `// LeetCode-style node (the judge normally provides it)
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(x), left(l), right(r) {}
};

class Solution {
    int best = INT_MIN;                      // the answer may be negative

    int gain(TreeNode* n) {
        if (!n) return 0;
        int l = max(0, gain(n->left));       // drop a branch that hurts
        int r = max(0, gain(n->right));
        best = max(best, n->val + l + r);    // path bending at n
        return n->val + max(l, r);           // parent can use one side only
    }

public:
    int maxPathSum(TreeNode* root) {
        gain(root);
        return best;
    }
};
` }],
      dry: { head: ['node', 'l', 'r', 'val+l+r', 'best', 'returns'], rows: [['9', '0', '0', '9', '9', '9'], ['15', '0', '0', '15', '15', '15'], ['7', '0', '0', '7', '15', '7'], ['20', '15', '7', '42', H.c('g', '42'), '35'], ['−10', '9', '35', '34', H.c('g', '42'), '25']] },
      complexity: `<p><b>Time O(N)</b>, <b>space O(N)</b> for the node list and the gain map. The recursive form needs only O(h), but h can be 3·10<sup>4</sup> here, which overflows a default call stack.</p>`,
      followUps: ['Return the path itself, not just the sum', 'Longest path with the same value (Longest Univalue Path)', 'Max path sum between two LEAVES only']
    }
  });

  practice.push({
    title: 'Serialize and Deserialize Binary Tree',
    level: 'Hard',
    tags: ['preorder', 'design', 'string'],
    companies: ['Meta', 'Amazon', 'Google', 'LinkedIn', 'Uber'],
    statement: `<p>Design <code>serialize(root)</code> that turns a binary tree into a string and <code>deserialize(data)</code> that rebuilds exactly the same tree. Any format is allowed as long as the round trip is exact.</p>`,
    constraints: `0 ≤ nodes ≤ 10<sup>4</sup>, −1000 ≤ Node.val ≤ 1000 (values may repeat!)`,
    example: `<p>Tree <code>[1,2,3,null,null,4,5]</code> → preorder with null markers: ${H.c('g', '"1,2,#,#,3,4,#,#,5,#,#,"')}. Reading it back: 1 is the root; its left subtree starts with 2, whose children are #, # (empty); then 3 with children 4 (#, #) and 5 (#, #). The markers make the shape unambiguous even with duplicate values.</p>`,
    brute: {
      why: `<p>Store the tree as a <b>full array of slots</b> (index i has children 2i+1, 2i+2) including all empty slots. Easy to decode, but a skewed tree of depth 10<sup>4</sup> needs 2<sup>10000</sup> slots. Another tempting brute — storing only preorder + inorder — fails because values may repeat.</p>`,
      code: `
        String serializeBrute(TreeNode root) {
            int h = height(root);
            String[] slots = new String[(1 << Math.min(h, 20)) - 1];   // explodes for deep trees
            Arrays.fill(slots, "#");
            fill(root, 0, slots);
            return String.join(",", slots);
        }
        void fill(TreeNode n, int i, String[] slots) {
            if (n == null || i >= slots.length) return;
            slots[i] = String.valueOf(n.val);
            fill(n.left, 2 * i + 1, slots);
            fill(n.right, 2 * i + 2, slots);
        }
        int height(TreeNode n) { return n == null ? 0 : 1 + Math.max(height(n.left), height(n.right)); }`
    },
    mcq: { q: 'Why is a single preorder WITH null markers enough to rebuild the tree?', options: ['Because preorder is always sorted', 'Because each marker tells the decoder exactly where a subtree ends, so recursion knows when to stop', 'Because values are unique', 'It is not enough; inorder is also required'], answer: 1, explain: 'The decoder reads a value, then recursively reads a whole left subtree (ending when its markers are consumed), then a right subtree. No ambiguity remains, even with repeated values.' },
    hints: [
      `<p><b>Aha:</b> traversals are ambiguous only because missing children are invisible. Write the missing children down (<code>#</code>) and one preorder is enough.</p>`,
      `<p>Serialize with recursive preorder into a string builder (<code>StringBuilder</code>; a list joined once in Python / JavaScript; <code>std::string</code> with <code>+=</code> in C++). Deserialize by splitting on commas into a queue of tokens and consuming them with the same recursion shape.</p>`,
      `<p><b>Traps:</b> negative numbers and multi-digit values (use a separator), the empty tree ("#,"), deep trees (recursion depth — an iterative BFS format avoids it). <b>Recipe:</b> ser(n): null → "#,"; else val + "," + ser(left) + ser(right). des(): t = poll; "#" → null; node(t); node.left = des(); node.right = des().</p>`
    ],
    tests: { sig: 'TreeNode int -> TreeNode', fn: 'judge', harness: {
      java: "class Check {\n    // n > 0: right-leaning chain of n nodes, n < 0: left-leaning; node i (0 = root) holds val(i).\n    // Built here because a tree this deep is too big to write out as a test literal.\n    static TreeNode chain(int n, java.util.function.IntUnaryOperator val) {\n        TreeNode root = null;\n        for (int i = Math.abs(n) - 1; i >= 0; i--) {\n            TreeNode t = new TreeNode(val.applyAsInt(i));\n            if (n > 0) t.right = root; else t.left = root;\n            root = t;\n        }\n        return root;\n    }\n\n    static TreeNode judge(TreeNode root, int n) {\n        if (n != 0) root = chain(n, i -> (i % 2001) - 1000);\n        Codec ser = new Codec(), deser = new Codec();   // the judge round-trips through two instances\n        return deser.deserialize(ser.serialize(root));\n    }\n}",
      python: "# n > 0: right-leaning chain of n nodes, n < 0: left-leaning; node i (0 = root) holds val(i).\ndef _chain(n, val):\n    root = None\n    for i in range(abs(n) - 1, -1, -1):\n        t = TreeNode(val(i))\n        if n > 0:\n            t.right = root\n        else:\n            t.left = root\n        root = t\n    return root\n\ndef judge(root, n):\n    if n:\n        root = _chain(n, lambda i: (i % 2001) - 1000)\n    return Codec().deserialize(Codec().serialize(root))",
      js: "// n > 0: right-leaning chain of n nodes, n < 0: left-leaning; node i (0 = root) holds val(i).\nfunction chain__(n, val) {\n  let root = null;\n  for (let i = Math.abs(n) - 1; i >= 0; i--) {\n    const t = new TreeNode(val(i));\n    if (n > 0) t.right = root; else t.left = root;\n    root = t;\n  }\n  return root;\n}\n\nfunction judge(root, n) {\n  if (n) root = chain__(n, (i) => (i % 2001) - 1000);\n  return new Codec().deserialize(new Codec().serialize(root));\n}",
      cpp: "// n > 0: right-leaning chain of n nodes, n < 0: left-leaning; node i (0 = root) holds val(i).\nTreeNode* chain__(int n, function<int(int)> val) {\n    TreeNode* root = nullptr;\n    for (int i = abs(n) - 1; i >= 0; i--) {\n        TreeNode* t = new TreeNode(val(i));\n        if (n > 0) t->right = root; else t->left = root;\n        root = t;\n    }\n    return root;\n}\n\nTreeNode* judge(TreeNode* root, int n) {\n    if (n) root = chain__(n, [](int i) { return (i % 2001) - 1000; });\n    Codec ser, deser;\n        return deser.deserialize(ser.serialize(root));\n}"
    }, cases: [
      [[[1,2,3,null,null,4,5],0],[1,2,3,null,null,4,5]],
      [[[],0],[]],
      [[[1],0],[1]],
      [[[-1000,1000],0],[-1000,1000]],
      [[[1,1,1,null,1],0],[1,1,1,null,1]],
      [[[1,null,2,null,3],0],[1,null,2,null,3]],
      [[[-242,652,162,116,767,421,140,875,750,-615,-449,null,null,-160,-249,-1000,98,null,-960,-649,817,null,null,null,337,null,null,null,null,602,null,null,709,140,null,null,910,null,null,null,null,712,238,-734,null,null,null,-990,-348,815,138],0],[-242,652,162,116,767,421,140,875,750,-615,-449,null,null,-160,-249,-1000,98,null,-960,-649,817,null,null,null,337,null,null,null,null,602,null,null,709,140,null,null,910,null,null,null,null,712,238,-734,null,null,null,-990,-348,815,138]],
      [[[],10000],m14chain(10000, 'r', (i) => (i % 2001) - 1000)]
    ] },
    solution: {
      approach: `<p>Preorder with null markers; the decoder reads the tokens in the same preorder, each one filling the newest empty link. Both directions use an explicit stack instead of recursion, so a 10<sup>4</sup>-deep tree cannot overflow the call stack.</p>`,
      code: `
        public class Codec {
            // Same preorder-with-# format as the recursive version, but with explicit stacks:
            // a 10^4-deep tree would overflow the call stack.
            public String serialize(TreeNode root) {
                StringBuilder sb = new StringBuilder();
                List<TreeNode> st = new ArrayList<>();      // ArrayList can hold null (ArrayDeque cannot)
                st.add(root);
                while (!st.isEmpty()) {
                    TreeNode n = st.remove(st.size() - 1);
                    if (n == null) { sb.append("#,"); continue; }   // marker keeps the shape
                    sb.append(n.val).append(',');
                    st.add(n.right);                        // pushed first -> written after the left side
                    st.add(n.left);
                }
                return sb.toString();
            }

            // an empty link waiting for its subtree: parent's left or right slot
            private record Slot(TreeNode parent, boolean left) {}

            public TreeNode deserialize(String data) {
                TreeNode holder = new TreeNode(0);          // the real root hangs at holder.left
                Deque<Slot> slots = new ArrayDeque<>();
                slots.push(new Slot(holder, true));
                for (String s : data.split(",")) {
                    Slot slot = slots.pop();                // preorder: the next token fills the newest slot
                    TreeNode n = s.equals("#") ? null : new TreeNode(Integer.parseInt(s));
                    if (slot.left()) slot.parent().left = n; else slot.parent().right = n;
                    if (n != null) {                        // its two children come next: left first
                        slots.push(new Slot(n, false));
                        slots.push(new Slot(n, true));
                    }
                }
                return holder.left;
            }
        }`,
      alt: [{ lang: 'python', code: `class Codec:
    # preorder with '#' markers, using explicit stacks (no recursion limit)
    def serialize(self, root):
        out, stack = [], [root]
        while stack:
            n = stack.pop()
            if n is None:
                out.append('#')              # marker keeps the shape
                continue
            out.append(str(n.val))
            stack.append(n.right)            # pushed first -> written after the left side
            stack.append(n.left)
        return ','.join(out)

    def deserialize(self, data):
        holder = TreeNode(0)                 # the real root hangs at holder.left
        slots = [(holder, 'left')]           # empty links waiting for a subtree
        for s in data.split(','):
            parent, side = slots.pop()       # preorder: the next token fills the newest slot
            node = None if s == '#' else TreeNode(int(s))
            setattr(parent, side, node)
            if node:
                slots.append((node, 'right'))   # its left child comes next, then its right
                slots.append((node, 'left'))
        return holder.left
` }, { lang: 'js', code: `class Codec {
  // preorder with '#' markers, using explicit stacks (no call-stack overflow on deep trees)
  serialize(root) {
    const out = [], stack = [root];
    while (stack.length) {
      const n = stack.pop();
      if (!n) { out.push('#'); continue; }       // marker keeps the shape
      out.push(String(n.val));
      stack.push(n.right, n.left);               // left on top -> written first
    }
    return out.join(',');                        // join once instead of += in a loop
  }

  deserialize(data) {
    const holder = new TreeNode(0);              // the real root hangs at holder.left
    const slots = [[holder, 'left']];            // empty links waiting for a subtree
    for (const s of data.split(',')) {
      const [parent, side] = slots.pop();        // preorder: the next token fills the newest slot
      const node = s === '#' ? null : new TreeNode(Number(s));
      parent[side] = node;
      if (node) slots.push([node, 'right'], [node, 'left']);
    }
    return holder.left;
  }
}
` }, { lang: 'cpp', code: `// LeetCode-style node (the judge normally provides it)
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(x), left(l), right(r) {}
};

class Codec {
public:
    string serialize(TreeNode* root) {
        string out;
        ser(root, out);
        return out;
    }

    TreeNode* deserialize(string data) {
        istringstream in(data);
        return des(in);
    }

private:
    void ser(TreeNode* n, string& out) {
        if (!n) { out += "#,"; return; }     // marker keeps the shape
        out += to_string(n->val) + ",";
        ser(n->left, out);
        ser(n->right, out);
    }

    TreeNode* des(istringstream& in) {
        string s;
        getline(in, s, ',');                 // next token
        if (s == "#") return nullptr;        // empty subtree ends here
        TreeNode* n = new TreeNode(stoi(s));
        n->left = des(in);                   // same order as ser()
        n->right = des(in);
        return n;
    }
};
` }],
      dry: { head: ['token read', 'action', 'building'], rows: [['1', 'new node 1, read its left', '1'], ['2', 'node 2 = 1.left', '1 → 2'], ['#, #', '2 has no children', 'back to 1'], ['3', 'node 3 = 1.right', '1 → 3'], ['4 #, #', '4 = 3.left (leaf)', '…'], ['5 #, #', '5 = 3.right (leaf)', H.c('g', 'done')]] },
      complexity: `<p><b>Time O(N)</b> both ways, <b>space O(N)</b> for the string, the tokens and the explicit stacks. The recursive form is shorter but needs O(h) call stack, which overflows on a 10<sup>4</sup>-deep tree.</p>`,
      followUps: ['Use a compact binary format (e.g. varints) for huge trees', 'Serialize a BST without null markers (preorder alone suffices)', 'Serialize an N-ary tree (store child counts)']
    }
  });

  practice.push({
    title: 'Vertical Order Traversal of a Binary Tree',
    level: 'Hard',
    tags: ['dfs', 'sorting', 'coordinates'],
    companies: ['Meta', 'Amazon', 'Microsoft'],
    statement: `<p>Place the root at (row 0, col 0); a left child is at (row + 1, col − 1), a right child at (row + 1, col + 1). Return the columns from left to right; inside a column list nodes top to bottom, and when two nodes share the <b>same row and column</b>, order them by <b>value</b>.</p>`,
    constraints: `1 ≤ nodes ≤ 1000, 0 ≤ Node.val ≤ 1000`,
    example: `<p><code>root = [1,2,3,4,5,6,7]</code> → ${H.c('g', '[[4],[2],[1,5,6],[3],[7]]')}. Column 0 holds 1 (row 0) and both 5 and 6 at (row 2, col 0); the tie is broken by value: 5 before 6.</p>`,
    brute: {
      why: `<p>Collect (col, row, val) for every node; then for every column from min to max, scan the whole list for nodes in that column and sort them. Scanning once per column is O(N·C) — up to O(N<sup>2</sup>) for wide trees — on top of the sorting.</p>`,
      code: `
        List<List<Integer>> verticalBrute(TreeNode root) {
            List<int[]> all = new ArrayList<>();       // {col, row, val}
            collect(root, 0, 0, all);
            int lo = Integer.MAX_VALUE, hi = Integer.MIN_VALUE;
            for (int[] e : all) { lo = Math.min(lo, e[0]); hi = Math.max(hi, e[0]); }
            List<List<Integer>> res = new ArrayList<>();
            for (int c = lo; c <= hi; c++) {           // full scan per column
                List<int[]> col = new ArrayList<>();
                for (int[] e : all) if (e[0] == c) col.add(e);
                col.sort((a, b) -> a[1] != b[1] ? a[1] - b[1] : a[2] - b[2]);
                List<Integer> vals = new ArrayList<>();
                for (int[] e : col) vals.add(e[2]);
                res.add(vals);
            }
            return res;
        }
        void collect(TreeNode n, int row, int col, List<int[]> out) {
            if (n == null) return;
            out.add(new int[]{col, row, n.val});
            collect(n.left, row + 1, col - 1, out);
            collect(n.right, row + 1, col + 1, out);
        }`
    },
    mcq: { q: 'Why can\'t plain BFS order (without sorting) solve this version?', options: ['BFS is too slow', 'Nodes at the same row and column must be ordered by value, and BFS orders them by position instead', 'BFS cannot compute columns', 'BFS visits columns right to left'], answer: 1, explain: 'BFS gives rows top-down correctly, but ties within the same (row, col) come out in left-to-right discovery order, not value order. A sort on (col, row, val) handles every rule at once.' },
    hints: [
      `<p><b>Aha:</b> every rule in the statement is just a sort key: column first, then row, then value. Turn the tree into a list of (col, row, val) triples and sort.</p>`,
      `<p>Any traversal collects the triples (DFS passing row and col). Sort with a comparator on the three fields, then group consecutive equal columns.</p>`,
      `<p><b>Traps:</b> ties at the same row and column; columns are negative (don't index arrays directly without an offset). <b>Recipe:</b> collect triples; sort by (col, row, val); walk the sorted list, starting a new group when col changes.</p>`
    ],
    tests: { sig: 'TreeNode -> list<list<int>>', fn: 'verticalTraversal', cases: [
      [[[1,2,3,4,5,6,7]],[[4],[2],[1,5,6],[3],[7]]],
      [[[3,9,20,null,null,15,7]],[[9],[3,15],[20],[7]]],
      [[[1,2,3,4,6,5,7]],[[4],[2],[1,5,6],[3],[7]]],
      [[[0]],[[0]]],
      [[[1,2]],[[2],[1]]],
      [[[3,1,4,0,2,2]],[[0],[1],[3,2,2],[4]]],
      [[[1000,0,1000,null,5,5]],[[0],[1000,5,5],[1000]]],
      [[[7,12,8,16,null,17,16,11,7,6,13,11,12,null,null,null,null,null,8,null,17,null,13,16,1,null,null,null,null,null,12,null,null,null,null,null,6,5]],[[11],[16],[12,6,7],[7,17,8],[8,11,13],[16,13,16,17],[12,12,5],[1,6]]],
      [[[5,8,9,null,null,9,16,15,19,16,null,17,8,null,null,null,null,2,10,2,null,null,null,3,18,null,null,17,19,null,3,null,null,null,15,null,null,null,4]],[[2,17],[17,3],[8,15,2,10,19],[5,9,8,18,15],[9,16,19,3,4],[16]]]
    ] },
    solution: {
      approach: `<p>Coordinates + one global sort + grouping by column.</p>`,
      code: `
        class Solution {
            public List<List<Integer>> verticalTraversal(TreeNode root) {
                List<int[]> nodes = new ArrayList<>();                // {col, row, val}
                dfs(root, 0, 0, nodes);
                nodes.sort((a, b) -> a[0] != b[0] ? Integer.compare(a[0], b[0])
                                   : a[1] != b[1] ? Integer.compare(a[1], b[1])
                                   : Integer.compare(a[2], b[2]));
                List<List<Integer>> res = new ArrayList<>();
                int prevCol = Integer.MIN_VALUE;
                for (int[] e : nodes) {
                    if (e[0] != prevCol) { res.add(new ArrayList<>()); prevCol = e[0]; }  // new column
                    res.get(res.size() - 1).add(e[2]);
                }
                return res;
            }
            private void dfs(TreeNode n, int row, int col, List<int[]> out) {
                if (n == null) return;
                out.add(new int[]{col, row, n.val});
                dfs(n.left, row + 1, col - 1, out);
                dfs(n.right, row + 1, col + 1, out);
            }
        }`,
      alt: [{ lang: 'python', code: `from itertools import groupby

class Solution:
    def vertical_traversal(self, root):
        cells, stack = [], [(root, 0, 0)]    # (node, row, col)
        while stack:
            n, row, col = stack.pop()
            cells.append((col, row, n.val))
            if n.left:
                stack.append((n.left, row + 1, col - 1))
            if n.right:
                stack.append((n.right, row + 1, col + 1))
        cells.sort()                         # by col, then row, then value
        return [[v for _, _, v in grp] for _, grp in groupby(cells, key=lambda c: c[0])]
` }, { lang: 'js', code: `function verticalTraversal(root) {
  const cells = [];                              // [col, row, val]
  const dfs = (n, row, col) => {
    if (!n) return;
    cells.push([col, row, n.val]);
    dfs(n.left, row + 1, col - 1);
    dfs(n.right, row + 1, col + 1);
  };
  dfs(root, 0, 0);
  cells.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);   // numeric comparator
  const res = [];
  let prevCol = null;
  for (const [col, , val] of cells) {
    if (col !== prevCol) { res.push([]); prevCol = col; }   // new column
    res[res.length - 1].push(val);
  }
  return res;
}
` }, { lang: 'cpp', code: `// LeetCode-style node (the judge normally provides it)
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(x), left(l), right(r) {}
};

class Solution {
public:
    vector<vector<int>> verticalTraversal(TreeNode* root) {
        vector<tuple<int, int, int>> cells;           // (col, row, val)
        dfs(root, 0, 0, cells);
        sort(cells.begin(), cells.end());             // tuples compare col, row, val in order
        vector<vector<int>> res;
        int prevCol = INT_MIN;
        for (auto& [col, row, val] : cells) {
            if (col != prevCol) { res.emplace_back(); prevCol = col; }   // new column
            res.back().push_back(val);
        }
        return res;
    }

private:
    void dfs(TreeNode* n, int row, int col, vector<tuple<int, int, int>>& out) {
        if (!n) return;
        out.emplace_back(col, row, n->val);
        dfs(n->left, row + 1, col - 1, out);
        dfs(n->right, row + 1, col + 1, out);
    }
};
` }],
      dry: { head: ['sorted triple (col, row, val)', 'group'], rows: [['(−2, 2, 4)', '[4]'], ['(−1, 1, 2)', '[2]'], ['(0, 0, 1), (0, 2, 5), (0, 2, 6)', H.c('g', '[1, 5, 6]')], ['(1, 1, 3)', '[3]'], ['(2, 2, 7)', '[7]']] },
      complexity: `<p><b>Time O(N log N)</b> for the sort, <b>space O(N)</b>.</p>`,
      followUps: ['The simpler LeetCode 314 version (ties by left-to-right order) in O(N) with BFS', 'Top and bottom views from the same coordinates']
    }
  });

  practice.push({
    title: 'Maximum Sum BST in Binary Tree',
    level: 'Hard',
    tags: ['postorder', 'bst', 'tree dp'],
    companies: ['Amazon', 'Google', 'ByteDance'],
    statement: `<p>Given a binary tree (not necessarily a BST), return the maximum sum of all keys of any <b>subtree</b> that is a valid BST. If every BST subtree has a negative sum, return 0 (the empty tree is a BST).</p>`,
    constraints: `1 ≤ nodes ≤ 4·10<sup>4</sup>, −4·10<sup>4</sup> ≤ Node.val ≤ 4·10<sup>4</sup>`,
    example: `<p><code>root = [1,4,3,2,4,2,5,null,null,null,null,null,null,4,6]</code> → ${H.c('g', '20')}. The subtree rooted at ${H.c('g', '3')} (values 3, 2, 5, 4, 6) is a valid BST with sum 20. The whole tree is not a BST (4 is left of 1), and the subtree at 4 has a duplicate 4 on its right.</p>`,
    brute: {
      why: `<p>For every node, check whether its subtree is a BST with a range-validation walk and, if so, sum it with another walk. Each check is O(subtree size), so the total is O(N<sup>2</sup>) on a skewed tree (1.6·10<sup>9</sup> steps at the limit).</p>`,
      code: `
        int bestBrute = 0;
        int maxSumBSTBrute(TreeNode root) {
            if (root == null) return 0;
            if (valid(root, Long.MIN_VALUE, Long.MAX_VALUE)) bestBrute = Math.max(bestBrute, sum(root));
            maxSumBSTBrute(root.left);
            maxSumBSTBrute(root.right);
            return bestBrute;
        }
        boolean valid(TreeNode n, long lo, long hi) {
            if (n == null) return true;
            if (n.val <= lo || n.val >= hi) return false;
            return valid(n.left, lo, n.val) && valid(n.right, n.val, hi);
        }
        int sum(TreeNode n) { return n == null ? 0 : n.val + sum(n.left) + sum(n.right); }`
    },
    mcq: { q: 'Which facts must each subtree report upward so the parent can decide in O(1) whether it is a BST?', options: ['Only its sum', 'Whether it is a BST, its min, its max and its sum', 'Its height and size', 'Its inorder list'], answer: 1, explain: 'The parent is a BST iff both children are BSTs and leftMax < val < rightMin. The sum is needed for the answer. Four numbers per subtree → O(1) work per node.' },
    hints: [
      `<p><b>Aha:</b> "is my subtree a BST?" only needs the children's answers plus their min/max — a bottom-up (postorder) question, like the balanced check.</p>`,
      `<p>Return an <code>int[]{isBST, min, max, sum}</code>. Empty subtree: {1, +∞, −∞, 0} so that leaves pass the comparison automatically. Keep a global <code>best</code> starting at 0.</p>`,
      `<p><b>Traps:</b> the answer is at least 0; a non-BST child makes the parent non-BST even if the parent's own comparison passes; strict inequalities (duplicates are not allowed). <b>Recipe:</b> L, R = post(children); if L.ok &amp;&amp; R.ok &amp;&amp; L.max &lt; v &lt; R.min → sum = L.sum + R.sum + v, best = max(best, sum), return {1, min(L.min, v), max(R.max, v), sum}; else return {0, …}.</p>`
    ],
    tests: { sig: 'TreeNode int -> int', fn: 'judge', harness: {
      java: "class Check {\n    // n > 0: right-leaning chain of n nodes, n < 0: left-leaning; node i (0 = root) holds val(i).\n    // Built here because a tree this deep is too big to write out as a test literal.\n    static TreeNode chain(int n, java.util.function.IntUnaryOperator val) {\n        TreeNode root = null;\n        for (int i = Math.abs(n) - 1; i >= 0; i--) {\n            TreeNode t = new TreeNode(val.applyAsInt(i));\n            if (n > 0) t.right = root; else t.left = root;\n            root = t;\n        }\n        return root;\n    }\n\n    static int judge(TreeNode root, int n) {\n        if (n != 0) root = chain(n, i -> i - 20000);\n        return new Solution().maxSumBST(root);\n    }\n}",
      python: "# n > 0: right-leaning chain of n nodes, n < 0: left-leaning; node i (0 = root) holds val(i).\ndef _chain(n, val):\n    root = None\n    for i in range(abs(n) - 1, -1, -1):\n        t = TreeNode(val(i))\n        if n > 0:\n            t.right = root\n        else:\n            t.left = root\n        root = t\n    return root\n\ndef judge(root, n):\n    if n:\n        root = _chain(n, lambda i: i - 20000)\n    return Solution().max_sum_bst(root)",
      js: "// n > 0: right-leaning chain of n nodes, n < 0: left-leaning; node i (0 = root) holds val(i).\nfunction chain__(n, val) {\n  let root = null;\n  for (let i = Math.abs(n) - 1; i >= 0; i--) {\n    const t = new TreeNode(val(i));\n    if (n > 0) t.right = root; else t.left = root;\n    root = t;\n  }\n  return root;\n}\n\nfunction judge(root, n) {\n  if (n) root = chain__(n, (i) => i - 20000);\n  return maxSumBST(root);\n}",
      cpp: "// n > 0: right-leaning chain of n nodes, n < 0: left-leaning; node i (0 = root) holds val(i).\nTreeNode* chain__(int n, function<int(int)> val) {\n    TreeNode* root = nullptr;\n    for (int i = abs(n) - 1; i >= 0; i--) {\n        TreeNode* t = new TreeNode(val(i));\n        if (n > 0) t->right = root; else t->left = root;\n        root = t;\n    }\n    return root;\n}\n\nint judge(TreeNode* root, int n) {\n    if (n) root = chain__(n, [](int i) { return i - 20000; });\n    return Solution().maxSumBST(root);\n}"
    }, cases: [
      [[[1,4,3,2,4,2,5,null,null,null,null,null,null,4,6],0],20],
      [[[4,3,null,1,2],0],2],
      [[[-4,-2,-5],0],0],
      [[[2,1,3],0],6],
      [[[5,4,8,3,null,6,3],0],7],
      [[[1],0],1],
      [[[-40000],0],0],
      [[[40000,39999,null,39998],0],119997],
      [[[1,null,10,-5,20],0],25],
      [[[-1,-34,-12,null,-13,-49,37,null,-2,null,31,-1,null,6,-22,null,13,35,32,28,null,18,-47,null,null,null,39,17,null,null,null,null,null,null,null,null,null,23],0],74],
      [[[700,-9306,37723,-39720,-2240,33197,39622,null,-28519,-3622,497,25588,34648,37780,39751,-36397,-24609,-3738,null,-322,null,20630,28600,null,34712,null,null,null,null,-36488,null,null,-10720,-3952,null,null,null,6715,21478,27349,30300,null,null,null,null,-12540,-10670,-5068,null,1959,13095,null,24045,27119,null,30131,30515,-18383,null,null,null,null,null,null,null,null,null,null,24721,null,null,null,null,null,null,-20815],0],569678],
      [[[],40000],199990000]
    ] },
    solution: {
      approach: `<p>Postorder "tree DP": each subtree returns (isBST, min, max, sum); combine in O(1).</p>`,
      code: `
        class Solution {
            public int maxSumBST(TreeNode root) {
                // postorder without recursion (the tree can be 4 * 10^4 deep):
                // list nodes parents-first, then walk backwards so children come first
                List<TreeNode> order = new ArrayList<>();
                Deque<TreeNode> st = new ArrayDeque<>();
                st.push(root);
                while (!st.isEmpty()) {
                    TreeNode n = st.pop();
                    order.add(n);
                    if (n.left != null) st.push(n.left);
                    if (n.right != null) st.push(n.right);
                }
                int[] empty = {1, Integer.MAX_VALUE, Integer.MIN_VALUE, 0};   // {isBST, min, max, sum}
                Map<TreeNode, int[]> info = new HashMap<>();
                int best = 0;                                // empty BST has sum 0
                for (int i = order.size() - 1; i >= 0; i--) {
                    TreeNode n = order.get(i);
                    int[] L = n.left == null ? empty : info.get(n.left);
                    int[] R = n.right == null ? empty : info.get(n.right);
                    if (L[0] == 1 && R[0] == 1 && L[2] < n.val && n.val < R[1]) {
                        int sum = L[3] + R[3] + n.val;
                        best = Math.max(best, sum);
                        info.put(n, new int[]{1, Math.min(L[1], n.val), Math.max(R[2], n.val), sum});
                    } else {
                        info.put(n, new int[]{0, 0, 0, 0});  // not a BST: values no longer matter
                    }
                }
                return best;
            }
        }`,
      alt: [{ lang: 'python', code: `class Solution:
    def max_sum_bst(self, root):
        order, stack = [], [root]            # parents before children
        while stack:
            n = stack.pop()
            order.append(n)
            stack.extend(c for c in (n.left, n.right) if c)
        info = {None: (True, float('inf'), float('-inf'), 0)}   # (is_bst, min, max, sum)
        best = 0                             # the empty BST has sum 0
        for n in reversed(order):            # children before parents
            lb, lmin, lmax, lsum = info[n.left]
            rb, rmin, rmax, rsum = info[n.right]
            if lb and rb and lmax < n.val < rmin:
                total = lsum + rsum + n.val
                best = max(best, total)
                info[n] = (True, min(lmin, n.val), max(rmax, n.val), total)
            else:
                info[n] = (False, 0, 0, 0)   # not a BST: the rest no longer matters
        return best
` }, { lang: 'js', code: `function maxSumBST(root) {
  const order = [], stack = [root];              // parents before children
  while (stack.length) {
    const n = stack.pop();
    order.push(n);
    if (n.left) stack.push(n.left);
    if (n.right) stack.push(n.right);
  }
  const EMPTY = { ok: true, min: Infinity, max: -Infinity, sum: 0 };
  const info = new Map();
  const get = (n) => (n ? info.get(n) : EMPTY);
  let best = 0;                                  // the empty BST has sum 0
  for (let i = order.length - 1; i >= 0; i--) {  // children before parents
    const n = order[i], L = get(n.left), R = get(n.right);
    if (L.ok && R.ok && L.max < n.val && n.val < R.min) {
      const sum = L.sum + R.sum + n.val;
      best = Math.max(best, sum);
      info.set(n, { ok: true, min: Math.min(L.min, n.val), max: Math.max(R.max, n.val), sum });
    } else {
      info.set(n, { ok: false, min: 0, max: 0, sum: 0 });   // not a BST: the rest no longer matters
    }
  }
  return best;
}
` }, { lang: 'cpp', code: `// LeetCode-style node (the judge normally provides it)
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(x), left(l), right(r) {}
};

class Solution {
    struct Info { bool bst; int lo, hi, sum; };
    int best = 0;                            // the empty BST has sum 0

    Info post(TreeNode* n) {
        if (!n) return {true, INT_MAX, INT_MIN, 0};
        Info L = post(n->left), R = post(n->right);
        if (L.bst && R.bst && L.hi < n->val && n->val < R.lo) {
            int sum = L.sum + R.sum + n->val;
            best = max(best, sum);
            return {true, min(L.lo, n->val), max(R.hi, n->val), sum};
        }
        return {false, 0, 0, 0};             // not a BST: the rest no longer matters
    }

public:
    int maxSumBST(TreeNode* root) {
        post(root);
        return best;
    }
};
` }],
      dry: { head: ['subtree root', 'children BST?', 'leftMax &lt; val &lt; rightMin', 'sum', 'best'], rows: [['4 (under 5)', 'yes (leaves)', 'yes', '4', '4'], ['6', 'yes', 'yes', '6', '6'], ['5', 'yes', '4 &lt; 5 &lt; 6', '15', '15'], ['2 (under 3)', 'yes', 'yes', '2', '15'], ['3', 'yes', '2 &lt; 3 &lt; 4', H.c('g', '20'), H.c('g', '20')], ['4 (under 1)', 'yes', H.c('r', '4 &lt; 4 fails'), '—', '20'], ['1', H.c('r', 'no'), '—', '—', H.c('g', '20')]] },
      complexity: `<p><b>Time O(N)</b>, <b>space O(N)</b> for the node list and the info map. The recursive form needs O(h) call stack instead, and h can reach 4·10<sup>4</sup> here.</p>`,
      followUps: ['Return the SIZE of the largest BST subtree instead of the sum', 'Largest BST when duplicates are allowed on one side']
    }
  });
  /* ===================== QUIZ ===================== */
  quiz.push(
    { q: 'A binary tree has 12 nodes. How many edges does it have?', options: ['12', '11', '13', 'It depends on the shape'], answer: 1, explain: 'Every node except the root has exactly one edge to its parent, so a tree with N nodes always has N − 1 edges, whatever its shape.' },
    { q: 'For the tree 1 → (2 → 4, 5), (3 → null, 6), what is the <b>postorder</b>?', options: ['1 2 4 5 3 6', '4 2 5 1 3 6', '4 5 2 6 3 1', '1 2 3 4 5 6'], answer: 2, explain: 'Postorder = Left, Right, Me: finish 2\'s subtree (4, 5, then 2), then 3\'s subtree (6, then 3), then the root 1.' },
    { q: 'Which traversal of a BST gives the values in sorted (increasing) order?', options: ['Preorder', 'Inorder', 'Postorder', 'Level order'], answer: 1, explain: 'Inorder visits Left (all smaller), Me, Right (all bigger), so a BST comes out sorted.' },
    { q: 'In BFS level order, why do we save <code>size = q.size()</code> before processing a level?', options: ['To count all nodes', 'So children added during the level are not processed as part of it', 'Because the queue cannot be read while modified', 'To detect cycles'], answer: 1, explain: 'Children of this level are appended to the back. The snapshot tells you exactly how many nodes belong to the current level.' },
    { q: 'Recursive DFS on a skewed tree with 10<sup>5</sup> nodes, using the language\'s default call stack, most likely…', options: ['Runs fine in O(log N) stack', 'Overflows the call stack (StackOverflowError, RecursionError, RangeError) because the recursion depth is 10<sup>5</sup>', 'Runs in O(N<sup>2</sup>) time', 'Uses O(1) memory'], answer: 1, explain: 'Stack depth equals the height. A chain of 10<sup>5</sup> nodes means 10<sup>5</sup> frames, which can exceed the default thread stack. Use an explicit stack or BFS.' },
    { q: 'Right view of the tree 1 → (2 → 4, null), 3: what is it?', options: ['[1, 3]', '[1, 3, 4]', '[1, 2, 4]', '[1, 2, 3, 4]'], answer: 1, explain: 'One node per level, the last one: level 0 → 1, level 1 → 3, level 2 → 4 (the only node there, even though it is on the left).' },
    { q: 'Top view with BFS keeps only the first value seen per column (<code>putIfAbsent</code> / <code>setdefault</code>). Why does that give the TOPMOST node per column?', options: ['Because TreeMap sorts by value', 'Because BFS reaches higher levels before lower ones, so the first node seen in a column is the highest', 'Because left children are visited first', 'It does not; you must sort by depth'], answer: 1, explain: 'BFS processes level 0, then 1, then 2… The first arrival in a column is at the smallest depth. (A plain DFS does not have this guarantee.)' },
    { q: 'At node X, left height = 4 and right height = 2 (heights in nodes). Which statement is true?', options: ['X is balanced', 'The longest path bending at X has 6 edges', 'X violates the height-balance rule, and the longest path bending at X has 6 edges', 'The diameter of the whole tree is exactly 6'], answer: 2, explain: '|4 − 2| = 2 &gt; 1 → unbalanced. Path bending at X = 4 + 2 = 6 edges. The tree\'s diameter is at least 6 but could be larger elsewhere.' },
    { q: 'In the recursive LCA, the left call returns null and the right call returns node 7. What does the current node return?', options: ['null', 'Itself', 'Node 7', 'The root'], answer: 2, explain: 'Only the right side found something, so pass that finding (7 — either a target or the LCA already found below) upward unchanged.' },
    { q: 'In a BST, LCA(p = 3, q = 9) when the current node is 6. What do you do?', options: ['Go left', 'Go right', 'Return 6 — p and q are on different sides', 'Search both sides'], answer: 2, explain: '3 &lt; 6 &lt; 9: the two values split here, so no deeper node can contain both. 6 is the LCA.' },
    { q: 'You insert 10, 20, 30, 40, 50 (in this order) into an empty plain BST. What is its height (in nodes)?', options: ['3', '5', '⌈log₂5⌉', '1'], answer: 1, explain: 'Each value is bigger than all previous ones, so it always goes to the right: a chain of 5 nodes. Sorted input is the worst case for an unbalanced BST.' },
    { q: 'Deleting a BST node with two children: the inorder successor is found by…', options: ['Going left once, then right as far as possible', 'Going right once, then left as far as possible', 'Taking the parent', 'Taking the right child'], answer: 1, explain: 'The successor is the minimum of the right subtree: step right once, then keep going left. It never has a left child, so deleting it afterwards is an easy case.' },
    { q: 'Which tree passes a "compare each node only with its children" check but is NOT a valid BST?', options: ['[2, 1, 3]', '[5, 1, 6, null, null, 3, 7]', '[5, 3, 8, 1, 4]', '[1, null, 2]'], answer: 1, explain: 'In [5,1,6,null,null,3,7], 3 is the left child of 6 (fine locally) but lies in 5\'s right subtree, where every value must exceed 5.' },
    { q: 'preorder = [3, 9, 20, 15, 7], inorder = [9, 3, 15, 20, 7]. How many nodes are in the root\'s left subtree?', options: ['0', '1', '2', '3'], answer: 1, explain: 'The root is 3 (first in preorder). In inorder, 3 is at index 1, so exactly one value (9) is on its left.' },
    { q: 'Why is preorder + postorder (without inorder) not always enough to rebuild a binary tree?', options: ['They have different lengths', 'A node with a single child gives the same pre/post lists whether the child is left or right', 'Postorder is not unique', 'Values must be sorted'], answer: 1, explain: 'pre [1, 2] / post [2, 1] fits both "2 is the left child" and "2 is the right child". Inorder (or null markers) resolves left vs right.' },
    { q: 'k-th smallest in a BST using iterative inorder with early stop costs…', options: ['O(N log N)', 'O(N) always', 'O(h + k)', 'O(k log N)'], answer: 2, explain: 'You slide down at most h nodes to reach the minimum, then do k pops (their right-subtree slides are paid for by later pops). Stop at the k-th pop.' }
  );
  /* ===================== INTERVIEW Q&A ===================== */
  interview.push(
    {
      q: 'What is the difference between depth and height of a node? How do you compute each?', level: 'B',
      a: `<p><b>Depth</b> is measured from the top: the number of edges from the root down to the node (root = 0). It is computed <b>top-down</b> by passing <code>depth + 1</code> to the children. <b>Height</b> is measured from the bottom: the longest path from the node down to a leaf. It is computed <b>bottom-up</b> (postorder): <code>height(n) = 1 + max(height(left), height(right))</code>, with <code>height(null) = 0</code> if you count nodes (LeetCode style) or −1 if you count edges (textbook style). I always state my convention before coding, because mixing them creates off-by-one bugs.</p>`,
      followUps: ['What is the height of a tree with one node in each convention?', 'Which one does "maximum depth of a binary tree" ask for?']
    },
    {
      q: 'Explain preorder, inorder and postorder, and give a real use for each.', level: 'B',
      a: `<p>All three are depth-first and visit the same path; they differ only in <b>when the node itself is recorded</b>. <b>Preorder</b> (Me, Left, Right) records a node before its children — used to copy or serialize a tree and to print a folder listing. <b>Inorder</b> (Left, Me, Right) records it between the subtrees — on a BST this yields sorted order (k-th smallest, validation, iterators). <b>Postorder</b> (Left, Right, Me) records it after both children — used whenever a node needs its children's answers: height, diameter, subtree sums, deleting/freeing a tree, evaluating an expression tree. Each is O(N) time and O(h) space.</p>`,
      followUps: ['Which traversal gives Reverse Polish Notation of an expression tree?', 'Can a single traversal uniquely identify a tree?']
    },
    {
      q: 'How would you do an inorder traversal without recursion? What does the stack represent?', level: 'I',
      a: `<p>Keep a pointer <code>cur</code> and a <code>Deque</code> stack. Loop while <code>cur != null || !stack.isEmpty()</code>: slide left pushing every node, pop the top and record it, then set <code>cur = popped.right</code>. The stack holds the nodes <b>whose left subtree is still being processed</b> — exactly the frames recursion would have on its call stack. Every node is pushed and popped once, so it is O(N) time and O(h) space, but the memory is on the heap, so a 10<sup>5</sup>-deep skewed tree does not overflow. The same loop, paused between pops, is a BST iterator with O(1) amortised <code>next()</code>.</p>`,
      followUps: ['Iterative postorder with one stack?', 'Can you do it in O(1) extra space? (Morris traversal)']
    },
    {
      q: 'BFS or DFS for a tree problem — how do you choose?', level: 'I',
      a: `<p>I pick by the question's wording and by memory. BFS (queue, level by level) fits anything about <b>levels</b>: level order, zigzag, views, averages per level, and "nearest / minimum depth" because it can stop at the first hit. DFS (recursion or stack) fits <b>path</b> and <b>subtree</b> questions: root-to-leaf sums, height, diameter, balance, LCA, validation. Memory: BFS holds a whole level — up to N/2 nodes on a full tree; DFS holds one path — O(h), tiny on balanced trees but N on a skewed one, where recursion can also overflow. If both work, I mention the trade-off and pick the simpler one.</p>`,
      followUps: ['Which uses less memory on a perfect tree of a million nodes?', 'How do you get level-by-level output from a DFS?']
    },
    {
      q: 'How do you compute the diameter of a binary tree in O(N)?', level: 'I',
      a: `<p>Every path has a highest node where it bends. If the bend is X, the longest such path is <code>height(X.left) + height(X.right)</code> edges. So I run one postorder function that <b>returns</b> the height (what the parent needs) and, before returning, updates a global <code>best = max(best, lh + rh)</code> (what the question asks). Calling a separate height function at every node would be O(N<sup>2</sup>) on a skewed tree; folding it into one pass makes it O(N) with O(h) stack. The same "return one-sided, record two-sided" pattern solves maximum path sum and longest univalue path.</p>`,
      followUps: ['Does the diameter always pass through the root?', 'Diameter of a general tree given as an edge list?']
    },
    {
      q: 'How do you check whether a binary tree is height-balanced efficiently?', level: 'I',
      a: `<p>Balanced means <b>every</b> node's subtree heights differ by at most 1 — checking only the root is a classic mistake. I write one postorder function that returns the subtree height if it is balanced, or a sentinel −1 if anything below is broken. Each node checks the left result (return −1 immediately if it is −1), then the right result, then <code>|lh − rh| &gt; 1</code>. Total O(N) time, O(h) space, with early exit. The naive approach calls height() at every node and costs O(N<sup>2</sup>) on skewed trees. Real libraries keep trees balanced with AVL or red-black rotations so height stays O(log N).</p>`,
      followUps: ['Why does AVL balance guarantee O(log N) height?', 'How would you rebalance an existing unbalanced BST?']
    },
    {
      q: 'Find the lowest common ancestor of two nodes in a binary tree and in a BST.', level: 'I',
      a: `<p><b>Binary tree:</b> a postorder recursion where each call reports what it found. If the node is null, p or q, return it. Otherwise ask both children; if both return non-null, p and q are on different sides, so this node is the LCA; otherwise pass up the non-null one. O(N) time, O(h) space. It assumes both nodes exist — if not, count the targets found instead of short-circuiting. <b>BST:</b> walk from the root comparing values: both smaller → go left, both bigger → go right, otherwise this node is the split point. O(h) time and O(1) space as a loop. For many queries I would precompute binary lifting (O(log N) per query) or an Euler tour with RMQ.</p>`,
      followUps: ['What if one of the nodes might not be in the tree?', 'How do you get the distance between two nodes from the LCA?']
    },
    {
      q: 'Explain how to delete a node from a BST.', level: 'I',
      a: `<p>First search for the key, recursing left or right and re-linking the returned subtree (<code>node.left = delete(node.left, key)</code>). At the target there are three cases. <b>Leaf:</b> return null. <b>One child:</b> return that child, which moves up with its subtree. <b>Two children:</b> find the inorder successor (go right once, then left all the way), copy its value into the node, and delete the successor from the right subtree — it has no left child, so that is case 1 or 2. Everything stays ordered because the successor is bigger than the whole left side and smaller than the rest of the right side. Cost O(h).</p>`,
      followUps: ['Why does the successor never have a left child?', 'What changes in a self-balancing tree?']
    },
    {
      q: 'How do you validate a BST? What are the common bugs?', level: 'I',
      a: `<p>Pass an open interval down: <code>valid(node, lo, hi)</code> requires <code>lo &lt; val &lt; hi</code>; the left child gets <code>(lo, val)</code> and the right child <code>(val, hi)</code>. Equivalently, an inorder walk must be strictly increasing. Common bugs: comparing a node only with its children (fails on [5,1,6,null,null,3,7], where 3 sits in 5's right subtree); using the 32-bit extremes (<code>Integer.MIN_VALUE</code> / <code>INT_MIN</code>) as sentinels when nodes can hold those values (use 64-bit, infinite or null bounds); allowing duplicates when the definition is strict; and a static <code>prev</code> not reset between calls. Both approaches are O(N) time and O(h) space.</p>`,
      followUps: ['Prove that strictly increasing inorder implies a valid BST.', 'Find the largest BST subtree of a binary tree.']
    },
    {
      q: 'Find the k-th smallest element in a BST. How would you support frequent updates and queries?', level: 'A',
      a: `<p>Inorder of a BST is sorted, so I run an iterative inorder and return the value at the k-th pop — O(h + k) time, O(h) space, no full list. If the tree is modified often and k-th queries are frequent, I augment every node with the <b>size of its subtree</b> (an order-statistic tree). Then at each node: if k equals leftSize + 1 the node is the answer; if k ≤ leftSize go left; else subtract leftSize + 1 and go right — O(h) per query. Insert and delete update sizes along their path, still O(h). On a balanced tree that is O(log N) per operation; this is also how rank/percentile queries are supported in databases.</p>`,
      followUps: ['How do you compute rank(x) with subtree sizes?', 'What if values arrive as a stream with no tree at all? (heap of size k)']
    },
    {
      q: 'Build a binary tree from its preorder and inorder traversals. Why is it O(N)?', level: 'A',
      a: `<p>The first preorder value is the root; its position m in inorder splits the remaining values into the left subtree (positions before m) and right subtree (after m). I keep a global preorder index and a hash map from value to inorder index, and recurse on inorder windows: <code>build(lo, hi)</code> takes the next preorder value as root, builds the left from <code>lo..m−1</code> first (preorder lists it next), then the right from <code>m+1..hi</code>. Each value creates one node with an O(1) map lookup, and no arrays are copied, so it is O(N) time and O(N) space. Linear search plus array slicing would be O(N<sup>2</sup>). It requires distinct values; postorder + inorder works the same way from the back, building the right subtree first.</p>`,
      followUps: ['Why not preorder + postorder?', 'Build a BST from preorder alone in O(N).']
    },
    {
      q: 'Why are library ordered maps (Java\'s TreeMap, C++\'s std::map) O(log N) when a BST can degrade to O(N)?', level: 'A',
      a: `<p>A plain BST's cost is O(h), and inserting sorted keys makes h = N. <code>TreeMap</code> and <code>std::map</code> are <b>red-black trees</b>: every node is coloured red or black with rules (no two reds in a row, the same number of black nodes on every root-to-null path) that force the longest path to be at most twice the shortest, so h ≤ 2 log₂(N + 1). After each insert or delete it restores the rules with recolouring and at most a few <b>rotations</b> (O(1) pointer changes each). That guarantees O(log N) for get, put, remove, floorKey, ceilingKey and friends. AVL trees are stricter (faster lookups, more rotations); B-trees are the disk-friendly cousin used by databases.</p>`,
      followUps: ['When would you choose a hash map over an ordered map?', 'What is a rotation and why does it keep BST order?']
    },
    {
      q: 'Design serialization for a binary tree that may contain duplicate values.', level: 'A',
      a: `<p>I write a preorder traversal with explicit <b>null markers</b>, e.g. <code>1,2,#,#,3,4,#,#,5,#,#</code>. The decoder mirrors the encoder: read a token; <code>#</code> means an empty subtree; otherwise create the node, then recursively read its whole left subtree, then its right. The markers make the shape unambiguous, so duplicates are fine (unlike pre + inorder reconstruction, which needs unique values). Both directions are O(N). For production I would consider a level-order format to avoid recursion depth limits on deep trees, a compact binary encoding (varints) for size, and a version header so the format can evolve.</p>`,
      followUps: ['How would you serialize an N-ary tree?', 'Can a BST be serialized without null markers?']
    },
    {
      q: 'Your tree code works on small tests but crashes in production on large inputs. What do you check?', level: 'E',
      a: `<p>First, <b>recursion depth</b>: real data is often skewed (sorted inserts, linked chains), so recursive DFS can overflow the call stack (<code>StackOverflowError</code>, <code>RecursionError</code>, <code>RangeError</code>); I switch to an explicit stack or BFS, or run the work in a thread with a larger stack. Second, <b>balance</b>: an unbalanced BST turns O(log N) into O(N); I would use the library ordered map (<code>TreeMap</code>, <code>std::map</code>) or a self-balancing tree. Third, <b>memory</b>: BFS on a wide tree holds ~N/2 nodes, and object-per-node trees cost ~24+ bytes each plus poor cache locality — arrays or B-trees may be better. Fourth, <b>numeric overflow</b> in sums or position indices (use long, re-base positions). Finally, I add property-based tests (random trees vs a brute-force oracle) so these cases are caught before production.</p>`,
      followUps: ['How do you test tree code with random inputs?', 'When would you store a tree in an array instead of nodes?']
    }
  );
  registerModule({
    id: 'dsa14',
    title: 'Trees & Binary Search Trees',
    intro: `<p>Trees are everywhere: the <b>folders</b> on your laptop, a <b>family tree</b>, a company <b>org chart</b>, the HTML of every web page, the syntax tree an AI code assistant edits, and the index behind every database query. In this module you will learn to <b>walk</b> a tree in every order (recursively and with your own stack), sweep it <b>level by level</b> with a queue, look at it from the <b>left, right, top and bottom</b>, measure its <b>height and diameter</b>, check whether it is <b>balanced</b>, and find the <b>lowest common ancestor</b> of two nodes.</p>
<p>Then you will master the <b>Binary Search Tree</b>: search and insert in O(h), the three cases of delete, validating a BST with ranges, finding the k-th smallest with an inorder walk, and finally <b>rebuilding a tree</b> from its traversals. Almost every tree problem is one of two moves — <b>recursion that combines the children's answers</b> (DFS, with a stack) or <b>a queue that goes level by level</b> (BFS). Every visualizer shows the tree together with that stack or queue, so you can see exactly why the code works.</p>`,
    goals: [
      'Write preorder, inorder and postorder both recursively and iteratively, and explain what the stack holds at every step',
      'Solve any "level" question (level order, zigzag, left/right/top/bottom views, min depth, width) with BFS and the size snapshot',
      'Use the bottom-up "return one thing, record another" pattern for height, diameter, balance check and max path sum in O(N)',
      'Find the LCA in a binary tree (O(N)) and in a BST (O(h)), and explain the existence assumption and many-query follow-ups',
      'Implement BST search, insert, delete (all three cases), validation, and k-th smallest, and explain why each is O(h)',
      'Rebuild a tree from preorder/postorder + inorder in O(N), and know when a pair of traversals is not enough'
    ],
    prereqs: `<p>DSA 11 (Recursion &amp; Backtracking) for call stacks and recursive thinking, and DSA 13 (Stacks &amp; Queues) for <code>ArrayDeque</code> as a stack and as a queue. DSA 8 (Hashing) helps for the HashMap tricks in views and tree construction.</p>`,
    hours: 16,
    langNotes: {
      java: `<p><b>Java:</b> a recursive tree walk uses one stack frame per level, and the default thread stack holds roughly 10,000 simple frames, so a skewed tree of 10<sup>4</sup>–10<sup>5</sup> nodes throws <code>StackOverflowError</code>. That is why several solutions here use an explicit <code>ArrayDeque</code> stack or a "list parents-first, then walk it backwards" loop (or run recursion in a <code>new Thread(null, task, "big", 1 &lt;&lt; 26)</code>). <code>ArrayDeque</code> refuses <code>null</code>, so check children before pushing (use an <code>ArrayList</code> as the stack when you need null markers, as in the serializer). Compare nodes with <code>==</code> (identity), values with <code>==</code> on <code>int</code>. <code>TreeMap</code> / <code>TreeSet</code> are red-black trees with <code>floorKey</code> / <code>ceilingKey</code> in O(log N). <code>int</code> overflow wraps silently: BST bounds use <code>long</code> (<code>Long.MIN_VALUE</code>) so nodes holding <code>Integer.MIN_VALUE</code> stay valid, and width positions use <code>long</code> plus re-basing.</p>`,
      python: `<p><b>Python:</b> recursion stops at <b>1,000 frames</b> by default (<code>RecursionError</code>), far below the 10<sup>4</sup>–10<sup>5</sup>-deep skewed trees these constraints allow. So most Python solutions here are iterative (a list as the stack, or "reversed preorder = children before parents" with a dict of results); the tree builders raise the limit with <code>sys.setrecursionlimit</code> instead, because their depth is at most n = 3000 (for deeper recursion, also run it in a thread made after <code>threading.stack_size(...)</code>). Use <code>collections.deque</code> for BFS: <code>list.pop(0)</code> is O(n). Compare nodes with <code>is</code> (identity), not <code>==</code>. There is no built-in balanced BST: use <code>bisect</code> on a sorted list (O(n) inserts) or the third-party <code>sortedcontainers.SortedList</code>; for columns, collect into a <code>dict</code> and sort the keys. Integers never overflow, and <code>float('inf')</code> makes clean BST bounds. Join strings once (<code>','.join(parts)</code>) instead of <code>+=</code> in a loop.</p>`,
      js: `<p><b>JavaScript:</b> Node's default call stack fits roughly 10,000 simple frames, then throws <code>RangeError: Maximum call stack size exceeded</code>, so deep-tree solutions here use an array as an explicit stack. For BFS, never <code>shift()</code> (it is O(n)): keep a read index into the array, or build the next level as a new array. <code>sort()</code> compares as strings unless you pass a comparator, so vertical order sorts with <code>(a, b) =&gt; a[0] - b[0] || a[1] - b[1] || a[2] - b[2]</code>. A <code>Map</code> accepts node objects as keys (parent links, results per node) and keeps insertion order but does not sort; there is no built-in ordered set, so use a sorted array with binary search. Compare nodes with <code>===</code>. <code>Number</code> is exact up to 2<sup>53</sup>, which covers every sum here; width positions are re-based each level so they stay small. Use <code>-Infinity</code> / <code>Infinity</code> as BST bounds, and build strings with an array plus <code>join</code>.</p>`,
      cpp: `<p><b>C++:</b> the default stack is about 8 MB, so recursion on a 10<sup>5</sup>-deep chain usually survives but is not guaranteed (bigger frames or sanitizers shrink it); an explicit <code>std::stack</code> or <code>vector</code> is always safe. Nodes are raw pointers: compare them with <code>==</code>, test for <code>nullptr</code>, and remember that whoever <code>new</code>s a node owns it (production code would use <code>unique_ptr</code> or an arena). <code>std::map</code> / <code>std::set</code> are red-black trees (O(log n), sorted keys, <code>lower_bound</code> / <code>upper_bound</code>, <code>prev</code> for floor); <code>unordered_map</code> is O(1) on average but unordered. Signed overflow is undefined behaviour: BST bounds use <code>long long</code> (<code>LLONG_MIN</code>) and width positions use <code>long long</code> with re-basing. Sorting <code>tuple&lt;int, int, int&gt;</code> gives column, row, value order for free.</p>`
    },
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
