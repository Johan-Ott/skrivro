import type { AppState } from "../App.js";
import { createStore } from "@llkit/store.js";
import type { Project } from "../useProject.js";
import { GoalPanel } from "./GoalPanel.js";
import { GoalsDialog } from "./GoalsDialog.js";

// The day's words open Mål, in the top bar on a computer and on Boken on a phone; from Mål the
// book's goals and deadline are changed.

const shown = createStore<"panel" | "goals" | null>(null);

export const showDayGoal = () => shown.set(shown.get() === "panel" ? null : "panel");
const close = () => shown.set(null);

export function DayGoalLayer({ app, project }: { app: AppState; project: Project }) {
  const open = shown.use();
  if (open === "panel")
    return (
      <GoalPanel app={app} project={project} onGoals={() => shown.set("goals")} onClose={close} />
    );
  if (open === "goals")
    return (
      <GoalsDialog
        fields={project.fields}
        onSave={(fields) => void app.updateFields(fields)}
        onClose={close}
      />
    );
  return null;
}
