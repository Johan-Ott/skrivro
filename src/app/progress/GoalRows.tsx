import { useState } from "react";
import { chapterShare } from "../../project/progress.js";
import { findNode, type TreeNode } from "../../project/tree.js";
import { chapterOf, nodeWords } from "../../project/treeLabels.js";
import { withNodeFields } from "../../project/nodeFields.js";
import type { AppState } from "../App.js";
import type { Project } from "../useProject.js";
import { t, formatNumber } from "../../i18n/i18n.js";

// A row per goal: its words, the goal and a bar. A scene or chapter may have a goal of its own,
// kept on its node in the tree and typed in the row.

/** `suggested` is the chapter's share of the book's goal, until it has a goal of its own. */
export type Row = {
  label: string;
  words: number;
  goal: number | null;
  nodeId?: string;
  suggested?: number;
};

// An empty field has no goal.
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

const nodeRow = (label: string, node: TreeNode, summaries: Project["summaries"]): Row => ({
  label,
  words: nodeWords(node, summaries),
  goal: typeof node.goal === "number" ? node.goal : null,
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

/** The open scene and its chapter, when a scene is open. */
export function openRows(app: AppState, project: Project): Row[] {
  const sceneId = app.scene?.id;
  const scene = sceneId ? findNode(project.tree, sceneId)?.node : undefined;
  if (!sceneId || !scene) return [];
  return [nodeRow(t("Scenen"), scene, project.summaries), ...chapterRows(project, sceneId)];
}

export function GoalRows({ app, project, rows }: { app: AppState; project: Project; rows: Row[] }) {
  const setGoal = (nodeId: string, goal: number | null) =>
    void app.updateTree(withNodeFields(project.tree, nodeId, { goal: goal ?? undefined }));
  return rows.map((row) => (
    <GoalRow
      key={`${row.label}-${row.nodeId ?? ""}`}
      row={row}
      onGoal={(goal) => row.nodeId && setGoal(row.nodeId, goal)}
    />
  ));
}

/** Insikter in the right column: how the open scene and its chapter stand against their goals. */
export function OpenGoals({ app, project }: { app: AppState; project: Project }) {
  const rows = openRows(app, project);
  if (rows.length === 0) return <span className="setting-hint">{t("Ingen scen är öppen")}</span>;
  return (
    <div className="open-goals">
      <GoalRows app={app} project={project} rows={rows} />
    </div>
  );
}
