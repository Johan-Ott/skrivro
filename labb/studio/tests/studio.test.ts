import { describe, expect, it } from "vitest";
import { NO_JOURNEY } from "../src/project/journey";
import {
  daysToRelease,
  excerptBlocks,
  weekFigures,
  weekNumber,
  yearFigures,
} from "../src/project/studio";

describe("studio figures", () => {
  it("numbers weeks as ISO does", () => {
    expect(weekNumber("2026-10-08")).toBe(41);
    expect(weekNumber("2027-01-01")).toBe(53);
  });

  it("sums the week, counts its writing days and finds its best day", () => {
    const week = weekFigures({ "2026-10-06": 1340, "2026-10-07": 980 }, "2026-10-08");

    expect([week.week, week.words, week.writingDays, week.best.day]).toEqual([
      41,
      2320,
      2,
      "2026-10-06",
    ]);
  });

  it("finds the year's words, writing days and best month", () => {
    const journey = {
      ...NO_JOURNEY,
      words: { "2025-12-30": 500, "2026-03-02": 400, "2026-10-01": 900, "2026-10-02": 300 },
    };

    expect(yearFigures(journey, "2026-10-08")).toMatchObject({
      words: 1600,
      writingDays: 3,
      bestMonth: 10,
    });
  });

  it("counts down to the release, and keeps an excerpt near its words", () => {
    expect(daysToRelease("2026-11-07", "2026-10-08")).toBe(30);
    expect(daysToRelease("snart", "2026-10-08")).toBeNull();
    expect(excerptBlocks([300, 250, 200, 100], (words) => words, 600)).toEqual([300, 250, 200]);
  });
});
