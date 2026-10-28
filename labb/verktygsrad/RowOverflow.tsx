import { useLayoutEffect, useState, type RefObject } from "react";
import type { Command, EditorState } from "prosemirror-state";
import { insertFootnote } from "../editor/footnoteEditing.js";
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

/** ⋯ at the row's end: alignment and lists, and the text's actions once they are folded too. */
export function RowOverflow(
  props: FormatActions & {
    editorState: EditorState | null;
    run: (command: Command) => void;
    hasTextActions: boolean;
  },
) {
  const { run, onReadAloud } = props;
  const textActions = [
    { label: t("Lägg till kommentar"), separatorBefore: true, onSelect: props.onComment },
    ...(onReadAloud ? [{ label: t("Läs upp"), onSelect: onReadAloud }] : []),
    { label: t("Fotnot"), onSelect: () => run(insertFootnote) },
  ];
  const menu = useMenuButton(t("Mer"), [
    ...blockMenuItems(props.editorState, run),
    ...(props.hasTextActions ? textActions : []),
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
