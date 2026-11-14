// Test helper: a fetch that serves public/data from disk and fakes POWER. Never imported by the app.
import { vi } from "vitest";
import powerSample from "./power-sample.json";

// Every JSON file under public/data, keyed by its path after "data/", e.g. "series/T2M/sahel.json".
const files: Record<string, unknown> = Object.fromEntries(
  Object.entries(import.meta.glob("../../public/data/**/*.json", { eager: true, import: "default" }))
    .map(([path, body]) => [path.split("/public/data/")[1], body]),
);

/** How POWER answers: "down" rejects like a network failure, "sample" serves power-sample.json, a number is an HTTP status. */
export type Power = "down" | "sample" | number;

/** Stubs the global fetch and returns the mock. Our own static files always answer from disk. */
export function stubFetch(power: Power = "down") {
  const mock = vi.fn(async (url: string) => {
    if (url.includes("power.larc.nasa.gov")) {
      if (power === "down") throw new TypeError("Failed to fetch");
      if (power === "sample") return new Response(JSON.stringify(powerSample));
      return new Response("{}", { status: power });
    }
    const body = files[url.split("/data/")[1] ?? ""];
    return body === undefined ? new Response("not found", { status: 404 }) : new Response(JSON.stringify(body));
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}
