import type { Command, EditorState } from "prosemirror-state";
import type { ReactNode } from "react";
import { currentStyle, setStyle } from "../editor/commands.js";
import { Icon } from "./shell/icons.js";
import { t } from "../i18n/i18n.js";

type Run = (command: Command) => void;

const AlignLeftIcon = () => (
  <Icon size={16}>
    <path d="M4 7h16" />
    <path d="M4 12h10" />
    <path d="M4 17h14" />
  </Icon>
);

const AlignCenterIcon = () => (
  <Icon size={16}>
    <path d="M4 7h16" />
    <path d="M7 12h10" />
    <path d="M5 17h14" />
  </Icon>
);

const AlignRightIcon = () => (
  <Icon size={16}>
    <path d="M4 7h16" />
    <path d="M10 12h10" />
    <path d="M6 17h14" />
  </Icon>
);

const BulletIcon = () => (
  <Icon size={16}>
    <path d="M9 7h11" />
    <path d="M9 12h11" />
    <path d="M9 17h11" />
    <circle cx="4.5" cy="7" r="0.8" />
    <circle cx="4.5" cy="12" r="0.8" />
    <circle cx="4.5" cy="17" r="0.8" />
  </Icon>
);

const NumberedIcon = () => (
  <Icon size={16}>
    <path d="M10 7h10" />
    <path d="M10 12h10" />
    <path d="M10 17h10" />
    <path d="M4 5.5 5.5 4.5v5" />
    <path d="M4 14.5c.5-1 2.5-1 2.5.3 0 1-2.5 1.7-2.5 3.2h2.5" />
  </Icon>
);

const IndentIcon = () => (
  <Icon size={16}>
    <path d="M4 6h16" />
    <path d="M11 10h9" />
    <path d="M11 14h9" />
    <path d="M4 18h16" />
    <path d="m4 9.5 3 2.5-3 2.5" />
  </Icon>
);

// Each a style around the paragraphs: chosen again, the paragraphs are plain text once more.
const BLOCK_STYLES: ["punktlista" | "numrerad" | "indrag", string, ReactNode][] = [
  ["punktlista", t("Punktlista"), <BulletIcon key="p" />],
  ["numrerad", t("Numrerad lista"), <NumberedIcon key="n" />],
  ["indrag", t("Indrag"), <IndentIcon key="i" />],
];

// Vänster, centrerat and höger are the styles of those names; vänster leaves any other style be.
const ALIGNMENTS: ["vanster" | "centrerat" | "hoger", string, ReactNode][] = [
  ["vanster", t("Vänsterställt"), <AlignLeftIcon key="v" />],
  ["centrerat", t("Centrerat"), <AlignCenterIcon key="c" />],
  ["hoger", t("Högerställt"), <AlignRightIcon key="h" />],
];

const currentOf = (editorState: EditorState | null) =>
  editorState ? currentStyle(editorState) : "brodtext";

const isAligned = (current: string, choice: string) =>
  choice === "vanster" ? current !== "centrerat" && current !== "hoger" : current === choice;

function align(current: string, choice: string, run: Run) {
  if (choice !== "vanster") return run(setStyle(choice as "centrerat" | "hoger"));
  if (current === "centrerat" || current === "hoger") run(setStyle("brodtext"));
}

/** Justering and the lists as rows of a menu, for the format row's ⋯ in a narrow window. */
export function blockMenuItems(editorState: EditorState | null, run: Run) {
  const current = currentOf(editorState);
  return [
    ...ALIGNMENTS.map(([choice, label]) => ({
      label,
      isChecked: isAligned(current, choice),
      onSelect: () => align(current, choice, run),
    })),
    ...BLOCK_STYLES.map(([choice, label], index) => ({
      label,
      isChecked: current === choice,
      separatorBefore: index === 0,
      onSelect: () => run(setStyle(current === choice ? "brodtext" : choice)),
    })),
  ];
}
