import { beforeEach, expect, test, vi } from "vitest";
import { sampleCatalog, sampleLeads, sampleRegions } from "../fixtures";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

let fetchMock: ReturnType<typeof vi.fn>;
let data: typeof import("./index");

// Fresh module per test, so the in-memory cache starts empty.
beforeEach(async () => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  vi.resetModules();
  data = await import("./index");
});

const loaders = [
  ["loadCatalog", "catalog.json", sampleCatalog],
  ["loadRegions", "regions.json", sampleRegions],
  ["loadLeads", "leads.json", sampleLeads],
] as const;

test.each(loaders)("%s fetches data/%s under BASE_URL and returns the parsed array", async (name, file, body) => {
  fetchMock.mockResolvedValue(json(body));
  await expect(data[name]()).resolves.toEqual(body);
  expect(fetchMock).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}data/${file}`, expect.anything());
});

test.each(loaders)("%s: a failed fetch throws DataError kind network", async (name) => {
  fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
  const err = await data[name]().catch((e) => e);
  expect(err).toBeInstanceOf(data.DataError);
  expect(err.kind).toBe("network");
});

test.each(loaders)("%s: a response that is not OK throws DataError kind unavailable", async (name) => {
  fetchMock.mockResolvedValue(json({}, 404));
  await expect(data[name]()).rejects.toMatchObject({ kind: "unavailable" });
});

test("each file is fetched once, and a failed fetch is retried", async () => {
  fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
  fetchMock.mockResolvedValue(json(sampleCatalog));
  await expect(data.loadCatalog()).rejects.toMatchObject({ kind: "network" });
  const [a, b] = await Promise.all([data.loadCatalog(), data.loadCatalog()]);
  expect(a).toBe(b);
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test("an empty leads.json is valid", async () => {
  fetchMock.mockResolvedValue(json([]));
  await expect(data.loadLeads()).resolves.toEqual([]);
});
