import type { EditorState } from "prosemirror-state";
import { countWordsBetween } from "../manuscript/wordCount.js";
import { t, formatNumber } from "../i18n/i18n.js";

// Over a selection while the format row stands fixed above the text: not formatting, which is up
// there, but what can be done with these very words.

export interface SelectionActionProps {
  editorState: EditorState | null;
  onComment: () => void;
  onReadAloud?: (() => void) | undefined;
  /** Every place in the book where the words stand. */
  onSearchBook?: ((text: string) => void) | undefined;
  /** A note named after the words, for a name or a place met in the text. */
  onMakeNote?: ((name: string) => void) | undefined;
  /** The words out of the scene and into the note Strukna, to be got back later. */
  onMoveToCuts?: (() => void) | undefined;
}

// A name or a place is a few words; a longer selection is no note's title.
const MOST_NOTE_WORDS = 4;

const ActionButton = (props: { label: string; onClick: () => void }) => (
  <button className="icon-button bar-action" onClick={props.onClick}>
    {props.label}
  </button>
);

function WordButtons(props: SelectionActionProps & { text: string; words: number }) {
  const { onSearchBook, onMakeNote, onMoveToCuts, onReadAloud, text, words } = props;
  return (
    <span className="bar-group">
      <ActionButton label={t("Kommentera")} onClick={props.onComment} />
      {onReadAloud && <ActionButton label={t("Läs upp")} onClick={onReadAloud} />}
      {onSearchBook && text && (
        <ActionButton label={t("Sök i boken")} onClick={() => onSearchBook(text)} />
      )}
      {onMakeNote && text && words <= MOST_NOTE_WORDS && (
        <ActionButton label={t("Gör till anteckning")} onClick={() => onMakeNote(text)} />
      )}
      {onMoveToCuts && <ActionButton label={t("Flytta till Strukna")} onClick={onMoveToCuts} />}
    </span>
  );
}

export function SelectionActions(props: SelectionActionProps) {
  const state = props.editorState;
  if (!state) return null;
  const { from, to } = state.selection;
  const words = countWordsBetween(state.doc, from, to);
  return (
    <>
      <span className="selection-words">
        {words === 1 ? t("1 ord") : t("{count} ord", { count: formatNumber(words) })}
      </span>
      <WordButtons {...props} text={state.doc.textBetween(from, to, " ").trim()} words={words} />
    </>
  );
}
