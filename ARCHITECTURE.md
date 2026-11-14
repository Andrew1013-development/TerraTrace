# Case File: architecture

The build reference for all three developers and their Claude sessions. The spec says what and why. The plan says who does what, when. This file says exactly how the parts fit, so a session can build one part without reading the others.

**How to use it:** read section 2 once. Then read only the sections your task names.

**Status:** written before the build. Items marked "verify" are unconfirmed and are checked in the task that first touches them.

## 1. System at a glance

Case File is a static web app: files on GitHub Pages, no server of ours, no accounts, no AI model at runtime.

```text
 Browser
 +-----------------------------------------------------------+
 |  UI (src/ui, src/App.tsx)                      Dev C      |
 |    Clues -> Scene -> Brief -> Evidence -> Verdict         |
 |        |        |               |            |            |
 |  +-----v--+ +---v----+   +------v---+  +-----v-----+      |
 |  | clues  | | place  |   |  stats   |  |  verdict  |      |
 |  | Dev A  | | Dev B  |   |  Dev B   |  |  Dev B    |      |
 |  +--------+ +--------+   +----------+  +-----------+      |
 |        |                                                  |
 |  +-----v--------------------------------------------+     |
 |  | data (src/data)                          Dev A   |     |
 |  | loadCatalog, loadRegions, loadLeads, getSeries   |     |
 |  +-------+----------------------------+-------------+     |
 +----------|----------------------------|-------------------+
            | static JSON                | live HTTPS
   public/data/*.json            NASA POWER monthly API
   (made by scripts/precompute.py, run once during the event)
```

## 2. Rules every session follows

1. **Dependencies point one way.** `ui` may import every other folder. `clues`, `place`, `stats` and `verdict` import only `src/types.ts`. `data` imports only `src/types.ts`. No folder imports `ui`.
2. **Logic is pure.** `clues`, `place`, `stats` and `verdict` have no `fetch`, no DOM, no dates from the clock and no randomness. Same input, same output.
3. **UI holds no logic.** A component calls a function from another folder and renders the result. If a component needs an `if` about data or statistics, that `if` belongs in a logic folder.
4. **The contract is fixed.** `src/types.ts` and the signatures in section 4 change only through Dev C, in one PR, announced aloud.
5. **Stub first.** The first commit of any logic task is the file with its final exported signatures, each body `throw new Error("not implemented")`. Merge it at once, so the UI can import it.
6. **No new dependencies** beyond section 3 without Dev C's agreement.
7. **Honesty over drama.** Never tune a threshold, a region or a period to get a more striking verdict.

## 3. Stack and folders

**Stack:** Vite, React, TypeScript (strict), Vitest, React Testing Library (with `@testing-library/user-event` and `@testing-library/jest-dom`), jsdom, Observable Plot. Python, pytest, requests, numpy, scipy, pyMannKendall for scripts. Plain CSS with custom properties. Pin exact versions at H0 from what `npm create vite` installs.

| Path | Holds | Owner |
|---|---|---|
| `.github/workflows/ci.yml`, `deploy.yml` | Tests on every PR; deploy `main` to Pages | Dev A |
| `scripts/` | `precompute.py`, `make_stats_fixtures.py`, tests, `requirements.txt` | Dev A (`make_stats_fixtures.py`: Dev B) |
| `public/data/` | `catalog.json`, `regions.json`, `leads.json`, `series/`, `demo/` | Dev A (`leads.json` text: Dev B) |
| `src/types.ts` | Every shared type | Dev B writes, Dev C approves |
| `src/fixtures/` | Sample data for tests and early UI work | Dev B |
| `src/data/` | Loaders, `getSeries`, `DataError`, `demoCases` | Dev A |
| `src/clues/` | Questions and the clue engine | Dev A |
| `src/place/` | Coordinate parsing, place names, leads lookup | Dev B |
| `src/stats/` | Trend statistics | Dev B |
| `src/verdict/` | Verdict rule and wording, hunch line, comparison | Dev B |
| `src/App.tsx`, `src/ui/`, `src/styles/`, `index.html` | All screens, state and styling | Dev C |
| `README.md`, `SOURCES.md`, `AI_USE.md`, `CLAUDE.md` | Project documents | Dev A, Dev A, Dev B, Dev C |

## 4. Contracts

### 4.1 Types (`src/types.ts`)

```ts
export type Place =
  | { kind: "region"; id: string }
  | { kind: "point"; lat: number; lon: number };

export type Variable = {
  id: string;                    // equals the POWER parameter name when there is one
  name: string;                  // plain name, lower case, for sentences: "precipitation"
  definition: string;            // one sentence a 15-year-old understands
  unit: string;                  // as shown to users: "mm/day"
  source: string;                // product and version, for citation
  powerParameter: string | null; // null = regions only, no live points
  startYear: number;             // first year of the record
  tags: string[];                // clue engine matches answers against these
};

export type Region = {
  id: string; name: string;
  bbox: [number, number, number, number]; // [south, west, north, east], west < east
};

export type Lead = { regionId: string; variableId: string; text: string; sourceUrl: string };

export type Series = {
  variableId: string; placeId: string; unit: string;
  source: string;
  dates: string[];           // "YYYY-MM", ascending
  values: (number | null)[]; // same length as dates; null = missing
};

export type TrendResult = {
  n: number;                 // non-missing months used
  slopePerDecade: number;    // Sen's slope
  ci95: [number, number];    // OLS slope interval, per decade
  mkP: number;
  deseasonalized: boolean;
};

export type Verdict = { kind: "rise" | "fall" | "mixed" | "none"; text: string; caveat: string };
export type Hunch = "rise" | "fall" | "none";

export type Question = {
  id: string; text: string;
  options: { label: string; tags: string[] }[];
};

export type DemoCase = { id: string; title: string; variableId: string; place: Place };
```

`placeId` is the region id, or `point:{lat},{lon}` with 2 decimals.

### 4.2 Data (`src/data/index.ts`, Dev A)

```ts
export class DataError extends Error {
  kind: "rate-limit" | "network" | "unavailable";
}
export function loadCatalog(): Promise<Variable[]>;
export function loadRegions(): Promise<Region[]>;
export function loadLeads(): Promise<Lead[]>;
export function getSeries(variable: Variable, place: Place): Promise<Series>;
export const demoCases: DemoCase[]; // exactly 2
```

### 4.3 Clues (`src/clues/index.ts`, Dev A)

```ts
export const questions: Question[];
export function narrow(suspects: Variable[], option: { tags: string[] }): Variable[];
export function liveOptions(question: Question, suspects: Variable[]): Question["options"];
export function nextQuestion(suspects: Variable[], askedIds: string[], questions: Question[]): Question | null;
```

### 4.4 Place (`src/place/index.ts`, Dev B)

```ts
export function parsePoint(lat: string, lon: string): Place | null;
export function placeName(place: Place, regions: Region[]): string;
export function leadsFor(leads: Lead[], regionId: string, variableId: string): Lead[];
```

### 4.5 Stats (`src/stats/index.ts`, Dev B)

```ts
export function monthIndex(date: string): number;
export function countValid(series: Series): number;
export function deseasonalize(series: Series): (number | null)[];
export function senSlopePerMonth(t: number[], y: number[]): number;
export function mannKendallP(y: number[]): number;
export function seasonalMannKendallP(y: number[], months: number[]): number;
export function olsSlopeCi(t: number[], y: number[]): [number, number];
export function analyze(series: Series, deseasonalized: boolean): TrendResult | null;
```

### 4.6 Verdict (`src/verdict/index.ts`, Dev B)

```ts
export function getVerdict(result: TrendResult, variable: Variable, place: string): Verdict;
export function hunchLine(hunch: Hunch, verdict: Verdict): string;
export function oppositeDirections(a: Verdict, b: Verdict): boolean;
```

### 4.7 Fixtures (`src/fixtures/index.ts`, Dev B)

`sampleSeries` (180 synthetic months), `sampleCatalog` (4 variables with tags), `sampleRegions` (3), `sampleLeads` (2), `sampleResult` (a `TrendResult`). All labeled synthetic. Tests and early UI work use these, never live data.

## 5. App state (`src/App.tsx`, Dev C)

One `useReducer`. No router and no global store.

```ts
type Screen = "clues" | "scene" | "brief" | "evidence" | "verdict";
type CaseState = {
  screen: Screen;
  variable?: Variable; place?: Place; hunch?: Hunch;
  deseasonalized: boolean;            // starts true
  load: { status: "idle" | "loading" | "ready" | "error"; series?: Series; error?: DataError };
};
```

| From | Event | To | Effect |
|---|---|---|---|
| `clues` | Variable chosen | `scene` | Store `variable` |
| `clues` | Solved case opened | `brief` | Store that case's `variable` and `place` |
| `scene` | Place picked | `brief` | Store `place` |
| `brief` | Confirmed with a hunch | `evidence` | Store `hunch`; call `getSeries`; `load.status = "loading"` |
| `brief` | "Change" | `clues` | Clear `variable`, `place`, `hunch` |
| `evidence` | "See the verdict" | `verdict` | None |
| `verdict` | "Open a new case" | `clues` | Reset everything |
| Any | `getSeries` fails | Same screen | `load.status = "error"` |

A response from `getSeries` is ignored if the variable or place has changed since the request started.

## 6. Data files (`public/data/`)

All paths are read with `import.meta.env.BASE_URL` as the prefix.

| File | Shape |
|---|---|
| `catalog.json` | `Variable[]` |
| `regions.json` | `Region[]` |
| `leads.json` | `Lead[]` |
| `series/{variableId}/{regionId}.json` | `Series` |
| `demo/{demoCaseId}.json` | `Series`, a saved copy for when POWER is unreachable |

Example `series` file:

```json
{
  "variableId": "T2M", "placeId": "sahel", "unit": "°C",
  "source": "NASA POWER monthly, sampled regional mean of 9 points",
  "dates": ["1981-01", "1981-02"], "values": [24.1, null]
}
```

**Live point request (verify in the data task before relying on it):**

```text
https://power.larc.nasa.gov/api/temporal/monthly/point?parameters={powerParameter}&community=AG&longitude={lon}&latitude={lat}&start={startYear}&end=2025&format=JSON
```

Known from a live call on November 4: the endpoint works without a key and allows browser calls. Not yet known: the exact JSON path to the monthly values, the fill value, whether a 13th "annual" key exists, how many parameters one call may carry, and coverage near the poles. The data task captures a real response first and writes its tests from that.

## 7. Algorithms

### 7.1 Statistics

Inputs are the non-missing points in time order. `t = monthIndex(date) = year * 12 + (month - 1)`, so gaps keep their true spacing.

**Mann-Kendall p-value**

```text
S   = sum over all pairs i < j of sign(y[j] - y[i])
Var = ( n(n-1)(2n+5) - sum over tie groups of t(t-1)(2t+5) ) / 18
      where a tie group is a set of equal values and t is its size
Z   = (S - 1) / sqrt(Var)   if S > 0
      (S + 1) / sqrt(Var)   if S < 0
      0                     if S = 0
p   = 2 * (1 - Phi(|Z|))
```

If `Var` is 0, return `p = 1`. `Phi` is the standard normal CDF; compute it from the Abramowitz-Stegun 7.1.26 `erf` approximation, whose error (about 1.5e-7) is far below the test tolerance.

Hand check: `y = [1, 2, 3, 4, 5]` gives `S = 10`, `Var = 16.667`, `Z = 2.2045`, `p = 0.0275`.

**Seasonal Mann-Kendall p-value:** split the values by calendar month. Compute `S` and `Var` for each month's values in year order. Add the 12 `S` values and the 12 `Var` values, then apply the same `Z` and `p` formulas.

**Sen's slope:** the median of `(y[j] - y[i]) / (t[j] - t[i])` over all pairs `i < j`.

**OLS interval**

```text
b  = sum((t - tMean)(y - yMean)) / sum((t - tMean)^2)
a  = yMean - b * tMean
SE = sqrt( sum((y - a - b*t)^2) / (n - 2) / sum((t - tMean)^2) )
CI = [b - 1.98 * SE, b + 1.98 * SE]
```

A constant series returns `[0, 0]`. The code carries this comment: `// shortcut: fixed t critical for n>=120 (df 118 gives 1.980), use a t quantile if the minimum length drops.`

**Deseasonalize:** for each calendar month, take the mean of its non-missing values. Each value becomes itself minus its month's mean. Missing stays missing.

**`analyze(series, deseasonalized)`**

| Step | Rule |
|---|---|
| 1 | If `countValid(series) < 120`, return `null` |
| 2 | `deseasonalized = false`: `mkP` is plain Mann-Kendall on raw values; slope and interval on raw values |
| 3 | `deseasonalized = true`: `mkP` is seasonal Mann-Kendall on raw values; slope and interval on anomalies |
| 4 | Multiply the per-month slope and interval by 120 for per-decade values |

### 7.2 Verdict

Significance level 0.05. "Excludes 0" means both ends of `ci95` are above 0, or both are below 0.

| `mkP < 0.05` | `ci95` excludes 0 | `kind` |
|---|---|---|
| Yes | Yes | `rise` if the slope and the interval are both above 0; `fall` if both are below 0; otherwise `mixed` |
| Yes | No | `mixed` |
| No | Yes | `mixed` |
| No | No | `none` |

`mkP` of exactly 0.05 is not significant. An interval that touches 0 does not exclude it.

**Wording.** `{rate}` is the absolute `slopePerDecade` at 2 significant figures, as a plain decimal.

| `kind` | `text` |
|---|---|
| `rise` | "{Name} in {place} has risen by about {rate} {unit} per decade, and the evidence is strong." |
| `fall` | "{Name} in {place} has fallen by about {rate} {unit} per decade, and the evidence is strong." |
| `mixed` | "{Name} in {place} may be changing, by about {rate} {unit} per decade, but our two checks disagree. Treat this as uncertain." |
| `none` | "We found no significant long-term trend in {name} in {place}. That is a real result: it has stayed within its normal ups and downs." |

`caveat`, on every verdict: "Monthly values are often related to their neighbours, which can make a trend look more certain than it is."

**Hunch line**

| Case | Text |
|---|---|
| Verdict is `mixed` | "Your hunch is neither confirmed nor ruled out." |
| Hunch equals the verdict kind | "Your hunch was right." |
| Anything else | "The evidence does not support your hunch." |

**`oppositeDirections(a, b)`** is true only when one verdict is `rise` and the other is `fall`.

### 7.3 Clue engine

- `narrow` keeps the variables that have at least one of the option's tags.
- `liveOptions` returns the options that keep at least one suspect.
- `nextQuestion` considers unasked questions that have at least 2 live options and where some option removes a suspect. It returns the one whose largest group after any answer is smallest. Ties go to the earlier question. It returns `null` when one suspect remains or no question qualifies; the screen then lists the remaining suspects to choose from.

Questions are plain language and each option carries tags, for example "Is it about air, water, land or living things?" with tags `air`, `water`, `land`, `life`. Every variable must have at least one tag from the first question.

### 7.4 Regional mean (`scripts/precompute.py`)

For each region, sample a 3 by 3 grid of points inside the bbox, at 1/6, 3/6 and 5/6 of each side. Request POWER for each point. For each month, take the mean weighted by `cos(latitude)`, skipping missing values; a month with no values is `null`. Pause between calls and back off after HTTP 429.

Nine points is a coarse sample, so the `source` text says "sampled regional mean of 9 points" and the app shows it.

## 8. Errors and edge cases

| Situation | Behavior | Where |
|---|---|---|
| POWER returns HTTP 429 | `DataError` kind `rate-limit`; message "NASA's data service is busy. Try a prepared region, or wait a minute." | `data`, shown by `ui` |
| Network failure | `DataError` kind `network`; message "We couldn't reach NASA's data service. Check your connection, or try a prepared region." | `data`, `ui` |
| Point place with `powerParameter: null` | `DataError` kind `unavailable`, with no request made | `data` |
| Any other HTTP error, a missing region file, or an unreadable response | `DataError` kind `unavailable`; message "This data isn't available for that place. Try a prepared region." | `data`, `ui` |
| Demo case at a point place and POWER fails | Load `demo/{id}.json` instead, silently. Region cases are already static files | `data` |
| Fill values in a response | Mapped to `null` | `data` |
| Fewer than 120 valid months | `analyze` returns `null`; screen shows "Not enough data for a verdict. We need at least 120 months and this record has {n}." | `stats`, `ui` |
| Constant series | `mkP = 1`, interval `[0, 0]`, verdict `none`; never `NaN` | `stats` |
| Coordinates out of range or not numbers | `parsePoint` returns `null`; screen shows "Enter a latitude from -90 to 90 and a longitude from -180 to 180." | `place`, `ui` |
| Same request twice | One network call; failed requests are not cached | `data` |
| User changes selection while loading | The late response is ignored | `ui` |

## 9. Screens (Dev C)

Each screen has one `h1`, moves focus to it on entry, and works by keyboard at 375 px wide with no horizontal scroll.

| Component | Props | Shows |
|---|---|---|
| `Clues` | `catalog`, `demoCases`, `onVariable(v)`, `onDemo(c)` | The current question with its live options as buttons; the suspect list with each definition and a count ("4 suspects left"); when one suspect is left, that suspect with its definition and a "Continue" button; when `nextQuestion` is `null` and several remain, the suspects as buttons; two "Open a solved case" buttons |
| `PlacePicker` | `variable`, `regions`, `leads`, `onPick(place)` | The region list; labeled latitude and longitude inputs (hidden when `powerParameter` is `null`); the leads for the highlighted region and this variable, each with a source link; no leads section when there are none |
| `CaseBrief` | `variable`, `placeName`, `onConfirm(hunch)`, `onChange()` | "You want to know whether {name} in {place} has changed since {startYear}. Is that right?"; a radio group "Your hunch": rising, falling, no change; "Yes, show me the evidence" disabled until a hunch is chosen; "Change" |
| `Evidence` | `series`, `deseasonalized`, `onToggle()`, `onNext()` | `Chart`; a labeled checkbox "Remove the seasonal cycle", on by default; rate, "p-value (below 0.05 counts as significant)" and interval as text; the source line; a loading and an error state |
| `Chart` | `series`, `deseasonalized` | An Observable Plot line of monthly values (anomalies when on) with a straight-line fit, axis units, an accessible label and the caption "Line: straight-line fit to the points shown." The line is for illustration; the reported rate is Sen's slope |
| `VerdictView` | `variable`, `placeName`, `series`, `deseasonalized`, `hunch`, `regions`, `onRestart()` | The verdict text and caveat; the hunch line; "Compare another region" select; a second verdict card beside the first; a line "These two regions are moving in opposite directions." when `oppositeDirections` is true; an error message for the second region that leaves the first card in place |

**Style:** one stylesheet with custom properties for color, spacing and type. System font stack. Text contrast of at least 4.5 to 1. Visible focus outline. No color-only meaning: rise, fall, mixed and none each carry a word.

## 10. Testing

| Layer | Tool | Rule |
|---|---|---|
| `stats` | Vitest | Must match `pyMannKendall` and `scipy` on 4 generated fixtures, plus hand-checked and edge cases. Never edit a fixture to pass a test. |
| `verdict`, `clues`, `place` | Vitest | Table of cases from the plan; pure functions, no mocks |
| `data` | Vitest with mocked `fetch` | Parse a captured real response; every `DataError` kind; cache |
| `scripts` | pytest | Sampling, weighting and output shape |
| `ui` | React Testing Library | Query by role and label; mock other folders with `vi.mock` and use fixtures; one `App` test walks all five screens |
| Whole app | Dev C, by hand at each gate | The live URL, on a phone and a laptop |

Whether Observable Plot renders under jsdom is unverified. If it doesn't, the `Chart` test checks the accessible label and the data passed in, and `Chart` itself is mocked in the `Evidence` test.

## 11. Out of scope

Backend, database, accounts, API keys, AI model calls at runtime, free-text questions, maps, user-drawn regions, a global trend map, non-linear trends, router, state library, CSS framework.
