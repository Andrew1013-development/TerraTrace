# Case File: design spec

NASA Space Apps Challenge 2026, challenge "Be An Earth System Trend Detective!"
Event: November 14-15, 2026. Team: 6 people on the online track of the Ho Chi Minh City event. 3 full-stack developers, same room, 16 build hours each, and 3 non-dev teammates who own the demo and submission.
Research basis: `reports/NASA Space Apps 2026 challenges.md`.

## 1. Goal

A guided web app that takes a student from a question about the Earth to a statistically honest, plain-language verdict on whether a measured variable is changing in a chosen place.

**Users:** high school and college students, and the science-literate public.

**Success criteria**
- Answers all four brief objectives: identify variables, acquire them for a region, generate and visualize a time series, and give a rate of change with a significance test.
- A public live link works on a judge's device, with no login.
- Two demo cases run from start to finish.
- Stats match `pyMannKendall` on shared fixtures.
- Submitted well before the deadline, with sources and AI tool use described.
- Team aim: nomination for Global Judging.

## 2. Rules that constrain the work

- No project work before 9:00 AM local on November 14. This includes the repo, code and precomputed data. The team reports that plans and `CLAUDE.md` written beforehand are acceptable; keep them out of the project repo until the start.
- Official resources and the submission and judging guides were read on November 13. Their rules are in section 7.
- The submission must describe how AI tools were used. AI-generated code must be acknowledged in descriptive text and metadata, and AI-generated images or video need a visible watermark. Generated content may not use NASA branding.
- The Project Submission Guide says SI should not be used to come up with the idea for solving the challenge. See section 8.
- Every source must be cited. Original content must be freely available or OSI-licensed.

**Settled:** the deadline is 23:59 ICT on November 15 (HCMC online handbook). The team reports that planning beforehand is allowed.

**Open question for the organizers**
- How should the team describe AI help with choosing the challenge and shaping the idea, given the SI rule above?

## 3. Scope

**In**
- Clue engine: one question at a time narrows the candidate variables, Akinator-style
- Curated region list, plus any point on Earth through POWER by typed coordinates
- Leads: sourced suggestions of what to check in each region
- Case brief: the app reads the question back for the user to confirm
- Hunch: the user guesses rising, falling or no change before seeing data
- Time series chart with a deseasonalized toggle
- Sen's slope, Mann-Kendall, seasonal Mann-Kendall and an OLS confidence interval
- Plain-language verdict, compared with the hunch
- Second witness: the same variable in a second region, side by side
- Two demo cases

**Data scope:** POWER-backed variables and about 12 regions. At H8, if time remains, add one product obtained through a listed resource (Giovanni or AppEEARS), since POWER is not on the official resource list.

**Out**
- AI model calls at runtime, including free-text questions
- Map picker
- User-drawn regions and live area averages
- Global trend map
- Non-linear trends
- Backend, database and accounts

## 4. Architecture

**Stack:** Vite, React, TypeScript, Observable Plot. Python with xarray for the one-time data script. Hosted on GitHub Pages. Licence: Apache-2.0.

The full build reference is `docs/case-file-architecture.md`: every signature, formula, message and screen.

| Part | Job | Owner |
|---|---|---|
| `scripts/precompute.py` | Sample POWER points in each region and write regional JSON, run once during the event | Dev A |
| `public/data/` | `catalog.json`, `regions.json`, `leads.json`, `series/`, `demo/` | Dev A |
| `src/data/` | Loaders and `getSeries`, from a static file or live POWER | Dev A |
| `src/clues/` | Pure functions: pick the next question and narrow the suspects | Dev A |
| `src/stats/` | Pure functions: deseasonalize, Sen's slope, Mann-Kendall, seasonal Mann-Kendall, OLS CI | Dev B |
| `src/verdict/` | Verdict rule and wording, hunch line, comparison | Dev B |
| `src/place/` | Coordinate parsing, place names, leads lookup | Dev B |
| `src/ui/`, `src/App.tsx` | Five screens: Clues, Scene, Case brief, Evidence, Verdict | Dev C |

Logic lives in pure modules, and the UI only renders their results.

### Contract

Committed in the first hour. Changes go through Dev C, in one PR, announced aloud. The two central types are below; the rest are in the architecture reference.

```ts
type Series = {
  variableId: string; placeId: string; unit: string;
  source: string;            // product and version, for citation
  dates: string[];           // "YYYY-MM"
  values: (number | null)[]; // null = missing; POWER fill values mapped here
};

type TrendResult = {
  n: number;
  slopePerDecade: number;    // Sen's slope
  ci95: [number, number];    // OLS, on the slope
  mkP: number;               // see the two modes below
  deseasonalized: boolean;
};
```

### Data flow

1. Clues and Case brief settle a variable, a place and a hunch (see Detective flow).
2. `getSeries` loads the data.
3. `src/stats/` computes the `TrendResult` in the browser.
4. Chart and verdict render. The toggle recomputes without a network call.

### Detective flow

| Step | What happens |
|---|---|
| 1. Interrogation | The app asks one question at a time. Each variable has tags, and each answer keeps the variables that match. The engine asks the question that best splits the remaining suspects, and the suspect list shrinks on screen. When no question can split further, the user picks from the few left. |
| 2. Scene | The user picks a region or types coordinates. The app shows leads for that region and variable, each with a source link. |
| 3. Case brief | The app reads back: "You want to know whether {variable} in {place} has changed since {year}. Is that right?" The user confirms or goes back. |
| 4. Hunch | The user must guess rising, falling or no change before continuing. |
| 5. Evidence | Chart, trend line and the deseasonalized toggle. |
| 6. Verdict | The verdict, with a line comparing it to the hunch. |
| 7. Second witness | The user picks a second region. A second verdict card appears beside the first, and the app says so when the two move in opposite directions. |

**AI use:** no model runs in the app. During the event, Claude drafts variable definitions, tags, leads and verdict wording. A dev checks each item, every lead needs a source link, and unsourced leads are dropped. All of it is logged in `AI_USE.md`.

### Statistics modes

| Toggle | `mkP` | Slope and CI |
|---|---|---|
| Off (raw) | Plain Mann-Kendall on raw monthly values | Sen's slope and OLS on raw values |
| On (deseasonalized, default) | Seasonal Mann-Kendall on raw monthly values | Sen's slope and OLS on anomalies from the monthly climatology |

### Verdict rule

Significance level: 0.05.

| Condition | Verdict |
|---|---|
| `mkP` < 0.05 and `ci95` excludes 0 | Significant rise or fall, by the sign of the slope |
| Only one of the two holds | Mixed evidence |
| Neither holds | No significant linear trend, presented as a real finding |

### Failure and honesty rules

- POWER errors or HTTP 429: show a clear message and offer the precomputed regions. Cache responses in memory for the session.
- Fewer than 120 non-missing months: no verdict; explain why.
- Every verdict carries a one-line caveat that autocorrelation can overstate significance.
- One series uses one product version only.
- Every chart names its source.

### Testing

`src/stats/` gets unit tests against fixtures generated from `pyMannKendall`, plus one hand-checked case. Other code is checked by a demo walkthrough.

### To verify on November 14

- POWER coverage for the chosen variables, and whether POWER has a regional endpoint. Regional means come from sampled points.
- `pyMannKendall`'s API, known so far only from a search summary.
- Harmony or OPeNDAP subsetting, untested so far. Full downloads of all six named products total about 230 GB.
- IMERG files stopped at September 2025 when checked, so avoid IMERG for series that need recent months unless this has changed.

## 5. Workflow

### Before the start

Done on November 13: the resources and guides were read, and the team stayed with Case File. Still open: the organizers' answer on describing AI help (section 2).

### Schedule (build hours)

| Hours | Goal | Gate |
|---|---|---|
| H0-H1 | Repo, deploy to Pages, contract committed | Live URL shows a page, and types are in `main` |
| H1-H4 | Skeleton: five placeholder screens on fixtures | The screens click through on the live URL |
| H4-H8 | Real data and real stats | Live POWER series gives a tested `TrendResult` on screen |
| H8 | Scope decision | Variable and region list locked; the listed-resource product is added only if already obtained |
| H8-H13 | Clue engine, case brief, leads, place picker, second witness, two demo cases, toggle, verdict text | Both demo cases work from start to finish |
| H13 | Feature freeze | Bug fixes, polish and demo snapshots only after this |
| H13-H15 | Polish, phone and keyboard checks, citations, demo capture, submission text | Demo capture and text drafted |
| H15-H16 | Submit and re-test the live link on another device | Submission confirmed |

### Fallbacks

| Trigger | Action |
|---|---|
| No listed-resource product by H8 | Ship POWER-only variables |
| POWER rate limits | Serve demo responses from static JSON |
| Stats disagree with `pyMannKendall` at H8 | Find the cause before anything else |
| Behind at H13 | Cut the second witness first, then the region count, then toggle polish; both demo cases stay, and any change to them is re-tested |
| Real build time near 12 hours each | Go POWER-only from the start and move `precompute.py` hours to other tasks |

### Working rules

- Short branches and small PRs into `main`, merged the same hour. `main` auto-deploys and stays demoable.
- Dev C reviews and merges every PR. `src/stats/`, `src/verdict/` and the contract get a line-by-line review.
- One owner per folder.
- 5-minute standing sync at each gate: done, next, blocked.
- Keep `SOURCES.md` (every dataset, library and image, with licence) and `AI_USE.md` (one line per use of AI tools) from the first hour.

## 6. Work split

Dev C owns all front-end work, review, integration testing and merging. Dev A and Dev B own everything else, and write the unit tests for their own code. Hours are estimates, 16 per developer. Task steps are in the plan.

| Dev A: data and clues | h | Dev B: analysis and documents | h | Dev C: front end and review | h |
|---|---|---|---|---|---|
| Repo, CI, deploy | 1 | Contract and fixtures | 1 | Kickoff and task cards | 1 |
| `getSeries` and POWER client | 3 | Statistics | 5 | Shell, state, styles | 2 |
| Loaders and starter data | 1 | Verdict rule and wording | 3 | Evidence screen and chart | 3 |
| Clue engine and questions | 3 | Place helpers | 1 | Case brief | 1 |
| Regional data script | 3 | Region leads | 1 | Clues screen | 2 |
| Full catalog and tags | 1 | Demo case choice | 1 | Place picker | 1 |
| Demo cases and snapshots | 1 | Methods and `AI_USE.md` | 1 | Verdict screen | 1 |
| Device test | 1 | `SOURCES.md` and `README.md` | 1 | Second witness | 1 |
| Buffer | 2 | Buffer | 2 | Polish and accessibility | 1 |
| | | | | Review, merge, gate checks | 3 |
| **Total** | **16** | **Total** | **16** | **Total** | **16** |

**Dev C has no buffer and is the bottleneck.** No excess work was left to move to Dev C. The 4 buffer hours of Dev A and Dev B protect Dev C instead:
- When Dev C has more than 2 PRs waiting, Dev A and Dev B review each other's low-risk PRs, and Dev C still presses merge.
- Bugs found in a logic folder go back to its owner.
- The second witness is built only if the Verdict screen is merged by H12. Otherwise it is cut.

### Handoffs

| When | From | To | What |
|---|---|---|---|
| H1 | Dev B | All | Contract and fixtures in `main` |
| H1 | Dev A, Dev B | Dev C | Stubs with final signatures, as each logic task starts |
| H4 | Dev A | Dev C | `getSeries` for live points |
| H6 | Dev B | Dev C | Tested statistics |
| H8 | Dev A | Dev C | Clue engine |
| H9 | Dev B | Dev C | Verdict rule and wording |
| H10 | Dev B | Dev C | Place helpers |
| H12 | Dev B | Dev A | The two demo cases |
| H8 | All devs | Demo team | Live link with one working case |
| H13 | All devs | Demo team | Frozen features for recording |

### Backup

Dev A backs up statistics, Dev B backs up data, and either can take a UI task only if Dev C asks.

## 7. Demo and submission

Owned by the 3 non-dev teammates. Developers supply the live link, facts and numbers, and do not build the demo.

### Rules, from the 2026 guides read on November 13

- Deadline: 23:59 ICT on November 15. Resubmitting is allowed until then, and only the last saved submission is judged.
- Demo: a video of 30 seconds or less, or a slide deck of at most 7 slides including title and intro. Going over makes the project ineligible for Global Judging.
- English on the project page and in linked material. A video may be spoken in another language with English subtitles.
- Every link must open with no login. Test in a private browser window.
- Nobody under 18 may appear in the demo or project.
- At least one NASA data source or resource is required for a Global Award.
- All 6 members must be registered for the Ho Chi Minh City event and listed on the team's Members tab before submission closes.
- Judges score Impact, Creativity, Validity, Relevance and Presentation from 1 to 5. Most of the evaluation rests on the project page, and the demo feeds the Presentation score.

### Deliverables

| Deliverable | Content |
|---|---|
| 30-second video | Real screen capture of one solved case, following the guide's timing: team, challenge, title and tagline, how it works, the future |
| Project page | Summary, detailed description, NASA data, references, SI use, screenshots or a GIF |
| Live app | The Final Project link, with two solved cases a judge can open in one click |

### Roles

| Role | Owns |
|---|---|
| Story lead | Script, recording, subtitles, upload of the video |
| Page lead | Project page fields, references, SI field, lock and submit |
| Test and outreach lead | Mentor requests on Discord, first-time-user testing, link checks while signed out, screenshots |

### Timeline

| When | Demo team does |
|---|---|
| H0-H4 | Request mentor slots, draft the script and page text, set up the project page |
| H8 | Capture first screenshots, test the app as a new user, report confusing steps to the devs |
| H13 | Record the video on the frozen build |
| H14 | Submit a complete first version, then reopen it signed out to check every link |
| H15-H16 | Final fixes and resubmit, well before 23:59 ICT |

## 8. Unverified

- The guides state no weights for the five judging criteria; each is scored 1 to 5.
- Whether `github.io` pages pass the judges' web filter is unchecked. The guide suggests a FortiGuard classification request for new websites.
- AI helped rank the challenges and propose the base concept, which may conflict with the SI rule in section 2. The team must describe this truthfully and should ask the organizers.
- Rubric scores behind choosing Case File are judgment. Its lead over Slip Calendar is 3 points.
- Giovanni, AppEEARS and Hydrology Time Series access is untested. POWER is not on the official resource list.
- Whether Observable Plot renders in the test environment is unverified.
- Regional means come from 9 sampled points per region, which is coarse. POWER coverage near the poles is unverified.
- Hour estimates are not measured.
