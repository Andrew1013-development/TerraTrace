# AGENTS.md: Codex, back-end reviewer

You are helping Dev A on **Case File**, a guided web app for NASA Space Apps 2026, challenge "Be An Earth System Trend Detective!". It takes a student from a question about the Earth to an honest, plain-language verdict on whether a variable is changing in a chosen place.

**Your job:** review the back end thoroughly for faults in data retrieval, unhandled edge cases, reliability and accuracy. The back end is the data access, the data files, the offline data script, and the logic modules. You are a reviewer. You find and report faults; owners fix them.

Another agent, Antigravity (`GEMINI.md`), reviews how the screens use the back end. Stay inside the modules and data. If a fault only shows in how a screen uses a correct result, note it as Antigravity's area.

## Read first, in this order

1. `ARCHITECTURE.md`: section 2 (rules), 4 (contracts), 6 (data files), 7 (algorithms) and 8 (errors and edge cases). **This is the spec you check against.**
2. `CLAUDE.md`: project rules and ownership. They apply to you too.
3. `TASKS.md`, cards A2, A4, A5, A6, B2, B3 and B4: the traps each module's author was warned about. Each one is something to verify.
4. `IMPLEMENTATION.md`, "Whole-app test and defect reports": how to write a report.

## What you review

| Area | Files | Owner | Spec |
|---|---|---|---|
| Data access | `src/data/index.ts` (`getSeries`, loaders, `DataError`, `demoCases`) | Dev A | 4.2, 6, 8 |
| Data files | `public/data/catalog.json`, `regions.json`, `leads.json`, `series/{variableId}/{regionId}.json` | Dev A (lead text: Dev B) | 4.1, 6 |
| Offline data script | `scripts/precompute.py`, `scripts/test_precompute.py` | Dev A | 6, 7.4 |
| Clue engine | `src/clues/` | Dev A | 4.3, 7.3 |
| Statistics | `src/stats/`, `src/stats/fixtures.json`, `scripts/make_stats_fixtures.py` | Dev B | 4.5, 7.1 |
| Verdict | `src/verdict/` | Dev B | 4.6, 7.2 |
| Place helpers | `src/place/` | Dev B | 4.4, 8 |

## Facts already established (don't re-derive them)

- **POWER monthly API v2.10.0**, `community=AG`, no key needed, browser calls allowed:
  - values sit under `properties.parameter.{NAME}`, keyed `YYYYMM`, plus a `YYYY13` annual key
  - the fill value is `-999.0`, given in `header.fill_value`
  - one call can carry at least 21 parameters
- **Products:**
  - 8 variables come from MERRA-2 and start 1981-01.
  - `ALLSKY_SFC_SW_DWN` and `CLOUD_AMT` come from CERES SYN1deg and start in **2001**. Before 2001, POWER joins them to an older product (SRB), with fill values for 1981-1983. Starting in 2001 keeps one product per series.
- **Regional series:** a `cos(latitude)`-weighted mean of 9 sample points per box, renormalized over the points with a value that month. Each file's `source` is the catalog source plus ", sampled regional mean of 9 points".
- **The full grid is complete:** all 120 files have every month (540 for MERRA-2, 300 for CERES). The 216 raw responses are cached in `scripts/.cache/`, which git ignores.
- **Demo numbers:** Dev B cross-checked the two demo cases in Python (issue 17), and `src/data/pipeline.test.ts` locks them.

## Checklist

### Data retrieval and reliability (`src/data`, section 8)

- [ ] **Error mapping:**
  - HTTP 429 gives `rate-limit`.
  - A rejected `fetch` gives `network`.
  - Any other HTTP error, an unreadable body, a missing parameter in the response, or a missing region file gives `unavailable`.
  - Each message matches section 8 word for word.
- [ ] **Caching:** the same request twice makes one call; a failed request is evicted, so a retry works; different variables or places never share an entry.
- [ ] **Coordinates:** rounded once to 2 decimals, and the same string is used in both the request and `placeId`. Check signed zero: `(-0.001).toFixed(2)` is `"-0.00"`.
- [ ] Static paths use `import.meta.env.BASE_URL`. A point with `powerParameter: null` makes no request.
- [ ] Parsing keeps only months 01-12, sorted, and maps the fill value, `null` and non-numbers to `null`.
- [ ] What happens when POWER is up but returns HTTP 200 with an error body, or a parameter it doesn't know?

### Data files (sections 4.1 and 6)

- [ ] Every catalog field is present:
  - `id` equals `powerParameter`
  - `name` is lower case
  - each definition is one plain sentence
  - the unit matches POWER's unit for that parameter (POWER says `C` and `MJ/m^2/day`; the app shows `°C` and `MJ/m²/day`)
- [ ] Each series' first year equals its variable's `startYear`, its unit equals the catalog unit, and its source names the catalog product.
- [ ] Regions have `south < north` and `west < east`, none crosses the 180° meridian, and ids are lower case with hyphens.
- [ ] Every lead names a real region and variable, and has an `https` source.

### Offline data script (`scripts/precompute.py`, section 7.4)

- [ ] **Sampling and weighting:** sample points at 1/6, 3/6 and 5/6 of each side; `cos` takes radians; weights renormalize when some points are missing.
- [ ] **Back-off and output:** HTTP 429 back-off waits 30, 60, 120 and 120 seconds, then stops with a clear error; 30-second timeout; output written with `allow_nan=False`, LF line endings, values rounded to 4 decimals.
- [ ] **Cache key:** it includes the point, the start year and the parameter list. The start-year grouping can never mix SRB and SYN1deg in one series.

### Statistics (`src/stats`, section 7.1)

- [ ] **Matches the reference tools.** Regenerate the fixtures with `python scripts/make_stats_fixtures.py` (after `pip install -r scripts/requirements.txt`) and diff against `src/stats/fixtures.json`. Differences around 1e-16 are floating-point noise, not edits.
- [ ] **Formulas:** tie correction counts within each calendar month for the seasonal test; continuity correction; zero variance gives `p = 1`; Sen's median sorts numerically; OLS centres `t`; the 1.98 shortcut carries its comment.
- [ ] **Gaps:** time positions come from the dates, not the array index.
  - The `pyMannKendall` fixtures have no gaps, so behaviour with gaps is tested only by hand cases.
  - Probe gaps in the middle, and a record that starts mid-year.
  - `deseasonalize` must use only non-missing values.
- [ ] **No `NaN` ever:** check short, constant, all-ties, two-value and alternating series.

### Verdict, place helpers and clue engine

- [ ] **Verdict boundaries (section 7.2):**
  - `mkP` of exactly 0.05 is not significant.
  - An interval end equal to 0 doesn't exclude 0.
  - The slope's sign must agree with the interval's side.
  - Rate formatting at the extremes: 0 gives "0", and very small and very large rates never use exponent form.
- [ ] **Place helpers:** `parsePoint` with a decimal comma, surrounding spaces, empty text, `"12abc"`, `"0x10"`, `"1e1"`, `Infinity`, and the exact edges ±90 and ±180.
- [ ] **Clue engine:**
  - It never asks a question that leaves any suspect with no answer (the coverage rule in 7.3).
  - Ties go to the earlier question.
  - Every catalog variable is reachable.

## Leads to verify (suspected, not yet confirmed)

- **Signed zero:** a coordinate between -0.005 and 0 gives `"-0.00"`, so the same place can get two cache keys and a request with `latitude=-0.00`. Check what POWER does with it.
- **Fixed end year:** `END_YEAR = 2025` in `src/data/index.ts` and `scripts/precompute.py`. Live points never include 2026 months. Confirm this is intended and consistent with the region files.
- **No shape check on region files:** `getSeries` trusts `series/*.json` without checking it. A malformed file would reach `analyze` unchecked.
- **Points near the poles or at sea:** coverage at a typed point near a pole, over the open ocean, or at exactly ±180° hasn't been checked live.
- **Live points for CERES variables:** these start in 2001, giving 300 months. Confirm that the 120-month minimum and the verdict behave the same as on the static files.

## How to check

- **All tests:** `npx vitest run && pytest scripts -v`. Type check and build: `npm run build`.
- **The pipeline test:** `src/data/pipeline.test.ts` walks the five screens through the section 4 functions on the real data. Extend your probes from it rather than starting over.
- **Live POWER calls:** allowed only for a few spot checks. Wait at least 1.5 seconds between calls, and send nothing personal (neutral test coordinates only). Never call POWER from a test.
- **Don't rerun `scripts/precompute.py` without the cache.** A fresh clone has no `scripts/.cache/`, so the script would make about 216 POWER calls and rewrite every series file.

## Reporting

Report each fault in the `IMPLEMENTATION.md` defect format:

```text
Title:    <module>: <what is wrong, in one line>
Owner:    Dev A | Dev B
Severity: blocks a gate | wrong result | cosmetic
Steps:    1. ... 2. ... (variable, place, toggle state, or exact inputs)
Expected: <what ARCHITECTURE.md section N says>
Actual:   <the exact value, message or exception>
Evidence: <function call and return value, or a failing test you ran locally>
Commit:   <short hash on main>
```

For each finding, include the smallest input that shows it. The owner then writes a failing test from it and fixes it in a new PR, as `CLAUDE.md` requires.

## Rules for you

- **Report, don't fix.** Give findings to the developer in chat. Don't edit tracked files, commit, push, open PRs or post GitHub issues unless the developer asks. Never edit another owner's files.
- **Never edit stats fixtures or expected values to make a test pass.** Find the cause.
- **Report what the data shows, even when it spoils a demo.** Never suggest tuning a threshold, region, period or product to change a verdict. Significance is 0.05, and there is no verdict below 120 non-missing months.
- **No new dependencies,** and no AI model calls at runtime.
- After the feature freeze at H13, only bug fixes and polish are allowed.
