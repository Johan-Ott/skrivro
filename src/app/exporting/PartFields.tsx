import { useState } from "react";
import { knownBooks } from "../shelf/useShelf.js";
import type { Project } from "../useProject.js";
import { EXTRA_FIELDS } from "./bookMaterial.js";
import type { ExportChoices } from "./useExport.js";
import { t } from "../../i18n/i18n.js";

export type PartKey = Exclude<keyof ExportChoices, "format" | "typography" | "hasLetterPage">;
type Props = { project: Project; onSaveFields: (fields: Record<string, unknown>) => void };

/** The parts a book can have besides its text, in print order. */
export const PARTS: [PartKey, string][] = [
  ["hasTitlePage", t("Titelsida")],
  ["hasCopyrightPage", t("Upphovsrättssida")],
  ["hasDedication", t("Dedikation")],
  ["hasContents", t("Innehållsförteckning")],
  ["hasThanks", t("Tack")],
  ["hasAbout", t("Om författaren")],
  ["hasAlsoBy", t("Av samma författare")],
  ["hasNewsletter", t("Håll kontakten")],
  ["hasStores", t("Var du hittar mina böcker")],
  ["hasExcerpt", t("Utdrag ur en annan bok")],
];

const PLACEHOLDERS: Record<keyof typeof EXTRA_FIELDS, string> = {
  hasDedication: "Till …",
  hasThanks: t("Tack till …"),
  hasAbout: t("Några rader om dig. En tom rad börjar ett nytt stycke."),
  hasAlsoBy: t("En titel per rad"),
  hasNewsletter: t("Vill du veta när nästa bok kommer? Skriv upp dig på https://…"),
  hasStores: t("En butik per rad: Adlibris https://…"),
};

export const isExtra = (key: PartKey): key is keyof typeof EXTRA_FIELDS => key in EXTRA_FIELDS;

// The other books on the shelf, the one being exported left out.
const otherBooks = (dir: string) =>
  knownBooks().filter((book) => book.dir !== dir && !book.isMissing);

export function PartText(props: Props & { part: keyof typeof EXTRA_FIELDS }) {
  const field = EXTRA_FIELDS[props.part];
  const saved = String(props.project.fields[field] ?? "");
  const [value, setValue] = useState(saved);
  const save = (text: string) =>
    text !== saved && props.onSaveFields({ [field]: text.trim() || undefined });
  const titles = otherBooks(props.project.dir)
    .map((book) => book.title)
    .join("\n");
  return (
    <>
      <textarea
        className="settings-text part-text"
        rows={3}
        aria-label={PLACEHOLDERS[props.part]}
        value={value}
        placeholder={PLACEHOLDERS[props.part]}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => save(value)}
      />
      {props.part === "hasAlsoBy" && !value && titles && (
        <button className="link-button quiet" onClick={() => (setValue(titles), save(titles))}>
          {t("Fyll i från bokhyllan")}
        </button>
      )}
    </>
  );
}

/** Its first chapter closes this book, read from the other book when this one is exported. */
export function ExcerptBook({ project, onSaveFields }: Props) {
  const books = otherBooks(project.dir);
  if (books.length === 0)
    return <span className="setting-hint">{t("Inga andra böcker på hyllan.")}</span>;
  return (
    <select
      className="settings-text"
      aria-label={t("Bok att ta utdraget ur")}
      value={String(project.fields["excerptBook"] ?? "")}
      onChange={(event) => onSaveFields({ excerptBook: event.target.value || undefined })}
    >
      <option value="">{t("Välj bok…")}</option>
      {books.map((book) => (
        <option key={book.dir} value={book.dir}>
          {book.title}
        </option>
      ))}
    </select>
  );
}
