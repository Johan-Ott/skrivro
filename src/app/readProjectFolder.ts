import { recordFailure } from "@llkit/errorLog.js";
import { readProjectFile } from "../project/projectFile.js";
import { moveOldStickyNotes } from "../project/stickyMove.js";
import { openProjectFolder } from "../storage/projectFolder.js";
import { platform } from "./platform.js";

/** The folder and its project file. Opening a book also turns an older book's lappar into notes;
 * if that fails they stay as they were, to be tried again, and the book opens all the same. */
export async function readProjectFolder(dir: string, isOpening: boolean) {
  const { fileSystem } = platform;
  const listing = await openProjectFolder(fileSystem, dir);
  const file = await readProjectFile(fileSystem, dir, listing.scenes, isOpening);
  if (!isOpening || file.isNewerFormat) return { listing, file };
  const moved = await moveOldStickyNotes(fileSystem, dir, file, listing.scenes).catch(
    (error: unknown) => {
      recordFailure("Lapparna kunde inte flyttas")(error);
      return null;
    },
  );
  if (!moved) return { listing, file };
  return { listing: await openProjectFolder(fileSystem, dir), file: { ...file, tree: moved } };
}
