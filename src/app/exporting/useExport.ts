import { useRef, useState } from "react";
import { ExportError, type Typography } from "../../export/book.js";
import { TypstError } from "../../export/typstError.js";
import { typstFiles, typstSource } from "../../export/typstBook.js";
import { latestAnswer } from "../../project/rounds.js";
import { seriesDirOf } from "../../project/series.js";
import { bookLanguage, quoteStyleFor } from "../../project/bookLanguage.js";
import { recordFailure } from "@llkit/errorLog.js";
import { ebookFile, isPlain, plainFile } from "./exportFiles.js";
import type { PlainFormat } from "../../export/plainFormats.js";
import { platform, type FileKind } from "../platform.js";
import { appTypst } from "../typstAssets.js";
import type { Project } from "../useProject.js";
import {
  bookMaterial,
  chosenExtras,
  printInput,
  withExcerpt,
  type ExportProgress,
} from "./bookMaterial.js";
import { t } from "../../i18n/i18n.js";

export type ExportState =
  | { kind: "idle" }
  | { kind: "running"; chapter: number; chapters: number }
  | { kind: "saved"; fileName: string; path: string }
  /** `sceneTitle`: the scene the export stopped at; null when it was the file that failed. */
  | { kind: "failed"; sceneTitle: string | null; reason: string };

export type ExportFormat = "manus" | "ebok" | "tryck" | "omslag" | "mappar" | PlainFormat;

export interface ExportChoices {
  format: ExportFormat;
  typography: Typography;
  hasTitlePage: boolean;
  hasCopyrightPage: boolean;
  hasContents: boolean;
  hasDedication: boolean;
  hasThanks: boolean;
  hasAbout: boolean;
  hasAlsoBy: boolean;
  hasNewsletter: boolean;
  hasStores: boolean;
  hasExcerpt: boolean;
  /** Skicka till redaktör: the Word file starts with a page to the editor. */
  hasLetterPage: boolean;
}

type SaveFields = (fields: Record<string, unknown>) => void;

// The quotes follow the book's language until the writer picks the other kind.
export const startChoices = (project: Project): ExportChoices => ({
  format: "ebok",
  typography: quoteStyleFor(bookLanguage(project.fields)),
  hasTitlePage: true,
  hasCopyrightPage: true,
  hasContents: true,
  hasDedication: false,
  hasThanks: false,
  hasAbout: true,
  hasAlsoBy: false,
  hasNewsletter: false,
  hasStores: false,
  hasExcerpt: false,
  hasLetterPage: false,
});

const FILE_KINDS: Record<ExportFormat, FileKind> = {
  manus: { name: "Word-dokument", extension: "docx" },
  ebok: { name: t("E-bok"), extension: "epub" },
  tryck: { name: t("PDF för tryck"), extension: "pdf" },
  omslag: { name: t("PDF för tryck"), extension: "pdf" },
  markdown: { name: "Markdown", extension: "md" },
  text: { name: t("Text"), extension: "txt" },
  html: { name: t("Webbsida"), extension: "html" },
  mappar: { name: t("Zip-arkiv"), extension: "zip" },
};

const fileNameOf = (path: string) => path.slice(path.lastIndexOf("/") + 1);

interface ExportJob {
  onProgress: ExportProgress;
  project: Project;
  generalAuthor: string;
  choices: ExportChoices;
  saveFields: SaveFields;
}

async function buildFile({ project, generalAuthor, choices, saveFields, onProgress }: ExportJob) {
  if (choices.format === "mappar") {
    const { markdownFolderZip } = await import("../../export/markdownFolder.js");
    return markdownFolderZip(platform.fileSystem, project);
  }
  const material = await bookMaterial(project, generalAuthor, onProgress);
  const language = bookLanguage(project.fields);
  if (isPlain(choices.format)) return plainFile(material, choices, language);
  if (choices.format === "manus") {
    const { standardManuscript } = await import("../../export/standardManuscript.js");
    const letter = choices.hasLetterPage
      ? await latestAnswer(platform.fileSystem, project.dir)
      : null;
    return standardManuscript({ ...material, ...choices, language, letter });
  }
  const extras = await withExcerpt(chosenExtras(project, choices), project, choices);
  if (choices.format === "omslag") {
    const { printCoverPdf } = await import("./printCover.js");
    return printCoverPdf(project, material, choices, extras);
  }
  if (choices.format === "tryck") {
    const input = printInput({ project, material, choices, extras });
    return appTypst.pdf(typstSource(input), typstFiles(input));
  }
  return ebookFile({ project, material, choices, extras, language, saveFields });
}

// The cover is a PDF of its own beside the book's, so it gets a name of its own.
function fileNameFor({ project, choices }: ExportJob) {
  const name = choices.format === "omslag" ? `${project.name} omslag` : project.name;
  return `${name}.${FILE_KINDS[choices.format].extension}`;
}

function saved(path: string): ExportState {
  return { kind: "saved", fileName: fileNameOf(path), path };
}

async function exportBook(job: ExportJob, isCancelled: () => boolean): Promise<ExportState> {
  try {
    const bytes = await buildFile(job);
    if (isCancelled()) return { kind: "idle" };
    const kind = FILE_KINDS[job.choices.format];
    const path = await platform.saveFile(fileNameFor(job), bytes, kind);
    return path ? saved(path) : { kind: "idle" };
  } catch (error) {
    recordFailure("Export")(error);
    const known = error instanceof ExportError;
    const reason = error instanceof TypstError ? `Typst: ${error.message}` : null;
    return {
      kind: "failed",
      sceneTitle: known ? error.sceneTitle : null,
      reason: known ? error.reason : (reason ?? t("Filen kunde inte skapas eller sparas.")),
    };
  }
}

const BACKUP_KIND: FileKind = { name: t("Zip-arkiv"), extension: "zip" };

async function saveBackup(project: Project): Promise<ExportState> {
  try {
    const seriesDir = seriesDirOf(project.dir, project.fields);
    const hasSeries = seriesDir !== null && (await platform.folderExists(seriesDir));
    const dirs = hasSeries ? [project.dir, seriesDir] : [project.dir];
    const { projectZip } = await import("../../export/projectZip.js");
    const bytes = await projectZip(platform.fileSystem, dirs);
    const name = `${project.name} ${new Date().toISOString().slice(0, 10)}.zip`;
    const path = await platform.saveFile(name, bytes, BACKUP_KIND);
    return path ? { kind: "saved", fileName: fileNameOf(path), path } : { kind: "idle" };
  } catch (error) {
    recordFailure("Säkerhetskopia")(error);
    return {
      kind: "failed",
      sceneTitle: null,
      reason: t("Säkerhetskopian kunde inte sparas."),
    };
  }
}

const STARTED: ExportState = { kind: "running", chapter: 0, chapters: 0 };

// Each run has a number; Avbryt moves on to the next, so an old run's result is dropped.
function useRuns() {
  const [state, setState] = useState<ExportState>({ kind: "idle" });
  const current = useRef(0);
  const finish = (run: number, next: ExportState) => run === current.current && setState(next);
  const cancel = () => {
    current.current += 1;
    setState({ kind: "idle" });
  };
  return { state, setState, current, finish, cancel };
}

export function useExport(project: Project | null, generalAuthor: string, saveFields: SaveFields) {
  const { state, setState, current, finish, cancel } = useRuns();
  const backup = async () => {
    if (!project) return;
    const runNumber = ++current.current;
    setState(STARTED);
    finish(runNumber, await saveBackup(project));
  };
  const run = async (choices: ExportChoices) => {
    if (!project) return;
    const runNumber = ++current.current;
    setState(STARTED);
    const onProgress: ExportProgress = (chapter, chapters) =>
      finish(runNumber, { kind: "running", chapter, chapters });
    const job = { project, generalAuthor, choices, saveFields, onProgress };
    finish(runNumber, await exportBook(job, () => runNumber !== current.current));
  };
  return {
    state,
    run: (choices: ExportChoices) => void run(choices),
    backup: () => void backup(),
    cancel,
    reset: () => setState({ kind: "idle" }),
  };
}
