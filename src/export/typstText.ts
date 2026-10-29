import type { Node } from "prosemirror-model";
import { quoteConverter, type Typography } from "./book.js";
import { footnoteParagraph } from "./footnoteText.js";

/** Prose as Typst markup: every character Typst could read as code is escaped. */
export const escapeTypst = (text: string) => text.replace(/[\\#*_`$<>@[\]~=\-+/"':({]/g, "\\$&");

export const typstString = (text: string) =>
  `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

const childrenOf = (paragraph: Node) => {
  const children: Node[] = [];
  paragraph.forEach((child) => children.push(child));
  return children;
};

function marked(text: string, child: Node) {
  let markup = escapeTypst(text);
  const marks = new Set(child.marks.map((mark) => mark.type.name));
  if (marks.has("italic")) markup = `#emph[${markup}]`;
  if (marks.has("bold")) markup = `#strong[${markup}]`;
  if (marks.has("underline")) markup = `#underline[${markup}]`;
  if (marks.has("strike")) markup = `#strike[${markup}]`;
  if (marks.has("superscript")) markup = `#super[${markup}]`;
  if (marks.has("subscript")) markup = `#sub[${markup}]`;
  const link = child.marks.find((mark) => mark.type.name === "link");
  if (link) markup = `#link(${typstString(String(link.attrs["href"]))})[${markup}]`;
  return markup;
}

// The note's text keeps its italics and bold, as the text around it does.
const footnote = (child: Node, convert: (text: string) => string): string =>
  `#footnote[${inline(childrenOf(footnoteParagraph(String(child.attrs["text"]))), convert)}]`;

function inline(children: Node[], convert: (text: string) => string): string {
  return children
    .map((child) => {
      if (child.type.name === "lineBreak") return " \\\n";
      if (child.type.name === "footnote") return footnote(child, convert);
      return marked(convert(child.text ?? ""), child);
    })
    .join("");
}

// A word split by a mark stays one word.
function wordsOf(children: Node[], convert: (text: string) => string) {
  const words: string[] = [""];
  for (const child of children) {
    if (child.type.name === "lineBreak") {
      words.push("#linebreak()", "");
      continue;
    }
    if (child.type.name === "footnote") {
      words[words.length - 1] += footnote(child, convert);
      continue;
    }
    convert(child.text ?? "")
      .split(/(\s+)/)
      .forEach((piece, index) => {
        if (index % 2 === 1) words.push("");
        else if (piece !== "") words[words.length - 1] += marked(piece, child);
      });
  }
  return words.filter((word) => word !== "");
}

const plainLetter = (node: Node | undefined) =>
  node?.isText && node.marks.length === 0 ? /^\p{L}/u.exec(node.text ?? "")?.[0] : undefined;

// The paragraph as separate words, so Typst can fit as many as there is room for beside the letter.
function withDropCap(paragraph: Node, convert: (text: string) => string) {
  const [first, ...others] = childrenOf(paragraph);
  const letter = plainLetter(first);
  if (!first || !letter) return inline(childrenOf(paragraph), convert);
  const rest = [first.type.schema.text((first.text ?? "").slice(1) || " "), ...others];
  const words = wordsOf(rest, convert).map((word) => `[${word}]`);
  return `#anfang(${typstString(letter)}, (${words.join(", ")},))`;
}

function withLeadIn(paragraph: Node, convert: (text: string) => string) {
  const words = wordsOf(childrenOf(paragraph), convert).map((word) => `[${word}]`);
  return words.length ? `#leadin-par((${words.join(", ")},))` : "";
}

interface SceneOptions {
  typography: Typography;
  hasDropCap: boolean;
  /** The first words in small capitals, when there is no drop cap. */
  hasLeadIn?: boolean;
  /** Where Typst finds a picture in the text, or null when it was not found. */
  picturePath?: (name: string) => string | null;
  /** The scene's id, when each block should say which page it lands on (see pagemark). */
  markScene?: string | undefined;
}

// A picture that was not found is left out, so the book can still be set.
function pictureTypst(picture: Node, options: SceneOptions) {
  const path = options.picturePath?.(String(picture.attrs["name"]));
  if (!path) return "";
  const caption = String(picture.attrs["caption"]);
  const size = typstString(String(picture.attrs["size"]));
  return `#bild(${typstString(path)}, ${size}, ${caption ? typstString(caption) : "none"})`;
}

function block(node: Node, options: SceneOptions): string {
  const name = node.type.name;
  if (name === "sceneBreak") return "#scenbrytning(break-mark)";
  if (name === "rawBlock") return escapeTypst(String(node.attrs["source"]));
  if (name === "picture") return pictureTypst(node, options);
  if (name === "styleBlock") {
    const inner: string[] = [];
    node.forEach((child) =>
      inner.push(block(child, { ...options, hasDropCap: false, hasLeadIn: false })),
    );
    return `#stil(${typstString(String(node.attrs["style"]))})[\n${inner.join("\n\n")}\n]`;
  }
  return inline(childrenOf(node), quoteConverter(options.typography));
}

// A picture on a page of its own turns the page first, so its page mark lands on that page.
const pageTurn = (node: Node) =>
  node.type.name === "picture" && node.attrs["size"] === "sida" ? "#pagebreak(weak: true)\n" : "";

export function sceneTypst(doc: Node, options: SceneOptions): string {
  const blocks: string[] = [];
  const startsWithText = doc.firstChild?.type.name === "paragraph";
  const hasAnfang = options.hasDropCap && startsWithText;
  const isLedIn = !options.hasDropCap && options.hasLeadIn === true && startsWithText;
  const markOf = (index: number) =>
    options.markScene ? `#pagemark(${typstString(options.markScene)}, ${index})` : "";
  doc.forEach((node, _offset, index) => {
    const convert = quoteConverter(options.typography);
    if (index === 0 && hasAnfang) return void blocks.push(markOf(0) + withDropCap(node, convert));
    if (index === 0 && isLedIn) return void blocks.push(markOf(0) + withLeadIn(node, convert));
    // Typst sees the anfang as a block, so the paragraph after it is indented by hand.
    const indent = index === 1 && hasAnfang && node.type.name === "paragraph" ? "#h(1.2em)" : "";
    blocks.push(pageTurn(node) + markOf(index) + indent + block(node, options));
  });
  return blocks.join("\n\n");
}
