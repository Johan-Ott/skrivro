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
