import type { AppState } from "../App.js";
import type { Project } from "../useProject.js";
import { InsightsPanel } from "../progress/InsightsPanel.js";
import { BlockPanel } from "./BlockPanel.js";
import { InSceneBlock } from "./InSceneBlock.js";
import { ReferenceBlock } from "./ReferenceBlock.js";
import { t } from "../../i18n/i18n.js";

// The panels of the right column beside the text, each a section there; Granska comes with the
// review in Redigera.

export function Blocks({ app, project }: { app: AppState; project: Project }) {
  return (
    <>
      <InsightsPanel
        project={project}
        stats={app.stats}
        onSaveGoals={(fields) => void app.updateFields(fields)}
        onClose={() => app.editor.requestFocus()}
      />
      <BlockPanel id="iscenen" title={t("I scenen")}>
        <InSceneBlock app={app} />
      </BlockPanel>
      <BlockPanel id="referens" title={t("Referensbild")}>
        <ReferenceBlock project={project} />
      </BlockPanel>
    </>
  );
}
