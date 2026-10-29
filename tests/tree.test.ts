import { describe, expect, it } from "vitest";
import {
  findNode,
  insertNode,
  manuscriptSceneIds,
  moveNode,
  moveToTrash,
  nextSceneSibling,
  numberNodes,
  putBack,
  rebuildTree,
  reconcileScenes,
  withSpecialFolders,
  CHARACTERS_ID,
  NOTES_ID,
  SECRETS_ID,
  PLACES_ID,
  THINGS_ID,
  TRASH_ID,
  type TreeNode,
} from "../src/project/tree";
import { renameNode } from "../src/project/nodeFields";

const FIXED = [CHARACTERS_ID, PLACES_ID, THINGS_ID, NOTES_ID, SECRETS_ID, TRASH_ID];

const scene = (id: string): TreeNode => ({ id, kind: "scene" });

function sampleTree(): TreeNode[] {
  return withSpecialFolders([
    {
      id: "del1",
      kind: "part",
      title: "Hemkomsten",
      children: [
        { id: "kap1", kind: "chapter", title: "Arvid", children: [scene("s1"), scene("s2")] },
        { id: "kap2", kind: "chapter", title: "Udden", children: [scene("s3")] },
      ],
    },
  ]);
}

const childIds = (tree: TreeNode[], id: string) =>
  findNode(tree, id)?.node.children?.map((child) => child.id);

describe("special folders", () => {
  it("always ends the tree with the five note sorts and Papperskorg", () => {
    const tree = withSpecialFolders([scene("s1")]);

    expect(tree.map((node) => node.id)).toEqual(["s1", ...FIXED]);
    expect(tree.filter((node) => node.kind === "sort")).toHaveLength(5);
    expect(tree.at(-1)?.title).toBe("Papperskorg");
  });

  it("keeps existing sorts and their notes", () => {
    const once = withSpecialFolders([scene("s1")]);
    const withNote = insertNode(once, scene("s9"), THINGS_ID, 0);

    const twice = withSpecialFolders(withNote);

    expect(twice.length).toBe(7);
    expect(childIds(twice, THINGS_ID)).toEqual(["s9"]);
  });

  it("turns the old fixed folders into sorts: own sorts when they hold texts, gone when empty", () => {
    const old: TreeNode[] = [
      scene("s1"),
      { id: CHARACTERS_ID, kind: "folder", title: "Karaktärer", children: [scene("arvid")] },
      { id: "tidslinje", kind: "folder", title: "Tidslinje", children: [scene("h1")] },
      { id: "research", kind: "folder", title: "Research", children: [] },
    ];

    const tree = withSpecialFolders(old);

    expect(tree.map((node) => node.id)).toEqual([
      "s1",
      ...FIXED.slice(0, 5),
      "tidslinje",
      TRASH_ID,
    ]);
    expect(findNode(tree, CHARACTERS_ID)?.node.kind).toBe("sort");
    expect(childIds(tree, CHARACTERS_ID)).toEqual(["arvid"]);
    expect(findNode(tree, "tidslinje")?.node).toMatchObject({ kind: "sort", title: "Tidslinje" });
  });

  it("keeps the sorts in the writer's order, a renamed fixed sort's name, and one in Papperskorg", () => {
    const tree = withSpecialFolders([
      { id: PLACES_ID, kind: "sort", title: "Världen", children: [] },
      { id: CHARACTERS_ID, kind: "sort", title: "Personer", children: [] },
      { id: TRASH_ID, kind: "folder", children: [{ id: SECRETS_ID, kind: "sort", children: [] }] },
    ]);

    expect(tree.map((node) => node.id).slice(0, 2)).toEqual([PLACES_ID, CHARACTERS_ID]);
    expect(findNode(tree, PLACES_ID)?.node.title).toBe("Världen");
    expect(findNode(tree, CHARACTERS_ID)?.node.title).toBeUndefined();
    expect(tree.filter((node) => node.id === SECRETS_ID)).toEqual([]);
  });

  it("puts a new own sort after the others, before Papperskorg", () => {
    const own: TreeNode = { id: "egen", kind: "sort", title: "Fordon" };

    const tree = insertNode(withSpecialFolders([scene("s1")]), own, null, 0);

    expect(tree.map((node) => node.id)).toEqual(["s1", ...FIXED.slice(0, 5), "egen", TRASH_ID]);
  });

  it("puts the old sort Lappar's notes last in Övrigt, and what was thrown from it goes back there", () => {
    const tree = withSpecialFolders([
      { id: NOTES_ID, kind: "sort", children: [scene("n1")] },
      { id: "lappar", kind: "sort", children: [scene("l1")] },
      { id: TRASH_ID, kind: "folder", children: [{ ...scene("l2"), trashedFrom: "lappar" }] },
    ]);

    expect(findNode(tree, "lappar")).toBeNull();
    expect(childIds(tree, NOTES_ID)).toEqual(["n1", "l1"]);
    expect(findNode(tree, "l2")?.node.trashedFrom).toBe(NOTES_ID);
  });

  it("keeps the old sort Lappar as the writer's own when Övrigt is in Papperskorg", () => {
    const tree = withSpecialFolders([
      { id: "lappar", kind: "sort", children: [scene("l1")] },
      { id: TRASH_ID, kind: "folder", children: [{ id: NOTES_ID, kind: "sort", children: [] }] },
    ]);

    expect(findNode(tree, "lappar")?.node).toMatchObject({ kind: "sort", title: "Lappar" });
    expect(childIds(tree, "lappar")).toEqual(["l1"]);
  });
});

describe("moveNode", () => {
  it("moves a scene to another chapter", () => {
    const moved = moveNode(sampleTree(), "s1", "kap2", 1);

    expect(childIds(moved, "kap1")).toEqual(["s2"]);
    expect(childIds(moved, "kap2")).toEqual(["s3", "s1"]);
  });

  it("reorders a scene within its chapter", () => {
    const moved = moveNode(sampleTree(), "s2", "kap1", 0);

    expect(childIds(moved, "kap1")).toEqual(["s2", "s1"]);
  });

  it("refuses to put a chapter inside a scene or a part inside a chapter", () => {
    const tree = sampleTree();

    expect(moveNode(tree, "kap2", "s1", 0)).toBe(tree);
    expect(moveNode(tree, "del1", "kap1", 0)).toBe(tree);
  });

  it("refuses to move a node into itself", () => {
    const tree = sampleTree();

    expect(moveNode(tree, "del1", "kap1", 0)).toBe(tree);
    expect(moveNode(tree, "kap1", "kap1", 0)).toBe(tree);
  });

  it("never moves the special folders", () => {
    const tree = sampleTree();

    expect(moveNode(tree, TRASH_ID, null, 0)).toBe(tree);
  });
});

describe("tree edits", () => {
  it("puts a scene in the trash", () => {
    const trashed = moveToTrash(sampleTree(), "s3");

    expect(childIds(trashed, "kap2")).toEqual([]);
    expect(childIds(trashed, TRASH_ID)).toEqual(["s3"]);
  });

  it("puts a scene back in its chapter, at its place", () => {
    const back = putBack(moveToTrash(sampleTree(), "s1"), "s1");

    expect(childIds(back, "kap1")).toEqual(["s1", "s2"]);
    expect(findNode(back, "s1")?.node).toEqual(scene("s1"));
  });

  it("puts a scene back last in the book when its chapter is thrown away too", () => {
    const tree = moveToTrash(moveToTrash(sampleTree(), "s3"), "kap2");

    const back = putBack(tree, "s3");

    expect(findNode(back, "s3")?.parent).toBeNull();
    expect(childIds(back, TRASH_ID)).toEqual(["kap2"]);
  });

  it("renames a chapter", () => {
    const renamed = renameNode(sampleTree(), "kap2", "Fyren");

    expect(findNode(renamed, "kap2")?.node.title).toBe("Fyren");
  });

  it("inserts a new chapter in a part", () => {
    const tree = insertNode(
      sampleTree(),
      { id: "kap3", kind: "chapter", title: "Ny", children: [] },
      "del1",
      2,
    );

    expect(childIds(tree, "del1")).toEqual(["kap1", "kap2", "kap3"]);
  });
});

describe("reading order", () => {
  it("lists the manuscript's scenes in order, without notes and trash", () => {
    const tree = insertNode(moveToTrash(sampleTree(), "s2"), scene("r1"), NOTES_ID, 0);

    expect(manuscriptSceneIds(tree)).toEqual(["s1", "s3"]);
  });

  it("numbers the chapters through the whole manuscript", () => {
    const numbers = numberNodes(sampleTree(), "chapter");

    expect(numbers.get("kap1")).toBe(1);
    expect(numbers.get("kap2")).toBe(2);
  });
});

describe("scenes on disk", () => {
  it("adds scene files the tree does not know to the end of the manuscript", () => {
    const result = reconcileScenes(sampleTree(), ["s1", "s2", "s3", "s4"]);

    expect(result.tree.map((node) => node.id)).toEqual(["del1", "s4", ...FIXED]);
  });

  it("reports scenes in the tree whose file is gone, without removing them", () => {
    const result = reconcileScenes(sampleTree(), ["s1", "s3"]);

    expect(result.missing).toEqual(["s2"]);
    expect(childIds(result.tree, "kap1")).toEqual(["s1", "s2"]);
  });

  it("rebuilds a tree from scene files in creation order", () => {
    const tree = rebuildTree(["01B", "01A"]);

    expect(tree.map((node) => node.id)).toEqual(["01A", "01B", ...FIXED]);
  });
});

describe("nextSceneSibling", () => {
  it("finds the next scene in the same chapter, and nothing after the last", () => {
    const tree = sampleTree();

    expect(nextSceneSibling(tree, "s1")).toBe("s2");
    expect(nextSceneSibling(tree, "s2")).toBeNull();
  });
});
