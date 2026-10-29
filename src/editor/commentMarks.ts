import type { Node } from "prosemirror-model";
import { Plugin, PluginKey, type Command } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { locate, type Anchor } from "../project/comments.js";
import { documentText } from "./documentText.js";

export interface CommentAnchor {
  id: string;
  anchor: Anchor;
  isNote?: boolean;
}

/** A quote is found again by its words, so it survives edits around it. */
export function commentDecorations(doc: Node, comments: CommentAnchor[]): DecorationSet {
  const { text, toDoc } = documentText(doc);
  const decorations = comments.flatMap(({ id, anchor, isNote }) => {
    const place = locate(text, anchor);
    if (!place) return [];
    return [
      Decoration.inline(toDoc(place.from), toDoc(place.to), {
        class: isNote ? "commented noted" : "commented",
        "data-comment": id,
      }),
    ];
  });
  return DecorationSet.create(doc, decorations);
}

const commentsKey = new PluginKey<DecorationSet>("comments");

/** Run after the comments change. */
export const refreshComments: Command = (state, dispatch) => {
  dispatch?.(state.tr.setMeta(commentsKey, true));
  return true;
};

export function commentsPlugin(comments: () => CommentAnchor[], onComment: (id: string) => void) {
  return new Plugin<DecorationSet>({
    key: commentsKey,
    state: {
      init: (_config, state) => commentDecorations(state.doc, comments()),
      // A quote moves with the text as it is typed; the comments changing find them anew.
      apply: (transaction, old, _oldState, state) => {
        if (transaction.getMeta(commentsKey)) return commentDecorations(state.doc, comments());
        return transaction.docChanged ? old.map(transaction.mapping, transaction.doc) : old;
      },
    },
    props: {
      decorations: (state) => commentsKey.getState(state),
      handleClick: (_view, _position, event) => {
        const id = (event.target as HTMLElement | null)?.closest<HTMLElement>(".commented")
          ?.dataset["comment"];
        if (id) onComment(id);
        return false;
      },
    },
  });
}
