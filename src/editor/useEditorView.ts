import { NO_WORDS, type CompletionWords } from "./vocabulary.js";
import { firstAnswerAsk } from "../askOnce.js";
import { caretFor, rememberCaret } from "./sceneCarets.js";
import { firstAnswer } from "./promptHints.js";
import type { Node } from "prosemirror-model";
import { TextSelection, type Command, type EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { useCallback, useRef, useState } from "react";
import { manuscriptSchema as schema } from "../manuscript/schema.js";
import { createEditorState, type EditorSwitches } from "./editorState.js";
import { createEditorStore, type EditorStore } from "./editorStore.js";
import type { MentionMatcher } from "./mentions.js";
import type { CommentAnchor } from "./commentMarks.js";
import { pictureNodeView, type PictureUrl } from "./pictureView.js";
import type { RevisionChange } from "../manuscript/revision.js";
import type { SpellingSwitch } from "./spellingMarks.js";

function createView(
  element: HTMLElement,
  switches: ViewSwitches,
  onState: (state: EditorState, docChanged: boolean) => void,
  state: EditorState,
) {
  const view: EditorView = new EditorView(element, {
    state,
    editable: switches.isEditable,
    // The line being written stays clear of what floats at the foot, such as the tools.
    scrollMargin: { top: 5, right: 5, bottom: 96, left: 5 },
    // Skrivro's own check, where there is one, instead of the browser's.
    attributes: () => ({
      spellcheck: switches.isSpellcheckOn() && !switches.spelling() ? "true" : "false",
    }),
    nodeViews: { picture: pictureNodeView((name) => switches.pictureUrl(name)) },
    dispatchTransaction(transaction) {
      const next = view.state.apply(transaction);
      view.updateState(next);
      onState(next, transaction.docChanged);
    },
  });
  return view;
}

interface ViewSwitches extends EditorSwitches {
  isEditable: () => boolean;
  isSpellcheckOn: () => boolean;
  pictureUrl: PictureUrl;
}

interface EditorModes {
  isTypewriterOn: boolean;
  isTypographyOn: boolean;
  isAutocorrectOn: boolean;
  isCompletionOn: boolean;
  /** Asked at each key, since a note moved into the manuscript is a scene from then on. */
  isNote: () => boolean;
  /** Names and the book's own words, each set by what knows them. */
  completion: CompletionWords;
  isSpellcheckOn: boolean;
  isEditable: boolean;
  mentionMatchers: MentionMatcher[];
  onMention: (id: string, box: DOMRect) => void;
  repeatWindow: number | null;
  pageMarks: (number | undefined)[] | null;
  commentAnchors: CommentAnchor[];
  onComment: (id: string) => void;
  /** Reads a picture in the open book's bilder/ folder. */
  pictureUrl: PictureUrl;
  revisionChanges: RevisionChange[];
  suggestedFrom: string | null;
  spelling: SpellingSwitch | null;
}

const START_MODES: EditorModes = {
  isTypewriterOn: false,
  isTypographyOn: true,
  isAutocorrectOn: false,
  isCompletionOn: false,
  isNote: () => false,
  completion: NO_WORDS,
  isSpellcheckOn: true,
  isEditable: false,
  mentionMatchers: [],
  onMention: () => undefined,
  repeatWindow: null,
  pageMarks: null,
  commentAnchors: [],
  onComment: () => undefined,
  pictureUrl: async () => null,
  revisionChanges: [],
  suggestedFrom: null,
  spelling: null,
};

// ProseMirror asks these on every update, so the app can switch them without a new state.
function useModeSwitches() {
  const modes = useRef<EditorModes>({ ...START_MODES });
  const [switches] = useState<ViewSwitches>(() => ({
    isTypewriterOn: () => modes.current.isTypewriterOn,
    isTypographyOn: () => modes.current.isTypographyOn,
    isAutocorrectOn: () => modes.current.isAutocorrectOn,
    isCompletionOn: () => modes.current.isCompletionOn,
    isNote: () => modes.current.isNote(),
    completion: () => modes.current.completion,
    isSpellcheckOn: () => modes.current.isSpellcheckOn,
    isEditable: () => modes.current.isEditable,
    mentionMatchers: () => modes.current.mentionMatchers,
    onMention: (id, box) => modes.current.onMention(id, box),
    repeatWindow: () => modes.current.repeatWindow,
    pageMarks: () => modes.current.pageMarks,
    commentAnchors: () => modes.current.commentAnchors,
    onComment: (id) => modes.current.onComment(id),
    pictureUrl: (name) => modes.current.pictureUrl(name),
    revisionChanges: () => modes.current.revisionChanges,
    suggestedFrom: () => modes.current.suggestedFrom,
    spelling: () => modes.current.spelling,
  }));
  return { switches, modes };
}

const MOST_FRAMES = 30;

// Focus on an editor that cannot be edited does nothing, so a just-opened scene is tried frame by
// frame, and given up after about half a second.
function focusWhenEditable(view: EditorView, frames = MOST_FRAMES) {
  if (view.editable) return view.focus();
  if (frames > 0 && !view.isDestroyed) {
    requestAnimationFrame(() => focusWhenEditable(view, frames - 1));
  }
}

// A hidden editor cannot take focus, so the request waits until it is shown.
function useFocusRequest(viewRef: React.RefObject<EditorView | null>) {
  const isRequested = useRef(false);
  const requestFocus = useCallback(() => {
    const view = viewRef.current;
    if (view?.dom.offsetParent) return focusWhenEditable(view);
    isRequested.current = true;
  }, [viewRef]);
  const focusIfRequested = useCallback(() => {
    if (!isRequested.current || !viewRef.current?.dom.offsetParent) return;
    isRequested.current = false;
    focusWhenEditable(viewRef.current);
  }, [viewRef]);
  return { requestFocus, focusIfRequested };
}

function useMount(
  viewRef: React.RefObject<EditorView | null>,
  switches: ViewSwitches,
  store: EditorStore,
  onDocChangeRef: React.RefObject<(doc: Node) => void>,
) {
  // A new mount (the phone turned, the screen changed) carries on with the open text; an empty
  // page there would be saved over the scene at the first key.
  const lastState = useRef<EditorState | null>(null);
  return useCallback((element: HTMLDivElement | null) => {
    lastState.current = viewRef.current?.state ?? lastState.current;
    viewRef.current?.destroy();
    const state = lastState.current ?? createEditorState(schema.node("doc"), switches);
    viewRef.current = element
      ? createView(
          element,
          switches,
          (next, docChanged) => {
            store.set(next);
            if (docChanged) onDocChangeRef.current(next.doc);
          },
          state,
        )
      : null;
    store.set(viewRef.current?.state ?? null);
  }, []);
}

// A new note starts in its first answer; a scene gone back to, where its caret was left.
function placedCaret(state: EditorState, caret: number | null) {
  const { doc } = state;
  const answer = firstAnswerAsk.take() ? firstAnswer(doc) : null;
  const near =
    caret === null ? null : TextSelection.near(doc.resolve(Math.min(caret, doc.content.size)));
  const chosen = answer ?? near;
  return chosen ? state.apply(state.tr.setSelection(chosen)) : state;
}

// A new state is not scrolled to its caret; only a dispatched transaction is.
function showWithCaret(view: EditorView, state: EditorState) {
  view.updateState(state);
  view.dispatch(view.state.tr.scrollIntoView());
}

/** Components that show the text read it with useEditorState(editor); the rest is not redrawn. */
export function useEditorView(onDocChange: (doc: Node) => void) {
  const viewRef = useRef<EditorView | null>(null);
  const onDocChangeRef = useRef(onDocChange);
  onDocChangeRef.current = onDocChange;
  const { switches, modes } = useModeSwitches();
  const [store] = useState(createEditorStore);

  const mount = useMount(viewRef, switches, store, onDocChangeRef);
  const loadedKey = useRef<string | null>(null);
  const load = useCallback((doc: Node, key?: string) => {
    const view = viewRef.current;
    if (view && loadedKey.current) rememberCaret(loadedKey.current, view.state);
    loadedKey.current = key ?? null;
    const caret = key ? caretFor(key, doc) : null;
    if (view) showWithCaret(view, placedCaret(createEditorState(doc, switches), caret));
    store.set(view?.state ?? null);
  }, []);

  const run = useCallback((command: Command, shouldFocus = true) => {
    const view = viewRef.current;
    if (view && command(view.state, view.dispatch, view) && shouldFocus) view.focus();
  }, []);

  const focus = useFocusRequest(viewRef);
  return { mount, load, run, store, viewRef, modes, ...focus };
}
