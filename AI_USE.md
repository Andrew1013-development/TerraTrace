# AI use

One line per meaningful use of AI tools. No AI model runs in the app.

| When | Who | Tool | What it did | Checked by |
|---|---|---|---|---|
| Before the event | Team | Claude | Helped research and rank the candidate challenges, proposed the base concept for Case File, and helped draft the design, architecture, plan and task cards. The Project Submission Guide says SI should not be used to come up with the idea; how to describe this is still an open question for the organizers (DESIGN.md sections 2 and 8) | Team |
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
| Task B7 | Dev B | Claude Code | Drafted the methods section in README.md from ARCHITECTURE.md section 7 and the real test results, and corrected the "Before the event" line to match DESIGN.md section 8; later updated the data paragraph and limits for the CERES SYN1deg variables added in A6 (#24) | Dev B to confirm |
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
