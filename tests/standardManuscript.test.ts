import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { bookDetails, bookOutline, ExportError, readBookScenes } from "../src/export/book";
import { standardManuscript } from "../src/export/standardManuscript";
import { withSpecialFolders, type TreeNode } from "../src/project/tree";
import { createMemoryFileSystem } from "@llkit/storage/memoryFileSystem.js";

const tree: TreeNode[] = withSpecialFolders([
  {
    id: "del1",
    kind: "part",
    title: "Vintern",
    children: [
      {
        id: "kap1",
        kind: "chapter",
        title: "Brevet",
        children: [
          { id: "01KOKET", kind: "scene" },
          { id: "01ISEN", kind: "scene" },
        ],
      },
    ],
  },
]);
const scene = (id: string, title: string, body: string) =>
  `---\nid: ${id}\ntitle: ${title}\n---\n${body}`;
const FILES = {
  "/bok/scenes/01KOKET.md": scene("01KOKET", "Köket", "Brevet låg på *köksbordet*.\n\n– Vet du?\n"),
  "/bok/scenes/01ISEN.md": scene(
    "01ISEN",
    "Isen",
    "Hon sa ”nej” och gick.\n\n***\n\nSedan tystnad.\n",
  ),
};

async function documentXml(bytes: Uint8Array, part = "word/document.xml") {
  const zip = await JSZip.loadAsync(bytes);
  return (await zip.file(part)?.async("string")) ?? "";
}

describe("bookOutline", () => {
  it("lists parts, chapters and scenes in reading order, numbered", () => {
    const outline = bookOutline(tree);

    expect(outline).toEqual([
      { kind: "part", number: 1, title: "Vintern" },
      { kind: "chapter", number: 1, title: "Brevet" },
      { kind: "scene", id: "01KOKET" },
      { kind: "scene", id: "01ISEN" },
    ]);
  });
});

describe("readBookScenes", () => {
  it("names the scene that could not be read, so nothing half done is saved", async () => {
    const files = createMemoryFileSystem({
      "/bok/scenes/01KOKET.md": FILES["/bok/scenes/01KOKET.md"],
    });

    const reading = readBookScenes(files, "/bok", ["01KOKET", "01ISEN"], { "01ISEN": "Isen" });

    await expect(reading).rejects.toThrow(ExportError);
    await expect(reading).rejects.toMatchObject({ sceneTitle: "Isen" });
  });
});

describe("standardManuscript", () => {
  async function build(typography: "svensk" | "engelsk" = "svensk", language = "sv-SE") {
    const files = createMemoryFileSystem(FILES);
    const scenes = await readBookScenes(files, "/bok", ["01KOKET", "01ISEN"], {});
    const book = { title: "Vintervägen", subtitle: "Roman", author: "Elin Berg", words: 48_210 };
    return standardManuscript({
      book,
      outline: bookOutline(tree),
      scenes,
      typography,
      language,
      hasTitlePage: true,
    });
  }

  it("writes the parts, chapters and scene text, with italics and scene breaks", async () => {
    const xml = await documentXml(await build());

    expect(xml).toContain("Del I");
    expect(xml).toContain("Kapitel 1");
    expect(xml).toContain("Brevet");
    expect(xml).toContain("köksbordet");
    expect(xml).toContain("<w:i/>");
    expect(xml).toContain("* * *");
    expect(xml).toContain("Sedan tystnad.");
  });

  it("prints its fixed words in the book's language", async () => {
    const bytes = await build("engelsk", "en-GB");
    const xml = await documentXml(bytes);
    const styles = await documentXml(bytes, "word/styles.xml");

    expect(xml).toContain("Part I");
    expect(xml).toContain("Chapter 1");
    expect(xml).toContain("approx. 48,200 words");
    expect(xml).toContain("by Elin Berg");
    expect(styles).toContain('w:lang w:val="en-GB"');
  });

  it("has a title page with author, word count and title, and the standard page set-up", async () => {
    const bytes = await build();
    const xml = await documentXml(bytes);
    const styles = await documentXml(bytes, "word/styles.xml");

    expect(xml).toContain("Elin Berg");
    expect(xml).toMatch(/ca 48\s200 ord/);
    expect(xml).toContain("VINTERVÄGEN");
    expect(styles).toContain('w:line="480"');
    expect(styles).toContain("Times New Roman");
  });

  it("puts surname, title and page number in the header", async () => {
    const zip = await JSZip.loadAsync(await build());
    const headers = await Promise.all(
      Object.keys(zip.files)
        .filter((name) => name.startsWith("word/header"))
        .map((name) => zip.file(name)?.async("string") ?? ""),
    );

    expect(headers.join("")).toContain("Berg / Vintervägen / ");
    expect(headers.join("")).toContain("PAGE");
  });

  it("turns Swedish quotes into English ones when asked", async () => {
    const [swedish, english] = [
      await documentXml(await build()),
      await documentXml(await build("engelsk")),
    ];

    expect(swedish).toContain("”nej”");
    expect(english).toContain("“nej”");
  });
});

describe("book details", () => {
  it("take the author from the project, else from Inställningar, and the subtitle from the type", () => {
    const fields = { title: "Vintervägen", type: "roman" };

    const own = bookDetails({ ...fields, author: "E. Berg" }, "Elin Berg", 1000);
    const general = bookDetails(fields, "Elin Berg", 1000);

    expect(own).toEqual({
      title: "Vintervägen",
      subtitle: "Roman",
      author: "E. Berg",
      words: 1000,
    });
    expect(general.author).toBe("Elin Berg");
  });
});
