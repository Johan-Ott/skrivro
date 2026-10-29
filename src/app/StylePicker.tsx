import type { Command, EditorState } from "prosemirror-state";
import { useState } from "react";
import { currentStyle, setStyle, STYLE_LABELS, type StyleChoice } from "../editor/commands.js";
import { Menu } from "@llkit/Menu.js";
import { t } from "../i18n/i18n.js";

interface StylePickerProps {
  editorState: EditorState | null;
  run: (command: Command) => void;
}

const STYLE_ORDER: StyleChoice[] = [
  "brodtext",
  "brev",
  "citat",
  "motto",
  "dikt",
  "meddelande",
  "meddelande-ut",
  "centrerat",
  "hoger",
  "utan-indrag",
  "kapitaler",
  "punktlista",
  "numrerad",
  "indrag",
  "underrubrik",
  "ruta",
  "hangande-indrag",
];

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

export function StylePicker({ editorState, run }: StylePickerProps) {
  const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null);
  const style = editorState ? currentStyle(editorState) : "brodtext";
  const items = STYLE_ORDER.map((choice) => ({
    label: STYLE_LABELS[choice],
    isChecked: choice === style,
    onSelect: () => run(setStyle(choice)),
  }));
  return (
    <>
      <button
        className="style-picker"
        aria-label={`Stil: ${STYLE_LABELS[style]}`}
        aria-haspopup="menu"
        aria-expanded={menuAt !== null}
        onMouseDown={(event) => event.preventDefault()}
        onClick={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          setMenuAt({ x: box.left, y: box.bottom + 4 });
        }}
      >
        {STYLE_LABELS[style]}
        <ChevronDown />
      </button>
      {menuAt && (
        <Menu {...menuAt} label={t("Stil")} items={items} onClose={() => setMenuAt(null)} />
      )}
    </>
  );
}
