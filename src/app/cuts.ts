import { Fragment, type Node } from "prosemirror-model";
import { writeAtomic } from "@llkit/storage/atomicWrite.js";
import type { FileSystem } from "@llkit/storage/fileSystem.js";
import { serializeMarkdown } from "../manuscript/serializeMarkdown.js";
import { splitSceneFile } from "../manuscript/sceneFile.js";
import { manuscriptSchema as schema } from "../manuscript/schema.js";
import { NOTES_ID } from "../project/sorts.js";
import { findNode, insertNode, manuscriptSceneIds, type TreeNode } from "../project/tree.js";
import { dayKey } from "../project/stats.js";
import { placeOf } from "../project/treeLabels.js";
import { scenePath } from "../storage/sceneId.js";
import type { AppState } from "./App.js";
import { platform } from "./platform.js";
import { createScene } from "./sceneSession.js";
import type { Project } from "./useProject.js";

const CUTS_TITLE = "Strukna";

/** What the note gets above the cut text: the date, where it came from, then the text itself. */
export const cutBlock = (date: string, place: string, markdown: string) =>
  `*${date} · ${place}*\n\n${markdown.trim()}\n\n`;

/** The selected words as Markdown, so italics and quotes survive the move. */
export function selectionMarkdown(doc: Node, from: number, to: number) {
  const { content } = doc.slice(from, to);
  const blocks = content.firstChild?.isInline
    ? Fragment.from(schema.node("paragraph", null, content))
    : content;
  return serializeMarkdown(schema.node("doc", null, blocks)).trim();
}

interface BookState {
  dir: string;
  tree: TreeNode[];
  summaries: Project["summaries"];
}

/** Writes the block first in the note Strukna, making the note the first time; the new tree is
 * returned only when the note was made. */
export async function addToCuts(fileSystem: FileSystem, book: BookState, block: string) {
  const { dir, tree, summaries } = book;
  const notes = findNode(tree, NOTES_ID)?.node.children ?? [];
  const existing = notes.find((note) => summaries[note.id]?.title === CUTS_TITLE);
  const id = existing?.id ?? (await createScene(fileSystem, dir, CUTS_TITLE));
  const path = scenePath(dir, id);
  const { frontMatter, body } = splitSceneFile(await fileSystem.readText(path));
  await writeAtomic(fileSystem, path, frontMatter + block + body);
  if (existing) return null;
  return insertNode(tree, { id, kind: "scene" }, NOTES_ID, Number.MAX_SAFE_INTEGER);
}

/** Moves the selected words of a manuscript scene to Strukna. The text leaves the scene only once
 * it is safe in the note, and Ctrl+Z brings it back. */
export async function moveToCuts(app: AppState, project: Project) {
  // Two moves at once would both read the note and the second write would erase the first's text.
  if (isMoving) return;
  isMoving = true;
  try {
    await moveSelection(app, project);
  } finally {
    isMoving = false;
  }
}

let isMoving = false;

async function moveSelection(app: AppState, project: Project) {
  const view = app.editor.viewRef.current;
  const sceneId = app.scene?.id;
  if (!view || !sceneId || project.isReadOnly) return;
  const { doc, selection } = view.state;
  if (selection.empty) return;
  const place = placeOf(project.tree, project.summaries, sceneId);
  const block = cutBlock(
    dayKey(Date.now()),
    place,
    selectionMarkdown(doc, selection.from, selection.to),
  );
  const newTree = await addToCuts(platform.fileSystem, project, block);
  if (newTree) await app.updateTree(newTree);
  await app.refresh();
  if (view.state.doc.eq(doc))
    view.dispatch(view.state.tr.delete(selection.from, selection.to).scrollIntoView());
}

export const canMoveToCuts = (app: AppState, project: Project) =>
  app.scene !== null && manuscriptSceneIds(project.tree).includes(app.scene.id);
