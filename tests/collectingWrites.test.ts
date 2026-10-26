import { describe, expect, it } from "vitest";
import { writeAtomic } from "@llkit/storage/atomicWrite.js";
import { collectingWrites } from "@llkit/storage/fileSystem.js";
import { createMemoryFileSystem } from "@llkit/storage/memoryFileSystem.js";

describe("collectingWrites", () => {
  it("writes nothing until flush, then every file, temp files under their own names", async () => {
    const files = createMemoryFileSystem({});
    const { collecting, flush } = collectingWrites(files);

    await collecting.writeText("/bok.skrivro/scenes/A.md", "Ett");
    await writeAtomic(collecting, "/bok.skrivro/project.json", "{}");

    expect(await files.list("/bok.skrivro")).toEqual([]);
    expect(await collecting.readText("/bok.skrivro/project.json")).toBe("{}");
    await flush();
    expect(await files.readText("/bok.skrivro/scenes/A.md")).toBe("Ett");
    expect((await files.list("/bok.skrivro")).sort()).toEqual(["project.json", "scenes"]);
  });
});
