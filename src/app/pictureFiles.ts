import { readPictures, savePicture } from "../project/pictures.js";
import { platform } from "./platform.js";
import { t } from "../i18n/i18n.js";

const PICTURE = { name: t("Bild"), extensions: ["jpg", "jpeg", "png"] };

/** Asks for a picture and copies it into the book. Null if cancelled. */
export async function choosePicture(dir: string): Promise<string | null> {
  const picked = await platform.pickFile(PICTURE);
  return picked ? savePicture(platform.fileSystem, dir, picked.bytes) : null;
}

/** The bytes of one of the book's pictures, or null when it cannot be read. */
export const readBookPicture = async (dir: string, name: string) =>
  (await readPictures(platform.fileSystem, dir, [name])).get(name) ?? null;

// A picture's file never changes once saved, so its address is made once per session.
const urls = new Map<string, Promise<string | null>>();

/** An address for an <img>, or null when the picture cannot be read. */
export function pictureUrlIn(dir: string, name: string): Promise<string | null> {
  const key = `${dir}/${name}`;
  const known = urls.get(key);
  if (known) return known;
  const made = readPictures(platform.fileSystem, dir, [name]).then((found) => {
    const bytes = found.get(name);
    return bytes ? URL.createObjectURL(new Blob([bytes.slice()])) : null;
  });
  urls.set(key, made);
  return made;
}
