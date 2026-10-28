import { describe, expect, it } from "vitest";
import { wholeNumber } from "../src/app/progress/GoalsDialog";

describe("a goal's number", () => {
  it("is a whole number of words, with spaces between the thousands", () => {
    expect(wholeNumber("80000")).toBe(80000);
    expect(wholeNumber(" 80 000 ")).toBe(80000);
  });

  it("is a slip when it has a decimal, a sign or is zero, not a rounded goal", () => {
    for (const text of ["2,5", "2.5", "-5", "+5", "0", "1e3", "tio"]) {
      expect(wholeNumber(text), text).toBeUndefined();
    }
  });
});
