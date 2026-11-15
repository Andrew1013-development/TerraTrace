// Verdict rule and wording (task B3), from architecture section 7.2. Works only from the TrendResult given.
import type { Hunch, TrendResult, Variable, Verdict } from "../types";

const ALPHA = 0.05;
const CAVEAT =
  "Monthly values are often related to their neighbours, which can make a trend look more certain than it is.";

// 2 significant figures as a plain decimal; toPrecision alone gives "1.2e-7". Negatives use the
// true minus sign; "+" only when signed. Shared with the Evidence screen, so both read alike (D16).
// Below 1e-10 it shows "0": toFixed throws past 100 digits and prints 20+ digits long before (D9).
export function formatNumber(x: number, signed = false): string {
  const a = Math.abs(x);
  if (!(a >= 1e-10)) return "0";
  const rounded = Number(a.toPrecision(2));
  let digits: string;
  if (rounded < 1e21) digits = rounded.toFixed(Math.max(0, 1 - Math.floor(Math.log10(rounded))));
  else {
    // toFixed switches to exponent form from 1e21: write the 2 digits and pad with zeros (D9).
    const [mantissa, exponent] = a.toPrecision(2).split("e");
    digits = mantissa.replace(".", "").padEnd(Number(exponent) + 1, "0");
  }
  return (x < 0 ? "\u2212" : signed ? "+" : "") + digits;
}

// A rate in "%" is a change in percentage points; "0.76 % per decade" reads as a relative change.
export const rateUnit = (unit: string) => (unit === "%" ? "percentage points" : unit);

// Shown instead of a verdict when isConstant: "no significant trend … ups and downs" would describe variation that isn't there (issue 57).
export const constantText = (value: number, unit: string) =>
  `Every month in this record is ${formatNumber(value)} ${unit}, so there is no trend to test.`;

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// years (issue 46): when given, the sentence begins "From {start} to {end}, "; without it, nothing changes.
export function getVerdict(
  result: TrendResult,
  variable: Variable,
  place: string,
  years?: [number, number],
): Verdict {
  const { mkP, ci95: [lo, hi], slopePerDecade: slope } = result;
  const significant = mkP < ALPHA;
  const above = lo > 0 && hi > 0;
  const below = lo < 0 && hi < 0;
  const excludesZero = above || below;

  let kind: Verdict["kind"];
  if (significant && excludesZero) kind = slope > 0 && above ? "rise" : slope < 0 && below ? "fall" : "mixed";
  else kind = significant || excludesZero ? "mixed" : "none";

  const Name = capitalize(variable.name);
  const shown = formatNumber(Math.abs(slope));
  const unit = rateUnit(variable.unit);
  // Below the formatNumber floor a rise or fall would read "by about 0": give the floor as a bound instead.
  const by = shown === "0" ? `by less than 0.0000000001 ${unit}` : `by about ${shown} ${unit}`;
  const text = {
    rise: `${Name} in ${place} has risen ${by} per decade, and the evidence is strong.`,
    fall: `${Name} in ${place} has fallen ${by} per decade, and the evidence is strong.`,
    // A rate that rounds to 0 would read "by about 0", which contradicts "may be changing" (D1).
    // Otherwise the sentence prints the rate without its sign, so it names the direction in words.
    mixed: shown === "0"
      ? `${Name} in ${place} may be changing, but our two checks disagree. Treat this as uncertain.`
      : `${Name} in ${place} may be ${slope > 0 ? "rising" : "falling"}, ${by} per decade, but our two checks disagree. Treat this as uncertain.`,
    none: `We found no significant long-term trend in ${variable.name} in ${place}. That is a real result: it has stayed within its normal ups and downs.`,
  }[kind];

  // Variable names are lower case by contract, so lowering the first letter restores them ("Air" to "air", "We" to "we").
  const dated = years ? `From ${years[0]} to ${years[1]}, ${text.charAt(0).toLowerCase()}${text.slice(1)}` : text;
  return { kind, text: dated, caveat: CAVEAT };
}

export function hunchLine(hunch: Hunch, verdict: Verdict): string {
  if (verdict.kind === "mixed") return "Your hunch is neither confirmed nor ruled out.";
  if (hunch === verdict.kind) return "Your hunch was right.";
  return "The evidence does not support your hunch.";
}

export function oppositeDirections(a: Verdict, b: Verdict): boolean {
  return (a.kind === "rise" && b.kind === "fall") || (a.kind === "fall" && b.kind === "rise");
}
