import type { Node } from "prosemirror-model";
import { Plugin, PluginKey, TextSelection, type Command } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { placeholdersIn } from "../manuscript/placeholders.js";
import { documentText } from "./documentText.js";

export function placeholderDecorations(doc: Node): DecorationSet {
  const { text, toDoc } = documentText(doc);
  return DecorationSet.create(
    doc,
    placeholdersIn(text).map(({ from, to }) =>
      Decoration.inline(toDoc(from), toDoc(to), { class: "placeholder-note" }),
    ),
  );
}

const placeholderKey = new PluginKey<DecorationSet>("placeholders");

/** A placeholder is grey with a dotted underline, so it is seen at a glance and never read as text. */
export function placeholderPlugin() {
  return new Plugin<DecorationSet>({
    key: placeholderKey,
    state: {
      init: (_config, state) => placeholderDecorations(state.doc),
      apply: (transaction, old, _oldState, state) =>
        transaction.docChanged ? placeholderDecorations(state.doc) : old,
    },
    props: { decorations: (state) => placeholderKey.getState(state) },
  });
}

/** Writes `[? ]` with the caret inside, for the phone's button; a selection is replaced. */
export const insertPlaceholder: Command = (state, dispatch) => {
  if (!state.selection.$from.parent.isTextblock) return false;
  if (!dispatch) return true;
  const transaction = state.tr.insertText("[? ]");
  const caret = transaction.selection.from - 1;
  dispatch(transaction.setSelection(TextSelection.create(transaction.doc, caret)).scrollIntoView());
  return true;
};
