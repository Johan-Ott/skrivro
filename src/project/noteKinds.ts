import { isPictureFile } from "./researchFiles.js";
import type { SceneSummary } from "./sceneSummaries.js";
import { GUIDE } from "./packs.js";
import { STICKY_ID } from "./sorts.js";
import { findNode, type TreeNode } from "./tree.js";

// What a row among the notes is, when it is not a plain note: a file, a lapp or a pack's guide.
// It gets a small icon, so a picture, a PDF and a place do not look the same.

export type NoteKind = "picture" | "pdf" | "text" | "file" | "lapp" | "guide";

/** A file's ending in capitals, "PDF" for "mini.pdf"; nothing when the name has none. */
export function fileType(name: string) {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toUpperCase() : "";
}

function fileKind(name: string): NoteKind {
  if (isPictureFile(name)) return "picture";
  if (fileType(name) === "PDF") return "pdf";
  return ["TXT", "MD"].includes(fileType(name)) ? "text" : "file";
}

function kindBySort(sort: TreeNode | null): NoteKind | null {
  if (sort?.id === STICKY_ID) return "lapp";
  return sort?.kind === "sort" && sort.title === GUIDE ? "guide" : null;
}

export function noteKind(
  tree: TreeNode[],
  summaries: Record<string, SceneSummary>,
  id: string,
): NoteKind | null {
  const file = summaries[id]?.file;
  return file ? fileKind(file) : kindBySort(findNode(tree, id)?.parent ?? null);
}
