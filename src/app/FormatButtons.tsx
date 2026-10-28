import { redo, undo } from "prosemirror-history";
import { usePhone } from "./phone/usePhone.js";
import type { Command, EditorState } from "prosemirror-state";
import type { ReactNode } from "react";
import {
  isMarkActive,
  toggleBold,
  toggleItalic,
  toggleStrike,
  toggleUnderline,
  clearFormatting,
  type TextMark,
} from "../editor/commands.js";
import { Icon } from "./shell/icons.js";
import { t } from "../i18n/i18n.js";

// The format row's buttons, shared by the row over a selection and the row fixed over the text.

type Run = (command: Command) => void;

export interface FormatActions {
  onComment: () => void;
  /** Left out where the computer has no voice. */
  onReadAloud?: (() => void) | undefined;
  /** Left out where no picture can be chosen. */
  onInsertPicture?: (() => void) | undefined;
}

const MARKS: [TextMark, string, Command, string][] = [
  ["bold", t("Fetstil"), toggleBold, "Ctrl+B"],
  ["italic", t("Kursiv"), toggleItalic, "Ctrl+I"],
  ["underline", t("Understruken"), toggleUnderline, "Ctrl+U"],
  ["strike", t("Genomstruken"), toggleStrike, "Ctrl+Shift+X"],
];

const MARK_FACES: Record<TextMark, string> = {
  bold: "B",
  italic: "I",
  underline: "U",
  strike: "S",
};

const ClearIcon = () => (
  <Icon size={16}>
    <path d="M6 5h11" />
    <path d="M12 5 8 19" />
    <path d="m15 14 5 5m0-5-5 5" />
  </Icon>
);

/** Fet, kursiv, understruken and genomstruken, with Rensa formatering after them. */
export function MarkButtons(props: {
  editorState: EditorState | null;
  run: Run;
  hasClear?: boolean;
}) {
  const clear = t("Rensa formatering");
  return (
    <span className="bar-group" role="group" aria-label={t("Tecken")}>
      <MarkToggles editorState={props.editorState} run={props.run} />
      {props.hasClear !== false && (
        <button
          className="icon-button"
          aria-label={clear}
          title={clear}
          onClick={() => props.run(clearFormatting)}
        >
          <ClearIcon />
        </button>
      )}
    </span>
  );
}

function MarkToggles({ editorState, run }: { editorState: EditorState | null; run: Run }) {
  const isPhone = usePhone();
  return (
    <>
      {MARKS.map(([mark, label, command, keys]) => (
        <button
          key={mark}
          className={`icon-button ${mark}`}
          aria-label={label}
          title={isPhone ? label : `${label} (${keys})`}
          aria-pressed={editorState !== null && isMarkActive(editorState, mark)}
          onClick={() => run(command)}
        >
          {MARK_FACES[mark]}
        </button>
      ))}
    </>
  );
}

const ToolButton = (props: { label: string; onClick: () => void; children: ReactNode }) => (
  <button
    className="icon-button"
    aria-label={props.label}
    title={props.label}
    onClick={props.onClick}
  >
    {props.children}
  </button>
);

const UndoIcon = () => (
  <Icon size={16}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h11a5 5 0 0 1 0 10h-3" />
  </Icon>
);

const RedoIcon = () => (
  <Icon size={16}>
    <path d="m15 14 5-5-5-5" />
    <path d="M20 9H9a5 5 0 0 0 0 10h3" />
  </Icon>
);

const CommentIcon = () => (
  <Icon size={16}>
    <path d="M4 5h16v11H9l-5 4z" />
  </Icon>
);

/** Ångra and Gör om, at the start of the fixed row. */
export const HistoryButtons = ({ run }: { run: Run }) => (
  <span className="bar-group" role="group" aria-label={t("Historik")}>
    <ToolButton label={t("Ångra")} onClick={() => run(undo)}>
      <UndoIcon />
    </ToolButton>
    <ToolButton label={t("Gör om")} onClick={() => run(redo)}>
      <RedoIcon />
    </ToolButton>
  </span>
);

/** Kommentera, alone over a selection. */
export const CommentButton = ({ onComment }: Pick<FormatActions, "onComment">) => (
  <ToolButton label={t("Lägg till kommentar")} onClick={onComment}>
    <CommentIcon />
  </ToolButton>
);
