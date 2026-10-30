import { useRef, useState } from "react";
import type { Suggesting } from "../../editor/suggestTyping.js";
import type { useEditorView } from "../../editor/useEditorView.js";

type Editor = ReturnType<typeof useEditorView>;

/** The open scene's editor's version, as useRevision keeps it. */
interface Typed {
  revised: () => string | null;
  write: (next: string | null) => void;
  sceneId: string | null;
}

// Keys this close together are taken back by one Ctrl+Z.
const GROUP_MS = 500;

// The versions before each group of keys, newest last; null where there was none.
interface History {
  sceneId: string | null;
  before: (string | null)[];
  last: number;
}

function written(history: History, typed: Typed, next: string) {
  if (history.sceneId !== typed.sceneId) {
    Object.assign(history, { sceneId: typed.sceneId, before: [], last: 0 });
  }
  const now = Date.now();
  if (now - history.last > GROUP_MS) history.before.push(typed.revised());
  history.last = now;
  typed.write(next);
}

function undone(history: History, typed: Typed) {
  if (history.sceneId !== typed.sceneId || history.before.length === 0) return;
  history.last = 0;
  typed.write(history.before.pop() ?? null);
}

/** In Redigera what is typed becomes suggestions, unless the writer turns that off to edit the
 * text itself. */
export function useTypedSuggestions(editor: Editor, typed: Typed, isRedigera: boolean) {
  const [isOn, setOn] = useState(true);
  const history = useRef<History>({ sceneId: null, before: [], last: 0 });
  const suggesting: Suggesting = {
    revised: typed.revised,
    write: (next) => written(history.current, typed, next),
    undo: () => undone(history.current, typed),
  };
  // In the render, not an effect: the next key reads it.
  editor.modes.current.suggesting = isRedigera && isOn && typed.sceneId ? suggesting : null;
  return { isOn, toggle: () => setOn((value) => !value) };
}
