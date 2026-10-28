import { useEffect, useState } from "react";
import { recordFailure } from "@llkit/errorLog.js";
import { platform } from "../platform.js";
import { t } from "../../i18n/i18n.js";

/** Copy and save on a computer; on a phone one Dela, which opens its share sheet. */
export function ImageActions(props: { onCopy: () => Promise<unknown>; onSave: () => void }) {
  if (platform.shareFile) {
    return (
      <div className="studio-actions">
        <button className="button primary" onClick={props.onSave}>
          {t("Dela bild")}
        </button>
      </div>
    );
  }
  return (
    <div className="studio-actions">
      <CopyButton className="button primary" label={t("Kopiera bild")} copy={props.onCopy} />
      <button className="button secondary" onClick={props.onSave}>
        {t("Spara bild")}
      </button>
    </div>
  );
}

/** A copy button that says Kopierad for a moment once it has, since a copy is otherwise unseen. */
export function CopyButton(props: {
  className: string;
  label: string;
  copy: () => Promise<unknown>;
}) {
  const [isCopied, setCopied] = useState(false);
  useEffect(() => {
    if (!isCopied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [isCopied]);
  const copy = () =>
    void props
      .copy()
      .then(() => setCopied(true))
      .catch(recordFailure("Kunde inte kopiera"));
  return (
    <button className={props.className} onClick={copy}>
      {isCopied ? t("Kopierad") : props.label}
    </button>
  );
}
