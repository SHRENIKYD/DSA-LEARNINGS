(function () {
var topics = [], practice = [], quiz = [], interview = [];
// ---- tiny helpers ----
function bx(id, label, x, y, w) { return { id: id, label: label, x: x, y: y, shape: 'box', w: w || 16 }; }
function gr(label, nodes, edges, hl, ehl, tags, h) { return { type: 'graph', label: label, directed: true, height: h || 50, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} }; }
function nums(input, def, max) {
  var s = String(input == null ? def : input).trim();
  if (!s) s = def;
  var v = s.split(/[\s,]+/).filter(Boolean).map(Number);
  if (v.some(function (x) { return !isFinite(x) || x < 0; })) throw new Error('Type non-negative numbers separated by commas, e.g. ' + def);
  return v.slice(0, max || 12);
}
function sum(a) { return a.reduce(function (s, x) { return s + x; }, 0); }
// mk builds a tested Python problem in one call
function mk(o) {
  return {
    title: o.title, level: o.level, tags: o.tags, companies: o.companies || ['Anthropic', 'OpenAI', 'Google'],
    statement: o.statement, constraints: o.constraints, example: o.example,
    brute: { why: o.bruteWhy, code: o.bruteCode },
    mcq: o.mcq, hints: o.hints,
    solution: { approach: o.approach, code: o.code, alt: o.alt, complexity: o.complexity, followUps: o.followUps || ['How would you log this decision so you can debug it later?'] },
    tests: o.tests
  };
}

/* =====================================================================
   TOPIC 1 — Context as an attention budget; context rot; lost in the middle
   ===================================================================== */
topics.push({
  title: 'Context Is an Attention Budget: Context Rot and Lost-in-the-Middle',
  analogy: `<p>Think of a <b>chef with one small counter</b>. Everything the chef might need (recipe card, ingredients, tools, yesterday's notes) has to sit on that counter to be used. Pile on more and the chef does not get smarter; they start grabbing the wrong jar. The best chefs keep only what this dish needs on the counter and leave the rest in the pantry, a step away.</p>`,
  explain: `<p><b>Prompt engineering</b> asks "how do I word the instruction?". <b>Context engineering</b> asks a bigger question: <i>of everything I could show the model on this call, which tokens should actually be there, in what order, and in what form?</i> Anthropic's engineering team describes it as curating "the smallest possible set of high-signal tokens" for the outcome you want.</p>
  <p>Everything the model sees on one call shares <b>one context window</b>:</p>
  ${H.table(['Component', 'Who controls it', 'Typical size'], [['System prompt / instructions', 'you (static)', '0.5k–5k'], ['Tool definitions', 'you (static)', '0.2k–1k per tool'], ['Few-shot examples', 'you', '0.5k–3k'], ['Retrieved documents (RAG)', 'your retriever', '2k–50k'], ['Conversation history', 'grows every turn', 'unbounded!'], ['Tool results', 'the world', 'can be huge (logs, files)'], ['Memory / notes', 'agent or app', '0.2k–2k'], ['Reserved output + thinking', 'you (max tokens)', '1k–32k']])}
  <p><b>Why a budget, not a bucket?</b> A transformer compares every token with every other token (attention). As the context grows, each token's share of attention is spread thinner, and models were trained mostly on shorter sequences. So quality degrades <i>gradually</i>, long before the hard limit. This gradual decline in recall as context fills is called <b>context rot</b>.</p>
  <p><b>Lost in the middle</b> (Liu et al., 2023): in long contexts many models recall facts at the <b>start</b> and <b>end</b> well, but miss facts buried in the <b>middle</b>. Newer models are much better, but the U-shape still shows up on hard, multi-fact tasks. Practical rules: put instructions at the top, the user's question at the bottom (right after long documents), and the most relevant documents at the edges, not in the middle.</p>
  <p><b>The core rule:</b> every token must earn its place. More context is a cost (money, latency, attention), not a free win.</p>`,
  clues: ['"we gave it the whole repo / all the docs and answers got worse" → context rot, curate instead of dump', '"it ignores the instruction from the start of a long chat" → attention spread thin, restate or compact', '"the answer was in document 14 of 30 but the model missed it" → lost in the middle, reorder or rerank', '"1M-token window, so why not paste everything?" → bigger window ≠ better recall; cost and latency grow too', '"how would you decide what goes in the prompt?" → context engineering as a budget problem'],
  code: { lang: 'python', title: 'Context-rot toy simulator (runnable)', run: true, code: `# Toy model of "lost in the middle" + context rot.
# Recall depends on (a) how full the window is and (b) distance from the edges.
def recall(position, n_docs, fill_ratio):
    edge = min(position, n_docs - 1 - position)        # 0 = at an edge
    middle_penalty = 8 * edge / max(1, n_docs // 2)    # U-shape: worst in the middle
    rot_penalty = 30 * fill_ratio                      # fuller window -> lower recall
    return round(max(0.0, 98 - middle_penalty - rot_penalty), 1)

for fill in (0.1, 0.5, 0.9):
    row = [recall(p, 9, fill) for p in range(9)]
    print("fill", fill, row)
# The middle positions are always lowest, and every number drops as the window fills.` },
  viz: {
    title: 'Context rot: recall by position as the window fills',
    input: '10, 50, 90', inputLabel: 'window fill % values (e.g. 10, 50, 90)',
    gen: function (input) {
      var fills = nums(input, '10, 50, 90', 5), n = 9, frames = [];
      frames.push({ narr: 'We hide one fact at each of <b>9 positions</b> in a long prompt and ask the model for it. Position 0 is the very start, position 8 is right before the question.', parts: [{ type: 'array', label: 'positions', values: [0, 1, 2, 3, 4, 5, 6, 7, 8], hl: { 0: 'ok', 8: 'ok', 4: 'bad' } }] });
      fills.forEach(function (fill) {
        var f = Math.min(100, fill) / 100, vals = [];
        for (var p = 0; p < n; p++) { var e = Math.min(p, n - 1 - p); vals.push(Math.round(Math.max(0, 98 - 8 * e / 4 - 30 * f))); }
        var hl = {}; hl[4] = 'bad'; hl[0] = 'ok'; hl[8] = 'ok';
        frames.push({ narr: 'Window <b>' + Math.round(f * 100) + '% full</b>. Edges score ' + vals[0] + '%, the middle only ' + vals[4] + '%. The U-shape is lost-in-the-middle; the whole curve sinking is context rot.', parts: [{ type: 'bars', label: 'recall % by position', values: vals, hl: hl }, { type: 'vars', vals: { fill: Math.round(f * 100) + '%', edge: vals[0], middle: vals[4] }, hl: { middle: 'cur' } }] });
      });
      frames.push({ narr: '<b>Fixes:</b> keep the window less full (curate, compact, retrieve just in time) and put the most important content at the <b>edges</b>: instructions first, question last, best documents at the ends.', parts: [{ type: 'text', html: '<p>Less is more: a 20%-full window of relevant tokens beats a 90%-full window of maybe-relevant ones.</p>' }] });
      return frames;
    }
  },
  examples: [
    { title: 'Dumping the whole wiki', html: `<p>A support bot was given all 400 help pages (180k tokens) every turn. Accuracy on a 200-question eval: <b>71%</b>, latency 9 s, cost $0.55 per question. After switching to top-5 retrieved pages (6k tokens): <b>86%</b>, 1.8 s, $0.03. Fewer, better tokens won on every axis.</p>` },
    { title: 'Reorder for the edges', html: `<p>Five retrieved chunks with relevance 0.91, 0.88, 0.62, 0.55, 0.40. Instead of putting them in rank order (weakest at the end, next to the question), place them as ${H.arr(['0.91', '0.62', '0.40', '0.55', '0.88'], { label: 'final order', hl: { 0: 'g', 4: 'g', 2: 'r' } })} so the two strongest sit at the two edges and the weakest is buried in the middle.</p>` },
    { title: 'Instruction drift in a long chat', html: `<p>Turn 1 system prompt: "Always answer in Spanish." By turn 60 (90k tokens of history) the model drifts into English. The rule is still there, but it is a tiny fraction of the context. Fixes: compact the history, or re-state critical rules near the end of the context.</p>` },
    { title: 'Needle-in-a-haystack is not enough', html: `<p>A model scores 99% on "find the one planted sentence" tests at 200k tokens, yet fails a task that needs <b>combining</b> five facts spread across the same context. Single-needle retrieval is easy; reasoning across many scattered facts is where rot shows.</p>` }
  ],
  deepDive: `<p><b>Why does rot happen?</b> Three causes stack. (1) <b>Attention dilution</b>: softmax spreads probability mass over n tokens; distractors that look similar to the answer steal it. (2) <b>Training distribution</b>: most training sequences are short, and long-context ability is added later with position-interpolation tricks (e.g. RoPE scaling), so very long positions are less practised. (3) <b>Distractors</b>: research such as Chroma's 2025 "Context Rot" report found that semantically similar but wrong passages hurt more than random filler, and that performance falls with input length even on simple tasks.</p>
  <p><b>Effective vs advertised window.</b> Benchmarks like RULER measure the length at which a model still meets a quality bar; it is often well below the advertised maximum. Treat the advertised window as a hard ceiling, and your own eval as the real limit.</p>
  <p><b>Placement rules that hold up:</b> long documents first, question last (Anthropic's long-context tips report up to ~30% better answers on complex multi-document inputs this way); wrap documents in tags with metadata; ask the model to quote relevant passages before answering, which turns a needle hunt into an explicit step.</p>
  <p><b>Cost side.</b> Input tokens are billed on every call, and attention cost grows with length, so time-to-first-token rises with context. A curated context is cheaper, faster and usually more accurate at the same time; there is rarely a trade-off to agonise over.</p>`,
  aiEra: `<p><b>What changed:</b> windows grew from 4k (2022) to 200k–1M+ tokens, so the bottleneck moved from "will it fit?" to "will the model use it well?". Agents made it urgent: an agent loop appends tool results every step, so its context fills by itself unless you manage it. That is why "context engineering" became the name for the job around 2025.</p>
  <p><b>Working with AI:</b> when an agent gets worse late in a session, suspect the context before the model: print token counts per component, look for stale tool output and duplicated files. <b>What you still own:</b> deciding what is high-signal for your task, and proving it with an eval. No model can tell you which of your documents are the important ones for your users.</p>`,
  problems: [mk({
    title: 'Place the Best Documents at the Edges', level: 'Easy', tags: ['lost in the middle', 'ordering'],
    statement: `<p>You have retrieved documents with relevance <code>scores</code> (index i is document i). To fight lost-in-the-middle, return the document indices in prompt order so that the best document is <b>first</b>, the second best is <b>last</b>, the third best is <b>second</b>, the fourth best is <b>second-to-last</b>, and so on, alternating inward. Sort by score descending; equal scores keep the lower index first.</p>`,
    constraints: `0 ≤ len(scores) ≤ 10<sup>4</sup>; scores are integers.`,
    example: `<p>scores = [5, 9, 1, 7] → rank order 1 (9), 3 (7), 0 (5), 2 (1). Front gets 1 then 0; back gets 3 then 2 (filling inward). Result ${H.c('g', '[1, 0, 2, 3]')}: best first, second best last, weakest in the middle.</p>`,
    bruteWhy: `<p>Try every permutation and score it by "sum of relevance times distance-from-middle". Correct in spirit but n! orderings; the alternating rule gives the same shape directly.</p>`,
    bruteCode: `from itertools import permutations

def edge_score(order, scores):
    n = len(order)
    return sum(scores[d] * abs(i - (n - 1) / 2) for i, d in enumerate(order))

def order_brute(scores):
    best = max(permutations(range(len(scores))), key=lambda o: edge_score(o, scores), default=())
    return list(best)

print(order_brute([5, 9, 1, 7]))`,
    mcq: { q: 'Where should the weakest retrieved chunk go?', options: ['Right before the question', 'In the middle of the list', 'At the very top', 'Repeated twice'], answer: 1, explain: 'The middle is where recall is weakest anyway, so it costs least to put the weakest chunk there.' },
    hints: ['<p>Hint 1: first sort the indices by score, highest first, keeping ties in index order.</p>', '<p>Hint 2: deal the sorted indices like cards into two piles: even ranks to a front pile, odd ranks to a back pile.</p>', '<p>Hint 3: the answer is the front pile followed by the back pile reversed. Empty input gives an empty list.</p>'],
    approach: `<p>Sort indices by (−score, index). Walk the ranked list: rank 0, 2, 4… append to <code>front</code>; rank 1, 3, 5… append to <code>back</code>. Return <code>front + reversed(back)</code>, so the back pile's first element (second best) ends up last.</p>`,
    code: `def order_for_edges(scores):
    # Rank indices: highest score first, lower index wins ties.
    ranked = sorted(range(len(scores)), key=lambda i: (-scores[i], i))
    front, back = [], []
    for rank, idx in enumerate(ranked):
        if rank % 2 == 0:
            front.append(idx)      # best, 3rd best, 5th best... fill from the top
        else:
            back.append(idx)       # 2nd best, 4th best... fill from the bottom
    # back[0] (2nd best) must be the LAST item, so reverse the back pile.
    return front + back[::-1]`, alt: [
      { lang: 'java', code: `class Solution {
    public int[] orderForEdges(int[] scores) {
        int n = scores.length;
        Integer[] ranked = new Integer[n];
        for (int i = 0; i < n; i++) ranked[i] = i;
        // Highest score first, lower index wins ties.
        Arrays.sort(ranked, (x, y) -> scores[x] != scores[y] ? Integer.compare(scores[y], scores[x]) : Integer.compare(x, y));
        List<Integer> front = new ArrayList<>(), back = new ArrayList<>();
        for (int rank = 0; rank < n; rank++) {
            if (rank % 2 == 0) front.add(ranked[rank]);   // best, 3rd best... fill from the top
            else back.add(ranked[rank]);                  // 2nd best, 4th best... fill from the bottom
        }
        int[] out = new int[n];
        int k = 0;
        for (int idx : front) out[k++] = idx;
        for (int i = back.size() - 1; i >= 0; i--) out[k++] = back.get(i);   // back pile reversed
        return out;
    }
}` },
      { lang: 'js', code: `function orderForEdges(scores) {
  // Highest score first, lower index wins ties.
  const ranked = scores.map((_, i) => i).sort((x, y) => scores[y] - scores[x] || x - y);
  const front = [], back = [];
  ranked.forEach((idx, rank) => {
    if (rank % 2 === 0) front.push(idx);   // best, 3rd best... fill from the top
    else back.push(idx);                   // 2nd best, 4th best... fill from the bottom
  });
  return front.concat(back.reverse());     // 2nd best ends up last
}` },
      { lang: 'cpp', code: `class Solution {
public:
    vector<int> orderForEdges(vector<int>& scores) {
        int n = scores.size();
        vector<int> ranked(n);
        for (int i = 0; i < n; i++) ranked[i] = i;
        // Highest score first, lower index wins ties.
        sort(ranked.begin(), ranked.end(), [&](int x, int y) {
            return scores[x] != scores[y] ? scores[x] > scores[y] : x < y;
        });
        vector<int> front, back;
        for (int rank = 0; rank < n; rank++) {
            if (rank % 2 == 0) front.push_back(ranked[rank]);
            else back.push_back(ranked[rank]);
        }
        front.insert(front.end(), back.rbegin(), back.rend());   // back pile reversed
        return front;
    }
};` },
      { lang: 'csharp', code: `public class Solution {
    public int[] OrderForEdges(int[] scores) {
        int n = scores.Length;
        int[] ranked = new int[n];
        for (int i = 0; i < n; i++) ranked[i] = i;
        // Highest score first, lower index wins ties (a total order, so the unstable sort is safe).
        Array.Sort(ranked, (x, y) => scores[x] != scores[y] ? scores[y].CompareTo(scores[x]) : x.CompareTo(y));
        var front = new List<int>();
        var back = new List<int>();
        for (int rank = 0; rank < n; rank++) {
            if (rank % 2 == 0) front.Add(ranked[rank]);
            else back.Add(ranked[rank]);
        }
        back.Reverse();
        front.AddRange(back);
        return front.ToArray();
    }
}` }
    ],
    complexity: `<p>O(n log n) for the sort, O(n) extra space.</p>`,
    followUps: ['Would you still do this with a model that shows no U-shape on your eval?', 'How does this interact with citations that refer to document numbers?'],
    tests: { sig: 'int[] -> int[]', fn: 'orderForEdges', cases: [[[[]], []], [[[4]], [0]], [[[1, 2]], [1, 0]], [[[5, 9, 1, 7]], [1, 0, 2, 3]], [[[3, 3, 3]], [0, 2, 1]], [[[10, 20, 30, 40, 50]], [4, 2, 0, 1, 3]], [[[1, 2, 3, 4, 5, 6]], [5, 3, 1, 0, 2, 4]]] }
  })]
});

/* =====================================================================
   TOPIC 2 — Token budgets per component
   ===================================================================== */
topics.push({
  title: 'Token Budgets per Component: Planning the Window',
  analogy: `<p>A <b>household budget</b>: rent and bills come off the top (fixed), you set aside savings (reserved output), and only what is left goes to groceries and fun (retrieved documents and history). If you spend first and budget later, the rent bounces. Context works the same way.</p>`,
  explain: `<p>A <b>token budget</b> splits the window into planned slices before any request is built. Start from the hard limit, subtract what is fixed, and hand out the rest by priority.</p>
  <ol><li><b>Reserve output first</b>: <code>max_tokens</code> (and any thinking budget) comes out of the same window on most APIs. If input + max output exceeds the window, the call fails or the answer is cut.</li><li><b>Fixed costs</b>: system prompt and tool definitions. These are paid on every call.</li><li><b>Must-haves</b>: the current user message, the last few turns, active task notes.</li><li><b>Flexible fill</b>: retrieved documents, older history, examples, in priority order, until the budget is used.</li></ol>
  ${H.table(['Slice (200k window, coding agent)', 'Budget', 'Policy when over'], [['Output + thinking reserve', '32k', 'never cut'], ['System prompt + tools', '12k', 'trim tools via progressive disclosure'], ['CLAUDE.md / AGENTS.md', '3k', 'keep short, link to docs'], ['Recent turns (last 6)', '20k', 'never cut'], ['Older history', '≤ 60k', 'compact into a summary'], ['Tool results', '≤ 50k', 'clear oldest, keep last few'], ['Retrieved files', 'rest (~23k)', 'drop lowest-ranked']])}
  <p><b>Practical target:</b> many teams aim to keep normal operation well under the limit (for example 50–70% full), leaving headroom for one huge tool result and for quality. Count real tokens with the provider's token-counting endpoint or tokenizer; "4 characters per token" is only an English-text rule of thumb, and code, JSON and non-English text differ.</p>`,
  clues: ['"prompt too long" / "context length exceeded" errors in production → no budget, no reserve for output', '"the answer gets cut off mid-sentence" → output reserve too small', '"what do you drop first when the window is full?" → priority order per component', '"cost per request keeps growing" → history and tool results have no cap', '"we added 40 tools and quality dropped" → fixed costs ate the budget'],
  code: { lang: 'python', title: 'Priority-ordered token allocator (runnable)', run: true, code: `def allocate(window, reserve_output, components):
    """components: list of (name, tokens, required) in priority order.
    Required ones always go in; others are added greedily if they fit."""
    left = window - reserve_output
    plan, dropped = [], []
    for name, tokens, required in components:
        if required or tokens <= left:
            plan.append((name, tokens))
            left -= tokens
        else:
            dropped.append(name)
    if left < 0:
        raise ValueError("required parts alone exceed the budget")
    return plan, dropped, left

parts = [("system", 2500, True), ("tools", 6000, True), ("question", 300, True),
         ("recent turns", 9000, True), ("doc A", 12000, False),
         ("doc B", 15000, False), ("old history", 20000, False), ("doc C", 4000, False)]
plan, dropped, left = allocate(64000, 8000, parts)
print("kept:", plan)
print("dropped:", dropped, "| tokens left:", left)` },
  viz: {
    title: 'Filling a 64k window by priority',
    input: '64, 8, 2, 6, 9, 12, 15, 20, 4', inputLabel: 'window k, output reserve k, then component sizes k in priority order',
    gen: function (input) {
      var v = nums(input, '64, 8, 2, 6, 9, 12, 15, 20, 4', 12);
      if (v.length < 3) throw new Error('Need window, reserve and at least one component, e.g. 64, 8, 2, 6, 9');
      var win = v[0], res = v[1], comps = v.slice(2), left = win - res, kept = [], frames = [];
      frames.push({ narr: 'Window <b>' + win + 'k</b>. First we set aside <b>' + res + 'k</b> for the answer, because output shares the window. ' + left + 'k left for input.', parts: [{ type: 'vars', vals: { window: win + 'k', reserve: res + 'k', left: left + 'k' }, hl: { reserve: 'cur' } }] });
      comps.forEach(function (c, i) {
        var fits = c <= left;
        if (fits) { left -= c; kept.push(c); }
        var hl = {}; hl[i] = fits ? 'ok' : 'bad';
        frames.push({ narr: 'Component #' + (i + 1) + ' needs <b>' + c + 'k</b>. ' + (fits ? 'It fits, so it goes in. ' : 'It does not fit, so we <b>drop</b> it and try the next (smaller) one. ') + left + 'k left.', parts: [{ type: 'bars', label: 'component sizes (k tokens), priority order', values: comps.slice(), hl: hl }, { type: 'vars', vals: { left: left + 'k', kept: kept.length }, hl: { left: 'cur' } }] });
      });
      frames.push({ narr: 'Done: kept ' + kept.length + ' of ' + comps.length + ' components, ' + left + 'k unused headroom. Priority order decided who lost, not luck.', parts: [{ type: 'array', label: 'kept sizes', values: kept.length ? kept : ['none'] }] });
      return frames;
    }
  },
  examples: [
    { title: 'The forgotten output reserve', html: `<p>Window 128k, input assembled to 126k, <code>max_tokens</code> 4k. The provider rejects the request (or the reply stops after 2k tokens). Budget input as <b>window − max output</b>, here 124k.</p>` },
    { title: 'Tools as a fixed cost', html: `<p>An agent with 60 MCP tools at ~400 tokens each spends <b>24k tokens</b> on tool definitions before the user types a word. Cutting to 12 core tools plus a search tool that loads others on demand saves ~19k per call; at 50k calls per day that is ~950M input tokens a day.</p>` },
    { title: 'Budget as percentages', html: `${H.table(['Slice', '% of 32k input budget', 'Tokens'], [['Instructions', '10%', '3.2k'], ['History', '35%', '11.2k'], ['Retrieved docs', '45%', '14.4k'], ['Notes / memory', '10%', '3.2k']])}<p>Percentages make the plan portable across models with different windows.</p>` },
    { title: 'Counting, not guessing', html: `<p>A JSON tool result of 20,000 characters was estimated at 5k tokens (chars ÷ 4) but measured at 7.9k, because braces, quotes and IDs tokenize poorly. Always budget with real counts on real payloads.</p>` }
  ],
  deepDive: `<p><b>Static vs dynamic slices.</b> Static parts (system prompt, tools) should be measured once at build time and alarmed on in CI: a prompt PR that adds 3k tokens is a cost regression. Dynamic parts (history, tool output, retrieval) need runtime caps and policies.</p>
  <p><b>Greedy vs optimal.</b> Filling by priority is greedy; when items have sizes and value scores, the best subset is a 0/1 knapsack problem (O(n·B) with dynamic programming). In practice greedy-by-rank with a "skip if it doesn't fit, try the next" rule is close enough, and you can split a large document into chunks to avoid the all-or-nothing problem.</p>
  <p><b>Truncation side matters.</b> Never truncate the middle of a JSON tool result or a code file blindly: the model sees broken syntax. Truncate whole items, or keep head and tail with an explicit marker like <code>[... 1,240 lines omitted; call read_file with offset to see more]</code>, which also tells the model how to get the rest.</p>
  <p><b>Per-tenant budgets.</b> In multi-tenant apps, the budget is also a cost-control and fairness tool: cap per-request input tokens and per-user tokens per minute, and log the per-component breakdown on every call so you can see which slice grows.</p>`,
  aiEra: `<p><b>What changed:</b> APIs now expose token-counting endpoints, usage fields per response (input, cached input, output, reasoning tokens) and server-side context editing that clears old tool results automatically. Budgets can be enforced by the platform, not only in your code.</p>
  <p><b>Working with AI:</b> ask an assistant to instrument your prompt builder to log a per-component token table on every call; it is a 20-line change that pays off forever. <b>What you still own:</b> the priority order. Deciding that the user's last message beats document C, and that tool definitions must shrink before history does, is a product decision that depends on your task and your evals.</p>`,
  problems: [mk({
    title: 'Greedy Token Allocator', level: 'Easy', tags: ['token budget', 'greedy'],
    statement: `<p>The window holds <code>budget</code> tokens and you must reserve <code>reserve_output</code> for the answer. <code>sizes</code> lists optional context components in priority order. Walk them in order and include a component if it fits in what is left (otherwise skip it and keep going). Return the included indices.</p>`,
    constraints: `0 ≤ budget, reserve_output ≤ 10<sup>7</sup>; 0 ≤ len(sizes) ≤ 10<sup>5</sup>; sizes ≥ 0. If reserve_output ≥ budget nothing fits except zero-size components when exactly 0 is left; a negative remainder fits nothing.`,
    example: `<p>budget 1000, reserve 200, sizes [500, 400, 100] → 800 available. 500 fits (300 left), 400 does not, 100 fits (200 left) → ${H.c('g', '[0, 2]')}.</p>`,
    bruteWhy: `<p>Check all 2<sup>n</sup> subsets for the one that respects priority. Exponential, and priority order already tells you the decision for each item one at a time.</p>`,
    bruteCode: `def allocate_naive(budget, reserve_output, sizes):
    # Wrong-ish naive version: stops at the first item that does not fit,
    # so smaller lower-priority items are never tried.
    left, out = budget - reserve_output, []
    for i, s in enumerate(sizes):
        if s > left:
            break
        out.append(i); left -= s
    return out`,
    mcq: { q: 'An item does not fit. What should a priority allocator do next?', options: ['Stop and return what it has', 'Skip it and try the next item', 'Truncate it in the middle', 'Raise an error'], answer: 1, explain: 'A later, smaller item may still fit; skipping keeps priority but uses the space.' },
    hints: ['<p>Hint 1: the space you can use for input is budget minus the reserved output.</p>', '<p>Hint 2: one pass in priority order; keep a running "left" counter.</p>', '<p>Hint 3: include item i when sizes[i] ≤ left, then subtract. If left starts negative nothing is included.</p>'],
    approach: `<p>Compute <code>left = budget − reserve_output</code>. For each index in order, if <code>sizes[i] ≤ left</code>, append i and subtract. Otherwise skip. A negative <code>left</code> naturally includes nothing because sizes are non-negative.</p>`,
    code: `def allocate(budget, reserve_output, sizes):
    left = budget - reserve_output          # input space after reserving the answer
    chosen = []
    for i, size in enumerate(sizes):        # priority order: index 0 matters most
        if size <= left:
            chosen.append(i)
            left -= size
        # else: skip it, a smaller later item may still fit
    return chosen`, alt: [
      { lang: 'java', code: `class Solution {
    public int[] allocate(int budget, int reserveOutput, int[] sizes) {
        long left = (long) budget - reserveOutput;   // input space after reserving the answer
        List<Integer> chosen = new ArrayList<>();
        for (int i = 0; i < sizes.length; i++) {     // priority order: index 0 matters most
            if (sizes[i] <= left) {
                chosen.add(i);
                left -= sizes[i];
            }
            // else: skip it, a smaller later item may still fit
        }
        return chosen.stream().mapToInt(Integer::intValue).toArray();
    }
}` },
      { lang: 'js', code: `function allocate(budget, reserveOutput, sizes) {
  let left = budget - reserveOutput;       // input space after reserving the answer
  const chosen = [];
  sizes.forEach((size, i) => {             // priority order: index 0 matters most
    if (size <= left) {
      chosen.push(i);
      left -= size;
    }
    // else: skip it, a smaller later item may still fit
  });
  return chosen;
}` },
      { lang: 'cpp', code: `class Solution {
public:
    vector<int> allocate(int budget, int reserveOutput, vector<int>& sizes) {
        long long left = (long long)budget - reserveOutput;   // input space after reserving the answer
        vector<int> chosen;
        for (int i = 0; i < (int)sizes.size(); i++) {         // priority order: index 0 matters most
            if (sizes[i] <= left) {
                chosen.push_back(i);
                left -= sizes[i];
            }
        }
        return chosen;
    }
};` },
      { lang: 'csharp', code: `public class Solution {
    public int[] Allocate(int budget, int reserveOutput, int[] sizes) {
        long left = (long)budget - reserveOutput;   // input space after reserving the answer
        var chosen = new List<int>();
        for (int i = 0; i < sizes.Length; i++) {    // priority order: index 0 matters most
            if (sizes[i] <= left) {
                chosen.Add(i);
                left -= sizes[i];
            }
        }
        return chosen.ToArray();
    }
}` }
    ],
    complexity: `<p>O(n) time, O(n) for the output.</p>`,
    followUps: ['How would you add "required" components that must always be included?', 'When would you split a large document instead of skipping it?'],
    tests: { sig: 'int int int[] -> int[]', fn: 'allocate', cases: [[[1000, 200, [300, 400, 200]], [0, 1]], [[1000, 200, [500, 400, 100]], [0, 2]], [[100, 100, [1]], []], [[50, 100, [1]], []], [[10, 0, []], []], [[10, 0, [10, 0]], [0, 1]], [[1200, 200, [1000, 1, 1]], [0]]] }
  })]
});

/* =====================================================================
   TOPIC 3 — Just-in-time retrieval vs pre-loading
   ===================================================================== */
topics.push({
  title: 'Just-in-Time Retrieval vs Pre-Loading',
  analogy: `<p>A <b>librarian</b> does not carry the whole library to your desk. They hand you the <b>catalogue</b> (titles and shelf numbers) and fetch a book when you ask for it. Pre-loading is carrying every book over "just in case"; just-in-time is the catalogue plus a fetch.</p>`,
  explain: `<p>There are two ways to get knowledge into the window:</p>
  ${H.table(['', 'Pre-loading (up-front)', 'Just-in-time (JIT)'], [['How', 'retrieve or paste everything likely needed before the first call', 'give the model lightweight <b>references</b> (file paths, URLs, IDs, queries) plus tools to load content when needed'], ['Example', 'classic RAG: embed query → top-k chunks → prompt', 'coding agent: <code>ls</code>, <code>grep</code>, then <code>read_file</code> on 2 files'], ['Strength', 'one call, predictable latency, works with any model', 'only relevant tokens enter; always fresh; scales to huge corpora'], ['Weakness', 'wastes tokens on irrelevant chunks; stale if data changes', 'more round trips (latency); the model must be good at exploring']])}
  <p><b>References carry signal too.</b> A path like <code>tests/test_billing.py</code> or a file's size and timestamp tells the model what it is before reading it. Anthropic calls this letting the agent <i>progressively discover</i> context: each tool result informs the next step, and the agent keeps only what it needs in working memory.</p>
  <p><b>The usual answer is hybrid.</b> Pre-load the small, always-needed items (project instructions, the user's profile, the top 3 chunks), and give tools for everything else. Claude Code is the standard example: <code>CLAUDE.md</code> is loaded up front, while files are found with glob/grep and read on demand rather than through a pre-built embedding index.</p>
  <p><b>Rule of thumb:</b> pre-load when the needed knowledge is small, stable and predictable; go JIT when the corpus is large, changes often, or the task needs exploration.</p>`,
  clues: ['"the corpus is 2 GB / a whole monorepo" → JIT with search tools, not pre-loading', '"answers are out of date" → JIT reads the live source', '"latency budget is 1 second, single turn" → pre-load (RAG), no exploration loop', '"agent reads 50 files and gets confused" → better references and search, not more reading', '"should we build a vector index for our coding agent?" → grep/glob JIT often wins for code'],
  code: { lang: 'python', title: 'A just-in-time file loader (runnable)', run: true, code: `# The model first sees only an index (paths + sizes). It asks for files by keyword,
# and we load only matching ones up to a token cap.
FILES = {
    "src/auth/login.py": 900, "src/auth/tokens.py": 700,
    "src/billing/invoice.py": 1500, "docs/auth.md": 400, "README.md": 300,
}

def index_view(files):
    return [f"{p} ({t} tok)" for p, t in files.items()]

def jit_load(files, keywords, cap):
    loaded, used = [], 0
    for path, tok in files.items():
        if any(k.lower() in path.lower() for k in keywords) and used + tok <= cap:
            loaded.append(path); used += tok
    return loaded, used

print("index the model sees:", index_view(FILES))
print("pre-loading everything:", sum(FILES.values()), "tokens")
print("JIT for 'auth':", jit_load(FILES, ["auth"], 1500))` },
  viz: {
    title: 'An agent finding the right file just in time',
    gen: function () {
      var N = [bx('M', 'Agent (LLM)', 10, 25, 14), bx('G', 'glob / ls', 45, 5, 14), bx('S', 'grep', 45, 25, 12), bx('R', 'read_file', 45, 45, 14), bx('C', 'Repo (2 GB)', 82, 25, 14)];
      var E = [['M', 'G'], ['G', 'C'], ['M', 'S'], ['S', 'C'], ['M', 'R'], ['R', 'C']];
      function f(narr, hl, ehl, tags, ctx) { return { narr: narr, parts: [gr('JIT exploration', N, E, hl, ehl, tags, 55), { type: 'stack', label: 'context window (bottom = oldest)', items: ctx }] }; }
      return [
        f('Task: "fix the bug where refresh tokens never expire". The context holds only instructions and the task. <b>No files yet.</b>', { M: 'cur' }, {}, {}, ['system + CLAUDE.md (2k)', 'task (0.1k)']),
        f('The agent lists paths matching <code>**/*token*</code>. It gets back 6 paths: cheap references, about 60 tokens.', { G: 'ok' }, { 'M-G': 'ok', 'G-C': 'ok' }, { G: '6 paths' }, ['system + CLAUDE.md (2k)', 'task (0.1k)', 'paths (0.06k)']),
        f('It greps for <code>expires_at</code>: 3 matching lines with file:line. Now it knows exactly where to look.', { S: 'ok' }, { 'M-S': 'ok', 'S-C': 'ok' }, { S: '3 hits' }, ['system + CLAUDE.md (2k)', 'task (0.1k)', 'paths (0.06k)', 'grep hits (0.1k)']),
        f('It reads <b>one</b> file, <code>src/auth/tokens.py</code> (0.7k tokens). Pre-loading the repo would have cost millions of tokens and would not even fit.', { R: 'ok' }, { 'M-R': 'ok', 'R-C': 'ok' }, { R: '1 file' }, ['system + CLAUDE.md (2k)', 'task (0.1k)', 'paths (0.06k)', 'grep hits (0.1k)', 'tokens.py (0.7k)']),
        f('Total context ≈ <b>3k tokens</b>, all relevant. The price: 3 extra round trips. For an interactive coding task that trade is worth it.', { M: 'sel' }, {}, { M: '3k ctx' }, ['system + CLAUDE.md (2k)', 'task (0.1k)', 'paths (0.06k)', 'grep hits (0.1k)', 'tokens.py (0.7k)'])
      ];
    }
  },
  examples: [
    { title: 'FAQ bot: pre-load wins', html: `<p>200 short FAQ entries, 30k tokens total, rarely changed, one-shot answers needed in under 1 s. Pre-load the top 5 retrieved entries (or even all 30k with prompt caching). An exploration loop would only add latency.</p>` },
    { title: 'Coding agent: JIT wins', html: `<p>A 40k-file monorepo. A vector index goes stale on every commit and returns near-duplicate chunks. Glob + grep + read-on-demand finds the exact symbol and always sees the current code.</p>` },
    { title: 'Analytics agent: references instead of rows', html: `<p>Instead of pasting a 5M-row table, the agent sees the schema (column names, types, row count) and runs SQL. Only the 12-row aggregate result enters context. The schema is the reference; the query is the just-in-time load.</p>` },
    { title: 'Hybrid support agent', html: `${H.table(['Pre-loaded', 'Loaded on demand'], [['policy summary (1k)', 'full policy pages via search_docs'], ['customer tier + plan', 'order history via get_orders'], ['top-3 RAG chunks', 'more chunks via search tool']])}` }
  ],
  deepDive: `<p><b>Cost model.</b> Pre-load cost ≈ (tokens loaded) × (calls). JIT cost ≈ index tokens + Σ(tokens actually read) + extra round trips × (latency and the re-sent context per call). JIT wins when the fraction of the corpus actually needed is small; each JIT step re-sends the whole context, so prompt caching of the stable prefix matters a lot for JIT agents.</p>
  <p><b>Make references informative.</b> Good tool results return paths, titles, sizes, last-modified dates and a one-line snippet, so the model can pick without reading. Paginate (<code>offset</code>, <code>limit</code>) and return token-efficient formats; a tool that dumps 50k tokens defeats JIT.</p>
  <p><b>Failure modes.</b> (1) Under-exploration: the model answers from memory without reading. Fix with instructions ("read the file before editing") and evals. (2) Over-exploration: reads 40 files "to be thorough". Fix with step budgets, better search tools, or a sub-agent that explores and returns a summary. (3) Dead references: a path that no longer exists; return a clear error with suggestions.</p>
  <p><b>Agentic RAG</b> is the middle ground: retrieval exposed as a tool the model calls with its own queries, possibly several times, instead of a single pre-retrieval step.</p>`,
  aiEra: `<p><b>What changed:</b> stronger tool use made JIT practical. Coding agents (Claude Code, Codex, Gemini CLI, Cursor's agent) lean on search and read tools rather than stuffing files; MCP standardised how agents reach external data on demand.</p>
  <p><b>Working with AI:</b> when designing an agent, write the tools first as "how would a new engineer find this?" (list, search, read with pagination) and look at real traces to see what the agent loads. <b>What you still own:</b> choosing which few items are worth pre-loading, and making tool outputs compact and well-labelled. A sloppy tool that returns everything turns JIT back into pre-loading.</p>`,
  problems: [mk({
    title: 'Load Only Matching Files', level: 'Medium', tags: ['jit retrieval', 'filtering'],
    statement: `<p>Implement a just-in-time loader. Given file <code>paths</code>, their token <code>sizes</code>, a list of <code>keywords</code> and a token <code>cap</code>, walk the files in the given order and return the paths that contain <b>any</b> keyword (case-insensitive substring of the path) and still fit under the cap (cumulative size ≤ cap). A matching file that would exceed the cap is skipped; keep checking later files.</p>`,
    constraints: `0 ≤ files ≤ 10<sup>4</sup>; sizes ≥ 0; keywords may be empty (then nothing matches).`,
    example: `<p>paths [src/auth/login.py, src/billing/pay.py, docs/auth.md], sizes [300, 500, 200], keywords ["auth"], cap 400 → login.py matches (300 used), pay.py does not match, auth.md matches but 300 + 200 &gt; 400 → ${H.c('g', '["src/auth/login.py"]')}.</p>`,
    bruteWhy: `<p>Pre-load every file and let the model sort it out: 100% of the tokens enter the window, most irrelevant, and large repos do not even fit.</p>`,
    bruteCode: `def preload_all(paths, sizes, keywords, cap):
    # Ignores keywords and cap entirely: everything goes in.
    return list(paths)`,
    mcq: { q: 'Which keyword match is right for "src/Auth/Login.py" with keyword "auth"?', options: ['No match: case differs', 'Match: compare lower-cased strings', 'Match only if the file name equals "auth"', 'Depends on file size'], answer: 1, explain: 'Paths and keywords are compared case-insensitively as substrings.' },
    hints: ['<p>Hint 1: lower-case each path once and test "keyword in path" for each lower-cased keyword.</p>', '<p>Hint 2: keep a running total of tokens used; only add a file if total + size ≤ cap.</p>', '<p>Hint 3: a matching file that does not fit is skipped, not a reason to stop. Empty keywords means an empty answer.</p>'],
    approach: `<p>Lower-case the keywords once. For each file in order: if any keyword is a substring of the lower-cased path and <code>used + size ≤ cap</code>, append the original path and add its size. Otherwise move on.</p>`,
    code: `def jit_select(paths, sizes, keywords, cap):
    keys = [k.lower() for k in keywords]
    picked, used = [], 0
    for path, size in zip(paths, sizes):
        low = path.lower()
        if any(k in low for k in keys):          # relevant?
            if used + size <= cap:               # affordable?
                picked.append(path)
                used += size
            # else skip: a later, smaller match may still fit
    return picked`, alt: [
      { lang: 'java', code: `class Solution {
    public String[] jitSelect(String[] paths, int[] sizes, String[] keywords, int cap) {
        List<String> keys = new ArrayList<>();
        for (String k : keywords) keys.add(k.toLowerCase(Locale.ROOT));
        List<String> picked = new ArrayList<>();
        long used = 0;
        int n = Math.min(paths.length, sizes.length);
        for (int i = 0; i < n; i++) {
            String low = paths[i].toLowerCase(Locale.ROOT);
            boolean relevant = false;
            for (String k : keys) if (low.contains(k)) { relevant = true; break; }
            if (relevant && used + sizes[i] <= cap) {   // relevant and affordable
                picked.add(paths[i]);
                used += sizes[i];
            }
        }
        return picked.toArray(new String[0]);
    }
}` },
      { lang: 'js', code: `function jitSelect(paths, sizes, keywords, cap) {
  const keys = keywords.map((k) => k.toLowerCase());
  const picked = [];
  let used = 0;
  const n = Math.min(paths.length, sizes.length);
  for (let i = 0; i < n; i++) {
    const low = paths[i].toLowerCase();
    if (keys.some((k) => low.includes(k))) {   // relevant?
      if (used + sizes[i] <= cap) {            // affordable?
        picked.push(paths[i]);
        used += sizes[i];
      }
    }
  }
  return picked;
}` },
      { lang: 'cpp', code: `class Solution {
    static string lower(string s) {
        for (char& c : s) c = tolower((unsigned char)c);
        return s;
    }
public:
    vector<string> jitSelect(vector<string>& paths, vector<int>& sizes, vector<string>& keywords, int cap) {
        vector<string> keys;
        for (auto& k : keywords) keys.push_back(lower(k));
        vector<string> picked;
        long long used = 0;
        size_t n = min(paths.size(), sizes.size());
        for (size_t i = 0; i < n; i++) {
            string low = lower(paths[i]);
            bool relevant = false;
            for (auto& k : keys) if (low.find(k) != string::npos) { relevant = true; break; }
            if (relevant && used + sizes[i] <= cap) {   // relevant and affordable
                picked.push_back(paths[i]);
                used += sizes[i];
            }
        }
        return picked;
    }
};` },
      { lang: 'csharp', code: `public class Solution {
    public string[] JitSelect(string[] paths, int[] sizes, string[] keywords, int cap) {
        var keys = keywords.Select(k => k.ToLowerInvariant()).ToList();
        var picked = new List<string>();
        long used = 0;
        int n = Math.Min(paths.Length, sizes.Length);
        for (int i = 0; i < n; i++) {
            string low = paths[i].ToLowerInvariant();
            bool relevant = keys.Any(k => low.IndexOf(k, StringComparison.Ordinal) >= 0);
            if (relevant && used + sizes[i] <= cap) {   // relevant and affordable
                picked.Add(paths[i]);
                used += sizes[i];
            }
        }
        return picked.ToArray();
    }
}` }
    ],
    complexity: `<p>O(F × K × L) for F files, K keywords, path length L. Fine for an index of thousands of paths.</p>`,
    followUps: ['How would you rank matches (e.g. by number of keyword hits) before applying the cap?', 'What should the tool return for files that matched but did not fit?'],
    tests: { sig: 'string[] int[] string[] int -> string[]', fn: 'jitSelect', cases: [[[['src/auth/login.py', 'src/billing/pay.py', 'docs/auth.md'], [300, 500, 200], ['auth'], 1000], ['src/auth/login.py', 'docs/auth.md']], [[['src/auth/login.py', 'src/billing/pay.py', 'docs/auth.md'], [300, 500, 200], ['auth'], 400], ['src/auth/login.py']], [[['a.py'], [1], [], 10], []], [[['README.md'], [50], ['readme'], 50], ['README.md']], [[['a.py', 'b.py'], [10, 10], ['zzz'], 100], []], [[['Pay.py', 'pay_test.py', 'x.py'], [60, 30, 5], ['PAY'], 50], ['pay_test.py']], [[[], [], ['x'], 5], []]] }
  })]
});

/* =====================================================================
   TOPIC 4 — Compaction, summarisation and clearing tool results
   ===================================================================== */
topics.push({
  title: 'Compaction, Summarisation and Clearing Old Tool Results',
  analogy: `<p>A <b>long meeting</b> with a note-taker. Nobody re-reads the full transcript of the first three hours; the note-taker writes "Decisions so far: A, B. Open questions: C." and the meeting continues from that page. Tool results are like the printouts people passed around: once read and acted on, they go in the recycling bin, leaving a sticky note saying "printout was here".</p>`,
  explain: `<p>Long-running agents fill the window by themselves. Two techniques keep it under control:</p>
  <p><b>1. Compaction (summarisation).</b> When the context nears a threshold, ask the model to summarise the conversation so far, then start a fresh context with that summary plus the most recent turns. A good summary keeps: the goal, decisions made and why, current state (files changed, what is done), open bugs, and next steps. It drops: redundant tool output, dead ends already ruled out, chit-chat. Claude Code does this automatically near the limit and on <code>/compact</code>, and some model APIs now offer compaction as a server-side feature.</p>
  <p><b>2. Tool-result clearing.</b> Most of an agent's context is tool output: file contents, search results, logs. Once the agent has acted on a result from 20 steps ago, the raw output is dead weight. Replace old results with a short placeholder ("[result cleared: read src/a.py, 412 lines]") and keep only the last few in full. Anthropic calls this the lightest-touch form of compaction, and the API's <b>context editing</b> feature can do it server-side (a <code>clear_tool_uses</code> strategy with a trigger threshold and a number of recent tool uses to keep; it is a beta feature, so check the current docs for exact names).</p>
  ${H.table(['Technique', 'Loses information?', 'Cost', 'When'], [['Clear old tool results', 'raw output only (the call stays visible)', 'free', 'first line of defence, continuously'], ['Compaction / summary', 'yes, details beyond the summary', 'one extra model call', 'near a threshold (e.g. 70–90% full)'], ['Sliding window (drop oldest turns)', 'yes, abruptly', 'free', 'simple chat, low stakes'], ['External notes (next topic)', 'no, stored outside', 'tool calls', 'long tasks, across sessions']])}
  <p><b>The art of compaction is choosing what to keep.</b> Start by maximising recall (keep everything that might matter), then iterate to cut the fluff, testing on real long traces.</p>`,
  clues: ['"agent runs for hours / hundreds of steps" → compaction + tool-result clearing', '"the agent forgot a decision after the context was summarised" → summary prompt missing decisions or state', '"context full of huge file dumps from earlier" → clear old tool results', '"chat app costs grow with conversation length" → rolling summary instead of full history', '"must not lose the user\'s constraints" → pin them outside the compactable region'],
  code: { lang: 'python', title: 'Compaction + clearing policy (runnable)', run: true, code: `def clear_old_tool_results(msgs, keep_last=2, placeholder="[old tool result cleared]"):
    tool_idx = [i for i, m in enumerate(msgs) if m["role"] == "tool"]
    for i in tool_idx[:-keep_last] if keep_last else tool_idx:
        msgs[i] = {"role": "tool", "content": placeholder, "tokens": 8}
    return msgs

def compact(msgs, threshold, keep_recent, summarise):
    total = sum(m["tokens"] for m in msgs)
    if total <= threshold or len(msgs) <= keep_recent:
        return msgs
    old, recent = msgs[:-keep_recent] if keep_recent else msgs, msgs[-keep_recent:] if keep_recent else []
    summary = {"role": "user", "content": summarise(old), "tokens": 150}
    return [summary] + recent

fake_summarise = lambda old: f"SUMMARY of {len(old)} earlier messages: goal, decisions, state, next steps"
msgs = [{"role": "user", "content": "fix bug", "tokens": 50}]
for step in range(6):
    msgs.append({"role": "assistant", "content": f"call tool {step}", "tokens": 40})
    msgs.append({"role": "tool", "content": "x" * 10, "tokens": 3000})
print("before:", sum(m["tokens"] for m in msgs))
msgs = clear_old_tool_results(msgs, keep_last=2)
print("after clearing:", sum(m["tokens"] for m in msgs))
msgs = compact(msgs, threshold=5000, keep_recent=4, summarise=fake_summarise)
print("after compaction:", sum(m["tokens"] for m in msgs), "| first:", msgs[0]["content"])` },
  viz: {
    title: 'An agent context over 8 steps: clearing then compaction',
    input: '3, 5, 2, 6, 4, 7, 3, 5', inputLabel: 'tool result sizes in k tokens, one per step',
    gen: function (input) {
      var v = nums(input, '3, 5, 2, 6, 4, 7, 3, 5', 10), keep = 2, threshold = 12, ctx = [], frames = [];
      frames.push({ narr: 'Each step adds a tool result. Policy: keep the last <b>' + keep + '</b> results in full, clear older ones to a 0.1k placeholder. If the total still exceeds <b>' + threshold + 'k</b>, compact everything except the last 2 into a 1k summary.', parts: [{ type: 'vars', vals: { keep_last: keep, threshold: threshold + 'k', summary: '1k' } }] });
      v.forEach(function (s, step) {
        ctx.push({ t: 'tool', k: s });
        var tools = []; ctx.forEach(function (m, i) { if (m.t === 'tool') tools.push(i); });
        var cleared = 0;
        tools.slice(0, Math.max(0, tools.length - keep)).forEach(function (i) { if (ctx[i].k !== 0.1) { ctx[i] = { t: 'tool', k: 0.1 }; cleared++; } });
        var tot = Math.round(sum(ctx.map(function (m) { return m.k; })) * 10) / 10, note = cleared ? ' Cleared ' + cleared + ' old result(s).' : '';
        if (tot > threshold && ctx.length > 2) { ctx = [{ t: 'sum', k: 1 }].concat(ctx.slice(-2)); note += ' Still over ' + threshold + 'k, so we <b>compact</b>.'; tot = Math.round(sum(ctx.map(function (m) { return m.k; })) * 10) / 10; }
        var hl = {}; hl[ctx.length - 1] = 'ok'; ctx.forEach(function (m, i) { if (m.k === 0.1) hl[i] = 'done'; if (m.t === 'sum') hl[i] = 'sel'; });
        frames.push({ narr: 'Step ' + (step + 1) + ': new result of ' + s + 'k.' + note + ' Context now <b>' + tot + 'k</b>.', parts: [{ type: 'bars', label: 'context items (k tokens): purple = summary, faded = cleared', values: ctx.map(function (m) { return m.k; }), hl: hl }, { type: 'vars', vals: { step: step + 1, total: tot + 'k' }, hl: { total: tot > threshold ? 'bad' : 'ok' } }] });
      });
      frames.push({ narr: 'Without any policy the context would be <b>' + sum(v) + 'k</b>. Clearing is free and loses only raw output; compaction costs a model call and loses detail, so it runs less often.', parts: [{ type: 'text', html: '<p>Order of defence: clear tool results → compact → hand off to a fresh context with notes.</p>' }] });
      return frames;
    }
  },
  examples: [
    { title: 'A good compaction summary', html: `<pre>GOAL: make /export endpoint stream CSV.
DONE: added stream_rows() in export.py; tests in test_export.py pass (12/12).
DECISIONS: use generator, not temp file (memory limit 512 MB).
RULED OUT: pandas.to_csv (loads all rows).
OPEN: header row duplicated when page_size &lt; 10.
NEXT: fix header bug, then run full test suite.</pre><p>About 90 tokens replacing 60k of transcript, and nothing needed to continue is lost.</p>` },
    { title: 'A bad compaction summary', html: `<p>"We worked on the export feature and made good progress." The agent restarts, re-reads files it already read, re-tries pandas (already ruled out) and re-introduces the header bug. Summaries must keep <b>state, decisions and dead ends</b>.</p>` },
    { title: 'Clearing math', html: `${H.table(['Step', 'Tool output', 'Context without clearing', 'With keep-last-3 clearing'], [['10', '4k each', '40k', '12k + 7×0.05k ≈ 12.4k'], ['50', '4k each', '200k (full!)', '≈ 14k'], ['100', '4k each', 'impossible', '≈ 17k']])}` },
    { title: 'Rolling summary for a chat app', html: `<p>Keep the last 10 messages verbatim plus one running summary that is updated every 10 messages. The prompt size stays roughly flat at ~4k instead of growing with every turn.</p>` }
  ],
  deepDive: `<p><b>Where to compact.</b> Compacting too early wastes a model call and loses detail; too late risks an overflow mid-task and leaves no room for the summary call itself. Trigger on a threshold (e.g. 75–90% of the effective window) and keep the summary call's own budget in reserve.</p>
  <p><b>Protect the pins.</b> Some content must never be summarised away: the system prompt, the user's hard constraints, the current plan. Keep them outside the compactable region and re-insert them verbatim after compaction.</p>
  <p><b>Cache interaction.</b> Both clearing and compaction rewrite earlier parts of the prompt, which invalidates the prompt cache from that point. Clear in batches (e.g. only when a threshold is crossed, clearing many results at once) rather than one result per step, so you break the cache rarely. Anthropic's context editing exposes a "clear at least N tokens" style knob for exactly this reason.</p>
  <p><b>Evaluate the summariser.</b> Build long traces, compact them, then ask probe questions ("which approach was ruled out and why?"). Measure task success after compaction vs without. The summary prompt is a product component and deserves its own eval.</p>
  <p><b>Server-side vs client-side.</b> With server-side context editing the API applies the clearing before the model sees the prompt, while your client keeps the full history. That is convenient but means your logs and the model's view differ; record what was actually sent.</p>`,
  aiEra: `<p><b>What changed:</b> compaction moved from DIY into products and APIs: coding agents auto-compact, and model APIs offer context editing (clearing old tool results and old thinking blocks) and compaction features. Models are also trained to work across compaction boundaries.</p>
  <p><b>Working with AI:</b> let the model write the summary, but give it a strict template (goal, done, decisions, ruled out, open, next) and test it. When a long agent session goes wrong after a compaction, read the summary first; it is usually the culprit. <b>What you still own:</b> the template, the threshold, what is pinned, and the eval proving nothing important is lost.</p>`,
  problems: [mk({
    title: 'Compact the Oldest Turns Past a Threshold', level: 'Medium', tags: ['compaction', 'summarisation'],
    statement: `<p><code>turns</code> holds the token size of each turn, oldest first. If the total is <b>greater than</b> <code>threshold</code> and there are more than <code>keep_recent</code> turns, replace every turn except the last <code>keep_recent</code> with a single summary turn of <code>summary_size</code> tokens placed first. Otherwise return the turns unchanged.</p>`,
    constraints: `0 ≤ len(turns) ≤ 10<sup>5</sup>; 0 ≤ keep_recent; sizes ≥ 0. With keep_recent = 0 the result is just [summary_size].`,
    example: `<p>turns [400, 400, 400], threshold 1000, keep_recent 1, summary 100 → total 1200 &gt; 1000, so the first two become one summary: ${H.c('g', '[100, 400]')}.</p>`,
    bruteWhy: `<p>Drop the oldest turns one at a time until the total fits (a sliding window). It loses information abruptly and silently: the goal from turn 1 disappears with no summary.</p>`,
    bruteCode: `def sliding_window(turns, threshold):
    out = list(turns)
    while out and sum(out) > threshold:
        out.pop(0)              # forget the oldest turn completely
    return out`,
    mcq: { q: 'Total equals the threshold exactly. What happens?', options: ['Compact', 'Return unchanged', 'Drop one turn', 'Error'], answer: 1, explain: 'Compaction triggers only when the total is greater than the threshold.' },
    hints: ['<p>Hint 1: first check the two "do nothing" conditions: total within threshold, or not enough turns to compact.</p>', '<p>Hint 2: the kept part is the last keep_recent turns; Python slicing with a 0 count needs care.</p>', '<p>Hint 3: build [summary_size] followed by the kept recent turns. When keep_recent is 0 the kept part is empty.</p>'],
    approach: `<p>Return a copy if <code>sum(turns) ≤ threshold</code> or <code>len(turns) ≤ keep_recent</code>. Otherwise take <code>recent = turns[len(turns) − keep_recent:]</code> (empty when keep_recent is 0; note <code>turns[-0:]</code> would be the whole list) and return <code>[summary_size] + recent</code>.</p>`,
    code: `def compact(turns, threshold, keep_recent, summary_size):
    if sum(turns) <= threshold or len(turns) <= keep_recent:
        return list(turns)                       # nothing to do
    # Careful: turns[-0:] is the WHOLE list, so slice from an explicit start.
    recent = turns[len(turns) - keep_recent:]
    return [summary_size] + recent               # summary replaces everything older`, alt: [
      { lang: 'java', code: `class Solution {
    public int[] compact(int[] turns, int threshold, int keepRecent, int summarySize) {
        long total = 0;
        for (int t : turns) total += t;
        if (total <= threshold || turns.length <= keepRecent) return turns.clone();   // nothing to do
        int start = turns.length - keepRecent;
        int[] out = new int[keepRecent + 1];
        out[0] = summarySize;                       // summary replaces everything older
        System.arraycopy(turns, start, out, 1, keepRecent);
        return out;
    }
}` },
      { lang: 'js', code: `function compact(turns, threshold, keepRecent, summarySize) {
  const total = turns.reduce((s, t) => s + t, 0);
  if (total <= threshold || turns.length <= keepRecent) return turns.slice();   // nothing to do
  const recent = turns.slice(turns.length - keepRecent);   // explicit start, never slice(-0)
  return [summarySize, ...recent];                          // summary replaces everything older
}` },
      { lang: 'cpp', code: `class Solution {
public:
    vector<int> compact(vector<int>& turns, int threshold, int keepRecent, int summarySize) {
        long long total = 0;
        for (int t : turns) total += t;
        if (total <= threshold || (int)turns.size() <= keepRecent) return turns;   // nothing to do
        vector<int> out{summarySize};                       // summary replaces everything older
        out.insert(out.end(), turns.end() - keepRecent, turns.end());
        return out;
    }
};` },
      { lang: 'csharp', code: `public class Solution {
    public int[] Compact(int[] turns, int threshold, int keepRecent, int summarySize) {
        long total = 0;
        foreach (int t in turns) total += t;
        if (total <= threshold || turns.Length <= keepRecent) return (int[])turns.Clone();   // nothing to do
        var outList = new List<int> { summarySize };            // summary replaces everything older
        for (int i = turns.Length - keepRecent; i < turns.Length; i++) outList.Add(turns[i]);
        return outList.ToArray();
    }
}` }
    ],
    complexity: `<p>O(n) time and space.</p>`,
    followUps: ['What if the summary plus recent turns still exceeds the threshold?', 'How would you pin the system prompt so it is never compacted?'],
    tests: { sig: 'int[] int int int -> int[]', fn: 'compact', cases: [[[[100, 200, 300], 1000, 1, 50], [100, 200, 300]], [[[400, 400, 400], 1000, 1, 100], [100, 400]], [[[400, 400, 400], 1000, 2, 100], [100, 400, 400]], [[[500, 600], 1000, 5, 50], [500, 600]], [[[], 10, 1, 5], []], [[[10, 20, 30, 40], 50, 0, 7], [7]], [[[1000], 1000, 0, 9], [1000]]] }
  })]
});

/* =====================================================================
   TOPIC 5 — Structured notes / external memory and sub-agents
   ===================================================================== */
topics.push({
  title: 'Structured Notes, External Memory and Sub-Agents to Isolate Context',
  analogy: `<p>A <b>detective</b> keeps a case board on the wall: suspects, alibis, open leads. They do not hold it all in their head; they glance at the board. For legwork, they send <b>junior officers</b> to canvass a street; each comes back with a one-paragraph report, not a recording of 200 doorstep chats.</p>`,
  explain: `<p>Compaction squeezes the context. Two other techniques move work <b>out of</b> the context entirely.</p>
  <p><b>1. Structured note-taking (agentic memory).</b> The agent writes notes to storage outside the window (a <code>NOTES.md</code> or <code>progress.txt</code> file, a to-do list, a JSON state file, a memory tool) and reads them back when needed. Notes survive compaction and even a brand-new session. Examples: Claude Code's to-do list; Anthropic's memory tool, which lets the model create, read, update and delete files in a memory directory that your application stores; an agent playing a long game keeping tallies and maps in a file.</p>
  ${H.table(['Note type', 'Example', 'Why structured'], [['Progress log', '"step 4/7 done: migrated users table"', 'resume after a reset'], ['Decision record', '"chose Redis over Memcached: need TTL per key"', 'stops re-litigating'], ['To-do list', '[x] write tests  [ ] update docs', 'keeps long plans on track'], ['Facts store', '{"customer_tier": "gold"}', 'exact lookup, no rot']])}
  <p><b>2. Sub-agents for context isolation.</b> The main (lead) agent hands a focused job to a sub-agent that starts with a <b>clean context</b>. The sub-agent may read 50 files and burn 80k tokens exploring, then returns a condensed summary of 1–2k tokens. The lead's context only ever sees the summary. Anthropic's multi-agent research system and Claude Code's subagents work this way.</p>
  <p><b>Trade-offs:</b> sub-agents cost more total tokens (Anthropic reported its multi-agent research system used roughly 15× the tokens of a chat) and add coordination risk, but keep the lead's context clean and allow parallel work. They suit wide, separable work (research, codebase search, reviewing many files), not tightly coupled edits where every part depends on the others.</p>`,
  clues: ['"agent must continue tomorrow / after a crash" → notes in external storage', '"the lead agent drowns in search results" → sub-agent explores and returns a summary', '"research 10 independent topics" → parallel sub-agents with isolated contexts', '"agent keeps re-checking the same thing" → decision log / to-do notes', '"two agents edited the same file and conflicted" → coupled work, keep it in one agent'],
  code: { lang: 'python', title: 'A file-backed notes store + a sub-agent token ledger (runnable)', run: true, code: `import json

class Notes:
    """Tiny external memory: lives outside the context window."""
    def __init__(self):
        self.store = {}            # in real life: a file or DB the app persists
    def write(self, key, value):
        self.store[key] = value
    def render(self, keys=None):
        keys = keys or sorted(self.store)
        return "\\n".join(f"- {k}: {self.store[k]}" for k in keys if k in self.store)

notes = Notes()
notes.write("goal", "migrate billing to v2 API")
notes.write("done", "invoices, refunds")
notes.write("next", "webhooks")
print("Re-injected after a reset:")
print(notes.render())

# Sub-agent ledger: what the LEAD's context pays with and without delegation.
explore = {"search auth code": 42000, "read billing docs": 30000, "scan logs": 25000}
summary = 1500
print("lead tokens, doing it all itself:", sum(explore.values()))
print("lead tokens, with sub-agents:", len(explore) * summary)
print("total tokens spent (all agents):", sum(explore.values()) + len(explore) * summary)` },
  viz: {
    title: 'Lead agent with three sub-agents',
    gen: function () {
      var N = [bx('L', 'Lead agent', 10, 30, 14), bx('A', 'Sub-agent A', 48, 6, 16), bx('B', 'Sub-agent B', 48, 30, 16), bx('C', 'Sub-agent C', 48, 54, 16), bx('N', 'NOTES.md', 86, 30, 14)];
      var E = [['L', 'A', 'task'], ['L', 'B', 'task'], ['L', 'C', 'task'], ['A', 'L', '1.5k'], ['B', 'L', '1.5k'], ['C', 'L', '1.5k'], ['L', 'N', 'write']];
      function f(narr, hl, ehl, tags, v) { return { narr: narr, parts: [gr('Context isolation', N, E, hl, ehl, tags, 62), { type: 'vars', vals: v }] }; }
      return [
        f('The lead gets "Why did churn rise in March?". It splits the work into three independent questions.', { L: 'cur' }, {}, {}, { lead_ctx: '3k' }),
        f('Each sub-agent starts with a <b>clean</b> context holding only its task: A = support tickets, B = pricing changes, C = product usage logs.', { A: 'win', B: 'win', C: 'win' }, { 'L-A': 'ok', 'L-B': 'ok', 'L-C': 'ok' }, {}, { lead_ctx: '3k' }),
        f('They explore in parallel: A reads 40k tokens, B 25k, C 60k. <b>None of this enters the lead\'s window.</b>', { A: 'cur', B: 'cur', C: 'cur' }, {}, { A: '40k', B: '25k', C: '60k' }, { lead_ctx: '3k', sub_total: '125k' }),
        f('Each returns a ~1.5k summary with evidence links. The lead\'s context grows by only 4.5k.', { L: 'ok' }, { 'A-L': 'ok', 'B-L': 'ok', 'C-L': 'ok' }, {}, { lead_ctx: '7.5k', sub_total: '125k' }),
        f('The lead writes findings to <b>NOTES.md</b> so a later session (or post-compaction self) can pick up. Total tokens spent rose; the lead\'s context stayed small and focused.', { N: 'sel' }, { 'L-N': 'ok' }, { N: 'saved' }, { lead_ctx: '7.5k', all_agents: '≈ 133k' })
      ];
    }
  },
  examples: [
    { title: 'Notes that survive a reset', html: `<p>An agent migrating 300 test files writes <code>progress.json</code>: <code>{"done": 212, "failing": ["test_tax.py"], "next": "test_user_*"}</code>. After a context reset it reads the file and continues at 213 instead of starting over.</p>` },
    { title: 'Sub-agent for code search', html: `<p>"Where is rate limiting implemented?" A search sub-agent greps, reads 9 files (35k tokens) and returns: "Rate limiting lives in <code>gateway/limits.py</code> (token bucket, lines 40–120), configured in <code>config/limits.yaml</code>; tests in <code>tests/test_limits.py</code>." The lead pays ~120 tokens.</p>` },
    { title: 'When NOT to use sub-agents', html: `<p>Refactoring one function signature used in 30 call sites: every edit depends on the same decision. Splitting across 3 sub-agents produced 3 inconsistent signatures. One agent with JIT reads and a to-do list is better.</p>` },
    { title: 'Memory scoping', html: `${H.table(['Store', 'Scope', 'Example'], [['Session notes', 'this task', 'NOTES.md in a scratch dir'], ['User memory', 'one user, across sessions', 'prefers metric units'], ['Project memory', 'whole team', 'CLAUDE.md / AGENTS.md']])}` }
  ],
  deepDive: `<p><b>Notes are a tool design problem.</b> Give the agent a small set of operations (view, create, edit, delete) on a directory, keep files small and named by purpose, and tell it in the system prompt to check memory at the start of a task. Treat memory content as untrusted input when it can be written from user data: memory is a persistent prompt-injection surface, so sanitise and scope it per user.</p>
  <p><b>Sub-agent hand-off contract.</b> The lead's task message must be self-contained: objective, output format, tools allowed, boundaries ("do not edit files"), and a token or step budget. The sub-agent's reply should be structured (findings, evidence paths, confidence, open questions). Vague delegation is the top failure mode: two sub-agents doing the same search, or one wandering off scope.</p>
  <p><b>Accounting.</b> Total tokens = Σ sub-agent contexts + lead context; latency can drop with parallelism. Use sub-agents when the lead's context quality (not total cost) is the bottleneck, or when the task is wide and parallel. Anthropic reported that in its research eval, token usage explained most of the performance variance, which is why spreading work over separate windows helped.</p>
  <p><b>Write vs read paths.</b> Writing notes costs tool calls; reading them back costs tokens every time. Keep a short index ("memory/README: 5 files, what each holds") always loaded, and load full files just in time.</p>`,
  aiEra: `<p><b>What changed:</b> memory became a first-class API and product feature (memory tools, project memory files, persistent to-do lists), and agent frameworks ship sub-agents as a built-in (e.g. Claude Code subagents with their own system prompts and tool permissions, and agent SDKs with hand-offs).</p>
  <p><b>Working with AI:</b> ask the agent to keep a progress file for any task longer than one sitting, and to delegate broad searches. <b>What you still own:</b> what is allowed into long-lived memory (privacy, retention, injection risk), and deciding where the seams between sub-agents are. Bad seams make multi-agent systems slower, costlier and less correct than one agent.</p>`,
  problems: [mk({
    title: 'What Does the Lead Agent Pay?', level: 'Easy', tags: ['sub-agents', 'token accounting'],
    statement: `<p>A lead agent has exploration tasks costing <code>tasks[i]</code> tokens each. Without sub-agents, the lead reads all of it into its own context. With sub-agents, each task is done in an isolated context and returns a summary of <code>summary</code> tokens, but if a task's output is already smaller than the summary it is returned as-is (min of the two). Return <code>[lead_tokens_without, lead_tokens_with]</code>.</p>`,
    constraints: `0 ≤ len(tasks) ≤ 10<sup>5</sup>; values ≥ 0.`,
    example: `<p>tasks [20000, 30000, 10000], summary 1000 → without: 60000; with: 1000 + 1000 + 1000 = 3000 → ${H.c('g', '[60000, 3000]')}.</p>`,
    bruteWhy: `<p>Counting only "number of sub-agents × summary" over-charges tiny tasks: a 300-token result would be billed as 1000.</p>`,
    bruteCode: `def lead_cost_naive(tasks, summary):
    return [sum(tasks), len(tasks) * summary]   # wrong when a task is smaller than the summary`,
    mcq: { q: 'What do sub-agents mainly protect?', options: ['Total token spend', 'The lead agent\'s context window', 'Network bandwidth', 'Model weights'], answer: 1, explain: 'Total tokens usually go UP; the lead\'s context stays small and focused.' },
    hints: ['<p>Hint 1: the first number is just the sum of all task outputs.</p>', '<p>Hint 2: for each task, the lead receives whichever is smaller: the raw output or the summary.</p>', '<p>Hint 3: sum min(task, summary) over tasks. An empty list gives [0, 0].</p>'],
    approach: `<p>Without delegation the lead pays <code>sum(tasks)</code>. With delegation it pays <code>Σ min(t, summary)</code>, because a sub-agent never needs to return more than the raw result.</p>`,
    code: `def lead_tokens(tasks, summary):
    without = sum(tasks)                              # lead reads everything itself
    with_sub = sum(min(t, summary) for t in tasks)    # lead sees only short reports
    return [without, with_sub]`, alt: [
      { lang: 'java', code: `class Solution {
    public int[] leadTokens(int[] tasks, int summary) {
        int without = 0, withSub = 0;
        for (int t : tasks) {
            without += t;                        // lead reads everything itself
            withSub += Math.min(t, summary);     // lead sees only short reports
        }
        return new int[] { without, withSub };
    }
}` },
      { lang: 'js', code: `function leadTokens(tasks, summary) {
  const without = tasks.reduce((s, t) => s + t, 0);                   // lead reads everything itself
  const withSub = tasks.reduce((s, t) => s + Math.min(t, summary), 0); // lead sees only short reports
  return [without, withSub];
}` },
      { lang: 'cpp', code: `class Solution {
public:
    vector<int> leadTokens(vector<int>& tasks, int summary) {
        int without = 0, withSub = 0;
        for (int t : tasks) {
            without += t;                    // lead reads everything itself
            withSub += min(t, summary);      // lead sees only short reports
        }
        return {without, withSub};
    }
};` },
      { lang: 'csharp', code: `public class Solution {
    public int[] LeadTokens(int[] tasks, int summary) {
        int without = 0, withSub = 0;
        foreach (int t in tasks) {
            without += t;                       // lead reads everything itself
            withSub += Math.Min(t, summary);    // lead sees only short reports
        }
        return new[] { without, withSub };
    }
}` }
    ],
    complexity: `<p>O(n) time, O(1) space.</p>`,
    followUps: ['How would you include the cost of the sub-agents themselves?', 'When would the extra total cost be worth it?'],
    tests: { sig: 'int[] int -> int[]', fn: 'leadTokens', cases: [[[[20000, 30000, 10000], 1000], [60000, 3000]], [[[], 500], [0, 0]], [[[300], 1000], [300, 300]], [[[5000, 200], 1000], [5200, 1200]], [[[1000, 1000], 1000], [2000, 2000]], [[[0, 7], 2], [7, 2]]] }
  })]
});

/* =====================================================================
   TOPIC 6 — Progressive disclosure: skills and context files
   ===================================================================== */
topics.push({
  title: 'Progressive Disclosure: Skills and Context Files (CLAUDE.md, AGENTS.md, GEMINI.md)',
  analogy: `<p>A <b>new hire's first day</b>: they get a one-page welcome sheet (where things are, the three rules that matter), not the 400-page company handbook. When they need the expense policy, the sheet tells them where it lives and they read it then. That is progressive disclosure.</p>`,
  explain: `<p><b>Progressive disclosure</b> means loading instructions in layers: a tiny always-on layer that says what exists, and full detail only when the task needs it.</p>
  <p><b>Agent Skills</b> (introduced by Anthropic in October 2025 and published as an open format) are the clearest example. A skill is a folder with a <code>SKILL.md</code> file: YAML front matter with a <code>name</code> and <code>description</code>, then instructions, plus optional scripts and reference files.</p>
  ${H.table(['Level', 'What is loaded', 'When', 'Typical size'], [['1. Metadata', 'name + description of every skill', 'always, in the system prompt', '~50–100 tokens per skill'], ['2. SKILL.md body', 'the instructions', 'when the model decides the skill is relevant', 'up to a few thousand tokens'], ['3. Linked files / scripts', 'reference docs, templates; scripts are run, not read', 'only if the instructions point there', 'unbounded, read on demand']])}
  <p>So 50 installed skills cost only a few thousand tokens until one is used.</p>
  <p><b>Context files for coding agents</b> are the always-on project layer: a Markdown file in the repo that the agent loads at the start of every session.</p>
  ${H.table(['File', 'Read by', 'Notes'], [['CLAUDE.md', 'Claude Code', 'project root, sub-directories (loaded when working there) and user-level ~/.claude/CLAUDE.md; can import other files with @path'], ['AGENTS.md', 'OpenAI Codex and many other agents', 'an open, tool-neutral convention; nearest file in the directory tree wins'], ['GEMINI.md', 'Gemini CLI', 'hierarchical, global plus project; the file name is configurable']])}
  <p><b>What belongs in them:</b> build/test/lint commands, the repo map, conventions a model would not guess ("we use pnpm, not npm"), and hard rules ("never edit generated/"). <b>What does not:</b> things the model can discover by reading code, long style guides (link them instead), and anything stale. Keep it short: every line is paid on every call and competes for attention.</p>`,
  clues: ['"we have 80 tools / 50 workflows and the prompt is huge" → progressive disclosure, load on demand', '"the agent keeps using npm instead of pnpm" → put it in CLAUDE.md / AGENTS.md', '"how do we share agent instructions across Claude Code, Codex and Gemini CLI?" → AGENTS.md, or one file imported/linked by the others', '"the instructions file is 3,000 lines" → split into skills or linked docs', '"agent ignores half the rules" → too many always-on instructions, prune'],
  code: [
    { lang: 'text', title: 'A minimal SKILL.md', code: `---
name: pdf-forms
description: Fill in and validate PDF forms. Use when the user asks to fill, flatten or check fields in a PDF form.
---
# Filling PDF forms
1. Run scripts/list_fields.py <file> to see field names (do not read the PDF raw).
2. Map user data to fields; ask if a required field is missing.
3. Run scripts/fill.py and then scripts/validate.py.
For unusual field types see reference/field-types.md.` },
    { lang: 'text', title: 'A short, high-signal AGENTS.md / CLAUDE.md', code: `# Project: billing-service
## Commands
- Install: pnpm install   (never npm)
- Test one file: pnpm vitest run path/to/file.test.ts
- Lint + typecheck before committing: pnpm check
## Layout
- src/api: HTTP handlers  - src/core: pure business logic (no I/O)
- generated/: produced by codegen, NEVER edit by hand
## Rules
- Money is integer cents everywhere.
- Every new endpoint needs a contract test in tests/contract/.
More: docs/architecture.md (read when changing module boundaries).` },
    { lang: 'python', title: 'Eager vs progressive loading cost (runnable)', run: true, code: `skills = {  # name: (metadata tokens, body tokens)
    "pdf-forms": (60, 1800), "excel-reports": (70, 2400), "brand-voice": (55, 1200),
    "sql-review": (65, 2100), "release-notes": (50, 900),
}
used_this_session = {"sql-review"}

eager = sum(m + b for m, b in skills.values())
lazy = sum(m for m, _ in skills.values()) + sum(skills[s][1] for s in used_this_session)
print("eager (everything in the prompt):", eager)
print("progressive disclosure:", lazy)
print(f"saved: {eager - lazy} tokens per call ({100 * (eager - lazy) // eager}%)")` }
  ],
  viz: {
    title: 'Three levels of a skill loading on demand',
    gen: function () {
      var S = ['pdf-forms', 'excel', 'brand', 'sql-review', 'notes'];
      function f(narr, items, hl, ctx) { return { narr: narr, parts: [{ type: 'array', label: 'installed skills', values: S, hl: hl }, { type: 'stack', label: 'context (bottom = first)', items: items }, { type: 'vars', vals: { context_tokens: ctx } }] }; }
      return [
        f('Session start: only the <b>name + description</b> of each of the 5 skills is in the system prompt (~300 tokens total).', ['system prompt', 'skill index (5 × ~60)'], {}, '~2.3k'),
        f('User: "Review this SQL migration for locking problems." The model matches the description of <b>sql-review</b>.', ['system prompt', 'skill index (5 × ~60)', 'user request'], { 3: 'cur' }, '~2.4k'),
        f('Level 2: the model reads <code>sql-review/SKILL.md</code> (2.1k tokens). The other four bodies are never loaded.', ['system prompt', 'skill index (5 × ~60)', 'user request', 'SKILL.md body (2.1k)'], { 3: 'ok' }, '~4.5k'),
        f('Level 3: the instructions say "for Postgres lock levels see reference/locks.md". It reads just that file. A bundled script is <b>run</b>, so only its output enters context.', ['system prompt', 'skill index (5 × ~60)', 'user request', 'SKILL.md body (2.1k)', 'locks.md (1.2k)', 'script output (0.2k)'], { 3: 'ok' }, '~5.9k'),
        f('Eager loading of all 5 bodies + references would cost ~15k tokens on <b>every</b> call. Progressive disclosure paid ~3.6k, and only on this task.', ['system prompt', 'skill index (5 × ~60)', 'user request', 'SKILL.md body (2.1k)', 'locks.md (1.2k)', 'script output (0.2k)'], { 0: 'done', 1: 'done', 2: 'done', 3: 'sel', 4: 'done' }, '~5.9k')
      ];
    }
  },
  examples: [
    { title: 'Pruning a bloated CLAUDE.md', html: `<p>A 1,900-line CLAUDE.md (≈ 25k tokens) included the full API reference and a style guide. Trimmed to 80 lines of commands, layout and hard rules, with links to <code>docs/api.md</code> and <code>docs/style.md</code>. The agent followed the hard rules <b>more</b> reliably afterwards: fewer instructions competing for attention.</p>` },
    { title: 'One file, three agents', html: `<p>A team uses Claude Code, Codex and Gemini CLI. They keep the content in <code>AGENTS.md</code>; <code>CLAUDE.md</code> contains the single line <code>@AGENTS.md</code> (an import), and Gemini CLI is configured to read AGENTS.md as its context file name. One source of truth, no drift.</p>` },
    { title: 'Nested context files', html: `${H.table(['Path', 'Content'], [['/AGENTS.md', 'monorepo commands, global rules'], ['/apps/web/AGENTS.md', 'Next.js conventions, how to run web tests'], ['/services/pay/AGENTS.md', 'PCI rules: never log card data']])}<p>Working in <code>services/pay</code>, the agent gets the root rules plus the PCI rules, and never sees the web conventions.</p>` },
    { title: 'Tool search as progressive disclosure', html: `<p>Instead of 120 MCP tool schemas (≈ 50k tokens), expose a <code>search_tools</code> tool; the model searches, and only the 3 matching tool definitions are loaded. Same idea as skills, applied to tools.</p>` }
  ],
  deepDive: `<p><b>Descriptions are routing.</b> At level 1 the model chooses a skill from its description alone, exactly like choosing a tool. Write descriptions that say what the skill does <i>and when to use it</i>, with trigger words users actually say. Vague descriptions mean the skill never fires, or fires when it should not.</p>
  <p><b>Scripts beat prose for deterministic work.</b> A skill that ships <code>validate.py</code> lets the model run it and read a 3-line result, instead of loading a 5k-token procedure and re-implementing it. Code is both cheaper in context and more reliable.</p>
  <p><b>Security.</b> Skills and context files are instructions with real authority, and skills can contain executable scripts. Install them only from trusted sources, review them like code, and remember that a repo's AGENTS.md is attacker-controlled when you run an agent on an untrusted repo.</p>
  <p><b>Measuring a context file.</b> Treat it like code: keep it in version control, review changes, and test it. A good check is a small set of tasks ("add an endpoint", "run the tests") run before and after a change, watching for rule violations and wasted exploration steps.</p>
  <p><b>Cache friendliness.</b> Always-on layers (system prompt, skill index, context file) form a stable prefix and cache well. Loading a skill body later appends to the end, so it does not break the cached prefix.</p>`,
  aiEra: `<p><b>What changed:</b> in 2025 instruction files became a de facto standard across coding agents (CLAUDE.md, AGENTS.md, GEMINI.md, Cursor rules), and Skills generalised progressive disclosure to any domain: spreadsheets, brand guidelines, internal workflows.</p>
  <p><b>Working with AI:</b> let the agent draft the context file (Claude Code's <code>/init</code> scans the repo and writes one), then cut it by half. Add a rule only after you see the agent get something wrong twice. <b>What you still own:</b> which knowledge is always-on vs on-demand, keeping files current, and the trust boundary for third-party skills.</p>`,
  problems: [mk({
    title: 'Eager vs Progressive Skill Loading', level: 'Easy', tags: ['progressive disclosure', 'skills'],
    statement: `<p>Each skill i has <code>meta[i]</code> metadata tokens and <code>body[i]</code> body tokens. <code>used[i]</code> is 1 if the skill was used in this session, else 0. Eager loading puts every metadata and body in the prompt. Progressive disclosure always loads all metadata but a body only when used. Return <code>[eager_tokens, progressive_tokens]</code>.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>4</sup>; all lists have length n; values ≥ 0; used[i] ∈ {0, 1}.`,
    example: `<p>meta [50, 50, 50], body [2000, 3000, 1000], used [0, 1, 0] → eager 150 + 6000 = 6150; progressive 150 + 3000 = 3150 → ${H.c('g', '[6150, 3150]')}.</p>`,
    bruteWhy: `<p>Load everything always: simple, and the cost grows with every skill you install, used or not.</p>`,
    bruteCode: `def eager_only(meta, body, used):
    return sum(meta) + sum(body)`,
    mcq: { q: 'What is always loaded for every installed skill?', options: ['The full SKILL.md', 'Its name and description', 'Its scripts', 'Nothing'], answer: 1, explain: 'The metadata lets the model know the skill exists and when to use it.' },
    hints: ['<p>Hint 1: eager is simply everything added up.</p>', '<p>Hint 2: progressive always pays for metadata, and pays for a body only where used is 1.</p>', '<p>Hint 3: zip the three lists; multiply body by used. Empty lists give [0, 0].</p>'],
    approach: `<p>Eager = Σ meta + Σ body. Progressive = Σ meta + Σ body[i] × used[i]. One pass over the zipped lists computes both.</p>`,
    code: `def skill_tokens(meta, body, used):
    eager = sum(meta) + sum(body)                        # everything, every call
    lazy = sum(meta) + sum(b * u for b, u in zip(body, used))  # bodies only when used
    return [eager, lazy]`, alt: [
      { lang: 'java', code: `class Solution {
    public int[] skillTokens(int[] meta, int[] body, int[] used) {
        int metaSum = 0, bodySum = 0, usedSum = 0;
        for (int m : meta) metaSum += m;
        for (int b : body) bodySum += b;
        for (int i = 0; i < Math.min(body.length, used.length); i++) usedSum += body[i] * used[i];
        return new int[] { metaSum + bodySum, metaSum + usedSum };   // eager, lazy
    }
}` },
      { lang: 'js', code: `function skillTokens(meta, body, used) {
  const sum = (xs) => xs.reduce((s, x) => s + x, 0);
  const eager = sum(meta) + sum(body);                         // everything, every call
  let lazyBodies = 0;
  for (let i = 0; i < Math.min(body.length, used.length); i++) lazyBodies += body[i] * used[i];
  return [eager, sum(meta) + lazyBodies];                      // bodies only when used
}` },
      { lang: 'cpp', code: `class Solution {
public:
    vector<int> skillTokens(vector<int>& meta, vector<int>& body, vector<int>& used) {
        int metaSum = accumulate(meta.begin(), meta.end(), 0);
        int bodySum = accumulate(body.begin(), body.end(), 0);
        int usedSum = 0;
        for (size_t i = 0; i < min(body.size(), used.size()); i++) usedSum += body[i] * used[i];
        return {metaSum + bodySum, metaSum + usedSum};   // eager, lazy
    }
};` },
      { lang: 'csharp', code: `public class Solution {
    public int[] SkillTokens(int[] meta, int[] body, int[] used) {
        int metaSum = meta.Sum(), bodySum = body.Sum(), usedSum = 0;
        for (int i = 0; i < Math.Min(body.Length, used.Length); i++) usedSum += body[i] * used[i];
        return new[] { metaSum + bodySum, metaSum + usedSum };   // eager, lazy
    }
}` }
    ],
    complexity: `<p>O(n) time, O(1) space.</p>`,
    followUps: ['Add level-3 reference files that are loaded only if the body is loaded and the file is needed.', 'How would you detect a skill whose description never triggers?'],
    tests: { sig: 'int[] int[] int[] -> int[]', fn: 'skillTokens', cases: [[[[50, 50, 50], [2000, 3000, 1000], [0, 1, 0]], [6150, 3150]], [[[], [], []], [0, 0]], [[[10], [100], [1]], [110, 110]], [[[10], [100], [0]], [110, 10]], [[[30, 40], [500, 600], [1, 1]], [1170, 1170]], [[[5, 5, 5, 5], [100, 200, 300, 400], [0, 0, 0, 1]], [1020, 420]]] }
  })]
});

/* =====================================================================
   TOPIC 7 — Ordering content for prompt-cache hits
   ===================================================================== */
topics.push({
  title: 'Ordering Context for Prompt-Cache Hits',
  analogy: `<p>A <b>photocopier with a memory</b>: if your new document starts with the same 40 pages as the last one, it reuses them and only copies the new pages. Change page 1 (say, today's date in the header) and it has to recopy all 40. So you put the pages that never change at the front.</p>`,
  explain: `<p>Prompt caching (covered for cost in the LLMOps module) reuses the model's computed state for a <b>prefix</b> of the prompt that exactly matches an earlier request. It is strictly prefix-based: the cache matches from the first token up to the first difference. Everything after a change is recomputed.</p>
  <p>That turns cost into a <b>context-ordering</b> rule: <span class="c-g">stable first, volatile last</span>.</p>
  ${H.table(['Order', 'Block', 'Changes'], [['1', 'tool definitions', 'rarely (deploys)'], ['2', 'system prompt + instructions', 'rarely'], ['3', 'context file / skill index / few-shot examples', 'rarely'], ['4', 'large shared documents', 'per document set'], ['5', 'conversation history', 'appends each turn'], ['6', 'latest user message, timestamp, per-request data', 'every request']])}
  <p><b>How the big providers do it (check current docs for numbers):</b> OpenAI caches automatically for prompts above a minimum length (1,024 tokens) with discounted cached input. Anthropic uses explicit <code>cache_control</code> breakpoints on blocks (a default 5-minute lifetime refreshed on each hit, with a longer 1-hour option); cache reads are billed at a small fraction of the normal input price and cache writes at a premium. Google Gemini offers implicit caching plus explicit cached content. All of them reward an identical prefix.</p>
  <p><b>Cache killers:</b> a timestamp or request ID at the top of the system prompt; tools listed in a different order each request; JSON with unstable key order; editing or clearing an early message; switching models; injecting per-user data into the system prompt. For agents, <b>append-only</b> history is the cache-friendly default; Manus's context-engineering write-up calls KV-cache hit rate the single most important metric for a production agent.</p>`,
  clues: ['"our cache hit rate is near 0%" → something volatile sits early in the prompt', '"agent cost dominated by input tokens" → long shared prefix that should be cached', '"we put the current time in the system prompt" → cache killer, move it to the end', '"time-to-first-token is high on long prompts" → cached prefixes cut prefill latency', '"tool list order changes per request" → sort tools deterministically'],
  code: { lang: 'python', title: 'Prefix cache hit calculator (runnable)', run: true, code: `def cached_tokens(prev_blocks, cur_blocks):
    """Blocks are (content, tokens). Cache hits only for the identical leading run."""
    hit = 0
    for (p, _), (c, tok) in zip(prev_blocks, cur_blocks):
        if p != c:
            break
        hit += tok
    return hit

def prompt(order, now, question):
    blocks = {"tools": ("TOOLS v3", 6000), "system": ("SYSTEM v12", 3000),
              "docs": ("POLICY 2026", 20000), "time": (f"time={now}", 10),
              "q": (question, 50)}
    return [blocks[k] for k in order]

bad = ["time", "tools", "system", "docs", "q"]
good = ["tools", "system", "docs", "time", "q"]
for name, order in (("timestamp first", bad), ("stable first", good)):
    a = prompt(order, "10:00:01", "How do refunds work?")
    b = prompt(order, "10:00:07", "Can I return shoes?")
    total = sum(t for _, t in b)
    hit = cached_tokens(a, b)
    print(f"{name:16s} cached {hit:6d} / {total} tokens = {100 * hit // total}%")` },
  viz: {
    title: 'Where the first difference falls decides the hit',
    input: 'tools, system, docs, time, question', inputLabel: 'block order (names from: tools, system, docs, time, question)',
    gen: function (input) {
      var size = { tools: 6, system: 3, docs: 20, time: 0.01, question: 0.05 }, vol = { time: 1, question: 1 };
      var order = String(input || '').split(/[\s,]+/).filter(Boolean).map(function (s) { return s.toLowerCase(); });
      if (!order.length) order = ['tools', 'system', 'docs', 'time', 'question'];
      if (order.some(function (b) { return !(b in size); })) throw new Error('Use only: tools, system, docs, time, question');
      order = order.slice(0, 6);
      var frames = [], hit = 0, broken = false, hl = {};
      frames.push({ narr: 'Request 2 arrives 6 seconds after request 1. Blocks in this order: <b>' + order.join(' → ') + '</b>. Volatile blocks (time, question) differ between the two requests.', parts: [{ type: 'array', label: 'prompt blocks', values: order }] });
      order.forEach(function (b, i) {
        if (!broken && vol[b]) broken = true;
        hl[i] = broken ? 'bad' : 'ok';
        if (!broken) hit += size[b];
        frames.push({ narr: broken ? 'Block <b>' + b + '</b>: ' + (vol[b] ? 'it differs' : 'it is identical, but comes after a difference') + ', so it is <b>recomputed</b>. The cache is prefix-only.' : 'Block <b>' + b + '</b> matches request 1 and everything before it matched: cache hit, +' + size[b] + 'k cached.', parts: [{ type: 'array', label: 'prompt blocks', values: order, hl: JSON.parse(JSON.stringify(hl)) }, { type: 'vars', vals: { cached_k: Math.round(hit * 100) / 100 }, hl: { cached_k: broken ? 'bad' : 'ok' } }] });
      });
      var tot = order.reduce(function (s, b) { return s + size[b]; }, 0);
      frames.push({ narr: 'Cached <b>' + Math.round(hit * 100) / 100 + 'k of ' + Math.round(tot * 100) / 100 + 'k</b> tokens (' + Math.round(100 * hit / tot) + '%). Try putting <code>time</code> first to watch the hit rate collapse.', parts: [{ type: 'bars', label: 'cached vs recomputed (k tokens)', values: [Math.round(hit * 100) / 100, Math.round((tot - hit) * 100) / 100], idxLabels: ['cached', 'recomputed'], hl: { 0: 'ok', 1: 'bad' } }] });
      return frames;
    }
  },
  examples: [
    { title: 'The timestamp bug', html: `<p>System prompt began with <code>Current time: 2026-10-29T10:00:01Z</code>. Hit rate: 0%. Moving the time into the final user message (or rounding it to the day) took the hit rate to 92% and cut input cost by roughly 70% on a 30k-token prompt.</p>` },
    { title: 'Agent loop, append-only', html: `${H.table(['Step', 'Prompt', 'Cached prefix'], [['1', 'tools + system + task', '(cold write)'], ['2', '… + step-1 call + result', 'everything from step 1'], ['3', '… + step-2 call + result', 'everything from step 2']])}<p>Each step re-sends the whole history, but only the new tail is computed. Without caching, an N-step agent pays for O(N<sup>2</sup>) input tokens at full price.</p>` },
    { title: 'Clearing vs caching tension', html: `<p>Clearing a tool result at step 5 changes the prompt from step 5 onwards, so steps 5..N are rewritten once. Clearing in batches only when a threshold is crossed breaks the cache rarely; clearing one result every step breaks it every step.</p>` },
    { title: 'Deterministic serialisation', html: `<p>A tool list built from a Python <code>set</code> came out in different orders across workers, so prefixes never matched. Sorting tools by name and dumping JSON with <code>sort_keys=True</code> fixed it.</p>` }
  ],
  deepDive: `<p><b>What is cached.</b> The provider stores the attention key/value tensors (the KV cache) for the prefix, so later requests skip the prefill compute for those tokens. That is why both cost and time-to-first-token drop. The minimum cacheable length and the lifetime are provider-specific; requests that arrive after the entry expires pay the full price again, so low-traffic prompts may never hit.</p>
  <p><b>Breakpoints (Anthropic).</b> You mark up to a few <code>cache_control</code> breakpoints; the system checks for the longest matching cached prefix. Put a breakpoint after the static block (tools + system) and another after the stable documents, so a change in documents still reuses the tool/system cache.</p>
  <p><b>Measuring.</b> Responses report cached tokens (e.g. <code>cache_read_input_tokens</code> and <code>cache_creation_input_tokens</code> in Anthropic's usage, <code>cached_tokens</code> in OpenAI's usage details). Track hit rate = cached ÷ total input per route, and alert when it drops: it usually means someone added a volatile field near the top.</p>
  <p><b>Design consequences for agents:</b> do not reorder or rewrite history; mask tools you want to disable (e.g. via the tool-choice settings) rather than removing them from the list mid-session; keep per-user data at the end; and prefer appending notes over editing earlier messages.</p>`,
  aiEra: `<p><b>What changed:</b> caching made long, stable prefixes cheap (cached reads are commonly 50–90% cheaper than normal input), which shifted design from "make the prompt short" to "make the prefix stable". Long-running agents became affordable largely because of it.</p>
  <p><b>Working with AI:</b> when you review an AI-written prompt builder, check the order of blocks and look for timestamps, random IDs and unsorted collections early in the prompt. <b>What you still own:</b> the cache hit-rate metric and the discipline of keeping the prefix stable as many people edit the prompt over time.</p>`,
  problems: [mk({
    title: 'How Many Tokens Hit the Cache?', level: 'Medium', tags: ['prompt caching', 'prefix'],
    statement: `<p>Two consecutive requests are made of blocks. <code>prev</code> and <code>cur</code> are the block contents (strings) in prompt order, and <code>sizes[i]</code> is the token size of <code>cur[i]</code>. The cache matches the longest run of identical blocks from the start. Return the number of tokens of <code>cur</code> that are served from the cache.</p>`,
    constraints: `0 ≤ len(prev), len(cur) ≤ 10<sup>4</sup>; len(sizes) = len(cur); the lists may differ in length.`,
    example: `<p>prev [sys, tools, doc, q1], cur [sys, tools, doc, q2], sizes [1000, 500, 3000, 20] → first difference at index 3 → ${H.c('g', '4500')}.</p>`,
    bruteWhy: `<p>Count every block of <code>cur</code> that appears anywhere in <code>prev</code>. That overcounts: identical blocks after the first difference are <b>not</b> cached because the cache is prefix-only.</p>`,
    bruteCode: `def cached_naive(prev, cur, sizes):
    # Wrong: ignores that the cache stops at the first difference.
    return sum(s for b, s in zip(cur, sizes) if b in prev)`,
    mcq: { q: 'prev = [A, B, C], cur = [A, X, C]. Is C cached?', options: ['Yes, it is identical', 'No, it comes after a difference', 'Only half of it', 'Only if C is large'], answer: 1, explain: 'Matching is from the start of the prompt; after the first mismatch everything is recomputed.' },
    hints: ['<p>Hint 1: walk both lists together from index 0.</p>', '<p>Hint 2: stop at the first index where the blocks differ or either list runs out.</p>', '<p>Hint 3: add up sizes for the matching indices only. An empty prev means nothing is cached.</p>'],
    approach: `<p>Iterate i from 0 while <code>i &lt; len(prev)</code>, <code>i &lt; len(cur)</code> and <code>prev[i] == cur[i]</code>, adding <code>sizes[i]</code>. Return the sum.</p>`,
    code: `def prefix_hit(prev, cur, sizes):
    hit = 0
    for i in range(min(len(prev), len(cur))):
        if prev[i] != cur[i]:
            break                   # cache is prefix-only: stop at first difference
        hit += sizes[i]
    return hit`, alt: [
      { lang: 'java', code: `class Solution {
    public int prefixHit(String[] prev, String[] cur, int[] sizes) {
        int hit = 0;
        for (int i = 0; i < Math.min(prev.length, cur.length); i++) {
            if (!prev[i].equals(cur[i])) break;   // cache is prefix-only: stop at first difference
            hit += sizes[i];
        }
        return hit;
    }
}` },
      { lang: 'js', code: `function prefixHit(prev, cur, sizes) {
  let hit = 0;
  for (let i = 0; i < Math.min(prev.length, cur.length); i++) {
    if (prev[i] !== cur[i]) break;   // cache is prefix-only: stop at first difference
    hit += sizes[i];
  }
  return hit;
}` },
      { lang: 'cpp', code: `class Solution {
public:
    int prefixHit(vector<string>& prev, vector<string>& cur, vector<int>& sizes) {
        int hit = 0;
        for (size_t i = 0; i < min(prev.size(), cur.size()); i++) {
            if (prev[i] != cur[i]) break;   // cache is prefix-only: stop at first difference
            hit += sizes[i];
        }
        return hit;
    }
};` },
      { lang: 'csharp', code: `public class Solution {
    public int PrefixHit(string[] prev, string[] cur, int[] sizes) {
        int hit = 0;
        for (int i = 0; i < Math.Min(prev.Length, cur.Length); i++) {
            if (prev[i] != cur[i]) break;   // cache is prefix-only: stop at first difference
            hit += sizes[i];
        }
        return hit;
    }
}` }
    ],
    complexity: `<p>O(min(len(prev), len(cur))) block comparisons (each comparison is O(block length) for strings).</p>`,
    followUps: ['How would you reorder blocks to maximise expected hits given how often each block changes?', 'How do cache breakpoints change this model?'],
    tests: { sig: 'string[] string[] int[] -> int', fn: 'prefixHit', cases: [[[['sys', 'tools', 'doc', 'q1'], ['sys', 'tools', 'doc', 'q2'], [1000, 500, 3000, 20]], 4500], [[['time', 'sys'], ['time2', 'sys'], [10, 1000]], 0], [[[], ['a'], [5]], 0], [[['a', 'b'], ['a', 'b'], [3, 4]], 7], [[['a', 'b', 'c'], ['a', 'x', 'c'], [1, 2, 3]], 1], [[['a'], ['a', 'b'], [6, 9]], 6]] }
  })]
});

/* =====================================================================
   TOPIC 8 — Reasoning models, thinking budgets, and measuring context quality
   ===================================================================== */
topics.push({
  title: 'Reasoning Models, Thinking Budgets and Measuring Context Quality',
  analogy: `<p>Asking a friend for directions vs asking them to plan a road trip. For the first, an instant answer is best; making them sit and think for ten minutes just wastes time. For the second, thinking time pays off. A <b>thinking budget</b> is how long you let them think. And you only know the plan was good by <b>checking</b> it (did we arrive?), which is what evals do for context.</p>`,
  explain: `<p><b>Reasoning models</b> (OpenAI's o-series and GPT-5 family with reasoning, Claude with extended thinking, Gemini thinking models, DeepSeek-R1) generate hidden or summarised reasoning tokens before the answer. This is <b>test-time compute</b>: spending more computation per question at inference time to get better answers on hard problems.</p>
  ${H.table(['Provider control', 'How you set it (check current docs)'], [['OpenAI', '<code>reasoning.effort</code> (e.g. low / medium / high) on reasoning models'], ['Anthropic', 'extended thinking: <code>thinking: {type: "enabled", budget_tokens: N}</code>; newer models also offer an effort setting and adaptive thinking'], ['Google Gemini', 'a thinking budget / thinking level setting on thinking models']])}
  <p><b>Context cost of thinking.</b> Thinking tokens are billed as output tokens and count against <code>max_tokens</code>, so they must be in your output reserve. In multi-turn use, providers handle old thinking differently (Anthropic strips previous turns' thinking from the context by default, except inside a tool-use loop where it must be passed back), so thinking mostly costs output, latency and money rather than long-term window space.</p>
  <p><b>When to use more thinking:</b> multi-step maths, tricky code, planning, analysis over many constraints, agentic tasks that need careful tool choice. <b>When not to:</b> lookups, classification, extraction, chit-chat, anything latency-critical; extra thinking there adds seconds and cost for little or no gain, and can even "overthink" simple items. Accuracy usually rises roughly with the log of the budget, then flattens.</p>
  <p><b>Measuring context quality.</b> Every context decision in this module (what to retrieve, when to compact, how to order) is a hypothesis. Test it with evals:</p>
  <ul><li><b>Task success</b> on a fixed suite, with the context strategy as the only variable.</li><li><b>Long-context probes</b>: needle tests at several depths and lengths, plus multi-fact questions.</li><li><b>Compaction probes</b>: questions about early decisions asked after compaction.</li><li><b>Efficiency</b>: input tokens, cache hit rate, latency and cost per successful task.</li><li><b>Per-component ablation</b>: remove one block (examples, a document, the context file) and measure the drop.</li></ul>`,
  clues: ['"should we turn on extended thinking for everything?" → per-task, by eval; costs latency and output tokens', '"simple classification got slower and pricier after switching to a reasoning model" → lower effort or a non-reasoning model', '"hard multi-step bug fixes fail" → raise thinking budget / effort', '"how do you know your new context strategy is better?" → paired eval, same tasks, one variable', '"answer truncated with thinking enabled" → budget_tokens eats max_tokens'],
  code: { lang: 'python', title: 'Pick a thinking budget by expected value (runnable)', run: true, code: `# Eval results for one task type: accuracy (%) at each thinking budget.
budgets  = [0, 1024, 4096, 16384]
accuracy = [60, 75, 82, 84]
value_per_correct = 1.00      # dollars of business value per correct answer
cost_per_1k_think = 0.01      # dollars per 1k thinking (output) tokens
latency_s = [1.2, 3.5, 9.0, 31.0]

def net(i):
    return accuracy[i] / 100 * value_per_correct - budgets[i] / 1000 * cost_per_1k_think

for i, b in enumerate(budgets):
    print(f"budget {b:6d}: acc {accuracy[i]}%  net {net(i):.4f}  latency {latency_s[i]}s")
best = max(range(len(budgets)), key=lambda i: (net(i), -budgets[i]))
print("best budget:", budgets[best], "(check it also meets the latency SLO)")` },
  viz: {
    title: 'Accuracy, cost and latency as the thinking budget grows',
    input: '60, 75, 82, 84, 85', inputLabel: 'accuracy % measured at budgets 0, 1k, 4k, 16k, 32k',
    gen: function (input) {
      var acc = nums(input, '60, 75, 82, 84, 85', 5), B = [0, 1, 4, 16, 32], frames = [];
      while (acc.length < 5) acc.push(acc[acc.length - 1]);
      frames.push({ narr: 'We ran the same eval suite at 5 thinking budgets. Watch accuracy, then the price we pay for it.', parts: [{ type: 'array', label: 'budget (k thinking tokens)', values: B }] });
      for (var i = 0; i < 5; i++) {
        var hl = {}; hl[i] = 'cur';
        var gain = i ? acc[i] - acc[i - 1] : 0;
        frames.push({ narr: 'Budget <b>' + B[i] + 'k</b>: accuracy ' + acc[i] + '%' + (i ? ' (' + (gain >= 0 ? '+' : '') + gain + ' points for ' + (B[i] - B[i - 1]) + 'k more tokens)' : ' with no thinking') + '. ' + (i >= 3 ? 'Gains are flattening: each extra point now costs many more tokens and seconds.' : ''), parts: [{ type: 'bars', label: 'accuracy %', values: acc.slice(0, i + 1), idxLabels: B.slice(0, i + 1).map(function (b) { return b + 'k'; }), hl: hl }, { type: 'vars', vals: { budget: B[i] + 'k', extra_cost_per_1k_q: '$' + (B[i] * 10 / 1000 * 1000 / 1000).toFixed(2) } }] });
      }
      frames.push({ narr: 'Pick the <b>knee</b>: the smallest budget that meets your accuracy bar and latency SLO. Route easy requests to no-thinking and hard ones to a higher budget.', parts: [{ type: 'text', html: '<p>Decide with an eval, per task type. One global "max thinking" setting is almost never right.</p>' }] });
      return frames;
    }
  },
  examples: [
    { title: 'Routing by difficulty', html: `${H.table(['Request type', 'Share', 'Setting'], [['FAQ / lookup', '70%', 'no thinking, small model'], ['Account troubleshooting', '25%', 'low effort / ~2k budget'], ['Complex billing dispute analysis', '5%', 'high effort / ~16k budget']])}<p>Average latency stays low while the hard 5% get the compute they need.</p>` },
    { title: 'The truncated answer', html: `<p><code>max_tokens</code> = 4,000 with a thinking budget of 3,500: after thinking, only 500 tokens remain for the answer, which gets cut off. Set max_tokens = thinking budget + expected answer length.</p>` },
    { title: 'A paired context eval', html: `${H.table(['Variant', 'Success', 'Avg input tokens', 'Cost / success'], [['Full history', '78%', '61k', '$0.21'], ['Compaction at 60k', '81%', '24k', '$0.08'], ['Compaction + clear tool results', '83%', '15k', '$0.05']])}<p>Same 150 tasks, three runs each, only the context policy changed.</p>` },
    { title: 'Ablating the few-shot examples', html: `<p>Removing 6 few-shot examples (3k tokens) dropped format-correctness from 99% to 97% but did not change accuracy. Keeping 2 examples kept 99%. Ablation turned a guess into a measured 2k-token saving.</p>` }
  ],
  deepDive: `<p><b>Thinking and context interact.</b> Reasoning helps the model sift a long context, but it does not fix missing or misleading context; garbage in, longer garbage out. Interleaved thinking (reasoning between tool calls) helps agents decide what to load next, which makes JIT retrieval more reliable.</p>
  <p><b>Overthinking and variance.</b> More budget raises average accuracy on hard tasks but can hurt on easy ones and increases latency variance. Report p50 and p95 latency per budget, not just the mean. Run each eval case several times because reasoning outputs vary.</p>
  <p><b>Designing context evals.</b> (1) Freeze a task set that reflects production, including long sessions. (2) Change one variable at a time (retrieval k, compaction threshold, ordering, context file). (3) Grade with code where possible (tests pass, correct record changed), with calibrated LLM judges for open answers. (4) Track efficiency metrics next to quality: tokens per successful task, cache hit rate, steps per task. (5) Keep past production failures as regression cases.</p>
  <p><b>Statistics.</b> With 100 tasks, a 3-point difference is usually noise; use paired comparisons on the same tasks and a confidence interval (or a sign test on tasks that flip) before declaring a winner.</p>`,
  aiEra: `<p><b>What changed:</b> since late 2024 test-time compute became a main lever alongside model size; most frontier models now have a dial for how hard to think, and some decide adaptively. Context engineering and thinking budgets are tuned together: a cleaner context often lets you use a lower budget.</p>
  <p><b>Working with AI:</b> have an assistant generate eval variants and analyse traces, but keep the grading rules and the go/no-go decision yourself. <b>What you still own:</b> which tasks deserve expensive thinking, the latency and cost targets, and an honest eval that proves each context change helped rather than just felt better.</p>`,
  problems: [mk({
    title: 'Choose the Thinking Budget with the Best Net Value', level: 'Medium', tags: ['reasoning', 'thinking budget', 'evals'],
    statement: `<p>An eval measured <code>accuracy[i]</code> (percent) at thinking budget <code>budgets[i]</code> (tokens). Each correct answer is worth <code>value</code> cents, and thinking costs <code>cost_per_1k</code> cents per 1,000 thinking tokens. Net value per request = accuracy/100 × value − budget/1000 × cost_per_1k. Return the budget with the highest net value; on a tie return the <b>smaller</b> budget.</p>`,
    constraints: `1 ≤ n ≤ 100; budgets are distinct, non-negative and sorted ascending; 0 ≤ accuracy ≤ 100; value, cost ≥ 0. Use exact integer arithmetic to avoid float ties going wrong.`,
    example: `<p>budgets [0, 1024, 4096, 16384], accuracy [60, 75, 82, 84], value 100, cost 1 → nets 60, 73.976, 77.904, 67.616 → ${H.c('g', '4096')}.</p>`,
    bruteWhy: `<p>Always choose the highest-accuracy budget. It ignores cost: here 16384 gives +2 points over 4096 but costs 12k more thinking tokens per request.</p>`,
    bruteCode: `def best_by_accuracy(budgets, accuracy, value, cost_per_1k):
    return budgets[max(range(len(budgets)), key=lambda i: accuracy[i])]`,
    mcq: { q: 'Two budgets have the same net value. Which do you prefer?', options: ['The larger one', 'The smaller one: same value, lower latency', 'Either, flip a coin', 'Neither'], answer: 1, explain: 'Equal value but lower latency and less variance makes the smaller budget better.' },
    hints: ['<p>Hint 1: compute a net value per budget and take the maximum.</p>', '<p>Hint 2: multiply both terms by 100,000 so everything is an integer: acc × value × 1000 − budget × cost × 100.</p>', '<p>Hint 3: scan in ascending budget order and replace the best only when strictly greater, so ties keep the smaller budget.</p>'],
    approach: `<p>Scale net value by 100,000 to stay in integers: <code>score = acc·value·1000 − budget·cost·100</code>. Scan budgets in ascending order, updating the best only on a strictly greater score, which resolves ties toward the smaller budget.</p>`,
    code: `def best_budget(budgets, accuracy, value, cost_per_1k):
    best_b, best_score = None, None
    for b, acc in zip(budgets, accuracy):
        # net * 100000 = acc/100*value*100000 - b/1000*cost*100000
        score = acc * value * 1000 - b * cost_per_1k * 100
        if best_score is None or score > best_score:   # strict: ties keep the smaller budget
            best_b, best_score = b, score
    return best_b`, alt: [
      { lang: 'java', code: `class Solution {
    public int bestBudget(int[] budgets, int[] accuracy, int value, int costPer1k) {
        int bestB = 0;
        long bestScore = Long.MIN_VALUE;
        boolean found = false;
        for (int i = 0; i < Math.min(budgets.length, accuracy.length); i++) {
            // net * 100000 = acc/100*value*100000 - b/1000*cost*100000, in exact integers
            long score = (long) accuracy[i] * value * 1000 - (long) budgets[i] * costPer1k * 100;
            if (!found || score > bestScore) {   // strict: ties keep the smaller budget
                bestB = budgets[i];
                bestScore = score;
                found = true;
            }
        }
        return bestB;
    }
}` },
      { lang: 'js', code: `function bestBudget(budgets, accuracy, value, costPer1k) {
  let bestB = null, bestScore = null;
  for (let i = 0; i < Math.min(budgets.length, accuracy.length); i++) {
    // net * 100000 = acc/100*value*100000 - b/1000*cost*100000, in exact integers
    const score = accuracy[i] * value * 1000 - budgets[i] * costPer1k * 100;
    if (bestScore === null || score > bestScore) {   // strict: ties keep the smaller budget
      bestB = budgets[i];
      bestScore = score;
    }
  }
  return bestB;
}` },
      { lang: 'cpp', code: `class Solution {
public:
    int bestBudget(vector<int>& budgets, vector<int>& accuracy, int value, int costPer1k) {
        int bestB = 0;
        long long bestScore = 0;
        bool found = false;
        for (size_t i = 0; i < min(budgets.size(), accuracy.size()); i++) {
            // net * 100000 = acc/100*value*100000 - b/1000*cost*100000, in exact integers
            long long score = (long long)accuracy[i] * value * 1000 - (long long)budgets[i] * costPer1k * 100;
            if (!found || score > bestScore) {   // strict: ties keep the smaller budget
                bestB = budgets[i];
                bestScore = score;
                found = true;
            }
        }
        return bestB;
    }
};` },
      { lang: 'csharp', code: `public class Solution {
    public int BestBudget(int[] budgets, int[] accuracy, int value, int costPer1k) {
        int bestB = 0;
        long bestScore = 0;
        bool found = false;
        for (int i = 0; i < Math.Min(budgets.Length, accuracy.Length); i++) {
            // net * 100000 = acc/100*value*100000 - b/1000*cost*100000, in exact integers
            long score = (long)accuracy[i] * value * 1000 - (long)budgets[i] * costPer1k * 100;
            if (!found || score > bestScore) {   // strict: ties keep the smaller budget
                bestB = budgets[i];
                bestScore = score;
                found = true;
            }
        }
        return bestB;
    }
}` }
    ],
    complexity: `<p>O(n) time, O(1) space.</p>`,
    followUps: ['How would you add a p95 latency constraint?', 'How many eval tasks do you need before trusting a 2-point accuracy difference?'],
    tests: { sig: 'int[] int[] int int -> int', fn: 'bestBudget', cases: [[[[0, 1024, 4096, 16384], [60, 75, 82, 84], 100, 1], 4096], [[[0, 1024, 4096, 16384], [60, 75, 82, 84], 100, 5], 1024], [[[0, 1024, 4096, 16384], [60, 75, 82, 84], 100, 0], 16384], [[[0, 1024, 4096, 16384], [60, 75, 82, 84], 0, 1], 0], [[[2048], [50], 10, 1], 2048], [[[0, 1000], [50, 51], 100, 1], 0]] }
  })]
});

/* =====================================================================
   PRACTICE ARENA
   ===================================================================== */
practice.push(mk({
  title: 'Does the Request Fit the Window?', level: 'Easy', tags: ['context window', 'budget'],
  statement: `<p>Return <code>True</code> if the input component sizes plus the reserved <code>max_output</code> fit within <code>window</code> tokens (total ≤ window), else <code>False</code>.</p>`,
  constraints: `0 ≤ window, max_output ≤ 10<sup>7</sup>; 0 ≤ len(sizes) ≤ 10<sup>5</sup>.`,
  example: `<p>window 1000, sizes [200, 300], max_output 500 → 1000 ≤ 1000 → ${H.c('g', 'True')}. With max_output 501 → ${H.c('r', 'False')}.</p>`,
  bruteWhy: `<p>Checking only the input (sum(sizes) ≤ window) forgets that output shares the window, so the call fails or the answer is cut.</p>`,
  bruteCode: `def fits_naive(window, sizes, max_output):
    return sum(sizes) <= window   # forgets the output reserve`,
  mcq: { q: 'On most chat APIs, what shares the context window with your input?', options: ['Nothing', 'The generated output (and thinking)', 'Only the system prompt', 'The cache'], answer: 1, explain: 'Input and output tokens together must fit the window.' },
  hints: ['<p>Hint 1: two things consume the window: the input and the reserved output.</p>', '<p>Hint 2: add the input sizes and the output reserve into one total.</p>', '<p>Hint 3: compare with ≤, not &lt;. An empty input with max_output larger than the window still does not fit.</p>'],
  approach: `<p>Return <code>sum(sizes) + max_output ≤ window</code>. The reserve must be counted because output tokens are generated into the same window; ignoring it is the classic cause of truncated answers and "context length exceeded" errors in production.</p>`,
  code: `def fits(window, sizes, max_output):
    return sum(sizes) + max_output <= window`, alt: [
      { lang: 'java', code: `class Solution {
    public boolean fits(int window, int[] sizes, int maxOutput) {
        long total = maxOutput;
        for (int s : sizes) total += s;
        return total <= window;
    }
}` },
      { lang: 'js', code: `function fits(window, sizes, maxOutput) {
  return sizes.reduce((s, x) => s + x, 0) + maxOutput <= window;
}` },
      { lang: 'cpp', code: `class Solution {
public:
    bool fits(int window, vector<int>& sizes, int maxOutput) {
        long long total = maxOutput;
        for (int s : sizes) total += s;
        return total <= window;
    }
};` },
      { lang: 'csharp', code: `public class Solution {
    public bool Fits(int window, int[] sizes, int maxOutput) {
        long total = maxOutput;
        foreach (int s in sizes) total += s;
        return total <= window;
    }
}` }
    ],
  complexity: `<p>O(n) time, O(1) extra space.</p>`,
  tests: { sig: 'int int[] int -> bool', fn: 'fits', cases: [[[1000, [200, 300], 500], true], [[1000, [200, 300], 501], false], [[0, [], 0], true], [[100, [], 101], false], [[128000, [100000, 20000], 8000], true], [[10, [5, 5], 1], false]] }
}));

practice.push(mk({
  title: 'Clear Old Tool Results', level: 'Easy', tags: ['tool-result clearing', 'compaction'],
  statement: `<p>A transcript has message <code>kinds</code> ("user", "assistant", "tool") and token <code>sizes</code>. Keep the last <code>keep_last</code> tool results unchanged and replace the size of every <b>older</b> tool result with <code>placeholder</code> tokens. Other messages are unchanged. Return the new sizes.</p>`,
  constraints: `0 ≤ n ≤ 10<sup>5</sup>; keep_last ≥ 0; if there are at most keep_last tool results, nothing changes.`,
  example: `<p>kinds [user, tool, assistant, tool, tool], sizes [50, 4000, 100, 3000, 2000], keep_last 1, placeholder 10 → tools at 1, 3, 4; keep index 4 → ${H.c('g', '[50, 10, 100, 10, 2000]')}.</p>`,
  bruteWhy: `<p>Clearing the first keep_last tool results instead of all but the last keeps the stale ones and throws away the fresh ones the agent is still using.</p>`,
  bruteCode: `def clear_wrong_end(kinds, sizes, keep_last, placeholder):
    out, seen = list(sizes), 0
    for i, k in enumerate(kinds):
        if k == "tool":
            seen += 1
            if seen > keep_last:      # wrong: clears the NEWEST ones
                out[i] = placeholder
    return out`,
  mcq: { q: 'Which tool results should stay in full?', options: ['The oldest ones', 'The most recent ones', 'The largest ones', 'None'], answer: 1, explain: 'The agent is most likely still acting on recent results; old ones have been used already.' },
  hints: ['<p>Hint 1: first collect the indices of all tool messages.</p>', '<p>Hint 2: every tool index except the last keep_last of them gets cleared.</p>', '<p>Hint 3: be careful with keep_last = 0: slicing with [:-0] gives an empty list in Python.</p>'],
  approach: `<p>Collect tool indices <code>t</code>. The ones to clear are <code>t[:len(t) − keep_last]</code> (empty if keep_last ≥ len(t)). Copy sizes and set those positions to the placeholder size. Using an explicit length avoids the <code>[:-0]</code> trap, which would clear nothing when keep_last is 0.</p>`,
  code: `def clear_tool_results(kinds, sizes, keep_last, placeholder):
    out = list(sizes)
    tools = [i for i, k in enumerate(kinds) if k == "tool"]
    for i in tools[:max(0, len(tools) - keep_last)]:   # all but the newest keep_last
        out[i] = placeholder
    return out`, alt: [
      { lang: 'java', code: `class Solution {
    public int[] clearToolResults(String[] kinds, int[] sizes, int keepLast, int placeholder) {
        int[] out = sizes.clone();
        List<Integer> tools = new ArrayList<>();
        for (int i = 0; i < kinds.length; i++) if (kinds[i].equals("tool")) tools.add(i);
        int clear = Math.max(0, tools.size() - keepLast);   // all but the newest keepLast
        for (int j = 0; j < Math.min(clear, tools.size()); j++) out[tools.get(j)] = placeholder;
        return out;
    }
}` },
      { lang: 'js', code: `function clearToolResults(kinds, sizes, keepLast, placeholder) {
  const out = sizes.slice();
  const tools = [];
  kinds.forEach((k, i) => { if (k === 'tool') tools.push(i); });
  const clear = Math.max(0, tools.length - keepLast);       // all but the newest keepLast
  for (const i of tools.slice(0, clear)) out[i] = placeholder;
  return out;
}` },
      { lang: 'cpp', code: `class Solution {
public:
    vector<int> clearToolResults(vector<string>& kinds, vector<int>& sizes, int keepLast, int placeholder) {
        vector<int> out = sizes;
        vector<int> tools;
        for (int i = 0; i < (int)kinds.size(); i++) if (kinds[i] == "tool") tools.push_back(i);
        int clear = max(0, (int)tools.size() - keepLast);    // all but the newest keepLast
        for (int j = 0; j < min(clear, (int)tools.size()); j++) out[tools[j]] = placeholder;
        return out;
    }
};` },
      { lang: 'csharp', code: `public class Solution {
    public int[] ClearToolResults(string[] kinds, int[] sizes, int keepLast, int placeholder) {
        int[] output = (int[])sizes.Clone();
        var tools = new List<int>();
        for (int i = 0; i < kinds.Length; i++) if (kinds[i] == "tool") tools.Add(i);
        int clear = Math.Max(0, tools.Count - keepLast);    // all but the newest keepLast
        for (int j = 0; j < Math.Min(clear, tools.Count); j++) output[tools[j]] = placeholder;
        return output;
    }
}` }
    ],
  complexity: `<p>O(n) time and space.</p>`,
  tests: { sig: 'string[] int[] int int -> int[]', fn: 'clearToolResults', cases: [[[['user', 'tool', 'assistant', 'tool', 'tool'], [50, 4000, 100, 3000, 2000], 1, 10], [50, 10, 100, 10, 2000]], [[['user', 'tool', 'assistant', 'tool', 'tool'], [50, 4000, 100, 3000, 2000], 3, 10], [50, 4000, 100, 3000, 2000]], [[['user', 'tool', 'assistant', 'tool', 'tool'], [50, 4000, 100, 3000, 2000], 0, 10], [50, 10, 100, 10, 10]], [[[], [], 2, 5], []], [[['user'], [7], 0, 1], [7]], [[['tool', 'tool'], [5, 500], 1, 20], [20, 500]]] }
}));

practice.push(mk({
  title: 'Is the Prompt Cache-Friendly?', level: 'Easy', tags: ['prompt caching', 'ordering'],
  statement: `<p>Each prompt block is labelled "static" (identical across requests) or "dynamic" (changes per request). Return <code>True</code> if every static block comes before every dynamic block, so the whole static part can be a cached prefix.</p>`,
  constraints: `0 ≤ n ≤ 10<sup>5</sup>.`,
  example: `<p>[static, dynamic, static] → the last static block sits after a dynamic one and will never be cached → ${H.c('r', 'False')}.</p>`,
  bruteWhy: `<p>Counting static blocks (e.g. "most blocks are static") says nothing about order, which is all that matters for a prefix cache.</p>`,
  bruteCode: `def cache_friendly_naive(blocks):
    return blocks.count("static") >= blocks.count("dynamic")   # ignores order`,
  mcq: { q: 'A timestamp block is first, then 20k tokens of static docs. Cached tokens?', options: ['About 20k', 'About 0', 'Half', 'Depends on the model only'], answer: 1, explain: 'The first block differs every request, so the prefix match ends immediately.' },
  hints: ['<p>Hint 1: scan the blocks once from left to right, in prompt order.</p>', '<p>Hint 2: remember whether you have already seen a dynamic block.</p>', '<p>Hint 3: a static block after any dynamic one makes the answer False; empty or single lists are fine.</p>'],
  approach: `<p>Scan once with a flag <code>seen_dynamic</code>. On "dynamic" set the flag; on "static" with the flag set, return False. Return True at the end. This is exactly the condition for the static part to be one contiguous cached prefix.</p>`,
  code: `def cache_friendly(blocks):
    seen_dynamic = False
    for b in blocks:
        if b == "dynamic":
            seen_dynamic = True
        elif seen_dynamic:          # static block after a dynamic one
            return False
    return True`, alt: [
      { lang: 'java', code: `class Solution {
    public boolean cacheFriendly(String[] blocks) {
        boolean seenDynamic = false;
        for (String b : blocks) {
            if (b.equals("dynamic")) seenDynamic = true;
            else if (seenDynamic) return false;   // static block after a dynamic one
        }
        return true;
    }
}` },
      { lang: 'js', code: `function cacheFriendly(blocks) {
  let seenDynamic = false;
  for (const b of blocks) {
    if (b === 'dynamic') seenDynamic = true;
    else if (seenDynamic) return false;   // static block after a dynamic one
  }
  return true;
}` },
      { lang: 'cpp', code: `class Solution {
public:
    bool cacheFriendly(vector<string>& blocks) {
        bool seenDynamic = false;
        for (auto& b : blocks) {
            if (b == "dynamic") seenDynamic = true;
            else if (seenDynamic) return false;   // static block after a dynamic one
        }
        return true;
    }
};` },
      { lang: 'csharp', code: `public class Solution {
    public bool CacheFriendly(string[] blocks) {
        bool seenDynamic = false;
        foreach (string b in blocks) {
            if (b == "dynamic") seenDynamic = true;
            else if (seenDynamic) return false;   // static block after a dynamic one
        }
        return true;
    }
}` }
    ],
  complexity: `<p>O(n) time, O(1) extra space for the flag.</p>`,
  tests: { sig: 'string[] -> bool', fn: 'cacheFriendly', cases: [[[['static', 'static', 'dynamic']], true], [[['static', 'dynamic', 'static']], false], [[[]], true], [[['dynamic']], true], [[['dynamic', 'static']], false], [[['static']], true], [[['static', 'dynamic', 'dynamic']], true]] }
}));

practice.push(mk({
  title: 'Count Compaction Events in a Long Session', level: 'Medium', tags: ['compaction', 'simulation'],
  statement: `<p>Turns arrive one by one (<code>turns</code>, token sizes). After appending each turn, if the context total is <b>greater than</b> <code>threshold</code> and the context has more than <code>keep_recent</code> items, compact: the context becomes [<code>summary</code>] followed by its last <code>keep_recent</code> items (a previous summary counts as an item). Return how many compactions happen.</p>`,
  constraints: `0 ≤ len(turns) ≤ 10<sup>5</sup>; keep_recent ≥ 0. If compaction does not bring the total under the threshold, just continue.`,
  example: `<p>turns [400 × 6], threshold 1000, keep 1, summary 100: 400, 800, 1200 → compact to [100, 400]; 900; 1300 → compact; 900 → ${H.c('g', '2')}.</p>`,
  bruteWhy: `<p>Estimating "total tokens ÷ threshold" ignores that each compaction leaves a summary plus recent turns behind, so it miscounts.</p>`,
  bruteCode: `def compactions_guess(turns, threshold, keep_recent, summary):
    return sum(turns) // threshold if threshold else 0   # a guess, not a simulation`,
  mcq: { q: 'Why simulate instead of using a formula?', options: ['Formulas are always wrong', 'The state after each compaction (summary + recent turns) changes when the next one fires', 'Simulation is faster', 'Thresholds are random'], answer: 1, explain: 'Each compaction leaves residue that affects the next trigger point.' },
  hints: ['<p>Hint 1: keep the current context as a list and its running total.</p>', '<p>Hint 2: after each append, test both conditions: over threshold and more than keep_recent items.</p>', '<p>Hint 3: rebuild as [summary] + last keep_recent items (careful with keep_recent = 0), recompute the total, count it.</p>'],
  approach: `<p>Simulate. Maintain <code>ctx</code>; for each turn append, and if <code>sum(ctx) &gt; threshold</code> and <code>len(ctx) &gt; keep_recent</code>, set <code>ctx = [summary] + ctx[len(ctx) − keep_recent:]</code> and increment the counter. A single giant turn with keep_recent ≥ 1 never compacts on its own because there is nothing older to summarise.</p>`,
  code: `def compaction_events(turns, threshold, keep_recent, summary):
    ctx, count = [], 0
    for t in turns:
        ctx.append(t)
        if sum(ctx) > threshold and len(ctx) > keep_recent:
            ctx = [summary] + ctx[len(ctx) - keep_recent:]   # explicit start avoids [-0:]
            count += 1
    return count`, alt: [
      { lang: 'java', code: `class Solution {
    public int compactionEvents(int[] turns, int threshold, int keepRecent, int summary) {
        List<Integer> ctx = new ArrayList<>();
        int count = 0;
        for (int t : turns) {
            ctx.add(t);
            long total = 0;
            for (int x : ctx) total += x;
            if (total > threshold && ctx.size() > keepRecent) {
                List<Integer> next = new ArrayList<>();
                next.add(summary);
                next.addAll(ctx.subList(ctx.size() - keepRecent, ctx.size()));   // explicit start
                ctx = next;
                count++;
            }
        }
        return count;
    }
}` },
      { lang: 'js', code: `function compactionEvents(turns, threshold, keepRecent, summary) {
  let ctx = [], count = 0;
  for (const t of turns) {
    ctx.push(t);
    const total = ctx.reduce((s, x) => s + x, 0);
    if (total > threshold && ctx.length > keepRecent) {
      ctx = [summary, ...ctx.slice(ctx.length - keepRecent)];   // explicit start avoids slice(-0)
      count++;
    }
  }
  return count;
}` },
      { lang: 'cpp', code: `class Solution {
public:
    int compactionEvents(vector<int>& turns, int threshold, int keepRecent, int summary) {
        vector<int> ctx;
        int count = 0;
        for (int t : turns) {
            ctx.push_back(t);
            long long total = 0;
            for (int x : ctx) total += x;
            if (total > threshold && (int)ctx.size() > keepRecent) {
                vector<int> next{summary};
                next.insert(next.end(), ctx.end() - keepRecent, ctx.end());
                ctx = next;
                count++;
            }
        }
        return count;
    }
};` },
      { lang: 'csharp', code: `public class Solution {
    public int CompactionEvents(int[] turns, int threshold, int keepRecent, int summary) {
        var ctx = new List<int>();
        int count = 0;
        foreach (int t in turns) {
            ctx.Add(t);
            long total = 0;
            foreach (int x in ctx) total += x;
            if (total > threshold && ctx.Count > keepRecent) {
                var next = new List<int> { summary };
                next.AddRange(ctx.GetRange(ctx.Count - keepRecent, keepRecent));   // explicit start
                ctx = next;
                count++;
            }
        }
        return count;
    }
}` }
    ],
  complexity: `<p>O(n × k) with k the context length (small after compaction); keep a running total for O(n).</p>`,
  tests: { sig: 'int[] int int int -> int', fn: 'compactionEvents', cases: [[[[400, 400, 400], 1000, 1, 100], 1], [[[400, 400, 400, 400, 400, 400], 1000, 1, 100], 2], [[[], 1000, 1, 100], 0], [[[2000], 1000, 1, 100], 0], [[[2000, 10], 1000, 1, 100], 1], [[[600, 600, 600], 1000, 0, 100], 1]] }
}));

practice.push(mk({
  title: 'Pre-Loading vs Just-in-Time: Token Bill', level: 'Medium', tags: ['jit retrieval', 'cost'],
  statement: `<p>A corpus has files with token <code>sizes</code>. Pre-loading puts every file in the prompt. Just-in-time shows an index costing <b>10 tokens per file</b>, then reads only the files whose indices are in <code>needed</code> (distinct). Return <code>[preload_tokens, jit_tokens]</code>.</p>`,
  constraints: `0 ≤ files ≤ 10<sup>5</sup>; needed indices are valid and distinct.`,
  example: `<p>sizes [1000, 2000, 3000], needed [1] → preload 6000; JIT 3 × 10 + 2000 = 2030 → ${H.c('g', '[6000, 2030]')}.</p>`,
  bruteWhy: `<p>Comparing only the needed files with the whole corpus forgets the index cost; for tiny corpora the index can make JIT more expensive.</p>`,
  bruteCode: `def bill_naive(sizes, needed):
    return [sum(sizes), sum(sizes[i] for i in needed)]   # forgets the index`,
  mcq: { q: 'A corpus of 4 tiny files of 5 tokens each, nothing needed. Which is cheaper?', options: ['JIT', 'Pre-loading', 'Equal', 'Cannot tell'], answer: 1, explain: 'Preload costs 20; the JIT index alone costs 40.' },
  hints: ['<p>Hint 1: the pre-load bill is the sum of all sizes.</p>', '<p>Hint 2: the JIT bill has two parts: a fixed index cost per file and the files actually read.</p>', '<p>Hint 3: 10 × len(sizes) + sum of sizes at the needed indices. Empty corpus gives [0, 0].</p>'],
  approach: `<p>Preload = Σ sizes. JIT = 10·len(sizes) + Σ sizes[i] for i in needed. The comparison shows JIT wins when the needed fraction is small and files are large, and loses for tiny corpora where the index overhead dominates.</p>`,
  code: `def jit_vs_preload(sizes, needed):
    preload = sum(sizes)
    jit = 10 * len(sizes) + sum(sizes[i] for i in needed)
    return [preload, jit]`, alt: [
      { lang: 'java', code: `class Solution {
    public int[] jitVsPreload(int[] sizes, int[] needed) {
        int preload = 0;
        for (int s : sizes) preload += s;
        int jit = 10 * sizes.length;          // one short reference per item
        for (int i : needed) jit += sizes[i];
        return new int[] { preload, jit };
    }
}` },
      { lang: 'js', code: `function jitVsPreload(sizes, needed) {
  const preload = sizes.reduce((s, x) => s + x, 0);
  const jit = 10 * sizes.length + needed.reduce((s, i) => s + sizes[i], 0);
  return [preload, jit];
}` },
      { lang: 'cpp', code: `class Solution {
public:
    vector<int> jitVsPreload(vector<int>& sizes, vector<int>& needed) {
        int preload = accumulate(sizes.begin(), sizes.end(), 0);
        int jit = 10 * (int)sizes.size();     // one short reference per item
        for (int i : needed) jit += sizes[i];
        return {preload, jit};
    }
};` },
      { lang: 'csharp', code: `public class Solution {
    public int[] JitVsPreload(int[] sizes, int[] needed) {
        int preload = sizes.Sum();
        int jit = 10 * sizes.Length;          // one short reference per item
        foreach (int i in needed) jit += sizes[i];
        return new[] { preload, jit };
    }
}` }
    ],
  complexity: `<p>O(n + k) for n files and k needed indices.</p>`,
  tests: { sig: 'int[] int[] -> int[]', fn: 'jitVsPreload', cases: [[[[1000, 2000, 3000], [1]], [6000, 2030]], [[[], []], [0, 0]], [[[50], [0]], [50, 60]], [[[5, 5, 5, 5], []], [20, 40]], [[[100, 200], [0, 1]], [300, 320]], [[[400, 600, 800, 1000], [3, 0]], [2800, 1440]]] }
}));

practice.push(mk({
  title: 'Apply Note Operations to an External Memory File', level: 'Medium', tags: ['structured notes', 'memory'],
  statement: `<p>An agent keeps notes outside its context. Each op is <code>"set KEY VALUE"</code> (VALUE has no spaces) or <code>"del KEY"</code> (deleting a missing key does nothing). Apply the ops in order and return the notes as <code>"KEY=VALUE"</code> strings sorted by key: the exact text re-injected into context after a reset.</p>`,
  constraints: `0 ≤ ops ≤ 10<sup>5</sup>; keys and values are non-empty tokens without spaces.`,
  example: `<p>["set goal ship", "set step 3", "set step 4"] → step is overwritten → ${H.c('g', '["goal=ship", "step=4"]')}.</p>`,
  bruteWhy: `<p>Appending every op to a log and re-injecting the whole log grows without bound and shows stale values ("step 3") next to current ones, which confuses the model.</p>`,
  bruteCode: `def notes_as_log(ops):
    return list(ops)    # the whole history, stale values included`,
  mcq: { q: 'Why store notes as a key-value state rather than an append-only log in the prompt?', options: ['Logs cannot be stored', 'The prompt only needs the current state, which stays small and unambiguous', 'Key-value is encrypted', 'Models cannot read logs'], answer: 1, explain: 'Current state is compact; history can live in storage if you need it.' },
  hints: ['<p>Hint 1: a dictionary is the natural store.</p>', '<p>Hint 2: split each op on spaces; the first word tells you what to do.</p>', '<p>Hint 3: use pop(key, None) for deletes, then sort the keys when rendering.</p>'],
  approach: `<p>Keep a dict. For <code>set k v</code> assign; for <code>del k</code> pop if present. At the end render <code>f"{k}={v}"</code> for keys in sorted order. Deterministic sorted output also keeps the injected notes block stable, which is friendlier to prompt caching.</p>`,
  code: `def apply_notes(ops):
    notes = {}
    for op in ops:
        parts = op.split()
        if parts[0] == "set":
            notes[parts[1]] = parts[2]
        elif parts[0] == "del":
            notes.pop(parts[1], None)       # deleting a missing key is fine
    return [f"{k}={notes[k]}" for k in sorted(notes)]`, alt: [
      { lang: 'java', code: `class Solution {
    public String[] applyNotes(String[] ops) {
        TreeMap<String, String> notes = new TreeMap<>();   // sorted by key, like sorted(notes)
        for (String op : ops) {
            String[] parts = op.trim().split("\\\\s+");
            if (parts[0].equals("set")) notes.put(parts[1], parts[2]);
            else if (parts[0].equals("del")) notes.remove(parts[1]);   // deleting a missing key is fine
        }
        List<String> out = new ArrayList<>();
        for (Map.Entry<String, String> e : notes.entrySet()) out.add(e.getKey() + "=" + e.getValue());
        return out.toArray(new String[0]);
    }
}` },
      { lang: 'js', code: `function applyNotes(ops) {
  const notes = new Map();
  for (const op of ops) {
    const parts = op.trim().split(/\\s+/);
    if (parts[0] === 'set') notes.set(parts[1], parts[2]);
    else if (parts[0] === 'del') notes.delete(parts[1]);   // deleting a missing key is fine
  }
  // Default sort compares UTF-16 code units, which matches Python for these keys.
  return [...notes.keys()].sort().map((k) => k + '=' + notes.get(k));
}` },
      { lang: 'cpp', code: `class Solution {
public:
    vector<string> applyNotes(vector<string>& ops) {
        map<string, string> notes;   // sorted by key, like sorted(notes)
        for (auto& op : ops) {
            istringstream in(op);
            vector<string> parts;
            string w;
            while (in >> w) parts.push_back(w);
            if (parts[0] == "set") notes[parts[1]] = parts[2];
            else if (parts[0] == "del") notes.erase(parts[1]);   // deleting a missing key is fine
        }
        vector<string> out;
        for (auto& kv : notes) out.push_back(kv.first + "=" + kv.second);
        return out;
    }
};` },
      { lang: 'csharp', code: `public class Solution {
    public string[] ApplyNotes(string[] ops) {
        var notes = new SortedDictionary<string, string>(StringComparer.Ordinal);   // ordinal = Python's order
        foreach (string op in ops) {
            string[] parts = op.Split((char[])null, StringSplitOptions.RemoveEmptyEntries);
            if (parts[0] == "set") notes[parts[1]] = parts[2];
            else if (parts[0] == "del") notes.Remove(parts[1]);   // deleting a missing key is fine
        }
        return notes.Select(kv => kv.Key + "=" + kv.Value).ToArray();
    }
}` }
    ],
  complexity: `<p>O(n + m log m) for n ops and m final keys.</p>`,
  tests: { sig: 'string[] -> string[]', fn: 'applyNotes', cases: [[[['set goal ship', 'set step 3', 'set step 4']], ['goal=ship', 'step=4']], [[[]], []], [[['set a 1', 'del a']], []], [[['del x']], []], [[['set b 2', 'set a 1']], ['a=1', 'b=2']], [[['set k v', 'del k', 'set k w']], ['k=w']]] }
}));

practice.push(mk({
  title: 'Cost With and Without Prompt Caching', level: 'Medium', tags: ['prompt caching', 'cost'],
  statement: `<p>n requests share a <code>prefix</code> of tokens and each has its own <code>suffix</code>. Cost is measured in "input-token units". Without caching each request costs prefix + suffix. With caching the first request writes the prefix at <code>write_pct</code>% of normal price and later requests read it at <code>read_pct</code>%; suffixes are always full price. Return <code>[without, with]</code>, where the cached prefix part is summed first and then integer-divided by 100. If n = 0 return [0, 0].</p>`,
  constraints: `0 ≤ prefix, suffix ≤ 10<sup>6</sup>; 0 ≤ n ≤ 10<sup>4</sup>; percentages are integers.`,
  example: `<p>prefix 10000, suffix 500, n 10, read 10%, write 125% → without 10 × 10500 = 105000; with (10000·125 + 9·10000·10) / 100 + 10·500 = 21500 + 5000 → ${H.c('g', '[105000, 26500]')}.</p>`,
  bruteWhy: `<p>Applying the read discount to every request, including the first, ignores the cache-write premium. For a one-off request caching actually costs more.</p>`,
  bruteCode: `def cost_naive(prefix, suffix, n, read_pct, write_pct):
    return [n * (prefix + suffix), n * (prefix * read_pct // 100 + suffix)]`,
  mcq: { q: 'With a 125% write premium, when does caching lose money?', options: ['When the prefix is read only once', 'Always', 'Never', 'When suffix > prefix'], answer: 0, explain: 'A single request pays the premium and never gets a discounted read.' },
  hints: ['<p>Hint 1: "without" is just n times the full prompt.</p>', '<p>Hint 2: "with" = one prefix write at write_pct, (n − 1) prefix reads at read_pct, plus n full-price suffixes.</p>', '<p>Hint 3: sum the prefix parts in percent units, divide by 100 once, then add the suffixes. Handle n = 0 first.</p>'],
  approach: `<p>If n is 0 return [0, 0]. Otherwise without = n·(prefix + suffix); with = (prefix·write + (n − 1)·prefix·read) // 100 + n·suffix. Summing before dividing keeps the result exact for the given test values and mirrors how providers price per token.</p>`,
  code: `def cache_savings(prefix, suffix, n, read_pct, write_pct):
    if n == 0:
        return [0, 0]
    without = n * (prefix + suffix)
    cached_prefix = (prefix * write_pct + (n - 1) * prefix * read_pct) // 100
    return [without, cached_prefix + n * suffix]`, alt: [
      { lang: 'java', code: `class Solution {
    public int[] cacheSavings(int prefix, int suffix, int n, int readPct, int writePct) {
        if (n == 0) return new int[] { 0, 0 };
        long without = (long) n * (prefix + suffix);
        // All values are non-negative, so integer division matches Python's //.
        long cachedPrefix = ((long) prefix * writePct + (long) (n - 1) * prefix * readPct) / 100;
        return new int[] { (int) without, (int) (cachedPrefix + (long) n * suffix) };
    }
}` },
      { lang: 'js', code: `function cacheSavings(prefix, suffix, n, readPct, writePct) {
  if (n === 0) return [0, 0];
  const without = n * (prefix + suffix);
  const cachedPrefix = Math.floor((prefix * writePct + (n - 1) * prefix * readPct) / 100);   // Python //
  return [without, cachedPrefix + n * suffix];
}` },
      { lang: 'cpp', code: `class Solution {
public:
    vector<int> cacheSavings(int prefix, int suffix, int n, int readPct, int writePct) {
        if (n == 0) return {0, 0};
        long long without = (long long)n * (prefix + suffix);
        // All values are non-negative, so integer division matches Python's //.
        long long cachedPrefix = ((long long)prefix * writePct + (long long)(n - 1) * prefix * readPct) / 100;
        return {(int)without, (int)(cachedPrefix + (long long)n * suffix)};
    }
};` },
      { lang: 'csharp', code: `public class Solution {
    public int[] CacheSavings(int prefix, int suffix, int n, int readPct, int writePct) {
        if (n == 0) return new[] { 0, 0 };
        long without = (long)n * (prefix + suffix);
        // All values are non-negative, so integer division matches Python's //.
        long cachedPrefix = ((long)prefix * writePct + (long)(n - 1) * prefix * readPct) / 100;
        return new[] { (int)without, (int)(cachedPrefix + (long)n * suffix) };
    }
}` }
    ],
  complexity: `<p>O(1): a few multiplications, no loop.</p>`,
  tests: { sig: 'int int int int int -> int[]', fn: 'cacheSavings', cases: [[[10000, 500, 10, 10, 125], [105000, 26500]], [[10000, 500, 1, 10, 125], [10500, 13000]], [[10000, 500, 0, 10, 125], [0, 0]], [[0, 100, 3, 10, 125], [300, 300]], [[2000, 0, 2, 10, 125], [4000, 2700]], [[1000, 1000, 4, 10, 200], [8000, 6300]]] }
}));

practice.push(mk({
  title: 'Simulate Lost-in-the-Middle Recall', level: 'Medium', tags: ['context rot', 'simulation'],
  statement: `<p>A toy recall model: with <code>n</code> documents, a fact at 0-based position p has edge distance d = min(p, n − 1 − p) and recall = max(50, 95 − 10·d) percent. Return the recall for each position in <code>positions</code>.</p>`,
  constraints: `1 ≤ n ≤ 10<sup>6</sup>; 0 ≤ p &lt; n.`,
  example: `<p>n 5, positions [0, 2, 4] → distances 0, 2, 0 → ${H.c('g', '[95, 75, 95]')}: the middle is weakest.</p>`,
  bruteWhy: `<p>Using distance from the start only (p) models a monotone decline and misses that the end of the context, right before the question, is also well recalled.</p>`,
  bruteCode: `def recall_from_start(n, positions):
    return [max(50, 95 - 10 * p) for p in positions]   # forgets the end edge`,
  mcq: { q: 'In a lost-in-the-middle curve, which positions are recalled best?', options: ['Only the middle', 'Start and end', 'Only the end', 'All equal'], answer: 1, explain: 'The U-shape: edges high, middle low.' },
  hints: ['<p>Hint 1: distance to the nearest edge is the smaller of the distance to the start and to the end.</p>', '<p>Hint 2: the last index is n − 1, so distance to the end is n − 1 − p.</p>', '<p>Hint 3: apply the floor of 50 with max(). An empty positions list gives an empty list.</p>'],
  approach: `<p>For each p compute <code>d = min(p, n − 1 − p)</code> and return <code>max(50, 95 − 10·d)</code>. The floor models that recall never quite hits zero. The result reproduces the U-shape seen in long-context studies, and is a handy stand-in when testing reordering strategies.</p>`,
  code: `def simulate_recall(n, positions):
    out = []
    for p in positions:
        d = min(p, n - 1 - p)            # distance to the nearest edge
        out.append(max(50, 95 - 10 * d))
    return out`, alt: [
      { lang: 'java', code: `class Solution {
    public int[] simulateRecall(int n, int[] positions) {
        int[] out = new int[positions.length];
        for (int i = 0; i < positions.length; i++) {
            int p = positions[i];
            int d = Math.min(p, n - 1 - p);          // distance to the nearest edge
            out[i] = Math.max(50, 95 - 10 * d);
        }
        return out;
    }
}` },
      { lang: 'js', code: `function simulateRecall(n, positions) {
  return positions.map((p) => {
    const d = Math.min(p, n - 1 - p);   // distance to the nearest edge
    return Math.max(50, 95 - 10 * d);
  });
}` },
      { lang: 'cpp', code: `class Solution {
public:
    vector<int> simulateRecall(int n, vector<int>& positions) {
        vector<int> out;
        for (int p : positions) {
            int d = min(p, n - 1 - p);          // distance to the nearest edge
            out.push_back(max(50, 95 - 10 * d));
        }
        return out;
    }
};` },
      { lang: 'csharp', code: `public class Solution {
    public int[] SimulateRecall(int n, int[] positions) {
        var output = new int[positions.Length];
        for (int i = 0; i < positions.Length; i++) {
            int p = positions[i];
            int d = Math.Min(p, n - 1 - p);     // distance to the nearest edge
            output[i] = Math.Max(50, 95 - 10 * d);
        }
        return output;
    }
}` }
    ],
  complexity: `<p>O(k) for k positions.</p>`,
  tests: { sig: 'int int[] -> int[]', fn: 'simulateRecall', cases: [[[5, [0, 2, 4]], [95, 75, 95]], [[1, [0]], [95]], [[20, [10]], [50]], [[4, [1, 2]], [85, 85]], [[10, []], []], [[9, [4, 3]], [55, 65]]] }
}));

practice.push(mk({
  title: 'Compare Two Context Strategies on an Eval', level: 'Medium', tags: ['evals', 'regression'],
  statement: `<p>The same eval cases were run with context strategy A and strategy B. <code>a[i]</code> and <code>b[i]</code> are 1 for pass, 0 for fail. Return <code>[pass_a, pass_b, a_only, b_only]</code>: total passes for each, and the cases only A passed and only B passed (the "flips" a paired comparison looks at).</p>`,
  constraints: `0 ≤ n ≤ 10<sup>5</sup>; len(a) = len(b).`,
  example: `<p>a [1, 0, 1, 1], b [1, 1, 1, 0] → passes 3 and 3; case 3 only A, case 1 only B → ${H.c('g', '[3, 3, 1, 1]')}. Same score, but each strategy broke one case: a regression hidden by the totals.</p>`,
  bruteWhy: `<p>Comparing only the pass totals hides regressions: equal totals can mean one case fixed and another broken.</p>`,
  bruteCode: `def compare_totals(a, b):
    return [sum(a), sum(b)]   # hides which cases flipped`,
  mcq: { q: 'Totals are equal. Why still look at flips?', options: ['They are always zero', 'They reveal cases one strategy broke, which may be important ones', 'They change the totals', 'They do not matter'], answer: 1, explain: 'Paired analysis finds regressions and is the basis for tests like McNemar\'s.' },
  hints: ['<p>Hint 1: the first two numbers are plain sums.</p>', '<p>Hint 2: walk both lists together and compare each pair.</p>', '<p>Hint 3: count pairs (1, 0) as A-only and (0, 1) as B-only. Empty lists give four zeros.</p>'],
  approach: `<p>Sum each list, then zip them and count (1, 0) pairs and (0, 1) pairs. The flip counts drive a paired significance check (e.g. a sign test or McNemar's test) and point you to exactly which traces to read.</p>`,
  code: `def compare_runs(a, b):
    a_only = sum(1 for x, y in zip(a, b) if x == 1 and y == 0)
    b_only = sum(1 for x, y in zip(a, b) if x == 0 and y == 1)
    return [sum(a), sum(b), a_only, b_only]`, alt: [
      { lang: 'java', code: `class Solution {
    public int[] compareRuns(int[] a, int[] b) {
        int sumA = 0, sumB = 0, aOnly = 0, bOnly = 0;
        for (int x : a) sumA += x;
        for (int y : b) sumB += y;
        for (int i = 0; i < Math.min(a.length, b.length); i++) {
            if (a[i] == 1 && b[i] == 0) aOnly++;
            if (a[i] == 0 && b[i] == 1) bOnly++;
        }
        return new int[] { sumA, sumB, aOnly, bOnly };
    }
}` },
      { lang: 'js', code: `function compareRuns(a, b) {
  const sum = (xs) => xs.reduce((s, x) => s + x, 0);
  let aOnly = 0, bOnly = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] === 1 && b[i] === 0) aOnly++;
    if (a[i] === 0 && b[i] === 1) bOnly++;
  }
  return [sum(a), sum(b), aOnly, bOnly];
}` },
      { lang: 'cpp', code: `class Solution {
public:
    vector<int> compareRuns(vector<int>& a, vector<int>& b) {
        int aOnly = 0, bOnly = 0;
        for (size_t i = 0; i < min(a.size(), b.size()); i++) {
            if (a[i] == 1 && b[i] == 0) aOnly++;
            if (a[i] == 0 && b[i] == 1) bOnly++;
        }
        return {accumulate(a.begin(), a.end(), 0), accumulate(b.begin(), b.end(), 0), aOnly, bOnly};
    }
};` },
      { lang: 'csharp', code: `public class Solution {
    public int[] CompareRuns(int[] a, int[] b) {
        int aOnly = 0, bOnly = 0;
        for (int i = 0; i < Math.Min(a.Length, b.Length); i++) {
            if (a[i] == 1 && b[i] == 0) aOnly++;
            if (a[i] == 0 && b[i] == 1) bOnly++;
        }
        return new[] { a.Sum(), b.Sum(), aOnly, bOnly };
    }
}` }
    ],
  complexity: `<p>O(n) time, O(1) extra space.</p>`,
  tests: { sig: 'int[] int[] -> int[]', fn: 'compareRuns', cases: [[[[1, 1, 0, 0], [1, 0, 1, 0]], [2, 2, 1, 1]], [[[], []], [0, 0, 0, 0]], [[[1], [1]], [1, 1, 0, 0]], [[[0, 0, 0], [1, 1, 1]], [0, 3, 0, 3]], [[[1, 0, 1, 1], [1, 1, 1, 0]], [3, 3, 1, 1]], [[[1, 1], [0, 0]], [2, 0, 2, 0]]] }
}));

practice.push(mk({
  title: 'Pack the Most Valuable Context into a Budget', level: 'Hard', tags: ['token budget', 'knapsack', 'dynamic programming'],
  statement: `<p>Candidate context items have token <code>sizes</code> and estimated <code>values</code> (e.g. reranker score × 100). Choose a subset whose total size is ≤ <code>budget</code> and maximise total value. Return the maximum value.</p>`,
  constraints: `0 ≤ n ≤ 200; 0 ≤ budget ≤ 10<sup>4</sup>; sizes, values ≥ 0.`,
  example: `<p>budget 10, sizes [5, 4, 6], values [10, 40, 30] → greedy by value takes 40 (4) then 30 (6) = 70, which happens to be optimal → ${H.c('g', '70')}. With budget 7, sizes [3, 4, 5], values [4, 5, 6] the best is 3 + 4 → 9.</p>`,
  bruteWhy: `<p>Trying all 2<sup>n</sup> subsets is exact but hopeless beyond ~25 items. Greedy by value or by value/size is fast but can miss the best combination.</p>`,
  bruteCode: `from itertools import combinations

def pack_brute(budget, sizes, values):
    best = 0
    n = len(sizes)
    for r in range(n + 1):
        for combo in combinations(range(n), r):
            if sum(sizes[i] for i in combo) <= budget:
                best = max(best, sum(values[i] for i in combo))
    return best`,
  mcq: { q: 'Which technique gives the exact best subset in O(n × budget)?', options: ['Greedy by value', '0/1 knapsack dynamic programming', 'Sorting by size', 'Binary search'], answer: 1, explain: 'Each item is taken or not: classic 0/1 knapsack.' },
  hints: ['<p>Hint 1: this is 0/1 knapsack: each item is in or out.</p>', '<p>Hint 2: keep best[c] = max value using capacity c; update for each item.</p>', '<p>Hint 3: loop capacity downward from budget to size so each item is used once. Zero-size items still add value.</p>'],
  approach: `<p>One-dimensional knapsack DP: <code>best = [0] * (budget + 1)</code>; for each item (s, v), for c from budget down to s, <code>best[c] = max(best[c], best[c − s] + v)</code>. Answer <code>best[budget]</code>. Downward iteration ensures each item is counted once. In production, greedy-by-rank is usually good enough; use DP when items have very uneven sizes and value estimates you trust.</p>`,
  code: `def pack_by_value(budget, sizes, values):
    best = [0] * (budget + 1)            # best[c] = max value within capacity c
    for s, v in zip(sizes, values):
        for c in range(budget, s - 1, -1):   # downward: each item used at most once
            best[c] = max(best[c], best[c - s] + v)
    return best[budget]`, alt: [
      { lang: 'java', code: `class Solution {
    public int packByValue(int budget, int[] sizes, int[] values) {
        int[] best = new int[budget + 1];          // best[c] = max value within capacity c
        for (int i = 0; i < Math.min(sizes.length, values.length); i++) {
            int s = sizes[i], v = values[i];
            for (int c = budget; c >= s; c--)      // downward: each item used at most once
                best[c] = Math.max(best[c], best[c - s] + v);
        }
        return best[budget];
    }
}` },
      { lang: 'js', code: `function packByValue(budget, sizes, values) {
  const best = new Array(budget + 1).fill(0);   // best[c] = max value within capacity c
  for (let i = 0; i < Math.min(sizes.length, values.length); i++) {
    const s = sizes[i], v = values[i];
    for (let c = budget; c >= s; c--) {         // downward: each item used at most once
      best[c] = Math.max(best[c], best[c - s] + v);
    }
  }
  return best[budget];
}` },
      { lang: 'cpp', code: `class Solution {
public:
    int packByValue(int budget, vector<int>& sizes, vector<int>& values) {
        vector<int> best(budget + 1, 0);           // best[c] = max value within capacity c
        for (size_t i = 0; i < min(sizes.size(), values.size()); i++) {
            int s = sizes[i], v = values[i];
            for (int c = budget; c >= s; c--)      // downward: each item used at most once
                best[c] = max(best[c], best[c - s] + v);
        }
        return best[budget];
    }
};` },
      { lang: 'csharp', code: `public class Solution {
    public int PackByValue(int budget, int[] sizes, int[] values) {
        var best = new int[budget + 1];            // best[c] = max value within capacity c
        for (int i = 0; i < Math.Min(sizes.Length, values.Length); i++) {
            int s = sizes[i], v = values[i];
            for (int c = budget; c >= s; c--)      // downward: each item used at most once
                best[c] = Math.Max(best[c], best[c - s] + v);
        }
        return best[budget];
    }
}` }
    ],
  complexity: `<p>O(n × budget) time, O(budget) space.</p>`,
  tests: { sig: 'int int[] int[] -> int', fn: 'packByValue', cases: [[[10, [5, 4, 6], [10, 40, 30]], 70], [[0, [1], [5]], 0], [[5, [], []], 0], [[7, [3, 4, 5], [4, 5, 6]], 9], [[100, [10, 20, 30], [1, 2, 3]], 6], [[9, [5, 5, 5], [7, 8, 9]], 9], [[5, [0, 5], [3, 4]], 7]] }
}));

practice.push(mk({
  title: 'How Many Sub-Agents Do We Need?', level: 'Hard', tags: ['sub-agents', 'bin packing'],
  statement: `<p>Exploration tasks with token costs <code>tasks</code> must be done by sub-agents, each with a context of <code>window</code> tokens. Assign tasks <b>in order</b>: put a task into the current sub-agent if it still fits, otherwise start a new sub-agent (next-fit). Return the number of sub-agents, or −1 if any single task exceeds the window.</p>`,
  constraints: `0 ≤ len(tasks) ≤ 10<sup>5</sup>; window ≥ 1; tasks ≥ 0.`,
  example: `<p>tasks [70, 40, 20, 90], window 100 → [70], [40, 20], [90] → ${H.c('g', '3')}.</p>`,
  bruteWhy: `<p>Dividing sum(tasks) by the window and rounding up gives only a lower bound: tasks cannot be split across sub-agents, so [60, 60] with windows of 100 needs 2 even though 120 / 100 rounds up to 2 by luck, while [70, 40, 20, 90] (total 220) needs 3. It also misses the impossible case of a task larger than the window.</p>`,
  bruteCode: `def subagents_lower_bound(tasks, window):
    return -(-sum(tasks) // window)    # ceil; ignores that tasks are indivisible`,
  mcq: { q: 'A single task is bigger than a sub-agent\'s window. What is the right design response?', options: ['Ignore it', 'Split the task further or use a compaction-capable sub-agent; the plan as given is impossible', 'Give it to the lead agent', 'Truncate silently'], answer: 1, explain: 'Report it as impossible (−1) so the planner can decompose further.' },
  hints: ['<p>Hint 1: check the impossible case first: any task larger than the window.</p>', '<p>Hint 2: track the space used in the current sub-agent.</p>', '<p>Hint 3: open a new sub-agent when the next task does not fit; count sub-agents. No tasks means 0.</p>'],
  approach: `<p>If any task &gt; window return −1. Otherwise next-fit: <code>count = 0, used = window + 1</code> sentinel; for each task, if <code>used + t &gt; window</code> start a new agent (<code>count += 1, used = t</code>), else <code>used += t</code>. Next-fit keeps order (good for tasks that are logically adjacent) and is O(n); first-fit-decreasing would use fewer agents if order did not matter.</p>`,
  code: `def subagent_count(tasks, window):
    if any(t > window for t in tasks):
        return -1                      # cannot fit even alone: decompose further
    count, used = 0, 0
    for t in tasks:
        if count == 0 or used + t > window:
            count += 1                 # spin up a fresh sub-agent with a clean context
            used = t
        else:
            used += t
    return count`, alt: [
      { lang: 'java', code: `class Solution {
    public int subagentCount(int[] tasks, int window) {
        for (int t : tasks) if (t > window) return -1;   // cannot fit even alone: decompose further
        int count = 0;
        long used = 0;
        for (int t : tasks) {
            if (count == 0 || used + t > window) {
                count++;                                  // fresh sub-agent with a clean context
                used = t;
            } else {
                used += t;
            }
        }
        return count;
    }
}` },
      { lang: 'js', code: `function subagentCount(tasks, window) {
  if (tasks.some((t) => t > window)) return -1;   // cannot fit even alone: decompose further
  let count = 0, used = 0;
  for (const t of tasks) {
    if (count === 0 || used + t > window) {
      count++;                                     // fresh sub-agent with a clean context
      used = t;
    } else {
      used += t;
    }
  }
  return count;
}` },
      { lang: 'cpp', code: `class Solution {
public:
    int subagentCount(vector<int>& tasks, int window) {
        for (int t : tasks) if (t > window) return -1;   // cannot fit even alone: decompose further
        int count = 0;
        long long used = 0;
        for (int t : tasks) {
            if (count == 0 || used + t > window) {
                count++;                                  // fresh sub-agent with a clean context
                used = t;
            } else {
                used += t;
            }
        }
        return count;
    }
};` },
      { lang: 'csharp', code: `public class Solution {
    public int SubagentCount(int[] tasks, int window) {
        if (tasks.Any(t => t > window)) return -1;   // cannot fit even alone: decompose further
        int count = 0;
        long used = 0;
        foreach (int t in tasks) {
            if (count == 0 || used + t > window) {
                count++;                              // fresh sub-agent with a clean context
                used = t;
            } else {
                used += t;
            }
        }
        return count;
    }
}` }
    ],
  complexity: `<p>O(n) time, O(1) space.</p>`,
  tests: { sig: 'int[] int -> int', fn: 'subagentCount', cases: [[[[30, 30, 30], 60], 2], [[[], 100], 0], [[[101], 100], -1], [[[50, 60, 40], 100], 2], [[[100, 100, 1], 100], 3], [[[10, 20, 30, 40], 100], 1], [[[70, 40, 20, 90], 100], 3]] }
}));

practice.push(mk({
  title: 'Skill Body Loads with an LRU Context Cap', level: 'Hard', tags: ['progressive disclosure', 'lru'],
  statement: `<p>An agent may keep at most <code>capacity</code> skill bodies loaded in context at once. <code>events</code> lists the skills used, in order. Using a loaded skill is free (and makes it most recently used). Using an unloaded skill loads its body; if the cap is full, the least recently used body is unloaded first. With capacity 0 every use is a load. Return the number of loads.</p>`,
  constraints: `0 ≤ len(events) ≤ 10<sup>5</sup>; 0 ≤ capacity ≤ 10<sup>3</sup>.`,
  example: `<p>events [a, b, a, c, b], capacity 2 → a load, b load, a hit, c load (evict b), b load (evict a) → ${H.c('g', '4')}.</p>`,
  bruteWhy: `<p>Never unloading anything ("load once, keep forever") counts only distinct skills, but breaks the context cap; unloading after every use reloads constantly and wastes tokens.</p>`,
  bruteCode: `def loads_keep_forever(events, capacity):
    return len(set(events))    # ignores the cap entirely`,
  mcq: { q: 'Which body should be unloaded when the cap is full?', options: ['The most recently used', 'The least recently used', 'The largest', 'A random one'], answer: 1, explain: 'LRU assumes the skill used longest ago is least likely to be needed next.' },
  hints: ['<p>Hint 1: you need an ordered structure: Python\'s OrderedDict, or a dict (insertion order) with delete-and-reinsert.</p>', '<p>Hint 2: on a hit, move the skill to the most-recent end; on a miss, count a load.</p>', '<p>Hint 3: before inserting on a miss, evict from the oldest end if full. Capacity 0 means count every event and store nothing.</p>'],
  approach: `<p>Use an <code>OrderedDict</code> as an LRU. For each event: if loaded, <code>move_to_end</code>. Otherwise increment loads; if capacity is 0, continue; if full, <code>popitem(last=False)</code>; then insert. This is the same policy you would use for any on-demand context (skills, tool definitions, file contents) under a hard token cap.</p>`,
  code: `from collections import OrderedDict

def skill_loads(events, capacity):
    loaded, loads = OrderedDict(), 0
    for s in events:
        if s in loaded:
            loaded.move_to_end(s)          # hit: now most recently used
            continue
        loads += 1                         # miss: body enters the context
        if capacity == 0:
            continue
        if len(loaded) >= capacity:
            loaded.popitem(last=False)     # unload least recently used body
        loaded[s] = True
    return loads`, alt: [
      { lang: 'java', code: `class Solution {
    public int skillLoads(String[] events, int capacity) {
        // Access-ordered LinkedHashMap: iteration starts at the least recently used key.
        LinkedHashMap<String, Boolean> loaded = new LinkedHashMap<>(16, 0.75f, true);
        int loads = 0;
        for (String s : events) {
            if (loaded.containsKey(s)) {
                loaded.get(s);                 // hit: now most recently used
                continue;
            }
            loads++;                           // miss: body enters the context
            if (capacity == 0) continue;
            if (loaded.size() >= capacity) {
                String lru = loaded.keySet().iterator().next();
                loaded.remove(lru);            // unload least recently used body
            }
            loaded.put(s, true);
        }
        return loads;
    }
}` },
      { lang: 'js', code: `function skillLoads(events, capacity) {
  const loaded = new Map();   // insertion order: first key is least recently used
  let loads = 0;
  for (const s of events) {
    if (loaded.has(s)) {
      loaded.delete(s);       // hit: move to the end = most recently used
      loaded.set(s, true);
      continue;
    }
    loads++;                  // miss: body enters the context
    if (capacity === 0) continue;
    if (loaded.size >= capacity) loaded.delete(loaded.keys().next().value);   // unload LRU body
    loaded.set(s, true);
  }
  return loads;
}` },
      { lang: 'cpp', code: `class Solution {
public:
    int skillLoads(vector<string>& events, int capacity) {
        list<string> order;                                   // front = least recently used
        unordered_map<string, list<string>::iterator> pos;
        int loads = 0;
        for (auto& s : events) {
            auto it = pos.find(s);
            if (it != pos.end()) {
                order.splice(order.end(), order, it->second);  // hit: now most recently used
                continue;
            }
            loads++;                                          // miss: body enters the context
            if (capacity == 0) continue;
            if ((int)order.size() >= capacity) {
                pos.erase(order.front());                     // unload least recently used body
                order.pop_front();
            }
            order.push_back(s);
            pos[s] = prev(order.end());
        }
        return loads;
    }
};` },
      { lang: 'csharp', code: `public class Solution {
    public int SkillLoads(string[] events, int capacity) {
        var order = new LinkedList<string>();                 // first = least recently used
        var pos = new Dictionary<string, LinkedListNode<string>>();
        int loads = 0;
        foreach (string s in events) {
            if (pos.TryGetValue(s, out var node)) {
                order.Remove(node);                           // hit: now most recently used
                order.AddLast(node);
                continue;
            }
            loads++;                                          // miss: body enters the context
            if (capacity == 0) continue;
            if (order.Count >= capacity) {
                pos.Remove(order.First.Value);                // unload least recently used body
                order.RemoveFirst();
            }
            pos[s] = order.AddLast(s);
        }
        return loads;
    }
}` }
    ],
  complexity: `<p>O(n) time, O(capacity) space.</p>`,
  tests: { sig: 'string[] int -> int', fn: 'skillLoads', cases: [[[['a', 'b', 'a', 'c', 'b'], 2], 4], [[[], 3], 0], [[['x', 'x', 'x'], 1], 1], [[['a', 'b', 'c'], 0], 3], [[['a', 'b', 'c', 'a'], 3], 3], [[['a', 'b', 'a', 'b'], 1], 4]] }
}));

/* =====================================================================
   QUIZ
   ===================================================================== */
quiz.push(
  { q: 'What best describes context engineering?', options: ['Choosing the wording of one instruction', 'Curating everything the model sees on each call (instructions, tools, documents, history, memory) as one limited budget', 'Fine-tuning the model on your data', 'Buying a bigger context window'], answer: 1, explain: 'It is the whole-window version of prompt engineering: which tokens, in what order and form.' },
  { q: 'Your agent gets worse as a session grows, although nothing in the window is wrong. The most likely name for this?', options: ['Hallucination', 'Context rot', 'Overfitting', 'Rate limiting'], answer: 1, explain: 'Recall and instruction-following degrade as the window fills, even with correct content.' },
  { q: 'In a lost-in-the-middle study, a fact placed where is most likely to be missed?', options: ['At the very start', 'In the middle of a long context', 'Right before the question', 'In the system prompt'], answer: 1, explain: 'Recall is U-shaped: edges are recalled best, the middle worst.' },
  { q: 'Window 128k, max_tokens 8k, thinking budget included in max_tokens. How much can the input be at most?', options: ['128k', '120k', '136k', '64k'], answer: 1, explain: 'Input + output must fit the window: 128k − 8k = 120k.' },
  { q: 'Which situation favours just-in-time retrieval over pre-loading?', options: ['A 30-entry FAQ that never changes, 1-second latency target', 'A 40k-file monorepo that changes every hour', 'A single short document', 'A fixed greeting message'], answer: 1, explain: 'Large, changing corpora suit lightweight references plus on-demand reads.' },
  { q: 'What is the lightest-touch way to free context in a long agent run?', options: ['Retrain the model', 'Clear old tool results, leaving a placeholder', 'Delete the system prompt', 'Lower the temperature'], answer: 1, explain: 'Raw tool outputs already acted on can be dropped while the call itself stays visible.' },
  { q: 'A compaction summary must above all keep…', options: ['Polite chit-chat', 'Goal, decisions, current state, dead ends and next steps', 'Every tool output verbatim', 'The timestamps of each turn'], answer: 1, explain: 'Without state and decisions, the agent repeats work and mistakes after the reset.' },
  { q: 'Main benefit of handing a broad code search to a sub-agent?', options: ['Fewer total tokens', 'The lead agent\'s context only receives a short summary', 'No need for tools', 'It removes the need for evals'], answer: 1, explain: 'Total tokens usually rise; the lead\'s context stays clean.' },
  { q: 'In Agent Skills, what is always loaded for every installed skill?', options: ['The whole SKILL.md', 'Its name and description', 'Its bundled scripts', 'All reference files'], answer: 1, explain: 'Level 1 metadata is always present; bodies and files load on demand.' },
  { q: 'Which file is the tool-neutral convention for coding-agent instructions read by Codex and many other agents?', options: ['README.md', 'AGENTS.md', 'package.json', '.env'], answer: 1, explain: 'AGENTS.md is the open convention; Claude Code reads CLAUDE.md and Gemini CLI reads GEMINI.md by default.' },
  { q: 'Your system prompt starts with the current time to the second. Effect on prompt caching?', options: ['None', 'The cached prefix match breaks at the first block, so almost nothing is cached', 'Only the time is recomputed', 'Caching gets faster'], answer: 1, explain: 'Caches match from the first token; a changing first block kills every hit.' },
  { q: 'For an agent loop, which history strategy is most cache-friendly?', options: ['Rewrite earlier messages every step', 'Append-only history with a stable prefix', 'Shuffle tool definitions', 'Put user data in the system prompt'], answer: 1, explain: 'Appending keeps the earlier prefix identical, so only the new tail is computed.' },
  { q: 'When is a large thinking budget most worth paying for?', options: ['Classifying sentiment of a tweet', 'A multi-step bug fix needing planning across files', 'Returning a stored FAQ answer', 'Greeting the user'], answer: 1, explain: 'Test-time compute helps hard, multi-step problems; simple tasks pay latency for nothing.' },
  { q: 'You change the compaction threshold and want to know if it helped. Best method?', options: ['Try a few chats by hand', 'Run the same eval suite with only that variable changed, several runs, compare paired results', 'Ask the model if it feels better', 'Check token count only'], answer: 1, explain: 'A controlled, paired eval with quality and efficiency metrics is the evidence.' }
);

/* =====================================================================
   INTERVIEW
   ===================================================================== */
interview.push(
  { q: 'What is context engineering and how is it different from prompt engineering?', level: 'I', a: `<p>Prompt engineering is about writing a good instruction: role, task, format, examples. Context engineering is the broader job of deciding <b>everything</b> that goes into the window on each call: system prompt, tool definitions, examples, retrieved documents, conversation history, tool results, memory notes and the output reserve, and in what order and form. It matters most for agents, because an agent's context changes every step as tool results pile up. The goal is the smallest set of high-signal tokens that gets the outcome, since the window is a limited attention budget, not free storage.</p>`, followUps: ['Give an example where better wording did not help but better context did.', 'Which part of the context grows fastest in an agent?'] },
  { q: 'We have a 1M-token window. Why not just put the whole knowledge base in every request?', level: 'I', a: `<p>Three reasons. <b>Quality:</b> context rot and lost-in-the-middle mean recall drops as the window fills, and similar-but-wrong passages act as distractors. <b>Cost:</b> every input token is billed on every call; caching helps but a 900k prompt still costs far more than a curated 10k one. <b>Latency:</b> prefill time grows with length, so time-to-first-token suffers. It can be the right call for a one-off analysis of a single long document, but for a product I would retrieve or load just in time, keep a small stable cached prefix, and prove with an eval that the curated context matches or beats the dump.</p>`, followUps: ['When would you actually use the full long context?', 'How would you measure the effective context length for your model?'] },
  { q: 'Explain lost-in-the-middle and what you do about it in a RAG prompt.', level: 'I', a: `<p>Studies such as Liu et al. (2023) found many models recall information at the start and end of a long context much better than in the middle, giving a U-shaped accuracy curve. Mitigations: retrieve fewer, better chunks (rerank, then cut); put the most relevant chunks at the edges with the weakest in the middle; place long documents first and the question last; wrap documents in tags with IDs; ask the model to quote supporting passages before answering. Newer models show a flatter curve, so I would measure on my own data with facts planted at several depths before adding complexity.</p>`, followUps: ['How would you build that depth-sweep eval?', 'Does reranking make reordering unnecessary?'] },
  { q: 'Design the token budget for a support agent on a 200k-token model.', level: 'A', a: `<p>Start from the top: reserve output plus thinking (say 16k). Fixed costs: system prompt and policies (4k), tool definitions (6k; use tool search if the toolset grows). Must-haves: the current message and last 6 turns (~10k), the customer profile and open ticket (1k), memory notes (1k). Flexible: retrieved help articles up to 20k, ranked and trimmed; older history kept as a rolling summary (≤ 3k); tool results capped per call (paginate) and cleared after a few steps. That puts normal operation around 60k, well under the limit, leaving headroom for one big tool result. I would log the per-component token table on every call and alert when a slice exceeds its cap.</p>`, followUps: ['What do you cut first when you hit the limit?', 'How do you count tokens accurately?'] },
  { q: 'Just-in-time retrieval vs pre-loading: how do you choose for a new agent?', level: 'I', a: `<p>Pre-load what is small, stable and needed on nearly every call: instructions, the project context file, a user profile, the top few RAG hits for a single-turn Q&amp;A with a tight latency target. Use just-in-time loading when the corpus is large or changing, or the task requires exploration: give the agent references (paths, IDs, schemas, titles with sizes) and tools to list, search and read with pagination. JIT costs extra round trips and needs a model good at tool use, so caching the stable prefix matters. Most production systems are hybrid. I validate by checking traces for under-exploration (answers without reading) and over-exploration (reading 40 files).</p>`, followUps: ['How would you make tool outputs JIT-friendly?', 'Where does agentic RAG fit?'] },
  { q: 'How would you implement compaction for a long-running coding agent?', level: 'A', a: `<p>Trigger near a threshold of the effective window (e.g. 75–85%) with budget reserved for the summary call itself. First clear old tool results (keep the last few in full, replace the rest with placeholders), because that is free and often enough. If still high, summarise everything except pinned content (system prompt, user constraints, current plan) and the last few turns, using a strict template: goal, done, decisions with reasons, ruled-out approaches, open issues, files touched, next steps. Start the new context with the pins, the summary and the recent turns. Persist a progress file outside the window as a backup. Then evaluate: compact real long traces and ask probe questions about early decisions, and compare task success with and without compaction.</p>`, followUps: ['How do you stop the agent repeating ruled-out approaches after compaction?', 'How does compaction interact with prompt caching?'] },
  { q: 'When do sub-agents help, and when do they hurt?', level: 'A', a: `<p>They help when work is wide and separable: researching independent questions, searching a big codebase, reviewing many files. Each sub-agent explores in a clean context and returns a condensed summary, so the lead's window stays small and focused, and work can run in parallel. They hurt when work is tightly coupled (one refactor where every change depends on the same decision), when tasks are small (coordination overhead dominates), or when budgets matter: total tokens rise a lot; Anthropic reported its multi-agent research system used roughly 15× the tokens of a chat. Good hand-offs are self-contained (objective, output format, tools, boundaries, budget) and return structured results.</p>`, followUps: ['How do you prevent two sub-agents duplicating work?', 'How would you evaluate a multi-agent setup against a single agent?'] },
  { q: 'What is structured note-taking for agents and what are its risks?', level: 'I', a: `<p>The agent writes notes to storage outside the context window (a progress file, a to-do list, a key-value state, a memory directory through a memory tool) and reads them back later. Notes survive compaction and new sessions, keep long plans on track, and store exact facts without relying on the model's recall. Risks: stale notes that contradict reality; notes growing without bound; privacy and retention (personal data in long-lived memory); and prompt injection, because anything written from untrusted input becomes a persistent instruction surface. Mitigate with small structured files, scoping per user and task, validation on write, and expiry.</p>`, followUps: ['What would you put in a NOTES.md for a 3-day migration task?', 'How would you test that memory actually improves results?'] },
  { q: 'What are Agent Skills and why do they save context?', level: 'I', a: `<p>A skill is a folder with a SKILL.md file: front matter with a name and description, then instructions, plus optional reference files and scripts. They use progressive disclosure: only every skill's name and description sits in the system prompt (tens of tokens each); the body is read only when the model decides the skill is relevant; linked references are read only if the instructions point to them; and scripts are executed so only their output enters context. Fifty installed skills therefore cost a few thousand tokens until one is used. The description acts as the router, so it must say what the skill does and when to use it. Treat third-party skills like code: review them.</p>`, followUps: ['How is this similar to tool search?', 'How would you debug a skill that never triggers?'] },
  { q: 'What goes into a good CLAUDE.md or AGENTS.md, and what does not?', level: 'B', a: `<p>Include what the agent cannot cheaply discover and must get right: build, test and lint commands (and how to run one test), the repository map, non-obvious conventions ("pnpm, not npm", "money in integer cents"), hard rules ("never edit generated/"), and links to longer docs to read when relevant. Leave out long style guides, API references, things obvious from the code, and anything stale. Keep it short because it is loaded on every session and competes for attention; nested files in sub-directories can add local rules. To share across tools, keep one AGENTS.md and import or point to it from CLAUDE.md and GEMINI.md. Version it, review changes, and add a rule after you see the agent make the same mistake twice.</p>`, followUps: ['How would you test whether a new rule helped?', 'What is the security risk of running an agent on an untrusted repo with its own AGENTS.md?'] },
  { q: 'How do you order a prompt to maximise prompt-cache hits?', level: 'I', a: `<p>Caches match the longest identical prefix, so put stable content first and volatile content last: tool definitions, then system prompt, then context files and examples, then large shared documents, then conversation history (append-only), then the latest user message and any per-request data like the time. Avoid timestamps or request IDs near the top, sort tools and JSON keys deterministically, do not rewrite or reorder earlier messages, and batch any clearing so the cache breaks rarely. On Anthropic set cache_control breakpoints after the stable blocks; OpenAI caches long prefixes automatically. Measure cached tokens from the usage fields and alert on hit-rate drops.</p>`, followUps: ['Why does a cache hit also cut latency?', 'How do you disable a tool mid-session without breaking the cache?'] },
  { q: 'When would you use a reasoning model or a larger thinking budget, and what does it cost?', level: 'A', a: `<p>Use more test-time compute for hard, multi-step work: complex debugging, planning, maths, analysis across many constraints, and agent steps where choosing the right tool matters. Do not use it for lookups, extraction, classification or latency-critical chat; there it adds seconds and output-token cost for little gain. Thinking tokens are billed as output and come out of max_tokens, so set max_tokens = thinking budget + answer length. Controls differ by provider (OpenAI reasoning effort, Anthropic extended thinking with budget_tokens and effort settings, Gemini thinking budgets). I would choose per route with an eval sweep across budgets, picking the knee where accuracy flattens, subject to p95 latency and cost targets, and route easy traffic to no thinking.</p>`, followUps: ['How do thinking blocks interact with tool use in multi-turn agents?', 'How would you detect overthinking?'] },
  { q: 'How do you measure whether a context change actually improved your LLM app?', level: 'A', a: `<p>Build a frozen eval set that looks like production, including long sessions and past failures. Change one context variable at a time (retrieval k, ordering, compaction threshold, context file, tool set) and run each case several times. Grade with code where possible (tests pass, correct record), with calibrated LLM judges for open answers. Report quality (task success, faithfulness, instruction-following), efficiency (input tokens, cache hit rate, steps, cost per success, p50/p95 latency) and targeted probes (facts at several depths, questions about early decisions after compaction). Compare paired results per case and look at flips, not just totals; use a confidence interval or sign test before shipping, and keep ablation results to justify each block's tokens.</p>`, followUps: ['How many cases do you need to detect a 3-point improvement?', 'How would you monitor context quality online?'] },
  { q: 'An agent works well for 20 steps, then starts repeating actions and ignoring rules. Walk through your debugging.', level: 'E', a: `<p>Suspect the context first. Pull the trace and print a per-component token table per step: usually tool results have ballooned and the window is past the effective length, so early instructions are drowned (context rot). Check for duplicated file reads and huge outputs. Look at the last compaction summary, if any, for missing decisions or state, which causes repeated actions. Fixes in order: clear old tool results, paginate or truncate tool output at the source, add a progress or to-do file the agent updates, compact with a strict template, re-state critical rules near the end, delegate exploration to sub-agents, and add a loop guard. Then rerun the eval with long tasks to confirm the late-step success rate improved.</p>`, followUps: ['Which metric would you alert on to catch this in production?', 'How would you tell context rot apart from a model capability limit?'] }
);

registerModule({
  id: 'ai24',
  title: 'Context Engineering for LLM Apps & Agents',
  intro: `<p>Every answer an LLM gives depends on what is in its context window at that moment. This module treats the window as a <b>limited attention budget</b> and gives you one framework for filling it well: why models degrade as context grows (context rot, lost-in-the-middle), how to budget tokens per component, when to retrieve just in time instead of pre-loading, how to compact long sessions and clear stale tool output, how to move state into notes and work into sub-agents, how skills and files like CLAUDE.md and AGENTS.md load instructions only when needed, how to order prompts for cache hits, when to pay for reasoning, and how to prove any of it with evals. It pulls together pieces from the prompting, RAG, agents and LLMOps modules and goes deeper, with runnable Python models of each policy.</p>`,
  goals: ['Explain context rot and lost-in-the-middle and reorder or trim context to counter them', 'Plan a per-component token budget with an output reserve and a drop order', 'Choose between just-in-time retrieval and pre-loading, and design a hybrid', 'Implement compaction and tool-result clearing policies and say what a summary must keep', 'Use structured notes, sub-agents, skills and context files (CLAUDE.md, AGENTS.md, GEMINI.md) to keep the main context small', 'Order prompts for cache hits, pick a thinking budget with an eval, and measure context quality'],
  prereqs: `<p><b>Required:</b> Prompt Engineering (ai07), RAG (ai09) and Agents, Tool Use &amp; Multi-Agent Systems (ai11). <b>Helpful:</b> How LLMs Work (ai06, for the context window and attention) and LLM System Design &amp; LLMOps (ai14, for prompt caching costs). Basic Python.</p>`,
  langExplain: `<p>Every tested problem has a solution in Python, Java, JavaScript, C++ and C#. The explanations, topic examples and brute-force sketches use Python because the GenAI track uses Python throughout; the policies (budgets, compaction, caching) are plain arithmetic and list handling that translate line for line to any language.</p>`,
  hours: 10,
  topics: topics, practice: practice, quiz: quiz, interview: interview
});
})();
