import { useEffect, useRef } from "react";
import { projectGoals } from "../../project/progress.js";
import { dayKey } from "../../project/stats.js";
import { manuscriptWords } from "../../project/treeLabels.js";
import type { Project } from "../useProject.js";
import { celebrate, earnBadge } from "./journeyEvents.js";
import { bookBadgesHeld, reachedBookBadges, type BookBadge } from "../../project/bookBadges.js";
import { t, formatNumber } from "../../i18n/i18n.js";

/** True when a change took the book from under its goal to it or past it. */
export const crossesGoal = (before: number, after: number, goal: number | null) =>
  goal !== null && before < goal && after >= goal;

/** The first draft reaching the book's goal is celebrated once, and the day kept in the book. */
export function useMilestone(
  project: Project | null,
  updateFields: (fields: Record<string, unknown>) => void,
) {
  const previous = useRef<{ dir: string; words: number } | null>(null);
  useEffect(() => {
    if (!project) return;
    const words = manuscriptWords(project.tree, project.summaries);
    const before = previous.current;
    previous.current = { dir: project.dir, words };
    if (before?.dir !== project.dir || project.fields["firstDraftDone"]) return;
    if (!crossesGoal(before.words, words, projectGoals(project.fields).totalGoal)) return;
    celebrate({
      kind: "milestone",
      title: t("Första utkastet är klart."),
      text: t("{count} ord i {book}.", {
        count: formatNumber(words),
        book: project.name,
      }),
    });
    updateFields({ firstDraftDone: dayKey(Date.now()) });
    earnBadge("forsta-utkastet");
  }, [project, updateFields]);
}

// Each badge is celebrated once, also while the book's fields are on their way to the disk.
const celebrated = new Set<string>();

function celebrateBook(project: Project, badges: BookBadge[]) {
  for (const badge of badges) {
    const key = `${project.dir}:${badge.id}`;
    if (celebrated.has(key)) continue;
    celebrated.add(key);
    celebrate({
      kind: "badge",
      title: t("Ny utmärkelse: {name}", { name: badge.name }),
      text: project.name,
    });
  }
}

/** The book's badges, counted as it changes; a book never counted keeps what it holds quietly. */
export function useBookBadges(
  project: Project | null,
  updateFields: (fields: Record<string, unknown>) => void,
) {
  useEffect(() => {
    if (!project || project.isReadOnly) return;
    const held = bookBadgesHeld(project.fields);
    const fresh = reachedBookBadges(project, held ?? {});
    if (held !== null && fresh.length === 0) return;
    if (held !== null) celebrateBook(project, fresh);
    const today = dayKey(Date.now());
    updateFields({
      badges: { ...held, ...Object.fromEntries(fresh.map((each) => [each.id, today])) },
    });
  }, [project, updateFields]);
}
