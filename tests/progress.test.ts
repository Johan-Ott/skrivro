import { describe, expect, it } from "vitest";
import {
  averagePerDay,
  chapterShare,
  finishDay,
  daysBetween,
  deadlinePlan,
  projectGoals,
  shortDay,
  weekOf,
  lastWeek,
} from "../src/project/progress";

describe("deadlinePlan", () => {
  it("spreads the words left over the days left: 31 790 in 105 days is 303 a day", () => {
    const plan = deadlinePlan(
      { words: 48_210, goal: 80_000, deadline: "2027-01-15" },
      "2026-10-02",
      940,
    );

    expect(plan).toEqual({ daysLeft: 105, wordsPerDay: 303, isOnTrack: true });
  });

  it("is behind when the average is lower than what is needed", () => {
    const plan = deadlinePlan(
      { words: 10_000, goal: 80_000, deadline: "2026-11-01" },
      "2026-10-02",
      500,
    );

    expect(plan).toMatchObject({ daysLeft: 30, wordsPerDay: 2334, isOnTrack: false });
  });

  it("needs nothing more once the goal is reached, and nothing without a deadline or goal", () => {
    const plans = [
      deadlinePlan({ words: 90_000, goal: 80_000, deadline: "2027-01-15" }, "2026-10-02", 0),
      deadlinePlan({ words: 1000, goal: 80_000, deadline: null }, "2026-10-02", 0),
      deadlinePlan({ words: 1000, goal: null, deadline: "2027-01-15" }, "2026-10-02", 0),
    ];

    expect(plans).toEqual([{ daysLeft: 105, wordsPerDay: 0, isOnTrack: true }, null, null]);
  });

  it("counts the deadline day itself as gone once it has passed", () => {
    const plan = deadlinePlan({ words: 1000, goal: 2000, deadline: "2026-10-01" }, "2026-10-02", 0);

    expect(plan).toEqual({ daysLeft: 0, wordsPerDay: 1000, isOnTrack: false });
  });
});

describe("days and streaks", () => {
  it("counts whole days between two dates, across a summer time change", () => {
    const days = [daysBetween("2026-10-02", "2027-01-15"), daysBetween("2026-03-28", "2026-03-30")];

    expect(days).toEqual([105, 2]);
  });

  it("averages the last 30 days, days without words included", () => {
    const stats = { "2026-10-02": 600, "2026-09-20": 300, "2026-08-01": 9000 };

    const average = averagePerDay(stats, "2026-10-02");

    expect(average).toBe(30);
  });

  it("averages a book begun today over today only", () => {
    expect(averagePerDay({ "2026-10-02": 940 }, "2026-10-02")).toBe(940);
  });
});

describe("weekOf", () => {
  it("gives the current week from Monday to Sunday with each day's words", () => {
    const week = weekOf({ "2026-10-06": 610, "2026-10-08": 980 }, "2026-10-08");

    expect(week.map((day) => [day.day, day.words])).toEqual([
      ["2026-10-05", 0],
      ["2026-10-06", 610],
      ["2026-10-07", 0],
      ["2026-10-08", 980],
      ["2026-10-09", 0],
      ["2026-10-10", 0],
      ["2026-10-11", 0],
    ]);
  });
});

describe("lastWeek", () => {
  it("adds up last week, counts its writing days, and knows when it was the best week", () => {
    const stats = { "2026-09-22": 900, "2026-09-29": 1000, "2026-10-01": 400, "2026-10-06": 50 };

    expect(lastWeek(stats, "2026-10-08")).toEqual({ words: 1400, days: 2, isBest: true });
  });
});

describe("projectGoals", () => {
  it("reads the goals from project.json, ignoring what does not make sense", () => {
    const goals = [
      projectGoals({ dailyGoal: 500, totalGoal: 80_000, deadline: "2027-01-15" }),
      projectGoals({ dailyGoal: "mycket", totalGoal: -1, deadline: "snart" }),
    ];

    expect(goals).toEqual([
      { dailyGoal: 500, totalGoal: 80_000, deadline: "2027-01-15" },
      { dailyGoal: null, totalGoal: null, deadline: null },
    ]);
  });
});

describe("shortDay", () => {
  it("writes a date the Swedish way, without a leading zero", () => {
    const days = [shortDay("2027-01-15"), shortDay("2026-10-02")];

    expect(days).toEqual(["15 jan", "2 okt"]);
  });
});

describe("finishDay", () => {
  it("is when the goal is reached at the writer's pace", () => {
    expect(finishDay(1000, 3000, 500, "2026-10-01")).toBe("2026-10-05");
  });

  it("is unknown without a goal or with no pace yet", () => {
    expect(finishDay(1000, null, 500, "2026-10-01")).toBeNull();
    expect(finishDay(1000, 3000, 0, "2026-10-01")).toBeNull();
  });
});

describe("chapterShare", () => {
  const chapter = (id: string) => ({ id, kind: "chapter" as const, title: id, children: [] });

  it("splits the book's goal over its chapters, to the nearest hundred", () => {
    const tree = [chapter("A"), chapter("B"), chapter("C")];

    expect(chapterShare(tree, { totalGoal: 90_000 })).toBe(30_000);
    expect(chapterShare(tree.slice(0, 2), { totalGoal: 15_050 })).toBe(7_500);
    expect(chapterShare(tree, {})).toBeNull();
    expect(chapterShare([], { totalGoal: 90_000 })).toBeNull();
  });
});
