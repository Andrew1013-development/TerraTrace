# Back-end defect report

Reviewed **2026-11-15**, baseline **`6d419bc`** (detached checkout approved by the developer). Scope: data access/files, offline precompute, clues, stats, verdict and place helpers against `ARCHITECTURE.md` sections 2, 4, 6, 7 and 8.

Four open findings, reproduced with malformed responses or synthetic inputs. None was observed in the committed regional data. The blocking severities below describe the reproduced failure conditions; the existing test/build gates passed. Owners should reproduce each finding in a failing test before fixing it in a separate PR. No implementation changes accompany this report.

## Open findings

### BR-01 — Regional validation allows an analysis crash

- **Title:** data: regional validation permits contents that crash analyze
- **Owner:** Dev A
- **Severity:** blocks a gate
- **Steps:** Mock the T2M/sahel response as `{"dates":[null],"values":[1]}`; call `getSeries(T2M, {kind:"region", id:"sahel"})`.
- **Expected:** Sections 4.1/4.2 require a valid `Series`; section 8 requires an unusable response to become `DataError("unavailable")`.
- **Actual:** The malformed object resolves unchanged and is cached. Only array presence and equal lengths are validated.
- **Evidence:** The one-element payload above is accepted. For the downstream crash, use 120 monthly dates (`2000-01` through `2009-12`), replace the first date with `null`, and use 120 values of `1`. After loading, `analyze(series, true)` throws `TypeError: Cannot read properties of null (reading 'split')`.
- **Commit:** `6d419bc`
- **Location:** `src/data/index.ts:102–108` (`loadRegion`).

Related boundary gap: an HTTP-200 catalog body of `null` makes `loadCatalog()` resolve to `null`, violating its array contract (`loadFile`, line 30).

### BR-02 — Offline cache retains an error response indefinitely

- **Title:** precompute: an error response poisons the raw cache across retries
- **Owner:** Dev A
- **Severity:** blocks a gate
- **Steps:** With an empty temporary cache, fetch T2M at `(0,0)`, start year 1981. Mock the first HTTP-200 body as `{"messages":["failure"]}` and the next response as valid measurements. Parse the result, then retry using a fresh `make_fetch`.
- **Expected:** Sections 6/7.4 require regional series built from measurements. Recovery should permit a new retrieval after an invalid response; this is a reliability requirement inferred from that workflow, not an explicit offline eviction rule in the spec.
- **Actual:** The body is cached before parsing. Every retry reads the same invalid body and fails, even after upstream recovery.
- **Evidence:** Both attempts raised `KeyError('properties')`; network-call count stayed **1**. Cache file: `0_0_1981-2025_T2M.json`.
- **Commit:** `6d419bc`
- **Location:** `scripts/precompute.py:110–116` (`make_fetch`).

### BR-03 — Malformed POWER data becomes an empty successful record

- **Title:** data: malformed parameter data is cached as an empty Series
- **Owner:** Dev A
- **Severity:** wrong result
- **Steps:** Mock HTTP 200 with `{"properties":{"parameter":{"T2M":[]}}}`; call `getSeries(T2M, {kind:"point", lat:0, lon:0})` twice.
- **Expected:** Sections 4.2/8: reject unusable data as `unavailable`, with `This data isn't available for that place. Try a prepared region.`
- **Actual:** Both calls resolve with `dates:[]` and `values:[]`, misrepresenting a retrieval failure as a record with zero months.
- **Evidence:** Two calls made **one fetch**. Parameter bodies `{}` and `{"error":"unknown parameter"}` also returned empty series. A missing parameter or a top-level error body is correctly rejected.
- **Commit:** `6d419bc`
- **Location:** `src/data/index.ts:81–84` (`loadPoint`).

### BR-04 — Tiny nonzero rates print as zero

- **Title:** verdict: tiny rates violate the two-significant-figure contract
- **Owner:** Dev B
- **Severity:** cosmetic
- **Steps:** Call `formatNumber(1e-11)`. Then call `getVerdict` with T2M, place `"test"`, and `{n:120, mkP:0.01, slopePerDecade:1e-11, ci95:[1e-11,2e-11], deseasonalized:false}`.
- **Expected:** Section 4.6 requires a plain decimal with two significant figures: `0.000000000010`.
- **Actual:** Formatting returns `"0"`; the verdict says `Air temperature in test has risen by about 0 °C per decade, and the evidence is strong.`
- **Evidence:** Both calls reproduced this. A 120-month linear series with `values[i] = i * 1e-14` also produces the zero-rate rise sentence through `analyze(series, false)`.
- **Commit:** `6d419bc`
- **Location:** `src/verdict/index.ts:13,48`.

The below-`1e-10` floor is deliberate and covered by existing tests, but differs from the written formatting contract. Resolve that discrepancy explicitly; do not change statistical thresholds or tune data to alter verdicts.

## Verification completed

- `npm ci`, `pip install -r scripts/requirements.txt`, and `npm run build` succeeded.
- `npx vitest run`: **205 tests passed**. Python suite: **10 passed**, using `pytest scripts -v --basetemp .review-pytest-temp` after the default sandbox temp directory failed.
- Stats fixtures regenerated and diffed: maximum absolute difference **8.88e-16** (floating-point noise). Original fixture bytes restored.
- Correct: standard error kinds/messages; rejection eviction and request isolation; coordinate rounding; `BASE_URL`; null-parameter request suppression; month sorting and missing-value parsing.
- Correct: catalog fields/definitions/units, series start years/units/sources, region bounds/IDs, lead references and HTTPS URLs.
- Correct: sampling, cosine weighting/renormalization, timeout/backoff, output rounding/JSON/LF, cache-key fields and product grouping.
- Correct: statistical formulas/reference comparisons, gaps/mid-year starts, missing-value climatology, short/tied/alternating cases, 119/120-month boundary, verdict boundaries/direction agreement, coordinate parsing, clue coverage/tie-breaking and all ten variables' reachability.
- Decimal constant-series intervals showed only negligible floating-point noise (about `1.4e-16`), with no verdict change or NaN.

## Suspected leads resolved and limits

| Lead | Result |
| --- | --- |
| Signed zero | Already normalized to `0.00` in requests/cache keys. POWER also accepted a direct `-0.00` request. |
| Fixed end year | `2025` is explicit in section 6 and consistent with regional files. |
| Regional shape validation | Partial protection exists; BR-01 remains. |
| Poles/ocean/dateline | Live calls succeeded at `(89.99,180)`, `(-89.99,-180)` and `(0,-140)`. |
| Live CERES | Both variables returned 300 usable months at all four checked points, including signed-zero `(0,0)`. Captured responses passed through the parser, both analysis modes and the minimum-length boundary. |

No required check remains blocked. Four neutral live calls were spaced at least 1.6 seconds apart. Exact ±90° was checked through parsing only; coverage is not exhaustive. Failure cases used mocks. The full precompute generator was not run. Screen integration remains Antigravity's area. Throwaway probes were removed; the review changed no implementation or data files.
