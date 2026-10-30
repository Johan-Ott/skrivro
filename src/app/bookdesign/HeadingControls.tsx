import { HEADING_FONTS } from "../../export/fonts.js";
import {
  CHAPTER_LABELS,
  type BookDesign,
  type ChapterLabel,
  type TitleCase,
} from "../../export/bookDesign.js";
import { ChoiceRow } from "./ChoiceRow.js";
import { t } from "../../i18n/i18n.js";

export type ControlProps = {
  design: BookDesign;
  save: (change: Partial<BookDesign>) => void;
  /** The book's folder, where its pictures are kept. */
  dir: string;
};

const LABEL_NAMES: Record<ChapterLabel, string> = {
  ord: t("Kapitel 1"),
  siffra: "1",
  romersk: "I",
  ingen: t("Ingen"),
};
const LABEL_CHOICES: [string, string][] = CHAPTER_LABELS.map((label) => [
  label,
  LABEL_NAMES[label],
]);
const FONT_CHOICES: [string, string][] = HEADING_FONTS.map((font) => [font, font]);
const CASE_CHOICES: [TitleCase, string][] = [
  ["vanlig", t("Vanlig")],
  ["kapitaler", t("Kapitäler")],
  ["versaler", t("VERSALER")],
];

/** How every chapter's heading is set: its number, typeface and capitals. */
export function HeadingControls({ design, save }: ControlProps) {
  return (
    <>
      <ChoiceRow
        label={t("Numrering")}
        value={design.chapterLabel}
        choices={LABEL_CHOICES}
        onChoose={(chapterLabel) => save({ chapterLabel: chapterLabel as ChapterLabel })}
      />
      <ChoiceRow
        label={t("Typsnitt")}
        value={design.headingFont}
        choices={FONT_CHOICES}
        onChoose={(headingFont) => save({ headingFont })}
      />
      <ChoiceRow
        label={t("Titel")}
        value={design.titleCase}
        choices={CASE_CHOICES}
        onChoose={(titleCase) => save({ titleCase: titleCase as TitleCase })}
      />
    </>
  );
}
