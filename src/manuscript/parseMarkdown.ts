import type { List, ListItem, Paragraph, PhrasingContent, RootContent } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import type { Node } from "prosemirror-model";
import { splitFootnotes, type FootnoteTexts } from "./footnotes.js";
import { parseInline } from "./parseInline.js";
import { pictureOf } from "./pictures.js";
import { isLabelParagraph, promptOf } from "./prompts.js";
import { manuscriptSchema as schema, STYLE_NAMES } from "./schema.js";
import { serializeInlineContent } from "./serializeInline.js";
import { findStyleFences, type StyleFence } from "./styleFences.js";

interface PlacedBlock {
  start: number;
  end: number;
  node: Node;
}

/** A note, unlike a scene, may hold template questions: a comment under a label. */
export function parseMarkdown(fileMarkdown: string, options: { isNote?: boolean } = {}): Node {
  const isNote = options.isNote ?? false;
  const { body: markdown, notes } = splitFootnotes(fileMarkdown);
  const placed: PlacedBlock[] = [];
  let cursor = 0;
  for (const fence of findStyleFences(markdown)) {
    placed.push(
      ...markdownBlocks(markdown, { from: cursor, to: fence.start }, notes, isNote),
      styleBlock(markdown, fence, notes, isNote),
    );
    cursor = fence.end;
  }
  placed.push(...markdownBlocks(markdown, { from: cursor, to: markdown.length }, notes, isNote));
  const { blocks, trailing } = withGaps(markdown, placed, 0);
  return schema.node("doc", { trailing }, blocks);
}

function withGaps(text: string, placed: PlacedBlock[], rangeStart: number) {
  let previousEnd = rangeStart;
  const blocks = placed.map(({ start, end, node }) => {
    const before = text.slice(previousEnd, start);
    previousEnd = end;
    return node.type.create({ ...node.attrs, before }, node.content);
  });
  return { blocks, trailing: text.slice(previousEnd) };
}

function markdownBlocks(
  text: string,
  range: { from: number; to: number },
  notes: FootnoteTexts,
  isNote: boolean,
): PlacedBlock[] {
  const { from, to } = range;
  const chunk = text.slice(from, to);
  const { children } = fromMarkdown(chunk);
  return children.map((child, index) => {
    const start = child.position?.start.offset ?? 0;
    const end = child.position?.end.offset ?? chunk.length;
    const isQuestion = isNote && child.type === "html" && isLabelParagraph(children[index - 1]);
    const node = isQuestion
      ? questionFrom(chunk.slice(start, end))
      : blockFrom(child, chunk, notes);
    return { start: from + start, end: from + end, node };
  });
}

const onlyPicture = (children: PhrasingContent[]) => {
  const [only] = children;
  return children.length === 1 && only?.type === "image" ? pictureOf(only) : null;
};

function blockFrom(child: RootContent, chunk: string, notes: FootnoteTexts): Node {
  const source = chunk.slice(child.position?.start.offset, child.position?.end.offset);
  if (child.type === "thematicBreak") return schema.node("sceneBreak", { source });
  if (child.type === "list")
    return listFrom(child, chunk, notes, source) ?? schema.node("rawBlock", { source });
  if (child.type !== "paragraph") return schema.node("rawBlock", { source });
  const picture = onlyPicture(child.children);
  if (picture) return schema.node("picture", { ...picture, source });
  return paragraphFrom(child, chunk, notes, source);
}

// A one-line comment under a label is a template's question: an empty paragraph that saves as
// the comment. Anything else stays a raw block.
function questionFrom(source: string): Node {
  const prompt = promptOf(source);
  if (prompt === null) return schema.node("rawBlock", { source });
  return schema.node("paragraph", { source, canonical: "", prompt });
}

function paragraphFrom(
  child: Paragraph,
  chunk: string,
  notes: FootnoteTexts,
  source: string | null,
) {
  const content = parseInline(child.children, chunk, [], notes);
  const canonical = serializeInlineContent(schema.node("paragraph", null, content));
  return schema.node("paragraph", { source, canonical }, content);
}

/** What a list's style block holds, to tell an untouched list from an edited one. */
export const listContent = (block: Node) => {
  const lines: string[] = [String(block.attrs["style"])];
  block.forEach((item) => lines.push(serializeInlineContent(item)));
  return lines.join("\n");
};

// An item of one plain paragraph: no second paragraph, nested list or checkbox (`[ ] text`, which
// writing the text again would escape), since writing the list again would change them.
const CHECKBOX = /^\[[ xX]\]\s/;
const isPlainItem = (item: ListItem) => {
  const [only] = item.children;
  const first = only?.type === "paragraph" ? only.children[0] : undefined;
  const isCheckbox = first?.type === "text" && CHECKBOX.test(first.value);
  return item.children.length === 1 && only?.type === "paragraph" && !isCheckbox;
};

// A Markdown list is shown as the punktlista or numrerad style, with its first number and blank
// lines, and written back as it was until changed. Any other list stays a raw block.
function listFrom(list: List, chunk: string, notes: FootnoteTexts, source: string): Node | null {
  if (!list.children.every(isPlainItem)) return null;
  const paragraphs = list.children.map((item) => item.children[0] as Paragraph);
  const items = paragraphs.map((each) => paragraphFrom(each, chunk, notes, null));
  const style = list.ordered ? "numrerad" : "punktlista";
  const attrs = { style, start: list.start ?? 1, isSpread: list.spread ?? false };
  const shown = schema.node("styleBlock", attrs, items);
  return schema.node("styleBlock", { ...attrs, source, canonical: listContent(shown) }, items);
}

// What a style block can hold; any other block inside a fence keeps the whole fence as it was.
const isFenceContent = ({ node }: PlacedBlock) =>
  ["paragraph", "sceneBreak", "rawBlock"].includes(node.type.name);

// A list in a list style's fence, `::: punktlista` over `- ett`, shows as that style's items and
// is written back as it was until they change.
function listInFence(text: string, fence: StyleFence, inner: PlacedBlock[]): Node | null {
  if (fence.style !== "punktlista" && fence.style !== "numrerad") return null;
  const [only] = inner;
  if (inner.length !== 1 || only?.node.type.name !== "styleBlock") return null;
  if (only.node.attrs["source"] === null) return null; // a fence in a fence, not a list
  const attrs = {
    style: fence.style,
    start: only.node.attrs["start"],
    isSpread: only.node.attrs["isSpread"],
  };
  const shown = schema.node("styleBlock", attrs, only.node.content);
  const source = text.slice(fence.start, fence.end);
  const fenceLines = {
    openFence: fence.openFence,
    innerTrailing: text.slice(only.end, fence.innerEnd),
    closeFence: fence.closeFence,
  };
  return schema.node(
    "styleBlock",
    { ...attrs, ...fenceLines, source, canonical: listContent(shown) },
    only.node.content,
  );
}

function styleBlock(
  text: string,
  fence: StyleFence,
  notes: FootnoteTexts,
  isNote: boolean,
): PlacedBlock {
  const placement = { start: fence.start, end: fence.end };
  const rawFence = () => schema.node("rawBlock", { source: text.slice(fence.start, fence.end) });
  const isKnownStyle = (STYLE_NAMES as readonly string[]).includes(fence.style);
  const range = { from: fence.innerStart, to: fence.innerEnd };
  const inner = markdownBlocks(text, range, notes, isNote);
  if (!isKnownStyle || inner.length === 0) return { ...placement, node: rawFence() };
  const list = listInFence(text, fence, inner);
  if (list) return { ...placement, node: list };
  if (!inner.every(isFenceContent)) return { ...placement, node: rawFence() };
  const { blocks, trailing } = withGaps(text.slice(0, fence.innerEnd), inner, fence.innerStart);
  const attrs = {
    style: fence.style,
    openFence: fence.openFence,
    innerTrailing: trailing,
    closeFence: fence.closeFence,
  };
  return { ...placement, node: schema.node("styleBlock", attrs, blocks) };
}
