import { writeAtomic } from "@llkit/storage/atomicWrite.js";
import type { FileSystem } from "@llkit/storage/fileSystem.js";
import { NOTES_ID } from "../project/sorts.js";
import { insertNode } from "../project/tree.js";
import { newSceneId, scenePath } from "../storage/sceneId.js";
import { platform } from "./platform.js";
import type { AppState } from "./App.js";
import { openScene } from "./sceneSession.js";
import type { Project, TreeChanger } from "./useProject.js";

interface Book {
  fileSystem: FileSystem;
  dir: string;
  updateTree: (change: TreeChanger) => Promise<void>;
}

/** A new, empty note without a name: its file is written first and then it is put last in Övrigt.
 * It is named by its first line. */
export async function createQuickNote(book: Book) {
  const id = newSceneId();
  await writeAtomic(book.fileSystem, scenePath(book.dir, id), `---\nid: ${id}\n---\n`);
  await book.updateTree((tree) =>
    insertNode(tree, { id, kind: "scene" }, NOTES_ID, Number.MAX_SAFE_INTEGER),
  );
  return id;
}

/** Anteckna on a phone: an empty note is open with the keyboard up, with no sort to choose. */
export async function startQuickNote(
  app: Pick<AppState, "updateTree" | "refresh" | "session" | "editor">,
  project: Project,
) {
  if (project.isReadOnly) return;
  const { fileSystem } = platform;
  const id = await createQuickNote({ fileSystem, dir: project.dir, updateTree: app.updateTree });
  await app.refresh();
  if (await openScene(app.session, project.dir, id)) app.editor.requestFocus();
}
