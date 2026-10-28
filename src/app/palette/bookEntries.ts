import type { PaletteEntry } from "./paletteSearch.js";
import { findNode, type TreeNode } from "../../project/tree.js";
import { command, type PaletteContext } from "./paletteEntries.js";
import { shortcutOf } from "../shortcuts.js";
import { t } from "../../i18n/i18n.js";

export function sceneEntries(context: PaletteContext): PaletteEntry[] {
  const { splitScene, mergeScene, read, openChapterId, readAloud, toggleSuggesting } = context;
  return [
    ...(toggleSuggesting ? [command(t("Skriv förslag"), toggleSuggesting)] : []),
    ...(readAloud ? [command(t("Läs upp från markören"), readAloud, shortcutOf("readAloud"))] : []),
    ...(read && openChapterId ? [command(t("Läs kapitlet"), () => read(openChapterId))] : []),
    ...(read ? [command(t("Läs hela boken"), () => read(null), shortcutOf("read"))] : []),
    ...(splitScene
      ? [command(t("Dela scenen vid markören"), splitScene, shortcutOf("splitScene"))]
      : []),
    ...(mergeScene ? [command(t("Slå ihop med nästa scen"), mergeScene)] : []),
  ];
}

export function cardEntries({ cards, describe, openCard, project }: PaletteContext) {
  return cards.map((card): PaletteEntry => {
    // A file is told by its whole name, so rapport.pdf and rapport.txt can be told apart.
    const hint = card.file ?? describe(card.id);
    const { kind } = card;
    return {
      id: `kort:${card.id}`,
      label: card.name,
      group: card.sortLabel,
      run: () => openCard(card.id),
      ...(hint ? { hint } : {}),
      ...(kind ? { kind } : {}),
      ...labelled(project.tree, card.id),
    };
  });
}

/** The node's labels, for the palette's label chips. */
export function labelled(tree: TreeNode[], id: string) {
  const labels = findNode(tree, id)?.node.labels;
  return labels?.length ? { labels } : {};
}
