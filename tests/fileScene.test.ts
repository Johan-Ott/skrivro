import { describe, expect, it } from "vitest";
import {
  filesAddedIn,
  isDocxFile,
  isPdfFile,
  isTextFile,
  placeForFile,
} from "../src/project/researchFiles";
import { NOTES_ID, withSpecialFolders, type TreeNode } from "../src/project/tree";

const book = (sorts: TreeNode[] = []) =>
  withSpecialFolders([
    { id: "kap1", kind: "chapter", children: [{ id: "scen1", kind: "scene" }] },
    ...sorts,
  ]);

describe("where a file added goes", () => {
  it("is the sort it was added to", () => {
    expect(placeForFile(book(), "platser", "scen1")).toEqual({ sortId: "platser" });
  });

  it("is Källor from a scene, linked to the scene, or Övrigt when the book has no Källor", () => {
    const sources = { id: "kallor", kind: "sort" as const, title: "Källor", children: [] };

    expect(placeForFile(book([sources]), undefined, "scen1")).toEqual({
      sortId: "kallor",
      addedIn: "scen1",
    });
    expect(placeForFile(book(), undefined, "scen1")).toEqual({
      sortId: NOTES_ID,
      addedIn: "scen1",
    });
  });

  it("is Övrigt with no link when no scene of the manuscript is open", () => {
    expect(placeForFile(book(), undefined, "kap1")).toEqual({ sortId: NOTES_ID });
    expect(placeForFile(book(), undefined, undefined)).toEqual({ sortId: NOTES_ID });
  });
});

describe("the files added in a scene", () => {
  it("are the notes still in a sort that were added from it", () => {
    const tree = book().map((node) =>
      node.id === NOTES_ID
        ? {
            ...node,
            children: [
              { id: "brev", kind: "scene" as const, addedIn: "scen1" },
              { id: "karta", kind: "scene" as const, addedIn: "scen2" },
            ],
          }
        : node,
    );

    expect(filesAddedIn(tree, "scen1")).toEqual(["brev"]);
  });
});

describe("what a file is read as", () => {
  it("tells a PDF and a text file by their ending, whatever the case", () => {
    expect(isPdfFile("Brev.PDF")).toBe(true);
    expect(isPdfFile("brev.txt")).toBe(false);
    expect(isDocxFile("Kapitel.DOCX")).toBe(true);
    expect(isTextFile("anteckning.md")).toBe(true);
    expect(isTextFile("bild.png")).toBe(false);
  });
});
