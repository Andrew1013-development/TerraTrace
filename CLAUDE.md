# Case File

Guided web app for NASA Space Apps 2026, challenge "Be An Earth System Trend Detective!". Takes a student from a question about the Earth to an honest, plain-language verdict on whether a variable is changing in a chosen place.

## Read this, in this order

1. The task you were given, in `IMPLEMENTATION.md`, and its card in `TASKS.md`.
2. `ARCHITECTURE.md`: section 2, plus the sections your task names. Every signature, formula, message and screen is defined there. Do not invent your own.
3. `DESIGN.md`, only if a question is still open.

## Commands

- Test one area: `npx vitest run src/stats`
- All tests: `npx vitest run && pytest scripts -v`
- Build and type check: `npm run build`

## How to work on a task

1. Logic tasks: commit the stub with the final signatures first.
2. Write the failing tests from the plan, then the code, then run the tests.
3. Change only the files the task lists.
4. After two failed attempts on the same problem, stop and tell the developer. Do not try a third approach.
5. If a test in the plan looks wrong, stop and say so. Do not rewrite the test to pass.

## Ownership

- Dev A: `.github/`, `scripts/`, `public/data/`, `src/data/`, `src/clues/`
- Dev B: `src/types.ts`, `src/fixtures/`, `src/stats/`, `src/verdict/`, `src/place/`, `scripts/make_stats_fixtures.py`, lead text, `README.md`, `SOURCES.md`, `AI_USE.md`
- Dev C: `src/App.tsx`, `src/ui/`, `src/styles/`, `index.html`, and every review and merge

Never edit another owner's files. Report the problem to the developer instead.

Dev C tests the whole app and sends a defect report to the owner of the faulty folder, in the format in the plan. When you receive one: write a failing test that reproduces it, then fix it, in a new PR.

## Rules that must not break

- Dependencies point one way: `ui` imports the other folders; logic folders import only `src/types.ts`.
- Logic folders are pure: no `fetch`, no DOM, no clock, no randomness. UI components hold no data or statistics logic.
- `src/types.ts` and the signatures in architecture section 4 change only through Dev C.
- Significance level is 0.05. No verdict below 120 non-missing months.
- Dates are `"YYYY-MM"`. Missing values are `null`, never a fill value.
- Every chart and verdict names its source. One series uses one product version.
- No AI model calls at runtime. A developer checks AI-drafted definitions, tags, leads and wording, and every lead has a `sourceUrl`.
- Acknowledge AI-generated code in `README.md` and `AI_USE.md`. No NASA logos in generated content.
- Never edit stats fixtures to make a test pass. Find the cause.
- Report what the data shows, even when it spoils a demo.
- No new dependencies without Dev C's agreement.

## Keep out

Backend, database, accounts, API keys, runtime AI calls, maps, user-drawn regions, non-linear trends, router, state library, CSS framework. Don't add anything the current task doesn't need.

## Before opening a PR

- The task's tests and `npm run build` pass.
- UI changes work by keyboard and at 375 px wide.
- `AI_USE.md` has a line for this work, and `SOURCES.md` lists any new source.
- After feature freeze at H13, only bug fixes and polish.
