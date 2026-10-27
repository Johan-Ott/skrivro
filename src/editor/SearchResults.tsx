import type { SearchQuery } from "prosemirror-search";
import type { EditorState } from "prosemirror-state";
import type { ManuscriptScope } from "./manuscriptSearch.js";
import { t, formatNumber } from "../i18n/i18n.js";

/** How many matches, and which one is shown. */
export function countText({ total, current }: { total: number; current: number }) {
  if (total === 0) return t("Inga träffar");
  if (current > 0) return t("{current} av {total}", { current, total });
  return total === 1 ? t("1 träff") : t("{total} träffar", { total });
}

/** The count; with no match in the manuscript but some in the notes, it says so and offers them. */
export function SearchCount({ actions }: { actions: SearchCountActions }) {
  const position = actions.position();
  const inNotes = position.total === 0 ? actions.inNotes() : 0;
  if (inNotes === 0) return <span className="search-count">{countText(position)}</span>;
  return (
    <button className="link-button search-count" onClick={actions.showNotes}>
      {inNotes === 1
        ? t("1 träff i anteckningar")
        : t("{count} träffar i anteckningar", { count: inNotes })}
    </button>
  );
}

interface SearchCountActions {
  position: () => { total: number; current: number };
  inNotes: () => number;
  showNotes: () => void;
}

const MAX_SHOWN = 50;

/** Across the whole manuscript: each scene with a match, its count and where the first one is. */
export function SearchResults(props: {
  scope: ManuscriptScope | undefined;
  query: SearchQuery;
  editorState: EditorState | null;
}) {
  const { scope, query } = props;
  if (!scope?.isOn || !query.search) return null;
  const hits = scope.hits(query, props.editorState);
  if (hits.length === 0) return null;
  return (
    <div className="search-results" role="list" aria-label={t("Träffar i manuset")}>
      {hits.slice(0, MAX_SHOWN).map((hit) => (
        <button
          key={hit.id}
          role="listitem"
          className="search-hit"
          onClick={() => scope.openHit(hit.id, query)}
        >
          <span className="search-hit-place">
            {hit.place}
            <span className="search-hit-count">{formatNumber(hit.count)}</span>
          </span>
          <span className="search-hit-text">{hit.snippet}</span>
        </button>
      ))}
    </div>
  );
}

/** Under Hela manuset: a status step or label chosen narrows the search to those scenes. */
export function SearchFilters({ scope }: { scope: ManuscriptScope | undefined }) {
  if (!scope?.isOn || scope.chips.length === 0) return null;
  return (
    <div className="search-options" role="group" aria-label={t("Bara scener med")}>
      {scope.chips.map((chip) => (
        <button
          key={chip.id}
          className="chip"
          aria-pressed={chip.isOn}
          onClick={() => scope.toggleChip(chip.id)}
        >
          <span
            className={`tree-dot${chip.color ? "" : " outlined"}`}
            style={{ background: chip.color }}
          />{" "}
          {chip.label}
        </button>
      ))}
    </div>
  );
}
