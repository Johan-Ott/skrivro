import { newSceneText, withField } from "../manuscript/sceneFile.js";
import { writeAtomic } from "@llkit/storage/atomicWrite.js";
import { joinPath, type FileSystem } from "@llkit/storage/fileSystem.js";
import { newSceneId, scenePath } from "../storage/sceneId.js";
import {
  findNode,
  isInTrash,
  manuscriptSceneIds,
  NOTES_ID,
  sceneIdsIn,
  sortsOf,
  type TreeNode,
} from "./tree.js";

// A research file, such as a PDF or a photo, is a note that points to its copy in the book's
// filer/ folder: it syncs and is backed up with the book, and the note holds the writer's words.

const FILES_DIR = "filer";

export const researchPath = (dir: string, name: string) => joinPath(joinPath(dir, FILES_DIR), name);

export const isPictureFile = (name: string) => /\.(jpe?g|png|gif|webp)$/i.test(name);

export const isPdfFile = (name: string) => /\.pdf$/i.test(name);

export const isDocxFile = (name: string) => /\.docx$/i.test(name);

export const isTextFile = (name: string) => /\.(txt|md|markdown|json|csv)$/i.test(name);

const splitName = (name: string) => {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ""];
};

const baseName = (path: string) => path.slice(path.lastIndexOf("/") + 1) || "fil";

const isSame = (first: Uint8Array, second: Uint8Array) =>
  first.length === second.length && first.every((byte, index) => byte === second[index]);

/** The note that already holds this very file, under its name and with the same bytes; null for
 * a new file, a new version under the same name, or a note thrown away. */
export async function sameFileNote(
  fileSystem: FileSystem,
  book: { dir: string; tree: TreeNode[]; summaries: Record<string, { file?: string }> },
  picked: { path: string; bytes: Uint8Array },
) {
  const { dir, tree, summaries } = book;
  const name = baseName(picked.path);
  const [id] =
    Object.entries(summaries).find(
      ([noteId, summary]) => summary.file === name && !isInTrash(tree, noteId),
    ) ?? [];
  if (!id) return null;
  const kept = await fileSystem.readBytes(researchPath(dir, name)).catch(() => null);
  return kept && isSame(kept, picked.bytes) ? id : null;
}

/** Under a free name, so a file already there is never replaced. Returns the name. */
export async function saveResearchFile(
  fileSystem: FileSystem,
  dir: string,
  path: string,
  bytes: Uint8Array,
) {
  const folder = joinPath(dir, FILES_DIR);
  await fileSystem.makeDir(folder);
  const taken = await fileSystem.list(folder);
  const original = baseName(path);
  const [stem, extension] = splitName(original);
  let name = original;
  for (let number = 2; taken.includes(name); number++) name = `${stem} ${number}${extension}`;
  await writeAtomic(fileSystem, researchPath(dir, name), bytes);
  return name;
}

/** A note named after the file, pointing to it. Returns the note's id. */
export async function createFileNote(fileSystem: FileSystem, dir: string, name: string) {
  const id = newSceneId();
  const text = withField(
    newSceneText(id, splitName(name)[0] ?? name),
    "file",
    JSON.stringify(name),
  );
  await fileSystem.makeDir(joinPath(dir, "scenes"));
  await writeAtomic(fileSystem, scenePath(dir, id), text);
  return id;
}

const isSourcesSort = (sort: TreeNode) => /^(källor|underlag)$/i.test(sort.title?.trim() ?? "");

// From a scene a file goes in Källor or Underlag, else Övrigt, and is linked to the scene, since no
// one names "brev.pdf" in the text.
export function placeForFile(tree: TreeNode[], sortId?: string, openSceneId?: string) {
  if (sortId) return { sortId };
  if (!openSceneId || !manuscriptSceneIds(tree).includes(openSceneId)) return { sortId: NOTES_ID };
  const sources = sortsOf(tree).find(isSourcesSort);
  return { sortId: sources?.id ?? NOTES_ID, addedIn: openSceneId };
}

/** The files added from a scene that are still among the notes, for I scenen. */
export const filesAddedIn = (tree: TreeNode[], sceneId: string) =>
  sortsOf(tree)
    .flatMap((sort) => sceneIdsIn(tree, sort.id))
    .filter((id) => findNode(tree, id)?.node.addedIn === sceneId);
