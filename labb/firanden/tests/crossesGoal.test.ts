import { describe, expect, it } from "vitest";
import { crossesGoal } from "../src/app/journey/useMilestone";

describe("crossesGoal", () => {
  it("is true only for the change that reaches the book's goal", () => {
    expect(crossesGoal(79_900, 80_100, 80_000)).toBe(true);
    expect(crossesGoal(80_100, 80_300, 80_000)).toBe(false);
    expect(crossesGoal(1000, 2000, null)).toBe(false);
  });
});
