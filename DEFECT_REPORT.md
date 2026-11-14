# Definitive defect report, 2026-11-15

This report replaces the three review reports of 2026-11-15. They stay in the repository as the original evidence:

| Prefix | Source report | Reviewed commit |
|---|---|---|
| CP | `DEFECT_REPORT_custom-period.md` (custom period back end) | `6d419bc` |
| BR | `BACKEND_DEFECT_REPORT.md` (back-end review) | `6d419bc` |
| IN | `DEFECT_REPORT_GEMINI.md` (front-end / back-end integration) | `fc5e7b2` |

- **Verified at:** `72ad165` (`a/custom-period`). Baseline: `npx vitest run` 205/205, `pytest scripts` 10/10, `npm run build` passed.
- **Result:** 18 defects raised, 18 reproduced, 18 fixed. No finding was rejected. No two findings were duplicates; CP-D4 and BR-02 share one function and one fix.
- **After the fixes:** `npx vitest run` 248/248, `pytest scripts` 21/21, `npm run build` passed.
- **How each was verified:** a failing test was written first and seen to fail on `72ad165`, except CP-D2 and CP-D3, which are faults in a workflow file and in a test and were confirmed by reading.

## Overview

| ID | Defect | Severity | Owner | Reproduced by | Status |
|---|---|---|---|---|---|
| CP-D1 | `validPeriod` accepts a period that `analyze` refuses | wrong result | Dev B | failing test | fixed |
| CP-D2 | CI does not run the Python tests | process gap | Dev A | reading `ci.yml` | fixed |
| CP-D3 | Pipeline test hard-codes the year 2025 | cosmetic | Dev A | reading the test | fixed |
| CP-D4 | A half-written cache file blocks `precompute.py` | cosmetic | Dev A | failing test | fixed |
| BR-01 | Region validation lets bad contents reach `analyze`; a non-array catalog body is accepted | blocks a gate | Dev A | failing tests | fixed |
| BR-02 | An error response is cached by `precompute.py` and fails every retry | blocks a gate | Dev A | failing test | fixed |
| BR-03 | Malformed POWER parameter data becomes an empty, cached `Series` | wrong result | Dev A | failing tests | fixed |
| BR-04 | A significant rate below 1e-10 reads "risen by about 0" | cosmetic | Dev B | failing test | fixed |
| IN-1 | A failed load leaves the Evidence screen with no way out; a region's network message names NASA | wrong result | Dev C, Dev A | failing tests | fixed |
| IN-2 | The "mixed" sentence drops the direction | cosmetic, misleading | Dev B, Dev C | failing test | fixed |
| IN-3 | A p-value of "0.050" can be significant or not | cosmetic | Dev C | failing test | fixed |
| IN-4 | The rate has a sign, the interval does not | cosmetic | Dev C | failing test | fixed |
| IN-5 | The chart draws the fit line when there is too little data | cosmetic | Dev C | failing test | fixed |
| IN-6 | Lists start some region names with a lower-case "the" | cosmetic | Dev C | failing tests | fixed |
| IN-7 | "These two regions" appears when one place is a point | cosmetic | Dev C | failing test | fixed |
| IN-8 | The second-witness error names no region and cannot be retried | cosmetic | Dev C | failing tests | fixed |
| IN-9 | "%" makes a humidity rate read as a relative change | cosmetic | Dev A, Dev B | failing tests | fixed |
| IN-T1 | `npx vitest run` from the repo root also runs every worktree's tests | tooling | Dev A | a stray test under `.claude/` was collected | fixed |

## Decisions the owners must confirm

The fixes below change text or contracts that belong to Dev C (`ARCHITECTURE.md` sections 4, 5, 7.2, 8 and 9) and code in every owner's folder. The developer asked for all of them in one change. Each owner should review their part before merge.

1. **IN-2 wording.** The mixed sentence now reads "may be rising, by about …" or "may be falling, by about …". The slope decides the word. The verdict rule and thresholds did not change.
2. **BR-04 wording.** The 1e-10 floor of `formatNumber` stays (D9). A rise or fall below it reads "has risen by less than 0.0000000001 {unit} per decade". Section 4.6 now states the floor.
3. **IN-9 wording.** The catalog unit stays "%". A new `rateUnit` gives "percentage points" for rates in the verdict sentence and the rate and interval tiles. The chart axis keeps "%".
4. **IN-1 contract.** New event `changePlace` and a new `Evidence` prop `onBack`. New region message: "We couldn't load this region's data. Check your connection, then choose the region again."
5. **IN-3 rule.** A p-value below 0.05 that rounds to "0.050" reads "< 0.050".
6. **New exports:** `listName` (`src/place`), `rateUnit` (`src/verdict`). New optional `Chart` prop `fit`.

## Defects

### CP-D1. `validPeriod` accepts a period that `analyze` refuses

- **Steps:** series 2001-01 to 2025-12, only 2020-06 is `null`. `validPeriod(series, 2016, 2025)`, then `analyze(slicePeriod(series, 2016, 2025), true)`.
- **Expected:** a valid period has the 120 months a verdict needs.
- **Actual on `72ad165`:** `validPeriod` is `true`; the slice has 119 valued months; `analyze` is `null`.
- **Cause:** only the first and last year were checked for missing months.
- **Fix:** `src/stats/index.ts`: `validPeriod` also requires `countValid(slicePeriod(...)) >= 120`. `ARCHITECTURE.md` 4.5 corrected.
- **Test:** `src/stats/index.test.ts`, "validPeriod refuses a period whose slice has fewer than 120 valued months". It also checks every start year: whatever `validPeriod` accepts, `analyze` answers.

### CP-D2. CI does not run the Python tests

- **Fix:** `.github/workflows/ci.yml` now sets up Python 3.14, installs `scripts/requirements.txt` and runs `pytest scripts -v`.
- **Not verified:** the workflow has not run on GitHub yet. It runs on the pull request.

### CP-D3. Pipeline test hard-codes the year 2025

- **Fix:** `src/data/pipeline.test.ts` stage 4b reads the last complete year from the record and uses `last - 8` and `last - 9`. It also checks that the record ends in December of that year.

### CP-D4 and BR-02. The offline cache keeps unusable files

- **Steps (BR-02):** empty cache; first HTTP-200 body is `{"messages":["failure"]}`, the next is valid; fetch, then fetch again with a fresh `make_fetch`.
- **Actual on `72ad165`:** the error body is cached before it is parsed; both attempts raise `KeyError('properties')` and the network is called once.
- **Steps (CP-D4):** a cache file cut short (`{"properties": {"parameter": {"T2M": {"2020`).
- **Actual on `72ad165`:** every run stops with a JSON error until the file is deleted by hand.
- **Fix:** `scripts/precompute.py`: a response is checked for monthly data of every requested parameter before it is cached, and refused with a clear error otherwise. The cache file is written under a temporary name, then renamed with `os.replace`. A cache file that cannot be read, or holds no monthly data, is fetched again.
- **Tests:** 11 new cases in `scripts/test_precompute.py` (error body, five malformed bodies, a missing parameter, three unusable cache files, a write that stops before the rename).

### BR-01. Region validation lets bad contents reach `analyze`

- **Steps:** region file `{"dates":[null],"values":[1]}`; `getSeries(T2M, sahel)`. With 120 months and one `null` date, `analyze` then throws `TypeError: Cannot read properties of null (reading 'split')`.
- **Actual on `72ad165`:** the object resolves and is cached.
- **Related gap:** an HTTP-200 catalog body of `null` made `loadCatalog()` resolve to `null`.
- **Fix:** `src/data/index.ts`: `loadRegion` requires every date to be "YYYY-MM" and every value a finite number or `null`. `loadCatalog`, `loadRegions` and `loadLeads` require an array. Both failures are `DataError("unavailable")` and are not cached.
- **Tests:** `src/data/getSeries.test.ts` (6 bad files, 1 good file with `null` values), `src/data/loaders.test.ts` (4 non-array bodies for each of the 3 loaders, then a retry).

### BR-03. Malformed POWER data becomes an empty successful record

- **Steps:** HTTP 200 with `{"properties":{"parameter":{"T2M":[]}}}`; call `getSeries` twice.
- **Actual on `72ad165`:** both calls resolve with zero months from one fetch. `{}` and `{"error":"unknown parameter"}` do the same.
- **Fix:** `src/data/index.ts`: parameter data with no monthly key is `DataError("unavailable")`. An all-fill response still gives a `Series` of `null` months.
- **Tests:** `src/data/getSeries.test.ts`, 4 bodies; each is refused twice with two fetches.

### BR-04. A significant rate below 1e-10 reads "by about 0"

- **Steps:** `getVerdict` with `mkP` 0.01, slope 1e-11, interval [1e-11, 2e-11].
- **Actual on `72ad165`:** "Air temperature in test has risen by about 0 °C per decade, and the evidence is strong."
- **Fix:** `src/verdict/index.ts`: see decision 2. `formatNumber` is unchanged.
- **Test:** `src/verdict/index.test.ts`, "a rise or fall too small to print does not say "by about 0"", for rise, fall, with years, and at the floor itself.

### IN-1. A failed load leaves the Evidence screen with no way out

- **Steps:** choose a variable and a region, confirm with a hunch, the request fails.
- **Actual on `72ad165`:** `<main>` holds only the heading and the alert. For a region the message names NASA's data service, although the file comes from this site.
- **Fix:** `src/ui/Evidence.tsx` shows "Choose another place" in the error state; `src/App.tsx` adds `changePlace`, which goes back to the scene and keeps the variable; `src/data/index.ts` gives a region's network failure its own message. See decision 4.
- **Tests:** `src/caseReducer.test.ts` (3), `src/ui/Evidence.test.tsx` (2), `src/App.test.tsx` (fail, go back, try again, reach the evidence), `src/data/getSeries.test.ts` (region and point messages).

### IN-2. The "mixed" verdict drops the sign

- **Steps:** solved case "Is the Arctic getting wetter?", toggle on.
- **Actual on `72ad165`:** the Evidence screen shows −0.026 mm/day; the verdict says "may be changing, by about 0.026 mm/day per decade".
- **Fix:** `src/verdict/index.ts`: see decision 1. The Arctic case now reads "may be falling, by about 0.026 mm/day per decade". The data, region, period and thresholds did not change.
- **Tests:** `src/verdict/index.test.ts`, "a mixed verdict says which way the rate points"; `src/data/pipeline.test.ts` stage 5 checks the new wording on all 120 series in both toggle states.

### IN-3. A p-value of "0.050" can be significant or not

- **Actual on `72ad165`:** 0.0496 and 0.0504 both read "0.050".
- **Fix:** `src/ui/Evidence.tsx`: see decision 5.
- **Test:** `src/ui/Evidence.test.tsx`, 9 values on both sides of 0.05 and 0.001.

### IN-4. The rate has a sign, the interval does not

- **Fix:** `src/ui/Evidence.tsx`: both interval ends use `formatNumber(x, true)`: "+0.17 to +0.28 °C", "−0.030 to +0.0060 mm/day".
- **Test:** `src/ui/Evidence.test.tsx`, two cases.

### IN-5. The chart draws the fit line when there is too little data

- **Fix:** `src/ui/Chart.tsx` takes `fit`; `Evidence` passes `result !== null`. Without a result the fit line, its caption and its mention in the accessible label are left out.
- **Tests:** `src/ui/Chart.test.tsx`, `src/ui/Evidence.test.tsx`.

### IN-6. Region lists start some names with a lower-case "the"

- **Fix:** `listName` in `src/place/index.ts` starts a name with a capital. Used by the scene's "Prepared region" list, the "Compare another region" select and the "Case so far" panel. Sentences keep "the Sahel".
- **Tests:** `src/place/index.test.ts`, `src/ui/PlacePicker.test.tsx`, `src/ui/VerdictView.test.tsx`, `src/ui/Shell.test.tsx`.

### IN-7. "These two regions" also appears when one place is a point

- **Fix:** `src/ui/VerdictView.tsx`: "These two places are moving in opposite directions."

### IN-8. The second-witness error names no region and cannot be retried

- **Fix:** `src/ui/VerdictView.tsx`: the alert starts with the region's name, and the select goes back to "Choose a region" after an error, so the same region can be chosen again.
- **Tests:** `src/ui/VerdictView.test.tsx`: the alert text; fail, choose the same region, succeed with two requests.

### IN-9. "%" makes a humidity rate read as a relative change

- **Actual on `72ad165`:** "has risen by about 0.76 % per decade".
- **Fix:** see decision 3: "has risen by about 0.76 percentage points per decade".
- **Tests:** `src/verdict/index.test.ts`, `src/ui/Evidence.test.tsx`, and stage 5 of the pipeline test for all 12 RH2M series.

### IN-T1. Worktree tests run from the repo root

- **Reproduced:** a test file placed under `.claude/worktrees/x/` was collected (23 files instead of 22).
- **Fix:** `vite.config.ts`: `exclude: [...configDefaults.exclude, '.claude/**']`. After the fix the stray file is not collected, and a worktree still runs its own 22 files.

## Notes carried over, not defects

- `END_YEAR = 2025` is written in `src/data/index.ts` and `scripts/precompute.py`. Change both at the next data refresh.
- `getVerdict` with `years` lowers the first letter of the sentence. A variable name that starts with a capital would print wrongly. The catalog has none.
- Sen's slope can fall outside the OLS interval (for example Sahel precipitation, toggle on). This follows from the two methods in section 7.1.
- Arctic Canada air temperature reads "fall". One live POWER request showed the same drop, so the app reports the source faithfully.

## Not checked

- The changed screens in a real browser: keyboard use and the 375 px layout of the new "Choose another place" button. Tests cover role, name and behavior only.
- The CI workflow on GitHub.
- An end-to-end run of `precompute.py`, and the live POWER check (`npm run test:live`).
