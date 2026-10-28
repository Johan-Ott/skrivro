import type { Image } from "mdast";
import type { Node } from "prosemirror-model";
import { PICTURE_SIZES, type PictureSize } from "./schema.js";

const FOLDER = "bilder/";

export interface PictureAttrs {
  name: string;
  caption: string;
  size: PictureSize;
}

// A plain file name in bilder/, so a text can never point outside the book's folder.
function nameIn(url: string) {
  if (!url.startsWith(FOLDER)) return null;
  const name = decodeURIComponent(url.slice(FOLDER.length));
  return /^[\w.-]+\.(png|jpe?g)$/i.test(name) ? name : null;
}

/** A paragraph that is a single image from bilder/ is a picture; any other image stays text. */
export function pictureOf(image: Image): PictureAttrs | null {
  const name = nameIn(image.url);
  if (!name) return null;
  const size = (PICTURE_SIZES as readonly string[]).includes(image.title ?? "")
    ? (image.title as PictureSize)
    : "bred";
  return { name, caption: image.alt ?? "", size };
}

// Square brackets in a caption would end the image's text, so they are left out.
const safeCaption = (caption: string) => caption.replace(/[[\]\n]/g, " ").trim();

/** ![caption](bilder/name.png), with the size as its title unless it is the usual one. */
export function pictureMarkdown(picture: Node): string {
  const { name, caption, size } = picture.attrs as PictureAttrs;
  const title = size === "bred" ? "" : ` "${size}"`;
  return `![${safeCaption(caption)}](${FOLDER}${encodeURI(name)}${title})`;
}

/** The names of every picture in these texts. */
export function picturesInDocs(docs: Iterable<Node>): string[] {
  const names: string[] = [];
  for (const doc of docs) {
    doc.descendants((node) => {
      if (node.type.name === "picture") names.push(String(node.attrs["name"]));
    });
  }
  return names;
}

/** The name of the first picture from bilder/ in a text as it is saved, such as a note's picture of
 * its place, for the card over the name. */
export function firstPictureIn(markdown: string): string | null {
  for (const [, url = ""] of markdown.matchAll(/!\[[^\]]*\]\(([^)\s]+)/g)) {
    const name = nameIn(url);
    if (name) return name;
  }
  return null;
}
