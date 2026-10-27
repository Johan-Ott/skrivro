import { SCENE_STATUSES } from "../manuscript/sceneFile.js";
import { labelsOf } from "../project/labels.js";
import { statusSteps } from "../project/statusSteps.js";
import { findNode, sceneIdsIn, sortsOf } from "../project/tree.js";
import type { Project } from "./useProject.js";
import { t } from "../i18n/i18n.js";

/** A chip under the search: a status step or one of the book's labels. */
export interface SearchChip {
  id: string;
  label: string;
  color: string;
}

/** Not a narrowing like the others: the notes' text is searched too. */
export const WITH_NOTES = "anteckningar";

export function searchChips(project: Project): SearchChip[] {
  const steps = statusSteps(project.fields);
  return [
    { id: WITH_NOTES, label: t("Med anteckningar"), color: "" },
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

export const noteIds = (project: Project) =>
  sortsOf(project.tree).flatMap((sort) => sceneIdsIn(project.tree, sort.id));

/** The notes on this device, while the search leaves them out. */
export const notesLeftOut = (project: Project, only: string[] = []) =>
  only.includes(WITH_NOTES) ? [] : noteIds(project).filter((id) => project.scenes.includes(id));
