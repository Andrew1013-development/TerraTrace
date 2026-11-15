# AI use

One line per meaningful use of AI tools. No AI model runs in the app.
| When | Who | Tool | What it did | Checked by |
|---|---|---|---|---|
| Before the event | Team | Claude | Helped research and summarize the challenges, and helped draft the design, architecture, plan and task cards for TerraTrace. | Team |
| Task A1 | Dev A | Claude Code | Generated the project scaffold configuration, CI and deploy workflows, `.gitignore`, placeholder page, toolchain test and starter documents | Dev A |
| Task B1 | Dev B | Claude Code | Wrote the shared types (copied from ARCHITECTURE.md section 4.1), the synthetic fixtures and their test | Dev B |
| Tasks C1 and frontend design | Dev C | Claude Code | Researched dashboard references on Mobbin and the Space Apps brand guide, drafted the frontend design and plan, and wrote the app reducer, placeholder screens, dashboard shell, brand styles, primary button with star burst, and their tests | Dev C |
| Task A2 | Dev A | Claude Code | Captured the POWER sample, wrote the `getSeries` tests and implemented `getSeries` and `DataError` | Dev A |
| Task A3 | Dev A | Claude Code | Wrote the loader tests and loaders, and drafted the starter catalog definitions (checked against live POWER calls) and regions | Dev A |
| Task A4 | Dev A | Claude Code | Wrote the clue engine tests, the engine and the first draft of the four questions | Dev A |
| Task A5 | Dev A | Claude Code | Wrote the precompute tests and script, and drafted the 12 region boxes | Dev A |
| Task B5 | Dev B | Claude Code | Searched NASA pages, drafted the region leads in public/data/leads.json and opened every source page to confirm it supports its lead; listed them in SOURCES.md | Claude Code opened each source; Dev B to confirm |
| Task B2 | Dev B | Claude Code | Wrote scripts/make_stats_fixtures.py, the statistics stub, tests and implementation in src/stats/ from ARCHITECTURE.md section 7.1 | Dev B, then Dev C line by line |
| Task B4 | Dev B | Claude Code | Wrote the place helpers stub, tests and implementation in src/place/ from ARCHITECTURE.md sections 4.4 and 8 | Dev B |
| Tasks B7 and B8 | Dev B | Claude Code | Drafted the methods section in README.md from ARCHITECTURE.md section 7 and the real test results, and corrected the "Before the event" line to match DESIGN.md section 8; later updated the data paragraph and limits for the CERES SYN1deg variables added in A6 (#24). For B8, added the Python libraries to SOURCES.md with licences read from the installed packages, and the script steps to README.md | Dev B to confirm |
| Task A7 | Dev A | Claude Code | Wrote the demo case tests and filled `demoCases` with the two cases chosen in Task B6 | Dev A |
| Pipeline test | Dev A | Claude Code | Designed and wrote the backend pipeline test, the shared test fetch helper and the deploy test step, and mutation-checked each stage | Dev A |
| Task A6 | Dev A | Claude Code | Surveyed POWER parameters by live call, drafted the 8 new definitions and tags, wrote the catalog tests and reran the precompute script | Dev A |
| Task B3 | Dev B | Claude Code | Wrote the verdict stub, tests and implementation in src/verdict/ from ARCHITECTURE.md section 7.2; wording copied exactly | Dev B, then Dev C line by line |
| Tasks C2 and C3 | Dev C | Claude Code | Wrote the Evidence screen, chart and their tests, the case brief and its tests, and switched the app from fixtures to the real data, stats and place modules | Dev C |
| Task C4 | Dev C | Claude Code | Wrote the clues screen and its tests on top of the A4 engine, and the clues layout | Dev C |
| Task C5 | Dev C | Claude Code | Wrote the place picker, coordinate form and leads display with their tests, and the scene layout | Dev C |
| Task C6 | Dev C | Claude Code | Wrote the verdict screen and its tests on top of the B3 verdict module, and the verdict card style | Dev C |
| Pipeline test, verdict stage | Dev A | Claude Code | Added the verdict stage and the demo-case verdict kinds to the pipeline test, and mutation-checked them | Dev A |
| Task C8 | Dev C | Claude Code | Ran the phone, contrast, keyboard and 200% zoom checks with a scripted audit, and fixed focus after a clue answer (test first) | Dev C |
| Task C7 | Dev C | Claude Code | Wrote the second-witness comparison and its tests on the verdict screen | Dev C |
| Issue 22 | Dev A | Claude Code | Wrote the failing tests, made region series name their product and version, and reran the precompute script from cache | Dev A |
| Issue 23 | Dev A | Claude Code | Wrote the failing test and renamed TS to "surface temperature" to match its land-or-sea definition | Dev A |
| Region names | Dev A | Claude Code | Applied Dev C's region names from issue 17 and added pipeline tests for them and the Tibet demo sentences | Dev A |
| Agent guides | Dev A | Claude Code | Wrote GEMINI.md (Antigravity, integration reviewer) and AGENTS.md (Codex, back-end reviewer) from the architecture and the facts verified during the build | Dev A |
| Back-end defects, Dev A | Dev A | Claude Code | Wrote failing tests and fixes for D2, D4, D5, D7, D8 (data half), D10, D13 and D14 from the definitive defect report | Dev A |
| Back-end defects, Dev B | Dev A | Claude Code | Wrote tests and fixes for D3, D8 (place half), D9, D11, D12 and D14 (fixture script) in Dev B's folders, for Dev B and Dev C to review | Dev B, Dev C |
| Back-end defects, Dev C | Dev A | Claude Code | Proposed fixes for D1, D15, D16 and D17 (wording, formatter, point names, architecture text) for Dev C to accept, and ran a 50-case live-path test against an independent Python recomputation | Dev C |
| Live POWER check | Dev A | Claude Code | Wrote the manual live check (8 points against golden values from the independent recomputation), its Vitest config and the manual workflow | Dev A |
| Definitive defect report, 2026-11-15 | Dev A | Claude Code | Compiled the three review reports into DEFECT_REPORT.md, reproduced all 18 defects with failing tests, and wrote the fixes in src/, scripts/, .github/, vite.config.ts and the matching architecture text, for each owner and Dev C to review | Dev A, Dev B, Dev C |
| Custom period, back end | Dev A | Claude Code | Planned the custom-period feature with Dev A (issue 46), and wrote the src/stats and src/verdict stubs, tests and implementation | Dev A, Dev C |
| UX pass | Dev C | Claude Code | Built the navigable rail with Previous/Next, the clue illustrations and their animations, the Scene world map with grid-cell highlight, and the tighter layouts with icons, with their tests; prepared the Natural Earth land file | Dev C |
| Question wording | Dev C, for Dev A | Claude Code | Wrote questionText and its tests in src/clues, and put the live-choices placeholder in three questions so the text names only the choices shown | Dev C |
| Scene map detail | Dev C | Claude Code | Coloured the world map, drew real region outlines inside dashed sampled boxes, added the typed-point pin, regionAt and countryAt, and the script that makes the region and country files, with their tests | Dev C |
| Scene globe | Dev C | Claude Code | Replaced the flat map with a three.js globe on the NASA Blue Marble image, with dashed real region outlines, the red highlight, the pin, click-to-pick, and full Natural Earth outlines for whole named regions, with their tests | Dev C |
| Globe zoom | Dev C | Claude Code | Added wheel, pinch and button zoom, and the automatic centre-and-fit for each region or pin (fitView), with its tests | Dev C |
| Custom period, front end | Dev C | Claude Code | Built the period state, the years picker, the larger chart with titled axes and the statistics list on the Evidence screen, and the two verdicts on the Verdict screen (issue 46), with their tests | Dev C |
| Audit fixes, front end | Dev C | Claude Code | Fixed the front-end findings of the whole-repo audit (issue 52): the hunch saved when chosen, no "at sea" name without the country file, a globe drawn only on change, dead styles removed, a lazy chart and a smaller globe image on phones, with their tests | Dev C |
| Audit leftovers (issue 52, A2 to A4) | Dev A | Claude Code | Moved land.json from public/data to scripts/ and checked that make_map_shapes.py writes identical files, deleted a stale comment, pinned three and @types/three, and moved the four defect reports to docs/ | Dev A, Dev C |
| regionAt by shape (issue 52, A1) | Dev A | Claude Code | Wrote the failing tests against the real region-shapes.json, then made regionAt test a region's real outline when shapes are given, and updated architecture section 4.4 | Dev A, Dev C |
| Pick by outline, front end | Dev C | Claude Code | Passed the region outlines to regionAt in the picker and the globe click, and reworded the captions to say the data is a 9-point sample inside the region (issue 52, finding 1), with their tests | Dev C |
| Issue 57 fixes | Dev C | Claude Code | Labelled the interval "(straight-line fit)" and reworded README check 3; added isConstant and constantText so a record that never changes says there is nothing to test on the Evidence and Verdict screens, with their tests | Dev C |
| Issue 60 fixes | Dev C | Claude Code | Reviewed and applied the tested diff Dev B attached to issue 60 (a longer wait limit for slow first test runs; Next and the rail wait on the scene while the map shows an unconfirmed place), and checked it in the browser | Dev B, Dev C |
| Issue 62 fixes | Dev C | Claude Code | Applied the six stylesheet and clue-art fixes from issue 62 (clue layout at 900 to 1199 px, rail on short windows, gust lines with reduce motion, seamless wave, dead and duplicate rules, the red contrast note), and checked each in the browser against the live site | Dev C |
| Faster Sen's slope median | Dev A | Claude Code | Profiled the Evidence screen on the live site, then replaced the full sort in the Sen's slope median with quickselect on a Float64Array, with tests that it matches a full-sort median exactly | Dev A, Dev B, Dev C |
| Globe gestures | Dev C | Claude Code | Planned the mouse, touchpad and touch-screen gestures with Dev C, built the invisible ring that takes them, the wheel handling (wheelKind, ringRadius) and Safari pinch, with their tests | Dev C |
| Fixed side board | Dev C | Claude Code | Made the tablet and desktop layout a window-height frame where only the main panel scrolls, with a compact side board for short and narrow screens, and measured it at nine screen sizes | Dev C |
| Rename to TerraTrace | Dev C | Claude Code | Suggested names with the team, then replaced the placeholder name "Case File" with TerraTrace in the app, the package name, its setup test and every doc | Dev C |
