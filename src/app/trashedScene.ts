import { t } from "../i18n/i18n.js";
import { findNode, isInTrash, putBack, sortsOf } from "../project/tree.js";
import type { AppState } from "./App.js";
import type { Project } from "./useProject.js";

/** The open scene when it lies in Papperskorgen, with the way to put it back where it was. */
export function trashedScene(app: AppState, project: Project) {
  const id = app.scene?.id;
  if (!id || app.scene?.dir !== project.dir || !isInTrash(project.tree, id)) return null;
  const from = findNode(project.tree, id)?.node.trashedFrom;
  const wasNote = sortsOf(project.tree).some((sort) => sort.id === from);
  return {
    label: wasNote ? t("Lägg tillbaka") : t("Lägg tillbaka i manuset"),
    onPutBack: () => void app.updateTree(putBack(project.tree, id)),
  };
}
