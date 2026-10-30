import JSZip from "jszip";
import { anchorAt, type Anchor } from "../project/comments.js";

// The comments a reader or an editor wrote in a Word manuscript made by Skrivro, each with the
// scene it stands in and the words it is on. Word, Google Docs, LibreOffice and Pages all keep them.

export interface WordComment extends Anchor {
  sceneId: string;
  body: string;
  author: string;
}

const ENTITIES = new Map([
  ["amp", "&"],
  ["lt", "<"],
  ["gt", ">"],
  ["quot", '"'],
  ["apos", "'"],
]);
export const decode = (text: string) =>
  text.replace(/&(amp|lt|gt|quot|apos);/g, (_all, name: string) => ENTITIES.get(name) ?? "");

const TEXT = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g;

/** Each comment's text and author, by its id in the file. */
function commentBodies(xml: string) {
  const bodies = new Map<string, { body: string; author: string }>();
  for (const found of xml.matchAll(/<w:comment\s([^>]*)>([\s\S]*?)<\/w:comment>/g)) {
    const attributes = found[1] ?? "";
    const id = /w:id="([^"]+)"/.exec(attributes)?.[1] ?? "";
    const author = decode(/w:author="([^"]*)"/.exec(attributes)?.[1] ?? "");
    const paragraphs = (found[2] ?? "")
      .split(/<\/w:p>/)
      .map((paragraph) =>
        [...paragraph.matchAll(TEXT)].map((part) => decode(part[1] ?? "")).join(""),
      );
    bodies.set(id, { body: paragraphs.filter(Boolean).join("\n"), author });
  }
  return bodies;
}

const TOKEN =
  /<w:bookmarkStart[^>]*w:name="skrivro_([0-9A-Z]+)"|<w:commentRangeStart[^>]*w:id="([^"]+)"|<w:commentRangeEnd[^>]*w:id="([^"]+)"|<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|(<\/w:p>)/g;

type Range = { sceneId: string; from: number; to: number };
type Walk = { scene: string; texts: Map<string, string>; ranges: Map<string, Range> };

const textSoFar = (walk: Walk) => walk.texts.get(walk.scene) ?? "";

// A comment opens and closes at the length the scene's text has reached.
function mark(walk: Walk, open: string | undefined, close: string | undefined) {
  const offset = textSoFar(walk).length;
  if (open && walk.scene) walk.ranges.set(open, { sceneId: walk.scene, from: offset, to: offset });
  const range = close ? walk.ranges.get(close) : undefined;
  if (range) range.to = offset;
}

// One walk through the text: which scene each comment is in, and where in that scene's text.
function commentRanges(xml: string) {
  const walk: Walk = { scene: "", texts: new Map(), ranges: new Map() };
  for (const [, start, open, close, words, paragraphEnd] of xml.matchAll(TOKEN)) {
    if (start) {
      walk.scene = start;
      walk.texts.set(start, "");
    } else if (open || close) mark(walk, open, close);
    else if (walk.scene) {
      walk.texts.set(walk.scene, textSoFar(walk) + (paragraphEnd ? "\n" : decode(words ?? "")));
    }
  }
  return walk;
}

/** The file's comments in the scenes Skrivro marked; none when it has no comments. */
export async function docxComments(docx: Uint8Array): Promise<WordComment[]> {
  const zip = await JSZip.loadAsync(docx);
  const commentsXml = await zip.file("word/comments.xml")?.async("string");
  const documentXml = await zip.file("word/document.xml")?.async("string");
  if (!commentsXml || !documentXml) return [];
  const bodies = commentBodies(commentsXml);
  const { texts, ranges } = commentRanges(documentXml);
  return [...ranges].flatMap(([id, range]) => {
    const comment = bodies.get(id);
    const text = texts.get(range.sceneId) ?? "";
    if (!comment?.body) return [];
    return [{ sceneId: range.sceneId, ...comment, ...anchorAt(text, range.from, range.to) }];
  });
}
