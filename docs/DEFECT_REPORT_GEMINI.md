# Front-end / back-end integration defect report

- **Reviewer:** Claude Code, standing in for Antigravity, following `GEMINI.md`
- **Commit reviewed:** `fc5e7b2` on `main`, 2026-11-15. The custom period work in `6d419bc` was not reviewed; the UI on `main` does not call it yet.
- **Live app:** https://andrew1013-development.github.io/TerraTrace/ (the bundle includes the D16 and D17 fixes)
- **Baseline:** `npx vitest run --dir src` gives 22 files and 195 tests passing; `npm run build` passes.
- **Nothing here has been fixed.** Owners: write a failing test first, then fix, in a new PR.

## Summary

| # | Finding | Owner | Severity |
|---|---|---|---|
| 1 | A failed load leaves the Evidence screen with no way out | Dev C | wrong result |
| 2 | The "mixed" verdict drops the sign; the Arctic demo reads as possible wetting | Dev B (wording), Dev C (§7.2) | cosmetic, misleading |
| 3 | A p-value of "0.050" can be significant or not | Dev C | cosmetic |
| 4 | The rate has a sign, the interval does not | Dev C | cosmetic |
| 5 | The chart draws the fit line when there is too little data | Dev C | cosmetic |
| 6 | Region lists start some names with a lower-case "the" | Dev C | cosmetic |
| 7 | "These two regions" also appears when one place is a point | Dev C | cosmetic |
| 8 | The second-witness error names no region and cannot be retried | Dev C | cosmetic |
| 9 | "%" makes a humidity rate read as a relative change | Dev A, Dev B | cosmetic |
| T1 | `npx vitest run` from the repo root also runs every worktree's tests | Dev A | tooling |

## Defects

### 1. A failed load leaves the Evidence screen with no way out

```text
Title:    ui/App: after a failed series load the Evidence screen has no button or link
Owner:    Dev C (screen, and a gap in the §5 contract)
Severity: wrong result
Steps:    1. Clues: "It feels windier or calmer", then Continue (wind speed).
          2. Choose "the Sahara", then "Use this region".
          3. Hunch "no change", then "Yes, show me the evidence".
          4. The request fails (network off). Toggle on.
Expected: §8 shows "We couldn't reach NASA's data service. Check your connection, or try a
          prepared region." To try a prepared region the user needs a way back to the scene,
          but §5 defines no event for it. The spec has a gap.
Actual:   <main> holds only the h1 and the alert. A page reload is the only way out.
          For a region the message is also wrong: the file comes from GitHub Pages, not
          NASA's data service, and the user already chose a prepared region.
Evidence: [...document.querySelectorAll('main button, main a')] returns [].
          src/ui/Evidence.tsx:27-31 has no action in the error state.
          src/App.tsx:53-56 accepts "change" only from "brief".
Commit:   fc5e7b2
```

### 2. The "mixed" verdict drops the sign

```text
Title:    verdict: the mixed sentence gives no direction, so the Arctic demo reads as possible wetting
Owner:    Dev B (wording). The §7.2 contract change is Dev C's.
Severity: cosmetic (misleading)
Steps:    1. Solved case "Is the Arctic getting wetter?", hunch rising, toggle on.
          2. "See the verdict".
Expected: §7.2 uses the absolute rate. The code matches the spec, so the fault is in the spec.
Actual:   Evidence shows "−0.026 mm/day" and "−0.030 to 0.0060 mm/day". The verdict says
          "may be changing, by about 0.026 mm/day per decade". The lead for this region is
          titled "The Arctic is getting rainier".
Evidence: analyze(PRECTOTCORR/arctic-canada, true) gives slope −0.0261, mkP < 0.001,
          ci95 [−0.0300, 0.0060]; getVerdict(...).kind is "mixed".
Commit:   fc5e7b2
```

Report what the data shows: change the wording, not the region, period or threshold.

### 3. A p-value of "0.050" can be significant or not

```text
Title:    ui/Evidence: 3-decimal p-values read "0.050" on both sides of the threshold
Owner:    Dev C (Evidence and the §9 rule)
Severity: cosmetic
Steps:    Any series with 0.0495 <= mkP < 0.0505. Not seen in the shipped data.
Expected: §9 gives 3 decimals and the label "p-value (below 0.05 counts as significant)".
Actual:   pValue(0.0496) and pValue(0.0504) both give "0.050". The first is significant,
          the second is not.
Evidence: src/ui/Evidence.tsx:16
Commit:   fc5e7b2
```

### 4. The rate has a sign, the interval does not

```text
Title:    ui/Evidence: rate shows "+", interval does not
Owner:    Dev C
Severity: cosmetic
Steps:    Solved case "Is the Tibetan Plateau warming?", toggle on, Evidence screen.
Expected: one number style on the screen (§4.6 formatNumber).
Actual:   "+0.23 °C" next to "0.17 to 0.28 °C".
Evidence: src/ui/Evidence.tsx:55 calls formatNumber without `signed` for the interval.
Commit:   fc5e7b2
```

### 5. The chart draws the fit line when there is too little data

```text
Title:    ui/Evidence: Chart and its fit line render when analyze returns null
Owner:    Dev C
Severity: cosmetic
Steps:    Any series with fewer than 120 valid months. Found by reading the code.
Expected: §8 says "no statistics or verdict".
Actual:   Chart draws linearRegressionY and the caption "Line: straight-line fit to the
          points shown." whatever the result.
Evidence: src/ui/Evidence.tsx:66
Commit:   fc5e7b2
```

### 6. Region lists start some names with a lower-case "the"

```text
Title:    ui: region names written for sentences are shown as list items
Owner:    Dev C
Severity: cosmetic
Steps:    Scene radio list; the "Compare another region" select; the "Case so far" panel.
Expected: names that read well in a list. §4.4 names are written to follow "in".
Actual:   "the Sahel" and "the Mekong Delta" appear next to "Arctic Canada" and
          "Central Siberia".
Commit:   fc5e7b2
```

### 7. "These two regions" also appears when one place is a point

```text
Title:    ui/VerdictView: opposite-directions line calls a typed point a region
Owner:    Dev C (§9 text)
Severity: cosmetic
Steps:    Typed point, then compare a region whose verdict is the opposite direction.
          Found by reading the code.
Actual:   "These two regions are moving in opposite directions." is fixed text.
Evidence: src/ui/VerdictView.tsx:87
Commit:   fc5e7b2
```

### 8. The second-witness error names no region and cannot be retried

```text
Title:    ui/VerdictView: witness error is generic, and choosing the same region again does nothing
Owner:    Dev C
Severity: cosmetic
Steps:    1. Solved case "Is the Tibetan Plateau warming?", then "See the verdict".
          2. Network off. 3. Compare with "the Sahel".
Actual:   The alert shows the generic network message with no region name. The select stays
          on "the Sahel", so choosing it again fires no change event. The user must pick
          another region and come back.
Commit:   fc5e7b2
```

### 9. "%" makes a humidity rate read as a relative change

```text
Title:    data/catalog: RH2M unit "%" reads as a relative change in the verdict
Owner:    Dev A (catalog unit), Dev B (wording)
Severity: cosmetic
Steps:    Relative humidity, coordinates "14,5" and "0,25", toggle on, verdict.
Actual:   "has risen by about 0.76 % per decade". The change is in percentage points.
Commit:   fc5e7b2
```

### T1. Worktree tests run from the repo root

`npx vitest run` from the repo root also collects the tests in `.claude/worktrees/*`: 110 files and 959 tests, against 22 files and 195 tests on `main`. A worktree's failure can make `main` look red, and the inflated count hides which tests belong to `main`. CI is not affected. Fix: add `.claude/**` to `test.exclude` in `vite.config.ts`. Owner: Dev A.

## Leads from `GEMINI.md`

- **Point wording: ruled out.** Fixed by `37e65d0` (D17). The live app reads "relative humidity in the area around 14.50, 0.25", and §4.4 matches.
- **Interval format: partly ruled out.** The interval now uses the true minus "−" from `formatNumber` (D16). Uneven decimals such as "−0.030 to 0.0060" follow the §4.6 rule of 2 significant figures. Only the missing "+" remains (defect 4).

## Checked and correct

- **Contract:** every UI import from a logic folder is a §4 export. No logic folder imports `ui`. `src/types.ts` matches §4.1. All six components take the §9 props.
- **No logic in the UI:** no thresholds, tags, region ids or verdict sentences in `src/ui` or `src/App.tsx`. The only numbers are inside spec message text.
- **State (§5):** "Change" clears `variable`, `place` and `hunch`. "Open a new case" resets everything, the toggle included. A solved case opens the brief with both values set.
- **Late responses:** ignored by the reducer and by the witness's latest-request check; unit tests cover both.
- **Requests:** one `getSeries` call per case, made on confirm. The toggle makes no request. A typed point makes exactly one POWER request (`latitude=14.50&longitude=0.25`).
- **Second witness:** offers only prepared regions and leaves out the current one (a point case offers all 12). Uses the same toggle state: with the toggle off the Sahel showed "No significant trend", which matches `analyze(series, false)`. An error leaves the first card in place.
- **Messages and roles:** loading uses `role="status"`; errors use `role="alert"` with the exact `DataError` message. The coordinate error shows the §8 text, is linked by `aria-describedby="coord-error"` with `aria-invalid`, and makes no POWER request. A decimal comma is accepted.
- **Display:** a source line on Evidence and on every verdict card; units from the series or variable; the p-value label and "< 0.001"; the y-axis label and chart caption; the verdict kind as a word with no colour per kind; rate, p-value and interval as text.
- **Focus and layout:** each screen moves focus to its h1. No horizontal scroll at 375 px on the clues, brief, evidence and verdict screens.

## Not checked

- **Real network-off:** the review browser has no offline switch. `window.fetch` was made to reject with a `TypeError`, which is what a browser does offline. The 30-second timeout path was not run.
- **HTTP 429 message:** not triggered, to avoid hammering POWER.
- **Too little data, and a variable with `powerParameter: null`:** neither exists in the shipped data. Checked by code and unit tests only. An all-fill polar or ocean point was not tried.
- **Late response on the main screen, live:** the UI offers no way to change the selection while loading. Only the reducer test covers it.
- **Screen readers:** roles and labels checked in the DOM, not with a real screen reader.
- **The scene screen at 375 px.**

## Notes for the back-end review (Codex), not integration faults

- **Sen's slope can fall outside the OLS interval.** Example: Sahel precipitation, toggle on, slope 0.0015, interval [0.0103, 0.0974]. Also seen for Tibetan Plateau precipitation, central Amazon RH2M and central Amazon T2M_MAX.
- **Arctic Canada air temperature reads "fall".** One live POWER request at 73, −95 shows the same drop after 2004, so the app reports the source faithfully. The demo team should know.
