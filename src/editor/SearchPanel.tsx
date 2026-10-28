import {
  findNext,
  findPrev,
  getMatchHighlights,
  getSearchState,
  replaceAll,
  SearchQuery,
} from "prosemirror-search";
import type { Command, EditorState } from "prosemirror-state";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import {
  applyQuery,
  replaceChosenOrNext,
  replaceOneAndMove,
  type ManuscriptScope,
} from "./manuscriptSearch.js";
import { ReplaceRow } from "./ReplaceRow.js";
import { SearchCount, SearchFilters, SearchResults } from "./SearchResults.js";
import { t } from "../i18n/i18n.js";

interface SearchPanelProps {
  editorState: EditorState | null;
  run: (command: Command, shouldFocus?: boolean) => void;
  onClose: () => void;
  manuscript?: ManuscriptScope | undefined;
  initialSearch?: string | undefined;
}

function matchPosition(editorState: EditorState | null) {
  if (!editorState) return { total: 0, current: 0 };
  const matches = getMatchHighlights(editorState).find();
  const index = matches.findIndex((match) => match.from === editorState.selection.from);
  return { total: matches.length, current: index + 1 };
}

// Another scene gives the editor a fresh state, so the query is put back.
function useSearchQuery(props: SearchPanelProps) {
  const { run, editorState } = props;
  const [search, setSearch] = useState(props.initialSearch ?? "");
  const [replace, setReplace] = useState("");
  const [wholeWord, setWholeWord] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const query = useMemo(
    () => new SearchQuery({ search, replace, wholeWord, caseSensitive }),
    [search, replace, wholeWord, caseSensitive],
  );
  const appliedQuery = editorState ? getSearchState(editorState)?.query : undefined;
  useEffect(() => {
    if (!appliedQuery?.eq(query)) run(applyQuery(query), false);
  }, [run, query, appliedQuery]);
  useEffect(() => () => run(applyQuery(new SearchQuery({ search: "" })), false), [run]);
  const options = { wholeWord, setWholeWord, caseSensitive, setCaseSensitive };
  return { query, search, setSearch, replace, setReplace, ...options };
}

export type SearchQueryState = ReturnType<typeof useSearchQuery>;

// The rows below need not know whether one scene or the whole manuscript is searched.
function searchActions(props: SearchPanelProps, query: SearchQuery) {
  const { run, editorState } = props;
  const scope = props.manuscript?.isOn ? props.manuscript : null;
  if (!scope) {
    return {
      position: () => matchPosition(editorState),
      step: (isBackwards: boolean) => run(isBackwards ? findPrev : findNext, false),
      replaceOne: () => run(replaceOneAndMove, false),
      replaceEvery: () => {
        const { total } = matchPosition(editorState);
        run(replaceAll, false);
        props.manuscript?.replacedInScene(total, query.search);
      },
    };
  }
  return {
    position: () => scope.position(query, editorState),
    step: (isBackwards: boolean) => scope.step(query, isBackwards),
    replaceOne: () => {
      run(replaceChosenOrNext, false);
      scope.step(query, false);
    },
    replaceEvery: () => scope.replaceAll(query),
  };
}

export type SearchActions = ReturnType<typeof searchActions>;

// Enter and Shift+Enter step too; a phone's keyboard has no Shift+Enter.
function StepButtons({ actions }: { actions: SearchActions }) {
  return (
    <>
      <button
        className="icon-button"
        aria-label={t("Föregående träff")}
        onClick={() => actions.step(true)}
      >
        ↑
      </button>
      <button
        className="icon-button"
        aria-label={t("Nästa träff")}
        onClick={() => actions.step(false)}
      >
        ↓
      </button>
    </>
  );
}

function FindRow(props: {
  query: SearchQueryState;
  actions: SearchActions;
  onKey: (event: KeyboardEvent) => void;
  onClose: () => void;
}) {
  return (
    <div className="search-row">
      <input
        autoFocus
        aria-label={t("Sök")}
        placeholder={t("Sök")}
        value={props.query.search}
        onChange={(event) => props.query.setSearch(event.target.value)}
        onKeyDown={props.onKey}
      />
      <SearchCount actions={props.actions} />
      <StepButtons actions={props.actions} />
      <button className="icon-button" aria-label={t("Stäng sökning")} onClick={props.onClose}>
        ×
      </button>
    </div>
  );
}

function Chip(props: { isOn: boolean; onToggle: () => void; label?: string; children: string }) {
  return (
    <button
      className="chip"
      aria-pressed={props.isOn}
      aria-label={props.label}
      onClick={props.onToggle}
    >
      {props.children}
    </button>
  );
}

function SearchOptions(props: {
  query: SearchQueryState;
  manuscript?: ManuscriptScope | undefined;
}) {
  const { query, manuscript } = props;
  return (
    <div className="search-options">
      {manuscript && (
        <Chip
          isOn={manuscript.isOn}
          onToggle={() => manuscript.setOn(!manuscript.isOn)}
          label={t("Sök i hela boken")}
        >
          {t("Hela boken")}
        </Chip>
      )}
      <Chip isOn={query.wholeWord} onToggle={() => query.setWholeWord(!query.wholeWord)}>
        {t("Hela ord")}
      </Chip>
      <Chip
        isOn={query.caseSensitive}
        label={t("Skilj på stora och små bokstäver")}
        onToggle={() => query.setCaseSensitive(!query.caseSensitive)}
      >
        Aa
      </Chip>
    </div>
  );
}

export function SearchPanel(props: SearchPanelProps) {
  const query = useSearchQuery(props);
  const actions = searchActions(props, query.query);
  const onSearchKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      props.onClose();
    }
    if (event.key === "Enter") actions.step(event.shiftKey);
  };
  return (
    <div className="search-panel" role="search">
      <FindRow query={query} actions={actions} onKey={onSearchKey} onClose={props.onClose} />
      <ReplaceRow
        query={query}
        actions={actions}
        isWholeBook={props.manuscript?.isOn ?? false}
        onClose={props.onClose}
      />
      <SearchOptions query={query} manuscript={props.manuscript} />
      <SearchFilters scope={props.manuscript} />
      <SearchResults scope={props.manuscript} query={query.query} editorState={props.editorState} />
    </div>
  );
}
