import type { AppState } from "../App.js";
import type { Project } from "../useProject.js";
import { OpenGoals } from "../progress/GoalRows.js";
import { BlockPanel } from "./column.js";
import { InSceneBlock } from "./InSceneBlock.js";
import { ReferenceBlock } from "./ReferenceBlock.js";
import { t } from "../../i18n/i18n.js";

// The right column is about what is open: the scene's and its chapter's goals, what is in the
// scene and its picture. Granska comes with the review in Redigera.

export function Blocks({ app, project }: { app: AppState; project: Project }) {
  return (
    <>
      <BlockPanel id="insikter" title={t("Insikter")}>
        <OpenGoals app={app} project={project} />
      </BlockPanel>
      <BlockPanel id="iscenen" title={t("I scenen")}>
        <InSceneBlock app={app} />
      </BlockPanel>
      <BlockPanel id="referens" title={t("Referensbild")}>
        <ReferenceBlock project={project} />
      </BlockPanel>
    </>
  );
}
