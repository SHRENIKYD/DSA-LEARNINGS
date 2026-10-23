(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- doubly linked list visualizer: Java is the main code pane (hl uses its line numbers, one statement per line in every language) ---------- */
  function J(lines) { return lines.join('\n'); }
  var DLL_ALT = {
    rm: {
      python: { code: J(['if node.prev is not None: node.prev.next = node.next', 'else: head = node.next', 'if node.next is not None: node.next.prev = node.prev', 'else: tail = node.prev', 'node.prev = node.next = None']), map: {} },
      js: { code: J(['if (node.prev !== null) node.prev.next = node.next;', 'else head = node.next;', 'if (node.next !== null) node.next.prev = node.prev;', 'else tail = node.prev;', 'node.prev = node.next = null;']), map: {} },
      cpp: { code: J(['if (node->prev != nullptr) node->prev->next = node->next;', 'else head = node->next;', 'if (node->next != nullptr) node->next->prev = node->prev;', 'else tail = node->prev;', 'node->prev = node->next = nullptr;']), map: {} }
    },
    ins: {
      python: { code: J(['node = DNode(x)', 'node.prev = at; node.next = at.next', 'if at.next is not None: at.next.prev = node', 'else: tail = node', 'at.next = node']), map: {} },
      js: { code: J(['const node = new DNode(x);', 'node.prev = at; node.next = at.next;', 'if (at.next !== null) at.next.prev = node;', 'else tail = node;', 'at.next = node;']), map: {} },
      cpp: { code: J(['DNode* node = new DNode(x);', 'node->prev = at; node->next = at->next;', 'if (at->next != nullptr) at->next->prev = node;', 'else tail = node;', 'at->next = node;']), map: {} }
    },
    af: {
      python: { code: J(['node = DNode(x)', 'node.next = head', 'if head is not None: head.prev = node', 'else: tail = node', 'head = node']), map: {} },
      js: { code: J(['const node = new DNode(x);', 'node.next = head;', 'if (head !== null) head.prev = node;', 'else tail = node;', 'head = node;']), map: {} },
      cpp: { code: J(['DNode* node = new DNode(x);', 'node->next = head;', 'if (head != nullptr) head->prev = node;', 'else tail = node;', 'head = node;']), map: {} }
    }
  };

  // ---------- small local helpers (prose + visualizers) ----------
  // chain([1,2,3], {1:'y'}) → "1 → 2 → 3 → null" with colored cells
  function chain(vals, hl, tail) {
    hl = hl || {};
    return '<div><code>' + vals.map(function (v, i) { return hl[i] ? H.c(hl[i], H.esc(v)) : H.esc(v); }).join(' → ') +
      ' → ' + (tail === undefined ? 'null' : tail) + '</code></div>';
  }
  // parse "1 2 3" into numbers, with friendly errors
  function nums(s, max, what) {
    s = String(s === undefined || s === null ? '' : s).trim();
    if (!s) return [];
    var a = s.split(/[\s,]+/).map(Number);
    if (a.some(function (x) { return isNaN(x) || !isFinite(x) || Math.floor(x) !== x; })) throw new Error(what + ': please type whole numbers separated by spaces, e.g. 1 2 3');
    if (a.length > max) throw new Error(what + ': please use at most ' + max + ' numbers so the picture fits on screen');
    return a;
  }
  function obj(k, v) { var o = {}; if (k !== undefined && k !== null && k >= 0) o[k] = v; return o; }
  function addPtr(ptr, i, name) {
    if (i === undefined || i === null || i < 0) return ptr;
    if (ptr[i] === undefined) ptr[i] = name;
    else if (Array.isArray(ptr[i])) ptr[i].push(name);
    else ptr[i] = [ptr[i], name];
    return ptr;
  }
  function seqNext(n) { var nx = []; for (var i = 0; i < n; i++) nx.push(i + 1 < n ? i + 1 : -1); return nx; }

  // =====================================================================
  // TOPIC 1: Singly & Doubly Linked Lists — the basics
  // =====================================================================
  topics.push({
    title: 'Singly & Doubly Linked Lists: Nodes, Insert, Delete, Traversal',
    analogy: `<p>Think of a <b>treasure hunt</b>. You hold the first clue. It does not tell you where everything is — it only says <i>"the next clue is under the sofa"</i>. Under the sofa you find a prize <b>and</b> a note saying <i>"next clue is in the fridge"</i>. You can only move forward one clue at a time, and the last clue says <i>"the end"</i>.</p>
<p>Or think of a <b>train</b>: every coach is hooked to the coach behind it. To add a coach in the middle you unhook two coaches and hook the new one between them — nobody has to shift any other coach. That is a <b>linked list</b>. A <b>doubly</b> linked list is a train where every coach has a hook at <b>both</b> ends, so you can walk forward <b>or</b> backward.</p>`,
    explain: `<h4>1. The node: one coach of the train</h4>
<p>A <b>node</b> is a tiny box with two things inside: a <b>value</b> (the passenger) and a <b>link</b> called <code>next</code> (the hook to the next coach). The list itself only remembers the <b>head</b> (first node). The last node's <code>next</code> is <code>null</code> — "the end".</p>
${chain([10, 20, 30], { 0: 'y' })}
<p>${H.c('y', 'head')} is the node 10. 10 knows where 20 is, 20 knows where 30 is, 30 points to null.</p>
<p>In a <b>doubly linked list (DLL)</b> each node also has <code>prev</code>, a link back to the previous coach: <code>null ← 10 ⇄ 20 ⇄ 30 → null</code>. We usually keep both <b>head</b> and <b>tail</b> pointers.</p>

<h4>2. Traversal: walk the treasure hunt</h4>
<p>Start with <code>curr = head</code>. While <code>curr != null</code>: look at <code>curr.val</code>, then jump <code>curr = curr.next</code>. You visit every node exactly once → <b>O(N)</b>. There is <b>no</b> jumping straight to "the 5th node" like <code>arr[5]</code>; you must walk 5 steps.</p>

<h4>3. Insert</h4>
${H.table(['Where', 'What you do (singly)', 'Cost'], [
  ['At head', 'newNode.next = head; head = newNode', H.c('g', 'O(1)')],
  ['At tail', 'walk to the last node, then last.next = newNode (O(1) if you keep a tail pointer)', 'O(N) / ' + H.c('g', 'O(1) with tail')],
  ['At position p', 'walk to the node <b>just before</b> p (call it prev), then <b>1)</b> newNode.next = prev.next <b>2)</b> prev.next = newNode', 'O(p) walk + O(1) relink']
])}
<p>${H.c('r', 'Order matters!')} If you do step 2 first, <code>prev.next</code> is overwritten and the rest of the chain is lost forever — like unhooking the coaches behind you before hooking them to the new coach. Insert 15 after 10:</p>
${chain([10, 15, 20, 30], { 1: 'g' })}

<h4>4. Delete</h4>
${H.table(['Where', 'What you do (singly)', 'Cost'], [
  ['Head', 'head = head.next', H.c('g', 'O(1)')],
  ['Tail', 'walk to the <b>second-last</b> node, set its next = null', 'O(N) (even with a tail pointer, because you cannot go backward in a singly list)'],
  ['Position p', 'walk to prev (node before p), then prev.next = prev.next.next (skip the victim)', 'O(p)']
])}
<p>Delete 20 from ${H.c('m', '10 → 20 → 30')}: prev = 10, then <code>10.next = 20.next</code> = 30. Node 20 is no longer reachable, so the garbage collector frees it (Java, Python, JS). In C++ nothing is automatic: you <code>delete</code> the node yourself.</p>
${chain([10, 30], { 0: 'y' })}

<h4>5. Doubly linked list: what changes</h4>
<p>Every insert/delete fixes <b>two</b> links per side (<code>next</code> and <code>prev</code>). The big win: if somebody hands you a node, you can delete it in <b>O(1)</b> because it knows its own neighbours: <code>node.prev.next = node.next; node.next.prev = node.prev</code>. Deleting the tail is also O(1): <code>tail = tail.prev; tail.next = null</code>. This is exactly why the LRU cache (last topic) uses a DLL.</p>

<h4>6. Array vs Linked List — when to pick which</h4>
${H.table(['Question', 'Array / ArrayList', 'Linked List'], [
  ['Get the i-th item', H.c('g', 'O(1) — jump straight there'), H.c('r', 'O(i) — walk i steps')],
  ['Insert/delete at the front', H.c('r', 'O(N) — shift everyone right/left'), H.c('g', 'O(1) — change one or two links')],
  ['Insert/delete in the middle (already standing there)', H.c('r', 'O(N) shifting'), H.c('g', 'O(1) relinking')],
  ['Memory', H.c('g', 'compact, one block, cache-friendly'), H.c('r', 'extra link(s) per node, nodes scattered in memory')],
  ['Size', 'fixed (array) or resize by copying (ArrayList)', 'grows one node at a time, no copying'],
  ['Binary search?', H.c('g', 'yes (sorted)'), H.c('r', 'no — no random access')]
])}
<p>Rule of thumb: <b>lots of reading by index → array</b>. <b>Lots of adding/removing at the ends or at a spot you already hold → linked list</b> (queues, LRU caches, undo history, music playlists with prev/next).</p>`,
    clues: [
      'The input is given as <b><code>ListNode head</code></b> → you can only walk forward; there is no <code>length</code> and no index access.',
      '"Insert / delete in <b>O(1)</b>" or "frequent insertions and removals at both ends" → linked list (often doubly linked).',
      '"Given a reference to a node, remove it" → think about which links point <b>into</b> and <b>out of</b> that node.',
      '"Move backward" or "remove from the tail quickly" → you need <code>prev</code> pointers, i.e. a <b>doubly</b> linked list.',
      '"Do it in <b>O(1) extra space</b>" on a list → change links in place instead of copying into an array.',
      'Any time the head might change (insert at front, delete first node) → be ready for the <b>dummy node</b> trick (next topic).'
    ],
    code: [{ lang: 'java', code: `
class SinglyLinkedList {
    // One "coach" of the train: a value plus a hook to the next coach
    static class Node {
        int val;
        Node next;
        Node(int val) { this.val = val; }
    }

    Node head;   // first node (null when the list is empty)
    int size;    // how many nodes we currently have

    // Traversal: start at head, follow next until we fall off the end (null)
    void print() {
        StringBuilder sb = new StringBuilder();
        Node curr = head;
        while (curr != null) {
            sb.append(curr.val).append(" -> ");
            curr = curr.next;              // jump to the next clue
        }
        sb.append("null");
        System.out.println(sb);
    }

    // O(1): new node hooks onto the old head, then becomes the head
    void addFirst(int val) {
        Node node = new Node(val);
        node.next = head;
        head = node;
        size++;
    }

    // O(N) without a tail pointer: walk to the last node and hang the new node after it
    void addLast(int val) {
        Node node = new Node(val);
        if (head == null) { head = node; size++; return; }
        Node curr = head;
        while (curr.next != null) curr = curr.next;   // stop ON the last node
        curr.next = node;
        size++;
    }

    // Insert so that the new node ends up at index pos (0 = new head)
    void insertAt(int pos, int val) {
        if (pos < 0 || pos > size) throw new IndexOutOfBoundsException("bad position " + pos);
        if (pos == 0) { addFirst(val); return; }   // head changes: special case
        Node prev = head;
        for (int i = 0; i < pos - 1; i++) prev = prev.next;   // stop just BEFORE the spot
        Node node = new Node(val);
        node.next = prev.next;   // 1) new node grabs the rest of the chain FIRST
        prev.next = node;        // 2) only then does prev point to the new node
        size++;
    }

    // O(1): just move head one step forward
    void deleteFirst() {
        if (head == null) return;
        head = head.next;
        size--;
    }

    // O(N): we need the SECOND-last node so we can cut its link
    void deleteLast() {
        if (head == null) return;
        if (head.next == null) { head = null; size--; return; }   // only one node
        Node curr = head;
        while (curr.next.next != null) curr = curr.next;
        curr.next = null;
        size--;
    }

    // Delete the node at index pos
    void deleteAt(int pos) {
        if (pos < 0 || pos >= size) throw new IndexOutOfBoundsException("bad position " + pos);
        if (pos == 0) { deleteFirst(); return; }   // head changes: special case
        Node prev = head;
        for (int i = 0; i < pos - 1; i++) prev = prev.next;
        prev.next = prev.next.next;   // skip over the victim; garbage collector frees it
        size--;
    }

    public static void main(String[] args) {
        SinglyLinkedList list = new SinglyLinkedList();
        list.addLast(10);
        list.addLast(30);
        list.addFirst(5);       // 5 -> 10 -> 30
        list.insertAt(2, 20);   // 5 -> 10 -> 20 -> 30
        list.print();
        list.deleteAt(1);       // 5 -> 20 -> 30
        list.deleteLast();      // 5 -> 20
        list.print();
    }
}`,
      alt: [
        { lang: 'python', run: true, code: `class SinglyLinkedList:
    class Node:                            # one "coach": a value plus a hook to the next coach
        __slots__ = ("val", "next")
        def __init__(self, val, nxt=None):
            self.val, self.next = val, nxt

    def __init__(self):
        self.head = None                   # first node (None when the list is empty)
        self.size = 0                      # how many nodes we currently have

    def __str__(self):                     # traversal: follow next until we fall off the end
        parts, curr = [], self.head
        while curr:
            parts.append(str(curr.val))
            curr = curr.next               # jump to the next clue
        return " -> ".join(parts + ["None"])

    def add_first(self, val):              # O(1): new node hooks onto the old head
        self.head = self.Node(val, self.head)
        self.size += 1

    def add_last(self, val):               # O(N) without a tail pointer
        node = self.Node(val)
        if self.head is None:
            self.head = node
        else:
            curr = self.head
            while curr.next:               # stop ON the last node
                curr = curr.next
            curr.next = node
        self.size += 1

    def insert_at(self, pos, val):         # the new node ends up at index pos
        if not 0 <= pos <= self.size:
            raise IndexError(f"bad position {pos}")
        if pos == 0:                       # head changes: special case
            self.add_first(val)
            return
        prev = self.head
        for _ in range(pos - 1):           # stop just BEFORE the spot
            prev = prev.next
        prev.next = self.Node(val, prev.next)   # new node grabs the rest FIRST, then prev points to it
        self.size += 1

    def delete_first(self):                # O(1)
        if self.head:
            self.head = self.head.next
            self.size -= 1

    def delete_last(self):                 # O(N): we need the SECOND-last node
        if self.head is None:
            return
        if self.head.next is None:         # only one node
            self.head = None
        else:
            curr = self.head
            while curr.next.next:
                curr = curr.next
            curr.next = None
        self.size -= 1

    def delete_at(self, pos):
        if not 0 <= pos < self.size:
            raise IndexError(f"bad position {pos}")
        if pos == 0:                       # head changes: special case
            self.delete_first()
            return
        prev = self.head
        for _ in range(pos - 1):
            prev = prev.next
        prev.next = prev.next.next         # skip the victim; Python frees it when nothing points to it
        self.size -= 1

lst = SinglyLinkedList()
lst.add_last(10); lst.add_last(30)
lst.add_first(5)                           # 5 -> 10 -> 30
lst.insert_at(2, 20)                       # 5 -> 10 -> 20 -> 30
print(lst)
lst.delete_at(1)                           # 5 -> 20 -> 30
lst.delete_last()                          # 5 -> 20
print(lst)` },
        { lang: 'js', run: true, code: `class Node {                       // one "coach": a value plus a hook to the next coach
  constructor(val, next = null) { this.val = val; this.next = next; }
}

class SinglyLinkedList {
  constructor() {
    this.head = null;                // first node (null when the list is empty)
    this.size = 0;                   // how many nodes we currently have
  }

  toString() {                       // traversal: follow next until we fall off the end
    const parts = [];
    for (let curr = this.head; curr !== null; curr = curr.next) parts.push(curr.val);
    return parts.concat('null').join(' -> ');
  }

  addFirst(val) {                    // O(1): new node hooks onto the old head
    this.head = new Node(val, this.head);
    this.size++;
  }

  addLast(val) {                     // O(N) without a tail pointer
    const node = new Node(val);
    if (this.head === null) this.head = node;
    else {
      let curr = this.head;
      while (curr.next !== null) curr = curr.next;   // stop ON the last node
      curr.next = node;
    }
    this.size++;
  }

  insertAt(pos, val) {               // the new node ends up at index pos
    if (pos < 0 || pos > this.size) throw new RangeError('bad position ' + pos);
    if (pos === 0) { this.addFirst(val); return; }   // head changes: special case
    let prev = this.head;
    for (let i = 0; i < pos - 1; i++) prev = prev.next;   // stop just BEFORE the spot
    prev.next = new Node(val, prev.next);   // new node grabs the rest FIRST, then prev points to it
    this.size++;
  }

  deleteFirst() {                    // O(1)
    if (this.head === null) return;
    this.head = this.head.next;
    this.size--;
  }

  deleteLast() {                     // O(N): we need the SECOND-last node
    if (this.head === null) return;
    if (this.head.next === null) this.head = null;   // only one node
    else {
      let curr = this.head;
      while (curr.next.next !== null) curr = curr.next;
      curr.next = null;
    }
    this.size--;
  }

  deleteAt(pos) {
    if (pos < 0 || pos >= this.size) throw new RangeError('bad position ' + pos);
    if (pos === 0) { this.deleteFirst(); return; }   // head changes: special case
    let prev = this.head;
    for (let i = 0; i < pos - 1; i++) prev = prev.next;
    prev.next = prev.next.next;      // skip the victim; the garbage collector frees it
    this.size--;
  }
}

const list = new SinglyLinkedList();
list.addLast(10); list.addLast(30);
list.addFirst(5);                    // 5 -> 10 -> 30
list.insertAt(2, 20);                // 5 -> 10 -> 20 -> 30
console.log(String(list));
list.deleteAt(1);                    // 5 -> 20 -> 30
list.deleteLast();                   // 5 -> 20
console.log(String(list));` },
        { lang: 'cpp', code: `class SinglyLinkedList {
    struct Node {                          // one "coach": a value plus a hook to the next coach
        int val;
        Node* next;
        Node(int v, Node* n = nullptr) : val(v), next(n) {}
    };
    Node* head = nullptr;                  // first node (nullptr when the list is empty)
    int size = 0;

public:
    ~SinglyLinkedList() {                  // no garbage collector: free every node
        while (head) deleteFirst();
    }

    void print() const {                   // traversal: follow next until we fall off the end
        for (Node* curr = head; curr; curr = curr->next) cout << curr->val << " -> ";
        cout << "null\\n";
    }

    void addFirst(int val) {               // O(1): new node hooks onto the old head
        head = new Node(val, head);
        size++;
    }

    void addLast(int val) {                // O(N) without a tail pointer
        Node** slot = &head;               // the pointer we will overwrite
        while (*slot) slot = &(*slot)->next;
        *slot = new Node(val);
        size++;
    }

    void insertAt(int pos, int val) {      // the new node ends up at index pos
        if (pos < 0 || pos > size) throw out_of_range("bad position " + to_string(pos));
        if (pos == 0) { addFirst(val); return; }   // head changes: special case
        Node* prev = head;
        for (int i = 0; i < pos - 1; i++) prev = prev->next;   // stop just BEFORE the spot
        prev->next = new Node(val, prev->next);   // grab the rest FIRST, then prev points to it
        size++;
    }

    void deleteFirst() {                   // O(1)
        if (!head) return;
        Node* old = head;
        head = head->next;
        delete old;
        size--;
    }

    void deleteLast() {                    // O(N): we need the SECOND-last node
        if (!head) return;
        if (!head->next) { deleteFirst(); return; }   // only one node
        Node* curr = head;
        while (curr->next->next) curr = curr->next;
        delete curr->next;
        curr->next = nullptr;
        size--;
    }

    void deleteAt(int pos) {
        if (pos < 0 || pos >= size) throw out_of_range("bad position " + to_string(pos));
        if (pos == 0) { deleteFirst(); return; }   // head changes: special case
        Node* prev = head;
        for (int i = 0; i < pos - 1; i++) prev = prev->next;
        Node* victim = prev->next;
        prev->next = victim->next;         // skip the victim...
        delete victim;                     // ...and free it ourselves
        size--;
    }
};

int main() {
    SinglyLinkedList list;
    list.addLast(10); list.addLast(30);
    list.addFirst(5);                      // 5 -> 10 -> 30
    list.insertAt(2, 20);                  // 5 -> 10 -> 20 -> 30
    list.print();
    list.deleteAt(1);                      // 5 -> 20 -> 30
    list.deleteLast();                     // 5 -> 20
    list.print();
}` }
      ] }, { lang: 'java', code: `
class DoublyLinkedList {
    // A coach with hooks on BOTH ends
    static class DNode {
        int val;
        DNode prev, next;
        DNode(int val) { this.val = val; }
    }

    DNode head, tail;   // first and last nodes (both null when empty)
    int size;

    // O(1) at the front
    void addFirst(int val) {
        DNode node = new DNode(val);
        if (head == null) { head = tail = node; }
        else {
            node.next = head;   // new node -> old head
            head.prev = node;   // old head <- new node
            head = node;
        }
        size++;
    }

    // O(1) at the back thanks to the tail pointer
    void addLast(int val) {
        DNode node = new DNode(val);
        if (tail == null) { head = tail = node; }
        else {
            tail.next = node;
            node.prev = tail;
            tail = node;
        }
        size++;
    }

    // Insert a new node right after a node we are already holding: O(1)
    void insertAfter(DNode at, int val) {
        if (at == tail) { addLast(val); return; }
        DNode node = new DNode(val);
        DNode after = at.next;
        node.prev = at;      // fix the new node's two hooks first
        node.next = after;
        at.next = node;      // then the neighbours point to it
        after.prev = node;
        size++;
    }

    // Remove ANY node we are holding in O(1): it knows both neighbours
    void remove(DNode node) {
        if (node.prev != null) node.prev.next = node.next; else head = node.next;
        if (node.next != null) node.next.prev = node.prev; else tail = node.prev;
        node.prev = node.next = null;   // fully unhook it
        size--;
    }

    void removeFirst() { if (head != null) remove(head); }
    void removeLast()  { if (tail != null) remove(tail); }   // O(1), unlike singly lists

    // Walk forward from head, or backward from tail
    String forward() {
        StringBuilder sb = new StringBuilder();
        for (DNode c = head; c != null; c = c.next) sb.append(c.val).append(' ');
        return sb.toString().trim();
    }
    String backward() {
        StringBuilder sb = new StringBuilder();
        for (DNode c = tail; c != null; c = c.prev) sb.append(c.val).append(' ');
        return sb.toString().trim();
    }

    public static void main(String[] args) {
        DoublyLinkedList d = new DoublyLinkedList();
        d.addLast(2); d.addLast(3); d.addFirst(1);   // 1 2 3
        d.insertAfter(d.head, 9);                    // 1 9 2 3
        d.removeLast();                              // 1 9 2
        System.out.println(d.forward() + " | " + d.backward());   // 1 9 2 | 2 9 1
    }
}`,
      alt: [
        { lang: 'python', run: true, code: `class DNode:                               # a coach with hooks on BOTH ends
    __slots__ = ("val", "prev", "next")
    def __init__(self, val):
        self.val, self.prev, self.next = val, None, None

class DoublyLinkedList:
    def __init__(self):
        self.head = self.tail = None           # both None when empty
        self.size = 0

    def add_first(self, val):                  # O(1) at the front
        node = DNode(val)
        if self.head is None:
            self.head = self.tail = node
        else:
            node.next, self.head.prev = self.head, node   # new <-> old head
            self.head = node
        self.size += 1

    def add_last(self, val):                   # O(1) at the back thanks to the tail pointer
        node = DNode(val)
        if self.tail is None:
            self.head = self.tail = node
        else:
            self.tail.next, node.prev = node, self.tail
            self.tail = node
        self.size += 1

    def insert_after(self, at, val):           # O(1) next to a node we already hold
        if at is self.tail:
            self.add_last(val)
            return
        node = DNode(val)
        node.prev, node.next = at, at.next     # the new node's two hooks first
        at.next.prev = node                    # then the neighbours point to it
        at.next = node
        self.size += 1

    def remove(self, node):                    # O(1): the node knows both neighbours
        if node.prev: node.prev.next = node.next
        else:         self.head = node.next
        if node.next: node.next.prev = node.prev
        else:         self.tail = node.prev
        node.prev = node.next = None           # fully unhook it
        self.size -= 1

    def remove_last(self):                     # O(1), unlike singly lists
        if self.tail:
            self.remove(self.tail)

    def forward(self):
        out, c = [], self.head
        while c:
            out.append(c.val); c = c.next
        return out

    def backward(self):
        out, c = [], self.tail
        while c:
            out.append(c.val); c = c.prev
        return out

d = DoublyLinkedList()
d.add_last(2); d.add_last(3); d.add_first(1)   # 1 2 3
d.insert_after(d.head, 9)                       # 1 9 2 3
d.remove_last()                                 # 1 9 2
print(*d.forward(), "|", *d.backward())         # 1 9 2 | 2 9 1` },
        { lang: 'js', run: true, code: `class DNode {                          // a coach with hooks on BOTH ends
  constructor(val) { this.val = val; this.prev = null; this.next = null; }
}

class DoublyLinkedList {
  constructor() { this.head = null; this.tail = null; this.size = 0; }

  addFirst(val) {                      // O(1) at the front
    const node = new DNode(val);
    if (this.head === null) this.head = this.tail = node;
    else {
      node.next = this.head;           // new node -> old head
      this.head.prev = node;           // old head <- new node
      this.head = node;
    }
    this.size++;
  }

  addLast(val) {                       // O(1) at the back thanks to the tail pointer
    const node = new DNode(val);
    if (this.tail === null) this.head = this.tail = node;
    else {
      this.tail.next = node;
      node.prev = this.tail;
      this.tail = node;
    }
    this.size++;
  }

  insertAfter(at, val) {               // O(1) next to a node we already hold
    if (at === this.tail) { this.addLast(val); return; }
    const node = new DNode(val);
    node.prev = at;                    // the new node's two hooks first
    node.next = at.next;
    at.next.prev = node;               // then the neighbours point to it
    at.next = node;
    this.size++;
  }

  remove(node) {                       // O(1): the node knows both neighbours
    if (node.prev !== null) node.prev.next = node.next; else this.head = node.next;
    if (node.next !== null) node.next.prev = node.prev; else this.tail = node.prev;
    node.prev = node.next = null;      // fully unhook it
    this.size--;
  }

  removeLast() { if (this.tail !== null) this.remove(this.tail); }   // O(1), unlike singly lists

  forward() { const out = []; for (let c = this.head; c; c = c.next) out.push(c.val); return out.join(' '); }
  backward() { const out = []; for (let c = this.tail; c; c = c.prev) out.push(c.val); return out.join(' '); }
}

const d = new DoublyLinkedList();
d.addLast(2); d.addLast(3); d.addFirst(1);   // 1 2 3
d.insertAfter(d.head, 9);                    // 1 9 2 3
d.removeLast();                              // 1 9 2
console.log(d.forward() + ' | ' + d.backward());   // 1 9 2 | 2 9 1` },
        { lang: 'cpp', code: `class DoublyLinkedList {
public:
    struct DNode {                             // a coach with hooks on BOTH ends
        int val;
        DNode *prev = nullptr, *next = nullptr;
        DNode(int v) : val(v) {}
    };
    DNode *head = nullptr, *tail = nullptr;    // both nullptr when empty
    int size = 0;

    ~DoublyLinkedList() { while (tail) removeLast(); }   // free every node

    void addFirst(int val) {                   // O(1) at the front
        DNode* node = new DNode(val);
        if (!head) head = tail = node;
        else { node->next = head; head->prev = node; head = node; }
        size++;
    }

    void addLast(int val) {                    // O(1) at the back thanks to the tail pointer
        DNode* node = new DNode(val);
        if (!tail) head = tail = node;
        else { tail->next = node; node->prev = tail; tail = node; }
        size++;
    }

    void insertAfter(DNode* at, int val) {     // O(1) next to a node we already hold
        if (at == tail) { addLast(val); return; }
        DNode* node = new DNode(val);
        node->prev = at;                       // the new node's two hooks first
        node->next = at->next;
        at->next->prev = node;                 // then the neighbours point to it
        at->next = node;
        size++;
    }

    void remove(DNode* node) {                 // O(1): the node knows both neighbours
        (node->prev ? node->prev->next : head) = node->next;
        (node->next ? node->next->prev : tail) = node->prev;
        delete node;                           // unhooked, so free it
        size--;
    }

    void removeLast() { if (tail) remove(tail); }   // O(1), unlike singly lists

    string forward() const { string s; for (DNode* c = head; c; c = c->next) s += to_string(c->val) + " "; return s; }
    string backward() const { string s; for (DNode* c = tail; c; c = c->prev) s += to_string(c->val) + " "; return s; }
};

int main() {
    DoublyLinkedList d;
    d.addLast(2); d.addLast(3); d.addFirst(1);   // 1 2 3
    d.insertAfter(d.head, 9);                    // 1 9 2 3
    d.removeLast();                              // 1 9 2
    cout << d.forward() << "| " << d.backward() << "\\n";   // 1 9 2 | 2 9 1
}` }
      ] }],
    codeTitle: ['Singly linked list from scratch (insert/delete at head, tail, position + traversal)', 'Doubly linked list from scratch (O(1) remove of any node you hold)'],
    after: `<p><b>Common bugs to watch for:</b> (1) forgetting the empty-list case (<code>head == null</code>); (2) relinking in the wrong order and losing the rest of the chain; (3) calling <code>curr.next.next</code> when <code>curr.next</code> might be null → a null-pointer crash (Java <code>NullPointerException</code>, Python <code>AttributeError</code>, JS <code>TypeError</code>, C++ undefined behaviour); (4) in a DLL, fixing <code>next</code> but forgetting <code>prev</code>. The dummy node trick in the next topic removes most "is it the head?" special cases.</p>`
  });

  // =====================================================================
  // TOPIC 2: Dummy node trick (+ Remove Nth Node From End)
  // =====================================================================
  topics.push({
    title: 'The Dummy Node Trick (and Gap Pointers)',
    analogy: `<p>A queue at a ticket counter. If the person at the very front leaves, the "front of the line" changes and everybody has to be told. Now put a <b>fixed signboard</b> saying "LINE STARTS HERE" in front of the first person. The signboard never leaves. Whoever stands right behind the signboard is the real first person. Adding or removing the first person is now just like adding or removing anybody else — you always talk to "the one in front of them", and for the first person that is the signboard.</p>
<p>The <b>dummy node</b> is that signboard: a fake node placed before the real head.</p>`,
    explain: `<p>Most list edits need the node <b>before</b> the spot you want to change (we call it <code>prev</code>). The real head has <b>no</b> node before it, so code normally needs an annoying special case: <i>"if we are deleting/inserting at the head, do something different"</i>.</p>
<p>Fix: create <code>ListNode dummy = new ListNode(0, head)</code>. Now <b>every</b> real node, including the head, has a <code>prev</code>. At the end return <code>dummy.next</code> (the real head, which may have changed).</p>
${chain(['D', 3, 5, 9], { 0: 'p' })}
<p>Delete position 0 (the value 3): prev = ${H.c('p', 'D')}, then <code>D.next = D.next.next</code>:</p>
${chain(['D', 5, 9], { 0: 'p', 1: 'g' })}
<p>Answer = <code>dummy.next</code> = 5. No special case was needed.</p>
${H.table(['Without dummy', 'With dummy'], [
  ['if (pos == 0) { head = head.next; } else { walk to prev; prev.next = prev.next.next; }', 'walk prev from dummy pos steps; prev.next = prev.next.next; return dummy.next;'],
  ['Building a new list: "if result is empty, set head, else attach to tail"', 'tail starts at dummy; always tail.next = node; tail = node']
])}
<h4>Gap pointers (a cousin trick)</h4>
<p>To find the <b>n-th node from the end</b> in one pass, send a <code>fast</code> pointer <b>n+1</b> steps ahead of <code>slow</code> (both starting at the dummy). Then move both together. When fast falls off the end (null), slow is standing <b>just before</b> the node to delete — the perfect <code>prev</code>. It is like two friends holding a rope of fixed length: when the front friend reaches the wall, the back friend is exactly one rope-length away from it.</p>`,
    clues: [
      '"Remove / insert and the <b>head itself might change</b>" → dummy node, return <code>dummy.next</code>.',
      '"<b>Build</b> a new list" (merge, partition, add numbers) → dummy + <code>tail</code> pointer, then just keep appending.',
      '"Remove all nodes with value X", "delete duplicates", "remove n-th node" → dummy so the first node is not a special case.',
      '"n-th from the <b>end</b>" + "in <b>one pass</b>" → two pointers with a fixed gap.',
      'You keep writing <code>if (head == null)</code> or <code>if (prev == null)</code> branches → a dummy usually deletes them.'
    ],
    code: { lang: 'java', code: `
ListNode removeAll(ListNode head, int target) {
    ListNode dummy = new ListNode(0, head);   // signboard in front of the real head
    ListNode prev = dummy;                    // prev always sits BEFORE the node we inspect
    while (prev.next != null) {
        if (prev.next.val == target) {
            prev.next = prev.next.next;       // skip it (works even for the real head)
        } else {
            prev = prev.next;                 // only move forward when we did NOT delete
        }
    }
    return dummy.next;                        // the (possibly new) real head
}`,
      alt: [
        { lang: 'python', code: `def remove_all(head, target):
    dummy = prev = ListNode(0, head)          # signboard in front of the real head
    while prev.next:                          # prev always sits BEFORE the node we inspect
        if prev.next.val == target:
            prev.next = prev.next.next        # skip it (works even for the real head)
        else:
            prev = prev.next                  # only move forward when we did NOT delete
    return dummy.next                         # the (possibly new) real head` },
        { lang: 'js', code: `function removeAll(head, target) {
  const dummy = new ListNode(0, head);      // signboard in front of the real head
  let prev = dummy;                         // prev always sits BEFORE the node we inspect
  while (prev.next !== null) {
    if (prev.next.val === target) prev.next = prev.next.next;   // skip it (even the real head)
    else prev = prev.next;                  // only move forward when we did NOT delete
  }
  return dummy.next;                        // the (possibly new) real head
}` },
        { lang: 'cpp', code: `struct ListNode { int val; ListNode* next; ListNode(int x = 0, ListNode* n = nullptr) : val(x), next(n) {} };

ListNode* removeAll(ListNode* head, int target) {
    ListNode dummy(0, head);                  // signboard in front of the real head (on the stack)
    ListNode* prev = &dummy;                  // prev always sits BEFORE the node we inspect
    while (prev->next) {
        if (prev->next->val == target) {
            ListNode* gone = prev->next;
            prev->next = gone->next;          // skip it (works even for the real head)
            delete gone;
        } else {
            prev = prev->next;                // only move forward when we did NOT delete
        }
    }
    return dummy.next;                        // the (possibly new) real head
}` }
      ] },
    codeTitle: 'Dummy node: remove every node equal to target (no head special case)',
    viz: [{
      title: 'Insert & delete by position with a dummy node',
      input: '3 5 9 | ins 0 1, ins 2 4, del 4, del 0',
      inputLabel: 'list | operations ("ins POS VALUE", "del POS", POS counts from 0)',
      gen: function (input) {
        var halves = String(input === undefined ? '' : input).split('|');
        if (halves.length !== 2) throw new Error('Format: list values | operations, e.g. 3 5 9 | ins 0 1, del 2');
        var vals = nums(halves[0], 10, 'List');
        var ops = halves[1].split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!ops.length) throw new Error('Add at least one operation after the |, e.g. ins 0 7 or del 1');
        if (ops.length > 6) throw new Error('Please use at most 6 operations');
        var frames = [];
        function disp() { return ['D'].concat(vals); }
        frames.push({ narr: 'Start: we put a fake <b>dummy</b> node <b>D</b> in front of the real head. Now even the first real node has a node before it, so inserting or deleting at position 0 works exactly like any other position.', parts: [
          { type: 'list', label: 'dummy + list', values: disp(), hl: { 0: 'sel' } },
          { type: 'text', label: 'Operations to run', html: ops.map(function (o) { return '<code>' + H.esc(o) + '</code>'; }).join(' , ') }
        ] });
        ops.forEach(function (op) {
          var mi = op.match(/^(ins|insert|add)\s+(-?\d+)\s+(-?\d+)$/i);
          var md = op.match(/^(del|delete|remove)\s+(-?\d+)$/i);
          if (!mi && !md) throw new Error('Unknown operation "' + op + '". Use "ins POS VALUE" or "del POS" (POS counts from 0).');
          var pos = Number(mi ? mi[2] : md[2]), s, hl;
          if (mi) {
            var x = Number(mi[3]);
            if (pos < 0 || pos > vals.length || vals.length >= 12) {
              frames.push({ narr: '<span class="c-r">Skip "' + H.esc(op) + '"</span>: position ' + pos + ' is outside 0..' + vals.length + ' (or the list is already 12 long).', parts: [{ type: 'list', label: 'dummy + list', values: disp(), hl: { 0: 'sel' } }] });
              return;
            }
            for (s = 0; s <= pos; s++) {
              frames.push({ narr: s === 0 ? '<b>Insert ' + x + ' at position ' + pos + '</b>. prev starts on the dummy D. We must walk prev ' + pos + ' step(s) so it stands just BEFORE the spot.' : 'prev takes step ' + s + ' of ' + pos + ' (prev = prev.next).', parts: [
                { type: 'list', label: 'dummy + list', values: disp(), ptr: obj(s, 'prev'), hl: (function () { var h = obj(s, 'cur'); if (s !== 0) h[0] = 'sel'; return h; })() },
                { type: 'vars', vals: { op: 'ins ' + pos + ' ' + x, 'steps walked': s } }
              ] });
            }
            var nv = disp(); nv.splice(pos + 1, 0, x);
            var nx = seqNext(nv.length); nx[pos] = pos + 2 < nv.length ? pos + 2 : -1;
            hl = obj(pos + 1, 'ok'); hl[pos] = 'cur';
            frames.push({ narr: 'Link step 1: create node <b>' + x + '</b> and set <code>newNode.next = prev.next</code>. prev still points past it (see the note on prev). We do this FIRST so the rest of the chain is never lost.', parts: [
              { type: 'list', label: 'dummy + list (mid-insert)', values: nv, next: nx, ptr: obj(pos, 'prev'), hl: hl }
            ] });
            vals.splice(pos, 0, x);
            frames.push({ narr: 'Link step 2: <code>prev.next = newNode</code>. The chain is whole again and ' + x + ' sits at position ' + pos + '. ' + (pos === 0 ? 'Notice: it became the new real head, and we did NOT need a special case — the dummy was its prev.' : ''), parts: [
              { type: 'list', label: 'dummy + list', values: disp(), ptr: obj(pos, 'prev'), hl: hl }
            ] });
          } else {
            if (pos < 0 || pos >= vals.length) {
              frames.push({ narr: '<span class="c-r">Skip "' + H.esc(op) + '"</span>: there is no node at position ' + pos + ' (valid: 0..' + (vals.length - 1) + ').', parts: [{ type: 'list', label: 'dummy + list', values: disp(), hl: { 0: 'sel' } }] });
              return;
            }
            for (s = 0; s <= pos; s++) {
              frames.push({ narr: s === 0 ? '<b>Delete position ' + pos + '</b> (value ' + vals[pos] + '). prev starts on the dummy and walks ' + pos + ' step(s) to stand just BEFORE the victim.' : 'prev takes step ' + s + ' of ' + pos + '.', parts: [
                { type: 'list', label: 'dummy + list', values: disp(), ptr: obj(s, 'prev'), hl: (function () { var h = obj(s, 'cur'); h[pos + 1] = 'bad'; return h; })() },
                { type: 'vars', vals: { op: 'del ' + pos, 'steps walked': s } }
              ] });
            }
            var dv = disp(), dn = seqNext(dv.length);
            dn[pos] = pos + 2 < dv.length ? pos + 2 : -1;
            hl = obj(pos + 1, 'bad'); hl[pos] = 'cur';
            frames.push({ narr: '<code>prev.next = prev.next.next</code>: prev now skips over ' + vals[pos] + '. Nobody points to it any more, so the garbage collector frees it (in C++ you would <code>delete</code> it yourself).', parts: [
              { type: 'list', label: 'dummy + list (mid-delete)', values: dv, next: dn, ptr: obj(pos, 'prev'), hl: hl }
            ] });
            vals.splice(pos, 1);
            frames.push({ narr: 'Deleted. ' + (pos === 0 ? 'We removed the real head, yet the code was identical to any other delete — D.next simply points to the new first node.' : 'The list is shorter by one.'), parts: [
              { type: 'list', label: 'dummy + list', values: disp(), ptr: obj(pos, 'prev'), hl: obj(pos, 'cur') }
            ] });
          }
        });
        frames.push({ narr: 'All done. We <b>return dummy.next</b> — the real head, whatever it is now. The dummy itself is never part of the answer.', parts: [
          { type: 'list', label: 'answer = dummy.next', values: vals.length ? vals.slice() : ['(empty)'], hl: obj(0, 'sel') }
        ] });
        return frames;
      }
    }, {
      title: 'Remove N-th node from the end: dummy + gap pointers',
      input: '1 2 3 4 5 | 2',
      inputLabel: 'list | n',
      gen: function (input) {
        var halves = String(input === undefined ? '' : input).split('|');
        if (halves.length !== 2) throw new Error('Format: list values | n, e.g. 1 2 3 4 5 | 2');
        var vals = nums(halves[0], 12, 'List');
        var n = Number(String(halves[1]).trim());
        if (!vals.length) throw new Error('The list needs at least one number');
        if (!(n >= 1 && n <= vals.length && Math.floor(n) === n)) throw new Error('n must be a whole number from 1 to ' + vals.length);
        var L = vals.length, dv = ['D'].concat(vals), fast = 0, slow = 0, frames = [];
        function P() { var p = {}; addPtr(p, slow, 'slow'); if (fast <= L) addPtr(p, fast, 'fast'); return p; }
        function HL() { var h = { 0: 'sel' }; for (var i = slow + 1; i < Math.min(fast, L + 1); i++) h[i] = 'win'; if (fast <= L) h[fast] = 'cur'; return h; }
        frames.push({ narr: 'Goal: remove the <b>' + n + '-th node from the end</b> (value ' + vals[L - n] + ') in ONE pass. Both fast and slow start on the dummy D.', parts: [
          { type: 'list', label: 'dummy + list', values: dv, ptr: P(), hl: { 0: 'sel' } }, { type: 'vars', vals: { n: n, gap: 0 } }] });
        for (var k = 1; k <= n + 1; k++) {
          fast++;
          frames.push({ narr: 'Phase 1: fast moves alone, step ' + k + ' of n+1 = ' + (n + 1) + '. ' + (fast > L ? 'fast fell off the end (null).' : '') + (k === n + 1 ? ' Now there are exactly n = ' + n + ' nodes strictly between slow and fast (blue).' : ''), parts: [
            { type: 'list', label: 'dummy + list', values: dv, ptr: P(), hl: HL() }, { type: 'vars', vals: { n: n, gap: fast - slow, fast: fast > L ? 'null' : dv[fast] } }] });
        }
        while (fast <= L) {
          fast++; slow++;
          frames.push({ narr: 'Phase 2: move <b>both</b> one step. The gap stays ' + (n + 1) + '. ' + (fast > L ? '<b>fast is now null</b> → stop. slow is standing just BEFORE the node to delete.' : 'fast is not null yet, keep going.'), parts: [
            { type: 'list', label: 'dummy + list', values: dv, ptr: P(), hl: HL() }, { type: 'vars', vals: { gap: fast - slow, fast: fast > L ? 'null' : dv[fast], slow: dv[slow] } }] });
        }
        var nx = seqNext(dv.length); nx[slow] = slow + 2 <= L ? slow + 2 : -1;
        var h = obj(slow + 1, 'bad'); h[slow] = 'cur';
        frames.push({ narr: '<code>slow.next = slow.next.next</code> → node ' + dv[slow + 1] + ' is skipped. ' + (slow === 0 ? 'slow was still on the dummy, so we just removed the real head — no special case thanks to D.' : ''), parts: [
          { type: 'list', label: 'dummy + list', values: dv, next: nx, ptr: obj(slow, 'slow'), hl: h }] });
        var res = vals.slice(); res.splice(L - n, 1);
        frames.push({ narr: 'Return <b>dummy.next</b>. The list is now ' + (res.length ? res.join(' → ') : 'empty') + '.', parts: [
          { type: 'list', label: 'answer', values: res.length ? res : ['(empty)'] }] });
        return frames;
      }
    }],
    problems: [{
      title: 'Remove N-th Node From End of List',
      level: 'Medium',
      tags: ['dummy node', 'two pointers', 'gap'],
      statement: `<p>Given the <code>head</code> of a linked list, remove the <b>n-th node from the end</b> and return the head. Try to do it in <b>one pass</b>.</p>`,
      constraints: `1 ≤ size ≤ 30, 0 ≤ Node.val ≤ 100, 1 ≤ n ≤ size`,
      example: `${chain([1, 2, 3, 4, 5], { 3: 'r' })}<p>n = 2 → the 2nd from the end is ${H.c('r', '4')}. Output:</p>${chain([1, 2, 3, 5], { 2: 'g' })}
<p>Edge case: <code>[1]</code>, n = 1 → output is the empty list (we removed the head itself). Another: <code>[1,2]</code>, n = 2 → output <code>[2]</code>.</p>`,
      brute: {
        why: `<p>First pass: count the length L. Second pass: walk to node number L − n − 1 and unlink the next one. It works in O(N), but it walks the list <b>twice</b>, and removing the head (n == L) needs its own <code>if</code>. The interviewer usually asks: "can you do it in one pass without special cases?"</p>`,
        code: {
          lang: 'java',
          code: `
ListNode removeNthFromEnd(ListNode head, int n) {
    int len = 0;
    for (ListNode c = head; c != null; c = c.next) len++;   // pass 1: count
    if (n == len) return head.next;                          // removing the head: special case
    ListNode c = head;
    for (int i = 1; i < len - n; i++) c = c.next;           // pass 2: stop before the victim
    c.next = c.next.next;
    return head;
}`,
          alt: [
            { lang: 'python', code: `def delete_node(node):
    while node.next.next is not None:     # shift every later value one step left
        node.val = node.next.val
        node = node.next
    node.val = node.next.val              # copy the last value
    node.next = None                      # drop the (now duplicate) tail` },
            { lang: 'js', code: `function deleteNode(node) {
  while (node.next.next !== null) {      // shift every later value one step left
    node.val = node.next.val;
    node = node.next;
  }
  node.val = node.next.val;              // copy the last value
  node.next = null;                      // drop the (now duplicate) tail
}` },
            { lang: 'cpp', code: `void deleteNode(ListNode* node) {
    while (node->next->next != nullptr) {   // shift every later value one step left
        node->val = node->next->val;
        node = node->next;
    }
    node->val = node->next->val;            // copy the last value
    node->next = nullptr;                   // drop the (now duplicate) tail
}` }
          ]
        }
      },
      mcq: {
        q: 'Both pointers start at the dummy. How far ahead should <code>fast</code> go before both move together, so that <code>slow</code> ends just before the victim when <code>fast</code> becomes null?',
        options: ['n − 1 steps', 'n steps', 'n + 1 steps', '2n steps'],
        answer: 2,
        explain: 'When fast is null it is "one past the last node". We want slow to be the node BEFORE the n-th from the end, i.e. n + 1 positions behind null. So the gap must be n + 1.'
      },
      hints: [
        `<p>"n-th from the end" = "the node that is n steps behind the end". If two walkers keep a <b>fixed distance</b> and the front one reaches the end, the back one is exactly that distance from the end.</p>`,
        `<p>No extra data structure: one <b>dummy</b> node + two pointers <code>fast</code>, <code>slow</code> starting at the dummy. Move fast n + 1 steps; then move both one step at a time until fast is null.</p>`,
        `<p>Traps: removing the <b>head</b> (n == size) — the dummy handles it because slow simply stays on the dummy; returning <code>head</code> instead of <code>dummy.next</code> would return the deleted node. Recipe: dummy → head; fast = slow = dummy; repeat n+1 times fast = fast.next; while fast != null move both; slow.next = slow.next.next; return dummy.next.</p>`
      ],
      tests: { sig: 'ListNode int -> ListNode', fn: 'removeNthFromEnd', cases: [
        [[[1, 2, 3, 4, 5], 2], [1, 2, 3, 5]],
        [[[1], 1], []],
        [[[1, 2], 2], [2]],
        [[[1, 2], 1], [1]],
        [[[1, 2, 3], 3], [2, 3]],
        [[[0, 100, 0, 100], 4], [100, 0, 100]],
        [[[3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45, 48, 51, 54, 57, 60, 63, 66, 69, 72, 75, 78, 81, 84, 87, 90], 15], [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45, 51, 54, 57, 60, 63, 66, 69, 72, 75, 78, 81, 84, 87, 90]],
        [[[3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45, 48, 51, 54, 57, 60, 63, 66, 69, 72, 75, 78, 81, 84, 87, 90], 1], [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45, 48, 51, 54, 57, 60, 63, 66, 69, 72, 75, 78, 81, 84, 87]]
      ] },
      solution: {
        approach: `<p>Dummy node + a gap of n + 1 between fast and slow. One pass, no special cases.</p>`,
        code: `
class Solution {
    public ListNode removeNthFromEnd(ListNode head, int n) {
        ListNode dummy = new ListNode(0, head);   // signboard before the head
        ListNode fast = dummy, slow = dummy;

        // Phase 1: put fast n+1 steps ahead, so n nodes sit strictly between them
        for (int i = 0; i <= n; i++) {
            fast = fast.next;
        }

        // Phase 2: move both until fast falls off the end
        while (fast != null) {
            fast = fast.next;
            slow = slow.next;
        }

        // slow is just BEFORE the n-th node from the end: skip it
        slow.next = slow.next.next;

        return dummy.next;   // may differ from head if we removed the head
    }
}`,
        alt: [
          { lang: 'python', code: `class Solution:
    def remove_nth_from_end(self, head, n):
        dummy = ListNode(0, head)        # signboard before the head
        fast = slow = dummy
        for _ in range(n + 1):           # phase 1: n nodes sit strictly between them
            fast = fast.next
        while fast:                      # phase 2: move both until fast falls off
            fast, slow = fast.next, slow.next
        slow.next = slow.next.next       # slow is just BEFORE the victim
        return dummy.next                # may differ from head` },
          { lang: 'js', code: `function removeNthFromEnd(head, n) {
  const dummy = new ListNode(0, head);   // signboard before the head
  let fast = dummy, slow = dummy;
  for (let i = 0; i <= n; i++) fast = fast.next;   // phase 1: gap of n + 1
  while (fast !== null) {                // phase 2: move both until fast falls off
    fast = fast.next;
    slow = slow.next;
  }
  slow.next = slow.next.next;            // slow is just BEFORE the victim
  return dummy.next;                     // may differ from head
}` },
          { lang: 'cpp', code: `// LeetCode provides this node type; it is spelled out so the snippet compiles on its own.
struct ListNode {
    int val; ListNode* next;
    ListNode(int x = 0, ListNode* n = nullptr) : val(x), next(n) {}
};

class Solution {
public:
    ListNode* removeNthFromEnd(ListNode* head, int n) {
        ListNode dummy(0, head);              // on the stack: nothing to free
        ListNode* fast = &dummy;
        ListNode* slow = &dummy;
        for (int i = 0; i <= n; i++) fast = fast->next;   // phase 1: gap of n + 1
        while (fast) {                        // phase 2: move both until fast falls off
            fast = fast->next;
            slow = slow->next;
        }
        ListNode* victim = slow->next;        // slow is just BEFORE the victim
        slow->next = victim->next;
        delete victim;
        return dummy.next;                    // may differ from head
    }
};` }
        ],
        dry: {
          head: ['step', 'fast on', 'slow on', 'what happened'],
          rows: [
            ['start', 'D', 'D', 'both on the dummy; list D → 1 → 2 → 3 → 4 → 5, n = 2'],
            ['phase 1 (3 moves)', '3', 'D', 'fast moved n+1 = 3 steps: D → 1 → 2 → 3'],
            ['phase 2 #1', '4', '1', 'fast not null → both move'],
            ['phase 2 #2', '5', '2', 'both move'],
            ['phase 2 #3', 'null', '3', 'fast became null → stop'],
            ['unlink', '—', '3', '<span class="c-r">3.next = 3.next.next</span> → 4 is skipped'],
            ['answer', '—', '—', '<span class="c-g">1 → 2 → 3 → 5</span>']
          ]
        },
        complexity: `<p><b>Time O(N)</b>: fast walks the list exactly once (about N + 1 moves) and slow walks behind it. <b>Space O(1)</b>: just the dummy and two pointers.</p>`
      }
    }]
  });

  // =====================================================================
  // TOPIC 3: Fast & Slow pointers — Middle of the list
  // =====================================================================
  topics.push({
    title: 'Fast & Slow Pointers: Finding the Middle',
    analogy: `<p>Two friends start walking along a straight road from the same gate. The <b>tortoise</b> takes 1 step each second, the <b>hare</b> takes 2 steps each second. When the hare reaches the end of the road, where is the tortoise? Exactly <b>halfway</b> — because it walked half the distance in the same time. You never measured the road!</p>`,
    explain: `<p>A linked list has no length and no index, so "go to the middle" is not free. The slow way: walk once to count N, walk again N/2 steps. The smart way: <b>one walk, two pointers</b>.</p>
<ul><li><code>slow</code> moves <b>1</b> node per round, <code>fast</code> moves <b>2</b> nodes per round.</li>
<li>Keep going while <code>fast != null &amp;&amp; fast.next != null</code> (fast needs two nodes in front of it to jump).</li>
<li>When fast stops, slow is on the middle.</li></ul>
${H.table(['round', 'slow', 'fast', 'list 1 → 2 → 3 → 4 → 5'], [
  ['0', '1', '1', 'both at the head'],
  ['1', '2', '3', 'fast jumped two'],
  ['2', H.c('p', '3'), '5', 'fast.next is null → stop. slow = 3 = middle']
])}
<p><b>Even length</b> (1 → 2 → 3 → 4 → 5 → 6) has two middles, 3 and 4. With the loop above fast ends on <code>null</code> and slow ends on ${H.c('p', '4')} — the <b>second</b> middle. If you need the <b>first</b> middle (useful when you want to cut the list into two halves, as in merge sort), use <code>while (fast.next != null &amp;&amp; fast.next.next != null)</code> instead — slow stops on 3.</p>
${H.table(['Loop condition', 'odd 1..5', 'even 1..6', 'Typical use'], [
  ['fast != null &amp;&amp; fast.next != null', '3', H.c('p', '4 (second middle)'), 'LeetCode "Middle of the Linked List", palindrome check'],
  ['fast.next != null &amp;&amp; fast.next.next != null', '3', H.c('b', '3 (first middle)'), 'split into halves (sort list, reorder list)']
])}
<p>The same "different speeds" idea also detects cycles (next topic): on a loop track, a faster runner eventually laps the slower one.</p>`,
    clues: [
      '"Find the <b>middle</b> node" / "split the list into two halves" → slow (1 step) + fast (2 steps).',
      '"<b>One pass</b>" or "without knowing the length" → two pointers at different speeds.',
      '"Return the <b>second</b> middle if there are two" → loop on <code>fast != null &amp;&amp; fast.next != null</code>.',
      'Problems like <b>palindrome list</b>, <b>reorder list</b>, <b>sort list</b> start with "find the middle" as step 1.',
      '"Does the list have a <b>cycle</b>?" → same tortoise and hare idea (next topic).'
    ],
    viz: {
      title: 'Middle of a list with slow (1 step) and fast (2 steps)',
      input: '1 2 3 4 5 6',
      inputLabel: 'list values',
      gen: function (input) {
        var a = nums(input, 14, 'List');
        if (!a.length) throw new Error('Type at least one number, e.g. 1 2 3 4 5');
        var n = a.length, slow = 0, fast = 0, round = 0, frames = [];
        function P() { var p = {}; addPtr(p, slow, 'slow'); if (fast < n) addPtr(p, fast, 'fast'); return p; }
        frames.push({ narr: 'Rule: slow moves 1 node, fast moves 2 nodes per round. We keep going while fast AND fast.next exist. The list has ' + n + ' nodes, but the code never needs to know that.', parts: [
          { type: 'list', values: a } ] });
        frames.push({ narr: 'Both pointers start on the head (' + a[0] + ').', parts: [
          { type: 'list', values: a, ptr: P(), hl: { 0: 'cur' } }, { type: 'vars', vals: { round: 0, slow: a[slow], fast: a[fast] } }] });
        while (fast < n && fast + 1 < n) {
          slow += 1; fast += 2; round++;
          var h = {}; for (var i = 0; i < slow; i++) h[i] = 'done'; h[slow] = 'cur'; if (fast < n) h[fast] = 'win';
          frames.push({ narr: 'Round ' + round + ': fast had two nodes in front, so slow → ' + a[slow] + ', fast → ' + (fast < n ? a[fast] : '<b>null</b> (fell off the end)') + '. slow has walked ' + slow + ', fast has walked ' + fast + ' — always twice as far.', parts: [
            { type: 'list', values: a, ptr: P(), hl: h }, { type: 'vars', vals: { round: round, slow: a[slow], fast: fast < n ? a[fast] : 'null' } }] });
        }
        var why = fast >= n ? 'fast is <b>null</b> (even length), so it cannot jump' : 'fast is on the last node and fast.next is <b>null</b> (odd length), so it cannot jump';
        frames.push({ narr: 'Stop: ' + why + '. Because fast walked twice as far as slow, slow is at the middle.', parts: [
          { type: 'list', values: a, ptr: P(), hl: obj(slow, 'cur') }] });
        frames.push({ narr: 'Answer: the middle node is <b>' + a[slow] + '</b>' + (n % 2 === 0 ? ' (the <b>second</b> of the two middles ' + a[slow - 1] + ' and ' + a[slow] + ', because the length is even).' : '.') + ' Total rounds: ' + round + ' ≈ N/2.', parts: [
          { type: 'list', values: a, ptr: obj(slow, 'middle'), hl: obj(slow, 'sel') }] });
        return frames;
      }
    },
    problems: [{
      title: 'Middle of the Linked List',
      level: 'Easy',
      tags: ['fast & slow pointers'],
      statement: `<p>Given the <code>head</code> of a singly linked list, return the <b>middle node</b>. If there are two middle nodes, return the <b>second</b> one.</p>`,
      constraints: `1 ≤ number of nodes ≤ 100, 1 ≤ Node.val ≤ 100`,
      example: `${chain([1, 2, 3, 4, 5], { 2: 'p' })}<p>Output: node ${H.c('p', '3')} (two nodes on each side).</p>
${chain([1, 2, 3, 4, 5, 6], { 2: 'b', 3: 'p' })}<p>Output: node ${H.c('p', '4')}. There are two middles (${H.c('b', '3')} and ${H.c('p', '4')}); the problem wants the second.</p>`,
      brute: {
        why: `<p>Walk once to count N, then walk again N/2 steps. It is O(N) but needs <b>two passes</b>. Another naive idea: copy every node into an ArrayList and return <code>list.get(N/2)</code> — one pass but <b>O(N) extra memory</b> just to find one node.</p>`,
        code: {
          lang: 'java',
          code: `
ListNode middleNode(ListNode head) {
    int n = 0;
    for (ListNode c = head; c != null; c = c.next) n++;   // pass 1: count
    ListNode c = head;
    for (int i = 0; i < n / 2; i++) c = c.next;          // pass 2: walk n/2 steps
    return c;
}`,
          alt: [
            { lang: 'python', code: `def remove_nth_from_end(head, n):
    length = 0
    c = head
    while c is not None:
        length += 1                       # pass 1: count
        c = c.next
    if n == length:
        return head.next                  # removing the head: special case
    c = head
    for _ in range(1, length - n):
        c = c.next                        # pass 2: stop before the victim
    c.next = c.next.next
    return head` },
            { lang: 'js', code: `function removeNthFromEnd(head, n) {
  let len = 0;
  for (let c = head; c !== null; c = c.next) len++;   // pass 1: count
  if (n === len) return head.next;                    // removing the head: special case
  let c = head;
  for (let i = 1; i < len - n; i++) c = c.next;       // pass 2: stop before the victim
  c.next = c.next.next;
  return head;
}` },
            { lang: 'cpp', code: `ListNode* removeNthFromEnd(ListNode* head, int n) {
    int len = 0;
    for (ListNode* c = head; c != nullptr; c = c->next) len++;   // pass 1: count
    if (n == len) return head->next;                             // removing the head: special case
    ListNode* c = head;
    for (int i = 1; i < len - n; i++) c = c->next;               // pass 2: stop before the victim
    c->next = c->next->next;
    return head;
}` }
          ]
        }
      },
      mcq: {
        q: 'List 1 → 2 → 3 → 4 (even). With <code>while (fast != null &amp;&amp; fast.next != null)</code>, where does slow stop?',
        options: ['On 2', 'On 3', 'On 4', 'On null'],
        answer: 1,
        explain: 'Round 1: slow 2, fast 3. Round 2: fast.next (4) exists, so slow 3, fast = 4.next = null. Loop ends; slow is on 3 — the second middle of 1,2,3,4.'
      },
      hints: [
        `<p>If one pointer moves twice as fast as another, when the fast one has covered the whole list the slow one has covered <b>half</b> of it.</p>`,
        `<p>Two pointers, both start at <code>head</code>: <code>slow = slow.next</code>, <code>fast = fast.next.next</code> each round. No array, no counting.</p>`,
        `<p>Trap: check <b>both</b> <code>fast != null</code> (even length) and <code>fast.next != null</code> (odd length) before jumping, otherwise you follow a null pointer and crash. Recipe: slow = fast = head; while fast != null and fast.next != null: slow = slow.next, fast = fast.next.next; return slow.</p>`
      ],
      tests: { sig: 'ListNode -> ListNode', fn: 'middleNode', cases: [
        [[[1, 2, 3, 4, 5]], [3, 4, 5]],
        [[[1, 2, 3, 4, 5, 6]], [4, 5, 6]],
        [[[1]], [1]],
        [[[1, 2]], [2]],
        [[[7, 7, 7]], [7, 7]],
        [[[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100]], [51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100]],
        [[[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99]], [50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99]]
      ] },
      solution: {
        approach: `<p>Tortoise and hare: one pass, two pointers, the slow one lands on the middle.</p>`,
        code: `
class Solution {
    public ListNode middleNode(ListNode head) {
        ListNode slow = head, fast = head;
        // fast needs two nodes ahead of it to make a full jump
        while (fast != null && fast.next != null) {
            slow = slow.next;          // 1 step
            fast = fast.next.next;     // 2 steps
        }
        // fast walked 2x as far as slow, so slow is halfway
        return slow;
    }
}`,
        alt: [
          { lang: 'python', code: `class Solution:
    def middle_node(self, head):
        slow = fast = head
        while fast and fast.next:        # fast needs two nodes ahead to jump
            slow = slow.next             # 1 step
            fast = fast.next.next        # 2 steps
        return slow                      # halfway (second middle if even)` },
          { lang: 'js', code: `function middleNode(head) {
  let slow = head, fast = head;
  while (fast !== null && fast.next !== null) {   // fast needs two nodes ahead
    slow = slow.next;            // 1 step
    fast = fast.next.next;       // 2 steps
  }
  return slow;                   // halfway (second middle if even)
}` },
          { lang: 'cpp', code: `// LeetCode provides this node type; it is spelled out so the snippet compiles on its own.
struct ListNode {
    int val; ListNode* next;
    ListNode(int x = 0, ListNode* n = nullptr) : val(x), next(n) {}
};

class Solution {
public:
    ListNode* middleNode(ListNode* head) {
        ListNode* slow = head;
        ListNode* fast = head;
        while (fast && fast->next) {     // fast needs two nodes ahead
            slow = slow->next;           // 1 step
            fast = fast->next->next;     // 2 steps
        }
        return slow;                     // halfway (second middle if even)
    }
};` }
        ],
        dry: {
          head: ['round', 'slow', 'fast', 'fast != null &amp;&amp; fast.next != null?'],
          rows: [
            ['0', '1', '1', 'yes (1.next = 2)'],
            ['1', '2', '3', 'yes (3.next = 4)'],
            ['2', '3', '5', 'yes (5.next = 6)'],
            ['3', '<span class="c-p">4</span>', 'null', 'no → stop, return <span class="c-p">4</span>']
          ]
        },
        complexity: `<p><b>Time O(N)</b>: fast crosses the list once, so there are about N/2 rounds. <b>Space O(1)</b>: just two pointers, no copies.</p>`
      }
    }]
  });

  // =====================================================================
  // TOPIC 4: Floyd's Cycle Detection + cycle start
  // =====================================================================
  topics.push({
    title: 'Floyd\'s Cycle Detection: Is There a Loop, and Where Does It Start?',
    analogy: `<p>Two runners on a track. If the track is a <b>straight road</b>, the fast runner simply reaches the end and stops. If the road leads into a <b>circular stadium track</b>, the fast runner keeps going round and round and will eventually <b>lap</b> the slow runner — they meet. Meeting = there is a loop. Reaching the end = no loop.</p>
<p>In a treasure hunt, a "cycle" means some clue sends you back to an earlier clue: you would walk forever.</p>`,
    explain: `<h4>Part 1 — Detect the cycle</h4>
<p>A <b>cycle</b> means some node's <code>next</code> points back to an earlier node, so walking never reaches null. Start <code>slow</code> and <code>fast</code> at head; slow moves 1, fast moves 2.</p>
<ul><li>If fast hits <code>null</code> → the list ends → ${H.c('g', 'no cycle')}.</li>
<li>If <code>slow == fast</code> (same node object) → ${H.c('r', 'cycle')}.</li></ul>
<p><b>Why must they meet?</b> Once both are inside the loop, every round fast gains exactly <b>1</b> node on slow. The gap shrinks 5, 4, 3, 2, 1, 0 — it can never "jump over" slow, because it closes by one at a time. So they meet within one lap.</p>
${chain([3, 2, 0, -4], { 1: 'p' }, '(back to ' + H.c('p', '2') + ')')}
<h4>Part 2 — Find where the cycle starts</h4>
<p>Name three distances: <b>a</b> = head → cycle start, <b>b</b> = cycle start → meeting point, <b>c</b> = length of the loop.</p>
${H.table(['Who', 'distance walked when they meet'], [
  ['slow', 'a + b'],
  ['fast', 'a + b + k·c (it did k extra full laps)'],
  ['fast walks twice as far', '2(a + b) = a + b + k·c  →  a + b = k·c  →  ' + H.c('p', 'a = k·c − b')]
])}
<p><b>a = k·c − b</b> means: from the meeting point, walking <b>a</b> more steps is the same as walking (k laps) minus b — which lands exactly on the cycle start. So: put one pointer back at <b>head</b>, leave the other at the <b>meeting point</b>, move <b>both 1 step</b> at a time. Where they meet again is the <b>start of the cycle</b>.</p>
<p>Example above: a = 1 (3 → 2), loop 2 → 0 → -4 → 2 has c = 3. Slow and fast meet at -4, so b = 2. Check: a = 1·3 − 2 = 1 ✓. Walk 1 step from head (→ 2) and 1 step from -4 (→ 2): they meet at <b>2</b>.</p>
<p><b>Bonus:</b> loop length c = keep one pointer at the meeting node and count steps until you come back.</p>`,
    clues: [
      '"Does the linked list have a <b>cycle</b>?" / "will this process loop forever?" → Floyd (slow + fast).',
      '"Return the node where the cycle <b>begins</b>" → Floyd phase 2: one pointer from head, one from the meeting point, both 1 step.',
      '"Use <b>O(1) memory</b>" → a HashSet of visited nodes is not allowed; use tortoise and hare.',
      'Hidden cycles: "happy number", "find the duplicate number in an array of n+1 values 1..n" — treat <code>x → f(x)</code> or <code>i → nums[i]</code> as a next pointer.',
      'Compare <b>node references</b> (<code>slow == fast</code>), not values — two different nodes can have the same value.'
    ],
    viz: {
      title: 'Floyd\'s tortoise and hare: detect the loop, then find its start',
      input: '3 2 0 -4 | 1',
      inputLabel: 'list values | index where the tail links back (-1 = no cycle)',
      gen: function (input) {
        var halves = String(input === undefined ? '' : input).split('|');
        if (halves.length !== 2) throw new Error('Format: values | cycle index, e.g. 3 2 0 -4 | 1 (use -1 for no cycle)');
        var a = nums(halves[0], 12, 'List');
        var pos = Number(String(halves[1]).trim());
        if (!a.length) throw new Error('The list needs at least one number');
        if (!(Math.floor(pos) === pos && pos >= -1 && pos < a.length)) throw new Error('Cycle index must be -1 (no cycle) or 0..' + (a.length - 1));
        var n = a.length, frames = [];
        function nx(i) { if (i < 0) return -1; return i + 1 < n ? i + 1 : pos; }
        function L(ptr, hl, label) { var p = { type: 'list', label: label || (pos >= 0 ? 'list (tail links back to index ' + pos + ')' : 'list (no cycle)'), values: a, ptr: ptr, hl: hl || {} }; if (pos >= 0) p.cycleTo = pos; return p; }
        var slow = 0, fast = 0, round = 0, met = -1;
        function P() { var p = {}; addPtr(p, slow, 'slow'); addPtr(p, fast, 'fast'); return p; }
        frames.push({ narr: 'Here is the list. ' + (pos >= 0 ? 'The note on the last node shows where its next pointer goes: back to index ' + pos + '. A normal walk would go round forever.' : 'The last node points to null, so a walk ends.') + ' Floyd only uses two pointers — no "visited" set.', parts: [L({}, pos >= 0 ? obj(pos, 'sel') : {})] });
        frames.push({ narr: 'Phase 1: both pointers start at the head. slow moves 1 node per round, fast moves 2. ' + (pos >= 0 ? 'The last node (' + a[n - 1] + ') links back to ' + a[pos] + ', so there is a loop — let us see Floyd discover it.' : 'There is no loop here; fast should simply run off the end.'), parts: [L(P(), { 0: 'cur' }), { type: 'vars', vals: { round: 0, slow: a[0], fast: a[0] } }] });
        while (round < 60) {
          if (fast === -1 || nx(fast) === -1) {
            frames.push({ narr: 'fast ' + (fast === -1 ? 'is null' : 'is on the last node and fast.next is null') + ' → the road ends. <span class="c-g"><b>No cycle.</b></span>', parts: [L(P(), obj(fast, 'ok')), { type: 'vars', vals: { answer: 'no cycle' } }] });
            frames.push({ narr: 'If there were a loop, fast could never find null — it would circle forever. Finding null proves the list is a straight line. Time O(N), memory O(1).', parts: [L({}, {})] });
            return frames;
          }
          slow = nx(slow); fast = nx(nx(fast)); round++;
          var hh = {}; hh[slow] = 'cur'; hh[fast] = 'win';
          if (slow === fast) { met = slow; hh[slow] = 'bad'; }
          frames.push({ narr: 'Round ' + round + ': slow → ' + a[slow] + ' (index ' + slow + '), fast → ' + (fast >= 0 ? a[fast] + ' (index ' + fast + ')' : 'null') + '. ' + (met >= 0 ? '<span class="c-r"><b>They are on the same node!</b></span> Fast lapped slow, so a cycle exists.' : (pos >= 0 && slow >= pos ? 'Both are inside the loop now; fast gains 1 node on slow every round.' : 'No meeting yet.')), parts: [L(P(), hh), { type: 'vars', vals: { round: round, slow: a[slow], fast: fast >= 0 ? a[fast] : 'null' } }] });
          if (met >= 0) break;
        }
        var p1 = 0, p2 = met, steps = 0;
        function P2() { var p = {}; addPtr(p, p1, 'p1 (from head)'); addPtr(p, p2, 'p2 (from meet)'); return p; }
        frames.push({ narr: 'Phase 2: math says <b>a = k·c − b</b> (distance head→start equals distance meet→start, going round the loop). So put <b>p1 at the head</b> and <b>p2 at the meeting node</b> (' + a[met] + '). Both will now move 1 step at a time.', parts: [L(P2(), (function () { var h = {}; h[met] = 'bad'; h[0] = 'cur'; return h; })()), { type: 'vars', vals: { p1: a[p1], p2: a[p2] } }] });
        while (p1 !== p2 && steps < 30) {
          p1 = nx(p1); p2 = nx(p2); steps++;
          var h2 = {}; h2[p1] = 'cur'; h2[p2] = p1 === p2 ? 'sel' : 'win';
          frames.push({ narr: 'Step ' + steps + ': p1 → ' + a[p1] + ', p2 → ' + a[p2] + '. ' + (p1 === p2 ? '<b>They meet!</b>' : 'Not equal yet, keep stepping together.'), parts: [L(P2(), h2), { type: 'vars', vals: { steps: steps, p1: a[p1], p2: a[p2] } }] });
        }
        frames.push({ narr: 'The cycle starts at index <b>' + p1 + '</b> (value ' + a[p1] + '). Head → start took a = ' + steps + ' step(s), which matches the input. ' + (steps === 0 ? '(a = 0: the whole list is the loop, so they met at the head right away.)' : ''), parts: [L(obj(p1, 'cycle start'), obj(p1, 'sel')), { type: 'vars', vals: { 'cycle start index': p1, value: a[p1], a: steps } }] });
        return frames;
      }
    },
    problems: [{
      title: 'Linked List Cycle (Detect + Find the Start)',
      level: 'Medium',
      tags: ['fast & slow pointers', 'Floyd'],
      statement: `<p>Given the <code>head</code> of a linked list, return the node where the cycle <b>begins</b>. If there is no cycle, return <code>null</code>. (Part 1 of the same problem, "Linked List Cycle", only asks for <code>true/false</code> — that is phase 1 below.) Do not modify the list, and try to use <b>O(1)</b> memory.</p>`,
      constraints: `0 ≤ number of nodes ≤ 10<sup>4</sup>, -10<sup>5</sup> ≤ Node.val ≤ 10<sup>5</sup>, pos is -1 or a valid index (pos is only used to build the test, it is not given to you)`,
      example: `${chain([3, 2, 0, -4], { 1: 'p' }, '(back to index 1)')}<p>pos = 1 → output: the node with value ${H.c('p', '2')}. The tail (-4) links back to it, so walking 3 → 2 → 0 → -4 → 2 → 0 → … never ends, and 2 is the first node you see twice.</p>
<p><code>[1, 2]</code>, pos = -1 → output <b>null</b> (1 → 2 → null, no loop).</p>`,
      brute: {
        why: `<p>Walk the list and store every <b>node</b> in a HashSet. The first node that is already in the set is the cycle start; reaching null means no cycle. It is O(N) time, but needs <b>O(N) extra memory</b> — the follow-up explicitly asks for O(1).</p>`,
        code: {
          lang: 'java',
          code: `
ListNode detectCycle(ListNode head) {
    Set<ListNode> seen = new HashSet<>();
    for (ListNode c = head; c != null; c = c.next) {
        if (!seen.add(c)) return c;   // seen before → this is where the loop begins
    }
    return null;                      // reached the end → no loop
}`,
          alt: [
            { lang: 'python', code: `def middle_node(head):
    n = 0
    c = head
    while c is not None:
        n += 1                            # pass 1: count
        c = c.next
    c = head
    for _ in range(n // 2):
        c = c.next                        # pass 2: walk n/2 steps
    return c` },
            { lang: 'js', code: `function middleNode(head) {
  let n = 0;
  for (let c = head; c !== null; c = c.next) n++;   // pass 1: count
  let c = head;
  for (let i = 0; i < Math.floor(n / 2); i++) c = c.next;   // pass 2: walk n/2 steps
  return c;
}` },
            { lang: 'cpp', code: `ListNode* middleNode(ListNode* head) {
    int n = 0;
    for (ListNode* c = head; c != nullptr; c = c->next) n++;   // pass 1: count
    ListNode* c = head;
    for (int i = 0; i < n / 2; i++) c = c->next;               // pass 2: walk n/2 steps
    return c;
}` }
          ]
        }
      },
      mcq: {
        q: 'Slow and fast have just met inside the loop. What is the next step to find the cycle start?',
        options: ['Return the meeting node — it is always the start', 'Reset slow to head; move slow 1 step and fast 2 steps until they meet', 'Reset one pointer to head; move BOTH 1 step at a time until they meet', 'Count the loop length and return head'],
        answer: 2,
        explain: 'From 2(a+b) = a+b+kc we get a = kc − b: walking a steps from the head and a steps from the meeting point both end on the cycle start, so both must move at the SAME speed (1 step).'
      },
      hints: [
        `<p>On a loop a faster runner always laps a slower one, and with speeds 1 and 2 the gap closes by exactly 1 each round, so they land on the same node. Then: slow walked a+b, fast walked a+b+kc and also 2(a+b) ⇒ <b>a = kc − b</b>.</p>`,
        `<p>Only two pointers (no HashSet). Phase 1: slow 1 step, fast 2 steps until equal or fast hits null. Phase 2: one pointer from head, one from the meeting node, both 1 step until equal.</p>`,
        `<p>Traps: empty list or single node without a loop (check <code>fast != null &amp;&amp; fast.next != null</code>); compare <b>references</b> not values; in phase 2 move at speed 1, not 2; if the loop starts at the head (a = 0) phase 2 returns immediately. Recipe: run phase 1; if no meeting → null; p = head; while p != slow: p = p.next, slow = slow.next; return p.</p>`
      ],
      // The test format cannot describe a cycle, so tests.harness has a test-only cycleInfo builder
      // that builds the list like the judge does (tail -> index pos) and returns
      // [hasCycle ? 1 : 0, index of the node detectCycle returned, or -1].
      tests: { sig: 'int[] int -> int[]', fn: 'cycleInfo', harness: {
        java: "class Check {\n    // build vals with the tail linked back to index pos (-1 = no cycle)\n    static int[] cycleInfo(int[] vals, int pos) {\n        ListNode[] nodes = new ListNode[vals.length];\n        for (int i = 0; i < vals.length; i++) nodes[i] = new ListNode(vals[i]);\n        for (int i = 0; i + 1 < vals.length; i++) nodes[i].next = nodes[i + 1];\n        if (pos >= 0) nodes[vals.length - 1].next = nodes[pos];\n        ListNode head = vals.length > 0 ? nodes[0] : null;\n        Solution s = new Solution();\n        ListNode start = s.detectCycle(head);\n        int idx = -1;\n        for (int i = 0; i < nodes.length; i++) if (nodes[i] == start) idx = i;\n        return new int[]{s.hasCycle(head) ? 1 : 0, idx};\n    }\n}",
        python: "def cycle_info(vals, pos):\n    nodes = [ListNode(v) for v in vals]\n    for a, b in zip(nodes, nodes[1:]):\n        a.next = b\n    if pos >= 0:\n        nodes[-1].next = nodes[pos]\n    head = nodes[0] if nodes else None\n    s = Solution()\n    start = s.detect_cycle(head)\n    return [int(s.has_cycle(head)), next((i for i, n in enumerate(nodes) if n is start), -1)]",
        js: "function cycleInfo(vals, pos) {\n  const nodes = vals.map((v) => new ListNode(v));\n  for (let i = 0; i + 1 < nodes.length; i++) nodes[i].next = nodes[i + 1];\n  if (pos >= 0) nodes[nodes.length - 1].next = nodes[pos];\n  const head = nodes.length ? nodes[0] : null, s = new Solution();\n  const start = s.detectCycle(head);\n  return [s.hasCycle(head) ? 1 : 0, nodes.indexOf(start)];\n}",
        cpp: "vector<int> cycleInfo(vector<int>& vals, int pos) {\n    int n = vals.size();\n    vector<ListNode> nodes(vals.begin(), vals.end());\n    for (int i = 0; i + 1 < n; i++) nodes[i].next = &nodes[i + 1];\n    if (pos >= 0) nodes[n - 1].next = &nodes[pos];\n    ListNode* head = n ? &nodes[0] : nullptr;\n    ListNode* start = detectCycle(head);\n    int idx = -1;\n    for (int i = 0; i < n; i++) if (&nodes[i] == start) idx = i;\n    return {hasCycle(head) ? 1 : 0, idx};\n}"
      }, cases: [
        [[[3, 2, 0, -4], 1], [1, 1]],
        [[[1, 2], 0], [1, 0]],
        [[[1], -1], [0, -1]],
        [[[], -1], [0, -1]],
        [[[1], 0], [1, 0]],
        [[[1, 2], -1], [0, -1]],
        [[[1, 2, 3, 4, 5, 6], 5], [1, 5]],
        [[[5, 5, 5, 5], 2], [1, 2]],
        [[[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 8], [1, 8]],
        [[[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], -1], [0, -1]],
        // 10^4 nodes (largest input)
        [[{ $range: [0, 10000] }, 0], [1, 0]],
        [[{ $range: [0, 10000] }, 9999], [1, 9999]],
        [[{ $range: [0, 10000] }, -1], [0, -1]]
      ] },
      solution: {
        approach: `<p>Floyd: phase 1 detects the loop with speeds 1 and 2; phase 2 uses a = kc − b to walk to the start.</p>`,
        code: `
class Solution {
    // Part 1 (LeetCode 141): just say whether a loop exists
    public boolean hasCycle(ListNode head) {
        ListNode slow = head, fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
            if (slow == fast) return true;   // fast lapped slow
        }
        return false;                         // fast reached the end
    }

    // Part 2 (LeetCode 142): return the node where the loop begins
    public ListNode detectCycle(ListNode head) {
        ListNode slow = head, fast = head;
        // Phase 1: find a meeting point inside the loop (if any)
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
            if (slow == fast) {
                // Phase 2: a = k*c - b, so walking a steps from head and
                // from the meeting point lands both on the cycle start
                ListNode p = head;
                while (p != slow) {
                    p = p.next;
                    slow = slow.next;
                }
                return p;
            }
        }
        return null;   // no cycle
    }
}`,
        alt: [
          { lang: 'python', code: `class Solution:
    def has_cycle(self, head):
        slow = fast = head
        while fast and fast.next:
            slow, fast = slow.next, fast.next.next
            if slow is fast:                 # same node object: fast lapped slow
                return True
        return False                         # fast reached the end

    def detect_cycle(self, head):
        slow = fast = head
        while fast and fast.next:            # phase 1: meet inside the loop
            slow, fast = slow.next, fast.next.next
            if slow is fast:
                p = head                     # phase 2: a = k*c - b
                while p is not slow:
                    p, slow = p.next, slow.next
                return p
        return None                          # no cycle` },
          { lang: 'js', code: `class Solution {
  hasCycle(head) {
    let slow = head, fast = head;
    while (fast !== null && fast.next !== null) {
      slow = slow.next;
      fast = fast.next.next;
      if (slow === fast) return true;      // same node: fast lapped slow
    }
    return false;                          // fast reached the end
  }

  detectCycle(head) {
    let slow = head, fast = head;
    while (fast !== null && fast.next !== null) {   // phase 1: meet inside the loop
      slow = slow.next;
      fast = fast.next.next;
      if (slow === fast) {
        let p = head;                      // phase 2: a = k*c - b
        while (p !== slow) { p = p.next; slow = slow.next; }
        return p;
      }
    }
    return null;                           // no cycle
  }
}` },
          { lang: 'cpp', code: `// LeetCode provides this node type; it is spelled out so the snippet compiles on its own.
struct ListNode {
    int val; ListNode* next;
    ListNode(int x = 0, ListNode* n = nullptr) : val(x), next(n) {}
};

bool hasCycle(ListNode* head) {
    ListNode *slow = head, *fast = head;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) return true;     // same address: fast lapped slow
    }
    return false;                          // fast reached the end
}

ListNode* detectCycle(ListNode* head) {
    ListNode *slow = head, *fast = head;
    while (fast && fast->next) {           // phase 1: meet inside the loop
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) {
            ListNode* p = head;            // phase 2: a = k*c - b
            while (p != slow) { p = p->next; slow = slow->next; }
            return p;
        }
    }
    return nullptr;                        // no cycle
}` }
        ],
        dry: {
          head: ['phase', 'slow', 'fast / p', 'note (list 3 → 2 → 0 → -4 → back to 2)'],
          rows: [
            ['1 start', '3', '3', 'both at head'],
            ['1 round 1', '2', '0', 'not equal'],
            ['1 round 2', '0', '2', 'fast: 0 → -4 → 2'],
            ['1 round 3', '-4', '-4', '<span class="c-r">slow == fast → cycle!</span> meeting node = -4'],
            ['2 start', '-4', 'p = 3', 'p from head, slow stays at meeting node'],
            ['2 step 1', '2', 'p = 2', '<span class="c-p">p == slow → return node 2</span>']
          ]
        },
        complexity: `<p><b>Time O(N)</b>: before entering the loop slow walks a ≤ N steps; inside, fast catches it within one lap (≤ c steps); phase 2 walks a more steps. <b>Space O(1)</b>: only two or three pointers, no visited set.</p>`
      }
    }]
  });

  // =====================================================================
  // TOPIC 5: Reversing a linked list in place (iterative + recursive)
  // =====================================================================
  topics.push({
    title: 'Reversing a Linked List In-Place (Iterative & Recursive)',
    analogy: `<p>A row of people each pointing their right hand at the person in front: A → B → C → D. To reverse the row <b>without anybody moving</b>, walk from the start and ask each person, one at a time, to turn around and point at the person <b>behind</b> them instead. You must remember who was in front <b>before</b> they turn, otherwise you lose track of the rest of the row. That "remember the next person" note is the <code>next</code> variable.</p>`,
    explain: `<p>Reversing does <b>not</b> move values. It flips every arrow: <code>1 → 2 → 3 → null</code> becomes <code>null ← 1 ← 2 ← 3</code>, and 3 is the new head.</p>
<h4>Iterative: three pointers prev / curr / next</h4>
<ol><li><code>prev = null</code> (the new tail will point to null), <code>curr = head</code>.</li>
<li>While <code>curr != null</code>:
<ul><li>${H.c('y', 'next = curr.next')} — save the rest of the list (the note!)</li>
<li>${H.c('r', 'curr.next = prev')} — flip this arrow backwards</li>
<li>${H.c('g', 'prev = curr; curr = next')} — both step forward</li></ul></li>
<li>When curr is null, <code>prev</code> is the new head.</li></ol>
${H.table(['round', 'curr', 'next saved', 'after flip', 'prev', 'curr'], [
  ['1', '1', '2', 'null ← 1    2 → 3 → null', '1', '2'],
  ['2', '2', '3', 'null ← 1 ← 2    3 → null', '2', '3'],
  ['3', '3', 'null', 'null ← 1 ← 2 ← 3', H.c('p', '3'), 'null → stop']
])}
<h4>Recursive: trust the smaller problem</h4>
<p>"Reverse everything after me, then attach myself at the end." For <code>1 → 2 → 3</code>: the call on 1 first reverses <code>2 → 3</code> into <code>3 → 2</code> (and gets back the new head 3). Node 1 still points to 2, and 2 is now the <b>last</b> node of the reversed part. So do <code>head.next.next = head</code> (2 points back to 1) and <code>head.next = null</code> (1 becomes the tail). Return the same new head 3 all the way up.</p>
${H.table(['call', 'what it does on the way back up', 'list now'], [
  ['rev(3)', 'base case: single node, return 3', '3'],
  ['rev(2)', '2.next.next = 2 (3 → 2); 2.next = null', '3 → 2 → null'],
  ['rev(1)', '1.next.next = 1 (2 → 1); 1.next = null', H.c('p', '3 → 2 → 1 → null')]
])}
<p>The recursive version is elegant but uses <b>O(N)</b> call-stack memory (one frame per node) and can overflow for ~10<sup>5</sup> nodes. The iterative version uses <b>O(1)</b>. Interviewers often ask for both.</p>`,
    clues: [
      '"<b>Reverse</b> the list", "return the list backwards" → prev / curr / next.',
      '"<b>In-place</b>" or "O(1) extra space" → flip links, do not copy values into an array/stack.',
      '"Reverse between positions <b>left and right</b>" or "reverse in <b>groups of k</b>" → the same three-pointer loop on a sub-part, plus reconnecting the ends.',
      '"Palindrome list", "reorder list", "add two numbers stored forwards" → reverse the second half (or both lists) as a helper step.',
      '"Can you do it <b>recursively</b> too?" → reverse the rest, then <code>head.next.next = head; head.next = null</code>.'
    ],
    code: [{ lang: 'java', code: `
ListNode reverseIterative(ListNode head) {
    ListNode prev = null;       // the new tail must point to null
    ListNode curr = head;
    while (curr != null) {
        ListNode next = curr.next;   // 1) remember the rest of the list
        curr.next = prev;            // 2) flip this arrow backwards
        prev = curr;                 // 3) prev steps forward
        curr = next;                 //    curr steps forward
    }
    return prev;                     // prev is the old last node = new head
}`,
      alt: [
        { lang: 'python', code: `def reverse_iterative(head):
    prev, curr = None, head          # the new tail must point to None
    while curr:
        nxt = curr.next              # 1) remember the rest of the list
        curr.next = prev             # 2) flip this arrow backwards
        prev, curr = curr, nxt       # 3) both step forward
    return prev                      # prev is the old last node = new head` },
        { lang: 'js', code: `function reverseIterative(head) {
  let prev = null;                   // the new tail must point to null
  let curr = head;
  while (curr !== null) {
    const next = curr.next;          // 1) remember the rest of the list
    curr.next = prev;                // 2) flip this arrow backwards
    prev = curr;                     // 3) prev steps forward
    curr = next;                     //    curr steps forward
  }
  return prev;                       // prev is the old last node = new head
}` },
        { lang: 'cpp', code: `struct ListNode { int val; ListNode* next; ListNode(int x = 0, ListNode* n = nullptr) : val(x), next(n) {} };

ListNode* reverseIterative(ListNode* head) {
    ListNode* prev = nullptr;          // the new tail must point to nullptr
    ListNode* curr = head;
    while (curr) {
        ListNode* next = curr->next;   // 1) remember the rest of the list
        curr->next = prev;             // 2) flip this arrow backwards
        prev = curr;                   // 3) prev steps forward
        curr = next;                   //    curr steps forward
    }
    return prev;                       // prev is the old last node = new head
}` }
      ] }, { lang: 'java', code: `
ListNode reverseRecursive(ListNode head) {
    // Base case: empty list or one node is already reversed
    if (head == null || head.next == null) return head;
    // Reverse everything after head; newHead is the old last node
    ListNode newHead = reverseRecursive(head.next);
    // head.next is now the LAST node of the reversed part: hang head after it
    head.next.next = head;
    head.next = null;            // head becomes the new tail
    return newHead;              // same new head is passed all the way up
}`,
      alt: [
        { lang: 'python', code: `def reverse_recursive(head):
    # Base case: empty list or one node is already reversed
    if head is None or head.next is None:
        return head
    # Reverse everything after head (one stack frame per node: Python stops near 1000)
    new_head = reverse_recursive(head.next)
    head.next.next = head        # hang head after the LAST node of the reversed part
    head.next = None             # head becomes the new tail
    return new_head              # same new head is passed all the way up` },
        { lang: 'js', code: `function reverseRecursive(head) {
  // Base case: empty list or one node is already reversed
  if (head === null || head.next === null) return head;
  // Reverse everything after head; newHead is the old last node
  const newHead = reverseRecursive(head.next);
  head.next.next = head;       // hang head after the LAST node of the reversed part
  head.next = null;            // head becomes the new tail
  return newHead;              // same new head is passed all the way up
}` },
        { lang: 'cpp', code: `struct ListNode { int val; ListNode* next; ListNode(int x = 0, ListNode* n = nullptr) : val(x), next(n) {} };

ListNode* reverseRecursive(ListNode* head) {
    // Base case: empty list or one node is already reversed
    if (!head || !head->next) return head;
    // Reverse everything after head; newHead is the old last node
    ListNode* newHead = reverseRecursive(head->next);
    head->next->next = head;     // hang head after the LAST node of the reversed part
    head->next = nullptr;        // head becomes the new tail
    return newHead;              // same new head is passed all the way up
}` }
      ] }],
    codeTitle: ['Iterative reversal (O(1) space)', 'Recursive reversal (O(N) call stack)'],
    viz: {
      title: 'Iterative reversal: prev / curr / next, one arrow at a time',
      input: '1 2 3 4 5',
      inputLabel: 'list values',
      gen: function (input) {
        var a = nums(input, 12, 'List');
        if (!a.length) throw new Error('Type at least one number, e.g. 1 2 3 4');
        var n = a.length, nx = seqNext(n), prev = -1, curr = 0, round = 0, frames = [];
        function P(nextIdx) { var p = {}; addPtr(p, prev, 'prev'); addPtr(p, curr, 'curr'); if (nextIdx !== undefined) addPtr(p, nextIdx, 'next'); return p; }
        function HL() { var h = {}; for (var i = 0; i < n; i++) if (prev >= 0 && i <= prev) h[i] = 'ok'; if (curr >= 0) h[curr] = 'cur'; return h; }
        frames.push({ narr: 'Start: prev = <b>null</b> (nothing reversed yet), curr = head (' + a[0] + '). Green nodes will be the reversed part.', parts: [
          { type: 'list', values: a, next: nx.slice(), ptr: P(), hl: HL() }, { type: 'vars', vals: { prev: 'null', curr: a[0], next: '-' } }] });
        while (curr !== -1) {
          round++;
          var nextIdx = nx[curr];
          frames.push({ narr: 'Round ' + round + ', step 1: <b>save next = curr.next</b> = ' + (nextIdx >= 0 ? a[nextIdx] : 'null') + '. If we flipped first, we would lose the rest of the list.', parts: [
            { type: 'list', values: a, next: nx.slice(), ptr: P(nextIdx), hl: HL() }, { type: 'vars', vals: { prev: prev >= 0 ? a[prev] : 'null', curr: a[curr], next: nextIdx >= 0 ? a[nextIdx] : 'null' }, hl: { next: 'cur' } }] });
          nx[curr] = prev;
          var h = HL(); h[curr] = 'bad';
          frames.push({ narr: 'Step 2: <b>curr.next = prev</b>. Node ' + a[curr] + ' now points ' + (prev >= 0 ? 'back to ' + a[prev] : 'to null (it will be the new tail)') + '. The link to ' + (nextIdx >= 0 ? a[nextIdx] : 'null') + ' is cut, but we saved it in next.', parts: [
            { type: 'list', values: a, next: nx.slice(), ptr: P(nextIdx), hl: h }, { type: 'vars', vals: { prev: prev >= 0 ? a[prev] : 'null', curr: a[curr], next: nextIdx >= 0 ? a[nextIdx] : 'null' }, hl: { curr: 'bad' } }] });
          prev = curr; curr = nextIdx;
          frames.push({ narr: 'Step 3: <b>prev = curr, curr = next</b>. ' + (curr === -1 ? 'curr is now null → the loop ends.' : 'Reversed part so far ends at ' + a[prev] + '; next we handle ' + a[curr] + '.'), parts: [
            { type: 'list', values: a, next: nx.slice(), ptr: P(), hl: HL() }, { type: 'vars', vals: { prev: a[prev], curr: curr >= 0 ? a[curr] : 'null', next: '-' }, hl: { prev: 'ok' } }] });
        }
        frames.push({ narr: 'Done! <b>prev</b> (' + a[prev] + ') is the new head. Each node was visited once and only its arrow changed — no values moved, O(1) extra memory.', parts: [
          { type: 'list', label: 'arrows after reversal (same memory positions)', values: a, next: nx.slice(), ptr: obj(prev, 'new head'), hl: obj(prev, 'sel') },
          { type: 'list', label: 'read from the new head', values: a.slice().reverse(), hl: { 0: 'sel' } }] });
        return frames;
      }
    },
    problems: [{
      title: 'Reverse Linked List',
      level: 'Easy',
      tags: ['in-place reversal', 'recursion'],
      statement: `<p>Given the <code>head</code> of a singly linked list, reverse the list and return the <b>new head</b>. Follow-up: solve it both <b>iteratively</b> and <b>recursively</b>.</p>`,
      constraints: `0 ≤ number of nodes ≤ 5000, -5000 ≤ Node.val ≤ 5000`,
      example: `${chain([1, 2, 3, 4, 5])}<p>Output:</p>${chain([5, 4, 3, 2, 1], { 0: 'p' })}<p>Every arrow is flipped; the old tail ${H.c('p', '5')} becomes the head. Empty list → empty list. One node → the same node.</p>`,
      brute: {
        why: `<p>Push every value onto a stack (or ArrayList), then walk the list again and overwrite values in popped order. It works in O(N) time but uses <b>O(N) extra memory</b> and changes values instead of links — interviewers want the links rewired in place.</p>`,
        code: {
          lang: 'java',
          code: `
ListNode reverseList(ListNode head) {
    Deque<Integer> stack = new ArrayDeque<>();
    for (ListNode c = head; c != null; c = c.next) stack.push(c.val);   // remember values
    for (ListNode c = head; c != null; c = c.next) c.val = stack.pop(); // write them back reversed
    return head;
}`,
          alt: [
            { lang: 'python', code: `def detect_cycle(head):
    seen = set()
    c = head
    while c is not None:
        if c in seen:
            return c                      # seen before -> this is where the loop begins
        seen.add(c)
        c = c.next
    return None                           # reached the end -> no loop` },
            { lang: 'js', code: `function detectCycle(head) {
  const seen = new Set();
  for (let c = head; c !== null; c = c.next) {
    if (seen.has(c)) return c;      // seen before -> this is where the loop begins
    seen.add(c);
  }
  return null;                      // reached the end -> no loop
}` },
            { lang: 'cpp', code: `ListNode* detectCycle(ListNode* head) {
    unordered_set<ListNode*> seen;
    for (ListNode* c = head; c != nullptr; c = c->next) {
        if (!seen.insert(c).second) return c;   // seen before -> this is where the loop begins
    }
    return nullptr;                             // reached the end -> no loop
}` }
          ]
        }
      },
      mcq: {
        q: 'Inside the loop, what MUST happen before <code>curr.next = prev</code>?',
        options: ['prev = curr', 'Save next = curr.next', 'curr = curr.next', 'Check that prev is not null'],
        answer: 1,
        explain: 'curr.next = prev overwrites the only link to the rest of the list. If you have not saved it in next first, the remaining nodes are lost.'
      },
      hints: [
        `<p>Reversing = every arrow points the other way. Process nodes left to right; the part on your left is already reversed and its head is <code>prev</code>.</p>`,
        `<p>Three pointers: <code>prev</code> (head of reversed part, starts null), <code>curr</code> (node being flipped), <code>next</code> (saved rest of the list). No extra structure needed.</p>`,
        `<p>Traps: return <code>prev</code>, not <code>head</code> (head is now the tail); empty list → loop never runs, prev = null is correct; in recursion don't forget <code>head.next = null</code> or you create a 2-node cycle. Recipe: prev = null, curr = head; while curr: next = curr.next; curr.next = prev; prev = curr; curr = next; return prev.</p>`
      ],
      tests: { sig: 'ListNode -> ListNode', fn: 'reverseList', also: { java: ['reverseListRecursive'] }, cases: [
        [[[1, 2, 3, 4, 5]], [5, 4, 3, 2, 1]],
        [[[]], []],
        [[[1]], [1]],
        [[[1, 2]], [2, 1]],
        [[[-5000, 5000, 0]], [0, 5000, -5000]],
        [[[3, 3, 1]], [1, 3, 3]],
        [[{ $range: [-2500, 2500] }], { $range: [2499, -2501, -1] }]   // 5000 nodes (largest input)
      ] },
      solution: {
        approach: `<p>Iterative prev/curr/next for O(1) space; recursive version included for the follow-up.</p>`,
        code: `
class Solution {
    // Iterative: O(N) time, O(1) space
    public ListNode reverseList(ListNode head) {
        ListNode prev = null, curr = head;
        while (curr != null) {
            ListNode next = curr.next;   // save the rest
            curr.next = prev;            // flip the arrow
            prev = curr;                 // move prev forward
            curr = next;                 // move curr forward
        }
        return prev;                     // new head
    }

    // Recursive: O(N) time, O(N) call stack
    public ListNode reverseListRecursive(ListNode head) {
        if (head == null || head.next == null) return head;   // 0 or 1 node
        ListNode newHead = reverseListRecursive(head.next);   // reverse the rest
        head.next.next = head;   // the node after head now points back to head
        head.next = null;        // head is the new tail
        return newHead;
    }
}`,
        alt: [
          { lang: 'python', code: `class Solution:
    # Iterative: O(N) time, O(1) space
    def reverse_list(self, head):
        prev, curr = None, head
        while curr:
            # right side is evaluated first: save the rest, flip, step forward
            curr.next, prev, curr = prev, curr, curr.next
        return prev                                   # new head

    # Recursive: O(N) call stack, so only for short lists (Python stops near 1000 frames)
    def reverse_list_recursive(self, head):
        if head is None or head.next is None:
            return head
        new_head = self.reverse_list_recursive(head.next)
        head.next.next = head                         # the node after head points back
        head.next = None                              # head is the new tail
        return new_head` },
          { lang: 'js', code: `class Solution {
  // Iterative: O(N) time, O(1) space
  reverseList(head) {
    let prev = null, curr = head;
    while (curr !== null) {
      const next = curr.next;    // save the rest
      curr.next = prev;          // flip the arrow
      prev = curr;               // move prev forward
      curr = next;               // move curr forward
    }
    return prev;                 // new head
  }

  // Recursive: O(N) call stack
  reverseListRecursive(head) {
    if (head === null || head.next === null) return head;
    const newHead = this.reverseListRecursive(head.next);
    head.next.next = head;       // the node after head points back
    head.next = null;            // head is the new tail
    return newHead;
  }
}` },
          { lang: 'cpp', code: `// LeetCode provides this node type; it is spelled out so the snippet compiles on its own.
struct ListNode {
    int val; ListNode* next;
    ListNode(int x = 0, ListNode* n = nullptr) : val(x), next(n) {}
};

class Solution {
public:
    // Iterative: O(N) time, O(1) space
    ListNode* reverseList(ListNode* head) {
        ListNode* prev = nullptr;
        ListNode* curr = head;
        while (curr) {
            ListNode* next = curr->next;   // save the rest
            curr->next = prev;             // flip the arrow
            prev = curr;                   // move prev forward
            curr = next;                   // move curr forward
        }
        return prev;                       // new head
    }

    // Recursive: O(N) call stack
    ListNode* reverseListRecursive(ListNode* head) {
        if (!head || !head->next) return head;
        ListNode* newHead = reverseListRecursive(head->next);
        head->next->next = head;           // the node after head points back
        head->next = nullptr;              // head is the new tail
        return newHead;
    }
};` }
        ],
        dry: {
          head: ['round', 'curr', 'next saved', 'curr.next set to', 'prev after', 'reversed part'],
          rows: [
            ['1', '1', '2', 'null', '1', '1'],
            ['2', '2', '3', '1', '2', '2 → 1'],
            ['3', '3', '4', '2', '3', '3 → 2 → 1'],
            ['4', '4', '5', '3', '4', '4 → 3 → 2 → 1'],
            ['5', '5', 'null', '4', '5', '<span class="c-p">5 → 4 → 3 → 2 → 1</span>'],
            ['end', 'null', '—', '—', '5', 'return prev = <span class="c-p">5</span>']
          ]
        },
        complexity: `<p><b>Time O(N)</b>: each node is visited once and gets one arrow flip. <b>Space O(1)</b> for the iterative version (three pointers). The recursive version is also O(N) time but keeps one stack frame per node → <b>O(N)</b> space.</p>`
      }
    }]
  });

  // =====================================================================
  // TOPIC 6: K-group reversal
  // =====================================================================
  topics.push({
    title: 'Reversing in Groups of K',
    analogy: `<p>A train of 8 coaches must be re-arranged so that every block of <b>3</b> coaches is in reverse order: [1 2 3][4 5 6][7 8] → [3 2 1][6 5 4][7 8]. The yard worker stands at the <b>coupling just before a block</b>, first <b>counts</b> 3 coaches ahead (if fewer than 3 are left, he leaves them alone), turns that block around, re-hooks it to the coach before and the coach after, then walks to the end of the turned block and repeats.</p>`,
    explain: `<p>This is "reverse a linked list" applied to one slice at a time, plus careful <b>re-hooking</b> of both ends. Use a <b>dummy</b> because the first group changes the head.</p>
<p>Name the pieces for one group:</p>
${H.table(['name', 'meaning'], [
  ['groupPrev', 'node just <b>before</b> the group (starts at the dummy)'],
  ['kth', 'the k-th node after groupPrev — the group\'s last node (null if fewer than k remain → stop)'],
  ['groupNext', 'kth.next — the first node <b>after</b> the group'],
  ['oldFirst', 'groupPrev.next — first node of the group, which will become its <b>last</b>']
])}
<p>Steps for each group:</p>
<ol><li>Find <code>kth</code> by walking k steps from groupPrev. If null → fewer than k nodes left → stop (leave them as is).</li>
<li>Reverse the group with prev/curr/next, but start <code>prev = groupNext</code> instead of null. That way the old first node automatically points to the rest of the list after flipping.</li>
<li>Hook the front: <code>groupPrev.next = kth</code> (the new first node of the group).</li>
<li>Move on: <code>groupPrev = oldFirst</code> (it is now the last node of this group, just before the next group).</li></ol>
<p>Example, k = 2: ${H.c('m', 'D → 1 → 2 → 3 → 4 → 5')}</p>
${H.table(['group', 'kth', 'after reversing + hooking', 'groupPrev moves to'], [
  ['[1, 2]', '2', 'D → ' + H.c('g', '2 → 1') + ' → 3 → 4 → 5', '1'],
  ['[3, 4]', '4', 'D → 2 → 1 → ' + H.c('g', '4 → 3') + ' → 5', '3'],
  ['[5]', 'null (only 1 left)', H.c('p', '2 → 1 → 4 → 3 → 5'), 'stop']
])}`,
    clues: [
      '"Reverse the nodes <b>k at a time</b>" / "in groups of size k" → count k ahead, reverse that slice, re-hook both ends.',
      '"If the number of nodes left is <b>less than k, leave them</b>" → check that <code>kth != null</code> before reversing.',
      '"Swap nodes in <b>pairs</b>" → the same algorithm with k = 2.',
      '"Reverse the sublist from position <b>left to right</b>" → one group: walk groupPrev to left−1, reverse right−left+1 nodes.',
      '"Only <b>O(1)</b> extra memory", "must change nodes, not values" → in-place pointer surgery with a dummy, no recursion.'
    ],
    viz: {
      title: 'Reverse nodes in k-groups (dummy D, groupPrev, flipping inside the group)',
      input: '1 2 3 4 5 6 7 8 | 3',
      inputLabel: 'list values | k',
      gen: function (input) {
        var halves = String(input === undefined ? '' : input).split('|');
        if (halves.length !== 2) throw new Error('Format: values | k, e.g. 1 2 3 4 5 | 2');
        var vals = nums(halves[0], 12, 'List');
        var k = Number(String(halves[1]).trim());
        if (!vals.length) throw new Error('The list needs at least one number');
        if (!(Math.floor(k) === k && k >= 1 && k <= vals.length)) throw new Error('k must be a whole number from 1 to ' + vals.length);
        var n = vals.length, disp = ['D'].concat(vals), gp = 0, frames = [], g = 0;
        frames.push({ narr: 'Dummy D sits before the head. groupPrev starts on D. We will reverse each full block of k = ' + k + ' nodes.', parts: [
          { type: 'list', label: 'D + list', values: disp.slice(), ptr: { 0: 'groupPrev' }, hl: { 0: 'sel' } }, { type: 'vars', vals: { k: k, 'groups done': 0 } }] });
        while (true) {
          var avail = n - gp, h = {}, i;
          for (i = gp + 1; i <= Math.min(gp + k, n); i++) h[i] = 'win';
          h[gp] = 'cur';
          if (avail < k) {
            frames.push({ narr: 'Count ahead from groupPrev: only <b>' + avail + '</b> node(s) left, fewer than k = ' + k + '. getKth returns null → <b>stop</b> and leave them in their original order.', parts: [
              { type: 'list', label: 'D + list', values: disp.slice(), ptr: obj(gp, 'groupPrev'), hl: h }, { type: 'vars', vals: { k: k, 'nodes left': avail, 'groups done': g } }] });
            break;
          }
          var s = gp + 1, e = gp + k, groupNext = e + 1 <= n ? e + 1 : -1;
          var ptr = {}; addPtr(ptr, gp, 'groupPrev'); addPtr(ptr, e, 'kth'); if (groupNext >= 0) addPtr(ptr, groupNext, 'groupNext');
          frames.push({ narr: 'Count k = ' + k + ' nodes after groupPrev: the block is <b>' + disp.slice(s, e + 1).join(', ') + '</b> (blue). kth = ' + disp[e] + ', groupNext = ' + (groupNext >= 0 ? disp[groupNext] : 'null') + '.', parts: [
            { type: 'list', label: 'D + list', values: disp.slice(), ptr: ptr, hl: h }, { type: 'vars', vals: { k: k, kth: disp[e], groupNext: groupNext >= 0 ? disp[groupNext] : 'null' } }] });
          var nx = seqNext(disp.length), prev = groupNext;
          for (var j = 0; j < k; j++) {
            var cur = s + j, after = j < k - 1 ? cur + 1 : groupNext;
            nx[cur] = prev;
            var hl2 = {}; for (i = s; i <= e; i++) hl2[i] = i < cur ? 'ok' : (i === cur ? 'bad' : 'win'); hl2[gp] = 'cur';
            var p2 = {}; addPtr(p2, gp, 'groupPrev'); addPtr(p2, cur, 'curr'); if (after >= 0) addPtr(p2, after, 'next');
            frames.push({ narr: 'Flip inside the block: save next = ' + (after >= 0 ? disp[after] : 'null') + ', then <b>' + disp[cur] + '.next = ' + (prev >= 0 ? disp[prev] : 'null') + '</b>' + (j === 0 ? ' — prev started as groupNext, so the old first node already points to what comes after the block.' : '.') + ' Then prev = ' + disp[cur] + '.', parts: [
              { type: 'list', label: 'D + list (block being flipped)', values: disp.slice(), next: nx.slice(), ptr: p2, hl: hl2 }] });
            prev = cur;
          }
          var oldFirst = disp[s];
          var seg = disp.slice(s, e + 1).reverse();
          for (i = 0; i < k; i++) disp[s + i] = seg[i];
          g++;
          var h3 = {}; for (i = s; i <= e; i++) h3[i] = 'ok';
          frames.push({ narr: 'Hook the front: <b>groupPrev.next = kth</b> (' + seg[0] + '). The block now reads ' + seg.join(' → ') + ' and its last node ' + oldFirst + ' already points to ' + (groupNext >= 0 ? disp[groupNext] : 'null') + '.', parts: [
            { type: 'list', label: 'D + list', values: disp.slice(), ptr: obj(gp, 'groupPrev'), hl: h3 }, { type: 'vars', vals: { 'groups done': g } }] });
          gp = e;
          frames.push({ narr: '<b>groupPrev = oldFirst</b> (' + oldFirst + '): it is the last node of the finished block, i.e. the node just before the next block.', parts: [
            { type: 'list', label: 'D + list', values: disp.slice(), ptr: obj(gp, 'groupPrev'), hl: (function () { var hh = {}; for (var q = 1; q <= gp; q++) hh[q] = 'done'; hh[gp] = 'cur'; return hh; })() }] });
          if (gp === n) {
            frames.push({ narr: 'groupPrev is on the last node: nothing is left to count.', parts: [
              { type: 'list', label: 'D + list', values: disp.slice(), ptr: obj(gp, 'groupPrev'), hl: obj(gp, 'cur') }] });
            break;
          }
        }
        frames.push({ narr: 'Answer = <b>dummy.next</b>: ' + disp.slice(1).join(' → ') + '. ' + g + ' full block(s) reversed; every node was visited about twice (once counting, once flipping) → O(N), O(1) extra memory.', parts: [
          { type: 'list', label: 'answer', values: disp.slice(1), hl: { 0: 'sel' } }] });
        return frames;
      }
    },
    problems: [{
      title: 'Reverse Nodes in k-Group',
      level: 'Hard',
      tags: ['in-place reversal', 'dummy node'],
      statement: `<p>Given the <code>head</code> of a linked list, reverse the nodes <b>k at a time</b> and return the modified list. If the number of nodes left at the end is not a multiple of k, those last nodes stay <b>as they are</b>. You may not change node values, only links. Follow-up: O(1) extra memory.</p>`,
      constraints: `1 ≤ k ≤ n ≤ 5000, 0 ≤ Node.val ≤ 1000`,
      example: `${chain([1, 2, 3, 4, 5], { 0: 'b', 1: 'b', 2: 'y', 3: 'y' })}<p>k = 2 → groups ${H.c('b', '[1,2]')}, ${H.c('y', '[3,4]')}, [5] (too short). Output:</p>${chain([2, 1, 4, 3, 5], { 0: 'b', 1: 'b', 2: 'y', 3: 'y' })}
<p>Same list with k = 3 → ${H.c('g', '3 → 2 → 1')} → 4 → 5 (only one full group; 4, 5 stay).</p>`,
      brute: {
        why: `<p>Copy all values into an array, reverse each full block of k inside the array, then write the values back into the nodes. Easy, but it uses <b>O(N) extra memory</b> and changes <b>values</b> — both forbidden by the problem.</p>`,
        code: {
          lang: 'java',
          code: `
ListNode reverseKGroup(ListNode head, int k) {
    List<Integer> vals = new ArrayList<>();
    for (ListNode c = head; c != null; c = c.next) vals.add(c.val);
    for (int start = 0; start + k <= vals.size(); start += k) {
        // reverse vals[start .. start+k-1]
        for (int i = start, j = start + k - 1; i < j; i++, j--) {
            int t = vals.get(i); vals.set(i, vals.get(j)); vals.set(j, t);
        }
    }
    int idx = 0;
    for (ListNode c = head; c != null; c = c.next) c.val = vals.get(idx++);
    return head;
}`,
          alt: [
            { lang: 'python', code: `def reverse_list(head):
    stack = []
    c = head
    while c is not None:
        stack.append(c.val)               # remember values
        c = c.next
    c = head
    while c is not None:
        c.val = stack.pop()               # write them back reversed
        c = c.next
    return head` },
            { lang: 'js', code: `function reverseList(head) {
  const stack = [];
  for (let c = head; c !== null; c = c.next) stack.push(c.val);    // remember values
  for (let c = head; c !== null; c = c.next) c.val = stack.pop();  // write them back reversed
  return head;
}` },
            { lang: 'cpp', code: `ListNode* reverseList(ListNode* head) {
    stack<int> st;
    for (ListNode* c = head; c != nullptr; c = c->next) st.push(c->val);              // remember values
    for (ListNode* c = head; c != nullptr; c = c->next) { c->val = st.top(); st.pop(); }  // write them back reversed
    return head;
}` }
          ]
        }
      },
      mcq: {
        q: 'When reversing one group, why start <code>prev = groupNext</code> instead of <code>prev = null</code>?',
        options: ['It is faster', 'So the old first node (new last node of the group) automatically points to the rest of the list', 'Because groupNext is always null', 'To avoid needing a dummy node'],
        answer: 1,
        explain: 'The first node flipped is the old first node; it gets next = prev. Starting prev at groupNext means it ends up pointing to the next group, so only the FRONT hook (groupPrev.next = kth) is left to fix.'
      },
      hints: [
        `<p>The list is just "reverse a list" done on independent blocks. Each block has 4 important nodes: the one before it, its first, its k-th, and the one after it.</p>`,
        `<p>Use a <b>dummy</b> + <code>groupPrev</code>. Helper <code>getKth(groupPrev, k)</code> walks k steps (returns null if the list ends). Reverse with prev/curr/next where prev starts at <code>groupNext = kth.next</code> and the loop runs while <code>curr != groupNext</code>.</p>`,
        `<p>Traps: stop when kth is null (do not reverse the short tail); remember <code>oldFirst = groupPrev.next</code> <b>before</b> rewiring; return <code>dummy.next</code>. Recipe: loop { kth = getKth(groupPrev,k); if null break; groupNext = kth.next; reverse from groupPrev.next until groupNext with prev = groupNext; oldFirst = groupPrev.next; groupPrev.next = kth; groupPrev = oldFirst; }.</p>`
      ],
      tests: { sig: 'ListNode int -> ListNode', fn: 'reverseKGroup', cases: [
        [[[1, 2, 3, 4, 5], 2], [2, 1, 4, 3, 5]],
        [[[1, 2, 3, 4, 5], 3], [3, 2, 1, 4, 5]],
        [[[1, 2, 3, 4, 5], 1], [1, 2, 3, 4, 5]],
        [[[1, 2, 3, 4, 5], 5], [5, 4, 3, 2, 1]],
        [[[1], 1], [1]],
        [[[1, 2, 3, 4, 5, 6, 7, 8], 3], [3, 2, 1, 6, 5, 4, 7, 8]],
        [[[1, 2, 3, 4, 5, 6], 2], [2, 1, 4, 3, 6, 5]],
        [[[1, 2], 2], [2, 1]],
        [[[0, 1000, 0, 1000, 7], 4], [1000, 0, 1000, 0, 7]],
        // n = 5000 (largest input): values 0..999 five times
        [[{ $concat: [{ $range: [0, 1000] }, { $range: [0, 1000] }, { $range: [0, 1000] }, { $range: [0, 1000] }, { $range: [0, 1000] }] }, 5000], { $concat: [{ $range: [999, -1, -1] }, { $range: [999, -1, -1] }, { $range: [999, -1, -1] }, { $range: [999, -1, -1] }, { $range: [999, -1, -1] }] }],
        [[{ $concat: [{ $range: [0, 1000] }, { $range: [0, 1000] }, { $range: [0, 1000] }, { $range: [0, 1000] }, { $range: [0, 1000] }] }, 1000], { $concat: [{ $range: [999, -1, -1] }, { $range: [999, -1, -1] }, { $range: [999, -1, -1] }, { $range: [999, -1, -1] }, { $range: [999, -1, -1] }] }],
        [[{ $concat: [{ $range: [0, 1000] }, { $range: [0, 1000] }, { $range: [0, 1000] }, { $range: [0, 1000] }, { $range: [0, 1000] }] }, 2500], { $concat: [{ $range: [499, -1, -1] }, { $range: [999, -1, -1] }, { $range: [999, -1, -1] }, { $range: [999, -1, -1] }, { $range: [999, -1, -1] }, { $range: [999, 499, -1] }] }],
        [[{ $concat: [{ $range: [0, 1000] }, { $range: [0, 1000] }, { $range: [0, 1000] }, { $range: [0, 1000] }, { $range: [0, 1000] }] }, 1], { $concat: [{ $range: [0, 1000] }, { $range: [0, 1000] }, { $range: [0, 1000] }, { $range: [0, 1000] }, { $range: [0, 1000] }] }]
      ] },
      solution: {
        approach: `<p>Dummy + groupPrev; for each full block: find kth, reverse the block in place with prev starting at groupNext, hook groupPrev to kth, jump groupPrev to the old first node.</p>`,
        code: `
class Solution {
    public ListNode reverseKGroup(ListNode head, int k) {
        ListNode dummy = new ListNode(0, head);
        ListNode groupPrev = dummy;              // node just before the current group

        while (true) {
            ListNode kth = getKth(groupPrev, k);  // last node of this group
            if (kth == null) break;               // fewer than k nodes left: leave them
            ListNode groupNext = kth.next;        // first node after the group

            // Reverse the group. prev starts at groupNext so the old first
            // node ends up pointing to the rest of the list automatically.
            ListNode prev = groupNext, curr = groupPrev.next;
            while (curr != groupNext) {
                ListNode next = curr.next;
                curr.next = prev;
                prev = curr;
                curr = next;
            }

            ListNode oldFirst = groupPrev.next;   // now the LAST node of the group
            groupPrev.next = kth;                 // hook the front to the new first node
            groupPrev = oldFirst;                 // step to just before the next group
        }
        return dummy.next;
    }

    // Walk k steps from node; null means the list ran out first
    private ListNode getKth(ListNode node, int k) {
        while (node != null && k > 0) {
            node = node.next;
            k--;
        }
        return node;
    }
}`,
        alt: [
          { lang: 'python', code: `class Solution:
    def reverse_k_group(self, head, k):
        dummy = ListNode(0, head)
        group_prev = dummy                       # node just before the current group
        while True:
            kth = self._get_kth(group_prev, k)   # last node of this group
            if kth is None:                      # fewer than k nodes left: leave them
                break
            group_next = kth.next                # first node after the group
            prev, curr = group_next, group_prev.next
            while curr is not group_next:        # flip; old first ends up -> group_next
                curr.next, prev, curr = prev, curr, curr.next
            old_first = group_prev.next          # now the LAST node of the group
            group_prev.next = kth                # hook the front
            group_prev = old_first               # step to just before the next group
        return dummy.next

    @staticmethod
    def _get_kth(node, k):
        while node and k > 0:                    # None means the list ran out first
            node, k = node.next, k - 1
        return node` },
          { lang: 'js', code: `function reverseKGroup(head, k) {
  const dummy = new ListNode(0, head);
  let groupPrev = dummy;                     // node just before the current group
  while (true) {
    let kth = groupPrev;
    for (let i = 0; i < k && kth !== null; i++) kth = kth.next;   // last node of the group
    if (kth === null) break;                 // fewer than k nodes left: leave them
    const groupNext = kth.next;              // first node after the group
    let prev = groupNext, curr = groupPrev.next;
    while (curr !== groupNext) {             // flip; old first ends up -> groupNext
      const next = curr.next;
      curr.next = prev;
      prev = curr;
      curr = next;
    }
    const oldFirst = groupPrev.next;         // now the LAST node of the group
    groupPrev.next = kth;                    // hook the front
    groupPrev = oldFirst;                    // step to just before the next group
  }
  return dummy.next;
}` },
          { lang: 'cpp', code: `// LeetCode provides this node type; it is spelled out so the snippet compiles on its own.
struct ListNode {
    int val; ListNode* next;
    ListNode(int x = 0, ListNode* n = nullptr) : val(x), next(n) {}
};

class Solution {
public:
    ListNode* reverseKGroup(ListNode* head, int k) {
        ListNode dummy(0, head);
        ListNode* groupPrev = &dummy;            // node just before the current group
        while (true) {
            ListNode* kth = getKth(groupPrev, k);   // last node of this group
            if (!kth) break;                     // fewer than k nodes left: leave them
            ListNode* groupNext = kth->next;     // first node after the group
            ListNode* prev = groupNext;
            ListNode* curr = groupPrev->next;
            while (curr != groupNext) {          // flip; old first ends up -> groupNext
                ListNode* next = curr->next;
                curr->next = prev;
                prev = curr;
                curr = next;
            }
            ListNode* oldFirst = groupPrev->next;   // now the LAST node of the group
            groupPrev->next = kth;               // hook the front
            groupPrev = oldFirst;                // step to just before the next group
        }
        return dummy.next;
    }

private:
    static ListNode* getKth(ListNode* node, int k) {
        while (node && k-- > 0) node = node->next;   // nullptr: the list ran out first
        return node;
    }
};` }
        ],
        dry: {
          head: ['group', 'groupPrev', 'kth', 'groupNext', 'list after hooking', 'groupPrev →'],
          rows: [
            ['1', 'D', '2', '3', 'D → <span class="c-g">2 → 1</span> → 3 → 4 → 5', '1'],
            ['2', '1', '4', '5', 'D → 2 → 1 → <span class="c-g">4 → 3</span> → 5', '3'],
            ['3', '3', 'null (only 5 left)', '—', 'stop', '—'],
            ['answer', '—', '—', '—', '<span class="c-p">2 → 1 → 4 → 3 → 5</span>', '—']
          ]
        },
        complexity: `<p><b>Time O(N)</b>: every node is walked once by getKth and once while flipping → about 2N steps. <b>Space O(1)</b>: a few pointers and one dummy node, no recursion.</p>`
      }
    }]
  });

  // =====================================================================
  // TOPIC 7: Merge two sorted lists
  // =====================================================================
  topics.push({
    title: 'Merge Two Sorted Lists',
    analogy: `<p>Two queues of students, each already lined up from shortest to tallest, must become <b>one</b> line sorted by height. A teacher stands at the front of both queues, compares the <b>two front students</b>, sends the shorter one to the new line, and repeats. When one queue is empty, the whole other queue just walks over as it is — it is already sorted.</p>`,
    explain: `<p>Because both lists are already sorted, the smallest remaining value is always at one of the two <b>fronts</b>. So we only ever compare two nodes.</p>
<ol><li>Make a <b>dummy</b> node and a <code>tail</code> pointer on it (the new list is built after the dummy — no "is the result empty?" check).</li>
<li>While both lists have nodes: attach the smaller front to <code>tail.next</code>, move that list forward, move <code>tail</code> forward.</li>
<li>One list ran out → <code>tail.next = whichever list is left</code> (one link, no loop needed).</li>
<li>Return <code>dummy.next</code>.</li></ol>
${H.table(['l1 front', 'l2 front', 'take', 'merged so far'], [
  ['1', '1', 'l1 (tie → l1, keeps it stable)', '1'],
  ['2', '1', 'l2', '1 → 1'],
  ['2', '3', 'l1', '1 → 1 → 2'],
  ['4', '3', 'l2', '1 → 1 → 2 → 3'],
  ['4', '4', 'l1', '1 → 1 → 2 → 3 → 4'],
  ['null', '4', 'attach rest of l2', H.c('p', '1 → 1 → 2 → 3 → 4 → 4')]
])}
<p>No new nodes are created — we only re-hook existing nodes, so extra memory is O(1).</p>
<p><b>Recursive version:</b> "the merged list starts with the smaller head, followed by the merge of everything else": if <code>l1.val &lt;= l2.val</code> then <code>l1.next = merge(l1.next, l2)</code> and return l1, else the mirror. Short and pretty, but uses O(N + M) stack frames.</p>
<p>This merge step is the heart of <b>merge sort on lists</b> (Sort List) and of <b>merge k sorted lists</b> (with a min-heap or pairwise merging).</p>`,
    clues: [
      '"Two <b>sorted</b> lists → one sorted list" → compare the fronts, dummy + tail.',
      '"The list should be made by <b>splicing</b> together the nodes" → re-hook nodes, do not create new ones.',
      '"Sort a linked list in O(N log N)" → split at the middle + this merge (merge sort).',
      '"Merge <b>k</b> sorted lists" → same compare-the-fronts idea with a min-heap of k fronts, or merge pairs.',
      'Building any result list node by node → dummy + tail avoids the empty-result special case.'
    ],
    code: { lang: 'java', code: `
ListNode mergeRecursive(ListNode l1, ListNode l2) {
    if (l1 == null) return l2;          // nothing left in l1: the rest is l2
    if (l2 == null) return l1;
    if (l1.val <= l2.val) {
        l1.next = mergeRecursive(l1.next, l2);   // l1 is smallest; merge the rest after it
        return l1;
    } else {
        l2.next = mergeRecursive(l1, l2.next);
        return l2;
    }
}`,
      alt: [
        { lang: 'python', code: `def merge_recursive(l1, l2):
    if l1 is None:                      # nothing left in l1: the rest is l2
        return l2
    if l2 is None:
        return l1
    if l1.val <= l2.val:
        l1.next = merge_recursive(l1.next, l2)   # l1 is smallest; merge the rest after it
        return l1
    l2.next = merge_recursive(l1, l2.next)
    return l2` },
        { lang: 'js', code: `function mergeRecursive(l1, l2) {
  if (l1 === null) return l2;         // nothing left in l1: the rest is l2
  if (l2 === null) return l1;
  if (l1.val <= l2.val) {
    l1.next = mergeRecursive(l1.next, l2);   // l1 is smallest; merge the rest after it
    return l1;
  }
  l2.next = mergeRecursive(l1, l2.next);
  return l2;
}` },
        { lang: 'cpp', code: `struct ListNode { int val; ListNode* next; ListNode(int x = 0, ListNode* n = nullptr) : val(x), next(n) {} };

ListNode* mergeRecursive(ListNode* l1, ListNode* l2) {
    if (!l1) return l2;                 // nothing left in l1: the rest is l2
    if (!l2) return l1;
    if (l1->val <= l2->val) {
        l1->next = mergeRecursive(l1->next, l2);   // l1 is smallest; merge the rest after it
        return l1;
    }
    l2->next = mergeRecursive(l1, l2->next);
    return l2;
}` }
      ] },
    codeTitle: 'Recursive merge (O(N + M) call stack)',
    viz: {
      title: 'Merging two sorted lists with a dummy + tail',
      input: '1 2 4 | 1 3 4',
      inputLabel: 'list 1 | list 2 (both sorted)',
      gen: function (input) {
        var halves = String(input === undefined ? '' : input).split('|');
        if (halves.length !== 2) throw new Error('Format: list1 | list2, e.g. 1 2 4 | 1 3 4');
        var a = nums(halves[0], 8, 'List 1'), b = nums(halves[1], 8, 'List 2');
        if (!a.length && !b.length) throw new Error('At least one list must have numbers');
        function sorted(x) { for (var q = 1; q < x.length; q++) if (x[q] < x[q - 1]) return false; return true; }
        if (!sorted(a) || !sorted(b)) throw new Error('Both lists must already be sorted from small to large');
        var i = 0, j = 0, res = [], frames = [];
        function A(extra) { var h = {}; for (var q = 0; q < i; q++) h[q] = 'done'; if (i < a.length) h[i] = extra || 'cur'; return { type: 'list', label: 'l1', values: a.length ? a : ['(empty)'], ptr: a.length ? obj(i < a.length ? i : -1, 'l1') : {}, hl: a.length ? h : {} }; }
        function B(extra) { var h = {}; for (var q = 0; q < j; q++) h[q] = 'done'; if (j < b.length) h[j] = extra || 'cur'; return { type: 'list', label: 'l2', values: b.length ? b : ['(empty)'], ptr: b.length ? obj(j < b.length ? j : -1, 'l2') : {}, hl: b.length ? h : {} }; }
        function R(hlLast) { var v = ['D'].concat(res); var h = { 0: 'sel' }; if (hlLast && res.length) h[res.length] = 'ok'; return { type: 'list', label: 'merged (after dummy D)', values: v, ptr: obj(v.length - 1, 'tail'), hl: h }; }
        frames.push({ narr: 'Two lists, each already sorted. Key idea: the smallest value not yet used is always at the <b>front</b> of l1 or the front of l2 — so we only ever compare two nodes.', parts: [A(), B()] });
        frames.push({ narr: 'Start: make a dummy node D and point <b>tail</b> at it. The merged list will grow after D. l1 and l2 point to the fronts of the two sorted lists.', parts: [A(), B(), R(false)] });
        while (i < a.length && j < b.length) {
          var takeA = a[i] <= b[j];
          frames.push({ narr: 'Compare the fronts: l1 = ' + a[i] + ', l2 = ' + b[j] + '. ' + (a[i] === b[j] ? 'Tie → take from l1 (keeps equal values in their original order).' : 'The smaller is <b>' + Math.min(a[i], b[j]) + '</b> (from ' + (takeA ? 'l1' : 'l2') + ').'), parts: [A(takeA ? 'ok' : 'cur'), B(takeA ? 'cur' : 'ok'), R(false)] });
          if (takeA) { res.push(a[i]); i++; } else { res.push(b[j]); j++; }
          frames.push({ narr: '<code>tail.next = ' + (takeA ? 'l1' : 'l2') + '</code>, then move ' + (takeA ? 'l1' : 'l2') + ' forward and <code>tail = tail.next</code>. Merged so far: ' + res.join(' → ') + '.', parts: [A(), B(), R(true)] });
        }
        var restFromA = i < a.length, rest = restFromA ? a.slice(i) : b.slice(j);
        frames.push({ narr: (rest.length ? (restFromA ? 'l2' : 'l1') + ' is empty. The rest of ' + (restFromA ? 'l1' : 'l2') + ' (' + rest.join(', ') + ') is already sorted, so <b>one link</b> does it: <code>tail.next = ' + (restFromA ? 'l1' : 'l2') + '</code>.' : 'Both lists are used up at the same time; tail.next stays null.'), parts: [A(), B(), R(false)] });
        res = res.concat(rest); i = a.length; j = b.length;
        var fh = {}; for (var q = 0; q < res.length; q++) fh[q] = q >= res.length - rest.length ? 'ok' : 'sel';
        frames.push({ narr: 'Return <b>dummy.next</b>: ' + res.join(' → ') + '. Every node was attached exactly once → O(N + M) time, O(1) extra memory (only D and tail).', parts: [
          { type: 'list', label: 'answer = dummy.next', values: res, hl: fh }] });
        return frames;
      }
    },
    problems: [{
      title: 'Merge Two Sorted Lists',
      level: 'Easy',
      tags: ['dummy node', 'two pointers', 'merge'],
      statement: `<p>You are given the heads of two <b>sorted</b> linked lists <code>list1</code> and <code>list2</code>. Merge them into one sorted list by <b>splicing together</b> their nodes, and return the head of the merged list.</p>`,
      constraints: `0 ≤ nodes in each list ≤ 50, -100 ≤ Node.val ≤ 100, both lists sorted in non-decreasing order`,
      example: `${chain([1, 2, 4], { 0: 'b', 1: 'b', 2: 'b' })}${chain([1, 3, 4], { 0: 'y', 1: 'y', 2: 'y' })}<p>Output:</p>${chain([1, 1, 2, 3, 4, 4], { 0: 'b', 1: 'y', 2: 'b', 3: 'y', 4: 'b', 5: 'y' })}
<p>Colors show which list each node came from. <code>[] + []</code> → <code>[]</code>; <code>[] + [0]</code> → <code>[0]</code>.</p>`,
      brute: {
        why: `<p>Dump all values from both lists into an ArrayList, sort it (O((N+M) log(N+M))), and build brand-new nodes. It ignores the fact that both lists are <b>already sorted</b> (wasted sorting work) and allocates N+M new nodes instead of reusing them.</p>`,
        code: {
          lang: 'java',
          code: `
ListNode mergeTwoLists(ListNode list1, ListNode list2) {
    List<Integer> all = new ArrayList<>();
    for (ListNode c = list1; c != null; c = c.next) all.add(c.val);
    for (ListNode c = list2; c != null; c = c.next) all.add(c.val);
    Collections.sort(all);                       // re-sorting what was already sorted
    ListNode dummy = new ListNode(0), tail = dummy;
    for (int v : all) { tail.next = new ListNode(v); tail = tail.next; }
    return dummy.next;
}`,
          alt: [
            { lang: 'python', code: `def reverse_k_group(head, k):
    vals = []
    c = head
    while c is not None:
        vals.append(c.val)
        c = c.next
    for start in range(0, len(vals) - k + 1, k):
        # reverse vals[start .. start+k-1]
        i, j = start, start + k - 1
        while i < j:
            vals[i], vals[j] = vals[j], vals[i]
            i += 1
            j -= 1
    c = head
    for v in vals:
        c.val = v
        c = c.next
    return head` },
            { lang: 'js', code: `function reverseKGroup(head, k) {
  const vals = [];
  for (let c = head; c !== null; c = c.next) vals.push(c.val);
  for (let start = 0; start + k <= vals.length; start += k) {
    // reverse vals[start .. start+k-1]
    for (let i = start, j = start + k - 1; i < j; i++, j--) {
      [vals[i], vals[j]] = [vals[j], vals[i]];
    }
  }
  let idx = 0;
  for (let c = head; c !== null; c = c.next) c.val = vals[idx++];
  return head;
}` },
            { lang: 'cpp', code: `ListNode* reverseKGroup(ListNode* head, int k) {
    vector<int> vals;
    for (ListNode* c = head; c != nullptr; c = c->next) vals.push_back(c->val);
    for (int start = 0; start + k <= (int)vals.size(); start += k) {
        // reverse vals[start .. start+k-1]
        for (int i = start, j = start + k - 1; i < j; i++, j--) swap(vals[i], vals[j]);
    }
    int idx = 0;
    for (ListNode* c = head; c != nullptr; c = c->next) c->val = vals[idx++];
    return head;
}` }
          ]
        }
      },
      mcq: {
        q: 'l1 has run out, and l2 still has 5 → 7 → 9. What is the best way to finish?',
        options: ['Loop over l2 and attach nodes one by one', '<code>tail.next = l2</code> — one link', 'Create new nodes for 5, 7, 9', 'Sort l2 first, then attach it'],
        answer: 1,
        explain: 'The leftover part is already sorted and already linked together, so hooking its first node to tail attaches all of it in O(1).'
      },
      hints: [
        `<p>Both lists are sorted, so the smallest remaining value is always one of the two <b>front</b> nodes. You never need to look deeper.</p>`,
        `<p>Use a <b>dummy</b> node and a <code>tail</code> pointer for the result. Two pointers <code>l1</code>, <code>l2</code> walk the inputs; each step re-hooks the smaller front node after tail.</p>`,
        `<p>Traps: one or both lists empty (the dummy handles it); use <code>&lt;=</code> for ties; do not forget to attach the leftover list at the end. Recipe: dummy, tail = dummy; while l1 and l2: take smaller, tail.next = it, advance it, tail = tail.next; tail.next = (l1 != null ? l1 : l2); return dummy.next.</p>`
      ],
      tests: { sig: 'ListNode ListNode -> ListNode', fn: 'mergeTwoLists', cases: [
        [[[1, 2, 4], [1, 3, 4]], [1, 1, 2, 3, 4, 4]],
        [[[], []], []],
        [[[], [0]], [0]],
        [[[5], []], [5]],
        [[[1, 2, 3], [10, 20]], [1, 2, 3, 10, 20]],
        [[[-100, 0, 100], [-100, -50]], [-100, -100, -50, 0, 100]],
        [[[2, 2], [2]], [2, 2, 2]]
      ] },
      solution: {
        approach: `<p>Dummy + tail; compare fronts; attach the leftover list with a single link.</p>`,
        code: `
class Solution {
    public ListNode mergeTwoLists(ListNode list1, ListNode list2) {
        ListNode dummy = new ListNode(0);   // fake head of the merged list
        ListNode tail = dummy;              // last node of the merged list so far

        while (list1 != null && list2 != null) {
            if (list1.val <= list2.val) {   // ties go to list1 (stable)
                tail.next = list1;
                list1 = list1.next;
            } else {
                tail.next = list2;
                list2 = list2.next;
            }
            tail = tail.next;               // the node we just attached is the new tail
        }

        // At most one list still has nodes; they are already sorted and linked
        tail.next = (list1 != null) ? list1 : list2;

        return dummy.next;
    }
}`,
        alt: [
          { lang: 'python', code: `class Solution:
    def merge_two_lists(self, list1, list2):
        dummy = tail = ListNode(0)            # fake head + last node so far
        while list1 and list2:
            if list1.val <= list2.val:        # ties go to list1 (stable)
                tail.next, list1 = list1, list1.next
            else:
                tail.next, list2 = list2, list2.next
            tail = tail.next
        tail.next = list1 or list2            # leftovers are already sorted
        return dummy.next` },
          { lang: 'js', code: `function mergeTwoLists(list1, list2) {
  const dummy = new ListNode(0);         // fake head of the merged list
  let tail = dummy;                      // last node so far
  while (list1 !== null && list2 !== null) {
    if (list1.val <= list2.val) {        // ties go to list1 (stable)
      tail.next = list1;
      list1 = list1.next;
    } else {
      tail.next = list2;
      list2 = list2.next;
    }
    tail = tail.next;
  }
  tail.next = list1 !== null ? list1 : list2;   // leftovers are already sorted
  return dummy.next;
}` },
          { lang: 'cpp', code: `// LeetCode provides this node type; it is spelled out so the snippet compiles on its own.
struct ListNode {
    int val; ListNode* next;
    ListNode(int x = 0, ListNode* n = nullptr) : val(x), next(n) {}
};

class Solution {
public:
    ListNode* mergeTwoLists(ListNode* list1, ListNode* list2) {
        ListNode dummy;                        // fake head on the stack
        ListNode* tail = &dummy;
        while (list1 && list2) {
            ListNode*& smaller = (list1->val <= list2->val) ? list1 : list2;   // ties: list1
            tail->next = smaller;
            smaller = smaller->next;           // advances list1 or list2 through the reference
            tail = tail->next;
        }
        tail->next = list1 ? list1 : list2;    // leftovers are already sorted
        return dummy.next;
    }
};` }
        ],
        dry: {
          head: ['step', 'list1 front', 'list2 front', 'attach', 'merged'],
          rows: [
            ['1', '1', '1', '1 (list1, tie)', '1'],
            ['2', '2', '1', '1 (list2)', '1 → 1'],
            ['3', '2', '3', '2 (list1)', '1 → 1 → 2'],
            ['4', '4', '3', '3 (list2)', '1 → 1 → 2 → 3'],
            ['5', '4', '4', '4 (list1, tie)', '1 → 1 → 2 → 3 → 4'],
            ['end', 'null', '4', 'tail.next = list2', '<span class="c-p">1 → 1 → 2 → 3 → 4 → 4</span>']
          ]
        },
        complexity: `<p><b>Time O(N + M)</b>: each loop round attaches one node, and each node is attached once. <b>Space O(1)</b>: we reuse the existing nodes; only the dummy and a few pointers are extra.</p>`
      }
    }]
  });

  // =====================================================================
  // TOPIC 8: LRU Cache = HashMap + Doubly Linked List
  // =====================================================================
  topics.push({
    title: 'LRU Cache: HashMap + Doubly Linked List',
    analogy: `<p>Think of the <b>small desk</b> in your room that only fits <b>3 books</b>. Every time you use a book, you put it back on the <b>top</b> of the pile. When a 4th book arrives and the desk is full, you take the book at the <b>bottom</b> of the pile — the one you have not touched for the longest time — and put it back on the shelf. That is <b>Least Recently Used (LRU)</b> eviction.</p>
<p>Now add a <b>sticky-note index</b> on the wall: "Physics book → 2nd from top". With the index you can grab any book instantly (that is the <b>HashMap</b>), and because the books are a pile you can pull one out and put it on top without disturbing the rest (that is the <b>doubly linked list</b>).</p>`,
    explain: `<h4>1. What the interviewer asks for</h4>
<p>Design a cache with a fixed <b>capacity</b> and two operations, <b>both in O(1)</b> on average:</p>
<ul><li><code>get(key)</code>: return the value (or -1) and mark the key as <b>just used</b>.</li>
<li><code>put(key, value)</code>: insert or update. If the cache is now over capacity, throw away the <b>least recently used</b> key.</li></ul>
<h4>2. Why one data structure is not enough</h4>
${H.table(['Structure alone', 'Find a key', 'Move a key to "most recent"', 'Find the oldest key'], [
  ['HashMap', H.c('g', 'O(1)'), 'no notion of order', H.c('r', 'O(N) scan of timestamps')],
  ['ArrayList ordered by recency', H.c('r', 'O(N) search'), H.c('r', 'O(N) shifting'), H.c('g', 'O(1) (the end)')],
  ['Singly linked list', H.c('r', 'O(N) search'), H.c('r', 'O(N) — need the node before it'), H.c('g', 'O(1) with a tail')],
  [H.c('p', 'HashMap + doubly linked list'), H.c('g', 'O(1) via map'), H.c('g', 'O(1) unlink + add to front'), H.c('g', 'O(1): tail.prev')]
])}
<p>The <b>map</b> answers "where is key 7?" by handing you its <b>node</b> directly. The <b>doubly linked list</b> keeps the order: <b>front = most recently used</b>, <b>back = least recently used</b>. Because each node knows its <code>prev</code> and <code>next</code>, you can pull it out from the middle in O(1) — no walking.</p>
<h4>3. Two sentinels make the code boring (in a good way)</h4>
<p>Create two fake nodes <code>head</code> and <code>tail</code> that are <b>never removed</b>: <code>head ⇄ … real nodes … ⇄ tail</code>. Every real node now always has a real <code>prev</code> and <code>next</code>, so there are no <code>null</code> checks (it is the dummy-node trick from earlier, on both ends).</p>
${chain(['head', '3=30', '1=10', '2=20', 'tail'], { 1: 'g', 3: 'r' })}
<p>${H.c('g', '3')} is the most recent, ${H.c('r', '2')} is the next to be evicted (<code>tail.prev</code>).</p>
<h4>4. The only three helpers you need</h4>
${H.table(['helper', 'pointer work', 'cost'], [
  ['unlink(n)', 'n.prev.next = n.next; n.next.prev = n.prev', 'O(1)'],
  ['addFront(n)', 'n.next = head.next; n.prev = head; head.next.prev = n; head.next = n', 'O(1)'],
  ['moveToFront(n)', 'unlink(n); addFront(n)', 'O(1)']
])}
<h4>5. The two operations as recipes</h4>
<ul><li><b>get(k)</b>: node = map.get(k). Missing → -1. Else moveToFront(node), return node.val.</li>
<li><b>put(k, v)</b>: if k exists → update node.val, moveToFront, done. Else, if size == capacity → victim = tail.prev; unlink(victim); <b>map.remove(victim.key)</b>. Then create the node, addFront, map.put.</li></ul>
<p>That is why the node stores its <b>key</b> as well as its value: when we evict from the list we must also delete the key from the map, and the list only gives us the node.</p>`,
    clues: [
      '"Design a data structure that follows the <b>Least Recently Used</b> eviction policy" → HashMap + doubly linked list.',
      '"<code>get</code> and <code>put</code> must each run in <b>O(1)</b> average time" → map for lookup, DLL for order.',
      '"When the cache reaches its <b>capacity</b>, invalidate the least recently used item" → evict <code>tail.prev</code>.',
      '"Move to front", "most recently used first", "recency order", "browser history / recent files" → DLL with O(1) unlink.',
      '"Remove an arbitrary element in O(1) given a handle" → store the <b>node</b> (not the value) in the map.',
      'Follow-up "make it thread-safe" or "evict by frequency" → locks / LinkedHashMap / LFU with frequency buckets.'
    ],
    code: [{ lang: 'java', code: `
class LRUCache {
    // One entry in the recency list. It stores the KEY too, so that when we
    // evict it from the list we know which key to delete from the map.
    private static class Node {
        int key, val;
        Node prev, next;
        Node(int key, int val) { this.key = key; this.val = val; }
    }

    private final int capacity;
    private final Map<Integer, Node> map = new HashMap<>();   // key -> its node
    private final Node head = new Node(0, 0);   // sentinel: head.next = MOST recent
    private final Node tail = new Node(0, 0);   // sentinel: tail.prev = LEAST recent

    public LRUCache(int capacity) {
        this.capacity = capacity;
        head.next = tail;   // empty cache: the two sentinels hold hands
        tail.prev = head;
    }

    public int get(int key) {
        Node node = map.get(key);
        if (node == null) return -1;   // miss
        moveToFront(node);             // a read counts as a "use"
        return node.val;
    }

    public void put(int key, int value) {
        Node node = map.get(key);
        if (node != null) {            // existing key: update + mark as used
            node.val = value;
            moveToFront(node);
            return;
        }
        if (map.size() == capacity) {  // full: evict the least recently used
            Node lru = tail.prev;
            unlink(lru);
            map.remove(lru.key);       // this is why the node keeps its key
        }
        Node fresh = new Node(key, value);
        addFront(fresh);
        map.put(key, fresh);
    }

    // Pull a node out of the list: its neighbours shake hands with each other
    private void unlink(Node n) {
        n.prev.next = n.next;
        n.next.prev = n.prev;
    }

    // Put a node right after the head sentinel (= most recently used)
    private void addFront(Node n) {
        n.next = head.next;
        n.prev = head;
        head.next.prev = n;
        head.next = n;
    }

    private void moveToFront(Node n) {
        unlink(n);
        addFront(n);
    }

    public static void main(String[] args) {
        LRUCache c = new LRUCache(2);
        c.put(1, 1); c.put(2, 2);
        System.out.println(c.get(1));   // 1  (order now: 1, 2)
        c.put(3, 3);                    // evicts key 2
        System.out.println(c.get(2));   // -1
        c.put(4, 4);                    // evicts key 1
        System.out.println(c.get(1) + " " + c.get(3) + " " + c.get(4));   // -1 3 4
    }
}`,
      alt: [
        { lang: 'python', run: true, code: `class Node:
    # It stores the KEY too, so eviction knows which map entry to delete.
    __slots__ = ("key", "val", "prev", "next")
    def __init__(self, key=0, val=0):
        self.key, self.val, self.prev, self.next = key, val, None, None

class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.map = {}                          # key -> its node
        self.head, self.tail = Node(), Node()  # sentinels: head.next = MOST recent, tail.prev = LEAST
        self.head.next, self.tail.prev = self.tail, self.head

    def get(self, key):
        node = self.map.get(key)
        if node is None:
            return -1                          # miss
        self._move_to_front(node)              # a read counts as a "use"
        return node.val

    def put(self, key, value):
        node = self.map.get(key)
        if node:                               # existing key: update + mark as used
            node.val = value
            self._move_to_front(node)
            return
        if len(self.map) == self.capacity:     # full: evict the least recently used
            lru = self.tail.prev
            self._unlink(lru)
            del self.map[lru.key]              # this is why the node keeps its key
        node = Node(key, value)
        self._add_front(node)
        self.map[key] = node

    def _unlink(self, n):                      # neighbours shake hands with each other
        n.prev.next, n.next.prev = n.next, n.prev

    def _add_front(self, n):                   # right after the head sentinel
        n.prev, n.next = self.head, self.head.next
        self.head.next.prev = n
        self.head.next = n

    def _move_to_front(self, n):
        self._unlink(n)
        self._add_front(n)

c = LRUCache(2)
c.put(1, 1); c.put(2, 2)
print(c.get(1))                         # 1  (order now: 1, 2)
c.put(3, 3)                             # evicts key 2
print(c.get(2))                         # -1
c.put(4, 4)                             # evicts key 1
print(c.get(1), c.get(3), c.get(4))     # -1 3 4` },
        { lang: 'js', run: true, code: `class Node {
  // It stores the KEY too, so eviction knows which map entry to delete.
  constructor(key = 0, val = 0) { this.key = key; this.val = val; this.prev = null; this.next = null; }
}

class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map();                  // key -> its node
    this.head = new Node();                // sentinel: head.next = MOST recent
    this.tail = new Node();                // sentinel: tail.prev = LEAST recent
    this.head.next = this.tail;            // empty cache: the two sentinels hold hands
    this.tail.prev = this.head;
  }

  get(key) {
    const node = this.map.get(key);
    if (node === undefined) return -1;     // miss
    this.moveToFront(node);                // a read counts as a "use"
    return node.val;
  }

  put(key, value) {
    const node = this.map.get(key);
    if (node !== undefined) {              // existing key: update + mark as used
      node.val = value;
      this.moveToFront(node);
      return;
    }
    if (this.map.size === this.capacity) { // full: evict the least recently used
      const lru = this.tail.prev;
      this.unlink(lru);
      this.map.delete(lru.key);            // this is why the node keeps its key
    }
    const fresh = new Node(key, value);
    this.addFront(fresh);
    this.map.set(key, fresh);
  }

  unlink(n) { n.prev.next = n.next; n.next.prev = n.prev; }   // neighbours shake hands

  addFront(n) {                            // right after the head sentinel
    n.next = this.head.next;
    n.prev = this.head;
    this.head.next.prev = n;
    this.head.next = n;
  }

  moveToFront(n) { this.unlink(n); this.addFront(n); }
}

const c = new LRUCache(2);
c.put(1, 1); c.put(2, 2);
console.log(c.get(1));                     // 1  (order now: 1, 2)
c.put(3, 3);                               // evicts key 2
console.log(c.get(2));                     // -1
c.put(4, 4);                               // evicts key 1
console.log(c.get(1), c.get(3), c.get(4)); // -1 3 4` },
        { lang: 'cpp', code: `class LRUCache {
    // It stores the KEY too, so eviction knows which map entry to delete.
    struct Node {
        int key, val;
        Node *prev = nullptr, *next = nullptr;
        Node(int k, int v) : key(k), val(v) {}
    };

    int capacity;
    unordered_map<int, Node*> map;           // key -> its node
    Node head{0, 0}, tail{0, 0};             // sentinels: head.next = MOST recent, tail.prev = LEAST

    void unlink(Node* n) { n->prev->next = n->next; n->next->prev = n->prev; }
    void addFront(Node* n) {                 // right after the head sentinel
        n->next = head.next;
        n->prev = &head;
        head.next->prev = n;
        head.next = n;
    }
    void moveToFront(Node* n) { unlink(n); addFront(n); }

public:
    explicit LRUCache(int capacity) : capacity(capacity) { head.next = &tail; tail.prev = &head; }
    ~LRUCache() { for (auto& [k, n] : map) delete n; }   // no garbage collector: free the nodes

    int get(int key) {
        auto it = map.find(key);
        if (it == map.end()) return -1;      // miss
        moveToFront(it->second);             // a read counts as a "use"
        return it->second->val;
    }

    void put(int key, int value) {
        if (auto it = map.find(key); it != map.end()) {   // existing key: update + mark as used
            it->second->val = value;
            moveToFront(it->second);
            return;
        }
        if ((int)map.size() == capacity) {   // full: evict the least recently used
            Node* lru = tail.prev;
            unlink(lru);
            map.erase(lru->key);             // this is why the node keeps its key
            delete lru;
        }
        Node* fresh = new Node(key, value);
        addFront(fresh);
        map[key] = fresh;
    }
};

int main() {
    LRUCache c(2);
    c.put(1, 1); c.put(2, 2);
    cout << c.get(1) << "\\n";               // 1  (order now: 1, 2)
    c.put(3, 3);                             // evicts key 2
    cout << c.get(2) << "\\n";               // -1
    c.put(4, 4);                             // evicts key 1
    cout << c.get(1) << " " << c.get(3) << " " << c.get(4) << "\\n";   // -1 3 4
}` }
      ] }, { lang: 'java', code: `
// The "I know my library" answer: LinkedHashMap already IS a HashMap + doubly linked list.
class LRUCacheLHM extends LinkedHashMap<Integer, Integer> {
    private final int capacity;

    LRUCacheLHM(int capacity) {
        super(16, 0.75f, true);   // true = ACCESS order (get/put move the entry to the end)
        this.capacity = capacity;
    }

    public int get(int key) {
        return getOrDefault(key, -1);   // getOrDefault also counts as an access
    }

    public void put(int key, int value) {
        super.put(key, value);
    }

    // Called by LinkedHashMap after every insert: return true to drop the eldest entry
    @Override
    protected boolean removeEldestEntry(Map.Entry<Integer, Integer> eldest) {
        return size() > capacity;
    }
}`,
      alt: [
        { lang: 'python', code: `from collections import OrderedDict

# The "I know my library" answer: OrderedDict is a dict + doubly linked list (full demo below).
class LRUCacheOD(OrderedDict):
    def __init__(self, capacity):
        super().__init__()
        self.capacity = capacity

    def get(self, key):
        if key not in self:
            return -1
        self.move_to_end(key)                 # O(1): now the most recent
        return self[key]

    def put(self, key, value):
        self[key] = value
        self.move_to_end(key)
        if len(self) > self.capacity:
            self.popitem(last=False)          # O(1): drop the least recent (front)` },
        { lang: 'js', run: true, code: `// The "I know my library" answer: a Map remembers insertion order, so
// delete + set moves a key to the end, and keys().next() is the oldest key.
class LRUCacheMap {
  constructor(capacity) { this.capacity = capacity; this.map = new Map(); }

  get(key) {
    if (!this.map.has(key)) return -1;
    const v = this.map.get(key);
    this.map.delete(key);                    // re-insert = mark as most recent
    this.map.set(key, v);
    return v;
  }

  put(key, value) {
    this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.capacity) this.map.delete(this.map.keys().next().value);   // oldest
  }
}

const c = new LRUCacheMap(2);
c.put(1, 1); c.put(2, 2); c.get(1); c.put(3, 3);
console.log([...c.map.keys()]);              // [ 1, 3 ]  (2 was evicted)` },
        { lang: 'cpp', code: `// The "I know my library" answer: std::list is a doubly linked list, and splice()
// moves a node to the front in O(1) without copying it or invalidating iterators.
class LRUCacheSTL {
    int capacity;
    list<pair<int, int>> items;                          // front = most recent
    unordered_map<int, list<pair<int, int>>::iterator> where;

public:
    explicit LRUCacheSTL(int capacity) : capacity(capacity) {}

    int get(int key) {
        auto it = where.find(key);
        if (it == where.end()) return -1;
        items.splice(items.begin(), items, it->second);  // O(1) move to front
        return it->second->second;
    }

    void put(int key, int value) {
        if (auto it = where.find(key); it != where.end()) {
            it->second->second = value;
            items.splice(items.begin(), items, it->second);
            return;
        }
        if ((int)items.size() == capacity) {             // evict the back = least recent
            where.erase(items.back().first);
            items.pop_back();
        }
        items.emplace_front(key, value);
        where[key] = items.begin();
    }
};` }
      ] }, {
      lang: 'python', run: true, title: 'Python: OrderedDict is also a hash map + doubly linked list (runnable)', code: `from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity):
        self.cap = capacity
        self.data = OrderedDict()          # keeps keys in usage order

    def get(self, key):
        if key not in self.data:
            return -1
        self.data.move_to_end(key)         # O(1): now the most recent
        return self.data[key]

    def put(self, key, value):
        if key in self.data:
            self.data.move_to_end(key)
        self.data[key] = value
        if len(self.data) > self.cap:
            self.data.popitem(last=False)  # O(1): drop the least recent (front)

c = LRUCache(2)
c.put(1, 1); c.put(2, 2)
print(c.get(1))        # 1
c.put(3, 3)            # evicts 2
print(c.get(2))        # -1
c.put(4, 4)            # evicts 1
print(c.get(1), c.get(3), c.get(4))   # -1 3 4
print(list(c.data.items()))           # [(3, 3), (4, 4)] least -> most recent`
    }],
    codeTitle: ['LRU cache from scratch: HashMap + DLL with two sentinels', 'Library shortcut: Java LinkedHashMap (access order), JS Map, C++ std::list + splice', 'Python shortcut: OrderedDict'],
    viz: {
      title: 'LRU cache step by step: the map finds the node, the list keeps the order',
      input: '2 | put 1 1, put 2 2, get 1, put 3 3, get 2, put 4 4, get 1, get 3, get 4',
      inputLabel: 'capacity | operations ("put KEY VALUE" or "get KEY")',
      gen: function (input) {
        var halves = String(input === undefined ? '' : input).split('|');
        if (halves.length !== 2) throw new Error('Format: capacity | operations, e.g. 2 | put 1 1, get 1');
        var cap = Number(String(halves[0]).trim());
        if (!(Math.floor(cap) === cap && cap >= 1 && cap <= 6)) throw new Error('Capacity must be a whole number from 1 to 6');
        var ops = halves[1].split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!ops.length) throw new Error('Add operations after the |, e.g. put 1 10, get 1');
        if (ops.length > 14) throw new Error('Please use at most 14 operations');
        var order = [], vals = {}, frames = [], last = '-';
        function L(hl, nx, extraPtr) {
          var v = ['head'].concat(order.map(function (k) { return k + '=' + vals[k]; })).concat(['tail']);
          var p = {}; addPtr(p, 0, 'sentinel'); addPtr(p, v.length - 1, 'sentinel');
          if (order.length) { addPtr(p, 1, 'MRU'); addPtr(p, order.length, 'LRU'); }
          if (extraPtr) Object.keys(extraPtr).forEach(function (i) { addPtr(p, Number(i), extraPtr[i]); });
          var part = { type: 'list', label: 'doubly linked list (front = most recent)', values: v, ptr: p, hl: hl || {} };
          if (nx) part.next = nx;
          return part;
        }
        function M(hlKey, cls) {
          var h = {}; if (hlKey !== undefined) h[String(hlKey)] = cls;
          return { type: 'map', label: 'HashMap: key → node', entries: order.slice().sort(function (a, b) { return a - b; }).map(function (k) { return [String(k), 'node(' + k + '=' + vals[k] + ')']; }), hl: h };
        }
        function V(hl) { return { type: 'vars', vals: { capacity: cap, size: order.length, 'last result': last }, hl: hl || {} }; }
        frames.push({ narr: 'An empty LRU cache with capacity <b>' + cap + '</b>. The list holds only the two <b>sentinels</b> head and tail; the map is empty. Front of the list = most recently used, back = least recently used.', parts: [L(), M(), V()] });
        ops.forEach(function (op) {
          var mp = op.match(/^put\s+(-?\d+)\s+(-?\d+)$/i), mg = op.match(/^get\s+(-?\d+)$/i);
          if (!mp && !mg) throw new Error('Unknown operation "' + op + '". Use "put KEY VALUE" or "get KEY".');
          var key = Number(mp ? mp[1] : mg[1]), pos = order.indexOf(key), h, nx, i;
          if (mg) {
            if (pos < 0) {
              last = -1;
              frames.push({ narr: '<code>get(' + key + ')</code>: the map has no key ' + key + ' → <span class="c-r"><b>miss</b>, return -1</span>. Nothing moves, because nothing was used.', parts: [L(), M(), V({ 'last result': 'bad' })] });
              return;
            }
            h = {}; h[pos + 1] = 'cur';
            frames.push({ narr: '<code>get(' + key + ')</code>: the map hands us the node for key ' + key + ' <b>directly</b> (no walking). It is at position ' + (pos + 1) + ' in the recency list.', parts: [L(h), M(key, 'cur'), V()] });
            if (pos > 0) {
              nx = seqNext(order.length + 2); nx[pos] = pos + 2;
              frames.push({ narr: '<b>unlink</b>: its neighbours shake hands — <code>node.prev.next = node.next; node.next.prev = node.prev</code>. O(1) because the node knows both neighbours (this is why we need a <b>doubly</b> linked list).', parts: [L(h, nx), M(key, 'cur'), V()] });
              order.splice(pos, 1); order.unshift(key);
            }
            last = vals[key];
            frames.push({ narr: (pos > 0 ? '<b>addFront</b>: hook it right after head. ' : 'It is already at the front, so moving it changes nothing. ') + 'Key ' + key + ' is now the most recently used. Return <span class="c-g"><b>' + vals[key] + '</b></span>.', parts: [L({ 1: 'ok' }), M(key, 'ok'), V({ 'last result': 'ok' })] });
            return;
          }
          var value = Number(mp[2]);
          if (pos >= 0) {
            h = {}; h[pos + 1] = 'cur';
            frames.push({ narr: '<code>put(' + key + ', ' + value + ')</code>: key ' + key + ' already exists. Update its value from ' + vals[key] + ' to ' + value + ' — <b>no eviction</b> is needed, the size does not change.', parts: [L(h), M(key, 'cur'), V()] });
            vals[key] = value; order.splice(pos, 1); order.unshift(key); last = 'null';
            frames.push({ narr: 'Writing counts as a use too, so <b>moveToFront</b> (unlink + addFront). Key ' + key + ' is now the most recent.', parts: [L({ 1: 'ok' }), M(key, 'ok'), V()] });
            return;
          }
          if (order.length === cap) {
            var victim = order[order.length - 1];
            h = {}; h[order.length] = 'bad';
            frames.push({ narr: '<code>put(' + key + ', ' + value + ')</code>: new key, but the cache is <b>full</b> (' + cap + '/' + cap + '). The victim is <code>tail.prev</code> = key <b>' + victim + '</b> — untouched for the longest time.', parts: [L(h), M(victim, 'bad'), V({ size: 'bad' })] });
            nx = seqNext(order.length + 2); nx[order.length - 1] = order.length + 1;
            frames.push({ narr: '<b>unlink(victim)</b> from the list, and <b>map.remove(victim.key)</b>. The node stores its key exactly so we can do this second step — the list alone does not know which map entry to delete.', parts: [L(h, nx), M(victim, 'bad'), V()] });
            order.pop(); delete vals[victim];
          }
          vals[key] = value; order.unshift(key); last = 'null';
          frames.push({ narr: '<code>put(' + key + ', ' + value + ')</code>: create node ' + key + '=' + value + ', <b>addFront</b> (4 pointer writes), and <b>map.put(' + key + ', node)</b>. Size is now ' + order.length + '.', parts: [L({ 1: 'ok' }), M(key, 'ok'), V()] });
        });
        frames.push({ narr: 'Done. Every operation was a map lookup plus a constant number of pointer changes → <b>O(1)</b> each. Final order (most → least recent): ' + (order.length ? order.join(', ') : '(empty)') + '.', parts: [L(), M(), V()] });
        return frames;
      }
    },
    examples: [
      {
        title: 'The classic trace (capacity 2)',
        html: `<p>Operations: put(1,1), put(2,2), get(1), put(3,3), get(2), put(4,4), get(1), get(3), get(4).</p>
${H.table(['op', 'result', 'list (most → least recent)', 'why'], [
  ['put(1,1)', '—', '1', 'room available'],
  ['put(2,2)', '—', '2, 1', 'room available'],
  ['get(1)', H.c('g', '1'), '1, 2', 'hit → 1 moves to the front'],
  ['put(3,3)', '—', '3, 1', H.c('r', 'full → evict tail.prev = 2')],
  ['get(2)', H.c('r', '-1'), '3, 1', '2 was evicted'],
  ['put(4,4)', '—', '4, 3', H.c('r', 'full → evict 1')],
  ['get(1)', H.c('r', '-1'), '4, 3', 'gone'],
  ['get(3)', H.c('g', '3'), '3, 4', 'hit → move to front'],
  ['get(4)', H.c('g', '4'), '4, 3', 'hit → move to front']
])}
<p>Notice the <code>get(1)</code> on line 3 <b>saved</b> key 1 from the first eviction — reads change the order.</p>`
      },
      {
        title: 'The sneaky bug: updating an existing key when the cache is full',
        html: `<p>Capacity 2, cache holds {1, 2}. Now <code>put(2, 99)</code>. A buggy version checks "is the cache full?" <b>before</b> checking "does the key already exist?", so it evicts key 1 and then updates 2. Result: the cache holds only one key, even though nothing new was added.</p>
<p>${H.c('g', 'Correct order')}: (1) if the key exists, update + move to front, return; (2) only for a <b>new</b> key, evict when full; (3) insert. With this order the cache stays {2=99, 1}.</p>
<pre><code>c.put(1, 1); c.put(2, 2);
c.put(2, 99);   // update: must NOT evict anything
c.get(1);       // 1  (still there)
c.get(2);       // 99</code></pre>`
      },
      {
        title: 'Capacity 1: every new key evicts the old one',
        html: `<p>With capacity 1 the list always holds exactly one real node between the sentinels. <code>put(1,1)</code>, <code>put(2,2)</code> → 1 is evicted (it is both MRU and LRU). <code>get(1)</code> = -1, <code>get(2)</code> = 2. The sentinels mean we never special-case "the only node": <code>tail.prev</code> is that node and <code>unlink</code> works the same.</p>`
      },
      {
        title: 'Why not a singly linked list?',
        html: `<p>To unlink node X you must change the <code>next</code> of the node <b>before</b> X. In a singly list, X does not know that node, so you would walk from the head: O(N). Evicting the tail has the same problem (you need the second-last node). A <code>prev</code> pointer turns both into O(1). (A known trick stores in the map the node <i>before</i> each key in a singly list, but it is fiddly — every move changes which node is "before" two other keys.)</p>`
      }
    ],
    deepDive: `<h4>Correctness invariants</h4>
<ul><li>The map and the list always contain the <b>same set of keys</b> (every map value is a live node; every live node is in the map).</li>
<li>List order = order of last use; head.next is the most recent, tail.prev the least recent.</li>
<li><code>map.size() ≤ capacity</code> after every public call.</li></ul>
<p>If you write a randomized test, compare against <code>LinkedHashMap</code> in access order after each operation — any divergence points straight at the broken invariant.</p>
<h4>Memory and constants</h4>
<p>Each entry costs a map entry (~32–48 bytes in Java) + a node with key, value and two references (~32 bytes) + boxed Integer keys. For millions of entries, production caches use primitive maps or off-heap storage. <code>LinkedHashMap</code> saves one object per entry because its entries <b>are</b> the list nodes.</p>
<h4>Thread safety</h4>
<p>Even <code>get</code> <b>writes</b> (it moves a node), so a plain read-write lock does not help: reads need the write lock. Options: one <code>synchronized</code> lock (simple, contention under load); striping into N independent LRU segments by key hash (approximate global LRU); or buffering "this key was read" events and applying them in batches — the approach of the Java library <b>Caffeine</b>, which also replaces pure LRU with <b>Window TinyLFU</b> for better hit rates.</p>
<h4>LRU in real systems (and its weakness)</h4>
<ul><li><b>Redis</b> uses an <i>approximated</i> LRU: it samples a few keys (default <code>maxmemory-samples 5</code>) and evicts the oldest of the sample, to avoid keeping a global list.</li>
<li>Operating systems use <b>CLOCK</b>/second-chance and active/inactive lists to approximate LRU for page caches.</li>
<li>Weakness: a single big <b>scan</b> (reading every row once) flushes all the hot keys. Fixes: LRU-K, 2Q, ARC, TinyLFU — they also look at <b>frequency</b>. The LFU cache (practice problem) is the frequency-based cousin.</li></ul>
<h4>Variants interviewers like</h4>
<p>TTL expiry (store an expiry time per node; lazily evict on access + a background sweep), size-weighted capacity (evict until total bytes fit), and "peek without touching recency".</p>`,
    aiEra: `<p><b>What AI changes:</b> any assistant writes a correct-looking LRU cache in seconds — it is one of the most memorised interview problems on the internet. So interviewers now push on the <b>why</b>: why both structures, why the node stores the key, what breaks under concurrency, what eviction policy fits the workload.</p>
<p><b>Where AI shows up in the real world:</b> LLM serving systems cache <b>KV tensors</b> and prompt prefixes and must evict blocks when GPU memory is full (often LRU-like policies over prefix blocks); embedding and retrieval caches in RAG pipelines are typically LRU/TTL caches in front of a vector database. Knowing LRU lets you reason about their hit rates and costs.</p>
<p><b>Use AI as a partner:</b> <code>Write a randomized test that compares my LRUCache against LinkedHashMap(accessOrder=true) for 100k random ops with capacity 1..5</code>. <b>Where AI goes wrong:</b> evicting before checking for an existing key, forgetting <code>map.remove</code> on eviction, forgetting to move on <code>get</code>, or using <code>LinkedHashMap</code> with insertion order (the default <code>false</code>). <b>What you must own:</b> the invariants above, the O(1) argument, and the trade-off discussion.</p>`,
    problems: [{
      title: 'LRU Cache',
      level: 'Medium',
      tags: ['design', 'hashmap', 'doubly linked list'],
      companies: ['Amazon', 'Google', 'Meta', 'Microsoft', 'Bloomberg'],
      statement: `<p>Design a class <code>LRUCache(int capacity)</code> with <code>int get(int key)</code> (value or -1) and <code>void put(int key, int value)</code> (insert or update; if the number of keys exceeds capacity, evict the <b>least recently used</b> key). Both operations must run in <b>O(1)</b> average time.</p>`,
      constraints: `1 ≤ capacity ≤ 3000, 0 ≤ key ≤ 10<sup>4</sup>, 0 ≤ value ≤ 10<sup>5</sup>, at most 2·10<sup>5</sup> calls to get and put`,
      example: `<p>capacity = 2: put(1,1), put(2,2), get(1) → ${H.c('g', '1')}, put(3,3) ${H.c('r', '(evicts 2)')}, get(2) → ${H.c('r', '-1')}, put(4,4) ${H.c('r', '(evicts 1)')}, get(1) → -1, get(3) → 3, get(4) → 4.</p><p>Key 2 is evicted (not 1) because <code>get(1)</code> made 1 more recent than 2.</p>`,
      brute: {
        why: `<p>Keep values in a HashMap and a "last used" timestamp per key. get/put are O(1), but eviction <b>scans every key</b> for the smallest timestamp: O(capacity) per eviction → up to 2·10<sup>5</sup> × 3000 = 6·10<sup>8</sup> steps. The wasted work is re-finding the oldest key from scratch every time.</p>`,
        code: {
          lang: 'java',
          code: `
class LRUCache {
    private final int capacity;
    private final Map<Integer, Integer> vals = new HashMap<>();
    private final Map<Integer, Long> lastUsed = new HashMap<>();
    private long clock = 0;

    public LRUCache(int capacity) { this.capacity = capacity; }

    public int get(int key) {
        if (!vals.containsKey(key)) return -1;
        lastUsed.put(key, clock++);
        return vals.get(key);
    }

    public void put(int key, int value) {
        if (!vals.containsKey(key) && vals.size() == capacity) {
            int victim = -1;
            long oldest = Long.MAX_VALUE;
            for (Map.Entry<Integer, Long> e : lastUsed.entrySet()) {   // O(N) scan
                if (e.getValue() < oldest) { oldest = e.getValue(); victim = e.getKey(); }
            }
            vals.remove(victim);
            lastUsed.remove(victim);
        }
        vals.put(key, value);
        lastUsed.put(key, clock++);
    }
}`,
          alt: [
            { lang: 'python', code: `def merge_two_lists(list1, list2):
    all_vals = []
    c = list1
    while c is not None:
        all_vals.append(c.val)
        c = c.next
    c = list2
    while c is not None:
        all_vals.append(c.val)
        c = c.next
    all_vals.sort()                       # re-sorting what was already sorted
    dummy = ListNode(0)
    tail = dummy
    for v in all_vals:
        tail.next = ListNode(v)
        tail = tail.next
    return dummy.next` },
            { lang: 'js', code: `function mergeTwoLists(list1, list2) {
  const all = [];
  for (let c = list1; c !== null; c = c.next) all.push(c.val);
  for (let c = list2; c !== null; c = c.next) all.push(c.val);
  all.sort((a, b) => a - b);                    // re-sorting what was already sorted
  const dummy = new ListNode(0);
  let tail = dummy;
  for (const v of all) { tail.next = new ListNode(v); tail = tail.next; }
  return dummy.next;
}` },
            { lang: 'cpp', code: `ListNode* mergeTwoLists(ListNode* list1, ListNode* list2) {
    vector<int> all;
    for (ListNode* c = list1; c != nullptr; c = c->next) all.push_back(c->val);
    for (ListNode* c = list2; c != nullptr; c = c->next) all.push_back(c->val);
    sort(all.begin(), all.end());                    // re-sorting what was already sorted
    ListNode* dummy = new ListNode(0);
    ListNode* tail = dummy;
    for (int v : all) { tail->next = new ListNode(v); tail = tail->next; }
    return dummy->next;
}` }
          ]
        }
      },
      mcq: {
        q: 'You need O(1) "find key", O(1) "move this key to most-recent" and O(1) "remove the oldest". Which combination works?',
        options: ['HashMap + ArrayList', 'TreeMap keyed by timestamp', 'HashMap (key → node) + doubly linked list', 'Two stacks'],
        answer: 2,
        explain: 'The map gives O(1) access to the node; the doubly linked list lets you unlink that node and re-insert it at the front in O(1), and tail.prev is always the oldest. TreeMap is O(log N); ArrayList removal is O(N).'
      },
      hints: [
        `<p>Order matters and changes on every access, and you also need instant lookup. One structure cannot do both — combine a <b>lookup</b> structure with an <b>ordering</b> structure that supports O(1) removal from the middle.</p>`,
        `<p>A hash map from key to node (<code>HashMap</code> / <code>dict</code> / <code>Map</code> / <code>unordered_map</code>) + a doubly linked list with <b>head/tail sentinels</b>. Helpers: <code>unlink(node)</code>, <code>addFront(node)</code>. Store <b>key and value</b> in each node.</p>`,
        `<p>Edge cases: put on an existing key (update + move, no eviction), capacity 1, get of a missing key (no change). Recipe — get: node = map.get(k); null → -1; moveToFront; return val. put: exists → update, moveToFront, return; full → lru = tail.prev, unlink, map.remove(lru.key); create, addFront, map.put.</p>`
      ],
      tests: { cls: 'LRUCache', sigs: { LRUCache: 'int', get: 'int -> int', put: 'int int -> void' }, cases: [
        { ops: ['LRUCache', 'put', 'put', 'get', 'put', 'get', 'put', 'get', 'get', 'get'], args: [[2], [1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]], out: [null, null, null, 1, null, -1, null, -1, 3, 4] },
        { ops: ['LRUCache', 'put', 'put', 'put', 'get', 'get'], args: [[2], [1, 1], [2, 2], [2, 99], [1], [2]], out: [null, null, null, null, 1, 99] },
        { ops: ['LRUCache', 'put', 'put', 'get', 'get'], args: [[1], [1, 1], [2, 2], [1], [2]], out: [null, null, null, -1, 2] },
        { ops: ['LRUCache', 'get', 'put', 'get'], args: [[1], [5], [5, 0], [5]], out: [null, -1, null, 0] },
        { ops: ['LRUCache', 'put', 'put', 'put', 'get', 'put', 'get', 'get'], args: [[2], [1, 1], [1, 2], [1, 3], [1], [2, 2], [1], [2]], out: [null, null, null, null, 3, null, 3, 2] },
        { ops: ['LRUCache', 'put', 'put', 'put', 'get', 'put', 'get', 'get', 'get', 'put', 'get'], args: [[3], [1, 10], [2, 20], [3, 30], [1], [4, 40], [2], [3], [1], [5, 50], [4]], out: [null, null, null, null, 10, null, -1, 30, 10, null, -1] },
        { ops: ['LRUCache', 'put', 'get', 'put', 'get', 'get'], args: [[2], [10000, 100000], [10000], [0, 0], [0], [10000]], out: [null, null, 100000, null, 0, 100000] }
      ] },
      solution: {
        approach: `<p>HashMap from key to DLL node; DLL ordered by recency with sentinels; every operation = one map access + at most two O(1) list surgeries.</p>`,
        code: `
class LRUCache {
    private static class Node {
        int key, val;
        Node prev, next;
        Node(int k, int v) { key = k; val = v; }
    }

    private final int capacity;
    private final Map<Integer, Node> map = new HashMap<>();
    private final Node head = new Node(0, 0), tail = new Node(0, 0);

    public LRUCache(int capacity) {
        this.capacity = capacity;
        head.next = tail;
        tail.prev = head;
    }

    public int get(int key) {
        Node n = map.get(key);
        if (n == null) return -1;
        unlink(n);          // move to front = most recently used
        addFront(n);
        return n.val;
    }

    public void put(int key, int value) {
        Node n = map.get(key);
        if (n != null) {                 // 1) existing key: update, refresh recency
            n.val = value;
            unlink(n);
            addFront(n);
            return;
        }
        if (map.size() == capacity) {   // 2) new key and full: evict LRU
            Node lru = tail.prev;
            unlink(lru);
            map.remove(lru.key);
        }
        n = new Node(key, value);        // 3) insert as most recent
        addFront(n);
        map.put(key, n);
    }

    private void unlink(Node n) {
        n.prev.next = n.next;
        n.next.prev = n.prev;
    }

    private void addFront(Node n) {
        n.next = head.next;
        n.prev = head;
        head.next.prev = n;
        head.next = n;
    }
}`,
        alt: [{ lang: 'python', code: `class Node:
    __slots__ = ("key", "val", "prev", "next")
    def __init__(self, key=0, val=0):
        self.key, self.val = key, val
        self.prev = self.next = None

class LRUCache:
    def __init__(self, capacity: int):
        self.cap = capacity
        self.map = {}
        self.head, self.tail = Node(), Node()      # sentinels
        self.head.next, self.tail.prev = self.tail, self.head

    def _unlink(self, n):
        n.prev.next, n.next.prev = n.next, n.prev

    def _add_front(self, n):
        n.prev, n.next = self.head, self.head.next
        self.head.next.prev = n
        self.head.next = n

    def get(self, key: int) -> int:
        n = self.map.get(key)
        if n is None:
            return -1
        self._unlink(n); self._add_front(n)
        return n.val

    def put(self, key: int, value: int) -> None:
        n = self.map.get(key)
        if n:
            n.val = value
            self._unlink(n); self._add_front(n)
            return
        if len(self.map) == self.cap:
            lru = self.tail.prev
            self._unlink(lru)
            del self.map[lru.key]
        n = Node(key, value)
        self._add_front(n)
        self.map[key] = n` },
        { lang: 'js', code: `class Node {
  constructor(key = 0, val = 0) { this.key = key; this.val = val; this.prev = null; this.next = null; }
}

class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map();                          // key -> node
    this.head = new Node();                        // sentinel: head.next = most recent
    this.tail = new Node();                        // sentinel: tail.prev = least recent
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  get(key) {
    const n = this.map.get(key);
    if (n === undefined) return -1;
    this.unlink(n);                                // move to front = most recently used
    this.addFront(n);
    return n.val;
  }

  put(key, value) {
    let n = this.map.get(key);
    if (n !== undefined) {                         // 1) existing key: update, refresh recency
      n.val = value;
      this.unlink(n);
      this.addFront(n);
      return;
    }
    if (this.map.size === this.capacity) {         // 2) new key and full: evict LRU
      const lru = this.tail.prev;
      this.unlink(lru);
      this.map.delete(lru.key);
    }
    n = new Node(key, value);                      // 3) insert as most recent
    this.addFront(n);
    this.map.set(key, n);
  }

  unlink(n) {
    n.prev.next = n.next;
    n.next.prev = n.prev;
  }

  addFront(n) {
    n.next = this.head.next;
    n.prev = this.head;
    this.head.next.prev = n;
    this.head.next = n;
  }
}` },
        { lang: 'cpp', code: `class LRUCache {
    struct Node {
        int key, val;
        Node *prev = nullptr, *next = nullptr;
        Node(int k, int v) : key(k), val(v) {}
    };

    int capacity;
    unordered_map<int, Node*> map;           // key -> its node
    Node head{0, 0}, tail{0, 0};             // sentinels live inside the object

    void unlink(Node* n) {
        n->prev->next = n->next;
        n->next->prev = n->prev;
    }

    void addFront(Node* n) {
        n->next = head.next;
        n->prev = &head;
        head.next->prev = n;
        head.next = n;
    }

public:
    LRUCache(int capacity) : capacity(capacity) {
        head.next = &tail;
        tail.prev = &head;
    }

    ~LRUCache() {
        for (auto& [k, n] : map) delete n;   // free every real node
    }

    int get(int key) {
        auto it = map.find(key);
        if (it == map.end()) return -1;
        Node* n = it->second;
        unlink(n);                           // move to front = most recently used
        addFront(n);
        return n->val;
    }

    void put(int key, int value) {
        auto it = map.find(key);
        if (it != map.end()) {               // 1) existing key: update, refresh recency
            Node* n = it->second;
            n->val = value;
            unlink(n);
            addFront(n);
            return;
        }
        if ((int)map.size() == capacity) {   // 2) new key and full: evict LRU
            Node* lru = tail.prev;
            unlink(lru);
            map.erase(lru->key);
            delete lru;
        }
        Node* n = new Node(key, value);      // 3) insert as most recent
        addFront(n);
        map[key] = n;
    }
};` }],
        dry: {
          head: ['op', 'returns', 'list after (MRU → LRU)', 'map keys'],
          rows: [
            ['put(1,1)', '—', '1', '{1}'],
            ['put(2,2)', '—', '2, 1', '{1, 2}'],
            ['get(1)', '<span class="c-g">1</span>', '1, 2', '{1, 2}'],
            ['put(3,3)', '—', '3, 1  <span class="c-r">(evict 2)</span>', '{1, 3}'],
            ['get(2)', '<span class="c-r">-1</span>', '3, 1', '{1, 3}'],
            ['put(4,4)', '—', '4, 3  <span class="c-r">(evict 1)</span>', '{3, 4}'],
            ['get(3)', '<span class="c-g">3</span>', '3, 4', '{3, 4}']
          ]
        },
        complexity: `<p><b>Time O(1)</b> average per get/put: one HashMap operation plus a fixed number (≤ 8) of pointer writes. <b>Space O(capacity)</b>: one map entry and one node per cached key, plus two sentinels.</p>`,
        followUps: ['Make it thread-safe without one global lock (segments by key hash, or read buffers).', 'Add a TTL per key: lazy expiry on access + periodic sweep.', 'Evict by frequency instead (LFU, see practice).']
      }
    }]
  });

  // =====================================================================
  // Supplements for TOPIC 1 (basics) — visualizers, examples, deep dive, AI era, guided problem
  // =====================================================================
  Object.assign(topics[0], {
    viz: [{
      title: 'Singly linked list: insert & delete at head, tail and position',
      input: '10 20 30 | addFirst 5, addLast 40, insert 2 15, delete 0, deleteLast',
      inputLabel: 'list | operations: addFirst X, addLast X, insert POS X, delete POS, deleteLast',
      gen: function (input) {
        var halves = String(input === undefined ? '' : input).split('|');
        if (halves.length !== 2) throw new Error('Format: list values | operations, e.g. 10 20 30 | addFirst 5, delete 1');
        var vals = nums(halves[0], 9, 'List');
        var ops = halves[1].split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!ops.length) throw new Error('Add at least one operation after the |, e.g. addFirst 7');
        if (ops.length > 6) throw new Error('Please use at most 6 operations');
        var frames = [];
        function view(v, o) {
          o = o || {};
          var p = { type: 'list', label: o.label || 'singly linked list', values: v.length ? v.slice() : ['(empty)'], ptr: o.ptr || {}, hl: o.hl || {} };
          if (o.next) p.next = o.next;
          return p;
        }
        function hp(extra) { var p = {}; if (vals.length) addPtr(p, 0, 'head'); if (extra) Object.keys(extra).forEach(function (k) { addPtr(p, Number(k), extra[k]); }); return p; }
        function V(op) { return { type: 'vars', vals: { op: op, size: vals.length, head: vals.length ? vals[0] : 'null' } }; }
        frames.push({ narr: 'Our list: ' + (vals.length ? vals.join(' → ') + ' → null' : 'empty (head = null)') + '. We only remember <b>head</b>. To reach any other node we must walk from head, one <code>next</code> at a time.', parts: [view(vals, { ptr: hp() }), V('-')] });
        function addFirst(x, why) {
          var v = [x].concat(vals), p = {}; addPtr(p, 0, 'newNode'); if (vals.length) addPtr(p, 1, 'head');
          frames.push({ narr: (why || '') + 'Create node <b>' + x + '</b> and set <code>newNode.next = head</code>' + (vals.length ? ' (it now points at ' + vals[0] + ')' : ' (null, the list was empty)') + '. Nobody else moved.', parts: [view(v, { ptr: p, hl: { 0: 'ok' } }), V('addFirst ' + x)] });
          vals.unshift(x);
          frames.push({ narr: '<code>head = newNode</code>. Done in <b>O(1)</b> — two pointer writes, no matter how long the list is. (An array would shift every element.)', parts: [view(vals, { ptr: hp(), hl: { 0: 'ok' } }), V('addFirst ' + x)] });
        }
        ops.forEach(function (op) {
          var m1 = op.match(/^addFirst\s+(-?\d+)$/i), m2 = op.match(/^addLast\s+(-?\d+)$/i), m3 = op.match(/^insert\s+(-?\d+)\s+(-?\d+)$/i), m4 = op.match(/^delete\s+(-?\d+)$/i), m5 = /^deleteLast$/i.test(op);
          if (!m1 && !m2 && !m3 && !m4 && !m5) throw new Error('Unknown operation "' + op + '". Use addFirst X, addLast X, insert POS X, delete POS or deleteLast.');
          if ((m1 || m2 || m3) && vals.length >= 11) { frames.push({ narr: '<span class="c-r">Skip "' + H.esc(op) + '"</span>: the picture is capped at 11 nodes.', parts: [view(vals, { ptr: hp() }), V(op)] }); return; }
          var i, x, P, h;
          if (m1) { addFirst(Number(m1[1])); return; }
          if (m2) {
            x = Number(m2[1]);
            if (!vals.length) { addFirst(x, 'The list is empty, so the new node simply becomes the head (special case!). '); return; }
            for (i = 0; i < vals.length; i++) {
              frames.push({ narr: i === vals.length - 1 ? 'curr = ' + vals[i] + ' and <code>curr.next == null</code> → curr is the <b>last</b> node. Stop walking.' : 'Walking to the tail: curr = ' + vals[i] + ', curr.next is not null → <code>curr = curr.next</code>. (This walk is why addLast is O(N) without a tail pointer.)', parts: [view(vals, { ptr: hp(obj(i, 'curr')), hl: obj(i, 'cur') }), V('addLast ' + x)] });
            }
            vals.push(x);
            h = obj(vals.length - 1, 'ok'); h[vals.length - 2] = 'cur';
            frames.push({ narr: '<code>curr.next = newNode</code>. ' + x + ' is the new last node and its next is null.', parts: [view(vals, { ptr: hp(obj(vals.length - 2, 'curr')), hl: h }), V('addLast ' + x)] });
            return;
          }
          if (m3) {
            P = Number(m3[1]); x = Number(m3[2]);
            if (P < 0 || P > vals.length) { frames.push({ narr: '<span class="c-r">Skip "' + H.esc(op) + '"</span>: position must be 0..' + vals.length + '.', parts: [view(vals, { ptr: hp() }), V(op)] }); return; }
            if (P === 0) { addFirst(x, '<b>Position 0 means the head changes</b> — without a dummy node this is a special case. '); return; }
            for (i = 0; i <= P - 1; i++) {
              frames.push({ narr: 'Insert ' + x + ' at position ' + P + ': we need the node <b>before</b> that spot (prev, at position ' + (P - 1) + '). prev is on ' + vals[i] + (i < P - 1 ? ', keep walking.' : ' — found it.'), parts: [view(vals, { ptr: hp(obj(i, 'prev')), hl: obj(i, 'cur') }), V(op)] });
            }
            var nv = vals.slice(); nv.splice(P, 0, x);
            var nx = seqNext(nv.length); nx[P - 1] = P + 1 < nv.length ? P + 1 : -1;
            h = obj(P, 'ok'); h[P - 1] = 'cur';
            var pp = hp(obj(P - 1, 'prev')); addPtr(pp, P, 'newNode');
            frames.push({ narr: 'Step 1: <code>newNode.next = prev.next</code>. The new node grabs the rest of the chain <b>first</b>; prev still points past it (see the note on prev). If we did step 2 first, the rest of the list would be lost.', parts: [view(nv, { ptr: pp, hl: h, next: nx }), V(op)] });
            vals = nv;
            frames.push({ narr: 'Step 2: <code>prev.next = newNode</code>. The chain is whole again: walk cost O(P), relinking O(1).', parts: [view(vals, { ptr: hp(obj(P - 1, 'prev')), hl: h }), V(op)] });
            return;
          }
          if (m4) {
            P = Number(m4[1]);
            if (P < 0 || P >= vals.length) { frames.push({ narr: '<span class="c-r">Skip "' + H.esc(op) + '"</span>: there is no node at position ' + P + '.', parts: [view(vals, { ptr: hp() }), V(op)] }); return; }
            if (P === 0) {
              frames.push({ narr: '<b>Delete position 0 = delete the head</b> (special case without a dummy). There is no node before it, so instead we move head forward: <code>head = head.next</code>.', parts: [view(vals, { ptr: hp(), hl: { 0: 'bad' } }), V(op)] });
              var gone = vals.shift();
              frames.push({ narr: 'Node ' + gone + ' is unreachable now, so the garbage collector reclaims it (in C++ you <code>delete</code> it). O(1).', parts: [view(vals, { ptr: hp(), hl: obj(0, 'ok') }), V(op)] });
              return;
            }
            for (i = 0; i <= P - 1; i++) {
              h = obj(i, 'cur'); h[P] = 'bad';
              frames.push({ narr: 'Delete position ' + P + ' (value ' + vals[P] + '): walk prev to position ' + (P - 1) + '. prev = ' + vals[i] + (i < P - 1 ? ', keep walking.' : ' — stop, the victim is prev.next.'), parts: [view(vals, { ptr: hp(obj(i, 'prev')), hl: h }), V(op)] });
            }
            var dn = seqNext(vals.length); dn[P - 1] = P + 1 < vals.length ? P + 1 : -1;
            h = obj(P, 'bad'); h[P - 1] = 'cur';
            frames.push({ narr: '<code>prev.next = prev.next.next</code>: prev now skips ' + vals[P] + '. Nobody points to it any more.', parts: [view(vals, { ptr: hp(obj(P - 1, 'prev')), hl: h, next: dn }), V(op)] });
            vals.splice(P, 1);
            frames.push({ narr: 'Deleted. The list is one node shorter.', parts: [view(vals, { ptr: hp() }), V(op)] });
            return;
          }
          // deleteLast
          if (!vals.length) { frames.push({ narr: '<span class="c-r">Skip deleteLast</span>: the list is empty.', parts: [view(vals), V(op)] }); return; }
          if (vals.length === 1) {
            frames.push({ narr: 'Only one node: deleting the last node also deletes the head → <code>head = null</code> (special case).', parts: [view(vals, { ptr: hp(), hl: { 0: 'bad' } }), V(op)] });
            vals = [];
            frames.push({ narr: 'The list is empty now.', parts: [view(vals), V(op)] });
            return;
          }
          for (i = 0; i <= vals.length - 2; i++) {
            h = obj(i, 'cur'); h[vals.length - 1] = 'bad';
            frames.push({ narr: 'deleteLast needs the <b>second-last</b> node (a singly list cannot step backwards from the tail). curr = ' + vals[i] + (i < vals.length - 2 ? ': curr.next.next is not null, keep walking.' : ': curr.next.next is null → curr is second-last.'), parts: [view(vals, { ptr: hp(obj(i, 'curr')), hl: h }), V(op)] });
          }
          var ln = seqNext(vals.length); ln[vals.length - 2] = -1;
          h = obj(vals.length - 1, 'bad'); h[vals.length - 2] = 'cur';
          frames.push({ narr: '<code>curr.next = null</code> cuts off the last node. O(N) because of the walk — a doubly linked list with a tail pointer does this in O(1).', parts: [view(vals, { ptr: hp(obj(vals.length - 2, 'curr')), hl: h, next: ln }), V(op)] });
          vals.pop();
          frames.push({ narr: 'Deleted the tail.', parts: [view(vals, { ptr: hp() }), V(op)] });
        });
        frames.push({ narr: 'Final list: ' + (vals.length ? vals.join(' → ') + ' → null' : 'empty') + '. Notice the pattern: <b>find the node before the spot, then relink in the safe order</b>. Head and empty-list cases needed extra branches — the dummy node (next topic) removes them.', parts: [view(vals, { ptr: hp(), hl: obj(0, 'sel') })] });
        return frames;
      }
    }, {
      title: 'Doubly linked list: O(1) remove / insert of a node you already hold',
      input: '1 2 3 4 | remove 3, insertAfter 1 9, addFirst 0, removeLast',
      inputLabel: 'list | operations: remove V, insertAfter V X, addFirst X, removeLast',
      gen: function (input) {
        var halves = String(input === undefined ? '' : input).split('|');
        if (halves.length !== 2) throw new Error('Format: list values | operations, e.g. 1 2 3 | remove 2');
        var init = nums(halves[0], 8, 'List');
        var ops = halves[1].split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!ops.length) throw new Error('Add at least one operation after the |, e.g. remove 2');
        if (ops.length > 5) throw new Error('Please use at most 5 operations');
        var nodes = [], head = -1, tail = -1, frames = [];
        init.forEach(function (v, i) { nodes.push({ v: v, prev: i - 1, next: i + 1 < init.length ? i + 1 : -1 }); });
        if (init.length) { head = 0; tail = init.length - 1; }
        function walk(start, dir) { var out = [], c = start, g = 0; while (c !== -1 && g++ < 20) { out.push(c); c = nodes[c][dir]; } return out; }
        function views(hlId, cls, codeTxt, line) {
          var fw = walk(head, 'next'), bw = walk(tail, 'prev');
          function mk(ids, label, endName) {
            var hl = {}, ptr = {};
            ids.forEach(function (id, i) { if (id === hlId) hl[i] = cls; });
            if (ids.length) addPtr(ptr, 0, endName);
            return { type: 'list', label: label, values: ids.length ? ids.map(function (id) { return nodes[id].v; }) : ['(empty)'], hl: hl, ptr: ptr };
          }
          var parts = [mk(fw, 'forward walk: head → … via next', 'head'), mk(bw, 'backward walk: tail → … via prev', 'tail'),
            { type: 'vars', vals: { head: head >= 0 ? nodes[head].v : 'null', tail: tail >= 0 ? nodes[tail].v : 'null', size: fw.length } }];
          if (codeTxt) parts.push({ type: 'code', label: 'code', lang: 'java', code: codeTxt, hl: line ? obj(line, 'cur') : {}, alt: ALT_OF[codeTxt] });
          return parts;
        }
        function find(v) { var ids = walk(head, 'next'); for (var i = 0; i < ids.length; i++) if (nodes[ids[i]].v === v) return ids[i]; return -1; }
        frames.push({ narr: 'A doubly linked list. Every node has <b>next</b> and <b>prev</b>. The two rows are the same list walked both ways — they must always be mirror images. If they disagree, a link is half-fixed.', parts: views() });
        var RM = 'if (node.prev != null) node.prev.next = node.next;\nelse head = node.next;\nif (node.next != null) node.next.prev = node.prev;\nelse tail = node.prev;\nnode.prev = node.next = null;';
        var INS = 'DNode node = new DNode(x);\nnode.prev = at; node.next = at.next;\nif (at.next != null) at.next.prev = node;\nelse tail = node;\nat.next = node;';
        var AF = 'DNode node = new DNode(x);\nnode.next = head;\nif (head != null) head.prev = node;\nelse tail = node;\nhead = node;';
        var ALT_OF = {}; ALT_OF[RM] = DLL_ALT.rm; ALT_OF[INS] = DLL_ALT.ins; ALT_OF[AF] = DLL_ALT.af;
        function remove(id, label) {
          var nd = nodes[id];
          frames.push({ narr: label + ': we already <b>hold</b> node ' + nd.v + ' (e.g. a HashMap gave it to us). No walking needed — it knows both neighbours: prev = ' + (nd.prev >= 0 ? nodes[nd.prev].v : 'null') + ', next = ' + (nd.next >= 0 ? nodes[nd.next].v : 'null') + '.', parts: views(id, 'cur', RM, 0) });
          if (nd.prev >= 0) nodes[nd.prev].next = nd.next; else head = nd.next;
          frames.push({ narr: (nd.prev >= 0 ? '<code>node.prev.next = node.next</code>: walking forward now skips ' + nd.v + '.' : 'It was the head, so <code>head = node.next</code>.') + ' But look at the backward row: <span class="c-r">it still reaches ' + nd.v + '</span> — only half the surgery is done.', parts: views(id, 'bad', RM, nd.prev >= 0 ? 1 : 2) });
          if (nd.next >= 0) nodes[nd.next].prev = nd.prev; else tail = nd.prev;
          frames.push({ narr: (nd.next >= 0 ? '<code>node.next.prev = node.prev</code>' : 'It was the tail, so <code>tail = node.prev</code>') + ': now both walks skip ' + nd.v + '. Forgetting this line is the #1 doubly-linked-list bug.', parts: views(id, 'bad', RM, nd.next >= 0 ? 3 : 4) });
          nd.prev = nd.next = -1;
          frames.push({ narr: 'Clear the removed node\'s own links (good hygiene: no dangling references). Total: <b>O(1)</b>, a handful of pointer writes.', parts: views(-1, '', RM, 5) });
        }
        ops.forEach(function (op) {
          var a = op.match(/^remove\s+(-?\d+)$/i), b = op.match(/^insertAfter\s+(-?\d+)\s+(-?\d+)$/i), c = op.match(/^addFirst\s+(-?\d+)$/i), d = /^removeLast$/i.test(op);
          if (!a && !b && !c && !d) throw new Error('Unknown operation "' + op + '". Use remove V, insertAfter V X, addFirst X or removeLast.');
          if ((b || c) && walk(head, 'next').length >= 10) { frames.push({ narr: '<span class="c-r">Skip "' + H.esc(op) + '"</span>: the picture is capped at 10 nodes.', parts: views() }); return; }
          if (a) { var id = find(Number(a[1])); if (id < 0) { frames.push({ narr: '<span class="c-r">Skip</span>: value ' + a[1] + ' is not in the list.', parts: views() }); return; } remove(id, '<b>remove(' + a[1] + ')</b>'); return; }
          if (d) { if (tail < 0) { frames.push({ narr: '<span class="c-r">Skip removeLast</span>: the list is empty.', parts: views() }); return; } remove(tail, '<b>removeLast()</b> is just remove(tail) — O(1), unlike a singly list'); return; }
          if (b) {
            var at = find(Number(b[1])), x = Number(b[2]);
            if (at < 0) { frames.push({ narr: '<span class="c-r">Skip</span>: value ' + b[1] + ' is not in the list.', parts: views() }); return; }
            var nid = nodes.length, after = nodes[at].next;
            nodes.push({ v: x, prev: at, next: after });
            frames.push({ narr: '<b>insertAfter(' + b[1] + ', ' + x + ')</b>: create node ' + x + ' and set its <b>own</b> two links first (prev = ' + b[1] + ', next = ' + (after >= 0 ? nodes[after].v : 'null') + '). Both rows are unchanged — nobody points <i>to</i> the new node yet, so this step is always safe.', parts: views(at, 'cur', INS, 2) });
            if (after >= 0) nodes[after].prev = nid; else tail = nid;
            frames.push({ narr: (after >= 0 ? '<code>at.next.prev = node</code>: the backward walk now passes through ' + x + '.' : '<code>at</code> was the tail, so <code>tail = node</code>.') + ' The forward walk does not see it yet.', parts: views(nid, 'ok', INS, after >= 0 ? 3 : 4) });
            nodes[at].next = nid;
            frames.push({ narr: '<code>at.next = node</code>: both walks agree again. Four pointer writes → <b>O(1)</b>.', parts: views(nid, 'ok', INS, 5) });
            return;
          }
          var y = Number(c[1]), fid = nodes.length;
          nodes.push({ v: y, prev: -1, next: head });
          frames.push({ narr: '<b>addFirst(' + y + ')</b>: new node points forward to the old head (' + (head >= 0 ? nodes[head].v : 'null') + '). Its prev stays null.', parts: views(head, 'cur', AF, 2) });
          if (head >= 0) nodes[head].prev = fid; else tail = fid;
          frames.push({ narr: head >= 0 ? '<code>head.prev = node</code>: the backward walk now ends at ' + y + '.' : 'The list was empty, so the node is also the tail.', parts: views(fid, 'ok', AF, head >= 0 ? 3 : 4) });
          head = fid;
          frames.push({ narr: '<code>head = node</code>. O(1).', parts: views(fid, 'ok', AF, 5) });
        });
        frames.push({ narr: 'Final list. Rule of thumb for DLL surgery: <b>every link you cut or add has a twin in the other direction</b> — fix both, and fix head/tail when you touch an end.', parts: views() });
        return frames;
      }
    }],
    examples: [
      {
        title: 'Front inserts: dynamic array vs linked list',
        html: `<p>Insert 100,000 numbers at the <b>front</b>. A dynamic array (<code>ArrayList.add(0, x)</code>, Python <code>list.insert(0, x)</code>, JS <code>array.unshift(x)</code>, C++ <code>vector.insert(v.begin(), x)</code>) shifts every existing element each time → about 5·10<sup>9</sup> element moves in total (O(N<sup>2</sup>)). A linked list's add-at-front (<code>LinkedList.addFirst</code>, C++ <code>list.push_front</code>) is two pointer writes each → O(N). But reading by index flips the picture: <code>linked.get(i)</code> inside a loop is O(N<sup>2</sup>) — always walk a linked list with its iterator (for-each).</p>`,
        code: { lang: 'java', code: `List<Integer> arr = new ArrayList<>();
LinkedList<Integer> linked = new LinkedList<>();
for (int i = 0; i < 100_000; i++) {
    arr.add(0, i);          // shifts every existing element: O(N) each
    linked.addFirst(i);     // two pointer writes: O(1) each
}
long sum = 0;
for (int i = 0; i < arr.size(); i++) sum += arr.get(i);   // O(1) per get on an array
for (int x : linked) sum += x;                             // iterator: O(1) per step
System.out.println(sum);`,
        alt: [
          { lang: 'python', code: `from collections import deque

arr, front = [], deque()
for i in range(100_000):
    arr.insert(0, i)        # shifts every existing element: O(N) each
    front.appendleft(i)     # deque (a linked list of blocks): O(1) each
total = sum(arr) + sum(front)   # walking each one in order is O(1) per step
print(total)` },
          { lang: 'js', code: `// JS has no built-in linked list: arrays are the default, so build nodes yourself.
class Node { constructor(val, next = null) { this.val = val; this.next = next; } }

const arr = [];
let head = null;
for (let i = 0; i < 100000; i++) {
  arr.unshift(i);           // shifts every existing element: O(N) each
  head = new Node(i, head); // two pointer writes: O(1) each
}
let sum = 0;
for (let i = 0; i < arr.length; i++) sum += arr[i];   // O(1) per index on an array
for (let c = head; c !== null; c = c.next) sum += c.val;   // O(1) per step on a list
console.log(sum);` },
          { lang: 'cpp', code: `vector<int> arr;
list<int> linked;                       // std::list is a doubly linked list
for (int i = 0; i < 100000; i++) {
    arr.insert(arr.begin(), i);         // shifts every existing element: O(N) each
    linked.push_front(i);               // two pointer writes: O(1) each
}
long long sum = 0;
for (size_t i = 0; i < arr.size(); i++) sum += arr[i];   // O(1) per index on a vector
for (int x : linked) sum += x;                           // iterator: O(1) per step
cout << sum << "\\n";` }
        ] }
      },
      {
        title: 'Delete the first node with a given value (no dummy yet)',
        html: `<p>List ${H.c('m', '7 → 3 → 7 → 9')}, delete value 7. The first 7 is the <b>head</b>, which has no node before it, so the code needs its own branch: return <code>head.next</code>. For any other position we stop on the node <b>before</b> the target and skip it. Count the special cases: empty list, head match, not found — the next topic deletes most of them.</p>`,
        code: { lang: 'java', code: `
ListNode deleteValue(ListNode head, int target) {
    if (head == null) return null;               // empty list
    if (head.val == target) return head.next;    // special case: the head itself goes
    ListNode prev = head;
    while (prev.next != null && prev.next.val != target) prev = prev.next;
    if (prev.next != null) prev.next = prev.next.next;   // found: skip it
    return head;                                 // head did not change
}`,
        alt: [
          { lang: 'python', code: `def delete_value(head, target):
    if head is None:                             # empty list
        return None
    if head.val == target:                       # special case: the head itself goes
        return head.next
    prev = head
    while prev.next and prev.next.val != target:
        prev = prev.next
    if prev.next:                                # found: skip it
        prev.next = prev.next.next
    return head                                  # head did not change` },
          { lang: 'js', code: `function deleteValue(head, target) {
  if (head === null) return null;                // empty list
  if (head.val === target) return head.next;     // special case: the head itself goes
  let prev = head;
  while (prev.next !== null && prev.next.val !== target) prev = prev.next;
  if (prev.next !== null) prev.next = prev.next.next;   // found: skip it
  return head;                                   // head did not change
}` },
          { lang: 'cpp', code: `struct ListNode { int val; ListNode* next; ListNode(int x = 0, ListNode* n = nullptr) : val(x), next(n) {} };

ListNode* deleteValue(ListNode* head, int target) {
    if (!head) return nullptr;                   // empty list
    if (head->val == target) {                   // special case: the head itself goes
        ListNode* rest = head->next;
        delete head;
        return rest;
    }
    ListNode* prev = head;
    while (prev->next && prev->next->val != target) prev = prev->next;
    if (prev->next) {                            // found: skip it and free it
        ListNode* gone = prev->next;
        prev->next = gone->next;
        delete gone;
    }
    return head;                                 // head did not change
}` }
        ] }
      },
      {
        title: 'Built-in linked lists (Java LinkedList, C++ std::list)',
        html: `<p><code>java.util.LinkedList</code> and C++ <code>std::list</code> are doubly linked lists: they keep pointers to the first and last nodes, and every node has <code>prev</code>/<code>next</code>. So adding or removing at either end is O(1), and removing through an iterator is O(1) because the iterator is already holding the node. Getting the i-th item still walks the list — O(N). Python and JavaScript have no linked list in the standard library: Python's <code>collections.deque</code> is a linked list of fixed-size blocks (O(1) at both ends, but O(N) in the middle), and in JS you write your own node class.</p>`,
        code: { lang: 'java', code: `LinkedList<Integer> list = new LinkedList<>(List.of(1, 2, 3, 4, 5, 6));
ListIterator<Integer> it = list.listIterator();
while (it.hasNext()) {
    if (it.next() % 2 == 0) it.remove();   // O(1): the iterator holds the node
}
System.out.println(list);                  // [1, 3, 5]
System.out.println(list.peekLast());       // 5, O(1) thanks to the tail pointer`,
        alt: [
          { lang: 'python', run: true, code: `from collections import deque

d = deque([1, 2, 3, 4, 5, 6])   # a linked list of blocks: fast at both ends
d.appendleft(0)                 # O(1)
d.pop()                         # O(1): removes 6
d.remove(3)                     # O(N): has to search the middle
print(list(d), d[-1])           # [0, 1, 2, 4, 5] 5` },
          { lang: 'js', run: true, code: `// No built-in linked list in JS: removing through a node you hold is still O(1) if you keep prev.
class Node { constructor(val, next = null) { this.val = val; this.next = next; } }
let head = [6, 5, 4, 3, 2, 1].reduce((next, v) => new Node(v, next), null);

const dummy = new Node(0, head);
for (let prev = dummy; prev.next !== null; ) {
  if (prev.next.val % 2 === 0) prev.next = prev.next.next;   // O(1): we hold the node before it
  else prev = prev.next;
}
const out = [];
for (let c = dummy.next; c !== null; c = c.next) out.push(c.val);
console.log(out);                              // [ 1, 3, 5 ]` },
          { lang: 'cpp', code: `list<int> lst = {1, 2, 3, 4, 5, 6};
for (auto it = lst.begin(); it != lst.end(); ) {
    if (*it % 2 == 0) it = lst.erase(it);    // O(1): the iterator holds the node
    else ++it;
}
for (int x : lst) cout << x << ' ';          // 1 3 5
cout << "| back = " << lst.back() << "\\n";   // 5, O(1) thanks to the tail pointer` }
        ] }
      },
      {
        title: 'Helper you will write in every practice session: array → list',
        html: `<p>LeetCode builds the input list for you, but when you test locally you need a builder. Using a <b>dummy + tail</b> means no "is it the first node?" check. Building is O(N); printing is the traversal loop from the topic code.</p>`,
        code: { lang: 'java', code: `
ListNode build(int[] a) {
    ListNode dummy = new ListNode(0), tail = dummy;
    for (int x : a) {
        tail.next = new ListNode(x);   // hang a new node after the current tail
        tail = tail.next;              // and step onto it
    }
    return dummy.next;                 // real head (null if a is empty)
}`,
        alt: [
          { lang: 'python', code: `def build(a):
    dummy = tail = ListNode(0)
    for x in a:
        tail.next = ListNode(x)        # hang a new node after the current tail
        tail = tail.next               # and step onto it
    return dummy.next                  # real head (None if a is empty)` },
          { lang: 'js', code: `function build(a) {
  const dummy = new ListNode(0);
  let tail = dummy;
  for (const x of a) {
    tail.next = new ListNode(x);       // hang a new node after the current tail
    tail = tail.next;                  // and step onto it
  }
  return dummy.next;                   // real head (null if a is empty)
}` },
          { lang: 'cpp', code: `struct ListNode { int val; ListNode* next; ListNode(int x = 0, ListNode* n = nullptr) : val(x), next(n) {} };

ListNode* build(const vector<int>& a) {
    ListNode dummy;                    // on the stack: nothing to free
    ListNode* tail = &dummy;
    for (int x : a) {
        tail->next = new ListNode(x);  // hang a new node after the current tail
        tail = tail->next;             // and step onto it
    }
    return dummy.next;                 // real head (nullptr if a is empty)
}` }
        ] }
      }
    ],
    deepDive: `<h4>What a node really costs</h4>
<p>On a 64-bit JVM with compressed references, a <code>ListNode{int val; ListNode next;}</code> is about <b>24 bytes</b> (12-byte object header + 4-byte int + 4-byte reference = 20, padded to a multiple of 8), versus <b>4 bytes</b> per element in an <code>int[]</code>. <code>LinkedList&lt;Integer&gt;</code> is worse: a 24-byte node <b>plus</b> a 16-byte boxed Integer per element. Memory is 5–10× an array. Other languages pay too: a Python node object (even with <code>__slots__</code>) is roughly 48 bytes plus the int object it points to; a C++ <code>struct { int val; ListNode* next; }</code> is 16 bytes plus the allocator's bookkeeping for every <code>new</code>.</p>
<h4>Pointer chasing and the CPU cache</h4>
<p>Arrays are one contiguous block, so the CPU prefetches the next elements for free. List nodes can be scattered across the heap; each <code>curr = curr.next</code> may be a cache miss (~100 ns from RAM vs ~1 ns from L1). That is why in practice <code>ArrayList</code> and <code>ArrayDeque</code> beat <code>LinkedList</code> even for many workloads where Big-O says the list should win. Big-O counts steps; hardware charges different prices per step.</p>
<h4>Where linked lists genuinely win</h4>
<ul><li>You already <b>hold a handle</b> to a node and must remove/move it in O(1): LRU caches, schedulers, timer wheels, the OS ready queue.</li>
<li><b>Intrusive lists</b> (the Linux kernel's <code>list_head</code>): the links live inside the object itself, so one object can sit in several lists with zero extra allocation.</li>
<li>Splicing: moving a whole run of nodes from one list to another is O(1) (just re-hook the ends).</li>
<li>Persistent/immutable lists in functional languages share tails safely between versions.</li></ul>
<h4>Edge cases checklist</h4>
<p>Empty list · one node · operating on the head · operating on the tail · position = size (append) · position out of range · in a DLL: updating <code>head</code>/<code>tail</code> whenever you touch an end · Java's <code>LinkedList</code> iterators are <b>fail-fast</b>: modifying the list outside the iterator throws <code>ConcurrentModificationException</code>.</p>
<h4>Variants</h4>
<p><b>Circular</b> lists (tail.next = head) for round-robin; <b>circular DLL with one sentinel</b> (sentinel.next = first, sentinel.prev = last) removes every null check; the <b>XOR list</b> stores <code>prev ^ next</code> in one field (C/C++ only — impossible with Java references).</p>`,
    aiEra: `<p><b>What AI changes:</b> an assistant writes a full linked-list class in seconds, so writing boilerplate is no longer the skill. The skill is <b>pointer reasoning</b>: in what order to rewrite links, which edge cases exist, and whether a list is even the right structure (often it is not — see the cache-miss discussion).</p>
<p><b>Use AI as a partner:</b> ask <code>Give me 8 edge-case inputs for insertAt(pos, val) on a singly list, including empty list, pos = 0 and pos = size; don't write the code</code>, or <code>Draw the next/prev pointers as ASCII after each line of this DLL remove()</code>. Then run your own code against those cases.</p>
<p><b>Where AI goes wrong:</b> it relinks in the wrong order (losing the rest of the chain), forgets to update <code>prev</code> or <code>tail</code> in a DLL, uses <code>list.get(i)</code> inside a loop on <code>LinkedList</code> (hidden O(N<sup>2</sup>)), or recommends <code>LinkedList</code> as a queue when <code>ArrayDeque</code> is faster.</p>
<p><b>What you must still own:</b> drawing the boxes and arrows yourself, predicting the state after each line, and explaining why O(1) insert only holds when you already stand at the spot. In live whiteboard-style interviews, that is exactly what is graded.</p>`,
    problems: [{
      title: 'Delete Node in a Linked List (you only get the node)',
      level: 'Medium',
      tags: ['linked list', 'trick'],
      companies: ['Microsoft', 'Apple', 'Adobe'],
      statement: `<p>You are given <b>only</b> a reference to a node <code>node</code> inside a singly linked list — <b>not</b> the head. Delete that node from the list. It is guaranteed that <code>node</code> is <b>not the tail</b> and all values are unique. "Delete" means: the value of <code>node</code> no longer appears, the list is one shorter, and the order of the other values is unchanged.</p>`,
      constraints: `2 ≤ number of nodes ≤ 1000, -1000 ≤ Node.val ≤ 1000, values are unique, node is not the last node`,
      example: `${chain([4, 5, 1, 9], { 1: 'r' })}<p>node = ${H.c('r', '5')} → output ${H.c('g', '4 → 1 → 9')}. We cannot reach 4 (no head, no prev pointer), so we cannot change 4.next. Instead we make node <b>become</b> its successor: copy 1 into it, then skip the old 1.</p>`,
      brute: {
        why: `<p>Shift every later value one step to the left (node gets 1, next gets 9, …), then cut off the last node. It produces the right list, but it touches every node after <code>node</code> — <b>O(N)</b> — when only the immediate neighbour matters.</p>`,
        code: {
          lang: 'java',
          code: `
void deleteNode(ListNode node) {
    while (node.next.next != null) {      // shift every later value one step left
        node.val = node.next.val;
        node = node.next;
    }
    node.val = node.next.val;            // copy the last value
    node.next = null;                    // drop the (now duplicate) tail
}`,
          alt: [
            { lang: 'python', code: `class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.vals = {}
        self.last_used = {}
        self.clock = 0

    def get(self, key):
        if key not in self.vals:
            return -1
        self.last_used[key] = self.clock
        self.clock += 1
        return self.vals[key]

    def put(self, key, value):
        if key not in self.vals and len(self.vals) == self.capacity:
            victim = -1
            oldest = float("inf")
            for k, t in self.last_used.items():     # O(N) scan
                if t < oldest:
                    oldest = t
                    victim = k
            del self.vals[victim]
            del self.last_used[victim]
        self.vals[key] = value
        self.last_used[key] = self.clock
        self.clock += 1` },
            { lang: 'js', code: `class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.vals = new Map();
    this.lastUsed = new Map();
    this.clock = 0;
  }

  get(key) {
    if (!this.vals.has(key)) return -1;
    this.lastUsed.set(key, this.clock++);
    return this.vals.get(key);
  }

  put(key, value) {
    if (!this.vals.has(key) && this.vals.size === this.capacity) {
      let victim = -1;
      let oldest = Infinity;
      for (const [k, t] of this.lastUsed) {         // O(N) scan
        if (t < oldest) { oldest = t; victim = k; }
      }
      this.vals.delete(victim);
      this.lastUsed.delete(victim);
    }
    this.vals.set(key, value);
    this.lastUsed.set(key, this.clock++);
  }
}` },
            { lang: 'cpp', code: `class LRUCache {
    int capacity;
    unordered_map<int, int> vals;
    unordered_map<int, long long> lastUsed;
    long long tick = 0;

public:
    LRUCache(int capacity) : capacity(capacity) {}

    int get(int key) {
        if (!vals.count(key)) return -1;
        lastUsed[key] = tick++;
        return vals[key];
    }

    void put(int key, int value) {
        if (!vals.count(key) && (int)vals.size() == capacity) {
            int victim = -1;
            long long oldest = LLONG_MAX;
            for (auto& e : lastUsed) {              // O(N) scan
                if (e.second < oldest) { oldest = e.second; victim = e.first; }
            }
            vals.erase(victim);
            lastUsed.erase(victim);
        }
        vals[key] = value;
        lastUsed[key] = tick++;
    }
};` }
          ]
        }
      },
      mcq: {
        q: 'You hold node X (not the tail) but not the node before it. How can X "disappear" from the list in O(1)?',
        options: ['Set X = null', 'Copy X.next\'s value into X, then X.next = X.next.next', 'Walk from X to find the previous node', 'It is impossible'],
        answer: 1,
        explain: 'Setting the local variable to null changes nothing in the list, and you cannot walk backwards. Copying the successor\'s value and skipping the successor makes the sequence of values exactly what deleting X would give.'
      },
      hints: [
        `<p>You cannot change the node <b>before</b> X. But you can change X itself and everything after it. What if X pretended to be its successor?</p>`,
        `<p>Two lines, no loop: copy the next node's value into X, then unlink the next node with <code>X.next = X.next.next</code>.</p>`,
        `<p>Why the "not the tail" guarantee matters: the tail has no successor to copy from. Real-world catch: other code holding a reference to the <b>successor</b> node now holds a detached node — the trick changes node identity, which is fine for this puzzle but not for caches keyed by node.</p>`
      ],
      // The harness can only hand over the first node, so every case deletes the head node
      // (the code never looks behind the node, so its position does not matter).
      tests: { sig: 'ListNode -> void', fn: 'deleteNode', mutate: 0, cases: [
        [[[4, 5, 1, 9]], [5, 1, 9]],
        [[[1, 2]], [2]],
        [[[-1000, 1000]], [1000]],
        [[[1, 2, 3]], [2, 3]],
        [[[0, -5, 7, 8, 9]], [-5, 7, 8, 9]],
        [[[10, 20, 30, 40, 50, 60]], [20, 30, 40, 50, 60]],
        [[{ $range: [-500, 500] }], { $range: [-499, 500] }]   // 1000 nodes (largest input)
      ] },
      solution: {
        approach: `<p>Turn X into a copy of its successor and remove the successor instead. Values come out exactly as if X were deleted.</p>`,
        code: `
class Solution {
    public void deleteNode(ListNode node) {
        ListNode next = node.next;   // guaranteed not null (node is not the tail)
        node.val = next.val;         // X takes over its successor's value...
        node.next = next.next;       // ...and the successor is skipped
        next.next = null;            // optional: detach the removed node completely
    }
}`,
        alt: [
          { lang: 'python', code: `class Solution:
    def delete_node(self, node):
        nxt = node.next          # exists: node is not the tail
        node.val = nxt.val       # node takes over its successor's value...
        node.next = nxt.next     # ...and the successor is skipped` },
          { lang: 'js', code: `function deleteNode(node) {
  const next = node.next;      // exists: node is not the tail
  node.val = next.val;         // node takes over its successor's value...
  node.next = next.next;       // ...and the successor is skipped
}` },
          { lang: 'cpp', code: `// LeetCode provides this node type; it is spelled out so the snippet compiles on its own.
struct ListNode {
    int val; ListNode* next;
    ListNode(int x = 0, ListNode* n = nullptr) : val(x), next(n) {}
};

class Solution {
public:
    void deleteNode(ListNode* node) {
        ListNode* next = node->next;   // exists: node is not the tail
        node->val = next->val;         // node takes over its successor's value...
        node->next = next->next;       // ...and the successor is skipped
        delete next;                   // C++ has no garbage collector: free it
    }
};` }
        ],
        dry: {
          head: ['step', 'list (by values)', 'note'],
          rows: [
            ['start', '4 → <span class="c-r">5</span> → 1 → 9', 'we hold node 5 only'],
            ['node.val = next.val', '4 → <span class="c-y">1</span> → 1 → 9', 'two nodes now show 1'],
            ['node.next = next.next', '4 → 1 → 9', '<span class="c-g">old second 1 skipped</span>'],
            ['done', '4 → 1 → 9', 'same as deleting 5']
          ]
        },
        complexity: `<p><b>Time O(1)</b>: one value copy and one pointer change, independent of list length. <b>Space O(1)</b>.</p>`,
        followUps: ['Why does this fail for the tail node?', 'Why is this trick dangerous if other objects hold references to list nodes (e.g. an LRU map)?']
      }
    }]
  });

  // =====================================================================
  // Supplements for TOPIC 2 (dummy node + remove N-th from end)
  // =====================================================================
  Object.assign(topics[1], {
    examples: [
      {
        title: 'Remove every 6 from 6 → 6 → 1 → 6 → 2',
        html: `<p>The first <b>two</b> heads must go — without a dummy you would need a loop just for "while head is 6, head = head.next". With the dummy, prev starts on D and the same two lines handle everything:</p>
${H.table(['prev on', 'prev.next', 'action', 'list after D'], [
  ['D', '6', H.c('r', 'skip'), '6 → 1 → 6 → 2'],
  ['D', '6', H.c('r', 'skip'), '1 → 6 → 2'],
  ['D', '1', 'move prev', '1 → 6 → 2'],
  ['1', '6', H.c('r', 'skip'), '1 → 2'],
  ['1', '2', 'move prev', '1 → 2'],
  ['2', 'null', 'stop', H.c('g', '1 → 2')]
])}
<p>Note: after a skip, prev does <b>not</b> move — the new prev.next might also be a 6.</p>`
      },
      {
        title: 'Two dummies: Partition List around x',
        html: `<p>Rearrange so all nodes &lt; x come before nodes ≥ x, keeping the original order inside each group. List ${H.c('m', '1 → 4 → 3 → 2 → 5 → 2')}, x = 3 → ${H.c('g', '1 → 2 → 2')} → ${H.c('b', '4 → 3 → 5')}. Build two lists with two dummies, then glue. The line <code>ge.next = null</code> matters: node 5 still points to the last 2, and without the cut you would create a cycle.</p>`,
        code: { lang: 'java', code: `
ListNode partition(ListNode head, int x) {
    ListNode lessDummy = new ListNode(0), less = lessDummy;
    ListNode geDummy = new ListNode(0), ge = geDummy;
    for (ListNode c = head; c != null; c = c.next) {
        if (c.val < x) { less.next = c; less = c; }   // append to the "small" list
        else           { ge.next = c;   ge = c; }     // append to the "big" list
    }
    ge.next = null;              // cut the old link, or we may create a cycle
    less.next = geDummy.next;    // glue: small part, then big part
    return lessDummy.next;
}`,
        alt: [
          { lang: 'python', code: `def partition(head, x):
    less_dummy = less = ListNode(0)
    ge_dummy = ge = ListNode(0)
    c = head
    while c:
        if c.val < x:
            less.next = less = c       # append to the "small" list
        else:
            ge.next = ge = c           # append to the "big" list
        c = c.next
    ge.next = None                     # cut the old link, or we may create a cycle
    less.next = ge_dummy.next          # glue: small part, then big part
    return less_dummy.next` },
          { lang: 'js', code: `function partition(head, x) {
  const lessDummy = new ListNode(0), geDummy = new ListNode(0);
  let less = lessDummy, ge = geDummy;
  for (let c = head; c !== null; c = c.next) {
    if (c.val < x) { less.next = c; less = c; }   // append to the "small" list
    else { ge.next = c; ge = c; }                 // append to the "big" list
  }
  ge.next = null;              // cut the old link, or we may create a cycle
  less.next = geDummy.next;    // glue: small part, then big part
  return lessDummy.next;
}` },
          { lang: 'cpp', code: `struct ListNode { int val; ListNode* next; ListNode(int x = 0, ListNode* n = nullptr) : val(x), next(n) {} };

ListNode* partition(ListNode* head, int x) {
    ListNode lessDummy, geDummy;               // two signboards on the stack
    ListNode *less = &lessDummy, *ge = &geDummy;
    for (ListNode* c = head; c; c = c->next) {
        if (c->val < x) { less->next = c; less = c; }   // append to the "small" list
        else            { ge->next = c;   ge = c; }     // append to the "big" list
    }
    ge->next = nullptr;              // cut the old link, or we may create a cycle
    less->next = geDummy.next;       // glue: small part, then big part
    return lessDummy.next;
}` }
        ] }
      },
      {
        title: 'Remove N-th from end when N = length (the head goes)',
        html: `<p>List ${H.c('m', '1 → 2 → 3')}, n = 3. fast moves n + 1 = 4 steps from D: D → 1 → 2 → 3 → null. fast is already null, so phase 2 does not run; slow is still on <b>D</b>. <code>D.next = D.next.next</code> removes node 1 and the answer is <code>dummy.next</code> = ${H.c('g', '2 → 3')}. Returning <code>head</code> here would be a bug: head is the deleted node.</p>`
      },
      {
        title: 'Remove N-th from end with a single node',
        html: `<p>List ${H.c('m', '[5]')}, n = 1: fast takes 2 steps (D → 5 → null), slow stays on D, <code>D.next = null</code>, return <code>dummy.next</code> = <b>null</b> — the empty list. One code path handles the smallest input.</p>`
      }
    ],
    deepDive: `<h4>Why the dummy works: a sentinel invariant</h4>
<p>Most list edits are "change <code>prev.next</code>". The algorithm is correct for every node that <b>has</b> a predecessor; the head is the only one that does not. A sentinel restores the invariant "every real node has a predecessor", so one code path covers all positions. The cost is one extra object (O(1)). In C++ you can put the dummy on the stack (<code>ListNode dummy(0, head);</code>) so there is nothing to free.</p>
<h4>Proof of the gap pointers</h4>
<p>After phase 1, <code>fast</code> is exactly n + 1 nodes ahead of <code>slow</code>. Phase 2 moves both together, so the gap is constant. Phase 2 stops when fast is <code>null</code>, i.e. position L + 1 if D is position 0 and the real nodes are 1..L. Then slow is at L + 1 − (n + 1) = L − n, the node just before position L − n + 1 = the n-th from the end. Because 1 ≤ n ≤ L, fast never needs to step past null during phase 1.</p>
<h4>Alternatives and when they matter</h4>
<ul><li><b>Two passes</b> (count, then walk): same O(N), simplest to explain; fine unless "one pass" is required.</li>
<li><b>Recursion</b>: return "position from the end" on the way back up; O(N) stack — risky for 10<sup>5</sup> nodes.</li>
<li><b>Stack of nodes</b>: push all, pop n to find the victim's predecessor; O(N) memory.</li></ul>
<p>"One pass" matters for streams you can only read once (e.g. a list built lazily or read from disk): gap pointers keep just n + 1 nodes of look-behind.</p>
<h4>Production reality</h4>
<p><code>java.util.LinkedList</code> does not use a sentinel (it null-checks <code>first</code>/<code>last</code>), but many C/C++ libraries do: Linux <code>list_head</code> is a circular list whose head is a sentinel, and libstdc++'s <code>std::list</code> uses a sentinel node so <code>end()</code> is a real node.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI-generated list code often contains the tell-tale <code>if (head == null) … else if (pos == 0) …</code> ladders. Spotting that a dummy would remove the branches is a code-review skill you will use on AI output daily.</p>
<p><b>Use AI as a partner:</b> paste your solution and ask <code>List every input where this returns the wrong head; include n = length and a single node</code>. Ask it to <b>rewrite with a sentinel and compare branch counts</b> — fewer branches means fewer places for bugs.</p>
<p><b>Where AI goes wrong:</b> returning <code>head</code> instead of <code>dummy.next</code>; moving fast only n steps (off by one → deletes the wrong node); advancing prev after a deletion in remove-all loops (skips consecutive matches); forgetting <code>ge.next = null</code> in partition (silent cycle → infinite loop in the judge).</p>
<p><b>What you must still own:</b> the invariant argument (gap = n + 1, every node has a predecessor) — it is how you convince an interviewer, and how you verify an AI's code without running it.</p>`
  });

  // =====================================================================
  // Supplements for TOPIC 3 (middle) and TOPIC 4 (Floyd)
  // =====================================================================
  Object.assign(topics[2], {
    examples: [
      {
        title: 'Odd length: 1 → 2 → 3 → 4 → 5 → 6 → 7',
        html: `${H.table(['round', 'slow', 'fast', 'can fast jump again?'], [
  ['0', '1', '1', 'yes'],
  ['1', '2', '3', 'yes'],
  ['2', '3', '5', 'yes'],
  ['3', H.c('p', '4'), '7', 'no — 7.next is null']
])}<p>Three rounds for seven nodes; slow lands on ${H.c('p', '4')}, with three nodes on each side. With odd length both loop conditions give the same answer.</p>`
      },
      {
        title: 'Delete the middle node (stop one node EARLY)',
        html: `<p>To delete the middle you need the node <b>before</b> it. Trick: start <code>fast</code> two nodes ahead (<code>head.next.next</code>) so slow finishes one step earlier. List ${H.c('m', '1 → 2 → 3 → 4 → 5')}: slow stops on 2, and <code>2.next = 2.next.next</code> removes 3. A one-node list returns null.</p>`,
        code: { lang: 'java', code: `
ListNode deleteMiddle(ListNode head) {
    if (head.next == null) return null;           // one node: the middle IS the head
    ListNode slow = head, fast = head.next.next;  // fast starts 2 ahead -> slow stops BEFORE the middle
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
    }
    slow.next = slow.next.next;                   // skip the middle node
    return head;
}`,
        alt: [
          { lang: 'python', code: `def delete_middle(head):
    if head.next is None:                         # one node: the middle IS the head
        return None
    slow, fast = head, head.next.next             # fast starts 2 ahead -> slow stops BEFORE the middle
    while fast and fast.next:
        slow, fast = slow.next, fast.next.next
    slow.next = slow.next.next                    # skip the middle node
    return head` },
          { lang: 'js', code: `function deleteMiddle(head) {
  if (head.next === null) return null;          // one node: the middle IS the head
  let slow = head, fast = head.next.next;       // fast starts 2 ahead -> slow stops BEFORE the middle
  while (fast !== null && fast.next !== null) {
    slow = slow.next;
    fast = fast.next.next;
  }
  slow.next = slow.next.next;                   // skip the middle node
  return head;
}` },
          { lang: 'cpp', code: `struct ListNode { int val; ListNode* next; ListNode(int x = 0, ListNode* n = nullptr) : val(x), next(n) {} };

ListNode* deleteMiddle(ListNode* head) {
    if (!head->next) { delete head; return nullptr; }   // one node: the middle IS the head
    ListNode *slow = head, *fast = head->next->next;    // slow stops BEFORE the middle
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
    }
    ListNode* mid = slow->next;
    slow->next = mid->next;                             // skip the middle node
    delete mid;
    return head;
}` }
        ] }
      },
      {
        title: 'Split a list into two halves (first-middle version)',
        html: `<p>Merge sort on a list starts by cutting it in half. Use the <b>first middle</b> so that a 2-node list splits into 1 + 1 (with the second-middle rule, slow would land on node 2 and the first half would keep both nodes → infinite recursion).</p>`,
        code: { lang: 'java', code: `
ListNode splitHalf(ListNode head) {          // head != null; returns the second half
    ListNode slow = head, fast = head;
    while (fast.next != null && fast.next.next != null) {
        slow = slow.next;
        fast = fast.next.next;
    }
    ListNode second = slow.next;              // 1-2-3-4-5-6: slow = 3, second = 4
    slow.next = null;                         // cut: first half ends at slow
    return second;
}`,
        alt: [
          { lang: 'python', code: `def split_half(head):                        # head is not None; returns the second half
    slow = fast = head
    while fast.next and fast.next.next:       # first middle
        slow, fast = slow.next, fast.next.next
    second, slow.next = slow.next, None       # 1-2-3-4-5-6: slow = 3, second = 4; cut after slow
    return second` },
          { lang: 'js', code: `function splitHalf(head) {                  // head !== null; returns the second half
  let slow = head, fast = head;
  while (fast.next !== null && fast.next.next !== null) {   // first middle
    slow = slow.next;
    fast = fast.next.next;
  }
  const second = slow.next;                 // 1-2-3-4-5-6: slow = 3, second = 4
  slow.next = null;                         // cut: first half ends at slow
  return second;
}` },
          { lang: 'cpp', code: `struct ListNode { int val; ListNode* next; ListNode(int x = 0, ListNode* n = nullptr) : val(x), next(n) {} };

ListNode* splitHalf(ListNode* head) {         // head != nullptr; returns the second half
    ListNode *slow = head, *fast = head;
    while (fast->next && fast->next->next) {  // first middle
        slow = slow->next;
        fast = fast->next->next;
    }
    ListNode* second = slow->next;            // 1-2-3-4-5-6: slow = 3, second = 4
    slow->next = nullptr;                     // cut: first half ends at slow
    return second;
}` }
        ] }
      },
      {
        title: 'Two nodes: which middle?',
        html: `<p>List ${H.c('m', '1 → 2')}. Second-middle loop: fast = 1, fast.next = 2 exists → slow = 2, fast = null → answer <b>2</b>. First-middle loop: fast.next.next is null immediately → answer <b>1</b>. Always test the 2-node case; it is where the two conditions differ and where most off-by-one bugs live.</p>`
      }
    ],
    deepDive: `<h4>Honest accounting: is one pass faster?</h4>
<p>fast makes about N pointer moves and slow about N/2 → <b>~1.5N moves</b>. The two-pass method makes N (count) + N/2 (walk) = <b>~1.5N moves</b> too. So the win is not fewer steps; it is <b>one pass</b>: useful when the list is produced on the fly, when re-reading is expensive, or when the interviewer asks for it. Say this out loud — it shows you understand rather than recite.</p>
<h4>Why the loop condition is safe</h4>
<p><code>fast != null &amp;&amp; fast.next != null</code> relies on short-circuit evaluation: if fast is null, <code>fast.next</code> is never evaluated. After the check, <code>fast.next.next</code> is safe because fast.next is non-null (its <code>.next</code> may be null, which just ends the next check).</p>
<h4>Generalising speeds</h4>
<p>Speeds 1 and 3 find the one-third point; speeds 1 and k find the 1/k point. For "k-th from the end", use a <b>gap</b> instead of a speed ratio (previous topic). Both are "two pointers that keep a known relationship".</p>
<h4>Invariant proof</h4>
<p>After r rounds, slow is at index r and fast at index 2r. The loop stops at the first r where 2r ≥ N − 1 (odd: 2r = N − 1, fast on the last node; even: 2r = N, fast is null). So r = ⌊N/2⌋, which is the middle for odd N and the second middle for even N. Starting fast at <code>head.next</code> shifts every answer one step earlier (the first middle) — another common variant.</p>
<h4>Contrast with other structures</h4>
<p>An array finds the middle in O(1) (index n/2). A doubly linked list with a tail can walk inward from both ends. A skip list or an indexed list keeps sizes to jump there in O(log N). On a plain singly list, O(N) is the best possible — you must at least reach the middle.</p>`,
    aiEra: `<p><b>What AI changes:</b> "find the middle" is a one-liner for any assistant, but it frequently picks the <b>wrong middle</b> for the job (second middle when splitting for merge sort → infinite recursion on 2 nodes). Your value is knowing which variant a larger algorithm needs.</p>
<p><b>Use AI as a partner:</b> <code>For lengths 0..6, tabulate where slow ends with each loop condition</code> — then check the table yourself against the invariant slow = ⌊N/2⌋. Ask it to <b>generate property tests</b>: "the first half and second half lengths differ by at most 1".</p>
<p><b>Where AI goes wrong:</b> checking only <code>fast.next != null</code> (NPE on even lengths), assuming the list is non-empty, or claiming one pass is "twice as fast" (it is not — see the deep dive).</p>
<p><b>What you must still own:</b> choosing the variant, proving where slow stops, and handling 0/1/2-node lists before anyone runs the code.</p>`
  });

  Object.assign(topics[3], {
    examples: [
      {
        title: 'The whole list is the loop (cycle starts at the head)',
        html: `<p>${H.c('m', '1 → 2 → 3 → back to 1')}. Phase 1: (slow, fast) = (2, 3), (3, 2), (1, 1) → meet at node 1. Here a = 0, so phase 2 starts with p = head = slow and returns <b>immediately</b>: the cycle starts at 1. The <code>while (p != slow)</code> loop must handle "already equal" — it does, because the condition is checked first.</p>`
      },
      {
        title: 'Hidden linked list: Happy Number',
        html: `<p>Repeatedly replace n by the sum of the squares of its digits; n is happy if this reaches 1. The sequence <code>n → f(n) → f(f(n))</code> is a linked list where <code>next = f(x)</code>. It either reaches 1 (and stays: f(1) = 1) or falls into a loop like 4 → 16 → 37 → 58 → 89 → 145 → 42 → 20 → 4. Floyd detects which, with O(1) memory.</p>`,
        code: { lang: 'java', code: `
int digitSquareSum(int n) {
    int s = 0;
    while (n > 0) { int d = n % 10; s += d * d; n /= 10; }
    return s;
}

boolean isHappy(int n) {
    int slow = n, fast = digitSquareSum(n);       // "next" is f(x)
    while (fast != 1 && slow != fast) {
        slow = digitSquareSum(slow);               // 1 step
        fast = digitSquareSum(digitSquareSum(fast)); // 2 steps
    }
    return fast == 1;                              // reached 1, or met in a loop
}`,
        alt: [
          { lang: 'python', run: true, code: `def digit_square_sum(n):
    return sum(int(d) ** 2 for d in str(n))

def is_happy(n):
    slow, fast = n, digit_square_sum(n)            # "next" is f(x)
    while fast != 1 and slow != fast:
        slow = digit_square_sum(slow)              # 1 step
        fast = digit_square_sum(digit_square_sum(fast))   # 2 steps
    return fast == 1                               # reached 1, or met in a loop

print(is_happy(19), is_happy(2))                   # True False` },
          { lang: 'js', run: true, code: `function digitSquareSum(n) {
  let s = 0;
  while (n > 0) { const d = n % 10; s += d * d; n = Math.floor(n / 10); }   // plain / gives a fraction
  return s;
}

function isHappy(n) {
  let slow = n, fast = digitSquareSum(n);          // "next" is f(x)
  while (fast !== 1 && slow !== fast) {
    slow = digitSquareSum(slow);                   // 1 step
    fast = digitSquareSum(digitSquareSum(fast));   // 2 steps
  }
  return fast === 1;                               // reached 1, or met in a loop
}

console.log(isHappy(19), isHappy(2));              // true false` },
          { lang: 'cpp', code: `int digitSquareSum(int n) {
    int s = 0;
    while (n > 0) { int d = n % 10; s += d * d; n /= 10; }
    return s;
}

bool isHappy(int n) {
    int slow = n, fast = digitSquareSum(n);        // "next" is f(x)
    while (fast != 1 && slow != fast) {
        slow = digitSquareSum(slow);               // 1 step
        fast = digitSquareSum(digitSquareSum(fast));   // 2 steps
    }
    return fast == 1;                              // reached 1, or met in a loop
}` }
        ] }
      },
      {
        title: 'Bonus: length of the loop',
        html: `<p>Once slow and fast meet, they are both <b>inside</b> the loop. Keep one there and walk the other until it returns: the number of steps is the loop length c. For 3 → 2 → 0 → -4 → (2), meeting at -4: -4 → 2 → 0 → -4 is <b>3</b> steps.</p>`,
        code: { lang: 'java', code: `
int cycleLength(ListNode meet) {      // meet = a node known to be inside the loop
    int len = 1;
    for (ListNode c = meet.next; c != meet; c = c.next) len++;
    return len;
}`,
        alt: [
          { lang: 'python', code: `def cycle_length(meet):              # meet = a node known to be inside the loop
    length, c = 1, meet.next
    while c is not meet:              # identity, not equal values
        length, c = length + 1, c.next
    return length` },
          { lang: 'js', code: `function cycleLength(meet) {         // meet = a node known to be inside the loop
  let len = 1;
  for (let c = meet.next; c !== meet; c = c.next) len++;
  return len;
}` },
          { lang: 'cpp', code: `struct ListNode { int val; ListNode* next; ListNode(int x = 0, ListNode* n = nullptr) : val(x), next(n) {} };

int cycleLength(ListNode* meet) {     // meet = a node known to be inside the loop
    int len = 1;
    for (ListNode* c = meet->next; c != meet; c = c->next) len++;
    return len;
}` }
        ] }
      },
      {
        title: 'Self-loop: one node pointing to itself',
        html: `<p>Node 7 with <code>7.next = 7</code>. Round 1: slow = 7, fast = 7.next.next = 7 → meet. Phase 2: p = head = 7 = slow → start is 7. And the no-cycle single node (<code>7.next = null</code>) exits at once because <code>fast.next == null</code>. Always test both.</p>`
      }
    ],
    deepDive: `<h4>Why speed 2 and not 3?</h4>
<p>Inside the loop, think of positions modulo c. With speeds 1 and 2, the gap changes by <b>1</b> per round, so it must hit 0 within c rounds. With speeds 1 and 3, the gap changes by 2: if c is even and the gap is odd, the gap stays odd forever and the pointers <b>never meet</b>. Speed 2 is the simplest choice with a guarantee.</p>
<h4>Step bound</h4>
<p>slow enters the loop after a steps; at that moment fast is somewhere in the loop, at most c − 1 nodes "behind" slow (going forward), so they meet within c − 1 more rounds. Phase 1 is ≤ a + c rounds, phase 2 is a rounds → <b>O(a + c) = O(N)</b>.</p>
<h4>Phase 2 when the tail is longer than the loop</h4>
<p>If a &gt; c, the formula is a = k·c − b with k ≥ 2: the pointer starting at the meeting node simply goes around the loop several times while the other walks the tail. They still meet exactly at the start, because both are a steps from it.</p>
<h4>Brent's algorithm</h4>
<p>An alternative that moves only one pointer and "teleports" the other at powers of two (1, 2, 4, 8, …). It makes fewer calls to <code>next</code>/<code>f(x)</code> — attractive when f is expensive — and yields the loop length directly. Pollard's rho factorisation uses Floyd or Brent to find cycles of <code>x → x² + c mod n</code>.</p>
<h4>HashSet version pitfalls</h4>
<p>The O(N)-memory solution must store <b>node identities</b>. LeetCode's ListNode does not override <code>equals/hashCode</code>, so <code>HashSet&lt;ListNode&gt;</code> uses identity. If a class compares by value, use <code>Collections.newSetFromMap(new IdentityHashMap&lt;&gt;())</code> — otherwise two different nodes with equal values look like a cycle.</p>
<h4>Same idea elsewhere</h4>
<p>Find the Duplicate Number (array of n + 1 values in 1..n: treat <code>i → nums[i]</code> as next), detecting loops in pseudo-random generators, and memory debuggers checking corrupted lists.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants recite Floyd perfectly, including the a = kc − b proof, so "knowing" it is cheap. Interviewers therefore probe <b>transfer</b>: can you see the hidden linked list in Happy Number or Find the Duplicate Number, and justify why speed 2 is safe?</p>
<p><b>Use AI as a partner:</b> ask <code>Generate lists with a = 0, a &gt; c, c = 1 and no cycle, and the expected start index</code>, then run your code. Or ask it to <b>explain</b> Brent's algorithm and compare call counts on f.</p>
<p><b>Where AI goes wrong:</b> comparing <code>slow.val == fast.val</code> instead of references; moving fast by 2 in phase 2; resetting the wrong pointer; claiming the meeting node is the cycle start; forgetting the <code>fast.next != null</code> check (NPE on even-length lists without a cycle).</p>
<p><b>What you must still own:</b> drawing a, b, c on paper and deriving the formula live — it takes two minutes and is the strongest signal in this question.</p>`
  });

  // =====================================================================
  // Supplements for TOPIC 5 (reversal), TOPIC 6 (k-group), TOPIC 7 (merge)
  // =====================================================================
  Object.assign(topics[4], {
    examples: [
      {
        title: 'Two nodes, step by step',
        html: `<p>${H.c('m', '7 → 8 → null')}. Round 1: next = 8, 7.next = null, prev = 7, curr = 8. Round 2: next = null, 8.next = 7, prev = 8, curr = null → stop. Result ${H.c('g', '8 → 7 → null')}, new head = prev = 8. Empty list: loop never runs, return prev = null. One node: one round, the node points to null, return it.</p>`
      },
      {
        title: 'Recursive version: what the call stack looks like',
        html: `${H.table(['depth', 'call', 'returns', 'work after the call returns'], [
  ['1', 'rev(1)', '4', '2.next = 1, 1.next = null'],
  ['2', 'rev(2)', '4', '3.next = 2, 2.next = null'],
  ['3', 'rev(3)', '4', '4.next = 3, 3.next = null'],
  ['4', 'rev(4)', '4', H.c('y', 'base case: 4.next is null')]
])}<p>For N nodes there are N frames on the stack at the deepest point. With 10<sup>5</sup>–10<sup>6</sup> nodes this overflows the default stack (Java <code>StackOverflowError</code>, JS <code>RangeError</code>, a C++ crash; Python already stops at about 1000 frames with <code>RecursionError</code>), so production code uses the iterative loop.</p>`
      },
      {
        title: 'Reversing a doubly linked list: swap each node\'s two arrows',
        html: `<p>In a DLL every node already knows both neighbours, so reversal = swap <code>next</code> and <code>prev</code> on every node, then the old tail is the new head. Careful: after the swap, the "next node to visit" is in <code>prev</code> — save it first.</p>`,
        code: { lang: 'java', code: `
static class DNode { int val; DNode prev, next; DNode(int v) { val = v; } }

static DNode reverseDLL(DNode head) {
    DNode curr = head, last = null;
    while (curr != null) {
        DNode tmp = curr.next;   // save the forward link before swapping
        curr.next = curr.prev;   // swap the two arrows of this node
        curr.prev = tmp;
        last = curr;
        curr = tmp;              // continue with the old next
    }
    return last;                 // old tail = new head
}`,
        alt: [
          { lang: 'python', code: `class DNode:
    def __init__(self, val):
        self.val, self.prev, self.next = val, None, None

def reverse_dll(head):
    curr, last = head, None
    while curr:
        nxt = curr.next                          # save the forward link before swapping
        curr.next, curr.prev = curr.prev, nxt    # swap the two arrows of this node
        last, curr = curr, nxt                   # continue with the old next
    return last                                  # old tail = new head` },
          { lang: 'js', code: `class DNode { constructor(val) { this.val = val; this.prev = null; this.next = null; } }

function reverseDLL(head) {
  let curr = head, last = null;
  while (curr !== null) {
    const tmp = curr.next;       // save the forward link before swapping
    curr.next = curr.prev;       // swap the two arrows of this node
    curr.prev = tmp;
    last = curr;
    curr = tmp;                  // continue with the old next
  }
  return last;                   // old tail = new head
}` },
          { lang: 'cpp', code: `struct DNode { int val; DNode* prev = nullptr; DNode* next = nullptr; DNode(int v) : val(v) {} };

DNode* reverseDLL(DNode* head) {
    DNode* last = nullptr;
    for (DNode* curr = head; curr; ) {
        DNode* tmp = curr->next;            // save the forward link before swapping
        swap(curr->next, curr->prev);       // swap the two arrows of this node
        last = curr;
        curr = tmp;                         // continue with the old next
    }
    return last;                            // old tail = new head
}` }
        ] }
      },
      {
        title: 'Reversal as a helper: Add Two Numbers II',
        html: `<p>Numbers stored <b>most significant digit first</b>: ${H.c('m', '7 → 2 → 4 → 3')} (7243) + ${H.c('m', '5 → 6 → 4')} (564). Addition needs the <b>least</b> significant digits first, so reverse both lists, add with a carry while building the result at the head, done: ${H.c('g', '7 → 8 → 0 → 7')} (7807). Many medium problems are "reverse + something you already know".</p>`
      }
    ],
    deepDive: `<h4>Loop invariant (the proof)</h4>
<p>Before each iteration: <code>prev</code> is the head of a correctly reversed list of all nodes already visited, and <code>curr</code> is the head of the untouched remainder; together they contain every node exactly once. One iteration moves exactly one node from the remainder to the front of the reversed part, so the invariant holds. When curr is null, the remainder is empty and prev heads the full reversal. Termination: the remainder shrinks by one each round.</p>
<h4>Recursion depth</h4>
<p>Each frame of the recursive version holds a few references plus bookkeeping; with the default thread stack (commonly 512 KB–1 MB, set by <code>-Xss</code>) you get on the order of 10<sup>4</sup>–10<sup>5</sup> frames. LeetCode's 5000 nodes is fine; a million is not. Java has <b>no tail-call elimination</b>, so even a tail-recursive <code>rev(curr, prev)</code> helper still grows the stack (Scala's <code>@tailrec</code> or Kotlin's <code>tailrec</code> would turn it into a loop). Other languages: Python's default limit is about <b>1000</b> frames (and CPython never removes tail calls), so the recursive version fails on lists longer than that; JS engines allow roughly 10<sup>4</sup> frames; C++ gets an 8 MB stack on Linux by default (about 10<sup>5</sup> small frames), and an optimising compiler <i>may</i> turn tail recursion into a loop, but you cannot rely on it.</p>
<h4>Functional / immutable lists</h4>
<p>In Haskell, Scala or Clojure lists are immutable, so "reverse" builds a <b>new</b> list by prepending each element (a fold): O(N) time and O(N) new cells. Old versions stay valid — useful for undo/history, but different memory behaviour from in-place reversal.</p>
<h4>Building blocks you will reuse</h4>
<ul><li><b>Reverse a sublist</b> [left, right]: walk to left − 1, reverse right − left + 1 nodes, re-hook both ends (k-group with one group).</li>
<li><b>Reverse the second half</b>: palindrome check, reorder list, twin sums.</li>
<li><b>Reverse, process, reverse back</b>: add numbers stored forwards, "remove nodes that have a greater value to the right".</li></ul>
<p>Performance note: reversal makes N pointer writes; on large lists the real cost is cache misses while chasing <code>next</code>, not the writes.</p>`,
    aiEra: `<p><b>What AI changes:</b> reverse-a-list is the "hello world" of pointer problems — any model writes it flawlessly. Interviews therefore use it as a <b>warm-up</b> and immediately extend it: sublist, k-groups, recursion trade-offs, or reversal as a step in a bigger problem.</p>
<p><b>Use AI as a partner:</b> ask it to <b>trace</b> your loop on a 3-node list as a table of prev/curr/next after every line, and compare with your own trace. Ask <code>At what N does my recursive version overflow with -Xss512k?</code> and then verify by running it.</p>
<p><b>Where AI goes wrong:</b> in the recursive version it sometimes forgets <code>head.next = null</code> (creating a 2-node cycle that hangs the judge's printer); in sublist reversal it miscounts the nodes or loses the connection to the part after <code>right</code>.</p>
<p><b>What you must still own:</b> the four-line loop from memory, the invariant, and the habit of saving <code>next</code> before you overwrite anything.</p>`
  });

  Object.assign(topics[5], {
    examples: [
      {
        title: 'Boundary values of k',
        html: `${H.table(['k', 'list 1 → 2 → 3 → 4 → 5', 'why'], [
  ['1', '1 → 2 → 3 → 4 → 5', 'groups of one: reversing a single node changes nothing'],
  ['2', '2 → 1 → 4 → 3 → 5', 'this is "Swap Nodes in Pairs"'],
  ['5 (= n)', '5 → 4 → 3 → 2 → 1', 'one group: plain reversal'],
  ['3', '3 → 2 → 1 → 4 → 5', 'the short tail [4, 5] stays']
])}`
      },
      {
        title: 'Full trace: 1..8 with k = 3',
        html: `<p>Group 1 [1 2 3] → 3 2 1, groupPrev moves to 1. Group 2 [4 5 6] → 6 5 4, groupPrev moves to 4. Count from 4: only 7, 8 remain (2 &lt; 3) → stop. Answer ${H.c('g', '3 → 2 → 1')} → ${H.c('b', '6 → 5 → 4')} → 7 → 8. Each node was visited twice: once while counting, once while flipping.</p>`
      },
      {
        title: 'Recursive version (shorter, O(N/k) stack)',
        html: `<p>"Check that k nodes exist; reverse the rest of the list recursively; then reverse my k nodes <b>onto</b> that result." The recursive result plays the role of <code>groupNext</code>: it is where our group's old first node must point. Depth is N/k, so it is safe for big k but not for k = 1 with a huge list.</p>`,
        code: { lang: 'java', code: `
ListNode reverseKGroupRec(ListNode head, int k) {
    ListNode check = head;
    for (int i = 0; i < k; i++) {             // are there k nodes?
        if (check == null) return head;        // no: leave this short tail as it is
        check = check.next;
    }
    ListNode prev = reverseKGroupRec(check, k);   // the rest, already fixed
    ListNode curr = head;
    for (int i = 0; i < k; i++) {             // flip exactly k nodes onto prev
        ListNode next = curr.next;
        curr.next = prev;
        prev = curr;
        curr = next;
    }
    return prev;                               // new first node of this group
}`,
        alt: [
          { lang: 'python', code: `def reverse_k_group_rec(head, k):
    check = head
    for _ in range(k):                         # are there k nodes?
        if check is None:
            return head                        # no: leave this short tail as it is
        check = check.next
    prev = reverse_k_group_rec(check, k)       # the rest, already fixed
    curr = head
    for _ in range(k):                         # flip exactly k nodes onto prev
        curr.next, prev, curr = prev, curr, curr.next
    return prev                                # new first node of this group` },
          { lang: 'js', code: `function reverseKGroupRec(head, k) {
  let check = head;
  for (let i = 0; i < k; i++) {              // are there k nodes?
    if (check === null) return head;         // no: leave this short tail as it is
    check = check.next;
  }
  let prev = reverseKGroupRec(check, k);     // the rest, already fixed
  let curr = head;
  for (let i = 0; i < k; i++) {              // flip exactly k nodes onto prev
    const next = curr.next;
    curr.next = prev;
    prev = curr;
    curr = next;
  }
  return prev;                               // new first node of this group
}` },
          { lang: 'cpp', code: `struct ListNode { int val; ListNode* next; ListNode(int x = 0, ListNode* n = nullptr) : val(x), next(n) {} };

ListNode* reverseKGroupRec(ListNode* head, int k) {
    ListNode* check = head;
    for (int i = 0; i < k; i++) {             // are there k nodes?
        if (!check) return head;               // no: leave this short tail as it is
        check = check->next;
    }
    ListNode* prev = reverseKGroupRec(check, k);   // the rest, already fixed
    ListNode* curr = head;
    for (int i = 0; i < k; i++) {             // flip exactly k nodes onto prev
        ListNode* next = curr->next;
        curr->next = prev;
        prev = curr;
        curr = next;
    }
    return prev;                               // new first node of this group
}` }
        ] }
      },
      {
        title: 'Variant: also reverse the short leftover',
        html: `<p>Some versions say "reverse the remaining nodes too". Only one line changes: when getKth returns null, reverse everything from <code>groupPrev.next</code> to the end (prev starts at null) and hook <code>groupPrev.next</code> to the new first node. For 1..5, k = 2 the answer becomes 2 → 1 → 4 → 3 → 5 (a single leftover node looks the same) and for 1..5, k = 3 it becomes 3 → 2 → 1 → ${H.c('g', '5 → 4')}.</p>`
      }
    ],
    deepDive: `<h4>Why it is O(N) and not O(N·k)</h4>
<p>getKth walks k nodes per group, and reversal walks the same k nodes: about 2k work per group, N/k groups → <b>~2N</b>. The final failed count walks fewer than k nodes. Total linear time, constant extra space.</p>
<h4>The four handles and the order of operations</h4>
<ol><li>Read <code>kth</code> and <code>groupNext = kth.next</code> <b>before</b> touching anything.</li>
<li>Reverse with <code>prev = groupNext</code> and loop <code>while (curr != groupNext)</code> — the loop stops by identity, not by counting.</li>
<li>Save <code>oldFirst = groupPrev.next</code> (still the old first node, because groupPrev itself was not modified).</li>
<li>Hook <code>groupPrev.next = kth</code>, then <code>groupPrev = oldFirst</code>.</li></ol>
<p>Swapping steps 3 and 4 is the classic bug: after the hook, groupPrev.next is kth, so "oldFirst" would wrongly be kth and the next group would be re-hooked in the wrong place.</p>
<h4>Related problems</h4>
<ul><li><b>Swap Nodes in Pairs</b> (k = 2), <b>Reverse Linked List II</b> (one group between positions), <b>Reverse Nodes in Even Length Groups</b> (group sizes 1, 2, 3, … and reverse only the even-sized ones).</li>
<li>"Reverse in k-groups starting from the <b>end</b>": reverse the whole list, k-group it, reverse again.</li></ul>
<h4>Interview pacing</h4>
<p>This is a Hard mostly because of bookkeeping, not ideas. Say the plan first ("dummy, groupPrev, getKth helper, reverse with prev = groupNext, re-hook"), write getKth as a separate function, and dry-run one group on a whiteboard before coding — it saves more time than it costs.</p>`,
    aiEra: `<p><b>What AI changes:</b> models produce k-group code quickly, but this is exactly the kind of pointer-heavy code where a single swapped line passes the sample test and fails hidden ones (k = n, n % k == 0, k = 1). Reviewing it carefully is the real job.</p>
<p><b>Use AI as a partner:</b> <code>Write a brute-force checker using an ArrayList and compare my reverseKGroup against it for all n ≤ 8 and all 1 ≤ k ≤ n</code>. Exhaustive small tests catch nearly every pointer bug in this problem.</p>
<p><b>Where AI goes wrong:</b> reversing the short tail when it should not, saving oldFirst after the hook, using recursion without mentioning O(N/k) stack, or modifying values instead of links (explicitly forbidden).</p>
<p><b>What you must still own:</b> naming the four handles, the order of the re-hooking steps, and a one-group dry run you can show the interviewer.</p>`
  });

  Object.assign(topics[6], {
    examples: [
      {
        title: 'One list is empty',
        html: `<p><code>list1 = null</code>, <code>list2 = 0 → 5</code>. The while loop never runs (it needs both non-null), then <code>tail.next = list2</code>, and <code>dummy.next</code> is 0 → 5. Both empty → <code>tail.next = null</code> → return null. The dummy makes all three cases share one path.</p>`
      },
      {
        title: 'Everything in one list is smaller',
        html: `<p>l1 = ${H.c('b', '1 → 2 → 3')}, l2 = ${H.c('y', '10 → 20')}. Three comparisons attach 1, 2, 3 (each time 10 is bigger), then l1 is empty and <b>one link</b> attaches 10 → 20. The number of comparisons is between min(N, M) and N + M − 1, never more.</p>`
      },
      {
        title: 'Contrast: merging two sorted ARRAYS needs a new buffer',
        html: `<p>Same two-pointer idea, but arrays cannot be re-linked: you must copy into an output array of size N + M (O(N + M) extra memory). Lists merge <b>in place</b> by re-hooking nodes — this is the reason merge sort is the natural sort for linked lists.</p>`,
        code: { lang: 'java', code: `
int[] mergeArrays(int[] a, int[] b) {
    int[] out = new int[a.length + b.length];   // arrays need a new buffer
    int i = 0, j = 0, k = 0;
    while (i < a.length && j < b.length) out[k++] = (a[i] <= b[j]) ? a[i++] : b[j++];
    while (i < a.length) out[k++] = a[i++];      // copy leftovers one by one
    while (j < b.length) out[k++] = b[j++];
    return out;
}`,
        alt: [
          { lang: 'python', code: `def merge_arrays(a, b):
    out, i, j = [], 0, 0                         # arrays need a new buffer
    while i < len(a) and j < len(b):
        if a[i] <= b[j]:
            out.append(a[i]); i += 1
        else:
            out.append(b[j]); j += 1
    return out + a[i:] + b[j:]                   # copy the leftovers
# (heapq.merge(a, b) does the same lazily)` },
          { lang: 'js', code: `function mergeArrays(a, b) {
  const out = new Array(a.length + b.length);  // arrays need a new buffer
  let i = 0, j = 0, k = 0;
  while (i < a.length && j < b.length) out[k++] = a[i] <= b[j] ? a[i++] : b[j++];
  while (i < a.length) out[k++] = a[i++];      // copy leftovers one by one
  while (j < b.length) out[k++] = b[j++];
  return out;
}` },
          { lang: 'cpp', code: `vector<int> mergeArrays(const vector<int>& a, const vector<int>& b) {
    vector<int> out(a.size() + b.size());        // arrays need a new buffer
    merge(a.begin(), a.end(), b.begin(), b.end(), out.begin());   // std::merge is stable too
    return out;
}` }
        ] }
      },
      {
        title: 'Ties and stability',
        html: `<p>l1 = ${H.c('b', '2a → 5')}, l2 = ${H.c('y', '2b → 3')} (2a and 2b have equal keys). With <code>&lt;=</code> we take 2a first → 2a → 2b → 3 → 5: equal keys keep their "l1 before l2" order. That property (<b>stability</b>) is what makes merge sort stable; with <code>&lt;</code> you would get 2b → 2a.</p>`
      }
    ],
    deepDive: `<h4>From two lists to k lists</h4>
${H.table(['approach', 'time (N total nodes)', 'extra space'], [
  ['merge one by one into an accumulator', 'O(N·k)', 'O(1)'],
  ['min-heap of the k fronts', 'O(N log k)', 'O(k)'],
  ['divide &amp; conquer: merge pairs, then pairs of pairs', 'O(N log k)', 'O(1) iterative / O(log k) recursive']
])}
<p>Both O(N log k) methods are standard answers to "Merge k Sorted Lists" (practice section).</p>
<h4>Sort List (merge sort on a linked list)</h4>
<p>Split at the first middle, sort both halves recursively, merge. O(N log N) time; the recursion is only O(log N) deep. A <b>bottom-up</b> version merges runs of size 1, 2, 4, … in place and uses O(1) extra space — the only common comparison sort that achieves O(N log N) time with O(1) space on a list.</p>
<h4>Recursive merge: elegant, but deep</h4>
<p>The recursive merge makes one call per attached node: depth N + M. For two lists of 50 nodes it is fine; for 10<sup>5</sup> it overflows the stack. Prefer the iterative dummy + tail version in production and mention why.</p>
<h4>Merging in the real world</h4>
<ul><li><b>External sorting</b>: sort chunks that fit in RAM, then k-way merge the sorted files.</li>
<li><b>LSM-tree databases</b> (RocksDB, Cassandra) constantly merge sorted runs during compaction.</li>
<li><b>Timsort</b> (Java's <code>Arrays.sort</code> for objects, Python's <code>sorted</code>) finds natural sorted runs and merges them.</li></ul>`,
    aiEra: `<p><b>What AI changes:</b> merge is short enough that AI output is usually right — so interviewers jump to the follow-ups: merge k lists, sort a list, stability, recursion depth. Your edge comes from connecting this tiny routine to those bigger designs.</p>
<p><b>Use AI as a partner:</b> ask it to compare the three merge-k strategies on <code>k = 10<sup>4</sup></code> lists of length 10, and explain which wins and why; then verify the Big-O yourself. Ask for a randomized test against <code>Collections.sort</code> on the concatenated values.</p>
<p><b>Where AI goes wrong:</b> creating <b>new nodes</b> when the task says "splice", using <code>&lt;</code> (unstable), forgetting to attach the leftover list, or presenting the recursive version without its stack cost.</p>
<p><b>What you must still own:</b> the dummy + tail habit, the O(N + M) argument, and the jump from "merge two" to "merge k with a heap".</p>`
  });

  // =====================================================================
  // PRACTICE — Easy
  // =====================================================================
  practice.push({
    title: 'Remove Linked List Elements',
    level: 'Easy',
    tags: ['dummy node'],
    companies: ['Amazon', 'Microsoft'],
    statement: `<p>Given the <code>head</code> of a linked list and an integer <code>val</code>, remove <b>all</b> nodes whose value equals <code>val</code> and return the new head.</p>`,
    constraints: `0 ≤ nodes ≤ 10<sup>4</sup>, 1 ≤ Node.val ≤ 50, 0 ≤ val ≤ 50`,
    example: `${chain([7, 7, 1, 7, 2], { 0: 'r', 1: 'r', 3: 'r' })}<p>val = 7 → ${H.c('g', '1 → 2')}. The first two 7s are the head and then the new head — exactly the case a dummy node handles. <code>[7, 7]</code> → empty list.</p>`,
    brute: {
      why: `<p>Build a brand-new list, copying every value that is not <code>val</code>. Correct and O(N) time, but it allocates up to N new nodes (O(N) extra memory) when we could just re-link the existing ones.</p>`,
      code: {
          lang: 'java',
          code: `
ListNode removeElements(ListNode head, int val) {
    ListNode dummy = new ListNode(0), tail = dummy;
    for (ListNode c = head; c != null; c = c.next) {
        if (c.val != val) { tail.next = new ListNode(c.val); tail = tail.next; }   // copies
    }
    return dummy.next;
}`,
          alt: [
            { lang: 'python', code: `def remove_elements(head, val):
    dummy = ListNode(0)
    tail = dummy
    c = head
    while c is not None:
        if c.val != val:
            tail.next = ListNode(c.val)   # copies
            tail = tail.next
        c = c.next
    return dummy.next` },
            { lang: 'js', code: `function removeElements(head, val) {
  const dummy = new ListNode(0);
  let tail = dummy;
  for (let c = head; c !== null; c = c.next) {
    if (c.val !== val) { tail.next = new ListNode(c.val); tail = tail.next; }   // copies
  }
  return dummy.next;
}` },
            { lang: 'cpp', code: `ListNode* removeElements(ListNode* head, int val) {
    ListNode* dummy = new ListNode(0);
    ListNode* tail = dummy;
    for (ListNode* c = head; c != nullptr; c = c->next) {
        if (c->val != val) { tail->next = new ListNode(c->val); tail = tail->next; }   // copies
    }
    return dummy->next;
}` }
          ]
        }
    },
    mcq: { q: 'After skipping a matching node with <code>prev.next = prev.next.next</code>, what should <code>prev</code> do?', options: ['Move forward one node', 'Stay where it is', 'Jump to the head', 'Move forward two nodes'], answer: 1, explain: 'The new prev.next might also match (e.g. 7 → 7). Only advance prev when you did not delete.' },
    hints: [
      `<p>The only awkward node is the head, because it has no predecessor. Give it one.</p>`,
      `<p>Dummy node pointing to head; a single pointer <code>prev</code> that always sits <b>before</b> the node being checked.</p>`,
      `<p>Loop while <code>prev.next != null</code>: if it matches, skip it (prev stays); else prev = prev.next. Return <code>dummy.next</code>. Test: all nodes match, none match, empty list.</p>`
    ],
    tests: { sig: 'ListNode int -> ListNode', fn: 'removeElements', cases: [
      [[[1, 2, 6, 3, 4, 5, 6], 6], [1, 2, 3, 4, 5]],
      [[[7, 7, 1, 7, 2], 7], [1, 2]],
      [[[], 1], []],
      [[[7, 7, 7, 7], 7], []],
      [[[1, 2, 3], 0], [1, 2, 3]],
      [[[5], 5], []],
      [[[1, 2, 2, 1], 2], [1, 1]],
      [[[50, 1, 50], 50], [1]],
      // 10^4 nodes (largest input)
      [[{ $concat: [{ $rep: 7, n: 5000 }, { $rep: 1, n: 5000 }] }, 7], { $rep: 1, n: 5000 }],
      [[{ $rep: 50, n: 10000 }, 50], []]
    ] },
    solution: {
      approach: `<p>Dummy + prev; skip matches in place; advance only when the next node is kept.</p>`,
      code: `
class Solution {
    public ListNode removeElements(ListNode head, int val) {
        ListNode dummy = new ListNode(0, head);
        ListNode prev = dummy;
        while (prev.next != null) {
            if (prev.next.val == val) prev.next = prev.next.next;   // drop it, stay put
            else prev = prev.next;                                  // keep it, move on
        }
        return dummy.next;
    }
}`,
      alt: [
        { lang: 'python', code: `class Solution:
    def remove_elements(self, head, val):
        dummy = prev = ListNode(0, head)
        while prev.next:
            if prev.next.val == val:
                prev.next = prev.next.next     # drop it, stay put
            else:
                prev = prev.next               # keep it, move on
        return dummy.next` },
        { lang: 'js', code: `function removeElements(head, val) {
  const dummy = new ListNode(0, head);
  let prev = dummy;
  while (prev.next !== null) {
    if (prev.next.val === val) prev.next = prev.next.next;   // drop it, stay put
    else prev = prev.next;                                   // keep it, move on
  }
  return dummy.next;
}` },
        { lang: 'cpp', code: `// LeetCode provides this node type; it is spelled out so the snippet compiles on its own.
struct ListNode {
    int val; ListNode* next;
    ListNode(int x = 0, ListNode* n = nullptr) : val(x), next(n) {}
};

class Solution {
public:
    ListNode* removeElements(ListNode* head, int val) {
        ListNode dummy(0, head);
        ListNode* prev = &dummy;
        while (prev->next) {
            if (prev->next->val == val) {      // drop it, stay put
                ListNode* gone = prev->next;
                prev->next = gone->next;
                delete gone;
            } else {
                prev = prev->next;             // keep it, move on
            }
        }
        return dummy.next;
    }
};` }
      ],
      complexity: `<p><b>Time O(N)</b> — each node is examined once. <b>Space O(1)</b> — one dummy and one pointer.</p>`,
      followUps: ['Do it recursively: head.next = removeElements(head.next, val); return head.val == val ? head.next : head.', 'What is the recursion depth for 10<sup>4</sup> nodes, and is it safe?']
    }
  });

  practice.push({
    title: 'Remove Duplicates from Sorted List',
    level: 'Easy',
    tags: ['linked list', 'sorted'],
    companies: ['Amazon', 'Adobe'],
    statement: `<p>Given the <code>head</code> of a <b>sorted</b> linked list, delete duplicates so that each value appears only <b>once</b>. Return the list, still sorted.</p>`,
    constraints: `0 ≤ nodes ≤ 300, -100 ≤ Node.val ≤ 100, sorted in non-decreasing order`,
    example: `${chain([1, 1, 2, 3, 3], { 1: 'r', 4: 'r' })}<p>Output ${H.c('g', '1 → 2 → 3')}. Because the list is sorted, equal values are always <b>neighbours</b>, so we only compare each node with the next one.</p>`,
    brute: {
      why: `<p>Keep a HashSet of values seen so far and unlink any node whose value is already in the set. Works even for unsorted lists, but uses O(N) memory and ignores the fact that the list is sorted.</p>`,
      code: {
          lang: 'java',
          code: `
ListNode deleteDuplicates(ListNode head) {
    Set<Integer> seen = new HashSet<>();
    ListNode dummy = new ListNode(0, head), prev = dummy;
    while (prev.next != null) {
        if (!seen.add(prev.next.val)) prev.next = prev.next.next;   // already seen: drop
        else prev = prev.next;
    }
    return dummy.next;
}`,
          alt: [
            { lang: 'python', code: `def delete_duplicates(head):
    seen = set()
    dummy = ListNode(0, head)
    prev = dummy
    while prev.next is not None:
        if prev.next.val in seen:
            prev.next = prev.next.next    # already seen: drop
        else:
            seen.add(prev.next.val)
            prev = prev.next
    return dummy.next` },
            { lang: 'js', code: `function deleteDuplicates(head) {
  const seen = new Set();
  const dummy = new ListNode(0, head);
  let prev = dummy;
  while (prev.next !== null) {
    if (seen.has(prev.next.val)) prev.next = prev.next.next;   // already seen: drop
    else { seen.add(prev.next.val); prev = prev.next; }
  }
  return dummy.next;
}` },
            { lang: 'cpp', code: `ListNode* deleteDuplicates(ListNode* head) {
    unordered_set<int> seen;
    ListNode* dummy = new ListNode(0, head);
    ListNode* prev = dummy;
    while (prev->next != nullptr) {
        if (!seen.insert(prev->next->val).second) prev->next = prev->next->next;   // already seen: drop
        else prev = prev->next;
    }
    return dummy->next;
}` }
          ]
        }
    },
    mcq: { q: 'Why is no dummy node needed here?', options: ['Because the list is short', 'Because the head is never deleted — we always keep the first copy', 'Because duplicates are rare', 'A dummy is required'], answer: 1, explain: 'We keep the first node of every run of equal values, so the head always survives and never needs a predecessor.' },
    hints: [
      `<p>Sorted ⇒ duplicates sit next to each other. You never need to remember anything except the current node.</p>`,
      `<p>One pointer <code>curr</code>. If <code>curr.next.val == curr.val</code>, unlink curr.next; otherwise move curr forward.</p>`,
      `<p>Do not advance after unlinking — a run like 1 → 1 → 1 needs two unlinks from the same curr. Stop when curr or curr.next is null.</p>`
    ],
    tests: { sig: 'ListNode -> ListNode', fn: 'deleteDuplicates', cases: [
      [[[1, 1, 2]], [1, 2]],
      [[[1, 1, 2, 3, 3]], [1, 2, 3]],
      [[[]], []],
      [[[5]], [5]],
      [[[-100, -100, -100]], [-100]],
      [[[-3, -1, 0, 0, 2, 2, 2, 100]], [-3, -1, 0, 2, 100]]
    ] },
    solution: {
      approach: `<p>Single pointer; compare with the next node; unlink equal neighbours.</p>`,
      code: `
class Solution {
    public ListNode deleteDuplicates(ListNode head) {
        ListNode curr = head;
        while (curr != null && curr.next != null) {
            if (curr.next.val == curr.val) curr.next = curr.next.next;   // drop the copy
            else curr = curr.next;                                       // new value: move on
        }
        return head;
    }
}`,
      alt: [
        { lang: 'python', code: `class Solution:
    def delete_duplicates(self, head):
        curr = head
        while curr and curr.next:
            if curr.next.val == curr.val:
                curr.next = curr.next.next     # drop the copy, stay put
            else:
                curr = curr.next               # new value: move on
        return head` },
        { lang: 'js', code: `function deleteDuplicates(head) {
  let curr = head;
  while (curr !== null && curr.next !== null) {
    if (curr.next.val === curr.val) curr.next = curr.next.next;   // drop the copy
    else curr = curr.next;                                        // new value: move on
  }
  return head;
}` },
        { lang: 'cpp', code: `// LeetCode provides this node type; it is spelled out so the snippet compiles on its own.
struct ListNode {
    int val; ListNode* next;
    ListNode(int x = 0, ListNode* n = nullptr) : val(x), next(n) {}
};

class Solution {
public:
    ListNode* deleteDuplicates(ListNode* head) {
        ListNode* curr = head;
        while (curr && curr->next) {
            if (curr->next->val == curr->val) {   // drop the copy, stay put
                ListNode* copy = curr->next;
                curr->next = copy->next;
                delete copy;
            } else {
                curr = curr->next;                // new value: move on
            }
        }
        return head;
    }
};` }
      ],
      complexity: `<p><b>Time O(N)</b>, <b>Space O(1)</b>.</p>`,
      followUps: ['Remove ALL nodes that have duplicates (see "Remove Duplicates II").', 'What if the list is unsorted and you must use O(1) memory? (O(N²) compare-all, or sort first.)']
    }
  });

  practice.push({
    title: 'Intersection of Two Linked Lists',
    level: 'Easy',
    tags: ['two pointers'],
    companies: ['Amazon', 'Microsoft', 'Bloomberg'],
    statement: `<p>Two singly linked lists may <b>merge</b> at some node and share every node after it (a Y shape). Given both heads, return the node where they intersect, or <code>null</code> if they never do. The lists have no cycles and must keep their structure. Aim for O(1) memory.</p>`,
    constraints: `1 ≤ m, n ≤ 3·10<sup>4</sup>, 1 ≤ Node.val ≤ 10<sup>5</sup>`,
    example: `<p>A: ${H.c('b', '4 → 1')} → ${H.c('p', '8 → 4 → 5')}<br>B: ${H.c('y', '5 → 6 → 1')} → ${H.c('p', '8 → 4 → 5')}</p><p>Output: node ${H.c('p', '8')}. Careful: B also has a node with value 1, but it is a <b>different node</b> — intersection is about identity, not equal values.</p>`,
    brute: {
      why: `<p>Put every node of A into a HashSet, then walk B and return the first node found in the set. O(m + n) time but O(m) memory.</p>`,
      code: {
          lang: 'java',
          code: `
ListNode getIntersectionNode(ListNode headA, ListNode headB) {
    Set<ListNode> inA = new HashSet<>();
    for (ListNode a = headA; a != null; a = a.next) inA.add(a);
    for (ListNode b = headB; b != null; b = b.next) if (inA.contains(b)) return b;
    return null;
}`,
          alt: [
            { lang: 'python', code: `def get_intersection_node(head_a, head_b):
    in_a = set()
    a = head_a
    while a is not None:
        in_a.add(a)
        a = a.next
    b = head_b
    while b is not None:
        if b in in_a:
            return b
        b = b.next
    return None` },
            { lang: 'js', code: `function getIntersectionNode(headA, headB) {
  const inA = new Set();
  for (let a = headA; a !== null; a = a.next) inA.add(a);
  for (let b = headB; b !== null; b = b.next) if (inA.has(b)) return b;
  return null;
}` },
            { lang: 'cpp', code: `ListNode* getIntersectionNode(ListNode* headA, ListNode* headB) {
    unordered_set<ListNode*> inA;
    for (ListNode* a = headA; a != nullptr; a = a->next) inA.insert(a);
    for (ListNode* b = headB; b != nullptr; b = b->next) if (inA.count(b)) return b;
    return nullptr;
}` }
          ]
        }
    },
    mcq: { q: 'Pointer a walks A then switches to B; pointer b walks B then switches to A. Why do they meet at the intersection?', options: ['They walk at different speeds', 'Both walk exactly lenA + lenB − (shared part) steps before reaching it', 'The lists are sorted', 'They do not always meet'], answer: 1, explain: 'a covers A-only + shared + B-only; b covers B-only + shared + A-only. Same total, so they arrive at the shared start together (or both reach null together if there is none).' },
    hints: [
      `<p>The only problem is the different lengths before the merge point. If both pointers had walked the same number of nodes, they would line up.</p>`,
      `<p>Two pointers. When one reaches the end of its list, restart it at the head of the <b>other</b> list. Compare references at every step.</p>`,
      `<p>Loop <code>while (a != b)</code>: <code>a = (a == null) ? headB : a.next</code>, same for b. If there is no intersection, both become null at the same time after m + n steps, so the loop ends with null.</p>`
    ],
    // The test format cannot share nodes between two lists, so tests.harness has a test-only
    // intersectIndex builder: A = a + shared, B = b + shared (the same shared nodes).
    // It returns the index in A of the node found, or -1 for null.
    tests: { sig: 'int[] int[] int[] -> int', fn: 'intersectIndex', harness: {
        java: "class Check {\n    // A = a + shared, B = b + shared (the same nodes); index in A of the answer, -1 = null\n    static int intersectIndex(int[] a, int[] b, int[] shared) {\n        ListNode common = build(shared, null);\n        ListNode headA = build(a, common), headB = build(b, common);\n        ListNode hit = new Solution().getIntersectionNode(headA, headB);\n        int i = 0;\n        for (ListNode c = headA; c != null; c = c.next, i++) if (c == hit) return i;\n        return -1;\n    }\n    static ListNode build(int[] vals, ListNode tail) {\n        for (int i = vals.length - 1; i >= 0; i--) tail = new ListNode(vals[i], tail);\n        return tail;\n    }\n}",
        python: "def intersect_index(a, b, shared):\n    def build(vals, tail):\n        for v in reversed(vals):\n            tail = ListNode(v, tail)\n        return tail\n    common = build(shared, None)\n    head_a = build(a, common)\n    hit = Solution().get_intersection_node(head_a, build(b, common))\n    c, i = head_a, 0\n    while c:\n        if c is hit:\n            return i\n        c, i = c.next, i + 1\n    return -1",
        js: "function intersectIndex(a, b, shared) {\n  const build = (vals, tail) => vals.reduceRight((next, v) => new ListNode(v, next), tail);\n  const common = build(shared, null), headA = build(a, common);\n  const hit = new Solution().getIntersectionNode(headA, build(b, common));\n  let i = 0;\n  for (let c = headA; c !== null; c = c.next, i++) if (c === hit) return i;\n  return -1;\n}",
        cpp: "int intersectIndex(vector<int>& a, vector<int>& b, vector<int>& shared) {\n    auto build = [](const vector<int>& vals, ListNode* tail) {\n        for (auto it = vals.rbegin(); it != vals.rend(); ++it) tail = new ListNode(*it, tail);\n        return tail;\n    };\n    ListNode* common = build(shared, nullptr);\n    ListNode* headA = build(a, common);\n    ListNode* hit = getIntersectionNode(headA, build(b, common));\n    int i = 0;\n    for (ListNode* c = headA; c; c = c->next, i++) if (c == hit) return i;\n    return -1;\n}"
      }, cases: [
      [[[4, 1], [5, 6, 1], [8, 4, 5]], 2],
      [[[1, 9, 1], [3], [2, 4]], 3],
      [[[2, 6, 4], [1, 5], []], -1],
      [[[], [1, 2], [3]], 0],
      [[[1], [], [1]], 1],
      [[[], [], [7]], 0],
      [[[1, 2, 3], [4, 5], []], -1],
      [[[1, 1, 1], [1], [1, 1]], 3],
      // lists of 3*10^4 nodes (largest input)
      [[{ $range: [0, 20000] }, { $rep: 5, n: 20000 }, { $range: [0, 10000] }], 20000],
      [[{ $range: [0, 30000] }, { $range: [0, 30000] }, []], -1]
    ] },
    solution: {
      approach: `<p>Switch heads at the end to equalise path lengths; meet at the first shared node or at null.</p>`,
      code: `
class Solution {
    public ListNode getIntersectionNode(ListNode headA, ListNode headB) {
        ListNode a = headA, b = headB;
        while (a != b) {                       // compares node identity
            a = (a == null) ? headB : a.next;  // finished A? continue on B
            b = (b == null) ? headA : b.next;  // finished B? continue on A
        }
        return a;                              // the meeting node, or null
    }
}`,
      alt: [
        { lang: 'python', code: `class Solution:
    def get_intersection_node(self, head_a, head_b):
        a, b = head_a, head_b
        while a is not b:                          # compares node identity
            a = a.next if a else head_b            # finished A? continue on B
            b = b.next if b else head_a            # finished B? continue on A
        return a                                   # the meeting node, or None` },
        { lang: 'js', code: `class Solution {
  getIntersectionNode(headA, headB) {
    let a = headA, b = headB;
    while (a !== b) {                          // compares node identity
      a = a === null ? headB : a.next;         // finished A? continue on B
      b = b === null ? headA : b.next;         // finished B? continue on A
    }
    return a;                                  // the meeting node, or null
  }
}` },
        { lang: 'cpp', code: `// LeetCode provides this node type; it is spelled out so the snippet compiles on its own.
struct ListNode {
    int val; ListNode* next;
    ListNode(int x = 0, ListNode* n = nullptr) : val(x), next(n) {}
};

ListNode* getIntersectionNode(ListNode* headA, ListNode* headB) {
    ListNode *a = headA, *b = headB;
    while (a != b) {                           // compares addresses
        a = a ? a->next : headB;               // finished A? continue on B
        b = b ? b->next : headA;               // finished B? continue on A
    }
    return a;                                  // the meeting node, or nullptr
}` }
      ],
      complexity: `<p><b>Time O(m + n)</b> — each pointer walks at most both lists once. <b>Space O(1)</b>.</p>`,
      followUps: ['Alternative: compute both lengths, advance the longer list by the difference, then walk together.', 'How would you detect the intersection if the lists could contain cycles?']
    }
  });

  practice.push({
    title: 'Palindrome Linked List',
    level: 'Easy',
    tags: ['fast & slow', 'reversal'],
    companies: ['Amazon', 'Meta', 'Microsoft'],
    statement: `<p>Given the <code>head</code> of a singly linked list, return <code>true</code> if its values read the same forwards and backwards. Follow-up: O(N) time and <b>O(1)</b> extra space.</p>`,
    constraints: `1 ≤ nodes ≤ 10<sup>5</sup>, 0 ≤ Node.val ≤ 9`,
    example: `${chain([1, 2, 2, 1], { 0: 'b', 3: 'b', 1: 'y', 2: 'y' })}<p>→ ${H.c('g', 'true')}: outer pair 1/1 matches, inner pair 2/2 matches. <code>1 → 2</code> → ${H.c('r', 'false')}.</p>`,
    brute: {
      why: `<p>Copy all values into an ArrayList and compare from both ends with two indices. O(N) time but O(N) memory — the follow-up forbids it.</p>`,
      code: {
          lang: 'java',
          code: `
boolean isPalindrome(ListNode head) {
    List<Integer> vals = new ArrayList<>();
    for (ListNode c = head; c != null; c = c.next) vals.add(c.val);
    for (int i = 0, j = vals.size() - 1; i < j; i++, j--)
        if (!vals.get(i).equals(vals.get(j))) return false;
    return true;
}`,
          alt: [
            { lang: 'python', code: `def is_palindrome(head):
    vals = []
    c = head
    while c is not None:
        vals.append(c.val)
        c = c.next
    i, j = 0, len(vals) - 1
    while i < j:
        if vals[i] != vals[j]:
            return False
        i += 1
        j -= 1
    return True` },
            { lang: 'js', code: `function isPalindrome(head) {
  const vals = [];
  for (let c = head; c !== null; c = c.next) vals.push(c.val);
  for (let i = 0, j = vals.length - 1; i < j; i++, j--)
    if (vals[i] !== vals[j]) return false;
  return true;
}` },
            { lang: 'cpp', code: `bool isPalindrome(ListNode* head) {
    vector<int> vals;
    for (ListNode* c = head; c != nullptr; c = c->next) vals.push_back(c->val);
    for (int i = 0, j = (int)vals.size() - 1; i < j; i++, j--)
        if (vals[i] != vals[j]) return false;
    return true;
}` }
          ]
        }
    },
    mcq: { q: 'For O(1) space, which two building blocks do you combine?', options: ['Sorting + binary search', 'Find the middle + reverse the second half', 'HashMap + counting', 'Recursion + memoization'], answer: 1, explain: 'Reverse the second half in place; now you can walk from the head and from the reversed half at the same time and compare.' },
    hints: [
      `<p>Comparing "front" with "back" needs a way to walk backwards. A singly list cannot — unless you reverse half of it.</p>`,
      `<p>Fast &amp; slow to find the middle; reverse from slow to the end; compare the two halves node by node.</p>`,
      `<p>Odd lengths: the middle node ends up in the second half and is compared with nothing extra — compare while the reversed pointer is non-null. Be polite: reverse the second half back before returning.</p>`
    ],
    // both: 0 -> the answer is [returned value, the list after the call], so the restore step is checked too.
    tests: { sig: 'ListNode -> bool', fn: 'isPalindrome', both: 0, cases: [
      [[[1, 2, 2, 1]], [true, [1, 2, 2, 1]]],
      [[[1, 2]], [false, [1, 2]]],
      [[[1]], [true, [1]]],
      [[[1, 2, 1]], [true, [1, 2, 1]]],
      [[[1, 2, 3, 1]], [false, [1, 2, 3, 1]]],
      [[[9, 9]], [true, [9, 9]]],
      [[[0, 0, 1]], [false, [0, 0, 1]]],
      [[[1, 2, 3, 2, 1]], [true, [1, 2, 3, 2, 1]]],
      [[[1, 0, 0, 1, 0]], [false, [1, 0, 0, 1, 0]]],
      // 10^5 nodes (largest input)
      [[{ $concat: [{ $rep: 1, n: 49999 }, [2, 2], { $rep: 1, n: 49999 }] }], [true, { $concat: [{ $rep: 1, n: 49999 }, [2, 2], { $rep: 1, n: 49999 }] }]],
      [[{ $concat: [{ $rep: 3, n: 50000 }, [4], { $rep: 3, n: 49999 }] }], [false, { $concat: [{ $rep: 3, n: 50000 }, [4], { $rep: 3, n: 49999 }] }]],
      [[{ $concat: [{ $range: [0, 10] }, { $rep: 5, n: 99980 }, { $range: [9, -1, -1] }] }], [true, { $concat: [{ $range: [0, 10] }, { $rep: 5, n: 99980 }, { $range: [9, -1, -1] }] }]]
    ] },
    solution: {
      approach: `<p>Middle → reverse second half → compare → restore.</p>`,
      code: `
class Solution {
    public boolean isPalindrome(ListNode head) {
        ListNode slow = head, fast = head;
        while (fast != null && fast.next != null) {   // slow -> (second) middle
            slow = slow.next;
            fast = fast.next.next;
        }
        ListNode second = reverse(slow);              // reversed second half
        boolean ok = true;
        for (ListNode a = head, b = second; b != null; a = a.next, b = b.next) {
            if (a.val != b.val) { ok = false; break; }
        }
        reverse(second);                              // restore the input
        return ok;
    }

    private ListNode reverse(ListNode head) {
        ListNode prev = null;
        while (head != null) {
            ListNode next = head.next;
            head.next = prev;
            prev = head;
            head = next;
        }
        return prev;
    }
}`,
      alt: [
        { lang: 'python', code: `class Solution:
    def is_palindrome(self, head):
        slow = fast = head
        while fast and fast.next:                 # slow -> (second) middle
            slow, fast = slow.next, fast.next.next
        second = self._reverse(slow)              # reversed second half
        a, b, ok = head, second, True
        while b:
            if a.val != b.val:
                ok = False
                break
            a, b = a.next, b.next
        self._reverse(second)                     # restore the input
        return ok

    @staticmethod
    def _reverse(node):
        prev = None
        while node:
            node.next, prev, node = prev, node, node.next
        return prev` },
        { lang: 'js', code: `function reverse(head) {
  let prev = null;
  while (head !== null) {
    const next = head.next;
    head.next = prev;
    prev = head;
    head = next;
  }
  return prev;
}

function isPalindrome(head) {
  let slow = head, fast = head;
  while (fast !== null && fast.next !== null) {   // slow -> (second) middle
    slow = slow.next;
    fast = fast.next.next;
  }
  const second = reverse(slow);                   // reversed second half
  let ok = true;
  for (let a = head, b = second; b !== null; a = a.next, b = b.next) {
    if (a.val !== b.val) { ok = false; break; }
  }
  reverse(second);                                // restore the input
  return ok;
}` },
        { lang: 'cpp', code: `// LeetCode provides this node type; it is spelled out so the snippet compiles on its own.
struct ListNode {
    int val; ListNode* next;
    ListNode(int x = 0, ListNode* n = nullptr) : val(x), next(n) {}
};

class Solution {
public:
    bool isPalindrome(ListNode* head) {
        ListNode *slow = head, *fast = head;
        while (fast && fast->next) {              // slow -> (second) middle
            slow = slow->next;
            fast = fast->next->next;
        }
        ListNode* second = reverse(slow);         // reversed second half
        bool ok = true;
        for (ListNode *a = head, *b = second; b; a = a->next, b = b->next) {
            if (a->val != b->val) { ok = false; break; }
        }
        reverse(second);                          // restore the input
        return ok;
    }

private:
    static ListNode* reverse(ListNode* head) {
        ListNode* prev = nullptr;
        while (head) {
            ListNode* next = head->next;
            head->next = prev;
            prev = head;
            head = next;
        }
        return prev;
    }
};` }
      ],
      complexity: `<p><b>Time O(N)</b> (find middle, reverse, compare, restore — each linear). <b>Space O(1)</b>.</p>`,
      followUps: ['Why does the first half still reach the middle node after reversal (it still points into the reversed part)?', 'Is restoring the list important in a multi-threaded program?']
    }
  });

  // =====================================================================
  // PRACTICE — Medium
  // =====================================================================
  practice.push({
    title: 'Add Two Numbers',
    level: 'Medium',
    tags: ['dummy node', 'carry'],
    companies: ['Amazon', 'Microsoft', 'Bloomberg', 'Adobe'],
    statement: `<p>Two non-negative integers are stored as linked lists in <b>reverse order</b> (ones digit first), one digit per node. Return their sum as a linked list in the same format.</p>`,
    constraints: `1 ≤ nodes per list ≤ 100, 0 ≤ Node.val ≤ 9, no leading zeros except the number 0`,
    example: `<p>${H.c('b', '2 → 4 → 3')} (342) + ${H.c('y', '5 → 6 → 4')} (465) = ${H.c('g', '7 → 0 → 8')} (807).</p><p>Digit by digit: 2+5 = 7; 4+6 = 10 → write 0, carry 1; 3+4+1 = 8. <code>9 → 9</code> + <code>1</code> → <code>0 → 0 → 1</code> (the final carry creates a new node).</p>`,
    brute: {
      why: `<p>Convert both lists to <code>long</code>, add, convert back. It breaks on 100-digit numbers: a long holds only about 19 digits, so it <b>overflows</b>. (BigInteger works but hides the actual skill.)</p>`,
      code: {
          lang: 'java',
          code: `
ListNode addTwoNumbers(ListNode l1, ListNode l2) {
    long a = 0, b = 0, p = 1;
    for (ListNode c = l1; c != null; c = c.next, p *= 10) a += c.val * p;   // overflows past ~19 digits
    p = 1;
    for (ListNode c = l2; c != null; c = c.next, p *= 10) b += c.val * p;
    long s = a + b;
    ListNode dummy = new ListNode(0), tail = dummy;
    do { tail.next = new ListNode((int) (s % 10)); tail = tail.next; s /= 10; } while (s > 0);
    return dummy.next;
}`,
          alt: [
            { lang: 'python', code: `def add_two_numbers(l1, l2):
    a = b = 0
    p = 1
    c = l1
    while c is not None:
        a += c.val * p                    # Python ints never overflow, but this skips the carry logic
        p *= 10
        c = c.next
    p = 1
    c = l2
    while c is not None:
        b += c.val * p
        p *= 10
        c = c.next
    s = a + b
    dummy = ListNode(0)
    tail = dummy
    while True:
        tail.next = ListNode(s % 10)
        tail = tail.next
        s //= 10
        if s == 0:
            break
    return dummy.next` },
            { lang: 'js', code: `function addTwoNumbers(l1, l2) {
  let a = 0, b = 0, p = 1;
  for (let c = l1; c !== null; c = c.next, p *= 10) a += c.val * p;   // loses precision past ~15 digits
  p = 1;
  for (let c = l2; c !== null; c = c.next, p *= 10) b += c.val * p;
  let s = a + b;
  const dummy = new ListNode(0);
  let tail = dummy;
  do { tail.next = new ListNode(s % 10); tail = tail.next; s = Math.floor(s / 10); } while (s > 0);
  return dummy.next;
}` },
            { lang: 'cpp', code: `ListNode* addTwoNumbers(ListNode* l1, ListNode* l2) {
    long long a = 0, b = 0, p = 1;
    for (ListNode* c = l1; c != nullptr; c = c->next, p *= 10) a += c->val * p;   // overflows past ~19 digits
    p = 1;
    for (ListNode* c = l2; c != nullptr; c = c->next, p *= 10) b += c->val * p;
    long long s = a + b;
    ListNode* dummy = new ListNode(0);
    ListNode* tail = dummy;
    do { tail->next = new ListNode((int)(s % 10)); tail = tail->next; s /= 10; } while (s > 0);
    return dummy->next;
}` }
          ]
        }
    },
    mcq: { q: 'Both lists are exhausted but carry = 1. What now?', options: ['Ignore it', 'Append a new node with value 1', 'Add 1 to the head', 'Throw an exception'], answer: 1, explain: '99 + 1 = 100: the extra carry becomes a new most-significant digit, i.e. a new last node.' },
    hints: [
      `<p>Reverse order is a gift: the ones digits come first, exactly the order you add by hand.</p>`,
      `<p>Dummy + tail for the result; loop while <code>l1 != null || l2 != null || carry != 0</code>.</p>`,
      `<p>Each step: sum = carry + (l1 digit or 0) + (l2 digit or 0); new node sum % 10; carry = sum / 10; advance whichever lists are not null. Different lengths and the final carry are handled by the loop condition.</p>`
    ],
    tests: { sig: 'ListNode ListNode -> ListNode', fn: 'addTwoNumbers', cases: [
      [[[2, 4, 3], [5, 6, 4]], [7, 0, 8]],
      [[[0], [0]], [0]],
      [[[9, 9, 9, 9, 9, 9, 9], [9, 9, 9, 9]], [8, 9, 9, 9, 0, 0, 0, 1]],
      [[[9, 9], [1]], [0, 0, 1]],
      [[[1], [9, 9, 9]], [0, 0, 0, 1]],
      [[[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], [5, 6, 4]], [6, 6, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]],
      [[[9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9], [9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9]], [8, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 1]],
      // 100 digits each (largest input, far past a 64-bit integer)
      [[[9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9], [9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9]], [8, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 1]],
      [[[9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9], [1]], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]]
    ] },
    solution: {
      approach: `<p>Grade-school addition with a carry, building the answer with dummy + tail.</p>`,
      code: `
class Solution {
    public ListNode addTwoNumbers(ListNode l1, ListNode l2) {
        ListNode dummy = new ListNode(0), tail = dummy;
        int carry = 0;
        while (l1 != null || l2 != null || carry != 0) {
            int sum = carry;
            if (l1 != null) { sum += l1.val; l1 = l1.next; }
            if (l2 != null) { sum += l2.val; l2 = l2.next; }
            tail.next = new ListNode(sum % 10);   // digit to write
            tail = tail.next;
            carry = sum / 10;                     // 0 or 1
        }
        return dummy.next;
    }
}`,
      alt: [
        { lang: 'python', code: `class Solution:
    def add_two_numbers(self, l1, l2):
        dummy = tail = ListNode(0)
        carry = 0
        while l1 or l2 or carry:
            if l1:
                carry += l1.val
                l1 = l1.next
            if l2:
                carry += l2.val
                l2 = l2.next
            carry, digit = divmod(carry, 10)      # carry is 0 or 1 again
            tail.next = tail = ListNode(digit)    # attach, then step onto it
        return dummy.next` },
        { lang: 'js', code: `function addTwoNumbers(l1, l2) {
  const dummy = new ListNode(0);
  let tail = dummy, carry = 0;
  while (l1 !== null || l2 !== null || carry !== 0) {
    let sum = carry;
    if (l1 !== null) { sum += l1.val; l1 = l1.next; }
    if (l2 !== null) { sum += l2.val; l2 = l2.next; }
    tail.next = new ListNode(sum % 10);   // digit to write
    tail = tail.next;
    carry = Math.floor(sum / 10);         // 0 or 1 (plain / would give a fraction)
  }
  return dummy.next;
}` },
        { lang: 'cpp', code: `// LeetCode provides this node type; it is spelled out so the snippet compiles on its own.
struct ListNode {
    int val; ListNode* next;
    ListNode(int x = 0, ListNode* n = nullptr) : val(x), next(n) {}
};

class Solution {
public:
    ListNode* addTwoNumbers(ListNode* l1, ListNode* l2) {
        ListNode dummy;
        ListNode* tail = &dummy;
        int carry = 0;
        while (l1 || l2 || carry) {
            int sum = carry;
            if (l1) { sum += l1->val; l1 = l1->next; }
            if (l2) { sum += l2->val; l2 = l2->next; }
            tail->next = new ListNode(sum % 10);   // digit to write
            tail = tail->next;
            carry = sum / 10;                      // 0 or 1
        }
        return dummy.next;
    }
};` }
      ],
      complexity: `<p><b>Time O(max(m, n))</b>. <b>Space O(1)</b> extra besides the output list (max(m, n) + 1 nodes).</p>`,
      followUps: ['Digits stored most-significant first (Add Two Numbers II): reverse both, or use two stacks.', 'Subtract instead of add — how do you handle the borrow and leading zeros?']
    }
  });

  practice.push({
    title: 'Odd Even Linked List',
    level: 'Medium',
    tags: ['in-place', 'two lists'],
    companies: ['Amazon', 'Microsoft'],
    statement: `<p>Group all nodes at <b>odd positions</b> (1st, 3rd, 5th, …) first, followed by the nodes at <b>even positions</b>, keeping the relative order inside each group. Positions, not values. O(1) extra space, O(N) time.</p>`,
    constraints: `0 ≤ nodes ≤ 10<sup>4</sup>, -10<sup>6</sup> ≤ Node.val ≤ 10<sup>6</sup>`,
    example: `${chain([2, 1, 3, 5, 6, 4, 7], { 0: 'b', 2: 'b', 4: 'b', 6: 'b', 1: 'y', 3: 'y', 5: 'y' })}<p>→ ${H.c('b', '2 → 3 → 6 → 7')} → ${H.c('y', '1 → 5 → 4')}. Positions 1, 3, 5, 7 first, then 2, 4, 6.</p>`,
    brute: {
      why: `<p>Copy odd-position values into one ArrayList and even-position values into another, then rewrite the node values in order. O(N) extra memory and it changes values rather than re-linking nodes.</p>`,
      code: {
          lang: 'java',
          code: `
ListNode oddEvenList(ListNode head) {
    List<Integer> odd = new ArrayList<>(), even = new ArrayList<>();
    int pos = 1;
    for (ListNode c = head; c != null; c = c.next, pos++) (pos % 2 == 1 ? odd : even).add(c.val);
    odd.addAll(even);
    int i = 0;
    for (ListNode c = head; c != null; c = c.next) c.val = odd.get(i++);
    return head;
}`,
          alt: [
            { lang: 'python', code: `def odd_even_list(head):
    odd, even = [], []
    pos = 1
    c = head
    while c is not None:
        (odd if pos % 2 == 1 else even).append(c.val)
        c = c.next
        pos += 1
    odd.extend(even)
    c = head
    for v in odd:
        c.val = v
        c = c.next
    return head` },
            { lang: 'js', code: `function oddEvenList(head) {
  const odd = [], even = [];
  let pos = 1;
  for (let c = head; c !== null; c = c.next, pos++) (pos % 2 === 1 ? odd : even).push(c.val);
  odd.push(...even);
  let i = 0;
  for (let c = head; c !== null; c = c.next) c.val = odd[i++];
  return head;
}` },
            { lang: 'cpp', code: `ListNode* oddEvenList(ListNode* head) {
    vector<int> odd, even;
    int pos = 1;
    for (ListNode* c = head; c != nullptr; c = c->next, pos++) (pos % 2 == 1 ? odd : even).push_back(c->val);
    odd.insert(odd.end(), even.begin(), even.end());
    int i = 0;
    for (ListNode* c = head; c != nullptr; c = c->next) c->val = odd[i++];
    return head;
}` }
          ]
        }
    },
    mcq: { q: 'What must you save before the loop so you can glue the two groups at the end?', options: ['The tail of the list', 'The head of the even list (head.next)', 'The middle node', 'The length'], answer: 1, explain: 'The odd chain starts at head; the even chain starts at head.next. After weaving, odd.next = evenHead connects them.' },
    hints: [
      `<p>Odd and even nodes alternate. If every node skips its neighbour (<code>node.next = node.next.next</code>), you get two separate chains.</p>`,
      `<p>Pointers <code>odd = head</code>, <code>even = head.next</code>, <code>evenHead = even</code>. Advance them leapfrog style.</p>`,
      `<p>Loop while <code>even != null &amp;&amp; even.next != null</code>: odd.next = even.next; odd = odd.next; even.next = odd.next; even = even.next. Finally odd.next = evenHead. Handle head == null first.</p>`
    ],
    tests: { sig: 'ListNode -> ListNode', fn: 'oddEvenList', cases: [
      [[[1, 2, 3, 4, 5]], [1, 3, 5, 2, 4]],
      [[[2, 1, 3, 5, 6, 4, 7]], [2, 3, 6, 7, 1, 5, 4]],
      [[[]], []],
      [[[1]], [1]],
      [[[1, 2]], [1, 2]],
      [[[-1000000, 1000000, 0]], [-1000000, 0, 1000000]],
      [[[1, 2, 3, 4]], [1, 3, 2, 4]],
      [[{ $range: [0, 10000] }], { $concat: [{ $range: [0, 10000, 2] }, { $range: [1, 10000, 2] }] }]   // 10^4 nodes
    ] },
    solution: {
      approach: `<p>Weave two chains in place, then append the even chain to the odd chain.</p>`,
      code: `
class Solution {
    public ListNode oddEvenList(ListNode head) {
        if (head == null) return null;
        ListNode odd = head, even = head.next, evenHead = even;
        while (even != null && even.next != null) {
            odd.next = even.next;    // next odd node
            odd = odd.next;
            even.next = odd.next;    // next even node
            even = even.next;
        }
        odd.next = evenHead;         // glue: odds then evens
        return head;
    }
}`,
      alt: [
        { lang: 'python', code: `class Solution:
    def odd_even_list(self, head):
        if head is None:
            return None
        odd, even = head, head.next
        even_head = even
        while even and even.next:
            odd.next = even.next     # next odd node
            odd = odd.next
            even.next = odd.next     # next even node
            even = even.next
        odd.next = even_head         # glue: odds then evens
        return head` },
        { lang: 'js', code: `function oddEvenList(head) {
  if (head === null) return null;
  let odd = head, even = head.next;
  const evenHead = even;
  while (even !== null && even.next !== null) {
    odd.next = even.next;      // next odd node
    odd = odd.next;
    even.next = odd.next;      // next even node
    even = even.next;
  }
  odd.next = evenHead;         // glue: odds then evens
  return head;
}` },
        { lang: 'cpp', code: `// LeetCode provides this node type; it is spelled out so the snippet compiles on its own.
struct ListNode {
    int val; ListNode* next;
    ListNode(int x = 0, ListNode* n = nullptr) : val(x), next(n) {}
};

class Solution {
public:
    ListNode* oddEvenList(ListNode* head) {
        if (!head) return nullptr;
        ListNode *odd = head, *even = head->next, *evenHead = even;
        while (even && even->next) {
            odd->next = even->next;    // next odd node
            odd = odd->next;
            even->next = odd->next;    // next even node
            even = even->next;
        }
        odd->next = evenHead;          // glue: odds then evens
        return head;
    }
};` }
      ],
      dry: { head: ['step', 'odd chain', 'even chain'], rows: [['start', '2', '1'], ['1', '2 → 3', '1 → 5'], ['2', '2 → 3 → 6', '1 → 5 → 4'], ['3', '2 → 3 → 6 → 7', '1 → 5 → 4 → null'], ['glue', '<span class="c-g">2 → 3 → 6 → 7 → 1 → 5 → 4</span>', '—']] },
      complexity: `<p><b>Time O(N)</b>, <b>Space O(1)</b>.</p>`
    }
  });

  practice.push({
    title: 'Swap Nodes in Pairs',
    level: 'Medium',
    tags: ['dummy node', 'reversal'],
    companies: ['Amazon', 'Meta', 'Microsoft'],
    statement: `<p>Swap every two adjacent nodes and return the new head. You must change <b>links</b>, not values.</p>`,
    constraints: `0 ≤ nodes ≤ 100, 0 ≤ Node.val ≤ 100`,
    example: `${chain([1, 2, 3, 4])}<p>→ ${H.c('g', '2 → 1 → 4 → 3')}. <code>[1, 2, 3]</code> → <code>2 → 1 → 3</code> (the lonely last node stays).</p>`,
    brute: {
      why: `<p>Swap the <b>values</b> of each pair. It produces the right sequence in O(N), but the problem forbids changing values — imagine nodes carrying large payloads or being referenced elsewhere.</p>`,
      code: {
          lang: 'java',
          code: `
ListNode swapPairs(ListNode head) {
    for (ListNode c = head; c != null && c.next != null; c = c.next.next) {
        int t = c.val; c.val = c.next.val; c.next.val = t;   // swaps values, not nodes
    }
    return head;
}`,
          alt: [
            { lang: 'python', code: `def swap_pairs(head):
    c = head
    while c is not None and c.next is not None:
        c.val, c.next.val = c.next.val, c.val    # swaps values, not nodes
        c = c.next.next
    return head` },
            { lang: 'js', code: `function swapPairs(head) {
  for (let c = head; c !== null && c.next !== null; c = c.next.next) {
    const t = c.val; c.val = c.next.val; c.next.val = t;   // swaps values, not nodes
  }
  return head;
}` },
            { lang: 'cpp', code: `ListNode* swapPairs(ListNode* head) {
    for (ListNode* c = head; c != nullptr && c->next != nullptr; c = c->next->next) {
        int t = c->val; c->val = c->next->val; c->next->val = t;   // swaps values, not nodes
    }
    return head;
}` }
          ]
        }
    },
    mcq: { q: 'With prev → a → b → rest, which assignment order swaps a and b safely?', options: ['a.next = b; b.next = rest; prev.next = a', 'prev.next = b; a.next = b.next; b.next = a', 'b.next = a; prev.next = b; a.next = b.next', 'prev.next = a.next; b.next = prev'], answer: 1, explain: 'prev.next = b first, then a.next = b.next (= rest, still intact), then b.next = a. Option C sets b.next = a before reading b.next, losing rest.' },
    hints: [
      `<p>This is "reverse in groups of 2". Each swap touches three links: prev → a, a → b, b → rest.</p>`,
      `<p>Dummy node + <code>prev</code>. For each pair: a = prev.next, b = a.next; rewire; then prev = a (a is now second in the pair).</p>`,
      `<p>Stop when fewer than two nodes remain: <code>while (prev.next != null &amp;&amp; prev.next.next != null)</code>. Read b.next before overwriting it.</p>`
    ],
    tests: { sig: 'ListNode -> ListNode', fn: 'swapPairs', cases: [
      [[[1, 2, 3, 4]], [2, 1, 4, 3]],
      [[[]], []],
      [[[1]], [1]],
      [[[1, 2, 3]], [2, 1, 3]],
      [[[1, 2, 3, 4, 5, 6]], [2, 1, 4, 3, 6, 5]],
      [[[5, 5]], [5, 5]]
    ] },
    solution: {
      approach: `<p>Dummy + prev; three pointer writes per pair; prev jumps to the node that moved second.</p>`,
      code: `
class Solution {
    public ListNode swapPairs(ListNode head) {
        ListNode dummy = new ListNode(0, head), prev = dummy;
        while (prev.next != null && prev.next.next != null) {
            ListNode a = prev.next, b = a.next;
            prev.next = b;       // prev -> b
            a.next = b.next;     // a -> rest
            b.next = a;          // b -> a
            prev = a;            // a is now the second node of the pair
        }
        return dummy.next;
    }
}`,
      alt: [
        { lang: 'python', code: `class Solution:
    def swap_pairs(self, head):
        dummy = prev = ListNode(0, head)
        while prev.next and prev.next.next:
            a, b = prev.next, prev.next.next
            prev.next, a.next, b.next = b, b.next, a   # prev -> b, a -> rest, b -> a
            prev = a                                    # a is now second in the pair
        return dummy.next` },
        { lang: 'js', code: `function swapPairs(head) {
  const dummy = new ListNode(0, head);
  let prev = dummy;
  while (prev.next !== null && prev.next.next !== null) {
    const a = prev.next, b = a.next;
    prev.next = b;         // prev -> b
    a.next = b.next;       // a -> rest
    b.next = a;            // b -> a
    prev = a;              // a is now the second node of the pair
  }
  return dummy.next;
}` },
        { lang: 'cpp', code: `// LeetCode provides this node type; it is spelled out so the snippet compiles on its own.
struct ListNode {
    int val; ListNode* next;
    ListNode(int x = 0, ListNode* n = nullptr) : val(x), next(n) {}
};

class Solution {
public:
    ListNode* swapPairs(ListNode* head) {
        ListNode dummy(0, head);
        ListNode* prev = &dummy;
        while (prev->next && prev->next->next) {
            ListNode *a = prev->next, *b = a->next;
            prev->next = b;        // prev -> b
            a->next = b->next;     // a -> rest
            b->next = a;           // b -> a
            prev = a;              // a is now the second node of the pair
        }
        return dummy.next;
    }
};` }
      ],
      complexity: `<p><b>Time O(N)</b>, <b>Space O(1)</b>.</p>`,
      followUps: ['Generalise to k (Reverse Nodes in k-Group).', 'Recursive version: swapPairs(head) = b with b.next = a and a.next = swapPairs(rest).']
    }
  });

  practice.push({
    title: 'Reverse Linked List II (between left and right)',
    level: 'Medium',
    tags: ['reversal', 'dummy node'],
    companies: ['Amazon', 'Meta', 'Microsoft'],
    statement: `<p>Given the <code>head</code> of a singly linked list and two positions <code>left ≤ right</code> (1-indexed), reverse the nodes from position left to position right and return the list. Do it in one pass.</p>`,
    constraints: `1 ≤ n ≤ 500, -500 ≤ Node.val ≤ 500, 1 ≤ left ≤ right ≤ n`,
    example: `${chain([1, 2, 3, 4, 5], { 1: 'y', 2: 'y', 3: 'y' })}<p>left = 2, right = 4 → ${H.c('m', '1')} → ${H.c('g', '4 → 3 → 2')} → ${H.c('m', '5')}. With left = 1 the head changes — use a dummy.</p>`,
    brute: {
      why: `<p>Copy values into an array, reverse the sub-array [left−1, right−1], write the values back. O(N) time but O(N) memory and it swaps values instead of links.</p>`,
      code: {
          lang: 'java',
          code: `
ListNode reverseBetween(ListNode head, int left, int right) {
    List<Integer> vals = new ArrayList<>();
    for (ListNode c = head; c != null; c = c.next) vals.add(c.val);
    Collections.reverse(vals.subList(left - 1, right));   // reverse the middle part
    int i = 0;
    for (ListNode c = head; c != null; c = c.next) c.val = vals.get(i++);
    return head;
}`,
          alt: [
            { lang: 'python', code: `def reverse_between(head, left, right):
    vals = []
    c = head
    while c is not None:
        vals.append(c.val)
        c = c.next
    vals[left - 1:right] = vals[left - 1:right][::-1]    # reverse the middle part
    c = head
    for v in vals:
        c.val = v
        c = c.next
    return head` },
            { lang: 'js', code: `function reverseBetween(head, left, right) {
  const vals = [];
  for (let c = head; c !== null; c = c.next) vals.push(c.val);
  const mid = vals.slice(left - 1, right).reverse();    // reverse the middle part
  vals.splice(left - 1, right - left + 1, ...mid);
  let i = 0;
  for (let c = head; c !== null; c = c.next) c.val = vals[i++];
  return head;
}` },
            { lang: 'cpp', code: `ListNode* reverseBetween(ListNode* head, int left, int right) {
    vector<int> vals;
    for (ListNode* c = head; c != nullptr; c = c->next) vals.push_back(c->val);
    reverse(vals.begin() + (left - 1), vals.begin() + right);   // reverse the middle part
    int i = 0;
    for (ListNode* c = head; c != nullptr; c = c->next) c->val = vals[i++];
    return head;
}` }
          ]
        }
    },
    mcq: { q: 'In the "head insertion" method, <code>pre</code> sits before position left and <code>curr = pre.next</code> stays fixed. What does each step do?', options: ['Swaps curr with its neighbour values', 'Moves the node after curr to the front of the sublist (right after pre)', 'Reverses the whole list', 'Moves curr to the end'], answer: 1, explain: 'Take move = curr.next, unlink it, insert it after pre. After right − left steps the sublist is reversed and curr has drifted to the end of it.' },
    hints: [
      `<p>Only three places change: the node before the sublist, the sublist itself, and the node after it.</p>`,
      `<p>Dummy; walk <code>pre</code> left − 1 steps; <code>curr = pre.next</code>. Repeat right − left times: pull the node after curr and insert it right after pre.</p>`,
      `<p>Loop body: move = curr.next; curr.next = move.next; move.next = pre.next; pre.next = move. curr never moves but ends as the sublist's tail. Return dummy.next (left = 1 changes the head).</p>`
    ],
    tests: { sig: 'ListNode int int -> ListNode', fn: 'reverseBetween', cases: [
      [[[1, 2, 3, 4, 5], 2, 4], [1, 4, 3, 2, 5]],
      [[[5], 1, 1], [5]],
      [[[3, 5], 1, 2], [5, 3]],
      [[[1, 2, 3, 4, 5], 1, 5], [5, 4, 3, 2, 1]],
      [[[1, 2, 3, 4, 5], 3, 3], [1, 2, 3, 4, 5]],
      [[[1, 2, 3, 4, 5], 4, 5], [1, 2, 3, 5, 4]],
      [[[-500, 0, 500], 1, 2], [0, -500, 500]]
    ] },
    solution: {
      approach: `<p>Dummy + "head insertion": repeatedly pull the next node to the front of the sublist.</p>`,
      code: `
class Solution {
    public ListNode reverseBetween(ListNode head, int left, int right) {
        ListNode dummy = new ListNode(0, head), pre = dummy;
        for (int i = 1; i < left; i++) pre = pre.next;   // pre = node before position left
        ListNode curr = pre.next;                         // will end up as the sublist's tail
        for (int i = 0; i < right - left; i++) {
            ListNode move = curr.next;   // node to bring to the front
            curr.next = move.next;       // unlink it
            move.next = pre.next;        // put it before the current sublist head
            pre.next = move;             // ...and hook it after pre
        }
        return dummy.next;
    }
}`,
      alt: [
        { lang: 'python', code: `class Solution:
    def reverse_between(self, head, left, right):
        dummy = pre = ListNode(0, head)
        for _ in range(left - 1):        # pre = node before position left
            pre = pre.next
        curr = pre.next                  # will end up as the sublist's tail
        for _ in range(right - left):
            move = curr.next             # node to bring to the front
            curr.next = move.next        # unlink it
            move.next = pre.next         # put it before the current sublist head
            pre.next = move              # ...and hook it after pre
        return dummy.next` },
        { lang: 'js', code: `function reverseBetween(head, left, right) {
  const dummy = new ListNode(0, head);
  let pre = dummy;
  for (let i = 1; i < left; i++) pre = pre.next;   // pre = node before position left
  const curr = pre.next;                           // will end up as the sublist's tail
  for (let i = 0; i < right - left; i++) {
    const move = curr.next;      // node to bring to the front
    curr.next = move.next;       // unlink it
    move.next = pre.next;        // put it before the current sublist head
    pre.next = move;             // ...and hook it after pre
  }
  return dummy.next;
}` },
        { lang: 'cpp', code: `// LeetCode provides this node type; it is spelled out so the snippet compiles on its own.
struct ListNode {
    int val; ListNode* next;
    ListNode(int x = 0, ListNode* n = nullptr) : val(x), next(n) {}
};

class Solution {
public:
    ListNode* reverseBetween(ListNode* head, int left, int right) {
        ListNode dummy(0, head);
        ListNode* pre = &dummy;
        for (int i = 1; i < left; i++) pre = pre->next;   // node before position left
        ListNode* curr = pre->next;                       // ends as the sublist's tail
        for (int i = 0; i < right - left; i++) {
            ListNode* move = curr->next;   // node to bring to the front
            curr->next = move->next;       // unlink it
            move->next = pre->next;        // put it before the current sublist head
            pre->next = move;              // ...and hook it after pre
        }
        return dummy.next;
    }
};` }
      ],
      dry: { head: ['step', 'list (left=2, right=4)'], rows: [['start', '1 → [2 → 3 → 4] → 5'], ['move 3', '1 → [3 → 2 → 4] → 5'], ['move 4', '1 → <span class="c-g">[4 → 3 → 2]</span> → 5']] },
      complexity: `<p><b>Time O(N)</b> (walk to left, then right − left moves). <b>Space O(1)</b>.</p>`
    }
  });

  practice.push({
    title: 'Reorder List',
    level: 'Medium',
    tags: ['fast & slow', 'reversal', 'merge'],
    companies: ['Amazon', 'Meta', 'Microsoft', 'Adobe'],
    statement: `<p>Given L<sub>0</sub> → L<sub>1</sub> → … → L<sub>n−1</sub> → L<sub>n</sub>, reorder it in place to L<sub>0</sub> → L<sub>n</sub> → L<sub>1</sub> → L<sub>n−1</sub> → L<sub>2</sub> → L<sub>n−2</sub> → … Only links may change.</p>`,
    constraints: `1 ≤ nodes ≤ 5·10<sup>4</sup>, 1 ≤ Node.val ≤ 1000`,
    example: `${chain([1, 2, 3, 4, 5], { 0: 'b', 1: 'b', 2: 'b', 3: 'y', 4: 'y' })}<p>→ ${H.c('g', '1 → 5 → 2 → 4 → 3')}: take one from the front, one from the back, alternately.</p>`,
    brute: {
      why: `<p>Store all nodes in an ArrayList, then use two indices i (front) and j (back) to relink. O(N) time but O(N) extra memory for the array of references.</p>`,
      code: {
          lang: 'java',
          code: `
void reorderList(ListNode head) {
    List<ListNode> nodes = new ArrayList<>();
    for (ListNode c = head; c != null; c = c.next) nodes.add(c);
    int i = 0, j = nodes.size() - 1;
    while (i < j) {
        nodes.get(i).next = nodes.get(j);   // front -> back
        i++;
        if (i == j) break;
        nodes.get(j).next = nodes.get(i);   // back -> next front
        j--;
    }
    nodes.get(i).next = null;               // new tail
}`,
          alt: [
            { lang: 'python', code: `def reorder_list(head):
    nodes = []
    c = head
    while c is not None:
        nodes.append(c)
        c = c.next
    i, j = 0, len(nodes) - 1
    while i < j:
        nodes[i].next = nodes[j]          # front -> back
        i += 1
        if i == j:
            break
        nodes[j].next = nodes[i]          # back -> next front
        j -= 1
    nodes[i].next = None                  # new tail` },
            { lang: 'js', code: `function reorderList(head) {
  const nodes = [];
  for (let c = head; c !== null; c = c.next) nodes.push(c);
  let i = 0, j = nodes.length - 1;
  while (i < j) {
    nodes[i].next = nodes[j];   // front -> back
    i++;
    if (i === j) break;
    nodes[j].next = nodes[i];   // back -> next front
    j--;
  }
  nodes[i].next = null;         // new tail
}` },
            { lang: 'cpp', code: `void reorderList(ListNode* head) {
    vector<ListNode*> nodes;
    for (ListNode* c = head; c != nullptr; c = c->next) nodes.push_back(c);
    int i = 0, j = (int)nodes.size() - 1;
    while (i < j) {
        nodes[i]->next = nodes[j];   // front -> back
        i++;
        if (i == j) break;
        nodes[j]->next = nodes[i];   // back -> next front
        j--;
    }
    nodes[i]->next = nullptr;        // new tail
}` }
          ]
        }
    },
    mcq: { q: 'Which three known steps solve Reorder List in O(1) space?', options: ['Sort, dedupe, merge', 'Find middle, reverse second half, interleave the halves', 'Reverse whole list, then merge with itself', 'Use a stack of all nodes'], answer: 1, explain: 'The back half read backwards is just the reversed second half; then alternate nodes from the two halves.' },
    hints: [
      `<p>"Front, back, front, back…" — the back elements in that order are the second half <b>reversed</b>.</p>`,
      `<p>Three helpers you already know: middle (first-middle variant), reverse, and an alternating merge.</p>`,
      `<p>Cut after the middle (<code>slow.next = null</code>) so the first half ends; reverse the second half; then weave: save both nexts, link a → b → (a's old next), advance both. The first half is equal or one longer, so stop when the second half runs out.</p>`
    ],
    // check: compares with the expected list, or (expected null, for the 5*10^4 case) with a brute-force
    // front/back interleave computed from the input.
    tests: { sig: 'ListNode -> void', fn: 'reorderList', mutate: 0, check: '(args, out, exp) => { const a = args[0], r = []; for (let i = 0, j = a.length - 1; i <= j; ) { r.push(a[i++]); if (i <= j) r.push(a[j--]); } return JSON.stringify(out) === JSON.stringify(exp === null ? r : exp); }', cases: [
      [[[1, 2, 3, 4]], [1, 4, 2, 3]],
      [[[1, 2, 3, 4, 5]], [1, 5, 2, 4, 3]],
      [[[1]], [1]],
      [[[1, 2]], [1, 2]],
      [[[1, 2, 3]], [1, 3, 2]],
      [[[1, 2, 3, 4, 5, 6]], [1, 6, 2, 5, 3, 4]],
      [[[1000, 1, 1000]], [1000, 1000, 1]],
      [[{ $range: [1, 50001] }], null]   // 5*10^4 nodes (largest input)
    ] },
    solution: {
      approach: `<p>Split at the first middle, reverse the second half, interleave.</p>`,
      code: `
class Solution {
    public void reorderList(ListNode head) {
        if (head == null || head.next == null) return;
        ListNode slow = head, fast = head;
        while (fast.next != null && fast.next.next != null) {   // first middle
            slow = slow.next;
            fast = fast.next.next;
        }
        ListNode second = reverse(slow.next);
        slow.next = null;                       // first half ends at slow
        ListNode first = head;
        while (second != null) {                // weave
            ListNode n1 = first.next, n2 = second.next;
            first.next = second;
            second.next = n1;
            first = n1;
            second = n2;
        }
    }

    private ListNode reverse(ListNode h) {
        ListNode prev = null;
        while (h != null) { ListNode nx = h.next; h.next = prev; prev = h; h = nx; }
        return prev;
    }
}`,
      alt: [
        { lang: 'python', code: `class Solution:
    def reorder_list(self, head):
        if head is None or head.next is None:
            return
        slow = fast = head
        while fast.next and fast.next.next:      # first middle
            slow, fast = slow.next, fast.next.next
        second, prev = slow.next, None
        slow.next = None                         # first half ends at slow
        while second:                            # reverse the second half
            second.next, prev, second = prev, second, second.next
        first, second = head, prev
        while second:                            # weave
            n1, n2 = first.next, second.next
            first.next, second.next = second, n1
            first, second = n1, n2` },
        { lang: 'js', code: `function reorderList(head) {
  if (head === null || head.next === null) return;
  let slow = head, fast = head;
  while (fast.next !== null && fast.next.next !== null) {   // first middle
    slow = slow.next;
    fast = fast.next.next;
  }
  let prev = null, curr = slow.next;
  slow.next = null;                       // first half ends at slow
  while (curr !== null) {                 // reverse the second half
    const nx = curr.next;
    curr.next = prev;
    prev = curr;
    curr = nx;
  }
  let first = head, second = prev;
  while (second !== null) {               // weave
    const n1 = first.next, n2 = second.next;
    first.next = second;
    second.next = n1;
    first = n1;
    second = n2;
  }
}` },
        { lang: 'cpp', code: `// LeetCode provides this node type; it is spelled out so the snippet compiles on its own.
struct ListNode {
    int val; ListNode* next;
    ListNode(int x = 0, ListNode* n = nullptr) : val(x), next(n) {}
};

class Solution {
public:
    void reorderList(ListNode* head) {
        if (!head || !head->next) return;
        ListNode *slow = head, *fast = head;
        while (fast->next && fast->next->next) {   // first middle
            slow = slow->next;
            fast = fast->next->next;
        }
        ListNode* second = reverse(slow->next);
        slow->next = nullptr;                      // first half ends at slow
        for (ListNode* first = head; second; ) {   // weave
            ListNode *n1 = first->next, *n2 = second->next;
            first->next = second;
            second->next = n1;
            first = n1;
            second = n2;
        }
    }

private:
    static ListNode* reverse(ListNode* h) {
        ListNode* prev = nullptr;
        while (h) { ListNode* nx = h->next; h->next = prev; prev = h; h = nx; }
        return prev;
    }
};` }
      ],
      complexity: `<p><b>Time O(N)</b>, <b>Space O(1)</b>.</p>`
    }
  });

  practice.push({
    title: 'Remove Duplicates from Sorted List II',
    level: 'Medium',
    tags: ['dummy node', 'sorted'],
    companies: ['Amazon', 'Microsoft', 'Bloomberg'],
    statement: `<p>Given the <code>head</code> of a sorted linked list, delete <b>all</b> nodes that have duplicate values, leaving only values that appeared exactly once.</p>`,
    constraints: `0 ≤ nodes ≤ 300, -100 ≤ Node.val ≤ 100, sorted non-decreasing`,
    example: `${chain([1, 2, 3, 3, 4, 4, 5], { 2: 'r', 3: 'r', 4: 'r', 5: 'r' })}<p>→ ${H.c('g', '1 → 2 → 5')}. <code>1 → 1 → 1 → 2 → 3</code> → <code>2 → 3</code> (the head itself disappears — dummy!).</p>`,
    brute: {
      why: `<p>Count every value in a HashMap, then rebuild with only count-1 values. Two passes and O(N) memory; it also ignores the sortedness that lets us detect runs locally.</p>`,
      code: {
          lang: 'java',
          code: `
ListNode deleteDuplicates(ListNode head) {
    Map<Integer, Integer> cnt = new HashMap<>();
    for (ListNode c = head; c != null; c = c.next) cnt.merge(c.val, 1, Integer::sum);
    ListNode dummy = new ListNode(0, head), prev = dummy;
    while (prev.next != null) {
        if (cnt.get(prev.next.val) > 1) prev.next = prev.next.next;
        else prev = prev.next;
    }
    return dummy.next;
}`,
          alt: [
            { lang: 'python', code: `def delete_duplicates(head):
    cnt = {}
    c = head
    while c is not None:
        cnt[c.val] = cnt.get(c.val, 0) + 1
        c = c.next
    dummy = ListNode(0, head)
    prev = dummy
    while prev.next is not None:
        if cnt[prev.next.val] > 1:
            prev.next = prev.next.next
        else:
            prev = prev.next
    return dummy.next` },
            { lang: 'js', code: `function deleteDuplicates(head) {
  const cnt = new Map();
  for (let c = head; c !== null; c = c.next) cnt.set(c.val, (cnt.get(c.val) || 0) + 1);
  const dummy = new ListNode(0, head);
  let prev = dummy;
  while (prev.next !== null) {
    if (cnt.get(prev.next.val) > 1) prev.next = prev.next.next;
    else prev = prev.next;
  }
  return dummy.next;
}` },
            { lang: 'cpp', code: `ListNode* deleteDuplicates(ListNode* head) {
    unordered_map<int, int> cnt;
    for (ListNode* c = head; c != nullptr; c = c->next) cnt[c->val]++;
    ListNode* dummy = new ListNode(0, head);
    ListNode* prev = dummy;
    while (prev->next != nullptr) {
        if (cnt[prev->next->val] > 1) prev->next = prev->next->next;
        else prev = prev->next;
    }
    return dummy->next;
}` }
          ]
        }
    },
    mcq: { q: 'You are on a run 3 → 3 → 3. Where should <code>prev.next</code> point after handling it?', options: ['The first 3', 'The last 3', 'The first node after the run', 'null'], answer: 2, explain: 'Every node of the run must vanish, so prev (the last kept node) links straight to the node after the run; prev itself does not move yet.' },
    hints: [
      `<p>Sorted ⇒ duplicates form runs. You must remove the whole run, including its first node, so you need the node <b>before</b> the run.</p>`,
      `<p>Dummy + <code>prev</code> (last node definitely kept) + <code>curr</code> scanning. Detect a run by <code>curr.next != null &amp;&amp; curr.next.val == curr.val</code>.</p>`,
      `<p>If a run: skip to its last node, then <code>prev.next = curr.next</code> (prev stays). Else: <code>prev = prev.next</code>. Always <code>curr = prev.next</code> afterwards.</p>`
    ],
    tests: { sig: 'ListNode -> ListNode', fn: 'deleteDuplicates', cases: [
      [[[1, 2, 3, 3, 4, 4, 5]], [1, 2, 5]],
      [[[1, 1, 1, 2, 3]], [2, 3]],
      [[[]], []],
      [[[1, 1]], []],
      [[[1]], [1]],
      [[[1, 2, 2]], [1]],
      [[[-100, -100, 0, 100, 100]], [0]],
      [[[1, 2, 3]], [1, 2, 3]]
    ] },
    solution: {
      approach: `<p>Dummy + prev; skip whole runs of equal values; advance prev only past unique nodes.</p>`,
      code: `
class Solution {
    public ListNode deleteDuplicates(ListNode head) {
        ListNode dummy = new ListNode(0, head), prev = dummy;
        ListNode curr = head;
        while (curr != null) {
            if (curr.next != null && curr.next.val == curr.val) {
                int dup = curr.val;
                while (curr != null && curr.val == dup) curr = curr.next;   // skip the whole run
                prev.next = curr;                                          // cut it out
            } else {
                prev = curr;          // unique: keep it
                curr = curr.next;
            }
        }
        return dummy.next;
    }
}`,
      alt: [
        { lang: 'python', code: `class Solution:
    def delete_duplicates(self, head):
        dummy = prev = ListNode(0, head)
        curr = head
        while curr:
            if curr.next and curr.next.val == curr.val:
                dup = curr.val
                while curr and curr.val == dup:   # skip the whole run
                    curr = curr.next
                prev.next = curr                  # cut it out
            else:
                prev, curr = curr, curr.next      # unique: keep it
        return dummy.next` },
        { lang: 'js', code: `function deleteDuplicates(head) {
  const dummy = new ListNode(0, head);
  let prev = dummy, curr = head;
  while (curr !== null) {
    if (curr.next !== null && curr.next.val === curr.val) {
      const dup = curr.val;
      while (curr !== null && curr.val === dup) curr = curr.next;   // skip the whole run
      prev.next = curr;                                            // cut it out
    } else {
      prev = curr;                 // unique: keep it
      curr = curr.next;
    }
  }
  return dummy.next;
}` },
        { lang: 'cpp', code: `// LeetCode provides this node type; it is spelled out so the snippet compiles on its own.
struct ListNode {
    int val; ListNode* next;
    ListNode(int x = 0, ListNode* n = nullptr) : val(x), next(n) {}
};

class Solution {
public:
    ListNode* deleteDuplicates(ListNode* head) {
        ListNode dummy(0, head);
        ListNode *prev = &dummy, *curr = head;
        while (curr) {
            if (curr->next && curr->next->val == curr->val) {
                int dup = curr->val;
                while (curr && curr->val == dup) {   // skip (and free) the whole run
                    ListNode* gone = curr;
                    curr = curr->next;
                    delete gone;
                }
                prev->next = curr;                   // cut it out
            } else {
                prev = curr;                         // unique: keep it
                curr = curr->next;
            }
        }
        return dummy.next;
    }
};` }
      ],
      complexity: `<p><b>Time O(N)</b>, <b>Space O(1)</b>.</p>`
    }
  });

  practice.push({
    title: 'Sort List',
    level: 'Medium',
    tags: ['merge sort', 'fast & slow', 'merge'],
    companies: ['Amazon', 'Meta', 'Microsoft', 'ByteDance'],
    statement: `<p>Sort a linked list in ascending order in <b>O(N log N)</b> time. Follow-up: constant extra space.</p>`,
    constraints: `0 ≤ nodes ≤ 5·10<sup>4</sup>, -10<sup>5</sup> ≤ Node.val ≤ 10<sup>5</sup>`,
    example: `${chain([4, 2, 1, 3])}<p>→ ${H.c('g', '1 → 2 → 3 → 4')}. Split [4, 2] [1, 3] → sort each → [2, 4] [1, 3] → merge → 1, 2, 3, 4.</p>`,
    brute: {
      why: `<p>Copy values into an array, <code>Arrays.sort</code>, write back. O(N log N) time but O(N) memory, and it is not really sorting the list. Insertion sort on the list itself is O(1) memory but O(N²) time — too slow for 5·10<sup>4</sup>.</p>`,
      code: {
          lang: 'java',
          code: `
ListNode sortList(ListNode head) {
    List<Integer> vals = new ArrayList<>();
    for (ListNode c = head; c != null; c = c.next) vals.add(c.val);
    Collections.sort(vals);
    int i = 0;
    for (ListNode c = head; c != null; c = c.next) c.val = vals.get(i++);
    return head;
}`,
          alt: [
            { lang: 'python', code: `def sort_list(head):
    vals = []
    c = head
    while c is not None:
        vals.append(c.val)
        c = c.next
    vals.sort()
    c = head
    for v in vals:
        c.val = v
        c = c.next
    return head` },
            { lang: 'js', code: `function sortList(head) {
  const vals = [];
  for (let c = head; c !== null; c = c.next) vals.push(c.val);
  vals.sort((a, b) => a - b);
  let i = 0;
  for (let c = head; c !== null; c = c.next) c.val = vals[i++];
  return head;
}` },
            { lang: 'cpp', code: `ListNode* sortList(ListNode* head) {
    vector<int> vals;
    for (ListNode* c = head; c != nullptr; c = c->next) vals.push_back(c->val);
    sort(vals.begin(), vals.end());
    int i = 0;
    for (ListNode* c = head; c != nullptr; c = c->next) c->val = vals[i++];
    return head;
}` }
          ]
        }
    },
    mcq: { q: 'Why is merge sort (not quicksort or heapsort) the natural choice for linked lists?', options: ['It needs random access', 'Splitting and merging only need sequential walks and relinking — no indexing or extra buffer', 'It is always faster', 'The language requires it'], answer: 1, explain: 'Heapsort needs random access; quicksort\'s partitioning is awkward and degrades on bad pivots. Merging lists is in place, so merge sort fits perfectly.' },
    hints: [
      `<p>You already know how to cut a list in half (first-middle) and how to merge two sorted lists. Combine them recursively.</p>`,
      `<p>Base case: 0 or 1 node. Otherwise split at the <b>first</b> middle (so 2 nodes split into 1 + 1), sort both halves, merge.</p>`,
      `<p>Recursion depth is only log₂N ≈ 16. For true O(1) space, do bottom-up: merge runs of size 1, 2, 4, … walking the list each round.</p>`
    ],
    tests: { sig: 'ListNode -> ListNode', fn: 'sortList', cases: [
      [[[4, 2, 1, 3]], [1, 2, 3, 4]],
      [[[-1, 5, 3, 4, 0]], [-1, 0, 3, 4, 5]],
      [[[]], []],
      [[[1]], [1]],
      [[[2, 1]], [1, 2]],
      [[[3, 3, 1, 1]], [1, 1, 3, 3]],
      [[[100000, -100000, 0]], [-100000, 0, 100000]],
      [[[1, 2, 3, 4]], [1, 2, 3, 4]],
      [[[5, 4, 3, 2, 1]], [1, 2, 3, 4, 5]],
      // 5*10^4 nodes (largest input): an O(N^2) sort would be far too slow
      [[{ $range: [50000, 0, -1] }], { $range: [1, 50001] }],
      [[{ $concat: [{ $range: [25000, 50000] }, { $range: [0, 25000] }] }], { $range: [0, 50000] }],
      [[{ $concat: [{ $rep: 100000, n: 25000 }, { $rep: -100000, n: 25000 }] }], { $concat: [{ $rep: -100000, n: 25000 }, { $rep: 100000, n: 25000 }] }]
    ] },
    solution: {
      approach: `<p>Top-down merge sort: split with fast &amp; slow, recurse, merge with dummy + tail.</p>`,
      code: `
class Solution {
    public ListNode sortList(ListNode head) {
        if (head == null || head.next == null) return head;
        ListNode slow = head, fast = head;
        while (fast.next != null && fast.next.next != null) {   // first middle
            slow = slow.next;
            fast = fast.next.next;
        }
        ListNode right = slow.next;
        slow.next = null;                                       // cut into two lists
        return merge(sortList(head), sortList(right));
    }

    private ListNode merge(ListNode a, ListNode b) {
        ListNode dummy = new ListNode(0), tail = dummy;
        while (a != null && b != null) {
            if (a.val <= b.val) { tail.next = a; a = a.next; }
            else { tail.next = b; b = b.next; }
            tail = tail.next;
        }
        tail.next = (a != null) ? a : b;
        return dummy.next;
    }
}`,
      alt: [
        { lang: 'python', code: `class Solution:
    def sort_list(self, head):
        if head is None or head.next is None:
            return head
        slow = fast = head
        while fast.next and fast.next.next:      # first middle
            slow, fast = slow.next, fast.next.next
        right, slow.next = slow.next, None       # cut into two lists
        return self._merge(self.sort_list(head), self.sort_list(right))

    @staticmethod
    def _merge(a, b):
        dummy = tail = ListNode(0)
        while a and b:
            if a.val <= b.val:                   # <= keeps it stable
                tail.next, a = a, a.next
            else:
                tail.next, b = b, b.next
            tail = tail.next
        tail.next = a or b
        return dummy.next` },
        { lang: 'js', code: `function merge(a, b) {
  const dummy = new ListNode(0);
  let tail = dummy;
  while (a !== null && b !== null) {
    if (a.val <= b.val) { tail.next = a; a = a.next; }   // <= keeps it stable
    else { tail.next = b; b = b.next; }
    tail = tail.next;
  }
  tail.next = a !== null ? a : b;
  return dummy.next;
}

function sortList(head) {
  if (head === null || head.next === null) return head;
  let slow = head, fast = head;
  while (fast.next !== null && fast.next.next !== null) {   // first middle
    slow = slow.next;
    fast = fast.next.next;
  }
  const right = slow.next;
  slow.next = null;                                         // cut into two lists
  return merge(sortList(head), sortList(right));
}` },
        { lang: 'cpp', code: `// LeetCode provides this node type; it is spelled out so the snippet compiles on its own.
struct ListNode {
    int val; ListNode* next;
    ListNode(int x = 0, ListNode* n = nullptr) : val(x), next(n) {}
};

class Solution {
public:
    ListNode* sortList(ListNode* head) {
        if (!head || !head->next) return head;
        ListNode *slow = head, *fast = head;
        while (fast->next && fast->next->next) {   // first middle
            slow = slow->next;
            fast = fast->next->next;
        }
        ListNode* right = slow->next;
        slow->next = nullptr;                      // cut into two lists
        return merge(sortList(head), sortList(right));
    }

private:
    static ListNode* merge(ListNode* a, ListNode* b) {
        ListNode dummy;
        ListNode* tail = &dummy;
        while (a && b) {
            if (a->val <= b->val) { tail->next = a; a = a->next; }   // <= keeps it stable
            else { tail->next = b; b = b->next; }
            tail = tail->next;
        }
        tail->next = a ? a : b;
        return dummy.next;
    }
};` }
      ],
      complexity: `<p><b>Time O(N log N)</b>: log N levels, O(N) merging per level. <b>Space O(log N)</b> recursion (O(1) with the bottom-up variant).</p>`
    }
  });

  practice.push({
    title: 'Copy List with Random Pointer',
    level: 'Medium',
    tags: ['hashmap', 'interweaving'],
    companies: ['Amazon', 'Meta', 'Microsoft', 'Bloomberg'],
    statement: `<p>Each node has <code>next</code> and an extra pointer <code>random</code> that can point to <b>any</b> node in the list or to null. Return a <b>deep copy</b>: brand-new nodes whose next and random pointers point into the <b>new</b> list, never into the original.</p>`,
    constraints: `0 ≤ n ≤ 1000, -10<sup>4</sup> ≤ Node.val ≤ 10<sup>4</sup>, random is null or a node in the list`,
    example: `<p>Original: ${H.c('b', '7')} → ${H.c('b', '13')} → 11 → 10 → 1, with random: 7→null, 13→7, 11→1, 10→11, 1→7.</p><p>Output: a new list ${H.c('g', "7' → 13' → 11' → 10' → 1'")} with randoms 13'→7', 11'→1', … The hard part: when we create 13', the copy 7' must already be findable.</p>`,
    brute: {
      why: `<p>Copy the nodes into an ArrayList, then for every random pointer walk the original list from the head to find its <b>index</b>, and point to the copy at that index. Each lookup is O(N) → <b>O(N²)</b>.</p>`,
      code: {
          lang: 'java',
          code: `
class Node { int val; Node next, random; Node(int val) { this.val = val; } }

class Solution {
    public Node copyRandomList(Node head) {
        List<Node> copies = new ArrayList<>();
        for (Node c = head; c != null; c = c.next) copies.add(new Node(c.val));
        for (int i = 0; i + 1 < copies.size(); i++) copies.get(i).next = copies.get(i + 1);
        int i = 0;
        for (Node c = head; c != null; c = c.next, i++) {
            if (c.random == null) continue;
            int j = 0;
            for (Node d = head; d != c.random; d = d.next) j++;   // O(N) search for the index
            copies.get(i).random = copies.get(j);
        }
        return copies.isEmpty() ? null : copies.get(0);
    }
}`,
          alt: [
            { lang: 'python', code: `class Node:
    def __init__(self, val, next=None, random=None):
        self.val = val
        self.next = next
        self.random = random


def copy_random_list(head):
    copies = []
    c = head
    while c is not None:
        copies.append(Node(c.val))
        c = c.next
    for i in range(len(copies) - 1):
        copies[i].next = copies[i + 1]
    i = 0
    c = head
    while c is not None:
        if c.random is not None:
            j = 0
            d = head
            while d is not c.random:      # O(N) search for the index
                d = d.next
                j += 1
            copies[i].random = copies[j]
        c = c.next
        i += 1
    return copies[0] if copies else None` },
            { lang: 'js', code: `class Node {
  constructor(val, next = null, random = null) { this.val = val; this.next = next; this.random = random; }
}

function copyRandomList(head) {
  const copies = [];
  for (let c = head; c !== null; c = c.next) copies.push(new Node(c.val));
  for (let i = 0; i + 1 < copies.length; i++) copies[i].next = copies[i + 1];
  let i = 0;
  for (let c = head; c !== null; c = c.next, i++) {
    if (c.random === null) continue;
    let j = 0;
    for (let d = head; d !== c.random; d = d.next) j++;   // O(N) search for the index
    copies[i].random = copies[j];
  }
  return copies.length === 0 ? null : copies[0];
}` },
            { lang: 'cpp', code: `struct Node {
    int val;
    Node *next, *random;
    Node(int v) : val(v), next(nullptr), random(nullptr) {}
};

Node* copyRandomList(Node* head) {
    vector<Node*> copies;
    for (Node* c = head; c != nullptr; c = c->next) copies.push_back(new Node(c->val));
    for (int i = 0; i + 1 < (int)copies.size(); i++) copies[i]->next = copies[i + 1];
    int i = 0;
    for (Node* c = head; c != nullptr; c = c->next, i++) {
        if (c->random == nullptr) continue;
        int j = 0;
        for (Node* d = head; d != c->random; d = d->next) j++;   // O(N) search for the index
        copies[i]->random = copies[j];
    }
    return copies.empty() ? nullptr : copies[0];
}` }
          ]
        }
    },
    mcq: { q: 'After weaving copies in (A → A\' → B → B\' → …), how do you set <code>A\'.random</code>?', options: ['A\'.random = A.random', 'A\'.random = A.random.next', 'A\'.random = A.next.random', 'A\'.random = A.random.random'], answer: 1, explain: 'Every original X is immediately followed by its copy X\'. So the copy of A.random is A.random.next (when A.random is not null).' },
    hints: [
      `<p>The core need is a mapping original → copy. A HashMap gives it in O(N) memory (two passes). Can the list itself store the mapping?</p>`,
      `<p>Interweave: insert each copy right after its original. Then "copy of X" = <code>X.next</code>, so randoms can be set in one pass.</p>`,
      `<p>Three passes: (1) weave copies in; (2) <code>c.next.random = (c.random == null) ? null : c.random.next</code>; (3) unweave, restoring the original next pointers and linking the copies to each other. Handle head == null.</p>`
    ],
    // The test format has no random pointers, so tests.harness has a test-only copyCheck builder:
    // rand[i] is the index node i's random points to (-1 = null). It returns one row
    // [val, random index inside the COPY] per copied node, then [original unchanged ? 1 : 0, copy reuses an original node ? 1 : 0].
    tests: { sig: 'int[] int[] -> int[][]', fn: 'copyCheck', harness: {
        java: "class Check {\n    // rand[i] = index of node i's random (-1 = null). One row {val, random index in the COPY} per copied node,\n    // then {1 if the original is unchanged, 1 if the copy reuses an original node}.\n    static int[][] copyCheck(int[] vals, int[] rand) {\n        int n = vals.length;\n        Node[] orig = new Node[n];\n        for (int i = 0; i < n; i++) orig[i] = new Node(vals[i]);\n        for (int i = 0; i < n; i++) {\n            orig[i].next = i + 1 < n ? orig[i + 1] : null;\n            orig[i].random = rand[i] >= 0 ? orig[rand[i]] : null;\n        }\n        List<Node> copies = new ArrayList<>();\n        for (Node c = new Solution().copyRandomList(n > 0 ? orig[0] : null); c != null && copies.size() <= n; c = c.next) copies.add(c);\n        List<Node> origList = Arrays.asList(orig);\n        int[][] out = new int[copies.size() + 1][];\n        boolean shares = false, intact = true;\n        for (int i = 0; i < copies.size(); i++) {\n            Node c = copies.get(i);\n            if (origList.contains(c)) shares = true;\n            int r = copies.indexOf(c.random);\n            out[i] = new int[]{c.val, c.random == null ? -1 : (r < 0 ? -2 : r)};\n        }\n        for (int i = 0; i < n; i++) {\n            if (orig[i].next != (i + 1 < n ? orig[i + 1] : null)) intact = false;\n            if (orig[i].random != (rand[i] >= 0 ? orig[rand[i]] : null)) intact = false;\n        }\n        out[copies.size()] = new int[]{intact ? 1 : 0, shares ? 1 : 0};\n        return out;\n    }\n}",
        python: "def copy_check(vals, rand):\n    orig = [Node(v) for v in vals]\n    for i, node in enumerate(orig):\n        node.next = orig[i + 1] if i + 1 < len(orig) else None\n        node.random = orig[rand[i]] if rand[i] >= 0 else None\n    copies, c = [], Solution().copy_random_list(orig[0] if orig else None)\n    while c and len(copies) <= len(orig):\n        copies.append(c)\n        c = c.next\n    pos = {id(x): i for i, x in enumerate(copies)}\n    orig_ids = {id(x) for x in orig}\n    rows = [[x.val, -1 if x.random is None else pos.get(id(x.random), -2)] for x in copies]\n    intact = all(node.next is (orig[i + 1] if i + 1 < len(orig) else None) and\n                 node.random is (orig[rand[i]] if rand[i] >= 0 else None) for i, node in enumerate(orig))\n    shares = any(id(x) in orig_ids for x in copies)\n    return rows + [[int(intact), int(shares)]]",
        js: "function copyCheck(vals, rand) {\n  const n = vals.length, orig = vals.map((v) => new Node(v));\n  const expNext = (i) => (i + 1 < n ? orig[i + 1] : null), expRand = (i) => (rand[i] >= 0 ? orig[rand[i]] : null);\n  orig.forEach((node, i) => { node.next = expNext(i); node.random = expRand(i); });\n  const copies = [];\n  for (let c = new Solution().copyRandomList(n ? orig[0] : null); c !== null && copies.length <= n; c = c.next) copies.push(c);\n  const rows = copies.map((c) => [c.val, c.random === null ? -1 : (copies.indexOf(c.random) < 0 ? -2 : copies.indexOf(c.random))]);\n  const intact = orig.every((node, i) => node.next === expNext(i) && node.random === expRand(i));\n  const shares = copies.some((c) => orig.includes(c));\n  return rows.concat([[intact ? 1 : 0, shares ? 1 : 0]]);\n}",
        cpp: "vector<vector<int>> copyCheck(vector<int>& vals, vector<int>& rand) {\n    int n = vals.size();\n    vector<Node*> orig;\n    for (int v : vals) orig.push_back(new Node(v));\n    auto expNext = [&](int i) { return i + 1 < n ? orig[i + 1] : nullptr; };\n    auto expRand = [&](int i) { return rand[i] >= 0 ? orig[rand[i]] : nullptr; };\n    for (int i = 0; i < n; i++) { orig[i]->next = expNext(i); orig[i]->random = expRand(i); }\n    vector<Node*> copies;\n    for (Node* c = copyRandomList(n ? orig[0] : nullptr); c && (int)copies.size() <= n; c = c->next) copies.push_back(c);\n    vector<vector<int>> out;\n    bool shares = false, intact = true;\n    for (Node* c : copies) {\n        if (find(orig.begin(), orig.end(), c) != orig.end()) shares = true;\n        auto it = find(copies.begin(), copies.end(), c->random);\n        out.push_back({c->val, !c->random ? -1 : (it == copies.end() ? -2 : int(it - copies.begin()))});\n    }\n    for (int i = 0; i < n; i++)\n        if (orig[i]->next != expNext(i) || orig[i]->random != expRand(i)) intact = false;\n    out.push_back({intact ? 1 : 0, shares ? 1 : 0});\n    return out;\n}"
      }, cases: [
      [[[7, 13, 11, 10, 1], [-1, 0, 4, 2, 0]], [[7, -1], [13, 0], [11, 4], [10, 2], [1, 0], [1, 0]]],
      [[[], []], [[1, 0]]],
      [[[1], [0]], [[1, 0], [1, 0]]],
      [[[1], [-1]], [[1, -1], [1, 0]]],
      [[[1, 2], [1, 1]], [[1, 1], [2, 1], [1, 0]]],
      [[[3, 3, 3], [-1, 0, -1]], [[3, -1], [3, 0], [3, -1], [1, 0]]],
      [[[5, 5], [1, 0]], [[5, 1], [5, 0], [1, 0]]]
    ] },
    solution: {
      approach: `<p>Interweave copies to get an O(1)-memory original→copy mapping, fix randoms, then split the two lists. (A HashMap&lt;Node, Node&gt; version is equally accepted and simpler; it uses O(N) extra memory.)</p>`,
      code: `
class Node { int val; Node next, random; Node(int val) { this.val = val; } }

class Solution {
    public Node copyRandomList(Node head) {
        if (head == null) return null;
        // 1) weave: A -> A' -> B -> B' -> ...
        for (Node c = head; c != null; c = c.next.next) {
            Node copy = new Node(c.val);
            copy.next = c.next;
            c.next = copy;
        }
        // 2) randoms: the copy of X.random is X.random.next
        for (Node c = head; c != null; c = c.next.next) {
            if (c.random != null) c.next.random = c.random.next;
        }
        // 3) unweave: restore the original list and chain the copies
        Node newHead = head.next;
        for (Node c = head; c != null; c = c.next) {
            Node copy = c.next;
            c.next = copy.next;                                      // original skips its copy
            copy.next = (copy.next != null) ? copy.next.next : null; // copy skips the next original
        }
        return newHead;
    }
}`,
      alt: [
        { lang: 'python', code: `class Node:
    def __init__(self, x, next=None, random=None):
        self.val, self.next, self.random = x, next, random

class Solution:
    def copy_random_list(self, head):
        if head is None:
            return None
        c = head                                 # 1) weave: A -> A' -> B -> B' -> ...
        while c:
            c.next = Node(c.val, c.next)
            c = c.next.next
        c = head                                 # 2) the copy of X.random is X.random.next
        while c:
            if c.random:
                c.next.random = c.random.next
            c = c.next.next
        new_head, c = head.next, head            # 3) unweave both lists
        while c:
            copy = c.next
            c.next = copy.next                   # original skips its copy
            copy.next = copy.next.next if copy.next else None
            c = c.next
        return new_head` },
        { lang: 'js', code: `class Node {
  constructor(val, next = null, random = null) { this.val = val; this.next = next; this.random = random; }
}

class Solution {
  copyRandomList(head) {
    if (head === null) return null;
    for (let c = head; c !== null; c = c.next.next) c.next = new Node(c.val, c.next);   // 1) weave
    for (let c = head; c !== null; c = c.next.next) {                                  // 2) randoms
      if (c.random !== null) c.next.random = c.random.next;
    }
    const newHead = head.next;
    for (let c = head; c !== null; c = c.next) {                                       // 3) unweave
      const copy = c.next;
      c.next = copy.next;                                    // original skips its copy
      copy.next = copy.next !== null ? copy.next.next : null;
    }
    return newHead;
  }
}` },
        { lang: 'cpp', code: `struct Node {
    int val; Node* next; Node* random;
    Node(int v, Node* n = nullptr) : val(v), next(n), random(nullptr) {}
};

Node* copyRandomList(Node* head) {
    if (!head) return nullptr;
    for (Node* c = head; c; c = c->next->next) c->next = new Node(c->val, c->next);   // 1) weave
    for (Node* c = head; c; c = c->next->next)                                        // 2) randoms
        if (c->random) c->next->random = c->random->next;
    Node* newHead = head->next;
    for (Node* c = head; c; c = c->next) {                                            // 3) unweave
        Node* copy = c->next;
        c->next = copy->next;                                 // original skips its copy
        copy->next = copy->next ? copy->next->next : nullptr;
    }
    return newHead;
}` }
      ],
      complexity: `<p><b>Time O(N)</b> (three linear passes). <b>Space O(1)</b> extra besides the N new nodes (HashMap version: O(N)).</p>`,
      followUps: ['Deep-copy a general graph (Clone Graph) — why do you need a visited map there?', 'Why must step 3 restore the original list?']
    }
  });

  practice.push({
    title: 'Find the Duplicate Number (Floyd on an array)',
    level: 'Medium',
    tags: ['Floyd', 'fast & slow', 'hidden linked list'],
    companies: ['Amazon', 'Google', 'Microsoft', 'Bloomberg'],
    statement: `<p>An array <code>nums</code> has n + 1 integers, each in the range [1, n]. Exactly one value is repeated (possibly many times). Return it <b>without modifying</b> the array and using only <b>O(1)</b> extra space.</p>`,
    constraints: `1 ≤ n ≤ 10<sup>5</sup>, nums.length = n + 1, 1 ≤ nums[i] ≤ n`,
    example: `${H.arr([1, 3, 4, 2, 2], { hl: { 3: 'y', 4: 'y' } })}<p>→ ${H.c('g', '2')}. Read it as a linked list: index → nums[index]: 0 → 1 → 3 → 2 → 4 → ${H.c('p', '2')} → 4 → … Two indices (3 and 4) both point to 2, so 2 is where the cycle starts — the duplicate.</p>`,
    brute: {
      why: `<p>A HashSet of seen values returns the first repeat in O(N) time but O(N) memory. Sorting a copy also costs O(N) memory, and sorting in place modifies the array — both forbidden.</p>`,
      code: {
          lang: 'java',
          code: `
int findDuplicate(int[] nums) {
    Set<Integer> seen = new HashSet<>();
    for (int x : nums) if (!seen.add(x)) return x;
    return -1;
}`,
          alt: [
            { lang: 'python', code: `def find_duplicate(nums):
    seen = set()
    for x in nums:
        if x in seen:
            return x
        seen.add(x)
    return -1` },
            { lang: 'js', code: `function findDuplicate(nums) {
  const seen = new Set();
  for (const x of nums) {
    if (seen.has(x)) return x;
    seen.add(x);
  }
  return -1;
}` },
            { lang: 'cpp', code: `int findDuplicate(vector<int>& nums) {
    unordered_set<int> seen;
    for (int x : nums) if (!seen.insert(x).second) return x;
    return -1;
}` }
          ]
        }
    },
    mcq: { q: 'Why must the sequence 0 → nums[0] → nums[nums[0]] → … contain a cycle?', options: ['Because the array is sorted', 'n + 1 indices map into only n values 1..n, and index 0 is never a target, so the walk must eventually repeat', 'Because nums contains 0', 'It does not always'], answer: 1, explain: 'Every step lands on an index in 1..n — a finite set — so the walk repeats. The node with two incoming arrows (two indices holding the same value) is the cycle entrance.' },
    hints: [
      `<p>Treat each index i as a node whose <code>next</code> is <code>nums[i]</code>. A duplicate value means two nodes point to the same next node.</p>`,
      `<p>Start at index 0 (nothing points to it, so it is a true "head" outside the cycle). Run Floyd: slow = nums[slow], fast = nums[nums[fast]].</p>`,
      `<p>Phase 2 as in Linked List Cycle II: reset one pointer to the start, move both one step at a time; they meet at the cycle entrance, which is the duplicate value.</p>`
    ],
    tests: { sig: 'int[] -> int', fn: 'findDuplicate', cases: [
      [[[1, 3, 4, 2, 2]], 2],
      [[[3, 1, 3, 4, 2]], 3],
      [[[1, 1]], 1],
      [[[3, 3, 3, 3]], 3],
      [[[2, 2, 2, 2, 2]], 2],
      [[[1, 4, 4, 2, 4]], 4],
      [[[2, 5, 9, 6, 9, 3, 8, 9, 7, 1]], 9],
      [[[1, 2, 3, 4, 5, 6, 7, 8, 9, 1]], 1],
      // n = 10^5 (largest input): 1..n plus one repeated value
      [[{ $concat: [{ $range: [1, 100001] }, [50000]] }], 50000],
      [[{ $rep: 7, n: 100001 }], 7],
      [[{ $concat: [[100000], { $range: [1, 100001] }] }], 100000]
    ] },
    solution: {
      approach: `<p>Floyd's cycle detection on the implicit list i → nums[i]; the cycle start is the duplicate.</p>`,
      code: `
class Solution {
    public int findDuplicate(int[] nums) {
        int slow = 0, fast = 0;
        do {                                   // phase 1: meet inside the cycle
            slow = nums[slow];
            fast = nums[nums[fast]];
        } while (slow != fast);
        int p = 0;                             // phase 2: from the head (index 0)
        while (p != slow) {
            p = nums[p];
            slow = nums[slow];
        }
        return p;                              // cycle entrance = duplicate value
    }
}`,
      alt: [
        { lang: 'python', code: `class Solution:
    def find_duplicate(self, nums):
        slow = fast = 0
        while True:                            # phase 1: meet inside the cycle
            slow, fast = nums[slow], nums[nums[fast]]
            if slow == fast:
                break
        p = 0                                  # phase 2: from the head (index 0)
        while p != slow:
            p, slow = nums[p], nums[slow]
        return p                               # cycle entrance = duplicate value` },
        { lang: 'js', code: `function findDuplicate(nums) {
  let slow = 0, fast = 0;
  do {                                   // phase 1: meet inside the cycle
    slow = nums[slow];
    fast = nums[nums[fast]];
  } while (slow !== fast);
  let p = 0;                             // phase 2: from the head (index 0)
  while (p !== slow) {
    p = nums[p];
    slow = nums[slow];
  }
  return p;                              // cycle entrance = duplicate value
}` },
        { lang: 'cpp', code: `class Solution {
public:
    int findDuplicate(vector<int>& nums) {
        int slow = 0, fast = 0;
        do {                                   // phase 1: meet inside the cycle
            slow = nums[slow];
            fast = nums[nums[fast]];
        } while (slow != fast);
        int p = 0;                             // phase 2: from the head (index 0)
        while (p != slow) {
            p = nums[p];
            slow = nums[slow];
        }
        return p;                              // cycle entrance = duplicate value
    }
};` }
      ],
      dry: { head: ['phase', 'slow', 'fast / p', 'note (nums = 1 3 4 2 2)'], rows: [['1', '1', '3', ''], ['1', '3', '4', 'fast: 3 → 2 → 4'], ['1', '2', '4', 'fast: 4 → 2 → 4'], ['1', '4', '4', '<span class="c-r">meet</span>'], ['2', '2', 'p = 1', 'p from 0'], ['2', '4', 'p = 3', ''], ['2', '2', 'p = 2', '<span class="c-g">equal → 2</span>']] },
      complexity: `<p><b>Time O(N)</b>, <b>Space O(1)</b>, array untouched.</p>`,
      followUps: ['Binary search on the value range (count how many ≤ mid) gives O(N log N) with O(1) space — compare.', 'Why would Floyd fail if the values could be 0?']
    }
  });

  // =====================================================================
  // PRACTICE — Hard
  // =====================================================================
  practice.push({
    title: 'Merge k Sorted Lists',
    level: 'Hard',
    tags: ['heap', 'merge', 'divide and conquer'],
    companies: ['Amazon', 'Google', 'Meta', 'Microsoft', 'Uber'],
    statement: `<p>You are given an array of <code>k</code> linked lists, each sorted ascending. Merge them all into one sorted linked list and return it.</p>`,
    constraints: `0 ≤ k ≤ 10<sup>4</sup>, 0 ≤ each length ≤ 500, total nodes N ≤ 10<sup>4</sup>, -10<sup>4</sup> ≤ Node.val ≤ 10<sup>4</sup>`,
    example: `<p>${H.c('b', '1 → 4 → 5')}, ${H.c('y', '1 → 3 → 4')}, ${H.c('p', '2 → 6')} → ${H.c('g', '1 → 1 → 2 → 3 → 4 → 4 → 5 → 6')}.</p><p>At every step the smallest remaining value is one of the k <b>fronts</b> — a min-heap of the fronts gives it in O(log k).</p>`,
    brute: {
      why: `<p>Merge the lists one by one into an accumulator. The accumulator grows, so early nodes get re-walked by every later merge: total O(N·k). With k = 10<sup>4</sup> lists that is far too slow.</p>`,
      code: {
          lang: 'java',
          code: `
ListNode mergeKLists(ListNode[] lists) {
    ListNode acc = null;
    for (ListNode l : lists) acc = mergeTwo(acc, l);   // acc keeps growing: O(N*k) total
    return acc;
}

ListNode mergeTwo(ListNode a, ListNode b) {
    ListNode dummy = new ListNode(0), t = dummy;
    while (a != null && b != null) {
        if (a.val <= b.val) { t.next = a; a = a.next; } else { t.next = b; b = b.next; }
        t = t.next;
    }
    t.next = (a != null) ? a : b;
    return dummy.next;
}`,
          alt: [
            { lang: 'python', code: `def merge_k_lists(lists):
    acc = None
    for l in lists:
        acc = merge_two(acc, l)           # acc keeps growing: O(N*k) total
    return acc


def merge_two(a, b):
    dummy = ListNode(0)
    t = dummy
    while a is not None and b is not None:
        if a.val <= b.val:
            t.next = a
            a = a.next
        else:
            t.next = b
            b = b.next
        t = t.next
    t.next = a if a is not None else b
    return dummy.next` },
            { lang: 'js', code: `function mergeKLists(lists) {
  let acc = null;
  for (const l of lists) acc = mergeTwo(acc, l);   // acc keeps growing: O(N*k) total
  return acc;
}

function mergeTwo(a, b) {
  const dummy = new ListNode(0);
  let t = dummy;
  while (a !== null && b !== null) {
    if (a.val <= b.val) { t.next = a; a = a.next; } else { t.next = b; b = b.next; }
    t = t.next;
  }
  t.next = (a !== null) ? a : b;
  return dummy.next;
}` },
            { lang: 'cpp', code: `ListNode* mergeTwo(ListNode* a, ListNode* b) {
    ListNode* dummy = new ListNode(0);
    ListNode* t = dummy;
    while (a != nullptr && b != nullptr) {
        if (a->val <= b->val) { t->next = a; a = a->next; } else { t->next = b; b = b->next; }
        t = t->next;
    }
    t->next = (a != nullptr) ? a : b;
    return dummy->next;
}

ListNode* mergeKLists(vector<ListNode*>& lists) {
    ListNode* acc = nullptr;
    for (ListNode* l : lists) acc = mergeTwo(acc, l);   // acc keeps growing: O(N*k) total
    return acc;
}` }
          ]
        }
    },
    mcq: { q: 'What does the min-heap hold at any moment?', options: ['All N nodes', 'At most k nodes: the current front of each non-empty list', 'Only the k smallest values overall', 'The list heads in their original order'], answer: 1, explain: 'Each list contributes only its current front; after popping a node we push its next. So the heap has ≤ k entries, and each push/pop is O(log k).' },
    hints: [
      `<p>Generalise "compare the two fronts" to "pick the smallest of k fronts". Which structure returns the minimum of k items quickly and supports inserting a replacement?</p>`,
      `<p>A min-heap of nodes ordered by val: Java <code>PriorityQueue&lt;ListNode&gt;</code>, Python <code>heapq</code> with <code>(val, index, node)</code> tuples, C++ <code>priority_queue</code> with a "greater" comparator (it is a max-heap by default), JS a small hand-written <code>MinHeap</code>. Seed it with every non-null head; dummy + tail for the result.</p>`,
      `<p>Loop: poll the smallest node, attach it to tail, push its <code>next</code> if not null. Skip null lists (k may be 0 or lists may be empty). Alternative: divide &amp; conquer pairwise merging, also O(N log k).</p>`
    ],
    tests: { sig: 'ListNode[] -> ListNode', fn: 'mergeKLists', cases: [
      [[[[1, 4, 5], [1, 3, 4], [2, 6]]], [1, 1, 2, 3, 4, 4, 5, 6]],
      [[[]], []],
      [[[[]]], []],
      [[[[], [1]]], [1]],
      [[[[5]]], [5]],
      [[[[-10000, 10000], [-10000], [0, 0]]], [-10000, -10000, 0, 0, 10000]],
      [[[[3], [2], [1]]], [1, 2, 3]],
      [[[{ $range: [0, 10000, 2] }, { $range: [1, 10000, 2] }]], { $range: [0, 10000] }]   // N = 10^4 nodes in total (largest input)
    ] },
    solution: {
      approach: `<p>Min-heap of the k fronts; each node is pushed and popped once.</p>`,
      code: `
class Solution {
    public ListNode mergeKLists(ListNode[] lists) {
        PriorityQueue<ListNode> pq = new PriorityQueue<>((a, b) -> Integer.compare(a.val, b.val));
        for (ListNode head : lists) if (head != null) pq.offer(head);   // k fronts
        ListNode dummy = new ListNode(0), tail = dummy;
        while (!pq.isEmpty()) {
            ListNode smallest = pq.poll();             // O(log k)
            tail.next = smallest;
            tail = smallest;
            if (smallest.next != null) pq.offer(smallest.next);   // its list's new front
        }
        return dummy.next;
    }
}`,
      alt: [{ lang: 'python', code: `import heapq

class Solution:
    def merge_k_lists(self, lists):
        heap = [(node.val, i, node) for i, node in enumerate(lists) if node]   # i breaks ties (nodes are not comparable)
        heapq.heapify(heap)                                                    # k fronts, O(k)
        dummy = tail = ListNode(0)
        while heap:
            _, i, node = heapq.heappop(heap)           # O(log k)
            tail.next = tail = node
            if node.next:
                heapq.heappush(heap, (node.next.val, i, node.next))   # its list's new front
        return dummy.next` },
      { lang: 'js', code: `// JS has no built-in heap: a small binary min-heap with a comparator.
class MinHeap {
  constructor(cmp = (a, b) => a - b) { this.a = []; this.cmp = cmp; }
  size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {                                // sift up
      const p = (i - 1) >> 1;
      if (this.cmp(a[i], a[p]) >= 0) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {                                   // sift down
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.cmp(a[l], a[m]) < 0) m = l;
        if (r < a.length && this.cmp(a[r], a[m]) < 0) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

function mergeKLists(lists) {
  const heap = new MinHeap((x, y) => x.val - y.val);
  for (const head of lists) if (head !== null) heap.push(head);   // k fronts
  const dummy = new ListNode(0);
  let tail = dummy;
  while (heap.size() > 0) {
    const smallest = heap.pop();                 // O(log k)
    tail.next = smallest;
    tail = smallest;
    if (smallest.next !== null) heap.push(smallest.next);   // its list's new front
  }
  return dummy.next;
}` },
      { lang: 'cpp', code: `// LeetCode provides this node type; it is spelled out so the snippet compiles on its own.
struct ListNode {
    int val; ListNode* next;
    ListNode(int x = 0, ListNode* n = nullptr) : val(x), next(n) {}
};

class Solution {
public:
    ListNode* mergeKLists(vector<ListNode*>& lists) {
        // priority_queue is a MAX-heap by default: "greater val = lower priority" makes it a min-heap
        auto cmp = [](ListNode* a, ListNode* b) { return a->val > b->val; };
        priority_queue<ListNode*, vector<ListNode*>, decltype(cmp)> pq(cmp);
        for (ListNode* head : lists) if (head) pq.push(head);   // k fronts
        ListNode dummy;
        ListNode* tail = &dummy;
        while (!pq.empty()) {
            ListNode* smallest = pq.top();       // O(log k)
            pq.pop();
            tail->next = smallest;
            tail = smallest;
            if (smallest->next) pq.push(smallest->next);   // its list's new front
        }
        return dummy.next;
    }
};` }],
      complexity: `<p><b>Time O(N log k)</b>: N pushes and pops on a heap of size ≤ k. <b>Space O(k)</b> for the heap (the output reuses the input nodes).</p>`,
      followUps: ['Divide &amp; conquer: merge lists[i] with lists[i + step] for step = 1, 2, 4, … — O(N log k) time, O(1) extra space.', 'The lists are huge files on disk (external merge sort): what changes?']
    }
  });

  practice.push({
    title: 'LFU Cache',
    level: 'Hard',
    tags: ['design', 'hashmap', 'doubly linked list'],
    companies: ['Amazon', 'Google', 'Microsoft'],
    statement: `<p>Design <code>LFUCache(capacity)</code> with <code>get(key)</code> and <code>put(key, value)</code>, both <b>O(1)</b> average. When full, evict the key with the <b>lowest use count</b>; if several keys tie, evict the <b>least recently used</b> among them. Every get or put on a key increases its use count by 1 (a new key starts at 1).</p>`,
    constraints: `1 ≤ capacity ≤ 10<sup>4</sup>, 0 ≤ key ≤ 10<sup>5</sup>, 0 ≤ value ≤ 10<sup>9</sup>, at most 2·10<sup>5</sup> calls`,
    example: `<p>capacity 2: put(1,1), put(2,2), get(1) → 1 (count: 1→2, 2→1), put(3,3) → ${H.c('r', 'evicts 2')} (lowest count), get(2) → -1, get(3) → 3 (count 2), put(4,4) → keys 1 and 3 both have count 2; 1 was used less recently → ${H.c('r', 'evicts 1')}. get(1) → -1, get(3) → 3, get(4) → 4.</p>`,
    brute: {
      why: `<p>Store value, count and last-used time per key; on eviction scan every key for the smallest (count, time). get/put are O(1) but each eviction is <b>O(capacity)</b> → up to 2·10<sup>9</sup> steps in the worst case.</p>`,
      code: {
          lang: 'java',
          code: `
class LFUCache {
    private final int capacity;
    private long clock = 0;
    private final Map<Integer, long[]> data = new HashMap<>();   // key -> {value, count, lastUsed}

    public LFUCache(int capacity) { this.capacity = capacity; }

    public int get(int key) {
        long[] d = data.get(key);
        if (d == null) return -1;
        d[1]++; d[2] = clock++;
        return (int) d[0];
    }

    public void put(int key, int value) {
        long[] d = data.get(key);
        if (d != null) { d[0] = value; d[1]++; d[2] = clock++; return; }
        if (data.size() == capacity) {
            int victim = -1; long[] best = null;
            for (Map.Entry<Integer, long[]> e : data.entrySet()) {      // O(N) scan
                long[] v = e.getValue();
                if (best == null || v[1] < best[1] || (v[1] == best[1] && v[2] < best[2])) { best = v; victim = e.getKey(); }
            }
            data.remove(victim);
        }
        data.put(key, new long[]{value, 1, clock++});
    }
}`,
          alt: [
            { lang: 'python', code: `class LFUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.clock = 0
        self.data = {}                    # key -> [value, count, last_used]

    def get(self, key):
        d = self.data.get(key)
        if d is None:
            return -1
        d[1] += 1
        d[2] = self.clock
        self.clock += 1
        return d[0]

    def put(self, key, value):
        d = self.data.get(key)
        if d is not None:
            d[0] = value
            d[1] += 1
            d[2] = self.clock
            self.clock += 1
            return
        if len(self.data) == self.capacity:
            victim, best = -1, None
            for k, v in self.data.items():              # O(N) scan
                if best is None or v[1] < best[1] or (v[1] == best[1] and v[2] < best[2]):
                    best, victim = v, k
            del self.data[victim]
        self.data[key] = [value, 1, self.clock]
        self.clock += 1` },
            { lang: 'js', code: `class LFUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.clock = 0;
    this.data = new Map();                 // key -> [value, count, lastUsed]
  }

  get(key) {
    const d = this.data.get(key);
    if (d === undefined) return -1;
    d[1]++; d[2] = this.clock++;
    return d[0];
  }

  put(key, value) {
    const d = this.data.get(key);
    if (d !== undefined) { d[0] = value; d[1]++; d[2] = this.clock++; return; }
    if (this.data.size === this.capacity) {
      let victim = -1, best = null;
      for (const [k, v] of this.data) {                // O(N) scan
        if (best === null || v[1] < best[1] || (v[1] === best[1] && v[2] < best[2])) { best = v; victim = k; }
      }
      this.data.delete(victim);
    }
    this.data.set(key, [value, 1, this.clock++]);
  }
}` },
            { lang: 'cpp', code: `class LFUCache {
    int capacity;
    long long tick = 0;
    unordered_map<int, array<long long, 3>> data;   // key -> {value, count, lastUsed}

public:
    LFUCache(int capacity) : capacity(capacity) {}

    int get(int key) {
        auto it = data.find(key);
        if (it == data.end()) return -1;
        auto& d = it->second;
        d[1]++; d[2] = tick++;
        return (int)d[0];
    }

    void put(int key, int value) {
        auto it = data.find(key);
        if (it != data.end()) { auto& d = it->second; d[0] = value; d[1]++; d[2] = tick++; return; }
        if ((int)data.size() == capacity) {
            int victim = -1;
            const array<long long, 3>* best = nullptr;
            for (auto& e : data) {                       // O(N) scan
                const auto& v = e.second;
                if (best == nullptr || v[1] < (*best)[1] || (v[1] == (*best)[1] && v[2] < (*best)[2])) { best = &v; victim = e.first; }
            }
            data.erase(victim);
        }
        data[key] = {value, 1, tick++};
    }
};` }
          ]
        }
    },
    mcq: { q: 'How can eviction find "lowest count, then least recent" in O(1)?', options: ['Sort keys on every call', 'Keep a bucket (recency-ordered list) per count plus the current minimum count', 'A TreeMap of counts only', 'A single LRU list'], answer: 1, explain: 'Bucket[c] is an LRU-ordered list of keys with count c. minFreq tells which bucket to evict from, and its oldest key is the victim. Counts only increase by 1, so minFreq is easy to maintain.' },
    hints: [
      `<p>It is "many LRU caches, one per use count". Inside one count, the order is recency — exactly the LRU list you already built.</p>`,
      `<p>Maps: key → value, key → count, count → an insertion-ordered set of keys (Java <code>LinkedHashSet</code>, Python <code>OrderedDict</code>, JS <code>Set</code>, C++ <code>std::list</code> plus stored iterators) — itself a hash table + doubly linked list. Plus an int <code>minFreq</code>.</p>`,
      `<p>touch(key): remove from bucket[c]; if that bucket empties and c == minFreq, minFreq++; add to bucket[c+1]. New key: evict the first element of bucket[minFreq] if full, then insert with count 1 and set minFreq = 1. Update before evict for existing keys.</p>`
    ],
    tests: { cls: 'LFUCache', sigs: { LFUCache: 'int', get: 'int -> int', put: 'int int -> void' }, cases: [
      { ops: ['LFUCache', 'put', 'put', 'get', 'put', 'get', 'get', 'put', 'get', 'get', 'get'], args: [[2], [1, 1], [2, 2], [1], [3, 3], [2], [3], [4, 4], [1], [3], [4]], out: [null, null, null, 1, null, -1, 3, null, -1, 3, 4] },
      { ops: ['LFUCache', 'put', 'put', 'get', 'get'], args: [[1], [1, 1], [2, 2], [1], [2]], out: [null, null, null, -1, 2] },
      { ops: ['LFUCache', 'put', 'put', 'put', 'put', 'get', 'get', 'get'], args: [[2], [1, 1], [2, 2], [1, 10], [3, 3], [1], [2], [3]], out: [null, null, null, null, null, 10, -1, 3] },
      { ops: ['LFUCache', 'get', 'put', 'get'], args: [[1], [7], [7, 1000000000], [7]], out: [null, -1, null, 1000000000] },
      { ops: ['LFUCache', 'put', 'put', 'put', 'put', 'get', 'get', 'get', 'get'], args: [[3], [1, 1], [2, 2], [3, 3], [4, 4], [1], [2], [3], [4]], out: [null, null, null, null, null, -1, 2, 3, 4] },
      { ops: ['LFUCache', 'put', 'put', 'get', 'get', 'put', 'get', 'get', 'get'], args: [[2], [1, 1], [2, 2], [2], [2], [3, 3], [1], [2], [3]], out: [null, null, null, 2, 2, null, -1, 2, 3] },
      { ops: ['LFUCache', 'put', 'put', 'put', 'get', 'get', 'put', 'get', 'get', 'get', 'get'], args: [[3], [2, 2], [1, 1], [3, 3], [2], [1], [4, 4], [3], [4], [1], [2]], out: [null, null, null, null, 2, 1, null, -1, 4, 1, 2] }
    ] },
    solution: {
      approach: `<p>Frequency buckets, each an insertion-ordered set (LRU within the same count), plus minFreq. Every operation is a constant number of hash operations.</p>`,
      code: `
class LFUCache {
    private final int capacity;
    private int minFreq = 0;
    private final Map<Integer, Integer> vals = new HashMap<>();
    private final Map<Integer, Integer> freq = new HashMap<>();
    private final Map<Integer, LinkedHashSet<Integer>> buckets = new HashMap<>();   // count -> keys, oldest first

    public LFUCache(int capacity) { this.capacity = capacity; }

    public int get(int key) {
        if (!vals.containsKey(key)) return -1;
        touch(key);
        return vals.get(key);
    }

    public void put(int key, int value) {
        if (capacity <= 0) return;
        if (vals.containsKey(key)) {            // existing: update + count a use (never evicts)
            vals.put(key, value);
            touch(key);
            return;
        }
        if (vals.size() == capacity) {          // evict: least frequent, then least recent
            LinkedHashSet<Integer> set = buckets.get(minFreq);
            int victim = set.iterator().next(); // oldest key in the lowest bucket
            set.remove(victim);
            if (set.isEmpty()) buckets.remove(minFreq);
            vals.remove(victim);
            freq.remove(victim);
        }
        vals.put(key, value);
        freq.put(key, 1);
        buckets.computeIfAbsent(1, f -> new LinkedHashSet<>()).add(key);
        minFreq = 1;                            // a brand-new key always has the lowest count
    }

    // Move key from bucket[c] to bucket[c + 1]
    private void touch(int key) {
        int c = freq.get(key);
        LinkedHashSet<Integer> set = buckets.get(c);
        set.remove(key);
        if (set.isEmpty()) {
            buckets.remove(c);
            if (minFreq == c) minFreq = c + 1;  // the key itself now lives in c + 1
        }
        freq.put(key, c + 1);
        buckets.computeIfAbsent(c + 1, f -> new LinkedHashSet<>()).add(key);   // newest in its bucket
    }
}`,
      alt: [
        { lang: 'python', code: `from collections import defaultdict, OrderedDict

class LFUCache:
    def __init__(self, capacity: int):
        self.cap = capacity
        self.min_freq = 0
        self.vals = {}                                  # key -> value
        self.freq = {}                                  # key -> use count
        self.buckets = defaultdict(OrderedDict)         # count -> keys, oldest first

    def _touch(self, key):                              # move key from bucket[c] to bucket[c + 1]
        c = self.freq[key]
        del self.buckets[c][key]
        if not self.buckets[c]:
            del self.buckets[c]
            if self.min_freq == c:
                self.min_freq = c + 1                   # the key itself now lives in c + 1
        self.freq[key] = c + 1
        self.buckets[c + 1][key] = None                 # newest in its bucket

    def get(self, key: int) -> int:
        if key not in self.vals:
            return -1
        self._touch(key)
        return self.vals[key]

    def put(self, key: int, value: int) -> None:
        if self.cap <= 0:
            return
        if key in self.vals:                            # existing: update + count a use
            self.vals[key] = value
            self._touch(key)
            return
        if len(self.vals) == self.cap:                  # evict: least frequent, then least recent
            bucket = self.buckets[self.min_freq]
            victim, _ = bucket.popitem(last=False)      # oldest key in the lowest bucket
            if not bucket:
                del self.buckets[self.min_freq]
            del self.vals[victim], self.freq[victim]
        self.vals[key] = value
        self.freq[key] = 1
        self.buckets[1][key] = None
        self.min_freq = 1                               # a brand-new key has the lowest count` },
        { lang: 'js', code: `class LFUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.minFreq = 0;
    this.vals = new Map();        // key -> value
    this.freq = new Map();        // key -> use count
    this.buckets = new Map();     // count -> Set of keys (a Set keeps insertion order: oldest first)
  }

  touch(key) {                    // move key from bucket[c] to bucket[c + 1]
    const c = this.freq.get(key), set = this.buckets.get(c);
    set.delete(key);
    if (set.size === 0) {
      this.buckets.delete(c);
      if (this.minFreq === c) this.minFreq = c + 1;   // the key itself now lives in c + 1
    }
    this.freq.set(key, c + 1);
    if (!this.buckets.has(c + 1)) this.buckets.set(c + 1, new Set());
    this.buckets.get(c + 1).add(key);                 // newest in its bucket
  }

  get(key) {
    if (!this.vals.has(key)) return -1;
    this.touch(key);
    return this.vals.get(key);
  }

  put(key, value) {
    if (this.capacity <= 0) return;
    if (this.vals.has(key)) {                         // existing: update + count a use
      this.vals.set(key, value);
      this.touch(key);
      return;
    }
    if (this.vals.size === this.capacity) {           // evict: least frequent, then least recent
      const set = this.buckets.get(this.minFreq);
      const victim = set.values().next().value;       // oldest key in the lowest bucket
      set.delete(victim);
      if (set.size === 0) this.buckets.delete(this.minFreq);
      this.vals.delete(victim);
      this.freq.delete(victim);
    }
    this.vals.set(key, value);
    this.freq.set(key, 1);
    if (!this.buckets.has(1)) this.buckets.set(1, new Set());
    this.buckets.get(1).add(key);
    this.minFreq = 1;                                 // a brand-new key has the lowest count
  }
}` },
        { lang: 'cpp', code: `class LFUCache {
    struct Entry { int val, freq; list<int>::iterator pos; };
    int capacity, minFreq = 0;
    unordered_map<int, Entry> data;                   // key -> value, count, place in its bucket
    unordered_map<int, list<int>> buckets;            // count -> keys, oldest at the front

    void touch(int key) {                             // move key from bucket[c] to bucket[c + 1]
        Entry& e = data[key];
        int c = e.freq;
        list<int>& from = buckets[c];
        list<int>& to = buckets[c + 1];
        to.splice(to.end(), from, e.pos);             // O(1): relink the list node, no copy
        if (from.empty()) {
            buckets.erase(c);
            if (minFreq == c) minFreq = c + 1;        // the key itself now lives in c + 1
        }
        e.freq = c + 1;                               // e.pos stays valid after splice
    }

public:
    LFUCache(int capacity) : capacity(capacity) {}

    int get(int key) {
        auto it = data.find(key);
        if (it == data.end()) return -1;
        touch(key);
        return it->second.val;
    }

    void put(int key, int value) {
        if (capacity <= 0) return;
        auto it = data.find(key);
        if (it != data.end()) {                       // existing: update + count a use
            it->second.val = value;
            touch(key);
            return;
        }
        if ((int)data.size() == capacity) {           // evict: least frequent, then least recent
            list<int>& lowest = buckets[minFreq];
            int victim = lowest.front();              // oldest key in the lowest bucket
            lowest.pop_front();
            if (lowest.empty()) buckets.erase(minFreq);
            data.erase(victim);
        }
        list<int>& ones = buckets[1];
        ones.push_back(key);
        data[key] = {value, 1, prev(ones.end())};
        minFreq = 1;                                  // a brand-new key has the lowest count
    }
};` }
      ],
      complexity: `<p><b>Time O(1)</b> average per call (hash map/set operations; LinkedHashSet removal is O(1) via its internal doubly linked list). <b>Space O(capacity)</b>.</p>`,
      followUps: ['Implement the buckets as your own doubly linked lists instead of LinkedHashSet.', 'LFU never forgets old popularity — how do real caches (TinyLFU) age the counts?']
    }
  });

  practice.push({
    title: 'Design a Text Editor (cursor in a doubly linked list)',
    level: 'Hard',
    tags: ['design', 'doubly linked list', 'sentinel'],
    companies: ['Google', 'Microsoft', 'Amazon'],
    statement: `<p>Build a text editor with a cursor:</p><ul><li><code>addText(text)</code>: insert text at the cursor; the cursor ends after it.</li><li><code>deleteText(k)</code>: delete up to k characters to the <b>left</b> of the cursor; return how many were deleted.</li><li><code>cursorLeft(k)</code> / <code>cursorRight(k)</code>: move the cursor up to k positions; return the last <b>min(10, len)</b> characters to the left of the cursor.</li></ul><p>Follow-up: each call in O(k) time, independent of the total text length.</p>`,
    constraints: `1 ≤ text.length, k ≤ 40, text has lowercase letters, at most 2·10<sup>4</sup> calls in total`,
    example: `<p>addText("leetcode") → <code>leetcode|</code>; deleteText(4) → ${H.c('g', '4')} (<code>leet|</code>); addText("practice") → <code>leetpractice|</code>; cursorRight(3) → ${H.c('g', '"etpractice"')} (already at the end); cursorLeft(8) → ${H.c('g', '"leet"')} (<code>leet|practice</code>); deleteText(10) → ${H.c('g', '4')} (only 4 chars on the left); cursorLeft(2) → ${H.c('g', '""')}; cursorRight(6) → ${H.c('g', '"practi"')}.</p>`,
    brute: {
      why: `<p>One StringBuilder plus an integer cursor. <code>insert</code> and <code>delete</code> in the middle shift every character to the right of the cursor: <b>O(total length)</b> per call, even when k is tiny. Up to 2·10<sup>4</sup> × 8·10<sup>5</sup> character moves in the worst case.</p>`,
      code: {
          lang: 'java',
          code: `
class TextEditor {
    private final StringBuilder sb = new StringBuilder();
    private int cursor = 0;

    public void addText(String text) { sb.insert(cursor, text); cursor += text.length(); }   // shifts the right part

    public int deleteText(int k) {
        int d = Math.min(k, cursor);
        sb.delete(cursor - d, cursor);                                                        // shifts again
        cursor -= d;
        return d;
    }

    public String cursorLeft(int k) { cursor = Math.max(0, cursor - k); return sb.substring(Math.max(0, cursor - 10), cursor); }

    public String cursorRight(int k) { cursor = Math.min(sb.length(), cursor + k); return sb.substring(Math.max(0, cursor - 10), cursor); }
}`,
          alt: [
            { lang: 'python', code: `class TextEditor:
    def __init__(self):
        self.sb = ""
        self.cursor = 0

    def addText(self, text):
        self.sb = self.sb[:self.cursor] + text + self.sb[self.cursor:]    # shifts the right part
        self.cursor += len(text)

    def deleteText(self, k):
        d = min(k, self.cursor)
        self.sb = self.sb[:self.cursor - d] + self.sb[self.cursor:]        # shifts again
        self.cursor -= d
        return d

    def cursorLeft(self, k):
        self.cursor = max(0, self.cursor - k)
        return self.sb[max(0, self.cursor - 10):self.cursor]

    def cursorRight(self, k):
        self.cursor = min(len(self.sb), self.cursor + k)
        return self.sb[max(0, self.cursor - 10):self.cursor]` },
            { lang: 'js', code: `class TextEditor {
  constructor() {
    this.sb = "";
    this.cursor = 0;
  }

  addText(text) {
    this.sb = this.sb.slice(0, this.cursor) + text + this.sb.slice(this.cursor);   // shifts the right part
    this.cursor += text.length;
  }

  deleteText(k) {
    const d = Math.min(k, this.cursor);
    this.sb = this.sb.slice(0, this.cursor - d) + this.sb.slice(this.cursor);       // shifts again
    this.cursor -= d;
    return d;
  }

  cursorLeft(k) {
    this.cursor = Math.max(0, this.cursor - k);
    return this.sb.slice(Math.max(0, this.cursor - 10), this.cursor);
  }

  cursorRight(k) {
    this.cursor = Math.min(this.sb.length, this.cursor + k);
    return this.sb.slice(Math.max(0, this.cursor - 10), this.cursor);
  }
}` },
            { lang: 'cpp', code: `class TextEditor {
    string sb;
    int cursor = 0;

public:
    void addText(string text) { sb.insert(cursor, text); cursor += text.size(); }   // shifts the right part

    int deleteText(int k) {
        int d = min(k, cursor);
        sb.erase(cursor - d, d);                                                      // shifts again
        cursor -= d;
        return d;
    }

    string cursorLeft(int k) {
        cursor = max(0, cursor - k);
        return sb.substr(max(0, cursor - 10), cursor - max(0, cursor - 10));
    }

    string cursorRight(int k) {
        cursor = min((int)sb.size(), cursor + k);
        return sb.substr(max(0, cursor - 10), cursor - max(0, cursor - 10));
    }
};` }
          ]
        }
    },
    mcq: { q: 'Represent the cursor as "it sits right after node <code>cur</code>". What should <code>cur</code> be when the cursor is at the very start of the text?', options: ['null', 'A sentinel node placed before the first character', 'The first character', 'The last character'], answer: 1, explain: 'A sentinel gives the "start of text" position a real node, so inserting at the start and stopping on deletes need no null checks — the dummy-node trick again.' },
    hints: [
      `<p>Inserting or deleting next to a position you already hold is the one thing linked lists do in O(1). The cursor is that position.</p>`,
      `<p>Doubly linked list of characters with a head sentinel; field <code>cur</code> = the node just left of the cursor (sentinel at the start). Moving left/right is following prev/next.</p>`,
      `<p>addText: insert each char after cur and advance cur. deleteText: while k-- &gt; 0 and cur is not the sentinel, unlink cur and step to cur.prev. To report, walk back from cur at most 10 nodes and reverse the collected characters.</p>`
    ],
    tests: { cls: 'TextEditor', sigs: { TextEditor: '', addText: 'string -> void', deleteText: 'int -> int', cursorLeft: 'int -> string', cursorRight: 'int -> string' }, cases: [
      { ops: ['TextEditor', 'addText', 'deleteText', 'addText', 'cursorRight', 'cursorLeft', 'deleteText', 'cursorLeft', 'cursorRight'], args: [[], ['leetcode'], [4], ['practice'], [3], [8], [10], [2], [6]], out: [null, null, 4, null, 'etpractice', 'leet', 4, '', 'practi'] },
      { ops: ['TextEditor', 'deleteText', 'cursorLeft', 'cursorRight'], args: [[], [5], [3], [3]], out: [null, 0, '', ''] },
      { ops: ['TextEditor', 'addText', 'cursorLeft', 'addText', 'cursorRight', 'cursorLeft'], args: [[], ['ac'], [1], ['b'], [5], [40]], out: [null, null, 'a', null, 'abc', ''] },
      { ops: ['TextEditor', 'addText', 'cursorLeft', 'deleteText', 'cursorRight'], args: [[], ['abcdefghijklmnop'], [3], [2], [1]], out: [null, null, 'defghijklm', 2, 'cdefghijkn'] },
      { ops: ['TextEditor', 'addText', 'addText', 'cursorLeft', 'deleteText', 'cursorRight', 'addText', 'cursorLeft'], args: [[], ['xyz'], ['xyz'], [3], [1], [40], ['q'], [1]], out: [null, null, null, 'xyz', 1, 'xyxyz', null, 'xyxyz'] },
      { ops: ['TextEditor', 'addText', 'deleteText', 'deleteText', 'addText', 'cursorRight'], args: [[], ['a'], [1], [1], ['bc'], [1]], out: [null, null, 1, 0, null, 'bc'] }
    ] },
    solution: {
      approach: `<p>Doubly linked list + sentinel + cursor node; every operation touches only O(k) nodes (and at most 10 for the report).</p>`,
      code: `
class TextEditor {
    private static class Node {
        char ch;
        Node prev, next;
        Node(char ch) { this.ch = ch; }
    }

    private final Node head = new Node('#');   // sentinel: "start of text"
    private Node cur = head;                   // the cursor sits right AFTER this node

    public void addText(String text) {
        for (char c : text.toCharArray()) {
            Node n = new Node(c);
            n.prev = cur;
            n.next = cur.next;
            if (cur.next != null) cur.next.prev = n;
            cur.next = n;
            cur = n;                            // typing moves the cursor forward
        }
    }

    public int deleteText(int k) {
        int deleted = 0;
        while (k-- > 0 && cur != head) {       // remove the char just left of the cursor
            Node left = cur.prev;
            left.next = cur.next;
            if (cur.next != null) cur.next.prev = left;
            cur = left;
            deleted++;
        }
        return deleted;
    }

    public String cursorLeft(int k) {
        while (k-- > 0 && cur != head) cur = cur.prev;
        return leftText();
    }

    public String cursorRight(int k) {
        while (k-- > 0 && cur.next != null) cur = cur.next;
        return leftText();
    }

    private String leftText() {                // last min(10, len) chars left of the cursor
        StringBuilder sb = new StringBuilder();
        for (Node n = cur; n != head && sb.length() < 10; n = n.prev) sb.append(n.ch);
        return sb.reverse().toString();
    }
}`,
      alt: [
        { lang: 'python', code: `class Node:
    __slots__ = ("ch", "prev", "next")
    def __init__(self, ch, prev=None, nxt=None):
        self.ch, self.prev, self.next = ch, prev, nxt

class TextEditor:
    def __init__(self):
        self.head = Node("#")                  # sentinel: "start of text"
        self.cur = self.head                   # the cursor sits right AFTER this node

    def addText(self, text: str) -> None:
        for ch in text:
            n = Node(ch, self.cur, self.cur.next)
            if self.cur.next:
                self.cur.next.prev = n
            self.cur.next = n
            self.cur = n                       # typing moves the cursor forward

    def deleteText(self, k: int) -> int:
        deleted = 0
        while deleted < k and self.cur is not self.head:   # remove the char left of the cursor
            left = self.cur.prev
            left.next = self.cur.next
            if self.cur.next:
                self.cur.next.prev = left
            self.cur = left
            deleted += 1
        return deleted

    def cursorLeft(self, k: int) -> str:
        while k > 0 and self.cur is not self.head:
            self.cur, k = self.cur.prev, k - 1
        return self._left_text()

    def cursorRight(self, k: int) -> str:
        while k > 0 and self.cur.next:
            self.cur, k = self.cur.next, k - 1
        return self._left_text()

    def _left_text(self):                      # last min(10, len) chars left of the cursor
        out, n = [], self.cur
        while n is not self.head and len(out) < 10:
            out.append(n.ch)
            n = n.prev
        return "".join(reversed(out))` },
        { lang: 'js', code: `class Node {
  constructor(ch, prev = null, next = null) { this.ch = ch; this.prev = prev; this.next = next; }
}

class TextEditor {
  constructor() {
    this.head = new Node('#');           // sentinel: "start of text"
    this.cur = this.head;                // the cursor sits right AFTER this node
  }

  addText(text) {
    for (const ch of text) {
      const n = new Node(ch, this.cur, this.cur.next);
      if (this.cur.next !== null) this.cur.next.prev = n;
      this.cur.next = n;
      this.cur = n;                      // typing moves the cursor forward
    }
  }

  deleteText(k) {
    let deleted = 0;
    while (deleted < k && this.cur !== this.head) {   // remove the char left of the cursor
      const left = this.cur.prev;
      left.next = this.cur.next;
      if (this.cur.next !== null) this.cur.next.prev = left;
      this.cur = left;
      deleted++;
    }
    return deleted;
  }

  cursorLeft(k) {
    while (k-- > 0 && this.cur !== this.head) this.cur = this.cur.prev;
    return this.leftText();
  }

  cursorRight(k) {
    while (k-- > 0 && this.cur.next !== null) this.cur = this.cur.next;
    return this.leftText();
  }

  leftText() {                           // last min(10, len) chars left of the cursor
    const out = [];
    for (let n = this.cur; n !== this.head && out.length < 10; n = n.prev) out.push(n.ch);
    return out.reverse().join('');
  }
}` },
        { lang: 'cpp', code: `class TextEditor {
    // std::list is a doubly linked list; the cursor is an iterator to the char just RIGHT of it
    list<char> text;
    list<char>::iterator cur = text.end();

    string leftText() {                      // last min(10, len) chars left of the cursor
        string out;
        for (auto it = cur; it != text.begin() && out.size() < 10; ) out += *--it;
        reverse(out.begin(), out.end());
        return out;
    }

public:
    void addText(string s) {
        for (char c : s) text.insert(cur, c);    // O(1) insert before the cursor; cur stays valid
    }

    int deleteText(int k) {
        int deleted = 0;
        while (deleted < k && cur != text.begin()) {
            cur = text.erase(prev(cur));         // erase the char left of the cursor
            deleted++;
        }
        return deleted;
    }

    string cursorLeft(int k) {
        while (k-- > 0 && cur != text.begin()) --cur;
        return leftText();
    }

    string cursorRight(int k) {
        while (k-- > 0 && cur != text.end()) ++cur;
        return leftText();
    }
};` }
      ],
      complexity: `<p><b>Time O(k)</b> per call (plus ≤ 10 steps for the report), independent of text length. <b>Space O(total characters)</b> — one node per character, which is heavy; the alternative "two stacks" design (left of cursor, right of cursor) has the same complexity with less memory.</p>`,
      followUps: ['Implement it with two ArrayDeques (left stack, right stack) and compare memory.', 'Real editors use gap buffers, piece tables or ropes — what does each optimise?']
    }
  });

  // =====================================================================
  // QUIZ
  // =====================================================================
  quiz.push(
    { q: 'What does it cost to read the k-th element of a singly linked list, given only the head?', options: ['O(1)', 'O(log k)', 'O(k)', 'O(N²)'], answer: 2, explain: 'There is no index arithmetic: you follow next k times. Arrays get O(1) because the address of element k can be computed directly.' },
    { q: 'You hold a reference to node X in a singly list. Inserting a new node right <b>after</b> X costs…', options: ['O(1)', 'O(N)', 'O(log N)', 'Impossible without the head'], answer: 0, explain: 'newNode.next = X.next; X.next = newNode. Two writes, no walking. (Inserting BEFORE X would need X\'s predecessor.)' },
    { q: 'A singly linked list keeps both head and tail pointers. Which operation is still O(N)?', options: ['addFirst', 'addLast', 'removeFirst', 'removeLast'], answer: 3, explain: 'To remove the tail you must set the second-last node\'s next to null, and a singly list cannot step back from the tail to find it.' },
    { q: 'What problem does a dummy (sentinel) node before the head solve?', options: ['It makes the list sorted', 'Every real node, including the head, now has a predecessor, so head insert/delete need no special case', 'It speeds up traversal', 'It prevents cycles'], answer: 1, explain: 'Most edits change prev.next. The dummy is the head\'s prev; at the end you return dummy.next, which may be a new head.' },
    { q: 'Remove the 2nd node from the end of D → 1 → 2 → 3 → 4 → 5 with fast and slow starting at the dummy D. How many steps does fast take alone before both move together?', options: ['1', '2', '3', '5'], answer: 2, explain: 'n + 1 = 3. Then when fast becomes null, slow is on 3 — just before the victim 4.' },
    { q: 'List 1 → 2 → 3 → 4 → 5 → 6 with <code>while (fast != null &amp;&amp; fast.next != null)</code>, both starting at head. Where does slow stop?', options: ['3', '4', '5', '6'], answer: 1, explain: 'Rounds: (2, 3), (3, 5), (4, null). The even length has two middles; this condition returns the second one, 4.' },
    { q: 'In Floyd\'s cycle detection, why compare <code>slow == fast</code> instead of <code>slow.val == fast.val</code>?', options: ['It is faster', 'Different nodes may hold equal values; only the same node proves the pointers met', 'Values can be null', 'The language forbids comparing ints'], answer: 1, explain: 'A list like 1 → 2 → 1 → null has repeated values but no cycle. Identity comparison is what matters.' },
    { q: 'Why does Floyd use speeds 1 and 2 rather than 1 and 3?', options: ['Speed 3 is slower', 'With a speed difference of 1 the gap shrinks by exactly 1 per round, so the pointers cannot jump over each other', 'Speed 3 uses more memory', 'There is no reason'], answer: 1, explain: 'With difference 2, an odd gap on an even-length loop stays odd forever — they could circle without ever meeting.' },
    { q: 'At the end of the iterative reversal loop, which variable holds the new head?', options: ['head', 'curr', 'prev', 'next'], answer: 2, explain: 'curr is null (we walked off the end); prev is the last node processed, i.e. the old tail = new head. Returning head returns the new tail.' },
    { q: 'Reverse 1 → 2 → 3 → 4 → 5 → 6 → 7 in groups of k = 3 (leave a short tail as is). Result?', options: ['3 → 2 → 1 → 6 → 5 → 4 → 7', '7 → 6 → 5 → 4 → 3 → 2 → 1', '3 → 2 → 1 → 4 → 5 → 6 → 7', '1 → 2 → 3 → 6 → 5 → 4 → 7'], answer: 0, explain: 'Two full groups [1 2 3] and [4 5 6] are reversed; the single leftover 7 stays.' },
    { q: 'Merging sorted lists of lengths N and M by splicing nodes uses how much extra space?', options: ['O(1)', 'O(N + M)', 'O(log(N + M))', 'O(N · M)'], answer: 0, explain: 'Only a dummy node and a few pointers; existing nodes are re-hooked. (The recursive version uses O(N + M) stack.)' },
    { q: 'In an LRU cache built from a hash map (<code>HashMap</code> / <code>dict</code> / <code>Map</code> / <code>unordered_map</code>) + doubly linked list, why does each node store its <b>key</b>?', options: ['To sort the list', 'When the LRU node is evicted from the list, we need its key to remove it from the map', 'To compute hash codes faster', 'It is not needed'], answer: 1, explain: 'Eviction starts from tail.prev (a node). Without the key stored inside, you could not find which map entry to delete.' },
    { q: 'Which Java constructor turns a LinkedHashMap into an LRU-ordered map?', options: ['new LinkedHashMap&lt;&gt;(16, 0.75f, false)', 'new LinkedHashMap&lt;&gt;(16, 0.75f, true)', 'new LinkedHashMap&lt;&gt;()', 'new TreeMap&lt;&gt;()'], answer: 1, explain: 'The third argument accessOrder = true moves an entry to the end on every get/put. Override removeEldestEntry to evict when size() &gt; capacity.' }
  );

  // =====================================================================
  // INTERVIEW Q&A
  // =====================================================================
  interview.push(
    {
      q: 'When would you choose a linked list over an array (or ArrayList)?', level: 'B',
      a: `<p>Choose by the <b>operations</b>. Arrays give O(1) access by index, compact memory and great cache behaviour; inserting or deleting in the middle shifts elements (O(N)). Linked lists give O(1) insert/delete <b>at a node you already hold</b> (or at the ends), and grow without copying, but access by index is O(N), each node carries pointer overhead, and walking the list causes cache misses.</p>
<p>So: lots of indexing, sorting or binary search → array. Frequent add/remove at the ends or at known positions, or the need to move items around by handle (LRU cache, task schedulers, undo history) → linked list. Dynamic arrays and array-backed deques (<code>ArrayList</code>/<code>ArrayDeque</code>, Python <code>list</code>/<code>deque</code>, JS arrays, C++ <code>vector</code>/<code>deque</code>) win most real benchmarks; reach for a linked structure when the O(1) handle-based removal is truly needed.</p>`,
      followUps: ['Why is LinkedList.get(i) in a loop a hidden O(N²)?', 'What is a cache miss and why does it hurt linked lists?']
    },
    {
      q: 'Singly vs doubly linked list: what do you gain and what do you pay?', level: 'B',
      a: `<p>A doubly linked list adds a <code>prev</code> pointer to each node. Gains: walk in both directions; delete a node you hold in O(1) (it knows its predecessor); remove the tail in O(1) with a tail pointer; insert before a node in O(1). Costs: one extra reference per node (more memory), twice as many pointer updates per insert/delete, and more ways to get it wrong (forgetting to fix <code>prev</code>, or <code>head</code>/<code>tail</code> at the ends).</p>
<p>Java's <code>java.util.LinkedList</code> is doubly linked, which is why it implements <code>Deque</code> with O(1) operations at both ends.</p>`,
      followUps: ['How do sentinel nodes simplify a doubly linked list?', 'What is an XOR linked list and why can\'t Java implement it?']
    },
    {
      q: 'Explain the dummy node trick. When do you reach for it?', level: 'I',
      a: `<p>Create a fake node whose <code>next</code> is the real head, run the algorithm as if the dummy were part of the list, and return <code>dummy.next</code>. Since most edits work on "the node before", and the head has no node before it, the dummy removes all head special cases.</p>
<p>Signals: the head might be deleted or replaced (remove elements, remove N-th from end, remove duplicates II, reverse between left = 1, k-group reversal), or you are <b>building</b> a new list node by node (merge, partition, add two numbers) — then a dummy + tail pointer avoids "is the result empty?" checks. Cost is one node, O(1).</p>`,
      followUps: ['Why must you return dummy.next instead of head?', 'Where do sentinels appear in real libraries (Linux list_head, std::list)?']
    },
    {
      q: 'How does Floyd\'s cycle detection work, and how do you find where the cycle starts?', level: 'I',
      a: `<p>Phase 1: slow moves 1 step, fast moves 2. If fast reaches null there is no cycle. If there is one, both eventually enter it and fast gains exactly 1 node per round, so it lands on slow within one lap.</p>
<p>Phase 2: let a = distance head → cycle start, b = start → meeting point, c = loop length. At the meeting, slow walked a + b and fast walked 2(a + b) = a + b + k·c, so <b>a = k·c − b</b>. Walking a steps from the meeting point therefore ends at the start. Put one pointer at head, keep one at the meeting node, move both 1 step at a time; they meet at the cycle start. O(N) time, O(1) space.</p>`,
      followUps: ['How do you get the cycle length?', 'Apply it to Find the Duplicate Number.', 'What is Brent\'s algorithm and when is it better?']
    },
    {
      q: 'Reverse a singly linked list. Give the iterative and the recursive versions and compare them.', level: 'I',
      a: `<p><b>Iterative:</b> <code>prev = null, curr = head</code>; loop: <code>next = curr.next; curr.next = prev; prev = curr; curr = next;</code> return prev. Invariant: prev heads the reversed prefix, curr heads the untouched suffix. O(N) time, O(1) space.</p>
<p><b>Recursive:</b> if head or head.next is null return head; <code>newHead = reverse(head.next); head.next.next = head; head.next = null; return newHead;</code>. Also O(N) time, but O(N) stack frames — a 10<sup>6</sup>-node list overflows the stack (Python fails past about 1000 nodes), and Java, Python and JS do not remove tail calls. Prefer iterative in production; show recursive to demonstrate understanding.</p>`,
      followUps: ['What happens if you forget head.next = null in the recursive version?', 'How would you reverse only positions left..right?']
    },
    {
      q: 'Remove the N-th node from the end in one pass. Walk me through edge cases.', level: 'I',
      a: `<p>Dummy before head; fast and slow both start at the dummy. Move fast n + 1 steps, then move both until fast is null. The gap stays n + 1, so slow ends on the node <b>before</b> the target; do <code>slow.next = slow.next.next</code> and return <code>dummy.next</code>.</p>
<p>Edge cases: n equals the length (the head is removed — slow stays on the dummy, and returning <code>head</code> would be a bug); single node with n = 1 (result is empty); n = 1 (remove the tail). Constraints guarantee 1 ≤ n ≤ length; if not guaranteed, check that fast does not become null during the first phase before the loop ends.</p>`,
      followUps: ['Why n + 1 steps rather than n?', 'How is this useful on a stream you can read only once?']
    },
    {
      q: 'How do you find the middle node, and which middle do different algorithms need?', level: 'I',
      a: `<p>Slow moves 1, fast moves 2. With <code>while (fast != null &amp;&amp; fast.next != null)</code> slow ends at index ⌊N/2⌋: the middle for odd N and the <b>second</b> middle for even N (LeetCode "Middle of the Linked List", palindrome check). With <code>while (fast.next != null &amp;&amp; fast.next.next != null)</code> it ends on the <b>first</b> middle — required for merge sort / reorder list so that a 2-node list splits into 1 + 1 (otherwise the recursion never shrinks).</p>
<p>It is one pass but the same ~1.5N pointer moves as count-then-walk; the benefit is a single traversal.</p>`,
      followUps: ['How would you find the node at 1/3 of the list?', 'How do you delete the middle node (you need the node before it)?']
    },
    {
      q: 'Design an LRU cache with O(1) get and put.', level: 'A',
      a: `<p>Combine a <b>hash map from key to node</b> (<code>HashMap</code> / <code>dict</code> / <code>Map</code> / <code>unordered_map</code>) with a <b>doubly linked list</b> ordered by recency, with head and tail sentinels (head side = most recent). get: look up the node; if present, unlink it and add it after head, return its value. put: if the key exists, update and move to front; otherwise, if full, evict <code>tail.prev</code> — unlink it and remove its <b>key</b> from the map (that is why nodes store keys) — then create the node, add to front, put into the map.</p>
<p>Each call = one hash operation + a constant number of pointer writes → O(1) average; space O(capacity). In Java, <code>LinkedHashMap(16, 0.75f, true)</code> with <code>removeEldestEntry</code> gives the same in a few lines; in Python, <code>OrderedDict</code> with <code>move_to_end</code>/<code>popitem(last=False)</code>; in JS, a <code>Map</code> (delete + set moves a key to the end, <code>keys().next()</code> is the oldest); in C++, a <code>std::list</code> plus an <code>unordered_map</code> of iterators, using <code>splice</code> to move a node to the front.</p>`,
      followUps: ['What is the bug if you check capacity before checking whether the key exists?', 'How would you add TTL expiry?', 'How does LFU differ?']
    },
    {
      q: 'Walk through Reverse Nodes in k-Group. What are the classic bugs?', level: 'A',
      a: `<p>Dummy + <code>groupPrev</code>. Per group: find <code>kth</code> by walking k steps from groupPrev (null → fewer than k remain → stop). Let <code>groupNext = kth.next</code>. Reverse the group with prev starting at groupNext, looping until curr == groupNext — so the old first node automatically points to the rest. Save <code>oldFirst = groupPrev.next</code>, hook <code>groupPrev.next = kth</code>, set <code>groupPrev = oldFirst</code>. O(N) time (each node counted once and flipped once), O(1) space.</p>
<p>Bugs: reversing the short tail; saving oldFirst <b>after</b> the hook; starting prev at null (the group's end is disconnected); counting with an off-by-one; returning head instead of dummy.next. Test k = 1, k = n, and n divisible by k.</p>`,
      followUps: ['Write the recursive version — what is its stack depth?', 'Change it so the leftover group is reversed too.']
    },
    {
      q: 'Why is java.util.LinkedList often slower than ArrayList, even for insert-heavy code?', level: 'A',
      a: `<p>Big-O hides constants. Each LinkedList element costs a node object (~24 bytes) plus a boxed Integer (~16 bytes), allocated separately and scattered across the heap, so traversal is pointer chasing with frequent cache misses and more GC work. ArrayList stores references contiguously; shifting elements uses <code>System.arraycopy</code>, a fast block memory move, so an O(N) shift of thousands of elements is still cheap.</p>
<p>Also, "O(1) insert in the middle" assumes you are already <b>at</b> the position; finding it is O(N) on a list. Use a linked list when you hold handles to nodes (iterators, map values) and must remove/move them in O(1); otherwise ArrayList or ArrayDeque usually wins. The same holds outside Java: C++ <code>std::vector</code> usually beats <code>std::list</code>, and Python's <code>list</code>/<code>deque</code> beat a hand-made node chain.</p>`,
      followUps: ['How would you measure it fairly (JMH)?', 'When does ArrayDeque beat LinkedList as a queue?']
    },
    {
      q: 'How do you merge k sorted linked lists efficiently? Compare approaches.', level: 'A',
      a: `<p>Three options with N total nodes: (1) merge one by one into an accumulator — O(N·k) because early nodes are re-walked; (2) a <b>min-heap</b> of the k fronts: pop the smallest, attach, push its next — O(N log k) time, O(k) space; (3) <b>divide and conquer</b>: merge pairs (0,1), (2,3)…, then pairs of results — log k rounds of O(N) work = O(N log k), O(1) extra space iteratively.</p>
<p>The heap version is easiest to explain and streams naturally (useful for external merge sort over files); divide and conquer avoids the heap and its comparator overhead.</p>`,
      followUps: ['In Python, why push (val, index, node) instead of (val, node)?', 'How does this relate to LSM-tree compaction?']
    },
    {
      q: 'How do you find where two linked lists intersect? What if they might contain cycles?', level: 'I',
      a: `<p>Without cycles: two pointers that switch to the other list's head when they reach the end. Each walks lenA + lenB − shared nodes before reaching the merge point, so they arrive together (or both reach null if there is no intersection). O(m + n) time, O(1) space. Alternative: compute lengths and advance the longer list by the difference.</p>
<p>With possible cycles: run Floyd on each. If exactly one has a cycle they cannot intersect. If neither has one, use the method above. If both have cycles, they intersect only if they share the same cycle: walk around one cycle from its entry and check whether you meet the other's entry; if the entries are the same node, find the merge point on the tails like the acyclic case.</p>`,
      followUps: ['Why compare node references, not values?', 'Can two lists intersect and then split apart again?']
    },
    {
      q: 'A production LRU cache is a bottleneck under many threads. How do you scale it?', level: 'E',
      a: `<p>Even <code>get</code> mutates the recency list, so a read-write lock does not help and a single lock serialises everything. Options: (1) <b>striping/segmentation</b> — hash keys into N independent LRU caches, each with its own lock (eviction becomes per-segment, an approximation of global LRU); (2) <b>buffered reads</b> — record "key was read" in lock-free ring buffers and replay them into the policy in batches (Caffeine's design), so the hot path only touches a ConcurrentHashMap; (3) <b>sampled/approximate LRU</b> — like Redis, keep a last-access timestamp per key and evict the oldest of a small random sample, avoiding a global list entirely; (4) CLOCK-style algorithms with a reference bit instead of moving nodes.</p>
<p>Also revisit the policy: pure LRU is vulnerable to scans; W-TinyLFU, ARC or 2Q usually give better hit rates. Measure hit rate and p99 latency before and after.</p>`,
      followUps: ['What consistency guarantees do you lose with segmentation?', 'How would you add per-entry TTL without a background thread per entry?']
    },
    {
      q: 'Your linked-list code hangs or crashes on hidden tests. How do you debug pointer bugs systematically?', level: 'E',
      a: `<p>A hang almost always means you created a <b>cycle</b> (e.g. forgot <code>head.next = null</code> in recursive reversal, or <code>ge.next = null</code> in partition) and something is printing or walking forever. A null-pointer failure (Java NullPointerException, Python AttributeError on None, JavaScript TypeError, C++ crash) means you dereferenced <code>.next</code> without checking — usually on empty, one-node or two-node lists.</p>
<p>Process: (1) dry-run on paper with boxes and arrows for 0, 1, 2, 3 nodes and the boundaries (head, tail, k = n); (2) add a safe printer that stops after, say, 2N steps and reports "cycle detected"; (3) assert invariants (DLL: <code>n.next.prev == n</code>; LRU: map size equals list size); (4) write a brute-force reference (copy to a plain array or list, do the operation there) and compare on all small inputs or random inputs. AI assistants are good at generating those harnesses quickly; you still decide which invariants matter.</p>`,
      followUps: ['Write a printer that detects cycles with Floyd before printing.', 'Which three inputs would you always test first for any list problem?']
    }
  );

  registerModule({
    id: 'dsa12',
    title: 'Linked Lists',
    intro: `<p>Arrays live in one solid block of memory; a <b>linked list</b> is a chain of small boxes, each holding a value and an arrow to the next box. That one change flips the costs: jumping to the 500th item becomes slow, but adding or removing an item where you already stand becomes instant. Interviewers love linked lists because there is nowhere to hide — every solution is a few pointer moves, and one move in the wrong order loses half the list.</p>
<p>In this module you will build singly and doubly linked lists from scratch, then learn the <b>six moves</b> that solve almost every list question: the <b>dummy node</b>, <b>fast &amp; slow pointers</b> (middle, Floyd's cycle detection and the cycle start), <b>gap pointers</b> (remove the N-th from the end), <b>in-place reversal</b> (iterative, recursive and in groups of k), <b>merging</b> sorted lists, and finally the famous <b>LRU cache</b> that glues a HashMap to a doubly linked list. Every topic has a step-by-step visualizer where you can type your own list and watch the arrows move.</p>`,
    goals: [
      'Insert and delete at the head, tail, any position, and on a node you already hold — in singly and doubly linked lists — without losing the chain',
      'Remove every "is it the head?" special case with a dummy (sentinel) node, and find the N-th node from the end in one pass',
      'Find the middle, detect a cycle and its starting node with fast &amp; slow pointers, and prove why Floyd\'s method works',
      'Reverse a list iteratively, recursively and in groups of k with O(1) extra space, and merge sorted lists by splicing nodes',
      'Design an O(1) LRU cache with a HashMap + doubly linked list and discuss its real-world variants',
      'Recognise from the wording of a question which list pattern it needs, and dry-run your pointer code on 0, 1 and 2-node lists'
    ],
    prereqs: `<p>DSA 1 (Java syntax, references, stack vs heap), DSA 2 (Big-O), DSA 6 (Two Pointers — the same "two indices" thinking moves onto nodes), DSA 8 (Hashing — needed for the LRU cache), and DSA 11 (Recursion — for the recursive reversal and merge).</p>`,
    hours: 14,
    langNotes: {
      java: `<p><b>Java:</b> nodes are objects on the heap and variables hold references, so <code>slow == fast</code> compares <b>identity</b> (exactly what Floyd and the intersection problem need); never use <code>.val</code> or <code>equals</code> there. Unlinked nodes are freed by the garbage collector. Following a <code>null</code> reference throws <code>NullPointerException</code>, so check <code>fast != null &amp;&amp; fast.next != null</code> in that order. Recursion is fine to about 10<sup>4</sup> frames (more with <code>-Xss</code>) and there is no tail-call removal, so prefer loops for reversal and merging on long lists. <code>java.util.LinkedList</code> is doubly linked but <code>get(i)</code> is O(N); <code>LinkedHashMap(cap, 0.75f, true)</code> + <code>removeEldestEntry</code> is a ready-made LRU, and <code>LinkedHashSet</code> keeps insertion order for LFU buckets. <code>PriorityQueue</code> is a min-heap: pass <code>(a, b) -&gt; Integer.compare(a.val, b.val)</code>, never <code>a.val - b.val</code> (it can overflow).</p>`,
      python: `<p><b>Python:</b> compare nodes with <code>is</code> / <code>is not</code> (identity); <code>==</code> would call <code>__eq__</code> if a node class defines one. Tuple assignment such as <code>curr.next, prev, curr = prev, curr, curr.next</code> evaluates the whole right side first, which makes reversal short, but the targets are assigned left to right, so order them with care. Recursion stops at about <b>1000</b> frames by default, so recursive reversal or merge fails on longer lists: use the loops (or <code>sys.setrecursionlimit</code> together with <code>threading.stack_size</code>). There is no linked list in the standard library: <code>collections.deque</code> is a linked list of blocks (O(1) at both ends, O(N) in the middle), and <code>OrderedDict</code> (<code>move_to_end</code>, <code>popitem(last=False)</code>) is a ready-made LRU. <code>heapq</code> is a min-heap only and cannot compare nodes, so push <code>(val, index, node)</code> tuples. Integers never overflow, so digit-by-digit addition is only needed because the task asks for it. <code>list.pop(0)</code> is O(N); use a <code>deque</code>.</p>`,
      js: `<p><b>JavaScript:</b> objects are compared by reference with <code>===</code>, which is what cycle and intersection checks need. There is no built-in linked list: you write a small <code>class ListNode</code>. A <code>Map</code> (and a <code>Set</code>) remembers insertion order, so delete + set moves a key to the end and <code>map.keys().next().value</code> is the oldest key: a ready-made LRU, and an LFU bucket. There is <b>no built-in heap</b>: Merge k Sorted Lists includes a small <code>MinHeap</code> class (<code>push</code>, <code>pop</code>, <code>peek</code>, <code>size</code>, with a comparator). <code>/</code> gives fractions, so use <code>Math.floor(sum / 10)</code> for a carry; <code>Number</code> is exact only to 2<sup>53</sup> (use <code>BigInt</code> past that). Reading a field of <code>null</code> throws <code>TypeError</code>. <code>array.shift()</code> and <code>unshift()</code> are O(N). Recursion is fine to about 10<sup>4</sup> frames.</p>`,
      cpp: `<p><b>C++:</b> nodes are <code>ListNode*</code> pointers, compared by address; <code>-&gt;</code> follows a pointer, and following <code>nullptr</code> is undefined behaviour (often a crash), so test <code>fast &amp;&amp; fast-&gt;next</code> first. There is no garbage collector: <code>delete</code> nodes you unlink (as the solutions do), or use <code>unique_ptr</code> in real code. A dummy node can live on the stack (<code>ListNode dummy(0, head);</code>, then use <code>&amp;dummy</code>), so there is nothing to free. <code>std::list</code> is a doubly linked list whose iterators stay valid; <code>splice</code> moves nodes in O(1), which gives an LRU or LFU with <code>unordered_map</code> of iterators. <code>priority_queue</code> is a <b>max</b>-heap: pass a "greater" comparator for a min-heap. The default stack is about 8 MB, so recursion on 10<sup>5</sup>-node lists is risky; signed overflow is undefined behaviour, so use <code>long long</code> where sums can grow.</p>`
    },
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
