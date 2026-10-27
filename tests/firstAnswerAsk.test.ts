import { describe, expect, it } from "vitest";
import { askForFirstAnswer, takeAskForFirstAnswer } from "../src/editor/firstAnswerAsk";

describe("the request for the caret in a new note's first answer", () => {
  it("is taken once, by the next text loaded, so a note opened again keeps its place", () => {
    askForFirstAnswer();

    expect(takeAskForFirstAnswer()).toBe(true);
    expect(takeAskForFirstAnswer()).toBe(false);
  });

  it("is not there when no note was made", () => {
    expect(takeAskForFirstAnswer()).toBe(false);
  });
});
