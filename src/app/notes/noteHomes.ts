import { recordFailure } from "@llkit/errorLog.js";
import { useCallback, type RefObject } from "react";
import { cleanNotesMadeScenes, notesMadeScenes } from "../../project/noteToScene.js";
import { findNode, type TreeNode } from "../../project/tree.js";
import { checkDisk, openScene, type SceneSession } from "../sceneSession.js";
import type { Project } from "../useProject.js";

/** The series first, so a note there wins over one with the same id in the book. */
export const homesOf = (book: Project, series: Project | null) =>
  series ? [series, book] : [book];

/** A note may hold template questions, a scene never. One of the series, in its own folder, is a
 * note whatever the book's tree says. */
export function setNoteLookup(session: SceneSession, bookRef: RefObject<Project | null>) {
  session.isNote = (dir, id) => {
    const book = bookRef.current;
    return book !== null && (dir !== book.dir || findNode(book.tree, id)?.parent?.kind === "sort");
  };
}

export function openInHome(session: SceneSession, homes: Project[], id: string) {
  const home = homes.find((candidate) => candidate.scenes.includes(id));
  if (home) void openScene(session, home.dir, id);
}

export type TreeChange = { before: TreeNode[]; after: TreeNode[] };

// An open note is saved first, or the cleaning writes its old text over the writer's last words.
// It runs beside the write of project.json, which it does not depend on.
export async function settleMovedNotes(session: SceneSession, dir: string, trees: TreeChange) {
  const ids = notesMadeScenes(trees.before, trees.after);
  if (ids.length === 0) return;
  const open = session.scene;
  if (open?.dir === dir && ids.includes(open.id)) await session.autosave.flush();
  await cleanNotesMadeScenes(session.fileSystem, dir, ids);
  await checkDisk(session);
}

/** For `useProject`: what to do when the tree changes. */
export const useMovedNotes = (session: SceneSession) =>
  useCallback(
    (dir: string, trees: TreeChange) =>
      void settleMovedNotes(session, dir, trees).catch(
        recordFailure("En anteckning kunde inte rensas på frågor"),
      ),
    [session],
  );
