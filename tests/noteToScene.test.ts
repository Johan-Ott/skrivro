import { describe, expect, it } from "vitest";
import { createMemoryFileSystem } from "@llkit/storage/memoryFileSystem.js";
import {
  cleanNotesMadeScenes,
  notesMadeScenes,
  withoutQuestions,
} from "../src/project/noteToScene";
import { listSnapshots } from "../src/project/snapshots";
import { moveNode, type TreeNode } from "../src/project/tree";

const NOTE = [
  "**Vill:**",
  "",
  "<!-- Vad jagar hen? -->",
  "",
  "**Rädd för:**",
  "",
  "Mörker.",
  "",
  "**Döljer:**",
  "",
  "<!-- Vad vet hen? -->",
  "",
].join("\n");

const tree: TreeNode[] = [
  { id: "ch", kind: "chapter", children: [] },
  { id: "karaktarer", kind: "sort", children: [{ id: "NOTE", kind: "scene" }] },
  { id: "trash", kind: "folder", children: [] },
];

const noteFile = (body: string) => `---\nid: NOTE\ntitle: Elin\n---\n${body}`;
const versionsOf = (files: ReturnType<typeof createMemoryFileSystem>) =>
  listSnapshots(files, { dir: "/bok", id: "NOTE" });

describe("a note that becomes a scene", () => {
  it("loses its unanswered questions and the labels above them, and keeps answered fields", () => {
    // The field that was last leaves the blank line before it behind, harmless.
    expect(withoutQuestions(NOTE)).toBe("**Rädd för:**\n\nMörker.\n\n");
  });

  it("keeps the writer's own text exactly, blank lines and all", () => {
    const text = "Egen text.\n\n\n\nMer.\n\n**Vill:**\n\n<!-- Vad jagar hen? -->\n\n\nSlut.\n";

    expect(withoutQuestions(text)).toBe("Egen text.\n\n\n\nMer.\n\nSlut.\n");
  });

  it("keeps Windows line breaks as they were", () => {
    const text = "Egen text.\r\n\r\n**Vill:**\r\n\r\n<!-- Vad jagar hen? -->\r\n\r\nSlut.\r\n";

    expect(withoutQuestions(text)).toBe("Egen text.\r\n\r\nSlut.\r\n");
  });

  it("is empty when nothing was answered", () => {
    expect(withoutQuestions("**Vill:**\n\n<!-- Vad jagar hen? -->\n")).toBe("");
  });

  it("finds the notes that the new tree holds in the manuscript", () => {
    expect(notesMadeScenes(tree, moveNode(tree, "NOTE", "ch", 0))).toEqual(["NOTE"]);
    expect(notesMadeScenes(tree, tree)).toEqual([]);
  });

  it("is cleaned in its file, front matter kept", async () => {
    const files = createMemoryFileSystem({ "/bok/scenes/NOTE.md": noteFile(NOTE) });

    await cleanNotesMadeScenes(files, "/bok", ["NOTE"]);

    expect(await files.readText("/bok/scenes/NOTE.md")).toBe(
      noteFile("**Rädd för:**\n\nMörker.\n\n"),
    );
  });

  it("is kept as it was in Versioner before its questions go", async () => {
    const files = createMemoryFileSystem({ "/bok/scenes/NOTE.md": noteFile(NOTE) });

    await cleanNotesMadeScenes(files, "/bok", ["NOTE"]);

    const [version] = await versionsOf(files);
    expect(version?.body).toBe(NOTE);
    expect(version?.label).toBe("Innan den blev scen");
  });

  it("is kept with the writer's own comment too, as it was", async () => {
    const own = "**Obs:**\n\n<!-- kom ihåg tidslinjen -->\n";
    const files = createMemoryFileSystem({ "/bok/scenes/NOTE.md": noteFile(own) });

    await cleanNotesMadeScenes(files, "/bok", ["NOTE"]);

    const [version] = await versionsOf(files);
    expect(version?.body).toBe(own);
  });

  it("gets no version and is not touched when every field is answered", async () => {
    const text = noteFile("**Vill:**\n\nHem.\n\n\n\nMer.");
    const files = createMemoryFileSystem({ "/bok/scenes/NOTE.md": text });

    await cleanNotesMadeScenes(files, "/bok", ["NOTE"]);

    expect(await files.readText("/bok/scenes/NOTE.md")).toBe(text);
    expect(await versionsOf(files)).toEqual([]);
  });

  it("is left as it is when its version cannot be saved", async () => {
    const text = noteFile(NOTE);
    const files = createMemoryFileSystem({ "/bok/scenes/NOTE.md": text });
    const failing = {
      ...files,
      writeText: async (path: string, content: string) => {
        if (path.includes("/snapshots/")) throw new Error("disk full");
        return files.writeText(path, content);
      },
    };

    await expect(cleanNotesMadeScenes(failing, "/bok", ["NOTE"])).rejects.toThrow("disk full");

    expect(await files.readText("/bok/scenes/NOTE.md")).toBe(text);
  });
});
