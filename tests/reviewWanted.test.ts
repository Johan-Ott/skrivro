import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { askForReviewOnNextScreen, takeAskForReview } from "../src/app/review/reviewWanted";

describe("the request for Granska on the next screen", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("is kept for the screen that comes, and only for that one", () => {
    askForReviewOnNextScreen();

    expect(takeAskForReview()).toBe(true);
    expect(takeAskForReview()).toBe(false);
  });

  it("is gone when no screen came within a moment, so a later screen does not open Granska", () => {
    askForReviewOnNextScreen();
    vi.advanceTimersByTime(4000);

    expect(takeAskForReview()).toBe(false);
  });

  it("is not there when nothing asked", () => {
    expect(takeAskForReview()).toBe(false);
  });
});
