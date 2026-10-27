import { findNode, insertNode, isInTrash, type TreeNode } from "../project/tree.js";

/** The copy a "Behåll båda" makes stands right after the scene it is a copy of; when that scene
 * is in Papperskorg the copy is left unplaced, as it would be put back to the wrong place. */
export function placeCopyAfter(tree: TreeNode[], originalId: string, copyId: string) {
  const original = findNode(tree, originalId);
  if (!original || isInTrash(tree, originalId)) return tree;
  return insertNode(
    tree,
    { id: copyId, kind: "scene" },
    original.parent?.id ?? null,
    original.index + 1,
  );
}
