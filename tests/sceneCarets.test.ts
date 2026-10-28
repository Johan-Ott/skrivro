import { EditorState, TextSelection } from "prosemirror-state";
import { describe, expect, it } from "vitest";
import { caretFor, rememberCaret } from "../src/editor/sceneCarets";
import { parseMarkdown } from "../src/manuscript/parseMarkdown";

const stateAt = (markdown: string, after: string) => {
  const doc = parseMarkdown(markdown);
  const state = EditorState.create({ doc });
  let position = 0;
  doc.descendants((node, start) => {
    const index = node.isText ? (node.text ?? "").indexOf(after) : -1;
    if (index >= 0 && position === 0) position = start + index + after.length;
  });
  return state.apply(state.tr.setSelection(TextSelection.create(doc, position)));
};

const wordBefore = (markdown: string, position: number | null) =>
  parseMarkdown(markdown).textBetween(Math.max(1, (position ?? 0) - 10), position ?? 0);

describe("the caret a scene was left with", () => {
  it("is where the writer comes back to", () => {
    const text = "Elin gick mot fyren.\n\nArvid stod kvar.\n";
    rememberCaret("/bok/S1", stateAt(text, "Arvid stod"));

    expect(wordBefore(text, caretFor("/bok/S1", parseMarkdown(text)))).toBe("Arvid stod");
  });

  it("is found by the words before it when text was added above", () => {
    const text = "Elin gick mot fyren.\n\nArvid stod kvar.\n";
    rememberCaret("/bok/S2", stateAt(text, "Arvid stod"));
    const longer = `Ny rad överst.\n\n${text}`;

    expect(wordBefore(longer, caretFor("/bok/S2", parseMarkdown(longer)))).toBe("Arvid stod");
  });

  it("is nothing for a scene not left yet, or in another book", () => {
    rememberCaret("/bok/S3", stateAt("Text här.\n", "Text"));

    expect(caretFor("/bok/S4", parseMarkdown("Text här.\n"))).toBeNull();
    expect(caretFor("/annan/S3", parseMarkdown("Text här.\n"))).toBeNull();
  });
});
