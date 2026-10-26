import { openScene, type SceneSession } from "../sceneSession.js";
import { findNode } from "../../project/tree.js";
import type { RefObject } from "react";
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
