#if H_LISTNODE
public class ListNode { public int val; public ListNode next; public ListNode(int val = 0, ListNode next = null) { this.val = val; this.next = next; } }
#endif
#if H_TREENODE
public class TreeNode { public int val; public TreeNode left; public TreeNode right; public TreeNode(int val = 0, TreeNode left = null, TreeNode right = null) { this.val = val; this.left = left; this.right = right; } }
#endif
static class H {
  static object Get(object o, string f) {
    var t = o.GetType();
    var fl = t.GetField(f, System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic);
    if (fl != null) return fl.GetValue(o);
    var pr = t.GetProperty(f, System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic);
    return pr != null ? pr.GetValue(o) : null;
  }
#if H_USES_LISTNODE
  public static ListNode List(int[] v) { ListNode head = null, tail = null; foreach (var x in v) { var n = new ListNode(x); if (head == null) head = n; else tail.next = n; tail = n; } return head; }
#endif
#if H_USES_TREENODE
  public static TreeNode Tree(int?[] v) {
    if (v.Length == 0 || v[0] == null) return null;
    var root = new TreeNode(v[0].Value); var q = new System.Collections.Generic.List<TreeNode> { root }; int i = 1, k = 0;
    while (k < q.Count && i < v.Length) {
      var n = q[k++];
      if (i < v.Length && v[i] != null) { n.left = new TreeNode(v[i].Value); q.Add(n.left); } i++;
      if (i < v.Length && v[i] != null) { n.right = new TreeNode(v[i].Value); q.Add(n.right); } i++;
    }
    return root;
  }
#endif
  public static string Str(string s) {
    var b = new System.Text.StringBuilder("\"");
    foreach (char ch in s) {
      if (ch == '"' || ch == '\\') { b.Append('\\').Append(ch); }
      else if (ch == '\n') b.Append("\\n"); else if (ch == '\t') b.Append("\\t"); else if (ch == '\r') b.Append("\\r");
      else if (ch < 0x20) b.Append("\\u").Append(((int)ch).ToString("x4")); else b.Append(ch);
    }
    return b.Append('"').ToString();
  }
  public static string Json(object o) {
    if (o == null) return "null";
    if (o is string) return Str((string)o);
    if (o is char) return Str(o.ToString());
    if (o is bool) return (bool)o ? "true" : "false";
    if (o is double || o is float) { double d = System.Convert.ToDouble(o); return double.IsNaN(d) || double.IsInfinity(d) ? Str(d.ToString(System.Globalization.CultureInfo.InvariantCulture)) : d.ToString("R", System.Globalization.CultureInfo.InvariantCulture); }
    if (o is decimal) return ((decimal)o).ToString(System.Globalization.CultureInfo.InvariantCulture);
    if (o is sbyte || o is byte || o is short || o is ushort || o is int || o is uint || o is long || o is ulong) return System.Convert.ToString(o, System.Globalization.CultureInfo.InvariantCulture);
    if (o is System.Numerics.BigInteger) return o.ToString();
    if (o is System.Text.StringBuilder) return Str(o.ToString());
    string cn = o.GetType().Name;
    if (cn == "ListNode") {
      var b = new System.Text.StringBuilder("["); int k = 0;
      for (object n = o; n != null && k < 100000; n = Get(n, "next"), k++) { if (k > 0) b.Append(','); b.Append(Json(Get(n, "val"))); }
      return b.Append(']').ToString();
    }
    if (cn == "TreeNode") {
      var outp = new System.Collections.Generic.List<object>(); var q = new System.Collections.Generic.List<object> { o };
      for (int i = 0; i < q.Count && i < 200000; i++) { object n = q[i]; if (n == null) { outp.Add(null); continue; } outp.Add(Get(n, "val")); q.Add(Get(n, "left")); q.Add(Get(n, "right")); }
      while (outp.Count > 0 && outp[outp.Count - 1] == null) outp.RemoveAt(outp.Count - 1);
      return Json(outp);
    }
    if (o is System.Collections.IDictionary) {
      var b = new System.Text.StringBuilder("{"); bool f = true;
      foreach (System.Collections.DictionaryEntry e in (System.Collections.IDictionary)o) { if (!f) b.Append(','); f = false; b.Append(Str(e.Key == null ? "null" : e.Key.ToString())).Append(':').Append(Json(e.Value)); }
      return b.Append('}').ToString();
    }
    if (o is System.Collections.IEnumerable) {
      var b = new System.Text.StringBuilder("["); bool f = true;
      foreach (object x in (System.Collections.IEnumerable)o) { if (!f) b.Append(','); f = false; b.Append(Json(x)); }
      return b.Append(']').ToString();
    }
    if (o is System.Runtime.CompilerServices.ITuple) {
      var t = (System.Runtime.CompilerServices.ITuple)o; var b = new System.Text.StringBuilder("[");
      for (int i = 0; i < t.Length; i++) { if (i > 0) b.Append(','); b.Append(Json(t[i])); }
      return b.Append(']').ToString();
    }
    return Str(o.ToString());
  }
}
