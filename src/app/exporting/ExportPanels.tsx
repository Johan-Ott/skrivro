import { bookDetails, bookOutline, estimatedPages, type BookDetails } from "../../export/book.js";
import { epubCover } from "../../export/epubCover.js";
import { manuscriptWords } from "../../project/treeLabels.js";
import type { Project } from "../useProject.js";
import { PrintPreview } from "../bookdesign/PrintPreview.js";
import type { ExportFormat, ExportState } from "./useExport.js";
import { formatNumber, t } from "../../i18n/i18n.js";
import { platform } from "../platform.js";

function CoverPreview(props: { book: BookDetails; coverUrl: string | null; label: string }) {
  const cover =
    props.coverUrl ??
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(epubCover(props.book))}`;
  return (
    <div className="export-preview">
      <span className="setting-hint">{props.label}</span>
      <img className="export-cover" src={cover} alt={t("Omslaget som e-boken får")} />
    </div>
  );
}

// The title page of what the format makes; a text format has no pages of its own.
function TitlePage({ book, note }: { book: BookDetails; note: string }) {
  return (
    <div className="export-page">
      <span className="export-page-title">{book.title}</span>
      {book.subtitle && <span className="export-page-subtitle">{book.subtitle}</span>}
      <span className="export-page-author">{book.author || t("[FÖRFATTARNAMN]")}</span>
      <span className="export-page-note">{note}</span>
    </div>
  );
}

/** A standard manuscript without the writer's name would reach a publisher without one. */
export function authorWarning(book: BookDetails, format: ExportFormat) {
  return format === "manus" && !book.author.trim() ? t("Författarnamnet saknas.") : null;
}

/** Before the export, as the placeholders are told: it is still made, with the way to the name. */
export function AuthorWarning(props: {
  project: Project;
  generalAuthor: string;
  format: ExportFormat;
  onShow: () => void;
}) {
  const book = bookDetails(props.project.fields, props.generalAuthor, 0);
  const warning = authorWarning(book, props.format);
  if (!warning) return null;
  return (
    <p className="setting-hint" role="status">
      {warning}{" "}
      <button className="link-button" onClick={props.onShow}>
        {t("Fyll i under Bokuppgifter")}
      </button>
    </p>
  );
}

function PagePreview(props: { book: BookDetails; isPlain: boolean; words: number; pages: number }) {
  const { isPlain, words, pages } = props;
  return (
    <div className="export-preview">
      <span className="setting-hint">
        {isPlain ? t("Förhandsvisning · Ren text") : t("Förhandsvisning · Standardmanus")}
      </span>
      <TitlePage
        book={props.book}
        note={
          isPlain
            ? t("Texten utan sidor · {words} ord", { words: formatNumber(words) })
            : t("Titelsida · ca {pages} sidor", { pages })
        }
      />
    </div>
  );
}

const PLAIN: ExportFormat[] = ["markdown", "mappar", "text", "html"];

export function Preview(props: {
  project: Project;
  generalAuthor: string;
  format: ExportFormat;
  coverUrl: string | null;
}) {
  const { project, generalAuthor } = props;
  const words = manuscriptWords(project.tree, project.summaries);
  const details = bookDetails(project.fields, generalAuthor, words);
  const book = { ...details, title: details.title || project.name };
  const pages = estimatedPages(words, bookOutline(project.tree));
  const { format, coverUrl } = props;
  if (format === "tryck") return <PrintPreview project={project} generalAuthor={generalAuthor} />;
  if (format === "ebok" || format === "omslag") {
    const label =
      format === "ebok" ? t("Förhandsvisning · E-bok") : t("Förhandsvisning · Framsidan");
    return <CoverPreview book={book} coverUrl={coverUrl} label={label} />;
  }
  return <PagePreview book={book} isPlain={PLAIN.includes(format)} words={words} pages={pages} />;
}

type Failure = Extract<ExportState, { kind: "failed" }>;

const GoToScene = (props: { title: string; onOpenScene: (title: string) => void }) => (
  <button className="button secondary small" onClick={() => props.onOpenScene(props.title)}>
    {t("Gå till scenen")}
  </button>
);

function ExportFailure(props: {
  failure: Failure;
  onOpenScene: (title: string) => void;
  onClose: () => void;
}) {
  const { failure } = props;
  return (
    <div className="export-error" role="alert">
      <span className="progress-title">
        {failure.sceneTitle
          ? t("Exporten stoppades i ”{title}”", { title: failure.sceneTitle })
          : t("Exporten stoppades")}
      </span>
      <span className="setting-hint">
        {t("{reason} Inget har sparats.", { reason: failure.reason })}
      </span>
      <span className="export-error-actions">
        {failure.sceneTitle && (
          <GoToScene title={failure.sceneTitle} onOpenScene={props.onOpenScene} />
        )}
        <button className="link-button quiet" onClick={props.onClose}>
          {t("Stäng")}
        </button>
      </span>
    </div>
  );
}

function ExportRunning(props: {
  state: Extract<ExportState, { kind: "running" }>;
  onCancel: () => void;
}) {
  const { chapter, chapters } = props.state;
  return (
    <div className="export-running" role="status">
      <div className="export-running-row">
        <span>{t("Exporterar…")}</span>
        {chapters > 0 && (
          <span className="kpi-sub">
            {t("Kapitel {chapter} av {chapters}", { chapter, chapters })}
          </span>
        )}
      </div>
      <div className="progress-bar">
        <div style={{ width: `${chapters ? (100 * chapter) / chapters : 0}%` }} />
      </div>
      <button className="link-button quiet" onClick={props.onCancel}>
        {t("Avbryt")}
      </button>
    </div>
  );
}

function ExportSaved(props: {
  state: Extract<ExportState, { kind: "saved" }>;
  onClose: () => void;
}) {
  const { showInFolder } = platform;
  return (
    <div className="toast inverted" role="status">
      <span>
        {/* A phone hands the file to its share sheet, which does not say where it went. */}
        {platform.shareFile
          ? t("{file} är klar", { file: props.state.fileName })
          : t("{file} är sparad", { file: props.state.fileName })}
      </span>
      {showInFolder && (
        <button
          className="button secondary small"
          onClick={() => void showInFolder(props.state.path)}
        >
          {t("Visa i mappen")}
        </button>
      )}
      <button className="link-button" onClick={props.onClose}>
        {t("Stäng")}
      </button>
    </div>
  );
}

export function ExportStatus(props: {
  exporter: { state: ExportState; reset: () => void; cancel: () => void };
  onOpenScene: (title: string) => void;
}) {
  const { state, reset, cancel } = props.exporter;
  if (state.kind === "failed") {
    return <ExportFailure failure={state} onOpenScene={props.onOpenScene} onClose={reset} />;
  }
  if (state.kind === "running") return <ExportRunning state={state} onCancel={cancel} />;
  if (state.kind !== "saved") return null;
  return <ExportSaved state={state} onClose={reset} />;
}
