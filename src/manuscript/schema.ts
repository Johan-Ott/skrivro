import { Schema } from "prosemirror-model";

export const STYLE_NAMES = [
  "brev",
  "citat",
  "dikt",
  "meddelande",
  "meddelande-ut",
  "motto",
  "centrerat",
  "hoger",
  "utan-indrag",
  "kapitaler",
  "punktlista",
  "numrerad",
  "indrag",
  "underrubrik",
  "ruta",
  "hangande-indrag",
] as const;
export type StyleName = (typeof STYLE_NAMES)[number];

/** How wide a picture in the text is printed: narrower than the text, as wide, or a page of its own. */
export const PICTURE_SIZES = ["smal", "bred", "sida"] as const;
export type PictureSize = (typeof PICTURE_SIZES)[number];

// `source` and `before` keep each block's original text, so untouched blocks are saved byte for byte.
const blockAttrs = { before: { default: null }, source: { default: null } };

const isStyleName = (value: string | null): value is StyleName =>
  (STYLE_NAMES as readonly string[]).includes(value ?? "");

// ProseMirror reads null as "matches, no attributes" and false as "does not match".
const isBoldWeight = (value: string) => /^(bold|[6-9]00)$/.test(value);

const linkAttrs = (element: HTMLElement, href: string, title: string) => ({
  href: element.getAttribute(href) ?? "",
  title: element.getAttribute(title),
});

// Pasting keeps paragraphs, italic and bold; headings and list items become paragraphs.
export const manuscriptSchema = new Schema({
  nodes: {
    doc: { content: "block*", attrs: { trailing: { default: "\n" } } },
    paragraph: {
      group: "block",
      content: "inline*",
      attrs: { ...blockAttrs, canonical: { default: null }, prompt: { default: null } },
      parseDOM: [{ tag: "p" }, { tag: "h1" }, { tag: "h2" }, { tag: "h3" }, { tag: "li" }],
      toDOM: () => ["p", 0],
    },
    styleBlock: {
      group: "block",
      content: "(paragraph | sceneBreak | rawBlock)+",
      attrs: {
        before: { default: null },
        style: { default: "brev" },
        /** A list's first number and whether its items are parted by blank lines, as it was read. */
        start: { default: 1 },
        isSpread: { default: false },
        openFence: { default: null },
        innerTrailing: { default: null },
        closeFence: { default: null },
        /** A Markdown list shown as this style, written back as it was until it is changed. */
        source: { default: null },
        canonical: { default: null },
      },
      parseDOM: [
        {
          tag: "div[data-style]",
          getAttrs: (element) => {
            const style = element.getAttribute("data-style");
            return isStyleName(style) ? { style } : false;
          },
        },
        { tag: "blockquote", attrs: { style: "citat" } },
      ],
      toDOM: (node) => {
        const style = String(node.attrs["style"]);
        return ["div", { class: `style style-${style}`, "data-style": style }, 0];
      },
    },
    sceneBreak: {
      group: "block",
      atom: true,
      attrs: blockAttrs,
      parseDOM: [{ tag: "hr" }, { tag: "div.scene-break" }],
      toDOM: () => ["div", { class: "scene-break", contenteditable: "false" }, "* * *"],
    },
    // A picture in the book's bilder/ folder, written as ![caption](bilder/name.png) in the file.
    picture: {
      group: "block",
      atom: true,
      draggable: true,
      attrs: {
        ...blockAttrs,
        name: { default: "" },
        caption: { default: "" },
        size: { default: "bred" },
      },
      parseDOM: [
        {
          tag: "figure.picture",
          getAttrs: (element) => ({
            name: element.getAttribute("data-name") ?? "",
            caption: element.querySelector("figcaption")?.textContent ?? "",
            size: element.getAttribute("data-size") ?? "bred",
          }),
        },
      ],
      toDOM: (node) => [
        "figure",
        {
          class: "picture",
          "data-name": String(node.attrs["name"]),
          "data-size": String(node.attrs["size"]),
        },
        ["figcaption", String(node.attrs["caption"])],
      ],
    },
    rawBlock: {
      group: "block",
      atom: true,
      attrs: blockAttrs,
      parseDOM: [
        { tag: "pre.raw-block", getAttrs: (element) => ({ source: element.textContent }) },
      ],
      toDOM: (node) => ["pre", { class: "raw-block" }, String(node.attrs["source"])],
    },
    text: { group: "inline" },
    // A footnote's text is plain text kept on the node; CSS numbers the markers in order.
    footnote: {
      group: "inline",
      inline: true,
      atom: true,
      attrs: { label: { default: "1" }, text: { default: "" } },
      parseDOM: [
        {
          tag: "sup.footnote",
          getAttrs: (element) => ({
            label: element.getAttribute("data-label") ?? "1",
            text: element.getAttribute("data-text") ?? "",
          }),
        },
      ],
      toDOM: (node) => [
        "sup",
        {
          class: "footnote",
          "data-label": String(node.attrs["label"]),
          "data-text": String(node.attrs["text"]),
          title: String(node.attrs["text"]),
        },
      ],
    },
    lineBreak: {
      group: "inline",
      inline: true,
      selectable: false,
      parseDOM: [{ tag: "br" }],
      toDOM: () => ["br"],
    },
  },
  marks: {
    italic: {
      parseDOM: [{ tag: "em" }, { tag: "i" }, { style: "font-style=italic" }],
      toDOM: () => ["em", 0],
    },
    bold: {
      parseDOM: [
        { tag: "strong" },
        { tag: "b" },
        { style: "font-weight", getAttrs: (value) => (isBoldWeight(value) ? null : false) },
      ],
      toDOM: () => ["strong", 0],
    },
    // Markdown has no underline or strikethrough, so they are kept as HTML's <u> and <s>.
    underline: {
      parseDOM: [{ tag: "u" }, { style: "text-decoration=underline" }],
      toDOM: () => ["u", 0],
    },
    strike: {
      parseDOM: [{ tag: "s" }, { tag: "del" }, { tag: "strike" }],
      toDOM: () => ["s", 0],
    },
    // Upphöjd and nedsänkt are kept as HTML's <sup> and <sub>; a footnote's number is not one.
    superscript: {
      excludes: "superscript subscript",
      parseDOM: [{ tag: "sup:not(.footnote)" }],
      toDOM: () => ["sup", 0],
    },
    subscript: {
      excludes: "superscript subscript",
      parseDOM: [{ tag: "sub" }],
      toDOM: () => ["sub", 0],
    },
    // A link for the e-book, shown as a span so a click in the text never leaves the app.
    link: {
      attrs: { href: {}, title: { default: null } },
      inclusive: false,
      parseDOM: [
        { tag: "a[href]", getAttrs: (element) => linkAttrs(element, "href", "title") },
        { tag: "span.link", getAttrs: (element) => linkAttrs(element, "data-href", "data-title") },
      ],
      toDOM: (mark) => [
        "span",
        {
          class: "link",
          "data-href": String(mark.attrs["href"]),
          "data-title": mark.attrs["title"] as string | null,
          title: String(mark.attrs["href"]),
        },
        0,
      ],
    },
    raw: { inclusive: false, toDOM: () => ["span", { class: "raw-inline" }, 0] },
  },
});
