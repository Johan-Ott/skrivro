import { useEffect, useRef, useState, type MouseEvent } from "react";
import {
  findNode,
  moveNode,
  sortsOf,
  TRASH_ID,
  type NodeKind,
  type TreeNode,
} from "../../project/tree.js";
import { chapterIds, foldableIds, sidebarSections, visibleRows } from "../../project/treeRows.js";
import type { TreeRow as Row } from "../../project/treeRows.js";
import type { SceneStatus } from "../../manuscript/sceneFile.js";
import { nodeLabel, nodeMeta } from "../../project/treeLabels.js";
import type { MenuItem } from "@llkit/Menu.js";
import type { Project } from "../useProject.js";
import type { Placement } from "./treeMenus.js";
import { useTreeActions } from "./useTreeActions.js";
import { useTreeDrag } from "./useTreeDrag.js";
import { noteLinkOf } from "./treeMenuActions.js";
import { useFollowOpenScene, useRenameRequest } from "./treeEffects.js";
import type { ProjectChange } from "../labels/LabelsDialog.js";
import { filteredTree, labelsOn } from "../../project/labels.js";
import { statusSteps } from "../../project/statusSteps.js";
import { t } from "../../i18n/i18n.js";

export interface TreeViewProps {
  project: Project;
  /** Starts an empty lapp: in the menu of the sort Lappar, and on a phone as the quick catch. */
  onNewLapp?: (() => void) | undefined;
  openSceneId: string | null;
  /** The tree unfolds to the open scene; true when left out. */
  isFollowingOpenScene?: boolean;
  /** Set when the sidebar is a table of contents: where each node starts in the printed book. */
  pageOf?: ((id: string) => number | null) | undefined;
  /** A node just created; the tree shows it and starts renaming it. */
  renameRequestId: string | null;
  onOpenScene: (id: string) => void;
  onChangeTree: (tree: TreeNode[]) => void;
  onRenameScene: (id: string, title: string) => void;
  onSetSceneStatus: (id: string, status: SceneStatus) => void;
  onSetNoteLink: (id: string, isLinked: boolean) => void;
  onShowSnapshots: (id: string) => void;
  onOpenBeside: (id: string) => void;
  onAdd: (kind: NodeKind, placement: Placement) => void;
  onNewNote: (sortId: string | null) => void;
  onAddFile: (sortId: string) => void;
  onMoveToSeries?: (id: string) => void;
  canMergeOpenScene?: boolean;
  onMergeWithNext?: () => void;
  onShowDrafts?: (chapterId: string) => void;
  /** Spara som mall in a note's menu. */
  onSaveAsTemplate?: (noteId: string) => void;
  /** The tree and project.json's fields changed together, as labels do. */
  onUpdateProject?: (change: ProjectChange) => void;
}

export type Actions = ReturnType<typeof useTreeActions>;
type MenuState = { items: MenuItem[]; x: number; y: number } | null;
export type View = ReturnType<typeof useTreeViewState>;

// The sorts, the chapters and Papperskorg start folded, so the book reads as its chapters; the
// open text's chapter unfolds by itself.
function useCollapsed(tree: TreeNode[]) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(
    () => new Set([...sortsOf(tree).map((sort) => sort.id), ...chapterIds(tree), TRASH_ID]),
  );
  const toggle = (id: string) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const [expand] = useState(
    () => (ids: string[]) =>
      setCollapsed((current) => new Set([...current].filter((id) => !ids.includes(id)))),
  );
  const foldAll = () => setCollapsed(new Set([...foldableIds(tree), TRASH_ID]));
  const unfoldAll = () => setCollapsed(new Set([TRASH_ID]));
  return { collapsed, toggle, expand, foldAll, unfoldAll };
}

function useTreeViewState(tree: TreeNode[]) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuState>(null);
  const [labelsFor, setLabelsFor] = useState<string | null>(null);
  const [filter, setFilter] = useState<string[]>([]);
  const [focusId, setFocusId] = useState<string | null>(null);
  const editing = { renamingId, setRenamingId, menu, setMenu, labelsFor, setLabelsFor };
  return { ...useCollapsed(tree), ...editing, filter, setFilter, focusId, setFocusId };
}

// A filter shows every match unfolded; chapter focus shows only the chapter's scenes under Boken.
function sectionsOf(tree: TreeNode[], view: View) {
  const rows =
    view.filter.length > 0
      ? visibleRows(filteredTree(tree, view.filter), new Set())
      : visibleRows(tree, view.collapsed);
  const focused = view.focusId ? (findNode(tree, view.focusId)?.node ?? null) : null;
  const all = sidebarSections(rows);
  const book = focused
    ? visibleRows(focused.children ?? [], view.collapsed, 0, focused.id)
    : all.book;
  return { sections: { ...all, book }, focused };
}

const nodeCount = (nodes: TreeNode[]): number =>
  nodes.reduce((sum, node) => sum + 1 + nodeCount(node.children ?? []), 0);

// Something added under a filter would not show, so the filter goes and the whole tree shows it.
function useUnfilteredOnAdd(tree: TreeNode[], view: View) {
  const count = nodeCount(tree);
  const seen = useRef(count);
  const { filter, setFilter } = view;
  useEffect(() => {
    if (count > seen.current && filter.length > 0) setFilter([]);
    seen.current = count;
  }, [count, filter, setFilter]);
}

export function useTreeView(props: TreeViewProps) {
  const { project } = props;
  const view = useTreeViewState(project.tree);
  useUnfilteredOnAdd(project.tree, view);
  useRenameRequest(props, view);
  useFollowOpenScene(props, view);
  const actions = useTreeActions({
    ...props,
    tree: project.tree,
    ...view,
    startRename: view.setRenamingId,
  });
  const drag = useTreeDrag(project.tree, { onChangeTree: props.onChangeTree, expand: view.expand });
  const dropAtBookEnd = () => {
    if (drag.draggedId)
      props.onChangeTree(moveNode(project.tree, drag.draggedId, null, Number.MAX_SAFE_INTEGER));
  };
  const openMenu = (event: MouseEvent, items: MenuItem[]) => {
    event.preventDefault();
    event.stopPropagation();
    if (items.length > 0) view.setMenu({ items, x: event.clientX, y: event.clientY });
  };
  const isFiltered = view.filter.length > 0;
  const { sections, focused } = sectionsOf(project.tree, view);
  return { view, actions, drag, sections, dropAtBookEnd, openMenu, isFiltered, focused };
}

export type Tree = ReturnType<typeof useTreeView>;

// An empty sort has nothing to unfold, so a click starts its first note.
export const isEmptySort = (node: TreeNode) => node.kind === "sort" && !node.children?.length;

export function rowHandlers(row: Row, actions: Actions, view: View) {
  return {
    onActivate: () => actions.activate(row.node),
    onToggle: () => view.toggle(row.node.id),
    onKeyDown: (event: Parameters<Actions["onKeyDown"]>[1]) => actions.onKeyDown(row, event),
    onStartRename: () => actions.startRename(row.node),
    onRename: (title: string | null) => {
      view.setRenamingId(null);
      if (title) actions.rename(row.node, title);
    },
  };
}

// Labels and word counts change with the book, not with each key typed, so they are kept per
// version of the project; a long book has hundreds of rows to name.
const labelCache = new WeakMap<Project, Map<string, { label: string; meta: string }>>();

function labelsOf(project: Project, node: TreeNode) {
  const labels = labelCache.get(project) ?? new Map<string, { label: string; meta: string }>();
  labelCache.set(project, labels);
  const known = labels.get(node.id);
  if (known) return known;
  const made = {
    label: nodeLabel(node, project.tree, project.summaries),
    meta: nodeMeta(node, project.summaries),
  };
  labels.set(node.id, made);
  return made;
}

// Only a scene of the book has a status; a note has none.
function sceneStatusOf(project: Project, node: TreeNode) {
  const status = noteLinkOf(project, node.id) === null ? project.summaries[node.id]?.status : null;
  return status ? { id: status, ...statusSteps(project.fields)[status] } : null;
}

// Undefined unless the sidebar is a table of contents.
const pageIn = ({ pageOf }: TreeViewProps, id: string) => (pageOf ? pageOf(id) : undefined);

export function rowView(row: Row, props: TreeViewProps, collapsed: ReadonlySet<string>) {
  const { node } = row;
  const summary = props.project.summaries[node.id];
  const isInCloud = props.project.notDownloaded.some((file) => file.sceneId === node.id);
  const { label, meta } = labelsOf(props.project, node);
  return {
    row,
    label: isInCloud ? t("Hämtar från molnet…") : label,
    title: node.kind === "scene" ? (summary?.title ?? "") : (node.title ?? ""),
    meta,
    dots: labelsOn(props.project.fields, node),
    status: sceneStatusOf(props.project, node),
    isActive: node.id === props.openSceneId,
    isExpanded: node.kind === "scene" ? null : !collapsed.has(node.id),
    isMissing: node.kind === "scene" && !summary,
    page: pageIn(props, node.id),
  };
}
