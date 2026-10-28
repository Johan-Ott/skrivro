import { isLinkedByDefault } from "../project/cards.js";
import { withNodeText } from "../project/contents.js";
import {
  findNode,
  insertAfter,
  moveToTrash,
  removeNode,
  sortsOf,
  type NodeKind,
  type TreeNode,
} from "../project/tree.js";
import { renameNode } from "../project/nodeFields.js";
import { nodeLabel } from "../project/treeLabels.js";
import { SCENE_STATUSES, type SceneStatus } from "../manuscript/sceneFile.js";
import { scenePath } from "../storage/sceneId.js";
import { bookFileCalls } from "../project/bookFiles.js";
import { writeOverScene } from "./sceneSession.js";
import { platform } from "./platform.js";
import type { AppState } from "./App.js";

// window.skrivro's calls that change the book: the same actions the tree, the menus and Innehåll
// use, so a script changes the book exactly as a hand would.

type Field = "summary" | "when" | "pov";
const FIELDS: Record<string, Field> = { vad: "summary", när: "when", pov: "pov" };

export function bookOf(app: AppState) {
  const project = app.project;
  if (!project || project.isReadOnly) throw new Error("Ingen bok att ändra är öppen.");
  return project;
}

// A sort by its id or its name, as the tree shows it: "Personer", "Platser" or one's own.
function sortId(app: AppState, sort: string) {
  const project = bookOf(app);
  const found = sortsOf(project.tree).find(
    (node) =>
      node.id === sort ||
      nodeLabel(node, project.tree, project.summaries).toLowerCase() === sort.toLowerCase(),
  );
  return found?.id ?? null;
}

// A change shows in the app's state a render later; the next call waits for it, at most a second.
export async function until(isDone: () => boolean) {
  for (let tries = 0; tries < 20 && !isDone(); tries++) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

async function changeTree(current: () => AppState, next: TreeNode[]) {
  const before = bookOf(current()).tree;
  await current().updateTree(next);
  await until(() => bookOf(current()).tree !== before);
}

const inTree = (current: () => AppState, id: string) =>
  until(() => findNode(bookOf(current()).tree, id) !== null);

// Making new parts of the book.
function makeCalls(current: () => AppState) {
  return {
    /** A part, chapter, scene or folder, after the node given or where the app puts it. */
    add: async (kind: NodeKind, title?: string, afterId?: string) => {
      const id = await current().actions.newItem(kind, afterId ? { after: afterId } : null);
      if (id && title) await inTree(current, id).then(() => changeCalls(current).rename(id, title));
      return id;
    },
    /** A note in a sort by its name; a sort that does not exist yet is made with it. */
    note: (sort: string, name: string) => {
      const id = sortId(current(), sort);
      const isLinked = id ? isLinkedByDefault(id) : true;
      return current().actions.notes.newNote({
        name,
        sortId: id,
        newSortTitle: id ? null : sort,
        isLinked,
        body: null,
      });
    },
  };
}

// Changing what is already there.
function changeCalls(current: () => AppState) {
  const tree = () => bookOf(current()).tree;
  const change = (next: TreeNode[]) => changeTree(current, next);
  return {
    rename: (id: string, title: string) => {
      const node = findNode(tree(), id)?.node;
      if (node?.kind === "scene") return current().actions.renameSceneTitle(id, title);
      return change(renameNode(tree(), id, title));
    },
    /** Vad händer?, När or Vems ögon, as Innehåll sets them: set(id, "när", "Januari"). */
    set: (id: string, field: string, text: string) => {
      const key = FIELDS[field.toLowerCase()];
      if (!key) throw new Error(`Fältet heter vad, när eller pov, inte ${field}.`);
      return change(withNodeText(tree(), id, key, text));
    },
    status: (id: string, status: string) => {
      if (!(SCENE_STATUSES as readonly string[]).includes(status))
        throw new Error(`Status är en av ${SCENE_STATUSES.join(", ")}.`);
      return current().actions.setStatus(id, status as SceneStatus);
    },
    /** Moved to just after another node, into the nearest place that may hold it. */
    move: (id: string, afterId: string) => {
      const node = findNode(tree(), id)?.node;
      return node ? change(insertAfter(removeNode(tree(), id), node, afterId)) : undefined;
    },
    trash: (id: string) => change(moveToTrash(tree(), id)),
  };
}

// A scene's own file, read and written as it lies on disk.
const fileCalls = (current: () => AppState) => ({
  /** A scene's or note's file as it lies on disk. */
  read: (id: string) => platform.fileSystem.readText(scenePath(bookOf(current()).dir, id)),
  /** The scene's text replaced, its front matter kept; an open scene is saved first and shows it. */
  write: async (id: string, body: string) => {
    const app = current();
    const { dir } = bookOf(app);
    const files = bookFileCalls({ fileSystem: platform.fileSystem, dir });
    await writeOverScene(app.session, scenePath(dir, id), () => files.write(id, body));
    await app.refresh();
  },
});

export const bookCalls = (current: () => AppState) => ({
  ...makeCalls(current),
  ...changeCalls(current),
  ...fileCalls(current),
});
