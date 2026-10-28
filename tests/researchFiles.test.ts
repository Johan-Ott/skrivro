import { describe, expect, it } from "vitest";
import { readSceneSummaries } from "../src/project/sceneSummaries";
import { createFileNote, sameFileNote, saveResearchFile } from "../src/project/researchFiles";
import { createMemoryFileSystem } from "@llkit/storage/memoryFileSystem.js";
import { TRASH_ID } from "../src/project/tree";

describe("research files", () => {
  it("are copied into filer/ under a free name, so a file there is never replaced", async () => {
    const files = createMemoryFileSystem({ "/bok/filer/karta.pdf": "gammal" });
    const bytes = new TextEncoder().encode("ny");

    const name = await saveResearchFile(files, "/bok", "C:/Hämtade/karta.pdf", bytes);

    expect(name).toBe("karta 2.pdf");
    expect(await files.readText("/bok/filer/karta.pdf")).toBe("gammal");
    expect(await files.readText("/bok/filer/karta 2.pdf")).toBe("ny");
  });

  it("become a note named after the file, which knows its file", async () => {
    const files = createMemoryFileSystem({});

    const id = await createFileNote(files, "/bok", "Fyrar: 1890.pdf");

    const summaries = await readSceneSummaries(files, "/bok", [id]);
    expect(summaries[id]).toMatchObject({ title: "Fyrar: 1890", file: "Fyrar: 1890.pdf" });
  });
});

describe("sameFileNote", () => {
  const bytes = new Uint8Array([1, 2, 3]);
  const summaries = {
    karta: { title: "Sjökort", words: 0, status: "idé" as const, file: "Sjökort.pdf" },
  };

  it("is the note that already holds the very same file, so it can be opened instead", async () => {
    const files = createMemoryFileSystem({});
    await files.makeDir("/bok/filer");
    await files.writeBytes("/bok/filer/Sjökort.pdf", bytes);

    expect(
      await sameFileNote(
        files,
        { dir: "/bok", tree: [], summaries },
        { path: "C:/Hämtat/Sjökort.pdf", bytes: bytes },
      ),
    ).toBe("karta");
  });

  it("is nothing for a new version under the same name, which is added as before", async () => {
    const files = createMemoryFileSystem({});
    await files.makeDir("/bok/filer");
    await files.writeBytes("/bok/filer/Sjökort.pdf", bytes);
    const newer = new Uint8Array([1, 2, 4]);

    expect(
      await sameFileNote(
        files,
        { dir: "/bok", tree: [], summaries },
        { path: "Sjökort.pdf", bytes: newer },
      ),
    ).toBeNull();
    expect(
      await sameFileNote(
        files,
        { dir: "/bok", tree: [], summaries },
        { path: "Annat.pdf", bytes: bytes },
      ),
    ).toBeNull();
  });

  it("is nothing for a note thrown away, so the file is added again and not opened locked", async () => {
    const files = createMemoryFileSystem({});
    await files.makeDir("/bok/filer");
    await files.writeBytes("/bok/filer/Sjökort.pdf", bytes);
    const tree = [
      {
        id: TRASH_ID,
        kind: "folder" as const,
        children: [{ id: "karta", kind: "scene" as const }],
      },
    ];

    expect(
      await sameFileNote(files, { dir: "/bok", tree, summaries }, { path: "Sjökort.pdf", bytes }),
    ).toBeNull();
  });
});
