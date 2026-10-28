import { SCENE_STATUSES, type SceneStatus } from "../manuscript/sceneFile.js";
import type { Label } from "./labels.js";
import type { SceneSummary } from "./sceneSummaries.js";
import { ancestorIds, findNode, manuscriptSceneIds, type TreeNode } from "./tree.js";

type Summaries = Record<string, SceneSummary>;

/** The manuscript's words in each step, notes left out. */
export function wordsByStatus(tree: TreeNode[], summaries: Summaries): Record<SceneStatus, number> {
  const words = Object.fromEntries(SCENE_STATUSES.map((status) => [status, 0])) as Record<
    SceneStatus,
    number
  >;
  for (const id of manuscriptSceneIds(tree)) {
    const summary = summaries[id];
    if (summary) words[summary.status] += summary.words;
  }
  return words;
}

// A label on a chapter or part counts every scene in it, as the tree's filter shows them.
const labelsAround = (tree: TreeNode[], id: string) =>
  new Set(
    [id, ...ancestorIds(tree, id)].flatMap((each) => findNode(tree, each)?.node.labels ?? []),
  );

/** The manuscript's words under each of the book's labels; a scene may count under several. */
export function wordsByLabel(tree: TreeNode[], summaries: Summaries, labels: Label[]) {
  const scenes = manuscriptSceneIds(tree).map((id) => ({
    words: summaries[id]?.words ?? 0,
    labels: labelsAround(tree, id),
  }));
  return labels.map((label) => ({
    label,
    words: scenes
      .filter((scene) => scene.labels.has(label.id))
      .reduce((sum, scene) => sum + scene.words, 0),
  }));
}
