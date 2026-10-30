import { AlignmentType, Bookmark, Paragraph, TextRun } from "docx";
import { sceneEndMark, sceneStartMark } from "./sceneMarks.js";
import { t } from "../i18n/i18n.js";

/** The letter's marks carry this in place of a scene id; no scene has it. */
export const LETTER_ID = "BREV";

// The heading, a third of the way down as a chapter's is.
const DROP = 3600;

/**
 * The first page, to the editor: the writer's answer to the last round, room for the editor's
 * letter, and a line under it saying so. What is written between the two comes back as the letter.
 */
export function letterPage(answer: string[]): Paragraph[] {
  const fixed = [t("Till redaktören"), ...answer];
  const last = fixed.length - 1;
  return [
    ...fixed.map(
      (text, index) =>
        new Paragraph({
          ...(index === 0 ? { alignment: AlignmentType.CENTER, spacing: { before: DROP } } : {}),
          children: [
            new TextRun(text),
            ...(index === last
              ? [new Bookmark({ id: sceneStartMark(LETTER_ID), children: [] })]
              : []),
          ],
        }),
    ),
    new Paragraph({}),
    new Paragraph({
      children: [
        new Bookmark({ id: sceneEndMark(LETTER_ID), children: [] }),
        new TextRun({
          text: t(
            "Skriv ditt brev ovanför den här raden. Ändra och kommentera i texten som vanligt.",
          ),
          italics: true,
        }),
      ],
    }),
  ];
}
