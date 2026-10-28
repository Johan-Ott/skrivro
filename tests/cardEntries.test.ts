import { describe, expect, it } from "vitest";
import { noteCards } from "../src/app/notes/useNotes";
import { cardEntries } from "../src/app/palette/bookEntries";
import type { PaletteContext } from "../src/app/palette/paletteEntries";
import type { Project } from "../src/app/useProject";
import { notesOf } from "../src/project/cards";
import type { TreeNode } from "../src/project/tree";

const sources: TreeNode[] = [
  {
    id: "källor",
    kind: "sort",
    title: "Källor",
    children: [
      { id: "fyren", kind: "scene" },
      { id: "mini", kind: "scene" },
    ],
  },
];

// The PDF is the series' note, not the book's, so the book knows nothing of it.
const book = { dir: "/bok", tree: [], summaries: {} } as unknown as Project;
const series = {
  dir: "/serie",
  tree: sources,
  summaries: {
    fyren: { title: "Fyren", words: 3, status: "idé" },
    mini: { title: "mini", words: 0, status: "idé", file: "mini.pdf" },
  },
} as unknown as Project;

const context = {
  cards: noteCards([book, series], notesOf),
  describe: (id: string) => (id === "fyren" ? "Fyren på udden." : ""),
  openCard: () => undefined,
  project: book,
} as unknown as PaletteContext;

describe("a note in Ctrl+K", () => {
  it("shows a file's whole name with its ending, and its sign, from the home it is in", () => {
    const [place, file] = cardEntries(context);

    expect(place).toMatchObject({ label: "Fyren", hint: "Fyren på udden." });
    expect(place?.kind).toBeUndefined();
    expect(file).toMatchObject({ label: "mini", hint: "mini.pdf", kind: "pdf" });
  });
});
