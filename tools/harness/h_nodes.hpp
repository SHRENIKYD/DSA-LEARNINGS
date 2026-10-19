#if H_USES_LISTNODE
static ListNode* _h_list(vector<int> v) { ListNode* h = nullptr; ListNode* t = nullptr; for (int x : v) { ListNode* n = new ListNode(x); if (!h) h = n; else t->next = n; t = n; } return h; }
static string _h_json(ListNode* n) { string o = "["; int k = 0; for (; n && k < 100000; n = n->next, k++) { if (k) o += ","; o += to_string(n->val); } return o + "]"; }
#endif
#if H_USES_TREENODE
static TreeNode* _h_tree(vector<int> v) {
  if (v.empty() || v[0] == INT_MIN) return nullptr;
  TreeNode* root = new TreeNode(v[0]); vector<TreeNode*> q{root}; size_t i = 1, k = 0;
  while (k < q.size() && i < v.size()) {
    TreeNode* n = q[k++];
    if (i < v.size() && v[i] != INT_MIN) { n->left = new TreeNode(v[i]); q.push_back(n->left); } i++;
    if (i < v.size() && v[i] != INT_MIN) { n->right = new TreeNode(v[i]); q.push_back(n->right); } i++;
  }
  return root;
}
static string _h_json(TreeNode* r) {
  vector<string> out; vector<TreeNode*> q{r};
  for (size_t i = 0; i < q.size(); i++) { TreeNode* n = q[i]; if (!n) { out.push_back("null"); continue; } out.push_back(to_string(n->val)); q.push_back(n->left); q.push_back(n->right); }
  while (!out.empty() && out.back() == "null") out.pop_back();
  string o = "["; for (size_t i = 0; i < out.size(); i++) { if (i) o += ","; o += out[i]; } return o + "]";
}
#endif
