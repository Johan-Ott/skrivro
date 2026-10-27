import type { Node } from "prosemirror-model";
import { flushAllSaves } from "./saveGuard.js";
import { takeSnapshot } from "../project/snapshots.js";
import { parseMarkdown } from "../manuscript/parseMarkdown.js";
import {
  joinSceneFile,
  newSceneText,
  sceneTitle,
  splitSceneFile,
  withField,
  withSceneStatus,
  withSceneTitle,
  type SceneStatus,
} from "../manuscript/sceneFile.js";
import { textOf } from "./sceneText.js";
import { writeAtomic } from "@llkit/storage/atomicWrite.js";
import { createAutosave, type SaveStatus } from "@llkit/storage/autosave.js";
import { joinPath, type FileSystem } from "@llkit/storage/fileSystem.js";
import { newSceneId, scenePath } from "../storage/sceneId.js";
import { writeSuggestion } from "../project/revisions.js";
import { decideExternalChange } from "../storage/syncFiles.js";
import { t } from "../i18n/i18n.js";

export interface OpenScene {
  dir: string;
  id: string;
  frontMatter: string;
  title: string;
}

export interface DiskConflict {
  editorText: string;
  diskText: string;
}

export type ConflictChoice = "mine" | "theirs" | "both";

export interface SceneSessionHooks {
  editor: { load(doc: Node): void; currentDoc(): Node | null };
  onScene(scene: OpenScene | null): void;
  onConflict(conflict: DiskConflict | null): void;
  onSaveStatus(status: SaveStatus): void;
  /** Before and after each save, for the words-per-day count. */
  onSaved?: (scene: { dir: string; id: string }, before: string, after: string) => void;
}

export interface SceneSession {
  fileSystem: FileSystem;
  hooks: SceneSessionHooks;
  autosave: ReturnType<typeof createAutosave>;
  scene: OpenScene | null;
  /** Förslagsläge: what is typed is saved beside the scene as changes to accept, not in it. */
  isSuggesting: boolean;
  /** While text moves between scenes, as a merge does: saved, but not counted as written. */
  isRearranging: boolean;
  /** Set by the app, which knows the tree: a note may hold template questions, a scene never. */
  isNote: (dir: string, id: string) => boolean;
}

export function createSceneSession(fileSystem: FileSystem, hooks: SceneSessionHooks) {
  const current: Pick<SceneSession, "scene" | "isSuggesting" | "isRearranging" | "isNote"> = {
    scene: null,
    isSuggesting: false,
    isRearranging: false,
    isNote: () => false,
  };
  const autosave = createAutosave({
    write: async (text) => {
      const scene = current.scene;
      if (!scene) return;
      if (current.isSuggesting)
        return writeSuggestion(fileSystem, scene.dir, scene.id, splitSceneFile(text).body);
      const before = autosave.lastSavedText();
      await writeAtomic(fileSystem, scenePath(scene.dir, scene.id), text);
      hooks.onSaved?.(scene, current.isRearranging ? text : before, text);
    },
    onStatus: hooks.onSaveStatus,
  });
  const session: SceneSession = Object.assign(current, { fileSystem, hooks, autosave });
  return session;
}

// Text typed with no scene open has nowhere to go, so the editor is read-only then.
export function sceneEdited(session: SceneSession, doc: Node) {
  if (session.scene) session.autosave.changed(textOf(session, doc));
}

/** When saving fails the scene stays open and false comes back. */
export async function closeScene(session: SceneSession) {
  if (!(await session.autosave.flush())) return false;
  session.scene = null;
  session.autosave.loaded("");
  session.hooks.editor.load(parseMarkdown(""));
  session.hooks.onScene(null);
  session.hooks.onConflict(null);
  return true;
}

export function showScene(session: SceneSession, dir: string, id: string, text: string) {
  const { frontMatter, body } = splitSceneFile(text);
  session.scene = { dir, id, frontMatter, title: sceneTitle(frontMatter) ?? t("Namnlös scen") };
  session.hooks.onScene(session.scene);
  session.autosave.loaded(text);
  session.hooks.editor.load(parseMarkdown(body, { isNote: session.isNote(dir, id) }));
}

// Leaving a scene whose text is not on disk would lose it, so the switch waits for the save,
// and saves again after the read for what was typed meanwhile.
export async function openScene(session: SceneSession, dir: string, id: string) {
  // A lapp written in its box may be the one opened here, so what waits for the disk goes first.
  await flushAllSaves();
  if (!(await session.autosave.flush())) return false;
  const text = await session.fileSystem.readText(scenePath(dir, id));
  if (!(await session.autosave.flush())) return false;
  session.autosave.release();
  showScene(session, dir, id, text);
  session.hooks.onConflict(null);
  return true;
}

// Dropped when another scene opened meanwhile; keeping "mine" would write the wrong text.
// While suggesting, the file on disk is meant to differ from the editor, so it is not watched.
const watchedScene = (session: SceneSession) => (session.isSuggesting ? null : session.scene);

export async function checkDisk(session: SceneSession) {
  const scene = watchedScene(session);
  if (!scene) return;
  const diskText = await session.fileSystem
    .readText(scenePath(scene.dir, scene.id))
    .catch(() => null);
  const doc = session.hooks.editor.currentDoc();
  if (diskText === null || !doc || session.scene !== scene) return;
  // Skrivro's own save, seen before it was done: on a slow phone the watcher can be quicker.
  if (session.autosave.isOwnText(diskText)) return;
  const editorText = textOf(session, doc);
  const lastSavedText = session.autosave.lastSavedText();
  const decision = decideExternalChange({ diskText, editorText, lastSavedText });
  if (decision === "reload") showScene(session, scene.dir, scene.id, diskText);
  if (decision !== "conflict") return;
  session.autosave.hold();
  session.hooks.onConflict({ diskText, editorText });
}

/** A sync writing over the open scene: its text is saved first, and the editor reads it after. */
export async function writeOverScene(
  session: SceneSession,
  path: string,
  write: () => Promise<void>,
) {
  const scene = session.scene;
  if (!scene || path !== scenePath(scene.dir, scene.id)) return write();
  await session.autosave.flush();
  session.autosave.pause(true);
  try {
    await write();
    await checkDisk(session);
  } finally {
    // What was typed meanwhile is saved as usual.
    session.autosave.pause(false);
    const doc = session.hooks.editor.currentDoc();
    if (doc) sceneEdited(session, doc);
  }
}

export async function createScene(fileSystem: FileSystem, dir: string, title: string, body = "") {
  const id = newSceneId();
  await fileSystem.makeDir(joinPath(dir, "scenes"));
  await writeAtomic(fileSystem, scenePath(dir, id), newSceneText(id, title) + body);
  return id;
}

// The text last kept as a version, so hiding, pagehide and onPause in a row make one.
const keptText = new WeakMap<SceneSession, string>();

/** Saves what waits. A conflict or a sync can hold the save, and then the text is kept as a version
 * instead, so leaving the app never loses it. */
export async function flushOrKeep(session: SceneSession) {
  if (await session.autosave.flush()) return true;
  const { scene } = session;
  const doc = session.hooks.editor.currentDoc();
  if (!scene || !doc) return false;
  const text = textOf(session, doc);
  if (text === session.autosave.lastSavedText() || text === keptText.get(session)) return true;
  const when = { time: Date.now(), label: t("Text som inte hann sparas") };
  return takeSnapshot(session.fileSystem, scene, text, when).then(
    () => (keptText.set(session, text), true),
    () => false,
  );
}

// The open scene's front matter changes through its autosave, so unsaved text is saved with it.
export async function changeFrontMatter(
  session: SceneSession,
  where: { dir: string; id: string },
  change: (frontMatter: string) => string,
) {
  const scene = session.scene;
  if (scene?.dir === where.dir && scene.id === where.id) {
    const frontMatter = change(scene.frontMatter);
    session.scene = { ...scene, frontMatter, title: sceneTitle(frontMatter) ?? scene.title };
    session.hooks.onScene(session.scene);
    const doc = session.hooks.editor.currentDoc();
    if (doc) sceneEdited(session, doc);
    await session.autosave.flush();
    return;
  }
  const path = scenePath(where.dir, where.id);
  const { frontMatter, body } = splitSceneFile(await session.fileSystem.readText(path));
  const text = joinSceneFile({ frontMatter: change(frontMatter), body });
  await writeAtomic(session.fileSystem, path, text);
}

export const renameScene = (session: SceneSession, dir: string, id: string, title: string) =>
  changeFrontMatter(session, { dir, id }, (frontMatter) => withSceneTitle(frontMatter, title));

export const setSceneStatus = (
  session: SceneSession,
  dir: string,
  id: string,
  status: SceneStatus,
) => changeFrontMatter(session, { dir, id }, (frontMatter) => withSceneStatus(frontMatter, status));

export const setNoteLink = (session: SceneSession, dir: string, id: string, isLinked: boolean) =>
  changeFrontMatter(session, { dir, id }, (frontMatter) =>
    withField(frontMatter, "link", String(isLinked)),
  );
