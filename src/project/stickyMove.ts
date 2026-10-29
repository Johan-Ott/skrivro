import { writeAtomic } from "@llkit/storage/atomicWrite.js";
import { joinPath, readIfThere, type FileSystem } from "@llkit/storage/fileSystem.js";
import { setAside } from "../storage/setAside.js";
import { scenePath } from "../storage/sceneId.js";
import { writeProjectFile } from "./projectFile.js";
import { NOTES_ID } from "./sorts.js";
import { findNode, insertNode, withSpecialFolders, type TreeNode } from "./tree.js";

// Older books kept their lappar in lappar.json and kladdlapp.md. The first time such a book is
// opened each becomes a note in Övrigt, and the old files are set aside, not deleted.

const OLD_NOTES = "lappar.json";
const OLD_SCRATCH = "kladdlapp.md";
/** The same id every time, so a move that was stopped and is run again makes no second copy. */
const SCRATCH_ID = `01SCRATCH${"0".repeat(17)}`;

interface OldNote {
  id: string;
  text: string;
}

const noteFile = (note: OldNote) => `---\nid: ${note.id}\n---\n${note.text}`;

const isOldNote = (value: unknown): value is { id: string; text?: unknown } =>
  typeof value === "object" && value !== null && typeof (value as OldNote).id === "string";

async function oldNotes(fileSystem: FileSystem, dir: string): Promise<OldNote[] | null> {
  const json = await readIfThere(fileSystem, joinPath(dir, OLD_NOTES));
  const scratch = await readIfThere(fileSystem, joinPath(dir, OLD_SCRATCH));
  if (json === null && scratch === null) return null;
  const parsed: unknown = json === null ? [] : JSON.parse(json);
  const notes = (Array.isArray(parsed) ? parsed.filter(isOldNote) : []).map((note) => ({
    id: note.id,
    text: typeof note.text === "string" ? note.text : "",
  }));
  const hasScratch = scratch !== null && scratch.trim() !== "";
  return hasScratch ? [...notes, { id: SCRATCH_ID, text: scratch }] : notes;
}

/** Moves the old lappar into notes and returns the new tree; null when the book has none.
 * Nothing already a note is written over, and a stop halfway is made good the next time. */
export async function moveOldStickyNotes(
  fileSystem: FileSystem,
  dir: string,
  file: { fields: Record<string, unknown>; tree: TreeNode[] },
  sceneIds: string[],
): Promise<TreeNode[] | null> {
  // Övrigt may be missing from an older project file, and the notes would land in the manuscript.
  const tree = withSpecialFolders(file.tree);
  const notes = await oldNotes(fileSystem, dir);
  if (notes === null) return null;
  // The tree first, so a note file that arrives is never taken for a scene of the manuscript.
  const inTree = notes.filter((note) => findNode(tree, note.id) === null);
  const moved = inTree.reduce(
    (current, note) =>
      insertNode(current, { id: note.id, kind: "scene" }, NOTES_ID, Number.MAX_SAFE_INTEGER),
    tree,
  );
  if (inTree.length > 0) await writeProjectFile(fileSystem, dir, file.fields, moved);
  await fileSystem.makeDir(joinPath(dir, "scenes"));
  for (const note of notes.filter((each) => !sceneIds.includes(each.id))) {
    await writeAtomic(fileSystem, scenePath(dir, note.id), noteFile(note));
  }
  for (const name of [OLD_NOTES, OLD_SCRATCH]) {
    if ((await readIfThere(fileSystem, joinPath(dir, name))) !== null) {
      await setAside(fileSystem, dir, joinPath(dir, name), name);
    }
  }
  return moved;
}
