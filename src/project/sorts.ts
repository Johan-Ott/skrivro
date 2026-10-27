import type { TreeNode } from "./tree.js";

// The sorts that hold notes, Papperskorg, and how a book's tree keeps them.

const contains = (nodes: TreeNode[], id: string): boolean =>
  nodes.some((node) => node.id === id || contains(node.children ?? [], id));

export const CHARACTERS_ID = "karaktarer";
export const PLACES_ID = "platser";
export const THINGS_ID = "saker";
/** Övrigt: notes whose names are not linked in the text unless the writer asks. */
export const NOTES_ID = "anteckningar";
/** Lappar: each a note, drawn on or written in, shown over the text on a computer. */
export const STICKY_ID = "lappar";
/** Hemligheter: what the reader and the people learn, and when. */
export const SECRETS_ID = "hemligheter";
export const TRASH_ID = "trash";

// Notes are scene files kept in sorts, so they are written, moved and trashed like any scene.
const FIXED_SORTS: { id: string; kind: "sort"; title: string }[] = [
  { id: CHARACTERS_ID, kind: "sort", title: "Personer" },
  { id: PLACES_ID, kind: "sort", title: "Platser" },
  { id: THINGS_ID, kind: "sort", title: "Saker" },
  { id: NOTES_ID, kind: "sort", title: "Övrigt" },
  { id: STICKY_ID, kind: "sort", title: "Lappar" },
  { id: SECRETS_ID, kind: "sort", title: "Hemligheter" },
];
const TRASH: TreeNode = { id: TRASH_ID, kind: "folder", title: "Papperskorg" };

// Older projects had these as fixed folders; with texts in them they become sorts.
const RETIRED_FOLDERS = ["tidslinje", "research"];

export const isSpecial = (id: string) =>
  id === TRASH_ID || FIXED_SORTS.some((sort) => sort.id === id);
/** What a sort's templates are kept under: Personer and the other fixed sorts by id, a sort of the
 * writer's by its name. */
export const sortKey = (sort: TreeNode) => (isSpecial(sort.id) ? sort.id : (sort.title ?? ""));

export const isNoteSide = (node: TreeNode) =>
  node.kind === "sort" || node.id === TRASH_ID || RETIRED_FOLDERS.includes(node.id);

// A fixed sort keeps its default name unsaid, so it reads in the interface's language.
function asSort(node: TreeNode): TreeNode {
  const fixed = FIXED_SORTS.find((sort) => sort.id === node.id);
  const { title, ...rest } = node;
  // An old fixed folder's name ("Karaktärer") is not the writer's own.
  const isOwnName =
    title !== undefined && title !== fixed?.title && !(fixed && node.kind !== "sort");
  return { ...rest, kind: "sort", ...(isOwnName ? { title } : {}) };
}

const isFixed = (id: string) => FIXED_SORTS.some((sort) => sort.id === id);

// A fixed sort the book lacks goes in right after the fixed sort before it, or first.
function withMissing(sorts: TreeNode[], missing: TreeNode[]) {
  const result = [...sorts];
  for (const sort of missing) {
    const before = FIXED_SORTS.slice(
      0,
      FIXED_SORTS.findIndex((fixed) => fixed.id === sort.id),
    );
    const place = Math.max(
      ...before.map((fixed) => result.findIndex((node) => node.id === fixed.id)),
    );
    result.splice(place + 1, 0, sort);
  }
  return result;
}

/** The sorts in the writer's order; a fixed sort in Papperskorg stays there. */
export function withSpecialFolders(tree: TreeNode[]): TreeNode[] {
  const ordinary = tree.filter((node) => !isNoteSide(node) && !isSpecial(node.id));
  const trash = tree.find((node) => node.id === TRASH_ID) ?? { ...TRASH, children: [] };
  const sorts = tree
    .filter((node) => (isNoteSide(node) || isFixed(node.id)) && node.id !== TRASH_ID)
    .filter((node) => node.kind === "sort" || isFixed(node.id) || (node.children ?? []).length > 0)
    .map(asSort);
  const missing = FIXED_SORTS.filter(
    (sort) => !contains(tree, sort.id) && !contains(trash.children ?? [], sort.id),
  ).map((sort) => asSort({ ...sort, children: [] }));
  return [...ordinary, ...withMissing(sorts, missing), trash];
}
