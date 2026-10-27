import { describe, expect, it } from "vitest";
import { firstAnswer } from "../src/editor/promptHints";
import { parseMarkdown } from "../src/manuscript/parseMarkdown";

const NOTE =
  "**Vill:**\n\n<!-- Vad jagar hen? -->\n\n**Rädd för:**\n\n<!-- Vad skrämmer hen? -->\n";

describe("firstAnswer", () => {
  it("puts the caret in the first question that has no answer", () => {
    const doc = parseMarkdown(NOTE, { isNote: true });

    const selection = firstAnswer(doc);

    const parent = doc.resolve(selection?.from ?? 0).parent;
    expect(parent.attrs["prompt"]).toBe("Vad jagar hen?");
  });

  it("skips an answered question for the next one", () => {
    const doc = parseMarkdown(
      "**Vill:**\n\nHem.\n\n**Rädd för:**\n\n<!-- Vad skrämmer hen? -->\n",
      { isNote: true },
    );

    const parent = doc.resolve(firstAnswer(doc)?.from ?? 0).parent;

    expect(parent.attrs["prompt"]).toBe("Vad skrämmer hen?");
  });

  it("is nothing for a text without questions", () => {
    expect(firstAnswer(parseMarkdown("Bara text.\n"))).toBeNull();
  });
});
