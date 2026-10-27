import { createMemoryFileSystem } from "@llkit/storage/memoryFileSystem.js";
import { describe, expect, it } from "vitest";
import { createLapp } from "../src/app/createLapp";
import { STICKY_ID } from "../src/project/sorts";
import { readStickyNote } from "../src/project/stickyNotes";
import { sceneIdsIn, withSpecialFolders, type TreeNode } from "../src/project/tree";

describe("createLapp", () => {
  it("writes an empty lapp as a note file and puts it in the sort Lappar", async () => {
    const files = createMemoryFileSystem({});
    let saved: TreeNode[] = [];
    const tree = withSpecialFolders([{ id: "s1", kind: "scene" }]);

    const book = {
      fileSystem: files,
      dir: "/bok",
      updateTree: async (change: (tree: TreeNode[]) => TreeNode[]) => void (saved = change(tree)),
    };

    const note = await createLapp(book, { left: 24, top: 24 });

    expect(readStickyNote(note.id, await files.readText(`/bok/scenes/${note.id}.md`))).toEqual(
      note,
    );
    expect(note.text).toBe("");
    expect(sceneIdsIn(saved, STICKY_ID)).toEqual([note.id]);
  });
});

describe("two Ny lapp in a row", () => {
  it("both end up in the tree, as each change is made on the tree as it then is", async () => {
    const files = createMemoryFileSystem({});
    let current = withSpecialFolders([{ id: "s1", kind: "scene" }]);
    const book = {
      fileSystem: files,
      dir: "/bok",
      updateTree: async (change: (tree: TreeNode[]) => TreeNode[]) =>
        void (current = change(current)),
    };

    const [first, second] = await Promise.all([
      createLapp(book, { left: 24, top: 24 }),
      createLapp(book, { left: 48, top: 48 }),
    ]);

    expect(sceneIdsIn(current, STICKY_ID).sort()).toEqual([first.id, second.id].sort());
  });
});
