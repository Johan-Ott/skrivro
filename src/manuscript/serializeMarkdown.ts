import type { Node } from "prosemirror-model";
import { footnoteDefinitions } from "./footnotes.js";
import { listContent, parseMarkdown } from "./parseMarkdown.js";
import { pictureMarkdown } from "./pictures.js";
import { serializeInlineContent } from "./serializeInline.js";

export function serializeMarkdown(doc: Node): string {
  return serializeBlocks(doc) + String(doc.attrs["trailing"] ?? "") + footnoteDefinitions(doc);
}

const BLANK_LINE = /\n[ \t]*\r?\n/;
const LINE_BREAK = /\n/;

// A moved block keeps its old gap only while that gap still separates the blocks.
function gapBefore(block: Node, previous: Node | null): string {
  const before = block.attrs["before"] as string | null;
  if (!previous) return before ?? "";
  const needsBlankLine = previous.type.name === "paragraph" || previous.type.name === "styleBlock";
  const isValid = before !== null && (needsBlankLine ? BLANK_LINE : LINE_BREAK).test(before);
  return isValid ? before : "\n\n";
}

function serializeBlocks(parent: Node): string {
  let markdown = "";
  let previous: Node | null = null;
  parent.forEach((block) => {
    markdown += gapBefore(block, previous) + serializeBlock(block);
    previous = block;
  });
  return markdown;
}

// Every block but a paragraph is written by its kind.
const OTHER_BLOCKS: Record<string, (block: Node, source: string | null) => string> = {
  rawBlock: (_block, source) => source ?? "",
  sceneBreak: (_block, source) => source ?? "* * *",
  styleBlock: (block) => serializeStyleBlock(block),
  picture: (block, source) => pictureSource(block, source),
};

function serializeBlock(block: Node): string {
  const source = block.attrs["source"] as string | null;
  const other = OTHER_BLOCKS[block.type.name];
  if (other) return other(block, source);
  const canonical = cachedCanonical(block);
  return source !== null && canonical === block.attrs["canonical"] ? source : canonical;
}

// An untouched picture keeps the way it was written.
function pictureSource(picture: Node, source: string | null) {
  const canonical = pictureMarkdown(picture);
  if (source === null) return canonical;
  const before = parseMarkdown(source).firstChild;
  return before && pictureMarkdown(before) === canonical ? source : canonical;
}

// Unchanged paragraphs keep their object identity, so only the edited one is serialized again.
const canonicalByParagraph = new WeakMap<Node, string>();

function cachedCanonical(paragraph: Node): string {
  const cached = canonicalByParagraph.get(paragraph);
  if (cached !== undefined) return cached;
  const canonical = serializeInlineContent(paragraph);
  canonicalByParagraph.set(paragraph, canonical);
  return canonical;
}

function serializeStyleBlock(block: Node): string {
  const source = block.attrs["source"] as string | null;
  if (source !== null && listContent(block) === block.attrs["canonical"]) return source;
  const style = String(block.attrs["style"]);
  const openFence = block.attrs["openFence"] as string | null;
  const fenceStyle = openFence?.replace(/^:::/, "").trim();
  const open = openFence !== null && fenceStyle === style ? openFence : `::: ${style}\n`;
  const innerTrailing = (block.attrs["innerTrailing"] as string | null) ?? "\n";
  const close = (block.attrs["closeFence"] as string | null) ?? ":::";
  return open + serializeBlocks(block) + innerTrailing + close;
}
