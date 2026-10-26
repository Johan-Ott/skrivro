import { platform } from "../platform.js";
import { TRASH_ID, type NodeKind, type TreeNode } from "../../project/tree.js";
import { SCENE_STATUSES, type SceneStatus } from "../../manuscript/sceneFile.js";
import type { MenuItem } from "@llkit/Menu.js";
import { noteItems } from "./noteMenus.js";
import { shortcutOf } from "../shortcuts.js";
import { t } from "../../i18n/i18n.js";

/** Null leaves the place to the app. */
export type Placement = { inside: string } | { after: string } | null;

export interface TreeMenuActions {
  open: (node: TreeNode) => void;
  add: (kind: NodeKind, placement: Placement) => void;
  rename: (node: TreeNode) => void;
  trash: (node: TreeNode) => void;
  restore: (node: TreeNode) => void;
  setStatus: (node: TreeNode, status: SceneStatus) => void;
  statusOf: (node: TreeNode) => SceneStatus | null;
  /** The step's name in this book. */
  statusName: (status: SceneStatus) => string;
  showSnapshots: (node: TreeNode) => void;
  /** Shows the text beside the one being written. */
  openBeside: (node: TreeNode) => void;
  /** Null when the node is not a note. */
  linkOf: (node: TreeNode) => boolean | null;
  setLink: (node: TreeNode, isLinked: boolean) => void;
  newNote: (sortId: string) => void;
  addFile: (sortId: string) => void;
  /** Null when the book is in no series. */
  moveToSeries: ((node: TreeNode) => void) | null;
  canMerge: (node: TreeNode) => boolean;
  mergeWithNext: () => void;
  /** A chapter's drafts; null where there are none to keep. */
  showDrafts: ((node: TreeNode) => void) | null;
  /** Opens the dialog of the book's steps and labels; null where they cannot be changed. */
  editLabels: ((node: TreeNode) => void) | null;
  /** The book's labels to tick on the node; null where they cannot be changed. */
  labelItems: ((node: TreeNode) => MenuItem[]) | null;
  /** Shows only this chapter's scenes in the sidebar. */
  focus: (node: TreeNode) => void;
  /** The sorts a note can be moved to, with their names, and the move. */
  otherSorts: (node: TreeNode) => { id: string; name: string }[];
  moveInto: (node: TreeNode, parentId: string) => void;
  /** Keeps the note as a template for new notes; null where notes are not the book's own. */
  saveAsTemplate: ((node: TreeNode) => void) | null;
  /** Makes the note a scene, last in the chapter or last in the book; null in a series. */
  makeScene: ((node: TreeNode, chapterId: string | null) => void) | null;
  chapters: () => { id: string; name: string }[];
  /** Whether a thing in Papperskorg was a note, which goes back to its sort. */
  wasNote: (node: TreeNode) => boolean;
}

export function foldMenu(view: { foldAll: () => void; unfoldAll: () => void }): MenuItem[] {
  return [
    { label: t("Fäll ihop alla"), onSelect: view.foldAll, separatorBefore: true },
    { label: t("Fäll ut alla"), onSelect: view.unfoldAll },
  ];
}

export function addMenu(actions: Pick<TreeMenuActions, "add">): MenuItem[] {
  return [
    {
      label: t("Ny scen"),
      shortcut: shortcutOf("newScene"),
      onSelect: () => actions.add("scene", null),
    },
    { label: t("Nytt kapitel"), onSelect: () => actions.add("chapter", null) },
    { label: t("Ny del"), onSelect: () => actions.add("part", null) },
    { label: t("Ny mapp"), onSelect: () => actions.add("folder", null) },
  ];
}

function newItemsFor(node: TreeNode, actions: TreeMenuActions): MenuItem[] {
  // A note is a scene on disk, but a new scene or chapter after it makes no sense.
  if (actions.linkOf(node) !== null) return [];
  const inside = { inside: node.id };
  const after = { after: node.id };
  const item = (label: string, kind: NodeKind, placement: Placement): MenuItem => ({
    label,
    onSelect: () => actions.add(kind, placement),
  });
  const byKind: Record<NodeKind, MenuItem[]> = {
    scene: [
      item(t("Ny scen efter"), "scene", after),
      item(t("Nytt kapitel efter"), "chapter", after),
    ],
    chapter: [
      item(t("Ny scen i kapitlet"), "scene", inside),
      item(t("Nytt kapitel efter"), "chapter", after),
    ],
    part: [
      item(t("Ny scen i delen"), "scene", inside),
      item(t("Nytt kapitel i delen"), "chapter", inside),
    ],
    folder: [
      item(t("Ny scen i mappen"), "scene", inside),
      item(t("Ny mapp i mappen"), "folder", inside),
    ],
    sort: sortItems(node, actions),
  };
  return byKind[node.kind];
}

const sortItems = (node: TreeNode, actions: TreeMenuActions): MenuItem[] => [
  { label: t("Ny anteckning"), onSelect: () => actions.newNote(node.id) },
  { label: t("Lägg till fil…"), onSelect: () => actions.addFile(node.id) },
];

// The status is written to the scene file and drives the progress on the shelf.
function statusItems(node: TreeNode, actions: TreeMenuActions): MenuItem[] {
  if (node.kind !== "scene") return [];
  const forNote = noteItems(node, actions);
  if (forNote) return forNote;
  const current = actions.statusOf(node);
  const steps = SCENE_STATUSES.map((status) => ({
    label: actions.statusName(status),
    isChecked: status === current,
    onSelect: () => actions.setStatus(node, status),
  }));
  const { editLabels } = actions;
  const edit = editLabels
    ? [{ label: t("Ändra stegen…"), separatorBefore: true, onSelect: () => editLabels(node) }]
    : [];
  return [{ label: t("Status"), separatorBefore: true, submenu: [...steps, ...edit] }];
}

// Up and down among its siblings, where dragging is no way to move it, as on a phone.
function moveItems(move: ((step: 1 | -1) => void) | undefined): MenuItem[] {
  if (!move) return [];
  return [
    { label: t("Flytta upp"), shortcut: "Alt+↑", separatorBefore: true, onSelect: () => move(-1) },
    { label: t("Flytta ned"), shortcut: "Alt+↓", onSelect: () => move(1) },
  ];
}

// A chapter can be kept as it is now under a name, and put back later.
function draftItems(node: TreeNode, { showDrafts, focus }: TreeMenuActions): MenuItem[] {
  if (node.kind !== "chapter") return [];
  const focusItem = {
    label: t("Visa bara kapitlet"),
    separatorBefore: true,
    onSelect: () => focus(node),
  };
  if (!showDrafts) return [focusItem];
  return [focusItem, { label: t("Utkast…"), onSelect: () => showDrafts(node) }];
}

function editItems(node: TreeNode, actions: TreeMenuActions): MenuItem[] {
  const { labelItems } = actions;
  return [
    ...(labelItems
      ? [{ label: t("Etiketter"), separatorBefore: true, submenu: labelItems(node) }]
      : []),
    {
      label: t("Byt namn"),
      shortcut: "F2",
      separatorBefore: !labelItems,
      onSelect: () => actions.rename(node),
    },
    {
      label: t("Flytta till papperskorg"),
      shortcut: "Delete",
      onSelect: () => actions.trash(node),
    },
  ];
}

function sceneItems(node: TreeNode, actions: TreeMenuActions): MenuItem[] {
  if (node.kind !== "scene") return [];
  return [
    { label: t("Öppna"), onSelect: () => actions.open(node) },
    // A phone has room for one text at a time.
    ...(platform.isPhone
      ? []
      : [{ label: t("Öppna bredvid"), onSelect: () => actions.openBeside(node) }]),
    { label: t("Versioner…"), onSelect: () => actions.showSnapshots(node) },
    ...(actions.canMerge(node)
      ? [{ label: t("Slå ihop med nästa scen"), onSelect: actions.mergeWithNext }]
      : []),
  ];
}

export function rowMenu(
  node: TreeNode,
  isInTrash: boolean,
  actions: TreeMenuActions,
  move?: (step: 1 | -1) => void,
): MenuItem[] {
  if (node.id === TRASH_ID) return [];
  if (isInTrash) {
    const label = actions.wasNote(node) ? t("Lägg tillbaka") : t("Lägg tillbaka i manuset");
    return [{ label, onSelect: () => actions.restore(node) }];
  }
  const added = newItemsFor(node, actions);
  const open = sceneItems(node, actions);
  const [firstAdded, ...restAdded] = added;
  const separatedAdd =
    firstAdded && open.length > 0
      ? [{ ...firstAdded, separatorBefore: true }, ...restAdded]
      : added;
  const status = [...statusItems(node, actions), ...draftItems(node, actions)];
  return [...open, ...separatedAdd, ...status, ...moveItems(move), ...editItems(node, actions)];
}
