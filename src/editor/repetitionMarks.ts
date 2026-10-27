import type { Node } from "prosemirror-model";
import { Plugin, PluginKey, type Command, type PluginView } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { repetitions, wordsWithSentences } from "../manuscript/review.js";
import { withoutPlaceholders } from "../manuscript/placeholders.js";
import { documentText } from "./documentText.js";

const found = (doc: Node, window: number) => {
  const { text, toDoc } = documentText(doc);
  return repetitions(wordsWithSentences(withoutPlaceholders(text)), window).map((repetition) => ({
    word: repetition.word,
    most: repetition.most,
    ranges: repetition.ranges.map((range) => ({ from: toDoc(range.from), to: toDoc(range.to) })),
  }));
};

export const sceneRepetitions = (doc: Node, window: number) =>
  found(doc, window).map((repetition) => ({
    word: repetition.word,
    count: repetition.most,
    first: repetition.ranges[0],
  }));

export function repetitionDecorations(doc: Node, window: number): DecorationSet {
  const decorations = found(doc, window).flatMap((repetition) =>
    repetition.ranges.map((range) => Decoration.inline(range.from, range.to, { class: "repeat" })),
  );
  return DecorationSet.create(doc, decorations);
}

const repetitionsKey = new PluginKey<DecorationSet>("repetitions");

export const refreshRepetitions: Command = (state, dispatch) => {
  dispatch?.(state.tr.setMeta(repetitionsKey, true));
  return true;
};

/** How long the writer pauses before the marks are counted again over the whole scene. */
export const PAUSE_MS = 300;

/** While typing, marks only move along with the text; a pause counts them again with `recount`. */
export const recountAfterPause = (recount: Command) => (): PluginView => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return {
    update: (view, previous) => {
      if (view.state.doc === previous.doc) return;
      clearTimeout(timer);
      timer = setTimeout(() => recount(view.state, view.dispatch), PAUSE_MS);
    },
    destroy: () => clearTimeout(timer),
  };
};

/** `window` is asked on each count; null turns the marks off. */
export function repetitionsPlugin(window: () => number | null) {
  const decorate = (doc: Node) => {
    const sentences = window();
    return sentences === null ? DecorationSet.empty : repetitionDecorations(doc, sentences);
  };
  return new Plugin<DecorationSet>({
    key: repetitionsKey,
    state: {
      init: (_config, state) => decorate(state.doc),
      apply: (transaction, old, _oldState, state) => {
        if (transaction.getMeta(repetitionsKey)) return decorate(state.doc);
        return transaction.docChanged ? old.map(transaction.mapping, transaction.doc) : old;
      },
    },
    view: recountAfterPause(refreshRepetitions),
    props: { decorations: (state) => repetitionsKey.getState(state) },
  });
}
