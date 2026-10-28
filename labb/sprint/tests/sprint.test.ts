import { describe, expect, it } from "vitest";
import {
  DEFAULT_PLAN,
  endSprint,
  minutesOf,
  nextPhase,
  phasesOf,
  setPlan,
  startSprint,
} from "../src/app/sprint/sprint";

describe("phasesOf", () => {
  it("puts a short break between passes and a long one after the last", () => {
    expect(phasesOf({ ...DEFAULT_PLAN, rounds: 3 })).toEqual([
      "pass",
      "kort",
      "pass",
      "kort",
      "pass",
      "lang",
    ]);
  });

  it("gives each phase its own length", () => {
    const plan = { session: 25, shortBreak: 5, longBreak: 15, rounds: 2 };

    expect(["pass", "kort", "lang"].map((phase) => minutesOf(plan, phase as "pass"))).toEqual([
      25, 5, 15,
    ]);
  });
});

describe("a sprint", () => {
  it("goes through its phases and ends after the long break", () => {
    setPlan({ session: 25, shortBreak: 5, longBreak: 15, rounds: 2 });
    startSprint();

    const steps = [nextPhase(10), nextPhase(10), nextPhase(30), nextPhase(30)];

    expect(steps).toEqual([true, true, true, false]);
    expect(nextPhase(30)).toBe(false);
    endSprint(0);
  });
});
