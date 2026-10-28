import type { Node } from "prosemirror-model";
import type { EditorState } from "prosemirror-state";
import { positionAfter, textBefore } from "./documentText.js";

// Where the caret was in each text left while the app is open, so going back to a scene, by
// Bakåt or the tree, puts it there again. The words before it find the place if the text moved.

type Caret = { position: number; before: string };

const carets = new Map<string, Caret>();

/** `key` names the text, such as its file's path. */
export function rememberCaret(key: string, state: EditorState) {
  const position = state.selection.from;
  carets.set(key, { position, before: textBefore(state.doc, position) });
}

/** Where the caret goes in the text read anew; null when it was not left before. */
export function caretFor(key: string, doc: Node): number | null {
  const caret = carets.get(key);
  return caret ? positionAfter(doc, caret.before, caret.position) : null;
}
