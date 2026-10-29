import type { Command, EditorState } from "prosemirror-state";
import { insertSceneBreak, toggleSubscript, toggleSuperscript } from "../editor/commands.js";
import { insertFootnote } from "../editor/footnoteEditing.js";
import { askForLink } from "../editor/linkEditing.js";
import { useMenuButton } from "@llkit/Menu.js";
import { blockMenuItems } from "./AlignButtons.js";
import type { FormatActions } from "./FormatButtons.js";
import { t } from "../i18n/i18n.js";

/** ⋯ at the row's end: what a manuscript seldom needs, in words: alignment, lists, upphöjd,
 * nedsänkt and links, insert, read. */
export function RowOverflow(
  props: FormatActions & { editorState: EditorState | null; run: (command: Command) => void },
) {
  const { run, onReadAloud, onInsertPicture } = props;
  const menu = useMenuButton(t("Mer"), [
    ...blockMenuItems(props.editorState, run),
    { label: t("Upphöjd"), separatorBefore: true, onSelect: () => run(toggleSuperscript) },
    { label: t("Nedsänkt"), onSelect: () => run(toggleSubscript) },
    { label: t("Länk…"), onSelect: () => run(askForLink) },
    { label: t("Fotnot"), separatorBefore: true, onSelect: () => run(insertFootnote) },
    ...(onInsertPicture ? [{ label: t("Bild…"), onSelect: onInsertPicture }] : []),
    { label: t("Scenbrytning"), onSelect: () => run(insertSceneBreak) },
    ...(onReadAloud ? [{ label: t("Läs upp"), onSelect: onReadAloud }] : []),
  ]);
  return (
    <span className="bar-group">
      <button className="icon-button" aria-label={t("Mer")} title={t("Mer")} onClick={menu.open}>
        ⋯
      </button>
      {menu.menu}
    </span>
  );
}
