import { beforeEach, expect, test, vi } from "vitest";
import catalogJson from "../../public/data/catalog.json";
import regionsJson from "../../public/data/regions.json";
import type { Region, Series, Variable } from "../types";

const catalog = catalogJson as Variable[];
const regions = regionsJson as unknown as Region[];
// Series files read from disk, keyed by "{variableId}/{regionId}".
const seriesFiles = Object.fromEntries(
  Object.entries(import.meta.glob<Series>("../../public/data/series/*/*.json", { eager: true, import: "default" }))
    .map(([path, s]) => [path.split("/series/")[1].replace(".json", ""), s]),
);

let data: typeof import("./index");
let fetchMock: ReturnType<typeof vi.fn>;

// POWER is unreachable in every test here: only our own static files answer.
beforeEach(async () => {
  fetchMock = vi.fn(async (url: string) => {
    if (url.includes("power.larc.nasa.gov")) throw new TypeError("Failed to fetch");
    const key = url.split("/data/series/")[1]?.replace(".json", "");
    return key && seriesFiles[key]
      ? new Response(JSON.stringify(seriesFiles[key]))
      : new Response("not found", { status: 404 });
  });
  vi.stubGlobal("fetch", fetchMock);
  vi.resetModules();
  data = await import("./index");
});

test("demoCases has exactly 2 entries naming existing variables and places", () => {
  expect(data.demoCases).toHaveLength(2);
  expect(new Set(data.demoCases.map((c) => c.id)).size).toBe(2);
  for (const c of data.demoCases) {
    expect(catalog.map((v) => v.id)).toContain(c.variableId);
    expect(c.place.kind).toBe("region");
    if (c.place.kind === "region") expect(regions.map((r) => r.id)).toContain(c.place.id);
    expect(c.title).toMatch(/\?$/);
  }
});

test("the demo cases are the two chosen in Task B6 (issue 17)", () => {
  expect(data.demoCases.map((c) => [c.variableId, c.place])).toEqual([
    ["PRECTOTCORR", { kind: "region", id: "arctic-canada" }],
    ["T2M", { kind: "region", id: "tibetan-plateau" }],
  ]);
});

test("every demo case loads its series with POWER unreachable", async () => {
  for (const c of data.demoCases) {
    const variable = catalog.find((v) => v.id === c.variableId)!;
    const s = await data.getSeries(variable, c.place);
    expect(s.variableId).toBe(c.variableId);
    expect(s.values.filter((v) => v !== null).length).toBeGreaterThanOrEqual(120);
  }
  expect(fetchMock.mock.calls.some(([url]) => String(url).includes("power.larc.nasa.gov"))).toBe(false);
});

test("a non-demo point request still throws when POWER fails", async () => {
  const t2m = catalog.find((v) => v.id === "T2M")!;
  await expect(data.getSeries(t2m, { kind: "point", lat: 10, lon: 106 }))
    .rejects.toMatchObject({ kind: "network" });
});
