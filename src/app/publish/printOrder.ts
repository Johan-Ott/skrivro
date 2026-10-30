import type { OutlineItem } from "../../export/book.js";
import { backTexts, type BookExtras } from "../../export/bookParts.js";
import { contentsLabel } from "../../export/bookWords.js";
import type { PageMarks } from "../../export/typstCompile.js";
import { EXTRA_FIELDS } from "../exporting/bookMaterial.js";
import { PARTS, isExtra, type PartKey } from "../exporting/PartFields.js";
import type { ExportChoices } from "../exporting/useExport.js";
import { t } from "../../i18n/i18n.js";

/** One row in Publicera's sidebar: a part of the book in the order it is printed. */
export interface BookPart {
  id: string;
  label: string;
  /** Beside its name: its page, or what it is. */
  meta: string;
  /** "auto" is made by the book itself; "empty" is on but has nothing to print yet. */
  state: "done" | "auto" | "empty";
  /** The sheet it opens on, counted from 0; null when it is not in the print. */
  sheet: number | null;
  isChapter?: boolean;
  /** The choice that takes it in or out of the book. */
  choice?: PartKey;
}

export interface PartGroup {
  heading: string;
  parts: BookPart[];
}

export interface OrderInput {
  choices: ExportChoices;
  /** The texts the book was set with; the excerpt only once it has been read. */
  extras: BookExtras;
  fields: Record<string, unknown>;
  outline: OutlineItem[];
  /** Null until Typst has set the book. */
  marks: PageMarks | null;
  language: string;
  hasCover: boolean;
}

type Opening = Extract<OutlineItem, { kind: "part" | "chapter" }>;

// Each takes one page before the text, in this order.
const FRONT: PartKey[] = ["hasTitlePage", "hasCopyrightPage", "hasDedication", "hasContents"];
// As backTexts names the texts after the story; the store links are never printed.
const BACK_IDS: Partial<Record<PartKey, string>> = {
  hasThanks: "thanks",
  hasAbout: "about",
  hasAlsoBy: "also-by",
  hasNewsletter: "newsletter",
  hasExcerpt: "excerpt",
};
const META: Partial<Record<PartKey, string>> = {
  hasContents: t("av sig själv"),
  hasStores: t("bara e-bok"),
};

const labelOf = (key: PartKey) => PARTS.find(([part]) => part === key)?.[1] ?? key;
const page = (folio: number) => t("s. {page}", { page: folio });

// A text that is on but empty, or an excerpt with no book picked, prints nothing.
function hasText(key: PartKey, fields: Record<string, unknown>) {
  if (key === "hasExcerpt") return Boolean(fields["excerptBook"]);
  return !isExtra(key) || String(fields[EXTRA_FIELDS[key]] ?? "").trim() !== "";
}

function partOf(key: PartKey, fields: Record<string, unknown>, sheet: number | null): BookPart {
  const base = { id: key, label: labelOf(key), choice: key };
  if (!hasText(key, fields)) return { ...base, meta: t("tom"), state: "empty", sheet: null };
  const meta = META[key];
  return { ...base, meta: meta ?? "", state: meta ? "auto" : "done", sheet };
}

function frontParts({ choices, fields }: OrderInput) {
  const shown = FRONT.filter((key) => choices[key]);
  const printed = shown.filter((key) => hasText(key, fields));
  return shown.map((key) => partOf(key, fields, printed.indexOf(key)));
}

// Each part and chapter where Typst opened it; a book without chapters is one text.
function storyParts({ outline, marks, language }: OrderInput, frontPages: number): BookPart[] {
  const openings = outline.filter((item): item is Opening => item.kind !== "scene");
  if (openings.length === 0) {
    const sheet = frontPages + (frontPages % 2);
    return [{ id: "text", label: t("Texten"), meta: page(1), state: "done", sheet }];
  }
  const hasParts = openings.some((item) => item.kind === "part");
  return openings.map((item, index) => {
    const opening = marks?.openings[index];
    return {
      id: `story-${index}`,
      label: contentsLabel(item, language),
      meta: opening ? page(opening.folio) : "",
      state: "done",
      sheet: opening?.sheet ?? null,
      isChapter: hasParts && item.kind === "chapter",
    };
  });
}

// The texts after the story open as chapters do, right after the story's own openings.
function backParts(input: OrderInput, storyOpenings: number) {
  const printed = backTexts(input.extras, input.language, false).map((text) => text.id);
  const shown = PARTS.map(([key]) => key).filter((key) => !FRONT.includes(key));
  return shown
    .filter((key) => input.choices[key])
    .map((key) => {
      const index = printed.indexOf(BACK_IDS[key] ?? "");
      const opening = index === -1 ? undefined : input.marks?.openings[storyOpenings + index];
      const part = partOf(key, input.fields, opening?.sheet ?? null);
      return opening ? { ...part, meta: page(opening.folio) } : part;
    });
}

/** The book's parts as the tryck-PDF prints them: before the text, the text, after it. */
export function printOrder(input: OrderInput): PartGroup[] {
  const cover: BookPart = {
    id: "omslag",
    label: t("Omslag"),
    meta: input.hasCover ? t("din bild") : t("textomslag"),
    state: input.hasCover ? "done" : "auto",
    sheet: null,
  };
  const front = frontParts(input);
  const frontPages = front.filter((part) => part.sheet !== null).length;
  const storyOpenings = input.outline.filter((item) => item.kind !== "scene").length;
  const groups = [
    { heading: t("Före texten"), parts: [cover, ...front] },
    { heading: t("Texten"), parts: storyParts(input, frontPages) },
    { heading: t("Efter texten"), parts: backParts(input, storyOpenings) },
  ];
  return groups.filter((group) => group.parts.length > 0);
}

export const allParts = (groups: PartGroup[]) => groups.flatMap((group) => group.parts);

/** The part a spread shows: the last one that opens on it or before it. */
export function partAt(groups: PartGroup[], row: number) {
  const lastSheet = row === 0 ? 0 : 2 * row;
  const opened = allParts(groups).filter((part) => part.sheet !== null && part.sheet <= lastSheet);
  return opened.at(-1)?.id ?? null;
}
