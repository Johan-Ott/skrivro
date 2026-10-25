import { useCallback } from "react";
import { noteQuestions } from "../../project/noteQuestions.js";
import { isLinkedByDefault } from "../../project/cards.js";
import { insertNode, NOTES_ID, type TreeNode } from "../../project/tree.js";
import { createFileNote, saveResearchFile } from "../../project/researchFiles.js";
import { newSceneId } from "../../storage/sceneId.js";
import { t } from "../../i18n/i18n.js";
import { platform } from "../platform.js";
import { createScene, openScene, setNoteLink, type SceneSession } from "../sceneSession.js";
import type { Project } from "../useProject.js";
import { earnBadge } from "../journey/journeyEvents.js";

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
}

function withSort(tree: TreeNode[], note: NewNote) {
  if (!note.newSortTitle) return { tree, sortId: note.sortId ?? "" };
  const sort: TreeNode = { id: newSceneId(), kind: "sort", title: note.newSortTitle, children: [] };
  return { tree: insertNode(tree, sort, null, 0), sortId: sort.id };
}

// A PDF, a photo or any other file the writer gathered, copied into the book as a note.
function useAddFile({ project, session, updateTree, refresh }: NoteActionsInput) {
  return useCallback(
    async (sortId: string = NOTES_ID) => {
      if (!project || project.isReadOnly) return;
      const picked = await platform.pickFile({ name: t("Alla filer"), extensions: [] });
      if (!picked) return;
      const { fileSystem } = platform;
      const name = await saveResearchFile(fileSystem, project.dir, picked.path, picked.bytes);
      const id = await createFileNote(fileSystem, project.dir, name);
      const note = { id, kind: "scene" as const };
      await updateTree(insertNode(project.tree, note, sortId, Number.MAX_SAFE_INTEGER));
      await refresh();
      await openScene(session, project.dir, id);
    },
    [project, session, updateTree, refresh],
  );
}

/** Only a link choice that differs from the sort's is written to the note. */
export function useNoteActions({ project, session, updateTree, refresh }: NoteActionsInput) {
  const newNote = useCallback(
    async (note: NewNote) => {
      if (!project || project.isReadOnly) return;
      const { tree, sortId } = withSort(project.tree, note);
      const body = note.body ?? noteQuestions(sortId);
      const id = await createScene(platform.fileSystem, project.dir, note.name, body);
      if (note.isLinked !== isLinkedByDefault(sortId)) {
        await setNoteLink(session, project.dir, id, note.isLinked);
      }
      await updateTree(insertNode(tree, { id, kind: "scene" }, sortId, Number.MAX_SAFE_INTEGER));
      await refresh();
      await openScene(session, project.dir, id);
      earnBadge("rollistan");
    },
    [project, session, updateTree, refresh],
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
