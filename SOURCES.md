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
| World land outlines (`public/data/land.json`) | Natural Earth 1:110m land, https://github.com/nvkelso/natural-earth-vector (`geojson/ne_110m_land.geojson`), accessed 2026-11-14; properties removed, coordinates rounded to 0.01°; input to `scripts/make_map_shapes.py`, not loaded by the app | Public domain |
| Region outlines (`public/data/region-shapes.json`) | Natural Earth 1:110m geography regions (`ne_110m_geography_regions_polys`) for eight named regions (full outline where the region is the whole named area, trimmed to the box for "central" regions), land trimmed to the box for the rest, by `scripts/make_map_shapes.py`, accessed 2026-11-15 | Public domain |
| Globe image (`public/data/earth.jpg`) | NASA Earth Observatory Blue Marble, "Whole world - land and oceans" (NASA Goddard Space Flight Center), via Wikimedia Commons https://commons.wikimedia.org/wiki/File:Whole_world_-_land_and_oceans.jpg, accessed 2026-11-15; 3840×1920, re-encoded at JPEG quality 80 | Public domain |
| Country outlines (`public/data/countries.json`) | Natural Earth 1:110m admin 0 countries (`ne_110m_admin_0_countries`), name only, coordinates rounded to 0.1°, accessed 2026-11-15 | Public domain |
| `LICENSE` text | https://www.apache.org/licenses/LICENSE-2.0.txt | Apache-2.0 |
| Project scaffold | `npm create vite@latest`, template `react-ts` | MIT |
| Fira Sans Bold (`src/styles/fonts/`) | Latin `woff2` via Fontsource, https://fontsource.org/fonts/fira-sans, accessed 2026-11-14 | SIL OFL 1.1 |
| Overpass Regular and Bold (`src/styles/fonts/`) | Latin `woff2` via Fontsource, https://fontsource.org/fonts/overpass, accessed 2026-11-14 | SIL OFL 1.1 |
| NASA Space Apps logos (`src/ui/brand/space-apps-*.svg`) | Official 2026 logo pack, https://www.spaceappschallenge.org/brand/, accessed 2026-11-14; unmodified | Used per the NASA Space Apps Brand Guidelines |
| Orbits pattern (`src/ui/brand/orbits.png`) | Official Space Apps patterns, https://www.spaceappschallenge.org/brand/, accessed 2026-11-14; resized to 1200 px | Used per the NASA Space Apps Brand Guidelines |
| Brand colours and type rules | NASA Space Apps Brand Guidelines PDF, updated June 25, 2026 | Used per the guidelines |

## Lead sources

Each page was opened on 2026-11-14 and supports its lead in `public/data/leads.json`. Lead text is paraphrased.

| Region | Page | Provider | URL |
|---|---|---|---|
| Arctic Canada | The Arctic is Getting Rainier (2024) | NASA Earth Observatory | https://science.nasa.gov/earth/earth-observatory/the-arctic-is-getting-rainier-152575/ |
| Sahel | Vegetation and Rainfall in the Sahel (2007) | NASA Earth Observatory | https://science.nasa.gov/earth/earth-observatory/vegetation-and-rainfall-in-the-sahel-7277/ |
| Mekong Delta | Mekong Turns from Brown to Blue-Green (2020) | NASA Earth Observatory | https://science.nasa.gov/earth/earth-observatory/mekong-turns-from-brown-to-blue-green-146209/ |
| Central Amazon | Drought on the Rio Negro (2023) | NASA Earth Observatory | https://science.nasa.gov/earth/earth-observatory/drought-on-the-rio-negro-151961/ |
| Tibetan Plateau | Black Carbon Deposits on Himalayan Ice Threaten Earth's "Third Pole" (2009) | NASA Goddard Institute for Space Studies | https://www.giss.nasa.gov/research/news/20091214/ |
| Iberian Peninsula | Spain Browned by Drought (2023) | NASA Earth Observatory | https://science.nasa.gov/earth/earth-observatory/spain-browned-by-drought-151366/ |
| US Great Plains | Dried Out Vegetation Across America (2012) | NASA Earth Observatory | https://science.nasa.gov/earth/earth-observatory/dried-out-vegetation-across-america-79316/ |
| Murray-Darling Basin | Boom-and-Bust Water Supplies in Southeast Australia (2016) | NASA Earth Observatory | https://science.nasa.gov/earth/earth-observatory/boom-and-bust-water-supplies-in-southeast-australia-88292/ |
| Antarctic Peninsula | The Most Studied Peninsula on Antarctica (2017) | NASA Earth Observatory | https://science.nasa.gov/earth/earth-observatory/the-most-studied-peninsula-on-antarctica-89717/ |
| East African Highlands | Failed Rainy Seasons Create Food Emergency in Eastern Africa (2022) | NASA Earth Observatory | https://science.nasa.gov/earth/earth-observatory/failed-rainy-seasons-create-food-emergency-in-eastern-africa-149294/ |

No lead for Sahara or Central Siberia: no NASA page found that supports one for those boxes.
