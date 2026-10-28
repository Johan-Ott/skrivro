import { MONTHS } from "./snapshots.js";
import { dailyGoalOf, type Stats, DAY } from "./stats.js";
import { manuscriptNodes, type TreeNode } from "./tree.js";

const AVERAGE_DAYS = 30;

// Day keys are counted in UTC, so a summer time change never adds or loses a day.
const utcOf = (day: string) => Date.parse(`${day}T00:00:00Z`);
const dayAfter = (day: string, days: number) =>
  new Date(utcOf(day) + days * DAY).toISOString().slice(0, 10);

export const daysBetween = (from: string, to: string) =>
  Math.round((utcOf(to) - utcOf(from)) / DAY);

export interface ProjectGoals {
  dailyGoal: number | null;
  /** The length the finished manuscript is aimed at, in words. */
  totalGoal: number | null;
  /** YYYY-MM-DD. */
  deadline: string | null;
}

export function projectGoals(fields: Record<string, unknown>): ProjectGoals {
  const total = fields["totalGoal"];
  const deadline = fields["deadline"];
  return {
    dailyGoal: dailyGoalOf(fields),
    totalGoal: typeof total === "number" && total > 0 ? total : null,
    deadline: typeof deadline === "string" && /^\d{4}-\d\d-\d\d$/.test(deadline) ? deadline : null,
  };
}

/** The words left spread over the days left, rounded up. Null without both a goal and a deadline. */
export function deadlinePlan(
  manuscript: { words: number; goal: number | null; deadline: string | null },
  today: string,
  averagePerDay: number,
) {
  const { words, goal, deadline } = manuscript;
  if (goal === null || deadline === null) return null;
  const daysLeft = Math.max(0, daysBetween(today, deadline));
  const wordsLeft = Math.max(0, goal - words);
  const wordsPerDay = daysLeft === 0 ? wordsLeft : Math.ceil(wordsLeft / daysLeft);
  return { daysLeft, wordsPerDay, isOnTrack: wordsLeft === 0 || averagePerDay >= wordsPerDay };
}

/** Over the last 30 days, today included, counting days without words too. */
export function averagePerDay(stats: Stats, today: string): number {
  // A book begun this week is averaged over this week, not over a month it did not exist.
  const first = Object.keys(stats)
    .filter((day) => (stats[day] ?? 0) > 0)
    .sort()[0];
  if (!first) return 0;
  const days = Math.min(AVERAGE_DAYS, Math.max(1, daysBetween(first, today) + 1));
  let sum = 0;
  for (let back = 0; back < days; back++) sum += stats[dayAfter(today, -back)] ?? 0;
  return Math.round(sum / days);
}

const mondayOf = (day: string) => dayAfter(day, -((new Date(utcOf(day)).getUTCDay() + 6) % 7));

/** Monday to Sunday of the week `today` is in, with the words written each day. */
export const weekOf = (stats: Stats, today: string) =>
  Array.from({ length: 7 }, (_unused, index) => {
    const day = dayAfter(mondayOf(today), index);
    return { day, words: stats[day] ?? 0 };
  });

/** Last week's words and writing days, and whether no week before it had more words. */
export function lastWeek(stats: Stats, today: string) {
  const monday = dayAfter(mondayOf(today), -7);
  const totals = new Map<string, number>();
  for (const [day, words] of Object.entries(stats)) {
    totals.set(mondayOf(day), (totals.get(mondayOf(day)) ?? 0) + words);
  }
  const words = totals.get(monday) ?? 0;
  const earlier = [...totals].filter(([start]) => start < monday).map(([, total]) => total);
  const days = weekOf(stats, monday).filter((day) => day.words > 0).length;
  return { words, days, isBest: earlier.length > 0 && words > Math.max(...earlier) };
}

/** "15 jan" for 2027-01-15. */
export function shortDay(day: string): string {
  const [, month = 1, date = 1] = day.split("-").map(Number);
  return `${date} ${MONTHS[month - 1] ?? ""}`;
}

/** The day the first draft reaches its goal at the writer's pace; null without a goal or a pace. */
export function finishDay(words: number, goal: number | null, perDay: number, today: string) {
  if (!goal || perDay <= 0) return null;
  return dayAfter(today, Math.ceil(Math.max(0, goal - words) / perDay));
}

/** The book's pages once it reaches its goal, at the words per page it has now; at most 480. */
export function pagesAtGoal(words: number, goal: number | null, written: number) {
  if (!goal || words === 0) return written;
  return Math.min(480, Math.max(written, Math.round((written * goal) / words)));
}

/** A chapter's share of the book's goal, to the nearest hundred; null without a goal or chapters. */
export function chapterShare(tree: TreeNode[], fields: Record<string, unknown>) {
  const total = projectGoals(fields).totalGoal;
  const count = manuscriptNodes(tree, "chapter").length;
  return total && count ? Math.round(total / count / 100) * 100 : null;
}
