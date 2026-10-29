import type { OutlineItem } from "./book.js";
import { BREAK_PICTURE, DEFAULT_DESIGN, type BookDesign } from "./bookDesign.js";
import { contentsLabel, designedLabel, titleBesideLabel } from "./bookWords.js";
import { imageSize } from "./imageSize.js";
import { openingOf } from "./typstOpening.js";
import { escapeXml } from "./xhtml.js";

/** The book design as far as e-readers follow it: the reader picks the typeface and size. */
export interface EpubDesign {
  design: BookDesign;
  /** The pictures the design and chapters use, by file name. */
  images: Map<string, Uint8Array>;
}

type Opening = Extract<OutlineItem, { kind: "part" | "chapter" }>;

const LONG_DASH = String.fromCharCode(0x2014);
const TITLE_CASES: Record<BookDesign["titleCase"], string> = {
  vanlig: "",
  kapitaler: "h1 .title { font-variant: small-caps; }",
  versaler: "h1 .title { text-transform: uppercase; letter-spacing: 0.05em; }",
};

const picture = (name: string, className: string) =>
  `<div class="${className}"><img src="../bilder/${escapeXml(name)}" alt="" /></div>`;

const has = ({ images }: EpubDesign, name: string | undefined): name is string =>
  Boolean(name && images.has(name));

/** The e-book's own style; the design adds to it. */
export const EBOOK_STYLE = `body { font-family: serif; line-height: 1.5; margin: 0 5%; }
p { margin: 0; text-indent: 1.5em; }
p.first { text-indent: 0; }
h1 { text-align: center; font-weight: normal; margin: 3em 0 2em; }
h1 .label { display: block; font-size: 0.7em; letter-spacing: 0.1em; text-transform: uppercase; }
h1 .subtitle { display: block; font-size: 0.6em; font-style: italic; margin-top: 0.4em; }
.epigraph { margin: 0 10% 2em; font-style: italic; }
.epigraph p { text-indent: 0; }
.epigraph p.by { font-style: normal; font-size: 0.9em; margin-top: 0.3em; }
.opening { text-align: center; }
.opening-vanster, .opening-vanster .epigraph { text-align: left; }
.opening-vanster h1 { text-align: left; }
.opening-picture { margin-top: 2em; }
.opening-picture img { max-width: 100%; max-height: 40vh; }
div.scene-break { text-align: center; margin: 1.5em 0; }
figure.picture { margin: 1.5em 0; text-align: center; }
figure.picture img { max-width: 100%; }
figure.picture-smal img { max-width: 60%; }
figure.picture figcaption { font-size: 0.85em; font-style: italic; margin-top: 0.4em; }
div.scene-break img { height: 1.5em; max-width: 40%; }
hr.scene-break { border: 0; text-align: center; margin: 1.5em 0; }
div.brev, div.citat, div.dikt { margin: 1em 2em; }
div.brev p, div.citat p, div.dikt p, div.motto p { text-indent: 0; }
div.meddelande, div.meddelande-ut { margin: 1em 0; font-family: sans-serif; font-size: 0.9em; }
div.meddelande p, div.meddelande-ut p { text-indent: 0; padding: 0.3em 0.8em; border-radius: 0.8em; background: #eee; margin: 0.4em 25% 0.4em 0; }
div.meddelande-ut p { margin: 0.4em 0 0.4em 25%; background: #ddd; }
div.motto { margin: 1em 0 2em 30%; text-align: right; font-style: italic; }
div.centrerat p, div.hoger p, div.utan-indrag p, div.kapitaler p { text-indent: 0; }
div.kapitaler { font-variant: small-caps; letter-spacing: 0.05em; }
div.punktlista, div.numrerad { margin: 1em 0; counter-reset: punkt; }
div.punktlista p, div.numrerad p { text-indent: -1.4em; margin-left: 1.4em; counter-increment: punkt; }
div.punktlista p::before { content: "•"; display: inline-block; width: 1.4em; text-indent: 0; }
div.numrerad p::before { content: counter(punkt) "."; display: inline-block; width: 1.4em; text-indent: 0; }
div.indrag { margin-left: 2em; }
div.underrubrik { margin: 1.4em 0 0.6em; font-weight: bold; page-break-after: avoid; break-after: avoid; }
div.ruta { margin: 1em 0; padding: 0.6em 0.9em; border: 1px solid #999; }
div.underrubrik p, div.ruta p { text-indent: 0; }
div.hangande-indrag p { margin-left: 2em; text-indent: -2em; }
div.centrerat { text-align: center; }
div.hoger { text-align: right; }
.title-page, .copyright { text-align: center; text-indent: 0; }
.title-page h1 { font-size: 2em; margin-top: 30%; }
.dedication { text-align: center; text-indent: 0; font-style: italic; margin-top: 30%; }
.cover { margin: 0; padding: 0; text-align: center; }
.cover img { height: 100%; max-width: 100%; }`;

export function designStyle({ design }: EpubDesign) {
  const mark = design.sceneBreak === BREAK_PICTURE ? DEFAULT_DESIGN.sceneBreak : design.sceneBreak;
  return [
    TITLE_CASES[design.titleCase],
    design.leadIn
      ? "h1 + p::first-line, .epigraph + p::first-line { font-variant: small-caps; }"
      : "",
    `hr.scene-break::after { content: "${mark.replace(/["\\]/g, "\\$&")}"; }`,
  ]
    .filter(Boolean)
    .join("\n");
}

function epigraph(item: Opening) {
  if (!item.epigraph) return "";
  const source = item.epigraphBy
    ? `<p class="by">${LONG_DASH} ${escapeXml(item.epigraphBy)}</p>`
    : "";
  return `\n<blockquote class="epigraph"><p>${escapeXml(item.epigraph)}</p>${source}</blockquote>`;
}

// An e-book has no fixed page, so the template's pictures come above the heading, top first.
function openingPictures(item: Opening, look: EpubDesign) {
  if (item.kind === "part") return { align: "mitten", html: "" };
  const { template, areas } = openingOf(look.design, item, look.images);
  const ordered = [...areas].sort((first, second) => first.y - second.y);
  const html = ordered.map((shown) => picture(shown.picture, "opening-picture")).join("");
  return { align: template.headingAlign, html };
}

/** The chapter's opening: its pictures, label, title, subtitle and epigraph. */
export function openingHtml(item: Opening, language: string, look: EpubDesign) {
  const label = designedLabel(item, language, look.design.chapterLabel);
  const title = titleBesideLabel(item.title, label);
  const parts = [
    label ? `<span class="label">${escapeXml(label)}</span>` : "",
    title ? `<span class="title">${escapeXml(title)}</span>` : "",
    item.subtitle ? `<span class="subtitle">${escapeXml(item.subtitle)}</span>` : "",
  ].filter(Boolean);
  const heading = `<h1>${parts.join("<br />") || escapeXml(contentsLabel(item, language))}</h1>`;
  const pictures = openingPictures(item, look);
  return `<div class="opening opening-${pictures.align}">${pictures.html}${heading}${epigraph(item)}</div>`;
}

/** With a picture as scene break, each break shows it instead of the marks. */
export function withSceneBreaks(body: string, look: EpubDesign) {
  const { design } = look;
  if (design.sceneBreak !== BREAK_PICTURE || !has(look, design.breakPicture)) return body;
  return body.replaceAll('<hr class="scene-break" />', picture(design.breakPicture, "scene-break"));
}

/** Each picture's place in the book and its manifest line. */
export function pictureFiles({ images }: EpubDesign) {
  return [...images].flatMap(([name, bytes], index) => {
    const size = imageSize(bytes);
    if (!size) return [];
    const href = `bilder/${name}`;
    const item = `<item id="bild-${index}" href="${escapeXml(href)}" media-type="image/${size.type}" />`;
    return [{ path: `OEBPS/${href}`, bytes, item }];
  });
}
