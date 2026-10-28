import type { Node } from "prosemirror-model";
import { footnoteDefinitions } from "./footnotes.js";
import { listContent, parseMarkdown } from "./parseMarkdown.js";
import { pictureMarkdown } from "./pictures.js";
import { serializeInlineContent } from "./serializeInline.js";

/** A note's lists are written as Markdown lists, so another editor reads them; a scene's keep
 * Skrivro's own form. */
export function serializeMarkdown(doc: Node, options: { isNote?: boolean } = {}): string {
  const body = serializeBlocks(doc, options.isNote ?? false);
  return body + String(doc.attrs["trailing"] ?? "") + footnoteDefinitions(doc);
}

const BLANK_LINE = /\n[ \t]*\r?\n/;
const LINE_BREAK = /\n/;

// A moved block keeps its old gap only while that gap still separates the blocks.
function gapBefore(block: Node, previous: Node | null): string {
  const before = block.attrs["before"] as string | null;
  if (!previous) return before ?? "";
  const isValid =
    before !== null && (needsBlankLine(previous) ? BLANK_LINE : LINE_BREAK).test(before);
  return isValid ? before : "\n\n";
}

// A fence's closing line ends it, so the next block needs none; a paragraph or a list takes it in.
function needsBlankLine(previous: Node): boolean {
  if (previous.type.name === "paragraph") return true;
  return previous.type.name === "styleBlock" && previous.attrs["openFence"] === null;
}

function serializeBlocks(parent: Node, isNote: boolean): string {
  let markdown = "";
  let previous: Node | null = null;
  parent.forEach((block) => {
    markdown += gapBefore(block, previous) + serializeBlock(block, isNote);
    previous = block;
  });
  return markdown;
}

// Every block but a paragraph is written by its kind.
const OTHER_BLOCKS: Record<
  string,
  (block: Node, source: string | null, isNote: boolean) => string
> = {
  rawBlock: (_block, source) => source ?? "",
  sceneBreak: (_block, source) => source ?? "* * *",
  styleBlock: (block, _source, isNote) => serializeStyleBlock(block, isNote),
  picture: (block, source) => pictureSource(block, source),
};

function serializeBlock(block: Node, isNote: boolean): string {
  const source = block.attrs["source"] as string | null;
  const other = OTHER_BLOCKS[block.type.name];
  if (other) return other(block, source, isNote);
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

// A list of whole, one-line items, written as `- item` or `1. item`; null for anything else, as an
// empty item that is still being typed, which keeps the fence until it holds text.
function markdownList(block: Node): string | null {
  const style = block.attrs["style"];
  if (style !== "punktlista" && style !== "numrerad") return null;
  const texts = block.children.map((item) =>
    item.type.name === "paragraph" ? cachedCanonical(item) : "",
  );
  if (texts.some((text) => text === "" || text.includes("\n"))) return null;
  const first = Number(block.attrs["start"]);
  const lines = texts.map(
    (text, index) => `${style === "numrerad" ? `${first + index}.` : "-"} ${text}`,
  );
  const list = lines.join(block.attrs["isSpread"] ? "\n\n" : "\n");
  return isReadBackAsList(list, style, texts) ? list : null;
}

// An item that begins like Markdown, "# Rubrik" or "1. Ett", would be read as something else when
// the file is opened again, so such a list keeps the fence.
function isReadBackAsList(list: string, style: string, texts: string[]) {
  const back = parseMarkdown(list);
  const only = back.childCount === 1 ? back.child(0) : null;
  if (only?.type.name !== "styleBlock" || only.attrs["style"] !== style) return false;
  return only.children.map(cachedCanonical).join("\n") === texts.join("\n");
}

function serializeStyleBlock(block: Node, isNote: boolean): string {
  const source = block.attrs["source"] as string | null;
  if (source !== null && listContent(block) === block.attrs["canonical"]) return source;
  const list = markdownList(block);
  const isHandWrittenInFence = source !== null && block.attrs["openFence"] !== null;
  if (list !== null && isHandWrittenInFence) return fenceAround(block, list); // keeps its dashes
  return (isNote ? list : null) ?? fenceAround(block, serializeBlocks(block, isNote));
}

function fenceAround(block: Node, inner: string): string {
  const style = String(block.attrs["style"]);
  const openFence = block.attrs["openFence"] as string | null;
  const fenceStyle = openFence?.replace(/^:::/, "").trim();
  const open = openFence !== null && fenceStyle === style ? openFence : `::: ${style}\n`;
  const innerTrailing = (block.attrs["innerTrailing"] as string | null) ?? "\n";
  const close = (block.attrs["closeFence"] as string | null) ?? ":::";
  return open + inner + innerTrailing + close;
}
