// Backend pipeline test: walks the five screens in the order of architecture section 5,
// calling only the public signatures of section 4, on the real files in public/data.
// No network: our files are served from disk and POWER is faked (see testFetch.ts).
// Test code may import every folder; app code keeps the one-way rule of section 2.
import { beforeEach, describe, expect, test, vi } from "vitest";
import { liveOptions, narrow, nextQuestion, questions } from "../clues";
import { leadsFor, parsePoint, placeName } from "../place";
import { analyze, countValid, deseasonalize } from "../stats";
import type { Hunch, Lead, Region, Variable, Verdict } from "../types";
import { getVerdict, hunchLine, oppositeDirections } from "../verdict";
import { type Power, stubFetch } from "./testFetch";

let data: typeof import("./index");
let fetchMock: ReturnType<typeof stubFetch>;

// A fresh data module per test, so its in-memory cache starts empty.
async function start(power: Power = "down") {
  fetchMock = stubFetch(power);
  vi.resetModules();
  data = await import("./index");
}

async function loadAll(): Promise<[Variable[], Region[], Lead[]]> {
  return Promise.all([data.loadCatalog(), data.loadRegions(), data.loadLeads()]);
}

const MESSAGES = {
  "rate-limit": "NASA's data service is busy. Try a prepared region, or wait a minute.",
  network: "We couldn't reach NASA's data service. Check your connection, or try a prepared region.",
  unavailable: "This data isn't available for that place. Try a prepared region.",
};

describe("1. Load: the files every screen starts from", () => {
  beforeEach(() => start());

  test("each loader reads its file under BASE_URL, once", async () => {
    const [catalog, regions, leads] = await loadAll();
    await loadAll();
    expect(catalog.length).toBeGreaterThan(0);
    expect(regions.length).toBeGreaterThan(0);
    expect(Array.isArray(leads)).toBe(true);
    for (const f of ["catalog.json", "regions.json", "leads.json"]) {
      expect(fetchMock.mock.calls.filter(([u]) => u === `${import.meta.env.BASE_URL}data/${f}`)).toHaveLength(1);
    }
  });
});

describe("2. Clues: a student aiming at a variable can reach it", () => {
  beforeEach(() => start());

  test("answering with an option that fits the variable ends with it among at most 3 suspects", async () => {
    const [catalog] = await loadAll();
    const before = structuredClone(catalog);
    for (const target of catalog) {
      let suspects = catalog;
      const asked: string[] = [];
      for (let q = nextQuestion(suspects, asked, questions); q; q = nextQuestion(suspects, asked, questions)) {
        const pick = liveOptions(q, suspects).find((o) => o.tags.some((t) => target.tags.includes(t)));
        expect(pick, `${target.id}: no option fits at question "${q.id}"`).toBeDefined();
        suspects = narrow(suspects, pick!);
        asked.push(q.id);
      }
      expect(suspects.map((v) => v.id), target.id).toContain(target.id);
      expect(suspects.length, target.id).toBeLessThanOrEqual(3);
    }
    expect(catalog).toEqual(before);
  });
});

describe("3. Scene: places and leads", () => {
  beforeEach(() => start());

  test("every region is named, typed coordinates are parsed and named, bad input is rejected", async () => {
    const [, regions] = await loadAll();
    for (const r of regions) expect(placeName({ kind: "region", id: r.id }, regions)).toBe(r.name);
    const p = parsePoint("10,5", "106.7");
    expect(p).toEqual({ kind: "point", lat: 10.5, lon: 106.7 });
    expect(placeName(p!, regions)).toBe("10.50, 106.70");
    expect(parsePoint("91", "0")).toBeNull();
    expect(parsePoint("abc", "1")).toBeNull();
  });

  test("leadsFor returns every lead for its region and variable, and nothing else", async () => {
    const [, , leads] = await loadAll();
    for (const l of leads) {
      const found = leadsFor(leads, l.regionId, l.variableId);
      expect(found).toContainEqual(l);
      expect(found.every((x) => x.regionId === l.regionId && x.variableId === l.variableId)).toBe(true);
    }
  });
});

describe("4. Evidence: every catalog variable in every region", () => {
  beforeEach(() => start());

  test("getSeries meets the Series contract and analyze gives a clean result in both toggle states", async () => {
    const [catalog, regions] = await loadAll();
    for (const v of catalog) {
      for (const r of regions) {
        const at = `${v.id}/${r.id}`;
        const s = await data.getSeries(v, { kind: "region", id: r.id });
        expect([s.variableId, s.placeId, s.unit], at).toEqual([v.id, r.id, v.unit]);
        // The chart shows this line, so it names the catalog's product and version (issue 22).
        expect(s.source, at).toBe(`${v.source}, sampled regional mean of 9 points`);
        expect(s.dates.length, at).toBe(s.values.length);
        expect(s.dates.every((d) => /^\d{4}-(0[1-9]|1[0-2])$/.test(d)), at).toBe(true);
        expect(s.dates, at).toEqual([...s.dates].sort());
        expect(new Set(s.dates).size, at).toBe(s.dates.length);
        expect(Number(s.dates[0].slice(0, 4)), at).toBe(v.startYear);
        expect(s.values.every((x) => x === null || Number.isFinite(x)), at).toBe(true);

        const n = countValid(s);
        expect(n, at).toBeGreaterThanOrEqual(120);
        const anomalies = deseasonalize(s);
        expect(anomalies.length, at).toBe(s.values.length);
        expect(anomalies.map((x) => x === null), at).toEqual(s.values.map((x) => x === null));

        for (const toggle of [true, false]) {
          const t = analyze(s, toggle);
          expect(t, `${at} toggle ${toggle}`).not.toBeNull();
          expect(t!.n).toBe(n);
          expect(t!.deseasonalized).toBe(toggle);
          expect(t!.mkP).toBeGreaterThanOrEqual(0);
          expect(t!.mkP).toBeLessThanOrEqual(1);
          expect(t!.ci95[0]).toBeLessThanOrEqual(t!.ci95[1]);
          expect([t!.mkP, t!.slopePerDecade, ...t!.ci95].every(Number.isFinite), `${at} toggle ${toggle}`).toBe(true);
        }
      }
    }
  }, 60_000); // 120 pairs × 2 O(n²) analyses take about 9 s locally, longer than Vitest's 5 s default
});

describe("5. Verdict: every catalog variable in every region, both toggle states", () => {
  beforeEach(() => start());

  // Architecture section 7.2, word for word. The rate is checked separately, as a number.
  const CAVEAT = "Monthly values are often related to their neighbours, which can make a trend look more certain than it is.";
  const HUNCH = {
    mixed: "Your hunch is neither confirmed nor ruled out.",
    right: "Your hunch was right.",
    wrong: "The evidence does not support your hunch.",
  };
  const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const RATE = String.raw`(\d+(?:\.\d+)?)`;
  function template(kind: Verdict["kind"], v: Variable, place: string): RegExp {
    const Name = esc(v.name.charAt(0).toUpperCase() + v.name.slice(1));
    const where = `${esc(v.name)} in ${esc(place)}`;
    const rest = `${esc(v.unit)} per decade`;
    const lead = `^${Name} in ${esc(place)}`;
    return new RegExp({
      rise: `${lead} has risen by about ${RATE} ${rest}, and the evidence is strong\\.$`,
      fall: `${lead} has fallen by about ${RATE} ${rest}, and the evidence is strong\\.$`,
      mixed: `${lead} may be changing, by about ${RATE} ${rest}, but our two checks disagree\\. Treat this as uncertain\\.$`,
      none: `^We found no significant long-term trend in ${where}\\. That is a real result: it has stayed within its normal ups and downs\\.$`,
    }[kind]);
  }

  test("each verdict has the section 7.2 wording, its rate at 2 significant figures, the caveat and a hunch line", async () => {
    const [catalog, regions] = await loadAll();
    for (const v of catalog) {
      for (const r of regions) {
        const place = placeName({ kind: "region", id: r.id }, regions);
        const s = await data.getSeries(v, { kind: "region", id: r.id });
        for (const toggle of [true, false]) {
          const at = `${v.id}/${r.id} toggle ${toggle}`;
          const t = analyze(s, toggle)!;
          const verdict = getVerdict(t, v, place);
          expect(["rise", "fall", "mixed", "none"], at).toContain(verdict.kind);
          const m = verdict.text.match(template(verdict.kind, v, place));
          expect(m, `${at}: "${verdict.text}"`).not.toBeNull();
          if (verdict.kind !== "none") {
            expect(Number(m![1]), at).toBe(Number(Math.abs(t.slopePerDecade).toPrecision(2)));
          }
          expect(verdict.text, at).not.toMatch(/\de[+-]?\d/);
          expect(verdict.caveat, at).toBe(CAVEAT);
          for (const hunch of ["rise", "fall", "none"] as Hunch[]) {
            const want = verdict.kind === "mixed" ? HUNCH.mixed : hunch === verdict.kind ? HUNCH.right : HUNCH.wrong;
            expect(hunchLine(hunch, verdict), `${at} hunch ${hunch}`).toBe(want);
          }
        }
      }
    }
  }, 60_000); // reruns analyze on every pair, like stage 4

  test("oppositeDirections is true only for rise beside fall, in either order", () => {
    const v = (kind: Verdict["kind"]): Verdict => ({ kind, text: "", caveat: "" });
    const kinds = ["rise", "fall", "mixed", "none"] as const;
    for (const a of kinds) for (const b of kinds) {
      expect(oppositeDirections(v(a), v(b)), `${a} beside ${b}`).toBe((a === "rise" && b === "fall") || (a === "fall" && b === "rise"));
    }
  });
});

describe("6. Golden demo cases: the numbers Dev B cross-checked in Python (issue 17)", () => {
  beforeEach(() => start());

  // Rates and interval ends as issue 17 reports them, at 2 significant figures;
  // p at 3 decimals, or "below 0.001" as null; and the verdict kind.
  const golden = {
    "arctic-precipitation": {
      false: { rate: -0.033, ci: [-0.044, 0.027], p: 0.033, kind: "mixed" },
      true: { rate: -0.026, ci: [-0.03, 0.006], p: null, kind: "mixed" },
    },
    "tibet-temperature": {
      false: { rate: 0.27, ci: [-0.27, 0.78], p: 0.175, kind: "none" },
      true: { rate: 0.23, ci: [0.17, 0.28], p: null, kind: "rise" },
    },
  } as const;
  const sig2 = (x: number) => Number(x.toPrecision(2));

  test("each demo case gives the rate, interval, p-value and verdict the demo team was given", async () => {
    const [catalog, regions] = await loadAll();
    expect(data.demoCases.map((c) => c.id).sort()).toEqual(Object.keys(golden).sort());
    for (const c of data.demoCases) {
      const v = catalog.find((x) => x.id === c.variableId)!;
      const s = await data.getSeries(v, c.place);
      for (const toggle of [false, true] as const) {
        const want = golden[c.id as keyof typeof golden][`${toggle}`];
        const t = analyze(s, toggle)!;
        const at = `${c.id} toggle ${toggle}`;
        expect(sig2(t.slopePerDecade), at).toBe(want.rate);
        expect(t.ci95.map(sig2), at).toEqual(want.ci);
        if (want.p === null) expect(t.mkP, at).toBeLessThan(0.001);
        else expect(Number(t.mkP.toFixed(3)), at).toBe(want.p);
        expect(getVerdict(t, v, placeName(c.place, regions)).kind, at).toBe(want.kind);
      }
    }
  });
});

describe("7. Failure paths, as the screens will see them (section 8)", () => {
  const t2m: Variable = {
    id: "T2M", name: "air temperature", definition: "Test only.", unit: "°C",
    source: "Test source", powerParameter: "T2M", startYear: 2020, tags: ["air"],
  };
  const point = { kind: "point" as const, lat: 14, lon: 0 };

  test("a live point with a short record loads, but gives no verdict", async () => {
    await start("sample");
    const s = await data.getSeries(t2m, point);
    expect(countValid(s)).toBe(36);
    expect(analyze(s, true)).toBeNull();
    expect(analyze(s, false)).toBeNull();
  });

  test("HTTP 429 from POWER is a rate-limit error with the section 8 message", async () => {
    await start(429);
    await expect(data.getSeries(t2m, point)).rejects.toMatchObject({ kind: "rate-limit", message: MESSAGES["rate-limit"] });
  });

  test("an unreachable POWER is a network error with the section 8 message", async () => {
    await start("down");
    await expect(data.getSeries(t2m, point)).rejects.toMatchObject({ kind: "network", message: MESSAGES.network });
  });

  test("a regions-only variable at a point is unavailable, with no request made", async () => {
    await start("sample");
    await expect(data.getSeries({ ...t2m, powerParameter: null }, point))
      .rejects.toMatchObject({ kind: "unavailable", message: MESSAGES.unavailable });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("a region with no series file is unavailable", async () => {
    await start("down");
    await expect(data.getSeries(t2m, { kind: "region", id: "nowhere" }))
      .rejects.toMatchObject({ kind: "unavailable", message: MESSAGES.unavailable });
  });
});

describe("8. Architecture section 2: logic folders stay pure and import only the contract", () => {
  const sources = import.meta.glob<string>("../{clues,place,stats,verdict}/index.ts", {
    query: "?raw", import: "default", eager: true,
  });
  // Comments may mention fetch or Date; only code counts.
  const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  test("the logic modules exist", () => {
    const found = Object.keys(sources).map((p) => p.split("/")[1]);
    expect(found).toEqual(expect.arrayContaining(["clues", "place", "stats"]));
  });

  test.each(Object.entries(sources))("%s imports only ../types and uses no fetch, DOM, clock or randomness", (_, src) => {
    const imports = [...code(src).matchAll(/^\s*(?:import|export)\b[^;]*?\bfrom\s+["']([^"']+)["']/gm)].map((m) => m[1]);
    expect(imports.filter((i) => i !== "../types" && i !== "./questions")).toEqual([]);
    for (const banned of [/\bfetch\s*\(/, /\bdocument\b/, /\bwindow\b/, /Date\.now/, /new Date\(/, /Math\.random/]) {
      expect(code(src)).not.toMatch(banned);
    }
  });
});
