import { createStore } from "@llkit/store.js";
import { useEffect } from "react";
import { t } from "../../i18n/i18n.js";

/** The name of the template just saved, until the toast is gone. */
export const templateSaved = createStore<string | null>(null);

const TOAST_MS = 6000;

export function TemplateSavedToast() {
  const name = templateSaved.use();
  useEffect(() => {
    if (name === null) return;
    const timer = setTimeout(() => templateSaved.set(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [name]);
  if (name === null) return null;
  return (
    <div className="toast" role="status">
      <span>
        {t("Sparad som mall: {name}. Du hittar den under Mall i Ny anteckning.", { name })}
      </span>
    </div>
  );
}
