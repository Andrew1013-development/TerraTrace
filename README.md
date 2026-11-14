# Case File

A guided web app for the NASA Space Apps Challenge 2026, challenge "Be An Earth System Trend Detective!". It takes a student from a question about the Earth to an honest, plain-language verdict on whether a measured variable is changing in a chosen place.

**Live app:** https://andrew1013-development.github.io/nasa-space-apps-challenge-2026/

## How a verdict is reached

**The data.** Every value is a monthly figure from NASA POWER. Most variables come from MERRA-2, a NASA reanalysis that combines observations with a weather model, and start in 1981. Sunlight at the ground and cloud cover come from CERES SYN1deg, NASA satellite measurements, and start in 2001, so each series uses one product. A prepared region's value is the average of 9 points spread across its box, weighted so that points nearer the equator, which stand for more area, count more. A typed point is fetched live from POWER.

**Three checks.** The app asks three questions of the same record:

1. **Is there a steady upward or downward drift?** The Mann-Kendall test compares every month with every later month and counts how often the later one is higher rather than lower. Its p-value says how surprising that count would be if nothing were changing; below 0.05 counts as significant.
2. **How fast?** Sen's slope is the middle value of the rates of change between every pair of months. One odd year barely moves it. The app reports it per decade.
3. **How sure are we of that rate?** A straight-line fit gives a 95% interval for the rate. If the interval includes zero, "no change" is still plausible.

**The seasonal cycle.** Summer and winter differ far more than most long-term changes, which can hide a trend. With "Remove the seasonal cycle" on (the default), the test compares each month only with the same month in other years (the seasonal Mann-Kendall test), and the rate and interval are worked out from each month's difference from its usual value.

**The verdict rule.**

| Mann-Kendall p below 0.05 | Interval excludes zero | Verdict |
|---|---|---|
| Yes | Yes, on the same side as the rate | Rising or falling |
| Only one of the two holds, or the rate and the interval point opposite ways | | Mixed evidence: treat as uncertain |
| No | No | No significant trend, which is a real result |

A record needs at least 120 months (10 years) with values. Below that, the app gives no verdict and says why.

**Checked against standard tools.** On four generated 240-month test series (a trend with a seasonal cycle, a seasonal cycle only, strong month-to-month memory, and repeated values), the app's p-values match pyMannKendall 1.4.3 to 3 decimal places. Its rates and intervals match pyMannKendall and scipy 1.18.1 to 6 decimal places. Both demo cases also match to 3 decimal places on real data. The tests are in `src/stats/index.test.ts`, and the script that makes the test series is `scripts/make_stats_fixtures.py`.

**Limits.**

- **Straight lines only.** A rise then a fall, or a sudden jump, can look like no trend.
- **Neighbouring months are related.** This can make a trend look more certain than it is, so every verdict says so. In our tests, a series built with no trend but strong month-to-month memory still came out significant on the seasonal test (p = 0.0045).
- **Regions are a coarse sample.** Nine points stand for a large box, so a region's value is an estimate, not an area average.
- **A reanalysis or a satellite product is not a station record.** Results follow MERRA-2 or CERES SYN1deg and can differ from local weather-station records.
- **A trend is not an explanation.** The app reports whether something changed, never why, and it does not predict the future.

## Run it

Requires Node.js 26.

```bash
npm ci
npm run dev
```

- Tests: `npx vitest run`
- Build and type check: `npm run build`

## AI assistance

Parts of this project's code, tests and documents were written with AI assistance (Claude, by Anthropic). A developer reviews every AI-drafted change. No AI model runs in the app. Each use is listed in [AI_USE.md](AI_USE.md).

## Sources and licence

Datasets, libraries and other sources are credited in [SOURCES.md](SOURCES.md). The code is licensed under [Apache-2.0](LICENSE).

## Project documents

- [DESIGN.md](DESIGN.md): what the app does and why
- [ARCHITECTURE.md](ARCHITECTURE.md): how the parts fit
- [IMPLEMENTATION.md](IMPLEMENTATION.md): who builds what, and when
- [TASKS.md](TASKS.md): a card for every task
