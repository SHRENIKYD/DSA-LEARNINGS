# Interview Mastery

A free, beginner-to-expert study site for product-company interviews. It covers 13 tracks and 194 modules:
DSA + Math, Java, Python, JavaScript/TypeScript, C++, SQL + DBMS, Low-Level Design, High-Level System Design, Frontend, Backend, GenAI & Working With AI (including MCP), CS Core (OS + Networks), and Behavioral & Career.

Every module has the same layout:
- 🎯 **Learning-path header**: goals, prerequisites and estimated hours.
- ☕ **Analogy first**: an everyday comparison, then a plain-English explanation.
- 🔍 **Clues in the question**: the phrases and constraints that point to each technique.
- 🎬 **Step-by-step visualizers** with a plain-English narrator, one on every topic.
- 📚 **Worked examples**.
- 🧩 **Guided problems**: brute force → "What would you do?" question → 3 progressive hints → full solution, dry run and complexity.
- 🟣 **Expert deep dives**.
- 🤖 **Working alongside AI**: how AI changes each topic and how to use it well.
- 📝 **Quiz** and 🎤 **interview Q&A bank**.
- 🏟 **Practice Arena** with 12–20 graded problems.

SQL snippets run live in the browser (sql.js), and JavaScript/Python snippets run in a sandbox.

See [docs/CURRICULUM.md](docs/CURRICULUM.md) for the full curriculum and learning paths.

## Run locally
```bash
node tools/build.js          # builds ./site
npx serve site               # or any static server (the SQL runner needs http, not file://)
```

## Project layout
| Path | What |
|---|---|
| `src/` | Engine (`engine.js`), styles, helpers, page templates, track/module registry (`tracks.js`) |
| `content/<track>/<id>.js` | One file per module (data + visualizer generators) |
| `tools/build.js` | Builds the static site into `site/` |
| `tools/validate.js` | Checks a module: structure, counts, HTML, visualizers, and that code compiles or runs (`--code`) |
| `tools/e2e.js` | Headless-browser smoke test of the built site |
| `docs/AUTHORING.md` | How to write a module |
| `vendor/` | sql.js (MIT) for the in-browser SQL runner |

## Deploy (GitHub Pages)
The `.github/workflows/pages.yml` workflow builds and deploys the site on every push.
One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
