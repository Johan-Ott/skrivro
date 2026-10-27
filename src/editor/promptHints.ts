import type { Node } from "prosemirror-model";
import { Plugin, TextSelection, type Selection } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { isUnanswered } from "../manuscript/prompts.js";

/** A template's question, shown as grey text in its empty answer. */
export function promptHints() {
  return new Plugin({
    props: {
      decorations({ doc }) {
        const hints: Decoration[] = [];
        doc.descendants((node, position) => {
          if (!isUnanswered(node)) return true;
          const attrs = { class: "prompt-hint", "data-prompt": String(node.attrs["prompt"]) };
          hints.push(Decoration.node(position, position + node.nodeSize, attrs));
          return false;
        });
        return DecorationSet.create(doc, hints);
      },
    },
  });
}

/** The caret in the first question not yet answered, where a new note is written; null without one. */
export function firstAnswer(doc: Node): Selection | null {
  let place: number | null = null;
  doc.descendants((node, position) => {
    if (place !== null) return false;
    if (isUnanswered(node)) place = position + 1;
    return place === null;
  });
  return place === null ? null : TextSelection.near(doc.resolve(place));
}
