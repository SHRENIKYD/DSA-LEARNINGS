#if H_LISTNODE
struct ListNode { int val; ListNode* next; ListNode() : val(0), next(nullptr) {} ListNode(int x) : val(x), next(nullptr) {} ListNode(int x, ListNode* n) : val(x), next(n) {} };
#endif
#if H_TREENODE
struct TreeNode { int val; TreeNode* left; TreeNode* right; TreeNode() : val(0), left(nullptr), right(nullptr) {} TreeNode(int x) : val(x), left(nullptr), right(nullptr) {} TreeNode(int x, TreeNode* l, TreeNode* r) : val(x), left(l), right(r) {} };
#endif
static string _h_str(const string& s) {
  string o = "\"";
  for (unsigned char c : s) {
    if (c == '"' || c == '\\') { o += '\\'; o += (char)c; }
    else if (c == '\n') o += "\\n"; else if (c == '\t') o += "\\t"; else if (c == '\r') o += "\\r";
    else if (c < 0x20) { char b[8]; snprintf(b, sizeof b, "\\u%04x", c); o += b; } else o += (char)c;
  }
  return o + "\"";
}
static string _h_json(int v) { return to_string(v); }
static string _h_json(long v) { return to_string(v); }
static string _h_json(long long v) { return to_string(v); }
static string _h_json(unsigned v) { return to_string(v); }
static string _h_json(unsigned long v) { return to_string(v); }
static string _h_json(unsigned long long v) { return to_string(v); }
static string _h_json(bool v) { return v ? "true" : "false"; }
static string _h_json(double v) { if (!isfinite(v)) return _h_str(to_string(v)); ostringstream o; o << setprecision(17) << v; return o.str(); }
static string _h_json(float v) { return _h_json((double)v); }
static string _h_json(char v) { return _h_str(string(1, v)); }
static string _h_json(const string& v) { return _h_str(v); }
static string _h_json(const char* v) { return _h_str(v); }
template <class T> static string _h_json(const vector<T>& v);
template <class A, class B> static string _h_json(const pair<A, B>& p);
template <class T> static string _h_json(const set<T>& v);
template <class T> static string _h_json(const unordered_set<T>& v);
template <class K, class V> static string _h_json(const map<K, V>& m);
template <class K, class V> static string _h_json(const unordered_map<K, V>& m);
template <class T> static string _h_seq(const T& v) { string o = "["; bool f = true; for (const auto& x : v) { if (!f) o += ","; f = false; o += _h_json(x); } return o + "]"; }
template <class T> static string _h_json(const vector<T>& v) { return _h_seq(v); }
static string _h_json(const vector<bool>& v) { string o = "["; for (size_t i = 0; i < v.size(); i++) { if (i) o += ","; o += v[i] ? "true" : "false"; } return o + "]"; }
template <class A, class B> static string _h_json(const pair<A, B>& p) { return "[" + _h_json(p.first) + "," + _h_json(p.second) + "]"; }
template <class T> static string _h_json(const set<T>& v) { return _h_seq(v); }
template <class T> static string _h_json(const unordered_set<T>& v) { vector<string> parts; for (const auto& x : v) parts.push_back(_h_json(x)); sort(parts.begin(), parts.end()); string o = "["; for (size_t i = 0; i < parts.size(); i++) { if (i) o += ","; o += parts[i]; } return o + "]"; }
template <class K> static string _h_key(const K& k) { string s = _h_json(k); return s.size() && s[0] == '"' ? s : _h_str(s); }
template <class K, class V> static string _h_json(const map<K, V>& m) { string o = "{"; bool f = true; for (const auto& [k, v] : m) { if (!f) o += ","; f = false; o += _h_key(k) + ":" + _h_json(v); } return o + "}"; }
template <class K, class V> static string _h_json(const unordered_map<K, V>& m) { map<string, string> s; for (const auto& [k, v] : m) s[_h_key(k)] = _h_json(v); string o = "{"; bool f = true; for (const auto& [k, v] : s) { if (!f) o += ","; f = false; o += k + ":" + v; } return o + "}"; }
