import { joinSceneFile, newSceneText, splitSceneFile } from "../manuscript/sceneFile.js";
import { writeAtomic } from "@llkit/storage/atomicWrite.js";
import { joinPath, type FileSystem } from "@llkit/storage/fileSystem.js";
import { openProjectFolder } from "../storage/projectFolder.js";
import { newSceneId, scenePath } from "../storage/sceneId.js";
import type { BookParts } from "./bookSettings.js";
import { noteIdsOf } from "./cards.js";
import { readProjectFile, writeProjectFile } from "./projectFile.js";
import { readSceneSummaries } from "./sceneSummaries.js";
import { reconcileScenes, type TreeNode } from "./tree.js";

// Reading and writing a book's folder for the calls in bookFiles.ts; docs/format.md describes it.

export type BookFolder = { fileSystem: FileSystem; dir: string };

async function readFile({ fileSystem, dir }: BookFolder) {
  const listing = await openProjectFolder(fileSystem, dir);
  const file = await readProjectFile(fileSystem, dir, listing.scenes);
  if (file.isNewerFormat) throw new Error("Boken är sparad av en nyare Skrivro och läses bara.");
  return { file, scenes: listing.scenes };
}

export async function readBook(book: BookFolder) {
  const { file, scenes } = await readFile(book);
  const { tree } = reconcileScenes(file.tree, scenes);
  const noteIds = noteIdsOf(tree);
  const summaries = await readSceneSummaries(book.fileSystem, book.dir, scenes, { noteIds });
  return { fields: file.fields, tree, summaries };
}

// From the tree as project.json has it: a scene file just written, not yet in the tree, would
// otherwise be found as a loose scene and placed twice.
export async function changeProject(book: BookFolder, change: (parts: BookParts) => BookParts) {
  const { file } = await readFile(book);
  const changed = change({ fields: file.fields, tree: file.tree });
  await writeProjectFile(book.fileSystem, book.dir, changed.fields, changed.tree);
}

export const changeTree = (book: BookFolder, change: (tree: TreeNode[]) => TreeNode[]) =>
  changeProject(book, ({ fields, tree }) => ({ fields, tree: change(tree) }));

export type SceneParts = { frontMatter: string; body: string };

/** A scene's file is its front matter, between --- lines, and its text in Markdown. */
export async function changeScene(
  book: BookFolder,
  id: string,
  change: (parts: SceneParts) => SceneParts,
) {
  const path = scenePath(book.dir, id);
  const parts = splitSceneFile(await book.fileSystem.readText(path));
  await writeAtomic(book.fileSystem, path, joinSceneFile(change(parts)));
}

export async function newScene(book: BookFolder, title: string) {
  const id = newSceneId();
  await book.fileSystem.makeDir(joinPath(book.dir, "scenes"));
  await writeAtomic(book.fileSystem, scenePath(book.dir, id), newSceneText(id, title));
  return id;
}
