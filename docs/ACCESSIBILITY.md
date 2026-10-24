# Accessibility

## Automated check: `tools/a11y-test.js`

Serves the built `site/` on localhost, opens key pages in headless Chromium (Playwright) and runs
[axe-core](https://github.com/dequelabs/axe-core) with the WCAG 2.0/2.1 A and AA rule sets.

Pages checked, each in the dark and the light theme:

- home (`index.html`)
- a track page (`dsa.html`)
- a module with a visualizer (first `dsa` module)
- a module with practice questions and quizzes (third `dsa` module)
- the login / account page (`login.html`, skipped with a notice when the build has accounts off)
- the privacy page (`privacy.html`)

Serious and critical violations fail the run (exit code 1). Minor and moderate ones are printed as warnings.
The test needs `playwright` (or `/opt/node-tools/node_modules/playwright`) and the pinned `axe-core` devDependency.

### Run it

```
npm install
node tools/build.js site --strict
node tools/a11y-test.js            # or: node tools/a11y-test.js path/to/site
```

To include the login page, build with `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` set.
Set `CHROMIUM_PATH` to use a specific browser binary.

### What it cannot check

axe finds roughly a third of real-world problems. It cannot judge whether alt text, focus order, or live-region
announcements make sense. Use the manual checklists below for those.

## Manual screen-reader checklist

Test with NVDA + Firefox or Chrome (Windows), VoiceOver + Safari (macOS/iOS), or TalkBack + Chrome (Android).
Repeat in both themes and at 200% zoom.

### Visualizer (open any `dsa` module, for example Arrays)

1. Tab to the visualizer. Each control (Play, Step, Back, Reset, speed) is announced with a name and role, and the
   focus ring is visible.
2. Activate Step. The narration text (the "what is happening" line) is announced without moving focus.
3. Step through to the end. The finished state is announced, and Reset returns to the first step.
4. The code panel beside the visualizer can be focused with Tab and scrolled with the arrow keys; the current line
   is identifiable by more than colour (marker, bold, or text).
5. Colour is never the only carrier of meaning: compared, swapped and sorted items are also distinguishable in
   text or shape.
6. With "reduce motion" enabled in the OS, animation does not play automatically.
7. Code blocks with several languages: once you have chosen a code language (the "Your code language" picker or your
   path), only that language's tab shows, followed by an "Other languages" button. It is announced as a button with
   its expanded/collapsed state (`aria-expanded`); Enter or Space reveals the remaining language tabs after it in
   Tab order, and the same button collapses them again. Snippets with no language (text, SQL, shell) always show.

### Game or quiz (open a module's practice questions)

1. Each question is announced with its prompt, and choices are a labelled group (radio group or list of buttons).
2. Arrow keys or Tab move between choices; Space or Enter selects. No pointer is required.
3. After answering, the result ("Correct" or "Not quite" plus the explanation) is announced automatically.
4. Correct and wrong states differ by text or icon, not only green and red.
5. Progress, score and streak are available as text.
6. Focus is not lost or sent to the top of the page when the next question appears.
7. Any timer or movement can be paused, and no action depends on a time limit.

Record any failure with the page, the screen reader and browser, and the exact announcement heard.
