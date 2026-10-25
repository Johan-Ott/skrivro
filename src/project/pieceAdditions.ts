import { newSceneId } from "../storage/sceneId.js";
import type { BookParts } from "./bookSettings.js";
import { labelsOf } from "./labels.js";
import { templatePieces, type BookTemplate } from "./templates.js";
import { insertNode, type TreeNode } from "./tree.js";

// Pieces added to a book that already exists: what it lacks of their notes, labels and chapters.
// Mallar och bitar and `skrivro.mjs pieces` both add them through here.

export interface Additions {
  sorts: string[];
  labels: string[][];
  chapters: string[][];
}

/** The chosen pieces, and the notes and labels of an own template, as one set of additions. */
export function additionsOf(pieceIds: string[], own: BookTemplate | null): Additions {
  const pieces = templatePieces().filter((piece) => pieceIds.includes(piece.id));
  return {
    sorts: [...(own?.sorts ?? []), ...pieces.flatMap((piece) => piece.sorts)],
    labels: [...(own?.labels ?? []), ...pieces.flatMap((piece) => piece.labels)],
    chapters: pieces.flatMap((piece) => piece.chapters),
  };
}

/** Piece ids given apart or with commas, as a command line gives them; an unknown one is refused. */
export function pieceIdsFrom(given: string[]): string[] {
  const ids = given
    .flatMap((each) => each.split(","))
    .map((id) => id.trim())
    .filter(Boolean);
  const known = templatePieces().map((piece) => piece.id);
  if (ids.some((id) => !known.includes(id))) throw new Error(`Bitarna: ${known.join(", ")}.`);
  return ids;
}

function withNewLabels(fields: Record<string, unknown>, wanted: string[][]) {
  const current = labelsOf(fields);
  const names = new Set(current.map((label) => label.name));
  const added = wanted
    .filter(([name = ""]) => !names.has(name) && names.add(name))
    .map(([name = "", color = ""]) => ({ id: newSceneId(), name, color }));
  return added.length ? { ...fields, labels: [...current, ...added] } : fields;
}

const sortTitles = (tree: TreeNode[]) =>
  new Set(tree.filter((node) => node.kind === "sort").map((node) => node.title ?? ""));

const chapterTitles = (nodes: TreeNode[]): string[] =>
  nodes.flatMap((node) => [
    ...(node.kind === "chapter" ? [node.title ?? ""] : []),
    ...chapterTitles(node.children ?? []),
  ]);

/** The additions without the closing chapters the book already ends with, as after a second add. */
export const withoutChaptersIn = (tree: TreeNode[], additions: Additions): Additions => {
  const have = new Set(chapterTitles(tree));
  return { ...additions, chapters: additions.chapters.filter(([title = ""]) => !have.has(title)) };
};

/** The additions the book lacks; each closing chapter gets the scene the caller made for it. */
export function withAdditions(book: BookParts, additions: Additions, chapterSceneIds: string[]) {
  const have = sortTitles(book.tree);
  const sorts: TreeNode[] = [...new Set(additions.sorts)]
    .filter((title) => !have.has(title))
    .map((title) => ({ id: newSceneId(), kind: "sort", title, children: [] }));
  let tree = [...book.tree, ...sorts];
  additions.chapters.forEach(([title = "", summary = ""], index) => {
    const scene: TreeNode = { id: chapterSceneIds[index] ?? newSceneId(), kind: "scene" };
    const chapter: TreeNode = {
      id: newSceneId(),
      kind: "chapter",
      title,
      summary,
      children: [scene],
    };
    tree = insertNode(tree, chapter, null, Number.MAX_SAFE_INTEGER);
  });
  return { fields: withNewLabels(book.fields, additions.labels), tree };
}
