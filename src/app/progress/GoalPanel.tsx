import { useState } from "react";
import {
  averagePerDay,
  chapterShare,
  finishDay,
  projectGoals,
  shortDay,
} from "../../project/progress.js";
import { dailyGoalOf, dayKey } from "../../project/stats.js";
import { findNode, type TreeNode } from "../../project/tree.js";
import { chapterOf, manuscriptWords, nodeWords } from "../../project/treeLabels.js";
import type { AppState } from "../App.js";
import { BlockPanel } from "../blocks/BlockPanel.js";
import { withNodeFields } from "../../project/nodeFields.js";
import type { Project } from "../useProject.js";
import { t, formatNumber } from "../../i18n/i18n.js";

// Mål: where the writer is now against each goal, the day's, the open scene's, its chapter's and
// the book's. A scene or chapter may have a goal of its own, kept on its node in the tree.

/** `suggested` is the chapter's share of the book's goal, until it has a goal of its own. */
type Row = {
  label: string;
  words: number;
  goal: number | null;
  nodeId?: string;
  suggested?: number;
};

// A scene's or chapter's goal is typed here; an empty field has none.
function GoalInput({ row, onGoal }: { row: Row; onGoal: (goal: number | null) => void }) {
  const [draft, setDraft] = useState(row.goal ? String(row.goal) : "");
  const keep = () => {
    const goal = Number.parseInt(draft, 10);
    onGoal(Number.isFinite(goal) && goal > 0 ? goal : null);
  };
  return (
    <input
      className="goal-input"
      inputMode="numeric"
      value={draft}
      placeholder={row.suggested ? `~${formatNumber(row.suggested)}` : t("mål")}
      aria-label={t("Mål för {label}", { label: row.label })}
      onChange={(event) => setDraft(event.target.value.replace(/\D/g, ""))}
      onBlur={keep}
      onKeyDown={(event) => event.key === "Enter" && keep()}
    />
  );
}

function GoalRow({ row, onGoal }: { row: Row; onGoal: (goal: number | null) => void }) {
  const aim = row.goal ?? row.suggested;
  const share = aim ? Math.min(100, (100 * row.words) / aim) : 0;
  return (
    <div className="goal-row">
      <span className="goal-label">{row.label}</span>
      <span className="goal-words">{formatNumber(row.words)}</span>
      <span className="goal-of">/</span>
      {row.nodeId ? (
        <GoalInput row={row} onGoal={onGoal} />
      ) : (
        <span className="goal-words">{row.goal ? formatNumber(row.goal) : "–"}</span>
      )}
      <span className="day-progress-bar wide">
        <span style={{ width: `${share}%` }} />
      </span>
    </div>
  );
}

const goalOf = (node: TreeNode) => (typeof node.goal === "number" ? node.goal : null);

const nodeRow = (label: string, node: TreeNode, summaries: Project["summaries"]): Row => ({
  label,
  words: nodeWords(node, summaries),
  goal: goalOf(node),
  nodeId: node.id,
});

function chapterRows(project: Project, sceneId: string): Row[] {
  const chapter = chapterOf(project.tree, sceneId);
  const node = chapter ? findNode(project.tree, chapter.id)?.node : undefined;
  if (!chapter || !node) return [];
  const row = nodeRow(t("Kapitel {number}", { number: chapter.number }), node, project.summaries);
  const suggested = chapterShare(project.tree, project.fields);
  return [suggested ? { ...row, suggested } : row];
}

// The open scene and its chapter, when a scene is open.
function openRows(app: AppState, project: Project): Row[] {
  const sceneId = app.scene?.id;
  const scene = sceneId ? findNode(project.tree, sceneId)?.node : undefined;
  if (!sceneId || !scene) return [];
  return [nodeRow(t("Scenen"), scene, project.summaries), ...chapterRows(project, sceneId)];
}

function rowsOf(app: AppState, project: Project): Row[] {
  const { fields, tree, summaries } = project;
  const day: Row = { label: t("Idag"), words: app.today.words, goal: dailyGoalOf(fields) };
  const words = manuscriptWords(tree, summaries);
  const book: Row = { label: t("Boken"), words, goal: projectGoals(fields).totalGoal };
  return [day, ...openRows(app, project), book];
}

function BookPace({ app, project }: { app: AppState; project: Project }) {
  const today = dayKey(Date.now());
  const { totalGoal, deadline } = projectGoals(project.fields);
  const words = manuscriptWords(project.tree, project.summaries);
  const finish = finishDay(words, totalGoal, averagePerDay(app.stats, today), today);
  const facts = [
    finish && t("klart runt {day} i din takt", { day: shortDay(finish) }),
    deadline && t("deadline {day}", { day: shortDay(deadline) }),
  ].filter(Boolean);
  return facts.length ? <span className="setting-hint">{facts.join(" · ")}</span> : null;
}

/** Opened from the day's words in the top bar, just under them. */
export function GoalPanel(props: {
  app: AppState;
  project: Project;
  onGoals: () => void;
  onClose: () => void;
}) {
  const { app, project } = props;
  const setGoal = (nodeId: string, goal: number | null) =>
    void app.updateTree(withNodeFields(project.tree, nodeId, { goal: goal ?? undefined }));
  return (
    <BlockPanel id="mal" title={t("Mål")} className="goal-panel" onClose={props.onClose}>
      {rowsOf(app, project).map((row) => (
        <GoalRow
          key={`${row.label}-${row.nodeId ?? ""}`}
          row={row}
          onGoal={(goal) => row.nodeId && setGoal(row.nodeId, goal)}
        />
      ))}
      <BookPace app={app} project={project} />
      <button className="link-button quiet" onClick={props.onGoals}>
        {t("Ändra dagens och bokens mål")}
      </button>
    </BlockPanel>
  );
}
