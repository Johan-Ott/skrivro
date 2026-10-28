import type { Node } from "prosemirror-model";
import { parseMarkdown } from "../manuscript/parseMarkdown.js";
import { manuscriptSchema as schema } from "../manuscript/schema.js";

/** A footnote's text as a paragraph with its marks, so every export sets *kursiv* as italic and
 * not as stars. Anything that would not read as one paragraph stays plain text. */
export function footnoteParagraph(text: string): Node {
  const paragraph = parseMarkdown(text).firstChild;
  if (paragraph?.type.name === "paragraph" && paragraph.textContent === plainOf(text)) {
    return paragraph;
  }
  return schema.node("paragraph", null, text === "" ? [] : [schema.text(text)]);
}

// The text without its marks' stars, to see that reading it took nothing else away.
const plainOf = (text: string) => text.replaceAll("*", "");
