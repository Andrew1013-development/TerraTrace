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
  // A named point ("one spot in France") shows its name; otherwise reads correctly after "in", and is honest:
  // a POWER point is a grid cell about 50 km across (D17).
  if (place.kind === "point") return place.name ?? `the area around ${coord(place.lat)}, ${coord(place.lon)}`;
  return regions.find((r) => r.id === place.id)?.name ?? place.id;
}

export function leadsFor(leads: Lead[], regionId: string, variableId: string): Lead[] {
  return leads.filter((l) => l.regionId === regionId && l.variableId === variableId);
}

// The prepared region whose box holds a point (the smallest, if boxes overlap), for the Scene map.
export function regionAt(lat: number, lon: number, regions: Region[]): Region | undefined {
  const area = (r: Region) => (r.bbox[2] - r.bbox[0]) * (r.bbox[3] - r.bbox[1]);
  return regions
    .filter(({ bbox: [s, w, n, e] }) => lat >= s && lat <= n && lon >= w && lon <= e)
    .sort((a, b) => area(a) - area(b))[0];
}

type Ring = number[][];
type Countries = {
  features: { properties: { name: string }; geometry: { type: string; coordinates: unknown } }[];
};

// Even-odd ray test of a [lon, lat] point against one ring.
function inRing(lon: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// The name of the country a point is in, or undefined at sea; used to name a typed point outside every region.
export function countryAt(lat: number, lon: number, countries: Countries): string | undefined {
  for (const f of countries.features) {
    const polys = (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates) as Ring[][];
    // A point inside the outer ring and inside no hole is in the polygon.
    if (polys.some(([outer, ...holes]) => inRing(lon, lat, outer) && !holes.some((h) => inRing(lon, lat, h)))) {
      return f.properties.name;
    }
  }
  return undefined;
}
