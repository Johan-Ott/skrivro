import type { Node } from "prosemirror-model";
import { quoteConverter, type Typography } from "./book.js";
import { footnoteParagraph } from "./footnoteText.js";

export const escapeXml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** EPUB requires the XHTML namespace and an epub namespace for its types. */
export function xhtmlPage(title: string, body: string, language: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${language}" xml:lang="${language}">
<head>
<meta charset="UTF-8" />
<title>${escapeXml(title)}</title>
<link rel="stylesheet" type="text/css" href="../style.css" />
</head>
<body>
${body}
</body>
</html>
`;
}

// A scene's footnotes, numbered from 1. Ids carry the scene's id, as a chapter page holds several.
interface SceneNotes {
  sceneId: string;
  texts: string[];
}

function noteReference(notes: SceneNotes, text: string) {
  notes.texts.push(text);
  const number = notes.texts.length;
  const id = `${notes.sceneId}-${number}`;
  return `<a epub:type="noteref" href="#note-${id}" id="ref-${id}"><sup>${number}</sup></a>`;
}

const noteAsides = (notes: SceneNotes) =>
  notes.texts.map((text, index) => {
    const id = `${notes.sceneId}-${index + 1}`;
    const back = `<a href="#ref-${id}">${index + 1}</a>`;
    return `<aside epub:type="footnote" id="note-${id}"><p>${back} ${text}</p></aside>`;
  });

function inline(paragraph: Node, convert: (text: string) => string, notes: SceneNotes) {
  let html = "";
  paragraph.forEach((child) => {
    if (child.type.name === "lineBreak") return void (html += "<br />");
    if (child.type.name === "footnote") {
      const note = footnoteParagraph(String(child.attrs["text"]));
      return void (html += noteReference(notes, inline(note, convert, notes)));
    }
    let text = escapeXml(convert(child.text ?? ""));
    const marks = new Set(child.marks.map((mark) => mark.type.name));
    if (marks.has("italic")) text = `<em>${text}</em>`;
    if (marks.has("bold")) text = `<strong>${text}</strong>`;
    if (marks.has("underline")) text = `<u>${text}</u>`;
    if (marks.has("strike")) text = `<s>${text}</s>`;
    html += text;
  });
  return html;
}

function pictureXhtml(picture: Node) {
  const name = escapeXml(String(picture.attrs["name"]));
  const caption = escapeXml(String(picture.attrs["caption"]));
  const size = escapeXml(String(picture.attrs["size"]));
  const figcaption = caption ? `<figcaption>${caption}</figcaption>` : "";
  return `<figure class="picture picture-${size}"><img src="../bilder/${name}" alt="${caption}" />${figcaption}</figure>`;
}

function block(node: Node, isFirst: boolean, typography: Typography, notes: SceneNotes): string {
  const name = node.type.name;
  if (name === "sceneBreak") return '<hr class="scene-break" />';
  if (name === "rawBlock") return `<p>${escapeXml(String(node.attrs["source"]))}</p>`;
  if (name === "picture") return pictureXhtml(node);
  if (name === "styleBlock") {
    const inner: string[] = [];
    node.forEach((child) => inner.push(block(child, true, typography, notes)));
    return `<div class="${escapeXml(String(node.attrs["style"]))}">${inner.join("\n")}</div>`;
  }
  const html = inline(node, quoteConverter(typography), notes);
  return isFirst ? `<p class="first">${html}</p>` : `<p>${html}</p>`;
}

export function sceneXhtml(doc: Node, typography: Typography, sceneId = "scen"): string {
  const notes: SceneNotes = { sceneId, texts: [] };
  const blocks: string[] = [];
  let isFirst = true;
  doc.forEach((node) => {
    blocks.push(block(node, isFirst, typography, notes));
    isFirst = node.type.name === "sceneBreak";
  });
  return [...blocks, ...noteAsides(notes)].join("\n");
}
