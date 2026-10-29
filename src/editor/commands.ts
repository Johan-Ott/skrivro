import { toggleMark } from "prosemirror-commands";
import type { Node, ResolvedPos } from "prosemirror-model";
import { TextSelection, type Command, type EditorState } from "prosemirror-state";
import { findWrapping, liftTarget } from "prosemirror-transform";
import { manuscriptSchema as schema, type StyleName } from "../manuscript/schema.js";
import { t } from "../i18n/i18n.js";

export type StyleChoice = StyleName | "brodtext";

export const STYLE_LABELS: Record<StyleChoice, string> = {
  brodtext: t("Brödtext"),
  brev: t("Brev"),
  citat: t("Citat"),
  dikt: t("Dikt"),
  meddelande: t("Meddelande"),
  "meddelande-ut": t("Mitt meddelande"),
  motto: t("Motto"),
  centrerat: t("Centrerat"),
  hoger: t("Högerställt"),
  "utan-indrag": t("Utan indrag"),
  kapitaler: t("Kapitäler"),
  punktlista: t("Punktlista"),
  numrerad: t("Numrerad lista"),
  indrag: t("Indrag"),
  underrubrik: t("Underrubrik"),
  ruta: t("Ruta"),
  "hangande-indrag": t("Hängande indrag"),
};

export const toggleBold = toggleMark(schema.marks.bold);
export const toggleItalic = toggleMark(schema.marks.italic);
export const toggleUnderline = toggleMark(schema.marks.underline);
export const toggleStrike = toggleMark(schema.marks.strike);
export const toggleSuperscript = toggleMark(schema.marks.superscript);
export const toggleSubscript = toggleMark(schema.marks.subscript);

/** The marks the format row turns on and off. */
export type TextMark = "bold" | "italic" | "underline" | "strike" | "superscript" | "subscript";

export const insertLineBreak: Command = (state, dispatch) => {
  dispatch?.(state.tr.replaceSelectionWith(schema.nodes.lineBreak.create()).scrollIntoView());
  return true;
};

export const insertSceneBreak: Command = (state, dispatch) => {
  const { $from } = state.selection;
  if (!$from.parent.isTextblock) return false;
  if (!dispatch) return true;
  const sceneBreak = schema.nodes.sceneBreak.create();
  if ($from.parentOffset === 0 && $from.parent.content.size > 0) {
    dispatch(state.tr.insert($from.before(), sceneBreak).scrollIntoView());
    return true;
  }
  const transaction = state.tr.deleteSelection();
  const splitAt = transaction.selection.from;
  transaction.split(splitAt).insert(splitAt + 1, sceneBreak);
  transaction.setSelection(TextSelection.create(transaction.doc, splitAt + 3));
  dispatch(transaction.scrollIntoView());
  return true;
};

function styleBlockAround($pos: ResolvedPos): { node: Node; pos: number } | null {
  for (let depth = $pos.depth; depth > 0; depth--) {
    const node = $pos.node(depth);
    if (node.type === schema.nodes.styleBlock) return { node, pos: $pos.before(depth) };
  }
  return null;
}

export function currentStyle(state: EditorState): StyleChoice {
  const container = styleBlockAround(state.selection.$from);
  return container ? (container.node.attrs["style"] as StyleName) : "brodtext";
}

const changeStyle =
  (style: StyleName, container: { node: Node; pos: number }): Command =>
  (state, dispatch) => {
    const attrs = { ...container.node.attrs, style };
    dispatch?.(state.tr.setNodeMarkup(container.pos, undefined, attrs));
    return true;
  };

const liftOutOfStyle: Command = (state, dispatch) => {
  const range = state.selection.$from.blockRange(state.selection.$to);
  const target = range && liftTarget(range);
  if (!range || target === null || target === undefined) return false;
  dispatch?.(state.tr.lift(range, target));
  return true;
};

const wrapInStyle =
  (style: StyleName): Command =>
  (state, dispatch) => {
    const range = state.selection.$from.blockRange(state.selection.$to);
    const wrapping = range && findWrapping(range, schema.nodes.styleBlock, { style });
    if (!range || !wrapping) return false;
    dispatch?.(state.tr.wrap(range, wrapping));
    return true;
  };

export function setStyle(style: StyleChoice): Command {
  return (state, dispatch) => {
    const container = styleBlockAround(state.selection.$from);
    if (style === "brodtext") return container ? liftOutOfStyle(state, dispatch) : true;
    if (container) return changeStyle(style, container)(state, dispatch);
    return wrapInStyle(style)(state, dispatch);
  };
}

/** The style, or plain text again when the paragraphs have it already. */
export const toggleStyle =
  (style: StyleName): Command =>
  (state, dispatch) =>
    setStyle(currentStyle(state) === style ? "brodtext" : style)(state, dispatch);

export function isMarkActive(state: EditorState, markName: TextMark): boolean {
  const markType = schema.marks[markName];
  const { from, to, empty, $from } = state.selection;
  if (empty) return Boolean(markType.isInSet(state.storedMarks ?? $from.marks()));
  return state.doc.rangeHasMark(from, to, markType);
}

/** Styles and links say what the text is, so they stay. */
export const clearFormatting: Command = (state, dispatch) => {
  const { from, to } = state.selection;
  const transaction = state.tr
    .removeMark(from, to, schema.marks.bold)
    .removeMark(from, to, schema.marks.italic)
    .removeMark(from, to, schema.marks.underline)
    .removeMark(from, to, schema.marks.strike)
    .removeMark(from, to, schema.marks.superscript)
    .removeMark(from, to, schema.marks.subscript)
    .setStoredMarks([]);
  dispatch?.(transaction);
  return true;
};

export const cursorAtBlock =
  (index: number): Command =>
  (state, dispatch) => {
    let position = 0;
    state.doc.forEach((_block, offset, blockIndex) => {
      if (blockIndex <= index) position = offset + 1;
    });
    const selection = TextSelection.near(
      state.doc.resolve(Math.min(position, state.doc.content.size)),
    );
    dispatch?.(state.tr.setSelection(selection).scrollIntoView());
    return true;
  };

/** The cursor back where the writer left it, or as near as the text still allows. */
export const cursorAt =
  (position: number): Command =>
  (state, dispatch) => {
    const near = TextSelection.near(state.doc.resolve(Math.min(position, state.doc.content.size)));
    dispatch?.(state.tr.setSelection(near).scrollIntoView());
    return true;
  };
