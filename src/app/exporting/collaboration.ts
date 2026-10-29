import type { MenuItem } from "@llkit/Menu.js";
import type { Project } from "../useProject.js";
import { startChoices, type ExportChoices } from "./useExport.js";
import { t } from "../../i18n/i18n.js";

// The Word manuscript, which the editor sends back with changes and comments.
export const sendToEditor = (project: Project, run: (choices: ExportChoices) => void) =>
  run({ ...startChoices(project), format: "manus" });

// By files, with no server: an editor or test reader sends the Word manuscript back with changes
// and comments for Läs in kommenterad Word-fil; one who only reads gets the e-book.
export function collaborationItems(
  project: Project,
  run: (choices: ExportChoices) => void,
): MenuItem[] {
  return [
    {
      label: t("Skicka till redaktör eller testläsare…"),
      onSelect: () => sendToEditor(project, run),
    },
    {
      label: t("Läsarexemplar…"),
      onSelect: () => run({ ...startChoices(project), format: "ebok" }),
    },
  ];
}
