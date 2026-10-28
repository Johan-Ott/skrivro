import { createMemoryFileSystem } from "@llkit/storage/memoryFileSystem.js";
import { describe, expect, it } from "vitest";
import { setAside } from "../src/storage/setAside";
import { moveToTrash, type LocalBook } from "../src/sync/localSide";

describe("a file moved to trash/ when one of the same name is there", () => {
  it("gets the same free name whether the sync or the app moves it", async () => {
    const files = createMemoryFileSystem({
      "/bok/trash/S1.md": "äldst",
      "/bok/scenes/S1.md": "från synken",
      "/bok/stats/S1.md": "från appen",
    });
    const book = { fileSystem: files, dir: "/bok" } as unknown as LocalBook;

    const bySync = await moveToTrash(book, "scenes/S1.md");
    await setAside(files, "/bok", "/bok/stats/S1.md", "S1.md");

    expect(bySync).toBe("trash/S1 (2).md");
    expect([...(await files.list("/bok/trash"))].sort()).toEqual([
      "S1 (2).md",
      "S1 (3).md",
      "S1.md",
    ]);
  });
});
