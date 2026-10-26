import { isLinkedByDefault } from "../../project/cards.js";
import { findNode, manuscriptNodes, moveNode, sortsOf, type TreeNode } from "../../project/tree.js";
import { nodeLabel } from "../../project/treeLabels.js";
import { statusSteps } from "../../project/statusSteps.js";
import { labelMenu } from "../labels/LabelsInTree.js";
import type { Project } from "../useProject.js";
import type { TreeMenuActions } from "./treeMenus.js";
import type { Actions, TreeViewProps, View } from "./useTreeView.js";

/** What each row's menu does, from the tree's own actions and the app's handlers. */
export function menuActions(actions: Actions, props: TreeViewProps, view: View): TreeMenuActions {
  const { summaries } = props.project;
  return {
    open: (node) => actions.activate(node),
    add: props.onAdd,
    rename: (node) => actions.startRename(node),
    trash: (node) => actions.trash(node),
    restore: (node) => actions.restore(node),
    setStatus: (node, status) => props.onSetSceneStatus(node.id, status),
    statusOf: (node) => summaries[node.id]?.status ?? null,
    statusName: (status) => statusSteps(props.project.fields)[status].name,
    showSnapshots: (node) => props.onShowSnapshots(node.id),
    openBeside: (node) => props.onOpenBeside(node.id),
    linkOf: (node) => noteLinkOf(props.project, node.id),
    setLink: (node, isLinked) => props.onSetNoteLink(node.id, isLinked),
    newNote: props.onNewNote,
    addFile: props.onAddFile,
    moveToSeries: props.onMoveToSeries ? (node) => props.onMoveToSeries?.(node.id) : null,
    canMerge: (node) =>
      props.canMergeOpenScene === true &&
      node.id === props.openSceneId &&
      noteLinkOf(props.project, node.id) === null,
    mergeWithNext: () => props.onMergeWithNext?.(),
    labelItems: labelMenu(props, view),
    showDrafts: props.onShowDrafts ? (node) => props.onShowDrafts?.(node.id) : null,
    editLabels: props.onUpdateProject ? (node) => view.setLabelsFor(node.id) : null,
    focus: (node) => view.setFocusId(node.id),
    ...sortActions(props),
  };
}

// A note moves between sorts from its menu, as dragging does on the computer, or is kept as a
// template.
function sortActions({ project, onChangeTree, onSaveAsTemplate }: TreeViewProps) {
  return {
    saveAsTemplate: onSaveAsTemplate ? (node: TreeNode) => onSaveAsTemplate(node.id) : null,
    otherSorts: (node: TreeNode) => {
      const parentId = findNode(project.tree, node.id)?.parent?.id;
      return sortsOf(project.tree)
        .filter((sort) => sort.id !== parentId)
        .map((sort) => ({ id: sort.id, name: nodeLabel(sort, project.tree, project.summaries) }));
    },
    moveInto: (node: TreeNode, parentId: string) =>
      onChangeTree(moveNode(project.tree, node.id, parentId, Number.MAX_SAFE_INTEGER)),
    wasNote: (node: TreeNode) => sortsOf(project.tree).some((sort) => sort.id === node.trashedFrom),
    makeScene: project.dir.endsWith(".serie")
      ? null
      : (node: TreeNode, chapterId: string | null) =>
          onChangeTree(moveNode(project.tree, node.id, chapterId, Number.MAX_SAFE_INTEGER)),
    chapters: () =>
      manuscriptNodes(project.tree, "chapter").map((chapter) => ({
        id: chapter.id,
        name: nodeLabel(chapter, project.tree, project.summaries),
      })),
  };
}

// Null for anything that is not a note.
export function noteLinkOf(project: Project, id: string) {
  const parent = findNode(project.tree, id)?.parent;
  if (parent?.kind !== "sort") return null;
  return project.summaries[id]?.link ?? isLinkedByDefault(parent.id);
}
