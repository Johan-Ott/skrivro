import { createMemoryFileSystem } from "@llkit/storage/memoryFileSystem.js";
import { describe, expect, it } from "vitest";
import { writeProjectFile } from "../src/project/projectFile";
import { STICKY_ID } from "../src/project/sorts";
import {
  newStickyNote,
  readStickyNote,
  stickyNoteFileText,
  stickyNoteOnDisk,
  type StickyNote,
} from "../src/project/stickyNotes";
import { moveOldStickyNotes } from "../src/project/stickyMove";
import { sceneIdsIn, withSpecialFolders, type TreeNode } from "../src/project/tree";

const drawn: StickyNote = {
  id: "01TEST00000000000000900001",
  color: "rosa",
  text: "Ritad lapp: åäö ÅÄÖ\n\n- en punkt",
  strokes: [
    [
      [10, 12],
      [14, 18],
    ],
    [
      [40, 40],
      [44, 50],
    ],
  ],
  left: 40,
  top: 80,
  width: 220,
  height: 200,
};

describe("a sticky note as a file", () => {
  it("is written with its colour, place and lines in the front matter and its text as the body", () => {
    const text = stickyNoteFileText(drawn);

    expect(text).toContain("color: rosa\n");
    expect(text).toContain("place: 40, 80, 220, 200\n");
    expect(text).toContain("strokes: [[[10,12],[14,18]],[[40,40],[44,50]]]\n");
    expect(text.endsWith("---\nRitad lapp: åäö ÅÄÖ\n\n- en punkt")).toBe(true);
  });

  it("reads back as the same note, with every line and every letter", () => {
    expect(readStickyNote(drawn.id, stickyNoteFileText(drawn))).toEqual(drawn);
  });

  it("has no strokes line when there is nothing drawn, and is yellow and in its place by default", () => {
    const note = { ...newStickyNote({ left: 24, top: 24 }), id: "A" };

    const text = stickyNoteFileText(note);

    expect(text).not.toContain("strokes:");
    expect(readStickyNote("A", "Bara text.")).toMatchObject({
      color: "gul",
      text: "Bara text.",
      strokes: [],
    });
  });
});

const BOOK = "/bok";
const bookTree = (): TreeNode[] => withSpecialFolders([{ id: "s1", kind: "scene" }]);

const oldNotes: StickyNote[] = [
  drawn,
  { ...drawn, id: "01TEST00000000000000900002", color: "gul", text: "", strokes: [] },
];

function oldBook() {
  return createMemoryFileSystem({
    "/bok/lappar.json": `${JSON.stringify(oldNotes, null, 2)}\n`,
    "/bok/kladdlapp.md": "Gammal kladdlapp: tre saker.\nÅ, Ä och Ö.",
    "/bok/scenes/s1.md": "Text.",
  });
}

describe("moveOldStickyNotes", () => {
  it("makes every old lapp and the kladdlapp a note in the sort Lappar, and sets the old files aside", async () => {
    const files = oldBook();

    const tree = await moveOldStickyNotes(files, BOOK, { fields: {}, tree: bookTree() }, ["s1"]);

    const ids = sceneIdsIn(tree ?? [], STICKY_ID);
    expect(ids).toHaveLength(3);
    const read = await Promise.all(
      ids.map(async (id) => readStickyNote(id, await files.readText(`/bok/scenes/${id}.md`))),
    );
    expect(read).toContainEqual(drawn);
    expect(read.map((note) => note.text)).toContain("Gammal kladdlapp: tre saker.\nÅ, Ä och Ö.");
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

    const ids = sceneIdsIn(done ?? [], STICKY_ID);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(3);
    expect((await files.list("/bok/scenes")).length).toBe(4);
    expect([...(await files.list("/bok/trash"))].sort()).toEqual(["kladdlapp.md", "lappar.json"]);
  });

  it("leaves an old note that is already a note as it is", async () => {
    const files = oldBook();
    await files.writeText(
      `/bok/scenes/${drawn.id}.md`,
      "---\ncolor: mint\n---\nRedan en anteckning.",
    );

    await moveOldStickyNotes(files, BOOK, { fields: {}, tree: bookTree() }, ["s1", drawn.id]);

    expect(await files.readText(`/bok/scenes/${drawn.id}.md`)).toContain("Redan en anteckning.");
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
});

describe("the project file after the move", () => {
  it("is written with the new notes in the sort", async () => {
    const files = oldBook();
    await files.writeText("/bok/project.json", "{}");

    await moveOldStickyNotes(files, BOOK, { fields: { title: "Bok" }, tree: bookTree() }, ["s1"]);

    const saved = JSON.parse(await files.readText("/bok/project.json")) as { tree: TreeNode[] };
    expect(sceneIdsIn(saved.tree, STICKY_ID)).toHaveLength(3);
    void writeProjectFile;
  });
});

describe("moveOldStickyNotes in a book whose project file has no sort Lappar yet", () => {
  it("puts the lappar in the sort Lappar, not among the scenes of the manuscript", async () => {
    const files = oldBook();
    const plain: TreeNode[] = [{ id: "s1", kind: "scene" }];

    const tree = await moveOldStickyNotes(files, BOOK, { fields: {}, tree: plain }, ["s1"]);

    expect(sceneIdsIn(tree ?? [], STICKY_ID)).toHaveLength(3);
    expect(tree?.filter((node) => node.kind === "scene").map((node) => node.id)).toEqual(["s1"]);
  });
});

describe("the kladdlapp's fixed id", () => {
  it("is a valid scene id, so the note can be opened", async () => {
    const files = oldBook();

    const tree = await moveOldStickyNotes(files, BOOK, { fields: {}, tree: bookTree() }, ["s1"]);

    const ids = sceneIdsIn(tree ?? [], STICKY_ID);
    expect(ids.filter((id) => !/^[0-9A-HJKMNP-TV-Z]{26}$/.test(id))).toEqual([]);
  });
});

describe("writing a lapp over what its file already holds", () => {
  const onDisk =
    "---\nid: A\ntitle: Anteckning om tåget\nstatus: utkast\nlink: false\ncolor: gul\nplace: 24, 24, 200, 180\n---\nGammal text.";

  it("keeps the front matter the lapp got as a note, and changes only colour, place and lines", () => {
    const moved: StickyNote = {
      ...newStickyNote({ left: 300, top: 90 }),
      id: "A",
      color: "rosa",
      text: "Ny text.",
    };

    const written = stickyNoteOnDisk(onDisk, stickyNoteFileText(moved));

    expect(written).toContain("title: Anteckning om tåget\n");
    expect(written).toContain("status: utkast\n");
    expect(written).toContain("link: false\n");
    expect(written).toContain("color: rosa\n");
    expect(written).toContain("place: 300, 90, 200, 180\n");
    expect(written.endsWith("---\nNy text.")).toBe(true);
  });

  it("takes the strokes line away when the last line is rubbed out, and adds it when one is drawn", () => {
    const withLine = `${onDisk.replace("---\nGammal", "strokes: [[[1,2],[3,4]]]\n---\nGammal")}`;
    const rubbed: StickyNote = { ...readStickyNote("A", withLine), strokes: [] };
    const drawn: StickyNote = {
      ...readStickyNote("A", onDisk),
      strokes: [
        [
          [5, 6],
          [7, 8],
        ],
      ],
    };

    expect(stickyNoteOnDisk(withLine, stickyNoteFileText(rubbed))).not.toContain("strokes:");
    expect(stickyNoteOnDisk(onDisk, stickyNoteFileText(drawn))).toContain(
      "strokes: [[[5,6],[7,8]]]\n",
    );
  });

  it("writes the lapp as it is when there is no file yet", () => {
    const text = stickyNoteFileText(readStickyNote("A", onDisk));

    expect(stickyNoteOnDisk(null, text)).toBe(text);
  });
});
