import { describe, expect, it } from "vitest";
import { placeCopyAfter } from "../src/app/conflictCopy";
import { findNode, type TreeNode } from "../src/project/tree";

const tree: TreeNode[] = [
  {
    id: "k1",
    kind: "chapter",
    children: [
      { id: "a", kind: "scene" },
      { id: "b", kind: "scene" },
    ],
  },
  { id: "k2", kind: "chapter", children: [{ id: "c", kind: "scene" }] },
  { id: "anteckningar", kind: "sort", children: [] },
  { id: "trash", kind: "folder", children: [] },
];

describe("placeCopyAfter", () => {
  it("puts the copy right after the original, in the same chapter", () => {
    const placed = placeCopyAfter(tree, "a", "copy");

    const chapter = findNode(placed, "k1")?.node;
    expect(chapter?.children?.map((scene) => scene.id)).toEqual(["a", "copy", "b"]);
  });

  it("leaves the tree as it was when the original is in Papperskorg", () => {
    const inTrash: TreeNode[] = [
      ...tree.slice(0, 3),
      { id: "trash", kind: "folder", children: [{ id: "gone", kind: "scene" }] },
    ];

    expect(placeCopyAfter(inTrash, "gone", "copy")).toBe(inTrash);
  });

  it("leaves the tree as it was when the original is not in it", () => {
    expect(placeCopyAfter(tree, "saknas", "copy")).toBe(tree);
  });
});
