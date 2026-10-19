class ListNode { constructor(val = 0, next = null) { this.val = val; this.next = next; } }
class TreeNode { constructor(val = 0, left = null, right = null) { this.val = val; this.left = left; this.right = right; } }
function _h_list(v) { let head = null, tail = null; for (const x of v) { const n = new ListNode(x); if (!head) head = n; else tail.next = n; tail = n; } return head; }
function _h_tree(v) {
  if (!v.length || v[0] === null) return null;
  const root = new TreeNode(v[0]), q = [root]; let i = 1, k = 0;
  while (k < q.length && i < v.length) {
    const n = q[k++];
    if (i < v.length && v[i] !== null) { n.left = new TreeNode(v[i]); q.push(n.left); } i++;
    if (i < v.length && v[i] !== null) { n.right = new TreeNode(v[i]); q.push(n.right); } i++;
  }
  return root;
}
function _h_plain(o) {
  if (o === null || o === undefined) return null;
  if (typeof o === 'bigint') return { __big: o.toString() };
  if (typeof o !== 'object') return o;
  if (o instanceof ListNode || (o.constructor && o.constructor.name === 'ListNode')) { const out = []; let k = 0; for (let n = o; n && k < 100000; n = n.next, k++) out.push(_h_plain(n.val)); return out; }
  if (o instanceof TreeNode || (o.constructor && o.constructor.name === 'TreeNode')) {
    const out = [], q = [o];
    for (let i = 0; i < q.length; i++) { const n = q[i]; if (!n) { out.push(null); continue; } out.push(_h_plain(n.val)); q.push(n.left || null, n.right || null); }
    while (out.length && out[out.length - 1] === null) out.pop();
    return out;
  }
  if (o instanceof Map) { const r = {}; for (const [k, v] of o) r[String(k)] = _h_plain(v); return r; }
  if (o instanceof Set || Array.isArray(o) || ArrayBuffer.isView(o)) return Array.from(o, _h_plain);
  const r = {}; for (const k of Object.keys(o)) r[k] = _h_plain(o[k]); return r;
}
function _h_json(o) { return JSON.stringify(_h_plain(o)).replace(/\{"__big":"(-?\d+)"\}/g, '$1'); }
