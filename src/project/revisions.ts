import { documentText } from "../editor/documentText.js";
import { parseMarkdown } from "../manuscript/parseMarkdown.js";
import { writeAtomic } from "@llkit/storage/atomicWrite.js";
import { joinPath, type FileSystem } from "@llkit/storage/fileSystem.js";
import { setAside } from "../storage/setAside.js";

/** An editor's version of a scene waits here, as plain text, until the writer has gone through it. */
export const REVISIONS_DIR = "redigering";

const revisionPath = (dir: string, sceneId: string) =>
  joinPath(joinPath(dir, REVISIONS_DIR), `${sceneId}.txt`);

/** Null when the scene has no editor's version waiting. */
export const readRevision = (fileSystem: FileSystem, dir: string, sceneId: string) =>
  fileSystem.readText(revisionPath(dir, sceneId)).catch(() => null);

// Each scene's version is written in the order asked, so a quick key never lands before the last.
const inTurn = new Map<string, Promise<void>>();

function inOrder(path: string, work: () => Promise<void>) {
  const next = (inTurn.get(path) ?? Promise.resolve()).then(work, work);
  inTurn.set(path, next);
  return next;
}

export function writeRevision(fileSystem: FileSystem, dir: string, sceneId: string, text: string) {
  const path = revisionPath(dir, sceneId);
  return inOrder(path, async () => {
    await fileSystem.makeDir(joinPath(dir, REVISIONS_DIR));
    await writeAtomic(fileSystem, path, text);
  });
}

/** Done with: moved to trash/ like everything Skrivro stops using, never deleted. */
export function finishRevision(fileSystem: FileSystem, dir: string, sceneId: string) {
  const path = revisionPath(dir, sceneId);
  return inOrder(path, async () => {
    await setAside(fileSystem, dir, path, `redigering-${sceneId}.txt`);
  });
}

/** Förslagsläge's text, kept as an editor's version so Granska shows it the same way. */
export const writeSuggestion = (
  fileSystem: FileSystem,
  dir: string,
  sceneId: string,
  body: string,
) => writeRevision(fileSystem, dir, sceneId, documentText(parseMarkdown(body)).text);
