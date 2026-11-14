// Place helpers (task B4), from architecture sections 4.4 and 8. Pure: imports only src/types.ts.
import type { Lead, Place, Region } from "../types";

// Plain decimals only, after one comma becomes a dot: rejects "12abc", "Infinity", "0x10", "1e1" and blank text.
const DECIMAL = /^[+-]?(\d+(\.\d*)?|\.\d+)$/;

function parseCoord(text: string, limit: number): number | null {
  // A pasted coordinate often uses the typographic minus "−" (U+2212) (D12).
  const s = text.trim().replace(",", ".").replace("\u2212", "-");
  if (!DECIMAL.test(s)) return null;
  const n = Number(s);
  return Math.abs(n) <= limit ? n : null;
}

export function parsePoint(lat: string, lon: string): Place | null {
  const la = parseCoord(lat, 90);
  const lo = parseCoord(lon, 180);
  return la === null || lo === null ? null : { kind: "point", lat: la, lon: lo };
}

// 2 decimals, with "-0.00" shown as "0.00", matching the place id in src/data (D8).
const coord = (x: number) => x.toFixed(2).replace(/^-(0\.00)$/, "$1");

export function placeName(place: Place, regions: Region[]): string {
  // Reads correctly after "in", and is honest: a POWER point is a grid cell about 50 km across (D17).
  if (place.kind === "point") return `the area around ${coord(place.lat)}, ${coord(place.lon)}`;
  return regions.find((r) => r.id === place.id)?.name ?? place.id;
}

export function leadsFor(leads: Lead[], regionId: string, variableId: string): Lead[] {
  return leads.filter((l) => l.regionId === regionId && l.variableId === variableId);
}
