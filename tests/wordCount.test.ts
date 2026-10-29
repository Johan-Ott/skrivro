import { describe, expect, it } from "vitest";
import { parseMarkdown } from "../src/manuscript/parseMarkdown";
import {
  countDocumentWords,
  countMarkdownWords,
  countWordsBetween,
} from "../src/manuscript/wordCount";

describe("countWordsBetween", () => {
  it("counts the words of a selection, across paragraphs", () => {
    const doc = parseMarkdown("Brevet låg där.\n\nKuvertet var gult.\n");
    const end = doc.content.size;

    const words = countWordsBetween(doc, 1, end);

    expect(words).toBe(countDocumentWords(doc));
    expect(words).toBe(6);
  });

  it("counts nothing for an empty selection", () => {
    const doc = parseMarkdown("Brevet låg där.\n");

    expect(countWordsBetween(doc, 3, 3)).toBe(0);
  });
});

describe("countMarkdownWords", () => {
  // Each counts what the document built from it counts, the way the tree and the shelf show it.
  const SCENES = [
    "Hon sa *nej* och __gick__.",
    "Fotnot här[^1] och där.\n\n[^1]: En lång förklaring med många ord.",
    "Utan definition [^2] kvar.",
    "![Fyren i dimma](bilder/fyren.png)",
    "Text före ![bild i raden](bilder/x.png) efter.",
    "::: brev\nKära Elin.\n:::",
    "::: okand\nOkänd stil här.\n:::",
    "::: brev\nAldrig stängd.",
    "# Rubrik med ord\n\nText.\n\n- punkt ett\n- punkt två",
    "Fisk &amp; chips och &nbsp; mer.",
    "<u>understruken</u> och <s>struken</s>.\n\n* * *\n\nEfter brytningen.",
    "Se [Skrivro](https://skrivro.se), H<sub>2</sub>O och 10<sup>3</sup> liter.",
  ];

  it.each(SCENES)("counts %j as its document does", (markdown) => {
    expect(countMarkdownWords(markdown)).toBe(countDocumentWords(parseMarkdown(markdown)));
  });
});
