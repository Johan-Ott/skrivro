import { useCallback } from "react";
import { firstAnswerAsk, newNoteAsk } from "../../askOnce.js";
import { standardNoteBody } from "../../project/packs.js";
import { isLinkedByDefault } from "../../project/cards.js";
import { sortKey } from "../../project/sorts.js";
import { findNode, insertNode, type TreeNode } from "../../project/tree.js";
import {
  createFileNote,
  placeForFile,
  sameFileNote,
  saveResearchFile,
} from "../../project/researchFiles.js";
import { confirmInApp } from "../ConfirmLayer.js";
import { newSceneId } from "../../storage/sceneId.js";
import { t } from "../../i18n/i18n.js";
import { platform } from "../platform.js";
import { createScene, openScene, setNoteLink, type SceneSession } from "../sceneSession.js";
import type { Project } from "../useProject.js";

export interface NewNote {
  name: string;
  sortId: string | null;
  newSortTitle: string | null;
  isLinked: boolean;
  /** A pack's template the note starts from, instead of its sort's questions. */
  body: string | null;
}

interface NoteActionsInput {
  project: Project | null;
  session: SceneSession;
  updateTree: (tree: TreeNode[]) => Promise<void>;
  refresh: () => Promise<void>;
  focusEditor?: (() => void) | undefined;
}

function withSort(tree: TreeNode[], note: NewNote) {
  if (!note.newSortTitle) return { tree, sortId: note.sortId ?? "" };
  const sort: TreeNode = { id: newSceneId(), kind: "sort", title: note.newSortTitle, children: [] };
  return { tree: insertNode(tree, sort, null, 0), sortId: sort.id };
}

// The very same file added again is not made "Sjökort 2": the writer is asked to open the one there.
async function isAlreadyThere(
  project: Project,
  session: NoteActionsInput["session"],
  picked: { path: string; bytes: Uint8Array },
) {
  const id = await sameFileNote(platform.fileSystem, project, picked);
  if (!id) return false;
  const title = project.summaries[id]?.title ?? "";
  const isOpened = await confirmInApp({
    title: t("Filen finns redan"),
    message: t("”{title}” finns redan i boken. Vill du öppna den?", { title }),
    okLabel: t("Öppna"),
  });
  if (isOpened) await openScene(session, project.dir, id);
  return true;
}

// A PDF, a photo or any other file the writer gathered, copied into the book as a note, in the sort
// asked for or, from a scene, linked to it (placeForFile).
function useAddFile({ project, session, updateTree, refresh }: NoteActionsInput) {
  return useCallback(
    async (sortId?: string, openSceneId?: string) => {
      if (!project || project.isReadOnly) return;
      const picked = await platform.pickFile({ name: t("Alla filer"), extensions: [] });
      if (!picked || (await isAlreadyThere(project, session, picked))) return;
      const { fileSystem } = platform;
      const name = await saveResearchFile(fileSystem, project.dir, picked.path, picked.bytes);
      const id = await createFileNote(fileSystem, project.dir, name);
      const { sortId: home, addedIn } = placeForFile(project.tree, sortId, openSceneId);
      const note = { id, kind: "scene" as const, ...(addedIn ? { addedIn } : {}) };
      await updateTree(insertNode(project.tree, note, home, Number.MAX_SAFE_INTEGER));
      await refresh();
      await openScene(session, project.dir, id);
    },
    [project, session, updateTree, refresh],
  );
}

// A new note is opened with the caret in it, and a link choice that differs from the sort's is
// written to it.
async function createNote(input: NoteActionsInput, project: Project, note: NewNote) {
  const { session, updateTree, refresh, focusEditor } = input;
  const { tree, sortId } = withSort(project.tree, note);
  const sort = findNode(tree, sortId)?.node;
  const body = note.body ?? (sort ? standardNoteBody(project.fields, sortKey(sort)) : "");
  const id = await createScene(platform.fileSystem, project.dir, note.name, body);
  if (note.isLinked !== isLinkedByDefault(sortId)) {
    await setNoteLink(session, project.dir, id, note.isLinked);
  }
  await updateTree(insertNode(tree, { id, kind: "scene" }, sortId, Number.MAX_SAFE_INTEGER));
  await refresh();
  firstAnswerAsk.ask();
  newNoteAsk.ask();
  if (await openScene(session, project.dir, id)) focusEditor?.();
  else firstAnswerAsk.take();
}

/** Only a link choice that differs from the sort's is written to the note. */
export function useNoteActions({
  project,
  session,
  updateTree,
  refresh,
  focusEditor,
}: NoteActionsInput) {
  const newNote = useCallback(
    async (note: NewNote) => {
      if (!project || project.isReadOnly) return;
      await createNote({ project, session, updateTree, refresh, focusEditor }, project, note);
    },
    [project, session, updateTree, refresh, focusEditor],
  );
  const addFile = useAddFile({ project, session, updateTree, refresh });
  const setLink = useCallback(
    async (id: string, isLinked: boolean) => {
      if (!project) return;
      await setNoteLink(session, project.dir, id, isLinked);
      await refresh();
    },
    [project, session, refresh],
  );
  return { newNote, addFile, setLink };
}
