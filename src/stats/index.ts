// Trend statistics (task B2), from architecture section 7.1. Pure: no fetch, DOM, clock or randomness.
import type { Series, TrendResult } from "../types";

const MIN_MONTHS = 120;
const MONTHS_PER_DECADE = 120;

export function monthIndex(date: string): number {
  const [year, month] = date.split("-").map(Number);
  return year * 12 + (month - 1);
}

// Calendar month 0-11 from "YYYY-MM"; from the string, not the array index, because series have gaps.
function calendarMonth(date: string): number {
  return Number(date.split("-")[1]) - 1;
}

export function countValid(series: Series): number {
  return series.values.filter((v) => v !== null).length;
}

export function deseasonalize(series: Series): (number | null)[] {
  const sums = Array(12).fill(0);
  const counts = Array(12).fill(0);
  series.values.forEach((v, i) => {
    if (v === null) return;
    const m = calendarMonth(series.dates[i]);
    sums[m] += v;
    counts[m] += 1;
  });
  return series.values.map((v, i) => {
    if (v === null) return null;
    const m = calendarMonth(series.dates[i]);
    return v - sums[m] / counts[m];
  });
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function senSlopePerMonth(t: number[], y: number[]): number {
  const slopes: number[] = [];
  for (let i = 0; i < y.length; i++) {
    for (let j = i + 1; j < y.length; j++) slopes.push((y[j] - y[i]) / (t[j] - t[i]));
  }
  return slopes.length ? median(slopes) : 0;
}

// Mann-Kendall S and its tie-corrected variance for one group of values in time order.
function scoreAndVariance(y: number[]): { s: number; v: number } {
  const n = y.length;
  let s = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) s += Math.sign(y[j] - y[i]);
  }
  const ties = new Map<number, number>();
  for (const value of y) ties.set(value, (ties.get(value) ?? 0) + 1);
  let tieTerm = 0;
  for (const g of ties.values()) tieTerm += g * (g - 1) * (2 * g + 5);
  return { s, v: (n * (n - 1) * (2 * n + 5) - tieTerm) / 18 };
}

// Two-sided p from S and Var with the continuity correction. p = 2(1 - Phi(|Z|)) = 1 - erf(|Z|/sqrt 2),
// computed with the Abramowitz-Stegun 7.1.26 erf approximation (error about 1.5e-7).
function pFromScore(s: number, v: number): number {
  if (v === 0 || s === 0) return 1;
  const z = (s > 0 ? s - 1 : s + 1) / Math.sqrt(v);
  const x = Math.abs(z) / Math.SQRT2;
  const k = 1 / (1 + 0.3275911 * x);
  const poly = k * (0.254829592 + k * (-0.284496736 + k * (1.421413741 + k * (-1.453152027 + k * 1.061405429))));
  return poly * Math.exp(-x * x);
}

export function mannKendallP(y: number[]): number {
  const { s, v } = scoreAndVariance(y);
  return pFromScore(s, v);
}

export function seasonalMannKendallP(y: number[], months: number[]): number {
  const groups = new Map<number, number[]>();
  y.forEach((value, i) => {
    const g = groups.get(months[i]);
    if (g) g.push(value);
    else groups.set(months[i], [value]);
  });
  let s = 0;
  let v = 0;
  for (const g of groups.values()) {
    const r = scoreAndVariance(g);
    s += r.s;
    v += r.v;
  }
  return pFromScore(s, v);
}

export function olsSlopeCi(t: number[], y: number[]): [number, number] {
  const n = y.length;
  // No interval exists below 3 points (n - 2 degrees of freedom); analyze never asks below 120 (D11).
  if (n < 3) return [0, 0];
  const tMean = t.reduce((a, b) => a + b, 0) / n;
  const yMean = y.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    const dt = t[i] - tMean; // centred: t is about 24000, so this keeps precision
    sxy += dt * (y[i] - yMean);
    sxx += dt * dt;
  }
  const b = sxy / sxx;
  let sse = 0;
  for (let i = 0; i < n; i++) {
    const r = y[i] - yMean - b * (t[i] - tMean);
    sse += r * r;
  }
  const se = Math.sqrt(sse / (n - 2) / sxx);
  // shortcut: fixed t critical for n>=120 (df 118 gives 1.980), use a t quantile if the minimum length drops.
  return [b - 1.98 * se, b + 1.98 * se];
}

export function analyze(series: Series, deseasonalized: boolean): TrendResult | null {
  if (countValid(series) < MIN_MONTHS) return null;

  const anomalies = deseasonalize(series);
  const t: number[] = [];
  const raw: number[] = [];
  const fitted: number[] = [];
  const months: number[] = [];
  series.values.forEach((v, i) => {
    if (v === null) return;
    t.push(monthIndex(series.dates[i]));
    raw.push(v);
    fitted.push(deseasonalized ? (anomalies[i] as number) : v);
    months.push(calendarMonth(series.dates[i]));
  });

  // Deseasonalized: seasonal test on raw values, slope and interval on anomalies.
  const mkP = deseasonalized ? seasonalMannKendallP(raw, months) : mannKendallP(raw);
  const [lo, hi] = olsSlopeCi(t, fitted);
  return {
    n: raw.length,
    slopePerDecade: senSlopePerMonth(t, fitted) * MONTHS_PER_DECADE,
    ci95: [lo * MONTHS_PER_DECADE, hi * MONTHS_PER_DECADE],
    mkP,
    deseasonalized,
  };
}
