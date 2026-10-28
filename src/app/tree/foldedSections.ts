import { useState } from "react";
import { ancestorIds, findNode, type TreeNode } from "../../project/tree.js";

// The manuscript and the notes fold apart in the sidebar, and each book keeps how it was left on
// this device. The notes start folded, so the book reads as its chapters.

export type FoldedSections = { book: boolean; notes: boolean };
type Section = keyof FoldedSections;

type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;

const FIRST_TIME: FoldedSections = { book: false, notes: true };
const keyOf = (dir: string) => `skrivro.folded.${dir}`;

const yesOrNo = (value: unknown, otherwise: boolean) =>
  typeof value === "boolean" ? value : otherwise;

export function foldedSectionsIn(storage: Storage, dir: string): FoldedSections {
  try {
    const kept: Partial<Record<Section, unknown>> | null = JSON.parse(
      storage.getItem(keyOf(dir)) ?? "null",
    );
    const { book, notes } = kept ?? {};
    return { book: yesOrNo(book, FIRST_TIME.book), notes: yesOrNo(notes, FIRST_TIME.notes) };
  } catch {
    return FIRST_TIME;
  }
}

export function keepFoldedSections(storage: Storage, dir: string, folded: FoldedSections) {
  try {
    storage.setItem(keyOf(dir), JSON.stringify(folded));
  } catch {
    // Without storage the sections fold as the first time when the book opens again.
  }
}

/** A note in a sort is under Anteckningar; the rest is the manuscript. */
export function sectionOf(tree: TreeNode[], id: string): Section {
  const top = ancestorIds(tree, id)[0] ?? id;
  return findNode(tree, top)?.node.kind === "sort" ? "notes" : "book";
}

/** How the book's sections are folded, kept on this device as the writer changes it. */
export function useFoldedSections(dir: string) {
  const [kept, setKept] = useState(() => ({
    dir,
    folded: foldedSectionsIn(globalThis.localStorage, dir),
  }));
  // Another book is read while drawing, so the first frame never shows the last book's folds.
  const folded = kept.dir === dir ? kept.folded : foldedSectionsIn(globalThis.localStorage, dir);
  if (kept.dir !== dir) setKept({ dir, folded });
  const change = (next: FoldedSections) => {
    setKept({ dir, folded: next });
    keepFoldedSections(globalThis.localStorage, dir, next);
  };
  const toggle = (section: Section) => change({ ...folded, [section]: !folded[section] });
  // Something just made shows, so its section unfolds and stays so.
  const unfold = (section: Section) => {
    if (folded[section]) change({ ...folded, [section]: false });
  };
  return { ...folded, toggle, unfold };
}
