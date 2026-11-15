# TerraTrace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static web app that guides students from a question about the Earth to an honest, plain-language verdict on whether a variable is changing in a chosen place.

**Architecture:** Static Vite and React front end on GitHub Pages, with no backend. Live POWER calls for any point, static JSON for curated regions, and all statistics computed in the browser. Logic lives in pure modules; the UI only renders their results.

**Tech Stack:** Vite, React, TypeScript, Vitest, React Testing Library, Observable Plot. Python, pytest, requests, numpy, scipy, pyMannKendall.

**Spec:** `docs/superpowers/specs/2026-11-04-terratrace-design.md`

**Architecture reference:** `docs/terratrace-architecture.md`. Every signature, formula, message and screen is defined there. Tasks below name the sections to read.

## Global Constraints

- Do not start any task before 9:00 AM ICT on November 14.
- Deadline: 23:59 ICT on November 15. Feature freeze at H13; all dev work done by H16. Hours are build hours, with H0 as the start.
- Follow the seven rules in architecture section 2.
- AI in the app is build-time only: no model calls at runtime. A dev checks every AI-drafted definition, tag, lead and verdict text.
- Acknowledge AI-generated code in `README.md` and `AI_USE.md`, one line per meaningful use. No NASA logos in generated content.
- Licence: Apache-2.0. Record every dataset, library and image with its licence in `SOURCES.md`.
- The 3 non-dev teammates own the demo, project page and submission. Devs supply the live link, facts and numbers.
- Significance level 0.05. No verdict below 120 non-missing months. Dates are `"YYYY-MM"`. Missing values are `null`.

## Workflow

### Roles

| Dev | Owns |
|---|---|
| Dev A | Repo, CI, deploy, data access, data files, clue engine |
| Dev B | Contract, fixtures, statistics, verdict, place helpers, lead text, project documents |
| Dev C | Every screen, app state and styling; review, integration testing and every merge |

Dev A and Dev B write the unit tests for their own code, because writing tests first keeps the code accurate. Dev C owns the merge gate, the `App` integration test and the whole-app test, and reports each fault back to the developer who owns the faulty part.

### Hours

| Dev A | h | Dev B | h | Dev C | h |
|---|---|---|---|---|---|
| A1 Repo, CI, deploy | 1 | B1 Contract and fixtures | 1 | C0 Kickoff and task cards | 1 |
| A2 `getSeries` | 3 | B2 Statistics | 5 | C1 Shell, state, styles | 2 |
| A3 Loaders, starter data | 1 | B3 Verdict | 3 | C2 Evidence and chart | 3 |
| A4 Clue engine | 3 | B4 Place helpers | 1 | C3 Case brief | 1 |
| A5 Regional data | 3 | B5 Leads | 1 | C4 Clues screen | 2 |
| A6 Full catalog and tags | 1 | B6 Demo case choice | 1 | C5 Place picker | 1 |
| A7 Demo cases, snapshots | 1 | B7 Methods and `AI_USE.md` | 1 | C6 Verdict screen | 1 |
| A8 Device test | 1 | B8 `SOURCES.md`, `README.md` | 1 | C7 Second witness | 1 |
| Buffer | 2 | Buffer | 2 | C8 Polish and accessibility | 1 |
| | | | | Review, merge, gate checks | 3 |
| **Total** | **16** | **Total** | **16** | **Total** | **16** |

**Dev C has no buffer and is the bottleneck.** The 4 buffer hours of Dev A and Dev B exist to protect Dev C:
- When Dev C has more than 2 PRs waiting, Dev A and Dev B review each other's PRs in `data`, `clues`, `place` and docs. Dev C still presses merge. PRs touching `stats`, `verdict` or `src/types.ts` always wait for Dev C.
- Bugs Dev C finds in a logic folder go back to that folder's owner.
- C7 (second witness) starts only if C6 is merged by H12. Otherwise it is cut.

### Schedule and dependencies

| Hours | Dev A | Dev B | Dev C | Gate at the end |
|---|---|---|---|---|
| H0-H1 | A1 | B1 | C0 | Live URL shows a page; contract and fixtures in `main` |
| H1-H4 | A2 | B2 | C1, start C2 | Five placeholder screens click through on the live URL |
| H4-H8 | A3, A4 | B2, B3 | C2, C3 | A live POWER point shows a tested `TrendResult` on the Evidence screen |
| H8-H13 | A5, A6, A7 | B3, B4, B5, B6 | C4, C5, C6 | Both demo cases run from question to verdict |
| H13-H16 | A8, buffer | B7, B8, buffer | C8, C7 if on time | Tests and build pass; demo team has submitted |

| Task | Needs first | Unblocks |
|---|---|---|
| A2 | B1 | C2 wiring, H8 gate |
| A3 | A2 | Real files for every screen |
| A4 | B1 | C4 |
| A5 | A2 | A7, B6 |
| B2 | B1 | C2, B3, B6 |
| B3 | B2 stub | C6 |
| B4 | B1 | C5 |
| B6 | A5, B2 | A7 |
| C2 | B2 stub, fixtures | H8 gate |
| C4 | A4 | H13 gate |

Until a module lands, the UI builds against its stub and `src/fixtures/`.

### The loop for every task

1. Start the task with its card and the prompt below.
2. Commit the stub first (logic tasks), then write the failing tests, then the code.
3. Run the task's test command and `npm run build`.
4. Open a PR into `main` from a branch named `a/…`, `b/…` or `c/…`. Fill in the PR checklist.
5. Dev C reviews and merges. `main` deploys on its own.
6. Add a line to `AI_USE.md`. Add any new source to `SOURCES.md`.

**Prompt to start a task**

```text
Read CLAUDE.md. Do task <ID> from docs/superpowers/plans/2026-11-04-terratrace.md.
Read only these parts of docs/terratrace-architecture.md: section 2 and <sections the task names>.
Follow the task's steps in order: stub, failing tests, code, run the tests.
Change only the files the task lists. Do not change src/types.ts or any signature.
If a test in the plan looks wrong, or you fail twice on the same problem, stop and tell me.
```

**Task card:** every task has a card in `docs/terratrace-task-cards.md`: goal, done criteria, known traps and what not to do. Give the session its card along with the task.

### Merge gate

Dev C merges a PR only when all of these hold:

- [ ] CI is green: tests and `npm run build`
- [ ] Only the files the task lists have changed
- [ ] No signature or type differs from architecture section 4
- [ ] New logic has tests, written before the code
- [ ] No new dependency
- [ ] UI changes work by keyboard and at 375 px wide
- [ ] `AI_USE.md` and `SOURCES.md` are updated where needed

| Folder | Review depth |
|---|---|
| `src/stats/`, `src/verdict/`, `src/types.ts` | Read every line against architecture section 7 |
| `src/data/`, `src/clues/`, `src/place/`, `scripts/` | Read the tests and skim the code |
| `public/data/`, docs | Spot check; definitions and leads checked against their sources |

### Whole-app test and defect reports

Dev C tests the whole app on the live URL after every merge that changes behavior, and fully at each gate: both demo cases, one region case, one typed-coordinate case, and one failure case (network off). Dev C does not fix a fault in another owner's folder. Dev C reports it to the owner, who fixes it in a new PR.

**Finding the owner**

| Symptom | Likely folder | Owner |
|---|---|---|
| No data, wrong dates or values, failed load, wrong error kind | `src/data/`, `public/data/` | Dev A |
| Wrong question order, suspects not narrowing, a variable unreachable | `src/clues/` | Dev A |
| Wrong rate, p-value or interval; `NaN`; verdict on too little data | `src/stats/` | Dev B |
| Wrong verdict kind or wording, wrong hunch line | `src/verdict/` | Dev B |
| Coordinates wrongly accepted or rejected, wrong place name, wrong leads | `src/place/` | Dev B |
| Layout, focus, navigation, a result shown wrongly although the module returned it correctly | `src/ui/`, `src/App.tsx` | Dev C |

To tell a logic fault from a display fault, Dev C calls the module's function with the same input in a test or the console. A wrong return value goes to the module's owner. A correct return value shown wrongly stays with Dev C.

**Report format,** one per fault, posted as a GitHub issue assigned to the owner and said aloud:

```text
Title:    <module>: <what is wrong, in one line>
Owner:    Dev A | Dev B
Severity: blocks a gate | wrong result | cosmetic
Steps:    1. ... 2. ... (variable, place, toggle state)
Expected: <what architecture section N says>
Actual:   <what happened, with the exact value or message>
Evidence: <function call and return value, or screenshot, or failing test name>
Commit:   <short hash on main>
```

**Rules**
- The owner first writes a failing test that reproduces the fault, then fixes it.
- A fault that blocks a gate goes ahead of the owner's current task. Others wait for the task to finish.
- Dev C re-tests on the live URL after the fix is merged, and only then closes the issue.
- A fault from a wrong contract or architecture rule is Dev C's to resolve.


## Review Focus

1. **All-fill point** (ocean or polar point where POWER returns only fill values): show "not enough data", never a verdict. Test in A2.
2. **Constant series or all ties:** variance is 0; return `mkP` of 1 and verdict `none`, never `NaN`. Test in B2.
3. **Gaps in a series:** time positions come from dates, so gaps don't distort the slope. Test in B2.
4. **Typed coordinates out of range or not numbers:** reject with a clear message and never call POWER. Tests in B4 and C5.
5. **Regions-only variable with a custom point:** no data exists; offer the regions. Tests in A2 and C5.

---

## Dev A

### Task A1: Repo, CI and deploy (H0-H1)

**Files:** Vite `react-ts` scaffold, `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `LICENSE`, `SOURCES.md`, `AI_USE.md`, `README.md`, `CLAUDE.md` (copied from `docs/terratrace-CLAUDE.md`), `docs/`

**Read:** architecture section 3.

- [ ] **Step 1: Scaffold.** `npm create vite@latest . -- --template react-ts`. Add Vitest, React Testing Library, jsdom and Observable Plot. Pin exact versions. Set Vite `base` to the repo name. Turn on TypeScript `strict`.
- [ ] **Step 2: Add `ci.yml`** running `npm ci`, `npx vitest run` and `npm run build` on every pull request, and `deploy.yml` building and deploying to Pages on push to `main`.
- [ ] **Step 3: Verify.** Open the Pages URL. Expected: the page loads with no console errors. Open a test PR. Expected: CI runs and passes.
- [ ] **Step 4: Commit** `chore: scaffold, CI and deploy`.

### Task A2: `getSeries` and the POWER client (H1-H4)

**Files:** Create `src/data/index.ts`, `src/data/power-sample.json`. Test `src/data/getSeries.test.ts`.

**Read:** architecture sections 4.1, 4.2, 6 and 8.

- [ ] **Step 1: Commit the stub** with the section 4.2 signatures.
- [ ] **Step 2: Capture a real response.** Save a short `T2M` call to `src/data/power-sample.json`. Read it and record in the PR: the path to the monthly values, the fill value, whether a 13th annual key exists, and whether several parameters fit in one call. Write the tests to match the real response.
- [ ] **Step 3: Write the failing tests** with mocked `fetch`:

```ts
test("parses the captured POWER response into a Series with ascending YYYY-MM dates");
test("keeps only months 01-12");
test("maps the fill value to null");
test("HTTP 429 throws DataError kind rate-limit");
test("network failure throws DataError kind network");
test("any other HTTP error, or an unreadable body, throws DataError kind unavailable");
test("powerParameter null with a point place throws kind unavailable, with no fetch");
test("an all-fill response gives a Series with zero valid months");
test("the same request twice calls fetch once");
test("a failed request is not cached");
test("a region place fetches data/series/{variableId}/{regionId}.json under BASE_URL");
test("placeId is the region id, or point:{lat},{lon} with 2 decimals");
```

- [ ] **Step 4: Run** `npx vitest run src/data`. Expected: FAIL.
- [ ] **Step 5: Implement `getSeries` and `DataError`** with an in-memory `Map` of promises.
- [ ] **Step 6: Run the tests.** Expected: PASS.
- [ ] **Step 7: Commit** `feat: series access through POWER and static files`.

### Task A3: Loaders and starter data (H4-H5)

**Files:** Modify `src/data/index.ts`. Create `public/data/catalog.json`, `regions.json`, `leads.json`. Test `src/data/loaders.test.ts`.

**Read:** architecture sections 4.1, 4.2 and 6.

- [ ] **Step 1: Write the failing tests:** each loader fetches its file under `BASE_URL` and returns the parsed array; a failed fetch throws `DataError` kind `network`.
- [ ] **Step 2: Implement** `loadCatalog`, `loadRegions` and `loadLeads`.
- [ ] **Step 3: Write starter files:** a catalog with `T2M` and `PRECTOTCORR` (name, definition, unit and `startYear` taken from the captured response and POWER's own documentation), 3 regions, and an empty leads array.
- [ ] **Step 4: Run** `npx vitest run src/data`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: data loaders and starter catalog`.

### Task A4: Clue engine (H5-H8)

**Files:** Create `src/clues/index.ts`, `src/clues/questions.ts`. Test `src/clues/index.test.ts`.

**Read:** architecture sections 4.1, 4.3 and 7.3.

- [ ] **Step 1: Commit the stub** with the section 4.3 signatures.
- [ ] **Step 2: Write the failing tests,** using `sampleCatalog`:

```ts
test("narrow keeps only variables sharing a tag with the option");
test("liveOptions hides options that leave no suspects");
test("nextQuestion returns null with one suspect");
test("nextQuestion picks the smallest worst-case group on a 4-variable fixture");
test("nextQuestion never repeats an asked question");
test("nextQuestion breaks ties by question order");
test("every question id is unique and every option has at least one tag");
```

- [ ] **Step 3: Run** `npx vitest run src/clues`. Expected: FAIL.
- [ ] **Step 4: Implement the engine,** then write 4 to 6 plain-language questions in `questions.ts`.
- [ ] **Step 5: Run the tests.** Expected: PASS.
- [ ] **Step 6: Commit** `feat: clue engine`.

### Task A5: Regional data (H8-H11)

**Files:** Create `scripts/precompute.py`, `scripts/test_precompute.py`, `scripts/requirements.txt` entries, `public/data/series/`. Modify `public/data/regions.json`.

**Read:** architecture sections 6 and 7.4.

**Produces:** `sample_points(bbox) -> list[tuple[float, float]]` (9 points), `weighted_mean(values, lats) -> float | None`, `region_series(variable, region) -> dict` matching `Series`.

- [ ] **Step 1: Write the failing tests:**

```python
def test_sample_points_gives_9_points_inside_the_bbox(): ...
def test_weighted_mean_weights_low_latitude_more(): ...
def test_weighted_mean_skips_missing_and_all_missing_gives_none(): ...
def test_region_series_has_equal_dates_and_values_lengths(): ...
def test_source_text_says_sampled_regional_mean_of_9_points(): ...
```

- [ ] **Step 2: Run** `pytest scripts/test_precompute.py -v`. Expected: FAIL.
- [ ] **Step 3: Implement the script.** Request every catalog parameter in one call per point if Task A2 showed that works. Pause between calls and back off after HTTP 429.
- [ ] **Step 4: Run the tests.** Expected: PASS.
- [ ] **Step 5: Write about 12 regions** in `regions.json`, including one Arctic region. Start the script, and check 3 output files by eye against a live point inside each region. If polar points return only fill values, move that region's bbox to where data exists and say so in the PR.
- [ ] **Step 6: H8 scope decision, recorded in the PR:** stay with POWER only, unless a product from Giovanni or AppEEARS was obtained and checked during buffer time.
- [ ] **Step 7: Commit** `feat: sampled regional series`.

### Task A6: Full catalog and tags (H11-H12)

**Files:** Modify `public/data/catalog.json`, `src/clues/questions.ts`. Test `src/data/catalog.test.ts`.

- [ ] **Step 1: Write the failing test:**

```ts
test("every variable has every field, a non-empty definition and at least one tag");
test("every variable has a tag from the first question");
test("every regions.json bbox has south < north and west < east");
test("every catalog and region pair has a series file");
test("every lead names an existing region and variable and has a sourceUrl");
test("every variable can end as the only suspect, or in a final list of at most 3");
test("some answer path leads to PRECTOTCORR");
```

- [ ] **Step 2: Add variables** up to about 10, each only after one live POWER call confirms the parameter name, unit and start year. Definitions may be AI-drafted, then checked against POWER's documentation.
- [ ] **Step 3: Rerun `precompute.py`** for new variables, then run `npx vitest run src/data/catalog.test.ts`. Expected: PASS.
- [ ] **Step 4: Commit** `feat: full catalog with tags`.

### Task A7: Demo cases and snapshots (H12-H13)

**Files:** Create `public/data/demo/`. Modify `src/data/index.ts`. Test `src/data/demoCases.test.ts`.

**Needs:** the two cases chosen in Task B6.

- [ ] **Step 1: Write the failing tests:** `demoCases` has exactly 2 entries naming existing variables and places; when POWER fails for a demo case that is a point place, `getSeries` returns the series from `data/demo/{id}.json`; a non-demo request still throws.
- [ ] **Step 2: Implement** `demoCases`. A demo case that is a point place also gets a snapshot file and the fallback; a region case needs neither, because its series is already a static file.
- [ ] **Step 3: Run** `npx vitest run src/data`. Expected: PASS.
- [ ] **Step 4: Commit** `feat: two demo cases with offline snapshots`.

### Task A8: Device test (H14-H15)

- [ ] **Step 1: On a phone and a second laptop,** open the live URL signed out. Run both demo cases, one region case and one typed-coordinate case. Expected: every step works with no console errors.
- [ ] **Step 2: Report** any failure to the owner of the folder and re-test after the fix is deployed.

---

## Dev B

### Task B1: Contract and fixtures (H0-H1)

**Files:** Create `src/types.ts`, `src/fixtures/index.ts`. Test `src/fixtures/index.test.ts`.

**Read:** architecture sections 4.1 and 4.7.

- [ ] **Step 1: Write `src/types.ts`** exactly as architecture section 4.1.
- [ ] **Step 2: Write the fixtures,** each labeled synthetic in a comment.
- [ ] **Step 3: Write and run the test:** `sampleSeries` has 180 dates and 180 values in ascending `YYYY-MM` order; every `sampleLeads` entry names a region and variable in the other fixtures. Run `npx vitest run src/fixtures`. Expected: PASS.
- [ ] **Step 4: Commit** `feat: shared contract and fixtures`. Dev C approves before merge.

### Task B2: Statistics (H1-H6)

**Files:** Create `scripts/make_stats_fixtures.py`, `scripts/requirements.txt`, `src/stats/fixtures.json`, `src/stats/index.ts`. Test `src/stats/index.test.ts`.

**Read:** architecture sections 4.5 and 7.1.

- [ ] **Step 1: Commit the stub** with the section 4.5 signatures.
- [ ] **Step 2: Verify `pyMannKendall`'s API** with `pip install -r scripts/requirements.txt` and `python -c "import pymannkendall as mk; help(mk.original_test); help(mk.seasonal_test)"`. Expected: both exist. Adjust Step 3 to the real signatures and result fields.
- [ ] **Step 3: Write `scripts/make_stats_fixtures.py`.** With seeded NumPy data, generate four 240-month series: trend plus seasonal cycle, seasonal cycle only, strong autocorrelation, and the first series rounded to 1 decimal so that it has ties. For each, write `y`, `original_p` and `original_slope` from `original_test`, `seasonal_p` from `seasonal_test(y, period=12)`, and `ols_ci` from `scipy.stats.linregress` as slope ± 1.98 × stderr. Run it.
- [ ] **Step 4: Write the failing tests:**

```ts
test.each(fixtures)("matches pyMannKendall: %s", (f) => {
  const t = f.y.map((_, i) => i);
  const months = f.y.map((_, i) => i % 12);
  expect(mannKendallP(f.y)).toBeCloseTo(f.original_p, 3);
  expect(seasonalMannKendallP(f.y, months)).toBeCloseTo(f.seasonal_p, 3);
  expect(senSlopePerMonth(t, f.y)).toBeCloseTo(f.original_slope, 6);
  const [lo, hi] = olsSlopeCi(t, f.y);
  expect(lo).toBeCloseTo(f.ols_ci[0], 6);
  expect(hi).toBeCloseTo(f.ols_ci[1], 6);
});
test("hand-checked: y=[1,2,3,4,5] gives p close to 0.0275");
test("monthIndex('2000-01') is 24000 and '2000-12' is 24011");
test("constant series: mkP is 1 and the interval is [0, 0]");
test("ties are corrected: a series with repeated values matches its fixture");
test("gap keeps time positions: y = 2t with 24 middle months null gives slope 2 per month");
test("countValid ignores nulls");
test("analyze returns null at 119 valid months and a result at 120");
test("analyze(false) uses plain Mann-Kendall; analyze(true) uses seasonal");
test("analyze reports the slope and interval per decade, 120 times the monthly values");
test("deseasonalize turns a pure seasonal cycle into values near 0 and keeps nulls");
```

- [ ] **Step 5: Run** `npx vitest run src/stats`. Expected: FAIL.
- [ ] **Step 6: Implement `src/stats/index.ts`** from architecture section 7.1.
- [ ] **Step 7: Run the tests.** Expected: PASS. If a fixture disagrees, find the cause before anything else, and never edit the fixture.
- [ ] **Step 8: Commit** `feat: trend statistics checked against pyMannKendall`. Dev C reviews every line.

### Task B3: Verdict (H6-H9)

**Files:** Create `src/verdict/index.ts`. Test `src/verdict/index.test.ts`.

**Read:** architecture sections 4.6 and 7.2.

- [ ] **Step 1: Commit the stub** with the section 4.6 signatures.
- [ ] **Step 2: Write the failing tests:**

```ts
const r = (mkP: number, ci95: [number, number], slopePerDecade = ci95[0]) =>
  ({ n: 240, mkP, ci95, slopePerDecade, deseasonalized: true });
test("mkP .01, CI [.1,.3] gives rise");
test("mkP .01, CI [-.3,-.1] with a negative slope gives fall");
test("mkP .01, CI [-.1,.3] gives mixed");
test("mkP .2, CI [.1,.3] gives mixed");
test("mkP .2, CI [-.1,.3] gives none");
test("mkP exactly .05 is not significant");
test("an interval touching 0 does not exclude 0");
test("significant, but the slope's sign and the interval's side disagree, gives mixed");
test("significant with a slope of exactly 0 gives mixed");
test("each kind produces exactly the wording in architecture section 7.2");
test("the rate has 2 significant figures and is never in exponent form");
test("every verdict carries the caveat text");
test("hunchLine: the three cases in section 7.2");
test("oppositeDirections is true only for rise beside fall");
```

- [ ] **Step 3: Run** `npx vitest run src/verdict`. Expected: FAIL.
- [ ] **Step 4: Implement.**
- [ ] **Step 5: Run the tests.** Expected: PASS.
- [ ] **Step 6: Commit** `feat: verdict rule and wording`. Dev C reviews every line.

### Task B4: Place helpers (H9-H10)

**Files:** Create `src/place/index.ts`. Test `src/place/index.test.ts`.

**Read:** architecture sections 4.4 and 8.

- [ ] **Step 1: Commit the stub.**
- [ ] **Step 2: Write the failing tests:**

```ts
test('parsePoint("91","0"), ("0","181"), ("","") and ("abc","1") are null');
test('parsePoint("-33.9","151.2") is a point place');
test("parsePoint accepts the edges: 90, -90, 180, -180");
test('parsePoint accepts a comma as the decimal mark: ("10,5","106,7")');
test('parsePoint rejects "12abc", "Infinity" and text that is only spaces');
test("placeName gives the region name, or the coordinates to 2 decimals for a point");
test("leadsFor returns only leads matching both the region and the variable");
```

- [ ] **Step 3: Run** `npx vitest run src/place`. Expected: FAIL. Implement. Run again. Expected: PASS.
- [ ] **Step 4: Commit** `feat: place helpers`.

### Task B5: Leads (H10-H11)

**Files:** Modify `public/data/leads.json`.

- [ ] **Step 1: Draft 1 or 2 leads per region with Claude,** each one sentence on what may be worth checking there and why.
- [ ] **Step 2: Open every `sourceUrl` and confirm it supports the lead.** Prefer NASA and space agency pages. Delete any lead that can't be sourced.
- [ ] **Step 3: Run** `npx vitest run src/data/catalog.test.ts` once Task A6 has added it. Expected: PASS.
- [ ] **Step 4: Add the sources to `SOURCES.md` and commit** `feat: sourced region leads`.

### Task B6: Demo case choice (H11-H12)

- [ ] **Step 1: Run `analyze` across every catalog variable and region,** in a small script or test, and print the verdict kind for both toggle states.
- [ ] **Step 2: Choose case 1:** precipitation in the Arctic region, reported as the data shows. **Choose case 2:** one where the verdict differs between toggle states. Record whether any region pair gives `rise` beside `fall` for one variable, for the demo team.
- [ ] **Step 3: Check both cases in Python** with `pyMannKendall`. Expected: p-values match the app to 3 decimals.
- [ ] **Step 4: Give Dev A the two cases** for Task A7, and the demo team the verdicts.

### Task B7: Methods text and `AI_USE.md` (H13-H14)

- [ ] **Step 1: Write a short methods section in `README.md`:** the three checks, the verdict rule, the 120-month minimum, one test result against `pyMannKendall`, and the limitations.
- [ ] **Step 2: Complete `AI_USE.md`** from all three developers' notes, and hand both to the demo team.

### Task B8: `SOURCES.md` and `README.md` (H14-H15)

- [ ] **Step 1: Complete `SOURCES.md`:** every dataset with its product name, every library with its licence, every lead source.
- [ ] **Step 2: Finish `README.md`:** what the app does, the live link, how to run it, and the acknowledgment of AI-generated code.
- [ ] **Step 3: Commit** `docs: sources, methods and AI use`.

---

## Dev C

### Task C0: Kickoff and task cards (H0-H1)

- [ ] **Step 1: Reread the task cards** and correct anything the first hour has shown to be wrong.
- [ ] **Step 2: Review and merge B1 and A1.**

### Task C1: Shell, state and styles (H1-H3)

**Files:** Create `src/App.tsx`, `src/ui/Clues.tsx`, `PlacePicker.tsx`, `CaseBrief.tsx`, `Evidence.tsx`, `VerdictView.tsx`, `src/styles/app.css`. Test `src/App.test.tsx`.

**Read:** architecture sections 5 and 9.

- [ ] **Step 1: Write the failing test** `walks clues, scene, brief, evidence, verdict and back to clues`, asserting each screen's `h1` and that focus moves to it.
- [ ] **Step 2: Run** `npx vitest run src/App.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** the reducer from section 5 and five placeholder screens on fixtures, with the style tokens.
- [ ] **Step 4: Run the test.** Expected: PASS. Check the live URL.
- [ ] **Step 5: Commit** `feat: app shell and state`.

### Task C2: Evidence and chart (H3-H6)

**Files:** Modify `src/ui/Evidence.tsx`, `src/App.tsx`. Create `src/ui/Chart.tsx`. Test `src/ui/Evidence.test.tsx`.

**Read:** architecture sections 4.5, 8 and 9.

- [ ] **Step 1: Write the failing tests:**

```ts
test("the toggle is a labeled checkbox, on by default");
test("turning the toggle off calls analyze with false and shows the new p-value");
test("rate, p-value and interval appear as text");
test("the source line is visible");
test("loading shows a status message; an error shows the DataError message from section 8");
test("fewer than 120 valid months shows the not-enough-data message with the count");
test("a late response for an old selection is ignored");
```

- [ ] **Step 2: Run** `npx vitest run src/ui/Evidence`. Expected: FAIL.
- [ ] **Step 3: Implement** on `sampleSeries` and `sampleResult`, then wire `getSeries` and `analyze` when they land. If Plot fails under jsdom, mock `Chart` in this test and test `Chart` by its accessible label.
- [ ] **Step 4: Run the tests.** Expected: PASS. Check the H8 gate on the live URL with a real point.
- [ ] **Step 5: Commit** `feat: evidence screen and chart`.

### Task C3: Case brief (H6-H7)

**Files:** Modify `src/ui/CaseBrief.tsx`. Test `src/ui/CaseBrief.test.tsx`.

- [ ] **Step 1: Write the failing tests:**

```ts
test("shows the sentence from architecture section 9 with the name, place and start year");
test("the hunch is a labeled radio group: rising, falling, no change");
test("the confirm button is disabled until a hunch is chosen");
test("confirm passes the chosen hunch; Change calls onChange");
```

- [ ] **Step 2: Run, implement, run.** Expected: FAIL, then PASS.
- [ ] **Step 3: Commit** `feat: case brief and hunch`.

### Task C4: Clues screen (H8-H10)

**Files:** Modify `src/ui/Clues.tsx`, `src/App.tsx`. Test `src/ui/Clues.test.tsx`.

**Read:** architecture sections 4.3 and 9.

- [ ] **Step 1: Write the failing tests,** with `sampleCatalog`:

```ts
test("shows one question at a time, with only its live options");
test("answering narrows the suspect list and updates the count");
test("each suspect shows its definition");
test("one suspect left is shown with its definition and a Continue button that calls onVariable");
test("when no question can split further, the suspects are buttons");
test("each solved case button calls onDemo with that case");
```

- [ ] **Step 2: Run, implement, run.** Expected: FAIL, then PASS.
- [ ] **Step 3: Commit** `feat: clues screen`.

### Task C5: Place picker (H10-H11)

**Files:** Modify `src/ui/PlacePicker.tsx`. Test `src/ui/PlacePicker.test.tsx`.

- [ ] **Step 1: Write the failing tests:**

```ts
test("choosing a region calls onPick with a region place");
test("valid typed coordinates call onPick with a point place");
test("invalid coordinates show the section 8 message and do not call onPick");
test("a regions-only variable hides the coordinate inputs");
test("a region's leads for this variable appear, each with a source link");
test("a region with no leads shows no leads section");
```

- [ ] **Step 2: Run, implement, run.** Expected: FAIL, then PASS.
- [ ] **Step 3: Commit** `feat: place picker and leads`.

### Task C6: Verdict screen (H11-H12)

**Files:** Modify `src/ui/VerdictView.tsx`. Test `src/ui/VerdictView.test.tsx`.

- [ ] **Step 1: Write the failing tests:**

```ts
test("shows the verdict text, the caveat and the hunch line");
test("the verdict kind appears as a word, not only as a color");
test("a null result shows the not-enough-data message");
test("Open a new case calls onRestart");
```

- [ ] **Step 2: Run, implement, run.** Expected: FAIL, then PASS. Check the H13 gate: both demo cases run from question to verdict on the live URL.
- [ ] **Step 3: Commit** `feat: verdict screen`.

### Task C7: Second witness (H12-H13; only if C6 is merged by H12)

**Files:** Modify `src/ui/VerdictView.tsx`.

- [ ] **Step 1: Write the failing tests:**

```ts
test("choosing a region loads its series with the same variable and toggle state");
test("both cards name their place and source");
test("rise beside fall shows the opposite-directions line");
test("an error on the second region shows a message and keeps the first card");
```

- [ ] **Step 2: Run, implement, run.** Expected: FAIL, then PASS. No second chart.
- [ ] **Step 3: Commit** `feat: second witness comparison`.

### Task C8: Polish and accessibility (H13-H14)

- [ ] **Step 1: At 375 px wide,** check every screen. Expected: no horizontal scroll and nothing cut off.
- [ ] **Step 2: With the keyboard only,** run a full case. Expected: every control is reachable, focus is visible and moves to each new heading.
- [ ] **Step 3: Check contrast** of text and controls. Expected: at least 4.5 to 1.
- [ ] **Step 4: Commit** `fix: polish and accessibility`.

---

## Final check (H15-H16, all)

- [ ] Run `npx vitest run && pytest scripts -v && npm run build`. Expected: all pass.
- [ ] Dev C runs both demo cases on the live URL, signed out.
- [ ] The demo team confirms the submission shows as submitted, and every link opens in a private window.
