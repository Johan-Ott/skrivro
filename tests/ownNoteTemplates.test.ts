import { describe, expect, it } from "vitest";
import { createMemoryFileSystem } from "@llkit/storage/memoryFileSystem.js";
import { readNoteTemplates, saveNoteTemplate } from "../src/project/ownNoteTemplates";

describe("own note templates", () => {
  it("are kept in the Skrivro folder and read back with their sort", async () => {
    const files = createMemoryFileSystem({});
    const body = "**Vill:** mer än hon vågar säga.\n\n::: punktlista\nEtt\n\nTvå\n:::";

    await saveNoteTemplate(files, "/Skrivro", { name: "Skurken", sort: "karaktarer", body });

    expect(await readNoteTemplates(files, "/Skrivro")).toEqual([
      { name: "Skurken", sort: "karaktarer", body },
    ]);
  });

  it("are none before the first is saved", async () => {
    expect(await readNoteTemplates(createMemoryFileSystem({}), "/Skrivro")).toEqual([]);
  });
});
