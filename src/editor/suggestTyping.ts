import { Plugin, TextSelection } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { revisedPlace, revisionChanges, writerPlace } from "../manuscript/revision.js";
import { documentText } from "./documentText.js";

/** In Redigera what the writer types goes into the editor's version beside the text, as
 * suggestions to accept later, and the text itself stays as it is. */
export interface Suggesting {
  /** Null before anything is suggested in the open text. */
  revised: () => string | null;
  write: (revised: string) => void;
  undo: () => void;
}

type Range = { from: number; to: number };

// Where the last suggestion left the caret in both texts: typing inside a change goes on where
// it was, though the caret shows at the change's end.
interface Caret {
  position: number;
  revised: number;
  text: string;
}

interface Typing {
  suggesting: () => Suggesting | null;
  caret: Caret | null;
}

const revisedNow = (view: EditorView, target: Suggesting) =>
  target.revised() ?? documentText(view.state.doc).text;

function revisedRange(view: EditorView, typing: Typing, revised: string, range: Range): Range {
  const { caret } = typing;
  const { from, to } = range;
  if (caret?.text === revised && from === caret.position && to === caret.position) {
    return { from: caret.revised, to: caret.revised };
  }
  const { text, fromDoc } = documentText(view.state.doc);
  const changes = revisionChanges(text, revised);
  return { from: revisedPlace(changes, fromDoc(from)), to: revisedPlace(changes, fromDoc(to)) };
}

// Puts `text` in place of `range` in the editor's version, and the caret after it in the text.
function put(view: EditorView, typing: Typing, range: Range, text: string) {
  const target = typing.suggesting();
  if (!target) return false;
  const revised = revisedNow(view, target);
  const next = revised.slice(0, range.from) + text + revised.slice(range.to);
  target.write(next);
  const { text: mine, toDoc } = documentText(view.state.doc);
  const placed = range.from + text.length;
  const position = toDoc(writerPlace(revisionChanges(mine, next), placed));
  view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, position)));
  typing.caret = { position, revised: placed, text: next };
  return true;
}

function type(view: EditorView, typing: Typing, range: Range, text: string) {
  const target = typing.suggesting();
  if (!target) return false;
  return put(view, typing, revisedRange(view, typing, revisedNow(view, target), range), text);
}

// Ctrl+Backspace and Ctrl+Delete take a word and the spaces beside it, never a paragraph's end.
const wordBefore = (text: string) => text.match(/\S*[^\S\n]*$/)?.[0].length || 1;
const wordAfter = (text: string) => text.match(/^[^\S\n]*\S*/)?.[0].length || 1;

// With nothing selected, the letter or word before or after the caret. The text's last
// paragraph end stays, as the text always ends with one.
function widened(revised: string, range: Range, how: { isBack: boolean; isWord: boolean }) {
  if (range.from !== range.to) return range;
  if (how.isBack) {
    const length = how.isWord ? wordBefore(revised.slice(0, range.from)) : 1;
    return { from: Math.max(0, range.from - length), to: range.to };
  }
  const length = how.isWord ? wordAfter(revised.slice(range.to)) : 1;
  return { from: range.from, to: Math.min(revised.length - 1, range.to + length) };
}

function remove(view: EditorView, typing: Typing, how: { isBack: boolean; isWord: boolean }) {
  const target = typing.suggesting();
  if (!target) return false;
  const revised = revisedNow(view, target);
  const range = widened(revised, revisedRange(view, typing, revised, view.state.selection), how);
  return range.from >= range.to || put(view, typing, range, "");
}

// Formatting has no place in the editor's version, which is plain text. Ctrl+Z takes back the
// last suggestions.
function modKey(typing: Typing, event: KeyboardEvent) {
  const key = event.key.toLowerCase();
  if (key === "z" && !event.shiftKey) {
    typing.caret = null;
    typing.suggesting()?.undo();
    return true;
  }
  if (event.shiftKey) return key === "z" || key === "x";
  return ["b", "i", "u", "y"].includes(key) || (event.altKey && key === "f");
}

const isMod = (event: KeyboardEvent) => event.ctrlKey || event.metaKey;

// A line break has no place either: Enter starts a new paragraph, Shift+Enter does nothing.
const enter = (view: EditorView, typing: Typing, event: KeyboardEvent) =>
  isMod(event) || event.shiftKey || type(view, typing, view.state.selection, "\n");

function onKey(view: EditorView, typing: Typing, event: KeyboardEvent) {
  if (!typing.suggesting() || event.isComposing) return false;
  const { key } = event;
  if (key === "Backspace" || key === "Delete") {
    return remove(view, typing, { isBack: key === "Backspace", isWord: isMod(event) });
  }
  if (key === "Enter") return enter(view, typing, event);
  return isMod(event) && modKey(typing, event);
}

function cut(view: EditorView, typing: Typing, event: ClipboardEvent) {
  if (!typing.suggesting()) return false;
  const { from, to } = view.state.selection;
  event.clipboardData?.setData("text/plain", view.state.doc.textBetween(from, to, "\n"));
  event.preventDefault();
  return from === to || remove(view, typing, { isBack: true, isWord: false });
}

/** First among the editor's plugins, so it takes every key before the text's own do. */
export function suggestTyping(suggesting: () => Suggesting | null) {
  const typing: Typing = { suggesting, caret: null };
  return new Plugin({
    props: {
      handleTextInput: (view, from, to, text) => type(view, typing, { from, to }, text),
      handleKeyDown: (view, event) => onKey(view, typing, event),
      handlePaste: (view, _event, slice) =>
        type(
          view,
          typing,
          view.state.selection,
          slice.content.textBetween(0, slice.content.size, "\n"),
        ),
      handleDrop: () => suggesting() !== null,
      handleDOMEvents: { cut: (view, event) => cut(view, typing, event) },
    },
  });
}
