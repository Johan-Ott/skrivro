import type { RevisionChange } from "../../manuscript/revision.js";
import type { useRevision } from "./useRevision.js";
import { t } from "../../i18n/i18n.js";

type Revision = ReturnType<typeof useRevision>;

const shown = (text: string) => text.replace(/\n+/g, " ¶ ").trim();

const ChangeText = ({ change, className }: { change: RevisionChange; className: string }) => (
  <span className={className}>
    {change.removed && <del className="revision-removed">{shown(change.removed)}</del>}
    {change.removed && change.added && " "}
    {change.added && <ins className="revision-added">{shown(change.added)}</ins>}
  </span>
);

const changeKey = (change: RevisionChange) => `${change.from}:${change.removed}:${change.added}`;

function ChangeItem({ change, revision }: { change: RevisionChange; revision: Revision }) {
  return (
    <div className="review-item">
      <ChangeText change={change} className="review-text" />
      <div className="review-actions">
        <button className="button primary small" onClick={() => revision.accept(change)}>
          {t("Godta")}
        </button>
        <button className="button secondary small" onClick={() => revision.reject(change)}>
          {t("Avvisa")}
        </button>
      </div>
    </div>
  );
}

function RevisionActions({ revision }: { revision: Revision }) {
  const { changes } = revision;
  return (
    <div className="review-actions">
      {changes.length > 1 && (
        <button className="button secondary small" onClick={revision.acceptAll}>
          {t("Godta alla")}
        </button>
      )}
      <button className="link-button" onClick={revision.finish}>
        {changes.length === 0 ? t("Klar") : t("Klar, behåll resten som det är")}
      </button>
    </div>
  );
}

/** The editor's changes to the open scene, from the Word file read back in. */
export function RevisionSection({ revision }: { revision: Revision }) {
  if (!revision.isOpen) return null;
  const { changes } = revision;
  return (
    <section className="review-section">
      <span className="review-heading">
        {t("Ändringar att gå igenom")} {changes.length > 0 && `(${changes.length})`}
      </span>
      {changes.length === 0 && (
        <p className="review-empty">{t("Alla ändringar är genomgångna.")}</p>
      )}
      {changes.map((change) => (
        <ChangeItem key={changeKey(change)} change={change} revision={revision} />
      ))}
      <RevisionActions revision={revision} />
    </section>
  );
}

/** The same changes as cards in the margin, each beside its words through `data-change`. */
export function ChangeNotes({ revision }: { revision: Revision }) {
  return revision.changes.map((change, index) => (
    <div key={changeKey(change)} className="margin-note" data-change={index}>
      <span className="margin-note-kind">{t("Ändring")}</span>
      <ChangeText change={change} className="margin-note-body" />
      <span className="margin-note-actions">
        <button className="link-button" onClick={() => revision.accept(change)}>
          {t("Godta")}
        </button>
        <button className="link-button quiet" onClick={() => revision.reject(change)}>
          {t("Avvisa")}
        </button>
      </span>
    </div>
  ));
}
