import { describe, expect, it } from "vitest";
import { listenToSaves } from "../src/app/useWritingStats";

type Listening = Parameters<typeof listenToSaves>[0];

function listen() {
  const savedRef: Listening["savedRef"] = { current: undefined };
  const session = { isNote: (_dir: string, id: string) => id === "NOTE" };
  const editor = { viewRef: { current: null } };
  const counted: string[] = [];
  const state = { savedRef, session, editor } as unknown as Listening;
  listenToSaves(state, (_dir, _before, after) => counted.push(after), false);
  return { savedRef, counted };
}

describe("the day's words", () => {
  it("count what is saved in a scene of the manuscript", () => {
    const { savedRef, counted } = listen();

    savedRef.current?.({ dir: "/bok", id: "SCENE" }, "", "Hon gick hem.");

    expect(counted).toEqual(["Hon gick hem."]);
  });

  it("do not count what is saved in a note", () => {
    const { savedRef, counted } = listen();

    savedRef.current?.({ dir: "/bok", id: "NOTE" }, "", "Hon är rädd för mörker.");

    expect(counted).toEqual([]);
  });
});
