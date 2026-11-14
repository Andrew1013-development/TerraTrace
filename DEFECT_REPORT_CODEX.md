# Back-end defect report

Reviewed **2026-11-14**, against `main` commit **20579cb** and `ARCHITECTURE.md` sections 2, 4, 6, 7 and 8. Scope: data access/files, offline preprocessing, clues, statistics, verdicts and place helpers.

**Status:** five open edge-case findings; no fixes applied. The existing test suites passed, and no incorrect result was found in the committed regional-data pipeline. Findings below are ordered by impact. Owners should add a failing regression test, fix in a new PR, and request review before marking an item resolved.

## Open findings

### 1. Malformed successful responses bypass error handling

Location: [src/data/index.ts](src/data/index.ts), lines 77 and 100.

```text
Title:    data: malformed successful responses bypass error handling
Owner:    Dev A
Severity: wrong result
Steps:    Mock the T2M/sahel region request as HTTP 200 with {}.
          Call getSeries, then analyze(result, true).
Expected: Sections 4.1–4.2 require a Series; section 8 maps unusable
          responses to DataError kind unavailable.
Actual:   getSeries resolves and caches {}. analyze throws:
          TypeError: Cannot read properties of undefined (reading 'filter')
Evidence: The throwaway rejection assertion failed: promise resolved {}.
          Related probe: {properties:{parameter:{T2M:[]}}} also resolves
          successfully, as a live Series with empty dates and values.
Commit:   20579cb
```

Reproduced with malformed mock responses, not the committed region files.

### 2. Boolean measurements become numeric observations

Location: [scripts/precompute.py](scripts/precompute.py), line 55.

```text
Title:    precompute: Boolean measurements become numeric observations
Owner:    Dev A
Severity: wrong result
Steps:    Inject this response for each sample point in region_series:
          {"properties":{"parameter":{"T2M":{"200001":true}}}}
Expected: Sections 6–7.4 and card A5 require consistent parsing with the
          live client: non-number measurements become null.
Actual:   Python treats bool as int; true becomes a regional value of 1.0.
Evidence: _monthly preserved True/False; region_series returned [1.0,0.0]
          for the two-month probe. The browser parser returned nulls.
Commit:   20579cb
```

Requires malformed upstream data. No Boolean measurements were observed in the committed files or live spot checks.

### 3. Extreme finite rates break verdict formatting

Location: [src/verdict/index.ts](src/verdict/index.ts), lines 9–14.

```text
Title:    verdict: extreme finite rates throw or produce nondecimal text
Owner:    Dev B
Severity: wrong result
Steps:    Call getVerdict with catalog T2M, place "test", and:
          {n:120, mkP:0.01, ci95:[1e-100,2e-100],
           slopePerDecade:1e-100, deseasonalized:true}.
Expected: Section 7.2: two significant figures, as a plain decimal.
Actual:   RangeError: toFixed() digits argument must be between 0 and 100
Evidence: The throwaway no-throw assertion failed. Additional finite
          slope probes: 1e21 prints "1e+21"; Number.MAX_VALUE prints
          "Infinity" (using mkP:0.01 and ci95:[1,2]).
Commit:   20579cb
```

Synthetic extremes only; ordinary rates and zero passed.

### 4. Short OLS inputs return NaN

Location: [src/stats/index.ts](src/stats/index.ts), lines 98–118.

```text
Title:    stats: short OLS inputs return NaN
Owner:    Dev B
Severity: wrong result
Steps:    Call olsSlopeCi([0,1], [5,5]).
Expected: Section 7.1: a constant series returns [0,0]; card B2 says
          never return NaN.
Actual:   [NaN,NaN], from division by n-2.
Evidence: The throwaway constant-two-value assertion failed. Empty,
          singleton and two-distinct-value inputs also returned NaN.
Commit:   20579cb
```

Limited to direct calls to the exported helper: `analyze` correctly returns `null` below 120 valid months, preventing this in the normal pipeline.

### 5. Signed zero duplicates place identities and requests

Location: [src/data/index.ts](src/data/index.ts), lines 95–98.

```text
Title:    data: signed zero creates duplicate identities and requests
Owner:    Dev A
Severity: cosmetic
Steps:    Request T2M at (-0.001,0), then at (0,0).
Expected: Sections 6 and 8: equivalent rounded coordinates share the
          request identity and cached request.
Actual:   placeIds are point:-0.00,0.00 and point:0.00,0.00;
          fetch runs twice.
Evidence: The throwaway one-call assertion received two calls. Live
          POWER requests at latitudes -0.00 and 0.00, longitude -140,
          both succeeded and returned identical measurement values.
Commit:   20579cb
```

No scientific-result difference was observed. Impact is inconsistent identity and redundant requests.

## Verification completed

- Required commands succeeded: `npm ci`, `pip install -r scripts/requirements.txt`, `npx vitest run` (**182 passed**), `pytest scripts -v` (**8 passed**), and `npm run build`.
- Fixture regeneration produced only floating-point noise: 24 numeric differences, maximum **8.88e-16**. Original fixture bytes were restored.
- Data checks passed for exact error messages/mappings, missing parameters and HTTP-200 error bodies, retry eviction, ordinary cache isolation/deduplication, `BASE_URL`, null-parameter rejection, month sorting/filtering and browser value normalization.
- Catalog fields/definitions, live unit metadata, series metadata, region bounds/IDs and lead references/HTTPS URLs passed.
- Offline sampling, cosine weighting/renormalization, 30-second timeout, back-off `[30,60,120,120]`, strict JSON, four-decimal rounding, LF output and cache/start-year grouping passed.
- Statistics matched fixtures and an independent reference with gaps, mid-year starts, ties and nulls. Verdict boundaries, ordinary wording, coordinate parsing and clue coverage/tie-breaking passed; all 10 variables were reachable across 13 explored states.

## Suspected leads resolved and remaining limits

| Lead | Result |
|---|---|
| Signed zero | Confirmed; finding 5. POWER accepts it. |
| Fixed end year | Intended: architecture section 6 explicitly ends at 2025; both implementations and regional files agree. |
| Missing region shape validation | Confirmed; finding 1. |
| Polar/ocean coverage | Four live calls, spaced at least 1.5 seconds apart, succeeded at `(-0.00,-140)`, `(0,-140)`, `(89.99,180)` and `(-89.99,-180)`. |
| Live CERES behavior | Both variables returned 300 valid months. Saved responses passed the data → statistics → verdict pipeline in both toggle states and the 119/120-month boundary. |

Exact ±90° was tested in coordinate parsing, not live; coverage elsewhere was not exhaustively sampled. The full precompute job was intentionally not run; its functions were tested with injected responses. Temporary review scripts, responses and logs were removed. These results describe the reviewed commit, not subsequent fixes.
