import { takeSnapshot } from "../../project/snapshots.js";
import { moveToTrash, type TreeNode } from "../../project/tree.js";
import { withNodeFields, type NodeFields } from "../../project/nodeFields.js";
import { writeAtomic } from "@llkit/storage/atomicWrite.js";
import { joinPath, readIfThere } from "@llkit/storage/fileSystem.js";
import type { FileChange, NodeChange } from "../../sync/syncLog.js";
import { platform } from "../platform.js";
import { checkDisk, type SceneSession } from "../sceneSession.js";
import type { Project } from "../useProject.js";

// Taking back what the sync brought: the text, title or file is as it was here before. The
// next sync then sends that to Drive, so the other device gets it back too.

export interface TakeBackParts {
  project: Project;
  session: SceneSession;
  updateTree: (tree: TreeNode[]) => Promise<void>;
}

const sceneIdOf = (path: string) => /^scenes\/([^/]+)\.md$/.exec(path)?.[1] ?? null;

/** Whether there is an earlier version here to go back to. */
export function canTakeBack(change: FileChange | NodeChange) {
  if ("path" in change) {
    if (change.kind === "removed") return Boolean(change.trashPath);
    if (change.kind === "added") return sceneIdOf(change.path) !== null;
    return change.before !== null;
  }
  return change.kind === "changed" && change.field !== undefined;
}

// Text written here since the sync is kept as a version, so taking back never loses it.
async function keepWrittenSince(parts: TakeBackParts, change: FileChange, sceneId: string | null) {
  if (!(await parts.session.autosave.flush())) return false;
  const now = await readIfThere(platform.fileSystem, joinPath(parts.project.dir, change.path));
  if (sceneId && now !== null && now !== change.after) {
    const scene = { dir: parts.project.dir, id: sceneId };
    await takeSnapshot(platform.fileSystem, scene, now, { time: Date.now() });
  }
  return true;
}

// Back where it was, unless a file of that name has come since.
async function putBack(dir: string, change: FileChange) {
  const to = joinPath(dir, change.path);
  if (change.trashPath && (await readIfThere(platform.fileSystem, to)) === null)
    await platform.fileSystem.rename(joinPath(dir, change.trashPath), to);
}

async function takeBackFile(parts: TakeBackParts, change: FileChange) {
  const { project } = parts;
  const sceneId = sceneIdOf(change.path);
  if (change.kind === "removed") return putBack(project.dir, change);
  // A new scene goes to Skrivro's own trash, where it can still be found.
  if (change.kind === "added")
    return sceneId ? parts.updateTree(moveToTrash(project.tree, sceneId)) : undefined;
  if (change.before === null || !(await keepWrittenSince(parts, change, sceneId))) return;
  await writeAtomic(platform.fileSystem, joinPath(project.dir, change.path), change.before);
  await checkDisk(parts.session);
}

export async function takeBack(parts: TakeBackParts, change: FileChange | NodeChange) {
  if ("path" in change) return takeBackFile(parts, change);
  const { node, field, before } = change;
  if (field)
    await parts.updateTree(
      withNodeFields(parts.project.tree, node.id, { [field]: before } as NodeFields),
    );
}
