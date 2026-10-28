import { describe, expect, it } from "vitest";
import { celebrationsBetween, inkTotal, inkwell, journeySummary } from "../src/project/inkwell";
import {
  NO_JOURNEY,
  mergedJourney,
  stepOf,
  levels,
  withHoliday,
  withInk,
  withWords,
  type Journey,
} from "../src/project/journey";

const written = (words: Record<string, number>): Journey => ({ ...NO_JOURNEY, words });

describe("inkwell", () => {
  it("keeps going over one day of rest, and breaks on the second day without words", () => {
    const rested = written({ "2026-10-01": 100, "2026-10-02": 100, "2026-10-04": 100 });
    const broken = written({ "2026-10-01": 100, "2026-10-04": 100, "2026-10-05": 100 });

    expect(inkwell(rested, "2026-10-04")).toEqual({ days: 3, record: 3 });
    expect(inkwell(broken, "2026-10-05")).toEqual({ days: 2, record: 2 });
  });

  it("is not broken by today, which is not over yet, nor by a holiday", () => {
    const journey = written({ "2026-10-01": 100, "2026-10-02": 100 });
    const away = withHoliday(written({ "2026-10-01": 100, "2026-10-09": 100 }), true, "2026-10-02");

    expect(inkwell(journey, "2026-10-04").days).toBe(2);
    expect(inkwell(away, "2026-10-09").days).toBe(2);
  });
});

describe("inkTotal", () => {
  it("gives five ink per hundred words and the ink of the day's events", () => {
    const journey = withInk(written({ "2026-10-01": 1240 }), "2026-10-01", 50);

    expect(inkTotal(journey, "2026-10-01")).toBe(60 + 50);
  });

  it("takes ten for each missed day after the first day of rest, never below zero", () => {
    const journey = written({ "2026-10-01": 1000, "2026-10-05": 100 });

    expect(inkTotal(journey, "2026-10-05")).toBe(50 - 2 * 10 + 5);
    expect(inkTotal(written({ "2026-10-01": 100 }), "2026-10-30")).toBe(0);
  });
});

describe("the journey's words", () => {
  it("counts only words added, adds up the devices, and finds the level", () => {
    const one = withWords(withWords(NO_JOURNEY, "2026-10-01", 900), "2026-10-01", -400);
    const both = mergedJourney([one, written({ "2026-10-01": 200 })]);

    expect(both.words).toEqual({ "2026-10-01": 1100 });
    expect(stepOf(levels(), 1100)).toMatchObject({
      name: "Anteckningsbok",
      next: ["Novell", 10_000],
    });
  });
});

describe("celebrations", () => {
  it("celebrates a new level and a week in a row once, as they are crossed", () => {
    const days = Object.fromEntries(
      ["01", "02", "03", "04", "05", "06"].map((date) => [`2026-10-${date}`, 160]),
    );
    const before = journeySummary(written(days), "2026-10-07");
    const after = journeySummary(written({ ...days, "2026-10-07": 100 }), "2026-10-07");

    expect(celebrationsBetween(before, after).map((each) => each.kind)).toEqual([
      "level",
      "streak",
    ]);
    expect(celebrationsBetween(after, after)).toEqual([]);
  });
});
