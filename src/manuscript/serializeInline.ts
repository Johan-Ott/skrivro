import type { Paragraph, PhrasingContent } from "mdast";
import { toMarkdown } from "mdast-util-to-markdown";
import type { Mark, Node } from "prosemirror-model";
import { PLACEHOLDER } from "./placeholders.js";

type Wrapper = "link" | "italic" | "bold" | "underline" | "strike" | "superscript" | "subscript";
const WRAPPERS: Wrapper[] = [
  "link",
  "italic",
  "bold",
  "underline",
  "strike",
  "superscript",
  "subscript",
];
const TAGS: Partial<Record<Wrapper, string>> = {
  underline: "u",
  strike: "s",
  superscript: "sup",
  subscript: "sub",
};

// Links, italic and bold are Markdown's own; the other marks are written as HTML around the text.
function wrapped(mark: Mark, children: PhrasingContent[]): PhrasingContent[] {
  const name = mark.type.name as Wrapper;
  if (name === "link") {
    const title = mark.attrs["title"] as string | null;
    return [{ type: "link", url: String(mark.attrs["href"]), title, children }];
  }
  const tag = TAGS[name];
  if (!tag) return [{ type: name === "italic" ? "emphasis" : "strong", children }];
  return [{ type: "html", value: `<${tag}>` }, ...children, { type: "html", value: `</${tag}>` }];
}

const markOf = (node: Node | undefined, name: string) =>
  node?.marks.find((mark) => mark.type.name === name);
const hasMark = (node: Node, name: string) => markOf(node, name) !== undefined;

// A run is one and the same mark, so two links side by side stay two.
function runEnd(nodes: Node[], start: number, wrapper: Wrapper): number {
  const first = markOf(nodes[start], wrapper);
  let end = start;
  while (first && markOf(nodes[end], wrapper)?.eq(first)) end++;
  return end;
}

// The mark covering the longest stretch goes outermost, so `*a **b** c*` stays one emphasis.
function outerWrapper(nodes: Node[], start: number, done: Wrapper[]): Wrapper | undefined {
  const node = nodes[start] as Node;
  const candidates = WRAPPERS.filter((name) => !done.includes(name) && hasMark(node, name));
  const longestFirst = candidates.sort(
    (first, second) => runEnd(nodes, start, second) - runEnd(nodes, start, first),
  );
  return longestFirst[0];
}

// Skrivro's style fences are not CommonMark, so remark does not escape them at a line start.
function textWithSafeFences(value: string): PhrasingContent[] {
  return value.split(/(?<=^|\n)(?=:::)/).flatMap((part, index) => {
    const startsLine = part.startsWith(":::") && (index > 0 || value.startsWith(":::"));
    const text: PhrasingContent = { type: "text", value: part };
    return startsLine ? [{ type: "html", value: "\\" }, text] : [text];
  });
}

// Written as typed, not as \[?], unless reading it back could change it: before ( [ or : it would
// become a link or a definition, and with * _ ` < & \ inside, a mark.
const MARKDOWN_AFTER = /^[([:]/;
const MARKDOWN_INSIDE = /[*_`<&\\]/;

function textWithPlaceholders(value: string): PhrasingContent[] {
  const parts = value.split(new RegExp(`(${PLACEHOLDER.source})`));
  return parts.flatMap((part, index) => {
    if (part === "") return [];
    const isSafe =
      index % 2 === 1 &&
      !MARKDOWN_AFTER.test(parts[index + 1] ?? "") &&
      !MARKDOWN_INSIDE.test(part);
    return isSafe ? [{ type: "html", value: part }] : textWithSafeFences(part);
  });
}

function leaves(nodes: Node[]): PhrasingContent[] {
  const result: PhrasingContent[] = [];
  let plain = "";
  const flush = () => {
    if (plain !== "") result.push(...textWithPlaceholders(plain));
    plain = "";
  };
  for (const node of nodes) {
    if (node.type.name === "footnote") {
      flush();
      result.push({ type: "html", value: `[^${String(node.attrs["label"])}]` });
    } else if (hasMark(node, "raw")) {
      flush();
      result.push({ type: "html", value: node.text ?? "" });
    } else plain += node.type.name === "lineBreak" ? "\n" : (node.text ?? "");
  }
  flush();
  return result;
}

function toPhrasing(nodes: Node[], done: Wrapper[]): PhrasingContent[] {
  const result: PhrasingContent[] = [];
  let leafStart = 0;
  for (let index = 0; index < nodes.length;) {
    const wrapper = outerWrapper(nodes, index, done);
    if (!wrapper) {
      index++;
      continue;
    }
    const end = runEnd(nodes, index, wrapper);
    const children = toPhrasing(nodes.slice(index, end), [...done, wrapper]);
    result.push(...leaves(nodes.slice(leafStart, index)));
    result.push(...wrapped(markOf(nodes[index], wrapper) as Mark, children));
    index = leafStart = end;
  }
  return [...result, ...leaves(nodes.slice(leafStart))];
}

const marksEndingAt = (node: Node, neighbour: Node | undefined) =>
  node.marks
    .filter((mark) => WRAPPERS.includes(mark.type.name as Wrapper))
    .filter((mark) => !neighbour?.marks.some((other) => other.eq(mark)));

function withoutEndingMarks(node: Node, neighbour: Node | undefined) {
  return marksEndingAt(node, neighbour).reduce(
    (marks, mark) => mark.removeFromSet(marks),
    node.marks,
  );
}

// Spaces at the edge of italic or bold move outside the mark, so the file reads `*ord* `.
function expelEdgeSpaces(nodes: Node[]): Node[] {
  return nodes.flatMap((node, index) => {
    const parts = /^(\s*)(.*?)(\s*)$/s.exec(node.text ?? "");
    if (!node.isText || !parts) return [node];
    const [, leading = "", core = "", trailing = ""] = parts;
    const piece = (text: string, marks: readonly Mark[]) =>
      text === "" ? [] : [node.type.schema.text(text, marks)];
    return [
      ...piece(leading, withoutEndingMarks(node, nodes[index - 1])),
      ...piece(core, node.marks),
      ...piece(trailing, withoutEndingMarks(node, nodes[index + 1])),
    ];
  });
}

const isLineEdge = (node: Node | undefined) => !node || node.type.name === "lineBreak";

// Markdown would encode spaces at a line's edge as `&#x20;`, and they mean nothing in prose.
function trimLineEdges(nodes: Node[]): Node[] {
  return nodes.flatMap((node, index) => {
    if (!node.isText) return [node];
    let text = node.text ?? "";
    if (isLineEdge(nodes[index - 1])) text = text.trimStart();
    if (isLineEdge(nodes[index + 1])) text = text.trimEnd();
    return text === "" ? [] : [node.type.schema.text(text, node.marks)];
  });
}

export function serializeInlineContent(paragraph: Node): string {
  const nodes = trimLineEdges(expelEdgeSpaces([...paragraph.children]));
  const children = toPhrasing(nodes, []);
  const mdast: Paragraph = { type: "paragraph", children };
  return toMarkdown(mdast, { emphasis: "*", strong: "*" }).replace(/\n$/, "");
}
