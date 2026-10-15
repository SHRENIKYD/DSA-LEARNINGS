(function () { var topics = [], practice = [], quiz = [], interview = [];
var PY = {"bpe":"from collections import Counter\n\n# Tiny corpus: word -> how many times it appears\ncorpus = {\"low\": 5, \"lower\": 2, \"newest\": 6, \"widest\": 3}\n# Start: every word is a tuple of single characters plus an end marker \"_\"\nwords = {tuple(w) + (\"_\",): n for w, n in corpus.items()}\n\ndef pair_counts(words):\n    c = Counter()\n    for sym, n in words.items():\n        for a, b in zip(sym, sym[1:]):\n            c[(a, b)] += n\n    return c\n\ndef merge(words, pair):\n    out = {}\n    for sym, n in words.items():\n        new, i = [], 0\n        while i < len(sym):\n            if i < len(sym) - 1 and (sym[i], sym[i + 1]) == pair:\n                new.append(sym[i] + sym[i + 1]); i += 2\n            else:\n                new.append(sym[i]); i += 1\n        out[tuple(new)] = n\n    return out\n\nmerges = []\nfor step in range(1, 8):\n    counts = pair_counts(words)\n    best = max(counts, key=lambda p: (counts[p], p))   # highest count wins; ties by order\n    merges.append(best)\n    words = merge(words, best)\n    print(f\"merge {step}: {best[0]!r}+{best[1]!r} (seen {counts[best]}x)\")\n    print(\"   \", {\" \".join(k): v for k, v in words.items()})\nprint(\"learned merge list:\", [a + b for a, b in merges])","attn":"import math\n\ndef softmax(xs):\n    m = max(xs)                                  # subtract max for numeric safety\n    ex = [math.exp(x - m) for x in xs]\n    s = sum(ex)\n    return [e / s for e in ex]\n\ndef dot(a, b):\n    return sum(x * y for x, y in zip(a, b))\n\n# 3 tokens: \"the\", \"cat\", \"sat\". Tiny 2-number vectors for Q, K, V.\ntokens = [\"the\", \"cat\", \"sat\"]\nQ = [[1.0, 0.0], [0.0, 1.0], [1.0, 1.0]]\nK = [[1.0, 0.0], [0.0, 1.0], [1.0, 1.0]]\nV = [[1.0, 0.0], [0.0, 2.0], [1.0, 1.0]]\nd = 2\n\nfor i, name in enumerate(tokens):\n    scores = [dot(Q[i], K[j]) / math.sqrt(d) for j in range(3)]\n    weights = softmax(scores)\n    out = [sum(weights[j] * V[j][k] for j in range(3)) for k in range(d)]\n    print(f\"{name!r} asks -> scores\", [round(s, 2) for s in scores])\n    print(\"   weights\", [round(w, 2) for w in weights], \"sum =\", round(sum(weights), 2))\n    print(\"   output vector\", [round(o, 2) for o in out])\n\n# Causal mask: a token may only look at itself and earlier tokens.\nprint(\"\\nWith causal mask (GPT-style):\")\nfor i, name in enumerate(tokens):\n    scores = [dot(Q[i], K[j]) / math.sqrt(d) if j <= i else float(\"-inf\") for j in range(3)]\n    print(f\"{name!r}\", [round(w, 2) for w in softmax(scores)])","samp":"import math, random\n\n# Toy next-token scores (logits) after \"The cat sat on the\"\nlogits = {\"mat\": 3.0, \"sofa\": 2.2, \"floor\": 1.8, \"moon\": 0.5, \"banana\": -0.5}\n\ndef softmax(d, temp=1.0):\n    m = max(d.values())\n    ex = {k: math.exp((v - m) / temp) for k, v in d.items()}\n    s = sum(ex.values())\n    return {k: v / s for k, v in ex.items()}\n\ndef top_k(p, k):\n    keep = dict(sorted(p.items(), key=lambda kv: -kv[1])[:k])\n    s = sum(keep.values())\n    return {t: v / s for t, v in keep.items()}\n\ndef top_p(p, cutoff):\n    keep, total = {}, 0.0\n    for t, v in sorted(p.items(), key=lambda kv: -kv[1]):\n        keep[t] = v\n        total += v\n        if total >= cutoff:        # smallest set whose mass reaches cutoff\n            break\n    s = sum(keep.values())\n    return {t: v / s for t, v in keep.items()}\n\ndef show(title, p):\n    print(f\"{title:<22}\" + \"  \".join(f\"{t}={v:.2f}\" for t, v in p.items()))\n\nshow(\"temp 1.0\", softmax(logits, 1.0))\nshow(\"temp 0.3 (focused)\", softmax(logits, 0.3))\nshow(\"temp 2.0 (wild)\", softmax(logits, 2.0))\nshow(\"top_k=2 @ temp 1\", top_k(softmax(logits), 2))\nshow(\"top_p=0.9 @ temp 1\", top_p(softmax(logits), 0.9))\n\ndef sample(p, rng):\n    r, acc = rng.random(), 0.0\n    for t, v in p.items():\n        acc += v\n        if r <= acc:\n            return t\n    return t\n\nrng = random.Random(42)\np = top_p(softmax(logits, 1.0), 0.9)\ndraws = [sample(p, rng) for _ in range(1000)]\nprint(\"1000 draws:\", {t: draws.count(t) for t in p})","bigram":"import random\nfrom collections import defaultdict, Counter\n\ntext = \"the cat sat on the mat . the dog sat on the log . the cat saw the dog .\"\nwords = text.split()\n\n# \"Training\": count which word follows which word\nfollow = defaultdict(Counter)\nfor a, b in zip(words, words[1:]):\n    follow[a][b] += 1\nfor w in (\"the\", \"sat\"):\n    print(w, \"->\", dict(follow[w]))\n\ndef generate(start, n, seed, greedy=False):\n    rng = random.Random(seed)\n    out = [start]\n    for _ in range(n):\n        options = follow[out[-1]]\n        if not options:\n            break\n        if greedy:\n            nxt = options.most_common(1)[0][0]       # always pick the most likely word\n        else:\n            nxt = rng.choices(list(options), weights=list(options.values()))[0]\n        out.append(nxt)\n    return \" \".join(out)\n\nprint(\"greedy :\", generate(\"the\", 8, 0, greedy=True))\nfor s in (1, 2, 3):\n    print(f\"sample{s}:\", generate(\"the\", 8, s))"};

// ---------- TOPIC 1: Tokenization with BPE ----------
topics.push({
  title: 'Tokenization: Text to Numbers with BPE',
  analogy: `<p>Think of <b>LEGO</b>. A computer cannot read a "house" as a house; it needs bricks it already knows. Tokenization is the box of bricks. Common words are one big brick (<code>the</code>), rare words are built from a few smaller bricks (<code>un</code> + <code>believ</code> + <code>able</code>), and if all else fails you use the tiniest bricks, single letters or bytes. Every brick has a number printed on it. The model never sees letters, only brick numbers.</p>`,
  explain: `<p>A language model is a giant number machine. So the first job is to chop your text into pieces called <b>tokens</b> and swap each piece for an integer id. How do we pick the pieces? One popular recipe is <b>BPE (Byte Pair Encoding)</b>:</p>
  <ol>
    <li>Start with the smallest pieces: single characters (real systems start from raw bytes, so any text in any language works).</li>
    <li>Count every <i>neighbouring pair</i> across a big pile of text.</li>
    <li>Glue the <b>most frequent pair</b> into one new piece. Write it in the "merge list".</li>
    <li>Repeat thousands of times (about 32,000 to 200,000 merges for real models).</li>
  </ol>
  <p>Tiny hand example. Corpus: <code>low</code> x5, <code>lower</code> x2, <code>newest</code> x6, <code>widest</code> x3 (we add an end marker <code>_</code> to each word):</p>
  ${H.table(['Step', 'Most common pair', 'Count', 'New piece'], [['1', 't + _', '9', 't_'], ['2', 's + t_', '9', 'st_'], ['3', 'e + st_', '9', 'est_'], ['4', 'o + w', '7', 'ow'], ['5', 'l + ow', '7', 'low']])}
  <p>After 5 merges <code>newest</code> is <code>n e w est_</code> and <code>widest</code> is <code>w i d est_</code>. The shared ending <code>est_</code> became ONE token because it showed up a lot. That is the whole trick: <b>frequent chunks become single tokens</b>.</p>
  <p><b>To encode new text</b>, you replay the merge list in the same order on the new word. <b>To decode</b>, you just glue pieces back and drop the markers.</p>
  <p><b>Why this matters to you (practical rules of thumb for English):</b></p>
  ${H.table(['Thing', 'Rough size'], [['1 token', '~4 characters or ~3/4 of a word'], ['100 tokens', '~75 words'], ['1 page of text', '~500 tokens'], ['1 small book (300 pages)', '~150,000 tokens'], ['Code and non-English text', 'more tokens per word (often 1.5x to 3x)']])}
  <p><b>Why a model cannot count letters:</b> in <code>strawberry</code> the model might see two tokens, <code>straw</code> + <code>berry</code>, as ids like <code>[496, 15717]</code>. It never sees the letters r-r-r inside. Counting letters is like asking someone to count the stitches in a sweater by looking at a photo of the sleeves.</p>`,
  clues: [
    '"How does the model read text?" / "What is a token?" - answer: subword pieces mapped to integer ids',
    '"Why does GPT struggle to count letters / reverse a word / do arithmetic on long numbers?" - tokenization hides characters',
    '"Estimate the cost / how many tokens is this prompt?" - ~4 chars per token, ~0.75 words per token, count input and output separately',
    '"Why does the same prompt cost more in Hindi / Japanese / code?" - fewer merges learned for those, so more tokens per idea',
    '"Why not just use words, or just characters?" - words: huge vocab and unknown words; characters: very long sequences. BPE is the middle path',
    '"Spaces and capitals change the answer" - <code>Hello</code>, <code> hello</code> and <code>hello</code> are different tokens'
  ],
  code: [
    { lang: 'python', code: PY.bpe, run: true, title: 'BPE trainer in pure Python: prints every merge' },
    { lang: 'python', code: `# Real tokenizer (needs the tiktoken library, so it is not run here)
import tiktoken

enc = tiktoken.get_encoding("cl100k_base")      # vocabulary used by several OpenAI models
ids = enc.encode("strawberry")
print(ids)                                       # a short list of integers
print([enc.decode([i]) for i in ids])            # the text piece behind each id

text = "Interview Mastery is fun."
print(len(text), "characters ->", len(enc.encode(text)), "tokens")`, check: false, title: 'tiktoken (library, not run in browser)' }
  ],
  codeTitle: ['Train BPE from scratch (runs in your browser)', 'Use a real tokenizer'],
  viz: [{
    title: 'BPE training: count pairs, merge the winner',
    input: 'low:5 lower:2 newest:6 widest:3',
    inputLabel: 'word:count pairs (space separated, max 6 words)',
    gen: function (input) {
      var parts = String(input).trim().split(/[\s,]+/).filter(Boolean);
      if (!parts.length || parts.length > 6) throw new Error('Enter 1 to 6 items like low:5 newest:6');
      var words = parts.map(function (t) {
        var m = t.split(':'); var n = m.length > 1 ? Number(m[1]) : 1;
        if (!/^[a-z]+$/.test(m[0]) || !(n >= 1) || m[0].length > 10) throw new Error('Use lowercase words (max 10 letters) like low:5');
        return { sym: m[0].split('').concat(['_']), n: n };
      });
      function wordMap(hlTok) {
        var entries = [], hl = {};
        words.forEach(function (w) { var k = w.sym.join(' '); entries.push([k, w.n]); if (hlTok && w.sym.indexOf(hlTok) >= 0) hl[k] = 'ok'; });
        return { type: 'map', label: 'Corpus as pieces : frequency', entries: entries, hl: hl };
      }
      var frames = [{ narr: 'Start: every word is split into <b>single letters</b> plus an end marker <code>_</code>. These letters are our starting vocabulary.', parts: [wordMap(null)] }];
      var merges = [];
      for (var step = 1; step <= 7; step++) {
        var cnt = {};
        words.forEach(function (w) { for (var i = 0; i < w.sym.length - 1; i++) { var k = w.sym[i] + '\u0001' + w.sym[i + 1]; cnt[k] = (cnt[k] || 0) + w.n; } });
        var list = Object.keys(cnt).map(function (k) { var p = k.split('\u0001'); return { a: p[0], b: p[1], c: cnt[k] }; });
        list.sort(function (x, y) { return y.c - x.c || (x.a < y.a ? 1 : x.a > y.a ? -1 : (x.b < y.b ? 1 : x.b > y.b ? -1 : 0)); });
        if (!list.length || list[0].c < 2) break;
        var best = list[0], rows = list.slice(0, 8).map(function (e) { return [e.a + ' + ' + e.b, e.c]; });
        frames.push({ narr: 'Merge #' + step + ': count every neighbouring pair (weighted by word frequency). The winner is <b>' + best.a + ' + ' + best.b + '</b> seen <b>' + best.c + '</b> times. Ties are broken by a fixed rule so results repeat.', parts: [{ type: 'table', label: 'Pair counts (top 8)', columns: ['pair', 'count'], rows: rows, hl: { 0: 'win' } }, wordMap(null)] });
        var tok = best.a + best.b;
        words.forEach(function (w) { var out = [], i = 0; while (i < w.sym.length) { if (i < w.sym.length - 1 && w.sym[i] === best.a && w.sym[i + 1] === best.b) { out.push(tok); i += 2; } else { out.push(w.sym[i]); i++; } } w.sym = out; });
        merges.push(tok);
        frames.push({ narr: 'Glue it: every <code>' + best.a + ' ' + best.b + '</code> becomes one piece <b>' + tok + '</b> (green). New vocabulary item. Merge list so far: ' + merges.join(', '), parts: [wordMap(tok), { type: 'set', label: 'Merge list (in order)', items: merges.slice() }] });
      }
      frames.push({ narr: 'Done. Frequent chunks (like word endings) are now single tokens. Rare words stay as small pieces, so <b>any</b> text can still be encoded.', parts: [wordMap(null), { type: 'set', label: 'Learned merges', items: merges.slice() }] });
      return frames;
    }
  }, {
    title: 'From text to token ids (and why letters disappear)',
    input: 'the cat sat on the mat.',
    inputLabel: 'Text (lowercase; try: strawberry, unbelievable)',
    gen: function (input) {
      var text = String(input).toLowerCase();
      if (!text.length || text.length > 60) throw new Error('Enter 1 to 60 characters');
      var voc = [' the', ' cat', ' sat', ' on', ' mat', 'the', 'cat', 'sat', 'on', 'mat', 'un', 'believ', 'able', 'straw', 'berry', 'ing', 'ed', 'er', 'est', ' ', '.', '?'];
      'abcdefghijklmnopqrstuvwxyz'.split('').forEach(function (c) { voc.push(c); });
      var toks = [], ids = [], i = 0, frames = [];
      frames.push({ narr: 'Our toy vocabulary has ' + voc.length + ' pieces. Real models have 30,000 to 200,000. We read left to right and always take the <b>longest piece that matches</b>.', parts: [{ type: 'array', label: 'Characters', values: text.split('') }] });
      while (i < text.length) {
        var bestLen = 0, bestId = -1;
        for (var v = 0; v < voc.length; v++) { var s = voc[v]; if (s.length > bestLen && text.substr(i, s.length) === s) { bestLen = s.length; bestId = v; } }
        if (bestId < 0) { bestId = voc.length; voc.push('?'); bestLen = 1; toks.push('<unk>'); } else { toks.push(voc[bestId]); }
        ids.push(bestId);
        var hl = {}; hl[toks.length - 1] = 'cur';
        var chHl = {}; for (var k = i; k < i + bestLen; k++) chHl[k] = 'win';
        frames.push({ narr: 'At position ' + i + ' the longest match is <b>"' + toks[toks.length - 1] + '"</b> -> id <b>' + bestId + '</b>.', parts: [{ type: 'array', label: 'Characters (matched piece in blue)', values: text.split(''), hl: chHl }, { type: 'array', label: 'Tokens', values: toks.slice(), hl: hl }, { type: 'array', label: 'Token ids (what the model really gets)', values: ids.slice(), hl: hl }] });
        i += bestLen;
        if (toks.length > 40) break;
      }
      frames.push({ narr: '<b>' + text.length + ' characters became ' + toks.length + ' tokens.</b> The model only sees the id row. If a word is one token, the letters inside it are invisible to the model, which is why letter counting is hard for it.', parts: [{ type: 'array', label: 'Tokens', values: toks.slice() }, { type: 'array', label: 'Ids', values: ids.slice() }, { type: 'vars', vals: { characters: text.length, tokens: toks.length, 'chars per token': Math.round(text.length / toks.length * 10) / 10 } }] });
      return frames;
    }
  }],
  examples: [
    { title: 'Run BPE by hand on "aaabdaaabac"', html: `<p>Classic exercise. Start as single letters: <code>a a a b d a a a b a c</code>.</p>
      ${H.table(['Round', 'Pair counts', 'Merge', 'Text now'], [['1', 'aa=4, ab=2, others 1', 'aa -> Z', 'Z a b d Z a b a c'], ['2', 'Za=2, ab=2 (tie)', 'ab -> Y (pick one by rule)', 'Z Y d Z Y a c'], ['3', 'ZY=2', 'ZY -> X', 'X d X a c']])}
      <p>The string shrank from 11 pieces to 5. Each merge removes (count of that pair) pieces. Vocabulary grew by 3 new tokens: Z, Y, X.</p>` },
    { title: 'Estimate tokens and cost of a prompt', html: `<p>Your app sends a 6,000-character support ticket and gets a 1,200-character reply. Rule: 4 chars per token.</p>
      ${H.table(['Part', 'Characters', 'Tokens', 'Price (example: $3 / 1M in, $15 / 1M out)'], [['Input', '6,000', '1,500', '1,500 x $3 / 1M = $0.0045'], ['Output', '1,200', '300', '300 x $15 / 1M = $0.0045'], ['<b>Total per call</b>', '', '1,800', '<b>$0.009</b>']])}
      <p>At 100,000 tickets a month that is about <b>$900</b>. Prices here are illustrative; always check the current price page. Notice output tokens cost more and half your cost came from only 300 tokens.</p>` },
    { title: 'Why "How many r in strawberry?" is hard', html: `<p>The model sees ids, not letters: <code>[straw][berry]</code> = two numbers. To answer it must have <i>memorised</i> the spelling of each token from training text. That works for common words, fails for odd ones. Fix: ask it to <b>spell the word out letter by letter first</b> (this creates one token per letter) or use a code tool.</p>
      ${H.arr(['s','t','r','a','w','b','e','r','r','y'], { label: 'Spelled out: now each letter is its own token', hl: { 2: 'g', 7: 'g', 8: 'g' } })}
      <p>Three green r letters: 3. The reasoning is easy once letters are visible.</p>`, code: { lang: 'python', code: `word = "strawberry"
print(word.count("r"))        # code sees characters, so counting is trivial: 3
print(list(word))`, run: true, title: 'A program sees characters, so it can count' } },
    { title: 'Same meaning, different token cost', html: `<p>Capitalisation, leading spaces, numbers and other languages all change the split.</p>
      ${H.table(['Text', 'Typical split', 'Tokens (about)'], [['hello', '[hello]', '1'], [' Hello', '[ Hello]', '1 (different id!)'], ['1234567', '[123][456][7]', '3'], ['internationalization', '[intern][ational][ization]', '3'], ['Hindi sentence of 5 words', 'many byte-level pieces', '15 to 30']])}
      <p>Practical effect: budgets, rate limits and context sizes are in <b>tokens</b>, so non-English users and code-heavy prompts burn them faster.</p>` }
  ],
  deepDive: `<p><b>Byte-level BPE.</b> GPT-2 and later start from the 256 possible bytes rather than characters, so there is never an "unknown" token: any emoji or script falls back to byte pieces. The cost is that rare scripts need more tokens. Other families use SentencePiece (unigram or BPE) and treat spaces as a visible symbol (the <code>_</code> you saw).</p>
  <p><b>Pre-tokenization.</b> Before merging, text is first split with a regex into words, numbers and punctuation chunks, so merges never cross a space-word boundary in odd ways. That is why <code> the</code> (with a leading space) is its own token.</p>
  <p><b>Training vs using.</b> Training the tokenizer is a one-time step on a sample of the corpus, separate from training the model. After that the merge list is frozen: the model weights only make sense for that exact vocabulary. Swapping tokenizers means retraining.</p>
  <p><b>Vocab size trade-off.</b> Bigger vocab = fewer tokens per text (cheaper, longer effective context) but a bigger embedding table and an output layer that scores more candidates every step, and rare tokens get too little training ("glitch tokens" such as under-trained strings can behave strangely). Common sizes: 32k (Llama 2), 100k to 200k (newer models).</p>
  <p><b>Artifacts you should know.</b> Numbers split inconsistently, so arithmetic suffers; trailing spaces in prompts change output; text in rare languages costs 2x to 4x more. Some newer systems try byte-level or character-aware models to remove these problems, but BPE-family tokenizers remain the norm in 2026.</p>
  <p><b>Complexity.</b> Naive training is O(merges x corpus size). Real implementations track pair counts incrementally and use priority queues. Encoding is fast with caching of common words.</p>`,
  aiEra: `<p><b>What AI changes:</b> you now pay by the token and fit work inside a token budget, so knowing tokens is a day-to-day skill, like knowing bytes. Tokenizers are also how prompts leak cost: a long system prompt is paid again on every call (unless cached).</p>
  <p><b>Use AI as a partner:</b> paste text into an official tokenizer page or library to count, rather than asking the model to count (it guesses). Ask the model to "show the steps of BPE on this tiny corpus" to check your hand work, then verify with the runnable code above.</p>
  <p><b>Where AI goes wrong:</b> letter counting, reversing strings, exact character limits ("write exactly 280 characters"), and arithmetic on long numbers. These are token-visibility problems, not intelligence problems. Route them to code tools.</p>
  <p><b>What you must still own:</b> estimating cost and context before building, choosing between "ask the model" and "run code" for character-level tasks, and explaining in an interview why the failures happen.</p>`,
  problems: [{
    title: 'Estimate the Monthly Bill of a Chatbot',
    level: 'Easy', tags: ['tokens', 'cost'], companies: ['Any AI startup'],
    statement: `<p>A chatbot receives <b>20,000 chats per day</b>. Each chat has a system prompt of 800 tokens, an average user message of 120 words, and an average reply of 200 words. Input is priced at <b>$2 per 1M tokens</b>, output at <b>$10 per 1M tokens</b>. Estimate the monthly (30-day) cost. Then say what single change saves the most money.</p>`,
    constraints: `Use 1 word = 4/3 tokens (0.75 words per token). Ignore chat history for now.`,
    example: `<p>120 words = 160 tokens. Input per chat = 800 + 160 = <b>960</b>. 200 words = <b>267</b> output tokens (rounded).</p>`,
    brute: { why: `<p>Guessing "a few cents per chat" with no maths. It hides that the 800-token system prompt is paid 20,000 times a day and that output is 5x more expensive per token.</p>` },
    mcq: { q: 'Which part of the bill is easiest to shrink without changing quality?', options: ['The repeated system prompt (trim it or cache it)', 'The user message', 'The number of chats', 'The price per token'], answer: 0, explain: 'The system prompt is identical every call, so shortening or caching it cuts cost with no quality loss for the user.' },
    hints: [`<p>Convert words to tokens first, then work per chat, then per month.</p>`, `<p>Input cost and output cost use different prices. Compute them separately.</p>`, `<p>Per chat: input 960 x $2/1M = $0.00192; output 267 x $10/1M = $0.00267. Total $0.00459. Multiply by 20,000 x 30 = 600,000 chats.</p>`],
    solution: {
      approach: `<p>Per chat input = 800 + 160 = 960 tokens, cost 960 x 2 / 1,000,000 = $0.00192. Output = 267 tokens, cost 267 x 10 / 1,000,000 = $0.00267. One chat = $0.00459. Monthly chats = 20,000 x 30 = 600,000, so the bill is about <b>$2,754 per month</b>. Output is 58% of the cost even though it is only 22% of the tokens, because it is priced 5x higher. The system prompt is 800 of the 1,227 total tokens per chat (65%), so the biggest saving is to <b>cache or shorten the system prompt</b> (many providers discount cached input heavily). Second lever: ask for shorter replies. Choosing a smaller model for easy questions helps too.</p>`,
      code: { lang: 'python', code: `chats = 20_000 * 30
inp = 800 + 120 * 4 / 3          # system prompt + user words converted to tokens
out = 200 * 4 / 3
cost = chats * (inp * 2 + out * 10) / 1_000_000
print(round(inp), round(out), "tokens per chat")
print("monthly cost: $%.0f" % cost)`, run: true },
      complexity: `<p>Constant-time arithmetic. The skill is converting units correctly.</p>`,
      followUps: ['How does adding chat history change the cost curve?', 'How would prompt caching change the formula?']
    }
  }]
});

// ---------- TOPIC 2: Embeddings ----------
topics.push({
  title: 'Embeddings: Giving Every Token a Meaning-Address',
  analogy: `<p>Imagine a huge map of a city where every word has an <b>address</b>. "cat", "dog" and "kitten" live in the same neighbourhood (pets). "car", "truck" and "bus" live across town (vehicles). "apple" and "bread" live in the food market. An embedding is just that address: a list of numbers. Words with similar meaning get nearby addresses, so the model can tell "close in meaning" by measuring distance.</p>`,
  explain: `<p>A token id like <code>4721</code> is just a label; the number 4721 is not "bigger" in meaning than 4720. The model needs numbers that carry meaning. So it keeps a big table, the <b>embedding matrix</b>: one row per token in the vocabulary, each row a vector of <b>d</b> numbers (d is 768 to 12,000 or more in real models).</p>
  <p><b>Lookup is simple:</b> token id 4721 -> take row 4721 of the table. That row is the token's starting vector.</p>
  ${H.table(['token', 'id', 'embedding (toy, 3 numbers)'], [['cat', '4721', '[0.90, 0.05, 0.10]'], ['dog', '3290', '[0.85, 0.10, 0.10]'], ['car', '1822', '[0.05, 0.90, 0.00]'], ['apple', '9015', '[0.00, 0.00, 0.95]']])}
  <p>In our toy table, the three dimensions are roughly "animal-ness, vehicle-ness, food-ness". Real dimensions are not neat labels; the model invents its own during training. We just look at the pattern: cat and dog are close, car is far from both.</p>
  <p><b>Measuring closeness: cosine similarity.</b> It compares the <i>direction</i> of two vectors: 1.0 = same direction, 0 = unrelated, negative = opposite. Formula: dot(a, b) / (|a| x |b|). Worked: cat . dog = 0.9x0.85 + 0.05x0.10 + 0.10x0.10 = 0.78; |cat| = 0.91, |dog| = 0.86; cosine = 0.78 / (0.91 x 0.86) = <b>0.997</b>. Cat vs car: 0.9x0.05 + 0.05x0.9 + 0 = 0.09; cosine = 0.09 / (0.91 x 0.90) = <b>0.11</b>.</p>
  <p><b>Order matters too.</b> "Dog bites man" and "man bites dog" have the same tokens. So the model also adds a <b>position signal</b> to each embedding (learned positions or rotary encoding, RoPE) so it knows who is first, second, third.</p>
  <p><b>The embedding is learned.</b> It starts as random numbers. During training, whenever the model predicts the next word badly, the table rows are nudged. Words that appear in similar contexts drift together. Nobody types in the meanings.</p>`,
  clues: [
    '"Semantic search" / "find similar documents" / "RAG" - embed text, compare with cosine similarity',
    '"How does the model know that king and queen are related?" - nearby vectors learned from context',
    '"Why do we need positional encoding?" - attention alone ignores word order',
    '"Vector database" / "nearest neighbour" / "top-k similar" - all built on embeddings',
    '"Embedding dimension" / "model size" - d controls how much meaning each token carries and drives parameter count',
    '"Same word, different meaning (bank of a river vs bank account)" - the starting embedding is the same; attention later makes it context-aware'
  ],
  code: [
    { lang: 'python', code: `import math

# Toy embedding table: dims = (animal-ness, vehicle-ness, food-ness)
emb = {
    "cat":   [0.90, 0.05, 0.10],
    "dog":   [0.85, 0.10, 0.10],
    "kitten":[0.90, 0.00, 0.15],
    "car":   [0.05, 0.90, 0.00],
    "truck": [0.10, 0.85, 0.05],
    "apple": [0.00, 0.00, 0.95],
    "bread": [0.05, 0.00, 0.90],
}

def cosine(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    return dot / (na * nb)

def nearest(word, k=3):
    scores = [(cosine(emb[word], v), w) for w, v in emb.items() if w != word]
    return sorted(scores, reverse=True)[:k]

for q in ("cat", "car", "apple"):
    print(q, "->", [(w, round(s, 2)) for s, w in nearest(q)])

# Lookup is just indexing: token id -> row of the table
vocab = ["cat", "dog", "kitten", "car", "truck", "apple", "bread"]
token_ids = [vocab.index(w) for w in ["dog", "car"]]
print("ids", token_ids, "-> vectors", [emb[vocab[i]] for i in token_ids])`, run: true, title: 'Embedding lookup and cosine similarity (stdlib)' },
    { lang: 'python', code: `# Real model code (PyTorch), not run in the browser
import torch, torch.nn as nn

vocab_size, d_model = 50_000, 768
embed = nn.Embedding(vocab_size, d_model)        # the table: 50,000 rows x 768 numbers
ids = torch.tensor([[464, 3797, 3332]])          # shape (batch=1, tokens=3)
x = embed(ids)                                   # shape (1, 3, 768): one vector per token
print(x.shape, "parameters in table:", vocab_size * d_model)   # 38.4 million`, check: false, title: 'Same idea in PyTorch' }
  ],
  codeTitle: ['Toy embeddings and nearest neighbours', 'nn.Embedding in PyTorch'],
  viz: [{
    title: 'Which words live close together?',
    input: 'cat',
    inputLabel: 'Query word: cat, dog, kitten, car, truck, apple or bread',
    gen: function (input) {
      var E = { cat: [0.9, 0.05, 0.1], dog: [0.85, 0.1, 0.1], kitten: [0.9, 0, 0.15], car: [0.05, 0.9, 0], truck: [0.1, 0.85, 0.05], apple: [0, 0, 0.95], bread: [0.05, 0, 0.9] };
      var q = String(input).trim().toLowerCase();
      if (!E[q]) throw new Error('Pick one of: cat, dog, kitten, car, truck, apple, bread');
      var names = Object.keys(E);
      function cos(a, b) { var d = 0, na = 0, nb = 0; for (var i = 0; i < 3; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; } return d / Math.sqrt(na * nb); }
      var rows = names.map(function (n) { return E[n].map(function (v) { return v.toFixed(2); }); });
      var hl = {}; hl[names.indexOf(q) + ',0'] = 'cur'; hl[names.indexOf(q) + ',1'] = 'cur'; hl[names.indexOf(q) + ',2'] = 'cur';
      var frames = [{ narr: 'Every token has a row of numbers (its embedding). Our toy table has 3 numbers per word: animal-ness, vehicle-ness, food-ness. Looking up <b>' + q + '</b> means taking its row.', parts: [{ type: 'grid', label: 'Embedding table', rowHead: names, colHead: ['animal', 'vehicle', 'food'], rows: rows, hl: hl }] }];
      var sims = names.filter(function (n) { return n !== q; }).map(function (n) { return { n: n, s: cos(E[q], E[n]) }; });
      var ids = {}; names.forEach(function (n, i) { ids[n] = i; });
      frames.push({ narr: 'Compare <b>' + q + '</b> with each other word using cosine similarity: dot(a,b) / (|a| x |b|). Close to 1 means same direction (similar meaning).', parts: [{ type: 'vars', vals: { query: q, vector: '[' + E[q].join(', ') + ']' } }, { type: 'bars', label: 'Cosine similarity to ' + q + ' (unsorted)', values: sims.map(function (s) { return Math.max(0, Math.round(s.s * 100)) / 100; }), idxLabels: sims.map(function (s) { return s.n; }), texts: sims.map(function (s) { return s.s.toFixed(2); }) }] });
      sims.sort(function (a, b) { return b.s - a.s; });
      var bh = {}; bh[0] = 'ok'; bh[1] = 'ok'; bh[sims.length - 1] = 'bad'; bh[sims.length - 2] = 'bad';
      frames.push({ narr: 'Sorted: the top two (green) are the nearest neighbours. The farthest (red) belong to unrelated topics. This is exactly how semantic search and RAG pick documents.', parts: [{ type: 'bars', label: 'Sorted by similarity', values: sims.map(function (s) { return Math.max(0, Math.round(s.s * 100)) / 100; }), idxLabels: sims.map(function (s) { return s.n; }), texts: sims.map(function (s) { return s.s.toFixed(2); }), hl: bh }] });
      var tok = ['the', q, 'is']; var tid = tok.map(function (t) { return E[t] ? ids[t] : 100 + t.length; });
      frames.push({ narr: 'In the real model a sentence becomes ids, then ids become vectors, and a <b>position signal</b> is added so word order is not lost.', parts: [{ type: 'array', label: 'Tokens', values: tok, hl: { 1: 'cur' } }, { type: 'array', label: 'Ids', values: tid, hl: { 1: 'cur' } }, { type: 'text', html: 'Each id becomes a vector of <b>d</b> numbers (768 to 12,000+ in real models). Then <code>x = embedding(id) + position</code>.' }] });
      return frames;
    }
  }],
  examples: [
    { title: 'Compute cosine similarity by hand', html: `<p>Vectors a = [1, 2], b = [2, 4], c = [2, -1].</p>
      ${H.table(['Pair', 'dot', '|a| x |b|', 'cosine', 'meaning'], [['a, b', '1x2 + 2x4 = 10', '2.236 x 4.472 = 10', '<span class="c-g">1.00</span>', 'same direction (b is just a scaled a)'], ['a, c', '1x2 + 2x(-1) = 0', '2.236 x 2.236 = 5', '<span class="c-y">0.00</span>', 'unrelated (at right angle)']])}
      <p>Notice cosine ignores length. That is useful because a long document and a short one on the same topic should still match.</p>` },
    { title: 'How big is the embedding table?', html: `<p>Vocab 100,000 and d = 4,096.</p>
      ${H.table(['Item', 'Calculation', 'Result'], [['Numbers in table', '100,000 x 4,096', '409.6 million'], ['Memory at 2 bytes each (fp16)', '409.6M x 2', '~0.8 GB'], ['Share of a 7B model', '0.41B / 7B', '~6%']])}
      <p>Many models also reuse (tie) the same table at the output end to turn the final vector back into token scores, saving that memory twice.</p>` },
    { title: 'Same word, two meanings', html: `<p>"I sat on the river <b>bank</b>" vs "I opened a <b>bank</b> account". The lookup gives the <i>same</i> starting vector for "bank" both times. The model fixes this in the next layers: attention lets "bank" borrow information from "river" or "account", so its vector changes to the right meaning. That is the topic of the next section.</p>
      ${H.arr(['river', 'bank'], { label: 'bank near river -> nature meaning', hl: { 1: 'g' } })}${H.arr(['account', 'bank'], { label: 'bank near account -> money meaning', hl: { 1: 'b' } })}` },
    { title: 'Embeddings for search (what RAG uses)', html: `<p>Break your docs into chunks, embed each chunk once, store the vectors. For a user question: embed the question, find the chunks with highest cosine similarity, paste the top few into the prompt. The retrieval embedding models are separate, smaller models trained for this job, but the idea is the same table-of-meaning concept.</p>` }
  ],
  deepDive: `<p><b>Why vectors work.</b> Training pushes tokens that appear in similar contexts to have similar vectors, because that helps predict the next word. Famous side effect: directions have meaning, e.g. vec(king) - vec(man) + vec(woman) lands near vec(queen). Real spaces are messy and the effect is approximate.</p>
  <p><b>Dimension trade-off.</b> More dimensions = more capacity, more memory and compute. d_model sets the width of every layer, so parameter count grows with d<sup>2</sup>.</p>
  <p><b>Positions.</b> Original transformers added fixed sine/cosine waves. GPT-2 learned a position table. Most modern models use <b>RoPE</b> (rotary): they rotate the query and key vectors by an angle that depends on position, so attention scores depend on the <i>relative distance</i> between tokens. Long-context tricks (position interpolation, YaRN) stretch these rotations.</p>
  <p><b>Static vs contextual.</b> The lookup table gives <i>static</i> vectors (word2vec style). Layer after layer, the transformer turns them into <i>contextual</i> vectors. The vector at the last layer for the final position is what predicts the next token.</p>
  <p><b>Gotchas.</b> Embeddings from different models are not comparable (different spaces). If you change your embedding model you must re-embed everything. Vectors also carry social biases found in training text. Normalising vectors to length 1 makes cosine equal to a plain dot product, which is faster in vector databases.</p>`,
  aiEra: `<p><b>What AI changes:</b> embeddings became a product feature, not just a model part: semantic search, recommendations, deduplication, clustering support tickets, and RAG all run on embedding APIs.</p>
  <p><b>Use AI as a partner:</b> ask a model to generate 20 tricky query/document pairs (paraphrases, near-misses) to test your retrieval. Ask it to explain why two chunks scored similarly and how to improve chunking.</p>
  <p><b>Where AI goes wrong:</b> similarity is not truth. A chunk that mentions the right words but says the opposite ("refunds are NOT allowed") can score highly. Numbers, negations and rare IDs are weak spots; combine with keyword search (hybrid) and rerankers.</p>
  <p><b>What you must still own:</b> chunking strategy, choosing and versioning the embedding model, evaluating retrieval quality with real queries, and remembering that changing the model means re-indexing.</p>`
});

// ---------- TOPIC 3: Self-attention ----------
topics.push({
  title: 'Self-Attention: Each Word Looks at the Others',
  analogy: `<p>You are in a meeting and someone says "<b>it</b> was too heavy". To understand "it", you glance back at earlier words and decide which one matters: "the suitcase", not "the airport". You give each earlier word a <b>percentage of your attention</b> (suitcase 80%, airport 5%...) and mix in their information. Self-attention is the model doing exactly this, for every word, at the same time.</p>`,
  explain: `<p>Every token makes three small vectors from its embedding (using three learned weight matrices):</p>
  <ul>
    <li><b>Query (Q)</b> - "what am I looking for?"</li>
    <li><b>Key (K)</b> - "what do I contain / what can I be found by?"</li>
    <li><b>Value (V)</b> - "the information I will hand over if you pick me."</li>
  </ul>
  <p><b>Four steps:</b></p>
  <ol>
    <li><b>Score:</b> for token i, take dot(Q_i, K_j) with every token j. Big score = good match.</li>
    <li><b>Scale:</b> divide by &radic;d (d = size of the key vector) so scores do not get huge.</li>
    <li><b>Softmax:</b> turn scores into percentages that add up to 1. These are the <b>attention weights</b>.</li>
    <li><b>Mix:</b> output_i = sum over j of weight_ij x V_j. A weighted blend of the values.</li>
  </ol>
  <p>Formula in one line: <code>Attention(Q,K,V) = softmax(Q K<sup>T</sup> / &radic;d) V</code>.</p>
  <p><b>Worked example (3 tokens: the, cat, sat; d = 2).</b> Take Q = K = [[1,0],[0,1],[1,1]]. Row for "sat" (Q = [1,1]): dots with the three keys are 1, 1, 2. Divide by &radic;2 = 1.414: scores 0.71, 0.71, 1.41. Softmax: e<sup>0.71</sup> = 2.03, e<sup>0.71</sup> = 2.03, e<sup>1.41</sup> = 4.11; sum 8.17; weights = <b>0.25, 0.25, 0.50</b>. "sat" pays half of its attention to itself and a quarter to each other word.</p>
  ${H.table(['', 'the', 'cat', 'sat'], [['the', '0.40', '0.20', '0.40'], ['cat', '0.20', '0.40', '0.40'], ['sat', '0.25', '0.25', '<b>0.50</b>']])}
  <p><b>The causal mask (GPT-style models).</b> When generating, a token must not peek at the future. So scores for later tokens are set to minus infinity before softmax, giving weight 0. "the" can only see itself (weight 1.0); "cat" splits between "the" and "cat" (0.33, 0.67); "sat" sees all three.</p>
  <p><b>Multi-head.</b> One attention pattern is not enough (one head may track grammar, another "who does 'it' refer to"). Models run 8 to 128 <b>heads</b> in parallel, each with smaller vectors, then join the results.</p>`,
  clues: [
    '"Explain self-attention / what are Q, K and V?" - query asks, key advertises, value is the content; softmax(QK^T/sqrt(d))V',
    '"Why divide by sqrt(d)?" - keeps dot products from growing with d, which would make softmax too sharp and gradients tiny',
    '"Why is attention O(n^2)?" - every token scores against every other token; n x n matrix',
    '"What is a causal / decoder-only mask?" - blocks looking at future tokens so training matches generation',
    '"Multi-head attention" - several attention patterns in parallel',
    '"How does the model resolve pronouns / long-range references?" - attention directly links distant tokens, unlike older RNNs'
  ],
  code: [
    { lang: 'python', code: PY.attn, run: true, title: 'Scaled dot-product attention on 3 tiny tokens (stdlib)' },
    { lang: 'python', code: `# Real implementation (PyTorch), not run in the browser
import math, torch
import torch.nn.functional as F

def attention(q, k, v, causal=True):
    # q, k, v: (batch, tokens, d)
    d = q.size(-1)
    scores = q @ k.transpose(-2, -1) / math.sqrt(d)      # (batch, tokens, tokens)
    if causal:
        n = q.size(1)
        mask = torch.triu(torch.ones(n, n, dtype=torch.bool), diagonal=1)
        scores = scores.masked_fill(mask, float("-inf"))  # hide the future
    w = F.softmax(scores, dim=-1)                         # rows sum to 1
    return w @ v, w`, check: false, title: 'Attention in PyTorch' }
  ],
  codeTitle: ['Attention weights by hand, in code', 'PyTorch version'],
  viz: [{
    title: 'Attention weight matrix for "the cat sat"',
    input: 'causal',
    inputLabel: 'Mask mode: full (can see everything) or causal (GPT-style)',
    gen: function (input) {
      var mode = String(input).trim().toLowerCase();
      if (mode !== 'full' && mode !== 'causal') throw new Error('Type full or causal');
      var toks = ['the', 'cat', 'sat'];
      var Q = [[1, 0], [0, 1], [1, 1]], K = Q, V = [[1, 0], [0, 2], [1, 1]];
      var S = [], Wt = [];
      for (var i = 0; i < 3; i++) {
        var row = [];
        for (var j = 0; j < 3; j++) row.push((Q[i][0] * K[j][0] + Q[i][1] * K[j][1]) / Math.sqrt(2));
        S.push(row);
        var masked = row.map(function (s, j2) { return (mode === 'causal' && j2 > i) ? -Infinity : s; });
        var ex = masked.map(function (s) { return s === -Infinity ? 0 : Math.exp(s - Math.max.apply(null, masked.filter(isFinite))); });
        var sum = ex.reduce(function (a, b) { return a + b; }, 0);
        Wt.push(ex.map(function (e) { return e / sum; }));
      }
      function f2(x) { return (Math.round(x * 100) / 100).toFixed(2); }
      var frames = [];
      frames.push({ narr: 'Three tokens, each with a Query and a Key (2 numbers each). Scores = Q x K, scaled by 1/&radic;2 = 0.71. Rows are the token that is <i>asking</i>; columns are the token being <i>looked at</i>.', parts: [{ type: 'grid', label: 'Q (rows) and K (same here)', rowHead: toks, colHead: ['x', 'y'], rows: Q.map(function (r) { return r.map(String); }) }] });
      frames.push({ narr: 'Raw scores = dot(Q_i, K_j) / &radic;d. Higher means a better match. The diagonal is high because each token matches itself.', parts: [{ type: 'grid', label: 'Scaled scores', rowHead: toks, colHead: toks, rows: S.map(function (r) { return r.map(f2); }) }] });
      if (mode === 'causal') {
        frames.push({ narr: 'Causal mask: a token may not look at the future. Entries to the right of the diagonal become minus infinity, so their softmax weight will be exactly 0.', parts: [{ type: 'grid', label: 'Scores after mask', rowHead: toks, colHead: toks, rows: S.map(function (r, i2) { return r.map(function (s, j2) { return j2 > i2 ? '-inf' : f2(s); }); }), hl: { '0,1': 'bad', '0,2': 'bad', '1,2': 'bad' } }] });
      }
      var shown = [['', '', ''], ['', '', ''], ['', '', '']], hl = {};
      for (var r = 0; r < 3; r++) {
        shown[r] = Wt[r].map(f2);
        var bi = 0; for (var c = 1; c < 3; c++) if (Wt[r][c] > Wt[r][bi]) bi = c;
        hl[r + ',' + bi] = 'cur';
        frames.push({ narr: 'Softmax for <b>' + toks[r] + '</b>: exp each score and divide by the total, so the row adds to 1.00. The strongest attention (amber) goes to <b>' + toks[bi] + '</b> (' + f2(Wt[r][bi]) + ').', parts: [{ type: 'grid', label: 'Attention weights (each row sums to 1)', rowHead: toks, colHead: toks, rows: shown.map(function (x) { return x.slice(); }), hl: JSON.parse(JSON.stringify(hl)) }] });
      }
      var out = Wt.map(function (w) { return [0, 1].map(function (k) { return f2(w[0] * V[0][k] + w[1] * V[1][k] + w[2] * V[2][k]); }); });
      frames.push({ narr: 'Final step: each token\'s new vector = weights x Values (V = [1,0], [0,2], [1,1]). For <b>sat</b>: 0.25x[1,0] + 0.25x[0,2] + 0.50x[1,1] = ' + '[' + out[2].join(', ') + ']. Each token now carries a blend of information from the tokens it attended to.', parts: [{ type: 'grid', label: 'Attention output (new vectors)', rowHead: toks, colHead: ['x', 'y'], rows: out, hl: { '2,0': 'ok', '2,1': 'ok' } }] });
      return frames;
    }
  }],
  examples: [
    { title: 'Softmax by hand', html: `<p>Scores [2, 1, 0]. exp: 7.39, 2.72, 1.00; total 11.11.</p>
      ${H.table(['token', 'exp(score)', 'weight'], [['A', '7.39', '<span class="c-g">0.665</span>'], ['B', '2.72', '0.245'], ['C', '1.00', '0.090']])}
      <p>A score gap of just 2 already gives the winner two thirds of the attention. Softmax <i>sharpens</i>.</p>` },
    { title: 'Resolving "it"', html: `<p>"The trophy did not fit in the suitcase because <b>it</b> was too big." While processing "it", its Query matches the Key of "trophy" strongly (big things are what "too big" refers to). Weights might be: trophy 0.55, suitcase 0.30, others 0.15. The new vector for "it" now carries "trophy" information. Change "big" to "small" and the model must shift the weight to "suitcase". That is why attention is described as learning <i>meaning from context</i>.</p>` },
    { title: 'Why O(n^2)? Count the matrix', html: `<p>n tokens give an n x n weight matrix.</p>
      ${H.table(['Tokens n', 'Matrix entries n x n', 'Relative cost'], [['1,000', '1,000,000', '1x'], ['8,000', '64,000,000', '64x'], ['128,000', '16.4 billion', '16,384x']])}
      <p>8x more text costs 64x more attention work. Long context is therefore expensive, and many tricks (FlashAttention, sparse or sliding-window attention) exist to tame it.</p>` },
    { title: 'Single-head vs multi-head', html: `<p>With d_model = 768 and 12 heads, each head uses 64-number Q, K, V. Head 1 might attend to the previous word, head 2 to the matching bracket, head 3 to the subject of the sentence. Their outputs are glued back to 768 numbers and passed through one more matrix. Same total cost as one big head, but several different views at once.</p>` }
  ],
  deepDive: `<p><b>Why softmax and not max?</b> Softmax is smooth, so gradients flow to all positions during training and the model can learn soft blends. A hard max would be non-differentiable.</p>
  <p><b>Why sqrt(d)?</b> If Q and K entries have variance 1, the dot product has variance d. For d = 64, raw scores have standard deviation 8, so softmax saturates (one weight near 1, others near 0) and gradients vanish. Dividing by &radic;d restores variance 1.</p>
  <p><b>KV cache.</b> During generation, the Keys and Values of old tokens never change. So the server stores them (the KV cache) and only computes Q, K, V for the new token. This turns each step from O(n^2) into O(n) but costs memory: roughly 2 x layers x d_model x bytes per token (about 0.5 MB per token for a 7B-class model in fp16), which is why long conversations need lots of GPU memory. Grouped-query attention (GQA) shares K/V across heads to cut this several times over.</p>
  <p><b>Efficiency.</b> FlashAttention computes the same result without writing the n x n matrix to slow memory, giving big speedups. Sliding-window attention lets each token see only the last w tokens.</p>
  <p><b>What heads learn.</b> Interpretability work found induction heads (copy a pattern seen earlier: "A B ... A -> B"), which are a core ingredient of in-context learning. Attention weights are not a perfect explanation of why a model said something; treat them as a clue, not proof.</p>`,
  aiEra: `<p><b>What AI changes:</b> attention is why you can paste a document and ask questions: every output token can directly look at any part of your prompt. It is also why prompt order and clarity matter: tokens compete for a fixed budget of attention weight.</p>
  <p><b>Use AI as a partner:</b> ask the model to compute a small attention example step by step, then check it against the runnable code above. Good for learning; do not trust its arithmetic blindly.</p>
  <p><b>Where AI goes wrong:</b> in very long prompts, information in the middle is used less reliably ("lost in the middle"); one irrelevant long document can dilute attention; the model can follow a misleading instruction hidden in retrieved text (prompt injection) because attention treats all tokens in the prompt alike.</p>
  <p><b>What you must still own:</b> structuring prompts (key instructions at start or end, relevant context only), reasoning about O(n^2) cost and KV cache memory when planning capacity, and explaining Q, K, V and the mask clearly in an interview.</p>`,
  problems: [{
    title: 'Compute Attention Weights for One Token',
    level: 'Medium', tags: ['attention', 'softmax'], companies: ['OpenAI', 'Google', 'Anthropic'],
    statement: `<p>A token's query gives raw dot-product scores <b>[4, 2, 0]</b> against three keys. The key size is d = 4. (a) Compute the attention weights. (b) The values are V = [10], [20], [30] (one number each). What is the output? (c) What changes if the third key is in the future and a causal mask is used?</p>`,
    constraints: `Use e<sup>0</sup> = 1, e<sup>1</sup> = 2.718, e<sup>2</sup> = 7.389. Round to 2 decimals.`,
    example: `<p>Scale: [4,2,0] / &radic;4 = [2, 1, 0]. Softmax = [0.67, 0.24, 0.09]. Output = 0.67x10 + 0.24x20 + 0.09x30 = <b>14.2</b>.</p>`,
    brute: { why: `<p>Forgetting to scale by &radic;d, or normalising by dividing by the sum of raw scores. Raw [4,2,0] would give [0.67, 0.33, 0] by luck here, but it breaks with negative scores and does not match the real model.</p>` },
    mcq: { q: 'After softmax, what must be true of one row of attention weights?', options: ['All values are between 0 and 1 and add up to 1', 'They add up to d', 'The largest is always exactly 1', 'They can be negative'], answer: 0, explain: 'Softmax outputs a probability distribution: non-negative and summing to 1.' },
    hints: [`<p>Divide every score by &radic;d first. &radic;4 = 2.</p>`, `<p>Softmax: e^score for each, divide by the total.</p>`, `<p>Scaled [2,1,0] -> [7.389, 2.718, 1] total 11.107 -> [0.665, 0.245, 0.090]. Then take the weighted sum of V. With a mask, the future score becomes minus infinity, its weight 0, and the other two re-normalise.</p>`],
    solution: {
      approach: `<p>(a) Scale: [4, 2, 0] / 2 = [2, 1, 0]. Exponentials: 7.389, 2.718, 1.000; total 11.107. Weights = [0.665, 0.245, 0.090]. (b) Output = 0.665x10 + 0.245x20 + 0.090x30 = 6.65 + 4.90 + 2.70 = <b>14.25</b>. The output is closest to the first value because the first key matched the query best. (c) With a causal mask the third score becomes minus infinity, so exp = 0. The remaining total is 7.389 + 2.718 = 10.107; weights = [0.731, 0.269, 0]; output = 7.31 + 5.38 = <b>12.69</b>. The row still sums to 1, but the model can no longer use the future token's information, which is what makes next-token training honest.</p>`,
      code: { lang: 'python', code: `import math
scores = [4, 2, 0]
d = 4
scaled = [s / math.sqrt(d) for s in scores]
ex = [math.exp(s) for s in scaled]
w = [e / sum(ex) for e in ex]
V = [10, 20, 30]
print([round(x, 3) for x in w], round(sum(a * b for a, b in zip(w, V)), 2))

# causal: last key is in the future
ex2 = [math.exp(s) for s in scaled[:2]] + [0.0]
w2 = [e / sum(ex2) for e in ex2]
print([round(x, 3) for x in w2], round(sum(a * b for a, b in zip(w2, V)), 2))`, run: true },
      complexity: `<p>One row is O(n x d). The full matrix for n tokens is O(n<sup>2</sup> x d) time and O(n<sup>2</sup>) memory without tricks like FlashAttention.</p>`,
      followUps: ['What happens to the weights if you skip the 1/sqrt(d) scaling and d = 1024?', 'How would two heads change this calculation?']
    }
  }]
});

// ---------- TOPIC 4: Transformer blocks ----------
topics.push({
  title: 'The Transformer Block: Attention + MLP + Residual + LayerNorm',
  analogy: `<p>Picture a <b>document passing through a row of editors</b>. Editor A (attention) reads the whole page and adds notes in the margin about how sentences relate. Editor B (MLP) then thinks hard about each sentence alone and adds deeper notes. Nobody erases the original text; they only <b>add notes</b> (that is the residual connection). Before each editor starts, an assistant straightens the pages to a standard size (layer norm). Stack 12 to 100+ of these editor pairs and you have a large language model.</p>`,
  explain: `<p>A transformer is the same small <b>block</b> repeated many times. One block does four things (modern "pre-norm" layout):</p>
  <ol>
    <li><b>LayerNorm:</b> rescale each token's vector so its numbers have mean 0 and a steady spread. Keeps training stable.</li>
    <li><b>Self-attention:</b> tokens exchange information (previous section).</li>
    <li><b>Residual add:</b> <code>x = x + attention_output</code>. The original vector is kept and the new info is added on top.</li>
    <li><b>LayerNorm, then MLP, then residual add:</b> <code>x = x + MLP(norm(x))</code>. The MLP (feed-forward net) is two layers: expand to 4x wider, apply a nonlinearity (GELU or SwiGLU), shrink back. It works on each token on its own.</li>
  </ol>
  <p><b>Division of labour:</b> attention <i>moves</i> information between tokens; the MLP <i>processes</i> information inside a token (it stores much of the model's factual knowledge). Both are needed.</p>
  <p><b>Why residual connections?</b> Think of a highway with exits. The main road (the residual stream) carries the vector all the way through. Each layer only adds a small correction. Gradients can flow straight back along the highway during training, so 100 layers can still learn. Without them, deep stacks fail to train.</p>
  <p><b>Full pipeline for decoder-only models (GPT, Llama, Claude-style):</b></p>
  ${H.table(['Stage', 'What happens', 'Shape (n tokens, width d)'], [['Tokens', 'text -> ids', 'n'], ['Embedding + position', 'ids -> vectors', 'n x d'], ['Block x N', 'attention + MLP with residuals', 'n x d (same shape every layer)'], ['Final norm + unembed', 'vector -> one score per vocab word', 'n x vocab'], ['Softmax (last position)', 'scores -> probabilities of the next token', 'vocab']])}
  <p>Notice the shape stays <b>n x d</b> all the way through the blocks. That is what lets you stack as many as you like.</p>
  <p><b>Counting parameters.</b> Per block: attention has 4 matrices of d x d (Q, K, V, output) = 4d<sup>2</sup>; the MLP has d x 4d and 4d x d = 8d<sup>2</sup>. Total about <b>12 d<sup>2</sup> per block</b>. Example: d = 4,096 gives ~201 million per block; 32 blocks ~6.4 billion; plus the embedding table (~0.13 billion at 32k vocab). That is the "7B" model.</p>`,
  clues: [
    '"Draw / describe a transformer block" - LayerNorm, multi-head attention, residual, LayerNorm, MLP, residual',
    '"Why residual connections?" - keep the signal and let gradients flow so deep nets train',
    '"What does the feed-forward layer do?" - per-token nonlinear processing; stores knowledge; usually 4x expansion',
    '"Encoder vs decoder vs encoder-decoder" - GPT = decoder-only with a causal mask; BERT = encoder; T5 = both',
    '"Where do the parameters live?" - ~1/3 attention, ~2/3 MLP, plus embeddings',
    '"Mixture of experts (MoE)" - replace one MLP with many, route each token to a few of them'
  ],
  code: [
    { lang: 'python', code: `import math

# A tiny, runnable "transformer block" on a single token vector, to show the DATA FLOW.
# (Attention is replaced by a fixed mixing step so you can read the numbers.)

def layer_norm(x):
    mean = sum(x) / len(x)
    var = sum((v - mean) ** 2 for v in x) / len(x)
    return [(v - mean) / math.sqrt(var + 1e-5) for v in x]

def mlp(x):
    # expand 3 -> 6 numbers, apply ReLU, shrink back 6 -> 3 (fixed toy weights)
    up = [x[0] + x[1], x[1] + x[2], x[0] - x[2], x[0] * 0.5, x[1] * 0.5, x[2] * 0.5]
    act = [max(0.0, v) for v in up]
    return [0.3 * (act[0] + act[3]), 0.3 * (act[1] + act[4]), 0.3 * (act[2] + act[5])]

def attention_stub(x):
    # stands in for attention: returns a small "information from other tokens" vector
    return [0.1, -0.2, 0.3]

def block(x):
    x1 = [a + b for a, b in zip(x, attention_stub(layer_norm(x)))]   # residual 1
    x2 = [a + b for a, b in zip(x1, mlp(layer_norm(x1)))]            # residual 2
    return x1, x2

x = [1.0, 2.0, 3.0]
print("input      ", [round(v, 2) for v in x])
for layer in range(1, 4):
    after_attn, x = block(x)
    print(f"layer {layer}: after attn {[round(v, 2) for v in after_attn]}  after mlp {[round(v, 2) for v in x]}")
print("shape never changed: still", len(x), "numbers per token")

# parameter count per block ~ 12 * d^2
for d in (768, 4096):
    print("d =", d, "-> about", round(12 * d * d / 1e6), "million params per block")`, run: true, title: 'Data flow through a block (stdlib toy)' },
    { lang: 'python', code: `# A real pre-norm decoder block in PyTorch (not run in the browser)
import torch.nn as nn

class Block(nn.Module):
    def __init__(self, d, heads):
        super().__init__()
        self.ln1 = nn.LayerNorm(d)
        self.attn = nn.MultiheadAttention(d, heads, batch_first=True)
        self.ln2 = nn.LayerNorm(d)
        self.mlp = nn.Sequential(nn.Linear(d, 4 * d), nn.GELU(), nn.Linear(4 * d, d))

    def forward(self, x, mask):
        h = self.ln1(x)
        x = x + self.attn(h, h, h, attn_mask=mask, need_weights=False)[0]   # residual 1
        x = x + self.mlp(self.ln2(x))                                       # residual 2
        return x`, check: false, title: 'PyTorch block' }
  ],
  codeTitle: ['Toy block you can run', 'Real block (PyTorch)'],
  viz: [{
    title: 'One token flowing through N transformer blocks',
    input: '2',
    inputLabel: 'Number of blocks (1 to 6)',
    gen: function (input) {
      var n = parseInt(String(input).trim(), 10);
      if (!(n >= 1 && n <= 6)) throw new Error('Enter a whole number from 1 to 6');
      var nodes = [
        { id: 'tok', label: 'Token ids', x: 10, y: 8, shape: 'box', w: 14 },
        { id: 'emb', label: 'Embed + position', x: 37, y: 8, shape: 'box', w: 20 },
        { id: 'ln1', label: 'LayerNorm 1', x: 64, y: 8, shape: 'box', w: 16 },
        { id: 'att', label: 'Self-attention', x: 88, y: 8, shape: 'box', w: 18 },
        { id: 'add1', label: '+ residual', x: 88, y: 32, shape: 'box', w: 16 },
        { id: 'ln2', label: 'LayerNorm 2', x: 64, y: 32, shape: 'box', w: 16 },
        { id: 'mlp', label: 'MLP (4x wide)', x: 37, y: 32, shape: 'box', w: 18 },
        { id: 'add2', label: '+ residual', x: 10, y: 32, shape: 'box', w: 14 },
        { id: 'out', label: 'Unembed + softmax', x: 25, y: 56, shape: 'box', w: 24 }
      ];
      var edges = [['tok', 'emb'], ['emb', 'ln1'], ['ln1', 'att'], ['att', 'add1'], ['emb', 'add1', 'skip'], ['add1', 'ln2'], ['ln2', 'mlp'], ['mlp', 'add2'], ['add1', 'add2', 'skip'], ['add2', 'out']];
      function g(hl, ehl, tags) { return { type: 'graph', label: 'Decoder block (pre-norm)', directed: true, height: 64, nodes: nodes, edges: edges, hl: hl, ehl: ehl || {}, tags: tags || {} }; }
      function stackPart(done) {
        var items = [];
        for (var i = n; i >= 1; i--) items.push('Block ' + i);
        items.unshift('Embedding');
        var hl = {}; for (var k = 1; k <= done; k++) hl[k] = 'ok';
        items = ['Embedding'].concat(Array.apply(null, Array(n)).map(function (_, i2) { return 'Block ' + (i2 + 1); })).concat(['Unembed']);
        return { type: 'stack', label: 'Layer stack (bottom to top)', items: items, hl: hl };
      }
      var f = [];
      f.push({ narr: 'The map of ONE block. The vector for each token flows along the top road, and the <b>skip lines</b> (residual) carry a copy past each sub-layer. We will repeat this block <b>' + n + '</b> time(s).', parts: [g({}), stackPart(0)] });
      f.push({ narr: '1) Tokens become ids, then <b>embedding + position</b> vectors (n tokens x d numbers). This is the start of the "residual stream".', parts: [g({ tok: 'ok', emb: 'cur' }, { 'tok-emb': 'ok' }), stackPart(0)] });
      f.push({ narr: '2) <b>LayerNorm</b> rescales the vector so attention gets well-behaved numbers.', parts: [g({ emb: 'done', ln1: 'cur' }, { 'emb-ln1': 'ok' }), stackPart(0)] });
      f.push({ narr: '3) <b>Self-attention</b>: tokens look at each other (masked so no peeking ahead) and produce an update vector.', parts: [g({ ln1: 'done', att: 'cur' }, { 'ln1-att': 'ok' }, { att: 'moves info between tokens' }), stackPart(0)] });
      f.push({ narr: '4) <b>Residual add</b>: new = old + attention update. The old vector arrives via the skip line, nothing is overwritten.', parts: [g({ att: 'done', add1: 'cur' }, { 'att-add1': 'ok', 'emb-add1': 'ok' }), stackPart(0)] });
      f.push({ narr: '5) <b>LayerNorm</b> again, then the <b>MLP</b>: widen to 4x, apply a nonlinearity, shrink back. It processes each token on its own and stores facts.', parts: [g({ add1: 'done', ln2: 'done', mlp: 'cur' }, { 'add1-ln2': 'ok', 'ln2-mlp': 'ok' }, { mlp: 'per-token thinking' }), stackPart(0)] });
      f.push({ narr: '6) Second <b>residual add</b>. Same shape comes out as went in (n x d), so the next block can take it directly.', parts: [g({ mlp: 'done', add2: 'cur' }, { 'mlp-add2': 'ok', 'add1-add2': 'ok' }), stackPart(1)] });
      for (var b = 2; b <= n; b++) f.push({ narr: 'Repeat: the output of block ' + (b - 1) + ' is the input of block <b>' + b + '</b>. Each block has its own learned weights; early blocks tend to learn simple patterns, later ones abstract ones.', parts: [g({ add2: 'sel' }, {}, { add2: 'block ' + b }), stackPart(b)] });
      f.push({ narr: '7) After the last block: final norm, then <b>unembed</b> (a matrix of d x vocab) gives one score per vocabulary token, and softmax turns scores into probabilities for the next token.', parts: [g({ add2: 'done', out: 'cur' }, { 'add2-out': 'ok' }), stackPart(n)] });
      return f;
    }
  }],
  examples: [
    { title: 'Count the parameters of a 7B-style model', html: `<p>d = 4,096, 32 blocks, vocab 32,000.</p>
      ${H.table(['Part', 'Formula', 'Parameters'], [['Attention per block', '4 x d x d', '67 million'], ['MLP per block (4x)', '8 x d x d', '134 million'], ['One block', '12 x d x d', '201 million'], ['32 blocks', '32 x 201M', '6.44 billion'], ['Embedding table', '32,000 x 4,096', '0.13 billion'], ['<b>Total</b>', '', '<b>about 6.6 billion</b>']])}
      <p>That is how a "7B" model is named. Real ones use gated MLPs and grouped-query attention, which shifts the numbers slightly.</p>` },
    { title: 'Why the output shape equals the input shape', html: `<p>Every sub-layer takes n x d and returns n x d, because the residual add needs both sides to match. So you can stack 12, 32 or 120 identical-shaped blocks, and scaling a model means making d bigger, adding more blocks, or both.</p>
      ${H.table(['Model size (approx)', 'Blocks', 'd'], [['small (GPT-2)', '12', '768'], ['7B class', '32', '4,096'], ['70B class', '80', '8,192'], ['frontier (not published)', 'many', 'large']])}` },
    { title: 'What if you remove the residual?', html: `<p>Each block must now rebuild the whole vector from scratch. Information from the early layers is squashed through dozens of transformations, signals fade, and gradients shrink toward zero on the way back. Training a deep network this way is slow or impossible. The residual makes each block only learn a <i>small edit</i>, which is far easier.</p>
      ${H.arr([1.0, 2.0, 3.0], { label: 'x (kept)', hl: {} })}${H.arr([0.1, -0.2, 0.3], { label: '+ small update from attention', hl: { 0: 'g', 1: 'r', 2: 'g' } })}${H.arr([1.1, 1.8, 3.3], { label: '= new x', hl: { 0: 'b', 1: 'b', 2: 'b' } })}` },
    { title: 'Mixture of experts in one picture', html: `<p>In an MoE model, one block's MLP is replaced by, say, 8 smaller MLPs ("experts") plus a tiny router. For each token the router picks the best 2 experts. The model has far more total parameters (more knowledge) but each token only uses a fraction (less compute per token). Attention stays the same.</p>` }
  ],
  deepDive: `<p><b>Pre-norm vs post-norm.</b> The original 2017 transformer normalised <i>after</i> the residual add. Modern models normalise <i>before</i> each sub-layer (pre-norm), which trains stably without delicate warm-up. Many now use RMSNorm (cheaper: no mean subtraction) instead of LayerNorm.</p>
  <p><b>Activation choice.</b> GELU replaced ReLU; many models now use SwiGLU, a gated MLP: two up-projections multiplied together before the down-projection. Hidden size is adjusted (about 8/3 x d) to keep parameters equal.</p>
  <p><b>Residual stream view.</b> Think of one wide vector per token that every layer reads from and writes into. Interpretability research maps what each head and MLP writes. Late layers on the last position hold the information used to predict the next token.</p>
  <p><b>Compute.</b> A forward pass costs about 2 x parameters FLOPs per token (each weight used once for a multiply and an add). Training costs about 6 x parameters x tokens. For a 7B model trained on 2 trillion tokens: 6 x 7e9 x 2e12 = 8.4e22 FLOPs.</p>
  <p><b>Variants.</b> Encoder-only (BERT) sees both directions, good for classification and embeddings. Encoder-decoder (T5) suits translation. Decoder-only dominates chat models because it trains on plain next-token prediction on all text. Alternatives such as state-space models (Mamba) and hybrids aim to avoid the n<sup>2</sup> attention cost.</p>`,
  aiEra: `<p><b>What AI changes:</b> you rarely build a block yourself; you pick a model size and architecture from an API or open weights. Knowing the block explains why bigger models cost more per token, why latency grows with model depth, and why MoE models are fast for their knowledge.</p>
  <p><b>Use AI as a partner:</b> have the model draw the data-flow with tensor shapes at each step for a given d and n, then check the shapes yourself. It is a good way to catch your own confusion.</p>
  <p><b>Where AI goes wrong:</b> explanations often mix post-norm (original paper) and pre-norm (modern) layouts, or quote wrong parameter counts. When it hands you code, check where the norm sits and that the causal mask is applied.</p>
  <p><b>What you must still own:</b> a correct mental model of shapes and parameter counts for capacity planning (memory = parameters x bytes per weight), plus clear trade-offs: dense vs MoE, depth vs width, and why quantising weights to 4 bits shrinks a model without changing the architecture.</p>`,
  problems: []
});

// ---------- TOPIC 5: Next-token prediction ----------
topics.push({
  title: 'Next-Token Prediction and Autoregressive Generation',
  analogy: `<p>Your phone's keyboard suggests the next word: "See you ..." -> <i>soon</i>. A language model is that, scaled up enormously. It looks at everything so far, writes down a <b>probability for every possible next token</b>, picks one, adds it to the text, and then asks the same question again. A whole essay is just this tiny question asked thousands of times in a row, like writing a story one word at a time while only ever looking back, never ahead.</p>`,
  explain: `<p>The whole job of the model is one question: <b>"Given all the tokens so far, what is the probability of each possible next token?"</b></p>
  <p>The model outputs a score (logit) for every token in the vocabulary. Softmax turns scores into probabilities that add to 1.</p>
  ${H.table(['Text so far', 'Next token', 'Probability'], [['The cat sat on the', ' mat', '0.54'], ['', ' sofa', '0.24'], ['', ' floor', '0.16'], ['', ' moon', '0.04'], ['', '(everything else)', '0.02']])}
  <p><b>Generation loop (autoregressive = "feeds on its own output"):</b></p>
  <ol>
    <li>Run the model on the current tokens -> probabilities for the next token.</li>
    <li>Choose one token (greedy: the top one; or sample using temperature, top-k, top-p).</li>
    <li>Append it to the text.</li>
    <li>Stop if it was the end-of-text token or the length limit; else go to step 1.</li>
  </ol>
  <p><b>Training uses the same question.</b> Take real text "The cat sat on the mat". Ask the model to predict token 2 from token 1, token 3 from tokens 1-2, and so on. The loss (cross-entropy) is <code>-log(probability given to the true next token)</code>. Giving the right word 0.54 costs 0.62; giving it 0.01 costs 4.6. Training pushes this loss down over trillions of tokens. Because of the causal mask, one pass over a text trains all positions at once.</p>
  <p><b>Why this simple goal creates a smart system.</b> To predict the next word in a physics textbook, a model benefits from knowing physics; in code, from knowing the language rules; in a story, from tracking characters. Compression of the world's text forces it to learn grammar, facts and some reasoning patterns.</p>
  <p><b>Important consequences:</b></p>
  <ul>
    <li><b>Hallucination:</b> the model produces <i>likely-sounding</i> text, not looked-up facts. If it has no reliable memory of a fact, a plausible-sounding guess still has high probability.</li>
    <li><b>No hidden plan:</b> each token is chosen given the past only. A bad early token can lead the rest of the answer astray (error compounding).</li>
    <li><b>Reasoning "out loud" helps:</b> writing intermediate steps gives later tokens something concrete to attend to.</li>
    <li><b>Cost:</b> each new token needs one pass through the whole network, so output is generated sequentially and is slower and pricier than reading the input (which is processed in parallel).</li>
  </ul>`,
  clues: [
    '"How does ChatGPT generate text?" - one token at a time, feed it back, repeat',
    '"Why does the model hallucinate?" - trained to be plausible, not verified; no lookup',
    '"Why is the first token slow, then streaming fast?" - prefill processes the prompt in parallel, then decode runs one token per step (time-to-first-token vs tokens/sec)',
    '"What is the training objective?" - minimise cross-entropy of the true next token',
    '"Greedy vs sampling vs beam search" - deterministic top pick vs random draw vs keeping several candidate sequences',
    '"When does generation stop?" - end-of-sequence token, stop strings or max_tokens'
  ],
  code: [
    { lang: 'python', code: PY.bigram, run: true, title: 'Bigram next-token generator (the tiniest language model)' },
    { lang: 'python', code: `# Generation loop with a real model (Hugging Face transformers, not run in the browser)
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

tok = AutoTokenizer.from_pretrained("gpt2")
model = AutoModelForCausalLM.from_pretrained("gpt2")

ids = tok("The cat sat on the", return_tensors="pt").input_ids
for _ in range(10):
    with torch.no_grad():
        logits = model(ids).logits[0, -1]          # scores for the NEXT token only
    probs = torch.softmax(logits, dim=-1)
    next_id = torch.argmax(probs)                  # greedy; swap in sampling here
    ids = torch.cat([ids, next_id.view(1, 1)], dim=1)   # append and loop
print(tok.decode(ids[0]))`, check: false, title: 'Real generation loop' }
  ],
  codeTitle: ['A bigram model: count, then generate', 'The same loop with a transformer'],
  viz: [{
    title: 'Autoregressive generation: probabilities, pick, append',
    input: 'the 7',
    inputLabel: 'Start word + seed number (or "the greedy")',
    gen: function (input) {
      var p = String(input).trim().toLowerCase().split(/\s+/);
      var start = p[0], greedy = p[1] === 'greedy', seed = greedy ? 0 : parseInt(p[1] || '1', 10);
      var text = 'the cat sat on the mat . the dog sat on the log . the cat saw the dog .'.split(' ');
      var follow = {};
      for (var i = 0; i < text.length - 1; i++) { var a = text[i], b = text[i + 1]; follow[a] = follow[a] || {}; follow[a][b] = (follow[a][b] || 0) + 1; }
      if (!follow[start]) throw new Error('Start with one of: the, cat, sat, on, dog, mat, log, saw, .');
      if (!greedy && isNaN(seed)) throw new Error('Second item must be a number or the word greedy');
      var out = [start], frames = [];
      frames.push({ narr: 'A tiny model learned from 3 sentences which word follows which. Start with <b>' + start + '</b>. Loop: get probabilities -> pick one -> append.', parts: [{ type: 'array', label: 'Text so far', values: out.slice(), hl: { 0: 'cur' } }] });
      var s = seed * 7919 + 13;
      for (var step = 0; step < 8; step++) {
        var last = out[out.length - 1], opts = follow[last];
        if (!opts) break;
        var names = Object.keys(opts), tot = 0; names.forEach(function (n) { tot += opts[n]; });
        var probs = names.map(function (n) { return Math.round(opts[n] / tot * 100) / 100; });
        var pick;
        if (greedy) { pick = 0; names.forEach(function (n, k) { if (opts[n] > opts[names[pick]]) pick = k; }); }
        else { s = (s * 1103515245 + 12345) % 2147483648; var r = s / 2147483648, acc = 0; pick = names.length - 1; for (var k2 = 0; k2 < names.length; k2++) { acc += opts[names[k2]] / tot; if (r <= acc) { pick = k2; break; } } }
        var bh = {}; bh[pick] = 'ok';
        frames.push({ narr: 'After <b>' + last + '</b> the model sees these next-word chances. ' + (greedy ? 'Greedy mode takes the highest.' : 'It draws randomly in proportion to the chances (seed ' + seed + ').') + ' Picked <b>' + names[pick] + '</b> (' + probs[pick] + ').', parts: [{ type: 'array', label: 'Text so far', values: out.slice(), hl: (function () { var h = {}; h[out.length - 1] = 'cur'; return h; })() }, { type: 'bars', label: 'P(next word | "' + last + '")', values: probs, idxLabels: names, texts: probs.map(String), hl: bh }] });
        out.push(names[pick]);
        var oh = {}; oh[out.length - 1] = 'ok';
        frames.push({ narr: 'Append <b>' + names[pick] + '</b> to the text. The new, longer text becomes the input for the next step. This feedback is why it is called <i>auto-regressive</i>.', parts: [{ type: 'array', label: 'Text so far', values: out.slice(), hl: oh }] });
      }
      frames.push({ narr: 'Stopped (length limit or no known next word). Final text: <b>' + out.join(' ') + '</b>. A real model does the same with a vocabulary of 50k+ tokens and long context instead of just the last word.', parts: [{ type: 'array', label: 'Generated', values: out.slice() }] });
      return frames;
    }
  }],
  examples: [
    { title: 'Loss for one prediction', html: `<p>True next token is "mat".</p>
      ${H.table(['Model gave "mat" probability', 'Loss = -ln(p)', 'Feeling'], [['0.90', '0.11', '<span class="c-g">confident and right</span>'], ['0.54', '0.62', 'okay'], ['0.10', '2.30', '<span class="c-y">surprised</span>'], ['0.01', '4.61', '<span class="c-r">very wrong</span>']])}
      <p>Average this over trillions of tokens. A drop from 3.0 to 2.9 sounds tiny but represents a visibly better model. "Perplexity" is e<sup>loss</sup>: a perplexity of 10 means it is as unsure as picking among 10 equally likely words.</p>` },
    { title: 'Why long answers are slower than long prompts', html: `<p>Prefill: the 2,000 prompt tokens go through the network <b>together</b> (parallel, GPU-friendly): maybe 0.5 s. Decode: each of the 300 output tokens needs its own pass and depends on the previous token, so they cannot run in parallel: maybe 300 x 25 ms = 7.5 s.</p>
      ${H.table(['Phase', 'Tokens', 'Parallel?', 'Time'], [['Prefill (read prompt)', '2,000', 'yes', '~0.5 s'], ['Decode (write answer)', '300', 'no, one by one', '~7.5 s']])}
      <p>That is why products stream tokens as they appear and why price lists charge more for output tokens.</p>` },
    { title: 'Hallucination, explained simply', html: `<p>Prompt: "The 1987 Nobel Prize in Physics was won by". If the model learned the fact strongly, the right names are most probable. If not, names that <i>look like</i> physics laureates still have decent probability and a fluent wrong answer comes out with the same confident tone. There is no internal "I do not know" check unless training or a tool adds one.</p>
      <p>Mitigations: let the model use search or retrieval (RAG), ask for sources and verify them, lower the temperature for factual tasks, and train/prompt the model to say "I'm not sure".</p>` },
    { title: 'Error compounding', html: `<p>If each token is 99.9% "fine", a 1,000-token answer is fine only about 37% of the time (0.999<sup>1000</sup>) if errors were independent. They are not independent, and models can self-correct, but it shows why long outputs need checking and why breaking tasks into short verified steps works better.</p>` }
  ],
  deepDive: `<p><b>Decoding strategies.</b> Greedy always takes the top token: deterministic but can loop ("the the the") and is dull. Sampling adds variety (next section). Beam search keeps the best B partial sequences; good for translation, rarely used for chat because it makes text bland and repetitive. Speculative decoding uses a small fast model to draft several tokens and the big model verifies them in one parallel pass, giving 2x to 3x speedups with identical output.</p>
  <p><b>Teacher forcing.</b> During training the model is always given the <i>true</i> previous tokens, not its own guesses. At inference it must use its own output, a mismatch known as exposure bias. It is one reason long generations can drift.</p>
  <p><b>Calibration.</b> A base model's probabilities are reasonably calibrated (when it says 70% it is right about 70% of the time on similar text). After RLHF, models often become overconfident, and verbalised confidence ("I'm 90% sure") is less reliable than token probabilities.</p>
  <p><b>Logprobs.</b> Some APIs return the log probabilities of chosen tokens. They are useful for classification confidence, detecting uncertain facts, and building simple evaluators. Remember to compare sequences by total log-probability carefully because longer sequences always have lower total probability.</p>
  <p><b>Structured output.</b> Constrained decoding masks any token that would break a JSON schema or grammar before sampling, guaranteeing valid structure. It manipulates the probability distribution directly, the same lever as temperature and top-p.</p>`,
  aiEra: `<p><b>What AI changes:</b> "predict the next token" now sits inside agents, tools and reasoning models. Reasoning models spend extra hidden tokens thinking before the final answer, trading latency and cost for accuracy.</p>
  <p><b>Use AI as a partner:</b> ask it to show its working step by step for multi-step problems, then verify the steps. When it states a fact, ask "what is the source and how sure are you?" and then check the source yourself.</p>
  <p><b>Where AI goes wrong:</b> confident fabrication (citations, API names, statistics), drifting off-spec in long outputs, and repeating a mistaken early assumption. It also cannot "go back and fix" earlier tokens unless it is run again.</p>
  <p><b>What you must still own:</b> verification. Design systems so the model's output is checked: tests for code, retrieval with citations for facts, schemas for structure, human review where mistakes are costly. Be able to explain in an interview that fluency is not correctness.</p>`,
  problems: []
});

// ---------- TOPIC 6: Pre-training vs instruction tuning / RLHF ----------
topics.push({
  title: 'Pre-training vs Instruction Tuning vs RLHF',
  analogy: `<p>Training a new employee. <b>Pre-training</b> is their whole education: they read a huge library (books, websites, code) and absorb how language and the world work. They are very knowledgeable but they just <i>continue</i> any text you hand them, like someone who finishes your sentences. <b>Instruction tuning</b> is job training: examples of "when the boss asks X, a good reply looks like Y". <b>RLHF</b> is performance feedback: the manager says "reply A was better than reply B", and the employee adjusts toward the style people prefer: helpful, honest, polite, safe.</p>`,
  explain: `<p>Modern chat models are built in stages:</p>
  ${H.table(['Stage', 'Data', 'Goal', 'Cost'], [['1. Pre-training', 'trillions of tokens of web, books, code', 'predict the next token; learn language and world knowledge', 'the vast majority (weeks on thousands of GPUs, $millions)'], ['2. Supervised fine-tuning (SFT / instruction tuning)', '10k to 1M+ human-written prompt + ideal answer pairs', 'learn to follow instructions and the chat format', 'small'], ['3. Preference tuning (RLHF, DPO and similar)', 'pairs of answers where humans (or AI) pick the better one', 'be helpful, honest, harmless; match human taste', 'small to medium'], ['4. Later: reasoning RL, tool-use training, safety tuning', 'verifiable tasks (maths, code) with automatic rewards', 'think step by step, use tools, refuse harmful requests', 'growing share']])}
  <p><b>What a base model does.</b> Ask a base model "What is the capital of France?" and it may continue "What is the capital of Germany? What is the capital of Italy?" because quizzes on the web look like that. It is a text continuer, not an assistant.</p>
  ${H.table(['Model', 'Reply to: "What is the capital of France?"'], [['Base (pre-trained only)', 'What is the capital of Germany? What is the capital of Italy? ...'], ['After SFT', 'The capital of France is Paris.'], ['After RLHF', 'Paris. (Short, correct, polite, no invented extras.)']])}
  <p><b>How RLHF works in 4 plain steps:</b></p>
  <ol>
    <li>For one prompt, the model writes several different answers.</li>
    <li>Humans rank them (A better than B). Collect many such comparisons.</li>
    <li>Train a <b>reward model</b> that scores any answer like a human would.</li>
    <li>Adjust the chat model to produce answers with higher reward, but with a leash (a KL penalty) so it does not drift into weird text that merely games the scorer.</li>
  </ol>
  <p>Newer shortcuts like <b>DPO</b> skip the separate reward model and learn directly from the pairs. Methods like RLAIF and "constitutional" training use AI feedback guided by written principles to lower human labelling cost.</p>
  <p><b>Chat format.</b> Under the hood, a conversation is flattened to one long token list with special markers, e.g. <code>[system] You are helpful. [user] Hi [assistant]</code>. The model just continues from the assistant marker. Roles are a convention taught during SFT, not a separate mechanism.</p>
  <p><b>Where knowledge vs behaviour comes from.</b> Almost all <i>facts</i> come from pre-training. Fine-tuning mostly changes <i>behaviour</i>: tone, format, refusing, following instructions. That is why fine-tuning is a poor way to add new facts (use retrieval) but a good way to change style or consistency.</p>`,
  clues: [
    '"Base model vs chat model / instruct model" - continuation vs instruction-following',
    '"What is RLHF?" - learn from human preference comparisons via a reward model',
    '"Should we fine-tune or use RAG?" - facts that change = RAG; style, format, task skill = fine-tune',
    '"Why does the model refuse / sound so agreeable?" - preference tuning rewards helpful, polite, safe-looking answers',
    '"Sycophancy / reward hacking" - the model learns what raters like, not always what is true',
    '"LoRA / PEFT" - cheap fine-tuning that trains small adapter matrices instead of all weights'
  ],
  code: [
    { lang: 'python', code: `import math, random

# Toy "preference learning": two answers, a human prefers A over B.
# We learn a tiny reward score per answer feature with the Bradley-Terry rule:
#   P(A preferred over B) = sigmoid(reward(A) - reward(B))
def sigmoid(x):
    return 1 / (1 + math.exp(-x))

# features: [is_polite, is_correct, is_long]
answers = {
    "A: 'Paris.'":                          [1, 1, 0],
    "B: 'Paris!!! Also here are 40 facts...'": [0, 1, 1],
}
w = [0.0, 0.0, 0.0]                          # reward weights we will learn
pairs = [("A: 'Paris.'", "B: 'Paris!!! Also here are 40 facts...'")] * 20   # humans always chose A

def reward(name):
    return sum(wi * fi for wi, fi in zip(w, answers[name]))

for epoch in range(50):
    for good, bad in pairs:
        p = sigmoid(reward(good) - reward(bad))        # how strongly we predict the human choice
        grad = 1 - p                                   # we want p -> 1
        for i in range(3):
            w[i] += 0.05 * grad * (answers[good][i] - answers[bad][i])

print("learned weights [polite, correct, long]:", [round(x, 2) for x in w])
print("reward A:", round(reward("A: 'Paris.'"), 2), " reward B:", round(reward("B: 'Paris!!! Also here are 40 facts...'"), 2))
print("P(A preferred):", round(sigmoid(reward("A: 'Paris.'") - reward("B: 'Paris!!! Also here are 40 facts...'")), 3))
print("Reward model learned: polite is good, long-rambling is bad.")`, run: true, title: 'A toy reward model learned from preference pairs (stdlib)' },
    { lang: 'python', code: `# Supervised fine-tuning data looks like this (JSON lines); library calls shown for shape only
examples = [
    {"messages": [
        {"role": "system", "content": "You are a concise assistant."},
        {"role": "user", "content": "Capital of France?"},
        {"role": "assistant", "content": "Paris."}]},
]
# trainer = SFTTrainer(model=base_model, train_dataset=examples, peft_config=LoraConfig(r=16))
# trainer.train()    # loss is computed ONLY on the assistant tokens`, check: false, title: 'Shape of SFT data and a LoRA trainer' }
  ],
  codeTitle: ['Learn a reward from preference pairs', 'SFT data format'],
  viz: [{
    title: 'The training pipeline: base model to chat assistant',
    input: 'What is the capital of France?',
    inputLabel: 'Prompt (only used in the narration)',
    gen: function (input) {
      var q = String(input).trim() || 'What is the capital of France?';
      if (q.length > 80) throw new Error('Keep the prompt under 80 characters');
      var nodes = [
        { id: 'data', label: 'Web + books + code', x: 12, y: 10, shape: 'box', w: 22 },
        { id: 'pre', label: 'Pre-training', x: 40, y: 10, shape: 'box', w: 16 },
        { id: 'base', label: 'Base model', x: 66, y: 10, shape: 'box', w: 16 },
        { id: 'sft', label: 'SFT (instructions)', x: 88, y: 10, shape: 'box', w: 20 },
        { id: 'pref', label: 'Preference data', x: 88, y: 40, shape: 'box', w: 20 },
        { id: 'rl', label: 'RLHF / DPO', x: 62, y: 40, shape: 'box', w: 16 },
        { id: 'chat', label: 'Chat model', x: 34, y: 40, shape: 'box', w: 16 },
        { id: 'user', label: 'You', x: 10, y: 40, shape: 'box', w: 10 }
      ];
      var edges = [['data', 'pre'], ['pre', 'base'], ['base', 'sft'], ['sft', 'pref'], ['pref', 'rl'], ['rl', 'chat'], ['chat', 'user']];
      function g(hl, ehl) { return { type: 'graph', label: 'Training stages', directed: true, height: 54, nodes: nodes, edges: edges, hl: hl, ehl: ehl || {} }; }
      var rows = [['Base', 'Continues the text: "' + q + ' What is the capital of Germany? ..."']];
      var f = [];
      f.push({ narr: 'Stage 1 - <b>Pre-training</b>: read trillions of tokens and learn to predict the next one. This builds nearly all knowledge and costs almost all the money.', parts: [g({ data: 'ok', pre: 'cur' }, { 'data-pre': 'ok' })] });
      f.push({ narr: 'Result: a <b>base model</b>. Very knowledgeable but it only continues text. Try your prompt on it:', parts: [g({ pre: 'done', base: 'sel' }, { 'pre-base': 'ok' }), { type: 'table', label: 'Same prompt, different stages', columns: ['stage', 'behaviour'], rows: rows.slice(), hl: { 0: 'bad' } }] });
      rows.push(['After SFT', 'The answer to "' + q + '" is given directly, in a helpful chat style.']);
      f.push({ narr: 'Stage 2 - <b>Supervised fine-tuning</b>: thousands of examples of a prompt with an ideal assistant answer. The model learns the chat format and to answer instead of continue.', parts: [g({ base: 'done', sft: 'cur' }, { 'base-sft': 'ok' }), { type: 'table', label: 'Same prompt, different stages', columns: ['stage', 'behaviour'], rows: rows.slice(), hl: { 1: 'ok' } }] });
      f.push({ narr: 'Stage 3a - <b>Preference data</b>: for each prompt the model writes several answers; people (or AI) pick the better one. A reward model learns those tastes.', parts: [g({ sft: 'done', pref: 'cur' }, { 'sft-pref': 'ok' }), { type: 'bars', label: 'Reward scores for 3 candidate answers', values: [8, 5, 2], idxLabels: ['clear + correct', 'correct but rambling', 'confident but wrong'], texts: ['8', '5', '2'], hl: { 0: 'ok', 2: 'bad' } }] });
      rows.push(['After RLHF', 'Short, correct, polite; declines unsafe requests; admits uncertainty more often.']);
      f.push({ narr: 'Stage 3b - <b>RLHF / DPO</b>: nudge the model toward high-reward answers, with a leash so it stays close to the SFT model. Result: the <b>chat model</b> you talk to.', parts: [g({ pref: 'done', rl: 'cur', chat: 'sel' }, { 'pref-rl': 'ok', 'rl-chat': 'ok' }), { type: 'table', label: 'Same prompt, different stages', columns: ['stage', 'behaviour'], rows: rows.slice(), hl: { 2: 'sel' } }] });
      f.push({ narr: 'Key idea: <b>facts come from pre-training; behaviour comes from tuning</b>. To add new facts, give the model documents at run time (RAG). To change tone or format, fine-tune.', parts: [g({ chat: 'ok', user: 'cur' }, { 'chat-user': 'ok' })] });
      return f;
    }
  }],
  examples: [
    { title: 'Choose: prompt, RAG or fine-tune?', html: `${H.table(['Need', 'Best tool', 'Why'], [['Answer from our latest HR policy PDF', 'RAG', 'facts change; cite sources; cheap to update'], ['Always reply in our brand voice and JSON schema', 'Prompt first, then SFT', 'behaviour/format; SFT makes it consistent and shortens prompts'], ['Understand rare medical shorthand', 'Fine-tune (plus RAG)', 'domain language not in base model'], ['Quick prototype this afternoon', 'Prompt only', 'zero training cost; iterate in minutes']])}` },
    { title: 'What a preference pair looks like', html: `<p>Prompt: "Explain recursion to a child."</p>
      <p><b class="c-g">Chosen:</b> "Recursion is like looking into two mirrors facing each other - each mirror shows another mirror, over and over, until you stop looking."</p>
      <p><b class="c-r">Rejected:</b> "Recursion is a method where the solution depends on solutions to smaller instances of the same problem, per the formal definition in computer science."</p>
      <p>Thousands of pairs like this teach "simple + concrete beats jargon". Side effect: models learn style cues that raters liked, such as confident tone and long answers, which is why sycophancy and verbosity creep in.</p>` },
    { title: 'Where did that behaviour come from?', html: `${H.table(['Observation', 'Likely stage'], [['Knows Python syntax', 'Pre-training (lots of code)'], ['Replies as "Assistant" and stays on topic', 'SFT (chat format)'], ['Says "I cannot help with that"', 'Preference / safety tuning'], ['Agrees with a wrong claim you push', 'Preference tuning side effect (sycophancy)'], ['Thinks step by step on maths', 'Reasoning RL with automatic checks']])}` },
    { title: 'LoRA: fine-tuning a big model cheaply', html: `<p>Instead of updating all 7 billion weights, LoRA freezes them and learns two small matrices per layer whose product is added to the weight. With rank r = 16 and d = 4,096, one adapter has 2 x 4,096 x 16 = 131k numbers instead of 16.8 million (0.8%). You can fine-tune on a single GPU and swap adapters per customer.</p>` }
  ],
  deepDive: `<p><b>Scaling laws.</b> Loss falls predictably as a power law with more parameters, more data and more compute. The "Chinchilla" result suggested about 20 training tokens per parameter for compute-optimal training; since inference cost dominates in practice, many models are deliberately <i>over-trained</i> on far more tokens so a smaller model is cheaper to serve.</p>
  <p><b>Data quality beats quantity.</b> Deduplication, filtering low-quality pages, balancing code/maths/multilingual text, and synthetic data from stronger models shape the final model more than raw size. There are open questions about copyright, contamination (test questions leaked in training data, inflating benchmark scores) and running out of fresh human text.</p>
  <p><b>Reward hacking.</b> The reward model is an imperfect proxy. Optimise too hard and the model exploits quirks: flattery, long answers, confident tone, hidden formatting tricks. The KL penalty, ensembles of reward models, early stopping and verifiable rewards (unit tests pass, math answer matches) are the mitigations.</p>
  <p><b>RLVR / reasoning training.</b> For tasks with checkable answers, reinforcement learning with <i>verifiable rewards</i> trains the model to produce long chains of thought that end in a correct answer. This is the engine behind reasoning models.</p>
  <p><b>Alignment tax and catastrophic forgetting.</b> Heavy tuning can reduce some raw abilities or shrink diversity of output (mode collapse). Fine-tuning on a narrow dataset can make the model forget general skills; mixing in general data or using LoRA softens this.</p>
  <p><b>Safety layers.</b> Chat products add input/output classifiers, system prompts, tool permissions and monitoring on top; model training alone is not a security boundary.</p>`,
  aiEra: `<p><b>What AI changes:</b> the pipeline above is the product. Providers ship ready-made chat models; your choices are which model, which prompt, whether to add retrieval, whether to fine-tune a smaller one, and how to evaluate.</p>
  <p><b>Use AI as a partner:</b> have a strong model generate or label synthetic training examples and critique your prompts. Use model-graded evals with a written rubric, but spot-check them yourself.</p>
  <p><b>Where AI goes wrong:</b> sycophancy (agreeing with you), over-refusal or under-refusal, fabricated citations, and style that sounds confident whatever the truth. Evaluation data leaking into training can make benchmark numbers look better than real-world quality.</p>
  <p><b>What you must still own:</b> the decision framework (prompt vs RAG vs fine-tune), building a small trustworthy test set from real cases, and being able to explain in an interview that pre-training gives knowledge while tuning shapes behaviour.</p>`,
  problems: [{
    title: 'Prompt, RAG or Fine-Tune? Three Product Cases',
    level: 'Medium', tags: ['fine-tuning', 'RAG', 'design'], companies: ['Any AI team'],
    statement: `<p>Pick the best first approach (and say what you would do second) for: <b>(1)</b> a bot answering questions about a company's 800-page policy handbook that is updated monthly; <b>(2)</b> a support bot that must always answer in a strict JSON format with a friendly tone; <b>(3)</b> a model that must understand the shorthand notes of one hospital's doctors.</p>`,
    constraints: `Justify each with one reason about facts vs behaviour, cost and freshness.`,
    example: `<p>Case 1: <b>RAG</b> - facts change monthly and need citations. Case 2: <b>prompt + schema</b>, later SFT. Case 3: <b>fine-tune</b> (plus RAG).</p>`,
    brute: { why: `<p>Fine-tuning on the handbook for case 1. The facts become stale after a month, the model still hallucinates details, you cannot cite sources and you must retrain for every update.</p>` },
    mcq: { q: 'Which stage of training mainly provides a model\'s factual knowledge?', options: ['Pre-training', 'Instruction tuning', 'RLHF', 'Prompt engineering'], answer: 0, explain: 'Knowledge is absorbed from the huge pre-training corpus; later stages mostly shape behaviour.' },
    hints: [`<p>Ask: is the problem missing <i>facts</i> or the wrong <i>behaviour</i>?</p>`, `<p>Facts that change -> retrieval. Format/tone -> prompt and structured output first, fine-tune if it stays inconsistent or the prompt is too long.</p>`, `<p>Case 3 is a language/domain problem: fine-tuning on in-domain text teaches the vocabulary; still use retrieval for patient-specific facts.</p>`],
    solution: {
      approach: `<p><b>Case 1 - RAG.</b> Split the handbook into chunks, embed them, retrieve the top matches for each question and put them in the prompt with an instruction to answer only from them and cite the section. When the handbook changes monthly you only re-index changed pages. Fine-tuning would freeze old facts and invite hallucination. <b>Case 2 - prompt with a schema first.</b> Use clear instructions, a JSON schema or structured-output mode, and a few examples. Measure on 100 real tickets. If the format still breaks or the prompt is huge and costly, add SFT on a few thousand good examples (or use a smaller fine-tuned model), because format and tone are behaviours. <b>Case 3 - fine-tune plus RAG.</b> The model lacks the vocabulary (shorthand), which is a distribution gap; fine-tuning (LoRA) on de-identified notes teaches it, while patient-specific facts still come from retrieval. In all cases build an evaluation set first.</p>`,
      complexity: `<p>Decision quality, not code. Cost drivers: RAG adds retrieval latency and prompt tokens; fine-tuning adds training cost, data labelling and re-training whenever the target changes.</p>`,
      followUps: ['How would you evaluate whether fine-tuning actually helped?', 'What privacy risks exist when training on hospital notes?']
    }
  }]
});

// ---------- TOPIC 7: Context window ----------
topics.push({
  title: 'The Context Window and Its Limits',
  analogy: `<p>The context window is the model's <b>desk</b>. Only papers on the desk can be read; there is no filing cabinet behind it. Your prompt, the chat history, documents you pasted and even the answer being written all take up desk space. When the desk is full, something has to go in the bin (the oldest papers), or the work cannot start. A bigger desk is handy, but a huge pile is harder to find the right paper in, and every extra page costs money.</p>`,
  explain: `<p>The <b>context window</b> is the maximum number of tokens the model can handle in one request: <b>input and output together</b>. Common sizes in 2026 range from about 8k to 1M+ tokens (a 128k window holds roughly a 300-page book).</p>
  <p>The model has <b>no memory between calls</b>. A chat feels continuous only because the app re-sends the earlier messages every time. So tokens add up:</p>
  ${H.table(['Turn', 'You send (tokens)', 'Model replies', 'Total sent this call'], [['1', '200', '300', '200'], ['2', '150', '300', '200 + 300 + 150 = 650'], ['3', '150', '300', '650 + 300 + 150 = 1,100'], ['10', '150', '300', '~4,400']])}
  <p>Cost grows with every turn because the whole history is re-read each time, so the total over a long chat grows roughly with the <b>square</b> of the number of turns.</p>
  <p><b>What happens when context overflows?</b> Depending on the app:</p>
  <ul>
    <li><b>API error:</b> "prompt too long" - the request is rejected. You must shorten it.</li>
    <li><b>Truncation:</b> the oldest messages are dropped (sliding window). The model silently forgets your first instructions or facts.</li>
    <li><b>Summarising:</b> older turns are compressed into a short summary that stays in context (lossy).</li>
    <li><b>Output cut off:</b> if the input leaves too little room, the answer stops early (finish reason "length").</li>
  </ul>
  <p><b>Limits beyond the hard cap:</b></p>
  <ul>
    <li><b>Quality:</b> models use the start and end of long prompts best; details in the middle are more likely to be missed ("lost in the middle"). Advertised window is not the same as reliable window.</li>
    <li><b>Cost and speed:</b> more input tokens = more money and slower first token (attention work grows with n<sup>2</sup>).</li>
    <li><b>Memory:</b> the KV cache grows with every token, about 0.5 MB per token for a 7B-class model in fp16, so 100k tokens needs ~50 GB just for the cache.</li>
    <li><b>Distraction:</b> irrelevant text can mislead the model and gives prompt-injection attacks more room.</li>
  </ul>
  <p><b>Working strategies:</b> retrieve only the relevant chunks (RAG) instead of pasting everything; summarise old turns; put key instructions at the start (and repeat the critical one at the end); store long-term facts in a database or "memory" tool; start a fresh conversation for a new task; use prompt caching for big stable prefixes.</p>`,
  clues: [
    '"Our chat forgets earlier instructions after a while" - context truncation or lost-in-the-middle',
    '"Summarise a 500-page document / chat with a codebase" - chunking, map-reduce summarising or RAG',
    '"Bill is exploding as conversations get longer" - history is re-sent every turn; cache, trim, summarise',
    '"Max tokens" / "context length exceeded" / "finish_reason: length"',
    '"Needle in a haystack" - a test of retrieving one fact from a long context',
    '"Does a bigger context replace RAG?" - not usually: cost, latency, accuracy and freshness still favour retrieval for large corpora'
  ],
  code: [
    { lang: 'python', code: `# Chat history manager that respects a token budget (stdlib only).
# We estimate tokens with the ~4 characters per token rule.
def est_tokens(text):
    return max(1, len(text) // 4)

class Chat:
    def __init__(self, window=60, reserve_for_answer=15):
        self.window = window
        self.reserve = reserve_for_answer
        self.system = "You are a helpful assistant."
        self.msgs = []                      # list of (role, text)

    def used(self):
        return est_tokens(self.system) + sum(est_tokens(t) for _, t in self.msgs)

    def add(self, role, text):
        self.msgs.append((role, text))
        dropped = []
        # keep the system prompt always; drop the OLDEST messages until it fits
        while self.used() > self.window - self.reserve and len(self.msgs) > 1:
            dropped.append(self.msgs.pop(0))
        return dropped

chat = Chat(window=60, reserve_for_answer=15)
turns = [("user", "My name is Asha and I like chess openings a lot."),
         ("assistant", "Nice to meet you Asha! Chess openings are fun."),
         ("user", "Please explain the Sicilian Defense in simple words."),
         ("assistant", "It starts 1.e4 c5. Black fights for the centre from the side."),
         ("user", "What is my name?")]
for role, text in turns:
    gone = chat.add(role, text)
    print(f"{role:9} used={chat.used():2}/{chat.window}  dropped={[t[:20] for _, t in gone]}")
print("Model can still see:", [t[:25] for _, t in chat.msgs])
print("The first message (with the name) was dropped, so the model cannot answer!")`, run: true, title: 'A sliding-window chat and what it forgets (stdlib)' },
    { lang: 'python', code: `# Cost of a long chat: every turn re-sends the whole history (stdlib)
sys_tokens, user_tok, reply_tok = 500, 150, 300
price_in, price_out = 3.0, 15.0           # illustrative $ per 1M tokens

history = sys_tokens
total_in = total_out = 0
for turn in range(1, 21):
    prompt = history + user_tok            # everything so far, plus the new question
    total_in += prompt
    total_out += reply_tok
    history = prompt + reply_tok           # reply joins the history for next turn
    if turn in (1, 5, 10, 20):
        print(f"turn {turn:2}: prompt={prompt:5} tokens")
cost = (total_in * price_in + total_out * price_out) / 1_000_000
print("20 turns: input tokens", total_in, "output tokens", total_out)
print("cost: $%.3f  (input is %.0f%% of it)" % (cost, 100 * total_in * price_in / (cost * 1_000_000)))`, run: true, title: 'Why long chats get expensive (stdlib)' }
  ],
  codeTitle: ['Token-budget chat manager', 'Long-chat cost model'],
  viz: [{
    title: 'The context window sliding over a growing conversation',
    input: '8 14',
    inputLabel: 'Window size (tokens) and total tokens produced (e.g. 8 14)',
    gen: function (input) {
      var p = String(input).trim().split(/[\s,]+/).map(Number);
      var W = p[0], T = p[1];
      if (p.length < 2 || !(W >= 2 && W <= 16) || !(T >= W && T <= 30) || T - W > 20) throw new Error('Enter window (2-16) and total (window to 30), e.g. 8 14');
      var f = [];
      function arr(t) {
        var vals = [], hl = {}, lo = Math.max(0, t - W);
        for (var i = 1; i <= t; i++) { vals.push('t' + i); if (i - 1 < lo) hl[i - 1] = 'bad'; else hl[i - 1] = 'win'; }
        return { type: 'array', label: 'All tokens so far (blue = visible to the model, red = forgotten)', values: vals, hl: hl, range: [lo, t - 1] };
      }
      f.push({ narr: 'The window holds <b>' + W + '</b> tokens. While the conversation is shorter than that, nothing is lost: the model sees all of it.', parts: [arr(W), { type: 'vars', vals: { window: W, 'tokens so far': W, forgotten: 0 } }] });
      for (var t = W + 1; t <= T; t++) {
        var gone = t - W;
        f.push({ narr: 'Token <b>t' + t + '</b> arrives. The desk is full, so <b>t' + gone + '</b> falls off. If t1 held your key instruction or your name, the model now cannot see it.', parts: [arr(t), { type: 'vars', vals: { window: W, 'tokens so far': t, forgotten: gone, 'oldest visible': 't' + (gone + 1) }, hl: { forgotten: 'bad' } }] });
      }
      f.push({ narr: 'Lesson: after ' + (T - W) + ' overflow steps the first ' + (T - W) + ' tokens are gone. Fixes: summarise old turns, keep the system prompt pinned, retrieve facts on demand, or start a new chat.', parts: [arr(T)] });
      return f;
    }
  }, {
    title: 'Chat cost grows every turn (history is re-sent)',
    input: '10',
    inputLabel: 'Number of turns (1-30)',
    gen: function (input) {
      var n = parseInt(String(input).trim(), 10);
      if (!(n >= 1 && n <= 30)) throw new Error('Enter a number of turns from 1 to 30');
      var hist = 500, vals = [], labels = [], f = [], total = 0, tex = [];
      f.push({ narr: 'System prompt = 500 tokens. Each turn: you add 150 tokens, the model replies with 300. The model re-reads <b>everything</b> each time.', parts: [{ type: 'vars', vals: { 'system prompt': 500, 'per user msg': 150, 'per reply': 300 } }] });
      for (var t = 1; t <= n; t++) {
        var prompt = hist + 150; total += prompt; vals.push(prompt); labels.push('t' + t); tex.push(String(prompt));
        hist = prompt + 300;
        var h = {}; h[vals.length - 1] = 'cur';
        f.push({ narr: 'Turn <b>' + t + '</b>: prompt is <b>' + prompt + '</b> tokens (all history + new message). Running total of input tokens billed: <b>' + total + '</b>.', parts: [{ type: 'bars', label: 'Input tokens sent each turn', values: vals.slice(), idxLabels: labels.slice(), texts: tex.slice(), hl: h }, { type: 'vars', vals: { 'turn': t, 'this prompt': prompt, 'total input billed': total } }] });
      }
      f.push({ narr: 'The prompt grows linearly each turn, so the <b>total</b> billed grows about like turns squared. Prompt caching, summarising and trimming break this curve.', parts: [{ type: 'bars', label: 'Input tokens sent each turn', values: vals.slice(), idxLabels: labels.slice(), texts: tex.slice(), hl: (function () { var h2 = { 0: 'ok' }; h2[vals.length - 1] = 'bad'; return h2; })() }] });
      return f;
    }
  }],
  examples: [
    { title: 'What happens when I paste a 200-page PDF into a 128k window?', html: `<p>200 pages x ~500 tokens = 100,000 tokens. Window 128,000. Leaves 28,000 for your question, the system prompt and the answer. It fits, but: it is slow and costly on every follow-up turn, details in the middle may be missed, and a second PDF will not fit. Better: retrieve the 5 most relevant sections for each question (about 3,000 tokens).</p>
      ${H.table(['Approach', 'Tokens per question', 'Notes'], [['Paste everything', '100,000+', 'slow, costly, can miss middle facts'], ['RAG top-5 chunks', '~3,000', 'fast and cheap; depends on retrieval quality']])}` },
    { title: 'Overflow behaviours compared', html: `${H.table(['Strategy', 'What the model sees', 'Risk'], [['Reject (API error)', 'nothing', 'user must shorten input'], ['Drop oldest', 'latest N tokens', 'loses early rules and facts silently'], ['Summarise old turns', 'summary + recent turns', 'summary can omit or distort details'], ['Retrieve on demand', 'only relevant stored snippets', 'retrieval may miss the right memory']])}` },
    { title: 'Budgeting the window for a RAG app', html: `<p>Window 16,000 tokens.</p>
      ${H.table(['Slot', 'Tokens'], [['System prompt', '600'], ['Chat history (trimmed)', '2,000'], ['Retrieved chunks (5 x 800)', '4,000'], ['User question', '200'], ['Reserved for the answer', '1,500'], ['<b>Used</b>', '<b>8,300</b> (plenty of headroom)']])}
      <p>Always reserve space for the output; if input fills the window the answer will be cut off.</p>` },
    { title: 'Needle in a haystack', html: `<p>Test: hide one sentence ("The magic number is 4271") at different depths in a long document of filler, then ask for it. Good models find it at every depth; weaker ones fail when it sits in the middle. A pass on this easy test does not prove the model can <i>reason</i> over many details spread across the text, which is harder.</p>` }
  ],
  deepDive: `<p><b>How windows got big.</b> Better position encodings (RoPE with scaling), memory-efficient attention (FlashAttention), grouped-query attention to shrink the KV cache, and long-context training stages. Nominal length is not usable length: effective context (where accuracy stays high) is often shorter than the advertised maximum.</p>
  <p><b>Prefix caching.</b> If many requests start with the same long prefix (system prompt, a document), the provider can keep that prefix's KV cache and reuse it, charging a fraction of the normal input price and cutting latency. Put stable content first and changing content last to benefit.</p>
  <p><b>Compaction patterns for agents.</b> Long-running agents hit the limit quickly: tool outputs are verbose. Common tactics: clear old tool results, summarise progress into notes, write memory to files or a database and re-read selectively, delegate sub-tasks to sub-agents with fresh contexts that return only a short result.</p>
  <p><b>Memory vs context.</b> "Memory" features in assistants are just stored text that the app injects into the prompt. Everything is still context in the end.</p>
  <p><b>Positional limits at training time.</b> A model trained on 4k-token sequences degrades beyond that unless extended. Pushing to 1M tokens means special training data and a lot of compute; behaviour at the far end can be shakier than near the start.</p>
  <p><b>Security.</b> Anything in the window can steer the model, including text from web pages or emails you retrieved. Treat retrieved content as untrusted data, separate it from instructions, and limit what tools the model can call.</p>`,
  aiEra: `<p><b>What AI changes:</b> "context engineering" (deciding exactly what goes into the window) is now a core skill, as important as writing the prompt. Agents, coding assistants and RAG apps all live or die by it.</p>
  <p><b>Use AI as a partner:</b> ask the model to summarise a long thread into decisions and open questions before you continue; ask it to list which instructions it still remembers (a quick check for truncation).</p>
  <p><b>Where AI goes wrong:</b> it will not tell you it has forgotten the start of a conversation; it just answers confidently without that information. It may also ignore instructions buried mid-prompt in a very long input.</p>
  <p><b>What you must still own:</b> token budgeting (estimate and monitor), deciding what to keep, retrieve or summarise, structuring prompts (stable prefix first), and explaining cost and quality trade-offs of long context versus retrieval.</p>`,
  problems: [{
    title: 'What Happens When the Context Overflows?',
    level: 'Medium', tags: ['context window', 'chat design'], companies: ['Any AI team'],
    statement: `<p>A support chatbot has an 8,000-token window. The system prompt is 600 tokens. After 15 turns of about 450 tokens each, a customer asks, "Like I said at the start, use my order number 55812 - what is the status?" The bot replies, "I do not see an order number." (a) Explain exactly why. (b) Propose two fixes and the cost/risk of each. (c) How would you detect this in production?</p>`,
    constraints: `Assume oldest messages are dropped first and 1,000 tokens are reserved for the answer.`,
    example: `<p>Budget for history = 8,000 - 600 - 1,000 = 6,400 tokens. 15 turns x 450 = 6,750 tokens > 6,400, so the first ~1 turn was dropped: the order number lived there.</p>`,
    brute: { why: `<p>Just buying a bigger window: it delays the problem, raises cost on every turn and does not fix the lost-in-the-middle effect or the lack of any persistent memory.</p>` },
    mcq: { q: 'The model says it cannot see something you said 20 turns ago. Most likely cause?', options: ['That text was truncated out of the context window', 'The model got tired', 'The temperature was too low', 'The tokenizer deleted it'], answer: 0, explain: 'Old messages are trimmed once the window is full, and the model only knows what is in the current prompt.' },
    hints: [`<p>The model has no memory between calls; it only sees the prompt you send now.</p>`, `<p>Do the budget: window minus system prompt minus answer reserve = space for history.</p>`, `<p>Fixes: pin important facts (extract to a "facts" block or database) and/or summarise old turns. Detect with logs of tokens used and a test that asks about early facts.</p>`],
    solution: {
      approach: `<p><b>(a)</b> History space = 8,000 - 600 - 1,000 = 6,400 tokens. Fifteen turns at 450 tokens is 6,750, so the app dropped the oldest messages to fit, and the order number sat in the dropped part. The model is not forgetting; the information is simply not in its input. <b>(b) Fix 1: pin a structured "facts" block.</b> After each turn, extract key entities (order number, name) into a short block that is always included at the top of the prompt. Cheap and reliable, but needs good extraction and can store wrong values. <b>Fix 2: rolling summary.</b> When history exceeds a threshold, ask the model to summarise the oldest turns into about 200 tokens and keep recent turns verbatim. Handles general context, but the summary is lossy and might drop exactly the detail you need, so combine it with Fix 1. A third option is retrieval over stored conversation. <b>(c) Detection:</b> log tokens used versus window and the number of dropped messages per request, alert when dropping starts, and run a regression test that plants a fact at turn 1 and asks for it at turn 20.</p>`,
      code: { lang: 'python', code: `window, system, reserve = 8000, 600, 1000
budget = window - system - reserve
turn_tokens = 450
fits = budget // turn_tokens
print("history budget:", budget, "tokens ->", fits, "turns fit")
print("turns dropped after 15:", max(0, 15 - fits))`, run: true },
      complexity: `<p>Token budgeting is O(turns). Summarising adds one extra model call whenever the threshold is crossed.</p>`,
      followUps: ['How does prompt caching interact with a rolling summary?', 'What if the dropped message contained a safety rule?']
    }
  }]
});

// ---------- TOPIC 8: Sampling ----------
topics.push({
  title: 'Sampling: Temperature, Top-k and Top-p',
  analogy: `<p>The model hands you a <b>bag of raffle tickets</b>: "mat" has 54 tickets, "sofa" 24, "floor" 16, "moon" 4, "banana" 2. Choosing the next word is drawing one ticket. <b>Temperature</b> changes how unequal the bag is: low temperature gives the favourite almost all the tickets (safe, repeatable); high temperature shares them out more evenly (surprising, creative). <b>Top-k</b> throws away everything except the k best words. <b>Top-p</b> keeps the smallest set of words whose tickets cover p% of the bag, and throws the long tail of silly options away.</p>`,
  explain: `<p>The model gives a score (logit) for each token. Before choosing, we reshape the scores in three optional steps:</p>
  <ol>
    <li><b>Temperature T:</b> divide every logit by T, then softmax. T &lt; 1 sharpens (favourite wins more), T &gt; 1 flattens, T near 0 is greedy (always the top token), T = 1 is the model's raw distribution.</li>
    <li><b>Top-k:</b> keep only the k highest-probability tokens; set the rest to 0; renormalise.</li>
    <li><b>Top-p (nucleus):</b> sort tokens high to low; keep adding until the running total reaches p (say 0.9); drop the rest; renormalise.</li>
  </ol>
  <p>Then draw one token at random according to the remaining probabilities.</p>
  <p><b>Worked numbers.</b> Logits: mat 3.0, sofa 2.2, floor 1.8, moon 0.5, banana -0.5.</p>
  ${H.table(['Setting', 'mat', 'sofa', 'floor', 'moon', 'banana'], [['T = 1.0', '0.54', '0.24', '0.16', '0.04', '0.02'], ['T = 0.3 (focused)', '0.92', '0.06', '0.02', '0.00', '0.00'], ['T = 2.0 (wild)', '0.37', '0.25', '0.20', '0.11', '0.06'], ['T=1, top-k=2', '0.69', '0.31', '-', '-', '-'], ['T=1, top-p=0.9', '0.57', '0.26', '0.17', '-', '-']])}
  <p>Check top-p 0.9: sorted running totals 0.54, 0.78, 0.94 -> the third token pushes us past 0.9, so we keep mat, sofa, floor (sum 0.94) and divide each by 0.94: 0.57, 0.26, 0.17. Moon and banana are cut.</p>
  <p><b>Which to choose?</b></p>
  ${H.table(['Task', 'Temperature', 'Top-p', 'Why'], [['Code generation, SQL, JSON extraction', '0 to 0.2', '1.0 (or ~0.95)', 'one right answer; avoid creative typos'], ['Factual Q&A, summarising', '0 to 0.3', '~0.9', 'stay close to the most likely, supported text'], ['Chat assistant (general)', '0.5 to 0.8', '0.9 to 1.0', 'natural but steady'], ['Brainstorming names, slogans, story ideas', '0.9 to 1.3', '0.95', 'want variety and surprises'], ['Generating many diverse test samples', '1.0+ and sample many', '0.95', 'diversity across runs']])}
  <p>Rule of thumb: <b>change temperature OR top-p, not both</b>, so you can reason about the effect. Even at temperature 0 results can vary slightly between runs because of parallel floating-point maths and batching, so do not promise bit-for-bit repeatability.</p>
  <p><b>Related knobs:</b> <i>frequency/presence penalty</i> (discourage repeats), <i>max tokens</i> (length limit), <i>stop sequences</i> (end at a marker), and <i>seed</i> (when supported, makes sampling repeatable).</p>`,
  clues: [
    '"Make the output deterministic / reproducible" - temperature 0 (or greedy) and a seed, but still not guaranteed',
    '"Creative writing" or "brainstorm" - higher temperature / top-p',
    '"Generating code or structured JSON" - low temperature, constrained decoding',
    '"The model keeps repeating itself / gets stuck in a loop" - raise temperature slightly, add repetition penalty, or fix the prompt',
    '"The output is gibberish at high temperature" - the tail of the distribution is being sampled; add top-p/top-k or lower T',
    '"Explain top-k vs top-p" - fixed number of candidates vs fixed probability mass (adapts to how sure the model is)'
  ],
  code: [
    { lang: 'python', code: PY.samp, run: true, title: 'Temperature, top-k and top-p on a toy distribution (stdlib)' },
    { lang: 'python', code: `# Real API call shape (provider SDKs differ; not run in the browser)
response = client.messages.create(
    model="your-model-name",
    max_tokens=500,
    temperature=0.2,          # low: for code, extraction, factual tasks
    top_p=0.95,               # many providers advise changing only one of these
    messages=[{"role": "user", "content": "Write a SQL query for monthly revenue."}],
)
print(response.content)`, check: false, title: 'Setting sampling parameters in an API call' }
  ],
  codeTitle: ['Sampler you can run', 'API parameters'],
  viz: [{
    title: 'Reshape the distribution: temperature, then top-k, then top-p',
    input: 'temp=0.7 topk=0 topp=0.9',
    inputLabel: 'temp (0.1-3), topk (0 = off, 1-5), topp (0.1-1)',
    gen: function (input) {
      var s = String(input), T = 1, K = 0, P = 1, m;
      if ((m = /temp\s*=\s*([\d.]+)/i.exec(s))) T = parseFloat(m[1]);
      if ((m = /topk\s*=\s*(\d+)/i.exec(s))) K = parseInt(m[1], 10);
      if ((m = /topp\s*=\s*([\d.]+)/i.exec(s))) P = parseFloat(m[1]);
      if (!(T >= 0.1 && T <= 3) || !(K >= 0 && K <= 5) || !(P >= 0.1 && P <= 1)) throw new Error('Use e.g. temp=0.7 topk=0 topp=0.9 (temp 0.1-3, topk 0-5, topp 0.1-1)');
      var names = ['mat', 'sofa', 'floor', 'moon', 'banana'], logits = [3.0, 2.2, 1.8, 0.5, -0.5];
      function sm(l, t) { var mx = Math.max.apply(null, l), e = l.map(function (v) { return Math.exp((v - mx) / t); }), z = e.reduce(function (a, b) { return a + b; }, 0); return e.map(function (v) { return v / z; }); }
      function r2(a) { return a.map(function (v) { return Math.round(v * 100) / 100; }); }
      function tx(a) { return r2(a).map(function (v) { return v.toFixed(2); }); }
      var f = [];
      f.push({ narr: 'The model scored five possible next words after "The cat sat on the". These raw scores are called <b>logits</b>.', parts: [{ type: 'bars', label: 'Logits (bars shifted by +1 so all are visible)', values: logits.map(function (v) { return v + 1; }), idxLabels: names, texts: logits.map(String) }] });
      var p1 = sm(logits, 1);
      f.push({ narr: 'Softmax at temperature 1 turns scores into probabilities (they add to 1). This is the model\'s "natural" view.', parts: [{ type: 'bars', label: 'P at T = 1', values: r2(p1), idxLabels: names, texts: tx(p1), hl: { 0: 'sel' } }] });
      var p = sm(logits, T);
      f.push({ narr: 'Temperature <b>' + T + '</b>: divide logits by T first. ' + (T < 1 ? 'Lower T <b>sharpens</b>: the favourite takes more of the bag.' : T > 1 ? 'Higher T <b>flattens</b>: rare words get a bigger chance.' : 'T = 1 changes nothing.'), parts: [{ type: 'bars', label: 'P after temperature', values: r2(p), idxLabels: names, texts: tx(p), hl: { 0: 'sel' } }] });
      var order = [0, 1, 2, 3, 4].sort(function (a, b) { return p[b] - p[a]; });
      var keep = {}; order.forEach(function (i) { keep[i] = true; });
      var hl = {};
      if (K > 0) {
        order.forEach(function (i, r) { if (r >= K) { keep[i] = false; hl[i] = 'bad'; } });
        f.push({ narr: 'Top-k = <b>' + K + '</b>: keep only the ' + K + ' most likely words. Red words are cut, whatever their probability.', parts: [{ type: 'bars', label: 'Cut by top-k (red)', values: r2(p), idxLabels: names, texts: tx(p), hl: JSON.parse(JSON.stringify(hl)) }] });
      } else {
        f.push({ narr: 'Top-k is off (0), so no word is cut by rank.', parts: [{ type: 'bars', label: 'No top-k cut', values: r2(p), idxLabels: names, texts: tx(p) }] });
      }
      var run = 0, stop = false, cutP = [];
      order.forEach(function (i) {
        if (!keep[i]) return;
        if (stop) { keep[i] = false; hl[i] = 'bad'; cutP.push(names[i]); return; }
        run += p[i];
        if (run >= P - 1e-9) stop = true;
      });
      f.push({ narr: 'Top-p = <b>' + P + '</b>: walk from the most likely word, adding probabilities until the total reaches ' + P + '. ' + (cutP.length ? 'Everything after that is cut: <b>' + cutP.join(', ') + '</b> (red).' : 'Nothing extra is cut at this setting.'), parts: [{ type: 'bars', label: 'Cut by top-p (red)', values: r2(p), idxLabels: names, texts: tx(p), hl: JSON.parse(JSON.stringify(hl)) }] });
      var tot = 0; for (var i2 = 0; i2 < 5; i2++) if (keep[i2]) tot += p[i2];
      var fin = p.map(function (v, i3) { return keep[i3] ? v / tot : 0; });
      var oh = {}; for (var i4 = 0; i4 < 5; i4++) oh[i4] = keep[i4] ? 'ok' : 'bad';
      f.push({ narr: 'Renormalise the survivors so they add to 1, then draw one word at random using these chances. Green = candidates; red = impossible now.', parts: [{ type: 'bars', label: 'Final sampling distribution', values: r2(fin), idxLabels: names, texts: tx(fin), hl: oh }, { type: 'vars', vals: { temperature: T, 'top-k': K || 'off', 'top-p': P, candidates: Object.keys(keep).filter(function (k) { return keep[k]; }).length } }] });
      return f;
    }
  }],
  examples: [
    { title: 'Apply top-p = 0.8 by hand', html: `<p>Probabilities: A 0.45, B 0.25, C 0.15, D 0.10, E 0.05.</p>
      ${H.table(['Token', 'p', 'Running total', 'Decision'], [['A', '0.45', '0.45', '<span class="c-g">keep</span>'], ['B', '0.25', '0.70', '<span class="c-g">keep</span>'], ['C', '0.15', '0.85 (reaches 0.8)', '<span class="c-g">keep, then stop</span>'], ['D', '0.10', '-', '<span class="c-r">cut</span>'], ['E', '0.05', '-', '<span class="c-r">cut</span>']])}
      <p>Renormalise by 0.85: A 0.53, B 0.29, C 0.18. Note: the token that <i>crosses</i> p is kept.</p>` },
    { title: 'Why top-p adapts and top-k does not', html: `<p>Case 1: model is sure - "The capital of France is" -> Paris 0.97. Top-p 0.9 keeps just <b>one</b> word. Top-k 40 would still keep 40 candidates (39 of them junk).</p>
      <p>Case 2: model is unsure - "My favourite colour is" -> 30 plausible colours each ~3%. Top-p 0.9 keeps ~28 words; top-k 5 would wrongly cut most reasonable ones.</p>
      <p>That is why top-p (a probability budget) is the more popular filter.</p>` },
    { title: 'Temperature 0 vs 1 on a coding question', html: `${H.table(['Run', 'T = 0', 'T = 1.2'], [['1', 'SELECT SUM(amount) ...', 'SELECT SUM(amount) ...'], ['2', 'SELECT SUM(amount) ...', 'SELEKT sum of the price ...'], ['3', 'SELECT SUM(amount) ...', 'SELECT TOTAL(amount) ...']])}
      <p>For code, one wrong token can break everything, so lower temperature raises reliability. For a poem, the "boring" repeated answer at T = 0 is the problem.</p>` },
    { title: 'Choosing settings for four features', html: `${H.table(['Feature', 'Setting', 'Reason'], [['Auto-complete in an editor', 'T 0 to 0.2', 'predictable suggestions'], ['Customer-support answers from policy', 'T 0 to 0.3 + retrieval', 'consistency and accuracy'], ['Marketing slogans (ask for 10)', 'T 1.0, top-p 0.95', 'variety across candidates'], ['Data extraction to JSON', 'T 0 + schema', 'valid, repeatable structure']])}
      <p>For tasks with a checkable answer, a strong trick is: sample several answers at T 0.7 and take the majority vote (self-consistency).</p>` }
  ],
  deepDive: `<p><b>Math of temperature.</b> p_i = exp(z_i / T) / sum_j exp(z_j / T). As T -> 0 it becomes argmax; as T -> infinity it becomes uniform. It is the same temperature idea as in physics (Boltzmann distribution): hot systems explore, cold systems settle.</p>
  <p><b>Min-p and other filters.</b> Min-p keeps tokens whose probability is at least some fraction of the top token's probability (scales with confidence). Typical sampling, Mirostat and epsilon sampling try to keep "surprise" at a steady level. Repetition penalties down-weight tokens already used, which helps loops but can hurt when repeating is correct (code, names).</p>
  <p><b>Order of operations</b> differs between libraries: usually temperature first, then top-k, then top-p, then renormalise. Mixing them with extreme values can leave one token or an empty set (libraries guard against it by always keeping at least one token).</p>
  <p><b>Determinism.</b> Even at temperature 0 GPU kernels add numbers in different orders depending on batch size, which can flip a near-tie. If you need exact repeatability, use a fixed seed where offered, a pinned model version, caching of results, and design tests that tolerate small variation.</p>
  <p><b>Reasoning models and temperature.</b> Some providers fix or restrict temperature on reasoning models because the long hidden chain of thought is sensitive to randomness. Check each model's documentation.</p>
  <p><b>Best-of-n and majority vote.</b> Sampling n answers and choosing by vote (self-consistency) or by a verifier raises accuracy on maths and code at n times the cost. It only works if samples are diverse enough, so temperature must not be 0.</p>`,
  aiEra: `<p><b>What AI changes:</b> sampling parameters are product dials: they change reliability, creativity, cost (when you sample many), and the user's trust. Different features in the same app should use different settings.</p>
  <p><b>Use AI as a partner:</b> ask a model to generate 10 diverse variants for a brainstorming task at high temperature, then ask the same model at low temperature to critique and rank them. Combine exploration and judgement.</p>
  <p><b>Where AI goes wrong:</b> "I set temperature 0 so it is deterministic and will never hallucinate" - false on both counts. Low temperature makes the model consistently pick its most likely answer, which can be consistently wrong.</p>
  <p><b>What you must still own:</b> matching settings to the task, testing outputs across many runs rather than one, designing evals that tolerate variation, and being able to explain temperature, top-k and top-p with numbers in an interview.</p>`,
  problems: [{
    title: 'Apply Temperature and Top-p to a Distribution',
    level: 'Easy', tags: ['sampling', 'top-p', 'temperature'], companies: ['Any AI team'],
    statement: `<p>After a prompt the model gives probabilities: <b>Paris 0.60, Lyon 0.20, Nice 0.10, Rome 0.06, Banana 0.04</b>. (a) Apply <b>top-p = 0.85</b> and give the new probabilities. (b) You then raise the temperature a lot. Which tokens are now more likely to be chosen? (c) Which setting would you use for "What is the capital of France?" and why?</p>`,
    constraints: `Show running totals. The token that crosses p is kept.`,
    example: `<p>Running totals: 0.60, 0.80, 0.90 (crosses 0.85). Keep Paris, Lyon, Nice -> divide by 0.90: <b>0.67, 0.22, 0.11</b>.</p>`,
    brute: { why: `<p>Dropping every token below 0.15 and forgetting to renormalise, or stopping <i>before</i> the token that crosses p. The probabilities then do not add to 1 or too few tokens are kept.</p>` },
    mcq: { q: 'Which statement about low temperature is correct?', options: ['It makes the top token more dominant, so output is more repeatable', 'It guarantees the answer is true', 'It increases the context window', 'It makes the model forget earlier text'], answer: 0, explain: 'Low temperature sharpens the distribution; it does not add truth or change memory.' },
    hints: [`<p>Sort from highest to lowest probability and keep a running total.</p>`, `<p>Stop right after the running total first reaches or passes p.</p>`, `<p>Then divide each kept probability by their sum. For (b), higher T flattens: the tail (Rome, Banana) grows, but a top-p cut applied afterwards could still remove it.</p>`],
    solution: {
      approach: `<p><b>(a)</b> Sorted: Paris 0.60 (total 0.60), Lyon 0.20 (0.80), Nice 0.10 (0.90). The total first reaches 0.85 when Nice is added, so keep Paris, Lyon and Nice and cut Rome and Banana. The kept mass is 0.90, so renormalise: Paris 0.60/0.90 = 0.667, Lyon 0.222, Nice 0.111. <b>(b)</b> Raising temperature flattens the distribution: the lower tokens (Lyon, Nice, Rome, Banana) gain probability and Paris loses some. Because top-p is usually applied after temperature, a flatter distribution means more tokens are needed to reach 0.85, so more candidates survive and the risk of a strange token rises. <b>(c)</b> For a factual question use a low temperature (0 to 0.3), with top-p about 0.9 or left at 1: there is one right answer and we want the model's most likely token, not variety. For brainstorming you would do the opposite.</p>`,
      code: { lang: 'python', code: `probs = {"Paris": 0.60, "Lyon": 0.20, "Nice": 0.10, "Rome": 0.06, "Banana": 0.04}
p_cut, keep, total = 0.85, {}, 0.0
for tok, p in sorted(probs.items(), key=lambda kv: -kv[1]):
    keep[tok] = p
    total += p
    if total >= p_cut:          # the token that crosses p is still kept
        break
norm = sum(keep.values())
print({t: round(p / norm, 3) for t, p in keep.items()})`, run: true },
      complexity: `<p>Sorting the vocabulary costs O(V log V) per step (V = vocabulary size); implementations use partial selection or GPU kernels to keep it fast.</p>`,
      followUps: ['What if the top token alone has probability above p?', 'How does min-p differ from top-p?']
    }
  }]
});

// ---------- PRACTICE ----------
practice.push({
  title: 'Why Can\'t the Model Count the Letters in "strawberry"?',
  level: 'Easy', tags: ['tokenization', 'limits'], companies: ['OpenAI', 'Anthropic', 'Any AI team'],
  statement: `<p>A user asks a chat model "How many r's are in strawberry?" and it sometimes says 2. Explain why in plain words, and give two reliable ways to get the right answer.</p>`,
  constraints: `Answer in under 150 words as if explaining to a non-technical teammate.`,
  example: `<p>Correct answer: <b>3</b>. The model likely sees <code>straw</code> + <code>berry</code> as two tokens (two ids), not ten letters.</p>`,
  brute: { why: `<p>"The model is just not smart enough" - wrong diagnosis. The same model can solve harder problems. The issue is what the model is <i>shown</i>: ids of word pieces, not letters.</p>` },
  mcq: { q: 'What is the best fix for exact letter counting?', options: ['Run a tiny code tool (word.count("r")) or make the model spell the word letter by letter first', 'Raise the temperature', 'Use a longer context window', 'Ask three times and trust the majority'], answer: 0, explain: 'Spelling out (or code) makes each character visible, which tokenization normally hides.' },
  hints: [`<p>What does the model actually receive as input: letters or numbers?</p>`, `<p>Tokens are chunks of letters. Inside a chunk the model must have memorised the spelling.</p>`, `<p>Make characters visible: spell it out, or call code.</p>`],
  solution: {
    approach: `<p>The model never reads letters. Text is split into tokens (word pieces) and each piece becomes an id number. "strawberry" is probably two tokens, <code>straw</code> and <code>berry</code>. The model has to rely on spelling facts it picked up from training text, such as "berry is b-e-r-r-y", and then combine them. That memory is patchy, especially for rare words, so it sometimes miscounts. It is like asking someone to count stitches in a sweater from a photo of the sleeves: the detail is hidden by the chunking. Two reliable fixes: (1) ask the model to first write the word with one letter per line or separated by dashes, then count (each letter becomes its own token, so it can see them); (2) give the model a code tool (Python <code>"strawberry".count("r")</code>) or compute it in your own program. This is a tokenization limit, not a lack of intelligence.</p>`,
    code: { lang: 'python', code: `word = "strawberry"
print(word.count("r"))             # 3, computed on characters
print("-".join(word))              # s-t-r-a-w-b-e-r-r-y  (what 'spelling out' does)`, run: true },
    complexity: `<p>Not an algorithm problem; the point is knowing which tasks to route to code.</p>`,
    followUps: ['Name two other tasks hurt by tokenization.', 'Why can models still do harder things like write a sonnet?']
  }
});

practice.push({
  title: 'Choose a Temperature for Four Tasks',
  level: 'Easy', tags: ['temperature', 'sampling'], companies: ['Any AI team'],
  statement: `<p>Pick a temperature range (low / medium / high) for each task and justify it in one sentence: (1) generating a SQL query, (2) naming ideas for a new coffee shop, (3) summarising a legal contract, (4) a friendly customer-chat reply.</p>`,
  constraints: `Use the values: low 0 to 0.3, medium 0.5 to 0.8, high 0.9 to 1.3.`,
  example: `<p>(1) SQL -> low, because one wrong token breaks the query.</p>`,
  brute: { why: `<p>Using one global default (say 1.0) for everything. Code and extraction then get random typos, while at 0 every brainstorm returns the same ideas.</p>` },
  mcq: { q: 'Which task benefits most from a high temperature?', options: ['Brainstorming 20 slogans', 'Extracting invoice totals into JSON', 'Writing a unit test', 'Translating a legal clause exactly'], answer: 0, explain: 'Brainstorming wants variety; the others want one correct, repeatable answer.' },
  hints: [`<p>Ask: is there one right answer, or do I want many different good ones?</p>`, `<p>One right answer -> low temperature. Many good answers -> higher.</p>`, `<p>Chat replies need to feel natural but not wild: medium.</p>`],
  solution: {
    approach: `<p>(1) <b>SQL: low (0 to 0.2).</b> There is one correct structure and a single wrong token (a column name) breaks it; we want the most likely, repeatable answer. (2) <b>Coffee-shop names: high (0.9 to 1.2).</b> Variety is the whole goal, and a person will pick from the list; sample several times. (3) <b>Legal contract summary: low (0 to 0.3).</b> Faithfulness matters more than style; creative drift can distort obligations. Pair with retrieval of exact clauses and quote them. (4) <b>Customer chat: medium (0.4 to 0.7).</b> Natural, varied wording without risking odd or off-brand statements; combine with a firm system prompt and guardrails for facts. Remember temperature does not control truthfulness; low temperature just makes the model repeat its most likely answer, right or wrong.</p>`,
    complexity: `<p>Judgement question; no algorithmic cost.</p>`,
    followUps: ['What would you change if the chat bot also quotes prices?']
  }
});

practice.push({
  title: 'Cosine Similarity: Which Document Matches the Query?',
  level: 'Easy', tags: ['embeddings', 'similarity'], companies: ['Any AI team'],
  statement: `<p>Query vector q = [1, 1]. Document vectors: A = [2, 2], B = [1, 0], C = [-1, 1]. Rank them by cosine similarity to q.</p>`,
  constraints: `cos(a,b) = dot(a,b) / (|a| |b|)`,
  example: `<p>A: dot = 4, |q||A| = 1.414 x 2.828 = 4 -> <b>1.00</b>.</p>`,
  brute: { why: `<p>Ranking by raw dot product or by distance of endpoints. A is longer than q but points in the same direction; dot product would also favour long vectors, even when direction differs.</p>` },
  mcq: { q: 'What does cosine similarity ignore?', options: ['The length (magnitude) of the vectors', 'Their direction', 'The number of dimensions', 'Their sign'], answer: 0, explain: 'It measures the angle only, so scaled copies of a vector score 1.' },
  hints: [`<p>Compute the dot product with q for each document.</p>`, `<p>Divide the dot product by the product of the two vector lengths.</p>`, `<p>A = 1.00, B = 1/(1.414 x 1) = 0.71, C = 0/(1.414 x 1.414) = 0.</p>`],
  solution: {
    approach: `<p>Lengths: |q| = &radic;2 = 1.414. A: dot = 2+2 = 4, |A| = 2.828, cosine = 4 / (1.414 x 2.828) = <b>1.00</b>. B: dot = 1, |B| = 1, cosine = 1 / 1.414 = <b>0.71</b>. C: dot = -1+1 = 0, cosine = <b>0.00</b>. Ranking: A, B, C. A points in exactly the same direction as the query (same topic, just "louder"), B partly agrees, C is at a right angle, so unrelated. This is how semantic search ranks chunks in RAG: embed the query, compute cosine against stored chunk vectors, return the top few. In production, vectors are often normalised to length 1 so cosine equals a dot product and a vector index can find nearest neighbours quickly.</p>`,
    code: { lang: 'python', code: `import math
def cos(a, b):
    return sum(x * y for x, y in zip(a, b)) / (math.hypot(*a) * math.hypot(*b))
q = [1, 1]
for name, v in {"A": [2, 2], "B": [1, 0], "C": [-1, 1]}.items():
    print(name, round(cos(q, v), 2))`, run: true },
    complexity: `<p>O(d) per comparison; brute force over N documents is O(N d), approximated by indexes like HNSW.</p>`,
    followUps: ['Why normalise vectors?', 'When can cosine similarity mislead?']
  }
});

practice.push({
  title: 'How Many Tokens Is a Book? Quick Estimates',
  level: 'Easy', tags: ['tokens', 'estimation'], companies: ['Any AI team'],
  statement: `<p>A novel has 90,000 words. (a) Estimate its tokens. (b) Does it fit in a 128k window with room for a 2,000-token answer? (c) What would it cost as input at $3 per 1M tokens?</p>`,
  constraints: `1 token = 0.75 words (English).`,
  example: `<p>90,000 / 0.75 = <b>120,000 tokens</b>.</p>`,
  brute: { why: `<p>Assuming 1 word = 1 token. That underestimates by about a third and could cause a "too long" error in production.</p>` },
  mcq: { q: 'Roughly how many English words is 1,000 tokens?', options: ['750', '1,000', '250', '4,000'], answer: 0, explain: 'About 0.75 words per token.' },
  hints: [`<p>Divide the number of words by 0.75 to get tokens (1 token = 0.75 words).</p>`, `<p>Add the answer size and compare with the window.</p>`, `<p>Cost = tokens / 1,000,000 x the price per million tokens, for each call.</p>`],
  solution: {
    approach: `<p>(a) 90,000 words / 0.75 = 120,000 tokens (equivalently x 1.33). (b) Input 120,000 + answer 2,000 = 122,000, which is under 128,000 so it fits, but only with about 6,000 tokens left for the system prompt and question. It is tight, and quality on a nearly full window is usually worse than on a shorter one. (c) 120,000 / 1,000,000 x $3 = <b>$0.36 per call</b>, and every follow-up question re-sends the book, so 20 questions is about $7 unless you use prompt caching. A cheaper plan: split into chapters, retrieve the relevant parts, or summarise once and reuse the summary. Always keep a safety margin because the real tokenizer may differ from the rule of thumb, especially for dialogue, names or non-English text.</p>`,
    complexity: `<p>Constant-time arithmetic only.</p>`,
    followUps: ['How would prompt caching change the cost of 20 questions?']
  }
});

practice.push({
  title: 'Run BPE by Hand on "aaabdaaabac"',
  level: 'Medium', tags: ['BPE', 'tokenization'], companies: ['Google', 'OpenAI'],
  statement: `<p>Run Byte Pair Encoding on the string <code>aaabdaaabac</code>, merging the most frequent adjacent pair each round. Break ties by choosing the pair that appears first in the string. Show each round and the final token list. How many rounds until no pair repeats?</p>`,
  constraints: `Name new tokens Z, Y, X in order. Stop when every pair has count 1.`,
  example: `<p>Round 1: aa appears 4 times -> Z. Text: <code>Z a b d Z a b a c</code>.</p>`,
  brute: { why: `<p>Guessing merges without counting. Counting overlapping pairs carelessly (in "aaa" the pair "aa" occurs twice with overlap) gives the wrong frequencies.</p>` },
  mcq: { q: 'How many times does the pair "aa" occur (overlapping counted) in "aaabdaaabac"?', options: ['4', '2', '3', '6'], answer: 0, explain: 'aaa gives 2 overlapping pairs, twice in the string: 4.' },
  hints: [`<p>List all adjacent pairs and count how often each appears.</p>`, `<p>Merge left to right, without overlaps, after choosing the winner.</p>`, `<p>After aa->Z: Z a b d Z a b a c. Now Za=2, ab=2: tie, pick the first (Za).</p>`],
  solution: {
    approach: `<p>Start: a a a b d a a a b a c. <b>Round 1:</b> pairs aa(4), ab(2), bd, da, ba, ac. Winner aa -> Z. Scanning left to right without overlap gives Z a b d Z a b a c. <b>Round 2:</b> pairs Za(2), ab(2), bd(1), dZ(1), ba(1), ac(1). Tie between Za and ab; by the "first in the string" rule choose Za -> Y: Y b d Y b a c. <b>Round 3:</b> pairs Yb(2), bd, dY, ba, ac. Yb -> X: X d X a c. <b>Round 4:</b> pairs Xd, dX, Xa, ac each 1: stop. Final tokens: X, d, X, a, c (5 tokens from 11 characters). Merge list: aa=Z, Za=Y, Yb=X, meaning X stands for "aaab". A different tie-break (choose ab in round 2) gives a different but equally valid merge list, which is why real tokenizers fix a deterministic tie rule and store the ordered merge list: encoding replays the merges in order.</p>`,
    code: { lang: 'python', code: `def bpe(s):
    toks = list(s)
    names = iter("ZYXWV")
    while True:
        counts = {}
        for a, b in zip(toks, toks[1:]):
            counts[(a, b)] = counts.get((a, b), 0) + 1
        best = max(counts.values(), default=0)
        if best < 2:
            return toks
        # first pair (in string order) with the max count
        pair = next(p for p in zip(toks, toks[1:]) if counts[p] == best)
        new, out, i = next(names), [], 0
        while i < len(toks):
            if i + 1 < len(toks) and (toks[i], toks[i + 1]) == pair:
                out.append(new); i += 2
            else:
                out.append(toks[i]); i += 1
        print("merge", pair, "->", new, ":", " ".join(out))
        toks = out

print(bpe("aaabdaaabac"))`, run: true },
    complexity: `<p>Each round is O(L) for a string of length L; at most L rounds, so O(L<sup>2</sup>) naively. Real trainers keep incremental pair counts.</p>`,
    followUps: ['How do you encode a new string with the learned merges?', 'Why start from bytes instead of characters?']
  }
});

practice.push({
  title: 'Implement Causal Self-Attention in Pure Python',
  level: 'Medium', tags: ['attention', 'implementation'], companies: ['OpenAI', 'Meta', 'Google'],
  statement: `<p>Write <code>attention(Q, K, V, causal)</code> in plain Python (lists of lists) returning the weights and outputs. Test with 3 tokens, and show that with causal=True the first row is [1, 0, 0].</p>`,
  constraints: `n tokens, d numbers each. Use softmax with max-subtraction. Masked scores become -inf.`,
  example: `<p>Q = K = [[1,0],[0,1],[1,1]]: causal weights row 3 = [0.25, 0.25, 0.50].</p>`,
  brute: { why: `<p>Computing softmax by directly exponentiating raw scores (overflow for large values) and forgetting the 1/&radic;d scale or the mask (leaking the future).</p>` },
  mcq: { q: 'In a causal mask, which scores become minus infinity?', options: ['Those where key position > query position', 'Those on the diagonal', 'The largest scores', 'Those where key position < query position'], answer: 0, explain: 'A token may attend to itself and the past, not the future.' },
  hints: [`<p>Score matrix: S[i][j] = dot(Q[i], K[j]) / sqrt(d).</p>`, `<p>If causal and j &gt; i, treat the score as -inf (weight 0).</p>`, `<p>Softmax each row, then output[i] = sum_j W[i][j] x V[j].</p>`],
  solution: {
    approach: `<p>Compute the score matrix S where S[i][j] = dot(Q[i], K[j]) / sqrt(d). If causal, replace S[i][j] with minus infinity for j &gt; i so those positions get exactly zero weight. Apply a numerically stable softmax to each row: subtract the row maximum before exponentiating, then divide by the sum. Finally the output for token i is the weighted sum of Value vectors. Check: the first row has only one allowed position, so its weight is 1.0 and its output equals V[0]. Every row must sum to 1. Complexity is O(n<sup>2</sup> d) time and O(n<sup>2</sup>) memory for the weight matrix, which is why long contexts are expensive and why optimised kernels avoid materialising the matrix.</p>`,
    code: { lang: 'python', code: `import math

def softmax(row):
    m = max(x for x in row if x != float("-inf"))
    ex = [0.0 if x == float("-inf") else math.exp(x - m) for x in row]
    s = sum(ex)
    return [e / s for e in ex]

def attention(Q, K, V, causal=True):
    n, d = len(Q), len(Q[0])
    W = []
    for i in range(n):
        row = []
        for j in range(n):
            s = sum(a * b for a, b in zip(Q[i], K[j])) / math.sqrt(d)
            row.append(float("-inf") if causal and j > i else s)
        W.append(softmax(row))
    out = [[sum(W[i][j] * V[j][k] for j in range(n)) for k in range(len(V[0]))] for i in range(n)]
    return W, out

Q = K = [[1, 0], [0, 1], [1, 1]]
V = [[1, 0], [0, 2], [1, 1]]
W, out = attention(Q, K, V, causal=True)
for w in W:
    print([round(x, 2) for x in w], "sum", round(sum(w), 2))
print("outputs", [[round(v, 2) for v in o] for o in out])`, run: true },
    complexity: `<p>Time O(n<sup>2</sup> d), memory O(n<sup>2</sup>).</p>`,
    followUps: ['How would multi-head attention change the code?', 'What does the KV cache save during generation?']
  }
});

practice.push({
  title: 'Estimate KV-Cache Memory for a Long Chat',
  level: 'Medium', tags: ['KV cache', 'capacity'], companies: ['Any AI infra team'],
  statement: `<p>A model has 32 layers and d_model = 4,096 (full multi-head attention), stored in fp16 (2 bytes). (a) How many bytes of KV cache does <b>one token</b> need? (b) How much for one 8,000-token conversation? (c) How many such conversations fit on an 80 GB GPU if the weights take 14 GB? (d) Name two ways to fit more.</p>`,
  constraints: `KV per token = 2 (K and V) x layers x d_model x bytes.`,
  example: `<p>2 x 32 x 4,096 x 2 = <b>524,288 bytes</b> (0.5 MB).</p>`,
  brute: { why: `<p>Only counting weights when planning GPUs. Long chats then crash with out-of-memory even though the weights fit comfortably.</p>` },
  mcq: { q: 'Which technique reduces KV-cache size by sharing keys/values across attention heads?', options: ['Grouped-query attention', 'Higher temperature', 'Top-p sampling', 'Byte pair encoding'], answer: 0, explain: 'GQA uses fewer K/V heads than query heads, shrinking the cache several times.' },
  hints: [`<p>For each layer, each token stores one K vector and one V vector of d_model numbers.</p>`, `<p>Multiply the per-token figure by the number of tokens in the chat.</p>`, `<p>Free memory = 80 - 14 GB = 66 GB. Divide by the per-conversation cache.</p>`],
  solution: {
    approach: `<p>(a) Per token: 2 (K and V) x 32 layers x 4,096 numbers x 2 bytes = 524,288 bytes, about 0.5 MB. (b) 8,000 tokens x 0.5 MB = about 4.2 GB (4,194 MB) per conversation. (c) Free memory is 80 - 14 = 66 GB (ignoring activations and overhead), so 66 / 4.2 = about <b>15 concurrent conversations</b>. In practice you keep a margin, so 10 to 12. (d) Ways to fit more: grouped-query or multi-query attention (K/V shared across heads, 4x to 8x smaller cache), quantising the cache to 8-bit or 4-bit, paged cache management (like virtual memory, no wasted gaps), shorter context limits or sliding-window attention, and evicting or compressing old tokens. Insight: for long contexts and many users the KV cache, not the weights, becomes the main memory cost and a main driver of serving price.</p>`,
    code: { lang: 'python', code: `layers, d, bytes_ = 32, 4096, 2
per_token = 2 * layers * d * bytes_
per_chat = per_token * 8000
free = (80 - 14) * 1e9
print(per_token, "bytes/token;", round(per_chat / 1e9, 2), "GB per 8k chat;", int(free // per_chat), "chats fit")`, run: true },
    complexity: `<p>Cache memory grows linearly with tokens x layers x width x users.</p>`,
    followUps: ['How does GQA with 8 KV heads of 4 groups change the number?', 'What is paged attention?']
  }
});

practice.push({
  title: 'Design a Pre-Training vs Fine-Tuning Data Plan',
  level: 'Medium', tags: ['SFT', 'RLHF', 'data'], companies: ['Any AI team'],
  statement: `<p>Your team wants an internal assistant that answers in your company's tone, always cites policy sections, and refuses to give legal advice. You have a strong open base model, 3,000 good Q&A examples, and a policy wiki. Explain which training or non-training techniques you would use for each requirement and in what order.</p>`,
  constraints: `Budget: one GPU server for a few days; no budget to pre-train.`,
  example: `<p>Citations -> retrieval + prompt format. Tone -> SFT with LoRA. Refusal -> preference or rule-based tuning plus guardrails.</p>`,
  brute: { why: `<p>"Fine-tune on the wiki so it knows everything." Facts become stale, the model still cannot cite precise sections, and there is no tested way to guarantee a refusal.</p>` },
  mcq: { q: 'Which is the most cost-effective way to teach a model your company tone?', options: ['LoRA supervised fine-tuning on good examples (after trying prompting)', 'Pre-training from scratch', 'Raising top-k', 'Doubling the context window'], answer: 0, explain: 'Tone is behaviour, which cheap fine-tuning handles well.' },
  hints: [`<p>Separate knowledge (facts) from behaviour (tone, format, refusals).</p>`, `<p>Start with prompting + retrieval; measure before training.</p>`, `<p>Plan: baseline eval -> RAG with citations -> LoRA SFT on 3,000 examples (hold out 300) -> refusal pairs via DPO or classifier -> re-evaluate.</p>`],
  solution: {
    approach: `<p>Step 0: build an evaluation set (e.g. 200 real questions with expected behaviour: correct, cited, in tone, refused when legal) before changing anything. Step 1: prompt plus <b>RAG</b> over the policy wiki, instructing the model to answer only from retrieved sections and to cite section IDs; this handles facts, freshness and citations without training. Step 2: if tone or format is still inconsistent, run <b>LoRA supervised fine-tuning</b> on the 3,000 examples (keep 10% held out for testing), training loss only on the assistant tokens; this teaches house style and the citation format cheaply on one GPU. Step 3: for refusals, add examples of legal-advice requests with the desired polite refusal (SFT), optionally preference pairs with DPO, and keep a separate input classifier as a hard guardrail, since training alone is not a guarantee. Step 4: re-run the eval, check regressions on general ability, and monitor in production. Pre-training from scratch is out of scope and unnecessary.</p>`,
    complexity: `<p>Costs: RAG adds retrieval latency; LoRA training runs hours to days on one GPU; evaluation and data quality are the real effort.</p>`,
    followUps: ['How would you detect catastrophic forgetting after fine-tuning?', 'What if the policies change weekly?']
  }
});

practice.push({
  title: 'Explain Why Models Hallucinate (and Reduce It)',
  level: 'Medium', tags: ['hallucination', 'next-token'], companies: ['Any AI team'],
  statement: `<p>A product manager asks: "Why does the assistant invent a court case that does not exist, and how do we stop it?" Give a clear explanation tied to next-token prediction and a layered mitigation plan.</p>`,
  constraints: `Mention training objective, decoding, and at least three mitigations with their limits.`,
  example: `<p>Cause: trained to produce likely text; a fake case name that looks real is a likely continuation.</p>`,
  brute: { why: `<p>"Set temperature to 0 and it will stop." Greedy decoding still picks the most likely token, which can be a confident fabrication.</p>` },
  mcq: { q: 'Which change most directly grounds answers in real facts?', options: ['Retrieve trusted documents and require citations', 'Lower the temperature to 0', 'Add the word "accurate" to the prompt', 'Increase max tokens'], answer: 0, explain: 'Grounding supplies actual sources; the other changes do not add information.' },
  hints: [`<p>What is the model rewarded for during training: truth or plausibility?</p>`, `<p>Fix the missing information problem: provide sources at run time.</p>`, `<p>Add verification: check citations exist, let the model say "I do not know", evaluate on known-answer tests, human review for high stakes.</p>`],
  solution: {
    approach: `<p><b>Why:</b> the model is trained to predict the next token of real text, so it learns what likely text looks like, not a database of verified facts. A made-up case with a real-sounding name, court and year is highly probable text, and nothing inside the network checks it against a source. Preference tuning rewards confident, helpful tone, which can worsen overconfidence. Greedy or low-temperature decoding only makes the model repeat its most likely guess. <b>Mitigation layers:</b> (1) grounding with retrieval (RAG) from trusted documents and an instruction to answer only from them; limit: retrieval can miss or return wrong chunks. (2) Require citations and automatically verify that each cited source exists and supports the claim; limit: extra cost and check quality. (3) Teach and prompt abstention ("say you do not know if the sources do not contain it") and evaluate it; limit: may over-refuse. (4) Use tools (search, database, calculator) for facts and arithmetic. (5) Human review for legal, medical and financial outputs. (6) Monitor with a test set of known and unanswerable questions. No single step removes hallucination, so design for detection, not just prevention.</p>`,
    complexity: `<p>Quality metrics: citation precision, groundedness rate, abstention accuracy.</p>`,
    followUps: ['How do you measure hallucination rate?', 'Can a bigger model fix this?']
  }
});

practice.push({
  title: 'Count Parameters of a Transformer',
  level: 'Hard', tags: ['architecture', 'parameters'], companies: ['OpenAI', 'Google', 'NVIDIA'],
  statement: `<p>A decoder-only model has d_model = 2,048, 24 layers, MLP hidden size 4 x d_model, vocabulary 50,000, tied input/output embeddings. (a) Count the parameters (ignore biases and norms). (b) How much memory do the weights take in fp16 and in 4-bit? (c) Approximately how many FLOPs to generate one token?</p>`,
  constraints: `Attention = 4 d^2 per layer; MLP = 8 d^2 per layer; forward FLOPs per token ~ 2 x parameters.`,
  example: `<p>Per layer: 12 x 2,048<sup>2</sup> = 50.3M.</p>`,
  brute: { why: `<p>Forgetting the embedding table, or counting it twice when it is tied, which changes the total by 100M.</p>` },
  mcq: { q: 'In a standard block, which part holds roughly two thirds of the parameters?', options: ['The MLP', 'Self-attention', 'LayerNorm', 'The softmax'], answer: 0, explain: 'MLP 8d^2 versus attention 4d^2 per layer.' },
  hints: [`<p>Per layer: 4d^2 (attention) + 8d^2 (MLP) = 12d^2.</p>`, `<p>Embedding table = vocab x d (counted once if tied).</p>`, `<p>Bytes = params x 2 (fp16) or x 0.5 (4-bit). FLOPs per token ~ 2 x params.</p>`],
  solution: {
    approach: `<p>(a) Per layer: attention 4 x 2,048<sup>2</sup> = 16.8M, MLP 8 x 2,048<sup>2</sup> = 33.6M, total 50.3M. Over 24 layers: 1.208 billion. Embedding table: 50,000 x 2,048 = 102.4M, counted once because the output projection reuses it. Total about <b>1.31 billion parameters</b> (a "1.3B" model). (b) fp16: 1.31B x 2 bytes = 2.6 GB. 4-bit: 1.31B x 0.5 byte = 0.66 GB, plus a little for scales. Remember the KV cache and activations come on top. (c) A forward pass uses each weight about once for a multiply and an add: about 2 x 1.31B = 2.6 GFLOPs per generated token (the attention part over long contexts adds more). On a GPU delivering 100 TFLOP/s effectively that is theoretical 38,000 tokens/second, but real decoding is limited by memory bandwidth (reading all weights each token), not FLOPs, so the practical speed is far lower and batching many users helps.</p>`,
    code: { lang: 'python', code: `d, layers, vocab = 2048, 24, 50_000
per_layer = 4 * d * d + 8 * d * d
total = layers * per_layer + vocab * d
print("per layer: %.1fM" % (per_layer / 1e6))
print("total: %.2fB parameters" % (total / 1e9))
print("fp16: %.1f GB, 4-bit: %.2f GB" % (total * 2 / 1e9, total * 0.5 / 1e9))
print("forward FLOPs per token: %.1f G" % (2 * total / 1e9))`, run: true },
    complexity: `<p>Parameters grow with layers x d<sup>2</sup>; compute per token is proportional to parameters.</p>`,
    followUps: ['How would a mixture-of-experts change active parameters?', 'Why is decoding memory-bandwidth bound?']
  }
});

practice.push({
  title: 'Question Answering over a 500-Page Document',
  level: 'Hard', tags: ['context window', 'RAG', 'design'], companies: ['Any AI team'],
  statement: `<p>Users want to ask questions about 500-page manuals (about 250k tokens each) with a model whose window is 128k tokens and whose price is per token. Design the solution. Cover chunking, retrieval, how you stay inside the window, cost per question, and failure cases.</p>`,
  constraints: `Target answers in under 5 seconds and under $0.02 per question.`,
  example: `<p>Retrieve ~6 chunks of 800 tokens (4,800 tokens) instead of 250k.</p>`,
  brute: { why: `<p>Paste the whole manual into every call: it does not fit (250k &gt; 128k), and even a 100k-token version would cost about $0.30 per question and be slow and less accurate in the middle.</p>` },
  mcq: { q: 'Which preparation step is done once per document rather than per question?', options: ['Chunking and embedding the manual', 'Embedding the user query', 'Generating the answer', 'Re-ranking retrieved chunks'], answer: 0, explain: 'Indexing is offline; only the query-side steps run per question.' },
  hints: [`<p>Do not send the manual; send only the relevant parts.</p>`, `<p>Offline: chunk (500 to 1000 tokens, overlap), embed, store with metadata (page, section). Online: embed question, retrieve top-k, optionally rerank.</p>`, `<p>Cost: ~6k input tokens x price; verify with citations; handle multi-section questions and tables.</p>`],
  solution: {
    approach: `<p><b>Offline indexing:</b> parse the PDF (keep headings, tables, page numbers), split by section into chunks of about 600 to 1,000 tokens with 10 to 15% overlap, embed each chunk, store vectors with metadata (document, section title, page) in a vector index, and also a keyword index for part numbers and error codes (hybrid search). <b>Per question:</b> embed the question, retrieve the top 20 by hybrid score, rerank with a cross-encoder to the best 5 to 8 chunks (about 5,000 tokens), build a prompt: short system prompt (400 tokens) with rules "answer only from the sources, cite page numbers, say you do not know otherwise", then the chunks, then the question; reserve 800 tokens for the answer. Total about 6,500 tokens: at $3/1M input and $15/1M output that is about $0.0195 input + $0.0045 for 300 output tokens = $0.024, slightly over target, so use a cheaper model for easy questions, cache the system prompt, or retrieve fewer chunks; latency about 2 to 4 seconds. <b>Failure cases:</b> questions needing a whole-document view ("summarise the manual") use map-reduce summarisation done offline; answers split across distant sections (use query rewriting or multi-step retrieval); tables and figures (parse specially); conflicting versions (filter by version metadata); prompt injection in manual text (treat chunks as data). <b>Evaluate</b> with a set of real questions measuring retrieval hit rate and answer groundedness.</p>`,
    complexity: `<p>Indexing O(total tokens); each query O(log N) approximate nearest neighbour plus one model call over ~6k tokens.</p>`,
    followUps: ['When would you prefer long-context stuffing over RAG?', 'How do you handle documents updated weekly?']
  }
});

practice.push({
  title: 'Walk Through "Hello" End to End',
  level: 'Hard', tags: ['architecture', 'end-to-end'], companies: ['OpenAI', 'Anthropic', 'Google'],
  statement: `<p>You type "Hello" into a chat assistant and receive "Hi! How can I help?". Describe everything that happens from your keystroke to the reply, including every concept in this module: tokenization, embeddings, attention, blocks, next-token prediction, training stages, sampling and context.</p>`,
  constraints: `Be precise about what is parallel (prefill) and what is sequential (decode).`,
  example: `<p>Start: system prompt + "Hello" wrapped in chat markers -> ids.</p>`,
  brute: { why: `<p>"The AI looks up the best response in its memory." There is no stored list of responses; each token is computed freshly from the context.</p>` },
  mcq: { q: 'Which part of generation cannot be parallelised across the tokens of one reply?', options: ['Decoding: each new token depends on the previous one', 'Prefill of the prompt', 'Tokenization of the prompt', 'Embedding lookup'], answer: 0, explain: 'Autoregressive decoding needs token t before it can compute token t+1.' },
  hints: [`<p>Start: the app builds one long text: system prompt, chat markers, your message.</p>`, `<p>Prefill: all prompt tokens go through every block in parallel and fill the KV cache. Decode loop: one token at a time.</p>`, `<p>Mention why it behaves like an assistant: pre-training + SFT + RLHF.</p>`],
  solution: {
    approach: `<p>1) The app builds the prompt: system instructions + chat markers + "Hello" (+ earlier turns), then the <b>tokenizer</b> (BPE) turns it into token ids. 2) Each id is looked up in the <b>embedding table</b>; position information is added, giving an n x d matrix. 3) <b>Prefill:</b> the matrix goes through N transformer blocks in parallel; in each, LayerNorm, causal self-attention (every token attends to itself and earlier tokens), a residual add, LayerNorm, MLP, a residual add. Keys and values are saved in the <b>KV cache</b>. 4) At the last position, the final vector is multiplied by the unembedding matrix to give a score per vocabulary token; <b>softmax</b> (after temperature/top-p) gives probabilities for the next token. 5) A token is <b>sampled</b> ("Hi"), appended, and only that one new token goes through the blocks (reusing the cache); repeat token by token ("!", " How", " can", ...) until an end-of-turn token or max length. This decode loop is sequential, so it is the slow part, and you see tokens streamed. 6) Tokens are decoded back to text and shown. Why it answers like an assistant: <b>pre-training</b> gave language and knowledge, <b>instruction tuning</b> taught the chat format, and <b>RLHF</b> shaped helpful, polite style. Everything the model knows about the conversation is the text in the context window; the next message re-sends it all.</p>`,
    complexity: `<p>Prefill: O(n<sup>2</sup>) attention over the prompt, parallel. Decode: O(n) per new token with a KV cache.</p>`,
    followUps: ['Where would prompt caching save time here?', 'Where do tools and retrieval enter this flow?']
  }
});

practice.push({
  title: 'Debug: The Assistant Repeats Itself and Gives the Same Answer',
  level: 'Hard', tags: ['sampling', 'debugging'], companies: ['Any AI team'],
  statement: `<p>Two bug reports on the same feature: (A) Long outputs fall into a loop ("The result is good. The result is good. The result is good..."). (B) Asking the same creative question ten times returns the identical answer. Diagnose each with the sampling concepts, propose fixes, and say how you would verify the fix.</p>`,
  constraints: `Settings now: temperature 0, top-p 1, no repetition penalty, no seed.`,
  example: `<p>Both symptoms point to greedy decoding: the most likely token after a repeated phrase is the repeat.</p>`,
  brute: { why: `<p>"The model is broken, switch vendors." The behaviour is a direct consequence of temperature 0, not a defect in the model.</p>` },
  mcq: { q: 'What is a likely effect of raising temperature from 0 to 0.7 for the brainstorming feature?', options: ['More varied answers across runs', 'Always identical answers', 'Shorter context window', 'Fewer tokens in the prompt'], answer: 0, explain: 'Sampling with T &gt; 0 draws different tokens on different runs.' },
  hints: [`<p>What does temperature 0 do to the choice of next token?</p>`, `<p>Once a phrase repeats, the model sees a pattern and the next repeat becomes the top token: a feedback loop.</p>`, `<p>Fixes: modest temperature, top-p, repetition/frequency penalty, better prompt and a max length; verify across many runs with metrics.</p>`],
  solution: {
    approach: `<p><b>Diagnosis:</b> temperature 0 means greedy decoding: always the single most likely token. (A) Loop: once a phrase has appeared, the earlier tokens in context make the same continuation the most likely again, and greedy picks it forever; the repetition feeds itself. (B) Identical answers: no randomness, so the same prompt gives the same top-token path every time; for brainstorming that removes the variety we want. <b>Fixes:</b> for (B) use temperature about 0.9 to 1.1 with top-p 0.95 and request several candidates; vary a seed per request if you need reproducibility per user. For (A) use a small temperature (0.3 to 0.7) plus a frequency or presence penalty or a no-repeat n-gram rule, give the model a clear structure (numbered list, length target), set a max token limit and a stop sequence, and shorten the task so it does not run long; check the prompt does not itself contain repetitive examples. <b>Verification:</b> generate 100 samples for each prompt before and after; measure distinct-n-gram ratio, fraction of outputs containing a repeated 5-gram, duplicate-answer rate for (B), and also run the quality evals to make sure higher temperature did not cause factual errors. Use different settings per feature rather than one global value.</p>`,
    code: { lang: 'python', code: `def repeated_ngram(text, n=4):
    w = text.split()
    grams = [tuple(w[i:i + n]) for i in range(len(w) - n + 1)]
    return len(grams) - len(set(grams))      # how many 4-grams are repeats

loop = "the result is good " * 4
varied = "the result looks good and the tests all pass today"
print("looping output repeats:", repeated_ngram(loop))
print("varied output repeats:", repeated_ngram(varied))`, run: true },
    complexity: `<p>Metrics are O(output length) per sample; run them on a few hundred samples.</p>`,
    followUps: ['Why can a repetition penalty hurt code generation?', 'How would you make results reproducible but still varied?']
  }
});

// ---------- QUIZ ----------
quiz.push({ q: 'In BPE training, what is merged in each round?', options: ['The most frequent adjacent pair of symbols', 'The longest word', 'The rarest character', 'Two random tokens'], answer: 0, explain: 'BPE counts neighbouring pairs and glues the most frequent one into a new token.' });
quiz.push({ q: 'Roughly how many English words are in 1,000 tokens?', options: ['About 750', 'About 100', 'About 4,000', 'Exactly 1,000'], answer: 0, explain: 'A token is about 4 characters or 0.75 words.' });
quiz.push({ q: 'Why do language models often fail to count letters in a word?', options: ['They see token ids for word pieces, not individual letters', 'They cannot do arithmetic at all', 'Their temperature is too high', 'The context window is too small'], answer: 0, explain: 'Tokenization hides the characters inside each token.' });
quiz.push({ q: 'What does an embedding table do?', options: ['Maps each token id to a vector of numbers carrying meaning', 'Stores the whole conversation', 'Chooses the next token', 'Counts tokens'], answer: 0, explain: 'It is a lookup table: one learned vector per token.' });
quiz.push({ q: 'In self-attention, what is the role of the Query?', options: ['It describes what the current token is looking for', 'It stores the information to hand over', 'It is the output word', 'It is the position of the token'], answer: 0, explain: 'Query is matched against Keys; the Values are what gets mixed.' });
quiz.push({ q: 'Why are attention scores divided by the square root of d?', options: ['To stop dot products growing with d, which would make softmax too sharp', 'To make the model faster', 'To remove the causal mask', 'To lower the temperature to zero'], answer: 0, explain: 'Without scaling, large scores saturate softmax and gradients vanish.' });
quiz.push({ q: 'What does the causal mask do in a GPT-style model?', options: ['Stops each token from attending to later tokens', 'Hides the first token', 'Removes padding', 'Doubles the context'], answer: 0, explain: 'Future positions get minus infinity before softmax, so their weight is 0.' });
quiz.push({ q: 'What is the main purpose of residual connections in a transformer?', options: ['Keep the original signal and let gradients flow so deep stacks train', 'Reduce vocabulary size', 'Randomise the output', 'Increase temperature'], answer: 0, explain: 'Each layer adds a small update to the stream instead of rebuilding it.' });
quiz.push({ q: 'Which part of a block mostly "moves information between tokens"?', options: ['Self-attention', 'The MLP', 'LayerNorm', 'The embedding lookup'], answer: 0, explain: 'The MLP works on each token separately.' });
quiz.push({ q: 'Approximately how many parameters does one transformer block have for width d (standard 4x MLP)?', options: ['12 d^2', 'd', '2 d', 'd^3'], answer: 0, explain: '4d^2 for attention plus 8d^2 for the MLP.' });
quiz.push({ q: 'What is the training objective of pre-training?', options: ['Predict the next token (minimise cross-entropy)', 'Follow instructions politely', 'Maximise human ratings', 'Translate languages only'], answer: 0, explain: 'Instruction following and preference come from later stages.' });
quiz.push({ q: 'A base model continues "What is the capital of France?" with more quiz questions. What fixes this?', options: ['Instruction tuning (SFT) on prompt and answer examples', 'Lower temperature', 'More top-k', 'A bigger tokenizer'], answer: 0, explain: 'SFT teaches the assistant format.' });
quiz.push({ q: 'What do reward models in RLHF learn from?', options: ['Human comparisons of which answer is better', 'The raw web text', 'Token counts', 'Random noise'], answer: 0, explain: 'Pairs of ranked answers train a scorer used to steer the chat model.' });
quiz.push({ q: 'What happens when a chat grows past the context window in a typical app?', options: ['Old messages are dropped or summarised, so the model cannot see them', 'The model stores them in a hidden database', 'Nothing, the window grows automatically', 'The temperature resets'], answer: 0, explain: 'The model only sees what is in the prompt.' });
quiz.push({ q: 'You set top-p = 0.9. What does it keep?', options: ['The smallest set of top tokens whose probabilities add to at least 0.9', 'The top 9 tokens', 'Tokens with probability above 0.9', 'Only the top token'], answer: 0, explain: 'Nucleus sampling uses a probability mass budget, so the number of tokens adapts.' });
quiz.push({ q: 'Which temperature is most suitable for generating a SQL query?', options: ['Near 0', '1.5', '2.0', 'It does not matter'], answer: 0, explain: 'Code wants the most likely, repeatable answer.' });
quiz.push({ q: 'Why is output usually slower and more expensive per token than input?', options: ['Output tokens are generated one at a time, while the prompt is processed in parallel', 'Output uses a different model', 'Input is free', 'Output has no KV cache'], answer: 0, explain: 'Decoding is sequential: token t+1 depends on token t.' });
quiz.push({ q: 'Temperature 0 guarantees which of these?', options: ['Nothing about truth; it just picks the most likely token (and is nearly, not perfectly, repeatable)', 'No hallucinations', 'Bit-for-bit identical output always', 'A larger context window'], answer: 0, explain: 'Low temperature does not add facts, and floating-point effects can still change near ties.' });

// ---------- INTERVIEW ----------
interview.push({ level: 'B', q: `What is a token, and why do LLMs use tokens instead of words or letters?`, a: `<p>A token is a chunk of text, often a word or part of a word, mapped to an integer id. Whole-word vocabularies would be enormous and fail on new words, typos and names. Letter-level models are fully flexible but make sequences very long, which is expensive because attention cost grows with length squared. Subword tokenization such as BPE sits in the middle: common words become one token, rare words are built from smaller pieces, and byte-level fallback means any text can be encoded. About 4 characters or 0.75 words per token in English. It matters because prices, rate limits and context windows are all measured in tokens.</p>`, followUps: ['How does BPE decide the merges?', 'Why do other languages cost more tokens?', 'What is a byte-level tokenizer?'] });
interview.push({ level: 'B', q: `Explain how ChatGPT-style models generate a reply.`, a: `<p>The prompt (system text, chat markers, history, your message) is tokenized and converted to embeddings. The transformer processes all prompt tokens in parallel (prefill) and saves keys and values in a KV cache. At the last position it produces a probability distribution over the vocabulary. A token is chosen using greedy or sampling (temperature, top-k, top-p), appended to the text, and the loop repeats with only the new token processed, reusing the cache, until an end token or length limit. Each step depends on the previous, so decoding is sequential, which is why output is slower and costs more than input. The model has no hidden plan or memory beyond the context.</p>`, followUps: ['Why is the first token slower than later ones?', 'What is speculative decoding?'] });
interview.push({ level: 'B', q: `Why can an LLM not reliably count the letters in a word?`, a: `<p>Because it does not see letters. The word is split into tokens such as "straw" and "berry", each represented by an id and an embedding. Spelling inside a token is information the model has to recall from training data, and that recall is imperfect, especially for rare or long words. Fixes are to make characters visible (ask it to spell the word one letter per line before counting) or use a tool, such as running code. The lesson in system design is to route character-level and exact-arithmetic tasks to deterministic code instead of relying on the model's next-token prediction.</p>`, followUps: ['What other tasks does tokenization hurt?', 'Would character-level models fix this, and at what cost?'] });
interview.push({ level: 'I', q: `Explain self-attention including Q, K, V, and why there is a square-root scaling.`, a: `<p>Each token's vector is projected into a query, a key and a value. The query of token i is compared with the keys of all tokens by dot product, giving relevance scores. Scores are divided by sqrt(d_k), passed through softmax to get weights that sum to one, and used to take a weighted average of the values: softmax(QK^T / sqrt(d)) V. The scaling matters because dot products of d-dimensional vectors have variance proportional to d, so unscaled scores become large, saturating softmax into near one-hot weights with tiny gradients. A causal mask sets future scores to minus infinity in decoder models. Multi-head attention runs several smaller attentions in parallel so different heads can capture different relations (syntax, coreference, copying).</p>`, followUps: ['What is the memory and time complexity?', 'What does a KV cache store?', 'What is grouped-query attention?'] });
interview.push({ level: 'I', q: `Describe the structure of a transformer block and what each part is for.`, a: `<p>A modern decoder block is: LayerNorm (or RMSNorm), multi-head self-attention, residual add, LayerNorm, MLP (expand about 4x, nonlinearity such as GELU or SwiGLU, project back), residual add. Attention moves information between positions; the MLP processes each position independently and stores much factual knowledge; residual connections keep a clean path for gradients and let layers make incremental edits; normalisation stabilises activations. Shapes stay n x d through the stack so blocks can be repeated dozens of times. Parameters per block are roughly 12 d^2 (4d^2 attention, 8d^2 MLP). After the last block a final norm and the unembedding matrix produce logits for the next token.</p>`, followUps: ['Pre-norm vs post-norm?', 'How does a mixture of experts change the MLP?'] });
interview.push({ level: 'I', q: `What is the difference between pre-training, instruction tuning and RLHF?`, a: `<p>Pre-training trains on trillions of tokens to predict the next token; it provides almost all knowledge and language ability and produces a base model that only continues text. Supervised fine-tuning (instruction tuning) trains on prompt and ideal-answer pairs so the model follows instructions and the chat format. Preference tuning (RLHF, or direct methods such as DPO) uses human or AI comparisons of answers to push the model toward helpful, honest and safe behaviour, usually with a constraint that keeps it near the SFT model. In short: pre-training gives knowledge, SFT gives the interface, preference tuning gives taste and safety. Side effects include sycophancy, verbosity and over-refusal when the reward proxy is imperfect.</p>`, followUps: ['What is reward hacking?', 'When do you fine-tune instead of using RAG?', 'What is LoRA?'] });
interview.push({ level: 'I', q: `How do temperature, top-k and top-p work, and how would you set them for code versus brainstorming?`, a: `<p>Temperature divides logits before softmax: below 1 sharpens the distribution toward the favourite, above 1 flattens it, near 0 is greedy. Top-k keeps the k most probable tokens. Top-p keeps the smallest set whose probabilities sum to at least p, adapting to model confidence, then renormalises. For code, structured extraction and factual answers use temperature 0 to 0.3 so the most likely, repeatable output is chosen. For brainstorming use around 0.9 to 1.2 with top-p about 0.95 and sample several candidates. Change one knob at a time, remember that low temperature does not stop hallucination, and that even temperature 0 may vary slightly due to floating-point effects.</p>`, followUps: ['Why is top-p preferred over top-k?', 'What does min-p do?'] });
interview.push({ level: 'I', q: `What happens when a conversation exceeds the context window, and how do you design for it?`, a: `<p>The model only sees the tokens in the current request, input plus output must fit the window. When the history grows, the app must reject the request, truncate the oldest messages, or compress them. Truncation silently removes early instructions and facts, so the model behaves as if they were never said. Good design: keep the system prompt pinned, maintain a structured facts or memory block, summarise older turns, retrieve relevant past snippets on demand, reserve tokens for the answer, track token usage and alert when dropping begins, and use prompt caching for the stable prefix. Also remember quality drops with very long inputs (information in the middle is used less reliably), and cost grows because the whole history is re-sent every turn.</p>`, followUps: ['What are the trade-offs of summarising?', 'How does prompt caching work?'] });
interview.push({ level: 'A', q: `Why does attention cost O(n^2), and what techniques reduce the cost or memory in practice?`, a: `<p>Every token computes a score with every other token, giving an n x n matrix; compute and naive memory scale quadratically with sequence length. In practice: FlashAttention computes exact attention in tiles without writing the full matrix to slow memory, giving large speedups; the KV cache avoids recomputing keys and values for earlier tokens during generation, trading memory for time; grouped-query and multi-query attention share K/V across heads, shrinking cache several times; sliding-window and sparse attention restrict which tokens can see each other; paged KV caches avoid fragmentation when serving many users; quantising weights and cache lowers memory. Alternative architectures (state-space models, hybrids) aim for linear scaling at some quality trade-offs.</p>`, followUps: ['How big is the KV cache for a 7B model at 100k tokens?', 'What is the prefill vs decode distinction?'] });
interview.push({ level: 'A', q: `Why do LLMs hallucinate and how would you reduce it in a production system?`, a: `<p>The training objective rewards plausible continuation of text, not verified truth, and there is no built-in lookup or "I do not know" check. When the model lacks reliable knowledge, a fluent fabricated answer still has high probability; preference tuning may add confident tone. Mitigation is layered: ground answers with retrieval from trusted sources and require citations; verify that citations exist and support the claim; use tools for facts, maths and data; train and prompt for abstention and evaluate it on unanswerable questions; use structured outputs and validators; keep a human in the loop for high-stakes domains; monitor with real-world test sets. Lowering temperature helps consistency but does not remove fabrication.</p>`, followUps: ['How do you measure groundedness?', 'What are the downsides of forcing abstention?'] });
interview.push({ level: 'A', q: `Estimate the memory and cost to serve a 7B-parameter model to many users with long chats.`, a: `<p>Weights: 7B x 2 bytes (fp16) = 14 GB, about 3.5 GB at 4-bit. The KV cache is often the bigger issue: 2 x layers x d_model x bytes per token, about 0.5 MB per token for a standard 32-layer, 4096-wide model, so an 8k-token chat uses about 4 GB and a 100k-token chat about 50 GB. On an 80 GB GPU with 14 GB of weights you fit roughly 15 chats at 8k context. Levers: grouped-query attention, cache quantisation, paged cache, shorter windows, batching many requests so weights are read once per step, quantised weights, and speculative decoding. Cost per token is driven by GPU hourly price divided by throughput, and decode is usually memory-bandwidth bound, so batch size is the main efficiency knob.</p>`, followUps: ['How does batching change latency vs throughput?', 'What is the effect of quantisation on quality?'] });
interview.push({ level: 'E', q: `A stakeholder says "set temperature to 0 and it will be deterministic and correct". Respond.`, a: `<p>Temperature 0 means greedy decoding: pick the highest-probability token at each step. That makes outputs more repeatable but neither correct nor perfectly deterministic. Correctness: the most likely continuation can be a consistent hallucination; greedy can also loop. Determinism: parallel GPU floating-point sums, batching and kernel choices can change tiny numerical values and flip near-ties, and provider model updates change behaviour. What to do instead: fix a model version, use a seed where supported, cache results for repeated inputs, use structured outputs and validators, test with tolerance and across many runs, and ground facts with retrieval or tools. For creative tasks greedy is actively harmful because it removes diversity. Explain it with the raffle-ticket analogy and offer a measurable acceptance test.</p>`, followUps: ['How would you build a regression suite for a non-deterministic system?', 'When is temperature 0 the right choice?'] });
interview.push({ level: 'E', q: `Design the training and serving approach for a company assistant: what do you pre-train, fine-tune, retrieve and prompt?`, a: `<p>Do not pre-train: start from a strong open or hosted base model. Facts that change (policies, product data) are retrieved at run time with RAG and cited; this keeps them fresh and auditable. Behaviour (tone, output format, refusals, domain vocabulary) is first handled by the prompt and structured output, then by LoRA fine-tuning on a few thousand curated examples if consistency or cost needs it, optionally with preference pairs. Guardrails (input and output classifiers, permissions on tools) are separate layers because training is not a security boundary. Build the evaluation set first and measure each step: retrieval hit rate, groundedness, format validity, refusal accuracy, latency and cost per request. Plan context engineering (token budgets, caching, summarising), monitoring for drift, and a process for updating data and models.</p>`, followUps: ['How do you keep fine-tuned and base versions in sync when the provider updates the model?', 'What evaluation would block a release?'] });

// ---------- REGISTER ----------
registerModule({
  id: 'ai06',
  title: 'How LLMs Work',
  intro: `<p>You use language models every day, but do you know what happens between pressing Enter and seeing a reply? In this module you open the box: how text becomes <b>tokens</b> (BPE), how tokens become <b>embeddings</b>, how <b>self-attention</b> lets words look at each other, how <b>transformer blocks</b> stack, how the model predicts the <b>next token</b>, how <b>pre-training, instruction tuning and RLHF</b> make an assistant, what the <b>context window</b> really means, and how <b>temperature, top-k and top-p</b> turn probabilities into text. Everything starts with an everyday analogy, then a worked numeric example, then small stdlib Python programs you can run in your browser.</p>`,
  goals: [
    'Run BPE merges by hand on a small corpus and explain why tokenization makes letter counting hard',
    'Estimate token counts and cost for a prompt, a book or a chat, including re-sent history',
    'Compute attention weights for a 3-token example and explain Q, K, V, scaling and the causal mask',
    'Describe a transformer block (attention, MLP, residual, layer norm) and count its parameters',
    'Explain next-token prediction, hallucination, and the roles of pre-training, SFT and RLHF',
    'Predict what happens when context overflows and design around it',
    'Choose temperature, top-k and top-p for code versus brainstorming and apply top-p to a distribution'
  ],
  prereqs: `Basic Python and comfort with simple arithmetic (multiplying, dividing, exponent). Helpful but not required: the earlier GenAI modules in this track (what AI is and how to talk to it).`,
  hours: 10,
  topics: topics,
  quiz: quiz,
  interview: interview,
  practice: practice
});
})();
