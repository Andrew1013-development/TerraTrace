// Verdict rule and wording (task B3), from architecture section 7.2. Works only from the TrendResult given.
import type { Hunch, TrendResult, Variable, Verdict } from "../types";

const ALPHA = 0.05;
const CAVEAT =
  "Monthly values are often related to their neighbours, which can make a trend look more certain than it is.";

// Absolute value at 2 significant figures as a plain decimal; toPrecision alone gives "1.2e-7".
function formatRate(x: number): string {
  const a = Math.abs(x);
  if (a === 0) return "0";
  const rounded = Number(a.toPrecision(2));
  const decimals = Math.max(0, 1 - Math.floor(Math.log10(rounded)));
  return rounded.toFixed(decimals);
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function getVerdict(result: TrendResult, variable: Variable, place: string): Verdict {
  const { mkP, ci95: [lo, hi], slopePerDecade: slope } = result;
  const significant = mkP < ALPHA;
  const above = lo > 0 && hi > 0;
  const below = lo < 0 && hi < 0;
  const excludesZero = above || below;

  let kind: Verdict["kind"];
  if (significant && excludesZero) kind = slope > 0 && above ? "rise" : slope < 0 && below ? "fall" : "mixed";
  else kind = significant || excludesZero ? "mixed" : "none";

  const Name = capitalize(variable.name);
  const rate = `${formatRate(slope)} ${variable.unit}`;
  const text = {
    rise: `${Name} in ${place} has risen by about ${rate} per decade, and the evidence is strong.`,
    fall: `${Name} in ${place} has fallen by about ${rate} per decade, and the evidence is strong.`,
    mixed: `${Name} in ${place} may be changing, by about ${rate} per decade, but our two checks disagree. Treat this as uncertain.`,
    none: `We found no significant long-term trend in ${variable.name} in ${place}. That is a real result: it has stayed within its normal ups and downs.`,
  }[kind];

  return { kind, text, caveat: CAVEAT };
}

export function hunchLine(hunch: Hunch, verdict: Verdict): string {
  if (verdict.kind === "mixed") return "Your hunch is neither confirmed nor ruled out.";
  if (hunch === verdict.kind) return "Your hunch was right.";
  return "The evidence does not support your hunch.";
}

export function oppositeDirections(a: Verdict, b: Verdict): boolean {
  return (a.kind === "rise" && b.kind === "fall") || (a.kind === "fall" && b.kind === "rise");
}
