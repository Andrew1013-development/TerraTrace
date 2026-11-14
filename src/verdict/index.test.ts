import { describe, expect, test } from "vitest";
import { sampleCatalog } from "../fixtures";
import type { TrendResult, Verdict } from "../types";
import { formatNumber, getVerdict, hunchLine, oppositeDirections } from "./index";

const T2M = sampleCatalog.find((v) => v.id === "T2M")!; // name "air temperature", unit "°C"
const PLACE = "Sahel";
const CAVEAT =
  "Monthly values are often related to their neighbours, which can make a trend look more certain than it is.";

const r = (mkP: number, ci95: [number, number], slopePerDecade = ci95[0]): TrendResult => ({
  n: 240, mkP, ci95, slopePerDecade, deseasonalized: true,
});
const kind = (res: TrendResult) => getVerdict(res, T2M, PLACE).kind;
const text = (res: TrendResult) => getVerdict(res, T2M, PLACE).text;
const v = (k: Verdict["kind"]): Verdict => ({ kind: k, text: "", caveat: "" });

describe("verdict rule", () => {
  test("mkP .01, CI [.1,.3] gives rise", () => {
    expect(kind(r(0.01, [0.1, 0.3]))).toBe("rise");
  });

  test("mkP .01, CI [-.3,-.1] with a negative slope gives fall", () => {
    expect(kind(r(0.01, [-0.3, -0.1], -0.2))).toBe("fall");
  });

  test("mkP .01, CI [-.1,.3] gives mixed", () => {
    expect(kind(r(0.01, [-0.1, 0.3]))).toBe("mixed");
  });

  test("mkP .2, CI [.1,.3] gives mixed", () => {
    expect(kind(r(0.2, [0.1, 0.3]))).toBe("mixed");
  });

  test("mkP .2, CI [-.1,.3] gives none", () => {
    expect(kind(r(0.2, [-0.1, 0.3]))).toBe("none");
  });

  test("mkP exactly .05 is not significant", () => {
    expect(kind(r(0.05, [0.1, 0.3]))).toBe("mixed");
    expect(kind(r(0.05, [-0.1, 0.3]))).toBe("none");
  });

  test("an interval touching 0 does not exclude 0", () => {
    expect(kind(r(0.01, [0, 0.3], 0.1))).toBe("mixed");
    expect(kind(r(0.01, [-0.3, 0], -0.1))).toBe("mixed");
    expect(kind(r(0.2, [0, 0.3], 0.1))).toBe("none");
  });

  test("significant, but the slope's sign and the interval's side disagree, gives mixed", () => {
    expect(kind(r(0.01, [0.1, 0.3], -0.05))).toBe("mixed");
    expect(kind(r(0.01, [-0.3, -0.1], 0.05))).toBe("mixed");
  });

  test("significant with a slope of exactly 0 gives mixed", () => {
    expect(kind(r(0.01, [0.1, 0.3], 0))).toBe("mixed");
  });
});

describe("verdict wording", () => {
  test("each kind produces exactly the wording in architecture section 7.2", () => {
    expect(text(r(0.01, [0.1, 0.3], 0.24))).toBe(
      "Air temperature in Sahel has risen by about 0.24 °C per decade, and the evidence is strong.",
    );
    expect(text(r(0.01, [-0.3, -0.1], -0.24))).toBe(
      "Air temperature in Sahel has fallen by about 0.24 °C per decade, and the evidence is strong.",
    );
    expect(text(r(0.01, [-0.1, 0.3], 0.24))).toBe(
      "Air temperature in Sahel may be changing, by about 0.24 °C per decade, but our two checks disagree. Treat this as uncertain.",
    );
    expect(text(r(0.2, [-0.1, 0.3], 0.03))).toBe(
      "We found no significant long-term trend in air temperature in Sahel. That is a real result: it has stayed within its normal ups and downs.",
    );
  });

  test("the rate has 2 significant figures and is never in exponent form", () => {
    expect(text(r(0.01, [-0.3, -0.1], -0.2449))).toContain("by about 0.24 °C");
    expect(text(r(0.2, [0.1, 0.3], 0.00000012))).toContain("by about 0.00000012 °C");
    expect(text(r(0.2, [0.1, 0.3], 1234567))).toContain("by about 1200000 °C");
    for (const slope of [0.00000012, 1234567, 0.000456, 98765]) {
      expect(text(r(0.2, [0.1, 0.3], slope))).not.toMatch(/\de[+-]?\d/);
    }
  });

  test("every verdict carries the caveat text", () => {
    for (const res of [r(0.01, [0.1, 0.3]), r(0.01, [-0.3, -0.1], -0.2), r(0.01, [-0.1, 0.3]), r(0.2, [-0.1, 0.3])]) {
      expect(getVerdict(res, T2M, PLACE).caveat).toBe(CAVEAT);
    }
  });
});

describe("hunch and comparison", () => {
  test("hunchLine: the three cases in section 7.2", () => {
    expect(hunchLine("rise", v("mixed"))).toBe("Your hunch is neither confirmed nor ruled out.");
    expect(hunchLine("none", v("mixed"))).toBe("Your hunch is neither confirmed nor ruled out.");
    expect(hunchLine("rise", v("rise"))).toBe("Your hunch was right.");
    expect(hunchLine("none", v("none"))).toBe("Your hunch was right.");
    expect(hunchLine("rise", v("fall"))).toBe("The evidence does not support your hunch.");
    expect(hunchLine("fall", v("none"))).toBe("The evidence does not support your hunch.");
  });

  test("oppositeDirections is true only for rise beside fall", () => {
    expect(oppositeDirections(v("rise"), v("fall"))).toBe(true);
    expect(oppositeDirections(v("fall"), v("rise"))).toBe(true);
    expect(oppositeDirections(v("rise"), v("rise"))).toBe(false);
    expect(oppositeDirections(v("rise"), v("mixed"))).toBe(false);
    expect(oppositeDirections(v("none"), v("fall"))).toBe(false);
  });
});

test("extreme rates never throw, use exponent form, or print Infinity (D9)", () => {
  const say = (slope: number) => text(r(0.2, [0.1, 0.3], slope)); // mixed: the rate is in the sentence
  expect(() => say(1e-100)).not.toThrow();
  expect(say(1e-100)).toBe(ZERO_MIXED);
  expect(say(-1.5e-20)).toBe(ZERO_MIXED);
  expect(say(0.00000012)).toContain("by about 0.00000012 °C"); // unchanged above the floor
  expect(say(1e21)).toContain("by about 1000000000000000000000 °C");
  expect(say(1.5e21)).toContain("by about 1500000000000000000000 °C");
  const huge = say(Number.MAX_VALUE);
  expect(huge).toMatch(/by about 18\d+ °C/);
  for (const s of [1e-100, 1.5e-20, 1e21, 1.5e21, Number.MAX_VALUE]) {
    expect(say(s)).not.toMatch(/\de[+-]?\d|Infinity|NaN/);
  }
});

// D1: a mixed verdict whose rate rounds to 0 leaves the rate clause out (section 7.2, proposed).
const ZERO_MIXED = "Air temperature in Sahel may be changing, but our two checks disagree. Treat this as uncertain.";

test("a mixed verdict with a zero rate does not say \"by about 0\" (D1)", () => {
  expect(text(r(0.01, [0.1, 0.3], 0))).toBe(ZERO_MIXED); // significant, slope exactly 0
  expect(text(r(0.2, [0.1, 0.3], 1e-12))).toBe(ZERO_MIXED); // not significant, interval excludes 0
  expect(text(r(0.2, [0.1, 0.3], 0.0049))).toContain("by about 0.0049 °C"); // a small real rate keeps it
});

test("formatNumber: 2 significant figures, a true minus sign, and + only when asked (D16)", () => {
  expect(formatNumber(0.2)).toBe("0.20");
  expect(formatNumber(0.2, true)).toBe("+0.20");
  expect(formatNumber(-0.12)).toBe("−0.12");
  expect(formatNumber(-0.054, true)).toBe("−0.054");
  expect(formatNumber(1234.5)).toBe("1200");
  expect(formatNumber(0, true)).toBe("0");
  expect(formatNumber(-1e-12)).toBe("0");
});

// Custom period (issue 46): with years, every sentence begins "From {start} to {end}, ".
describe("verdict with years (issue 46)", () => {
  const said = (res: TrendResult) => getVerdict(res, T2M, PLACE, [1995, 2025]);

  test("each kind names its years, and the rest of the sentence is unchanged", () => {
    expect(said(r(0.01, [0.1, 0.3], 0.2)).text).toBe(
      "From 1995 to 2025, air temperature in Sahel has risen by about 0.20 °C per decade, and the evidence is strong.",
    );
    expect(said(r(0.01, [-0.3, -0.1], -0.2)).text).toBe(
      "From 1995 to 2025, air temperature in Sahel has fallen by about 0.20 °C per decade, and the evidence is strong.",
    );
    expect(said(r(0.01, [-0.1, 0.3], 0.1)).text).toBe(
      "From 1995 to 2025, air temperature in Sahel may be changing, by about 0.10 °C per decade, but our two checks disagree. Treat this as uncertain.",
    );
    expect(said(r(0.2, [-0.1, 0.3], 0.03)).text).toBe(
      "From 1995 to 2025, we found no significant long-term trend in air temperature in Sahel. That is a real result: it has stayed within its normal ups and downs.",
    );
    expect(said(r(0.01, [0.1, 0.3], 0)).text).toBe(
      "From 1995 to 2025, air temperature in Sahel may be changing, but our two checks disagree. Treat this as uncertain.",
    );
  });

  test("years change only the text: kind and caveat are the same, and without years nothing changes", () => {
    for (const res of [r(0.01, [0.1, 0.3]), r(0.01, [-0.3, -0.1], -0.2), r(0.01, [-0.1, 0.3]), r(0.2, [-0.1, 0.3])]) {
      const plain = getVerdict(res, T2M, PLACE);
      const dated = said(res);
      expect(dated.kind).toBe(plain.kind);
      expect(dated.caveat).toBe(CAVEAT);
      expect(getVerdict(res, T2M, PLACE, undefined)).toEqual(plain);
      expect(hunchLine("rise", dated)).toBe(hunchLine("rise", plain));
    }
  });
});
