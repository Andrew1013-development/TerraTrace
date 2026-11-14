import { describe, expect, test } from "vitest";
import type { Series } from "../types";
import fixtures from "./fixtures.json";
import {
  analyze,
  countValid,
  deseasonalize,
  mannKendallP,
  monthIndex,
  olsSlopeCi,
  seasonalMannKendallP,
  senSlopePerMonth,
} from "./index";

// Monthly dates from January of startYear, one per value.
function makeSeries(values: (number | null)[], startYear = 2000): Series {
  const dates = values.map((_, i) => {
    const y = startYear + Math.floor(i / 12);
    return `${y}-${String((i % 12) + 1).padStart(2, "0")}`;
  });
  return { variableId: "T2M", placeId: "test", unit: "°C", source: "test", dates, values };
}

const byName = (name: string) => {
  const f = fixtures.find((x) => x.name === name);
  if (!f) throw new Error(`missing fixture ${name}`);
  return f;
};

describe("stats", () => {
  test.each(fixtures)("matches pyMannKendall and scipy: $name", (f) => {
    const t = f.y.map((_, i) => i);
    const months = f.y.map((_, i) => i % 12);
    expect(mannKendallP(f.y)).toBeCloseTo(f.original_p, 3);
    expect(seasonalMannKendallP(f.y, months)).toBeCloseTo(f.seasonal_p, 3);
    expect(senSlopePerMonth(t, f.y)).toBeCloseTo(f.original_slope, 6);
    const [lo, hi] = olsSlopeCi(t, f.y);
    expect(lo).toBeCloseTo(f.ols_ci[0], 6);
    expect(hi).toBeCloseTo(f.ols_ci[1], 6);
  });

  test("hand-checked: y=[1,2,3,4,5] gives p close to 0.0275", () => {
    expect(mannKendallP([1, 2, 3, 4, 5])).toBeCloseTo(0.0275, 4);
  });

  test("monthIndex('2000-01') is 24000 and '2000-12' is 24011", () => {
    expect(monthIndex("2000-01")).toBe(24000);
    expect(monthIndex("2000-12")).toBe(24011);
  });

  test("constant series: mkP is 1 and the interval is [0, 0]", () => {
    const y = Array(120).fill(5);
    const t = y.map((_, i) => i);
    expect(mannKendallP(y)).toBe(1);
    expect(seasonalMannKendallP(y, y.map((_, i) => i % 12))).toBe(1);
    expect(olsSlopeCi(t, y)).toEqual([0, 0]);
    for (const des of [false, true]) {
      const r = analyze(makeSeries(y), des);
      expect(r).not.toBeNull();
      expect(r!.mkP).toBe(1);
      expect(r!.ci95).toEqual([0, 0]);
      expect(Number.isNaN(r!.slopePerDecade)).toBe(false);
    }
  });

  test("ties are corrected: a series with repeated values matches its fixture", () => {
    const f = byName("ties");
    expect(new Set(f.y).size).toBeLessThan(f.y.length);
    expect(mannKendallP(f.y)).toBeCloseTo(f.original_p, 3);
    expect(seasonalMannKendallP(f.y, f.y.map((_, i) => i % 12))).toBeCloseTo(f.seasonal_p, 3);
  });

  test("gap keeps time positions: y = 2t with 24 middle months null gives slope 2 per month", () => {
    const values: (number | null)[] = Array.from({ length: 240 }, (_, i) => 2 * i);
    for (let i = 108; i < 132; i++) values[i] = null;
    const r = analyze(makeSeries(values), false);
    expect(r!.n).toBe(216);
    expect(r!.slopePerDecade).toBeCloseTo(240, 6);
  });

  test("countValid ignores nulls", () => {
    expect(countValid(makeSeries([1, null, 3, null, null, 6]))).toBe(3);
    expect(countValid(makeSeries([null, null]))).toBe(0);
  });

  test("analyze returns null at 119 valid months and a result at 120", () => {
    const base = Array.from({ length: 130 }, (_, i) => i * 0.1);
    const with119 = base.map((v, i) => (i < 11 ? null : v));
    const with120 = base.map((v, i) => (i < 10 ? null : v));
    expect(analyze(makeSeries(with119), true)).toBeNull();
    expect(analyze(makeSeries(with119), false)).toBeNull();
    expect(analyze(makeSeries(with120), true)!.n).toBe(120);
  });

  test("analyze(false) uses plain Mann-Kendall; analyze(true) uses seasonal", () => {
    const f = byName("autocorrelated");
    const s = makeSeries(f.y);
    const raw = analyze(s, false)!;
    const des = analyze(s, true)!;
    expect(raw.deseasonalized).toBe(false);
    expect(des.deseasonalized).toBe(true);
    expect(raw.mkP).toBeCloseTo(f.original_p, 3);
    expect(des.mkP).toBeCloseTo(f.seasonal_p, 3);
  });

  test("analyze reports the slope and interval per decade, 120 times the monthly values", () => {
    const f = byName("trend_cycle");
    const s = makeSeries(f.y);
    const raw = analyze(s, false)!;
    expect(raw.n).toBe(240);
    expect(raw.slopePerDecade).toBeCloseTo(120 * f.original_slope, 4);
    expect(raw.ci95[0]).toBeCloseTo(120 * f.ols_ci[0], 4);
    expect(raw.ci95[1]).toBeCloseTo(120 * f.ols_ci[1], 4);

    // deseasonalized: slope and interval come from the anomalies, not the raw values
    const t = s.dates.map(monthIndex);
    const anomalies = deseasonalize(s) as number[];
    const des = analyze(s, true)!;
    expect(des.slopePerDecade).toBeCloseTo(120 * senSlopePerMonth(t, anomalies), 6);
    const [lo, hi] = olsSlopeCi(t, anomalies);
    expect(des.ci95[0]).toBeCloseTo(120 * lo, 6);
    expect(des.ci95[1]).toBeCloseTo(120 * hi, 6);
  });

  test("deseasonalize turns a pure seasonal cycle into values near 0 and keeps nulls", () => {
    const values: (number | null)[] = Array.from({ length: 36 }, (_, i) => 10 + 3 * Math.sin((2 * Math.PI * i) / 12));
    values[5] = null;
    const out = deseasonalize(makeSeries(values));
    expect(out).toHaveLength(36);
    expect(out[5]).toBeNull();
    for (const [i, v] of out.entries()) {
      if (i !== 5) expect(v).toBeCloseTo(0, 9);
    }
  });
});

// D3: calendar months must come from the dates. This series starts in April, skips one
// month entirely (no date entry) and has one null value, so counting months by position
// or by array index gives different answers.
describe("seasonal paths with a gap and a mid-year start (D3)", () => {
  const start = { year: 2000, month: 4 };
  const dates = Array.from({ length: 240 }, (_, i) => {
    const m = start.month - 1 + i;
    return `${start.year + Math.floor(m / 12)}-${String((m % 12) + 1).padStart(2, "0")}`;
  });
  const cycle = (d: string) => 5 * Math.sin((2 * Math.PI * (Number(d.slice(5, 7)) - 1)) / 12);
  const skipped = 60; // this month has no entry at all
  const gap = 100; // this month is present but null
  const kept = dates.filter((_, i) => i !== skipped);
  const series = (f: (d: string, i: number) => number): Series => ({
    variableId: "TEST", placeId: "test", unit: "u", source: "synthetic",
    dates: kept, values: kept.map((d, i) => (i === gap ? null : f(d, i))),
  });

  test("analyze(true) uses the true calendar month of every value", () => {
    const s = series((d, i) => cycle(d) + 0.002 * i + 0.3 * Math.sin(i * 1.7));
    const valid = s.values.map((v, i) => [v, s.dates[i]] as const).filter(([v]) => v !== null);
    const months = valid.map(([, d]) => Number(d.slice(5, 7)) - 1);
    expect(analyze(s, true)!.mkP).toBeCloseTo(seasonalMannKendallP(valid.map(([v]) => v as number), months), 12);
  });

  test("deseasonalize removes a pure seasonal cycle, whatever the start month", () => {
    const out = deseasonalize(series((d) => cycle(d)));
    expect(out[gap]).toBeNull();
    for (const v of out) if (v !== null) expect(Math.abs(v)).toBeLessThan(1e-9);
  });
});

test("olsSlopeCi never returns NaN, even below 3 points (D11)", () => {
  for (const [t, y] of [[[], []], [[0], [1]], [[0, 1], [5, 5]], [[0, 1], [1, 3]]] as const) {
    expect(olsSlopeCi([...t], [...y]).every(Number.isFinite), JSON.stringify([t, y])).toBe(true);
  }
});
