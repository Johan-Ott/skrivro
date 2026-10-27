import {
  averagePerDay,
  daysBetween,
  finishDay,
  projectGoals,
  shortDay,
} from "../../project/progress.js";
import { dayKey } from "../../project/stats.js";
import { chapterOf, manuscriptWords } from "../../project/treeLabels.js";
import type { AppState } from "../App.js";
import { sidebarProps } from "../paneProps.js";
import { ContentsIcon } from "../shell/icons.js";
import { PhoneBarStart, SearchButton } from "./PhoneBarStart.js";
import { SyncNotices } from "../SyncLayer.js";
import { startLapp } from "../createLapp.js";
import { TreeView } from "../tree/TreeView.js";
import type { Project } from "../useProject.js";
import { t, formatNumber } from "../../i18n/i18n.js";

interface PhoneBookProps {
  app: AppState;
  project: Project;
  onOpenText: (id: string) => void;
  onContinue: () => void;
  /** The scene Fortsätt skriva opens. */
  continueId: string | null;
  onSync: () => void;
  /** Innehåll: the whole book with what happens, when and how far it has come. */
  onContents: () => void;
}

function todayFacts(app: AppState, project: Project) {
  const today = dayKey(Date.now());
  const { deadline, totalGoal } = projectGoals(project.fields);
  const daysLeft = deadline ? Math.max(0, daysBetween(today, deadline)) : null;
  const words = manuscriptWords(project.tree, project.summaries);
  const finish = finishDay(words, totalGoal, averagePerDay(app.stats, today), today);
  const { streak } = app.today;
  return [
    streak === 1 && t("1 dag i rad"),
    streak > 1 && t("{days} dagar i rad", { days: streak }),
    finish && t("klart runt {day} i din takt", { day: shortDay(finish) }),
    daysLeft === 1 && t("1 dag till deadline"),
    daysLeft !== null && daysLeft !== 1 && t("{days} dagar till deadline", { days: daysLeft }),
  ].filter(Boolean);
}

const dayWords = (today: AppState["today"]) =>
  today.goal
    ? t("{words} / {goal} ord idag", {
        words: formatNumber(today.words),
        goal: formatNumber(today.goal),
      })
    : t("{count} ord idag", { count: formatNumber(today.words) });

// The day's words open Insikter.
function TodayCard({ app, project }: Pick<PhoneBookProps, "app" | "project">) {
  const { today } = app;
  const share = today.goal ? Math.min(100, (100 * today.words) / today.goal) : 0;
  return (
    <div className="phone-today">
      <span className="phone-today-head">
        <button className="phone-today-words" onClick={() => app.writingMode.setProgressOpen(true)}>
          {dayWords(today)}
          <span className="phone-today-more" aria-hidden="true">
            ›
          </span>
        </button>
      </span>
      {today.goal && (
        <span className="day-progress-bar wide">
          <span style={{ width: `${share}%` }} />
        </span>
      )}
      <span className="phone-today-facts">{todayFacts(app, project).join(" · ")}</span>
    </div>
  );
}

// The book's text she was last in, not a note she looked at since.
function ContinueButton({ project, continueId, onContinue }: PhoneBookProps) {
  const chapter = continueId ? chapterOf(project.tree, continueId) : null;
  const title = continueId ? project.summaries[continueId]?.title : null;
  const where = [chapter && `${chapter.number}. ${chapter.title}`, title];
  return (
    <button className="phone-continue" onClick={onContinue}>
      <span className="phone-continue-text">
        <span>{t("Fortsätt skriva")}</span>
        <span className="phone-continue-where">{where.filter(Boolean).join(" · ")}</span>
      </span>
      <span aria-hidden="true">→</span>
    </button>
  );
}

function PhoneBookHeader({ app, project, onContents }: HeaderProps) {
  return (
    <header className="phone-bar">
      <PhoneBarStart app={app} project={project} />
      <span className="phone-bar-title prose">{project.name}</span>
      <span className="phone-bar-end">
        <button className="topbar-button" aria-label={t("Innehåll")} onClick={onContents}>
          <ContentsIcon />
        </button>
        <SearchButton app={app} />
      </span>
    </header>
  );
}

type HeaderProps = Pick<PhoneBookProps, "app" | "project" | "onContents">;

export function PhoneBook(props: PhoneBookProps) {
  const { app, project } = props;
  return (
    <div className="phone-screen">
      <PhoneBookHeader app={app} project={project} onContents={props.onContents} />
      <main className="phone-card">
        <SyncNotices
          project={project}
          reviewCount={app.syncReview.toChoose}
          onShowReview={props.onSync}
        />
        <TodayCard app={app} project={project} />
        <ContinueButton {...props} />
        <button className="phone-new-lapp" onClick={() => void startLapp(app, project)}>
          {t("Ny lapp")}
        </button>
        <TreeView
          {...sidebarProps(app, project)}
          onOpenScene={props.onOpenText}
          hasAddButton
          onNewLapp={() => void startLapp(app, project)}
        />
      </main>
    </div>
  );
}
