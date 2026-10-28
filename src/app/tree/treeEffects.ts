import { useEffect, useRef } from "react";
import { ancestorIds, findNode, type TreeNode } from "../../project/tree.js";
import type { TreeViewProps, View } from "./useTreeView.js";
import { sectionOf, type useFoldedSections } from "./foldedSections.js";
import { newNoteAsk } from "../../askOnce.js";

type FoldedSections = ReturnType<typeof useFoldedSections>;

// What the tree does by itself: shows a node just made, its section unfolded, and the scene just
// opened.

export function useRenameRequest(props: TreeViewProps, view: View, folded: FoldedSections) {
  const { renameRequestId, project } = props;
  const { expand, setRenamingId } = view;
  const handledId = useRef<string | null>(null);
  const unfoldRef = useRef(folded.unfold);
  unfoldRef.current = folded.unfold;
  useEffect(() => {
    if (!renameRequestId || handledId.current === renameRequestId) return;
    // The tree may not hold the new node yet; the effect runs again when it does.
    if (!findNode(project.tree, renameRequestId)) return;
    handledId.current = renameRequestId;
    expand(ancestorIds(project.tree, renameRequestId));
    unfoldRef.current(sectionOf(project.tree, renameRequestId));
    setRenamingId(renameRequestId);
  }, [renameRequestId, project.tree, expand, setRenamingId]);
}

/** Unfolds the tree to the scene and scrolls its row into sight. */
function showInTree(tree: TreeNode[], sceneId: string, expand: View["expand"]) {
  expand(ancestorIds(tree, sceneId));
  requestAnimationFrame(() =>
    document
      .querySelectorAll(".tree-row.active")
      .forEach((row) => row.scrollIntoView({ block: "nearest" })),
  );
}

const rowOf = (nodeId: string) =>
  document.querySelector<HTMLElement>(`[data-node-id="${CSS.escape(nodeId)}"]`);

/** Marks the row like the open one, until the next click, and scrolls to it once it is drawn. */
export function showMovedRow(nodeId: string, markRow: (nodeId: string) => void) {
  markRow(nodeId);
  // After the closing menu has given focus back, and the tree has put the row in its new place.
  setTimeout(() => rowOf(nodeId)?.focus(), 150);
}

// While following, wherever a scene was opened from, the tree unfolds to it and shows it.
export function useFollowOpenScene(props: TreeViewProps, view: View, folded: FoldedSections) {
  const { openSceneId, project, isFollowingOpenScene = true } = props;
  const { expand } = view;
  const treeRef = useRef(project.tree);
  treeRef.current = project.tree;
  const unfoldRef = useRef(folded.unfold);
  unfoldRef.current = folded.unfold;
  useEffect(() => {
    if (!openSceneId) return;
    if (newNoteAsk.take()) unfoldRef.current(sectionOf(treeRef.current, openSceneId));
    if (isFollowingOpenScene) showInTree(treeRef.current, openSceneId, expand);
  }, [openSceneId, expand, isFollowingOpenScene]);
}
