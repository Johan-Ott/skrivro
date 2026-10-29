import JSZip from "jszip";
import type { Node } from "prosemirror-model";
import type { BookDetails, OutlineItem, Typography } from "./book.js";
import { backPages, frontPages, type BookExtras, type Page } from "./bookParts.js";
import { DEFAULT_DESIGN, type BookDesign } from "./bookDesign.js";
import { bookWords, contentsLabel } from "./bookWords.js";
import { epubCover } from "./epubCover.js";
import {
  designStyle,
  EBOOK_STYLE,
  openingHtml,
  pictureFiles,
  withSceneBreaks,
  type EpubDesign,
} from "./epubDesign.js";
import { escapeXml, sceneXhtml, xhtmlPage } from "./xhtml.js";

export type { BookExtras };

export interface EpubInput {
  book: BookDetails;
  outline: OutlineItem[];
  scenes: Map<string, Node>;
  typography: Typography;
  /** A language tag such as "sv-SE". */
  language: string;
  /** The same between exports, so readers know it is the same book. */
  identifier: string;
  modified: Date;
  parts: { hasTitlePage: boolean; hasCopyrightPage: boolean; hasContents: boolean };
  extras: BookExtras;
  /** Without a picture the book gets a typographic cover. */
  cover?: { type: "jpeg" | "png"; bytes: Uint8Array };
  design?: BookDesign;
  /** The pictures the design and chapters use, by file name. */
  images?: Map<string, Uint8Array>;
}

const lookOf = (input: EpubInput): EpubDesign => ({
  design: input.design ?? DEFAULT_DESIGN,
  images: input.images ?? new Map(),
});

function coverFile({ cover, book }: EpubInput) {
  if (!cover) return { name: "cover.svg", mediaType: "image/svg+xml", content: epubCover(book) };
  const name = cover.type === "jpeg" ? "cover.jpg" : "cover.png";
  return { name, mediaType: `image/${cover.type}`, content: cover.bytes };
}

const LIST_SEPARATOR = "\n    ";

function textPages(input: EpubInput): Page[] {
  const { outline, scenes, typography, book, language } = input;
  const look = lookOf(input);
  const pages: Page[] = [];
  let current: Page | null = null;
  let previous: OutlineItem["kind"] | null = null;
  for (const item of outline) {
    if (item.kind !== "scene") {
      const tocLabel = contentsLabel(item, language);
      const body = openingHtml(item, language, look);
      current = { id: `${item.kind}-${item.number}`, title: tocLabel, body, tocLabel };
      pages.push(current);
    } else {
      if (!current) pages.push((current = { id: "opening", title: book.title, body: "" }));
      if (previous === "scene") current.body += '\n<hr class="scene-break" />';
      const doc = scenes.get(item.id);
      if (doc) current.body += `\n${sceneXhtml(doc, typography, item.id)}`;
    }
    previous = item.kind;
  }
  return pages.map((page) => ({ ...page, body: withSceneBreaks(page.body, look) }));
}

function navPage(pages: Page[], language: string) {
  const items = pages
    .filter((page) => page.tocLabel)
    .map((page) => `<li><a href="text/${page.id}.xhtml">${escapeXml(page.tocLabel ?? "")}</a></li>`)
    .join("\n");
  const { contents } = bookWords(language);
  const body = `<nav epub:type="toc" id="toc">\n<h1>${contents}</h1>\n<ol>\n${items}\n</ol>\n</nav>`;
  return xhtmlPage(contents, body, language).replace('href="../style.css"', 'href="style.css"');
}

// What a reader with a screen reader or a braille display needs to know before buying.
const ACCESSIBILITY = [
  ["accessMode", "textual"],
  ["accessModeSufficient", "textual"],
  ["accessibilityFeature", "tableOfContents"],
  ["accessibilityFeature", "readingOrder"],
  ["accessibilityFeature", "structuralNavigation"],
  ["accessibilityHazard", "none"],
  [
    "accessibilitySummary",
    "Text in reading order, with a table of contents and headings for navigation.",
  ],
]
  .map(
    ([name, value]) => `
    <meta property="schema:${name}">${value}</meta>`,
  )
  .join("");

function metadata({ book, identifier, modified, language }: EpubInput) {
  const stamp = `${modified.toISOString().slice(0, 19)}Z`;
  const creator = book.author
    ? `
    <dc:creator>${escapeXml(book.author)}</dc:creator>`
    : "";
  return `  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">${escapeXml(identifier)}</dc:identifier>
    <dc:title>${escapeXml(book.title)}</dc:title>${creator}
    <dc:language>${language}</dc:language>
    <meta property="dcterms:modified">${stamp}</meta>${ACCESSIBILITY}
  </metadata>`;
}

// EPUB requires the contents page in the manifest; it is read only when chosen.
function spine(front: Page[], text: Page[], hasContents: boolean) {
  const ids = [
    ...front.map((page) => page.id),
    ...(hasContents ? ["nav"] : []),
    ...text.map((page) => page.id),
  ];
  return ids.map((id) => `<itemref idref="${id}" />`).join(LIST_SEPARATOR);
}

function packageDocument(input: EpubInput, front: Page[], text: Page[]) {
  const cover = coverFile(input);
  const pageItems = [...front, ...text]
    .map(
      (page) =>
        `<item id="${page.id}" href="text/${page.id}.xhtml" media-type="application/xhtml+xml" />`,
    )
    .join(LIST_SEPARATOR);
  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id" xml:lang="${input.language}">
${metadata(input)}
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav" />
    <item id="style" href="style.css" media-type="text/css" />
    <item id="cover-image" href="${cover.name}" media-type="${cover.mediaType}" properties="cover-image" />
    ${pageItems}${pictureFiles(lookOf(input))
      .map((file) => LIST_SEPARATOR + file.item)
      .join("")}
  </manifest>
  <spine>
    ${spine(front, text, input.parts.hasContents)}
  </spine>
</package>
`;
}

const CONTAINER = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml" />
  </rootfiles>
</container>
`;

/** The mimetype goes first and uncompressed, as EPUB requires. */
export async function buildEpub(input: EpubInput): Promise<Uint8Array> {
  const front = frontPages({ ...input, coverName: coverFile(input).name });
  const text = [...textPages(input), ...backPages(input.extras, input.language)];
  const zip = new JSZip();
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
  zip.file("META-INF/container.xml", CONTAINER);
  zip.file("OEBPS/content.opf", packageDocument(input, front, text));
  zip.file("OEBPS/nav.xhtml", navPage(text, input.language));
  zip.file("OEBPS/style.css", `${EBOOK_STYLE}\n${designStyle(lookOf(input))}`);
  for (const file of pictureFiles(lookOf(input))) zip.file(file.path, file.bytes);
  const cover = coverFile(input);
  zip.file(`OEBPS/${cover.name}`, cover.content);
  for (const page of [...front, ...text]) {
    zip.file(`OEBPS/text/${page.id}.xhtml`, xhtmlPage(page.title, page.body, input.language));
  }
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
