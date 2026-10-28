import type { EditorState } from "prosemirror-state";
import { useEffect } from "react";
import { createStore } from "@llkit/store.js";
import { textBefore } from "../../editor/documentText.js";

/** Where the writer last wrote in a book: the scene, the cursor and when. */
export interface Place {
  sceneId: string;
  position: number;
  /** The words just before the cursor, which find the place again if the position moved. */
  before: string;
  /** Milliseconds since 1970. */
  writtenAt: number;
}

// Kept in localStorage, per device: where you left off on this computer.
const KEY = "skrivro.lastPlace";

function places(): Record<string, Place> {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return typeof stored === "object" && stored !== null ? (stored as Record<string, Place>) : {};
  } catch {
    return {};
  }
}

export function rememberPlace(dir: string, place: Place) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...places(), [dir]: place }));
  } catch {
    // Without storage the book opens at its first scene, as before.
  }
}

export function placeIn(dir: string): Place | null {
  const place = places()[dir];
  return place && typeof place.sceneId === "string" && typeof place.position === "number"
    ? place
    : null;
}

// The opening picture waits here until the writer starts writing.
const shown = createStore<Place | null>(null);

export const showResume = shown.set;
export const useResume = shown.use;

/** Where the cursor is in a scene, with the words before it. */
export function placeOf(sceneId: string, state: EditorState) {
  const position = state.selection.from;
  return { sceneId, position, before: textBefore(state.doc, position), writtenAt: Date.now() };
}

const LOOK_EVERY_MS = 2000;

/** Where the writer is, not only where they last typed: kept while they move about the text, and
 * when Skrivro closes, so the book opens there again. */
export function useRememberPlace({
  scene,
  editor,
}: {
  scene: { id: string; dir: string } | null;
  editor: { viewRef: { current: { state: EditorState } | null } };
}) {
  useEffect(() => {
    if (!scene) return;
    // Where the scene opened is not a place the writer chose, and Du slutade här may still be
    // waiting to put the cursor back; only a move of their own is kept.
    let last: string | null = null;
    const keep = () => {
      const state = editor.viewRef.current?.state;
      if (!state || shown.get()) return;
      const place = placeOf(scene.id, state);
      const key = `${place.sceneId}:${place.position}`;
      if (last === null || key === last) return void (last = key);
      last = key;
      rememberPlace(scene.dir, place);
    };
    const timer = setInterval(keep, LOOK_EVERY_MS);
    globalThis.addEventListener("pagehide", keep);
    return () => {
      keep();
      clearInterval(timer);
      globalThis.removeEventListener("pagehide", keep);
    };
  }, [scene, editor]);
}
