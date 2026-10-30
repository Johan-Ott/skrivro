import type { PointerEvent } from "react";
import { HeadButtons, useFloating } from "../blocks/BlockPanel.js";
import { inDock } from "../blocks/dock.js";
import { usePhone } from "../phone/usePhone.js";
import { GripIcon } from "../shell/icons.js";
import { useState } from "react";
import { dayKey, type Stats } from "../../project/stats.js";
import { chapterWords } from "../../project/treeLabels.js";
import type { AppState } from "../App.js";
import type { Project } from "../useProject.js";
import { useEscape } from "@llkit/keys.js";
import { GoalsDialog } from "./GoalsDialog.js";
import { DayCard, TowardsGoal, WeekCard } from "./InsightCards.js";
import { insightNumbers } from "./insightNumbers.js";
import { NoStats } from "./NoStats.js";
import { t, formatNumber } from "../../i18n/i18n.js";

function Chapters({ project }: { project: Project }) {
  const chapters = chapterWords(project.tree, project.summaries);
  const most = Math.max(1, ...chapters.map((chapter) => chapter.words));
  if (chapters.length === 0) return null;
  return (
    <section className="progress-section">
      <span className="progress-label">{t("Ord per kapitel")}</span>
      {chapters.map((chapter) => (
        <div key={chapter.id} className="chapter-bar">
          <span className="chapter-name">{chapter.label}</span>
          <div className="progress-bar thin">
            <div style={{ width: `${(100 * chapter.words) / most}%` }} />
          </div>
          <span className="progress-label">{formatNumber(chapter.words)}</span>
        </div>
      ))}
    </section>
  );
}

interface BodyProps {
  project: Project;
  stats: Stats;
  onGoals: () => void;
}

function InsightsBody(props: BodyProps) {
  const { project, stats } = props;
  const numbers = insightNumbers(project, stats, dayKey(Date.now()));
  // The week and the last twelve weeks show once there is something in them.
  const hasWritten = Object.keys(stats).length > 0;
  return (
    <>
      <DayCard
        words={stats[numbers.today] ?? 0}
        goal={numbers.goals.dailyGoal}
        onGoals={props.onGoals}
      />
      <TowardsGoal numbers={numbers} />
      {hasWritten && <WeekCard stats={stats} numbers={numbers} />}
      <Chapters project={project} />
      <InsightsFoot onGoals={props.onGoals} />
    </>
  );
}

const InsightsHead = (props: {
  onClose: () => void;
  onGrab: ((event: PointerEvent<HTMLElement>) => void) | undefined;
}) => (
  <div className="insights-head block-head" onPointerDown={props.onGrab}>
    <span className="insights-title block-title">
      <GripIcon />
      {t("Insikter")}
    </span>
    <HeadButtons
      id="insikter"
      closeLabel={t("Stäng insikter")}
      isPhoneBack
      onClose={props.onClose}
    />
  </div>
);

type PanelProps = {
  project: Project;
  stats: Stats;
  onSaveGoals: (fields: Record<string, unknown>) => void;
  onClose: () => void;
};

function InsightDialogs(props: PanelProps & { isGoalsOpen: boolean; onCloseGoals: () => void }) {
  if (!props.isGoalsOpen) return null;
  return (
    <GoalsDialog
      fields={props.project.fields}
      onSave={props.onSaveGoals}
      onClose={props.onCloseGoals}
    />
  );
}

// Under the numbers: the goals to change.
function InsightsFoot({ onGoals }: { onGoals: () => void }) {
  return (
    <button className="link-button quiet" onClick={onGoals}>
      {t("Ändra mål och deadline")}
    </button>
  );
}

/** Insikter: beside the text, how the day, the week and the book are going. On a phone Escape
 * closes it; on the computer it lies in the column, and `onClose` puts the cursor in the text. */
export function InsightsPanel(props: PanelProps) {
  const [isGoalsOpen, setGoalsOpen] = useState(false);
  const isPhone = usePhone();
  const floating = useFloating("insikter", !isPhone);
  useEscape(() => isPhone && !isGoalsOpen && props.onClose());
  return inDock(
    floating,
    <aside
      ref={floating.ref}
      className={"insights-panel" + floating.minimized}
      aria-label={t("Insikter")}
      style={floating.style}
    >
      <InsightsHead onClose={props.onClose} onGrab={floating.onPointerDown} />
      <div className="insights-body">
        {Object.keys(props.stats).length === 0 && <NoStats onWrite={props.onClose} />}
        <InsightsBody
          project={props.project}
          stats={props.stats}
          onGoals={() => setGoalsOpen(true)}
        />
      </div>
      <InsightDialogs
        {...props}
        isGoalsOpen={isGoalsOpen}
        onCloseGoals={() => setGoalsOpen(false)}
      />
    </aside>,
  );
}

/** On a phone, Insikter as a screen of its own once the day's words open it. */
export function InsightsLayer({ app, project }: { app: AppState; project: Project }) {
  if (!app.writingMode.isProgressOpen) return null;
  return (
    <InsightsPanel
      project={project}
      stats={app.stats}
      onSaveGoals={(fields) => void app.updateFields(fields)}
      onClose={() => app.writingMode.setProgressOpen(false)}
    />
  );
}
