class H {
  static Object list(int[] v) {
    try {
      Class<?> c = Class.forName("ListNode");
      Object head = null, tail = null;
      for (int x : v) {
        Object n = c.getDeclaredConstructor().newInstance();
        set(n, "val", x);
        if (head == null) head = n; else set(tail, "next", n);
        tail = n;
      }
      return head;
    } catch (Exception e) { throw new RuntimeException(e); }
  }
  static Object tree(Integer[] v) {
    try {
      if (v.length == 0 || v[0] == null) return null;
      Class<?> c = Class.forName("TreeNode");
      java.util.ArrayDeque<Object> q = new java.util.ArrayDeque<>();
      Object root = node(c, v[0]); q.add(root);
      int i = 1;
      while (!q.isEmpty() && i < v.length) {
        Object n = q.poll();
        if (i < v.length && v[i] != null) { Object l = node(c, v[i]); set(n, "left", l); q.add(l); }
        i++;
        if (i < v.length && v[i] != null) { Object r = node(c, v[i]); set(n, "right", r); q.add(r); }
        i++;
      }
      return root;
    } catch (Exception e) { throw new RuntimeException(e); }
  }
  static Object node(Class<?> c, int x) throws Exception { Object n = c.getDeclaredConstructor().newInstance(); set(n, "val", x); return n; }
  static void set(Object o, String f, Object v) throws Exception { java.lang.reflect.Field fl = o.getClass().getDeclaredField(f); fl.setAccessible(true); fl.set(o, v); }
  static Object get(Object o, String f) { try { java.lang.reflect.Field fl = o.getClass().getDeclaredField(f); fl.setAccessible(true); return fl.get(o); } catch (Exception e) { return null; } }
  static String str(String s) {
    StringBuilder b = new StringBuilder("\"");
    for (char ch : s.toCharArray()) {
      if (ch == '"' || ch == '\\') b.append('\\').append(ch);
      else if (ch == '\n') b.append("\\n"); else if (ch == '\t') b.append("\\t"); else if (ch == '\r') b.append("\\r");
      else if (ch < 0x20) b.append(String.format("\\u%04x", (int) ch)); else b.append(ch);
    }
    return b.append('"').toString();
  }
  static String json(Object o) {
    if (o == null) return "null";
    if (o instanceof String) return str((String) o);
    if (o instanceof Character) return str(String.valueOf(o));
    if (o instanceof Double || o instanceof Float) { double d = ((Number) o).doubleValue(); return Double.isFinite(d) ? String.valueOf(d) : str(String.valueOf(d)); }
    if (o instanceof Number || o instanceof Boolean) return String.valueOf(o);
    if (o instanceof StringBuilder) return str(o.toString());
    String cn = o.getClass().getSimpleName();
    if (cn.equals("ListNode")) {
      StringBuilder b = new StringBuilder("["); int k = 0;
      for (Object n = o; n != null && k < 100000; n = get(n, "next"), k++) { if (k > 0) b.append(','); b.append(json(get(n, "val"))); }
      return b.append(']').toString();
    }
    if (cn.equals("TreeNode")) {
      java.util.List<Object> out = new java.util.ArrayList<>(); java.util.ArrayList<Object> q = new java.util.ArrayList<>(); q.add(o);
      for (int i = 0; i < q.size() && i < 200000; i++) { Object n = q.get(i); if (n == null) { out.add(null); continue; } out.add(get(n, "val")); q.add(get(n, "left")); q.add(get(n, "right")); }
      while (!out.isEmpty() && out.get(out.size() - 1) == null) out.remove(out.size() - 1);
      return json(out);
    }
    if (o.getClass().isArray()) {
      StringBuilder b = new StringBuilder("["); int n = java.lang.reflect.Array.getLength(o);
      for (int i = 0; i < n; i++) { if (i > 0) b.append(','); b.append(json(java.lang.reflect.Array.get(o, i))); }
      return b.append(']').toString();
    }
    if (o instanceof java.util.Map) {
      StringBuilder b = new StringBuilder("{"); boolean f = true;
      for (java.util.Map.Entry<?, ?> e : ((java.util.Map<?, ?>) o).entrySet()) { if (!f) b.append(','); f = false; b.append(str(String.valueOf(e.getKey()))).append(':').append(json(e.getValue())); }
      return b.append('}').toString();
    }
    if (o instanceof Iterable) {
      StringBuilder b = new StringBuilder("["); boolean f = true;
      for (Object x : (Iterable<?>) o) { if (!f) b.append(','); f = false; b.append(json(x)); }
      return b.append(']').toString();
    }
    return str(o.toString());
  }
}
