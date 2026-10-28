import type { SearchActions, SearchQueryState } from "./SearchPanel.js";
import { t } from "../i18n/i18n.js";

// Across the book the notes are searched too, but Alla changes the manuscript only, and says so.
export function ReplaceRow(props: {
  query: SearchQueryState;
  actions: SearchActions;
  isWholeBook: boolean;
  onClose: () => void;
}) {
  const isNoted = props.isWholeBook && props.query.replace !== "";
  return (
    <>
      <div className="search-row">
        <input
          aria-label={t("Ersätt med")}
          placeholder={t("Ersätt med")}
          value={props.query.replace}
          onChange={(event) => props.query.setReplace(event.target.value)}
          onKeyDown={(event) => event.key === "Escape" && (event.preventDefault(), props.onClose())}
        />
        <button className="button secondary small" onClick={props.actions.replaceOne}>
          {t("Ersätt")}
        </button>
        <button className="button primary small" onClick={props.actions.replaceEvery}>
          {t("Alla")}
        </button>
      </div>
      {isNoted && <p className="search-count">{t("Ersätter i manuset, inte i anteckningar")}</p>}
    </>
  );
}
