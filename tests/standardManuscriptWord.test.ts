import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { bookOutline, readBookScenes } from "../src/export/book";
import { standardManuscript } from "../src/export/standardManuscript";
import { withSpecialFolders, type TreeNode } from "../src/project/tree";
import { createMemoryFileSystem } from "@llkit/storage/memoryFileSystem.js";

// What Word itself does with the manuscript: headings it can navigate by, real lists, small notes.

const tree: TreeNode[] = withSpecialFolders([
  { id: "kap1", kind: "chapter", title: "Brevet", children: [{ id: "01LISTA", kind: "scene" }] },
]);

const TEXT = [
  "Hon skrev upp det.[^1]",
  "::: punktlista\nMjöl\n\nÄgg\n:::",
  "::: numrerad\nFörst\n\nSedan\n:::",
  "::: numrerad\nIgen\n:::",
  "[^1]: Se *Isen bär*.",
].join("\n\n");

async function parts() {
  const files = createMemoryFileSystem({
    "/bok/scenes/01LISTA.md": `---\nid: 01LISTA\ntitle: Listan\n---\n${TEXT}\n`,
  });
  const scenes = await readBookScenes(files, "/bok", ["01LISTA"], {});
  const bytes = await standardManuscript({
    book: { title: "Vintervägen", subtitle: "", author: "Elin Berg", words: 12 },
    outline: bookOutline(tree),
    scenes,
    typography: "svensk",
    language: "sv-SE",
    hasTitlePage: false,
  });
  const zip = await JSZip.loadAsync(bytes);
  const read = async (name: string) => (await zip.file(name)?.async("string")) ?? "";
  return {
    document: await read("word/document.xml"),
    styles: await read("word/styles.xml"),
    notes: await read("word/footnotes.xml"),
    numbering: await read("word/numbering.xml"),
  };
}

describe("the standard manuscript in Word", () => {
  it("gives a chapter heading Word's heading style, so the navigation pane lists it", async () => {
    const { document } = await parts();

    expect(document).toMatch(/<w:pStyle w:val="Heading1"\/>[\s\S]*Kapitel 1[\s\S]*Brevet/);
  });

  it("makes lists Word's own, a numbered list starting again at 1, with no typed marks", async () => {
    const { document, numbering } = await parts();

    expect(document).not.toContain("•");
    expect(document).not.toContain("1.\t");
    expect(numbering).toContain('w:val="bullet"');
    expect(numbering).toContain('w:val="decimal"');
    expect(document.match(/<w:numId w:val="(\d+)"\/>/g)?.length).toBe(5);
    const numberedIds = [...document.matchAll(/<w:numId w:val="(\d+)"\/>/g)].map(
      (match) => match[1],
    );
    expect(new Set(numberedIds.slice(2)).size).toBe(2);
  });

  it("sets footnotes small and single spaced, with their italics", async () => {
    const { styles, notes } = await parts();

    expect(styles).toMatch(/w:styleId="FootnoteText"[\s\S]*?w:line="240"[\s\S]*?w:val="20"/);
    expect(notes).toMatch(/<w:i\/>[\s\S]*Isen bär/);
  });
});

describe("headings in a book with parts", () => {
  it("make a part Heading 1 and its chapters Heading 2", async () => {
    const files = createMemoryFileSystem({
      "/bok/scenes/01LISTA.md": "---\nid: 01LISTA\ntitle: Listan\n---\nText.\n",
    });
    const withPart = withSpecialFolders([
      { id: "del1", kind: "part", title: "Vintern", children: tree.slice(0, 1) },
    ]);
    const bytes = await standardManuscript({
      book: { title: "Vintervägen", subtitle: "", author: "Elin Berg", words: 1 },
      outline: bookOutline(withPart),
      scenes: await readBookScenes(files, "/bok", ["01LISTA"], {}),
      typography: "svensk",
      language: "sv-SE",
      hasTitlePage: false,
    });
    const zip = await JSZip.loadAsync(bytes);
    const xml = (await zip.file("word/document.xml")?.async("string")) ?? "";

    expect(xml).toMatch(/Heading1"\/>[\s\S]*Del I[\s\S]*Heading2"\/>[\s\S]*Kapitel 1/);
  });
});
