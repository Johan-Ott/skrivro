import { takeSnapshot } from "../project/snapshots.js";
import type { SceneSession } from "./sceneSession.js";
import { textOf } from "./sceneText.js";
import { t } from "../i18n/i18n.js";

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
