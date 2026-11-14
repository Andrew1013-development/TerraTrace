// Live check against the real NASA POWER API. Manual only: `npm run test:live`, or the
// "Live POWER check" workflow. `npx vitest run` never picks it up (*.live.ts), so tests stay offline.
//
// The golden values were recomputed independently (pyMannKendall + scipy) and matched exactly by the
// live page (issue 43). A failure means POWER revised its data or our code changed the result:
// rerun that cross-check before trusting either side, and never edit the golden file to make it pass.
import { expect, test } from "vitest";
import catalogJson from "../../public/data/catalog.json";
import { analyze } from "../stats";
import type { Variable } from "../types";
import { formatNumber, getVerdict } from "../verdict";
import { getSeries } from "./index";
import golden from "./power-live.golden.json";

const t2m = (catalogJson as Variable[]).find((v) => v.id === "T2M")!;
const word = { rise: "Rising", fall: "Falling", mixed: "Mixed evidence", none: "No significant trend" } as const;
const pText = (p: number) => (p < 0.001 ? "< 0.001" : p.toFixed(3)); // as the Evidence screen shows it
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

test.each(golden.points)("$name ($lat, $lon) still matches the verified values", async (g) => {
  const s = await getSeries(t2m, { kind: "point", lat: g.lat, lon: g.lon });
  expect(s.values.length, "months 1981-2025").toBe(540);
  expect(s.values.every((v) => v !== null), "no missing months").toBe(true);
  for (const [toggle, want] of [[true, g.on], [false, g.off]] as const) {
    const t = analyze(s, toggle)!;
    const got = {
      rate: formatNumber(t.slopePerDecade, true),
      ci: t.ci95.map((x) => formatNumber(x)),
      p: pText(t.mkP),
      kind: word[getVerdict(t, t2m, "here").kind],
    };
    expect(got, `${g.name}, seasonal cycle ${toggle ? "removed" : "kept"}`).toEqual(want);
  }
  await sleep(1500); // be polite to POWER between points
});
