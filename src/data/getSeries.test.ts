import { beforeEach, expect, test, vi } from "vitest";
import type { Variable } from "../types";
import sample from "./power-sample.json";

// Synthetic test variable; unit and source must come from here, not from POWER.
const t2m: Variable = {
  id: "T2M", name: "air temperature", definition: "Test only.",
  unit: "°C", source: "Test source", powerParameter: "T2M",
  startYear: 2020, tags: ["air"],
};
const point = { kind: "point" as const, lat: 14, lon: 0 };

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const withT2M = (values: Record<string, unknown>) => ({
  ...sample,
  properties: { parameter: { T2M: { ...sample.properties.parameter.T2M, ...values } } },
});

let fetchMock: ReturnType<typeof vi.fn>;
let data: typeof import("./index");

// Fresh module per test, so the in-memory cache starts empty.
beforeEach(async () => {
  fetchMock = vi.fn(async () => json(sample));
  vi.stubGlobal("fetch", fetchMock);
  vi.resetModules();
  data = await import("./index");
});

test("parses the captured POWER response into a Series with ascending YYYY-MM dates", async () => {
  const s = await data.getSeries(t2m, point);
  expect(s.dates).toHaveLength(36);
  expect(s.dates[0]).toBe("2020-01");
  expect(s.dates[35]).toBe("2022-12");
  expect(s.dates).toEqual([...s.dates].sort());
  expect(s.values).toHaveLength(36);
  expect(s.values[0]).toBe(sample.properties.parameter.T2M["202001"]);
  expect(s).toMatchObject({ variableId: "T2M", unit: "°C", source: "Test source" });
});

test("keeps only months 01-12", async () => {
  const s = await data.getSeries(t2m, point);
  expect(s.dates.every((d) => /^\d{4}-(0[1-9]|1[0-2])$/.test(d))).toBe(true);
});

test("maps the fill value to null", async () => {
  fetchMock.mockResolvedValue(json(withT2M({ "202003": -999, "202004": null, "202005": "x" })));
  const s = await data.getSeries(t2m, point);
  expect(s.values.slice(2, 5)).toEqual([null, null, null]);
  expect(s.values[1]).toBe(sample.properties.parameter.T2M["202002"]);
});

test("HTTP 429 throws DataError kind rate-limit", async () => {
  fetchMock.mockResolvedValue(json({}, 429));
  await expect(data.getSeries(t2m, point)).rejects.toMatchObject({ kind: "rate-limit" });
});

test("network failure throws DataError kind network", async () => {
  fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
  await expect(data.getSeries(t2m, point)).rejects.toMatchObject({ kind: "network" });
});

test("any other HTTP error, or an unreadable body, throws DataError kind unavailable", async () => {
  fetchMock.mockResolvedValueOnce(json({}, 500));
  const err = await data.getSeries(t2m, point).catch((e) => e);
  expect(err).toBeInstanceOf(data.DataError);
  expect(err.kind).toBe("unavailable");

  fetchMock.mockResolvedValueOnce(new Response("not json", { status: 200 }));
  await expect(data.getSeries(t2m, point)).rejects.toMatchObject({ kind: "unavailable" });

  fetchMock.mockResolvedValueOnce(json({ header: {} }));
  await expect(data.getSeries(t2m, point)).rejects.toMatchObject({ kind: "unavailable" });
});

test("powerParameter null with a point place throws kind unavailable, with no fetch", async () => {
  await expect(data.getSeries({ ...t2m, powerParameter: null }, point))
    .rejects.toMatchObject({ kind: "unavailable" });
  expect(fetchMock).not.toHaveBeenCalled();
});

test("an all-fill response gives a Series with zero valid months", async () => {
  const allFill = Object.fromEntries(Object.keys(sample.properties.parameter.T2M).map((k) => [k, -999]));
  fetchMock.mockResolvedValue(json(withT2M(allFill)));
  const s = await data.getSeries(t2m, point);
  expect(s.dates).toHaveLength(36);
  expect(s.values.every((v) => v === null)).toBe(true);
});

test("the same request twice calls fetch once", async () => {
  const [a, b] = await Promise.all([data.getSeries(t2m, point), data.getSeries(t2m, point)]);
  await data.getSeries(t2m, { kind: "point", lat: 14.001, lon: 0 });
  expect(a).toBe(b);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("a failed request is not cached", async () => {
  fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
  await expect(data.getSeries(t2m, point)).rejects.toMatchObject({ kind: "network" });
  await expect(data.getSeries(t2m, point)).resolves.toMatchObject({ variableId: "T2M" });
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test("a region place fetches data/series/{variableId}/{regionId}.json under BASE_URL", async () => {
  const file = { variableId: "T2M", placeId: "sahel", unit: "°C", source: "File source", dates: ["1981-01"], values: [24.1] };
  fetchMock.mockResolvedValue(json(file));
  const s = await data.getSeries(t2m, { kind: "region", id: "sahel" });
  expect(fetchMock).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}data/series/T2M/sahel.json`, expect.anything());
  expect(s).toEqual(file);

  fetchMock.mockResolvedValue(json({}, 404));
  await expect(data.getSeries(t2m, { kind: "region", id: "nowhere" }))
    .rejects.toMatchObject({ kind: "unavailable" });
});

test("placeId is the region id, or point:{lat},{lon} with 2 decimals", async () => {
  const s = await data.getSeries(t2m, { kind: "point", lat: 10.456, lon: 106.7 });
  expect(s.placeId).toBe("point:10.46,106.70");
  const url = String(fetchMock.mock.calls[0][0]);
  expect(url).toContain("latitude=10.46");
  expect(url).toContain("longitude=106.70");
  expect(url).toContain("parameters=T2M");
  expect(url).toContain("community=AG");

  fetchMock.mockResolvedValue(json({ variableId: "T2M", placeId: "sahel", unit: "°C", source: "s", dates: [], values: [] }));
  expect((await data.getSeries(t2m, { kind: "region", id: "sahel" })).placeId).toBe("sahel");
});

test("every request carries an abort signal, and an aborted request is a network error (D2)", async () => {
  fetchMock.mockRejectedValue(new DOMException("The operation timed out.", "TimeoutError"));
  await expect(data.getSeries(t2m, point)).rejects.toMatchObject({ kind: "network" });
  expect(fetchMock.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
});

test("a region file that is not a series is unavailable, not passed on (D7)", async () => {
  fetchMock.mockResolvedValueOnce(json({}));
  await expect(data.getSeries(t2m, { kind: "region", id: "sahel" })).rejects.toMatchObject({ kind: "unavailable" });
  fetchMock.mockResolvedValueOnce(json({ dates: ["2000-01", "2000-02"], values: [1] }));
  await expect(data.getSeries(t2m, { kind: "region", id: "sahel" })).rejects.toMatchObject({ kind: "unavailable" });
});

test("a coordinate just below zero rounds to 0.00, not -0.00 (D8)", async () => {
  const a = await data.getSeries(t2m, { kind: "point", lat: -0.001, lon: -0.004 });
  const b = await data.getSeries(t2m, { kind: "point", lat: 0, lon: 0 });
  expect(a.placeId).toBe("point:0.00,0.00");
  expect(a).toBe(b);
  expect(String(fetchMock.mock.calls[0][0])).toContain("longitude=0.00&latitude=0.00");
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("requests still work on browsers without AbortSignal.timeout (Safari before 16)", async () => {
  const original = AbortSignal.timeout;
  // @ts-expect-error: simulating an older browser
  AbortSignal.timeout = undefined;
  try {
    await expect(data.getSeries(t2m, point)).resolves.toMatchObject({ variableId: "T2M" });
    expect(fetchMock.mock.calls[0][1]?.signal).toBeUndefined();
  } finally {
    AbortSignal.timeout = original;
  }
});

// Back-end report BR-01: a region file with bad contents must not reach analyze.
const months = (n: number) => Array.from({ length: n }, (_, i) => `${2000 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`);
const regionFile = (dates: unknown[], values: unknown[]) => ({ variableId: "T2M", placeId: "sahel", unit: "°C", source: "s", dates, values });
const sahel = { kind: "region" as const, id: "sahel" };

test.each([
  ["a null date", [null], [1]],
  ["a null date among 120 good months", [null, ...months(120).slice(1)], Array(120).fill(1)],
  ["a date that is not YYYY-MM", ["2000-13"], [1]],
  ["a number as a date", [200001], [1]],
  ["a text value", ["2000-01"], ["1"]],
  ["an object value", ["2000-01"], [{}]],
])("a region file with %s is unavailable, and is not cached (BR-01)", async (_name, dates, values) => {
  fetchMock.mockResolvedValueOnce(json(regionFile(dates, values)));
  const err = await data.getSeries(t2m, sahel).catch((e) => e);
  expect(err).toBeInstanceOf(data.DataError);
  expect(err.kind).toBe("unavailable");
  fetchMock.mockResolvedValueOnce(json(regionFile(months(120), Array(120).fill(1))));
  await expect(data.getSeries(t2m, sahel)).resolves.toMatchObject({ placeId: "sahel" });
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test("a region file with null values and good dates is still accepted (BR-01)", async () => {
  fetchMock.mockResolvedValue(json(regionFile(["2000-01", "2000-02"], [null, 1.5])));
  await expect(data.getSeries(t2m, sahel)).resolves.toMatchObject({ values: [null, 1.5] });
});

// Back-end report BR-03: parameter data with no months is a failure, not a record of zero months.
test.each([
  ["an array", []],
  ["an empty object", {}],
  ["an error object", { error: "unknown parameter" }],
  ["only the annual key", { "202013": 1 }],
])("POWER parameter data that is %s is unavailable, and is not cached (BR-03)", async (_name, body) => {
  fetchMock.mockImplementation(async () => json({ properties: { parameter: { T2M: body } } }));
  const err = await data.getSeries(t2m, point).catch((e) => e);
  expect(err).toBeInstanceOf(data.DataError);
  expect(err.kind).toBe("unavailable");
  expect(err.message).toBe("This data isn't available for that place. Try a prepared region.");
  await expect(data.getSeries(t2m, point)).rejects.toMatchObject({ kind: "unavailable" });
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

// Integration report, defect 1: a region file comes from this site, not from NASA's data service.
test("a region that cannot be reached says so, without naming NASA's data service (integration 1)", async () => {
  fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
  const err = await data.getSeries(t2m, sahel).catch((e) => e);
  expect(err).toBeInstanceOf(data.DataError);
  expect(err.kind).toBe("network");
  expect(err.message).toBe("We couldn't load this region's data. Check your connection, then choose the region again.");
  const pointErr = await data.getSeries(t2m, point).catch((e) => e);
  expect(pointErr.message).toBe("We couldn't reach NASA's data service. Check your connection, or try a prepared region.");
});
