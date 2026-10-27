import { describe, expect, it } from "vitest";
import { countDocumentWords, countMarkdownWords } from "../src/manuscript/wordCount";
import { parseMarkdown } from "../src/manuscript/parseMarkdown";
import { manuscriptSchema } from "../src/manuscript/schema";
import { serializeMarkdown } from "../src/manuscript/serializeMarkdown";

describe("a placeholder in the text", () => {
  it.each(["Hon klev på tåget mot [?] i gryningen.", "Hon klev på [? kolla tågets namn] igen."])(
    "stays on disk as it was written: %s",
    (text) => {
      expect(serializeMarkdown(parseMarkdown(text))).toBe(text);
    },
  );
});

describe("words", () => {
  it("do not count a placeholder, in the document or in the file", () => {
    const text = "Hon klev på tåget mot [? kolla tågets namn] i gryningen.";

    expect(countMarkdownWords(text)).toBe(7);
    expect(countDocumentWords(parseMarkdown(text))).toBe(7);
  });
});

describe("a placeholder that Markdown could read as something else", () => {
  it.each([
    "[?]: kolla detta",
    "[?]: https://skrivro.se",
    "Se [?](x) här.",
    "Se [?][1] här.",
    "Se [? _namnet_] här.",
    "Se [? 2*3*4] här.",
  ])("comes back with the same text: %s", (text) => {
    // What the writer typed: the text itself, not Markdown read from a file.
    const typed = manuscriptSchema.node("doc", null, [
      manuscriptSchema.node("paragraph", null, [manuscriptSchema.text(text)]),
    ]);

    const again = parseMarkdown(serializeMarkdown(typed)).textContent;

    expect(again).toBe(text);
  });
});
