import { useLayoutEffect, useState, type RefObject } from "react";
import type { Command, EditorState } from "prosemirror-state";
import { insertSceneBreak, toggleSubscript, toggleSuperscript } from "../editor/commands.js";
import { insertFootnote } from "../editor/footnoteEditing.js";
import { askForLink } from "../editor/linkEditing.js";
import { useMenuButton } from "@llkit/Menu.js";
import { blockMenuItems } from "./AlignButtons.js";
import type { FormatActions } from "./FormatButtons.js";
import { t } from "../i18n/i18n.js";

// The format row in a narrow window: what does not fit folds into ⋯ instead of being cut off.

const MOST_FOLDED = 3;

/** How much of the row is folded away, 0 to 3: grown back as soon as there is room. */
export function useFolding(row: RefObject<HTMLElement | null>) {
  const [folded, setFolded] = useState(0);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const element = row.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry?.contentRect.width ?? 0));
    observer.observe(element);
    return () => observer.disconnect();
  }, [row]);
  // Each new width starts unfolded and folds one step at a time, before anything is drawn.
  useLayoutEffect(() => setFolded(0), [width]);
  useLayoutEffect(() => {
    const element = row.current;
    if (element && element.scrollWidth > element.clientWidth && folded < MOST_FOLDED) {
      setFolded(folded + 1);
    }
  }, [row, folded, width]);
  return folded;
}

type OverflowProps = FormatActions & { run: (command: Command) => void };

const raisedItems = ({ run }: OverflowProps) => [
  { label: t("Upphöjd"), separatorBefore: true, onSelect: () => run(toggleSuperscript) },
  { label: t("Nedsänkt"), onSelect: () => run(toggleSubscript) },
  { label: t("Länk…"), onSelect: () => run(askForLink) },
];

const textItems = ({ run, onInsertPicture, onComment, onReadAloud }: OverflowProps) => [
  { label: t("Fotnot"), separatorBefore: true, onSelect: () => run(insertFootnote) },
  ...(onInsertPicture ? [{ label: t("Bild…"), onSelect: onInsertPicture }] : []),
  { label: t("Scenbrytning"), onSelect: () => run(insertSceneBreak) },
  { label: t("Lägg till kommentar"), separatorBefore: true, onSelect: onComment },
  ...(onReadAloud ? [{ label: t("Läs upp"), onSelect: onReadAloud }] : []),
];

/** ⋯ at the row's end: alignment, lists, upphöjd, nedsänkt and links, and the insert and text
 * actions once they are folded too. */
export function RowOverflow(
  props: OverflowProps & { editorState: EditorState | null; hasTextActions: boolean },
) {
  const menu = useMenuButton(t("Mer"), [
    ...blockMenuItems(props.editorState, props.run),
    ...raisedItems(props),
    ...(props.hasTextActions ? textItems(props) : []),
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
