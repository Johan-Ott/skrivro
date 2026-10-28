import { describe, expect, it, vi } from "vitest";
import { createMemoryFileSystem } from "@llkit/storage/memoryFileSystem.js";
import { ExportError, readBookScenes } from "../src/export/book";

vi.mock("../src/manuscript/parseMarkdown", () => ({
  parseMarkdown: () => {
    throw new RangeError("Invalid content for node styleBlock");
  },
}));

describe("readBookScenes", () => {
  it("names the scene and the problem when a text cannot be read, not a save error", async () => {
    const files = createMemoryFileSystem({ "/bok/scenes/01ISEN.md": "text" });

    const reading = readBookScenes(files, "/bok", ["01ISEN"], { "01ISEN": "Isen" });

    await expect(reading).rejects.toThrow(ExportError);
    await expect(reading).rejects.toMatchObject({
      sceneTitle: "Isen",
      reason: expect.stringContaining("Invalid content for node styleBlock"),
    });
  });
});
