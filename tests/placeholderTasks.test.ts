import { createMemoryFileSystem } from "@llkit/storage/memoryFileSystem.js";
import { describe, expect, it } from "vitest";
import { bookPlaceholders, placeholdersOf } from "../src/project/placeholderTasks";

describe("bookPlaceholders", () => {
  it("lists each placeholder with the words before it, scene by scene", async () => {
    const files = createMemoryFileSystem({
      "/bok/scenes/ett.md":
        "---\nid: ett\ntitle: Ett\n---\nHon klev *snabbt* på tåget mot [?] i gryningen.",
      "/bok/scenes/tva.md": "---\nid: tva\ntitle: Två\n---\nIngenting att kolla här.",
      "/bok/scenes/tre.md":
        "---\nid: tre\ntitle: Tre\n---\nBron hette [? kolla namnet] och [?] igen.",
    });

    const tasks = await bookPlaceholders(files, "/bok", ["ett", "tva", "tre"]);

    expect(tasks).toEqual([
      { sceneId: "ett", text: "[?]", before: "Hon klev snabbt på tåget mot" },
      { sceneId: "tre", text: "[? kolla namnet]", before: "Bron hette" },
      { sceneId: "tre", text: "[?]", before: "Bron hette [? kolla namnet] och" },
    ]);
  });
});

describe("placeholdersOf", () => {
  it("lists the placeholders of a text as the editor has it, so a deleted one is gone at once", () => {
    const before = "Hon klev mot [?] i gryningen.";
    const after = "Hon klev mot Hallsta i gryningen.";

    expect(placeholdersOf("ett", before).map((task) => task.text)).toEqual(["[?]"]);
    expect(placeholdersOf("ett", after)).toEqual([]);
  });
});
