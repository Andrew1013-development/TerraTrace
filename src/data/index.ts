import type { DemoCase, Lead, Place, Region, Series, Variable } from "../types";

const MESSAGES = {
  "rate-limit": "NASA's data service is busy. Try a prepared region, or wait a minute.",
  network: "We couldn't reach NASA's data service. Check your connection, or try a prepared region.",
  unavailable: "This data isn't available for that place. Try a prepared region.",
};

export class DataError extends Error {
  kind: "rate-limit" | "network" | "unavailable";
  constructor(kind: DataError["kind"]) {
    super(MESSAGES[kind]);
    this.kind = kind;
  }
}

export function loadCatalog(): Promise<Variable[]> {
  throw new Error("not implemented");
}

export function loadRegions(): Promise<Region[]> {
  throw new Error("not implemented");
}

export function loadLeads(): Promise<Lead[]> {
  throw new Error("not implemented");
}

const POWER_URL = "https://power.larc.nasa.gov/api/temporal/monthly/point";
const END_YEAR = 2025;

// Shape confirmed from power-sample.json: values under properties.parameter.{NAME},
// keyed YYYYMM plus a YYYY13 annual key, fill value in header.fill_value (-999).
type PowerResponse = {
  header?: { fill_value?: number };
  properties?: { parameter?: Record<string, Record<string, unknown>> };
};

async function fetchJson(url: string): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url);
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

const cache = new Map<string, Promise<Series>>();

export function getSeries(variable: Variable, place: Place): Promise<Series> {
  // Round once, so the request and the cache key always agree.
  const lat = place.kind === "point" ? place.lat.toFixed(2) : "";
  const lon = place.kind === "point" ? place.lon.toFixed(2) : "";
  const placeId = place.kind === "region" ? place.id : `point:${lat},${lon}`;
  const key = `${variable.id}|${placeId}`;

  let hit = cache.get(key);
  if (!hit) {
    hit = place.kind === "region"
      ? (fetchJson(`${import.meta.env.BASE_URL}data/series/${variable.id}/${place.id}.json`) as Promise<Series>)
      : loadPoint(variable, lat, lon, placeId);
    cache.set(key, hit);
    hit.catch(() => cache.delete(key));
  }
  return hit;
}

export const demoCases: DemoCase[] = [];
