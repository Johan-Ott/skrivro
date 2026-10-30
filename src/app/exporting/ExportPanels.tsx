import { bookDetails, type BookDetails } from "../../export/book.js";
import { epubCover } from "../../export/epubCover.js";
import { manuscriptWords } from "../../project/treeLabels.js";
import type { Project } from "../useProject.js";
import type { ExportState } from "./useExport.js";
import { t } from "../../i18n/i18n.js";
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

/** The front the e-book or the print cover gets: the writer's picture, or one made of the title. */
export function Preview(props: {
  project: Project;
  generalAuthor: string;
  format: "ebok" | "omslag";
  coverUrl: string | null;
}) {
  const { project, format } = props;
  const words = manuscriptWords(project.tree, project.summaries);
  const details = bookDetails(project.fields, props.generalAuthor, words);
  const book = { ...details, title: details.title || project.name };
  const label = format === "ebok" ? t("Förhandsvisning · E-bok") : t("Förhandsvisning · Framsidan");
  return <CoverPreview book={book} coverUrl={props.coverUrl} label={label} />;
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
    <div className="toast" role="status">
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
