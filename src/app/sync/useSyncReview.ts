import { useCallback, useEffect, useState } from "react";
import type { TreeNode } from "../../project/tree.js";
import { placeCopyAfter } from "../conflictCopy.js";
import type { SceneFileRef } from "../../storage/syncFiles.js";
import {
  emptyLog,
  readSyncLog,
  writeSyncLog,
  type FileChange,
  type NodeChange,
  type NodeConflict,
  type SyncLog,
} from "../../sync/syncLog.js";
import { platform } from "../platform.js";
import type { ConflictChoice, SceneSession } from "../sceneSession.js";
import { keepVersion } from "../syncRepairs.js";
import { takeBack } from "./takeBack.js";
import { withNodeFields, type NodeFields } from "../../project/nodeFields.js";
import type { Project } from "../useProject.js";

/** One row in the list: something to choose first, then what came from Drive. */
export type ReviewItem =
  | { key: string; kind: "copy"; copy: SceneFileRef }
  | { key: string; kind: "conflict"; conflict: NodeConflict }
  | { key: string; kind: "file"; change: FileChange }
  | { key: string; kind: "node"; change: NodeChange };

function reviewItems(project: Project, log: SyncLog): ReviewItem[] {
  return [
    ...project.conflicts.map((copy) => ({ key: copy.fileName, kind: "copy" as const, copy })),
    ...log.conflicts.map((conflict) => ({
      key: `krock ${conflict.id} ${conflict.field}`,
      kind: "conflict" as const,
      conflict,
    })),
    ...log.files.map((change) => ({ key: change.path, kind: "file" as const, change })),
    ...log.nodes.map((change, index) => ({
      key: `nod ${index} ${change.node.id}`,
      kind: "node" as const,
      change,
    })),
  ];
}

const withoutChange = (log: SyncLog, change: FileChange | NodeChange) => ({
  ...log,
  files: log.files.filter((other) => other !== change),
  nodes: log.nodes.filter((other) => other !== change),
});

interface ReviewParts {
  project: Project | null;
  session: SceneSession;
  updateTree: (tree: TreeNode[]) => Promise<void>;
  refresh: () => Promise<void>;
}

function useLog(project: Project | null) {
  const [log, setLog] = useState<SyncLog>(emptyLog);
  const dir = project?.dir;
  // Read again with every change to the book, since a sync is one.
  useEffect(() => {
    if (!dir) return setLog(emptyLog());
    void readSyncLog(platform.fileSystem, dir).then(setLog);
  }, [project, dir]);
  const save = useCallback(
    async (next: SyncLog) => {
      setLog(next);
      if (dir) await writeSyncLog(platform.fileSystem, dir, next);
    },
    [dir],
  );
  return { log, save };
}

/** The sync's changes and conflicts, and the choices made in the review. */
export function useSyncReview({ project, session, updateTree, refresh }: ReviewParts) {
  const { log, save } = useLog(project);
  const chooseNode = async (conflict: NodeConflict, isDrives: boolean) => {
    if (!project) return;
    if (isDrives)
      await updateTree(
        withNodeFields(project.tree, conflict.id, {
          [conflict.field]: conflict.drive,
        } as NodeFields),
      );
    await save({ ...log, conflicts: log.conflicts.filter((other) => other !== conflict) });
  };
  const chooseCopy = async (copy: SceneFileRef, choice: ConflictChoice) => {
    if (!project) return;
    const newId = await keepVersion(session, project.dir, copy, choice);
    // The same place as a "Behåll båda" in the open scene: after it, or unplaced when it is thrown.
    if (newId) await updateTree(placeCopyAfter(project.tree, copy.sceneId, newId));
    await refresh();
  };
  // Accepted or taken back, the change leaves the list.
  const settle = async (change: FileChange | NodeChange, isTakenBack: boolean) => {
    if (!project) return;
    if (isTakenBack) await takeBack({ project, session, updateTree }, change);
    await save(withoutChange(log, change));
    await refresh();
  };
  // Seen: only the conflicts stay until they are chosen.
  const done = () => save({ ...emptyLog(), conflicts: log.conflicts });
  const items = project ? reviewItems(project, log) : [];
  // What came from the writer's other devices is already in the book; only a conflict asks.
  const toChoose = items.filter((item) => item.kind === "copy" || item.kind === "conflict").length;
  return { items, toChoose, chooseNode, chooseCopy, settle, done };
}

export type SyncReview = ReturnType<typeof useSyncReview>;
