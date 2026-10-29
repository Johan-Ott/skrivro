import { EditorState, TextSelection, type Command } from "prosemirror-state";
import { describe, expect, it } from "vitest";
import {
  askForLink,
  isAskingForLink,
  linkAsking,
  linkTarget,
  setLink,
} from "../src/editor/linkEditing";
import { parseMarkdown } from "../src/manuscript/parseMarkdown";
import { serializeMarkdown } from "../src/manuscript/serializeMarkdown";

function stateAt(markdown: string, from: number, to = from) {
  const doc = parseMarkdown(markdown);
  const state = EditorState.create({ doc, plugins: [linkAsking] });
  return state.apply(state.tr.setSelection(TextSelection.create(doc, from, to)));
}

function run(state: EditorState, command: Command) {
  let result = state;
  command(state, (transaction) => (result = state.apply(transaction)));
  return result;
}

const markdownOf = (state: EditorState) => serializeMarkdown(state.doc);
const LINKED = "Läs [Skrivro](https://skrivro.se) nu.\n";

describe("Länk…", () => {
  it("links the selected word, a bare address as a web address", () => {
    const state = stateAt("Läs mer på Skrivro.\n", 12, 19);

    expect(markdownOf(run(state, setLink("skrivro.se")))).toBe(
      "Läs mer på [Skrivro](https://skrivro.se).\n",
    );
  });

  it("writes the address in when nothing is selected, an e-mail as mailto", () => {
    const state = stateAt("Skriv till .\n", 12);

    const after = run(state, setLink("elin@exempel.se"));

    expect(after.doc.textContent).toBe("Skriv till elin@exempel.se.");
    expect(linkTarget(stateAt(markdownOf(after), 15)).href).toBe("mailto:elin@exempel.se");
  });

  it("edits the whole link the cursor stands in, also at its end", () => {
    expect(linkTarget(stateAt(LINKED, 8))).toEqual({
      from: 5,
      to: 12,
      href: "https://skrivro.se",
    });
    expect(linkTarget(stateAt(LINKED, 12)).from).toBe(5);

    const after = run(stateAt(LINKED, 8), setLink("https://skrivro.se/hjalp"));

    expect(markdownOf(after)).toBe("Läs [Skrivro](https://skrivro.se/hjalp) nu.\n");
  });

  it("takes the link away with an empty address", () => {
    expect(markdownOf(run(stateAt(LINKED, 8), setLink("")))).toBe("Läs Skrivro nu.\n");
  });

  it("asks for the address until the selection moves", () => {
    const asking = run(stateAt(LINKED, 8), askForLink);
    const moved = asking.apply(asking.tr.setSelection(TextSelection.create(asking.doc, 2)));

    expect(isAskingForLink(asking)).toBe(true);
    expect(isAskingForLink(moved)).toBe(false);
  });
});
