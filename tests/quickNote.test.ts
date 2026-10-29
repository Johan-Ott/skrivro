import { createMemoryFileSystem } from "@llkit/storage/memoryFileSystem.js";
import { describe, expect, it } from "vitest";
import { createQuickNote } from "../src/app/quickNote";
import { NOTES_ID } from "../src/project/sorts";
import { sceneIdsIn, withSpecialFolders, type TreeNode } from "../src/project/tree";

describe("createQuickNote", () => {
  it("writes an empty note file and puts it last in Övrigt", async () => {
    const files = createMemoryFileSystem({});
    let saved: TreeNode[] = [];
    const tree = withSpecialFolders([{ id: "s1", kind: "scene" }]);

    const book = {
      fileSystem: files,
      dir: "/bok",
      updateTree: async (change: (tree: TreeNode[]) => TreeNode[]) => void (saved = change(tree)),
    };

    const id = await createQuickNote(book);

    expect(await files.readText(`/bok/scenes/${id}.md`)).toBe(`---\nid: ${id}\n---\n`);
    expect(sceneIdsIn(saved, NOTES_ID)).toEqual([id]);
  });
});

describe("two quick notes in a row", () => {
  it("both end up in the tree, as each change is made on the tree as it then is", async () => {
    const files = createMemoryFileSystem({});
    let current = withSpecialFolders([{ id: "s1", kind: "scene" }]);
    const book = {
      fileSystem: files,
      dir: "/bok",
      updateTree: async (change: (tree: TreeNode[]) => TreeNode[]) =>
        void (current = change(current)),
    };

    const ids = await Promise.all([createQuickNote(book), createQuickNote(book)]);

    expect(sceneIdsIn(current, NOTES_ID).sort()).toEqual(ids.sort());
  });
});
