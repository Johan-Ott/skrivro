import { describe, expect, it } from "vitest";
import {
  editDistance,
  nameSuspects,
  repetitions,
  wordsWithSentences,
} from "../src/manuscript/review";

describe("editDistance", () => {
  it("counts the letters to change, add or remove", () => {
    const distances = [
      editDistance("Sjöberg", "Sjöbergh"),
      editDistance("Elin", "Elina"),
      editDistance("Arvid", "Arvd"),
      editDistance("Maja", "Maja"),
    ];

    expect(distances).toEqual([1, 1, 1, 0]);
  });
});

describe("nameSuspects", () => {
  const texts = {
    kap4a: "Sjöbergh kom. Polisen Sjöbergh frågade. Sjöberg svarade.",
    kap4b: "Sjöbergh igen. Elina log. Hon gick hem.",
  };

  it("flags a capitalised word one or two letters from a known name, counted over the scenes", () => {
    const suspects = nameSuspects(texts, ["Sjöberg", "Elin"], []);

    expect(suspects).toEqual([
      { word: "Sjöbergh", suggestion: "Sjöberg", count: 3, sceneIds: ["kap4a", "kap4b"] },
      { word: "Elina", suggestion: "Elin", count: 1, sceneIds: ["kap4b"] },
    ]);
  });

  it("leaves out known names, their genitive, short words and the ones the writer ignored", () => {
    const suspects = nameSuspects(
      { scen: "Sjöbergs bil. Sjöberg kom. Hon och Han. Sjöbergh." },
      ["Sjöberg", "Hans"],
      ["Sjöbergh"],
    );

    expect(suspects).toEqual([]);
  });
});

describe("nameSuspects with aliases", () => {
  it("does not flag a word of a full name because an alias is one letter from it", () => {
    const names = ["Kommissarie Ekblom", "Kommissarien"];

    const suspects = nameSuspects({ scen: "Kommissarie Ekblom kom. Kommissarien log." }, names, []);

    expect(suspects).toEqual([]);
  });

  it("does not flag the genitive of a word of a full name either", () => {
    const names = ["Kommissarie Ekblom", "Kommissarien"];

    const suspects = nameSuspects({ scen: "Kommissaries hatt låg där." }, names, []);

    expect(suspects).toEqual([]);
  });

  it("still flags a misspelling of an alias", () => {
    const suspects = nameSuspects({ scen: "Kommissariem log." }, ["Kommissarien"], []);

    expect(suspects.map((suspect) => suspect.word)).toEqual(["Kommissariem"]);
  });
});

describe("repetitions", () => {
  const text =
    "Det kom i morse. Som om ingenting hade hänt.\nHon satte sig. Utanför fönstret hade isen lagt sig.";

  it("finds a word used twice within the window of sentences, also across paragraphs", () => {
    const found = repetitions(wordsWithSentences(text), 3);

    expect(found.map((group) => group.word)).toEqual(["hade"]);
    expect(found[0]?.ranges.map((range) => text.slice(range.from, range.to))).toEqual([
      "hade",
      "hade",
    ]);
  });

  it("does not count words further apart than the window, or small common words like sig", () => {
    const found = repetitions(wordsWithSentences(text), 2);

    expect(found.map((group) => group.word)).toEqual([]);
  });
});

describe("repeated names", () => {
  it("are not counted: a capitalised word inside a sentence is a name, and names come back", () => {
    const text = "Sedan sa Arvid ingenting. Arvid log mot Elin och Elin log tillbaka.";

    const found = repetitions(wordsWithSentences(text), 3);

    expect(found.map((group) => group.word)).toEqual(["log"]);
  });

  it("are not counted where a name begins a sentence either", () => {
    const text = "Han ringde Karin. Karin svarade inte. Karin hade gått.";

    expect(repetitions(wordsWithSentences(text), 3)).toEqual([]);
  });
});

describe("how often a word repeats", () => {
  it("is the most times within one window, not every time in the scene", () => {
    const text =
      "Han hade gått. Hon hade sovit. Vi åt. Vi drack. Vi gick. Det hade regnat. Det hade blåst.";

    const [found] = repetitions(wordsWithSentences(text), 3);

    expect(found?.ranges).toHaveLength(4);
    expect(found?.most).toBe(2);
  });
});
