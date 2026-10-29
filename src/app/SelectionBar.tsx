import {
  AllSelection,
  TextSelection,
  type Command,
  type EditorState,
  type Selection,
} from "prosemirror-state";
import { useEditorState } from "../editor/editorStore.js";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import type { useEditorView } from "../editor/useEditorView.js";
import { SelectionActions, type SelectionActionProps } from "./SelectionActions.js";
import {
  HistoryButtons,
  InsertButtons,
  MarkButtons,
  RaiseButtons,
  TextActions,
  type FormatActions,
} from "./FormatButtons.js";
import { AlignButtons, ListButtons } from "./AlignButtons.js";
import { StylePicker } from "./StylePicker.js";
import { misspelledAtCaret } from "./spelling/Corrections.js";
import { RowOverflow, useFolding } from "./RowOverflow.js";
import { usePhone } from "./phone/usePhone.js";
import { countWordsBetween } from "../manuscript/wordCount.js";
import { t, formatNumber } from "../i18n/i18n.js";

type Editor = ReturnType<typeof useEditorView>;

const BAR_HEIGHT = 46;

function SelectedWords({ editorState }: { editorState: EditorState | null }) {
  if (!editorState) return null;
  const { from, to } = editorState.selection;
  const words = countWordsBetween(editorState.doc, from, to);
  return (
    <span className="selection-words">
      {words === 1 ? t("1 ord") : t("{count} ord", { count: formatNumber(words) })}
    </span>
  );
}

// Focus moving in or out of the text makes no transaction, so it is followed here.
function useIsBarWanted(editor: Editor) {
  const [hasFocus, setFocus] = useState(false);
  const element = editor.viewRef.current?.dom;
  useEffect(() => {
    if (!element) return;
    const onFocus = () => setFocus(true);
    // The style menu takes the focus while it is open; the bar it belongs to stays.
    const onBlur = (event: FocusEvent) =>
      setFocus(event.relatedTarget instanceof Element && !!event.relatedTarget.closest(".menu"));
    element.addEventListener("focus", onFocus);
    element.addEventListener("blur", onBlur);
    return () => {
      element.removeEventListener("focus", onFocus);
      element.removeEventListener("blur", onBlur);
    };
  }, [element]);
  return hasFocus;
}

// On a phone the bar waits just above the tools over the keyboard, out of the way of the fingers
// that drag the selection's ends.
const phoneBarTop = () =>
  (document.querySelector(".phone-toolbar")?.getBoundingClientRect().top ??
    window.visualViewport?.height ??
    window.innerHeight) -
  BAR_HEIGHT -
  8;

// Under the top bar at the least: a selection that starts above the screen, as Ctrl+A's does,
// keeps its bar where it can be seen.
const TOP_ROOM = 56;

// The words chosen, whether dragged over or all of them with Ctrl+A.
const isChosenText = (selection: Selection | undefined): selection is Selection =>
  (selection instanceof TextSelection || selection instanceof AllSelection) && !selection.empty;

function barPosition(editor: Editor, isPhone: boolean) {
  const view = editor.viewRef.current;
  const selection = view?.state.selection;
  if (!view || !isChosenText(selection)) return null;
  if (isPhone) return { top: phoneBarTop() };
  const start = view.coordsAtPos(selection.from);
  const left = Math.max(start.left, view.dom.getBoundingClientRect().left);
  if (start.top > BAR_HEIGHT * 2) return { left, top: start.top - BAR_HEIGHT - 6 };
  if (start.top < TOP_ROOM) return { left, top: TOP_ROOM };
  return { left, top: view.coordsAtPos(selection.to).bottom + 6 };
}

// A misspelled word clicked or double-clicked has its corrections under it; the floating row
// stays away so the two never stack.
const wantedPosition = (editor: Editor, isWanted: boolean, isPhone: boolean) =>
  isWanted && misspelledAtCaret(editor, editor.viewRef.current?.state ?? null) === null
    ? barPosition(editor, isPhone)
    : null;

interface BarProps extends FormatActions, Omit<SelectionActionProps, "editorState"> {
  editor: Editor;
}

// The phone's own menu over a selection is turned off (MainActivity.kt), so copying is here, after
// what only Skrivro does; the footnote is in the tools over the keyboard.
const PhoneRow = ({ onComment, onMoveToCuts, editorState, run }: RowProps) => (
  <>
    <MarkButtons editorState={editorState} run={run} hasClear={false} />
    <button className="icon-button" onClick={onComment}>
      {t("Kommentera")}
    </button>
    {onMoveToCuts && (
      <button className="icon-button" onClick={onMoveToCuts}>
        {t("Flytta till Strukna")}
      </button>
    )}
    <button className="icon-button" onClick={() => document.execCommand("copy")}>
      {t("Kopiera")}
    </button>
    <button className="icon-button" onClick={() => document.execCommand("cut")}>
      {t("Klipp ut")}
    </button>
  </>
);

type RowProps = BarProps & { editorState: EditorState | null; run: (command: Command) => void };

// Fixed over the text, everything, as a word processor's row; a narrow one folds the words'
// count away first, then raised text, alignment and lists, then insert and the text's actions.
const FixedRow = (props: RowProps & { folded: number }) => (
  <>
    <HistoryButtons run={props.run} />
    <StylePicker {...props} />
    <MarkButtons {...props} />
    {props.folded < 2 && (
      <>
        <RaiseButtons {...props} />
        <AlignButtons {...props} />
        <ListButtons {...props} />
      </>
    )}
    {props.folded < 3 && (
      <>
        <InsertButtons {...props} />
        <TextActions {...props} />
      </>
    )}
    {props.folded >= 2 && <RowOverflow {...props} hasTextActions={props.folded >= 3} />}
    {props.folded < 1 && <SelectedWords editorState={props.editorState} />}
  </>
);

// A selection's row: what can be done with the words, as the formatting is in the row above; a
// phone, with no row above, has its own.
const FloatingContent = (props: RowProps & { isPhone: boolean }) =>
  props.isPhone ? <PhoneRow {...props} /> : <SelectionActions {...props} />;

const Bar = (props: {
  className: string;
  label: string;
  style: object;
  barRef?: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) => (
  <div
    ref={props.barRef}
    className={props.className}
    role="toolbar"
    aria-label={props.label}
    style={props.style}
    onMouseDown={(event) => event.preventDefault()}
  >
    {props.children}
  </div>
);

/** The format row fixed over the text, and the row over a selection. */
export function SelectionBar(props: BarProps) {
  const { editor } = props;
  const editorState = useEditorState(editor);
  const isWanted = useIsBarWanted(editor);
  const isPhone = usePhone();
  const floating = wantedPosition(editor, isWanted, isPhone);
  const row = { ...props, editorState, run: editor.run, isPhone };
  const fixed = useRef<HTMLDivElement>(null);
  const folded = useFolding(fixed);
  return (
    <>
      {!isPhone && (
        <Bar className="selection-bar fixed" label={t("Formatering")} style={{}} barRef={fixed}>
          <FixedRow {...row} folded={folded} />
        </Bar>
      )}
      {floating && (
        <Bar
          className={isPhone ? "selection-bar phone" : "selection-bar"}
          label={t("Markering")}
          style={floating}
        >
          <FloatingContent {...row} />
        </Bar>
      )}
    </>
  );
}
