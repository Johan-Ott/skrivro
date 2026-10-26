import { describe, expect, it } from "vitest";
import { parseMarkdown } from "../src/manuscript/parseMarkdown";
import {
  countDocumentWords,
  countMarkdownWords,
  countWordsBetween,
} from "../src/manuscript/wordCount";

describe("a comment among words", () => {
  const cases: [string, string, number][] = [
    ["alone on its line", "Hon gick hem.\n\n<!-- kom ihåg tidslinjen -->\n\nDet snöade.\n", 5],
    ["first on a line", "<!-- fem ord i kommentaren här --> men sen text\n", 3],
    ["in the middle of a line", "först text <!-- fem ord i kommentaren här --> sen text\n", 4],
    [
      "followed by prose and a later comment",
      "<!-- a --> men sen text\n\nHär är tre stycken riktig prosa.\n\n<!-- senare kommentar -->\n",
      9,
    ],
  ];

  it.each(cases)("is no words, %s: file, document and selection agree", (_name, text, words) => {
    const doc = parseMarkdown(text);

    expect(countMarkdownWords(text)).toBe(words);
    expect(countDocumentWords(doc)).toBe(words);
    expect(countWordsBetween(doc, 0, doc.content.size)).toBe(words);
  });
});
