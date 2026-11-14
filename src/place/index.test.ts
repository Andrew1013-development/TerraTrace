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

// Scene map (Dev C, with the user's go-ahead): the POWER grid cell a typed point's data comes from.
import { powerCell } from "./index";

describe("powerCell", () => {
  const merra = { source: "NASA POWER monthly (MERRA-2), API v2.10.0" };
  const ceres = { source: "NASA POWER monthly (CERES SYN1deg), API v2.10.0" };

  test("MERRA-2 cells are 0.5° by 0.625°, centred on the grid nearest the point", () => {
    expect(powerCell(10.5, 106.7, merra)).toEqual([10.25, 106.5625, 10.75, 107.1875]);
    expect(powerCell(-33.9, 151.2, merra)).toEqual([-34.25, 150.9375, -33.75, 151.5625]);
  });

  test("CERES SYN1deg cells are 1° by 1°, centred on half degrees", () => {
    expect(powerCell(10.5, 106.7, ceres)).toEqual([10, 106, 11, 107]);
    expect(powerCell(-0.2, -0.2, ceres)).toEqual([-1, -1, 0, 0]);
  });

  test("cells never run past the poles", () => {
    const [s, , n] = powerCell(90, 0, merra);
    expect(n).toBe(90);
    expect(s).toBe(89.75);
  });
});
