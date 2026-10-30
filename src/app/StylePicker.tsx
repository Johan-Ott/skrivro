import type { Command, EditorState } from "prosemirror-state";
import { useState } from "react";
import { lookPoints } from "../export/styleLooks.js";
import {
  currentStyle,
  setStyle,
  STYLE_LABELS,
  STYLE_ORDER,
  type StyleChoice,
} from "../editor/commands.js";
import { Menu } from "@llkit/Menu.js";
import { points } from "./bookdesign/LayoutRows.js";
import { StylesDialog, type BookStyles } from "./StylesDialog.js";
import { t } from "../i18n/i18n.js";

interface StylePickerProps {
  editorState: EditorState | null;
  run: (command: Command) => void;
  styles: BookStyles;
}

function ChevronDown() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

// Each style in its own look, with its size beside it, and last the dialog that changes them.
function menuItems({ editorState, run, styles }: StylePickerProps, onEdit: () => void) {
  const style = editorState ? currentStyle(editorState) : "brodtext";
  const choices = STYLE_ORDER.map((choice) => ({
    label: STYLE_LABELS[choice],
    labelClass: choice === "brodtext" ? undefined : `look-${choice}`,
    hint: points(
      choice === "brodtext" ? styles.bodySize : lookPoints(styles.bodySize, styles.looks[choice]),
    ),
    isChecked: choice === style,
    onSelect: () => run(setStyle(choice)),
  }));
  return [...choices, { label: t("Ändra stilar…"), separatorBefore: true, onSelect: onEdit }];
}

type Place = { x: number; y: number };

const PickerButton = (props: {
  style: StyleChoice;
  isOpen: boolean;
  onOpen: (at: Place) => void;
}) => (
  <button
    className="style-picker"
    aria-label={`Stil: ${STYLE_LABELS[props.style]}`}
    aria-haspopup="menu"
    aria-expanded={props.isOpen}
    onMouseDown={(event) => event.preventDefault()}
    onClick={(event) => {
      const box = event.currentTarget.getBoundingClientRect();
      props.onOpen({ x: box.left, y: box.bottom + 4 });
    }}
  >
    {STYLE_LABELS[props.style]}
    <ChevronDown />
  </button>
);

export function StylePicker(props: StylePickerProps) {
  const [menuAt, setMenuAt] = useState<Place | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const style = props.editorState ? currentStyle(props.editorState) : "brodtext";
  return (
    <>
      <PickerButton style={style} isOpen={menuAt !== null} onOpen={setMenuAt} />
      {menuAt && (
        <Menu
          {...menuAt}
          label={t("Stil")}
          items={menuItems(props, () => setIsEditing(true))}
          onClose={() => setMenuAt(null)}
        />
      )}
      {isEditing && (
        <StylesDialog
          styles={props.styles}
          first={style === "brodtext" ? "brev" : style}
          onClose={() => setIsEditing(false)}
        />
      )}
    </>
  );
}
