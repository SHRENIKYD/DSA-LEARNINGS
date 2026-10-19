import json as _h_jsonmod, sys as _h_sys
class _HNode:
    pass
def _h_cls(name):
    return globals().get(name)
def _h_list(v):
    C = _h_cls('ListNode')
    head = tail = None
    for x in v:
        n = C(x)
        if head is None:
            head = n
        else:
            tail.next = n
        tail = n
    return head
def _h_tree(v):
    C = _h_cls('TreeNode')
    if not v or v[0] is None:
        return None
    root = C(v[0]); q = [root]; i = 1; k = 0
    while k < len(q) and i < len(v):
        n = q[k]; k += 1
        if i < len(v) and v[i] is not None:
            n.left = C(v[i]); q.append(n.left)
        i += 1
        if i < len(v) and v[i] is not None:
            n.right = C(v[i]); q.append(n.right)
        i += 1
    return root
def _h_void(x):
    return None
def _h_plain(o):
    t = type(o).__name__
    if o is None or isinstance(o, (bool, int, float, str)):
        return o
    if t == 'ListNode':
        out = []; k = 0
        while o is not None and k < 100000:
            out.append(_h_plain(o.val)); o = o.next; k += 1
        return out
    if t == 'TreeNode':
        out = []; q = [o]; i = 0
        while i < len(q):
            n = q[i]; i += 1
            if n is None:
                out.append(None); continue
            out.append(_h_plain(n.val)); q.append(n.left); q.append(n.right)
        while out and out[-1] is None:
            out.pop()
        return out
    if isinstance(o, dict):
        return {str(k): _h_plain(v) for k, v in o.items()}
    if isinstance(o, (set, frozenset)):
        return sorted((_h_plain(x) for x in o), key=lambda x: _h_jsonmod.dumps(x))
    if hasattr(o, '__iter__'):
        return [_h_plain(x) for x in o]
    return str(o)
def _h_json(o):
    return _h_jsonmod.dumps(_h_plain(o), separators=(',', ':'), ensure_ascii=False)
if 'ListNode' not in globals():
    class ListNode:
        def __init__(self, val=0, next=None):
            self.val = val
            self.next = next
if 'TreeNode' not in globals():
    class TreeNode:
        def __init__(self, val=0, left=None, right=None):
            self.val = val
            self.left = left
            self.right = right
