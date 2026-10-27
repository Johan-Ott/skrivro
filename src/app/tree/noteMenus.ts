import type { MenuItem } from "@llkit/Menu.js";
import type { TreeNode } from "../../project/tree.js";
import { t } from "../../i18n/i18n.js";
import type { TreeMenuActions } from "./treeMenus.js";

// A note moves to another sort, such as from Övrigt to Personer.
function sortMoves(node: TreeNode, actions: TreeMenuActions): MenuItem[] {
  const sorts = actions.otherSorts(node);
  if (sorts.length === 0) return [];
  const submenu = sorts.map(({ id, name }) => ({
    label: name,
    onSelect: () => actions.moveInto(node, id),
  }));
  return [{ label: t("Flytta till"), submenu }];
}

// A note becomes a scene in a chapter, as dragging it there does on the computer.
function sceneMoves(node: TreeNode, { makeScene, chapters }: TreeMenuActions): MenuItem[] {
  if (!makeScene) return [];
  const last = { label: t("Sist i manuset"), onSelect: () => makeScene(node, null) };
  const inChapters = chapters().map(({ id, name }) => ({
    label: name,
    onSelect: () => makeScene(node, id),
  }));
  return [{ label: t("Gör till scen i"), submenu: [last, ...inChapters] }];
}

// A note has no status; its menu chooses whether its name is linked instead.
export function noteItems(node: TreeNode, actions: TreeMenuActions): MenuItem[] | null {
  const isLinked = actions.linkOf(node);
  if (isLinked === null) return null;
  const { moveToSeries, saveAsTemplate } = actions;
  return [
    {
      label: t("Koppla namnet i texten"),
      isChecked: isLinked,
      separatorBefore: true,
      onSelect: () => actions.setLink(node, !isLinked),
    },
    ...sortMoves(node, actions),
    ...(actions.isFile(node) ? [] : sceneMoves(node, actions)),
    ...(moveToSeries
      ? [{ label: t("Flytta till serien"), onSelect: () => moveToSeries(node) }]
      : []),
    ...(saveAsTemplate && !actions.isFile(node)
      ? [{ label: t("Spara som mall"), onSelect: () => saveAsTemplate(node) }]
      : []),
  ];
}
