import type { AppState } from "../App.js";
import { createStore } from "@llkit/store.js";
import type { Project } from "../useProject.js";
import { GoalPanel } from "./GoalPanel.js";
import { GoalsDialog } from "./GoalsDialog.js";

// The day's words in the top bar open Mål just under them, and from there the book's goals;
// Insikter, with the week and the book, is a tab in the right column.

const shown = createStore<"panel" | "goals" | null>(null);

export const showDayGoal = () => shown.set(shown.get() === "panel" ? null : "panel");

export function DayGoalLayer({ app, project }: { app: AppState; project: Project }) {
  const open = shown.use();
  const close = () => shown.set(null);
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
