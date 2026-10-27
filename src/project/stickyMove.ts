import { writeAtomic } from "@llkit/storage/atomicWrite.js";
import { joinPath, readIfThere, type FileSystem } from "@llkit/storage/fileSystem.js";
import { setAside } from "../storage/setAside.js";
import { scenePath } from "../storage/sceneId.js";
import { writeProjectFile } from "./projectFile.js";
import { STICKY_ID } from "./sorts.js";
import { newStickyNote, stickyNoteFileText, type StickyNote } from "./stickyNotes.js";
import { findNode, insertNode, withSpecialFolders, type TreeNode } from "./tree.js";

// Older books kept their lappar in lappar.json and kladdlapp.md. The first time such a book is
// opened each becomes a note in the sort Lappar, and the old files are set aside, not deleted.

const OLD_NOTES = "lappar.json";
const OLD_SCRATCH = "kladdlapp.md";
/** The same id every time, so a move that was stopped and is run again makes no second copy. */
const SCRATCH_ID = `01SCRATCH${"0".repeat(17)}`;

const isOldNote = (value: unknown): value is StickyNote =>
  typeof value === "object" && value !== null && typeof (value as StickyNote).id === "string";

// A field an old lapp lacks is filled in as a new lapp has it.
const completed = (note: StickyNote): StickyNote => ({
  ...newStickyNote({ left: note.left ?? 24, top: note.top ?? 24 }),
  ...note,
  text: typeof note.text === "string" ? note.text : "",
  strokes: Array.isArray(note.strokes) ? note.strokes : [],
});

async function oldNotes(fileSystem: FileSystem, dir: string) {
  const json = await readIfThere(fileSystem, joinPath(dir, OLD_NOTES));
  const scratch = await readIfThere(fileSystem, joinPath(dir, OLD_SCRATCH));
  if (json === null && scratch === null) return null;
  const parsed: unknown = json === null ? [] : JSON.parse(json);
  const notes = (Array.isArray(parsed) ? parsed.filter(isOldNote) : []).map(completed);
  const hasScratch = scratch !== null && scratch.trim() !== "";
  const scratchNote = {
    ...newStickyNote({ left: 24, top: 24 }),
    id: SCRATCH_ID,
    text: scratch ?? "",
  };
  return hasScratch ? [...notes, scratchNote] : notes;
}

/** Moves the old lappar into notes and returns the new tree; null when the book has none.
 * Nothing already a note is written over, and a stop halfway is made good the next time. */
export async function moveOldStickyNotes(
  fileSystem: FileSystem,
  dir: string,
  file: { fields: Record<string, unknown>; tree: TreeNode[] },
  sceneIds: string[],
): Promise<TreeNode[] | null> {
  const { fields } = file;
  // The sort Lappar may not be in an older project file yet; without it a lapp would land among the
  // scenes of the manuscript.
  const tree = withSpecialFolders(file.tree);
  const notes = await oldNotes(fileSystem, dir);
  if (notes === null) return null;
  // The tree first, so a note file that arrives is never taken for a scene of the manuscript.
  const inTree = notes.filter((note) => findNode(tree, note.id) === null);
  const moved = inTree.reduce(
    (current, note) =>
      insertNode(current, { id: note.id, kind: "scene" }, STICKY_ID, Number.MAX_SAFE_INTEGER),
    tree,
  );
  if (inTree.length > 0) await writeProjectFile(fileSystem, dir, fields, moved);
  await fileSystem.makeDir(joinPath(dir, "scenes"));
  for (const note of notes.filter((each) => !sceneIds.includes(each.id))) {
    await writeAtomic(fileSystem, scenePath(dir, note.id), stickyNoteFileText(note));
  }
  for (const name of [OLD_NOTES, OLD_SCRATCH]) {
    if ((await readIfThere(fileSystem, joinPath(dir, name))) !== null) {
      await setAside(fileSystem, dir, joinPath(dir, name), name);
    }
  }
  return moved;
}
