import type { SearchQuery } from "prosemirror-search";
import {
  findNextNoWrap,
  replaceAll,
  replaceCurrent,
  replaceNext,
  search,
  setSearchState,
} from "prosemirror-search";
import { EditorState, type Command } from "prosemirror-state";
import { parseMarkdown } from "../manuscript/parseMarkdown.js";
import { joinSceneFile, splitSceneFile } from "../manuscript/sceneFile.js";
import { serializeMarkdown } from "../manuscript/serializeMarkdown.js";

// The same plugin as the editor, so "Hela ord" and "Aa" match exactly as in the open scene.

export const applyQuery =
  (query: SearchQuery): Command =>
  (state, dispatch) => {
    dispatch?.(setSearchState(state.tr, query));
    return true;
  };

export const searchableScene = (sceneText: string, query?: SearchQuery) =>
  EditorState.create({
    doc: parseMarkdown(splitSceneFile(sceneText).body),
    plugins: [search(query ? { initialQuery: query } : {})],
  });

// Every autosave reads the book again while its search is open, so only a scene whose text
// changed is built again; building a long book's scenes takes seconds.
const builtByPath = new Map<string, { text: string; state: EditorState }>();

/** A scene as the book's search reads it, kept until its text changes. */
export function builtScene(path: string, text: string) {
  const built = builtByPath.get(path);
  if (built?.text === text) return built.state;
  const state = searchableScene(text);
  builtByPath.set(path, { text, state });
  return state;
}

export function countMatches(state: EditorState, query: SearchQuery): number {
  if (!query.valid) return 0;
  let count = 0;
  let from = 0;
  for (let match = query.findNext(state, from); match; match = query.findNext(state, from)) {
    count++;
    from = Math.max(match.to, match.from + 1);
  }
  return count;
}

/** Blocks without a match are written back unchanged. */
export function replaceAllInText(sceneText: string, query: SearchQuery) {
  let state = searchableScene(sceneText, query);
  const count = countMatches(state, query);
  if (count === 0) return { text: sceneText, count };
  replaceAll(state, (transaction) => (state = state.apply(transaction)));
  const { frontMatter } = splitSceneFile(sceneText);
  return { text: joinSceneFile({ frontMatter, body: serializeMarkdown(state.doc) }), count };
}

export interface ManuscriptScope {
  isOn: boolean;
  setOn: (isOn: boolean) => void;
  position: (query: SearchQuery, open: EditorState | null) => { current: number; total: number };
  step: (query: SearchQuery, isBackwards: boolean) => void;
  replaceAll: (query: SearchQuery) => void;
  /** Replace all within the open scene, so it is said and can be undone like across the book. */
  replacedInScene: (count: number, search: string) => void;
  /** Every scene with a match, for the list under the search. */
  hits: (query: SearchQuery, open: EditorState | null) => SceneHit[];
  /** Opens the scene at its first match. */
  openHit: (id: string, query: SearchQuery) => void;
  /** Status steps and labels that narrow the search to some scenes. */
  chips: { id: string; label: string; color: string; isOn: boolean }[];
  toggleChip: (id: string) => void;
}

export interface SceneHit {
  id: string;
  /** The chapter and the scene, or the note's sort and the note. */
  place: string;
  count: number;
  snippet: string;
}

/** Goes round the manuscript; the scene itself comes last. */
export function nextSceneWith(
  ids: string[],
  fromId: string | null,
  isBackwards: boolean,
  hasMatch: (id: string) => boolean,
): string | null {
  const start = fromId === null ? -1 : ids.indexOf(fromId);
  const step = isBackwards ? -1 : 1;
  for (let offset = 1; offset <= ids.length; offset++) {
    const id = ids[(((start + step * offset) % ids.length) + ids.length) % ids.length];
    if (id !== undefined && hasMatch(id)) return id;
  }
  return null;
}

// Ersätt replaces at once; prosemirror-search's own first only selects when no match is selected.
export const replaceOneAndMove: Command = (state, dispatch, view) => {
  if (!view) return replaceNext(state, dispatch);
  const before = view.state.doc;
  replaceNext(view.state, view.dispatch);
  return view.state.doc !== before || replaceNext(view.state, view.dispatch);
};

// Across the book Ersätt also replaces at the first click: the match chosen, or else the next one
// in the scene; stepping on to the next scene is left to the search.
export const replaceChosenOrNext: Command = (state, dispatch, view) => {
  if (!view) return replaceCurrent(state, dispatch);
  if (replaceCurrent(view.state, view.dispatch)) return true;
  return findNextNoWrap(view.state, view.dispatch) && replaceCurrent(view.state, view.dispatch);
};
