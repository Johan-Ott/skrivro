import type { TreeNode } from "../project/tree.js";
import { ConflictDialog } from "./ConflictDialog.js";
import { placeCopyAfter } from "./conflictCopy.js";
import { resolveConflict } from "./conflictResolution.js";
import type { ConflictChoice, DiskConflict, OpenScene, SceneSession } from "./sceneSession.js";
import type { Project } from "./useProject.js";

export function ConflictLayer(props: {
  conflict: DiskConflict | null;
  scene: OpenScene | null;
  session: SceneSession;
  project: Project | null;
  refresh: () => Promise<void>;
  updateTree: (tree: TreeNode[]) => Promise<void>;
}) {
  const { conflict, scene, session, project } = props;
  if (!conflict || !scene) return null;
  // A copy made by "Behåll båda" stands after the scene it is a copy of.
  const choose = async (choice: ConflictChoice) => {
    const copyId = await resolveConflict(session, choice, conflict);
    if (copyId && project?.dir === scene.dir) {
      await props.updateTree(placeCopyAfter(project.tree, scene.id, copyId));
    }
    await props.refresh();
  };
  return (
    <ConflictDialog
      sceneTitle={scene.title}
      conflict={conflict}
      onChoose={(choice) => void choose(choice)}
    />
  );
}
