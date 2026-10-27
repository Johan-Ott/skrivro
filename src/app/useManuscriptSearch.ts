import type { SearchQuery } from "prosemirror-search";
import { findNext, findNextNoWrap, findPrev, findPrevNoWrap } from "prosemirror-search";
import { undo as undoCommand } from "prosemirror-history";
import type { EditorState } from "prosemirror-state";
import { useEffect, useState } from "react";
import type { useEditorView } from "../editor/useEditorView.js";
import {
  applyQuery,
  countMatches,
  countMatchesIn,
  nextSceneWith,
  builtScene,
  type ManuscriptScope,
} from "../editor/manuscriptSearch.js";
import { manuscriptSceneIds } from "../project/tree.js";
import { scenePath } from "../storage/sceneId.js";
import { replaceInScenes, undoReplace, type SceneChange } from "./manuscriptReplace.js";
import { platform } from "./platform.js";
import { sceneHits } from "./searchHits.js";
import { isKept, noteIds, notesLeftOut, WITH_NOTES } from "./searchFilter.js";
import { useChips } from "./useSearchChips.js";
import { openScene, type SceneSession } from "./sceneSession.js";
import type { Project } from "./useProject.js";

export interface ReplaceDone {
  count: number;
  search: string;
  /** Null when only the open scene changed: then the editor's own undo takes it back. */
  changes: SceneChange[] | null;
}

interface SearchParts {
  project: Project | null;
  session: SceneSession;
  editor: ReturnType<typeof useEditorView>;
  refresh: () => Promise<void>;
  isSearchOpen: boolean;
  /** The chips chosen under the search; none is the whole manuscript. */
  only?: string[];
}

// Scenes still in the cloud have no text here; the notes come after the book when asked for.
function manuscriptIds(project: Project, only: string[] = []) {
  const notes = only.includes(WITH_NOTES) ? noteIds(project) : [];
  return [...manuscriptSceneIds(project.tree), ...notes].filter(
    (id) => project.scenes.includes(id) && isKept(project, id, only),
  );
}

// Searching the open scene only needs the notes, for the hint that they hold the words; the whole
// manuscript is read once it is searched too.
async function loadScenes(project: Project, isWholeManuscript: boolean) {
  const ids = isWholeManuscript ? manuscriptIds(project, [WITH_NOTES]) : notesLeftOut(project);
  const texts = await Promise.all(
    ids.map((id) => platform.fileSystem.readText(scenePath(project.dir, id)).catch(() => null)),
  );
  const scenes = new Map<string, EditorState>();
  ids.forEach((id, index) => {
    const text = texts[index];
    if (typeof text === "string") scenes.set(id, builtScene(scenePath(project.dir, id), text));
  });
  return scenes;
}

/** The open scene as the editor has it; every other scene as it is on disk. */
function useSceneStates(parts: SearchParts, isWholeManuscript: boolean) {
  const [scenes, setScenes] = useState(new Map<string, EditorState>());
  const { project, isSearchOpen } = parts;
  const openId = parts.session.scene?.id;
  useEffect(() => {
    if (!project || !isSearchOpen) return;
    let isCurrent = true;
    void loadScenes(project, isWholeManuscript).then((loaded) => isCurrent && setScenes(loaded));
    return () => void (isCurrent = false);
    // Read again when the open scene changes, so what was written in the scene left is found.
  }, [project?.dir, project?.tree, project?.scenes, isSearchOpen, isWholeManuscript, openId]);
  return (id: string, open: EditorState | null) =>
    id === parts.session.scene?.id ? open : (scenes.get(id) ?? null);
}

function matchIndex(state: EditorState, query: SearchQuery) {
  let index = 0;
  for (let match = query.findNext(state, 0); match; match = query.findNext(state, match.to)) {
    index++;
    if (match.from === state.selection.from) return index;
  }
  return 0;
}

// Where the open scene's match is counted among all the manuscript's matches.
function positionAcross(parts: StepParts, query: SearchQuery, open: EditorState | null) {
  const { project, session } = parts;
  if (!project) return { current: 0, total: 0 };
  let total = 0;
  let current = 0;
  for (const id of manuscriptIds(project, parts.only)) {
    const state = parts.stateOf(id, open);
    if (!state) continue;
    const index = id === session.scene?.id && open ? matchIndex(open, query) : 0;
    if (index > 0) current = total + index;
    total += countMatches(state, query);
  }
  return { current, total };
}

// Finding, as against replacing: where a match is, the next one, and every scene with one.
function findingActions(parts: StepParts) {
  const { project } = parts;
  return {
    position: (query: SearchQuery, open: EditorState | null) => positionAcross(parts, query, open),
    step: (query: SearchQuery, isBackwards: boolean) => void stepAcross(parts, query, isBackwards),
    hits: (query: SearchQuery, open: EditorState | null) =>
      project
        ? sceneHits(
            project,
            manuscriptIds(project, parts.only),
            (id) => parts.stateOf(id, open),
            query,
          )
        : [],
    inNotes: (query: SearchQuery, open: EditorState | null) =>
      project
        ? countMatchesIn(notesLeftOut(project, parts.only), (id) => parts.stateOf(id, open), query)
        : 0,
    openHit: (id: string, query: SearchQuery) => void showMatchIn(parts, id, query, false),
  };
}

export function useManuscriptSearch(searchParts: SearchParts) {
  const [isOn, setOn] = useState(false);
  const { only, chips, toggleChip, showNotes } = useChips(searchParts.project, setOn);
  const parts = { ...searchParts, only };
  const [replaceDone, setReplaceDone] = useState<ReplaceDone | null>(null);
  const stateOf = useSceneStates(parts, isOn);
  const replaceAll = (query: SearchQuery) =>
    void replaceEverywhere(parts, query).then((done) => done && setReplaceDone(done));
  const replacedInScene = (count: number, search: string) =>
    count > 0 && setReplaceDone({ count, search, changes: null });
  const finding = findingActions({ ...parts, stateOf });
  const scope: ManuscriptScope = {
    ...{ isOn, setOn, ...finding, replaceAll, replacedInScene, chips, toggleChip, showNotes },
  };
  const undo = () => {
    if (replaceDone?.changes) void undoEverywhere(parts, replaceDone.changes);
    else if (replaceDone) parts.editor.run(undoCommand);
    setReplaceDone(null);
  };
  return { scope, done: replaceDone, onUndo: undo, onDismiss: () => setReplaceDone(null) };
}

type StepParts = SearchParts & {
  stateOf: (id: string, open: EditorState | null) => EditorState | null;
};

function sceneToStepTo(
  parts: StepParts,
  open: EditorState,
  query: SearchQuery,
  isBackwards: boolean,
) {
  const { project, session } = parts;
  if (!project) return null;
  return nextSceneWith(
    manuscriptIds(project, parts.only),
    session.scene?.id ?? null,
    isBackwards,
    (id) => {
      const state = parts.stateOf(id, open);
      return state !== null && countMatches(state, query) > 0;
    },
  );
}

async function stepAcross(parts: StepParts, query: SearchQuery, isBackwards: boolean) {
  const { project, session } = parts;
  const view = parts.editor.viewRef.current;
  if (!project || !view) return;
  const inScene = isBackwards ? findPrevNoWrap : findNextNoWrap;
  if (session.scene && inScene(view.state, view.dispatch)) return;
  const id = sceneToStepTo(parts, view.state, query, isBackwards);
  if (id) await showMatchIn(parts, id, query, isBackwards);
}

async function showMatchIn(parts: StepParts, id: string, query: SearchQuery, isBackwards: boolean) {
  const { project, session, editor } = parts;
  if (!project) return;
  if (id !== session.scene?.id && !(await openScene(session, project.dir, id))) return;
  // A newly opened scene has a fresh editor state without the query.
  editor.run(applyQuery(query), false);
  editor.run(isBackwards ? findPrev : findNext, false);
}

async function replaceEverywhere(parts: SearchParts, query: SearchQuery) {
  const { project, session } = parts;
  if (!project || !(await session.autosave.flush())) return null;
  const { changes, count } = await replaceInScenes(
    platform.fileSystem,
    project.dir,
    manuscriptIds(project, parts.only),
    query,
  );
  await reloadOpenScene(parts, changes);
  return count === 0 ? null : { count, search: query.search, changes };
}

async function undoEverywhere(parts: SearchParts, changes: SceneChange[]) {
  const { project, session } = parts;
  if (!project || !(await session.autosave.flush())) return;
  await undoReplace(platform.fileSystem, project.dir, changes);
  await reloadOpenScene(parts, changes);
}

async function reloadOpenScene(parts: SearchParts, changes: SceneChange[]) {
  const { project, session } = parts;
  const openId = session.scene?.id;
  if (project && openId && changes.some((change) => change.id === openId)) {
    await openScene(session, project.dir, openId);
  }
  await parts.refresh();
}
