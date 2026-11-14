import type { DemoCase, Lead, Place, Region, Series, Variable } from "../types";

const MESSAGES = {
  "rate-limit": "NASA's data service is busy. Try a prepared region, or wait a minute.",
  network: "We couldn't reach NASA's data service. Check your connection, or try a prepared region.",
  unavailable: "This data isn't available for that place. Try a prepared region.",
};

// A region file comes from this site, so its network message must not name NASA's data service.
const REGION_NETWORK = "We couldn't load this region's data. Check your connection, then choose the region again.";

export class DataError extends Error {
  kind: "rate-limit" | "network" | "unavailable";
  constructor(kind: DataError["kind"], message = MESSAGES[kind]) {
    super(message);
    this.kind = kind;
  }
}

// One promise per key, dropped when it rejects so a retry can succeed.
const cache = new Map<string, Promise<unknown>>();
function memo<T>(key: string, load: () => Promise<T>): Promise<T> {
  let hit = cache.get(key) as Promise<T> | undefined;
  if (!hit) {
    hit = load();
    cache.set(key, hit);
    hit.catch(() => cache.delete(key));
  }
  return hit;
}

const staticFile = (path: string) => `${import.meta.env.BASE_URL}data/${path}`;
// All three files are arrays; any other body (a corrupted deploy) must not reach the screens.
const loadFile = <T,>(name: string) =>
  memo(name, async () => {
    const body = await fetchJson(staticFile(name));
    if (!Array.isArray(body)) throw new DataError("unavailable");
    return body as T;
  });

export function loadCatalog(): Promise<Variable[]> {
  return loadFile("catalog.json");
}

export function loadRegions(): Promise<Region[]> {
  return loadFile("regions.json");
}

export function loadLeads(): Promise<Lead[]> {
  return loadFile("leads.json");
}

const POWER_URL = "https://power.larc.nasa.gov/api/temporal/monthly/point";
const END_YEAR = 2025;

// Shape confirmed from power-sample.json: values under properties.parameter.{NAME},
// keyed YYYYMM plus a YYYY13 annual key, fill value in header.fill_value (-999).
type PowerResponse = {
  header?: { fill_value?: number };
  properties?: { parameter?: Record<string, Record<string, unknown>> };
};

const FETCH_TIMEOUT_MS = 30_000;

async function fetchJson(url: string): Promise<unknown> {
  let res: Response;
  try {
    // A stalled connection would otherwise leave the screen loading forever (D2).
    // AbortSignal.timeout is missing before Safari 16 / Chrome 103: fetch without a limit there.
    const signal = typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(FETCH_TIMEOUT_MS) : undefined;
    res = await fetch(url, { signal });
  } catch {
    throw new DataError("network");
  }
  if (res.status === 429) throw new DataError("rate-limit");
  if (!res.ok) throw new DataError("unavailable");
  try {
    return await res.json();
  } catch {
    throw new DataError("unavailable");
  }
}

async function loadPoint(variable: Variable, lat: string, lon: string, placeId: string): Promise<Series> {
  const param = variable.powerParameter;
  if (!param) throw new DataError("unavailable");
  const url = `${POWER_URL}?parameters=${param}&community=AG&longitude=${lon}&latitude=${lat}` +
    `&start=${variable.startYear}&end=${END_YEAR}&format=JSON`;
  const body = (await fetchJson(url)) as PowerResponse | null;
  const raw = body?.properties?.parameter?.[param];
  if (!raw || typeof raw !== "object") throw new DataError("unavailable");
  const fill = body?.header?.fill_value ?? -999;
  const keys = Object.keys(raw).filter((k) => /^\d{4}(0[1-9]|1[0-2])$/.test(k)).sort();
  // No months at all (an array, {} or an error object) is a failed retrieval, not an empty record.
  if (keys.length === 0) throw new DataError("unavailable");
  return {
    variableId: variable.id,
    placeId,
    unit: variable.unit,
    source: variable.source,
    dates: keys.map((k) => `${k.slice(0, 4)}-${k.slice(4)}`),
    values: keys.map((k) => {
      const v = raw[k];
      return typeof v === "number" && Number.isFinite(v) && v !== fill ? v : null;
    }),
  };
}

// 2 decimals; "-0.00" becomes "0.00", so a point on the equator has one id and one request (D8).
const coord = (x: number) => x.toFixed(2).replace(/^-(0\.00)$/, "$1");

// Our own files are trusted for content, but a corrupted deploy must not reach analyze (D7).
async function loadRegion(variable: Variable, regionId: string): Promise<Series> {
  const s = (await fetchJson(staticFile(`series/${variable.id}/${regionId}.json`)).catch((e: DataError) => {
    throw e.kind === "network" ? new DataError("network", REGION_NETWORK) : e;
  })) as Partial<Series> | null;
  if (
    !Array.isArray(s?.dates) || !Array.isArray(s.values) || s.dates.length !== s.values.length ||
    !s.dates.every((d) => typeof d === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(d)) ||
    !s.values.every((v) => v === null || (typeof v === "number" && Number.isFinite(v)))
  ) {
    throw new DataError("unavailable");
  }
  return s as Series;
}

export function getSeries(variable: Variable, place: Place): Promise<Series> {
  // Round once, so the request and the cache key always agree.
  const lat = place.kind === "point" ? coord(place.lat) : "";
  const lon = place.kind === "point" ? coord(place.lon) : "";
  const placeId = place.kind === "region" ? place.id : `point:${lat},${lon}`;
  return memo(`series|${variable.id}|${placeId}`, () =>
    place.kind === "region" ? loadRegion(variable, place.id) : loadPoint(variable, lat, lon, placeId),
  );
}

// The two cases chosen in Task B6 (issue 17). Both are regions, whose series are static
// files, so they need no snapshot or POWER fallback (card A7).
export const demoCases: DemoCase[] = [
  {
    id: "arctic-precipitation",
    title: "Is the Arctic getting wetter?",
    variableId: "PRECTOTCORR",
    place: { kind: "region", id: "arctic-canada" },
  },
  {
    id: "tibet-temperature",
    title: "Is the Tibetan Plateau warming?",
    variableId: "T2M",
    place: { kind: "region", id: "tibetan-plateau" },
  },
];
