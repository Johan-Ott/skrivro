import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { footnoteParagraph } from "../src/export/footnoteText";
import { parseMarkdown } from "../src/manuscript/parseMarkdown";
import { runs, type WordNotes } from "../src/export/wordRuns";
import { Document, Packer, Paragraph } from "docx";

const marksOf = (text: string) => {
  const found: string[] = [];
  footnoteParagraph(text).forEach((child) =>
    found.push(`${child.text ?? ""}:${child.marks.map((mark) => mark.type.name).join("+")}`),
  );
  return found;
};

describe("a footnote's own text", () => {
  it("keeps its italics and bold, as the text around it does", () => {
    expect(marksOf("Se *Isen bär* av **Berg**.")).toEqual([
      "Se :",
      "Isen bär:italic",
      " av :",
      "Berg:bold",
      ".:",
    ]);
  });

  it("keeps a word both bold and italic", () => {
    expect(marksOf("Se ***båda*** här.")).toEqual(["Se :", "båda:italic+bold", " här.:"]);
  });

  it("keeps several words both bold and italic, with no stars left", () => {
    expect(marksOf("Båda: ***fet och kursiv ihop***.")).toEqual([
      "Båda: :",
      "fet och kursiv ihop:italic+bold",
      ".:",
    ]);
  });

  it("reads marks inside marks", () => {
    expect(marksOf("**fet *och kursiv* inuti** samt *kursiv **fet** inuti*")).toEqual([
      "fet :bold",
      "och kursiv:italic+bold",
      " inuti:bold",
      " samt :",
      "kursiv :italic",
      "fet:italic+bold",
      " inuti:italic",
    ]);
  });

  it("is plain text when it has no marks, even with a heading sign first", () => {
    expect(marksOf("# 3 i listan")).toEqual(["# 3 i listan:"]);
  });

  it("is italic in Word, not written with stars", async () => {
    const doc = parseMarkdown("Text.[^1]\n\n[^1]: Se *Isen bär*.\n");
    const notes: WordNotes = { entries: {}, count: 0 };
    const children = runs(doc.child(0), { typography: "svensk", notes });
    const document = new Document({
      footnotes: notes.entries,
      sections: [{ children: [new Paragraph({ children })] }],
    });
    const zip = await JSZip.loadAsync(await Packer.toArrayBuffer(document));
    const xml = (await zip.file("word/footnotes.xml")?.async("string")) ?? "";

    expect(xml).not.toContain("*Isen");
    expect(xml).toMatch(/<w:i\/>[\s\S]*Isen bär/);
  });
});

describe("a footnote's italics in the other exports", () => {
  it("are italic in the PDF's Typst and in the e-book, not stars", async () => {
    const { sceneTypst } = await import("../src/export/typstText");
    const { sceneXhtml } = await import("../src/export/xhtml");
    const doc = parseMarkdown("Text.[^1]\n\n[^1]: Se *Isen bär*.\n");

    expect(sceneTypst(doc, { typography: "svensk", hasDropCap: false })).toContain(
      "#footnote[Se #emph[Isen bär].]",
    );
    expect(sceneXhtml(doc, "svensk", "s1")).toContain("<em>Isen bär</em>");
  });
});
