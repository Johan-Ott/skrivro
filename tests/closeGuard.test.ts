import { describe, expect, it, vi } from "vitest";
import { createCloseGuard } from "../src/app/closeGuard";

function fakeWindow() {
  let isSafeToClose: () => Promise<boolean> = () => Promise.resolve(true);
  const stop = vi.fn();
  const guardClose = vi.fn((isSafe: () => Promise<boolean>) => {
    isSafeToClose = isSafe;
    return stop;
  });
  return { guardClose, stop, close: () => isSafeToClose() };
}

const slowFlush = (log: string[], name: string) => async () => {
  await new Promise((resolve) => setTimeout(resolve, 10));
  log.push(name);
  return true;
};

describe("createCloseGuard", () => {
  it("makes one listener for all flushes, and the window waits for every one of them", async () => {
    const window = fakeWindow();
    const register = createCloseGuard(window.guardClose);
    const log: string[] = [];
    register(slowFlush(log, "scene"));
    register(slowFlush(log, "notes"));

    const isSafe = await window.close();

    expect(window.guardClose).toHaveBeenCalledTimes(1);
    expect(log.sort()).toEqual(["notes", "scene"]);
    expect(isSafe).toBe(true);
  });

  it("is not safe to close when one flush could not save", async () => {
    const window = fakeWindow();
    const register = createCloseGuard(window.guardClose);
    register(() => Promise.resolve(true));
    register(() => Promise.resolve(false));

    expect(await window.close()).toBe(false);
  });

  it("is not safe to close when a flush throws, rather than letting the window close unasked", async () => {
    const window = fakeWindow();
    const register = createCloseGuard(window.guardClose);
    register(() => Promise.resolve(true));
    register(() => Promise.reject(new Error("disk full")));

    expect(await window.close()).toBe(false);
  });

  it("stops listening when the last flush is taken away", () => {
    const window = fakeWindow();
    const register = createCloseGuard(window.guardClose);
    const first = register(() => Promise.resolve(true));
    const second = register(() => Promise.resolve(true));

    first();
    expect(window.stop).not.toHaveBeenCalled();
    second();

    expect(window.stop).toHaveBeenCalledTimes(1);
  });
});

describe("createCloseGuard's flushAll", () => {
  it("flushes everything that is registered, for a moment other than the window closing", async () => {
    const register = createCloseGuard(fakeWindow().guardClose);
    const log: string[] = [];
    register(slowFlush(log, "scene"));
    register(slowFlush(log, "lapp"));

    const isSafe = await register.flushAll();

    expect(log.sort()).toEqual(["lapp", "scene"]);
    expect(isSafe).toBe(true);
  });
});
