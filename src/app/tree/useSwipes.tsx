import { useEffect, useRef, useState } from "react";
import { freshlyTrashed } from "./freshlyTrashed.js";
import { SCENE_STATUSES } from "../../manuscript/sceneFile.js";
import { TRASH_ID, type TreeNode } from "../../project/tree.js";
import type { TreeRow as Row } from "../../project/treeRows.js";
import { nodeLabel } from "../../project/treeLabels.js";
import { rowView, type Tree, type TreeViewProps } from "./useTreeView.js";
import { t } from "../../i18n/i18n.js";

// A finger is the only pointer, as on a phone or a tablet; a mouse drags rows instead.
const isTouch = () => matchMedia("(pointer: coarse)").matches;

function nextStatusOf(row: Row, props: TreeViewProps, tree: Tree) {
  const status = rowView(row, props, tree.view.collapsed).status?.id;
  if (!status) return null;
  return SCENE_STATUSES[(SCENE_STATUSES.indexOf(status) + 1) % SCENE_STATUSES.length] ?? null;
}

function swipesFor(row: Row, props: TreeViewProps, tree: Tree) {
  const { actions } = tree;
  if (!isTouch() || actions.isInTrash(row.node.id) || !actions.canEdit(row.node)) return {};
  const next = nextStatusOf(row, props, tree);
  return {
    onSwipeLeft: () => actions.trash(row.node),
    onSwipeRight: next ? () => props.onSetSceneStatus(row.node.id, next) : undefined,
  };
}

const UNDO_MS = 8000;

// Whatever goes to Papperskorg, by a swipe, the menu or a drag, is seen as it arrives there.
function useNewlyTrashed({ dir, tree }: TreeViewProps["project"]) {
  const [trashed, setTrashed] = useState<TreeNode | null>(null);
  const seen = useRef<{ dir: string; ids: Set<string> } | null>(null);
  useEffect(() => {
    const inTrash = tree.find((node) => node.id === TRASH_ID)?.children ?? [];
    const before = seen.current;
    seen.current = { dir, ids: new Set(inTrash.map((node) => node.id)) };
    const fresh = before?.dir === dir && freshlyTrashed(before.ids, inTrash);
    if (fresh) setTrashed(fresh);
  }, [dir, tree]);
  useEffect(() => {
    if (!trashed) return;
    const timer = setTimeout(() => setTrashed(null), UNDO_MS);
    return () => clearTimeout(timer);
  }, [trashed]);
  return [trashed, setTrashed] as const;
}

// On a phone a row swipes: left to the trash and right to the scene's next status.
export const swipesOf = (row: Row, props: TreeViewProps, tree: Tree) => swipesFor(row, props, tree);

/** Anything thrown away, by a swipe, the menu or a drag, has a moment to be taken back. */
export function TrashUndo({ props, tree }: { props: TreeViewProps; tree: Tree }) {
  const [trashed, setTrashed] = useNewlyTrashed(props.project);
  if (!trashed) return null;
  return (
    <div className="toast tree-undo" role="status">
      <span>
        {t("{title} ligger i papperskorgen.", {
          title: nodeLabel(trashed, props.project.tree, props.project.summaries),
        })}
      </span>
      <button
        className="link-button"
        onClick={() => (tree.actions.restore(trashed), setTrashed(null))}
      >
        {t("Ångra")}
      </button>
    </div>
  );
}
