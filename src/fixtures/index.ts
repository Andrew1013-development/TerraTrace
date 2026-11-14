// SYNTHETIC sample data for tests and early UI work. None of it is real NASA data.
import type { Lead, Region, Series, TrendResult, Variable } from "../types";

// SYNTHETIC: 180 months from 2000-01, small linear trend plus a sine seasonal cycle, no gaps.
const MONTHS = 180;
const dates = Array.from({ length: MONTHS }, (_, i) => {
  const y = 2000 + Math.floor(i / 12);
  const m = (i % 12) + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
});
const values = Array.from({ length: MONTHS }, (_, i) =>
  Number((25 + 0.002 * i + 3 * Math.sin((2 * Math.PI * (i % 12)) / 12)).toFixed(4)),
);

export const sampleSeries: Series = {
  variableId: "T2M",
  placeId: "sahel",
  unit: "°C",
  source: "Synthetic fixture, not NASA data",
  dates,
  values,
};

// SYNTHETIC: tags are the first-question words (air, water, land, life) plus one specific tag each.
export const sampleCatalog: Variable[] = [
  {
    id: "T2M", name: "air temperature",
    definition: "How warm the air is about two metres above the ground.",
    unit: "°C", source: "Synthetic fixture, not NASA data",
    powerParameter: "T2M", startYear: 1981, tags: ["air", "temperature"],
  },
  {
    id: "PRECTOTCORR", name: "precipitation",
    definition: "How much rain and snow falls on the ground each day.",
    unit: "mm/day", source: "Synthetic fixture, not NASA data",
    powerParameter: "PRECTOTCORR", startYear: 1981, tags: ["air", "water", "rain"],
  },
  {
    id: "RH2M", name: "relative humidity",
    definition: "How much water vapour the air holds compared with the most it could hold.",
    unit: "%", source: "Synthetic fixture, not NASA data",
    powerParameter: "RH2M", startYear: 1981, tags: ["air", "water", "humidity"],
  },
  {
    id: "TS", name: "ground surface temperature",
    definition: "How warm the surface of the ground is.",
    unit: "°C", source: "Synthetic fixture, not NASA data",
    powerParameter: "TS", startYear: 1981, tags: ["land", "temperature"],
  },
];

// SYNTHETIC: rough boxes, west < east, none crossing the 180° meridian.
export const sampleRegions: Region[] = [
  { id: "sahel", name: "Sahel", bbox: [12, -17, 16, 35] },
  { id: "arctic-canada", name: "Arctic Canada", bbox: [68, -120, 78, -70] },
  { id: "mekong-delta", name: "Mekong Delta", bbox: [9, 104, 11, 107] },
];

// SYNTHETIC: placeholder text and example.org links, not real sources.
export const sampleLeads: Lead[] = [
  {
    regionId: "sahel", variableId: "PRECTOTCORR",
    text: "Synthetic lead: rainfall here may be worth checking.",
    sourceUrl: "https://example.org/synthetic-lead-1",
  },
  {
    regionId: "mekong-delta", variableId: "T2M",
    text: "Synthetic lead: air temperature here may be worth checking.",
    sourceUrl: "https://example.org/synthetic-lead-2",
  },
];

// SYNTHETIC: a plausible result for sampleSeries (0.002 per month is 0.24 per decade).
export const sampleResult: TrendResult = {
  n: 180,
  slopePerDecade: 0.24,
  ci95: [0.18, 0.3],
  mkP: 0.001,
  deseasonalized: true,
};
