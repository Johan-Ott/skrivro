import { useEffect, useRef, type RefObject } from "react";
import { CloseButton } from "@llkit/controls.js";
import { useEscape } from "@llkit/keys.js";
import { averagePerDay, finishDay, projectGoals, shortDay } from "../../project/progress.js";
import { dailyGoalOf, dayKey } from "../../project/stats.js";
import { manuscriptWords } from "../../project/treeLabels.js";
import type { AppState } from "../App.js";
import { usePhone } from "../phone/usePhone.js";
import type { Project } from "../useProject.js";
import { t } from "../../i18n/i18n.js";
import { GoalRows, openRows, type Row } from "./GoalRows.js";
import { ChapterBars, WeekBars } from "./ProgressBars.js";

// Mål: the day and the book against their goals, the pace, the week and each chapter. The open
// scene's goals stand in the right column, or here on a phone, which has none.

function rowsOf(app: AppState, project: Project, isPhone: boolean): Row[] {
  const { fields, tree, summaries } = project;
  const day: Row = { label: t("Idag"), words: app.today.words, goal: dailyGoalOf(fields) };
  const words = manuscriptWords(tree, summaries);
  const book: Row = { label: t("Boken"), words, goal: projectGoals(fields).totalGoal };
  return [day, ...(isPhone ? openRows(app, project) : []), book];
}

function BookPace({ project, average }: { project: Project; average: number }) {
  const { totalGoal, deadline } = projectGoals(project.fields);
  const words = manuscriptWords(project.tree, project.summaries);
  const finish = finishDay(words, totalGoal, average, dayKey(Date.now()));
  const facts = [
    finish && t("klart runt {day} i din takt", { day: shortDay(finish) }),
    deadline && t("deadline {day}", { day: shortDay(deadline) }),
  ].filter(Boolean);
  return facts.length ? <span className="setting-hint">{facts.join(" · ")}</span> : null;
}

// A click outside closes it, but not one on the day's words, which close it themselves.
function useCloseOutside(panel: RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Element;
      if (!panel.current?.contains(target) && !target.closest(".day-progress")) onClose();
    };
    window.addEventListener("pointerdown", closeOutside);
    return () => window.removeEventListener("pointerdown", closeOutside);
  }, [panel, onClose]);
}

const GoalHead = ({ onClose }: { onClose: () => void }) => (
  <header className="block-head">
    <span className="block-title">{t("Mål")}</span>
    <span className="block-head-buttons">
      <CloseButton isPhoneBack onClose={onClose} />
    </span>
  </header>
);

export function GoalPanel(props: {
  app: AppState;
  project: Project;
  onGoals: () => void;
  onClose: () => void;
}) {
  const { app, project } = props;
  const ref = useRef<HTMLElement>(null);
  const isPhone = usePhone();
  const today = dayKey(Date.now());
  const average = averagePerDay(app.stats, today);
  useCloseOutside(ref, props.onClose);
  useEscape(props.onClose);
  return (
    <section ref={ref} className="goal-panel" aria-label={t("Mål")}>
      <GoalHead onClose={props.onClose} />
      <GoalRows app={app} project={project} rows={rowsOf(app, project, isPhone)} />
      <BookPace project={project} average={average} />
      {Object.keys(app.stats).length > 0 && (
        <WeekBars stats={app.stats} today={today} average={average} />
      )}
      <ChapterBars project={project} />
      <button className="link-button quiet" onClick={props.onGoals}>
        {t("Ändra mål och deadline")}
      </button>
    </section>
  );
}
