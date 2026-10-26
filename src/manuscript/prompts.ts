import type { RootContent } from "mdast";
import type { Node } from "prosemirror-model";

// A template question is `<!-- the question -->` right under a bold label. It is the hint of an
// empty answer, not text, so it is never counted or reviewed. Any other comment stays a raw block.

/** The question in a block's Markdown, or null when the block is not a one-line comment. */
export function promptOf(source: string) {
  return /^<!--((?:(?!-->).)*)-->$/.exec(source.trim())?.[1]?.trim() ?? null;
}

/** A label with its unanswered question, as a file has them. */
export const UNANSWERED_FIELD =
  /^\*\*[^*\n]+:\*\*[ \t]*\r?\n(?:[ \t]*\r?\n)+<!--(?:(?!-->).)*-->[ \t]*$/gm;

/** A paragraph of one bold text ending in a colon, as read from Markdown. */
export function isLabelParagraph(block: RootContent | undefined) {
  if (block?.type !== "paragraph") return false;
  const [only] = block.children;
  const [text] = only?.type === "strong" ? only.children : [];
  return block.children.length === 1 && text?.type === "text" && text.value.endsWith(":");
}

export const isUnanswered = (block: Node | undefined) =>
  typeof block?.attrs["prompt"] === "string" && block.content.size === 0;

export const isLabel = (block: Node) => {
  const [only] = block.children;
  return (
    block.childCount === 1 &&
    only?.isText === true &&
    only.marks.some((mark) => mark.type.name === "bold") &&
    only.text?.endsWith(":") === true
  );
};
