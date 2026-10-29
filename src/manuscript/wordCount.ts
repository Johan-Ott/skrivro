import type { Node } from "prosemirror-model";
import { countWords } from "../countWords.js";
import { splitFootnotes } from "./footnotes.js";
import { PLACEHOLDER } from "./placeholders.js";
import { isLabel, isUnanswered, UNANSWERED_FIELD } from "./prompts.js";
import { manuscriptSchema as schema, STYLE_NAMES } from "./schema.js";
import { findStyleFences } from "./styleFences.js";

// A comment is the writer's note to self, not the book's text, wherever it stands. It ends at its
// first `-->`, so what follows it on the same line is counted.
const COMMENT = /<!--(?:(?!-->)[\s\S])*-->/g;
const words = (text: string) => countWords(text.replace(COMMENT, " ").replace(PLACEHOLDER, " "));

const leafText = (leaf: Node) =>
  leaf.type === schema.nodes.rawBlock ? `\n${String(leaf.attrs["source"])}\n` : "\n";

/** Text in raw blocks counts; scene breaks do not, nor a comment, nor a label above an unanswered
 * question. */
export function countDocumentWords(doc: Node): number {
  const counted: string[] = [];
  let from = 0;
  doc.descendants((node, position, parent, index) => {
    if (!isLabel(node) || !isUnanswered(parent?.maybeChild(index + 1) ?? undefined)) return true;
    counted.push(doc.textBetween(from, position, "\n", leafText));
    from = position + node.nodeSize;
    return false;
  });
  counted.push(doc.textBetween(from, doc.content.size, "\n", leafText));
  return words(counted.join("\n"));
}

export const countWordsBetween = (doc: Node, from: number, to: number) =>
  words(doc.textBetween(from, to, "\n", leafText));

// What Markdown writes around the words: a picture on a line of its own, a link's address, the
// tags of underline, strike, raised and lowered text, and characters written as entities.
const PICTURE = /^!\[[^\]]*\]\([^)]*\)[ \t]*$/gm;
const LINK = /(?<!!)\[([^\]]*)\]\([^)]*\)/g;
const TAG = /<\/?(?:u|s|del|strike|sup|sub)>/g;
const ENTITY = /&(?:[a-z]+|#\d+);/gi;
const FOOTNOTE = /\[\^([^\]\s]+)\]/g;

// A style's fences, when it is one Skrivro knows and it is closed; any other stays text.
function withoutFences(body: string) {
  let text = body;
  for (const fence of findStyleFences(body).reverse()) {
    if (!(STYLE_NAMES as readonly string[]).includes(fence.style)) continue;
    text = `${text.slice(0, fence.start)}${text.slice(fence.innerStart, fence.innerEnd)}${text.slice(fence.end)}`;
  }
  return text;
}

/** The same count as the document's, from a scene file's text without building the document:
 * reading a long book is then many times faster. A note's unanswered questions are not words. */
export function countMarkdownWords(markdown: string, isNote = false): number {
  const { body, notes } = splitFootnotes(markdown);
  const unfenced = withoutFences(body);
  const text = (isNote ? unfenced.replace(UNANSWERED_FIELD, "") : unfenced)
    .replace(COMMENT, " ")
    .replace(PLACEHOLDER, " ")
    .replace(PICTURE, "")
    .replace(LINK, "$1")
    .replace(TAG, "")
    .replace(ENTITY, "")
    .replace(FOOTNOTE, (marker, label: string) => (notes.has(label) ? " " : marker));
  return countWords(text);
}
