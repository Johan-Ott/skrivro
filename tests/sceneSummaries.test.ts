import { describe, expect, it } from "vitest";
import { parseMarkdown } from "../src/manuscript/parseMarkdown";
import { countDocumentWords } from "../src/manuscript/wordCount";
import { readSceneSummaries } from "../src/project/sceneSummaries";
import { createMemoryFileSystem } from "@llkit/storage/memoryFileSystem.js";

describe("countDocumentWords", () => {
  it("counts words in paragraphs, styles and raw blocks but not scene breaks", () => {
    const doc = parseMarkdown("Ett två.\n\n* * *\n\n::: brev\nTre fyra\n:::\n\n# Fem\n");

    const words = countDocumentWords(doc);

    expect(words).toBe(5);
  });
});

describe("readSceneSummaries", () => {
  it("counts a scene again once its text has changed, even to the same length", async () => {
    const files = createMemoryFileSystem({ "/kopia/scenes/S1.md": "Ett två tre" });
    await readSceneSummaries(files, "/kopia", ["S1"]);
    await files.writeText("/kopia/scenes/S1.md", "Ett tvåtre!");

    const summaries = await readSceneSummaries(files, "/kopia", ["S1"]);

    expect(summaries["S1"]?.words).toBe(2);
  });

  it("reads each scene's title and word count and names a scene without a title", async () => {
    const files = createMemoryFileSystem({
      "/bok/scenes/SCENE1.md": "---\nid: SCENE1\ntitle: Köket\n---\nBrevet låg där.",
      "/bok/scenes/SCENE2.md": "Bara text.",
    });

    const summaries = await readSceneSummaries(files, "/bok", ["SCENE1", "SCENE2"]);

    expect(summaries).toEqual({
      SCENE1: { title: "Köket", words: 3, status: "idé" },
      SCENE2: { title: "Namnlös scen", words: 2, status: "idé" },
    });
  });
});

describe("readSceneSummaries for notes", () => {
  it("count a note's unanswered questions as no words, and a scene's comment as no words either", async () => {
    const text = "**Vill:**\n\n<!-- Vad jagar hen? -->\n";
    const files = createMemoryFileSystem({
      "/bok/scenes/NOTE.md": text,
      "/bok/scenes/SCENE.md": text,
    });

    const summaries = await readSceneSummaries(files, "/bok", ["NOTE", "SCENE"], {
      noteIds: new Set(["NOTE"]),
    });

    expect(summaries["NOTE"]?.words).toBe(0);
    expect(summaries["SCENE"]?.words).toBe(1);
  });
});

describe("readSceneSummaries aliases", () => {
  it("read the other names of a note from its front matter", async () => {
    const files = createMemoryFileSystem({
      "/bok/scenes/ERIK.md":
        "---\nid: ERIK\ntitle: Erik Holm\naliases: Eken, Kommissarien\n---\nText.",
    });

    const summaries = await readSceneSummaries(files, "/bok", ["ERIK"]);

    expect(summaries["ERIK"]?.aliases).toEqual(["Eken", "Kommissarien"]);
  });
});

describe("readSceneSummaries with file times", () => {
  it("does not read a scene again while its file's time is the same", async () => {
    const files = createMemoryFileSystem({ "/tider/scenes/S1.md": "Ett två tre" });
    await readSceneSummaries(files, "/tider", ["S1"]);
    let reads = 0;
    const counting = { ...files, readText: (path: string) => (reads++, files.readText(path)) };

    const summaries = await readSceneSummaries(counting, "/tider", ["S1"]);

    expect(reads).toBe(0);
    expect(summaries["S1"]?.words).toBe(3);
  });
});

describe("a note without a title", () => {
  it("is named by its first line, as a sticky note is", async () => {
    const files = createMemoryFileSystem({
      "/bok/scenes/L1.md": "---\ncolor: gul\n---\n\nKolla årtalet på brevet.\nOch namnet.",
      "/bok/scenes/L2.md": "---\ncolor: gul\n---\n",
    });

    const summaries = await readSceneSummaries(files, "/bok", ["L1", "L2"], {
      noteIds: new Set(["L1", "L2"]),
    });

    expect(summaries["L1"]?.title).toBe("Kolla årtalet på brevet.");
    expect(summaries["L2"]?.title).toBe("Tom lapp");
  });
});

describe("an empty sticky note", () => {
  it("is called Tom lapp, not Namnlös scen", async () => {
    const files = createMemoryFileSystem({
      "/bok/scenes/LTOM.md": "---\nid: LTOM\ncolor: gul\nplace: 24, 24, 200, 180\n---\n",
    });

    const summaries = await readSceneSummaries(files, "/bok", ["LTOM"], {
      noteIds: new Set(["LTOM"]),
    });

    expect(summaries["LTOM"]?.title).toBe("Tom lapp");
  });
});
