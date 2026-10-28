import { useEffect, useState, type DragEvent } from "react";
import type { TreeNode } from "../../project/tree.js";
import {
  dropMove,
  isRefusedDrop,
  type DropPosition,
  type TreeRow,
} from "../../project/treeRows.js";

interface DropTarget {
  id: string;
  position: DropPosition;
}

// The top and bottom quarter of a row drop before or after it; the middle drops inside it.
function positionInRow(event: DragEvent<HTMLElement>, node: TreeNode): DropPosition {
  const box = event.currentTarget.getBoundingClientRect();
  const offset = (event.clientY - box.top) / box.height;
  if (node.kind !== "scene" && offset > 0.25 && offset < 0.75) return "inside";
  return offset < 0.5 ? "before" : "after";
}

type Changes = { onChangeTree: (tree: TreeNode[]) => void; expand: (ids: string[]) => void };

// A drop the tree refuses, such as a scene onto Personer, leaves the row folded as it was.
function dropOn(
  tree: TreeNode[],
  { onChangeTree, expand }: Changes,
  draggedId: string,
  { row, position }: { row: TreeRow; position: DropPosition },
) {
  const moved = dropMove(tree, draggedId, row, position);
  if (moved === tree) return isRefusedDrop(tree, draggedId, row, position);
  onChangeTree(moved);
  if (position === "inside") expand([row.node.id]);
  return false;
}

const REFUSED_SHOWN_MS = 5000;

// A drop the tree refuses says so a moment, rather than nothing happening; each refused drop
// starts the moment anew.
function useRefused() {
  const [refusedAt, setRefusedAt] = useState<number | null>(null);
  useEffect(() => {
    if (refusedAt === null) return;
    const timer = setTimeout(() => setRefusedAt(null), REFUSED_SHOWN_MS);
    return () => clearTimeout(timer);
  }, [refusedAt]);
  const setRefused = (isRefused: boolean) => setRefusedAt(isRefused ? Date.now() : null);
  return { isRefused: refusedAt !== null, setRefused };
}

/** A drop only changes the tree, never a scene file; a folded chapter dropped into unfolds. */
export function useTreeDrag(tree: TreeNode[], changes: Changes) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const { isRefused, setRefused } = useRefused();
  const reset = () => (setDraggedId(null), setDropTarget(null));
  const rowDragProps = (row: TreeRow, isDraggable: boolean) => ({
    draggable: isDraggable,
    onDragStart: (event: DragEvent<HTMLElement>) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", row.node.id);
      setDraggedId(row.node.id);
    },
    onDragOver: (event: DragEvent<HTMLElement>) => {
      if (!draggedId || draggedId === row.node.id) return;
      event.preventDefault();
      setDropTarget({ id: row.node.id, position: positionInRow(event, row.node) });
    },
    onDrop: (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      if (draggedId && dropTarget)
        setRefused(dropOn(tree, changes, draggedId, { row, position: dropTarget.position }));
      reset();
    },
    onDragEnd: reset,
  });
  const dropHintFor = (id: string) => (dropTarget?.id === id ? dropTarget.position : null);
  return { rowDragProps, dropHintFor, draggedId, isRefused };
}
