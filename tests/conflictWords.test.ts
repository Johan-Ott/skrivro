import { describe, expect, it } from "vitest";
import { versionWords } from "../src/app/ConflictDialog";
import { countMarkdownWords } from "../src/manuscript/wordCount";

describe("the words of a version in the conflict dialog", () => {
  it("are counted as the tree counts them, without placeholders and style fences", () => {
    const body = "Elin kom [? namnet] hem.\n\n:::brev\nKära Elin.\n:::\n";

    expect(versionWords(body)).toBe(countMarkdownWords(body));
  });
});

describe("the words of a note's version", () => {
  it("leave out the template's unanswered prompts, as the tree does for a note", () => {
    const body = "**Vill:**\n\n<!-- Vad vill hon mest? -->\n\n**Rädd för:** mörkret.\n";

    expect(versionWords(body, true)).toBe(countMarkdownWords(body, true));
    expect(versionWords(body, true)).toBeLessThan(versionWords(body));
  });
});
