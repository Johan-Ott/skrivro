import { splitSceneFile } from "../manuscript/sceneFile.js";
import { takeSnapshot } from "../project/snapshots.js";
import { t } from "../i18n/i18n.js";
import {
  createScene,
  showScene,
  type ConflictChoice,
  type DiskConflict,
  type SceneSession,
} from "./sceneSession.js";

export async function resolveConflict(
  session: SceneSession,
  choice: ConflictChoice,
  conflict: DiskConflict,
): Promise<string | null> {
  const scene = session.scene;
  if (!scene) return null;
  let copyId: string | null = null;
  if (choice === "both") {
    const otherBody = splitSceneFile(conflict.diskText).body;
    copyId = await createScene(
      session.fileSystem,
      scene.dir,
      t("{title} (andra versionen)", { title: scene.title }),
      otherBody,
    );
  }
  // The editor's text is kept among the scene's versions, so nothing is lost.
  if (choice === "theirs")
    await takeSnapshot(session.fileSystem, scene, conflict.editorText, { time: Date.now() });
  session.autosave.release();
  session.hooks.onConflict(null);
  if (choice === "theirs") {
    await showScene(session, scene.dir, scene.id, conflict.diskText);
    return null;
  }
  session.autosave.loaded(conflict.diskText);
  session.autosave.changed(conflict.editorText);
  await session.autosave.flush();
  return copyId;
}
