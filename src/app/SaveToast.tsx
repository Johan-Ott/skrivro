import { useEffect, useState } from "react";
import type { SaveStatus } from "@llkit/storage/autosave.js";
import type { SaveFailure } from "@llkit/storage/saveError.js";
import { t, formatNumber } from "../i18n/i18n.js";
import { useShortcut } from "@llkit/keys.js";

const FAILURE_MESSAGES: Record<SaveFailure, string> = {
  blocked: t("Filen används av ett annat program, ofta molnsynken, eller är skrivskyddad."),
  diskFull: t("Disken är full."),
  readOnly: t("Enheten är skrivskyddad."),
  folderMissing: t("Bokens mapp hittas inte. Är disken eller molnmappen ansluten?"),
  unknown: t("Scenen kunde inte sparas."),
};

export function SaveToast({ status, onRetry }: { status: SaveStatus | null; onRetry: () => void }) {
  if (status?.kind !== "failed") return null;
  return (
    <div className="toast" role="alert">
      <span>
        {t("{reason} Din text finns kvar i appen.", { reason: FAILURE_MESSAGES[status.reason] })}
      </span>
      <span className="toast-meta">{t("Försöker igen…")}</span>
      <button className="link-button" onClick={onRetry}>
        {t("Försök nu")}
      </button>
    </div>
  );
}

export function TreeFailureToast({ failure }: { failure: SaveFailure | null }) {
  if (!failure) return null;
  return (
    <div className="toast" role="alert">
      <span>
        {t("Ordningen i strukturen kunde inte sparas. {reason}", {
          reason: FAILURE_MESSAGES[failure],
        })}
      </span>
      <span className="toast-meta">{t("Sparas vid nästa ändring")}</span>
    </div>
  );
}

export function ReadOnlyNotice({ isReadOnly }: { isReadOnly: boolean }) {
  if (!isReadOnly) return null;
  return (
    <div className="toast" role="status">
      <span>{t("Projektet är sparat av en nyare version av Skrivro och går bara att läsa.")}</span>
      <span className="toast-meta">{t("Uppdatera Skrivro för att skriva i det")}</span>
    </div>
  );
}

type TrashedProps = { label: string; onPutBack: () => void };

export function TrashedNotice({ trashed }: { trashed: TrashedProps | null }) {
  if (!trashed) return null;
  return (
    <div className="toast inverted" role="status">
      <span>{t("Scenen ligger i Papperskorgen och går bara att läsa.")}</span>
      <button className="link-button" onClick={trashed.onPutBack}>
        {trashed.label}
      </button>
    </div>
  );
}

const TOAST_MS = 8000;

export function ReplaceToast(props: {
  done: { count: number; search: string } | null;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  const { done, onDismiss } = props;
  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(onDismiss, TOAST_MS);
    return () => clearTimeout(timer);
  }, [done, onDismiss]);
  if (!done) return null;
  const noun = done.count === 1 ? t("förekomst") : t("förekomster");
  return (
    <div className="toast inverted" role="status">
      <span>
        {t("Ändrade {count} {noun} av ”{search}”", {
          count: formatNumber(done.count),
          noun,
          search: done.search,
        })}
      </span>
      <button className="link-button" onClick={props.onUndo}>
        {t("Ångra")}
      </button>
    </div>
  );
}

const SAVED_MS = 2500;

/** Ctrl+S saves what was just typed and says that Skrivro saves by itself. */
export function SavedNowToast({ onSave }: { onSave: () => Promise<boolean> }) {
  const [isShown, setShown] = useState(false);
  useShortcut("s", () => void onSave().then((isSaved) => isSaved && setShown(true)));
  useEffect(() => {
    if (!isShown) return;
    const timer = setTimeout(() => setShown(false), SAVED_MS);
    return () => clearTimeout(timer);
  }, [isShown]);
  if (!isShown) return null;
  return (
    <div className="toast inverted" role="status">
      <span>{t("Sparat")}</span>
      <span className="toast-meta">{t("Skrivro sparar av sig själv medan du skriver")}</span>
    </div>
  );
}
