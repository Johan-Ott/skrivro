import type { Node } from "prosemirror-model";
import { Plugin, PluginKey, type Command } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import type { RevisionChange } from "../manuscript/revision.js";
import { documentText, LEAF } from "./documentText.js";

/** How documentText ends each paragraph. */
const PARAGRAPH = "\n";

const addedText = (text: string, index: number) => {
  const shown = document.createElement("span");
  shown.className = "revision-added";
  shown.dataset.change = String(index);
  shown.textContent = text.replace(/\n+/g, " ¶ ");
  return shown;
};

/** What the editor struck through, and beside it in green what they wrote instead. Each mark
 * carries its change's place in the list, so the margin can set its card beside it. */
function revisionDecorations(doc: Node, changes: RevisionChange[]): DecorationSet {
  const { toDoc } = documentText(doc);
  const decorations = changes.flatMap((change, index) => {
    const from = toDoc(change.from);
    const to = toDoc(change.to);
    const removed = { class: "revision-removed", "data-change": String(index) };
    const added = () => addedText(change.added, index);
    return [
      ...(to > from ? [Decoration.inline(from, to, removed)] : []),
      ...(change.added ? [Decoration.widget(to, added, { side: 1 })] : []),
    ];
  });
  return DecorationSet.create(doc, decorations);
}

const revisionKey = new PluginKey<DecorationSet>("revision");

/** Run after the changes are counted again; between counts the marks follow the edits. */
export const refreshRevision: Command = (state, dispatch) => {
  dispatch?.(state.tr.setMeta(revisionKey, true));
  return true;
};

export function revisionPlugin(changes: () => RevisionChange[]) {
  return new Plugin<DecorationSet>({
    key: revisionKey,
    state: {
      init: (_config, state) => revisionDecorations(state.doc, changes()),
      apply: (transaction, old, _oldState, state) =>
        transaction.getMeta(revisionKey)
          ? revisionDecorations(state.doc, changes())
          : old.map(transaction.mapping, transaction.doc),
    },
    props: { decorations: (state) => revisionKey.getState(state) },
  });
}

// A paragraph end both sides have is not part of the change.
function withoutSharedEnd(change: RevisionChange) {
  const isShared = change.removed.endsWith(PARAGRAPH) && change.added.endsWith(PARAGRAPH);
  if (!isShared) return change;
  return { ...change, to: change.to - 1, added: change.added.slice(0, -1) };
}

/** Writes the editor's words into the text: a new paragraph wherever they started one. */
export const acceptChange =
  (change: RevisionChange): Command =>
  (state, dispatch) => {
    const { toDoc } = documentText(state.doc);
    const { added, ...place } = withoutSharedEnd(change);
    const from = toDoc(place.from);
    const to = toDoc(place.to);
    const [first = "", ...paragraphs] = added.replaceAll(LEAF, "").split(PARAGRAPH);
    const transaction = first ? state.tr.insertText(first, from, to) : state.tr.delete(from, to);
    let position = from + first.length;
    for (const paragraph of paragraphs) {
      transaction.split(position);
      position += 2;
      if (paragraph) transaction.insertText(paragraph, position);
      position += paragraph.length;
    }
    dispatch?.(transaction);
    return true;
  };
