// shortcut: a test-only stand-in for the three custom-period functions in src/stats (issue 46), which are still
// stubs on main. It follows the issue's contract. Delete it, and the vi.mock calls that use it, once Dev A's
// implementation is merged.
import type { Series } from "../types";

const year = (d: string) => Number(d.slice(0, 4));

export function selectableYears(series: Series): number[] {
  const months = new Map<number, number>();
  series.dates.forEach((d, i) => {
    if (series.values[i] !== null) months.set(year(d), (months.get(year(d)) ?? 0) + 1);
  });
  return [...months].filter(([, n]) => n === 12).map(([y]) => y).sort((a, b) => a - b);
}

export function validPeriod(series: Series, start: number, end: number): boolean {
  const years = selectableYears(series);
  return years.includes(start) && years.includes(end) && end - start + 1 >= 10;
}

export function slicePeriod(series: Series, start: number, end: number): Series {
  const keep = series.dates.map((d) => year(d) >= start && year(d) <= end);
  return {
    ...series,
    dates: series.dates.filter((_, i) => keep[i]),
    values: series.values.filter((_, i) => keep[i]),
  };
}
