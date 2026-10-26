import { InputRule } from "prosemirror-inputrules";
import type { EditorState } from "prosemirror-state";
import { findWrapping } from "prosemirror-transform";
import { manuscriptSchema as schema, type StyleName } from "../manuscript/schema.js";

// "- " at the start of a line: a bullet in a note, a dialogue dash in a scene, where a list is
// Skrivro's own style. "1. " starts a numbered list in a note.

function listAround(state: EditorState, start: number, end: number, style: StyleName) {
  const transaction = state.tr.delete(start, end);
  const range = transaction.doc.resolve(start).blockRange();
  const wrapping = range && findWrapping(range, schema.nodes.styleBlock, { style });
  return range && wrapping ? transaction.wrap(range, wrapping) : null;
}

export function listRules(isNote: () => boolean): InputRule[] {
  const bullet = new InputRule(/^[-*]\s$/, (state, match, start, end) => {
    if (isNote()) return listAround(state, start, end, "punktlista");
    return match[0].startsWith("-") ? state.tr.insertText("– ", start, end) : null;
  });
  const numbered = new InputRule(/^1\.\s$/, (state, _match, start, end) =>
    isNote() ? listAround(state, start, end, "numrerad") : null,
  );
  return [bullet, numbered];
}
