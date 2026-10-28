import { useCallback, useState } from "react";
import {
  findNode,
  insertAfter,
  insertNode,
  type NodeKind,
  type TreeNode,
} from "../project/tree.js";
import { chapterOf } from "../project/treeLabels.js";
import { newSceneId } from "../storage/sceneId.js";
import { platform } from "./platform.js";
import type { SceneStatus } from "../manuscript/sceneFile.js";
import {
  createScene,
  openScene,
  renameScene,
  setSceneStatus,
  type SceneSession,
} from "./sceneSession.js";
import type { Placement } from "./tree/treeMenus.js";
import type { Project } from "./useProject.js";
import { t } from "../i18n/i18n.js";

interface ProjectActionsInput {
  project: Project | null;
  session: SceneSession;
  updateTree: (tree: TreeNode[]) => Promise<void>;
  refresh: () => Promise<void>;
  /** Puts the cursor in a new scene, so the writer can type at once. */
  focusEditor?: () => void;
}

const NEW_TITLES: Record<NodeKind, string> = {
  scene: t("Ny scen"),
  chapter: t("Nytt kapitel"),
  part: t("Ny del"),
  folder: t("Ny mapp"),
  sort: t("Ny sort"),
};

function newSceneTitle(tree: TreeNode[], placement: Placement) {
  const folder = placement && "inside" in placement ? findNode(tree, placement.inside) : null;
  return folder?.node.kind === "sort" ? t("Ny anteckning") : NEW_TITLES.scene;
}

// A scene goes after the open scene, a chapter after the current chapter, others last.
function defaultPlacement(tree: TreeNode[], kind: NodeKind, openSceneId: string | null) {
  if (!openSceneId || kind === "part" || kind === "folder") return null;
  if (kind === "scene") return openSceneId;
  return chapterOf(tree, openSceneId)?.id ?? null;
}

function place(tree: TreeNode[], node: TreeNode, placement: Placement, openSceneId: string | null) {
  if (placement && "inside" in placement) {
    return insertNode(tree, node, placement.inside, Number.MAX_SAFE_INTEGER);
  }
  const afterId = placement ? placement.after : defaultPlacement(tree, node.kind, openSceneId);
  return insertAfter(tree, node, afterId);
}

// After a title or status change the tree reads the scene files again.
function useSceneFileActions({
  project,
  session,
  refresh,
}: Omit<ProjectActionsInput, "updateTree">) {
  const renameSceneTitle = useCallback(
    async (id: string, title: string) => {
      if (!project) return;
      await renameScene(session, project.dir, id, title);
      await refresh();
    },
    [project, session, refresh],
  );
  const setStatus = useCallback(
    async (id: string, status: SceneStatus) => {
      if (!project) return;
      await setSceneStatus(session, project.dir, id, status);
      await refresh();
    },
    [project, session, refresh],
  );
  return { renameSceneTitle, setStatus };
}

// A chapter starts with a scene, so there is somewhere to write at once.
async function newNode(project: Project, kind: NodeKind, placement: Placement): Promise<TreeNode> {
  if (kind === "chapter") {
    const scene = await createScene(platform.fileSystem, project.dir, NEW_TITLES.scene);
    return {
      id: newSceneId(),
      kind,
      title: NEW_TITLES.chapter,
      children: [{ id: scene, kind: "scene" }],
    };
  }
  if (kind !== "scene") return { id: newSceneId(), kind, title: NEW_TITLES[kind], children: [] };
  const title = newSceneTitle(project.tree, placement);
  return { id: await createScene(platform.fileSystem, project.dir, title), kind };
}

export function useProjectActions(input: ProjectActionsInput) {
  const { project, session, updateTree, refresh, focusEditor } = input;
  const newItem = useCallback(
    async (kind: NodeKind, placement: Placement = null) => {
      if (!project || project.isReadOnly) return null;
      const node = await newNode(project, kind, placement);
      await updateTree(place(project.tree, node, placement, session.scene?.id ?? null));
      await refresh();
      if (kind === "scene") {
        await openScene(session, project.dir, node.id);
        focusEditor?.();
      }
      return node.id;
    },
    [project, session, updateTree, refresh, focusEditor],
  );
  return { newItem, ...useSceneFileActions({ project, session, refresh }) };
}

export function useTreeHandlers(
  actions: ReturnType<typeof useProjectActions> & {
    notes: { addFile: (sortId: string) => Promise<void> };
  },
  onRenamed?: (id: string, title: string) => void,
) {
  const [renameRequestId, setRenameRequestId] = useState<string | null>(null);
  return {
    renameRequestId,
    onRenameScene: (id: string, title: string) => {
      onRenamed?.(id, title);
      void actions.renameSceneTitle(id, title);
    },
    onSetSceneStatus: (id: string, status: SceneStatus) => void actions.setStatus(id, status),
    onAddFile: (sortId: string) => void actions.notes.addFile(sortId),
    onAdd: (kind: NodeKind, placement: Placement) =>
      void actions.newItem(kind, placement).then((id) => {
        if (id && kind !== "scene") setRenameRequestId(id);
      }),
  };
}
