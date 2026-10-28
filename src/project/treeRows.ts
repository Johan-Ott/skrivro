import {
  findNode,
  moveNode,
  moveToTrash,
  TRASH_ID,
  type FoundNode,
  type TreeNode,
} from "./tree.js";
import { isNoteSide, isSpecial } from "./sorts.js";

export interface TreeRow {
  node: TreeNode;
  depth: number;
  parentId: string | null;
  index: number;
}

/** The inside of a collapsed node is left out. */
export function visibleRows(
  tree: TreeNode[],
  collapsed: ReadonlySet<string>,
  depth = 0,
  parentId: string | null = null,
): TreeRow[] {
  return tree.flatMap((node, index) => [
    { node, depth, parentId, index },
    ...(collapsed.has(node.id)
      ? []
      : visibleRows(node.children ?? [], collapsed, depth + 1, node.id)),
  ]);
}

export type DropPosition = "before" | "after" | "inside";

/** Indexes count after the dragged node is taken out. */
// Which part of the tree a node is in: the book, the notes or Papperskorg.
function sideOf(tree: TreeNode[], id: string | null) {
  const top = tree.find((node) => node.id === id || findNode(node.children ?? [], id ?? ""));
  if (!top || !isNoteSide(top)) return "book";
  return top.id === TRASH_ID ? "trash" : "notes";
}

const sidesOf = (tree: TreeNode[], draggedId: string, row: TreeRow, position: DropPosition) => ({
  from: sideOf(tree, draggedId),
  into: sideOf(tree, position === "inside" ? row.node.id : row.parentId),
});

/** A scene of the book does not turn into a note by a drag: the tree says so, and moves nothing. */
export function isRefusedDrop(
  tree: TreeNode[],
  draggedId: string,
  row: TreeRow,
  position: DropPosition,
) {
  const { from, into } = sidesOf(tree, draggedId, row, position);
  return from === "book" && into === "notes";
}

// One dropped in Papperskorg remembers where it was. Null for an ordinary move.
function acrossSides(tree: TreeNode[], draggedId: string, row: TreeRow, position: DropPosition) {
  if (isRefusedDrop(tree, draggedId, row, position)) return tree;
  const { from, into } = sidesOf(tree, draggedId, row, position);
  return from !== "trash" && into === "trash" ? moveToTrash(tree, draggedId) : null;
}

export function dropMove(
  tree: TreeNode[],
  draggedId: string,
  row: TreeRow,
  position: DropPosition,
) {
  const dragged = findNode(tree, draggedId);
  if (!dragged) return tree;
  return acrossSides(tree, draggedId, row, position) ?? moveTo(tree, dragged, row, position);
}

function moveTo(tree: TreeNode[], dragged: FoundNode, row: TreeRow, position: DropPosition) {
  if (position === "inside") return dropInside(tree, dragged, row);
  const isSameParent = (dragged.parent?.id ?? null) === row.parentId;
  const shift = isSameParent && dragged.index < row.index ? 1 : 0;
  const index = row.index + (position === "after" ? 1 : 0) - shift;
  return moveNode(tree, dragged.node.id, row.parentId, index);
}

function dropInside(tree: TreeNode[], dragged: FoundNode, row: TreeRow) {
  const childCount = row.node.children?.length ?? 0;
  const isAlreadyInside = dragged.parent?.id === row.node.id;
  return moveNode(tree, dragged.node.id, row.node.id, childCount - (isAlreadyInside ? 1 : 0));
}

export function sidebarSections(rows: TreeRow[]) {
  const sections = { book: [] as TreeRow[], notes: [] as TreeRow[], trash: [] as TreeRow[] };
  let section = sections.book;
  for (const row of rows) {
    if (row.depth === 0) {
      if (row.node.kind === "sort") section = sections.notes;
      else if (row.node.id === TRASH_ID) section = sections.trash;
      else section = sections.book;
    }
    section.push(row);
  }
  return sections;
}

const isEmptySortRow = (row: TreeRow) =>
  row.node.kind === "sort" && (row.node.children ?? []).length === 0;

export const withoutEmptySorts = (rows: TreeRow[]) => rows.filter((row) => !isEmptySortRow(row));

/** Skrivro's own sorts wait until they hold a note; one the writer or a template added shows. */
export const withoutEmptyFixedSorts = (rows: TreeRow[]) =>
  rows.filter((row) => !(isEmptySortRow(row) && isSpecial(row.node.id)));

/** Every part, chapter or folder that has something to fold away. */
export const foldableIds = (nodes: TreeNode[]): string[] =>
  nodes.flatMap((node) => (node.children?.length ? [node.id, ...foldableIds(node.children)] : []));

export const chapterIds = (nodes: TreeNode[]): string[] =>
  nodes.flatMap((node) => [
    ...(node.kind === "chapter" ? [node.id] : []),
    ...chapterIds(node.children ?? []),
  ]);
