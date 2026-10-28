import { describe, expect, it } from "vitest";
import { badgeForHour, reachedBadges } from "../src/project/badges";
import { journeySummary } from "../src/project/inkwell";
import { mergedJourney, NO_JOURNEY, withBadge, type Journey } from "../src/project/journey";

const written = (words: Record<string, number>): Journey => ({ ...NO_JOURNEY, words });
const reached = (journey: Journey, today: string) =>
  reachedBadges(journeySummary(journey, today), journey.badges).map((badge) => badge.id);

describe("badges", () => {
  it("are reached by the journey's words, days in a row and best day", () => {
    const journey = written({ "2026-10-01": 300, "2026-10-02": 1200, "2026-10-03": 50 });
    expect(reached(journey, "2026-10-03")).toEqual([
      "forsta-orden",
      "en-sida",
      "tre-dagar",
      "tusen-pa-en-dag",
    ]);
  });

  it("are not reached twice, and keep the earliest day across devices", () => {
    const here = withBadge(written({ "2026-10-02": 10 }), "forsta-orden", "2026-10-02");
    expect(reached(here, "2026-10-02")).toEqual([]);
    const there = withBadge(NO_JOURNEY, "forsta-orden", "2026-09-30");
    expect(mergedJourney([here, there]).badges).toEqual({ "forsta-orden": "2026-09-30" });
  });

  it("are given for writing at night or at dawn", () => {
    expect(badgeForHour(2)).toBe("nattuggla");
    expect(badgeForHour(6)).toBe("morgonpigg");
    expect(badgeForHour(14)).toBeNull();
  });
});
