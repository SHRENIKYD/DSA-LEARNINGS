# Interview programs and follow-up answers

Every interview question in every module can carry two extras, stored beside the module in `data/answers/<module id>.json`:

1. a small runnable **program** that shows the idea of the question (shown as language tabs; the learner's chosen language opens first), and
2. a written **answer to each "likely follow-up" question** (shown as collapsible answers under the question).

Both appear in the lesson's interview tavern and in the Interview handbook (`handbook.html`).

## Coverage (release 1.10.48)

| Measure | Count |
|---|---|
| Tracks / modules with answers files | 16 / 298 (every module) |
| Interview questions | 4,548 |
| Written follow-up answers | 10,145 (one per follow-up question) |
| Questions with a program | 2,918 |

Questions about products, tools, comparisons and process have written answers only, and almost every Behavioral question is written-only. Programs are language-neutral demos where the idea exists in every language (DSA, Low-Level Design, many CS Core and AI topics are in Java, Python, JavaScript, C++ and C#), otherwise a single language that fits: the language's own track, JavaScript for front end, and Python simulations for most back-end, AI, CS Core and DevOps ideas. Product behaviour (Kubernetes, AWS, React, Angular and similar) is modelled in plain code, never run against the real product.

## File format

```json
{"interview": [
  {"code": {"title": "…", "java": "…", "python": "…", "js": "…", "cpp": "…", "csharp": "…"},
   "followUps": ["<p>Answer 1</p>", "<p>Answer 2</p>"]},
  {"code": null, "followUps": ["<p>…</p>"]}
]}
```

- One entry per interview question, in the module's order; one answer per follow-up question, in order.
- `code` is `null` or has a `title` plus any of `java`, `python`, `js`, `cpp`, `csharp`. DSA and Low-Level Design need all five; other tracks need at least one.
- Answers are HTML with 150–900 characters of text from the allowed tags (`p b i em strong code pre sub sup br ul ol li table thead tbody tr th td span blockquote`).
- Programs are complete, print their result, and are 15–60 lines (hard limit 80). C# must compile with Mono `mcs` (C# 7).

## Checking

`node tools/answers-check.js` validates counts, lengths and HTML for every module (CI runs it). Add `--require` to demand a file for every module and `--run <ids…>` to compile and run the programs of those modules (javac, python3, node, g++ -std=c++20, mcs + mono). The check proves structure and that programs run; it does not verify what an answer says about external products.

## How it reaches the learner

`tools/build.js` reads `data/answers/*.json` and injects `window.IM_ANSWERS` into each module bundle; `src/engine.js` renders programs (`ivProgram`) and follow-ups (`ivFollowUps`). The same data feeds `handbook.html`, which follows the learner's route and language, offers a level filter, search and a rapid-fire mode.

## Review status (2026-11-15)

After the answers were written, every follow-up answer was re-read for claims about external products (versions, defaults, limits, prices, named cases). About 400 such claims were screened. A minority were confirmed against vendor documentation, papers or release notes (for example Alembic, pgvector, the MCP specification, the Argo CD and AWS docs, the GitHub changelog); most were confirmed only from the reviewer's own knowledge, so they are less certain. About 40 sentences were corrected or softened: wrong or outdated statements were fixed, and precise figures that could not be confirmed were replaced by cautious wording. Treat product-specific numbers in the answers as a study aid and check the vendor documentation before relying on them. Programs model ideas in plain code and never run the real products.
