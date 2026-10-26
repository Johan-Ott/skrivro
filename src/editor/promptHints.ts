import { Plugin } from "prosemirror-state";
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
