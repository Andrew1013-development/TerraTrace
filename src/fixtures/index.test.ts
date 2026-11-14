import { describe, expect, test } from "vitest";
import {
  sampleCatalog,
  sampleLeads,
  sampleRegions,
  sampleResult,
  sampleSeries,
} from "./index";

const FIRST_QUESTION_TAGS = ["air", "water", "land", "life"];

describe("fixtures (all synthetic)", () => {
  test("sampleSeries has 180 dates and 180 values in ascending YYYY-MM order", () => {
    expect(sampleSeries.dates).toHaveLength(180);
    expect(sampleSeries.values).toHaveLength(180);
    expect(sampleSeries.dates.every((d) => /^\d{4}-(0[1-9]|1[0-2])$/.test(d))).toBe(true);
    expect(sampleSeries.dates).toEqual([...sampleSeries.dates].sort());
    expect(new Set(sampleSeries.dates).size).toBe(180);
  });

  test("sampleSeries has no missing values and is deterministic", async () => {
    expect(sampleSeries.values.every((v) => typeof v === "number" && Number.isFinite(v))).toBe(true);
    const again = (await import("./index")).sampleSeries;
    expect(again.values).toEqual(sampleSeries.values);
  });

  test("sampleSeries names a variable and a region in the other fixtures", () => {
    expect(sampleCatalog.map((v) => v.id)).toContain(sampleSeries.variableId);
    expect(sampleRegions.map((r) => r.id)).toContain(sampleSeries.placeId);
  });

  test("sampleCatalog has 4 variables including T2M and PRECTOTCORR", () => {
    expect(sampleCatalog).toHaveLength(4);
    const ids = sampleCatalog.map((v) => v.id);
    expect(ids).toContain("T2M");
    expect(ids).toContain("PRECTOTCORR");
    expect(new Set(ids).size).toBe(4);
  });

  test("every sampleCatalog variable has a first-question tag and one more tag", () => {
    for (const v of sampleCatalog) {
      expect(v.tags.some((t) => FIRST_QUESTION_TAGS.includes(t))).toBe(true);
      expect(v.tags.length).toBeGreaterThanOrEqual(2);
      expect(v.definition).not.toBe("");
    }
  });

  test("sampleRegions has 3 regions with south < north and west < east", () => {
    expect(sampleRegions).toHaveLength(3);
    for (const { bbox: [s, w, n, e] } of sampleRegions) {
      expect(s).toBeLessThan(n);
      expect(w).toBeLessThan(e);
    }
  });

  test("sampleLeads has 2 entries that name a region and variable in the other fixtures", () => {
    expect(sampleLeads).toHaveLength(2);
    for (const l of sampleLeads) {
      expect(sampleRegions.map((r) => r.id)).toContain(l.regionId);
      expect(sampleCatalog.map((v) => v.id)).toContain(l.variableId);
      expect(l.sourceUrl).toMatch(/^https?:\/\//);
    }
  });

  test("sampleResult is a plausible TrendResult with n of 180", () => {
    expect(sampleResult.n).toBe(180);
    expect(sampleResult.mkP).toBeGreaterThanOrEqual(0);
    expect(sampleResult.mkP).toBeLessThanOrEqual(1);
    expect(sampleResult.ci95[0]).toBeLessThan(sampleResult.ci95[1]);
  });
});
