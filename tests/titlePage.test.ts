import { describe, expect, it } from "vitest";
import { forecast } from "../src/app/onboarding/TitlePage";
import { startDetails } from "../src/app/onboarding/books";

const today = new Date("2026-03-02T15:00");
const book = { ...startDetails(500), totalGoal: 60_000 };

describe("forecast", () => {
  it("tells the words a day a deadline asks for, rounded up to tens", () => {
    const line = forecast({ ...book, deadline: "2026-04-30" }, today);

    expect(line).toMatch(/cirka 1\s020 ord om dagen/);
  });

  it("tells the month the daily goal finishes the draft in", () => {
    const line = forecast({ ...book, dailyGoal: 1000 }, today);

    expect(line).toContain("maj 2026");
  });

  it("asks for a later deadline when the day has been", () => {
    expect(forecast({ ...book, deadline: "2026-03-02" }, today)).toContain("senare deadline");
  });

  it("says nothing without the book's length", () => {
    expect(forecast({ ...book, totalGoal: null, deadline: "2026-05-01" }, today)).toBe("");
  });
});
