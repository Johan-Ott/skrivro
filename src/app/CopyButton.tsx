import { useEffect, useState } from "react";
import { recordFailure } from "@llkit/errorLog.js";
import { t } from "../i18n/i18n.js";

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
