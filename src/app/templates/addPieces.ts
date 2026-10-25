import { withAdditions, withoutChaptersIn, type Additions } from "../../project/pieceAdditions.js";
import {
  guidesOf,
  isPackInBook,
  joinSorts,
  packGuides,
  withPackNoted,
  type Pack,
} from "../../project/packs.js";
import { CHARACTERS_ID } from "../../project/sorts.js";
import { withSpecialFolders, type TreeNode } from "../../project/tree.js";
import { platform } from "../platform.js";
import { createScene } from "../sceneSession.js";
import type { Project } from "../useProject.js";
import type { ProjectChange } from "../labels/LabelsDialog.js";
import { t } from "../../i18n/i18n.js";

export { additionsOf } from "../../project/pieceAdditions.js";

/** The book's tree and fields with the additions it does not have yet. */
export async function addToBook(project: Project, wanted: Additions) {
  const additions = withoutChaptersIn(project.tree, wanted);
  const newScene = () => createScene(platform.fileSystem, project.dir, t("Scen 1"));
  const sceneIds = await Promise.all(additions.chapters.map(newScene));
  return withAdditions(project, additions, sceneIds);
}

const isSort = (node: TreeNode) => node.kind === "sort" || node.id === CHARACTERS_ID;

// The pack's guides the book has no note of the same name for, so nothing comes twice, also in a
// book from before the book noted its packs.
function guidesMissingIn(project: Project, pack: Pack) {
  const titles = new Set(Object.values(project.summaries).map((summary) => summary.title));
  return guidesOf(pack).filter((note) => !titles.has(note.title));
}

/** The book's packs for Genrepaket: which it has, and adding one. */
export const packsOfBook = (project: Project, save: (change: ProjectChange) => void) => ({
  has: (pack: Pack) =>
    isPackInBook(project.fields, pack) ||
    (guidesOf(pack).length > 0 && guidesMissingIn(project, pack).length === 0),
  add: async (pack: Pack) => save(await addPackToBook(project, pack)),
});

/** A whole pack in a book that already exists: its pieces' sorts and labels, and its guides. Its
 * templates are offered in Ny anteckning from then on. */
export async function addPackToBook(project: Project, pack: Pack) {
  if (isPackInBook(project.fields, pack)) return { fields: project.fields, tree: project.tree };
  const withPieces = await addToBook(project, {
    sorts: pack.pieces.flatMap((piece) => piece.sorts),
    labels: pack.pieces.flatMap((piece) => piece.labels),
    chapters: [],
  });
  const missing = { ...pack, notes: guidesMissingIn(project, pack) };
  const guides = await packGuides(platform.fileSystem, project.dir, [missing]);
  const sorts = joinSorts([...withPieces.tree.filter(isSort), ...guides]);
  const tree = withSpecialFolders([...withPieces.tree.filter((node) => !isSort(node)), ...sorts]);
  return { fields: withPackNoted(withPieces.fields, pack.id), tree };
}
