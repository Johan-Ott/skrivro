import { t } from "../i18n/i18n.js";
import {
  SCENE_STATUSES,
  splitSceneFile,
  withSceneStatus,
  withSceneTitle,
  type SceneStatus,
} from "../manuscript/sceneFile.js";
import { newSceneId, scenePath } from "../storage/sceneId.js";
import { changeScene, changeTree, newScene, readBook, type BookFolder } from "./bookFolder.js";
import { runBatch } from "./batch.js";
import { commentCalls } from "./bookFileComments.js";
import { seriesCalls, settingCalls } from "./bookFileSettings.js";
import { withNodeText } from "./contents.js";
import { takeSnapshot } from "./snapshots.js";
import {
  findNode,
  insertAfter,
  insertNode,
  moveToTrash,
  removeNode,
  sortsOf,
  type NodeKind,
  type TreeNode,
} from "./tree.js";
import { renameNode } from "./nodeFields.js";
import { nodeLabel } from "./treeLabels.js";

export type { BookFolder } from "./bookFolder.js";

// A book changed straight in its folder, without Skrivro running, with the app's own tree
// functions; a running Skrivro sees the files change. docs/format.md describes the files.

// A chapter starts with a scene, as in the app, so there is somewhere to write at once.
async function newNode(book: BookFolder, kind: NodeKind, title: string): Promise<TreeNode> {
  if (kind === "scene") return { id: await newScene(book, title), kind };
  const children: TreeNode[] =
    kind === "chapter" ? [{ id: await newScene(book, "Scen 1"), kind: "scene" }] : [];
  return { id: newSceneId(), kind, title, children };
}

/** The tree as rows, as `skrivro.mjs tree` prints it with the app running. */
export async function treeRows(book: BookFolder) {
  const { tree, summaries } = await readBook(book);
  const walk = (nodes: TreeNode[], depth: number): object[] =>
    nodes.flatMap((node) => [
      { id: node.id, kind: node.kind, title: nodeLabel(node, tree, summaries), depth },
      ...walk(node.children ?? [], depth + 1),
    ]);
  return walk(tree, 0);
}

const FIELDS: Record<string, "summary" | "when" | "pov"> = {
  vad: "summary",
  när: "when",
  pov: "pov",
};

// New parts of the book: a scene, chapter, part or folder, and a note in a sort.
const makeCalls = (book: BookFolder) => ({
  add: async (kind: NodeKind, title: string, afterId?: string) => {
    const node = await newNode(book, kind, title);
    await changeTree(book, (tree) => insertAfter(tree, node, afterId ?? null));
    return node.id;
  },
  /** A note in a sort by its id or its name, as the tree shows it; a new sort if none is. */
  note: async (sort: string, name: string) => {
    const { tree, summaries } = await readBook(book);
    const found = sortsOf(tree).find(
      (node) =>
        node.id === sort || nodeLabel(node, tree, summaries).toLowerCase() === sort.toLowerCase(),
    );
    const sortNode: TreeNode = found ?? {
      id: newSceneId(),
      kind: "sort",
      title: sort,
      children: [],
    };
    const id = await newScene(book, name);
    const note: TreeNode = { id, kind: "scene" };
    await changeTree(book, (now) => {
      const withSort = found ? now : insertNode(now, sortNode, null, 0);
      return insertNode(withSort, note, sortNode.id, Number.MAX_SAFE_INTEGER);
    });
    return id;
  },
});

// A scene's own file: its text, its title and its step.
const sceneCalls = (book: BookFolder) => ({
  read: (id: string) => book.fileSystem.readText(scenePath(book.dir, id)),
  /** The scene's text replaced, the text before kept as a version; title and status are kept. */
  write: async (id: string, body: string) => {
    const before = await book.fileSystem.readText(scenePath(book.dir, id));
    if (splitSceneFile(before).body !== body) {
      const when = { time: Date.now(), label: t("Före ändring utifrån") };
      await takeSnapshot(book.fileSystem, { dir: book.dir, id }, before, when);
    }
    return changeScene(book, id, (parts) => ({ ...parts, body }));
  },
  status: (id: string, status: string) => {
    if (!(SCENE_STATUSES as readonly string[]).includes(status))
      throw new Error(`Status är en av ${SCENE_STATUSES.join(", ")}.`);
    return changeScene(book, id, (parts) => ({
      ...parts,
      frontMatter: withSceneStatus(parts.frontMatter, status as SceneStatus),
    }));
  },
});

// The tree: names, Vad händer?, När and Vems ögon, the order, and the trash.
const treeCalls = (book: BookFolder) => ({
  rename: async (id: string, title: string) => {
    if (findNode((await readBook(book)).tree, id)?.node.kind !== "scene")
      return changeTree(book, (tree) => renameNode(tree, id, title));
    return changeScene(book, id, (parts) => ({
      ...parts,
      frontMatter: withSceneTitle(parts.frontMatter, title),
    }));
  },
  set: (id: string, field: string, text: string) => {
    const key = FIELDS[field.toLowerCase()];
    if (!key) throw new Error(`Fältet heter vad, när eller pov, inte ${field}.`);
    return changeTree(book, (tree) => withNodeText(tree, id, key, text));
  },
  move: (id: string, afterId: string) =>
    changeTree(book, (tree) => {
      const node = findNode(tree, id)?.node;
      return node ? insertAfter(removeNode(tree, id), node, afterId) : tree;
    }),
  trash: (id: string) => changeTree(book, (tree) => moveToTrash(tree, id)),
});

/** The calls of `skrivro.mjs`, on the files: the same names and arguments as through the app. */
export function bookFileCalls(book: BookFolder) {
  const calls = {
    tree: () => treeRows(book),
    ...makeCalls(book),
    ...sceneCalls(book),
    ...treeCalls(book),
    ...settingCalls(book),
    ...seriesCalls(book),
    ...commentCalls(book),
  };
  return { ...calls, batch: (steps: unknown) => runBatch(calls, steps) };
}
