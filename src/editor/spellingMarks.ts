import type { Node } from "prosemirror-model";
import { Plugin, PluginKey, type Command, type PluginView } from "prosemirror-state";
import { Decoration, DecorationSet, type EditorView } from "prosemirror-view";
import { withoutPlaceholders } from "../manuscript/placeholders.js";
import { documentText } from "./documentText.js";

/** What the spelling check needs from the app; null turns it off. */
export interface SpellingSwitch {
  language: string;
  misspelled: (language: string, words: string[]) => Promise<string[]>;
  suggestions: (language: string, word: string) => Promise<string[]>;
  /** Puts the word in the book's own list, so it is never marked again. */
  addWord: (word: string) => void;
  /** The book's names and own words, never marked. */
  isKnown: (word: string) => boolean;
}

// Each word is asked once per language, so a pause asks only for the words that are new.
const checked = new Map<string, Map<string, boolean>>();
const answersFor = (language: string) => {
  const answers = checked.get(language) ?? new Map<string, boolean>();
  checked.set(language, answers);
  return answers;
};

const WORD = /\p{L}+(?:['’-]\p{L}+)*/gu;

export function wordsIn(doc: Node) {
  const { text, toDoc } = documentText(doc);
  return [...withoutPlaceholders(text).matchAll(WORD)].map((match) => ({
    word: match[0],
    from: toDoc(match.index),
    to: toDoc(match.index + match[0].length),
  }));
}

/** The word at a position, for the menu that offers its corrections. */
export const wordAt = (doc: Node, position: number) =>
  wordsIn(doc).find((place) => place.from <= position && position <= place.to) ?? null;

export const isMisspelled = (spelling: SpellingSwitch, word: string) =>
  !spelling.isKnown(word) && answersFor(spelling.language).get(word) === false;

function decorate(doc: Node, spelling: SpellingSwitch | null) {
  if (!spelling) return DecorationSet.empty;
  const marks = wordsIn(doc)
    .filter((place) => isMisspelled(spelling, place.word))
    .map((place) => Decoration.inline(place.from, place.to, { class: "misspelled" }));
  return DecorationSet.create(doc, marks);
}

const spellingKey = new PluginKey<DecorationSet>("spelling");

/** Draws the marks again from what is known, as when a word is added to the book's own. */
export const refreshSpelling: Command = (state, dispatch) => {
  dispatch?.(state.tr.setMeta(spellingKey, true));
  return true;
};

// Fails quietly where the language has no dictionary: then nothing is marked.
async function checkNewWords(view: EditorView, spelling: SpellingSwitch) {
  const answers = answersFor(spelling.language);
  const fresh = [...new Set(wordsIn(view.state.doc).map((place) => place.word))].filter(
    (word) => !answers.has(word) && !spelling.isKnown(word),
  );
  if (fresh.length === 0) return refreshSpelling(view.state, view.dispatch);
  const answer = await spelling.misspelled(spelling.language, fresh).catch(() => null);
  if (!answer) return;
  const wrong = new Set(answer);
  for (const word of fresh) answers.set(word, !wrong.has(word));
  if (!view.isDestroyed) refreshSpelling(view.state, view.dispatch);
}

/** Checks at once, as when the book's language or names change. */
export function checkSpellingNow(view: EditorView) {
  const spec = spellingKey.get(view.state)?.spec as
    { spelling?: () => SpellingSwitch | null } | undefined;
  const spelling = spec?.spelling?.() ?? null;
  if (spelling) void checkNewWords(view, spelling);
  else if (spec) refreshSpelling(view.state, view.dispatch);
}

const PAUSE_MS = 600;

function checkAfterPause(spelling: () => SpellingSwitch | null) {
  return (view: EditorView): PluginView => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = () => {
      const current = spelling();
      if (current) void checkNewWords(view, current);
    };
    timer = setTimeout(check, PAUSE_MS);
    return {
      update: (_view, previous) => {
        if (view.state.doc === previous.doc) return;
        clearTimeout(timer);
        timer = setTimeout(check, PAUSE_MS);
      },
      destroy: () => clearTimeout(timer),
    };
  };
}

/** `spelling` is asked on each check, so a new language or name needs no new editor. */
export function spellingPlugin(spelling: () => SpellingSwitch | null) {
  return new Plugin<DecorationSet>({
    key: spellingKey,
    spelling,
    state: {
      init: (_config, state) => decorate(state.doc, spelling()),
      apply: (transaction, old, _oldState, state) => {
        if (transaction.getMeta(spellingKey)) return decorate(state.doc, spelling());
        return transaction.docChanged ? old.map(transaction.mapping, transaction.doc) : old;
      },
    },
    view: checkAfterPause(spelling),
    props: { decorations: (state) => spellingKey.getState(state) },
  });
}
