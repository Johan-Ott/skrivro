import { Bookmark, Document, Packer, Paragraph, TextRun } from "docx";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const KOKET = "01J9Z4K2QX0000000000000001";

// The first page of a file sent with Skicka till redaktör, with the editor's letter written in.
const letterPage = (letter: string) => [
  new Paragraph({
    children: [new TextRun("Till redaktören"), new Bookmark({ id: "skrivro_BREV", children: [] })],
  }),
  new Paragraph({ children: [new TextRun(letter)] }),
  new Paragraph({ children: [new Bookmark({ id: "skrivroend_BREV", children: [] })] }),
];

// The example's first scene as an editor might send it back: one word changed, one sentence cut.
export async function editorsFile(folder: string, letter?: string) {
  const paragraph = (text: string, marks: { start?: boolean; end?: boolean } = {}) =>
    new Paragraph({
      children: [
        ...(marks.start ? [new Bookmark({ id: `skrivro_${KOKET}`, children: [] })] : []),
        new TextRun(text),
        ...(marks.end ? [new Bookmark({ id: `skrivroend_${KOKET}`, children: [] })] : []),
      ],
    });
  const doc = new Document({
    lastModifiedBy: "Lena Ek",
    sections: [
      {
        children: [
          ...(letter ? letterPage(letter) : []),
          paragraph(
            "Brevet låg på köksbordet när Elin kom in från kylan. Kuvertet var gult av ålder, och handstilen kände hon igen innan hon ens hunnit ta av sig vantarna.",
            { start: true },
          ),
          paragraph("– Det kom i morse, sa Arvid utan att se upp från spisen.", { end: true }),
        ],
      },
    ],
  });
  mkdirSync(folder, { recursive: true });
  const path = join(folder, "redigerad.docx");
  writeFileSync(path, await Packer.toBuffer(doc));
  return path;
}
