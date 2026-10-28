import { afterEach, describe, expect, it, vi } from "vitest";
import { askOnce } from "../src/askOnce";

afterEach(() => vi.useRealTimers());

describe("a request asked once", () => {
  it("is taken once, and not again", () => {
    const request = askOnce();
    request.ask();

    expect([request.take(), request.take()]).toEqual([true, false]);
  });

  it("is not there when nobody asked", () => {
    expect(askOnce().take()).toBe(false);
  });

  it("is forgotten when it waited longer than it is kept", () => {
    vi.useFakeTimers();
    const request = askOnce(3000);
    request.ask();
    vi.advanceTimersByTime(3001);

    expect(request.take()).toBe(false);
  });
});
