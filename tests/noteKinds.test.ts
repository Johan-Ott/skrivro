import { describe, expect, it } from "vitest";
import { fileType, noteKind } from "../src/project/noteKinds";
import { nodeMeta } from "../src/project/treeLabels";
import { withSpecialFolders, type TreeNode } from "../src/project/tree";
import type { SceneSummary } from "../src/project/sceneSummaries";

const note = (title: string, file?: string): SceneSummary => ({
  title,
  words: 0,
  status: "idé",
  ...(file ? { file } : {}),
});

const summaries: Record<string, SceneSummary> = {
  scen: { title: "Scen", words: 120, status: "utkast" },
  fyren: note("Fyren"),
  karta: note("kartan", "kartan.PNG"),
  mini: note("mini", "mini.pdf"),
  logg: note("loggbok", "loggbok.txt"),
  brev: note("brev", "brev.docx"),
  guide: note("Strukturen"),
};

const tree: TreeNode[] = [
  { id: "scen", kind: "scene" },
  ...withSpecialFolders([]),
  {
    id: "övrigt-eget",
    kind: "sort",
    title: "Källor",
    children: ["fyren", "karta", "mini", "logg", "brev"].map((id) => ({ id, kind: "scene" })),
  },
  { id: "g", kind: "sort", title: "Guide", children: [{ id: "guide", kind: "scene" }] },
];

describe("noteKind", () => {
  it("says what a row is when it is not a plain note or scene", () => {
    const kinds = Object.keys(summaries).map((id) => noteKind(tree, summaries, id));

    expect(kinds).toEqual([null, null, "picture", "pdf", "text", "file", "guide"]);
  });
});

describe("a file's type", () => {
  it("is its ending in capitals, and nothing for a name without one", () => {
    expect(["mini.pdf", "kartan.PNG", "loggbok.txt", "noter", ".dold"].map(fileType)).toEqual([
      "PDF",
      "PNG",
      "TXT",
      "",
      "",
    ]);
  });

  it("stands where the words would, so a PDF does not say 0", () => {
    expect(nodeMeta({ id: "mini", kind: "scene" }, summaries)).toBe("PDF");
    expect(nodeMeta({ id: "scen", kind: "scene" }, summaries)).toBe("120");
  });
});
