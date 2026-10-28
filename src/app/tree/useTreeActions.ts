import type { KeyboardEvent } from "react";
import {
  findNode,
  isInTrash,
  TRASH_ID,
  moveNode,
  moveToTrash,
  putBack,
  sceneIdsIn,
  type TreeNode,
} from "../../project/tree.js";
import { renameNode } from "../../project/nodeFields.js";
import type { TreeRow } from "../../project/treeRows.js";

export interface TreeActionHandlers {
  tree: TreeNode[];
  onChangeTree: (tree: TreeNode[]) => void;
  onOpenScene: (id: string) => void;
  onRenameScene: (id: string, title: string) => void;
  toggle: (id: string) => void;
  expand: (ids: string[]) => void;
  startRename: (id: string) => void;
}

/** Everything here changes project.json only, except a scene's title. */
export function useTreeActions(handlers: TreeActionHandlers) {
  const { tree, onChangeTree } = handlers;
  const canEdit = (node: TreeNode) => node.id !== TRASH_ID;
  const actions = {
    canEdit,
    isInTrash: (id: string) => isInTrash(tree, id),
    activate: (node: TreeNode) => {
      // A chapter opens at its first scene; its arrow folds it.
      const first = node.kind === "chapter" ? sceneIdsIn(tree, node.id)[0] : undefined;
      if (!first)
        return node.kind === "scene" ? handlers.onOpenScene(node.id) : handlers.toggle(node.id);
      handlers.expand([node.id]);
      handlers.onOpenScene(first);
    },
    rename: (node: TreeNode, title: string) =>
      node.kind === "scene"
        ? handlers.onRenameScene(node.id, title)
        : onChangeTree(renameNode(tree, node.id, title)),
    trash: (node: TreeNode) => {
      if (canEdit(node) && !isInTrash(tree, node.id)) onChangeTree(moveToTrash(tree, node.id));
    },
    restore: (node: TreeNode) => onChangeTree(putBack(tree, node.id)),
    // The place in the book itself, which a filtered tree's rows do not show.
    moveBy: (row: TreeRow, step: 1 | -1) => {
      const index = findNode(tree, row.node.id)?.index ?? row.index;
      onChangeTree(moveNode(tree, row.node.id, row.parentId, Math.max(0, index + step)));
    },
    startRename: (node: TreeNode) => canEdit(node) && handlers.startRename(node.id),
  };
  return { ...actions, onKeyDown: treeKeyHandler(actions) };
}

interface RowActions {
  activate(node: TreeNode): void;
  startRename(node: TreeNode): void;
  trash(node: TreeNode): void;
  canEdit(node: TreeNode): boolean;
  moveBy(row: TreeRow, step: 1 | -1): void;
}

function focusSibling(element: HTMLElement, direction: 1 | -1) {
  const tree = element.closest("[role=tree]");
  const rows = tree ? Array.from(tree.querySelectorAll<HTMLElement>("[role=treeitem]")) : [];
  rows[rows.indexOf(element) + direction]?.focus();
}

function treeKeyHandler(actions: RowActions) {
  const keys = new Map<string, (row: TreeRow, element: HTMLElement) => void>([
    ["Enter", (row) => actions.activate(row.node)],
    ["F2", (row) => actions.startRename(row.node)],
    ["Delete", (row) => actions.trash(row.node)],
    ["ArrowUp", (_row, element) => focusSibling(element, -1)],
    ["ArrowDown", (_row, element) => focusSibling(element, 1)],
    ["Alt+ArrowUp", (row) => actions.canEdit(row.node) && actions.moveBy(row, -1)],
    ["Alt+ArrowDown", (row) => actions.canEdit(row.node) && actions.moveBy(row, 1)],
  ]);
  return (row: TreeRow, event: KeyboardEvent<HTMLElement>) => {
    const action = keys.get((event.altKey ? "Alt+" : "") + event.key);
    if (!action) return;
    event.preventDefault();
    action(row, event.currentTarget);
  };
}
