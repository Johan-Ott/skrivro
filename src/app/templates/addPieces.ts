import { withAdditions, type Additions } from "../../project/pieceAdditions.js";
import { joinSorts, packNotesTree, type Pack } from "../../project/packs.js";
import { CHARACTERS_ID } from "../../project/sorts.js";
import { withSpecialFolders, type TreeNode } from "../../project/tree.js";
import { platform } from "../platform.js";
import { createScene } from "../sceneSession.js";
import type { Project } from "../useProject.js";
import { t } from "../../i18n/i18n.js";

export { additionsOf } from "../../project/pieceAdditions.js";

/** The book's tree and fields with the additions it does not have yet. */
export async function addToBook(project: Project, additions: Additions) {
  const newScene = () => createScene(platform.fileSystem, project.dir, t("Scen 1"));
  const sceneIds = await Promise.all(additions.chapters.map(newScene));
  return withAdditions(project, additions, sceneIds);
}

const isSort = (node: TreeNode) => node.kind === "sort" || node.id === CHARACTERS_ID;

/** A whole pack in a book that already exists: its pieces' notes and labels, and its guides and
 * templates, each in the sort of its name that the book has, or a new one. */
export async function addPackToBook(project: Project, pack: Pack) {
  const withPieces = await addToBook(project, {
    sorts: pack.pieces.flatMap((piece) => piece.sorts),
    labels: pack.pieces.flatMap((piece) => piece.labels),
    chapters: [],
  });
  const notes = await packNotesTree(platform.fileSystem, project.dir, [pack]);
  const people = withPieces.tree.find((node) => node.id === CHARACTERS_ID);
  const characters = {
    ...(people ?? { id: CHARACTERS_ID, kind: "sort" as const }),
    children: notes.characters,
  };
  const sorts = joinSorts([...withPieces.tree.filter(isSort), characters, ...notes.own]);
  const tree = withSpecialFolders([...withPieces.tree.filter((node) => !isSort(node)), ...sorts]);
  return { fields: withPieces.fields, tree };
}
