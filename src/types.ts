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
