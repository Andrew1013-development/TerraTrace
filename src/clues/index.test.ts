import { expect, test } from "vitest";
import { sampleCatalog } from "../fixtures";
import type { Question } from "../types";
import { liveOptions, narrow, nextQuestion, questions } from "./index";

// sampleCatalog tags: T2M [air, temperature], PRECTOTCORR [air, water, rain],
// RH2M [air, water, humidity], TS [land, temperature].
const ids = (vs: { id: string }[]) => vs.map((v) => v.id);
const q = (id: string, ...options: string[][]): Question => ({
  id, text: id, options: options.map((tags) => ({ label: tags.join("/"), tags })),
});

const sphere = q("sphere", ["air"], ["water"], ["land"], ["life"]); // worst case 3 (air)
const feel = q("feel", ["temperature"], ["water"]);               // worst case 2
const fall = q("fall", ["rain"], ["temperature", "humidity"]);     // worst case 3

test("narrow keeps only variables sharing a tag with the option", () => {
  const before = [...sampleCatalog];
  expect(ids(narrow(sampleCatalog, { tags: ["water"] }))).toEqual(["PRECTOTCORR", "RH2M"]);
  // Any shared tag is enough, not all of them.
  expect(ids(narrow(sampleCatalog, { tags: ["land", "rain"] }))).toEqual(["PRECTOTCORR", "TS"]);
  expect(narrow(sampleCatalog, { tags: ["life"] })).toEqual([]);
  expect(sampleCatalog).toEqual(before);
});

test("liveOptions hides options that leave no suspects", () => {
  expect(liveOptions(sphere, sampleCatalog).map((o) => o.label)).toEqual(["air", "water", "land"]);
  const ts = sampleCatalog.filter((v) => v.id === "TS");
  expect(liveOptions(sphere, ts).map((o) => o.label)).toEqual(["land"]);
});

test("nextQuestion returns null with one suspect", () => {
  expect(nextQuestion(sampleCatalog.slice(0, 1), [], [sphere, feel, fall])).toBeNull();
  expect(nextQuestion([], [], [sphere, feel, fall])).toBeNull();
});

test("nextQuestion skips questions that cannot split, and returns null when none can", () => {
  const keepsAll = q("keeps-all", ["air", "land"], ["temperature", "water"]); // every option keeps all 4
  const oneLive = q("one-live", ["air", "land"], ["life"]);                   // only 1 live option
  expect(nextQuestion(sampleCatalog, [], [keepsAll, oneLive])).toBeNull();
  expect(nextQuestion(sampleCatalog, [], [keepsAll, oneLive, fall])).toBe(fall);
});

test("nextQuestion picks the smallest worst-case group on a 4-variable fixture", () => {
  expect(nextQuestion(sampleCatalog, [], [sphere, feel, fall])).toBe(feel);
});

test("nextQuestion never repeats an asked question", () => {
  expect(nextQuestion(sampleCatalog, ["feel"], [sphere, feel, fall])).toBe(sphere);
  expect(nextQuestion(sampleCatalog, ["sphere", "feel", "fall"], [sphere, feel, fall])).toBeNull();
});

test("nextQuestion breaks ties by question order", () => {
  expect(nextQuestion(sampleCatalog, [], [sphere, fall])).toBe(sphere);
  expect(nextQuestion(sampleCatalog, [], [fall, sphere])).toBe(fall);
});

test("every question id is unique and every option has at least one tag", () => {
  expect(questions.length).toBeGreaterThanOrEqual(4);
  expect(questions.length).toBeLessThanOrEqual(6);
  expect(new Set(questions.map((x) => x.id)).size).toBe(questions.length);
  for (const question of questions) {
    expect(question.options.length).toBeGreaterThanOrEqual(2);
    for (const o of question.options) {
      expect(o.tags.length).toBeGreaterThan(0);
      expect(o.tags.every((t) => t === t.toLowerCase())).toBe(true);
    }
  }
  // Every variable needs a tag from the first question, so it must use these words.
  expect(questions[0].options.flatMap((o) => o.tags).sort()).toEqual(["air", "land", "life", "water"]);
});
