import { describe, expect, test } from "vitest";
import { sampleLeads, sampleRegions } from "../fixtures";
import { leadsFor, parsePoint, placeName } from "./index";

describe("parsePoint", () => {
  test('parsePoint("91","0"), ("0","181"), ("","") and ("abc","1") are null', () => {
    expect(parsePoint("91", "0")).toBeNull();
    expect(parsePoint("0", "181")).toBeNull();
    expect(parsePoint("", "")).toBeNull();
    expect(parsePoint("abc", "1")).toBeNull();
  });

  test('parsePoint("-33.9","151.2") is a point place', () => {
    expect(parsePoint("-33.9", "151.2")).toEqual({ kind: "point", lat: -33.9, lon: 151.2 });
  });

  test("parsePoint accepts the edges: 90, -90, 180, -180", () => {
    expect(parsePoint("90", "180")).toEqual({ kind: "point", lat: 90, lon: 180 });
    expect(parsePoint("-90", "-180")).toEqual({ kind: "point", lat: -90, lon: -180 });
  });

  test('parsePoint accepts a comma as the decimal mark: ("10,5","106,7")', () => {
    expect(parsePoint("10,5", "106,7")).toEqual({ kind: "point", lat: 10.5, lon: 106.7 });
  });

  test('parsePoint rejects "12abc", "Infinity" and text that is only spaces', () => {
    expect(parsePoint("12abc", "1")).toBeNull();
    expect(parsePoint("Infinity", "1")).toBeNull();
    expect(parsePoint("1", "-Infinity")).toBeNull();
    expect(parsePoint("   ", "1")).toBeNull();
  });

  test('parsePoint rejects hex and exponent forms: "0x10", "1e1"', () => {
    expect(parsePoint("0x10", "1")).toBeNull();
    expect(parsePoint("1", "1e1")).toBeNull();
  });

  test("parsePoint trims surrounding spaces and does not round", () => {
    expect(parsePoint("  10.123456 ", " 106.987654")).toEqual({ kind: "point", lat: 10.123456, lon: 106.987654 });
  });
});

describe("placeName and leadsFor", () => {
  test("placeName gives the region name, or the coordinates to 2 decimals for a point", () => {
    expect(placeName({ kind: "region", id: "sahel" }, sampleRegions)).toBe("Sahel");
    expect(placeName({ kind: "region", id: "unknown-id" }, sampleRegions)).toBe("unknown-id");
    expect(placeName({ kind: "point", lat: 10.5, lon: 106.7 }, sampleRegions)).toBe("the area around 10.50, 106.70");
    expect(placeName({ kind: "point", lat: -33.9, lon: 151.2 }, sampleRegions)).toBe("the area around -33.90, 151.20");
  });

  test("leadsFor returns only leads matching both the region and the variable", () => {
    expect(leadsFor(sampleLeads, "sahel", "PRECTOTCORR")).toEqual([sampleLeads[0]]);
    expect(leadsFor(sampleLeads, "sahel", "T2M")).toEqual([]);
    expect(leadsFor(sampleLeads, "arctic-canada", "PRECTOTCORR")).toEqual([]);
  });
});

test('parsePoint accepts the typographic minus sign "−" (D12)', () => {
  expect(parsePoint("−33.9", "−151,2")).toEqual({ kind: "point", lat: -33.9, lon: -151.2 });
});

test('placeName never shows "-0.00" (D8)', () => {
  expect(placeName({ kind: "point", lat: -0.001, lon: -0.004 }, [])).toBe("the area around 0.00, 0.00");
  expect(placeName({ kind: "point", lat: -0.006, lon: 0 }, [])).toBe("the area around -0.01, 0.00");
});

// Integration report, defect 6.
test("listName starts a name with a capital and changes nothing else", async () => {
  const { listName } = await import("./index");
  expect(listName("the Sahel")).toBe("The Sahel");
  expect(listName("the central Amazon")).toBe("The central Amazon");
  expect(listName("Arctic Canada")).toBe("Arctic Canada");
  expect(listName("the area around 14.50, 0.25")).toBe("The area around 14.50, 0.25");
  expect(listName("")).toBe("");
});

// Scene map (Dev C, with the user's go-ahead): which region or country a typed point is in.
import { countryAt, regionAt } from "./index";

describe("regionAt", () => {
  test("finds the prepared region whose box holds the point", () => {
    expect(regionAt(10, 105.5, sampleRegions)?.id).toBe("mekong-delta");
    expect(regionAt(14, 0, sampleRegions)?.id).toBe("sahel");
  });
  test("returns undefined outside every box", () => {
    expect(regionAt(48.86, 2.35, sampleRegions)).toBeUndefined();
  });
  test("prefers the smallest box when boxes overlap", () => {
    const big = { id: "big", name: "Big", bbox: [0, 100, 20, 120] as [number, number, number, number] };
    expect(regionAt(10, 105.5, [big, ...sampleRegions])?.id).toBe("mekong-delta");
  });
});

describe("countryAt", () => {
  const square = (name: string, w: number, s: number) => ({
    type: "Feature" as const,
    properties: { name },
    geometry: { type: "Polygon" as const, coordinates: [[[w, s], [w, s + 10], [w + 10, s + 10], [w + 10, s], [w, s]]] },
  });
  const countries = { type: "FeatureCollection" as const, features: [square("Squareland", 0, 40), square("Otherland", 20, 40)] };

  test("names the country a point is in", () => {
    expect(countryAt(45, 5, countries)).toBe("Squareland");
    expect(countryAt(45, 25, countries)).toBe("Otherland");
  });
  test("returns undefined at sea", () => {
    expect(countryAt(0, -30, countries)).toBeUndefined();
  });
});

test("placeName uses a point's name when it has one", () => {
  expect(placeName({ kind: "point", lat: 48.86, lon: 2.35, name: "one spot in France" }, sampleRegions)).toBe("one spot in France");
});
