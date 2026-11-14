// Checks the real files in public/data, read from disk at build time, not through fetch.
import { expect, test } from "vitest";
import catalogJson from "../../public/data/catalog.json";
import leadsJson from "../../public/data/leads.json";
import regionsJson from "../../public/data/regions.json";
import { liveOptions, narrow, nextQuestion, questions } from "../clues";
import type { Lead, Region, Variable } from "../types";

const catalog = catalogJson as Variable[];
const regions = regionsJson as unknown as Region[];
const leads = leadsJson as Lead[];
const seriesFiles = Object.keys(import.meta.glob("../../public/data/series/*/*.json"));

// Every final suspect list the clue engine can reach, over every answer path.
function finalLists(suspects: Variable[], asked: string[] = []): Variable[][] {
  const q = nextQuestion(suspects, asked, questions);
  if (!q) return [suspects];
  return liveOptions(q, suspects).flatMap((o) => finalLists(narrow(suspects, o), [...asked, q.id]));
}

test("every variable has every field, a non-empty definition and at least one tag", () => {
  expect(catalog.length).toBeGreaterThanOrEqual(8);
  expect(new Set(catalog.map((v) => v.id)).size).toBe(catalog.length);
  for (const v of catalog) {
    expect(Object.keys(v).sort()).toEqual(
      ["definition", "id", "name", "powerParameter", "source", "startYear", "tags", "unit"],
    );
    expect(v.id).toBe(v.powerParameter);
    expect(v.name).toBe(v.name.toLowerCase());
    expect(v.definition.trim()).not.toBe("");
    expect(v.unit.trim()).not.toBe("");
    expect(v.source.trim()).not.toBe("");
    expect(Number.isInteger(v.startYear)).toBe(true);
    expect(v.tags.length).toBeGreaterThan(0);
  }
});

test("every variable has a tag from the first question", () => {
  const firstTags = questions[0].options.flatMap((o) => o.tags);
  for (const v of catalog) expect(v.tags.some((t) => firstTags.includes(t)), v.id).toBe(true);
});

test("every regions.json bbox has south < north and west < east", () => {
  for (const { id, bbox: [s, w, n, e] } of regions) {
    expect(s < n && w < e, id).toBe(true);
    expect(id).toMatch(/^[a-z]+(-[a-z]+)*$/);
  }
});

test("every catalog and region pair has a series file", () => {
  for (const v of catalog) {
    for (const r of regions) {
      expect(seriesFiles, `${v.id}/${r.id}`).toContain(`../../public/data/series/${v.id}/${r.id}.json`);
    }
  }
});

test("every lead names an existing region and variable and has a sourceUrl", () => {
  for (const l of leads) {
    expect(regions.map((r) => r.id)).toContain(l.regionId);
    expect(catalog.map((v) => v.id)).toContain(l.variableId);
    expect(l.sourceUrl).toMatch(/^https:\/\//);
  }
});

test("every variable can end as the only suspect, or in a final list of at most 3", () => {
  const lists = finalLists(catalog);
  for (const v of catalog) {
    expect(lists.some((l) => l.length <= 3 && l.includes(v)), v.id).toBe(true);
  }
});

test("some answer path leads to PRECTOTCORR", () => {
  expect(finalLists(catalog).some((l) => l.some((v) => v.id === "PRECTOTCORR"))).toBe(true);
});

test("TS is named for land and sea, as its definition says (#23)", () => {
  const ts = catalog.find((v) => v.id === "TS")!;
  expect(ts.definition).toMatch(/land or sea/);
  expect(ts.name).toBe("surface temperature");
});

test("CERES variables start in 2001, so no series mixes SRB and SYN1deg (D4)", () => {
  // Before 2001, POWER fills these from SRB, a different product (checked live in task A6).
  const ceres = catalog.filter((v) => v.source.includes("CERES SYN1deg"));
  expect(ceres.length).toBeGreaterThan(0);
  for (const v of ceres) expect(v.startYear, v.id).toBeGreaterThanOrEqual(2001);
});
