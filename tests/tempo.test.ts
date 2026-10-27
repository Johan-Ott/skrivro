import { describe, expect, it } from "vitest";
import type { ContentsRow } from "../src/project/contents";
import { chapterTempo } from "../src/project/tempo";

const row = (number: number, sceneIds: string[], words = 0): ContentsRow => ({
  id: `k${number}`,
  number,
  title: `Kapitel ${number}`,
  summary: "",
  when: "",
  pov: "",
  words,
  status: "utkast",
  sceneIds,
});

describe("chapterTempo", () => {
  it("takes the length from the row, as Innehåll shows it, and measures talk and sentences", () => {
    const texts = { first: "Hon gick hem.\n– Hej, sa hon.\n– Hej." };

    expect(chapterTempo([row(1, ["first"], 99)], texts)[0]).toMatchObject({
      words: 99,
      dialogue: 4 / 7,
      sentence: 7 / 3,
    });
  });

  it("calls a chapter slow that is long, with little talk and long sentences", () => {
    const quick = "– Ja.\n– Nej.\nHon gick.";
    const slow = `${"Hon gick länge genom den snöiga skogen utan att se sig om ".repeat(8)}.`;
    const texts = { one: quick, two: quick, three: slow };
    const tempo = chapterTempo(
      [row(1, ["one"], 6), row(2, ["two"], 6), row(3, ["three"], 80)],
      texts,
    );

    expect(tempo.map((chapter) => chapter.isSlow)).toEqual([false, false, true]);
  });
});
