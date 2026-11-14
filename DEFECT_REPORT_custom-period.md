# Defect report: custom period back end (issue 46)

- **Reviewed:** commit `6d419bc` on `a/custom-period`, plus an audit of the back-end folders at that commit
- **Reviewer:** temporary back-end reviewer, standing in for Dev C
- **Date:** 2026-11-15
- **Checks on `6d419bc`:** `npx vitest run` 205/205, `pytest scripts` 10/10, `npm run build` passed

## Overview

| # | Defect | Severity | Owner | Fix when |
|---|---|---|---|---|
| D1 | `validPeriod` accepts a period that `analyze` refuses | wrong result | Dev B | Before the period UI is built |
| D2 | CI does not run the Python tests | process gap | Dev A | Next PR that touches `.github/` |
| D3 | Pipeline test hard-codes the year 2025 | cosmetic | Dev A | Before the next data refresh |
| D4 | A half-written cache file blocks `precompute.py` | cosmetic | Dev A | When convenient |

One real defect (D1). The rest of the back end is healthy. Owners: write a failing test first, then fix, in a new PR.

## D1. `validPeriod` accepts a period that `analyze` refuses

```text
Title:    stats: validPeriod accepts a period that analyze cannot give a verdict for
Owner:    Dev B
Severity: wrong result
Steps:    1. Series 2001-01 to 2025-12, every month valued except 2020-06 (null).
          2. validPeriod(series, 2016, 2025)
          3. analyze(slicePeriod(series, 2016, 2025), true)
Expected: Architecture 4.5: a valid period has the 120 months a verdict needs, so analyze returns a TrendResult.
Actual:   validPeriod returns true. The slice has 119 valued months. analyze returns null.
Evidence: Throwaway Vitest probe on 6d419bc: { valid: true, analyze: null }.
Commit:   6d419bc (a/custom-period, not on main)
```

- **Where:** `src/stats/index.ts:166-169`
- **Cause:** only the first and last year are checked for missing months. Years between them are not.
- **Fix:** add one condition to `validPeriod`: `countValid(slicePeriod(series, start, end)) >= MIN_MONTHS`. Then correct the sentence in `ARCHITECTURE.md` 4.5 that says 10 complete years always give 120 months (Dev C's to approve).
- **Reach today:** none. No UI code calls the period functions yet, and none of the 120 region files has a missing month. It needs a live POWER point with a fill value inside the chosen period.

## D2. CI does not run the Python tests

- **Where:** `.github/workflows/ci.yml:19`
- **Problem:** CI runs only `npx vitest run` and the build. A PR that breaks `scripts/precompute.py` (the 9-point mean, fill values) passes CI, although `scripts/test_precompute.py` has 10 tests for it.
- **Fix:** add `actions/setup-python`, `pip install -r scripts/requirements.txt` and `pytest scripts -v` to the job.

## D3. Pipeline test hard-codes the year 2025

- **Where:** `src/data/pipeline.test.ts:153-157`
- **Problem:** stage 4b expects the last selectable year to be 2025 and uses 2016 and 2017 as fixed years. After a data refresh to 2026 it fails although nothing is broken.
- **Fix:** `const last = years[years.length - 1]`, then use `last - 8` and `last - 9`.

## D4. A half-written cache file blocks `precompute.py`

- **Where:** `scripts/precompute.py:110-116`
- **Problem:** if the script is stopped while it writes a file in `scripts/.cache`, the file is cut short. Every later run crashes on it with a JSON error until it is deleted by hand.
- **Fix:** write to a temporary name, then `os.replace` it onto the final name.

## Notes for Dev C (not code defects)

- Branch `a/custom-period` changes `src/stats/` and `src/verdict/` (Dev B's folders) and the text of `ARCHITECTURE.md` section 4 (changes only through Dev C). Dev B and Dev C should confirm before merge.
- `END_YEAR = 2025` is written in both `src/data/index.ts` and `scripts/precompute.py`. Change both at the next data refresh.
- `getVerdict` with `years` lowers the first letter of the sentence. A future variable name that starts with a capital ("UV index") would print as "uV index". The catalog has none today.

## Checked and found fine

- `src/stats/`: results match the committed pyMannKendall and scipy fixtures; 120-month floor enforced in `analyze`.
- `src/verdict/`: level 0.05; wording matches architecture 7.2; without `years` the sentence is unchanged.
- `src/data/`: fill values become `null`; each failure maps to the right `DataError`; a failed load can be retried.
- `src/place/`, `src/clues/`: input checks hold; no dead code.
- `public/data/`: 120 series files, all end at 2025-12, no missing months; all 10 leads have a `sourceUrl`.

## Not checked

`src/ui/`, `src/App.tsx` and styles (out of scope); the live POWER check (`npm run test:live`); an end-to-end run of `precompute.py`.
