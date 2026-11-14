# Case File: task cards

A card for every task. The six highest-risk tasks (B2, B3, A2, A4, A5 and C2) come first with full cards; the rest follow as shorter cards. Give a session its card together with the task in the plan. The plan holds the steps and the full test list; the architecture holds the signatures and formulas. A card adds the goal, the limits and the traps.

Written before the build. Traps marked "verify" are expectations, not confirmed facts.

---

## Card B2: Statistics

**Owner:** Dev B. **Hours:** H1-H6. **Review:** Dev C, line by line.

**Goal:** `src/stats/index.ts` gives the same Mann-Kendall p-values, Sen's slope and OLS interval as `pyMannKendall` and `scipy` on four generated series, and never returns `NaN`.

**Read:** plan Task B2; architecture sections 2, 4.5 and 7.1.

**Files you may change**
- `src/stats/index.ts`, `src/stats/index.test.ts`, `src/stats/fixtures.json`
- `scripts/make_stats_fixtures.py`, `scripts/requirements.txt`

**Signatures:** exactly architecture section 4.5. Private helpers are fine; do not export them.

**Done when**
- Every test in plan Task B2 Step 4 passes with `npx vitest run src/stats`.
- `npm run build` passes.
- `fixtures.json` is the unedited output of the script, with a fixed seed.

**Traps**
1. **Numeric sort.** JavaScript's default `sort()` compares as text. Use `sort((a, b) => a - b)` for the Sen median, or the slope is silently wrong.
2. **Median of an even count** is the mean of the two middle values.
3. **Tie groups** are sets of exactly equal values. In the seasonal test, count ties inside each calendar month separately.
4. **Continuity correction:** subtract 1 from a positive `S`, add 1 to a negative `S`, and use `Z = 0` when `S` is 0.
5. **Zero variance** (constant series) must return `p = 1`, not a division by zero.
6. **Center `t` before OLS.** `t` is about 24000, so subtract its mean first to keep precision.
7. **The OLS interval uses 1.98,** to match the fixture. Keep the `shortcut:` comment from the architecture.
8. **Calendar month comes from the date string,** not from the array index, because real series have gaps. Parse `"YYYY-MM"` by splitting the string. Do not use `Date`, which brings time zones in.
9. **Skip nulls before every calculation,** but keep each remaining point's true `t`.
10. **Deseasonalize:** a month's mean uses only its non-missing values, and missing stays missing.
11. **In deseasonalized mode,** the p-value is the seasonal test on raw values, while the slope and interval are computed on anomalies. Do not run the seasonal test on anomalies.
12. **Per decade** means multiplying the slope and both ends of the interval by 120.
13. **`pyMannKendall`'s plain slope uses index spacing.** The fixtures have no gaps, so `t = 0, 1, 2, …` reproduces it. Use `seasonal_test`, not `correlated_seasonal_test`. Verify both names and their result fields in Step 2 before writing the script.
14. **Tolerance:** `toBeCloseTo(x, 3)` allows a difference under 0.0005. The `erf` approximation in the architecture is accurate enough; do not add a statistics library.
15. **Pair loops are O(n²).** With at most about 550 months that is about 150,000 pairs, which is fine. Do not optimize.

**Do not**
- Edit a fixture value, loosen a tolerance, or skip a test to get to green. If a fixture disagrees after two attempts, stop and report the numbers.
- Import anything except `src/types.ts`.
- Use `fetch`, the DOM, `Date.now()` or `Math.random()`.
- Change a signature or `src/types.ts`.

---

## Card B3: Verdict

**Owner:** Dev B. **Hours:** H6-H9. **Review:** Dev C, line by line.

**Goal:** `src/verdict/index.ts` turns a `TrendResult` into the exact verdict kind and wording in the architecture, and never claims more certainty than the two checks support.

**Read:** plan Task B3; architecture sections 2, 4.6 and 7.2.

**Files you may change**
- `src/verdict/index.ts`, `src/verdict/index.test.ts`

**Signatures:** exactly architecture section 4.6.

**Done when**
- Every test in plan Task B3 Step 2 passes with `npx vitest run src/verdict`.
- Each wording test compares the full string against architecture section 7.2.
- `npm run build` passes.

**Traps**
1. **Strict boundaries.** Significant means `mkP < 0.05`, so exactly 0.05 is not. The interval excludes 0 only when both ends are above 0 or both are below; an end equal to 0 does not count.
2. **Direction needs agreement.** `rise` needs a positive slope and an interval above 0. `fall` needs a negative slope and an interval below 0. If the test is significant but the slope's sign and the interval's side disagree, or the slope is 0, the kind is `mixed`.
3. **Copy the wording exactly.** Do not rephrase, shorten or add words. The demo team quotes these sentences.
4. **Capital letter.** `variable.name` is lower case. `{Name}` at the start of a sentence gets its first letter capitalized; `{name}` mid-sentence stays as is.
5. **Rate formatting.** Use the absolute value at 2 significant figures as a plain decimal. `toPrecision(2)` alone returns exponent form for small and large numbers (`"1.2e-7"`, `"1.2e+3"`), so convert it. A rate of 0 prints as `"0"`.
6. **Units pass through untouched,** including symbols such as `°C`.
7. **Every verdict carries the caveat,** including `none`.
8. **Hunch line order:** check for a `mixed` verdict first. A hunch of `none` matching a verdict of `none` is "right".
9. **`oppositeDirections`** is true only for `rise` beside `fall`, in either order.

**Do not**
- Import `src/stats/`. This module works only from the `TrendResult` it is given.
- Add verdict kinds, thresholds or adjectives such as "dramatic" or "alarming".
- Mention causes. The app reports whether something changed, never why.
- Change a signature or `src/types.ts`.

---

## Card A2: `getSeries` and the POWER client

**Owner:** Dev A. **Hours:** H1-H4. **Review:** Dev C reads the tests and skims the code.

**Goal:** `getSeries` returns a clean `Series` for any region file or live POWER point, and turns every failure into a `DataError` the screens can explain.

**Read:** plan Task A2; architecture sections 2, 4.1, 4.2, 6 and 8.

**Files you may change**
- `src/data/index.ts`, `src/data/getSeries.test.ts`, `src/data/power-sample.json`

**Signatures:** exactly architecture section 4.2. In this task, `loadCatalog`, `loadRegions`, `loadLeads` and `demoCases` stay as stubs.

**Done when**
- The real response is captured, and the PR states: the path to the monthly values, the fill value, whether a 13th annual key exists, and whether one call can carry several parameters.
- Every test in plan Task A2 Step 3 passes with `npx vitest run src/data`.
- `npm run build` passes.
- One live call from the deployed page returns data (checked by hand in the browser console).

**Traps**
1. **Capture first, then write tests.** The expected shape (verify): monthly values under `properties.parameter.{NAME}`, keyed `YYYYMM`, with a `YYYY13` annual key and a fill value of `-999`. Treat this as a guess until the saved response confirms it, and write the parser from the saved file.
2. **Keep the sample small.** Request 2 or 3 years for `power-sample.json`.
3. **`fetch` only rejects on network failure.** Check `response.ok` yourself. Map HTTP 429 to `rate-limit`, a rejected `fetch` to `network`, and any other HTTP error, a missing region file or an unreadable body to `unavailable`.
4. **Round coordinates to 2 decimals once,** and use the rounded values in both the request and the `placeId`, so the cache key and the request always agree.
5. **Cache the promise, not the result,** keyed by variable id and `placeId`. Delete the entry when the promise rejects, so a retry can succeed.
6. **Reset the cache between tests** with `vi.resetModules()` and a fresh import. Do not add an exported "clear" function.
7. **Sort the month keys** before building `dates`, and keep only months 01 to 12.
8. **Map the fill value, `null` and non-numbers to `null`.** Never pass a fill value on.
9. **`unit` and `source` for a live point come from the `Variable`,** so the app and the catalog always agree. A region file carries its own.
10. **Prefix static paths with `import.meta.env.BASE_URL`.** A bare `/data/...` works locally and fails on GitHub Pages.
11. **Keep `community=AG`.** Other communities can return different units for the same parameter (verify the unit in the saved response).
12. **No retries in the browser.** One failed call gives one clear message. The precompute script handles backoff.
13. **Send nothing personal.** The request carries only the parameter, coordinates and years.

**Do not**
- Build the demo snapshot fallback; that is Task A7.
- Call POWER from tests. All tests use a mocked `fetch` and the saved sample.
- Import anything except `src/types.ts`.
- Change a signature or `src/types.ts`.

---

## Card A4: Clue engine

**Owner:** Dev A. **Hours:** H5-H8. **Review:** Dev C reads the tests and skims the code.

**Goal:** `src/clues/` picks, at every step, the question that best splits the remaining variables, and a student can answer each question without knowing any variable's name.

**Read:** plan Task A4; architecture sections 2, 4.1, 4.3 and 7.3.

**Files you may change**
- `src/clues/index.ts`, `src/clues/questions.ts`, `src/clues/index.test.ts`

**Signatures:** exactly architecture section 4.3. `index.ts` re-exports `questions` from `questions.ts`.

**Done when**
- Every test in plan Task A4 Step 2 passes with `npx vitest run src/clues`, using `sampleCatalog`.
- `questions.ts` has 4 to 6 questions.
- `npm run build` passes.

**Traps**
1. **Matching is "any shared tag".** `narrow` keeps a variable that has at least one of the option's tags, not all of them.
2. **Groups can overlap.** One variable may match two options of the same question, such as precipitation under both "air" and "water". Do not assume the options split the suspects into separate groups.
3. **The score of a question** is the size of the largest suspect list left by any of its live options. Pick the lowest score.
4. **A question qualifies** only if it is unasked, has at least 2 live options, and at least one live option leaves fewer suspects than before. An option that keeps every suspect is allowed, as long as another one removes some.
5. **Ties go to the earlier question** in the array. Scan in order and replace the best only on a strictly lower score. No randomness.
6. **Return `null`** when 1 or 0 suspects remain, or when no question qualifies. The screen then lists the suspects.
7. **Do not change the inputs.** Return new arrays.
8. **Tags are exact text.** Use lower-case words, and use the same words in `questions.ts` and the catalog. The first question's tags are `air`, `water`, `land` and `life`. If `sampleCatalog` uses other words, ask Dev B to change the fixture, not the engine.
9. **Write questions about what a person notices,** such as "Does it feel hotter, wetter, windier or sunnier?", not about instruments or datasets.
10. **The engine keeps no state.** The screen passes in the suspects and the ids already asked.
11. **Real-catalog checks come later.** The tests that every real variable is reachable belong to Task A6.

**Do not**
- Add scoring weights, learning, or probabilities. This is a fixed rule, not a model.
- Import anything except `src/types.ts` and `./questions`.
- Edit `public/data/catalog.json` in this task.
- Change a signature or `src/types.ts`.

---

## Card A5: Regional data

**Owner:** Dev A. **Hours:** H8-H11. **Review:** Dev C reads the tests, skims the code and spot-checks 3 output files.

**Goal:** `scripts/precompute.py` writes one `Series` file per catalog variable and region, each a `cos(latitude)`-weighted mean of 9 POWER points, without tripping POWER's rate limits.

**Read:** plan Task A5; architecture sections 4.1, 6 and 7.4; the findings recorded in the Task A2 PR.

**Files you may change**
- `scripts/precompute.py`, `scripts/test_precompute.py`, `scripts/requirements.txt`
- `public/data/regions.json`, `public/data/series/`
- `.gitignore`, to exclude the script's cache folder

**Functions:** `sample_points(bbox)`, `weighted_mean(values, lats)` and `region_series(variable, region)`, as in the plan.

**Done when**
- Every test in plan Task A5 Step 1 passes with `pytest scripts/test_precompute.py -v`, with no network access.
- Every catalog and region pair has a file under `public/data/series/`.
- Three output files, checked by eye, sit close to a live point inside their region.
- The PR states the number of calls made, any HTTP 429 seen, and any region whose bbox was moved.

**Traps**
1. **Reuse Task A2's findings.** Parse the response the same way: months 01 to 12 only, fill value to `None`. Do not guess the shape again.
2. **Count the calls first.** 12 regions times 9 points is 108 calls if every parameter fits in one call (verify the per-call parameter limit from Task A2). If it doesn't, the count multiplies, so batch parameters as far as POWER allows.
3. **Be polite to POWER.** Wait 1 to 2 seconds between calls. On HTTP 429, wait 30, 60, then 120 seconds, and stop with a clear error after 5 tries. POWER's real limits are not known.
4. **Cache every raw response on disk,** keyed by point and parameters, in a folder excluded from git. A rerun for new variables or after a crash must not refetch what it already has.
5. **Do the Arctic region first.** A demo case depends on it, and polar coverage is unverified. If its points return only fill values, move the bbox to where data exists and say so in the PR.
6. **Sample points sit at 1/6, 3/6 and 5/6** of each side, so all 9 are strictly inside the bbox.
7. **No region may cross the 180° meridian.** Every bbox needs `west < east`.
8. **`cos` takes radians.** Convert the latitude first.
9. **Renormalize the weights** over the points that have a value that month. A month with no values is `None`.
10. **Write valid JSON.** Python writes `NaN` by default, which browsers reject. Convert to `None` and call `json.dumps` with `allow_nan=False`.
11. **Read the variables and regions from `catalog.json` and `regions.json`.** Do not keep a second list in Python.
12. **Use the exact source text:** "NASA POWER monthly, sampled regional mean of 9 points". The unit comes from the catalog.
13. **Set a request timeout** of 30 seconds, and send no personal details in the request.
14. **Run it in a spare terminal.** At about 108 calls it should take several minutes, so start it and carry on with the next step.
15. **Round values to 4 decimals** to keep the files small.

**Do not**
- Call this an area average anywhere. It is a 9-point sample.
- Let tests reach the network. Pass the fetch function in, or patch it.
- Commit the cache folder.
- Add gridded-file processing. A product from Giovanni or AppEEARS is buffer work, decided at H8.

---

## Card C2: Evidence screen and chart

**Owner:** Dev C. **Hours:** H3-H6. **Review:** Dev C checks it on the live URL at the H8 gate.

**Goal:** the Evidence screen shows the real monthly record with a straight-line fit, lets the user remove the seasonal cycle with instant feedback, and explains loading, errors and too little data in plain words.

**Read:** plan Task C2; architecture sections 2, 4.2, 4.5, 5, 8 and 9.

**Files you may change**
- `src/ui/Evidence.tsx`, `src/ui/Chart.tsx`, `src/ui/Evidence.test.tsx`, `src/App.tsx`, `src/styles/app.css`

**Props:** exactly architecture section 9.

**Done when**
- Every test in plan Task C2 Step 1 passes with `npx vitest run src/ui/Evidence`.
- On the live URL, a real POWER point shows its chart, rate, p-value and interval, and the toggle updates them with no network call (the H8 gate).
- The screen works by keyboard and at 375 px wide.
- `npm run build` passes.

**Traps**
1. **The component computes nothing.** It calls `analyze`, `deseasonalize` and `countValid` and renders what they return. Wrap `analyze` in `useMemo` on the series and the toggle.
2. **Before Task B2 lands, `analyze` is a stub that throws.** Render `sampleResult` until then, and switch to `analyze` in one commit once B2 is merged. In tests, mock `src/stats` with `vi.mock`.
3. **The toggle never refetches.** It only changes which numbers are shown. The toggle state lives in `App`, because the Verdict screen needs it too.
4. **Mount the chart in an effect,** append the element Plot returns to a `ref`, and remove it in the cleanup. Otherwise React's development mode draws it twice.
5. **Plot may not run under jsdom** (verify). If it throws in tests, mock `Chart` in the Evidence test, and test `Chart` only by its accessible label and the data it receives.
6. **Build dates for the x axis from `"YYYY-MM"`** with `Date.UTC(year, month - 1, 1)`. Missing values stay missing, so the line breaks at gaps instead of bridging them.
7. **With the toggle on, plot the anomalies** from `deseasonalize`, and label the y axis "Difference from the usual value for that month ({unit})". With it off, the label is the unit.
8. **The drawn line is a straight-line fit for illustration.** The reported rate is Sen's slope, so the two can differ slightly. Caption the chart "Line: straight-line fit to the points shown."
9. **Never explain the p-value as "the chance the trend is real".** Show it as "p-value (below 0.05 counts as significant)". Show values under 0.001 as "< 0.001", and others at 3 decimals.
10. **Results must also be text.** The rate, p-value and interval sit in the page as text, so a screen reader user gets them without the chart.
11. **Loading uses `role="status"`; errors use `role="alert"`** with the message for that `DataError` kind from architecture section 8.
12. **Fewer than 120 valid months:** `analyze` returns `null`. Show the not-enough-data message with the count from `countValid`, and no chart statistics.
13. **Ignore late responses.** When a response arrives, compare its variable and place with the current state, and drop it if they differ.
14. **Show the source line** from `series.source` under the chart.
15. **Let the chart shrink.** Give it `max-width: 100%` and `height: auto`, so it fits a 375 px screen.

**Do not**
- Add zoom, hover tooltips, date pickers or export. One static chart.
- Put statistics, thresholds or verdict wording in the component.
- Edit files under `src/stats/`, `src/data/` or `src/verdict/`. Report faults to their owners.
- Add a charting or state library.

---

# Shorter cards

The remaining tasks are lower risk, so their cards are shorter. Each still applies the rules in architecture section 2, and the "do not change a signature or `src/types.ts`" rule.

## Dev A

### Card A1: Repo, CI and deploy (H0-H1)

**Goal:** a public repository whose `main` branch deploys itself to GitHub Pages, and whose pull requests are tested automatically.

**Read:** plan Task A1; architecture section 3.

**Done when:** the Pages URL loads with no console errors, a test PR shows a green CI run, and the first commit is timed after 9:00 ICT on November 14.

**Traps**
1. **The Vite `base` must be `/<repo-name>/`,** with both slashes. A wrong value gives a blank page on Pages and works fine locally.
2. **Pages must be switched on by hand** in the repository settings, with "GitHub Actions" as the source. The deploy workflow needs `pages: write` and `id-token: write` permissions.
3. **The repository must be public,** so judges can open it without a login.
4. **Set the Vitest environment to `jsdom`,** and turn on `resolveJsonModule` so tests can import `fixtures.json`.
5. **Pin exact dependency versions** and commit the lockfile. CI uses `npm ci`.
6. **Add a `.gitignore`** for `node_modules`, `dist`, Python caches, virtual environments and the precompute cache.
7. **Use the full Apache-2.0 text** for `LICENSE`, from the official source.
8. **`README.md` says from the first commit** that parts of the code were written with AI assistance.
9. **Copy in the spec, plan, architecture, cards and `CLAUDE.md`.** They become public with the repository.

**Do not** add a linter, formatter, pre-commit hook or any tool not in the stack. Do not add Python tests to CI; they run locally.

### Card A3: Loaders and starter data (H4-H5)

**Goal:** the app reads its catalog, regions and leads from real files, starting with two confirmed variables.

**Read:** plan Task A3; architecture sections 4.1, 4.2 and 6.

**Done when:** the loader tests pass, and the deployed app lists `T2M` and `PRECTOTCORR` from `catalog.json`.

**Traps**
1. **Prefix every path with `import.meta.env.BASE_URL`.**
2. **Fetch each file once.** Keep the promise, and drop it if it rejects.
3. **A rejected `fetch` is kind `network`; a response that is not OK is kind `unavailable`.**
4. **Each variable's `id` equals its `powerParameter`.**
5. **Take the unit and start year from the response saved in Task A2 and POWER's documentation,** not from memory.
6. **Region ids are lower-case words joined by hyphens.** They become file names.
7. **An empty array is a valid `leads.json`.**

**Do not** add variables that no live call has confirmed. Do not write definitions longer than one sentence.

### Card A6: Full catalog and tags (H11-H12)

**Goal:** about 10 confirmed variables, each reachable through the questions, each with a series file for every region.

**Read:** plan Task A6; architecture sections 4.1, 6 and 7.3.

**Done when:** every test in plan Task A6 Step 1 passes, and Dev C has spot-checked the definitions.

**Traps**
1. **Confirm each parameter with one live call** before adding it: its exact name, unit and first year. Candidate names to check, not to trust: `T2M_MAX`, `T2M_MIN`, `RH2M`, `WS2M`, `ALLSKY_SFC_SW_DWN`, `QV2M`, `PS`, `TS`.
2. **Sources differ.** Solar parameters may come from a different product, with a different first year, than the weather parameters (verify). Set `source` and `startYear` per variable.
3. **Every variable needs a tag from the first question,** or the engine can never reach it.
4. **Near-twins are fine.** Maximum, minimum and mean temperature may end in a final list of up to 3.
5. **The catalog test reads the files from disk,** not through `fetch`.
6. **Rerunning the script with a new parameter list may refetch every point,** because the cache key includes the parameters. Allow time for it.
7. **Definitions may be AI-drafted, then checked** against POWER's documentation, with a line in `AI_USE.md`.

**Do not** add a variable after H12. Do not keep a variable whose series files are missing.

### Card A7: Demo cases and snapshots (H12-H13)

**Goal:** two solved cases a judge can open in one click, which still work if POWER is unreachable.

**Read:** plan Task A7; architecture sections 4.1, 4.2 and 8.

**Done when:** the tests pass, and both cases open on the live URL with the network's POWER requests blocked.

**Traps**
1. **Region cases need no snapshot.** A region's series is already a static file. Only a demo case that is a point place needs a saved copy and the fallback. If both cases are regions, skip the fallback and say so in the PR.
2. **Take the cases from Dev B's Task B6,** exactly as given. Do not pick more striking ones.
3. **Match a demo case by variable id and `placeId`.**
4. **A non-demo request must still throw** when POWER fails.
5. **Titles are questions in plain words,** such as "Is the Arctic getting wetter?".

**Do not** change `getSeries`'s signature. Do not add a third case.

### Card A8: Device test (H14-H15)

**Goal:** proof that the live app works for a stranger on another device and network.

**Read:** plan Task A8 and the defect report format in the plan.

**Done when:** both demo cases, one region case and one typed-coordinate case pass on a phone and a second laptop, and every fault found is reported or fixed.

**Traps**
1. **Use a private window, signed out of everything.**
2. **Put the phone on mobile data,** not the room's wifi, to catch network and filter problems.
3. **Test one failure on purpose:** switch to airplane mode and check the error message appears.
4. **Write down the device and browser** for each run.
5. **Report faults in the plan's format** to the folder's owner. Fix only your own folders.

**Do not** change features. After H13, only fixes.

## Dev B

### Card B1: Contract and fixtures (H0-H1)

**Goal:** the shared types and sample data are in `main` within the first hour, because everyone else is waiting on them.

**Read:** plan Task B1; architecture sections 4.1 and 4.7.

**Done when:** the fixture test passes, `npm run build` passes, and Dev C has approved the types.

**Traps**
1. **Copy the types exactly** from architecture section 4.1, and export every one. No logic in `types.ts`.
2. **Fixtures are deterministic.** Build `sampleSeries` from a formula, such as a small trend plus a sine wave. No `Math.random()`.
3. **`sampleSeries` has no missing values.** Tests that need gaps build their own.
4. **`sampleCatalog` has 4 variables,** including the ids `T2M` and `PRECTOTCORR`, with tags from the first question (`air`, `water`, `land`, `life`) plus one more specific tag each, so the clue engine tests have something to split.
5. **`sampleLeads` must name regions and variables that exist** in the other fixtures.
6. **`sampleResult` is a plausible `TrendResult`** with `n` of 180.
7. **Label every fixture as synthetic** in a comment.

**Do not** put real NASA values in fixtures. Do not delay the merge to polish.

### Card B4: Place helpers (H9-H10)

**Goal:** typed coordinates are accepted only when valid, and every place has a readable name.

**Read:** plan Task B4; architecture sections 4.4 and 8.

**Done when:** every test in plan Task B4 Step 2 passes.

**Traps**
1. **Parse with `Number`, not `parseFloat`.** `parseFloat("12abc")` returns 12, which would accept bad input.
2. **Trim the text first,** and reject empty text, which `Number` turns into 0.
3. **Accept a comma as the decimal mark,** such as "10,5", since many users type it.
4. **Reject `Infinity` and `NaN`.**
5. **The ranges include their edges:** 90, -90, 180 and -180 are valid.
6. **`placeName` for a point is the two numbers at 2 decimals,** such as "10.50, 106.70". For an unknown region id, return the id.
7. **`leadsFor` returns an empty array** when nothing matches.

**Do not** round the coordinates here; the data module does that. Do not import anything except `src/types.ts`.

### Card B5: Leads (H10-H11)

**Goal:** one or two sourced, modest suggestions per region of what may be worth checking there.

**Read:** plan Task B5; architecture section 4.1 (`Lead`).

**Done when:** every lead's source has been opened and supports it, the catalog test passes, and `SOURCES.md` lists each source.

**Traps**
1. **A lead is a suggestion, not a finding.** Write "may be worth checking", never "is rising".
2. **Open every `sourceUrl` yourself.** AI-drafted leads can cite pages that don't exist or don't say that. Delete any lead you can't confirm.
3. **Prefer NASA and space agency pages** that open without a login.
4. **Paraphrase.** Do not copy sentences from the source.
5. **Use only region ids and variable ids that exist.** Start with `T2M` and `PRECTOTCORR`, and add leads for other variables after Task A6.
6. **Wait for the final region list** from Task A5 before writing.
7. **Add a line to `AI_USE.md`.**

**Do not** state causes. Do not write more than one sentence per lead.

### Card B6: Demo case choice (H11-H12)

**Goal:** two demo cases chosen from what the data really shows, each cross-checked in Python.

**Read:** plan Task B6; architecture sections 7.1 and 7.2.

**Done when:** Dev A has the two cases, the demo team has the verdicts in writing, and both cases match `pyMannKendall` to 3 decimals.

**Traps**
1. **Survey with a temporary test file** that reads the series files from disk and prints each verdict kind for both toggle states. Delete it afterwards; do not commit it.
2. **Case 1 is precipitation in the Arctic region, whatever the verdict.** If the data says "no significant trend", that is the demo.
3. **Case 2 is one where the verdict differs between the two toggle states.** Among those, pick the easiest to explain, not the most dramatic.
4. **Record whether any pair of regions gives `rise` beside `fall`** for one variable. The video's last line depends on it.
5. **The Python seasonal check assumes a full record starting in January with no gaps.** A mismatch on a series with gaps or a mid-year start may be an alignment difference, not a fault. Check on a clean series before reporting a fault.
6. **Give the numbers in writing:** variable, place, rate, p-value, interval and verdict for both toggle states.

**Do not** adjust regions, periods or thresholds to produce a result.

### Card B7: Methods text and `AI_USE.md` (H13-H14)

**Goal:** a short, honest account of how verdicts are reached and how AI was used, for the README and the demo team.

**Read:** plan Task B7; architecture sections 7.1 and 7.2; `docs/case-file-demo-drafts.md`.

**Done when:** `README.md` has the methods section, `AI_USE.md` is complete, and the demo team has both.

**Traps**
1. **Quote only results that were actually run:** the number of fixtures and the decimal places matched, from the real test output.
2. **State the limits:** linear trends only, related neighbouring months, sampled regions, the 120-month minimum.
3. **Write for a reader with no statistics.** Name each method once and say what question it answers.
4. **`AI_USE.md` covers everything:** planning and research before the event, code, tests, definitions, leads, wording and documents, from all three developers.
5. **Describe AI help with the idea truthfully,** as the organizers advise.

**Do not** claim the app proves causes or predicts the future.

### Card B8: `SOURCES.md` and `README.md` (H14-H15)

**Goal:** every source is credited, and a stranger can understand and run the project from the README.

**Read:** plan Task B8.

**Done when:** `SOURCES.md` covers every dataset, library and lead source, and the README has the live link, what the app does, how to run it and the AI acknowledgment.

**Traps**
1. **For each dataset:** product name, provider, URL and the date accessed.
2. **For each library:** name, version and licence, taken from `package.json`, `requirements.txt` and the packages' own licence files.
3. **Include every lead source** from `leads.json`.
4. **The References field on the project page is built from this file,** and NASA can remove awards for uncited resources.
5. **No personal emails or phone numbers** in either file.

**Do not** list tools that were not used.

## Dev C

### Card C0: Kickoff (H0-H1)

**Goal:** the contract and repository are merged within the hour, and everyone has started their first build task.

**Read:** plan Task C0 and the Workflow section.

**Done when:** A1 and B1 are merged, and each developer has started their first build task.

**Checks**
1. **Reread the cards** and correct anything already known to be wrong.
2. **The repository is public and Pages is on.**
3. **The demo team has the live URL** and knows the H8 and H13 handoffs.
4. **Say aloud that the contract is frozen** once B1 is merged.

### Card C1: Shell, state and styles (H1-H3)

**Goal:** five placeholder screens connected by one reducer, with the style tokens every later screen uses.

**Read:** plan Task C1; architecture sections 5 and 9.

**Done when:** the `App` test walks all five screens, and the live URL does the same.

**Traps**
1. **The reducer is a pure function** with exactly the transitions in architecture section 5.
2. **Move focus to each screen's `h1`** when the screen changes: give it `tabIndex={-1}` and focus it in an effect.
3. **Loaders are stubs until Task A3.** Use the fixtures until then, and switch in one commit.
4. **Set `lang="en"`, a page title and the viewport tag** in `index.html`.
5. **Define colors, spacing and type as CSS custom properties** in one stylesheet, with a system font stack.
6. **There is no router,** so the browser's back button leaves the app. That is accepted.
7. **Mock the other folders in the `App` test** with `vi.mock`, and use fixtures.

**Do not** add a router, a state library or a CSS framework. Do not style screens in detail yet.

### Card C3: Case brief (H6-H7)

**Goal:** the user confirms the question and commits to a guess before seeing any data.

**Read:** plan Task C3; architecture section 9.

**Done when:** every test in plan Task C3 Step 1 passes.

**Traps**
1. **Use the exact sentence** from architecture section 9, filled with `variable.name`, the place name and `variable.startYear`.
2. **No option is selected at first,** so the guess is a real choice.
3. **Use a `fieldset` with a `legend`** for the radio group.
4. **Map the labels to values:** rising is `rise`, falling is `fall`, no change is `none`.
5. **Disable the confirm button with the `disabled` attribute** until a hunch is chosen.

**Do not** show any data, chart or hint on this screen.

### Card C4: Clues screen (H8-H10)

**Goal:** one question at a time, with the suspect list visibly shrinking, ending in one chosen variable.

**Read:** plan Task C4; architecture sections 4.3 and 9.

**Done when:** every test in plan Task C4 Step 1 passes, and a full run on the live URL reaches a variable.

**Traps**
1. **All choices come from the engine.** Call `nextQuestion`, `liveOptions` and `narrow`; write no narrowing logic here.
2. **Keep the suspects and the asked ids in local state,** and reset them when the screen is entered again.
3. **Do not jump away silently when one suspect is left.** Show it with its definition and a "Continue" button.
4. **When no question can split further and several remain,** show them as buttons.
5. **Announce the count** in an `aria-live="polite"` region, with correct singular and plural.
6. **Options are buttons,** each a single press.
7. **Offer "Start over"** once a question has been answered.

**Do not** hard-code questions, tags or variable names in the component.

### Card C5: Place picker (H10-H11)

**Goal:** the user picks a prepared region or types coordinates, and sees sourced leads for the region.

**Read:** plan Task C5; architecture sections 4.4, 8 and 9.

**Done when:** every test in plan Task C5 Step 1 passes.

**Traps**
1. **Regions are a radio group.** Selecting one shows its leads; "Use this region" confirms it.
2. **Coordinates are a separate form** with its own button.
3. **Use `type="text"` with `inputMode="decimal"`,** not `type="number"`, so a comma can be typed and validation stays ours.
4. **Validate with `parsePoint`.** On `null`, show the message from architecture section 8 with `role="alert"`, and link it to the inputs with `aria-describedby`.
5. **For a regions-only variable, hide the coordinate form** and say "This measurement is only available for prepared regions."
6. **Get leads from `leadsFor`.** Show no leads section when it returns none.
7. **Source links open in a new tab** with `rel="noopener noreferrer"`.

**Do not** add a map, a search box or geolocation.

### Card C6: Verdict screen (H11-H12)

**Goal:** the verdict, its caveat and the hunch line, shown exactly as the verdict module returns them.

**Read:** plan Task C6; architecture sections 4.5, 4.6, 7.2 and 9.

**Done when:** every test in plan Task C6 Step 1 passes, and both demo cases run from question to verdict on the live URL (the H13 gate).

**Traps**
1. **Every sentence comes from `getVerdict` and `hunchLine`.** Write no verdict wording in the component.
2. **Show the kind as a word** beside any color: "Rising", "Falling", "Mixed evidence" or "No significant trend".
3. **Use the same toggle state as the Evidence screen,** so the two screens never disagree.
4. **A `null` result shows the not-enough-data message,** with no verdict and no hunch line.
5. **Show the source line.**

**Do not** add emphasis, icons or colors that make one verdict look better than another.

### Card C7: Second witness (H12-H13, only if C6 is merged by H12)

**Goal:** the same variable in a second region, as a second verdict card.

**Read:** plan Task C7; architecture sections 4.2, 4.6, 8 and 9.

**Done when:** every test in plan Task C7 Step 1 passes.

**Traps**
1. **Regions only.** The list leaves out the region already shown.
2. **Keep the second load's state inside this component.** It must not disturb the first card.
3. **Use the same variable and toggle state** as the first card.
4. **Show the opposite-directions line only when `oppositeDirections` is true.**
5. **An error on the second region shows its message and keeps the first card.**
6. **Stack the cards on a phone,** and place them side by side on wide screens.

**Do not** add a second chart. If C6 is not merged by H12, do not start this task.

### Card C8: Polish and accessibility (H13-H14)

**Goal:** the app is usable on a phone and by keyboard, with nothing new added.

**Read:** plan Task C8; architecture section 9.

**Done when:** the three checks in plan Task C8 pass on the live URL.

**Checks**
1. **375 px wide:** no horizontal scroll, nothing cut off, buttons large enough to tap.
2. **Keyboard only:** every control reachable in a sensible order, with a visible focus outline.
3. **Contrast:** at least 4.5 to 1 for text, checked in the browser's developer tools.
4. **Zoom to 200%:** text still readable and nothing overlaps.
5. **One `h1` per screen,** and link text that makes sense on its own.

**Do not** add features, animations or new copy. After H13, only fixes.
