# Review of the 232 existing lesson videos

Reviewed 2026-10-21 against main commit `34f3d546fbb6276380bc7fa4ff59a6f9ce2837ee`.

- 232 populated mappings: 203 DSA and 29 Java.
- 79 video IDs replaced; 153 retained after topic review.
- 39 existing empty entries remain empty. This does not add videos to all 1,678 concepts.

The review compares lesson titles and intended scope against video titles, available publisher descriptions, chapters and presenter resource pages. It corrects mismatches such as a general graph traversal for Tarjan SCC, Ford–Fulkerson for Dinic, or an unrelated interview-pattern survey for language syntax. Chapter timestamps are used where available. Each entry includes a learner-facing coverage note, especially where a compound concept needs additional explanation in the lesson.

`data/video-review.json` records each concept, previous and selected IDs, decision, source and evidence. Full playback, transcripts, regional availability and every embed have not been independently verified; `playbackVerified` is false throughout. Availability can change after review.

Run `npm run test:videos` to validate mappings against the actual syllabus, review records, safe URLs, chapter ranges and curated-choice retention. Run `node tools/video-test.js <build-directory>` after web and mobile builds to verify the generated catalogs. The existing theme is unchanged.
