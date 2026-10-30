import { useEffect, useState } from "react";
import type { BookExtras } from "../../export/bookParts.js";
import { TypstError } from "../../export/typstError.js";
import { typstFiles, typstSource } from "../../export/typstBook.js";
import type { PageMarks, Sheets, TypstFiles } from "../../export/typstCompile.js";
import { recordFailure } from "@llkit/errorLog.js";
import { appTypst } from "../typstAssets.js";
import type { Project } from "../useProject.js";
import { bookMaterial, chosenExtras, printInput, withExcerpt } from "../exporting/bookMaterial.js";
import type { ExportChoices } from "../exporting/useExport.js";
import { t } from "../../i18n/i18n.js";

// Waits for the writer to stop clicking before setting the pages again.
const SETTLE_MS = 300;

/** The whole book set as the tryck-PDF will be, with where each part opens. */
export interface SetBook {
  source: string;
  files: TypstFiles;
  marks: PageMarks;
  extras: BookExtras;
}

export type BookPages =
  { kind: "working" } | { kind: "ready"; book: SetBook } | { kind: "failed"; reason: string };

// Same Typst, template and parts as the PDF, so the preview matches it.
async function setBook(project: Project, generalAuthor: string, choices: ExportChoices) {
  const material = await bookMaterial(project, generalAuthor);
  const extras = await withExcerpt(chosenExtras(project, choices), project, choices);
  const input = { ...printInput({ project, material, choices, extras }), markPages: true };
  const [source, files] = [typstSource(input), typstFiles(input)];
  const marks = await appTypst.pageMarks(source, files);
  return { source, files, marks, extras };
}

/** The last book set stays on screen while the next one is set. */
export function usePrintPreview(project: Project, generalAuthor: string, choices: ExportChoices) {
  const [pages, setPages] = useState<BookPages>({ kind: "working" });
  useEffect(() => {
    let isCurrent = true;
    const timer = setTimeout(() => {
      setBook(project, generalAuthor, choices)
        .then((book) => isCurrent && setPages({ kind: "ready", book }))
        .catch((error: unknown) => {
          const reason =
            error instanceof TypstError ? error.message : t("Boken kunde inte sättas.");
          if (isCurrent) setPages({ kind: "failed", reason });
        });
    }, SETTLE_MS);
    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [project, generalAuthor, choices]);
  return pages;
}

/** Row 0 is page 1 alone on the right; then 2 and 3, 4 and 5. */
export const sheetsOf = (row: number): Sheets => (row === 0 ? [0, 0] : [2 * row - 1, 2 * row]);
export const rowOf = (sheet: number) => Math.floor((sheet + 1) / 2);
export const rowCount = (pages: number) => Math.ceil((pages + 1) / 2);

/** Only the spread on screen is drawn, so a long book turns as fast as a short one. */
export function useSpread(book: SetBook | null, row: number) {
  const [spread, setSpread] = useState<{ svg: string; row: number } | null>(null);
  useEffect(() => {
    if (!book) return;
    let isCurrent = true;
    appTypst
      .svg(book.source, book.files, sheetsOf(row))
      .then((svg) => isCurrent && setSpread({ svg, row }))
      .catch(recordFailure("Uppslag"));
    return () => {
      isCurrent = false;
    };
  }, [book, row]);
  return spread;
}
