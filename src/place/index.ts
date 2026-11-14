// Place helpers (task B4), from architecture sections 4.4 and 8. Pure: imports only src/types.ts.
import type { Lead, Place, Region } from "../types";

// Plain decimals only, after one comma becomes a dot: rejects "12abc", "Infinity", "0x10", "1e1" and blank text.
const DECIMAL = /^[+-]?(\d+(\.\d*)?|\.\d+)$/;

function parseCoord(text: string, limit: number): number | null {
  const s = text.trim().replace(",", ".");
  if (!DECIMAL.test(s)) return null;
  const n = Number(s);
  return Math.abs(n) <= limit ? n : null;
}

export function parsePoint(lat: string, lon: string): Place | null {
  const la = parseCoord(lat, 90);
  const lo = parseCoord(lon, 180);
  return la === null || lo === null ? null : { kind: "point", lat: la, lon: lo };
}

export function placeName(place: Place, regions: Region[]): string {
  if (place.kind === "point") return `${place.lat.toFixed(2)}, ${place.lon.toFixed(2)}`;
  return regions.find((r) => r.id === place.id)?.name ?? place.id;
}

export function leadsFor(leads: Lead[], regionId: string, variableId: string): Lead[] {
  return leads.filter((l) => l.regionId === regionId && l.variableId === variableId);
}
