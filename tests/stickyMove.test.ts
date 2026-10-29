import { createMemoryFileSystem } from "@llkit/storage/memoryFileSystem.js";
import { describe, expect, it } from "vitest";
import { NOTES_ID } from "../src/project/sorts";
import { moveOldStickyNotes } from "../src/project/stickyMove";
import { sceneIdsIn, withSpecialFolders, type TreeNode } from "../src/project/tree";

const BOOK = "/bok";
const bookTree = (): TreeNode[] => withSpecialFolders([{ id: "s1", kind: "scene" }]);

const DRAWN_ID = "01TEST00000000000000900001";
const oldNotes = [
  {
    id: DRAWN_ID,
    color: "rosa",
    text: "Ritad lapp: åäö ÅÄÖ\n\n- en punkt",
    strokes: [[[10, 12]]],
  },
  { id: "01TEST00000000000000900002", color: "gul", text: "", strokes: [] },
];

function oldBook() {
  return createMemoryFileSystem({
    "/bok/lappar.json": `${JSON.stringify(oldNotes, null, 2)}\n`,
    "/bok/kladdlapp.md": "Gammal kladdlapp: tre saker.\nÅ, Ä och Ö.",
    "/bok/scenes/s1.md": "Text.",
  });
}

describe("moveOldStickyNotes", () => {
  it("makes every old lapp and the kladdlapp a note in Övrigt, and sets the old files aside", async () => {
    const files = oldBook();

    const tree = await moveOldStickyNotes(files, BOOK, { fields: {}, tree: bookTree() }, ["s1"]);

    const ids = sceneIdsIn(tree ?? [], NOTES_ID);
    expect(ids).toHaveLength(3);
    const texts = await Promise.all(ids.map((id) => files.readText(`/bok/scenes/${id}.md`)));
    expect(texts).toContain(`---\nid: ${DRAWN_ID}\n---\nRitad lapp: åäö ÅÄÖ\n\n- en punkt`);
    expect(
      texts.some((text) => text.endsWith("---\nGammal kladdlapp: tre saker.\nÅ, Ä och Ö.")),
    ).toBe(true);
    expect([...(await files.list("/bok/trash"))].sort()).toEqual(["kladdlapp.md", "lappar.json"]);
    expect(await files.list("/bok")).not.toContain("lappar.json");
  });

  it("does nothing for a book without the old files", async () => {
    const files = createMemoryFileSystem({ "/bok/scenes/s1.md": "Text." });

    expect(
      await moveOldStickyNotes(files, BOOK, { fields: {}, tree: bookTree() }, ["s1"]),
    ).toBeNull();
  });

  it("makes no duplicate and loses no lapp when it was stopped halfway", async () => {
    const files = oldBook();
    const failing = {
      ...files,
      rename: async (from: string, to: string) => {
        if (to.endsWith("900002.md")) throw new Error("avbrott");
        return files.rename(from, to);
      },
    };
    await expect(
      moveOldStickyNotes(failing, BOOK, { fields: {}, tree: bookTree() }, ["s1"]),
    ).rejects.toThrow("avbrott");
    const savedTree = (
      JSON.parse(await files.readText("/bok/project.json")) as { tree: TreeNode[] }
    ).tree;
    const scenes = (await files.list("/bok/scenes")).map((name) => name.replace(/\.md$/, ""));

    const done = await moveOldStickyNotes(files, BOOK, { fields: {}, tree: savedTree }, scenes);

    const ids = sceneIdsIn(done ?? [], NOTES_ID);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(3);
    expect((await files.list("/bok/scenes")).length).toBe(4);
    expect([...(await files.list("/bok/trash"))].sort()).toEqual(["kladdlapp.md", "lappar.json"]);
  });

  it("leaves an old note that is already a note as it is", async () => {
    const files = oldBook();
    await files.writeText(
      `/bok/scenes/${DRAWN_ID}.md`,
      "---\ncolor: mint\n---\nRedan en anteckning.",
    );

    await moveOldStickyNotes(files, BOOK, { fields: {}, tree: bookTree() }, ["s1", DRAWN_ID]);

    expect(await files.readText(`/bok/scenes/${DRAWN_ID}.md`)).toContain("Redan en anteckning.");
  });

  it("does not touch the old files when lappar.json cannot be read", async () => {
    const files = createMemoryFileSystem({
      "/bok/lappar.json": "[{ trasig",
      "/bok/scenes/s1.md": "T.",
    });

    await expect(
      moveOldStickyNotes(files, BOOK, { fields: {}, tree: bookTree() }, ["s1"]),
    ).rejects.toThrow();

    expect(await files.readText("/bok/lappar.json")).toBe("[{ trasig");
  });

  it("saves the project file with the new notes in Övrigt", async () => {
    const files = oldBook();
    await files.writeText("/bok/project.json", "{}");

    await moveOldStickyNotes(files, BOOK, { fields: { title: "Bok" }, tree: bookTree() }, ["s1"]);

    const saved = JSON.parse(await files.readText("/bok/project.json")) as { tree: TreeNode[] };
    expect(sceneIdsIn(saved.tree, NOTES_ID)).toHaveLength(3);
  });

  it("puts them in Övrigt, not among the scenes, when the project file has no Övrigt yet", async () => {
    const files = oldBook();
    const plain: TreeNode[] = [{ id: "s1", kind: "scene" }];

    const tree = await moveOldStickyNotes(files, BOOK, { fields: {}, tree: plain }, ["s1"]);

    expect(sceneIdsIn(tree ?? [], NOTES_ID)).toHaveLength(3);
    expect(tree?.filter((node) => node.kind === "scene").map((node) => node.id)).toEqual(["s1"]);
  });

  it("gives the kladdlapp a valid scene id, so the note can be opened", async () => {
    const files = oldBook();

    const tree = await moveOldStickyNotes(files, BOOK, { fields: {}, tree: bookTree() }, ["s1"]);

    const ids = sceneIdsIn(tree ?? [], NOTES_ID);
    expect(ids.filter((id) => !/^[0-9A-HJKMNP-TV-Z]{26}$/.test(id))).toEqual([]);
  });
});
