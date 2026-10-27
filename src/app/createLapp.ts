import { writeAtomic } from "@llkit/storage/atomicWrite.js";
import type { FileSystem } from "@llkit/storage/fileSystem.js";
import { STICKY_ID } from "../project/sorts.js";
import { newStickyNote, stickyNoteFileText, type StickyNote } from "../project/stickyNotes.js";
import { insertNode, type TreeNode } from "../project/tree.js";
import { scenePath } from "../storage/sceneId.js";
import { platform } from "./platform.js";
import type { AppState } from "./App.js";
import { openScene } from "./sceneSession.js";
import type { Project, TreeChanger } from "./useProject.js";

interface Book {
  fileSystem: FileSystem;
  dir: string;
  updateTree: (change: TreeChanger) => Promise<void>;
}

/** A new, empty lapp: its file is written first and then it is put last in the sort Lappar. */
export async function createLapp(
  book: Book,
  place: { left: number; top: number },
  color?: StickyNote["color"],
) {
  const note = newStickyNote(place, color);
  await writeAtomic(book.fileSystem, scenePath(book.dir, note.id), stickyNoteFileText(note));
  const lapp: TreeNode = { id: note.id, kind: "scene" };
  await book.updateTree((tree) => insertNode(tree, lapp, STICKY_ID, Number.MAX_SAFE_INTEGER));
  return note;
}

/** Ny lapp on a phone: an empty lapp is open in the text with the keyboard up, with no sort to
 * choose. */
export async function startLapp(
  app: Pick<AppState, "updateTree" | "refresh" | "session" | "editor">,
  project: Project,
) {
  if (project.isReadOnly) return;
  const { fileSystem } = platform;
  const book = { fileSystem, dir: project.dir, updateTree: app.updateTree };
  const note = await createLapp(book, { left: 24, top: 24 });
  await app.refresh();
  if (await openScene(app.session, project.dir, note.id)) app.editor.requestFocus();
}
