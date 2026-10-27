import type { FileSystem } from "@llkit/storage/fileSystem.js";
import { placeholdersIn, wordsBefore } from "../manuscript/placeholders.js";
import { readSceneBodies } from "./sceneSummaries.js";

export interface PlaceholderTask {
  sceneId: string;
  /** The placeholder as written, such as `[? check the train's name]`. */
  text: string;
  /** The words just before it, to see where in the scene it stands. */
  before: string;
}

const MARKS = /[*_]/g;

/** The placeholders in one scene's text, in their order. */
export const placeholdersOf = (sceneId: string, body: string): PlaceholderTask[] =>
  placeholdersIn(body).map(({ from, text }) => ({
    sceneId,
    text,
    before: wordsBefore(body, from).replace(MARKS, ""),
  }));

/** Every placeholder in the given scenes, in their order, read from the files on disk. */
export async function bookPlaceholders(fileSystem: FileSystem, dir: string, sceneIds: string[]) {
  const bodies = await readSceneBodies(
    fileSystem,
    sceneIds.map((id) => ({ dir, id })),
  );
  return sceneIds.flatMap((sceneId) => placeholdersOf(sceneId, bodies[sceneId] ?? ""));
}
