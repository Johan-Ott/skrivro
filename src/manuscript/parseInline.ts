import type { PhrasingContent } from "mdast";
import type { Mark, Node } from "prosemirror-model";
import { labelOf, REFERENCE, type FootnoteTexts } from "./footnotes.js";
import { manuscriptSchema as schema } from "./schema.js";

const LINE_BREAK = /\r?\n/;

function textWithBreaks(text: string, marks: readonly Mark[]): Node[] {
  return text.split(LINE_BREAK).flatMap((line, index) => {
    const nodes: Node[] = index > 0 ? [schema.node("lineBreak")] : [];
    if (line !== "") nodes.push(schema.text(line, marks));
    return nodes;
  });
}

// `[^1]` with a definition becomes a footnote; without one it stays as written.
function textWithNotes(text: string, marks: readonly Mark[], notes: FootnoteTexts): Node[] {
  if (notes.size === 0) return textWithBreaks(text, marks);
  return text.split(REFERENCE).flatMap((part) => {
    const label = REFERENCE.test(part) ? labelOf(part) : null;
    const noteText = label === null ? undefined : notes.get(label);
    if (noteText === undefined) return textWithBreaks(part, marks);
    return [schema.node("footnote", { label, text: noteText })];
  });
}

function sourceOf(node: PhrasingContent, source: string): string {
  const start = node.position?.start.offset ?? 0;
  const end = node.position?.end.offset ?? start;
  return source.slice(start, end);
}

type TagMark = "underline" | "strike" | "superscript" | "subscript";
const TAG_MARKS = new Map<string, TagMark>([
  ["u", "underline"],
  ["s", "strike"],
  ["sup", "superscript"],
  ["sub", "subscript"],
]);

// <u>, <s>, <sup> and <sub> open their mark for what follows them, </u> and the others close it.
function tagOf(child: PhrasingContent) {
  if (child.type !== "html") return null;
  const [, slash, tag = ""] = /^<(\/?)([a-z]+)>$/i.exec(child.value.trim()) ?? [];
  const mark = TAG_MARKS.get(tag.toLowerCase());
  return mark ? ({ mark, isClose: slash === "/" } as const) : null;
}

function inlineNode(
  child: PhrasingContent,
  source: string,
  marks: readonly Mark[],
  notes: FootnoteTexts,
): Node[] {
  if (child.type === "text") return textWithNotes(child.value, marks, notes);
  if (child.type === "break") return [schema.node("lineBreak")];
  if (child.type === "emphasis" || child.type === "strong") {
    const markName = child.type === "emphasis" ? "italic" : "bold";
    return parseInline(child.children, source, schema.mark(markName).addToSet(marks), notes);
  }
  if (child.type === "link") {
    const link = schema.mark("link", { href: child.url, title: child.title ?? null });
    return parseInline(child.children, source, link.addToSet(marks), notes);
  }
  return textWithBreaks(sourceOf(child, source), schema.mark("raw").addToSet(marks));
}

/** Inline content Skrivro does not edit (code, images, other html) is kept as raw text. */
export function parseInline(
  children: PhrasingContent[],
  source: string,
  marks: readonly Mark[],
  notes: FootnoteTexts,
): Node[] {
  let current = marks;
  return children.flatMap((child) => {
    const tag = tagOf(child);
    if (!tag) return inlineNode(child, source, current, notes);
    const type = schema.marks[tag.mark];
    current = tag.isClose ? type.removeFromSet(current) : type.create().addToSet(current);
    return [];
  });
}
