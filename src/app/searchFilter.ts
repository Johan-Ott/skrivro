import { SCENE_STATUSES } from "../manuscript/sceneFile.js";
import { labelsOf } from "../project/labels.js";
import { statusSteps } from "../project/statusSteps.js";
import { noteIdsOf } from "../project/cards.js";
import { findNode, manuscriptSceneIds } from "../project/tree.js";
import type { Project } from "./useProject.js";

/** A chip under the search: a status step or one of the book's labels. */
export interface SearchChip {
  id: string;
  label: string;
  color: string;
}

export function searchChips(project: Project): SearchChip[] {
  const steps = statusSteps(project.fields);
  return [
    ...SCENE_STATUSES.map((status) => ({
      id: `status:${status}`,
      label: steps[status].name,
      color: steps[status].color,
    })),
    ...labelsOf(project.fields).map((label) => ({
      id: `label:${label.id}`,
      label: label.name,
      color: label.color,
    })),
  ];
}

// Steps chosen are either-or, as are labels; a step and a label together are both.
export function isKept(project: Project, sceneId: string, only: string[]) {
  const statuses = only.filter((id) => id.startsWith("status:")).map((id) => id.slice(7));
  const labels = only.filter((id) => id.startsWith("label:")).map((id) => id.slice(6));
  const status = project.summaries[sceneId]?.status ?? "idé";
  const own = findNode(project.tree, sceneId)?.node.labels ?? [];
  const isStatusKept = statuses.length === 0 || statuses.includes(status);
  const isLabelKept = labels.length === 0 || labels.some((id) => own.includes(id));
  return isStatusKept && isLabelKept;
}

const keptIds = (project: Project, ids: string[], only: string[]) =>
  ids.filter((id) => project.scenes.includes(id) && isKept(project, id, only));

/** The manuscript in its order, then every note. A step chosen keeps only scenes; a label
 * keeps what has it, notes too. Scenes still in the cloud have no text here and are left out. */
export function searchIds(project: Project, only: string[] = []) {
  const hasStep = only.some((id) => id.startsWith("status:"));
  const notes = hasStep ? [] : [...noteIdsOf(project.tree)];
  return keptIds(project, [...manuscriptSceneIds(project.tree), ...notes], only);
}

/** Ersätt alla changes the manuscript only; a note is changed by hand. */
export const replaceIds = (project: Project, only: string[] = []) =>
  keptIds(project, manuscriptSceneIds(project.tree), only);
