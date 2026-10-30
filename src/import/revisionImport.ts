import JSZip from "jszip";
import { documentText, LEAF } from "../editor/documentText.js";
import { LETTER_ID } from "../export/letterPage.js";
import { sceneEndMark } from "../export/sceneMarks.js";
import { parseMarkdown } from "../manuscript/parseMarkdown.js";
import { decode } from "./docxComments.js";
import { docxHtml, htmlToMarkdown } from "./docxImport.js";

const START = /<a id="skrivro_([0-9A-Z]+)"><\/a>/g;
// Word's footnote references stand where Skrivro has its own footnotes, so they count as the same.
const FOOTNOTE = /<sup><a href="#footnote-\d+" id="footnote-ref-\d+">\[\d+\]<\/a><\/sup>/g;

/** What an editor's Word file brings back. */
export interface EditorsFile {
  /** Each scene's text, by scene id. */
  texts: Map<string, string>;
  /** The editor's letter on the first page, as Markdown; null when the file has no such page. */
  letter: string | null;
  /** When Skrivro made the file; 0 when the file does not say. */
  sentAt: number;
  /** Who saved the file or wrote its comments, when it was not the writer; "" when unknown. */
  editor: string;
}

/** The text between a scene's two marks, in the form the comparison reads. */
function sceneText(html: string) {
  const markdown = htmlToMarkdown(`<p>${html.replace(FOOTNOTE, LEAF)}</p>`);
  return documentText(parseMarkdown(markdown)).text;
}

// What stands between each pair of marks, by the id in them; a pair the editor broke is left out.
function markedParts(html: string) {
  const parts = new Map<string, string>();
  for (const found of html.matchAll(START)) {
    const id = found[1] ?? "";
    const start = (found.index ?? 0) + found[0].length;
    const end = html.indexOf(`<a id="${sceneEndMark(id)}"></a>`, start);
    if (end !== -1 && id) parts.set(id, html.slice(start, end));
  }
  return parts;
}

const textsIn = (parts: Map<string, string>) =>
  new Map([...parts].filter(([id]) => id !== LETTER_ID).map(([id, part]) => [id, sceneText(part)]));

// The first one named, of who saved the file last and who wrote its comments, that is not the
// writer Skrivro put in as its maker.
async function aboutFile(docx: Uint8Array) {
  const zip = await JSZip.loadAsync(docx);
  const core = (await zip.file("docProps/core.xml")?.async("string")) ?? "";
  const comments = (await zip.file("word/comments.xml")?.async("string")) ?? "";
  const field = (name: string) =>
    decode(new RegExp(`<${name}[^>]*>([^<]*)</${name}>`).exec(core)?.[1] ?? "");
  const writer = field("dc:creator");
  const authors = [...comments.matchAll(/w:author="([^"]*)"/g)].map((found) => found[1] ?? "");
  const names = [field("cp:lastModifiedBy"), ...authors.map(decode)];
  const created = Date.parse(field("dcterms:created"));
  return {
    sentAt: Number.isNaN(created) ? 0 : created,
    editor: names.find((name) => name.trim() && name !== writer && name !== "Un-named") ?? "",
  };
}

/** A Word file made by Skrivro has marks around every scene and around the letter's room. */
export async function editorsFile(docx: Uint8Array): Promise<EditorsFile> {
  const parts = markedParts(await docxHtml(docx));
  const letter = parts.get(LETTER_ID);
  return {
    texts: textsIn(parts),
    letter: letter === undefined ? null : htmlToMarkdown(`<p>${letter}</p>`).trim(),
    ...(await aboutFile(docx)),
  };
}
