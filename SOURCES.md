# Sources

Every dataset, library and other source used by this project. Add a row when a task adds a source.

## Datasets

Each dataset is added, with its product name, provider, URL and date accessed, by the task that first uses it.

| Product | Provider | URL | Accessed |
|---|---|---|---|
| NASA POWER Monthly and Annual API v2.10.0, point data, `community=AG` | NASA Langley Research Center, POWER project | https://power.larc.nasa.gov/ | 2026-11-14 |
| MERRA-2 reanalysis, through POWER: `T2M`, `T2M_MAX`, `T2M_MIN`, `TS`, `PRECTOTCORR`, `PRECSNO`, `RH2M`, `WS2M`, from 1981 | NASA Global Modeling and Assimilation Office | https://gmao.gsfc.nasa.gov/gmao-products/merra-2/ | 2026-11-14 |
| CERES SYN1deg monthly (`CER_SYN1deg-Month`, record from 2000-03, DOI 10.5067/TERRA-AQUA-NOAA20/CERES/SYN1DEGMONTH_L3.004B, US government work), through POWER: `ALLSKY_SFC_SW_DWN`, `CLOUD_AMT`, from 2001. POWER joins an earlier product (SRB) before 2001; the app starts in 2001 so each series uses one product | NASA Langley Research Center, Atmospheric Science Data Center | https://data.nasa.gov/dataset/ceres-and-geo-enhanced-toa-within-atmosphere-and-surface-fluxes-clouds-and-aerosols-monthl | 2026-11-14 |

## Libraries

Versions are from `package.json`; licences are from each package's own `package.json`.

| Library | Version | Licence |
|---|---|---|
| @observablehq/plot | 0.6.19 | ISC |
| react | 19.3.1 | MIT |
| react-dom | 19.3.1 | MIT |
| @testing-library/jest-dom | 7.0.1 | MIT |
| @testing-library/react | 16.3.3 | MIT |
| @testing-library/user-event | 14.6.10 | MIT |
| @types/node | 26.6.6 | MIT |
| @types/react | 19.3.0 | MIT |
| @types/react-dom | 19.3.0 | MIT |
| @vitejs/plugin-react | 6.3.0 | MIT |
| jsdom | 31.0.1 | MIT |
| typescript | 7.0.2 | Apache-2.0 |
| vite | 8.3.8 | MIT |
| vitest | 5.1.0 | MIT |

## Other

| Item | Source | Licence |
|---|---|---|
| `LICENSE` text | https://www.apache.org/licenses/LICENSE-2.0.txt | Apache-2.0 |
| Project scaffold | `npm create vite@latest`, template `react-ts` | MIT |
| Fira Sans Bold (`src/styles/fonts/`) | Latin `woff2` via Fontsource, https://fontsource.org/fonts/fira-sans, accessed 2026-11-14 | SIL OFL 1.1 |
| Overpass Regular and Bold (`src/styles/fonts/`) | Latin `woff2` via Fontsource, https://fontsource.org/fonts/overpass, accessed 2026-11-14 | SIL OFL 1.1 |
| NASA Space Apps logos (`src/ui/brand/space-apps-*.svg`) | Official 2026 logo pack, https://www.spaceappschallenge.org/brand/, accessed 2026-11-14; unmodified | Used per the NASA Space Apps Brand Guidelines |
| Orbits pattern (`src/ui/brand/orbits.png`) | Official Space Apps patterns, https://www.spaceappschallenge.org/brand/, accessed 2026-11-14; resized to 1200 px | Used per the NASA Space Apps Brand Guidelines |
| Brand colours and type rules | NASA Space Apps Brand Guidelines PDF, updated June 25, 2026 | Used per the guidelines |

## Lead sources

None yet.
