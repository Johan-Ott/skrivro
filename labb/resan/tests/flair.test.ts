import { describe, expect, it } from "vitest";
import { flairs, flairWithState, isUnlocked, type Earned } from "../src/project/flair";

const beginner: Earned = { words: 0, ink: 0, badges: {} };

describe("flair", () => {
  it("has frames and titles a new writer can wear at once, and more to earn", () => {
    const state = flairWithState(beginner);

    const open = state.filter((flair) => flair.isUnlocked).map((flair) => flair.kind);
    expect(open).toContain("ram");
    expect(open).toContain("titel");
    expect(state.some((flair) => !flair.isUnlocked)).toBe(true);
  });

  it("unlocks by words written, ink earned or a badge, and says how while locked", () => {
    const novelist = flairs().find((flair) => flair.id === "novellist");
    if (!novelist) throw new Error("no novellist");

    const locked = flairWithState(beginner).find((flair) => flair.id === "novellist");
    const unlocked = isUnlocked(novelist, { ...beginner, words: 10_000 });

    expect(locked?.isUnlocked).toBe(false);
    expect(locked?.hint).toMatch(/10\s000 ord/);
    expect(unlocked).toBe(true);
  });

  it("unlocks a badge's flair the day the badge is reached", () => {
    const owl = flairs().find((flair) => flair.id === "nattuggla");
    if (!owl) throw new Error("no nattuggla");

    const earned = isUnlocked(owl, { ...beginner, badges: { nattuggla: "2026-10-13" } });

    expect(earned).toBe(true);
  });
});
