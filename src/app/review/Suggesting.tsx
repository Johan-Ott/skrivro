import type { AppState } from "../App.js";
import type { MenuItem } from "@llkit/Menu.js";
import { t } from "../../i18n/i18n.js";

/** Over the text while Förslagsläge is on, so it is never forgotten; Klar ends it. */
export function SuggestingBar({ app }: { app: Pick<AppState, "suggesting"> }) {
  if (!app.suggesting.isSuggesting) return null;
  return (
    <div className="suggesting-bar" role="status">
      <span>
        {t("Förslagsläge: det du skriver blir förslag som du godtar eller avvisar, ett i taget.")}
      </span>
      <button className="button primary small" onClick={app.suggesting.stop}>
        {t("Klar")}
      </button>
    </div>
  );
}

/** In Granskas menu on a phone: changes typed as suggestions, gone through later as an editor's
 * would be. The desktop has Redigera for that. */
export function suggestMenuItems(
  app: Pick<AppState, "suggesting" | "revision">,
  isPhone: boolean,
): MenuItem[] {
  if (!isPhone || app.suggesting.isSuggesting || app.revision.isOpen) return [];
  return [{ label: t("Skriv förslag"), onSelect: app.suggesting.start }];
}
