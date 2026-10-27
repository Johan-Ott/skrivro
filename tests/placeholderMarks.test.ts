import { sceneRepetitions } from "../src/editor/repetitionMarks";
import { wordsIn } from "../src/editor/spellingMarks";
import { describe, expect, it } from "vitest";
import { EditorState, TextSelection } from "prosemirror-state";
import { insertPlaceholder, placeholderDecorations } from "../src/editor/placeholderMarks";
import { parseMarkdown } from "../src/manuscript/parseMarkdown";

describe("placeholderDecorations", () => {
  it("marks each placeholder in the text and nothing else", () => {
    const doc = parseMarkdown(
      "Hon klev på [?] och sedan [? kolla namnet] igen. Inte [ett] länkord.",
    );

    const marked = placeholderDecorations(doc)
      .find()
      .map((decoration) => doc.textBetween(decoration.from, decoration.to));

    expect(marked).toEqual(["[?]", "[? kolla namnet]"]);
  });
});

describe("review of the text", () => {
  it("leaves the words of a placeholder out of the spelling check", () => {
    const doc = parseMarkdown("Hon klev på [? kolla tågets namn] nu.");

    expect(wordsIn(doc).map((place) => place.word)).toEqual(["Hon", "klev", "på", "nu"]);
  });

  it("leaves a placeholder out of the repetitions", () => {
    const doc = parseMarkdown("Tåget gick. [? tåget tåget tåget tåget] Sedan kom bussen.");

    expect(sceneRepetitions(doc, 50).map((repetition) => repetition.word)).not.toContain("tåget");
  });
});

describe("insertPlaceholder", () => {
  it("writes [? ] with the caret inside", () => {
    const doc = parseMarkdown("Hon  klev");
    const selection = TextSelection.create(doc, 5);
    let state = EditorState.create({ doc, selection });

    insertPlaceholder(state, (transaction) => (state = state.apply(transaction)));

    expect(state.doc.textContent).toBe("Hon [? ] klev");
    expect(state.selection.from).toBe(8);
  });
});

describe("a placeholder across a line break", () => {
  it("is not marked, since the file does not read it as one either", () => {
    const doc = parseMarkdown("Hon sa [? kolla  \nnamnet] nu.");

    expect(placeholderDecorations(doc).find()).toEqual([]);
  });
});
