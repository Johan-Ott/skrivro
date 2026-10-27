import type { SearchQuery } from "prosemirror-search";
import { spaceAfterColon } from "../manuscript/colonSpace.js";
import type { EditorState } from "prosemirror-state";
import { countMatches, type SceneHit } from "../editor/manuscriptSearch.js";
import { placeOf } from "../project/treeLabels.js";
import type { Project } from "./useProject.js";

const AROUND = 40;

// A few words on each side of the first match, so the list says where it is.
function snippetOf(state: EditorState, query: SearchQuery) {
  const match = query.findNext(state, 0);
  if (!match) return "";
  const { doc } = state;
  const from = Math.max(0, match.from - AROUND);
  const to = Math.min(doc.content.size, match.to + AROUND);
  const text = spaceAfterColon(doc.textBetween(from, to, " ", " ").replace(/\s+/g, " ").trim());
  return `${from > 0 ? "…" : ""}${text}${to < doc.content.size ? "…" : ""}`;
}

/** Each scene with matches, in the book's order. */
export function sceneHits(
  project: Project,
  ids: string[],
  stateOf: (id: string) => EditorState | null,
  query: SearchQuery,
): SceneHit[] {
  if (!query.valid) return [];
  return ids.flatMap((id) => {
    const state = stateOf(id);
    const count = state ? countMatches(state, query) : 0;
    if (!state || count === 0) return [];
    return [
      {
        id,
        place: placeOf(project.tree, project.summaries, id),
        count,
        snippet: snippetOf(state, query),
      },
    ];
  });
}
