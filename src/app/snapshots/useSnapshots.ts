import { useState } from "react";
import { listSnapshots, type SceneRef, type Snapshot } from "../../project/snapshots.js";
import { platform } from "../platform.js";
import { openScene, type SceneSession } from "../sceneSession.js";
import { restoreSnapshot, takeManualSnapshot } from "../snapshotActions.js";
import type { Project } from "../useProject.js";

/** "now" is the scene as it is in the editor; otherwise the file name of a snapshot. */
export type SnapshotChoice = "now" | string;

/** While a version is saved or put back, and once it is put back, so the writer sees it happen. */
type Work = "working" | "restored" | null;

function working(setWork: (work: Work) => void, done: Work) {
  setWork("working");
  return (job: Promise<unknown>) => void job.finally(() => setWork(done));
}

// The scene's versions, read anew after each change, with "now" chosen again.
function useSnapshotList() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [chosen, setChosen] = useState<SnapshotChoice>("now");
  const reload = async (ref: SceneRef) => {
    setChosen("now");
    setSnapshots(await listSnapshots(platform.fileSystem, ref));
  };
  return { snapshots, chosen, setChosen, reload };
}

export function useSnapshots(project: Project | null, session: SceneSession) {
  const [scene, setScene] = useState<SceneRef | null>(null);
  const { snapshots, chosen, setChosen, reload } = useSnapshotList();
  const [work, setWork] = useState<Work>(null);
  // The dialog compares with the open scene, so a scene picked in the tree is opened first.
  const show = async (id: string, dir?: string) => {
    if (!project) return;
    const where = dir ?? (session.scene?.id === id ? session.scene.dir : project.dir);
    if (session.scene?.id !== id && !(await openScene(session, where, id))) return;
    setWork(null);
    setScene({ dir: where, id });
    await reload({ dir: where, id });
  };
  const afterwards = (action: (ref: SceneRef) => Promise<unknown>, done: Work = null) =>
    scene && working(setWork, done)(action(scene).then(() => reload(scene)));
  return {
    sceneId: scene?.id ?? null,
    snapshots,
    chosen,
    work,
    choose: (choice: SnapshotChoice) => (setWork(null), setChosen(choice)),
    show: (id: string, dir?: string) => void show(id, dir),
    take: (label: string) => afterwards((ref) => takeManualSnapshot(session, ref, label)),
    restore: (snapshot: Snapshot) =>
      afterwards((ref) => restoreSnapshot(session, ref, snapshot, Date.now()), "restored"),
    close: () => setScene(null),
  };
}
