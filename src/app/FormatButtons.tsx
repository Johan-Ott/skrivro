import { redo, undo } from "prosemirror-history";
import { usePhone } from "./phone/usePhone.js";
import type { Command, EditorState } from "prosemirror-state";
import type { ReactNode } from "react";
import {
  insertSceneBreak,
  isMarkActive,
  toggleBold,
  toggleItalic,
  toggleStrike,
  toggleSubscript,
  toggleSuperscript,
  toggleUnderline,
  clearFormatting,
  type TextMark,
} from "../editor/commands.js";
import { insertFootnote } from "../editor/footnoteEditing.js";
import { askForLink } from "../editor/linkEditing.js";
import { ImageIcon, Icon } from "./shell/icons.js";
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

type MarkChoice = [TextMark, string, Command, string | null];

const MARKS: MarkChoice[] = [
  ["bold", t("Fetstil"), toggleBold, "Ctrl+B"],
  ["italic", t("Kursiv"), toggleItalic, "Ctrl+I"],
  ["underline", t("Understruken"), toggleUnderline, "Ctrl+U"],
  ["strike", t("Genomstruken"), toggleStrike, "Ctrl+Shift+X"],
];

const RAISED: MarkChoice[] = [
  ["superscript", t("Upphöjd"), toggleSuperscript, null],
  ["subscript", t("Nedsänkt"), toggleSubscript, null],
];

const MARK_FACES: Record<TextMark, string> = {
  bold: "B",
  italic: "I",
  underline: "U",
  strike: "S",
  superscript: "x²",
  subscript: "x₂",
};

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
  return (
    <span className="bar-group" role="group" aria-label={t("Tecken")}>
      <MarkToggles marks={MARKS} editorState={props.editorState} run={props.run} />
      {props.hasClear !== false && (
        <ToolButton label={t("Rensa formatering")} onClick={() => props.run(clearFormatting)}>
          <ClearIcon />
        </ToolButton>
      )}
    </span>
  );
}

function MarkToggles(props: { marks: MarkChoice[]; editorState: EditorState | null; run: Run }) {
  const isPhone = usePhone();
  return (
    <>
      {props.marks.map(([mark, label, command, keys]) => (
        <button
          key={mark}
          className={`icon-button ${mark}`}
          aria-label={label}
          title={isPhone || keys === null ? label : `${label} (${keys})`}
          aria-pressed={props.editorState !== null && isMarkActive(props.editorState, mark)}
          onClick={() => props.run(command)}
        >
          {MARK_FACES[mark]}
        </button>
      ))}
    </>
  );
}

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

const LinkIcon = () => (
  <Icon size={16}>
    <path d="M10 14a3.5 3.5 0 0 0 5 0l3.5-3.5a3.5 3.5 0 0 0-5-5L12 7" />
    <path d="M14 10a3.5 3.5 0 0 0-5 0l-3.5 3.5a3.5 3.5 0 0 0 5 5L12 17" />
  </Icon>
);

const SpeakIcon = () => (
  <Icon size={16}>
    <path d="M4 10h4l5-4v12l-5-4H4z" />
    <path d="M16 9a4 4 0 0 1 0 6" />
  </Icon>
);

const FootnoteIcon = () => (
  <Icon size={16}>
    <path d="M4 8h9" />
    <path d="M8.5 8v11" />
    <path d="M16 5h2v5" />
  </Icon>
);

const SceneBreakIcon = () => (
  <Icon size={16}>
    <path d="M4 6h16" />
    <path d="M4 18h16" />
    <circle cx="7" cy="12" r="0.8" />
    <circle cx="12" cy="12" r="0.8" />
    <circle cx="17" cy="12" r="0.8" />
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

/** Upphöjd, nedsänkt and Länk, after the marks. */
export const RaiseButtons = ({
  editorState,
  run,
}: {
  editorState: EditorState | null;
  run: Run;
}) => (
  <span className="bar-group" role="group" aria-label={t("Upphöjt, nedsänkt och länk")}>
    <MarkToggles marks={RAISED} editorState={editorState} run={run} />
    <ToolButton label={t("Länk…")} onClick={() => run(askForLink)}>
      <LinkIcon />
    </ToolButton>
  </span>
);

/** Infoga: what can be put into the text where the cursor is. */
export const InsertButtons = ({ run, onInsertPicture }: { run: Run } & FormatActions) => (
  <span className="bar-group" role="group" aria-label={t("Infoga")}>
    <ToolButton label={t("Fotnot")} onClick={() => run(insertFootnote)}>
      <FootnoteIcon />
    </ToolButton>
    {onInsertPicture && (
      <ToolButton label={t("Bild…")} onClick={onInsertPicture}>
        <ImageIcon />
      </ToolButton>
    )}
    <ToolButton label={t("Scenbrytning")} onClick={() => run(insertSceneBreak)}>
      <SceneBreakIcon />
    </ToolButton>
  </span>
);

/** Kommentera, alone over a selection. */
export const CommentButton = ({ onComment }: Pick<FormatActions, "onComment">) => (
  <ToolButton label={t("Lägg till kommentar")} onClick={onComment}>
    <CommentIcon />
  </ToolButton>
);

/** Kommentera and Läs upp, as icons. */
export const TextActions = ({ onComment, onReadAloud }: FormatActions) => (
  <span className="bar-group" role="group" aria-label={t("Texten")}>
    <CommentButton onComment={onComment} />
    {onReadAloud && (
      <ToolButton label={t("Läs upp")} onClick={onReadAloud}>
        <SpeakIcon />
      </ToolButton>
    )}
  </span>
);
